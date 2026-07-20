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
    const value = hasBusinessData(profile);
    cacheSet(jid, value);
    return value;
  } catch {
    // Network/protocol errors → don't cache, return false (safer default).
    return false;
  }
}

// CRÍTICO: NO basta con `!!profile`. WhatsApp devuelve un nodo <profile> incluso
// para cuentas NORMALES, y Baileys lo convierte en un objeto "verdadero" cuyo
// único campo real es `wid` (el propio jid consultado); description queda en ''
// y website en []. Tratar eso como Business expulsaba a usuarios normales.
// Una cuenta Business de verdad expone al menos UNO de estos datos reales:
// categoría, horario comercial, email, web, dirección o una descripción no vacía.
// El `wid` por sí solo no significa nada. Ante la duda, NO es business (expulsar
// es destructivo: es preferible un falso negativo a echar a alguien legítimo).
function hasBusinessData(p) {
  if (!p || typeof p !== 'object') return false;
  const filled = v => typeof v === 'string' && v.trim().length > 0;
  if (filled(p.category)) return true;
  if (filled(p.email)) return true;
  if (filled(p.address)) return true;
  if (filled(p.description)) return true;
  if (Array.isArray(p.website) && p.website.some(w => filled(String(w)))) return true;
  const cfg = p.business_hours?.business_config;
  if (Array.isArray(cfg) && cfg.length > 0) return true;
  return false;
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
