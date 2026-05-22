const { getState, setState, toggleGroup, isBotEnabled, incrementStat } = require('../utils/state');
const { formatUptime } = require('../utils/helpers');
const config = require('../config');
const logger = require('../utils/logger');

function isOwner(jid) {
  const num = jid.replace('@s.whatsapp.net', '').replace('@g.us', '');
  return num === config.ownerNumber || config.ownerNumber.includes(num);
}

function isAdmin(participants, jid) {
  const participant = participants?.find(p => p.id === jid);
  return participant?.admin === 'admin' || participant?.admin === 'superadmin';
}

// !on - turn bot on (in group or globally)
async function cmdOn(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const isGroup = jid.endsWith('@g.us');

  if (isGroup) {
    const canToggle = isOwner(sender) || isAdmin(groupMeta?.participants, sender);
    if (!canToggle) {
      return sock.sendMessage(jid, { text: '❌ Solo admins pueden usar este comando.' }, { quoted: msg });
    }
    await toggleGroup(jid, true);
    return sock.sendMessage(jid, { text: '✅ Bot *activado* en este grupo.' }, { quoted: msg });
  }

  if (!isOwner(sender)) {
    return sock.sendMessage(jid, { text: '❌ Solo el dueño puede usar este comando.' }, { quoted: msg });
  }

  await setState({ botEnabled: true });
  await sock.sendMessage(jid, { text: '✅ Bot *activado* globalmente.' }, { quoted: msg });
  logger.success('Bot activado globalmente');
}

// !off - turn bot off (in group or globally)
async function cmdOff(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const isGroup = jid.endsWith('@g.us');

  if (isGroup) {
    const canToggle = isOwner(sender) || isAdmin(groupMeta?.participants, sender);
    if (!canToggle) {
      return sock.sendMessage(jid, { text: '❌ Solo admins pueden usar este comando.' }, { quoted: msg });
    }
    await toggleGroup(jid, false);
    return sock.sendMessage(jid, { text: '🔴 Bot *desactivado* en este grupo.' }, { quoted: msg });
  }

  if (!isOwner(sender)) {
    return sock.sendMessage(jid, { text: '❌ Solo el dueño puede usar este comando.' }, { quoted: msg });
  }

  await setState({ botEnabled: false });
  await sock.sendMessage(jid, { text: '🔴 Bot *desactivado* globalmente.' }, { quoted: msg });
  logger.warn('Bot desactivado globalmente');
}

// !ping - latency check
async function cmdPing(sock, msg) {
  const jid = msg.key.remoteJid;
  const start = Date.now();
  await sock.sendMessage(jid, { text: '🏓 Pong!' }, { quoted: msg });
  const latency = Date.now() - start;
  await sock.sendMessage(jid, { text: `⚡ Latencia: *${latency}ms*` });
}

// !info - bot status
async function cmdInfo(sock, msg) {
  const jid = msg.key.remoteJid;
  const state = getState();
  const uptime = formatUptime(Date.now() - (state.stats?.startTime || Date.now()));
  const status = state.botEnabled ? '🟢 Activo' : '🔴 Inactivo';

  const text = `╔══════════════════╗
║   *${config.botName}* 🤖
╠══════════════════╣
║ Estado: ${status}
║ Uptime: ⏱ ${uptime}
║ Mensajes: 📨 ${state.stats?.messagesReceived || 0}
║ Comandos: ⚡ ${state.stats?.commandsExecuted || 0}
║ Stickers: 🎭 ${state.stats?.stickersCreated || 0}
║ Música: 🎵 ${state.stats?.musicPlayed || 0}
║ Prefijo: ${config.prefix}
╚══════════════════╝`;

  await sock.sendMessage(jid, { text }, { quoted: msg });
}

// !ayuda / !help / !menu
async function cmdHelp(sock, msg) {
  const jid = msg.key.remoteJid;
  const p = config.prefix;

  const text = `🤖 *${config.botName} - Comandos*

🎵 *MÚSICA*
• ${p}Playsong <canción> - Reproducir música
• ${p}buscar <canción> - Buscar canciones

🎭 *STICKERS*
• ${p}s - Crear sticker (responde imagen/video)
  _Soporta: jpg, png, gif, mp4 (animado 60fps)_

📊 *TOPS*
• ${p}top <cat> [cantidad] - Rankings
  _Categorías: musica, peliculas, series, juegos,_
  _youtube, spotify, anime, paises, cripto, apps_
  _Ejemplo: ${p}top cripto 20_

⚙️ *CONTROL*
• ${p}on - Activar bot
• ${p}off - Desactivar bot
• ${p}ping - Ver latencia
• ${p}info - Estado del bot
• ${p}ayuda - Este menú

_Prefijo actual: *${p}*_`;

  await sock.sendMessage(jid, { text }, { quoted: msg });
}

module.exports = { cmdOn, cmdOff, cmdPing, cmdInfo, cmdHelp, isOwner };
