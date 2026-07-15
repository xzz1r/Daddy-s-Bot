const { spawn, execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { tempFile, cleanTemp } = require('./helpers');
const logger = require('./logger');

// Fuentes de música, en cadena, para conseguir siempre la canción COMPLETA:
//   1. SoundCloud: sin bot-check ni login. Rápido. Problema: algunos temas de
//      sello solo exponen un preview de 30s. Por eso se prueban varios resultados
//      y se DESCARTA cualquier archivo demasiado corto (preview), quedándose con
//      la primera versión completa (suele haber re-subidas completas del tema).
//   2. YouTube (vía POT provider): completas y con la mejor cobertura. Se usa como
//      respaldo cuando SoundCloud no tiene la versión completa. El POT resuelve el
//      bot-check en la mayoría de videos sin cookies (ver setup-potoken.sh).
// Nunca se envía un preview: si nada da una pista completa, se avisa "no encontré".

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

// Un archivo de audio por debajo de esto se considera preview/recorte, no una
// canción completa. Los previews de SoundCloud duran ~30s; el umbral los descarta
// sin descartar temas cortos reales normales.
const MIN_FULL_SECONDS = 45;
// Cuántos resultados de SoundCloud probar buscando una versión completa.
const SC_CANDIDATES = 4;

// ── POT (solo para el respaldo de YouTube) ────────────────────────────────────
// yt-dlp descubre el plugin del POT por HOME (~/.config/yt-dlp/plugins). Bajo pm2
// el bot puede correr con otro HOME y no encontrarlo; por eso detectamos la ruta
// absoluta y forzamos ese HOME en el proceso hijo. Si no hay POT instalado, el
// respaldo de YouTube simplemente no encontrará token y fallará (y ya habremos
// intentado SoundCloud primero).
function detectPluginDir() {
  const candidates = [
    process.env.YT_PLUGIN_DIR,
    path.join(require('os').homedir() || '', '.config/yt-dlp/plugins'),
    '/home/ubuntu/.config/yt-dlp/plugins',
    '/root/.config/yt-dlp/plugins',
    process.env.HOME ? path.join(process.env.HOME, '.config/yt-dlp/plugins') : null,
  ].filter(Boolean);
  for (const p of candidates) {
    try { if (fs.existsSync(path.join(p, 'yt_dlp_plugins'))) return p; } catch {}
  }
  return null;
}

const PLUGIN_DIR = detectPluginDir();
const PLUGIN_HOME = PLUGIN_DIR ? PLUGIN_DIR.replace(/\/\.config\/yt-dlp\/plugins\/?$/, '') : null;
console.log(PLUGIN_DIR
  ? `  YouTube POT (respaldo) : ${PLUGIN_DIR} (HOME=${PLUGIN_HOME})`
  : '  YouTube POT (respaldo) : no instalado (solo SoundCloud)');

function pluginArgs() {
  return PLUGIN_DIR ? ['--plugin-dirs', PLUGIN_DIR, '--plugin-dirs', 'default'] : [];
}

// Entorno del yt-dlp hijo: replica el HOME donde vive el plugin del POT y limpia
// variables que rompen el binario congelado (PyInstaller trae su propio Python).
function ytdlpEnv() {
  const env = { ...process.env };
  delete env.PYTHONPATH;
  delete env.PYTHONHOME;
  if (PLUGIN_HOME) {
    env.HOME = PLUGIN_HOME;
    env.XDG_CONFIG_HOME = path.join(PLUGIN_HOME, '.config');
    env.PATH = [env.PATH, '/usr/local/bin', '/usr/bin', '/bin',
      path.join(PLUGIN_HOME, '.deno/bin'), path.join(PLUGIN_HOME, '.local/bin')].filter(Boolean).join(':');
  }
  return env;
}

// ── Control de concurrencia ───────────────────────────────────────────────────
const MAX_CONCURRENT_DOWNLOADS = 2;
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

// Spawn yt-dlp con timeout de 3 min y kill del grupo de procesos (por el ffmpeg
// hijo del remux). Devuelve stdout en éxito, rechaza con el error limpio si no.
function ytdlp(args, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YT_DLP, args, { detached: true, env: ytdlpEnv() });
    let stdout = '';
    let stderr = '';
    const killGroup = () => {
      try { process.kill(-proc.pid, 'SIGKILL'); }
      catch { try { proc.kill('SIGKILL'); } catch {} }
    };
    const timer = setTimeout(() => { killGroup(); reject(new Error('yt-dlp timeout')); }, timeoutMs);
    proc.stdout?.on('data', (d) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', (err) => { clearTimeout(timer); reject(new Error(`yt-dlp no se pudo ejecutar: ${err.message}`)); });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else {
        const cleanErr = stderr.split('\n').filter(l => l.startsWith('ERROR:')).pop()
          || stderr.trim().split('\n').pop() || `código ${code}`;
        reject(new Error(cleanErr.replace(/^ERROR:\s*/, '')));
      }
    });
  });
}

// Duración real del audio con ffprobe. Devuelve null si no se puede medir (en ese
// caso no descartamos: mejor enviar que rechazar por no poder medir).
function audioDuration(file) {
  return new Promise((resolve) => {
    let out = '';
    let proc;
    try {
      proc = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', file]);
    } catch { return resolve(null); }
    const timer = setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} resolve(null); }, 15000);
    proc.stdout?.on('data', (d) => { out += d.toString(); });
    proc.on('error', () => { clearTimeout(timer); resolve(null); });
    proc.on('close', () => { clearTimeout(timer); const n = parseFloat(out.trim()); resolve(Number.isFinite(n) ? n : null); });
  });
}

const MIMETYPES = {
  m4a: 'audio/mp4', mp4: 'audio/mp4', mp3: 'audio/mpeg', aac: 'audio/aac',
  ogg: 'audio/ogg', opus: 'audio/ogg; codecs=opus', webm: 'audio/webm',
};

async function cleanupPartials(tempDir, baseName) {
  try {
    const files = await fs.readdir(tempDir);
    await Promise.all(files.filter(f => f.startsWith(baseName))
      .map(f => fs.remove(path.join(tempDir, f)).catch(() => {})));
  } catch {}
}

// Descarga un objetivo (URL directa o "scsearch1:.."/"ytsearch1:..") con args
// extra, valida que NO sea un preview corto y devuelve el resultado. Lanza
// 'preview' si el audio es demasiado corto para ser la canción completa.
async function fetchAudio(target, extraArgs) {
  const baseName = `audio_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tempDir = path.dirname(tempFile('tmp'));
  const outTemplate = path.join(tempDir, `${baseName}__%(title).80B.%(ext)s`);
  try {
    await ytdlp([
      target,
      ...extraArgs,
      '-f', 'bestaudio/best',
      '-o', outTemplate,
      '--no-playlist', '--no-warnings', '--no-part',
      '--max-filesize', '25M', '--no-mtime', '--socket-timeout', '20',
    ]);
    const files = await fs.readdir(tempDir);
    const audioFile = files.find(f => f.startsWith(baseName));
    if (!audioFile) throw new Error('No se encontró la canción');
    const fullPath = path.join(tempDir, audioFile);

    const stat = await fs.stat(fullPath);
    if (stat.size < 1024) { await cleanTemp(fullPath); throw new Error('Archivo vacío'); }

    // Rechaza previews: si dura menos del umbral, no es la canción completa.
    const dur = await audioDuration(fullPath);
    if (dur != null && dur < MIN_FULL_SECONDS) {
      await cleanTemp(fullPath);
      const e = new Error('preview'); e.isPreview = true; throw e;
    }

    const titleMatch = audioFile.match(/__(.+)\.[^.]+$/);
    const title = titleMatch ? titleMatch[1].trim() : 'Sin título';
    const ext = path.extname(audioFile).slice(1).toLowerCase();
    return { filePath: fullPath, title, mimetype: MIMETYPES[ext] || 'audio/mpeg', ext };
  } catch (err) {
    await cleanupPartials(tempDir, baseName);
    throw err;
  }
}

// Lista de URLs candidatas de SoundCloud para una búsqueda (metadatos, rápido).
async function soundcloudCandidates(query, n) {
  const clean = query.replace(/["\r\n]/g, ' ').trim();
  try {
    const out = await ytdlp([`scsearch${n}:${clean}`, '--flat-playlist', '--print', '%(url)s'], 30000);
    return out.split('\n').map(l => l.trim()).filter(u => /^https?:\/\//i.test(u));
  } catch {
    return [];
  }
}

// SoundCloud: prueba varios resultados y devuelve la primera versión COMPLETA.
async function trySoundCloud(query) {
  // URL directa de SoundCloud: descarga esa y valida.
  if (/soundcloud\.com/i.test(query)) return fetchAudio(query, []);

  const urls = await soundcloudCandidates(query, SC_CANDIDATES);
  if (!urls.length) throw new Error('sin resultados en SoundCloud');
  let lastErr = null;
  for (const url of urls) {
    try {
      return await fetchAudio(url, []);
    } catch (err) {
      lastErr = err;
      // preview u otro fallo: prueba el siguiente candidato.
      continue;
    }
  }
  throw lastErr || new Error('sin versión completa en SoundCloud');
}

// YouTube (respaldo): clientes que mejor aprovechan el POT, en orden, hasta que
// uno atraviese el bot-check.
async function tryYouTube(query) {
  const target = /^https?:\/\//i.test(query) ? query : `ytsearch1:${query.replace(/["\r\n]/g, ' ').trim()}`;
  const clients = ['mweb', 'web_embedded', 'android_vr', null];
  let lastErr = null;
  for (const client of clients) {
    const ea = client
      ? ['--extractor-args', `youtube:player_client=${client};skip=hls`]
      : ['--extractor-args', 'youtube:skip=hls'];
    try {
      return await fetchAudio(target, [...pluginArgs(), ...ea]);
    } catch (err) {
      lastErr = err;
      const blocked = /sign in to confirm|not a bot|confirm you'?re|requested format|unable to extract|403|forbidden|unable to download|nsig|failed to extract/i.test(err.message);
      if (blocked) continue; // bot-check u otro bloqueo: prueba el siguiente cliente
      if (err.isPreview) continue;
      throw err;
    }
  }
  throw lastErr || new Error('YouTube no disponible');
}

// Punto de entrada: SoundCloud (completa) primero; si no, YouTube (completa).
async function downloadAudio(query) {
  await acquireDownloadSlot();
  try {
    try {
      return await trySoundCloud(query);
    } catch (scErr) {
      logger.warn(`!play: SoundCloud no dio versión completa (${scErr.message}); probando YouTube`);
      try {
        return await tryYouTube(query);
      } catch (ytErr) {
        logger.warn(`!play: YouTube también falló (${ytErr.message})`);
        throw new Error('No se encontró la canción completa');
      }
    }
  } finally {
    releaseDownloadSlot();
  }
}

module.exports = { downloadAudio };
