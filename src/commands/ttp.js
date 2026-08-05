const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const { Readable } = require('stream');
const { ffmpegPath } = require('../utils/ffmpeg');
const { tempFile, cleanTemp, ffmpegSemaphore } = require('../utils/helpers');
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

  const outputFile = tempFile('webp');
  const lineFiles = [];   // one temp .txt per line — cleaned up in finally

  // try/finally guarantees temp files are removed even when ffmpeg rejects or
  // times out — otherwise every failed encode leaks files into temp/.
  try {
    // Each wrapped line goes to its own temp file referenced via drawtext's
    // textfile= option. This sidesteps ALL of ffmpeg's text= escaping pitfalls:
    // apostrophes ("don't"), colons, %, and backslashes used to terminate the
    // inline text='...' token early and crash the encode. With textfile= the
    // content is read verbatim, so any character the user types renders fine.
    const drawFilters = [];
    for (let idx = 0; idx < lines.length; idx++) {
      const tf = tempFile('txt');
      await fs.writeFile(tf, lines[idx]);
      lineFiles.push(tf);
      const y = startY + idx * lineHeight;
      drawFilters.push(
        `drawtext=fontfile='${font}':textfile='${tf}':expansion=none:fontcolor=white:fontsize=${fontSize}:x=(w-text_w)/2:y=${y}:borderw=4:bordercolor=black`
      );
    }
    const vf = drawFilters.join(',');

    // 512x512 RGBA transparent frame piped as rawvideo — avoids needing lavfi
    const blankFrame = Buffer.alloc(512 * 512 * 4, 0);
    const inputStream = new Readable({ read() {} });
    // Guard against EPIPE: if ffmpeg exits early (missing binary, filter error),
    // its stdin closes and this stream emits 'error'. Without a handler that's an
    // unhandled stream error → process crash. Swallow it; the ffmpeg 'error'
    // callback below already rejects the promise with the real reason.
    inputStream.on('error', () => {});
    inputStream.push(blankFrame);
    inputStream.push(null);

    await ffmpegSemaphore.acquire();
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
            '-vf', vf,
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
    } finally {
      ffmpegSemaphore.release();
    }

    return await fs.readFile(outputFile);
  } finally {
    await cleanTemp(outputFile);
    await Promise.all(lineFiles.map((f) => cleanTemp(f)));
  }
}

async function cmdTtp(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const text = (args || []).join(' ').trim();

  if (!text) {
    return; // sin texto no hay sticker
  }
  if (text.length > 120) {
    return sock.sendMessage(jid, { text: 'Máximo 120 caracteres.' }, { quoted: msg });
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
