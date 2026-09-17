const { spawn, execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
// Arma el freno de salidas (ver src/utils/redSegura.js): sin esto, una URL
// que devuelva una API de fuera puede apuntar al metadata del VPS.
const { urlSegura, DestinoProhibido } = require('./redSegura');
const config = require('../config');
const { tempFile, cleanTemp } = require('./helpers');
const { ffmpegPath, ffprobePath } = require('./ffmpeg');
const { cacheKey } = require('./musicCache');
const logger = require('./logger');

// UNA SOLA FUENTE PARA !play: la API de terceros (RapidAPI), que extrae el
// audio de YouTube en la IP del servicio y no en la nuestra, asi que se evita
// por completo el bot-check del datacenter. Necesita una key gratuita
// (config.rapidApiKey / RAPIDAPI_KEY en .env).
//
// HABIA UN RESPALDO Y SE HA QUITADO. Era SoundCloud, y medido con dos canciones
// conocidas tardaba 12,7 y 17,1 segundos para devolver «DUKI - GOTEO (REMIX)» y
// «The Weeknd - Blinding Lights full»: despues de quince segundos de espera,
// otra cancion. Un respaldo que contesta cualquier cosa es peor que ninguno,
// porque el grupo no sabe que lo que suena no es lo que se pidio y quien lo
// pidio cree que el bot no le entiende.
//
// Nunca se envía un recorte: si no hay version completa, se avisa. Y si la via
// no puede, se dice por que —sin cupo, sin red, no encontrada— en vez de
// devolver algo parecido.

const MIN_FULL_SECONDS = 45;   // por debajo se considera preview/recorte
const MAX_BYTES = 16 * 1024 * 1024;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// DONDE ESTA YT-DLP, Y POR QUE ESTA LISTA ES LARGA.
//
// Esto costo que !tt, !ig y !pin no funcionaran el dia que se estrenaron, con
// yt-dlp instalado y `npm run estado` en verde.
//
// `pip install --user yt-dlp` y `pipx install yt-dlp` —las dos formas normales
// de instalarlo en Ubuntu sin tocar el sistema— lo dejan en ~/.local/bin. Esa
// carpeta esta en el PATH de la terminal del dueño, asi que `command -v yt-dlp`
// escrito a mano lo encuentra. Pero el bot no corre en esa terminal: corre bajo
// pm2, con el PATH que el demonio de pm2 heredo el dia que arranco, y ahi
// ~/.local/bin no suele estar.
//
// O sea que la terminal decia que si y el proceso decia que no, y las dos cosas
// eran verdad. Por eso la ruta del home va la PRIMERA y por eso `npm run estado`
// pregunta por esta misma funcion en vez de por `command -v`: una comprobacion
// que mira un sitio distinto del que mira el bot no comprueba nada.
function detectYtDlp() {
  const home = (() => { try { return require('os').homedir(); } catch { return null; } })();
  const candidates = [
    home && path.join(home, '.local/bin/yt-dlp'),
    '/data/data/com.termux/files/home/.local/bin/yt-dlp',
    '/data/data/com.termux/files/usr/bin/yt-dlp',
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    '/snap/bin/yt-dlp',
    '/opt/homebrew/bin/yt-dlp',
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const which = execSync('command -v yt-dlp 2>/dev/null || which yt-dlp 2>/dev/null', { encoding: 'utf8' }).trim();
    if (which) return which;
  } catch {}
  return 'yt-dlp';
}

// ¿EXISTE DE VERDAD, o solo es un nombre que se pasa a spawn con la esperanza de
// que el PATH lo resuelva? `detectYtDlp` devuelve 'yt-dlp' a secas cuando no
// encontro nada, y eso desde fuera se lee igual que haberlo encontrado.
function hayYtDlp() {
  if (YT_DLP !== 'yt-dlp') return fs.existsSync(YT_DLP);
  try { execSync('yt-dlp --version', { stdio: 'ignore', timeout: 8000 }); return true; }
  catch { return false; }
}

const YT_DLP = detectYtDlp();

// Proveedores de la API de terceros. RAPIDAPI_KEY admite VARIAS keys separadas
// por coma para SUMAR cupos gratis y ganar tolerancia a fallos: si una key agota
// su cuota mensual (o falla), el bot rota a la siguiente automáticamente. Cada
// entrada puede ser "key" (usa el host por defecto) o "key|host" para mezclar
// proveedores. Ej: RAPIDAPI_KEY=abc,def   ó   RAPIDAPI_KEY=abc|host1,def|host2
function buildProviders() {
  return String(config.rapidApiKey || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(entry => {
      const [key, host] = entry.split('|').map(x => x.trim());
      return { key, host: host || config.rapidApiHost };
    });
}
const PROVIDERS = buildProviders();

// EL CARTEL DE LA FUENTE SE ANUNCIA, NO SE IMPRIME AL IMPORTAR.
//
// Estaba en el cuerpo del modulo, o sea que lo escupia CUALQUIERA que
// requiriese este fichero — y el que mas lo requiere no es el bot, es la
// puerta: la capa 2 importa los 115 modulos y ese proceso no carga el .env.
// Resultado, en mitad de cada despliegue salia
//
//   !play fuente : NINGUNA — falta RAPIDAPI_KEY en el .env
//
// que es MENTIRA en esa maquina —las keys estan, el bot las usa dos lineas mas
// abajo— y ademas es justo la clase de aviso que hace parar un despliegue
// bueno. Un banner de arranque pertenece al arranque.
function anunciarFuente() {
  console.log(PROVIDERS.length
    ? `  !play fuente : RapidAPI x${PROVIDERS.length} key(s)`
    : '  !play fuente : NINGUNA — falta RAPIDAPI_KEY en el .env y ya no hay respaldo');
}

// ── Control de concurrencia ───────────────────────────────────────────────────
const MAX_CONCURRENT_DOWNLOADS = 2;
const MAX_QUEUED_DOWNLOADS = 8;
let activeDownloads = 0;
const downloadQueue = [];

function acquireDownloadSlot() {
  return new Promise((resolve, reject) => {
    const tryRun = () => {
      if (activeDownloads < MAX_CONCURRENT_DOWNLOADS) {
        activeDownloads++;
        resolve();
      } else if (downloadQueue.length < MAX_QUEUED_DOWNLOADS) {
        downloadQueue.push(tryRun);
      } else {
        // MARCADO, no solo escrito. Quien lo recibe tiene que poder decirle al
        // grupo que la cola esta llena sin leerle el mensaje a una expresion
        // regular; sin esto el motivo se perdia y salia un «no he podido
        // traerlo» generico, que manda a la gente a reintentar contra una cola
        // que sigue llena y la llena mas.
        const lleno = new Error('Hay demasiadas descargas en cola, intenta de nuevo en un momento');
        lleno.colaLlena = true;
        reject(lleno);
      }
    };
    tryRun();
  });
}

function releaseDownloadSlot() {
  // SUELO EN CERO, igual que en el semaforo de ffmpeg de helpers.js y por lo
  // mismo. Un release de mas —dos caminos de error que sueltan el mismo slot—
  // deja el contador en negativo, y entonces `activeDownloads < 2` es cierto
  // siempre: el tope de dos descargas a la vez desaparece sin que falle nada a
  // la vista, y la maquina —un core y 1 GB— se come todos los yt-dlp que
  // lleguen. Se rompe en la direccion contraria a la fuga y por eso no se nota.
  activeDownloads = Math.max(0, activeDownloads - 1);
  const next = downloadQueue.shift();
  if (next) next();
}


const TEMP_DIR = path.dirname(tempFile('tmp'));

// Duración real del audio con ffprobe. null si no se puede medir (no descartamos).
function audioDuration(file) {
  return new Promise((resolve) => {
    let out = '';
    let proc;
    try {
      // ffprobePath, NO el nombre pelado: con el ffmpeg empaquetado no hay ningun
      // ffprobe en PATH, asi que el spawn fallaba y la duracion salia null SIEMPRE,
      // dejando muerto el filtro que descarta las previews de 30 segundos.
      //
      // Y AUN ASI PUEDE NO ESTAR: si la maquina no tiene ffprobe en ningun sitio,
      // `ffprobePath` acaba siendo la cadena pelada y el spawn vuelve a fallar.
      // Por eso hay respaldo con ffmpeg unas lineas mas abajo — ffmpeg si esta
      // siempre, y su `-i` escupe la duracion igual. Sin ese respaldo, el filtro
      // de las previews de 30 segundos se queda muerto sin avisar, y el grupo
      // recibe recortes en vez de canciones.
      proc = spawn(ffprobePath, ['-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', file]);
    } catch { return duracionPorFfmpeg(file).then(resolve); }
    // El respaldo va en los TRES finales, no solo en el `close`. El caso real
    // —ffprobe que no existe— sale por `error`, no por `close`: probado en una
    // maquina sin ffprobe, con el respaldo solo en `close` la duracion seguia
    // saliendo null y el filtro de previews seguia muerto.
    const conRespaldo = () => duracionPorFfmpeg(file).then(resolve);
    const timer = setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} conRespaldo(); }, 15000);
    proc.stdout?.on('data', (d) => { out += d.toString(); });
    proc.on('error', () => { clearTimeout(timer); conRespaldo(); });
    proc.on('close', () => {
      clearTimeout(timer);
      const n = parseFloat(out.trim());
      if (Number.isFinite(n)) return resolve(n);
      conRespaldo();
    });
  });
}

// El respaldo: ffmpeg siempre esta, y su `-i` imprime la duracion en stderr.
function duracionPorFfmpeg(file) {
  return new Promise((resolve) => {
    let texto = '';
    let proc;
    try { proc = spawn(ffmpegPath, ['-hide_banner', '-i', file, '-t', '0', '-f', 'null', '-']); }
    catch { return resolve(null); }
    const timer = setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} resolve(null); }, 15000);
    proc.stderr?.on('data', (d) => { texto += d.toString(); });
    proc.on('error', () => { clearTimeout(timer); resolve(null); });
    proc.on('close', () => {
      clearTimeout(timer);
      const m = /Duration: (\d+):(\d+):(\d+\.?\d*)/.exec(texto);
      resolve(m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null);
    });
  });
}

async function cleanupPartials(baseName) {
  try {
    const files = await fs.readdir(TEMP_DIR);
    await Promise.all(files.filter(f => f.startsWith(baseName))
      .map(f => fs.remove(path.join(TEMP_DIR, f)).catch(() => {})));
  } catch {}
}

// ── Vía 1: API de terceros (RapidAPI, YouTube en IP limpia) ───────────────────

// Resuelve una búsqueda a un videoId de YouTube scrapeando la página de
// resultados (una simple página web; NO es la API de extracción que sufre el
// bot-check, así que esto sí funciona desde datacenter). null si falla.
async function searchYouTubeId(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
  const res = await axios.get(url, {
    timeout: 8000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept-Language': 'es',
    },
  });
  const m = String(res.data).match(/"videoId":"([\w-]{11})"/);
  return m ? m[1] : null;
}

// ─── Y SI EL HTML NO DA EL ID, SE LO PEDIMOS A YT-DLP ───────────────────────
//
// Medido, 21 busquedas desde un datacenter —de una palabra, con acentos, y
// escritas como escribe la gente—: el scrape acerto 21 de 21 en 676 ms de
// media. Asi que se queda como via principal; cambiarla por esto seria pagar
// tres veces mas por el mismo resultado (2064 ms de media, y en las 6 que se
// compararon devolvio EXACTAMENTE el mismo video).
//
// Pero el scrape depende de que YouTube siga escribiendo `"videoId"` en su HTML,
// y el dia que lo mueva de sitio esto deja de encontrar nada SIN AVISAR A NADIE.
// Antes ese fallo caia a SoundCloud; ahora no hay a donde caer, asi que aqui
// esta el colchon: dos segundos, y *!play* sigue vivo.
//
// Solo resuelve el ID. La descarga la sigue haciendo la API, que es lo que
// evita el bot-check del datacenter.
async function idPorYtDlp(query) {
  try {
    const out = await ytdlp(
      ['--no-warnings', '--flat-playlist', '--print', 'id', `ytsearch1:${String(query).replace(/["\r\n]/g, ' ').trim()}`],
      25000,
    );
    const id = String(out || '').trim().split('\n')[0];
    return /^[\w-]{11}$/.test(id) ? id : null;
  } catch (e) {
    logger.info(`!play: yt-dlp tampoco resolvió el id (${e.message.slice(0, 60)})`);
    return null;
  }
}

function extractVideoId(query) {
  const m = /(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/.exec(query);
  return m ? m[1] : null;
}

// Pide el MP3 a un proveedor RapidAPI. La API es asíncrona: puede responder
// "processing" y hay que reintentar hasta que esté "ok" con el link. Devuelve
// { link, title, duration }. Lanza con .quota=true si la key agotó su cuota
// (HTTP 429) para que el llamador rote a la siguiente key.
async function rapidConvert(videoId, provider) {
  const url = `https://${provider.host}/dl?id=${videoId}`;
  const headers = {
    'X-RapidAPI-Key': provider.key,
    'X-RapidAPI-Host': provider.host,
  };
  // Tope de tiempo total del sondeo: sin él, una key en "processing" perpetuo
  // podría retener un slot de descarga hasta ~200s y matar de hambre al resto.
  const deadline = Date.now() + 45000;
  for (let i = 0; i < 12; i++) {
    if (Date.now() >= deadline) break;
    let data;
    try {
      ({ data } = await axios.get(url, { headers, timeout: 15000 }));
    } catch (e) {
      const code = e.response?.status;
      if (code === 429 || code === 403) { const err = new Error('cuota de la key agotada'); err.quota = true; throw err; }
      throw new Error(e.message);
    }
    const status = String(data.status || '').toLowerCase();
    if (status === 'ok' && data.link) {
      return { link: data.link, title: data.title || 'Sin título', duration: Number(data.duration) || null };
    }
    if (status === 'fail' || status === 'error') {
      throw new Error(data.msg || 'la API no pudo convertir el video');
    }
    const POLL = [800, 1500];
    await sleep(POLL[i] ?? 2500); // processing / in queue
  }
  throw new Error('la conversión tardó demasiado');
}

// ─── EL TOPE LO PONE QUIEN LLAMA, PORQUE NO ES EL MISMO ─────────────────────
//
// Esto cortaba SIEMPRE en 25 MB, que es el tope que tenia *!play*. Pero lo que
// WhatsApp acepta como media en linea —foto, video Y AUDIO— son 16 MB. Los 25
// no salen de ningun sitio: por encima de 16 el envio falla o llega roto.
//
// Consecuencia en redes: un reel de 20 MB se bajaba ENTERO —veinte megas de
// ancho de banda y sus segundos— para medirlo despues, rechazarlo y devolver el
// aura. Ahora se corta en cuanto pasa del tope que de verdad va a poder salir.
//
// El fallo va marcado, no solo escrito: quien lo recibe tiene que poder decir
// «pesa demasiado» sin leerle el mensaje a una expresion regular.
async function downloadUrlToFile(url, dest, tope = MAX_BYTES) {
  // ESTA URL NO LA ESCRIBE NADIE DEL GRUPO: LA ELIGE LA API. El `lookup` con
  // freno ya impide que apunte a una IP interna, pero no puede con el esquema,
  // y axios en Node tambien entiende `file:` y `data:`: un proveedor que
  // devolviera `file:///home/ubuntu/Bot-/.env` como enlace de descarga se
  // leeria tal cual y saldria al grupo como si fuera una cancion.
  if (!urlSegura(url)) throw new DestinoProhibido('el enlace de la API no es http(s)');
  const resp = await axios.get(url, { responseType: 'stream', timeout: 120000, maxRedirects: 5 });
  await new Promise((resolve, reject) => {
    const w = fs.createWriteStream(dest);
    let bytes = 0;
    // Cualquier rechazo destruye AMBOS streams: si solo se cierra uno, el otro
    // queda con su descriptor de fichero/socket abierto (fuga en un proceso 24/7).
    const fail = (err) => { resp.data.destroy(); w.destroy(); reject(err); };
    resp.data.on('data', (c) => {
      bytes += c.length;
      if (bytes > tope) {
        const err = new Error(`pesa más de ${Math.round(tope / 1048576)}MB`);
        err.demasiadoGrande = true;
        fail(err);
      }
    });
    resp.data.on('error', fail);
    w.on('error', fail);
    w.on('finish', resolve);
    resp.data.pipe(w);
  });
}

async function fetchFromProvider(videoId, provider) {
  const { link, title, duration } = await rapidConvert(videoId, provider);
  if (duration != null && duration < MIN_FULL_SECONDS) throw new Error('preview');

  const baseName = `audio_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const dest = path.join(TEMP_DIR, `${baseName}.mp3`);
  try {
    await downloadUrlToFile(link, dest);
    const stat = await fs.stat(dest);
    if (stat.size < 1024) throw new Error('Archivo vacío');
    const dur = await audioDuration(dest);
    if (dur != null && dur < MIN_FULL_SECONDS) throw new Error('preview');
    const safeTitle = String(title).replace(/[\r\n]/g, ' ').slice(0, 90).trim() || 'Sin título';
    return { filePath: dest, title: safeTitle, mimetype: 'audio/mpeg', ext: 'mp3' };
  } catch (err) {
    await cleanupPartials(baseName);
    throw err;
  }
}

// Memoria de keys sin cuota.
//
// La rotación ya existía, pero arrancaba SIEMPRE por la primera key, así que en
// cuanto una agotaba su cupo mensual todas las canciones siguientes gastaban una
// llamada muerta contra ella antes de pasar a la segunda — y una llamada muerta
// no son milisegundos: la API es asíncrona y el sondeo puede tardar quince
// segundos. Con la primera key seca, eso es un peaje de quince segundos en cada
// petición durante el resto del mes.
//
// Aquí se apunta cuándo dio 429/403 cada una y se la manda al final de la cola.
// El olvido es corto a propósito: un 429 puede ser el cupo del mes agotado o un
// simple límite por segundo, y desde fuera no hay forma de distinguirlos. Con
// veinte minutos, un límite pasajero se recupera solo y un cupo agotado de
// verdad solo cuesta una llamada perdida cada veinte minutos en vez de una por
// canción.
const CUOTA_OLVIDO_MS = 20 * 60 * 1000;
const sinCuota = new Map();   // índice de la key -> ts en que se marcó

function estaSeca(i) {
  const ts = sinCuota.get(i);
  if (!ts) return false;
  if (Date.now() - ts > CUOTA_OLVIDO_MS) { sinCuota.delete(i); return false; }
  return true;
}

// Orden de intento: primero las que se creen vivas, y las secas al final como
// último recurso — si la marca estuviera obsoleta, mejor probarla que rendirse.
function ordenDeKeys() {
  const vivas = [], secas = [];
  for (let i = 0; i < PROVIDERS.length; i++) (estaSeca(i) ? secas : vivas).push(i);
  return [...vivas, ...secas];
}

async function tryRapidApi(query) {
  if (!PROVIDERS.length) throw new Error('sin RAPIDAPI_KEY');
  // El enlace pegado a pelo primero, luego el HTML —que es el rapido— y por
  // ultimo yt-dlp, que solo entra cuando el HTML no ha dado nada.
  let videoId = extractVideoId(query);
  if (!videoId) videoId = await searchYouTubeId(query).catch(() => null);
  if (!videoId) {
    logger.warn('!play: el HTML de YouTube no dio el id; pruebo con yt-dlp');
    videoId = await idPorYtDlp(query);
  }
  if (!videoId) throw new Error('no se encontró el video');

  let lastErr = null;
  // Se recuerda si ALGUNA key se quedo sin cupo, no solo la ultima. Sin esto,
  // dos keys seca y una tercera que falla por otra cosa daba un error sin
  // marca de cuota y el grupo leia "no encontré esa canción".
  let huboCuota = false;
  for (const i of ordenDeKeys()) {
    try {
      const r = await fetchFromProvider(videoId, PROVIDERS[i]);
      sinCuota.delete(i);   // respondió: sigue viva
      return r;
    } catch (err) {
      lastErr = err;
      if (err.quota) huboCuota = true;
      // "preview" es propiedad del vídeo (mismo videoId en todas las keys):
      // rotar repetiría la conversión para el mismo id y volvería a dar preview,
      // gastando tiempo en todas las keys. Es terminal para RapidAPI → que el
      // caller lo de por perdido.
      if (err.message === 'preview') break;
      if (err.quota) {
        sinCuota.set(i, Date.now());
        logger.warn(`!play: key ${i + 1}/${PROVIDERS.length} sin cuota; pasa al final de la cola`);
      }
      continue;
    }
  }
  const fin = lastErr || new Error('la API de terceros falló');
  if (huboCuota) fin.quota = true;
  throw fin;
}

// ── yt-dlp: el lanzador, compartido con redes.js ─────────────────────────────
//
// AQUI YA NO HAY SOUNDCLOUD. Era el respaldo de *!play* y se ha quitado por lo
// que hacia, no por lo que prometia: medido contra dos canciones conocidas,
// tardaba 12,7 y 17,1 segundos y devolvia «DUKI - GOTEO (REMIX)» y «The Weeknd
// - Blinding Lights full». O sea que despues de esperar quince segundos, quien
// pidio una cancion recibia OTRA. Un respaldo que contesta cualquier cosa no es
// un respaldo: es ruido con retraso.
//
// El lanzador se queda porque lo usa redes.js para TikTok e Instagram.

function ytdlp(args, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YT_DLP, args, { detached: true });
    proc.unref?.();
    let stdout = '';
    let stderr = '';
    let settled = false;
    const done = (fn, arg) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(arg);
    };
    const killGroup = () => {
      try { process.kill(-proc.pid, 'SIGKILL'); }
      catch { try { proc.kill('SIGKILL'); } catch {} }
    };
    const timer = setTimeout(() => { killGroup(); done(reject, new Error('yt-dlp timeout')); }, timeoutMs);
    proc.stdout?.on('data', (d) => { if (!settled) stdout += d.toString(); });
    proc.stderr?.on('data', (d) => { if (!settled) stderr += d.toString(); });
    proc.on('error', (err) => { done(reject, new Error(`yt-dlp no se pudo ejecutar: ${err.message}`)); });
    proc.on('close', (code) => {
      if (code === 0) done(resolve, stdout);
      else {
        const cleanErr = stderr.split('\n').filter(l => l.startsWith('ERROR:')).pop()
          || stderr.trim().split('\n').pop() || `código ${code}`;
        done(reject, new Error(cleanErr.replace(/^ERROR:\s*/, '')));
      }
    });
  });
}

// ── Entrada ───────────────────────────────────────────────────────────────────
// EL PORQUE, NO SOLO EL QUE. Todo acababa en un unico
// `No se encontró la canción completa`, y arriba music.js lo pasaba por un
// `/no se encontr/` para decidir el mensaje — o sea que ese if SIEMPRE daba la
// misma rama. Con las keys agotadas el grupo leia "no encontré esa canción" y
// la gente reescribia el nombre una y otra vez contra un cupo que no existia.
//
// Ahora el error lleva `causa` y el comando decide con eso, no adivinando por
// el texto.
// ─── UNA SOLA VIA, Y QUE DIGA LA VERDAD CUANDO NO PUEDE ─────────────────────
//
// SoundCloud era el respaldo y se ha ido. Lo decidio el dueño —«nunca ha sido
// necesario y es una mierda»— y la medida le da la razon: 12,7 y 17,1 segundos
// para devolver «DUKI - GOTEO (REMIX)» y «The Weeknd - Blinding Lights full».
// Despues de quince segundos de espera, otra cancion.
//
// Un respaldo que contesta cualquier cosa es peor que no tener respaldo: el
// grupo no sabe que lo que suena no es lo que se pidio, y el que lo pidio cree
// que el bot no entiende. Ahora, cuando no se puede, se dice.
async function intentar(query) {
  try {
    return await tryRapidApi(query);
  } catch (e) {
    const err = new Error('No se encontró la canción completa');
    // Por la MARCA, no por el texto. Ver la nota de arriba: adivinar la causa
    // con una expresion regular sobre el mensaje daba siempre la misma rama.
    err.causa = e.quota ? 'sin-cuota'
      : e.demasiadoGrande ? 'grande'
      // SIN KEY NO ES «NO LA ENCONTRE». Es que no hay por donde buscarla, y con
      // el respaldo quitado eso deja de ser una rareza: si la key caduca o se
      // borra del .env, TODOS los *!play* contestan lo mismo. Decir «no encontré
      // esa canción» ahi manda al grupo a reescribir el nombre una y otra vez
      // contra una via que no existe, y al dueño no le llega ninguna señal.
      : /sin RAPIDAPI_KEY/i.test(e.message || '') ? 'sin-via'
      : /red|network|timeout|ECONN|ENOTFOUND|socket/i.test(e.message || '') ? 'red'
      : 'no-encontrada';
    logger.warn(`!play: no pude traer «${String(query).slice(0, 40)}» (${e.message}); causa: ${err.causa}`);
    throw err;
  }
}

// UNA DESCARGA POR CANCION, AUNQUE LA PIDAN VARIOS A LA VEZ.
//
// Dos `!play` de lo mismo casi a la vez eran dos busquedas, dos conversiones de
// la API (dos llamadas de un cupo gratis que se cuenta al mes) y dos ficheros
// bajados. Es el mismo patron que ya usa la metadata de grupo en el handler,
// pero aqui lo que se ahorra no es latencia: es cuota y ancho de banda.
//
// El segundo NO coge hueco del semaforo: se cuelga de la promesa del primero.
// Asi que ademas deja de ocupar uno de los dos huecos que tiene el VPS.
//
// La clave es la de la CACHE, no el texto crudo: "blinding lights" y
// "Blinding Lights official video" son la misma peticion y ya lo eran para el
// cache; seria raro que aqui no lo fueran.
// LA BAJADA, POR UNA VARIABLE. Es lo unico que hace falta para que el check
// pueda probar el reparto de ficheros de verdad —quien borra, cuando y cuantas
// veces— en vez de una copia suya escrita en la prueba, que es lo mismo que no
// probarlo. En marcha siempre vale `intentar`.
let bajarUna = intentar;

const enVuelo = new Map();   // cacheKey -> { tarea, usuarios }

// ─── QUIEN SUELTA EL ULTIMO, BORRA ──────────────────────────────────────────
//
// Cada quien recibe el suyo, con su propia marca de soltado: llamarlo dos veces
// no descuenta dos, y olvidarse de llamarlo solo deja un fichero en temp/ hasta
// el barrido — nunca borra el de otro que lo esta mandando.
function repartoDe(registro, fichero) {
  let soltado = false;
  return async () => {
    if (soltado) return;
    soltado = true;
    registro.usuarios--;
    if (registro.usuarios > 0) return;
    await fs.remove(fichero).catch(() => {});
  };
}

async function downloadAudio(query) {
  const clave = cacheKey(query);
  const enCurso = enVuelo.get(clave);
  if (enCurso) {
    // Se apunta ANTES del await: entre el `get` y el `++` no puede colarse
    // nadie, y si esperara primero el que bajo podria haber soltado ya.
    enCurso.usuarios++;
    let r;
    try {
      r = await enCurso.tarea;
    } catch (e) {
      // La bajada fallo: no hay fichero que soltar y el apunte sobra.
      enCurso.usuarios--;
      throw e;
    }
    return { ...r, compartido: true, soltar: repartoDe(enCurso, r.filePath) };
  }

  // ─── LA CANCION NO SE LEE A RAM: SE MANDA DESDE EL DISCO ─────────────────
  //
  // Esto leia el fichero ENTERO a un Buffer —hasta 25 MB— para que quien se
  // colgara de la misma descarga tuviera los bytes en mano aunque el otro
  // borrara el fichero. Resolvia ese problema y creaba otro mayor: en una
  // maquina de 1 GB donde el bot ronda los 140, 25 MB mas la copia que hace
  // Baileys al subirlo es de las cosas que acaban en un reinicio por tope de
  // memoria. Y lo peor es que el comando YA estaba escrito para mandar desde
  // disco —`{ audio: { url } }`, con su comentario explicando por que— pero
  // este `readFile` de aqui arriba le ponia siempre un buffer delante, asi que
  // esa rama no se usaba nunca.
  //
  // El fichero se borra cuando lo suelta el ULTIMO, no el primero. Si el
  // proveedor devuelve los bytes por su cuenta se respetan: ahi no hay fichero
  // del que leer.
  const registro = { usuarios: 1, tarea: null };
  registro.tarea = (async () => {
    await acquireDownloadSlot();
    try {
      return await bajarUna(query);
    } finally {
      releaseDownloadSlot();
    }
  })();

  enVuelo.set(clave, registro);
  try {
    const r = await registro.tarea;
    return { ...r, soltar: repartoDe(registro, r.filePath) };
  } finally {
    enVuelo.delete(clave);
  }
}

// LO QUE COMPARTE CON `redes.js`, exportado en vez de copiado. El hueco de
// descarga, el lanzador de yt-dlp y la bajada con tope son exactamente el mismo
// problema para una cancion que para un video de TikTok, y dos copias del
// control de concurrencia son dos limites distintos que se creen el mismo.
module.exports = {
  anunciarFuente,
  _audioDuration: audioDuration, _duracionPorFfmpeg: duracionPorFfmpeg,
  _idPorYtDlp: idPorYtDlp, _searchYouTubeId: searchYouTubeId,
  downloadAudio, ordenDeKeys, sinCuota, PROVIDERS,
  _repartoDe: repartoDe,
  _conBajador: (f) => { const antes = bajarUna; bajarUna = f; return () => { bajarUna = antes; }; },
  acquireDownloadSlot, releaseDownloadSlot, ytdlp, downloadUrlToFile, hayYtDlp,
  YT_DLP, MAX_BYTES, TEMP_DIR,
};
