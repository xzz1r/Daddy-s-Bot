const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { imageToSticker, videoToSticker, gifToSticker, generateAnimatedThumb, generateSourceThumb, isAnimatedWebP, MAX_STICKER_BYTES } = require('../utils/sticker');
const { streamToBuffer, MAX_MEDIA_BYTES } = require('../utils/helpers');
const { getSender, isOwner } = require('../utils/wa');
const { cobrar, devolver, textoSinSaldo } = require('../utils/auraCobro');
const { incrementStat } = require('../utils/state');
const logger = require('../utils/logger');

// Identify what kind of media is in a message object.
// Anything already in WebP is functionally an existing sticker no matter which
// envelope it travelled in — a saved sticker re-shared as a plain image/video/
// document attachment (mimetype image/webp) is still re-stamp-only content.
// Classifying by envelope alone let a member bypass the owner-only re-stamp gate
// below by just re-sending someone else's sticker as a "file" instead of tapping
// it from the sticker tray, so format wins over envelope here.
// `type` es el tipo SEMÁNTICO (qué hay dentro, para decidir la conversión) y
// `dl` el que hay que pasarle a downloadContentFromMessage.
//
// No siempre coinciden, y confundirlos rompe la descarga entera: la clave de
// descifrado sale de un HKDF cuyo "info" depende del tipo
// (Utils/messages-media.js:hkdfInfoKey sobre MEDIA_HKDF_KEY_MAPPING). Quien
// manda un archivo lo cifra con claves de *Document*; pedirlo como 'image' o
// 'video' deriva la clave equivocada y lo que se descarga es basura. Por eso
// un adjunto enviado como archivo nunca llegaba a hacerse sticker.
function identifyMedia(messageObject, depth = 0) {
  if (!messageObject || depth > 4) return null;
  if (messageObject.stickerMessage) return { msg: messageObject.stickerMessage, type: 'sticker', dl: 'sticker' };
  if (messageObject.imageMessage) {
    const mime = messageObject.imageMessage.mimetype || '';
    return { msg: messageObject.imageMessage, type: mime === 'image/webp' ? 'sticker' : 'image', dl: 'image' };
  }
  if (messageObject.videoMessage) {
    const mime = messageObject.videoMessage.mimetype || '';
    return { msg: messageObject.videoMessage, type: mime === 'image/webp' ? 'sticker' : 'video', dl: 'video' };
  }
  if (messageObject.documentMessage) {
    const mime = messageObject.documentMessage.mimetype || '';
    const doc = { msg: messageObject.documentMessage, dl: 'document' };
    if (mime === 'image/webp') return { ...doc, type: 'sticker' };
    if (mime.startsWith('image/')) return { ...doc, type: 'image' };
    if (mime.startsWith('video/')) return { ...doc, type: 'video' };
  }
  // Wrappers de "ver una vez" (v1 / v2 / v2 extension): una foto o video enviado
  // como vista única llega anidado. Lo desenvolvemos para que !s también funcione
  // sobre ellos, ya sea citándolos o mandándolos con el caption !s.
  const inner =
    messageObject.viewOnceMessage?.message ||
    messageObject.viewOnceMessageV2?.message ||
    messageObject.viewOnceMessageV2Extension?.message;
  if (inner) return identifyMedia(inner, depth + 1);
  return null;
}

async function cmdSticker(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  // Fallback chain: WhatsApp display name → sender phone number → "Anonimo".
  // Critically NOT msg.key.remoteJid, which in groups is the GROUP jid.
  const senderJid = getSender(msg);
  const author = msg.pushName?.trim() || senderJid.split('@')[0].split(':')[0] || 'Anonimo';
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  // Find media in current message or quoted message
  let found = identifyMedia(msg.message);
  if (!found && quoted) found = identifyMedia(quoted);

  if (!found) {
    return sock.sendMessage(jid, {
      text: 'Envía o responde una imagen o video con *!s*',
    }, { quoted: msg });
  }

  // Re-stamping an existing sticker rewrites its pack metadata with the bot's
  // author tag — only the owner may do that, so members can't hijack/rebrand
  // stickers they didn't make. Members can still turn images/videos into stickers.
  if (found.type === 'sticker' && !isOwner(senderJid, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, {
      text: 'Para hacer un sticker manda una imagen o un video con *!s*.',
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
  const reembolsar = () => devolver(jid, senderJid, pago.pagado).catch(() => {});

  let buffer;
  try {
    const stream = await downloadContentFromMessage(found.msg, found.dl || found.type);
    buffer = await streamToBuffer(stream, MAX_MEDIA_BYTES);

    if (!buffer || buffer.length < 100) {
      throw new Error('No se pudo descargar el archivo');
    }
  } catch (err) {
    logger.error(`Sticker download error: ${err.message}`);
    await reembolsar();
    return sock.sendMessage(jid, { text: 'No pude descargar eso. Prueba otra vez.' }, { quoted: msg });
  }

  // Fire notice before encoding — videos/GIFs can take several seconds on Termux.
  // Static images are near-instant so they don't need it.
  const willAnimate = found.type === 'video'
    || (found.msg.mimetype || '').includes('gif')
    || (found.type === 'sticker' && (found.msg.isAnimated === true || (found.msg.mimetype || '').includes('animated')));
  if (willAnimate) {
    sock.sendMessage(jid, { text: 'Haciendo sticker...' }, { quoted: msg }).catch(() => {});
  }

  // Miniatura del origen y el encode son independientes: en paralelo se
  // ahorra el tiempo de la miniatura (un frame) sin tocar la calidad del WebP.
  // El ffmpeg empaquetado no decodifica su propio WebP animado, así que la
  // miniatura hay que sacarla del mp4/gif original; si falta, WhatsApp apila
  // dos fotogramas y el sticker se ve partido.
  let sourceThumb = null;
  let stickerBuffer;
  try {
    if (found.type === 'video') {
      [sourceThumb, stickerBuffer] = await Promise.all([
        generateSourceThumb(buffer).catch(() => null),
        videoToSticker(buffer, author),
      ]);
    } else if (found.type === 'sticker') {
      // Re-encode existing sticker to re-stamp metadata with our pack
      const mime = found.msg.mimetype || '';
      const isAnimated = found.msg.isAnimated === true || mime.includes('animated');
      stickerBuffer = isAnimated
        ? await videoToSticker(buffer, author)
        : await imageToSticker(buffer, author);
    } else {
      const mime = found.msg.mimetype || '';
      if (mime.includes('gif')) {
        [sourceThumb, stickerBuffer] = await Promise.all([
          generateSourceThumb(buffer).catch(() => null),
          gifToSticker(buffer, author),
        ]);
      } else {
        stickerBuffer = await imageToSticker(buffer, author);
      }
    }
  } catch (err) {
    logger.error(`Sticker conversion error: ${err.message}`);
    await reembolsar();
    return sock.sendMessage(jid, { text: 'No pude convertir eso a sticker. Prueba con otra imagen o video.' }, { quoted: msg });
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
    if (animated && stickerBuffer.length > MAX_STICKER_BYTES) {
      await reembolsar();
      return sock.sendMessage(jid, {
        text: 'Ese sticker animado pesa demasiado para WhatsApp y no se puede recomprimir: viene en un formato que el bot no sabe reabrir. Si tienes el video o el GIF del que salió, mándalo con *!s* y se hace de nuevo desde ahí.',
      }, { quoted: msg });
    }
    // sourceThumb (from original video/gif) takes priority; fall back to the
    // WebP-based extractor for re-stamped stickers (where we have no source).
    const pngThumbnail = animated
      ? (sourceThumb || await generateAnimatedThumb(stickerBuffer).catch(() => null))
      : undefined;
    await sock.sendMessage(jid, {
      sticker: stickerBuffer,
      ...(animated && { isAnimated: true }),
      ...(pngThumbnail && { pngThumbnail }),
    }, { quoted: msg });
    incrementStat('stickersCreated');
    logger.success(`Sticker enviado (${found.type}, ${stickerBuffer.length} bytes, animated=${animated}, thumb=${!!pngThumbnail})`);
  } catch (err) {
    logger.error(`Sticker send error: ${err.message}`);
    await reembolsar();
    await sock.sendMessage(jid, { text: 'No pude enviar el sticker. Prueba otra vez.' }, { quoted: msg });
  }
}

module.exports = { cmdSticker };
