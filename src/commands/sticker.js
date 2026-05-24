const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { imageToSticker, videoToSticker, gifToSticker } = require('../utils/sticker');
const { incrementStat } = require('../utils/state');
const logger = require('../utils/logger');

// Map a media message key to the downloadContentFromMessage type
function getContentType(messageType) {
  switch (messageType) {
    case 'image': return 'image';
    case 'video': return 'video';
    case 'sticker': return 'sticker';
    case 'document': return 'document';
    default: return 'image';
  }
}

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

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function cmdSticker(sock, msg) {
  const jid = msg.key.remoteJid;
  const author = msg.pushName?.trim() || msg.key.remoteJid.split('@')[0];
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  // Find media in current message or quoted message
  let found = identifyMedia(msg.message);
  if (!found && quoted) found = identifyMedia(quoted);

  if (!found) {
    return sock.sendMessage(jid, {
      text: 'Envia o responde una imagen, video o sticker con *!s*\n\nFormatos: jpg, png, gif, webp, mp4 (max 6s)',
    }, { quoted: msg });
  }

  let buffer;
  try {
    const stream = await downloadContentFromMessage(found.msg, getContentType(found.type));
    buffer = await streamToBuffer(stream);

    if (!buffer || buffer.length < 100) {
      throw new Error('No se pudo descargar el archivo');
    }
  } catch (err) {
    logger.error(`Sticker download error: ${err.message}`);
    return sock.sendMessage(jid, { text: `Error descargando: ${err.message}` }, { quoted: msg });
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
    await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: msg });
    incrementStat('stickersCreated');
    logger.success(`Sticker enviado (${found.type}, ${stickerBuffer.length} bytes)`);
  } catch (err) {
    logger.error(`Sticker send error: ${err.message}`);
    await sock.sendMessage(jid, { text: `Error al enviar sticker: ${err.message}` }, { quoted: msg });
  }
}

module.exports = { cmdSticker };
