const path = require('path');
const { canonicalJid, rememberMapping } = require('./wa');
const { readJsonOrEnoent, createDebouncedSaver } = require('./helpers');
const logger = require('./logger');

const COUNT_FILE = path.join(__dirname, '../../data/messageCounts.json');

// Fecha del ultimo reseteo por grupo. Vive bajo una clave aparte para no
// confundirse con un participante: un grupo se llama "...@g.us" y esta clave no,
// asi que ninguna lectura de conteos la puede pisar.
const CLAVE_RESETS = '__resets';

let counts = null;
let loadPromise = null;
const saver = createDebouncedSaver(
  () => counts,
  COUNT_FILE,
  25000,
  (e) => logger.error(`messageCounter: fallo al guardar: ${e.message}`),
);

async function load() {
  if (counts) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(COUNT_FILE, {})
      .then((d) => { counts = d; })
      .catch((e) => {
        loadPromise = null; // permite reintentar; NUNCA resetear+sobrescribir
        logger.warn(`messageCounter: lectura falló (${e.message}); no se toca el archivo`);
        throw e;
      });
  }
  await loadPromise;
}

// Debounced save — 25s. El fichero crece para siempre (un contador por persona
// y grupo) y stringifyarlo cada 10s en un grupo activo clavaba el event loop.
function scheduleSave() { saver.schedule(); }

// La clave es canonicalJid, NO bareJid. La misma persona llega unas veces con su
// @lid (mensajes de grupo) y otras con su teléfono (menciones), así que con
// bareJid acababa con DOS entradas: sus mensajes se partían en dos montones y
// salía duplicada en los rankings. canonicalJid colapsa ambas formas en cuanto
// WhatsApp nos dice la correspondencia, igual que hace auraStore.
//
// Aun así, los montones viejos escritos antes de conocer la correspondencia
// siguen en el archivo bajo la clave antigua, por eso las LECTURAS agrupan
// siempre por identidad en vez de fiarse de la clave.
async function increment(groupJid, userJid, altJid = null) {
  await load();
  // SE APRENDE LA CORRESPONDENCIA AQUI, QUE ES CUANDO SE SABE.
  //
  // Cada mensaje de grupo trae las dos formas de quien escribe (participant y
  // participantAlt). Si no se anota la pareja en este momento, el conteo se
  // guarda bajo el @lid y luego NADIE puede cruzarlo con la lista de miembros,
  // que viene por telefono: la persona sale con 0 mensajes habiendo escrito 25.
  // Reproducido, y es justo lo que se vio en el grupo.
  if (altJid) rememberMapping(userJid, altJid);
  const key = canonicalJid(userJid);
  if (!counts[groupJid]) counts[groupJid] = {};
  counts[groupJid][key] = (counts[groupJid][key] || 0) + 1;
  scheduleSave();
}

// Agrupa las claves de un grupo por persona. Dos claves son la misma persona
// exactamente cuando su canonicalJid coincide (es lo que hace sameUser por
// dentro), así que agrupar por esa clave es equivalente y va en O(n) en vez de
// comparar todas contra todas.
//
// Como representante se prefiere la forma de teléfono: es la que sirve para
// mencionar, y los rankings pintan menciones.
function mergeByPerson(group) {
  const out = new Map(); // canonicalKey -> { jid, count }
  for (const k in group) {
    const id = canonicalJid(k);
    // El representante es la forma de TELEFONO siempre que se sepa cual es, y
    // por eso se prefiere `id` (ya canonizado) sobre la clave cruda: si la
    // persona solo tiene un monton y esta guardado bajo su @lid, quedarse con
    // la clave dejaba un "@919191919191" en el ranking — un numero que no es de
    // nadie y que WhatsApp no sabe convertir en un nombre. El @lid solo
    // sobrevive cuando de verdad no se conoce el telefono.
    const rep = id.endsWith('@lid') ? k : id;
    const prev = out.get(id);
    if (!prev) { out.set(id, { jid: rep, count: group[k] }); continue; }
    prev.count += group[k];
    if (!rep.endsWith('@lid')) prev.jid = rep;
  }
  return out;
}

// Requires an explicit groupJid — passing null/undefined would silently wipe
// all groups' data. An explicit resetAllCounts() exists for that intent.
async function resetCounts(groupJid) {
  if (!groupJid) throw new Error('resetCounts: groupJid requerido — usa resetAllCounts() para borrar todo');
  await load();
  delete counts[groupJid];
  if (!counts[CLAVE_RESETS]) counts[CLAVE_RESETS] = {};
  counts[CLAVE_RESETS][groupJid] = Date.now();
  scheduleSave();
}

async function resetAllCounts() {
  await load();
  // Se conserva el historial de reseteos: es un dato del grupo, no un conteo, y
  // si se borrara nadie podria saber desde cuando cuenta el ranking.
  const resets = counts?.[CLAVE_RESETS] || {};
  counts = { [CLAVE_RESETS]: { ...resets, __global: Date.now() } };
  scheduleSave();
}

// Momento del ultimo reseteo del grupo, en ms. null si nunca se resetró.
async function getLastReset(groupJid) {
  await load();
  const r = counts?.[CLAVE_RESETS];
  if (!r) return null;
  return r[groupJid] || r.__global || null;
}

async function getActiveUsers(groupJid, minMessages = 10) {
  await load();
  if (groupJid === CLAVE_RESETS) return [];
  const group = counts[groupJid];
  if (!group) return [];
  const out = [];
  for (const { jid, count } of mergeByPerson(group).values()) {
    if (count >= minMessages) out.push({ jid, count });
  }
  return out;
}

async function getUserCount(groupJid, userJid) {
  await load();
  const group = counts[groupJid];
  if (!group) return 0;
  const key = canonicalJid(userJid);
  // Camino rápido: la clave ya está canonizada y no hay ninguna otra forma suya
  // suelta en el archivo. Es el caso normal una vez conocida la correspondencia.
  const directo = group[key];
  const keyEsLid = typeof key === 'string' && key.endsWith('@lid');
  let total = 0, otras = 0;
  for (const k in group) {
    if (k === key) continue;
    if (!keyEsLid && !String(k).endsWith('@lid')) continue;
    if (canonicalJid(k) !== key) continue;
    total += group[k];
    otras++;
  }
  if (!otras) return directo || 0;
  // Quedaban montones bajo una forma antigua: se suman todos.
  return (directo || 0) + total;
}

async function flushCounts() {
  await saver.flush();
}

module.exports = { increment, getActiveUsers, getUserCount, resetCounts, resetAllCounts, getLastReset, flushCounts };
