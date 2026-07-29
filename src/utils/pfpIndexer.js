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
// baja una vez por cuenta cada INDEX_TTL_MS. Un pool con tope de concurrencia
// evita ráfagas contra los servidores de WhatsApp.

const INDEX_TTL_MS = 3 * 86400000; // no re-indexar la misma cuenta antes de 3 días
const MAX_CONCURRENT = 3;
const MAX_TRACKED = 8000;
const MAX_QUEUE = 500; // tope de trabajos en cola (protege RAM en el barrido inicial)

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
    job().catch(() => {}).finally(() => { active--; pump(); });
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
async function sweepAllGroups(sock) {
  let groups;
  try { groups = await sock.groupFetchAllParticipating(); }
  catch (e) { logger.warn(`pfpIndexer: no pude listar grupos: ${e.message}`); return; }

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
