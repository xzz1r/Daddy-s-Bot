const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { atomicWriteJson, ffmpegToBuffer, readJsonOrEnoent } = require('./helpers');
const { isBanned } = require('./banlist');
const { getUserCount } = require('./messageCounter');
const logger = require('./logger');

// A partir de cuántos mensajes en el grupo consideramos a alguien "contador
// alto" (miembro activo que vale la pena cachear).
const HIGH_COUNT = 100;

// Esta caché tiene DOS clientes con necesidades opuestas, y durante un tiempo
// solo se atendió a uno:
//
//   · el anti-fake, al que le vale una miniatura: solo compara huellas.
//   · *!pfp*, que ENSEÑA esta imagen a la gente cuando la foto de alguien ya no
//     se puede pedir en directo (oculta, cambiada, o la cuenta fuera).
//
// Estaba calibrada solo para el primero: 256px y calidad 7 de JPEG, unos 10 KB.
// Perfecto para una huella y lamentable para mirarlo, que es lo que se veía en
// el grupo cuando !pfp tiraba de caché.
//
// Ahora se guarda a 640px y calidad 3. WhatsApp sirve las fotos de perfil a
// 640x640 como mucho, así que en la práctica se conserva el original entero y
// ya no se recorta nada visible. `min(640,iw)` evita ampliar una foto que venga
// más pequeña (ampliarla no añade detalle: solo la emborrona y ocupa más), y
// `-2` deja que la altura salga sola manteniendo la proporción.
//
// El coste en disco sube de ~10 KB a ~50 KB por cuenta: con el tope de 1.200
// entradas, unos 60 MB en el peor caso. Asumible, y la huella se calcula igual
// de bien sobre una imagen grande que sobre una pequeña.
const DOWNSCALE_ARGS = [
  '-hide_banner', '-loglevel', 'error',
  '-i', 'pipe:0', '-frames:v', '1',
  '-vf', "scale='min(640,iw)':-2",
  '-q:v', '3', '-f', 'mjpeg', 'pipe:1',
];

// Normaliza la imagen para la caché. Timeout+SIGKILL+semáforo vienen de
// ffmpegToBuffer (una foto maliciosa no cuelga ffmpeg ni salta el tope de 2
// procesos). Devuelve el buffer resultante, o null si falla.
async function downscale(buf) {
  try { return await ffmpegToBuffer(DOWNSCALE_ARGS, buf, 10000); }
  catch { return null; }
}

// Decide si vale la pena cachear la foto de esta cuenta. Solo guardamos a los
// que importan para el anti-fake: sospechosos (huella que coincide con otra
// cuenta/fake, o en lista negra) o miembros muy activos (contador alto). Al
// resto no lo cacheamos → mínimo espacio.
async function shouldKeep({ group, rawJid, account, matches }) {
  if (matches && matches.length) return true; // huella sospechosa
  try {
    const forms = [account, rawJid].filter(Boolean);
    if (await isBanned(forms)) return true;
  } catch {}
  if (group && rawJid) {
    try { if (await getUserCount(group, rawJid) >= HIGH_COUNT) return true; } catch {}
  }
  return false;
}

// Cachea la foto SOLO si la cuenta pasa el filtro shouldKeep, y siempre reducida.
async function maybeStore(ctx, buf) {
  if (!buf || !ctx?.account) return;
  if (!(await shouldKeep(ctx))) return;
  const small = await downscale(buf);
  // Si ffmpeg no pudo reescalar (ocupado, timeout, formato raro), NO se guarda
  // el original a lo bruto: solo si es lo bastante pequeño. Antes se guardaba
  // siempre, y ese era el camino por el que la caché se comía el disco.
  if (!small && buf.length > MAX_CRUDO_BYTES) return;
  await put(ctx.account, small || buf);
}

// Caché en disco de la ÚLTIMA foto de perfil vista de cada cuenta. WhatsApp no
// deja ver una foto que el dueño puso oculta/privada — pero si. el bot la vio
// alguna vez cuando estaba visible (vía !pfp o el indexador automático), la
// guardamos aquí. Así !pfp puede mostrar la última foto conocida aunque ahora
// esté oculta o la persona la haya cambiado. Los bytes van a archivos sueltos
// (una foto por cuenta, se sobreescribe con la más reciente) y un índice JSON
// liviano guarda fechas. Tope LRU por lastSeen para no llenar el disco de Termux.
const DIR = path.join(__dirname, '../../data/pfpcache');
const INDEX = path.join(DIR, 'index.json');
const MAX_ENTRIES = 1200;
const MAX_IMG_BYTES = 3 * 1024 * 1024;

// Tope DURO de disco. Faltaba, y era el mayor riesgo de espacio del bot en una
// máquina pequeña: solo se contaban las ENTRADAS (1.200), nunca lo que ocupaban.
// Con el reescalado funcionando son unos 35 KB cada una — 41 MB, inofensivo —
// pero cuando el reescalado fallaba se guardaba el ORIGINAL, de hasta 3 MB.
// 1.200 originales son 3,5 GB, y en el disco de una Oracle gratuita eso duele.
//
// Ajustable con PFP_CACHE_MB en el .env, para no tener que tocar el código si la
// máquina va más justa.
const MAX_CACHE_BYTES = Math.max(8, Number(process.env.PFP_CACHE_MB) || 60) * 1024 * 1024;

// Y si el reescalado falla, hay un límite para lo que se guarda en crudo. Una
// foto reescalada ocupa ~35 KB; aceptar hasta 300 KB deja margen de sobra para
// un original pequeño y descarta los que llenarían el disco. Lo que no entra no
// se cachea y punto: la huella se recalcula la próxima vez que haga falta.
const MAX_CRUDO_BYTES = 300 * 1024;

let index = null; // { [account]: { file, firstSeen, lastSeen } }
let loadPromise = null;
let saveTimer = null;

function fileFor(account) {
  return crypto.createHash('sha1').update(String(account)).digest('hex') + '.bin';
}

async function load() {
  if (index) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(INDEX, {})
      .then((d) => { index = (d && typeof d === 'object') ? d : {}; reconcileOrphans(); medirEntradasSinTamano(); })
      .catch((e) => {
        loadPromise = null;
        logger.warn(`pfpCache: lectura falló (${e.message}); no se toca el archivo`);
        throw e;
      });
  }
  await loadPromise;
}

// Fire-and-forget once at load: delete .bin files that no index entry points to.
// These orphans come from a crash between writing the image and the debounced
// index save, or from an eviction whose unlink failed. Without this the folder
// grows past MAX_ENTRIES on disk even though the index is bounded.
async function reconcileOrphans() {
  try {
    const referenced = new Set(Object.values(index).map(e => e && e.file).filter(Boolean));
    const files = await fs.readdir(DIR).catch(() => []);
    for (const name of files) {
      if (name === 'index.json' || !name.endsWith('.bin')) continue;
      if (!referenced.has(name)) await fs.remove(path.join(DIR, name)).catch(() => {});
    }
  } catch {}
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try { await atomicWriteJson(INDEX, index); }
    catch (e) { logger.error(`pfpCache: fallo al guardar índice: ${e.message}`); }
  }, 4000);
}

// Tira las entradas menos usadas hasta respetar LOS DOS topes: número y bytes.
// Antes solo miraba el número, así que 1.200 fotos sin reescalar podían ocupar
// gigas sin que nada las tocara.
function desalojar() {
  let bytes = 0, n = 0;
  for (const e of Object.values(index)) { bytes += e.bytes || 0; n++; }

  while (n > MAX_ENTRIES || bytes > MAX_CACHE_BYTES) {
    let viejo = null, ts = Infinity;
    for (const [acc, e] of Object.entries(index)) {
      if (e.lastSeen < ts) { ts = e.lastSeen; viejo = acc; }
    }
    if (!viejo) break;
    fs.remove(path.join(DIR, index[viejo].file)).catch(() => {});
    bytes -= index[viejo].bytes || 0;
    delete index[viejo];
    n--;
  }
}

// Las entradas escritas antes de que existiera el tope de bytes no guardaban su
// tamaño. Sin medirlas, el desalojo las contaría como 0 y el tope no serviría
// justo con lo que ya está en disco, que es lo que hay que limpiar.
async function medirEntradasSinTamano() {
  try {
    let tocadas = 0;
    for (const [acc, e] of Object.entries(index)) {
      if (typeof e.bytes === 'number') continue;
      try { e.bytes = (await fs.stat(path.join(DIR, e.file))).size; tocadas++; }
      catch { delete index[acc]; tocadas++; }   // el fichero ya no está
    }
    if (tocadas) { desalojar(); scheduleSave(); }
  } catch {}
}

// Guarda (o actualiza) la última foto conocida de `account`.
async function put(account, buf, now = Date.now()) {
  if (!account || !buf || !buf.length || buf.length > MAX_IMG_BYTES) return;
  await load();
  try {
    await fs.ensureDir(DIR);
    const existing = index[account];
    const file = existing?.file || fileFor(account);
    await fs.writeFile(path.join(DIR, file), buf);
    if (existing) {
      existing.lastSeen = now;
      existing.bytes = buf.length;   // al actualizarse puede cambiar de tamaño
    } else {
      index[account] = { file, firstSeen: now, lastSeen: now, bytes: buf.length };
    }
    // Se desaloja en CADA escritura, no solo al crear entradas nuevas: cambiar
    // una foto por otra más grande también puede pasarse del tope de bytes.
    desalojar();
    scheduleSave();
  } catch (e) {
    logger.warn(`pfpCache: no pude guardar foto de ${account}: ${e.message}`);
  }
}

// Devuelve { buf, firstSeen, lastSeen } de la última foto conocida, o null.
async function get(account) {
  if (!account) return null;
  await load();
  const e = index[account];
  if (!e) return null;
  try {
    const buf = await fs.readFile(path.join(DIR, e.file));
    return { buf, firstSeen: e.firstSeen, lastSeen: e.lastSeen };
  } catch { return null; }
}

async function flush() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (index) {
    try { await atomicWriteJson(INDEX, index); }
    catch (e) { logger.error(`pfpCache: fallo al flush: ${e.message}`); }
  }
}

module.exports = { put, maybeStore, get, flush };
