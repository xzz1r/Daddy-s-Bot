'use strict';

// Rastreo de medios enviados sin "ver una vez", para detectar spam.
//
// Reglas:
//   - 3 vídeos normales del mismo número dentro de la ventana → ban.
//   - 5 fotos normales del mismo número dentro de una ventana corta → ban,
//     y además se borran esas fotos (los vídeos ya se borran de uno en uno).
//
// Se guardan los ids de los mensajes ofensores para poder borrarlos cuando
// salta el umbral. Todo vive en memoria: si el bot se reinicia el contador
// empieza de cero, que es lo correcto — un ban se decide por una ráfaga
// reciente, no por un historial de hace días.

const RULES = {
  video: { limit: 3, windowMs: 10 * 60 * 1000 }, // 3 vídeos en 10 min
  image: { limit: 5, windowMs: 2 * 60 * 1000 },  // 5 fotos en 2 min (ráfaga)
};

// `${groupJid}|${bareSender}|${kind}` -> [{ id, ts }]
const hits = new Map();
const MAX_KEYS = 5000;

// Registra un envío ofensor y dice si con este se alcanza el umbral.
// Devuelve { spam, ids, limit }: `ids` son los mensajes a borrar cuando spam.
function noteOffence(groupJid, sender, kind, msgId) {
  const rule = RULES[kind];
  if (!rule) return { spam: false, ids: [], limit: 0 };

  const key = `${groupJid}|${String(sender).split('@')[0].split(':')[0]}|${kind}`;
  const now = Date.now();

  if (!hits.has(key) && hits.size >= MAX_KEYS) {
    hits.delete(hits.keys().next().value); // acotado: no crece sin fin
  }

  const list = (hits.get(key) || []).filter(h => now - h.ts < rule.windowMs);
  if (msgId) list.push({ id: msgId, ts: now });
  hits.set(key, list);

  if (list.length < rule.limit) return { spam: false, ids: [], limit: rule.limit };

  hits.delete(key); // consumido: tras el ban el contador se reinicia
  return { spam: true, ids: list.map(h => h.id).filter(Boolean), limit: rule.limit };
}

// Al salir del grupo (o ser expulsado) se olvida su historial.
function forget(groupJid, sender) {
  const p = `${groupJid}|${String(sender).split('@')[0].split(':')[0]}|`;
  for (const k of hits.keys()) if (k.startsWith(p)) hits.delete(k);
}

function _reset() { hits.clear(); }

module.exports = { noteOffence, forget, RULES, _reset };
