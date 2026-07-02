const axios = require('axios');
const { getSender, isOwner, isGroupAdmin, canonicalJid, bareJid } = require('../utils/wa');
const { resolveTarget } = require('./pfp');
const { computeHash } = require('../utils/phash');
const { recordAndMatch, markFake } = require('../utils/pfpStore');

const DAY = 86400000;

function shortAcc(acc) {
  const id = String(acc).split('@')[0];
  const isLid = String(acc).endsWith('@lid');
  return (isLid ? '@' : '+') + id;
}

// Construye los enlaces de búsqueda inversa. Google Lens / Yandex / Bing /
// TinEye aceptan la imagen por parámetro ?url= → enlace de un toque. FaceCheck y
// Lenso NO tienen deep-link por URL: hay que subir/pegar la imagen a mano, así
// que damos el sitio + la URL pública de la foto para pegar (y va adjunta arriba).
function reverseLinks(imgUrl) {
  const u = encodeURIComponent(imgUrl);
  return (
    `🔎 *Búsqueda inversa (1 toque):*\n` +
    `• Google Lens: https://lens.google.com/uploadbyurl?url=${u}\n` +
    `• Yandex: https://yandex.com/images/search?rpt=imageview&url=${u}\n` +
    `• Bing: https://www.bing.com/images/search?view=detailv2&iss=sbi&q=imgurl:${u}\n` +
    `• TinEye: https://tineye.com/search?url=${u}\n\n` +
    `🧑 *Reconocimiento facial (sube la foto de arriba):*\n` +
    `• FaceCheck: https://facecheck.id\n` +
    `• Lenso: https://lenso.ai`
  );
}

function verdictFromMatches(matches, targetAcc, presentSet, now) {
  if (!matches.length) return '✅ Foto sin coincidencias en el historial del bot.';

  const fake = matches.filter(m => m.fake);
  const live = matches.filter(m => !m.fake && m.account !== targetAcc && presentSet.has(m.account));
  const past = matches.filter(m => !m.fake && m.account !== targetAcc && !presentSet.has(m.account));

  const lines = [];
  if (fake.length) {
    lines.push(`🚨 *FOTO MARCADA COMO FAKE* — coincide con una foto ya reportada.`);
  }
  if (live.length) {
    const who = [...new Set(live.map(m => shortAcc(m.account)))].join(', ');
    lines.push(`⚠️ *Misma foto que otro miembro presente ahora:* ${who} → posible multicuenta o suplantación.`);
  }
  if (past.length) {
    const who = [...new Set(past.map(m => shortAcc(m.account)))].join(', ');
    const days = Math.max(0, Math.round((now - Math.min(...past.map(m => m.firstSeen || now))) / DAY));
    lines.push(`🕒 *Foto reciclada:* ya la usó ${who} (vista hace ~${days}d, ya no está aquí o es de otro grupo) → posible robo de identidad.`);
  }
  return lines.join('\n');
}

// !verificar @user | !verificar wa.me/<num> — trae la foto, la compara contra el
// historial de huellas del bot y adjunta enlaces de búsqueda inversa gratuitos.
async function cmdVerify(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;

  const { jid: target, error } = await resolveTarget(sock, msg, args);
  if (error) return sock.sendMessage(jid, { text: error }, { quoted: msg });

  let url;
  try {
    url = await sock.profilePictureUrl(target, 'image');
  } catch {
    return sock.sendMessage(jid, {
      text: 'Sin foto visible → no puedo hacer búsqueda inversa. Una cuenta sin foto ya es señal de sospecha.',
    }, { quoted: msg });
  }

  let buf;
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer', timeout: 10000,
      maxContentLength: 20 * 1024 * 1024, maxBodyLength: 20 * 1024 * 1024,
    });
    buf = Buffer.from(res.data);
  } catch {
    return sock.sendMessage(jid, { text: 'No pude descargar la foto de perfil.' }, { quoted: msg });
  }

  const now = Date.now();
  const targetAcc = canonicalJid(target);

  // Detección local (gratis) contra el historial de huellas.
  let verdict = '';
  try {
    const hash = await computeHash(buf);
    const group = jid.endsWith('@g.us') ? jid : null;
    const matches = await recordAndMatch(group, targetAcc, hash, now);

    const presentSet = new Set(
      (groupMeta?.participants || []).flatMap(p =>
        [p.id, p.lid, p.phoneNumber].filter(Boolean).map(canonicalJid)
      )
    );
    verdict = verdictFromMatches(matches, targetAcc, presentSet, now);
  } catch {
    verdict = '⚠️ No pude calcular la huella local (ffmpeg). Solo búsqueda inversa disponible.';
  }

  const num = target.split('@')[0];
  const caption =
    `*VERIFICACIÓN* ${target.endsWith('@s.whatsapp.net') ? '+' : '@'}${num}\n\n` +
    `${verdict}\n\n` +
    `${reverseLinks(url)}\n\n` +
    `_Herramienta anti-suplantación. Los resultados son indicios, no prueba._`;

  await sock.sendMessage(jid, { image: buf, caption, mentions: [target] }, { quoted: msg });
}

// !marcarfake — responde/menciona a alguien (o pásalo por número) para marcar su
// foto actual como fake en el historial. Solo admins/owner: envenena el store.
async function cmdMarkFake(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);
  const allowed = isOwner(sender, msg.key.fromMe, groupMeta)
    || isGroupAdmin(sender, msg.key.fromMe, groupMeta);
  if (!allowed) {
    return sock.sendMessage(jid, { text: 'Solo admins pueden marcar fotos como fake.' }, { quoted: msg });
  }

  const { jid: target, error } = await resolveTarget(sock, msg, args);
  if (error) return sock.sendMessage(jid, { text: error }, { quoted: msg });

  let buf;
  try {
    const url = await sock.profilePictureUrl(target, 'image');
    const res = await axios.get(url, {
      responseType: 'arraybuffer', timeout: 10000,
      maxContentLength: 20 * 1024 * 1024, maxBodyLength: 20 * 1024 * 1024,
    });
    buf = Buffer.from(res.data);
  } catch {
    return sock.sendMessage(jid, { text: 'No pude obtener la foto de ese usuario.' }, { quoted: msg });
  }

  try {
    const hash = await computeHash(buf);
    await recordAndMatch(jid.endsWith('@g.us') ? jid : null, canonicalJid(target), hash);
    const n = await markFake(hash);
    return sock.sendMessage(jid, {
      text: `✅ Foto marcada como fake (${n} registro${n === 1 ? '' : 's'}). Si reaparece con otra cuenta, saltará la alerta.`,
    }, { quoted: msg });
  } catch {
    return sock.sendMessage(jid, { text: 'No pude calcular la huella (ffmpeg).' }, { quoted: msg });
  }
}

module.exports = { cmdVerify, cmdMarkFake };
