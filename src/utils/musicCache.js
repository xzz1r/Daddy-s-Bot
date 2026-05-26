const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = path.join(__dirname, '../../data/music_cache');
const INDEX_FILE = path.join(CACHE_DIR, 'index.json');
const MAX_SONGS = 60;
const MAX_RAM_SONGS = 20; // keep last 20 songs as Buffers in RAM — zero disk I/O on replay

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
// into a single write 5s later. Avoids hammering disk on busy chats.
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
  scheduleIndexSave();

  const result = { buffer, title: entry.title, mimetype: entry.mimetype, ext: entry.ext };
  storeInRam(k, buffer, entry.title, entry.mimetype, entry.ext);
  return result;
}

async function setCached(query, srcPath, title, mimetype, ext) {
  await loadIndex();
  const k = cacheKey(query);

  // Evict oldest disk entry if at limit. Single-pass O(n) min — beats sort on the
  // whole index every write, which can be hundreds of entries over time.
  let count = 0;
  let oldestKey = null;
  let oldestTs = Infinity;
  for (const key in index) {
    count++;
    const ts = index[key].timestamp;
    if (ts < oldestTs) { oldestTs = ts; oldestKey = key; }
  }
  if (count >= MAX_SONGS && oldestKey) {
    await fs.remove(path.join(CACHE_DIR, index[oldestKey].file)).catch(() => {});
    delete index[oldestKey];
  }

  const cacheFile = `${k}${path.extname(srcPath)}`;
  const destPath = path.join(CACHE_DIR, cacheFile);

  // Read source once → write to cache + keep in RAM. Avoids the prior copy + read
  // double-IO pattern that hit disk twice for every freshly downloaded song.
  let buffer = null;
  try {
    buffer = await fs.readFile(srcPath);
    await fs.writeFile(destPath, buffer);
  } catch {
    await fs.copy(srcPath, destPath).catch(() => {});
  }

  index[k] = { file: cacheFile, title, mimetype, ext, timestamp: Date.now() };
  await saveIndex();

  if (buffer) storeInRam(k, buffer, title, mimetype, ext);
}

async function clearCache() {
  await loadIndex();
  const files = Object.values(index).map(e => path.join(CACHE_DIR, e.file));
  await Promise.all(files.map(f => fs.remove(f).catch(() => {})));
  index = {};
  await saveIndex();
  ramCache.clear();
}

// Force-flush pending debounced index save — call on shutdown.
async function flushCache() {
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  if (index) {
    try { await saveIndex(); } catch {}
  }
}

module.exports = { getCached, setCached, clearCache, flushCache };

