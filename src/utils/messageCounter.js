const fs = require('fs-extra');
const path = require('path');
const { bareJid } = require('./wa');
const { atomicWriteJson } = require('./helpers');
const logger = require('./logger');

const COUNT_FILE = path.join(__dirname, '../../data/messageCounts.json');

let counts = null;
let loadPromise = null;
let saveTimer = null;

// Per-(group,user) write queue — same serialization as auraStore.
const writeQueue = new Map();

function serialized(key, fn) {
  const prev = writeQueue.get(key) ?? Promise.resolve();
  const next = prev.then(fn);
  writeQueue.set(key, next.catch(() => {}));
  return next;
}

async function load() {
  if (counts) return;
  if (!loadPromise) {
    loadPromise = (async () => {
      try { counts = await fs.readJson(COUNT_FILE); } catch { counts = {}; }
    })();
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
  const qKey = `${groupJid}|${key}`;
  return serialized(qKey, () => {
    if (!counts[groupJid]) counts[groupJid] = {};
    counts[groupJid][key] = (counts[groupJid][key] || 0) + 1;
    scheduleSave();
  });
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
  const key = bareJid(userJid);
  return counts[groupJid]?.[key] || 0;
}

async function flushCounts() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (counts) {
    try { await atomicWriteJson(COUNT_FILE, counts); }
    catch (e) { logger.error(`messageCounter: fallo al flush: ${e.message}`); }
  }
}

module.exports = { increment, getActiveUsers, getUserCount, resetCounts, resetAllCounts, flushCounts };
