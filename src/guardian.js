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

// EL TOPE VA AQUÍ DENTRO, NO SE IMPORTA DE helpers.js, Y NO ES POR PEREZA AL
// REVÉS. helpers.js es el módulo del bot: trae el historial de frases, el
// barrido de temporales y un gancho de salida que escribe en `data/`. Nada de
// eso hace falta aquí, y traerlo por ocho líneas deja al guardián con un pie
// dentro del estado del bot — dos procesos escribiendo los mismos ficheros es
// exactamente lo que no puede pasar.
//
// Son ocho líneas. Que el guardián no dependa de nada del bot vale más.
// Se llama IGUAL que la de helpers.js a proposito: es el mismo concepto y la
// guarda que exige un tope en toda llamada a WhatsApp (check 32a) busca ese
// nombre. Un sinonimo aqui dejaria al guardian fuera de esa comprobacion.
function withTimeout(promesa, ms) {
  let t;
  return Promise.race([
    promesa.finally(() => clearTimeout(t)),
    new Promise((_, rechaza) => { t = setTimeout(() => rechaza(new Error('timeout')), ms); t?.unref?.(); }),
  ]);
}

const AUTH_DIR = path.join(__dirname, '../data/authGuardian');
// ─── A QUIÉN PROTEGE ────────────────────────────────────────────────────────
//
// NO HACE FALTA ESCRIBIRLO EN NINGÚN SITIO. El bot anota su propio número al
// conectarse, y el guardián lo lee de ahí. Pedirle a una persona que teclee
// dieciséis dígitos en un .env es pedir el fallo: un dígito mal y el guardián
// mira la degradación sin reconocer al bot —el día que hacía falta, y sin dar
// un solo error, porque para él simplemente degradaron a otro.
//
// GUARDIAN_DE sigue existiendo y MANDA por encima del fichero, para el caso en
// que el guardián corra en otra máquina y no tenga el `data/` del bot delante.
//
// SE LEE CADA VEZ, no se fija al cargar. Fijarlo haría que dependiera del orden
// en que arrancan los dos procesos: un guardián levantado antes de que el bot
// llegue a conectarse se quedaría con la cadena vacía para siempre. Así, en
// cuanto el bot conecta, el guardián lo sabe sin reiniciar nada.
const FICHERO_NUMERO = path.join(__dirname, '../data/numeroBot.json');
let _cache = { mtime: -1, numero: '' };

function numeroAnotado() {
  try {
    // Por mtime: el caso normal es leer una vez y no volver a tocar el disco.
    // Se vuelve a leer solo si el fichero cambió, o sea si el bot se vinculó a
    // otro número — que es justo cuando esto tiene que enterarse.
    const m = fs.statSync(FICHERO_NUMERO).mtimeMs;
    if (m !== _cache.mtime) {
      const d = JSON.parse(fs.readFileSync(FICHERO_NUMERO, 'utf8'));
      _cache = { mtime: m, numero: String(d?.numero || '').replace(/\D/g, '') };
    }
    return _cache.numero;
  } catch {
    return '';   // aún no ha conectado nunca, u otra máquina
  }
}

const protegido = () => String(process.env.GUARDIAN_DE || '').replace(/\D/g, '') || numeroAnotado();

// SU PROPIO número: el de la cuenta que va a ser el guardián. Es el mismo
// GUARDIAN que ya lleva el .env para que el bot sepa a quién reponer, así que no
// hay una segunda variable que mantener igual a mano.
const miNumero = () => String(process.env.GUARDIAN || '').replace(/\D/g, '');

// Cuántos códigos se piden antes de parar. Encadenar peticiones de vinculación
// es de las cosas que agravan una restricción de cuenta, y una cuenta guardiana
// vetada no guarda nada. Si tres códigos no se han usado, el problema no es el
// código: es que nadie está delante del móvil.
const MAX_CODIGOS = 3;
let codigosPedidos = 0;

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
// COMPARAR DOS NÚMEROS NO ES COMPARAR DOS CADENAS, y el caso que lo obliga es
// argentino: WhatsApp mete un 9 de móvil detrás del 54 en unas formas del JID y
// no en otras, y la diferencia está EN MEDIO, así que ni la igualdad ni un
// sufijo la salvan. Un número argentino configurado con el 9 no coincidiría con
// el mismo número sin él, y el guardián se quedaría mirando el día del golpe.
//
// El bot ya tiene esto resuelto en utils/wa.js, pero ese módulo arrastra estado
// y ficheros del bot. Aquí van las cuatro líneas propias: quitar el 9 y aceptar
// el sufijo a partir de diez dígitos, que es el mismo criterio y el mismo
// mínimo (por debajo, un número corto mal puesto coincidiría con cualquiera).
const digitos = (x) => String(x || '').split('@')[0].split(':')[0].replace(/\D/g, '');
const sinNueveAr = (d) => (/^549\d{8,}$/.test(d) ? '54' + d.slice(3) : d);
function mismoNumero(a, b) {
  if (!a || !b) return false;
  for (const [x, y] of [[a, b], [sinNueveAr(a), sinNueveAr(b)]]) {
    if (x === y) return true;
    const corto = x.length <= y.length ? x : y;
    const largo = x.length <= y.length ? y : x;
    if (corto.length >= 10 && largo.endsWith(corto)) return true;
  }
  return false;
}

function esElProtegido(jid, meta) {
  const PROTEGIDO = protegido();
  if (!jid || !PROTEGIDO) return false;
  if (mismoNumero(digitos(jid), PROTEGIDO)) return true;
  // Si llegó un @lid, se busca su teléfono en la lista de miembros.
  for (const p of (meta?.participants || [])) {
    const formas = [p?.id, p?.lid, p?.phoneNumber].filter(Boolean).map(digitos);
    if (formas.includes(digitos(jid))) return formas.some((f) => mismoNumero(f, PROTEGIDO));
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
  if (!protegido()) {
    // Callarse aquí sería lo peor: es el único momento en que este proceso
    // tenía que servir para algo.
    logger.error(`guardián: han degradado a alguien en ${groupJid} y no sé a quién protejo. Revisa data/numeroBot.json o pon GUARDIAN_DE.`);
    return false;
  }

  // Si lo hizo el propio guardián, no hay nada que deshacer.
  const mios = [sock?.user?.id, sock?.user?.lid].filter(Boolean).map(digitos);
  if (author && mios.some((m) => mismoNumero(m, digitos(author)))) return false;

  let meta = null;
  try { meta = await withTimeout(sock.groupMetadata(groupJid), TOPE_RED); } catch {}

  const caidos = (participants || []).filter((j) => esElProtegido(j, meta));
  if (!caidos.length) return false;

  logger.warn(`guardián: le han quitado el admin al bot en ${groupJid}. Reponiendo.`);
  return reponer(groupJid, caidos);
}

// Aparte y exportada: es un borrado de credenciales, o sea lo que mas cuesta si
// se equivoca de condicion, y solo ocurre en un arranque tras una vinculacion a
// medias. Sin poder probarla, la unica forma de saber si acierta seria dejar una
// vinculacion a medias a proposito y ver que pasa.
async function limpiarCredencialesAMedias() {
  const previo = await useMultiFileAuthState(AUTH_DIR);
  const c = previo.state?.creds;
  if (!c?.me || c.account) return false;
  await fs.remove(AUTH_DIR);
  await fs.ensureDir(AUTH_DIR);
  logger.warn('guardián: había credenciales a medias (una vinculación sin terminar). Empiezo de cero.');
  return true;
}

async function conectar() {
  // NO SE MUERE SI TODAVÍA NO HAY NÚMERO, y antes sí: en un arranque en frío los
  // dos procesos suben a la vez, el bot tarda unos segundos en conectar y el
  // guardián se moría antes de que el número existiera. Con el reinicio
  // automático de pm2 eso era un bucle de diez intentos y a la basura.
  //
  // Se avisa y se sigue: el número se lee en cada evento, así que en cuanto el
  // bot conecte, el guardián ya sabe a quién protege sin tocar nada.
  if (!protegido()) {
    logger.warn('guardián: todavía no sé a quién protejo (el bot no ha conectado aún). Sigo esperando; lo sabré en cuanto conecte.');
  }

  await fs.ensureDir(AUTH_DIR);

  // CREDENCIALES A MEDIAS: SE MIRA `account`, NO `registered`.
  //
  // Es la misma trampa que ya costó cinco intentos en el bot, y aquí habría
  // costado otros cinco. Pedir un código de vinculación deja escrito `creds.me`
  // ANTES de que nadie lo teclee. Si la vinculación no se completa —el código
  // caduca, se teclea tarde, se cae la conexión— el arranque siguiente encuentra
  // ese `me`, intenta INICIAR SESIÓN con unas credenciales que nunca llegaron a
  // registrarse, y WhatsApp contesta 401. A partir de ahí da igual lo rápido que
  // se teclee: todos los intentos salen 401 hasta que alguien borra la carpeta a
  // mano.
  //
  // Lo que distingue una sesión de verdad de ese muñón es `account`, que solo se
  // escribe cuando la vinculación se completó. `registered` NO vale: el QR no lo
  // pone nunca, así que mirarlo borraría una sesión buena en cada arranque.
  await limpiarCredencialesAMedias();

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

  // ─── VINCULACIÓN POR CÓDIGO ─────────────────────────────────────────────
  //
  // Sin QR y sin cámara. El guardián ya sabe su propio número —es el GUARDIAN
  // del .env— así que pide el código él solo la primera vez y lo saca por
  // pantalla. Ocho caracteres que se le pasan al co-owner por donde sea, y este
  // los teclea en:
  //
  //   WhatsApp → Dispositivos vinculados → Vincular un dispositivo
  //   → "Vincular con el número de teléfono"
  //
  // El QR sigue saliendo si no hay número puesto, como respaldo.
  const porCodigo = Boolean(miNumero()) && !state.creds?.registered;
  if (porCodigo) {
    if (codigosPedidos >= MAX_CODIGOS) {
      logger.error(`guardián: van ${codigosPedidos} códigos y ninguno se ha usado. Paro: encadenar peticiones es lo que agrava una restricción de cuenta.`);
      logger.error('guardián: ten el móvil ABIERTO en "Vincular con el número de teléfono" ANTES de arrancarlo.');
      try { sock.ev.removeAllListeners(); } catch {}
      try { sock.end(); } catch {}
      return;
    }
    codigosPedidos++;
    // El socket se guarda en una local: si la conexión se cae en estos tres
    // segundos, `sock` ya apunta a otro (o a nada) y esto reventaría.
    const miSock = sock;
    setTimeout(async () => {
      try {
        if (miSock !== sock) return;
        const codigo = await miSock.requestPairingCode(miNumero());
        const bonito = String(codigo).match(/.{1,4}/g)?.join('-') || codigo;
        console.log(`\n  CÓDIGO DE VINCULACIÓN DEL GUARDIÁN: ${bonito}\n`);
        console.log(`  En el móvil de +${miNumero()}:`);
        console.log('  WhatsApp → Dispositivos vinculados → Vincular un dispositivo');
        console.log('  → "Vincular con el número de teléfono" → teclea el código.');
        console.log('  Caduca en un par de minutos.\n');
      } catch (e) {
        logger.error(`guardián: no pude pedir el código (${e.message}). Comprueba que GUARDIAN lleva prefijo de país y solo dígitos.`);
      }
    }, 3000).unref?.();
  }

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr && !porCodigo) {
      console.log('\nEscanea este QR con el número del guardián:\n');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') {
      espera = ESPERA_MIN;
      const aQuien = protegido();
      logger.info(aQuien
        ? `guardián en línea. Protegiendo a +${aQuien}.`
        : 'guardián en línea, pero aún no sé a quién protejo: esperando a que el bot conecte.');
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

module.exports = { alDegradar, esElProtegido, mismoNumero, limpiarCredencialesAMedias, _sock: (s) => { sock = s; }, AUTH_DIR };
