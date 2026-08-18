const path = require('path');
const { canonicalJid, bareJid, sameUser } = require('./wa');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');
const logger = require('./logger');

// El nombre con el que cada uno firma sus mensajes (pushName).
//
// Existe por un motivo muy concreto: la copia en gris del ranking. Esa copia se
// manda SIN el array de mentions —es lo unico que impide que le vuelva a sonar
// el telefono a los diez del podio— y sin mentions WhatsApp no resuelve nada:
// un "@50412345678" en el cuerpo se queda como texto muerto, con el numero a la
// vista. Para enseñar un nombre hay que traerlo escrito ya.
//
// AVISO HONESTO, y es el mismo que llevaba nickStore: este NO es el nombre que
// ve el grupo. El que se ve en pantalla lo pinta cada telefono con su propia
// libreta de contactos, y eso no viaja por el cable. Lo que hay aqui es como se
// llama cada uno A SI MISMO, que es lo unico que manda WhatsApp. En un grupo
// privado se parecen lo bastante como para que valga, y desde luego se lee
// mejor que quince digitos. Para nada mas sirve: ninguna sancion, ningun
// filtro y ninguna busqueda puede colgar de este dato.
//
// La clave es canonicalJid, igual que en messageCounter y auraStore, para que
// el @lid y el telefono de la misma persona no acaben en dos fichas. Y las
// LECTURAS no se fian de la clave: barren por identidad, porque las fichas
// escritas antes de aprender la correspondencia siguen con la clave vieja.
const FILE = path.join(__dirname, '../../data/nombres.json');

// Un nombre mas largo que esto descuadra la tabla en el movil. Se corta.
const MAX = 22;

let nombres = null;
let loadPromise = null;
let saveTimer = null;

async function load() {
  if (nombres) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(FILE, {})
      .then((d) => { nombres = d; })
      .catch((e) => {
        loadPromise = null; // permite reintentar; NUNCA resetear+sobrescribir
        logger.warn(`nombreStore: lectura falló (${e.message}); no se toca el archivo`);
        throw e;
      });
  }
  await loadPromise;
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try { await atomicWriteJson(FILE, nombres); }
    catch (e) { logger.error(`nombreStore: fallo al guardar: ${e.message}`); }
  }, 10000);
}

// Los invisibles se filtran por CODIGO, no con una clase de caracteres.
//
// Escribir el rango tal cual metia los propios caracteres invisibles dentro del
// fuente: el fichero se veia idéntico a uno correcto y nadie podia auditarlo ni
// corregirlo a ojo. Con los codigos a la vista se lee lo que hace.
//
//  0x00-0x1F, 0x7F  control: saltos de linea que parten la tabla en dos.
//  0x200B-0x200F    espacios de ancho cero y marcas de direccion.
//  0x202A-0x202E    embebidos y OVERRIDE de direccion: son los peligrosos, dan
//                   la vuelta visualmente a TODO lo que va detras del nombre.
//  0x2066-0x2069    aislantes de direccion, misma familia.
//  0xFEFF           BOM usado como espacio invisible.
function invisible(cp) {
  return cp < 0x20 || cp === 0x7f
    || (cp >= 0x200b && cp <= 0x200f)
    || (cp >= 0x202a && cp <= 0x202e)
    || (cp >= 0x2066 && cp <= 0x2069)
    || cp === 0xfeff;
}

// El pushName lo escribe el usuario, asi que entra como entrada hostil.
//
//  - Fuera todo lo invisible, por lo de arriba.
//  - Los cuatro simbolos de formato de WhatsApp (* _ ~ `) dejarian poner el
//    ranking entero en negrita o tachado desde el propio nombre: se quitan.
//  - Una arroba delante imita una mencion que no lo es. Se recorta.
//
// Lo que queda vacio despues de limpiar no es un nombre: se descarta y esa
// persona se queda sin ficha, que es un estado previsto.
function limpiar(raw) {
  if (typeof raw !== 'string') return '';
  let n = [...raw]
    .filter((c) => !invisible(c.codePointAt(0)))
    .join('')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^@+/, '')
    .trim();
  if (n.length > MAX) n = `${n.slice(0, MAX - 1).trimEnd()}...`;
  return n;
}

async function recordName(jid, pushName) {
  if (!jid) return;
  const nombre = limpiar(pushName);
  if (!nombre) return;
  await load();
  const key = canonicalJid(jid);
  const ficha = nombres[key];
  // Se escribe solo cuando cambia de verdad. Si no, cada mensaje del grupo
  // programaria un guardado a disco para dejar el fichero exactamente igual.
  if (ficha && ficha.nombre === nombre) return;
  nombres[key] = { nombre, ts: Date.now() };
  scheduleSave();
}

// Devuelve el nombre conocido, o null. Nunca devuelve un numero: quien no tenga
// ficha no tiene nombre, y es quien llama el que decide con que rellenar.
function getName(jid) {
  if (!nombres || !jid) return null;
  const directa = nombres[canonicalJid(jid)] || nombres[bareJid(jid)];
  if (directa) return directa.nombre;
  // Ficha escrita antes de conocer la correspondencia lid↔telefono: se busca
  // por identidad. El mapa es del tamaño de un grupo, no de una agenda.
  for (const k of Object.keys(nombres)) {
    if (sameUser(k, jid)) return nombres[k].nombre;
  }
  return null;
}

// Deja el fichero al dia antes de apagar, igual que flushCounts.
async function flushNames() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (!nombres) return;
  try { await atomicWriteJson(FILE, nombres); }
  catch (e) { logger.error(`nombreStore: fallo al guardar: ${e.message}`); }
}

// load() se expone porque getName es SINCRONO a proposito (se llama mientras se
// pinta una tabla). Alguien tiene que haber calentado el mapa antes; lo hace el
// propio recordName con el primer mensaje que entra.
module.exports = { recordName, getName, flushNames, limpiar, cargar: load };
