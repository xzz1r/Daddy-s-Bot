'use strict';

// !caso [@persona] — EL EXPEDIENTE.
//
// Los comandos de porcentaje tiran un dado y pegan una frase que vale para
// cualquiera: no saben a quien hablan. Este no tira nada. Junta lo que el bot
// YA guarda de esa persona —mensajes, aura, caja, robos, precio en la cabeza,
// racha y el ultimo dia que escribio— y dicta un veredicto a partir de eso. Un
// parte de conducta, no otra tirada.
//
// EL DUEÑO NO TIENE EXPEDIENTE, y se resuelve igual que en *!count*: SILENCIO.
// Su contador de mensajes esta a cero por diseño, asi que su parte diria «0
// mensajes» siendo el que mas escribe. Decir «este no tiene expediente» seria
// peor: es la unica persona de la que el bot daria esa respuesta. El silencio
// no distingue al dueño de un comando que no salio. Y se devuelve lo cobrado,
// tambien en silencio (SIN_SERVICIO).
//
// LOS PUESTOS SALEN DE LOS MISMOS RANKINGS QUE ENSEÑA EL BOT: el de mensajes
// es el de *!count* (sin el dueño) y el de aura el del top de *!aura*. Si aqui
// alguien saliera 4.º y en *!count* 3.º, la diferencia delataria que hay alguien
// oculto en medio.

const { getSender, getTarget, isMainOwner, sameUser, soloMiembros } = require('../utils/wa');
const { getUserCount, getActiveUsers } = require('../utils/messageCounter');
const { getAura, verCaja, getAuraRanking } = require('../utils/auraStore');
const { rankingLadrones, recompensaDe, vetoTienda } = require('../utils/roboStore');
const { objetivoDelDia, esObjetivoDelDia } = require('../utils/objetivoDia');
const { verRacha, diaDe } = require('../utils/rachaStore');
const { rankedUsers } = require('./count');
const { SIN_SERVICIO } = require('../utils/auraCobro');
const { SOLO_GRUPOS } = require('../data/avisos');
const { fmt, pickFresh, aviso } = require('../utils/helpers');

// Rico y pobre con los mismos cortes que el resto del bot: rico es lo que
// UMBRAL_RICO llama rico en !aura.
const RICO = 1500;
const POBRE = 100;

// Los veredictos van por orden de gravedad: se dicta el primero que encaje.
// La inactividad va delante de todo porque es la unica falta que el bot
// persigue de verdad (GUIA.md). Y al que sostiene el grupo no se le castiga
// por sostenerlo: su veredicto no le reprocha escribir.
//
// SIN GENERO: le llega igual a un tio que a una tia (GUIA.md, capa 44). Nada
// de «callado», «buscado» o «millonario»: se dice lo que hace, no como es.
const VEREDICTOS = {
  nunca: [
    'No ha escrito nunca. Ni un hola. Está aquí de adorno.',
    'Cero mensajes desde que entró. Una foto de perfil y poco más.',
    'Ocupa plaza y no ha dicho ni mu. Ni para despedirse va a abrir la boca.',
  ],
  fantasmaLargo: [
    'Más de un mes sin escribir. Ocupa plaza y no paga ni con presencia.',
    'Un mes sin decir nada. A estas alturas es decoración.',
    'Un mes sin escribir y nadie lo ha notado. Eso es lo que más duele.',
    'Existe en la lista de miembros y en ningún otro sitio.',
  ],
  fantasma: [
    'Una semana larga sin abrir la boca. Lee todo y no aporta nada.',
    'Mira el grupo desde la puerta. Hace días que no entra.',
    'Se le ve en línea y no escribe. Cotilla de manual.',
    'Una semana sin dar señales. Si no fuera por la foto de perfil, nadie sabría que sigue aquí.',
  ],
  insolvente: [
    'En números rojos. Le debe aura a un bot de WhatsApp.',
    'Insolvente. Ni el bot le fía ya.',
    'Su cuenta está en negativo y sigue tirando. Vicio puro.',
  ],
  reincidente: [
    'Reincidente. Si hay algo que robar, ya ha pasado por ahí.',
    'Robar ya es su oficio. El grupo debería dormir con la cartera debajo de la almohada.',
    'Vive de lo ajeno. Tiene más golpes que conversaciones.',
  ],
  buscado: [
    'Tiene precio en la cabeza. Cualquiera puede ir a cobrarlo.',
    'Hay gente con ganas de ir a por su cabeza, y con motivos.',
    'El precio se lo ha ganado a pulso. Ahora que no se queje.',
  ],
  ausente: [
    'Unos días sin escribir. Se le está olvidando cómo se hace.',
    'Viene, mira y se va. Unos días así y ya es costumbre.',
    'Se está enfriando. Un par de días más y pasa a mueble.',
  ],
  pilar: [
    'Sostiene el grupo a base de mensajes. Nada que alegar.',
    'Si deja de escribir, el grupo se muere. Así de claro.',
    'Habla más que nadie. Por lo menos alguien lo hace.',
  ],
  rico: [
    'Tanta aura en un bot de WhatsApp no es un logro, es un diagnóstico.',
    'Más aura que casi nadie y la misma vida de siempre.',
    'Una fortuna de chat. Fuera de aquí no le llega ni para el pan.',
  ],
  pobre: [
    'Un muerto de hambre de manual. Su cuenta da pena hasta al bot.',
    'Pobre de solemnidad. Pide comandos con la mirada.',
    'No tiene ni para un sticker. Así va por la vida.',
  ],
  normal: [
    'Nada que destacar. Ni para bien ni para mal.',
    'Del montón. Ni molesta ni aporta demasiado.',
    'Nada grave en el expediente. Nada bueno tampoco.',
  ],
};

// Dias entre dos claves de dia ('2026-09-22'). Se cuenta con fechas de verdad,
// no restando texto.
function diasEntre(a, b) {
  const t = (k) => Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));
  return Math.round((t(b) - t(a)) / 86400000);
}

function dictamen(d) {
  if (d.mensajes === 0 && !d.ultimo) return 'nunca';
  if (d.silencio !== null && d.silencio >= 30) return 'fantasmaLargo';
  if (d.silencio !== null && d.silencio >= 7) return 'fantasma';
  if (d.aura < 0) return 'insolvente';
  if (d.golpes >= 3) return 'reincidente';
  if (d.cabeza > 0) return 'buscado';
  if (d.silencio !== null && d.silencio >= 2) return 'ausente';
  if (d.puestoMensajes > 0 && d.puestoMensajes <= 3) return 'pilar';
  // Rico y pobre miran TODO lo que tiene, caja incluida, igual que el top.
  // Con el saldo a secas, quien lo guarda todo saldria de muerto de hambre.
  const tiene = d.aura + (d.caja || 0);
  if (tiene >= RICO) return 'rico';
  if (tiene < POBRE) return 'pobre';
  return 'normal';
}

function cuando(silencio) {
  if (silencio === null) return 'nunca';
  if (silencio <= 0) return 'hoy';
  if (silencio === 1) return 'ayer';
  return `hace ${fmt(silencio)} días`;
}

async function cmdCaso(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }
  const persona = getTarget(msg) || getSender(msg);

  // Ver la nota de arriba: del dueño, silencio y se devuelve lo cobrado.
  if (isMainOwner(persona, false, groupMeta)) return SIN_SERVICIO;

  const [mensajes, activos, aura, caja, ranking, ladrones, cabeza, racha, veto] = await Promise.all([
    getUserCount(jid, persona),
    getActiveUsers(jid, 1),
    getAura(jid, persona),
    verCaja(jid, persona),
    getAuraRanking(jid),
    rankingLadrones(jid),
    recompensaDe(jid, persona),
    verRacha(jid, persona),
    vetoTienda(jid, persona),
  ]);

  const porMensajes = rankedUsers(activos, groupMeta);
  const iM = porMensajes.findIndex((u) => sameUser(u.jid, persona));
  const porAura = soloMiembros(ranking, groupMeta);
  const iA = porAura.findIndex((u) => sameUser(u.jid, persona));
  const ladron = ladrones.find((l) => sameUser(l.jid, persona));
  const golpes = ladron ? ladron.golpes : 0;
  const botin = ladron ? ladron.total : 0;
  // El mismo objetivo que anuncia el cartel, con el mismo ranking que *!top*.
  // Si falla, el expediente sale igual: es un dato de mas, no el parte.
  const objetivo = await objetivoDelDia(jid, groupMeta, porAura).catch(() => null);
  const hoy = diaDe(Date.now());
  const silencio = racha.ultimo ? Math.max(0, diasEntre(racha.ultimo, hoy)) : null;

  const d = {
    mensajes, aura, caja, golpes, cabeza, silencio, ultimo: racha.ultimo,
    puestoMensajes: iM >= 0 ? iM + 1 : 0,
  };
  const tipo = dictamen(d);
  const veredicto = pickFresh(VEREDICTOS[tipo], `${jid}|caso|${tipo}`);

  const tag = `@${persona.split('@')[0]}`;
  const lineas = [`*EXPEDIENTE* · ${tag}`];
  lineas.push(`Mensajes: *${fmt(mensajes)}*${iM >= 0 ? ` · ${iM + 1}.º del grupo` : ''}`);
  lineas.push(`Aura: *${fmt(aura)}*${iA >= 0 ? ` · ${iA + 1}.º` : ''}${caja > 0 ? ` · *${fmt(caja)}* en la caja` : ''}`);
  // Sin golpes ni precio no hay linea: una fila de ceros es ruido.
  // Los golpes se podan a los siete dias (roboStore), asi que la linea lo dice:
  // «3 golpes» a secas sonaria a historial de toda la vida.
  if (golpes > 0 || cabeza > 0) {
    const partes = [];
    if (golpes > 0) partes.push(`*${fmt(golpes)}* ${golpes === 1 ? 'golpe' : 'golpes'} esta semana`);
    if (botin > 0) partes.push(`*${fmt(botin)}* de botín`);
    if (cabeza > 0) partes.push(`*${fmt(cabeza)}* por su cabeza`);
    lineas.push(`Robos: ${partes.join(' · ')}`);
  }
  if (esObjetivoDelDia(objetivo, persona)) lineas.push('Hoy es *el objetivo del día*: robarle paga más.');
  if (veto > 0) lineas.push('Intentó atracar la tienda y le salió mal: tiene la entrada vetada.');
  // La racha empezo a guardarse despues que el contador: hay gente con cientos
  // de mensajes y ningun dia apuntado. A esa gente «Última vez: nunca» le
  // mentiria, asi que sin dato no hay linea.
  if (silencio !== null || mensajes === 0) {
    lineas.push(`Última vez: ${cuando(silencio)}${racha.dias > 1 ? ` · racha de *${fmt(racha.dias)}* días` : ''}`);
  }
  lineas.push(`_${veredicto}_`);

  return sock.sendMessage(jid, { text: lineas.join('\n'), mentions: [persona] }, { quoted: msg });
}

module.exports = { cmdCaso, VEREDICTOS, _dictamen: dictamen, _diasEntre: diasEntre };
