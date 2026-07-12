const { ffmpegToBuffer } = require('./helpers');

// Argumentos ffmpeg: decodifica la imagen, la reduce a 9x8 en gris y saca los
// 72 bytes crudos. Timeout + SIGKILL + semáforo compartido los aporta
// ffmpegToBuffer, así una foto de perfil maliciosa no puede colgar ffmpeg y
// trabar el indexado automático.
const FF_ARGS = [
  '-hide_banner', '-loglevel', 'error',
  '-i', 'pipe:0', '-frames:v', '1',
  '-vf', 'scale=9:8,format=gray',
  '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1',
];

// Huella perceptual (dHash de 64 bits). Devuelve el hash como hex de 16
// caracteres, o null si ffmpeg no decodifica / se cuelga / la imagen es plana.
// Todos los llamadores ya toleran null (recordAndMatch/matchOnly lo ignoran),
// así que null = "sin huella útil, no registrar ni comparar".
async function computeHash(buffer) {
  let out;
  try {
    out = await ffmpegToBuffer(FF_ARGS, buffer, 10000);
  } catch {
    return null;
  }
  if (!out || out.length < 72) return null;

  let hash = 0n;
  let bit = 0n;
  let ones = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (out[row * 9 + col] > out[row * 9 + col + 1]) { hash |= (1n << bit); ones++; }
      bit++;
    }
  }

  // Foto casi plana (color sólido o degradado suave): el dHash queda casi todo
  // 0 o casi todo 1, y colisiona con cualquier otra foto plana dentro del
  // umbral → falsos "misma foto / multicuenta". No es una huella distintiva, la
  // descartamos. Una foto real tiene un popcount muy lejos de los extremos.
  if (ones < 3 || ones > 61) return null;

  return hash.toString(16).padStart(16, '0');
}

// Distancia de Hamming entre dos hashes hex (nº de bits distintos, 0..64).
// Ante hashes mal formados/nulos devuelve 64 (máxima distancia = "no coinciden").
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
