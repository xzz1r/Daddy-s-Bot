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

// !Commands / !ayuda / !help / !menu
async function cmdHelp(sock, msg) {
  const jid = msg.key.remoteJid;
  const p = config.prefix;

  const text = `╔═══════════════════════════╗
║                           ║
║     👑  *xz1s (Sebastian)*  👑
║         OWNER DEL BOT
║                           ║
║      *${config.botName}*
║                           ║
╚═══════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🎵  *MÚSICA*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
┣ ${p}Playsong <canción>   › Enviar audio
┣ ${p}play <canción>       › Alias
┗ ${p}buscar <canción>     › Listar resultados

━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🎭  *STICKERS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
┣ ${p}s                    › Imagen/video/sticker → sticker
┗ ${p}ttp <texto>          › Texto → sticker

━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🏆  *TOPS DEL GRUPO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
┣ ${p}top5 <tema>          › Top 5 aleatorio
┣ ${p}top10 <tema>         › Top 10 aleatorio
┗ ${p}count                › Ranking de mensajes
   _Mín. 10 mensajes para aparecer en tops_

━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🎯  *DINÁMICAS (% sobre alguien)*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
┣ ${p}ship                 › Empareja 2 al azar
┣ ${p}gay @user
┣ ${p}simp @user
┣ ${p}sexy @user
┣ ${p}rata @user
┣ ${p}gilipollas @user
┣ ${p}subnormal @user
┣ ${p}imbecil @user
┣ ${p}capullo @user
┣ ${p}pringado @user
┣ ${p}mamon @user
┣ ${p}pijo @user
┣ ${p}friki @user
┣ ${p}chorizo @user
┣ ${p}guarro @user
┣ ${p}paleto @user
┗ ${p}cutre @user
   _Sin @user → te mide a vos mismo_

━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🤖  *INTELIGENCIA ARTIFICIAL (Grok)*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
┣ ${p}g <pregunta>         › Pregunta a Grok
┗ ${p}setgrok <key>        › Configurar key (owner, una sola vez)
   _Respondé a un mensaje con ${p}g para usarlo como contexto_
   _Sin filtros, cualquier tema_

━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📢  *UTILIDADES*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
┗ ${p}todos <aviso>        › Etiquetar a todos (admin)

━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📊  *TOPS GLOBALES*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
┗ ${p}top <categoria> [n]
   _musica · peliculas · series · juegos_
   _youtube · spotify · anime · paises_
   _cripto · apps_

━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ⚙️  *CONTROL*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
┣ ${p}on                   › Activar bot
┣ ${p}off                  › Desactivar bot
┣ ${p}ping                 › Latencia
┗ ${p}info                 › Estado y estadísticas

╔═══════════════════════════╗
║    Prefijo: *${p}*    │   ${p}Commands
║       👑 *xz1s (Sebastian)*
╚═══════════════════════════╝`;

  await sock.sendMessage(jid, { text }, { quoted: msg });
}

module.exports = { cmdOn, cmdOff, cmdPing, cmdInfo, cmdHelp, isOwner };
