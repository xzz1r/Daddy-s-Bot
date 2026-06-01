const { spawn, execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { tempFile, cleanTemp } = require('./helpers');
const logger = require('./logger');

function detectYtDlp() {
  const candidates = [
    '/data/data/com.termux/files/home/.local/bin/yt-dlp',
    '/data/data/com.termux/files/usr/bin/yt-dlp',
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const which = execSync('command -v yt-dlp 2>/dev/null || which yt-dlp 2>/dev/null', { encoding: 'utf8' }).trim();
    if (which) return which;
  } catch {}
  return 'yt-dlp';
}

const YT_DLP = detectYtDlp();
// 'android' es el cliente más rápido y el que mejor funciona sin firmas
const PLAYER_CLIENTS = 'android,tv_embedded';

// Global cap on concurrent yt-dlp downloads. Each one can hold a CPU core for
// up to 3 minutes; on Termux/low-RAM hosts, 5 people spamming !play at once
// would spawn 5 processes and OOM or thrash the device. Extra requests queue
// here and run as slots free up. The per-user 7s cooldown in the handler
// throttles spam; this bounds the worst case regardless.
const MAX_CONCURRENT_DOWNLOADS = 2;
let activeDownloads = 0;
const downloadQueue = [];

function acquireDownloadSlot() {
  return new Promise((resolve) => {
    const tryRun = () => {
      if (activeDownloads < MAX_CONCURRENT_DOWNLOADS) {
        activeDownloads++;
        resolve();
      } else {
        downloadQueue.push(tryRun);
      }
    };
    tryRun();
  });
}

function releaseDownloadSlot() {
  activeDownloads--;
  const next = downloadQueue.shift();
  if (next) next();
}

// Spawn yt-dlp with a 3-minute timeout to prevent silent hangs
function ytdlp(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YT_DLP, args);
    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('yt-dlp timeout (3 min)'));
    }, 180000);

    proc.stdout?.on('data', (d) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`yt-dlp no se pudo ejecutar: ${err.message}`));
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else {
        const cleanErr = stderr.split('\n').filter(l => l.startsWith('ERROR:')).pop()
          || stderr.trim().split('\n').pop()
          || `código ${code}`;
        reject(new Error(cleanErr.replace(/^ERROR:\s*/, '')));
      }
    });
  });
}

async function downloadAudio(videoUrl) {
  await acquireDownloadSlot();
  try {
    return await runDownload(videoUrl);
  } finally {
    releaseDownloadSlot();
  }
}

async function runDownload(videoUrl) {
  const baseName = `audio_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tempDir = path.dirname(tempFile('tmp'));
  const outTemplate = path.join(tempDir, `${baseName}__%(title).80B.%(ext)s`);

  await ytdlp([
    videoUrl,
    // Prefer YouTube's native m4a/AAC audio stream (itag 140, ~128kbps) so the
    // postprocessor just remuxes (-c:a copy) instead of re-encoding the whole
    // file. Dropping --audio-quality is what enables the copy: any explicit
    // quality forces a full ffmpeg transcode, the slowest step on Termux CPUs.
    // The /bestaudio/best fallbacks are mandatory: some videos (or certain
    // player clients) expose no audio-only stream, and without a final 'best'
    // catch-all yt-dlp aborts with "Requested format is not available".
    '-f', 'bestaudio[ext=m4a]/bestaudio/best',
    '-x',
    '--audio-format', 'm4a',
    '-o', outTemplate,
    '--no-playlist',
    '--no-warnings',
    '--no-part',
    '--max-filesize', '50M',
    '--no-mtime',
    '--socket-timeout', '20',
    '--extractor-args', `youtube:player_client=${PLAYER_CLIENTS}`,
  ]);

  const files = await fs.readdir(tempDir);
  const audioFile = files.find(f => f.startsWith(baseName));
  if (!audioFile) throw new Error('No se pudo descargar el audio');
  const fullPath = path.join(tempDir, audioFile);

  const stat = await fs.stat(fullPath);
  if (stat.size < 1024) {
    await cleanTemp(fullPath);
    throw new Error('Archivo descargado vacío');
  }

  const titleMatch = audioFile.match(/__(.+)\.[^.]+$/);
  const title = titleMatch ? titleMatch[1].trim() : 'Sin título';

  const ext = path.extname(audioFile).slice(1).toLowerCase();
  const mimetypes = {
    m4a:  'audio/mp4',
    mp4:  'audio/mp4',
    mp3:  'audio/mpeg',
    aac:  'audio/aac',
    ogg:  'audio/ogg',
    opus: 'audio/ogg; codecs=opus',
    webm: 'audio/webm',
  };

  return { filePath: fullPath, title, mimetype: mimetypes[ext] || 'audio/mp4', ext };
}

module.exports = { downloadAudio };
