const { getState, setState, toggleGroup } = require('../utils/state');
const { formatUptime } = require('../utils/helpers');
const { isOwner, isGroupAdmin, getSender } = require('../utils/wa');
const { getCasinoCount, msUntilReset } = require('../utils/casinoStore');
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

// !casino — daily casino progress for the sender
async function cmdCasino(sock, msg) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo funciona en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);
  const [count, ms] = await Promise.all([
    getCasinoCount(jid, sender),
    msUntilReset(jid),
  ]);

  const fmt = n => n.toLocaleString('es-ES');

  const n200  = Math.ceil((count + 1) / 200)  * 200;
  const n500  = Math.ceil((count + 1) / 500)  * 500;
  const n1000 = Math.ceil((count + 1) / 1000) * 1000;
  const next  = Math.min(n200, n500, n1000);
  const tier  = next % 1000 === 0 ? 3 : next % 500 === 0 ? 2 : 1;
  const remaining = next - count;

  const tierLabel = tier === 3 ? 'Tier 3 (1000 msgs)' : tier === 2 ? 'Tier 2 (500 msgs)' : 'Tier 1 (200 msgs)';

  const hours = Math.floor(ms / 3_600_000);
  const mins  = Math.floor((ms % 3_600_000) / 60_000);
  const resetStr = ms > 0 ? `${hours}h ${mins}min` : 'pronto';

  const text =
    `🎰 *CASINO — HOY*\n\n` +
    `Mensajes hoy: *${fmt(count)}*\n` +
    `Próximo bono: ${tierLabel} — faltan *${fmt(remaining)}* msgs\n\n` +
    `_Reset en ${resetStr}_`;

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
${p}pfp @user | ${p}pfp wa.me/<num> — foto de perfil
${p}fk @user | wa.me/<num> — análisis anti-fake con puntaje

━━━ *ACTIVIDAD* ━━━
${p}count — ranking de mensajes
${p}vs @a @b — comparar dos miembros
${p}inactivos — fantasmas del grupo
${p}top5 / ${p}top10 <tema>

━━━ *DINÁMICAS* ━━━
_(sin @ = a ti mismo · con @ = a otro)_
${p}crack · ${p}hot/${p}sexy · ${p}inteligencia
${p}feminidad · ${p}masculinidad
${p}gay · ${p}simp · ${p}rata · ${p}maricon
${p}friki · ${p}cerdo · ${p}inutil · ${p}femboy
${p}perdedor · ${p}ganador
${p}mog @a @b — 1v1 de looks
${p}ship [@a] [@b] — compatibilidad (o responder a alguien)
${p}roast @user — autopsia pública (o responder a alguien)

━━━ *AURA* ━━━
${p}aura [@user] — ver aura · sin @ tiras tú
${p}aura top — ranking del grupo
${p}duel @user [cantidad] — duelo por aura
${p}robo @user [cantidad] — intentar robar aura
${p}dar @user <cantidad> — transferir aura
_Bonos diarios (contador reinicia c/24h):_
· Tier 1 · 200 msgs · mín *20.000* aura
· Tier 2 · 500 msgs · mín *60.000* aura
· Tier 3 · 1000 msgs · mín *150.000* aura
_Jackpot de redención si llevas aura negativa_
${p}casino — tu progreso hoy

━━━ *IA* ━━━
${p}g <pregunta> — responde Grok _(alias: ${p}ai, ${p}grok)_

━━━ *ADMIN* ━━━
${p}on · ${p}off
${p}tagall [mensaje]
${p}kick @user · ${p}add <número>
${p}promote @user · ${p}demote @user
${p}mute @user [min] · ${p}unmute @user
${p}del · ${p}close · ${p}open
${p}notifadmin on/off
${p}scan — detectar cuentas sospechosas
${p}marcarfake @user — marcar foto como fake
${p}fkban / ${p}fkunban @user — lista negra global
${p}antifake on/off — guard de entradas (banlist+fotos+anti-raid)

━━━ *OWNER* ━━━
${p}resetcount — borrar ranking de mensajes
${p}resetaura — borrar aura del grupo
${p}antiadmin on/off
${p}antiempresa on/off
${p}antilink on/off
${p}clearcache · ${p}setgrok <key>

━━━ *BOT* ━━━
${p}ping · ${p}info · ${p}whoami`;

  await sock.sendMessage(jid, { text }, { quoted: msg });
}

module.exports = { cmdOn, cmdOff, cmdPing, cmdInfo, cmdHelp, cmdCasino };

