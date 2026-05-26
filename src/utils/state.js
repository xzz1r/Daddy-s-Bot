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

async function toggleGroup(jid, enable) {
  if (enable) {
    _state.disabledGroups = (_state.disabledGroups || []).filter(g => g !== jid);
  } else {
    if (!_state.disabledGroups) _state.disabledGroups = [];
    if (!_state.disabledGroups.includes(jid)) _state.disabledGroups.push(jid);
  }
  await saveState(_state);
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

// Sync — admin change notifications are ON by default for every group
function isAdminNotifyEnabled(jid) {
  return !(_state.adminNotifyDisabled || []).includes(jid);
}

async function toggleAdminNotify(jid, enable) {
  if (!_state.adminNotifyDisabled) _state.adminNotifyDisabled = [];
  if (enable) {
    _state.adminNotifyDisabled = _state.adminNotifyDisabled.filter(g => g !== jid);
  } else {
    if (!_state.adminNotifyDisabled.includes(jid)) _state.adminNotifyDisabled.push(jid);
  }
  await saveState(_state);
}

// Sync — anti-admin protection is OFF by default. When ON, any promote by a
// non-owner admin gets auto-reverted (both author and target are demoted).
function isAntiAdminEnabled(jid) {
  return (_state.antiAdminEnabled || []).includes(jid);
}

async function toggleAntiAdmin(jid, enable) {
  if (!_state.antiAdminEnabled) _state.antiAdminEnabled = [];
  if (enable) {
    if (!_state.antiAdminEnabled.includes(jid)) _state.antiAdminEnabled.push(jid);
  } else {
    _state.antiAdminEnabled = _state.antiAdminEnabled.filter(g => g !== jid);
  }
  await saveState(_state);
}

// Sync — anti-business is OFF by default. When ON, WhatsApp Business accounts
// joining the group are kicked automatically.
function isAntiBusinessEnabled(jid) {
  return (_state.antiBusinessEnabled || []).includes(jid);
}

async function toggleAntiBusiness(jid, enable) {
  if (!_state.antiBusinessEnabled) _state.antiBusinessEnabled = [];
  if (enable) {
    if (!_state.antiBusinessEnabled.includes(jid)) _state.antiBusinessEnabled.push(jid);
  } else {
    _state.antiBusinessEnabled = _state.antiBusinessEnabled.filter(g => g !== jid);
  }
  await saveState(_state);
}

module.exports = { initState, getState, setState, isBotEnabled, toggleGroup, incrementStat, flushState, isAdminNotifyEnabled, toggleAdminNotify, isAntiAdminEnabled, toggleAntiAdmin, isAntiBusinessEnabled, toggleAntiBusiness };

