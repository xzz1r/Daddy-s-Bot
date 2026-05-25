const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const webpmux = require('node-webpmux');
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
  if (!buf || buf.length < 12) return false;
  if (buf.slice(0, 4).toString() !== 'RIFF') return false;
  if (buf.slice(8, 12).toString() !== 'WEBP') return false;
  let pos = 12;
  while (pos + 8 <= buf.length) {
    const type = buf.slice(pos, pos + 4).toString();
    if (type === 'ANIM') return true;
    const size = buf.readUInt32LE(pos + 4);
    pos += 8 + size + (size % 2);
  }
  return false;
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

function runFfmpegConvert(inputFile, outputFile, opts) {
  return new Promise((resolve, reject) => {
    let stderrBuf = '';
    ffmpeg(inputFile)
      .setFfmpegPath(ffmpegPath)
      .outputOptions(opts.outputOptions)
      .toFormat(opts.format)
      .on('stderr', l => { stderrBuf += l + '\n'; })
      .on('error', (err) => {
        const last = stderrBuf.trim().split('\n').slice(-4).join(' | ');
        reject(new Error(last || err.message));
      })
      .on('end', resolve)
      .save(outputFile);
  });
}

async function convertToJpeg(inputBuf) {
  const inputFile = tempFile('webp');
  const outputFile = tempFile('jpg');
  await fs.writeFile(inputFile, inputBuf);
  try {
    await runFfmpegConvert(inputFile, outputFile, {
      outputOptions: ['-vframes', '1', '-q:v', '2'],
      format: 'mjpeg',
    });
    const buf = await fs.readFile(outputFile);
    if (buf.length < 100) throw new Error('JPEG vacío');
    return buf;
  } finally {
    await cleanTemp(inputFile);
    await cleanTemp(outputFile);
  }
}

async function convertToGif(inputBuf) {
  const inputFile = tempFile('webp');
  const outputFile = tempFile('gif');
  await fs.writeFile(inputFile, inputBuf);
  try {
    await runFfmpegConvert(inputFile, outputFile, {
      outputOptions: ['-vf', 'fps=15,scale=320:-1:flags=lanczos', '-loop', '0'],
      format: 'gif',
    });
    const buf = await fs.readFile(outputFile);
    if (buf.length < 100) throw new Error('GIF vacío');
    return buf;
  } finally {
    await cleanTemp(inputFile);
    await cleanTemp(outputFile);
  }
}

// Extract first frame of animated WebP via node-webpmux (no ffmpeg decoder needed).
// Falls back to the raw animated buffer if the frame API isn't available.
async function extractFirstFrameAsWebP(animBuf) {
  const img = new webpmux.Image();
  await img.load(animBuf);
  const frame = img.frames?.[0];
  if (frame?.img) {
    const frameBuf = await frame.img.save(null);
    if (frameBuf && frameBuf.length > 100) return frameBuf;
  }
  return null;
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
        // Try animated → GIF via ffmpeg
        let sent = false;
        try {
          const gif = await convertToGif(buf);
          await sock.sendMessage(jid, { video: gif, gifPlayback: true, mimetype: 'video/mp4' }, { quoted: msg });
          sent = true;
        } catch (err) {
          logger.warn(`toimg GIF conversion failed (${err.message}), trying frame extraction`);
        }

        if (!sent) {
          // ffmpeg can't decode this animated WebP — extract first frame via webpmux
          try {
            const frameBuf = await extractFirstFrameAsWebP(buf);
            if (frameBuf) {
              const jpg = await convertToJpeg(frameBuf);
              await sock.sendMessage(jid, {
                image: jpg,
                caption: 'Primer fotograma (sticker animado no convertible a GIF en este sistema).',
              }, { quoted: msg });
              sent = true;
            }
          } catch (err) {
            logger.warn(`toimg frame extraction failed: ${err.message}`);
          }
        }

        if (!sent) {
          // Last resort: send raw animated WebP as downloadable document
          await sock.sendMessage(jid, {
            document: buf,
            mimetype: 'image/webp',
            fileName: 'sticker.webp',
            caption: 'Sticker animado (no se pudo convertir, aquí el archivo WebP original).',
          }, { quoted: msg });
        }

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
