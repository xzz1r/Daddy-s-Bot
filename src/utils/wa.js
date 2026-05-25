// Shared WhatsApp/Baileys helpers. Centralizing these kills the 4x duplicates
// of isAdmin and 2x of getTarget that were drifting across command files.

const config = require('../config');

function isOwner(jid, fromMe) {
  if (fromMe) return true;
  if (!jid) return false;
  const num = jid.replace(/@[^@]+$/, '').replace(/\D/g, '');
  const owner = String(config.ownerNumber).replace(/\D/g, '');
  return num === owner || num.endsWith(owner) || owner.endsWith(num);
}

function isAdmin(participants, jid) {
  if (!participants || !jid) return false;
  const p = participants.find(x => x.id === jid);
  return p?.admin === 'admin' || p?.admin === 'superadmin';
}

function isAdminInMeta(groupMeta, jid) {
  return isAdmin(groupMeta?.participants, jid);
}

// Mention/reply target. Returns null when neither is present.
function getTarget(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  return ctx?.mentionedJid?.[0] || ctx?.participant || null;
}

// Same as getTarget but defaults to the sender — used by !sexy/!gay/etc.
function getTargetOrSelf(msg) {
  return getTarget(msg) || msg.key.participant || msg.key.remoteJid;
}

function extractText(msg) {
  const m = msg.message;
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    m?.documentMessage?.caption ||
    ''
  );
}

function extractQuotedText(msg) {
  const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!q) return null;
  return (
    q.conversation ||
    q.extendedTextMessage?.text ||
    q.imageMessage?.caption ||
    q.videoMessage?.caption ||
    q.documentMessage?.caption ||
    null
  );
}

module.exports = {
  isOwner,
  isAdmin,
  isAdminInMeta,
  getTarget,
  getTargetOrSelf,
  extractText,
  extractQuotedText,
};
