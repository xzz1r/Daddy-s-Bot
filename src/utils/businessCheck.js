// Detección de cuentas Business.
//
// Usa sock.getBusinessProfile(jid). OJO: WhatsApp devuelve un nodo <profile>
// incluso para cuentas NORMALES, y Baileys lo convierte en un objeto "verdadero"
// cuyo único campo real es `wid` (el propio jid); description='' y website=[].
// Por eso NO basta con `!!profile`: una cuenta Business de verdad expone al menos
// UN dato real (categoría, horario, email, web, dirección o descripción no vacía).
// Ante la duda NO es Business (expulsar es destructivo: mejor un falso negativo).
//
// Caché en memoria (1h TTL, acotada) porque el estado Business casi nunca cambia,
// y así scan/purge/anti-fake/on-join comparten una sola fuente y no se re-consulta
// a cada rato (menos IQs = menos riesgo de rate-limit de WhatsApp).

const TTL_MS = 60 * 60 * 1000;
const MAX_CACHE = 5000;
const cache = new Map(); // jid -> { value: { isBiz, fields }, ts }

function cacheSet(jid, value) {
  if (cache.size >= MAX_CACHE) {
    cache.delete(cache.keys().next().value); // evict oldest
  }
  cache.set(jid, { value, ts: Date.now() });
}

// Núcleo: devuelve { isBiz, fields } — el booleano Y los campos reales que lo
// delatan (para mostrar la evidencia en el dry-run del scan). Cacheado. En error
// de red NO cachea y devuelve no-business (más seguro).
async function businessEvidence(sock, jid) {
  if (!jid || typeof jid !== 'string' || !jid.endsWith('@s.whatsapp.net')) {
    // Los LIDs no soportan la consulta de perfil Business.
    return { isBiz: false, fields: [] };
  }
  const cached = cache.get(jid);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.value;

  let profile;
  try {
    profile = await sock.getBusinessProfile(jid);
  } catch {
    return { isBiz: false, fields: [] }; // error explícito: no cachear
  }

  // Baileys resuelve `undefined` TANTO cuando no hay nodo <profile> como cuando
  // la IQ vence: su waitForMessage se traga el timeout y devuelve undefined en
  // lugar de lanzar (Socket/socket.js), así que el catch de arriba nunca salta.
  // Sin objeto no hay dato fiable, y cachear eso durante una hora dejaba ciego
  // al scan, al purge y al anti-empresa de entrada. No se cachea: como mucho se
  // reconsulta en la siguiente pasada.
  if (!profile || typeof profile !== 'object') {
    return { isBiz: false, fields: [] };
  }

  const filled = v => typeof v === 'string' && v.trim().length > 0;
  const fields = [];
  if (filled(profile?.category)) fields.push('categoría');
  if (filled(profile?.email)) fields.push('email');
  if (filled(profile?.address)) fields.push('dirección');
  if (filled(profile?.description)) fields.push('descripción');
  if (Array.isArray(profile?.website) && profile.website.some(w => filled(String(w)))) fields.push('web');
  const cfg = profile?.business_hours?.business_config;
  if (Array.isArray(cfg) && cfg.length > 0) fields.push('horario');

  const value = { isBiz: fields.length > 0, fields };
  cacheSet(jid, value);
  return value;
}

async function isBusiness(sock, jid) {
  return (await businessEvidence(sock, jid)).isBiz;
}

// Chequea muchos JIDs con concurrencia acotada. ~8 en paralelo es el punto justo.
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

module.exports = { isBusiness, isBusinessBatch, businessEvidence, clearBusinessCache };
