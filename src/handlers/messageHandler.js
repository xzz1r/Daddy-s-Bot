const config = require('../config');
const { isBotEnabled, incrementStat, isAntiLinkEnabled } = require('../utils/state');
const { increment: incrementMsgCount } = require('../utils/messageCounter');
const { cmdPlay, cmdClearCache } = require('../commands/music');
const { cmdSticker } = require('../commands/sticker');
const { cmdTopRandom } = require('../commands/topsRandom');
const { cmdCount, cmdResetCount } = require('../commands/count');
const { cmdGrok, cmdSetGrokKey } = require('../commands/ai');
const { cmdTodos, cmdKick, cmdDel, cmdMute, cmdUnmute, cmdPromote, cmdDemote, cmdNotifAdmin, cmdAntiAdmin, cmdAntiBusiness, isMuted, cmdAdd, cmdAntiLink, cmdClose, cmdOpen } = require('../commands/group');
const { cmdShip } = require('../commands/ship');
const { cmdTtp } = require('../commands/ttp');
const { cmdToImg } = require('../commands/toimg');
const { cmdPfp } = require('../commands/pfp');
const { cmdGay, cmdSimp, cmdHot, cmdRata, cmdMaricon, cmdFriki, cmdCrack, cmdInteligencia, cmdCerdo, cmdFeminidad, cmdMasculinidad, cmdInutil, cmdFemboy } = require('../commands/percent');
const { cmdAura } = require('../commands/aura');
const { cmdMog } = require('../commands/mog');
const { cmdVs, cmdInactivos } = require('../commands/activity');
const { cmdOn, cmdOff, cmdPing, cmdInfo, cmdHelp } = require('../commands/social');
const { isOwner, isGroupAdmin, extractText, rememberMapping, getSender } = require('../utils/wa');
const logger = require('../utils/logger');

// Hosts allowed without penalty (only a "send once" reminder). Matched against
// the bare host so subdomains (m.youtube.com, www.instagram.com) pass but
// look-alikes (youtube.com.evil.com) do NOT.
const LINK_WHITELIST = /(?:^|\.)(?:youtube\.com|youtu\.be|instagram\.com|instagr\.am)$/i;

// Conservative URL detector: needs an explicit scheme/www or a known invite
// domain, so plain talk like "node.js" or "archivo.txt" isn't treated as a link.
const URL_RE = /(?:https?:\/\/|www\.)[^\s]+|(?:t\.me|chat\.whatsapp\.com)\/[^\s]+/gi;

function hostOf(url) {
  let s = String(url).replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  const cut = s.search(/[/?#]/);
  if (cut >= 0) s = s.slice(0, cut);
  return s.toLowerCase();
}

// 'none' = no links; 'whitelisted' = only YouTube/Instagram links present;
// 'blocked' = at least one non-whitelisted link (websites, WhatsApp/Telegram
// invites, etc.) — those get the sender kicked and the message deleted.
function classifyLinks(text) {
  const matches = text.match(URL_RE);
  if (!matches) return 'none';
  let whitelisted = false;
  for (const m of matches) {
    if (LINK_WHITELIST.test(hostOf(m))) { whitelisted = true; continue; }
    return 'blocked';
  }
  return whitelisted ? 'whitelisted' : 'none';
}

// Commands that need group metadata — skip the network call for everything else
const NEEDS_META = new Set([
  'on','off','tagall','todos','all','everyone',
  'kick','expulsar','del','borrar','delete','add','agregar',
  'ship','top5','top10','mute','unmute','desmute',
  'promote','ascender','demote','degradar','notifadmin','antiadmin','antiempresa','antibusiness',
  'antilink','close','cerrar','open','abrir',
  's','sticker','stk','play','playsong','playaudio','ttp',
  'gay','simp','sexy','hot','rata','maricon','maricón','friki',
  'crack','inteligencia','cerdo','feminidad','masculinidad','inutil','femboy',
  'aura','inactivos','inactivo','fantasma','fantasmas','vs','versus','mog','moggear',
  'count','resetcount','resetconteo',
  // Owner-gated commands also need meta in groups to resolve LID → phone
  // for isOwner checks (otherwise co-owners always fail in modern groups).
  'clearcache','borracache','setgrok','setkey','whoami',
]);

// Per-user cooldown on heavy commands (!s, !play, !ttp) — 7 s, owner/admin exempt.
const COOLDOWN_MS = 7000;
const cooldowns = new Map(); // 'groupJid|sender' -> timestamp

// Throttle whitelist reminder to once per user per 5 min (no spam on every YT link).
const ANTILINK_REMINDER_TTL = 5 * 60 * 1000;
const antilinkReminders = new Map(); // 'groupJid|sender' -> timestamp

// Group metadata cache: 30s TTL, bounded at 500 entries (FIFO eviction).
// Bot.js calls invalidateGroupMeta() on participant changes so the cache
// never serves stale member lists right after joins/kicks/promotes.
const META_TTL = 30_000;
const META_MAX = 500;
const metaCache = new Map();

// Hard timeout on the groupMetadata call — without this, a stalled WebSocket
// can hang the entire message handler for tens of seconds (or forever).
const META_FETCH_TIMEOUT = 8000;

async function getGroupMeta(sock, jid) {
  const c = metaCache.get(jid);
  if (c && Date.now() - c.ts < META_TTL) return c.meta;
  try {
    const meta = await Promise.race([
      sock.groupMetadata(jid),
      new Promise((_, rej) => setTimeout(() => rej(new Error('groupMetadata timeout')), META_FETCH_TIMEOUT)),
    ]);
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

// Returns remaining cooldown seconds (>0 = blocked), 0 = proceed.
// Sets the timestamp only when the command is allowed through.
function checkCooldown(jid, sender, fromMe, groupMeta) {
  if (isOwner(sender, fromMe, groupMeta) || isGroupAdmin(sender, fromMe, groupMeta)) return 0;
  const key = `${jid}|${sender}`;
  const now = Date.now();
  const last = cooldowns.get(key);
  if (last && now - last < COOLDOWN_MS) return Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
  cooldowns.set(key, now);
  return 0;
}

async function handleMessage(sock, msg) {
  if (!msg.message) return;

  const jid = msg.key.remoteJid;
  const sender = getSender(msg);
  const text = extractText(msg).trim();

  // Some Baileys versions surface both LID (msg.key.participant) and phone
  // (msg.key.participantPn) on every group message. Free LID→phone training
  // data — record it so owner checks resolve even without groupMeta.
  if (msg.key.participantPn && msg.key.participant) {
    rememberMapping(msg.key.participant, msg.key.participantPn);
  }

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

  // Anti-link: YouTube/Instagram get a "send once" reminder; any other link
  // (websites, WhatsApp/Telegram invites, etc.) → delete the message and kick
  // the sender. Admins and the owner tier are exempt.
  if (jid.endsWith('@g.us') && text && isAntiLinkEnabled(jid)) {
    const verdict = classifyLinks(text);
    if (verdict !== 'none') {
      const meta = await getGroupMeta(sock, jid);
      if (meta && !isGroupAdmin(sender, msg.key.fromMe, meta)) {
        if (verdict === 'blocked') {
          sock.sendMessage(jid, { delete: { remoteJid: jid, fromMe: false, id: msg.key.id, participant: sender } }).catch(() => {});
          sock.groupParticipantsUpdate(jid, [sender], 'remove').catch(() => {});
          sock.sendMessage(jid, {
            text: `@${sender.split('@')[0]} expulsado por enviar enlaces no permitidos.`,
            mentions: [sender],
          }).catch(() => {});
          return;
        }
        // whitelisted → gentle reminder once per user per 5 min, no deletion or kick
        const rKey = `${jid}|${sender}`;
        const lastR = antilinkReminders.get(rKey);
        if (!lastR || Date.now() - lastR > ANTILINK_REMINDER_TTL) {
          antilinkReminders.set(rKey, Date.now());
          sock.sendMessage(jid, {
            text: 'Links de *YouTube* e *Instagram* permitidos. No spamees.',
          }, { quoted: msg }).catch(() => {});
        }
      }
    }
  }

  if (!text.startsWith(config.prefix)) return;

  const args = text.slice(config.prefix.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();
  if (!command) return;

  // Check mute before anything else — but the owner tier is never silenced, so a
  // stale or malicious mute can't lock the owner/co-owner out of their own bot.
  if (isMuted(jid, sender) && !isOwner(sender, msg.key.fromMe, null)) return;

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
      case 'play': {
        const wait = checkCooldown(jid, sender, msg.key.fromMe, groupMeta);
        if (wait > 0) { await sock.sendMessage(jid, { text: `Espera ${wait}s para volver a usar este comando.` }, { quoted: msg }); break; }
        await cmdPlay(sock, msg, args);
        break;
      }

      case 'clearcache':
      case 'borracache':
        if (isOwner(sender, msg.key.fromMe, groupMeta)) {
          await cmdClearCache(sock, msg);
        } else {
          await sock.sendMessage(jid, { text: 'Solo el owner puede usar este comando.' }, { quoted: msg });
        }
        break;

      case 'whoami':
        await sock.sendMessage(jid, {
          text: `Tu JID: *${sender}*\nOwner: *${isOwner(sender, msg.key.fromMe, groupMeta) ? 'Si' : 'No'}*`,
        }, { quoted: msg });
        break;

      case 's':
      case 'sticker':
      case 'stk': {
        const wait = checkCooldown(jid, sender, msg.key.fromMe, groupMeta);
        if (wait > 0) { await sock.sendMessage(jid, { text: `Espera ${wait}s para volver a usar este comando.` }, { quoted: msg }); break; }
        await cmdSticker(sock, msg, groupMeta);
        break;
      }

      case 'top5':
        await cmdTopRandom(sock, msg, 5, args);
        break;

      case 'top10':
        await cmdTopRandom(sock, msg, 10, args);
        break;

      case 'count':
        await cmdCount(sock, msg, groupMeta, args);
        break;

      case 'resetcount':
      case 'resetconteo':
        await cmdResetCount(sock, msg, groupMeta);
        break;

      case 'g':
      case 'ai':
      case 'grok':
        await cmdGrok(sock, msg, args);
        break;

      case 'setgrok':
      case 'setkey':
        await cmdSetGrokKey(sock, msg, args, groupMeta);
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
        await cmdAntiAdmin(sock, msg, args, groupMeta);
        break;

      case 'antiempresa':
      case 'antibusiness':
        await cmdAntiBusiness(sock, msg, args, groupMeta);
        break;

      case 'antilink':
        await cmdAntiLink(sock, msg, args, groupMeta);
        break;

      case 'close':
      case 'cerrar':
        await cmdClose(sock, msg, groupMeta);
        break;

      case 'open':
      case 'abrir':
        await cmdOpen(sock, msg, groupMeta);
        break;

      case 'add':
      case 'agregar':
        await cmdAdd(sock, msg, args, groupMeta);
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

      case 'ttp': {
        const wait = checkCooldown(jid, sender, msg.key.fromMe, groupMeta);
        if (wait > 0) { await sock.sendMessage(jid, { text: `Espera ${wait}s para volver a usar este comando.` }, { quoted: msg }); break; }
        await cmdTtp(sock, msg, args);
        break;
      }

      case 'toimg':
      case 'stimg':
        await cmdToImg(sock, msg);
        break;

      case 'pfp':
      case 'foto':
        await cmdPfp(sock, msg);
        break;

      case 'gay':        await cmdGay(sock, msg, groupMeta); break;
      case 'simp':       await cmdSimp(sock, msg, groupMeta); break;
      case 'sexy':
      case 'hot':        await cmdHot(sock, msg, groupMeta); break;
      case 'rata':       await cmdRata(sock, msg, groupMeta); break;
      case 'maricon':
      case 'maricón':    await cmdMaricon(sock, msg, groupMeta); break;
      case 'friki':      await cmdFriki(sock, msg, groupMeta); break;
      case 'crack':          await cmdCrack(sock, msg, groupMeta); break;
      case 'inteligencia':   await cmdInteligencia(sock, msg, groupMeta); break;
      case 'cerdo':          await cmdCerdo(sock, msg, groupMeta); break;
      case 'feminidad':      await cmdFeminidad(sock, msg, groupMeta); break;
      case 'masculinidad':   await cmdMasculinidad(sock, msg, groupMeta); break;
      case 'inutil':         await cmdInutil(sock, msg, groupMeta); break;
      case 'femboy':         await cmdFemboy(sock, msg, groupMeta); break;

      case 'aura':           await cmdAura(sock, msg, args, groupMeta); break;

      case 'mog':
      case 'moggear':
        await cmdMog(sock, msg, groupMeta);
        break;

      case 'vs':
      case 'versus':
        await cmdVs(sock, msg, args, groupMeta);
        break;

      case 'inactivos':
      case 'inactivo':
      case 'fantasma':
      case 'fantasmas':
        await cmdInactivos(sock, msg, groupMeta);
        break;

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
