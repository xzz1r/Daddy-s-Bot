'use strict';

// Claves de los últimos mensajes de cada grupo, para !limpiar.
//
// NO ES EL TEXTO. Solo id, participante y marca de tiempo: lo que WhatsApp
// pide para un borrado de admin (`edit=8`). Sin esas claves el bot no puede
// revocar un mensaje que ya pasó.
//
// El dueño hizo !limpiar para borrar el historial de ANTES, no solo lo que
// el bot ha visto desde el último arranque. Por eso:
//
//   · se guardan también los mensajes viejos (no hay recorte de 24 h)
//   · se persisten en disco, o un reinicio deja el comando ciego otra vez
//   · si al pedir N no hay N, se le piden al teléfono (fetchMessageHistory,
//     de 50 en 50, que es el tope de WhatsApp) y llegan por
//     `messaging-history.set`

const fs = require('fs');
const path = require('path');
const { bareJid } = require('./wa');
const { atomicWriteJson, withTimeout } = require('./helpers');
const logger = require('./logger');

const TOPE_POR_GRUPO = 1000;
const MAX_GRUPOS = 40;
const PAGINA = 50;
const PAGINAS_MAX = 20;
const HIST_FILE = path.join(__dirname, '../../data/historialGrupo.json');

const SKIP = new Set([
  'reactionMessage', 'encReactionMessage',
  'senderKeyDistributionMessage', 'pollUpdateMessage',
  'messageContextInfo',
]);

const grupos = new Map(); // groupJid -> [{ id, participant, remoteJid, addressingMode, ts, fromMe }]
let persistir = true;
let timer = null;

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

function tsSeg(msg) {
  const bruto = msg?.messageTimestamp;
  const seg = Number(typeof bruto?.toNumber === 'function' ? bruto.toNumber() : bruto || 0);
  return seg > 0 ? seg : 0;
}

function recortar(cola) {
  if (cola.length <= TOPE_POR_GRUPO) return;
  cola.sort((a, b) => a.ts - b.ts);
  cola.splice(0, cola.length - TOPE_POR_GRUPO);
}

function programarGuardado() {
  if (!persistir || timer) return;
  timer = setTimeout(() => {
    timer = null;
    flush().catch((e) => logger.warn(`historial: no pude guardar (${e.message})`));
  }, 2000);
  timer.unref?.();
}

function colaDe(jid) {
  let cola = grupos.get(jid);
  if (!cola) {
    if (grupos.size >= MAX_GRUPOS) {
      const viejo = grupos.keys().next().value;
      grupos.delete(viejo);
    }
    cola = [];
    grupos.set(jid, cola);
  } else {
    grupos.delete(jid);
    grupos.set(jid, cola);
  }
  return cola;
}

function recordar(msg, jidForzado) {
  let jid = jidForzado || msg?.key?.remoteJid;
  if (jid && !String(jid).endsWith('@g.us') && jidForzado) jid = jidForzado;
  if (!jid || !String(jid).endsWith('@g.us')) return false;
  const id = msg.key?.id;
  if (!id) return false;
  if (msg.messageStubType && !msg.message) return false;
  if (msg.message && !tieneContenido(msg.message)) return false;

  const cola = colaDe(jid);
  if (cola.some((x) => x.id === id)) return false;
  cola.push({
    id,
    participant: msg.key.participant ? bareJid(msg.key.participant) : '',
    remoteJid: jid,
    addressingMode: msg.key.addressingMode || '',
    ts: tsSeg(msg) || Math.floor(Date.now() / 1000),
    fromMe: Boolean(msg.key.fromMe),
    key: {
      remoteJid: jid,
      id,
      fromMe: Boolean(msg.key.fromMe),
      ...(msg.key.participant ? { participant: msg.key.participant } : {}),
      ...(msg.key.addressingMode ? { addressingMode: msg.key.addressingMode } : {}),
      ...(msg.key.participantAlt ? { participantAlt: msg.key.participantAlt } : {}),
      ...(msg.key.remoteJidAlt ? { remoteJidAlt: msg.key.remoteJidAlt } : {}),
    },
  });
  recortar(cola);
  programarGuardado();
  return true;
}

function ingestarLote(messages, jidGrupo) {
  if (!Array.isArray(messages)) return 0;
  let n = 0;
  for (const m of messages) if (recordar(m, jidGrupo)) n++;
  return n;
}

function ingestarEvento(data, jidGrupo) {
  if (!data) return 0;
  let n = ingestarLote(data.messages, jidGrupo);
  for (const chat of data.chats || []) {
    const cid = chat.id;
    if (jidGrupo && cid && cid !== jidGrupo && bareJid(cid) !== bareJid(jidGrupo)) continue;
    for (const wrap of chat.messages || []) {
      const m = wrap.message || wrap;
      if (recordar(m, jidGrupo || cid)) n++;
    }
  }
  return n;
}

function tsMsDe(ts) {
  const n = Number(typeof ts?.toNumber === 'function' ? ts.toNumber() : ts || 0);
  if (!n) return Date.now();
  return n < 1e12 ? n * 1000 : n;
}

function claveDeAncla(jid, ancla) {
  const k = ancla.key || {};
  const id = k.id || ancla.id;
  return {
    remoteJid: k.remoteJid || jid,
    id,
    fromMe: Boolean(k.fromMe || ancla.fromMe),
    ...(k.participant || ancla.participant
      ? { participant: k.participant || ancla.participant }
      : {}),
    ...(k.addressingMode || ancla.addressingMode
      ? { addressingMode: k.addressingMode || ancla.addressingMode }
      : {}),
    ...(k.participantAlt ? { participantAlt: k.participantAlt } : {}),
    ...(k.remoteJidAlt ? { remoteJidAlt: k.remoteJidAlt } : {}),
  };
}

function tomar(jid, n, exceptoIds) {
  const cola = grupos.get(jid);
  if (!cola || !cola.length || n <= 0) return [];
  const skip = exceptoIds instanceof Set ? exceptoIds : new Set(exceptoIds || []);
  const candidatos = skip.size ? cola.filter((x) => !skip.has(x.id)) : cola;
  if (n >= candidatos.length) return candidatos.slice();
  return candidatos.slice(-n);
}

function masAntiguo(jid) {
  const cola = grupos.get(jid);
  if (!cola || !cola.length) return null;
  let best = cola[0];
  for (const x of cola) if (x.ts < best.ts) best = x;
  return best;
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

async function pedirPagina(sock, jid, ancla) {
  if (typeof sock.fetchMessageHistory !== 'function' || !(ancla?.id || ancla?.key?.id)) return 0;
  const antes = cuantos(jid);
  const key = claveDeAncla(jid, ancla);
  const tsMs = tsMsDe(ancla.ts);
  let off = () => {};
  const llegada = new Promise((resolve) => {
    if (!sock.ev?.on) return resolve();
    const onHist = (data = {}) => {
      if (ingestarEvento(data, jid) > 0) { off(); resolve(); }
    };
    const onUpsert = ({ messages } = {}) => {
      let added = 0;
      for (const m of messages || []) {
        if (m?.key?.remoteJid === jid && recordar(m)) added++;
      }
      if (added > 0) { off(); resolve(); }
    };
    off = () => {
      try { sock.ev.off('messaging-history.set', onHist); } catch { /* ya no está */ }
      try { sock.ev.off('messages.upsert', onUpsert); } catch { /* ya no está */ }
    };
    sock.ev.on('messaging-history.set', onHist);
    sock.ev.on('messages.upsert', onUpsert);
  });
  let sesion = '';
  try {
    sesion = await sock.fetchMessageHistory(PAGINA, key, tsMs) || '';
  } catch (e) {
    logger.warn(`historial: fetch falló en ${jid}: ${e.message}`);
    off();
    return 0;
  }
  await withTimeout(llegada, 20000, null);
  off();
  const añadidos = Math.max(0, cuantos(jid) - antes);
  if (!añadidos) {
    logger.warn(`historial: WhatsApp no mandó nada de ${jid} (sesión=${sesion || '?'}, ancla=${key.id}, ts=${tsMs})`);
  }
  return añadidos;
}

async function reunir(sock, jid, n, exceptoIds, ancla) {
  const hay = () => tomar(jid, n, exceptoIds);
  if (hay().length >= n) return hay();
  if (typeof sock.fetchMessageHistory !== 'function') return hay();

  let cursor = masAntiguo(jid) || ancla;
  for (let i = 0; i < PAGINAS_MAX && hay().length < n && cursor?.id; i++) {
    const idAntes = cursor.id;
    const añadidos = await pedirPagina(sock, jid, cursor);
    const siguiente = masAntiguo(jid);
    if (!añadidos || !siguiente || siguiente.id === idAntes) break;
    cursor = siguiente;
  }
  return hay();
}

async function flush() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!persistir) return;
  const o = {};
  for (const [k, v] of grupos) o[k] = v;
  await atomicWriteJson(HIST_FILE, o);
}

function cargar() {
  try {
    const d = JSON.parse(fs.readFileSync(HIST_FILE, 'utf8'));
    if (!d || typeof d !== 'object') return;
    for (const [jid, arr] of Object.entries(d)) {
      if (!jid.endsWith('@g.us') || !Array.isArray(arr)) continue;
      const cola = [];
      for (const x of arr) {
        if (!x || !x.id) continue;
        cola.push({
          id: String(x.id),
          participant: x.participant ? bareJid(x.participant) : '',
          remoteJid: jid,
          addressingMode: x.addressingMode || '',
          ts: Number(x.ts) || 0,
          fromMe: Boolean(x.fromMe),
          key: x.key && x.key.id ? x.key : undefined,
        });
      }
      recortar(cola);
      if (cola.length) grupos.set(jid, cola);
    }
  } catch { /* ENOENT o JSON inválido: se empieza vacío y se rellena solo */ }
}

function reset() {
  grupos.clear();
  persistir = false;
  if (timer) { clearTimeout(timer); timer = null; }
}

cargar();

module.exports = {
  recordar, ingestarLote, ingestarEvento, tomar, quitar, cuantos, reunir, masAntiguo, flush,
  TOPE_POR_GRUPO, MAX_GRUPOS, PAGINA,
  _reset: reset, _tieneContenido: tieneContenido, _pedirPagina: pedirPagina,
};
