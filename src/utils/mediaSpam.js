'use strict';

const { canonicalJid } = require('./wa');

// Rastreo de medios enviados sin "ver una vez", para detectar spam.
//
// Reglas:
//   - 3 vídeos normales del mismo número en 1 minuto → ban.
//   - 5 fotos normales del mismo número en 30 segundos → ban, y además se
//     borran esas fotos (los vídeos ya se borran de uno en uno).
//
// Se guardan los ids de los mensajes ofensores para poder borrarlos cuando
// salta el umbral. Todo vive en memoria: si el bot se reinicia el contador
// empieza de cero, que es lo correcto — un ban se decide por una ráfaga
// reciente, no por un historial de hace días.

// Ventanas cortas a propósito: lo que se persigue es la RÁFAGA, tres vídeos o
// cinco fotos prácticamente seguidos. Alguien que manda un vídeo suelto de vez
// en cuando no es spam y no debe acumular nada.
const RULES = {
  video: { limit: 3, windowMs: 60 * 1000 }, // 3 vídeos en 1 minuto
  image: { limit: 5, windowMs: 30 * 1000 }, // 5 fotos en 30 segundos
};

// `${groupJid}|${canonicalJid}|${kind}` -> [{ id, ts }]
const hits = new Map();
const MAX_KEYS = 5000;

// Registra un envío ofensor y dice si con este se alcanza el umbral.
// Devuelve { spam, ids, limit }: `ids` son los mensajes a borrar cuando spam.
function noteOffence(groupJid, sender, kind, msgId) {
  const rule = RULES[kind];
  if (!rule) return { spam: false, ids: [], limit: 0 };

  // La clave es canonicalJid, no el numero pelado: la misma persona puede
  // llegar por @lid y por telefono, y con dos claves distintas una rafaga se
  // partia en dos montones y no alcanzaba el umbral nunca.
  const key = `${groupJid}|${canonicalJid(sender)}|${kind}`;
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
  const p = `${groupJid}|${canonicalJid(sender)}|`;
  for (const k of hits.keys()) if (k.startsWith(p)) hits.delete(k);
}

function _reset() { hits.clear(); }

module.exports = { noteOffence, forget, RULES, _reset };
