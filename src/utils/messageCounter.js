const fs = require('fs-extra');
const path = require('path');

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

// Debounced save to avoid disk thrash on busy groups
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try { await fs.writeJson(COUNT_FILE, counts); } catch {}
  }, 2000);
}

async function increment(groupJid, userJid) {
  await load();
  if (!counts[groupJid]) counts[groupJid] = {};
  counts[groupJid][userJid] = (counts[groupJid][userJid] || 0) + 1;
  scheduleSave();
}

async function getActiveUsers(groupJid, minMessages = 10) {
  await load();
  const group = counts[groupJid] || {};
  return Object.entries(group)
    .filter(([, c]) => c >= minMessages)
    .map(([jid, count]) => ({ jid, count }));
}

module.exports = { increment, getActiveUsers };
