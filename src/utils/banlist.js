const path = require('path');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');
const { bareJid } = require('./wa');
const logger = require('./logger');

// Lista negra GLOBAL y persistente (estilo CAS de Telegram): baneado en un
// grupo del bot → rechazado al entrar en cualquiera de sus grupos. Se guardan
// TODAS las formas conocidas de la cuenta (JID de teléfono y LID) porque el
// LID es estable entre grupos: aunque WhatsApp oculte el número, la re-entrada
// con la misma cuenta se detecta igual.
const FILE = path.join(__dirname, '../../data/banlist.json');

let store = null;   // { accounts: { [bareJid]: { reason, at, by } } }
let loadPromise = null;
let saveTimer = null;

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(FILE, { accounts: {} })
      .then((d) => { store = (d && typeof d.accounts === 'object') ? d : { accounts: {} }; })
      .catch((e) => {
        loadPromise = null;
        logger.warn(`banlist: lectura falló (${e.message}); no se toca el archivo`);
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
    catch (e) { logger.error(`banlist: fallo al guardar: ${e.message}`); }
  }, 3000);
}

// Banea todas las formas de una cuenta a la vez (teléfono + LID) para que la
// consulta acierte venga el JID en la forma que venga.
async function banAccount(forms, reason, by) {
  await load();
  const at = Date.now();
  let added = 0;
  for (const f of forms.filter(Boolean).map(bareJid)) {
    if (!store.accounts[f]) added++;
    store.accounts[f] = { reason: reason || 'sin motivo', at, by: by || null };
  }
  if (forms.length) scheduleSave();
  return added;
}

async function unbanAccount(forms) {
  await load();
  let removed = 0;
  for (const f of forms.filter(Boolean).map(bareJid)) {
    if (store.accounts[f]) { delete store.accounts[f]; removed++; }
  }
  if (removed) scheduleSave();
  return removed;
}

// True si CUALQUIERA de las formas dadas está baneada.
async function isBanned(forms) {
  await load();
  return forms.filter(Boolean).map(bareJid).find(f => store.accounts[f]) || null;
}

async function banCount() {
  await load();
  return Object.keys(store.accounts).length;
}

async function flushBanlist() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (store) {
    try { await atomicWriteJson(FILE, store); }
    catch (e) { logger.error(`banlist: fallo al flush: ${e.message}`); }
  }
}

module.exports = { banAccount, unbanAccount, isBanned, banCount, flushBanlist };
