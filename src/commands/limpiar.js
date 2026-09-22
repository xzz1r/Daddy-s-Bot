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
const { SOLO_GRUPOS } = require('../data/avisos');
const { aviso } = require('../utils/helpers');
const logger = require('../utils/logger');
const hist = require('../utils/historialGrupo');

const MAX = 1000;

// LOS BORRADOS SALEN EN LOTES, NO TODOS DE GOLPE.
//
// Antes se hacia `Promise.allSettled(items.map(...))`: con *!limpiar 300* eso
// son 301 escrituras cifradas al socket EN EL MISMO TICK. Medido en banco con
// 300 mensajes: pico de 301 borrados simultaneos. En una VPS de un nucleo y
// 1 GB eso es el pico que se nota, y WhatsApp responde a la reventa de la cola
// con rate-overlimit — o sea que la prisa hacia que se borrara MENOS.
//
// 20 por lote esta elegido a proposito: el uso normal es *!limpiar 20*, y eso
// cabe entero en el primer lote. Quien borra poco no espera nada; el que pide
// 300 paga 250 ms cada 20. Los primeros salen igual de rapido que antes, que
// era el motivo de no esperar al historial.
const POR_LOTE = 20;
const PAUSA_ENTRE_LOTES = 250;

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

// Devuelve CUANTOS SE BORRARON DE VERDAD, sin contar los ids de `sinContar`
// (ahi va el propio *!limpiar*, que se borra pero no lo pidio nadie).
//
// Que devuelva el numero real no es un detalle: antes se daba por hecho que
// todo lo enviado se habia borrado, y `allSettled` se traga los fallos. Con la
// racha de rate-overlimit de arriba, el banco dio 200 borrados de 300 y el bot
// no dijo ni una palabra. Es la misma regla que ya esta escrita en
// joinRequests: contarlos todos como hechos seria mentir en el recuento.
//
// El que falla NO se quita de la cola (`quitar` solo corre en el `then`), asi
// que sigue ahi y una segunda pasada lo alcanza.
async function dispararBorrados(sock, jid, items, sinContar) {
  if (!items.length) return 0;
  const saltar = sinContar instanceof Set ? sinContar : new Set(sinContar || []);
  let hechos = 0;
  for (let i = 0; i < items.length; i += POR_LOTE) {
    const lote = items.slice(i, i + POR_LOTE);
    const res = await Promise.allSettled(lote.map((item) =>
      sock.sendMessage(jid, { delete: claveBorrado(sock, item) })
        .then(() => { hist.quitar(jid, item.id); })
        .catch((e) => {
          logger.warn(`limpiar: no pude borrar ${item.id} en ${jid}: ${e?.output?.content?.[0]?.attrs?.type || e?.message || e}`);
          throw e;
        })
    ));
    for (let k = 0; k < lote.length; k++) {
      if (res[k].status === 'fulfilled' && !saltar.has(lote[k].id)) hechos++;
    }
    if (i + POR_LOTE < items.length) {
      await new Promise((r) => setTimeout(r, PAUSA_ENTRE_LOTES));
    }
  }
  return hechos;
}

let trabajo = Promise.resolve();
function _esperar() { return trabajo; }

async function cmdLimpiar(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) return;
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

  // El propio *!limpiar* se borra, pero no lo pidio nadie: fuera del recuento.
  const sinContar = cmdId ? new Set([cmdId]) : new Set();

  enCurso.add(jid);
  // Arranca YA y sin await: el primer lote sale en este mismo tick. La promesa
  // se guarda porque es la que trae el numero REAL de borrados.
  const primera = dispararBorrados(sock, jid, items, sinContar);
  const faltan = n - ya.length;

  trabajo = (async () => {
    let hechos = 0;
    try {
      hechos += await primera;
      // Al historial solo se va si lo que habia en RAM no llegaba. Y se va
      // DESPUES de haber borrado lo de arriba, no antes.
      if (faltan > 0) {
        const mas = await hist.reunir(sock, jid, n, cmdId ? [cmdId] : [], ancla);
        const yaIds = new Set(items.map((i) => i.id));
        const extra = mas.filter((x) => !yaIds.has(x.id));
        if (extra.length) hechos += await dispararBorrados(sock, jid, extra, sinContar);
      }
    } catch (e) {
      logger.warn(`limpiar: historial ${jid}: ${e.message}`);
    } finally {
      enCurso.delete(jid);
    }

    // SI SE QUEDA CORTO, SE DICE. Y EL NUMERO ES EL DE VERDAD.
    //
    // El silencio al salir bien es a proposito —un "listo, borre 20" es otro
    // mensaje que hay que borrar despues— pero eso solo vale cuando se ha hecho
    // lo que se pidio. Pedir 200 y borrar 12 sin abrir la boca se lee como que
    // funciono, y quien lo escribio se queda pensando que el grupo esta limpio.
    //
    // `hechos` sale de contar los envios que WhatsApp acepto, uno a uno. La
    // primera version de este aviso conto los INTENTOS y por eso callaba: en el
    // banco, con 100 borrados rechazados de 300, le salia la cuenta redonda y
    // no abria la boca. Es el mismo fallo que ya se corrigio en las
    // expulsiones y en el antilink: el bot no da por hecho un resultado que no
    // ha comprobado.
    //
    // Lo que fallo sigue en la cola, asi que repetir el comando lo alcanza.
    if (hechos < n) {
      await sock.sendMessage(jid, {
        text: `Borrados *${hechos}* de ${n}. El resto no lo tengo o WhatsApp no me dejó; repite el comando si quieres que insista.`,
      }).catch(() => {});
    }
  })();
}

module.exports = {
  cmdLimpiar, claveBorrado, MAX,
  _enCurso: enCurso, _esperar,
};
