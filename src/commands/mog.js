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
  // --- Tier gap ---
  '%M es Chad tier. %L es relleno del grupo y lo sabe.',
  'PSL de %M: no se discute. PSL de %L: se discute y la discusión dura dos segundos.',
  'Gigachad en genética: %M. Subhuman en potencial: %L. Sin debate posible.',
  '%L queda enterrado en el tier subhuman de este 1v1. %M ni sudó.',
  'El foro pondría a %M de referencia y a %L de caso de estudio de por qué el looksmaxxing existe.',
  'S tier vs tier de "empieza por aceptar la situación". %M vs %L.',
  '%M vive en el tier al que %L aspira en sus mejores sueños.',
  'Chad real contra cope en movimiento. El resultado estaba escrito antes de empezar.',
  '%L es subhuman frente a %M y esa brecha no se cierra con esfuerzo, se acepta.',
  'Genetic lottery: %M ganó el primer premio. %L ni el billete tenía.',

  // --- Bone structure / hard features ---
  'Canthal tilt negativo, midface largo, jawline inexistente. %L es el catálogo completo del subhuman frente a %M.',
  'Bone structure de Chad en %M. En %L: bone structure de quien lleva cuatro años de mewing y sigue igual.',
  'HTN proporcionado en %M. %L tiene el midface tan largo que el foro lo usaría de ejemplo de qué no pedir.',
  'LTN de %L: la razón por la que la cirugía maxilofacial tiene lista de espera de dos años.',
  'La mandíbula de %M moggea sola al conjunto completo de %L. El resto es adorno.',
  'Pómulos de %M: definidos sin cirugía. Pómulos de %L: en paradero desconocido.',
  'MTN de %M: equilibrado. MTN de %L: el tipo de desproporción que se convierte en foto de foro sin su permiso.',
  'Jawline de %M vs. ausencia documentada de jawline en %L. El contraste duele incluso escrito.',
  'La proyección maxilar de %M sola ya liquida el 1v1 antes de mirar nada más en %L.',
  'Estructura ósea de %M: heredada, sin mérito y por eso mismo inalcanzable para %L.',

  // --- Eyes & upper face ---
  'Hunter eyes en %M. Prey eyes en %L. No hay más que decir y los dos lo saben.',
  'El canthal tilt positivo de %M destruye a %L antes de que empiece cualquier conversación.',
  'Ojos de depredador contra ojos de alguien que acaba de perder un mog check en público. %M y %L.',
  '%M tiene el canthal tilt que %L dibuja en el espejo con el dedo para ver cómo quedaría.',
  'El canthal tilt de %M ya vale más que todos los looksmaxx que %L podría acumular en una vida.',

  // --- Midface / facial thirds ---
  'Tercio medio perfecto en %M. %L revisa el suyo y cierra el espejo.',
  'Facial thirds de %M: en proporción. Facial thirds de %L: el tercio medio se tomó vacaciones permanentes.',
  'El midface largo de %L es el tipo de problema que el foro clasifica como "sin solución sin cirugía mayor".',
  '%M tiene los tres tercios faciales en ratio. %L tiene uno y medio y sabe exactamente cuáles le faltan.',
  'Midface de %M destroza al de %L sin que nadie tenga que señalarlo. Se ve solo.',

  // --- Frame & overall genetics ---
  'Frame, altura, estructura. Todo para %M. Para %L quedan los suplementos y la esperanza.',
  '%M tiene la genética que los demás looksmaxxers pegan en su tablero de visión. %L pega esa foto también.',
  'La madre naturaleza apostó todo en %M. A %L le dejó lo que sobró y lo que sobró no era mucho.',
  'No es personalidad, no es actitud, no es esfuerzo. Es hueso. %M lo tiene. %L no. Cerrado.',
  '%M tiene el frame y la estructura con los que se nace, no los que se construyen. %L nació sin ellos.',

  // --- PSL / tier lists ---
  'El PSL de %M aplasta al de %L antes de que se tome la foto.',
  'Gap de PSL entre %M y %L: el tipo de distancia que el foro anota en silencio antes de dar su veredicto.',
  '%M pasa el modwatch sin editar. %L se queda en la puerta con el cartel de "trabaja y vuelve".',
  'En el tier list del grupo: %M en S, %L buscando todavía en qué casilla entra.',
  'El foro registraría a %M como caso de éxito natural y a %L como el motivo por el que la comunidad existe.',

  // --- Surgery / cope ---
  '%L necesita rhinoplastia, genioplastia y una lefort III para acercarse al baseline de %M.',
  '%L necesita softmax, hardmax, cirugía y rezar. %M necesita existir.',
  'El cope de %L después de este resultado ya está llegando. %M ni va a enterarse de que hubo 1v1.',
  '%L aprendió hoy la diferencia entre softmaxear y necesitar intervención quirúrgica seria.',
  'Ni cuatro años de mewing, ni el mejor cirujano del mundo, cambia el resultado: %M moggea a %L.',
  '%L sale de este mog check sabiendo que tiene trabajo quirúrgico pendiente que no pidió.',

  // --- Face card / final verdicts ---
  'El face card de %M no declina nunca. El de %L fue rechazado antes de intentarlo.',
  'No hay filtro, no hay ángulo, no hay luz que meta a %L en el tier de %M. Imposible.',
  'Subhuman es una palabra fuerte. Pero cualquier foro de looksmax la usaría para el lado de %L en este resultado.',
  'Simetría facial de %M: impecable. Simetría de %L: el resultado de un dado cargado en su contra.',
  '%L cope. %M vive en la realidad a la que %L nunca llega aunque cope durante años.',
  'El mog de %M sobre %L entra en el top de los más unilaterales del historial del grupo.',
  '%M tiene el ratio de cara que los demás usan de referencia. %L los usa también, para medir cuánto le falta.',
  '%L es el tipo de resultado que los foreros describen como "las manos del creador temblaron ese día".',
  'La jerarquía genética no tiene diploma, no tiene esfuerzo, no tiene redención. %M arriba. %L acepta.',
  '%L es la razón por la que existe el término cope pill. %M es la razón por la que existe el término Chad.',
  'Hay genética que se trabaja y genética que se recibe. %M recibió la que %L lleva trabajando sin alcanzar.',
  'Moggeo documentado, inapelable, sin contexto que lo justifique para el lado de %L.',
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
