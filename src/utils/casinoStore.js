const fs = require('fs-extra');
const path = require('path');
const { bareJid } = require('./wa');

const CASINO_FILE = path.join(__dirname, '../../data/casino.json');

let store = null;
let loadPromise = null;
let saveTimer = null;

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = (async () => {
      try { store = await fs.readJson(CASINO_FILE); } catch { store = {}; }
    })();
  }
  await loadPromise;
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try { await fs.writeJson(CASINO_FILE, store); } catch {}
  }, 5000);
}

// Increment message count for the casino system. Returns new total.
async function incrementCasinoCount(groupJid, userJid) {
  await load();
  const key = bareJid(userJid);
  if (!store[groupJid]) store[groupJid] = {};
  const next = (store[groupJid][key] || 0) + 1;
  store[groupJid][key] = next;
  scheduleSave();
  return next;
}

async function getCasinoCount(groupJid, userJid) {
  await load();
  return store[groupJid]?.[bareJid(userJid)] || 0;
}

async function flushCasino() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (store) { try { await fs.writeJson(CASINO_FILE, store); } catch {} }
}

module.exports = { incrementCasinoCount, getCasinoCount, flushCasino };
