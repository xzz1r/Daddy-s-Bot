const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const {
  getSender, isOwner, isMainOwner, isGroupAdmin, canonicalJid, bareJid,
} = require('../utils/wa');
const { streamToBuffer, MAX_MEDIA_BYTES } = require('../utils/helpers');
const { resolveTarget } = require('./pfp');
const { computeHash } = require('../utils/phash');
const { recordAndMatch, matchOnly, markFake } = require('../utils/pfpStore');
const { banAccount, unbanAccount, isBanned, banCount } = require('../utils/banlist');
const { isBusiness } = require('../utils/businessCheck');
const { isAntiFakeEnabled, toggleAntiFake } = require('../utils/state');
const { faceSearch: lensoSearch, hasKey: lensoEnabled } = require('../utils/lenso');
const { faceSearch: facecheckSearch, hasKey: facecheckEnabled } = require('../utils/facecheck');
const { uploadTemp } = require('../utils/imageHost');
const { shorten } = require('../utils/shorten');
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
    const buf = await streamToBuffer(stream, MAX_MEDIA_BYTES);
    return buf && buf.length > 100 ? buf : null;
  } catch { return null; }
}

// Formatea los resultados de una API facial (Lenso/FaceCheck): cada línea es la
// URL de ORIGEN donde apareció la cara (resultado directo) + su score.
function formatFacial(name, envKey, result) {
  if (!result) return '';
  if (!result.ok) {
    if (result.reason === 'bad-key') return `\n\n*${name}:* key inválida (revisa ${envKey}).`;
    if (result.reason === 'timeout') return `\n\n*${name}:* la búsqueda tardó demasiado, reintenta.`;
    if (result.reason === 'error')   return `\n\n*${name}:* la búsqueda falló (red/límite/créditos).`;
    return ''; // no-key / no-image: silencioso
  }
  if (!result.matches.length) return `\n\n*${name} (auto):* sin coincidencias faciales en la web.`;
  const lines = result.matches.map(m => {
    const sc = m.score != null ? ` (${m.score}%)` : '';
    const ttl = m.title ? `${m.title} — ` : '';
    return `• ${ttl}${m.sourceUrl}${sc}`;
  });
  return `\n\n*${name} (auto) — ${result.matches.length} coincidencia(s):*\n${lines.join('\n')}`;
}

// La mayoría de los fakes roban la foto de una cuenta de Instagram (o de otra
// red). Este bloque resalta, de entre TODAS las coincidencias que ya trajeron
// Lenso/FaceCheck, las que vienen de una red social — con IG arriba del todo,
// porque suele ser la cuenta original de la que sacaron la foto. Sin coste ni
// llamadas extra: filtra lo que ya tenemos.
const SOCIALS = [
  { host: /instagram\.com/i,  label: 'Instagram' },
  { host: /(tiktok\.com)/i,   label: 'TikTok' },
  { host: /(facebook\.com|fb\.com)/i, label: 'Facebook' },
  { host: /(twitter\.com|x\.com)/i,   label: '𝕏 Twitter/X' },
  { host: /(linkedin\.com)/i, label: 'LinkedIn' },
];

function socialHits(...results) {
  const seen = new Set();
  const hits = [];
  for (const r of results) {
    if (!r?.ok || !Array.isArray(r.matches)) continue;
    for (const m of r.matches) {
      const url = m.sourceUrl;
      if (!url || seen.has(url)) continue;
      const net = SOCIALS.find(s => s.host.test(url));
      if (!net) continue;
      seen.add(url);
      hits.push({ label: net.label, url, score: m.score, ig: /instagram/i.test(net.label) });
    }
  }
  // Instagram primero, luego por score.
  hits.sort((a, b) => (b.ig - a.ig) || ((b.score || 0) - (a.score || 0)));
  return hits;
}

// Bloque de búsqueda inversa DIRECTA para una imagen. `imgUrl` es la URL pública
// si ya se tiene (la foto de perfil la trae); si es null, se sube la imagen a un
// host temporal para conseguirla — así Google Lens y TinEye llevan al RESULTADO,
// no a una página vacía, también con imágenes citadas. Lenso y FaceCheck corren
// por API (si hay key) y muestran las URLs donde apareció la cara. Todo en
// paralelo para no encadenar latencias.
async function searchBlock(buf, imgUrl) {
  const [hosted, lenso, fc] = await Promise.all([
    imgUrl ? Promise.resolve(imgUrl) : uploadTemp(buf).catch(() => null),
    lensoEnabled() ? lensoSearch(buf).catch(() => null) : Promise.resolve(null),
    facecheckEnabled() ? facecheckSearch(buf).catch(() => null) : Promise.resolve(null),
  ]);

  let out = '';

  // Lo primero y más útil: ¿la foto aparece en alguna red social? (IG arriba).
  const socials = socialHits(lenso, fc);
  if (socials.length) {
    const lines = socials.slice(0, 5).map(h =>
      `${h.label}: ${h.url}${h.score != null ? ` (${h.score}%)` : ''}`
    );
    out +=
      `*ORIGEN DE LA FOTO (redes):*\n${lines.join('\n')}\n` +
      `_Si sale de un perfil que NO es esta persona → suplantación._\n\n`;
  }

  // Enlaces de búsqueda facial, COMPACTOS (acortados) para no llenar pantalla.
  // Lens y TinEye van directos al resultado (vía la URL del host); PimEyes es la
  // #1 de la comunidad OSINT para cara en toda la web (se sube la foto adjunta).
  const engines = [];
  if (hosted) {
    const u = encodeURIComponent(hosted);
    const [lens, tin] = await Promise.all([
      shorten(`https://lens.google.com/uploadbyurl?url=${u}`),
      shorten(`https://tineye.com/search?url=${u}`),
    ]);
    engines.push(`Lens → ${lens}`, `TinEye → ${tin}`);
  }
  engines.push(`PimEyes → pimeyes.com`); // subir la foto adjunta
  out += `*Buscar la cara:*\n${engines.join('\n')}`;

  out += formatFacial('Lenso', 'LENSO_API_KEY', lenso);
  out += formatFacial('FaceCheck', 'FACECHECK_API_KEY', fc);
  return out;
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

  // Búsqueda inversa en paralelo (sube la imagen al host + APIs faciales).
  const searchPromise = searchBlock(buf, null);

  const lines = [];
  try {
    const hash = await computeHash(buf);
    const matches = await matchOnly(hash);
    const fake = matches.filter(m => m.fake);
    const others = [...new Set(matches.filter(m => !m.fake).map(m => shortAcc(m.account)))];
    if (fake.length) lines.push(`*Esta foto está marcada como FAKE* en el historial.`);
    if (others.length) lines.push(`*Esta foto la usan/usaron:* ${others.join(', ')} → posible suplantación.`);
    if (!fake.length && !others.length) lines.push(`Sin coincidencias en el historial del bot.`);
  } catch {
    lines.push(`No pude calcular la huella de la imagen (ffmpeg).`);
  }

  const search = await searchPromise;
  const header = `*ANÁLISIS DE IMAGEN (anti-fake)*\n\n`;
  const footer = `\n\n_Los resultados son indicios, no prueba._`;
  const mentions = img.author ? [img.author] : [];

  await sock.sendMessage(jid, {
    image: buf,
    caption: header + lines.join('\n') + '\n\n' + search + footer,
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

  // El owner principal nunca se marca como sospechoso: se devuelve siempre un
  // veredicto limpio, sin puntaje de riesgo ni análisis.
  if (isMainOwner(target, false, groupMeta)) {
    const num = target.split('@')[0];
    const tag = (target.endsWith('@s.whatsapp.net') ? '+' : '@') + num;
    return sock.sendMessage(jid, {
      text: `*ANÁLISIS ANTI-FAKE* ${tag}\n*Puntaje: 0* → *Sin señales de cuenta falsa.*\n\n` +
        `Cuenta legítima, sin indicios de suplantación.`,
      mentions: [target],
    }, { quoted: msg });
  }

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

  // Búsqueda inversa en paralelo (Lens/TinEye con la URL pública de la foto +
  // APIs faciales). Arranca ya para solapar su latencia con el resto.
  const searchPromise = pfp ? searchBlock(pfp.buf, pfp.url) : null;

  let score = 0;
  const lines = [];

  // Lista negra: veredicto casi directo.
  if (bannedAs) {
    score += 10;
    lines.push(`*EN LISTA NEGRA* (${shortAcc(bannedAs)}) — ya fue baneado en tus grupos.`);
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
        lines.push(`*Foto marcada como FAKE* anteriormente.`);
      }
      if (live.length) {
        score += 5;
        const who = [...new Set(live.map(m => shortAcc(m.account)))].join(', ');
        lines.push(`*Misma foto que un miembro presente:* ${who} → multicuenta/suplantación.`);
      }
      if (past.length) {
        score += 4;
        const who = [...new Set(past.map(m => shortAcc(m.account)))].join(', ');
        lines.push(`*Foto reciclada:* ya la usó ${who} (cuenta que ya no está) → identidad robada.`);
      }
      if (!fake.length && !live.length && !past.length) {
        lines.push(`Foto sin coincidencias en el historial del bot.`);
      }
    } catch {
      lines.push(`Foto presente (no pude calcular su huella).`);
    }
  } else {
    score += 2;
    lines.push(`*Sin foto de perfil visible* (o la oculta a desconocidos).`);
  }

  // Proxy de antigüedad vía el "info" del perfil.
  if (about) {
    const age = about.setAt ? now - about.setAt : 0;
    // setAt is either 0 (never written / default "Hey there") or a real epoch
    // ms. `!about.setAt` already covers the "never written" case — the old
    // `about.setAt < DAY` clause compared an epoch against a 1-day span and was
    // never true.
    if (!about.setAt) {
      score += 1;
      lines.push(`Info del perfil nunca escrito (por defecto).`);
    } else if (age < 30 * DAY) {
      score += 2;
      lines.push(`Info del perfil escrito hace ${Math.max(1, Math.round(age / DAY))} días → cuenta posiblemente reciente.`);
    } else if (age > 365 * DAY) {
      score -= 2;
      lines.push(`Info escrito hace ${Math.round(age / (365 * DAY) * 10) / 10} años → cuenta antigua verificable.`);
    }
    if (about.status === '') {
      lines.push(`Info oculto por privacidad.`);
    }
  }

  // Cuenta Business.
  if (biz) {
    score += 2;
    lines.push(`*Cuenta WhatsApp Business.*`);
  }

  // Número oculto (solo LID, sin mapeo a teléfono conocido).
  if (targetAcc.endsWith('@lid')) {
    score += 1;
    lines.push(`Número oculto (LID) — no expone teléfono ni país.`);
  }

  // Veredicto por umbrales.
  let verdict;
  if (score >= 8)      verdict = '*RIESGO ALTO — casi seguro fake/multicuenta.*';
  else if (score >= 4) verdict = '*RIESGO MEDIO — verificar manualmente.*';
  else if (score >= 1) verdict = '*Riesgo bajo — señales menores.*';
  else                 verdict = '*Sin señales de cuenta falsa.*';

  const num = target.split('@')[0];
  const tag = (target.endsWith('@s.whatsapp.net') ? '+' : '@') + num;
  const header = `*ANÁLISIS ANTI-FAKE* ${tag}\n*Puntaje: ${score}* → ${verdict}\n\n`;
  const body = lines.join('\n');
  const footer = `\n\n_Los resultados son indicios, no prueba._`;

  const search = searchPromise ? await searchPromise : '';

  if (pfp) {
    await sock.sendMessage(jid, {
      image: pfp.buf,
      caption: header + body + '\n\n' + search + footer,
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

  // No se puede marcar como fake al owner principal: se rechaza con cortesía.
  if (isMainOwner(target, false, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Al owner no se le marca como fake.' }, { quoted: msg });
  }

  const pfp = await fetchPfp(sock, target);
  if (!pfp) {
    return sock.sendMessage(jid, { text: 'No pude obtener la foto de ese usuario.' }, { quoted: msg });
  }

  try {
    const hash = await computeHash(pfp.buf);
    await recordAndMatch(jid.endsWith('@g.us') ? jid : null, canonicalJid(target), hash);
    const n = await markFake(hash);
    return sock.sendMessage(jid, {
      text: `Foto marcada como fake (${n} registro${n === 1 ? '' : 's'}). Si reaparece con otra cuenta, saltará la alerta.`,
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
    text: `${shortAcc(canonicalJid(target))} añadido a la lista negra global (${total} cuentas).` +
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
      ? `${shortAcc(canonicalJid(target))} sacado de la lista negra.`
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
        `• Foto igual a la de otro miembro o marcada fake → alerta`,
    }, { quoted: msg });
  }

  await toggleAntiFake(jid, arg === 'on');
  return sock.sendMessage(jid, {
    text: arg === 'on'
      ? '*Anti-fake ACTIVADO*: lista negra + huella de fotos en cada entrada.'
      : 'Anti-fake desactivado.',
  }, { quoted: msg });
}

// ─── Guard de entradas (llamado desde bot.js en group-participants add) ──────

async function guardOnJoin(sock, groupJid, joiners, groupMeta) {
  if (!isAntiFakeEnabled(groupJid)) return;
  const now = Date.now();

  // Por cada entrante: lista negra → kick; huella de foto → alerta.
  for (const p of joiners) {
    const obj = typeof p === 'string' ? { id: p } : (p || {});
    if (!obj.id) continue;
    // El anti-fake nunca actúa contra el owner principal: ni kick ni alerta.
    if (isMainOwner(obj.id, false, groupMeta) ||
        (obj.lid && isMainOwner(obj.lid, false, groupMeta)) ||
        (obj.phoneNumber && isMainOwner(obj.phoneNumber, false, groupMeta))) {
      continue;
    }
    const forms = [obj.id, obj.lid, obj.phoneNumber].filter(Boolean).map(bareJid);
    forms.push(canonicalJid(obj.id));

    const bannedAs = await isBanned(forms).catch(() => null);
    if (bannedAs) {
      try {
        await sock.groupParticipantsUpdate(groupJid, [obj.id], 'remove');
        await sock.sendMessage(groupJid, {
          text: `*Anti-fake:* @${String(obj.id).split('@')[0]} está en la lista negra (${shortAcc(bannedAs)}). Expulsado.`,
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
        text: `*Anti-fake:* ${numTag} acaba de entrar y ${motivo}. Revisen con *!fk ${numTag}*.`,
        mentions: [obj.id],
      });
    })().catch(e => logger.warn(`anti-fake: chequeo de foto falló: ${e.message}`));
  }
}

module.exports = { cmdFk, cmdMarkFake, cmdFkBan, cmdFkUnban, cmdAntiFake, guardOnJoin };
