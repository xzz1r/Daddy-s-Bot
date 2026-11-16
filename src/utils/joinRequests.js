'use strict';

const path = require('path');
const { bareJid, canonicalJid } = require('./wa');
const { isBanned } = require('./banlist');
const { atomicWriteJson, readJsonOrEnoent, withTimeout } = require('./helpers');

// NINGUNA LLAMADA A WHATSAPP SE ESPERA PARA SIEMPRE.
//
// Un WebSocket colgado no LANZA: se queda. Un try/catch no sirve de nada ahi,
// porque no hay error que atrapar — hay una promesa que no se resuelve nunca y
// un comando que no contesta jamas. El bot ya tenia tope en groupMetadata por
// exactamente este motivo, con el comentario puesto, y el resto de llamadas de
// red se habian quedado sin el.
//
// El sondeo de solicitudes corre en bucle: una lectura colgada aqui no dejaba
// pasar ninguna de las siguientes.
const TOPE_COLA = 10000;
const logger = require('./logger');

// Quien tenía una solicitud de entrada PENDIENTE en cada grupo.
//
// Es el único dato que distingue "un admin aprobó una solicitud" de "un admin
// metió a alguien a dedo", y hace falta porque WhatsApp NO avisa de las
// aprobaciones:
//
//   RequestJoinAction = 'created' | 'revoked' | 'rejected'   (Types/GroupMetadata.d.ts:9)
//
// No hay 'approved'. Cuando el admin aprueba, lo único que llega es un alta
// normal, con el mismo messageStubType (27) que una alta a dedo. Por eso el
// intento anterior —mirar el stub— no podía funcionar y el bot seguía
// degradando al admin que solo había aceptado a alguien.
//
// Así que la pregunta se le da la vuelta: en vez de "¿cómo entró?", se guarda
// de antemano "¿quién estaba esperando a que le abrieran?". Si al llegar el
// alta esa persona figuraba en la lista de pendientes, fue una aprobación.
//
// La lista se llena por dos vías, porque ninguna basta sola:
//   1. el evento group.join-request (action 'created'), en tiempo real;
//   2. un sondeo periódico de groupRequestParticipantsList, que cubre las
//      solicitudes hechas con el bot apagado y las que llegan por enlace de
//      invitación, que en esta versión de Baileys no emiten evento.

const FILE = path.join(__dirname, '../../data/joinRequests.json');

// Una solicitud puede quedarse semanas sin que nadie la mire, así que el
// registro tiene que durar. Pasado el mes se olvida para no crecer sin fin.
const TTL = 30 * 86400000;
const MAX_POR_GRUPO = 500;

// Un sondeo se considera utilizable durante este rato. Si el último es más
// viejo, NO se sabe quién estaba esperando, y entonces no se castiga a nadie.
const SONDEO_VALIDO_MS = 15 * 60 * 1000;

let store = null;       // { [grupo]: { [canonicalJid]: ts } }
let loadPromise = null;
let saveTimer = null;
const ultimoSondeo = new Map(); // grupo -> ts del último sondeo con éxito

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(FILE, {})
      .then((d) => { store = d; })
      .catch((e) => {
        loadPromise = null;
        logger.warn(`joinRequests: lectura falló (${e.message}); no se toca el archivo`);
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
    catch (e) { logger.error(`joinRequests: fallo al guardar: ${e.message}`); }
  }, 5000);
}

function podar(g) {
  const corte = Date.now() - TTL;
  for (const k of Object.keys(g)) if (g[k] < corte) delete g[k];
  const claves = Object.keys(g);
  if (claves.length > MAX_POR_GRUPO) {
    claves.sort((a, b) => g[a] - g[b]);
    for (const k of claves.slice(0, claves.length - MAX_POR_GRUPO)) delete g[k];
  }
}

// Anota que esta persona tiene (o tenía) una solicitud pendiente.
async function notarSolicitud(grupo, jid) {
  if (!grupo || !jid) return;
  await load();
  const g = store[grupo] || (store[grupo] = {});
  g[canonicalJid(jid)] = Date.now();
  podar(g);
  scheduleSave();
}

// La solicitud se retiró o se rechazó: esa persona ya no está esperando, así
// que si más tarde la mete un admin es un alta a dedo de verdad.
async function olvidarSolicitud(grupo, jid) {
  if (!grupo || !jid) return;
  await load();
  const g = store[grupo];
  if (!g) return;
  delete g[canonicalJid(jid)];
  scheduleSave();
}

// ¿Esta persona estaba esperando aprobación? Se consulta por TODAS sus formas
// conocidas, porque la solicitud pudo registrarse con una y el alta llegar con
// otra. Consume la entrada: una solicitud sirve para una entrada.
async function estabaPendiente(grupo, forms) {
  await load();
  const g = store[grupo];
  if (!g) return false;
  const lista = Array.isArray(forms) ? forms : [forms];
  for (const f of lista) {
    if (!f) continue;
    for (const k of [canonicalJid(f), bareJid(f)]) {
      if (g[k] !== undefined && Date.now() - g[k] < TTL) {
        delete g[k];
        scheduleSave();
        return true;
      }
    }
  }
  return false;
}

// ── Freno por grupo ──────────────────────────────────────────────────────────
//
// El sondeo corre cada pocos minutos y hay grupos que NUNCA van a contestar:
// WhatsApp devuelve `forbidden` cuando el bot no es admin o cuando el grupo no
// tiene activada la aprobación de entradas. Insistir cada tres minutos contra
// eso no arregla nada: llena el log de avisos idénticos y gasta peticiones que
// acaban provocando el `rate-overlimit` que sale al listar los grupos.
//
// Así que cada grupo que falla se aparta un rato:
//   · forbidden / not-authorized → es un ESTADO, no un fallo pasajero. Seis
//     horas, y se levanta antes si el bot recibe admin (lo llama bot.js).
//   · cualquier otro fallo → espera creciente, de un ciclo a una hora.
//
// Y se anota con logger.info, NO con warn. Que no se pueda leer la lista de
// solicitudes de un grupo no rompe nada: el bot sigue funcionando igual y el
// anti-admin simplemente se abstiene de castigar altas ahí, que es lo que ya
// hacía sin lista fresca. Sacarlo por warn llenaba el log de avisos que el
// dueño no tiene que leer ni puede accionar. Con LOG_LEVEL=verbose se ve.
const ESPERA_PROHIBIDO = 6 * 60 * 60 * 1000;
const ESPERA_BASE = 3 * 60 * 1000;
const ESPERA_MAX = 60 * 60 * 1000;
const PROHIBIDO = /forbidden|not-?authorized|unauthorized|\b40[13]\b/i;

const frenados = new Map(); // grupo -> { hasta, fallos }

// Sondea el servidor y anota a todo el que esté esperando. Devuelve cuántos
// había, o null si la consulta falló o el grupo está frenado (y entonces el
// sondeo NO cuenta).
async function sondear(sock, grupo) {
  if (typeof sock?.groupRequestParticipantsList !== 'function') return null;

  const freno = frenados.get(grupo);
  if (freno && Date.now() < freno.hasta) return null;

  let lista;
  try {
    lista = await withTimeout(sock.groupRequestParticipantsList(grupo), TOPE_COLA);
  } catch (e) {
    const msg = e?.message || String(e);
    const prohibido = PROHIBIDO.test(msg);
    const fallos = prohibido ? 1 : (freno?.fallos || 0) + 1;
    const espera = prohibido
      ? ESPERA_PROHIBIDO
      : Math.min(ESPERA_BASE * 2 ** (fallos - 1), ESPERA_MAX);
    // `nuevo` lo consume bot.js para diagnosticar UNA vez por bloqueo por qué
    // este grupo no contesta, que es lo único que no se puede saber desde aquí.
    frenados.set(grupo, { hasta: Date.now() + espera, fallos, prohibido, nuevo: true });
    const mins = Math.round(espera / 60000);
    logger.info(
      prohibido
        ? `joinRequests: ${grupo} no deja leer las solicitudes (${msg}). ` +
          `O no soy admin o el grupo no pide aprobación para entrar. ` +
          `No lo vuelvo a intentar en ${mins} min.`
        : `joinRequests: fallo al leer las solicitudes de ${grupo} (${msg}). Reintento en ${mins} min.`
    );
    return null;
  }

  frenados.delete(grupo);
  for (const p of (lista || [])) {
    const jid = p?.jid || p?.phone_number || p?.lid;
    if (jid) await notarSolicitud(grupo, jid);
  }
  ultimoSondeo.set(grupo, Date.now());
  return (lista || []).length;
}

// ¿Está frenado ahora? Entonces sondear no pregunta nada a WhatsApp.
function estaFrenado(grupo) {
  const freno = frenados.get(grupo);
  return Boolean(freno && Date.now() < freno.hasta);
}

// ¿Se acaba de frenar este grupo? Devuelve el freno la PRIMERA vez que se
// pregunta tras crearlo, y null después. Sirve para explicar el motivo una sola
// vez por bloqueo en lugar de en cada ciclo.
function frenoNuevo(grupo) {
  const f = frenados.get(grupo);
  if (!f?.nuevo) return null;
  f.nuevo = false;
  return f;
}

// Levanta el freno de un grupo. Lo llama bot.js cuando al bot le dan admin
// ahí: es justo el cambio que puede convertir el `forbidden` en una lista.
function reactivarSondeo(grupo) {
  if (frenados.delete(grupo)) {
    logger.info(`joinRequests: vuelvo a sondear ${grupo}`);
  }
}

// ¿Se sabe de verdad quién estaba esperando en este grupo? Si no, quien decide
// castigar debe abstenerse: degradar y expulsar es irreversible.
function sondeoReciente(grupo) {
  const ts = ultimoSondeo.get(grupo);
  return Boolean(ts) && Date.now() - ts < SONDEO_VALIDO_MS;
}

// ¿Se puede saber si un alta salió de la cola de solicitudes?
//
// sondeoReciente NO basta para decidirlo, y usarlo solo apagaba la sanción justo
// donde más clara está. `ultimoSondeo` se marca únicamente cuando la lista se
// lee CON ÉXITO; un grupo que devuelve forbidden entra en un freno de seis horas
// y nunca se marca, así que ahí el anti-admin quedaba desactivado para siempre.
//
// Y forbidden significa dos cosas que no se distinguen desde este fichero:
//
//   · el bot no es admin  → no hay forma de saberlo. Se falla en abierto (no se
//     sanciona), que además da igual: sin admin tampoco puede degradar a nadie.
//   · el bot SÍ es admin  → entonces lo que pasa es que el grupo NO PIDE
//     APROBACIÓN para entrar. No hay cola que consultar, así que meter a alguien
//     solo se puede haber hecho a dedo. Es el caso más claro que existe, y era
//     precisamente el que se estaba perdonando.
//
// Quien llama pasa si el bot es admin, porque eso solo se sabe con la metadata.
function colaConocida(grupo, botEsAdmin) {
  if (sondeoReciente(grupo)) return true;
  const freno = frenados.get(grupo);
  return Boolean(freno?.prohibido && botEsAdmin);
}

async function flushJoinRequests() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (store) {
    try { await atomicWriteJson(FILE, store); }
    catch (e) { logger.error(`joinRequests: fallo al flush: ${e.message}`); }
  }
}

// Solo para pruebas.
function _reset() { store = null; loadPromise = null; ultimoSondeo.clear(); frenados.clear(); }
function _marcarSondeo(grupo, ts = Date.now()) { ultimoSondeo.set(grupo, ts); }
function _frenado(grupo) { return frenados.get(grupo) || null; }

// ACEPTA LAS SOLICITUDES PENDIENTES DE UN GRUPO. Devuelve cuantas aprobo.
//
// SOLO APRUEBA LO QUE YA ESTA PEDIDO. No mete a nadie, no invita, no busca: si
// no hay solicitud, aqui no pasa nada. La diferencia importa — un bot que añade
// gente y uno que aprueba a quien llamo a la puerta no son la misma cosa.
//
// Y AL VETADO SE LE RECHAZA EN LA PUERTA. Aqui ponia lo contrario —que filtrar
// sobraba porque guardOnJoin ya lo echa al entrar, y que costaba una consulta
// por solicitud— y las dos mitades estaban mal.
//
// La del coste, de hecho: `isBanned` no es una consulta, es buscar en un Map
// que ya esta en memoria. No cuesta red ni cuesta disco.
//
// Y la otra es peor. Aprobar a alguien para echarlo medio segundo despues no es
// lo mismo que no dejarle pasar: entra, ve el grupo —quien esta, de que se
// habla, las fotos— y encima el grupo se come el aviso de la expulsion. Con un
// numero ya tachado no hay nada que decidir en la puerta: se rechaza la
// solicitud y no llega a entrar.
//
// guardOnJoin sigue estando, y sigue haciendo falta: por la puerta de las
// solicitudes no se entra siempre —esta el enlace de invitacion y esta que un
// admin te añada a dedo— y eso lo cubre la otra guarda.
//
// ─── TODAS DE UNA VEZ, Y NO ES LO MISMO QUE «TODAS SEGUIDAS» ────────────────
//
// Aqui ponia que aprobar veinte de golpe son veinte llamadas seguidas a
// WhatsApp, y que con una cuenta en revision ese patron no conviene. El
// razonamiento era bueno; la conclusion, no: se iba de UNA EN UNA con segundo y
// medio de pausa y tope de diez por ciclo. Diez solicitudes eran mas de quince
// segundos, y la once esperaba al siguiente sondeo.
//
// Lo que cambia la cuenta es que `groupRequestParticipantsUpdate` acepta una
// LISTA de jids y la manda en UNA sola peticion —lo hace su propio codigo:
// `participants.map(jid => ({ tag: 'participant', attrs: { jid } }))` dentro de
// un unico `groupQuery`, y contesta con el estado de cada uno. O sea que
// aprobar veinte a la vez no son veinte llamadas: es una.
//
// Asi que se mandan todas juntas. La pausa desaparece porque desaparece la
// rafaga que la justificaba, y el tope pasa a ser el tamaño del lote, no del
// ciclo: si hay ochenta pendientes se hacen dos lotes con un respiro corto en
// medio, no ocho ciclos de diez.
const POR_LOTE = 50;
const PAUSA_ENTRE_LOTES = 800;

// DE QUE CAMPO SALE EL JID DE QUIEN PIDE ENTRAR.
//
// groupRequestParticipantsList devuelve los ATRIBUTOS XML EN CRUDO de WhatsApp
// (`participants.map(v => v.attrs)` en Socket/groups.js), no un objeto con
// forma conocida. Yo di por hecho que la clave se llamaba `jid`, y si WhatsApp
// la manda con cualquier otro nombre —y con LID los nombres cambian— se leia
// undefined, se saltaba la solicitud y se reportaban CERO aprobadas sin un solo
// error. Adivinar el nombre de la clave fue el fallo.
//
// Asi que no se adivina: se coge el primer valor que TENGA FORMA DE JID, mirando
// primero los nombres conocidos y despues cualquier atributo. Un JID se
// reconoce solo —lleva @s.whatsapp.net, @lid o @c.us— y ningun otro atributo de
// ese nodo (la hora, el metodo de entrada) se le parece.
function jidDeSolicitud(attrs) {
  if (!attrs || typeof attrs !== 'object') return null;
  const esJid = (v) => typeof v === 'string' && /@(s\.whatsapp\.net|lid|c\.us)$/i.test(v);
  for (const k of ['jid', 'phone_number', 'lid', 'participant', 'user', 'from']) {
    if (esJid(attrs[k])) return attrs[k];
  }
  for (const v of Object.values(attrs)) if (esJid(v)) return v;
  return null;
}

// POR QUE NO SE PUDO APROBAR, APUNTADO PARA LA VPS (16 nov).
//
// Cuando no entraba ninguna, *!autoaccept* le decia al GRUPO «mándale esto a
// quien lleva el bot: `pm2 logs bot … | grep autoaceptar`». Una orden de
// terminal en un chat de WhatsApp, a la vista de todos. El dueño: «¿por qué
// muestras líneas de código en el bot?».
//
// El motivo se guarda aqui —cuantas, que contesto WhatsApp, y los atributos de
// una solicitud que no se entendio— y sale en `npm run estado`, que es donde se
// mira lo interno. En el grupo solo se dice lo que paso, con palabras.
const FILE_FALLOS = path.join(__dirname, '../../data/autoaceptarFallos.json');
const MAX_FALLOS = 30;
let ficheroFallos = FILE_FALLOS;

// En cola: el repaso y *!autoaccept* pueden apuntar a la vez, y leer-sumar-
// escribir en paralelo pierde una de las dos.
let colaFallos = Promise.resolve();
function apuntarFallo(grupo, dato) {
  colaFallos = colaFallos.then(async () => {
    try {
      const previos = await readJsonOrEnoent(ficheroFallos, []);
      const lista = [...(Array.isArray(previos) ? previos : []), { ts: Date.now(), grupo, ...dato }].slice(-MAX_FALLOS);
      await atomicWriteJson(ficheroFallos, lista);
    } catch (e) { logger.warn(`autoaceptar: no pude apuntar el fallo: ${e.message}`); }
  });
  return colaFallos;
}

function fallosAutoaceptar(horas = 24) {
  const desde = Date.now() - horas * 3600000;
  let v = [];
  try { v = JSON.parse(require('fs').readFileSync(ficheroFallos, 'utf8')); } catch { v = []; }
  return (Array.isArray(v) ? v : []).filter((x) => x && x.ts >= desde);
}

async function aceptarPendientes(sock, grupo) {
  if (typeof sock?.groupRequestParticipantsUpdate !== 'function') return null;
  let lista;
  try { lista = await withTimeout(sock.groupRequestParticipantsList(grupo), TOPE_COLA); }
  catch { return null; }
  if (!lista || !lista.length) return { aprobados: 0, sinJid: 0, rechazados: 0 };
  const r = await aprobarLista(sock, grupo, lista);
  // Lo que se queda fuera sin estar vetado ni dentro ya: se apunta el porque.
  if (lista.length - r.rechazados - r.aprobados - (r.yaDentro || 0) > 0) {
    await apuntarFallo(grupo, {
      pendientes: lista.length, aprobados: r.aprobados, yaDentro: r.yaDentro || 0, sinJid: r.sinJid, estados: r.estados, caidos: r.caidos,
      ...(r.muestra ? { muestra: r.muestra } : {}),
    });
  }
  return r;
}

async function aprobarLista(sock, grupo, lista) {
  let aprobados = 0, sinJid = 0, yaDentro = 0;
  let muestra = null;
  const porMirar = [];  // [jid, estado] con 409: ¿ya está dentro?
  const estados = {};   // lo que contesto WhatsApp por solicitud, si no fue 200
  const caidos = [];    // lotes enteros que fallaron, con el mensaje
  const jids = [];
  const formasPor = new Map();  // jid usado -> todas las formas que trae la solicitud
  const attrsPor = new Map();   // jid usado -> la solicitud tal cual, para estado
  for (const p of lista) {
    const jid = jidDeSolicitud(p);
    if (!jid) {
      // Si aun asi no se encuentra, se dice CON EL SOBRE DELANTE. Callarse aqui
      // es lo que convirtio esto en "no acepta y no se sabe por que".
      sinJid++;
      if (!muestra) muestra = p;
      logger.warn(`autoaceptar: solicitud sin JID reconocible en ${grupo}. Atributos: ${JSON.stringify(p)}`);
      continue;
    }
    jids.push(jid);
    formasPor.set(jid, formasSolicitud(p));
    attrsPor.set(jid, p);
  }

  // ─── LOS TACHADOS NO PASAN LA PUERTA ──────────────────────────────────────
  //
  // Se parte la cola en dos y se manda cada mitad con su accion. Rechazar va en
  // lotes igual que aprobar, por el mismo motivo: una sola peticion por lote.
  const vetados = [];
  const limpios = [];
  for (const jid of jids) {
    // Las dos formas: la solicitud trae una sola, y la lista negra guarda
    // telefono y LID por separado. Sin canonicalJid, un vetado que pide entrar
    // con la forma que no se guardo pasa como si nada.
    const formas = [...new Set([jid, ...(formasPor.get(jid) || [])].flatMap((f) => [bareJid(f), canonicalJid(f)]).filter(Boolean))];
    const veto = await isBanned(formas).catch(() => null);
    if (veto) vetados.push(jid); else limpios.push(jid);
  }

  let rechazados = 0;
  for (let i = 0; i < vetados.length; i += POR_LOTE) {
    const lote = vetados.slice(i, i + POR_LOTE);
    try {
      await sock.groupRequestParticipantsUpdate(grupo, lote, 'reject');
      rechazados += lote.length;
      for (const jid of lote) await olvidarSolicitud(grupo, jid);
      logger.warn(`autoaceptar: ${lote.length} solicitud(es) rechazadas en ${grupo} por estar en la lista negra`);
    } catch (e) {
      // Que no se pueda rechazar no puede convertirse en aprobar: se quedan
      // pendientes y guardOnJoin los recoge si llegan a entrar por otra via.
      logger.warn(`autoaceptar: no pude rechazar el lote de ${lote.length} en ${grupo}: ${e.message}`);
    }
    if (i + POR_LOTE < vetados.length) await new Promise((r) => setTimeout(r, PAUSA_ENTRE_LOTES));
  }

  if (!limpios.length) return { aprobados, sinJid, rechazados, yaDentro, estados, caidos, muestra };

  for (let i = 0; i < limpios.length; i += POR_LOTE) {
    const lote = limpios.slice(i, i + POR_LOTE);
    let res = null;
    try {
      res = await sock.groupRequestParticipantsUpdate(grupo, lote, 'approve');
    } catch (e) {
      logger.warn(`autoaceptar: no pude aprobar el lote de ${lote.length} en ${grupo}: ${e.message}`);
      caidos.push(String(e.message || e).slice(0, 160));
      continue;
    }
    // Lo que contesta WhatsApp, por persona (ver leerEstados).
    const fallidas = [];
    for (const [jid, estado] of leerEstados(lote, res)) {
      if (estado === '200') { aprobados++; await olvidarSolicitud(grupo, jid); }
      else fallidas.push([jid, estado]);
    }

    // CON LA OTRA FORMA DE LA PERSONA (16 nov). Cada solicitud trae el @lid y
    // el telefono (`jid` y `phone_number`), y Baileys aprueba mandando solo
    // uno. Si WhatsApp rechaza esa forma, se prueba con la otra, en un solo
    // lote. Lo que siga fallando es lo que se apunta.
    const conOtra = [];
    for (const [jid, estado] of fallidas) {
      const otra = (formasPor.get(jid) || []).find((f) => bareJid(f) !== bareJid(jid));
      if (otra) conOtra.push([jid, otra, estado]);
      else anotarFallida(jid, estado);
    }
    if (conOtra.length) {
      let res2 = null;
      try { res2 = await sock.groupRequestParticipantsUpdate(grupo, conOtra.map(([, otra]) => otra), 'approve'); }
      catch (e) { caidos.push(String(e.message || e).slice(0, 160)); }
      const segundo = new Map(res2 ? leerEstados(conOtra.map(([, otra]) => otra), res2) : []);
      for (const [jid, otra, estado] of conOtra) {
        const e2 = segundo.get(otra);
        if (e2 === '200') {
          aprobados++;
          await olvidarSolicitud(grupo, jid);
          logger.warn(`autoaceptar: aprobada en ${grupo} con su otra forma (${otra}); con ${jid} WhatsApp dio ${estado}`);
        } else anotarFallida(jid, `${estado}${e2 ? `/${e2}` : ''}`);
      }
    }
    if (i + POR_LOTE < limpios.length) await new Promise((r) => setTimeout(r, PAUSA_ENTRE_LOTES));
  }

  // EL 409 DE QUIEN YA ESTA DENTRO (16 nov). En el grupo del dueño quedaba una
  // solicitud que WhatsApp seguía listando y que al aprobarla contestaba 409,
  // con el @lid y con el teléfono: es de alguien que ya es miembro (su móvil
  // enseñaba 1 solicitud y el bot veía más). Eso no es un fallo y no se dice
  // como fallo: se mira la lista de miembros una vez y, si está, cuenta como
  // resuelta.
  if (porMirar.length) {
    let dentro = new Set();
    try {
      if (typeof sock.groupMetadata === 'function') {
        const meta = await withTimeout(sock.groupMetadata(grupo), TOPE_COLA);
        for (const p of meta?.participants || []) {
          for (const f of [p?.id, p?.lid, p?.phoneNumber]) if (f) dentro.add(bareJid(f));
        }
      }
    } catch { dentro = new Set(); }
    for (const [jid, estado] of porMirar) {
      const formas = [jid, ...(formasPor.get(jid) || [])].map((f) => bareJid(f));
      if (formas.some((f) => dentro.has(f))) {
        yaDentro++;
        await olvidarSolicitud(grupo, jid);
        logger.info(`autoaceptar: la solicitud de ${jid} en ${grupo} es de alguien que ya está dentro (WhatsApp da ${estado})`);
      } else registrarFallida(jid, estado);
    }
  }
  return { aprobados, sinJid, rechazados, yaDentro, estados, caidos, muestra };

  function anotarFallida(jid, estado) {
    if (/^409/.test(String(estado))) { porMirar.push([jid, estado]); return; }
    registrarFallida(jid, estado);
  }
  function registrarFallida(jid, estado) {
    estados[estado] = (estados[estado] || 0) + 1;
    if (!muestra) muestra = attrsPor.get(jid) || null;
    logger.warn(`autoaceptar: WhatsApp rechazo aprobar a ${jid} en ${grupo} (status ${estado})`);
  }
}

// WhatsApp NO lanza cuando rechaza: devuelve el error dentro del status, uno
// por participante. Contarlos todos como aprobados seria mentir en el recuento.
// La respuesta se cruza POR JID cuando lo trae, y por posicion cuando no:
// Baileys devuelve `{ status, jid }` por participante y en el mismo orden, pero
// el jid puede volver en otra forma (lid contra telefono).
function leerEstados(lote, res) {
  const filas = Array.isArray(res) ? res : [];
  return lote.map((jid, k) => {
    const fila = filas.find((f) => f?.jid === jid) || filas[k];
    return [jid, String(fila?.status ?? (filas.length ? '?' : '200'))];
  });
}

// Todas las formas de la persona que trae una solicitud: el `jid` y lo que
// venga en `phone_number`, `lid` u otro atributo con forma de JID.
function formasSolicitud(attrs) {
  const esJid = (v) => typeof v === 'string' && /@(s\.whatsapp\.net|lid|c\.us)$/i.test(v);
  return [...new Set(Object.values(attrs || {}).filter(esJid))];
}

module.exports = {
  aceptarPendientes, jidDeSolicitud, fallosAutoaceptar,
  _usarFicheroFallos: (f) => { ficheroFallos = f || FILE_FALLOS; },
  notarSolicitud, olvidarSolicitud, estabaPendiente, sondear, sondeoReciente, colaConocida,
  reactivarSondeo, frenoNuevo, estaFrenado, flushJoinRequests, SONDEO_VALIDO_MS,
  _reset, _marcarSondeo, _frenado,
};
