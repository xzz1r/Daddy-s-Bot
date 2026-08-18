const path = require('path');
const { canonicalJid } = require('./wa');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');
const logger = require('./logger');

const AURA_FILE = path.join(__dirname, '../../data/aura.json');

// Everyone starts here. Aura then accumulates (or bleeds) over time.
//
// ESCALA: la referencia es utils/economia.js, y NO se repite aquí ninguna de
// sus cifras. Este comentario decía "un millonario ronda los 5.000, el arranque
// son 100, o sea un 2 %" y las tres cifras se quedaron viejas a la vez en
// cuanto se reequilibró la economía. Un comentario con números de otro fichero
// es una copia que nadie actualiza.
const { ARRANQUE: STARTING_AURA, SUELO_TODOS } = require('./economia');

// Escalas anteriores, necesarias para reescalar lo que ya está guardado.
// Cada entrada es el salto DESDE esa versión a la siguiente.
//   v1 -> v2: arranque 1000 y bonos de 20k-150k. Bastaban unos días activos
//             para llegar a siete dígitos, donde ganar o perder daba igual.
//   v2 -> v3: el millonario baja a la mitad y los bonos se recortan a una
//             vigésima parte, para que las dinámicas (!robo, !aura) dejen de
//             estar eclipsadas por el bono diario de escribir.
//
// `arranque` es el arranque de la escala DE ORIGEN. El de destino se saca de la
// escala siguiente (ver migrarEscala), no de STARTING_AURA: el reequilibrio
// subió el arranque de 100 a 250 y eso desalineó la cadena, porque hasta
// entonces ESCALAS[2].arranque y STARTING_AURA valían lo mismo por casualidad.
//
// Subir la escala actual (redenominar) NO es lo mismo que cambiar cuánto se
// gana. El reequilibrio de los ingresos no añadió una escala 4 a propósito: los
// saldos guardados siguen valiendo lo que valían, lo único que cambió es el
// ritmo al que entran. Solo hace falta una escala nueva cuando los importes se
// dividen o multiplican y hay que arrastrar lo ya guardado con ellos.
const ESCALAS = {
  1: { arranque: 1000, factor: 200 },
  2: { arranque: 100,  factor: 2 },
};
// Marca de migración. Vive dentro del propio store para que no haga falta un
// archivo aparte ni un paso manual en la VPS.
const CLAVE_ESCALA = '__escala';
const ESCALA_ACTUAL = 3;

let store = null;          // { [groupJid]: { [bareJid]: number } }
let loadPromise = null;
let saveTimer = null;

// Per-(group,user) write queue: serializes concurrent addAura / transferAura
// calls so two simultaneous !dar / casino / !aura commands don't clobber each
// other. Node.js is single-threaded but async — two callers can both read
// `previous` before either has written back, causing deltas to be lost.
const writeQueue = new Map();

function serialized(key, fn) {
  const prev = writeQueue.get(key) ?? Promise.resolve();
  const next = prev.then(fn);
  // Don't let a failed fn poison the queue for future writes on this key.
  const tracked = next.catch(() => {});
  writeQueue.set(key, tracked);
  // Prune the key once this settles, UNLESS something newer was already chained
  // behind it. Without this, the map keeps one entry per (group,user) forever —
  // a slow but real memory leak across cumulative unique participants on a 24/7
  // process. The read-modify-write inside fn is synchronous, so removing a
  // settled tail can't drop a pending update.
  tracked.finally(() => {
    if (writeQueue.get(key) === tracked) writeQueue.delete(key);
  });
  return next;
}

// Reescala los saldos guardados hasta la escala actual, UNA sola vez y
// encadenando todos los saltos que falten.
//
// No es una división a secas: se conserva la distancia al arranque, así que
// quien nunca jugó (estaba justo en el arranque viejo) queda justo en el nuevo
// en vez de aparecer con un saldo raro. El orden del ranking no cambia.
//
//   nuevo = ARRANQUE_DE_DESTINO + (viejo - ARRANQUE_DE_ORIGEN) / FACTOR
//
// Un saldo de la escala 1 pasa por los dos saltos seguidos, así que una cuenta
// que nunca se migró llega igual de bien que una que ya iba por la 2.
//
// OJO CON EL DESTINO DE CADA SALTO. Aquí ponía STARTING_AURA en los dos, y
// funcionaba solo porque el arranque de la escala 2 y el actual valían los dos
// 100. Al subir el arranque a 250 la cadena empezó a mentir: el primer salto
// dejaba el saldo centrado en 250 y el segundo le restaba 100, así que quien
// nunca jugó (1.000 en la escala 1, o sea el arranque exacto) acababa en 325 en
// vez de en 250 — 75 de aura de la nada, y a todo el mundo por igual.
//
// Solo afecta a un store que siga en la escala 1 (el que ya está en la 3 sale
// por el return de arriba sin tocar nada), pero es una mina: basta con que
// alguien restaure una copia vieja para que reparta ese regalo.
function migrarEscala() {
  if (!store) return;
  const desde = store[CLAVE_ESCALA] || 1;
  if (desde >= ESCALA_ACTUAL) return;

  let tocados = 0;
  for (const grupo in store) {
    if (grupo === CLAVE_ESCALA) continue;
    const g = store[grupo];
    if (!g || typeof g !== 'object') continue;
    for (const k in g) {
      if (typeof g[k] !== 'number') continue;
      let v = g[k];
      for (let paso = desde; paso < ESCALA_ACTUAL; paso++) {
        const esc = ESCALAS[paso];
        if (!esc) continue;
        // El destino de este salto es el arranque de la escala a la que llega:
        // el de la siguiente entrada, o el actual si ya es el último salto.
        const destino = ESCALAS[paso + 1] ? ESCALAS[paso + 1].arranque : STARTING_AURA;
        v = destino + Math.round((v - esc.arranque) / esc.factor);
      }
      g[k] = v;
      tocados++;
    }
  }
  store[CLAVE_ESCALA] = ESCALA_ACTUAL;
  if (tocados) logger.info(`auraStore: ${tocados} saldos reescalados (escala ${desde} -> ${ESCALA_ACTUAL}).`);
  scheduleSave();
}

// Sube de una vez a todo el que esté por debajo del suelo.
//
// EXISTE PORQUE SUBIR EL ARRANQUE NO BASTA. El arranque solo se aplica a quien
// no tiene saldo guardado, así que subirlo habría dejado exactamente igual a la
// gente que ya estaba en rojo — que era el problema que se venía a resolver.
//
// Es un SUELO, no un reparto: a quien ya está por encima no se le toca ni un
// punto, así que el ranking no se altera salvo en la cola, donde todos los que
// estaban por debajo quedan empatados en el suelo.
//
// La marca es propia y va por número, no por booleano: si algún día se vuelve a
// subir el suelo, basta con incrementar SUELO_VERSION para que la operación se
// repita una vez más y solo una.
const CLAVE_SUELO = '__suelo';
const SUELO_VERSION = 1;

function aplicarSuelo() {
  if (!store) return;
  if ((store[CLAVE_SUELO] || 0) >= SUELO_VERSION) return;

  let subidos = 0;
  for (const grupo in store) {
    if (grupo === CLAVE_ESCALA || grupo === CLAVE_SUELO) continue;
    const g = store[grupo];
    if (!g || typeof g !== 'object') continue;
    for (const k in g) {
      if (typeof g[k] !== 'number') continue;
      if (g[k] < SUELO_TODOS) { g[k] = SUELO_TODOS; subidos++; }
    }
  }
  store[CLAVE_SUELO] = SUELO_VERSION;
  if (subidos) logger.info(`auraStore: ${subidos} saldos subidos al suelo de ${SUELO_TODOS}.`);
  scheduleSave();
}

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(AURA_FILE, {})
      .then((d) => { store = d; migrarEscala(); aplicarSuelo(); })
      .catch((e) => {
        loadPromise = null;
        logger.warn(`auraStore: lectura falló (${e.message}); no se toca el archivo`);
        throw e;
      });
  }
  await loadPromise;
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try { await atomicWriteJson(AURA_FILE, store); }
    catch (e) { logger.error(`auraStore: fallo al guardar: ${e.message}`); }
  }, 5000);
}

// Junta en una sola clave las entradas que son de la MISMA persona.
//
// Las escrituras usan canonicalJid, pero esa forma depende de si ya se conocía
// la correspondencia LID<->teléfono en ese momento. Quien acumuló aura bajo su
// @lid antes de que WhatsApp mandara el par acaba con dos saldos: el viejo se
// vuelve invisible (aura perdida) y en el ranking sale dos veces.
//
// El saldo unido NO es la suma a secas: cada entrada partida arrancó por su
// cuenta en STARTING_AURA, así que hay que descontar ese arranque de más una
// vez por cada entrada sobrante. Con dos entradas de 1000 (el arranque) el
// resultado es 1000, no 2000.
//
// Devuelve la clave canónica, ya con todo dentro y las sobrantes borradas.
function foldPerson(g, userJid) {
  const key = canonicalJid(userJid);
  let total = g[key];
  let extras = 0;
  for (const k in g) {
    if (k === key || canonicalJid(k) !== key) continue;
    total = (total === undefined ? 0 : total) + g[k];
    delete g[k];
    extras++;
  }
  if (extras) {
    // Si la clave canónica no existía, una de las sobrantes hace de base y solo
    // los extras restantes traen arranque duplicado.
    const duplicados = g[key] === undefined ? extras - 1 : extras;
    g[key] = total - STARTING_AURA * duplicados;
    scheduleSave();
  }
  return key;
}

async function getAura(groupJid, userJid) {
  await load();
  const g = store[groupJid];
  if (!g) return STARTING_AURA;
  const key = foldPerson(g, userJid);
  return g[key] === undefined ? STARTING_AURA : g[key];
}

async function addAura(groupJid, userJid, delta) {
  await load();
  const qKey = `${groupJid}|${canonicalJid(userJid)}`;
  return serialized(qKey, () => {
    if (!store[groupJid]) store[groupJid] = {};
    const key = foldPerson(store[groupJid], userJid);
    const previous = store[groupJid][key] === undefined ? STARTING_AURA : store[groupJid][key];
    const current = previous + delta;
    store[groupJid][key] = current;
    scheduleSave();
    return { previous, current };
  });
}

// Atomic check-and-transfer — the only correct way to move aura between users.
// Returns { ok: true, fromNew, toNew } or { ok: false, fromCurrent } when the
// sender has insufficient funds. Both the debit check and both writes happen
// inside the same serialized block, so no concurrent command can read a stale
// balance in the window between check and commit.
//
// `credita` permite abonar MENOS de lo que se cobra, que es lo que hace falta
// para el impuesto de !dar. Por defecto es igual al cargo, o sea suma cero
// exacta como toda la vida: ningun otro sitio que la use cambia de
// comportamiento por esto. La diferencia (amount - credita) NO se queda en el
// fichero: sale de la cuenta de uno, no entra en la del otro y es quien llama
// el que decide que hacer con ella. Se devuelve como `retenido` para que no se
// pueda perder por descuido.
async function transferAura(groupJid, fromJid, toJid, amount, credita = amount) {
  await load();
  const fromKey = canonicalJid(fromJid);
  const toKey   = canonicalJid(toJid);
  // Serialize on the sender's key — the critical section is the debit check.
  const qKey = `${groupJid}|${fromKey}`;
  return serialized(qKey, () => {
    if (!store[groupJid]) store[groupJid] = {};
    const g = store[groupJid];
    foldPerson(g, fromJid);
    foldPerson(g, toJid);
    const fromCurrent = g[fromKey] === undefined ? STARTING_AURA : g[fromKey];
    // Se comprueba contra lo que se COBRA, no contra lo que se abona: si no,
    // alguien con 100 justos podria mandar 100 y quedarse debiendo el impuesto.
    if (fromCurrent < amount) return { ok: false, fromCurrent };
    const abono = Math.max(0, Math.min(credita, amount));
    g[fromKey] = fromCurrent - amount;
    g[toKey]   = (g[toKey] === undefined ? STARTING_AURA : g[toKey]) + abono;
    scheduleSave();
    return { ok: true, fromNew: g[fromKey], toNew: g[toKey], retenido: amount - abono };
  });
}

// Cobro atomico: comprueba el saldo y descuenta DENTRO del mismo bloque
// serializado, igual que transferAura.
//
// Hacerlo con getAura() y luego addAura() era una carrera real: dos comandos
// simultaneos del mismo usuario leian los dos el mismo saldo antes de que
// ninguno hubiera escrito, los dos pasaban la comprobacion y los dos
// descontaban. Con el saldo justo, dos !play a la vez dejaban al usuario en
// negativo, que es justo lo que SALDO_MINIMO existe para impedir.
//
// Devuelve { ok: true, cobrado, current } o { ok: false, saldo } si no llega.
async function spendAura(groupJid, userJid, amount, minimo = 0) {
  await load();
  const qKey = `${groupJid}|${canonicalJid(userJid)}`;
  return serialized(qKey, () => {
    if (!store[groupJid]) store[groupJid] = {};
    const key = foldPerson(store[groupJid], userJid);
    const saldo = store[groupJid][key] === undefined ? STARTING_AURA : store[groupJid][key];
    if (saldo - amount < minimo) return { ok: false, saldo };
    store[groupJid][key] = saldo - amount;
    scheduleSave();
    return { ok: true, cobrado: amount, current: store[groupJid][key] };
  });
}

async function getAuraRanking(groupJid) {
  await load();
  const g = store[groupJid];
  if (!g) return [];
  // Une las formas de cada persona antes de ordenar: si no, el mismo miembro
  // sale dos veces y la fila del @lid pinta un número interno que WhatsApp no
  // resuelve como mención.
  const por = new Map(); // clave canónica -> { jid, aura, extras }
  for (const k in g) {
    const id = canonicalJid(k);
    const prev = por.get(id);
    if (!prev) { por.set(id, { jid: k, aura: g[k], extras: 0 }); continue; }
    prev.aura += g[k];
    prev.extras++;
    if (!k.endsWith('@lid')) prev.jid = k; // el teléfono es el que se puede mencionar
  }
  return [...por.values()]
    .map(({ jid, aura, extras }) => ({ jid, aura: aura - STARTING_AURA * extras }))
    // Fuera los que estan a cero o en rojo. Un top es de los que van ganando;
    // rellenarlo con gente a 0 solo alarga la lista y no dice nada de nadie.
    .filter((r) => r.aura > 0)
    .sort((a, b) => b.aura - a.aura);
}

// Deja a todo el grupo en CERO.
//
// Antes borraba el grupo entero, y borrar no es lo mismo que poner a cero: sin
// registro, getAura devuelve el arranque, así que el marcador quedaba en el
// arranque para todos. Se veía como que el reset "no se había aplicado".
//
// Se escribe un 0 por persona, no por clave: quien tenga dos formas (@lid y
// teléfono) se consolida en una sola. Si se dejaran las dos a cero, el ranking
// —que descuenta un arranque por cada forma extra al fusionarlas— sacaría a esa
// persona en negativo mientras el resto está en 0.
//
// Quien nunca ha tocado el bot no tiene registro y seguirá empezando en el
// arranque la primera vez. Eso no es el reset fallando: es alguien que entra
// nuevo, y el arranque existe para que pueda usar el bot desde el primer día.
// Ojo con la asimetría, que el reequilibrio la hizo más grande: tras un reset
// el grupo entero está en 0 y el que llegue mañana entra con el arranque
// completo. Es asumible mientras el arranque sea poco más que un par de
// compras; si algún día sube mucho más, habrá que dar el arranque también a
// los reseteados o el reset premiará a los recién llegados.
async function resetAura(groupJid) {
  await load();
  const g = store[groupJid];
  if (!g) return;
  // AL SUELO, NO A CERO. Dejarlo en cero contradice el suelo de SUELO_TODOS:
  // con SALDO_MINIMO en 0 no se puede gastar estando a cero, asi que un
  // !resetaura dejaba al grupo entero sin poder tocar el bot hasta que cada uno
  // volviera a tirar. Reiniciar es empezar de nuevo, no castigar a todos.
  const alSuelo = {};
  for (const k in g) alSuelo[canonicalJid(k)] = SUELO_TODOS;
  store[groupJid] = alSuelo;
  scheduleSave();
}

async function flushAura() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (store) {
    try { await atomicWriteJson(AURA_FILE, store); }
    catch (e) { logger.error(`auraStore: fallo al flush: ${e.message}`); }
  }
}

module.exports = { getAura, addAura, spendAura, transferAura, getAuraRanking, resetAura, flushAura, STARTING_AURA };
