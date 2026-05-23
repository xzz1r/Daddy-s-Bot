const { ffmpegPath } = require('./ffmpeg');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const { tempFile, cleanTemp } = require('./helpers');
const config = require('../config');
const logger = require('./logger');

ffmpeg.setFfmpegPath(ffmpegPath);

function detectExt(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'jpg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'gif';
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer.slice(8, 12).toString() === 'WEBP') return 'webp';
  if (buffer.slice(4, 8).toString() === 'ftyp') return 'mp4';
  return null;
}

const VF_STATIC = 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000';
const VF_ANIM = (fps) => `fps=${fps},scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000`;

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

// Build TIFF-wrapped EXIF containing WhatsApp sticker pack JSON
function buildExif(pack, author) {
  const json = JSON.stringify({
    'sticker-pack-id': 'com.itsseb4s.daddysbot',
    'sticker-pack-name': pack,
    'sticker-pack-publisher': author,
    'emojis': [],
  });
  const data = Buffer.from(json, 'utf-8');
  // 8-byte TIFF header + 2-byte IFD count + 12-byte IFD entry + 4-byte next-IFD = 26 bytes before data
  const buf = Buffer.alloc(26 + data.length);
  buf[0] = 0x49; buf[1] = 0x49;          // II little-endian
  buf[2] = 0x2A; buf[3] = 0x00;          // TIFF magic
  buf.writeUInt32LE(8, 4);               // offset to first IFD
  buf.writeUInt16LE(1, 8);               // 1 IFD entry
  buf.writeUInt16LE(0x9286, 10);         // tag: UserComment
  buf.writeUInt16LE(0x0002, 12);         // type: ASCII
  buf.writeUInt32LE(data.length, 14);    // count
  buf.writeUInt32LE(26, 18);             // offset to data
  buf.writeUInt32LE(0, 22);              // next IFD = none
  data.copy(buf, 26);
  return buf;
}

// Inject EXIF chunk directly into WebP binary (RIFF manipulation)
function injectExifIntoWebP(webp, exifBuf) {
  if (webp.slice(0, 4).toString() !== 'RIFF') throw new Error('Not RIFF');
  if (webp.slice(8, 12).toString() !== 'WEBP') throw new Error('Not WebP');

  const chunkType = webp.slice(12, 16).toString();

  // Pad EXIF to even length (RIFF requirement)
  const exifPadded = exifBuf.length % 2 === 0 ? exifBuf : Buffer.concat([exifBuf, Buffer.alloc(1)]);
  const exifChunk = Buffer.alloc(8 + exifPadded.length);
  exifChunk.write('EXIF', 0, 'ascii');
  exifChunk.writeUInt32LE(exifBuf.length, 4);
  exifPadded.copy(exifChunk, 8);

  if (chunkType === 'VP8X') {
    const out = Buffer.from(webp);
    out[20] = out[20] | 0x08;  // set EXIF flag bit
    const result = Buffer.concat([out, exifChunk]);
    result.writeUInt32LE(result.length - 8, 4);
    return result;
  }

  // VP8 or VP8L: parse dimensions and wrap with VP8X
  let width = 512, height = 512;
  try {
    if (chunkType === 'VP8 ') {
      const scaledW = webp.readUInt16LE(26);
      const scaledH = webp.readUInt16LE(28);
      width = scaledW & 0x3FFF;
      height = scaledH & 0x3FFF;
    } else if (chunkType === 'VP8L') {
      // skip 'VP8L'(4) + size(4) + signature(1) = 21 bytes from file start, then at offset 21
      const bits = webp.readUInt32LE(21);
      width = (bits & 0x3FFF) + 1;
      height = ((bits >> 14) & 0x3FFF) + 1;
    }
  } catch {}

  // VP8X chunk: 'VP8X' + size(10) + flags(4) + canvas_width_minus_1(3) + canvas_height_minus_1(3)
  const vp8xChunk = Buffer.alloc(18);
  vp8xChunk.write('VP8X', 0, 'ascii');
  vp8xChunk.writeUInt32LE(10, 4);
  vp8xChunk.writeUInt32LE(0x08, 8);          // EXIF flag
  vp8xChunk.writeUIntLE(width - 1, 12, 3);
  vp8xChunk.writeUIntLE(height - 1, 15, 3);

  const originalChunks = webp.slice(12);     // VP8/VP8L chunk onwards
  const body = Buffer.concat([vp8xChunk, originalChunks, exifChunk]);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(body.length + 4, 4);
  header.write('WEBP', 8, 'ascii');
  return Buffer.concat([header, body]);
}

async function addStickerMeta(webpBuffer) {
  try {
    const exif = buildExif(config.sticker.pack, config.sticker.author);
    return injectExifIntoWebP(webpBuffer, exif);
  } catch (err) {
    logger.error(`EXIF injection failed: ${err.message}`);
    return webpBuffer;
  }
}

async function imageToSticker(imageBuffer) {
  const ext = detectExt(imageBuffer);
  if (!ext) throw new Error('Formato de imagen no reconocido');

  // WebP: ffmpeg decoder crashes on some builds; inject metadata directly
  if (ext === 'webp') return await addStickerMeta(imageBuffer);

  const inputFile = tempFile(ext);
  const outputFile = tempFile('webp');
  await fs.writeFile(inputFile, imageBuffer);

  const stat = await fs.stat(inputFile);
  if (stat.size === 0) {
    await cleanTemp(inputFile);
    throw new Error('Imagen vacía al guardar en disco');
  }

  try {
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

  // WebP sticker: ffmpeg decoder crashes; re-inject metadata directly
  if (detected === 'webp') return await addStickerMeta(videoBuffer);

  const ext = detected || 'mp4';
  const inputFile = tempFile(ext);
  const outputFile = tempFile('webp');
  await fs.writeFile(inputFile, videoBuffer);

  const stat = await fs.stat(inputFile);
  if (stat.size === 0) {
    await cleanTemp(inputFile);
    throw new Error('Video vacío al guardar en disco');
  }

  try {
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

module.exports = { imageToSticker, videoToSticker, gifToSticker };
