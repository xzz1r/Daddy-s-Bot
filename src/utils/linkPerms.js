'use strict';

const path = require('path');
const { juntarPersona, agruparPorPersona, esObjeto } = require('./persona');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');
const logger = require('./logger');

// Permiso para publicar enlaces (!allow) y los avisos que lleva cada uno.
//
// store = { [grupoJid]: { [canonicalJid]: { ok: true, avisos: n, ts } } }
//   ok     → un admin le dio el permiso con *!allow*
//   avisos → cuántas veces se le ha borrado un enlace sin tener permiso.
//            Al tercero se le banea, así que esto NO puede vivir solo en
//            memoria: un reinicio le regalaría los avisos ya gastados.
//
// La clave es canonicalJid, igual que en aura y en el contador, y las formas
// viejas se juntan al leer (ficha): si no, la misma persona tendría un permiso
// por cada forma de su JID y los avisos se le partirían en dos montones.

const FILE = path.join(__dirname, '../../data/linkperms.json');

// Avisos antes del ban. El tercero es el que lo echa.
const MAX_AVISOS = 3;

// EL PERMISO CADUCA. Antes era para siempre: isAllowed() solo miraba `ok` y el
// `ts` que se guardaba no lo leia nadie. Un admin daba *!allow* para que alguien
// pusiera UN enlace y esa persona quedaba autorizada de por vida, incluida la
// vez que volviera a acordarse seis meses despues.
//
// Dos horas es para lo que se da de verdad: "ponlo y ya". Si hace falta mas,
// volver a darlo cuesta un mensaje.
const DURACION_MS = 2 * 60 * 60 * 1000;

// LA FECHA DE CONCESION VA EN SU PROPIO CAMPO, y esto no es un detalle. El `ts`
// de siempre lo reescriben noteWarning() y resetWarnings(), que son
// contabilidad de avisos y no tienen nada que ver con el permiso. Si la
// caducidad se midiera con `ts`, cada aviso registrado le RENOVARIA el permiso
// a quien lo tiene — justo al revés de lo que se quiere.
function vivo(rec) {
  if (!rec?.ok) return false;
  const desde = rec.desde || rec.ts || 0;   // fichas viejas: se cuenta desde su ts
  return Date.now() - desde < DURACION_MS;
}

function restanteMs(rec) {
  if (!vivo(rec)) return 0;
  return DURACION_MS - (Date.now() - (rec.desde || rec.ts || 0));
}

let store = null;
let loadPromise = null;
let saveTimer = null;

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(FILE, {})
      .then((d) => { store = d; })
      .catch((e) => {
        loadPromise = null; // permite reintentar; NUNCA resetear+sobrescribir
        logger.warn(`linkPerms: lectura falló (${e.message}); no se toca el archivo`);
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
    catch (e) { logger.error(`linkPerms: fallo al guardar: ${e.message}`); }
  }, 3000);
}

// DOS FICHAS DE LA MISMA PERSONA SE JUNTAN EN UNA, y aqui estaba el ban.
//
// El permiso se da mencionando a alguien, y en un grupo LID la mencion es su
// @lid. Si el bot aun no sabia su telefono, la ficha se guardaba bajo el @lid.
// En cuanto lo aprendia, canonicalJid() de CUALQUIERA de sus formas pasaba a
// dar el telefono, y el permiso se quedaba en una clave que ya nadie miraba.
// Reproducido: permiso dado, telefono aprendido, enlace publicado — borrado y
// aviso. Al tercero, BAN, con el permiso de un admin vigente.
//
// Ahora cada lectura junta las dos fichas (utils/persona.js). Manda la mas
// reciente, que es la ultima vez que se toco algo: un permiso, un aviso, un
// perdon, una retirada. Con una excepcion, que es justo ese fallo: un AVISO no
// tapa un permiso que sigue VIVO en la otra forma. Si hay un aviso posterior a
// un permiso vigente es que el permiso no se estaba viendo, porque con el
// visto no se habria borrado nada.
//
// Los avisos de dos fichas viejas NO se suman. No se sabe cuales llegaron antes
// de un perdon (el ban limpia los avisos, y un permiso tambien), y sumarlos
// podria juntar tres de dos epocas distintas y banear por algo ya perdonado.
// Un aviso de menos es un enlace de mas; uno de mas es un ban injusto.
function combinarFichas(fichas) {
  const orden = [...fichas].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const base = orden[0];
  if (!vivo(base) && (base.avisos || 0) > 0) {
    const permiso = orden.find(vivo);
    if (permiso) return permiso;
  }
  return base;
}

function ficha(grupo, jid) {
  const g = store[grupo] || (store[grupo] = {});
  const { clave: k, cambio } = juntarPersona(g, jid, combinarFichas, { valido: esObjeto });
  if (cambio) scheduleSave();
  return { g, k, rec: g[k] };
}

// Da el permiso. Devuelve true si no lo tenía ya.
async function allow(grupo, jid) {
  await load();
  const { g, k, rec } = ficha(grupo, jid);
  const nuevo = !rec?.ok;
  // Al dar el permiso se le perdonan los avisos: ya no tiene sentido contarlos.
  g[k] = { ok: true, avisos: 0, ts: Date.now(), desde: Date.now() };
  await flushLinkPerms();
  return nuevo;
}

// Quita el permiso. Devuelve true si lo tenía. Los avisos se dejan a cero: el
// que ya cumplió no arrastra un historial que lo banee al primer resbalón.
async function disallow(grupo, jid) {
  await load();
  const { g, k, rec } = ficha(grupo, jid);
  if (!rec?.ok) return false;
  g[k] = { ok: false, avisos: 0, ts: Date.now() };
  await flushLinkPerms();
  return true;
}

// ¿Tiene permiso? Se consultan TODAS las formas conocidas del usuario, porque
// el permiso pudo darse sobre una y el mensaje llegar con otra.
async function isAllowed(grupo, forms) {
  await load();
  if (!store[grupo]) return false;
  for (const f of (Array.isArray(forms) ? forms : [forms])) {
    if (!f) continue;
    if (vivo(ficha(grupo, f).rec)) return true;
  }
  return false;
}

// Borra los avisos acumulados. Se llama justo tras el ban: si no, quien
// consiguiera volver al grupo se comería otro ban con el primer enlace, sin un
// solo aviso, mientras el mensaje del bot afirma que se le avisó dos veces.
async function resetWarnings(grupo, jid) {
  await load();
  const { g, k, rec } = ficha(grupo, jid);
  if (!rec || !rec.avisos) return;
  // `desde` se ARRASTRA: si se recalculara aqui, borrar los avisos le
  // renovaria las dos horas a quien ya las tenia corriendo.
  g[k] = { ok: Boolean(rec.ok), avisos: 0, ts: Date.now(), desde: rec.desde };
  scheduleSave();
}

// Suma un aviso y dice cuántos lleva y si toca banear.
async function noteWarning(grupo, jid) {
  await load();
  const { g, k, rec } = ficha(grupo, jid);
  const avisos = (rec?.avisos || 0) + 1;
  g[k] = { ok: false, avisos, ts: Date.now() };
  scheduleSave();
  return { avisos, restantes: Math.max(0, MAX_AVISOS - avisos), ban: avisos >= MAX_AVISOS };
}

// Los que tienen permiso en este grupo.
async function listAllowed(grupo) {
  await load();
  const g = store[grupo];
  if (!g) return [];
  // Solo los que lo tienen VIVO: listar permisos caducados es prometer algo
  // que el bot ya no cumple. Y una vez por persona, con la forma que se puede
  // mencionar: con el permiso partido salia dos veces, una de ellas un @lid.
  const out = [];
  for (const { rep, claves } of agruparPorPersona(Object.keys(g)).values()) {
    const fichas = claves.map((k) => g[k]).filter(esObjeto);
    if (fichas.length && vivo(fichas.length === 1 ? fichas[0] : combinarFichas(fichas))) out.push(rep);
  }
  return out;
}

async function flushLinkPerms() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (store) {
    try { await atomicWriteJson(FILE, store); }
    catch (e) { logger.error(`linkPerms: fallo al flush: ${e.message}`); }
  }
}

// Solo para pruebas.
function _reset() { store = null; loadPromise = null; }

module.exports = {
  DURACION_MS, restanteMs,
  allow, disallow, isAllowed, noteWarning, resetWarnings, listAllowed, flushLinkPerms,
  MAX_AVISOS, _reset,
};
