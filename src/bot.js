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
const { isOwner, sameUser, isBotAdmin, canonicalJid, rememberMapping, flushOwnerJids, anotarRestriccionContacto } = require('./utils/wa');
const { anotarAlta, motivoDelAlta, ALTA_INVITE, ALTA_SOLICITUD } = require('./utils/joinReason');
const { notarSolicitud, olvidarSolicitud, estabaPendiente, sondear, sondeoReciente, reactivarSondeo, frenoNuevo, flushJoinRequests } = require('./utils/joinRequests');
const { flushCounts } = require('./utils/messageCounter');
const { flushAura } = require('./utils/auraStore');
const { flushCasino } = require('./utils/casinoStore');
const { flushNicks, recordFacts } = require('./utils/nickStore');
const { flushCache } = require('./utils/musicCache');
const { flush: flushPfpHashes } = require('./utils/pfpStore');
const { flush: flushPfpCache } = require('./utils/pfpCache');
const { sweepAllGroups, maybeIndex } = require('./utils/pfpIndexer');
const { flushBanlist } = require('./utils/banlist');
const { flushLinkPerms } = require('./utils/linkPerms');
const { guardOnJoin } = require('./commands/fk');
const { isBusiness } = require('./utils/businessCheck');
const { ensureTemp } = require('./utils/helpers');
const { gitCommit } = require('./utils/version');
const { VF_STATIC } = require('./utils/sticker');
const logger = require('./utils/logger');
const config = require('./config');

const AUTH_DIR = path.join(__dirname, '../data/auth');

let sock = null;
let reconnectAttempts = 0;
let consecutive401 = 0;
let botIds = null; // Set<string> of bot's bare IDs (phone + LID), populated on open
const MAX_RECONNECTS = 10;
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
let gruposTs = 0;
let gruposEsperaHasta = 0;
let gruposFallos = 0;

async function listaDeGrupos() {
  const ahora = Date.now();
  if (gruposConocidos.length && ahora - gruposTs < TTL_LISTA_GRUPOS) return gruposConocidos;
  // Tras un rate-overlimit se espera de verdad: insistir es lo que lo mantiene.
  if (ahora < gruposEsperaHasta) return gruposConocidos;

  try {
    gruposConocidos = Object.keys(await sock.groupFetchAllParticipating());
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
      `solicitudes: no pude listar grupos (${e.message}). ` +
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
      ? `solicitudes: en ${grupo} SI soy admin, asi que el problema es del grupo: ` +
        `no tiene activada la aprobacion de entradas. Sin ella no hay solicitudes ` +
        `que leer, y el anti-admin no puede distinguir una aprobacion de un alta a dedo.`
      : `solicitudes: en ${grupo} NO soy admin, por eso no puedo leer las solicitudes. ` +
        `Dame admin y vuelvo a intentarlo solo.`
  );
}

function scheduleReconnect(delay) {
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
  setTimeout(() => {
    connectToWhatsApp().catch((err) => {
      logger.error(`Fallo al reconectar: ${err?.message || err}`);
      scheduleReconnect(30000);
    });
  }, delay);
}

// Cache Baileys version — avoids an HTTP round-trip on every reconnect
let _baileysVersion = null;
async function getBaileysVersion() {
  if (_baileysVersion) return _baileysVersion;
  const { version } = await fetchLatestBaileysVersion();
  _baileysVersion = version;
  return version;
}

async function connectToWhatsApp() {
  await fs.ensureDir(AUTH_DIR);
  await ensureTemp();
  await initState();

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const version = await getBaileysVersion();

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
    // Ignore status@broadcast to reduce irrelevant event processing
    shouldIgnoreJid: jid => jid === 'status@broadcast',
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
        ? `WhatsApp ha restringido a esta cuenta para contactar desconocidos${reachoutTimeLock.timeEnforcementEnds ? ` hasta ${new Date(reachoutTimeLock.timeEnforcementEnds).toLocaleString('es-ES')}` : ''}. !add no podra añadir a gente nueva hasta entonces.`
        : 'WhatsApp ha levantado la restriccion de contacto. !add vuelve a funcionar con normalidad.');
    }

    if (qr) {
      console.log('\nEscanea el QR con WhatsApp → Dispositivos vinculados → Vincular dispositivo:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
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
              `Sesión cerrada ${ciclosLogout} veces seguidas. Dejo de reintentar solo: ` +
              `puede que WhatsApp tenga la cuenta restringida (revisa el teléfono). ` +
              `Cuando esté resuelto, arrancá el bot a mano: pm2 restart bot.`
            );
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

      // Any other disconnect — normal reconnect with backoff
      consecutive401 = 0;
      if (reconnectAttempts < MAX_RECONNECTS) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        scheduleReconnect(delay);
      } else {
        logger.error('No se pudo reconectar. Reiniciá el bot manualmente.');
        // Por gracefulShutdown, NO process.exit directo: si no, se pierden
        // todas las escrituras diferidas pendientes al rendirse la reconexión.
        gracefulShutdown(1);
      }

    } else if (connection === 'open') {
      reconnectAttempts = 0;
      consecutive401 = 0;
      ciclosLogout = 0;
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
      console.log(`  canvas 512x512 : ${specCompliant ? 'SI (spec WhatsApp, relleno transparente, sin estirar)' : 'NO (código viejo, canvas no cuadrado)'}\n`);

      // Barrido inicial del historial de huellas: indexa en segundo plano las
      // fotos de los miembros de todos los grupos. Escalonado por su propia cola,
      // no bloquea el arranque. A partir de aquí se mantiene solo con cada mensaje.
      sweepAllGroups(sock).catch(e => logger.warn(`pfpIndexer: barrido falló: ${e.message}`));

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
  // Aqui NO se guarda el nombre visible. Se hizo y no sirve: ese nombre lo pinta
  // el telefono que lee el mensaje con su propia libreta, asi que lo que ve el
  // bot no es lo que ve el grupo. Ese fue el motivo de retirar !antinick.
  const guardarContactos = (lista) => {
    let n = 0;
    for (const c of (lista || [])) {
      // verifiedName solo lo lleva una cuenta Business: prueba directa.
      const biz = Boolean(c?.verifiedName) || undefined;
      // imgUrl: null o 'removed' = sin foto; 'changed' o una url = con foto.
      const photo = c?.imgUrl === null || c?.imgUrl === 'removed' ? 'no'
                  : (typeof c?.imgUrl === 'string' && c.imgUrl) ? 'si' : undefined;
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
  });

  // Group events: anti-business on join, anti-admin + notifications on promote/demote
  sock.ev.on('group-participants.update', async ({ id: groupJid, author, authorPn, participants, action }) => {
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
          if (!phoneJid) {
            logger.warn(`Anti-empresa: no pude resolver el telefono de ${obj.id}; no se puede comprobar si es Business`);
            continue;
          }
          candidates.push({ kickId: obj.id, phoneJid });
        }

        await Promise.all(candidates.map(async ({ kickId, phoneJid }) => {
          let biz;
          try {
            biz = await isBusiness(sock, phoneJid);
          } catch (err) {
            logger.warn(`Anti-empresa: chequeo fallo para ${phoneJid}: ${err.message}`);
            return;
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

      // Anti-admin: solo el bot y el owner tier pueden AGREGAR gente a dedo. Si
      // lo hace un admin normal, se le degrada y se expulsa a quien metió.
      //
      // Aceptar una solicitud de entrada NO cuenta: es una función de admin
      // normal, y para eso se da el admin. Entrar por enlace tampoco.
      if (!fromBot && author && !esOwnerAmplio(author, authorPn, meta) && isAntiAdminEnabled(groupJid)) {
        // Entradas por enlace de invitación: el "autor" es el propio entrante.
        // Eso NO es un alta no autorizada — no se degrada ni se expulsa a nadie.
        // Solo actuamos cuando un admin agrega a OTROS. Nunca se toca al owner
        // tier ni al bot entre los agregados.
        // La exención del owner se comprueba sobre las TRES formas del
        // participante (id, lid, phoneNumber), igual que hace el bloque
        // anti-empresa de arriba. Mirar solo p.id dejaba al owner recién
        // añadido sin proteger cuando su id venía en forma LID.
        const candidatos = (participants || [])
          .map(p => (typeof p === 'string' ? { id: p } : p))
          .filter(o => o?.id)
          .filter(o =>
            !isBotJid(o.id) &&
            !sameUser(o.id, author) &&
            !isOwner(o.id, false, meta) &&
            !(o.lid && isOwner(o.lid, false, meta)) &&
            !(o.phoneNumber && isOwner(o.phoneNumber, false, meta)))
          // Se conservan las TRES formas: estabaPendiente las necesita porque la
          // solicitud pudo apuntarse con una (la que trajo el sondeo) y el alta
          // llegar con otra. Quedarse solo con o.id dejaba media proteccion.
          .map(o => ({ id: o.id, formas: [o.id, o.lid, o.phoneNumber].filter(Boolean) }));
        if (!candidatos.length) return;

        // Rastro de lo que llega de verdad en un alta, para no volver a
        // diagnosticar a ciegas si esto falla otra vez.
        logger.info(`alta en ${groupJid} por ${author}: ${JSON.stringify(participants)}`);

        // ¿Alta a dedo o aprobación de una solicitud?
        //
        // NO se puede saber por el mensaje: WhatsApp manda exactamente el mismo
        // alta (messageStubType 27) en los dos casos, y no existe ningún evento
        // de "aprobada" — RequestJoinAction solo tiene created, revoked y
        // rejected (Types/GroupMetadata.d.ts:9). Ese fue el fallo del intento
        // anterior, que miraba el stub y seguía degradando al admin que solo
        // había aceptado a alguien.
        //
        // Lo que sí se sabe es quién estaba ESPERANDO aprobación, porque se
        // apunta de antemano (evento group.join-request + sondeo periódico de
        // la lista de pendientes). Si el que entra estaba en esa lista, fue una
        // aprobación y no se toca a nadie.
        const decisiones = await Promise.all(candidatos.map(async ({ id: j, formas }) => {
          if (await estabaPendiente(groupJid, formas)) return { j, castigar: false, por: 'tenía solicitud pendiente' };
          const motivo = await motivoDelAlta(groupJid, j, 3000);
          if (motivo === ALTA_INVITE) return { j, castigar: false, por: 'entró por enlace' };
          if (motivo === ALTA_SOLICITUD) return { j, castigar: false, por: 'aprobación de solicitud' };
          // Sin un sondeo reciente NO se sabe quién estaba esperando, así que no
          // se puede afirmar que sea un alta a dedo. Degradar y expulsar es
          // irreversible: ante la duda, no se toca a nadie.
          if (!sondeoReciente(groupJid)) return { j, castigar: false, por: 'sin lista de solicitudes fresca' };
          return { j, castigar: true, por: 'no había pedido entrar' };
        }));

        for (const d of decisiones) {
          if (!d.castigar) logger.info(`Anti-admin: no se castiga por ${d.j} (${d.por}).`);
        }
        const toKick = decisiones.filter(d => d.castigar).map(d => d.j);
        if (!toKick.length) return;
        try {
          await sock.groupParticipantsUpdate(groupJid, [author], 'demote');
        } catch (err) {
          logger.warn(`Anti-admin: demote (add) fallo en ${groupJid}: ${err.message}`);
        }
        // toKick nunca esta vacio aqui: el early-return de arriba ya salio.
        try {
          await sock.groupParticipantsUpdate(groupJid, toKick, 'remove');
        } catch (err) {
          logger.warn(`Anti-admin: kick added member fallo en ${groupJid}: ${err.message}`);
        }
        const tags = toKick.map(j => `@${j.split('@')[0]}`).join(', ');
        sock.sendMessage(groupJid, {
          text: `*Anti-admin:* ${authorTag} agrego a ${tags} sin autorización. Expulsados y ${authorTag} degradado a miembro.`,
          mentions: [...toKick, author],
        }).catch(() => {});
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
      try {
        await sock.groupParticipantsUpdate(groupJid, toDemote, 'demote');
        const text =
          `*Anti-admin: acción revertida.*\n` +
          `${authorTag} intento dar admin a ${targets}.\n` +
          `Ambos han sido degradados automáticamente.`;
        sock.sendMessage(groupJid, { text, mentions: toDemote }).catch(() => {});
      } catch (err) {
        logger.warn(`Anti-admin: demote fallo en ${groupJid}: ${err.message}`);
      }
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
        let repuesto = false, castigado = false;
        try { await sock.groupParticipantsUpdate(groupJid, ownerDegradado, 'promote'); repuesto = true; }
        catch (err) { logger.warn(`Owner degradado: no pude devolverle el admin en ${groupJid}: ${err.message}`); }
        try { await sock.groupParticipantsUpdate(groupJid, [author], 'demote'); castigado = true; }
        catch (err) { logger.warn(`Owner degradado: no pude degradar a ${author}: ${err.message}`); }
        const tags = ownerDegradado.map(j => `@${j.split('@')[0]}`).join(', ');
        sock.sendMessage(groupJid, {
          text: `*Degradación revertida.*\n` +
            (repuesto ? `${tags} lo tiene de vuelta.` : `No he podido devolvérselo a ${tags}: hacedlo a mano.`) +
            (castigado ? `\n${authorTag} se queda sin admin.` : `\nNo he podido quitarle el admin a ${authorTag}.`),
          mentions: [...ownerDegradado, author],
        }).catch(() => {});
        return;
      }
    }

    // Anti-admin: revert any demote that didn't come from the bot
    // Admin A removes B's admin → bot restores B and removes A's admin.
    // Track each step separately so the notification reflects what actually
    // happened — a wholesale try/catch would lie if only one step succeeded.
    if (action === 'demote' && !fromBot && !esOwnerAmplio(author, authorPn, meta) && isAntiAdminEnabled(groupJid)) {
      let restored = false;
      let punished = false;
      try {
        await sock.groupParticipantsUpdate(groupJid, partJids, 'promote');
        restored = true;
      } catch (err) {
        logger.warn(`Anti-admin: restore fallo en ${groupJid}: ${err.message}`);
      }
      if (author) {
        try {
          await sock.groupParticipantsUpdate(groupJid, [author], 'demote');
          punished = true;
        } catch (err) {
          logger.warn(`Anti-admin: punish fallo en ${groupJid}: ${err.message}`);
        }
      }
      if (restored || punished) {
        const parts = [`*Anti-admin: acción revertida.*`, `${authorTag} intento quitar admin a ${targets}.`];
        if (restored && punished) parts.push(`Admin restaurado y ${authorTag} degradado.`);
        else if (restored) parts.push(`Admin restaurado.`);
        else parts.push(`${authorTag} ha sido degradado.`);
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
    if (!fromBot && !isOwner(author, false, meta) && isAdminNotifyEnabled(groupJid)) {
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
    flushJoinRequests(),
  ]);
  await Promise.race([flushes, new Promise(r => setTimeout(r, 3000))]);
  // Este es síncrono y no puede colgarse, así que va fuera de la carrera: es el
  // que guarda los JID de owner aprendidos, y perderlos hace que tras el
  // reinicio el bot no reconozca al dueño hasta que un comando traiga metadata.
  flushOwnerJids();
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
  gruposTs = 0;
  gruposEsperaHasta = 0;
  gruposFallos = 0;
}

module.exports = { connectToWhatsApp, listaDeGrupos, sondearSolicitudes, _sockDePrueba };
