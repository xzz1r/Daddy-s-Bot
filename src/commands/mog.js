'use strict';

const { isOwner, isAdmin, getSender } = require('../utils/wa');
const { pick } = require('../utils/helpers');

// Rigged by role: owner is genetically blessed, admins have the edge,
// members fight on equal ground. Looks can't be argued — biology decides.
function rollMog(aIsOwner, aIsAdmin, bIsOwner, bIsAdmin) {
  const r = Math.random();
  if (aIsOwner && !bIsOwner) return r < 0.93 ? 'a' : 'b';
  if (bIsOwner && !aIsOwner) return r < 0.93 ? 'b' : 'a';
  if (aIsAdmin && !bIsAdmin) return r < 0.65 ? 'a' : 'b';
  if (bIsAdmin && !aIsAdmin) return r < 0.65 ? 'b' : 'a';
  return r < 0.5 ? 'a' : 'b';
}

// %M = mogger (winner), %L = mogged (loser)
const MOG_PHRASES = [
  '%M moggeó a %L con tan poco esfuerzo que da para llorar.',
  '%L sale del mog check directo a buscar una rutina de mewing que no va a cambiar nada.',
  'Canthal tilt, jawline, frame. %M tiene los tres. %L tiene las ganas de tenerlos.',
  'El PSL de %M aplasta al de %L antes de que se tome la foto.',
  'La diferencia de bone structure entre %M y %L es objetiva, no opinión.',
  '%L mira a %M y entiende por fin para qué existe el looksmaxxing.',
  'Hunter eyes vs prey eyes. %M vs %L. No hace falta explicar nada más.',
  'Hueso sobre hueso: %M moggea a %L sin necesidad de esforzarse ni un segundo.',
  '%L queda en el tier NPC mientras %M camina directo al Chad.',
  'La simetría facial de %M hace que %L parezca una versión beta sin terminar.',
  '%M tiene proyección maxilar que %L lleva buscando en rutinas que no funcionan.',
  'El universo repartió la genética y %M se llevó la parte que le correspondía a los dos.',
  'Ni el mejor cirujano salva a %L de este mog check contra %M.',
  'El chadmetro registra a %M arriba del todo y a %L en los dígitos que no se muestran.',
  '%L va a salir de esto a buscar una nueva rutina de skincare que tampoco va a funcionar.',
  '%M tiene genética, frame y canthal tilt positivo. %L tiene videos de YouTube llenos de mewing.',
  'El mog es tan limpio que %L ni lo niega. Solo asiente y cierra la cámara.',
  'Tercio medio perfecto en %M. %L revisa el suyo y decide no seguir mirando.',
  '%M tiene ojos de depredador. %L tiene los de alguien que acaba de perder un 1v1.',
  'Armonía facial: %M. Caos con buenas intenciones: %L.',
  'La mandíbula de %M sola ya moggea el conjunto completo de %L.',
  'No hay filtro, no hay ángulo, no hay luz que meta a %L en el tier de %M.',
  '%M lleva el Gigachad en los genes. %L lleva el recuerdo de este momento.',
  'La madre naturaleza apostó todo en %M y a %L le dejó lo que sobró.',
  'Bone structure gana a todo lo demás. %M lo tiene. %L lo estudia en foros.',
  '%L sale del 1v1 entendiendo que para él el looksmaxxing no es opcional, es urgente.',
  '%M tiene los hunter eyes que %L intenta conseguir con técnicas que nunca llegan a nada.',
  'El resultado era tan previsible que el grupo ya lo sabía antes del mog check.',
  'Pómulos, mentón y canthal tilt positivo. %M tiene el combo. %L tiene lo que le tocó.',
  'En el tier list de este grupo %M vive en S y %L sigue buscando su casilla.',
  'La diferencia entre %M y %L se mide en genética, no en esfuerzo. %L lo aprende hoy.',
  '%L lleva el mog de %M grabado en la retina como recordatorio permanente.',
  'Comparar a %M con %L es un halago para uno y una condena para el otro.',
  '%M gana el 1v1 sin haberlo intentado siquiera. %L ya está en Reddit buscando consejo urgente.',
  'El midface de %M destroza el de %L sin que nadie tenga que señalarlo.',
  '%L mira los resultados y empieza a buscar turno con el cirujano. %M ni se enteró del duelo.',
  'Estructura ósea superior, simetría confirmada. %M moggea a %L por defecto.',
  '%L aprendió hoy la diferencia entre softmaxear y necesitar intervención divina.',
  'Ni cuatro años de mewing cambia el resultado: %M moggea a %L y punto.',
  'El universo asignó el canthal tilt positivo a %M y a %L le tocó la versión sin actualizar.',
  '%L va a mirar esta conversación más tarde y le va a arder igual.',
  'El mog de %M sobre %L fue tan limpio que ni se discute. Se acepta y se sigue.',
  'Genética de %M: S tier. Genética de %L: en mantenimiento hasta nueva fecha.',
  '%M tiene la estructura que los tutoriales de looksmaxxing ponen como objetivo. %L tiene los tutoriales.',
  'El face card de %M no declina nunca. El de %L tiene límite de crédito y ya lo alcanzó.',
  'La diferencia en canthal tilt entre %M y %L se ve sin medirla. Sin debate posible.',
  '%M ni necesitó posar. %L necesitaría el mejor ángulo del universo y aun así perdería.',
  'Jawline de %M vs jawline de %L. Este 1v1 terminó antes de empezar.',
  'Los pómulos de %M hablan solos. Los de %L piden silencio.',
  '%L mirará el espejo distinto durante días después de cruzarse con %M en este mog check.',
  '%M tiene la proyección maxilar que los demás buscan en el gimnasio sin encontrarla.',
  'Frame, altura, estructura facial. Todo para %M. Para %L quedan las ganas y los suplementos.',
  '%L necesita softmax, hardmax y rezar. %M solo necesita existir.',
  '%M tiene la genética que %L le encargó al universo y que nunca llegó al destino.',
  'La jerarquía genética habló: %M arriba, %L en la lista de espera indefinida.',
  'Cara de S tier contra cara en obras permanentes. El historial lo dice todo.',
  '%M tiene el ratio de cara que los demás usan de referencia en los foros. %L lo usa también, para compararse y perder.',
  'El canthal tilt de %M ya moggea a %L antes de que empiece cualquier conversación.',
  'No es crueldad, es genética. %M tiene lo que %L nunca va a conseguir con esfuerzo.',
  '%L aprende hoy que el looksmaxxing tiene un techo y que ese techo está justo debajo de %M.',
];

async function cmdMog(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  let a, b;
  if (mentioned.length >= 2) [a, b] = mentioned.slice(0, 2);
  else if (mentioned.length === 1) { a = sender; b = mentioned[0]; }
  else {
    return sock.sendMessage(jid, {
      text: 'Usa: *!mog @a @b* (o *!mog @a* para medirte con alguien).',
    }, { quoted: msg });
  }

  if (a === b) {
    return sock.sendMessage(jid, { text: 'No puedes moggearte a ti mismo.' }, { quoted: msg });
  }

  const participants = groupMeta?.participants || [];
  const aIsOwner = isOwner(a, false, groupMeta);
  const bIsOwner = isOwner(b, false, groupMeta);
  const aIsAdmin = isAdmin(participants, a);
  const bIsAdmin = isAdmin(participants, b);

  const side = rollMog(aIsOwner, aIsAdmin, bIsOwner, bIsAdmin);
  const mogger = side === 'a' ? a : b;
  const mogged  = side === 'a' ? b : a;
  const numM = mogger.split('@')[0];
  const numL = mogged.split('@')[0];
  const numA = a.split('@')[0];
  const numB = b.split('@')[0];

  const phrase = pick(MOG_PHRASES)
    .replace(/%M/g, `@${numM}`)
    .replace(/%L/g, `@${numL}`);

  const text =
    `*MOG CHECK*\n\n` +
    `@${numA} *vs* @${numB}\n\n` +
    `@${numM} *moggea* a @${numL}\n` +
    `${phrase}`;

  await sock.sendMessage(jid, { text, mentions: [a, b] }, { quoted: msg });
}

module.exports = { cmdMog };
