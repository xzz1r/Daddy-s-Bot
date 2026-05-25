// Shared WhatsApp/Baileys helpers. Centralizing these kills the 4x duplicates
// of isAdmin and 2x of getTarget that were drifting across command files.

const config = require('../config');

function isOwner(jid, fromMe, groupMeta) {
  if (fromMe) return true;
  if (!jid) return false;

  const owners = [
    String(config.ownerNumber).replace(/\D/g, ''),
    ...(config.coOwners || []).map(n => String(n).replace(/\D/g, '')),
  ];

  // Candidates: the JID itself, plus the participant's phoneNumber if we have
  // group metadata. Modern groups use LID JIDs (xxxxx@lid) — extracting digits
  // from a LID does NOT give a phone number, so without this lookup the
  // co-owner check silently fails in every group.
  const candidates = [jid];
  if (groupMeta?.participants) {
    const p = groupMeta.participants.find(x => x.id === jid);
    if (p?.phoneNumber) candidates.push(p.phoneNumber);
    if (p?.lid && p.lid !== jid) candidates.push(p.lid);
  }

  for (const c of candidates) {
    const num = String(c).replace(/@[^@]+$/, '').replace(/\D/g, '');
    if (!num) continue;
    if (owners.some(o => num === o || num.endsWith(o) || o.endsWith(num))) return true;
  }
  return false;
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
