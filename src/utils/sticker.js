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

// Extract the first ANMF frame from an animated WebP as a minimal static WebP.
// Used to generate a thumbnail without needing ffmpeg's animated WebP decoder.
function extractFirstAnmfFrame(animBuf) {
  if (!animBuf || animBuf.length < 12) return null;
  let pos = 12;
  while (pos + 8 <= animBuf.length) {
    const chunkType = animBuf.slice(pos, pos + 4).toString();
    const chunkSize = animBuf.readUInt32LE(pos + 4);
    if (chunkType === 'ANMF' && chunkSize > 16) {
      const frameChunk = animBuf.slice(pos + 24, pos + 8 + chunkSize);
      const riffSize = 4 + frameChunk.length;
      const out = Buffer.allocUnsafe(8 + riffSize);
      out.write('RIFF', 0, 'ascii');
      out.writeUInt32LE(riffSize, 4);
      out.write('WEBP', 8, 'ascii');
      frameChunk.copy(out, 12);
      return out;
    }
    pos += 8 + chunkSize + (chunkSize % 2);
  }
  return null;
}

// Generate a small PNG thumbnail from an animated WebP.
// WhatsApp needs pngThumbnail on animated stickers to enable saving and forwarding.
async function generateAnimatedThumb(animBuf) {
  const frameBuf = extractFirstAnmfFrame(animBuf);
  if (!frameBuf) return null;
  const inputFile = tempFile('webp');
  const outputFile = tempFile('png');
  await fs.writeFile(inputFile, frameBuf);
  try {
    await runFfmpeg(inputFile, outputFile, [
      '-vframes', '1',
      '-vf', 'scale=96:96:force_original_aspect_ratio=decrease',
      '-y',
    ], 'image2');
    const buf = await fs.readFile(outputFile);
    return buf.length > 100 ? buf : null;
  } catch {
    return null;
  } finally {
    await cleanTemp(inputFile);
    await cleanTemp(outputFile);
  }
}

const VF_STATIC = 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000';
const VF_ANIM = (fps) => `fps=${fps},scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000`;

function runFfmpeg(inputFile, outputFile, options, format = 'webp') {
  return new Promise((resolve, reject) => {
    let stderrBuf = '';
    ffmpeg(inputFile)
      .setFfmpegPath(ffmpegPath)
      .outputOptions(options)
      .toFormat(format)
      .on('stderr', (line) => { stderrBuf += line + '\n'; })
      .on('error', (err) => {
        const lastLines = stderrBuf.trim().split('\n').slice(-4).join(' | ');
        reject(new Error(lastLines || err.message));
      })
      .on('end', resolve)
      .save(outputFile);
  });
}

// WhatsApp-specific EXIF: TIFF wrapper with custom tag 0x5741 ('WA' LE) type UNDEFINED (7).
// This is the format WhatsApp actually reads for sticker pack metadata — the standard
// EXIF UserComment (0x9286) does NOT work even though it's technically valid EXIF.
function buildExif(pack, author) {
  const json = JSON.stringify({
    'sticker-pack-id': 'com.xz1s.daddysbot',
    'sticker-pack-name': pack,
    'sticker-pack-publisher': author,
    'emojis': [''],
  });
  const data = Buffer.from(json, 'utf-8');

  const header = Buffer.from([
    0x49, 0x49, 0x2A, 0x00,             // TIFF magic (II, little-endian)
    0x08, 0x00, 0x00, 0x00,             // first IFD offset = 8
    0x01, 0x00,                         // 1 IFD entry
    0x41, 0x57,                         // tag 0x5741 ('WA' little-endian) — WhatsApp custom
    0x07, 0x00,                         // type 7 (UNDEFINED)
    0x00, 0x00, 0x00, 0x00,             // count (filled below)
    0x16, 0x00, 0x00, 0x00,             // data offset = 22
  ]);
  header.writeUInt32LE(data.length, 14);

  return Buffer.concat([header, data]);
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

function addStickerMeta(webpBuffer, author) {
  const exif = buildExif(config.sticker.pack, author || config.sticker.author);
  // Pure buffer ops — no parsing overhead, no double-load. If it ever throws on
  // a malformed WebP, ship the sticker without pack metadata instead of dragging
  // in a heavy parser as a fallback (node-webpmux used to be that fallback).
  try {
    return injectExifIntoWebP(webpBuffer, exif);
  } catch (err) {
    logger.warn(`addStickerMeta: binary inject failed, sending without pack: ${err.message}`);
    return webpBuffer;
  }
}

async function imageToSticker(imageBuffer, author) {
  const ext = detectExt(imageBuffer);
  if (!ext) throw new Error('Formato de imagen no reconocido');

  // WebP: inject metadata directly — no ffmpeg needed
  if (ext === 'webp') return addStickerMeta(imageBuffer, author);

  const inputFile = tempFile(ext);
  const outputFile = tempFile('webp');
  await fs.writeFile(inputFile, imageBuffer);

  try {
    await runFfmpeg(inputFile, outputFile, [
      '-vf', VF_STATIC,
      '-c:v', 'libwebp',
      '-frames:v', '1',
      '-q:v', '80',
      '-compression_level', '2',
      '-an',
      '-y',
    ]);
    const webpBuffer = await fs.readFile(outputFile);
    if (webpBuffer.length < 100) throw new Error('Sticker generado vacío');
    return addStickerMeta(webpBuffer, author);
  } finally {
    await cleanTemp(inputFile);
    await cleanTemp(outputFile);
  }
}

// WhatsApp's real animated sticker limit is ~1MB
const MAX_STICKER_BYTES = 1024 * 1024;

// Tiers: quality drops before FPS to keep motion smooth
const ANIM_TIERS = [
  { fps: 20, quality: 82 },
  { fps: 20, quality: 72 },
  { fps: 15, quality: 72 },
  { fps: 15, quality: 62 },
  { fps: 15, quality: 52 },
  { fps: 12, quality: 52 },
];

function encodeAnimWebp(inputFile, outputFile, fps, quality) {
  return new Promise((resolve, reject) => {
    let stderrBuf = '';
    const runWithCodec = (codec) => {
      stderrBuf = '';
      ffmpeg(inputFile)
        .setFfmpegPath(ffmpegPath)
        .outputOptions([
          '-vf', VF_ANIM(fps),
          '-c:v', codec,
          '-loop', '0',
          '-an',
          '-q:v', String(quality),
          '-compression_level', '2',
          '-preset', 'default',
          '-y',
        ])
        .toFormat('webp')
        .on('stderr', (line) => { stderrBuf += line + '\n'; })
        .on('error', () => {
          if (codec === 'libwebp_anim') {
            runWithCodec('libwebp');
          } else {
            const lastLines = stderrBuf.trim().split('\n').slice(-4).join(' | ');
            reject(new Error(lastLines || 'ffmpeg error'));
          }
        })
        .on('end', resolve)
        .save(outputFile);
    };
    runWithCodec('libwebp_anim');
  });
}

async function videoToSticker(videoBuffer, author) {
  const detected = detectExt(videoBuffer);

  if (detected === 'webp') return addStickerMeta(videoBuffer, author);

  const ext = detected || 'mp4';
  const inputFile = tempFile(ext);
  const outputFile = tempFile('webp');
  await fs.writeFile(inputFile, videoBuffer);

  try {
    let buf = null;
    for (const { fps, quality } of ANIM_TIERS) {
      await encodeAnimWebp(inputFile, outputFile, fps, quality);
      buf = await fs.readFile(outputFile);
      if (buf.length >= 100 && buf.length <= MAX_STICKER_BYTES) break;
    }
    if (!buf || buf.length < 100) throw new Error('Sticker animado vacío');
    return addStickerMeta(buf, author);
  } finally {
    await cleanTemp(inputFile);
    await cleanTemp(outputFile);
  }
}

async function gifToSticker(gifBuffer, author) {
  return videoToSticker(gifBuffer, author);
}

module.exports = { imageToSticker, videoToSticker, gifToSticker, generateAnimatedThumb };
