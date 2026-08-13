const { getState, setState, toggleGroup } = require('../utils/state');
const { formatUptime, fmt, pickFresh } = require('../utils/helpers');
const { isOwner, isMainOwner, isGroupAdmin, getSender } = require('../utils/wa');
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
  'El aura se gana escribiendo, puto vago. No hay atajos de magia en este ranking.',
  'Sin mensajes no hay aura. El contador no regala caridad a fantasmassin esfuerzo.',
  'Farmea presencia o acepta el sótano. El bot no cotiza intencionesa indultos.',
  'Aura en cero es recibo de ausencia, no de misterio interesanteir roce.',
  'Escribe o sigue mirando el ranking ajeno desde abajo, cabrónstesia.',
  'El aura premia al que está. Al que desaparece lo borra sin dramaste numerito.',
  'No hay cheat code. Solo teclado y constancia fea, gilipollasl en público.',
  'Miseria de aura suele ser miseria de presencia con disfraz, mierdal meme listo.',
  'El ranking lee mensajes, no tu potencial de sofá, coñoo salve.',
  'Sin scroll de salida no hay subida que valga, ascosin esfuerzo.',
  'Puntos de aura no se descargan por WiFi mental, patéticoa indultos.',
  'El sótano está lleno de perfiles que iban a escribir mañana, basurair roce.',
  'Presencia o pobreza. Elige con las teclas, ridículostesia.',
  'El bot cobra en actividad. Paga o no juegues, fracasadoste numerito.',
  'Aura baja es el peaje de no estar cuando tocaba, joderl en público.',
  'Farmea o queja. Solo una suma en el marcador, cabrónl meme listo.',
  'No hay aura gratis ni en este grupo ni en el de al lado, gilipollas.',
  'Escribe cuando no apetece. Eso es farmeo de verdad, mierdasin esfuerzo.',
  'El contador no negocia con el que aparece un martes al mes, coñoa indultos.',
  'Silencio eterno y luego pedir favores de aura. Nivel, ascoir roce.',
  'La subida se gana fea: mensaje a mensaje, patéticostesia.',
  'Sin teclas el ranking te deja en dieta forzosa, basuraste numerito.',
  'Aura se farmea. El resto es cuento para dormir, ridículol en público.',
  'El fantasma laboral no tiene derecho a exigir saldo, fracasadol meme listo.',
  'Mensajes suman. Bio bonita no, jodero salve.',
  'El sótano no es estética. Es tu número, cabrónsin esfuerzo.',
  'Primero presencia, después apuestas y tienda, gilipollasa indultos.',
  'El aura no llega por rezo ni por estado de WhatsApp, mierdair roce.',
  'Escribe algo. El vacío no genera puntos, coñostesia.',
  'Ranking en rojo por ausencia crónica, ascoste numerito.',
  'No hay indulto de pobre para quien no farmea, patéticol en público.',
  'El bot premia constancia, no promesas de madrugada, basural meme listo.',
  'Aura de sótano: diagnóstico de no estar, ridículoo salve.',
  'Muévete o acepta el número sin llorar, fracasadosin esfuerzo.',
  'La presencia documentada es la única moneda, jodera indultos.',
  'Sin check-in diario el aura se oxida, cabrónir roce.',
  'El contador espera tu parte. No la de tu primo, gilipollasstesia.',
  'Farmeo o miseria. No hay tercera vía mágica, mierdaste numerito.',
  'El ranking te borra del mapa útil si no escribes, coñol en público.',
  'Aura no es vibra. Es conteo, ascol meme listo.',
  'Los fantasmas no suben. Bajan o se quedan, patéticoo salve.',
  'Escribe con ruido o con sustancia, pero escribe, basurasin esfuerzo.',
  'El peaje del aura se paga en mensajes, ridículoa indultos.',
  'Sin actividad eres decorado del grupo, fracasadoir roce.',
  'El sótano tiene tu reserva hecha, joderstesia.',
  'Puntos por estar. Cero por existir en silencio, cabrónste numerito.',
  'La subida no entiende de excusas creativas, gilipollasl en público.',
  'Aura baja: firmaste la ausencia, mierdal meme listo.',
  'Farmea como el resto o cierra el pico, coñoo salve.',
  'El bot no hace milagros laicos sin teclado, ascosin esfuerzo.',
  'Presencia real o número de pena, patéticoa indultos.',
  'No cotiza el potencial. Cotiza el envío, basurair roce.',
  'El ranking es un reloj. Tú llegas tarde siempre, ridículostesia.',
  'Sin mensajes el aura es rumor, fracasadoste numerito.',
  'Escribe. El resto es cope, joderl en público.',
  'Miseria de ranking con wifi y sin teclas, cabrónl meme listo.',
  'El contador no lee la mente. Lee el hilo, gilipollaso salve.',
  'Aura se gana sucio: apareciendo, mierdasin esfuerzo.',
  'El fantasma pide crédito y recibe cero, coñoa indultos.',
  'Primero el check-in, después el ego, ascoir roce.',
  'Sin farmeo no hay apuesta que no sea mendigar, patéticostesia.',
  'El sótano te espera con silla reservada, basuraste numerito.',
  'Mensaje a mensaje o nada, ridículol en público.',
  'El bot premia al presente, castiga al vapor, fracasadol meme listo.',
  'Aura de pobre: ausencia disfrazada de misterio, jodero salve.',
  'No hay atajo. Hay hábito, cabrónsin esfuerzo.',
  'Escribe o que el número te humille en paz, gilipollasa indultos.',
  'El ranking no perdona el modo avión eterno, mierdair roce.',
  'Farmea presencia, no relatos, coñostesia.',
  'Sin teclas eres un perfil bonito e inútil, ascoste numerito.',
  'La moneda del grupo se llama mensaje, patéticol en público.',
  'Aura en dieta porque tú estás en dieta de hilo, basural meme listo.',
  'El contador es justo con los que están, ridículoo salve.',
  'Aparece o acepta el sótano, fracasadosin esfuerzo.',
  'No hay bono por intención. Hay bono por envío, jodera indultos.',
  'El aura se oxida en silencio, cabrónir roce.',
  'Farmeo diario o número de vergüenza, gilipollasstesia.',
  'El bot no inventa saldo de la nada, mierdaste numerito.',
  'Escribe aunque sea basura suma más que cero, coñol en público.',
  'Presencia mínima vital o muerte de ranking, ascol meme listo.',
  'El sótano no da puntos por buena cara, patéticoo salve.',
  'Sin actividad el mapa te borra, basurasin esfuerzo.',
  'Aura = historial de estar, ridículoa indultos.',
  'El fantasma no negocia con el contador, fracasadoir roce.',
  'Teclas o miseria. Elige ya, joderstesia.',
  'El ranking cobra peaje de aparición, cabrónste numerito.',
  'No escribas un ensayo. Escribe algo, gilipollasl en público.',
  'Aura baja es espejo, no conspiración, mierdal meme listo.',
  'Farmea o deja de mirar el de arriba, coñoo salve.',
  'El bot solo cuenta lo enviado, ascosin esfuerzo.',
  'Silencio largo, número feo, causa-efecto, patéticoa indultos.',
  'La subida empieza en el primer mensaje del día, basurair roce.',
  'Sin check-in eres turista del grupo, ridículostesia.',
  'Aura de sótano: autoinfligida, fracasadoste numerito.',
  'Escribe. El resto del discurso sobra, joderl en público.',
  'El contador no acepta bitcoins de promesas, cabrónl meme listo.',
  'Presencia o pobreza de ranking, gilipollaso salve.',
  'Farmeo feo y efectivo, mierdasin esfuerzo.',
  'El sótano se llena de los que iban a volver, coñoa indultos.',
  'Mensajes o el número te come la cara, ascoir roce.',
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
async function cmdHelp(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const p = config.prefix;

  // EL MENU SE ADAPTA A QUIEN LO PIDE. Antes era uno solo y le enseñaba a
  // cualquier miembro las cuatro lineas de ADMIN, las cinco de SISTEMA y un
  // !count marcado "(admins)": mas de veinte comandos que, si los escribe, le
  // van a rebotar. Eso no es informar, es ruido con formato — y encima empuja
  // hacia abajo lo que si puede usar, que es justo lo que se lee en un movil.
  //
  // Un admin lo sigue viendo entero. Ver de mas es su trabajo; ver de mas sin
  // poder tocarlo no le sirve a nadie.
  // isGroupAdmin ya cubre al owner, y aguanta groupMeta undefined (un DM), donde
  // solo el owner pasa el filtro. Es lo que se quiere: en privado el menu largo
  // lo ve quien manda, no cualquiera que escriba al bot.
  const esAdmin = isGroupAdmin(getSender(msg), msg.key.fromMe, groupMeta);

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
*${p}fea* *${p}iq* *${p}infiel* *${p}delulu* — autoengaño · *${p}diagnostico* — informe
*${p}feminidad* *${p}masculinidad*
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
*${p}relevancia* ${c('relevancia')} · *${p}vs* ${c('vs')} @a @b
*${p}fantasmas* ${c('fantasmas')} · *${p}inactivos* ${c('inactivos')} — los que menos escriben
*${p}top5* ${c('top5')} · *${p}top10* ${c('top10')} <tema> — ranking al azar
${esAdmin ? `
━━━━━ *ADMIN* ━━━━━
*${p}count* ${c('count')} · *${p}tagall* · *${p}kick* · *${p}add* · *${p}del*
*${p}mute* · *${p}unmute* · *${p}promote* · *${p}demote* · *${p}close* · *${p}open*
*${p}allow* · *${p}scan* · *${p}marcarfake* · *${p}antifoto* · *${p}antiempresa*
*${p}fkban* · *${p}fkunban* · *${p}fklist* · *${p}antifake* on/off
*${p}adminmode* · *${p}notifadmin* on/off

━━━━━ *SISTEMA* ━━━━━
*${p}on* · *${p}off* · *${p}aura on/off* — pausar la dinámica
*${p}antiadmin* · *${p}antilink* on/off
*${p}resetcount* · *${p}resetaura* · *${p}clearcache* · *${p}setgrok* · *${p}diag*
` : ''}
_${p}ping · ${p}info · ${p}whoami_`;

  await sock.sendMessage(jid, { text }, { quoted: msg });
}

module.exports = { cmdOn, cmdOff, cmdPing, cmdInfo, cmdHelp, cmdCasino };

