'use strict';

// ─── STICKERS CON SONIDO (24 nov) ────────────────────────────────────────────
//
// El dueño: «ahora que los stickers se pueden hacer con sonido, inclúyelo
// dentro del bot». WhatsApp los manda en un campo nuevo del mensaje, el 134
// (`audioStickerMessage`), que es un FutureProofMessage con un Message dentro;
// ese Message lleva el stickerMessage de siempre y, dentro del sticker, en el
// campo 26, una nota de voz entera (AudioMessage, subida aparte como audio).
// Baileys rc14 no conoce ninguno de los dos y los tira al descifrar: el
// sticker con sonido llegaba como un mensaje vacío (Baileys #2932).
//
// Aquí se le enseñan a Baileys los dos sentidos, sin tocar node_modules:
//   - al LEER, un mensaje con el 134 sale como un sticker normal (así !s,
//     !toimg y el antispam lo ven) y su audio queda en `stickerMessage[AUDIO]`;
//   - al ESCRIBIR, un mensaje con `[SONIDO]` lleva su 134 detrás.
//
// La forma de mandarlo es la que ya se probó en teléfonos (zapota #10 y
// whatsapp-rust #2110): el sticker no va a la vista de Baileys, así que la
// estrofa sale como `type="text"` sin `mediatype`; con `type="media"` el
// teléfono lo tira sin decir nada. El opus, con -vbr, -frame_duration y
// -avoid_negative_ts, o el sticker se ve pero el sonido no suena.

const { proto, prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const { randomBytes } = require('crypto');
const { execFile } = require('child_process');
const fs = require('fs-extra');
const { tempFile, cleanTemp } = require('./helpers');
// EL FFMPEG DEL BOT, NO EL QUE HAYA EN EL PATH (25 nov). Iba `ffmpeg` a
// secas, y en una máquina sin ffmpeg del sistema (GitHub; o una con solo el que
// trae node_modules) el sonido no salía nunca. utils/ffmpeg sabe cuál usar.
const { ffmpegPath } = require('./ffmpeg');

const CAMPO_MENSAJE = 134;
const CAMPO_AUDIO = 26;
const CAMPO_STICKER = 26; // stickerMessage dentro de Message
const SONIDO = Symbol.for('daddy.stickerSonido');
const AUDIO = Symbol.for('daddy.stickerSonido.audio');
const TOPE_S = 10;
const MIME_AUDIO = 'audio/ogg; codecs=opus';

// ── protobuf a mano: lo justo para leer y escribir campos de bytes ──
function varint(buf, pos) {
  let v = 0;
  let mul = 1;
  for (let i = 0; i < 10; i++) {
    if (pos >= buf.length) return null;
    const b = buf[pos++];
    v += (b & 0x7f) * mul;
    if (b < 0x80) return [v, pos];
    mul *= 128;
  }
  return null;
}

function escribirVarint(n) {
  const out = [];
  while (n > 127) { out.push((n & 127) | 128); n = Math.floor(n / 128); }
  out.push(n);
  return Buffer.from(out);
}

function campoBytes(campo, bytes) {
  const b = Buffer.from(bytes);
  return Buffer.concat([escribirVarint(campo * 8 + 2), escribirVarint(b.length), b]);
}

// El primer campo `campo` de tipo bytes en el nivel de arriba de `buf`.
function buscarCampo(buf, campo) {
  let pos = 0;
  while (pos < buf.length) {
    const t = varint(buf, pos);
    if (!t) return null;
    const [tag, p] = t;
    pos = p;
    const tipo = tag & 7;
    const num = Math.floor(tag / 8);
    if (tipo === 0) { const v = varint(buf, pos); if (!v) return null; pos = v[1]; }
    else if (tipo === 1) pos += 8;
    else if (tipo === 5) pos += 4;
    else if (tipo === 2) {
      const l = varint(buf, pos);
      if (!l) return null;
      const [len, q] = l;
      if (q + len > buf.length) return null;
      if (num === campo) return buf.subarray(q, q + len);
      pos = q + len;
    } else return null;
  }
  return null;
}

// Lo que hay dentro del 134: el sticker y su audio, ya decodificados.
function abrir(futuro, decodificar) {
  const dentro = buscarCampo(futuro, 1);
  if (!dentro) return null;
  const msg = decodificar(dentro);
  const st = msg?.stickerMessage;
  if (!st) return null;
  const crudoSticker = buscarCampo(dentro, CAMPO_STICKER);
  const crudoAudio = crudoSticker && buscarCampo(crudoSticker, CAMPO_AUDIO);
  if (crudoAudio) {
    try { st[AUDIO] = proto.Message.AudioMessage.decode(crudoAudio); } catch { /* sticker sin su audio */ }
  }
  return st;
}

// El 134 de un sticker y su audio, listo para ir detrás del mensaje.
function cerrar({ sticker, audio }) {
  const stBytes = Buffer.concat([
    Buffer.from(proto.Message.StickerMessage.encode(sticker).finish()),
    campoBytes(CAMPO_AUDIO, proto.Message.AudioMessage.encode(audio).finish()),
  ]);
  return campoBytes(1, campoBytes(CAMPO_STICKER, stBytes));
}

let instalado = false;
function instalar() {
  if (instalado) return;
  instalado = true;
  const M = proto.Message;
  const encodeOriginal = M.encode;
  const decodeOriginal = M.decode;

  M.encode = function encode(m, w) {
    const out = encodeOriginal.call(this, m, w);
    const s = m && m[SONIDO];
    if (s) out.uint32(CAMPO_MENSAJE * 8 + 2).bytes(cerrar(s));
    return out;
  };

  M.decode = function decode(r, l, e) {
    // Lo que va a leer, antes de que lo lea: un Buffer suelto o un trozo del
    // lector de quien lo contiene (la cita de una respuesta, por ejemplo).
    let trozo = null;
    if (e === undefined) {
      if (r && typeof r.pos === 'number' && r.buf) {
        const fin = l === undefined ? r.len : r.pos + l;
        trozo = r.buf.subarray(r.pos, fin);
      } else if (r instanceof Uint8Array) trozo = r;
    }
    const m = decodeOriginal.call(this, r, l, e);
    if (!trozo || m.stickerMessage) return m;
    try {
      const futuro = buscarCampo(trozo, CAMPO_MENSAJE);
      if (futuro) {
        const st = abrir(futuro, (b) => M.decode(b));
        if (st) m.stickerMessage = st;
      }
    } catch { /* se queda como venía */ }
    return m;
  };
}

function audioDe(stickerMessage) {
  return stickerMessage?.[AUDIO] || null;
}

function ffmpeg(args, opts = {}) {
  return new Promise((res, rej) => {
    execFile(ffmpegPath, ['-v', 'error', ...args], { timeout: 60000, maxBuffer: 8 * 1024 * 1024, ...opts },
      (err, stdout, stderr) => (err ? rej(Object.assign(err, { stderr: String(stderr || '') })) : res(stdout)));
  });
}

// 64 barras de 0 a 100, como las de una nota de voz.
function onda(pcm, barras = 64) {
  const muestras = Math.floor(pcm.length / 2);
  if (muestras < barras) return Buffer.alloc(barras, 10);
  const bloque = Math.floor(muestras / barras);
  const crudo = [];
  for (let i = 0; i < barras; i++) {
    let suma = 0;
    for (let j = 0; j < bloque; j++) suma += Math.abs(pcm.readInt16LE((i * bloque + j) * 2));
    crudo.push(suma / bloque);
  }
  const max = Math.max(...crudo);
  const k = max > 0 ? 100 / max : 1;
  return Buffer.from(crudo.map((v) => Math.min(100, Math.floor(v * k))));
}

// El sonido de un vídeo (ya en disco), como nota de voz de hasta 10 s. Null
// si el vídeo no tiene sonido o es silencio.
async function sonidoDe(rutaVideo, segundos = TOPE_S) {
  const salida = tempFile('ogg');
  try {
    try {
      await ffmpeg(['-y', '-i', rutaVideo, '-vn', '-t', String(Math.min(segundos, TOPE_S)),
        '-ar', '48000', '-ac', '1', '-c:a', 'libopus', '-b:a', '48k', '-vbr', 'on',
        '-compression_level', '10', '-frame_duration', '20', '-application', 'audio',
        '-avoid_negative_ts', 'make_zero', '-map_metadata', '-1', '-f', 'ogg', salida]);
    } catch (e) {
      if (/does not contain any stream|matches no streams|Output file .* does not contain/i.test(e.stderr || e.message)) return null;
      throw e;
    }
    const ogg = await fs.readFile(salida);
    if (ogg.length < 200) return null;
    const pcm = await ffmpeg(['-i', salida, '-ac', '1', '-ar', '8000', '-f', 's16le', 'pipe:1'], { encoding: 'buffer' })
      .catch(() => Buffer.alloc(0));
    // Silencio de verdad: sin sonido no tiene sentido mandarlo con altavoz.
    let pico = 0;
    for (let i = 0; i + 1 < pcm.length; i += 2) pico = Math.max(pico, Math.abs(pcm.readInt16LE(i)));
    if (pcm.length && pico < 160) return null;
    const segs = Math.max(1, Math.min(TOPE_S, Math.round(pcm.length / 2 / 8000) || 1));
    return { ogg, segundos: segs, waveform: onda(pcm) };
  } finally {
    await cleanTemp(salida).catch(() => {});
  }
}

// Manda un sticker con sonido. `sonido` es { ogg, segundos, waveform } (se
// sube) o un AudioMessage que ya está en WhatsApp (se reutiliza tal cual).
async function enviar(sock, jid, { sticker, isAnimated, pngThumbnail, sonido, citado }) {
  const subir = { upload: sock.waUploadToServer };
  const [{ stickerMessage }, audio] = await Promise.all([
    prepareWAMessageMedia({ sticker, ...(isAnimated && { isAnimated: true }), ...(pngThumbnail && { pngThumbnail }) }, subir),
    sonido?.ogg
      ? prepareWAMessageMedia({ audio: sonido.ogg, ptt: true, mimetype: MIME_AUDIO, seconds: sonido.segundos, waveform: sonido.waveform }, subir)
        .then((r) => r.audioMessage)
      : Promise.resolve(sonido),
  ]);
  if (isAnimated) stickerMessage.isAnimated = true;
  const ctx = Object.values(citado?.message || {}).find((v) => v && v.contextInfo)?.contextInfo;
  const expiracion = Number(ctx?.expiration) || 0;
  if (citado?.key?.id) {
    stickerMessage.contextInfo = {
      stanzaId: citado.key.id,
      participant: citado.key.participant || citado.key.remoteJid,
      quotedMessage: citado.message,
      ...(expiracion > 0 && { expiration: expiracion }),
    };
  } else if (expiracion > 0) stickerMessage.contextInfo = { expiration: expiracion };
  const mensaje = { messageContextInfo: { messageSecret: randomBytes(32) } };
  Object.defineProperty(mensaje, SONIDO, { value: { sticker: stickerMessage, audio }, enumerable: false });
  const id = await sock.relayMessage(jid, mensaje, { additionalAttributes: { type: 'text' } });
  return { id, stickerMessage, audio };
}

module.exports = {
  instalar, enviar, sonidoDe, audioDe, SONIDO, AUDIO, TOPE_S,
  _buscarCampo: buscarCampo, _campoBytes: campoBytes, _cerrar: cerrar,
};
