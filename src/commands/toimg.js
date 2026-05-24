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

// !toimg — reply to a sticker to get it as image/gif
async function cmdToImg(sock, msg) {
  const jid = msg.key.remoteJid;

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const stickerMsg =
    msg.message?.stickerMessage ||
    ctx?.quotedMessage?.stickerMessage;

  if (!stickerMsg) {
    return sock.sendMessage(jid, { text: 'Responde a un sticker con !toimg.' }, { quoted: msg });
  }

  try {
    const stream = await downloadContentFromMessage(stickerMsg, 'sticker');
    const buf = await streamToBuffer(stream);
    const animated = isAnimatedWebP(buf);

    if (animated) {
      const gif = await convertToGif(buf);
      await sock.sendMessage(jid, { video: gif, gifPlayback: true, mimetype: 'video/mp4' }, { quoted: msg });
    } else {
      const jpg = await convertToJpeg(buf);
      await sock.sendMessage(jid, { image: jpg }, { quoted: msg });
    }
  } catch (err) {
    logger.error(`toimg error: ${err.message}`);
    await sock.sendMessage(jid, { text: `No pude convertir el sticker: ${err.message}` }, { quoted: msg });
  }
}

module.exports = { cmdToImg };
