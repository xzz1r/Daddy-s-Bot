'use strict';

const { bareJid } = require('./wa');

// Por qué entró alguien al grupo.
//
// Baileys COLAPSA en un mismo `action: 'add'` tres cosas muy distintas
// (Utils/process-message.js:521-529):
//
//   GROUP_PARTICIPANT_ADD (27)              → un admin lo añadió a dedo
//   GROUP_PARTICIPANT_INVITE (31)           → entró por enlace de invitación
//   GROUP_PARTICIPANT_ADD_REQUEST_JOIN (71) → un admin ACEPTÓ su solicitud
//
// El evento group-participants.update no lleva el motivo, así que el anti-admin
// trataba las tres igual: una admin aceptaba una solicitud de entrada y. el bot
// la degradaba a ella y expulsaba al recién aceptado. Aceptar solicitudes es
// justamente para lo que se da admin.
//
// El motivo sí viaja en el mensaje de sistema, en messageStubType. Y hay que
// ESPERARLO, no consultarlo y ya: `messages.upsert` pasa por el búfer de eventos
// y `group-participants.update` no (Utils/event-buffer.js:6-19), así que el
// evento de participantes llega normalmente ANTES que el stub.

const ALTA_ADD       = 27;
const ALTA_INVITE    = 31;
const ALTA_SOLICITUD = 71;

const TTL = 60_000;
const MAX = 500;

const altas = new Map();     // `${grupo}|${miembro}` -> { tipo, ts }
const esperando = new Map(); // misma clave -> [resolve]

// Anota el motivo que trae un mensaje de sistema. Se le pasan TODOS los
// mensajes; los que no son un alta se ignoran.
function anotarAlta(msg) {
  const tipo = msg?.messageStubType;
  if (tipo !== ALTA_ADD && tipo !== ALTA_INVITE && tipo !== ALTA_SOLICITUD) return;
  const grupo = msg.key?.remoteJid;
  if (!grupo || !grupo.endsWith('@g.us')) return;

  for (const raw of (msg.messageStubParameters || [])) {
    // Los parámetros son objetos JSON del participante; en versiones viejas
    // venía el JID a pelo.
    let id = null;
    try {
      const o = JSON.parse(raw);
      id = o?.id || o?.phoneNumber || o?.lid || null;
    } catch {
      id = (typeof raw === 'string' && raw.includes('@')) ? raw : null;
    }
    if (!id) continue;

    const k = `${grupo}|${bareJid(id)}`;
    if (altas.size >= MAX && !altas.has(k)) altas.delete(altas.keys().next().value);
    altas.set(k, { tipo, ts: Date.now() });

    const pend = esperando.get(k);
    if (pend) {
      esperando.delete(k);
      for (const r of pend) r(tipo);
    }
  }
}

// Espera hasta `ms` a saber por qué entró `jid`. Devuelve el tipo, o null si no
// se pudo averiguar. Quien llame debe tratar el null como "no se sabe" y NO
// como "alta a dedo": degradar y expulsar es irreversible.
function motivoDelAlta(grupo, jid, ms = 5000) {
  const k = `${grupo}|${bareJid(jid)}`;
  const ya = altas.get(k);
  if (ya && Date.now() - ya.ts < TTL) return Promise.resolve(ya.tipo);

  return new Promise((resolve) => {
    const lista = esperando.get(k) || [];
    lista.push(resolve);
    esperando.set(k, lista);
    setTimeout(() => {
      const l = esperando.get(k);
      if (!l) return;
      const i = l.indexOf(resolve);
      if (i >= 0) l.splice(i, 1);
      if (!l.length) esperando.delete(k);
      resolve(null);
    }, ms);
  });
}

// Solo para pruebas.
function _reset() { altas.clear(); esperando.clear(); }

module.exports = { anotarAlta, motivoDelAlta, ALTA_ADD, ALTA_INVITE, ALTA_SOLICITUD, _reset };
