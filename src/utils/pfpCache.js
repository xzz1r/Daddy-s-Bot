const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { atomicWriteJson, ffmpegToBuffer, readJsonOrEnoent } = require('./helpers');
const { isBanned } = require('./banlist');
const { getUserCount } = require('./messageCounter');
const logger = require('./logger');

// A partir de cuántos mensajes en el grupo consideramos a alguien "contador
// alto" (miembro activo que vale la pena cachear).
const HIGH_COUNT = 100;

const DOWNSCALE_ARGS = [
  '-hide_banner', '-loglevel', 'error',
  '-i', 'pipe:0', '-frames:v', '1',
  '-vf', 'scale=256:256:force_original_aspect_ratio=decrease',
  '-q:v', '7', '-f', 'mjpeg', 'pipe:1',
];

// Reduce la imagen a 256px (lado mayor) en JPEG de calidad media — una foto de
// perfil queda en ~5-15 KB en vez de decenas/cientos. Timeout+SIGKILL+semáforo
// vienen de ffmpegToBuffer (una foto maliciosa no cuelga ffmpeg ni salta el
// tope de 2 procesos). Devuelve el buffer reducido, o null si falla.
async function downscale(buf) {
  try { return await ffmpegToBuffer(DOWNSCALE_ARGS, buf, 10000); }
  catch { return null; }
}

// Decide si vale la pena cachear la foto de esta cuenta. Solo guardamos a los
// que importan para el anti-fake: sospechosos (huella que coincide con otra
// cuenta/fake, o en lista negra) o miembros muy activos (contador alto). Al
// resto no lo cacheamos → mínimo espacio.
async function shouldKeep({ group, rawJid, account, matches }) {
  if (matches && matches.length) return true; // huella sospechosa
  try {
    const forms = [account, rawJid].filter(Boolean);
    if (await isBanned(forms)) return true;
  } catch {}
  if (group && rawJid) {
    try { if (await getUserCount(group, rawJid) >= HIGH_COUNT) return true; } catch {}
  }
  return false;
}

// Cachea la foto SOLO si la cuenta pasa el filtro shouldKeep, y siempre reducida.
async function maybeStore(ctx, buf) {
  if (!buf || !ctx?.account) return;
  if (!(await shouldKeep(ctx))) return;
  const small = await downscale(buf);
  await put(ctx.account, small || buf);
}

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
    loadPromise = readJsonOrEnoent(INDEX, {})
      .then((d) => { index = (d && typeof d === 'object') ? d : {}; })
      .catch((e) => {
        loadPromise = null;
        logger.warn(`pfpCache: lectura falló (${e.message}); no se toca el archivo`);
        throw e;
      });
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

module.exports = { put, maybeStore, get, flush };
