'use strict';

// ─── LA VISTA PREVIA DE LO QUE MANDA EL BOT (21 nov) ────────────────────────
//
// El dueño: «el bot debe proporcionar la mejor calidad posible para lo que es
// WhatsApp; calidad y velocidad de la mano». Una foto o un vídeo de WhatsApp
// llevan dentro del propio mensaje tres cosas que se ven ANTES de bajar nada:
// una miniatura (`jpegThumbnail`), el tamaño (`width`, `height`) y, en un
// vídeo, la duración (`seconds`). Con ellas la burbuja sale ya con su forma y
// con la imagen encima, el álbum enseña sus fotos y la notificación lleva
// foto; sin ellas, un recuadro gris del tamaño que le parezca al móvil, que
// salta de forma al terminar de bajar, y un vídeo sin saber cuánto dura.
//
// Y el bot las mandaba casi siempre vacías:
//
//   · Fotos. Baileys las calcula con sharp o con jimp, y en la VPS no hay
//     ninguno (sharp se borra al desplegar, ver scripts/actualizar.sh). Cada
//     foto intentaba importar los dos, fallaba y salía sin miniatura ni tamaño.
//     Y para intentarlo copiaba antes la foto ENTERA a un temporal que se
//     tiraba sin usar.
//   · Vídeos. Van con `jpegThumbnail: null` a propósito, para que Baileys no
//     lance su propio ffmpeg en el único núcleo (ver toimg.js). Y con eso
//     salían sin miniatura, sin tamaño y sin duración.
//
// Aquí se hace bien y sin pagar de más:
//
//   · UN SOLO FFMPEG da la miniatura y, en lo que escribe al abrir la entrada,
//     el tamaño y la duración. Medido: abrir un vídeo y sacar un fotograma de
//     160 px cuesta MENOS que la lectura vacía (`-t 0 -f null`) que hacía
//     utils/redes.js para analizarlo (57 frente a 74 ms en un MP4 de 12 s;
//     arrancar ffmpeg ya son 46). Así que redes analiza con esto y la
//     miniatura le sale gratis.
//   · Lo que ya se ha sondeado no se repite: el resultado se guarda por
//     fichero (ruta, tamaño y fecha). Un vídeo de redes se analizaba dos, tres
//     y cuatro veces sobre el mismo fichero; ahora una.
//   · A prioridad baja y con tope de tiempo: si no llega, se manda sin
//     miniatura. Una miniatura no vale un envío lento.
//   · Lo que reenvía el bot (*!k*, el *!tagall* con foto, la foto de ver una
//     vez) ya trae la miniatura del móvil de quien lo mandó: se reutiliza.
//
// La miniatura tiene 160 px de lado largo y no los 32 de Baileys: en la
// burbuja de un vídeo es lo que se ve mientras no se baje, y a 32 px es una
// mancha. Pesa unos pocos KB.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSuave } = require('./hijos');
const { ffmpegPath } = require('./ffmpeg');

const LADO = 160;
const CALIDAD = '5';                 // -q:v de mjpeg: 2 es lo mejor, 31 lo peor
const TOPE_FOTO_MS = 1500;
const TOPE_VIDEO_MS = 3000;
const INFO_MAX = 32 * 1024;
// Encoger y nunca agrandar: el lado largo a 160 como mucho, sin deformar.
const VF = `scale='min(${LADO},iw)':'min(${LADO},ih)':force_original_aspect_ratio=decrease`;

// ─── EL TAMAÑO DE UNA FOTO, LEYENDO SU CABECERA ─────────────────────────────
//
// Sin decodificar nada: JPEG, PNG, WebP y GIF dicen su tamaño en los primeros
// bytes. Es el respaldo cuando el ffmpeg no llega a tiempo, y basta para que la
// burbuja salga con su forma.
function dimensiones(buf) {
  try {
    if (!Buffer.isBuffer(buf) || buf.length < 24) return null;
    // PNG: IHDR justo detrás de la firma.
    if (buf[0] === 0x89 && buf.toString('latin1', 1, 4) === 'PNG') {
      return valido(buf.readUInt32BE(16), buf.readUInt32BE(20));
    }
    // GIF: pantalla lógica.
    if (buf.toString('latin1', 0, 4) === 'GIF8') return valido(buf.readUInt16LE(6), buf.readUInt16LE(8));
    // WebP: con pérdida, sin pérdida o extendido.
    if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
      const tipo = buf.toString('latin1', 12, 16);
      if (tipo === 'VP8 ' && buf.length >= 30) return valido(buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff);
      if (tipo === 'VP8L' && buf.length >= 25) {
        const b = buf.readUInt32LE(21);
        return valido((b & 0x3fff) + 1, ((b >>> 14) & 0x3fff) + 1);
      }
      if (tipo === 'VP8X' && buf.length >= 30) return valido(buf.readUIntLE(24, 3) + 1, buf.readUIntLE(27, 3) + 1);
      return null;
    }
    // JPEG: se saltan los segmentos hasta el que dice el tamaño (SOFn).
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const m = buf[i + 1];
        if (m === 0xff) { i++; continue; }
        if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
        if (m === 0xda || m === 0xd9) return null;    // empiezan los datos sin SOF
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
          return valido(buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5));
        }
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
  } catch { /* cabecera rota: sin tamaño */ }
  return null;
}
function valido(ancho, alto) {
  return ancho > 0 && alto > 0 && ancho < 65536 && alto < 65536 ? { ancho, alto } : null;
}

// ─── UN FFMPEG: MINIATURA, Y LO QUE DICE DE SU ENTRADA ──────────────────────
//
// `entrada` es una ruta o un Buffer (que entra por la tubería, sin temporal:
// solo para fotos, que un MP4 con el índice al final no se lee de una
// tubería). Devuelve { jpg, info }: `jpg` puede ser null (no había imagen que
// sacar) e `info` es lo que ffmpeg escribió al abrir la entrada, también si se
// le cortó por tiempo. Null solo si ffmpeg no llegó a arrancar. Nunca lanza.
function ffmpegMiniatura(entrada, topeMs) {
  return new Promise((resolve) => {
    const porTuberia = Buffer.isBuffer(entrada);
    let proc;
    try {
      proc = spawnSuave(ffmpegPath, [
        '-hide_banner',
        '-i', porTuberia ? 'pipe:0' : String(entrada),
        // `?`: un audio sin imagen no es un error, es un fichero sin miniatura.
        '-map', '0:v:0?', '-frames:v', '1', '-an', '-sn',
        '-vf', VF, '-q:v', CALIDAD,
        '-f', 'image2pipe', '-vcodec', 'mjpeg', 'pipe:1',
      ], { stdio: [porTuberia ? 'pipe' : 'ignore', 'pipe', 'pipe'] });
    } catch { resolve(null); return; }
    const trozos = [];
    let info = '';
    let acabado = false;
    let reloj = null;
    const fin = (r) => { if (acabado) return; acabado = true; clearTimeout(reloj); resolve(r); };
    reloj = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch { /* ya no está */ }
      fin(info ? { jpg: null, info } : null);
    }, topeMs);
    proc.stdout.on('data', (c) => trozos.push(c));
    proc.stderr.on('data', (c) => { if (info.length < INFO_MAX) info += c; });
    proc.on('error', () => fin(null));
    proc.on('close', () => {
      const jpg = Buffer.concat(trozos);
      const vale = jpg.length > 100 && jpg[0] === 0xff && jpg[1] === 0xd8;
      fin({ jpg: vale ? jpg : null, info });
    });
    if (porTuberia) {
      proc.stdin.on('error', () => { /* ffmpeg cerró antes de leerlo todo: da igual */ });
      proc.stdin.end(entrada);
    }
  });
}

// ─── LO YA SONDEADO NO SE REPITE ────────────────────────────────────────────
//
// Por ruta, tamaño y fecha: si el fichero cambia, cambia la llave. Los que
// esperan al mismo fichero a la vez comparten el mismo ffmpeg.
const CABEN = 48;
const sondeados = new Map();
function llaveDe(ruta) {
  try {
    const st = fs.statSync(ruta);
    return `${path.resolve(ruta)}|${st.size}|${st.mtimeMs}`;
  } catch { return null; }
}
function sondear(ruta, { topeMs = TOPE_VIDEO_MS } = {}) {
  const llave = llaveDe(ruta);
  if (!llave) return Promise.resolve(null);
  const ya = sondeados.get(llave);
  if (ya) return ya;
  const p = ffmpegMiniatura(ruta, topeMs).then((r) => {
    // Lo cortado por tiempo no se guarda: la próxima vez puede llegar.
    if (!r || (!r.jpg && !/Stream #\d+:\d+/.test(r.info))) sondeados.delete(llave);
    return r;
  });
  sondeados.set(llave, p);
  while (sondeados.size > CABEN) sondeados.delete(sondeados.keys().next().value);
  return p;
}

// Lo que ffmpeg dice de la entrada: el tamaño de la imagen y la duración. Con
// el giro corregido: un vídeo grabado en vertical se guarda a menudo apaisado
// con una marca de giro, y la miniatura (que ffmpeg ya gira) dice cuál es el
// lado largo de verdad.
function leerInfo(info, jpg) {
  const r = {};
  const texto = String(info || '');
  const dur = /Duration: (\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(texto);
  if (dur) {
    const s = Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]);
    if (s > 0) r.segundos = s;
  }
  const v = /Stream #\d+:\d+[^\n]*?: Video: [^\n]*?, (\d{1,5})x(\d{1,5})(?=[\s,]|$)(?: \[SAR (\d+):(\d+) DAR (\d+):(\d+)\])?/.exec(texto);
  if (v) {
    let ancho = Number(v[1]);
    let alto = Number(v[2]);
    // Píxeles que no son cuadrados: manda la proporción de pantalla.
    if (v[3] && Number(v[3]) !== Number(v[4]) && Number(v[6]) > 0) ancho = Math.round(alto * Number(v[5]) / Number(v[6]));
    const t = jpg ? dimensiones(jpg) : null;
    if (t && t.ancho !== t.alto && ancho !== alto && (t.ancho > t.alto) !== (ancho > alto)) [ancho, alto] = [alto, ancho];
    const d = valido(ancho, alto);
    if (d) Object.assign(r, d);
  }
  return r;
}

// ─── LO QUE VA EN EL MENSAJE ────────────────────────────────────────────────

// Una foto (Buffer o ruta). Nunca lanza: lo peor es {} y Baileys hace lo de
// siempre.
async function deFoto(entrada, { topeMs = TOPE_FOTO_MS } = {}) {
  try {
    const r = Buffer.isBuffer(entrada) ? await ffmpegMiniatura(entrada, topeMs) : await sondear(String(entrada), { topeMs });
    const info = r ? leerInfo(r.info, r.jpg) : {};
    const d = info.ancho ? info : dimensiones(Buffer.isBuffer(entrada) ? entrada : cabeceraDe(entrada));
    const extra = {};
    if (d) { extra.width = d.ancho; extra.height = d.alto; }
    // Con tamaño y sin miniatura va `null`: así Baileys no copia la foto a
    // disco para intentar una que en esta máquina no puede hacer.
    if (r && r.jpg) extra.jpegThumbnail = r.jpg;
    else if (d) extra.jpegThumbnail = null;
    return extra;
  } catch { return {}; }
}

// Un vídeo (ruta o Buffer). Lo que ya se sepa de él (`conocido`: ancho, alto,
// segundos) se respeta; lo que falte sale del mismo ffmpeg. Siempre lleva
// `jpegThumbnail`, aunque sea null: con undefined Baileys lanzaría su ffmpeg.
async function deVideo(entrada, conocido = {}, { topeMs = TOPE_VIDEO_MS } = {}) {
  let temporal = null;
  try {
    let ruta = entrada;
    if (Buffer.isBuffer(entrada)) {
      temporal = path.join(os.tmpdir(), `mini_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);
      await fs.promises.writeFile(temporal, entrada);
      ruta = temporal;
    }
    const r = temporal ? await ffmpegMiniatura(ruta, topeMs) : await sondear(String(ruta), { topeMs });
    const info = r ? leerInfo(r.info, r.jpg) : {};
    const ancho = conocido.ancho || info.ancho;
    const alto = conocido.alto || info.alto;
    const segundos = conocido.segundos || info.segundos;
    const extra = { jpegThumbnail: (r && r.jpg) || null };
    if (ancho && alto) { extra.width = ancho; extra.height = alto; }
    if (segundos) extra.seconds = Math.max(1, Math.round(segundos));
    return extra;
  } catch {
    return { jpegThumbnail: null };
  } finally {
    if (temporal) fs.promises.unlink(temporal).catch(() => {});
  }
}

// Lo que ya traía el mensaje original, para reenviarlo con lo mismo: su
// miniatura (la del móvil de quien lo mandó), su tamaño, su duración y, en una
// nota de voz, su onda. Gratis: no hay nada que calcular.
function delOriginal(nodo) {
  const n = nodo || {};
  const extra = {};
  const thumb = n.jpegThumbnail;
  if (thumb && thumb.length) extra.jpegThumbnail = Buffer.from(thumb);
  if (Number(n.width) > 0 && Number(n.height) > 0) { extra.width = Number(n.width); extra.height = Number(n.height); }
  if (Number(n.seconds) > 0) extra.seconds = Number(n.seconds);
  if (n.gifPlayback) extra.gifPlayback = true;
  if (n.waveform && n.waveform.length) extra.waveform = Buffer.from(n.waveform);
  return extra;
}

// Para reenviar algo que llegó en un mensaje (*!k*, el *!tagall* con foto, lo
// de ver una vez): lo del original si lo trae, y si no, hecho aquí. `tipo` es
// 'foto', 'video' o 'audio'. Un vídeo en memoria hay que escribirlo para
// mirarlo: por encima de 10 MB eso cuesta más de lo que vale la miniatura, y
// va con lo que traía. Un audio no lleva miniatura: su duración y su onda.
const VIDEO_PARA_MINIATURA = 10 * 1024 * 1024;
async function paraReenviar(nodo, buf, tipo) {
  const o = delOriginal(nodo);
  if (tipo === 'audio') {
    delete o.jpegThumbnail; delete o.width; delete o.height; delete o.gifPlayback;
    return o;
  }
  delete o.waveform;
  if (o.jpegThumbnail) return o;
  if (!Buffer.isBuffer(buf)) return tipo === 'video' ? { jpegThumbnail: null, ...o } : o;
  if (tipo === 'video') {
    if (buf.length > VIDEO_PARA_MINIATURA) return { jpegThumbnail: null, ...o };
    return { ...(await deVideo(buf)), ...o };
  }
  return { ...(await deFoto(buf)), ...o };
}

// Los primeros 512 KB de un fichero, para leer su cabecera sin cargarlo.
function cabeceraDe(ruta) {
  let fd;
  try {
    fd = fs.openSync(String(ruta), 'r');
    const buf = Buffer.alloc(512 * 1024);
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    return buf.subarray(0, n);
  } catch { return null; } finally { if (fd !== undefined) try { fs.closeSync(fd); } catch { /* nada */ } }
}

module.exports = {
  deFoto, deVideo, delOriginal, paraReenviar, dimensiones, sondear, LADO,
  _leerInfo: leerInfo, _olvidar: () => sondeados.clear(), _sondeados: sondeados,
};
