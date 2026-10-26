'use strict';

const { isMainOwner, getSender, canonicalJid } = require('../utils/wa');
const { olvidarAvisos } = require('../utils/spamTexto');
const { privadoDelOwner } = require('./k');
const logger = require('../utils/logger');

// !a — borra los avisos del antispam de texto («Aviso 1 de 2»).
//
// Lo pidió el dueño (26 oct): «haz que yo pueda restablecer los avisos de ban
// con el antispam de mensajes. Solo yo puedo tener acceso a ese comando
// (invisible)». Así que es del dueño principal y de nadie más, ni de los
// co-dueños, y va con las reglas de *!z*: a quien no es el dueño no le contesta
// NADA (un «no puedes» ya diría que existe), el «!a» se borra del grupo y la
// confirmación llega al privado. No sale en el menú ni en el corrector
// (COMANDOS_OCULTOS).
//
//   *!a* respondiendo a un mensaje   los avisos de quien lo escribió
//   *!a @persona* / *!a <número>*    los de esa persona
//   *!a* a secas                     todos los del grupo
//
// Los de una persona se le quitan en todos los grupos: el aviso es por grupo,
// pero quien lo pide quiere que esa persona empiece de cero.
function objetivoDe(msg, args) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const mencion = ctx?.mentionedJid?.[0];
  if (mencion) return mencion;
  const digitos = (args || []).join('').replace(/\D/g, '');
  if (digitos.length >= 8 && digitos.length <= 15) return `${digitos}@s.whatsapp.net`;
  if (ctx?.participant && ctx?.stanzaId) return ctx.participant;
  return null;
}

async function cmdA(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);
  if (!isMainOwner(sender, msg.key.fromMe, groupMeta)) {
    logger.warn(`!a: ${sender} no es el dueño principal`);
    return;
  }
  const destino = privadoDelOwner(sender, groupMeta);

  if (jid.endsWith('@g.us')) {
    sock.sendMessage(jid, {
      delete: { remoteJid: jid, fromMe: Boolean(msg.key.fromMe), id: msg.key.id, participant: sender },
    }).catch(() => {});
  }
  const escribir = (text) => (destino
    ? sock.sendMessage(destino, { text }).catch((e) => logger.warn(`!a: no pude escribir al privado: ${e.message}`))
    : null);

  const objetivo = objetivoDe(msg, args);
  if (!objetivo && !jid.endsWith('@g.us')) {
    return escribir('Por privado, *!a* necesita la persona: *!a <número>*.');
  }
  const quitados = await olvidarAvisos(jid, objetivo).catch((e) => {
    logger.warn(`!a: ${e.message}`);
    return null;
  });
  if (quitados === null) return escribir('No he podido borrar los avisos: mira el log.');

  const donde = groupMeta?.subject ? ` en *${groupMeta.subject}*` : '';
  if (objetivo) {
    const quien = `+${String(canonicalJid(objetivo) || objetivo).split('@')[0]}`;
    logger.info(`!a: avisos de spam de ${quien} borrados (${quitados})`);
    return escribir(quitados
      ? `Avisos de spam de ${quien} borrados. Empieza de cero.`
      : `${quien} no tenía ningún aviso de spam vivo. Queda de cero igual.`);
  }
  logger.info(`!a: avisos de spam de ${jid} borrados (${quitados})`);
  return escribir(quitados
    ? `${quitados} aviso${quitados === 1 ? '' : 's'} de spam borrado${quitados === 1 ? '' : 's'}${donde}. Todos empiezan de cero.`
    : `No había ningún aviso de spam vivo${donde}.`);
}

module.exports = { cmdA, _objetivoDe: objetivoDe };
