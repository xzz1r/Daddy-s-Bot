// Los @usuarios de WhatsApp. Todo lo que el bot sabe de ellos vive aqui.
//
// WhatsApp esta repartiendo nombres de usuario: una persona deja de ser un
// numero y pasa a ser "@algo". Para el bot eso cambia dos cosas, y las dos
// pegan justo donde mas duele — en !p y !purge, que son los que vetan.
//
// 1. UN @USUARIO NO ES UN TELEFONO, Y SE LE PARECE LO SUFICIENTE PARA COLARSE.
//    El parser de numeros arranca los digitos de lo que le echen, asi que
//    "@juan1234567" se leia como el telefono +1234567: una cuenta que no tiene
//    nada que ver, purgada de todos los grupos y metida en la lista negra,
//    mientras el que se queria echar se quedaba dentro. Dos fallos de una vez
//    en el comando mas destructivo del bot.
//
// 2. UN @USUARIO NO ES UNA IDENTIDAD. Se cambia cuando uno quiere, y al
//    borrarlo WhatsApp lo guarda catorce dias y luego lo suelta para el
//    siguiente. Vetar "@juan" seria vetar a quien lo herede dentro de un mes.
//    Por eso el usuario SOLO sirve para encontrar la cuenta; lo que se veta es
//    siempre el LID y el telefono, que no se cambian.
//
// Las reglas son las de WhatsApp, no inventadas: 3 a 35 caracteres, minusculas,
// digitos, punto y guion bajo, al menos UNA letra —un usuario no puede ser solo
// numeros, que es justo lo que salva al parser de telefonos—, sin empezar por
// "www." ni acabar en dominio.
const LARGO_MIN = 3;
const LARGO_MAX = 35;
const FORMA = /^[a-z0-9._]+$/;

function normalizar(raw) {
  if (!raw) return null;
  const s = String(raw).trim().replace(/^@+/, '').toLowerCase();
  return s || null;
}

// ¿Esto puede ser un @usuario de WhatsApp?
function esUsuario(raw) {
  const s = normalizar(raw);
  if (!s) return false;
  if (s.length < LARGO_MIN || s.length > LARGO_MAX) return false;
  if (!FORMA.test(s)) return false;
  // Sin una letra es un numero, y un numero es un telefono. Esta linea es la
  // que impide que "@573001234567" deje de purgarse como lo que es.
  if (!/[a-z]/.test(s)) return false;
  if (s.startsWith('www.')) return false;
  if (/\.(com|net|org)$/.test(s)) return false;
  if (s.startsWith('.') || s.endsWith('.')) return false;
  return true;
}

// Los @usuarios que hay escritos en un texto.
//
// Se piden con arroba A PROPOSITO. Sin ella, cualquier palabra con letras y
// digitos —"reglas2024", "grupo1"— pasaria por usuario y el que escribe no
// tiene forma de decir que NO lo es. Con arroba lo dice quien escribe.
function extraerUsuarios(texto) {
  if (!texto) return [];
  const out = [];
  const visto = new Set();
  for (const m of String(texto).matchAll(/@([A-Za-z0-9._]{3,35})/g)) {
    const u = normalizar(m[1]);
    if (!u || visto.has(u) || !esUsuario(u)) continue;
    visto.add(u);
    out.push(u);
  }
  return out;
}

// El mismo texto con los @usuarios tapados, para que el parser de telefonos no
// vea sus digitos.
//
// Se tapa con un espacio y no con nada: pegar los dos lados fusionaria dos
// numeros de renglones distintos, que es el fallo que ya costo una purga de 33
// cuentas con 19 fantasmas dentro.
//
// Los enlaces wa.me y api.whatsapp.com se quedan intactos sin hacer nada: no
// llevan arroba, asi que esto ni los mira. Aqui vivio una guarda que los
// esquivaba a proposito y no hacia nada — se quita para que no parezca que
// protege algo.
function sinUsuarios(texto) {
  if (!texto) return texto;
  return String(texto).replace(/@([A-Za-z0-9._]{3,35})/g, (todo, u) => (esUsuario(u) ? ' ' : todo));
}

// ─── LO QUE EL BOT VA APRENDIENDO ────────────────────────────────────────────
//
// La metadata del grupo trae el usuario de cada participante, pero puede estar
// vieja. Los mensajes lo traen fresco en cada uno, asi que se apunta al vuelo.
// Es un mapa en memoria y no un fichero: si el bot se reinicia se vuelve a
// llenar solo con el primer mensaje de cada uno, y guardarlo en disco seria
// guardar un dato que caduca sin avisar.
const MAX_RECORDADOS = 2000;
const porUsuario = new Map();

function recordarUsuario(jid, username) {
  const u = normalizar(username);
  if (!u || !jid || !esUsuario(u)) return;
  // Se reinserta para que el Map mantenga el orden de uso: el primero es el
  // mas viejo y es el que cae cuando hay que hacer sitio.
  porUsuario.delete(u);
  porUsuario.set(u, String(jid));
  if (porUsuario.size > MAX_RECORDADOS) {
    porUsuario.delete(porUsuario.keys().next().value);
  }
}

function jidDeUsuario(username) {
  const u = normalizar(username);
  return u ? (porUsuario.get(u) || null) : null;
}

// El participante de algun grupo que lleva ese @usuario.
//
// Manda la metadata SOBRE lo aprendido: si alguien solto el usuario y otro lo
// cogio, la metadata trae al dueño de ahora y el mapa al de antes.
function buscarEnGrupos(grupos, username) {
  const u = normalizar(username);
  if (!u) return null;
  for (const meta of Object.values(grupos || {})) {
    for (const p of (meta?.participants || [])) {
      if (p && normalizar(p.username) === u) return p;
    }
  }
  return null;
}

// Lo que trae un mensaje: en grupo va el del que escribe, en privado el del
// otro lado. Los nombres son de Baileys (key.participantUsername y
// key.remoteJidUsername), no del bot.
function aprenderDeMensaje(msg) {
  const k = msg?.key;
  if (!k) return;
  if (k.participantUsername) recordarUsuario(k.participant || k.participantAlt, k.participantUsername);
  if (k.remoteJidUsername && !String(k.remoteJid || '').endsWith('@g.us')) {
    recordarUsuario(k.remoteJid, k.remoteJidUsername);
  }
}

function aprenderDeGrupo(meta) {
  for (const p of (meta?.participants || [])) {
    if (p?.username) recordarUsuario(p.id, p.username);
  }
}

function _resetUsuarios() { porUsuario.clear(); }

module.exports = {
  esUsuario,
  extraerUsuarios,
  sinUsuarios,
  recordarUsuario,
  jidDeUsuario,
  buscarEnGrupos,
  aprenderDeMensaje,
  aprenderDeGrupo,
  _resetUsuarios,
};
