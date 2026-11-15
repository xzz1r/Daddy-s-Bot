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

// ─── Y EN DISCO, NO SOLO EN MEMORIA (15 nov) ────────────────────────────────
//
// El dueño, con el grupo riéndose del bot: «!s y !toimg no sacan nada». En
// ese grupo TODAS las fotos van en ver una vez (es la regla, y el bot borra
// las que no), y la copia de cada una vivía solo en memoria, con sitio para
// las OCHO últimas. Responder a una foto de hace un rato ya no la encontraba,
// y como el enlace de WhatsApp muere al marcarla «Abierta», no había de dónde
// sacarla. Y cada reinicio del bot las tiraba todas.
//
// Ahora cada copia se escribe también en data/verUnaVez/ (fuera del
// respaldo: se regenera sola y no salva nada). Con las mismas seis horas de
// vida y un tope de ficheros y de megas; lo que caduca o sobra se borra.
const path = require('path');
const fsp = require('fs').promises;
const fsSync = require('fs');
let DIR_DISCO = path.join(__dirname, '../../data/verUnaVez');
const TOPE_DISCO_FICHEROS = 400;
const TOPE_DISCO_BYTES = 300 * 1024 * 1024;
const BARRER_CADA_MS = 10 * 60 * 1000;
let ultimoBarrido = 0;

const nombreDisco = (id) => String(id || '').split('|').pop().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
const rutaDisco = (id) => {
  const n = nombreDisco(id);
  return n ? path.join(DIR_DISCO, `${n}.bin`) : null;
};

async function escribirDisco(id, buf) {
  const ruta = rutaDisco(id);
  if (!ruta) return;
  try {
    await fsp.mkdir(DIR_DISCO, { recursive: true });
    const tmp = `${ruta}.${process.pid}.tmp`;
    await fsp.writeFile(tmp, buf);
    await fsp.rename(tmp, ruta);
  } catch (e) {
    logger.info(`ver una vez: no pude guardar la copia en disco (${e?.message || e})`);
  }
  if (Date.now() - ultimoBarrido > BARRER_CADA_MS) barrerDisco().catch(() => {});
}

function hayEnDisco(id) {
  const ruta = rutaDisco(id);
  if (!ruta) return false;
  try { return Date.now() - fsSync.statSync(ruta).mtimeMs <= TTL_MS; } catch { return false; }
}

async function leerDisco(ids) {
  for (const id of ids) {
    const ruta = rutaDisco(id);
    if (!ruta) continue;
    try {
      const st = await fsp.stat(ruta);
      if (Date.now() - st.mtimeMs > TTL_MS) { await fsp.unlink(ruta).catch(() => {}); continue; }
      const buf = await fsp.readFile(ruta);
      if (buf.length >= 100) return { id: nombreDisco(id), buf };
    } catch { /* no está */ }
  }
  return null;
}

// Fuera lo caducado, y si aun así se pasa del tope, lo más viejo.
async function barrerDisco() {
  ultimoBarrido = Date.now();
  let nombres = [];
  try { nombres = await fsp.readdir(DIR_DISCO); } catch { return 0; }
  const vivos = [];
  let borrados = 0;
  for (const n of nombres) {
    const ruta = path.join(DIR_DISCO, n);
    try {
      const st = await fsp.stat(ruta);
      const viejoTmp = n.endsWith('.tmp') && Date.now() - st.mtimeMs > 60 * 1000;
      if (viejoTmp || Date.now() - st.mtimeMs > TTL_MS) { await fsp.unlink(ruta); borrados++; continue; }
      if (n.endsWith('.bin')) vivos.push({ ruta, ts: st.mtimeMs, tam: st.size });
    } catch { /* ya no está */ }
  }
  vivos.sort((a, b) => a.ts - b.ts);
  let total = vivos.reduce((a, v) => a + v.tam, 0);
  while (vivos.length && (vivos.length > TOPE_DISCO_FICHEROS || total > TOPE_DISCO_BYTES)) {
    const v = vivos.shift();
    total -= v.tam;
    await fsp.unlink(v.ruta).then(() => { borrados++; }, () => {});
  }
  return borrados;
}
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
  // Y las copias en disco: una prueba que vacía empieza de cero.
  try { for (const n of fsSync.readdirSync(DIR_DISCO)) fsSync.unlinkSync(path.join(DIR_DISCO, n)); } catch { /* no hay */ }
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
  escribirDisco(id, buf).catch(() => {});
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

// POR QUÉ FALLÓ, PARA `npm run estado` (15 nov). El dueño no tiene por qué
// buscar en el log: cada fallo de /s o /toimg al bajar deja aquí su motivo, sin
// contenido ni números, y estado lo resume.
let FICHERO_FALLOS = path.join(__dirname, '../../data/fallosMedios.json');
function apuntarFallo(motivo) {
  try {
    let v = [];
    try { v = JSON.parse(fsSync.readFileSync(FICHERO_FALLOS, 'utf8')); } catch { v = []; }
    if (!Array.isArray(v)) v = [];
    v.push({ ts: Date.now(), motivo });
    fsSync.mkdirSync(path.dirname(FICHERO_FALLOS), { recursive: true });
    fsSync.writeFileSync(FICHERO_FALLOS, JSON.stringify(v.slice(-100)));
  } catch { /* contar no tumba nada */ }
}
function fallos(horas = 24) {
  try {
    const desde = Date.now() - horas * 3600000;
    const v = JSON.parse(fsSync.readFileSync(FICHERO_FALLOS, 'utf8'));
    return (Array.isArray(v) ? v : []).filter((x) => x.ts >= desde);
  } catch { return []; }
}

async function bajar(sock, msg, found, origen, opts = {}) {
  try {
    return await bajarSinApuntar(sock, msg, found, origen, opts);
  } catch (e) {
    if (opts.unirse !== false) {
      const nodo = found?.msg || found?.data;
      apuntarFallo(!nodo?.mediaKey ? 'sin clave' : e?.resubida ? 'enlace muerto y sin copia' : 'descarga');
    }
    throw e;
  }
}

async function bajarSinApuntar(sock, msg, found, origen, opts = {}) {
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
    // La copia en disco: la de hace un rato, o la de antes de un reinicio.
    const delDisco = await leerDisco(ids);
    if (delDisco) {
      porId.set(delDisco.id, { buf: delDisco.buf, ts: Date.now() });
      bytes += delDisco.buf.length;
      return delDisco.buf;
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
      const nuevo = await Promise.race([sock.updateMediaMessage(original), tope]).catch((e) => { if (e) e.resubida = true; throw e; });
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
  if (!id || vuelos.has(id) || tomar([id]) || hayEnDisco(id)) return;
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
    apuntarFallo('no se guardó al llegar');
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
  clasificar, bajar, archivarVerUnaVez, esperaArchivo, citaDe, barrerDisco, fallos,
  _usarDescarga, _vaciar, _guardar,
  _usarDisco: (dir) => { DIR_DISCO = dir; ultimoBarrido = 0; FICHERO_FALLOS = path.join(dir, '..', 'fallosMedios.json'); },
  _olvidarMemoria: () => { porId.clear(); alias.clear(); vuelos.clear(); bytes = 0; },
  _rutaDisco: rutaDisco,
};
