const { searchYouTube, downloadAudio } = require('../utils/downloader');
const { cleanTemp } = require('../utils/helpers');
const { incrementStat } = require('../utils/state');
const logger = require('../utils/logger');
const fs = require('fs-extra');

// !Playsong <query> - search and send audio only
async function cmdPlay(sock, msg, args) {
  if (!args.length) {
    return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usa: *!Playsong* <canción o artista>' }, { quoted: msg });
  }

  const query = args.join(' ');
  const jid = msg.key.remoteJid;

  let result;
  try {
    result = await downloadAudio(`ytsearch1:${query}`);
  } catch (err) {
    logger.error(`Download error: ${err.message}`);
    return sock.sendMessage(jid, { text: `❌ ${err.message}` }, { quoted: msg });
  }

  try {
    const audioBuffer = await fs.readFile(result.filePath);
    await sock.sendMessage(jid, {
      audio: audioBuffer,
      mimetype: result.mimetype || 'audio/mp4',
      fileName: `${result.title}.${result.ext || 'm4a'}`,
      ptt: false,
    }, { quoted: msg });
    await incrementStat('musicPlayed');
  } catch (err) {
    logger.error(`Send audio error: ${err.message}`);
    await sock.sendMessage(jid, { text: `❌ ${err.message}` }, { quoted: msg });
  } finally {
    await cleanTemp(result.filePath);
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
