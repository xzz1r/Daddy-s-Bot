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
  video:   { limit: 3, windowMs: 60 * 1000 }, // 3 vídeos en 1 minuto
  image:   { limit: 5, windowMs: 30 * 1000 }, // 5 fotos en 30 segundos
  sticker: { limit: 5, windowMs: 5 * 1000 },  // 5 stickers en 5 segundos
};

// Los stickers NO se castigan igual que las fotos y los vídeos.
//
// Una foto o un vídeo sin "ver una vez" es una infracción por sí sola, así que
// la ráfaga va directa al ban. Un sticker no infringe nada: spamearlos es
// molesto, no grave. Por eso van a dos tiempos — la primera ráfaga se borra y
// se avisa, y solo si el aviso no sirve se banea.
//
// El aviso caduca: si alguien spameó una vez y se portó bien durante una hora,
// vuelve a empezar con aviso en lugar de comerse un ban por algo de hace días.
const AVISO_VALIDO_MS = 60 * 60 * 1000;
const avisados = new Map(); // `${grupo}|${canonical}` -> ts del aviso

// ¿Ya se le avisó por spam de stickers y sigue dentro de la ventana?
function yaAvisado(groupJid, sender) {
  const k = `${groupJid}|${canonicalJid(sender)}`;
  const ts = avisados.get(k);
  if (!ts) return false;
  if (Date.now() - ts > AVISO_VALIDO_MS) { avisados.delete(k); return false; }
  return true;
}

function marcarAvisado(groupJid, sender) {
  if (avisados.size >= MAX_KEYS) avisados.delete(avisados.keys().next().value);
  avisados.set(`${groupJid}|${canonicalJid(sender)}`, Date.now());
}

// Tras el ban se limpia: si vuelve al grupo, empieza de cero con su aviso y no
// con un ban inmediato del que nadie le habría advertido.
function olvidarAviso(groupJid, sender) {
  avisados.delete(`${groupJid}|${canonicalJid(sender)}`);
}

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

function _reset() { hits.clear(); avisados.clear(); }

module.exports = { noteOffence, forget, RULES, yaAvisado, marcarAvisado, olvidarAviso, _reset };
