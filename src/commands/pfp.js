const axios = require('axios');
const { getTarget } = require('../utils/wa');

// !pfp @user — fetch profile picture and send to group
async function cmdPfp(sock, msg) {
  const jid = msg.key.remoteJid;
  const target = getTarget(msg);

  if (!target) {
    return sock.sendMessage(jid, { text: 'Menciona o responde a alguien con !pfp.' }, { quoted: msg });
  }

  let url;
  try {
    url = await sock.profilePictureUrl(target, 'image');
  } catch {
    return sock.sendMessage(jid, { text: 'Este usuario no tiene foto de perfil visible.' }, { quoted: msg });
  }

  let imageBuffer;
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
    imageBuffer = Buffer.from(res.data);
  } catch {
    return sock.sendMessage(jid, { text: 'No pude descargar la foto de perfil.' }, { quoted: msg });
  }

  const num = target.split('@')[0];
  await sock.sendMessage(jid, {
    image: imageBuffer,
    caption: `@${num}`,
    mentions: [target],
  }, { quoted: msg });
}

module.exports = { cmdPfp };
