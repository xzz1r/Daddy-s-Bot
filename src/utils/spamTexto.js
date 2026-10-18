'use strict';

// SPAM DE TEXTO: LA MISMA FRASE, UNA Y OTRA VEZ.
//
// Lo pidio el dueño (17 oct): «la peña del grupo envia copys y hace spam
// exagerado con esas mierdas que consideran graciosas». La regla es suya:
//
//   · 5 mensajes iguales del mismo numero en menos de 10 segundos. Eran mas
//     de 10 y no saltaba nunca: nadie pega once veces lo mismo en diez
//     segundos (el dueño, 18 oct).
//   · La primera vez el bot cierra el grupo y avisa: *Aviso 1 de 2*.
//   · La segunda, ban: lista negra y fuera del grupo.
//   · Los admins tambien (18 oct), pero a la segunda no se les banea: se les
//     quita el admin. Solo se libra el tier dueño.
//   · Mas flexible (18 oct): el aviso caduca a las 12 horas, y el grupo que se
//     cierra se vuelve a abrir solo a los 20 segundos.
//   · Sin trampas (18 oct): cambiar un emoji o un signo ya no hace distinto el
//     mensaje.
//   · Y solo cuenta lo de cada persona (dueño, 18 oct: «debe ser individual»).
//     Se probo a que saltara tambien con el mismo copy pegado por varias
//     personas, y el dueño lo quito.
//
// Dos piezas, y ninguna puede vivir donde vive la otra:
//
//   · LA RAFAGA, en memoria. Dura diez segundos; guardarla en disco no protege
//     de nada. Se mide con la marca de tiempo DEL MENSAJE, no con la hora a la
//     que llega: el lote que suelta WhatsApp al reconectar trae en un segundo
//     lo que se escribio en diez minutos, y contado por la llegada seria una
//     rafaga que nadie ha hecho.
//   · EL AVISO, en disco. Un reinicio no puede regalar el aviso ya gastado,
//     igual que con los enlaces (utils/linkPerms.js). Caduca a las 12 horas y
//     se borra al banear: si alguien vuelve al grupo, empieza otra vez por el
//     aviso. Y en el mismo fichero, la reapertura pendiente de cada grupo
//     cerrado: si el bot se reinicia en esos 20 segundos, el grupo no se queda
//     cerrado para siempre.
//
// Las dos juntan a la persona con utils/persona.js: la misma rafaga o el mismo
// aviso no se pueden partir entre su @lid y su telefono.

const path = require('path');
const crypto = require('crypto');
const { juntarPersona, clavesMapa, juntarEnMapa, esObjeto } = require('./persona');
const { atomicWriteJson, readJsonOrEnoent, pickFresh } = require('./helpers');
const logger = require('./logger');
const { AVISO_SPAM, BAN_SPAM, ADMIN_SPAM } = require('../data/spamPhrases');

// Salta con el QUINTO igual. «En menos de 10 segundos»: del primero al ultimo
// de los iguales van como mucho 9 segundos enteros, que es lo que da la marca
// de WhatsApp (va en segundos).
const IGUALES = 5;
const VENTANA_S = 10;

// LO QUE YA IBA DE CAMINO NO ES UNA SEGUNDA RAFAGA. Quien pega treinta seguidas
// las tiene enviadas antes de que el grupo se cierre, y llegan detras del
// aviso. Sin este margen, la misma tanda que se ha llevado el aviso se llevaria
// tambien el ban sin que nadie haya podido leer nada.
// Por debajo de REABRIR_MS a proposito: una rafaga nueva despues de reabrir
// tiene que contar.
const GRACIA_MS = 15 * 1000;

// Cuanto vale el aviso (dueño, 18 oct): pasadas 12 horas, la siguiente rafaga
// vuelve a ser el aviso 1.
const AVISO_DURA_MS = 12 * 60 * 60 * 1000;

// Cuanto se queda cerrado el grupo (dueño, 18 oct). Lo justo para cortar la
// rafaga; despues se abre solo, salvo que ya lo haya abierto alguien.
const REABRIR_MS = 20 * 1000;
let esperaReabrir = REABRIR_MS;   // las pruebas la acortan

// Lo que se recuerda de cada persona: los ultimos mensajes de la ventana. Con
// cinco iguales basta; sesenta cubre a quien los mezcla con otros.
const POR_PERSONA = 60;
const MAX_CLAVES = 5000;

const recientes = new Map();   // `${grupo}|${persona}` -> [{ t, h }]

// QUE SE PAREZCAN ES QUE SON IGUALES (dueño, 18 oct). Al principio solo no
// contaban las mayusculas y los espacios, y bastaba con cambiar un emoji o un
// signo para que cinco copias fueran cinco mensajes distintos. Ahora se
// comparan las letras y los numeros, y nada mas:
//
//   · ni tildes ni letras de adorno: «𝓙𝓪𝓳𝓪» y «Jája» son lo mismo que «jaja»;
//   · ni emojis, ni signos, ni el formato de WhatsApp (*negrita*);
//   · ni los caracteres invisibles que se pegan para que dos copias parezcan
//     distintas;
//   · ni las letras o silabas repetidas: «holaaaa» es «hola», y «jaja» y
//     «jajajaja» son lo mismo. Se quedan en una, también las que van dobles
//     de verdad («carro»): da igual, porque las dos copias pasan por lo mismo.
//
// LOS NUMEROS SI CUENTAN: una mencion es un numero. Sin ellos, «!aura @uno» y
// «!aura @otro» eran el mismo mensaje, y quien mirara el aura de cinco
// personas seguidas se llevaba el aviso.
function esencia(texto) {
  return String(texto || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .replace(/(\p{L}{1,3}?)\1+/gu, '$1');
}

// El texto entero no se guarda: un copy puede tener miles de letras y aqui hay
// una entrada por mensaje. Con la huella basta para saber si son iguales.
//
// Un mensaje sin letras ni numeros se compara entero, sin espacios ni
// invisibles y con las repeticiones recogidas igual: «😂😂😂» cinco veces
// sigue siendo spam.
function huella(texto) {
  const limpio = esencia(texto) || String(texto || '').normalize('NFC').toLowerCase()
    .replace(/[\s\p{Cf}\uFE0F]+/gu, '')
    .replace(/(.{1,3}?)\1+/gu, '$1');
  if (!limpio) return null;
  return crypto.createHash('sha1').update(limpio).digest('base64').slice(0, 16);
}

// Lo que ya no puede formar parte de ninguna rafaga se va. Las claves se
// reponen al final cada vez que se tocan, asi que las de delante son las mas
// viejas: se barre desde el principio hasta la primera que sigue viva. Sin
// esto, cada persona que escribia se quedaba en memoria hasta el tope.
function barrer(mapa, t) {
  for (const [k, v] of mapa) {
    if (t - v[v.length - 1].t < VENTANA_S) break;
    mapa.delete(k);
  }
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
  recientes.delete(clave);
  if (iguales.length >= IGUALES) {
    return { veces: iguales.length, desde: Math.min(...iguales.map((x) => x.t)) };
  }
  barrer(recientes, t);
  if (recientes.size >= MAX_CLAVES) recientes.delete(recientes.keys().next().value);
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

// Un aviso de hace mas de 12 horas ya no cuenta.
const vivo = (rec) => (rec?.avisos || 0) >= 1 && Date.now() - (rec.ts || 0) < AVISO_DURA_MS;

// Lo que toca con esta rafaga: 'aviso', 'ban' o null (sigue siendo la tanda
// que ya se aviso). Deja apuntado lo que decide.
async function sancion(grupo, jid, desde) {
  await load();
  const { g, k, rec } = ficha(grupo, jid);
  if (vivo(rec)) {
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
  const { rec } = ficha(grupo, jid);
  return vivo(rec) ? rec.avisos : 0;
}

// ─── la reapertura pendiente ─────────────────────────────────────────────────

async function apuntarReapertura(grupo, hasta) {
  await load();
  (store.__reabrir || (store.__reabrir = {}))[grupo] = hasta;
  await guardar();
}

async function olvidarReapertura(grupo) {
  await load();
  if (!store.__reabrir || !(grupo in store.__reabrir)) return;
  delete store.__reabrir[grupo];
  if (!Object.keys(store.__reabrir).length) delete store.__reabrir;
  await guardar();
}

// { grupo: cuando hay que abrirlo }, para retomarlas al conectar.
async function reaperturasPendientes() {
  await load();
  return { ...(store.__reabrir || {}) };
}

const esperaReapertura = () => esperaReabrir;

// ─── lo que se dice ──────────────────────────────────────────────────────────

const mencion = (jid) => `@${String(jid).split('@')[0]}`;

// El grupo se cierra ANTES de avisar. Si no se ha podido cerrar, no se dice
// que esta cerrado. A un admin se le dice lo que le toca a el: el admin.
// Si se va a reabrir solo, se dice cuanto: «Grupo cerrado 20 segundos».
function textoAviso(grupo, jid, { cerrado = true, admin = false, reabre = false } = {}) {
  const frase = pickFresh(AVISO_SPAM, `${grupo}|spam-aviso`);
  const cierre = !cerrado ? '' : reabre ? `Grupo cerrado ${Math.round(REABRIR_MS / 1000)} segundos. ` : 'Grupo cerrado. ';
  return `*Aviso 1 de 2*\n${mencion(jid)}, el spam está prohibido. ${frase}\n`
    + `${cierre}A la siguiente, ${admin ? 'fuera el admin' : 'ban'}.`;
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
function _usarEsperas({ reabrir } = {}) { esperaReabrir = reabrir ?? REABRIR_MS; }

module.exports = {
  anotar, sancion, avisosDe, textoAviso, textoBan, textoSinAdmin,
  apuntarReapertura, olvidarReapertura, reaperturasPendientes, esperaReapertura,
  IGUALES, VENTANA_S, GRACIA_MS, AVISO_DURA_MS, REABRIR_MS,
  esencia, _usarFichero, _reset, _usarEsperas, _file: () => FILE,
  _cuantasClaves: () => recientes.size,
};
