const { getSender, getTarget, sameUser } = require('../utils/wa');
const { transferAura } = require('../utils/auraStore');
const { fmt } = require('../utils/helpers');
const { aportarAlBote } = require('../utils/roboStore');

// El minimo y el impuesto viven en utils/economia.js con el resto de la escala.
const { REGALO_MIN: GIFT_MIN, IMPUESTO, impuestoDe } = require('../utils/economia');

async function cmdDar(sock, msg, args) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);
  const target = getTarget(msg);

  if (!target) {
    return sock.sendMessage(jid, {
      text: 'Menciona a quién le das: *!dar @alguien 100*',
    }, { quoted: msg });
    // eslint-disable-next-line no-unreachable
  }
  if (sameUser(target, sender)) {
    return sock.sendMessage(jid, { text: 'No puedes darte aura a ti mismo.' }, { quoted: msg });
  }

  const amountArg = (args || []).find(a => /^\d+$/.test(a));
  if (!amountArg) {
    return sock.sendMessage(jid, { text: 'Indica una cantidad: *!dar @user <cantidad>*' }, { quoted: msg });
  }
  const amount = parseInt(amountArg, 10);
  if (amount < GIFT_MIN) {
    return sock.sendMessage(jid, {
      text: `Mínimo *${GIFT_MIN}* de aura por transferencia.`,
    }, { quoted: msg });
  }

  // El impuesto lo paga QUIEN DA, encima de la cantidad. Asi quien recibe cobra
  // siempre exactamente lo que se anuncio — que es lo unico que hace que el
  // minimo de 1 funcione: descontandolo de lo enviado, un regalo de 1 llegaria
  // como 0 y el comando estaria roto justo en el caso mas pedido.
  const impuesto = impuestoDe(amount);
  const cargo = amount + impuesto;

  // Atomic check-and-transfer: both the balance check and the debit/credit happen
  // in a single serialized operation, so concurrent !dar commands can't double-spend.
  // Se cobra el total y se abona solo la cantidad: la diferencia vuelve como
  // `retenido` y es la recaudacion.
  const result = await transferAura(jid, sender, target, cargo, amount);
  if (!result.ok) {
    return sock.sendMessage(jid, {
      text: `Mandar *${fmt(amount)}* cuesta *${fmt(cargo)}* con el impuesto. Tienes *${fmt(result.fromCurrent)}*.`,
    }, { quoted: msg });
  }

  // La mitad de lo recaudado engorda el bote comun y la otra mitad se destruye.
  // Va DESPUES de la transferencia y sin bloquearla: si el bote fallara al
  // escribir, el aura ya ha cambiado de manos correctamente y lo unico que se
  // pierde es que esa parte se destruya tambien, que es el lado seguro del
  // error — nunca se crea aura de la nada por un fallo de disco.
  const alBote = Math.round(result.retenido * IMPUESTO.alBote);
  if (alBote > 0) aportarAlBote(jid, alBote).catch(() => {});

  const sTag = `@${sender.split('@')[0]}`;
  const tTag = `@${target.split('@')[0]}`;

  await sock.sendMessage(jid, {
    text:
      `*TRANSFERENCIA DE AURA*\n\n` +
      `${sTag} le pasa *${fmt(amount)} de aura* a ${tTag}\n\n` +
      `${sTag}  −${fmt(cargo)} → *${fmt(result.fromNew)}*\n` +
      `${tTag}  +${fmt(amount)} → *${fmt(result.toNew)}*\n\n` +
      `_Impuesto de transferencia: *${fmt(impuesto)}*` +
      (alBote > 0 ? `, y *${fmt(alBote)}* se van al bote.` : '.') + `_`,
    mentions: [sender, target],
  }, { quoted: msg });
}

module.exports = { cmdDar };
