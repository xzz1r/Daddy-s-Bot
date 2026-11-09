'use strict';

// ─── ¿ES BUSINESS? VARIOS A LA VEZ Y SIN MIRAR SU PERFIL (9 nov) ────────────
//
// El dueño: «no mola el simple hecho de que ya no banee antes de que escriban
// un mensaje». Desde que el cupo de mirar perfiles de empresa bajó (60 al día,
// ver utils/ritmo.js: el 321 cayó el día después de que se multiplicara), a la
// mayoría de los que entraban ya no se les podía mirar al entrar: el cupo no
// llegaba, y se les comprobaba al escribir, con el spam ya puesto.
//
// Hay otra pregunta, y es la que hacen los propios clientes de WhatsApp para
// enseñar el nombre de empresa de un contacto: la consulta usync con el
// apartado `business` y dentro `verified_name`. Devuelve el certificado del
// nombre de empresa, y ese certificado SOLO lo tienen las cuentas de WhatsApp
// Business (es el mismo que viaja en sus mensajes como `verifiedBizName`). Y
// va en lote: una consulta para hasta POR_CONSULTA personas. El formato es el
// de whatsmeow (GetUserInfo en user.go): modo `full`, contexto `background`,
// y el JID de teléfono de cada uno.
//
// No es gratis, así que lleva su propio tope (TOPES, la mitad con un número en
// rodaje) y su propio hueco entre consulta y consulta. Las entradas se juntan
// unos segundos (VENTANA_MS) para que una oleada de veinte sea una consulta y
// no veinte; lo que no quepa en el tope espera y sale en la siguiente, todo
// junto. Lo que no se pueda saber vuelve como 'desconocido' y quien llama
// sigue como antes.
//
// Resultado por teléfono:
//   'biz'         → trae certificado de nombre de empresa: es Business
//   'sin-nombre'  → WhatsApp contestó y no trae certificado
//   'desconocido' → no se preguntó o no contestó
//
// SOLO AL ENTRAR, NUNCA EN LAS SOLICITUDES (dueño, 9 nov). Se llegó a
// rechazar a las cuentas Business que pedían entrar, y el dueño lo quitó: «es
// mejor vetarlas de por vida que arriesgarse a no aceptar cuentas que también
// pueden parecer Business». Las solicitudes se aceptan como siempre; quien
// entra y lleva nombre de empresa se echa y va a la lista negra, a la vista
// del grupo y deshacible con *!fkunban*. No se vuelve a filtrar la cola.
//
// 'sin-nombre' NO se apunta como «cuenta normal» en la ficha: eso lo sigue
// diciendo solo el perfil de empresa. Si alguien con 'sin-nombre' resulta ser
// Business al escribir, se cuenta (`fallos`) y sale en `npm run estado`: es lo
// que dice si este atajo se puede creer.

const fs = require('fs');
const path = require('path');
const { crearTope, crearRitmo, apuntarTope, esperar } = require('./ritmo');
const { withTimeout } = require('./helpers');
const logger = require('./logger');

const POR_CONSULTA = 20;
const VENTANA_MS = 3000;
const ESPERA_MAX_MS = 20 * 60 * 1000;
const REINTENTO_TOPE_MS = 5 * 60 * 1000;
const TOPES = { porHora: 12, porDia: 80, rodaje: { porHora: 6, porDia: 40 } };
const HUECO = { hueco: 3000, azar: 2000 };

let FICHERO = path.join(__dirname, '../../data/empresaLote.json');
let enRodaje = () => require('./numeroBot').enRodaje();
const limites = () => (enRodaje() ? TOPES.rodaje : { porHora: TOPES.porHora, porDia: TOPES.porDia });
let gastar = crearTope(0, Date.now, { limites });
let turno = crearRitmo(HUECO);

// El protocolo, con la forma de la librería (WAUSync/Protocols).
function protocoloEmpresa() {
  const { proto, getBinaryNodeChild } = require('@whiskeysockets/baileys');
  return {
    name: 'business',
    getQueryElement: () => ({ tag: 'business', attrs: {}, content: [{ tag: 'verified_name', attrs: {} }] }),
    getUserElement: () => null,
    parser: (node) => {
      if (!node || node.tag !== 'business') return null;
      const vn = getBinaryNodeChild(node, 'verified_name');
      if (!vn || !(vn.content instanceof Uint8Array) || !vn.content.length) return { empresa: false };
      let nombre = '';
      try {
        const cert = proto.VerifiedNameCertificate.decode(vn.content);
        nombre = String(proto.VerifiedNameCertificate.Details.decode(cert.details).verifiedName || '');
      } catch { /* el certificado está: es Business aunque no se lea el nombre */ }
      return { empresa: true, nombre: nombre.slice(0, 60) };
    },
  };
}

const bare = (j) => {
  const s = String(j || '');
  const at = s.indexOf('@');
  return at < 0 ? s : s.slice(0, at).split(':')[0] + s.slice(at);
};

// ─── Lo que se lleva apuntado: cifras para `npm run estado` y lo visto ──────
let datos = null;
function cargar() {
  if (datos) return datos;
  try { datos = JSON.parse(fs.readFileSync(FICHERO, 'utf8')); } catch { datos = null; }
  if (!datos || typeof datos !== 'object') datos = {};
  datos.cifras = datos.cifras || { consultas: 0, revisados: 0, empresas: 0, fallos: 0, desde: Date.now() };
  datos.vistos = datos.vistos || {};
  return datos;
}
let guardarTimer = null;
function guardar() {
  if (guardarTimer) return;
  guardarTimer = setTimeout(() => {
    guardarTimer = null;
    try {
      const d = cargar();
      const claves = Object.keys(d.vistos);
      if (claves.length > 3000) for (const k of claves.slice(0, claves.length - 3000)) delete d.vistos[k];
      fs.mkdirSync(path.dirname(FICHERO), { recursive: true });
      fs.writeFileSync(FICHERO, JSON.stringify(d));
    } catch { /* las cifras no pueden tirar el bot */ }
  }, 2000);
  guardarTimer.unref?.();
}

// Una consulta, hasta POR_CONSULTA teléfonos. Devuelve Map(tel → resultado).
async function consultar(sock, telefonos) {
  const salida = new Map(telefonos.map((t) => [t, { estado: 'desconocido' }]));
  if (!telefonos.length || typeof sock?.executeUSyncQuery !== 'function') return salida;
  if (!gastar(1)) {
    apuntarTope('usyncEmpresa');
    for (const t of telefonos) salida.set(t, { estado: 'desconocido', tope: true });
    return salida;
  }
  await esperar(turno());
  const { USyncQuery, USyncUser } = require('@whiskeysockets/baileys');
  const q = new USyncQuery().withMode('full').withContext('background');
  q.protocols.push(protocoloEmpresa());
  for (const t of telefonos) q.withUser(new USyncUser().withId(t));
  let r = null;
  try { r = await withTimeout(sock.executeUSyncQuery(q), 20000); } catch (e) {
    logger.info(`empresa en lote: la consulta falló (${e?.message || e}); se sigue por el camino de siempre`);
    return salida;
  }
  const d = cargar();
  d.cifras.consultas++;
  for (const u of r?.list || []) {
    const tel = bare(u.id);
    if (!salida.has(tel)) continue;
    const res = u.business?.empresa ? { estado: 'biz', nombre: u.business.nombre || '' } : { estado: 'sin-nombre' };
    salida.set(tel, res);
    d.cifras.revisados++;
    if (res.estado === 'biz') d.cifras.empresas++;
    d.vistos[tel] = { e: res.estado, ts: Date.now() };
  }
  guardar();
  return salida;
}

// ─── La cola: se juntan unos segundos y salen en lote ────────────────────────
const cola = new Map();   // teléfono -> { esperan: [resolve], desde }
let reloj = null;
let enVuelo = false;
function programar(ms) {
  if (reloj) return;
  // Sin unref: una comprobación pendiente mantiene vivo el proceso los pocos
  // segundos que tarda en salir su lote.
  reloj = setTimeout(() => { reloj = null; vaciar().catch(() => {}); }, ms);
}
async function vaciar() {
  if (enVuelo || !cola.size) return;
  enVuelo = true;
  try {
    const ahora = Date.now();
    // Lo que lleva demasiado esperando se suelta como 'desconocido'.
    for (const [t, c] of cola) {
      if (ahora - c.desde > ESPERA_MAX_MS) { cola.delete(t); for (const r of c.esperan) r({ estado: 'desconocido' }); }
    }
    const lote = [...cola.keys()].slice(0, POR_CONSULTA);
    if (!lote.length) return;
    const res = await consultar(sockActual, lote);
    let topeado = false;
    for (const t of lote) {
      const v = res.get(t) || { estado: 'desconocido' };
      if (v.tope) { topeado = true; continue; }   // se queda en la cola
      const c = cola.get(t);
      cola.delete(t);
      for (const r of c?.esperan || []) r(v);
    }
    if (cola.size) programar(topeado ? REINTENTO_TOPE_MS : VENTANA_MS);
  } finally { enVuelo = false; }
}

let sockActual = null;
// Pide la comprobación de un teléfono. Se resuelve cuando sale su lote (o a
// los ESPERA_MAX_MS, como 'desconocido').
function revisarEnLote(sock, telefono) {
  const t = bare(telefono);
  if (!t.endsWith('@s.whatsapp.net')) return Promise.resolve({ estado: 'desconocido', motivo: 'sin teléfono' });
  sockActual = sock || sockActual;
  return new Promise((resolve) => {
    const c = cola.get(t) || { esperan: [], desde: Date.now() };
    c.esperan.push(resolve);
    cola.set(t, c);
    if (cola.size >= POR_CONSULTA) { clearTimeout(reloj); reloj = null; vaciar().catch(() => {}); } else programar(VENTANA_MS);
  });
}

// El perfil dijo «es Business» de alguien que esta consulta dio por
// 'sin-nombre' esta semana: el atajo falló con esa persona.
function anotarComprobacion(telefono, esBusiness) {
  if (!esBusiness) return;
  const d = cargar();
  const v = d.vistos[bare(telefono)];
  if (v && v.e === 'sin-nombre' && Date.now() - v.ts < 7 * 24 * 3600 * 1000) {
    d.cifras.fallos++;
    v.e = 'fallo';
    guardar();
  }
}

function cifras() { return { ...cargar().cifras }; }

// La línea de `npm run estado`.
function lineaEstado(d) {
  const c = d?.cifras;
  if (!c || !c.consultas) return { tipo: 'ok', texto: 'Anti-empresa al entrar (en lote): sin consultas todavía' };
  const texto = `Anti-empresa al entrar (en lote): ${c.revisados} revisados en ${c.consultas} consultas, ${c.empresas} Business`
    + (c.fallos ? `; ${c.fallos} que resultaron Business al escribir sin que el lote lo viera` : '');
  if (c.fallos && c.revisados >= 20 && c.fallos / Math.max(1, c.empresas + c.fallos) > 0.2) {
    return { tipo: 'aviso', texto, arreglo: 'el lote no ve a parte de las cuentas Business: pásaselo a quien mantenga el bot' };
  }
  return { tipo: 'ok', texto };
}

module.exports = {
  revisarEnLote, anotarComprobacion, cifras, lineaEstado, TOPES, POR_CONSULTA,
  _protocolo: protocoloEmpresa,
  _consultar: consultar,
  _prueba: ({ fichero, rodaje, hueco } = {}) => {
    if (fichero) FICHERO = fichero;
    if (rodaje) enRodaje = rodaje;
    datos = null;
    gastar = crearTope(0, Date.now, { limites });
    turno = crearRitmo(hueco || HUECO);
    cola.clear(); clearTimeout(reloj); reloj = null;
  },
};
