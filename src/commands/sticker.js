const { imageToSticker, videoToSticker, gifToSticker, generateAnimatedThumb, generateSourceThumb, isAnimatedWebP, detectExt, MAX_STICKER_BYTES, infoDe, anatomiaWebp, stickerLargoDePrueba, TOPE_PRUEBA_S } = require('../utils/sticker');
const fs = require('fs-extra');
const path = require('path');
const { tempFile, cleanTemp, atomicWriteJson, readJsonOrEnoent } = require('../utils/helpers');
const { getSender, isOwner, isMainOwner, dueñoEnPrivado } = require('../utils/wa');
const { cobrar, devolver, textoSinSaldo } = require('../utils/auraCobro');
const { incrementStat } = require('../utils/state');
const { clasificar, bajar, NO_ENTREGADA, SIN_CLAVE_CITA } = require('../utils/verUnaVez');
const logger = require('../utils/logger');
const stickerSonido = require('../utils/stickerSonido');

// Identify what kind of media is in a message object.
// Anything already in WebP is functionally an existing sticker no matter which
// envelope it travelled in — a saved sticker re-shared as a plain image/video/
// document attachment (mimetype image/webp) is still re-stamp-only content.
// Classifying by envelope alone let a member bypass the owner-only re-stamp gate
// below by just re-sending someone else's sticker as a "file" instead of tapping
// it from the sticker tray, so format wins over envelope here.
// `type` es el tipo SEMÁNTICO (qué hay dentro, para decidir la conversión) y
// `dl` el que hay que pasarle a la descarga. No siempre coinciden: un archivo
// se cifra con claves de Document, y pedirlo como image o video baja basura.
// La clasificación vive en utils/verUnaVez.js, que es quien baja de verdad.
//
// LO DE VER UNA VEZ SE INTENTA SIEMPRE. El 10 oct se le puso a *!s* una
// negativa —«las fotos de ver una vez no me llegan, mandala normal»— que
// saltaba antes de intentarlo, y el dueño la tumbó al día siguiente. El fallo
// vuelve a decir «No pude descargar eso», nunca esa negativa.
function identifyMedia(messageObject) {
  return clasificar(messageObject);
}

async function bajarMedio(sock, msg, found, origen) {
  return bajar(sock, msg, found, origen);
}

// LOS FALLOS, PARA `npm run estado` (25 nov). El dueño: «falla al inyectársela
// a stickers con audio». «Falla», desde el grupo, no dice dónde: si no baja, si
// no convierte, si no se manda o si el sonido no sale. Los 20 últimos.
const FALLOS_FILE = path.join(__dirname, '../../data/stickerFallos.json');
async function apuntarFallo(que, motivo) {
  try {
    const lista = await readJsonOrEnoent(FALLOS_FILE, []).catch(() => []);
    const nueva = (Array.isArray(lista) ? lista : []).slice(-19);
    nueva.push({ t: Date.now(), que, motivo: String(motivo || '').split('\n')[0].slice(0, 160) });
    await atomicWriteJson(FALLOS_FILE, nueva);
  } catch { /* solo es para mirar */ }
}

// LO QUE SALIÓ DE CADA STICKER ANIMADO, PARA `npm run estado` (25 nov). El
// dueño: «parece que el bot no hace stickers de más de 5 segundos». Desde el
// grupo no se sabe si lo hizo corto el bot o si lo corta el teléfono: aquí
// queda lo que duraba el vídeo y lo que dura el sticker, con sus fps, su
// calidad, su peso y si llevó sonido (ver infoDe). Los 20 últimos.
const HECHOS_FILE = path.join(__dirname, '../../data/stickerHechos.json');
async function apuntarHecho(ficha) {
  try {
    const lista = await readJsonOrEnoent(HECHOS_FILE, []).catch(() => []);
    const nueva = (Array.isArray(lista) ? lista : []).slice(-19);
    nueva.push({ t: Date.now(), ...ficha });
    await atomicWriteJson(HECHOS_FILE, nueva);
  } catch { /* solo es para mirar */ }
}

// LA ANATOMÍA DE CADA STICKER QUE BAJA EL BOT, NADA MÁS BAJARLO (27 nov). El
// dueño, con la grabación de un sticker con sonido de unos 25 s que va fluido:
// «verifica cómo es posible hacerlos». Con *!s* o *!s2* sobre uno así, el bot
// lo baja, y antes de tocarlo apunta cómo está hecho (ver anatomiaWebp) y lo
// que dura su sonido, salga después bien o mal. Los 10 últimos.
const ANATOMIA_FILE = path.join(__dirname, '../../data/stickerAnatomia.json');
async function apuntarAnatomia(a) {
  try {
    const lista = await readJsonOrEnoent(ANATOMIA_FILE, []).catch(() => []);
    const nueva = (Array.isArray(lista) ? lista : []).slice(-9);
    nueva.push({ t: Date.now(), ...a });
    await atomicWriteJson(ANATOMIA_FILE, nueva);
  } catch { /* solo es para mirar */ }
}

// Para el log: con esto se sabe si el fallo es de la cita (sin clave) o de la red.
function pistaClave(m) {
  return `clave ${m?.mediaKey ? 'sí' : 'no'}, ruta ${m?.directPath || m?.url ? 'sí' : 'no'}`;
}

// *!s* SIN SONIDO Y *!s2* CON SONIDO (25 nov). El dueño: «separa los stickers
// de audio de los que no; el de audio será !s2». *!s* nunca lleva sonido, ni
// al volver a sellar uno que lo tenía; *!s2* saca el del vídeo, o se queda el
// que ya traía el sticker. Si no hay sonido que poner (una foto, un vídeo mudo
// o sin pista), *!s2* hace el sticker de siempre: es lo que se puede hacer.
async function cmdSticker(sock, msg, groupMeta) {
  return hacerSticker(sock, msg, groupMeta, { conSonido: false });
}

async function cmdStickerSonido(sock, msg, groupMeta) {
  return hacerSticker(sock, msg, groupMeta, { conSonido: true });
}

async function hacerSticker(sock, msg, groupMeta, { conSonido = false } = {}) {
  const jid = msg.key.remoteJid;
  const orden = conSonido ? '*!s2*' : '*!s*';
  // Fallback chain: WhatsApp display name → sender phone number → "Anonimo".
  // Critically NOT msg.key.remoteJid, which in groups is the GROUP jid.
  const senderJid = getSender(msg);
  const author = msg.pushName?.trim() || senderJid.split('@')[0].split(':')[0] || 'Anonimo';
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  // Find media in current message or quoted message
  let found = identifyMedia(msg.message);
  let origen = 'propio';
  if (!found && quoted) { found = identifyMedia(quoted); origen = 'cita'; }

  if (!found) {
    return sock.sendMessage(jid, {
      text: conSonido ? 'Manda un vídeo con *!s2* (o responde a uno).' : 'Manda una foto o un vídeo con *!s* (o responde a uno).',
    }, { quoted: msg });
  }
  const eraVerUnaVez = found.verUnaVez || found.msg?.viewOnce === true;

  // Re-stamping an existing sticker rewrites its pack metadata with the bot's
  // author tag — only the owner may do that, so members can't hijack/rebrand
  // stickers they didn't make. Members can still turn images/videos into stickers.
  if (found.type === 'sticker' && !isOwner(senderJid, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, {
      text: conSonido ? 'Para un sticker con sonido, manda un vídeo con *!s2*.' : 'Para hacer un sticker, manda una foto o un vídeo con *!s*.',
    }, { quoted: msg });
  }

  // Cobro. Va aqui a proposito: despues de comprobar que hay medio y que la
  // conversion esta permitida, para que nadie pague por un mensaje de error, y
  // antes de bajar el archivo y levantar ffmpeg, que es lo que cuesta de verdad.
  // Si algo falla despues, se devuelve.
  const pago = await cobrar(jid, senderJid, 'sticker', { fromMe: msg.key.fromMe, groupMeta });
  if (!pago.ok) {
    return sock.sendMessage(jid, { text: textoSinSaldo('sticker', pago, jid) }, { quoted: msg });
  }
  const reembolsar = () => devolver(jid, senderJid, pago, 'sticker')
    .catch((e) => logger.unaVez('devolver aura (sticker)', e));

  let buffer;
  try {
    buffer = await bajarMedio(sock, msg, found, origen);
  } catch (err) {
    logger.error(`Sticker download error${eraVerUnaVez ? ' (ver una vez)' : ''} [${origen}, ${pistaClave(found.msg)}]: ${err.message}`);
    apuntarFallo(`bajar (${found.type}, ${origen})`, err.message);
    await reembolsar();
    if (err?.sinClaveEnCita) return sock.sendMessage(jid, { text: SIN_CLAVE_CITA }, { quoted: msg });
    if (err?.noEntregada) return sock.sendMessage(jid, { text: NO_ENTREGADA }, { quoted: msg });
    return sock.sendMessage(jid, { text: 'No pude descargar eso. Prueba otra vez.' }, { quoted: msg });
  }

  // SIN «Haciendo sticker...» (25 nov). Salía con cada animado y se quedaba en
  // el chat, y a los 6 s llegaba además el aviso de progreso de su fila
  // (`espera`, utils/progreso.js), que se borra solo al acabar. Queda ese: lo
  // que tarda poco no avisa y lo que tarda no avisa dos veces.

  // Miniatura del origen y el encode son independientes: en paralelo se
  // ahorra el tiempo de la miniatura (un frame) sin tocar la calidad del WebP.
  // El ffmpeg empaquetado no decodifica su propio WebP animado, así que la
  // miniatura hay que sacarla del mp4/gif original; si falta, WhatsApp apila
  // dos fotogramas y el sticker se ve partido.
  // ─── EL MEDIO SE ESCRIBE UNA VEZ, NO DOS ──────────────────────────────────
  //
  // La miniatura y el sticker necesitan los mismos bytes en un fichero, y cada
  // uno escribia SU copia: dos temporales de hasta 24 MB para el mismo video, en
  // una maquina de 1 GB. Medido con uno de 22,6 MB: +54 MB de pico contra +19
  // escribiendo una sola vez.
  //
  // Se escribe aqui, se les pasa el camino a los dos, y se borra al final pase
  // lo que pase. Los dos lo LEEN, ninguno lo toca.
  let rutaOrigen = null;
  let sourceThumb = null;
  let stickerBuffer;
  // STICKERS CON SONIDO (24 nov, utils/stickerSonido.js), solo con *!s2*. El
  // sonido se saca en paralelo, del mismo temporal. Un sticker con sonido que
  // se vuelve a sellar con *!s2* conserva el suyo: se baja y se sube otra vez
  // con el sticker (25 nov, ver sonidoDeSticker), también en paralelo.
  // Si la cita no lo trae, el que el bot vio llegar con ese id (ver recordar).
  const idCitado = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
  const audioSuyo = conSonido && found.type === 'sticker'
    ? (stickerSonido.audioDe(found.msg) || (origen === 'cita' ? stickerSonido.recordado(idCitado) : null))
    : null;
  if (conSonido && found.type === 'sticker' && !audioSuyo) {
    // Sin esto, un *!s2* sin sonido no dejaba rastro: no se sabía si el
    // sticker no lo tenía, si la cita no lo traía o si no se vio llegar.
    const claves = Object.keys(quoted || {}).filter((k) => k !== 'messageContextInfo').join(',') || 'nada';
    const dondeMsg = origen === 'cita' ? quoted : msg.message;
    const campos = (x) => (Array.isArray(x) ? x.join(',') : '?');
    apuntarFallo('buscar su sonido', `${origen === 'cita' ? 'la cita' : 'el mensaje'} no trae audio (${claves}; campos del mensaje ${campos(dondeMsg?.[stickerSonido.CAMPOS])}; del sticker ${campos(found.msg?.[stickerSonido.CAMPOS])}) y no vi llegar ese sticker con sonido`);
  }
  let sonido = null;
  // LA PRUEBA DEL DUEÑO (27 nov, ver stickerLargoDePrueba): su *!s* y su *!s2*
  // sobre un vídeo de más de 10 s salen hasta 30 s, a los fps del vídeo y sin
  // el tope de 1 MB, y con *!s2* el sonido entero. Sin decidir: es para mirarlo
  // en su teléfono. A nadie más le cambia nada.
  const pruebaDueño = found.type === 'video'
    && (isMainOwner(senderJid, Boolean(msg.key.fromMe), groupMeta) || dueñoEnPrivado(msg));
  // La anatomía de un sticker que llega, antes de tocarlo (ver anatomiaWebp).
  const origenSt = found.type === 'sticker' ? anatomiaWebp(buffer) : null;
  if (origenSt) {
    const suSonido = stickerSonido.audioDe(found.msg) || (origen === 'cita' ? stickerSonido.recordado(idCitado) : null);
    await apuntarAnatomia({ ...origenSt, orden: conSonido ? 's2' : 's', sonidoSeg: Number(suSonido?.seconds) || null });
  }
  try {
    if (found.type === 'video') {
      rutaOrigen = tempFile(detectExt(buffer) || 'mp4');
      await fs.writeFile(rutaOrigen, buffer);
      const convertir = pruebaDueño
        ? stickerLargoDePrueba(buffer, author, rutaOrigen).then((largo) => largo || videoToSticker(buffer, author, rutaOrigen))
        : videoToSticker(buffer, author, rutaOrigen);
      [sourceThumb, stickerBuffer, sonido] = await Promise.all([
        generateSourceThumb(rutaOrigen).catch(() => null),
        convertir,
        conSonido ? stickerSonido.sonidoDe(rutaOrigen, ...(pruebaDueño ? [TOPE_PRUEBA_S, { tope: TOPE_PRUEBA_S }] : [])).catch((e) => {
          logger.warn(`sticker con sonido: no saqué el sonido (${e.message})`);
          apuntarFallo('sacar el sonido del vídeo', e.message);
          return null;
        }) : null,
      ]);
    } else if (found.type === 'sticker') {
      // Re-encode existing sticker to re-stamp metadata with our pack
      // SE MIRA EL FICHERO, NO LA ETIQUETA. `isAnimated` lo pone WhatsApp en el
      // proto del sticker, pero un .webp animado que llega como imagen o como
      // documento no trae ese campo y su mimetype es 'image/webp' a secas: se
      // colaba por la rama de los estaticos. Los bytes no mienten y el detector
      // ya existe —se usa doce lineas mas abajo para el mensaje de salida.
      const mime = found.msg.mimetype || '';
      const isAnimated = found.msg.isAnimated === true || mime.includes('animated')
        || isAnimatedWebP(buffer);
      [stickerBuffer, sonido] = await Promise.all([
        isAnimated ? videoToSticker(buffer, author) : imageToSticker(buffer, author),
        audioSuyo ? stickerSonido.sonidoDeSticker(audioSuyo).catch((e) => {
          logger.warn(`sticker con sonido: no pude bajar el suyo (${e.message})`);
          apuntarFallo('bajar el sonido del sticker', e.message);
          return null;
        }) : null,
      ]);
    } else {
      const mime = found.msg.mimetype || '';
      if (mime.includes('gif')) {
        // Mismo trato que el video: un solo temporal para los dos. Un GIF pesa
        // menos, pero la razon es la misma y tener dos caminos distintos para lo
        // mismo es como se desincronizan.
        rutaOrigen = tempFile(detectExt(buffer) || 'gif');
        await fs.writeFile(rutaOrigen, buffer);
        [sourceThumb, stickerBuffer] = await Promise.all([
          generateSourceThumb(rutaOrigen).catch(() => null),
          gifToSticker(buffer, author, rutaOrigen),
        ]);
      } else {
        stickerBuffer = await imageToSticker(buffer, author);
      }
    }
  } catch (err) {
    logger.error(`Sticker conversion error: ${err.message}`);
    apuntarFallo(`convertir (${found.type})`, err.message);
    await reembolsar();
    // La prueba del dueño falla a la vista: no cae al sticker de siempre.
    const texto = /^prueba larga/.test(err.message || '')
      ? 'No me salió el sticker largo de prueba.'
      : 'No pude convertir eso en sticker. Prueba con otra foto o vídeo.';
    return sock.sendMessage(jid, { text: texto }, { quoted: msg });
  } finally {
    // El temporal compartido se borra aqui, salga bien o mal: es el unico sitio
    // por el que pasan los dos caminos.
    if (rutaOrigen) await cleanTemp(rutaOrigen).catch(() => {});
  }

  try {
    if (!stickerBuffer || stickerBuffer.length < 100) {
      throw new Error('Sticker generado vacío');
    }
    const animated = isAnimatedWebP(stickerBuffer);
    // Re-stamping an existing animated sticker (found.type === 'sticker') skips
    // the whole encode/tiering pipeline — it's a metadata-only EXIF rewrite, so
    // it never gets a chance to shrink an already-oversized import from a less
    // strict source. Catch that here instead of silently shipping a sticker
    // WhatsApp may refuse to upload or that recipients can't save.
    const ficha = infoDe(stickerBuffer);
    if (animated && stickerBuffer.length > MAX_STICKER_BYTES && !ficha?.prueba) {
      await reembolsar();
      return sock.sendMessage(jid, {
        text: `Ese sticker pesa demasiado para WhatsApp. Si tienes el vídeo o el GIF del que salió, mándalo con ${orden}.`,
      }, { quoted: msg });
    }
    // sourceThumb (from original video/gif) takes priority; fall back to the
    // WebP-based extractor for re-stamped stickers (where we have no source).
    const pngThumbnail = animated
      ? (sourceThumb || await generateAnimatedThumb(stickerBuffer).catch(() => null))
      : undefined;
    let salioConSonido = false;
    let falloSonido = null;
    if (conSonido && sonido) {
      try {
        await stickerSonido.enviar(sock, jid, { sticker: stickerBuffer, isAnimated: animated, pngThumbnail, sonido, citado: msg });
        salioConSonido = true;
      } catch (e) {
        logger.warn(`sticker con sonido: no salió, va sin sonido (${e.message})`);
        apuntarFallo('mandar con sonido', e.message);
        falloSonido = String(e.message || e).split('\n')[0].slice(0, 120);
      }
    }
    if (!salioConSonido) {
      await sock.sendMessage(jid, {
        sticker: stickerBuffer,
        ...(animated && { isAnimated: true }),
        ...(pngThumbnail && { pngThumbnail }),
      }, { quoted: msg });
    }
    incrementStat('stickersCreated');
    const resumen = ficha ? `, ${ficha.entra ?? '?'} s → ${ficha.sale} s a ${ficha.fps ?? '?'} fps, ${ficha.px} px q${ficha.q}${ficha.fpsBajados ? ', fps bajados' : ''}${ficha.recortado ? ', recortado' : ''}${ficha.prueba ? ', prueba larga' : ''}` : '';
    logger.success(`Sticker enviado (${found.type}, ${stickerBuffer.length} bytes, animated=${animated}, thumb=${!!pngThumbnail}, sonido=${salioConSonido}${resumen})`);
    // Lo que salió, con el sonido que se mandó de verdad (o por qué no). Un
    // sticker que llegó y se vuelve a sellar tal cual no tiene ficha de la
    // escalera: va con lo que pesa, y su anatomía ya está apuntada.
    if (ficha) {
      await apuntarHecho({
        ...ficha,
        de: found.type,
        orden: conSonido ? 's2' : 's',
        sonido: salioConSonido,
        ...(salioConSonido && sonido?.segundos && { sonidoSeg: sonido.segundos }),
        ...(falloSonido && { sonidoFallo: falloSonido }),
      });
    }
  } catch (err) {
    logger.error(`Sticker send error: ${err.message}`);
    apuntarFallo('mandar', err.message);
    await reembolsar();
    await sock.sendMessage(jid, { text: 'No pude enviar el sticker. Prueba otra vez.' }, { quoted: msg });
  }
}

module.exports = { cmdSticker, cmdStickerSonido };
