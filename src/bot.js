const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs-extra');
const qrcode = require('qrcode-terminal');
const { handleMessage, invalidateGroupMeta } = require('./handlers/messageHandler');
const { initState, isAdminNotifyEnabled, isAntiAdminEnabled, isAntiBusinessEnabled, flushState } = require('./utils/state');
const { isOwner } = require('./utils/wa');
const { flushCounts } = require('./utils/messageCounter');
const { flushAura } = require('./utils/auraStore');
const { flushRep } = require('./utils/repStore');
const { flushCache } = require('./utils/musicCache');
const { isBusiness } = require('./utils/businessCheck');
const { ensureTemp } = require('./utils/helpers');
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
  setTimeout(connectToWhatsApp, delay);
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

  const credsFile = path.join(AUTH_DIR, 'creds.json');
  const hasSession = await fs.pathExists(credsFile);

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
          logger.error('Sesion definitivamente cerrada. Escaneá el QR de nuevo.');
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
        process.exit(1);
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
      console.log(`\n✓ Daddy's Bot conectado\n`);

    } else if (connection === 'connecting') {
      if (!hasSession) return; // only log if reconnecting
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Group events: anti-business on join, anti-admin + notifications on promote/demote
  sock.ev.on('group-participants.update', async ({ id: groupJid, author, participants, action }) => {
    // Any participant change invalidates the cached metadata for that group —
    // otherwise commands run within 30s of a join/kick see stale member lists.
    invalidateGroupMeta(groupJid);

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

      if (isAntiBusinessEnabled(groupJid)) {
        // Need both forms per joiner:
        //  - kickId: what we pass to groupParticipantsUpdate('remove') and to mentions
        //  - phoneJid: what getBusinessProfile actually accepts (LIDs aren't supported)
        const candidates = [];
        for (const p of (participants || [])) {
          const obj = typeof p === 'string' ? { id: p } : p;
          if (!obj?.id || isBotJid(obj.id)) continue;
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
            await sock.groupParticipantsUpdate(groupJid, [kickId], 'remove');
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

      // Anti-admin: only the bot and the owner/co-owner may add people. When a
      // regular (non-owner) admin adds someone, demote that admin AND kick whoever
      // they added. Owner/co-owner adds are exempt — the member stays and the
      // owner keeps admin.
      if (!fromBot && author && !isOwner(author, false, null) && isAntiAdminEnabled(groupJid)) {
        const toKick = partJids.filter(jid => !isBotJid(jid));
        try {
          await sock.groupParticipantsUpdate(groupJid, [author], 'demote');
        } catch (err) {
          logger.warn(`Anti-admin: demote (add) fallo en ${groupJid}: ${err.message}`);
        }
        if (toKick.length) {
          try {
            await sock.groupParticipantsUpdate(groupJid, toKick, 'remove');
          } catch (err) {
            logger.warn(`Anti-admin: kick added member fallo en ${groupJid}: ${err.message}`);
          }
        }
        const tags = toKick.map(j => `@${j.split('@')[0]}`).join(', ');
        sock.sendMessage(groupJid, {
          text: toKick.length
            ? `*Anti-admin:* ${authorTag} agrego a ${tags} sin permiso del owner. Expulsados y ${authorTag} degradado a miembro.`
            : `*Anti-admin:* ${authorTag} agrego gente sin permiso del owner. Degradado a miembro.`,
          mentions: [...toKick, author],
        }).catch(() => {});
      }

      return;
    }

    if (action !== 'promote' && action !== 'demote') return;

    const fromBot = isBotJid(author);

    const targets = partJids.map(jid => `@${jid.split('@')[0]}`).join(', ');
    const authorTag = author ? `@${String(author).split('@')[0]}` : 'Alguien';

    // Anti-admin: revert any promote that didn't come from the bot.
    // Owner/co-owner promotions are exempt — they have authority to grant admin.
    if (action === 'promote' && !fromBot && !isOwner(author, false, null) && isAntiAdminEnabled(groupJid)) {
      const toDemote = Array.from(new Set([...(author ? [author] : []), ...partJids]));
      try {
        await sock.groupParticipantsUpdate(groupJid, toDemote, 'demote');
        const text =
          `*Anti-admin: accion revertida.*\n` +
          `${authorTag} intento dar admin a ${targets}.\n` +
          `Ambos han sido degradados automaticamente.`;
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
    if (action === 'demote' && !fromBot && !isOwner(author, false, null) && isAntiAdminEnabled(groupJid)) {
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
        const parts = [`*Anti-admin: accion revertida.*`, `${authorTag} intento quitar admin a ${targets}.`];
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
    if (!fromBot && !isOwner(author, false, null) && isAdminNotifyEnabled(groupJid)) {
      const text = action === 'promote'
        ? `${authorTag} ha dado admin a ${targets}.`
        : `${authorTag} ha quitado admin a ${targets}.`;
      const mentions = [...partJids, ...(author ? [author] : [])];
      sock.sendMessage(groupJid, { text, mentions }).catch(() => {});
    }
  });

  sock.ev.on('messages.upsert', ({ messages, type }) => {
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

async function gracefulShutdown() {
  // Flush all debounced writes BEFORE closing the socket — otherwise the last
  // few seconds of stats, message counts, and music index updates are lost.
  await Promise.allSettled([flushState(), flushCounts(), flushAura(), flushRep(), flushCache()]);
  if (sock) {
    try { sock.end(); } catch {}
  }
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

process.on('uncaughtException', (err) => {
  logger.error(`Excepción no capturada: ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`Promesa rechazada: ${reason}`);
});

module.exports = { connectToWhatsApp };
