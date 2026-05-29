const { downloadAudio } = require('../utils/downloader');
const { cleanTemp } = require('../utils/helpers');
const { incrementStat } = require('../utils/state');
const { getCached, setCached, clearCache } = require('../utils/musicCache');
const logger = require('../utils/logger');
const fs = require('fs-extra');

// !Playsong <query> — search and send audio only
async function cmdPlay(sock, msg, args) {
  const jid = msg.key.remoteJid;

  if (!args.length) {
    return sock.sendMessage(jid, { text: 'Usa: *!Playsong* <cancion o artista>' }, { quoted: msg });
  }

  const query = args.join(' ');

  // Check cache first — hit = instant send, no search message needed
  let result = await getCached(query).catch(() => null);
  const fromCache = !!result;

  if (!result) {
    // Fire the "Buscando..." notice without awaiting so yt-dlp starts immediately,
    // overlapping the message's network round-trip with the download.
    sock.sendMessage(jid, { text: 'Buscando...' }, { quoted: msg }).catch(() => {});
    try {
      result = await downloadAudio(`ytsearch1:${query}`);
    } catch (err) {
      logger.error(`Download error: ${err.message}`);
      return sock.sendMessage(jid, { text: `Error: ${err.message}` }, { quoted: msg });
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
      return sock.sendMessage(jid, { text: 'La cancion pesa mas de 25MB y no puede enviarse.' }, { quoted: msg });
    }

    await sock.sendMessage(jid, {
      audio: audioBuffer,
      mimetype: result.mimetype || 'audio/mp4',
      fileName: `${result.title}.${result.ext || 'm4a'}`,
      ptt: false,
    }, { quoted: msg });
    incrementStat('musicPlayed');
  } catch (err) {
    logger.error(`Send audio error: ${err.message}`);
    await sock.sendMessage(jid, { text: `Error al enviar audio: ${err.message}` }, { quoted: msg });
  }

  // Cache and cleanup (only if it was a fresh download). Pass the buffer we
  // already read so setCached doesn't re-read the file from disk.
  if (!fromCache) {
    try { await setCached(query, result.filePath, result.title, result.mimetype, result.ext, audioBuffer); } catch {}
    cleanTemp(result.filePath).catch(() => {});
  }
}

// !clearcache — owner only, deletes all cached songs from RAM and disk
async function cmdClearCache(sock, msg) {
  const jid = msg.key.remoteJid;
  try {
    await clearCache();
    await sock.sendMessage(jid, { text: 'Cache de musica borrado.' }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Error al borrar cache: ${err.message}` }, { quoted: msg });
  }
}

module.exports = { cmdPlay, cmdClearCache };
