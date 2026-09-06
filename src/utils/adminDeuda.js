// Lo que queda a deber quien le quita el admin al bot.
//
// POR QUE EXISTE. El anti-admin revierte cualquier degradacion: repone al
// degradado y le quita el admin a quien lo hizo. Contra el propio bot no puede
// hacer ninguna de las dos cosas —sin admin no tiene permiso para nada—, asi
// que quitarselo era la unica agresion del grupo que salia GRATIS. Y encima
// desarmaba el resto: sin admin no borra enlaces, no borra historias y no
// expulsa.
//
// No se puede impedir. Lo que si se puede es que no salga gratis: se apunta
// quien fue, y en cuanto alguien le devuelve el admin al bot, se cobra.
//
// SE GUARDA EN DISCO, y ese es el punto entero. La deuda tiene que sobrevivir a
// un reinicio: entre que le quitan el admin y se lo devuelven pueden pasar dias,
// y pm2 reinicia el bot por mucho menos. En memoria, cualquier reinicio en medio
// era el perdon automatico.
//
// store = { [groupJid]: { autor, ts } }
//   autor — quien le quito el admin, tal y como lo mando WhatsApp
//   ts    — cuando, para poder caducarla
const path = require('path');
const { readJsonOrEnoent, createDebouncedSaver } = require('./helpers');
const logger = require('./logger');

const FILE = path.join(__dirname, '../../data/adminDeuda.json');

// UNA DEUDA CADUCA. Cobrarle a alguien un mes despues, por algo que a lo mejor
// ya se hablo en el grupo, es el bot sacando un tema muerto. Siete dias es de
// sobra: si en una semana nadie le ha devuelto el admin al bot, el problema del
// grupo no es la deuda.
const VIGENCIA = 7 * 24 * 60 * 60 * 1000;

let store = null;
let loadPromise = null;
const saver = createDebouncedSaver(
  () => store,
  FILE,
  4000,
  (e) => logger.error(`adminDeuda: fallo al guardar: ${e.message}`),
);

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(FILE, {})
      .then((d) => { store = d && typeof d === 'object' ? d : {}; })
      .catch(() => { store = {}; });
  }
  await loadPromise;
}

async function anotarDeuda(groupJid, autor) {
  if (!groupJid || !autor) return false;
  await load();
  store[groupJid] = { autor: String(autor), ts: Date.now() };
  saver.schedule();
  return true;
}

// Devuelve la deuda y la BORRA. Se cobra una vez: si el que la debe vuelve a
// hacerlo, se apunta otra.
async function cobrarDeuda(groupJid) {
  if (!groupJid) return null;
  await load();
  const d = store[groupJid];
  if (!d) return null;
  delete store[groupJid];
  saver.schedule();
  if (!d.autor || Date.now() - (d.ts || 0) > VIGENCIA) return null;
  return d;
}

async function verDeuda(groupJid) {
  await load();
  const d = store[groupJid];
  if (!d || Date.now() - (d.ts || 0) > VIGENCIA) return null;
  return d;
}

async function flushDeuda() { if (store) await saver.flush(); }

module.exports = { anotarDeuda, cobrarDeuda, verDeuda, flushDeuda, VIGENCIA, _file: FILE };
