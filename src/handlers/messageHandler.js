const fs = require('fs');
const { pickFresh, withTimeout } = require('../utils/helpers');
const config = require('../config');
const { isBotEnabled, incrementStat, isAntiLinkEnabled, isSoloAdminsEnabled, isAntiBusinessEnabled } = require('../utils/state');
const { auraApagada, avisarApagada } = require('../utils/auraSwitch');
const { cobrar: cobrarAura, devolver: devolverAura, textoSinSaldo } = require('../utils/auraCobro');
const { PRECIOS, SUELO_TODOS } = require('../utils/economia');
const { increment: incrementMsgCount } = require('../utils/messageCounter');
const { recordName } = require('../utils/nombreStore');
const { recordFacts, getMemberFacts } = require('../utils/nickStore');
const { noteOffence, forget, yaAvisado, marcarAvisado, olvidarAviso } = require('../utils/mediaSpam');
const { isAllowed, noteWarning, resetWarnings, MAX_AVISOS } = require('../utils/linkPerms');
const { tienePase, gastarIndulto } = require('../utils/roboStore');
const { banAccount } = require('../utils/banlist');
const { businessEvidence } = require('../utils/businessCheck');
const { aplicarAUno } = require('../utils/participantes');
const { allForms } = require('../commands/fk');
const { checkCasinoMilestone } = require('../utils/casino');
const { cmdPlay, cmdCacheList, cmdClearCache } = require('../commands/music');
const { cmdSticker } = require('../commands/sticker');
const { cmdTopRandom } = require('../commands/topsRandom');
const { cmdK, privadoDelOwner, hallarMedio } = require('../commands/k');
const { cmdCount, cmdResetCount } = require('../commands/count');
const { cmdRelevance } = require('../commands/relevance');
const { cmdG, cmdSetKey } = require('../commands/ai');
const { cmdTodos, cmdKick, cmdDel, cmdMute, cmdUnmute, cmdPromote, cmdDemote, cmdNotifAdmin, cmdAntiAdmin, cmdAntiBusiness, isMuted, cmdAntiLink, cmdAllow, cmdClose, cmdOpen, cmdSoloAdmins, cmdAdm, cmdPresentarse } = require('../commands/group');
const { cmdShip } = require('../commands/ship');
const { cmdTtp } = require('../commands/ttp');
const { cmdToImg, cmdToVid } = require('../commands/toimg');
const { cmdPfp } = require('../commands/pfp');
const { cmdFk, cmdMarkFake, cmdFkBan, cmdFkUnban, cmdFkList, cmdAntiFake } = require('../commands/fk');
const { maybeIndex } = require('../utils/pfpIndexer');
const { cmdGay, cmdSimp, cmdHot, cmdRata, cmdMaricon, cmdFriki, cmdCrack, cmdCerdo, cmdFeminidad, cmdMasculinidad, cmdInutil, cmdFemboy, cmdPerdedor, cmdGanador, cmdPuta, cmdGuarra, cmdFiel, cmdInfiel, cmdLinda, cmdFea, cmdIncel } = require('../commands/percent');
// !iq no es un comando de porcentaje: saca una CIFRA de IQ y vive aparte.
const { cmdIQ } = require('../commands/iq');
const { cmdRizz, cmdPiropo, cmdWingman } = require('../commands/wingman');
const { cmdAura } = require('../commands/aura');
const { resetAura } = require('../utils/auraStore');
const { cmdMog } = require('../commands/mog');
const { cmdRobo } = require('../commands/robo');
const { cmdDuel } = require('../commands/duel');
const { cmdScan } = require('../commands/scan');
const { cmdAntiFoto } = require('../commands/cleanup');
const { cmdVs, cmdFantasmas, cmdInactivos } = require('../commands/activity');
const { cmdPurgaNumero, cmdPurge } = require('../commands/purgaNumero');
const { cmdRoast } = require('../commands/roast');
const { cmdDar } = require('../commands/dar');
const { cmdOn, cmdOff, cmdPing, cmdInfo, cmdHelp, cmdCasino } = require('../commands/social');
const { isOwner, isMainOwner, isGroupAdmin, isBotAdmin, extractText, rememberMapping, getSender, canonicalJid, sameUser, indexGroupMeta } = require('../utils/wa');
const logger = require('../utils/logger');

const { clasificarMensaje, classifyLinks, textoParaEnlaces, esInvitacionNativa, PERMISO_ENLACE, puedeAnunciar, anotarTropiezo, perfilMirado } = require('../utils/antilink');
const { SIN_PERMISO, SOLO_GRUPOS } = require('../data/avisos');
const { aviso } = require('../utils/helpers');

// Commands that need group metadata — skip the network call for everything else
const NEEDS_META = new Set([
  'on','off','tagall','todos','all','everyone',
  'kick','expulsar','del','borrar','delete',
  // sacar/echar/silenciar/callar/banear/ban/desbanear/unban ESTABAN FUERA, y sus
  // hermanos dentro. Sin metadata isGroupAdmin no puede resolver quien es admin
  // en un grupo LID, asi que estos alias no expulsaban ni silenciaban a nadie:
  // el comando existia, contestaba "solo los admins" al admin que lo escribia.
  // Los detecta ahora `npm run check`.
  'sacar','echar','silenciar','callar',
  // !r menciona a TODO el grupo para que vean el aviso; la orden es solo para
  // los nuevos. Sin metadata no hay lista y el ping sale vacio.
  'r','presentarse','presentacion','presentación',
  'banear','ban','fkban','desbanear','unban','fkunban',
  // !p / !purge comprueban isMainOwner y sin metadata no resolverian su LID:
  // el comando mas destructivo del bot se le quedaria mudo justo al unico que
  // lo puede usar.
  'p','purge',
  // importancia (alias de relevancia), quemar/destruir (de roast) y muertos (de
  // fantasmas) COBRAN desde que se metieron en COBRO_CENTRAL, y sin metadata
  // auraCobro no reconoce al owner: le cobraba a quien va exento.
  'importancia','quemar','destruir','muertos',
  'ship','mute','unmute','desmute',
  'promote','ascender','demote','degradar','notifadmin','antiadmin','antiempresa','antibusiness','antifoto',
  'antilink','allow','permitir','close','cerrar','open','abrir',
  'adminmode','soloadmins','soloadmin','adm','contrarobo','contraataque','contraatacar','vengarse',
  'atraco','atracar','caja','registradora',
  'buscados','wanted','mostwanted','recompensas','cartel',
  's','sticker','stk',   // cmdSticker SI recibe groupMeta
  // Los que cobran aura SI necesitan groupMeta: auraCobro exime al owner tier y
  // sin la metadata no puede resolver quien lo es, asi que al owner le cobraria.
  'play','playsong','playaudio','musica','música','cancion','canción','song',
  'g','ai','pfp','foto',
  // piropo y wingman COBRAN (30, como !rizz) y no estaban aqui, asi que cobraban
  // sin metadata: sin ella isOwner no puede reconocer al owner tier en un grupo
  // LID y se le cobraba a quien va exento. Lo mismo con los alias en español de
  // !play, que cobran por dentro mientras 'play' si estaba en la lista.
  'piropo','wingman',
  'toimg','stimg','tovid',   // tambien cobran desde que el aura es moneda
  // ttp, texto e iq ESTABAN FUERA y cobran los tres. Se sacaron porque sus
  // handlers no usan groupMeta, asi que pedirla solo añadia una peticion de red
  // —hasta 8 s con la cache fria— antes de ejecutarlos.
  //
  // El razonamiento era bueno y ha dejado de serlo: la metadata NO la pide el
  // handler, la pide el COBRO, que exime al owner y sin ella no puede resolver
  // su LID. O sea que el ahorro se pagaba cobrandole al owner en los grupos LID,
  // que es justo donde esta el bot. Y desde que META_TTL son 10 min con la
  // consulta compartida, el coste que justificaba el intercambio casi no existe:
  // la cache fria pasa de ser cada 30 s a cada 10 min, y una sola vez.
  'ttp','texto','iq',
  'gay','simp','sexy','hot','rata','maricon','maricón','friki',
  'crack','cerdo','feminidad','masculinidad','inutil','femboy','perdedor','l','ganador',
  'puta','guarra','fiel','infiel','linda','fea','incel',
  'rizz',
  'aura','guia','guía','aurahelp','guiaaura',   // la guia entra por cmdAura, que exime al owner de pagar
  'resetaura','inactivos','inactivo','fantasma','fantasmas','mog','moggear','roast','flamear',
  'duel','duelo','1v1',
  'robo','robar',
  'vs','versus',          // cmdVs receives groupMeta for isOwner/isGroupAdmin checks
  'scan','escanear',
  'fk','verificar','verify','check','marcarfake','fake',
  'fkban','fkunban','fklist','listanegra','antifake','antifk',
  'count','resetcount','resetconteo',
  'top5','top10',   // el sorteo cruza los conteos con la lista de miembros
  // 'top' y 'ranking' NO ESTABAN, y son el ranking de aura. Sin metadata
  // soloMiembros() no puede filtrar y DEVUELVE A TODO EL MUNDO, asi que *!top*
  // listaba a gente que ya se habia ido del grupo mientras *!aura top* no. Dos
  // formas del mismo comando dando rankings distintos.
  //
  // Y ahora ademas hacen falta porque *!top 10 <tema>* se desvia al sorteo, que
  // cobra: sin metadata el cobro no reconoce al owner en grupos LID.
  'top','ranking','auratop',
  'k',              // isOwner necesita la metadata para resolver el LID del owner
  'diag',
  'relevancia','relevance',   // isMainOwner necesita meta para resolver LID → teléfono
  // !casino es la puerta directa a lo mismo que !aura hoy, y ese texto NO se le
  // contesta al owner principal (le sacaba "Mensajes hoy: 0", que es justo la
  // contradiccion que lo delata). Sin metadata isMainOwner no resuelve su LID en
  // los grupos modernos y el aviso se le colaria por esta via.
  'casino',
  // Owner-gated commands also need meta in groups to resolve LID → phone
  // for isOwner checks (otherwise co-owners always fail in modern groups).
  'clearcache','borracache','setkey','whoami',
  // !cachelist cobra por el dispatcher. Sin metadata isOwner no resuelve el LID
  // y se le cobra al owner las 12 de aura.
  'cachelist','listacache','cache',
  // Subcomandos de aura/robo/dar con puerta propia. Sin metadata:
  //   · !apostar / !dar usan isOwner/canonicalJid → el owner en @lid se trata
  //     como miembro (peor acierto, transferencia partida en dos identidades);
  //   · !top ya estaba, pero !saldo/!hoy/!tienda/!bote/!asalto no: mismos
  //     handlers, distinta puerta, distinto tratamiento. El check de hermanos
  //     no los cazaba porque NINGUNO de esos grupos estaba en la lista.
  //   · !help sin meta enseña el menú de miembro a un admin que llega por @lid.
  'apostar','apuesta','apuestas',
  'hoy','saldo','miaura',
  'tienda','shop','comprar','bote',
  'asalto','asaltar',
  'regalar','transferir','pagar','dar','donar',
  'ayuda','help','menu','commands',
]);

// La familia del aura que se congela con *!aura off*: todo lo que mueve saldo.
//
// !dar entra aunque no sea un juego. Si el resto esta congelado y las
// transferencias no, el aura se sigue moviendo por el grupo con el marcador
// supuestamente en pausa, y eso es peor que no tener interruptor.
//
// !aura NO entra: se para su tirada pero no su consulta, y esa distincion la
// hace cmdAura. Meterlo aqui apagaria tambien el ranking y el propio *!aura on*.
// ─── Cobro central ───────────────────────────────────────────────────────────
//
// Qué comando cuesta qué. Va aquí y no repartido por treinta ficheros: cobrar
// dentro de cada comando obliga a acordarse de hacerlo en cada uno nuevo, y ya
// pasó — los juegos de porcentaje llevaban meses gratis por olvido, no por
// decisión.
//
// Los de esta tabla se cobran ANTES de ejecutar nada. Si no llega el saldo, el
// comando ni se lanza.
const COBRO_CENTRAL = {
  // LOS ALIAS TAMBIEN COBRAN. El cobro mira el nombre TECLEADO, asi que un alias
  // que falte aqui sale gratis mientras su canonico cobra: !quemar era gratis y
  // !roast costaba 35, por el mismo comando y el mismo trabajo. Cinco estaban
  // asi. Si se añade un alias al switch, tiene que entrar tambien aqui.
  roast: 'roast', flamear: 'roast', quemar: 'roast', destruir: 'roast',
  mog: 'mog', moggear: 'mog',
  ship: 'ship',
  // 'coach' NO esta: cobraba 30 y despues caia en el default con un "no existe
  // ese comando". Se le cobraba al usuario por un comando que el bot no tiene.
  // O se implementa el case, o no se cobra; lo segundo es lo honesto.
  rizz: 'rizz', piropo: 'piropo', wingman: 'wingman',
  // 'count' NO esta, y es a proposito. El cobro central corre ANTES del switch,
  // asi que a un miembro se le cobraban 25 y despues cmdCount le contestaba
  // "solo los admins": pagaba por un rechazo. El catch solo devuelve el aura si
  // salta una excepcion, y un return no lo es. Se cobra dentro de cmdCount,
  // despues del permiso.
  relevancia: 'relevancia', relevance: 'relevancia', importancia: 'relevancia',
  vs: 'vs', versus: 'vs',
  fantasmas: 'fantasmas', fantasma: 'fantasmas', muertos: 'fantasmas',
  inactivos: 'inactivos', inactivo: 'inactivos',
  ttp: 'ttp', texto: 'ttp',
  cachelist: 'cachelist', listacache: 'cachelist', cache: 'cachelist',
};

// Los comandos de porcentaje comparten precio. Se listan por nombre porque el
// dispatcher los reparte uno a uno y no hay forma de reconocerlos por patrón
// sin arriesgarse a cobrar de más por algo que no lo es.
const CMDS_PORCENTAJE = [
  'gay', 'maricon', 'maricón', 'femboy', 'incel', 'simp', 'friki', 'rata', 'cerdo', 'inutil',
  'perdedor', 'l', 'ganador', 'crack', 'puta', 'guarra', 'fea', 'linda', 'hot', 'sexy',
  'iq', 'fiel', 'infiel', 'feminidad', 'masculinidad',
];
for (const c of CMDS_PORCENTAJE) COBRO_CENTRAL[c] = 'percent';

// Estos YA cobran por dentro, y ahí tiene que seguir: son los que gastan un
// recurso externo (descarga, ffmpeg, API) y devuelven el aura si el recurso
// falla. Cobrarlos también aquí sería cobrar dos veces.
const COBRAN_SOLOS = new Set([
  'play', 'playsong', 'playaudio', 's', 'sticker', 'stk', 'toimg', 'tovid',
  'g', 'ai', 'pfp', 'fk', 'verificar', 'verify', 'check', 'top5', 'top10',
  // vs/versus cobran dentro de cmdVs: tienen tres salidas sin respuesta (sin
  // menciones, contra uno mismo, y el silencio contra el owner) y cobrando
  // fuera se pagaba por ellas.
  'vs', 'versus',
]);

// El fuente de este mismo fichero, leido UNA vez.
//
// Dos sitios lo necesitan —la lista de comandos que tapa !aura off y la de
// comandos conocidos para el "¿querias decir...?"— y cada uno hacia su propio
// readFileSync de ~100 KB en el require. Dos lecturas sincronas del mismo
// fichero antes de abrir el socket, para sacar lo mismo.
//
// Si la lectura falla, las dos deducciones caen a su respaldo y el bot arranca.
const FUENTE_PROPIA = (() => {
  try { return fs.readFileSync(__filename, 'utf8'); } catch { return ''; }
})();

// Los comandos que MUEVEN AURA y que por tanto tapa el interruptor de !aura off.
//
// ESTABA A MANO Y SE HABIA PODRIDO. Listaba seis nombres —robo, robar, duel,
// duelo, 1v1, dar, donar— y desde entonces se habian ido añadiendo alias que
// llegan a los mismos comandos sin pasar por aqui: !regalar, !transferir y
// !pagar movian aura con la economia apagada, y lo mismo !asalto, !comprar,
// !contrarobo y !atraco. O sea que el interruptor tapaba el nombre principal y
// dejaba abierta la puerta de al lado.
//
// El motivo del podrido es el de siempre: dos sitios que tienen que decir lo
// mismo y solo uno se toca al añadir un alias. Asi que ahora sale del propio
// dispatcher, igual que COMANDOS_CONOCIDOS: se buscan los bloques de `case`
// consecutivos que acaban llamando a uno de los comandos que tocan el saldo, y
// se cogen TODAS sus etiquetas. Añadir un alias nuevo lo mete solo.
//
// cmdAura queda fuera a proposito: ese si mira el interruptor por dentro (ver
// auraApagada en aura.js), y ademas tiene ramas que deben seguir contestando
// con la economia apagada, como la guia y el propio !aura on.
const CMDS_AURA = (() => {
  const aMano = ['robo', 'robar', 'duel', 'duelo', '1v1', 'dar', 'donar'];
  try {
    const src = FUENTE_PROPIA;
    const bloques = /((?:\s*case '[^']+':[^\n]*\n)+)\s*await (cmdDar|cmdRobo|cmdDuel)\(/g;
    const fuera = new Set(aMano);
    for (const m of src.matchAll(bloques)) {
      for (const c of m[1].matchAll(/case '([^']+)'/g)) fuera.add(c[1]);
    }
    return fuera;
  } catch {
    // Si el fichero no se puede leer, la lista a mano es el suelo: mejor tapar
    // de menos que quedarse sin interruptor del todo.
    return new Set(aMano);
  }
})();

// Comandos que TRABAJAN sobre la foto o el vídeo que llevan adjunto. La guarda
// de medios sin "ver una vez" los deja pasar: mandar una foto con el pie *!s*
// es usar el bot, no spamear, y contarlo como ofensa acababa expulsando a gente
// por hacerse cinco stickers seguidos. Con un vídeo pasaba algo peor: se
// borraba antes de llegar al comando, así que *!s* sobre un vídeo normal no
// producía sticker nunca.
//
// Es una lista cerrada a propósito. Si valiera cualquier texto que empiece por
// el prefijo, bastaría con poner *!loquesea* de pie para saltarse la norma.
const MEDIA_CMDS = new Set([
  's','sticker','stk',
  'toimg','stimg','tovid',
  'fk','verificar','verify','check',
  // marcarfake y fake NO estan aqui: no miran el medio adjunto, trabajan sobre
  // una mencion o una cita. Tenerlos dentro era justo el atajo que esta lista
  // dice impedir — bastaba con poner *!marcarfake* de pie de foto para saltarse
  // la norma de ver-una-vez y el contador de rafagas.
]);

// Expulsa y dice si WhatsApp lo aceptó DE VERDAD.
//
// La llamada devuelve un resultado por participante y puede rechazar la
// expulsión (privacidad, el objetivo es admin, el bot perdió el admin entre
// medias). Las guardas automáticas la lanzaban sin mirar y anunciaban la
// expulsión igual, así que el bot afirmaba haber echado a alguien que seguía
// sentado en el grupo — el mismo fallo que ya se corrigió en las purgas.
// QUE ID SE BORRA CUANDO EL MENSAJE ES UNA EDICION.
//
// Al editar, WhatsApp manda un evento NUEVO (un protocolMessage) que lleva el
// texto nuevo dentro y, aparte, la key del mensaje ORIGINAL. El detector ya
// miraba dentro del sobre —por eso caza el enlace metido al editar—, pero
// despues borraba `msg.key.id`, que es el id del evento de edicion. Borrar el
// evento no quita nada de la pantalla: el mensaje original se queda ahi con el
// enlace puesto. O sea que la mitad util del arreglo anterior no llegaba a
// pasar.
//
// Se mira la key del original y, si no viene, se usa la del propio mensaje.
function idABorrar(msg) {
  const m = msg?.message;
  return (
    m?.protocolMessage?.key?.id ||
    m?.editedMessage?.message?.protocolMessage?.key?.id ||
    msg?.key?.id
  );
}

// Esta era la UNICA de las siete copias que lo hacia bien, y solo porque ya se
// habia corregido aqui despues de que el bot anunciara expulsiones que no
// ocurrieron. Ahora la regla vive en un sitio y las siete la comparten.
//
// Lo que gana al pasar por el contrato: cruza LID↔telefono por la METADATA, no
// solo por canonicalJid. canonicalJid necesita el mapa caliente, y el mapa esta
// frio justo despues de cada reinicio; la metadata trae las dos formas siempre.
async function expulsar(sock, jid, target, meta = null) {
  return aplicarAUno(sock, jid, target, 'remove', meta);
}

// LA MISMA PERSONA CON LA MISMA CLAVE EN LOS CUATRO SITIOS.
//
// isAllowed() recibe allForms() —todas las formas conocidas— pero el pase, los
// avisos y el indulto recibian el `sender` pelado. Los tres canonicalizan por
// dentro, y ahi esta el problema: canonicalJid solo cruza LID↔telefono cuando
// el mapa ya esta caliente. Con el mapa frio, la misma persona se apunta bajo
// su LID en un momento y bajo su telefono en otro — o sea que los tres avisos
// antes del ban se reinician solos y el ban no llega nunca.
//
// La metadata del grupo SIEMPRE trae las dos formas, asi que se saca de ahi la
// del telefono, que es la unica estable.
function claveDePersona(sender, meta) {
  const canon = canonicalJid(sender);
  if (canon && canon.endsWith('@s.whatsapp.net')) return canon;
  for (const f of allForms(sender, meta)) {
    if (f && f.endsWith('@s.whatsapp.net')) return f;
  }
  return canon || sender;
}

// Expulsa a una cuenta Business detectada por su propio mensaje.
//
// Se apoya en `verifiedBizName`, que WhatsApp adjunta al mensaje de una cuenta
// Business verificada: es prueba directa, sin consultar el perfil, y llega
// igual en grupos LID (donde getBusinessProfile no sirve porque no acepta
// LIDs). Cubre justo el hueco de la comprobación de entrada.
//
// Mismas garantías que el resto de la moderación: solo si el modo está
// encendido, nunca al owner tier ni a un admin ni al bot, y hace falta ser
// admin para poder echar a alguien.
const avisoBizReciente = new Map(); // `${jid}|${canonical}` -> ts

async function expulsarBusinessDetectado(sock, jid, sender, msg, motivo = 'cuenta de negocio') {
  if (!jid.endsWith('@g.us') || !isAntiBusinessEnabled(jid)) return;

  const meta = await getGroupMeta(sock, jid);
  if (!meta) return;
  if (isGroupAdmin(sender, msg.key.fromMe, meta)) return; // admins y owner tier
  if (!isBotAdmin(sock, meta)) return;

  const clave = `${jid}|${canonicalJid(sender)}`;
  const ultimo = avisoBizReciente.get(clave);
  if (ultimo && Date.now() - ultimo < 10 * 60 * 1000) return;

  logger.info(`Anti-empresa: ${sender} en ${jid} — ${motivo}`);
  const fuera = await expulsar(sock, jid, sender, meta);
  const num = sender.split('@')[0];

  if (fuera) {
    // ECHAR SIN VETAR ES UNA PUERTA GIRATORIA. Era la unica guarda automatica
    // grave que no llamaba a banAccount: los enlaces, los stickers, las fotos y
    // las historias si lo hacen. Con el enlace del grupo en la mano, a quien
    // solo se le expulsa vuelve a entrar y hay que echarlo otra vez, y otra.
    // La lista negra ya la aplica guardOnJoin al entrar, asi que no hace falta
    // inventar nada: el owner puede deshacerlo con *!fkunban*.
    await banAccount(allForms(sender, meta), `cuenta business en ${jid} (${motivo})`, 'auto').catch(() => {});
    if (puedeAnunciar(jid, sender)) {
      sock.sendMessage(jid, {
        text: `*Anti-empresa:* @${num} es cuenta de WhatsApp Business. Expulsada y vetada.`,
        mentions: [sender],
      }).catch(() => {});
    }
  } else {
    anotarTropiezo(`Anti-empresa: +${num} detectada en ${jid} y NO he podido expulsarla. Hazlo a mano.`);
  }

  // EL FRENO SE PONE AL FINAL, y antes iba arriba. Puesto antes del kick, un
  // intento que fallara porque el bot todavia no era admin dejaba diez minutos
  // de ceguera justo despues de darle admin. Solo se frena cuando ya se sabe
  // que hubo un intento de verdad.
  if (avisoBizReciente.size >= 2000) avisoBizReciente.delete(avisoBizReciente.keys().next().value);
  avisoBizReciente.set(clave, Date.now());
}


// Una historia que llega por status@broadcast en vez de por el grupo.
//
// Es el mismo delito, pero por otra puerta: WhatsApp reparte las historias por
// el canal de estados, asi que el mensaje NO trae el JID del grupo en
// remoteJid. Lo que si trae —cuando la historia va dirigida a grupos— es
// statusMentionSources, la lista de destinos. De ahi salen los grupos.
//
// Se busca en todo el objeto y no en una ruta fija a proposito: WhatsApp ha
// movido este campo de sitio mas de una vez, y una ruta exacta que deje de
// existir vuelve a dejar al bot ciego sin avisar de nada.
function gruposDeLaHistoria(obj, vistos = new Set(), salida = new Set()) {
  if (!obj || typeof obj !== 'object' || vistos.has(obj)) return salida;
  vistos.add(obj);
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'statusMentionSources' && Array.isArray(v)) {
      for (const x of v) if (typeof x === 'string' && x.endsWith('@g.us')) salida.add(x);
    } else if (v && typeof v === 'object') {
      gruposDeLaHistoria(v, vistos, salida);
    }
  }
  return salida;
}

async function historiaPorBroadcast(sock, msg, deteccion) {
  const autor = msg.key.participant || msg.participant;
  const grupos = [...gruposDeLaHistoria(msg.message)];

  // Sin destino no se puede sancionar a nadie: no sabriamos en que grupo. Queda
  // el registro para poder afinar con un caso real en vez de a ciegas.
  if (!autor || !grupos.length) {
    logger.info(
      `historia por broadcast (${deteccion.motivo}) de ${autor || 'desconocido'}: ` +
      `sin grupo identificable — tipos=[${Object.keys(msg.message || {}).join(',')}]`);
    return;
  }

  for (const g of grupos) {
    const meta = await getGroupMeta(sock, g).catch(() => null);
    if (!meta) continue;
    // Al owner y a los admins no les toca, igual que en la puerta del grupo.
    if (isGroupAdmin(autor, false, meta) || isOwner(autor, false, meta)) continue;
    if (!isBotAdmin(sock, meta)) {
      logger.warn(`historia en ${g}: no soy admin, no puedo expulsar a ${autor}`);
      continue;
    }
    // Solo con el sobre identificado. Si vino por heuristica no se sanciona a
    // ciegas y encima sin poder borrar nada, que aqui el mensaje no esta en el
    // grupo: se avisa y que decidan los admins.
    if (!deteccion.seguro) {
      sock.sendMessage(g, {
        text: `@${String(autor).split('@')[0]} parece haber subido una historia al grupo. No la puedo borrar desde aquí; miradlo.`,
        mentions: [autor],
      }).catch(() => {});
      continue;
    }
    await banAccount(allForms(autor, meta), `historia subida al grupo ${g}`, 'auto').catch(() => {});
    const fuera = await expulsar(sock, g, autor, meta);
    logger.warn(`historia en ${g} de ${autor}: vetado, expulsado=${fuera}`);
    sock.sendMessage(g, {
      text: `@${String(autor).split('@')[0]} fuera y a la lista negra por subir una historia al grupo.`,
      mentions: [autor],
    }).catch(() => {});
    if (!fuera) anotarTropiezo(`Historia en ${g} de +${String(autor).split('@')[0]}: vetado pero NO expulsado. Hazlo a mano.`);
  }
}

// !diag — herramienta de diagnostico de las guardas automaticas.
//
// Existe por un motivo concreto: el bot borra a quien MENCIONA al grupo en un
// estado pero no siempre a quien SUBE una historia al grupo, y sin ver el sobre
// real que manda WhatsApp no hay forma de saber cual falta. Esto lo enseña.
//
// El informe se manda al privado y el *!diag* se borra del grupo, igual que
// *!k*. Contestarlo en el grupo era anunciar que quien lo escribio tiene una
// herramienta que los demas no pueden usar.
async function cmdDiag(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) return;

  const destino = privadoDelOwner(sender, groupMeta) || (jid.endsWith('@g.us') ? null : jid);
  if (!destino) {
    logger.warn('!diag: no pude resolver el privado del owner');
    return;
  }
  if (jid.endsWith('@g.us')) {
    sock.sendMessage(jid, {
      delete: { remoteJid: jid, fromMe: Boolean(msg.key.fromMe), id: idABorrar(msg), participant: sender },
    }).catch(() => {});
  }

  const meta = groupMeta || await getGroupMeta(sock, jid).catch(() => null);
  const si = (b) => (b ? 'SI' : 'NO');

  let text = '*DIAGNOSTICO DE GUARDAS*\n╾━━━━━━━━━━━━━━╼\n\n';
  text += `Soy admin aquí: *${si(meta && isBotAdmin(sock, meta))}*\n`;
  text += `Anti-link: *${si(isAntiLinkEnabled(jid))}*\n`;
  text += `Anti-empresa: *${si(isAntiBusinessEnabled(jid))}*\n`;
  text += `Modo admin: *${si(isSoloAdminsEnabled(jid))}*\n\n`;
  text += `Sobres de estado vigilados: *${SOBRES_ESTADO.length}*\n`;

  const lista = sobresDesconocidos();
  if (!lista.length) {
    text += '\n_No ha llegado ningún sobre desconocido desde que arrancó el bot._\n';
    text += '_Si alguien sube una historia al grupo y el bot no reacciona, vuelve a ejecutar esto justo después: el sobre aparecerá aquí y con eso se puede cerrar el hueco._';
  } else {
    text += `\n*Sobres desconocidos vistos (${lista.length}):*\n`;
    for (const d of lista.slice(0, 6)) {
      const hace = Math.round((Date.now() - d.ts) / 60000);
      text += `\n• *${d.sobre}* — hace ${hace} min, de +${d.de || '?'}\n`;
      text += '```' + JSON.stringify(d.forma).slice(0, 320) + '```\n';
    }
    text += '\n_Si alguno de estos coincide con una historia subida al grupo, pásamelo y lo añado a la lista vigilada._';
  }

  await sock.sendMessage(destino, { text });
}

function esComandoDeMedia(text) {
  if (!text.startsWith(config.prefix)) return false;
  const first = text.slice(config.prefix.length).trim().split(/\s+/, 1)[0].toLowerCase();
  return MEDIA_CMDS.has(first);
}

// Throttle whitelist reminder to once per user per 5 min (no spam on every YT link).
const ANTILINK_REMINDER_TTL = 5 * 60 * 1000;
const antilinkReminders = new Map(); // 'groupJid|sender' -> timestamp
// Sus dos hermanos (antilinkReminders y videoOnceWarn) desalojan a las 2.000
// entradas; a este se le olvido. Va por grupo, asi que crece despacio, pero en
// un bot que lleva meses sin reiniciarse "despacio" tambien llega.
const MAX_AVISOS_GRUPO = 500;

// ─── "¿Querías decir...?" ────────────────────────────────────────────────────
//
// La lista de comandos SE LEE DE ESTE MISMO FICHERO, de los `case` del
// dispatcher. Mantenerla a mano en un array aparte garantiza que se quede
// desfasada: se anyade un comando, nadie se acuerda del array, y el bot acaba
// sugiriendo comandos que ya no existen o ignorando los nuevos. Leyendo la
// fuente no hay dos sitios que puedan discrepar.
// Comandos que NO existen para nadie salvo el owner, y que por tanto no pueden
// asomar por ningun lado: ni en el menu, ni en el "¿querias decir...?".
//
// Un comando que responde con silencio a quien no lo puede usar solo esta
// oculto si el bot no lo nombra en ningun otro sitio. El sugeridor es el hueco
// que se pasa por alto: no hace falta acertar el comando para que el bot te lo
// diga, basta con escribir algo parecido y el te lo completa. Escribir *!pf* y
// que el bot conteste "¿querias decir *!p*?" seria el propio bot enseñando la
// puerta.
//
// "p" tiene un caracter y el regex pide dos: se oculta por coincidencia.
// "purge" tiene cinco: sin esta lista, escribir "!pure" o "!purga" lo delataria.
// La exclusion se escribe aparte y `npm run check` la vigila.
const COMANDOS_OCULTOS = new Set(['p', 'purge']);

const COMANDOS_CONOCIDOS = (() => {
  try {
    // Se reutiliza la lectura de arriba. Eran DOS readFileSync del propio
    // fichero (~100 KB cada uno) en el require, bloqueando el arranque para
    // leer exactamente lo mismo dos veces.
    const src = FUENTE_PROPIA;
    return [...new Set([...src.matchAll(/^\s*case '([a-zá-úñ0-9_]+)':/gmi)].map(m => m[1]))]
      .filter((c) => c.length >= 2 && !COMANDOS_OCULTOS.has(c));
  } catch { return []; }
})();

// Distancia de edicion, cortada en cuanto se pasa del maximo que nos interesa.
function distancia(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const fila = [i];
    let mejor = i;
    for (let j = 1; j <= b.length; j++) {
      fila[j] = Math.min(prev[j] + 1, fila[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (fila[j] < mejor) mejor = fila[j];
    }
    if (mejor > max) return max + 1;
    prev = fila;
  }
  return prev[b.length];
}

// El parecido exigido sube con lo corto que sea lo escrito: en algo de 3 letras
// una distancia de 2 ya es otra palabra distinta.
function sugerirComando(escrito) {
  if (!escrito || escrito.length < 3) return null;
  const max = escrito.length <= 4 ? 1 : 2;
  let mejor = null, mejorD = max + 1;
  for (const c of COMANDOS_CONOCIDOS) {
    // Un comando que EMPIEZA por lo escrito casi siempre es lo que se buscaba
    // (*!apues* -> *!apuesta*), aunque la distancia sea mayor que el margen.
    if (c.length > escrito.length && c.startsWith(escrito)) return c;
    const d = distancia(escrito, c, max);
    if (d < mejorD) { mejorD = d; mejor = c; }
  }
  return mejorD <= max ? mejor : null;
}

// Una sugerencia por persona cada 30 s. Sin esto, quien se pelea con el teclado
// convierte el chat en un hilo de correcciones del bot.
const ultimaSugerencia = new Map();
function puedeSugerir(quien) {
  const k = String(quien);
  const ahora = Date.now();
  if (ultimaSugerencia.size >= MAX_AVISOS_GRUPO) ultimaSugerencia.delete(ultimaSugerencia.keys().next().value);
  if (ahora - (ultimaSugerencia.get(k) || 0) < 30000) return false;
  ultimaSugerencia.set(k, ahora);
  return true;
}
const antilinkNoAdminWarn = new Map(); // 'groupJid' -> timestamp (bot-not-admin notice)
const videoOnceWarn = new Map();       // 'groupJid|sender|vo' -> timestamp del ultimo aviso

// Group metadata cache: 30s TTL, bounded at 500 entries (FIFO eviction).
// Bot.js calls invalidateGroupMeta() on participant changes so the cache
// never serves stale member lists right after joins/kicks/promotes.
// EL TTL ERA DE 30 s Y NO HACIA FALTA. La invalidacion de esta cache es por
// EVENTO: bot.js llama a invalidateGroupMeta() en cuanto cambia un participante
// (entra, sale, lo ascienden). O sea que el TTL no protege de nada que la
// invalidacion no cubra ya; lo unico que hacia era forzar una consulta de red
// cada 30 s por grupo activo. En una VPS de 1 GB con la conexion que hay, esa
// consulta es de las que se notan en el tiempo de respuesta.
//
// Diez minutos deja la red tranquila y sigue siendo una red de seguridad por si
// algun cambio no genera evento.
const META_TTL = 10 * 60_000;
const META_MAX = 500;
const metaCache = new Map();
// Consultas en curso por grupo. Sin esto, cinco mensajes que llegan juntos con
// la cache fria disparan cinco groupMetadata para el mismo grupo.
const metaEnVuelo = new Map();
// Generación: un join/kick invalida TAMBIÉN la consulta en vuelo. Sin esto, el
// fetch que salió antes del evento termina, escribe meta vieja en cache y el
// TTL de 10 min sirve la lista de miembros de antes del cambio.
const metaGen = new Map();

// Hard timeout on the groupMetadata call — without this, a stalled WebSocket
// can hang the entire message handler for tens of seconds (or forever).
const META_FETCH_TIMEOUT = 8000;

async function getGroupMeta(sock, jid) {
  const c = metaCache.get(jid);
  if (c && Date.now() - c.ts < META_TTL) {
    // LRU de verdad: un hit tiene que volver al final o el desalojo tira el
    // grupo activo y conserva uno visto una vez hace una hora.
    if (metaCache.size > 1) {
      metaCache.delete(jid);
      metaCache.set(jid, c);
    }
    if (c.meta) indexGroupMeta(c.meta);
    return c.meta;
  }
  const yaVa = metaEnVuelo.get(jid);
  if (yaVa) return yaVa;

  const gen = metaGen.get(jid) || 0;
  let tarea;
  tarea = (async () => {
    try {
      const meta = await withTimeout(sock.groupMetadata(jid), META_FETCH_TIMEOUT);
      if (meta) indexGroupMeta(meta);
      // Un invalidate durante el vuelo: se devuelve lo leído pero NO se cachea.
      if ((metaGen.get(jid) || 0) !== gen) return meta;
      if (metaCache.size >= META_MAX) {
        metaCache.delete(metaCache.keys().next().value);
      }
      metaCache.set(jid, { meta, ts: Date.now() });
      return meta;
    } catch {
      if (c?.meta) indexGroupMeta(c.meta);
      return c?.meta ?? null;
    } finally {
      if (metaEnVuelo.get(jid) === tarea) metaEnVuelo.delete(jid);
    }
  })();
  metaEnVuelo.set(jid, tarea);
  return tarea;
}

function invalidateGroupMeta(jid) {
  metaCache.delete(jid);
  metaEnVuelo.delete(jid);
  metaGen.set(jid, (metaGen.get(jid) || 0) + 1);
}

// Non-blocking peek: returns whatever group metadata is already cached (even if
// past its TTL) without ever triggering a network fetch. Used in the hot
// message path to resolve the owner's LID → phone for the counter exclusion,
// where a real fetch on every message would be far too expensive. Owner
// identity is stable, so a slightly stale member list is fine here.
function peekGroupMeta(jid) {
  return metaCache.get(jid)?.meta ?? null;
}

// ─── El disparador silencioso de !k ──────────────────────────────────────────
//
// "!k" es reconocible: es corto, raro, y cualquiera que le eche un ojo a los
// mensajes del owner lo detecta como "eso no es una frase, es un comando". Para
// la comprobación de cuentas falsas, que es justo la que tiene que pasar
// desapercibida, hacía falta algo que se leyera como conversación normal.
//
// Por eso estas dos frases funcionan como si fueran "!k" escrito: mismas
// guardas (bot apagado, mute, NEEDS_META), mismo log. Se reescribe el texto
// ANTES de cualquier otra comprobación —así que "engañar" al resto del
// pipeline para que crea que se escribió "!k" es prácticamente todo lo que
// hace este bloque.
//
// LO ÚNICO QUE NO COMPARTEN es el borrado del mensaje disparador: "!k" tecleado
// a pelo se borra (canta si se queda puesto), pero "Welcome"/"diría algo" NO —
// son palabras corrientes y borrarlas llamaría más la atención que dejarlas.
// Por eso el switch (case 'k') recibe `viaTriggerK` y decide con eso; ver
// cmdK en commands/k.js.
//
// Coincidencia EXACTA del mensaje entero (sin mayúsculas ni tildes), no una
// palabra suelta dentro de una frase más larga: así un "Bienvenido, no diría
// algo así" no dispara nada por casualidad.
//
// Y SOLO si el mensaje cita o trae un archivo. "Welcome" es una palabra
// corriente — dar la bienvenida a alguien que entra al grupo es de las cosas
// más normales que hay — así que sin esta condición cualquier saludo real
// dispararía el comando entero (log, fetch de metadata, comprobación de owner)
// por una coincidencia de texto. Exigir un adjunto reduce eso a casi cero,
// porque además es el único caso en el que el comando hace algo: sin archivo,
// "!k" de verdad tampoco tiene qué reenviar.
// Se aceptan las dos formas del verbo y se IGNORA la puntuacion de los bordes.
//
// EXISTE POR UN FALLO QUE SE COMIA LA MITAD DE LOS DISPAROS. La comparacion era
// exacta contra la cadena pelada, asi que "Diría algo?" —escrito tal cual, con
// interrogante, que es como lo escribe cualquiera— NO disparaba. Ni "Welcome!".
// El comando parecia funcionar a veces si y a veces no, y lo que cambiaba era
// un signo que nadie mira al escribir.
//
// Se recortan solo los signos de los extremos: por dentro la frase tiene que
// seguir siendo la que es, asi que un "no diria algo asi" sigue sin disparar
// nada.
const TRIGGERS_K = ['welcome', 'diria algo', 'dirias algo'];
const BORDES = /^[\s¿¡"'“”«»(\[]+|[\s?!¿¡.,;:"'“”«»)\]…]+$/g;
function esTriggerK(texto) {
  const norm = texto
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(BORDES, '')
    .replace(/\s+/g, ' ');
  return TRIGGERS_K.includes(norm);
}
function traeArchivoParaK(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  return Boolean(hallarMedio(ctx?.quotedMessage) || hallarMedio(msg.message));
}

// Peel envelope wrappers so the real content (and its caption) is visible.
// Disappearing-message chats wrap EVERY message in ephemeralMessage; view-once
// media and the newer documentWithCaption envelope nest the same way. Without
// this, sending a video/image WITH a `!s` caption in such a chat hides the
// caption (extractText only checks top-level fields) so the command never fires
// — the exact "send the video and the command together and nothing happens" bug.
function unwrapEnvelope(message) {
  let m = message;
  for (let i = 0; i < 4 && m; i++) {
    const inner =
      m.ephemeralMessage?.message ||
      m.viewOnceMessage?.message ||
      m.viewOnceMessageV2?.message ||
      m.viewOnceMessageV2Extension?.message ||
      m.documentWithCaptionMessage?.message ||
      // Los de estado de grupo tambien son envoltorios: dentro viene la foto o
      // el video de verdad. Sin abrirlos, las guardas de medios y de enlaces se
      // quedaban mirando un sobre vacio.
      m.groupStatusMessage?.message ||
      m.groupStatusMessageV2?.message;
    if (!inner) break;
    m = inner;
  }
  return m;
}

// ─── Estados publicados al grupo ─────────────────────────────────────────────
//
// Publicar un estado dentro del grupo esta PROHIBIDO, traiga lo que traiga: da
// igual que sea un enlace o una foto del atardecer. Se borra, se banea la cuenta
// y se expulsa a quien lo publico. Admins y owner tier quedan exentos.
//
// Que este prohibido siempre es ademas lo que hace fiable al guardia. Antes solo
// se actuaba si el estado contenia un enlace, y para eso habia que leer su
// contenido — pero el mensaje que llega al grupo es un AVISO, no el estado: el
// contenido de verdad vive en la difusion de estados, no aqui. Como no habia
// texto que leer, nunca se encontraba enlace y el bot no hacia nada. Ahora no se
// lee nada: basta con reconocer el sobre.
//
// Se miran TODOS los sobres que usa WhatsApp para esto. El que faltaba, y que
// costo que esto no funcionara, era `groupStatusMessage` (WAProto/index.d.ts:
// 5264) — distinto de `groupStatusMentionMessage`, que si se comprobaba.
const SOBRES_ESTADO = [
  'groupStatusMessage',          // el estado empujado al grupo
  // FALTABA, y es el sobre nuevo. Baileys 7 lo trata a la par que
  // groupStatusMessage en getFutureProofMessage (Utils/messages.js), o sea que
  // WhatsApp ya manda historias de grupo por aqui. Sin este nombre en la lista,
  // una historia subida DIRECTAMENTE al grupo entraba como un mensaje normal y
  // no la paraba nadie. Es justo el caso que seguia colandose.
  'groupStatusMessageV2',
  'groupStatusMentionMessage',   // el grupo mencionado en un estado
  'statusMentionMessage',
  'statusAddYours',
  'statusNotificationMessage',
  'statusQuestionAnswerMessage',
  'statusStickerInteractionMessage',
  // Faltaba: es el sobre de un estado CITADO/reenviado dentro del chat
  // (WAProto: Message.statusQuotedMessage = 109, lleva originalStatusId
  // apuntando al estado original). Es la via mas probable de "subir una
  // historia al grupo", que es justo el caso que seguia colandose mientras
  // las MENCIONES si se detectaban.
  'statusQuotedMessage',
];

// ─── Marcas de estado: qué campo vive dónde ──────────────────────────────────
//
// Esta parte estaba mal de raíz y costó que el bot expulsara y metiera en la
// lista negra global a alguien por mandar un VÍDEO NORMAL. Dos errores a la vez,
// en direcciones opuestas:
//
// 1. SE MIRABAN CAMPOS QUE NO EXISTEN EN ContextInfo. `isMentionedInStatus`,
//    `statusMentions`, `statusMentionMessageInfo` y `statusMentionSources`
//    pertenecen a WebMessageInfo — el sobre del mensaje, `msg` — no a
//    `msg.message[x].contextInfo`. Preguntados donde se preguntaban, salían
//    siempre `undefined`: no detectaban nada nunca. `statusLinkType` es de
//    InteractiveAnnotation, `quotedStatus` de StatusMentionMessage y
//    `originalStatusId` de otro anidado. O sea que la mitad del guardia era
//    decorativa, y por eso los estados se colaban. Ahora se preguntan donde
//    viven (ver `marcaDeEstadoEnSobre`) y se dejan además como red defensiva
//    donde estaban, porque ahí no hacen daño.
//
// 2. LOS QUE SÍ EXISTEN SE LEÍAN CON Boolean(), Y SON ENUMS. `statusSourceType`
//    vale IMAGE=0, VIDEO=1, GIF=2, AUDIO=3, TEXT=4. `Boolean(1)` es `true`, así
//    que cualquier mensaje que trajera ese campo con valor VÍDEO quedaba marcado
//    como estado. Un vídeo corriente. Eso es exactamente lo que pasó.
//
// Ahora cada campo se pregunta donde vive y con el valor concreto que significa
// algo, no con una conversión a booleano que confunde "es un vídeo" con "es un
// estado".

// El enum StatusAttributionType: NONE(0) es "sin atribución", o sea, un mensaje
// normal. Del 1 al 4 sí son resubidas de un estado. Se compara contra el valor,
// no con Boolean, y se acepta tanto la forma numérica como la de cadena (según
// cómo se haya decodificado el proto).
const ATRIBUCION_NEUTRA = new Set([0, '0', 'NONE']);
function atribuidoAEstado(v) {
  return v !== undefined && v !== null && !ATRIBUCION_NEUTRA.has(v);
}

// Marcas dentro del contextInfo. SOLO campos que existen de verdad ahí y cuyo
// significado es inequívoco.
//
// `statusSourceType` queda fuera a propósito: solo dice de qué tipo es un medio
// (imagen, vídeo, audio...). Por sí solo no afirma que haya un estado, y es
// justo el que provocó la expulsión injusta.
function marcaDeEstado(ctx) {
  if (!ctx) return false;
  return ctx.isGroupStatus === true ||
    atribuidoAEstado(ctx.statusAttributionType) ||
    (Array.isArray(ctx.statusAttributions) && ctx.statusAttributions.length > 0) ||
    Boolean(ctx.statusAudienceMetadata) ||
    // Red defensiva. Estos tres NO viven hoy en ContextInfo — `quotedStatus` es
    // de StatusMentionMessage y los otros dos de WebMessageInfo, que ya se mira
    // aparte — así que a día de hoy no se cumplen nunca. Se dejan porque son
    // campos de OBJETO: preguntar por su presencia no puede confundir "esto es
    // un vídeo" con "esto es un estado", que es exactamente el fallo que tenían
    // los enums. Si WhatsApp mueve alguno de sitio, el guardia lo sigue viendo
    // en vez de dejar de funcionar en silencio, que es como empezó todo esto.
    Boolean(ctx.quotedStatus) ||
    Boolean(ctx.originalStatusId) ||
    Boolean(ctx.statusMentionMessageInfo) ||
    ctx.isMentionedInStatus === true ||
    (Array.isArray(ctx.statusMentions) && ctx.statusMentions.length > 0);
}

// Marcas del SOBRE del mensaje (WebMessageInfo). Aquí es donde WhatsApp pone de
// verdad lo de las menciones en estados.
function marcaDeEstadoEnSobre(msg) {
  if (!msg) return null;
  if (msg.isMentionedInStatus === true) return 'msg.isMentionedInStatus';
  if (msg.statusMentionMessageInfo) return 'msg.statusMentionMessageInfo';
  if (Array.isArray(msg.statusMentions) && msg.statusMentions.length) return 'msg.statusMentions';
  if (Array.isArray(msg.statusMentionSources) && msg.statusMentionSources.length) return 'msg.statusMentionSources';
  return null;
}

// ¿Es un estado publicado al grupo? Devuelve { motivo, seguro }:
//   seguro: true  -> vino el sobre de estado. No hay duda posible.
//   seguro: false -> se dedujo de campos sueltos. Es una heurística.
// null si no lo es.
//
// La distinción existe porque la sanción ya no es la misma para las dos: una
// heurística no puede costar el grupo (ver más abajo).
function motivoEstado(message, msg = null) {
  const enSobre = marcaDeEstadoEnSobre(msg);

  if (message) {
    for (const s of SOBRES_ESTADO) {
      if (message[s]) return { motivo: s, seguro: true };
    }
    // El sobre puede venir dentro de un envoltorio efimero o de ver-una-vez.
    const dentro = unwrapEnvelope(message);
    if (dentro !== message) {
      for (const s of SOBRES_ESTADO) {
        if (dentro?.[s]) return { motivo: s + ' (envuelto)', seguro: true };
      }
    }
    for (const m of [message, dentro]) {
      if (!m) continue;
      for (const k of Object.keys(m)) {
        const ctx = m[k]?.contextInfo;
        if (ctx && marcaDeEstado(ctx)) return { motivo: `contextInfo.${k}`, seguro: false };
      }
    }
  }

  if (enSobre) return { motivo: enSobre, seguro: false };
  return null;
}

// Tipos de mensaje que el bot ya sabe manejar. Cualquier otro que llegue a un
// grupo se registra UNA vez, para que un sobre nuevo de WhatsApp no vuelva a
// pasar desapercibido como paso con groupStatusMessage.
const TIPOS_CONOCIDOS = new Set([
  'conversation', 'extendedTextMessage', 'imageMessage', 'videoMessage',
  'audioMessage', 'stickerMessage', 'documentMessage', 'documentWithCaptionMessage',
  'contactMessage', 'contactsArrayMessage', 'locationMessage', 'liveLocationMessage',
  'reactionMessage', 'protocolMessage', 'senderKeyDistributionMessage',
  'messageContextInfo', 'ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2',
  'viewOnceMessageV2Extension', 'pollCreationMessage', 'pollCreationMessageV2',
  'pollCreationMessageV3', 'pollUpdateMessage', 'editedMessage', 'ptvMessage',
  'templateMessage', 'buttonsMessage', 'listMessage', 'listResponseMessage',
  'buttonsResponseMessage', 'templateButtonReplyMessage', 'interactiveMessage',
  'interactiveResponseMessage', 'albumMessage', 'eventMessage', 'commentMessage',
  'keepInChatMessage', 'stickerSyncRmrMessage', 'encReactionMessage',
  ...SOBRES_ESTADO,
]);
const tiposVistos = new Set();
// Bitacora de sobres no reconocidos, para poder mirarlos con *!diag*.
//
// El log del servidor solo dice el NOMBRE del sobre, y con eso no basta para
// saber si es un estado: hace falta ver la forma. Aqui se guarda la estructura
// (claves, no contenido) de los ultimos que llegaron, que es exactamente lo que
// se necesita para identificar el sobre de "historia subida al grupo" la
// proxima vez que alguien suba una.
const MAX_DESCONOCIDOS = 15;
const desconocidos = [];

// Solo las CLAVES, en profundidad limitada. Nunca el contenido: no se guarda ni
// texto ni media de nadie, solo la forma del sobre.
function formaDe(obj, prof = 0) {
  if (!obj || typeof obj !== 'object' || prof > 2) return typeof obj;
  if (Array.isArray(obj)) return obj.length ? [formaDe(obj[0], prof + 1)] : [];
  const out = {};
  for (const k of Object.keys(obj).slice(0, 12)) out[k] = formaDe(obj[k], prof + 1);
  return out;
}

function anotarTipoDesconocido(message, jid, sender) {
  for (const k of Object.keys(message || {})) {
    if (TIPOS_CONOCIDOS.has(k) || tiposVistos.has(k)) continue;
    if (tiposVistos.size > 200) return;
    tiposVistos.add(k);
    logger.warn(`tipo de mensaje NUEVO en grupo: ${k} — si algo deja de detectarse, empieza por aquí`);
    if (desconocidos.length >= MAX_DESCONOCIDOS) desconocidos.shift();
    desconocidos.push({
      sobre: k,
      ts: Date.now(),
      grupo: jid || null,
      de: sender ? sender.split('@')[0] : null,
      forma: formaDe(message[k]),
    });
  }
}

function sobresDesconocidos() { return desconocidos.slice().reverse(); }

// ¿El mensaje venía marcado como "ver una vez"?
//
// Hay que preguntarlo ANTES de unwrapEnvelope: esa función abre el envoltorio
// viewOnce y a partir de ahí un vídeo efímero es indistinguible de uno normal.
// Se recorre la cadena de envoltorios porque un chat con mensajes temporales
// mete el viewOnce dentro de un ephemeralMessage.
function isViewOnce(message) {
  let m = message;
  for (let i = 0; i < 4 && m; i++) {
    if (m.viewOnceMessage || m.viewOnceMessageV2 || m.viewOnceMessageV2Extension) return true;
    const inner =
      m.ephemeralMessage?.message ||
      m.viewOnceMessage?.message ||
      m.viewOnceMessageV2?.message ||
      m.viewOnceMessageV2Extension?.message ||
      m.documentWithCaptionMessage?.message;
    if (!inner) break;
    m = inner;
  }
  // WhatsApp marca además la bandera en el propio medio.
  const inner = unwrapEnvelope(message);
  return Boolean(inner?.videoMessage?.viewOnce || inner?.imageMessage?.viewOnce);
}

// ¿El que escribe es del owner tier? Se prueban las DOS formas que trae el
// propio mensaje, no solo la que llegó como remitente.
//
// Con la metadata a medias —un grupo LID donde WhatsApp no manda el
// phone_number de cada participante— isOwner no puede resolver el teléfono a
// partir del @lid, y si ese LID aún no estaba mapeado el owner o un co-owner
// pasaba por miembro raso y se comía la guarda. El teléfono viene en el propio
// mensaje (participantAlt), así que aquí siempre hay una segunda oportunidad.
function esOwnerDelMensaje(msg, sender, senderPn, meta) {
  if (isOwner(sender, msg.key.fromMe, meta)) return true;
  return Boolean(senderPn && isOwner(senderPn, msg.key.fromMe, meta));
}

// EL PRIVADO DEL BOT ES SOLO DEL OWNER TIER.
//
// Antes contestaba a cualquiera que le escribiera con el prefijo: *!ping*,
// *!commands*, *!whoami*, la guia entera del aura. No abria conversacion con
// nadie —eso nunca lo hizo, y es lo que de verdad tumba una cuenta— pero
// responder ya convierte el numero en un bot publico: cualquiera que lo tenga
// se pone a probar comandos, se aburre y le da a reportar. Varios reportes si
// suman.
//
// Silencio TOTAL para el que no es owner: ni "no puedes usar esto", ni visto,
// ni presencia. Un "no puedes" confirma que hay un bot detras, que es justo lo
// que no interesa confirmar. El que no sabe si hay algo al otro lado deja de
// escribir solo.
//
// Los grupos no se tocan: alli el bot es publico a proposito.
//
// Se prueban todas las formas del que escribe, no solo la que llega en la
// llave. Un privado normal llega como telefono, pero WhatsApp ya reparte
// tambien chats direccionados por @lid, y con el mapa frio ese @lid no se
// parece en nada al numero configurado. Si se resolviera de una sola forma, el
// propio dueño se quedaria fuera de su bot sin ningun mensaje que lo explique
// —el fallo mas caro de arreglar es el que no dice nada.
function ownerEnPrivado(msg, sender) {
  if (msg.key.fromMe) return true;
  const formas = [
    sender,
    canonicalJid(sender),
    msg.key.participantAlt,
    msg.key.participantPn,
    msg.key.remoteJid,
    canonicalJid(msg.key.remoteJid),
  ];
  return formas.some((f) => f && isOwner(f, false, null));
}

async function handleMessage(sock, msg) {
  // EL NOMBRE SE ANOTA LO PRIMERO DE TODO, antes de cualquier return.
  //
  // Estaba doscientas lineas mas abajo y detras de tres puertas cerradas, y por
  // eso el ranking en gris salia lleno de "alguien":
  //
  //   · `if (!msg.message) return` — una reaccion o un mensaje de protocolo no
  //     trae `message`, pero SI trae pushName. Se tiraba.
  //   · el `return` de status@broadcast — cada historia que ve el bot trae el
  //     nombre de quien la publico. Se tiraba tambien, y es de las fuentes mas
  //     ricas que hay: la gente publica estados mas a menudo de lo que escribe.
  //   · el filtro `jid.endsWith('@g.us')` — un privado al bot tambien trae
  //     nombre, y este almacen es global (no va por grupo), asi que descartarlo
  //     no protegia nada.
  //
  // Y se anota bajo TODAS las formas de la persona que trae la llave del
  // mensaje. En un grupo LID, `participant` es el @lid y `participantAlt` el
  // telefono: guardar solo una deja la ficha bajo una clave por la que luego
  // nadie pregunta.
  if (msg.pushName && !msg.key.fromMe) {
    recordName(
      [msg.key.participant, msg.key.participantAlt, msg.key.participantPn, msg.key.remoteJid?.endsWith('@g.us') ? null : msg.key.remoteJid],
      msg.pushName,
    ).catch(() => {});
  }

  if (!msg.message) return;
  // Se comprueba ANTES de desenvolver: unwrapEnvelope destruye la prueba.
  const eraViewOnce = isViewOnce(msg.message);
  // Y lo mismo con el estado, por el mismo motivo: unwrapEnvelope ahora tambien
  // abre los sobres de historia de grupo, asi que mirarlo despues seria mirar
  // un mensaje del que ya se borro la prueba. Se resuelve aqui, en crudo.
  const estadoCrudo = motivoEstado(msg.message, msg);
  // Replace the wrapped message with its real inner content so extractText and
  // every command's media lookup operate on the actual image/video/caption.
  msg.message = unwrapEnvelope(msg.message);

  const jid = msg.key.remoteJid;

  // Lo que llega por status@broadcast solo interesa si es una historia. El
  // resto —los estados personales de cada contacto— se descarta aqui mismo, que
  // es lo que hacia antes el filtro de Baileys, pero sin cegar al bot.
  if (jid === 'status@broadcast') {
    if (estadoCrudo) await historiaPorBroadcast(sock, msg, estadoCrudo);
    return;
  }
  if (!jid) return; // protocol/system message without a chat JID — nothing to do
  const sender = getSender(msg);
  const textoCrudo = extractText(msg).trim();
  // "Welcome" / "diría algo" citando o trayendo un archivo cuentan como si se
  // hubiera escrito "!k": ver la nota junto a esTriggerK más abajo.
  const viaTriggerK = esTriggerK(textoCrudo) && traeArchivoParaK(msg);
  const text = viaTriggerK ? `${config.prefix}k` : textoCrudo;

  // Correspondencia LID<->teléfono que WhatsApp adjunta a CADA mensaje de grupo.
  // Es la fuente más barata y fresca que hay, y de ella depende que una persona
  // no se parta en dos identidades (aura, conteo, owner).
  //
  // El campo es `participantAlt`, NO `participantPn`: este último no existe en
  // la key de un mensaje en Baileys 7 (Types/Message.d.ts declara participantAlt,
  // y Utils/decode-wa-message.js:187 es quien lo rellena). Leerlo daba undefined
  // siempre, así que esta capa entera llevaba sin funcionar.
  //
  // Y `participantAlt` es la forma ALTERNATIVA, no siempre el teléfono: en un
  // grupo direccionado por LID participant es el LID y alt el teléfono, pero en
  // uno direccionado por PN es al revés (extractAddressingContext, mismo
  // fichero, líneas 69-86). Guardar el par al revés metería basura en la caché
  // de mapeos, así que se decide por addressingMode y, si no viene, por el
  // servidor del propio JID.
  let senderPn = null;
  const alt = msg.key.participantAlt || msg.key.participantPn; // participantPn: solo compat
  if (alt && msg.key.participant) {
    const altEsLid = msg.key.addressingMode
      ? msg.key.addressingMode !== 'lid'
      : String(alt).endsWith('@lid');
    if (altEsLid) {
      rememberMapping(alt, msg.key.participant);
      senderPn = msg.key.participant;
    } else {
      rememberMapping(msg.key.participant, alt);
      senderPn = alt;
    }
  }

  // Skip own messages that aren't commands (avoids bot responding to itself)
  // fromMe = true when the owner sends from their linked phone — still allow commands
  if (msg.key.fromMe && !text.startsWith(config.prefix)) return;

  // La puerta del privado, y va aqui arriba a proposito: por delante de los
  // comandos, del visto, de la moderacion y de los contadores. Todo lo que
  // pueda enviar algo queda detras. Ver ownerEnPrivado.
  if (!jid.endsWith('@g.us') && !ownerEnPrivado(msg, sender)) return;

  // Non-blocking counters — never delay command execution.
  // Don't count the bot's own messages so the owner doesn't inflate their rank.
  incrementStat('messagesReceived');
  // El owner principal no cuenta para el ranking de actividad (!count): sus
  // mensajes no deben inflar la tabla. Los co-owners y el resto sí cuentan.
  // Se comprueba de dos formas para que sea fiable incluso en grupos LID:
  //  1) el JID del remitente resuelto con la metadata ya cacheada,
  //  2) su teléfono, sacado arriba del par que trae el propio mensaje. Esta es
  //     la que salva el caso de recién arrancado, con la caché de metadata
  //     vacía y el LID del owner aún sin aprender.
  const senderIsMainOwner =
    isMainOwner(sender, false, peekGroupMeta(jid)) ||
    (!!senderPn && isMainOwner(senderPn, false, null));

  if (!msg.key.fromMe && jid.endsWith('@g.us') && sender && !senderIsMainOwner) {
    incrementMsgCount(jid, sender).catch(() => {});
    // verifiedBizName solo viaja en mensajes de cuentas Business: se anota como
    // prueba directa para !antiempresa, sin gastar una consulta de perfil.
    //
    // Del owner tier NO se anota: esa ficha es justo la que alimenta la purga de
    // !antiempresa, y con el gate de arriba (isMainOwner, para el ranking) los
    // co-owners si quedaban fichados. El owner esta por encima tambien de esto.
    // EL BADGE NO PUEDE SER LA UNICA PUERTA, y esto era el agujero de fondo.
    //
    // `verifiedBizName` solo lo lleva una cuenta Business VERIFICADA. El que
    // usa Business para suplantar a alguien —abrir con la app, dejar la ficha
    // vacia a proposito y entrar como una persona cualquiera— no lo lleva
    // nunca. O sea que la guarda estaba encendida contra las marcas y apagada
    // contra el suplantador, que es a quien se quiere echar.
    //
    // Ahora hay dos disparadores: el badge (prueba directa, se anota y se echa)
    // y la FICHA YA GUARDADA. Si a esa cuenta se le vio un nombre de negocio en
    // cualquier grupo, aqui vale igual aunque este mensaje no traiga nada: la
    // prueba no caduca porque cambie de sala.
    if (msg.verifiedBizName && !isOwner(sender, msg.key.fromMe, peekGroupMeta(jid))) {
      recordFacts(sender, { biz: true }).catch(() => {});
      // Y ADEMÁS se actúa, no solo se anota.
      //
      // El anti-empresa solo miraba las ENTRADAS. Una cuenta Business que ya
      // estuviera dentro antes de encender el modo, o cuya comprobación de
      // entrada fallara (timeout, sin teléfono resoluble, el bot recién
      // arrancado), se quedaba para siempre aunque cada mensaje suyo trajera
      // la prueba encima. Eso es exactamente lo que se coló.
      //
      // `verifiedBizName` es prueba DIRECTA de WhatsApp: viaja en el propio
      // mensaje, no hace falta ninguna consulta de perfil y funciona igual con
      // @lid, que es donde la comprobación de entrada era ciega.
      expulsarBusinessDetectado(sock, jid, sender, msg, 'nombre verificado de negocio').catch(() => {});
    } else if (!isOwner(sender, msg.key.fromMe, peekGroupMeta(jid))) {
      // Sin badge: se mira lo ya fichado. Es una lectura de disco, no una
      // consulta de red, asi que puede correr en cada mensaje sin coste.
      getMemberFacts([sender, canonicalJid(sender)]).then(async (f) => {
        if (f?.biz) return expulsarBusinessDetectado(sock, jid, sender, msg, 'ya estaba fichada como cuenta de negocio');

        // Y SI NO HAY FICHA, SE MIRA EL PERFIL UNA VEZ. Este es el hueco que
        // quedaba: a quien entro cuando la consulta no respondio —o antes de
        // encender el modo— nadie lo volvia a mirar nunca. Se quedaba dentro
        // para siempre salvo que alguien se acordara de correr un scan.
        //
        // UNA vez por persona y grupo, no en cada mensaje: consultar el perfil
        // en cada linea es la forma mas rapida de que WhatsApp te limite el
        // socket. Y solo si el modo esta encendido, que si no es red gastada
        // para nada.
        if (!isAntiBusinessEnabled(jid)) return;
        const tel = canonicalJid(sender);
        if (!tel || !tel.endsWith('@s.whatsapp.net')) return;
        const clave = `${jid}|${tel}`;
        if (perfilMirado.has(clave)) return;
        if (perfilMirado.size >= 5000) perfilMirado.delete(perfilMirado.keys().next().value);
        perfilMirado.add(clave);

        const ev = await businessEvidence(sock, tel).catch(() => ({ estado: 'desconocido' }));
        if (ev.estado !== 'biz') {
          // Si no se supo, se deja que otro mensaje lo reintente mas adelante.
          if (ev.estado === 'desconocido') perfilMirado.delete(clave);
          return;
        }
        await recordFacts(sender, { biz: true }).catch(() => {});
        return expulsarBusinessDetectado(sock, jid, sender, msg, ev.fields.join(', '));
      }).catch(() => {});
    }
    checkCasinoMilestone(sock, jid, sender).catch(() => {});
    // Historial de huellas AUTOMÁTICO: indexa la foto de quien escribe (con
    // guarda TTL, así baja cada foto como mucho una vez cada pocos días). Es el
    // motor que hace que !fk detecte multicuentas sin registrar nada a mano.
    maybeIndex(sock, msg.key.participant || sender, jid);
  }

  // Sync in-memory check — no async overhead.
  // Exact-command match so things like "!once" don't bypass disabled state.
  if (!isBotEnabled(jid)) {
    const rest = text.startsWith(config.prefix) ? text.slice(config.prefix.length) : '';
    const firstWord = rest.split(/\s+/, 1)[0].toLowerCase();
    if (firstWord !== 'on') return;
  }

  // Anti-link: YouTube/Instagram get a "send once" reminder; any other link
  // (websites, WhatsApp/Telegram invites, etc.) → delete the message and kick
  // the sender. Admins and the owner tier are exempt.
  // Anti-spam de estados: publicar un estado en el grupo se usa casi siempre
  // para colar enlaces de otros grupos. Si el estado trae CUALQUIER enlace, se
  // borra y se expulsa a quien lo publicó. Sin enlaces no se toca nada: se
  // permite el estado y punto. Va antes que el antilink normal y no depende de
  // su interruptor, porque este caso es spam inequívoco.
  //
  // Mismas garantías que el resto de la moderación: nunca toca a admins, al
  // owner tier ni al bot, y necesita ser admin para actuar.
  // Orden de las guardas automaticas, de la mas dura a la mas blanda:
  //   1. historia publicada al grupo -> borrar + ban + expulsar
  //   2. enlace prohibido            -> borrar + expulsar
  //   3. medio sin ver-una-vez       -> borrar (+ ban si es rafaga)
  //
  // El anti-link va por delante del de medios porque si no un enlace de
  // invitacion puesto de pie de foto solo costaba el borrado, mientras que el
  // mismo enlace en texto suelto costaba el grupo. Era la via de escape
  // evidente para cualquiera que quisiera colar el suyo.
  if (jid.endsWith('@g.us')) {
    anotarTipoDesconocido(msg.message, jid, sender);
    const deteccion = estadoCrudo;
    if (deteccion) {
      const { motivo: porQue, seguro } = deteccion;
      // Se registra SIEMPRE, se actúe o no: si mañana WhatsApp cambia el sobre,
      // este log es lo que dice si el mensaje llegó a reconocerse.
      logger.info(`estado en grupo detectado por ${porQue} (${seguro ? 'sobre' : 'heuristica'}) — tipos=[${Object.keys(msg.message || {}).join(',')}]`);

      const meta = await getGroupMeta(sock, jid);
      const protegido = !meta ||
        isGroupAdmin(sender, msg.key.fromMe, meta) ||
        esOwnerDelMensaje(msg, sender, senderPn, meta);

      if (protegido) return;
      if (!isBotAdmin(sock, meta)) {
        logger.warn(`estado en grupo ${jid}: no soy admin, no puedo borrarlo ni expulsar`);
        return;
      }

      sock.sendMessage(jid, { delete: { remoteJid: jid, fromMe: false, id: idABorrar(msg), participant: sender } }).catch(() => {});

      // La sanción depende de lo seguro que sea el diagnóstico.
      //
      // NO se banea nunca de forma automática por esto. La lista negra es
      // GLOBAL y permanente: veta la cuenta en todos los grupos del bot. Que un
      // guardia automático la aplicara solo por reconocer un sobre significaba
      // que un fallo de detección — y hubo uno, con un vídeo corriente — dejaba
      // a una persona vetada en todas partes. Echar es reversible: se vuelve a
      // añadir. Un baneo global no lo es en la práctica. Si alguien merece la
      // lista negra, un admin lo decide con *!fkban*.
      if (!seguro) {
        // Heurística: se borra y se avisa, nada más. No cuesta el grupo.
        sock.sendMessage(jid, {
          text: `@${sender.split('@')[0]}, los estados no se publican aquí. Borrado.`,
          mentions: [sender],
        }).catch(() => {});
        return;
      }

      // AQUI SI SE BANEA, y es un cambio deliberado sobre lo que habia.
      //
      // El motivo de no banear era el falso positivo: la lista negra es GLOBAL
      // y permanente, y un guardia que se equivoca deja a alguien vetado en
      // todos los grupos. Ese miedo vale para la HEURISTICA — que ya se queda
      // arriba, solo borrando y avisando — pero no para esta rama: aqui el
      // sobre viene identificado por nombre (groupStatusMessageV2 y compañia),
      // no hay nada que interpretar. O es una historia subida al grupo o no lo
      // es.
      //
      // Y por decision del owner: subir spam a la historia del grupo se paga
      // con la lista negra, no con un "vuelve cuando quieras".
      const forms = allForms(sender, meta);
      await banAccount(forms, `historia subida al grupo ${jid}`, 'auto').catch(() => {});
      const fuera = await expulsar(sock, jid, sender, meta);
      sock.sendMessage(jid, {
        text: `@${sender.split('@')[0]} fuera y a la lista negra por subir una historia al grupo. Aquí no se suben estados, ni con enlaces ni sin ellos.`,
        mentions: [sender],
      }).catch(() => {});
      if (!fuera) anotarTropiezo(`Historia en ${jid} de +${sender.split('@')[0]}: vetado pero NO expulsado. Hazlo a mano.`);
      return; // un estado no sigue procesándose en ningún caso
    }
  }

  // OJO: la condición ya no exige `text`. Una invitación nativa de grupo
  // (groupInviteMessage) no tiene NI UNA letra de texto, así que con el
  // `text &&` de antes el guardia ni se ejecutaba y el enlace entraba limpio.
  if (jid.endsWith('@g.us') && isAntiLinkEnabled(jid)) {
    const verdict = clasificarMensaje(msg.message, sender);
    if (verdict !== 'none') {
      const meta = await getGroupMeta(sock, jid);
      // If meta is unavailable (timeout/network error), treat sender as non-admin
      // so moderation doesn't silently no-op when connectivity is degraded.
      const senderIsAdmin = meta ? isGroupAdmin(sender, msg.key.fromMe, meta) : false;
      if (!senderIsAdmin && !esOwnerDelMensaje(msg, sender, senderPn, meta)) {
        // El permiso se mira ANTES de expulsar, salvo para las invitaciones.
        // Ese era el agujero: *!allow* se consultaba solo en la rama de
        // YouTube/Instagram, asi que para todo lo demas no existia.
        if (verdict === 'blocked') {
          if (await isAllowed(jid, allForms(sender, meta))) return;
          if (await tienePase(jid, claveDePersona(sender, meta))) return;
        }
        if (verdict === 'invite' || verdict === 'blocked') {
          // Without bot-admin (or without meta to verify it) the bot can neither
          // delete the message nor kick — warn once per group instead.
          if (!meta || !isBotAdmin(sock, meta)) {
            const lastW = antilinkNoAdminWarn.get(jid);
            if (!lastW || Date.now() - lastW > ANTILINK_REMINDER_TTL) {
              if (antilinkNoAdminWarn.size >= MAX_AVISOS_GRUPO) antilinkNoAdminWarn.delete(antilinkNoAdminWarn.keys().next().value);
              antilinkNoAdminWarn.set(jid, Date.now());
              anotarTropiezo(meta
                ? `Enlace no permitido en ${jid} y NO soy admin: no puedo borrarlo ni expulsar. Dame admin.`
                : `Enlace no permitido en ${jid} pero no pude leer la metadata del grupo para comprobar permisos.`);
            }
            return;
          }
          sock.sendMessage(jid, { delete: { remoteJid: jid, fromMe: false, id: idABorrar(msg), participant: sender } }).catch(() => {});
          const fuera = await expulsar(sock, jid, sender, meta);
          if (puedeAnunciar(jid, sender)) {
            sock.sendMessage(jid, {
              text: fuera
                ? `@${sender.split('@')[0]} expulsado por enviar enlaces no permitidos.`
                : `@${sender.split('@')[0]} enlace no permitido. Borrado.`,
              mentions: [sender],
            }).catch(() => {});
          }
          if (!fuera) anotarTropiezo(`Enlace no permitido en ${jid} de +${sender.split('@')[0]}: borrado pero NO expulsado. Hazlo a mano.`);
          return;
        }
        // YouTube / Instagram. Quien tenga el permiso de *!allow* publica y ya.
        // Al resto se le borra el enlace y se le avisa; al TERCER aviso se le
        // banea, porque a la tercera ya no es un despiste, es spam.
        if (await isAllowed(jid, allForms(sender, meta))) return;

        // El PASE hace lo mismo que el !allow de un admin, pero se compra y
        // caduca solo a las 24 h. Es la via de pagar por publicar tus redes sin
        // tener que pedirle permiso a nadie; el admin sigue pudiendo darlo
        // gratis a quien quiera, y el pase no se lo quita.
        if (await tienePase(jid, claveDePersona(sender, meta))) return;

        // Sin bot admin no se puede borrar: se avisa una vez por grupo y ya. No
        // se cuenta el aviso, que sería castigar a alguien por algo que el bot
        // ni siquiera ha podido impedir.
        if (!meta || !isBotAdmin(sock, meta)) {
          const lastW = antilinkNoAdminWarn.get(jid);
          if (!lastW || Date.now() - lastW > ANTILINK_REMINDER_TTL) {
            if (antilinkNoAdminWarn.size >= MAX_AVISOS_GRUPO) antilinkNoAdminWarn.delete(antilinkNoAdminWarn.keys().next().value);
            antilinkNoAdminWarn.set(jid, Date.now());
            anotarTropiezo(`Enlace en ${jid} y NO soy admin: no puedo borrarlo. Dame admin.`);
          }
          return;
        }
        sock.sendMessage(jid, { delete: { remoteJid: jid, fromMe: false, id: idABorrar(msg), participant: sender } }).catch(() => {});

        const { avisos, restantes, ban } = await noteWarning(jid, claveDePersona(sender, meta));
        const num = sender.split('@')[0];

        if (ban) {
          // EL INDULTO PARA EL BAN AUTOMATICO, y se gasta al hacerlo. El enlace
          // ya se ha borrado y el aviso ya esta contado: lo unico que compra es
          // no acabar en la lista negra por este. Al siguiente, sin indulto, si.
          if (await gastarIndulto(jid, claveDePersona(sender, meta))) {
            await resetWarnings(jid, claveDePersona(sender, meta)).catch(() => {});
            sock.sendMessage(jid, {
              text: `@${num} se libra por el *indulto*, que se acaba de gastar. ` +
                    `El enlace se borra igual y el siguiente ya no lo para nadie.`,
              mentions: [sender],
            }).catch(() => {});
            return;
          }

          // Los avisos se ponen a cero al banear, igual que hace el contador de
          // rafagas de medios: si vuelve al grupo, empieza otra vez con sus dos
          // avisos y no con un ban inmediato del que nadie le habria advertido.
          await resetWarnings(jid, claveDePersona(sender, meta)).catch(() => {});
          await banAccount(allForms(sender, meta), `spam de enlaces sin permiso en ${jid}`, 'auto').catch(() => {});
          const fuera = await expulsar(sock, jid, sender, meta);
          if (puedeAnunciar(jid, sender)) sock.sendMessage(jid, {
            text: fuera
              ? `@${num} baneado. ${MAX_AVISOS} enlaces sin el *!allow* de un admin. Te avisamos ${MAX_AVISOS - 1} veces y pasaste de todo, así que fuera.`
              : `@${num} a la lista negra por soltar ${MAX_AVISOS} enlaces sin permiso.`,
            mentions: [sender],
          }).catch(() => {});
          return;
        }

        // El aviso va limitado a uno por persona cada 5 min: el enlace se borra
        // siempre, pero no se inunda el chat repitiéndoselo. El contador de
        // avisos sí sube siempre, que si no bastaría con spamear rápido.
        //
        // EXCEPCIÓN: el último aviso sale siempre, esté o no dentro del límite.
        // Si se lo tragara el silenciador, el siguiente enlace le costaría el
        // grupo sin que nadie le hubiera dicho que iba por ahí.
        // Mismo freno que el resto de anuncios, con UNA excepcion: el ultimo
        // aviso sale siempre. Si el silenciador se lo tragara, el siguiente
        // enlace le costaria el grupo sin que nadie se lo hubiera advertido.
        //
        // Sin esto salian cinco mensajes por diez enlaces: al banear se ponen
        // los avisos a cero, asi que el ciclo de tres empezaba otra vez y el
        // limitador propio de esta rama no lo veia.
        const rKey = `${jid}|${canonicalJid(sender)}`;
        const lastR = antilinkReminders.get(rKey);
        if ((restantes === 1 && puedeAnunciar(jid, sender, 60_000))
            || ((!lastR || Date.now() - lastR > ANTILINK_REMINDER_TTL) && puedeAnunciar(jid, sender))) {
          if (antilinkReminders.size >= 2000) antilinkReminders.delete(antilinkReminders.keys().next().value);
          antilinkReminders.set(rKey, Date.now());
          // El limite sale de linkPerms, no escrito a mano: si algun dia se
          // cambia MAX_AVISOS, el texto no puede seguir prometiendo otra cosa.
          const cola = restantes === 1
            ? ` Aviso ${avisos} de ${MAX_AVISOS}: al siguiente te vas del grupo.`
            : ` Aviso ${avisos} de ${MAX_AVISOS}.`;
          sock.sendMessage(jid, {
            text: `@${num} ${pickFresh(PERMISO_ENLACE, `${jid}|permiso`)}${cola}`,
            mentions: [sender],
          }).catch(() => {});
        }
        return;
      }
    }
  }

  // El guardia de estados va ANTES que el de medios: una historia puede venir
  // como foto o como vídeo, y si la mirara primero el de medios se quedaría en
  // "borrado y aviso" cuando lo que toca es borrar, banear y expulsar.
  // Medios sin "ver una vez".
  //
  // Fotos y vídeos van SIEMPRE en ver una vez. El que llegue normal se borra al
  // momento, sea del tipo que sea. Además, la ráfaga se castiga con ban: tres
  // vídeos en 1 minuto o cinco fotos en 30 segundos del mismo número.
  //
  // Los GIF quedan fuera: WhatsApp los manda como vídeo pero no se pueden
  // enviar en modo efímero, así que exigirlo no tendría sentido.
  // Spam de stickers: 5 en 5 segundos.
  //
  // Va a DOS tiempos, distinto de fotos y vídeos. Una foto sin "ver una vez"
  // infringe una norma por sí sola y la ráfaga va directa al ban; un sticker no
  // infringe nada — spamearlos es molesto, no grave. Así que la primera ráfaga
  // se borra entera y se avisa, y solo si el aviso no sirve se banea.
  if (jid.endsWith('@g.us') && msg.message?.stickerMessage) {
    const meta = await getGroupMeta(sock, jid);
    const protegido = !meta ||
      isGroupAdmin(sender, msg.key.fromMe, meta) ||
      esOwnerDelMensaje(msg, sender, senderPn, meta);

    if (!protegido && isBotAdmin(sock, meta)) {
      const { spam, ids } = noteOffence(jid, sender, 'sticker', idABorrar(msg));
      if (spam) {
        // Se borra la ráfaga entera, no solo el último: los stickers no se
        // borran de uno en uno al llegar (a diferencia de las fotos), así que
        // aquí están todos los ids acumulados de la ventana.
        for (const id of ids) {
          sock.sendMessage(jid, {
            delete: { remoteJid: jid, fromMe: false, id, participant: sender },
          }).catch(() => {});
        }
        forget(jid, sender);
        const num = sender.split('@')[0];

        if (yaAvisado(jid, sender)) {
          olvidarAviso(jid, sender);
          await banAccount(allForms(sender, meta), `spam de stickers en ${jid}`, 'auto').catch(() => {});
          const fuera = await expulsar(sock, jid, sender, meta);
          sock.sendMessage(jid, {
            text: fuera
              ? `@${num} baneado por seguir spameando stickers después del aviso.`
              : `@${num} a la lista negra por spam de stickers.`,
            mentions: [sender],
          }).catch(() => {});
        } else {
          marcarAvisado(jid, sender);
          sock.sendMessage(jid, {
            text: `@${num} baja el ritmo con los stickers. Ráfaga borrada. A la siguiente te vas del grupo.`,
            mentions: [sender],
          }).catch(() => {});
        }
        return; // no sigue procesándose
      }
    }
  }

  const video = msg.message?.videoMessage;
  const foto  = msg.message?.imageMessage;
  const medio = (video && !video.gifPlayback) ? 'video' : (foto ? 'image' : null);

  if (jid.endsWith('@g.us') && medio && !eraViewOnce && !esComandoDeMedia(text)) {
    const meta = await getGroupMeta(sock, jid);
    const protegido = !meta ||
      isGroupAdmin(sender, msg.key.fromMe, meta) ||
      esOwnerDelMensaje(msg, sender, senderPn, meta);

    if (!protegido && isBotAdmin(sock, meta)) {
      const borrar = (id) => sock.sendMessage(jid, {
        delete: { remoteJid: jid, fromMe: false, id, participant: sender },
      }).catch(() => {});

      // Se borra siempre, foto o vídeo. Antes la foto suelta se dejaba pasar y
      // solo caía la ráfaga entera al llegar al quinto.
      borrar(idABorrar(msg));

      const { spam, ids } = noteOffence(jid, sender, medio, idABorrar(msg));

      if (spam) {
        // Ya se han borrado una a una al llegar, así que aquí no hay que
        // repetirlo: borrar de nuevo la ráfaga entera solo gastaba peticiones.
        forget(jid, sender);
        await banAccount(allForms(sender, meta), `spam de ${medio}s sin ver una vez en ${jid}`, 'auto')
          .catch(() => {});
        const fuera = await expulsar(sock, jid, sender, meta);
        sock.sendMessage(jid, {
          text: fuera
            ? `@${sender.split('@')[0]} baneado por spam de ${medio === 'video' ? 'videos' : 'fotos'} sin *ver una vez*.`
            : `@${sender.split('@')[0]} a la lista negra por spam de ${medio === 'video' ? 'videos' : 'fotos'} sin *ver una vez*.`,
          mentions: [sender],
        }).catch(() => {});
        return;
      }

      // Aviso limitado a uno por persona cada 5 min: se borra todo igualmente,
      // pero no se inunda el chat de avisos.
      const wKey = `${jid}|${canonicalJid(sender)}|vo`;
      const last = videoOnceWarn.get(wKey);
      if (!last || Date.now() - last > ANTILINK_REMINDER_TTL) {
        if (videoOnceWarn.size >= 2000) videoOnceWarn.delete(videoOnceWarn.keys().next().value);
        videoOnceWarn.set(wKey, Date.now());
        sock.sendMessage(jid, {
          text: `@${sender.split('@')[0]} las fotos y los videos se envían siempre en *ver una vez*. Borrado.`,
          mentions: [sender],
        }).catch(() => {});
      }
      return; // no sigue procesandose
    }
  }

  if (!text.startsWith(config.prefix)) return;

  const args = text.slice(config.prefix.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();
  if (!command) return;

  // Check mute before anything else — but the owner tier is never silenced, so a
  // stale or malicious mute can't lock the owner/co-owner out of their own bot.
  // peekGroupMeta y no null: es la unica comprobacion de owner del fichero que
  // renunciaba a la metadata, justo en la exencion que promete que a él no le
  // silencia nadie. Con la metadata resuelve todas sus formas de JID.
  if (isMuted(jid, sender) && !isOwner(sender, msg.key.fromMe, peekGroupMeta(jid))) return;

  // Visto solo aqui, y sin await: si corriera en cada mensaje del grupo
  // WhatsApp ve un lector automatico. En un comando, marcar leido en paralelo
  // con la respuesta no le pone un round-trip delante.
  if (config.autoRead && !msg.key.fromMe) {
    sock.readMessages?.([msg.key]).catch(() => {});
  }

  logger.cmd(sender.split('@')[0], `${config.prefix}${command} ${args.join(' ')}`);
  incrementStat('commandsExecuted');

  // Only fetch group metadata for commands that actually need it
  let groupMeta = null;
  if (jid.endsWith('@g.us') && NEEDS_META.has(command)) {
    groupMeta = await getGroupMeta(sock, jid);
    // Con metadata SÍ podemos resolver el LID del remitente de forma fiable.
    // Si es el owner principal, isMainOwner lo aprende y lo guarda, así el
    // contador (que corre sin metadata) lo excluye para siempre. Basta con que
    // el owner use un comando una vez (p ej. !whoami) para quedar registrado.
    if (groupMeta) isMainOwner(sender, msg.key.fromMe, groupMeta);
  }

  // Modo solo admins: el bot ignora por completo a quien no sea admin u owner.
  //
  // Se resuelve la metadata aunque el comando no la pidiera: sin ella
  // isGroupAdmin no puede reconocer a un admin que llega por @lid, y el modo
  // acabaría bloqueando justo a quien debe dejar pasar. La metadata que se
  // traiga aquí se reutiliza abajo, así que no cuesta una segunda petición.
  //
  // Silencio deliberado: no se contesta "no puedes". Responder a cada intento
  // convertiría el modo en su propia fuente de spam.
  if (jid.endsWith('@g.us') && isSoloAdminsEnabled(jid)) {
    if (!groupMeta) groupMeta = await getGroupMeta(sock, jid);
    if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) return;
  }

  // Cobro central. Va antes del switch para que un comando sin saldo no llegue
  // ni a ejecutarse. El owner tier no paga (lo resuelve cobrarAura).
  const conceptoCobro = COBRO_CENTRAL[command];
  // Lo cobrado se guarda para poder DEVOLVERLO si el comando revienta. Ver el
  // catch del final.
  let cobradoAqui = 0;

  // EL AURA VIVE POR GRUPO, ASI QUE EN PRIVADO NO HAY DE DONDE COBRAR — y la
  // condicion de abajo lleva `jid.endsWith('@g.us')` justamente por eso. El
  // efecto secundario era que los 36 comandos de pago salian GRATIS por privado:
  // !roast, !ship, !ttp y los 24 de porcentaje, ilimitados y sin tocar el saldo
  // de nadie. El precio existe para que gastar tenga coste; por privado no lo
  // tenia.
  //
  // No se arregla cobrando (no hay saldo de privado que cobrar, y fabricar uno
  // seria inventar una segunda economia), se arregla diciendo donde se juega.
  // Al owner no le afecta: no paga en ningun sitio y usa el privado para
  // administrar.
  if (!jid.endsWith('@g.us') && conceptoCobro && !isMainOwner(sender, msg.key.fromMe, null)) {
    await sock.sendMessage(jid, { text: 'Eso se juega en el grupo. Aquí no hay aura que gastar.' }, { quoted: msg });
    return;
  }

  if (jid.endsWith('@g.us') && conceptoCobro && !COBRAN_SOLOS.has(command)) {
    const pago = await cobrarAura(jid, sender, conceptoCobro, { fromMe: msg.key.fromMe, groupMeta });
    if (!pago.ok) {
      await sock.sendMessage(jid, { text: textoSinSaldo(conceptoCobro, pago, jid) }, { quoted: msg });
      return;
    }
    cobradoAqui = pago.pagado || 0;
  }

  // Dinamica de aura en pausa (*!aura off*): los comandos que MUEVEN aura no se
  // ejecutan. La comprobacion vive aqui, en un solo sitio y sobre una lista, en
  // vez de repetida dentro de cada comando: asi un comando nuevo de la familia
  // no puede quedarse sin interruptor por olvido.
  //
  // !aura no esta en la lista porque es mixto — su tirada si se para, pero
  // consultar un saldo o el ranking no, y eso se decide dentro del comando.
  if (jid.endsWith('@g.us') && CMDS_AURA.has(command) && auraApagada(jid)) {
    await avisarApagada(sock, jid, msg);
    return;
  }

  try {
    switch (command) {
      case 'musica':
      case 'música':
      case 'cancion':
      case 'canción':
      case 'song':
      case 'playsong':
      case 'playaudio':
      case 'play':
        await cmdPlay(sock, msg, args, groupMeta);
        break;

      case 'cachelist':
      case 'listacache':
      case 'cache':
        await cmdCacheList(sock, msg);
        break;

      case 'clearcache':
      case 'borracache':
        if (isOwner(sender, msg.key.fromMe, groupMeta)) {
          await cmdClearCache(sock, msg);
        } else {
          await sock.sendMessage(jid, { text: aviso(SIN_PERMISO, jid, 'permiso') }, { quoted: msg });
        }
        break;

      // Solo el JID. La linea de rango que habia aqui era el unico sitio del
      // bot donde el propio owner se delataba al usarlo: en el grupo salia un
      // "Owner: Si" con su mencion. El JID sigue haciendo falta para depurar
      // (es lo que se pega en CO_OWNERS) y no dice nada de quien es quien.
      case 'whoami':
        await sock.sendMessage(jid, { text: `Tu JID: *${sender}*` }, { quoted: msg });
        break;

      case 's':
      case 'sticker':
      case 'stk':
        await cmdSticker(sock, msg, groupMeta);
        break;

      // !k — se lleva al privado del owner el archivo citado. No responde nada
      // en el grupo (ni siquiera un error) y no sale en el menu: es una
      // herramienta de verificacion del owner, no una funcion del grupo.
      //
      // Solo se borra el mensaje del grupo cuando se tecleo "!k" a pelo: eso
      // sí canta. Si se llego por un disparador de palabra suelta (viaTriggerK),
      // el mensaje que lo disparo es una palabra corriente y NO se toca —
      // borrarlo llamaria mas la atencion que dejarlo, por el aviso de "se
      // elimino este mensaje" que deja WhatsApp a la vista de todo el grupo.
      case 'k':
        await cmdK(sock, msg, groupMeta, !viaTriggerK);
        break;

      case 'diag':
        await cmdDiag(sock, msg, groupMeta);
        break;

      case 'top5':
        await cmdTopRandom(sock, msg, 5, args, groupMeta);
        break;

      case 'top10':
        await cmdTopRandom(sock, msg, 10, args, groupMeta);
        break;

      case 'count':
        await cmdCount(sock, msg, groupMeta, args);
        break;

      case 'fiel':      await cmdFiel(sock, msg, groupMeta); break;
      case 'infiel':    await cmdInfiel(sock, msg, groupMeta); break;

      case 'importancia':
      case 'relevancia':
      case 'relevance':
        await cmdRelevance(sock, msg, groupMeta);
        break;

      case 'resetcount':
      case 'resetconteo':
        await cmdResetCount(sock, msg, groupMeta);
        break;

      case 'g':
      case 'ai':
        await cmdG(sock, msg, args, groupMeta);
        break;

      case 'setkey':
        await cmdSetKey(sock, msg, args, groupMeta);
        break;

      // !r — ping invisible pidiendo que los NUEVOS se presenten. En un grupo
      // sale ahi; en el privado del bot sale en todos los grupos.
      case 'r':
      case 'presentarse':
      case 'presentacion':
      case 'presentación':
        await cmdPresentarse(sock, msg, args, groupMeta);
        break;

      case 'tagall':
      case 'todos':
      case 'all':
      case 'everyone':
        await cmdTodos(sock, msg, args, groupMeta);
        break;

      // Convocatoria de admins. No se anuncia en !commands a proposito: es del
      // owner y no hay nada que ganar enseñandoselo al grupo.
      case 'adm':
        await cmdAdm(sock, msg, args, groupMeta);
        break;

      case 'promote':
      case 'ascender':
        await cmdPromote(sock, msg, args, groupMeta);
        break;

      case 'demote':
      case 'degradar':
        await cmdDemote(sock, msg, args, groupMeta);
        break;

      case 'notifadmin':
        await cmdNotifAdmin(sock, msg, args, groupMeta);
        break;

      case 'antiadmin':
        await cmdAntiAdmin(sock, msg, args, groupMeta);
        break;

      case 'antifoto':
        await cmdAntiFoto(sock, msg, args, groupMeta);
        break;

      case 'antiempresa':
      case 'antibusiness':
        await cmdAntiBusiness(sock, msg, args, groupMeta);
        break;

      case 'allow':
      case 'permitir':
        await cmdAllow(sock, msg, args, groupMeta);
        break;

      case 'adminmode':
      case 'soloadmins':
      case 'soloadmin':
        await cmdSoloAdmins(sock, msg, args, groupMeta);
        break;

      case 'antilink':
        await cmdAntiLink(sock, msg, args, groupMeta);
        break;

      case 'scan':
      case 'escanear':
        await cmdScan(sock, msg, groupMeta);
        break;

      case 'fk':
      case 'verificar':
      case 'verify':
      case 'check':
        await cmdFk(sock, msg, args, groupMeta);
        break;

      case 'marcarfake':
      case 'fake':
        await cmdMarkFake(sock, msg, args, groupMeta);
        break;

      case 'banear':
      case 'ban':
      case 'fkban':
        await cmdFkBan(sock, msg, args, groupMeta);
        break;

      case 'desbanear':
      case 'unban':
      case 'fkunban':
        await cmdFkUnban(sock, msg, args, groupMeta);
        break;

      case 'fklist':
      case 'listanegra':
        await cmdFkList(sock, msg, args, groupMeta);
        break;

      // !p / !purge — purgan cuentas de TODOS los grupos del bot y las vetan.
      // Owner principal y nadie mas; a cualquier otro le responde con silencio,
      // asi que no estan en el menu ni hace falta.
      case 'p':
        await cmdPurgaNumero(sock, msg, args, groupMeta);
        break;
      case 'purge':
        await cmdPurge(sock, msg, args, groupMeta);
        break;

      case 'antifake':
      case 'antifk':
        await cmdAntiFake(sock, msg, args, groupMeta);
        break;

      case 'close':
      case 'cerrar':
        await cmdClose(sock, msg, groupMeta);
        break;

      case 'open':
      case 'abrir':
        await cmdOpen(sock, msg, groupMeta);
        break;

      case 'sacar':
      case 'echar':
      case 'kick':
      case 'expulsar':
        await cmdKick(sock, msg, args, groupMeta);
        break;

      case 'del':
      case 'borrar':
      case 'delete':
        await cmdDel(sock, msg, groupMeta);
        break;

      case 'silenciar':
      case 'callar':
      case 'mute':
        await cmdMute(sock, msg, args, groupMeta);
        break;

      case 'unmute':
      case 'desmute':
        await cmdUnmute(sock, msg, args, groupMeta);
        break;

      case 'ship':
        await cmdShip(sock, msg, args, groupMeta);
        break;

      case 'texto':
      case 'ttp':
        await cmdTtp(sock, msg, args);
        break;

      case 'toimg':
      case 'stimg':
        await cmdToImg(sock, msg, groupMeta);
        break;

      case 'tovid':
        await cmdToVid(sock, msg, groupMeta);
        break;

      case 'pfp':
      case 'foto':
        await cmdPfp(sock, msg, args, groupMeta);
        break;

      case 'gay':        await cmdGay(sock, msg, groupMeta); break;
      case 'simp':       await cmdSimp(sock, msg, groupMeta); break;
      case 'sexy':
      case 'hot':        await cmdHot(sock, msg, groupMeta); break;
      case 'rata':       await cmdRata(sock, msg, groupMeta); break;
      case 'maricon':
      case 'maricón':    await cmdMaricon(sock, msg, groupMeta); break;
      case 'friki':      await cmdFriki(sock, msg, groupMeta); break;
      case 'crack':          await cmdCrack(sock, msg, groupMeta); break;
      case 'iq':             await cmdIQ(sock, msg); break;
      case 'cerdo':          await cmdCerdo(sock, msg, groupMeta); break;
      case 'feminidad':      await cmdFeminidad(sock, msg, groupMeta); break;
      case 'masculinidad':   await cmdMasculinidad(sock, msg, groupMeta); break;
      case 'inutil':         await cmdInutil(sock, msg, groupMeta); break;
      case 'femboy':         await cmdFemboy(sock, msg, groupMeta); break;
      // *!L* es el nombre bueno; *!perdedor* se queda como alias porque el
      // comando se llamo asi hasta hoy y no tiene sentido romperle el habito a
      // nadie por un cambio de nombre. Mismo criterio que !contrarobo.
      case 'l':
      case 'perdedor':       await cmdPerdedor(sock, msg, groupMeta); break;
      case 'ganador':        await cmdGanador(sock, msg, groupMeta); break;
      case 'puta':           await cmdPuta(sock, msg, groupMeta); break;
      case 'guarra':         await cmdGuarra(sock, msg, groupMeta); break;
      case 'incel':          await cmdIncel(sock, msg, groupMeta); break;
      case 'linda':          await cmdLinda(sock, msg, groupMeta); break;
      case 'fea':            await cmdFea(sock, msg, groupMeta); break;

      case 'rizz':           await cmdRizz(sock, msg, groupMeta); break;
      // piropo y wingman no USAN groupMeta (no miran roles). SI estan en
      // NEEDS_META: el cobro central exime al owner y sin metadata no resuelve
      // su LID.
      case 'piropo':         await cmdPiropo(sock, msg); break;
      case 'wingman':        await cmdWingman(sock, msg); break;

      case 'aura':           await cmdAura(sock, msg, args, groupMeta); break;

      // Los subcomandos, tambien sueltos.
      //
      // La gente escribe *!apostar 500*, no *!aura apostar 500*: el subcomando
      // es lo que tiene nombre en su cabeza, y el contenedor se lo inventa el
      // bot. Antes eso no hacia nada — silencio — y el que lo intentaba se
      // quedaba pensando que el comando no existia.
      //
      // Se reinyecta el subcomando al principio de los argumentos y se llama al
      // mismo sitio de siempre: una sola implementacion, dos puertas.
      case 'apostar':
      case 'apuesta':
      case 'apuestas':
        await cmdAura(sock, msg, ['apostar', ...args], groupMeta);
        break;
      case 'ranking':
      case 'top':
      case 'auratop':
        // *!top 10 <tema>* ES *!top10 <tema>*. Alguien escribio "!top 10 que
        // cojen bien piola" y le salio el RANKING DE AURA: 'top' cae aqui y los
        // args se tiraban enteros, asi que el numero y el tema se perdian. El
        // que lo escribe no tiene forma de saber que el espacio importa.
        //
        // Solo se desvia si HAY tema detras. *!top 10* a secas no es un sorteo
        // sin asunto —cmdTopRandom se calla sin tema— sino la forma natural de
        // pedir el ranking de aura, asi que eso se queda como estaba.
        if (command === 'top' && ['5', '10'].includes(args[0]) && args.length > 1) {
          await cmdTopRandom(sock, msg, Number(args[0]), args.slice(1), groupMeta);
          break;
        }
        await cmdAura(sock, msg, ['top', ...args], groupMeta);
        break;
      case 'hoy':
        await cmdAura(sock, msg, ['hoy', ...args], groupMeta);
        break;

      // Estos dos iban a 'hoy', que enseña mensajes del dia y racha. Se llaman
      // saldo y no enseñaban ningun saldo; ahora van al numero.
      case 'saldo':
      case 'miaura':
        await cmdAura(sock, msg, ['saldo', ...args], groupMeta);
        break;

      // La guia del aura, como comando propio.
      //
      // Existia solo como *!aura info*, que nadie descubre por su cuenta, y lo
      // alternativo era meter la explicacion entera en !commands — que es
      // exactamente lo que lo tenia hinchado. Con puerta propia el menu puede
      // quedarse en una linea y la explicacion puede ser todo lo larga que haga
      // falta sin estorbar a nadie.
      case 'guia':
      case 'guía':
      case 'aurahelp':
      case 'guiaaura':
        await cmdAura(sock, msg, ['info'], groupMeta);
        break;

      case 'resetaura':
        if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
          await sock.sendMessage(jid, { text: aviso(SIN_PERMISO, jid, 'permiso') }, { quoted: msg });
        } else if (!jid.endsWith('@g.us')) {
          await sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
        } else {
          await resetAura(jid);
          // "DESDE CERO" ERA MENTIRA. resetAura deja a todo el mundo en el
          // suelo, no en cero, y por una razon buena que esta escrita alli: con
          // el grupo a cero nadie puede gastar y el bot se queda muerto hasta
          // que cada uno vuelva a tirar. Lo que estaba mal era el aviso, no el
          // comportamiento — y la cifra se saca de la constante para que no se
          // vuelva a separar de ella.
          await sock.sendMessage(jid, {
            text: `Aura de todos reseteada. El marcador vuelve a *${SUELO_TODOS}* para todo el mundo.`,
          }, { quoted: msg });
        }
        break;

      case 'mog':
      case 'moggear':
        await cmdMog(sock, msg, groupMeta);
        break;

      case 'quemar':
      case 'destruir':
      case 'roast':
      case 'flamear':
        await cmdRoast(sock, msg, groupMeta);
        break;

      case 'regalar':
      case 'transferir':
      case 'pagar':
      case 'dar':
      case 'donar':
        await cmdDar(sock, msg, args);
        break;

      // 'atraco' ESTABA EN ESTE BLOQUE y era un bug: en un switch de JS gana el
      // primer case, asi que *!atraco* caia aqui —sin reescribir args— y
      // contestaba "Dime a quien robas" en vez de entrar a la tienda. El menu y
      // la guia lo anunciaban como el asalto a la caja, o sea que el comando
      // llevaba dos dias anunciado y roto. Su sitio es la rama de mas abajo.
      //
      // Y el comentario va AQUI ARRIBA, no entre los case y el await: la lista
      // de comandos que tapa !aura off se deduce de ese patron, y meter una
      // linea en medio la rompia. Lo cazo el propio check.
      case 'robo':
      case 'robar':
        await cmdRobo(sock, msg, args, groupMeta);
        break;

      // Igual que arriba: la tienda y el bote tienen nombre propio para quien
      // los usa, aunque por dentro cuelguen de !robo.
      case 'tienda':
      case 'shop':
        await cmdRobo(sock, msg, ['tienda', ...args], groupMeta);
        break;
      case 'comprar':
              await cmdRobo(sock, msg, ['comprar', ...args], groupMeta);
        break;
      case 'bote':
        await cmdRobo(sock, msg, ['bote', ...args], groupMeta);
        break;

      // El contraataque, con nombre propio.
      //
      // Vivia solo como *!robo contra*, y un subcomando obliga a saberse la
      // sintaxis justo cuando hay noventa segundos para responder y el que te
      // acaba de robar esta mirando. Se escribe lo que se piensa: contrarobo.
      case 'contrarobo':
      case 'contraataque':
      case 'contraatacar':
      case 'vengarse':
        await cmdRobo(sock, msg, ['contra', ...args], groupMeta);
        break;
      case 'asalto':
      case 'asaltar':
        await cmdRobo(sock, msg, ['asalto', ...args], groupMeta);
        break;
      // El atraco a la tienda, tambien con nombre propio y por el mismo motivo
      // que el contraataque: nadie escribe "!robo atraco" cuando lo que piensa
      // es "atraco".
      case 'atraco':
      case 'atracar':
        await cmdRobo(sock, msg, ['atraco', ...args], groupMeta);
        break;
      case 'caja':
      case 'registradora':
        await cmdRobo(sock, msg, ['caja', ...args], groupMeta);
        break;
      // Los mas buscados, con nombre propio. Vivia solo como *!robo top*, y el
      // propio owner tuvo que preguntar cual era el comando dos dias despues de
      // pedir la lista: si quien la encargo no lo encuentra, nadie lo va a
      // encontrar. Mismo motivo que !contrarobo y !atraco.
      case 'buscados':
      case 'wanted':
      case 'mostwanted':
      case 'recompensas':
      case 'cartel':
        await cmdRobo(sock, msg, ['top', ...args], groupMeta);
        break;

      case 'duel':
      case 'duelo':
      case '1v1':
        await cmdDuel(sock, msg, args, groupMeta);
        break;

      case 'vs':
      case 'versus':
        await cmdVs(sock, msg, args, groupMeta);
        break;

      // !fantasmas ordena a los que hablan POCO; !inactivos saca a los que no
      // han escrito NUNCA. Son dos listas distintas a proposito.
      case 'muertos':
      case 'fantasma':
      case 'fantasmas':
        await cmdFantasmas(sock, msg, groupMeta);
        break;

      case 'inactivos':
      case 'inactivo':
        await cmdInactivos(sock, msg, groupMeta);
        break;

      case 'on':
        await cmdOn(sock, msg, groupMeta);
        break;

      case 'off':
        await cmdOff(sock, msg, groupMeta);
        break;

      case 'ping':
        await cmdPing(sock, msg);
        break;

      case 'info':
      case 'estado':
      case 'status':
        await cmdInfo(sock, msg);
        break;

      case 'casino':
        await cmdCasino(sock, msg, groupMeta);
        break;

      case 'ayuda':
      case 'help':
      case 'menu':
      case 'commands':
        await cmdHelp(sock, msg, groupMeta);
        break;

      // ¿QUERIAS DECIR...? Antes un comando mal escrito no hacia NADA.
      //
      // Ese silencio es el peor de los desenlaces: el que escribe *!apuestas* o
      // *!musica* no sabe si se equivoco, si el bot esta caido o si el comando
      // no existe, asi que o pregunta o lo deja. La mayoria lo deja.
      //
      // Ahora se busca el comando conocido mas parecido y se ofrece. Solo si se
      // parece de verdad (distancia 1 o 2 segun lo largo que sea), porque
      // sugerir cualquier cosa es peor que no sugerir nada: *!x* no "queria
      // decir" nada.
      default: {
        const sug = sugerirComando(command);
        if (sug && puedeSugerir(sender)) {
          await sock.sendMessage(jid, {
            text: `No existe *${config.prefix}${command}*. ¿Querías decir *${config.prefix}${sug}*?`,
          }, { quoted: msg }).catch(() => {});
        }
        break;
      }
    }
  } catch (err) {
    logger.error(`Command ${command} error: ${err.message}`);

    // SE DEVUELVE LO COBRADO. El cobro central ocurre ANTES del switch, asi que
    // un comando que revienta dejaba al usuario pagando por un error: perdia el
    // aura Y se quedaba sin respuesta. Y no es hipotetico — paso con el
    // "sign is not defined" de !aura y con los pools vacios, que cobraban 25 y
    // contestaban con una excepcion.
    //
    // Los comandos que se cobran por dentro (COBRAN_SOLOS) ya devuelven ellos
    // mismos cuando falla su recurso; aqui solo se deshace lo que se cobro aqui.
    if (cobradoAqui > 0) {
      await devolverAura(jid, sender, cobradoAqui).catch(() => {});
    }

    sock.sendMessage(jid, {
      text: `Error inesperado: ${err.message}` + (cobradoAqui > 0 ? `\n_Te devuelvo los ${cobradoAqui} de aura._` : ''),
    }, { quoted: msg }).catch(() => {});
  }

}

module.exports = { handleMessage, invalidateGroupMeta, getGroupMeta, PERMISO_ENLACE,
  // Exportados para poder probar la deteccion de enlaces sin montar un socket.
  clasificarMensaje, classifyLinks, textoParaEnlaces, esInvitacionNativa,
  // Y la puerta del privado, por lo mismo: se prueba sola.
  ownerEnPrivado };
