const { getState, setState, toggleGroup } = require('../utils/state');
const { formatUptime } = require('../utils/helpers');
const { isOwner, isAdmin } = require('../utils/wa');
const config = require('../config');
const logger = require('../utils/logger');

// !on - turn bot on (in group or globally)
async function cmdOn(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const isGroup = jid.endsWith('@g.us');

  if (isGroup) {
    const canToggle = isOwner(sender, msg.key.fromMe, groupMeta) || isAdmin(groupMeta?.participants, sender);
    if (!canToggle) {
      return sock.sendMessage(jid, { text: 'Solo admins pueden usar este comando.' }, { quoted: msg });
    }
    await toggleGroup(jid, true);
    return sock.sendMessage(jid, { text: 'Bot *activado* en este grupo.' }, { quoted: msg });
  }

  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
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
    const canToggle = isOwner(sender, msg.key.fromMe, groupMeta) || isAdmin(groupMeta?.participants, sender);
    if (!canToggle) {
      return sock.sendMessage(jid, { text: 'Solo admins pueden usar este comando.' }, { quoted: msg });
    }
    await toggleGroup(jid, false);
    return sock.sendMessage(jid, { text: 'Bot *desactivado* en este grupo.' }, { quoted: msg });
  }

  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo el dueno puede usar este comando.' }, { quoted: msg });
  }

  await setState({ botEnabled: false });
  await sock.sendMessage(jid, { text: 'Bot *desactivado* globalmente.' }, { quoted: msg });
  logger.warn('Bot desactivado globalmente');
}

// !ping - latency check. Uses the WebSocket IQ ping (raw network RTT to
// WhatsApp servers) instead of round-tripping an encrypted message — that
// avoids the 700-1300ms E2E encryption + delivery overhead and gives a
// stable number that actually reflects connection quality.
async function cmdPing(sock, msg) {
  const jid = msg.key.remoteJid;

  let wsPing = null;
  if (typeof sock.query === 'function') {
    try {
      const start = Date.now();
      await sock.query({
        tag: 'iq',
        attrs: { to: 's.whatsapp.net', type: 'get', xmlns: 'w:p' },
        content: [{ tag: 'ping', attrs: {} }],
      });
      wsPing = Date.now() - start;
    } catch {}
  }

  await sock.sendMessage(jid, {
    text: wsPing !== null ? `*${wsPing}ms*` : 'Ping',
  });
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
`         *${config.botName}*
      by xz1s (Sebastian)
          Prefijo: ${p}
--------------------------------

*MUSICA*
  ${p}play <cancion>       reproducir audio

*STICKERS*
  ${p}s                    imagen o video a sticker
  ${p}ttp <texto>          texto a sticker
  ${p}toimg                sticker a imagen
  ${p}pfp @user            foto de perfil

*TOPS*
  ${p}top5 <tema>          top 5 aleatorio
  ${p}top10 <tema>         top 10 aleatorio
  ${p}count                ranking de mensajes

*DINAMICAS*
  ${p}sexy  ${p}crack  ${p}inteligencia  ${p}feminidad  ${p}masculinidad
  ${p}gay  ${p}maricon  ${p}simp  ${p}rata  ${p}friki  ${p}cerdo  ${p}inutil  ${p}femboy
  ${p}ship                 emparejar 2 miembros al azar
  ${p}ship @a @b           shipear a dos personas especificas
  ${p}ship @a              shiipearte con alguien
  Con @ mide a otro. Sin @ te mide a ti.

*IA*
  ${p}g <pregunta>         Grok sin filtros
  Responde un mensaje con ${p}g para dar contexto.

*ADMINISTRACION*
  ${p}tagall <texto>       mencionar a todos
  ${p}kick @a @b @c        expulsar uno o varios
  ${p}promote @user        ascender a admin
  ${p}demote @user         degradar a miembro
  ${p}mute @user [min]     silenciar (sin min muestra el tiempo restante)
  ${p}unmute @user         quitar silencio
  ${p}del                  borrar mensaje citado (y el !del)
  ${p}notifadmin on/off    notificaciones de admin
  ${p}antiadmin on/off     bloquear ascensos externos
  ${p}antiempresa on/off   expulsar cuentas Business
  Solo admins. antiadmin y antiempresa solo owner.

*CONTROL*
  ${p}on                   activar bot
  ${p}off                  desactivar bot
  ${p}ping                 latencia
  ${p}info                 estado y estadisticas

*OWNER*
  ${p}setgrok <key>        configurar API de Grok
  ${p}clearcache           borrar cache de musica
  Solo el owner del bot.`;

  await sock.sendMessage(jid, { text }, { quoted: msg });
}

module.exports = { cmdOn, cmdOff, cmdPing, cmdInfo, cmdHelp };

