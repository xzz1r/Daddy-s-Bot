// Business account detection.
//
// Uses sock.getBusinessProfile(jid) — the only reliable Baileys API that
// returns a profile object for WhatsApp Business accounts and undefined for
// regular ones. `onWhatsApp()` does NOT expose isBusiness in current Baileys.
//
// In-memory cache: business status almost never changes, so 1h TTL is safe.
// Cache is bounded (FIFO eviction) to avoid unbounded growth in long sessions.

const TTL_MS = 60 * 60 * 1000;
const MAX_CACHE = 5000;
const cache = new Map(); // jid -> { value: boolean, ts: number }

function cacheSet(jid, value) {
  if (cache.size >= MAX_CACHE) {
    cache.delete(cache.keys().next().value); // evict oldest
  }
  cache.set(jid, { value, ts: Date.now() });
}

async function isBusiness(sock, jid) {
  if (!jid || typeof jid !== 'string') return false;
  // LIDs (linked identity, privacy-anonymized JIDs) aren't supported by the
  // business profile lookup. Treat them as non-business — false negatives are
  // safer than misidentifying real users.
  if (!jid.endsWith('@s.whatsapp.net')) return false;

  const cached = cache.get(jid);
  if (cached && Date.now() - cached.ts < TTL_MS) {
    return cached.value;
  }

  try {
    const profile = await sock.getBusinessProfile(jid);
    const value = !!profile; // any non-empty profile means it's a Business account
    cacheSet(jid, value);
    return value;
  } catch {
    // Network/protocol errors → don't cache, return false (safer default).
    return false;
  }
}

// Check many JIDs with bounded concurrency. ~8 in parallel is the sweet spot —
// fast enough for 200-member groups (~2-4s) without hammering WhatsApp.
async function isBusinessBatch(sock, jids, concurrency = 8) {
  const out = new Map();
  for (let i = 0; i < jids.length; i += concurrency) {
    const chunk = jids.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(jid => isBusiness(sock, jid).then(v => [jid, v]))
    );
    for (const [jid, v] of results) out.set(jid, v);
  }
  return out;
}

function clearBusinessCache() {
  cache.clear();
}

module.exports = { isBusiness, isBusinessBatch, clearBusinessCache };
