const path = require('path');
const { canonicalJid } = require('./wa');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');
const logger = require('./logger');

const AURA_FILE = path.join(__dirname, '../../data/aura.json');

// Everyone starts here. Aura then accumulates (or bleeds) over time.
const STARTING_AURA = 1000;

let store = null;          // { [groupJid]: { [bareJid]: number } }
let loadPromise = null;
let saveTimer = null;

// Per-(group,user) write queue: serializes concurrent addAura / transferAura
// calls so two simultaneous !dar / casino / !aura commands don't clobber each
// other. Node.js is single-threaded but async — two callers can both read
// `previous` before either has written back, causing deltas to be lost.
const writeQueue = new Map();

function serialized(key, fn) {
  const prev = writeQueue.get(key) ?? Promise.resolve();
  const next = prev.then(fn);
  // Don't let a failed fn poison the queue for future writes on this key.
  const tracked = next.catch(() => {});
  writeQueue.set(key, tracked);
  // Prune the key once this settles, UNLESS something newer was already chained
  // behind it. Without this, the map keeps one entry per (group,user) forever —
  // a slow but real memory leak across cumulative unique participants on a 24/7
  // process. The read-modify-write inside fn is synchronous, so removing a
  // settled tail can't drop a pending update.
  tracked.finally(() => {
    if (writeQueue.get(key) === tracked) writeQueue.delete(key);
  });
  return next;
}

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(AURA_FILE, {})
      .then((d) => { store = d; })
      .catch((e) => {
        loadPromise = null;
        logger.warn(`auraStore: lectura falló (${e.message}); no se toca el archivo`);
        throw e;
      });
  }
  await loadPromise;
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try { await atomicWriteJson(AURA_FILE, store); }
    catch (e) { logger.error(`auraStore: fallo al guardar: ${e.message}`); }
  }, 5000);
}

async function getAura(groupJid, userJid) {
  await load();
  const key = canonicalJid(userJid);
  const g = store[groupJid];
  if (!g || g[key] === undefined) return STARTING_AURA;
  return g[key];
}

async function addAura(groupJid, userJid, delta) {
  await load();
  const qKey = `${groupJid}|${canonicalJid(userJid)}`;
  return serialized(qKey, () => {
    const key = canonicalJid(userJid);
    if (!store[groupJid]) store[groupJid] = {};
    const previous = store[groupJid][key] === undefined ? STARTING_AURA : store[groupJid][key];
    const current = previous + delta;
    store[groupJid][key] = current;
    scheduleSave();
    return { previous, current };
  });
}

// Atomic check-and-transfer — the only correct way to move aura between users.
// Returns { ok: true, fromNew, toNew } or { ok: false, fromCurrent } when the
// sender has insufficient funds. Both the debit check and both writes happen
// inside the same serialized block, so no concurrent command can read a stale
// balance in the window between check and commit.
async function transferAura(groupJid, fromJid, toJid, amount) {
  await load();
  const fromKey = canonicalJid(fromJid);
  const toKey   = canonicalJid(toJid);
  // Serialize on the sender's key — the critical section is the debit check.
  const qKey = `${groupJid}|${fromKey}`;
  return serialized(qKey, () => {
    if (!store[groupJid]) store[groupJid] = {};
    const g = store[groupJid];
    const fromCurrent = g[fromKey] === undefined ? STARTING_AURA : g[fromKey];
    if (fromCurrent < amount) return { ok: false, fromCurrent };
    g[fromKey] = fromCurrent - amount;
    g[toKey]   = (g[toKey] === undefined ? STARTING_AURA : g[toKey]) + amount;
    scheduleSave();
    return { ok: true, fromNew: g[fromKey], toNew: g[toKey] };
  });
}

async function getAuraRanking(groupJid) {
  await load();
  const g = store[groupJid];
  if (!g) return [];
  return Object.keys(g)
    .map(jid => ({ jid, aura: g[jid] }))
    .sort((a, b) => b.aura - a.aura);
}

async function resetAura(groupJid) {
  await load();
  delete store[groupJid];
  scheduleSave();
}

async function flushAura() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (store) {
    try { await atomicWriteJson(AURA_FILE, store); }
    catch (e) { logger.error(`auraStore: fallo al flush: ${e.message}`); }
  }
}

module.exports = { getAura, addAura, transferAura, getAuraRanking, resetAura, flushAura, STARTING_AURA };
