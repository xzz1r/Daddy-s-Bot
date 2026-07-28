const path = require('path');
const { bareJid } = require('./wa');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');
const logger = require('./logger');

// Nombres visibles (pushName) de cada miembro, para !antinick.
//
// De esto cuelga una expulsión irreversible, así que el diseño es deliberado:
//
//  1. AUSENCIA DE DATO NO ES "NO TIENE NICK". WhatsApp no siempre adjunta el
//     atributo notify (mensajes de sistema, reenvíos, ciertos protocolos), así
//     que pushName llega undefined con normalidad para gente que SÍ tiene
//     nombre. Guardar eso como cadena vacía marcaría para expulsión a quien no
//     toca. Aquí un pushName ausente solo incrementa un contador.
//
//  2. UN NOMBRE BUENO NUNCA SE PISA con una ausencia. Solo lo reemplaza otro
//     nombre real.
//
//  3. LA CLAVE ES bareJid, NO canonicalJid. canonicalJid depende del mapa
//     lidToPhone, que se va llenando durante la ejecución: el mismo usuario
//     daría el LID crudo con el mapa frío y el teléfono con el mapa caliente,
//     partiendo su registro en dos. bareJid es estable siempre; la unificación
//     se hace al LEER, consultando todas las formas conocidas del participante.
//
// store = { [groupJid]: { [bareJid]: { name, ts, misses } } }
//   name   → último nombre real visto ('' si nunca se ha visto ninguno)
//   ts     → cuándo se actualizó por última vez
//   misses → mensajes suyos observados sin nombre adjunto

const FILE = path.join(__dirname, '../../data/nicks.json');

// Hacen falta varias observaciones sin nombre antes de dar por hecho que
// alguien no tiene nick: una sola puede ser un mensaje sin notify.
const MIN_MISSES = 2;

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
        logger.warn(`nickStore: lectura falló (${e.message}); no se toca el archivo`);
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
    catch (e) { logger.error(`nickStore: fallo al guardar: ${e.message}`); }
  }, 10000);
}

async function recordNick(groupJid, userJid, pushName) {
  if (!groupJid || !userJid) return;
  await load();
  const key = bareJid(userJid);
  if (!store[groupJid]) store[groupJid] = {};
  const prev = store[groupJid][key] || { name: '', ts: 0, misses: 0 };

  const real = typeof pushName === 'string' && pushName.trim().length > 0;

  if (real) {
    const name = pushName.trim();
    if (prev.name === name) return; // sin cambios, no reescribir ni re-guardar
    store[groupJid][key] = { name, ts: Date.now(), misses: 0 };
    scheduleSave();
    return;
  }

  // Sin nombre en este mensaje: NO se toca prev.name, solo se cuenta.
  // Se topea para que el JSON no crezca con números enormes.
  const misses = Math.min((prev.misses || 0) + 1, MIN_MISSES + 2);
  if (misses === prev.misses) return;
  store[groupJid][key] = { name: prev.name || '', ts: prev.ts || Date.now(), misses };
  scheduleSave();
}

// Devuelve el mejor registro entre TODAS las formas del usuario (id, lid,
// teléfono), que es lo que unifica a quien quedó anotado bajo dos claves.
// El "mejor" es el que tenga nombre real; si ninguno lo tiene, el de más
// observaciones sin nombre.
// Nombres que NO vienen de un grupo concreto (libreta de contactos que WhatsApp
// sincroniza). Valen para cualquier grupo, asi que viven en su propio cajon.
const GLOBAL = '__global';

// Hechos observados de una cuenta, aparte del nombre:
//
//   biz   → true si WhatsApp adjuntó un verified_name a alguno de sus mensajes.
//           Eso solo lo lleva una cuenta Business, así que es prueba directa
//           (Baileys lo expone como msg.verifiedBizName).
//   photo → 'si' | 'no'. WhatsApp avisa cuando alguien pone o quita su foto
//           (contacts.update con imgUrl 'changed' / 'removed', y null cuando
//           nunca la ha puesto). Sirve para resolver a quien la tiene oculta
//           por privacidad, que es el único caso que la consulta no distingue.
async function recordFacts(userJid, { name, biz, photo } = {}) {
  if (!userJid) return;
  await load();
  const key = bareJid(userJid);
  if (!store[GLOBAL]) store[GLOBAL] = {};
  const prev = store[GLOBAL][key] || { name: '', ts: 0, misses: 0 };
  const next = { ...prev };

  if (typeof name === 'string' && name.trim()) next.name = name.trim();
  if (biz === true) next.biz = true;            // solo se añade, nunca se quita
  if (photo === 'si' || photo === 'no') next.photo = photo;

  if (next.name === prev.name && next.biz === prev.biz && next.photo === prev.photo) return;
  next.ts = Date.now();
  store[GLOBAL][key] = next;
  scheduleSave();
}

// Hechos conocidos de un usuario, mirando todas sus formas.
// Todo lo que se sabe de un usuario, mirando TODAS sus formas (id, lid,
// teléfono) y los dos cajones: el del grupo y el global. Eso es lo que unifica
// a quien quedó anotado bajo dos claves distintas.
//
// Al fusionar, un nombre real gana siempre; entre dos sin nombre, el que más
// veces se vio sin él. Los hechos sueltos (biz, photo) se acumulan porque no
// se contradicen: si en algún sitio consta, consta.
async function getMemberFacts(forms, groupJid) {
  await load();
  const buckets = [groupJid && store[groupJid], store[GLOBAL]].filter(Boolean);
  if (!buckets.length) return null;

  let out = null;
  for (const b of buckets) {
    for (const f of forms) {
      if (!f) continue;
      const rec = b[bareJid(f)];
      if (!rec) continue;
      if (!out) { out = { ...rec }; continue; }
      if (rec.biz) out.biz = true;
      if (rec.photo) out.photo = rec.photo;
      const mejorNombre = rec.name && (!out.name || (rec.ts || 0) > (out.ts || 0));
      const masAusencias = !rec.name && !out.name && (rec.misses || 0) > (out.misses || 0);
      if (mejorNombre || masAusencias) {
        out.name = rec.name || out.name;
        out.misses = Math.max(out.misses || 0, rec.misses || 0);
        out.ts = rec.ts || out.ts;
      }
    }
  }
  return out;
}

async function flushNicks() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (store) {
    try { await atomicWriteJson(FILE, store); }
    catch (e) { logger.error(`nickStore: fallo al flush: ${e.message}`); }
  }
}

// Solo para pruebas: vacía el estado en memoria.
function _resetNickStore() { store = null; loadPromise = null; }

module.exports = { recordNick, recordFacts, getMemberFacts, flushNicks, MIN_MISSES, _resetNickStore };
