const config = require('../config');
const { isBotEnabled, incrementStat } = require('../utils/state');
const { increment: incrementMsgCount } = require('../utils/messageCounter');
const { cmdPlay, cmdClearCache } = require('../commands/music');
const { cmdSticker } = require('../commands/sticker');
const { cmdTopRandom } = require('../commands/topsRandom');
const { cmdCount } = require('../commands/count');
const { cmdGrok, cmdSetGrokKey } = require('../commands/ai');
const { cmdTodos, cmdKick, cmdDel, cmdMute, cmdUnmute, cmdPromote, cmdDemote, cmdNotifAdmin, cmdAntiAdmin, cmdAntiBusiness, isMuted } = require('../commands/group');
const { cmdShip } = require('../commands/ship');
const { cmdTtp } = require('../commands/ttp');
const { cmdToImg } = require('../commands/toimg');
const { cmdPfp } = require('../commands/pfp');
const percent = require('../commands/percent');
const { cmdOn, cmdOff, cmdPing, cmdInfo, cmdHelp } = require('../commands/social');
const { isOwner, isAdmin, extractText } = require('../utils/wa');
const logger = require('../utils/logger');

// Detects http/https links, www. links, and common invite/spam patterns
const LINK_RE = /https?:\/\/[^\s]{4,}|www\.[^\s]{4,}|(?:t\.me|chat\.whatsapp\.com)\/[^\s]+/i;

// Commands that need group metadata — skip the network call for everything else
const NEEDS_META = new Set([
  'on','off','tagall','todos','all','everyone',
  'kick','expulsar','del','borrar','delete',
  'ship','top5','top10','mute','unmute','desmute',
  'promote','ascender','demote','degradar','notifadmin','antiadmin','antiempresa','antibusiness',
  'gay','simp','sexy','hot','rata','maricon','maricón','friki',
  'crack','inteligencia','cerdo','feminidad','masculinidad','inutil',
  'count',
]);

// Group metadata cache: 30s TTL, bounded at 500 entries (FIFO eviction).
// Bot.js calls invalidateGroupMeta() on participant changes so the cache
// never serves stale member lists right after joins/kicks/promotes.
const META_TTL = 30_000;
const META_MAX = 500;
const metaCache = new Map();

async function getGroupMeta(sock, jid) {
  const c = metaCache.get(jid);
  if (c && Date.now() - c.ts < META_TTL) return c.meta;
  try {
    const meta = await sock.groupMetadata(jid);
    if (metaCache.size >= META_MAX) {
      metaCache.delete(metaCache.keys().next().value);
    }
    metaCache.set(jid, { meta, ts: Date.now() });
    return meta;
  } catch {
    return c?.meta ?? null;
  }
}

function invalidateGroupMeta(jid) {
  metaCache.delete(jid);
}

async function handleMessage(sock, msg) {
  if (!msg.message) return;

  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const text = extractText(msg).trim();

  // Skip own messages that aren't commands (avoids bot responding to itself)
  // fromMe = true when the owner sends from their linked phone — still allow commands
  if (msg.key.fromMe && !text.startsWith(config.prefix)) return;

  // Non-blocking counters — never delay command execution.
  // Don't count the bot's own messages so the owner doesn't inflate their rank.
  incrementStat('messagesReceived');
  if (!msg.key.fromMe && jid.endsWith('@g.us') && sender) {
    incrementMsgCount(jid, sender).catch(() => {});
  }

  // Sync in-memory check — no async overhead.
  // Exact-command match so things like "!once" don't bypass disabled state.
  if (!isBotEnabled(jid)) {
    const rest = text.startsWith(config.prefix) ? text.slice(config.prefix.length) : '';
    const firstWord = rest.split(/\s+/, 1)[0].toLowerCase();
    if (firstWord !== 'on') return;
  }

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
        await cmdCount(sock, msg, groupMeta, args);
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

      case 'antiadmin':
        await cmdAntiAdmin(sock, msg, args);
        break;

      case 'antiempresa':
      case 'antibusiness':
        await cmdAntiBusiness(sock, msg, args, groupMeta);
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

      case 'toimg':
      case 'stimg':
        await cmdToImg(sock, msg);
        break;

      case 'pfp':
      case 'foto':
        await cmdPfp(sock, msg);
        break;

      case 'gay':        await percent.cmdGay(sock, msg, groupMeta); break;
      case 'simp':       await percent.cmdSimp(sock, msg, groupMeta); break;
      case 'sexy':
      case 'hot':        await percent.cmdHot(sock, msg, groupMeta); break;
      case 'rata':       await percent.cmdRata(sock, msg, groupMeta); break;
      case 'maricon':
      case 'maricón':    await percent.cmdMaricon(sock, msg, groupMeta); break;
      case 'friki':      await percent.cmdFriki(sock, msg, groupMeta); break;
      case 'crack':          await percent.cmdCrack(sock, msg, groupMeta); break;
      case 'inteligencia':   await percent.cmdInteligencia(sock, msg, groupMeta); break;
      case 'cerdo':          await percent.cmdCerdo(sock, msg, groupMeta); break;
      case 'feminidad':      await percent.cmdFeminidad(sock, msg, groupMeta); break;
      case 'masculinidad':   await percent.cmdMasculinidad(sock, msg, groupMeta); break;
      case 'inutil':         await percent.cmdInutil(sock, msg, groupMeta); break;

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

}

module.exports = { handleMessage, invalidateGroupMeta };
