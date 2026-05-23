const config = require('../config');
const { isBotEnabled, incrementStat } = require('../utils/state');
const { increment: incrementMsgCount } = require('../utils/messageCounter');
const { cmdPlay, cmdSearch } = require('../commands/music');
const { cmdSticker } = require('../commands/sticker');
const { cmdTop } = require('../commands/tops');
const { cmdTopRandom } = require('../commands/topsRandom');
const { cmdCount } = require('../commands/count');
const { cmdGrok } = require('../commands/ai');
const { cmdTodos } = require('../commands/group');
const { cmdShip } = require('../commands/ship');
const { cmdTtp } = require('../commands/ttp');
const percent = require('../commands/percent');
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

  // Per-group per-user counter for !top5 / !top10
  if (jid.endsWith('@g.us') && sender) {
    incrementMsgCount(jid, sender).catch(() => {});
  }

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
      // Music command
      case 'playsong':
      case 'playaudio':
      case 'play':
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

      case 'top5':
        await cmdTopRandom(sock, msg, 5, args);
        break;

      case 'top10':
        await cmdTopRandom(sock, msg, 10, args);
        break;

      case 'count':
        await cmdCount(sock, msg);
        break;

      case 'g':
      case 'ai':
      case 'grok':
        await cmdGrok(sock, msg, args);
        break;

      // Group utilities
      case 'todos':
      case 'all':
      case 'everyone':
        await cmdTodos(sock, msg, args, groupMeta);
        break;

      case 'ship':
        await cmdShip(sock, msg, args, groupMeta);
        break;

      case 'ttp':
        await cmdTtp(sock, msg, args);
        break;

      // Random % about a user
      case 'gay':        await percent.cmdGay(sock, msg); break;
      case 'simp':       await percent.cmdSimp(sock, msg); break;
      case 'sexy':
      case 'hot':        await percent.cmdHot(sock, msg); break;
      case 'rata':       await percent.cmdRata(sock, msg); break;
      case 'gilipollas': await percent.cmdGilipollas(sock, msg); break;
      case 'subnormal':  await percent.cmdSubnormal(sock, msg); break;
      case 'imbecil':
      case 'imbécil':    await percent.cmdImbecil(sock, msg); break;
      case 'capullo':    await percent.cmdCapullo(sock, msg); break;
      case 'pringado':   await percent.cmdPringado(sock, msg); break;
      case 'mamon':
      case 'mamón':      await percent.cmdMamon(sock, msg); break;
      case 'pijo':       await percent.cmdPijo(sock, msg); break;
      case 'friki':      await percent.cmdFriki(sock, msg); break;
      case 'chorizo':    await percent.cmdChorizo(sock, msg); break;
      case 'guarro':     await percent.cmdGuarro(sock, msg); break;
      case 'paleto':     await percent.cmdPaleto(sock, msg); break;
      case 'cutre':      await percent.cmdCutre(sock, msg); break;

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
      case 'commands':
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
