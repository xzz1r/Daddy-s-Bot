const axios = require('axios');
const { getTarget, getSender, canonicalJid, fetchPfpUrl } = require('../utils/wa');
const { cobrar, devolver, textoSinSaldo } = require('../utils/auraCobro');
const { computeHash } = require('../utils/phash');
const { recordAndMatch } = require('../utils/pfpStore');
const pfpCache = require('../utils/pfpCache');

function fechaCorta(ts) {
  if (!ts) return '';
  try { return new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return ''; }
}

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
        '`!pfp wa.me/34600000000`\n' +
        '`!pfp +34 600 00 00 00`',
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
        '`!pfp wa.me/34600000000`',
    };
  }

  const digits = extractNumber(raw);
  if (!digits) {
    return { error: 'No reconocí un número válido ahí. Prueba `!pfp wa.me/34600000000`.' };
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

// Descarga los bytes de una URL de foto de perfil. null si falla.
async function downloadPfp(url) {
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      maxContentLength: 20 * 1024 * 1024,
      maxBodyLength: 20 * 1024 * 1024,
    });
    return Buffer.from(res.data);
  } catch { return null; }
}

// !pfp @user | !pfp wa.me/<num> | !pfp <num> | !pfp (a ti mismo) — trae la foto
// de perfil. Si está oculta/no visible, cae a la última foto conocida guardada
// en caché (de cuando el bot la vio en algún momento).
async function cmdPfp(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;

  // Consultar la foto de otro cuesta aura: cada !pfp es una peticion a los
  // servidores de WhatsApp y era el comando mas facil de disparar en bucle.
  const quienPide = getSender(msg);
  const pago = await cobrar(jid, quienPide, 'pfp', { fromMe: msg.key.fromMe, groupMeta });
  if (!pago.ok) {
    return sock.sendMessage(jid, { text: textoSinSaldo('pfp', pago) }, { quoted: msg });
  }
  // Se cobra al entrar, pero solo se cobra de verdad si el bot entrega algo.
  // Si no hay a quien mirar, o si la consulta falla por red, se devuelve: nadie
  // paga por un mensaje de error que ademas le va a obligar a repetir.
  const reembolsar = () => devolver(jid, quienPide, pago.pagado).catch(() => {});

  // Sin mención ni argumentos → tu propia foto.
  const hasMention = !!getTarget(msg);
  const hasArgs = !!((args || []).join(' ').trim());
  let target, error;
  if (!hasMention && !hasArgs) {
    target = getSender(msg);
  } else {
    ({ jid: target, error } = await resolveTarget(sock, msg, args));
    if (error) {
      await reembolsar();
      return sock.sendMessage(jid, { text: error }, { quoted: msg });
    }
  }

  const num = target.split('@')[0];
  const isPhone = target.endsWith('@s.whatsapp.net');
  const tag = isPhone ? `+${num}` : `@${num}`;
  const acc = canonicalJid(target);

  // 1) Intento la foto actual.
  //
  // `fetchPfpUrl` distingue "confirmado sin foto" (devuelve null) de un fallo
  // pasajero de red/límite de peticiones (lanza). Antes cualquier hipo se
  // trataba igual que "no tiene foto" y el bot afirmaba con seguridad algo que
  // en realidad no había podido comprobar — de ahí que pareciera fallar al
  // azar con cuentas que sí tenían foto visible.
  let imageBuffer = null;
  let falloPasajero = false;
  try {
    const url = await fetchPfpUrl(sock, target, 'image');
    if (url) {
      imageBuffer = await downloadPfp(url);
      // WhatsApp confirmó que la foto existe (devolvió una URL real); si la
      // descarga en sí falla, eso tampoco es "sin foto".
      if (!imageBuffer) falloPasajero = true;
    }
  } catch {
    falloPasajero = true;
  }

  if (imageBuffer) {
    // Alimenta el historial de huellas y, SOLO si la cuenta es sospechosa o muy
    // activa, guarda la foto reducida en caché (para mostrarla si luego la
    // ocultan). Todo en segundo plano, sin bloquear la respuesta.
    const group = jid.endsWith('@g.us') ? jid : null;
    computeHash(imageBuffer)
      .then(hash => recordAndMatch(group, acc, hash))
      .then(matches => pfpCache.maybeStore({ group, rawJid: target, account: acc, matches }, imageBuffer))
      .catch(() => {});
    return sock.sendMessage(jid, {
      image: imageBuffer,
      caption: tag,
      mentions: [target],
    }, { quoted: msg });
  }

  // 2) Sin foto actual → última conocida en caché. La leyenda dice la verdad
  // según el caso: si fue un fallo pasajero, no se afirma que esté oculta.
  const cached = await pfpCache.get(acc).catch(() => null);
  if (cached?.buf?.length) {
    return sock.sendMessage(jid, {
      image: cached.buf,
      caption: falloPasajero
        ? `${tag}\n_No pude comprobar la foto actual ahora mismo — esta es la última que se conoce, del ${fechaCorta(cached.lastSeen)}._`
        : `${tag}\n_Foto oculta ahora — última vista el ${fechaCorta(cached.lastSeen)}._`,
      mentions: [target],
    }, { quoted: msg });
  }

  // 3) Nada guardado. Un fallo pasajero NO es lo mismo que "confirmado sin
  // foto": lo primero se dice como lo que es, sin afirmar de más.
  // Un fallo pasajero se devuelve (habra que repetir la consulta); un "no tiene
  // foto" confirmado no, porque ahi el bot si hizo el trabajo y dio la respuesta.
  if (falloPasajero) await reembolsar();
  return sock.sendMessage(jid, {
    text: falloPasajero
      ? `No pude comprobar la foto de ${tag} ahora mismo (fallo de red o límite de peticiones). Probá de nuevo en un momento.`
      : `${tag} no tiene foto de perfil visible, y el bot nunca la vio antes para guardarla.`,
    mentions: [target],
  }, { quoted: msg });
}

module.exports = { cmdPfp, resolveTarget, extractNumber };
