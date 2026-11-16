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

// LA COPIA DEL GUARDIÁN (16 nov). El guardián, vinculado como Android, baja
// la foto que al bot no le llega y la deja aquí con el mismo nombre (ver
// src/guardian.js, «LAS FOTOS DE VER UNA VEZ»). Mientras baja deja <id>.pend
// al lado: si alguien pide /toimg en ese rato, se espera a que termine.
const VIDA_PEND_MS = 3 * 60 * 1000;
let ESPERA_GUARDIAN_MS = 25000;
const rutaPend = (id) => { const r = rutaDisco(id); return r ? r.replace(/\.bin$/, '.pend') : null; };
function bajandoElGuardian(ids) {
  return ids.some((id) => {
    const r = rutaPend(id);
    if (!r) return false;
    try { return Date.now() - fsSync.statSync(r).mtimeMs < VIDA_PEND_MS; } catch { return false; }
  });
}
async function esperarDelGuardian(ids) {
  if (!bajandoElGuardian(ids)) return null;
  const hasta = Date.now() + ESPERA_GUARDIAN_MS;
  while (Date.now() < hasta) {
    await new Promise((r) => { setTimeout(r, 300); });
    const listo = await leerDisco(ids);
    if (listo) return listo;
    if (!bajandoElGuardian(ids)) return leerDisco(ids);
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
      const viejoTmp = (n.endsWith('.tmp') && Date.now() - st.mtimeMs > 60 * 1000)
        || (n.endsWith('.pend') && Date.now() - st.mtimeMs > VIDA_PEND_MS);
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
  noEntregadas.clear();
  conContenido.clear();
  crudas.clear();
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
function apuntarFallo(motivo, detalle = null) {
  try {
    let v = [];
    try { v = JSON.parse(fsSync.readFileSync(FICHERO_FALLOS, 'utf8')); } catch { v = []; }
    if (!Array.isArray(v)) v = [];
    v.push({ ts: Date.now(), motivo, ...(detalle ? { detalle } : {}) });
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

// EL MOTIVO DE VERDAD (16 nov). Antes, si de la foto solo había llegado el
// aviso vacío, cualquier fallo de /toimg se contaba y se contestaba como «no me
// llegó», aunque la respuesta trajera la foto citada y lo que fallara fuera la
// descarga. Ahora se mira primero lo que trae la cita: sin clave, la respuesta
// no lleva la foto (quien responde ya la había abierto, o su móvil no la
// tiene); con clave, es la descarga. Y se apunta lo que traía, para estado.
async function bajar(sock, msg, found, origen, opts = {}) {
  try {
    return await bajarSinApuntar(sock, msg, found, origen, opts);
  } catch (e) {
    if (opts.unirse !== false) {
      const nodo = found?.msg || found?.data;
      const sinClave = !nodo?.mediaKey;
      const ne = noEntregadaDe(idsRelacionados(msg, origen));
      if (e && typeof e === 'object') {
        if (sinClave && origen === 'cita') e.sinClaveEnCita = true;
        else if (sinClave && ne) e.noEntregada = true;
      }
      const motivo = sinClave
        ? (origen === 'cita' ? 'la respuesta no trae la foto' : ne ? 'no le llegó al bot' : 'sin clave')
        : e?.resubida ? 'enlace muerto y sin copia' : 'descarga';
      apuntarFallo(motivo, detalleFallo(msg, origen, nodo, e));
    }
    throw e;
  }
}

// Lo que traía el mensaje, sin contenido ni números: qué envoltorio, si venía
// la clave, la ruta y el enlace, el error, y desde qué tipo de app se respondió
// (por el id del mensaje: 3EB0 es web, 3A un iPhone).
function detalleFallo(msg, origen, nodo, e) {
  try {
    const base = origen === 'cita' ? citaDe(msg)?.quotedMessage : msg?.message;
    const id = String(msg?.key?.id || '');
    return {
      origen,
      envoltorio: Object.keys(base || {}).slice(0, 4).join(','),
      clave: Boolean(nodo?.mediaKey),
      ruta: Boolean(nodo?.directPath),
      enlace: Boolean(nodo?.url),
      vista: nodo?.viewOnce === true || /viewOnce/.test(Object.keys(base || {}).join(',')),
      app: id.startsWith('3EB0') ? 'web' : id.startsWith('3A') ? 'iPhone' : id ? 'Android u otra' : '?',
      error: String(e?.message || e || '').slice(0, 120),
    };
  } catch { return null; }
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
    // La copia en disco: la de hace un rato, la de antes de un reinicio o la
    // que el guardián está terminando de bajar.
    const delDisco = (await leerDisco(ids)) || (await esperarDelGuardian(ids));
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

// ─── EL AVISO VACÍO PISABA A LA FOTO (15 nov, alerta roja del dueño) ───────
//
// A un dispositivo vinculado, WhatsApp le manda cada foto o vídeo de ver una
// vez DOS veces con el mismo id: la de verdad, cifrada y con su clave, y un
// aviso vacío (`<unavailable type="view_once">`, a veces
// `view_once_unavailable_fanout`) para los vinculados que no la pueden
// enseñar (Baileys PR #2435, capturado en WhatsApp Desktop y en Android).
// Baileys procesa cada mensaje con su búfer de eventos encendido, y en ese
// búfer un `messages.upsert` con el mismo id SUSTITUYE entero al anterior
// (Utils/event-buffer.js: `data.messageUpserts[key] = { message }`). Si el
// aviso llega detrás de la foto, el bot solo recibe el aviso: un mensaje con
// `key.isViewOnce` y nada dentro, que handleMessage tira. Comprobado con el
// búfer real de Baileys rc14 (capa 170). Por eso «a veces» funcionaba en
// octubre, y por eso la cita de /toimg no tenía clave y el bot no tenía copia.
//
// El arreglo va ANTES del búfer: `instalarFiltro` envuelve `sock.ev.emit`,
// por donde Baileys mete cada mensaje en el búfer. La foto de verdad se guarda
// en cuanto aparece (archivarVerUnaVez) y el aviso vacío de una foto que ya
// llegó no entra: así ni pisa a la foto ni llega a handleMessage. Si llega
// primero el aviso y luego la foto, la foto ya lo sustituye a él, que es lo
// que debe pasar. Nada cambia para ningún otro mensaje.
//
// Si de una foto SOLO llega el aviso (WhatsApp no mandó la de verdad, o no se
// pudo abrir), se dice en el log como WARN, se apunta para `npm run estado` y
// /s y /toimg contestan NO_ENTREGADA. En la VPS del dueño es lo que pasa: a
// este bot WhatsApp no le manda la foto (15 nov, «la foto no llegó»). Al
// teléfono del número no se le pide: se probó (placeholder resend, como
// WhatsApp Web) y no la devuelve, y el dueño no quiere depender de él.
//
// LA FOTO DENTRO DE UNA RESPUESTA (15 nov). Es como la sacan los otros bots:
// quien responde a una foto de ver una vez lleva la foto citada en su
// mensaje, con su clave, si su móvil la tiene (sin abrirla, y si no es suya).
// `guardarDeCita` la guarda bajo el id de la foto venga en la respuesta que
// venga, sea un comando o un «jaja»; así el /toimg de después la encuentra
// aunque la cita de quien lo escribe venga sin clave.
const NO_ENTREGADA_MS = 6 * 60 * 60 * 1000;
const VIDA_IDS_MS = 30 * 60 * 1000;
const TOPE_IDS = 2000;
let ESPERA_SOLO_AVISO_MS = 8000;
const noEntregadas = new Map(); // id -> { ts }
const conContenido = new Map(); // id -> { ts }: llegó la foto de verdad
const crudas = new Map(); // id -> { enc, aviso, ts }: lo que trajo el socket
// Lo que contestan /s y /toimg cuando es eso: no es un fallo de descarga.
const NO_ENTREGADA = 'Esa foto no me llega.';
// Cuando se responde a la foto y la respuesta no la trae (ya estaba abierta).
const SIN_CLAVE_CITA = 'Esa foto no me llega.';
const MARCA_FILTRO = Symbol.for('daddy.verUnaVez.filtro');

function podar(mapa) {
  const ahora = Date.now();
  for (const [k, v] of mapa) {
    if (ahora - (v?.ts || 0) > VIDA_IDS_MS) mapa.delete(k);
    else break;
  }
  while (mapa.size > TOPE_IDS) mapa.delete(mapa.keys().next().value);
}
function recordarId(mapa, id, valor) {
  mapa.delete(id);
  mapa.set(id, valor);
  podar(mapa);
}

// Lo que pasó con cada foto de ver una vez, para `npm run estado`: sin
// contenido ni números, solo qué llegó.
// Se escribe junto, como mucho cada cinco segundos: en el grupo del dueño
// todas las fotos son de ver una vez y esto va en el camino de cada mensaje.
let FICHERO_LLEGADAS = path.join(__dirname, '../../data/verUnaVezLlegadas.json');
let porEscribir = [];
let relojEscritura = null;
function escribirEventos() {
  relojEscritura = null;
  if (!porEscribir.length) return;
  const nuevos = porEscribir;
  porEscribir = [];
  try {
    let v = [];
    try { v = JSON.parse(fsSync.readFileSync(FICHERO_LLEGADAS, 'utf8')); } catch { v = []; }
    if (!Array.isArray(v)) v = [];
    v.push(...nuevos);
    fsSync.mkdirSync(path.dirname(FICHERO_LLEGADAS), { recursive: true });
    fsSync.writeFileSync(FICHERO_LLEGADAS, JSON.stringify(v.slice(-300)));
  } catch { /* contar no tumba nada */ }
}
function apuntarEvento(que) {
  porEscribir.push({ ts: Date.now(), que });
  if (!relojEscritura) {
    relojEscritura = setTimeout(escribirEventos, 5000);
    relojEscritura.unref?.();
  }
}
function llegadas(horas = 24) {
  const desde = Date.now() - horas * 3600000;
  let v = [];
  try { v = JSON.parse(fsSync.readFileSync(FICHERO_LLEGADAS, 'utf8')); } catch { v = []; }
  return [...(Array.isArray(v) ? v : []), ...porEscribir].filter((x) => x.ts >= desde);
}

function esAvisoVacio(msg, noEnviado) {
  if (msg?.message) return false;
  return msg?.key?.isViewOnce === true || /view_once/i.test(String(noEnviado || ''));
}

function traeVerUnaVez(msg) {
  if (!msg?.message) return false;
  const found = clasificar(msg.message);
  return Boolean(found && esVista(found));
}

// Lo que trae el socket, antes de descifrar: si hubo foto cifrada para este
// id (enc con mediatype) y si hubo aviso vacío. Solo para decir en el log qué
// pasó cuando falta la foto.
function anotarStanza(node) {
  try {
    if (!node || node.tag !== 'message' || !node.attrs?.id) return;
    let enc = false;
    let aviso = '';
    for (const h of Array.isArray(node.content) ? node.content : []) {
      if (h?.tag === 'enc' && h.attrs?.mediatype) enc = true;
      if (h?.tag === 'unavailable') aviso = String(h.attrs?.type || 'sin tipo');
    }
    if (!enc && !aviso) return;
    const id = String(node.attrs.id);
    const antes = crudas.get(id);
    recordarId(crudas, id, { enc: Boolean(antes?.enc || enc), aviso: antes?.aviso || aviso, ts: antes?.ts || Date.now() });
  } catch { /* mirar no tumba nada */ }
}

// La foto de ver una vez citada en una respuesta, si trae con qué bajarla
// (ver arriba). Se mira también dentro de un mensaje temporal.
function citaCruda(m) {
  const msg = m?.message;
  if (!msg) return null;
  return citaDe({ message: msg })
    || citaDe({ message: msg.ephemeralMessage?.message })
    || citaDe({ message: msg.documentWithCaptionMessage?.message });
}
function guardarDeCita(sock, m) {
  try {
    const ctx = citaCruda(m);
    if (!ctx?.stanzaId || !ctx.quotedMessage) return false;
    const id = String(ctx.stanzaId);
    if (vuelos.has(id) || tomar([id]) || hayEnDisco(id)) return false;
    const found = clasificar(ctx.quotedMessage);
    if (!found || !esVista(found)) return false;
    const nodo = found.msg || found.data;
    if (!nodo?.mediaKey || !(nodo.directPath || nodo.url)) return false;
    recordarId(conContenido, id, { ts: Date.now() });
    noEntregadas.delete(id);
    apuntarEvento('foto desde una respuesta');
    archivarVerUnaVez(sock, {
      key: { remoteJid: m.key?.remoteJid, id, participant: ctx.participant, fromMe: false },
      message: ctx.quotedMessage,
    });
    return true;
  } catch { return false; }
}

// Envuelve `sock.ev.emit` (ver arriba). Una vez por socket.
function instalarFiltro(sock, { noEnviado = () => '' } = {}) {
  const ev = sock && sock.ev;
  if (!ev || typeof ev.emit !== 'function') return false;
  if (ev[MARCA_FILTRO]) return true;
  const emitir = ev.emit.bind(ev);
  ev.emit = (evento, datos, ...resto) => {
    if (evento === 'messages.upsert' && datos && Array.isArray(datos.messages)) {
      try {
        const quedan = [];
        for (const m of datos.messages) {
          const id = m?.key?.id ? String(m.key.id) : '';
          if (id && traeVerUnaVez(m)) {
            const nueva = !conContenido.has(id);
            recordarId(conContenido, id, { ts: Date.now() });
            noEntregadas.delete(id);
            if (nueva) apuntarEvento('foto');
            archivarVerUnaVez(sock, m);
            quedan.push(m);
            continue;
          }
          if (id && conContenido.has(id) && esAvisoVacio(m, noEnviado(id))) {
            apuntarEvento('aviso vacío apartado');
            continue;
          }
          if (m?.message) guardarDeCita(sock, m);
          quedan.push(m);
        }
        if (!quedan.length) return true;
        if (quedan.length !== datos.messages.length) datos = { ...datos, messages: quedan };
      } catch { /* filtrar nunca se come un mensaje */ }
    }
    return emitir(evento, datos, ...resto);
  };
  ev[MARCA_FILTRO] = true;
  return true;
}

// Lo que sale ya del búfer (bot.js, messages.upsert). Aquí solo llega el
// aviso vacío de una foto que no ha llegado (todavía).
function apuntarLlegada(msg, tipo, sock = null, noEnviado = '') {
  try {
    if (esAvisoVacio(msg, noEnviado)) {
      const id = msg.key?.id ? String(msg.key.id) : '';
      if (!id || noEntregadas.has(id) || conContenido.has(id)) return;
      for (const [k, v] of noEntregadas) if (Date.now() - v.ts > NO_ENTREGADA_MS) noEntregadas.delete(k);
      noEntregadas.set(id, { ts: Date.now() });
      // Si la foto llega detrás, no hay nada que decir. Si no, se dice.
      const t = setTimeout(() => {
        try {
          if (conContenido.has(id) || vuelos.has(id) || tomar([id])) return;
          const cruda = crudas.get(id);
          // Esto NO es un fallo de /s ni de /toimg: nadie lo ha pedido todavía.
          // Contarlo ahí hizo que estado enseñara 99 «fallos» de 100 que eran
          // fotos mandadas al grupo. Va solo a las llegadas.
          apuntarEvento('solo el aviso vacío');
          logger.warn(`ver una vez: de ${id} al bot solo le llegó el aviso vacío (${noEnviado || 'view_once'}, ${tipo || '?'}); `
            + (cruda?.enc ? 'la foto llegó cifrada y no se pudo abrir' : 'la foto no llegó'));
        } catch { /* contar no tumba nada */ }
      }, ESPERA_SOLO_AVISO_MS);
      t.unref?.();
      return;
    }
    if (!msg?.message) return;
    const found = clasificar(msg.message);
    if (!found || !esVista(found)) return;
    const nodo = found.msg || found.data;
    logger.info(`ver una vez: llega ${found.type} (${tipo || '?'}) · clave ${nodo?.mediaKey ? 'sí' : 'no'} · ruta ${nodo?.directPath || nodo?.url ? 'sí' : 'no'}`);
  } catch { /* mirar no tumba nada */ }
}

// ¿Alguno de estos ids es una foto que WhatsApp no le mandó al bot?
function noEntregadaDe(ids) {
  for (const id of ids || []) {
    const v = noEntregadas.get(String(id).split('|').pop());
    if (v) return v;
  }
  return null;
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
  // Que llegue sin nada con qué bajarla lo dice WhatsApp, no el bot: se apunta
  // para que `npm run estado` lo distinga de un fallo de descarga.
  if (!nodo?.url && !nodo?.directPath && !nodo?.mediaKey) {
    logger.info('ver una vez: llegó sin clave ni enlace; no hay nada que guardar');
    apuntarFallo('llegó sin clave');
    return;
  }
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
  clasificar, bajar, archivarVerUnaVez, apuntarLlegada, instalarFiltro, anotarStanza, llegadas, noEntregadaDe, NO_ENTREGADA, SIN_CLAVE_CITA, esperaArchivo, citaDe, barrerDisco, fallos,
  _usarDescarga, _vaciar, _guardar,
  _usarDisco: (dir) => { DIR_DISCO = dir; ultimoBarrido = 0; FICHERO_FALLOS = path.join(dir, '..', 'fallosMedios.json'); FICHERO_LLEGADAS = path.join(dir, '..', 'verUnaVezLlegadas.json'); porEscribir = []; },
  _escribirEventos: escribirEventos,
  _olvidarMemoria: () => { porId.clear(); alias.clear(); vuelos.clear(); noEntregadas.clear(); conContenido.clear(); crudas.clear(); bytes = 0; },
  _usarEsperaSoloAviso: (ms) => { ESPERA_SOLO_AVISO_MS = ms; },
  _usarEsperaGuardian: (ms) => { ESPERA_GUARDIAN_MS = ms; },
  _rutaDisco: rutaDisco,
};
