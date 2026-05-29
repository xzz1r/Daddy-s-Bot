const fs = require('fs-extra');
const path = require('path');

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
  try {
    await fs.ensureFile(STATE_FILE);
    const raw = await fs.readFile(STATE_FILE, 'utf-8');
    if (!raw.trim()) return { ...defaultState };
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return { ...defaultState };
  }
}

async function saveState(state) {
  await fs.ensureFile(STATE_FILE);
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

let _state = { ...defaultState };
let _saveTimer = null;

async function initState() {
  _state = await loadState();
  return _state;
}

function getState() {
  return _state;
}

async function setState(updates) {
  _state = { ..._state, ...updates };
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

// Anti-link is opt-OUT (default ON) — it was always-on before becoming a toggle,
// so groups stay protected unless the owner explicitly turns it off.
const isAntiLinkEnabled     = (jid)         => !hasMembership('antiLinkDisabled',    jid);
const toggleAntiLink        = (jid, enable) => setMembership('antiLinkDisabled',     jid, !enable);

module.exports = { initState, getState, setState, isBotEnabled, toggleGroup, incrementStat, flushState, isAdminNotifyEnabled, toggleAdminNotify, isAntiAdminEnabled, toggleAntiAdmin, isAntiBusinessEnabled, toggleAntiBusiness, isAntiLinkEnabled, toggleAntiLink };

