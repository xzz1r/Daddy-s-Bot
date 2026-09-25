// ─── UN ADMIN VACIANDO EL GRUPO ─────────────────────────────────────────────
//
// Lo pidio el dueño: «si un admin da mas de 5 baneos en menos de 5 minutos, el
// bot le quite admin como medida de seguridad». Despues lo fijo en la QUINTA:
// a la quinta expulsion en menos de cinco minutos, fuera el admin.
//
// Y es de las pocas guardas que protegen contra algo que NO es un miembro
// molesto: un admin al que le han robado la cuenta, o uno que se enfada y
// decide vaciar el grupo. En los dos casos el daño se hace en menos de un
// minuto y no hay forma de deshacerlo a mano a esa velocidad. Quitarle el rango
// no devuelve a nadie, pero corta la hemorragia en el quinto en vez de en el
// cuarenta.
//
// POR GRUPO Y POR PERSONA, no global: dos admins echando a uno cada uno en
// grupos distintos no es una purga, y sumarlos seria castigar a dos inocentes
// por coincidir en el reloj.
//
// La ventana es DESLIZANTE y se mide sobre las expulsiones, no sobre los
// eventos: WhatsApp manda un solo evento cuando se echa a varios de golpe, asi
// que contar eventos dejaria pasar exactamente el caso que esto para — al que
// selecciona a veinte y le da a expulsar una vez.

const TOPE = 5;                       // a la quinta
const VENTANA_MS = 5 * 60 * 1000;     // en menos de cinco minutos
const MAX_RECORDADOS = 500;           // techo del mapa en un proceso 24/7

const golpes = new Map();             // 'grupo|autor' -> [marcas de tiempo]

function clave(groupJid, autor) {
  return `${groupJid}|${String(autor).split('@')[0].split(':')[0]}`;
}

// Devuelve { purga, total }. `purga` es true la vez que se llega al tope, y
// solo esa vez: despues se olvida, porque lo que viene detras es el degradado y
// no tiene sentido volver a anunciarlo con cada evento que llegue tarde.
function apuntarExpulsiones(groupJid, autor, cuantas = 1) {
  if (!groupJid || !autor || cuantas < 1) return { purga: false, total: 0 };
  const k = clave(groupJid, autor);
  const ahora = Date.now();

  if (golpes.size >= MAX_RECORDADOS && !golpes.has(k)) {
    golpes.delete(golpes.keys().next().value);
  }

  const previos = (golpes.get(k) || []).filter((t) => ahora - t < VENTANA_MS);
  for (let i = 0; i < cuantas; i++) previos.push(ahora);
  golpes.set(k, previos);

  if (previos.length >= TOPE) {
    golpes.delete(k);
    return { purga: true, total: previos.length };
  }
  return { purga: false, total: previos.length };
}

// ─── LA DECISION ENTERA, EN UN SITIO QUE SE PUEDE PROBAR ────────────────────
//
// Las guardas viven AQUI y no en el manejador de eventos a proposito. En bot.js
// no hay forma de conducir `group-participants.update` sin abrir un socket de
// verdad, asi que todo lo que se quedara alli se quedaba sin prueba — y las
// guardas son justo la parte donde un fallo se paga caro: degradar al dueño por
// limpiar el grupo, o que el bot se degrade a si mismo por sus propios baneos
// del antilink.
//
// Devuelve `actuar` solo cuando hay que quitar el rango. Lo que viene despues
// —degradar y decirlo— se queda en bot.js, que es de quien es el socket.
function decidirPurga({ groupJid, autor, cuantas, esBot, esDelDueno }) {
  if (!groupJid || !autor || !cuantas || cuantas < 1) return { actuar: false, total: 0 };
  // El bot echa gente por su cuenta —antilink, antifake, historias— y contarlo
  // acabaria con el bot degradandose a si mismo.
  if (esBot) return { actuar: false, total: 0 };
  // Y el tier dueño limpia el grupo cuando le da la gana: para eso es suyo.
  if (esDelDueno) return { actuar: false, total: 0 };
  const { purga, total } = apuntarExpulsiones(groupJid, autor, cuantas);
  return { actuar: purga, total };
}

function olvidar(groupJid, autor) {
  golpes.delete(clave(groupJid, autor));
}

function _reset() { golpes.clear(); }

module.exports = { apuntarExpulsiones, decidirPurga, olvidar, TOPE, VENTANA_MS, _reset };
