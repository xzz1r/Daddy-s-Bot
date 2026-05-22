const { searchYouTube, downloadAudio } = require('../utils/downloader');
const { formatDuration } = require('../utils/helpers');
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

  await sock.sendMessage(jid, { text: `🔍 Buscando *${query}*...` }, { quoted: msg });

  let results;
  try {
    results = await searchYouTube(query);
  } catch (err) {
    return sock.sendMessage(jid, { text: `❌ ${err.message}` }, { quoted: msg });
  }

  if (!results.length) {
    return sock.sendMessage(jid, { text: '❌ No encontré resultados para esa búsqueda.' }, { quoted: msg });
  }

  const video = results[0];
  await sock.sendMessage(jid, {
    text: `🎵 Descargando: *${video.title}*\n👤 ${video.channel || 'Desconocido'}\n⏱ ${video.duration || '?'}`,
  }, { quoted: msg });

  let result;
  try {
    result = await downloadAudio(video.url);
  } catch (err) {
    return sock.sendMessage(jid, { text: `❌ Error al descargar: ${err.message}` }, { quoted: msg });
  }

  try {
    const audioBuffer = await fs.readFile(result.filePath);

    await sock.sendMessage(jid, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      ptt: false,
    }, { quoted: msg });

    await incrementStat('musicPlayed');
    logger.success(`Música enviada: ${result.title}`);
  } finally {
    const { cleanTemp } = require('../utils/helpers');
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

  await sock.sendMessage(jid, { text: `🔍 Buscando *${query}*...` }, { quoted: msg });

  let results;
  try {
    results = await searchYouTube(query);
  } catch (err) {
    return sock.sendMessage(jid, { text: `❌ ${err.message}` }, { quoted: msg });
  }

  if (!results.length) {
    return sock.sendMessage(jid, { text: '❌ No encontré resultados.' }, { quoted: msg });
  }

  let text = `🎵 *Resultados para: ${query}*\n\n`;
  results.forEach((v, i) => {
    text += `*${i + 1}.* ${v.title}\n`;
    text += `   └ 👤 ${v.channel || '?'} | ⏱ ${v.duration || '?'}\n\n`;
  });
  text += `_Usa !Playsong <nombre> para descargar_`;

  await sock.sendMessage(jid, { text }, { quoted: msg });
}

module.exports = { cmdPlay, cmdSearch };
