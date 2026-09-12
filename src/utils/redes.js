'use strict';

// ─── VÍDEOS DE TIKTOK, INSTAGRAM Y PINTEREST, SIN MARCA DE AGUA ─────────────
//
// Tres comandos separados —`!tt`, `!ig`, `!pin`— porque son tres plataformas
// distintas y el dueño las quiere distintas. La tubería sí es una sola: pedir,
// bajar a un temporal, mandar desde disco y borrar.
//
// ─── LO QUE NO SE HACE, Y ES LO QUE LO MANTIENE BARATO ──────────────────────
//
// 1. NO SE TOCA EL VÍDEO. TikTok e Instagram ya entregan H.264 en MP4, que es lo
//    que WhatsApp reproduce. Reencodar el vídeo en el único core de la VPS es lo
//    que convertiría esto en el comando más caro del bot, y no añade nada.
//    Del audio sí se ocupa —viene bajo y en un formato que muchos reproductores
//    decodifican a medias— pero con `-c:v copy`: no se toca un fotograma, y son
//    unos cientos de milisegundos.
//
// 2. NO SE CARGA EN MEMORIA. `!play` lee el fichero entero a un Buffer porque un
//    MP3 son cuatro megas; un reel son veinticinco. Se manda como
//    `{ video: { url: fichero } }`: Baileys abre ahí un createReadStream
//    (Utils/messages-media.js) y la RAM del bot no se entera del tamaño.
//
// 3. NO SE PIDE MINIATURA. Va `jpegThumbnail: null` a propósito. Lo que dispara
//    el ffmpeg interno de Baileys al enviar es `undefined`, no `null`, y ese
//    ffmpeg de más es lo que hacía que subir 13 KB tardara 1699 ms.
//
// ─── Y NO SE GUARDA NADA ────────────────────────────────────────────────────
//
// El fichero se borra en cuanto se manda, en el `finally`, salga bien o mal. Lo
// que se quede atrás por un corte lo barre el barrido horario de temp que ya
// existe (utils/helpers.js). O sea que el bot no acumula vídeos de nadie.
//
// ─── DE DÓNDE SALEN ─────────────────────────────────────────────────────────
//
// Dos vías, en este orden:
//
//   1. La API de esa plataforma en el .env (TIKTOK_API, INSTAGRAM_API,
//      PINTEREST_API, o REDES_API para las tres), si está puesta. Va primero
//      porque descarga en la IP del servicio y no en la nuestra, igual que hace
//      `!play` con RapidAPI: es lo que evita que TikTok e Instagram le cierren
//      la puerta a la IP de un datacenter, que es lo que acaba pasando siempre.
//   2. yt-dlp, si está instalado. Respaldo, y la vía principal de Pinterest.
//
// Las direcciones van en el .env y NO en el repositorio, por lo mismo que
// ACCION_NSFW_API: esto es público y la elección de a qué servicio se conecta el
// bot es del dueño.
//
// Y SI LA API FALLA, NO SE CANTA VICTORIA NI SE MUERE: se apunta en el log y se
// prueba yt-dlp. Un servicio de terceros que se cae un martes no puede dejar el
// comando muerto hasta que alguien mire el .env.
//
// ─── LO DE LA MARCA DE AGUA ─────────────────────────────────────────────────
//
// En TikTok el vídeo limpio y el marcado son dos FORMATOS del mismo enlace: el
// marcado es `download_addr`, el limpio es `play_addr` y sus derivados. yt-dlp
// suele elegir bien por calidad, pero "suele" no es una garantía, así que el
// selector descarta explícitamente cualquier formato cuyo id hable de marca de
// agua, y solo si no queda ninguno cae al mejor a secas.

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
// Arma el freno de salidas (ver src/utils/redSegura.js): sin esto, una URL
// que devuelva una API de fuera puede apuntar al metadata del VPS.
const { urlSegura, DestinoProhibido } = require('./redSegura');
const { acquireDownloadSlot, releaseDownloadSlot, ytdlp, downloadUrlToFile, hayYtDlp, MAX_BYTES, TEMP_DIR } = require('./downloader');
const { ffmpegSemaphore } = require('./helpers');
const { ffmpegPath } = require('./ffmpeg');
const { spawn } = require('child_process');
const logger = require('./logger');

// UNA API POR PLATAFORMA, y con una comun de respaldo. Es lo que pidio el dueño
// y ademas es lo correcto: el servicio que va bien con TikTok no suele ser el
// mismo que saca reels de Instagram, y atarlas a un solo host obliga a elegir
// cual de las dos funciona peor. Con esto, cada una apunta a lo suyo y Pinterest
// puede quedarse sin ninguna, que es la que menos la necesita.
const API_DE = {
  tiktok: (process.env.TIKTOK_API || process.env.REDES_API || '').trim(),
  instagram: (process.env.INSTAGRAM_API || process.env.REDES_API || '').trim(),
  pinterest: (process.env.PINTEREST_API || process.env.REDES_API || '').trim(),
};
const TIEMPO_MAXIMO = 120000;
// Lo que WhatsApp acepta como video en un mensaje. Por encima, el envio falla o
// le llega roto a quien lo recibe: no es un limite nuestro que podamos subir.
const TOPE_WHATSAPP = 16 * 1024 * 1024;

// El id de cada plataforma es el mismo que usa el comando, para que un error no
// tenga que traducirse por el camino.
const PLATAFORMAS = {
  tiktok: {
    nombre: 'TikTok',
    // vm./vt. son los acortadores que reparte la propia app al compartir.
    rx: /https?:\/\/(?:[\w-]+\.)?(?:tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)\/\S+/i,
    // Fuera el formato con marca de agua, y al final un `/b` que lo acepta
    // igualmente si no hubiera ninguno limpio: mejor con marca que nada.
    formato: 'b[format_id!*=watermark][format_id!*=download_addr]/bv*+ba/b',
  },
  instagram: {
    nombre: 'Instagram',
    rx: /https?:\/\/(?:www\.)?(?:instagram\.com|instagr\.am)\/\S+/i,
    formato: 'b',
  },
  pinterest: {
    nombre: 'Pinterest',
    // pin.it es el acortador de la app.
    rx: /https?:\/\/(?:[\w-]+\.)?(?:pinterest\.[a-z.]+|pin\.it)\/\S+/i,
    formato: 'b',
  },
};

// El enlace puede venir suelto o dentro de una frase: se saca el primero que
// case con la plataforma pedida. Pedir `!tt` con un enlace de Instagram tiene
// que fallar diciendo eso, no bajar el de Instagram.
function enlaceDe(texto, plataforma) {
  const p = PLATAFORMAS[plataforma];
  if (!p) return null;
  const m = p.rx.exec(String(texto || ''));
  return m ? m[0].replace(/[)\]}.,;]+$/, '') : null;
}

// ¿A qué plataforma pertenece un enlace? Solo para decirle a quien se equivoca
// de comando cuál era el suyo.
function plataformaDe(texto) {
  for (const [k, p] of Object.entries(PLATAFORMAS)) if (p.rx.test(String(texto || ''))) return k;
  return null;
}

// ─── POR QUÉ NO SALIÓ, Y EN CRISTIANO ───────────────────────────────────────
//
// Medido el día del estreno, desde una VPS y con yt-dlp al día:
//
//   TikTok     «Unexpected response from webpage request»  → bloquea al servidor
//   Instagram  «Instagram sent an empty media response»    → pide sesión
//   Pinterest  «No video formats found»                    → es una FOTO
//
// Las dos primeras necesitan un tercero: bloquean a la IP de un datacenter, y
// eso no se arregla con código. La tercera NO, y ahí me equivoqué: ver la nota
// en `porPinterest`. Y el grupo no tiene por qué enterarse de eso
// —al que pega el enlace le basta con «no pude»—, pero el dueño sí, y no puede
// ser a base de bucear en el log. Aquí se guarda el último fallo de cada
// plataforma y `npm run estado` lo traduce.
// EN data/, CON SU RUTA ESCRITA, no colgando de TEMP_DIR. Lo puse como
// `path.join(TEMP_DIR, '..')` dando por hecho que temp vivia dentro de data, y
// no: TEMP_DIR es <repo>/temp, asi que el fichero acababa en la RAIZ del
// repositorio. Y ahi no es que quede feo: `npm run update` se para en seco con
// "hay cambios locales sin guardar" y no vuelve a desplegar nada.
const FALLOS = path.join(__dirname, '../../data/redesFallos.json');

// El mensaje de yt-dlp es un párrafo con enlaces a GitHub. Lo que necesita el
// dueño es qué poner en el .env.
function enCristiano(motivo) {
  const m = String(motivo || '');
  // LO DE LA API, PRIMERO. Cuando hay API el mensaje lleva los dos motivos
  // pegados, y el de yt-dlp habla de bloqueo: mirado en orden de palabras, un
  // «Free Api Limit» se traducia como «la web bloquea al servidor» y mandaba a
  // poner una API que ya estaba puesta.
  if (/no pude bajarlo/i.test(m)) return 'la API dio el enlace pero el vídeo no se deja bajar desde aquí';
  if (/la API dice/i.test(m)) return m.replace(/ · y yt-dlp:.*$/s, '').slice(0, 90);
  if (/la API no devolvió/i.test(m)) return 'la API no devolvió ningún enlace';
  if (/no se pudo ejecutar|ENOENT|not found/i.test(m)) return 'no encuentro yt-dlp';
  if (/cookies|logged-in|login|empty media response/i.test(m)) return 'pide sesión iniciada';
  if (/Unexpected response|Unsupported URL|403|captcha|blocked|not available/i.test(m)) return 'la web bloquea al servidor';
  if (/timeout/i.test(m)) return 'tardó demasiado';
  return m.slice(0, 80);
}

function apuntarFallo(plataforma, motivo) {
  try {
    let v = {};
    try { v = JSON.parse(fs.readFileSync(FALLOS, 'utf8')) || {}; } catch { /* aún no hay */ }
    v[plataforma] = { ts: Date.now(), motivo: enCristiano(motivo), porApi: !!API_DE[plataforma] };
    fs.writeFileSync(FALLOS, JSON.stringify(v));
  } catch { /* un cuaderno no puede tumbar un comando */ }
}

function ultimosFallos() {
  try { return JSON.parse(fs.readFileSync(FALLOS, 'utf8')) || {}; } catch { return {}; }
}

// ¿Hay por dónde? Sin API para esa plataforma y sin yt-dlp no hay nada que
// intentar: cobrar, esperar veinte segundos y devolver el aura es gastarle el
// tiempo a alguien para acabar donde ya se sabía.
function hayComoTraer(plataforma) {
  return !!API_DE[plataforma] || hayYtDlp();
}

// La extension REAL de una direccion, sin la interrogacion y sin el ancla. Los
// CDN de Instagram y TikTok cuelgan media docena de parametros detras del
// `.jpg`, asi que partir por el ultimo punto a secas devuelve basura.
function extensionDe(u) {
  const limpio = String(u || '').split('#')[0].split('?')[0];
  const ultimo = limpio.split('/').pop() || '';
  const punto = ultimo.lastIndexOf('.');
  return punto < 0 ? '' : ultimo.slice(punto + 1).toLowerCase();
}

// Un campo de la respuesta puede venir de cuatro formas y las cuatro son
// normales: la direccion a secas, un objeto que la lleva dentro, una lista de
// direcciones o una lista de objetos. Se aceptan todas y se devuelven absolutas.
function comoEnlaces(valor, base) {
  const fuera = [];
  const uno = (v) => {
    const dir = typeof v === 'string'
      ? v
      : (v?.url || v?.link || v?.download_url || v?.src || v?.play || null);
    if (typeof dir !== 'string' || !dir.trim()) return;
    if (/^https?:\/\//i.test(dir)) { fuera.push(dir); return; }
    try { fuera.push(new URL(dir, base).href); } catch { /* ruta imposible */ }
  };
  if (Array.isArray(valor)) for (const v of valor.slice(0, 20)) uno(v);
  else uno(valor);
  return fuera;
}

const esVideo = (ext) => ['mp4', 'mov', 'webm', 'mkv'].includes(ext);
const esImagen = (ext) => ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
const esEnlaceDeImagen = (u) => esImagen(extensionDe(u));
// Los codecs con los que ffmpeg describe una FOTO. Los pone en la misma linea
// de «Video:» que un vídeo de verdad, y por eso hay que nombrarlos: sin esta
// lista, un JPEG bajado con nombre de .mp4 pasa por vídeo.
const ESTATICOS = new Set(['mjpeg', 'png', 'webp', 'bmp', 'tiff']);

// ─── LAS PUBLICACIONES DE FOTOS: UN PASE DE IMÁGENES CON SU CANCIÓN ─────────
//
// En TikTok no todo lo que se comparte como «vídeo» es un vídeo. La modalidad
// de FOTOS —varias imágenes pasando sobre una canción— se pega con el mismo
// enlace, sale en la misma pestaña y la gente la manda igual. Pero detrás no
// hay pista de vídeo: el `play` de la API es un MP3.
//
// Hasta ahora eso acababa en «eso no es un vídeo: el enlace solo trae la
// canción». Es verdad y no sirve de nada: quien lo pegó ve una publicación
// normal y el bot le dice que no existe. El dueño lo llamó grave, y lo es —es
// una de cada cuatro publicaciones que se comparten.
//
// Lo que se hace es lo que hace TikTok: montar el pase. Las fotos una detrás de
// otra, encima la canción, y sale un MP4 normal que WhatsApp reproduce sin
// saber que nació de siete JPEG.
//
// DECISIONES, Y POR QUÉ:
//
//   · Se monta SOLO cuando no hay vídeo de verdad. Algunas APIs devuelven un
//     campo `images` con la PORTADA de un vídeo normal, y montar un pase con
//     eso sería cambiar un vídeo que funciona por un montaje. Así que el orden
//     es: primero los candidatos de vídeo; solo si todos resultan ser la
//     canción —o si no había ninguno— se mira si hay fotos.
//   · La canción que ya se bajó se REUTILIZA. Al descartar los candidatos por
//     ser audio, el MP3 ya está en disco: volver a pedirlo sería una petición
//     de más al CDN por nada.
//   · Cada foto dura lo que le toca para que la canción quepa entera, entre 2 y
//     5 segundos. Con `-shortest` acaba el que primero termine, así que ni se
//     corta la última foto a la mitad ni quedan diez segundos de negro.
//   · Lienzo por la PRIMERA foto: si es vertical, 1080x1920; si es apaisada,
//     1920x1080. Las demás se escalan dentro y se rellena el hueco. Un lienzo
//     fijo dejaba las apaisadas como una raya en medio de dos franjas negras.
//   · Y si se pasa de los 16 MB de WhatsApp, se vuelve a montar más pequeño una
//     vez. No hay tercera: a la segunda ya cabe cualquier pase razonable.
const MAX_FOTOS = 20;
const SEG_POR_FOTO_MIN = 2;
const SEG_POR_FOTO_MAX = 5;
const SEG_POR_FOTO_SIN_MUSICA = 2.5;
// Minuto y medio de pase eran once segundos de ffmpeg aqui y bastantes mas en
// el unico core de la VPS, con alguien esperando. Un minuto cubre de sobra
// cualquier publicacion de fotos real y deja el montaje en unos segundos.
const DURACION_TOPE = 60;

// De dónde saca cada servicio la lista de fotos. Son los nombres que usan los
// habituales; una entrada puede ser la dirección a secas o un objeto.
function imagenesDe(d) {
  const crudas = []
    .concat(d?.data?.images || [])
    .concat(d?.images || [])
    .concat(d?.result?.images || [])
    .concat(d?.data?.image_post_info?.images || [])
    .concat(d?.data?.image_data?.no_watermark_image_list || []);
  const vistas = new Set();
  const fuera = [];
  for (const cruda of crudas) {
    const dir = typeof cruda === 'string'
      ? cruda
      : cruda?.display_image?.url_list?.[0] || cruda?.url_list?.[0] || cruda?.url || cruda?.link || null;
    if (typeof dir !== 'string' || !/^https?:\/\//i.test(dir)) continue;
    if (vistas.has(dir)) continue;
    vistas.add(dir);
    fuera.push(dir);
    if (fuera.length >= MAX_FOTOS) break;
  }
  return fuera;
}

// La canción. `play` entra aquí a propósito: en una publicación de fotos ese
// campo NO es el vídeo, es el audio, y es justo el que ya se descartó arriba.
function musicaDe(d) {
  const posibles = [d?.data?.music, d?.music, d?.data?.music_info?.play,
    d?.music_info?.play, d?.data?.play, d?.play];
  for (const p of posibles) {
    if (typeof p === 'string' && /^https?:\/\//i.test(p)) return p;
  }
  return null;
}

// Duración y tamaño en una sola lectura, del propio ffmpeg: no hay ffprobe
// garantizado en la VPS y esto ya se hace así en analizarMedio.
function medirFichero(fichero) {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ['-hide_banner', '-i', fichero, '-t', '0', '-f', 'null', '-']);
    let texto = '';
    const matar = setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} }, 20000);
    proc.stderr?.on('data', (t) => { texto += t.toString(); });
    proc.on('error', () => { clearTimeout(matar); resolve({ segundos: 0, ancho: 0, alto: 0 }); });
    proc.on('close', () => {
      clearTimeout(matar);
      const d = /Duration: (\d+):(\d+):(\d+\.?\d*)/.exec(texto);
      const t = /Stream #\d+:\d+.*: Video:.*?, (\d+)x(\d+)/.exec(texto);
      resolve({
        segundos: d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : 0,
        ancho: t ? Number(t[1]) : 0,
        alto: t ? Number(t[2]) : 0,
      });
    });
  });
}

// EL LIENZO SALE DE LA PRIMERA FOTO, no de una proporcion fija.
//
// Primero fue 9:16 siempre. Va bien con TikTok, que es vertical entero, y mal
// con Instagram, que publica en 4:5: un carrusel de 1080x1350 salia metido en
// 1080x1920 con dos franjas negras que ocupaban un cuarto de la pantalla.
//
// `montarPase` mide la primera foto y pasa aqui el lienzo ya decidido; esta
// funcion solo se encarga de que quepa y de que las medidas sean pares, que
// yuv420p no admite impares y el encoder revienta.
//
// ─── Y POR QUE NO SE USA EL DEMUXER `concat` ────────────────────────────────
//
// Se usaba, y ESE era el «se salta algunas imagenes» que se veia en el grupo.
//
// El demuxer `concat` da por hecho que todas las entradas tienen el mismo
// tamaño: es un pegado a nivel de flujo, no de imagen. Cuando la segunda foto
// mide otra cosa —y en un carrusel de Instagram eso es lo normal, cada una se
// sube como se subio— deja de aceptarlas y se queda con la primera.
//
// Medido, cinco fotos de cinco tamaños distintos: el pase salia de 2,54 s en
// vez de 12,5. O sea, una foto de cinco. No fallaba, no avisaba, y desde fuera
// parecia que «a veces» se saltaba alguna.
//
// Con `filter_complex` cada foto entra como su PROPIA entrada, se escala y se
// rellena hasta el lienzo por separado, y solo despues se pegan. Los tamaños
// distintos dejan de importar porque cuando llegan al pegado ya son iguales.
function montarConFfmpeg(fotos, musica, porFoto, ancho, alto, crf, salida) {
  const par = (n) => (n % 2 ? n + 1 : n);
  const w = par(Math.max(2, ancho));
  const h = par(Math.max(2, alto));
  const dur = porFoto.toFixed(3);

  const args = ['-hide_banner', '-loglevel', 'error', '-y'];
  for (const foto of fotos) args.push('-loop', '1', '-t', dur, '-i', foto);
  if (musica) args.push('-i', musica);

  const encaja = `scale=${w}:${h}:force_original_aspect_ratio=decrease,`
    + `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=24`;
  const pasos = fotos.map((_, i) => `[${i}:v]${encaja}[v${i}]`);
  pasos.push(`${fotos.map((_, i) => `[v${i}]`).join('')}concat=n=${fotos.length}:v=1:a=0[v]`);

  args.push('-filter_complex', pasos.join(';'), '-map', '[v]');
  if (musica) args.push('-map', `${fotos.length}:a`, '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-shortest');
  else args.push('-an');
  args.push(
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf),
    // Baseline y nivel 4.0: lo que abre cualquier telefono, que es el mismo
    // criterio por el que se descarta el HEVC unas lineas mas arriba.
    '-profile:v', 'baseline', '-level', '4.0', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', salida,
  );

  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, args);
    let error = '';
    const matar = setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} }, 180000);
    proc.stderr?.on('data', (t) => { error += t.toString(); });
    proc.on('error', () => { clearTimeout(matar); resolve(null); });
    proc.on('close', async (codigo) => {
      clearTimeout(matar);
      if (codigo !== 0) {
        logger.warn(`redes: no pude montar el pase de fotos: ${error.trim().split('\n').pop()?.slice(0, 120)}`);
        await fs.remove(salida).catch(() => {});
        return resolve(null);
      }
      const { size } = await fs.stat(salida).catch(() => ({ size: 0 }));
      if (size < 1024) { await fs.remove(salida).catch(() => {}); return resolve(null); }
      resolve(salida);
    });
  });
}

async function montarPase(fotos, musicaUrl, audioYaBajado) {
  if (!fotos.length) return null;
  const basura = [];
  const limpiar = async () => { for (const f of basura) await fs.remove(f).catch(() => {}); };

  try {
    // Las fotos, una a una y perdonando las que fallen: que el CDN tire una de
    // siete no puede costar la publicación entera.
    const enDisco = [];
    for (let i = 0; i < fotos.length; i++) {
      const ext = (String(fotos[i]).split('?')[0].split('.').pop() || '').toLowerCase();
      const destino = path.join(TEMP_DIR, `pase_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}.${esImagen(ext) ? ext : 'jpg'}`);
      try {
        await downloadUrlToFile(fotos[i], destino);
        const { size } = await fs.stat(destino);
        if (size < 512) throw new Error('vacía');
        basura.push(destino);
        enDisco.push(destino);
      } catch {
        await fs.remove(destino).catch(() => {});
      }
    }
    if (!enDisco.length) return null;

    // La canción: la que ya se bajó al descartar los candidatos, o la que diga
    // la API. Si no hay ninguna, el pase sale mudo y sigue siendo la
    // publicación — muda es mejor que nada.
    let musica = null;
    if (audioYaBajado && await fs.pathExists(audioYaBajado)) {
      musica = audioYaBajado;
    } else if (musicaUrl) {
      const destino = path.join(TEMP_DIR, `pase_${Date.now()}_son_${Math.random().toString(36).slice(2)}.mp3`);
      try {
        await downloadUrlToFile(musicaUrl, destino);
        const { size } = await fs.stat(destino);
        if (size < 1024) throw new Error('vacía');
        basura.push(destino);
        musica = destino;
      } catch {
        await fs.remove(destino).catch(() => {});
      }
    }

    // UNA SOLA FOTO Y SIN CANCIÓN NO ES UN PASE: es una foto. Montar un MP4 de
    // dos segundos con una imagen quieta es peor que mandar la imagen.
    if (enDisco.length === 1 && !musica) {
      const sola = enDisco[0];
      basura.splice(basura.indexOf(sola), 1);
      await limpiar();
      return sola;
    }

    await ffmpegSemaphore.acquire();
    try {
      // El lienzo: la proporcion de la primera foto, con el lado largo a 1920
      // como mucho. Si no se pudo medir, vertical 9:16, que es el caso comun.
      const primera = await medirFichero(enDisco[0]);
      const lienzo = (largo) => {
        if (!primera.ancho || !primera.alto) {
          return { ancho: Math.round(largo * 9 / 16), alto: largo };
        }
        const escala = Math.min(1, largo / Math.max(primera.ancho, primera.alto));
        return { ancho: Math.round(primera.ancho * escala), alto: Math.round(primera.alto * escala) };
      };

      let porFoto = SEG_POR_FOTO_SIN_MUSICA;
      if (musica) {
        const son = await medirFichero(musica);
        if (son.segundos > 0) {
          porFoto = Math.min(SEG_POR_FOTO_MAX, Math.max(SEG_POR_FOTO_MIN, son.segundos / enDisco.length));
        }
      }
      // El tope está para el caso de veinte fotos a cinco segundos: un minuto y
      // cuarenta de pase que nadie va a ver y que no cabría en 16 MB.
      if (porFoto * enDisco.length > DURACION_TOPE) porFoto = DURACION_TOPE / enDisco.length;

      const salida = path.join(TEMP_DIR, `red_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);
      const grande = lienzo(1920);
      let hecho = await montarConFfmpeg(enDisco, musica, porFoto, grande.ancho, grande.alto, 26, salida);
      if (!hecho) return null;

      const { size } = await fs.stat(hecho).catch(() => ({ size: 0 }));
      if (size > TOPE_WHATSAPP) {
        logger.info(`redes: el pase salió de ${Math.round(size / 1048576)} MB; lo monto más pequeño`);
        await fs.remove(hecho).catch(() => {});
        const segundo = path.join(TEMP_DIR, `red_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);
        const chico = lienzo(1280);
        hecho = await montarConFfmpeg(enDisco, musica, porFoto, chico.ancho, chico.alto, 30, segundo);
        if (!hecho) return null;
      }
      await limpiar();
      return hecho;
    } finally {
      ffmpegSemaphore.release();
    }
  } catch (e) {
    logger.warn(`redes: el pase de fotos falló (${e.message})`);
    await limpiar();
    return null;
  }
}

// ── Vía 1: la API del .env ──────────────────────────────────────────────────
async function porApi(url, plataforma) {
  const API = API_DE[plataforma];
  if (!API) return null;
  const destino = API.includes('{url}')
    ? API.replace('{url}', encodeURIComponent(url))
    : `${API}${API.includes('?') ? '&' : '?'}url=${encodeURIComponent(url)}`;

  // UN REINTENTO SI LA API DICE QUE VAS MUY RAPIDO. Las gratuitas suelen
  // limitar a una peticion por segundo, y con dos personas pegando enlaces a la
  // vez eso pasa solo. Rendirse ahi mandaba el comando a yt-dlp —que si esta
  // bloqueado— y el fallo acababa contado como «la web bloquea», que no era.
  let data = null;
  for (let intento = 0; intento < 2; intento++) {
    ({ data } = await axios.get(destino, { timeout: 20000 }));
    const dice = `${data?.msg || data?.message || ''}`;
    if (!/limit|rate|too many|slow down/i.test(dice)) break;
    if (intento === 0) await new Promise((r) => setTimeout(r, 1300));
  }

  // El servicio contesta 200 y dentro dice que no. Sin esto, un «Free Api
  // Limit» se leia como «la API no trae enlace» y se perdia el motivo.
  if (data && (data.code === -1 || data.status === 'error') && (data.msg || data.message)) {
    throw new Error(`la API dice: ${String(data.msg || data.message).slice(0, 90)}`);
  }

  // Cada servicio llama de otra forma al enlace directo. `hdplay` va antes que
  // `play` porque es el mismo video sin marca de agua y en mejor calidad;
  // `wmplay` NO entra en la lista: ese es el que la lleva.
  // EN ORDEN DE CALIDAD. `hdplay` primero, que es el de 1080; `play` despues.
  // Cada servicio usa sus nombres, asi que se aceptan los habituales. `wmplay`
  // NO esta: ese es el que lleva la marca de agua.
  const d = data || {};
  // TODO LO QUE PUEDA SER UN MEDIO, Y DESPUES SE SEPARA.
  //
  // Esta lista solo miraba CADENAS. Y una publicacion de Instagram que no es un
  // reel no trae ningun campo de video: trae la lista de medios del post, que
  // llega como ARRAY —`url: [{url, type}]`, `medias: [...]`, `media: [...]`,
  // segun el servicio— y un array no pasa el `typeof x === 'string'`. O sea que
  // la lista salia vacia, porApi devolvia null sin motivo, el fallo lo acababa
  // dando yt-dlp (que Instagram bloquea desde un datacenter) y en el grupo salia
  // «no he podido traerlo de Instagram» con la API contestando perfectamente.
  //
  // Ahora se recoge todo —cadena, objeto `{url}` o lista de cualquiera de los
  // dos— y se separa por la extension: lo que es foto va al pase, lo demas se
  // prueba como video. El orden de la lista se respeta, que es lo que pone el
  // `hdplay` de TikTok por delante del `play`.
  const bruto = [d.data?.hdplay, d.hdplay, d.url, d.link, d.video, d.download,
    d.data?.play, d.data?.url, d.result?.url,
    d.medias, d.data?.medias, d.media, d.data?.media, d.result?.medias];
  const todos = [];
  for (const campo of bruto) {
    for (const enlace of comoEnlaces(campo, destino)) {
      if (!todos.includes(enlace)) todos.push(enlace);
    }
  }
  const candidatos = todos.filter((u) => !esEnlaceDeImagen(u));

  // Las fotos se miran AQUI pero se usan al final: ver la nota de montarPase.
  // Las que declara la API y, ademas, las que hayan salido de la lista de
  // medios: en un post de fotos de Instagram esas son TODAS las que hay.
  const fotos = [];
  for (const f of [...imagenesDe(d), ...todos.filter(esEnlaceDeImagen)]) {
    if (!fotos.includes(f)) fotos.push(f);
  }
  if (!candidatos.length) {
    return fotos.length ? montarPase(fotos, musicaDe(d), null) : null;
  }

  let ultimoError = null;
  let soloAudio = 0;
  // La canción de una posible publicación de fotos, si aparece por el camino.
  let cancion = null;
  // Y la foto que llegue disfrazada de vídeo, por lo mismo.
  let fotoSuelta = null;
  const tirarCancion = async () => {
    if (!cancion) return;
    const f = cancion; cancion = null;
    await fs.remove(f).catch(() => {});
  };
  for (let i = 0; i < candidatos.length; i++) {
    const enlace = candidatos[i];
    const ext = extensionDe(enlace) || 'mp4';
    const fichero = path.join(TEMP_DIR, `red_${Date.now()}_${Math.random().toString(36).slice(2)}.${esImagen(ext) ? ext : 'mp4'}`);
    try {
      await downloadUrlToFile(enlace, fichero);
    } catch (e) {
      await fs.remove(fichero).catch(() => {});
      ultimoError = e;
      continue;
    }
    if (!esImagen(ext)) {
      const medio = await analizarMedio(fichero);
      // SIN PISTA DE VIDEO NO HAY VIDEO, y esto se comprueba SIEMPRE, tambien
      // en el ultimo candidato. Antes el ultimo se aceptaba a ciegas, y por ahi
      // se colo un MP3 con nombre de mp4.
      // UNA FOTO CON NOMBRE DE VIDEO. Pasa cuando la direccion no lleva
      // extension —`…/dl?id=123`, que es como entregan varios servicios— y
      // detras hay un JPEG. ffmpeg lo ve como «Video: mjpeg», asi que la guarda
      // de arriba lo daba por bueno y salia un .mp4 que era una foto: WhatsApp
      // contesta que el video esta mal y nadie entiende por que.
      if (medio.probado && ESTATICOS.has(medio.video)) {
        logger.info(`redes: ese enlace era una foto (${medio.video}), no un vídeo; la guardo por si el post es de fotos`);
        const comoFoto = fichero.replace(/\.mp4$/i, '.jpg');
        await fs.move(fichero, comoFoto, { overwrite: true }).catch(() => {});
        if (!fotoSuelta && await fs.pathExists(comoFoto)) fotoSuelta = comoFoto;
        else await fs.remove(comoFoto).catch(() => {});
        continue;
      }
      if (medio.probado && !medio.video) {
        soloAudio++;
        logger.info('redes: ese enlace no trae vídeo, solo audio; pruebo el siguiente');
        // La primera se GUARDA: si esto acaba siendo una publicación de fotos,
        // esa es la canción del pase y ya está bajada. Volver a pedírsela al
        // CDN sería una petición de más para traer los mismos bytes.
        if (!cancion && medio.audio) cancion = fichero;
        else await fs.remove(fichero).catch(() => {});
        continue;
      }
      // El formato que no se reproduce en todos los telefonos solo se descarta
      // si queda alguna opcion detras: mejor uno dudoso que ninguno.
      if (medio.probado && !REPRODUCE_BIEN(medio.video) && i < candidatos.length - 1) {
        logger.info(`redes: el mejor venia en ${medio.video}, que no se reproduce en todos los telefonos; voy al siguiente`);
        await fs.remove(fichero).catch(() => {});
        continue;
      }
    }
    // Se encontró vídeo de verdad: lo que se había guardado por si acaso ya no
    // hace falta.
    await tirarCancion();
    if (fotoSuelta) { await fs.remove(fotoSuelta).catch(() => {}); fotoSuelta = null; }
    return fichero;
  }
  // SI TODOS LOS ENLACES ERAN AUDIO, el motivo no es que la API fallara: es que
  // eso no es un video. Dicho de la otra forma, quien lo pego se queda pensando
  // que el bot esta roto.
  // NINGUN CANDIDATO ERA UN VIDEO. Antes de darse por vencido, el post puede
  // ser de fotos: las que declare la API, o la que haya llegado disfrazada de
  // vídeo. Este es el caso de Instagram, donde un post normal no tiene ningún
  // campo de vídeo y todo lo que hay son imágenes.
  if (fotos.length) {
    const pase = await montarPase(fotos, musicaDe(d), cancion);
    await tirarCancion();
    if (pase) {
      if (fotoSuelta) await fs.remove(fotoSuelta).catch(() => {});
      return pase;
    }
  }
  await tirarCancion();
  if (fotoSuelta) return fotoSuelta;
  if (soloAudio && soloAudio === candidatos.length) {
    // AQUI ESTABA EL «no es un vídeo». Y era verdad, pero quien pegó el enlace
    // ve una publicación normal en su TikTok. El error solo queda para cuando
    // de verdad no hay ni vídeo ni fotos.
    throw new Error('eso no es un vídeo: el enlace solo trae la canción (suele pasar con las publicaciones de fotos)');
  }
  if (ultimoError) {
    // LA API DIO EL ENLACE Y LO QUE FALLO FUE BAJARLO, que son dos problemas
    // distintos: el primero se arregla cambiando de servicio y el segundo no
    // —los bytes vienen del CDN de la plataforma a NUESTRA maquina— asi que
    // confundirlos manda a cambiar lo que funciona.
    throw new Error(`la API dio el enlace pero no pude bajarlo: ${ultimoError.message}`);
  }
  return null;
}

// ─── EL AUDIO, QUE LLEGABA CASI MUDO ────────────────────────────────────────
//
// El dueño: «los vídeos salen con volumen muy bajo». Medido sobre uno real:
//
//   antes   mean -24.2 dB   ·   audio HE-AACv2 a 32 kb/s
//   después mean -15.3 dB   ·   audio AAC-LC  a 128 kb/s
//
// Son dos problemas a la vez, y por eso se notaba tanto:
//
//   1. VIENE BAJO DE ORIGEN. Una media de -24 dB es muy poco; lo normal en
//      contenido nivelado ronda -16. Y queda margen: el pico estaba en -10.9 dB,
//      o sea once decibelios sin usar hasta el techo.
//   2. VIENE EN HE-AACv2, que es AAC comprimido a lo bestia con estéreo
//      paramétrico. Muchos reproductores no lo decodifican entero y se quedan
//      con el núcleo, que suena más flojo y más apagado todavía.
//
// Se arregla lo mismo con las dos: reencodar SOLO el audio a AAC normal y
// nivelarlo. El vídeo se copia tal cual (`-c:v copy`), o sea que no se toca ni
// un fotograma y el coste es el de una pista de audio de veinte segundos: 1,4 s
// aquí, unos pocos en la VPS.
//
// SE NIVELA, NO SE SUBE EL VOLUMEN A PELO. `volume=+9dB` revienta el pico de un
// vídeo que ya venga alto. `loudnorm` es la norma EBU R128: apunta a una
// sonoridad concreta y trae limitador, así que sube lo flojo, baja lo que se
// pase y nada satura. El objetivo -14 LUFS es el que usan las plataformas de
// streaming.
//
// Y SI FALLA, SE MANDA EL ORIGINAL. Un vídeo bajo de volumen es mucho mejor que
// ningún vídeo: esto es una mejora, no un requisito.
// SE MIDE Y SE SUBE LO JUSTO. Nada de filtros dinamicos.
//
// La primera version usaba `loudnorm` (norma EBU R128) y, para los clips
// cortos, `dynaudnorm`. Sonaba PEOR que el original, y el dueño lo noto a la
// primera. Los dos son filtros DINAMICOS: no suben el volumen, comprimen el
// rango. Sobre musica —que es el noventa por ciento de TikTok— eso se oye como
// bombeo, y sobre material ya comprimido como el de estas webs, peor todavia.
// Y `loudnorm` en pasada unica encima necesita varios segundos para medir: por
// debajo devuelve basura sin avisar (un clip de 2 s salia a -50 dB).
//
// Lo que hace falta aqui no es comprimir: es SUBIR. El audio de TikTok viene
// bajo pero intacto, con el pico a -10.9 dB, o sea con once decibelios de sitio
// libre hasta el techo. Se mide el pico, se sube justo hasta dejar 1 dB de
// margen, y ya. Ganancia pura: ni comprime, ni bombea, ni toca la dinamica.
//
//   medir    58 ms   (solo el audio, el video ni se decodifica)
//   aplicar 374 ms   (contra 1400 ms de loudnorm)
//   media   -24.2 dB -> -14.3 dB   ·   pico -10.9 dB -> -1.3 dB
//
// Y funciona con CUALQUIER duracion, asi que desaparece el caso raro de los
// clips cortos y el ffprobe que hacia falta para detectarlos.
const MARGEN_DB = 1;       // lo que se deja libre hasta el techo
const GANANCIA_MAXIMA = 20; // en un clip casi mudo, subir mas es subir el ruido

// LA SONORIDAD, QUE ES LO QUE OYE EL OIDO, y no el pico.
//
// El dueño: «suena mas bajo en WhatsApp que en TikTok». Medido, tenia razon y la
// explicacion no es el fichero:
//
//   reel de Instagram  -14.5 LUFS   el bot NO lo toca, ya venia a nivel
//   TikTok             -23.4 LUFS   el bot le sube 9.9 y lo deja en -13.5
//
// Los dos acaban donde emiten Spotify y YouTube. Lo que pasa es que la app de
// TikTok normaliza al reproducir y WhatsApp no: el fichero es el mismo, quien
// cambia es el reproductor.
//
// Mirar solo el pico tiene un agujero: un audio con el pico ya arriba pero
// flojo de media no recibe nada, por mucho que suene bajo. Asi que se mira
// tambien la sonoridad y se coge la ganancia MENOR de las dos. Con EXTRA en 0
// —lo de serie— el resultado es identico al de antes, porque el pico manda
// siempre; lo que anyade es no pasarse cuando el pico engaña.
const OBJETIVO_LUFS = -11;

// SUBIR MAS QUE ESO YA ES COMPRIMIR, y comprimir es lo que sonaba mal. Aqui se
// dice CUANTOS decibelios de compresion se aceptan, y de serie son cero: el
// audio sale con ganancia pura y nada mas. Medido, tres decibelios de mas
// cuestan alrededor de uno de rango dinamico, que es poco y se nota bastante.
// Es decision del dueño, asi que es un numero del .env y no una constante.
const EXTRA_DB = (() => {
  const n = Number(String(process.env.REDES_AUDIO_EXTRA || '0').replace(',', '.'));
  return Number.isFinite(n) ? Math.max(0, Math.min(6, n)) : 0;
})();

// ─── EL MEJOR VÍDEO QUE WHATSAPP SEPA REPRODUCIR ────────────────────────────
//
// El dueño: «se deben enviar lo más HD posible». Y sí, hay HD: en TikTok el
// mismo enlace tiene dos vídeos, y medidos uno al lado del otro no se parecen:
//
//   normal  576x1024   H.264   1,1 MB
//   HD     1080x1920   HEVC    1,5 MB
//
// Pero el HD viene en HEVC (H.265), y eso NO es intercambiable: WhatsApp
// reproduce H.264 en todas partes y el HEVC se le atraganta según el teléfono.
// Un vídeo de 1080 que a media docena del grupo no se les abre es peor que uno
// de 576 que ve todo el mundo.
//
// Así que se pide el mejor, se mira QUÉ llegó, y si es HEVC se coge el
// siguiente. Recodificar no es opción: pasar 1080x1920 a H.264 en el único core
// de la VPS son decenas de segundos con alguien esperando.
//
// Y SE MIRA TAMBIÉN QUE HAYA VÍDEO, que es el caso que se escapó. Una
// publicación de FOTOS de TikTok tiene enlace de vídeo igual, pero lo que hay
// detrás es la canción: un MP3 de 210 KB. El bot lo guardaba con extensión
// `.mp4` y lo mandaba tan tranquilo, y WhatsApp contestaba «something is wrong
// with the video file» — con razón, porque no era un vídeo.
function analizarMedio(fichero) {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ['-hide_banner', '-i', fichero, '-t', '0', '-f', 'null', '-']);
    let texto = '';
    const matar = setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} }, 20000);
    proc.stderr?.on('data', (d) => { texto += d.toString(); });
    proc.on('error', () => { clearTimeout(matar); resolve({ probado: false, video: null, audio: false }); });
    proc.on('close', () => {
      clearTimeout(matar);
      // Sin ninguna linea de Stream no es que no haya video: es que ffmpeg no
      // pudo leer el fichero, y eso es otra cosa.
      const probado = /Stream #\d+:\d+/.test(texto);
      const m = /Stream #\d+:\d+.*: Video: (\w+)/.exec(texto);
      resolve({ probado, video: m ? m[1].toLowerCase() : null, audio: /: Audio: /.test(texto) });
    });
  });
}

//
// Y SE PUEDE DECIDIR LO CONTRARIO, porque es una decision del dueño y no del
// codigo: si en el grupo todos llevan telefonos que abren HEVC, prefiere el de
// 1080. Con REDES_HEVC=1 en el .env se manda el mejor y punto.
const ACEPTA_HEVC = /^(1|si|sí|true|yes)$/i.test(String(process.env.REDES_HEVC || '').trim());
const REPRODUCE_BIEN = (codec) => ACEPTA_HEVC || !codec || !['hevc', 'h265', 'av1', 'vp9'].includes(codec);

// Pico Y sonoridad, del propio ffmpeg y en UNA pasada. `-vn` es lo que lo hace
// barato: sin eso decodifica el video entero para no mirarlo.
function medirAudio(fichero) {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ['-hide_banner', '-i', fichero, '-vn',
      '-af', `loudnorm=I=${OBJETIVO_LUFS}:TP=-${MARGEN_DB}:print_format=json`, '-f', 'null', '-']);
    let texto = '';
    const matar = setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} }, 60000);
    proc.stderr?.on('data', (d) => { texto += d.toString(); });
    proc.on('error', () => { clearTimeout(matar); resolve(null); });
    proc.on('close', () => {
      clearTimeout(matar);
      const m = /\{[^{}]*"input_i"[^{}]*\}/s.exec(texto);
      if (!m) return resolve(null);
      try {
        const d = JSON.parse(m[0]);
        const lufs = Number(d.input_i);
        const pico = Number(d.input_tp);
        // Un silencio absoluto sale como -inf y no hay nada que subir.
        if (!Number.isFinite(lufs) || !Number.isFinite(pico)) return resolve(null);
        resolve({ lufs, pico });
      } catch { resolve(null); }
    });
  });
}

function subirAudio(entrada, ganancia, conLimitador = false) {
  const salida = entrada.replace(/\.mp4$/i, '') + `_n${Math.random().toString(36).slice(2, 6)}.mp4`;
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', entrada,
      '-c:v', 'copy',
      // El limitador SOLO cuando se pide subir por encima de lo que aguanta el
      // pico. Sin el, eso saldria distorsionado; con el, se comen los picos y
      // nada mas. Si EXTRA_DB es 0 —lo de serie— esto no se usa nunca.
      //
      // `level=disabled` NO es opcional. Por defecto `alimiter` RENORMALIZA la
      // salida hasta su propio techo, o sea que despues de recortar vuelve a
      // subir: medido, dejaba el pico real en +0.8 dB, que es distorsion. Con
      // esa opcion se queda en -0.1 y el rango dinamico apenas se mueve.
      '-af', conLimitador ? `volume=${ganancia}dB,alimiter=limit=0.85:level=disabled:attack=5:release=250` : `volume=${ganancia}dB`,
      // 128k: la fuente viene en HE-AACv2 a 32-64 kb/s —un formato que muchos
      // reproductores decodifican a medias y suena apagado— asi que pasarla a
      // AAC normal a 128 es transparente de sobra. Estaba en 192 y engordaba el
      // fichero el doble sin que nadie oyera la diferencia, y el tamaño aqui
      // importa: el tope de WhatsApp son 16 MB.
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
      '-movflags', '+faststart',
      salida,
    ]);
    let error = '';
    const matar = setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} }, 60000);
    proc.stderr?.on('data', (d) => { error += d.toString(); });
    proc.on('error', () => { clearTimeout(matar); resolve(null); });
    proc.on('close', async (codigo) => {
      clearTimeout(matar);
      if (codigo !== 0) {
        if (error && !/does not contain any stream/i.test(error)) {
          logger.warn(`redes: no pude subir el audio: ${error.trim().split('\n').pop()?.slice(0, 90)}`);
        }
        await fs.remove(salida).catch(() => {});
        return resolve(null);
      }
      const { size } = await fs.stat(salida).catch(() => ({ size: 0 }));
      if (size < 1024) { await fs.remove(salida).catch(() => {}); return resolve(null); }
      resolve(salida);
    });
  });
}

// El semáforo es el MISMO que usan los stickers, *!toimg* y *!ttp*, y en la VPS
// tiene una sola plaza porque tiene un solo core. Se coge aquí para que nivelar
// el audio de un TikTok no se ejecute encima del sticker de otro.
async function conAudioNivelado(fichero) {
  if (!/\.mp4$/i.test(fichero)) return fichero;
  await ffmpegSemaphore.acquire();
  try {
    const medida = await medirAudio(fichero);
    // Sin pista de audio no hay nada que medir ni que hacer.
    if (!medida) return fichero;
    // Lo que pide la sonoridad, y lo que deja el pico sin distorsionar.
    const porSonoridad = OBJETIVO_LUFS - medida.lufs;
    const porPico = -MARGEN_DB - medida.pico;
    const ganancia = Math.min(GANANCIA_MAXIMA, porSonoridad, porPico + EXTRA_DB);
    // Medio decibelio no lo oye nadie y cuesta un reencodado.
    if (ganancia < 0.5) return fichero;
    const nuevo = await subirAudio(fichero, Math.round(ganancia * 10) / 10, ganancia > porPico);
    if (!nuevo) return fichero;
    // SUBIR EL AUDIO ENGORDA EL FICHERO, y el tope de WhatsApp se miro ANTES de
    // hacerlo. Un video de 15,8 MB pasaba el control y salia de aqui con 16,5:
    // justo el envio que no llega, y por una mejora de sonido. Si se pasa, se
    // queda el original, que cabia.
    const { size } = await fs.stat(nuevo).catch(() => ({ size: 0 }));
    if (size > TOPE_WHATSAPP) {
      logger.info('redes: el audio subido se pasaba del tope de WhatsApp; mando el original');
      await fs.remove(nuevo).catch(() => {});
      return fichero;
    }
    await fs.remove(fichero).catch(() => {});
    return nuevo;
  } catch {
    return fichero;
  } finally {
    ffmpegSemaphore.release();
  }
}

// ── Vía propia de Pinterest: las etiquetas de la página ─────────────────────
//
// ESTO DESMIENTE LO QUE YO MISMO ESCRIBI AQUI. Di por hecho que Pinterest
// bloqueaba al servidor porque un `pin.it` acababa en la portada. Estaba mal por
// dos motivos, y los dos se ven probando con un enlace vivo:
//
//   1. Aquel enlace estaba muerto. Uno bueno redirige perfectamente al pin, y
//      yt-dlp se baja su JSON sin que nadie le cierre la puerta.
//   2. El error de verdad era otro: `No video formats found`. El extractor de
//      Pinterest de yt-dlp solo entiende pines de VIDEO, y la mayoria de los
//      pines son FOTOS. Con una foto no falla la red: falla el extractor.
//
// La pagina del pin trae la direccion del medio en sus propias etiquetas
// `og:`, que es lo que usa cualquier chat para pintar la previsualizacion.
// Funciona para foto y para video, no necesita API ni login, y es lo que
// deberia haber mirado desde el principio.
const UA_MOVIL = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';

// ─── !pin CON UN NOMBRE, NO CON UN ENLACE ───────────────────────────────────
//
// Lo pidio el dueño despues de que una del grupo, que usa otros bots, dijera:
// «el comando pin es para que pongas pin y el nombre de lo que quieras buscar,
// no el enlace». Y tiene razon en que es lo natural: a Pinterest se va a buscar
// cosas, no a abrir un pin concreto que ya tienes delante.
//
// El enlace SIGUE funcionando. Son dos usos del mismo comando y se distinguen
// solos: si lo que viene detras es una direccion de Pinterest, se trae ese pin;
// si es texto, se busca.
//
// COMO SE BUSCA, Y POR QUE ASI. La via oficial pide credenciales y su endpoint
// interno contesta 403 desde un servidor (probado). La pagina de busqueda
// normal, en cambio, contesta 200 con las imagenes dentro del HTML: setenta y
// cinco direcciones utiles en una sola peticion, sin clave y sin sesion. Es la
// misma via que ya usa `porPinterest` para un pin suelto, con la misma cabecera
// de movil.
//
// LA MISMA IMAGEN SALE HASTA EN CUATRO TAMAÑOS —originals, 736x, 564x, 474x—
// asi que se agrupan por su huella (el nombre del fichero, que es el mismo en
// todas) y de cada pin se guarda LA MEJOR que aparezca. Sin agrupar, una
// busqueda de cuarenta pines parecia de ciento sesenta y la mitad de las veces
// salia la miniatura.
//
// Las fotos de perfil quedan fuera solas: las suyas llevan `_RS` en el tamaño
// (`75x75_RS`) y el patron no lo acepta.
// Las dos direcciones van en un objeto y no en dos constantes sueltas para que
// el validador pueda apuntarlas a un servidor de mentira y comprobar de cual de
// las dos sale el resultado. Sin eso, el arreglo entero —pedirle los resultados
// al buscador en vez de leer la pagina— se puede deshacer sin que nada falle.
const PIN = {
  pagina: 'https://www.pinterest.com/search/pins/?rs=typed&q=',
  recurso: 'https://www.pinterest.com/resource/BaseSearchResource/get/',
};
// Para el buscador de verdad hace falta parecer un navegador de escritorio: con
// el de movil, Pinterest sirve la pagina ligera y su endpoint contesta 403.
const UA_ESCRITORIO = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX_RESULTADOS = 24;
const RX_PIN = /https:\/\/i\.pinimg\.com\/(originals|\d{2,4}x\d{0,4})\/((?:[0-9a-f]{2}\/){3}[0-9a-f]{16,})\.(jpg|jpeg|png|webp)/gi;
// EL TAMAÑO SE PIDE, NO SE ACEPTA EL QUE VENGA.
//
// La primera version se quedaba con la mejor direccion que apareciera en el
// HTML, y eso daba fotos de 60x60: en la pagina de resultados muchos pines solo
// salen como miniatura. Probado con tres busquedas, dos devolvieron 2 KB.
//
// Pero el tamaño es parte de la RUTA y el resto no cambia, asi que la miniatura
// de un pin dice tambien donde esta el original. Comprobado con el mismo pin:
//
//   originals  141.639 bytes        564x   44.397
//   736x        68.286              474x   33.328
//   60x60        1.620
//
// Asi que de cada pin se guarda su huella y se prueban los tamaños de mayor a
// menor. El primero que baje, ese se manda.
const CALIDAD = ['originals', '736x', '564x', '474x'];
const MAX_PINES = 40;
const INTENTOS_PIN = 6;
const LARGO_BUSQUEDA = 80;

// Palabras que no distinguen una búsqueda de otra. Si entran al marcador,
// «sticker racista Argentina» y «meme de la Argentina» empatan en «de» y
// «la», y el pin genérico sube sin haber dicho sticker ni racista.
const STOP_BUSQUEDA = new Set([
  'de', 'la', 'el', 'los', 'las', 'un', 'una', 'uno', 'unos', 'unas',
  'y', 'o', 'del', 'al', 'en', 'con', 'por', 'para', 'the', 'and', 'or',
  'to', 'in', 'on', 'for', 'of', 'an', 'que', 'qué', 'como', 'más', 'mas',
  'muy', 'sin', 'esto', 'esta', 'este', 'ese', 'esa', 'eso', 'lo',
]);
// Lo que escribe el grupo no es lo que escribe Pinterest en el pin: «gatos»
// sale como «cat», «sticker» como «pegatina», «racista» como «racism». Sin
// esto el marcador mira otra lengua y tira el resultado bueno.
const SINONIMOS = {
  gato: ['gatos', 'gatito', 'gatitos', 'michi', 'michis', 'cat', 'cats', 'kitten', 'kitty'],
  gatos: ['gato', 'gatito', 'gatitos', 'cat', 'cats', 'kitten'],
  sticker: ['stickers', 'stiker', 'stikers', 'pegatina', 'pegatinas', 'calco', 'calcos'],
  stickers: ['sticker', 'stiker', 'pegatina', 'pegatinas', 'calco'],
  racista: ['racist', 'racismo', 'racism'],
  racist: ['racista', 'racismo', 'racism'],
  meme: ['memes', 'humor'],
  memes: ['meme'],
  dibujo: ['dibujos', 'drawing', 'drawings'],
  dibujos: ['dibujo', 'drawing'],
  perro: ['perros', 'dog', 'dogs', 'puppy'],
  perros: ['perro', 'dog', 'dogs'],
};

// Saca de la pagina de resultados un pin por huella, con sus tamaños a probar.
function pinesDe(html) {
  const texto = String(html);
  const pines = new Map();   // huella -> { huella, candidatos: [] }
  for (const m of texto.matchAll(RX_PIN)) {
    const [, , ruta, ext] = m;
    if (pines.has(ruta)) continue;
    // LO QUE ESTA DENTRO DE UN `url(...)` NO ES UN RESULTADO, ES DECORACION.
    //
    // El icono de Instagram vive en una regla de CSS de la propia pagina
    // —`:root{--instagram-background-url:url(https://i.pinimg.com/originals/…)}`—
    // y como estaba antes que cualquier pin, era el primero de la lista. En el
    // grupo salio tal cual: un cuadro con el degradado rosa y naranja como
    // respuesta a una busqueda.
    const antes = texto.slice(Math.max(0, m.index - 5), m.index);
    if (antes.includes('url(')) continue;
    if (pines.size >= MAX_PINES) break;
    pines.set(ruta, {
      huella: ruta,
      candidatos: CALIDAD.map((t) => `https://i.pinimg.com/${t}/${ruta}.${ext}`),
    });
  }
  return [...pines.values()];
}

// ─── DE DONDE SALEN LOS RESULTADOS DE VERDAD ────────────────────────────────
//
// LA PRIMERA VERSION LEIA LA PAGINA A PELO Y DEVOLVIA CUALQUIER COSA. El dueño:
// «busco /pin sticker racista Argentina y me envía cosas random».
//
// Y no era que la pagina trajera otra busqueda. Medido: cuatro busquedas muy
// distintas comparten UNA sola imagen, asi que el contenido si es de cada
// consulta. El problema es con QUE viene mezclado. A una visita anonima
// Pinterest le rellena la pagina con contenido generico y personalizado de
// relleno, y eso entra revuelto con los resultados: de las seis primeras
// imagenes de «gatos», tres eran fotos de uñas. Ademas, la primera de todas no
// era ni un resultado — era el icono de Instagram, metido en una regla de CSS.
//
// Como el bot elegia una al azar entre cuarenta, la mitad de las veces salia
// del relleno. Y con una busqueda concreta —donde los resultados buenos son
// pocos— casi siempre.
//
// LO QUE SI DEVUELVE LOS RESULTADOS es el mismo endpoint que usa la web cuando
// haces scroll. Contesta 403 a secas, y por eso lo descarte la primera vez.
// Pero no pide cuenta: pide lo que pediria un navegador. Se visita la pagina,
// se recogen sus cookies —ahi viene el csrftoken— y con ellas el endpoint
// contesta 200 con los resultados ORDENADOS por relevancia y sin una sola
// imagen de relleno. Comprobado con tres busquedas: «gatos» devuelve gatos,
// «arquitectura brutalista» devuelve edificios, y la que no funcionaba devuelve
// lo que se le pidio.
//
// La pagina se descarga igual, asi que no cuesta una peticion de mas: la
// primera visita hace falta para las cookies, y su HTML se guarda como
// respaldo por si el endpoint deja de contestar algun dia.
function huellaDe(url) {
  const m = /\/(?:originals|\d{2,4}x\d{0,4})\/((?:[0-9a-f]{2}\/){3}[0-9a-f]{16,})\./i.exec(String(url));
  return m ? m[1] : String(url);
}

function normalizarBusqueda(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokensDe(s) {
  return normalizarBusqueda(s).split(/\s+/).filter((t) => t.length >= 3 && !STOP_BUSQUEDA.has(t));
}

function raizDe(t) {
  let r = String(t || '');
  if (r.length >= 6 && /(aciones|acion|ciones|cion)$/.test(r)) r = r.replace(/(aciones|acion|ciones|cion)$/, '');
  else if (r.length >= 5 && /(amente|mente)$/.test(r)) r = r.replace(/(amente|mente)$/, '');
  else if (r.length >= 5 && /(es|as|os)$/.test(r)) r = r.slice(0, -2);
  else if (r.length >= 4 && r.endsWith('s')) r = r.slice(0, -1);
  if (r.length >= 5 && /[ao]$/.test(r)) r = r.slice(0, -1);
  return r;
}

function variantesDe(tok) {
  const out = new Set([tok]);
  if (tok.endsWith('s') && tok.length > 4) out.add(tok.slice(0, -1));
  else out.add(`${tok}s`);
  const r = raizDe(tok);
  if (r.length >= 4) out.add(r);
  for (const s of SINONIMOS[tok] || []) out.add(s);
  return [...out];
}

// El titulo, el alt automatico y el tablero. Ahi es donde se ve si el pin
// ES lo que se pidio. Las «busquedas relacionadas» van aparte: en un gato
// argentino Pinterest cuelga «Harry Potter» y «Ninjago», y si eso cuenta
// igual que el titulo, una busqueda de Harry Potter saca el gato.
function partesDePin(p) {
  if (!p) return { fuerte: '', extra: '' };
  if (typeof p.texto === 'string' && !p.images) {
    return { fuerte: p.texto, extra: typeof p.extra === 'string' ? p.extra : '' };
  }
  const board = p.board && typeof p.board === 'object' ? p.board : {};
  const join = p.pin_join && typeof p.pin_join === 'object' ? p.pin_join : {};
  const anns = Array.isArray(join.visual_annotation)
    ? join.visual_annotation.filter((x) => typeof x === 'string').join(' ')
    : (typeof join.visual_annotation === 'string' ? join.visual_annotation : '');
  const resumen = p.rich_summary && typeof p.rich_summary === 'object' ? p.rich_summary : {};
  const limpio = (xs) => xs.filter((x) => typeof x === 'string' && x.trim() && x.trim() !== '.').join(' ');
  return {
    fuerte: limpio([
      p.grid_title, p.title, p.description, p.seo_alt_text, p.alt_text,
      p.auto_alt_text, p.closeup_unified_description, p.grid_description, p.seo_title,
      resumen.display_name, resumen.excerpt,
    ]),
    extra: limpio([board.name, anns]),
  };
}

function textoDePin(p) {
  if (!p) return '';
  if (typeof p.texto === 'string') {
    return p.extra ? `${p.texto} ${p.extra}` : p.texto;
  }
  const { fuerte, extra } = partesDePin(p);
  return `${fuerte} ${extra}`.trim();
}

function cubreToken(tok, fuerte, extra) {
  const vars = variantesDe(tok);
  if (vars.some((v) => v.length >= 3 && fuerte.includes(v))) return 'fuerte';
  if (vars.some((v) => v.length >= 3 && extra.includes(v))) return 'extra';
  const r = raizDe(tok);
  if (r.length >= 5) {
    const encaja = (w) => {
      if (w.length < 4) return false;
      const rw = raizDe(w);
      return rw === r || rw.startsWith(r) || r.startsWith(rw);
    };
    if (fuerte.split(' ').some(encaja)) return 'fuerte';
    if (extra.split(' ').some(encaja)) return 'extra';
  }
  return '';
}

function puntuar(consulta, pin, pos = 0) {
  const qTokens = tokensDe(consulta);
  const frase = normalizarBusqueda(consulta);
  const { fuerte: fRaw, extra: eRaw } = partesDePin(pin);
  const fuerte = normalizarBusqueda(fRaw);
  const extra = normalizarBusqueda(eRaw);
  let pts = Math.max(0, 12 - pos);
  let cubiertos = 0;
  if (frase && fuerte.includes(frase)) pts += 80;
  else if (frase && extra.includes(frase)) pts += 25;
  for (const tok of qTokens) {
    const donde = cubreToken(tok, fuerte, extra);
    if (donde === 'fuerte') { pts += 18; cubiertos++; }
    else if (donde === 'extra') { pts += 7; cubiertos++; }
  }
  for (let i = 0; i < qTokens.length - 1; i++) {
    const bi = `${qTokens[i]} ${qTokens[i + 1]}`;
    if (fuerte.includes(bi)) pts += 25;
    else if (extra.includes(bi)) pts += 8;
  }
  if (qTokens.length) pts += Math.round(30 * cubiertos / qTokens.length);
  return { pts, cubiertos, qlen: qTokens.length };
}

// Reordena por lo que el pin DICE, no por el sitio en el que Pinterest lo
// colgó. Medido con «sticker racista Argentina»: el primero del buscador era
// un cartel en una fachada (cero palabras de la consulta) y el sticker
// argentino iba tercero. El bot sorteaba entre los cinco primeros, así que
// cuatro de cada cinco veces salía basura. Ahora el que cubre más palabras
// va primero, y el que no cubre ninguna se cae si hay otros que sí.
function ordenarPines(pines, consulta) {
  if (!Array.isArray(pines) || pines.length <= 1) return pines || [];
  const anotados = pines.map((p, i) => {
    const pos = p.pos != null ? p.pos : i;
    return { pin: p, pos, ...puntuar(consulta, p, pos) };
  });
  anotados.sort((a, b) => b.pts - a.pts || a.pos - b.pos);
  const qlen = tokensDe(consulta).length;
  let lista = anotados;
  if (qlen >= 2) {
    const maxC = Math.max(0, ...anotados.map((x) => x.cubiertos));
    if (maxC > 0) {
      let minimo = maxC;
      let buenos = anotados.filter((x) => x.cubiertos >= minimo);
      if (buenos.length < 3 && minimo > 1) {
        minimo -= 1;
        buenos = anotados.filter((x) => x.cubiertos >= minimo);
      }
      if (buenos.length >= 2) lista = buenos;
    }
  }
  return lista.map((x) => x.pin);
}

function pinesDeResultados(crudos) {
  const pines = [];
  for (const p of crudos) {
    // Los anuncios fuera: nadie ha pedido un anuncio.
    if (!p || p.is_promoted || p.promoted_is_removable) continue;
    // «otras búsquedas», usuarios, tableros: no son un pin.
    if (p.type && p.type !== 'pin') continue;
    const im = p.images || {};
    // De mayor a menor, y `orig` es como llama este endpoint al original.
    const candidatos = ['orig', '736x', '564x', '474x', '236x']
      .map((k) => im[k]?.url)
      .filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u));
    // Entre los resultados vienen modulos que no son pines —«otras busquedas»,
    // por ejemplo— y esos no traen imagenes. Sin esta linea, el primero de
    // «gatos» era uno de ellos.
    if (!candidatos.length) continue;
    const { fuerte, extra } = partesDePin(p);
    pines.push({ huella: huellaDe(candidatos[0]), candidatos, texto: fuerte, extra });
    if (pines.length >= MAX_RESULTADOS) break;
  }
  return pines;
}

// Lo que ya se mandó de esa búsqueda en ese grupo. No es pickFresh: aquel
// sortea entre los que quedan, y eso es justo lo que hacía que *!next*
// saltara a un pin mediocre en vez de bajar al siguiente más concreto.
const MAX_VISTOS = 500;
const vistosPorClave = new Map();

function vistosDe(clave) {
  if (!clave) return new Set();
  return new Set(vistosPorClave.get(clave) || []);
}

function marcarVisto(clave, huella) {
  if (!clave || !huella) return;
  let hist = vistosPorClave.get(clave);
  if (vistosPorClave.has(clave)) vistosPorClave.delete(clave);
  else if (vistosPorClave.size >= MAX_VISTOS) vistosPorClave.delete(vistosPorClave.keys().next().value);
  if (!hist) hist = [];
  hist.push(huella);
  if (hist.length > 40) hist.shift();
  vistosPorClave.set(clave, hist);
}

function siguientePin(pines, clave, { reciclar = false } = {}) {
  if (!Array.isArray(pines) || !pines.length) return null;
  if (!clave) return pines[0];
  const vistos = vistosDe(clave);
  const next = pines.find((p) => !vistos.has(p.huella));
  if (next) return next;
  if (!reciclar) return null;
  vistosPorClave.delete(clave);
  return pines[0];
}

// ─── LAS COOKIES SE GUARDAN: NO SON DE LA BUSQUEDA, SON DE LA SESION ────────
//
// La visita a la pagina existe SOLO para recoger el csrftoken, y esa pagina pesa
// un mega. Medido: 865 ms y 1.038 KB para leer dos cabeceras.
//
// Y las mismas cookies valen para OTRA busqueda distinta: comprobado, se pidio
// «gatos», se guardaron sus cookies y con ellas «naruto» contesto 200 con sus
// dieciocho pines. No son de la consulta, son de la sesion anonima.
//
// Asi que se guardan media hora. La primera busqueda tras arrancar paga la
// pagina; las demas van directas al buscador: de 2.259 ms a 1.394, y sin
// bajarse un mega cada vez, que en una VPS con datos contados tampoco da igual.
//
// Si el buscador contesta 403 con las cookies guardadas —han caducado o
// Pinterest las ha invalidado— se tiran y se vuelve a por la pagina UNA vez. Sin
// eso, media hora de busquedas rotas por una cookie vieja.
const GALLETAS_MS = 30 * 60_000;
let galletasGuardadas = null;   // { cookie, csrf, ts }

async function traerGalletas(pagina, comun, forzar = false) {
  if (!forzar && galletasGuardadas && Date.now() - galletasGuardadas.ts < GALLETAS_MS) {
    return { ...galletasGuardadas, html: '' };
  }
  const portada = await axios.get(pagina, {
    timeout: 20000, headers: comun, maxRedirects: 5, validateStatus: () => true,
  });
  const html = String(portada.data || '');
  const cookie = (portada.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');
  const csrf = (/csrftoken=([^;]+)/.exec(cookie) || [])[1];
  if (cookie) galletasGuardadas = { cookie, csrf, ts: Date.now() };
  return { cookie, csrf, html };
}

// Lo que manda la web cuando TÚ escribes la consulta. Sin `rs=typed` y sin
// `term_meta[]=palabra|typed`, Pinterest trata la petición como sugerencia
// y mezcla pines «parecidos». El HTML de la página ya llevaba `rs=typed`;
// el endpoint, no — y el endpoint es del que salen los resultados.
function sourceUrlDe(consulta) {
  const q = encodeURIComponent(consulta);
  const terms = String(consulta).trim().split(/\s+/).filter(Boolean)
    .map((p) => `term_meta[]=${encodeURIComponent(p)}|typed`)
    .join('&');
  return `/search/pins/?q=${q}&rs=typed${terms ? `&${terms}` : ''}`;
}

async function pedirAPinterest(consulta, bookmark = '') {
  const pagina = PIN.pagina + encodeURIComponent(consulta);
  const comun = { 'User-Agent': UA_ESCRITORIO, 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8' };
  let { cookie: galletas, csrf, html } = await traerGalletas(pagina, comun);
  if (!galletas) return { pines: [], html, contesto: false, bookmark: '' };

  const sourceUrl = sourceUrlDe(consulta);
  const cuerpo = {
    options: {
      query: consulta,
      scope: 'pins',
      rs: 'typed',
      page_size: 25,
      auto_correction_disabled: false,
      redux_normalize_feed: true,
      bookmarks: [bookmark || ''],
    },
    context: {},
  };
  const destino = PIN.recurso
    + `?source_url=${encodeURIComponent(sourceUrl)}`
    + `&data=${encodeURIComponent(JSON.stringify(cuerpo))}`;
  const preguntar = async () => axios.get(destino, {
    timeout: 20000, validateStatus: () => true,
    headers: {
      ...comun,
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'X-APP-VERSION': 'ba7f6d6',
      'X-Pinterest-AppState': 'active',
      'X-Pinterest-Source-Url': sourceUrl,
      'X-Pinterest-PWS-Handler': 'www/search/[scope].js',
      Referer: pagina,
      Cookie: galletas,
      ...(csrf ? { 'X-CSRFToken': csrf } : {}),
    },
  });

  try {
    let r = await preguntar();
    // Cookie caducada: se tira la guardada, se vuelve a por la pagina y se
    // pregunta otra vez. Una sola vez, que si tampoco vale no es la cookie.
    if (r.status === 403 || r.status === 401) {
      galletasGuardadas = null;
      ({ cookie: galletas, csrf, html } = await traerGalletas(pagina, comun, true));
      if (galletas) r = await preguntar();
    }
    const crudos = r.data?.resource_response?.data?.results;
    const siguiente = r.data?.resource_response?.bookmark
      || (Array.isArray(r.data?.resource_response?.bookmarks) ? r.data.resource_response.bookmarks[0] : '')
      || '';
    // `contesto` distingue dos cosas que antes se confundian, y la confusion se
    // vio en el grupo: el buscador que NO responde (403, red, cambio de nombre)
    // y el buscador que responde «de eso no tengo nada». En el primer caso vale
    // la pena leer la pagina; en el segundo NO, porque la pagina siempre trae
    // relleno y lo unico que se consigue es mandar cualquier cosa como si fuera
    // el resultado. Asi salio el icono de Instagram en el grupo.
    if (Array.isArray(crudos)) {
      return {
        pines: pinesDeResultados(crudos),
        html,
        contesto: true,
        bookmark: siguiente && siguiente !== '-end-' ? siguiente : '',
      };
    }
    logger.info(`redes: el buscador de Pinterest contestó ${r.status} sin resultados; tiro de la página`);
  } catch (e) {
    logger.info(`redes: el buscador de Pinterest falló (${e.message.slice(0, 60)}); tiro de la página`);
  }
  return { pines: [], html, contesto: false, bookmark: '' };
}

// Busca y devuelve la imagen ya en disco, con la misma forma que `traer`.
// `clave` es para no repetir: la misma busqueda en el mismo grupo no saca la
// misma foto dos veces seguidas. `pinesDados` es la lista ya ranqueada de un
// *!next*: no se vuelve a preguntar a Pinterest, se baja el siguiente.
async function buscar(texto, clave, pinesDados = null) {
  const consulta = String(texto || '').replace(/\s+/g, ' ').trim().slice(0, LARGO_BUSQUEDA);
  if (!consulta) throw new Error('dime qué buscar');
  await acquireDownloadSlot();
  let fichero = null;
  try {
    let pines = Array.isArray(pinesDados) && pinesDados.length ? pinesDados : null;
    let html = '';
    let contesto = false;
    if (!pines) {
      try {
        const uno = await pedirAPinterest(consulta);
        pines = uno.pines;
        html = uno.html;
        contesto = uno.contesto;
        // ─── SI LA PRIMERA PAGINA NO DICE LO QUE SE PIDIO, LA SEGUNDA ────
        //
        // Pinterest recorta consultas feas («racista») y rellena la primera
        // pagina con pines que solo comparten UNA palabra. Medido: de diez,
        // el tope era «sticker»+«argentina» y «racista» no aparecia. En la
        // pagina siguiente si salian pines que hablaban de racismo. Una
        // sola pagina de mas, y solo cuando faltan palabras, no siempre.
        const qlen = tokensDe(consulta).length;
        const maxC = Math.max(0, ...pines.map((p, i) => puntuar(consulta, p, i).cubiertos));
        if (contesto && qlen >= 2 && maxC < qlen && uno.bookmark) {
          const dos = await pedirAPinterest(consulta, uno.bookmark);
          if (dos.contesto && dos.pines.length) {
            const visto = new Set(pines.map((p) => p.huella));
            for (const p of dos.pines) if (!visto.has(p.huella)) pines.push(p);
          }
        }
      } catch (e) {
        throw new Error(`Pinterest no contestó (${e.response?.status || e.code || e.message})`);
      }
      // El respaldo SOLO si el buscador no contesto. Si contesto y no trajo nada,
      // es que no hay nada: leer la pagina entonces es mandar su relleno como si
      // fuera el resultado.
      if (!contesto) pines = pinesDe(html);
      pines = ordenarPines(pines, consulta);
    }
    if (!pines.length) throw new Error(`no encontré nada con «${consulta}»`);

    // ─── EL MAS CONCRETO QUE AUN NO SALIO, NO UN SORTEO ENTRE LOS CINCO ──
    //
    // El dueño: «sigue sin encontrar memes racistas» y «el buscador es una
    // porquería». El arreglo anterior sorteaba entre los cinco primeros del
    // buscador. Eso asume que Pinterest ordena bien —y a una visita anónima
    // no le ordena: el #1 de «sticker racista Argentina» era un cartel en
    // una fachada, sin sticker, sin racista y sin Argentina.
    //
    // Ahora se reordena por las palabras de la consulta (titulo + alt) y se
    // baja por esa lista. *!next* es el siguiente, no otro al azar.
    const intentados = new Set();
    let ultimo = null;
    for (let n = 0; n < INTENTOS_PIN; n++) {
      const pin = siguientePin(pines, clave, { reciclar: n === 0 });
      if (!pin || intentados.has(pin.huella)) break;
      intentados.add(pin.huella);
      marcarVisto(clave, pin.huella);
      for (const url of pin.candidatos) {
        const ext = extensionDe(url) || 'jpg';
        fichero = path.join(TEMP_DIR, `red_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
        try {
          await downloadUrlToFile(url, fichero);
          const { size } = await fs.stat(fichero);
          if (size < 2048) throw new Error('llegó una miniatura');
          if (size > TOPE_WHATSAPP) throw new Error('pesa demasiado');
          // Que sea una foto DE VERDAD y no una pagina de error con nombre de
          // jpg: es la misma comprobacion que se le hace a los vídeos.
          const medio = await analizarMedio(fichero);
          if (!medio.probado || !ESTATICOS.has(medio.video)) throw new Error('no es una imagen');
          return { fichero, tipo: 'imagen', ext, bytes: size, pines };
        } catch (e) {
          ultimo = e;
          await fs.remove(fichero).catch(() => {});
          fichero = null;
        }
      }
    }
    throw new Error(`encontré pines pero no pude bajar ninguno (${ultimo?.message || 'sin motivo'})`);
  } catch (e) {
    if (fichero) await fs.remove(fichero).catch(() => {});
    apuntarFallo('pinterest', e.message);
    throw e;
  } finally {
    releaseDownloadSlot();
  }
}


// Las dos ordenes posibles del atributo. En la pagina de Pinterest el `content`
// va ANTES que el `property`, asi que una expresion sola no las caza: lo
// comprobe mirando el HTML de verdad.
function metaDe(html, prop) {
  const a = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i').exec(html);
  if (a) return a[1];
  const b = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i').exec(html);
  return b ? b[1] : null;
}

async function porPinterest(url) {
  const { data: html } = await axios.get(url, {
    timeout: 20000, maxRedirects: 5, responseType: 'text',
    headers: { 'User-Agent': UA_MOVIL, 'Accept-Language': 'es-ES,es;q=0.9' },
  });
  if (typeof html !== 'string') return null;

  const video = metaDe(html, 'og:video:secure_url') || metaDe(html, 'og:video');
  const imagen = metaDe(html, 'og:image');
  const enlace = video || imagen;
  if (!enlace) return null;

  const ext = video ? 'mp4' : ((enlace.split('?')[0].split('.').pop() || 'jpg').toLowerCase());
  const fichero = path.join(TEMP_DIR, `red_${Date.now()}_${Math.random().toString(36).slice(2)}.${esImagen(ext) || video ? ext : 'jpg'}`);

  // La foto viene en la version de 736 px. La original esta en la misma ruta con
  // `originals` en vez del tamaño; si no existe, se queda la que dio la pagina.
  if (!video && /\/\d+x\//.test(enlace)) {
    try {
      await downloadUrlToFile(enlace.replace(/\/\d+x\//, '/originals/'), fichero);
      return fichero;
    } catch { /* no habia original: se sigue con la que vino */ }
  }
  await downloadUrlToFile(enlace, fichero);
  return fichero;
}

// ── Vía 2: yt-dlp ───────────────────────────────────────────────────────────
//
// La salida NO se adivina por el nombre: se le da una plantilla con %(ext)s y
// después se busca qué dejó. Preguntarle a yt-dlp cómo se llamó el fichero
// necesita `--print after_move:filepath`, que no está en las versiones viejas, y
// esto tiene que funcionar con la que haya instalada en la máquina.
// ─── SIN API, LAS FOTOS TAMBIEN SE SACAN CON YT-DLP ─────────────────────────
//
// EL CASO REAL, Y POR QUE NO BASTABA CON LO DE ANTES. Todo el trabajo de las
// publicaciones de fotos estaba en la via de la API. Y en la VPS no hay API de
// Instagram puesta —`npm run enlace` lo dice en su primera linea: «API puesta
// para Instagram: no»— asi que ese camino no se recorre nunca y el enlace acaba
// entero en yt-dlp.
//
// Ahi yt-dlp contesta «No video formats found!». Y tiene razon: no las hay. El
// post son tres FOTOS, y el selector le esta pidiendo el mejor VIDEO.
//
// Lo importante de ese error es lo que descarta: Instagram NO esta bloqueando
// al servidor. yt-dlp entro, resolvio el post y enumero sus tres partes. Lo
// unico que falta es pedirle las imagenes en vez de un video.
//
// Y se le piden con `--ignore-no-formats-error`, que es la opcion que hace que
// no tire la entrada entera cuando no encuentra formatos: sin ella el JSON trae
// tres entradas VACIAS (comprobado), y con ella cada una llega con sus trece
// tamaños de la misma foto. El ultimo es el original, sin recorte de tamaño en
// los parametros. Medido: 2,2 s de metadatos y la foto entera detras.
const TOPE_FOTOS_YTDLP = 20;

// QUE ERRORES SIGNIFICAN «ESTO NO ES UN VIDEO» Y CUALES NO.
//
// La diferencia importa y no es de matiz. «No video formats found» quiere decir
// que el enlace es bueno, yt-dlp entro y lo que hay dentro no es un video: ahi
// toca pedir las fotos. «Instagram sent an empty media response» quiere decir
// que la IP va estrangulada y hay que REINTENTAR: pedirle las fotos a eso seria
// cambiar un reel que habria salido por un pase que no existe.
const esSinVideo = (mensaje) => /no video formats?|requested format/i.test(String(mensaje || ''));

function fotosDeFicha(ficha) {
  const trozos = Array.isArray(ficha?.entries) && ficha.entries.length ? ficha.entries : [ficha];
  const fuera = [];
  for (const t of trozos) {
    if (!t) continue;
    // Las miniaturas van de peor a mejor, asi que la ultima es la buena. Si no
    // hay lista, vale `thumbnail` a secas.
    const lista = Array.isArray(t.thumbnails) ? t.thumbnails : [];
    const mejor = lista.length ? lista[lista.length - 1]?.url : t.thumbnail;
    if (typeof mejor === 'string' && /^https?:\/\//i.test(mejor) && !fuera.includes(mejor)) {
      fuera.push(mejor);
      if (fuera.length >= TOPE_FOTOS_YTDLP) break;
    }
  }
  return fuera;
}

// Devuelve el pase ya montado, o null si ahi no habia fotos tampoco.
// `cancion` es el fichero de audio que ya se hubiera bajado, si lo hay.
async function porYtDlpFotos(url, cancion = null) {
  let crudo = null;
  try {
    crudo = await ytdlp(['-J', '--no-warnings', '--ignore-no-formats-error', url], 60000);
  } catch (e) {
    logger.info(`redes: yt-dlp no supo describir el enlace (${e.message.slice(0, 80)})`);
    return null;
  }
  let ficha = null;
  try { ficha = JSON.parse(crudo); } catch { return null; }
  const fotos = fotosDeFicha(ficha);
  if (!fotos.length) return null;
  logger.info(`redes: no era un vídeo, son ${fotos.length} foto(s); monto el pase`);
  return montarPase(fotos, null, cancion);
}

async function porYtDlp(url, plataforma) {
  const base = path.join(TEMP_DIR, `red_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const args = [
    '-f', PLATAFORMAS[plataforma].formato,
    '--no-playlist', '--no-warnings', '--no-progress',
    // El tope va aquí y no después de bajar: cortar a los 25 MB cuando ya están
    // en disco es gastar el ancho de banda igual.
    '--max-filesize', `${Math.floor(TOPE_WHATSAPP / 1048576)}M`,
    '-o', `${base}.%(ext)s`,
    url,
  ];
  // INSTAGRAM NO BLOQUEA: ESTRANGULA. Y esa diferencia lo es todo.
  //
  // Probado con tres reels reales, seguidos: el primero salio, los otros dos
  // fallaron con «Instagram sent an empty media response», que su propio mensaje
  // atribuye a falta de sesion. No era eso. Repetidos unos segundos despues, los
  // dos salieron a la primera. Lo que hay es un limite por IP y por rato, no una
  // puerta cerrada — y explica lo que veia el dueño: «hay videos de IG que no
  // envia», unos si y otros no, sin patron aparente.
  //
  // Asi que se reintenta con espera creciente en vez de rendirse. Ocupa el hueco
  // de descarga unos segundos mas; la alternativa es contestar que no a algo que
  // habria salido.
  const REINTENTOS = [0, 4000, 9000];
  let ultimo = null;
  for (const espera of REINTENTOS) {
    if (espera) await new Promise((r) => setTimeout(r, espera));
    try { await ytdlp(args, TIEMPO_MAXIMO); ultimo = null; break; } catch (e) {
      ultimo = e;
      const estrangulado = /empty media response|rate.?limit|429|too many|temporarily/i.test(e.message || '');
      if (!estrangulado) break;
    }
  }
  if (ultimo) {
    // «No video formats found» no es un fallo de red ni un bloqueo: es que eso
    // no es un video. Antes de rendirse, se le piden las fotos.
    if (esSinVideo(ultimo.message)) {
      const pase = await porYtDlpFotos(url);
      if (pase) return pase;
    }
    throw ultimo;
  }

  const dir = path.dirname(base);
  const prefijo = path.basename(base);
  const dejados = (await fs.readdir(dir)).filter((f) => f.startsWith(prefijo));
  if (!dejados.length) return null;
  // Si dejó varios (vídeo y audio sin juntar), el bueno es el más grande.
  let elegido = null;
  let mayor = -1;
  for (const f of dejados) {
    const lleno = path.join(dir, f);
    const { size } = await fs.stat(lleno).catch(() => ({ size: 0 }));
    if (size > mayor) { mayor = size; elegido = lleno; }
  }
  // Y lo que no se eligió no se queda ocupando disco hasta el barrido.
  for (const f of dejados) {
    const lleno = path.join(dir, f);
    if (lleno !== elegido) await fs.remove(lleno).catch(() => {});
  }
  return elegido;
}

// Devuelve { fichero, tipo } o lanza con un motivo que se le puede enseñar a
// alguien. El hueco de descarga es el MISMO que usa !play a propósito: son dos
// a la vez para todo el bot, y eso es lo que impide que cuatro enlaces seguidos
// dejen la máquina sin ancho de banda ni RAM.
async function traer(url, plataforma) {
  await acquireDownloadSlot();
  let fichero = null;
  try {
    let fallaApi = null;
    try {
      fichero = await porApi(url, plataforma);
      if (!fichero && API_DE[plataforma]) fallaApi = 'la API no devolvió ningún enlace';
    } catch (e) {
      fallaApi = e.message;
      logger.warn(`redes: la API falló para ${plataforma}: ${e.message}`);
    }
    // Pinterest tiene via propia y va ANTES que yt-dlp: yt-dlp solo entiende
    // pines de video, y la mayoria son fotos.
    if (!fichero && plataforma === 'pinterest') {
      try {
        fichero = await porPinterest(url);
      } catch (e) {
        logger.warn(`redes: pinterest por etiquetas falló: ${e.message}`);
      }
    }
    // EL MOTIVO DE LA API NO LO TAPA EL DE YT-DLP. Con una API puesta, el fallo
    // que importa es el suyo: yt-dlp es el respaldo y se sabe que esta
    // bloqueado, asi que contar SOLO su mensaje decia «la web bloquea al
    // servidor» cuando lo que habia pasado era otra cosa, y mandaba a arreglar
    // donde no era.
    try {
      if (!fichero) fichero = await porYtDlp(url, plataforma);
    } catch (e) {
      throw new Error(fallaApi ? `${fallaApi} · y yt-dlp: ${e.message}` : e.message);
    }
    if (!fichero) throw new Error(fallaApi || 'no pude sacar el vídeo de ahí');

    const { size } = await fs.stat(fichero);
    if (size < 1024) throw new Error('lo que bajó está vacío');
    // EL TOPE ES EL DE WHATSAPP, NO EL NUESTRO. MAX_BYTES son 25 MB y viene de
    // !play, donde el limite es el ancho de banda. Aqui manda otra cosa: el
    // cliente de WhatsApp no acepta video por encima de 16 MB, asi que mandar
    // 20 no es «un poco grande», es un envio que falla o que a la otra persona
    // no le llega. Mas alla de ese numero no sirve de nada.
    if (size > TOPE_WHATSAPP) throw new Error(`pesa ${Math.round(size / 1048576)} MB y WhatsApp no pasa de ${Math.floor(TOPE_WHATSAPP / 1048576)}`);

    let ext = extensionDe(fichero) || (fichero.split('.').pop() || '').toLowerCase();
    let tipo = esImagen(ext) ? 'imagen' : 'video';

    if (tipo === 'video') {
      // ULTIMA RED: venga de la API, de yt-dlp o de donde sea, lo que se manda
      // como video tiene que TENER video. WhatsApp contesta «something is wrong
      // with the video file» y quien lo pego no se entera de por que.
      const medio = await analizarMedio(fichero);
      if (medio.probado && !medio.video) {
        // EL OTRO CAMINO DE UNA PUBLICACION DE FOTOS, y estaba abierto.
        //
        // Cuando no hay API, yt-dlp baja lo unico que encuentra: la cancion. No
        // da error —el fichero existe y es valido— asi que la rama de «no video
        // formats» no se enteraba y esto acababa aqui, en un mensaje que dice
        // la verdad y deja al que pego el enlace sin su publicacion. Se le
        // vuelve a preguntar por las fotos, y la cancion ya bajada es la del
        // pase: no se pide dos veces.
        const pase = await porYtDlpFotos(url, medio.audio ? fichero : null);
        if (pase) {
          await fs.remove(fichero).catch(() => {});
          fichero = pase;
          ext = extensionDe(fichero) || 'mp4';
          tipo = esImagen(ext) ? 'imagen' : 'video';
          const s3 = await fs.stat(fichero);
          if (s3.size > TOPE_WHATSAPP) throw new Error(`pesa ${Math.round(s3.size / 1048576)} MB y WhatsApp no pasa de ${Math.floor(TOPE_WHATSAPP / 1048576)}`);
          return { fichero, tipo, ext, bytes: s3.size };
        }
        throw new Error(medio.audio
          ? 'eso no es un vídeo: el enlace solo trae la canción (suele pasar con las publicaciones de fotos)'
          : 'eso no trae vídeo');
      }
      const nivelado = await conAudioNivelado(fichero);
      if (nivelado !== fichero) {
        fichero = nivelado;
        ext = extensionDe(fichero) || 'mp4';
        const s2 = await fs.stat(fichero).catch(() => ({ size }));
        return { fichero, tipo, ext, bytes: s2.size };
      }
    }
    return { fichero, tipo, ext, bytes: size };
  } catch (e) {
    if (fichero) await fs.remove(fichero).catch(() => {});
    apuntarFallo(plataforma, e.message);
    throw e;
  } finally {
    releaseDownloadSlot();
  }
}

// `hayApi` lo usa `npm run estado` para no pedir yt-dlp a quien ya tiene las
// tres plataformas resueltas por fuera.
const hayApi = (plataforma) => !!API_DE[plataforma];

module.exports = { traer, buscar, _pinesDe: pinesDe, _pinesDeResultados: pinesDeResultados, _huellaDe: huellaDe, _PIN: PIN, _olvidarGalletas: () => { galletasGuardadas = null; }, _ordenarPines: ordenarPines, _siguientePin: siguientePin, _puntuar: puntuar, _textoDePin: textoDePin, _olvidarVistos: () => { vistosPorClave.clear(); }, _marcarVisto: marcarVisto, enlaceDe, plataformaDe, hayApi, hayComoTraer, ultimosFallos, PLATAFORMAS, _porYtDlp: porYtDlp, _porApi: porApi, _porPinterest: porPinterest, _conAudioNivelado: conAudioNivelado, _medirAudio: medirAudio, _analizarMedio: analizarMedio, _API_DE: API_DE,
  _montarPase: montarPase, _comoEnlaces: comoEnlaces, _porYtDlpFotos: porYtDlpFotos, _fotosDeFicha: fotosDeFicha, _esSinVideo: esSinVideo, _extensionDe: extensionDe, _imagenesDe: imagenesDe, _musicaDe: musicaDe, _medirFichero: medirFichero };
