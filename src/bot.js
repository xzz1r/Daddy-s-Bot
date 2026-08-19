const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  getBinaryNodeChild,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs-extra');
const qrcode = require('qrcode-terminal');
const { handleMessage, invalidateGroupMeta, getGroupMeta } = require('./handlers/messageHandler');
const { initState, isAdminNotifyEnabled, isAntiAdminEnabled, isAntiBusinessEnabled, flushState } = require('./utils/state');
const { isOwner, sameUser, isBotAdmin, canonicalJid, rememberMapping, flushOwnerJids, flushLidMap, anotarRestriccionContacto } = require('./utils/wa');
// anotarAlta apunta el motivo de cada alta; motivoDelAlta lo consulta cuando hay
// que decidir si un alta fue a dedo (la unica que se sanciona).
const { anotarAlta, motivoDelAlta, ALTA_ADD } = require('./utils/joinReason');
const { notarSolicitud, olvidarSolicitud, estabaPendiente, sondear, reactivarSondeo, frenoNuevo, flushJoinRequests } = require('./utils/joinRequests');
const { flushCounts } = require('./utils/messageCounter');
const { flushNames, recordName, cuantosNombres } = require('./utils/nombreStore');
const { flushPickHistory } = require('./utils/helpers');
const { flushAura } = require('./utils/auraStore');
const { flushCasino } = require('./utils/casinoStore');
const { flushRacha } = require('./utils/rachaStore');
const { flushNicks, recordFacts } = require('./utils/nickStore');
const { flushCache } = require('./utils/musicCache');
const { flush: flushPfpHashes } = require('./utils/pfpStore');
const { flush: flushPfpCache } = require('./utils/pfpCache');
const { sweepAllGroups, maybeIndex } = require('./utils/pfpIndexer');
const { flushBanlist, banAccount } = require('./utils/banlist');
const { flushLinkPerms } = require('./utils/linkPerms');
const { flushRobo } = require('./utils/roboStore');
const { guardOnJoin, allForms } = require('./commands/fk');
const { isBusiness } = require('./utils/businessCheck');
const { getMemberFacts } = require('./utils/nickStore');
const { ensureTemp, barrerHuerfanos } = require('./utils/helpers');
const { gitCommit } = require('./utils/version');
const { VF_STATIC } = require('./utils/sticker');
const logger = require('./utils/logger');
const config = require('./config');

const AUTH_DIR = path.join(__dirname, '../data/auth');

// Marca de "me he parado y no voy a reintentar solo".
//
// Cuando el bot se rinde tras varios logout seguidos NO hace exit: se queda
// quieto a propósito (ver ciclosLogout). El problema es que eso es INVISIBLE
// desde fuera — pm2 sigue enseñando el proceso como "online", el bot no puede
// avisar por WhatsApp porque justo lo que ha perdido es la sesión, y el motivo
// queda enterrado en una línea del log de hace horas. Desde el grupo se ve como
// "el bot se apagó de la nada".
//
// Este fichero lo deja por escrito para que `npm run estado` lo cante en rojo.
// Se borra solo en cuanto la conexión vuelve a abrirse.
const PARADO_FILE = path.join(__dirname, '../data/parado.json');

function anotarParada(motivo, detalle) {
  try {
    fs.outputJsonSync(PARADO_FILE, { motivo, detalle, desde: new Date().toISOString() }, { spaces: 2 });
  } catch { /* si no se puede escribir, el log sigue siendo la fuente */ }
}

function limpiarParada() {
  try { fs.removeSync(PARADO_FILE); } catch {}
}

let sock = null;
let reconnectAttempts = 0;
let consecutive401 = 0;
let botIds = null; // Set<string> of bot's bare IDs (phone + LID), populated on open
const MAX_RECONNECTS = 10;          // a partir de aqui se avisa, pero NO se deja de intentar
const ESPERA_RECONEXION_MAX = 5 * 60 * 1000;
// Cuanto tiene que aguantar una conexion para considerarla buena. Por debajo de
// esto es "flapping": abre y se cae, y reiniciar los contadores ahi es lo que
// convierte la reconexion en un bucle cerrado.
const ESTABLE_MS = 60 * 1000;
let timerEstable = null;
const MAX_401 = 3;

// Ciclos de "sesion cerrada de verdad" (3 fallos de 401 -> se borran las
// credenciales -> QR nuevo). Sin un techo aqui, un numero restringido por
// WhatsApp (login/QR bloqueado, no solo la sesion) entraba en un bucle sin
// fin: cada QR sin escanear caduca, el socket se cae, y el bot generaba OTRO
// QR dos segundos despues, solo, para siempre. Eso es exactamente el patron
// de actividad automatica que agrava una restriccion.
//
// Al superar el limite, el bot deja de reintentar por su cuenta y se queda
// quieto (sin exit): si el supervisor de procesos reinicia solo tras un exit,
// reiniciar el proceso entero solo resetearia estos contadores y volveria a
// entrar en el mismo bucle. Quieto es la unica forma de parar de verdad hasta
// que una persona compruebe la cuenta y arranque el bot a mano.
let ciclosLogout = 0;
const MAX_CICLOS_LOGOUT = 2;

// Cada cuánto se relee la lista de solicitudes pendientes de cada grupo. Es una
// consulta por grupo y el bot está en pocos, así que sale barato. Tiene que ser
// bastante más corto que SONDEO_VALIDO_MS para que la lista nunca caduque.
const INTERVALO_SOLICITUDES = 3 * 60 * 1000;
let timerSolicitudes = null;

// groupFetchAllParticipating se trae la metadata de TODOS los grupos de una
// vez. Es la consulta más cara que hace el bot y pedirla cada tres minutos es
// lo que provocaba el `rate-overlimit` que salía en el log una vez sí y otra
// no. La lista de grupos casi nunca cambia, así que se relee de tarde en tarde
// y entre medias se reutiliza la que ya se tenía.
const TTL_LISTA_GRUPOS = 30 * 60 * 1000;
const ESPERA_LISTA_MAX = 60 * 60 * 1000;
let gruposConocidos = [];
let gruposMeta = null;      // el mapa entero de la ultima consulta
let gruposTs = 0;
let gruposEsperaHasta = 0;
let gruposFallos = 0;
let gruposEnVuelo = null;   // consulta en curso, para no lanzar dos a la vez

// SE GUARDA EL MAPA ENTERO, NO SOLO LAS CLAVES. Habia dos sitios pidiendo esta
// misma consulta —aqui y pfpIndexer.sweepAllGroups()— y los dos disparaban al
// conectar, con segundos de diferencia. Es la llamada mas cara que hace el bot
// y ya habia provocado `rate-overlimit` ella sola; pedirla dos veces seguidas
// era pedirlo a gritos. Ahora sale una y el barrido de fotos reutiliza el
// resultado.
async function mapaDeGrupos() {
  const ahora = Date.now();
  if (gruposMeta && ahora - gruposTs < TTL_LISTA_GRUPOS) return gruposMeta;
  if (ahora < gruposEsperaHasta) return gruposMeta;
  // Dos llamadas simultaneas comparten la misma consulta en vuelo.
  if (gruposEnVuelo) return gruposEnVuelo;
  gruposEnVuelo = listaDeGrupos().then(() => gruposMeta).finally(() => { gruposEnVuelo = null; });
  return gruposEnVuelo;
}

async function listaDeGrupos() {
  const ahora = Date.now();
  if (gruposConocidos.length && ahora - gruposTs < TTL_LISTA_GRUPOS) return gruposConocidos;
  // Tras un rate-overlimit se espera de verdad: insistir es lo que lo mantiene.
  if (ahora < gruposEsperaHasta) return gruposConocidos;

  try {
    gruposMeta = await sock.groupFetchAllParticipating();
    gruposConocidos = Object.keys(gruposMeta || {});
    gruposTs = ahora;
    gruposFallos = 0;
    gruposEsperaHasta = 0;
  } catch (e) {
    gruposFallos++;
    const espera = Math.min(INTERVALO_SOLICITUDES * 2 ** gruposFallos, ESPERA_LISTA_MAX);
    gruposEsperaHasta = ahora + espera;
    // Una sola línea por bloqueo, no una por intento, y por info: no poder
    // listar los grupos en un ciclo no rompe nada, se reintenta solo.
    logger.info(
      `solicitudes: no pude listar grupos (${e.message}).` +
      `Reintento en ${Math.round(espera / 60000)} min` +
      (gruposConocidos.length ? `; sigo con los ${gruposConocidos.length} que ya conocía.` : '.')
    );
  }
  return gruposConocidos;
}

// Relee las solicitudes pendientes de todos los grupos del bot. Los grupos que
// no dejan leerlas se apartan solos (joinRequests aplica su propio freno), así
// que esto no insiste contra una puerta cerrada.
async function sondearSolicitudes() {
  if (!sock) return;
  for (const g of await listaDeGrupos()) {
    const n = await sondear(sock, g);
    if (n) logger.info(`solicitudes pendientes en ${g}: ${n}`);
    if (n === null) await explicarFreno(g);
  }
}

// `forbidden` sale por dos motivos muy distintos y desde joinRequests no se
// pueden distinguir: o el bot no es admin, o el grupo no tiene activada la
// aprobacion de entradas (sin ella no existe lista que leer). Con la metadata
// del grupo sí se sabe cuál de los dos es, y se dice UNA vez por bloqueo.
async function explicarFreno(grupo) {
  const freno = frenoNuevo(grupo);
  if (!freno?.prohibido) return;
  const meta = await getGroupMeta(sock, grupo).catch(() => null);
  if (!meta) return;
    logger.info(
    isBotAdmin(sock, meta)
      ? `solicitudes: en ${grupo} SI soy admin, asi que el problema es del grupo:` +
        `no tiene activada la aprobacion de entradas. Sin ella no hay solicitudes.` +
        `que leer, y el anti-admin no puede distinguir una aprobacion de un alta a dedo.`
      : `solicitudes: en ${grupo} NO soy admin, por eso no puedo leer las solicitudes.` +
        `Dame admin y vuelvo a intentarlo solo.`
  );
}

// UNA reconexión en vuelo como máximo. Este candado es lo que impide que el
// bot se clone a sí mismo.
//
// Sin él, cada llamada creaba su propio setTimeout sin cancelar el anterior. Y
// a esta función se la llama desde varias ramas del mismo manejador, que es
// async: dos eventos `close` seguidos —o un `close` mientras ya había una
// reconexión programada— dejaban DOS temporizadores vivos, y cada uno abría su
// propio socket con las MISMAS credenciales.
//
// Dos sockets de la misma sesión se echan el uno al otro: WhatsApp cierra el
// viejo cuando entra el nuevo. Ese cierre programa otra reconexión, que abre
// otro socket, que echa al anterior... y el número de sockets crece en vez de
// estabilizarse. Eso es el "Daddy's Bot conectado" repetido sin fin, y por eso
// no se arreglaba solo aunque la cuenta estuviera perfectamente sana.
let timerReconexion = null;

function scheduleReconnect(delay) {
  // Ya hay una en camino: la primera manda. Volver a programar aquí es
  // justamente lo que multiplicaba los sockets.
  if (timerReconexion) {
    logger.info('reconexión ya programada; no se encola otra');
    return;
  }

  // Tear down the old socket so its event listeners/WebSocket don't leak across
  // reconnects (long-running bots otherwise accumulate them).
  if (sock) {
    try { sock.ev.removeAllListeners(); } catch {}
    try { sock.end(); } catch {}
    sock = null;
  }
  botIds = null;
  // connectToWhatsApp awaits disk/network work BEFORE it attaches the
  // connection.update listener. If that pre-work rejects on a reconnect, the
  // rejection would otherwise be unhandled and NO new listener gets attached →
  // the bot stays silently offline until a manual restart. Catch it and retry
  // so a 24/7 deployment always keeps trying to come back.
  timerReconexion = setTimeout(() => {
    timerReconexion = null;
    connectToWhatsApp().catch((err) => {
      logger.error(`Fallo al reconectar: ${err?.message || err}`);
      scheduleReconnect(30000);
    });
  }, delay);
}

// Cache Baileys version — avoids an HTTP round-trip on every reconnect
let _baileysVersion = null;
// La versión del protocolo fetchLatestBaileysVersion sale a internet, y ESA
// llamada no lleva timeout propio: si el endpoint no contesta (red de la VPS
// regular, DNS, el servidor caído), la promesa no se resuelve NUNCA.
//
// Eso dejaba el bot colgado justo aquí, antes de abrir el socket: proceso vivo,
// 110 MB de RAM, pm2 diciendo "online", el banner impreso en el log... y ni una
// línea más ni un solo error. Imposible de distinguir de "no enciende".
//
// Ahora se le pone un tope de diez segundos. Si no llega a tiempo se sigue con
// la versión que Baileys trae embebida (devolver undefined hace que makeWASocket
// use su valor por defecto), que es lo que se usaba igualmente hasta que alguien
// publicó una nueva. Arrancar con una versión de hace unos días es infinitamente
// mejor que no arrancar.
const ESPERA_VERSION_MS = 10000;

// Castigo por meter gente a dedo: el admin PIERDE EL MANDO, el metido se va.
//
// AL ADMIN NO SE LE BANEA NUNCA, y es una regla dura, no una preferencia.
// Antes se le degradaba, expulsaba y vetaba de golpe. El problema es que la
// deteccion no puede ser perfecta —depende de que llegue un mensaje de sistema
// a tiempo— y un ban es irreversible desde dentro del grupo: si el bot se
// equivoca con una admin que solo estaba aceptando solicitudes, la deja fuera
// y vetada, y eso no lo arregla nadie sin tocar la lista negra a mano.
//
// Degradar, en cambio, se deshace con un !promote. Asi que el castigo se parte
// segun lo que cuesta equivocarse: al admin lo reversible, al metido lo demas.
//
//   · admin  → solo demote. Ni ban ni kick, pase lo que pase.
//   · metido → ban + kick, y solo el que venga con alta a dedo CONFIRMADA.
async function sancionarPorAñadir(sock, groupJid, autor, meta, aDedo) {
  if (!aDedo.length) return;
  if (isOwner(autor, false, meta)) return;

  const paso = async (accion, fn) => {
    try { return await fn(); }
    catch (e) { logger.warn(`anti-admin (añadir): ${accion} falló en ${groupJid}: ${e.message}.`); return null; }
  };

  // 1) El admin, sin mando. Se mira el status porque WhatsApp contesta por
  //    participante y puede rechazar sin lanzar excepcion.
  const res = await paso('demote', () => sock.groupParticipantsUpdate(groupJid, [autor], 'demote'));
  const fila = Array.isArray(res) ? res[0] : null;
  const degradado = res !== null && String(fila?.status ?? '200') === '200';

  // 2) Los que metió: fuera y a la lista negra, con todas sus formas (teléfono
  //    y @lid). Si solo se guardara una, vuelve a entrar con la otra.
  const vetados = [];
  for (const quien of aDedo) {
    if (isOwner(quien, false, meta)) continue;
    await paso('ban', () => banAccount(allForms(quien, meta), `metido a dedo en ${groupJid}`, String(autor)));
    await paso('kick', () => sock.groupParticipantsUpdate(groupJid, [quien], 'remove'));
    vetados.push(quien);
  }

  const tag = (j) => `@${String(j).split('@')[0]}`;
  logger.warn(`anti-admin: ${autor} metió a dedo a ${vetados.join(', ')} en ${groupJid}. degradado=${degradado}`);

  await paso('aviso', () => sock.sendMessage(groupJid, {
    text:
      `*Anti-admin:* ${tag(autor)} ha metido gente a dedo.\n\n` +
      `${degradado ? '· Se le ha quitado el admin.' : '· No he podido quitarle el admin.'}\n` +
      `· ${vetados.map(tag).join(', ')} fuera y en la lista negra.\n\n` +
      `_Aquí solo mete gente el dueño. Aceptar solicitudes no cuenta._`,
    mentions: [autor, ...vetados],
  }));
}

async function getBaileysVersion() {
  if (_baileysVersion) return _baileysVersion;
  try {
    const version = await Promise.race([
      fetchLatestBaileysVersion().then(r => r.version),
      new Promise((_, rechaza) => setTimeout(() => rechaza(new Error('tardó demasiado')), ESPERA_VERSION_MS)),
    ]);
    _baileysVersion = version;
    return version;
  } catch (err) {
    logger.warn(
      `No pude consultar la versión de WhatsApp (${err.message}).` +
      `Sigo con la que trae Baileys: el bot arranca igual.`);
    return undefined;
  }
}

async function connectToWhatsApp() {
  // Ultima defensa contra dos sockets vivos a la vez. El candado de
  // scheduleReconnect ya lo impide, pero esta funcion tambien se llama desde el
  // arranque, y un arranque que coincida con una reconexion dejaria dos
  // sesiones con las mismas credenciales echandose la una a la otra en bucle.
  // Cerrar lo que hubiera es barato y elimina el caso entero.
  if (sock) {
    logger.warn('ya había una conexión abierta: se cierra antes de abrir la nueva');
    try { sock.ev.removeAllListeners(); } catch {}
    try { sock.end(); } catch {}
    sock = null;
    botIds = null;
  }

  await fs.ensureDir(AUTH_DIR);
  await ensureTemp();

  // Restos de la vez anterior. Si al bot lo mataron a media escritura atomica
  // (tope de RAM de pm2, OOM killer, corte), el .tmp se quedo sin renombrar y
  // nadie lo borra nunca. Va ANTES de initState para no barrer un temporal
  // recien escrito por este mismo arranque.
  const huerfanos = await barrerHuerfanos(path.join(__dirname, '../data'));
  if (huerfanos) logger.warn(`Barridos ${huerfanos} temporales que dejo un cierre brusco anterior`);

  await initState();

  // Traza del arranque. Sin esto, un arranque que se atasca deja EXACTAMENTE el
  // mismo log que uno que va bien —el banner y nada más— y no hay forma de
  // saber en qué paso se quedó. Son tres líneas y solo salen al arrancar.
  logger.info('arranque: estado cargado, leyendo la sesión...');
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  logger.info('arranque: sesión leída, consultando la versión de WhatsApp...');
  const version = await getBaileysVersion();
  logger.info(`arranque: versión ${version ? version.join('.') : 'por defecto'}, abriendo la conexión...`);

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    printQRInTerminal: false,
    // false → bot doesn't appear "online" all the time. This reduces incoming
    // receipt traffic and lowers perceived response latency from WhatsApp's side.
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    getMessage: async () => undefined,
    // El valor por defecto de la propia libreria es 30_000; este bot lo tenia
    // en 10_000 (el triple de frecuente) sin necesidad probada. Mas trafico de
    // fondo del que la libreria considera normal no aporta nada y es exactamente
    // el tipo de patron que un sistema antiabuso puede leer como no humano.
    keepAliveIntervalMs: 30_000,
    retryRequestDelayMs: 2000,
    connectTimeoutMs: 60_000,
    // Skip full history sync — much faster initial connection
    syncFullHistory: false,
    // Don't emit events for the bot's own outgoing messages
    emitOwnEvents: false,
    // status@broadcast YA NO SE TIRA A CIEGAS.
    //
    // Se ignoraba entero para ahorrar trabajo, y tenia sentido cuando por ahi
    // solo pasaban los estados personales de cada contacto. Pero las historias
    // que se suben AL GRUPO viajan por el mismo canal, asi que ese filtro era
    // tambien la razon de que el bot no viera ni una y no pudiera actuar.
    //
    // El ahorro se conserva donde toca: handleMessage corta en la primera linea
    // todo lo que venga de aqui y no sea una historia de grupo, que es un par
    // de comprobaciones de propiedad. Lo caro era actuar, no mirar.
    shouldIgnoreJid: () => false,
  });

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr, reachoutTimeLock }) => {
    // WhatsApp restringe a las cuentas nuevas o marcadas para que no contacten
    // desconocidos. Mientras esta activo, !add falla con
    // `account_reachout_restricted` y el error parece del numero al que se
    // intenta añadir, cuando en realidad es del bot. Se anota para poder
    // explicarlo y decir hasta cuando.
    if (reachoutTimeLock) {
      anotarRestriccionContacto(reachoutTimeLock);
      logger.warn(reachoutTimeLock.isActive
        ? `WhatsApp ha restringido a esta cuenta para contactar desconocidos${reachoutTimeLock.timeEnforcementEnds ?` hasta ${new Date(reachoutTimeLock.timeEnforcementEnds).toLocaleString('es-ES')}`: ''}. !add no podra añadir a gente nueva hasta entonces.`
        : 'WhatsApp ha levantado la restriccion de contacto. !add vuelve a funcionar con normalidad.');
    }

    if (qr) {
      console.log('\nEscanea el QR con WhatsApp → Dispositivos vinculados → Vincular dispositivo:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      // Se cayo: el reset pendiente ya no vale. Sin esto, una conexion que dura
      // 59 s seguiria reiniciando los contadores un segundo despues de haberse
      // caido, que es exactamente el bucle que se quiere cortar.
      clearTimeout(timerEstable);
      timerEstable = null;
      const statusCode = lastDisconnect?.error?.output?.statusCode;

      if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
        consecutive401++;

        if (consecutive401 < MAX_401) {
          // Could be a temporary WhatsApp rejection, retry before wiping session
          const delay = 5000 * consecutive401;
          logger.error(`Sesión rechazada (401), reintentando en ${delay / 1000}s... (${consecutive401}/${MAX_401})`);
          scheduleReconnect(delay);
        } else {
          consecutive401 = 0;
          ciclosLogout++;

          if (ciclosLogout > MAX_CICLOS_LOGOUT) {
            // No se borra la sesion ni se programa otro intento: generar QR
            // tras QR sin que nadie los escanee es justo la actividad que
            // puede convertir una restriccion temporal en una permanente.
            logger.error(
              `Sesión cerrada ${ciclosLogout} veces seguidas. Dejo de reintentar solo:` +
              `puede que WhatsApp tenga la cuenta restringida (revisa el teléfono).` +
              `Cuando esté resuelto, arrancá el bot a mano: pm2 restart bot.`
            );
            anotarParada('sesion-cerrada',
              `WhatsApp cerró la sesión ${ciclosLogout} veces seguidas. El bot dejó de reintentar.` +
              `a propósito: encadenar QR puede convertir una restricción temporal en permanente.` +
              `Revisa el teléfono (Dispositivos vinculados) y arranca a mano con: pm2 restart bot`);
            return;
          }

          // Confirmed logout — wipe and show QR
          logger.error('Sesión definitivamente cerrada. Escaneá el QR de nuevo.');
          await fs.remove(AUTH_DIR);
          reconnectAttempts = 0;
          scheduleReconnect(2000);
        }
        return;
      }

      // Cualquier otra desconexión: reconectar con backoff, SIN rendirse nunca.
      //
      // Antes se dejaba de intentar a los 10 fallos y el bot se apagaba solo.
      // Eso tumbó el bot de verdad: una caída de red de la VPS de un par de
      // minutos se come los diez intentos (el backoff los agota en ~2 min) y
      // el bot se iba, aunque WhatsApp volviera treinta segundos después.
      //
      // Rendirse aquí nunca tuvo sentido: esto NO es el caso del logout — ahí
      // sí hay que parar, porque encadenar QR agrava una restricción, y eso se
      // trata arriba y sigue igual. Una desconexión de red es transitoria por
      // definición y lo único correcto es seguir esperando.
      //
      // El backoff se estabiliza en cinco minutos: reintentar para siempre cada
      // 30 s sí sería el patrón de actividad automática que conviene evitar.
      consecutive401 = 0;
      reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), ESPERA_RECONEXION_MAX);
      if (reconnectAttempts === MAX_RECONNECTS) {
            logger.error(
          `Van ${reconnectAttempts} intentos de reconexión fallidos. Sigo intentándolo.` +
          `cada ${Math.round(ESPERA_RECONEXION_MAX / 60000)} min: si esto no se arregla solo.` +
          `mira la red de la VPS.`);
        anotarParada('sin-reconexion',
          `Lleva ${reconnectAttempts} intentos de reconexión fallidos y sigue intentándolo cada.` +
          `${Math.round(ESPERA_RECONEXION_MAX / 60000)} min. Suele ser la red de la VPS o WhatsApp caído.` +
          `Mira: pm2 logs bot --err --lines 50`);
      }
      scheduleReconnect(delay);

    } else if (connection === 'open') {
      // Los contadores NO se reinician aquí, y esto es lo importante.
      //
      // Antes sí, y con el tope de diez intentos daba igual. Al quitar el tope
      // (para que un corte de red no apagase el bot) se abrió un bucle: si
      // WhatsApp ACEPTA la conexión y la cierra un segundo después, cada
      // apertura reseteaba el contador, el backoff volvía a dos segundos y el
      // bot se pasaba la vida abriendo y cerrando. Eso llenó el log de
      // "conectado" repetido y martilleó a WhatsApp, que es justo lo que no hay
      // que hacer con una cuenta en revisión.
      //
      // Ahora una conexión solo cuenta como buena si AGUANTA. Si se cae antes
      // del minuto, el contador sigue subiendo y el backoff crece hasta cinco
      // minutos, así que el bucle se frena solo.
      clearTimeout(timerEstable);
      timerEstable = setTimeout(() => {
        reconnectAttempts = 0;
        consecutive401 = 0;
        ciclosLogout = 0;
        limpiarParada();   // la conexión aguantó: la marca ya no vale
      }, ESTABLE_MS);
      // Precompute bot's bare IDs (phone + LID) so participant-update events
      // don't have to rebuild the Set on every notification.
      const myJids = [sock.user?.id, sock.user?.lid].filter(Boolean);
      botIds = new Set(myJids.map(j => j.split('@')[0].split(':')[0]));
      // Explicit save on full connection to ensure session is complete
      await saveCreds();
      console.log(`\nDaddy's Bot conectado\n`);
      // Huella del código realmente cargado en memoria. Si tras un `git pull` el
      // commit de aquí no coincide con `git log -1`, o el filtro NO muestra
      // `pad=512:512`, es que el proceso quedó con código viejo: hay que
      // pararlo del todo y volver a hacer `npm start`.
      const specCompliant = /pad=512:512/.test(VF_STATIC);
      console.log(`  commit cargado : ${gitCommit()}`);
      console.log(`  filtro sticker : ${VF_STATIC}`);
      console.log(`canvas 512 : ${specCompliant ? 'SI (spec WhatsApp, relleno transparente, sin estirar)' : 'NO (código viejo, canvas no cuadrado)'}\n`);

      // Barrido inicial del historial de huellas: indexa en segundo plano las
      // fotos de los miembros de todos los grupos. Escalonado por su propia cola,
      // no bloquea el arranque. A partir de aquí se mantiene solo con cada mensaje.
      mapaDeGrupos()
        .then((mapa) => sweepAllGroups(sock, mapa))
        .catch(e => logger.warn(`pfpIndexer: barrido falló: ${e.message}`));

      // Lista de solicitudes de entrada pendientes. Es lo único que permite
      // saber, cuando un admin mete a alguien, si lo estaba APROBANDO o lo
      // estaba añadiendo a dedo. Se sondea al conectar y cada pocos minutos,
      // porque WhatsApp no avisa de las aprobaciones y una solicitud puede
      // llevar semanas ahí parada.
      sondearSolicitudes().catch(() => {});
      if (!timerSolicitudes) {
        timerSolicitudes = setInterval(() => { sondearSolicitudes().catch(() => {}); }, INTERVALO_SOLICITUDES);
        timerSolicitudes.unref();
      }
    }
    // No hay rama para 'connecting': la que había estaba vacía y solo servía
    // para pagar una comprobación de disco (pathExists de creds.json) en cada
    // reconexión.
  });

  sock.ev.on('creds.update', saveCreds);

  // Alguien pide entrar / retira la petición / se la rechazan. WhatsApp NO
  // emite nada cuando se APRUEBA (RequestJoinAction solo tiene created, revoked
  // y rejected), y por eso hay que apuntar quién está esperando ANTES de que
  // entre: al llegar el alta ya es demasiado tarde para preguntarlo.
  sock.ev.on('group.join-request', ({ id, participant, participantPn, action }) => {
    const quien = participantPn || participant;
    if (!id || !quien) return;
    if (action === 'created') {
      notarSolicitud(id, quien).catch(() => {});
      if (participant && participantPn) notarSolicitud(id, participant).catch(() => {});
      logger.info(`solicitud de entrada en ${id}: ${quien}`);
    } else {
      // revocada o rechazada: ya no espera nada, así que si un admin la mete
      // más tarde sí es un alta a dedo.
      olvidarSolicitud(id, quien).catch(() => {});
      if (participant && participantPn) olvidarSolicitud(id, participant).catch(() => {});
    }
  });

  // Cosecha de hechos de cada cuenta que WhatsApp manda por su cuenta: si es
  // Business (!antiempresa) y si tiene foto o la ha quitado (!antifoto).
  //
  // De aqui SI se saca el nombre, y es la unica via que lo tiene listo antes de
  // que nadie hable. WhatsApp manda estos contactos en la sincronizacion
  // inicial, asi que la copia en gris del ranking sale con nombres desde el
  // primer minuto en vez de ir llenandose segun la gente escribe.
  //
  // De aqui se coge UNICAMENTE notify (el pushName). Lo que NO se coge, y es
  // deliberado, esta explicado abajo en el propio bucle.
  const guardarContactos = (lista) => {
    let n = 0;
    for (const c of (lista || [])) {
      // SOLO notify, que es el pushName: la etiqueta que esa persona se pone a
      // si misma y que WhatsApp ya enseña a todo el mundo.
      //
      // NO se toca c.name. Ese es el nombre de la LIBRETA de la cuenta a la que
      // esta enganchado el bot, o sea como tiene apuntado el dueño del telefono
      // a cada uno — y la gente se guarda entre si con el nombre real. Leerlo
      // era publicar en el grupo el nombre real de quien no lo ha dado nunca.
      //
      // Tampoco verifiedName: ese rotulo lleva el nombre fiscal de la cuenta.
      const nombre = c?.notify;
      // verifiedName solo lo lleva una cuenta Business: prueba directa.
      const biz = Boolean(c?.verifiedName) || undefined;
      // imgUrl: null o 'removed' = sin foto; 'changed' o una url = con foto.
      const photo = c?.imgUrl === null || c?.imgUrl === 'removed' ? 'no'
                  : (typeof c?.imgUrl === 'string' && c.imgUrl) ? 'si' : undefined;
      // El nombre se anota bajo TODAS las formas conocidas de esa cuenta. En la
      // sincronizacion inicial los contactos llegan ANTES que el mapa
      // lid-telefono, asi que canonicalJid todavia no colapsa las dos formas en
      // una: guardar solo la que venga dejaria la ficha bajo una clave por la
      // que luego nadie pregunta.
      // recordName ya guarda bajo todas las formas que se le pasen, asi que va
      // una sola llamada con las tres.
      if (nombre) recordName([c.id, c.lid, c.phoneNumber], nombre).catch(() => {});
      if (!biz && !photo) continue;
      n++;
      for (const jid of [c.id, c.lid, c.phoneNumber]) {
        if (jid) recordFacts(jid, { biz, photo }).catch(() => {});
      }
    }
    return n;
  };
  sock.ev.on('contacts.upsert', guardarContactos);
  sock.ev.on('contacts.update', guardarContactos);
  // Correspondencias LID <-> telefono directamente de WhatsApp.
  //
  // El bot ya deducia estas parejas de la metadata del grupo y del
  // participantPn de cada mensaje, pero eso solo cubre a quien aparece por ahi.
  // WhatsApp las manda de forma autoritativa (una a una por lid-mapping.update
  // y en lote dentro de la sincronizacion inicial), y de esta capa depende TODO
  // el bot: sin ella la misma persona figura como dos identidades distintas y
  // se parte su aura, su conteo de mensajes y hasta la deteccion del owner.
  const guardarMapeos = (lista) => {
    let n = 0;
    for (const m of (lista || [])) {
      if (!m?.lid || !m?.pn) continue;
      rememberMapping(m.lid, m.pn);
      n++;
    }
    return n;
  };
  sock.ev.on('lid-mapping.update', (m) => guardarMapeos([m]));
  sock.ev.on('messaging-history.set', ({ contacts, lidPnMappings }) => {
    const n = guardarContactos(contacts);
    const k = guardarMapeos(lidPnMappings);
    if (n) logger.info(`cuentas: ${n} fichas (business/foto) aprendidas de la sincronizacion de WhatsApp`);
    if (k) logger.info(`jid: ${k} correspondencias LID-teléfono aprendidas de WhatsApp`);
    // Se dice en voz alta porque es lo que decide si el top en gris sale con
    // nombres o con huecos, y no hay forma de verlo desde el grupo sin esperar
    // a que caiga un cooldown.
    logger.info(`nombres: ${cuantosNombres()} fichas para la copia en gris del ranking`);
  });

  // Group events: anti-business on join, anti-admin + notifications on promote/demote
  sock.ev.on('group-participants.update', async ({ id: groupJid, author, authorPn, participants, action }) => {
    // Quien mueve gente viene con sus DOS identidades. Se aprovecha para atar la
    // pareja lid↔telefono, que es lo que hace que una ficha guardada bajo una
    // forma se encuentre preguntando por la otra. Lo hace rememberMapping, que
    // es el sitio donde vive ese mapa; recordName solo guarda nombres.
    if (author && authorPn) rememberMapping(author, authorPn);
    // Any participant change invalidates the cached metadata for that group —
    // otherwise commands run within 30s of a join/kick see stale member lists.
    invalidateGroupMeta(groupJid);

    // Fetch fresh metadata so isOwner() can resolve the author via the group's
    // participant list. Without it, owner/co-owner checks fall back to the
    // global LID cache only, and a co-owner whose LID hasn't been seen yet (e.g.
    // right after a restart) would have their legit promote/add wrongly reverted
    // by anti-admin. Null on failure → same cache-only behavior as before.
    const meta = await getGroupMeta(sock, groupJid).catch(() => null);

    // Newer Baileys emits participants as objects { id, phoneNumber, lid, admin, ... }.
    // Older versions used plain JID strings. Normalize to an array of JID strings.
    const partJids = (participants || [])
      .map(p => (typeof p === 'string' ? p : p?.id))
      .filter(Boolean);

    // ¿Es del owner tier? Se miran las DOS formas que trae el evento.
    //
    // Baileys entrega `authorPn` junto a `author` en cada cambio de participantes
    // (Types/Events.d.ts), igual que hace con las solicitudes de entrada. Mirar
    // solo `author` dejaba al owner comprobado en una sola forma: si venía como
    // @lid sin mapear, el bot lo trataba como a un miembro cualquiera.
    const esOwnerAmplio = (a, aPn, m) =>
      Boolean((a && isOwner(a, false, m)) || (aPn && isOwner(aPn, false, m)));

    // Bot detection covers both phone JID (older groups) and LID (newer groups).
    // botIds is precomputed at 'connection: open' to skip the rebuild per event.
    const isBotJid = (jid) => {
      if (!jid || !botIds) return false;
      const base = String(jid).split('@')[0].split(':')[0];
      return botIds.has(base);
    };

    // Anti-business: kick WhatsApp Business accounts that just joined.
    // Parallel check across all new joiners — keeps response time flat when
    // multiple users join at once via group link.
    if (action === 'add') {
      const fromBot = isBotJid(author);
      const authorTag = author ? `@${String(author).split('@')[0]}` : 'Alguien';

      // Anti-fake: lista negra y huella de fotos sobre cada entrada.
      // No bloquea al resto de handlers — sus fallos se registran y ya.
      guardOnJoin(sock, groupJid, (participants || []).filter(p => {
        const id = typeof p === 'string' ? p : p?.id;
        return id && !isBotJid(id);
      }), meta).catch(e => logger.warn(`anti-fake guard: ${e.message}`));

      // Historial de huellas automático: indexa la foto de cada entrante aunque
      // el anti-fake esté apagado (el guard de arriba solo actúa si está ON).
      for (const p of (participants || [])) {
        const id = typeof p === 'string' ? p : p?.id;
        if (id && !isBotJid(id)) maybeIndex(sock, id, groupJid);
      }

      if (isAntiBusinessEnabled(groupJid)) {
        // Need both forms per joiner:
        //  - kickId: what we pass to groupParticipantsUpdate('remove') and to mentions
        //  - phoneJid: what getBusinessProfile actually accepts (LIDs aren't supported)
        const candidates = [];
        for (const p of (participants || [])) {
          const obj = typeof p === 'string' ? { id: p } : p;
          if (!obj?.id || isBotJid(obj.id)) continue;
          // El owner tier NUNCA se auto-expulsa por anti-empresa (protegido como
          // en el resto de la moderación; al dueño no le toca ningún comando).
          if (isOwner(obj.id, false, meta) ||
              (obj.lid && isOwner(obj.lid, false, meta)) ||
              (obj.phoneNumber && isOwner(obj.phoneNumber, false, meta))) continue;
          // getBusinessProfile NO acepta LIDs, asi que hace falta el telefono.
          // Antes, si el evento traia al recien llegado solo como @lid (lo
          // normal en un grupo LID: los participantes del EVENTO llegan como
          // cadenas sueltas, sin phoneNumber), este `continue` lo descartaba en
          // silencio y el anti-empresa NUNCA se ejecutaba sobre el. De ahi que
          // entraran cuentas Business sin que el bot hiciera nada.
          //
          // canonicalJid resuelve el @lid a telefono con el mapa aprendido de
          // la metadata y de los propios mensajes, que es justo el dato que
          // faltaba.
          const canon = canonicalJid(obj.id);
          const phoneJid = obj.phoneNumber
            || (obj.id.endsWith('@s.whatsapp.net') ? obj.id : null)
            || (canon?.endsWith('@s.whatsapp.net') ? canon : null);
          // SIN TELEFONO YA NO SE DESCARTA. Aqui habia un `continue` que dejaba
          // dentro a cualquiera que llegara solo como @lid con el mapa frio —
          // justo lo que pasa en un grupo LID recien reiniciado el bot. Ahora
          // entra igual en la lista: la prueba observada (getMemberFacts) NO
          // necesita telefono, y solo la consulta de perfil lo pide.
          if (!phoneJid) {
            logger.warn(`Anti-empresa: ${obj.id} sin telefono resoluble; se comprueba solo con lo ya observado`);
          }
          candidates.push({ kickId: obj.id, phoneJid, participante: obj });
        }

        await Promise.all(candidates.map(async ({ kickId, phoneJid, participante }) => {
          // LA ENTRADA MIRA LO MISMO QUE EL SCAN, y antes no.
          //
          // Aqui solo se consultaba el perfil. El scan, en cambio, acepta DOS
          // pruebas: el perfil relleno y el hecho ya observado —que WhatsApp le
          // adjuntara un nombre verificado de negocio a un mensaje suyo, visto
          // en este grupo o en cualquier otro—. O sea que una cuenta que el bot
          // YA tenia fichada como Business entraba por la puerta sin que nadie
          // la mirara, y solo caia despues, si le daba por escribir.
          //
          // La prueba observada va primero ademas porque es gratis: esta en
          // disco y no gasta una consulta de red.
          const facts = await getMemberFacts([
            kickId, phoneJid, participante?.id, participante?.lid, participante?.phoneNumber,
          ]).catch(() => null);
          let biz = !!facts?.biz;

          if (!biz && phoneJid) {
            try {
              biz = await isBusiness(sock, phoneJid);
            } catch (err) {
              logger.warn(`Anti-empresa: chequeo fallo para ${phoneJid}: ${err.message}`);
              return;
            }
          }
          if (!biz) return;
          try {
            const res = await sock.groupParticipantsUpdate(groupJid, [kickId], 'remove');
            // WhatsApp responde por participante. Sin mirarlo, el bot anunciaba
            // expulsiones que el servidor había rechazado y la cuenta seguía dentro.
            const st = Array.isArray(res) ? String(res[0]?.status ?? '200') : '200';
            if (st !== '200') {
              logger.warn(`Anti-empresa: kick rechazado (${st}) para ${kickId} en ${groupJid}`);
              return;
            }
            const num = kickId.split('@')[0];
            sock.sendMessage(groupJid, {
              text: `*Anti-empresa:* @${num} es cuenta de WhatsApp Business. Expulsada automáticamente.`,
              mentions: [kickId],
            }).catch((e) => logger.warn(`Anti-empresa: send fallo en ${groupJid}: ${e.message}`));
          } catch (err) {
            logger.warn(`Anti-empresa: kick fallo para ${kickId} en ${groupJid} (¿bot no es admin?): ${err.message}`);
          }
        }));
      }

      // ─── Meter gente a dedo: se le quita el admin y se le veta ────────────
      //
      // Esto estuvo puesto, se quitó, y VUELVE CON UNA DIFERENCIA QUE ES TODO EL
      // ASUNTO. Se quitó porque el evento de participantes no dice POR QUÉ entró
      // alguien: Baileys mete en el mismo `action: 'add'` el alta a dedo, la
      // entrada por enlace y la aprobación de una solicitud. Con eso, el bot
      // castigaba a una admin por aprobar solicitudes, que es justo para lo que
      // se da admin. Sancionar sobre una suposición irreversible no valía.
      //
      // El motivo sí existe, solo que viaja aparte: en el messageStubType del
      // mensaje de sistema (27 a dedo · 31 enlace · 71 solicitud aprobada). Ya se
      // venía anotando en utils/joinReason.js, solo que nadie lo leía. Aquí se
      // lee y se espera, porque el evento de participantes suele llegar ANTES
      // que el stub.
      //
      // La regla es estricta a propósito: solo se sanciona con un 27 confirmado.
      // Si el stub no llega a tiempo, motivoDelAlta devuelve null y eso es "no se
      // sabe", NUNCA "fue a dedo". Preferir el falso negativo es obligatorio
      // cuando el castigo es perder el admin y quedar vetado.
      if (!fromBot && author && !esOwnerAmplio(author, authorPn, meta) && isAntiAdminEnabled(groupJid)) {
        const metidos = (participants || [])
          .map(p => (typeof p === 'string' ? { id: p } : p))
          .filter(o => o?.id && !isBotJid(o.id) && !sameUser(o.id, author))
          .map(o => o.id);

        if (metidos.length) {
          // Basta con uno a dedo para que la sanción caiga: quien mete a cinco a
          // la vez no se libra porque una de las altas fuera una solicitud.
          const motivos = await Promise.all(
            metidos.map(id => motivoDelAlta(groupJid, id).catch(() => null))
          );
          // UNO A UNO, no en bloque. Antes bastaba con que una de las altas
          // fuera a dedo para castigar TODAS, asi que si un admin aceptaba dos
          // solicitudes y ademas metia a alguien, los tres se iban fuera.
          // Ahora cada alta responde de si misma y solo cae la que viene con un
          // 27 confirmado; el null (el stub no llego) sigue siendo "no se sabe"
          // y no sanciona nunca.
          // SEGUNDA RED, INDEPENDIENTE DEL STUB. El bot ya apuntaba quien tenia
          // una solicitud pendiente —se hace en group.join-request, y el propio
          // comentario de alli dice que se apunta "antes de que entre" porque
          // al llegar el alta ya es tarde para preguntarlo—, pero NADIE lo
          // consultaba nunca. La lista se mantenia para nada.
          //
          // Aqui vale su peso en oro: si el que entra estaba esperando en la
          // cola, su alta fue una APROBACION, diga lo que diga el stub. Y esa
          // es justo la confusion que ha baneado admins dos veces. Dos senyales
          // que no dependen la una de la otra: para sancionar tienen que estar
          // las dos de acuerdo.
          const pendientes = await Promise.all(
            metidos.map(id => estabaPendiente(groupJid, allForms(id, meta)).catch(() => false))
          );
          const aDedo = metidos.filter((_, i) => motivos[i] === ALTA_ADD && !pendientes[i]);
          const perdonados = metidos.filter((_, i) => pendientes[i]);
          if (perdonados.length) {
            logger.info(
              `alta en ${groupJid}: ${perdonados.join(', ')} estaban en la cola de ` +
              `solicitudes, asi que fue una aprobacion. No se sanciona a ${author}.`);
          }

          if (!aDedo.length) {
    logger.info(
              `alta en ${groupJid}: ${author} metió a ${metidos.join(', ')}; ` +
              `motivos ${JSON.stringify(motivos)}. No se sanciona.`);
          } else {
            sancionarPorAñadir(sock, groupJid, author, meta, aDedo)
              .catch(e => logger.warn(`anti-admin (añadir): ${e.message}`));
          }
        }
      }

      return;
    }

    // ─── Han echado a alguien del tier owner ───────────────────────────────
    //
    // Esto NO depende del interruptor de anti-admin, igual que el bot tampoco
    // se deja expulsar a sí mismo ni deja que !kick toque al owner. Que un
    // admin normal eche al dueño es un ataque a la cadena de mando del propio
    // bot, y ahí no hay ajuste que valga.
    //
    // Se le degrada a él y se intenta devolver al owner. El degradado es solo
    // eso: se le quita el admin, no se le banea ni se le echa.
    if (action === 'remove' && author && !isBotJid(author) && !esOwnerAmplio(author, authorPn, meta)) {
      // Se miran TODAS las formas del expulsado, no solo su id.
      //
      // Aquí es donde más falta hace: al expulsarle ya NO figura en la metadata,
      // así que el índice de participantes no puede resolver sus otras formas y
      // isOwner se queda con la caché global. Si su id vino como @lid y ese LID
      // aún no estaba mapeado, el owner quedaba sin reconocer y el bot no movía
      // un dedo. El propio evento trae el phoneNumber, que sí casa con config.
      const echados = (participants || [])
        .map(p => (typeof p === 'string' ? { id: p } : p))
        .filter(o => o?.id && !isBotJid(o.id))
        .filter(o => [o.id, o.lid, o.phoneNumber].filter(Boolean)
          .some(f => isOwner(f, false, meta)))
        .map(o => o.id);
      if (echados.length) {
        const autorTag = `@${String(author).split('@')[0]}`;
        const menciones = [author, ...echados];

        // Primero el degradado: es lo único que depende solo del bot y sale
        // siempre, aunque el re-alta se tuerza.
        let degradado = false;
        try {
          const r = await sock.groupParticipantsUpdate(groupJid, [author], 'demote');
          degradado = String((Array.isArray(r) ? r[0] : null)?.status ?? '200') === '200';
        } catch (err) {
          logger.warn(`Owner echado: no pude degradar a ${author} en ${groupJid}: ${err.message}`);
        }

        const vueltos = [];
        const sinAdmin = [];
        const invitados = [];
        const fallidos = [];
        for (const victima of echados) {
          let fila = null;
          try {
            const r = await sock.groupParticipantsUpdate(groupJid, [victima], 'add');
            fila = Array.isArray(r) ? r[0] : null;
          } catch (err) {
            logger.warn(`Owner echado: alta fallida de ${victima} en ${groupJid}: ${err.message}`);
          }
          const estado = String(fila?.status ?? '');

          if (estado === '200') {
            // Vuelve con el admin que tenía. El evento de promote lo firma el
            // bot, así que el propio anti-admin no lo revierte.
            //
            // Se comprueba el resultado en vez de lanzarlo y olvidarse: el aviso
            // afirma que vuelve CON su admin, y decirlo sin haberlo verificado
            // es exactamente el tipo de mentira que el resto del bot ya no dice.
            let conAdmin = false;
            try {
              const r2 = await sock.groupParticipantsUpdate(groupJid, [victima], 'promote');
              const f2 = Array.isArray(r2)
                ? r2.find(x => (x?.jid || '').split('@')[0] === victima.split('@')[0])
                : null;
              conAdmin = String(f2?.status ?? '200') === '200';
            } catch (err) {
              logger.warn(`Owner echado: no pude devolverle el admin a ${victima}: ${err.message}`);
            }
            (conAdmin ? vueltos : sinAdmin).push(victima);
            continue;
          }

          // Privacidad activa: WhatsApp rechaza el alta pero devuelve dentro
          // del nodo la solicitud de invitación, que es justo lo que manda la
          // app oficial cuando no puede añadirte directamente.
          // getBinaryNodeChild de Baileys, no un find a mano: el `content` de un
          // nodo binario puede ser un array, una cadena o bytes, y hacer .find
          // sobre una cadena reventaría.
          const pedido = fila?.content ? getBinaryNodeChild(fila.content, 'add_request') : null;
          const code = pedido?.attrs?.code;
          if (code) {
            try {
              await sock.sendMessage(victima, {
                groupInvite: {
                  inviteCode: code,
                  inviteExpiration: Number(pedido.attrs.expiration) || 0,
                  jid: groupJid,
                  subject: meta?.subject || 'el grupo',
                  text: 'Te han sacado del grupo. Aquí tienes la invitación para volver.',
                },
              });
              invitados.push(victima);
              continue;
            } catch (err) {
              logger.warn(`Owner echado: invitación fallida a ${victima}: ${err.message}`);
            }
          }
          fallidos.push(victima);
        }

        const lista = (a) => a.map(j => `@${j.split('@')[0]}`).join(', ');
        // El aviso NO dice a quién se echó ni por qué se revierte: nombrar el
        // rango aquí era señalar en público quién manda en el bot. Se cuenta
        // solo lo que el bot hizo, igual que el anti-admin corriente.
        const partes = ['*Expulsión revertida.*'];
        if (vueltos.length)   partes.push(`${lista(vueltos)} está de vuelta con su admin.`);
        if (sinAdmin.length)  partes.push(`${lista(sinAdmin)} ha vuelto, pero no he podido devolverle el admin.`);
        if (invitados.length) partes.push(`${lista(invitados)} tiene la privacidad activa: le he mandado la invitación por privado.`);
        if (fallidos.length)  partes.push(`No he podido devolver a ${lista(fallidos)}: metedlo a mano.`);
        partes.push(degradado
          ? `${autorTag} se queda sin admin.`
          : `No he podido quitarle el admin a ${autorTag}.`);

        sock.sendMessage(groupJid, { text: partes.join('\n'), mentions: menciones }).catch(() => {});
      }
      return;
    }

    if (action !== 'promote' && action !== 'demote') return;

    const fromBot = isBotJid(author);

    // Promueve o degrada y devuelve A QUIÉN se le hizo DE VERDAD.
    //
    // WhatsApp contesta por participante y puede rechazar a unos y aceptar a
    // otros sin lanzar ninguna excepción: devuelve el array con el status de
    // cada uno. Los tres reverts de aquí abajo lo ignoraban y daban por hecho
    // que "no ha petado" significaba "hecho", así que el bot anunciaba
    // reversiones que el servidor había rechazado — el atacante conservaba el
    // admin y el grupo leía que se le había quitado.
    //
    // El anti-empresa y el bloque del owner echado de este mismo fichero ya
    // miraban el status. Esto pone a los tres reverts en el mismo criterio.
    //
    // Sin fila para un jid se asume que fue bien, igual que hace el bloque del
    // owner echado: WhatsApp no siempre responde por cada uno cuando todo va
    // bien, y asumir el fallo llenaría el chat de "no he podido" falsos.
    const cambiarRango = async (jids, accion) => {
      if (!jids.length) return [];
      try {
        const res = await sock.groupParticipantsUpdate(groupJid, jids, accion);
        const filas = Array.isArray(res) ? res : [];
        return jids.filter((j) => {
          const fila = filas.find(r => (r?.jid || '').split('@')[0] === j.split('@')[0]);
          return String(fila?.status ?? '200') === '200';
        });
      } catch (err) {
        logger.warn(`anti-admin: ${accion} fallo en ${groupJid}: ${err.message}`);
        return [];
      }
    };
    const tags = (a) => a.map(j => `@${j.split('@')[0]}`).join(', ');

    const targets = partJids.map(jid => `@${jid.split('@')[0]}`).join(', ');
    const authorTag = author ? `@${String(author).split('@')[0]}` : 'Alguien';

    // Si al BOT le acaban de dar admin aquí, este grupo pasa de "forbidden" a
    // legible: se levanta el freno del sondeo en vez de esperar las seis horas.
    if (action === 'promote' && partJids.some(isBotJid)) reactivarSondeo(groupJid);

    // Anti-admin: revert any promote that didn't come from the bot.
    // Owner/co-owner promotions are exempt — they have authority to grant admin.
    if (action === 'promote' && !fromBot && !esOwnerAmplio(author, authorPn, meta) && isAntiAdminEnabled(groupJid)) {
      // Nunca degradar al owner tier ni al bot, aunque un admin haya intentado
      // promoverlos: el autor (no-owner) sí se degrada, pero el objetivo protegido
      // se deja intacto.
      const toDemote = Array.from(new Set([...(author ? [author] : []), ...partJids]))
        .filter(jid => !isBotJid(jid) && !isOwner(jid, false, meta));
      if (!toDemote.length) return;

      const degradados = await cambiarRango(toDemote, 'demote');
      // Si no se pudo degradar a nadie, no se dice nada: anunciar una reversión
      // que no ocurrió es peor que callarse, porque el grupo deja de vigilar.
      if (!degradados.length) return;

      // "Ambos" era falso de dos maneras. Con un autor y dos promovidos son
      // TRES, y cuando el promovido era el owner se le dejaba el admin a
      // propósito y solo caía el autor — o sea, uno. Ahora se nombra a quien de
      // verdad se degradó y se cuenta lo que falló, si falló algo.
      const fallidos = toDemote.filter(j => !degradados.includes(j));
      const text =
        `*Anti-admin: acción revertida.*\n` +
        `${authorTag} intento dar admin a ${targets}.\n` +
        (degradados.length === 1
          ? `${tags(degradados)} ha sido degradado.`
          : `Degradados: ${tags(degradados)}.`) +
        (fallidos.length ? `\nNo he podido degradar a ${tags(fallidos)}.` : '');
      sock.sendMessage(groupJid, { text, mentions: toDemote }).catch(() => {});
      return;
    }

    // Degradar al OWNER se revierte SIEMPRE, esté el anti-admin encendido o no.
    //
    // Es el mismo criterio que con la expulsión: que un admin normal le quite el
    // admin al dueño es un ataque a la cadena de mando del bot, no una
    // preferencia del grupo. Antes esto dependía del interruptor y quedaba la
    // incoherencia de protegerle de la expulsión siempre y de la degradación
    // solo a veces — la misma agresión con dos criterios.
    if (action === 'demote' && !fromBot && author && !esOwnerAmplio(author, authorPn, meta)) {
      const ownerDegradado = (participants || [])
        .map(p => (typeof p === 'string' ? { id: p } : p))
        .filter(o => o?.id && !isBotJid(o.id))
        .filter(o => [o.id, o.lid, o.phoneNumber].filter(Boolean).some(f => isOwner(f, false, meta)))
        .map(o => o.id);

      if (ownerDegradado.length) {
        // Si en el mismo golpe cayeron el owner Y otros admins, se restaura a
        // todos. Antes este bloque reponía solo al owner y hacía return, así
        // que a los demás se los tragaba: el revert corriente de más abajo ya
        // no llegaba a ejecutarse y nadie les devolvía el admin ni lo decía.
        //
        // A los otros solo se les repone si el anti-admin está encendido, que
        // es la condición que gobierna ese revert; al owner, siempre.
        const otros = partJids.filter(j =>
          !isBotJid(j) && !ownerDegradado.some(o => o.split('@')[0] === j.split('@')[0]));
        const aRestaurar = Array.from(new Set([
          ...ownerDegradado,
          ...(isAntiAdminEnabled(groupJid) ? otros : []),
        ]));

        const repuestos = await cambiarRango(aRestaurar, 'promote');
        const castigado = author ? (await cambiarRango([author], 'demote')).length > 0 : false;
        const sinReponer = aRestaurar.filter(j => !repuestos.includes(j));

        // Se nombra a todos juntos y sin distinguir a nadie: el texto no puede
        // dejar ver cuál de los restaurados es el que manda en el bot.
        const partes = ['*Degradación revertida.*'];
        if (repuestos.length)   partes.push(`${tags(repuestos)} ${repuestos.length === 1 ? 'lo tiene' : 'lo tienen'} de vuelta.`);
        if (sinReponer.length)  partes.push(`No he podido devolvérselo a ${tags(sinReponer)}: hacedlo a mano.`);
        partes.push(castigado
          ? `${authorTag} se queda sin admin.`
          : `No he podido quitarle el admin a ${authorTag}.`);

        sock.sendMessage(groupJid, {
          text: partes.join('\n'),
          mentions: [...aRestaurar, ...(author ? [author] : [])],
        }).catch(() => {});
        return;
      }
    }

    // Anti-admin: revert any demote that didn't come from the bot
    // Admin A removes B's admin → bot restores B and removes A's admin.
    // Track each step separately so the notification reflects what actually
    // happened — a wholesale try/catch would lie if only one step succeeded.
    if (action === 'demote' && !fromBot && !esOwnerAmplio(author, authorPn, meta) && isAntiAdminEnabled(groupJid)) {
      // Al bot no se le puede reponer el admin a sí mismo: si es él el
      // degradado, ya no tiene permiso para nada. Se filtra para no gastar una
      // llamada que WhatsApp va a rechazar seguro.
      const aReponer = partJids.filter(j => !isBotJid(j));
      const repuestos = await cambiarRango(aReponer, 'promote');
      const castigado = author ? (await cambiarRango([author], 'demote')).length > 0 : false;

      if (repuestos.length || castigado) {
        const sinReponer = aReponer.filter(j => !repuestos.includes(j));
        const parts = [`*Anti-admin: acción revertida.*`, `${authorTag} intento quitar admin a ${targets}.`];
        const recupera = repuestos.length === 1 ? 'recupera' : 'recuperan';
        if (repuestos.length && castigado) parts.push(`${tags(repuestos)} ${recupera} el admin y ${authorTag} lo pierde.`);
        else if (repuestos.length)         parts.push(`${tags(repuestos)} ${recupera} el admin.`);
        else                               parts.push(`${authorTag} ha sido degradado.`);
        if (sinReponer.length && repuestos.length) parts.push(`No he podido devolvérselo a ${tags(sinReponer)}.`);
        sock.sendMessage(groupJid, {
          text: parts.join('\n'),
          mentions: [...partJids, ...(author ? [author] : [])],
        }).catch(() => {});
      }
      return;
    }

    // Regular notification (skip if the bot itself did the action — !promote/!demote
    // already responds). Owner/co-owner actions are never announced: they have the
    // authority, so their promotes/demotes are expected and stay silent.
    // esOwnerAmplio, NO isOwner: es el mismo criterio que usan los tres reverts
    // de arriba, y aquí se usaba el estrecho. La diferencia importa — el amplio
    // prueba también el phoneNumber que trae el evento, así que un owner cuyo
    // LID aún no estuviera mapeado pasaba los reverts sin tocar (bien) pero
    // luego SÍ salía anunciado aquí, que es justo la actividad que no debe
    // notificarse de él.
    if (!fromBot && !esOwnerAmplio(author, authorPn, meta) && isAdminNotifyEnabled(groupJid)) {
      const text = action === 'promote'
        ? `${authorTag} ha dado admin a ${targets}.`
        : `${authorTag} ha quitado admin a ${targets}.`;
      const mentions = [...partJids, ...(author ? [author] : [])];
      sock.sendMessage(groupJid, { text, mentions }).catch(() => {});
    }
  });

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    for (const msg of messages) {
      // Los mensajes de sistema (sin .message, solo messageStubType) traen el
      // motivo REAL de un alta. Se anotan siempre, venga el lote como 'notify' o
      // como 'append', porque de ellos depende no castigar a un admin por
      // aceptar una solicitud.
      if (msg?.messageStubType) anotarAlta(msg);
    }
    if (type !== 'notify') return;
    for (const msg of messages) {
      // handleMessage runs first so its sock.sendMessage is queued BEFORE readMessages.
      // Swapping the order would add one extra WA round-trip in front of every command response.
      handleMessage(sock, msg).catch(err => logger.error(`handleMessage error: ${err.message}`));
      if (config.autoRead && !msg.key.fromMe && msg.key.remoteJid) {
        sock.readMessages([msg.key]).catch(() => {});
      }
    }
  });

  return sock;
}

let _shuttingDown = false;
async function gracefulShutdown(code = 0) {
  // Re-entrancy guard: SIGINT followed by SIGTERM (or a double signal) must not
  // start two concurrent shutdowns / double process.exit.
  if (_shuttingDown) return;
  _shuttingDown = true;
  // Flush all debounced writes BEFORE closing the socket — otherwise the last
  // few seconds of stats, message counts, and music index updates are lost.
  // Race against a hard 3s cap so a single hung flush can't block exit forever
  // (the supervisor would otherwise SIGKILL us and we'd lose ALL pending flushes).
  const flushes = Promise.allSettled([
    flushState(), flushCounts(), flushAura(), flushCache(),
    flushCasino(), flushPfpHashes(), flushBanlist(), flushPfpCache(), flushNicks(), flushLinkPerms(),
    flushJoinRequests(), flushRobo(), flushRacha(), flushNames(), flushPickHistory(),
  ]);
  await Promise.race([flushes, new Promise(r => setTimeout(r, 3000))]);
  // Este es síncrono y no puede colgarse, así que va fuera de la carrera: es el
  // que guarda los JID de owner aprendidos, y perderlos hace que tras el
  // reinicio el bot no reconozca al dueño hasta que un comando traiga metadata.
  flushOwnerJids();
  // Y el mapa LID↔teléfono, por lo mismo: perderlo obliga a reaprenderlo, y
  // mientras tanto el owner no se reconoce por su @lid.
  flushLidMap();
  if (sock) {
    try { sock.end(); } catch {}
  }
  process.exit(code);
}

process.on('SIGINT', () => gracefulShutdown(0));
process.on('SIGTERM', () => gracefulShutdown(0));

process.on('uncaughtException', (err) => {
  logger.error(`Excepción no capturada: ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`Promesa rechazada: ${reason}`);
});

// listaDeGrupos y el inyector de socket se exportan para poder probar el freno
// del sondeo sin abrir una conexion real a WhatsApp.
function _sockDePrueba(s) {
  sock = s;
  gruposConocidos = [];
  gruposMeta = null;
  gruposTs = 0;
  gruposEsperaHasta = 0;
  gruposFallos = 0;
}

module.exports = { connectToWhatsApp, listaDeGrupos, sondearSolicitudes, _sockDePrueba };
