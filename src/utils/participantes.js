// Cambiar participantes de un grupo y saber QUIEN cambio de verdad.
//
// Habia seis copias de esto —el join, el purge, el anti-admin, !kick, !promote,
// la purga por numero— y cada una resolvia lo mismo a su manera. Cinco de las
// seis compartian el mismo error:
//
//     String(fila?.status ?? '200') === '200'
//
// O sea: si WhatsApp no devuelve fila para esa persona, se da por hecho que
// salio. Y no devolver fila es lo normal, no la excepcion: se pide el kick con
// una forma del JID (el telefono) y WhatsApp responde con la otra (el @lid),
// asi que la comparacion por digitos no encuentra nada. La unica copia que lo
// hacia bien era expulsar() en el handler, y solo porque ya se habia corregido
// alli despues de que el bot anunciara expulsiones que no ocurrieron.
//
// Desde que el purge VETA a quien marca como expulsado, ese `?? '200'` dejo de
// ser un mensaje incorrecto y paso a ser un veto a alguien que sigue sentado en
// el grupo. Por eso esto es una sola funcion y no seis.
//
// LA REGLA: lo que no se puede confirmar NO se da por hecho. Es la misma que ya
// gobierna el antiempresa con sus tres estados, aplicada al otro lado.
const { bareJid, canonicalJid, sameUser } = require('./wa');
const { withTimeout } = require('./helpers');

// NINGUNA LLAMADA A WHATSAPP SE ESPERA PARA SIEMPRE.
//
// Un WebSocket colgado no LANZA: se queda. Un try/catch no sirve de nada ahi,
// porque no hay error que atrapar — hay una promesa que no se resuelve nunca y
// un comando que no contesta jamas. El bot ya tenia tope en groupMetadata por
// exactamente este motivo, con el comentario puesto, y el resto de llamadas de
// red se habian quedado sin el.
//
// Aqui pesa mas que en ningun otro sitio: esta es la funcion que expulsa,
// asciende y degrada. Sin tope, un *!kick* podia quedarse sin contestar para
// siempre, con el admin mirando el chat sin saber si echo a alguien o no.
const TOPE_PARTICIPANTES = 15000;

// Todas las formas conocidas de una persona. Se saca de la metadata porque el
// mapa LID↔telefono esta frio despues de cada reinicio, y ahi es justo cuando
// la comparacion por canonicalJid falla y se colaba el falso '200'. La
// metadata SIEMPRE trae las dos formas: es la fuente estable.
function formasDe(jid, groupMeta) {
  const bare = bareJid(jid);
  const formas = new Set([bare]);
  const canon = canonicalJid(jid);
  if (canon) formas.add(bareJid(canon));
  for (const p of (groupMeta?.participants || [])) {
    if (!p) continue;
    const suyas = [p.id, p.lid, p.phoneNumber].filter(Boolean).map(bareJid);
    if (suyas.includes(bare)) { for (const f of suyas) formas.add(f); break; }
  }
  return [...formas];
}

// Devuelve SIEMPRE la misma forma:
//   { ok: [jid...], fallidos: [{ jid, status }], error: null | 'mensaje', filas }
//
// `ok` son los que WhatsApp confirmo con un 200. Nada mas entra ahi: ni los que
// no traen fila, ni los que vienen con otro codigo, ni el caso de que la
// llamada entera reviente. Quien quiera anunciar algo, vetar a alguien o fichar
// un hecho, que lo haga sobre `ok` y solo sobre `ok`.
async function aplicarParticipantes(sock, groupJid, ids, accion, groupMeta = null) {
  const pedidos = [...new Set((ids || []).filter(Boolean))];
  if (!pedidos.length) return { ok: [], fallidos: [], error: null };

  let res;
  try {
    res = await withTimeout(sock.groupParticipantsUpdate(groupJid, pedidos, accion), TOPE_PARTICIPANTES);
  } catch (err) {
    // La llamada entera fallo: NADIE cambio. Antes varios sitios se comian la
    // excepcion y seguian como si hubiera ido bien.
    return {
      ok: [],
      fallidos: pedidos.map(jid => ({ jid, status: 'excepcion' })),
      error: err?.message || 'error',
      filas: [],
    };
  }

  // Sin respuesta util no hay confirmacion de nada. NO se asume el 200.
  if (!Array.isArray(res) || !res.length) {
    return {
      ok: [],
      fallidos: pedidos.map(jid => ({ jid, status: 'sin-respuesta' })),
      error: null,
      filas: [],
    };
  }

  const ok = [], fallidos = [];
  for (const jid of pedidos) {
    const formas = formasDe(jid, groupMeta);
    let fila = res.find(r => r?.jid && formas.some(f => sameUser(f, r.jid)));
    // Si se pidio por UNA sola persona y volvio UNA sola fila, es la suya: no
    // hay otra cosa que pueda ser. Este es el unico atajo que se permite, y
    // solo porque no puede confundir a dos personas.
    if (!fila && pedidos.length === 1 && res.length === 1) fila = res[0];

    const status = String(fila?.status ?? 'sin-fila');
    if (status === '200') ok.push(jid);
    else fallidos.push({ jid, status, content: fila?.content });
  }
  // `filas` son las filas crudas de WhatsApp. Hacen falta para el 403 de un
  // alta: el codigo de invitacion viaja ahi dentro (`add_request`), no en
  // `fallidos`. Sin devolverlas, el caller no puede mandar la invitacion y el
  // owner echado con privacidad activa se quedaba fuera del grupo.
  return { ok, fallidos, error: null, filas: res };
}

// Azucar para el caso de uno solo, que es el 90% de las llamadas. true = salio
// de verdad.
async function aplicarAUno(sock, groupJid, jid, accion, groupMeta = null) {
  const r = await aplicarParticipantes(sock, groupJid, [jid], accion, groupMeta);
  return r.ok.length === 1;
}

module.exports = { aplicarParticipantes, aplicarAUno, formasDe };
