// Business account detection with in-memory cache.
//
// Uses sock.onWhatsApp() which returns { jid, exists, isBusiness, ... }.
// Cache prevents repeated network calls for the same JID — business status
// rarely changes, so a 1h TTL is generous.

const TTL_MS = 60 * 60 * 1000;
const cache = new Map(); // jid -> { value: boolean, ts: number }

async function isBusiness(sock, jid) {
  if (!jid || typeof jid !== 'string') return false;
  if (!jid.endsWith('@s.whatsapp.net')) return false; // skip group/broadcast jids

  const cached = cache.get(jid);
  if (cached && Date.now() - cached.ts < TTL_MS) {
    return cached.value;
  }

  try {
    const results = await sock.onWhatsApp(jid);
    const result = Array.isArray(results) ? results[0] : results;
    const value = !!result?.isBusiness;
    cache.set(jid, { value, ts: Date.now() });
    return value;
  } catch {
    // If the lookup fails, fall back to "not business" — false negatives are
    // safer than false positives. Do NOT cache the failure.
    return false;
  }
}

// Check many JIDs with a concurrency cap. For 200 members at ~8 in parallel
// this finishes in 2-4s instead of 20+ sequential.
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
