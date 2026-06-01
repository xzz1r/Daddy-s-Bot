const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const { ffmpegPath } = require('../utils/ffmpeg');
const { tempFile, cleanTemp, streamToBuffer } = require('../utils/helpers');
const { isAnimatedWebP, extractFirstAnmfFrame } = require('../utils/sticker');
const logger = require('../utils/logger');

ffmpeg.setFfmpegPath(ffmpegPath);

// Hard kill a stuck ffmpeg after this long (matches sticker.js).
const FFMPEG_TIMEOUT_MS = 45_000;

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
    let timer = null;
    const cmd = ffmpeg(inputFile)
      .setFfmpegPath(ffmpegPath)
      .outputOptions(opts.outputOptions)
      .toFormat(opts.format)
      .on('stderr', l => { stderrBuf += l + '\n'; })
      .on('error', (err) => {
        if (timer) clearTimeout(timer);
        const last = stderrBuf.trim().split('\n').slice(-4).join(' | ');
        reject(new Error(last || err.message));
      })
      .on('end', () => { if (timer) clearTimeout(timer); resolve(); });
    timer = setTimeout(() => { try { cmd.kill('SIGKILL'); } catch {} reject(new Error('ffmpeg timeout')); }, FFMPEG_TIMEOUT_MS);
    cmd.save(outputFile);
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

        // 1. Try animated → GIF via ffmpeg (works when the build has animated WebP demuxer)
        let sent = false;
        try {
          const gif = await convertToGif(buf);
          await sock.sendMessage(jid, { video: gif, gifPlayback: true, mimetype: 'video/mp4' }, { quoted: msg });
          sent = true;
        } catch (err) {
          logger.warn(`toimg GIF failed (${err.message.slice(0, 80)}), trying frame extraction`);
        }

        // 2. Extract first frame directly from ANMF chunk — bypasses ffmpeg animated-WebP decoder
        if (!sent) {
          try {
            const frameBuf = extractFirstAnmfFrame(buf);
            if (frameBuf) {
              const jpg = await convertToJpeg(frameBuf);
              await sock.sendMessage(jid, {
                image: jpg,
                caption: 'Primer fotograma del sticker animado.',
              }, { quoted: msg });
              sent = true;
            }
          } catch (err) {
            logger.warn(`toimg first-frame extraction failed: ${err.message}`);
          }
        }

        // 3. Last resort: send raw animated WebP as a downloadable file
        if (!sent) {
          try {
            await sock.sendMessage(jid, {
              document: buf,
              mimetype: 'image/webp',
              fileName: 'sticker.webp',
              caption: 'No se pudo convertir. Aqui el archivo WebP del sticker animado.',
            }, { quoted: msg });
          } catch (err) {
            logger.error(`toimg document fallback failed: ${err.message}`);
            await sock.sendMessage(jid, { text: 'No se pudo convertir ni enviar el sticker animado.' }, { quoted: msg });
          }
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
