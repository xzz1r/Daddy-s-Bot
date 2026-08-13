'use strict';

const path = require('path');
const { canonicalJid } = require('./wa');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');
const logger = require('./logger');

// Permiso para publicar enlaces (!allow) y los avisos que lleva cada uno.
//
// store = { [grupoJid]: { [canonicalJid]: { ok: true, avisos: n, ts } } }
//   ok     → un admin le dio el permiso con *!allow*
//   avisos → cuántas veces se le ha borrado un enlace sin tener permiso.
//            Al tercero se le banea, así que esto NO puede vivir solo en
//            memoria: un reinicio le regalaría los avisos ya gastados.
//
// La clave es canonicalJid, igual que en aura y en el contador: si no, la misma
// persona tendría un permiso por cada forma de su JID y los avisos se le
// partirían en dos montones.

const FILE = path.join(__dirname, '../../data/linkperms.json');

// Avisos antes del ban. El tercero es el que lo echa.
const MAX_AVISOS = 3;

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
        logger.warn(`linkPerms: lectura falló (${e.message}); no se toca el archivo.`);
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
    catch (e) { logger.error(`linkPerms: fallo al guardar: ${e.message}.`); }
  }, 3000);
}

function ficha(grupo, jid) {
  const g = store[grupo] || (store[grupo] = {});
  const k = canonicalJid(jid);
  return { g, k, rec: g[k] };
}

// Da el permiso. Devuelve true si no lo tenía ya.
async function allow(grupo, jid) {
  await load();
  const { g, k, rec } = ficha(grupo, jid);
  const nuevo = !rec?.ok;
  // Al dar el permiso se le perdonan los avisos: ya no tiene sentido contarlos.
  g[k] = { ok: true, avisos: 0, ts: Date.now() };
  scheduleSave();
  return nuevo;
}

// Quita el permiso. Devuelve true si lo tenía. Los avisos se dejan a cero: el
// que ya cumplió no arrastra un historial que lo banee al primer resbalón.
async function disallow(grupo, jid) {
  await load();
  const { g, k, rec } = ficha(grupo, jid);
  if (!rec?.ok) return false;
  g[k] = { ok: false, avisos: 0, ts: Date.now() };
  scheduleSave();
  return true;
}

// ¿Tiene permiso? Se consultan TODAS las formas conocidas del usuario, porque
// el permiso pudo darse sobre una y el mensaje llegar con otra.
async function isAllowed(grupo, forms) {
  await load();
  const g = store[grupo];
  if (!g) return false;
  for (const f of (Array.isArray(forms) ? forms : [forms])) {
    if (!f) continue;
    if (g[canonicalJid(f)]?.ok) return true;
  }
  return false;
}

// Borra los avisos acumulados. Se llama justo tras el ban: si no, quien
// consiguiera volver al grupo se comería otro ban con el primer enlace, sin un
// solo aviso, mientras el mensaje del bot afirma que se le avisó dos veces.
async function resetWarnings(grupo, jid) {
  await load();
  const { g, k, rec } = ficha(grupo, jid);
  if (!rec || !rec.avisos) return;
  g[k] = { ok: Boolean(rec.ok), avisos: 0, ts: Date.now() };
  scheduleSave();
}

// Suma un aviso y dice cuántos lleva y si toca banear.
async function noteWarning(grupo, jid) {
  await load();
  const { g, k, rec } = ficha(grupo, jid);
  const avisos = (rec?.avisos || 0) + 1;
  g[k] = { ok: false, avisos, ts: Date.now() };
  scheduleSave();
  return { avisos, restantes: Math.max(0, MAX_AVISOS - avisos), ban: avisos >= MAX_AVISOS };
}

// Los que tienen permiso en este grupo.
async function listAllowed(grupo) {
  await load();
  const g = store[grupo];
  if (!g) return [];
  return Object.keys(g).filter(k => g[k]?.ok);
}

async function flushLinkPerms() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (store) {
    try { await atomicWriteJson(FILE, store); }
    catch (e) { logger.error(`linkPerms: fallo al flush: ${e.message}.`); }
  }
}

// Solo para pruebas.
function _reset() { store = null; loadPromise = null; }

module.exports = {
  allow, disallow, isAllowed, noteWarning, resetWarnings, listAllowed, flushLinkPerms,
  MAX_AVISOS, _reset,
};
