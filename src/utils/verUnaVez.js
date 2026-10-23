const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { streamToBuffer, MAX_MEDIA_BYTES } = require('./helpers');
const { sameUser } = require('./wa');
const logger = require('./logger');

// ─── FOTO O VIDEO DE VER UNA VEZ ────────────────────────────────────────────
//
// WhatsApp le enseña «Abierto» al que la mandó cuando el bot manda el acuse
// `played`. En ese momento el enlace del CDN deja de valer. Si /s o /toimg
// bajan DESPUÉS, el enlace ya está muerto: a veces la cita aún llega a tiempo
// y sale, y muchas veces no. /toimg ni siquiera pedía que el móvil la volviera
// a subir, así que ahí se quedaba.
//
// Lo que hacen los bots a los que esto no les falla: bajarla en cuanto llega,
// ANTES de ese acuse, y servir /s y /toimg desde ahí. Si no se pudo guardar
// (el bot estaba apagado, o el enlace ya vino vacío), se baja en el momento
// del comando y, si hace falta, se pide la resubida. Nunca se contesta que
// «ver una vez no llega»: el 10 oct el dueño tumbó esa frase.

const ESPERA_RESUBIDA_MS = 20000;
// Tope del acuse. La descarga normal termina mucho antes; esto solo evita que
// un enlace colgado deje la foto sin «Abierto» para siempre.
const ESPERA_ACUSE_MS = 45000;
const TOPE_ENTRADAS = 8;
const TOPE_BYTES = 36 * 1024 * 1024;
const TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CAPAS = 6;

let pedir = (nodo, tipo) => downloadContentFromMessage(nodo, tipo);

const porId = new Map();
const alias = new Map();
const vuelos = new Map();
let bytes = 0;
let cola = Promise.resolve();

function _usarDescarga(fn) {
  pedir = fn || ((nodo, tipo) => downloadContentFromMessage(nodo, tipo));
}

function _vaciar() {
  porId.clear();
  alias.clear();
  vuelos.clear();
  bytes = 0;
  cola = Promise.resolve();
  pedir = (nodo, tipo) => downloadContentFromMessage(nodo, tipo);
}

function clavesDe(remoteJid, id) {
  if (!id) return [];
  return remoteJid ? [id, `${remoteJid}|${id}`] : [id];
}

function soltar(id) {
  const e = porId.get(id);
  if (!e) return;
  porId.delete(id);
  bytes -= e.buf.length;
  for (const [k, dest] of alias) if (dest === id) alias.delete(k);
}

function guardar(remoteJid, id, buf) {
  if (!id || !buf || buf.length < 100 || buf.length > MAX_MEDIA_BYTES) return;
  soltar(id);
  porId.set(id, { buf, ts: Date.now() });
  bytes += buf.length;
  if (remoteJid) alias.set(`${remoteJid}|${id}`, id);
  while (porId.size > 1 && (porId.size > TOPE_ENTRADAS || bytes > TOPE_BYTES)) {
    const vieja = porId.keys().next().value;
    if (vieja === id) break;
    soltar(vieja);
  }
}

function tomar(ids) {
  const ahora = Date.now();
  for (const crudo of ids) {
    if (!crudo) continue;
    const id = porId.has(crudo) ? crudo : alias.get(crudo);
    if (!id) continue;
    const e = porId.get(id);
    if (!e) continue;
    if (ahora - e.ts > TTL_MS) { soltar(id); continue; }
    porId.delete(id);
    porId.set(id, e);
    return e.buf;
  }
  return null;
}

function _guardar(remoteJid, id, buf) { guardar(remoteJid, id, buf); }

// Una sola descarga de ver una vez a la vez. En una máquina de 1 GB, ocho
// videos de 24 MB a la vez tiran el proceso (PM2 lo corta a los 450 MB).
function encolar(fn) {
  const corre = cola.then(fn, fn);
  cola = corre.then(() => {}, () => {});
  return corre;
}

function citaDe(msg) {
  const nodo = msg?.message;
  if (!nodo) return null;
  const directo = nodo.extendedTextMessage?.contextInfo;
  if (directo?.stanzaId && directo.quotedMessage) return directo;
  for (const k of Object.keys(nodo)) {
    const ctx = nodo[k]?.contextInfo;
    if (ctx?.stanzaId && ctx.quotedMessage) return ctx;
  }
  return null;
}

function idsRelacionados(msg, origen) {
  const ids = [];
  const meter = (id) => { if (id && !ids.includes(id)) ids.push(id); };
  const jid = msg?.key?.remoteJid;
  if (origen === 'cita') {
    const ctx = citaDe(msg);
    meter(ctx?.stanzaId);
    if (ctx?.stanzaId && jid) meter(`${jid}|${ctx.stanzaId}`);
  }
  meter(msg?.key?.id);
  if (msg?.key?.id && jid) meter(`${jid}|${msg.key.id}`);
  return ids;
}

function idDelMedio(msg, origen) {
  if (origen === 'cita') {
    const id = citaDe(msg)?.stanzaId;
    if (id) return id;
  }
  return msg?.key?.id || null;
}

// El mismo recorrido que ya hacía /toimg: temporal, ver una vez (las tres
// formas), archivo con pie y editado. /s antes solo abría ver una vez, y en un
// chat que desaparece la foto va dentro de ephemeral: /s no la veía.
function conVista(r) {
  if (r?.msg?.viewOnce === true) r.verUnaVez = true;
  return r;
}

function clasificar(messageObject, depth = 0) {
  if (!messageObject || depth > MAX_CAPAS) return null;
  if (messageObject.stickerMessage) {
    return conVista({ msg: messageObject.stickerMessage, type: 'sticker', dl: 'sticker' });
  }
  if (messageObject.imageMessage) {
    const mime = messageObject.imageMessage.mimetype || '';
    return conVista({
      msg: messageObject.imageMessage,
      type: mime === 'image/webp' ? 'sticker' : 'image',
      dl: 'image',
    });
  }
  if (messageObject.videoMessage) {
    const mime = messageObject.videoMessage.mimetype || '';
    return conVista({
      msg: messageObject.videoMessage,
      type: mime === 'image/webp' ? 'sticker' : 'video',
      dl: 'video',
    });
  }
  if (messageObject.ptvMessage) {
    return conVista({ msg: messageObject.ptvMessage, type: 'video', dl: 'video' });
  }
  if (messageObject.documentMessage) {
    const mime = messageObject.documentMessage.mimetype || '';
    const doc = { msg: messageObject.documentMessage, dl: 'document' };
    if (mime === 'image/webp') return conVista({ ...doc, type: 'sticker' });
    if (mime.startsWith('image/')) return conVista({ ...doc, type: 'image' });
    if (mime.startsWith('video/')) return conVista({ ...doc, type: 'video' });
  }
  const inner =
    messageObject.ephemeralMessage?.message ||
    messageObject.viewOnceMessage?.message ||
    messageObject.viewOnceMessageV2?.message ||
    messageObject.viewOnceMessageV2Extension?.message ||
    messageObject.documentWithCaptionMessage?.message ||
    messageObject.editedMessage?.message;
  if (!inner) return null;
  const r = clasificar(inner, depth + 1);
  if (!r) return null;
  const vo = Boolean(
    messageObject.viewOnceMessage
    || messageObject.viewOnceMessageV2
    || messageObject.viewOnceMessageV2Extension,
  );
  if (vo || r.verUnaVez) r.verUnaVez = true;
  if (r.msg?.viewOnce === true) r.verUnaVez = true;
  return r;
}

function esVista(found) {
  if (!found) return false;
  return Boolean(
    found.verUnaVez
    || found.viewOnce
    || found.msg?.viewOnce === true
    || found.data?.viewOnce === true,
  );
}

function recordar(msg, origen, found, buf) {
  if (!esVista(found)) return;
  guardar(msg?.key?.remoteJid, idDelMedio(msg, origen), buf);
}

function candidatos(nodo) {
  if (!nodo) return [];
  const lista = [nodo];
  // Baileys, si hay directPath, ignora `url` y reconstruye el enlace. A veces
  // el que sigue vivo es justo el de `url` (?oh=&oe=). La segunda pasada lo usa.
  if (nodo.directPath && nodo.url) lista.push({ ...nodo, directPath: undefined });
  return lista;
}

async function bajarNodo(nodo, tipo) {
  let ultimo;
  for (const variante of candidatos(nodo)) {
    try {
      const stream = await pedir(variante, tipo);
      const buffer = await streamToBuffer(stream, MAX_MEDIA_BYTES);
      if (!buffer || buffer.length < 100) throw new Error('No se pudo descargar el archivo');
      return buffer;
    } catch (e) {
      ultimo = e;
      if (/demasiado grande/i.test(e?.message || '')) throw e;
    }
  }
  throw ultimo || new Error('No se pudo descargar el archivo');
}

function mensajeDelMedio(sock, msg, origen) {
  if (origen === 'propio') return { key: msg.key, message: msg.message };
  const ctx = citaDe(msg);
  if (!ctx?.stanzaId || !ctx.quotedMessage) return null;
  return {
    key: {
      remoteJid: msg.key.remoteJid,
      id: ctx.stanzaId,
      participant: ctx.participant,
      fromMe: Boolean(ctx.participant && sock.user?.id && sameUser(ctx.participant, sock.user.id)),
    },
    message: ctx.quotedMessage,
  };
}

async function bajar(sock, msg, found, origen, opts = {}) {
  const unirse = opts.unirse !== false;
  const ids = idsRelacionados(msg, origen);
  if (unirse) {
    const listo = tomar(ids);
    if (listo) return listo;
    const pendientes = [];
    for (const id of ids) {
      const v = vuelos.get(id);
      if (v) pendientes.push(v);
    }
    if (pendientes.length) {
      await Promise.all(pendientes.map((p) => Promise.resolve(p).catch(() => null)));
      const tras = tomar(ids);
      if (tras) return tras;
    }
  }

  const nodo = found?.msg || found?.data;
  const tipo = found?.dl || found?.type;
  try {
    const buf = await bajarNodo(nodo, tipo);
    recordar(msg, origen, found, buf);
    return buf;
  } catch (primero) {
    const original = mensajeDelMedio(sock, msg, origen);
    if (!original || !nodo?.mediaKey || typeof sock.updateMediaMessage !== 'function') throw primero;
    logger.info(`ver una vez: la descarga directa falló (${primero?.message || primero}); pido que lo vuelvan a subir`);
    let espera;
    const tope = new Promise((_, no) => {
      espera = setTimeout(() => no(new Error('el móvil no contestó a la resubida')), ESPERA_RESUBIDA_MS);
    });
    try {
      const nuevo = await Promise.race([sock.updateMediaMessage(original), tope]);
      const otra = clasificar(nuevo?.message) || found;
      const nodo2 = otra.msg || otra.data || nodo;
      // El tipo es el del nodo renovado. Pedirlo con el de antes deriva otra
      // clave HKDF y lo que baja es basura aunque el enlace sea nuevo.
      const tipo2 = otra.dl || otra.type || tipo;
      const buf = await bajarNodo(nodo2, tipo2);
      recordar(msg, origen, { ...found, verUnaVez: esVista(found) || esVista(otra) }, buf);
      return buf;
    } finally {
      clearTimeout(espera);
    }
  }
}

function archivarVerUnaVez(sock, msg) {
  const id = msg?.key?.id;
  if (!id || vuelos.has(id) || tomar([id])) return;
  const found = clasificar(msg.message);
  // Un webp llega con type sticker y dl image/document: también es una foto.
  // El sticker de bandeja (dl sticker) no: /s no lo convierte, lo reestampa.
  const sirve = found && (found.type === 'image' || found.type === 'video'
    || (found.type === 'sticker' && found.dl !== 'sticker'));
  if (!sirve) return;
  const nodo = found.msg;
  if (!nodo?.url && !nodo?.directPath && !nodo?.mediaKey) return;
  found.verUnaVez = true;
  const p = encolar(() => bajar(sock, msg, found, 'propio', { unirse: false }).catch((e) => {
    logger.info(`ver una vez: no se pudo guardar al llegar (${e?.message || e})`);
    return null;
  }));
  vuelos.set(id, p);
  const limpiar = () => { if (vuelos.get(id) === p) vuelos.delete(id); };
  p.then(limpiar, limpiar);
}

function esperaArchivo(id) {
  const p = id && vuelos.get(id);
  if (!p) return Promise.resolve();
  let timer;
  const tope = new Promise((r) => { timer = setTimeout(r, ESPERA_ACUSE_MS); });
  return Promise.race([
    Promise.resolve(p).catch(() => null),
    tope,
  ]).finally(() => clearTimeout(timer));
}

module.exports = {
  clasificar, bajar, archivarVerUnaVez, esperaArchivo, citaDe,
  _usarDescarga, _vaciar, _guardar,
};
