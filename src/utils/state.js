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

async function isBotEnabled(jid) {
  if (!_state.botEnabled) return false;
  if (_state.disabledGroups && _state.disabledGroups.includes(jid)) return false;
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

async function incrementStat(key) {
  if (!_state.stats) _state.stats = {};
  _state.stats[key] = (_state.stats[key] || 0) + 1;
  await saveState(_state);
}

module.exports = { initState, getState, setState, isBotEnabled, toggleGroup, incrementStat };
