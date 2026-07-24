const fs = require('fs-extra');
const path = require('path');
const { bareJid, sameUser } = require('./wa');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');
const logger = require('./logger');

const COUNT_FILE = path.join(__dirname, '../../data/messageCounts.json');

let counts = null;
let loadPromise = null;
let saveTimer = null;

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

// Debounced save — 10s batches bursts on chatty groups.
// Worst-case loss on crash: ~10s of message counts, acceptable.
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try { await atomicWriteJson(COUNT_FILE, counts); }
    catch (e) { logger.error(`messageCounter: fallo al guardar: ${e.message}`); }
  }, 10000);
}

async function increment(groupJid, userJid) {
  await load();
  const key = bareJid(userJid);
  if (!counts[groupJid]) counts[groupJid] = {};
  counts[groupJid][key] = (counts[groupJid][key] || 0) + 1;
  scheduleSave();
}

// Requires an explicit groupJid — passing null/undefined would silently wipe
// all groups' data. An explicit resetAllCounts() exists for that intent.
async function resetCounts(groupJid) {
  if (!groupJid) throw new Error('resetCounts: groupJid requerido — usa resetAllCounts() para borrar todo');
  await load();
  delete counts[groupJid];
  scheduleSave();
}

async function resetAllCounts() {
  await load();
  counts = {};
  scheduleSave();
}

async function getActiveUsers(groupJid, minMessages = 10) {
  await load();
  const group = counts[groupJid];
  if (!group) return [];
  const out = [];
  for (const jid in group) {
    const count = group[jid];
    if (count >= minMessages) out.push({ jid, count });
  }
  return out;
}

async function getUserCount(groupJid, userJid) {
  await load();
  const group = counts[groupJid];
  if (!group) return 0;
  // Fast path: exact key hit (same JID form that was stored on increment).
  const key = bareJid(userJid);
  if (group[key] !== undefined) return group[key];
  // Bridge LID↔phone: increments store the sender's LID (modern groups) while a
  // lookup often arrives as a phone-form mention. Sum every stored key that maps
  // to the same person, so callers like !roast don't read 0 for an active user.
  let total = 0;
  for (const k in group) {
    if (sameUser(k, userJid)) total += group[k];
  }
  return total;
}

async function flushCounts() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (counts) {
    try { await atomicWriteJson(COUNT_FILE, counts); }
    catch (e) { logger.error(`messageCounter: fallo al flush: ${e.message}`); }
  }
}

module.exports = { increment, getActiveUsers, getUserCount, resetCounts, resetAllCounts, flushCounts };
