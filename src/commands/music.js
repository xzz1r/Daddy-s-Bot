const { searchYouTube, downloadAudio } = require('../utils/downloader');
const { cleanTemp } = require('../utils/helpers');
const { incrementStat } = require('../utils/state');
const { getCached, setCached, clearCache } = require('../utils/musicCache');
const logger = require('../utils/logger');
const fs = require('fs-extra');

// !Playsong <query> — search and send audio only
async function cmdPlay(sock, msg, args) {
  const jid = msg.key.remoteJid;

  if (!args.length) {
    return sock.sendMessage(jid, { text: '❌ Usa: *!Playsong* <canción o artista>' }, { quoted: msg });
  }

  const query = args.join(' ');

  // Check cache first — hit = instant send, no search message needed
  let result = await getCached(query).catch(() => null);
  const fromCache = !!result;

  if (!result) {
    await sock.sendMessage(jid, { text: '🔎 Buscando...' }, { quoted: msg }).catch(() => {});
    try {
      result = await downloadAudio(`ytsearch1:${query}`);
    } catch (err) {
      logger.error(`Download error: ${err.message}`);
      return sock.sendMessage(jid, { text: `❌ ${err.message}` }, { quoted: msg });
    }
  }

  // Send audio — use RAM buffer if available, otherwise read from disk
  try {
    const audioBuffer = result.buffer || await fs.readFile(result.filePath);

    if (audioBuffer.length > 25 * 1024 * 1024) {
      if (!fromCache) cleanTemp(result.filePath).catch(() => {});
      return sock.sendMessage(jid, { text: '❌ La canción pesa más de 25MB y no puede enviarse.' }, { quoted: msg });
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
    await sock.sendMessage(jid, { text: `❌ Error al enviar audio: ${err.message}` }, { quoted: msg });
  }

  // Cache and cleanup (only if it was a fresh download)
  if (!fromCache) {
    try { await setCached(query, result.filePath, result.title, result.mimetype, result.ext); } catch {}
    cleanTemp(result.filePath).catch(() => {});
  }
}

// !buscar <query> — list search results
async function cmdSearch(sock, msg, args) {
  if (!args.length) {
    return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usa: *!buscar* <canción>' }, { quoted: msg });
  }

  const query = args.join(' ');
  const jid = msg.key.remoteJid;

  let results;
  try {
    results = await searchYouTube(query);
  } catch (err) {
    return sock.sendMessage(jid, { text: `❌ ${err.message}` }, { quoted: msg });
  }

  if (!results.length) {
    return sock.sendMessage(jid, { text: '❌ No encontré resultados.' }, { quoted: msg });
  }

  let text = `*Resultados para: ${query}*\n\n`;
  results.forEach((v, i) => {
    text += `*${i + 1}.* ${v.title}\n   ${v.channel} | ${v.duration}\n\n`;
  });
  text += `_Usa !Playsong <nombre> para descargar_`;

  await sock.sendMessage(jid, { text }, { quoted: msg });
}

// !clearcache — owner only, deletes all cached songs from RAM and disk
async function cmdClearCache(sock, msg) {
  const jid = msg.key.remoteJid;
  try {
    await clearCache();
    await sock.sendMessage(jid, { text: '✅ Cache de música borrado.' }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Error al borrar cache: ${err.message}` }, { quoted: msg });
  }
}

module.exports = { cmdPlay, cmdSearch, cmdClearCache };
