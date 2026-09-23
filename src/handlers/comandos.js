'use strict';

// EL REGISTRO DE COMANDOS. Un comando, sus alias, lo que hace falta saber de
// ellos y LO QUE HACE, en UNA fila.
//
// POR QUE EXISTE. Antes cada propiedad de un comando vivia en su propia lista a
// mano dentro de messageHandler.js —NEEDS_META, COBRO_CENTRAL, LENTOS,
// COBRAN_SOLOS, CMDS_AURA, SOLO_CONSULTA, MEDIA_CMDS— mas el `case` del
// switch. Añadir un alias era un ritual de ocho sitios, y se hacia mal: al
// pasar a esto aparecieron *!song*, *!stimg* y *!foto* sin el «escribiendo…»
// de su comando principal, y *!conteo* metido en una lista pero sin `case`, o
// sea que no funcionaba y nadie lo sabia.
//
// Y EL SWITCH TAMBIEN SE FUE. Eran 790 lineas de `case` que repetian los alias
// de aqui, y la puerta vigilaba que los dos sitios dijeran lo mismo leyendo el
// switch como texto, con expresiones que se rompian a cada cambio de formato.
// Ahora cada fila lleva `hace` y el manejador solo busca la fila del nombre
// tecleado y la ejecuta. Un comando nuevo es UNA fila; un alias nuevo, un
// nombre mas en su fila. Si falta el `hace` o un nombre esta en dos filas, el
// bot no arranca: mejor eso que un comando que calla sin que nadie lo sepa.
//
// Las propiedades:
//   hace        lo que hace. Recibe el contexto del mensaje (abajo) y devuelve
//               lo que devuelva el comando: asi llega SIN_SERVICIO al
//               reembolso del cobro central
//   meta        necesita la metadata del grupo (admins, participantes)
//   lento       tarda: se enseña «escribiendo…» mientras trabaja
//   cobro       concepto de PRECIOS que cuesta; un objeto si cambia por nombre
//   cobraDentro cobra el propio comando (sabe cuando no ha servido y devuelve);
//               el cobro central no le toca, pero la puerta del privado si
//   aura        mueve aura: se congela con la economia apagada
//   consulta    solo mira la economia, no la mueve: sigue con ella apagada
//   media       su texto acompaña a una foto/video; la moderacion no lo toma
//               por media suelta
//   aOtro       va contra otra persona. Si esa persona resulta ser el BOT (lo
//               normal: se ha respondido a un mensaje suyo), no se ejecuta ni
//               se cobra, y se le ataca la inteligencia al que lo ha escrito.
//               'mencion' si solo cuenta la mencion explicita: *!contrarobo*
//               se escribe respondiendo al aviso del bot, y eso es lo correcto
//
// El contexto de `hace`: { de, sock, msg, args, meta, command, jid, sender,
// viaTriggerK }. `de('music')` es src/commands/music.js, cargado la primera vez
// que alguien lo usa: el arranque no parsea los 343 KB de percentLabels.js ni
// los 184 de robo.js por un comando que a lo mejor nadie pide en todo el dia.
// Lo poco que vive en el propio manejador (*!diag*, que lee sus guardas por
// dentro) se pide como `de('manejador')`. `command` es el nombre tecleado ya
// normalizado, para las filas que reparten por nombre.
//
// EL PRIMER NOMBRE DE CADA FILA ES EL QUE ENSEÑA EL MENU. El corrector lo usa:
// cuando una errata se parece a dos formas del mismo comando, ofrece esa. Si
// no, a *!relevanc* le ofrecia *!relevance*, que es el alias ingles, y a *!pla*
// *!playsong*. La capa 108 compara cada fila con el menu corto.
//
// SIN TILDES NI EÑES en los nombres: el manejador normaliza lo tecleado antes
// de buscarlo, asi que un nombre con eñe no se alcanzaria jamas. Por eso es
// *!punetazo*; el menu lo enseña bien escrito (COMO_SE_ESCRIBE en social.js).
//
// `grupo` es una familia que no se escribe aqui porque ya tiene su fuente: los
// alias de las acciones (acciones.ALIAS_ACTIVOS). Si mañana hay una accion
// nueva, entra sola.

const { isOwner } = require('../utils/wa');
const { aviso } = require('../utils/helpers');
const { SIN_PERMISO } = require('../data/avisos');

// Solo el tier dueño; al resto, el aviso de siempre.
async function soloDueno(c, hacer) {
  if (isOwner(c.sender, c.msg.key.fromMe, c.meta)) return hacer();
  await c.sock.sendMessage(c.jid, { text: aviso(SIN_PERMISO, c.jid, 'permiso') }, { quoted: c.msg });
  return undefined;
}

// Los de porcentaje comparten precio y metadata, y cada uno es su funcion de
// percent.js.
const porcentaje = (nombres, fn) => ({
  nombres, meta: true, cobro: 'percent', aOtro: true,
  hace: (c) => c.de('percent')[fn](c.sock, c.msg, c.meta),
});

// Las puertas con nombre propio de !aura, !robo y !vault. La gente escribe
// *!apostar 500*, no *!aura apostar 500*: el subcomando es lo que tiene nombre
// en su cabeza, y el contenedor se lo inventa el bot. Se reinyecta el
// subcomando delante de los argumentos y se llama al mismo sitio de siempre:
// una sola implementacion, dos puertas.
const aura = (sub) => (c) => c.de('aura').cmdAura(c.sock, c.msg, [sub, ...c.args], c.meta);
const robo = (sub) => (c) => c.de('robo').cmdRobo(c.sock, c.msg, [sub, ...c.args], c.meta);
const vault = (sub) => (c) => c.de('vault').cmdVault(c.sock, c.msg, [sub, ...c.args], c.meta);

const FAMILIAS = [
  { nombres: ['play', 'musica', 'cancion', 'song', 'playsong', 'playaudio'], meta: true, lento: true, cobraDentro: true, cobro: 'play',
    hace: (c) => c.de('music').cmdPlay(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['tt', 'tiktok'], lento: true, cobraDentro: true, cobro: 'redes',
    hace: (c) => c.de('redes').cmdTikTok(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['ig', 'insta', 'instagram'], lento: true, cobraDentro: true, cobro: 'redes',
    hace: (c) => c.de('redes').cmdInstagram(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['pin', 'pinterest'], lento: true, cobraDentro: true, cobro: 'redes',
    hace: (c) => c.de('redes').cmdPinterest(c.sock, c.msg, c.args, c.meta) },
  // *!x* — la foto, el gif o el video de un tuit. Los alias son los dos nombres
  // de la red (el de ahora y el de siempre) y lo que la gente escribe cuando no
  // se acuerda de ninguno de los dos.
  { nombres: ['x', 'twitter', 'tuit', 'tweet'], lento: true, cobraDentro: true, cobro: 'redes',
    hace: (c) => c.de('redes').cmdX(c.sock, c.msg, c.args, c.meta) },
  // *!next* sobre la foto que mando el bot: otra de la misma busqueda. No lleva
  // argumentos —la busqueda sale del mensaje al que se responde— asi que no
  // puede confundirse con nada.
  { nombres: ['next', 'otra', 'siguiente'],
    hace: (c) => c.de('redes').cmdNext(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['cachelist', 'listacache', 'cache'], meta: true, cobro: 'cachelist',
    hace: (c) => c.de('music').cmdCacheList(c.sock, c.msg) },
  { nombres: ['clearcache', 'borracache'], meta: true,
    hace: (c) => soloDueno(c, () => c.de('music').cmdClearCache(c.sock, c.msg)) },
  { nombres: ['whoami'], meta: true,
    hace: (c) => c.de('social').cmdWhoami(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['s', 'sticker', 'stk'], meta: true, lento: true, cobraDentro: true, media: true, cobro: 'sticker',
    hace: (c) => c.de('sticker').cmdSticker(c.sock, c.msg, c.meta) },
  // !k — se lleva al privado del owner el archivo citado. No responde nada en
  // el grupo (ni siquiera un error) y no sale en el menu: es una herramienta de
  // verificacion del owner, no una funcion del grupo.
  //
  // Solo se borra el mensaje del grupo cuando se tecleo "!k" a pelo: eso si
  // canta. Si se llego por un disparador de palabra suelta (viaTriggerK), el
  // mensaje que lo disparo es una palabra corriente y NO se toca —borrarlo
  // llamaria mas la atencion que dejarlo, por el aviso de "se elimino este
  // mensaje" que deja WhatsApp a la vista de todo el grupo.
  { nombres: ['k'], meta: true,
    hace: (c) => c.de('k').cmdK(c.sock, c.msg, c.meta, !c.viaTriggerK) },
  { nombres: ['diag'], meta: true,
    hace: (c) => c.de('manejador').cmdDiag(c.sock, c.msg, c.meta) },
  { nombres: ['top5'], meta: true, cobraDentro: true, cobro: 'top5',
    hace: (c) => c.de('topsRandom').cmdTopRandom(c.sock, c.msg, 5, c.args, c.meta) },
  { nombres: ['top10'], meta: true, cobraDentro: true, cobro: 'top10',
    hace: (c) => c.de('topsRandom').cmdTopRandom(c.sock, c.msg, 10, c.args, c.meta) },
  { nombres: ['count', 'conteo'], meta: true, lento: true,
    hace: (c) => c.de('count').cmdCount(c.sock, c.msg, c.meta, c.args) },
  // El expediente: junta lo que el bot ya guarda de alguien. Ver caso.js.
  { nombres: ['caso', 'expediente'], meta: true, lento: true, cobro: 'caso', aOtro: true,
    hace: (c) => c.de('caso').cmdCaso(c.sock, c.msg, c.args, c.meta) },

  // ─── Los de porcentaje ─────────────────────────────────────────────────────
  porcentaje(['puta'], 'cmdPuta'),
  porcentaje(['guarra'], 'cmdGuarra'),
  porcentaje(['maricon'], 'cmdMaricon'),
  porcentaje(['incel'], 'cmdIncel'),
  porcentaje(['gay'], 'cmdGay'),
  porcentaje(['femboy'], 'cmdFemboy'),
  porcentaje(['cerdo'], 'cmdCerdo'),
  porcentaje(['rata'], 'cmdRata'),
  porcentaje(['simp'], 'cmdSimp'),
  porcentaje(['friki'], 'cmdFriki'),
  porcentaje(['inutil'], 'cmdInutil'),
  // *!L* se quedo de alias corto: el menu enseña *!perdedor*, que es como lo
  // escribe todo el mundo.
  porcentaje(['perdedor', 'l'], 'cmdPerdedor'),
  porcentaje(['fea'], 'cmdFea'),
  porcentaje(['infiel'], 'cmdInfiel'),
  porcentaje(['feminidad'], 'cmdFeminidad'),
  porcentaje(['masculinidad'], 'cmdMasculinidad'),
  porcentaje(['linda'], 'cmdLinda'),
  porcentaje(['hot', 'sexy'], 'cmdHot'),
  porcentaje(['fiel'], 'cmdFiel'),
  porcentaje(['crack'], 'cmdCrack'),
  porcentaje(['ganador'], 'cmdGanador'),
  // *!iq* comparte precio con los de porcentaje, pero no es uno: saca una CIFRA
  // de IQ y vive aparte.
  { nombres: ['iq'], meta: true, cobro: 'percent', aOtro: true,
    hace: (c) => c.de('iq').cmdIQ(c.sock, c.msg) },

  { nombres: ['relevancia', 'importancia', 'relevance'], meta: true, lento: true, cobro: 'relevancia',
    hace: (c) => c.de('relevance').cmdRelevance(c.sock, c.msg, c.meta) },
  { nombres: ['resetcount', 'resetconteo'], meta: true,
    hace: (c) => c.de('count').cmdResetCount(c.sock, c.msg, c.meta) },
  // !r — ping invisible pidiendo que los NUEVOS se presenten. En un grupo sale
  // ahi; en el privado del bot sale en todos los grupos.
  { nombres: ['r', 'presentarse', 'presentacion'], meta: true,
    hace: (c) => c.de('group').cmdPresentarse(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['tagall', 'todos', 'all', 'everyone'], meta: true,
    hace: (c) => c.de('group').cmdTodos(c.sock, c.msg, c.args, c.meta) },
  // Convocatoria de admins. No se anuncia en !commands a proposito: es del
  // owner y no hay nada que ganar enseñandoselo al grupo.
  { nombres: ['adm'], meta: true,
    hace: (c) => c.de('group').cmdAdm(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['promote', 'ascender'], meta: true,
    hace: (c) => c.de('group').cmdPromote(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['demote', 'degradar'], meta: true,
    hace: (c) => c.de('group').cmdDemote(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['notifadmin'], meta: true,
    hace: (c) => c.de('group').cmdNotifAdmin(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['antiadmin'], meta: true,
    hace: (c) => c.de('group').cmdAntiAdmin(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['antifoto'], meta: true,
    hace: (c) => c.de('cleanup').cmdAntiFoto(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['antiempresa', 'antibusiness'], meta: true,
    hace: (c) => c.de('group').cmdAntiBusiness(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['allow', 'permitir'], meta: true,
    hace: (c) => c.de('group').cmdAllow(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['adminmode', 'soloadmins', 'soloadmin'], meta: true,
    hace: (c) => c.de('group').cmdSoloAdmins(c.sock, c.msg, c.args, c.meta) },
  // El nombre va en ingles; los dos en español se quedan de alias porque ya se
  // habian anunciado.
  { nombres: ['autoaccept', 'autoapprove', 'autoaceptar', 'autoaprobar'], meta: true,
    hace: (c) => c.de('group').cmdAutoAceptar(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['antilink'], meta: true,
    hace: (c) => c.de('group').cmdAntiLink(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['scan', 'escanear'], meta: true, lento: true,
    hace: (c) => c.de('scan').cmdScan(c.sock, c.msg, c.meta) },
  { nombres: ['fk', 'verificar', 'verify', 'check'], meta: true, lento: true, cobraDentro: true, media: true, cobro: 'fk',
    hace: (c) => c.de('fk').cmdFk(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['marcarfake', 'fake'], meta: true,
    hace: (c) => c.de('fk').cmdMarkFake(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['fkban', 'banear', 'ban'], meta: true,
    hace: (c) => c.de('fk').cmdFkBan(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['fkunban', 'desbanear', 'unban'], meta: true,
    hace: (c) => c.de('fk').cmdFkUnban(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['fklist'], meta: true,
    hace: (c) => c.de('fk').cmdFkList(c.sock, c.msg, c.args, c.meta) },
  // !listanegra — la lista negra global, y ya no es un alias de !fklist.
  //
  // Era el mismo comando, o sea: solo de lectura y abierto a los admins del
  // grupo. Ahora es suyo —del dueño y los co-dueños— y hace las tres cosas:
  // ver, meter numeros y sacarlos. *!fklist* sigue donde estaba para que un
  // admin pueda mirar sin poder tocar.
  { nombres: ['listanegra'], meta: true,
    hace: (c) => c.de('listaNegra').cmdListaNegra(c.sock, c.msg, c.args, c.meta) },
  // !p / !purge — purgan cuentas de TODOS los grupos del bot y las vetan.
  // Owner principal y nadie mas; a cualquier otro le responde con silencio,
  // asi que no estan en el menu ni hace falta.
  { nombres: ['p'], meta: true, lento: true,
    hace: (c) => c.de('purgaNumero').cmdPurgaNumero(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['purge'], meta: true, lento: true,
    hace: (c) => c.de('purgaNumero').cmdPurge(c.sock, c.msg, c.args, c.meta) },
  // Vaciar el grupo entero. Solo el dueño principal, con confirmacion por
  // codigo, y no toca al bot ni al guardian ni al tier dueño.
  { nombres: ['purgeall'], meta: true, lento: true,
    hace: (c) => c.de('purgaNumero').cmdPurgeAll(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['antifake', 'antifk'], meta: true,
    hace: (c) => c.de('fk').cmdAntiFake(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['close', 'cerrar'], meta: true,
    hace: (c) => c.de('group').cmdClose(c.sock, c.msg, c.meta) },
  { nombres: ['open', 'abrir'], meta: true,
    hace: (c) => c.de('group').cmdOpen(c.sock, c.msg, c.meta) },
  { nombres: ['kick', 'expulsar', 'sacar', 'echar'], meta: true,
    hace: (c) => c.de('group').cmdKick(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['del', 'borrar', 'delete'], meta: true,
    hace: (c) => c.de('group').cmdDel(c.sock, c.msg, c.meta) },
  { nombres: ['limpiar', 'wipe'], meta: true, lento: true,
    hace: (c) => c.de('limpiar').cmdLimpiar(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['mute', 'silenciar', 'callar'], meta: true,
    hace: (c) => c.de('group').cmdMute(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['unmute', 'desmute'], meta: true,
    hace: (c) => c.de('group').cmdUnmute(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['ship'], meta: true, cobro: 'ship', aOtro: true,
    hace: (c) => c.de('ship').cmdShip(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['ttp', 'texto'], meta: true, lento: true, cobro: 'ttp',
    hace: (c) => c.de('ttp').cmdTtp(c.sock, c.msg, c.args) },
  { nombres: ['toimg', 'stimg'], meta: true, lento: true, cobraDentro: true, media: true, cobro: 'toimg',
    hace: (c) => c.de('toimg').cmdToImg(c.sock, c.msg, c.meta) },
  { nombres: ['tovid'], meta: true, lento: true, cobraDentro: true, media: true, cobro: 'tovid',
    hace: (c) => c.de('toimg').cmdToVid(c.sock, c.msg, c.meta) },
  { nombres: ['pfp', 'foto'], meta: true, lento: true, cobraDentro: true, cobro: 'pfp',
    hace: (c) => c.de('pfp').cmdPfp(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['rizz'], meta: true, cobro: 'rizz', aOtro: true,
    hace: (c) => c.de('wingman').cmdRizz(c.sock, c.msg, c.meta) },
  // piropo y wingman no USAN la metadata (no miran roles), pero la piden: el
  // cobro central exime al owner y sin ella no resuelve su LID.
  { nombres: ['piropo', 'wingman'], meta: true, cobro: { piropo: 'piropo', wingman: 'wingman' }, aOtro: true,
    hace: (c) => (c.command === 'wingman'
      ? c.de('wingman').cmdWingman(c.sock, c.msg)
      : c.de('wingman').cmdPiropo(c.sock, c.msg)) },

  // ─── El aura ───────────────────────────────────────────────────────────────
  { nombres: ['aura'], meta: true,
    hace: (c) => c.de('aura').cmdAura(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['apostar', 'apuesta', 'apuestas'], meta: true, hace: aura('apostar') },
  // *!top 10 <tema>* ES *!top10 <tema>*. Alguien escribio "!top 10 que cojen
  // bien piola" y le salio el RANKING DE AURA: los argumentos se tiraban
  // enteros, asi que el numero y el tema se perdian. El que lo escribe no tiene
  // forma de saber que el espacio importa.
  //
  // Solo se desvia si HAY tema detras. *!top 10* a secas no es un sorteo sin
  // asunto —cmdTopRandom se calla sin tema— sino la forma natural de pedir el
  // ranking de aura, asi que eso se queda como estaba. Y *!auratop*, en una
  // palabra, es el ranking: no silencio.
  { nombres: ['top', 'ranking', 'auratop'], meta: true,
    hace: (c) => (c.command === 'top' && ['5', '10'].includes(c.args[0]) && c.args.length > 1
      ? c.de('topsRandom').cmdTopRandom(c.sock, c.msg, Number(c.args[0]), c.args.slice(1), c.meta)
      : aura('top')(c)) },
  { nombres: ['hoy'], meta: true, hace: aura('hoy') },
  // Estos dos iban a 'hoy', que enseña mensajes del dia y racha. Se llaman
  // saldo y no enseñaban ningun saldo; ahora van al numero.
  { nombres: ['saldo', 'miaura'], meta: true, hace: aura('saldo') },
  // La guia del aura, como comando propio. Existia solo como *!aura info*, que
  // nadie descubre por su cuenta, y lo alternativo era meter la explicacion
  // entera en !commands — que es exactamente lo que lo tenia hinchado. Con
  // puerta propia el menu se queda en una linea y la guia puede ser todo lo
  // larga que haga falta sin estorbar a nadie. Sin argumentos: es la guia.
  { nombres: ['guia', 'aurahelp', 'guiaaura'], meta: true,
    hace: (c) => c.de('aura').cmdAura(c.sock, c.msg, ['info'], c.meta) },
  { nombres: ['resetaura'], meta: true,
    hace: (c) => c.de('aura').cmdResetAura(c.sock, c.msg, c.meta) },
  { nombres: ['mog', 'moggear'], meta: true, cobro: 'mog', aOtro: true,
    hace: (c) => c.de('mog').cmdMog(c.sock, c.msg, c.meta) },
  { nombres: ['roast', 'quemar', 'destruir', 'flamear'], meta: true, lento: true, cobro: 'roast', aOtro: true,
    hace: (c) => c.de('roast').cmdRoast(c.sock, c.msg, c.meta) },
  { nombres: ['dar', 'regalar', 'transferir', 'pagar', 'donar'], meta: true, aura: true, aOtro: true,
    hace: (c) => c.de('dar').cmdDar(c.sock, c.msg, c.args) },

  // ─── El robo y su tienda ───────────────────────────────────────────────────
  //
  // *!atraco* estuvo en la fila del robo y era un bug: contestaba "Dime a quien
  // robas" en vez de entrar a la tienda, con el comando anunciado en el menu y
  // en la guia. Ahora un nombre en dos filas no arranca.
  { nombres: ['robo', 'robar'], meta: true, aura: true, aOtro: true,
    hace: (c) => c.de('robo').cmdRobo(c.sock, c.msg, c.args, c.meta) },
  // La tienda y el bote tienen nombre propio para quien los usa, aunque por
  // dentro cuelguen de !robo.
  { nombres: ['tienda', 'shop'], meta: true, consulta: true, hace: robo('tienda') },
  { nombres: ['comprar'], meta: true, consulta: true, hace: robo('comprar') },
  { nombres: ['bote'], meta: true, consulta: true, hace: robo('bote') },
  // El contraataque, con nombre propio. Vivia solo como *!robo contra*, y un
  // subcomando obliga a saberse la sintaxis justo cuando hay noventa segundos
  // para responder y el que te acaba de robar esta mirando. Se escribe lo que
  // se piensa: contrarobo.
  { nombres: ['contrarobo', 'contraataque', 'contraatacar', 'vengarse'], meta: true, aura: true, aOtro: 'mencion', hace: robo('contra') },
  // !visto — oculto y solo del dueño. No sale en el menu ni lo sugiere el
  // corrector: ver COMANDOS_OCULTOS y cmdVisto en group.js.
  { nombres: ['visto'], meta: true,
    hace: (c) => c.de('group').cmdVisto(c.sock, c.msg, c.args, c.meta) },
  // LA CAJA. Los verbos tienen nombre propio porque nadie escribe "!vault lock"
  // cuando lo que piensa es "lock". Nombres cortos y en ingles porque es lo que
  // se teclea con prisa, y las dos opciones castellanas obvias estaban pilladas
  // de antes: *!sacar* es alias de expulsar y *!abrir* abre el grupo.
  { nombres: ['vault', 'safe'], meta: true, consulta: true,
    hace: (c) => c.de('vault').cmdVault(c.sock, c.msg, c.args, c.meta) },
  { nombres: ['lock', 'stash'], meta: true, aura: true, hace: vault('lock') },
  { nombres: ['unlock'], meta: true, aura: true, hace: vault('unlock') },
  // LAS ACCIONES. Un solo destino para todos sus nombres: el modulo sabe cual
  // le toca por el nombre tecleado.
  { grupo: 'ALIAS_ACCION', meta: true, lento: true, cobraDentro: true, aOtro: true,
    hace: (c) => c.de('acciones').ejecutarAccion(c.command, c.sock, c.msg, c.args, c.meta) },
  { nombres: ['asalto', 'asaltar'], meta: true, aura: true, hace: robo('asalto') },
  // El atraco a la tienda, con nombre propio por el mismo motivo que el
  // contraataque: nadie escribe "!robo atraco" cuando lo que piensa es
  // "atraco".
  { nombres: ['atraco', 'atracar'], meta: true, aura: true, hace: robo('atraco') },
  { nombres: ['caja', 'registradora'], meta: true, consulta: true, hace: robo('caja') },
  // Los mas buscados, con nombre propio. Vivia solo como *!robo top*, y el
  // propio owner tuvo que preguntar cual era el comando dos dias despues de
  // pedir la lista: si quien la encargo no lo encuentra, nadie lo va a
  // encontrar.
  { nombres: ['buscados', 'wanted', 'mostwanted', 'recompensas', 'cartel'], meta: true, consulta: true, hace: robo('top') },
  { nombres: ['duel', 'duelo', '1v1'], meta: true, aura: true, aOtro: true,
    hace: (c) => c.de('duel').cmdDuel(c.sock, c.msg, c.args, c.meta) },

  { nombres: ['vs', 'versus'], meta: true, lento: true, cobraDentro: true, cobro: 'vs', aOtro: true,
    hace: (c) => c.de('activity').cmdVs(c.sock, c.msg, c.args, c.meta) },
  // !fantasmas ordena a los que hablan POCO; !inactivos saca a los que no han
  // escrito NUNCA. Son dos listas distintas a proposito.
  { nombres: ['fantasmas', 'fantasma', 'muertos'], meta: true, lento: true, cobro: 'fantasmas',
    hace: (c) => c.de('activity').cmdFantasmas(c.sock, c.msg, c.meta) },
  { nombres: ['inactivos', 'inactivo'], meta: true, lento: true,
    hace: (c) => c.de('activity').cmdInactivos(c.sock, c.msg, c.meta) },
  { nombres: ['on'], meta: true,
    hace: (c) => c.de('social').cmdOn(c.sock, c.msg, c.meta) },
  { nombres: ['off'], meta: true,
    hace: (c) => c.de('social').cmdOff(c.sock, c.msg, c.meta) },
  { nombres: ['ping'],
    hace: (c) => c.de('social').cmdPing(c.sock, c.msg) },
  { nombres: ['info', 'estado', 'status'],
    hace: (c) => c.de('social').cmdInfo(c.sock, c.msg) },
  { nombres: ['casino'], meta: true,
    hace: (c) => c.de('social').cmdCasino(c.sock, c.msg, c.meta) },
  { nombres: ['menu', 'help', 'ayuda', 'commands'], meta: true,
    hace: (c) => c.de('social').cmdHelp(c.sock, c.msg, c.meta, c.args) },
];

// De donde sale cada comando: su modulo de src/commands, cargado la primera vez
// que se usa. `require` guarda el modulo, asi que las siguientes veces no se
// vuelve a leer nada.
const cargarComando = (mod) => require(`../commands/${mod}`);

// `familiaDe` dice de que comando es un nombre de grupo (los alias de una misma
// accion son una familia: *!fuck*, *!follar*, *!joder*).
function construirListas({ ALIAS_ACCION, familiaDe = null }) {
  const grupos = { ALIAS_ACCION };
  const NEEDS_META = new Set();
  const LENTOS = new Set();
  const COBRAN_SOLOS = new Set();
  const CMDS_AURA = new Set();
  const SOLO_CONSULTA = new Set();
  const MEDIA_CMDS = new Set();
  const COBRO_CENTRAL = {};
  // Nombre -> familia. Lo usa el corrector: una errata que se parece a dos
  // alias del MISMO comando no es una duda, y una que se parece a dos comandos
  // distintos si.
  const FAMILIA = new Map();
  // Nombre -> lo que hace.
  const EJECUTA = new Map();
  // Nombre -> true | 'mencion' (ver `aOtro`).
  const A_OTRO = new Map();
  FAMILIAS.forEach((f, i) => {
    const nombres = f.grupo ? [...(grupos[f.grupo] || [])] : f.nombres;
    if (typeof f.hace !== 'function') {
      throw new Error(`comandos.js: la fila de *${nombres[0] || f.grupo}* no dice lo que hace (falta \`hace\`)`);
    }
    for (const n of nombres) {
      if (EJECUTA.has(n)) {
        throw new Error(`comandos.js: *${n}* esta en dos filas; solo la primera responderia y la otra quedaria muerta`);
      }
      EJECUTA.set(n, f.hace);
      FAMILIA.set(n, f.grupo ? `${f.grupo}:${(familiaDe && familiaDe(n)) || n}` : `fila${i}`);
      if (f.meta) NEEDS_META.add(n);
      if (f.lento) LENTOS.add(n);
      if (f.cobraDentro) COBRAN_SOLOS.add(n);
      if (f.aura) CMDS_AURA.add(n);
      if (f.consulta) SOLO_CONSULTA.add(n);
      if (f.media) MEDIA_CMDS.add(n);
      if (f.aOtro) A_OTRO.set(n, f.aOtro);
      const c = f.cobro && (typeof f.cobro === 'string' ? f.cobro : f.cobro[n]);
      if (c) COBRO_CENTRAL[n] = c;
    }
  });
  // Los de porcentaje, sacados de su precio: comparten concepto y son los unicos.
  const CMDS_PORCENTAJE = Object.keys(COBRO_CENTRAL).filter((n) => COBRO_CENTRAL[n] === 'percent');
  return { NEEDS_META, LENTOS, COBRAN_SOLOS, CMDS_AURA, SOLO_CONSULTA, MEDIA_CMDS, COBRO_CENTRAL, CMDS_PORCENTAJE, FAMILIA, EJECUTA, A_OTRO };
}

module.exports = { FAMILIAS, construirListas, cargarComando };
