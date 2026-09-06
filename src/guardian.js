// EL GUARDIÁN. Una segunda cuenta cuyo único trabajo es devolverle el admin al
// bot cuando alguien se lo quita.
//
// ─── POR QUÉ HACE FALTA UNA SEGUNDA CUENTA ──────────────────────────────────
//
// El anti-admin del bot revierte cualquier degradación: repone al degradado y
// le quita el admin a quien lo hizo. Contra el propio bot no puede hacer
// ninguna de las dos cosas, porque sin admin no tiene permiso para nada. Era la
// única agresión del grupo que salía gratis, y encima lo desarmaba entero: sin
// admin no borra enlaces, no borra historias y no expulsa.
//
// Eso no se arregla con más código en el bot. Hace falta OTRA cuenta que sí sea
// admin en el momento del golpe. Esto es esa cuenta.
//
// ─── QUÉ HACE, Y QUÉ NO ─────────────────────────────────────────────────────
//
// Escucha un solo evento —quién sube y quién baja de admin— y reacciona a un
// solo caso: al bot le han quitado el admin, se lo devuelve. Nada más.
//
// NO lee mensajes. NO responde comandos. NO cuenta nada, no toca el aura, no
// escribe en `data/`. No manda un solo mensaje al grupo: la reposición ya
// aparece sola en el aviso de sistema de WhatsApp y un texto encima solo sería
// el bot explicando su propia defensa a quien acaba de atacarla.
//
// Esa lista de "no" es la mitad del diseño. Una segunda cuenta automatizada es
// una segunda cuenta que WhatsApp puede vetar, y lo que hace que la veten es
// comportarse como un bot: contestar, mandar, escribir. Esta calla.
//
// ─── SE PROTEGEN LOS DOS ────────────────────────────────────────────────────
//
// El bot repone al guardián por su cuenta (ver bot.js). Así, para desarmarlo
// hay que degradar a los dos en menos de lo que tardan en reponerse, que es un
// segundo. Uno solo no sirve de nada: el otro lo deshace.
//
// ─── LO QUE EL GRUPO VE ─────────────────────────────────────────────────────
//
// WhatsApp anuncia solo quién asciende a quién. O sea que cada reposición deja
// escrito "<el número del guardián> ha nombrado admin a <el bot>", y eso ATA
// las dos cuentas a la vista de todo el grupo. No es un fallo, es el precio: no
// hay forma de ascender a nadie en silencio. Quien ponga aquí su número
// personal tiene que saberlo antes, no después.
//
// ─── CÓMO SE ENCIENDE ───────────────────────────────────────────────────────
//
//   .env:   GUARDIAN_DE=<número del bot, solo dígitos>
//   pm2:    pm2 start src/guardian.js --name guardian
//
// Se vincula igual que el bot, con su propio QR, y guarda su sesión en
// data/authGuardian: no comparte una sola credencial con el bot.
'use strict';

require('dotenv').config();
require('./utils/silenciarSignal').silenciarSignal();

const path = require('path');
const fs = require('fs-extra');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  DisconnectReason,
} = require('@whiskeysockets/baileys');
const logger = require('./utils/logger');
const { withTimeout } = require('./utils/helpers');

const AUTH_DIR = path.join(__dirname, '../data/authGuardian');
// SE LEE CADA VEZ, NO SOLO AL CARGAR. Fijarlo en una constante del modulo hace
// que dependa del orden en que se cargan las cosas —quien ponga la variable
// despues del require se queda sin guardian y sin aviso— y deja la unica
// funcion que importa aqui imposible de probar sin trucos.
const protegido = () => String(process.env.GUARDIAN_DE || '').replace(/\D/g, '');

// Reconexión con espera creciente, igual que el bot: reintentar cada segundo
// contra un WhatsApp que dice que no es la forma de que te veten la cuenta.
// TOPE PARA CUALQUIER LLAMADA AL SOCKET. Baileys no lo trae: si la conexion se
// queda a medias, una peticion se queda esperando para siempre y el guardian se
// pierde el unico momento en el que tenia que hacer algo, sin dar señal.
const TOPE_RED = 15000;
const ESPERA_MIN = 2000;
const ESPERA_MAX = 60000;
let espera = ESPERA_MIN;
let sock = null;

// A QUIÉN SE PROTEGE, CON LAS TRES FORMAS EN QUE WHATSAPP NOMBRA A ALGUIEN.
//
// El número puede llegar como teléfono, como @lid o dentro de la ficha del
// participante. Comparar en crudo contra una sola forma es el fallo que se
// repite en todo el bot: el evento llega por @lid, la comparación se hace
// contra el teléfono y no coincide nunca, así que el guardián se quedaría
// mirando sin hacer nada el día que hiciera falta.
function esElProtegido(jid, meta) {
  const PROTEGIDO = protegido();
  if (!jid || !PROTEGIDO) return false;
  const digitos = (x) => String(x || '').split('@')[0].split(':')[0].replace(/\D/g, '');
  if (digitos(jid) === PROTEGIDO) return true;
  // Si llegó un @lid, se busca su teléfono en la lista de miembros.
  for (const p of (meta?.participants || [])) {
    const formas = [p?.id, p?.lid, p?.phoneNumber].filter(Boolean).map(digitos);
    if (formas.includes(digitos(jid))) return formas.includes(PROTEGIDO);
  }
  return false;
}

async function reponer(groupJid, quienes) {
  try {
    const r = await withTimeout(sock.groupParticipantsUpdate(groupJid, quienes, 'promote'), TOPE_RED);
    // WhatsApp contesta POR PARTICIPANTE y puede rechazar sin lanzar nada. Dar
    // por hecho que "no ha petado" es "hecho" es cómo se acaba anunciando una
    // defensa que no ocurrió — el bot ya aprendió eso en sus tres reverts.
    const ok = (Array.isArray(r) ? r : []).filter((x) => String(x?.status) === '200');
    if (ok.length) logger.warn(`guardián: le he devuelto el admin al bot en ${groupJid}`);
    else logger.error(`guardián: NO he podido devolverle el admin al bot en ${groupJid} (${JSON.stringify(r).slice(0, 200)})`);
    return ok.length > 0;
  } catch (e) {
    logger.error(`guardián: fallo al reponer en ${groupJid}: ${e.message}`);
    return false;
  }
}

async function alDegradar(groupJid, participants, action, author) {
  if (action !== 'demote') return false;
  if (!protegido()) return false;

  // Si lo hizo el propio guardián, no hay nada que deshacer.
  const mios = [sock?.user?.id, sock?.user?.lid].filter(Boolean)
    .map((x) => String(x).split('@')[0].split(':')[0].replace(/\D/g, ''));
  if (author && mios.includes(String(author).split('@')[0].split(':')[0].replace(/\D/g, ''))) return false;

  let meta = null;
  try { meta = await withTimeout(sock.groupMetadata(groupJid), TOPE_RED); } catch {}

  const caidos = (participants || []).filter((j) => esElProtegido(j, meta));
  if (!caidos.length) return false;

  logger.warn(`guardián: le han quitado el admin al bot en ${groupJid}. Reponiendo.`);
  return reponer(groupJid, caidos);
}

async function conectar() {
  if (!protegido()) {
    logger.error('guardián: falta GUARDIAN_DE en el .env (el número del bot al que protege). No arranco.');
    process.exit(1);
  }

  await fs.ensureDir(AUTH_DIR);
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  let version;
  try { ({ version } = await fetchLatestBaileysVersion()); } catch {}

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    printQRInTerminal: false,
    // NI VISTO NI PRESENCIA. El guardián no tiene por qué aparecer en línea: no
    // habla con nadie, y una cuenta permanentemente conectada que nunca escribe
    // llama más la atención que una que no se anuncia.
    markOnlineOnConnect: false,
    syncFullHistory: false,
    browser: ['Ubuntu', 'Chrome', '120.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\nEscanea este QR con el número del guardián:\n');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') {
      espera = ESPERA_MIN;
      logger.info(`guardián en línea. Protegiendo a +${protegido()}.`);
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        logger.error('guardián: la sesión se ha cerrado desde el teléfono. Borra data/authGuardian y vuelve a vincular.');
        process.exit(1);
      }
      logger.warn(`guardián: conexión caída (${code || '?'}), reintento en ${Math.round(espera / 1000)}s`);
      setTimeout(() => { conectar().catch((e) => logger.error(`guardián: ${e.message}`)); }, espera);
      espera = Math.min(espera * 2, ESPERA_MAX);
    }
  });

  sock.ev.on('group-participants.update', ({ id, participants, action, author }) => {
    alDegradar(id, participants, action, author)
      .catch((e) => logger.error(`guardián: ${e.message}`));
  });
}

if (require.main === module) {
  console.log(`\n  Guardián de Daddy's Bot — solo repone el admin, nada más\n`);
  conectar().catch((err) => { console.error('guardián: error fatal:', err); process.exit(1); });
}

module.exports = { alDegradar, esElProtegido, _sock: (s) => { sock = s; }, AUTH_DIR };
