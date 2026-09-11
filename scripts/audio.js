#!/usr/bin/env node
// ¿QUÉ LE HACE EL BOT AL AUDIO DE UN VÍDEO? Se pregunta y se contesta midiendo.
//
//   npm run audio <enlace de TikTok, Instagram o Pinterest>
//
// Existe porque «suena bajo» no se puede arreglar a ciegas. El dueño lo dijo
// tres veces, y las tres podía ser una cosa distinta: que el bot no estuviera
// aplicando nada, que lo aplicara y no bastara, o que el vídeo ya viniera a
// nivel y el problema fuese otro. Desde fuera se ven igual.
//
// Esto baja el vídeo por el MISMO camino que usa el bot, mide antes y después,
// y lo dice en LUFS, que es la escala del oído. El pico no sirve para esto: un
// audio puede tener el pico arriba del todo y sonar flojo igualmente.
//
// De referencia: Spotify y YouTube emiten a -14 LUFS. Un audio de voz de
// WhatsApp o un vídeo grabado con el móvil van bastante por encima, y por eso
// un vídeo correcto puede sonar bajo AL LADO de ellos.
'use strict';

require('dotenv').config();
const fs = require('fs-extra');
const { spawnSync } = require('child_process');
const { ffmpegPath } = require('../src/utils/ffmpeg');
const redes = require('../src/utils/redes');

function sonoridad(f) {
  const r = spawnSync(ffmpegPath, ['-hide_banner', '-i', f, '-vn',
    '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { encoding: 'utf8', timeout: 120000 });
  const m = /\{[^{}]*"input_i"[^{}]*\}/s.exec(r.stderr || '');
  if (!m) return null;
  try {
    const d = JSON.parse(m[0]);
    return { lufs: Number(d.input_i), pico: Number(d.input_tp), rango: Number(d.input_lra) };
  } catch { return null; }
}

const pinta = (x) => (x ? `${x.lufs.toFixed(1)} LUFS · pico ${x.pico.toFixed(1)} dB · rango ${x.rango.toFixed(1)}` : 'no medible');

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.log('\n  uso: npm run audio <enlace de TikTok, Instagram o Pinterest>\n');
    process.exit(1);
  }
  const plataforma = redes.plataformaDe(url);
  if (!plataforma) { console.log('\n  Ese enlace no es de ninguna de las tres.\n'); process.exit(1); }

  console.log(`\n  ffmpeg del bot : ${ffmpegPath}`);
  console.log(`  plataforma     : ${plataforma}`);
  console.log(`  subida extra   : ${process.env.REDES_AUDIO_EXTRA || '0'} dB (REDES_AUDIO_EXTRA en el .env)\n`);

  let crudo = null;
  try { crudo = await redes._porApi(url, plataforma); }
  catch (e) { console.log(`  (la API falló: ${e.message.slice(0, 70)})`); }
  if (!crudo) crudo = await redes._porYtDlp(url, plataforma).catch(() => null);
  if (!crudo) { console.log('  No pude bajar el vídeo.\n'); process.exit(1); }

  const antes = sonoridad(crudo);
  console.log(`  COMO VIENE  : ${pinta(antes)}`);

  const listo = await redes._conAudioNivelado(crudo);
  const despues = sonoridad(listo);
  console.log(`  COMO SE MANDA: ${pinta(despues)}`);

  if (listo === crudo) {
    console.log('\n  → El bot NO lo toca. O ya venía a nivel, o no tiene pista de audio.');
  } else if (antes && despues) {
    console.log(`\n  → Le sube ${(despues.lufs - antes.lufs).toFixed(1)} dB.`);
    if (despues.lufs < -13) {
      console.log('    Se queda ahí porque el pico no da para más: subir sin distorsionar');
      console.log('    tiene un techo, y es ese. Para pasar de ahí hay que comprimir:');
      console.log('    REDES_AUDIO_EXTRA=3 en el .env sube tres decibelios más.');
    }
  }
  await fs.remove(listo).catch(() => {});
  console.log();
  process.exit(0);
})().catch((e) => { console.error('  falló:', e.message); process.exit(1); });
