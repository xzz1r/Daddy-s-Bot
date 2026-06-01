const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { imageToSticker, videoToSticker, gifToSticker, generateAnimatedThumb, isAnimatedWebP } = require('../utils/sticker');
const { streamToBuffer } = require('../utils/helpers');
const { getSender, isOwner } = require('../utils/wa');
const { incrementStat } = require('../utils/state');
const logger = require('../utils/logger');

// Identify what kind of media is in a message object
function identifyMedia(messageObject) {
  if (!messageObject) return null;
  if (messageObject.imageMessage) return { msg: messageObject.imageMessage, type: 'image' };
  if (messageObject.videoMessage) return { msg: messageObject.videoMessage, type: 'video' };
  if (messageObject.stickerMessage) return { msg: messageObject.stickerMessage, type: 'sticker' };
  if (messageObject.documentMessage) {
    const mime = messageObject.documentMessage.mimetype || '';
    if (mime.startsWith('image/')) return { msg: messageObject.documentMessage, type: 'image' };
    if (mime.startsWith('video/')) return { msg: messageObject.documentMessage, type: 'video' };
  }
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
      text: 'Solo el owner puede convertir un sticker ya existente. Usa *!s* con una imagen o video.',
    }, { quoted: msg });
  }

  let buffer;
  try {
    const stream = await downloadContentFromMessage(found.msg, found.type);
    buffer = await streamToBuffer(stream);

    if (!buffer || buffer.length < 100) {
      throw new Error('No se pudo descargar el archivo');
    }
  } catch (err) {
    logger.error(`Sticker download error: ${err.message}`);
    return sock.sendMessage(jid, { text: `Error descargando: ${err.message}` }, { quoted: msg });
  }

  // Fire notice before encoding — videos/GIFs can take several seconds on Termux.
  // Static images are near-instant so they don't need it.
  const willAnimate = found.type === 'video'
    || (found.msg.mimetype || '').includes('gif')
    || (found.type === 'sticker' && (found.msg.isAnimated === true || (found.msg.mimetype || '').includes('animated')));
  if (willAnimate) {
    sock.sendMessage(jid, { text: 'Haciendo sticker...' }, { quoted: msg }).catch(() => {});
  }

  let stickerBuffer;
  try {
    if (found.type === 'video') {
      stickerBuffer = await videoToSticker(buffer, author);
    } else if (found.type === 'sticker') {
      // Re-encode existing sticker to re-stamp metadata with our pack
      const mime = found.msg.mimetype || '';
      const isAnimated = found.msg.isAnimated === true || mime.includes('animated');
      stickerBuffer = isAnimated
        ? await videoToSticker(buffer, author)
        : await imageToSticker(buffer, author);
    } else {
      const mime = found.msg.mimetype || '';
      stickerBuffer = mime.includes('gif')
        ? await gifToSticker(buffer, author)
        : await imageToSticker(buffer, author);
    }
  } catch (err) {
    logger.error(`Sticker conversion error: ${err.message}`);
    return sock.sendMessage(jid, { text: `Error al convertir: ${err.message}` }, { quoted: msg });
  }

  try {
    if (!stickerBuffer || stickerBuffer.length < 100) {
      throw new Error('Sticker generado vacio');
    }
    const animated = isAnimatedWebP(stickerBuffer);
    const pngThumbnail = animated ? await generateAnimatedThumb(stickerBuffer).catch(() => null) : undefined;
    await sock.sendMessage(jid, {
      sticker: stickerBuffer,
      ...(animated && { isAnimated: true }),
      ...(pngThumbnail && { pngThumbnail }),
    }, { quoted: msg });
    incrementStat('stickersCreated');
    logger.success(`Sticker enviado (${found.type}, ${stickerBuffer.length} bytes, animated=${animated}, thumb=${!!pngThumbnail})`);
  } catch (err) {
    logger.error(`Sticker send error: ${err.message}`);
    await sock.sendMessage(jid, { text: `Error al enviar sticker: ${err.message}` }, { quoted: msg });
  }
}

module.exports = { cmdSticker };
