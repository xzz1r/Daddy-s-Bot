const config = require('../config');
const { isBotEnabled, incrementStat } = require('../utils/state');
const { cmdPlay, cmdSearch } = require('../commands/music');
const { cmdSticker } = require('../commands/sticker');
const { cmdTop } = require('../commands/tops');
const { cmdOn, cmdOff, cmdPing, cmdInfo, cmdHelp } = require('../commands/social');
const logger = require('../utils/logger');

function extractText(msg) {
  const m = msg.message;
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    m?.documentMessage?.caption ||
    ''
  );
}

function getMessageType(msg) {
  const m = msg.message;
  if (!m) return null;
  if (m.imageMessage) return 'image';
  if (m.videoMessage) return 'video';
  if (m.stickerMessage) return 'sticker';
  if (m.audioMessage) return 'audio';
  if (m.documentMessage) return 'document';
  if (m.conversation || m.extendedTextMessage) return 'text';
  return 'unknown';
}

async function handleMessage(sock, msg) {
  if (!msg.message) return;
  if (msg.key.fromMe) return;

  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const text = extractText(msg).trim();
  const msgType = getMessageType(msg);

  await incrementStat('messagesReceived');

  // Check if bot is enabled for this jid
  const enabled = await isBotEnabled(jid);

  // Always allow !on command even when disabled
  if (!enabled && !text.startsWith(`${config.prefix}on`)) return;

  // Only process prefix commands
  if (!text.startsWith(config.prefix)) return;

  const args = text.slice(config.prefix.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (!command) return;

  logger.cmd(sender.split('@')[0], `${config.prefix}${command} ${args.join(' ')}`);
  await incrementStat('commandsExecuted');

  // Auto typing indicator
  if (config.autoTyping) {
    await sock.sendPresenceUpdate('composing', jid).catch(() => {});
  }

  // Fetch group metadata for admin checks
  let groupMeta = null;
  if (jid.endsWith('@g.us')) {
    try {
      groupMeta = await sock.groupMetadata(jid);
    } catch {}
  }

  try {
    switch (command) {
      // Music commands
      case 'p':
      case 'play':
      case 'musica':
        await cmdPlay(sock, msg, args);
        break;

      case 'buscar':
      case 'search':
        await cmdSearch(sock, msg, args);
        break;

      // Sticker commands
      case 's':
      case 'sticker':
      case 'stk':
        await cmdSticker(sock, msg);
        break;

      // Top commands
      case 'top':
      case 'tops':
      case 'ranking':
        await cmdTop(sock, msg, args);
        break;

      // Bot control
      case 'on':
        await cmdOn(sock, msg, groupMeta);
        break;

      case 'off':
        await cmdOff(sock, msg, groupMeta);
        break;

      case 'ping':
        await cmdPing(sock, msg);
        break;

      case 'info':
      case 'estado':
      case 'status':
        await cmdInfo(sock, msg);
        break;

      case 'ayuda':
      case 'help':
      case 'menu':
        await cmdHelp(sock, msg);
        break;

      default:
        // Unknown command - silently ignore to avoid spam
        break;
    }
  } catch (err) {
    logger.error(`Command ${command} error: ${err.message}`);
    await sock.sendMessage(jid, { text: `❌ Error inesperado: ${err.message}` }, { quoted: msg }).catch(() => {});
  }

  // Stop typing indicator
  if (config.autoTyping) {
    await sock.sendPresenceUpdate('paused', jid).catch(() => {});
  }
}

module.exports = { handleMessage };
