const { getActiveUsers } = require('../utils/messageCounter');

const CATEGORIES = [
  'más activos del grupo',
  'más populares',
  'más simpáticos',
  'más graciosos',
  'más respondidos',
  'mejor onda',
  'más random',
  'que más hablan',
  'más interesantes',
  'más queridos',
  'más misteriosos',
  'más chismosos',
  'más cracks',
  'más leyendas',
  'top sin razón',
];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function cmdTopRandom(sock, msg, n) {
  const jid = msg.key.remoteJid;

  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: msg });
  }

  const users = await getActiveUsers(jid, 10);

  if (users.length < n) {
    return sock.sendMessage(jid, {
      text: `❌ No hay suficientes miembros activos. Necesito ${n} con mínimo 10 mensajes, hay ${users.length}.`,
    }, { quoted: msg });
  }

  const picked = shuffle(users).slice(0, n);
  // Random descending scores
  const scores = Array.from({ length: n }, () => Math.floor(Math.random() * 41) + 60).sort((a, b) => b - a);
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const medals = ['🥇', '🥈', '🥉'];

  let text = `🏆 *TOP ${n} ${category.toUpperCase()}*\n\n`;
  const mentions = [];

  picked.forEach((u, i) => {
    const medal = medals[i] || `*${i + 1}.*`;
    const phone = u.jid.split('@')[0];
    text += `${medal} @${phone} — *${scores[i]}%*\n`;
    mentions.push(u.jid);
  });

  await sock.sendMessage(jid, { text, mentions }, { quoted: msg });
}

module.exports = { cmdTopRandom };
