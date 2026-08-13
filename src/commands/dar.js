const { getSender, getTarget, sameUser } = require('../utils/wa');
const { transferAura } = require('../utils/auraStore');
const { fmt } = require('../utils/helpers');

// El minimo vive en utils/economia.js con el resto de la escala.
const { REGALO_MIN: GIFT_MIN } = require('../utils/economia');

async function cmdDar(sock, msg, args) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);
  const target = getTarget(msg);

  if (!target) {
    return; // sin destinatario no hay transferencia
  }
  if (sameUser(target, sender)) {
    return sock.sendMessage(jid, { text: 'No puedes darte aura a ti mismo.' }, { quoted: msg });
  }

  const amountArg = (args || []).find(a => /^\d+$/.test(a));
  if (!amountArg) {
    return sock.sendMessage(jid, { text: 'Indica una cantidad: *!dar @user <cantidad>*.' }, { quoted: msg });
  }
  const amount = parseInt(amountArg, 10);
  if (amount < GIFT_MIN) {
    return sock.sendMessage(jid, {
      text: `Mínimo *${GIFT_MIN}* de aura por transferencia.`,
    }, { quoted: msg });
  }

  // Atomic check-and-transfer: both the balance check and the debit/credit happen
  // in a single serialized operation, so concurrent !dar commands can't double-spend.
  const result = await transferAura(jid, sender, target, amount);
  if (!result.ok) {
    return sock.sendMessage(jid, {
      text: `No tienes *${fmt(amount)}* de aura. Tienes *${fmt(result.fromCurrent)}*.`,
    }, { quoted: msg });
  }

  const sTag = `@${sender.split('@')[0]}`;
  const tTag = `@${target.split('@')[0]}`;

  await sock.sendMessage(jid, {
    text:
      `*TRANSFERENCIA DE AURA*\n\n` +
      `${sTag} le pasa *${fmt(amount)} de aura* a ${tTag}\\n\\n.` +
      `${sTag} −${fmt(amount)} → *${fmt(result.fromNew)}*\\n.` +
      `${tTag} +${fmt(amount)} → *${fmt(result.toNew)}*.`,
    mentions: [sender, target],
  }, { quoted: msg });
}

module.exports = { cmdDar };
