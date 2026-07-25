// Shared WhatsApp/Baileys helpers. Centralizing these kills the 4x duplicates
// of isAdmin and 2x of getTarget that were drifting across command files.

const fs = require('fs');
const path = require('path');
const config = require('../config');

// ── Learned owner-JID set ────────────────────────────────────────────────────
// The message counter runs in the hot path, BEFORE any group metadata fetch, so
// resolving an incoming LID → phone there is unreliable (in LID-only groups the
// mapping simply isn't available yet). But whenever a command runs we DO have
// metadata and can positively confirm the sender is the main owner. The moment
// we confirm it, we record that exact LID here and persist it — so from then on
// every message from that LID is recognized instantly, with zero resolution.
// LIDs are stable per account, so a learned entry never goes stale.
const OWNER_JIDS_FILE = path.join(__dirname, '../../data/ownerJids.json');
const knownOwnerJids = new Set();

// Synchronous load at startup: the file is tiny (a handful of JIDs) and having
// it ready before the first message avoids counting the owner right after a
// restart.
try {
  const raw = fs.readFileSync(OWNER_JIDS_FILE, 'utf8');
  const arr = JSON.parse(raw);
  if (Array.isArray(arr)) for (const j of arr) if (j) knownOwnerJids.add(j);
} catch { /* ENOENT o JSON inválido: se empieza vacío, se re-aprende solo */ }

let ownerSaveTimer = null;
function scheduleOwnerSave() {
  if (ownerSaveTimer) return;
  ownerSaveTimer = setTimeout(() => {
    ownerSaveTimer = null;
    const tmp = OWNER_JIDS_FILE + '.tmp';
    try {
      fs.mkdirSync(path.dirname(OWNER_JIDS_FILE), { recursive: true });
      fs.writeFileSync(tmp, JSON.stringify([...knownOwnerJids]));
      fs.renameSync(tmp, OWNER_JIDS_FILE);
    } catch { /* si falla el guardado, el set en memoria sigue válido */ }
  }, 5000);
}

function noteOwnerJid(jid) {
  if (!jid) return;
  const b = bareJid(jid);
  if (knownOwnerJids.has(b)) return;
  knownOwnerJids.add(b);
  scheduleOwnerSave();
}

function isKnownOwnerJid(jid) {
  return !!jid && knownOwnerJids.has(bareJid(jid));
}

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

// Resolve any JID to a stable canonical key. A LID we've already mapped to a
// phone (via the lidToPhone cache populated from groupMeta / participantPn)
// collapses to its bare phone JID; everything else returns its bareJid unchanged.
// This lets stores and lookups compare consistently whether a JID arrived as a
// LID (incoming group messages) or as a phone JID (taps/mentions). When the
// mapping is unknown it falls back to bareJid — i.e. never worse than before.
function canonicalJid(jid) {
  if (!jid) return jid;
  const bare = bareJid(jid);
  if (bare.endsWith('@lid')) {
    const phone = lidToPhone.get(bare);
    if (phone) return phone;
  }
  return bare;
}

// True when two JIDs refer to the same person, bridging LID↔phone through the
// cache. Use this instead of `bareJid(a) === bareJid(b)` whenever one side may
// be a mention (phone form) and the other an incoming message (LID form).
function sameUser(a, b) {
  if (!a || !b) return false;
  if (bareJid(a) === bareJid(b)) return true;
  return canonicalJid(a) === canonicalJid(b);
}

// Core matcher: true when `jid` (in any of its forms) resolves to one of the
// numbers in `owners`. Shared by isOwner (main + co-owners) and isMainOwner
// (only the primary owner number).
function matchesOwners(jid, groupMeta, owners) {
  if (!jid) return false;

  // Side effect: every owner check that has groupMeta refreshes the global
  // LID map. Cheap and means future DM owner checks don't need groupMeta.
  if (groupMeta) indexGroupMeta(groupMeta);

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
    if (owners.some(o => phoneMatch(num, o))) return true;
  }
  return false;
}

// Argentina inserts a mobile "9" right after the country code 54 (549 11...)
// that is present in some JID forms and absent in others. A plain suffix match
// misses that because the difference is in the MIDDLE, not a prefix. Normalize
// by dropping that "9" so both forms collapse to the same canonical string.
function stripArNine(d) {
  return d.startsWith('549') ? '54' + d.slice(3) : d;
}

// True when two phone-digit strings refer to the same number. Handles:
//  - exact equality,
//  - optional country-code prefix (suffix match, only for full-length numbers),
//  - the Argentina mobile "9" (via canonicalization).
// Kept strict (shorter operand must be >= 10 digits) so a short/misconfigured
// owner value can never suffix-match an arbitrary member.
function phoneMatch(a, b) {
  if (!a || !b) return false;
  const variants = [[a, b], [stripArNine(a), stripArNine(b)]];
  for (const [x, y] of variants) {
    if (x === y) return true;
    const shorter = x.length <= y.length ? x : y;
    const longer  = x.length <= y.length ? y : x;
    if (shorter.length >= 10 && longer.endsWith(shorter)) return true;
  }
  return false;
}

function isOwner(jid, fromMe, groupMeta) {
  if (fromMe) return true;
  // Mismo atajo que isMainOwner: un JID ya confirmado como owner en una
  // comprobación anterior (con metadata) vale igual aquí. Sin esto, para el
  // MISMO jid isMainOwner devolvía true e isOwner false en cuanto faltaba la
  // metadata, y toda la maquinaria de exención (que se apoya en isOwner)
  // dejaba de proteger al dueño. El set solo contiene el owner principal ya
  // verificado, así que no relaja nada.
  if (isKnownOwnerJid(jid)) return true;
  const owners = [
    String(config.ownerNumber).replace(/\D/g, ''),
    ...(config.coOwners || []).map(n => String(n).replace(/\D/g, '')),
  ];
  const ok = matchesOwners(jid, groupMeta, owners);
  // Aprende también desde aquí cuando el que coincide es el owner principal.
  if (ok && matchesOwners(jid, groupMeta, [String(config.ownerNumber).replace(/\D/g, '')])) {
    noteOwnerJid(jid);
  }
  return ok;
}

// True only for the primary owner (config.ownerNumber), not the co-owners.
// Used to exclude the owner's own messages from the activity ranking (!count)
// without also excluding co-owners.
//
// Fast path: a LID we've already confirmed as the owner (learned from a prior
// check that had metadata) matches instantly, with no resolution — this is what
// makes the exclusion reliable in the counter's hot path. Slow path: resolve
// against config numbers, and if it matches, LEARN the JID so next time is
// instant even without metadata.
function isMainOwner(jid, fromMe, groupMeta) {
  if (fromMe) return true;
  if (isKnownOwnerJid(jid)) return true;
  const ok = matchesOwners(jid, groupMeta, [String(config.ownerNumber).replace(/\D/g, '')]);
  if (ok) noteOwnerJid(jid);
  return ok;
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
  isMainOwner,
  noteOwnerJid,
  isKnownOwnerJid,
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
  canonicalJid,
  sameUser,
};
