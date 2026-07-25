const path = require('path');
const { canonicalJid } = require('./wa');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');
const logger = require('./logger');

// Actividad por DÍA, no por historial acumulado.
//
// messageCounter guarda el total de por vida, que no distingue entre alguien
// que lleva 400 mensajes en una semana y alguien que lleva 400 en dos años.
// Aquí se guarda cuántos mensajes escribió cada uno CADA día, así se puede
// calcular su media real de mensajes/día sobre una ventana reciente.
//
// store = { [groupJid]: { [canonicalJid]: { 'YYYY-MM-DD': n } } }

const FILE = path.join(__dirname, '../../data/dailyActivity.json');

const WINDOW_DAYS = 7;   // ventana sobre la que se calcula la media
const KEEP_DAYS   = 14;  // días que se conservan antes de podar

let store = null;
let loadPromise = null;
let saveTimer = null;

function dayKey(ts) {
  return new Date(ts).toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

// Claves de los últimos n días, de hoy hacia atrás.
function recentKeys(n) {
  const out = [];
  const now = Date.now();
  for (let i = 0; i < n; i++) out.push(dayKey(now - i * 86400000));
  return out;
}

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(FILE, {})
      .then((d) => { store = d; })
      .catch((e) => {
        loadPromise = null; // permite reintentar; NUNCA resetear+sobrescribir
        logger.warn(`dailyActivity: lectura falló (${e.message}); no se toca el archivo`);
        throw e;
      });
  }
  await loadPromise;
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try { await atomicWriteJson(FILE, store); }
    catch (e) { logger.error(`dailyActivity: fallo al guardar: ${e.message}`); }
  }, 10000);
}

// Borra los días fuera de KEEP_DAYS para que el fichero no crezca sin fin.
// Se ejecuta sobre el usuario que acaba de escribir, así el coste se reparte
// en lugar de hacer una pasada completa cada cierto tiempo.
function prune(userDays) {
  const keep = new Set(recentKeys(KEEP_DAYS));
  for (const k in userDays) {
    if (!keep.has(k)) delete userDays[k];
  }
}

async function recordMessage(groupJid, userJid) {
  await load();
  const key = canonicalJid(userJid);
  if (!store[groupJid]) store[groupJid] = {};
  if (!store[groupJid][key]) store[groupJid][key] = {};
  const days = store[groupJid][key];
  const today = dayKey(Date.now());
  days[today] = (days[today] || 0) + 1;
  prune(days);
  scheduleSave();
}

// Media de mensajes/día sobre los últimos WINDOW_DAYS.
//
// Sólo divide entre los días que el bot lleva observando a esa persona (hasta
// un máximo de WINDOW_DAYS), no entre 7 fijos: si el bot lleva 2 días con
// datos suyos, dividir entre 7 lo pintaría como un fantasma sin serlo.
// Devuelve { rate, total, days, tracked }. tracked=false cuando no hay ningún
// dato todavía, para que el llamador pueda caer a otra métrica.
async function getDailyRate(groupJid, userJid) {
  await load();
  const g = store[groupJid];
  const key = canonicalJid(userJid);
  const days = g?.[key];
  if (!days) return { rate: 0, total: 0, days: 0, tracked: false };

  const keys = recentKeys(WINDOW_DAYS);
  let total = 0;
  for (const k of keys) total += days[k] || 0;

  // Días observados = desde el primer día con datos dentro de la ventana.
  // keys[0] es hoy, así que el índice más alto con datos marca la antigüedad.
  let observed = 0;
  for (let i = keys.length - 1; i >= 0; i--) {
    if (days[keys[i]] !== undefined) { observed = i + 1; break; }
  }
  if (observed === 0) return { rate: 0, total: 0, days: 0, tracked: false };

  return {
    rate: total / observed,
    total,
    days: observed,
    tracked: true,
  };
}

async function flushDailyActivity() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (store) {
    try { await atomicWriteJson(FILE, store); }
    catch (e) { logger.error(`dailyActivity: fallo al flush: ${e.message}`); }
  }
}

module.exports = { recordMessage, getDailyRate, flushDailyActivity, WINDOW_DAYS };
