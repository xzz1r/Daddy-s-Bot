const { spawn, execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { tempFile, cleanTemp } = require('./helpers');
const logger = require('./logger');

// Resuelve una búsqueda a un videoId scrapeando la página de resultados de
// YouTube (rápido, y no bloqueado en IP de datacenter). Así yt-dlp recibe el
// link directo del video y se salta su PROPIA extracción de búsqueda — un paso
// entero menos por cada !play. Devuelve null si falla (se cae a ytsearch1:).
async function searchYouTubeId(query) {
  // sp=EgIQAQ%3D%3D filtra a "solo videos" (excluye canales/playlists), así el
  // primer resultado es el video más relevante, igual que ytsearch1.
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

function detectYtDlp() {
  const candidates = [
    '/data/data/com.termux/files/home/.local/bin/yt-dlp',
    '/data/data/com.termux/files/usr/bin/yt-dlp',
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const which = execSync('command -v yt-dlp 2>/dev/null || which yt-dlp 2>/dev/null', { encoding: 'utf8' }).trim();
    if (which) return which;
  } catch {}
  return 'yt-dlp';
}

const YT_DLP = detectYtDlp();

// El bloqueo "Sign in to confirm you're not a bot" que YouTube aplica a las IP
// de datacenter se resuelve con el POT provider (bgutil), NO con cookies. El
// provider corre como servicio local (ver setup-potoken.sh) y yt-dlp obtiene el
// proof-of-origin token en cada pedido. Ya no se usan cookies ni cuenta alguna.

// Carpeta de plugins de yt-dlp donde vive el plugin del POT provider. CRÍTICO:
// yt-dlp la descubre por HOME (~/.config/yt-dlp/plugins), pero bajo pm2 el bot
// puede correr con un HOME distinto (p. ej. /root), y entonces NO encuentra el
// plugin y cae el bot-check aunque a mano funcione. Por eso detectamos la ruta
// absoluta y se la pasamos explícita con --plugin-dirs, sin depender del HOME.
// La carpeta correcta es la que CONTIENE el paquete yt_dlp_plugins.
function detectPluginDir() {
  const candidates = [
    process.env.YT_PLUGIN_DIR,
    path.join(os.homedir() || '', '.config/yt-dlp/plugins'),
    '/home/ubuntu/.config/yt-dlp/plugins',
    '/root/.config/yt-dlp/plugins',
    process.env.HOME ? path.join(process.env.HOME, '.config/yt-dlp/plugins') : null,
  ].filter(Boolean);
  for (const p of candidates) {
    try { if (fs.existsSync(path.join(p, 'yt_dlp_plugins'))) return p; } catch {}
  }
  return null;
}

const PLUGIN_DIR = detectPluginDir();

// HOME donde vive el plugin (p. ej. /home/ubuntu), derivado de la ruta del
// plugin. CLAVE: yt-dlp descubre el plugin del POT vía HOME (~/.config/yt-dlp/
// plugins). Bajo pm2 el bot puede correr con HOME=/root u otro, y entonces NO lo
// encuentra y cae el bot-check —aunque a mano funcione, porque a mano tu HOME es
// el correcto—. Forzamos este HOME en el entorno del yt-dlp que lanza el bot
// para replicar exactamente la condición que ya se probó que funciona.
const PLUGIN_HOME = PLUGIN_DIR ? PLUGIN_DIR.replace(/\/\.config\/yt-dlp\/plugins\/?$/, '') : null;

if (PLUGIN_DIR) logger.info(`yt-dlp plugin dir: ${PLUGIN_DIR} (HOME forzado: ${PLUGIN_HOME})`);
else logger.warn('yt-dlp: no se encontró la carpeta de plugins del POT provider (revisa setup-potoken.sh)');

// Args de plugins para cada llamada a yt-dlp. Se incluye 'default' para no
// perder los directorios estándar además del explícito.
function pluginArgs() {
  return PLUGIN_DIR ? ['--plugin-dirs', PLUGIN_DIR, '--plugin-dirs', 'default'] : [];
}

// Entorno para el yt-dlp que lanza el bot: replica el HOME/XDG donde está el
// plugin, para que su descubrimiento por defecto lo encuentre igual que a mano.
function ytdlpEnv() {
  if (!PLUGIN_HOME) return process.env;
  return {
    ...process.env,
    HOME: PLUGIN_HOME,
    XDG_CONFIG_HOME: path.join(PLUGIN_HOME, '.config'),
  };
}

// Global cap on concurrent yt-dlp downloads. Each one can hold a CPU core for
// up to 3 minutes; on Termux/low-RAM hosts, 5 people spamming !play at once
// would spawn 5 processes and OOM or thrash the device. Extra requests queue
// here and run as slots free up. The per-user 7s cooldown in the handler
// throttles spam; this bounds the worst case regardless.
const MAX_CONCURRENT_DOWNLOADS = 2;
// Bounds the worst-case wait: beyond this many queued requests, a new !play
// is rejected outright instead of joining a line that could take many
// minutes (each slot can hold a process for up to 3 min). Without a cap, a
// burst of requests just queues forever and the bot looks "stuck" rather
// than telling anyone to back off.
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
        reject(new Error('Hay demasiadas descargas en cola, intenta de nuevo en un momento'));
      }
    };
    tryRun();
  });
}

function releaseDownloadSlot() {
  activeDownloads--;
  const next = downloadQueue.shift();
  if (next) next();
}

// Spawn yt-dlp with a 3-minute timeout to prevent silent hangs
function ytdlp(args) {
  return new Promise((resolve, reject) => {
    // detached: true puts yt-dlp in its own process group. On timeout we then
    // SIGKILL the WHOLE group, not just yt-dlp — because yt-dlp spawns ffmpeg as
    // a child for audio extraction, and killing only the parent would orphan
    // that ffmpeg (reparented to init), leaving it burning CPU/RAM on the 1GB
    // box and accumulating across occurrences.
    const proc = spawn(YT_DLP, args, { detached: true, env: ytdlpEnv() });
    let stdout = '';
    let stderr = '';

    const killGroup = () => {
      try { process.kill(-proc.pid, 'SIGKILL'); }
      catch { try { proc.kill('SIGKILL'); } catch {} }
    };

    const timer = setTimeout(() => {
      killGroup();
      reject(new Error('yt-dlp timeout (3 min)'));
    }, 180000);

    proc.stdout?.on('data', (d) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`yt-dlp no se pudo ejecutar: ${err.message}`));
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else {
        const cleanErr = stderr.split('\n').filter(l => l.startsWith('ERROR:')).pop()
          || stderr.trim().split('\n').pop()
          || `código ${code}`;
        reject(new Error(cleanErr.replace(/^ERROR:\s*/, '')));
      }
    });
  });
}

// Resuelve el objetivo antes de tomar el slot de descarga: si `query` ya es una
// URL o un ytsearch, se usa tal cual; si es texto de búsqueda, se scrapea el
// videoId para pasarle a yt-dlp el link directo (más rápido). Ante cualquier
// fallo del scrape, cae a ytsearch1: (yt-dlp busca por su cuenta).
async function resolveTarget(query) {
  if (/^https?:\/\//.test(query) || query.startsWith('ytsearch')) return query;
  try {
    const id = await searchYouTubeId(query);
    if (id) return `https://www.youtube.com/watch?v=${id}`;
  } catch (e) {
    logger.warn(`búsqueda scrape falló, usando ytsearch1: ${e.message}`);
  }
  return `ytsearch1:${query}`;
}

async function downloadAudio(query) {
  const target = await resolveTarget(query);
  await acquireDownloadSlot();
  try {
    return await runDownload(target);
  } finally {
    releaseDownloadSlot();
  }
}

// Remove any temp file this download wrote (matched by its unique baseName).
// Called on every error path so a timeout/kill/format-error doesn't leave a
// partial m4a behind — those would otherwise pile up in temp/ until the next
// restart (the boot sweep is the only other cleanup) and fill the small VPS disk.
async function cleanupPartials(tempDir, baseName) {
  try {
    const files = await fs.readdir(tempDir);
    await Promise.all(
      files.filter(f => f.startsWith(baseName))
        .map(f => fs.remove(path.join(tempDir, f)).catch(() => {}))
    );
  } catch {}
}

// Errores que significan "YouTube bloqueó ESTA vía, prueba otra" (no que el
// video no exista). Ante uno de estos pasamos a la siguiente estrategia en vez
// de rendirnos. El clásico es el "Sign in to confirm you're not a bot".
function isBlockedError(message) {
  return /sign in to confirm|not a bot|confirm you'?re|requested format is not available|unable to extract|nsig|failed to extract|player response|precondition check|no video formats|unavailable videos are hidden|throttl|403|forbidden|unable to download video data|unable to download|fragment.*not found|giving up/i.test(String(message));
}

// Estrategias de extracción, en orden de preferencia. Se prueban una tras otra
// hasta que alguna funcione, así un bloqueo puntual de YouTube (bot-check,
// cambio de firma) ya NO tumba el comando: hay un plan B. Ninguna usa cookies.
// La 1 da la mejor calidad (itag 140, m4a 128k).
function buildStrategies() {
  return [
    // 1) VÍA POT. Clientes por defecto (el POT plugin usa web_safari) + firma
    //    resuelta por el runtime JS local (Deno/node). Con el POT provider
    //    (bgutil) corriendo, yt-dlp obtiene el proof-of-origin token en cada
    //    pedido y satisface el bot-check SIN cookies ni cuenta. Es la vía
    //    autosostenible y la probada a mano. El itag 140 (m4a 128k) sale igual.
    {
      name: 'pot/web',
      args: ['--extractor-args', 'youtube:skip=hls'],
    },
    // 2) Clientes móviles/TV. Otra vía por si el cliente web está bloqueado y,
    //    por lo que sea, el POT no cubrió ese pedido.
    {
      name: 'mobile-tv',
      args: ['--extractor-args', 'youtube:player_client=tv,mweb,android_vr;skip=hls'],
    },
  ];
}

async function runDownload(videoUrl) {
  const baseName = `audio_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tempDir = path.dirname(tempFile('tmp'));
  const outTemplate = path.join(tempDir, `${baseName}__%(title).80B.%(ext)s`);

  // Args comunes a todas las estrategias. Lo único que cambia entre intentos es
  // el cliente que pide cada estrategia.
  const baseArgs = [
    videoUrl,
    // Ruta explícita del plugin del POT provider, para que yt-dlp lo cargue
    // aunque bajo pm2 el HOME sea otro (sin esto, no lo encuentra y cae el
    // bot-check aunque a mano funcione).
    ...pluginArgs(),
    // Balance calidad/velocidad/tamaño: el MEJOR stream m4a (normalmente ~128
    // kbps AAC). Al ser m4a, yt-dlp lo remuxea con -c copy (no re-codifica): sin
    // pérdida y rápido. Los fallbacks /bestaudio/best son obligatorios porque
    // algunos videos/clientes no exponen audio puro y sin el 'best' final
    // yt-dlp aborta con "Requested format is not available".
    '-f', 'bestaudio[ext=m4a]/bestaudio/best',
    '-x',
    '--audio-format', 'm4a',
    '-o', outTemplate,
    '--no-playlist',
    '--no-warnings',
    '--no-part',
    // music.js descarta cualquier cosa mayor de 25MB: capar aquí evita gastar
    // minutos bajando un archivo que se va a descartar igual.
    '--max-filesize', '25M',
    '--no-mtime',
    '--socket-timeout', '20',
  ];

  const strategies = buildStrategies();
  let lastErr = null;

  for (let i = 0; i < strategies.length; i++) {
    const strat = strategies[i];
    try {
      await ytdlp([...baseArgs, ...strat.args]);

      const files = await fs.readdir(tempDir);
      const audioFile = files.find(f => f.startsWith(baseName));
      if (!audioFile) throw new Error('No se pudo descargar el audio');
      const fullPath = path.join(tempDir, audioFile);

      const stat = await fs.stat(fullPath);
      if (stat.size < 1024) {
        await cleanTemp(fullPath);
        throw new Error('Archivo descargado vacío');
      }

      if (i > 0) logger.warn(`!play: estrategia "${strat.name}" funcionó tras fallar ${i} anterior(es)`);

      const titleMatch = audioFile.match(/__(.+)\.[^.]+$/);
      const title = titleMatch ? titleMatch[1].trim() : 'Sin título';

      const ext = path.extname(audioFile).slice(1).toLowerCase();
      const mimetypes = {
        m4a:  'audio/mp4',
        mp4:  'audio/mp4',
        mp3:  'audio/mpeg',
        aac:  'audio/aac',
        ogg:  'audio/ogg',
        opus: 'audio/ogg; codecs=opus',
        webm: 'audio/webm',
      };

      return { filePath: fullPath, title, mimetype: mimetypes[ext] || 'audio/mp4', ext };
    } catch (err) {
      lastErr = err;
      await cleanupPartials(tempDir, baseName);
      // Si es un bloqueo de YouTube y quedan estrategias, prueba la siguiente.
      // Si es otro error (video privado, borrado, etc.) no tiene sentido reintentar.
      const more = i < strategies.length - 1;
      if (more && isBlockedError(err.message)) {
        logger.warn(`!play: estrategia "${strat.name}" bloqueada (${err.message}); probando siguiente`);
        continue;
      }
      throw err;
    }
  }

  throw lastErr || new Error('No se pudo descargar el audio');
}

module.exports = { downloadAudio };
