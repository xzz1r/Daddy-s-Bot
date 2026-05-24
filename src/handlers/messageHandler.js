const config = require('../config');
const { isBotEnabled, incrementStat } = require('../utils/state');
const { increment: incrementMsgCount } = require('../utils/messageCounter');
const { cmdPlay, cmdSearch, cmdClearCache } = require('../commands/music');
const { cmdSticker } = require('../commands/sticker');
const { cmdTopRandom } = require('../commands/topsRandom');
const { cmdCount } = require('../commands/count');
const { cmdGrok, cmdSetGrokKey } = require('../commands/ai');
const { cmdTodos, cmdKick, cmdDel, cmdMute, cmdUnmute, cmdPromote, cmdDemote, cmdNotifAdmin, isMuted, isAdmin } = require('../commands/group');
const { cmdShip } = require('../commands/ship');
const { cmdTtp } = require('../commands/ttp');
const percent = require('../commands/percent');
const { cmdOn, cmdOff, cmdPing, cmdInfo, cmdHelp, isOwner } = require('../commands/social');
const logger = require('../utils/logger');

// Detects http/https links, www. links, and common invite/spam patterns
const LINK_RE = /https?:\/\/[^\s]{4,}|www\.[^\s]{4,}|(?:t\.me|chat\.whatsapp\.com)\/[^\s]+/i;

// Commands that need group metadata — skip the network call for everything else
const NEEDS_META = new Set([
  'on','off','tagall','todos','all','everyone',
  'kick','expulsar','del','borrar','delete',
  'ship','top5','top10','mute','unmute','desmute',
  'promote','ascender','demote','degradar','notifadmin',
]);

// Group metadata cache with 30s TTL — avoids repeated network calls
const metaCache = new Map();
async function getGroupMeta(sock, jid) {
  const c = metaCache.get(jid);
  if (c && Date.now() - c.ts < 30_000) return c.meta;
  try {
    const meta = await sock.groupMetadata(jid);
    metaCache.set(jid, { meta, ts: Date.now() });
    return meta;
  } catch {
    return c?.meta ?? null;
  }
}

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

async function handleMessage(sock, msg) {
  if (!msg.message) return;

  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const text = extractText(msg).trim();

  // Skip own messages that aren't commands (avoids bot responding to itself)
  // fromMe = true when the owner sends from their linked phone — still allow commands
  if (msg.key.fromMe && !text.startsWith(config.prefix)) return;

  // Non-blocking counters — never delay command execution
  incrementStat('messagesReceived');
  if (jid.endsWith('@g.us') && sender) incrementMsgCount(jid, sender).catch(() => {});

  // Sync in-memory check — no async overhead
  if (!isBotEnabled(jid) && !text.startsWith(`${config.prefix}on`)) return;

  // Anti-link: delete message + kick sender if they're not admin/owner
  if (jid.endsWith('@g.us') && text && LINK_RE.test(text) && !isOwner(sender, msg.key.fromMe)) {
    const meta = await getGroupMeta(sock, jid);
    if (meta && !isAdmin(meta.participants, sender)) {
      sock.sendMessage(jid, { delete: { remoteJid: jid, fromMe: false, id: msg.key.id, participant: sender } }).catch(() => {});
      sock.groupParticipantsUpdate(jid, [sender], 'remove').catch(() => {});
      return;
    }
  }

  if (!text.startsWith(config.prefix)) return;

  const args = text.slice(config.prefix.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();
  if (!command) return;

  // Check mute before anything else
  if (isMuted(jid, sender)) return;

  logger.cmd(sender.split('@')[0], `${config.prefix}${command} ${args.join(' ')}`);
  incrementStat('commandsExecuted');

  // Fire-and-forget — don't delay command start waiting for presence ACK
  if (config.autoTyping) sock.sendPresenceUpdate('composing', jid).catch(() => {});

  // Only fetch group metadata for commands that actually need it
  let groupMeta = null;
  if (jid.endsWith('@g.us') && NEEDS_META.has(command)) {
    groupMeta = await getGroupMeta(sock, jid);
  }

  try {
    switch (command) {
      case 'playsong':
      case 'playaudio':
      case 'play':
        await cmdPlay(sock, msg, args);
        break;

      case 'buscar':
      case 'search':
        await cmdSearch(sock, msg, args);
        break;

      case 'clearcache':
      case 'borracache':
        if (isOwner(sender, msg.key.fromMe)) {
          await cmdClearCache(sock, msg);
        } else {
          await sock.sendMessage(jid, { text: 'Solo el owner puede usar este comando.' }, { quoted: msg });
        }
        break;

      case 'whoami':
        await sock.sendMessage(jid, {
          text: `Tu JID: *${sender}*\nOwner: *${isOwner(sender, msg.key.fromMe) ? 'Si' : 'No'}*`,
        }, { quoted: msg });
        break;

      case 's':
      case 'sticker':
      case 'stk':
        await cmdSticker(sock, msg);
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

      case 'setgrok':
      case 'setkey':
        await cmdSetGrokKey(sock, msg, args);
        break;

      case 'tagall':
      case 'todos':
      case 'all':
      case 'everyone':
        await cmdTodos(sock, msg, args, groupMeta);
        break;

      case 'promote':
      case 'ascender':
        await cmdPromote(sock, msg, args, groupMeta);
        break;

      case 'demote':
      case 'degradar':
        await cmdDemote(sock, msg, args, groupMeta);
        break;

      case 'notifadmin':
        await cmdNotifAdmin(sock, msg, args, groupMeta);
        break;

      case 'kick':
      case 'expulsar':
        await cmdKick(sock, msg, args, groupMeta);
        break;

      case 'del':
      case 'borrar':
      case 'delete':
        await cmdDel(sock, msg, groupMeta);
        break;

      case 'mute':
        await cmdMute(sock, msg, args, groupMeta);
        break;

      case 'unmute':
      case 'desmute':
        await cmdUnmute(sock, msg, args, groupMeta);
        break;

      case 'ship':
        await cmdShip(sock, msg, args, groupMeta);
        break;

      case 'ttp':
        await cmdTtp(sock, msg, args);
        break;

      case 'gay':        await percent.cmdGay(sock, msg); break;
      case 'simp':       await percent.cmdSimp(sock, msg); break;
      case 'sexy':
      case 'hot':        await percent.cmdHot(sock, msg); break;
      case 'rata':       await percent.cmdRata(sock, msg); break;
      case 'maricon':
      case 'maricón':    await percent.cmdMaricon(sock, msg); break;
      case 'friki':      await percent.cmdFriki(sock, msg); break;
      case 'crack':      await percent.cmdCrack(sock, msg); break;
      case 'capo':       await percent.cmdCapo(sock, msg); break;
      case 'listo':      await percent.cmdListo(sock, msg); break;

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
        break;
    }
  } catch (err) {
    logger.error(`Command ${command} error: ${err.message}`);
    sock.sendMessage(jid, { text: `Error inesperado: ${err.message}` }, { quoted: msg }).catch(() => {});
  }

  if (config.autoTyping) sock.sendPresenceUpdate('paused', jid).catch(() => {});
}

module.exports = { handleMessage };
