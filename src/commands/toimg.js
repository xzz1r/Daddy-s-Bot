const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const { ffmpegPath } = require('../utils/ffmpeg');
const { tempFile, cleanTemp, streamToBuffer, ffmpegSemaphore, MAX_MEDIA_BYTES } = require('../utils/helpers');
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

async function runFfmpegConvert(inputFile, outputFile, opts) {
  await ffmpegSemaphore.acquire();
  try {
    return await new Promise((resolve, reject) => {
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
  } finally {
    ffmpegSemaphore.release();
  }
}

async function convertToJpeg(inputBuf) {
  const inputFile = tempFile('webp');
  const outputFile = tempFile('jpg');
  await fs.writeFile(inputFile, inputBuf);
  try {
    await runFfmpegConvert(inputFile, outputFile, {
      // -q:v 1 = máxima calidad JPEG (sin pérdida perceptible) para conservar
      // la imagen del sticker lo más fiel posible.
      outputOptions: ['-vframes', '1', '-q:v', '1'],
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

// Convierte un WebP animado a MP4 (H.264). pix_fmt yuv420p + dimensiones pares
// son obligatorios para que WhatsApp y la mayoría de reproductores lo lean. Sin
// audio (los stickers no lo tienen). Depende de que el ffmpeg del sistema tenga
// el demuxer de WebP animado (el mismo que usa la conversión a GIF de !toimg).
async function convertToMp4(inputBuf) {
  const inputFile = tempFile('webp');
  const outputFile = tempFile('mp4');
  await fs.writeFile(inputFile, inputBuf);
  try {
    await runFfmpegConvert(inputFile, outputFile, {
      // Máxima fidelidad: se conserva la resolución y los fotogramas originales
      // (no se baja fps ni se escala; solo se ajustan las dimensiones a números
      // pares, requisito de yuv420p). CRF 12 = calidad casi sin pérdida visible,
      // preset slow para comprimir bien sin sacrificar calidad.
      outputOptions: [
        '-movflags', 'faststart',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-crf', '12',
        '-preset', 'slow',
        '-an',
      ],
      format: 'mp4',
    });
    const buf = await fs.readFile(outputFile);
    if (buf.length < 100) throw new Error('MP4 vacío');
    return buf;
  } finally {
    await cleanTemp(inputFile);
    await cleanTemp(outputFile);
  }
}

// !tovid — como !toimg pero al revés: convierte un sticker ANIMADO a video (MP4),
// o reenvía un video (incl. de una sola visualización) como video normal.
async function cmdToVid(sock, msg) {
  const jid = msg.key.remoteJid;

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const media = findMedia(ctx?.quotedMessage) || findMedia(msg.message);

  if (!media) {
    return sock.sendMessage(jid, {
      text: 'Responde con !tovid a un sticker animado o a un video.',
    }, { quoted: msg });
  }

  try {
    const stream = await downloadContentFromMessage(media.data, media.type);
    const buf = await streamToBuffer(stream, MAX_MEDIA_BYTES);

    if (media.type === 'sticker') {
      if (!isAnimatedWebP(buf)) {
        return sock.sendMessage(jid, {
          text: 'Ese sticker no es animado. Para stickers estáticos usa !toimg.',
        }, { quoted: msg });
      }
      try {
        const mp4 = await convertToMp4(buf);
        await sock.sendMessage(jid, { video: mp4, mimetype: 'video/mp4', gifPlayback: true }, { quoted: msg });
      } catch (err) {
        logger.warn(`tovid MP4 failed (${err.message.slice(0, 80)}), enviando el WebP`);
        await sock.sendMessage(jid, {
          document: buf,
          mimetype: 'image/webp',
          fileName: 'sticker.webp',
          caption: 'No se pudo convertir a video. Aquí el archivo del sticker animado.',
        }, { quoted: msg });
      }
    } else if (media.type === 'video') {
      const caption = media.viewOnce ? 'Video extraído de visualización única.' : undefined;
      await sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', caption }, { quoted: msg });
    } else {
      // imagen u otro: no aplica para video
      await sock.sendMessage(jid, {
        text: 'Eso no es un sticker animado ni un video. Usa !toimg para imágenes y stickers estáticos.',
      }, { quoted: msg });
    }
  } catch (err) {
    logger.error(`tovid error: ${err.message}`);
    await sock.sendMessage(jid, { text: `No pude convertir a video: ${err.message}` }, { quoted: msg });
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
    const buf = await streamToBuffer(stream, MAX_MEDIA_BYTES);

    if (media.type === 'sticker') {
      if (isAnimatedWebP(buf)) {

        // 1. Animado → MP4 en bucle (si el ffmpeg de turno sabe demuxear WebP animado).
        //
        // MP4, no GIF: el `gifPlayback` de WhatsApp NO reproduce bytes de GIF, es
        // un MP4 que el cliente pone en bucle y sin sonido. Aquí se generaba un
        // GIF de verdad y se anunciaba como `video/mp4`, así que al destinatario
        // le llegaba un archivo que no podía reproducir.
        let sent = false;
        try {
          const mp4 = await convertToMp4(buf);
          await sock.sendMessage(jid, { video: mp4, gifPlayback: true, mimetype: 'video/mp4' }, { quoted: msg });
          sent = true;
        } catch (err) {
          logger.warn(`toimg MP4 failed (${err.message.slice(0, 80)}), trying frame extraction`);
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

module.exports = { cmdToImg, cmdToVid };
