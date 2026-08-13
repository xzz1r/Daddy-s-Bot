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
        logger.warn(`joinRequests: lectura falló (${e.message}); no se toca el archivo.`);
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
    catch (e) { logger.error(`joinRequests: fallo al guardar: ${e.message}.`); }
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

// ── Freno por grupo ──────────────────────────────────────────────────────────
//
// El sondeo corre cada pocos minutos y hay grupos que NUNCA van a contestar:
// WhatsApp devuelve `forbidden` cuando el bot no es admin o cuando el grupo no
// tiene activada la aprobación de entradas. Insistir cada tres minutos contra
// eso no arregla nada: llena el log de avisos idénticos y gasta peticiones que
// acaban provocando el `rate-overlimit` que sale al listar los grupos.
//
// Así que cada grupo que falla se aparta un rato:
//   · forbidden / not-authorized → es un ESTADO, no un fallo pasajero. Seis
//     horas, y se levanta antes si el bot recibe admin (lo llama bot.js).
//   · cualquier otro fallo → espera creciente, de un ciclo a una hora.
//
// Y se anota con logger.info, NO con warn. Que no se pueda leer la lista de
// solicitudes de un grupo no rompe nada: el bot sigue funcionando igual y el
// anti-admin simplemente se abstiene de castigar altas ahí, que es lo que ya
// hacía sin lista fresca. Sacarlo por warn llenaba el log de avisos que el
// dueño no tiene que leer ni puede accionar. Con LOG_LEVEL=verbose se ve.
const ESPERA_PROHIBIDO = 6 * 60 * 60 * 1000;
const ESPERA_BASE = 3 * 60 * 1000;
const ESPERA_MAX = 60 * 60 * 1000;
const PROHIBIDO = /forbidden|not-?authorized|unauthorized|\b40[13]\b/i;

const frenados = new Map(); // grupo -> { hasta, fallos }

// Sondea el servidor y anota a todo el que esté esperando. Devuelve cuántos
// había, o null si la consulta falló o el grupo está frenado (y entonces el
// sondeo NO cuenta).
async function sondear(sock, grupo) {
  if (typeof sock?.groupRequestParticipantsList !== 'function') return null;

  const freno = frenados.get(grupo);
  if (freno && Date.now() < freno.hasta) return null;

  let lista;
  try {
    lista = await sock.groupRequestParticipantsList(grupo);
  } catch (e) {
    const msg = e?.message || String(e);
    const prohibido = PROHIBIDO.test(msg);
    const fallos = prohibido ? 1 : (freno?.fallos || 0) + 1;
    const espera = prohibido
      ? ESPERA_PROHIBIDO
      : Math.min(ESPERA_BASE * 2 ** (fallos - 1), ESPERA_MAX);
    // `nuevo` lo consume bot.js para diagnosticar UNA vez por bloqueo por qué
    // este grupo no contesta, que es lo único que no se puede saber desde aquí.
    frenados.set(grupo, { hasta: Date.now() + espera, fallos, prohibido, nuevo: true });
    const mins = Math.round(espera / 60000);
    logger.info(
      prohibido
        ? `joinRequests: ${grupo} no deja leer las solicitudes (${msg}).` +
          `O no soy admin o el grupo no pide aprobación para entrar.` +
          `No lo vuelvo a intentar en ${mins} min.`
        : `joinRequests: fallo al leer las solicitudes de ${grupo} (${msg}). Reintento en ${mins} min.`
    );
    return null;
  }

  frenados.delete(grupo);
  for (const p of (lista || [])) {
    const jid = p?.jid || p?.phone_number || p?.lid;
    if (jid) await notarSolicitud(grupo, jid);
  }
  ultimoSondeo.set(grupo, Date.now());
  return (lista || []).length;
}

// ¿Se acaba de frenar este grupo? Devuelve el freno la PRIMERA vez que se
// pregunta tras crearlo, y null después. Sirve para explicar el motivo una sola
// vez por bloqueo en lugar de en cada ciclo.
function frenoNuevo(grupo) {
  const f = frenados.get(grupo);
  if (!f?.nuevo) return null;
  f.nuevo = false;
  return f;
}

// Levanta el freno de un grupo. Lo llama bot.js cuando al bot le dan admin
// ahí: es justo el cambio que puede convertir el `forbidden` en una lista.
function reactivarSondeo(grupo) {
  if (frenados.delete(grupo)) {
    logger.info(`joinRequests: vuelvo a sondear ${grupo}.`);
  }
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
    catch (e) { logger.error(`joinRequests: fallo al flush: ${e.message}.`); }
  }
}

// Solo para pruebas.
function _reset() { store = null; loadPromise = null; ultimoSondeo.clear(); frenados.clear(); }
function _marcarSondeo(grupo, ts = Date.now()) { ultimoSondeo.set(grupo, ts); }
function _frenado(grupo) { return frenados.get(grupo) || null; }

module.exports = {
  notarSolicitud, olvidarSolicitud, estabaPendiente, sondear, sondeoReciente,
  reactivarSondeo, frenoNuevo, flushJoinRequests, SONDEO_VALIDO_MS,
  _reset, _marcarSondeo, _frenado,
};
