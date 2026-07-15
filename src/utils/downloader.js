const { spawn, execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const config = require('../config');
const { tempFile, cleanTemp } = require('./helpers');
const logger = require('./logger');

// Fuentes de música para !play, en cadena, buscando siempre la canción COMPLETA:
//   1. API de terceros (RapidAPI): extrae el audio de YouTube en la IP del
//      servicio, no en la nuestra, así se evita por completo el bot-check del
//      datacenter. Da canciones populares completas sin login ni tokens propios.
//      Necesita una key gratuita (config.rapidApiKey / RAPIDAPI_KEY en .env).
//   2. SoundCloud (respaldo, sin key ni límite): se prueban varios resultados y
//      se descarta cualquier preview de 30s midiendo la duración real.
// Nunca se envía un recorte: si nada da la versión completa, se avisa.

const MIN_FULL_SECONDS = 45;   // por debajo se considera preview/recorte
const SC_CANDIDATES = 4;       // resultados de SoundCloud a probar
const MAX_BYTES = 25 * 1024 * 1024;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

// Proveedores de la API de terceros. RAPIDAPI_KEY admite VARIAS keys separadas
// por coma para SUMAR cupos gratis y ganar tolerancia a fallos: si una key agota
// su cuota mensual (o falla), el bot rota a la siguiente automáticamente. Cada
// entrada puede ser "key" (usa el host por defecto) o "key|host" para mezclar
// proveedores. Ej: RAPIDAPI_KEY=abc,def   ó   RAPIDAPI_KEY=abc|host1,def|host2
function buildProviders() {
  return String(config.rapidApiKey || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(entry => {
      const [key, host] = entry.split('|').map(x => x.trim());
      return { key, host: host || config.rapidApiHost };
    });
}
const PROVIDERS = buildProviders();

console.log(PROVIDERS.length
  ? `  !play fuente : RapidAPI x${PROVIDERS.length} key(s) + SoundCloud (respaldo)`
  : '  !play fuente : SoundCloud (falta RAPIDAPI_KEY para la vía principal de YouTube)');

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

const MIMETYPES = {
  m4a: 'audio/mp4', mp4: 'audio/mp4', mp3: 'audio/mpeg', aac: 'audio/aac',
  ogg: 'audio/ogg', opus: 'audio/ogg; codecs=opus', webm: 'audio/webm',
};

const TEMP_DIR = path.dirname(tempFile('tmp'));

// Duración real del audio con ffprobe. null si no se puede medir (no descartamos).
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

async function cleanupPartials(baseName) {
  try {
    const files = await fs.readdir(TEMP_DIR);
    await Promise.all(files.filter(f => f.startsWith(baseName))
      .map(f => fs.remove(path.join(TEMP_DIR, f)).catch(() => {})));
  } catch {}
}

// ── Vía 1: API de terceros (RapidAPI, YouTube en IP limpia) ───────────────────

// Resuelve una búsqueda a un videoId de YouTube scrapeando la página de
// resultados (una simple página web; NO es la API de extracción que sufre el
// bot-check, así que esto sí funciona desde datacenter). null si falla.
async function searchYouTubeId(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
  const res = await axios.get(url, {
    timeout: 8000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept-Language': 'es',
    },
  });
  const m = String(res.data).match(/"videoId":"([\w-]{11})"/);
  return m ? m[1] : null;
}

function extractVideoId(query) {
  const m = /(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/.exec(query);
  return m ? m[1] : null;
}

// Pide el MP3 a un proveedor RapidAPI. La API es asíncrona: puede responder
// "processing" y hay que reintentar hasta que esté "ok" con el link. Devuelve
// { link, title, duration }. Lanza con .quota=true si la key agotó su cuota
// (HTTP 429) para que el llamador rote a la siguiente key.
async function rapidConvert(videoId, provider) {
  const url = `https://${provider.host}/dl?id=${videoId}`;
  const headers = {
    'X-RapidAPI-Key': provider.key,
    'X-RapidAPI-Host': provider.host,
  };
  for (let i = 0; i < 12; i++) {
    let data;
    try {
      ({ data } = await axios.get(url, { headers, timeout: 15000 }));
    } catch (e) {
      const code = e.response?.status;
      if (code === 429 || code === 403) { const err = new Error('cuota de la key agotada'); err.quota = true; throw err; }
      throw new Error(e.message);
    }
    const status = String(data.status || '').toLowerCase();
    if (status === 'ok' && data.link) {
      return { link: data.link, title: data.title || 'Sin título', duration: Number(data.duration) || null };
    }
    if (status === 'fail' || status === 'error') {
      throw new Error(data.msg || 'la API no pudo convertir el video');
    }
    await sleep(2500); // processing / in queue
  }
  throw new Error('la conversión tardó demasiado');
}

// Descarga una URL directa a un archivo, con tope de tamaño.
async function downloadUrlToFile(url, dest) {
  const resp = await axios.get(url, { responseType: 'stream', timeout: 120000, maxRedirects: 5 });
  await new Promise((resolve, reject) => {
    const w = fs.createWriteStream(dest);
    let bytes = 0;
    resp.data.on('data', (c) => {
      bytes += c.length;
      if (bytes > MAX_BYTES) { resp.data.destroy(); w.destroy(); reject(new Error('La canción pesa más de 25MB')); }
    });
    resp.data.on('error', reject);
    w.on('error', reject);
    w.on('finish', resolve);
    resp.data.pipe(w);
  });
}

async function fetchFromProvider(videoId, provider) {
  const { link, title, duration } = await rapidConvert(videoId, provider);
  if (duration != null && duration < MIN_FULL_SECONDS) throw new Error('preview');

  const baseName = `audio_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const dest = path.join(TEMP_DIR, `${baseName}.mp3`);
  try {
    await downloadUrlToFile(link, dest);
    const stat = await fs.stat(dest);
    if (stat.size < 1024) throw new Error('Archivo vacío');
    const dur = await audioDuration(dest);
    if (dur != null && dur < MIN_FULL_SECONDS) throw new Error('preview');
    const safeTitle = String(title).replace(/[\r\n]/g, ' ').slice(0, 90).trim() || 'Sin título';
    return { filePath: dest, title: safeTitle, mimetype: 'audio/mpeg', ext: 'mp3' };
  } catch (err) {
    await cleanupPartials(baseName);
    throw err;
  }
}

async function tryRapidApi(query) {
  if (!PROVIDERS.length) throw new Error('sin RAPIDAPI_KEY');
  const videoId = extractVideoId(query) || await searchYouTubeId(query);
  if (!videoId) throw new Error('no se encontró el video');

  // Rota entre keys: si una agotó cuota (429) o falla, prueba la siguiente.
  let lastErr = null;
  for (let i = 0; i < PROVIDERS.length; i++) {
    try {
      return await fetchFromProvider(videoId, PROVIDERS[i]);
    } catch (err) {
      lastErr = err;
      if (err.quota) logger.warn(`!play: key ${i + 1}/${PROVIDERS.length} sin cuota; rotando`);
      continue;
    }
  }
  throw lastErr || new Error('la API de terceros falló');
}

// ── Vía 2: SoundCloud (respaldo) ──────────────────────────────────────────────

function ytdlp(args, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YT_DLP, args, { detached: true });
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

async function scDownloadOne(url) {
  const baseName = `audio_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const outTemplate = path.join(TEMP_DIR, `${baseName}__%(title).80B.%(ext)s`);
  try {
    await ytdlp([
      url, '-f', 'bestaudio/best', '-o', outTemplate,
      '--no-playlist', '--no-warnings', '--no-part',
      '--max-filesize', '25M', '--no-mtime', '--socket-timeout', '20',
    ]);
    const files = await fs.readdir(TEMP_DIR);
    const audioFile = files.find(f => f.startsWith(baseName));
    if (!audioFile) throw new Error('No se encontró la canción');
    const fullPath = path.join(TEMP_DIR, audioFile);
    const stat = await fs.stat(fullPath);
    if (stat.size < 1024) { await cleanTemp(fullPath); throw new Error('Archivo vacío'); }

    const dur = await audioDuration(fullPath);
    if (dur != null && dur < MIN_FULL_SECONDS) { await cleanTemp(fullPath); throw new Error('preview'); }

    const titleMatch = audioFile.match(/__(.+)\.[^.]+$/);
    const title = titleMatch ? titleMatch[1].trim() : 'Sin título';
    const ext = path.extname(audioFile).slice(1).toLowerCase();
    return { filePath: fullPath, title, mimetype: MIMETYPES[ext] || 'audio/mpeg', ext };
  } catch (err) {
    await cleanupPartials(baseName);
    throw err;
  }
}

async function trySoundCloud(query) {
  if (/soundcloud\.com/i.test(query)) return scDownloadOne(query);
  const clean = query.replace(/["\r\n]/g, ' ').trim();
  let urls = [];
  try {
    const out = await ytdlp([`scsearch${SC_CANDIDATES}:${clean}`, '--flat-playlist', '--print', '%(url)s'], 30000);
    urls = out.split('\n').map(l => l.trim()).filter(u => /^https?:\/\//i.test(u));
  } catch {}
  if (!urls.length) throw new Error('sin resultados en SoundCloud');
  let lastErr = null;
  for (const url of urls) {
    try { return await scDownloadOne(url); }
    catch (err) { lastErr = err; continue; } // preview u otro fallo: siguiente
  }
  throw lastErr || new Error('sin versión completa en SoundCloud');
}

// ── Entrada ───────────────────────────────────────────────────────────────────
async function downloadAudio(query) {
  await acquireDownloadSlot();
  try {
    // 1) API de terceros (YouTube en IP limpia). Si no hay key o falla, respaldo.
    try {
      return await tryRapidApi(query);
    } catch (apiErr) {
      logger.warn(`!play: API de terceros no disponible (${apiErr.message}); probando SoundCloud`);
    }
    // 2) SoundCloud.
    try {
      return await trySoundCloud(query);
    } catch (scErr) {
      logger.warn(`!play: SoundCloud tampoco dio la canción (${scErr.message})`);
      throw new Error('No se encontró la canción completa');
    }
  } finally {
    releaseDownloadSlot();
  }
}

module.exports = { downloadAudio };
