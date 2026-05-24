const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = path.join(__dirname, '../../data/music_cache');
const INDEX_FILE = path.join(CACHE_DIR, 'index.json');
const MAX_SONGS = 60;
const MAX_RAM_SONGS = 8; // keep last 8 songs as Buffers in RAM — zero disk I/O on replay

let index = null;

// RAM buffer cache: key -> { buffer, title, mimetype, ext }
// Insertion-ordered Map — oldest entry = first key
const ramCache = new Map();

async function loadIndex() {
  if (index) return;
  await fs.ensureDir(CACHE_DIR);
  try { index = await fs.readJson(INDEX_FILE); } catch { index = {}; }
}

async function saveIndex() {
  await fs.writeJson(INDEX_FILE, index);
}

// Debounced disk write — batches rapid mutations (timestamp updates, evictions)
// into a single write 1s later. Avoids hammering disk on busy chats.
let _saveTimer = null;
function scheduleIndexSave() {
  if (_saveTimer) return;
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    saveIndex().catch(() => {});
  }, 1000);
}

function cacheKey(query) {
  return crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');
}

function storeInRam(k, buffer, title, mimetype, ext) {
  if (ramCache.size >= MAX_RAM_SONGS) {
    ramCache.delete(ramCache.keys().next().value); // evict oldest
  }
  ramCache.set(k, { buffer, title, mimetype, ext });
}

async function getCached(query) {
  const k = cacheKey(query);

  // RAM hit — completely bypasses disk
  const ramHit = ramCache.get(k);
  if (ramHit) {
    // Move to end (LRU)
    ramCache.delete(k);
    ramCache.set(k, ramHit);
    return ramHit;
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
    // File missing — clean up index
    delete index[k];
    scheduleIndexSave();
    return null;
  }

  entry.timestamp = Date.now();
  saveIndex().catch(() => {});

  const result = { buffer, title: entry.title, mimetype: entry.mimetype, ext: entry.ext };
  storeInRam(k, buffer, entry.title, entry.mimetype, entry.ext);
  return result;
}

async function setCached(query, srcPath, title, mimetype, ext) {
  await loadIndex();
  const k = cacheKey(query);

  // Evict oldest disk entry if at limit
  const entries = Object.entries(index);
  if (entries.length >= MAX_SONGS) {
    const [oldKey, oldEntry] = entries.sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    await fs.remove(path.join(CACHE_DIR, oldEntry.file)).catch(() => {});
    delete index[oldKey];
  }

  const cacheFile = `${k}${path.extname(srcPath)}`;
  const destPath = path.join(CACHE_DIR, cacheFile);
  await fs.copy(srcPath, destPath);
  index[k] = { file: cacheFile, title, mimetype, ext, timestamp: Date.now() };
  await saveIndex();

  // Also load into RAM cache
  try {
    const buffer = await fs.readFile(destPath);
    storeInRam(k, buffer, title, mimetype, ext);
  } catch {}
}

async function clearCache() {
  await loadIndex();
  const files = Object.values(index).map(e => path.join(CACHE_DIR, e.file));
  await Promise.all(files.map(f => fs.remove(f).catch(() => {})));
  index = {};
  await saveIndex();
  ramCache.clear();
}

module.exports = { getCached, setCached, clearCache };

