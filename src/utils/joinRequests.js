'use strict';

const path = require('path');
const { bareJid, canonicalJid } = require('./wa');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');
const logger = require('./logger');

// Quien tenía una solicitud de entrada PENDIENTE en cada grupo.
//
// Es el único dato que distingue "un admin aprobó una solicitud" de "un admin
// metió a alguien a dedo", y hace falta porque WhatsApp NO avisa de las
// aprobaciones:
//
//   RequestJoinAction = 'created' | 'revoked' | 'rejected'   (Types/GroupMetadata.d.ts:9)
//
// No hay 'approved'. Cuando el admin aprueba, lo único que llega es un alta
// normal, con el mismo messageStubType (27) que una alta a dedo. Por eso el
// intento anterior —mirar el stub— no podía funcionar y el bot seguía
// degradando al admin que solo había aceptado a alguien.
//
// Así que la pregunta se le da la vuelta: en vez de "¿cómo entró?", se guarda
// de antemano "¿quién estaba esperando a que le abrieran?". Si al llegar el
// alta esa persona figuraba en la lista de pendientes, fue una aprobación.
//
// La lista se llena por dos vías, porque ninguna basta sola:
//   1. el evento group.join-request (action 'created'), en tiempo real;
//   2. un sondeo periódico de groupRequestParticipantsList, que cubre las
//      solicitudes hechas con el bot apagado y las que llegan por enlace de
//      invitación, que en esta versión de Baileys no emiten evento.

const FILE = path.join(__dirname, '../../data/joinRequests.json');

// Una solicitud puede quedarse semanas sin que nadie la mire, así que el
// registro tiene que durar. Pasado el mes se olvida para no crecer sin fin.
const TTL = 30 * 86400000;
const MAX_POR_GRUPO = 500;

// Un sondeo se considera utilizable durante este rato. Si el último es más
// viejo, NO se sabe quién estaba esperando, y entonces no se castiga a nadie.
const SONDEO_VALIDO_MS = 15 * 60 * 1000;

let store = null;       // { [grupo]: { [canonicalJid]: ts } }
let loadPromise = null;
let saveTimer = null;
const ultimoSondeo = new Map(); // grupo -> ts del último sondeo con éxito

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(FILE, {})
      .then((d) => { store = d; })
      .catch((e) => {
        loadPromise = null;
        logger.warn(`joinRequests: lectura falló (${e.message}); no se toca el archivo`);
        throw e;
      });
  }
  await loadPromise;
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try { await atomicWriteJson(FILE, store); }
    catch (e) { logger.error(`joinRequests: fallo al guardar: ${e.message}`); }
  }, 5000);
}

function podar(g) {
  const corte = Date.now() - TTL;
  for (const k of Object.keys(g)) if (g[k] < corte) delete g[k];
  const claves = Object.keys(g);
  if (claves.length > MAX_POR_GRUPO) {
    claves.sort((a, b) => g[a] - g[b]);
    for (const k of claves.slice(0, claves.length - MAX_POR_GRUPO)) delete g[k];
  }
}

// Anota que esta persona tiene (o tenía) una solicitud pendiente.
async function notarSolicitud(grupo, jid) {
  if (!grupo || !jid) return;
  await load();
  const g = store[grupo] || (store[grupo] = {});
  g[canonicalJid(jid)] = Date.now();
  podar(g);
  scheduleSave();
}

// La solicitud se retiró o se rechazó: esa persona ya no está esperando, así
// que si más tarde la mete un admin es un alta a dedo de verdad.
async function olvidarSolicitud(grupo, jid) {
  if (!grupo || !jid) return;
  await load();
  const g = store[grupo];
  if (!g) return;
  delete g[canonicalJid(jid)];
  scheduleSave();
}

// ¿Esta persona estaba esperando aprobación? Se consulta por TODAS sus formas
// conocidas, porque la solicitud pudo registrarse con una y el alta llegar con
// otra. Consume la entrada: una solicitud sirve para una entrada.
async function estabaPendiente(grupo, forms) {
  await load();
  const g = store[grupo];
  if (!g) return false;
  const lista = Array.isArray(forms) ? forms : [forms];
  for (const f of lista) {
    if (!f) continue;
    for (const k of [canonicalJid(f), bareJid(f)]) {
      if (g[k] !== undefined && Date.now() - g[k] < TTL) {
        delete g[k];
        scheduleSave();
        return true;
      }
    }
  }
  return false;
}

// Sondea el servidor y anota a todo el que esté esperando. Devuelve cuántos
// había, o null si la consulta falló (y entonces el sondeo NO cuenta).
async function sondear(sock, grupo) {
  if (typeof sock?.groupRequestParticipantsList !== 'function') return null;
  let lista;
  try {
    lista = await sock.groupRequestParticipantsList(grupo);
  } catch (e) {
    logger.warn(`joinRequests: no pude leer las solicitudes de ${grupo}: ${e.message}`);
    return null;
  }
  for (const p of (lista || [])) {
    const jid = p?.jid || p?.phone_number || p?.lid;
    if (jid) await notarSolicitud(grupo, jid);
  }
  ultimoSondeo.set(grupo, Date.now());
  return (lista || []).length;
}

// ¿Se sabe de verdad quién estaba esperando en este grupo? Si no, quien decide
// castigar debe abstenerse: degradar y expulsar es irreversible.
function sondeoReciente(grupo) {
  const ts = ultimoSondeo.get(grupo);
  return Boolean(ts) && Date.now() - ts < SONDEO_VALIDO_MS;
}

async function flushJoinRequests() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (store) {
    try { await atomicWriteJson(FILE, store); }
    catch (e) { logger.error(`joinRequests: fallo al flush: ${e.message}`); }
  }
}

// Solo para pruebas.
function _reset() { store = null; loadPromise = null; ultimoSondeo.clear(); }
function _marcarSondeo(grupo, ts = Date.now()) { ultimoSondeo.set(grupo, ts); }

module.exports = {
  notarSolicitud, olvidarSolicitud, estabaPendiente, sondear, sondeoReciente,
  flushJoinRequests, SONDEO_VALIDO_MS, _reset, _marcarSondeo,
};
