const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { isOwner, isAdmin, isBotJid, isBotAdmin, isGroupAdmin, getTarget, getSender, bareJid, canonicalJid, sameUser, esMiembroActual } = require('../utils/wa');
const { streamToBuffer, MAX_DOWNLOAD_BYTES, atomicWriteJson, readJsonOrEnoent, pickFresh } = require('../utils/helpers');
const path = require('path');
const logger = require('../utils/logger');
const { toggleAdminNotify, isAdminNotifyEnabled, toggleAntiAdmin, isAntiAdminEnabled, toggleAntiBusiness, isAntiBusinessEnabled, toggleAntiLink, isAntiLinkEnabled, toggleSoloAdmins, isSoloAdminsEnabled } = require('../utils/state');
const { businessEvidence } = require('../utils/businessCheck');
const { getMemberFacts, recordFacts } = require('../utils/nickStore');
const { banAccount } = require('../utils/banlist');
const { aplicarParticipantes, aplicarAUno } = require('../utils/participantes');
const { allForms } = require('./fk');
const { allow, disallow, listAllowed, MAX_AVISOS, DURACION_MS } = require('../utils/linkPerms');
const { SCAN_VALID_MS, scannableMembers, executePurge, purgeReport } = require('../utils/purge');
const { AVISOS_KICK } = require('../data/kickPhrases');
const { A_TI_MISMO, CONTRA_UN_ADMIN, SIN_PERMISO, SOLO_ADMINS, SOLO_GRUPOS } = require('../data/avisos');
const { aviso } = require('../utils/helpers');

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

// LOS MUTEOS SE GUARDAN EN DISCO, y hasta ahora no. Vivian solo en este Map, o
// sea que cualquier reinicio del proceso los borraba todos de golpe y en
// silencio: nadie avisaba, el silenciado volvia a escribir y el admin que lo
// habia callado veinticuatro horas se enteraba por las malas.
//
// Y no es un caso raro: `npm run update` reinicia con pm2. Cada actualizacion
// del bot levantaba todos los muteos activos.
//
// Es el mismo patron que el resto de almacenes del bot: lectura perezosa,
// escritura atomica y agrupada, y los caducados se tiran al cargar en vez de
// arrastrarlos.
const MUTE_FILE = path.join(__dirname, '../../data/mutes.json');
let mutesCargados = false;
let muteTimer = null;

function guardarMutes() {
  if (muteTimer) return;
  muteTimer = setTimeout(() => {
    muteTimer = null;
    atomicWriteJson(MUTE_FILE, Object.fromEntries(mutedUsers))
      .catch((e) => logger.warn(`mutes: no pude guardar (${e.message})`));
  }, 2000);
  muteTimer.unref?.();
}

async function cargarMutes() {
  if (mutesCargados) return;
  mutesCargados = true;
  try {
    const d = await readJsonOrEnoent(MUTE_FILE, {});
    const ahora = Date.now();
    let vivos = 0;
    for (const [k, exp] of Object.entries(d || {})) {
      if (typeof exp === 'number' && exp > ahora) { mutedUsers.set(k, exp); vivos++; }
    }
    if (vivos) logger.info(`mutes: ${vivos} silenciado(s) siguen en pie tras el reinicio.`);
  } catch (e) {
    logger.warn(`mutes: no pude leer el fichero (${e.message}); se empieza vacio`);
  }
}
cargarMutes();

function muteKey(groupJid, userJid) {
  return `${groupJid}|${canonicalJid(userJid)}`;
}

function muteUser(groupJid, userJid, expireTs) {
  const k = muteKey(groupJid, userJid);
  if (mutedUsers.size >= MAX_MUTED && !mutedUsers.has(k)) {
    mutedUsers.delete(mutedUsers.keys().next().value);
  }
  mutedUsers.set(k, expireTs);
  guardarMutes();
}

function isMuted(groupJid, userJid) {
  const k = muteKey(groupJid, userJid);
  const exp = mutedUsers.get(k);
  if (!exp) return false;
  if (Date.now() > exp) { mutedUsers.delete(k); guardarMutes(); return false; }
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
  const habia = mutedUsers.delete(muteKey(groupJid, userJid));
  if (habia) guardarMutes();
  return habia;
}

// Periodic sweep — isMuted only evicts entries that get queried after expiry,
// so abandoned mutes would otherwise accumulate forever in a 24/7 bot.
setInterval(() => {
  const now = Date.now();
  let fuera = 0;
  for (const [k, exp] of mutedUsers) {
    if (now > exp) { mutedUsers.delete(k); fuera++; }
  }
  if (fuera) guardarMutes();
}, 10 * 60 * 1000).unref();

// !tagall — mention everyone. Forwards media if replying to one, otherwise sends text.
async function cmdTodos(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }

  const sender = getSender(msg);
  if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SOLO_ADMINS, jid, 'admins') }, { quoted: msg });
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

// !adm — convocatoria de admins. Solo el owner, y avisa a todo el grupo sin que
// se vea un solo @.
//
// La mención invisible es el mismo truco que el ping de !tagall: los JID van en
// `mentions` pero NINGUNO aparece escrito en el texto. WhatsApp notifica igual a
// quien está mencionado, así que llega a todos como un aviso personal mientras
// en pantalla se lee un anuncio limpio. Con los @ escritos serían doscientos
// números en medio del mensaje y no lo leería nadie.
async function cmdAdm(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }

  // Solo el owner tier. Y en silencio si no lo es: contestar "no tienes permiso"
  // confirma que el comando existe, y este no se anuncia en el menú.
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) return;

  const participants = groupMeta?.participants || [];
  if (!participants.length) {
    return sock.sendMessage(jid, { text: 'No pude obtener miembros del grupo.' }, { quoted: msg });
  }

  const text =
    `*SE BUSCAN ADMINS*\n` +
    `╾━━━━━━━━━━━━━━╼\n\n` +
    `Se abren plazas de administración en el grupo.\n\n` +
    `No se busca a cualquiera: hace falta *criterio*, cabeza fría y saber cuándo ` +
    `no hacer nada. El que quiera el cargo por el cargo, que ni escriba.\n\n` +
    `*Para más información:*\n` +
    `wa.me/5491168789916 — +54 9 11 6878-9916\n\n` +
    `_Las plazas se dan a dedo. Que se te vea el criterio antes de pedirla._`;

  return sock.sendMessage(jid, { text, mentions: participants.map((p) => p.id) });
}

// !kick @user — remove a member (admin only).
// El aviso hiriente sale ANTES del kick, igual que en !purge: tienen que verlo.
const AVISO_ANTES_KICK_MS = 1000;
const esperaKick = (ms) => new Promise((r) => setTimeout(r, ms));

function avisoDeKick(jids) {
  const ids = [...new Set((Array.isArray(jids) ? jids : [jids]).filter(Boolean))];
  const menciones = ids.map((j) => `@${String(j).split('@')[0]}`).join(' ');
  const pick = AVISOS_KICK[Math.floor(Math.random() * AVISOS_KICK.length)] || AVISOS_KICK[0];
  const plantilla = ids.length === 1 ? pick.uno : pick.varios;
  return {
    text: String(plantilla).replace(/%M/g, menciones),
    mentions: ids,
  };
}

async function cmdKick(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }

  const sender = getSender(msg);
  if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SOLO_ADMINS, jid, 'admins') }, { quoted: msg });
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
  // Los del tier owner no se saltan "con motivo": desaparecen del informe. Un
  // "@fulano (es owner)" en mitad de la lista de salteados delataba el rango de
  // quien nunca debe figurar, y bastaba un !kick al azar para descubrirlo.
  for (const t of all) {
    if (sameUser(t, sender)) { skipped.push({ jid: t, reason: 'eres tú mismo' }); continue; }
    // Never let the bot be told to remove itself.
    if (isBotJid(sock, t)) { skipped.push({ jid: t, reason: 'soy yo' }); continue; }
    // Owner tier is immune to kick — no one can remove the owner/co-owner via the bot.
    if (isOwner(t, false, groupMeta)) continue;
    if (isAdmin(groupMeta?.participants, t) && !senderIsOwner) {
      skipped.push({ jid: t, reason: 'es admin' });
      continue;
    }
    targets.push(t);
  }

  if (!targets.length) {
    // Si lo único que había era gente del tier owner, silencio total: contestar
    // cualquier cosa ya confirmaría que ese @ es especial.
    if (!skipped.length) return;
    const reasons = skipped.map(s => `@${s.jid.split('@')[0]} (${s.reason})`).join(', ');
    return sock.sendMessage(jid, {
      text: `No pude expulsar a nadie:\n${reasons}`,
      mentions: skipped.map(s => s.jid),
    }, { quoted: msg });
  }

  // Sin admin del bot no hay kick: no se suelta el aviso en público para
  // quedarse a medias.
  if (!isBotAdmin(sock, groupMeta)) {
    return sock.sendMessage(jid, { text: 'No soy admin aquí. Denme galones o dejen de pedirme cosas.' }, { quoted: msg });
  }

  try {
    // Una sola llamada para todos, y el contrato unico decide quien salio.
    // Aqui la fila se buscaba comparando digitos y, si no aparecia, se asumia
    // el 200 — o sea que en un grupo LID (se pide por telefono, contesta por
    // @lid) el bot anunciaba la lista entera como expulsada sin haber echado a
    // nadie.
    const payload = avisoDeKick(targets);
    await sock.sendMessage(jid, payload);
    await esperaKick(AVISO_ANTES_KICK_MS);

    const r = await aplicarParticipantes(sock, jid, targets, 'remove', groupMeta);
    const hechos   = r.ok;
    const fallidos = r.fallidos.map(f => f.jid);

    // Si salieron todos y no hay salteados, el aviso ya dijo lo que había que decir.
    if (hechos.length === targets.length && !skipped.length) return;

    let text;
    if (!hechos.length) {
      text = `No se pudo expulsar a nadie: WhatsApp rechazó la operación (${r.error || r.fallidos[0]?.status || 'sin respuesta'}).`;
    } else if (fallidos.length) {
      text = `No se pudo expulsar a: ${fallidos.map(t => `@${t.split('@')[0]}`).join(', ')}`;
    } else {
      text = '';
    }
    if (skipped.length) {
      const skipTags = skipped.map(s => `@${s.jid.split('@')[0]} (${s.reason})`).join(', ');
      text = (text ? `${text}\n` : '') + `Salteados: ${skipTags}`;
    }
    if (!text) return;
    await sock.sendMessage(jid, {
      text,
      mentions: [...fallidos, ...skipped.map(s => s.jid)],
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
    return sock.sendMessage(jid, { text: aviso(SOLO_ADMINS, jid, 'admins') }, { quoted: msg });
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
    // SILENCIO. Decir "no puedes borrar mensajes del owner" señalaba con el
    // dedo a quien acababan de citar: cualquiera podía averiguar quién es el
    // dueño probando !del sobre los mensajes de medio grupo. Sin respuesta
    // parece que el comando no llegó, que es indistinguible de un fallo normal.
    return;
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
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SOLO_ADMINS, jid, 'admins') }, { quoted: msg });
  }

  const target = getTarget(msg);
  if (!target) {
    return sock.sendMessage(jid, { text: 'Menciona o responde al usuario que quieres mutear.' }, { quoted: msg });
  }
  if (sameUser(target, sender)) {
    return sock.sendMessage(jid, { text: aviso(A_TI_MISMO, jid, 'yo') }, { quoted: msg });
  }
  // Owner tier is immune; and (mirroring !kick) only the owner may act on admins.
  // SILENCIO, por lo mismo que en !del: contestar aquí delata al objetivo.
  if (isOwner(target, false, groupMeta)) return;
  if (isAdmin(groupMeta?.participants, target) && !isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(CONTRA_UN_ADMIN, jid, 'admin') }, { quoted: msg });
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
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SOLO_ADMINS, jid, 'admins') }, { quoted: msg });
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
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }
  const sender = getSender(msg);

  if (isAntiAdminEnabled(jid)) {
    if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
      return sock.sendMessage(jid, { text: 'El anti-admin está puesto. Los ascensos no se reparten desde ahí, y menos por ti.' }, { quoted: msg });
    }
  } else if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SOLO_ADMINS, jid, 'admins') }, { quoted: msg });
  }

  const target = getTarget(msg);
  if (!target) {
    return sock.sendMessage(jid, { text: 'Menciona o responde al usuario que quieres ascender.' }, { quoted: msg });
  }
  if (isAdmin(groupMeta?.participants, target)) {
    return sock.sendMessage(jid, { text: 'Ya es admin. Ascenderlo otra vez no lo hace más listo.' }, { quoted: msg });
  }

  try {
    // Se comprueba el resultado. Antes se lanzaba la llamada y se anunciaba el
    // ascenso pasara lo que pasara: WhatsApp puede rechazarlo sin excepcion.
    const hecho = await aplicarAUno(sock, jid, target, 'promote', groupMeta);
    const num = target.split('@')[0];
    await sock.sendMessage(jid, {
      text: hecho ? `@${num} ahora es admin.` : `No pude ascender a @${num}.`,
      mentions: [target],
    }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(jid, { text: `No pude ascender al usuario: ${err.message}` }, { quoted: msg });
  }
}

// !demote @user — remove admin rights (owner only)
async function cmdDemote(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SIN_PERMISO, jid, 'permiso') }, { quoted: msg });
  }

  const target = getTarget(msg);
  if (!target) {
    return sock.sendMessage(jid, { text: 'Menciona o responde al admin que quieres degradar.' }, { quoted: msg });
  }
  // Demoting the bot would strip the admin it needs to moderate — refuse.
  if (isBotJid(sock, target)) {
    return sock.sendMessage(jid, { text: 'A mí mismo no. Alguien tiene que hacer el trabajo sucio.' }, { quoted: msg });
  }
  // Owner tier is immune: a co-owner must not be able to strip the main owner
  // (or another co-owner), matching the protection kick and mute already enforce.
  // SILENCIO. Este era el peor de todos: bastaba un !demote a alguien para que
  // el bot anunciara su rango delante del grupo entero.
  if (isOwner(target, false, groupMeta)) return;
  if (!isAdmin(groupMeta?.participants, target)) {
    return sock.sendMessage(jid, { text: 'Ese no es admin. No le puedes quitar algo que no tiene.' }, { quoted: msg });
  }

  try {
    const hecho = await aplicarAUno(sock, jid, target, 'demote', groupMeta);
    const num = target.split('@')[0];
    await sock.sendMessage(jid, {
      text: hecho ? `@${num} degradado a miembro.` : `No pude degradar a @${num}.`,
      mentions: [target],
    }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(jid, { text: `No pude degradar al usuario: ${err.message}` }, { quoted: msg });
  }
}

// !notifadmin on/off — toggle admin change notifications for this group (admin only)
async function cmdNotifAdmin(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SOLO_ADMINS, jid, 'admins') }, { quoted: msg });
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
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SIN_PERMISO, jid, 'permiso') }, { quoted: msg });
  }

  const arg = (args[0] || '').toLowerCase();
  if (arg !== 'on' && arg !== 'off') {
    const current = isAntiAdminEnabled(jid) ? 'activado' : 'desactivado';
    return sock.sendMessage(jid, { text: `Anti-admin: *${current}*.` }, { quoted: msg });
  }

  const enable = arg === 'on';
  await toggleAntiAdmin(jid, enable);
  // Se dice QUÉ hace, no solo que está encendido. Desde que meter gente a dedo
  // cuesta el admin y la lista negra, un "activado" a secas se queda corto para
  // una sanción que no tiene vuelta atrás desde el grupo.
  await sock.sendMessage(jid, {
    text: enable
      ? 'Anti-admin *activado*.\n\n' +
        '· Los ascensos y degradaciones que no vengan del bot se revierten.\n' +
        '· Quien meta gente a dedo pierde el admin. NO se le banea ni se le echa.\n' +
        '· Al que metió a dedo sí: fuera y a la lista negra.\n' +
        '· Aprobar solicitudes y las entradas por enlace NO se castigan.'
      : 'Anti-admin *desactivado*.',
  }, { quoted: msg });
}

// !antiempresa on/off/scan/purge — owner only.
//   scan  = DRY-RUN: lista quién es Business y con qué evidencia, NO expulsa.
//   purge = expulsa a los Business detectados.
//   on/off = expulsión automática al entrar.
async function cmdAntiBusiness(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SIN_PERMISO, jid, 'permiso') }, { quoted: msg });
  }

  const arg = (args[0] || '').toLowerCase();

  if (arg === 'scan')  return scanBusinesses(sock, msg, jid, groupMeta);  // dry-run + guarda la lista
  if (arg === 'purge') return purgeBusinesses(sock, msg, jid, groupMeta); // expulsa la lista verificada

  if (arg !== 'on' && arg !== 'off') {
    // EL ESTADO CON SUS DOS MITADES. Decia solo "(auto al entrar)", que es
    // verdad a medias: tambien expulsa a quien YA estaba si escribe y WhatsApp
    // le adjunta el nombre verificado de negocio. Lo que NO hace es barrer a
    // los que ya estan callados, y eso es justo lo que nadie adivina.
    const current = isAntiBusinessEnabled(jid) ? 'activado' : 'desactivado';
    return sock.sendMessage(jid, {
      text: `Anti-empresa: *${current}*\n\n` +
        `_Actúa al entrar alguien, y también si ya estaba y escribe. A los que están callados no los toca: para esos, *!antiempresa scan* y luego *purge*._`,
    }, { quoted: msg });
  }

  const enable = arg === 'on';
  await toggleAntiBusiness(jid, enable);
  // Encender un modo que no puede expulsar deja al grupo creyendose cubierto.
  // No se cuenta el motivo tecnico en publico: se dice lo que hay que hacer.
  const sinAdmin = enable && !isBotAdmin(sock, groupMeta);
  if (sinAdmin) logger.warn(`antiempresa en ${jid}: activado pero NO soy admin`);
  await sock.sendMessage(jid, {
    text: enable
      ? `Anti-empresa *activado*.\n\n` +
        `_Actúa al entrar alguien, y también si ya estaba y escribe. A los que están callados no los toca: para esos, *!antiempresa scan* y luego *purge*._` +
        (sinAdmin ? `\n\n_Hazme admin para que pueda expulsar._` : '')
      : 'Anti-empresa *desactivado*.',
  }, { quoted: msg });
}

// Última lista detectada por scan, por grupo, para que purge expulse EXACTAMENTE
// lo que el owner verificó (y no un re-escaneo que podría diferir por un fallo de
// red puntual). Vive en memoria; el scan la llena, el purge la consume.
const lastScan = new Map(); // groupJid -> { ts, detected: [{ kickId, fields }] }

async function detectBusinesses(sock, idToPhone) {
  const entries = Array.from(idToPhone.entries()); // [kickId, phoneJid]
  const detected = [];      // { kickId, fields }
  const sinComprobar = [];  // { kickId, motivo } — ni biz ni personal: no se supo
  const CONC = 6;
  for (let i = 0; i < entries.length; i += CONC) {
    const chunk = entries.slice(i, i + CONC);
    const results = await Promise.all(chunk.map(async ([kickId, phoneJid]) => {
      // Sin teléfono no se puede consultar el perfil (getBusinessProfile no
      // acepta LIDs), pero el hecho observado sí vale, así que estos NO se
      // descartan: se saltan la consulta y se juzgan solo por lo que ya consta.
      // El hecho observado va PRIMERO: es gratis, esta en disco y vale en LID.
      // Antes se consultaba el perfil y solo se miraban los hechos si salia que
      // no, o sea gastando una consulta de red para nada en el caso mas comun.
      const facts0 = await getMemberFacts([kickId, phoneJid]).catch(() => null);
      if (facts0?.biz) return { kickId, ev: { estado: 'biz', fields: ['nombre verificado de negocio'] } };

      const ev = phoneJid
        ? await businessEvidence(sock, phoneJid).catch(() => ({ estado: 'desconocido', fields: [] }))
        : { estado: 'desconocido', fields: [], motivo: 'sin teléfono' };
      if (ev.estado === 'biz') return { kickId, ev };
      // WhatsApp adjunta un verified_name a los mensajes de las cuentas
      // Business (Baileys lo expone como msg.verifiedBizName). Si se le ha
      // visto uno, es Business aunque su perfil venga vacío en la consulta.
      return { kickId, ev };
    }));
    for (const { kickId, ev } of results) {
      if (ev.estado === 'biz') detected.push({ kickId, fields: ev.fields });
      // Los que no se pudieron comprobar se listan aparte. Antes se contaban
      // como personales y desaparecian del informe: quien lo leia creia que
      // estaban revisados.
      else if (ev.estado === 'desconocido') sinComprobar.push({ kickId, motivo: ev.motivo || 'no se pudo comprobar' });
    }
  }
  return { detected, sinComprobar };
}

// scan = DRY-RUN: detecta y lista con evidencia, NO expulsa. Guarda la lista para
// que un purge posterior expulse exactamente esto.
async function scanBusinesses(sock, msg, groupJid, groupMeta) {
  if (!groupMeta?.participants?.length) {
    return sock.sendMessage(groupJid, { text: 'No pude obtener los miembros del grupo.' }, { quoted: msg });
  }
  // Se escanea a TODOS, con teléfono o sin él getBusinessProfile no acepta
  // LIDs, así que a los que solo tienen LID no se les puede consultar el
  // perfil — pero si WhatsApp ya adjuntó un nombre verificado de negocio a
  // alguno de sus mensajes, eso basta y no cuesta ninguna consulta. Antes se
  // les filtraba ANTES de mirar ese dato, así que un Business escondido tras
  // la privacidad de número no se detectaba jamás.
  const miembros = scannableMembers(sock, groupMeta);
  const idToPhone = new Map(miembros.map(m => [m.kickId, m.phoneJid || null]));
  const sinTelefono = miembros.filter(m => !m.phoneJid).length;
  if (!idToPhone.size) {
    return sock.sendMessage(groupJid, { text: 'No hay miembros que escanear.' }, { quoted: msg });
  }

  await sock.sendMessage(groupJid, {
    text: `Escaneo de *${idToPhone.size}* miembros...` +
      (sinTelefono ? `\n_${sinTelefono} tienen el número oculto: a esos solo se les mira lo ya observado._` : ''),
  }, { quoted: msg });

  const { detected, sinComprobar } = await detectBusinesses(sock, idToPhone);
  lastScan.set(groupJid, { ts: Date.now(), detected });

  // LOS QUE NO SE PUDIERON COMPROBAR SE DICEN. Antes contaban como personales y
  // desaparecian del informe, asi que quien lo leia daba por revisado a alguien
  // que nadie habia mirado. Un escaneo que no distingue "limpio" de "no lo se"
  // da una confianza que no ha ganado.
  const pieDudas = sinComprobar.length
    ? `\n\n_${sinComprobar.length} sin comprobar (número oculto o la consulta no respondió). No son limpios: son desconocidos._`
    : '';

  if (!detected.length) {
    return sock.sendMessage(groupJid, {
      text: 'No se detectaron cuentas Business entre los miembros.' + pieDudas,
    });
  }

  const lines = detected.map(d => `@${d.kickId.split('@')[0]} — ${d.fields.join(', ')}`);
  return sock.sendMessage(groupJid, {
    text:
      `*Business detectados (${detected.length})* — con su evidencia:\n\n` +
      lines.join('\n') + pieDudas +
      // EL SCAN DICE CUAL ES EL PASO SIGUIENTE. Decia "esto no expulsa a nadie"
      // y se quedaba ahi, sin nombrar *!antiempresa purge*, que es lo unico que
      // hace algo con esta lista. Habia que acordarse de un comando que el bot
      // no menciona en ningun sitio, y la lista caduca a los 10 min.
      `\n\n_Esto no expulsa a nadie. Para echarlos: *!antiempresa purge* ` +
      `(sobre esta misma lista, dentro de ${Math.round(SCAN_VALID_MS / 60000)} min)._`,
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
      text: 'No hay ningún scan reciente.',
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

  // EL PURGE TAMBIEN VETA. Era la tercera puerta del mismo modo y la unica que
  // seguia siendo giratoria: la guarda de mensajes vetaba, el join tambien, y
  // el purge —que es el barrido masivo, el que mas cuentas echa de golpe— solo
  // expulsaba. Con el enlace del grupo, todas volvian a entrar.
  //
  // Va sobre los que SALIERON de verdad (r.done), no sobre la lista pedida: no
  // se veta a quien el servidor no llego a echar.
  for (const d of (r.done || [])) {
    await banAccount(allForms(d.kickId, groupMeta), `cuenta business (purga en ${groupJid})`, 'auto').catch(() => {});
    await recordFacts(d.kickId, { biz: true }).catch(() => {});
  }

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
        ? 'No queda nadie a quien expulsar: los detectados ya no se pueden tocar.'
        : 'Los Business detectados ya no están en el grupo.',
    }, { quoted: msg });
  }

  return sock.sendMessage(groupJid, purgeReport('Anti-empresa', r));
}

// !add <numero> — add a user by phone number (owner only)
// Extrae un número de teléfono de lo que sea que haya escrito el owner.
//
// Esta función es el motivo por el que *!add* fallaba tanto. La versión anterior
// hacía `args[0].replace(/[^\d]/g,'')`, o sea: miraba SOLO la primera palabra.
// Con eso, de las cinco formas normales de escribir un número, tres se caían:
//
//   !add +34600112233        -> funcionaba
//   !add wa.me/34600112233   -> funcionaba
//   !add +34 600 11 22 33    -> leía "+34" y contestaba "!add <número>"
//   !add 34 600 112 233      -> igual
//   !add (34) 600-112-233    -> igual
//
// Y un número copiado de la agenda o de un contacto SIEMPRE lleva espacios. Por
// eso "no funciona muchas veces": el bot ni llegaba a intentarlo.
function numeroDeArgs(args) {
  const todo = (args || []).join(' ');
  // Un enlace wa.me / api.whatsapp.com trae el número en un parámetro o al final.
  const enlace = todo.match(/(?:wa\.me\/|phone=)(\d{6,15})/i);
  const digitos = enlace ? enlace[1] : todo.replace(/\D/g, '');
  // Un JID pegado entero ("34600112233@s.whatsapp.net") deja basura detrás al
  // quitar lo que no son dígitos; se corta a un largo de teléfono plausible.
  if (digitos.length > 15) return digitos.slice(0, 15);
  return digitos;
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
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SIN_PERMISO, jid, 'permiso') }, { quoted: msg });
  }

  const arg = (args[0] || '').toLowerCase();
  if (arg !== 'on' && arg !== 'off') {
    // *!antilink* CONTESTA LO DE SIEMPRE, EN EL GRUPO.
    //
    // Hubo una version que respondia con una tabla de diagnostico —si soy
    // admin, cuantos quedan exentos, si esta actuando de verdad—. Util para
    // depurar y mala idea en las dos direcciones: en el grupo es un mapa para
    // saltarse el guardia, y en el privado del owner es una notificacion mas
    // que nadie pidio.
    //
    // El estado va al log en cada arranque y con cada cambio, que es donde se
    // mira cuando hace falta. Aqui, encendido o apagado y ya.
    const encendido = isAntiLinkEnabled(jid);
    if (!encendido || !isBotAdmin(sock, groupMeta)) {
      logger.warn(`antilink en ${jid}: activado=${encendido} · soy admin=${isBotAdmin(sock, groupMeta)}`);
    }
    return sock.sendMessage(jid, {
      text: `Anti-link: *${encendido ? 'activado' : 'desactivado'}*.`,
    }, { quoted: msg });
  }

  const enable = arg === 'on';
  await toggleAntiLink(jid, enable);
  await sock.sendMessage(jid, {
    text: enable
      // EL TEXTO DICE LO QUE HACE EL CODIGO, y antes no. Prometia "con *!allow*
      // se publica sin problema" cuando el permiso solo valia para YouTube e
      // Instagram: un admin te lo daba, pegabas un Drive y te expulsaba igual.
      // Y sigue habiendo algo que el permiso NO salva —las invitaciones— asi
      // que eso tambien se dice, que es justo lo que nadie adivina.
      ? `Anti-link *activado*.\n\n` +
        `· Invitaciones a otros grupos o canales: expulsión directa. *No las salva ni el !allow*.\n` +
        `· Cualquier otro enlace: expulsión, salvo que tengas *!allow* o el *pase*.\n` +
        `· YouTube e Instagram: se borran y avisan ${MAX_AVISOS - 1} veces; al ${MAX_AVISOS === 3 ? 'tercero' : `aviso ${MAX_AVISOS}`}, ban.\n\n` +
        `_Los admins quedan exentos de todo._`
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
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SOLO_ADMINS, jid, 'admins') }, { quoted: msg });
  }

  const quitar = (args[0] || '').toLowerCase() === 'off';
  const target = getTarget(msg);

  if (!target) {
    // Solo los que siguen dentro. listAllowed ya descarta los caducados, asi
    // que esta lista son los que pueden publicar AHORA MISMO.
    const lista = (await listAllowed(jid)).filter(j => esMiembroActual(groupMeta, j));
    if (!lista.length) {
      return sock.sendMessage(jid, {
        text: `Ahora mismo nadie puede publicar enlaces.\n\n*!allow* @user — se lo das ${DURACION_MS / 3600000} h\n*!allow off* @user — se lo quitas antes`,
      }, { quoted: msg });
    }
    return sock.sendMessage(jid, {
      text: `*Pueden publicar enlaces ahora (${lista.length}):*\n` + lista.map(j => `@${j.split('@')[0]}`).join(' '),
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
    // SE DICE QUE CADUCA. Antes el permiso era eterno y el mensaje no prometia
    // nada al respecto; ahora que dura dos horas, callarselo seria dejar que el
    // admin creyera que sigue dado y que el otro se comiera un aviso.
    text: `@${num} puede publicar enlaces durante *${DURACION_MS / 3600000} h*. Luego vuelve a estar como todos.`,
    mentions: [target],
  }, { quoted: msg });
}

// !close — set the group to admin-only messages (announcement mode)
async function cmdClose(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SOLO_ADMINS, jid, 'admins') }, { quoted: msg });
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
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SOLO_ADMINS, jid, 'admins') }, { quoted: msg });
  }
  try {
    await sock.groupSettingUpdate(jid, 'not_announcement');
    await sock.sendMessage(jid, { text: 'Grupo *abierto*. Todos pueden escribir.' }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(jid, { text: `No pude abrir el grupo: ${err.message}` }, { quoted: msg });
  }
}

// !adminmode on/off — con esto encendido el bot solo obedece a admins y al
// owner tier. A los miembros normales no les contesta NADA: ni el comando ni
// un aviso de que no pueden. La alternativa (responder "no puedes" a cada
// intento) convierte el modo en una fuente de spam en el propio chat.
async function cmdSoloAdmins(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SIN_PERMISO, jid, 'permiso') }, { quoted: msg });
  }

  const arg = (args[0] || '').toLowerCase();
  if (arg !== 'on' && arg !== 'off') {
    const current = isSoloAdminsEnabled(jid) ? 'activado' : 'desactivado';
    return sock.sendMessage(jid, {
      text: `Modo admin: *${current}*.\n\nUsa *!adminmode on* o *!adminmode off*.`,
    }, { quoted: msg });
  }

  const enable = arg === 'on';
  await toggleSoloAdmins(jid, enable);
  await sock.sendMessage(jid, {
    text: enable
      ? 'Modo admin *activado*. El bot deja de responder a los miembros; solo admins.'
      : 'Modo admin *desactivado*. El bot vuelve a responder a todo el grupo.',
  }, { quoted: msg });
}

// !r — pide a los NUEVOS que se presenten, con un ping invisible.
//
// Mismo truco que !tagall: los JID van en `mentions` pero NINGUNO aparece
// escrito. WhatsApp notifica igual a todo el mundo y en pantalla se lee un
// aviso limpio, sin doscientos numeros en medio que nadie va a leer.
//
// LA ORDEN ES SOLO PARA LOS QUE ACABAN DE ENTRAR. Se pinea a todos para que
// lo vean; el resto del grupo no tiene que presentarse. Pedírselo a los que
// ya están es ruido, y el aviso que no distingue a quién va no lo lee nadie.
//
// SALE EN TODOS LOS GRUPOS, se escriba donde se escriba. Es una ronda: se
// pide una vez y tiene que llegar a todas partes.
//
// Los remates van detras de "El/La que no se presente," y rotan: este comando
// se usa cada vez que entra gente y una frase fija se quema a la tercera.
//
// Ninguno amenaza con echar a nadie: el bot no lo va a hacer, y una amenaza que
// no se cumple la segunda vez ya no la lee nadie. Lo que si se cumple solo es
// lo otro — aqui, al nuevo que no da la cara se lo comen igual.
const REMATES = [
  'Se presentó igual, y como cobarde.',
  'Cobarde y ausente. Las dos cosas.',
  'Queda de fantasma, que es lo que ya sospechábamos.',
  'Tiene un motivo, y se le nota en la puta cara.',
  'No da la cara porque no la tiene.',
  'Se lo inventa el grupo, y duele más.',
  'Es un número y nada más.',
  'Callarse también es contestar.',
  'El grupo ya sabe por qué.',
  'El silencio ya lo dijo todo.',
];

// EL AVISO VA POR PARTES, Y NO SOLO PARA QUE SE LEA MEJOR.
//
// Era una sola frase: "Solo los nuevos. Foto y edad. El/La que no se presente,
// <remate>". Eso obliga a que TODO remate concuerde con "El/La", y varios no lo
// hacian: "lo damos por feo" (masculino y con un "lo" sin antecedente),
// "callado se delata solo" (masculino), "el fantasma de mierda" (masculino).
// A una tia le llegaban en masculino una de cada tres veces.
//
// Partiendolo, el remate pasa a ser su propia frase y deja de tener que
// concordar con nadie. El arreglo de estilo y el de gramatica son el mismo.
function textoPresentacion(clave) {
  return '*PRESENTACIÓN OBLIGATORIA*\n' +
    '╾━━━━━━━━━━━━━━╼\n\n' +
    '*Quién:* solo los nuevos.\n' +
    '*Qué:* foto y edad.\n' +
    `*Si no:* ${pickFresh(REMATES, `${clave}|presentacion`)}`;
}

async function cmdPresentarse(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);
  const enGrupo = jid.endsWith('@g.us');

  // En un grupo, admins. En privado, groupMeta no existe y isGroupAdmin se
  // queda solo con isOwner, que es exactamente la puerta que hace falta ahi.
  if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    if (enGrupo) return sock.sendMessage(jid, { text: aviso(SOLO_ADMINS, jid, 'admins') }, { quoted: msg });
    return;   // en privado, silencio
  }

  // SALE EN TODOS LOS GRUPOS, se escriba donde se escriba.
  //
  // La primera version solo lo soltaba en el grupo donde se escribia, y desde
  // el privado en todos. Es una ronda de presentaciones: se pide una vez y
  // tiene que llegar a todas partes, no repetir el comando grupo por grupo.
  //
  // La frase se sortea POR GRUPO. Con el mismo texto en todos a la vez, el
  // primero que compare dos grupos ve que detras hay un boton.
  const soltar = async (grupo, participantes) => {
    const mentions = (participantes || []).map((p) => p.id).filter(Boolean);
    if (!mentions.length) return false;
    await sock.sendMessage(grupo, { text: textoPresentacion(grupo), mentions });
    return true;
  };

  let grupos = {};
  try { grupos = await sock.groupFetchAllParticipating(); }
  catch (e) {
    // Sin la lista, al menos el grupo desde el que se pidio. Quedarse sin hacer
    // nada por un fallo de red seria peor que hacer la mitad.
    if (enGrupo && groupMeta?.participants?.length) {
      await soltar(jid, groupMeta.participants);
      return sock.sendMessage(jid, { text: `_No pude listar los demás grupos (${e.message}), así que solo ha salido aquí._` }, { quoted: msg });
    }
    return sock.sendMessage(jid, { text: `No pude listar los grupos: ${e.message}` }, { quoted: msg });
  }

  const enviados = [], fallidos = [];
  for (const [gJid, meta] of Object.entries(grupos || {})) {
    try {
      if (await soltar(gJid, meta?.participants)) enviados.push(meta?.subject || gJid);
      else fallidos.push(meta?.subject || gJid);
    } catch { fallidos.push(meta?.subject || gJid); }
  }

  if (!enviados.length) {
    return sock.sendMessage(jid, { text: 'No pude mandarlo a ningún grupo.' }, { quoted: msg });
  }

  // Desde un grupo, el aviso ya se ve ahi: basta una linea diciendo que tambien
  // fue a los demas. La lista entera solo tiene sentido en el privado.
  if (enGrupo) {
    const otros = enviados.length - 1;
    if (otros <= 0) return;
    return sock.sendMessage(jid, {
      text: `_También pedida a los nuevos en ${otros} grupo(s) más._`,
    }, { quoted: msg });
  }

  return sock.sendMessage(jid, {
    text: `Pedida la presentación de los nuevos en *${enviados.length}* grupo(s):\n` +
      enviados.map((g) => `· ${g}`).join('\n') +
      (fallidos.length ? `\n\n_Sin poder mandarlo: ${fallidos.join(', ')}_` : ''),
  }, { quoted: msg });
}

module.exports = {
  cmdPresentarse,
  cmdSoloAdmins, cmdTodos, cmdKick, avisoDeKick, cmdDel, cmdMute, cmdUnmute, cmdPromote, cmdDemote, cmdNotifAdmin, cmdAntiAdmin, cmdAntiBusiness, isMuted, muteUser, unmuteUser, cmdAntiLink, cmdAllow, cmdClose, cmdOpen, cmdAdm };
