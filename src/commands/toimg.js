const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const { ffmpegPath } = require('../utils/ffmpeg');
const { tempFile, cleanTemp } = require('../utils/helpers');
const logger = require('../utils/logger');

ffmpeg.setFfmpegPath(ffmpegPath);

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function isAnimatedWebP(buf) {
  return buf.indexOf(Buffer.from('ANIM')) !== -1;
}

// Find the first usable media node in a message, including view-once wrappers
function findMedia(m) {
  if (!m) return null;
  if (m.stickerMessage) return { type: 'sticker', data: m.stickerMessage };
  if (m.imageMessage)   return { type: 'image',   data: m.imageMessage };
  if (m.videoMessage)   return { type: 'video',   data: m.videoMessage };

  // View-once wrappers (v1, v2, v2 extension)
  const inner =
    m.viewOnceMessage?.message ||
    m.viewOnceMessageV2?.message ||
    m.viewOnceMessageV2Extension?.message;
  if (inner) {
    if (inner.imageMessage) return { type: 'image', data: inner.imageMessage, viewOnce: true };
    if (inner.videoMessage) return { type: 'video', data: inner.videoMessage, viewOnce: true };
  }
  return null;
}

async function convertToJpeg(inputBuf) {
  const inputFile = tempFile('webp');
  const outputFile = tempFile('jpg');
  await fs.writeFile(inputFile, inputBuf);
  await new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .setFfmpegPath(ffmpegPath)
      .outputOptions(['-vframes', '1', '-q:v', '2'])
      .toFormat('mjpeg')
      .on('error', reject)
      .on('end', resolve)
      .save(outputFile);
  });
  const buf = await fs.readFile(outputFile);
  await cleanTemp(inputFile);
  await cleanTemp(outputFile);
  return buf;
}

async function convertToGif(inputBuf) {
  const inputFile = tempFile('webp');
  const outputFile = tempFile('gif');
  await fs.writeFile(inputFile, inputBuf);
  await new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .setFfmpegPath(ffmpegPath)
      .outputOptions(['-vf', 'fps=15,scale=320:-1:flags=lanczos', '-loop', '0'])
      .toFormat('gif')
      .on('error', reject)
      .on('end', resolve)
      .save(outputFile);
  });
  const buf = await fs.readFile(outputFile);
  await cleanTemp(inputFile);
  await cleanTemp(outputFile);
  return buf;
}

// !toimg — reply to a sticker, view-once image/video, or any media to extract it
async function cmdToImg(sock, msg) {
  const jid = msg.key.remoteJid;

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const media = findMedia(ctx?.quotedMessage) || findMedia(msg.message);

  if (!media) {
    return sock.sendMessage(jid, {
      text: 'Responde con !toimg a un sticker, una foto o una foto de una sola visualizacion.',
    }, { quoted: msg });
  }

  try {
    const stream = await downloadContentFromMessage(media.data, media.type);
    const buf = await streamToBuffer(stream);

    if (media.type === 'sticker') {
      if (isAnimatedWebP(buf)) {
        const gif = await convertToGif(buf);
        await sock.sendMessage(jid, { video: gif, gifPlayback: true, mimetype: 'video/mp4' }, { quoted: msg });
      } else {
        const jpg = await convertToJpeg(buf);
        await sock.sendMessage(jid, { image: jpg }, { quoted: msg });
      }
    } else if (media.type === 'image') {
      const caption = media.viewOnce ? 'Foto extraida de visualizacion unica.' : undefined;
      await sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
    } else if (media.type === 'video') {
      const caption = media.viewOnce ? 'Video extraido de visualizacion unica.' : undefined;
      await sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', caption }, { quoted: msg });
    }
  } catch (err) {
    logger.error(`toimg error: ${err.message}`);
    await sock.sendMessage(jid, { text: `No pude extraer el contenido: ${err.message}` }, { quoted: msg });
  }
}

module.exports = { cmdToImg };
