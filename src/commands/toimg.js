// ─── POR QUE TODOS LOS ENVIOS DE VIDEO LLEVAN `jpegThumbnail: null` ────────
//
// Baileys genera la miniatura EL SOLO cuando ese campo viene `undefined` — su
// `requiresThumbnailComputation` mira exactamente eso (Utils/messages.js) — y
// para un video la genera lanzando SU PROPIO ffmpeg, por fuera del semaforo que
// este bot usa para no tener nunca dos ffmpeg peleandose por el unico core.
//
// Medido: 39 ms en un mp4 de 8 s y 87 ms en uno de 22 MB. No es mucho tiempo;
// lo grave es que rompe la garantia justo cuando la maquina esta ocupada, que
// es cuando alguien esta esperando su sticker.
//
// Con `null` no se genera nada. `acciones.js` y `utils/redes.js` ya lo hacen
// asi; aqui faltaba en los cuatro envios.

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const { ffmpegPath } = require('../utils/ffmpeg');
const { tempFile, cleanTemp, streamToBuffer, ffmpegSemaphore, MAX_MEDIA_BYTES } = require('../utils/helpers');
const { desmontarWebpAnimado, isAnimatedWebP, extractFirstAnmfFrame } = require('../utils/sticker');
const { getSender } = require('../utils/wa');
const { cobrar, devolver, textoSinSaldo } = require('../utils/auraCobro');
const logger = require('../utils/logger');

ffmpeg.setFfmpegPath(ffmpegPath);

// Hard kill a stuck ffmpeg after this long (matches sticker.js).
const FFMPEG_TIMEOUT_MS = 45_000;

// Busca el primer medio utilizable dentro de un mensaje.
//
// Esta función es la razón por la que *!toimg* fallaba a ratos sin motivo
// aparente. La versión anterior miraba `stickerMessage`, `imageMessage` y
// `videoMessage` a pelo, y solo abría el envoltorio de "ver una vez" un nivel.
// Se le escapaban cuatro casos que en un grupo normal pasan todos los días:
//
//   · ephemeralMessage — en un chat con mensajes temporales TODO va envuelto
//     ahí dentro, así que el sticker existía pero el bot contestaba "responde
//     con !toimg a un sticker". Este es el que más se nota.
//   · viewOnce metido DENTRO de ephemeral (los dos envoltorios a la vez).
//   · documentMessage con mimetype de imagen o vídeo: una foto reenviada como
//     archivo, que es como llegan muchas cosas de otras apps.
//   · ptvMessage — la nota de vídeo redonda.
//
// `dl` es aparte de `type` porque la clave de descifrado se deriva del tipo con
// el que se PIDE la descarga: un adjunto enviado como archivo hay que bajarlo
// como 'document' aunque por dentro sea una imagen. Pedirlo como 'image' deriva
// la clave equivocada y baja bytes ilegibles.
const MAX_CAPAS = 5;

function desenvolver(m) {
  let cur = m;
  let viewOnce = false;
  for (let i = 0; i < MAX_CAPAS && cur; i++) {
    if (cur.viewOnceMessage || cur.viewOnceMessageV2 || cur.viewOnceMessageV2Extension) viewOnce = true;
    const dentro =
      cur.ephemeralMessage?.message ||
      cur.viewOnceMessage?.message ||
      cur.viewOnceMessageV2?.message ||
      cur.viewOnceMessageV2Extension?.message ||
      cur.documentWithCaptionMessage?.message ||
      cur.editedMessage?.message;
    if (!dentro) break;
    cur = dentro;
  }
  return { m: cur, viewOnce };
}

function findMedia(raw) {
  if (!raw) return null;
  const { m, viewOnce } = desenvolver(raw);
  if (!m) return null;

  if (m.stickerMessage) return { type: 'sticker', dl: 'sticker', data: m.stickerMessage, viewOnce };
  if (m.imageMessage)   return { type: 'image',   dl: 'image',   data: m.imageMessage,   viewOnce };
  if (m.videoMessage)   return { type: 'video',   dl: 'video',   data: m.videoMessage,   viewOnce };
  if (m.ptvMessage)     return { type: 'video',   dl: 'video',   data: m.ptvMessage,     viewOnce };

  const doc = m.documentMessage;
  const mime = doc?.mimetype || '';
  if (doc && mime.startsWith('image/')) return { type: 'image', dl: 'document', data: doc, viewOnce };
  if (doc && mime.startsWith('video/')) return { type: 'video', dl: 'document', data: doc, viewOnce };

  return null;
}

// El contextInfo con el mensaje citado NO siempre vive en extendedTextMessage:
// si respondes poniendo *!toimg* como pie de una foto, viaja dentro del propio
// imageMessage. Se recorren todos los nodos en vez de dar por hecho uno.
function medioCitado(msg) {
  const { m } = desenvolver(msg?.message);
  for (const nodo of [msg?.message, m]) {
    if (!nodo) continue;
    for (const k of Object.keys(nodo)) {
      const citado = nodo[k]?.contextInfo?.quotedMessage;
      if (citado) {
        const hallado = findMedia(citado);
        if (hallado) return hallado;
      }
    }
  }
  return null;
}

// Medio a convertir: primero el citado (el caso normal, responder a algo) y si
// no, el que venga en el propio mensaje.
function medioObjetivo(msg) {
  return medioCitado(msg) || findMedia(msg?.message);
}

async function runFfmpegConvert(inputFile, outputFile, opts) {
  await ffmpegSemaphore.acquire();
  try {
    return await new Promise((resolve, reject) => {
      let stderrBuf = '';
      let timer = null;
      const cmd = ffmpeg(inputFile)
        .setFfmpegPath(ffmpegPath)
        .outputOptions(opts.outputOptions)
        .toFormat(opts.format)
        .on('stderr', l => { stderrBuf += l + '\n'; })
        .on('error', (err) => {
          if (timer) clearTimeout(timer);
          const last = stderrBuf.trim().split('\n').slice(-4).join(' | ');
          reject(new Error(last || err.message));
        })
        .on('end', () => { if (timer) clearTimeout(timer); resolve(); });
      timer = setTimeout(() => { try { cmd.kill('SIGKILL'); } catch {} reject(new Error('ffmpeg timeout')); }, FFMPEG_TIMEOUT_MS);
      cmd.save(outputFile);
    });
  } finally {
    ffmpegSemaphore.release();
  }
}

async function convertToJpeg(inputBuf) {
  const inputFile = tempFile('webp');
  const outputFile = tempFile('jpg');
  await fs.writeFile(inputFile, inputBuf);
  try {
    await runFfmpegConvert(inputFile, outputFile, {
      // -q:v 1 = máxima calidad JPEG (sin pérdida perceptible) para conservar
      // la imagen del sticker lo más fiel posible.
      outputOptions: ['-vframes', '1', '-q:v', '1'],
      format: 'mjpeg',
    });
    const buf = await fs.readFile(outputFile);
    if (buf.length < 100) throw new Error('JPEG vacío');
    return buf;
  } finally {
    await cleanTemp(inputFile);
    await cleanTemp(outputFile);
  }
}

// Monta el MP4 a partir de los fotogramas ya sacados del WebP. Cada uno entra
// como su propia entrada con su duracion, igual que el pase de fotos de
// utils/redes.js y por el mismo motivo: el demuxer `concat` da por hecho que
// todas las entradas miden lo mismo y se come las que no.
async function mp4DeCuadros(desmontado) {
  const { cuadros } = desmontado;
  const sueltos = [];
  const salida = tempFile('mp4');
  try {
    for (let i = 0; i < cuadros.length; i++) {
      const f = tempFile('webp');
      await fs.writeFile(f, cuadros[i].webp);
      sueltos.push(f);
    }
    const args = ['-hide_banner', '-loglevel', 'error', '-y'];
    for (let i = 0; i < sueltos.length; i++) {
      // La duracion la dice el propio fichero; 100 ms es lo que pone libwebp
      // cuando no la trae, que es el mismo valor que usa el visor de WhatsApp.
      const seg = Math.max(0.02, (cuadros[i].ms || 100) / 1000);
      args.push('-loop', '1', '-t', seg.toFixed(3), '-i', sueltos[i]);
    }
    const cadena = 'scale=trunc(iw/2)*2:trunc(ih/2)*2,setsar=1,fps=25,format=yuv420p';
    const pasos = sueltos.map((_, i) => `[${i}:v]${cadena}[v${i}]`);
    pasos.push(`${sueltos.map((_, i) => `[v${i}]`).join('')}concat=n=${sueltos.length}:v=1:a=0[v]`);
    args.push('-filter_complex', pasos.join(';'), '-map', '[v]',
      '-c:v', 'libx264', '-crf', '12', '-preset', 'veryfast',
      '-movflags', 'faststart', '-an', salida);

    await ffmpegSemaphore.acquire();
    try {
      await new Promise((resolve, reject) => {
        const proc = spawn(ffmpegPath, args);
        let err = '';
        const matar = setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} reject(new Error('timeout')); }, 90000);
        proc.stderr?.on('data', (d) => { err += d.toString(); });
        proc.on('error', (e) => { clearTimeout(matar); reject(e); });
        proc.on('close', (c) => {
          clearTimeout(matar);
          if (c === 0) resolve();
          else reject(new Error(err.trim().split('\n').pop() || `codigo ${c}`));
        });
      });
    } finally {
      ffmpegSemaphore.release();
    }
    const buf = await fs.readFile(salida);
    return buf.length > 100 ? buf : null;
  } catch (e) {
    logger.unaVez('tovid desde los fotogramas del webp', e);
    return null;
  } finally {
    for (const f of sueltos) await cleanTemp(f);
    await cleanTemp(salida);
  }
}

// Convierte un WebP animado a MP4 (H.264). pix_fmt yuv420p + dimensiones pares
// son obligatorios para que WhatsApp y la mayoría de reproductores lo lean. Sin
// audio (los stickers no lo tienen). Depende de que el ffmpeg del sistema tenga
// el demuxer de WebP animado (el mismo que usa la conversión a GIF de !toimg).
async function convertToMp4(inputBuf) {
  // ─── EL CAMINO QUE HACE QUE ESTO FUNCIONE DE VERDAD ───────────────────────
  //
  // El dueño: «lo de /tovid nunca ha funcionado con stickers, con videos
  // funciona bien». Y no era cosa de su maquina: ffmpeg NO SABE abrir un WebP
  // animado. Comprobado con el binario del bot — un WebP estatico lo decodifica
  // sin problema y uno animado no lo abre ni a secas, ni con `-f webp_pipe`, ni
  // forzando `-c:v libwebp`. O sea que el `runFfmpegConvert` de abajo fallaba
  // SIEMPRE y el comando caia a su respaldo de «no se pudo convertir».
  //
  // La salida es partir el fichero nosotros: cada fotograma de un WebP animado
  // va dentro del contenedor ya comprimido, y envuelto en una cabecera RIFF
  // minima es un WebP ESTATICO, que ffmpeg si abre. Se sacan todos con sus
  // duraciones y se montan en fila.
  //
  // Si el sticker viene con fotogramas PARCHE —trozos mas pequeños que el
  // lienzo— no se toca: componer eso pide decodificar el VP8 aqui dentro, y
  // ponerlos en fila daria un video con las piezas descolocadas. En ese caso se
  // deja pasar al camino de siempre, que fallara, y el comando hara lo que ya
  // hacia. Mejor eso que un video mal hecho.
  const desmontado = desmontarWebpAnimado(inputBuf);
  if (desmontado && desmontado.completos && desmontado.cuadros.length > 1) {
    const mp4 = await mp4DeCuadros(desmontado);
    if (mp4) return mp4;
  }

  const inputFile = tempFile('webp');
  const outputFile = tempFile('mp4');
  await fs.writeFile(inputFile, inputBuf);
  try {
    await runFfmpegConvert(inputFile, outputFile, {
      // CRF 12 = calidad casi sin pérdida visible. El preset solo cambia
      // cuánto tarda el encode, no el CRF: veryfast en un VPS de 1 GB recorta
      // varios segundos de !tovid sin bajar la calidad visual.
      outputOptions: [
        '-movflags', 'faststart',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-crf', '12',
        '-preset', 'veryfast',
        '-an',
      ],
      format: 'mp4',
    });
    const buf = await fs.readFile(outputFile);
    if (buf.length < 100) throw new Error('MP4 vacío');
    return buf;
  } finally {
    await cleanTemp(inputFile);
    await cleanTemp(outputFile);
  }
}

// !tovid — como !toimg pero al revés: convierte un sticker ANIMADO a video (MP4),
// o reenvía un video (incl. de una sola visualización) como video normal.
async function cmdToVid(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const senderJid = getSender(msg);

  const media = medioObjetivo(msg);

  if (!media) {
    return sock.sendMessage(jid, {
      text: 'Responde con !tovid a un sticker animado o a un video.',
    }, { quoted: msg });
  }

  const pago = await cobrar(jid, senderJid, 'tovid', { fromMe: msg.key.fromMe, groupMeta });
  if (!pago.ok) {
    return sock.sendMessage(jid, { text: textoSinSaldo('tovid', pago, jid) }, { quoted: msg });
  }
  const reembolsar = () => devolver(jid, senderJid, pago.pagado).catch(() => {});

  try {
    const stream = await downloadContentFromMessage(media.data, media.dl || media.type);
    const buf = await streamToBuffer(stream, MAX_MEDIA_BYTES);

    if (media.type === 'sticker') {
      if (!isAnimatedWebP(buf)) {
        await reembolsar();
        return sock.sendMessage(jid, {
          text: 'Ese sticker no es animado. Para stickers estáticos usa !toimg.',
        }, { quoted: msg });
      }
      try {
        const mp4 = await convertToMp4(buf);
        await sock.sendMessage(jid, { video: mp4, mimetype: 'video/mp4', gifPlayback: true, jpegThumbnail: null }, { quoted: msg });
      } catch (err) {
        logger.warn(`tovid MP4 failed (${err.message.slice(0, 80)}), enviando el WebP`);
        await sock.sendMessage(jid, {
          document: buf,
          mimetype: 'image/webp',
          fileName: 'sticker.webp',
          caption: 'No se pudo convertir a video. Aquí el archivo del sticker animado.',
        }, { quoted: msg });
      }
    } else if (media.type === 'video') {
      const caption = media.viewOnce ? 'Video extraído de visualización única.' : undefined;
      await sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', caption, jpegThumbnail: null }, { quoted: msg });
    } else {
      // imagen u otro: no aplica para video
      await reembolsar();
      await sock.sendMessage(jid, {
        text: 'Eso no es un sticker animado ni un video. Usa !toimg para imágenes y stickers estáticos.',
      }, { quoted: msg });
    }
  } catch (err) {
    logger.error(`tovid error: ${err.message}`);
    await reembolsar();
    await sock.sendMessage(jid, { text: 'No pude convertir a video. Prueba con otro sticker o video.' }, { quoted: msg });
  }
}

// !toimg — reply to a sticker, view-once image/video, or any media to extract it
async function cmdToImg(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const senderJid = getSender(msg);

  const media = medioObjetivo(msg);

  if (!media) {
    return sock.sendMessage(jid, {
      text: 'Responde con !toimg a un sticker, una foto o una foto de una sola visualización.',
    }, { quoted: msg });
  }

  const pago = await cobrar(jid, senderJid, 'toimg', { fromMe: msg.key.fromMe, groupMeta });
  if (!pago.ok) {
    return sock.sendMessage(jid, { text: textoSinSaldo('toimg', pago, jid) }, { quoted: msg });
  }
  const reembolsar = () => devolver(jid, senderJid, pago.pagado).catch(() => {});

  try {
    const stream = await downloadContentFromMessage(media.data, media.dl || media.type);
    const buf = await streamToBuffer(stream, MAX_MEDIA_BYTES);

    if (media.type === 'sticker') {
      if (isAnimatedWebP(buf)) {

        // 1. Animado → MP4 en bucle (si el ffmpeg de turno sabe demuxear WebP animado).
        //
        // MP4, no GIF: el `gifPlayback` de WhatsApp NO reproduce bytes de GIF, es
        // un MP4 que el cliente pone en bucle y sin sonido. Aquí se generaba un
        // GIF de verdad y se anunciaba como `video/mp4`, así que al destinatario
        // le llegaba un archivo que no podía reproducir.
        let sent = false;
        try {
          const mp4 = await convertToMp4(buf);
          await sock.sendMessage(jid, { video: mp4, gifPlayback: true, mimetype: 'video/mp4', jpegThumbnail: null }, { quoted: msg });
          sent = true;
        } catch (err) {
          logger.warn(`toimg MP4 failed (${err.message.slice(0, 80)}), trying frame extraction`);
        }

        // 2. Extract first frame directly from ANMF chunk — bypasses ffmpeg animated-WebP decoder
        if (!sent) {
          try {
            const frameBuf = extractFirstAnmfFrame(buf);
            if (frameBuf) {
              const jpg = await convertToJpeg(frameBuf);
              await sock.sendMessage(jid, {
                image: jpg,
                caption: 'Primer fotograma del sticker animado.',
              }, { quoted: msg });
              sent = true;
            }
          } catch (err) {
            logger.warn(`toimg first-frame extraction failed: ${err.message}`);
          }
        }

        // 3. Last resort: send raw animated WebP as a downloadable file
        if (!sent) {
          try {
            await sock.sendMessage(jid, {
              document: buf,
              mimetype: 'image/webp',
              fileName: 'sticker.webp',
              caption: 'No se pudo convertir. Aquí el archivo WebP del sticker animado.',
            }, { quoted: msg });
          } catch (err) {
            logger.error(`toimg document fallback failed: ${err.message}`);
            await reembolsar();
            await sock.sendMessage(jid, { text: 'No se pudo convertir ni enviar el sticker animado.' }, { quoted: msg });
          }
        }

      } else {
        const jpg = await convertToJpeg(buf);
        await sock.sendMessage(jid, { image: jpg }, { quoted: msg });
      }

    } else if (media.type === 'image') {
      const caption = media.viewOnce ? 'Foto extraída de visualización única.' : undefined;
      await sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
    } else if (media.type === 'video') {
      const caption = media.viewOnce ? 'Video extraído de visualización única.' : undefined;
      await sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', caption, jpegThumbnail: null }, { quoted: msg });
    }
  } catch (err) {
    logger.error(`toimg error: ${err.message}`);
    await reembolsar();
    await sock.sendMessage(jid, { text: 'No pude extraer el contenido. Prueba con otro archivo.' }, { quoted: msg });
  }
}

module.exports = { cmdToImg, cmdToVid, findMedia, medioObjetivo, _convertToMp4: convertToMp4, _mp4DeCuadros: mp4DeCuadros };
