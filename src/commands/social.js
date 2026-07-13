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
`╔══════════════════╗
   *${config.botName}*
   Menú de comandos
╚══════════════════╝
Escribe los comandos con el prefijo *${p}*
Ejemplo: *${p}play* despacito

━━━━━━━━━━━━━━━
🎵 *MÚSICA*
━━━━━━━━━━━━━━━
*${p}play* <nombre> — busca y envía una canción

━━━━━━━━━━━━━━━
🖼️ *STICKERS*
━━━━━━━━━━━━━━━
*${p}s* — convierte una imagen o video en sticker
*${p}ttp* <texto> — convierte un texto en sticker
*${p}toimg* — convierte un sticker de vuelta en imagen

━━━━━━━━━━━━━━━
🔎 *PERFIL Y ANTI-FAKE*
━━━━━━━━━━━━━━━
*${p}pfp* @usuario — muestra su foto de perfil
    (también: *${p}pfp* wa.me/<número>)
*${p}fk* @usuario — analiza si es cuenta falsa y da un puntaje
    (también acepta un número, o responder a una foto)

━━━━━━━━━━━━━━━
📊 *ACTIVIDAD DEL GRUPO*
━━━━━━━━━━━━━━━
*${p}count* — ranking de quién escribe más
*${p}inactivos* — lista de los que casi no escriben
*${p}vs* @uno @otro — compara la actividad de dos miembros
*${p}top5* <tema> — top 5 de un tema (también *${p}top10*)

━━━━━━━━━━━━━━━
🎲 *JUEGOS (porcentajes)*
━━━━━━━━━━━━━━━
_Sin mención = se aplica a ti. Con @usuario = a esa persona._
Miden un rasgo con un porcentaje al azar:
*${p}crack*  ·  *${p}inteligencia*  ·  *${p}hot* (o *${p}sexy*)
*${p}feminidad*  ·  *${p}masculinidad*  ·  *${p}femboy*
*${p}gay*  ·  *${p}simp*  ·  *${p}rata*  ·  *${p}friki*
*${p}cerdo*  ·  *${p}inutil*  ·  *${p}maricon*
*${p}perdedor*  ·  *${p}ganador*

Enfrentamientos:
*${p}mog* @uno @otro — duelo de looks entre dos
*${p}ship* @uno @otro — mide su compatibilidad
*${p}roast* @usuario — le hace una burla pública

━━━━━━━━━━━━━━━
💠 *AURA (economía del grupo)*
━━━━━━━━━━━━━━━
*${p}aura* — muestra tu aura (o de @usuario)
*${p}aura top* — ranking de aura del grupo
*${p}dar* @usuario <cantidad> — le regalas aura
*${p}duel* @usuario <cantidad> — duelo apostando aura
*${p}robo* @usuario <cantidad> — intentas robarle aura
*${p}casino* — tu progreso de aura del día

_Ganas aura por escribir. Bonos diarios (se reinician cada 24 h):_
· 200 mensajes → mínimo *20.000* de aura
· 500 mensajes → mínimo *60.000* de aura
· 1000 mensajes → mínimo *150.000* de aura
_Si tienes aura negativa, hay un premio de redención._

━━━━━━━━━━━━━━━
🤖 *INTELIGENCIA ARTIFICIAL*
━━━━━━━━━━━━━━━
*${p}g* <pregunta> — le preguntas a la IA (Grok)

━━━━━━━━━━━━━━━
🛡️ *ADMINISTRACIÓN* (solo admins)
━━━━━━━━━━━━━━━
*${p}on* / *${p}off* — activa o desactiva el bot en el grupo
*${p}tagall* <mensaje> — menciona a todos
*${p}kick* @usuario — expulsa a alguien
*${p}add* <número> — agrega a alguien
*${p}promote* @usuario — lo hace admin
*${p}demote* @usuario — le quita admin
*${p}mute* @usuario <minutos> — lo silencia un rato
*${p}unmute* @usuario — le quita el silencio
*${p}del* — borra el mensaje al que respondes
*${p}close* / *${p}open* — cierra o abre el grupo
*${p}notifadmin* on/off — avisos de cambios de admin
*${p}scan* — busca cuentas sospechosas en el grupo
*${p}marcarfake* @usuario — marca su foto como falsa
*${p}fkban* / *${p}fkunban* @usuario — lista negra global
*${p}antifake* on/off — vigila las entradas al grupo

━━━━━━━━━━━━━━━
👑 *OWNER* (solo dueño)
━━━━━━━━━━━━━━━
*${p}resetcount* — borra el ranking de mensajes
*${p}resetaura* — borra el aura del grupo
*${p}antiadmin* on/off — revierte cambios de admin no autorizados
*${p}antiempresa* on/off — expulsa cuentas de empresa
*${p}antilink* on/off — borra enlaces no permitidos
*${p}clearcache* — limpia la caché de música
*${p}setgrok* <key> — configura la clave de la IA

━━━━━━━━━━━━━━━
ℹ️ *BOT*
━━━━━━━━━━━━━━━
*${p}ping* — comprueba si el bot responde
*${p}info* — datos y estado del bot
*${p}whoami* — te dice tu rol (owner/admin/miembro)`;

  await sock.sendMessage(jid, { text }, { quoted: msg });
}

module.exports = { cmdOn, cmdOff, cmdPing, cmdInfo, cmdHelp, cmdCasino };

