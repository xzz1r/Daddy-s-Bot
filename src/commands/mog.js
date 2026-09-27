'use strict';

const { isOwner, isMainOwner, isAdmin, getSender, sameUser } = require('../utils/wa');
const { pickFresh } = require('../utils/helpers');
const { ownerGana } = require('../utils/rigOwner');
const { A_TI_MISMO, SOLO_GRUPOS } = require('../data/avisos');
const { aviso } = require('../utils/helpers');
const { SIN_SERVICIO } = require('../utils/auraCobro');
const rencor = require('../utils/rencor');

// Rigged by role, but not blatantly: the owner has a real edge yet can still
// lose, admins have a slighter edge, members fight on equal ground.
function rollMog(aIsOwner, aIsAdmin, bIsOwner, bIsAdmin) {
  const r = Math.random();
  if (aIsOwner && !bIsOwner) return r < 0.70 ? 'a' : 'b';
  if (bIsOwner && !aIsOwner) return r < 0.70 ? 'b' : 'a';
  if (aIsAdmin && !bIsAdmin) return r < 0.60 ? 'a' : 'b';
  if (bIsAdmin && !aIsAdmin) return r < 0.60 ? 'b' : 'a';
  return r < 0.5 ? 'a' : 'b';
}

// %M = mogger (winner), %L = mogged (loser)
let MOG_PHRASES = [
  'It\'s over para %L. Ni siquiera empezó. %M nació ascendido y %L nació de relleno.',
  'El mog check terminó antes de la primera foto. %M ascendió, %L lleva LDAR de nacimiento.',
  '%L creyó que tenía oportunidad. Ese fue su primer error. El segundo fue nacer con esa cara. %M ni sudó.',
  'La hipergamia ya dio su veredicto: %M arriba, %L invisible. Las mujeres ni registran que %L existe.',
  '%M activa el halo effect con solo aparecer. A %L lo cancela el mismo efecto en reversa. Pretty privilege puro.',
  '%M es Chad tier puro. %L es subhuman documentado y el grupo entero acaba de confirmarlo.',
  '%L es el caso de estudio que los foros usan para explicar qué significa nacer perdiendo. %M es la portada.',
  'Genetic lottery: %M se llevó el bote. A %L le tocó la deformidad de consolación.',
  'Canthal tilt negativo, midface de jirafa, jawline desaparecida. %L es el catálogo completo del subhuman. %M es la referencia opuesta.',
  'La mandíbula de %M moggea sola a %L entero. %L no tiene mandíbula, tiene una sugerencia de mandíbula.',
  'Pómulos esculpidos en %M. En %L: la cara se rinde antes de llegar a los pómulos.',
  'La proyección maxilar de %M liquida a %L sin mirar nada más. %L respira por la boca y se le nota en la estructura.',
  '%M tiene gonial angle de revista. %L tiene recessed everything y el espejo se lo recuerda cada mañana.',
  'Hunter eyes letales en %M. Prey eyes de presa atropellada en %L. La cadena alimenticia ya decidió.',
  'El canthal tilt positivo de %M destruye a %L antes de abrir la boca. %L tiene mirada de derrota permanente.',
  'Ojos de depredador contra ojos de quien acaba de perder en público y lo sabe. %M caza, %L huye.',
  '%L tiene los ojos tan caídos que parece que la genética lloró al hacerlo. %M tiene la mirada que abre puertas.',
  'Tercio medio divino en %M. El de %L es tan largo que no entra en el encuadre ni en la decencia.',
  'Frame, altura, estructura: todo en %M. A %L le quedan los suplementos, el cope y la oración nocturna.',
  '%M tiene el frame con el que se nace ganando. %L tiene el frame que hace que le ofrezcan asiento por lástima.',
  '%L necesita rhinoplastia, genioplastia, lefort III y un milagro para llegar al baseline donde %M empieza dormido.',
  'El face card de %M no declina jamás. El de %L fue rechazado en la puerta y le rompieron el documento.',
  'No hay filtro, ángulo ni luz que meta a %L en el universo de %M. La física se rinde antes que %L.',
  '%L es la razón por la que existe la palabra subhuman. %M es la razón por la que existe la palabra Chad.',
  'Moggeo total, inapelable, humillante. %M ni miró. %L no se va a recuperar de este antes del lunes.',
  'Este mog entra directo al hall de la fama del grupo. %M leyenda, %L ejemplo de qué no querer ser.',
  '%L va al gym, lee libros, trabaja la actitud. Sigue siendo %L. El óseo no se levanta a press.',
  '%L cree que está fuera de su liga. %L ni siquiera está en la misma clasificación de ligas. Divisiones distintas.',
  'Cuando %M entra a un sitio la temperatura cambia. Cuando %L entra nadie levanta la vista. Presencia genética.',
  '%M es la persona a quien todos quieren hablar sin saber por qué. %L es la persona a quien todos confunden con el mobiliario.',
];

async function cmdMog(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }

  const sender = getSender(msg);

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  let a, b;
  if (mentioned.length >= 2) [a, b] = mentioned.slice(0, 2);
  else if (mentioned.length === 1) { a = sender; b = mentioned[0]; }
  else {
    await sock.sendMessage(jid, {
      text: 'Menciona a dos: *!mog @uno @otro*',
    }, { quoted: msg });
    return SIN_SERVICIO;
  }

  if (sameUser(a, b)) {
    await sock.sendMessage(jid, { text: aviso(A_TI_MISMO, jid, 'yo') }, { quoted: msg });
    return SIN_SERVICIO;
  }

  const participants = groupMeta?.participants || [];
  const aIsOwner = isOwner(a, false, groupMeta);
  const bIsOwner = isOwner(b, false, groupMeta);
  const aIsAdmin = isAdmin(participants, a);
  const bIsAdmin = isAdmin(participants, b);

  let side = rollMog(aIsOwner, aIsAdmin, bIsOwner, bIsAdmin);
  // El owner principal ya no moggea SIEMPRE.
  //
  // Estaba en 100 % literal y es de los sitios que mas cantan: el mog va cara a
  // cara y con nombre, asi que ganar todas contra todo el mundo se nota sin que
  // nadie lleve la cuenta. Ahora es 0,72 y cuenta para la MISMA racha que el
  // robo, el contraataque, el atraco y el duelo, porque el grupo ve todo eso en
  // el mismo chat y no distingue de que comando venia cada victoria.
  if (isMainOwner(a, false, groupMeta)) side = ownerGana(msg.key.remoteJid, 0.72) ? 'a' : 'b';
  else if (isMainOwner(b, false, groupMeta)) side = ownerGana(msg.key.remoteJid, 0.72) ? 'b' : 'a';
  const mogger = side === 'a' ? a : b;
  const mogged  = side === 'a' ? b : a;
  const numM = mogger.split('@')[0];
  const numL = mogged.split('@')[0];
  const numA = a.split('@')[0];
  const numB = b.split('@')[0];

  const phrase = pickFresh(MOG_PHRASES, `${jid}|mog`)
    .replace(/%M/g, `@${numM}`)
    .replace(/%L/g, `@${numL}`);

  // Si estos dos ya se midieron otro dia, el bot se acuerda (utils/rencor.js).
  const memoria = await rencor.mog({ grupo: jid, gana: mogger, pierde: mogged, groupMeta });

  const text =
    `*MOG CHECK*\n\n` +
    `@${numA} *vs* @${numB}\n\n` +
    `@${numM} *moggea* a @${numL}\n` +
    `${phrase}` +
    (memoria ? `\n\n_${memoria}_` : '');

  await sock.sendMessage(jid, { text, mentions: [a, b] }, { quoted: msg });
}

module.exports = { cmdMog };
