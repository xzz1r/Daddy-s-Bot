const path = require('path');
const { canonicalJid } = require('./wa');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');
const logger = require('./logger');

// Nombres visibles (pushName) de cada miembro.
//
// groupMetadata casi nunca trae el nombre de los participantes (menos aún en
// grupos LID), así que la única fuente fiable es el pushName que WhatsApp
// adjunta a cada mensaje. Se guarda aquí para que !antinick pueda distinguir
// "no tiene nick puesto" de "todavía no le hemos visto escribir" — distinción
// crítica, porque de ahí cuelga una purga.
//
// store = { [groupJid]: { [canonicalJid]: { name, ts } } }

const FILE = path.join(__dirname, '../../data/nicks.json');

let store = null;
let loadPromise = null;
let saveTimer = null;

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(FILE, {})
      .then((d) => { store = d; })
      .catch((e) => {
        loadPromise = null; // permite reintentar; NUNCA resetear+sobrescribir
        logger.warn(`nickStore: lectura falló (${e.message}); no se toca el archivo`);
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
    catch (e) { logger.error(`nickStore: fallo al guardar: ${e.message}`); }
  }, 10000);
}

// Guarda el pushName tal cual llega. Un nombre vacío TAMBIÉN se registra (como
// cadena vacía): es justo la señal de que esa persona no tiene nick puesto, y
// perderla haría que el scan no pudiera confirmarlo nunca.
async function recordNick(groupJid, userJid, pushName) {
  if (!groupJid || !userJid) return;
  await load();
  const key = canonicalJid(userJid);
  const name = typeof pushName === 'string' ? pushName.trim() : '';
  if (!store[groupJid]) store[groupJid] = {};
  const prev = store[groupJid][key];
  // Evita reescribir (y re-guardar) cuando no ha cambiado nada.
  if (prev && prev.name === name) return;
  store[groupJid][key] = { name, ts: Date.now() };
  scheduleSave();
}

// Devuelve { name, ts } o null si nunca se le ha visto escribir en ese grupo.
async function getNick(groupJid, userJid) {
  await load();
  const g = store[groupJid];
  if (!g) return null;
  return g[canonicalJid(userJid)] || null;
}

async function flushNicks() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (store) {
    try { await atomicWriteJson(FILE, store); }
    catch (e) { logger.error(`nickStore: fallo al flush: ${e.message}`); }
  }
}

module.exports = { recordNick, getNick, flushNicks };
