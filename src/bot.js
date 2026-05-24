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
const { handleMessage } = require('./handlers/messageHandler');
const { initState, isAdminNotifyEnabled, isAntiAdminEnabled } = require('./utils/state');
const { ensureTemp } = require('./utils/helpers');
const logger = require('./utils/logger');
const config = require('./config');

const AUTH_DIR = path.join(__dirname, '../data/auth');

let sock = null;
let reconnectAttempts = 0;
let consecutive401 = 0;
const MAX_RECONNECTS = 10;
const MAX_401 = 3;

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
    markOnlineOnConnect: true,
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
          setTimeout(connectToWhatsApp, delay);
        } else {
          // Confirmed logout — wipe and show QR
          logger.error('Sesion definitivamente cerrada. Escaneá el QR de nuevo.');
          await fs.remove(AUTH_DIR);
          consecutive401 = 0;
          reconnectAttempts = 0;
          setTimeout(connectToWhatsApp, 2000);
        }
        return;
      }

      // Any other disconnect — normal reconnect with backoff
      consecutive401 = 0;
      if (reconnectAttempts < MAX_RECONNECTS) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        setTimeout(connectToWhatsApp, delay);
      } else {
        logger.error('No se pudo reconectar. Reiniciá el bot manualmente.');
        process.exit(1);
      }

    } else if (connection === 'open') {
      reconnectAttempts = 0;
      consecutive401 = 0;
      // Explicit save on full connection to ensure session is complete
      await saveCreds();
      console.log(`\n✓ Daddy's Bot conectado\n`);

    } else if (connection === 'connecting') {
      if (!hasSession) return; // only log if reconnecting
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Admin change notifications + anti-admin enforcement
  sock.ev.on('group-participants.update', async ({ id: groupJid, author, participants, action }) => {
    if (action !== 'promote' && action !== 'demote') return;

    const botPhone = sock.user?.id ? sock.user.id.split('@')[0].split(':')[0] : '';
    const authorPhone = author ? author.split('@')[0].split(':')[0] : '';
    const fromBot = botPhone && authorPhone === botPhone;

    const targets = participants.map(jid => `@${jid.split('@')[0]}`).join(', ');
    const authorTag = author ? `@${author.split('@')[0]}` : 'Alguien';

    // Anti-admin: revert any promote that didn't come from the bot owner
    if (action === 'promote' && !fromBot && isAntiAdminEnabled(groupJid)) {
      const toDemote = Array.from(new Set([...(author ? [author] : []), ...participants]));
      try {
        await sock.groupParticipantsUpdate(groupJid, toDemote, 'demote');
        const text =
          `*Anti-admin: accion revertida.*\n` +
          `${authorTag} intento dar admin a ${targets}.\n` +
          `Ambos han sido degradados automaticamente.`;
        sock.sendMessage(groupJid, { text, mentions: toDemote }).catch(() => {});
      } catch {}
      return; // skip the regular notification — the anti-admin one already explains it
    }

    // Regular notification (skip if the bot itself did the action — !promote/!demote already responds)
    if (!fromBot && isAdminNotifyEnabled(groupJid)) {
      const text = action === 'promote'
        ? `${authorTag} ha dado admin a ${targets}.`
        : `${authorTag} ha quitado admin a ${targets}.`;
      const mentions = [...participants, ...(author ? [author] : [])];
      sock.sendMessage(groupJid, { text, mentions }).catch(() => {});
    }
  });

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      // Fire-and-forget read receipt — never blocks message processing
      if (config.autoRead && !msg.key.fromMe && msg.key.remoteJid) {
        sock.readMessages([msg.key]).catch(() => {});
      }
      handleMessage(sock, msg).catch(err => logger.error(`handleMessage error: ${err.message}`));
    }
  });

  return sock;
}

process.on('SIGINT', async () => {
  if (sock) {
    try { sock.end(); } catch {}
  }
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logger.error(`Excepción no capturada: ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`Promesa rechazada: ${reason}`);
});

module.exports = { connectToWhatsApp };
