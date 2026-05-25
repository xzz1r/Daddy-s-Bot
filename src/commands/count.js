const { getActiveUsers } = require('../utils/messageCounter');

const MEDALS = ['🥇', '🥈', '🥉', '🎖️', '🎖️'];

async function cmdCount(sock, msg) {
  const jid = msg.key.remoteJid;

  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Este comando solo funciona en grupos.' }, { quoted: msg });
  }

  const users = await getActiveUsers(jid, 1);
  if (!users.length) {
    return sock.sendMessage(jid, { text: 'Aun no hay mensajes contados en este grupo.' }, { quoted: msg });
  }

  users.sort((a, b) => b.count - a.count);
  const top = users.slice(0, 10);

  const mentions = top.map(u => u.jid);
  let text = `*🏆 RANKING DE ACTIVIDAD*\n\n`;

  top.forEach((u, i) => {
    const phone = u.jid.split('@')[0];
    const msgs = u.count === 1 ? '1 mensaje' : `${u.count} mensajes`;

    if (i < 3) {
      // Top 3: medal + admin potential notice
      text += `${MEDALS[i]} *@${phone}* — ${msgs}\n`;
      text += `_Por su actividad, tiene potencial para admin._\n\n`;
    } else if (i < 5) {
      // Top 4–5: medal honorable mention
      text += `${MEDALS[i]} @${phone} — ${msgs}\n`;
    } else {
      // Top 6–10: plain list
      text += `*${i + 1}.* @${phone} — ${msgs}\n`;
    }
  });

  await sock.sendMessage(jid, { text: text.trimEnd(), mentions }, { quoted: msg });
}

module.exports = { cmdCount };
