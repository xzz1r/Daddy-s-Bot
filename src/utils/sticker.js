const { ffmpegPath } = require('./ffmpeg');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const webpmux = require('node-webpmux');
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

function addStickerMeta(webpBuffer) {
  const exif = buildExif(config.sticker.pack, config.sticker.author);
  // Binary injection is pure buffer ops — no parsing overhead, no double-load
  try {
    return injectExifIntoWebP(webpBuffer, exif);
  } catch {
    // Binary injection failed (corrupt/unusual WebP) — fall back to webpmux
    try {
      const img = new webpmux.Image();
      return img.load(webpBuffer).then(() => {
        img.exif = exif;
        return img.save(null);
      }).catch(() => webpBuffer);
    } catch {
      return webpBuffer;
    }
  }
}

async function imageToSticker(imageBuffer) {
  const ext = detectExt(imageBuffer);
  if (!ext) throw new Error('Formato de imagen no reconocido');

  // WebP: inject metadata directly — no ffmpeg needed
  if (ext === 'webp') return addStickerMeta(imageBuffer);

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
    return addStickerMeta(webpBuffer);
  } finally {
    await cleanTemp(inputFile);
    await cleanTemp(outputFile);
  }
}

const MAX_STICKER_BYTES = 490 * 1024;

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

// Tiers only used if first encode exceeds WhatsApp's 500 KB limit (rare for ≤10s videos)
const FALLBACK_TIERS = [
  { fps: 8, quality: 65 },
  { fps: 6, quality: 55 },
  { fps: 5, quality: 45 },
];

async function videoToSticker(videoBuffer) {
  const detected = detectExt(videoBuffer);

  // WebP: inject metadata directly — no ffmpeg needed
  if (detected === 'webp') return addStickerMeta(videoBuffer);

  const ext = detected || 'mp4';
  const inputFile = tempFile(ext);
  const outputFile = tempFile('webp');
  await fs.writeFile(inputFile, videoBuffer);

  try {
    // First attempt: best quality (10fps, q75) — covers virtually all ≤10s videos
    await encodeAnimWebp(inputFile, outputFile, 10, 75);
    let buf = await fs.readFile(outputFile);
    if (buf.length < 100) throw new Error('Sticker animado vacío');

    // Only re-encode if over WhatsApp's limit (heavy video or long duration)
    if (buf.length > MAX_STICKER_BYTES) {
      for (const { fps, quality } of FALLBACK_TIERS) {
        await encodeAnimWebp(inputFile, outputFile, fps, quality);
        buf = await fs.readFile(outputFile);
        if (buf.length <= MAX_STICKER_BYTES) break;
      }
    }

    return addStickerMeta(buf);
  } finally {
    await cleanTemp(inputFile);
    await cleanTemp(outputFile);
  }
}

async function gifToSticker(gifBuffer) {
  return videoToSticker(gifBuffer);
}

module.exports = { imageToSticker, videoToSticker, gifToSticker };
