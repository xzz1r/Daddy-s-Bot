// Estado persistente de las dinámicas del robo: el bote del grupo, los objetos
// que ha comprado cada uno y el registro de golpes para. el ranking.
//
// Va aparte de auraStore a propósito. El aura es dinero y se mueve en
// operaciones serializadas; esto es utillaje del juego y puede escribirse con
// el patrón normal de guardado diferido. Mezclarlos obligaría a pasar cada
// compra por la cola de escrituras del aura sin ninguna necesidad.
//
// Forma del fichero:
//   { [grupo]: {
//       bote: <numero>,
//       objetos: { [personaCanonica]: { escudo: <ts fin>, ganzua: <usos>, cebo: <ts fin> } },
//       golpes:  [ { quien, cuanto, ts } ]      // solo los de la última semana
//   } }

const path = require('path');
const { canonicalJid } = require('./wa');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');
const logger = require('./logger');

const ROBO_FILE = path.join(__dirname, '../../data/robo.json');

// Ventana del ranking. Una semana es lo que hace que el título se pueda perder:
// con un ranking histórico el primero lo sería para siempre y el resto dejaría
// de intentarlo a los dos días.
const VENTANA_RANKING_MS = 7 * 86400000;

// Tope de golpes guardados por grupo. Se podan por antigüedad, pero un grupo
// muy activo podría meter miles en una semana y esto es un fichero, no una
// base de datos.
const MAX_GOLPES = 400;

let store = null;
let loadPromise = null;
let saveTimer = null;

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(ROBO_FILE, {})
      .then((d) => { store = d && typeof d === 'object' ? d : {}; })
      .catch((e) => { logger.error(`roboStore: no pude leer: ${e.message}`); store = {}; });
  }
  await loadPromise;
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try { await atomicWriteJson(ROBO_FILE, store); }
    catch (e) { logger.error(`roboStore: fallo al guardar: ${e.message}`); }
  }, 3000);
}

async function flushRobo() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (store) {
    try { await atomicWriteJson(ROBO_FILE, store); }
    catch (e) { logger.error(`roboStore: fallo al flush: ${e.message}`); }
  }
}

function grupo(g) {
  if (!store[g]) store[g] = { bote: 0, objetos: {}, golpes: [] };
  const x = store[g];
  if (typeof x.bote !== 'number') x.bote = 0;
  if (!x.objetos) x.objetos = {};
  if (!Array.isArray(x.golpes)) x.golpes = [];
  return x;
}

// ─── El bote ─────────────────────────────────────────────────────────────────
//
// Se alimenta de los robos que salen mal: parte de lo que pierde el ladrón no
// se evapora, va al bote. Eso convierte cada fracaso ajeno en algo que el grupo
// entero mira, y es lo que hace que la gente siga escribiendo cifras.

async function verBote(g) {
  await load();
  return grupo(g).bote;
}

async function aportarAlBote(g, cuanto) {
  if (!(cuanto > 0)) return 0;
  await load();
  const x = grupo(g);
  x.bote += Math.round(cuanto);
  scheduleSave();
  return x.bote;
}

async function vaciarBote(g) {
  await load();
  const x = grupo(g);
  const habia = x.bote;
  x.bote = 0;
  scheduleSave();
  return habia;
}

// ─── Objetos ─────────────────────────────────────────────────────────────────
//
// Escudo y cebo caducan por tiempo; la ganzúa se gasta por usos. Los tres se
// guardan por persona canónica, así que comprar desde el @lid y usarlo desde el
// teléfono es la misma cuenta.

async function objetosDe(g, persona) {
  await load();
  const x = grupo(g);
  const k = canonicalJid(persona);
  return x.objetos[k] || {};
}

async function darObjeto(g, persona, objeto, valor) {
  await load();
  const x = grupo(g);
  const k = canonicalJid(persona);
  if (!x.objetos[k]) x.objetos[k] = {};
  x.objetos[k][objeto] = valor;
  scheduleSave();
}

async function gastarGanzua(g, persona) {
  await load();
  const x = grupo(g);
  const k = canonicalJid(persona);
  const o = x.objetos[k];
  if (!o || !(o.ganzua > 0)) return false;
  o.ganzua -= 1;
  if (o.ganzua <= 0) delete o.ganzua;
  scheduleSave();
  return true;
}

// ¿Tiene escudo AHORA? De paso limpia el que ya caducó, para que el fichero no
// acumule marcas de hace semanas.
async function tieneEscudo(g, persona) {
  const o = await objetosDe(g, persona);
  if (!o.escudo) return false;
  if (o.escudo > Date.now()) return true;
  await darObjeto(g, persona, 'escudo', undefined);
  return false;
}

async function tieneCebo(g, persona) {
  const o = await objetosDe(g, persona);
  return Boolean(o.cebo && o.cebo > Date.now());
}

// ─── Golpes y ranking ────────────────────────────────────────────────────────

async function anotarGolpe(g, quien, cuanto) {
  await load();
  const x = grupo(g);
  x.golpes.push({ quien: canonicalJid(quien), cuanto: Math.round(cuanto), ts: Date.now() });
  podar(x);
  scheduleSave();
}

function podar(x) {
  const corte = Date.now() - VENTANA_RANKING_MS;
  x.golpes = x.golpes.filter(gp => gp && gp.ts > corte);
  if (x.golpes.length > MAX_GOLPES) x.golpes = x.golpes.slice(-MAX_GOLPES);
}

// Ranking de la semana: quién ha robado más aura, no quién ha robado más veces.
// Contar intentos premiaría al que hace veinte robos de cinco; contar botín
// premia al que se arriesga, que es lo que interesa que pase.
async function rankingLadrones(g) {
  await load();
  const x = grupo(g);
  podar(x);
  const por = new Map();
  for (const gp of x.golpes) {
    const p = por.get(gp.quien) || { jid: gp.quien, total: 0, golpes: 0 };
    p.total += gp.cuanto;
    p.golpes++;
    por.set(gp.quien, p);
  }
  return [...por.values()].sort((a, b) => b.total - a.total);
}

// El número uno de la semana. Devuelve null si no hay ninguno todavía: sin esto
// el "más buscado" saldría siendo cualquiera con un robo de cinco de aura.
async function masBuscado(g) {
  const r = await rankingLadrones(g);
  return r.length && r[0].total > 0 ? r[0] : null;
}

module.exports = {
  verBote, aportarAlBote, vaciarBote,
  objetosDe, darObjeto, gastarGanzua, tieneEscudo, tieneCebo,
  anotarGolpe, rankingLadrones, masBuscado,
  flushRobo,
  VENTANA_RANKING_MS,
};
