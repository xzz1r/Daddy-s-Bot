#!/usr/bin/env node
'use strict';
// LO QUE DA DE SÍ ESTA MÁQUINA, MEDIDO EN ELLA.
//
// 20 oct, a petición del dueño: «tocar el techo de calidad y velocidad que esta
// VPS puede ofrecer». Todo lo que se había afinado se midió en un núcleo de
// otra máquina, y la VPS es una Oracle del plan gratuito: un trozo de núcleo
// que puede ir bastante más lento, y más todavía si el hipervisor la frena
// (eso es el «steal»). Los topes de tiempo del bot —45 s por sticker animado—
// se pusieron con números de fuera. Esto los mide aquí.
//
// Tarda alrededor de un minuto y le quita CPU al bot mientras tanto. No toca
// data/: trabaja en un temporal que borra al acabar. No sale a internet.
//
// USO:  npm run medir
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');

// La máquina donde se calibraron los números del bot, en un solo núcleo
// (taskset -c 0), con ESTE mismo guion: la mediana de tres pasadas en caliente.
// Lo que salga aquí se compara con esto.
const REF = {
  bucleMs: 300,            // el bucle de abajo
  stickerFotoMs: 120,      // imageToSticker con una foto de 1080x1350
  msPorFotograma: 12.7,    // sticker animado, 24 fps, q60, 512 px, contenido difícil
  ytdlpPipMs: 150,         // `yt-dlp --version` instalado con pipx
  cargaMs: 550,            // cargar el manejador y lo que arrastra, sin conectar
};

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const amarillo = (s) => `\x1b[33m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const bien = (t) => console.log(verde(`  ✓ ${t}`));
const aviso = (t, p) => console.log(amarillo(`  ! ${t}`) + (p ? `\n      → ${p}` : ''));
const mal = (t, p) => console.log(rojo(`  ✗ ${t}`) + (p ? `\n      → ${p}` : ''));
const dato = (k, v) => console.log(`    ${k.padEnd(32)} ${v}`);
const titulo = (t) => console.log(`\n${t}`);
const ms = (t0) => Number(process.hrtime.bigint() - t0) / 1e6;
const mediana = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const fmt = (n) => Math.round(n).toLocaleString('es-ES');

function leerStat() {
  try {
    const l = fs.readFileSync('/proc/stat', 'utf8').split('\n')[0].trim().split(/\s+/).slice(1).map(Number);
    // user nice system idle iowait irq softirq steal
    return { total: l.slice(0, 8).reduce((a, b) => a + b, 0), steal: l[7] || 0 };
  } catch { return null; }
}

function bucle() {
  const t0 = process.hrtime.bigint();
  let s = 0;
  for (let i = 1; i < 30e6; i++) s += Math.sqrt(i) % 7;
  return [ms(t0), s];
}

function ffmpegBin() {
  try { return require(path.join(RAIZ, 'src/utils/ffmpeg')).ffmpegPath; } catch { return 'ffmpeg'; }
}

(async () => {
  console.log('\n  Midiendo esta máquina. Tarda alrededor de un minuto y le quita CPU al bot mientras tanto.');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'medir-'));
  const stat0 = leerStat();
  const conclusiones = [];
  try {
    // ─── LA MÁQUINA ──────────────────────────────────────────────────────
    titulo('LA MÁQUINA');
    const cpus = os.cpus();
    dato('núcleos que ve Node', `${cpus.length} (${(cpus[0] && cpus[0].model) || '?'})`);
    let mem = {};
    try {
      for (const l of fs.readFileSync('/proc/meminfo', 'utf8').split('\n')) {
        const m = /^(\w+):\s+(\d+)/.exec(l);
        if (m) mem[m[1]] = Number(m[2]) / 1024;
      }
    } catch { mem = {}; }
    dato('memoria', `${fmt(mem.MemTotal || os.totalmem() / 1048576)} MB · disponible ${fmt(mem.MemAvailable || os.freemem() / 1048576)} MB`);
    if (mem.SwapTotal) dato('swap', `${fmt(mem.SwapTotal)} MB · libre ${fmt(mem.SwapFree)} MB`);
    dato('carga (1, 5, 15 min)', os.loadavg().map((x) => x.toFixed(2)).join(' · '));

    // ─── EL NÚCLEO ───────────────────────────────────────────────────────
    titulo('EL NÚCLEO');
    const vueltas = [bucle()[0], bucle()[0], bucle()[0]];
    const mejor = Math.min(...vueltas);
    const factor = mejor / REF.bucleMs;
    dato('bucle de prueba', `${fmt(mejor)} ms (la de referencia: ${REF.bucleMs} ms)`);
    dato('respecto a la de referencia', `×${factor.toFixed(1)} de tiempo`);
    // La peor contra la mejor: si el hipervisor frena, se nota en la dispersión.
    const peor = Math.max(...vueltas);
    if (peor > mejor * 1.5) aviso(`las vueltas van de ${fmt(mejor)} a ${fmt(peor)} ms: el núcleo no da siempre lo mismo (otra cosa compite, o el hipervisor frena)`);

    // ─── STICKERS ────────────────────────────────────────────────────────
    titulo('STICKERS');
    const ff = ffmpegBin();
    const foto = path.join(tmp, 'foto.jpg');
    const video = path.join(tmp, 'video.mp4');
    spawnSync(ff, ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'mandelbrot=size=1080x1350:rate=1', '-frames:v', '1', '-q:v', '2', foto]);
    spawnSync(ff, ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=720x1280:rate=30', '-t', '4',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', video]);
    if (!fs.existsSync(foto) || !fs.existsSync(video)) {
      mal('ffmpeg no ha podido generar las pruebas: sin ffmpeg no hay stickers', 'sudo apt install -y ffmpeg');
    } else {
      const S = require(path.join(RAIZ, 'src/utils/sticker'));
      // Los topes, del propio bot: copiados aquí se quedarían viejos al cambiarlos.
      const TIMEOUT_STICKER_MS = S.FFMPEG_TIMEOUT_MS;
      const FOTOGRAMAS_TOPE = S.TOPE_ANIMADO_S * 24;
      const bufFoto = fs.readFileSync(foto);
      const tiempos = [];
      for (let i = 0; i < 3; i++) { const t0 = process.hrtime.bigint(); await S.imageToSticker(bufFoto, 'medir'); tiempos.push(ms(t0)); }
      const tFoto = mediana(tiempos);
      dato('sticker de una foto', `${fmt(tFoto)} ms (referencia: ${REF.stickerFotoMs} ms)`);

      // El animado se mide con UNA pasada a los mismos ajustes que usa el bot
      // en un vídeo de 8 s o más (24 fps, q60, 512 px), para sacar lo que
      // cuesta cada fotograma. 4 s a 24 fps son 96 fotogramas.
      const salida = path.join(tmp, 'a.webp');
      const vf = 'fps=24,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1,format=rgba';
      const t0 = process.hrtime.bigint();
      spawnSync(ff, ['-loglevel', 'error', '-y', '-t', '10', '-i', video, '-map', '0:v:0', '-vf', vf, '-c:v', 'libwebp',
        '-loop', '0', '-an', '-q:v', '60', '-compression_level', '2', salida]);
      const tAnim = ms(t0);
      const porFotograma = tAnim / 96;
      const peorCaso = porFotograma * FOTOGRAMAS_TOPE;
      dato('sticker animado, por fotograma', `${porFotograma.toFixed(1)} ms (referencia: ${REF.msPorFotograma} ms)`);
      dato(`un vídeo de ${S.TOPE_ANIMADO_S} s, una pasada`, `${(peorCaso / 1000).toFixed(1)} s, contra un tope de ${TIMEOUT_STICKER_MS / 1000} s`);
      if (peorCaso > TIMEOUT_STICKER_MS) {
        mal(`un vídeo de ${S.TOPE_ANIMADO_S} s no cabe en el tope de ${TIMEOUT_STICKER_MS / 1000} s: el sticker animado de un vídeo largo fallará aquí`,
          'pégale esto a quien mantenga el bot: hay que subir FFMPEG_TIMEOUT_MS o bajar TOPE_ANIMADO_S en src/utils/sticker.js');
        conclusiones.push('el tope de tiempo del sticker animado se queda corto para esta máquina');
      } else if (peorCaso > TIMEOUT_STICKER_MS * 0.6) {
        aviso(`un vídeo de ${S.TOPE_ANIMADO_S} s se come el ${Math.round((peorCaso / TIMEOUT_STICKER_MS) * 100)} % del tope: si además le toca bajar de calidad (dos pasadas), no cabe`,
          'pégale esto a quien mantenga el bot');
        conclusiones.push('el sticker animado de un vídeo largo va justo de tiempo');
      } else bien(`un vídeo de ${S.TOPE_ANIMADO_S} s cabe con margen en el tope de ${TIMEOUT_STICKER_MS / 1000} s`);
    }

    // ─── yt-dlp ──────────────────────────────────────────────────────────
    titulo('yt-dlp (!tt, !ig, !x, !pin)');
    let dl = null;
    try { dl = require(path.join(RAIZ, 'src/utils/downloader')); } catch { dl = null; }
    if (!dl || !dl.hayYtDlp()) {
      aviso('no hay yt-dlp: las redes solo van por API', 'sudo apt install -y pipx && pipx install yt-dlp && pm2 restart bot');
    } else {
      const ruta = dl.YT_DLP;
      const autonomo = dl.esYtDlpAutonomo(ruta);
      const arranques = [];
      for (let i = 0; i < 3; i++) { const t0 = process.hrtime.bigint(); spawnSync(ruta, ['--version'], { stdio: 'ignore' }); arranques.push(ms(t0)); }
      const tYt = Math.min(...arranques);
      dato('el que usa el bot', `${ruta}${autonomo ? ' (binario autónomo)' : ''}`);
      dato('solo arrancar', `${fmt(tYt)} ms (con pipx, en la de referencia: ${REF.ytdlpPipMs} ms)`);
      if (autonomo) {
        mal(`es el binario autónomo: ${fmt(tYt)} ms en cada vídeo antes de empezar a bajar nada`,
          'sudo apt install -y pipx && pipx install yt-dlp && pm2 restart bot');
        conclusiones.push('yt-dlp es el binario lento');
      } else bien('es el rápido (pipx o pip)');
    }

    // ─── EL BOT ──────────────────────────────────────────────────────────
    titulo('EL BOT');
    const cargas = [];
    for (let i = 0; i < 2; i++) {
      const t0 = process.hrtime.bigint();
      spawnSync(process.execPath, ['-e', `require(${JSON.stringify(path.join(RAIZ, 'src/handlers/messageHandler'))})`], { stdio: 'ignore', cwd: RAIZ });
      cargas.push(ms(t0));
    }
    dato('cargar el bot (sin conectar)', `${fmt(Math.min(...cargas))} ms (referencia: ${REF.cargaMs} ms)`);

    // ─── EL DISCO ────────────────────────────────────────────────────────
    titulo('EL DISCO');
    const f = path.join(tmp, 'disco.bin');
    const bloque = Buffer.alloc(1024 * 1024, 7);
    const t0 = process.hrtime.bigint();
    const fd = fs.openSync(f, 'w');
    for (let i = 0; i < 32; i++) fs.writeSync(fd, bloque);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    const mbs = 32 / (ms(t0) / 1000);
    dato('escribir 32 MB y fsync', `${fmt(mbs)} MB/s`);
    if (mbs < 20) {
      aviso('el disco va lento: los vídeos de redes y la despensa de gifs lo notan');
      conclusiones.push('el disco va lento');
    }
    try {
      const df = spawnSync('df', ['-Pk', RAIZ], { encoding: 'utf8' }).stdout.trim().split('\n').pop().split(/\s+/);
      const libreMb = Number(df[3]) / 1024;
      dato('libre donde vive el bot', `${fmt(libreMb)} MB`);
      if (libreMb < 1024) {
        mal('queda menos de 1 GB: un disco lleno corrompe la sesión de WhatsApp', 'npm run estado  (dice qué ocupa)');
        conclusiones.push('poco disco');
      }
    } catch { /* sin df */ }

    // ─── EL HIPERVISOR ───────────────────────────────────────────────────
    titulo('EL HIPERVISOR');
    const stat1 = leerStat();
    if (stat0 && stat1 && stat1.total > stat0.total) {
      const steal = ((stat1.steal - stat0.steal) / (stat1.total - stat0.total)) * 100;
      dato('steal mientras medía', `${steal.toFixed(1)} %`);
      if (steal > 20) {
        aviso(`el hipervisor se ha quedado el ${steal.toFixed(0)} % del tiempo: con trabajo seguido, esta máquina va bastante más lenta de lo que dice su núcleo`);
        conclusiones.push('el hipervisor frena (steal alto)');
      } else bien('el hipervisor no ha frenado de forma apreciable');
    } else dato('steal', 'no se puede leer aquí');

    titulo('EN RESUMEN');
    if (!conclusiones.length) bien('nada que tocar: esta máquina da lo que el bot espera de ella');
    else for (const c of conclusiones) aviso(c);
    console.log('\n  Pega esto entero a quien mantenga el bot: con estos números se ajustan los topes a esta máquina.\n');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  process.exit(0);
})().catch((e) => { console.error(rojo(`medir: ${e.stack || e.message}`)); process.exit(1); });
