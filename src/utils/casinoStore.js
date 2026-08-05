const path = require('path');
const { canonicalJid } = require('./wa');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');
const logger = require('./logger');

const CASINO_FILE = path.join(__dirname, '../../data/casino.json');

// The casino/jackpot counter is SEPARATE from the normal message counter
// (messageCounter.js). It tracks messages per user per 24h window so the
// 200/500/1000 milestones are a daily race. Evaluated lazily — no setInterval,
// so it survives Termux restarts cleanly.
const RESET_MS = 24 * 60 * 60 * 1000;

// store = { [groupJid]: { resetAt: <ms>, counts: { [bareJid]: number } } }
let store = null;
let loadPromise = null;
let saveTimer = null;

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(CASINO_FILE, {})
      .then((d) => { store = d; })
      .catch((e) => {
        loadPromise = null;
        logger.warn(`casinoStore: lectura falló (${e.message}); no se toca el archivo`);
        throw e;
      });
  }
  await loadPromise;
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try { await atomicWriteJson(CASINO_FILE, store); }
    catch (e) { logger.error(`casinoStore: fallo al guardar: ${e.message}`); }
  }, 5000);
}

// Returns the group's live bucket, rolling the 24h window forward when expired.
// Also migrates the legacy flat format ({ [bareJid]: number }) by starting fresh.
function freshBucket(groupJid) {
  const now = Date.now();
  let g = store[groupJid];
  if (!g || typeof g.resetAt !== 'number' || !g.counts) {
    g = { resetAt: now, counts: {} };
    store[groupJid] = g;
    return g;
  }
  // `tiradas` lo escribio una version con presupuesto diario de !aura. Ese tope
  // se quito (frenaba el juego en vez de equilibrarlo; ahora el freno es la
  // ventaja de la casa), asi que se borra al pasar por aqui y no se arrastra.
  if (g.tiradas) delete g.tiradas;
  if (now - g.resetAt >= RESET_MS) {
    g.counts = {};
    g.resetAt = now;
  }
  return g;
}

// Junta lo que la misma persona tenga anotado bajo varias formas y lo deja en
// una sola clave canónica. Sin esto, quien llega unas veces por @lid y otras
// por teléfono partía su cuenta diaria en dos montones: los hitos de 200/500/
// 1000 se retrasaban (o, peor, se cobraban dos veces, uno por cada montón).
//
// Es el mismo criterio que messageCounter y auraStore: la clave es canonicalJid.
function colapsar(counts, key) {
  let total = counts[key] || 0;
  for (const k in counts) {
    if (k === key || canonicalJid(k) !== key) continue;
    total += counts[k];
    delete counts[k];
  }
  return total;
}

async function incrementCasinoCount(groupJid, userJid) {
  await load();
  const key = canonicalJid(userJid);
  const g = freshBucket(groupJid);
  const next = colapsar(g.counts, key) + 1;
  g.counts[key] = next;
  scheduleSave();
  return next;
}

// Read-only count for the current window (0 if expired or unknown).
// No colapsa (no escribe), pero sí suma todas las formas conocidas: si no, el
// "llevas N mensajes hoy" de !aura hoy no cuadraría con el hito que acaba de
// saltar.
async function getCasinoCount(groupJid, userJid) {
  await load();
  const g = store[groupJid];
  if (!g || typeof g.resetAt !== 'number' || !g.counts) return 0;
  if (Date.now() - g.resetAt >= RESET_MS) return 0;
  const key = canonicalJid(userJid);
  let total = 0;
  for (const k in g.counts) {
    if (canonicalJid(k) === key) total += g.counts[k];
  }
  return total;
}

// Milliseconds until current window resets (0 if expired / unknown).
async function msUntilReset(groupJid) {
  await load();
  const g = store[groupJid];
  if (!g || typeof g.resetAt !== 'number') return 0;
  return Math.max(0, RESET_MS - (Date.now() - g.resetAt));
}

async function flushCasino() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (store) {
    try { await atomicWriteJson(CASINO_FILE, store); }
    catch (e) { logger.error(`casinoStore: fallo al flush: ${e.message}`); }
  }
}

module.exports = { incrementCasinoCount, getCasinoCount, msUntilReset, flushCasino, RESET_MS };
