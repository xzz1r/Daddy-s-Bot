'use strict';

// ─── LAS CLAVES DE UN SOLO USO DEL BOT, SIEMPRE LLENAS (13 nov) ──────────────
//
// El dueño: «utilizo la VPS precisamente para no depender de mi teléfono». Lo
// que el bot no puede abrir no se lo puede pedir a nadie más: hay que conseguir
// que quien escribe le dé su clave de grupo al bot.
//
// Cada persona reparte su clave de grupo a cada dispositivo por un canal de
// uno a uno, y para abrir ese canal con un dispositivo nuevo coge del servidor
// una de sus claves de un solo uso (prekeys). Tras vincular un número, el bot
// no tiene canal con nadie: TODOS los que escriben en sus grupos necesitan una.
// WhatsApp sube 812 al registrarse; Baileys solo repone 5 cuando el servidor
// avisa de que quedan pocas (Socket/socket.js, MIN_PREKEY_COUNT). Con cientos
// de personas en los grupos, se acaban en un momento, y quien no consigue
// clave no le reparte la suya al bot: sus mensajes, historias incluidas, le
// llegan cerrados. Lo cuenta Baileys #2884: subir 812 acabó con la sordera
// total de un número recién vinculado.
//
// Aquí se mira cuántas quedan en el servidor al conectar, cada tres horas y
// cuando el servidor avisa, y si bajan de UMBRAL se suben las que faltan hasta
// OBJETIVO, que es lo que sube el propio WhatsApp. Una consulta de recuento y,
// si hace falta, una subida: lo mismo que hace cualquier cliente. Como mucho
// una subida por hora.

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const UMBRAL = 200;
const OBJETIVO = 812;
const CADA_MS = 3 * 60 * 60 * 1000;
const ENTRE_SUBIDAS_MS = 60 * 60 * 1000;
const TRAS_CONECTAR_MS = 20 * 1000;
const TRAS_AVISO_MS = 60 * 1000;

let FICHERO = path.join(__dirname, '../../data/clavesUnUso.json');

function leer() {
  try {
    const v = JSON.parse(fs.readFileSync(FICHERO, 'utf8'));
    return v && typeof v === 'object' ? v : {};
  } catch { return {}; }
}
function apuntar(cambios) {
  try {
    const v = { ...leer(), ...cambios };
    fs.mkdirSync(path.dirname(FICHERO), { recursive: true });
    fs.writeFileSync(FICHERO, JSON.stringify(v));
  } catch { /* contar no tumba nada */ }
}

// Cuántas le quedan al bot en el servidor.
async function enServidor(sock) {
  const { getBinaryNodeChild } = require('@whiskeysockets/baileys');
  const r = await sock.query({
    tag: 'iq',
    attrs: { id: sock.generateMessageTag(), xmlns: 'encrypt', type: 'get', to: 's.whatsapp.net' },
    content: [{ tag: 'count', attrs: {} }],
  });
  const n = Number(getBinaryNodeChild(r, 'count')?.attrs?.value);
  if (!Number.isFinite(n)) throw new Error('el servidor no dijo cuántas quedan');
  return n;
}

let ultimaSubida = 0;
let enCurso = null;

async function reponer(sock, { ahora = Date.now } = {}) {
  if (!sock || typeof sock.query !== 'function' || typeof sock.uploadPreKeys !== 'function'
    || typeof sock.generateMessageTag !== 'function') return { estado: 'sin socket' };
  if (enCurso) return enCurso;
  enCurso = (async () => {
    const n = await enServidor(sock);
    apuntar({ ts: ahora(), enServidor: n });
    if (n >= UMBRAL) return { estado: 'bien', n };
    if (ahora() - ultimaSubida < ENTRE_SUBIDAS_MS) return { estado: 'espera', n };
    const sube = Math.max(0, OBJETIVO - n);
    if (!sube) return { estado: 'bien', n };
    ultimaSubida = ahora();
    await sock.uploadPreKeys(sube);
    const d = leer();
    apuntar({ ultimaSubida: ultimaSubida, subidas: (d.subidas || 0) + 1, subidasClaves: (d.subidasClaves || 0) + sube, enServidor: n + sube });
    logger.info(`claves de un solo uso: quedaban ${n} en el servidor, subidas ${sube}`);
    return { estado: 'subidas', n, sube };
  })().catch((e) => {
    logger.info(`claves de un solo uso: no pude reponerlas (${e?.message || e})`);
    return { estado: 'error', error: String(e?.message || e) };
  }).finally(() => { enCurso = null; });
  return enCurso;
}

// Se engancha a un socket recién conectado. Devuelve una función que lo para.
function arrancar(sock) {
  const timers = [];
  let aviso = null;
  timers.push(setTimeout(() => { reponer(sock).catch(() => {}); }, TRAS_CONECTAR_MS));
  const cada = setInterval(() => { reponer(sock).catch(() => {}); }, CADA_MS);
  timers.push(cada);
  for (const t of timers) t.unref?.();
  // El servidor avisa cuando quedan pocas (notification type=encrypt). Baileys
  // sube cinco; esto, un minuto después, rellena lo que falte.
  const alAviso = () => {
    if (aviso) return;
    aviso = setTimeout(() => { aviso = null; reponer(sock).catch(() => {}); }, TRAS_AVISO_MS);
    aviso.unref?.();
  };
  try { sock.ws?.on?.('CB:notification,type:encrypt', alAviso); } catch { /* sin aviso, queda el reloj */ }
  return () => {
    for (const t of timers) { clearTimeout(t); clearInterval(t); }
    clearTimeout(aviso);
    try { sock.ws?.off?.('CB:notification,type:encrypt', alAviso); } catch { /* nada */ }
  };
}

module.exports = {
  reponer, arrancar, leer, UMBRAL, OBJETIVO,
  _prueba: ({ fichero } = {}) => { if (fichero) FICHERO = fichero; ultimaSubida = 0; enCurso = null; },
};
