const { getActiveUsers } = require('../utils/messageCounter');
const { isMainOwner } = require('../utils/wa');
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

  // El owner principal nunca entra en el sorteo (invisible en toda salida).
  // Este comando no recibe groupMeta; isMainOwner igual lo resuelve vía config
  // y el caché de JIDs aprendidos, así que basta con pasar null.
  const users = (await getActiveUsers(jid, 10)).filter(u => !isMainOwner(u.jid, false, null));
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
