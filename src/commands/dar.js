const { getSender, getTarget, sameUser, isOwner, isMainOwner, isBotJid } = require('../utils/wa');
const { transferAura, flushAura, addAura } = require('../utils/auraStore');
const { fmt, parseCantidad, avisoPermiso } = require('../utils/helpers');
const { aportarAlBote } = require('../utils/roboStore');
const logger = require('../utils/logger');
const { lineaAura, nombresCortos } = require('../utils/formatoJuego');

// El minimo y el impuesto viven en utils/economia.js con el resto de la escala.
const { REGALO_MIN: GIFT_MIN, IMPUESTO, impuestoDe } = require('../utils/economia');
const { A_TI_MISMO, SOLO_GRUPOS } = require('../data/avisos');
const { aviso } = require('../utils/helpers');

// ─── AL DUEÑO NO SE LE DA AURA ───────────────────────────────────────────────
//
// Lo pidio el dueño (23 oct): «haz que yo pueda dar aura, pero que nadie me
// pueda dar aura a mi». Vale para *!dar* y para *!premiar* de un co-dueño; el
// dueño sigue dando lo que quiera, y para el mismo esta *!premiaryo*. Solo el
// dueño (isMainOwner), no los co-dueños. Ni «dueño» en el texto (capa 27).
const NO_SE_LE_DA = 'A este usuario no se le puede dar aura.';
const aDuenoAjeno = (sender, fromMe, target, groupMeta) =>
  isMainOwner(target, false, groupMeta) && !isMainOwner(sender, fromMe, groupMeta);

async function cmdDar(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
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
    return sock.sendMessage(jid, { text: aviso(A_TI_MISMO, jid, 'yo') }, { quoted: msg });
  }
  if (aDuenoAjeno(sender, msg.key.fromMe, target, groupMeta)) {
    return sock.sendMessage(jid, { text: NO_SE_LE_DA }, { quoted: msg });
  }

  const parsed = parseCantidad(args);
  const amount = parsed.valor;
  if (!amount) {
    return sock.sendMessage(jid, { text: 'Indica una cantidad: *!dar @user 100*' }, { quoted: msg });
  }
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
  //
  // Y el aura se vuelca antes que el bote: robo.json se guarda antes que
  // aura.json, y un corte en medio dejaria el impuesto en el bote con la
  // transferencia sin apuntar. Sigue sin bloquear la respuesta.
  if (alBote > 0) {
    flushAura().catch(() => {}).then(() => aportarAlBote(jid, alBote))
      .catch((e) => logger.unaVez('dar: impuesto al bote', e));
  }

  const sTag = `@${sender.split('@')[0]}`;
  const tTag = `@${target.split('@')[0]}`;

  // Las menciones en el titular; los saldos en una linea con el nombre corto,
  // y sin lineas en blanco. Ver nombresCortos en utils/formatoJuego.js.
  const [sNom, tNom] = await nombresCortos(sender, target);
  await sock.sendMessage(jid, {
    text:
      `*TRANSFERENCIA DE AURA* · ${sTag} le pasa *${fmt(amount)}* a ${tTag}\n` +
      `${lineaAura(sNom, -cargo, result.fromNew)} · ${lineaAura(tNom, amount, result.toNew)}\n` +
      `_Impuesto: *${fmt(impuesto)}*` +
      (alBote > 0 ? `, y *${fmt(alBote)}* se van al bote._` : '._'),
    mentions: [sender, target],
  }, { quoted: msg });
}

// ─── !premiar: AURA NUEVA, DE LOS DUEÑOS ─────────────────────────────────────
//
// Lo pidio el dueño (11 oct), a peticion del co-dueño: un comando que da el
// aura que se pida. No es *!dar*: no sale del saldo de nadie, se crea. Por eso
// solo lo usan el dueño y los co-dueños (isOwner).
//
// Y NO ES SECRETO, a proposito: «la idea es que las personas sepan quien puede
// regalarle aura». Sale en el menu de todos, y el mensaje dice quien la da.
//
// El tope esta para que un cero de mas al escribir no rompa la economia de un
// golpe: un millón por vez sobra para cualquier premio.
const PREMIO_MAX = 1000000;

//
// En el menu va bajo *ADMINS PREMIUM*, que es como el dueño quiere que se llame
// el tier (11 oct). Y asi se le nombra tambien en el mensaje: «el dueño» no sale
// por WhatsApp (capa 27).
async function cmdPremiar(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: avisoPermiso(jid, sender, groupMeta) }, { quoted: msg });
  }
  const target = getTarget(msg);
  if (!target) {
    return sock.sendMessage(jid, { text: 'Menciona a quién le das el aura: *!premiar @alguien 500*' }, { quoted: msg });
  }
  if (isBotJid(sock, target)) {
    return sock.sendMessage(jid, { text: 'Al bot no le hace falta aura.' }, { quoted: msg });
  }
  if (aDuenoAjeno(sender, msg.key.fromMe, target, groupMeta)) {
    return sock.sendMessage(jid, { text: NO_SE_LE_DA }, { quoted: msg });
  }
  const amount = parseCantidad(args).valor;
  if (!amount || amount < 1) {
    return sock.sendMessage(jid, { text: 'Indica cuánta: *!premiar @alguien 500*' }, { quoted: msg });
  }
  if (amount > PREMIO_MAX) {
    return sock.sendMessage(jid, { text: `Como mucho *${fmt(PREMIO_MAX)}* de una vez.` }, { quoted: msg });
  }

  const { current } = await addAura(jid, target, amount);
  const sTag = `@${sender.split('@')[0]}`;
  const tTag = `@${target.split('@')[0]}`;
  logger.info(`premiar: ${sender} da ${amount} de aura a ${target} en ${jid}`);
  return sock.sendMessage(jid, {
    text:
      `*REGALO DE AURA*\n\n` +
      `${sTag} le regala *${fmt(amount)} de aura* a ${tTag}\n\n` +
      `${lineaAura(tTag, amount, current)}\n\n` +
      `_Aura nueva: no sale del saldo de nadie. Solo la pueden dar los admins premium._`,
    mentions: [...new Set([sender, target])],
  }, { quoted: msg });
}

// *!premiaryo* <cant.>: el tier dueño se da aura a si mismo, sin mencionarse.
//
// OCULTO, lo pidio el dueño (11 oct). No sale en el menu ni en el «¿querias
// decir?» (COMANDOS_OCULTOS), a quien no es del tier no le contesta NADA —un
// «no tienes permiso» confirmaria que existe— y la respuesta es una linea sin
// cabecera ni mencion, que no llama la atencion.
//
// Vale tambien por privado. El aura es la misma en todos los grupos, asi que
// darsela ahi la da en todos, y no lo ve nadie.
async function cmdPremiarYo(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) return;
  const amount = parseCantidad(args).valor;
  if (!amount || amount < 1 || amount > PREMIO_MAX) {
    return sock.sendMessage(jid, { text: `Indica cuánta, hasta *${fmt(PREMIO_MAX)}*: *!premiaryo 500*` }, { quoted: msg });
  }
  const { current } = await addAura(jid, sender, amount);
  logger.info(`premiaryo: ${sender} se da ${amount} de aura`);
  return sock.sendMessage(jid, { text: lineaAura('', amount, current) }, { quoted: msg });
}

module.exports = { cmdDar, cmdPremiar, cmdPremiarYo, PREMIO_MAX, NO_SE_LE_DA };
