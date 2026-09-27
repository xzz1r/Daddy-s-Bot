'use strict';

const { getDevice } = require('@whiskeysockets/baileys');
const { isOwner, getSender, bareJid, canonicalJid } = require('../utils/wa');
const { formasDe } = require('../utils/persona');
const { getMemberFacts, dispositivosDesde, DISPOSITIVOS } = require('../utils/nickStore');
const { privadoDelOwner, autorDelCitado } = require('./k');
const logger = require('../utils/logger');

// !z — desde qué aplicación escribe alguien.
//
// Para qué es: cazar catfishes. Quien dice tener iPhone y escribe desde
// Android, o quien jura que solo tiene el móvil y escribe desde WhatsApp Web,
// se delata aquí. Va con las mismas reglas que *!k*: solo el tier dueño, sin
// una palabra en el grupo, el «!z» se borra y la respuesta llega al privado.
//
// Tres formas:
//   *!z* respondiendo a un mensaje   de dónde salió ESE mensaje
//   *!z +54 9 11 1234 5678*          lo que el bot le ha visto a ese número
//   *!z @persona*                    lo mismo, por mención
//
// QUÉ SE PUEDE SABER Y QUÉ NO. El MODELO del móvil no lo manda WhatsApp a
// nadie: un bot que diga «iPhone 13» se lo inventa. Lo que sí se sabe es el
// TIPO de aplicación que escribió cada mensaje, y se deduce del formato de su
// identificador (getDevice de Baileys): los de iPhone empiezan por 3A, los de
// WhatsApp Web por 3E, los de Android tienen 21 o 32 caracteres. Es una
// deducción, no un dato que WhatsApp confirme: si algún día cambian el
// formato, sale «desconocido» y se dice así, sin adivinar.
//
// POR NÚMERO SOLO SE SABE LO QUE EL BOT HA VISTO. WhatsApp no deja preguntar
// por el dispositivo de un número: se sabe mirando lo que escribe. Así que
// un número que no ha escrito en ningún grupo del bot desde que se apunta
// esto sale como «no visto», y se dice desde cuándo se apunta.
const NOMBRES = {
  ios: 'un *iPhone*',
  android: 'un *Android*',
  web: '*WhatsApp Web*',
  desktop: '*WhatsApp de escritorio*',
};
const CORTOS = { ios: 'iPhone', android: 'Android', web: 'WhatsApp Web', desktop: 'WhatsApp de escritorio' };

const AVISO = '_Esto mira ese mensaje suelto. Si tiene el móvil y el ordenador vinculados, otro mensaje suyo puede salir distinto._';

function textoDe(id, deQuien, donde) {
  const nombre = NOMBRES[getDevice(String(id || ''))];
  if (!nombre) {
    return `No se puede saber desde dónde escribió ${deQuien}${donde}: el identificador de ese mensaje no tiene ningún formato conocido.`;
  }
  return `El mensaje de ${deQuien}${donde} salió de ${nombre}.\n\n${AVISO}`;
}

function haceCuanto(ts, ahora = Date.now()) {
  const min = Math.max(0, Math.round((ahora - ts) / 60000));
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
}

const fecha = (ts) => new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

// El historial de una persona, ya juntado entre sus formas. Pura: se prueba sin
// WhatsApp.
function textoHistorial(quien, disp, desde, ahora = Date.now()) {
  const pie = desde ? `\n\n_El bot apunta esto desde el ${fecha(desde)}, y solo en sus grupos._` : '';
  const filas = DISPOSITIVOS.filter((d) => disp?.[d] > 0)
    .sort((a, b) => disp[b] - disp[a])
    .map((d) => `• ${CORTOS[d]}: ${disp[d]} ${disp[d] === 1 ? 'mensaje' : 'mensajes'}`);
  if (!filas.length) {
    return `No he visto escribir a ${quien} en ningún grupo del bot.${pie}`;
  }
  const ultimo = disp.ult && CORTOS[disp.ult] ? `\n\nEl último, desde ${CORTOS[disp.ult]}, ${haceCuanto(disp.ts, ahora)}.` : '';
  const varios = filas.length > 1
    ? '\n\n_Salen varios porque tiene más de un dispositivo vinculado, o porque ha cambiado de móvil._'
    : '';
  return `${quien} escribe desde:\n${filas.join('\n')}${ultimo}${varios}${pie}`;
}

// A quién se pregunta: la mención manda; si no, un número en los argumentos.
function objetivoDe(ctx, args) {
  const mencion = ctx?.mentionedJid?.[0];
  if (mencion) return mencion;
  const digitos = (args || []).join('').replace(/\D/g, '');
  if (digitos.length >= 8 && digitos.length <= 15) return `${digitos}@s.whatsapp.net`;
  return null;
}

function etiqueta(jid) {
  const canon = canonicalJid(jid) || jid;
  const num = String(canon).split('@')[0].split(':')[0];
  return String(canon).endsWith('@s.whatsapp.net') && /^\d{6,15}$/.test(num) ? `+${num}` : 'esa persona';
}

async function cmdZ(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);

  // Tier dueño y nadie más, y a los demás silencio: un «no puedes usar esto»
  // ya confirma que el comando existe. El aviso es solo para el log.
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    logger.warn(`!z: ${sender} no es tier owner. Si debería serlo, revisa CO_OWNERS en el .env de la VPS.`);
    return;
  }

  const destino = privadoDelOwner(sender, groupMeta);
  if (!destino) {
    logger.warn('!z: no pude resolver el privado del owner');
    return;
  }

  // El «!z» se borra en el grupo, como el «!k». Si el bot no es admin la
  // borrada falla y el comando sigue igual.
  if (jid.endsWith('@g.us')) {
    sock.sendMessage(jid, {
      delete: { remoteJid: jid, fromMe: Boolean(msg.key.fromMe), id: msg.key.id, participant: sender },
    }).catch(() => {});
  }

  const escribir = (text) => sock.sendMessage(destino, { text })
    .catch((e) => logger.warn(`!z: no pude escribir al privado: ${e.message}`));

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const objetivo = objetivoDe(ctx, args);

  // Por número o mención: lo que el bot tiene apuntado de esa persona.
  if (objetivo) {
    const facts = await getMemberFacts(formasDe(objetivo)).catch(() => null);
    return escribir(textoHistorial(etiqueta(objetivo), facts?.disp, await dispositivosDesde().catch(() => null)));
  }

  if (!ctx?.stanzaId) {
    return escribir('Responde con *!z* a un mensaje, o escribe *!z* con el número o la mención de la persona.');
  }

  // Un mensaje del propio bot sale siempre como WhatsApp Web, porque Baileys
  // firma así sus identificadores. Decirlo sería mentir sobre el bot.
  if (ctx.participant && sock?.user?.id && bareJid(ctx.participant) === bareJid(sock.user.id)) {
    return escribir('Ese mensaje es del bot.');
  }

  const donde = groupMeta?.subject ? ` en *${groupMeta.subject}*` : '';
  return escribir(textoDe(ctx.stanzaId, autorDelCitado(ctx, jid), donde));
}

module.exports = { cmdZ, _textoDe: textoDe, _textoHistorial: textoHistorial, _objetivoDe: objetivoDe };
