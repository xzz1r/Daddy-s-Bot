const { getActiveUsers } = require('../utils/messageCounter');
const { shuffle } = require('../utils/helpers');

async function cmdTopRandom(sock, msg, n, args) {
  const jid = msg.key.remoteJid;

  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Este comando solo funciona en grupos.' }, { quoted: msg });
  }

  const topic = (args || []).join(' ').trim();
  if (!topic) {
    return sock.sendMessage(jid, { text: `Usa: *!top${n}* <tema>` }, { quoted: msg });
  }

  const users = await getActiveUsers(jid, 10);
  if (users.length < n) {
    return sock.sendMessage(jid, {
      text: `No hay suficientes miembros activos. Necesito ${n} con minimo 10 mensajes, hay ${users.length}.`,
    }, { quoted: msg });
  }

  const picked = shuffle(users).slice(0, n);
  const scores = Array.from({ length: n }, () => Math.floor(Math.random() * 41) + 60).sort((a, b) => b - a);

  let text = `*TOP ${n} ${topic.toUpperCase()}*\n\n`;
  const mentions = [];

  picked.forEach((u, i) => {
    const phone = u.jid.split('@')[0];
    text += `*${i + 1}.* @${phone} — *${scores[i]}%*\n`;
    mentions.push(u.jid);
  });

  await sock.sendMessage(jid, { text, mentions }, { quoted: msg });
}

module.exports = { cmdTopRandom };
