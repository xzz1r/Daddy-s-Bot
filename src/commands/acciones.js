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
const path = require('path');
const { getSender, getTarget, sameUser, isOwner, isMainOwner, canonicalJid, indexGroupMeta } = require('../utils/wa');
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
  // Se quedaron fuera `bully`, `glomp` y `cringe`: suenan bien pero no existen
  // alli, y una categoria inventada monta un comando que cobra, falla y
  // devuelve el aura cada vez sin que nadie sepa por que.
  //
  // `kill` estuvo en esa lista y ya no: no esta en nekos.best, pero SI en otra
  // web, y por eso existe FUENTE_POR_CAT. Ver alli.
  tickle:   { cat: 'tickle',   es: 'cosquillas', pool: RX.TICKLE,   cmds: ['tickle', 'cosquillas'] },
  nom:      { cat: 'nom',      es: 'mordisquear', pool: RX.NOM,     cmds: ['nom', 'mordisquear'] },
  peck:     { cat: 'peck',     es: 'piquito',    pool: RX.PECK,     cmds: ['peck', 'piquito', 'besito'] },
  handhold: { cat: 'handhold', es: 'de la mano', pool: RX.HANDHOLD, cmds: ['handhold', 'mano', 'manos'] },
  stare:    { cat: 'stare',    es: 'mirar',      pool: RX.STARE,    cmds: ['stare', 'mirar', 'mirada'] },
  laugh:    { cat: 'laugh',    es: 'burla',      pool: RX.LAUGH,    cmds: ['laugh', 'burla', 'reirse'] },
  yeet:     { cat: 'yeet',     es: 'lanzar',     pool: RX.YEET,     cmds: ['yeet', 'lanzar', 'tirar'] },
  kill:     { cat: 'kill',     es: 'matar',      pool: RX.KILL,     cmds: ['kill', 'matar', 'rematar'] },
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

// ─── LA CATEGORIA QUE NO ESTA EN LA WEB DE SIEMPRE ──────────────────────────
//
// *!shoot* se cayo y en su sitio esta *!kill*. Lo pidio el dueño: «!shoot solo
// muestra una mona china disparando». Y tenia razon en el fondo — la categoria
// entera de nekos.best va de chicas de anime con pistola, siempre el mismo
// registro, y en un grupo eso se agota a la tercera.
//
// El problema es que nekos.best NO tiene `kill`, y este fichero ya lo decia
// unas lineas mas arriba. Tampoco la tienen otakugifs ni purrbot (comprobado,
// no supuesto: sus dos listas de categorias no la traen), y waifu.pics, que si
// la tiene, llevaba el dia entero devolviendo 502 en TODAS sus rutas.
//
// La que si la trae y responde es kawaii.red. Medido: 25 peticiones seguidas
// sin un solo fallo, 447 ms de media, quince gifs distintos y todos de anime.
//
// Va en una tabla y no pegada a la accion porque quien decide la web es la
// CATEGORIA: la clave de la despensa se calcula a partir de ella en tres sitios
// distintos, y con la fuente colgando de la accion habria que pasarla por
// parametro en los ocho. Aqui se resuelve en una funcion y no cambia ninguna
// firma.
//
// La direccion es SFW y por eso puede estar escrita aqui. La de ACCION_NSFW_API
// sigue sin estarlo, por los mismos dos motivos de siempre.
const FUENTE_POR_CAT = {
  kill: 'https://kawaii.red/api/gif/{cat}/token=anonymous/',
};

// Y SI ESA WEB SE CAE, EL COMANDO NO SE MUERE.
//
// Una fuente de fuera se cae —waifu.pics lo estaba haciendo mientras escribia
// esto— y un *!kill* que cobra, falla y devuelve el aura cada vez es un comando
// roto aunque el aura vuelva. El respaldo es `shoot` de nekos.best: son gifs de
// otra arma, pero las frases del pool no nombran ninguna a proposito, asi que
// encajan igual.
const RESPALDO_POR_CAT = {
  kill: { base: 'https://nekos.best/api/v2/', cat: 'shoot' },
};

// La web de una categoria, en un solo sitio. La NSFW manda cuando esta puesta;
// si no, la propia de la categoria; si no, la de siempre.
function fuenteDe(cat, nsfw) {
  if (nsfw && API_NSFW) return API_NSFW;
  return FUENTE_POR_CAT[cat] || API;
}
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
// Las ultimas direcciones servidas de cada categoria, para no repetir gif. Seis
// es mas que las dos que caben en la despensa y menos que el catalogo de la
// categoria mas pobre: bloquear mas seria quedarse sin de donde elegir.
const RECIENTES_POR_CAT = 6;
const gifsRecientes = new Map();   // clave -> [direcciones]

function yaSalio(clave, url) {
  return (gifsRecientes.get(clave) || []).includes(url);
}

function apuntarGif(clave, url) {
  const lista = gifsRecientes.get(clave) || [];
  if (!lista.includes(url)) lista.push(url);
  while (lista.length > RECIENTES_POR_CAT) lista.shift();
  gifsRecientes.set(clave, lista);
  // Sin tope, una instalacion con veinte categorias guarda ciento veinte
  // direcciones y ya esta; el tope esta por si alguien mete cien categorias.
  if (gifsRecientes.size > 200) gifsRecientes.delete(gifsRecientes.keys().next().value);
}

const LISTOS_POR_CAT = 2;
const TOPE_DESPENSA = 24 * 1024 * 1024;
const despensa = new Map();      // clave -> { cola: [], ts }
const reponiendo = new Set();    // para no pedir dos veces lo mismo a la vez

// ─── Y LA DESPENSA SOBREVIVE AL REINICIO ───────────────────────────────────
//
// EL PROBLEMA QUE QUEDABA. La despensa vivía solo en memoria, así que cada
// despliegue la vaciaba y la primera vez de cada acción volvía a pagar el
// viaje entero. Medido en la VPS el 9 de septiembre, justo después de un
// `npm run update`:
//
//   accion fuck: 15105 ms (traer 15105, subir 0, 37 KB, despensa 0)
//   accion anal:  7606 ms (traer 7606,  subir 0, 55 KB, despensa 2)
//
// Quince segundos. Y el calentado no llega a tiempo a propósito: va de una en
// una con treinta segundos de pausa, así que tarda unos once minutos en dejarlo
// todo listo. Esa lentitud es deliberada —pegarle veintiuna peticiones seguidas
// a la misma web es como te cortan el acceso, y ya pasó una vez— así que la
// respuesta NO es calentar más rápido.
//
// La respuesta es no tener que calentar. Lo que se preparó antes del reinicio
// sigue siendo válido después: son ficheros MP4 ya convertidos. Se guardan en
// disco según se preparan y se leen al arrancar. El comando que se usa un
// minuto después de un despliegue va tan rápido como el de ayer, y de paso la
// web recibe MENOS peticiones, que es justo lo que la pausa larga protegía.
//
// LOS FICHEROS SON EL ÍNDICE. Un `indice.json` aparte se desincroniza el día
// que el proceso muera a mitad de escritura y deje un fichero sin apuntar o un
// apunte sin fichero. Aquí el nombre del fichero LLEVA la clave dentro, así que
// leer el directorio es reconstruir la despensa, y lo que sobre se borra solo.
//
// LO QUE HAY DENTRO. Los MP4 de las acciones normales son gifs de anime; los de
// las NSFW, lo que sean. Van a `data/`, que está fuera de git entero —el
// repositorio es público y esto no se sube nunca— y ocupan como mucho el tope
// de la despensa, 24 MB.
const DESPENSA_DIR = path.join(__dirname, '../../data/despensa');
// Un MP4 de hace dos días sigue reproduciéndose igual, pero una despensa que no
// caduca deja de rotar: las mismas dos unidades por categoría para siempre. Con
// un día se conserva lo que vale —el hueco después de un despliegue— y se sigue
// renovando el contenido.
const EDAD_MAXIMA = 24 * 60 * 60 * 1000;

// El nombre lleva la clave dentro, y la clave lleva la URL de la fuente, que en
// las NSFW es justo lo que no puede quedar escrito en claro en ningún sitio. Se
// guarda su hash: sirve igual para agrupar y no dice de dónde salió.
const huella = (clave) => require('crypto').createHash('sha1').update(clave).digest('hex').slice(0, 16);
// El lote se calcula UNA VEZ por unidad y lo comparten sus dos ficheros. La
// primera version lo calculaba dentro de cada nombre, asi que el MP4 y su
// miniatura salian con sufijos distintos, no se agrupaban al leer, y la
// miniatura se quedaba huerfana y se borraba sola. Sintoma: acciones que
// volvian del disco sin miniatura y Baileys lanzando su propio ffmpeg.
const loteNuevo = (clave) => `${huella(clave)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Escribir y borrar no pueden tocar el camino caliente ni tumbar el bot: la
// despensa es una optimización, y una optimización que rompe el comando al que
// ayuda no ayuda. Todo va sin esperar y con el fallo tragado.
const enDisco = new Map();       // item -> [ficheros suyos]
let avisadoDisco = false;
function disco(fn) {
  Promise.resolve().then(fn).catch((e) => {
    if (avisadoDisco) return;
    avisadoDisco = true;
    logger.warn(`despensa en disco: ${e.message} (sigue funcionando en memoria)`);
  });
}

function guardarEnDisco(clave, medio) {
  const partes = [];
  if (medio.mp4) partes.push(['mp4', medio.mp4]);
  else if (medio.imagen) partes.push(['img', medio.imagen]);
  else return;
  if (medio.thumb) partes.push(['thb', medio.thumb]);
  const lote = loteNuevo(clave);
  const ficheros = partes.map(([tipo]) => path.join(DESPENSA_DIR, `${lote}.${tipo}`));
  enDisco.set(medio, ficheros);
  disco(async () => {
    await fs.ensureDir(DESPENSA_DIR);
    for (let i = 0; i < partes.length; i++) await fs.writeFile(ficheros[i], partes[i][1]);
  });
}

function borrarDeDisco(medio) {
  const ficheros = enDisco.get(medio);
  if (!ficheros) return;
  enDisco.delete(medio);
  disco(() => Promise.all(ficheros.map((f) => fs.remove(f))));
}

// Al arrancar: se lee el directorio, se agrupa por huella y se reconstruye. Lo
// caducado y lo que no case con ninguna categoría viva se borra aquí mismo, que
// es la única limpieza que necesita este sitio.
async function restaurarDespensa() {
  if (!await fs.pathExists(DESPENSA_DIR)) return 0;
  const vivas = new Map();
  for (const nombre of ACTIVAS) {
    const a = ACCIONES[nombre];
    vivas.set(huella(claveDespensa(a.cat, a.nsfw, a.catNsfw)), claveDespensa(a.cat, a.nsfw, a.catNsfw));
  }
  const porLote = new Map();
  for (const f of await fs.readdir(DESPENSA_DIR)) {
    const m = /^([0-9a-f]{16})-(\d+)-([a-z0-9]+)\.(mp4|img|thb)$/.exec(f);
    const lleno = path.join(DESPENSA_DIR, f);
    if (!m || !vivas.has(m[1]) || Date.now() - Number(m[2]) > EDAD_MAXIMA) { await fs.remove(lleno); continue; }
    const lote = `${m[1]}-${m[2]}-${m[3]}`;
    if (!porLote.has(lote)) porLote.set(lote, { clave: vivas.get(m[1]), ts: Number(m[2]), ficheros: {} });
    porLote.get(lote).ficheros[m[4]] = lleno;
  }
  let n = 0;
  for (const { clave, ficheros } of [...porLote.values()].sort((a, b) => a.ts - b.ts)) {
    const cuerpo = ficheros.mp4 || ficheros.img;
    // Un lote al que le falta el cuerpo es una escritura que se quedó a medias.
    if (!cuerpo) { for (const f of Object.values(ficheros)) await fs.remove(f); continue; }
    const medio = ficheros.mp4 ? { mp4: await fs.readFile(cuerpo) } : { imagen: await fs.readFile(cuerpo) };
    if (ficheros.thb) medio.thumb = await fs.readFile(ficheros.thb);
    // Si la categoría ya está llena, este lote sobra: se borra en vez de
    // quedarse ocupando disco para siempre sin que nadie lo lea.
    const d = despensa.get(clave);
    if (d && d.cola.length >= LISTOS_POR_CAT) { for (const f of Object.values(ficheros)) await fs.remove(f); continue; }
    enDisco.set(medio, Object.values(ficheros));
    guardarEnDespensa(clave, medio, true);
    n++;
  }
  return n;
}

// UN SOLO TRABAJO DE FONDO A LA VEZ, Y ESTO NO ES UN DETALLE.
//
// ffmpeg corre detras de un semaforo compartido con los stickers, *!toimg* y
// *!ttp*, con DOS plazas para todo el bot. Rellenar la despensa tambien pasa por
// ahi, y sin este freno varias categorias rellenandose a la vez podian ocupar
// las dos plazas: entonces alguien manda una foto para hacer un sticker y su
// comando se queda esperando a un trabajo que no le importa a nadie.
//
// Con el tope en uno, el fondo nunca puede llenar el semaforo: siempre queda
// una plaza para quien esta esperando delante de la pantalla.
//
// Y EL TOPE VIVE EN UNA SOLA PUERTA, `enFondo`, porque la primera vez lo escribi
// suelto y me quedo a medias: la reposicion miraba el contador antes de subirlo,
// pero el calentado del arranque lo subia sin mirar nada. O sea que durante los
// diez minutos posteriores a cada despliegue —cuando el calentado esta en
// marcha— bastaba con que alguien usara una accion para tener DOS trabajos de
// fondo a la vez y las dos plazas de ffmpeg ocupadas. Medido: pico de 2.
//
// El validador tampoco lo veia: buscaba el texto del freno en el fichero y
// contaba subidas y bajadas dentro de la reposicion, que estaba bien. Con una
// puerta unica no hay dos sitios que puedan discrepar.
let fondoEnCurso = 0;

// Corre `fn` como trabajo de fondo si hay hueco. Devuelve null —y no hace nada—
// cuando ya hay uno en marcha, para que quien llama decida: la reposicion se
// rinde (esa categoria se rellenara la proxima vez que alguien la use, que es
// cuando importa) y el calentado reintenta, porque su trabajo es dejarlas todas
// listas y saltarse una es dejar esa accion lenta hasta el proximo despliegue.
function enFondo(fn) {
  if (fondoEnCurso >= 1) return null;
  fondoEnCurso++;
  return Promise.resolve().then(fn).finally(() => { fondoEnCurso--; });
}

// LA CLAVE SE CALCULA EN UN SITIO. Escrita dos veces —al sacar y al reponer—
// se desincroniza el dia que alguien toque la fuente, y el sintoma seria que la
// despensa se llena y nunca se usa: cada comando volveria a pagar el viaje
// entero sin que nada pareciera roto.
function claveDespensa(cat, nsfw, catNsfw) {
  const conFuente = nsfw && API_NSFW;
  return `${fuenteDe(cat, nsfw)}|${conFuente ? (catNsfw || cat) : cat}`;
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
    for (const m of despensa.get(vieja).cola) borrarDeDisco(m);
    despensa.delete(vieja);
  }
}

function sacarDeDespensa(clave) {
  const d = despensa.get(clave);
  if (!d?.cola.length) return null;
  d.ts = Date.now();
  const medio = d.cola.shift();
  borrarDeDisco(medio);
  return medio;
}

function guardarEnDespensa(clave, medio, delDisco = false) {
  if (!medio) return;
  // El desglose de tiempos es de ESTA peticion. Guardado en la despensa se
  // serviria manana como si fuera de manana, y el log mentiria.
  delete medio._t;
  const d = despensa.get(clave) || { cola: [], ts: Date.now() };
  if (d.cola.length >= LISTOS_POR_CAT) return;
  d.cola.push(medio);
  d.ts = Date.now();
  despensa.set(clave, d);
  if (!delDisco) guardarEnDisco(clave, medio);
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
// Cuando el hueco de fondo esta cogido no se espera media pausa entera: en
// cuanto se libere hay trabajo que hacer, y cinco segundos no se parecen a una
// rafaga contra la web porque en ese hueco no se pide nada.
const ESPERA_OCUPADO = 5 * 1000;
let calentando = null;

// Todos los temporizadores del calentado por el mismo sitio: `unref` para que
// una despensa a medias no impida que el proceso termine, y una sola variable
// que apunte al pendiente.
function luego(fn, ms) {
  calentando = setTimeout(fn, ms);
  calentando.unref?.();
}

function calentarDespensa() {
  if (calentando) return;
  // Ocupado desde ya: leer el disco es asincrono y sin esta marca una segunda
  // llamada durante la lectura arrancaria una segunda cola de calentado.
  calentando = true;
  const cola = ACTIVAS.slice();
  const siguiente = () => {
    const nombre = cola.shift();
    if (!nombre) { calentando = null; logger.info('despensa de acciones lista'); return; }
    const a = ACCIONES[nombre];
    const clave = claveDespensa(a.cat, a.nsfw, a.catNsfw);
    if (despensa.get(clave)?.cola.length) { luego(siguiente, 50); return; }
    // Si el hueco de fondo esta cogido —lo tipico es que lo tenga la reposicion
    // de una accion que alguien acaba de usar—, esta categoria se DEVUELVE a la
    // cola y se reintenta. Saltarsela dejaria esa accion sin preparar hasta el
    // proximo despliegue, que es justo lo que el calentado viene a evitar.
    const trabajo = enFondo(() => traerAccion(a.cat, a.nsfw, a.catNsfw, true)
      .then((m) => guardarEnDespensa(clave, m))
      .catch(() => { /* la web falla: ya se vera cuando alguien lo pida */ }));
    if (!trabajo) { cola.unshift(nombre); luego(siguiente, ESPERA_OCUPADO); return; }
    trabajo.finally(() => luego(siguiente, ESPERA_ENTRE_CALENTADOS));
  };
  // LO PRIMERO ES EL DISCO. Lo que quedo preparado antes del reinicio ya esta
  // convertido: leerlo cuesta milisegundos y ahorra una peticion a la web por
  // cada categoria que vuelva llena. El calentado empieza despues y se salta
  // solo las que ya lo estan.
  restaurarDespensa()
    .then((n) => { if (n) logger.info(`despensa: ${n} unidad(es) recuperadas de antes del reinicio`); })
    .catch((e) => logger.warn(`despensa en disco: ${e.message} (se calienta desde cero)`))
    .finally(() => luego(siguiente, ESPERA_PRIMER_CALENTADO));
}

function reponerDespensa(cat, nsfw, catNsfw, clave) {
  const d = despensa.get(clave);
  if (d && d.cola.length >= LISTOS_POR_CAT) return;
  if (reponiendo.has(clave)) return;
  reponiendo.add(clave);
  // El contador de fondo lo sube y lo baja `enFondo`, y lo baja en un `finally`:
  // pase lo que pase ahi dentro, el hueco se devuelve. Escrito a mano eran
  // cuatro sitios que tenian que cuadrar, y bastaba con que uno se quedara
  // arriba para que la despensa dejara de rellenarse hasta el siguiente
  // reinicio, sin un solo mensaje de error.
  // SE MIRA SI LA DESPENSA HA CRECIDO, NO SI LA PETICION HA IDO BIEN. Y esto
  // es lo que separa un relleno de un bot colgado.
  //
  // Antes bastaba con que la peticion trajera algo para volver a intentarlo. El
  // problema: `guardarEnDespensa` llama a `podarDespensa`, y si lo que acaba de
  // llegar pesa mas que el tope entero, la poda borra esa categoria completa.
  // La peticion habia ido bien, la cola seguia vacia, y la funcion se llamaba a
  // si misma. Sin timer de por medio.
  //
  // Reproducido con un fichero de 30 MB contra un tope de 24: noventa peticiones
  // por segundo y el event loop MUERTO — un `setTimeout` de cuatro segundos
  // programado antes del bucle no llego a dispararse nunca. En la VPS de un core
  // eso es el bot entero colgado, sin excepcion y sin una linea en el log.
  //
  // Hoy no se puede alcanzar: el tope de descarga son 8 MB y caben dos por
  // categoria, o sea 16 contra 24. Pero eso son tres constantes, y basta con
  // mover una. La condicion correcta no es "ha traido algo", es "hay mas que
  // antes": si lo que meto desaparece, no lo vuelvo a intentar.
  let crecio = false;
  const trabajo = enFondo(() => traerAccion(cat, nsfw, catNsfw, true)
    .then((m) => {
      const antes = despensa.get(clave)?.cola.length || 0;
      guardarEnDespensa(clave, m);
      crecio = (despensa.get(clave)?.cola.length || 0) > antes;
    })
    .catch((e) => { logger.warn(`despensa ${clave}: ${e.message}`); }));
  if (!trabajo) { reponiendo.delete(clave); return; }
  trabajo.finally(() => {
    reponiendo.delete(clave);
    // Y otra vuelta hasta llenar, PERO SOLO SI LA ANTERIOR TRAJO ALGO. De una
    // en una y encadenadas: dos peticiones a la vez a la misma web es como se
    // empieza a parecer a un scraper.
    //
    // Y con la web caida no se reintenta: la despensa nunca llegaria a llenarse,
    // asi que reintentar seria un bucle de peticiones a una web que ya esta
    // fallando, a toda velocidad y sin que nadie lo vea. Se deja como esta y ya
    // lo intentara la proxima accion que alguien use.
    if (!crecio) return;
    const d2 = despensa.get(clave);
    if (!d2 || d2.cola.length < LISTOS_POR_CAT) reponerDespensa(cat, nsfw, catNsfw, clave);
  });
}

// `fondo` en true = esto lo esta preparando la despensa y no hay nadie
// esperandolo. Entonces NO se hace cola: se coge la plaza de ffmpeg solo si esta
// libre ahora mismo, y si no, se abandona. En la VPS el semaforo tiene UNA plaza
// (ver la nota de NUCLEOS en helpers), asi que ponerse en la cola significaria
// que alguien espera su sticker detras de un trabajo que no ha pedido nadie.
//
// Abandonar no pierde nada: esa categoria se rellena la proxima vez que alguien
// la use, que es justo el momento en el que importa.
async function gifAMp4(gif, fondo = false) {
  const entrada = tempFile('gif');
  const salida = tempFile('mp4');
  // LA PLAZA SE COGE PEGADA AL `try`, Y ESTO NO ES ESTILO.
  //
  // Estaba cogida DOS LINEAS ANTES, con un `await fs.writeFile` en medio. El
  // `finally` que la suelta vive dentro del `try`, asi que si esa escritura
  // reventaba —sin disco, sin permisos, demasiados ficheros abiertos— la plaza
  // se quedaba cogida PARA SIEMPRE.
  //
  // Reproducido con el semaforo de verdad: tras un fallo de escritura, la
  // siguiente peticion de plaza devuelve false. Y en la VPS hay UNA plaza, o
  // sea que a partir de ese momento no vuelve a salir ni un sticker, ni un
  // !toimg, ni un !ttp, ni un vídeo de !tt hasta el siguiente reinicio. Sin una
  // linea en el log, porque `acquire()` no tiene tope de espera: se queda ahi.
  //
  // Ahora se escribe primero y se pide la plaza despues, justo antes del `try`.
  await fs.writeFile(entrada, gif);
  if (fondo && !ffmpegSemaphore.tryAcquire()) throw new Error('ffmpeg ocupado, ya se rellenara');
  if (!fondo) await ffmpegSemaphore.acquire();
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

// Y LA RESPUESTA TAMPOCO TIENE LA MISMA FORMA EN DOS WEBS.
//
//   nekos.best   { results: [ { url } ] }
//   purrbot      { link }
//   kawaii.red   { response }
//   la mayoria   { url }
//
// Va en su propia funcion para que se pueda comprobar sin salir a internet: una
// forma que falte no da error, da «la web no ha devuelto ningun gif» con la web
// contestando perfectamente, y eso es de las cosas que se tarda una tarde en
// encontrar mirando el sitio equivocado.
function direccionDelGif(data) {
  const directa = (x) => (typeof x === 'string' && /^https?:\/\//i.test(x) ? { url: x } : null);
  return directa(data?.results?.[0]?.url)
    || directa(data?.url)
    || directa(data?.link)
    || directa(data?.response)
    || directa(data?.images?.[0]?.url)
    || null;
}

// `deDespensa` en true significa "estoy rellenando por adelantado": se salta la
// despensa para no devolver lo que ya estaba guardado y volver a guardarlo.
async function traerAccion(cat, nsfw, catNsfw, deDespensa = false) {
  // La fuente y la categoria van JUNTAS: cambiar de web sin cambiar de
  // categoria es pedirle a una el nombre que usa la otra.
  const conFuente = nsfw && API_NSFW;
  const base = fuenteDe(cat, nsfw);
  const cual = conFuente ? (catNsfw || cat) : cat;
  const clave = claveDespensa(cat, nsfw, catNsfw);
  if (!deDespensa) {
    const listo = sacarDeDespensa(clave);
    if (listo) return listo;
  }
  // EL DESGLOSE DE LOS TRES PASOS. El log decia `traer 15105` y ese numero no
  // se puede arreglar: pedirle la direccion a la web, bajarse el fichero y
  // pasarlo por ffmpeg son tres problemas distintos y el arreglo de cada uno es
  // otro. Con el reparto, la proxima vez que tarde ya dice cual fue.
  const t = { api: 0, bajar: 0, convertir: 0 };
  const marca = Date.now();
  // Y SI LA WEB DE ESA CATEGORIA SE CAE, SE PRUEBA LA DE RESPALDO. Una fuente
  // de fuera se cae, y sin esto el comando se queda cobrando y devolviendo el
  // aura hasta que alguien mire el log.
  const pedir = async () => {
    try {
      return (await axios.get(direccionDe(base, cual), { timeout: 12000 })).data;
    } catch (e) {
      const r = !conFuente && RESPALDO_POR_CAT[cual];
      if (!r) throw e;
      logger.warn(`accion ${cual}: la web falló (${e.response?.status || e.message}); tiro del respaldo`);
      return (await axios.get(direccionDe(r.base, r.cat), { timeout: 12000 })).data;
    }
  };

  // ─── QUE NO SALGA DOS VECES EL MISMO GIF ──────────────────────────────────
  //
  // El dueño lo vio en el grupo: «se repitió dos veces seguidas un mismo GIF».
  //
  // Y es de esperar sin hacer nada: estas webs tienen entre diez y veinte gifs
  // por categoria y sirven uno AL AZAR, sin memoria. Con diez, la probabilidad
  // de que el siguiente sea el mismo es una de cada diez — y la despensa lo
  // empeora, porque guarda dos por categoria y los pide por separado: si los
  // dos salen iguales, el grupo ve el mismo gif dos veces seguidas seguro.
  //
  // Se lleva la cuenta de las ultimas direcciones servidas de cada categoria y,
  // si la que llega ya esta en esa lista, se vuelve a pedir. Dos reintentos
  // como mucho: con diez gifs, tres tiradas dejan la probabilidad de repetir en
  // una de cada mil, y mas intentos serian peticiones de mas contra una web que
  // ya se sabe que corta si se la aprieta.
  //
  // La memoria es por CATEGORIA y no por grupo: lo que se esta evitando es que
  // la fuente sirva lo mismo, y eso no depende de quien lo pida.
  let data = await pedir();
  for (let intento = 0; intento < 2; intento++) {
    const dir = direccionDelGif(data)?.url;
    if (!dir || !yaSalio(clave, dir)) break;
    logger.info(`accion ${cual}: la web repitió gif; pido otro`);
    data = await pedir();
  }
  const elegido = direccionDelGif(data)?.url;
  if (elegido) apuntarGif(clave, elegido);
  t.api = Date.now() - marca;
  // Cada web contesta a su manera: nekos.best mete todo en results[], y las
  // demas suelen devolver {url} a secas. Se aceptan las dos para que cambiar de
  // fuente sea poner una linea en el .env y nada mas.
  // Cada API llama de otra forma al campo con la direccion: nekos.best lo mete
  // en results[], purrbot lo llama `link` y la mayoria `url`. Se aceptan las
  // tres para que la fuente sea intercambiable de verdad.
  const r = direccionDelGif(data);
  if (!r?.url) throw new Error('la web no ha devuelto ningun gif');
  const marca2 = Date.now();
  const bajado = await axios.get(r.url, {
    responseType: 'arraybuffer', timeout: 15000,
    maxContentLength: TOPE_DESCARGA, maxBodyLength: TOPE_DESCARGA,
  });
  t.bajar = Date.now() - marca2;
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
  if (tipo === 'imagen') return { imagen: bytes, _t: t };
  if (tipo === 'mp4') return { mp4: bytes, _t: t };
  const marca3 = Date.now();
  const { buf: mp4, thumb } = await gifAMp4(bytes, deDespensa);
  t.convertir = Date.now() - marca3;
  return { mp4, thumb, _t: t };
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
    //
    // Y SI NO SE PUEDE SABER QUIEN ES, TAMPOCO. Medido: con la metadata del
    // grupo caida y el mapa de @lid frio —o sea, en los primeros segundos
    // despues de un reinicio—, la mencion llega como un @lid que no se puede
    // traducir a un telefono, isMainOwner no encuentra a nadie y el blindaje se
    // abria. Las tres explicitas funcionaban contra el dueño.
    //
    // Se niega igual. La cuenta es facil: negar de mas cuesta que un dia raro
    // *!fuck* diga que la web va mal —que es lo que dice cuando la web va mal de
    // verdad, y pasa cada pocos dias—, y no cobra. Dejarlo pasar cuesta que el
    // blindaje no exista justo el rato en que nadie lo esta mirando. No hay
    // discusion: la regla del anonimato esta por encima de que un comando salga
    // siempre.
    //
    // Y solo aplica al @lid SIN TRADUCIR. Una mencion en forma de telefono se
    // compara por digitos y no necesita metadata para nada, asi que este caso no
    // le toca y el comando sigue funcionando como siempre.
    //
    // Y EL MAPA SE LLENA ANTES DE PREGUNTAR. Lo escribi al reves y salio caro:
    // canonicalJid traduce con un mapa que llena indexGroupMeta, y quien lo
    // llamaba era isMainOwner, DESPUES. Asi que la primera pregunta se hacia
    // siempre con el mapa vacio: todas las menciones parecian sin resolver y las
    // tres explicitas se negaban contra CUALQUIERA, no solo contra el dueño.
    // Escrito aqui, y no confiado al efecto lateral de otra funcion, que es
    // justo lo que hizo falta para verlo.
    if (groupMeta) indexGroupMeta(groupMeta);
    const sinResolver = String(objetivo).endsWith('@lid')
      && String(canonicalJid(objetivo) || objetivo).endsWith('@lid');
    if (nsfw && (sinResolver || isMainOwner(objetivo, false, groupMeta))) {
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
      await devolver(jid, quien, pago.pagado, concepto).catch(() => {});
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
      const t = traido._t;
      const reparto = t ? ` [web ${t.api}, bajar ${t.bajar}, ffmpeg ${t.convertir}]` : '';
      logger.warn(`accion ${nombre}: ${tTraer + tSubir} ms (traer ${tTraer}${reparto}, subir ${tSubir}, `
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

module.exports = { ACCIONES, ACTIVAS, ALIAS_ACTIVOS, ROAST_CADA, calentarDespensa, _restaurarDespensa: restaurarDespensa, _guardarEnDespensa: guardarEnDespensa, _sacarDeDespensa: sacarDeDespensa, _DESPENSA_DIR: DESPENSA_DIR, _fondo: () => fondoEnCurso, _despensa: despensa, _traerAccion: traerAccion, _claveDespensa: claveDespensa, _yaSalio: yaSalio, _apuntarGif: apuntarGif, _gifsRecientes: gifsRecientes, _fuenteDe: fuenteDe, _FUENTE_POR_CAT: FUENTE_POR_CAT, _RESPALDO_POR_CAT: RESPALDO_POR_CAT, _direccionDe: direccionDe, _direccionDelGif: direccionDelGif, ...comandos, _turnoRoast: turnoRoast };
