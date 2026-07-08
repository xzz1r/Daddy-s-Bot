const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { atomicWriteJson } = require('./helpers');
const logger = require('./logger');

// Caché en disco de la ÚLTIMA foto de perfil vista de cada cuenta. WhatsApp no
// deja ver una foto que el dueño puso oculta/privada — pero si el bot la vio
// alguna vez cuando estaba visible (vía !pfp o el indexador automático), la
// guardamos aquí. Así !pfp puede mostrar la última foto conocida aunque ahora
// esté oculta o la persona la haya cambiado. Los bytes van a archivos sueltos
// (una foto por cuenta, se sobreescribe con la más reciente) y un índice JSON
// liviano guarda fechas. Tope LRU por lastSeen para no llenar el disco de Termux.
const DIR = path.join(__dirname, '../../data/pfpcache');
const INDEX = path.join(DIR, 'index.json');
const MAX_ENTRIES = 1200;
const MAX_IMG_BYTES = 3 * 1024 * 1024;

let index = null; // { [account]: { file, firstSeen, lastSeen } }
let loadPromise = null;
let saveTimer = null;

function fileFor(account) {
  return crypto.createHash('sha1').update(String(account)).digest('hex') + '.bin';
}

async function load() {
  if (index) return;
  if (!loadPromise) {
    loadPromise = (async () => {
      try { index = await fs.readJson(INDEX); } catch { index = {}; }
      if (!index || typeof index !== 'object') index = {};
    })();
  }
  await loadPromise;
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try { await atomicWriteJson(INDEX, index); }
    catch (e) { logger.error(`pfpCache: fallo al guardar índice: ${e.message}`); }
  }, 4000);
}

function evictOldest() {
  let oldest = null, ts = Infinity;
  for (const [acc, e] of Object.entries(index)) {
    if (e.lastSeen < ts) { ts = e.lastSeen; oldest = acc; }
  }
  if (oldest) {
    fs.remove(path.join(DIR, index[oldest].file)).catch(() => {});
    delete index[oldest];
  }
}

// Guarda (o actualiza) la última foto conocida de `account`.
async function put(account, buf, now = Date.now()) {
  if (!account || !buf || !buf.length || buf.length > MAX_IMG_BYTES) return;
  await load();
  try {
    await fs.ensureDir(DIR);
    const existing = index[account];
    const file = existing?.file || fileFor(account);
    await fs.writeFile(path.join(DIR, file), buf);
    if (existing) {
      existing.lastSeen = now;
    } else {
      index[account] = { file, firstSeen: now, lastSeen: now };
      if (Object.keys(index).length > MAX_ENTRIES) evictOldest();
    }
    scheduleSave();
  } catch (e) {
    logger.warn(`pfpCache: no pude guardar foto de ${account}: ${e.message}`);
  }
}

// Devuelve { buf, firstSeen, lastSeen } de la última foto conocida, o null.
async function get(account) {
  if (!account) return null;
  await load();
  const e = index[account];
  if (!e) return null;
  try {
    const buf = await fs.readFile(path.join(DIR, e.file));
    return { buf, firstSeen: e.firstSeen, lastSeen: e.lastSeen };
  } catch { return null; }
}

async function flush() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (index) {
    try { await atomicWriteJson(INDEX, index); }
    catch (e) { logger.error(`pfpCache: fallo al flush: ${e.message}`); }
  }
}

module.exports = { put, get, flush };
