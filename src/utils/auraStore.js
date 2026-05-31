const fs = require('fs-extra');
const path = require('path');
const { bareJid } = require('./wa');

const AURA_FILE = path.join(__dirname, '../../data/aura.json');

// Everyone starts here. Aura then accumulates (or bleeds) over time as people
// roll !aura — the value persists per user per group.
const STARTING_AURA = 1000;

let store = null;          // { [groupJid]: { [bareJid]: number } }
let loadPromise = null;
let saveTimer = null;

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = (async () => {
      try { store = await fs.readJson(AURA_FILE); } catch { store = {}; }
    })();
  }
  await loadPromise;
}

// Debounced write — aura changes are infrequent, 5s batches any burst.
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try { await fs.writeJson(AURA_FILE, store); } catch {}
  }, 5000);
}

// Current aura for a user (STARTING_AURA if never rolled before).
async function getAura(groupJid, userJid) {
  await load();
  const key = bareJid(userJid);
  const g = store[groupJid];
  if (!g || g[key] === undefined) return STARTING_AURA;
  return g[key];
}

// Apply a delta and return { previous, current }. Aura can go negative — being
// in the red is part of the humiliation.
async function addAura(groupJid, userJid, delta) {
  await load();
  const key = bareJid(userJid);
  if (!store[groupJid]) store[groupJid] = {};
  const previous = store[groupJid][key] === undefined ? STARTING_AURA : store[groupJid][key];
  const current = previous + delta;
  store[groupJid][key] = current;
  scheduleSave();
  return { previous, current };
}

// Top N by aura in a group (descending). Returns [{ jid, aura }].
async function getAuraRanking(groupJid) {
  await load();
  const g = store[groupJid];
  if (!g) return [];
  return Object.keys(g)
    .map(jid => ({ jid, aura: g[jid] }))
    .sort((a, b) => b.aura - a.aura);
}

async function flushAura() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (store) { try { await fs.writeJson(AURA_FILE, store); } catch {} }
}

module.exports = { getAura, addAura, getAuraRanking, flushAura, STARTING_AURA };
