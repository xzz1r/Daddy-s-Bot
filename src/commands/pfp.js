const axios = require('axios');
const { getTarget } = require('../utils/wa');

// Extrae un número de teléfono de texto libre: acepta wa.me/<num>,
// https://wa.me/<num>, api.whatsapp.com/send?phone=<num>, +34 600..., o el
// número pelado con espacios/guiones. Devuelve solo los dígitos, o null si no
// hay un número plausible (mínimo 7 dígitos, para no tragar basura).
function extractNumber(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  // phone= de los enlaces api.whatsapp.com/send?phone=...
  const phoneParam = s.match(/[?&]phone=(\d[\d\s\-+]*)/i);
  if (phoneParam) s = phoneParam[1];
  const digits = s.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  return digits;
}

// Resuelve el objetivo del !pfp a un JID. Prioridad:
//   1) mención o respuesta (lo más fiable: ya viene con el JID real).
//   2) número / enlace wa.me en el texto → valida con onWhatsApp para obtener
//      el JID canónico (y confirmar que la cuenta existe).
// Devuelve { jid, error }. Si error viene con texto, es un mensaje ya listo
// para enviar al usuario.
async function resolveTarget(sock, msg, args) {
  const mentioned = getTarget(msg);
  if (mentioned) return { jid: mentioned };

  const raw = (args || []).join(' ').trim();
  if (!raw) {
    return {
      error:
        'Uso: menciona o responde a alguien, o pasa un número/enlace.\n\n' +
        'Ejemplos:\n' +
        '`!pfp @usuario`\n' +
        '`!pfp wa.me/33753345861`\n' +
        '`!pfp +33 7 53 34 58 61`',
    };
  }

  // Un @username de WhatsApp que NO es un contacto/mención real no se puede
  // resolver por API todavía (Baileys aún no expone la búsqueda por username).
  // Si llega como texto suelto tipo "@algo" sin dígitos, avisamos claro.
  if (/^@?[a-z][a-z0-9._]*$/i.test(raw) && !/\d{7,}/.test(raw)) {
    return {
      error:
        'Por ahora la búsqueda por @username no está disponible vía API de WhatsApp.\n' +
        'Usa el número o el enlace wa.me mientras tanto:\n' +
        '`!pfp wa.me/33753345861`',
    };
  }

  const digits = extractNumber(raw);
  if (!digits) {
    return { error: 'No reconocí un número válido ahí. Prueba `!pfp wa.me/33753345861`.' };
  }

  // onWhatsApp confirma que el número tiene cuenta y devuelve su JID canónico.
  try {
    const res = await sock.onWhatsApp(`${digits}@s.whatsapp.net`);
    const hit = Array.isArray(res) ? res.find(r => r?.exists) : null;
    if (hit?.jid) return { jid: hit.jid };
    return { error: `El número +${digits} no tiene cuenta de WhatsApp (o no es visible).` };
  } catch {
    // Si onWhatsApp falla (red, rate-limit), intentamos igual con el JID crudo;
    // profilePictureUrl dará su propio error si no existe.
    return { jid: `${digits}@s.whatsapp.net` };
  }
}

// !pfp @user | !pfp wa.me/<num> | !pfp <num> — trae la foto de perfil.
async function cmdPfp(sock, msg, args) {
  const jid = msg.key.remoteJid;

  const { jid: target, error } = await resolveTarget(sock, msg, args);
  if (error) {
    return sock.sendMessage(jid, { text: error }, { quoted: msg });
  }

  let url;
  try {
    url = await sock.profilePictureUrl(target, 'image');
  } catch {
    return sock.sendMessage(jid, { text: 'Este usuario no tiene foto de perfil o la tiene oculta.' }, { quoted: msg });
  }

  let imageBuffer;
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      maxContentLength: 20 * 1024 * 1024,
      maxBodyLength: 20 * 1024 * 1024,
    });
    imageBuffer = Buffer.from(res.data);
  } catch {
    return sock.sendMessage(jid, { text: 'No pude descargar la foto de perfil.' }, { quoted: msg });
  }

  const num = target.split('@')[0];
  const isPhone = target.endsWith('@s.whatsapp.net');
  await sock.sendMessage(jid, {
    image: imageBuffer,
    caption: isPhone ? `+${num}` : `@${num}`,
    mentions: [target],
  }, { quoted: msg });
}

module.exports = { cmdPfp };
