// La racha de días seguidos de cada persona en cada grupo.
//
// Es el único contador del bot que mide DÍAS DE CALENDARIO en vez de una ventana
// móvil de 24h, y esa diferencia es el motivo de que viva aquí y no dentro de
// casinoStore. Una racha tiene que poder decir "llevas catorce días seguidos", y
// eso no se puede calcular con una ventana que empieza cuando alguien escribió
// por primera vez en el grupo: dos personas tendrían días distintos.
//
// EL DÍA CAMBIA A LAS 5 DE LA MAÑANA, no a medianoche. En un grupo que habla de
// noche, cortar a las 00:00 significa que quien sigue la conversación a las
// 00:30 empieza un día nuevo con un mensaje suelto y pierde la racha al día
// siguiente por no llegar al mínimo. A las cinco no escribe nadie, así que el
// corte no le rompe la noche a nadie.
//
// store = { [groupJid]: { [personaCanonica]: { dia, msgs, dias, ultimo } } }
//   dia    — el día que se está contando ahora mismo (YYYY-MM-DD)
//   msgs   — mensajes escritos en ESE día
//   dias   — días seguidos ya confirmados
//   ultimo — el último día que llegó a contar

const path = require('path');
const { canonicalJid } = require('./wa');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');
const { RACHA } = require('./economia');
const logger = require('./logger');

const RACHA_FILE = path.join(__dirname, '../../data/racha.json');

let store = null;
let loadPromise = null;
let saveTimer = null;

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(RACHA_FILE, {})
      .then((d) => { store = d; })
      .catch((e) => {
        loadPromise = null;
        logger.warn(`rachaStore: lectura falló (${e.message}); no se toca el archivo.`);
        throw e;
      });
  }
  await loadPromise;
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try { await atomicWriteJson(RACHA_FILE, store); }
    catch (e) { logger.error(`rachaStore: fallo al guardar: ${e.message}.`); }
  }, 5000);
}

// El día al que pertenece un instante, en hora española y con el corte movido.
// Formato sv-SE porque es el único que da YYYY-MM-DD directo, que ordena y
// resta bien como texto.
const FORMATO = new Intl.DateTimeFormat('sv-SE', {
  timeZone: RACHA.zona, year: 'numeric', month: '2-digit', day: '2-digit',
});
function diaDe(ts) {
  return FORMATO.format(new Date(ts - RACHA.horaCorte * 3600 * 1000));
}

// ¿`b` es el día siguiente a `a`? Se compara con fechas de verdad, no sumando
// uno al texto: hay meses de 28, 30 y 31 días y años bisiestos, y una racha que
// se rompe cada 31 de mes sería un regalo para quien la busque.
function esElSiguiente(a, b) {
  if (!a || !b) return false;
  const [ay, am, ad] = a.split('-').map(Number);
  const siguiente = new Date(Date.UTC(ay, am - 1, ad + 1));
  return FORMATO.format(siguiente) === b || siguiente.toISOString().slice(0, 10) === b;
}

// Anota un mensaje y devuelve qué ha pasado con la racha de esa persona:
//   { evento: null }                       — nada que contar
//   { evento: 'sube',  dias, pago, hito }  — hoy cuenta; `hito` si toca cantarlo
//   { evento: 'rompe', perdidos, dias }    — volvió tarde y la racha larga cayó
//
// El pago y el aviso son cosa de quien llame; aquí solo se lleva la cuenta.
async function anotarMensaje(groupJid, userJid, ahora = Date.now()) {
  await load();
  const key = canonicalJid(userJid);
  const hoy = diaDe(ahora);

  const g = store[groupJid] || (store[groupJid] = {});
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
  const p = g[canonicalJid(userJid)];
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
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (store) {
    try { await atomicWriteJson(RACHA_FILE, store); }
    catch (e) { logger.error(`rachaStore: fallo al flush: ${e.message}.`); }
  }
}

// Solo para las pruebas: vacía el estado en memoria.
function _resetParaPruebas() { store = null; loadPromise = null; }

module.exports = { anotarMensaje, verRacha, flushRacha, diaDe, esElSiguiente, _resetParaPruebas };
