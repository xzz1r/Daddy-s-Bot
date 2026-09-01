'use strict';

const { getTargetOrSelf, isMainOwner, isOwner, isAdmin } = require('../utils/wa');
const { rollPercent } = require('./percent');
const { pickFresh } = require('../utils/helpers');
const { RIZZ, PIROPOS, WINGMAN_ANECDOTAS, WINGMAN_CIERRES } = require('../data/wingmanPhrases');

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
