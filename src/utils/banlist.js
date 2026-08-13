const path = require('path');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');
const { bareJid, sameUser } = require('./wa');
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
        logger.warn(`banlist: lectura falló (${e.message}); no se toca el archivo.`);
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
    catch (e) { logger.error(`banlist: fallo al guardar: ${e.message}.`); }
  }, 3000);
}

// Banea todas las formas de una cuenta a la vez (teléfono + LID) para que la
// consulta acierte venga el JID en la forma que venga.
async function banAccount(forms, reason, by) {
  await load();
  const at = Date.now();
  // `aka` deja escrito qué formas se banearon juntas. Sin ese vínculo, el
  // desbaneo solo podía borrar las formas que quien lo pidiera lograra
  // reconstruir — y justo después de un ban al usuario se le expulsa, así que
  // su ficha de miembro ya no está y la otra forma se volvía irrecuperable: la
  // persona seguía vetada para siempre mientras el bot decía lo contrario.
  const all = [...new Set(forms.filter(Boolean).map(bareJid))];
  let added = 0;
  for (const f of all) {
    if (!store.accounts[f]) added++;
    store.accounts[f] = { reason: reason || 'sin motivo', at, by: by || null, aka: all };
  }
  if (all.length) scheduleSave();
  return added;
}

async function unbanAccount(forms) {
  await load();
  const objetivo = new Set(forms.filter(Boolean).map(bareJid));

  // 1) Las formas que se banearon junto a esta.
  for (const f of [...objetivo]) {
    for (const a of (store.accounts[f]?.aka || [])) objetivo.add(bareJid(a));
  }
  // 2) Y cualquier otra entrada que sea la misma persona (cubre los baneos
  //    viejos, escritos antes de que existiera `aka`).
  const claves = Object.keys(store.accounts);
  for (const k of claves) {
    if (objetivo.has(k)) continue;
    for (const t of objetivo) {
      if (sameUser(k, t)) { objetivo.add(k); break; }
    }
  }

  let removed = 0;
  for (const f of objetivo) {
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

// Contenido de la lista negra, de lo más reciente a lo más antiguo. Existe para
// que *!fklist* pueda enseñarla: mientras no había forma de mirarla, un baneo
// automático equivocado era irreparable en la práctica, porque para deshacerlo
// hay que saber el número exacto de alguien a quien el bot ya expulsó.
async function listBanned() {
  await load();
  return Object.entries(store.accounts)
    .map(([account, d]) => ({ account, ...(d || {}) }))
    .sort((a, b) => (b.at || 0) - (a.at || 0));
}

async function flushBanlist() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (store) {
    try { await atomicWriteJson(FILE, store); }
    catch (e) { logger.error(`banlist: fallo al flush: ${e.message}.`); }
  }
}

module.exports = { banAccount, unbanAccount, isBanned, banCount, listBanned, flushBanlist };
