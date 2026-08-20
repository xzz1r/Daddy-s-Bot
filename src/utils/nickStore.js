const path = require('path');
const { bareJid } = require('./wa');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');
const logger = require('./logger');

// Hechos observados de cada cuenta, para !antiempresa y !antifoto.
//
// De esto cuelga una expulsión irreversible, así que el diseño es deliberado:
//
//  1. SOLO SE GUARDA LO QUE WHATSAPP AFIRMA. Un hecho ausente nunca cuenta como
//     un hecho negativo: quien no tenga ficha queda "sin datos" y jamás entra en
//     una purga.
//
//  2. LA CLAVE ES bareJid, NO canonicalJid. canonicalJid depende del mapa
//     lidToPhone, que se va llenando durante la ejecución: el mismo usuario
//     daría el LID crudo con el mapa frío y el teléfono con el mapa caliente,
//     partiendo su registro en dos. bareJid es estable siempre; la unificación
//     se hace al LEER, consultando todas las formas conocidas del participante.
//
//  3. AQUÍ NO HAY NOMBRES. Se guardaron para un !antinick que hubo que retirar:
//     el nombre que se ve en el grupo lo pinta cada teléfono con su propia
//     libreta, no viaja por el cable, así que lo que veía el bot no era lo que
//     veía el grupo. Guardarlo era escribir en disco en cada mensaje un dato que
//     no se podía usar para nada.
//
// store = { __global: { [bareJid]: { biz, photo, ts } } }
//   biz   → true si WhatsApp adjuntó un verified_name a alguno de sus mensajes.
//           Eso solo lo lleva una cuenta Business, así que es prueba directa
//           (Baileys lo expone como msg.verifiedBizName).
//   photo → 'si' | 'no'. WhatsApp avisa cuando alguien pone o quita su foto
//           (contacts.update con imgUrl 'changed' / 'removed', y null cuando
//           nunca la ha puesto). Sirve para resolver a quien la tiene oculta
//           por privacidad, que es el único caso que la consulta no distingue.
//   ts    → cuándo se actualizó por última vez

const FILE = path.join(__dirname, '../../data/nicks.json');

// Los hechos no vienen de un grupo concreto (son de la cuenta), así que valen
// para cualquier grupo y viven en un único cajón.
const GLOBAL = '__global';

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

async function recordFacts(userJid, { biz, photo } = {}) {
  if (!userJid) return;
  if (biz !== true && photo !== 'si' && photo !== 'no') return; // nada que anotar
  await load();
  const key = bareJid(userJid);
  if (!store[GLOBAL]) store[GLOBAL] = {};
  const prev = store[GLOBAL][key] || {};
  const next = { ...prev };

  if (biz === true) next.biz = true;             // solo se añade, nunca se quita
  if (photo === 'si' || photo === 'no') next.photo = photo;

  if (next.biz === prev.biz && next.photo === prev.photo) return;
  next.ts = Date.now();
  store[GLOBAL][key] = next;

  // La ficha `biz` va a disco AL MOMENTO; la foto se queda con el retardo.
  //
  // No son lo mismo. El hecho de que una cuenta sea business decide una
  // expulsion y se apunta JUSTO ANTES de echarla —para que la prueba sobreviva
  // si el kick falla—, o sea en el instante de mas movimiento. Perderlo en la
  // ventana de 10 s significa redescubrirlo desde cero, y a veces no se puede
  // (la cuenta ya no esta en el grupo para consultarle el perfil).
  //
  // La foto es otra cosa: se anota en casi cada mensaje cuando el anti-fake
  // esta encendido. Esa SI necesita el debounce, o el bot escribe el fichero
  // entero cada dos por tres.
  if (biz === true) await flushNicks();
  else scheduleSave();
}

// Todo lo que se sabe de un usuario, mirando TODAS sus formas (id, lid,
// teléfono). Eso es lo que unifica a quien quedó anotado bajo dos claves.
// Los hechos se acumulan porque no se contradicen: si en algún sitio consta,
// consta. El segundo argumento (groupJid) se acepta y se ignora: los hechos son
// de la cuenta, no del grupo.
async function getMemberFacts(forms) {
  await load();
  const bucket = store[GLOBAL];
  if (!bucket) return null;

  let out = null;
  for (const f of forms) {
    if (!f) continue;
    const rec = bucket[bareJid(f)];
    if (!rec) continue;
    if (!out) { out = { ...rec }; continue; }
    if (rec.biz) out.biz = true;
    if (rec.photo) out.photo = rec.photo;
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

module.exports = { recordFacts, getMemberFacts, flushNicks, _resetNickStore };
