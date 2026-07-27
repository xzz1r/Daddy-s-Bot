const path = require('path');
const { bareJid } = require('./wa');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');
const logger = require('./logger');

// Nombres visibles (pushName) de cada miembro, para !antinick.
//
// De esto cuelga una expulsión irreversible, así que el diseño es deliberado:
//
//  1. AUSENCIA DE DATO NO ES "NO TIENE NICK". WhatsApp no siempre adjunta el
//     atributo notify (mensajes de sistema, reenvíos, ciertos protocolos), así
//     que pushName llega undefined con normalidad para gente que SÍ tiene
//     nombre. Guardar eso como cadena vacía marcaría para expulsión a quien no
//     toca. Aquí un pushName ausente solo incrementa un contador.
//
//  2. UN NOMBRE BUENO NUNCA SE PISA con una ausencia. Solo lo reemplaza otro
//     nombre real.
//
//  3. LA CLAVE ES bareJid, NO canonicalJid. canonicalJid depende del mapa
//     lidToPhone, que se va llenando durante la ejecución: el mismo usuario
//     daría el LID crudo con el mapa frío y el teléfono con el mapa caliente,
//     partiendo su registro en dos. bareJid es estable siempre; la unificación
//     se hace al LEER, consultando todas las formas conocidas del participante.
//
// store = { [groupJid]: { [bareJid]: { name, ts, misses } } }
//   name   → último nombre real visto ('' si nunca se ha visto ninguno)
//   ts     → cuándo se actualizó por última vez
//   misses → mensajes suyos observados sin nombre adjunto

const FILE = path.join(__dirname, '../../data/nicks.json');

// Hacen falta varias observaciones sin nombre antes de dar por hecho que
// alguien no tiene nick: una sola puede ser un mensaje sin notify.
const MIN_MISSES = 2;

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

async function recordNick(groupJid, userJid, pushName) {
  if (!groupJid || !userJid) return;
  await load();
  const key = bareJid(userJid);
  if (!store[groupJid]) store[groupJid] = {};
  const prev = store[groupJid][key] || { name: '', ts: 0, misses: 0 };

  const real = typeof pushName === 'string' && pushName.trim().length > 0;

  if (real) {
    const name = pushName.trim();
    if (prev.name === name) return; // sin cambios, no reescribir ni re-guardar
    store[groupJid][key] = { name, ts: Date.now(), misses: 0 };
    scheduleSave();
    return;
  }

  // Sin nombre en este mensaje: NO se toca prev.name, solo se cuenta.
  // Se topea para que el JSON no crezca con números enormes.
  const misses = Math.min((prev.misses || 0) + 1, MIN_MISSES + 2);
  if (misses === prev.misses) return;
  store[groupJid][key] = { name: prev.name || '', ts: prev.ts || Date.now(), misses };
  scheduleSave();
}

// Devuelve el mejor registro entre TODAS las formas del usuario (id, lid,
// teléfono), que es lo que unifica a quien quedó anotado bajo dos claves.
// El "mejor" es el que tenga nombre real; si ninguno lo tiene, el de más
// observaciones sin nombre.
async function getNickAnyForm(groupJid, forms) {
  await load();
  const g = store[groupJid];
  if (!g) return null;

  let best = null;
  for (const f of forms) {
    if (!f) continue;
    const rec = g[bareJid(f)];
    if (!rec) continue;
    if (rec.name) {
      if (!best || !best.name || (rec.ts || 0) > (best.ts || 0)) best = rec;
    } else if (!best || !best.name) {
      if (!best || (rec.misses || 0) > (best.misses || 0)) best = rec;
    }
  }
  return best;
}

async function flushNicks() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (store) {
    try { await atomicWriteJson(FILE, store); }
    catch (e) { logger.error(`nickStore: fallo al flush: ${e.message}`); }
  }
}

// Solo para pruebas: vacía el estado en memoria.
function _resetNickStore() { store = null; loadPromise = null; }

module.exports = { recordNick, getNickAnyForm, flushNicks, MIN_MISSES, _resetNickStore };
