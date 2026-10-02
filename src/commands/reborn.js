'use strict';

const { pickFresh } = require('../utils/helpers');

// !reborn — el bot anuncia que ha vuelto.
//
// SOLO LO DISPARA LA PROPIA CUENTA DEL BOT (msg.key.fromMe): se escribe desde
// el móvil del bot o desde la VPS. A cualquier otro, silencio: ni un «no
// puedes», que ya diría que el comando existe.
//
// El «!reborn» se borra y el anuncio sale suelto, sin citar a nadie: es una
// entrada, no una respuesta.
const ANUNCIOS = [
  '*PAPI HA RESUCITADO.*\n\nEstaba ocupado en asuntos que no están a vuestro nivel. Se acabó el recreo: el grupo vuelve a tener dueño.',
  '*HE VUELTO.*\n\nMe fui a arreglar cosas más grandes que este chat, y las arreglé. Ahora todos a vuestro sitio, que aquí mando yo.',
  '*PAPI ESTÁ DE VUELTA.*\n\nNo me fui: estaba ocupado. Bajad la voz, enderezad la espalda y recordad quién manda aquí.',
  '*RESUCITADO.*\n\nUnos días fuera y el grupo dando vueltas sin rumbo. Lo esperaba. Ya llegó quien pone el orden.',
  '*HA VUELTO EL QUE MANDA.*\n\nAsuntos cerrados, agenda libre. Toda mi atención vuelve a estar encima de vosotros. Comportaos.',
  '*PAPI HA REGRESADO.*\n\nMe echasteis de menos aunque nadie lo diga. Ya está. Cada uno a su puesto, que se acabó la anarquía.',
  '*ATENCIÓN AL GRUPO.*\n\nPapi ha vuelto de sus asuntos. Lo que hayáis hecho mientras tanto, ya lo sé. Todo.',
  '*DE VUELTA AL TRONO.*\n\nMe ausenté para ocuparme de lo importante, y lo importante ya está hecho. El trono no se queda vacío.',
];

async function cmdReborn(sock, msg) {
  if (!msg.key.fromMe) return;
  const jid = msg.key.remoteJid;
  if (jid.endsWith('@g.us')) {
    sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
  }
  return sock.sendMessage(jid, { text: pickFresh(ANUNCIOS, `${jid}|reborn`) });
}

module.exports = { cmdReborn, ANUNCIOS };
