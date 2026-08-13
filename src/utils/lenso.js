const axios = require('axios');
const config = require('../config');
const logger = require('./logger');

// Integración con la API de búsqueda facial de Lenso.ai (endpoint eyematch).
// Es de PAGO: requiere una key (plan Developer) puesta en config.lensoApiKey /
// env LENSO_API_KEY. Sin key, faceSearch() devuelve { ok:false, reason:'no-key' }
// y el bot cae a los enlaces manuales — no rompe nada.
//
// Doc: POST https://api.eyematch.ai/search  (Bearer token)
//   body: { image: <base64>, sortType, page }
//   resp: { results: [ { urlList:[{imageUrl,sourceUrl,title}], confidenceScore, date } ] }
const FACE_ENDPOINT = 'https://api.eyematch.ai/search.';

function hasKey() {
  return !!(config.lensoApiKey && String(config.lensoApiKey).trim());
}

// Busca la cara de `buffer` en Lenso y devuelve las mejores coincidencias.
// { ok, matches:[{sourceUrl,imageUrl,title,score}], reason }.
async function faceSearch(buffer, { limit = 4 } = {}) {
  if (!hasKey()) return { ok: false, reason: 'no-key', matches: [] };
  if (!buffer || !buffer.length) return { ok: false, reason: 'no-image', matches: [] };

  try {
    const res = await axios.post(
      FACE_ENDPOINT,
      {
        image: buffer.toString('base64'),
        sortType: 'QUALITY_DESCENDING',
        page: 1,
      },
      {
        headers: {
          Authorization: `Bearer ${String(config.lensoApiKey).trim()}.`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
        maxBodyLength: 30 * 1024 * 1024,
      }
    );

    const results = Array.isArray(res.data?.results) ? res.data.results : [];
    const matches = [];
    for (const r of results) {
      const first = Array.isArray(r?.urlList) ? r.urlList[0] : null;
      if (!first?.sourceUrl && !first?.imageUrl) continue;
      matches.push({
        sourceUrl: first.sourceUrl || first.imageUrl,
        imageUrl: first.imageUrl || null,
        title: first.title || null,
        score: Number.isFinite(r?.confidenceScore) ? r.confidenceScore : null,
      });
      if (matches.length >= limit) break;
    }
    return { ok: true, matches };
  } catch (e) {
    const status = e.response?.status;
    logger.warn(`lenso: búsqueda facial falló${status ?` (HTTP ${status})` : ''}: ${e.message}`);
    // 401/403 = key mala; el resto probablemente red/límite.
    return { ok: false, reason: status === 401 || status === 403 ? 'bad-key' : 'error', matches: [] };
  }
}

module.exports = { faceSearch, hasKey };
