const { getState, setState, toggleGroup } = require('../utils/state');
const { formatUptime, fmt, pickFresh } = require('../utils/helpers');
const { isOwner, getSender } = require('../utils/wa');
const { getCasinoCount, msUntilReset } = require('../utils/casinoStore');
const { nextMilestone } = require('../utils/casino');
const { PRECIOS, ORDAGO } = require('../utils/economia');
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
    // Solo el owner tier. Antes bastaba con ser admin del grupo, asi que
    // cualquier admin podia apagar el bot entero; ahora encender y apagar es
    // del duenyo, como el resto de interruptores del bot.
    if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
      return sock.sendMessage(jid, { text: 'Solo el owner del bot puede encenderlo.' }, { quoted: msg });
    }
    await toggleGroup(jid, true);
    return sock.sendMessage(jid, { text: 'Bot *activado* en este grupo.' }, { quoted: msg });
  }

  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo el dueño puede usar este comando.' }, { quoted: msg });
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
    // Solo el owner tier. Antes bastaba con ser admin del grupo, asi que
    // cualquier admin podia apagar el bot entero; ahora encender y apagar es
    // del duenyo, como el resto de interruptores del bot.
    if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
      return sock.sendMessage(jid, { text: 'Solo el owner del bot puede apagarlo.' }, { quoted: msg });
    }
    await toggleGroup(jid, false);
    return sock.sendMessage(jid, { text: 'Bot *desactivado* en este grupo.' }, { quoted: msg });
  }

  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo el dueño puede usar este comando.' }, { quoted: msg });
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
    `Próximo bono: ${tierLabel} — faltan *${fmt(remaining)}* msgs\n` +
    `${pickFresh(AURA_LINES, `${jid}|auralines`)}\n\n` +
    `_Reset en ${resetStr}_`;

  await sock.sendMessage(jid, { text }, { quoted: msg });
}

// !Commands / !ayuda / !help / !menu
async function cmdHelp(sock, msg) {
  const jid = msg.key.remoteJid;
  const p = config.prefix;

  // El menu se lee en un movil, de una sentada. Cada linea que sobra empuja
  // hacia abajo la que alguien necesitaba, asi que va condensado a proposito:
  //
  //  · musica, stickers, IA y perfil se juntan en HERRAMIENTAS, que es lo que
  //    son (antes eran cuatro cabeceras para ocho comandos);
  //  · WINGMAN cae dentro de DINAMICAS: eran tres comandos con su propia
  //    cabecera y su propia nota repetida, y funcionan igual que el resto;
  //  · el precio va PEGADO al comando que cuesta. Antes habia una lista suelta
  //    al final del bloque de aura que obligaba a buscar el comando dos veces;
  //  · lo que vale para toda una seccion (lo del @) se dice una vez, no dos.
  //
  // Los precios NO se escriben a mano: salen de utils/economia.js. Escritos a
  // mano se desincronizan solos y el bot acaba cobrando una cifra y anunciando
  // otra. Hay un test que compara este menu con la tabla real.
  const c = (n) => `\`${PRECIOS[n]}\``;

  const text =
`*${config.botName}*
_Prefijo *${p}* · ejemplo: *${p}play* despacito_
_Lo que lleva \`número\` cuesta esa cantidad de aura._

━━━━━ *HERRAMIENTAS* ━━━━━
*${p}play* <nombre> ${c('play')} — canción _(pon también el artista)_
*${p}cachelist* — las ya guardadas, gratis y al instante
*${p}s* ${c('sticker')} — imagen o vídeo a sticker
*${p}toimg* ${c('toimg')} · *${p}tovid* ${c('tovid')} — sticker a imagen o a vídeo
*${p}ttp* <texto> — texto a sticker
*${p}g* <pregunta> ${c('grok')} — le preguntas a Grok
*${p}pfp* @user ${c('pfp')} — su foto de perfil
*${p}fk* @user ${c('fk')} — analiza si es cuenta falsa

━━━━━ *ACTIVIDAD* ━━━━━
*${p}count* — ranking de quién escribe más _(admins)_
*${p}relevancia* [@user] — tu peso real en el grupo
*${p}vs* @a @b — compara la actividad de dos
*${p}fantasmas* · *${p}inactivos* — los que menos escriben
*${p}top5* ${c('top5')} · *${p}top10* ${c('top10')} <tema> — ranking al azar

━━━━━ *AURA* ━━━━━
_Se gana escribiendo. Bonos diarios a los 200, 500 y 1000 msg._
*${p}aura* [@user] — ver aura · *${p}aura top* — ranking
*${p}aura órdago* — la mitad de tu saldo a una carta,
cada ${ORDAGO.cooldownMin / 60}h. Mínimo ${ORDAGO.minimo} para sentarte a la mesa
*${p}aura hoy* — tu progreso de hoy _(o ${p}casino)_
*${p}dar* @user <cantidad> — regalar
*${p}duel* @user <cantidad> — apostar 1v1, el otro acepta
*${p}robo* @user <cantidad> — robar. Elige cuánto: ni el mínimo
ni el tope son la mejor apuesta _(5 desenlaces)_

━━━━━ *DINÁMICAS* ━━━━━
_Sin @ va sobre ti · con @ va sobre esa persona. Todas gratis._
_De más crudo a más suave._
*${p}roast* @user — destrucción pública
*${p}perdedor* · *${p}puta* · *${p}guarra*
*${p}incel* · *${p}maricon* · *${p}gay*
*${p}cerdo* · *${p}inutil* · *${p}rata*
*${p}femboy* · *${p}simp* · *${p}friki*
*${p}fea* · *${p}iq* · *${p}infiel*
*${p}mog* @a @b — duelo de looks
*${p}feminidad* · *${p}masculinidad*
*${p}linda* · *${p}hot* · *${p}fiel*
*${p}crack* · *${p}ganador*
*${p}ship* @a @b — compatibilidad
*${p}rizz* · *${p}piropo* · *${p}wingman* — modo ligue

━━━━━ *ADMIN* ━━━━━
*${p}tagall* <mensaje> — menciona a todos
*${p}kick* @user · *${p}add* <número> · *${p}del* — echar, meter, borrar
*${p}promote* · *${p}demote* @user — dar o quitar admin
*${p}mute* @user <min> · *${p}unmute* @user
*${p}close* · *${p}open* — cerrar o abrir el grupo
*${p}adminmode* on/off — el bot solo obedece a admins
*${p}notifadmin* on/off — avisos de admin
*${p}scan* — busca cuentas sospechosas
*${p}antiempresa* · *${p}antifoto* scan/purge — limpiezas
*${p}allow* @user — le deja publicar enlaces
*${p}marcarfake* @user — marca su foto como falsa
*${p}fkban* · *${p}fkunban* @user · *${p}fklist* — lista negra global
*${p}antifake* on/off — vigila las entradas

━━━━━ *OWNER* ━━━━━
*${p}on* · *${p}off* — activa o apaga el bot
*${p}antiadmin* · *${p}antiempresa* · *${p}antilink* on/off
*${p}resetcount* · *${p}resetaura* — borrar rankings
*${p}clearcache* · *${p}setgrok* <key> · *${p}diag*

_${p}ping · ${p}info · ${p}whoami_`;

  await sock.sendMessage(jid, { text }, { quoted: msg });
}

module.exports = { cmdOn, cmdOff, cmdPing, cmdInfo, cmdHelp, cmdCasino };

