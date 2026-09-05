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
//     la peor confusion posible, asi que se queda en *!patada*.
//   · BITE no puede llamarse *!bite*: esta a UNA letra de *!bote*, que es la
//     caja comun y se usa a diario. Quien escriba mal el bote se comeria un
//     mordisco de 60 de aura. Se queda en *!morder*.
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
  bite:   { cat: 'bite',   pool: RX.BITE,   cmds: ['morder', 'mordisco'] },
  kick:   { cat: 'kick',   pool: RX.KICK,   cmds: ['patada', 'patear'] },
  bonk:   { cat: 'bonk',   pool: RX.BONK,   cmds: ['bonk', 'zurra', 'mazazo'] },
  // La cara. Cuesta el doble justamente para que no se use en bucle: el riesgo
  // de este comando no es la CPU, es la cuenta.
  fuck:   { cat: 'kiss',   pool: RX.FUCK,   cmds: ['fuck', 'follar', 'joder'], nsfw: true },
};

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

async function traerAccion(cat, nsfw) {
  const base = nsfw && API_NSFW ? API_NSFW : API;
  const { data } = await axios.get(`${base}${cat}`, { timeout: 12000 });
  // Cada web contesta a su manera: nekos.best mete todo en results[], y las
  // demas suelen devolver {url} a secas. Se aceptan las dos para que cambiar de
  // fuente sea poner una linea en el .env y nada mas.
  const r = data?.results?.[0] || (data?.url ? { url: data.url } : null);
  if (!r?.url) throw new Error('la web no ha devuelto ningun gif');
  if (cache.has(r.url)) return { mp4: cache.get(r.url), anime: r.anime_name };
  const gif = await axios.get(r.url, {
    responseType: 'arraybuffer', timeout: 15000,
    maxContentLength: TOPE_DESCARGA, maxBodyLength: TOPE_DESCARGA,
  });
  const mp4 = await gifAMp4(Buffer.from(gif.data));
  recordar(r.url, mp4);
  return { mp4, anime: r.anime_name };
}

function hazAccion(nombre) {
  const { cat, pool, nsfw } = ACCIONES[nombre];

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
      traido = await traerAccion(cat, nsfw);
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

    // EL REMATE AL QUE LO PIDE. Decision del dueño: quien usa estos comandos se
    // lleva un recordatorio de lo que dice de el usarlos. Va debajo, en cursiva,
    // separado de la frase de la accion.
    //
    // AL TIER DUEÑO NO. Es el unico que no se lleva la coña, igual que no paga
    // los comandos: el bot no le falta al respeto al que lo administra delante
    // del grupo.
    const remate = isOwner(quien, msg.key.fromMe, groupMeta)
      ? ''
      : `\n\n_${pickFresh(RX.ROAST_USUARIO, `${jid}|accion|remate`).replace(/%A/g, nA)}_`;

    return sock.sendMessage(jid, {
      video: traido.mp4,
      gifPlayback: true,
      mimetype: 'video/mp4',
      caption: frase + (traido.anime ? `\n\n_${traido.anime}_` : '') + remate,
      mentions: [quien, objetivo],
    }, { quoted: msg });
  };
}

const comandos = {};
for (const nombre of Object.keys(ACCIONES)) comandos[nombre] = hazAccion(nombre);

module.exports = { ACCIONES, ...comandos, _cache: cache };
