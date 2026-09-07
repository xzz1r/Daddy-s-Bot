// Comandos de acción: *!hug*, *!kiss*, *!punch* y compañía.
//
// Traen un gif de anime de nekos.best, lo convierten a MP4 —WhatsApp NO
// reproduce bytes de GIF, hace falta un vídeo con gifPlayback, lo mismo que ya
// aprendió !toimg— y lo mandan con una frase y las dos menciones.
//
// POR QUÉ CUESTAN 60. No es por lo que gastan: bajar un gif y convertirlo es de
// lo más barato que hace el bot, muy por debajo de un sticker. Es por lo que
// invitan a hacer: son sociales, van dirigidos a alguien y piden repetirse
// contra medio grupo. El precio es el único freno que no depende de que nadie
// vigile, y con 150 de arranque son dos usos.
//
// SI LA WEB FALLA, SE DEVUELVE EL AURA. Es un recurso de fuera y se cae — al
// escribir esto, la otra fuente conocida llevaba horas dando 502. Cobrar por un
// comando que no ha traído nada es exactamente lo que el resto del bot ya
// aprendió a no hacer.
const axios = require('axios');
const fs = require('fs-extra');
const { getSender, getTarget, sameUser, isOwner, isMainOwner, canonicalJid } = require('../utils/wa');
const { cobrar, devolver, textoSinSaldo } = require('../utils/auraCobro');
const { pickFresh, tempFile, cleanTemp, ffmpegSemaphore } = require('../utils/helpers');
const { ffmpegPath } = require('../utils/ffmpeg');
const { spawn } = require('child_process');
const RX = require('../data/accionPhrases');
const logger = require('../utils/logger');

// Comando -> categoría de nekos.best y pool de frases.
//
// *!spank* NO está: ninguna fuente decente lo tiene en su catálogo sin ropa de
// por medio, y un comando que enseña otra cosa distinta de la que dice es peor
// que no tenerlo. Lo más parecido que sí existe es *!bonk*.
// `cat` es la categoria de la web; `cmds` son los nombres que se teclean. Son
// dos cosas distintas y aqui hay dos casos donde no coinciden:
//
//   · KICK no puede llamarse *!kick*: ese comando YA existe y EXPULSA del
//     grupo. Un gif de anime robandole el nombre al comando que echa gente es
//     la peor confusion posible. Se llama *!stomp*, que es una patada y no
//     suena a echar a nadie.
//   · BITE no puede llamarse *!bite*: esta a UNA letra de *!bote*, que es la
//     caja comun y se usa a diario. Quien escriba mal el bote se comeria un
//     mordisco de 60 de aura. Se llama *!chomp*.
//
// LOS NOMBRES EN CASTELLANO SALEN EN EL MENU, entre parentesis detras del
// ingles. Antes solo estaban en *!help todo* y eso obligaba a pedir la lista
// larga para descubrir que *!abrazo* existia.
//
// Y SE ELIGEN POR QUE SE ENTIENDAN EN TODAS PARTES, no por sonar bien aqui.
// Cayeron los que solo se entienden en España o que significan otra cosa al
// cruzar el charco: *zurra* y *mazazo* por *martillazo* (que ademas es lo que
// hace el gif), *torta* por *cachetada* —torta en media America es un pastel—,
// *mimo* por *acurrucar*, y *porculo* fuera, que *!culo* ya vale.
//
// Y EL MENU LOS ESCRIBE BIEN, con su eñe y su tilde: `es` es la forma que se
// LEE, y `cmds` las que se TECLEAN. Son dos cosas distintas y hacian falta las
// dos.
//
// El dispatcher normaliza antes de comparar —quita tildes y eñes— asi que un
// `case` con eñe no se alcanza nunca y el alias tiene que guardarse como
// *punetazo*. Eso funciona: quien escribe "puñetazo" llega igual. Lo que no
// valia era ENSEÑARLO asi en el menu, que es donde se lee. Con `es` aparte, el
// menu dice *puñetazo* y el dispatcher sigue casando *punetazo*.
//
// (Y conste que *!punetazo* nunca estuvo roto. Lo dije y era falso: el alias
// respondia perfectamente, lo que fallaba era como se veia.)
//
// Lo comprueba `npm run check`: ningun nombre de accion puede pisar un comando
// existente ni quedarse a una letra de otro.
const ACCIONES = {
  hug:    { cat: 'hug',    es: 'abrazo',     pool: RX.HUG,    cmds: ['hug', 'abrazo', 'abrazar'] },
  kiss:   { cat: 'kiss',   es: 'beso',       pool: RX.KISS,   cmds: ['kiss', 'beso', 'besar'] },
  cuddle: { cat: 'cuddle', es: 'acurrucar',  pool: RX.CUDDLE, cmds: ['cuddle', 'acurrucar', 'arrimar'] },
  pat:    { cat: 'pat',    es: 'caricia',    pool: RX.PAT,    cmds: ['pat', 'caricia', 'acariciar'] },
  punch:  { cat: 'punch',  es: 'puñetazo',   pool: RX.PUNCH,  cmds: ['punch', 'punetazo', 'golpe'] },
  slap:   { cat: 'slap',   es: 'cachetada',  pool: RX.SLAP,   cmds: ['slap', 'cachetada', 'bofetada'] },
  bite:   { cat: 'bite',   es: 'mordisco',   pool: RX.BITE,   cmds: ['chomp', 'mordisco', 'morder'] },
  kick:   { cat: 'kick',   es: 'patada',     pool: RX.KICK,   cmds: ['stomp', 'patada', 'patear'] },
  bonk:   { cat: 'bonk',   es: 'martillazo', pool: RX.BONK,   cmds: ['bonk', 'martillazo', 'coscorron'] },
  // ─── SE QUITARON DOS, Y POR REDUNDANTES ───────────────────────────────────
  //
  // *!poke* era un dedo en el costado: *!tickle* ocupa el mismo sitio fisico y
  // tiene chiste. *!highfive* era el unico de camaraderia limpia en una lista
  // que va de cariño invasivo y palizas, y se notaba: fue el pool que mas me
  // costo escribir y el que peor quedo.
  //
  // Una accion de mas no es gratis: ensucia el menu, se lleva un hueco de la
  // despensa y reparte el uso entre veintitantos comandos en vez de concentrarlo
  // en los que funcionan.
  //
  // ─── LAS DE LA SEGUNDA TANDA ──────────────────────────────────────────────
  //
  // Se eligieron para que la lista dejara de ser "cariño o paliza". Las diez
  // primeras solo tenian esos dos registros; estas meten la burla, la
  // incomodidad, la sumision y el ridiculo, que dan mucho mas juego en un grupo.
  //
  // Todas las categorias estan COMPROBADAS contra la web (`npm run acciones`).
  // Se quedaron fuera `bully`, `glomp`, `kill` y `cringe`: suenan bien pero no
  // existen alli, y una categoria inventada monta un comando que cobra, falla y
  // devuelve el aura cada vez sin que nadie sepa por que.
  tickle:   { cat: 'tickle',   es: 'cosquillas', pool: RX.TICKLE,   cmds: ['tickle', 'cosquillas'] },
  nom:      { cat: 'nom',      es: 'mordisquear', pool: RX.NOM,     cmds: ['nom', 'mordisquear'] },
  peck:     { cat: 'peck',     es: 'piquito',    pool: RX.PECK,     cmds: ['peck', 'piquito', 'besito'] },
  handhold: { cat: 'handhold', es: 'de la mano', pool: RX.HANDHOLD, cmds: ['handhold', 'mano', 'manos'] },
  stare:    { cat: 'stare',    es: 'mirar',      pool: RX.STARE,    cmds: ['stare', 'mirar', 'mirada'] },
  laugh:    { cat: 'laugh',    es: 'burla',      pool: RX.LAUGH,    cmds: ['laugh', 'burla', 'reirse'] },
  yeet:     { cat: 'yeet',     es: 'lanzar',     pool: RX.YEET,     cmds: ['yeet', 'lanzar', 'tirar'] },
  shoot:    { cat: 'shoot',    es: 'disparar',   pool: RX.SHOOT,    cmds: ['shoot', 'disparar', 'tiro'] },
  feed:     { cat: 'feed',     es: 'dar de comer', pool: RX.FEED,   cmds: ['feed', 'comer', 'comida'] },
  // La cara. Cuesta el doble justamente para que no se use en bucle: el riesgo
  // de este comando no es la CPU, es la cuenta.
  //
  // DOS CATEGORIAS, Y NO ES UN CAPRICHO. La web SFW de serie no tiene ninguna
  // categoria que valga para esto —lo mas parecido es `kiss`, y de ahi salio el
  // beso sin sentido que se vio en el grupo—, mientras que las webs NSFW la
  // llaman `fuck` y no tienen `kiss`. Una sola categoria falla siempre en uno de
  // los dos lados: o manda un beso teniendo la fuente puesta, o pide una
  // categoria que no existe y devuelve el aura.
  //
  //   cat      la de la web SFW, que es a donde va si no hay fuente puesta
  //   catNsfw  la de la web NSFW, que es la que manda en cuanto la hay
  fuck:   { cat: 'kiss', catNsfw: 'fuck', es: 'follar', pool: RX.FUCK, cmds: ['fuck', 'follar', 'joder'], nsfw: true },
  // Lo mismo que *!fuck* y por los mismos motivos: cuesta el doble y la web SFW
  // no tiene nada que se le parezca, asi que sin fuente puesta cae en `kiss`
  // igual que aquel. Con la fuente, pide su propia categoria.
  anal:   { cat: 'kiss', catNsfw: 'anal', es: 'culo', pool: RX.ANAL, cmds: ['anal', 'culo'], nsfw: true },
  // El final. Mismo trato que los otros dos: 120, categoria propia comprobada
  // contra la fuente, y la web SFW no tiene nada que se le parezca.
  cum:    { cat: 'kiss', catNsfw: 'cum', es: 'correrse', pool: RX.CUM, cmds: ['cum', 'correrse', 'acabar'], nsfw: true },
};

// SIN FRASES NO HAY COMANDO.
//
// Las frases son de Grok y viven en accionPhrases.js. Mientras un pool no
// exista, la accion entera esta APAGADA: no sale en el menu, no se puede
// teclear, no cobra y no contesta nada. No es un caso raro que haya que
// recordar: es el estado en el que nacio esto.
//
// Se apaga sola, mirando el pool. Nada de una lista de "activas" escrita a
// mano, que es exactamente lo que se queda desincronizado el dia que llegue el
// segundo lote y nadie se acuerde de anyadir el nombre.
//
// Y ROAST_USUARIO aparte: es un pool solo, OTRO mensaje. Si falta ese, las
// acciones funcionan igual pero sin remate. No se apaga nada por el.
const hayFrases = (p) => Array.isArray(p) && p.length > 0;
const ACTIVAS = Object.keys(ACCIONES).filter((n) => hayFrases(ACCIONES[n].pool));
const ALIAS_ACTIVOS = ACTIVAS.flatMap((n) => ACCIONES[n].cmds);

// CADA CUANTAS ACCIONES SALE EL ROAST.
//
// Decision del dueño, y con motivo: estos comandos se usan en rafaga contra
// medio grupo, asi que un segundo mensaje debajo de cada uno deja de leerse a
// las tres veces y pasa a ser ruido. Una de cada cinco lo devuelve a lo que
// era.
//
// LA CUENTA ES POR GRUPO, no por persona, porque lo que se esta dosificando es
// el ruido del chat y eso no lo mide una persona sola: cinco personas mandando
// una accion cada una llenan el grupo igual que una mandando cinco.
//
// Y VIVE EN MEMORIA a proposito. Es lo unico del bot que puede reiniciarse a
// cero sin que nadie pierda nada: un despliegue adelanta o retrasa UN roast.
// Guardarlo en disco seria una escritura mas por cada accion para cuidar un
// numero que a nadie le importa.
const ROAST_CADA = 5;
const turnoRoast = new Map();

const API = 'https://nekos.best/api/v2/';

// LA FUENTE NSFW NO VIENE PUESTA, Y ES A PROPOSITO.
//
// *!fuck* existe y funciona, pero de serie tira de la misma web SFW que el
// resto. Para que traiga otra cosa hay que poner la direccion a mano en el
// .env:
//
//   ACCION_NSFW_API=https://loquesea/api/
//
// No va escrita en el codigo por dos motivos que no son pudor. Uno: este
// repositorio es publico y una URL de porno dentro lo convierte en otra cosa a
// ojos de GitHub. Dos: la eleccion de a que web se conecta el bot —y por tanto
// que puede acabar mandando al grupo sin que nadie lo revise— es del dueño, no
// de quien escribe el codigo. Con la variable puesta funciona igual; sin ella,
// *!fuck* es un comando mas con las frases mas subidas.
const API_NSFW = (process.env.ACCION_NSFW_API || '').trim();
const TOPE_DESCARGA = 8 * 1024 * 1024;   // un gif de reacción pesa cientos de KB

// LA CACHE POR URL SE QUITO, y conviene saber por que estaba y por que ya no.
//
// Guardaba hasta cuarenta MP4 ya convertidos indexados por su direccion, para
// que un gif repetido no volviera a pasar por ffmpeg. Tenia sentido cuando
// bajar y convertir ocurria con alguien esperando delante.
//
// Con la despensa ya no: ese trabajo esta fuera del camino caliente, asi que lo
// unico que ahorraba era esfuerzo en segundo plano — y lo cobraba en memoria,
// hasta doce megas de buffers en una maquina de 1 GB donde el bot ya ronda los
// ciento cuarenta y la despensa se lleva otros veinticuatro.
//
// Dos almacenes de lo mismo, uno de ellos sin efecto visible. Fuera.

// ─── LA DESPENSA: GIFS YA LISTOS, ANTES DE QUE NADIE LOS PIDA ───────────────
//
// POR QUÉ EL COMANDO IBA LENTO. Entre que alguien escribía *!hug* y salía el
// gif pasaban tres cosas, todas por delante de la respuesta:
//
//   1. pedirle una dirección a la web    ~250-550 ms
//   2. bajarse el gif (hasta 1,5 MB)     ~200-800 ms
//   3. pasarlo por ffmpeg a MP4          ~60-200 ms aquí, mucho más en el
//                                         único core de una VPS pequeña
//
// Medido: algo más de un segundo en una máquina rápida, tres o cuatro en la de
// verdad. Y ninguno de los tres necesita que nadie esté esperando delante.
//
// Así que se hacen ANTES. Se guarda un par de gifs ya convertidos por categoría
// y el comando se lleva uno hecho: en el camino caliente solo queda subirlo a
// WhatsApp, que es lo único que no se puede adelantar. Al terminar se repone lo
// gastado sin que nadie mire.
//
// LA PRIMERA VEZ DE CADA CATEGORÍA SIGUE SIENDO LENTA, y no hay forma de
// evitarlo: no se puede tener listo lo que nadie ha pedido nunca. Se llena sola
// con el uso, y llenarla al arrancar seria pegarle veinte peticiones seguidas a
// la web en cada despliegue, que es como se consigue que te corten.
//
// EL TOPE ES DE MEMORIA, NO DE UNIDADES. Un gif de reacción va de 27 KB a
// 1,5 MB, así que "dos por categoría" no dice nada sobre lo que ocupa. Con
// veinte acciones y este tope no pasa de 24 MB, en una máquina de 1 GB donde el
// bot ronda los 140.
const LISTOS_POR_CAT = 2;
const TOPE_DESPENSA = 24 * 1024 * 1024;
const despensa = new Map();      // clave -> { cola: [], ts }
const reponiendo = new Set();    // para no pedir dos veces lo mismo a la vez

// UN SOLO TRABAJO DE FONDO A LA VEZ, Y ESTO NO ES UN DETALLE.
//
// ffmpeg corre detras de un semaforo compartido con los stickers, *!toimg* y
// *!ttp*, con DOS plazas para todo el bot. Rellenar la despensa tambien pasa por
// ahi, y sin este freno varias categorias rellenandose a la vez podian ocupar
// las dos plazas: entonces alguien manda una foto para hacer un sticker y su
// comando se queda esperando a un trabajo que no le importa a nadie.
//
// Con el tope en uno, el fondo nunca puede llenar el semaforo: siempre queda
// una plaza para quien esta esperando delante de la pantalla. Y si llega otra
// peticion de relleno mientras hay una en marcha, se descarta sin mas — esa
// categoria se rellenara la proxima vez que alguien la use, que es justo el
// momento en el que importa.
let fondoEnCurso = 0;

// LA CLAVE SE CALCULA EN UN SITIO. Escrita dos veces —al sacar y al reponer—
// se desincroniza el dia que alguien toque la fuente, y el sintoma seria que la
// despensa se llena y nunca se usa: cada comando volveria a pagar el viaje
// entero sin que nada pareciera roto.
function claveDespensa(cat, nsfw, catNsfw) {
  const conFuente = nsfw && API_NSFW;
  return `${conFuente ? API_NSFW : API}|${conFuente ? (catNsfw || cat) : cat}`;
}

const pesaDe = (m) => (m?.mp4?.length || m?.imagen?.length || 0);

function pesoDespensa() {
  let t = 0;
  for (const { cola } of despensa.values()) for (const m of cola) t += pesaDe(m);
  return t;
}

// Se tira por CATEGORÍA entera, la menos usada. Quitar una unidad suelta de
// cada sitio dejaría todas a medias, que es el peor reparto posible: ninguna
// llegaría a estar lista y el trabajo de haberlas preparado se pierde igual.
function podarDespensa() {
  while (pesoDespensa() > TOPE_DESPENSA && despensa.size) {
    let vieja = null;
    for (const [k, v] of despensa) if (!vieja || v.ts < despensa.get(vieja).ts) vieja = k;
    despensa.delete(vieja);
  }
}

function sacarDeDespensa(clave) {
  const d = despensa.get(clave);
  if (!d?.cola.length) return null;
  d.ts = Date.now();
  return d.cola.shift();
}

function guardarEnDespensa(clave, medio) {
  if (!medio) return;
  const d = despensa.get(clave) || { cola: [], ts: Date.now() };
  if (d.cola.length >= LISTOS_POR_CAT) return;
  d.cola.push(medio);
  d.ts = Date.now();
  despensa.set(clave, d);
  podarDespensa();
}

// Repone en segundo plano. No se espera, no se avisa y no se propaga: si la web
// está caída, el siguiente comando lo descubrirá por el camino normal y
// devolverá el aura como siempre. Un fallo aquí no puede tocar a nadie.
//
// EL catNsfw TIENE QUE VIAJAR HASTA AQUI, y aqui lo perdi. Reponia llamando con
// `catNsfw = null`, asi que para *!fuck* bajaba un gif de la categoria SFW de
// respaldo —un beso— y lo guardaba bajo la clave de la explicita. El siguiente
// *!fuck* se llevaba ese beso de la despensa: exactamente el fallo que ya se vio
// en el grupo, resucitado por la puerta de atras y sin que ningun validador lo
// mirara, porque el que existia comprobaba la peticion en vivo y no la reposicion.
// ─── LLENAR LA DESPENSA AL ARRANCAR, MUY DESPACIO ──────────────────────────
//
// La despensa empieza vacía en cada reinicio, y hay un reinicio en cada
// despliegue. O sea que la primera vez de CADA acción pagaba el viaje entero:
// medido en la VPS, 2987 ms de traer para un *!cum* con la despensa a cero.
// Veintiuna acciones son veintiuna primeras veces lentas después de cada
// actualización.
//
// Así que se llena sola al arrancar. Pero DE UNA EN UNA Y CON PAUSA LARGA: un
// bot recién conectado que le pega veintiuna peticiones seguidas a la misma web
// es exactamente el patrón por el que cortan el acceso, y esa web ya me bloqueó
// una vez esta semana por menos. Con treinta segundos entre cada una tarda diez
// minutos en estar todo listo y no se parece a nada.
//
// Empieza un minuto después de conectar: al arrancar, el bot tiene cosas más
// importantes que hacer con ese único core.
const ESPERA_PRIMER_CALENTADO = 60 * 1000;
const ESPERA_ENTRE_CALENTADOS = 30 * 1000;
let calentando = null;

function calentarDespensa() {
  if (calentando) return;
  const cola = ACTIVAS.slice();
  const siguiente = () => {
    const nombre = cola.shift();
    if (!nombre) { calentando = null; logger.info('despensa de acciones lista'); return; }
    const a = ACCIONES[nombre];
    const clave = claveDespensa(a.cat, a.nsfw, a.catNsfw);
    if (despensa.get(clave)?.cola.length) { calentando = setTimeout(siguiente, 50); calentando.unref?.(); return; }
    fondoEnCurso++;
    traerAccion(a.cat, a.nsfw, a.catNsfw, true)
      .then((m) => guardarEnDespensa(clave, m))
      .catch(() => { /* la web falla: ya se vera cuando alguien lo pida */ })
      .finally(() => {
        fondoEnCurso--;
        calentando = setTimeout(siguiente, ESPERA_ENTRE_CALENTADOS); calentando.unref?.();
      });
  };
  calentando = setTimeout(siguiente, ESPERA_PRIMER_CALENTADO);
  calentando.unref?.();
}

function reponerDespensa(cat, nsfw, catNsfw, clave) {
  const d = despensa.get(clave);
  if (d && d.cola.length >= LISTOS_POR_CAT) return;
  if (reponiendo.has(clave)) return;
  if (fondoEnCurso >= 1) return;   // ver la nota de fondoEnCurso
  reponiendo.add(clave);
  fondoEnCurso++;
  traerAccion(cat, nsfw, catNsfw, true)
    .then((m) => {
      guardarEnDespensa(clave, m);
      reponiendo.delete(clave);
      fondoEnCurso--;
      // Y otra vuelta hasta llenar. De una en una y encadenadas: dos peticiones
      // a la vez a la misma web es como se empieza a parecer a un scraper.
      const d2 = despensa.get(clave);
      if (!d2 || d2.cola.length < LISTOS_POR_CAT) reponerDespensa(cat, nsfw, catNsfw, clave);
    })
    .catch((e) => { logger.warn(`despensa ${clave}: ${e.message}`); reponiendo.delete(clave); fondoEnCurso--; });
}

async function gifAMp4(gif) {
  const entrada = tempFile('gif');
  const salida = tempFile('mp4');
  await fs.writeFile(entrada, gif);
  await ffmpegSemaphore.acquire();
  try {
    await new Promise((resolve, reject) => {
      // Las dimensiones PARES son obligatorias para H.264, y un gif de
      // reacción viene a 500x281 con toda tranquilidad. Sin el scale, ffmpeg
      // falla con "height not divisible by 2" y el comando muere entero.
      // MAS PEQUEÑO, QUE ES LO QUE QUEDA POR OPTIMIZAR. Con la despensa, bajar y
      // convertir ya no le hacen esperar a nadie: lo unico que queda en el
      // camino caliente es SUBIRLO a WhatsApp, y eso depende del tamaño.
      //
      // Medido sobre un gif de 2 MB:
      //
      //   crf 23, tamaño original   376 KB
      //   crf 28, tamaño original   171 KB
      //   crf 28, ancho <= 400      101 KB   <- este
      //   crf 30, ancho <= 320       55 KB   (ya se ve blando)
      //
      // Cuatro veces menos que subir. Y 400 px de ancho sobran: la burbuja de
      // WhatsApp pinta esto a unos 300, asi que lo que se recorta no se veia.
      //
      // `min(400,iw)` solo ENCOGE — un gif pequeño no se estira, que quedaria
      // peor que dejarlo como estaba. El -2 mantiene la altura par, que es
      // obligatorio para H.264 y ya costo un fallo aqui.
      const ff = spawn(ffmpegPath, ['-y', '-i', entrada,
        '-movflags', 'faststart', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        '-vf', "scale='min(400,iw)':-2", '-crf', '28',
        '-preset', 'veryfast', '-an', salida]);
      const mata = setTimeout(() => { try { ff.kill('SIGKILL'); } catch {} reject(new Error('ffmpeg tardo demasiado')); }, 20000);
      ff.on('error', (e) => { clearTimeout(mata); reject(e); });
      ff.on('close', (code) => {
        clearTimeout(mata);
        code === 0 ? resolve() : reject(new Error(`ffmpeg salio con ${code}`));
      });
    });
    const buf = await fs.readFile(salida);
    if (buf.length < 100) throw new Error('MP4 vacio');

    // LA MINIATURA, AQUI Y NO AL ENVIAR. Baileys, si el mensaje de video no
    // trae `jpegThumbnail`, lanza OTRO ffmpeg en el momento de mandarlo para
    // sacar una miniatura de 32x32 (Utils/messages-media.js: generateThumbnail).
    // O sea: un proceso mas, dentro del camino caliente, en el unico core de la
    // VPS — y eso explica que subir 13 KB tardara 1699 ms.
    //
    // Hecha aqui va con el resto del trabajo pesado: en la despensa, antes de
    // que nadie pida nada. Si falla, se manda sin ella y Baileys hace lo de
    // siempre: una miniatura no vale un comando roto.
    let thumb = null;
    try {
      const jpg = tempFile('jpg');
      try {
        await new Promise((resolve, reject) => {
          const ff2 = spawn(ffmpegPath, ['-y', '-i', salida, '-frames:v', '1',
            '-vf', "scale='min(64,iw)':-2", '-q:v', '8', jpg]);
          const mata2 = setTimeout(() => { try { ff2.kill('SIGKILL'); } catch {} reject(new Error('thumb')); }, 8000);
          ff2.on('error', (e) => { clearTimeout(mata2); reject(e); });
          ff2.on('close', (c) => { clearTimeout(mata2); c === 0 ? resolve() : reject(new Error(`thumb ${c}`)); });
        });
        thumb = await fs.readFile(jpg);
      } finally { await cleanTemp(jpg); }
    } catch { /* sin miniatura: Baileys la hara, que es como estaba antes */ }

    return { buf, thumb };
  } finally {
    ffmpegSemaphore.release();
    await cleanTemp(entrada);
    await cleanTemp(salida);
  }
}

// Monta la direccion para una categoria. Las APIs de gifs de anime no usan
// todas la misma forma:
//
//   nekos.best   https://nekos.best/api/v2/CATEGORIA
//   purrbot      https://purrbot.site/api/img/sfw/CATEGORIA/gif
//
// Por eso ACCION_NSFW_API admite un {cat} donde vaya la categoria. Si no lo
// lleva, se pega al final, que es el caso facil. Asi cambiar de fuente es pegar
// UNA linea en el .env, sin tocar codigo ni volver a desplegar nada nuevo.
function direccionDe(base, cat) {
  return base.includes('{cat}') ? base.replace(/\{cat\}/g, cat) : `${base}${cat}`;
}

// `deDespensa` en true significa "estoy rellenando por adelantado": se salta la
// despensa para no devolver lo que ya estaba guardado y volver a guardarlo.
async function traerAccion(cat, nsfw, catNsfw, deDespensa = false) {
  // La fuente y la categoria van JUNTAS: cambiar de web sin cambiar de
  // categoria es pedirle a una el nombre que usa la otra.
  const conFuente = nsfw && API_NSFW;
  const base = conFuente ? API_NSFW : API;
  const cual = conFuente ? (catNsfw || cat) : cat;
  if (!deDespensa) {
    const listo = sacarDeDespensa(claveDespensa(cat, nsfw, catNsfw));
    if (listo) return listo;
  }
  const { data } = await axios.get(direccionDe(base, cual), { timeout: 12000 });
  // Cada web contesta a su manera: nekos.best mete todo en results[], y las
  // demas suelen devolver {url} a secas. Se aceptan las dos para que cambiar de
  // fuente sea poner una linea en el .env y nada mas.
  // Cada API llama de otra forma al campo con la direccion: nekos.best lo mete
  // en results[], purrbot lo llama `link` y la mayoria `url`. Se aceptan las
  // tres para que la fuente sea intercambiable de verdad.
  const r = data?.results?.[0]
    || (data?.url ? { url: data.url } : null)
    || (data?.link ? { url: data.link } : null)
    || (data?.images?.[0]?.url ? { url: data.images[0].url } : null);
  if (!r?.url) throw new Error('la web no ha devuelto ningun gif');
  const bajado = await axios.get(r.url, {
    responseType: 'arraybuffer', timeout: 15000,
    maxContentLength: TOPE_DESCARGA, maxBodyLength: TOPE_DESCARGA,
  });
  const bytes = Buffer.from(bajado.data);

  // NO TODA FUENTE DEVUELVE UN GIF. La de las acciones normales si, pero en
  // cuanto se apunta a otra web —lo que hace ACCION_NSFW_API— empiezan a llegar
  // jpeg, png y mp4 sueltos. Pasar un jpeg por el conversor de gifs da un mp4 de
  // un fotograma o un error, y el comando moria diciendo que no pudo traer nada.
  //
  // Se mira lo que ha llegado DE VERDAD, por los bytes y no por la extension de
  // la URL, que miente a menudo:
  //   · GIF -> a MP4, que es lo unico que WhatsApp reproduce en bucle.
  //   · MP4 -> tal cual.
  //   · imagen fija -> se manda como imagen, sin tocar ffmpeg.
  const tipo = queEs(bytes);
  if (tipo === 'imagen') {
    return { imagen: bytes };
  }
  if (tipo === 'mp4') {
    return { mp4: bytes };
  }
  const { buf: mp4, thumb } = await gifAMp4(bytes);
  return { mp4, thumb };
}

// Por la cabecera, no por la extension.
function queEs(b) {
  if (b.length < 12) return 'otro';
  if (b.slice(0, 3).toString('latin1') === 'GIF') return 'gif';
  if (b.slice(4, 8).toString('latin1') === 'ftyp') return 'mp4';
  if (b[0] === 0xFF && b[1] === 0xD8) return 'imagen';                     // jpeg
  if (b.slice(1, 4).toString('latin1') === 'PNG') return 'imagen';          // png
  if (b.slice(0, 4).toString('latin1') === 'RIFF'
      && b.slice(8, 12).toString('latin1') === 'WEBP') return 'imagen';     // webp
  return 'gif';   // que lo intente el conversor; si no puede, se devuelve el aura
}

function hazAccion(nombre) {
  const { cat, catNsfw, pool, nsfw } = ACCIONES[nombre];

  return async function ejecutar(sock, msg, args, groupMeta) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: 'Esto es de grupo. Aquí no hay a quién.' }, { quoted: msg });
    }

    const quien = getSender(msg);
    const objetivo = getTarget(msg);
    // SIN OBJETIVO NO HAY ACCION, y se avisa ANTES de cobrar. Cobrar y luego
    // decir "menciona a alguien" es cobrar por un rechazo.
    if (!objetivo) {
      return sock.sendMessage(jid, {
        text: `¿A quién? *!${ACCIONES[nombre].cmds[0]} @alguien*.`,
      }, { quoted: msg });
    }
    if (sameUser(objetivo, quien)) {
      return sock.sendMessage(jid, {
        text: 'A ti mismo no. Búscate a alguien.',
      }, { quoted: msg });
    }

    // ─── LAS EXPLICITAS NO VAN CONTRA EL DUEÑO ──────────────────────────────
    //
    // *!fuck* y *!anal* no se le pueden mandar al dueño PRINCIPAL. Las otras
    // nueve si: un abrazo o una torta van a quien sea, el incluido.
    //
    // Y SOLO A EL, no al tier owner entero: es decision suya y la escribio asi.
    // Un co-owner es una persona del grupo como las demas para estos dos.
    //
    // Y SE NIEGA COMO SI FALLARA LA WEB, no con un "a ese no". Esto es lo unico
    // delicado del comando y conviene que quede escrito:
    //
    // Un rechazo con nombre y apellidos —"a ese no puedes"— solo ocurre con UNA
    // persona del grupo, asi que a la segunda vez el grupo ha aprendido quien
    // manda en el bot. Y que eso no se sepa es la regla que esta por encima de
    // todo lo demas aqui.
    //
    // La respuesta de la web caida, en cambio, ya existe, sale de verdad cada
    // pocos dias —es un recurso de fuera— y no enseña ninguna regla: enseña que
    // una API va regular, que es cierto. Cuesta lo mismo (nada: no se cobra) y
    // no delata a nadie.
    //
    // Se comprueba ANTES de cobrar, o el rechazo saldria pagado.
    if (nsfw && isMainOwner(objetivo, false, groupMeta)) {
      return sock.sendMessage(jid, {
        text: 'No he podido traer el gif. No te he cobrado.',
      }, { quoted: msg });
    }

    const concepto = nsfw ? 'accionNsfw' : 'accion';
    const pago = await cobrar(jid, quien, concepto, { fromMe: msg.key.fromMe, groupMeta });
    if (!pago.ok) {
      return sock.sendMessage(jid, { text: textoSinSaldo(concepto, pago, jid) }, { quoted: msg });
    }

    let traido;
    const t0 = Date.now();
    try {
      traido = await traerAccion(cat, nsfw, catNsfw);
    } catch (e) {
      logger.warn(`accion ${nombre}: ${e.message}`);
      await devolver(jid, quien, pago.pagado).catch(() => {});
      return sock.sendMessage(jid, {
        text: 'No he podido traer el gif. No te he cobrado.',
      }, { quoted: msg });
    }

    // SE MENCIONA EL TELEFONO, NO EL @lid. En un grupo LID —o sea, en todos los
    // de ahora— lo que trae la mencion del mensaje es un @lid, y WhatsApp no
    // sabe a quien pintar con eso: en el grupo sale un "@UnNameD" en vez del
    // nombre. Se vio en produccion, en un *!cuddle*.
    //
    // canonicalJid traduce el @lid al telefono con el mapa que el bot ya
    // mantiene (lo llena indexGroupMeta, que corre porque estas acciones piden
    // metadata). Si no hubiera traduccion, se queda como estaba: peor un @lid
    // crudo que un comando que revienta.
    const objCanon = canonicalJid(objetivo) || objetivo;
    const quienCanon = canonicalJid(quien) || quien;
    const nA = `@${quienCanon.split('@')[0]}`;
    const nV = `@${objCanon.split('@')[0]}`;
    const frase = pickFresh(pool, `${jid}|accion|${nombre}`)
      .replace(/%A/g, nA)
      .replace(/%V/g, nV);

    // EL NOMBRE DEL ANIME NO VA. Rompia el chiste: la frase remata, y debajo
    // aparecia un titulo japones que devolvia al lector a que esto es un gif
    // sacado de una web. Se sigue pidiendo a la API porque viene en la misma
    // respuesta, pero no se enseña.
    const media = traido.imagen
      ? { image: traido.imagen, caption: frase, mentions: [quienCanon, objCanon] }
      : {
          video: traido.mp4,
          gifPlayback: true,
          mimetype: 'video/mp4',
          // Va aunque sea null: `undefined` es lo que hace que Baileys lance su
          // propio ffmpeg, y null no. Ver la nota en gifAMp4.
          jpegThumbnail: traido.thumb || null,
          caption: frase,
          mentions: [quienCanon, objCanon],
        };
    const tTraer = Date.now() - t0;
    const t1 = Date.now();
    await sock.sendMessage(jid, media, { quoted: msg });
    const tSubir = Date.now() - t1;

    // EL DESGLOSE, SOLO CUANDO TARDA. Sin esto, "va lento" no se puede
    // diagnosticar: traer el gif y subirlo a WhatsApp son dos problemas
    // distintos, con arreglos distintos, y el log decia solo el total.
    if (tTraer + tSubir > 1500) {
      logger.warn(`accion ${nombre}: ${tTraer + tSubir} ms (traer ${tTraer}, subir ${tSubir}, `
        + `${Math.round(pesaDe(traido) / 1024)} KB, despensa ${despensa.get(claveDespensa(cat, nsfw, catNsfw))?.cola.length ?? 0})`);
    }

    // SE REPONE LO GASTADO, sin esperar. Va DESPUES de mandar el gif a
    // proposito: si fuera antes, el comando estaria esperando a que se prepare
    // el de la proxima vez, que es justo lo que se venia a quitar de en medio.
    reponerDespensa(cat, nsfw, catNsfw, claveDespensa(cat, nsfw, catNsfw));

    // EL ROAST VA EN OTRO MENSAJE. Pegarlo al caption lo convierte en pie de
    // foto: se lee como continuacion de la escena y no como paliza. Quien usa
    // el comando se lleva, delante del grupo, lo que dice de el usarlo. Al tier
    // dueño no: el bot no le falta al respeto al que lo administra.
    //
    // PERO NO EN TODAS. Una de cada cinco, y esa es la diferencia entre un
    // remate y una coletilla: un segundo mensaje debajo de CADA accion —y estos
    // se usan en rafaga, contra medio grupo— deja de leerse a las tres veces.
    // Espaciado, vuelve a ser lo que era, un corte que nadie esperaba.
    //
    // SOLO CUENTAN LAS QUE PUEDEN LLEVARLO. Las del tier dueño no suman: si
    // sumaran, sus acciones se comerian el turno de otro y el roast saldria
    // cada seis, cada ocho, o no saldria — y desde fuera pareceria roto.
    if (!isOwner(quien, msg.key.fromMe, groupMeta) && hayFrases(RX.ROAST_USUARIO)) {
      const n = (turnoRoast.get(jid) || 0) + 1;
      turnoRoast.set(jid, n % ROAST_CADA);
      if (n % ROAST_CADA === 0) {
        const remate = `_${pickFresh(RX.ROAST_USUARIO, `${jid}|accion|remate`).replace(/%A/g, nA)}_`;
        await sock.sendMessage(jid, { text: remate, mentions: [quienCanon] }, { quoted: msg });
      }
    }
  };
}

// Solo se fabrica el handler de las que tienen frases. Las demas ni existen
// como funcion: quien pregunte por ellas se lleva un undefined, que es lo que
// el dispatcher y el menu miran para no ofrecerlas.
const comandos = {};
for (const nombre of ACTIVAS) comandos[nombre] = hazAccion(nombre);

module.exports = { ACCIONES, ACTIVAS, ALIAS_ACTIVOS, ROAST_CADA, calentarDespensa, _fondo: () => fondoEnCurso, _despensa: despensa, _traerAccion: traerAccion, _claveDespensa: claveDespensa, ...comandos, _turnoRoast: turnoRoast };
