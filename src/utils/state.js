const fs = require('fs-extra');
const path = require('path');
const { atomicWriteJson } = require('./helpers');

const STATE_FILE = path.join(__dirname, '../../data/state.json');

const defaultState = {
  botEnabled: true,
  disabledGroups: [],
  stats: {
    messagesReceived: 0,
    commandsExecuted: 0,
    stickersCreated: 0,
    musicPlayed: 0,
    startTime: Date.now(),
  },
};

async function loadState() {
  await fs.ensureFile(STATE_FILE);
  // A transient read error (EACCES/EMFILE/ENOMEM under memory pressure) must NOT
  // fall back to defaults — the first setState would then overwrite the real
  // per-group config (disabled groups, anti-admin/link toggles) with defaults.
  // Let it propagate so startup fails loud and pm2 restarts with data intact.
  const raw = await fs.readFile(STATE_FILE, 'utf-8');
  if (!raw.trim()) return { ...defaultState };
  try {
    const parsed = JSON.parse(raw);
    // Deep-merge stats so a partial on-disk object (e.g. missing startTime, or a
    // newly-added counter) keeps the defaults instead of dropping them.
    return { ...defaultState, ...parsed, stats: { ...defaultState.stats, ...(parsed.stats || {}) } };
  } catch {
    // Corrupt JSON is genuinely unrecoverable (very rare with atomic writes) —
    // reset to defaults so the bot can still boot.
    return { ...defaultState };
  }
}

async function saveState(state) {
  await atomicWriteJson(STATE_FILE, state);
}

let _state = { ...defaultState };
let _saveTimer = null;
let _loaded = false;

// Load from disk once. Subsequent calls (e.g. on every reconnect) keep the
// live in-memory state instead of reloading and discarding stat increments that
// haven't been flushed yet.
async function initState() {
  if (_loaded) return _state;
  _state = await loadState();
  _loaded = true;
  return _state;
}

function getState() {
  return _state;
}

async function setState(updates) {
  // One-level deep merge: plain-object values are merged into the existing
  // sub-object rather than replacing it wholesale. This prevents a caller
  // doing setState({ stats: { messagesReceived: 0 } }) from silently dropping
  // commandsExecuted, stickersCreated, etc.
  for (const [k, v] of Object.entries(updates)) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v) &&
        _state[k] !== null && typeof _state[k] === 'object') {
      _state[k] = { ..._state[k], ...v };
    } else {
      _state[k] = v;
    }
  }
  await saveState(_state);
  return _state;
}

// Sync — reads in-memory state only
function isBotEnabled(jid) {
  if (!_state.botEnabled) return false;
  if (_state.disabledGroups?.includes(jid)) return false;
  return true;
}

// Sync + debounced disk write — never blocks message handling
function incrementStat(key) {
  if (!_state.stats) _state.stats = {};
  _state.stats[key] = (_state.stats[key] || 0) + 1;
  if (!_saveTimer) {
    _saveTimer = setTimeout(() => {
      _saveTimer = null;
      saveState(_state).catch(() => {});
    }, 5000);
  }
}

// Force-flush any pending debounced save — called on shutdown so the last
// few seconds of stat increments aren't lost when the process exits.
async function flushState() {
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  try { await saveState(_state); } catch {}
}

// Per-group flag lists. `key` is the state field; `present` toggles membership.
// Some flags are stored as opt-out lists (disabledGroups, adminNotifyDisabled)
// and some as opt-in (antiAdminEnabled, antiBusinessEnabled) — the caller passes
// the semantically correct `present` value.
function hasMembership(key, jid) {
  return (_state[key] || []).includes(jid);
}

async function setMembership(key, jid, present) {
  const list = _state[key] || [];
  const has = list.includes(jid);
  if (present && !has) _state[key] = [...list, jid];
  else if (!present && has) _state[key] = list.filter(g => g !== jid);
  else return;
  await saveState(_state);
}

// Disabled per group (opt-out) → enable=true means NOT in list
const toggleGroup        = (jid, enable) => setMembership('disabledGroups',       jid, !enable);
const isAdminNotifyEnabled = (jid)       => !hasMembership('adminNotifyDisabled', jid);
const toggleAdminNotify  = (jid, enable) => setMembership('adminNotifyDisabled',  jid, !enable);

// Enabled per group (opt-in) → enable=true means IN list
const isAntiAdminEnabled    = (jid)         => hasMembership('antiAdminEnabled',     jid);
const toggleAntiAdmin       = (jid, enable) => setMembership('antiAdminEnabled',     jid, enable);
const isAntiBusinessEnabled = (jid)         => hasMembership('antiBusinessEnabled',  jid);
const toggleAntiBusiness    = (jid, enable) => setMembership('antiBusinessEnabled',  jid, enable);

// Anti-fake (guard de entradas: lista negra + huella de fotos)
const isAntiFakeEnabled     = (jid)         => hasMembership('antiFakeEnabled',      jid);
const toggleAntiFake        = (jid, enable) => setMembership('antiFakeEnabled',      jid, enable);

// Anti-link is opt-OUT (default ON) — it was always-on before becoming a toggle,
// so groups stay protected unless the owner explicitly turns it off.
const isAntiLinkEnabled     = (jid)         => !hasMembership('antiLinkDisabled',    jid);
const toggleAntiLink        = (jid, enable) => setMembership('antiLinkDisabled',     jid, !enable);

module.exports = { initState, getState, setState, isBotEnabled, toggleGroup, incrementStat, flushState, isAdminNotifyEnabled, toggleAdminNotify, isAntiAdminEnabled, toggleAntiAdmin, isAntiBusinessEnabled, toggleAntiBusiness, isAntiLinkEnabled, toggleAntiLink, isAntiFakeEnabled, toggleAntiFake };

