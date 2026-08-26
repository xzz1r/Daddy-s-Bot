const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');

const CACHE_DIR = path.join(__dirname, '../../data/music_cache');
const INDEX_FILE = path.join(CACHE_DIR, 'index.json');
const MAX_SONGS = 60;
// Version de la funcion que calcula la clave de cache. Al subirla, lo ya
// guardado se reindexa solo al arrancar en vez de quedarse inalcanzable.
const CLAVE_VERSION = 2;
// Tope duro de disco para la cache de musica. Sin el, 60 temas largos en alta
// calidad se comen mas de un giga del VPS sin que nada los desaloje.
const MAX_CACHE_BYTES = 400 * 1024 * 1024;

// Size-based RAM cap (not count-based) so the bot can't be DoS'd into an OOM
// kill by requesting many large songs. 24 MB is sized for the 1 GB VPS target
// (the disk cache still backs everything, so a RAM miss just re-reads from disk,
// it doesn't re-download). Was 80 MB when this targeted 2–4 GB Termux devices.
const MAX_RAM_BYTES = 24 * 1024 * 1024;
let ramUsedBytes = 0;

let index = null;

// RAM buffer cache: key -> { buffer, title, mimetype, ext }
// Insertion-ordered Map — oldest entry = first key (FIFO eviction)
const ramCache = new Map();

// Validate an index entry's file field: must be a relative path with no
// directory traversal. Rejects anything that could escape CACHE_DIR.
function isSafeRelativePath(p) {
  if (typeof p !== 'string' || !p) return false;
  if (path.isAbsolute(p)) return false;
  const normalised = path.normalize(p);
  if (normalised.startsWith('..')) return false;
  return true;
}

// Strip entries with invalid file paths when loading from disk — prevents
// a hand-edited or corrupted index.json from triggering path traversal.
function sanitiseIndex(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const clean = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v && typeof v === 'object' && isSafeRelativePath(v.file)) {
      clean[k] = v;
    }
  }
  return clean;
}

async function loadIndex() {
  if (index) return;
  await fs.ensureDir(CACHE_DIR);
  // ENOENT (first run) → empty index. A transient/corrupt read throws instead of
  // silently resetting to {} and then overwriting the good index on disk.
  const raw = await readJsonOrEnoent(INDEX_FILE, {});
  index = sanitiseIndex(raw);
  migrarClaves();
}

// Reindexa lo que se guardo con una version anterior de cacheKey.
//
// Cambiar la clave sin esto convierte toda la cache en basura: los archivos
// siguen ahi ocupando disco, pero ninguna peticion vuelve a dar con ellos, asi
// que la siguiente vez que alguien pida esa cancion se gasta cupo de la API
// para descargar algo que ya estaba bajado. Justo lo contrario de lo que se
// buscaba al tocar la clave.
//
// Las entradas viejas no guardaban la consulta, asi que se reindexan por su
// TITULO, que normaliza practicamente igual: "The Weeknd - Blinding Lights
// (Official Video)" y "blinding lights the weeknd" dan la misma clave. Si
// alguna no encaja, lo peor que pasa es lo que pasaria sin migrar: un fallo de
// cache y una descarga.
function migrarClaves() {
  const pendientes = Object.entries(index).filter(([, e]) => (e.v || 1) < CLAVE_VERSION);
  if (!pendientes.length) return;

  let movidas = 0;
  for (const [viejaClave, entrada] of pendientes) {
    const nuevaClave = cacheKey(entrada.query || entrada.title || '');
    entrada.v = CLAVE_VERSION;
    if (nuevaClave === viejaClave) continue;
    // Si ya hay algo en la clave nueva, gana lo mas reciente y la otra se cae
    // (su fichero queda huerfano y lo barre reconciliarHuerfanos/desalojar).
    const existente = index[nuevaClave];
    if (existente && (existente.timestamp || 0) >= (entrada.timestamp || 0)) {
      delete index[viejaClave];
      continue;
    }
    index[nuevaClave] = entrada;
    delete index[viejaClave];
    movidas++;
  }
  if (movidas) scheduleIndexSave();
}

// Atomic write: write to a temp file then rename, same as all other stores.
// Prevents index.json from being permanently corrupted by a mid-write crash.
async function saveIndex() {
  await atomicWriteJson(INDEX_FILE, index);
}

let _saveTimer = null;
function scheduleIndexSave() {
  if (_saveTimer) return;
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    saveIndex().catch(() => {});
  }, 5000);
}

// Clave de caché. Esto es lo que decide cuántas veces se gasta cupo de la API
// gratuita, así que importa más de lo que parece.
//
// Antes era md5(query en minúsculas). Con eso, estas cuatro peticiones eran
// cuatro canciones distintas para el bot y cada una gastaba una conversión del
// cupo mensual, para acabar mandando exactamente el mismo archivo:
//
//   !play blinding lights the weeknd
//   !play The Weeknd - Blinding Lights
//   !play  blinding   lights   the weeknd
//   !play blinding lights the weeknd official video
//
// En un grupo donde varias personas piden lo mismo con distintas palabras, eso
// es la mayor fuga de cupo que tiene el bot. La clave nueva quita tildes y
// signos, tira las palabras de relleno que la gente añade sin pensar y ORDENA
// lo que queda, así que el orden de las palabras deja de importar. Las cuatro
// de arriba pasan a ser un único acierto de caché: una conversión, no cuatro.
//
// El riesgo teórico es que dos canciones distintas tengan exactamente las
// mismas palabras en otro orden. Aparte de ser rarísimo, el resultado seguiría
// siendo una canción que encaja con lo que se pidió, así que compensa de sobra.
const RELLENO = new Set([
  'official', 'oficial', 'video', 'audio', 'lyrics', 'lyric', 'letra', 'letras',
  'hd', 'hq', 'full', 'completa', 'completo', 'cancion', 'song', 'music',
  'musica', 'tema', 'version', 'ver', 'mp3', 'youtube', 'yt', 'the', 'la', 'el',
  'los', 'las', 'de', 'del', 'y', 'a', 'ft', 'feat', 'featuring', 'con',
]);

function normalizarConsulta(query) {
  const limpio = String(query || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // fuera tildes y dieresis
    .replace(/[^a-z0-9ñ\s]+/g, ' ')                    // fuera signos
    .split(/\s+/)
    .filter(Boolean);

  // El relleno se quita, pero si al quitarlo no queda NADA se conserva lo que
  // había: "the la el" es una busqueda rarisima, pero una clave vacia mandaria
  // todas esas peticiones al mismo archivo, que si seria un fallo de verdad.
  const util = limpio.filter(t => !RELLENO.has(t));
  const tokens = util.length ? util : limpio;
  return tokens.sort().join(' ');
}

function cacheKey(query) {
  const norma = normalizarConsulta(query);
  // Si la normalización se queda sin nada (la consulta eran solo signos), se
  // cae a la consulta cruda para no meter cosas distintas en la misma clave.
  const base = norma || String(query || '').toLowerCase().trim();
  return crypto.createHash('md5').update(base).digest('hex');
}

function storeInRam(k, buffer, title, mimetype, ext) {
  if (!buffer || buffer.length > MAX_RAM_BYTES) return; // disco solo: no romper el tope
  // If this key is already in cache, remove it first to reclaim its bytes
  if (ramCache.has(k)) {
    ramUsedBytes -= ramCache.get(k).buffer.length;
    ramCache.delete(k);
  }
  // Evict oldest entries until there is room for the new buffer
  while (ramCache.size > 0 && ramUsedBytes + buffer.length > MAX_RAM_BYTES) {
    const oldest = ramCache.keys().next().value;
    ramUsedBytes -= ramCache.get(oldest).buffer.length;
    ramCache.delete(oldest);
  }
  ramCache.set(k, { buffer, title, mimetype, ext });
  ramUsedBytes += buffer.length;
}

async function getCached(query) {
  const k = cacheKey(query);

  // RAM hit — completely bypasses disk
  const ramHit = ramCache.get(k);
  if (ramHit) {
    // Misma invalidación que el disco: opus/ogg/webm no los reproduce WhatsApp
    // como música. Si un buffer así entró en RAM (p.ej. SoundCloud devolvió
    // webm), se descarta aquí también y se cae al camino de disco, que además
    // borra la entrada y el fichero. Si no, una RAM-hit serviría un formato roto.
    if (ramHit.ext === 'opus' || ramHit.ext === 'ogg' || ramHit.ext === 'webm') {
      ramUsedBytes -= ramHit.buffer.length;
      ramCache.delete(k);
    } else {
      // Move to end (LRU bump)
      ramUsedBytes -= ramHit.buffer.length;
      ramCache.delete(k);
      ramCache.set(k, ramHit);
      ramUsedBytes += ramHit.buffer.length;
      return ramHit;
    }
  }

  await loadIndex();
  const entry = index[k];
  if (!entry) return null;

  // Invalidate old opus/ogg cache — WhatsApp can't play those as music
  if (entry.ext === 'opus' || entry.ext === 'ogg' || entry.ext === 'webm') {
    await fs.remove(path.join(CACHE_DIR, entry.file)).catch(() => {});
    delete index[k];
    scheduleIndexSave();
    return null;
  }

  const filePath = path.join(CACHE_DIR, entry.file);
  let buffer;
  try {
    buffer = await fs.readFile(filePath);
  } catch {
    delete index[k];
    scheduleIndexSave();
    return null;
  }

  entry.timestamp = Date.now();
  scheduleIndexSave();

  const result = { buffer, title: entry.title, mimetype: entry.mimetype, ext: entry.ext };
  storeInRam(k, buffer, entry.title, entry.mimetype, entry.ext);
  return result;
}

// Tira las entradas más viejas hasta respetar los dos topes. El tamaño de una
// entrada sin `bytes` (las escritas antes de que existiera este campo) se mide
// del disco una vez y se anota, así el índice se completa solo.
async function desalojar() {
  const claves = Object.keys(index);
  let total = 0;
  for (const key of claves) {
    if (typeof index[key].bytes !== 'number') {
      try { index[key].bytes = (await fs.stat(path.join(CACHE_DIR, index[key].file))).size; }
      catch { index[key].bytes = 0; }
    }
    total += index[key].bytes;
  }
  // De más viejo a más nuevo. Sin timestamp = lo más viejo posible.
  const porEdad = claves.sort((a, b) => (index[a].timestamp ?? 0) - (index[b].timestamp ?? 0));
  let n = porEdad.length;
  for (const key of porEdad) {
    if (n <= MAX_SONGS && total <= MAX_CACHE_BYTES) break;
    await fs.remove(path.join(CACHE_DIR, index[key].file)).catch(() => {});
    total -= index[key].bytes || 0;
    delete index[key];
    n--;
  }
}

async function setCached(query, srcPath, title, mimetype, ext, srcBuffer = null, requester = '') {
  await loadIndex();
  const k = cacheKey(query);

  const cacheFile = `${k}${path.extname(srcPath)}`;
  const destPath = path.join(CACHE_DIR, cacheFile);

  let buffer = srcBuffer;
  try {
    if (!buffer) buffer = await fs.readFile(srcPath);
    await fs.writeFile(destPath, buffer);
  } catch {
    await fs.copy(srcPath, destPath).catch(() => {});
  }

  let bytes = buffer?.length;
  if (!bytes) { try { bytes = (await fs.stat(destPath)).size; } catch { bytes = 0; } }
  // `query` y `v` se guardan para poder RECALCULAR la clave si la normalizacion
  // cambia otra vez. Sin eso, tocar cacheKey deja el disco lleno de canciones
  // que nadie podra volver a encontrar: ocupan sitio y encima se re-descargan,
  // gastando el cupo que la cache existe para no gastar.
  index[k] = { file: cacheFile, title, mimetype, ext, requester: requester || '', timestamp: Date.now(), bytes, query: String(query || ''), v: CLAVE_VERSION };

  // Desalojo por NÚMERO y por TAMAÑO. Solo con el tope de 60 canciones, un
  // puñado de temas largos en alta calidad podía dejar la caché en más de un
  // giga sin que nada la tocara: el VPS es pequeño y eso lo llena.
  await desalojar();
  scheduleIndexSave();

  if (buffer) storeInRam(k, buffer, title, mimetype, ext);
}

// Lista las canciones en cache (título + fecha), más recientes primero. Solo
// lectura; para el comando !cachelist.
async function listCached() {
  await loadIndex();
  return Object.values(index)
    .map(e => ({ title: e.title || 'Sin título', requester: e.requester || '', timestamp: e.timestamp || 0 }))
    .sort((a, b) => b.timestamp - a.timestamp);
}

async function clearCache() {
  await loadIndex();
  const files = Object.values(index).map(e => path.join(CACHE_DIR, e.file));
  await Promise.all(files.map(f => fs.remove(f).catch(() => {})));
  index = {};
  await saveIndex();
  ramCache.clear();
  ramUsedBytes = 0;
}

async function flushCache() {
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
  if (index) {
    try { await saveIndex(); } catch {}
  }
}

module.exports = { getCached, setCached, listCached, clearCache, flushCache, cacheKey, normalizarConsulta };
