const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');

const CACHE_DIR = path.join(__dirname, '../../data/music_cache');
const INDEX_FILE = path.join(CACHE_DIR, 'index.json');
const MAX_SONGS = 60;

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

function cacheKey(query) {
  return crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');
}

function storeInRam(k, buffer, title, mimetype, ext) {
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

async function setCached(query, srcPath, title, mimetype, ext, srcBuffer = null, requester = '') {
  await loadIndex();
  const k = cacheKey(query);

  // Evict oldest disk entry if at limit
  let count = 0;
  let oldestKey = null;
  let oldestTs = Infinity;
  for (const key in index) {
    count++;
    const ts = index[key].timestamp ?? 0; // missing timestamp = treat as oldest
    if (ts < oldestTs) { oldestTs = ts; oldestKey = key; }
  }
  if (count >= MAX_SONGS && oldestKey) {
    await fs.remove(path.join(CACHE_DIR, index[oldestKey].file)).catch(() => {});
    delete index[oldestKey];
  }

  const cacheFile = `${k}${path.extname(srcPath)}`;
  const destPath = path.join(CACHE_DIR, cacheFile);

  let buffer = srcBuffer;
  try {
    if (!buffer) buffer = await fs.readFile(srcPath);
    await fs.writeFile(destPath, buffer);
  } catch {
    await fs.copy(srcPath, destPath).catch(() => {});
  }

  index[k] = { file: cacheFile, title, mimetype, ext, requester: requester || '', timestamp: Date.now() };
  await saveIndex();

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

module.exports = { getCached, setCached, listCached, clearCache, flushCache };
