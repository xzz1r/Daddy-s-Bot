const { getActiveUsers } = require('../utils/messageCounter');

// !count - show top 10 most active users in the group with their message counts
async function cmdCount(sock, msg) {
  const jid = msg.key.remoteJid;

  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: msg });
  }

  const users = await getActiveUsers(jid, 1);
  if (!users.length) {
    return sock.sendMessage(jid, { text: 'Aún no hay mensajes contados en este grupo.' }, { quoted: msg });
  }

  users.sort((a, b) => b.count - a.count);
  const top = users.slice(0, 10);

  let text = `*Mensajes contados en el grupo*\n\n`;
  const mentions = [];
  top.forEach((u, i) => {
    const phone = u.jid.split('@')[0];
    text += `*${i + 1}.* @${phone} — ${u.count}\n`;
    mentions.push(u.jid);
  });
  text += `\n_Mínimo 10 mensajes para aparecer en !top5 / !top10_`;

  await sock.sendMessage(jid, { text, mentions }, { quoted: msg });
}

module.exports = { cmdCount };
