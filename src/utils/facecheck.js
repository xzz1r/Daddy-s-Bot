const axios = require('axios');
const FormData = require('form-data');
const config = require('../config');
const logger = require('./logger');

// Integración con la API de FaceCheck.id (búsqueda facial). De PAGO: 3 créditos
// (~$0.30) por búsqueda, key en config.facecheckApiKey / env FACECHECK_API_KEY.
// Es ASÍNCRONA: se sube la foto (/api/upload_pic) → se obtiene un id_search →
// se consulta /api/search en bucle hasta que aparecen resultados. Cada item trae
// la URL de origen donde apareció esa cara (resultado DIRECTO) y un score.
// Sin key devuelve { ok:false, reason:'no-key' } y el bot sigue sin romperse.
const BASE = 'https://facecheck.id';

function hasKey() {
  return !!(config.facecheckApiKey && String(config.facecheckApiKey).trim());
}

async function faceSearch(buffer, { limit = 4, maxWaitMs = 45000, demo = false } = {}) {
  if (!hasKey()) return { ok: false, reason: 'no-key', matches: [] };
  if (!buffer || !buffer.length) return { ok: false, reason: 'no-image', matches: [] };
  const token = String(config.facecheckApiKey).trim();
  const headers = { Authorization: token, Accept: 'application/json' };

  // 1) Subir la imagen.
  let idSearch;
  try {
    const form = new FormData();
    form.append('images', buffer, { filename: 'face.jpg' });
    const up = await axios.post(`${BASE}/api/upload_pic`, form, {
      headers: { ...headers, ...form.getHeaders() },
      timeout: 30000, maxBodyLength: 30 * 1024 * 1024,
    });
    if (up.data?.error) { logger.warn(`facecheck: upload error: ${up.data.error}`); return { ok: false, reason: 'error', matches: [] }; }
    idSearch = up.data?.id_search;
    if (!idSearch) return { ok: false, reason: 'error', matches: [] };
  } catch (e) {
    const s = e.response?.status;
    logger.warn(`facecheck: upload falló${s ? ` (HTTP ${s})` : ''}: ${e.message}`);
    return { ok: false, reason: s === 401 || s === 403 ? 'bad-key' : 'error', matches: [] };
  }

  // 2) Poll hasta que haya output (o se agote el tiempo).
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const r = await axios.post(
        `${BASE}/api/search`,
        { id_search: idSearch, with_progress: true, status_only: false, demo },
        { headers: { ...headers, 'Content-Type': 'application/json' }, timeout: 30000 }
      );
      if (r.data?.error) return { ok: false, reason: 'error', matches: [] };
      const items = r.data?.output?.items;
      if (Array.isArray(items)) {
        const matches = items.slice(0, limit)
          .map(it => ({ sourceUrl: it.url || null, score: Number.isFinite(it.score) ? it.score : null }))
          .filter(m => m.sourceUrl);
        return { ok: true, matches };
      }
      // Sin output todavía: sigue en cola.
    } catch (e) {
      logger.warn(`facecheck: poll falló: ${e.message}`);
      return { ok: false, reason: 'error', matches: [] };
    }
    await new Promise(res => setTimeout(res, 3000));
  }
  return { ok: false, reason: 'timeout', matches: [] };
}

module.exports = { faceSearch, hasKey };
