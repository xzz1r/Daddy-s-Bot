const { imageToSticker, videoToSticker, gifToSticker } = require('../utils/sticker');
const { incrementStat } = require('../utils/state');
const logger = require('../utils/logger');

async function cmdSticker(sock, msg) {
  const jid = msg.key.remoteJid;
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const directMsg = msg.message;

  // Determine the media source
  let mediaMsg = null;
  let mediaType = null;

  const checkMsg = (m) => {
    if (m?.imageMessage) return { msg: m.imageMessage, type: 'image' };
    if (m?.videoMessage) return { msg: m.videoMessage, type: 'video' };
    if (m?.stickerMessage) return { msg: m.stickerMessage, type: 'sticker' };
    if (m?.documentMessage) {
      const mime = m.documentMessage.mimetype || '';
      if (mime.startsWith('image/')) return { msg: m.documentMessage, type: 'image' };
      if (mime.startsWith('video/')) return { msg: m.documentMessage, type: 'video' };
    }
    return null;
  };

  const found = checkMsg(directMsg) || (quoted ? checkMsg(quoted) : null);

  if (!found) {
    return sock.sendMessage(jid, {
      text: '❌ Envía o responde una imagen/video con *!s*\n\n📌 Formatos: jpg, png, gif, mp4 (máx 6s para sticker animado)',
    }, { quoted: msg });
  }

  mediaMsg = found.msg;
  mediaType = found.type;

  await sock.sendMessage(jid, { text: `⏳ Creando sticker ${mediaType === 'video' ? 'animado 60fps' : 'HD'}...` }, { quoted: msg });

  try {
    const { downloadMediaMessage } = require('@whiskeysockets/baileys');

    // Download media buffer
    const stream = await downloadMediaMessage(
      { message: mediaType === 'image' ? { imageMessage: mediaMsg }
          : mediaType === 'video' ? { videoMessage: mediaMsg }
          : mediaType === 'sticker' ? { stickerMessage: mediaMsg }
          : { documentMessage: mediaMsg } },
      'buffer',
      {},
      { logger: { level: 'silent', child: () => ({ level: 'silent', info: () => {}, error: () => {}, debug: () => {}, warn: () => {}, trace: () => {}, fatal: () => {} }) } }
    );

    const buffer = Buffer.isBuffer(stream) ? stream : Buffer.from(stream);

    let stickerBuffer;

    if (mediaType === 'video' || (mediaType === 'sticker' && mediaMsg.isAnimated)) {
      stickerBuffer = await videoToSticker(buffer);
    } else {
      // Check if it's a GIF via mime
      const mime = mediaMsg.mimetype || '';
      if (mime.includes('gif')) {
        stickerBuffer = await gifToSticker(buffer);
      } else {
        stickerBuffer = await imageToSticker(buffer);
      }
    }

    await sock.sendMessage(jid, {
      sticker: stickerBuffer,
    }, { quoted: msg });

    await incrementStat('stickersCreated');
    logger.success(`Sticker creado (${mediaType})`);
  } catch (err) {
    logger.error(`Sticker error: ${err.message}`);
    await sock.sendMessage(jid, { text: `❌ Error al crear sticker: ${err.message}` }, { quoted: msg });
  }
}

module.exports = { cmdSticker };
