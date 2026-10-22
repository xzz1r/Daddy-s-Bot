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
// Lo que se busca es LA APP, no el negocio (dueño, 22 oct): toda cuenta de
// WhatsApp Business, también la que marca «No es una empresa». Ver más abajo.

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

// LA CATEGORÍA «NO ES UNA EMPRESA», en los idiomas en que puede llegar. No
// salva a nadie (es la del catfish): sirve para contarla aparte en
// *!antiempresa precision*.
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

  // ─── TODA CUENTA BUSINESS CUENTA, TAMBIÉN «NO ES UNA EMPRESA» ─────────────
  //
  // El dueño, 22 oct: «el bot debe eliminar precisamente las cuentas de
  // WhatsApp Business, por ser las que más catfish suelen ser». Lo que se
  // busca es LA APP, no el negocio. El catfish abre WhatsApp Business, deja la
  // ficha en blanco y marca la categoría «No es una empresa» (NOT_A_BIZ en la
  // API de Meta) para parecer una persona cualquiera. Esa categoría es justo
  // la que lo delata: una cuenta de WhatsApp normal no tiene ninguna.
  //
  // (Ese mismo día lo leí al revés y dejé de contar «No es una empresa» y la
  // descripción. Quedó deshecho en cuanto el dueño lo dijo: no se vuelve a
  // hacer.)
  const categoria = filled(profile?.category) ? profile.category.trim() : '';
  const sinCategoria = !categoria || SIN_CATEGORIA.test(categoria);
  const fields = [];
  if (!sinCategoria) fields.push(`categoría «${categoria.slice(0, 40)}»`);
  if (filled(profile?.email)) fields.push('email');
  if (filled(profile?.address)) fields.push('dirección');
  if (filled(profile?.description)) fields.push('descripción');
  if (Array.isArray(profile?.website) && profile.website.some(w => filled(String(w)))) fields.push('web');
  const cfg = profile?.business_hours?.business_config;
  if (Array.isArray(cfg) && cfg.length > 0) fields.push('horario');

  // Campos que solo existen en cuentas Business aunque la ficha esté vacía.
  // Van aparte porque son MÁS DÉBILES: dependen de qué aplane Baileys en cada
  // versión. Si algún día dejan de venir, el detector pierde este caso pero no
  // empieza a acusar a nadie.
  //
  // EXISTIR NO ES TENER CONTENIDO: en JavaScript `{}` es verdadero, y un
  // `if (profile[campo])` marcaba como negocio a una cuenta NORMAL con un
  // `profile_options: {}` vacío. Tres falsos positivos medidos.
  const conContenido = (v) => {
    if (v == null) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.keys(v).length > 0;
    return Boolean(v);
  };
  for (const [campo, etiqueta] of [
    ['cover_photo', 'foto de portada de negocio'],
    ['profile_options', 'opciones de perfil de negocio'],
    ['commerce_experience', 'ficha de comercio'],
  ]) {
    if (conContenido(profile?.[campo]) && !fields.includes(etiqueta)) fields.push(etiqueta);
  }

  // La categoría va siempre: *!antiempresa precision* la enseña.
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
