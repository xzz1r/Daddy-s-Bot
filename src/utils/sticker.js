const { ffmpegPath } = require('./ffmpeg');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const webpmux = require('node-webpmux');
const { tempFile, cleanTemp } = require('./helpers');
const config = require('../config');

ffmpeg.setFfmpegPath(ffmpegPath);

function detectExt(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'jpg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'gif';
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer.slice(8, 12).toString() === 'WEBP') return 'webp';
  // mp4/m4v container
  if (buffer.slice(4, 8).toString() === 'ftyp') return 'mp4';
  return null;
}

// Common scale+pad filter (uses hex color with alpha for transparency)
const VF_STATIC = 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000';
const VF_ANIM = (fps) => `fps=${fps},scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000`;

// Runs ffmpeg and collects stderr so errors are meaningful
function runFfmpeg(inputFile, outputFile, options) {
  return new Promise((resolve, reject) => {
    let stderrBuf = '';
    ffmpeg(inputFile)
      .setFfmpegPath(ffmpegPath)
      .outputOptions(options)
      .toFormat('webp')
      .on('stderr', (line) => { stderrBuf += line + '\n'; })
      .on('error', (err) => {
        const lastLines = stderrBuf.trim().split('\n').slice(-4).join(' | ');
        reject(new Error(lastLines || err.message));
      })
      .on('end', resolve)
      .save(outputFile);
  });
}

async function imageToSticker(imageBuffer) {
  const ext = detectExt(imageBuffer);
  if (!ext) throw new Error('Formato de imagen no reconocido');

  const inputFile = tempFile(ext);
  const outputFile = tempFile('webp');

  await fs.writeFile(inputFile, imageBuffer);

  const stat = await fs.stat(inputFile);
  if (stat.size === 0) {
    await cleanTemp(inputFile);
    throw new Error('Imagen vacía al guardar en disco');
  }

  try {
    // Static image options: explicit libwebp encoder, single frame, no audio
    await runFfmpeg(inputFile, outputFile, [
      '-vf', VF_STATIC,
      '-c:v', 'libwebp',
      '-frames:v', '1',
      '-q:v', '80',
      '-an',
      '-y',
    ]);

    const webpBuffer = await fs.readFile(outputFile);
    if (webpBuffer.length < 100) throw new Error('Sticker generado vacío');
    return await addStickerMeta(webpBuffer);
  } finally {
    await cleanTemp(inputFile);
    await cleanTemp(outputFile);
  }
}

async function videoToSticker(videoBuffer) {
  const detected = detectExt(videoBuffer);
  const ext = detected === 'webp' ? 'webp' : (detected || 'mp4');
  const inputFile = tempFile(ext);
  const outputFile = tempFile('webp');

  await fs.writeFile(inputFile, videoBuffer);

  const stat = await fs.stat(inputFile);
  if (stat.size === 0) {
    await cleanTemp(inputFile);
    throw new Error('Video vacío al guardar en disco');
  }

  try {
    // Animated WebP: lower fps for WhatsApp size limit (~500 KB)
    // Cap at 15 fps for compatibility, max 6 seconds
    const fps = Math.min(config.sticker.fps, 15);
    await new Promise((resolve, reject) => {
      let stderrBuf = '';
      ffmpeg(inputFile)
        .setFfmpegPath(ffmpegPath)
        .inputOptions(['-t', '6'])
        .outputOptions([
          '-vf', VF_ANIM(fps),
          '-c:v', 'libwebp_anim',
          '-loop', '0',
          '-an',
          '-q:v', '55',
          '-preset', 'default',
          '-y',
        ])
        .toFormat('webp')
        .on('stderr', (line) => { stderrBuf += line + '\n'; })
        .on('error', () => {
          // Fallback to libwebp without _anim suffix (some ffmpeg builds)
          stderrBuf = '';
          ffmpeg(inputFile)
            .setFfmpegPath(ffmpegPath)
            .inputOptions(['-t', '6'])
            .outputOptions([
              '-vf', VF_ANIM(fps),
              '-c:v', 'libwebp',
              '-loop', '0',
              '-an',
              '-q:v', '55',
              '-y',
            ])
            .toFormat('webp')
            .on('stderr', (line) => { stderrBuf += line + '\n'; })
            .on('error', (err) => {
              const lastLines = stderrBuf.trim().split('\n').slice(-4).join(' | ');
              reject(new Error(lastLines || err.message));
            })
            .on('end', resolve)
            .save(outputFile);
        })
        .on('end', resolve)
        .save(outputFile);
    });

    const webpBuffer = await fs.readFile(outputFile);
    if (webpBuffer.length < 100) throw new Error('Sticker animado vacío');
    return await addStickerMeta(webpBuffer);
  } finally {
    await cleanTemp(inputFile);
    await cleanTemp(outputFile);
  }
}

async function gifToSticker(gifBuffer) {
  return videoToSticker(gifBuffer);
}

function buildExif(pack, author) {
  const json = JSON.stringify({
    'sticker-pack-id': 'com.itsseb4s.daddysbot',
    'sticker-pack-name': pack,
    'sticker-pack-publisher': author,
    'emojis': [],
  });
  const jsonBuf = Buffer.from(json, 'utf-8');

  const header = Buffer.from([
    0x49, 0x49,
    0x2A, 0x00,
    0x08, 0x00, 0x00, 0x00,
  ]);

  const ifd = Buffer.alloc(2 + 12 + 4);
  ifd.writeUInt16LE(1, 0);
  ifd.writeUInt16LE(0x9286, 2);
  ifd.writeUInt16LE(0x0002, 4);
  ifd.writeUInt32LE(jsonBuf.length, 6);
  ifd.writeUInt32LE(header.length + ifd.length, 10);
  ifd.writeUInt32LE(0, 14);

  return Buffer.concat([header, ifd, jsonBuf]);
}

async function addStickerMeta(webpBuffer) {
  try {
    const exif = buildExif(config.sticker.pack, config.sticker.author);
    const img = new webpmux.Image();
    await img.load(webpBuffer);
    img.exif = exif;
    return await img.save(null);
  } catch {
    return webpBuffer;
  }
}

module.exports = { imageToSticker, videoToSticker, gifToSticker };
