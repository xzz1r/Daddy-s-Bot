const axios = require('axios');
const FormData = require('form-data');
const logger = require('./logger');

// Sube un buffer a litterbox (anónimo, sin key) y devuelve una URL pública
// TEMPORAL (72h). Sirve para alimentar buscadores de imagen inversa que exigen
// una URL (Google Lens, TinEye): una imagen citada en WhatsApp es media cifrada
// sin URL propia, así que la publicamos aquí un rato para poder enlazarla y que
// el enlace lleve al RESULTADO directo, no a una página vacía. Temporal a
// propósito (se borra sola en 72h) por privacidad de las caras que se suben.
const LITTERBOX = 'https://litterbox.catbox.moe/resources/internals/api.php';

async function uploadTemp(buffer, filename = 'img.jpg') {
  if (!buffer || !buffer.length) return null;
  try {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('time', '72h');
    form.append('fileToUpload', buffer, { filename });
    const res = await axios.post(LITTERBOX, form, {
      headers: form.getHeaders(),
      timeout: 20000,
      maxBodyLength: 30 * 1024 * 1024,
    });
    const url = String(res.data || '').trim();
    return /^https?:\/\//.test(url) ? url : null;
  } catch (e) {
    logger.warn(`imageHost: subida a litterbox falló: ${e.message}`);
    return null;
  }
}

module.exports = { uploadTemp };
