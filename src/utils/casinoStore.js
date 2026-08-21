const path = require('path');
const { canonicalJid } = require('./wa');
const { CONTADOR } = require('./economia');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');
const logger = require('./logger');

const CASINO_FILE = path.join(__dirname, '../../data/casino.json');

// The casino/jackpot counter is SEPARATE from the normal message counter
// (messageCounter.js). It tracks messages per user per day so the 200/500/1000
// milestones are a daily race. Evaluated lazily — no setInterval, so it
// survives restarts cleanly.
//
// EL DIA ES DE CALENDARIO, NO UNA VENTANA DESLIZANTE. Antes se guardaba un
// `resetAt` y se comparaba con 24 h: el dia nuevo empezaba con el primer
// mensaje despues de caducar el anterior, asi que el corte se corria solo unas
// horas cada dia hasta caer a cualquier hora. Ahora se guarda LA FECHA a la que
// pertenece lo contado y se reinicia cuando esa fecha cambia (ver CONTADOR en
// economia.js).
//
// Es el mismo mecanismo que la racha, y a proposito: formato sv-SE porque es el
// unico que da YYYY-MM-DD directo, y el corte se aplica RESTANDO las horas
// antes de formatear. Asi el cambio de horario de verano no lo descuadra —
// nunca se hace aritmetica con husos, solo se pregunta la fecha local.
const PARTES = new Intl.DateTimeFormat('en-CA', {
  timeZone: CONTADOR.zona, hour12: false,
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
});
function diaDe(ts) {
  const p = {};
  for (const x of PARTES.formatToParts(new Date(ts))) {
    if (x.type !== 'literal') p[x.type] = Number(x.value);
  }
  const hora = p.hour % 24;   // hour12:false devuelve 24 para medianoche en algunos entornos
  if (hora >= CONTADOR.horaCorte) {
    return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  }
  // Antes del corte todavia cuenta como el dia anterior. EL DIA SE RESTA SOBRE
  // LA FECHA, NO SOBRE LA MARCA DE TIEMPO.
  //
  // La primera version restaba `horaCorte` horas al instante y formateaba: mas
  // corta, y mal. En los dos dias del año en que cambia la hora esa resta cruza
  // el salto y el corte se iba una hora — con horaCorte 0 no se nota porque no
  // resta nada, pero en cuanto se mueva la hora (que es un solo numero en
  // economia.js) el reinicio caeria a las 11 o a la 1 dos veces al año. Lo
  // encontro un mutante que precisamente movia esa hora.
  //
  // Anclando en las 12:00 UTC, restar 24 h nunca puede cambiar de fecha por un
  // salto de horario: sobran doce horas de margen por los dos lados.
  const ayer = new Date(Date.UTC(p.year, p.month - 1, p.day, 12) - 24 * 3600 * 1000);
  return ayer.toISOString().slice(0, 10);
}

// Cuanto falta para el proximo corte. Se busca el instante EXACTO en que diaDe
// cambia, en vez de calcularlo con aritmetica de husos: asi la cuenta atras que
// se enseña en *!aura hoy* y el reinicio de verdad no pueden discrepar nunca,
// que es el fallo clasico de estas dos piezas. 26 h de margen cubren el dia en
// que se cambia la hora.
function msHastaCorte(ts = Date.now()) {
  const hoy = diaDe(ts);
  let lo = ts, hi = ts + 26 * 3600 * 1000;
  if (diaDe(hi) === hoy) return hi - ts;
  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2);
    if (diaDe(mid) === hoy) lo = mid; else hi = mid;
  }
  return hi - ts;
}

// store = { [groupJid]: { resetAt: <ms>, counts: { [bareJid]: number } } }
let store = null;
let loadPromise = null;
let saveTimer = null;

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(CASINO_FILE, {})
      .then((d) => { store = d; })
      .catch((e) => {
        loadPromise = null;
        logger.warn(`casinoStore: lectura falló (${e.message}); no se toca el archivo`);
        throw e;
      });
  }
  await loadPromise;
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try { await atomicWriteJson(CASINO_FILE, store); }
    catch (e) { logger.error(`casinoStore: fallo al guardar: ${e.message}`); }
  }, 5000);
}

// Returns the group's live bucket, rolling the 24h window forward when expired.
// Also migrates the legacy flat format ({ [bareJid]: number }) by starting fresh.
function freshBucket(groupJid) {
  const now = Date.now();
  const hoy = diaDe(now);
  let g = store[groupJid];
  // `typeof g.dia !== 'string'` cubre tambien la migracion desde el formato con
  // `resetAt`: un casino.json de la version anterior entra por aqui y empieza
  // el dia de cero, que es lo correcto — no hay forma de saber a que fecha
  // pertenecia lo que habia contado una ventana deslizante.
  if (!g || typeof g.dia !== 'string' || !g.counts) {
    // `tiradas` va aquí y no solo abajo: esta rama HACE UN RETURN y se saltaba
    // la línea que lo inicializa. La primera llamada de un grupo devolvía un
    // bucket sin `tiradas`, y contarTirada reventaba con un TypeError al leer
    // g.tiradas[key].
    //
    // No se veía porque aura.js envuelve la llamada en un try/catch que da la
    // tirada por cobrada si falla. O sea que no rompía nada a la vista: se
    // comía la primera tirada de cada grupo sin contarla, y esa es justo la
    // cuenta de la que depende TIRADAS_PAGADAS para frenar la inflación.
    g = { dia: hoy, counts: {}, tiradas: {}, hitos: {} };
    store[groupJid] = g;
    return g;
  }
  if (g.dia !== hoy) {
    g.counts = {};
    g.tiradas = {};
    g.hitos = {};
    g.dia = hoy;
  }
  if (!g.tiradas) g.tiradas = {};
  // `hitos` puede faltar en un casino.json escrito por la version anterior. Se
  // crea vacio, que es lo correcto: el dia en curso se trata como si no se
  // hubiera cobrado ningun hito todavia.
  if (!g.hitos) g.hitos = {};
  return g;
}

// ─── Tiradas de !aura del día ────────────────────────────────────────────────
//
// Vuelve a existir un contador de tiradas, pero NO es el de antes. Aquel era un
// presupuesto: al llegar al tope el comando dejaba de funcionar, y eso convertía
// !aura en mirar un contador en vez de jugar, así que se quitó.
//
// Este no prohíbe nada. Solo dice cuántas van hoy, para que las primeras paguen
// de verdad y el resto sean cara o cruz a valor esperado cero. Se puede tirar
// todo el día; lo que se acaba es el sueldo, no el juego.
//
// Comparte la ventana de 24 h con el contador de mensajes, así que se reinicia
// solo y sin ningún temporizador.
async function contarTirada(groupJid, userJid) {
  await load();
  const key = canonicalJid(userJid);
  const g = freshBucket(groupJid);
  const n = (g.tiradas[key] || 0) + 1;
  g.tiradas[key] = n;
  scheduleSave();
  return n;
}

// Cuántas lleva hoy, sin sumar ninguna (para poder enseñarlo en !aura hoy).
async function tiradasDeHoy(groupJid, userJid) {
  await load();
  const g = store[groupJid];
  if (!g || typeof g.dia !== 'string' || !g.tiradas) return 0;
  if (g.dia !== diaDe(Date.now())) return 0;
  return g.tiradas[canonicalJid(userJid)] || 0;
}

// ─── Hitos ya cobrados hoy ───────────────────────────────────────────────────
//
// EXISTE PORQUE EL BONO SE DABA POR RESTO Y NO POR UMBRAL.
//
// Antes el tramo 1 saltaba con `count % 200 === 0`, o sea a los 200, 400, 600,
// 800... Quien escribe mucho veia CINCO veces al dia el mismo aviso —y siempre
// con la cabecera "200 MENSAJES", que era lo que lo hacia parecer un bucle— y
// los cuatro ultimos pagaban 8-14, calderilla al lado del primero.
//
// Ahora los hitos son umbrales que se cobran UNA vez por ventana de 24 h. Para
// eso hay que recordar cuales van cobrados, y ese recuerdo tiene que caducar
// exactamente igual que el contador: vive en el mismo bucket, asi que se
// reinicia solo con la ventana y sin ningun temporizador.
//
// Se guarda la lista de cobrados y no un simple "el ultimo": si el contador da
// un salto (colapsar junta dos formas de la misma persona de golpe), con un
// "ultimo" se perderia el hito saltado para siempre; con la lista, el siguiente
// mensaje lo cobra igual.
async function hitosCobrados(groupJid, userJid) {
  await load();
  const g = store[groupJid];
  if (!g || typeof g.dia !== 'string' || !g.hitos) return [];
  if (g.dia !== diaDe(Date.now())) return [];
  return g.hitos[canonicalJid(userJid)] || [];
}

async function apuntarHito(groupJid, userJid, hito) {
  await load();
  const key = canonicalJid(userJid);
  const g = freshBucket(groupJid);
  const ya = g.hitos[key] || [];
  if (ya.includes(hito)) return false;   // ya estaba: no se paga dos veces
  g.hitos[key] = [...ya, hito];
  scheduleSave();
  return true;
}

// Junta lo que la misma persona tenga anotado bajo varias formas y lo deja en
// una sola clave canónica. Sin esto, quien llega unas veces por @lid y otras
// por teléfono partía su cuenta diaria en dos montones: los hitos de 200/500/
// 1000 se retrasaban (o, peor, se cobraban dos veces, uno por cada montón).
//
// Es el mismo criterio que messageCounter y auraStore: la clave es canonicalJid.
function colapsar(counts, key) {
  let total = counts[key] || 0;
  for (const k in counts) {
    if (k === key || canonicalJid(k) !== key) continue;
    total += counts[k];
    delete counts[k];
  }
  return total;
}

async function incrementCasinoCount(groupJid, userJid) {
  await load();
  const key = canonicalJid(userJid);
  const g = freshBucket(groupJid);
  const next = colapsar(g.counts, key) + 1;
  g.counts[key] = next;
  // LOS HITOS SE COLAPSAN CON LOS CONTADORES, no despues ni por separado.
  //
  // Si una persona llega unas veces por @lid y otras por telefono, sus dos
  // montones se funden aqui — y si el recuerdo de lo cobrado se quedara en el
  // monton que se borra, el bono del dia se volveria a pagar entero bajo la
  // clave nueva. Se juntan los dos lados y gana la union.
  {
    const union = new Set(g.hitos[key] || []);
    for (const k in g.hitos) {
      if (k === key || canonicalJid(k) !== key) continue;
      for (const h of g.hitos[k]) union.add(h);
      delete g.hitos[k];
    }
    if (union.size) g.hitos[key] = [...union].sort((a, b) => a - b);
  }
  scheduleSave();
  return next;
}

// Read-only count for the current window (0 if expired or unknown).
// No colapsa (no escribe), pero sí suma todas las formas conocidas: si no, el
// "llevas N mensajes hoy" de !aura hoy no cuadraría con el hito que acaba de
// saltar.
async function getCasinoCount(groupJid, userJid) {
  await load();
  const g = store[groupJid];
  if (!g || typeof g.dia !== 'string' || !g.counts) return 0;
  if (g.dia !== diaDe(Date.now())) return 0;
  const key = canonicalJid(userJid);
  let total = 0;
  for (const k in g.counts) {
    if (canonicalJid(k) === key) total += g.counts[k];
  }
  return total;
}

// Milliseconds until current window resets (0 if expired / unknown).
// Ya no depende del grupo: el corte es el mismo para todos y a hora fija. Se
// deja el parametro para no tocar a quien llama.
async function msUntilReset(_groupJid) {
  return msHastaCorte();
}

async function flushCasino() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (store) {
    try { await atomicWriteJson(CASINO_FILE, store); }
    catch (e) { logger.error(`casinoStore: fallo al flush: ${e.message}`); }
  }
}

module.exports = { incrementCasinoCount, getCasinoCount, contarTirada, tiradasDeHoy,
  hitosCobrados, apuntarHito, msUntilReset, flushCasino, diaDe, msHastaCorte };
