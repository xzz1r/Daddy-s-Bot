const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const path = require('path');
const { Readable } = require('stream');
const { ffmpegPath } = require('../utils/ffmpeg');
const { tempFile, cleanTemp } = require('../utils/helpers');
const { imageToSticker } = require('../utils/sticker');
const { getSender } = require('../utils/wa');
const logger = require('../utils/logger');

ffmpeg.setFfmpegPath(ffmpegPath);

// Hard kill a stuck ffmpeg after this long (matches sticker.js).
const FFMPEG_TIMEOUT_MS = 45_000;

// Find a usable TTF/OTF font on the system (Termux/Android first, then Linux)
const FONT_CANDIDATES = [
  '/system/fonts/Roboto-Bold.ttf',
  '/system/fonts/Roboto-Regular.ttf',
  '/system/fonts/DroidSans-Bold.ttf',
  '/system/fonts/DroidSans.ttf',
  '/system/fonts/NotoSans-Bold.ttf',
  '/system/fonts/NotoSans-Regular.ttf',
  '/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
  '/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
];

let FONT_PATH = null;
function detectFont() {
  if (FONT_PATH !== null) return FONT_PATH;
  for (const p of FONT_CANDIDATES) {
    try { if (fs.existsSync(p)) { FONT_PATH = p; return p; } } catch {}
  }
  FONT_PATH = '';
  return '';
}

// Wrap text into lines so it fits in ~512px wide canvas
function wrapText(text, maxCharsPerLine = 16) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const w of words) {
    if (!current) { current = w; continue; }
    if ((current + ' ' + w).length <= maxCharsPerLine) current += ' ' + w;
    else { lines.push(current); current = w; }
  }
  if (current) lines.push(current);
  // Hard-wrap long single words
  return lines.flatMap((l) => {
    if (l.length <= maxCharsPerLine) return [l];
    const chunks = [];
    for (let i = 0; i < l.length; i += maxCharsPerLine) chunks.push(l.slice(i, i + maxCharsPerLine));
    return chunks;
  });
}

// Escape special chars for ffmpeg drawtext filter
function escapeForDrawtext(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%');
}

async function textToStickerBuffer(text) {
  const font = detectFont();
  if (!font) throw new Error('No encontré ninguna fuente del sistema para renderizar texto');

  const lines = wrapText(text, 14);
  const lineCount = lines.length;
  // Scale font size to fit
  let fontSize = 80;
  if (lineCount > 3) fontSize = 60;
  if (lineCount > 5) fontSize = 45;
  if (lineCount > 7) fontSize = 35;

  // Build a stack of drawtext filters, one per line, vertically centered
  const lineHeight = Math.round(fontSize * 1.1);
  const totalHeight = lineCount * lineHeight;
  const startY = Math.round((512 - totalHeight) / 2);

  const drawFilters = lines.map((line, idx) => {
    const y = startY + idx * lineHeight;
    return `drawtext=fontfile='${font}':text='${escapeForDrawtext(line)}':fontcolor=white:fontsize=${fontSize}:x=(w-text_w)/2:y=${y}:borderw=4:bordercolor=black`;
  }).join(',');

  const outputFile = tempFile('webp');

  // 512x512 RGBA transparent frame piped as rawvideo — avoids needing lavfi
  const blankFrame = Buffer.alloc(512 * 512 * 4, 0);
  const inputStream = new Readable({ read() {} });
  inputStream.push(blankFrame);
  inputStream.push(null);

  // try/finally guarantees the temp .webp is removed even when ffmpeg rejects or
  // times out — otherwise every failed encode leaks a file into temp/.
  try {
    await new Promise((resolve, reject) => {
      let stderr = '';
      let timer = null;
      const cmd = ffmpeg(inputStream)
        .setFfmpegPath(ffmpegPath)
        .inputOptions([
          '-f', 'rawvideo',
          '-pixel_format', 'rgba',
          '-video_size', '512x512',
          '-framerate', '1',
        ])
        .outputOptions([
          '-vf', drawFilters,
          '-c:v', 'libwebp',
          '-frames:v', '1',
          '-q:v', '90',
          '-pix_fmt', 'rgba',
          '-an',
          '-y',
        ])
        .toFormat('webp')
        .on('stderr', (l) => { stderr += l + '\n'; })
        .on('error', (err) => {
          if (timer) clearTimeout(timer);
          const last = stderr.trim().split('\n').slice(-4).join(' | ');
          reject(new Error(last || err.message));
        })
        .on('end', () => { if (timer) clearTimeout(timer); resolve(); });
      // Kill a hung encode instead of letting it pin a CPU core forever.
      timer = setTimeout(() => { try { cmd.kill('SIGKILL'); } catch {} reject(new Error('ffmpeg timeout')); }, FFMPEG_TIMEOUT_MS);
      cmd.save(outputFile);
    });

    return await fs.readFile(outputFile);
  } finally {
    await cleanTemp(outputFile);
  }
}

async function cmdTtp(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const text = (args || []).join(' ').trim();

  if (!text) {
    return sock.sendMessage(jid, { text: 'Usa: *!ttp* <texto>' }, { quoted: msg });
  }
  if (text.length > 120) {
    return sock.sendMessage(jid, { text: 'Maximo 120 caracteres.' }, { quoted: msg });
  }

  try {
    const senderJid = getSender(msg);
    const author = msg.pushName?.trim() || senderJid.split('@')[0].split(':')[0] || 'Anonimo';
    const buffer = await textToStickerBuffer(text);
    // Run through addStickerMeta by piping as WebP into imageToSticker (it'll hit the WebP bypass)
    const stickerBuffer = await imageToSticker(buffer, author);
    await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: msg });
  } catch (err) {
    logger.error(`TTP error: ${err.message}`);
    await sock.sendMessage(jid, { text: `Error al crear sticker: ${err.message}` }, { quoted: msg });
  }
}

module.exports = { cmdTtp };
