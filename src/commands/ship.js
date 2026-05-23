function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const HEARTS = ['💘', '💕', '💖', '💞', '💓', '💗', '💝', '❤️‍🔥', '😍', '🥰'];
const COLDS = ['💔', '😬', '🥶', '😶', '🙃'];

// !ship — pair two random members of the group with a random compatibility %
async function cmdShip(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: '❌ Solo en grupos.' }, { quoted: msg });
  }

  const participants = (groupMeta?.participants || []).map((p) => p.id);
  if (participants.length < 2) {
    return sock.sendMessage(jid, { text: '❌ Necesito al menos 2 miembros en el grupo.' }, { quoted: msg });
  }

  const [a, b] = shuffle(participants).slice(0, 2);
  const compat = Math.floor(Math.random() * 101);
  const emoji = compat >= 50
    ? HEARTS[Math.floor(Math.random() * HEARTS.length)]
    : COLDS[Math.floor(Math.random() * COLDS.length)];

  // Visual heart bar
  const filled = Math.round(compat / 10);
  const bar = '❤️'.repeat(filled) + '🤍'.repeat(10 - filled);

  const text =
    `${emoji} *Shippeo del día* ${emoji}\n\n` +
    `@${a.split('@')[0]}  ❤️  @${b.split('@')[0]}\n\n` +
    `${bar}\n*${compat}%* de compatibilidad`;

  await sock.sendMessage(jid, { text, mentions: [a, b] }, { quoted: msg });
}

module.exports = { cmdShip };
