const { spawn } = require('child_process');
const { ffmpegPath } = require('./ffmpeg');

// Huella perceptual (dHash de 64 bits). Decodifica la imagen con ffmpeg —NO con
// sharp, que en Termux se borra a propósito— la reduce a 9x8 en escala de gris
// y compara cada píxel con su vecino de la derecha: 8 comparaciones por fila ×
// 8 filas = 64 bits. Es tolerante a reescalado y recompresión, así que la misma
// foto re-subida (aunque cambie de tamaño o calidad) da un hash casi idéntico.
// Devuelve el hash como hex de 16 caracteres, o rechaza si ffmpeg no decodifica.
function computeHash(buffer) {
  return new Promise((resolve, reject) => {
    const args = [
      '-hide_banner', '-loglevel', 'error',
      '-i', 'pipe:0',
      '-frames:v', '1',
      '-vf', 'scale=9:8,format=gray',
      '-f', 'rawvideo', '-pix_fmt', 'gray',
      'pipe:1',
    ];
    const ff = spawn(ffmpegPath, args);
    const chunks = [];
    let err = '';
    ff.stdout.on('data', d => chunks.push(d));
    ff.stderr.on('data', d => { err += d.toString(); });
    ff.on('error', reject);
    ff.on('close', code => {
      const out = Buffer.concat(chunks);
      if (code !== 0 || out.length < 72) {
        return reject(new Error(`pHash ffmpeg falló (code ${code}): ${err.slice(0, 160)}`));
      }
      // out = 72 bytes = 8 filas × 9 columnas, 1 byte de gris por píxel.
      let hash = 0n;
      let bit = 0n;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const left = out[row * 9 + col];
          const right = out[row * 9 + col + 1];
          if (left > right) hash |= (1n << bit);
          bit++;
        }
      }
      resolve(hash.toString(16).padStart(16, '0'));
    });
    // Si ffmpeg cierra la entrada antes de tiempo, write puede lanzar EPIPE.
    ff.stdin.on('error', () => {});
    ff.stdin.write(buffer);
    ff.stdin.end();
  });
}

// Distancia de Hamming entre dos hashes hex (nº de bits distintos, 0..64).
// Ante hashes mal formados devuelve 64 (máxima distancia = "no coinciden").
function hamming(hexA, hexB) {
  if (!hexA || !hexB || hexA.length !== hexB.length) return 64;
  let x;
  try { x = BigInt('0x' + hexA) ^ BigInt('0x' + hexB); }
  catch { return 64; }
  let dist = 0;
  while (x > 0n) { dist += Number(x & 1n); x >>= 1n; }
  return dist;
}

module.exports = { computeHash, hamming };
