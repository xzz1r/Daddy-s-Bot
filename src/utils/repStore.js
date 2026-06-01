const fs = require('fs-extra');
const path = require('path');
const { bareJid } = require('./wa');

const REP_FILE = path.join(__dirname, '../../data/rep.json');

// Reputation starts at 0 and is earned (or lost) from other members via !rep /
// !unrep. It persists per user per group, mirroring the aura store.
const STARTING_REP = 0;

let store = null;          // { [groupJid]: { [bareJid]: number } }
let loadPromise = null;
let saveTimer = null;

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = (async () => {
      try { store = await fs.readJson(REP_FILE); } catch { store = {}; }
    })();
  }
  await loadPromise;
}

// Debounced write — rep changes are infrequent, 5s batches any burst.
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try { await fs.writeJson(REP_FILE, store); } catch {}
  }, 5000);
}

async function getRep(groupJid, userJid) {
  await load();
  const key = bareJid(userJid);
  const g = store[groupJid];
  if (!g || g[key] === undefined) return STARTING_REP;
  return g[key];
}

// Apply a delta and return { previous, current }. Rep can go negative — being
// in the red means the group actively dislikes you.
async function addRep(groupJid, userJid, delta) {
  await load();
  const key = bareJid(userJid);
  if (!store[groupJid]) store[groupJid] = {};
  const previous = store[groupJid][key] === undefined ? STARTING_REP : store[groupJid][key];
  const current = previous + delta;
  store[groupJid][key] = current;
  scheduleSave();
  return { previous, current };
}

// Top by rep in a group (descending). Returns [{ jid, rep }].
async function getRepRanking(groupJid) {
  await load();
  const g = store[groupJid];
  if (!g) return [];
  return Object.keys(g)
    .map(jid => ({ jid, rep: g[jid] }))
    .sort((a, b) => b.rep - a.rep);
}

async function flushRep() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (store) { try { await fs.writeJson(REP_FILE, store); } catch {} }
}

module.exports = { getRep, addRep, getRepRanking, flushRep, STARTING_REP };
