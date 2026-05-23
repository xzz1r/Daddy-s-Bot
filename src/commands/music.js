const { searchYouTube, downloadAudio } = require('../utils/downloader');
const { cleanTemp } = require('../utils/helpers');
const { incrementStat } = require('../utils/state');
const { getCached, setCached } = require('../utils/musicCache');
const logger = require('../utils/logger');
const fs = require('fs-extra');

// !Playsong <query> - search and send audio only
async function cmdPlay(sock, msg, args) {
  if (!args.length) {
    return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usa: *!Playsong* <canción o artista>' }, { quoted: msg });
  }

  const query = args.join(' ');
  const jid = msg.key.remoteJid;

  // Try cache first
  let cached = await getCached(query).catch(() => null);

  if (!cached) {
    let downloaded;
    try {
      downloaded = await downloadAudio(`ytsearch1:${query}`);
    } catch (err) {
      logger.error(`Download error: ${err.message}`);
      return sock.sendMessage(jid, { text: `❌ ${err.message}` }, { quoted: msg });
    }
    try {
      await setCached(query, downloaded.filePath, downloaded.title, downloaded.mimetype, downloaded.ext);
    } catch {}
    await cleanTemp(downloaded.filePath);
    cached = await getCached(query).catch(() => null);
    if (!cached) {
      // Fallback: send directly from temp (shouldn't normally happen)
      cached = downloaded;
    }
  }

  try {
    const audioBuffer = await fs.readFile(cached.filePath);
    await sock.sendMessage(jid, {
      audio: audioBuffer,
      mimetype: cached.mimetype || 'audio/mp4',
      fileName: `${cached.title}.${cached.ext || 'm4a'}`,
      ptt: false,
    }, { quoted: msg });
    await incrementStat('musicPlayed');
  } catch (err) {
    logger.error(`Send audio error: ${err.message}`);
    await sock.sendMessage(jid, { text: `❌ ${err.message}` }, { quoted: msg });
  }
}

// !buscar <query> - show search results list
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
    text += `*${i + 1}.* ${v.title}\n`;
    text += `   ${v.channel} | ${v.duration}\n\n`;
  });
  text += `_Usa !Playsong <nombre> para descargar_`;

  await sock.sendMessage(jid, { text }, { quoted: msg });
}

module.exports = { cmdPlay, cmdSearch };
