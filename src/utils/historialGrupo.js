'use strict';

// Claves de los últimos mensajes de cada grupo, para poder borrarlos después.
//
// NO ES UN HISTORIAL. No se guarda el texto, ni el medio, ni quién dijo qué:
// solo el id y el participante, que es lo que WhatsApp pide para un borrado de
// admin (`edit=8`). Sin esas claves el bot no puede revocar un mensaje que ya
// pasó, y WhatsApp no ofrece "vaciar el chat para todos".
//
// Vive en RAM y se pierde al reiniciar. Un lote de sincronización viejo no
// entra: solo lo visto en las últimas 24 h, y con tope por grupo. Guardar más
// sería copiar la conversación, que este bot no hace.

const { bareJid } = require('./wa');

const TOPE_POR_GRUPO = 1000;
const MAX_GRUPOS = 40;
const VENTANA_MS = 24 * 60 * 60 * 1000;

const SKIP = new Set([
  'reactionMessage', 'encReactionMessage',
  'senderKeyDistributionMessage', 'pollUpdateMessage',
  'messageContextInfo',
]);

const grupos = new Map(); // groupJid -> [{ id, participant, remoteJid, addressingMode }]

function tieneContenido(message) {
  if (!message) return false;
  let m = message;
  for (let i = 0; i < 4 && m; i++) {
    const inner = m.ephemeralMessage?.message
      || m.viewOnceMessage?.message
      || m.viewOnceMessageV2?.message
      || m.viewOnceMessageV2Extension?.message
      || m.documentWithCaptionMessage?.message;
    if (!inner) break;
    m = inner;
  }
  const keys = Object.keys(m).filter((k) => k !== 'messageContextInfo');
  if (!keys.length) return false;
  if (keys.every((k) => SKIP.has(k))) return false;
  if (keys.length === 1 && keys[0] === 'protocolMessage') return false;
  return true;
}

function tsMs(msg) {
  const bruto = msg?.messageTimestamp;
  const seg = Number(typeof bruto?.toNumber === 'function' ? bruto.toNumber() : bruto || 0);
  return seg > 0 ? seg * 1000 : 0;
}

function recordar(msg) {
  const jid = msg?.key?.remoteJid;
  if (!jid || !jid.endsWith('@g.us')) return;
  const id = msg.key?.id;
  if (!id) return;
  if (!tieneContenido(msg.message)) return;
  const cuando = tsMs(msg);
  if (cuando && Date.now() - cuando > VENTANA_MS) return;

  let cola = grupos.get(jid);
  if (!cola) {
    if (grupos.size >= MAX_GRUPOS) grupos.delete(grupos.keys().next().value);
    cola = [];
    grupos.set(jid, cola);
  } else {
    // LRU: reinsertar no reordena en un Map.
    grupos.delete(jid);
    grupos.set(jid, cola);
  }

  if (cola.some((x) => x.id === id)) return;
  cola.push({
    id,
    participant: msg.key.participant ? bareJid(msg.key.participant) : '',
    remoteJid: jid,
    addressingMode: msg.key.addressingMode || '',
  });
  if (cola.length > TOPE_POR_GRUPO) cola.shift();
}

function tomar(jid, n, exceptoIds) {
  const cola = grupos.get(jid);
  if (!cola || !cola.length || n <= 0) return [];
  const skip = exceptoIds instanceof Set ? exceptoIds : new Set(exceptoIds || []);
  const candidatos = skip.size ? cola.filter((x) => !skip.has(x.id)) : cola;
  if (n >= candidatos.length) return candidatos.slice();
  return candidatos.slice(-n);
}

function quitar(jid, id) {
  const cola = grupos.get(jid);
  if (!cola || !id) return;
  const i = cola.findIndex((x) => x.id === id);
  if (i >= 0) cola.splice(i, 1);
  if (!cola.length) grupos.delete(jid);
}

function cuantos(jid) {
  return grupos.get(jid)?.length || 0;
}

function reset() {
  grupos.clear();
}

module.exports = {
  recordar, tomar, quitar, cuantos,
  TOPE_POR_GRUPO, MAX_GRUPOS, VENTANA_MS,
  _reset: reset, _tieneContenido: tieneContenido,
};
