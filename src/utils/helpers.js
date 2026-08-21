const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

const TEMP_DIR = path.join(__dirname, '../../temp');

const UNA_HORA = 60 * 60 * 1000;

// Barre los temporales rancios (>1h) que dejan las descargas fallidas, los
// stickers a medio codificar y los ffmpeg que murieron por timeout.
async function barrerTemp() {
  let borrados = 0;
  try {
    const entries = await fs.readdir(TEMP_DIR);
    const now = Date.now();
    await Promise.all(entries.map(async (name) => {
      const full = path.join(TEMP_DIR, name);
      try {
        const stat = await fs.stat(full);
        if (now - stat.mtimeMs > UNA_HORA) { await fs.remove(full); borrados++; }
      } catch {}
    }));
  } catch {}
  return borrados;
}

async function ensureTemp() {
  await fs.ensureDir(TEMP_DIR);
  await barrerTemp();

  // Y se repite cada hora mientras el bot corre.
  //
  // Barrer solo al arrancar bastaba cuando el proceso se reiniciaba a menudo.
  // En un bot que lleva semanas levantado no: un ffmpeg que muere por timeout o
  // una descarga que se corta dejan su fichero atrás, y ahí se quedan hasta el
  // siguiente reinicio. Con vídeos de hasta 25 MB, unos cuantos accidentes
  // llenan el disco de una máquina pequeña sin que nadie se entere.
  //
  // unref() para que este temporizador no impida que el proceso termine.
  if (!barridoPeriodico) {
    barridoPeriodico = setInterval(() => {
      barrerTemp().then((n) => {
        if (n) require('./logger').info(`temp: ${n} ficheros rancios barridos`);
      }).catch(() => {});
    }, UNA_HORA);
    barridoPeriodico.unref?.();
  }
  return TEMP_DIR;
}
let barridoPeriodico = null;

function tempFile(ext) {
  const name = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  return path.join(TEMP_DIR, name);
}

async function cleanTemp(filePath) {
  try {
    if (filePath && await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }
  } catch {}
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Race `promise` against a timer that ALWAYS gets cleared.
//
// Un `Promise.race([fetch, new Promise((_, rej) => setTimeout(rej, ms))])` a
// palo seco NO cancela al perdedor. Si gana el fetch, el timer sigue vivo y a
// los N segundos rechaza una promesa que ya nadie escucha → unhandledRejection
// (y una linea de error en el log) en cada consulta que SI fue bien. Se vio en
// getGroupMeta: cada comando que pedia metadata escribia "groupMetadata timeout"
// ocho segundos despues, con la respuesta ya en pantalla.
//
// `alExpirar` ausente → se RECHAZA con Error('timeout').
// `alExpirar` presente → se RESUELVE con ese valor (el patron de !scan/!antifoto).
function withTimeout(promise, ms, alExpirar) {
  let t;
  const timed = alExpirar !== undefined
    ? new Promise((resolve) => { t = setTimeout(() => resolve(alExpirar), ms); t?.unref?.(); })
    : new Promise((_, reject) => { t = setTimeout(() => reject(new Error('timeout')), ms); t?.unref?.(); });
  return Promise.race([Promise.resolve(promise), timed]).finally(() => { if (t) clearTimeout(t); });
}

// Anti-repetition picker. Avoids returning any element of `pool` that was
// already returned for the same `key` within the recent window, so the same
// phrase doesn't land twice in a short span. State is in-memory (per process)
// and keyed by an arbitrary string the caller owns — typically
// `${groupJid}|${command}` so every command/group keeps its own history.
//
// The window is capped at pool.length - 1 so a small pool can never block
// everything; if the whole pool is somehow exhausted it falls back to a plain
// random pick instead of returning nothing.
const _pickHistory = new Map(); // key -> array of recently returned elements
const _MAX_PICK_KEYS = 2000;    // bound the map so long-lived bots don't leak

// ─── El historial sobrevive a los reinicios ─────────────────────────────────
//
// Vivia solo en memoria, asi que cada vez que pm2 reiniciaba el bot —al pasar
// del tope de RAM, tras una actualizacion o al reiniciar la VPS— la ventana
// anti-repeticion empezaba de cero. Justo despues de arrancar no habia nada
// bloqueado y una frase podia repetirse a las dos tiradas. No era un fallo del
// filtro: es que no recordaba nada.
//
// Se guarda un HASH de cada frase, no el texto. Con el texto el fichero rondaba
// el medio mega y habia que reescribirlo entero cada pocos segundos; con hashes
// de ocho caracteres baja a unas decenas de kilobytes. Y como la clave es el
// contenido y no la posicion, reordenar un pool o borrarle frases no invalida
// el historial: las entradas viejas dejan de casar con nada y se van solas por
// la ventana.
const HISTORIAL_FICHERO = path.join(__dirname, '../../data/pickhistory.json');
const GUARDADO_MS = 30 * 1000;   // se agrupa: el bot habla mucho mas que eso

let _historialCargado = false;
let _historialSucio = false;
let _guardadoProgramado = null;

// FNV-1a de 32 bits. No hace falta nada criptografico: solo distinguir frases
// dentro de un mismo pool, donde una colision es practicamente imposible y su
// unico efecto seria saltarse una frase una vez.
function _hash(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

// Los pools son constantes de modulo, asi que se hashean UNA vez y se recuerdan.
// WeakMap para no retener en memoria un pool que se genere al vuelo.
const _hashesPorPool = new WeakMap();
function _hashesDe(pool) {
  let h = _hashesPorPool.get(pool);
  if (!h) { h = pool.map(_hash); _hashesPorPool.set(pool, h); }
  return h;
}

// Carga perezosa y sincrona: el fichero son decenas de KB y esto corre una sola
// vez, en la primera frase que suelta el bot. Si no existe o esta corrupto se
// empieza en blanco, que es exactamente el comportamiento de antes.
function _cargarHistorial() {
  _historialCargado = true;
  try {
    const datos = JSON.parse(require('fs').readFileSync(HISTORIAL_FICHERO, 'utf8'));
    const entradas = Object.entries(datos).filter(([, lista]) => Array.isArray(lista));
    const recorte = entradas.length > _MAX_PICK_KEYS ? entradas.slice(-_MAX_PICK_KEYS) : entradas;
    for (const [clave, lista] of recorte) _pickHistory.set(clave, lista);
  } catch { /* primera ejecucion, o fichero ilegible: se empieza de cero */ }
}

function _programarGuardado() {
  _historialSucio = true;
  if (_guardadoProgramado) return;
  _guardadoProgramado = setTimeout(() => {
    _guardadoProgramado = null;
    if (!_historialSucio) return;
    _historialSucio = false;
    atomicWriteJson(HISTORIAL_FICHERO, Object.fromEntries(_pickHistory))
      .catch(() => { _historialSucio = true; });
  }, GUARDADO_MS);
  // unref para que un guardado pendiente no impida que el proceso termine.
  _guardadoProgramado.unref?.();
}

// Al apagar, volcado sincrono de lo que quede pendiente pm2 manda SIGINT en un
// reinicio normal, que es justo el caso que esto viene a cubrir.
function _guardarYa() {
  if (!_historialSucio) return;
  _historialSucio = false;
  const fs = require('fs');
  const tmp = HISTORIAL_FICHERO + '.tmp';
  try {
    fs.mkdirSync(require('path').dirname(HISTORIAL_FICHERO), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(_pickHistory)));
    fs.renameSync(tmp, HISTORIAL_FICHERO);
  } catch { /* si no se puede escribir al salir, se pierde la ventana y ya */ }
}
// SOLO 'exit'. AQUI NO SE MATA EL PROCESO.
//
// Habia un handler de SIGINT/SIGTERM que llamaba a process.exit(0) directamente,
// y competia con el apagado ordenado de bot.js — que espera hasta 3 s a que
// catorce stores vuelquen: aura, conteos, casino, racha, robos, banlist...
//
// Los dos escuchan la misma señal, asi que el orden lo decidia el azar del
// registro. Si ganaba este, el historial de frases se guardaba y la ultima
// transferencia de aura NO. Cambiar frases por dinero es un mal negocio.
//
// 'exit' es distinto y si vale: se dispara cuando el proceso YA se esta
// cerrando, venga de donde venga, y no adelanta a nadie. Las señales las maneja
// bot.js, que es quien sabe que hay que volcar.
process.once('exit', _guardarYa);

// Ventana anti-repeticion: no se repite una frase hasta pasadas otras 50 del
// mismo pool. Si el pool tiene MENOS de 11 frases el bloqueo se recorta solo a
// pool.length-1 — con 5 frases es imposible no repetir en 50 tiradas, y
// bloquearlas todas dejaria el pool vacio.
// ─── El vocabulario duro del bot ─────────────────────────────────────────────
//
// La lista de palabras que marcan que una frase es de las fuertes. Vive aqui y
// SOLO aqui: la usaban una copia en scripts/progreso.js y la logica de orden que
// habia debajo, y tener el mismo arsenal escrito en dos sitios significaba que
// anyadir una palabra en uno dejaba al otro midiendo otra cosa.
//
// YA NO ORDENA NADA. Habia un ordenarPorDureza que colocaba cada pool de mas
// duro a mas suave y un sesgo que sacaba la cabeza del pool 8 veces mas a
// menudo que la cola. El dueño noto que el bot "seguia un orden en vez de ser
// random" y tenia razon, asi que la eleccion paso a ser plana. Ordenar 6.592
// frases en cada arranque para un orden que nadie consultaba costaba 33 ms y
// confundia a quien leyera el codigo.
//
// Lo que queda sirve para MEDIR: scripts/progreso.js lo usa para saber que
// pools estan escritos con filo y cuales tibios, que es donde esta el trabajo.
//
// OJO CON `co(?:ñ\w*|nos?\b)`. Estaba escrito `co[nñ]o` y el `\w*` del final
// dejaba que el prefijo "cono" se comiera media conjugacion de CONOCER: conoce,
// conocer, conocido, conocimiento, conocerte, conoces... 93 aciertos falsos en
// el corpus, el 2,1 % del total, y en algunos pools era el UNICO acierto — o
// sea que el informe decia "tiene algo de filo" de un pool que no tiene
// ninguno. Una regla de medida que miente hacia arriba es peor que no medir.
//
// Ahora: con ñ vale cualquier sufijo (coño, coños, coñazo) y sin ñ solo la
// palabra entera (cono, conos), que es como se escribe cuando falta la tecla.
const ARSENAL = /\b(puto?s?|puta?s?|mierda|joder|co(?:ñ\w*|nos?\b)|polla|cabr[oó]n|gilipollas|pringad|fracasad|in[uú]til|pat[eé]tic|basura|par[aá]sito|don nadie|muerto de hambre|cero a la izquierda|asco|verg[uü]enza|rid[ií]cul|escoria|guarr|cutre|miseria|desperdicio)\w*/gi;

// ¿Lleva esta frase vocabulario del arsenal?
//
// Resetea lastIndex a proposito: ARSENAL tiene la bandera `g` y sin eso una
// llamada arrastra la posicion a la siguiente y devuelve falsos negativos
// alternos, que es el fallo clasico de reutilizar una regex global con .test().
function tieneArsenal(frase) {
  if (typeof frase !== 'string') return false;
  ARSENAL.lastIndex = 0;
  return ARSENAL.test(frase);
}

// Elección plana entre las frases disponibles.
//
// ANTES HABÍA UN SESGO Y SE NOTABA EN EL GRUPO. Los pools se ordenan de más
// duro a más suave, y esto daba a la cabeza hasta 8 veces más probabilidad que
// a la cola para que el bot "abriera con lo más fuerte". Medido sobre 3.000
// tiradas en un pool de 200: la frase más usada salía 31 veces y la menos
// usada 2. Quince veces más una que otra.
//
// El efecto para quien lo lee no es "el bot pega fuerte": es que las mismas
// frases aparecen una y otra vez mientras el resto del pool no sale casi nunca.
// Se percibe como un orden, no como azar, y el dueño lo detectó sin mirar el
// código.
//
// Ahora es uniforme: dentro de las que la ventana deja libres, todas tienen la
// misma probabilidad. La dureza sigue importando al ESCRIBIR —un pool crudo
// pega más que uno tibio— pero ya no decide el orden de salida.
//
// Elige una frase al azar entre las que no han salido en las ultimas `window`
// tiradas de esa misma clave.
function pickFresh(pool, key, window = 50) {
  // Cadena vacia, no undefined: los callers hacen `.replace` sobre el resultado
  // y un pool vacio (o una clave mal escrita) reventaba el comando entero —
  // `undefined.replace is not a function` — cobrando aura y contestando con
  // una excepcion delante del grupo.
  if (!Array.isArray(pool) || pool.length === 0) return '';
  if (!key) return pick(pool);

  if (!_historialCargado) _cargarHistorial();

  // LRU de verdad: Map.set sobre una clave existente NO cambia el orden de
  // inserción, así que hay que borrar y volver a poner (igual que lidToPhone).
  let hist = _pickHistory.get(key);
  if (_pickHistory.has(key)) _pickHistory.delete(key);
  else if (_pickHistory.size >= _MAX_PICK_KEYS) {
    _pickHistory.delete(_pickHistory.keys().next().value);
  }
  if (!hist) hist = [];
  // Se bloquea como mucho el 60 % del pool, nunca "todo menos una".
  //
  // El tope antiguo era pool.length-1, y en un pool del tamaño de la ventana
  // dejaba UNA sola frase elegible: la elección dejaba de ser una elección y
  // el pool entero salía siempre en el mismo ciclo, en el mismo orden. Con el
  // 60 % un pool de 50 bloquea 30 y deja 20 entre las que sortear.
  //
  // Los pools grandes no cambian: en uno de 200 el mínimo sigue siendo la
  // ventana (50 < 120).
  //
  // El precio es que en un pool pequeño una frase puede reaparecer tras 31
  // usos en vez de 50. En los tramos que tienen 50 frases —los de poco
  // tráfico— eso son semanas de diferencia, no días.
  const block = new Set(hist.slice(-Math.min(window, Math.floor(pool.length * 0.6))));
  const hashes = _hashesDe(pool);
  const libres = [];
  for (let i = 0; i < pool.length; i++) if (!block.has(hashes[i])) libres.push(i);
  const indices = libres.length ? libres : pool.map((_, i) => i);
  const elegido = indices[Math.floor(Math.random() * indices.length)];

  hist.push(hashes[elegido]);
  if (hist.length > window + 4) hist.shift();
  _pickHistory.set(key, hist);
  _programarGuardado();
  return pool[elegido];
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Default cap for buffering attacker-controlled WhatsApp media (stickers,
// !toimg, !tagall forwards) fully into RAM before processing. Legitimate
// images/videos/stickers sent through normal chat are always well under
// this; only an oversized document attachment would ever hit it — and on a
// Termux/phone host, buffering an unbounded download is the more dangerous
// failure mode (OOM-kills the whole bot) than rejecting one odd request.
const MAX_DOWNLOAD_BYTES = 64 * 1024 * 1024;

// Tighter cap for media that gets fully buffered AND handed to ffmpeg (sticker
// sources, !toimg, !fk images). A sticker/photo source is always well under
// this; capping here instead of the 64MB default halves the worst-case RAM when
// two encodes run at once — the difference between fine and OOM on a 1GB box.
const MAX_MEDIA_BYTES = 24 * 1024 * 1024;

async function streamToBuffer(stream, maxBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    total += chunk.length;
    if (maxBytes && total > maxBytes) {
      throw new Error(`Archivo demasiado grande (>${Math.round(maxBytes / 1024 / 1024)}MB)`);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Lightweight counting semaphore. Used to cap how many ffmpeg/yt-dlp child
// processes run at once — a phone CPU that's fine with 2 concurrent encodes
// falls over with 6. Extra acquire() calls queue and resolve as slots free,
// same shape as the download queue in utils/downloader.js.
function createSemaphore(limit) {
  let active = 0;
  const queue = [];
  function acquire() {
    return new Promise((resolve) => {
      const tryRun = () => {
        if (active < limit) { active++; resolve(); }
        else queue.push(tryRun);
      };
      tryRun();
    });
  }
  function release() {
    active--;
    const next = queue.shift();
    if (next) next();
  }
  return { acquire, release };
}

// Shared across every command that spawns ffmpeg (stickers, !toimg, !ttp) so
// the cap is process-wide, not per-file. Limit of 2 mirrors the existing,
// already-proven MAX_CONCURRENT_DOWNLOADS in utils/downloader.js.
const ffmpegSemaphore = createSemaphore(2);

// Run ffmpeg reading `input` (a Buffer, or null) from stdin and resolving its
// stdout as a Buffer. Two things every ad-hoc ffmpeg spawn MUST have but the
// pfp/hash paths were missing: a hard timeout that SIGKILLs a hung/malicious
// input (a crafted profile photo could otherwise make ffmpeg spin forever and
// wedge the auto-indexer), and the shared ffmpegSemaphore so hashing/downscaling
// can't push the process-wide ffmpeg count past 2 on a 1GB box lazy-require of
// ffmpegPath avoids paying the binary-detection cost for non-media callers.
async function ffmpegToBuffer(args, input = null, timeoutMs = 10000) {
  const { ffmpegPath } = require('./ffmpeg');
  await ffmpegSemaphore.acquire();
  try {
    return await new Promise((resolve, reject) => {
      const ff = spawn(ffmpegPath, args);
      const chunks = [];
      let settled = false;
      const done = (fn, val) => { if (settled) return; settled = true; clearTimeout(timer); fn(val); };
      const timer = setTimeout(() => {
        try { ff.kill('SIGKILL'); } catch {}
        done(reject, new Error('ffmpeg timeout'));
      }, timeoutMs);
      ff.stdout.on('data', d => chunks.push(d));
      ff.on('error', e => done(reject, e));
      ff.on('close', code => {
        const out = Buffer.concat(chunks);
        if (code === 0 && out.length) done(resolve, out);
        else done(reject, new Error(`ffmpeg salió con código ${code}`));
      });
      ff.stdin.on('error', () => {}); // EPIPE si ffmpeg cierra antes de tiempo
      ff.stdin.end(input || undefined);
    });
  } finally {
    ffmpegSemaphore.release();
  }
}

// Atomic JSON write: serialize to a unique temp sibling, then rename over the
// target rename(2) is atomic on the same filesystem, so a crash, OOM-kill or
// battery cut mid-write leaves the PREVIOUS file intact instead of a truncated
// one. Without this, a corrupt half-write makes the next readJson throw, and
// the stores'`catch → {}` then silently wipes all persisted data on boot.
// Safe store read. Returns `fallback` ONLY when the file genuinely doesn't
// exist yet (first run). Any OTHER error — a transient EMFILE/ENOMEM/EACCES
// under memory pressure on a 1GB box, or a corrupt file — is rethrown, so the
// caller's load rejects and the in-memory store stays null instead of being
// reset to empty and then overwriting the good on-disk file. This closes the
// "one transient read error = permanent silent data wipe" hole.
async function readJsonOrEnoent(file, fallback) {
  try {
    return await fs.readJson(file);
  } catch (e) {
    if (e && e.code === 'ENOENT') return fallback;
    throw e;
  }
}

async function atomicWriteJson(file, data) {
  const tmp = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    // Compact JSON: these are machine-only files written every few seconds on
    // the debounced path — pretty-printing just doubles size and CPU/disk.
    await fs.outputFile(tmp, JSON.stringify(data));
    // rename, NO fs.move fs.move con overwrite hace remove(dest) ANTES del
    // rename (fs-extra/lib/move/move.js:28-35), así que deja una ventana en la
    // que el fichero de datos NO existe: un corte justo ahí se lleva el store
    // entero, que es exactamente lo que esta función promete evitar.
    //
    // rename(2) sobre un destino existente es atómico y nunca deja el hueco. El
    // temporal se crea en el mismo directorio que el destino a propósito, así
    // que están en el mismo sistema de ficheros y no hay EXDEV que valga.
    await fs.rename(tmp, file);
  } catch (err) {
    await fs.remove(tmp).catch(() => {});
    throw err;
  }
}

// Barre los .tmp que dejó un proceso anterior al morir a media escritura.
//
// atomicWriteJson limpia su temporal si la escritura falla, pero no puede hacer
// nada si al proceso lo MATAN entre el outputFile y el rename: ahí el catch no
// llega a ejecutarse nunca y el .tmp se queda. En la VPS eso pasa cada vez que
// pm2 reinicia por el tope de RAM o el OOM killer del kernel se lleva el bot, y
// como state.json se escribe cada pocos segundos, los huérfanos se acumulan.
// En una Oracle del plan gratuito eso es una fuga de disco lenta pero real.
//
// Solo se borran los de más de cinco minutos. El rename dura microsegundos, así
// que cualquier .tmp con esa edad es de un proceso que ya no existe — y si
// alguna vez llegara a haber dos instancias (no debería: ecosystem.config.js
// fuerza instances:1), este margen impide pisarle una escritura en vuelo.
const EDAD_HUERFANO_MS = 5 * 60 * 1000;

async function barrerHuerfanos(dir) {
  let borrados = 0;
  try {
    for (const f of await fs.readdir(dir)) {
      if (!f.endsWith('.tmp')) continue;
      const full = path.join(dir, f);
      try {
        const st = await fs.stat(full);
        if (Date.now() - st.mtimeMs < EDAD_HUERFANO_MS) continue;
        await fs.remove(full);
        borrados++;
      } catch { /* otro proceso se nos adelantó, o permisos: da igual */ }
    }
  } catch { /* el directorio no existe todavía */ }
  return borrados;
}

// Formato de numero con separador de miles en espanyol. Estaba duplicado
// literalmente en 8 modulos.
const fmt = n => n.toLocaleString('es-ES');

// ─── Cantidades que escribe la gente ─────────────────────────────────────────
//
// !robo, !dar, !duel y !aura apostar leen un numero de los argumentos. El
// parser viejo era `/^\d+$/` sobre el token crudo, y por tres caminos distintos
// IGNORABA lo que se acaba de escribir:
//
//   1. WhatsApp pega marcas bidi y espacios duros alrededor de las menciones.
//      "200" llega como "\u200e200" y la regex no lo ve. El bot elige al azar
//      y parece que la cifra no existe.
//   2. Si la mencion llega SIN @ (pasa en algunos clientes y en grupos LID),
//      el primer token de solo digitos es el TELEFONO de la victima. find()
//      se lo queda, lo recorta al tope, y el 200 que iba detras no se mira.
//      Resultado: siempre se robe el maximo, da igual lo que pidas.
//   3. 1.000, 2k, mitad, todo. Nadie escribe "1000" a pelo en un chat en
//      espanol, y esas formas no existian.
//
// Esto es el parser unico. Cada comando recorta despues, porque el tope es
// cosa suya.
const BASURA_WA = /[\u200e\u200f\u202a-\u202e\u2066-\u2069\u00a0\u1680\u2000-\u200d\u2028\u2029\u202f\u205f\u3000\ufeff]/g;

function limpiarToken(s) {
  return String(s == null ? '' : s).replace(BASURA_WA, '').trim();
}

const MODOS_CANTIDAD = {
  todo: 'todo', max: 'todo', all: 'todo', allin: 'todo', 'all-in': 'todo',
  entero: 'todo', full: 'todo', goloso: 'todo', codicia: 'todo',
  mitad: 'mitad', half: 'mitad', medio: 'mitad',
  poco: 'poco', min: 'poco', minimo: 'poco', mínimo: 'poco',
  cobarde: 'poco', calderilla: 'poco',
  dulce: 'dulce',
};

function parseEnteroAura(token) {
  const t = limpiarToken(token);
  if (!t || t.startsWith('@')) return null;

  const low = t.toLowerCase();

  const mk = low.match(/^(\d+(?:[.,]\d+)?)\s*k$/i);
  if (mk) {
    const n = Number(mk[1].replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return null;
    const v = Math.round(n * 1000);
    return v >= 1 && v < 1e10 ? v : null;
  }

  const mp = low.match(/^(\d+(?:[.,]\d+)?)\s*%$/);
  if (mp) {
    const n = Number(mp[1].replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return null;
    return { pct: Math.min(100, n) };
  }

  let s = t;
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  else if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, '');
  else if (/^\d+[.,]\d+$/.test(s)) s = s.replace(/[.,]\d+$/, '');
  else if (!/^\d+$/.test(s)) return null;

  // Telefono o LID: 10+ cifras. Ningun robo, duelo ni apuesta llega ahi.
  if (s.length >= 10) return null;
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parseCantidad(args) {
  const tokens = (Array.isArray(args) ? args : [args]).map(limpiarToken).filter(Boolean);
  let modo = null;
  let valor = null;
  let pct = null;

  for (const t of tokens) {
    const low = t.toLowerCase();
    if (MODOS_CANTIDAD[low]) {
      modo = MODOS_CANTIDAD[low];
      continue;
    }
    const n = parseEnteroAura(t);
    if (n && typeof n === 'object' && n.pct != null) {
      modo = 'pct';
      pct = n.pct;
      continue;
    }
    if (typeof n === 'number' && valor == null) valor = n;
  }

  return { modo, valor, pct };
}

function resolverCantidad(parsed, { max, suelo = 1, dulce = 0.45, poco = 0.15, porDefecto } = {}) {
  const tope = Math.max(suelo, Math.max(0, Number(max) || 0));
  let pedido;
  let elegido = true;

  if (parsed && parsed.modo === 'todo') pedido = tope;
  else if (parsed && parsed.modo === 'mitad') pedido = Math.max(suelo, Math.round(tope * 0.5));
  else if (parsed && parsed.modo === 'poco') pedido = Math.max(suelo, Math.round(tope * poco));
  else if (parsed && parsed.modo === 'dulce') pedido = Math.max(suelo, Math.round(tope * dulce));
  else if (parsed && parsed.modo === 'pct') pedido = Math.max(suelo, Math.round(tope * (parsed.pct || 0) / 100));
  else if (parsed && parsed.valor != null) pedido = parsed.valor;
  else {
    elegido = false;
    pedido = typeof porDefecto === 'number'
      ? porDefecto
      : Math.max(suelo, Math.round(tope * dulce));
  }

  const stake = Math.max(suelo, Math.min(pedido, tope));
  return { stake, pedido, elegido, recortado: elegido && pedido > tope };
}

function etiquetaRiesgo(fraccion) {
  if (!(fraccion > 0)) return 'sin agallas';
  if (fraccion >= 0.85) return 'a lo grande';
  if (fraccion >= 0.70) return 'goloso';
  if (fraccion <= 0.20) return 'cobarde';
  if (fraccion >= 0.35 && fraccion <= 0.55) return 'punto dulce';
  return null;
}

// Para que bot.js lo meta en su lista de volcados con el resto de stores. Antes
// el historial de frases era el UNICO estado que no estaba en esa lista: se
// salvaba por su cuenta y por eso hacia falta el handler de senales de arriba.
async function flushPickHistory() { _guardarYa(); }

// ─── EL DIA DEL BOT ──────────────────────────────────────────────────────────
//
// A que fecha pertenece un instante, en un huso y con la hora de corte que se
// le diga. Formato YYYY-MM-DD, que ordena y compara bien como texto.
//
// ESTO ESTABA ESCRITO TRES VECES —contador diario, racha y objetivo del dia— y
// las tres igual de mal:
//
//     FORMATO.format(new Date(ts - horaCorte * 3600 * 1000))
//
// Restarle las horas al INSTANTE y luego preguntar la fecha parece lo mismo y
// no lo es: los dos dias del año en que cambia la hora, esa resta cruza el
// salto y el corte se va sesenta minutos. Se veia en la racha (cortaba a las
// 06:00 y a las 04:00 en vez de a las 05:00) y en el objetivo del dia.
//
// Lo correcto es preguntar la hora local PRIMERO y decidir con ella a que dia
// pertenece; y cuando toca restar un dia, restarlo sobre la fecha reconstruida
// con Date.UTC, que no tiene horario de verano y por tanto no puede desviarse.
// (El ancla del mediodia es margen de sobra, no lo que sostiene el calculo:
// probado, con las 00:00 sale lo mismo. Se deja por si alguien cambia Date.UTC
// por un constructor en hora local, donde si importaria.)
//
// Una sola copia, y por eso: tres copias del mismo calculo son tres sitios
// donde arreglarlo y dos que se van a olvidar.
const _formatos = new Map();
function _partes(ts, zona) {
  let f = _formatos.get(zona);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: zona, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    });
    _formatos.set(zona, f);
  }
  const o = {};
  for (const x of f.formatToParts(new Date(ts))) {
    if (x.type !== 'literal') o[x.type] = Number(x.value);
  }
  return o;
}

function claveDia(ts, zona, horaCorte = 0) {
  const p = _partes(ts, zona);
  // El % 24 es defensivo: en este Node la medianoche llega como "00", pero
  // hour12:false la devuelve como "24" en otros entornos de ICU y ahi la
  // comparacion de abajo mandaria la medianoche al dia anterior. No lo cubre
  // ninguna prueba porque aqui no se puede reproducir; queda dicho.
  const hora = p.hour % 24;
  if (hora >= horaCorte) {
    return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  }
  const ayer = new Date(Date.UTC(p.year, p.month - 1, p.day, 12) - 24 * 3600 * 1000);
  return ayer.toISOString().slice(0, 10);
}

// Cuanto falta para el proximo corte. Se busca el instante EXACTO en que cambia
// la clave, en vez de calcularlo aparte con aritmetica de husos: asi la cuenta
// atras que se enseña y el reinicio de verdad no pueden discrepar nunca, que es
// el fallo clasico de este par. 26 h de margen cubren el dia del cambio de hora.
function msHastaCorte(ts, zona, horaCorte = 0) {
  const hoy = claveDia(ts, zona, horaCorte);
  let lo = ts, hi = ts + 26 * 3600 * 1000;
  if (claveDia(hi, zona, horaCorte) === hoy) return hi - ts;
  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2);
    if (claveDia(mid, zona, horaCorte) === hoy) lo = mid; else hi = mid;
  }
  return hi - ts;
}

module.exports = {
  claveDia, msHastaCorte,
  flushPickHistory,
  // ARSENAL (el regex) ya NO se exporta: lleva la bandera /g, o sea que arrastra
  // lastIndex entre llamadas y un `ARSENAL.test(x)` desde fuera devolveria true
  // y false alternandose sobre la MISMA frase. Aqui dentro se resetea antes de
  // usarlo; exportarlo era ofrecer esa trampa a quien no lo supiera. Quien
  // necesite la comprobacion tiene tieneArsenal, que ya lo hace bien.
  tieneArsenal,
  parseCantidad, resolverCantidad, etiquetaRiesgo, limpiarToken,
  fmt, ensureTemp, tempFile, cleanTemp, formatUptime, pick, pickFresh, withTimeout, shuffle, streamToBuffer, atomicWriteJson, readJsonOrEnoent, barrerHuerfanos, MAX_DOWNLOAD_BYTES, MAX_MEDIA_BYTES, createSemaphore, ffmpegSemaphore, ffmpegToBuffer };
