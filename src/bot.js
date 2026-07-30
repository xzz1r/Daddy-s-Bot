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
const { isOwner, sameUser, rememberMapping, flushOwnerJids } = require('./utils/wa');
const { anotarAlta, motivoDelAlta, ALTA_ADD } = require('./utils/joinReason');
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
    // More frequent keep-alives = more stable WebSocket on mobile/Termux
    keepAliveIntervalMs: 10_000,
    retryRequestDelayMs: 2000,
    connectTimeoutMs: 60_000,
    // Skip full history sync — much faster initial connection
    syncFullHistory: false,
    // Don't emit events for the bot's own outgoing messages
    emitOwnEvents: false,
    // Ignore status@broadcast to reduce irrelevant event processing
    shouldIgnoreJid: jid => jid === 'status@broadcast',
  });

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
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
          // Confirmed logout — wipe and show QR
          logger.error('Sesión definitivamente cerrada. Escaneá el QR de nuevo.');
          await fs.remove(AUTH_DIR);
          consecutive401 = 0;
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

    }
    // No hay rama para 'connecting': la que había estaba vacía y solo servía
    // para pagar una comprobación de disco (pathExists de creds.json) en cada
    // reconexión.
  });

  sock.ev.on('creds.update', saveCreds);

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
    if (k) logger.info(`jid: ${k} correspondencias LID-telefono aprendidas de WhatsApp`);
  });

  // Group events: anti-business on join, anti-admin + notifications on promote/demote
  sock.ev.on('group-participants.update', async ({ id: groupJid, author, participants, action }) => {
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
          const phoneJid = obj.phoneNumber || (obj.id.endsWith('@s.whatsapp.net') ? obj.id : null);
          if (!phoneJid) continue;
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
              text: `*Anti-empresa:* @${num} es cuenta de WhatsApp Business. Expulsada automaticamente.`,
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
      if (!fromBot && author && !isOwner(author, false, meta) && isAntiAdminEnabled(groupJid)) {
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
          .map(o => o.id);
        if (!candidatos.length) return;

        // Solo se castiga el alta a dedo. Aceptar una solicitud o entrar por
        // enlace no son altas no autorizadas, y por no distinguirlas el bot
        // degradaba a la admin que aceptaba y expulsaba al aceptado.
        //
        // Si el motivo no llega a tiempo NO se toca nada: degradar y expulsar es
        // irreversible, y aquí rige la misma norma que en las purgas — un dato
        // que falta jamás puede costarle a nadie el puesto ni el grupo.
        const motivos = await Promise.all(candidatos.map(j => motivoDelAlta(groupJid, j)));
        const toKick = candidatos.filter((_, i) => motivos[i] === ALTA_ADD);
        if (!toKick.length) {
          const desconocidos = motivos.filter(m => m === null).length;
          if (desconocidos) {
            logger.warn(`Anti-admin: no pude saber por qué entraron ${desconocidos} en ${groupJid}; no se toca a nadie.`);
          }
          return;
        }
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
          text: `*Anti-admin:* ${authorTag} agrego a ${tags} sin permiso del owner. Expulsados y ${authorTag} degradado a miembro.`,
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
    if (action === 'remove' && author && !isBotJid(author) && !isOwner(author, false, meta)) {
      const echados = partJids.filter(j => !isBotJid(j) && isOwner(j, false, meta));
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
            vueltos.push(victima);
            // Vuelve con el admin que tenía. El evento de promote lo firma el
            // bot, así que el propio anti-admin no lo revierte.
            await sock.groupParticipantsUpdate(groupJid, [victima], 'promote').catch(() => {});
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
        const partes = [`*${autorTag} ha echado al owner.*`];
        if (vueltos.length)   partes.push(`${lista(vueltos)} está de vuelta con su admin.`);
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

    // Anti-admin: revert any promote that didn't come from the bot.
    // Owner/co-owner promotions are exempt — they have authority to grant admin.
    if (action === 'promote' && !fromBot && !isOwner(author, false, meta) && isAntiAdminEnabled(groupJid)) {
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

    // Anti-admin: revert any demote that didn't come from the bot
    // Admin A removes B's admin → bot restores B and removes A's admin.
    // Track each step separately so the notification reflects what actually
    // happened — a wholesale try/catch would lie if only one step succeeded.
    if (action === 'demote' && !fromBot && !isOwner(author, false, meta) && isAntiAdminEnabled(groupJid)) {
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

module.exports = { connectToWhatsApp };
