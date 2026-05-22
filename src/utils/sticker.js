const sharp = require('sharp');
const { ffmpegPath } = require('./ffmpeg');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const { tempFile, cleanTemp } = require('./helpers');
const config = require('../config');

ffmpeg.setFfmpegPath(ffmpegPath);

async function imageToSticker(imageBuffer) {
  const resized = await sharp(imageBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: config.sticker.quality, lossless: false })
    .toBuffer();

  return addStickerMeta(resized);
}

async function videoToSticker(videoBuffer) {
  const inputFile = tempFile('mp4');
  const outputFile = tempFile('webp');

  await fs.writeFile(inputFile, videoBuffer);

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .setFfmpegPath(ffmpegPath)
        .inputOptions(['-t 6'])
        .outputOptions([
          '-vf', `fps=${config.sticker.fps},scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba`,
          '-loop', '0',
          '-preset', 'default',
          '-an',
          '-vsync', '0',
          '-compression_level', '0',
          '-quality', '100',
          '-qmin', '0',
          '-qmax', '0',
        ])
        .toFormat('webp')
        .on('error', reject)
        .on('end', resolve)
        .save(outputFile);
    });

    const webpBuffer = await fs.readFile(outputFile);
    return addStickerMeta(webpBuffer);
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
          '-vf', `fps=${config.sticker.fps},scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba`,
          '-loop', '0',
          '-preset', 'default',
          '-an',
          '-vsync', '0',
          '-quality', '100',
        ])
        .toFormat('webp')
        .on('error', reject)
        .on('end', resolve)
        .save(outputFile);
    });

    const webpBuffer = await fs.readFile(outputFile);
    return addStickerMeta(webpBuffer);
  } finally {
    await cleanTemp(inputFile);
    await cleanTemp(outputFile);
  }
}

function addStickerMeta(webpBuffer) {
  const pack = config.sticker.pack;     // "Ur daddy"
  const author = config.sticker.author; // "ItsSeb4s"

  const json = JSON.stringify({
    'sticker-pack-id': 'itsseb4s-urdaddy',
    'sticker-pack-name': pack,
    'sticker-pack-publisher': author,
  });
  const jsonBuffer = Buffer.from(json, 'utf-8');
  const exifBuffer = Buffer.alloc(jsonBuffer.length + 22);

  exifBuffer.writeUInt32BE(jsonBuffer.length + 18, 0);
  exifBuffer.write('Exif\0\0', 4, 'binary');
  exifBuffer.write('II', 10, 'binary');
  exifBuffer.writeUInt16LE(42, 12);
  exifBuffer.writeUInt32LE(8, 14);
  exifBuffer.writeUInt16LE(1, 18);
  exifBuffer.writeUInt16LE(0x9286, 20);
  exifBuffer.writeUInt16LE(2, 22);
  exifBuffer.writeUInt32LE(jsonBuffer.length, 24);
  exifBuffer.writeUInt32LE(0, 28);
  jsonBuffer.copy(exifBuffer, 32);

  try {
    const riff = webpBuffer.slice(0, 4).toString();
    if (riff !== 'RIFF') return webpBuffer;
    const webp = webpBuffer.slice(8, 12).toString();
    if (webp !== 'WEBP') return webpBuffer;

    let hasVP8X = false;
    let insertPos = 12;

    while (insertPos < webpBuffer.length) {
      const chunk = webpBuffer.slice(insertPos, insertPos + 4).toString();
      if (chunk === 'VP8X') { hasVP8X = true; break; }
      if (chunk === 'VP8 ' || chunk === 'VP8L') break;
      const chunkSize = webpBuffer.readUInt32LE(insertPos + 4);
      insertPos += 8 + chunkSize + (chunkSize % 2);
    }

    if (hasVP8X) {
      const flags = webpBuffer.readUInt8(insertPos + 8);
      webpBuffer.writeUInt8(flags | 0x08, insertPos + 8);
    }

    const exifChunk = Buffer.alloc(8 + exifBuffer.length);
    exifChunk.write('EXIF', 0);
    exifChunk.writeUInt32LE(exifBuffer.length, 4);
    exifBuffer.copy(exifChunk, 8);

    return Buffer.concat([webpBuffer, exifChunk]);
  } catch {
    return webpBuffer;
  }
}

module.exports = { imageToSticker, videoToSticker, gifToSticker };
