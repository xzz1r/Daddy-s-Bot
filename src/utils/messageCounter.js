const fs = require('fs-extra');
const path = require('path');
const { bareJid } = require('./wa');
const { atomicWriteJson } = require('./helpers');
const logger = require('./logger');

const COUNT_FILE = path.join(__dirname, '../../data/messageCounts.json');

let counts = null;
let loadPromise = null;
let saveTimer = null;

async function load() {
  if (counts) return;
  if (!loadPromise) {
    loadPromise = (async () => {
      try { counts = await fs.readJson(COUNT_FILE); } catch { counts = {}; }
    })();
  }
  await loadPromise;
}

// Debounced save to avoid disk thrash on busy groups.
// 10s window batches hundreds of increments into one write on chatty groups —
// worst case loss on crash is ~10s of message counts, which is acceptable.
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
  // Normalize the key (strip device suffix) so a user's messages always
  // accumulate under one entry — the same bareJid() the readers (!vs, !count)
  // use to look users up. Without this, `123@lid` and `123:5@lid` would split.
  const key = bareJid(userJid);
  if (!counts[groupJid]) counts[groupJid] = {};
  counts[groupJid][key] = (counts[groupJid][key] || 0) + 1;
  scheduleSave();
}

async function resetCounts(groupJid) {
  await load();
  if (groupJid) {
    delete counts[groupJid];
  } else {
    counts = {};
  }
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

// Force-flush pending debounced save — call on shutdown to avoid losing
// up to 10s of message counts when the process exits.
async function flushCounts() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (counts) {
    try { await atomicWriteJson(COUNT_FILE, counts); }
    catch (e) { logger.error(`messageCounter: fallo al flush: ${e.message}`); }
  }
}

module.exports = { increment, getActiveUsers, getUserCount, resetCounts, flushCounts };
