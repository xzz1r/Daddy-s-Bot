const { getState, setState, toggleGroup } = require('../utils/state');
const { formatUptime } = require('../utils/helpers');
const { isOwner, isGroupAdmin, getSender } = require('../utils/wa');
const config = require('../config');
const logger = require('../utils/logger');

// !on - turn bot on (in group or globally)
async function cmdOn(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);
  const isGroup = jid.endsWith('@g.us');

  if (isGroup) {
    const canToggle = isGroupAdmin(sender, msg.key.fromMe, groupMeta);
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
  const sender = getSender(msg);
  const isGroup = jid.endsWith('@g.us');

  if (isGroup) {
    const canToggle = isGroupAdmin(sender, msg.key.fromMe, groupMeta);
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
`*${config.botName}*  ·  by xz1s (Sebastian)
Prefijo: *${p}*
──────────────────────────────

*MÚSICA*
${p}play <canción> — buscar y enviar audio

*STICKERS*
${p}s — imagen o video → sticker
${p}ttp <texto> — texto → sticker
${p}toimg — sticker → imagen
${p}pfp @user — foto de perfil

*ACTIVIDAD*
${p}count — ranking de mensajes del grupo
${p}top5 / ${p}top10 <tema> — top aleatorio de cualquier cosa
${p}vs @a @b — comparar actividad real de dos miembros
${p}inactivos — los más fantasmas del grupo

*DINÁMICAS*
_(sin @ te mide a vos · con @ mide a otro)_
${p}crack  ${p}hot  ${p}inteligencia  ${p}feminidad  ${p}masculinidad
${p}gay  ${p}simp  ${p}rata  ${p}maricon  ${p}friki  ${p}cerdo  ${p}inutil  ${p}femboy
${p}aura [@user] — puntos de aura del universo
${p}mog @a @b — mog check 1v1 de looks
${p}ship [@a] [@b] — probabilidad de match

*IA*
${p}g <pregunta> — Grok sin filtros
_(respondé un mensaje con ${p}g para dar contexto)_

*ADMIN*  _(requiere ser admin del grupo)_
${p}on / ${p}off — activar o desactivar el bot aquí
${p}tagall [texto] — mencionar a todos los miembros
${p}add <número> — agregar miembro por teléfono
${p}kick @user — expulsar uno o varios
${p}promote @user — ascender a admin
${p}demote @user — bajar a miembro
${p}mute @user [min] — silenciar (sin minutos = ver tiempo restante)
${p}unmute @user — quitar silencio
${p}del — borrar el mensaje citado
${p}close / ${p}open — cerrar o abrir escritura del grupo
${p}notifadmin on/off — avisos de cambios de admins

_(requiere ser owner del grupo)_
${p}antiadmin on/off — bloquear ascensos externos al bot
${p}antiempresa on/off — expulsar cuentas Business automáticamente
${p}antilink on/off — filtrar links (YouTube e Instagram quedan ok)

*CONTROL*
${p}ping — latencia del bot
${p}info — estado y estadísticas
${p}clearcache — limpiar caché de música  _(owner bot)_
${p}setgrok <key> — configurar API de Grok  _(owner bot)_`;

  await sock.sendMessage(jid, { text }, { quoted: msg });
}

module.exports = { cmdOn, cmdOff, cmdPing, cmdInfo, cmdHelp };

