// La racha de días seguidos de cada persona en cada grupo.
//
// Es el único contador del bot que mide DÍAS DE CALENDARIO en vez de una ventana
// móvil de 24h, y esa diferencia es el motivo de que viva aquí y no dentro de
// casinoStore. Una racha tiene que poder decir "llevas catorce días seguidos", y
// eso no se puede calcular con una ventana que empieza cuando alguien escribió
// por primera vez en el grupo: dos personas tendrían días distintos.
//
// El corte del día es el del bot entero (DIA en economia.js), no uno propio.
// Antes esta ficha cortaba a las 5 de Madrid y el contador a medianoche de
// Nueva York: dos "hoy" a una hora de distancia. Ya no.
//
// store = { [groupJid]: { [personaCanonica]: { dia, msgs, dias, ultimo } } }
//   dia    — el día que se está contando ahora mismo (YYYY-MM-DD)
//   msgs   — mensajes escritos en ESE día
//   dias   — días seguidos ya confirmados
//   ultimo — el último día que llegó a contar

const path = require('path');
const { canonicalJid } = require('./wa');
const { readJsonOrEnoent, claveDia, createDebouncedSaver } = require('./helpers');
const { RACHA, DIA } = require('./economia');
const logger = require('./logger');

const RACHA_FILE = path.join(__dirname, '../../data/racha.json');

let store = null;
let loadPromise = null;
const saver = createDebouncedSaver(
  () => store,
  RACHA_FILE,
  18000,
  (e) => logger.error(`rachaStore: fallo al guardar: ${e.message}`),
);

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(RACHA_FILE, {})
      .then((d) => { store = d; })
      .catch((e) => {
        loadPromise = null;
        logger.warn(`rachaStore: lectura falló (${e.message}); no se toca el archivo`);
        throw e;
      });
  }
  await loadPromise;
}

function scheduleSave() { saver.schedule(); }

// Junta las formas LID/teléfono de la misma persona. Sin esto, la racha se
// parte en dos y o se pierde la larga o se cobra el goteo dos veces.
function foldRacha(g, userJid) {
  const key = canonicalJid(userJid);
  const partes = [];
  const extra = [];
  if (g[key] && typeof g[key] === 'object') partes.push(g[key]);
  const keyEsLid = typeof key === 'string' && key.endsWith('@lid');
  for (const k of Object.keys(g)) {
    if (k === key) continue;
    if (!keyEsLid && !k.endsWith('@lid')) continue;
    if (canonicalJid(k) !== key) continue;
    if (g[k] && typeof g[k] === 'object') partes.push(g[k]);
    extra.push(k);
  }
  if (partes.length <= 1) {
    if (partes.length === 1 && g[key] === undefined) {
      g[key] = partes[0];
      if (extra[0]) delete g[extra[0]];
      scheduleSave();
    }
    return key;
  }
  const merged = { dia: null, msgs: 0, dias: 0, ultimo: null };
  for (const p of partes) {
    if (!merged.dia || (p.dia && p.dia > merged.dia)) {
      merged.dia = p.dia;
      merged.msgs = p.msgs || 0;
    } else if (p.dia === merged.dia) {
      merged.msgs += p.msgs || 0;
    }
    merged.dias = Math.max(merged.dias, p.dias || 0);
    if (!merged.ultimo || (p.ultimo && p.ultimo > merged.ultimo)) merged.ultimo = p.ultimo;
  }
  for (const k of extra) delete g[k];
  g[key] = merged;
  scheduleSave();
  return key;
}

// El día al que pertenece un instante. Es el día del bot entero (DIA), no uno
// propio: la racha cortaba a las 5 de la mañana hora de Madrid y el contador de
// mensajes a medianoche de Nueva York, o sea dos "hoy" a una hora de distancia.
//
// Y el cálculo es el compartido. El que había aquí restaba las horas al
// instante antes de formatear, y eso se desvía sesenta minutos los dos días del
// año en que cambia la hora: medido, cortaba a las 06:00 y a las 04:00.
function diaDe(ts) {
  return claveDia(ts, DIA.zona, DIA.horaCorte);
}

// ¿`b` es el día siguiente a `a`? Se compara con fechas de verdad, no sumando
// uno al texto: hay meses de 28, 30 y 31 días y años bisiestos, y una racha que
// se rompe cada 31 de mes sería un regalo para quien la busque.
function esElSiguiente(a, b) {
  if (!a || !b) return false;
  const [ay, am, ad] = a.split('-').map(Number);
  const siguiente = new Date(Date.UTC(ay, am - 1, ad + 1));
  // Date.UTC ya da YYYY-MM-DD estable. Había un FORMATO que no existía en este
  // fichero: tiraba ReferenceError en cada cambio de día y la racha se tragaba
  // el error (checkCasinoMilestone .catch), así que no cobraba ni avisaba.
  return siguiente.toISOString().slice(0, 10) === b;
}

// Anota un mensaje y devuelve qué ha pasado con la racha de esa persona:
//   { evento: null }                       — nada que contar
//   { evento: 'sube',  dias, pago, hito }  — hoy cuenta; `hito` si toca cantarlo
//   { evento: 'rompe', perdidos, dias }    — volvió tarde y la racha larga cayó
//
// El pago y el aviso son cosa de quien llame; aquí solo se lleva la cuenta.
async function anotarMensaje(groupJid, userJid, ahora = Date.now()) {
  await load();
  const hoy = diaDe(ahora);

  const g = store[groupJid] || (store[groupJid] = {});
  const key = foldRacha(g, userJid);
  const p = g[key] || (g[key] = { dia: hoy, msgs: 0, dias: 0, ultimo: null });

  // Cambio de día: se cierra el contador de mensajes y se empieza de cero.
  if (p.dia !== hoy) { p.dia = hoy; p.msgs = 0; }

  p.msgs++;
  scheduleSave();

  // Todavía no ha aparecido lo suficiente, o el día ya estaba contado.
  if (p.msgs < RACHA.minMensajes || p.ultimo === hoy) return { evento: null };

  // El día cuenta. ¿Continúa la racha o empieza una nueva?
  const sigue = esElSiguiente(p.ultimo, hoy);
  const perdidos = sigue ? 0 : p.dias;

  p.dias = sigue ? p.dias + 1 : 1;
  p.ultimo = hoy;
  scheduleSave();

  const pago = RACHA.pago * Math.min(p.dias, RACHA.tope);

  // Romper una racha larga se cuenta, pero SOLO al volver: es el momento en el
  // que la persona está mirando. Anunciarlo el día que falta sería hablar de
  // alguien que no está delante, y además obligaría a un temporizador diario
  // para todo el grupo.
  if (perdidos >= RACHA.minParaLlorarla) {
    return { evento: 'rompe', perdidos, dias: p.dias, pago };
  }

  const hito = RACHA.hitos.includes(p.dias) ? p.dias : null;
  return { evento: 'sube', dias: p.dias, pago, hito };
}

// Lectura sin escribir, para enseñarla en !aura hoy.
//
// Devuelve la racha VIVA: si la última vez que contó no fue ni hoy ni ayer, ya
// está rota aunque el número siga guardado. Enseñar el número viejo sería
// mentir justo en el sitio donde la gente lo comprueba.
async function verRacha(groupJid, userJid, ahora = Date.now()) {
  await load();
  const g = store[groupJid];
  if (!g) return { dias: 0, hoyCuenta: false, msgs: 0 };
  const p = g[foldRacha(g, userJid)];
  if (!p) return { dias: 0, hoyCuenta: false, msgs: 0 };

  const hoy = diaDe(ahora);
  const viva = p.ultimo === hoy || esElSiguiente(p.ultimo, hoy);
  return {
    dias: viva ? p.dias : 0,
    hoyCuenta: p.ultimo === hoy,
    msgs: p.dia === hoy ? p.msgs : 0,
  };
}

async function flushRacha() {
  await saver.flush();
}

// Solo para las pruebas: vacía el estado en memoria.
function _resetParaPruebas() { store = null; loadPromise = null; }

module.exports = { anotarMensaje, verRacha, flushRacha, diaDe, esElSiguiente, _resetParaPruebas };
