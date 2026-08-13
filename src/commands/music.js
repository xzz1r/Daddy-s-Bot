const { downloadAudio } = require('../utils/downloader');
const { cleanTemp } = require('../utils/helpers');
const { incrementStat } = require('../utils/state');
const { getCached, setCached, listCached, clearCache } = require('../utils/musicCache');
const { getSender, canonicalJid, isMainOwner } = require('../utils/wa');
const { cobrar, devolver, textoSinSaldo } = require('../utils/auraCobro');
const logger = require('../utils/logger');
const fs = require('fs-extra');

// Per-user cooldown before starting a FRESH download (cache hits are instant
// and free, so they're exempt) — bounds how fast one person can occupy the
// yt-dlp concurrency/queue slots in utils/downloader.js. 7s matches the
// throttle that downloader.js's own comments already assumed was in place.
const PLAY_COOLDOWN_MS = 7000;
const MAX_COOLDOWN_ENTRIES = 2000;
const lastPlayAt = new Map();

function onPlayCooldown(senderJid) {
  const key = canonicalJid(senderJid);
  const last = lastPlayAt.get(key);
  const now = Date.now();
  if (last && now - last < PLAY_COOLDOWN_MS) return PLAY_COOLDOWN_MS - (now - last);
  if (lastPlayAt.size >= MAX_COOLDOWN_ENTRIES && !lastPlayAt.has(key)) {
    lastPlayAt.delete(lastPlayAt.keys().next().value);
  }
  lastPlayAt.set(key, now);
  return 0;
}

// !play <query> — search and send audio only
async function cmdPlay(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;

  if (!args.length) return;

  const query = args.join(' ');

  // Check cache first — hit = instant send, no search message needed
  let result = await getCached(query).catch(() => null);
  const fromCache = !!result;

  // El aura es moneda: una cancion cuesta. Se cobra ANTES de gastar ancho de
  // banda y se devuelve mas abajo si la descarga o el envio fallan, para que
  // nadie pague por una cancion que no llego. Lo que ya esta en cache tambien
  // se cobra: el precio es por el servicio, no por el trafico de esa vez.
  const quienPide = getSender(msg);
  const pago = await cobrar(jid, quienPide, 'play', { fromMe: msg.key.fromMe, groupMeta });
  if (!pago.ok) {
    return sock.sendMessage(jid, { text: textoSinSaldo('play', pago) }, { quoted: msg });
  }
  const reembolsar = () => devolver(jid, quienPide, pago.pagado).catch(() => {});

  if (!result) {
    const waitMs = onPlayCooldown(quienPide);
    if (waitMs > 0) {
      await reembolsar();
      return sock.sendMessage(jid, {
        text: `Espera ${Math.ceil(waitMs / 1000)}s antes de pedir otra canción.`,
      }, { quoted: msg });
    }
    // Fire the "Buscando..." notice without awaiting so yt-dlp starts immediately,
    // overlapping the message's network round-trip with the download.
    // El consejo va aquí y no en un mensaje aparte: es justo el momento en que
    // la persona está esperando y va a leerlo. La mayoría de búsquedas que
    // fallan o traen la canción equivocada son de una palabra suelta.
    sock.sendMessage(jid, {
      text: 'Buscando...\n\n_Pon también el artista y acierta a la primera._',
    }, { quoted: msg }).catch(() => {});
    try {
      result = await downloadAudio(query);
    } catch (err) {
      logger.error(`Download error: ${err.message}.`);
      // Caso más común: la búsqueda no devolvió resultado en SoundCloud. Mensaje
      // claro para el grupo; el detalle técnico queda en el log.
      const notFound = /no se encontr|no result|unable to|not found|nothing found/i.test(err.message);
      const text = notFound
        ? 'No encontré esa canción. Prueba con otro nombre o añade el artista.'
        : 'No pude descargar la canción en este momento. Intenta de nuevo.';
      await reembolsar();
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }
  }

  // Send audio — use RAM buffer if available, otherwise read from disk.
  // The buffer read here is reused for caching below so a freshly downloaded
  // file is never read from disk twice.
  let audioBuffer = null;
  try {
    audioBuffer = result.buffer || await fs.readFile(result.filePath);

    if (audioBuffer.length > 25 * 1024 * 1024) {
      if (!fromCache) cleanTemp(result.filePath).catch(() => {});
      await reembolsar();
      return sock.sendMessage(jid, { text: 'La canción pesa más de 25MB y no puede enviarse.' }, { quoted: msg });
    }

    await sock.sendMessage(jid, {
      audio: audioBuffer,
      mimetype: result.mimetype || 'audio/mp4',
      fileName: `${result.title}.${result.ext || 'm4a'}.`,
      ptt: false,
    }, { quoted: msg });
    incrementStat('musicPlayed');
  } catch (err) {
    logger.error(`Send audio error: ${err.message}.`);
    await reembolsar();
    await sock.sendMessage(jid, { text: `Error al enviar audio: ${err.message}.` }, { quoted: msg });
  }

  // Cache and cleanup (only if it was a fresh download). Pass the buffer we
  // already read so setCached doesn't re-read the file from disk.
  if (!fromCache) {
    // Guarda quién pidió la canción (nombre de WhatsApp) para !cachelist. El
    // owner principal (+33) queda excluido: sus pedidos no muestran solicitante.
    const requester = isMainOwner(getSender(msg), msg.key.fromMe) ? '' : (msg.pushName || '').trim();
    try { await setCached(query, result.filePath, result.title, result.mimetype, result.ext, audioBuffer, requester); } catch {}
    cleanTemp(result.filePath).catch(() => {});
  }
}

// !cachelist — muestra las canciones guardadas en cache (las que se envían al
// instante y sin gastar cupo de la API). Abierto a todos: es solo lectura.
async function cmdCacheList(sock, msg) {
  const jid = msg.key.remoteJid;
  let list;
  try {
    list = await listCached();
  } catch (err) {
    return sock.sendMessage(jid, { text: `Error al leer el cache: ${err.message}.` }, { quoted: msg });
  }
  if (!list.length) {
    return sock.sendMessage(jid, { text: 'No hay canciones en cache todavía.' }, { quoted: msg });
  }
  // Título recortado para que la lista quede legible aunque haya muchos, y el
  // solicitante al lado (vacío si lo pidió el owner o no se registró el nombre).
  const lines = list.map((s, i) => {
    const t = s.title.length > 55 ? s.title.slice(0, 52) + '...' : s.title;
    return s.requester ? `${i + 1}. ${t} — ${s.requester}.` : `${i + 1}. ${t}`;
  });
  const text = `*CANCIONES EN CACHE* (${list.length})\n\n` + lines.join('\n');
  await sock.sendMessage(jid, { text }, { quoted: msg });
}

// !clearcache — owner only, deletes all cached songs from RAM and disk
async function cmdClearCache(sock, msg) {
  const jid = msg.key.remoteJid;
  try {
    await clearCache();
    await sock.sendMessage(jid, { text: 'Cache de musica borrado.' }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Error al borrar cache: ${err.message}.` }, { quoted: msg });
  }
}

module.exports = { cmdPlay, cmdCacheList, cmdClearCache };
