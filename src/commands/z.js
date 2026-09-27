'use strict';

const { getDevice } = require('@whiskeysockets/baileys');
const { isOwner, getSender, bareJid } = require('../utils/wa');
const { privadoDelOwner, autorDelCitado } = require('./k');
const logger = require('../utils/logger');

// !z — de qué dispositivo salió el mensaje al que respondes.
//
// Para qué es: cazar catfishes. Quien dice tener iPhone y escribe desde
// Android, o quien jura que solo tiene el móvil y escribe desde WhatsApp Web,
// se delata aquí. Va con las mismas reglas que *!k*: solo el tier dueño, sin
// una palabra en el grupo, el «!z» se borra y la respuesta llega al privado.
//
// QUÉ SE PUEDE SABER Y QUÉ NO. El MODELO del móvil no lo manda WhatsApp a
// nadie: un bot que diga «iPhone 13» se lo inventa. Lo que sí se sabe es el
// TIPO de aplicación que escribió ese mensaje, y se deduce del formato de su
// identificador (getDevice de Baileys): los de iPhone empiezan por 3A, los de
// WhatsApp Web por 3E, los de Android tienen 21 o 32 caracteres. Es una
// deducción, no un dato que WhatsApp confirme: si algún día cambian el
// formato, sale «desconocido» y se dice así, sin adivinar.
//
// Y es el dispositivo DEL MENSAJE, no de la persona. Quien tiene el móvil y el
// ordenador vinculados sale distinto según desde dónde escribió. Por eso la
// respuesta lo dice siempre: un dato que se lee como más de lo que es acusa a
// quien no ha hecho nada.
const NOMBRES = {
  ios: 'un *iPhone*',
  android: 'un *Android*',
  web: '*WhatsApp Web*',
  desktop: '*WhatsApp de escritorio*',
};

const AVISO = '_Esto mira ese mensaje suelto. Si tiene el móvil y el ordenador vinculados, otro mensaje suyo puede salir distinto._';

function textoDe(id, deQuien, donde) {
  const nombre = NOMBRES[getDevice(String(id || ''))];
  if (!nombre) {
    return `No se puede saber desde dónde escribió ${deQuien}${donde}: el identificador de ese mensaje no tiene ningún formato conocido.`;
  }
  return `El mensaje de ${deQuien}${donde} salió de ${nombre}.\n\n${AVISO}`;
}

async function cmdZ(sock, msg, groupMeta) {
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

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.stanzaId) {
    return sock.sendMessage(destino, {
      text: 'Responde con *!z* al mensaje de la persona que quieras mirar.',
    }).catch(() => {});
  }

  // Un mensaje del propio bot sale siempre como WhatsApp Web, porque Baileys
  // firma así sus identificadores. Decirlo sería mentir sobre el bot.
  if (ctx.participant && sock?.user?.id && bareJid(ctx.participant) === bareJid(sock.user.id)) {
    return sock.sendMessage(destino, { text: 'Ese mensaje es del bot.' }).catch(() => {});
  }

  const donde = groupMeta?.subject ? ` en *${groupMeta.subject}*` : '';
  return sock.sendMessage(destino, { text: textoDe(ctx.stanzaId, autorDelCitado(ctx, jid), donde) })
    .catch((e) => logger.warn(`!z: no pude escribir al privado: ${e.message}`));
}

module.exports = { cmdZ, _textoDe: textoDe };
