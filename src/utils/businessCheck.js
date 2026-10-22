// Detección de cuentas Business.
//
// TRES ESTADOS, NO UN BOOLEANO. Este es el cambio de fondo y el motivo importa.
//
// Antes esto devolvía `isBiz: true/false`, y ahí se metían dos cosas que no son
// lo mismo: "he mirado y NO es Business" y "no he podido mirar". Las dos salían
// como `false`, o sea como cuenta personal. Y "no he podido mirar" pasa
// constantemente: un @lid sin teléfono en el mapa, un IQ que vence (Baileys
// devuelve `undefined` en vez de lanzar), un rate-limit de WhatsApp.
//
// El resultado era que la ignorancia se trataba como inocencia. Para un modo
// cuyo trabajo es echar suplantadores, eso no es prudencia: es el agujero.
//
//   'biz'      → hay prueba. Se expulsa.
//   'personal' → se consultó DE VERDAD y el perfil vino vacío. Se deja.
//   'desconocido' → no se pudo comprobar. NO se decide, se reintenta.
//
// Lo que NO cambia, porque ya costó caro: un nodo <profile> con solo `wid` es
// una cuenta NORMAL. WhatsApp lo manda a todo el mundo, y tratarlo como Business
// expulsó gente personal. Esa lección se queda.
//
// Y la segunda, del 22 oct: usar la app WhatsApp Business no es ser una
// empresa. Quien la usa de WhatsApp normal marca la categoría «No es una
// empresa», y contar cualquier categoría (o el nombre verificado de sus
// mensajes) como prueba la echaba y la vetaba. Aquí solo cuenta lo que rellena
// un negocio; ver más abajo.

// POLARIDAD DE LA CACHÉ. Antes era una hora para todo, y eso le daba salvoconducto
// a quien saliera 'personal' por un timeout. Una cuenta Business no deja de serlo
// en diez minutos, pero un "no lo es" que en realidad era un fallo de red sí
// caduca rápido. Lo desconocido no se cachea nunca.
const TTL_BIZ      = 12 * 60 * 60 * 1000;   // lo positivo aguanta
const TTL_PERSONAL = 5 * 60 * 1000;         // lo negativo, poco
const MAX_CACHE = 5000;
const cache = new Map(); // jid -> { value, ts }

function cacheSet(jid, value) {
  if (value.estado === 'desconocido') return;   // no se guarda lo que no se sabe
  if (cache.size >= MAX_CACHE) {
    // LRU: se saca el que lleva más tiempo sin consultarse, no el más viejo.
    let peor = null, peorTs = Infinity;
    for (const [k, v] of cache) if (v.visto < peorTs) { peorTs = v.visto; peor = k; }
    cache.delete(peor ?? cache.keys().next().value);
  }
  cache.set(jid, { value, ts: Date.now(), visto: Date.now() });
}

function cacheGet(jid) {
  const c = cache.get(jid);
  if (!c) return null;
  const ttl = c.value.estado === 'biz' ? TTL_BIZ : TTL_PERSONAL;
  if (Date.now() - c.ts >= ttl) { cache.delete(jid); return null; }
  c.visto = Date.now();
  return c.value;
}

// LA CATEGORÍA «NO ES UNA EMPRESA», en los idiomas en que puede llegar. El bot
// se presenta a WhatsApp en inglés («Not a Business»), pero el nombre puede
// venir en el idioma de la cuenta, y la API de Meta la llama NOT_A_BIZ.
const NO_ES_EMPRESA = /^not[\s_]+a[\s_]+biz|\bnot\s+a\s+business\b|\bno\s+es\s+(?:una?\s+)?(?:empresa|negocio)|\bn[ãa]o\s+[ée]\s+(?:uma?\s+)?(?:empresa|neg[óo]cio)|\bpas\s+une?\s+(?:entreprise|commerce)|\bkein\s+unternehmen|\bnon\s+[èe]\s+un/i;
// Y la que no es ninguna: la API de Meta tiene UNDEFINED para «sin definir».
const SIN_CATEGORIA = /^(?:undefined|none|null|sin\s+definir|no\s+definida)$/i;

// Núcleo. Devuelve { estado, fields } con el porqué, para que el dry-run del
// scan pueda enseñar la evidencia en vez de un sí/no a secas.
async function businessEvidence(sock, jid) {
  if (!jid || typeof jid !== 'string' || !jid.endsWith('@s.whatsapp.net')) {
    // Un @lid no admite la consulta de perfil. Eso NO quiere decir que sea una
    // cuenta personal: quiere decir que por aquí no se puede saber. Antes esto
    // devolvía "no es Business" y era la puerta principal.
    return { estado: 'desconocido', fields: [], motivo: 'sin teléfono: la consulta de perfil no acepta @lid' };
  }
  const cached = cacheGet(jid);
  if (cached) return cached;

  let profile;
  try {
    const { withTimeout } = require('./helpers');
    profile = await withTimeout(sock.getBusinessProfile(jid), 8000);
  } catch (e) {
    return { estado: 'desconocido', fields: [], motivo: `la consulta falló (${e?.message || 'error'})` };
  }

  // Baileys resuelve `undefined` TANTO cuando no hay nodo <profile> como cuando
  // la IQ vence: su waitForMessage se traga el timeout y devuelve undefined en
  // lugar de lanzar (Socket/socket.js), así que el catch de arriba nunca salta.
  // Sin objeto no hay dato, y dar eso por "personal" es justo lo que se viene a
  // arreglar.
  if (!profile || typeof profile !== 'object') {
    return { estado: 'desconocido', fields: [], motivo: 'la consulta no devolvió perfil (timeout o sin nodo)' };
  }

  const filled = v => typeof v === 'string' && v.trim().length > 0;

  // ─── «NO ES UNA EMPRESA» NO ES UNA EMPRESA (22 oct) ─────────────────────
  //
  // El dueño: «hay veces que también expulsa cuentas que no lo son». Y era
  // esto. Mucha gente usa la app WhatsApp Business como su WhatsApp de diario
  // (para llevar dos números en un móvil, sobre todo), y al configurarla
  // WhatsApp pide una categoría. Una de ellas es «No es una empresa»
  // (NOT_A_BIZ en la API de Meta). Aquí contaba CUALQUIER categoría como
  // prueba, así que a quien marcaba justo esa se le echaba y se le vetaba por
  // ser empresa, con su perfil diciendo lo contrario.
  //
  // Lo mismo con la descripción: en la app Business ocupa el sitio del «info»,
  // y una persona pone ahí su frase. No es un dato de negocio.
  //
  // Lo que queda como prueba es lo que solo rellena un negocio: una categoría
  // de verdad, una dirección, un horario, y el correo o la web cuando no ha
  // dicho que no es una empresa. Quien marca «No es una empresa» solo cae si
  // además tiene dirección u horario, que es una tienda diga lo que diga.
  const categoria = filled(profile?.category) ? profile.category.trim() : '';
  const noEsEmpresa = categoria && NO_ES_EMPRESA.test(categoria);
  const sinCategoria = !categoria || SIN_CATEGORIA.test(categoria);
  const fields = [];
  if (!sinCategoria && !noEsEmpresa) fields.push(`categoría «${categoria.slice(0, 40)}»`);
  if (filled(profile?.address)) fields.push('dirección');
  const cfg = profile?.business_hours?.business_config;
  if (Array.isArray(cfg) && cfg.length > 0) fields.push('horario');
  if (!noEsEmpresa) {
    if (filled(profile?.email)) fields.push('email');
    if (Array.isArray(profile?.website) && profile.website.some(w => filled(String(w)))) fields.push('web');
  }
  // Las portadas, las «opciones de perfil» y la ficha de comercio estaban aquí
  // como prueba del suplantador con la ficha en blanco. Baileys no las trae
  // nunca (Socket/chats.js, getBusinessProfile), así que no decidían nada; y
  // si algún día llegan, existir en una cuenta de la app Business no dice que
  // sea un negocio. Fuera.

  // La categoría va siempre, también cuando no es empresa: *!antiempresa
  // precision* la enseña para que se vea qué dice cada perfil.
  const value = fields.length
    ? { estado: 'biz', fields, categoria }
    : { estado: 'personal', fields: [], categoria };
  cacheSet(jid, value);
  return value;
}

// Compatibilidad: sigue existiendo para quien solo quiera un sí/no. OJO — un
// 'desconocido' devuelve false aquí, así que NO se debe usar para decidir una
// expulsión. Para eso está businessEvidence y sus tres estados.
async function isBusiness(sock, jid) {
  return (await businessEvidence(sock, jid)).estado === 'biz';
}

function clearBusinessCache() {
  cache.clear();
}

// clearBusinessCache no lo usa ningun comando: existe para las pruebas, que
// necesitan un estado limpio entre casos.
module.exports = { isBusiness, businessEvidence, clearBusinessCache, NO_ES_EMPRESA };
