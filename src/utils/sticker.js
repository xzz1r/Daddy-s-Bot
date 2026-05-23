const { ffmpegPath } = require('./ffmpeg');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const webpmux = require('node-webpmux');
const { tempFile, cleanTemp } = require('./helpers');
const config = require('../config');

ffmpeg.setFfmpegPath(ffmpegPath);

// Detect format from magic bytes so ffmpeg gets a proper extension
function detectExt(buffer) {
  if (!buffer || buffer.length < 12) return 'jpg';
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'jpg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'gif';
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer.slice(8, 12).toString() === 'WEBP') return 'webp';
  return 'jpg';
}

const SCALE_VF = 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba';

async function imageToSticker(imageBuffer) {
  const ext = detectExt(imageBuffer);
  const inputFile = tempFile(ext);
  const outputFile = tempFile('webp');

  await fs.writeFile(inputFile, imageBuffer);

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .setFfmpegPath(ffmpegPath)
        .outputOptions([
          '-vf', SCALE_VF,
          '-quality', '95',
          '-compression_level', '4',
          '-loop', '0',
          '-an',
          '-vsync', '0',
        ])
        .toFormat('webp')
        .on('error', reject)
        .on('end', resolve)
        .save(outputFile);
    });

    const webpBuffer = await fs.readFile(outputFile);
    return await addStickerMeta(webpBuffer);
  } finally {
    await cleanTemp(inputFile);
    await cleanTemp(outputFile);
  }
}

async function videoToSticker(videoBuffer) {
  const ext = detectExt(videoBuffer) === 'webp' ? 'webp' : 'mp4';
  const inputFile = tempFile(ext);
  const outputFile = tempFile('webp');

  await fs.writeFile(inputFile, videoBuffer);

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .setFfmpegPath(ffmpegPath)
        .inputOptions(['-t', '6'])
        .outputOptions([
          '-vf', `fps=${config.sticker.fps},${SCALE_VF}`,
          '-loop', '0',
          '-preset', 'default',
          '-an',
          '-vsync', '0',
          '-compression_level', '6',
          '-quality', '75',
          '-qmin', '0',
          '-qmax', '50',
        ])
        .toFormat('webp')
        .on('error', reject)
        .on('end', resolve)
        .save(outputFile);
    });

    const webpBuffer = await fs.readFile(outputFile);
    return await addStickerMeta(webpBuffer);
  } finally {
    await cleanTemp(inputFile);
    await cleanTemp(outputFile);
  }
}

async function gifToSticker(gifBuffer) {
  const inputFile = tempFile('gif');
  const outputFile = tempFile('webp');

  await fs.writeFile(inputFile, gifBuffer);

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .setFfmpegPath(ffmpegPath)
        .outputOptions([
          '-vf', `fps=${config.sticker.fps},${SCALE_VF}`,
          '-loop', '0',
          '-preset', 'default',
          '-an',
          '-vsync', '0',
          '-compression_level', '6',
          '-quality', '75',
        ])
        .toFormat('webp')
        .on('error', reject)
        .on('end', resolve)
        .save(outputFile);
    });

    const webpBuffer = await fs.readFile(outputFile);
    return await addStickerMeta(webpBuffer);
  } finally {
    await cleanTemp(inputFile);
    await cleanTemp(outputFile);
  }
}

// Build proper WhatsApp sticker EXIF blob (raw TIFF)
function buildExif(pack, author) {
  const json = JSON.stringify({
    'sticker-pack-id': 'com.itsseb4s.daddysbot',
    'sticker-pack-name': pack,
    'sticker-pack-publisher': author,
    'emojis': [],
  });
  const jsonBuf = Buffer.from(json, 'utf-8');

  // TIFF header (little-endian)
  const header = Buffer.from([
    0x49, 0x49,             // "II" byte order
    0x2A, 0x00,             // 42 magic
    0x08, 0x00, 0x00, 0x00, // offset to IFD0 = 8
  ]);

  // IFD0: 1 entry + 4 bytes next-IFD offset
  const ifd = Buffer.alloc(2 + 12 + 4);
  ifd.writeUInt16LE(1, 0);                            // 1 entry
  ifd.writeUInt16LE(0x9286, 2);                       // tag: UserComment
  ifd.writeUInt16LE(0x0002, 4);                       // type: ASCII
  ifd.writeUInt32LE(jsonBuf.length, 6);               // count
  ifd.writeUInt32LE(header.length + ifd.length, 10);  // value offset (after IFD)
  ifd.writeUInt32LE(0, 14);                           // next IFD = 0

  return Buffer.concat([header, ifd, jsonBuf]);
}

async function addStickerMeta(webpBuffer) {
  try {
    const pack = config.sticker.pack;
    const author = config.sticker.author;
    const exif = buildExif(pack, author);

    const img = new webpmux.Image();
    await img.load(webpBuffer);
    img.exif = exif;
    const out = await img.save(null);
    return out;
  } catch (err) {
    // If metadata injection fails for any reason, return the bare webp
    // so the sticker still gets sent (just without author info)
    return webpBuffer;
  }
}

module.exports = { imageToSticker, videoToSticker, gifToSticker };
