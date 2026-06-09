const { getSender, getTarget, bareJid } = require('../utils/wa');
const { getAura, addAura } = require('../utils/auraStore');

const GIFT_MIN = 10;
const fmt = n => n.toLocaleString('es-ES');

async function cmdDar(sock, msg, args) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);
  const target = getTarget(msg);

  if (!target) {
    return sock.sendMessage(jid, { text: 'Usa: *!dar @user <cantidad>*' }, { quoted: msg });
  }
  if (bareJid(target) === bareJid(sender)) {
    return sock.sendMessage(jid, { text: 'No puedes darte aura a ti mismo.' }, { quoted: msg });
  }

  const amountArg = (args || []).find(a => /^\d+$/.test(a));
  if (!amountArg) {
    return sock.sendMessage(jid, { text: 'Indica una cantidad: *!dar @user <cantidad>*' }, { quoted: msg });
  }
  const amount = parseInt(amountArg, 10);
  if (amount < GIFT_MIN) {
    return sock.sendMessage(jid, {
      text: `Mínimo *${GIFT_MIN}* de aura por transferencia.`,
    }, { quoted: msg });
  }

  const senderAura = await getAura(jid, sender);
  if (senderAura < amount) {
    return sock.sendMessage(jid, {
      text: `No tienes *${fmt(amount)}* de aura. Tienes *${fmt(senderAura)}*.`,
    }, { quoted: msg });
  }

  const [sNew, tNew] = await Promise.all([
    addAura(jid, sender, -amount),
    addAura(jid, target, +amount),
  ]);

  const sTag = `@${sender.split('@')[0]}`;
  const tTag = `@${target.split('@')[0]}`;

  await sock.sendMessage(jid, {
    text:
      `*TRANSFERENCIA DE AURA*\n\n` +
      `${sTag} le pasa *${fmt(amount)} de aura* a ${tTag}\n\n` +
      `${sTag}  −${fmt(amount)} → *${fmt(sNew.current)}*\n` +
      `${tTag}  +${fmt(amount)} → *${fmt(tNew.current)}*`,
    mentions: [sender, target],
  }, { quoted: msg });
}

module.exports = { cmdDar };
