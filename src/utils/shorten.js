const axios = require('axios');

// Acorta URLs para que los enlaces de búsqueda inversa —que llevan dentro la
// URL del host codificada y salen larguísimos— aparezcan compactos y no llenen
// la pantalla de spam. TinyURL es el primario (acepta URLs con otra URL dentro,
// que es justo nuestro caso); is.gd es el respaldo. Ante cualquier fallo devuelve
// la URL original: nunca rompe el mensaje por un enlace largo.
const cache = new Map(); // url larga -> url corta (evita re-acortar lo mismo)
const MAX_CACHE = 500;

async function viaTinyurl(url) {
  const res = await axios.get('https://tinyurl.com/api-create.php', {
    params: { url }, timeout: 8000,
  });
  return String(res.data || '').trim();
}

async function viaIsgd(url) {
  const res = await axios.get('https://is.gd/create.php', {
    params: { format: 'simple', url }, timeout: 8000,
  });
  return String(res.data || '').trim();
}

async function shorten(url) {
  if (!url) return url;
  if (cache.has(url)) return cache.get(url);
  for (const provider of [viaTinyurl, viaIsgd]) {
    try {
      const short = await provider(url);
      if (/^https?:\/\//.test(short)) {
        if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
        cache.set(url, short);
        return short;
      }
    } catch { /* prueba el siguiente proveedor */ }
  }
  return url; // ambos fallaron: URL original
}

module.exports = { shorten };
