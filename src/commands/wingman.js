'use strict';

const { getTargetOrSelf, isMainOwner, isOwner, isAdmin } = require('../utils/wa');
const { rollPercent } = require('./percent');
const { pickFresh } = require('../utils/helpers');

const RIZZ = { high: ['%N tiene rizz.'], mid: ['%N tiene rizz medio.'], low: ['%N no tiene rizz.'] };
const PIROPOS = ['Joder, %N, estás buena.'];
const WINGMAN_ANECDOTAS = [
  'Una vez le pedí a %N un favor de amigo y no preguntó cuál. Ya estaba bajando la cremallera. Eso no es lealtad, es oficio.',
  'Una vez %N se ofreció a ser el conductor designado. A las tres ya no conducía: iba de rodillas en el asiento de atrás. Prioridades.',
  'Una vez %N se enfadó porque le pedí el favor a otro. No era celos de amigo. Era celos de oficio.',
  'Una vez %N desapareció en su propia boda diez minutos. Volvió con la corbata torcida. No se había arrodillado ante el altar.',
  'Una vez en una videollamada de trabajo %N se metió debajo de la mesa. La cámara no lo pilló. El micro sí. Dije que era el perro. No tengo.',
  'Estábamos en una pelea de bar y %N se interpuso. No para pegar: para arrodillarse delante de mí. El otro se fue riendo. Yo también.',
  'Una vez le pedí a %N que me guardara la caña un segundo. Cuando volví la caña seguía en la mesa. Él no.',
  'Le pregunté a %N si tenía planes el sábado. Dijo que sí. Los planes era yo. No me había avisado.',
  'Una vez %N llegó tarde a una quedada. La excusa: se le había alargado un favor. Nadie preguntó de qué favor. Todos sabían.',
  'La primera vez que %N me dijo cuenta conmigo ya estaba bajando. No era metáfora. Era agenda.',
  'Estaba hablando con una tía y %N se puso nervioso. No por ella. Porque yo no lo estaba mirando a él.',
  'Una vez %N me regaló un collar. No era para mí. Era para que yo se lo pusiera a él. En otra parte.',
  'Le dije a %N que necesitaba silencio para concentrarme. Se arrodilló y se calló. Con la boca ocupada. Cumplió las dos.',
  'Una vez %N perdió una pelea a propósito. No por miedo. Porque el premio era arrodillarse. Y lo quería.',
  'Una vez %N me presentó a su hermano como el del grupo. El hermano ya sabía qué significaba. No preguntó.',
  'Le dije a %N que iba a salir con alguien. Se ofreció a prepararme. No era el tipo de preparación que yo pedía.',
  'Una vez %N me corrigió delante del grupo: eso no se pide, se entiende. Luego se arrodilló para demostrarlo.',
  'Estábamos en una pelea de palabras y %N saltó a defenderme. Se arrodilló en mitad del argumento. El otro se calló. De la risa.',
  'Una vez en el parking subterráneo %N ya estaba de rodillas cuando bajé las escaleras. Me esperaba. Eso es lo que jode.',
  'Una vez en Nochevieja, a las doce, %N se agachó en vez de darme las uvas. Se comió las doce. Ninguna era uva. Brindamos igual.',
];
const WINGMAN_CIERRES = [
  'Gran colega, %N. A su forma.',
  'Sin %N no salgo de esas. Os lo recomiendo.',
  'Hay amigos y luego está %N. Quedaos con ese.',
  '%N se pone. Eso en un amigo no se paga.',
  'El que se pone sin que se lo pidas es %N. Conservadlo.',
  'Siempre dispuesto, %N. Eso se agradece.',
  'Os lo presento a %N. De los que se ponen cuando hace falta.',
  'Un crack, %N. Un poco a su manera, pero crack.',
  'A %N le pedís algo y se pone. Así de fácil.',
  'Lo recomiendo a %N. Lo he visto en acción.',
];

async function cmdRizz(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const target = getTargetOrSelf(msg);
  const num = target.split('@')[0];
  const esMainOwner = isMainOwner(target, false, groupMeta);
  const esOwner = !esMainOwner && isOwner(target, false, groupMeta);
  const esAdmin = !esMainOwner && !esOwner && isAdmin(groupMeta?.participants, target);
  const percent = esMainOwner
    ? (Math.random() < 0.80 ? 58 + Math.floor(Math.random() * 28) : 30 + Math.floor(Math.random() * 28))
    : rollPercent(true, esAdmin, esOwner);
  const tier = percent >= 70 ? 'high' : percent <= 30 ? 'low' : 'mid';
  const phrase = pickFresh(RIZZ[tier], `${jid}|rizz|${tier}`).replace(/%N/g, `@${num}`);
  await sock.sendMessage(jid, { text: `*RIZZ — ${percent}%*\n\n${phrase}`, mentions: [target] }, { quoted: msg });
}

async function cmdPiropo(sock, msg) {
  const jid = msg.key.remoteJid;
  const target = getTargetOrSelf(msg);
  const num = target.split('@')[0];
  const phrase = pickFresh(PIROPOS, `${jid}|piropo`);
  const line = phrase.includes('%N') ? phrase.replace(/%N/g, `@${num}`) : `@${num} — ${phrase}`;
  await sock.sendMessage(jid, { text: line, mentions: [target] }, { quoted: msg });
}

async function cmdWingman(sock, msg) {
  const jid = msg.key.remoteJid;
  const target = getTargetOrSelf(msg);
  const num = target.split('@')[0];
  const tag = `@${num}`;
  const anecdota = pickFresh(WINGMAN_ANECDOTAS, `${jid}|wingman|anecdota`).replace(/%N/g, tag);
  const cierre = pickFresh(WINGMAN_CIERRES, `${jid}|wingman|cierre`).replace(/%N/g, tag);
  await sock.sendMessage(jid, { text: `*WINGMAN*\n\n${anecdota}\n\n${cierre}`, mentions: [target] }, { quoted: msg });
}

module.exports = { cmdRizz, cmdPiropo, cmdWingman };
