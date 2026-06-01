// Shared WhatsApp/Baileys helpers. Centralizing these kills the 4x duplicates
// of isAdmin and 2x of getTarget that were drifting across command files.

const config = require('../config');

// Strip device suffix (xxx:1@lid → xxx@lid). Baileys' msg.key.participant
// can carry a device tag that groupMeta.participants[].id does not, which
// breaks exact-equality lookups by JID.
function bareJid(j) {
  if (!j) return j;
  const at = String(j).indexOf('@');
  if (at < 0) return String(j);
  return String(j).slice(0, at).split(':')[0] + '@' + String(j).slice(at + 1);
}

// Global LID → phone-JID cache. Populated whenever isOwner sees a groupMeta,
// so a co-owner whose LID we've seen in any group will resolve correctly
// even in DMs where we have no metadata to look up.
const lidToPhone = new Map();
const MAX_LID_CACHE = 2000;

function rememberMapping(lid, phone) {
  if (!lid || !phone) return;
  const k = bareJid(lid);
  if (lidToPhone.size >= MAX_LID_CACHE && !lidToPhone.has(k)) {
    lidToPhone.delete(lidToPhone.keys().next().value);
  }
  lidToPhone.set(k, bareJid(phone));
}

function indexGroupMeta(groupMeta) {
  if (!groupMeta?.participants) return;
  for (const p of groupMeta.participants) {
    if (!p) continue;
    if (p.lid && p.phoneNumber) rememberMapping(p.lid, p.phoneNumber);
    if (p.id?.endsWith?.('@lid') && p.phoneNumber) rememberMapping(p.id, p.phoneNumber);
  }
}

function isOwner(jid, fromMe, groupMeta) {
  if (fromMe) return true;
  if (!jid) return false;

  // Side effect: every owner check that has groupMeta refreshes the global
  // LID map. Cheap and means future DM owner checks don't need groupMeta.
  if (groupMeta) indexGroupMeta(groupMeta);

  const owners = [
    String(config.ownerNumber).replace(/\D/g, ''),
    ...(config.coOwners || []).map(n => String(n).replace(/\D/g, '')),
  ];

  const bare = bareJid(jid);
  const candidates = new Set([jid, bare]);

  // Match against any participant whose id / lid / phoneNumber form equals
  // the sender's JID. Modern groups inconsistently store the canonical id
  // (sometimes the LID, sometimes the phone JID), so a single-field lookup
  // misses half the cases.
  if (groupMeta?.participants) {
    for (const p of groupMeta.participants) {
      if (!p) continue;
      if (bareJid(p.id) === bare || bareJid(p.lid) === bare || bareJid(p.phoneNumber) === bare) {
        if (p.id) candidates.add(p.id);
        if (p.lid) candidates.add(p.lid);
        if (p.phoneNumber) candidates.add(p.phoneNumber);
        break;
      }
    }
  }

  // Fallback: global cache populated from prior group metas. Works for DMs
  // and for groups where the current meta fetch failed.
  const cachedPhone = lidToPhone.get(bare);
  if (cachedPhone) candidates.add(cachedPhone);

  for (const c of candidates) {
    const num = String(c).replace(/@[^@]+$/, '').replace(/\D/g, '');
    if (!num) continue;
    if (owners.some(o => num === o || num.endsWith(o) || o.endsWith(num))) return true;
  }
  return false;
}

// True if `jid` is the bot's own account, in any JID form. Used to stop the bot
// from kicking or demoting itself (which would remove it from the group or
// strip the admin it needs to moderate).
function isBotJid(sock, jid) {
  if (!jid || !sock?.user) return false;
  const t = bareJid(jid);
  const mine = [sock.user.id, sock.user.lid].filter(Boolean).map(bareJid);
  if (mine.includes(t)) return true;
  // Phone-form comparison only when both sides are phone JIDs — LID and phone
  // live in different namespaces, so cross-comparing their digits would risk a
  // false positive.
  if (t.endsWith('@s.whatsapp.net')) {
    const tnum = t.replace(/@.*/, '').replace(/\D/g, '');
    return mine.some(m => m.endsWith('@s.whatsapp.net') && m.replace(/@.*/, '').replace(/\D/g, '') === tnum);
  }
  return false;
}

// True if the bot itself holds admin in this group. Lets moderation features
// tell the difference between "nobody broke a rule" and "I can't act because
// I'm not admin".
function isBotAdmin(sock, groupMeta) {
  if (!groupMeta?.participants || !sock?.user) return false;
  return groupMeta.participants.some(p =>
    p && (p.admin === 'admin' || p.admin === 'superadmin') &&
    [p.id, p.lid, p.phoneNumber].some(f => f && isBotJid(sock, f))
  );
}

function isAdmin(participants, jid) {
  if (!participants || !jid) return false;
  const bare = bareJid(jid);
  const p = participants.find(x =>
    bareJid(x?.id) === bare || bareJid(x?.lid) === bare || bareJid(x?.phoneNumber) === bare
  );
  return p?.admin === 'admin' || p?.admin === 'superadmin';
}

// Canonical sender. In groups msg.key.remoteJid is the GROUP JID;
// the actual sender lives in msg.key.participant. Falls back to remoteJid for DMs.
function getSender(msg) {
  return msg.key.participant || msg.key.remoteJid;
}

// Combined owner-or-admin gate. Owner is checked first because it's the cheap
// path and short-circuits the participants scan.
function isGroupAdmin(sender, fromMe, groupMeta) {
  return isOwner(sender, fromMe, groupMeta) || isAdmin(groupMeta?.participants, sender);
}

// Mention/reply target. Returns null when neither is present.
function getTarget(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  return ctx?.mentionedJid?.[0] || ctx?.participant || null;
}

// Same as getTarget but defaults to the sender — used by !sexy/!gay/etc.
function getTargetOrSelf(msg) {
  return getTarget(msg) || getSender(msg);
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
  isBotJid,
  isBotAdmin,
  isGroupAdmin,
  getSender,
  getTarget,
  getTargetOrSelf,
  extractText,
  extractQuotedText,
  rememberMapping,
  bareJid,
};
