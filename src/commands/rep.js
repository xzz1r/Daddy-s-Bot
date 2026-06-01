const { getSender, getTarget, bareJid } = require('../utils/wa');
const { pick } = require('../utils/helpers');
const { getRep, addRep, getRepRanking } = require('../utils/repStore');

// Anti-farm: you can't keep repping the same person, and you can't burst-rep
// the whole group in seconds. Both windows are in-memory (reset on restart),
// matching the aura cooldown convention.
const PAIR_COOLDOWN_MS = 30 * 60 * 1000; // same giver→target once per 30 min
const GIVER_COOLDOWN_MS = 15 * 1000;     // any rep action: 1 per 15 s
const pairLast = new Map();   // 'group|giver|target' -> ts (shared by rep+unrep)
const giverLast = new Map();  // 'group|giver' -> ts

// Social ladder — reputation maps to a title so there's something to climb.
function repTitle(rep) {
  if (rep <= -10) return 'Paria del grupo';
  if (rep < 0)    return 'Mal visto';
  if (rep === 0)  return 'Desconocido';
  if (rep < 5)    return 'Conocido';
  if (rep < 15)   return 'Respetado';
  if (rep < 30)   return 'Referente del grupo';
  if (rep < 60)   return 'Pilar del grupo';
  return 'Leyenda del grupo';
}

const REP_UP = [
  '%G respalda a %T. Reputación bien ganada.',
  '%G le da props a %T delante de todos. El grupo toma nota.',
  '%G pone la mano en el fuego por %T. Eso vale.',
  '%G confirma que %T es de fiar. Sube en la jerarquía.',
  '%G suma a la cuenta de %T. Respeto que no se compra.',
  '%G reconoce a %T en público. Así se construye un nombre.',
  '%G vota a favor de %T. La reputación se nota.',
  '%G avala a %T. El grupo lo registra.',
];

const REP_DOWN = [
  '%G le quita reputación a %T. Algo hiciste mal.',
  '%G retira su respaldo a %T. El grupo lo nota.',
  '%G marca a %T en público. Eso deja marca.',
  '%G vota en contra de %T. La cuenta baja.',
  '%G ya no responde por %T. Punto menos.',
  '%G le baja el pulgar a %T. Reputación en caída.',
  '%G deja a %T peor de como estaba. Merecido o no, ahí queda.',
];

const fmt = (n) => n.toLocaleString('es-ES');

// !rep top — reputation leaderboard.
async function showRanking(sock, msg) {
  const jid = msg.key.remoteJid;
  const ranking = (await getRepRanking(jid)).filter(r => r.rep !== 0).slice(0, 10);
  if (ranking.length === 0) {
    return sock.sendMessage(jid, { text: 'Nadie tiene reputación todavía. Da la primera con *!rep @user*.' }, { quoted: msg });
  }
  const medals = ['🥇', '🥈', '🥉'];
  let text = '*RANKING DE REPUTACIÓN*\n\n';
  const mentions = [];
  ranking.forEach((r, i) => {
    const tag = medals[i] || `*${i + 1}.*`;
    text += `${tag} @${r.jid.split('@')[0]} — ${fmt(r.rep)} _(${repTitle(r.rep)})_\n`;
    mentions.push(r.jid);
  });
  await sock.sendMessage(jid, { text: text.trimEnd(), mentions }, { quoted: msg });
}

// Shows a single user's reputation card.
async function showCard(sock, msg, who) {
  const jid = msg.key.remoteJid;
  const rep = await getRep(jid, who);
  const ranking = await getRepRanking(jid);
  const bw = bareJid(who);
  const pos = ranking.findIndex(r => r.jid === bw);
  const rankStr = pos >= 0 && rep !== 0 ? `  ·  #${pos + 1} del grupo` : '';
  await sock.sendMessage(jid, {
    text: `*@${who.split('@')[0]}*\nReputación: *${fmt(rep)}*${rankStr}\nRango: _${repTitle(rep)}_`,
    mentions: [who],
  }, { quoted: msg });
}

// Core give/take. delta is +1 (rep) or -1 (unrep).
async function applyRep(sock, msg, delta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'La reputación solo existe en grupos.' }, { quoted: msg });
  }

  const giver = getSender(msg);
  const target = getTarget(msg);

  if (!target) {
    return sock.sendMessage(jid, {
      text: delta > 0
        ? 'Menciona o responde a quien quieres dar reputación: *!rep @user*'
        : 'Menciona o responde a quien quieres quitar reputación: *!unrep @user*',
    }, { quoted: msg });
  }

  if (bareJid(target) === bareJid(giver)) {
    return sock.sendMessage(jid, {
      text: delta > 0 ? 'No puedes darte reputación a ti mismo.' : 'No puedes quitarte reputación a ti mismo.',
    }, { quoted: msg });
  }

  const now = Date.now();
  const gKey = `${jid}|${bareJid(giver)}`;
  const gLast = giverLast.get(gKey);
  if (gLast && now - gLast < GIVER_COOLDOWN_MS) {
    const wait = Math.ceil((GIVER_COOLDOWN_MS - (now - gLast)) / 1000);
    return sock.sendMessage(jid, { text: `Espera ${wait}s antes de volver a votar.` }, { quoted: msg });
  }

  const pKey = `${jid}|${bareJid(giver)}|${bareJid(target)}`;
  const pLast = pairLast.get(pKey);
  if (pLast && now - pLast < PAIR_COOLDOWN_MS) {
    const wait = Math.ceil((PAIR_COOLDOWN_MS - (now - pLast)) / 60000);
    return sock.sendMessage(jid, {
      text: `Ya votaste a @${target.split('@')[0]} hace poco. Vuelve en ~${wait} min.`,
      mentions: [target],
    }, { quoted: msg });
  }

  giverLast.set(gKey, now);
  pairLast.set(pKey, now);

  const { current } = await addRep(jid, target, delta);
  const phrase = pick(delta > 0 ? REP_UP : REP_DOWN)
    .replace(/%G/g, `@${giver.split('@')[0]}`)
    .replace(/%T/g, `@${target.split('@')[0]}`);

  const sign = delta > 0 ? '+1' : '-1';
  await sock.sendMessage(jid, {
    text: `${phrase}\n\n@${target.split('@')[0]}: *${fmt(current)}* (${sign})  ·  _${repTitle(current)}_`,
    mentions: [giver, target],
  }, { quoted: msg });
}

// !rep            -> your own card
// !rep top        -> leaderboard
// !rep @user      -> give +1   (also works replying to their message)
async function cmdRep(sock, msg, args) {
  const sub = (args && args[0] ? args[0] : '').toLowerCase();
  if (['top', 'rank', 'ranking', 'leaderboard'].includes(sub)) {
    return showRanking(sock, msg);
  }
  // No mention/reply and no subcommand → show the caller's own card.
  if (!getTarget(msg)) {
    return showCard(sock, msg, getSender(msg));
  }
  return applyRep(sock, msg, +1);
}

// !unrep @user  /  !derep @user  -> take 1
async function cmdUnrep(sock, msg) {
  return applyRep(sock, msg, -1);
}

module.exports = { cmdRep, cmdUnrep };
