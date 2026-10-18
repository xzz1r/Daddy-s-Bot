'use strict';

// SPAM DE TEXTO: LA MISMA FRASE, UNA Y OTRA VEZ.
//
// Lo pidio el dueño (17 oct): «la peña del grupo envia copys y hace spam
// exagerado con esas mierdas que consideran graciosas». La regla es suya:
//
//   · Mas de 10 mensajes iguales del mismo numero en menos de 10 segundos.
//   · La primera vez el bot cierra el grupo y avisa: *Aviso 1 de 2*.
//   · La segunda, ban: lista negra y fuera del grupo.
//   · Los admins tambien (18 oct), pero a la segunda no se les banea: se les
//     quita el admin. Solo se libra el tier dueño.
//
// Dos piezas, y ninguna puede vivir donde vive la otra:
//
//   · LA RAFAGA, en memoria. Dura diez segundos; guardarla en disco no protege
//     de nada. Se mide con la marca de tiempo DEL MENSAJE, no con la hora a la
//     que llega: el lote que suelta WhatsApp al reconectar trae en un segundo
//     lo que se escribio en diez minutos, y contado por la llegada seria una
//     rafaga que nadie ha hecho.
//   · EL AVISO, en disco. Un reinicio no puede regalar el aviso ya gastado,
//     igual que con los enlaces (utils/linkPerms.js). No caduca y se borra al
//     banear: si alguien vuelve al grupo, empieza otra vez por el aviso.
//
// Las dos juntan a la persona con utils/persona.js: la misma rafaga o el mismo
// aviso no se pueden partir entre su @lid y su telefono.

const path = require('path');
const crypto = require('crypto');
const { juntarPersona, clavesMapa, juntarEnMapa, esObjeto } = require('./persona');
const { atomicWriteJson, readJsonOrEnoent, pickFresh } = require('./helpers');
const logger = require('./logger');
const { AVISO_SPAM, BAN_SPAM, ADMIN_SPAM } = require('../data/spamPhrases');

// «Mas de 10»: salta con el undecimo. «En menos de 10 segundos»: del primero
// al ultimo de los iguales van como mucho 9 segundos enteros, que es lo que
// da la marca de WhatsApp (va en segundos).
const IGUALES = 10;
const VENTANA_S = 10;

// LO QUE YA IBA DE CAMINO NO ES UNA SEGUNDA RAFAGA. Quien pega treinta seguidas
// las tiene enviadas antes de que el grupo se cierre, y llegan detras del
// aviso. Sin este margen, la misma tanda que se ha llevado el aviso se llevaria
// tambien el ban sin que nadie haya podido leer nada.
const GRACIA_MS = 30 * 1000;

// Lo que se recuerda de cada persona: los ultimos mensajes de la ventana. Con
// once iguales basta; sesenta cubre a quien los mezcla con otros.
const POR_PERSONA = 60;
const MAX_CLAVES = 5000;

const recientes = new Map();   // `${grupo}|${persona}` -> [{ t, h }]

// El texto entero no se guarda: un copy puede tener miles de letras y aqui hay
// una entrada por mensaje. Con la huella basta para saber si son iguales.
// Mayusculas y espacios no cuentan: «JAJAJA» y «jajaja » son el mismo spam.
function huella(texto) {
  const limpio = String(texto || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!limpio) return null;
  return crypto.createHash('sha1').update(limpio).digest('base64').slice(0, 16);
}

// messageTimestamp viene en segundos, como numero o como Long de protobuf.
function segundosDe(ts) {
  const n = Number(typeof ts?.toNumber === 'function' ? ts.toNumber() : ts || 0);
  return n > 0 ? Math.floor(n) : Math.floor(Date.now() / 1000);
}

// Apunta un mensaje de texto. Devuelve null, o la rafaga si con este se pasa
// del tope: { veces, desde }, con `desde` la marca (en segundos) del primero de
// los iguales. La rafaga se gasta al saltar: el contador vuelve a cero.
function anotar(grupo, jid, texto, ts) {
  const h = huella(texto);
  if (!h || !grupo || !jid) return null;
  const t = segundosDe(ts);
  const { clave, valor } = juntarEnMapa(recientes, clavesMapa(`${grupo}|`, jid), (vs) => vs.flat());
  const lista = [...(valor || []), { t, h }];
  const ultimo = Math.max(...lista.map((x) => x.t));
  const vivos = lista.filter((x) => ultimo - x.t < VENTANA_S).slice(-POR_PERSONA);
  const iguales = vivos.filter((x) => x.h === h);
  if (iguales.length > IGUALES) {
    recientes.delete(clave);
    return { veces: iguales.length, desde: Math.min(...iguales.map((x) => x.t)) };
  }
  if (!recientes.has(clave) && recientes.size >= MAX_CLAVES) {
    recientes.delete(recientes.keys().next().value);
  }
  recientes.set(clave, vivos);
  return null;
}

// ─── el aviso, en disco ──────────────────────────────────────────────────────
//
// store = { [grupo]: { [persona]: { avisos: 1, ts } } }   ts = cuando se aviso

let FILE = path.join(__dirname, '../../data/spamTexto.json');
let store = null;
let loadPromise = null;

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(FILE, {})
      .then((d) => { store = esObjeto(d) ? d : {}; })
      .catch((e) => {
        loadPromise = null; // permite reintentar; NUNCA resetear+sobrescribir
        logger.warn(`spamTexto: lectura falló (${e.message}); no se toca el archivo`);
        throw e;
      });
  }
  await loadPromise;
}

// Se escribe en el momento: pasa una vez por rafaga, y un aviso que se pierde
// en un reinicio es un ban que no llega.
async function guardar() {
  try { await atomicWriteJson(FILE, store); }
  catch (e) { logger.error(`spamTexto: fallo al guardar: ${e.message}`); }
}

// Dos fichas de la misma persona: manda la que mas avisos lleva. No se suman,
// por lo mismo que en linkPerms: uno de mas es un ban que nadie ha avisado.
function combinarFichas(fichas) {
  return [...fichas].sort((a, b) => ((b.avisos || 0) - (a.avisos || 0)) || ((b.ts || 0) - (a.ts || 0)))[0];
}

function ficha(grupo, jid) {
  const g = store[grupo] || (store[grupo] = {});
  const { clave } = juntarPersona(g, jid, combinarFichas, { valido: esObjeto });
  return { g, k: clave, rec: g[clave] };
}

// Lo que toca con esta rafaga: 'aviso', 'ban' o null (sigue siendo la tanda
// que ya se aviso). Deja apuntado lo que decide.
async function sancion(grupo, jid, desde) {
  await load();
  const { g, k, rec } = ficha(grupo, jid);
  if ((rec?.avisos || 0) >= 1) {
    if (Number(desde) * 1000 <= (rec.ts || 0) + GRACIA_MS) return null;
    delete g[k];
    if (!Object.keys(g).length) delete store[grupo];
    await guardar();
    return 'ban';
  }
  g[k] = { avisos: 1, ts: Date.now() };
  await guardar();
  return 'aviso';
}

// Cuantos avisos lleva. Para las pruebas y para quien quiera mirarlo.
async function avisosDe(grupo, jid) {
  await load();
  if (!store[grupo]) return 0;
  return ficha(grupo, jid).rec?.avisos || 0;
}

// ─── lo que se dice ──────────────────────────────────────────────────────────

const mencion = (jid) => `@${String(jid).split('@')[0]}`;

// El grupo se cierra ANTES de avisar. Si no se ha podido cerrar, no se dice
// que esta cerrado. A un admin se le dice lo que le toca a el: el admin.
function textoAviso(grupo, jid, { cerrado = true, admin = false } = {}) {
  const frase = pickFresh(AVISO_SPAM, `${grupo}|spam-aviso`);
  return `*Aviso 1 de 2*\n${mencion(jid)}, el spam está prohibido. ${frase}\n`
    + `${cerrado ? 'Grupo cerrado. ' : ''}A la siguiente, ${admin ? 'fuera el admin' : 'ban'}.`;
}

// La segunda de un admin: se queda en el grupo, sin admin, y de ejemplo.
function textoSinAdmin(grupo, jid) {
  const frase = pickFresh(ADMIN_SPAM, `${grupo}|spam-admin`).replace(/%M/g, mencion(jid));
  return `*Aviso 2 de 2: fuera el admin*\n${frase}`;
}

// Solo se le usa de ejemplo si ha salido de verdad. Si no se le ha podido
// echar, el grupo ve lo que SI ha pasado: la lista negra.
function textoBan(grupo, jid, { fuera = true } = {}) {
  if (!fuera) return `*Aviso 2 de 2: ban*\n${mencion(jid)} a la lista negra por spam de mensajes.`;
  const frase = pickFresh(BAN_SPAM, `${grupo}|spam-ban`).replace(/%M/g, mencion(jid));
  return `*Aviso 2 de 2: ban*\n${frase}`;
}

// Solo para pruebas.
function _usarFichero(f) { FILE = f; store = null; loadPromise = null; }
function _reset() { recientes.clear(); store = null; loadPromise = null; }

module.exports = {
  anotar, sancion, avisosDe, textoAviso, textoBan, textoSinAdmin,
  IGUALES, VENTANA_S, GRACIA_MS,
  _usarFichero, _reset, _file: () => FILE,
};
