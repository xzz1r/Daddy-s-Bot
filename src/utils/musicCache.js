const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = path.join(__dirname, '../../data/music_cache');
const INDEX_FILE = path.join(CACHE_DIR, 'index.json');
const MAX_SONGS = 60;

let index = null;  // { md5key: { file, title, mimetype, ext, timestamp } }

async function loadIndex() {
  if (index) return;
  await fs.ensureDir(CACHE_DIR);
  try { index = await fs.readJson(INDEX_FILE); } catch { index = {}; }
}

async function saveIndex() {
  await fs.writeJson(INDEX_FILE, index);
}

function key(query) {
  return crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');
}

async function getCached(query) {
  await loadIndex();
  const entry = index[key(query)];
  if (!entry) return null;
  const filePath = path.join(CACHE_DIR, entry.file);
  if (!await fs.pathExists(filePath)) {
    delete index[key(query)];
    await saveIndex();
    return null;
  }
  entry.timestamp = Date.now();
  saveIndex().catch(() => {}); // fire-and-forget — don't block the response
  return { filePath, title: entry.title, mimetype: entry.mimetype, ext: entry.ext };
}

async function setCached(query, srcPath, title, mimetype, ext) {
  await loadIndex();
  const k = key(query);

  // Evict oldest if at limit
  const entries = Object.entries(index);
  if (entries.length >= MAX_SONGS) {
    const [oldKey, oldEntry] = entries.sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    await fs.remove(path.join(CACHE_DIR, oldEntry.file)).catch(() => {});
    delete index[oldKey];
  }

  const cacheFile = `${k}${path.extname(srcPath)}`;
  await fs.copy(srcPath, path.join(CACHE_DIR, cacheFile));
  index[k] = { file: cacheFile, title, mimetype, ext, timestamp: Date.now() };
  await saveIndex();
}

module.exports = { getCached, setCached };
