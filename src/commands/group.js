const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { isOwner } = require('./social');
const { toggleAdminNotify, isAdminNotifyEnabled } = require('../utils/state');

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function isAdmin(participants, jid) {
  const p = participants?.find((x) => x.id === jid);
  return p?.admin === 'admin' || p?.admin === 'superadmin';
}

// In-memory mute store: `groupJid|userJid` -> expireTimestamp
const mutedUsers = new Map();

function isMuted(groupJid, userJid) {
  const k = `${groupJid}|${userJid}`;
  const exp = mutedUsers.get(k);
  if (!exp) return false;
  if (Date.now() > exp) { mutedUsers.delete(k); return false; }
  return true;
}

// !tagall — mention everyone. Forwards media if replying to one, otherwise sends text.
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
  const caption = (args || []).join(' ').trim();

  // Check for media in the command message itself (image/video sent with !tagall as caption)
  const m = msg.message;
  const ownImage = m?.imageMessage;
  const ownVideo = m?.videoMessage;

  if (ownImage) {
    const buf = await streamToBuffer(await downloadContentFromMessage(ownImage, 'image'));
    return sock.sendMessage(jid, { image: buf, caption, mentions });
  }
  if (ownVideo) {
    const buf = await streamToBuffer(await downloadContentFromMessage(ownVideo, 'video'));
    return sock.sendMessage(jid, { video: buf, caption, mentions });
  }

  // Check for quoted message
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;

  if (quoted) {
    if (quoted.imageMessage) {
      const buf = await streamToBuffer(await downloadContentFromMessage(quoted.imageMessage, 'image'));
      return sock.sendMessage(jid, { image: buf, caption: caption || quoted.imageMessage.caption || '', mentions });
    }
    if (quoted.videoMessage) {
      const buf = await streamToBuffer(await downloadContentFromMessage(quoted.videoMessage, 'video'));
      return sock.sendMessage(jid, { video: buf, caption: caption || quoted.videoMessage.caption || '', mentions });
    }
    if (quoted.audioMessage) {
      const buf = await streamToBuffer(await downloadContentFromMessage(quoted.audioMessage, 'audio'));
      return sock.sendMessage(jid, { audio: buf, mimetype: quoted.audioMessage.mimetype || 'audio/mp4', mentions });
    }
    // Quoted text
    const quotedText = quoted.conversation || quoted.extendedTextMessage?.text || '';
    return sock.sendMessage(jid, { text: caption || quotedText, mentions });
  }

  // Plain text
  if (caption) return sock.sendMessage(jid, { text: caption, mentions });
  return sock.sendMessage(jid, { text: '📢', mentions });
}

// !kick @user — remove a member (admin only)
async function cmdKick(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: '❌ Solo en grupos.' }, { quoted: msg });
  }

  const sender = msg.key.participant || msg.key.remoteJid;
  if (!isOwner(sender) && !isAdmin(groupMeta?.participants, sender)) {
    return sock.sendMessage(jid, { text: '❌ Solo admins pueden usar este comando.' }, { quoted: msg });
  }

  // Get target from mention or quoted message
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  const target = mentioned[0] || quotedParticipant || null;

  if (!target) {
    return sock.sendMessage(jid, { text: '❌ Menciona o responde al usuario que quieres expulsar.' }, { quoted: msg });
  }

  if (target === sender) {
    return sock.sendMessage(jid, { text: '❌ No puedes expulsarte a ti mismo.' }, { quoted: msg });
  }

  if (isAdmin(groupMeta?.participants, target) && !isOwner(sender)) {
    return sock.sendMessage(jid, { text: '❌ No puedes expulsar a otro admin.' }, { quoted: msg });
  }

  try {
    await sock.groupParticipantsUpdate(jid, [target], 'remove');
    const num = target.split('@')[0];
    await sock.sendMessage(jid, { text: `✅ @${num} fue expulsado del grupo.`, mentions: [target] }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ No pude expulsar al usuario: ${err.message}` }, { quoted: msg });
  }
}

// !del — delete the quoted message
async function cmdDel(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const isGroup = jid.endsWith('@g.us');

  if (isGroup && !isOwner(sender) && !isAdmin(groupMeta?.participants, sender)) {
    return sock.sendMessage(jid, { text: '❌ Solo admins pueden borrar mensajes.' }, { quoted: msg });
  }

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.stanzaId) {
    return sock.sendMessage(jid, { text: '❌ Responde al mensaje que quieres borrar con !del.' }, { quoted: msg });
  }

  const deleteKey = {
    remoteJid: jid,
    fromMe: false,
    id: ctx.stanzaId,
    ...(isGroup && ctx.participant ? { participant: ctx.participant } : {}),
  };

  try {
    await sock.sendMessage(jid, { delete: deleteKey });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ No pude borrar el mensaje: ${err.message}` }, { quoted: msg });
  }
}

// !mute @user [minutos] — silencia comandos de un usuario (admin only)
async function cmdMute(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: '❌ Solo en grupos.' }, { quoted: msg });
  }
  const sender = msg.key.participant || msg.key.remoteJid;
  if (!isOwner(sender) && !isAdmin(groupMeta?.participants, sender)) {
    return sock.sendMessage(jid, { text: '❌ Solo admins pueden mutear.' }, { quoted: msg });
  }

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  const target = mentioned[0] || quotedParticipant;

  if (!target) {
    return sock.sendMessage(jid, { text: '❌ Menciona o responde al usuario que quieres mutear.' }, { quoted: msg });
  }
  if (target === sender) {
    return sock.sendMessage(jid, { text: '❌ No puedes mutearte a ti mismo.' }, { quoted: msg });
  }

  const minutes = Math.min(Math.max(parseInt(args.find(a => /^\d+$/.test(a)) || '10', 10), 1), 1440);
  mutedUsers.set(`${jid}|${target}`, Date.now() + minutes * 60_000);

  const num = target.split('@')[0];
  await sock.sendMessage(jid, {
    text: `🔇 @${num} muteado por ${minutes} minuto${minutes === 1 ? '' : 's'}. No podrá usar comandos.`,
    mentions: [target],
  }, { quoted: msg });
}

// !unmute @user — quita el mute (admin only)
async function cmdUnmute(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: '❌ Solo en grupos.' }, { quoted: msg });
  }
  const sender = msg.key.participant || msg.key.remoteJid;
  if (!isOwner(sender) && !isAdmin(groupMeta?.participants, sender)) {
    return sock.sendMessage(jid, { text: '❌ Solo admins pueden desmutear.' }, { quoted: msg });
  }

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  const target = mentioned[0] || quotedParticipant;

  if (!target) {
    return sock.sendMessage(jid, { text: '❌ Menciona al usuario que quieres desmutear.' }, { quoted: msg });
  }

  mutedUsers.delete(`${jid}|${target}`);
  const num = target.split('@')[0];
  await sock.sendMessage(jid, {
    text: `🔊 @${num} desmuteado.`,
    mentions: [target],
  }, { quoted: msg });
}

// Helper: get target from mention or quoted message
function getTarget(msg) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  return mentioned[0] || quotedParticipant || null;
}

// !promote @user — give admin rights (admin only)
async function cmdPromote(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: '❌ Solo en grupos.' }, { quoted: msg });
  }
  const sender = msg.key.participant || msg.key.remoteJid;
  if (!isOwner(sender) && !isAdmin(groupMeta?.participants, sender)) {
    return sock.sendMessage(jid, { text: '❌ Solo admins pueden usar este comando.' }, { quoted: msg });
  }

  const target = getTarget(msg);
  if (!target) {
    return sock.sendMessage(jid, { text: '❌ Menciona o responde al usuario que quieres ascender.' }, { quoted: msg });
  }
  if (isAdmin(groupMeta?.participants, target)) {
    return sock.sendMessage(jid, { text: '❌ Ese usuario ya es admin.' }, { quoted: msg });
  }

  try {
    await sock.groupParticipantsUpdate(jid, [target], 'promote');
    const num = target.split('@')[0];
    await sock.sendMessage(jid, { text: `🎖️ @${num} ahora es admin.`, mentions: [target] }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ No pude ascender al usuario: ${err.message}` }, { quoted: msg });
  }
}

// !demote @user — remove admin rights (admin only)
async function cmdDemote(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: '❌ Solo en grupos.' }, { quoted: msg });
  }
  const sender = msg.key.participant || msg.key.remoteJid;
  if (!isOwner(sender) && !isAdmin(groupMeta?.participants, sender)) {
    return sock.sendMessage(jid, { text: '❌ Solo admins pueden usar este comando.' }, { quoted: msg });
  }

  const target = getTarget(msg);
  if (!target) {
    return sock.sendMessage(jid, { text: '❌ Menciona o responde al admin que quieres degradar.' }, { quoted: msg });
  }
  if (target === sender && !isOwner(sender)) {
    return sock.sendMessage(jid, { text: '❌ No puedes degradarte a ti mismo.' }, { quoted: msg });
  }
  if (!isAdmin(groupMeta?.participants, target)) {
    return sock.sendMessage(jid, { text: '❌ Ese usuario no es admin.' }, { quoted: msg });
  }

  try {
    await sock.groupParticipantsUpdate(jid, [target], 'demote');
    const num = target.split('@')[0];
    await sock.sendMessage(jid, { text: `📉 @${num} ha sido degradado a miembro.`, mentions: [target] }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ No pude degradar al usuario: ${err.message}` }, { quoted: msg });
  }
}

// !notifadmin on/off — toggle admin change notifications for this group (admin only)
async function cmdNotifAdmin(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: '❌ Solo en grupos.' }, { quoted: msg });
  }
  const sender = msg.key.participant || msg.key.remoteJid;
  if (!isOwner(sender) && !isAdmin(groupMeta?.participants, sender)) {
    return sock.sendMessage(jid, { text: '❌ Solo admins pueden cambiar esta configuración.' }, { quoted: msg });
  }

  const arg = (args[0] || '').toLowerCase();
  if (arg !== 'on' && arg !== 'off') {
    const current = isAdminNotifyEnabled(jid) ? 'activadas' : 'desactivadas';
    return sock.sendMessage(jid, { text: `ℹ️ Notificaciones de admin: *${current}*\nUsa !notifadmin on/off para cambiar.` }, { quoted: msg });
  }

  const enable = arg === 'on';
  await toggleAdminNotify(jid, enable);
  await sock.sendMessage(jid, {
    text: enable
      ? '🔔 Notificaciones de cambios de admin *activadas*.'
      : '🔕 Notificaciones de cambios de admin *desactivadas*.',
  }, { quoted: msg });
}

module.exports = { cmdTodos, cmdKick, cmdDel, cmdMute, cmdUnmute, cmdPromote, cmdDemote, cmdNotifAdmin, isMuted, isAdmin };
