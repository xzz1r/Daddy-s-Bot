const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { isOwner, isAdmin, isGroupAdmin, getTarget, getSender } = require('../utils/wa');
const { streamToBuffer } = require('../utils/helpers');
const { toggleAdminNotify, isAdminNotifyEnabled, toggleAntiAdmin, isAntiAdminEnabled, toggleAntiBusiness, isAntiBusinessEnabled } = require('../utils/state');
const { isBusinessBatch } = require('../utils/businessCheck');

// In-memory mute store: `groupJid|userJid` -> expireTimestamp
// Hard-capped: insertion-ordered Map evicts oldest entry past the cap so a
// long-running bot can't blow memory if mutes are added but never queried.
const mutedUsers = new Map();
const MAX_MUTED = 5000;

function muteUser(groupJid, userJid, expireTs) {
  const k = `${groupJid}|${userJid}`;
  if (mutedUsers.size >= MAX_MUTED && !mutedUsers.has(k)) {
    mutedUsers.delete(mutedUsers.keys().next().value);
  }
  mutedUsers.set(k, expireTs);
}

function isMuted(groupJid, userJid) {
  const k = `${groupJid}|${userJid}`;
  const exp = mutedUsers.get(k);
  if (!exp) return false;
  if (Date.now() > exp) { mutedUsers.delete(k); return false; }
  return true;
}

// Returns ms remaining on the mute, or 0 if not muted / already expired.
function getMuteRemaining(groupJid, userJid) {
  const exp = mutedUsers.get(`${groupJid}|${userJid}`);
  if (!exp) return 0;
  const r = exp - Date.now();
  return r > 0 ? r : 0;
}

// Periodic sweep — isMuted only evicts entries that get queried after expiry,
// so abandoned mutes would otherwise accumulate forever in a 24/7 bot.
setInterval(() => {
  const now = Date.now();
  for (const [k, exp] of mutedUsers) {
    if (now > exp) mutedUsers.delete(k);
  }
}, 10 * 60 * 1000).unref();

// !tagall — mention everyone. Forwards media if replying to one, otherwise sends text.
async function cmdTodos(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);
  if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo admins pueden usar este comando.' }, { quoted: msg });
  }

  const participants = groupMeta?.participants || [];
  if (!participants.length) {
    return sock.sendMessage(jid, { text: 'No pude obtener miembros del grupo.' }, { quoted: msg });
  }

  const mentions = participants.map((p) => p.id);
  const caption = (args || []).join(' ').trim();

  // Returns buffer on success, null on any download failure.
  // Silent null lets callers fall through to text-only tagall instead of crashing.
  async function tryDl(mediaMsg, type) {
    try {
      return await streamToBuffer(await downloadContentFromMessage(mediaMsg, type));
    } catch {
      return null;
    }
  }

  // --- Media attached to the command message itself ---
  const m = msg.message;
  if (m?.imageMessage) {
    const buf = await tryDl(m.imageMessage, 'image');
    if (buf) return sock.sendMessage(jid, { image: buf, caption: caption || m.imageMessage.caption || '', mentions });
  }
  if (m?.videoMessage) {
    const buf = await tryDl(m.videoMessage, 'video');
    if (buf) return sock.sendMessage(jid, { video: buf, caption: caption || m.videoMessage.caption || '', mentions });
  }
  if (m?.stickerMessage) {
    const buf = await tryDl(m.stickerMessage, 'sticker');
    if (buf) return sock.sendMessage(jid, {
      sticker: buf,
      ...(m.stickerMessage.isAnimated ? { isAnimated: true } : {}),
      mentions,
    });
  }

  // --- Media in the quoted (replied-to) message ---
  // contextInfo can live under extendedTextMessage, imageMessage, videoMessage, etc.
  const ctx =
    m?.extendedTextMessage?.contextInfo ||
    m?.imageMessage?.contextInfo ||
    m?.videoMessage?.contextInfo ||
    m?.documentMessage?.contextInfo;
  const rawQuoted = ctx?.quotedMessage;

  if (rawQuoted) {
    // Unwrap view-once wrappers — WhatsApp may strip mediaKey for view-once quotes,
    // so the download might fail; tryDl handles that with a silent null.
    const quoted =
      rawQuoted.viewOnceMessageV2Extension?.message ||
      rawQuoted.viewOnceMessageV2?.message ||
      rawQuoted.viewOnceMessage?.message ||
      rawQuoted;

    if (quoted.imageMessage) {
      const buf = await tryDl(quoted.imageMessage, 'image');
      if (buf) return sock.sendMessage(jid, { image: buf, caption: caption || quoted.imageMessage.caption || '', mentions });
    }
    if (quoted.videoMessage) {
      const buf = await tryDl(quoted.videoMessage, 'video');
      if (buf) return sock.sendMessage(jid, { video: buf, caption: caption || quoted.videoMessage.caption || '', mentions });
    }
    if (quoted.stickerMessage) {
      const buf = await tryDl(quoted.stickerMessage, 'sticker');
      if (buf) return sock.sendMessage(jid, {
        sticker: buf,
        ...(quoted.stickerMessage.isAnimated ? { isAnimated: true } : {}),
        mentions,
      });
    }
    if (quoted.audioMessage) {
      const buf = await tryDl(quoted.audioMessage, 'audio');
      if (buf) return sock.sendMessage(jid, { audio: buf, mimetype: quoted.audioMessage.mimetype || 'audio/mp4', mentions });
    }
    // Quoted text → use as body if no caption given
    const quotedText = quoted.conversation || quoted.extendedTextMessage?.text || '';
    return sock.sendMessage(jid, { text: caption || quotedText || '​', mentions });
  }

  // Plain text or invisible ping
  return sock.sendMessage(jid, { text: caption || '​', mentions });
}

// !kick @user — remove a member (admin only)
async function cmdKick(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);
  if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo admins pueden usar este comando.' }, { quoted: msg });
  }

  // Collect all candidates: every @mention + the quoted participant (if any).
  // Dedup so `!kick @a @a` doesn't double-process.
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  const all = [...new Set([...mentioned, ...(quotedParticipant ? [quotedParticipant] : [])])];

  if (!all.length) {
    return sock.sendMessage(jid, { text: 'Menciona o responde al usuario que quieres expulsar.' }, { quoted: msg });
  }

  // Partition: targets we can actually kick vs ones we skip (with reason).
  // Owner can kick admins; regular admins cannot.
  const senderIsOwner = isOwner(sender, msg.key.fromMe, groupMeta);
  const targets = [];
  const skipped = [];
  for (const t of all) {
    if (t === sender) { skipped.push({ jid: t, reason: 'sos vos mismo' }); continue; }
    // Owner tier is immune to kick — no one can remove the owner/co-owner via the bot.
    if (isOwner(t, false, groupMeta)) { skipped.push({ jid: t, reason: 'es owner' }); continue; }
    if (isAdmin(groupMeta?.participants, t) && !senderIsOwner) {
      skipped.push({ jid: t, reason: 'es admin' });
      continue;
    }
    targets.push(t);
  }

  if (!targets.length) {
    const reasons = skipped.map(s => `@${s.jid.split('@')[0]} (${s.reason})`).join(', ');
    return sock.sendMessage(jid, {
      text: `No pude expulsar a nadie:\n${reasons}`,
      mentions: skipped.map(s => s.jid),
    }, { quoted: msg });
  }

  try {
    // Single batch call to the WA API instead of one round-trip per user.
    await sock.groupParticipantsUpdate(jid, targets, 'remove');
    const tags = targets.map(t => `@${t.split('@')[0]}`).join(', ');
    let text = targets.length === 1
      ? `${tags} fue expulsado del grupo.`
      : `*${targets.length}* expulsados: ${tags}`;
    if (skipped.length) {
      const skipTags = skipped.map(s => `@${s.jid.split('@')[0]} (${s.reason})`).join(', ');
      text += `\nSalteados: ${skipTags}`;
    }
    await sock.sendMessage(jid, {
      text,
      mentions: [...targets, ...skipped.map(s => s.jid)],
    }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(jid, { text: `No pude expulsar: ${err.message}` }, { quoted: msg });
  }
}

// !del — delete the quoted message
async function cmdDel(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);
  const isGroup = jid.endsWith('@g.us');

  if (isGroup && !isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo admins pueden borrar mensajes.' }, { quoted: msg });
  }

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.stanzaId) {
    return sock.sendMessage(jid, { text: 'Responde al mensaje que quieres borrar con !del.' }, { quoted: msg });
  }

  const deleteKey = {
    remoteJid: jid,
    fromMe: false,
    id: ctx.stanzaId,
    ...(isGroup && ctx.participant ? { participant: ctx.participant } : {}),
  };

  try {
    await sock.sendMessage(jid, { delete: deleteKey });
    // Also delete the !del command itself — keeps the chat clean. The bot is
    // already an admin (required for the previous delete to work), so it can
    // delete any message including the admin's command.
    sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
  } catch (err) {
    await sock.sendMessage(jid, { text: `No pude borrar el mensaje: ${err.message}` }, { quoted: msg });
  }
}

// !mute @user [minutos] — silencia comandos de un usuario (admin only)
async function cmdMute(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo admins pueden mutear.' }, { quoted: msg });
  }

  const target = getTarget(msg);
  if (!target) {
    return sock.sendMessage(jid, { text: 'Menciona o responde al usuario que quieres mutear.' }, { quoted: msg });
  }
  if (target === sender) {
    return sock.sendMessage(jid, { text: 'No puedes mutearte a ti mismo.' }, { quoted: msg });
  }
  // Owner tier is immune; and (mirroring !kick) only the owner may act on admins.
  if (isOwner(target, false, groupMeta)) {
    return sock.sendMessage(jid, { text: 'No puedes mutear al owner del bot.' }, { quoted: msg });
  }
  if (isAdmin(groupMeta?.participants, target) && !isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo el owner puede mutear a un admin.' }, { quoted: msg });
  }

  const explicit = args.find(a => /^\d+$/.test(a));
  const num = target.split('@')[0];

  // If already muted and no new duration given, report remaining time
  // instead of silently re-muting at the default (10m). Avoids the footgun
  // of "I thought I muted them for an hour but it's actually 10 minutes".
  if (!explicit) {
    const remaining = getMuteRemaining(jid, target);
    if (remaining > 0) {
      const mins = Math.ceil(remaining / 60_000);
      return sock.sendMessage(jid, {
        text: `@${num} ya esta muteado. Le quedan *${mins}* minuto${mins === 1 ? '' : 's'}.\nUsa *!mute @user <minutos>* para cambiar la duracion.`,
        mentions: [target],
      }, { quoted: msg });
    }
  }

  const minutes = Math.min(Math.max(parseInt(explicit || '10', 10), 1), 1440);
  muteUser(jid, target, Date.now() + minutes * 60_000);

  await sock.sendMessage(jid, {
    text: `@${num} muteado por *${minutes}* minuto${minutes === 1 ? '' : 's'}. No podra usar comandos.`,
    mentions: [target],
  }, { quoted: msg });
}

// !unmute @user — quita el mute (admin only)
async function cmdUnmute(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo admins pueden desmutear.' }, { quoted: msg });
  }

  const target = getTarget(msg);
  if (!target) {
    return sock.sendMessage(jid, { text: 'Menciona al usuario que quieres desmutear.' }, { quoted: msg });
  }

  mutedUsers.delete(`${jid}|${target}`);
  const num = target.split('@')[0];
  await sock.sendMessage(jid, {
    text: `@${num} desmuteado.`,
    mentions: [target],
  }, { quoted: msg });
}

// !promote @user — give admin rights (admin only, owner-only when antiadmin is on)
async function cmdPromote(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }
  const sender = getSender(msg);

  if (isAntiAdminEnabled(jid)) {
    if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
      return sock.sendMessage(jid, { text: 'Anti-admin esta activado. Solo el owner del bot puede dar admin.' }, { quoted: msg });
    }
  } else if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo admins pueden usar este comando.' }, { quoted: msg });
  }

  const target = getTarget(msg);
  if (!target) {
    return sock.sendMessage(jid, { text: 'Menciona o responde al usuario que quieres ascender.' }, { quoted: msg });
  }
  if (isAdmin(groupMeta?.participants, target)) {
    return sock.sendMessage(jid, { text: 'Ese usuario ya es admin.' }, { quoted: msg });
  }

  try {
    await sock.groupParticipantsUpdate(jid, [target], 'promote');
    const num = target.split('@')[0];
    await sock.sendMessage(jid, { text: `@${num} ahora es admin.`, mentions: [target] }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(jid, { text: `No pude ascender al usuario: ${err.message}` }, { quoted: msg });
  }
}

// !demote @user — remove admin rights (owner only)
async function cmdDemote(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo el owner puede degradar admins.' }, { quoted: msg });
  }

  const target = getTarget(msg);
  if (!target) {
    return sock.sendMessage(jid, { text: 'Menciona o responde al admin que quieres degradar.' }, { quoted: msg });
  }
  if (!isAdmin(groupMeta?.participants, target)) {
    return sock.sendMessage(jid, { text: 'Ese usuario no es admin.' }, { quoted: msg });
  }

  try {
    await sock.groupParticipantsUpdate(jid, [target], 'demote');
    const num = target.split('@')[0];
    await sock.sendMessage(jid, { text: `@${num} degradado a miembro.`, mentions: [target] }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(jid, { text: `No pude degradar al usuario: ${err.message}` }, { quoted: msg });
  }
}

// !notifadmin on/off — toggle admin change notifications for this group (admin only)
async function cmdNotifAdmin(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo admins pueden cambiar esta configuracion.' }, { quoted: msg });
  }

  const arg = (args[0] || '').toLowerCase();
  if (arg !== 'on' && arg !== 'off') {
    const current = isAdminNotifyEnabled(jid) ? 'activadas' : 'desactivadas';
    return sock.sendMessage(jid, { text: `Notificaciones de admin: *${current}*\nUsa !notifadmin on/off para cambiar.` }, { quoted: msg });
  }

  const enable = arg === 'on';
  await toggleAdminNotify(jid, enable);
  await sock.sendMessage(jid, {
    text: enable
      ? 'Notificaciones de cambios de admin activadas.'
      : 'Notificaciones de cambios de admin desactivadas.',
  }, { quoted: msg });
}

// !antiadmin on/off — owner only. Blocks any non-owner promote and reverts it.
async function cmdAntiAdmin(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo el owner del bot puede activar esto.' }, { quoted: msg });
  }

  const arg = (args[0] || '').toLowerCase();
  if (arg !== 'on' && arg !== 'off') {
    const current = isAntiAdminEnabled(jid) ? 'activado' : 'desactivado';
    return sock.sendMessage(jid, {
      text: `Anti-admin: *${current}*\nUsa *!antiadmin on/off* para cambiar.`,
    }, { quoted: msg });
  }

  const enable = arg === 'on';
  await toggleAntiAdmin(jid, enable);
  await sock.sendMessage(jid, {
    text: enable
      ? 'Anti-admin *activado*.\n' +
        '- Si un admin (no owner) da o quita admin, se revierte y el admin queda degradado.\n' +
        '- Si un admin (no owner) agrega gente, es degradado y los agregados expulsados.\n' +
        '- Las acciones del owner/co-owner estan permitidas y no se notifican.'
      : 'Anti-admin *desactivado*.',
  }, { quoted: msg });
}

// !antiempresa on/off/scan — owner only. Auto-kicks WhatsApp Business accounts.
async function cmdAntiBusiness(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo el owner del bot puede activar esto.' }, { quoted: msg });
  }

  const arg = (args[0] || '').toLowerCase();

  if (arg === 'scan') {
    return scanAndPurgeBusinesses(sock, msg, jid, groupMeta);
  }

  if (arg !== 'on' && arg !== 'off') {
    const current = isAntiBusinessEnabled(jid) ? 'activado' : 'desactivado';
    return sock.sendMessage(jid, {
      text:
        `Anti-empresa: *${current}*\n\n` +
        `*!antiempresa on*    activar (Business nuevas son expulsadas)\n` +
        `*!antiempresa off*   desactivar\n` +
        `*!antiempresa scan*  barrer Business actuales del grupo`,
    }, { quoted: msg });
  }

  const enable = arg === 'on';
  await toggleAntiBusiness(jid, enable);
  await sock.sendMessage(jid, {
    text: enable
      ? 'Anti-empresa *activado*.\nCuando una cuenta de WhatsApp Business entre al grupo, sera expulsada automaticamente.\n\nUsa *!antiempresa scan* para barrer las que ya estan dentro.'
      : 'Anti-empresa *desactivado*.',
  }, { quoted: msg });
}

async function scanAndPurgeBusinesses(sock, msg, groupJid, groupMeta) {
  if (!groupMeta?.participants?.length) {
    return sock.sendMessage(groupJid, { text: 'No pude obtener los miembros del grupo.' }, { quoted: msg });
  }

  // Skip admins entirely — they're exempt from the purge.
  // Build a map of { kickId -> phoneJid } so we can:
  //   - look up Business status via the phone JID (@s.whatsapp.net only — LIDs aren't supported by getBusinessProfile)
  //   - kick using participant.id (what WhatsApp's API actually expects, even if it's a LID)
  const idToPhone = new Map();
  for (const p of groupMeta.participants) {
    if (p.admin === 'admin' || p.admin === 'superadmin') continue;
    if (!p?.id) continue;
    // p.id may be @lid or @s.whatsapp.net. p.phoneNumber is populated by Baileys
    // ONLY when p.id is a LID, so fall back to p.id when it's already a phone JID.
    const phoneJid = p.phoneNumber || (p.id.endsWith('@s.whatsapp.net') ? p.id : null);
    if (!phoneJid) continue; // no phone form available — can't query Business profile
    idToPhone.set(p.id, phoneJid);
  }

  if (!idToPhone.size) {
    return sock.sendMessage(groupJid, { text: 'No hay miembros para escanear (solo admins, o sin mapeo de numero disponible).' }, { quoted: msg });
  }

  await sock.sendMessage(groupJid, {
    text: `Escaneando *${idToPhone.size}* miembros (admins exentos)...`,
  }, { quoted: msg });

  const phoneJids = Array.from(idToPhone.values());
  const phoneResults = await isBusinessBatch(sock, phoneJids);

  // Translate phone -> kickId for the kick step
  const toKick = [];
  for (const [kickId, phoneJid] of idToPhone) {
    if (phoneResults.get(phoneJid)) toKick.push(kickId);
  }

  if (!toKick.length) {
    return sock.sendMessage(groupJid, { text: 'No se encontraron cuentas Business entre los miembros.' });
  }

  try {
    await sock.groupParticipantsUpdate(groupJid, toKick, 'remove');
    const tags = toKick.map(j => `@${j.split('@')[0]}`).join(', ');
    await sock.sendMessage(groupJid, {
      text: `*Anti-empresa:* expulsadas *${toKick.length}* cuentas Business.\n${tags}`,
      mentions: toKick,
    });
  } catch (err) {
    await sock.sendMessage(groupJid, { text: `Error al expulsar: ${err.message}` });
  }
}

// !add <numero> — add a user by phone number (owner only)
async function cmdAdd(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo el owner puede usar este comando.' }, { quoted: msg });
  }

  const raw = (args[0] || '').replace(/[^\d]/g, '');
  if (!raw || raw.length < 6) {
    return sock.sendMessage(jid, { text: 'Uso: *!add <numero>*\nEjemplo: !add 5491100000000' }, { quoted: msg });
  }

  const targetJid = `${raw}@s.whatsapp.net`;
  try {
    const result = await sock.groupParticipantsUpdate(jid, [targetJid], 'add');
    const status = result?.[0]?.status;
    if (status === 200) {
      return sock.sendMessage(jid, {
        text: `@${raw} fue agregado al grupo.`,
        mentions: [targetJid],
      }, { quoted: msg });
    }
    if (status === 403) {
      return sock.sendMessage(jid, { text: `No se pudo agregar a +${raw}: su configuracion de privacidad no permite ser agregado a grupos.` }, { quoted: msg });
    }
    if (status === 408) {
      return sock.sendMessage(jid, { text: `No se pudo agregar a +${raw}: el numero no existe en WhatsApp.` }, { quoted: msg });
    }
    if (status === 409) {
      return sock.sendMessage(jid, { text: `+${raw} ya esta en el grupo.` }, { quoted: msg });
    }
    return sock.sendMessage(jid, { text: `Resultado para +${raw}: codigo ${status ?? 'desconocido'}.` }, { quoted: msg });
  } catch (err) {
    return sock.sendMessage(jid, { text: `No pude agregar al usuario: ${err.message}` }, { quoted: msg });
  }
}

module.exports = { cmdTodos, cmdKick, cmdDel, cmdMute, cmdUnmute, cmdPromote, cmdDemote, cmdNotifAdmin, cmdAntiAdmin, cmdAntiBusiness, isMuted, cmdAdd };
