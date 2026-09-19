'use strict';

// !limpiar N — borra los últimos N mensajes del grupo PARA TODOS.
//
// WhatsApp no deja vaciar un chat entero. Lo que sí deja es el borrado de
// admin, el mismo que usa !del: un mensaje por uno, `edit=8`. Este comando
// encadena esos borrados sobre lo que el bot ha visto desde el último
// arranque (ver utils/historialGrupo.js).
//
// A diferencia de !del, AQUÍ NO SE SALTA AL TIER DUEÑO. El dueño pidió
// borrar también lo suyo. Por eso la puerta es isOwner: un admin raso no
// puede ir borrando los mensajes del dueño en bloque, que es justo lo que
// !del le impide hacer de uno en uno.
//
// SILENCIO SI SALE BIEN. Un "listo, borré 20" es otro mensaje que luego hay
// que borrar, y el grupo ya ve cómo desaparecen. Se contesta solo cuando
// no se puede: mal número, no soy admin, no hay nada reciente.

const config = require('../config');
const { isOwner, isBotAdmin, getSender, bareJid } = require('../utils/wa');
const { SIN_PERMISO, SOLO_GRUPOS } = require('../data/avisos');
const { aviso } = require('../utils/helpers');
const logger = require('../utils/logger');
const hist = require('../utils/historialGrupo');

const MAX = 100;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let PAUSA_MS = 150;

const enCurso = new Set();

function esFreno(err) {
  const s = String(err?.output?.content?.[0]?.attrs?.type || err?.message || err || '');
  return /rate-overlimit|not-acceptable|429|try again/i.test(s);
}

// Siempre fromMe=false. En Baileys eso es lo que pone edit=8 (para todos)
// cuando el destino es un grupo. fromMe=true se convierte en edit=7 y el
// mensaje solo desaparece del teléfono del bot.
function claveBorrado(sock, item) {
  let participant = item.participant;
  if (!participant) {
    const lid = sock.user?.lid;
    const id = sock.user?.id;
    participant = (item.addressingMode === 'lid' && lid) ? lid : id;
  }
  const deleteKey = {
    remoteJid: item.remoteJid,
    fromMe: false,
    id: item.id,
  };
  if (participant) deleteKey.participant = bareJid(participant);
  return deleteKey;
}

async function borrarUno(sock, item) {
  await sock.sendMessage(item.remoteJid, { delete: claveBorrado(sock, item) });
}

async function cmdLimpiar(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SIN_PERMISO, jid, 'permiso') }, { quoted: msg });
  }
  if (!isBotAdmin(sock, groupMeta)) {
    return sock.sendMessage(jid, { text: 'No soy admin aquí. Así no puedo borrar nada.' }, { quoted: msg });
  }

  const bruto = String(args?.[0] || '').trim();
  if (!/^[1-9]\d*$/.test(bruto)) {
    return sock.sendMessage(jid, {
      text: `Cuántos. *${config.prefix}limpiar 20*`,
    }, { quoted: msg });
  }
  const n = Number.parseInt(bruto, 10);
  if (n > MAX) {
    return sock.sendMessage(jid, { text: `El tope es ${MAX}.` }, { quoted: msg });
  }

  if (enCurso.has(jid)) {
    return sock.sendMessage(jid, { text: 'Ya estoy limpiando este chat.' }, { quoted: msg });
  }

  const cmdId = msg.key.id;
  const lista = hist.tomar(jid, n, cmdId ? [cmdId] : []);
  if (!lista.length) {
    return sock.sendMessage(jid, {
      text: 'No hay nada reciente que borrar. Solo cuento lo que he visto desde el último arranque.',
    }, { quoted: msg });
  }

  enCurso.add(jid);
  try {
    // El comando, primero: si tarda en los demás, al menos no se queda
    // *!limpiar 40* a la vista mientras van cayendo.
    if (cmdId) {
      try {
        await borrarUno(sock, {
          id: cmdId,
          participant: sender,
          remoteJid: jid,
          addressingMode: msg.key.addressingMode || '',
        });
        hist.quitar(jid, cmdId);
      } catch (e) {
        logger.warn(`limpiar: no pude borrar el comando en ${jid}: ${e?.message || e}`);
      }
    }

    // Del más nuevo al más viejo: lo último que se ve es lo primero que se va.
    const orden = lista.slice().reverse();
    let ok = 0;
    for (const item of orden) {
      try {
        await borrarUno(sock, item);
        hist.quitar(jid, item.id);
        ok++;
      } catch (e) {
        logger.warn(`limpiar: no pude borrar ${item.id} en ${jid}: ${e?.output?.content?.[0]?.attrs?.type || e?.message || e}`);
        if (esFreno(e)) break;
      }
      if (PAUSA_MS) await espera(PAUSA_MS);
    }
    logger.info(`limpiar en ${jid}: ${ok}/${orden.length}`);
  } finally {
    enCurso.delete(jid);
  }
}

module.exports = {
  cmdLimpiar, claveBorrado, MAX,
  _setPausa: (ms) => { PAUSA_MS = ms; },
  _enCurso: enCurso,
};
