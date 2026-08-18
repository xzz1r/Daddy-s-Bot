const axios = require('axios');
const { computeHash } = require('./phash');
const { recordAndMatch } = require('./pfpStore');
const pfpCache = require('./pfpCache');
const { canonicalJid } = require('./wa');
const logger = require('./logger');

// Indexado AUTOMÁTICO de fotos de perfil. El historial de huellas se construye
// solo, con la actividad normal del grupo — no hace falta ejecutar comandos a
// mano. Fuentes que lo alimentan:
//   • cada mensaje entrante  → maybeIndex(sender)   (el motor principal)
//   • cada entrada al grupo  → maybeIndex(joiner)
//   • al conectar            → sweepAllGroups()      (backfill inicial)
//
// Una guarda TTL evita re-descargar la misma foto una y otra vez: como mucho se
// baja una vez por cuenta cada INDEX_TTL_MS.
//
// ─── EL RITMO ES LO MÁS IMPORTANTE DE ESTE FICHERO ──────────────────────────
//
// Consultar la foto de perfil de alguien es una petición a WhatsApp. Hacerlo
// cientos de veces seguidas es scraping, lo mire quien lo mire, y es de lo que
// más rápido restringe una cuenta.
//
// Antes había un tope de concurrencia (3) pero NINGUNA pausa: en cuanto un
// trabajo terminaba se lanzaba el siguiente, así que un grupo de 200 personas
// salían a unas quince consultas por segundo durante trece segundos seguidos.
// Ningún humano abre doscientos perfiles en trece segundos.
//
// Y el barrido se disparaba en CADA conexión. Con el bucle de reconexión que
// hubo —sesenta reconexiones en tres minutos— eso son sesenta barridos
// completos: miles de consultas de perfil en minutos. El log ya avisaba con un
// `rate-overlimit` que en su momento pareció menor.
//
// Ahora va de una en una, con una pausa entre cada consulta. El barrido de un
// grupo de 200 pasa de trece segundos a unos siete minutos, que para algo que
// corre en segundo plano y sin prisa es exactamente lo que debe tardar.
const INDEX_TTL_MS = 3 * 86400000; // no re-indexar la misma cuenta antes de 3 días
const MAX_CONCURRENT = 1;          // de una en una: esto no es una descarga masiva
const PAUSA_MS = 2000;             // y con dos segundos entre consulta y consulta
const MAX_TRACKED = 8000;
const MAX_QUEUE = 500; // tope de trabajos en cola (protege RAM en el barrido inicial)

// El barrido inicial NO se repite en cada reconexión: se guarda cuándo se hizo
// el último y no se vuelve a lanzar hasta pasadas seis horas. Reconectar no
// descubre miembros nuevos —para eso ya está el indexado por mensaje y por
// alta—, así que rebarrer al reconectar era puro coste sin información nueva.
const BARRIDO_CADA_MS = 6 * 3600 * 1000;
let ultimoBarrido = 0;

const lastIndexed = new Map(); // account -> ts (última vez que se intentó)
const queue = [];
let active = 0;

function markTracked(account, ts) {
  if (lastIndexed.size >= MAX_TRACKED && !lastIndexed.has(account)) {
    lastIndexed.delete(lastIndexed.keys().next().value);
  }
  lastIndexed.set(account, ts);
}

function pump() {
  while (active < MAX_CONCURRENT && queue.length) {
    const job = queue.shift();
    active++;
    // La pausa va DESPUÉS de cada trabajo, no antes: así el ritmo se mantiene
    // aunque la consulta sea instantánea por caché o falle enseguida. Ponerla
    // antes solo retrasaría el primero y dejaría el resto en ráfaga igual.
    job().catch(() => {}).finally(() => {
      active--;
      if (queue.length) setTimeout(pump, PAUSA_MS);
    });
  }
}

// Encola (si toca) el indexado de la foto de `pfpJid` en `groupJid`. No bloquea:
// devuelve enseguida. `pfpJid` es el JID tal cual lo conoce WhatsApp (lo que
// acepta profilePictureUrl); la clave de deduplicado es su forma canónica.
function maybeIndex(sock, pfpJid, groupJid) {
  if (!sock || !pfpJid) return;
  const account = canonicalJid(pfpJid);
  const now = Date.now();
  const prev = lastIndexed.get(account);
  if (prev && now - prev < INDEX_TTL_MS) return; // ya indexado hace poco
  // Cap the backlog: on first boot sweepAllGroups enqueues every member of every
  // group at once (each closure retains sock+JIDs). Past the ceiling we skip
  // WITHOUT marking tracked, so this account is retried on its next message/join
  // instead of being silently dropped for the whole TTL window.
  if (queue.length >= MAX_QUEUE) return;
  markTracked(account, now); // optimista: no volver a encolar mientras corre

  queue.push(async () => {
    try {
      const url = await sock.profilePictureUrl(pfpJid, 'image');
      if (!url) return;
      const res = await axios.get(url, {
        responseType: 'arraybuffer', timeout: 10000,
        maxContentLength: 20 * 1024 * 1024, maxBodyLength: 20 * 1024 * 1024,
      });
      const buf = Buffer.from(res.data);
      const hash = await computeHash(buf);
      const matches = await recordAndMatch(groupJid || null, account, hash, Date.now());
      // Guarda la imagen (reducida) SOLO si la cuenta es sospechosa o muy activa,
      // para que !pfp pueda mostrar la última foto conocida si luego la ocultan.
      // Al resto no lo cacheamos → mínima huella en disco.
      pfpCache.maybeStore({ group: groupJid || null, rawJid: pfpJid, account, matches }, buf).catch(() => {});
    } catch {
      // Sin foto / oculta / red: no pasa nada, se reintenta pasado el TTL.
    }
  });
  pump();
}

// Barrido inicial: recorre todos los grupos del bot e indexa a sus miembros.
// Escalonado por la cola (tope de concurrencia), así un grupo de 200 no dispara
// 200 descargas de golpe. Se llama una vez al conectar.
// `yaPedidos` es el mapa que bot.js acaba de traerse. Se acepta de fuera para
// no repetir groupFetchAllParticipating, que es la consulta mas cara del bot y
// la que dispara el rate-overlimit. Si no llega, se pide (arranques sueltos).
async function sweepAllGroups(sock, yaPedidos = null) {
  const ahora = Date.now();
  if (ultimoBarrido && ahora - ultimoBarrido < BARRIDO_CADA_MS) {
    logger.info('pfpIndexer: barrido omitido (se hizo hace menos de 6 h)');
    return;
  }
  ultimoBarrido = ahora;

  let groups = yaPedidos;
  if (!groups) {
    try { groups = await sock.groupFetchAllParticipating(); }
    catch (e) { logger.warn(`pfpIndexer: no pude listar grupos: ${e.message}`); return; }
  }

  let enqueued = 0;
  for (const [groupJid, meta] of Object.entries(groups || {})) {
    for (const p of (meta?.participants || [])) {
      const id = typeof p === 'string' ? p : p?.id;
      if (!id) continue;
      maybeIndex(sock, id, groupJid);
      enqueued++;
    }
  }
  if (enqueued) logger.info(`pfpIndexer: barrido inicial de ${enqueued} miembros en cola.`);
}

module.exports = { maybeIndex, sweepAllGroups };
