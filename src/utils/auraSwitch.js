// El interruptor de la dinámica de aura, en un solo sitio.
//
// Apaga el JUEGO, no la moneda. Con la dinámica apagada:
//   · no se puede tirar (!aura), apostar, robar, batirse en duelo ni dar aura;
//   · el saldo de cada uno se queda exactamente donde estaba;
//   · se SIGUE cobrando por escribir — el sueldo cada 25 mensajes y los bonos
//     de 200/500/1000 — pero EN SILENCIO: el bot no anuncia los hitos;
//   · el ranking (!aura top), la consulta (!aura @user) y el progreso diario
//     siguen funcionando: son de leer, no hacen ruido;
//   · los comandos de pago SIGUEN cobrando su precio.
//
// Lo de callar los hitos hubo que arreglarlo: casino.js no miraba este
// interruptor, así que apagar la dinámica no silenciaba el mensaje MÁS ruidoso
// que tiene (uno por persona y por hito, decenas al día en un grupo activo).
// El interruptor se pidió justo por eso y se quedaba a medias, que es peor que
// no tenerlo. Ahora el gate vive en casino.js, junto al cobro.
//
// Eso último es a propósito y es la decisión menos obvia de este fichero. Si al
// apagar el aura los comandos pasaran a ser gratis, !play se convertiría en
// barra libre de descargas justo donde menos sobra: la VPS va con el plan free
// de Oracle y la conversión tiene cuota mensual. El precio es lo que frena el
// abuso, así que se queda puesto — y como los mensajes siguen dando bonos, el
// saldo se sigue ganando escribiendo aunque no se pueda jugar.

const { isAuraEnabled, toggleAura } = require('./state');

// Cuánto se calla el bot entre avisos, por grupo.
//
// Sin esto el interruptor se pega un tiro en el pie: si diez personas escriben
// !aura seguido y el bot contesta diez veces "está apagado", ha cambiado el
// spam de tiradas por spam de negativas, que es justo lo que se quería quitar.
// El primero se lleva la explicación y los siguientes, silencio.
const AVISO_MS = 5 * 60 * 1000;
const ultimoAviso = new Map();

function auraApagada(jid) {
  return !isAuraEnabled(jid);
}

// Contesta que está apagada, como mucho una vez cada AVISO_MS por grupo.
// Devuelve siempre undefined para poder hacer `return avisarApagada(...)`.
async function avisarApagada(sock, jid, msg) {
  const ahora = Date.now();
  const last = ultimoAviso.get(jid) || 0;
  if (ahora - last < AVISO_MS) return;

  if (ultimoAviso.size >= 500) ultimoAviso.delete(ultimoAviso.keys().next().value);
  ultimoAviso.set(jid, ahora);

  await sock.sendMessage(jid, {
    // SE NOMBRA LO QUE SIGUE ABIERTO, y ahora es mas que antes. El aviso solo
    // citaba *!aura top* porque durante un tiempo era lo unico que respondia:
    // el interruptor tapaba tambien el bote, la caja y el cartel de buscados,
    // que no mueven un aura. Corregido eso, decirlo aqui es lo que hace que se
    // note, porque nadie prueba un comando que el bot acaba de negarle.
    text: 'La dinámica de aura está apagada. Nadie roba, apuesta ni transfiere hasta que se vuelva a encender.\n'
      + 'El saldo de cada uno sigue intacto, y siguen abiertos *!aura top*, *!bote*, *!caja*, *!buscados* y la tienda.',
  }, { quoted: msg }).catch(() => {});
}

// Al encender o apagar se olvida el aviso del grupo, para que el siguiente
// intento tras un apagado reciente sí lo explique en vez de comerse el
// silencio de un aviso que se dio hace rato en otro contexto.
function reiniciarAviso(jid) {
  ultimoAviso.delete(jid);
}

module.exports = { auraApagada, avisarApagada, reiniciarAviso, isAuraEnabled, toggleAura, AVISO_MS };
