const { spawn, execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const config = require('../config');
const { tempFile, cleanTemp } = require('./helpers');
const { ffprobePath } = require('./ffmpeg');
const { cacheKey } = require('./musicCache');
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
// Cuantos candidatos se prueban A LA VEZ. Iban de uno en uno y cada yt-dlp
// puede irse a su timeout de 180 s, asi que cuatro previews seguidas eran doce
// minutos de espera. De dos en dos se parte por la mitad sin pasarse: son dos
// yt-dlp por hueco del semaforo y el semaforo permite dos, o sea cuatro
// procesos como mucho. En 1 GB de RAM tres por hueco (seis procesos) ya es
// jugarsela, y por eso no son tres.
const SC_PARALELO = 2;
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
      // ffprobePath, NO el nombre pelado: con el ffmpeg empaquetado no hay ningun
      // ffprobe en PATH, asi que el spawn fallaba y la duracion salia null SIEMPRE,
      // dejando muerto el filtro que descarta las previews de 30 segundos.
      proc = spawn(ffprobePath, ['-v', 'error', '-show_entries', 'format=duration',
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
  // Tope de tiempo total del sondeo: sin él, una key en "processing" perpetuo
  // podría retener un slot de descarga hasta ~200s y matar de hambre al resto.
  const deadline = Date.now() + 45000;
  for (let i = 0; i < 12; i++) {
    if (Date.now() >= deadline) break;
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
    const POLL = [800, 1500];
    await sleep(POLL[i] ?? 2500); // processing / in queue
  }
  throw new Error('la conversión tardó demasiado');
}

// Descarga una URL directa a un archivo, con tope de tamaño.
async function downloadUrlToFile(url, dest) {
  const resp = await axios.get(url, { responseType: 'stream', timeout: 120000, maxRedirects: 5 });
  await new Promise((resolve, reject) => {
    const w = fs.createWriteStream(dest);
    let bytes = 0;
    // Cualquier rechazo destruye AMBOS streams: si solo se cierra uno, el otro
    // queda con su descriptor de fichero/socket abierto (fuga en un proceso 24/7).
    const fail = (err) => { resp.data.destroy(); w.destroy(); reject(err); };
    resp.data.on('data', (c) => {
      bytes += c.length;
      if (bytes > MAX_BYTES) fail(new Error('La canción pesa más de 25MB'));
    });
    resp.data.on('error', fail);
    w.on('error', fail);
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

// Memoria de keys sin cuota.
//
// La rotación ya existía, pero arrancaba SIEMPRE por la primera key, así que en
// cuanto una agotaba su cupo mensual todas las canciones siguientes gastaban una
// llamada muerta contra ella antes de pasar a la segunda — y una llamada muerta
// no son milisegundos: la API es asíncrona y el sondeo puede tardar quince
// segundos. Con la primera key seca, eso es un peaje de quince segundos en cada
// petición durante el resto del mes.
//
// Aquí se apunta cuándo dio 429/403 cada una y se la manda al final de la cola.
// El olvido es corto a propósito: un 429 puede ser el cupo del mes agotado o un
// simple límite por segundo, y desde fuera no hay forma de distinguirlos. Con
// veinte minutos, un límite pasajero se recupera solo y un cupo agotado de
// verdad solo cuesta una llamada perdida cada veinte minutos en vez de una por
// canción.
const CUOTA_OLVIDO_MS = 20 * 60 * 1000;
const sinCuota = new Map();   // índice de la key -> ts en que se marcó

function estaSeca(i) {
  const ts = sinCuota.get(i);
  if (!ts) return false;
  if (Date.now() - ts > CUOTA_OLVIDO_MS) { sinCuota.delete(i); return false; }
  return true;
}

// Orden de intento: primero las que se creen vivas, y las secas al final como
// último recurso — si la marca estuviera obsoleta, mejor probarla que rendirse.
function ordenDeKeys() {
  const vivas = [], secas = [];
  for (let i = 0; i < PROVIDERS.length; i++) (estaSeca(i) ? secas : vivas).push(i);
  return [...vivas, ...secas];
}

async function tryRapidApi(query) {
  if (!PROVIDERS.length) throw new Error('sin RAPIDAPI_KEY');
  const videoId = extractVideoId(query) || await searchYouTubeId(query);
  if (!videoId) throw new Error('no se encontró el video');

  let lastErr = null;
  // Se recuerda si ALGUNA key se quedo sin cupo, no solo la ultima. Sin esto,
  // dos keys seca y una tercera que falla por otra cosa daba un error sin
  // marca de cuota y el grupo leia "no encontré esa canción".
  let huboCuota = false;
  for (const i of ordenDeKeys()) {
    try {
      const r = await fetchFromProvider(videoId, PROVIDERS[i]);
      sinCuota.delete(i);   // respondió: sigue viva
      return r;
    } catch (err) {
      lastErr = err;
      if (err.quota) huboCuota = true;
      // "preview" es propiedad del vídeo (mismo videoId en todas las keys):
      // rotar repetiría la conversión para el mismo id y volvería a dar preview,
      // gastando tiempo en todas las keys. Es terminal para RapidAPI → que el
      // caller caiga directo a SoundCloud.
      if (err.message === 'preview') break;
      if (err.quota) {
        sinCuota.set(i, Date.now());
        logger.warn(`!play: key ${i + 1}/${PROVIDERS.length} sin cuota; pasa al final de la cola`);
      }
      continue;
    }
  }
  const fin = lastErr || new Error('la API de terceros falló');
  if (huboCuota) fin.quota = true;
  throw fin;
}

// ── Vía 2: SoundCloud (respaldo) ──────────────────────────────────────────────

function ytdlp(args, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YT_DLP, args, { detached: true });
    proc.unref?.();
    let stdout = '';
    let stderr = '';
    let settled = false;
    const done = (fn, arg) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(arg);
    };
    const killGroup = () => {
      try { process.kill(-proc.pid, 'SIGKILL'); }
      catch { try { proc.kill('SIGKILL'); } catch {} }
    };
    const timer = setTimeout(() => { killGroup(); done(reject, new Error('yt-dlp timeout')); }, timeoutMs);
    proc.stdout?.on('data', (d) => { if (!settled) stdout += d.toString(); });
    proc.stderr?.on('data', (d) => { if (!settled) stderr += d.toString(); });
    proc.on('error', (err) => { done(reject, new Error(`yt-dlp no se pudo ejecutar: ${err.message}`)); });
    proc.on('close', (code) => {
      if (code === 0) done(resolve, stdout);
      else {
        const cleanErr = stderr.split('\n').filter(l => l.startsWith('ERROR:')).pop()
          || stderr.trim().split('\n').pop() || `código ${code}`;
        done(reject, new Error(cleanErr.replace(/^ERROR:\s*/, '')));
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

  // De dos en dos, y el primero que traiga la cancion completa gana. Los demas
  // del lote se descartan CON SU FICHERO: si dos terminan bien a la vez y solo
  // se devuelve uno, el otro se queda en el disco para siempre. En un temp que
  // nadie barre eso es una fuga lenta, que es la peor clase.
  let lastErr = null;
  for (let i = 0; i < urls.length; i += SC_PARALELO) {
    const lote = urls.slice(i, i + SC_PARALELO);
    const hechos = await Promise.allSettled(lote.map(u => scDownloadOne(u)));

    let ganador = null;
    for (const h of hechos) {
      if (h.status === 'rejected') { lastErr = h.reason; continue; }
      if (!ganador) ganador = h.value;
      else cleanTemp(h.value.filePath).catch(() => {});   // el que llego tarde
    }
    if (ganador) return ganador;
  }
  throw lastErr || new Error('sin versión completa en SoundCloud');
}

// ── Entrada ───────────────────────────────────────────────────────────────────
// EL PORQUE, NO SOLO EL QUE. Todo acababa en un unico
// `No se encontró la canción completa`, y arriba music.js lo pasaba por un
// `/no se encontr/` para decidir el mensaje — o sea que ese if SIEMPRE daba la
// misma rama. Con las keys agotadas el grupo leia "no encontré esa canción" y
// la gente reescribia el nombre una y otra vez contra un cupo que no existia.
//
// Ahora el error lleva `causa` y el comando decide con eso, no adivinando por
// el texto.
async function intentar(query) {
  let sinCuota = false;
  try {
    return await tryRapidApi(query);
  } catch (apiErr) {
    if (apiErr.quota) sinCuota = true;
    // "sin RAPIDAPI_KEY" no es quedarse sin cupo: es no haberlo tenido nunca.
    logger.warn(`!play: API de terceros no disponible (${apiErr.message}); probando SoundCloud`);
  }
  try {
    return await trySoundCloud(query);
  } catch (scErr) {
    logger.warn(`!play: SoundCloud tampoco dio la canción (${scErr.message})`);
    const err = new Error('No se encontró la canción completa');
    // Si RapidAPI se quedo sin cupo, el fallo de SoundCloud es secundario: lo
    // que hay que decir es que la via principal esta agotada.
    err.causa = sinCuota ? 'sin-cuota'
      : /red|network|timeout|ECONN|ENOTFOUND|socket/i.test(scErr.message) ? 'red'
      : 'no-encontrada';
    throw err;
  }
}

// UNA DESCARGA POR CANCION, AUNQUE LA PIDAN VARIOS A LA VEZ.
//
// Dos `!play` de lo mismo casi a la vez eran dos busquedas, dos conversiones de
// la API (dos llamadas de un cupo gratis que se cuenta al mes) y dos ficheros
// bajados. Es el mismo patron que ya usa la metadata de grupo en el handler,
// pero aqui lo que se ahorra no es latencia: es cuota y ancho de banda.
//
// El segundo NO coge hueco del semaforo: se cuelga de la promesa del primero.
// Asi que ademas deja de ocupar uno de los dos huecos que tiene el VPS.
//
// La clave es la de la CACHE, no el texto crudo: "blinding lights" y
// "Blinding Lights official video" son la misma peticion y ya lo eran para el
// cache; seria raro que aqui no lo fueran.
const enVuelo = new Map();   // cacheKey -> promesa

async function downloadAudio(query) {
  const clave = cacheKey(query);
  const yaVa = enVuelo.get(clave);
  if (yaVa) {
    // El seguidor recibe el MISMO objeto, con el buffer ya leido y marcado
    // como compartido: no debe borrar el fichero (lo borra quien lo bajo) ni
    // volver a guardarlo en cache. Si lo hiciera, borraria el fichero por
    // debajo del otro mientras lo esta leyendo.
    const r = await yaVa;
    return { ...r, compartido: true };
  }

  const tarea = (async () => {
    await acquireDownloadSlot();
    try {
      const r = await intentar(query);
      // El buffer se lee AQUI, antes de resolver, para que quien esperaba tenga
      // los bytes en mano pase lo que pase con el fichero despues.
      const buffer = r.buffer || await fs.readFile(r.filePath);
      return { ...r, buffer };
    } finally {
      releaseDownloadSlot();
    }
  })();

  enVuelo.set(clave, tarea);
  try {
    return await tarea;
  } finally {
    enVuelo.delete(clave);
  }
}

module.exports = { downloadAudio, ordenDeKeys, sinCuota, PROVIDERS };
