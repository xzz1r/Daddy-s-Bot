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
const { getSender, getTarget, sameUser, isOwner } = require('../utils/wa');
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
// Los nombres en castellano siguen funcionando —*!torta*, *!abrazo*, *!patada*—
// pero NO se anuncian en el menu corto: el bot habla en ingles aqui y una lista
// mezclada quedaba pobre. Estan en *!help todo*, que es la referencia.
//
// Lo comprueba `npm run check`: ningun nombre de accion puede pisar un comando
// existente ni quedarse a una letra de otro.
const ACCIONES = {
  hug:    { cat: 'hug',    pool: RX.HUG,    cmds: ['hug', 'abrazo', 'abrazar'] },
  kiss:   { cat: 'kiss',   pool: RX.KISS,   cmds: ['kiss', 'beso', 'besar'] },
  cuddle: { cat: 'cuddle', pool: RX.CUDDLE, cmds: ['cuddle', 'mimo', 'acurrucar'] },
  pat:    { cat: 'pat',    pool: RX.PAT,    cmds: ['pat', 'caricia', 'acariciar'] },
  poke:   { cat: 'poke',   pool: RX.POKE,   cmds: ['poke', 'toque', 'picar'] },
  punch:  { cat: 'punch',  pool: RX.PUNCH,  cmds: ['punch', 'puno', 'punetazo'] },
  slap:   { cat: 'slap',   pool: RX.SLAP,   cmds: ['slap', 'torta', 'bofetada'] },
  bite:   { cat: 'bite',   pool: RX.BITE,   cmds: ['chomp', 'morder', 'mordisco'] },
  kick:   { cat: 'kick',   pool: RX.KICK,   cmds: ['stomp', 'patada', 'patear'] },
  bonk:   { cat: 'bonk',   pool: RX.BONK,   cmds: ['bonk', 'zurra', 'mazazo'] },
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
  fuck:   { cat: 'kiss', catNsfw: 'fuck', pool: RX.FUCK, cmds: ['fuck', 'follar', 'joder'], nsfw: true },
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

// Lo ya convertido, por URL. La API repite gifs de un catálogo finito, así que
// sin esto el mismo gif pasa por ffmpeg una y otra vez. Vive en memoria y se
// pierde al reiniciar, que es justo lo que se quiere: no ensucia el disco.
const CACHE_MAX = 40;
const cache = new Map();

function recordar(url, mp4) {
  if (cache.has(url)) cache.delete(url);
  else if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(url, mp4);
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
      const ff = spawn(ffmpegPath, ['-y', '-i', entrada,
        '-movflags', 'faststart', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-crf', '23',
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
    return buf;
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

async function traerAccion(cat, nsfw, catNsfw) {
  // La fuente y la categoria van JUNTAS: cambiar de web sin cambiar de
  // categoria es pedirle a una el nombre que usa la otra.
  const conFuente = nsfw && API_NSFW;
  const base = conFuente ? API_NSFW : API;
  const cual = conFuente ? (catNsfw || cat) : cat;
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
  if (cache.has(r.url)) return cache.get(r.url);
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
    recordar(r.url, { imagen: bytes });
    return { imagen: bytes };
  }
  if (tipo === 'mp4') {
    recordar(r.url, { mp4: bytes });
    return { mp4: bytes };
  }
  const mp4 = await gifAMp4(bytes);
  recordar(r.url, { mp4 });
  return { mp4 };
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

    const concepto = nsfw ? 'accionNsfw' : 'accion';
    const pago = await cobrar(jid, quien, concepto, { fromMe: msg.key.fromMe, groupMeta });
    if (!pago.ok) {
      return sock.sendMessage(jid, { text: textoSinSaldo(concepto, pago, jid) }, { quoted: msg });
    }

    let traido;
    try {
      traido = await traerAccion(cat, nsfw, catNsfw);
    } catch (e) {
      logger.warn(`accion ${nombre}: ${e.message}`);
      await devolver(jid, quien, pago.pagado).catch(() => {});
      return sock.sendMessage(jid, {
        text: 'No he podido traer el gif. No te he cobrado.',
      }, { quoted: msg });
    }

    const nA = `@${quien.split('@')[0]}`;
    const nV = `@${objetivo.split('@')[0]}`;
    const frase = pickFresh(pool, `${jid}|accion|${nombre}`)
      .replace(/%A/g, nA)
      .replace(/%V/g, nV);

    // EL NOMBRE DEL ANIME NO VA. Rompia el chiste: la frase remata, y debajo
    // aparecia un titulo japones que devolvia al lector a que esto es un gif
    // sacado de una web. Se sigue pidiendo a la API porque viene en la misma
    // respuesta, pero no se enseña.
    const media = traido.imagen
      ? { image: traido.imagen, caption: frase, mentions: [quien, objetivo] }
      : {
          video: traido.mp4,
          gifPlayback: true,
          mimetype: 'video/mp4',
          caption: frase,
          mentions: [quien, objetivo],
        };
    await sock.sendMessage(jid, media, { quoted: msg });

    // EL ROAST VA EN OTRO MENSAJE. Pegarlo al caption lo convierte en pie de
    // foto: se lee como continuacion de la escena y no como paliza. Quien usa
    // el comando se lleva, delante del grupo, lo que dice de el usarlo. Al tier
    // dueño no: el bot no le falta al respeto al que lo administra.
    if (!isOwner(quien, msg.key.fromMe, groupMeta) && hayFrases(RX.ROAST_USUARIO)) {
      const remate = `_${pickFresh(RX.ROAST_USUARIO, `${jid}|accion|remate`).replace(/%A/g, nA)}_`;
      await sock.sendMessage(jid, { text: remate, mentions: [quien] }, { quoted: msg });
    }
  };
}

// Solo se fabrica el handler de las que tienen frases. Las demas ni existen
// como funcion: quien pregunte por ellas se lleva un undefined, que es lo que
// el dispatcher y el menu miran para no ofrecerlas.
const comandos = {};
for (const nombre of ACTIVAS) comandos[nombre] = hazAccion(nombre);

module.exports = { ACCIONES, ACTIVAS, ALIAS_ACTIVOS, ...comandos, _cache: cache };
