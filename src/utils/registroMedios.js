'use strict';

// ─── LO QUE CADA UNO HA MANDADO A LOS GRUPOS, PARA EL !k A DISTANCIA (23 nov) ─
//
// El dueño: «a veces decir !k, welcome o diría algo es muy cantoso. ¿Se puede
// hacer más anónimo, sin que tenga que interactuar con el mensaje?». Y luego:
// «/k y el número, que mande todo lo que ha estado registrado». Desde el
// privado del bot, *!k 573001234567* le manda todo lo que esa persona ha
// subido a los grupos desde que el bot lo apuntó; *!k interlude 5730…*, solo lo
// de ese grupo. En el grupo no pasa nada.
//
// Aquí no se guarda ningún archivo. Se guarda lo que WhatsApp pone en el
// mensaje para poder bajarlo después (la ruta en su servidor y la clave),
// recortado: sin la miniatura ni la cita, unos cientos de bytes por medio. Si
// el servidor ya no lo tiene, !k pide que se vuelva a subir, como siempre.
//
// SOLO LO DEL BOT. El guardián no apunta nada de esto ni se entera (el dueño:
// «el guardián no puede tocar nada de esto; es completamente invisible»). Y lo
// de ver una vez no entra: a este bot solo le llega el aviso vacío, sin nada
// que bajar.

const fs = require('fs');
const path = require('path');
const { proto } = require('@whiskeysockets/baileys');
const { atomicWriteJson } = require('./helpers');
const { bareJid } = require('./wa');
const { formasDe } = require('./persona');
const logger = require('./logger');

let FICHERO = path.join(__dirname, '../../data/registroMedios.json');
const TOPE_TOTAL = 5000;
const TOPE_PERSONA = 300;
const CAMPOS = ['imageMessage', 'videoMessage', 'documentMessage', 'ptvMessage'];

// LO QUE LLEGA Y LO QUE NO SE APUNTA, CONTADO (27 nov). El dueño: «no enviaba
// una sola foto del individuo, solo vídeos». Sin los datos de la VPS no se
// sabe si esas fotos eran de ver una vez (al bot solo le llega el aviso),
// venían en un sobre que no se abre o no llegaron. Aquí se cuenta, por tipo, lo
// que llega a los grupos, lo que se apunta y por qué no lo demás, con los
// sobres que no se conocen; sale en `npm run estado`.
let CUENTAS = path.join(__dirname, '../../data/registroMediosCuentas.json');
let cuentas = null;
const SIN_MEDIO = new Set(['conversation', 'extendedTextMessage', 'reactionMessage', 'protocolMessage',
  'senderKeyDistributionMessage', 'messageContextInfo', 'stickerMessage', 'audioMessage', 'pollUpdateMessage',
  'pollCreationMessage', 'pollCreationMessageV2', 'pollCreationMessageV3', 'editedMessage', 'keepInChatMessage',
  'pinInChatMessage', 'albumMessage', 'contactMessage', 'locationMessage', 'liveLocationMessage', 'eventMessage',
  'templateMessage', 'buttonsResponseMessage', 'listResponseMessage', 'interactiveResponseMessage', 'callLogMesssage',
  'groupInviteMessage', 'contactsArrayMessage', 'ptvMessage', 'commentMessage', 'encReactionMessage', 'newsletterAdminInviteMessage']);
function cargarCuentas() {
  if (cuentas) return cuentas;
  cuentas = { desde: Date.now(), llegan: {}, apuntados: {}, fuera: {}, sobres: [] };
  try {
    const d = JSON.parse(fs.readFileSync(CUENTAS, 'utf8'));
    if (d && typeof d === 'object' && d.llegan) cuentas = { ...cuentas, ...d };
  } catch { /* se empieza de cero */ }
  return cuentas;
}
function sumar(donde, clave) { const c = cargarCuentas(); c[donde][clave] = (c[donde][clave] || 0) + 1; }
const NOMBRE = { imageMessage: 'foto', videoMessage: 'vídeo', documentMessage: 'documento', ptvMessage: 'vídeo' };

// [{ id, g: grupo, a: autor, a2: su otra forma si vino, t: segundos, m: mensaje en base64 }]
let lista = null;
let timer = null;
let persistir = true;

function cargar() {
  if (lista) return lista;
  lista = [];
  try {
    const d = JSON.parse(fs.readFileSync(FICHERO, 'utf8'));
    if (Array.isArray(d)) lista = d.filter((x) => x && x.id && x.g && x.a && x.m);
  } catch { /* sin fichero: se empieza vacío */ }
  return lista;
}

function desenvolver(m) {
  let cur = m;
  for (let i = 0; i < 5 && cur; i++) {
    const dentro = cur.ephemeralMessage?.message || cur.viewOnceMessage?.message
      || cur.viewOnceMessageV2?.message || cur.viewOnceMessageV2Extension?.message
      || cur.documentWithCaptionMessage?.message
      // LAS FOTOS DE UN ÁLBUM (27 nov). El dueño: «solo envía vídeos y no las
      // fotos». Varias fotos mandadas a la vez llegan como un álbum, y cada
      // una envuelta en `associatedChildMessage`: no se apuntaban.
      || cur.associatedChildMessage?.message;
    if (!dentro) break;
    cur = dentro;
  }
  return cur;
}

function programarGuardado() {
  if (!persistir || timer) return;
  timer = setTimeout(() => {
    timer = null;
    flush().catch((e) => logger.warn(`registro de medios: no pude guardar (${e.message})`));
  }, 5000);
  timer.unref?.();
}

// Se llama con cada mensaje que llega. Nunca lanza y no baja nada.
function apuntar(msg) {
  try {
    const g = msg?.key?.remoteJid;
    if (!g || !String(g).endsWith('@g.us') || msg.key.fromMe) return false;
    if (!msg.message) {
      // El aviso vacío de ver una vez: al bot no le llega la foto.
      if (msg.key.isViewOnce === true) { sumar('llegan', 'ver una vez'); sumar('fuera', 'ver una vez (solo llega el aviso)'); programarGuardado(); }
      return false;
    }
    const c = desenvolver(msg.message);
    const campo = c && CAMPOS.find((f) => c[f]);
    if (!campo) {
      // Un sobre que no se conoce y que puede llevar un medio dentro.
      const raras = Object.keys(c || {}).filter((k) => !SIN_MEDIO.has(k) && c[k]);
      if (raras.length) {
        const cu = cargarCuentas();
        const firma = raras.sort().join('+');
        cu.fuera[`sobre desconocido: ${firma}`] = (cu.fuera[`sobre desconocido: ${firma}`] || 0) + 1;
        cu.sobres = [...(cu.sobres || []).filter((x) => x !== firma), firma].slice(-5);
        programarGuardado();
      }
      return false;
    }
    const nodo = c[campo];
    const tipo = NOMBRE[campo] || campo;
    sumar('llegan', tipo);
    // Sin clave o sin ruta no hay nada que bajar luego (el aviso vacío de ver
    // una vez llega así).
    if (!nodo.mediaKey || !(nodo.directPath || nodo.url)) { sumar('fuera', `${tipo} sin clave o sin ruta`); programarGuardado(); return false; }
    const a = bareJid(msg.key.participant || msg.participant || '');
    if (!a) return false;
    const copia = { ...nodo };
    delete copia.jpegThumbnail;
    delete copia.contextInfo;
    const m = Buffer.from(proto.Message.encode(proto.Message.fromObject({ [campo]: copia })).finish()).toString('base64');
    const bruto = msg.messageTimestamp;
    const t = Number(typeof bruto?.toNumber === 'function' ? bruto.toNumber() : bruto || 0) || Math.floor(Date.now() / 1000);
    const l = cargar();
    if (l.some((x) => x.id === msg.key.id && x.g === g)) return false;
    sumar('apuntados', tipo);
    const a2 = bareJid(msg.key.participantAlt || msg.key.participantPn || '');
    l.push({ id: msg.key.id, g, a, ...(a2 && a2 !== a ? { a2 } : {}), t, m });
    recortar(l, a);
    programarGuardado();
    return true;
  } catch { return false; }
}

// Las formas de la persona que se pide, y las de quien subió cada medio.
function esDe(x, buscadas) {
  for (const j of [x.a, x.a2]) {
    if (j && formasDe(j).some((f) => buscadas.includes(f))) return true;
  }
  return false;
}

function recortar(l, autor) {
  const buscadas = formasDe(autor);
  const suyos = l.filter((x) => esDe(x, buscadas));
  if (suyos.length > TOPE_PERSONA) {
    const fuera = new Set(suyos.sort((p, q) => p.t - q.t).slice(0, suyos.length - TOPE_PERSONA));
    for (let i = l.length - 1; i >= 0; i--) if (fuera.has(l[i])) l.splice(i, 1);
  }
  if (l.length > TOPE_TOTAL) {
    l.sort((p, q) => p.t - q.t);
    l.splice(0, l.length - TOPE_TOTAL);
  }
}

// Todo lo de una persona (Jid o número), del más viejo al más nuevo; si se da
// grupo, solo lo de ese grupo. Con el mensaje ya decodificado.
function dePersona(quien, grupo = null) {
  const jid = String(quien || '').includes('@') ? String(quien) : `${String(quien || '').replace(/\D/g, '')}@s.whatsapp.net`;
  const buscadas = formasDe(jid);
  return cargar()
    .filter((x) => (!grupo || x.g === grupo) && esDe(x, buscadas))
    .sort((p, q) => p.t - q.t)
    .map((x) => {
      try { return { ...x, message: proto.Message.decode(Buffer.from(x.m, 'base64')) }; } catch { return null; }
    })
    .filter(Boolean);
}

async function flush() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!persistir) return;
  if (cuentas) await atomicWriteJson(CUENTAS, cuentas);
  if (lista) await atomicWriteJson(FICHERO, lista);
}

module.exports = {
  apuntar, dePersona, flush,
  cuentasDeRegistro: () => cargarCuentas(),
  _fichero: (f) => { FICHERO = f; lista = null; },
  _reset: () => { lista = []; cuentas = null; CUENTAS = '/nonexistent/registroMediosCuentas.json'; persistir = false; if (timer) { clearTimeout(timer); timer = null; } },
};
