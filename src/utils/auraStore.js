const path = require('path');
const { canonicalJid } = require('./wa');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');
const logger = require('./logger');

const AURA_FILE = path.join(__dirname, '../../data/aura.json');

// Everyone starts here. Aura then accumulates (or bleeds) over time.
//
// ESCALA: la referencia es utils/economia.js — un miembro "millonario" del
// grupo ronda los 5.000. El arranque son 100, o sea un 2 % de esa cifra.
const { ARRANQUE: STARTING_AURA } = require('./economia');

// Escalas anteriores, necesarias para reescalar lo que ya está guardado.
// Cada entrada es el salto DESDE esa versión a la siguiente.
//   v1 -> v2: arranque 1000 y bonos de 20k-150k. Bastaban unos días activos
//             para llegar a siete dígitos, donde ganar o perder daba igual.
//   v2 -> v3: el millonario baja de 10.000 a 5.000 y los bonos se recortan a
//             una vigésima parte, para que las dinámicas (!robo, !aura) dejen
//             de estar eclipsadas por el bono diario de escribir.
const ESCALAS = {
  1: { arranque: 1000, factor: 200 },
  2: { arranque: 100,  factor: 2 },
};
// Marca de migración. Vive dentro del propio store para que no haga falta un
// archivo aparte ni un paso manual en la VPS.
const CLAVE_ESCALA = '__escala';
const ESCALA_ACTUAL = 3;

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

// Reescala los saldos guardados hasta la escala actual, UNA sola vez y
// encadenando todos los saltos que falten.
//
// No es una división a secas: se conserva la distancia al arranque, así que
// quien nunca jugó (estaba justo en el arranque viejo) queda justo en el nuevo
// en vez de aparecer con un saldo raro. El orden del ranking no cambia.
//
//   nuevo = ARRANQUE_NUEVO + (viejo - ARRANQUE_VIEJO) / FACTOR
//
// Un saldo de la escala 1 pasa por los dos saltos seguidos, así que una cuenta
// que nunca se migró llega igual de bien que una que ya iba por la 2.
function migrarEscala() {
  if (!store) return;
  const desde = store[CLAVE_ESCALA] || 1;
  if (desde >= ESCALA_ACTUAL) return;

  let tocados = 0;
  for (const grupo in store) {
    if (grupo === CLAVE_ESCALA) continue;
    const g = store[grupo];
    if (!g || typeof g !== 'object') continue;
    for (const k in g) {
      if (typeof g[k] !== 'number') continue;
      let v = g[k];
      for (let paso = desde; paso < ESCALA_ACTUAL; paso++) {
        const esc = ESCALAS[paso];
        if (!esc) continue;
        v = STARTING_AURA + Math.round((v - esc.arranque) / esc.factor);
      }
      g[k] = v;
      tocados++;
    }
  }
  store[CLAVE_ESCALA] = ESCALA_ACTUAL;
  if (tocados) logger.info(`auraStore: ${tocados} saldos reescalados (escala ${desde} -> ${ESCALA_ACTUAL}).`);
  scheduleSave();
}

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(AURA_FILE, {})
      .then((d) => { store = d; migrarEscala(); })
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

// Junta en una sola clave las entradas que son de la MISMA persona.
//
// Las escrituras usan canonicalJid, pero esa forma depende de si ya se conocía
// la correspondencia LID<->teléfono en ese momento. Quien acumuló aura bajo su
// @lid antes de que WhatsApp mandara el par acaba con dos saldos: el viejo se
// vuelve invisible (aura perdida) y en el ranking sale dos veces.
//
// El saldo unido NO es la suma a secas: cada entrada partida arrancó por su
// cuenta en STARTING_AURA, así que hay que descontar ese arranque de más una
// vez por cada entrada sobrante. Con dos entradas de 1000 (el arranque) el
// resultado es 1000, no 2000.
//
// Devuelve la clave canónica, ya con todo dentro y las sobrantes borradas.
function foldPerson(g, userJid) {
  const key = canonicalJid(userJid);
  let total = g[key];
  let extras = 0;
  for (const k in g) {
    if (k === key || canonicalJid(k) !== key) continue;
    total = (total === undefined ? 0 : total) + g[k];
    delete g[k];
    extras++;
  }
  if (extras) {
    // Si la clave canónica no existía, una de las sobrantes hace de base y solo
    // los extras restantes traen arranque duplicado.
    const duplicados = g[key] === undefined ? extras - 1 : extras;
    g[key] = total - STARTING_AURA * duplicados;
    scheduleSave();
  }
  return key;
}

async function getAura(groupJid, userJid) {
  await load();
  const g = store[groupJid];
  if (!g) return STARTING_AURA;
  const key = foldPerson(g, userJid);
  return g[key] === undefined ? STARTING_AURA : g[key];
}

async function addAura(groupJid, userJid, delta) {
  await load();
  const qKey = `${groupJid}|${canonicalJid(userJid)}`;
  return serialized(qKey, () => {
    if (!store[groupJid]) store[groupJid] = {};
    const key = foldPerson(store[groupJid], userJid);
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
    foldPerson(g, fromJid);
    foldPerson(g, toJid);
    const fromCurrent = g[fromKey] === undefined ? STARTING_AURA : g[fromKey];
    if (fromCurrent < amount) return { ok: false, fromCurrent };
    g[fromKey] = fromCurrent - amount;
    g[toKey]   = (g[toKey] === undefined ? STARTING_AURA : g[toKey]) + amount;
    scheduleSave();
    return { ok: true, fromNew: g[fromKey], toNew: g[toKey] };
  });
}

// Cobro atomico: comprueba el saldo y descuenta DENTRO del mismo bloque
// serializado, igual que transferAura.
//
// Hacerlo con getAura() y luego addAura() era una carrera real: dos comandos
// simultaneos del mismo usuario leian los dos el mismo saldo antes de que
// ninguno hubiera escrito, los dos pasaban la comprobacion y los dos
// descontaban. Con el saldo justo, dos !play a la vez dejaban al usuario en
// negativo, que es justo lo que SALDO_MINIMO existe para impedir.
//
// Devuelve { ok: true, cobrado, current } o { ok: false, saldo } si no llega.
async function spendAura(groupJid, userJid, amount, minimo = 0) {
  await load();
  const qKey = `${groupJid}|${canonicalJid(userJid)}`;
  return serialized(qKey, () => {
    if (!store[groupJid]) store[groupJid] = {};
    const key = foldPerson(store[groupJid], userJid);
    const saldo = store[groupJid][key] === undefined ? STARTING_AURA : store[groupJid][key];
    if (saldo - amount < minimo) return { ok: false, saldo };
    store[groupJid][key] = saldo - amount;
    scheduleSave();
    return { ok: true, cobrado: amount, current: store[groupJid][key] };
  });
}

async function getAuraRanking(groupJid) {
  await load();
  const g = store[groupJid];
  if (!g) return [];
  // Une las formas de cada persona antes de ordenar: si no, el mismo miembro
  // sale dos veces y la fila del @lid pinta un número interno que WhatsApp no
  // resuelve como mención.
  const por = new Map(); // clave canónica -> { jid, aura, extras }
  for (const k in g) {
    const id = canonicalJid(k);
    const prev = por.get(id);
    if (!prev) { por.set(id, { jid: k, aura: g[k], extras: 0 }); continue; }
    prev.aura += g[k];
    prev.extras++;
    if (!k.endsWith('@lid')) prev.jid = k; // el teléfono es el que se puede mencionar
  }
  return [...por.values()]
    .map(({ jid, aura, extras }) => ({ jid, aura: aura - STARTING_AURA * extras }))
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

module.exports = { getAura, addAura, spendAura, transferAura, getAuraRanking, resetAura, flushAura, STARTING_AURA };
