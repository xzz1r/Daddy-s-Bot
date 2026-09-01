const { getState, setState, toggleGroup } = require('../utils/state');
const { formatUptime, fmt, pickFresh } = require('../utils/helpers');
const { isOwner, isMainOwner, isGroupAdmin, getSender } = require('../utils/wa');
const { getCasinoCount, msUntilReset, tiradasDeHoy, hitosCobrados } = require('../utils/casinoStore');
const { verRacha } = require('../utils/rachaStore');
const { nextMilestone } = require('../utils/casino');
const { PRECIOS, APUESTA, CONTRA, ACTIVIDAD_MSGS, TIRADAS_PAGADAS, RACHA } = require('../utils/economia');
const config = require('../config');
const logger = require('../utils/logger');
const { SIN_PERMISO, SOLO_GRUPOS } = require('../data/avisos');
const { aviso } = require('../utils/helpers');

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
      return sock.sendMessage(jid, { text: aviso(SIN_PERMISO, jid, 'permiso') }, { quoted: msg });
    }
    await toggleGroup(jid, true);
    return sock.sendMessage(jid, { text: 'Bot *activado* en este grupo.' }, { quoted: msg });
  }

  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SIN_PERMISO, jid, 'permiso') }, { quoted: msg });
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
      return sock.sendMessage(jid, { text: aviso(SIN_PERMISO, jid, 'permiso') }, { quoted: msg });
    }
    await toggleGroup(jid, false);
    return sock.sendMessage(jid, { text: 'Bot *desactivado* en este grupo.' }, { quoted: msg });
  }

  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SIN_PERMISO, jid, 'permiso') }, { quoted: msg });
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

  // TRES MEDIDAS, NO UNA.
  //
  // Antes se mandaba un solo paquete y se cantaba ese numero. Una muestra suelta
  // no dice cual es la latencia: dice lo que tardo ESE paquete, y basta con que
  // uno pille la red en mal momento para que salga 140 en una linea que va a 90.
  // De ahi la sensacion de "siempre esta por encima de 100".
  //
  // Con tres se ve la diferencia entre la latencia de verdad (la mejor, que es
  // el suelo de la linea) y lo que se pierde por congestion (la peor). Si las
  // dos van juntas, ese es tu suelo y no hay nada que tocar; si bailan mucho, es
  // la red del momento.
  const medidas = [];
  if (typeof sock.query === 'function') {
    const pingOnce = async () => {
      const start = Date.now();
      await sock.query({
        tag: 'iq',
        attrs: { to: 's.whatsapp.net', type: 'get', xmlns: 'w:p' },
        content: [{ tag: 'ping', attrs: {} }],
      });
      return Date.now() - start;
    };
    const r = await Promise.allSettled([pingOnce(), pingOnce(), pingOnce()]);
    for (const x of r) if (x.status === 'fulfilled') medidas.push(x.value);
  }

  // LA CIFRA Y NADA MAS.
  //
  // Se siguen tomando tres medidas y se enseña la mejor, porque una sola puede
  // salir mal por un hipo y dar un numero que no representa nada. Pero eso es
  // cocina: el "_(peor de 3: 118ms)_" que salia al lado no le sirve a nadie —
  // quien escribe *!ping* quiere saber si el bot va rapido, no la dispersion de
  // la muestra.
  //
  // Antes tambien habia un comentario por tramo ("Va fino", "Normal para un
  // servidor lejos de WhatsApp", "Alto. Es la distancia del servidor, no el
  // bot"). Fuera los tres por lo mismo: si el numero es alto se ve, y si es bajo
  // tambien.
  const texto = medidas.length ? `*${Math.min(...medidas)}ms*` : 'Ping';

  await sock.sendMessage(jid, { text: texto });
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
  'El aura se gana escribiendo, puto vago. No hay atajos, no hay trucos, y el que no aparece no cobra. Así funciona esta mierda.',
  'Cada mensaje que sueltas suma aura. Cada día que te callas es dinero que te dejas en la puta mesa, cabrón.',
  'El aura mide cuanto mueves el culo por el grupo. Los fantasmas tienen el contador a cero y se lo merecen, joder.',
  'Aquí no gana el bocazas que presume, gana el cabrón que aparece. El marcador no traga mierda de nadie.',
  'La unica moneda del grupo no se hereda ni se mendiga. O mueves los dedos o te quedas pobre. Sin mas, coño.',
  'Los bonos premian al que viene a diario, no al que aparece un martes random con suerte de mierda. Constancia, hostia.',
  'Tu aura sube si estas y baja si desapareces. No necesitas hacer nada especial, solo no ser un puto fantasma.',
  'Puedes apostarla, regalarla o intentar robársela a otro cabrón. Pero primero gana algo escribiendo, mierda.',
  'El marcador no tiene amiguitos ni se le olvida una puta coma. Lleva la cuenta exacta de lo que haces y lo que no.',
  'El aura es tu reputación con números, y los números del grupo no le perdonan la vida a ningun hijo de puta.',
  'Se gana con calma y se pierde en un parpadeo, como todo lo que vale algo. Cuidala o jodete, cabrón.',
  'Aquí el silencio cuesta pasta. Cada día callado es aura que se pudre sin entrar. Abre la puta boca de una vez.',
  'El que llega a mil mensajes no es suerte, es un cabrón que vive aquí dentro. Y cobra por cada mierda que escribe.',
  'El aura separa a los que estan de verdad de los que solo calientan sitio en la lista. Los números cantan, joder.',
  'Ganar aura es fácil: escribe. Mantenerla es lo que separa a los que tienen cojones de los que se rajan a los tres días.',
  'El aura no se regala, coño. Se gana mensaje a mensaje y se pierde jugada a jugada. Nadie te va a dar nada gratis.',
  'El que no escribe no come. El que no come no apuesta. El que no apuesta no existe. Cadena de mierda pero real.',
  'El marcador lo sabe todo y no se puede sobornar. Es la unica cosa honesta de este puto grupo de cabrones.',
  'La constancia paga mas que la suerte, hostia. El que arrastra el culo aquí todos los días acaba arriba sin enterarse.',
  'El aura es lo que queda cuando todos se callan. Los números son la memoria de toda la mierda que paso aquí.',
  'Los fantasmas del grupo no cobran, no suman y no salen en ningun ranking. Existir sin escribir es como no existir, coño.',
  'Los bonos premian escribir, no respirar. Si crees que por estar en la lista ya te llevas algo, vete a la mierda.',
  'El aura funciona como la puta vida: el que aparece gana, el que desaparece pierde y el que presume sin números queda de payaso.',
  'Cada mil mensajes tu suerte de tirada sube un poco, para siempre. El veterano tira mejor porque se lo ha currado, cabrón.',
  'El que lleva racha no solo cobra a diario: revienta hitos y el grupo entero se entera. La constancia tiene premio, joder.',
  'Aquí se paga por mover el culo y se cobra por no rajarse. Lo demas son excusas de mierda de gente que no da la cara.',
  'El aura no miente, cabrón. Es el espejo del grupo y a la mayoria de hijos de puta no les gusta lo que ven.',
  'Dos formas de subir: escribiendo o tirando dados. Pero solo una es gratis. La otra te puede dejar en la puta ruina.',
  'La economia del grupo no se entiende leyendo, se entiende sudándola. Escribe o quitate de en medio, coño.',
  'El que escribe mas gana mas y el que no escribe se hunde. Sin excepciones, sin consuelo y sin un puto violin de fondo.',
];

// !casino / !aura hoy — progreso diario de aura del que lo pide
async function cmdCasino(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }

  const sender = getSender(msg);

  // AL OWNER PRINCIPAL NO SE LE CONTESTA, y aqui la fachada NO vale.
  //
  // Se probo a darle un informe con numeros inventados, como se hace en la
  // tirada y en el contraataque, y esta mal por un motivo que no tienen los
  // otros sitios: este comando entero ES el contador de mensajes. No enseña un
  // dato suyo de paso, enseña mensajes de hoy, hitos que faltan y la racha —
  // cuatro lineas de una mecanica en la que el no participa, porque sus
  // mensajes no se cuentan por diseño.
  //
  // Y lo peor: le anunciaria "faltan 145 msgs para el Tier 1", o sea un bono que
  // NUNCA le va a llegar. Una fachada que promete un premio inexistente es peor
  // que el silencio, porque tarde o temprano el premio no aparece.
  //
  // Asi que se calla, como antes. El silencio no se distingue de un comando que
  // no salio, que es el mismo criterio de !count y !relevancia. La fachada se
  // queda donde si tiene sentido: donde el bot ya iba a enseñar un numero suyo
  // dentro de algo que si le aplica.
  if (isMainOwner(sender, msg.key.fromMe, groupMeta)) return;

  const [count, ms, tiradas, racha, cobrados] = await Promise.all([
    getCasinoCount(jid, sender),
    msUntilReset(jid),
    tiradasDeHoy(jid, sender),
    verRacha(jid, sender),
    hitosCobrados(jid, sender),
  ]);

  // Los hitos cobrados hacen falta aqui igual que en el aviso: sin ellos esto
  // enseñaba el proximo tramo por resto —"Tier 1 (200 msgs)" a alguien que ya
  // llevaba 900— y prometia un bono que no iba a llegar.
  const next = nextMilestone(count, cobrados);
  const lineaBono = next
    ? `Próximo bono: Tier ${next.tier} a los ${fmt(next.hito)} — faltan *${fmt(next.remaining)}* msgs`
    : 'Bonos de hoy: *los tres cobrados*';

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
    `${lineaBono}\n` +
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
  // solo el owner pasa el filtro. Eso hoy es cinturon de seguridad y no la
  // puerta: al privado del bot ya no llega nadie que no sea del tier owner
  // (ver ownerEnPrivado en messageHandler). Se deja porque una puerta que
  // depende de otra puerta se rompe el dia que mueven la de arriba.
  // TRES NIVELES, NO DOS. El corte anterior era admin/miembro y le enseñaba al
  // admin trece comandos que le rebotan: los interruptores del grupo, el
  // degradado, los resets y !on/!off son isOwner, no isGroupAdmin.
  //
  // El reparto esta leido de la guarda de CADA comando, uno por uno, no
  // deducido del nombre — y hace falta leerla entera, porque dos formas de
  // mirarla por encima dan respuestas falsas:
  //
  //   · !roast, !ship, !mog, !relevancia, !fantasmas y !s llaman a isOwner por
  //     dentro, pero para EXIMIR al dueño (no se le puede rostear ni sacar en
  //     el ranking de fantasmas), no para cerrar la puerta. Son de todos.
  //   · !scan, !marcarfake, !fkban, !fkunban, !fklist y !antifake se escriben
  //     "isOwner(...) || isGroupAdmin(...)": el primer simbolo es isOwner y
  //     parecen del dueño, pero son de admins.
  //
  // Lo que decide es si un admin entra, y eso solo lo dice la expresion entera.
  const quien = getSender(msg);
  const esAdmin = isGroupAdmin(quien, msg.key.fromMe, groupMeta);
  const esOwner = isOwner(quien, msg.key.fromMe, groupMeta);

  // El menu se lee en un movil, de una sentada. Cada linea que sobra empuja
  // hacia abajo la que alguien necesitaba, asi que va condensado a proposito:
  //
  //  · musica, stickers y perfil se juntan en HERRAMIENTAS, que es lo que
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
_Todo lleva *${p}* delante. El número es lo que cuesta en aura._
_Donde pone *·* son la misma orden escrita de otra forma._

━━━━━ *HERRAMIENTAS* ━━━━━
*${p}play* ${c('play')} <nombre> · ${p}musica · ${p}cancion · ${p}song
*${p}s* ${c('sticker')} · ${p}sticker · ${p}stk — imagen o vídeo a sticker
*${p}toimg* ${c('toimg')} · ${p}stimg — sticker a imagen
*${p}tovid* ${c('tovid')} — sticker animado a vídeo
*${p}ttp* ${c('ttp')} <texto> · ${p}texto — texto a sticker
*${p}pfp* ${c('pfp')} · ${p}foto — la foto de perfil de alguien
*${p}fk* ${c('fk')} @user · ${p}verificar · ${p}check — busca la cara por internet
*${p}cachelist* ${c('cachelist')} · ${p}cache — canciones ya descargadas

━━━━━ *DINÁMICAS* ━━━━━
_Sin @ va sobre ti · con @ va sobre esa persona._
*${p}roast* ${c('roast')} · ${p}quemar · ${p}destruir · ${p}flamear
*${p}mog* ${c('mog')} @a @b · ${p}moggear — quién aplasta a quién
*${p}ship* ${c('ship')} @a @b — compatibilidad
*${p}rizz* ${c('rizz')} · *${p}piropo* ${c('piropo')} · *${p}wingman* ${c('wingman')}
*${p}top5* ${c('top5')} · *${p}top10* ${c('top10')} — ranking del <tema> que pidas
_Y los de una palabra, ${PRECIOS.percent} cada uno, de más crudo a más suave:_
*${p}puta* *${p}guarra* *${p}maricon* *${p}incel* *${p}gay* *${p}femboy*
*${p}cerdo* *${p}rata* *${p}simp* *${p}friki* *${p}inutil* *${p}perdedor* (${p}l)
*${p}fea* *${p}infiel* *${p}iq* *${p}feminidad* *${p}masculinidad*
*${p}linda* *${p}hot* *${p}sexy* *${p}fiel* *${p}crack* *${p}ganador*

━━━━━ *AURA* ━━━━━
_Gratis: no cobran, pero mueven tu saldo._
*${p}aura* — la tirada del día
*${p}saldo* · ${p}miaura — lo que tienes
*${p}top* · ${p}ranking · ${p}auratop — los más ricos
*${p}hoy* — tus mensajes y bonos de hoy · *${p}casino* — cómo se gana
*${p}apostar* mitad / todo / 2k / 50% · ${p}apuesta
*${p}duel* @user · ${p}duelo · ${p}1v1 — a cara o cruz contra alguien
*${p}dar* @user <cant.> · ${p}regalar · ${p}transferir · ${p}pagar · ${p}donar
*${p}guia* · ${p}aurahelp — cómo funciona todo esto

━━━━━ *ROBO* ━━━━━
*${p}robo* @user <cant.> · ${p}robar
*${p}contrarobo* · ${p}contraataque · ${p}vengarse — 90 s para devolvérsela
*${p}buscados* · ${p}cartel · ${p}wanted · ${p}recompensas — los más ladrones
*${p}tienda* · ${p}shop — el catálogo · *${p}comprar* <objeto>
*${p}bote* · *${p}caja* — lo que hay en el pozo y en la tienda
*${p}asalto* · ${p}asaltar — reventar el bote
*${p}atraco* · ${p}atracar — reventar la caja de la tienda
*${p}zulo* · ${p}escondite — lo que tienes enterrado
*${p}tapar* <cant.> — esconder · *${p}cavar* <cant.> — sacarlo
_También valen ${p}enterrar y ${p}desenterrar._
_Lo enterrado no te lo roba nadie, pero sacarlo cuesta._

━━━━━ *ACTIVIDAD* ━━━━━
*${p}relevancia* ${c('relevancia')} · ${p}importancia — cuánto pintas aquí
*${p}vs* ${c('vs')} @a @b · ${p}versus — quién habla más de los dos
*${p}fantasmas* ${c('fantasmas')} · ${p}muertos — los que menos escriben
*${p}inactivos* ${c('inactivos')} — los que no llegan al mínimo, con aviso de expulsión
${esAdmin ? `
━━━━━ *ADMIN* ━━━━━
*${p}kick* @user · ${p}expulsar · ${p}sacar · ${p}echar
*${p}del* · ${p}borrar — borra el mensaje citado
*${p}mute* @user · ${p}silenciar · ${p}callar · *${p}unmute* · ${p}desmute
*${p}tagall* <mensaje> · ${p}todos · ${p}all — avisa a todos sin poner un @
*${p}r* — pide a los NUEVOS que se presenten (foto y edad), en todos los grupos
*${p}close* · ${p}cerrar · *${p}open* · ${p}abrir — quién puede escribir
*${p}count* ${c('count')} — ranking de mensajes
*${p}promote* @user · ${p}ascender — con el anti-admin puesto sube un nivel
*${p}allow* @user · ${p}permitir — le deja pasar un enlace
*${p}scan* · ${p}escanear — repasa el grupo entero buscando cuentas raras
*${p}marcarfake* @user · ${p}fake · *${p}fklist* · ${p}listanegra
*${p}fkban* @user · ${p}banear · *${p}fkunban* · ${p}desbanear
*${p}antifake* on/off · ${p}antifk
*${p}notifadmin* on/off — avisa de ascensos y destituciones
*${p}autoaccept* on/off · ${p}autoaceptar — aprueba solicitudes (no añade a nadie)
` : ''}${esOwner ? `
━━━━━ *ADMINS SUPERIORES* ━━━━━
*${p}on* / *${p}off* — encender y apagar el bot en este grupo
*${p}demote* @user · ${p}degradar
_Van con on/off:_ *${p}antilink* · *${p}antifoto* · *${p}antiempresa* · *${p}antiadmin* · *${p}adminmode* · *${p}aura*
*${p}resetcount* · ${p}resetconteo — pone los mensajes a cero
*${p}resetaura* — pone el aura a cero
*${p}clearcache* · ${p}borracache — vacía las canciones guardadas
*${p}diag* — diagnóstico de la conexión
` : ''}
*${p}ping* · *${p}info* (${p}estado, ${p}status) · *${p}whoami*
*${p}help* · ${p}ayuda · ${p}menu · ${p}commands — esto que estás leyendo
_También responden, por si los escribes así:_
_${p}playsong ${p}playaudio ${p}listacache ${p}relevance ${p}presentarse ${p}presentacion_
_${p}everyone ${p}antibusiness ${p}soloadmins ${p}soloadmin ${p}autoapprove ${p}autoaprobar_
_${p}verify ${p}ban ${p}unban ${p}delete ${p}apuestas ${p}guiaaura ${p}contraatacar_
_${p}registradora ${p}mostwanted ${p}fantasma ${p}inactivo_${config.contacto ? `
_Contacto: wa.me/${config.contacto}_` : ''}`;

  await sock.sendMessage(jid, { text }, { quoted: msg });
}

module.exports = { cmdOn, cmdOff, cmdPing, cmdInfo, cmdHelp, cmdCasino };

