const { isOwner } = require('./social');

function isAdmin(participants, jid) {
  const p = participants?.find((x) => x.id === jid);
  return p?.admin === 'admin' || p?.admin === 'superadmin';
}

// !todos — mention everyone in the group (admin only)
async function cmdTodos(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: '❌ Solo en grupos.' }, { quoted: msg });
  }

  const sender = msg.key.participant || msg.key.remoteJid;
  if (!isOwner(sender) && !isAdmin(groupMeta?.participants, sender)) {
    return sock.sendMessage(jid, { text: '❌ Solo admins pueden usar este comando.' }, { quoted: msg });
  }

  const participants = groupMeta?.participants || [];
  if (!participants.length) {
    return sock.sendMessage(jid, { text: '❌ No pude obtener miembros del grupo.' }, { quoted: msg });
  }

  const mentions = participants.map((p) => p.id);
  const note = (args || []).join(' ').trim();

  let text = note ? `*${note}*\n\n` : '*Atención, gente:*\n\n';
  text += mentions.map((id) => `@${id.split('@')[0]}`).join(' ');

  await sock.sendMessage(jid, { text, mentions });
}

module.exports = { cmdTodos };
