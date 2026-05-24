const { getState, setState, toggleGroup, isBotEnabled, incrementStat } = require('../utils/state');
const { formatUptime } = require('../utils/helpers');
const config = require('../config');
const logger = require('../utils/logger');

// fromMe = true means the message was sent from the bot's own linked account = owner
function isOwner(jid, fromMe) {
  if (fromMe) return true;
  const num = jid.replace(/@[^@]+$/, '').replace(/\D/g, '');
  const owner = String(config.ownerNumber).replace(/\D/g, '');
  return num === owner || num.endsWith(owner) || owner.endsWith(num);
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
    const canToggle = isOwner(sender, msg.key.fromMe) || isAdmin(groupMeta?.participants, sender);
    if (!canToggle) {
      return sock.sendMessage(jid, { text: 'Solo admins pueden usar este comando.' }, { quoted: msg });
    }
    await toggleGroup(jid, true);
    return sock.sendMessage(jid, { text: 'Bot *activado* en este grupo.' }, { quoted: msg });
  }

  if (!isOwner(sender, msg.key.fromMe)) {
    return sock.sendMessage(jid, { text: 'Solo el dueno puede usar este comando.' }, { quoted: msg });
  }

  await setState({ botEnabled: true });
  await sock.sendMessage(jid, { text: 'Bot *activado* globalmente.' }, { quoted: msg });
  logger.success('Bot activado globalmente');
}

// !off - turn bot off (in group or globally)
async function cmdOff(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const isGroup = jid.endsWith('@g.us');

  if (isGroup) {
    const canToggle = isOwner(sender, msg.key.fromMe) || isAdmin(groupMeta?.participants, sender);
    if (!canToggle) {
      return sock.sendMessage(jid, { text: 'Solo admins pueden usar este comando.' }, { quoted: msg });
    }
    await toggleGroup(jid, false);
    return sock.sendMessage(jid, { text: 'Bot *desactivado* en este grupo.' }, { quoted: msg });
  }

  if (!isOwner(sender, msg.key.fromMe)) {
    return sock.sendMessage(jid, { text: 'Solo el dueno puede usar este comando.' }, { quoted: msg });
  }

  await setState({ botEnabled: false });
  await sock.sendMessage(jid, { text: 'Bot *desactivado* globalmente.' }, { quoted: msg });
  logger.warn('Bot desactivado globalmente');
}

// !ping - latency check
async function cmdPing(sock, msg) {
  const jid = msg.key.remoteJid;
  const delivery = Date.now() - (msg.messageTimestamp * 1000);
  const start = Date.now();
  await sock.sendMessage(jid, { text: '...' }, { quoted: msg });
  const send = Date.now() - start;
  sock.sendMessage(jid, { text: `*${send}ms* envio  .  *${delivery}ms* entrega WA` }, { quoted: msg }).catch(() => {});
}

// !info - bot status
async function cmdInfo(sock, msg) {
  const jid = msg.key.remoteJid;
  const state = getState();
  const uptime = formatUptime(Date.now() - (state.stats?.startTime || Date.now()));
  const status = state.botEnabled ? 'Activo' : 'Inactivo';

  const text =
`*${config.botName}*

Estado:    ${status}
Uptime:    ${uptime}
Mensajes:  ${state.stats?.messagesReceived || 0}
Comandos:  ${state.stats?.commandsExecuted || 0}
Stickers:  ${state.stats?.stickersCreated || 0}
Musica:    ${state.stats?.musicPlayed || 0}
Prefijo:   ${config.prefix}`;

  await sock.sendMessage(jid, { text }, { quoted: msg });
}

// !Commands / !ayuda / !help / !menu
async function cmdHelp(sock, msg) {
  const jid = msg.key.remoteJid;
  const p = config.prefix;

  const text =
`*${config.botName}*  by xz1s (Sebastian)
prefijo *${p}*

*MUSICA*
*${p}play* <cancion>      reproducir audio
*${p}buscar* <cancion>    buscar canciones

*STICKERS*
*${p}s*                   imagen o video a sticker
*${p}ttp* <texto>         texto a sticker
*${p}toimg*              sticker a imagen
*${p}pfp* @user          foto de perfil de alguien

*TOPS*
*${p}top5* <tema>         top 5 aleatorio del grupo
*${p}top10* <tema>        top 10 aleatorio del grupo
*${p}count*               ranking de mensajes

*DINAMICAS*
*${p}ship*   *${p}sexy*   *${p}crack*   *${p}inteligencia*   *${p}cerdo*
*${p}feminidad*   *${p}masculinidad*   *${p}inutil*
*${p}gay*   *${p}maricon*   *${p}simp*   *${p}rata*   *${p}friki*
_Con @ mide a otro miembro. Sin @ te mide a ti._

*INTELIGENCIA ARTIFICIAL*
*${p}g* <pregunta>        Grok sin filtros
_Responde a un mensaje con ${p}g para dar contexto_

*ADMINISTRACION*
*${p}tagall* <texto>      mencionar a todos
*${p}kick* @user          expulsar miembro
*${p}promote* @user       ascender a admin
*${p}demote* @user        degradar a miembro
*${p}mute* @user [min]    silenciar comandos
*${p}unmute* @user        quitar silencio
*${p}del*                 borrar mensaje citado
*${p}notifadmin* on/off   notificaciones de admin
_Solo admins_

*CONTROL*
*${p}on*                  activar bot
*${p}off*                 desactivar bot
*${p}ping*                latencia
*${p}info*                estado y estadisticas

*OWNER*
*${p}setgrok* <key>       configurar API key de Grok
*${p}clearcache*          borrar cache de musica
_Solo owner del bot_`;

  await sock.sendMessage(jid, { text }, { quoted: msg });
}

module.exports = { cmdOn, cmdOff, cmdPing, cmdInfo, cmdHelp, isOwner };
