'use strict';

// !limpiar N — borra los últimos N mensajes del grupo PARA TODOS.
//
// WhatsApp no deja vaciar un chat entero. Lo que sí deja es el borrado de
// admin, el mismo que usa !del: un mensaje por uno, `edit=8`. Si el bot no
// tiene N claves en RAM, se las pide al teléfono (el historial de ANTES,
// no solo lo de esta sesión). Ver utils/historialGrupo.js.
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

const MAX = 1000;

const enCurso = new Set();

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

function dispararBorrados(sock, jid, items) {
  if (!items.length) return Promise.resolve();
  return Promise.allSettled(items.map((item) =>
    sock.sendMessage(jid, { delete: claveBorrado(sock, item) })
      .then(() => { hist.quitar(jid, item.id); })
      .catch((e) => {
        logger.warn(`limpiar: no pude borrar ${item.id} en ${jid}: ${e?.output?.content?.[0]?.attrs?.type || e?.message || e}`);
      })
  ));
}

let trabajo = Promise.resolve();
function _esperar() { return trabajo; }

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
  hist.recordar(msg);
  const ancla = {
    id: cmdId,
    participant: sender,
    remoteJid: jid,
    fromMe: Boolean(msg.key.fromMe),
    ts: Number(typeof msg.messageTimestamp?.toNumber === 'function'
      ? msg.messageTimestamp.toNumber()
      : msg.messageTimestamp) || Math.floor(Date.now() / 1000),
    addressingMode: msg.key.addressingMode || '',
    key: msg.key,
  };

  // Lo que YA tenemos se borra YA. No se espera al historial: esa espera
  // convertía *!limpiar* en un comando mudo de 20 s que encima no borraba
  // lo viejo, porque WhatsApp a menudo no suelta el on-demand.
  const ya = hist.tomar(jid, n, cmdId ? [cmdId] : []);
  const items = [];
  if (cmdId) {
    items.push({
      id: cmdId,
      participant: sender,
      remoteJid: jid,
      addressingMode: msg.key.addressingMode || '',
      key: msg.key,
    });
  }
  items.push(...ya.slice().reverse());

  enCurso.add(jid);
  dispararBorrados(sock, jid, items);

  const faltan = n - ya.length;
  if (faltan <= 0) {
    enCurso.delete(jid);
    return;
  }

  trabajo = (async () => {
    try {
      const mas = await hist.reunir(sock, jid, n, cmdId ? [cmdId] : [], ancla);
      const yaIds = new Set(items.map((i) => i.id));
      const extra = mas.filter((x) => !yaIds.has(x.id));
      if (extra.length) dispararBorrados(sock, jid, extra);
    } catch (e) {
      logger.warn(`limpiar: historial ${jid}: ${e.message}`);
    } finally {
      enCurso.delete(jid);
    }
  })();
}

module.exports = {
  cmdLimpiar, claveBorrado, MAX,
  _enCurso: enCurso, _esperar,
};
