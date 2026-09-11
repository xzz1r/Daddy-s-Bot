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
// ─── SE PUEDE CORRER SUELTO, FUERA DE ESTE REPOSITORIO ──────────────────────
//
// Este fichero no necesita NADA del bot. Ni un módulo, ni una carpeta, ni el
// resto del repositorio: basta con copiarlo a un directorio vacío e instalar
// una sola dependencia.
//
//   npm init -y
//   npm install @whiskeysockets/baileys --omit=optional
//   GUARDIAN=<su número> GUARDIAN_DE=<el del bot> node guardian.js
//
// Eso son 31 MB de dependencias contra los 125 MB del bot, y ninguna copia de
// su código. Importa porque el guardián está pensado para correr en la máquina
// de OTRA persona —la dueña de esa cuenta de WhatsApp, que así no cede su
// sesión a nadie— y pedirle que se clone el bot entero para usar 369 líneas no
// tiene ningún sentido.
//
// Todo lo que sigue está escrito con esa condición: lo poco que hacía falta de
// utils/ va copiado aquí abajo, cortado a lo mínimo, y las tres dependencias
// que no son imprescindibles se cargan sólo si están.
'use strict';

const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  DisconnectReason,
} = require('@whiskeysockets/baileys');

// OPCIONALES, LAS TRES. Están en el repositorio del bot y no tienen por qué
// estar fuera. Ninguna hace falta para lo que este proceso hace.
const opcional = (m) => { try { return require(m); } catch { return null; } };

// dotenv: sin él se leen las variables del entorno a secas, o de un .env al
// lado con un lector de cuatro líneas. No merece una dependencia.
const dotenv = opcional('dotenv');
if (dotenv) dotenv.config();
else {
  try {
    for (const l of fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8').split('\n')) {
      const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  } catch { /* sin .env: se usan las variables del entorno */ }
}

// pino: viene dentro de Baileys, así que en la práctica siempre está. Si algún
// día deja de venir, un objeto mudo hace el mismo papel: a Baileys se le pasa
// el logger en silencio de todas formas.
const pino = opcional('pino');
const mudo = () => { const l = { level: 'silent', child: () => mudo() }; for (const n of ['trace', 'debug', 'info', 'warn', 'error', 'fatal']) l[n] = () => {}; return l; };
const silencioso = () => (pino ? pino({ level: 'silent' }) : mudo());

// qrcode-terminal: sólo para el QR de respaldo. La vinculación normal es por
// código y no lo necesita.
const qrcode = opcional('qrcode-terminal');

// EL LOG, CORTADO A LO MÍNIMO. El del bot pinta con colores y trae niveles que
// aquí no se usan; esto es la misma forma de línea sin la dependencia.
const hora = () => new Date().toLocaleTimeString('es-AR', { hour12: false });
const logger = {
  info: (m) => console.log(`[${hora()}] [INFO] ${m}`),
  warn: (m) => console.log(`[${hora()}] [WARN] ${m}`),
  error: (m) => console.error(`[${hora()}] [ERROR] ${m}`),
};

// CALLAR A libsignal. Imprime con console.info directamente —el logger
// silencioso de Baileys no le afecta— y no vuelca una línea: vuelca el objeto
// de sesión entero, treinta líneas por cada sesión que cierra. En una máquina
// pequeña eso es escribir megas de log por nada. Se filtran SOLO sus mensajes
// conocidos, por su texto: un silenciador general de console.info se llevaría
// por delante avisos que sí importan.
{
  const RUIDO = [/^Closing session:/, /^Removing old closed session:/,
    /^Closing open session in favor of incoming prekey bundle/, /^Session error:/,
    /^Failed to decrypt message with any known session/];
  for (const nivel of ['info', 'warn', 'log']) {
    const original = console[nivel].bind(console);
    console[nivel] = (...args) => {
      if (typeof args[0] === 'string' && RUIDO.some((r) => r.test(args[0]))) return;
      original(...args);
    };
  }
}

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

// ─── POR QUÉ SE MUERE ───────────────────────────────────────────────────────
//
// El contador de pm2 dice CUÁNTAS veces se ha reiniciado y no dice ni una
// palabra de por qué. Con el techo de RAM apretado eso ya costó caro: pm2 lo
// mataba y lo levantaba, y en el log no quedaba nada, porque un proceso al que
// matan por memoria no escribe ningún error — se lee exactamente igual que un
// reinicio limpio.
//
// Así que el proceso deja escrito él mismo cuándo nace y cómo muere. Son cuatro
// finales posibles y se distinguen entre sí:
//
//   · SIGTERM con la RAM cerca del techo   → lo mató pm2 por memoria
//   · SIGTERM con la RAM baja              → un despliegue o un `pm2 restart`
//   · excepción sin capturar               → un fallo de verdad, con su línea
//   · la sesión cerrada desde el teléfono  → hay que volver a vincular
//
// Sin dependencias y con todo el fallo tragado: esto es un cuaderno, y un
// cuaderno que tira el proceso al que apunta no vale nada.
// EX_CONFIG de sysexits: la configuracion esta mal y no se arregla sola. Va
// emparejado con `stop_exit_codes: [78]` en ecosystem.config.js.
const SALIDA_SESION_MUERTA = 78;

const VIDAS = path.join(__dirname, '../data/guardianVidas.json');
const VIDAS_QUE_CABEN = 20;

function apuntarVida(que, detalle) {
  try {
    let v = [];
    try { v = JSON.parse(fs.readFileSync(VIDAS, 'utf8')); } catch { /* aún no hay */ }
    if (!Array.isArray(v)) v = [];
    v.push({ ts: Date.now(), que, detalle: detalle || '', rss: Math.round(process.memoryUsage.rss() / 1048576) });
    fs.writeFileSync(VIDAS, JSON.stringify(v.slice(-VIDAS_QUE_CABEN)));
  } catch { /* si no se puede escribir, el guardián sigue siendo lo primero */ }
}

// SÍNCRONO Y AL FINAL, a propósito: cuando llega SIGTERM quedan milisegundos, y
// un `writeFile` asíncrono no llega a terminar. Es la única escritura del
// proceso y pesa menos de 2 KB.
// Y SI PM2 NO ENTIENDE `stop_exit_codes`, QUE NO INSISTA CADA VEINTE SEGUNDOS.
//
// El de arriba es el arreglo bueno, pero depende de una opcion que las versiones
// viejas de pm2 ignoran, y entonces el bucle vuelve. Esto es el cinturon: si la
// vida anterior murio por la sesion cerrada hace menos de diez minutos, se
// espera cinco antes de volver a intentarlo. No arregla nada —no hay nada que
// arreglar desde aqui— pero convierte tres intentos por minuto en uno cada
// cinco, que es la diferencia entre un log ilegible y una linea cada rato.
function esperaAntesDeInsistir() {
  // SALVO QUE ALGUIEN ESTE ESPERANDO DELANTE. La espera existe para que un
  // proceso que no puede arreglarse solo no renazca cada cinco segundos; pero si
  // acaban de armar la vinculacion es que hay una persona con el movil abierto
  // en la pantalla de vincular, y el codigo caduca en un par de minutos. Hacerle
  // esperar cinco es garantizar que llegue tarde.
  if (vinculacionArmada()) return 0;
  try {
    const v = JSON.parse(fs.readFileSync(VIDAS, 'utf8'));
    const finales = Array.isArray(v) ? v.filter((x) => x.que !== 'arranca') : [];
    const ultimo = finales[finales.length - 1];
    // LAS DOS FORMAS DE «esto no se arregla reintentando»: la sesion cerrada y
    // el estar esperando a que alguien pida vincular. La primera version solo
    // miraba la sesion cerrada, asi que con la puerta de vinculacion puesta el
    // proceso volvia a arrancar cada cinco segundos: no mandaba codigos —para
    // eso esta la puerta— pero se pasaba el dia naciendo y muriendo.
    if (!ultimo || !/sesión cerrada|esperando a que alguien pida vincular/.test(ultimo.que)) return 0;
    if (Date.now() - ultimo.ts > 10 * 60 * 1000) return 0;
    return 5 * 60 * 1000;
  } catch { return 0; }
}

if (require.main === module) {
  apuntarVida('arranca');
  process.on('uncaughtException', (e) => {
    apuntarVida('excepción sin capturar', `${e && e.message} · ${String((e && e.stack) || '').split('\n')[1] || ''}`.trim());
    console.error('guardián: excepción sin capturar:', e);
    process.exit(1);
  });
  process.on('unhandledRejection', (e) => {
    apuntarVida('promesa rechazada sin capturar', (e && e.message) || String(e));
    console.error('guardián: promesa rechazada sin capturar:', e);
    process.exit(1);
  });
  for (const señal of ['SIGTERM', 'SIGINT']) {
    process.on(señal, () => { apuntarVida(señal, 'de fuera: despliegue, pm2 restart, o el tope de RAM'); process.exit(0); });
  }
}

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

// ─── LOS GRUPOS DONDE EL BOT ES ADMIN ───────────────────────────────────────
//
// El guardián solo sirve si está conectado en el momento del golpe, y eso no se
// puede garantizar: se reinicia, se le cae la red, se despliega. En esa ventana
// pueden quitarle el admin al bot y el evento no lo ve nadie — no vuelve más
// tarde, se pierde.
//
// Así que al conectar REPASA en vez de esperar: mira los grupos y, si en alguno
// el bot ya no es admin, se lo devuelve. Es el mismo trabajo, aplicado al estado
// en vez de al aviso.
//
// PERO SOLO DONDE LO VIO SIENDO ADMIN ANTES, y esto es lo que lo hace seguro. Sin
// esa condición, el primer repaso ascendería al bot en TODOS los grupos
// compartidos, incluidos aquellos donde el dueño decidió a propósito no dárselo.
// Un guardián que reparte admin por su cuenta es peor que no tenerlo.
//
// Se aprende solo: cada repaso apunta dónde lo ve admin. El primero no hace
// nada, que es la dirección segura.
const FICHERO_VISTOS = path.join(__dirname, '../data/guardianVistos.json');

function leerVistos() {
  try { return JSON.parse(fs.readFileSync(FICHERO_VISTOS, 'utf8')) || {}; }
  catch { return {}; }
}

function guardarVistos(v) {
  try {
    fs.mkdirSync(path.dirname(FICHERO_VISTOS), { recursive: true });
    const tmp = `${FICHERO_VISTOS}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(v));
    fs.renameSync(tmp, FICHERO_VISTOS);
  } catch (e) { logger.warn(`guardián: no pude guardar la lista de grupos: ${e.message}`); }
}
let _cache = { mtime: -1, numero: '', lid: '' };

function anotado() {
  try {
    // Por mtime: el caso normal es leer una vez y no volver a tocar el disco.
    // Se vuelve a leer solo si el fichero cambió, o sea si el bot se vinculó a
    // otro número — que es justo cuando esto tiene que enterarse.
    const m = fs.statSync(FICHERO_NUMERO).mtimeMs;
    if (m !== _cache.mtime) {
      const d = JSON.parse(fs.readFileSync(FICHERO_NUMERO, 'utf8'));
      _cache = {
        mtime: m,
        numero: String(d?.numero || '').replace(/\D/g, ''),
        lid: String(d?.lid || '').replace(/\D/g, ''),
      };
    }
    return _cache;
  } catch {
    return { numero: '', lid: '' };   // aún no ha conectado nunca, u otra máquina
  }
}

const numeroAnotado = () => anotado().numero;

// EL @lid DEL BOT, QUE ES LO QUE DE VERDAD LLEGA. En un grupo LID —o sea, en
// todos los de ahora— la degradación del bot llega identificada solo por su
// @lid, sin teléfono al lado. Sin esto, el guardián veía la degradación, no
// reconocía a nadie y se quedaba quieto: pasó dos veces en producción.
//
// Va aparte del número porque un @lid NO es un teléfono: no se le puede quitar
// el 9 argentino ni comparar por sufijo. Se compara entero o no se compara.
const lidProtegido = () => String(process.env.GUARDIAN_LID || '').replace(/\D/g, '') || anotado().lid;

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

// ─── VINCULAR SE PIDE A MANO, Y ESTO NO ES BUROCRACIA ───────────────────────
//
// Paso de verdad: la sesión del guardián se cerró desde el teléfono, pm2 lo
// reiniciaba en bucle, y cada arranque pedía código de vinculación otra vez. Al
// co-owner le llegaron los códigos en ráfaga al móvil, sin haber pedido
// ninguno. El tope de tres códigos existía, pero es POR PROCESO: cada reinicio
// lo ponía a cero, así que no topaba nada.
//
// Así que ahora pedir un código es un acto DELIBERADO de una persona que tiene
// el móvil delante:
//
//   1. se crea el fichero  data/vincularGuardian
//   2. se arranca el guardián
//   3. pide UN código y BORRA el fichero
//
// Sin fichero no se pide nada: se dice qué falta y el proceso sale con 78, o
// sea que pm2 lo deja parado en vez de volver a intentarlo. Un bucle ya no
// puede spamear a nadie, porque el bucle no crea ficheros.
const ARMADO = path.join(__dirname, '../data/vincularGuardian');
const vinculacionArmada = () => { try { return fs.existsSync(ARMADO); } catch { return false; } };
const desarmarVinculacion = () => { try { fs.rmSync(ARMADO, { force: true }); } catch { /* da igual */ } };

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

// LOS PARTICIPANTES LLEGAN COMO OBJETOS, NO COMO CADENAS, y aquí estuvo el
// fallo que dejó al guardián mirando dos degradaciones sin mover un dedo.
//
// Baileys entrega { id, phoneNumber, lid, username, admin } en cada cambio de
// participantes (Utils/process-message.js: `messageStubParameters.map(JSON.parse)`).
// Tratando eso como un JID, `String(objeto)` da "[object Object]", no hay un
// dígito que sacar, no coincide con nadie y la función devuelve `false` sin
// hacer ruido. Que es exactamente lo que se vio: el bot degradado, el guardián
// conectado, y nada.
//
// El bot ya normalizaba esto en bot.js con su comentario y todo. El guardián
// no. Escribí su prueba pasándole cadenas —inventé la forma del evento en vez
// de sacarla de Baileys— así que la prueba pasaba en verde sobre algo que en
// producción no ocurre nunca.
//
// Y el objeto trae REGALO: `phoneNumber` y `lid` juntos. O sea que en un grupo
// LID ya no hace falta la ficha del grupo para saber de quién es ese @lid: viene
// en el propio evento.
function formasDe(p) {
  if (!p) return [];
  if (typeof p === 'string') return [p];
  return [p.id, p.phoneNumber, p.lid].filter(Boolean);
}

const idDe = (p) => (typeof p === 'string' ? p : p?.id);

// Vive aparte para poder ejecutarlo en las pruebas: un filtro que decide si el
// unico evento que importa llega o no, no puede comprobarse leyendo una linea.
function filtroJid(jid) {
  const j = String(jid || '');
  return j.endsWith('@s.whatsapp.net') || j.endsWith('@lid')
    || j === 'status@broadcast' || j.endsWith('@broadcast') || j.endsWith('@newsletter');
}

function esElProtegido(p, meta) {
  const PROTEGIDO = protegido();
  const LID = lidProtegido();
  if (!p || (!PROTEGIDO && !LID)) return false;

  const formas = formasDe(p).map(digitos);
  // El @lid primero: es la forma en la que llega de verdad. Igualdad exacta,
  // sin los apaños de teléfono.
  if (LID && formas.includes(LID)) return true;
  if (PROTEGIDO && formas.some((f) => mismoNumero(f, PROTEGIDO))) return true;

  // Y si el evento solo trajo un @lid a secas, se busca su teléfono en la ficha
  // del grupo. Es el camino de respaldo: con los objetos de arriba casi nunca
  // hace falta, pero un @lid sin pareja seguiría sin resolverse.
  for (const q of (meta?.participants || [])) {
    const suyas = [q?.id, q?.lid, q?.phoneNumber].filter(Boolean).map(digitos);
    if (suyas.some((x) => formas.includes(x))) {
      return suyas.some((f) => mismoNumero(f, PROTEGIDO));
    }
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
  if (!protegido() && !lidProtegido()) {
    // Callarse aquí sería lo peor: es el único momento en que este proceso
    // tenía que servir para algo.
    logger.error(`guardián: han degradado a alguien en ${groupJid} y no sé a quién protejo. Revisa data/numeroBot.json o pon GUARDIAN_DE.`);
    return false;
  }

  // Si lo hizo el propio guardián, no hay nada que deshacer.
  const mios = [sock?.user?.id, sock?.user?.lid].filter(Boolean).map(digitos);
  if (author && mios.some((m) => mismoNumero(m, digitos(author)))) return false;

  let meta = null;
  try { meta = await withTimeout(sock.groupMetadata(groupJid), TOPE_RED); }
  catch (e) { logger.unaVez('guardian: ficha del grupo', e); }

  const caidos = (participants || []).filter((p) => esElProtegido(p, meta));
  if (!caidos.length) {
    // NO SE SALE EN SILENCIO. Este era el agujero: si la comparación fallaba
    // —y falló— no quedaba ni una línea en el log, así que desde fuera el
    // guardián parecía dormido y por dentro estaba trabajando y sin acertar.
    // Con esto, el próximo fallo se lee en `pm2 logs guardian` y ya dice qué
    // llegó y contra qué se comparó.
    logger.warn(`guardián: degradación en ${groupJid} y ninguno era el bot. `
      + `Llegó: ${JSON.stringify((participants || []).map(formasDe))}. Protejo a: ${protegido() || '(sin numero)'} / lid ${lidProtegido() || '(sin lid)'}`);
    return false;
  }

  logger.warn(`guardián: le han quitado el admin al bot en ${groupJid}. Reponiendo.`);
  // Se apunta el grupo: si el bot estaba admin aquí, el repaso de la próxima
  // reconexión tiene derecho a reponerlo sin preguntar.
  const vistos = leerVistos();
  if (!vistos[groupJid]) { vistos[groupJid] = Date.now(); guardarVistos(vistos); }
  return reponer(groupJid, caidos.map(idDe).filter(Boolean));
}

// Aparte y exportada: es un borrado de credenciales, o sea lo que mas cuesta si
// se equivoca de condicion, y solo ocurre en un arranque tras una vinculacion a
// medias. Sin poder probarla, la unica forma de saber si acierta seria dejar una
// vinculacion a medias a proposito y ver que pasa.
async function limpiarCredencialesAMedias() {
  const previo = await useMultiFileAuthState(AUTH_DIR);
  const c = previo.state?.creds;
  if (!c?.me || c.account) return false;
  await fsp.rm(AUTH_DIR, { recursive: true, force: true });
  await fsp.mkdir(AUTH_DIR, { recursive: true });
  logger.warn('guardián: había credenciales a medias (una vinculación sin terminar). Empiezo de cero.');
  return true;
}

// El repaso al conectar. Devuelve cuantos ha repuesto, para poder probarlo.
async function repasarGrupos() {
  if (!protegido() && !lidProtegido()) return 0;
  let grupos;
  try { grupos = await withTimeout(sock.groupFetchAllParticipating(), TOPE_RED); }
  catch (e) { logger.warn(`guardián: no pude repasar los grupos: ${e.message}`); return 0; }

  const vistos = leerVistos();
  let repuestos = 0;
  let cambio = false;

  for (const [gJid, meta] of Object.entries(grupos || {})) {
    const bot = (meta?.participants || []).find((p) => esElProtegido(p, meta));
    if (!bot) continue;

    const esAdmin = bot.admin === 'admin' || bot.admin === 'superadmin';
    if (esAdmin) {
      if (!vistos[gJid]) { vistos[gJid] = Date.now(); cambio = true; }
      continue;
    }
    // No es admin. Solo se repone donde ya se le vio siéndolo.
    if (!vistos[gJid]) continue;

    logger.warn(`guardián: al reconectar, el bot ya no era admin en ${gJid}. Reponiendo.`);
    if (await reponer(gJid, [bot.id])) repuestos++;
  }

  if (cambio) guardarVistos(vistos);
  if (repuestos) logger.warn(`guardián: repuestos ${repuestos} admin(es) que se perdieron mientras no estaba`);
  return repuestos;
}

// Reconexion programada UNA sola vez. Sin este candado, dos 'close' seguidos
// —que los hay: WhatsApp cierra y el socket avisa mas de una vez— programaban
// dos reconexiones, y a los pocos segundos habia DOS sesiones con las mismas
// credenciales echandose la una a la otra en bucle. El bot ya tropezo con esto y
// lleva su propia defensa; aqui no habia ninguna.
let reconexionPendiente = null;

function programarReconexion(ms) {
  if (reconexionPendiente) return;
  reconexionPendiente = setTimeout(() => {
    reconexionPendiente = null;
    conectar().catch((e) => logger.error(`guardián: ${e.message}`));
  }, ms);
  reconexionPendiente.unref?.();
}

async function conectar() {
  // Y LA OTRA MITAD DEL CANDADO: si ya habia un socket, se cierra antes de abrir
  // el siguiente. El temporizador de arriba impide dos reconexiones a la vez,
  // pero conectar() tambien se llama al arrancar, y un arranque que coincida con
  // una reconexion deja las dos sesiones vivas igual.
  if (sock) {
    logger.warn('guardián: ya había una conexión abierta, la cierro antes de abrir la nueva');
    try { sock.ev.removeAllListeners(); } catch {}
    try { sock.end(); } catch {}
    sock = null;
  }

  // NO SE MUERE SI TODAVÍA NO HAY NÚMERO, y antes sí: en un arranque en frío los
  // dos procesos suben a la vez, el bot tarda unos segundos en conectar y el
  // guardián se moría antes de que el número existiera. Con el reinicio
  // automático de pm2 eso era un bucle de diez intentos y a la basura.
  //
  // Se avisa y se sigue: el número se lee en cada evento, así que en cuanto el
  // bot conecte, el guardián ya sabe a quién protege sin tocar nada.
  if (!protegido() && !lidProtegido()) {
    logger.warn('guardián: todavía no sé a quién protejo (el bot no ha conectado aún). Sigo esperando; lo sabré en cuanto conecte.');
  }

  await fsp.mkdir(AUTH_DIR, { recursive: true });

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
  try { ({ version } = await fetchLatestBaileysVersion()); }
  catch (e) { logger.unaVez('guardian: version de baileys', e); }

  sock = makeWASocket({
    version,
    logger: silencioso(),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, silencioso()),
    },
    printQRInTerminal: false,
    // NI VISTO NI PRESENCIA. El guardián no tiene por qué aparecer en línea: no
    // habla con nadie, y una cuenta permanentemente conectada que nunca escribe
    // llama más la atención que una que no se anuncia.
    markOnlineOnConnect: false,
    syncFullHistory: false,
    browser: ['Ubuntu', 'Chrome', '120.0.0'],

    // ─── TODO LO QUE NO ES UN GRUPO, NI SE MIRA ──────────────────────────
    //
    // Esto es lo que hace que el guardián no pese. Un dispositivo vinculado
    // recibe TODO lo de la cuenta: los privados, los estados que sube medio
    // mundo, las novedades. Baileys los descifra uno a uno —CPU, memoria, y una
    // sesión de cifrado guardada en disco por cada interlocutor nuevo—, y aquí
    // no se usa ni uno solo: este proceso solo mira quién sube y quién baja de
    // admin, que llega como aviso de grupo.
    //
    // Con esto, WhatsApp los sigue mandando pero se descartan ANTES de
    // descifrarlos, con su acuse y sin tocar el almacén de claves.
    //
    // LOS GRUPOS NO SE PUEDEN IGNORAR, y hay que saber por qué: el filtro
    // trabaja por interlocutor y no por tipo de aviso, así que ignorar un grupo
    // se llevaría por delante justo el evento que este proceso existe para ver.
    // SE DESCARTA LO QUE SE SABE QUE SOBRA, NO "TODO LO QUE NO SEA UN GRUPO".
    //
    // Estaba al reves —ignorar todo lo que no fuera @g.us— y esa forma tiene un
    // fallo que no se ve: si un aviso de grupo llega con un remitente de una
    // forma que no esperabamos, se descarta ENTERO y en silencio. O sea que la
    // optimizacion podia estar comiendose justo el evento por el que existe este
    // proceso. Con la lista al derecho, lo raro pasa: como mucho cuesta un
    // descifrado de mas, y eso es infinitamente mas barato que un guardian mudo.
    shouldIgnoreJid: filtroJid,

    // Y el historial tampoco. Al vincular, WhatsApp empuja lo reciente de la
    // cuenta; procesarlo es trabajo y memoria para armar unos chats que nadie va
    // a leer. Ni se abre.
    shouldSyncHistoryMessage: () => false,

    // Ni los ecos de lo que hace este mismo proceso: el único que hace es
    // ascender al bot, y ya sabe que lo ha hecho.
    emitOwnEvents: false,
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
  const hayQueVincular = !state.creds?.registered;

  // NADIE PIDE UN CODIGO QUE NADIE ESPERA. Si hace falta vincular pero no se ha
  // armado, se dice y se para: pm2 lo deja quieto (stop_exit_codes) y el movil
  // del co-owner no recibe nada.
  if (hayQueVincular && !vinculacionArmada()) {
    logger.error('guardián: hay que vincular, pero nadie lo ha pedido. NO voy a mandar ningún código.');
    logger.error('guardián: cuando tengas el móvil abierto en «Vincular con el número de teléfono»:');
    logger.error(`guardián:   touch ${ARMADO} && pm2 start ecosystem.config.js --only guardian`);
    apuntarVida('esperando a que alguien pida vincular', 'toca data/vincularGuardian con el móvil delante');
    try { sock.ev.removeAllListeners(); } catch {}
    try { sock.end(); } catch {}
    process.exit(SALIDA_SESION_MUERTA);
  }

  const porCodigo = Boolean(miNumero()) && hayQueVincular;
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
        // SE DESARMA EN CUANTO SALE UNO. Si nadie lo teclea, el siguiente
        // arranque no manda otro: hay que volver a pedirlo a mano. Es la
        // diferencia entre un código y una ráfaga de códigos.
        desarmarVinculacion();
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
      if (qrcode) {
        console.log('\nEscanea este QR con el número del guardián:\n');
        qrcode.generate(qr, { small: true });
      } else {
        logger.error('guardián: hay que vincular y no tengo con qué. Pon GUARDIAN=<tu número> y se vincula por código, que es lo normal.');
      }
    }
    if (connection === 'open') {
      espera = ESPERA_MIN;
      const aQuien = protegido();
      logger.info(aQuien || lidProtegido()
        ? `guardián en línea. Protegiendo a +${aQuien || '?'} (lid ${lidProtegido() || 'sin anotar'}).`
        : 'guardián en línea, pero aún no sé a quién protejo: esperando a que el bot conecte.');
      // El repaso va DESPUÉS de anunciar la conexión y sin bloquearla: si la
      // consulta de grupos tarda o falla, el guardián sigue en pie y escuchando,
      // que es su trabajo principal.
      repasarGrupos().catch((e) => logger.warn(`guardián: repaso al conectar: ${e.message}`));
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        logger.error('guardián: la sesión se ha cerrado desde el teléfono. Borra data/authGuardian y vuelve a vincular.');
        apuntarVida('sesión cerrada desde el teléfono', 'hay que volver a vincular: borra data/authGuardian');
        // SALE CON 78 Y NO CON 1, y no es cosmético: ecosystem.config.js lleva
        // `stop_exit_codes: [78]`, así que pm2 lo deja PARADO en vez de volver a
        // levantarlo. Reiniciar no arregla una sesión cerrada —hace falta borrar
        // las credenciales y volver a vincular, a mano— así que el bucle solo
        // quemaba CPU y log: mil doscientos reinicios en siete horas, tres por
        // minuto, en una máquina de un core.
        process.exit(SALIDA_SESION_MUERTA);
      }
      logger.warn(`guardián: conexión caída (${code || '?'}), reintento en ${Math.round(espera / 1000)}s`);
      programarReconexion(espera);
      espera = Math.min(espera * 2, ESPERA_MAX);
    }
  });

  // SE APUNTA TODO LO QUE LLEGA, no solo lo que se actua. Sin esta linea, un
  // guardian que no reacciona y un guardian al que no le llega nada se leen
  // exactamente igual en el log —vacio— y son dos problemas en sitios opuestos.
  sock.ev.on('group-participants.update', ({ id, participants, action, author }) => {
    logger.info(`guardián: evento ${action} en ${id} por ${author || '?'} sobre ${JSON.stringify((participants || []).map(formasDe))}`);
    alDegradar(id, participants, action, author)
      .catch((e) => logger.error(`guardián: ${e.message}`));
  });
}

if (require.main === module) {
  console.log(`\n  Guardián de Daddy's Bot — solo repone el admin, nada más\n`);
  const arrancar = () => conectar().catch((err) => {
    apuntarVida('no pudo ni conectar', (err && err.message) || String(err));
    console.error('guardián: error fatal:', err);
    process.exit(1);
  });
  const espera = esperaAntesDeInsistir();
  if (espera) {
    logger.error(`guardián: la sesión seguía cerrada hace un momento. Espero ${Math.round(espera / 60000)} min antes de reintentar. Esto NO se arregla solo: borra data/authGuardian y vuelve a vincular.`);
    setTimeout(arrancar, espera);
  } else arrancar();
}

module.exports = { alDegradar, esElProtegido, mismoNumero, formasDe, repasarGrupos, lidProtegido, _filtroJid: filtroJid, _VIDAS: VIDAS, _apuntarVida: apuntarVida, _ARMADO: ARMADO, _vinculacionArmada: vinculacionArmada, _desarmarVinculacion: desarmarVinculacion, _reconexion: () => reconexionPendiente, limpiarCredencialesAMedias, _sock: (s) => { sock = s; }, AUTH_DIR };
