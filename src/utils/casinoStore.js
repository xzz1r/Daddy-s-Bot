const path = require('path');
const { juntarPersona, clavesDe, sumaPersona, sumar } = require('./persona');
const { DIA } = require('./economia');
const { readJsonOrEnoent, claveDia, msHastaCorte: msHastaCorteDia, createDebouncedSaver } = require('./helpers');
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
// El dia, con el ayudante compartido: la unica copia del calculo vive en
// helpers.js. Aqui hubo una propia, y estaba mal en los dias del cambio de hora.
function diaDe(ts) {
  return claveDia(ts, DIA.zona, DIA.horaCorte);
}
function msHastaCorte(ts = Date.now()) {
  return msHastaCorteDia(ts, DIA.zona, DIA.horaCorte);
}

// store = { [groupJid]: { resetAt: <ms>, counts: { [bareJid]: number } } }
let store = null;
let loadPromise = null;
const saver = createDebouncedSaver(
  () => store,
  CASINO_FILE,
  // 12 s, la misma ventana que messageCounter.
  //
  // Estaba en 15 s. Y el razonamiento que bajo messageCounter a 12 —«si el
  // kernel mata el proceso a lo bruto se van los conteos aun sin escribir, y
  // aqui la regla es que en los conteos no puede haber errores»— vale IGUAL
  // aqui: esto es otro contador de mensajes, y ademas de el cuelga aura.
  //
  // Medido a 5 mensajes por segundo: con 15 s de ventana quedan 75
  // mensajes sin escribir, con 12 s quedan 60. Y el coste de la escritura de
  // mas es 0,44 ms, tambien medido: en un grupo activo esto añade del orden de
  // una escritura por minuto.
  12000,
  (e) => logger.error(`casinoStore: fallo al guardar: ${e.message}`),
);

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

function scheduleSave() { saver.schedule(); }

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
  const g = freshBucket(groupJid);
  // Misma persona, mismas tiradas: si no se juntan, un @lid y un teléfono
  // dan hasta el doble de tiradas de pago al día.
  const { clave } = juntarPersona(g.tiradas, userJid, sumar);
  const n = (Number(g.tiradas[clave]) || 0) + 1;
  g.tiradas[clave] = n;
  scheduleSave();
  return n;
}

// Cuántas lleva hoy, sin sumar ninguna (para poder enseñarlo en !aura hoy).
async function tiradasDeHoy(groupJid, userJid) {
  await load();
  const g = store[groupJid];
  if (!g || typeof g.dia !== 'string' || !g.tiradas) return 0;
  if (g.dia !== diaDe(Date.now())) return 0;
  return sumaPersona(g.tiradas, userJid);
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
// un salto (al juntar dos formas de la misma persona de golpe), con un
// "ultimo" se perderia el hito saltado para siempre; con la lista, el siguiente
// mensaje lo cobra igual.
//
// Los hitos de dos formas de la misma persona se juntan por UNION: lo cobrado
// con el @lid esta cobrado tambien con el telefono.
const unirHitos = (listas) => [...new Set(listas.flat())].sort((a, b) => a - b);
const esLista = (v) => Array.isArray(v);

// Solo lectura: lo cobrado con cualquiera de sus formas.
async function hitosCobrados(groupJid, userJid) {
  await load();
  const g = store[groupJid];
  if (!g || typeof g.dia !== 'string' || !g.hitos) return [];
  if (g.dia !== diaDe(Date.now())) return [];
  const { claves } = clavesDe(g.hitos, userJid);
  return unirHitos(claves.map((k) => g.hitos[k]).filter(esLista));
}

async function apuntarHito(groupJid, userJid, hito) {
  await load();
  const g = freshBucket(groupJid);
  const { clave } = juntarPersona(g.hitos, userJid, unirHitos, { valido: esLista });
  const ya = esLista(g.hitos[clave]) ? g.hitos[clave] : [];
  if (ya.includes(hito)) return false;   // ya estaba: no se paga dos veces
  g.hitos[clave] = [...ya, hito];
  scheduleSave();
  return true;
}

// Quien llega unas veces por @lid y otras por teléfono partía su cuenta diaria
// en dos montones: los hitos de 200/500/1000 se retrasaban (o, peor, se
// cobraban dos veces, uno por cada montón). Las dos formas se juntan con la
// pieza comun (utils/persona.js), la misma que el aura, la racha y el robo.
async function incrementCasinoCount(groupJid, userJid) {
  await load();
  const g = freshBucket(groupJid);
  const { clave } = juntarPersona(g.counts, userJid, sumar);
  const next = (Number(g.counts[clave]) || 0) + 1;
  g.counts[clave] = next;
  // LOS HITOS SE JUNTAN CON LOS CONTADORES, no despues ni por separado.
  //
  // Si una persona llega unas veces por @lid y otras por telefono, sus dos
  // montones se funden aqui — y si el recuerdo de lo cobrado se quedara en el
  // monton que se borra, el bono del dia se volveria a pagar entero bajo la
  // clave nueva. Se juntan los dos lados y gana la union.
  juntarPersona(g.hitos, userJid, unirHitos, { valido: esLista });
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
  return sumaPersona(g.counts, userJid);
}

// Milliseconds until current window resets (0 if expired / unknown).
// Ya no depende del grupo: el corte es el mismo para todos y a hora fija. Se
// deja el parametro para no tocar a quien llama.
async function msUntilReset(_groupJid) {
  return msHastaCorte();
}

async function flushCasino() {
  await saver.flush();
}

module.exports = { incrementCasinoCount, getCasinoCount, contarTirada, tiradasDeHoy,
  hitosCobrados, apuntarHito, msUntilReset, flushCasino, diaDe, msHastaCorte };
