const { getState, setState, toggleGroup } = require('../utils/state');
const { formatUptime, pick, fmt } = require('../utils/helpers');
const { isOwner, isGroupAdmin, getSender } = require('../utils/wa');
const { getCasinoCount, msUntilReset } = require('../utils/casinoStore');
const { nextMilestone } = require('../utils/casino');
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

// Frases sobre el aura que acompañan al progreso diario. Rotan para que el
// comando no cante siempre lo mismo.
const AURA_LINES = [
  'El aura no se pide ni se compra: se acumula hablando. El que calla, se queda pobre.',
  'Cada mensaje suma. El que aparece todos los días acaba mandando en el marcador.',
  'El aura mide lo que aportas al grupo. Por eso los fantasmas siempre andan en números rojos.',
  'Aquí no gana el que más presume, gana el que más aparece. El contador no se deja engañar.',
  'El aura es la única moneda del grupo que no se hereda. O la ganas escribiendo o no la tienes.',
  'Los bonos premian la constancia, no la suerte. El que viene a diario acaba arriba solo.',
  'El aura sube sola si estás. Baja sola si desapareces. Nadie tiene que hacer nada, el tiempo se encarga.',
  'Puedes apostarla, regalarla o intentar robarla. Pero primero hay que ganársela hablando.',
  'El marcador de aura no tiene favoritos ni memoria corta. Lleva la cuenta exacta de lo que haces.',
  'El aura es reputación con números. Y los números del grupo no perdonan a nadie.',
  'Se gana despacio y se pierde rápido, como todo lo que vale algo. Cuídala.',
  'Aquí el silencio cuesta dinero. Literalmente: cada día callado es aura que no entra.',
  'El que llega a los mil mensajes diarios no es suerte, es alguien que vive el grupo. Y cobra por ello.',
  'El aura separa a los que están de los que solo figuran en la lista. Los números lo dejan claro.',
  'Ganar aura es fácil: escribe. Mantenerla es lo que separa a los constantes del resto.',
];

// !casino / !aura hoy — progreso diario de aura del que lo pide
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

  // El calculo del proximo hito vive en utils/casino.js, que es quien reparte los
  // bonos de verdad. Estaba copiado literalmente aqui: tocar un tramo alli y
  // olvidarse de este sitio habria hecho que el bot anunciara un hito que no
  // paga lo que dice.
  const { tier, remaining } = nextMilestone(count);

  const tierLabel = tier === 3 ? 'Tier 3 (1000 msgs)' : tier === 2 ? 'Tier 2 (500 msgs)' : 'Tier 1 (200 msgs)';

  const hours = Math.floor(ms / 3_600_000);
  const mins  = Math.floor((ms % 3_600_000) / 60_000);
  const resetStr = ms > 0 ? `${hours}h ${mins}min` : 'pronto';

  const text =
    `*AURA — HOY*\n\n` +
    `Mensajes hoy: *${fmt(count)}*\n` +
    `Próximo bono: ${tierLabel} — faltan *${fmt(remaining)}* msgs\n\n` +
    `${pick(AURA_LINES)}\n\n` +
    `_Reset en ${resetStr}_`;

  await sock.sendMessage(jid, { text }, { quoted: msg });
}

// !Commands / !ayuda / !help / !menu
async function cmdHelp(sock, msg) {
  const jid = msg.key.remoteJid;
  const p = config.prefix;

  const text =
`*${config.botName}*
_Prefijo *${p}* — ejemplo: *${p}play* despacito_

━━━━━━ *MÚSICA* ━━━━━━
*${p}play* <nombre> — busca y envía la canción
*${p}cachelist* — canciones ya guardadas

━━━━━ *STICKERS* ━━━━━
*${p}s* — imagen o video a sticker
*${p}ttp* <texto> — texto a sticker
*${p}toimg* — sticker a imagen
*${p}tovid* — sticker animado a video

━━━━━ *ACTIVIDAD* ━━━━━
*${p}count* — ranking de quién escribe más
*${p}relevancia* [@user] — tu peso real en el grupo
*${p}inactivos* — los fantasmas del grupo
*${p}vs* @a @b — compara la actividad de dos
*${p}top5* / *${p}top10* <tema> — ranking al azar

━━━━━ *JUEGOS DE %* ━━━━━
_Sin @ va sobre ti · con @ va sobre esa persona_

*${p}crack* · *${p}inteligencia* · *${p}hot* · *${p}ganador*
*${p}fiel* · *${p}infiel* · *${p}masculinidad* · *${p}feminidad*
*${p}perdedor* · *${p}inutil* · *${p}rata* · *${p}cerdo*
*${p}simp* · *${p}friki* · *${p}gay* · *${p}maricon*
*${p}femboy* · *${p}puta* · *${p}guarra*

━━━━━ *DUELOS* ━━━━━
*${p}roast* @user — destrucción pública
*${p}mog* @a @b — duelo de looks
*${p}ship* @a @b — compatibilidad

━━━━━ *WINGMAN* ━━━━━
_Sin @ va sobre ti · con @ va sobre esa persona_
*${p}rizz* [@user] — nivel de juego (%)
*${p}piropo* [@user] — le lanza un piropo
*${p}coach* [@user] — consejos de ligue

━━━━━ *AURA* ━━━━━
*${p}aura* [@user] — ver aura
*${p}aura top* — ranking del grupo
*${p}dar* @user <cantidad> — regalar aura
*${p}duel* @user <cantidad> — apostar 1v1
*${p}robo* @user <cantidad> — intentar robar
*${p}aura hoy* — tu progreso de hoy _(o ${p}casino)_
_Ganas aura escribiendo. Bonos diarios: 200 msg = 20k · 500 = 60k · 1000 = 150k_

━━━━━ *PERFIL* ━━━━━
*${p}pfp* @user — su foto de perfil
*${p}fk* @user — analiza si es cuenta falsa

━━━━━ *IA* ━━━━━
*${p}g* <pregunta> — le preguntas a Grok

━━━━━ *BOT* ━━━━━
*${p}ping* · *${p}info* · *${p}whoami*

━━━━━ *ADMIN* ━━━━━
*${p}on* / *${p}off* — activa o apaga el bot
*${p}tagall* <mensaje> — menciona a todos
*${p}kick* @user — expulsa
*${p}add* <número> — añade
*${p}promote* / *${p}demote* @user — da o quita admin
*${p}mute* @user <min> · *${p}unmute* @user
*${p}del* — borra el mensaje citado
*${p}close* / *${p}open* — cierra o abre el grupo
*${p}notifadmin* on/off — avisos de admin
*${p}scan* — busca cuentas sospechosas
*${p}antiempresa* scan/purge — limpia cuentas Business
*${p}antifoto* scan/purge — limpia a los que no tienen foto
*${p}marcarfake* @user — marca su foto como falsa
*${p}fkban* / *${p}fkunban* @user — lista negra global
*${p}antifake* on/off — vigila las entradas

━━━━━ *OWNER* ━━━━━
*${p}antiadmin* / *${p}antiempresa* / *${p}antilink* on/off
*${p}resetcount* · *${p}resetaura* — borrar rankings
*${p}clearcache* · *${p}setgrok* <key>`;

  await sock.sendMessage(jid, { text }, { quoted: msg });
}

module.exports = { cmdOn, cmdOff, cmdPing, cmdInfo, cmdHelp, cmdCasino };

