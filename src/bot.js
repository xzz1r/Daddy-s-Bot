const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  jidNormalizedUser,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs-extra');
const qrcode = require('qrcode-terminal');
const { handleMessage } = require('./handlers/messageHandler');
const { initState } = require('./utils/state');
const { ensureTemp } = require('./utils/helpers');
const logger = require('./utils/logger');
const config = require('./config');

const AUTH_DIR = path.join(__dirname, '../data/auth');
const STORE_FILE = path.join(__dirname, '../data/store.json');

const store = makeInMemoryStore({
  logger: pino({ level: 'silent' }),
});

let sock = null;
let reconnectAttempts = 0;
const MAX_RECONNECTS = 10;

async function connectToWhatsApp() {
  await fs.ensureDir(AUTH_DIR);
  await ensureTemp();
  await initState();

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();

  logger.info(`Baileys v${version}${isLatest ? ' (latest)' : ' (update available)'}`);

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    printQRInTerminal: false,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    getMessage: async (key) => {
      if (store) {
        const msg = await store.loadMessage(key.remoteJid, key.id);
        return msg?.message || undefined;
      }
      return undefined;
    },
  });

  store.bind(sock.ev);

  // QR Code
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      logger.info('Escanea el QR code:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      logger.warn(`Conexión cerrada (código: ${statusCode})`);

      if (shouldReconnect && reconnectAttempts < MAX_RECONNECTS) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        logger.info(`Reconectando en ${delay / 1000}s... (intento ${reconnectAttempts}/${MAX_RECONNECTS})`);
        setTimeout(connectToWhatsApp, delay);
      } else if (statusCode === DisconnectReason.loggedOut) {
        logger.error('Sesión cerrada. Eliminando credenciales...');
        await fs.remove(AUTH_DIR);
        process.exit(1);
      } else {
        logger.error('Máximo de reconexiones alcanzado. Reiniciando proceso...');
        process.exit(1);
      }
    } else if (connection === 'open') {
      reconnectAttempts = 0;
      const user = sock.user;
      logger.success(`Bot conectado como ${user?.name || user?.id || 'desconocido'}`);
      logger.bot(`${config.botName} está listo 24/7 🚀`);
      logger.info(`Prefijo: ${config.prefix} | Owner: ${config.ownerNumber}`);
    } else if (connection === 'connecting') {
      logger.info('Conectando a WhatsApp...');
    }
  });

  // Save credentials on update
  sock.ev.on('creds.update', saveCreds);

  // Handle messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      try {
        await handleMessage(sock, msg);
      } catch (err) {
        logger.error(`handleMessage error: ${err.message}`);
      }
    }
  });

  // Auto-read messages
  if (config.autoRead) {
    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        if (!msg.key.fromMe && msg.key.remoteJid) {
          await sock.readMessages([msg.key]).catch(() => {});
        }
      }
    });
  }

  // Keep-alive heartbeat every 30s
  setInterval(async () => {
    try {
      await sock.sendPresenceUpdate('available');
    } catch {}
  }, 30000);

  return sock;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.warn('Apagando bot...');
  if (sock) {
    try {
      await sock.logout();
    } catch {}
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
