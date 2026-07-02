const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const {
  getSender, isOwner, isGroupAdmin, canonicalJid, bareJid,
} = require('../utils/wa');
const { streamToBuffer, MAX_DOWNLOAD_BYTES } = require('../utils/helpers');
const { resolveTarget } = require('./pfp');
const { computeHash } = require('../utils/phash');
const { recordAndMatch, matchOnly, markFake } = require('../utils/pfpStore');
const { banAccount, unbanAccount, isBanned, banCount } = require('../utils/banlist');
const { isBusiness } = require('../utils/businessCheck');
const { isAntiFakeEnabled, toggleAntiFake } = require('../utils/state');
const { faceSearch, hasKey: lensoEnabled } = require('../utils/lenso');
const logger = require('../utils/logger');

const DAY = 86400000;

// ─── helpers compartidos ─────────────────────────────────────────────────────

function shortAcc(acc) {
  const id = String(acc).split('@')[0];
  return (String(acc).endsWith('@lid') ? '@' : '+') + id;
}

// Todas las formas conocidas de una cuenta (id, LID, teléfono) según el meta
// del grupo. Necesario para banear/consultar de forma robusta: la misma persona
// puede aparecer con cualquiera de las tres según el grupo y su privacidad.
function allForms(target, groupMeta) {
  const bare = bareJid(target);
  const forms = new Set([bare, canonicalJid(target)]);
  for (const p of (groupMeta?.participants || [])) {
    if (!p) continue;
    if ([p.id, p.lid, p.phoneNumber].some(f => f && bareJid(f) === bare)) {
      [p.id, p.lid, p.phoneNumber].forEach(f => f && forms.add(bareJid(f)));
      break;
    }
  }
  return [...forms];
}

// Descarga la foto de perfil. Devuelve { url, buf } o null (sin foto/oculta).
async function fetchPfp(sock, target) {
  let url;
  try { url = await sock.profilePictureUrl(target, 'image'); }
  catch { return null; }
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer', timeout: 10000,
      maxContentLength: 20 * 1024 * 1024, maxBodyLength: 20 * 1024 * 1024,
    });
    return { url, buf: Buffer.from(res.data) };
  } catch { return null; }
}

// Detecta una imagen/sticker en el mensaje o en el mensaje citado. Devuelve
// { mediaMsg, type, author } o null. `author` es el JID de quien envió la foto
// citada (para mencionarlo), si lo hay.
function findImage(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;
  const pick = (m) => {
    if (!m) return null;
    if (m.imageMessage) return { mediaMsg: m.imageMessage, type: 'image' };
    if (m.stickerMessage) return { mediaMsg: m.stickerMessage, type: 'sticker' };
    if (m.documentMessage?.mimetype?.startsWith('image/')) return { mediaMsg: m.documentMessage, type: 'image' };
    const inner = m.viewOnceMessage?.message || m.viewOnceMessageV2?.message || m.viewOnceMessageV2Extension?.message;
    return inner ? pick(inner) : null;
  };
  // Adjunta en el propio mensaje (foto con caption !fk) tiene prioridad; si no,
  // la foto citada al responder.
  const own = pick(msg.message);
  if (own) return { ...own, author: null };
  const q = pick(quoted);
  if (q) return { ...q, author: ctx?.participant || ctx?.mentionedJid?.[0] || null };
  return null;
}

async function downloadImage(found) {
  try {
    const stream = await downloadContentFromMessage(found.mediaMsg, found.type === 'sticker' ? 'sticker' : 'image');
    const buf = await streamToBuffer(stream, MAX_DOWNLOAD_BYTES);
    return buf && buf.length > 100 ? buf : null;
  } catch { return null; }
}

// Enlaces de búsqueda inversa. Lenso es la prioridad (mejor para caras). Su web
// no tiene deep-link por URL → se sube la foto adjunta arriba; si hay key de API
// (config.lensoApiKey) la búsqueda ya va hecha automáticamente en el mensaje.
// Google Lens y TinEye sí aceptan ?url= (1 toque). Yandex y Bing se quitaron.
function reverseLinks(imgUrl) {
  // Lenso y FaceCheck siempre (subiendo la foto adjunta). Los de "1 toque" solo
  // si hay URL pública de la imagen (la foto de perfil la tiene; una imagen
  // citada, no, porque es media cifrada sin URL pública).
  let out =
    `🔎 *Búsqueda inversa:*\n` +
    `• *Lenso* (facial, recomendado): https://lenso.ai\n` +
    `• FaceCheck (facial): https://facecheck.id\n` +
    `_↑ sube la foto adjunta de arriba_`;
  if (imgUrl) {
    const u = encodeURIComponent(imgUrl);
    out +=
      `\n• Google Lens (1 toque): https://lens.google.com/uploadbyurl?url=${u}\n` +
      `• TinEye (1 toque): https://tineye.com/search?url=${u}`;
  }
  return out;
}

// Formatea las coincidencias que devuelve la API de Lenso para meterlas en el
// mensaje. Devuelve '' si no hay key o no hubo resultados aprovechables.
function formatLenso(result) {
  if (!result) return '';
  if (!result.ok) {
    if (result.reason === 'bad-key') return `\n\n🧑 *Lenso:* key inválida (revisa LENSO_API_KEY).`;
    if (result.reason === 'error')   return `\n\n🧑 *Lenso:* la búsqueda falló (red/límite).`;
    return '';
  }
  if (!result.matches.length) return `\n\n🧑 *Lenso (auto):* sin coincidencias faciales en la web.`;
  const lines = result.matches.map(m => {
    const sc = m.score != null ? ` (${m.score}%)` : '';
    const ttl = m.title ? `${m.title} — ` : '';
    return `• ${ttl}${m.sourceUrl}${sc}`;
  });
  return `\n\n🧑 *Lenso (auto) — ${result.matches.length} coincidencia(s):*\n${lines.join('\n')}`;
}

// Info de perfil vía USync: { status, setAt } o null si la consulta falla.
// setAt es ORO como proxy de antigüedad: WhatsApp no expone la fecha de
// creación de la cuenta, pero un "info" escrito hace 3 años PRUEBA que la
// cuenta ya existía hace 3 años. Uno de hace 2 días (o nunca escrito) no
// prueba nada por sí solo, pero suma al puntaje.
async function fetchAbout(sock, target) {
  try {
    const list = await sock.fetchStatus(target);
    const entry = Array.isArray(list) ? list[0] : list;
    const st = entry?.status && typeof entry.status === 'object' ? entry.status : entry;
    if (!st) return null;
    const setAt = st.setAt instanceof Date ? st.setAt.getTime() : (st.setAt ? +st.setAt : 0);
    return { status: st.status ?? null, setAt: Number.isFinite(setAt) ? setAt : 0 };
  } catch { return null; }
}

// ─── !fk — análisis anti-fake con puntaje de riesgo ──────────────────────────

// !fk sobre una imagen suelta (adjunta o citada). No hay cuenta que puntuar:
// se compara la foto contra el historial (¿marcada fake? ¿la usa algún miembro?)
// y se lanza la búsqueda facial de Lenso + los enlaces manuales.
async function fkOnImage(sock, msg, img) {
  const jid = msg.key.remoteJid;
  const buf = await downloadImage(img);
  if (!buf) {
    return sock.sendMessage(jid, { text: 'No pude descargar esa imagen.' }, { quoted: msg });
  }

  const lensoPromise = lensoEnabled() ? faceSearch(buf).catch(() => null) : null;

  const lines = [];
  try {
    const hash = await computeHash(buf);
    const matches = await matchOnly(hash);
    const fake = matches.filter(m => m.fake);
    const others = [...new Set(matches.filter(m => !m.fake).map(m => shortAcc(m.account)))];
    if (fake.length) lines.push(`🚨 *Esta foto está marcada como FAKE* en el historial.`);
    if (others.length) lines.push(`👥 *Esta foto la usan/usaron:* ${others.join(', ')} → posible suplantación.`);
    if (!fake.length && !others.length) lines.push(`🖼 Sin coincidencias en el historial del bot.`);
  } catch {
    lines.push(`🖼 No pude calcular la huella de la imagen (ffmpeg).`);
  }

  const lensoText = lensoPromise ? formatLenso(await lensoPromise) : '';
  const header = `*ANÁLISIS DE IMAGEN (anti-fake)*\n\n`;
  const footer = `\n\n_Los resultados son indicios, no prueba._`;
  const mentions = img.author ? [img.author] : [];

  await sock.sendMessage(jid, {
    image: buf,
    caption: header + lines.join('\n') + '\n\n' + reverseLinks(null) + lensoText + footer,
    mentions,
  }, { quoted: msg });
}

async function cmdFk(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;

  // Modo foto: si el !fk va sobre una imagen (adjunta o citada), analiza ESA
  // imagen — huella contra el historial + búsqueda facial en Lenso + enlaces —
  // en vez de la foto de perfil de una cuenta.
  const img = findImage(msg);
  if (img) return fkOnImage(sock, msg, img);

  const { jid: target, error } = await resolveTarget(sock, msg, args);
  if (error) return sock.sendMessage(jid, { text: error }, { quoted: msg });

  const now = Date.now();
  const targetAcc = canonicalJid(target);
  const forms = allForms(target, groupMeta);
  const group = jid.endsWith('@g.us') ? jid : null;

  // Señales independientes en paralelo — cada una tolera su propio fallo.
  const [pfp, about, bannedAs, biz] = await Promise.all([
    fetchPfp(sock, target),
    fetchAbout(sock, target),
    isBanned(forms),
    (async () => {
      const phone = forms.find(f => f.endsWith('@s.whatsapp.net'));
      return phone ? isBusiness(sock, phone).catch(() => false) : false;
    })(),
  ]);

  // Búsqueda facial en Lenso en paralelo (solo si hay foto y key configurada).
  // Arranca ya para que su latencia de red se solape con el resto del análisis.
  const lensoPromise = (pfp && lensoEnabled()) ? faceSearch(pfp.buf).catch(() => null) : null;

  let score = 0;
  const lines = [];

  // Lista negra: veredicto casi directo.
  if (bannedAs) {
    score += 10;
    lines.push(`⛔ *EN LISTA NEGRA* (${shortAcc(bannedAs)}) — ya fue baneado en tus grupos.`);
  }

  // Huella de la foto contra el historial (multicuenta / reciclaje / fake).
  if (pfp) {
    try {
      const hash = await computeHash(pfp.buf);
      const matches = await recordAndMatch(group, targetAcc, hash, now);
      const presentSet = new Set(
        (groupMeta?.participants || []).flatMap(p =>
          [p?.id, p?.lid, p?.phoneNumber].filter(Boolean).map(canonicalJid)
        )
      );
      const fake = matches.filter(m => m.fake);
      const live = matches.filter(m => !m.fake && m.account !== targetAcc && presentSet.has(m.account));
      const past = matches.filter(m => !m.fake && m.account !== targetAcc && !presentSet.has(m.account));

      if (fake.length) {
        score += 8;
        lines.push(`🚨 *Foto marcada como FAKE* anteriormente.`);
      }
      if (live.length) {
        score += 5;
        const who = [...new Set(live.map(m => shortAcc(m.account)))].join(', ');
        lines.push(`⚠️ *Misma foto que un miembro presente:* ${who} → multicuenta/suplantación.`);
      }
      if (past.length) {
        score += 4;
        const who = [...new Set(past.map(m => shortAcc(m.account)))].join(', ');
        lines.push(`🕒 *Foto reciclada:* ya la usó ${who} (cuenta que ya no está) → identidad robada.`);
      }
      if (!fake.length && !live.length && !past.length) {
        lines.push(`🖼 Foto sin coincidencias en el historial del bot.`);
      }
    } catch {
      lines.push(`🖼 Foto presente (no pude calcular su huella).`);
    }
  } else {
    score += 2;
    lines.push(`🚫 *Sin foto de perfil visible* (o la oculta a desconocidos).`);
  }

  // Proxy de antigüedad vía el "info" del perfil.
  if (about) {
    const age = about.setAt ? now - about.setAt : 0;
    if (!about.setAt || about.setAt < DAY) {
      score += 1;
      lines.push(`📝 Info del perfil nunca escrito (por defecto).`);
    } else if (age < 30 * DAY) {
      score += 2;
      lines.push(`📝 Info del perfil escrito hace ${Math.max(1, Math.round(age / DAY))} días → cuenta posiblemente reciente.`);
    } else if (age > 365 * DAY) {
      score -= 2;
      
      lines.push(`📜 Info escrito hace ${Math.round(age / (365 * DAY) * 10) / 10} años → cuenta antigua verificable.`);
    }
    if (about.status === '') {
      lines.push(`🔏 Info oculto por privacidad.`);
    }
  }

  // Cuenta Business.
  if (biz) {
    score += 2;
    lines.push(`🏢 *Cuenta WhatsApp Business.*`);
  }

  // Número oculto (solo LID, sin mapeo a teléfono conocido).
  if (targetAcc.endsWith('@lid')) {
    score += 1;
    lines.push(`🔒 Número oculto (LID) — no expone teléfono ni país.`);
  }

  // Veredicto por umbrales.
  let verdict;
  if (score >= 8)      verdict = '🚨 *RIESGO ALTO — casi seguro fake/multicuenta.*';
  else if (score >= 4) verdict = '⚠️ *RIESGO MEDIO — verificar manualmente.*';
  else if (score >= 1) verdict = '🟡 *Riesgo bajo — señales menores.*';
  else                 verdict = '✅ *Sin señales de cuenta falsa.*';

  const num = target.split('@')[0];
  const tag = (target.endsWith('@s.whatsapp.net') ? '+' : '@') + num;
  const header = `*ANÁLISIS ANTI-FAKE* ${tag}\n*Puntaje: ${score}* → ${verdict}\n\n`;
  const body = lines.join('\n');
  const footer = `\n\n_Los resultados son indicios, no prueba._`;

  const lensoText = lensoPromise ? formatLenso(await lensoPromise) : '';

  if (pfp) {
    await sock.sendMessage(jid, {
      image: pfp.buf,
      caption: header + body + '\n\n' + reverseLinks(pfp.url) + lensoText + footer,
      mentions: [target],
    }, { quoted: msg });
  } else {
    await sock.sendMessage(jid, {
      text: header + body + footer,
      mentions: [target],
    }, { quoted: msg });
  }
}

// ─── !marcarfake — marca la foto actual del objetivo como fake ───────────────

async function cmdMarkFake(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);
  const allowed = isOwner(sender, msg.key.fromMe, groupMeta)
    || isGroupAdmin(sender, msg.key.fromMe, groupMeta);
  if (!allowed) {
    return sock.sendMessage(jid, { text: 'Solo admins pueden marcar fotos como fake.' }, { quoted: msg });
  }

  const { jid: target, error } = await resolveTarget(sock, msg, args);
  if (error) return sock.sendMessage(jid, { text: error }, { quoted: msg });

  const pfp = await fetchPfp(sock, target);
  if (!pfp) {
    return sock.sendMessage(jid, { text: 'No pude obtener la foto de ese usuario.' }, { quoted: msg });
  }

  try {
    const hash = await computeHash(pfp.buf);
    await recordAndMatch(jid.endsWith('@g.us') ? jid : null, canonicalJid(target), hash);
    const n = await markFake(hash);
    return sock.sendMessage(jid, {
      text: `✅ Foto marcada como fake (${n} registro${n === 1 ? '' : 's'}). Si reaparece con otra cuenta, saltará la alerta.`,
    }, { quoted: msg });
  } catch {
    return sock.sendMessage(jid, { text: 'No pude calcular la huella (ffmpeg).' }, { quoted: msg });
  }
}

// ─── !fkban / !fkunban — lista negra global (federada entre tus grupos) ──────

async function cmdFkBan(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);
  const allowed = isOwner(sender, msg.key.fromMe, groupMeta)
    || isGroupAdmin(sender, msg.key.fromMe, groupMeta);
  if (!allowed) {
    return sock.sendMessage(jid, { text: 'Solo admins pueden usar la lista negra.' }, { quoted: msg });
  }

  const { jid: target, error } = await resolveTarget(sock, msg, args);
  if (error) return sock.sendMessage(jid, { text: error }, { quoted: msg });

  const forms = allForms(target, groupMeta);
  await banAccount(forms, `fkban en ${jid}`, bareJid(sender));

  // Si está en este grupo, además lo expulsa (el guard evita que re-entre).
  let kicked = false;
  if (jid.endsWith('@g.us')) {
    const inGroup = (groupMeta?.participants || []).find(p =>
      p && [p.id, p.lid, p.phoneNumber].some(f => f && forms.includes(bareJid(f)))
    );
    if (inGroup) {
      try {
        await sock.groupParticipantsUpdate(jid, [inGroup.id], 'remove');
        kicked = true;
      } catch (e) {
        logger.warn(`fkban: kick falló en ${jid}: ${e.message}`);
      }
    }
  }

  const total = await banCount();
  return sock.sendMessage(jid, {
    text: `⛔ ${shortAcc(canonicalJid(target))} añadido a la lista negra global (${total} cuentas).` +
      (kicked ? ' Expulsado.' : '') +
      `\nCon *!antifake on* no podrá entrar a ningún grupo del bot.`,
    mentions: [target],
  }, { quoted: msg });
}

async function cmdFkUnban(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);
  const allowed = isOwner(sender, msg.key.fromMe, groupMeta)
    || isGroupAdmin(sender, msg.key.fromMe, groupMeta);
  if (!allowed) {
    return sock.sendMessage(jid, { text: 'Solo admins pueden usar la lista negra.' }, { quoted: msg });
  }

  const { jid: target, error } = await resolveTarget(sock, msg, args);
  if (error) return sock.sendMessage(jid, { text: error }, { quoted: msg });

  const n = await unbanAccount(allForms(target, groupMeta));
  return sock.sendMessage(jid, {
    text: n
      ? `✅ ${shortAcc(canonicalJid(target))} sacado de la lista negra.`
      : `No estaba en la lista negra.`,
    mentions: [target],
  }, { quoted: msg });
}

// ─── !antifake on/off — guard preventivo de entradas ─────────────────────────

async function cmdAntiFake(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo funciona en grupos.' }, { quoted: msg });
  }
  const sender = getSender(msg);
  const allowed = isOwner(sender, msg.key.fromMe, groupMeta)
    || isGroupAdmin(sender, msg.key.fromMe, groupMeta);
  if (!allowed) {
    return sock.sendMessage(jid, { text: 'Solo admins pueden configurar el anti-fake.' }, { quoted: msg });
  }

  const arg = (args[0] || '').toLowerCase();
  if (arg !== 'on' && arg !== 'off') {
    const cur = isAntiFakeEnabled(jid) ? 'ACTIVADO' : 'desactivado';
    return sock.sendMessage(jid, {
      text: `Anti-fake está *${cur}*. Usa *!antifake on* u *!antifake off*.\n\n` +
        `Con ON, al entrar alguien:\n` +
        `• Lista negra → expulsión automática\n` +
        `• Foto igual a la de otro miembro o marcada fake → alerta\n` +
        `• 5+ entradas en 1 min → cierra el grupo (anti-raid)`,
    }, { quoted: msg });
  }

  await toggleAntiFake(jid, arg === 'on');
  return sock.sendMessage(jid, {
    text: arg === 'on'
      ? '🛡 *Anti-fake ACTIVADO*: lista negra + huella de fotos + anti-raid en cada entrada.'
      : 'Anti-fake desactivado.',
  }, { quoted: msg });
}

// ─── Guard de entradas (llamado desde bot.js en group-participants add) ──────

// Ventana anti-raid: N entradas en T ms → cerrar el grupo y avisar.
const RAID_WINDOW_MS = 60000;
const RAID_THRESHOLD = 5;
const RAID_COOLDOWN_MS = 5 * 60000;
const joinTimes = new Map();   // groupJid -> [timestamps]
const raidNotified = new Map(); // groupJid -> last raid action ts

async function guardOnJoin(sock, groupJid, joiners, groupMeta) {
  if (!isAntiFakeEnabled(groupJid)) return;
  const now = Date.now();

  // 1) Anti-raid por ráfaga de entradas.
  const times = (joinTimes.get(groupJid) || []).filter(t => now - t < RAID_WINDOW_MS);
  for (let i = 0; i < joiners.length; i++) times.push(now);
  joinTimes.set(groupJid, times);
  if (times.length >= RAID_THRESHOLD && now - (raidNotified.get(groupJid) || 0) > RAID_COOLDOWN_MS) {
    raidNotified.set(groupJid, now);
    try {
      await sock.groupSettingUpdate(groupJid, 'announcement');
      await sock.sendMessage(groupJid, {
        text: `🚨 *ANTI-RAID:* ${times.length} entradas en menos de 1 minuto. Grupo cerrado (solo admins). Reabran con *!open* cuando pase.`,
      });
    } catch (e) {
      logger.warn(`anti-raid: no pude cerrar ${groupJid} (¿bot no es admin?): ${e.message}`);
    }
  }

  // 2) Por cada entrante: lista negra → kick; huella de foto → alerta.
  for (const p of joiners) {
    const obj = typeof p === 'string' ? { id: p } : (p || {});
    if (!obj.id) continue;
    const forms = [obj.id, obj.lid, obj.phoneNumber].filter(Boolean).map(bareJid);
    forms.push(canonicalJid(obj.id));

    const bannedAs = await isBanned(forms).catch(() => null);
    if (bannedAs) {
      try {
        await sock.groupParticipantsUpdate(groupJid, [obj.id], 'remove');
        await sock.sendMessage(groupJid, {
          text: `⛔ *Anti-fake:* @${String(obj.id).split('@')[0]} está en la lista negra (${shortAcc(bannedAs)}). Expulsado.`,
          mentions: [obj.id],
        });
      } catch (e) {
        logger.warn(`anti-fake: kick de baneado falló en ${groupJid}: ${e.message}`);
      }
      continue;
    }

    // Huella de la foto en segundo plano: no bloquea el resto de entradas.
    (async () => {
      const pfp = await fetchPfp(sock, obj.id);
      if (!pfp) return;
      const hash = await computeHash(pfp.buf);
      const acc = canonicalJid(obj.id);
      const matches = await recordAndMatch(groupJid, acc, hash, now);
      if (!matches.length) return;

      const presentSet = new Set(
        (groupMeta?.participants || []).flatMap(q =>
          [q?.id, q?.lid, q?.phoneNumber].filter(Boolean).map(canonicalJid)
        )
      );
      const fake = matches.some(m => m.fake);
      const dupes = [...new Set(
        matches.filter(m => m.account !== acc).map(m => shortAcc(m.account))
      )];
      if (!fake && !dupes.length) return;

      const numTag = `@${String(obj.id).split('@')[0]}`;
      const motivo = fake
        ? 'su foto está *marcada como FAKE*'
        : `su foto es la misma que la de ${dupes.join(', ')}${matches.some(m => presentSet.has(m.account)) ? ' (presente en el grupo)' : ''}`;
      await sock.sendMessage(groupJid, {
        text: `⚠️ *Anti-fake:* ${numTag} acaba de entrar y ${motivo}. Revisen con *!fk ${numTag}*.`,
        mentions: [obj.id],
      });
    })().catch(e => logger.warn(`anti-fake: chequeo de foto falló: ${e.message}`));
  }
}

module.exports = { cmdFk, cmdMarkFake, cmdFkBan, cmdFkUnban, cmdAntiFake, guardOnJoin };
