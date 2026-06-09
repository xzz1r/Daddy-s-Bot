const { getState, setState, toggleGroup } = require('../utils/state');
const { formatUptime } = require('../utils/helpers');
const { isOwner, isGroupAdmin, getSender } = require('../utils/wa');
const config = require('../config');
const logger = require('../utils/logger');

// Captured once at startup (module load ≈ process start). Used for a real
// "uptime" — state.stats.startTime persists across restarts so it measured the
// bot's age, not how long this process has been running.
const PROCESS_START = Date.now();

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
  const uptime = formatUptime(Date.now() - PROCESS_START);
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
`*${config.botName}*  ·  by xz1s
Prefijo: *${p}*

━━━ *MÚSICA* ━━━
${p}play <canción>

━━━ *STICKERS* ━━━
${p}s — imagen/video a sticker
${p}ttp <texto> — texto a sticker
${p}toimg — sticker a imagen
${p}pfp @user — foto de perfil

━━━ *ACTIVIDAD* ━━━
${p}count — ranking de mensajes
${p}vs @a @b — comparar dos miembros
${p}inactivos — los más fantasmas
${p}top5 / ${p}top10 <tema>

━━━ *DINÁMICAS* ━━━
_(sin @ = a ti · con @ = a otro)_
${p}crack · ${p}hot · ${p}inteligencia
${p}feminidad · ${p}masculinidad
${p}gay · ${p}simp · ${p}rata · ${p}maricon
${p}friki · ${p}cerdo · ${p}inutil · ${p}femboy
${p}aura [@user] — aura acumulada
${p}aura top — ranking de aura
${p}duel @user <aura> — duelo por aura
${p}mog @a @b — 1v1 de looks
${p}ship [@a] [@b] — match
${p}robo @user [aura] — intentar robar aura (10min cooldown)
${p}dar @user <aura> — transferir aura a otro

━━━ *CASINO* ━━━
_Automático al escribir mensajes_
Tier 1 · cada 200 msgs · bono de aura
Tier 2 · cada 500 msgs · bono mayor
Tier 3 · cada 1000 msgs · bono máximo
_Jackpot de redención si tienes aura negativa_

━━━ *IA* ━━━
${p}g <pregunta> — Grok

━━━ *ADMIN* ━━━
${p}on · ${p}off
${p}tagall [texto]
${p}kick @user
${p}promote @user
${p}mute @user [min] · ${p}unmute @user
${p}del · ${p}close · ${p}open
${p}notifadmin on/off
${p}scan — señales sospechosas en el grupo

━━━ *OWNER* ━━━
${p}add <número>
${p}demote @user
${p}resetcount — borrar ranking
${p}antiadmin on/off
${p}antiempresa on/off
${p}antilink on/off
${p}clearcache · ${p}setgrok <key>

━━━ *BOT* ━━━
${p}ping · ${p}info`;

  await sock.sendMessage(jid, { text }, { quoted: msg });
}

module.exports = { cmdOn, cmdOff, cmdPing, cmdInfo, cmdHelp };

