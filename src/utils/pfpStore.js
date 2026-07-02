const fs = require('fs-extra');
const path = require('path');
const { atomicWriteJson } = require('./helpers');
const { hamming } = require('./phash');
const logger = require('./logger');

// Store persistente de huellas de fotos de perfil. Un solo registro sirve para
// las dos detecciones: "en vivo" (misma foto que otro miembro presente ahora) e
// "histórica" (misma foto que una cuenta que ya salió, cambió de número, o fue
// marcada fake). La presencia actual NO se guarda aquí: se decide al consultar,
// cruzando estas huellas con los participantes del grupo en ese momento.
const FILE = path.join(__dirname, '../../data/pfphashes.json');
const MAX_RECORDS = 5000;     // tope para que el JSON no crezca sin fin
const MATCH_THRESHOLD = 10;   // Hamming <= 10/64 → misma foto (tolerante a recompresión)
const SAME_ACCOUNT_DIST = 4;  // misma cuenta + hash casi igual → actualizar, no duplicar

let store = null;
let loadPromise = null;
let saveTimer = null;

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = (async () => {
      try { store = await fs.readJson(FILE); } catch { store = { records: [] }; }
      if (!store || !Array.isArray(store.records)) store = { records: [] };
    })();
  }
  await loadPromise;
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try { await atomicWriteJson(FILE, store); }
    catch (e) { logger.error(`pfpStore: fallo al guardar: ${e.message}`); }
  }, 4000);
}

// Registra que `account` (visto en `group`) usa la foto con este `hash`, y
// devuelve las coincidencias relevantes ANTES de registrar: otras cuentas con
// (casi) la misma foto, o fotos marcadas fake. Los `now`/timestamps permiten
// distinguir después si esa cuenta sigue o ya no está. `group` puede ser null
// (p.ej. un !pfp por número en un DM) — solo se usa como etiqueta.
async function recordAndMatch(group, account, hash, now = Date.now()) {
  await load();
  if (!hash || !account) return [];

  const matches = [];
  for (const r of store.records) {
    const d = hamming(r.hash, hash);
    if (d > MATCH_THRESHOLD) continue;
    // La misma cuenta con su propia foto no es una alerta (salvo que esté fake).
    if (r.account === account && !r.fake) continue;
    matches.push({
      account: r.account,
      groups: Array.isArray(r.groups) ? r.groups.slice() : [],
      firstSeen: r.firstSeen,
      lastSeen: r.lastSeen,
      fake: !!r.fake,
      distance: d,
    });
  }

  // Actualiza el registro existente de esta cuenta o crea uno nuevo.
  const existing = store.records.find(
    r => r.account === account && hamming(r.hash, hash) <= SAME_ACCOUNT_DIST
  );
  if (existing) {
    existing.lastSeen = now;
    existing.hash = hash; // deja la última variante vista
    if (group && !existing.groups.includes(group)) existing.groups.push(group);
  } else {
    store.records.push({
      hash, account, firstSeen: now, lastSeen: now,
      groups: group ? [group] : [], fake: false,
    });
    if (store.records.length > MAX_RECORDS) {
      // Descarta el más antiguo por lastSeen, pero nunca uno marcado fake.
      let oldestIdx = -1, oldestTs = Infinity;
      for (let i = 0; i < store.records.length; i++) {
        const r = store.records[i];
        if (r.fake) continue;
        if (r.lastSeen < oldestTs) { oldestTs = r.lastSeen; oldestIdx = i; }
      }
      if (oldestIdx >= 0) store.records.splice(oldestIdx, 1);
    }
  }
  scheduleSave();
  return matches;
}

// Marca como FAKE toda foto (de cualquier cuenta) cercana a este hash, para que
// futuras coincidencias salten al instante. Devuelve cuántos registros marcó.
async function markFake(hash) {
  await load();
  let n = 0;
  for (const r of store.records) {
    if (hamming(r.hash, hash) <= MATCH_THRESHOLD) { r.fake = true; n++; }
  }
  if (n) scheduleSave();
  return n;
}

async function flush() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (store) {
    try { await atomicWriteJson(FILE, store); }
    catch (e) { logger.error(`pfpStore: fallo al flush: ${e.message}`); }
  }
}

module.exports = { recordAndMatch, markFake, flush, MATCH_THRESHOLD };
