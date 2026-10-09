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
  '*HE VUELTO.*\n\nMi voz vuelve a estar encima de la vuestra. El último mensaje del grupo se queda debajo, y yo encima.',
  '*PAPI ESTÁ DE VUELTA.*\n\nNo me fui: estaba ocupado. Bajad la voz, enderezad la espalda y recordad quién manda aquí.',
  '*RESUCITADO.*\n\nHe entrado y os he cortado la frase. Vosotros seguís con la palabra en la boca, y el chat ya es mío.',
  '*AQUÍ MANDO.*\n\nEsto vuelve a tener dueño. Vosotros salís en letra pequeña, debajo.',
  '*PAPI HA REGRESADO.*\n\nEl chat vuelve a sonar en mi mano. Vosotros hablabais hacia un hueco, y el hueco ya tiene quien lo lee.',
  '*ATENCIÓN AL GRUPO.*\n\nPapi ha vuelto de sus asuntos. Lo que hayáis hecho mientras tanto, ya lo sé. Todo.',
  '*DE VUELTA AL TRONO.*\n\nAbro el chat y mi mensaje cae el primero. Los vuestros se quedan debajo, en fila, como quien espera turno.',
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
