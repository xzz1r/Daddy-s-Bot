const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { isOwner, isAdmin, isBotJid, isGroupAdmin, getTarget, getSender, bareJid, canonicalJid, sameUser, esMiembroActual } = require('../utils/wa');
const { streamToBuffer, MAX_DOWNLOAD_BYTES } = require('../utils/helpers');
const { toggleAdminNotify, isAdminNotifyEnabled, toggleAntiAdmin, isAntiAdminEnabled, toggleAntiBusiness, isAntiBusinessEnabled, toggleAntiLink, isAntiLinkEnabled, toggleSoloAdmins, isSoloAdminsEnabled } = require('../utils/state');
const { businessEvidence } = require('../utils/businessCheck');
const { getMemberFacts } = require('../utils/nickStore');
const { allow, disallow, listAllowed, MAX_AVISOS } = require('../utils/linkPerms');
const { SCAN_VALID_MS, scannableMembers, executePurge, purgeReport } = require('../utils/purge');

// In-memory mute store: `groupJid|bareJid` -> expireTimestamp
// Hard-capped: insertion-ordered Map evicts oldest entry past the cap so a
// long-running bot can't blow memory if mutes are added but never queried.
//
// Keys are normalized with canonicalJid(): the mute target comes from a mention
// (which can be a phone JID) while enforcement runs against msg.key.participant
// (which in modern LID groups is the user's @lid). bareJid() alone strips the
// device suffix but does NOT bridge LID↔phone, so a phone-form mute target and a
// LID-form sender would never match and the mute would silently do nothing.
// canonicalJid() collapses both to the same phone key when the mapping is known
// (and falls back to bareJid otherwise, so it's never worse than before).
const mutedUsers = new Map();
const MAX_MUTED = 5000;

function muteKey(groupJid, userJid) {
  return `${groupJid}|${canonicalJid(userJid)}`;
}

function muteUser(groupJid, userJid, expireTs) {
  const k = muteKey(groupJid, userJid);
  if (mutedUsers.size >= MAX_MUTED && !mutedUsers.has(k)) {
    mutedUsers.delete(mutedUsers.keys().next().value);
  }
  mutedUsers.set(k, expireTs);
}

function isMuted(groupJid, userJid) {
  const k = muteKey(groupJid, userJid);
  const exp = mutedUsers.get(k);
  if (!exp) return false;
  if (Date.now() > exp) { mutedUsers.delete(k); return false; }
  return true;
}

// Returns ms remaining on the mute, or 0 if not muted / already expired.
function getMuteRemaining(groupJid, userJid) {
  const exp = mutedUsers.get(muteKey(groupJid, userJid));
  if (!exp) return 0;
  const r = exp - Date.now();
  return r > 0 ? r : 0;
}

function unmuteUser(groupJid, userJid) {
  return mutedUsers.delete(muteKey(groupJid, userJid));
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
      return await streamToBuffer(await downloadContentFromMessage(mediaMsg, type), MAX_DOWNLOAD_BYTES);
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
    if (sameUser(t, sender)) { skipped.push({ jid: t, reason: 'eres tú mismo' }); continue; }
    // Never let the bot be told to remove itself.
    if (isBotJid(sock, t)) { skipped.push({ jid: t, reason: 'soy yo' }); continue; }
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
    const res = await sock.groupParticipantsUpdate(jid, targets, 'remove');
    // WhatsApp responde por participante y puede rechazar a unos y aceptar a
    // otros. Anunciar la lista entera sin mirarlo hacía que el bot afirmara
    // haber expulsado a gente que sigue sentada en el grupo.
    const codigo = (t) => String(
      (Array.isArray(res) ? res.find(r => (r?.jid || '').split('@')[0] === t.split('@')[0]) : null)?.status ?? '200'
    );
    const hechos  = targets.filter(t => codigo(t) === '200');
    const fallidos = targets.filter(t => codigo(t) !== '200');

    let text;
    if (!hechos.length) {
      text = `No se pudo expulsar a nadie: WhatsApp rechazó la operación (${codigo(targets[0])}).`;
    } else {
      const tags = hechos.map(t => `@${t.split('@')[0]}`).join(', ');
      text = hechos.length === 1
        ? `${tags} fue expulsado del grupo.`
        : `*${hechos.length}* expulsados: ${tags}`;
    }
    if (fallidos.length && hechos.length) {
      text += `\nNo se pudo expulsar a: ${fallidos.map(t => `@${t.split('@')[0]}`).join(', ')}`;
    }
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

  // Un admin normal no borra mensajes del owner tier. Era el único comando de
  // moderación que no lo comprobaba: !kick, !mute y !demote ya lo hacían, y aquí
  // cualquier admin podía ir borrando lo que escribiera el dueño.
  //
  // El owner sí puede borrar lo suyo y lo de cualquiera.
  const autorCitado = ctx.participant;
  if (isGroup && autorCitado &&
      isOwner(autorCitado, false, groupMeta) &&
      !isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'No puedes borrar mensajes del owner.' }, { quoted: msg });
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
  if (sameUser(target, sender)) {
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
        text: `@${num} ya está muteado. Le quedan *${mins}* minuto${mins === 1 ? '' : 's'}.`,
        mentions: [target],
      }, { quoted: msg });
    }
  }

  const minutes = Math.min(Math.max(parseInt(explicit || '10', 10), 1), 1440);
  muteUser(jid, target, Date.now() + minutes * 60_000);

  await sock.sendMessage(jid, {
    text: `@${num} muteado *${minutes}* minuto${minutes === 1 ? '' : 's'}.`,
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

  unmuteUser(jid, target);
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
  // Demoting the bot would strip the admin it needs to moderate — refuse.
  if (isBotJid(sock, target)) {
    return sock.sendMessage(jid, { text: 'No puedo quitarme el admin a mí mismo.' }, { quoted: msg });
  }
  // Owner tier is immune: a co-owner must not be able to strip the main owner
  // (or another co-owner), matching the protection kick and mute already enforce.
  if (isOwner(target, false, groupMeta)) {
    return sock.sendMessage(jid, { text: 'No puedes degradar a un owner del bot.' }, { quoted: msg });
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
    return sock.sendMessage(jid, { text: `Notificaciones de admin: *${current}*.` }, { quoted: msg });
  }

  const enable = arg === 'on';
  await toggleAdminNotify(jid, enable);
  await sock.sendMessage(jid, {
    text: enable ? 'Notificaciones de admin: *activadas*.' : 'Notificaciones de admin: *desactivadas*.',
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
    return sock.sendMessage(jid, { text: `Anti-admin: *${current}*.` }, { quoted: msg });
  }

  const enable = arg === 'on';
  await toggleAntiAdmin(jid, enable);
  await sock.sendMessage(jid, {
    text: enable ? 'Anti-admin *activado*.' : 'Anti-admin *desactivado*.',
  }, { quoted: msg });
}

// !antiempresa on/off/scan/purge — owner only.
//   scan  = DRY-RUN: lista quién es Business y con qué evidencia, NO expulsa.
//   purge = expulsa a los Business detectados.
//   on/off = expulsión automática al entrar.
async function cmdAntiBusiness(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo el owner del bot puede usar esto.' }, { quoted: msg });
  }

  const arg = (args[0] || '').toLowerCase();

  if (arg === 'scan')  return scanBusinesses(sock, msg, jid, groupMeta);  // dry-run + guarda la lista
  if (arg === 'purge') return purgeBusinesses(sock, msg, jid, groupMeta); // expulsa la lista verificada

  if (arg !== 'on' && arg !== 'off') {
    const current = isAntiBusinessEnabled(jid) ? 'activado' : 'desactivado';
    return sock.sendMessage(jid, {
      text:
        `Anti-empresa (auto al entrar): *${current}*\n\n` +
        `*!antiempresa scan* — lista quién es Business y por qué (NO expulsa)\n` +
        `*!antiempresa purge* — expulsa a los Business detectados\n` +
        `*!antiempresa on/off* — expulsión automática al entrar`,
    }, { quoted: msg });
  }

  const enable = arg === 'on';
  await toggleAntiBusiness(jid, enable);
  await sock.sendMessage(jid, {
    text: enable
      ? 'Anti-empresa *activado* (auto al entrar). Verifica antes con *!antiempresa scan*.'
      : 'Anti-empresa *desactivado*.',
  }, { quoted: msg });
}

// Última lista detectada por scan, por grupo, para que purge expulse EXACTAMENTE
// lo que el owner verificó (y no un re-escaneo que podría diferir por un fallo de
// red puntual). Vive en memoria; el scan la llena, el purge la consume.
const lastScan = new Map(); // groupJid -> { ts, detected: [{ kickId, fields }] }

async function detectBusinesses(sock, idToPhone) {
  const entries = Array.from(idToPhone.entries()); // [kickId, phoneJid]
  const detected = []; // { kickId, fields }
  const CONC = 6;
  for (let i = 0; i < entries.length; i += CONC) {
    const chunk = entries.slice(i, i + CONC);
    const results = await Promise.all(chunk.map(async ([kickId, phoneJid]) => {
      // Sin teléfono no se puede consultar el perfil (getBusinessProfile no
      // acepta LIDs), pero el hecho observado sí vale, así que estos NO se
      // descartan: se saltan la consulta y se juzgan solo por lo que ya consta.
      const ev = phoneJid
        ? await businessEvidence(sock, phoneJid).catch(() => ({ isBiz: false, fields: [] }))
        : { isBiz: false, fields: [] };
      if (ev.isBiz) return { kickId, ev };
      // WhatsApp adjunta un verified_name a los mensajes de las cuentas
      // Business (Baileys lo expone como msg.verifiedBizName). Si se le ha
      // visto uno, es Business aunque su perfil venga vacío en la consulta.
      const facts = await getMemberFacts([kickId, phoneJid]).catch(() => null);
      if (facts?.biz) return { kickId, ev: { isBiz: true, fields: ['nombre verificado de negocio'] } };
      return { kickId, ev };
    }));
    for (const { kickId, ev } of results) {
      if (ev.isBiz) detected.push({ kickId, fields: ev.fields });
    }
  }
  return detected;
}

// scan = DRY-RUN: detecta y lista con evidencia, NO expulsa. Guarda la lista para
// que un purge posterior expulse exactamente esto.
async function scanBusinesses(sock, msg, groupJid, groupMeta) {
  if (!groupMeta?.participants?.length) {
    return sock.sendMessage(groupJid, { text: 'No pude obtener los miembros del grupo.' }, { quoted: msg });
  }
  // Se escanea a TODOS, con teléfono o sin él. getBusinessProfile no acepta
  // LIDs, así que a los que solo tienen LID no se les puede consultar el
  // perfil — pero si WhatsApp ya adjuntó un nombre verificado de negocio a
  // alguno de sus mensajes, eso basta y no cuesta ninguna consulta. Antes se
  // les filtraba ANTES de mirar ese dato, así que un Business escondido tras
  // la privacidad de número no se detectaba jamás.
  const miembros = scannableMembers(sock, groupMeta);
  const idToPhone = new Map(miembros.map(m => [m.kickId, m.phoneJid || null]));
  const sinTelefono = miembros.filter(m => !m.phoneJid).length;
  if (!idToPhone.size) {
    return sock.sendMessage(groupJid, { text: 'No hay miembros que escanear (admins, owner y el bot quedan siempre fuera).' }, { quoted: msg });
  }

  await sock.sendMessage(groupJid, {
    text: `Escaneo de *${idToPhone.size}* miembros (admins y owner exentos)...` +
      (sinTelefono ? `\n_${sinTelefono} tienen el número oculto: a esos solo se les mira lo ya observado._` : ''),
  }, { quoted: msg });

  const detected = await detectBusinesses(sock, idToPhone);
  lastScan.set(groupJid, { ts: Date.now(), detected });

  if (!detected.length) {
    return sock.sendMessage(groupJid, { text: 'No se detectaron cuentas Business entre los miembros.' });
  }

  const lines = detected.map(d => `@${d.kickId.split('@')[0]} — ${d.fields.join(', ')}`);
  return sock.sendMessage(groupJid, {
    text:
      `*Business detectados (${detected.length})* — con su evidencia:\n\n` +
      lines.join('\n') +
      `\n\n_Esto NO expulsa a nadie. Si la lista es correcta, usa *!antiempresa purge* (dentro de 10 min). Si aparece alguien que NO es Business, avisa antes de purgar._`,
    mentions: detected.map(d => d.kickId),
  });
}

// purge = expulsa EXACTAMENTE la lista del último scan (verificada por el owner),
// no un re-escaneo. Obliga a haber escaneado antes (ventana de 10 min) y re-filtra
// a quien siga en el grupo (por si alguien ya salió).
async function purgeBusinesses(sock, msg, groupJid, groupMeta) {
  const last = lastScan.get(groupJid);
  if (!last || Date.now() - last.ts > SCAN_VALID_MS) {
    return sock.sendMessage(groupJid, {
      text: 'Primero corre *!antiempresa scan* para ver y verificar la lista; luego *!antiempresa purge* dentro de 10 min.',
    }, { quoted: msg });
  }

  if (!last.detected.length) {
    return sock.sendMessage(groupJid, {
      text: 'El último scan no detectó ninguna cuenta Business. No hay nada que purgar.',
    }, { quoted: msg });
  }

  // La evidencia de cada uno pasa a ser el "motivo" que muestra el informe.
  const detected = last.detected.map(d => ({ kickId: d.kickId, reason: d.fields.join(', ') }));
  const r = await executePurge(sock, groupJid, detected, groupMeta);

  if (r.status === 'sin-metadata') {
    return sock.sendMessage(groupJid, {
      text: 'No pude obtener los miembros del grupo. La lista del scan se conserva: reintenta el purge en un momento.',
    }, { quoted: msg });
  }
  if (r.status === 'error') {
    return sock.sendMessage(groupJid, { text: `Error al expulsar: ${r.message}` }, { quoted: msg });
  }

  lastScan.delete(groupJid); // consumido: obliga a re-escanear para volver a purgar

  if (r.status === 'vacio') {
    return sock.sendMessage(groupJid, {
      text: r.spared.length
        ? 'No queda nadie a quien expulsar: los detectados son ahora admin, owner o el bot. Corre *!antiempresa scan* de nuevo.'
        : 'Los Business detectados ya no están en el grupo. Corre *!antiempresa scan* de nuevo.',
    }, { quoted: msg });
  }

  return sock.sendMessage(groupJid, purgeReport('Anti-empresa', r));
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
    return sock.sendMessage(jid, { text: '*!add <número>*' }, { quoted: msg });
  }

  const targetJid = `${raw}@s.whatsapp.net`;
  try {
    const result = await sock.groupParticipantsUpdate(jid, [targetJid], 'add');
    // El codigo llega SIEMPRE como cadena: Baileys lo construye con
    // `p.attrs.error || '200'` (Socket/groups.js:137), y los atributos del nodo
    // binario son texto. Compararlo contra numeros no acertaba ni una vez, asi
    // que las cuatro respuestas utiles eran codigo muerto y el owner siempre
    // recibia el mensaje generico de "codigo X".
    const status = String(result?.[0]?.status ?? '');
    if (status === '200') {
      return sock.sendMessage(jid, {
        text: `@${raw} fue agregado al grupo.`,
        mentions: [targetJid],
      }, { quoted: msg });
    }
    if (status === '403') {
      return sock.sendMessage(jid, { text: `No se pudo agregar a +${raw}: su configuracion de privacidad no permite ser agregado a grupos.` }, { quoted: msg });
    }
    if (status === '408') {
      return sock.sendMessage(jid, { text: `No se pudo agregar a +${raw}: el número no existe en WhatsApp.` }, { quoted: msg });
    }
    if (status === '409') {
      return sock.sendMessage(jid, { text: `+${raw} ya esta en el grupo.` }, { quoted: msg });
    }
    return sock.sendMessage(jid, { text: `Resultado para +${raw}: código ${status || 'desconocido'}.` }, { quoted: msg });
  } catch (err) {
    return sock.sendMessage(jid, { text: `No pude agregar al usuario: ${err.message}` }, { quoted: msg });
  }
}

// !antilink on/off — solo owner. Se borra CUALQUIER enlace:
//   YouTube / Instagram → borrado + aviso de que ese permiso lo dan los admins
//                         con *!allow*. Los dos primeros solo avisan; al TERCERO
//                         sin permiso, ban y expulsión.
//   cualquier otro       → borrado + expulsión directa del que lo envió.
// Quien tenga el *!allow* publica sin que se le borre nada.
// Los admins del grupo quedan siempre exentos.
async function cmdAntiLink(sock, msg, args, groupMeta) {
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
    const current = isAntiLinkEnabled(jid) ? 'activado' : 'desactivado';
    return sock.sendMessage(jid, { text: `Anti-link: *${current}*.` }, { quoted: msg });
  }

  const enable = arg === 'on';
  await toggleAntiLink(jid, enable);
  await sock.sendMessage(jid, {
    text: enable
      ? `Anti-link *activado*. Se borra cualquier enlace. Los de YouTube e Instagram avisan ${MAX_AVISOS - 1} veces y al ${MAX_AVISOS === 3 ? 'tercero' : `aviso ${MAX_AVISOS}`} es ban; el resto, expulsión directa. Con *!allow* se publica sin problema. Los admins quedan exentos.`
      : 'Anti-link *desactivado*.',
  }, { quoted: msg });
}

// !allow @user — concede el permiso de publicar enlaces. Lo dan los admins,
// que es justo lo que el aviso del anti-link le dice a la gente que pida.
//
//   !allow @user        → se lo da
//   !allow off @user    → se lo quita
//   !allow              → lista quién lo tiene
async function cmdAllow(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo funciona en grupos.' }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo los admins reparten este permiso.' }, { quoted: msg });
  }

  const quitar = (args[0] || '').toLowerCase() === 'off';
  const target = getTarget(msg);

  if (!target) {
    // Solo los que siguen dentro: el permiso se guarda para siempre y la lista
    // acababa nombrando a gente que se fue hace meses.
    const lista = (await listAllowed(jid)).filter(j => esMiembroActual(groupMeta, j));
    if (!lista.length) {
      return sock.sendMessage(jid, {
        text: 'Nadie tiene permiso para publicar enlaces.\n\n*!allow* @user — se lo das\n*!allow off* @user — se lo quitas',
      }, { quoted: msg });
    }
    return sock.sendMessage(jid, {
      text: `*Pueden publicar enlaces (${lista.length}):*\n` + lista.map(j => `@${j.split('@')[0]}`).join(' '),
      mentions: lista,
    }, { quoted: msg });
  }

  const num = target.split('@')[0];
  if (quitar) {
    const tenia = await disallow(jid, target);
    return sock.sendMessage(jid, {
      text: tenia
        ? `@${num} ya no puede publicar enlaces. Que se lo vuelva a ganar.`
        : `@${num} no tenía el permiso.`,
      mentions: [target],
    }, { quoted: msg });
  }

  await allow(jid, target);
  return sock.sendMessage(jid, {
    text: `@${num} tiene permiso para publicar enlaces. Se lo ha ganado, no lo desperdicies.`,
    mentions: [target],
  }, { quoted: msg });
}

// !close — set the group to admin-only messages (announcement mode)
async function cmdClose(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo admins pueden usar este comando.' }, { quoted: msg });
  }
  try {
    await sock.groupSettingUpdate(jid, 'announcement');
    await sock.sendMessage(jid, { text: 'Grupo *cerrado*. Solo los admins pueden escribir.' }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(jid, { text: `No pude cerrar el grupo: ${err.message}` }, { quoted: msg });
  }
}

// !open — allow everyone to send messages again (not_announcement mode)
async function cmdOpen(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo admins pueden usar este comando.' }, { quoted: msg });
  }
  try {
    await sock.groupSettingUpdate(jid, 'not_announcement');
    await sock.sendMessage(jid, { text: 'Grupo *abierto*. Todos pueden escribir.' }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(jid, { text: `No pude abrir el grupo: ${err.message}` }, { quoted: msg });
  }
}

// !soloadmins on/off — con esto encendido el bot solo obedece a admins y al
// owner tier. A los miembros normales no les contesta NADA: ni el comando ni
// un aviso de que no pueden. La alternativa (responder "no puedes" a cada
// intento) convierte el modo en una fuente de spam en el propio chat.
async function cmdSoloAdmins(sock, msg, args, groupMeta) {
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
    const current = isSoloAdminsEnabled(jid) ? 'activado' : 'desactivado';
    return sock.sendMessage(jid, {
      text: `Modo solo admins: *${current}*.\n\nUsa *!soloadmins on* o *!soloadmins off*.`,
    }, { quoted: msg });
  }

  const enable = arg === 'on';
  await toggleSoloAdmins(jid, enable);
  await sock.sendMessage(jid, {
    text: enable
      ? 'Modo solo admins *activado*. El bot deja de responder a los miembros; solo admins y owner.'
      : 'Modo solo admins *desactivado*. El bot vuelve a responder a todo el grupo.',
  }, { quoted: msg });
}

module.exports = {
  cmdSoloAdmins, cmdTodos, cmdKick, cmdDel, cmdMute, cmdUnmute, cmdPromote, cmdDemote, cmdNotifAdmin, cmdAntiAdmin, cmdAntiBusiness, isMuted, cmdAdd, cmdAntiLink, cmdAllow, cmdClose, cmdOpen };
