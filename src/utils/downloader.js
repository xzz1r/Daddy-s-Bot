const { spawn, execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { tempFile, cleanTemp } = require('./helpers');
const logger = require('./logger');

// Fuente de música: SoundCloud. A diferencia de YouTube, no aplica bot-check ni
// exige login/cookies en IP de datacenter, así que !play funciona de forma
// estable y autosostenible sin tokens, cuentas ni mantenimiento. yt-dlp trae el
// extractor de SoundCloud y resuelve el client_id solo; no hay que configurar
// nada. Búsqueda con scsearch1: (primer resultado más relevante).

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

// Global cap on concurrent yt-dlp downloads. Each one can hold a CPU core for
// up to 3 minutes; on low-RAM hosts, several people spamming !play at once would
// spawn many processes and thrash the box. Extra requests queue here and run as
// slots free up. The per-user cooldown in the handler throttles spam; this
// bounds the worst case regardless.
const MAX_CONCURRENT_DOWNLOADS = 2;
// Beyond this many queued requests, a new !play is rejected outright instead of
// joining a line that could take minutes. Without a cap, a burst just queues
// forever and the bot looks "stuck" rather than telling anyone to back off.
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

// Spawn yt-dlp with a 3-minute timeout to prevent silent hangs.
function ytdlp(args) {
  return new Promise((resolve, reject) => {
    // detached: true puts yt-dlp in its own process group. On timeout we then
    // SIGKILL the WHOLE group, not just yt-dlp — because yt-dlp may spawn ffmpeg
    // as a child (HLS remux), and killing only the parent would orphan that
    // ffmpeg (reparented to init), leaving it burning CPU/RAM on the small box.
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

// Resuelve el objetivo: si `query` ya es una URL de SoundCloud, se usa tal cual;
// si es texto, se busca en SoundCloud (scsearch1: = primer resultado).
function resolveTarget(query) {
  if (/^https?:\/\//i.test(query)) return query;
  // Escapa comillas/saltos que romperían el término de búsqueda.
  const clean = query.replace(/["\r\n]/g, ' ').trim();
  return `scsearch1:${clean}`;
}

async function downloadAudio(query) {
  const target = resolveTarget(query);
  await acquireDownloadSlot();
  try {
    return await runDownload(target);
  } finally {
    releaseDownloadSlot();
  }
}

// Remove any temp file this download wrote (matched by its unique baseName).
// Called on every error path so a timeout/kill doesn't leave a partial file
// behind that would pile up in temp/ and fill the small VPS disk.
async function cleanupPartials(tempDir, baseName) {
  try {
    const files = await fs.readdir(tempDir);
    await Promise.all(
      files.filter(f => f.startsWith(baseName))
        .map(f => fs.remove(path.join(tempDir, f)).catch(() => {}))
    );
  } catch {}
}

async function runDownload(target) {
  const baseName = `audio_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tempDir = path.dirname(tempFile('tmp'));
  const outTemplate = path.join(tempDir, `${baseName}__%(title).80B.%(ext)s`);

  try {
    await ytdlp([
      target,
      // Mejor audio disponible, SIN re-codificar: se descarga el stream nativo de
      // SoundCloud (normalmente MP3 128k progresivo) tal cual, o se remuxea sin
      // pérdida si es HLS. Así la calidad es idéntica a la fuente —no se degrada—
      // y es lo más rápido posible (no hay transcodificación).
      '-f', 'bestaudio/best',
      '-o', outTemplate,
      '--no-playlist',
      '--no-warnings',
      '--no-part',
      // music.js descarta cualquier cosa mayor de 25MB: capar aquí evita gastar
      // tiempo bajando un archivo que se va a descartar igual.
      '--max-filesize', '25M',
      '--no-mtime',
      '--socket-timeout', '20',
    ]);

    const files = await fs.readdir(tempDir);
    const audioFile = files.find(f => f.startsWith(baseName));
    if (!audioFile) throw new Error('No se encontró la canción');
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

    return { filePath: fullPath, title, mimetype: mimetypes[ext] || 'audio/mpeg', ext };
  } catch (err) {
    await cleanupPartials(tempDir, baseName);
    throw err;
  }
}

module.exports = { downloadAudio };
