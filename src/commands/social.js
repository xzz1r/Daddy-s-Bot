const { getState, setState, toggleGroup } = require('../utils/state');
const { formatUptime, fmt, pickFresh } = require('../utils/helpers');
const { isOwner, isMainOwner, getSender } = require('../utils/wa');
const { getCasinoCount, msUntilReset, tiradasDeHoy } = require('../utils/casinoStore');
const { verRacha } = require('../utils/rachaStore');
const { nextMilestone } = require('../utils/casino');
const { PRECIOS, APUESTA, CONTRA, ACTIVIDAD_MSGS, TIRADAS_PAGADAS, RACHA } = require('../utils/economia');
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
      return sock.sendMessage(jid, { text: 'No tienes permiso para usar esto.' }, { quoted: msg });
    }
    await toggleGroup(jid, true);
    return sock.sendMessage(jid, { text: 'Bot *activado* en este grupo.' }, { quoted: msg });
  }

  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'No tienes permiso para usar esto.' }, { quoted: msg });
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
      return sock.sendMessage(jid, { text: 'No tienes permiso para usar esto.' }, { quoted: msg });
    }
    await toggleGroup(jid, false);
    return sock.sendMessage(jid, { text: 'Bot *desactivado* en este grupo.' }, { quoted: msg });
  }

  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'No tienes permiso para usar esto.' }, { quoted: msg });
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
  'El aura no se regala. Se gana mensaje a mensaje y se pierde jugada a jugada. Así funciona esto.',
  'Aquí el que no escribe no come. Y el que no come no apuesta. Y el que no apuesta no existe.',
  'El marcador lo sabe todo. No se puede engañar y no se puede sobornar. Es lo más honesto del grupo.',
  'La constancia paga más que la suerte. El que viene todos los días acaba ganando sin darse cuenta.',
  'El aura es lo que queda cuando se apaga el grupo. Los números son la memoria de todo lo que pasó.',
  'Los fantasmas del grupo no cobran, no suman y no aparecen en ningún ranking. Así se vive.',
  'Los bonos de actividad premian escribir, no existir. La diferencia la entiende el que cobra.',
  'El aura funciona como la vida: el que aparece gana, el que desaparece pierde y el que presume sin números hace el ridículo.',
  'Cada mil mensajes tu suerte de tirada sube un poco, para siempre. El veterano tira mejor y se lo ha ganado.',
  'El que lleva racha no solo cobra a diario: llega a los hitos y el grupo se entera. Constancia con premio.',
  'Aquí se paga por participar y se cobra por permanecer. El resto son excusas de gente que no aparece.',
  'El aura no miente. Es el espejo del grupo y a la mayoría no le gusta lo que ve.',
  'Hay dos formas de subir: escribiendo o tirando. Pero solo una de las dos es gratis.',
  'La economía del grupo no se entiende pensándola, se entiende viviéndola. Escribe y verás.',
  'El que escribe más gana más, el que no escribe pierde terreno. Sin excepciones y sin puto consuelo.',
];

// !casino / !aura hoy — progreso diario de aura del que lo pide
async function cmdCasino(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo funciona en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);

  // AL OWNER PRINCIPAL NO SE LE CONTESTA. Sus mensajes no se cuentan — es lo que
  // lo mantiene fuera de !count, de los tops y de las purgas — así que este
  // comando le sacaba "Mensajes hoy: 0" delante del grupo. Es la contradicción
  // exacta que lo delata: la única persona a la que el bot dice que no ha
  // escrito nada es justamente la que más escribe.
  //
  // Se calla del todo en vez de enseñarle el mensaje sin esa línea: un formato
  // distinto solo para él también es una señal. El silencio no se distingue de
  // un comando que no salió, que es el mismo criterio de !count y !relevancia.
  if (isMainOwner(sender, msg.key.fromMe, groupMeta)) return;

  const [count, ms, tiradas, racha] = await Promise.all([
    getCasinoCount(jid, sender),
    msUntilReset(jid),
    tiradasDeHoy(jid, sender),
    verRacha(jid, sender),
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

  // Cuántas tiradas de pago le quedan hoy. No se ve en ningún otro sitio hasta
  // que se acaban y el bot lo dice en la propia tirada, así que enseñarlo aquí
  // es lo que evita la sorpresa.
  const quedan = Math.max(0, TIRADAS_PAGADAS - tiradas);

  // La racha se paga en silencio, así que este es el único sitio donde se ve el
  // número antes de llegar a un hito. Y hace falta decir DOS cosas distintas:
  // cuántos días llevas y si el de hoy ya está asegurado — sin lo segundo,
  // alguien con 29 días no sabe si puede irse a dormir tranquilo.
  const lineaRacha = racha.hoyCuenta
    ? `Racha: *${fmt(racha.dias)}* ${racha.dias === 1 ? 'día' : 'días'} — hoy ya cuenta`
    : `Racha: *${fmt(racha.dias)}* ${racha.dias === 1 ? 'día' : 'días'} — te faltan *${fmt(Math.max(0, RACHA.minMensajes - racha.msgs))}* msgs para asegurar hoy`;

  const text =
    `*AURA — HOY*\n\n` +
    `Mensajes hoy: *${fmt(count)}*\n` +
    `Tiradas que pagan: *${fmt(quedan)}* de ${TIRADAS_PAGADAS}\n` +
    `${lineaRacha}\n` +
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
_El número es lo que cuesta en aura._

━━━━━ *DINÁMICAS* ━━━━━
_Sin @ va sobre ti · con @ va sobre esa persona._
*${p}roast* ${c('roast')} — destrucción · *${p}mog* ${c('mog')} @a @b — looks
*${p}ship* ${c('ship')} @a @b · *${p}rizz* ${c('rizz')} · *${p}piropo* · *${p}wingman*
_De más crudo a más suave, ${PRECIOS.percent} cada uno:_
*${p}perdedor* *${p}puta* *${p}guarra* *${p}incel* *${p}maricon* *${p}gay*
*${p}cerdo* *${p}inutil* *${p}rata* *${p}femboy* *${p}simp* *${p}friki*
*${p}fea* *${p}iq* *${p}infiel* *${p}feminidad* *${p}masculinidad*
*${p}linda* *${p}hot* *${p}sexy* *${p}fiel* *${p}crack* *${p}ganador*

━━━━━ *AURA* ━━━━━
*${p}aura* — tirar · *${p}aura top* · *${p}aura hoy*
*${p}robo* · *${p}duel* · *${p}dar* @user <cantidad>
*${p}guia* — el aura entera explicada, con todos sus modos

━━━━━ *HERRAMIENTAS* ━━━━━
*${p}play* ${c('play')} <nombre> — canción · *${p}cachelist* ${c('cachelist')} — las guardadas
*${p}s* ${c('sticker')} · *${p}toimg* ${c('toimg')} · *${p}tovid* ${c('tovid')} · *${p}ttp* ${c('ttp')} <texto>
*${p}g* ${c('grok')} <pregunta> · *${p}pfp* ${c('pfp')} · *${p}fk* ${c('fk')} @user

━━━━━ *ACTIVIDAD* ━━━━━
*${p}count* ${c('count')} _(admins)_ · *${p}relevancia* ${c('relevancia')} · *${p}vs* ${c('vs')} @a @b
*${p}fantasmas* ${c('fantasmas')} · *${p}inactivos* ${c('inactivos')} — los que menos escriben
*${p}top5* ${c('top5')} · *${p}top10* ${c('top10')} <tema> — ranking al azar

━━━━━ *ADMIN* ━━━━━
*${p}tagall* · *${p}kick* · *${p}add* · *${p}del* · *${p}mute* · *${p}unmute*
*${p}promote* · *${p}demote* · *${p}close* · *${p}open* · *${p}allow*
*${p}scan* · *${p}marcarfake* · *${p}antifoto* · *${p}antiempresa*
*${p}fkban* · *${p}fkunban* · *${p}fklist* · *${p}antifake* on/off
*${p}adminmode* · *${p}notifadmin* on/off

━━━━━ *SISTEMA* ━━━━━
*${p}on* · *${p}off* · *${p}aura on/off* — pausar la dinámica
*${p}antiadmin* · *${p}antilink* on/off
*${p}resetcount* · *${p}resetaura* · *${p}clearcache* · *${p}setgrok* · *${p}diag*

_${p}ping · ${p}info · ${p}whoami_`;

  await sock.sendMessage(jid, { text }, { quoted: msg });
}

module.exports = { cmdOn, cmdOff, cmdPing, cmdInfo, cmdHelp, cmdCasino };

