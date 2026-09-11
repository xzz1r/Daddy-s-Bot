'use strict';

// ─── VÍDEOS DE TIKTOK, INSTAGRAM Y PINTEREST, SIN MARCA DE AGUA ─────────────
//
// Tres comandos separados —`!tt`, `!ig`, `!pin`— porque son tres plataformas
// distintas y el dueño las quiere distintas. La tubería sí es una sola: pedir,
// bajar a un temporal, mandar desde disco y borrar.
//
// ─── LO QUE NO SE HACE, Y ES LO QUE LO MANTIENE BARATO ──────────────────────
//
// 1. NO SE TOCA EL VÍDEO. TikTok e Instagram ya entregan H.264 en MP4, que es lo
//    que WhatsApp reproduce. Reencodar el vídeo en el único core de la VPS es lo
//    que convertiría esto en el comando más caro del bot, y no añade nada.
//    Del audio sí se ocupa —viene bajo y en un formato que muchos reproductores
//    decodifican a medias— pero con `-c:v copy`: no se toca un fotograma, y son
//    unos cientos de milisegundos.
//
// 2. NO SE CARGA EN MEMORIA. `!play` lee el fichero entero a un Buffer porque un
//    MP3 son cuatro megas; un reel son veinticinco. Se manda como
//    `{ video: { url: fichero } }`: Baileys abre ahí un createReadStream
//    (Utils/messages-media.js) y la RAM del bot no se entera del tamaño.
//
// 3. NO SE PIDE MINIATURA. Va `jpegThumbnail: null` a propósito. Lo que dispara
//    el ffmpeg interno de Baileys al enviar es `undefined`, no `null`, y ese
//    ffmpeg de más es lo que hacía que subir 13 KB tardara 1699 ms.
//
// ─── Y NO SE GUARDA NADA ────────────────────────────────────────────────────
//
// El fichero se borra en cuanto se manda, en el `finally`, salga bien o mal. Lo
// que se quede atrás por un corte lo barre el barrido horario de temp que ya
// existe (utils/helpers.js). O sea que el bot no acumula vídeos de nadie.
//
// ─── DE DÓNDE SALEN ─────────────────────────────────────────────────────────
//
// Dos vías, en este orden:
//
//   1. La API de esa plataforma en el .env (TIKTOK_API, INSTAGRAM_API,
//      PINTEREST_API, o REDES_API para las tres), si está puesta. Va primero
//      porque descarga en la IP del servicio y no en la nuestra, igual que hace
//      `!play` con RapidAPI: es lo que evita que TikTok e Instagram le cierren
//      la puerta a la IP de un datacenter, que es lo que acaba pasando siempre.
//   2. yt-dlp, si está instalado. Respaldo, y la vía principal de Pinterest.
//
// Las direcciones van en el .env y NO en el repositorio, por lo mismo que
// ACCION_NSFW_API: esto es público y la elección de a qué servicio se conecta el
// bot es del dueño.
//
// Y SI LA API FALLA, NO SE CANTA VICTORIA NI SE MUERE: se apunta en el log y se
// prueba yt-dlp. Un servicio de terceros que se cae un martes no puede dejar el
// comando muerto hasta que alguien mire el .env.
//
// ─── LO DE LA MARCA DE AGUA ─────────────────────────────────────────────────
//
// En TikTok el vídeo limpio y el marcado son dos FORMATOS del mismo enlace: el
// marcado es `download_addr`, el limpio es `play_addr` y sus derivados. yt-dlp
// suele elegir bien por calidad, pero "suele" no es una garantía, así que el
// selector descarta explícitamente cualquier formato cuyo id hable de marca de
// agua, y solo si no queda ninguno cae al mejor a secas.

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { acquireDownloadSlot, releaseDownloadSlot, ytdlp, downloadUrlToFile, hayYtDlp, MAX_BYTES, TEMP_DIR } = require('./downloader');
const { ffmpegSemaphore } = require('./helpers');
const { ffmpegPath } = require('./ffmpeg');
const { spawn } = require('child_process');
const logger = require('./logger');

// UNA API POR PLATAFORMA, y con una comun de respaldo. Es lo que pidio el dueño
// y ademas es lo correcto: el servicio que va bien con TikTok no suele ser el
// mismo que saca reels de Instagram, y atarlas a un solo host obliga a elegir
// cual de las dos funciona peor. Con esto, cada una apunta a lo suyo y Pinterest
// puede quedarse sin ninguna, que es la que menos la necesita.
const API_DE = {
  tiktok: (process.env.TIKTOK_API || process.env.REDES_API || '').trim(),
  instagram: (process.env.INSTAGRAM_API || process.env.REDES_API || '').trim(),
  pinterest: (process.env.PINTEREST_API || process.env.REDES_API || '').trim(),
};
const TIEMPO_MAXIMO = 120000;
// Lo que WhatsApp acepta como video en un mensaje. Por encima, el envio falla o
// le llega roto a quien lo recibe: no es un limite nuestro que podamos subir.
const TOPE_WHATSAPP = 16 * 1024 * 1024;

// El id de cada plataforma es el mismo que usa el comando, para que un error no
// tenga que traducirse por el camino.
const PLATAFORMAS = {
  tiktok: {
    nombre: 'TikTok',
    // vm./vt. son los acortadores que reparte la propia app al compartir.
    rx: /https?:\/\/(?:[\w-]+\.)?(?:tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)\/\S+/i,
    // Fuera el formato con marca de agua, y al final un `/b` que lo acepta
    // igualmente si no hubiera ninguno limpio: mejor con marca que nada.
    formato: 'b[format_id!*=watermark][format_id!*=download_addr]/bv*+ba/b',
  },
  instagram: {
    nombre: 'Instagram',
    rx: /https?:\/\/(?:www\.)?(?:instagram\.com|instagr\.am)\/\S+/i,
    formato: 'b',
  },
  pinterest: {
    nombre: 'Pinterest',
    // pin.it es el acortador de la app.
    rx: /https?:\/\/(?:[\w-]+\.)?(?:pinterest\.[a-z.]+|pin\.it)\/\S+/i,
    formato: 'b',
  },
};

// El enlace puede venir suelto o dentro de una frase: se saca el primero que
// case con la plataforma pedida. Pedir `!tt` con un enlace de Instagram tiene
// que fallar diciendo eso, no bajar el de Instagram.
function enlaceDe(texto, plataforma) {
  const p = PLATAFORMAS[plataforma];
  if (!p) return null;
  const m = p.rx.exec(String(texto || ''));
  return m ? m[0].replace(/[)\]}.,;]+$/, '') : null;
}

// ¿A qué plataforma pertenece un enlace? Solo para decirle a quien se equivoca
// de comando cuál era el suyo.
function plataformaDe(texto) {
  for (const [k, p] of Object.entries(PLATAFORMAS)) if (p.rx.test(String(texto || ''))) return k;
  return null;
}

// ─── POR QUÉ NO SALIÓ, Y EN CRISTIANO ───────────────────────────────────────
//
// Medido el día del estreno, desde una VPS y con yt-dlp al día:
//
//   TikTok     «Unexpected response from webpage request»  → bloquea al servidor
//   Instagram  «Instagram sent an empty media response»    → pide sesión
//   Pinterest  «No video formats found»                    → es una FOTO
//
// Las dos primeras necesitan un tercero: bloquean a la IP de un datacenter, y
// eso no se arregla con código. La tercera NO, y ahí me equivoqué: ver la nota
// en `porPinterest`. Y el grupo no tiene por qué enterarse de eso
// —al que pega el enlace le basta con «no pude»—, pero el dueño sí, y no puede
// ser a base de bucear en el log. Aquí se guarda el último fallo de cada
// plataforma y `npm run estado` lo traduce.
// EN data/, CON SU RUTA ESCRITA, no colgando de TEMP_DIR. Lo puse como
// `path.join(TEMP_DIR, '..')` dando por hecho que temp vivia dentro de data, y
// no: TEMP_DIR es <repo>/temp, asi que el fichero acababa en la RAIZ del
// repositorio. Y ahi no es que quede feo: `npm run update` se para en seco con
// "hay cambios locales sin guardar" y no vuelve a desplegar nada.
const FALLOS = path.join(__dirname, '../../data/redesFallos.json');

// El mensaje de yt-dlp es un párrafo con enlaces a GitHub. Lo que necesita el
// dueño es qué poner en el .env.
function enCristiano(motivo) {
  const m = String(motivo || '');
  // LO DE LA API, PRIMERO. Cuando hay API el mensaje lleva los dos motivos
  // pegados, y el de yt-dlp habla de bloqueo: mirado en orden de palabras, un
  // «Free Api Limit» se traducia como «la web bloquea al servidor» y mandaba a
  // poner una API que ya estaba puesta.
  if (/no pude bajarlo/i.test(m)) return 'la API dio el enlace pero el vídeo no se deja bajar desde aquí';
  if (/la API dice/i.test(m)) return m.replace(/ · y yt-dlp:.*$/s, '').slice(0, 90);
  if (/la API no devolvió/i.test(m)) return 'la API no devolvió ningún enlace';
  if (/no se pudo ejecutar|ENOENT|not found/i.test(m)) return 'no encuentro yt-dlp';
  if (/cookies|logged-in|login|empty media response/i.test(m)) return 'pide sesión iniciada';
  if (/Unexpected response|Unsupported URL|403|captcha|blocked|not available/i.test(m)) return 'la web bloquea al servidor';
  if (/timeout/i.test(m)) return 'tardó demasiado';
  return m.slice(0, 80);
}

function apuntarFallo(plataforma, motivo) {
  try {
    let v = {};
    try { v = JSON.parse(fs.readFileSync(FALLOS, 'utf8')) || {}; } catch { /* aún no hay */ }
    v[plataforma] = { ts: Date.now(), motivo: enCristiano(motivo), porApi: !!API_DE[plataforma] };
    fs.writeFileSync(FALLOS, JSON.stringify(v));
  } catch { /* un cuaderno no puede tumbar un comando */ }
}

function ultimosFallos() {
  try { return JSON.parse(fs.readFileSync(FALLOS, 'utf8')) || {}; } catch { return {}; }
}

// ¿Hay por dónde? Sin API para esa plataforma y sin yt-dlp no hay nada que
// intentar: cobrar, esperar veinte segundos y devolver el aura es gastarle el
// tiempo a alguien para acabar donde ya se sabía.
function hayComoTraer(plataforma) {
  return !!API_DE[plataforma] || hayYtDlp();
}

const esVideo = (ext) => ['mp4', 'mov', 'webm', 'mkv'].includes(ext);
const esImagen = (ext) => ['jpg', 'jpeg', 'png', 'webp'].includes(ext);

// ── Vía 1: la API del .env ──────────────────────────────────────────────────
async function porApi(url, plataforma) {
  const API = API_DE[plataforma];
  if (!API) return null;
  const destino = API.includes('{url}')
    ? API.replace('{url}', encodeURIComponent(url))
    : `${API}${API.includes('?') ? '&' : '?'}url=${encodeURIComponent(url)}`;

  // UN REINTENTO SI LA API DICE QUE VAS MUY RAPIDO. Las gratuitas suelen
  // limitar a una peticion por segundo, y con dos personas pegando enlaces a la
  // vez eso pasa solo. Rendirse ahi mandaba el comando a yt-dlp —que si esta
  // bloqueado— y el fallo acababa contado como «la web bloquea», que no era.
  let data = null;
  for (let intento = 0; intento < 2; intento++) {
    ({ data } = await axios.get(destino, { timeout: 20000 }));
    const dice = `${data?.msg || data?.message || ''}`;
    if (!/limit|rate|too many|slow down/i.test(dice)) break;
    if (intento === 0) await new Promise((r) => setTimeout(r, 1300));
  }

  // El servicio contesta 200 y dentro dice que no. Sin esto, un «Free Api
  // Limit» se leia como «la API no trae enlace» y se perdia el motivo.
  if (data && (data.code === -1 || data.status === 'error') && (data.msg || data.message)) {
    throw new Error(`la API dice: ${String(data.msg || data.message).slice(0, 90)}`);
  }

  // Cada servicio llama de otra forma al enlace directo. `hdplay` va antes que
  // `play` porque es el mismo video sin marca de agua y en mejor calidad;
  // `wmplay` NO entra en la lista: ese es el que la lleva.
  // EN ORDEN DE CALIDAD. `hdplay` primero, que es el de 1080; `play` despues.
  // Cada servicio usa sus nombres, asi que se aceptan los habituales. `wmplay`
  // NO esta: ese es el que lleva la marca de agua.
  const d = data || {};
  const candidatos = [d.data?.hdplay, d.hdplay, d.url, d.link, d.video, d.download,
    d.data?.play, d.data?.url, d.result?.url]
    .filter((x) => typeof x === 'string' && x.trim())
    .map((x) => { // algunos devuelven la ruta sin dominio
      if (/^https?:\/\//i.test(x)) return x;
      try { return new URL(x, destino).href; } catch { return null; }
    })
    .filter(Boolean);
  if (!candidatos.length) return null;

  let ultimoError = null;
  for (let i = 0; i < candidatos.length; i++) {
    const enlace = candidatos[i];
    const ext = (String(enlace).split('?')[0].split('.').pop() || 'mp4').toLowerCase();
    const fichero = path.join(TEMP_DIR, `red_${Date.now()}_${Math.random().toString(36).slice(2)}.${esImagen(ext) ? ext : 'mp4'}`);
    try {
      await downloadUrlToFile(enlace, fichero);
    } catch (e) {
      await fs.remove(fichero).catch(() => {});
      ultimoError = e;
      continue;
    }
    // Si es un formato que WhatsApp no reproduce en todas partes y todavia
    // quedan opciones, se prueba la siguiente. Si era la ultima, se manda:
    // un video que a lo mejor no se ve es mejor que ninguno.
    if (!esImagen(ext) && i < candidatos.length - 1) {
      const codec = await codecDe(fichero);
      if (!REPRODUCE_BIEN(codec)) {
        logger.info(`redes: el mejor venia en ${codec}, que no se reproduce en todos los telefonos; voy al siguiente`);
        await fs.remove(fichero).catch(() => {});
        continue;
      }
    }
    return fichero;
  }
  if (ultimoError) {
    // LA API DIO EL ENLACE Y LO QUE FALLO FUE BAJARLO, que son dos problemas
    // distintos: el primero se arregla cambiando de servicio y el segundo no
    // —los bytes vienen del CDN de la plataforma a NUESTRA maquina— asi que
    // confundirlos manda a cambiar lo que funciona.
    throw new Error(`la API dio el enlace pero no pude bajarlo: ${ultimoError.message}`);
  }
  return null;
}

// ─── EL AUDIO, QUE LLEGABA CASI MUDO ────────────────────────────────────────
//
// El dueño: «los vídeos salen con volumen muy bajo». Medido sobre uno real:
//
//   antes   mean -24.2 dB   ·   audio HE-AACv2 a 32 kb/s
//   después mean -15.3 dB   ·   audio AAC-LC  a 128 kb/s
//
// Son dos problemas a la vez, y por eso se notaba tanto:
//
//   1. VIENE BAJO DE ORIGEN. Una media de -24 dB es muy poco; lo normal en
//      contenido nivelado ronda -16. Y queda margen: el pico estaba en -10.9 dB,
//      o sea once decibelios sin usar hasta el techo.
//   2. VIENE EN HE-AACv2, que es AAC comprimido a lo bestia con estéreo
//      paramétrico. Muchos reproductores no lo decodifican entero y se quedan
//      con el núcleo, que suena más flojo y más apagado todavía.
//
// Se arregla lo mismo con las dos: reencodar SOLO el audio a AAC normal y
// nivelarlo. El vídeo se copia tal cual (`-c:v copy`), o sea que no se toca ni
// un fotograma y el coste es el de una pista de audio de veinte segundos: 1,4 s
// aquí, unos pocos en la VPS.
//
// SE NIVELA, NO SE SUBE EL VOLUMEN A PELO. `volume=+9dB` revienta el pico de un
// vídeo que ya venga alto. `loudnorm` es la norma EBU R128: apunta a una
// sonoridad concreta y trae limitador, así que sube lo flojo, baja lo que se
// pase y nada satura. El objetivo -14 LUFS es el que usan las plataformas de
// streaming.
//
// Y SI FALLA, SE MANDA EL ORIGINAL. Un vídeo bajo de volumen es mucho mejor que
// ningún vídeo: esto es una mejora, no un requisito.
// SE MIDE Y SE SUBE LO JUSTO. Nada de filtros dinamicos.
//
// La primera version usaba `loudnorm` (norma EBU R128) y, para los clips
// cortos, `dynaudnorm`. Sonaba PEOR que el original, y el dueño lo noto a la
// primera. Los dos son filtros DINAMICOS: no suben el volumen, comprimen el
// rango. Sobre musica —que es el noventa por ciento de TikTok— eso se oye como
// bombeo, y sobre material ya comprimido como el de estas webs, peor todavia.
// Y `loudnorm` en pasada unica encima necesita varios segundos para medir: por
// debajo devuelve basura sin avisar (un clip de 2 s salia a -50 dB).
//
// Lo que hace falta aqui no es comprimir: es SUBIR. El audio de TikTok viene
// bajo pero intacto, con el pico a -10.9 dB, o sea con once decibelios de sitio
// libre hasta el techo. Se mide el pico, se sube justo hasta dejar 1 dB de
// margen, y ya. Ganancia pura: ni comprime, ni bombea, ni toca la dinamica.
//
//   medir    58 ms   (solo el audio, el video ni se decodifica)
//   aplicar 374 ms   (contra 1400 ms de loudnorm)
//   media   -24.2 dB -> -14.3 dB   ·   pico -10.9 dB -> -1.3 dB
//
// Y funciona con CUALQUIER duracion, asi que desaparece el caso raro de los
// clips cortos y el ffprobe que hacia falta para detectarlos.
const MARGEN_DB = 1;       // lo que se deja libre hasta el techo
const GANANCIA_MAXIMA = 20; // en un clip casi mudo, subir mas es subir el ruido

// LA SONORIDAD, QUE ES LO QUE OYE EL OIDO, y no el pico.
//
// El dueño: «suena mas bajo en WhatsApp que en TikTok». Medido, tenia razon y la
// explicacion no es el fichero:
//
//   reel de Instagram  -14.5 LUFS   el bot NO lo toca, ya venia a nivel
//   TikTok             -23.4 LUFS   el bot le sube 9.9 y lo deja en -13.5
//
// Los dos acaban donde emiten Spotify y YouTube. Lo que pasa es que la app de
// TikTok normaliza al reproducir y WhatsApp no: el fichero es el mismo, quien
// cambia es el reproductor.
//
// Mirar solo el pico tiene un agujero: un audio con el pico ya arriba pero
// flojo de media no recibe nada, por mucho que suene bajo. Asi que se mira
// tambien la sonoridad y se coge la ganancia MENOR de las dos. Con EXTRA en 0
// —lo de serie— el resultado es identico al de antes, porque el pico manda
// siempre; lo que anyade es no pasarse cuando el pico engaña.
const OBJETIVO_LUFS = -11;

// SUBIR MAS QUE ESO YA ES COMPRIMIR, y comprimir es lo que sonaba mal. Aqui se
// dice CUANTOS decibelios de compresion se aceptan, y de serie son cero: el
// audio sale con ganancia pura y nada mas. Medido, tres decibelios de mas
// cuestan alrededor de uno de rango dinamico, que es poco y se nota bastante.
// Es decision del dueño, asi que es un numero del .env y no una constante.
const EXTRA_DB = (() => {
  const n = Number(String(process.env.REDES_AUDIO_EXTRA || '0').replace(',', '.'));
  return Number.isFinite(n) ? Math.max(0, Math.min(6, n)) : 0;
})();

// ─── EL MEJOR VÍDEO QUE WHATSAPP SEPA REPRODUCIR ────────────────────────────
//
// El dueño: «se deben enviar lo más HD posible». Y sí, hay HD: en TikTok el
// mismo enlace tiene dos vídeos, y medidos uno al lado del otro no se parecen:
//
//   normal  576x1024   H.264   1,1 MB
//   HD     1080x1920   HEVC    1,5 MB
//
// Pero el HD viene en HEVC (H.265), y eso NO es intercambiable: WhatsApp
// reproduce H.264 en todas partes y el HEVC se le atraganta según el teléfono.
// Un vídeo de 1080 que a media docena del grupo no se les abre es peor que uno
// de 576 que ve todo el mundo.
//
// Así que se pide el mejor, se mira QUÉ llegó, y si es HEVC se coge el
// siguiente. Recodificar no es opción: pasar 1080x1920 a H.264 en el único core
// de la VPS son decenas de segundos con alguien esperando.
function codecDe(fichero) {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ['-hide_banner', '-i', fichero, '-t', '0', '-f', 'null', '-']);
    let texto = '';
    const matar = setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} }, 20000);
    proc.stderr?.on('data', (d) => { texto += d.toString(); });
    proc.on('error', () => { clearTimeout(matar); resolve(null); });
    proc.on('close', () => {
      clearTimeout(matar);
      const m = /Stream #\d+:\d+.*: Video: (\w+)/.exec(texto);
      resolve(m ? m[1].toLowerCase() : null);
    });
  });
}
//
// Y SE PUEDE DECIDIR LO CONTRARIO, porque es una decision del dueño y no del
// codigo: si en el grupo todos llevan telefonos que abren HEVC, prefiere el de
// 1080. Con REDES_HEVC=1 en el .env se manda el mejor y punto.
const ACEPTA_HEVC = /^(1|si|sí|true|yes)$/i.test(String(process.env.REDES_HEVC || '').trim());
const REPRODUCE_BIEN = (codec) => ACEPTA_HEVC || !codec || !['hevc', 'h265', 'av1', 'vp9'].includes(codec);

// Pico Y sonoridad, del propio ffmpeg y en UNA pasada. `-vn` es lo que lo hace
// barato: sin eso decodifica el video entero para no mirarlo.
function medirAudio(fichero) {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ['-hide_banner', '-i', fichero, '-vn',
      '-af', `loudnorm=I=${OBJETIVO_LUFS}:TP=-${MARGEN_DB}:print_format=json`, '-f', 'null', '-']);
    let texto = '';
    const matar = setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} }, 60000);
    proc.stderr?.on('data', (d) => { texto += d.toString(); });
    proc.on('error', () => { clearTimeout(matar); resolve(null); });
    proc.on('close', () => {
      clearTimeout(matar);
      const m = /\{[^{}]*"input_i"[^{}]*\}/s.exec(texto);
      if (!m) return resolve(null);
      try {
        const d = JSON.parse(m[0]);
        const lufs = Number(d.input_i);
        const pico = Number(d.input_tp);
        // Un silencio absoluto sale como -inf y no hay nada que subir.
        if (!Number.isFinite(lufs) || !Number.isFinite(pico)) return resolve(null);
        resolve({ lufs, pico });
      } catch { resolve(null); }
    });
  });
}

function subirAudio(entrada, ganancia, conLimitador = false) {
  const salida = entrada.replace(/\.mp4$/i, '') + `_n${Math.random().toString(36).slice(2, 6)}.mp4`;
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', entrada,
      '-c:v', 'copy',
      // El limitador SOLO cuando se pide subir por encima de lo que aguanta el
      // pico. Sin el, eso saldria distorsionado; con el, se comen los picos y
      // nada mas. Si EXTRA_DB es 0 —lo de serie— esto no se usa nunca.
      //
      // `level=disabled` NO es opcional. Por defecto `alimiter` RENORMALIZA la
      // salida hasta su propio techo, o sea que despues de recortar vuelve a
      // subir: medido, dejaba el pico real en +0.8 dB, que es distorsion. Con
      // esa opcion se queda en -0.1 y el rango dinamico apenas se mueve.
      '-af', conLimitador ? `volume=${ganancia}dB,alimiter=limit=0.85:level=disabled:attack=5:release=250` : `volume=${ganancia}dB`,
      // 128k: la fuente viene en HE-AACv2 a 32-64 kb/s —un formato que muchos
      // reproductores decodifican a medias y suena apagado— asi que pasarla a
      // AAC normal a 128 es transparente de sobra. Estaba en 192 y engordaba el
      // fichero el doble sin que nadie oyera la diferencia, y el tamaño aqui
      // importa: el tope de WhatsApp son 16 MB.
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
      '-movflags', '+faststart',
      salida,
    ]);
    let error = '';
    const matar = setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} }, 60000);
    proc.stderr?.on('data', (d) => { error += d.toString(); });
    proc.on('error', () => { clearTimeout(matar); resolve(null); });
    proc.on('close', async (codigo) => {
      clearTimeout(matar);
      if (codigo !== 0) {
        if (error && !/does not contain any stream/i.test(error)) {
          logger.warn(`redes: no pude subir el audio: ${error.trim().split('\n').pop()?.slice(0, 90)}`);
        }
        await fs.remove(salida).catch(() => {});
        return resolve(null);
      }
      const { size } = await fs.stat(salida).catch(() => ({ size: 0 }));
      if (size < 1024) { await fs.remove(salida).catch(() => {}); return resolve(null); }
      resolve(salida);
    });
  });
}

// El semáforo es el MISMO que usan los stickers, *!toimg* y *!ttp*, y en la VPS
// tiene una sola plaza porque tiene un solo core. Se coge aquí para que nivelar
// el audio de un TikTok no se ejecute encima del sticker de otro.
async function conAudioNivelado(fichero) {
  if (!/\.mp4$/i.test(fichero)) return fichero;
  await ffmpegSemaphore.acquire();
  try {
    const medida = await medirAudio(fichero);
    // Sin pista de audio no hay nada que medir ni que hacer.
    if (!medida) return fichero;
    // Lo que pide la sonoridad, y lo que deja el pico sin distorsionar.
    const porSonoridad = OBJETIVO_LUFS - medida.lufs;
    const porPico = -MARGEN_DB - medida.pico;
    const ganancia = Math.min(GANANCIA_MAXIMA, porSonoridad, porPico + EXTRA_DB);
    // Medio decibelio no lo oye nadie y cuesta un reencodado.
    if (ganancia < 0.5) return fichero;
    const nuevo = await subirAudio(fichero, Math.round(ganancia * 10) / 10, ganancia > porPico);
    if (!nuevo) return fichero;
    // SUBIR EL AUDIO ENGORDA EL FICHERO, y el tope de WhatsApp se miro ANTES de
    // hacerlo. Un video de 15,8 MB pasaba el control y salia de aqui con 16,5:
    // justo el envio que no llega, y por una mejora de sonido. Si se pasa, se
    // queda el original, que cabia.
    const { size } = await fs.stat(nuevo).catch(() => ({ size: 0 }));
    if (size > TOPE_WHATSAPP) {
      logger.info('redes: el audio subido se pasaba del tope de WhatsApp; mando el original');
      await fs.remove(nuevo).catch(() => {});
      return fichero;
    }
    await fs.remove(fichero).catch(() => {});
    return nuevo;
  } catch {
    return fichero;
  } finally {
    ffmpegSemaphore.release();
  }
}

// ── Vía propia de Pinterest: las etiquetas de la página ─────────────────────
//
// ESTO DESMIENTE LO QUE YO MISMO ESCRIBI AQUI. Di por hecho que Pinterest
// bloqueaba al servidor porque un `pin.it` acababa en la portada. Estaba mal por
// dos motivos, y los dos se ven probando con un enlace vivo:
//
//   1. Aquel enlace estaba muerto. Uno bueno redirige perfectamente al pin, y
//      yt-dlp se baja su JSON sin que nadie le cierre la puerta.
//   2. El error de verdad era otro: `No video formats found`. El extractor de
//      Pinterest de yt-dlp solo entiende pines de VIDEO, y la mayoria de los
//      pines son FOTOS. Con una foto no falla la red: falla el extractor.
//
// La pagina del pin trae la direccion del medio en sus propias etiquetas
// `og:`, que es lo que usa cualquier chat para pintar la previsualizacion.
// Funciona para foto y para video, no necesita API ni login, y es lo que
// deberia haber mirado desde el principio.
const UA_MOVIL = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';

// Las dos ordenes posibles del atributo. En la pagina de Pinterest el `content`
// va ANTES que el `property`, asi que una expresion sola no las caza: lo
// comprobe mirando el HTML de verdad.
function metaDe(html, prop) {
  const a = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i').exec(html);
  if (a) return a[1];
  const b = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i').exec(html);
  return b ? b[1] : null;
}

async function porPinterest(url) {
  const { data: html } = await axios.get(url, {
    timeout: 20000, maxRedirects: 5, responseType: 'text',
    headers: { 'User-Agent': UA_MOVIL, 'Accept-Language': 'es-ES,es;q=0.9' },
  });
  if (typeof html !== 'string') return null;

  const video = metaDe(html, 'og:video:secure_url') || metaDe(html, 'og:video');
  const imagen = metaDe(html, 'og:image');
  const enlace = video || imagen;
  if (!enlace) return null;

  const ext = video ? 'mp4' : ((enlace.split('?')[0].split('.').pop() || 'jpg').toLowerCase());
  const fichero = path.join(TEMP_DIR, `red_${Date.now()}_${Math.random().toString(36).slice(2)}.${esImagen(ext) || video ? ext : 'jpg'}`);

  // La foto viene en la version de 736 px. La original esta en la misma ruta con
  // `originals` en vez del tamaño; si no existe, se queda la que dio la pagina.
  if (!video && /\/\d+x\//.test(enlace)) {
    try {
      await downloadUrlToFile(enlace.replace(/\/\d+x\//, '/originals/'), fichero);
      return fichero;
    } catch { /* no habia original: se sigue con la que vino */ }
  }
  await downloadUrlToFile(enlace, fichero);
  return fichero;
}

// ── Vía 2: yt-dlp ───────────────────────────────────────────────────────────
//
// La salida NO se adivina por el nombre: se le da una plantilla con %(ext)s y
// después se busca qué dejó. Preguntarle a yt-dlp cómo se llamó el fichero
// necesita `--print after_move:filepath`, que no está en las versiones viejas, y
// esto tiene que funcionar con la que haya instalada en la máquina.
async function porYtDlp(url, plataforma) {
  const base = path.join(TEMP_DIR, `red_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const args = [
    '-f', PLATAFORMAS[plataforma].formato,
    '--no-playlist', '--no-warnings', '--no-progress',
    // El tope va aquí y no después de bajar: cortar a los 25 MB cuando ya están
    // en disco es gastar el ancho de banda igual.
    '--max-filesize', `${Math.floor(TOPE_WHATSAPP / 1048576)}M`,
    '-o', `${base}.%(ext)s`,
    url,
  ];
  // INSTAGRAM NO BLOQUEA: ESTRANGULA. Y esa diferencia lo es todo.
  //
  // Probado con tres reels reales, seguidos: el primero salio, los otros dos
  // fallaron con «Instagram sent an empty media response», que su propio mensaje
  // atribuye a falta de sesion. No era eso. Repetidos unos segundos despues, los
  // dos salieron a la primera. Lo que hay es un limite por IP y por rato, no una
  // puerta cerrada — y explica lo que veia el dueño: «hay videos de IG que no
  // envia», unos si y otros no, sin patron aparente.
  //
  // Asi que se reintenta con espera creciente en vez de rendirse. Ocupa el hueco
  // de descarga unos segundos mas; la alternativa es contestar que no a algo que
  // habria salido.
  const REINTENTOS = [0, 4000, 9000];
  let ultimo = null;
  for (const espera of REINTENTOS) {
    if (espera) await new Promise((r) => setTimeout(r, espera));
    try { await ytdlp(args, TIEMPO_MAXIMO); ultimo = null; break; } catch (e) {
      ultimo = e;
      const estrangulado = /empty media response|rate.?limit|429|too many|temporarily/i.test(e.message || '');
      if (!estrangulado) break;
    }
  }
  if (ultimo) throw ultimo;

  const dir = path.dirname(base);
  const prefijo = path.basename(base);
  const dejados = (await fs.readdir(dir)).filter((f) => f.startsWith(prefijo));
  if (!dejados.length) return null;
  // Si dejó varios (vídeo y audio sin juntar), el bueno es el más grande.
  let elegido = null;
  let mayor = -1;
  for (const f of dejados) {
    const lleno = path.join(dir, f);
    const { size } = await fs.stat(lleno).catch(() => ({ size: 0 }));
    if (size > mayor) { mayor = size; elegido = lleno; }
  }
  // Y lo que no se eligió no se queda ocupando disco hasta el barrido.
  for (const f of dejados) {
    const lleno = path.join(dir, f);
    if (lleno !== elegido) await fs.remove(lleno).catch(() => {});
  }
  return elegido;
}

// Devuelve { fichero, tipo } o lanza con un motivo que se le puede enseñar a
// alguien. El hueco de descarga es el MISMO que usa !play a propósito: son dos
// a la vez para todo el bot, y eso es lo que impide que cuatro enlaces seguidos
// dejen la máquina sin ancho de banda ni RAM.
async function traer(url, plataforma) {
  await acquireDownloadSlot();
  let fichero = null;
  try {
    let fallaApi = null;
    try {
      fichero = await porApi(url, plataforma);
      if (!fichero && API_DE[plataforma]) fallaApi = 'la API no devolvió ningún enlace';
    } catch (e) {
      fallaApi = e.message;
      logger.warn(`redes: la API falló para ${plataforma}: ${e.message}`);
    }
    // Pinterest tiene via propia y va ANTES que yt-dlp: yt-dlp solo entiende
    // pines de video, y la mayoria son fotos.
    if (!fichero && plataforma === 'pinterest') {
      try {
        fichero = await porPinterest(url);
      } catch (e) {
        logger.warn(`redes: pinterest por etiquetas falló: ${e.message}`);
      }
    }
    // EL MOTIVO DE LA API NO LO TAPA EL DE YT-DLP. Con una API puesta, el fallo
    // que importa es el suyo: yt-dlp es el respaldo y se sabe que esta
    // bloqueado, asi que contar SOLO su mensaje decia «la web bloquea al
    // servidor» cuando lo que habia pasado era otra cosa, y mandaba a arreglar
    // donde no era.
    try {
      if (!fichero) fichero = await porYtDlp(url, plataforma);
    } catch (e) {
      throw new Error(fallaApi ? `${fallaApi} · y yt-dlp: ${e.message}` : e.message);
    }
    if (!fichero) throw new Error(fallaApi || 'no pude sacar el vídeo de ahí');

    const { size } = await fs.stat(fichero);
    if (size < 1024) throw new Error('lo que bajó está vacío');
    // EL TOPE ES EL DE WHATSAPP, NO EL NUESTRO. MAX_BYTES son 25 MB y viene de
    // !play, donde el limite es el ancho de banda. Aqui manda otra cosa: el
    // cliente de WhatsApp no acepta video por encima de 16 MB, asi que mandar
    // 20 no es «un poco grande», es un envio que falla o que a la otra persona
    // no le llega. Mas alla de ese numero no sirve de nada.
    if (size > TOPE_WHATSAPP) throw new Error(`pesa ${Math.round(size / 1048576)} MB y WhatsApp no pasa de ${Math.floor(TOPE_WHATSAPP / 1048576)}`);

    let ext = (fichero.split('.').pop() || '').toLowerCase();
    const tipo = esImagen(ext) ? 'imagen' : esVideo(ext) ? 'video' : 'video';

    if (tipo === 'video') {
      const nivelado = await conAudioNivelado(fichero);
      if (nivelado !== fichero) {
        fichero = nivelado;
        ext = (fichero.split('.').pop() || '').toLowerCase();
        const s2 = await fs.stat(fichero).catch(() => ({ size }));
        return { fichero, tipo, ext, bytes: s2.size };
      }
    }
    return { fichero, tipo, ext, bytes: size };
  } catch (e) {
    if (fichero) await fs.remove(fichero).catch(() => {});
    apuntarFallo(plataforma, e.message);
    throw e;
  } finally {
    releaseDownloadSlot();
  }
}

// `hayApi` lo usa `npm run estado` para no pedir yt-dlp a quien ya tiene las
// tres plataformas resueltas por fuera.
const hayApi = (plataforma) => !!API_DE[plataforma];

module.exports = { traer, enlaceDe, plataformaDe, hayApi, hayComoTraer, ultimosFallos, PLATAFORMAS, _porYtDlp: porYtDlp, _porApi: porApi, _porPinterest: porPinterest, _conAudioNivelado: conAudioNivelado, _medirAudio: medirAudio, _codecDe: codecDe, _API_DE: API_DE };
