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
// Clientes de reproducción a intentar. En IP de datacenter (VPS) YouTube exige
// cada vez más autenticación; estos son los que mejor rinden sin cookies, pero
// la solución fiable en un VPS es aportar cookies (ver COOKIES_FILE abajo).
const PLAYER_CLIENTS = 'android,tv_embedded,web_safari,mweb';

// Archivo de cookies de YouTube (formato Netscape) para saltar el bloqueo
// "Sign in to confirm you're not a bot" que YouTube aplica a las IP de
// datacenter. Es OPCIONAL: si el archivo existe, se pasa a yt-dlp con --cookies;
// si no, se intenta sin él (funciona a veces, falla otras según la IP). Ruta por
// defecto data/youtube_cookies.txt, o la que ponga la env YT_COOKIES_FILE.
const COOKIES_FILE = process.env.YT_COOKIES_FILE
  || path.join(__dirname, '../../data/youtube_cookies.txt');

function cookiesArgs() {
  try {
    if (fs.existsSync(COOKIES_FILE) && fs.statSync(COOKIES_FILE).size > 0) {
      return ['--cookies', COOKIES_FILE];
    }
  } catch {}
  return [];
}

// Global cap on concurrent yt-dlp downloads. Each one can hold a CPU core for
// up to 3 minutes; on Termux/low-RAM hosts, 5 people spamming !play at once
// would spawn 5 processes and OOM or thrash the device. Extra requests queue
// here and run as slots free up. The per-user 7s cooldown in the handler
// throttles spam; this bounds the worst case regardless.
const MAX_CONCURRENT_DOWNLOADS = 2;
// Bounds the worst-case wait: beyond this many queued requests, a new !play
// is rejected outright instead of joining a line that could take many
// minutes (each slot can hold a process for up to 3 min). Without a cap, a
// burst of requests just queues forever and the bot looks "stuck" rather
// than telling anyone to back off.
const MAX_QUEUED_DOWNLOADS = 8;
let activeDownloads = 0;
const downloadQueue = [];

function acquireDownloadSlot() {
  return new Promise((resolve, reject) => {
    const tryRun = () => {
      if (activeDownloads < MAX_CONCURRENT_DOWNLOADS) {
        activeDownloads++;
        resolve();
      } else if (downloadQueue.length < MAX_QUEUED_DOWNLOADS) {
        downloadQueue.push(tryRun);
      } else {
        reject(new Error('Hay demasiadas descargas en cola, intenta de nuevo en un momento'));
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
    // detached: true puts yt-dlp in its own process group. On timeout we then
    // SIGKILL the WHOLE group, not just yt-dlp — because yt-dlp spawns ffmpeg as
    // a child for audio extraction, and killing only the parent would orphan
    // that ffmpeg (reparented to init), leaving it burning CPU/RAM on the 1GB
    // box and accumulating across occurrences.
    const proc = spawn(YT_DLP, args, { detached: true });
    let stdout = '';
    let stderr = '';

    const killGroup = () => {
      try { process.kill(-proc.pid, 'SIGKILL'); }
      catch { try { proc.kill('SIGKILL'); } catch {} }
    };

    const timer = setTimeout(() => {
      killGroup();
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

// Remove any temp file this download wrote (matched by its unique baseName).
// Called on every error path so a timeout/kill/format-error doesn't leave a
// partial m4a behind — those would otherwise pile up in temp/ until the next
// restart (the boot sweep is the only other cleanup) and fill the small VPS disk.
async function cleanupPartials(tempDir, baseName) {
  try {
    const files = await fs.readdir(tempDir);
    await Promise.all(
      files.filter(f => f.startsWith(baseName))
        .map(f => fs.remove(path.join(tempDir, f)).catch(() => {}))
    );
  } catch {}
}

async function runDownload(videoUrl) {
  const baseName = `audio_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tempDir = path.dirname(tempFile('tmp'));
  const outTemplate = path.join(tempDir, `${baseName}__%(title).80B.%(ext)s`);

  try {
    await ytdlp([
    videoUrl,
    // Prefer YouTube's native m4a/AAC audio stream (itag 140, ~128kbps) so the
    // postprocessor just remuxes (-c:a copy) instead of re-encoding the whole
    // file. Dropping --audio-quality is what enables the copy: any explicit
    // quality forces a full ffmpeg transcode, the slowest step on Termux CPUs.
    // The /bestaudio/best fallbacks are mandatory: some videos (or certain
    // player clients) expose no audio-only stream, and without a final 'best'
    // catch-all yt-dlp aborts with "Requested format is not available".
    // Peso mínimo + velocidad máxima: preferimos el stream m4a de MENOR bitrate
    // (YouTube suele ofrecer un ~48k HE-AAC además del ~128k). Al ser m4a, yt-dlp
    // lo remuxea con -c copy (NO re-codifica) → rápido y ligero a la vez. Si no
    // hay uno de bajo bitrate, cae al m4a normal (igual copy), y solo como último
    // recurso a otro códec (ahí sí re-codifica, con el target de 96k de abajo).
    '-f', 'bestaudio[ext=m4a][abr<=100]/bestaudio[ext=m4a]/bestaudio/best',
    '-x',
    '--audio-format', 'm4a',
    // Solo aplica cuando hay que re-codificar un stream no-m4a: apunta a 96k
    // (más liviano que el 128k por defecto) en vez de conservar el bitrate alto.
    '--audio-quality', '96K',
    '-o', outTemplate,
    '--no-playlist',
    '--no-warnings',
    '--no-part',
    // music.js refuses to send anything over 25MB anyway — capping the
    // download at the same size stops yt-dlp from spending minutes fetching
    // a file that's guaranteed to be discarded right after.
    '--max-filesize', '25M',
    '--no-mtime',
    '--socket-timeout', '20',
    ...cookiesArgs(), // --cookies <file> si existe data/youtube_cookies.txt
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
  } catch (err) {
    await cleanupPartials(tempDir, baseName);
    throw err;
  }
}

module.exports = { downloadAudio };
