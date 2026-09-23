'use strict';

// LA MEMORIA DE RENCOR: lo que paso entre dos personas del grupo.
//
// Hasta ahora cada !mog, !duel, !robo o !ship se olvidaba en cuanto salia el
// mensaje. Aqui se apunta quien le gano a quien, cuanto y cuando, para que la
// proxima vez que esas dos personas se crucen el bot lo saque
// (src/utils/rencor.js).
//
// ES SOLO MEMORIA. No toca aura, ni probabilidades, ni moderacion: nada de lo
// que se apunta aqui cambia como sale un robo o un duelo. Un recuerdo que
// moviera las tiradas seria una palanca para amañarlas, y uno que moviera
// aura seria un conteo mas que cuadrar.
//
// store = { [grupo]: { [pareja]: { [juego]: [ { ts, g, p, n, ok } ] } } }
//   pareja  los dos JID canonicos, ordenados y unidos por '|'
//   juego   'mog' | 'duelo' | 'robo' | 'ship'
//   g, p    quien gano y quien perdio. En el robo, quien robo y a quien, le
//           saliera o no. En el ship, la pareja tal cual.
//   n       la cifra si la hay: lo apostado, lo robado, el % del ship
//   ok      solo en el robo: si salio

const path = require('path');
const { canonicalJid } = require('./wa');
const { readJsonOrEnoent, createDebouncedSaver } = require('./helpers');
const logger = require('./logger');

const FILE = path.join(__dirname, '../../data/rencor.json');

// Lo que se recuerda. Dos meses dan para que «el martes» y «la semana pasada»
// salgan casi siempre, y para que un rencor viejo de verdad aun asome.
const DIAS = 60;
// Por pareja y juego. Las rachas miran hacia atras hasta que se cortan, y
// diez cruces seguidos entre las mismas dos personas ya es mucha racha.
const POR_JUEGO = 10;
// Parejas por grupo. En un grupo de 250 caben 31.000; guardarlas todas no
// hace falta, y con esto el fichero no pasa de unos cientos de KB.
const PAREJAS = 3000;

let store = null;
let loadPromise = null;
let fichero = FILE;
// Mas holgado que el aura o los contadores: aqui no hay dinero ni conteos, y
// perder el ultimo recuerdo en un corte a lo bruto solo hace que el bot no lo
// cite la proxima vez.
const nuevoSaver = () => createDebouncedSaver(
  () => store,
  fichero,
  15000,
  (e) => logger.error(`rencorStore: fallo al guardar: ${e.message}`),
);
let saver = nuevoSaver();

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(fichero, {})
      .then((d) => { store = d && typeof d === 'object' ? d : {}; })
      .catch((e) => {
        loadPromise = null;
        logger.warn(`rencorStore: lectura falló (${e.message}); no se toca el archivo`);
        throw e;
      });
  }
  await loadPromise;
}

const claveDe = (a, b) => [canonicalJid(a), canonicalJid(b)].sort().join('|');

// Junta los cruces que se apuntaron con otra forma de las mismas dos personas.
//
// Un @lid se vuelve telefono en cuanto WhatsApp manda el par, y desde ahi la
// clave de la pareja es otra. Sin esto la historia se parte en dos y una racha
// de cuatro se cuenta como dos y dos: un «van dos seguidas» donde van cuatro,
// que es un conteo mal hecho.
function juntaPareja(g, a, b) {
  const k = claveDe(a, b);
  for (const otra of Object.keys(g)) {
    if (otra === k || !otra.includes('@lid')) continue;
    const [x, y] = otra.split('|');
    if (claveDe(x, y) !== k) continue;
    const destino = g[k] || (g[k] = {});
    for (const [juego, lista] of Object.entries(g[otra] || {})) {
      destino[juego] = [...(destino[juego] || []), ...(Array.isArray(lista) ? lista : [])]
        .sort((u, v) => u.ts - v.ts)
        .slice(-POR_JUEGO);
    }
    delete g[otra];
    saver.schedule();
  }
  return k;
}

// Apunta un cruce. Se llama DESPUES de haber mirado la historia: si no, el
// cruce de hoy se veria a si mismo.
async function apuntar(grupo, juego, { g, p, n = null, ok = null }) {
  await load();
  const grp = store[grupo] || (store[grupo] = {});
  const k = juntaPareja(grp, g, p);
  const par = grp[k] || (grp[k] = {});
  const corte = Date.now() - DIAS * 86400000;
  const e = { ts: Date.now(), g: canonicalJid(g), p: canonicalJid(p) };
  if (n !== null && n !== undefined) e.n = n;
  if (ok !== null && ok !== undefined) e.ok = !!ok;
  par[juego] = [...(par[juego] || []).filter((x) => x && x.ts > corte), e].slice(-POR_JUEGO);

  // Tope de parejas: fuera la que lleva mas tiempo sin cruzarse.
  const claves = Object.keys(grp);
  if (claves.length > PAREJAS) {
    const ultimo = (c) => Math.max(0, ...Object.values(grp[c] || {}).flat().map((x) => x.ts || 0));
    let peor = null, peorTs = Infinity;
    for (const c of claves) { const t = ultimo(c); if (t < peorTs) { peorTs = t; peor = c; } }
    if (peor) delete grp[peor];
  }
  saver.schedule();
}

// Los cruces de esa pareja en ese juego, del mas nuevo al mas viejo, sin los
// que ya caducaron.
async function historia(grupo, a, b, juego) {
  await load();
  const grp = store[grupo];
  if (!grp) return [];
  const k = juntaPareja(grp, a, b);
  const corte = Date.now() - DIAS * 86400000;
  return (grp[k]?.[juego] || []).filter((x) => x && x.ts > corte).sort((u, v) => v.ts - u.ts);
}

async function flushRencor() {
  await saver.flush();
}

// Solo para las pruebas: memoria vacia y en OTRO fichero. En la VPS el check
// corre con el bot encendido, y dos procesos escribiendo el mismo data/rencor.json
// se pisan: el del check no puede tocar el de verdad ni un segundo.
function _usarFichero(f) {
  fichero = f;
  saver = nuevoSaver();
  store = {};
  loadPromise = Promise.resolve();
}

module.exports = { apuntar, historia, flushRencor, DIAS, POR_JUEGO, _usarFichero, _file: FILE };
