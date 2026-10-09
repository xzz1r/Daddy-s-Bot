const { isOwner, isMainOwner, isAdmin, getSender, getTarget, bareJid, sameUser, canonicalJid } = require('../utils/wa');
const { pickFresh, fmt, parseCantidad, resolverCantidad } = require('../utils/helpers');
const { getAura, transferAura } = require('../utils/auraStore');
const { ownerGana } = require('../utils/rigOwner');
const { lineaAura } = require('../utils/formatoJuego');
const rencor = require('../utils/rencor');

// Resolve a JID to its canonical form (preferring phone-JID) using the group
// participant list. Fixes LID vs phone-JID mismatches in accept/reject checks:
// getTarget() may return a LID while getSender() returns a phone-JID for the
// same person, making bareJid comparisons always fail.
function resolveJid(rawJid, participants) {
  const bare = bareJid(rawJid);
  const canon = canonicalJid(rawJid);
  if (!participants?.length) return canon || bare;
  const p = participants.find(q =>
    [q.id, q.lid, q.phoneNumber].some(f => f && (
      bareJid(f) === bare || canonicalJid(f) === canon
    ))
  );
  if (!p) return bare;
  if (p.phoneNumber) {
    const ph = bareJid(p.phoneNumber);
    if (ph.endsWith('@s.whatsapp.net')) return ph;
  }
  return bareJid(p.id);
}

// A duel is a consented aura bet: challenger stakes an amount, target must
// accept, winner takes the stake from the loser. The accept step is what makes
// it social — it forces a public yes/no instead of a silent dice roll.
//
// La escala vive en utils/economia.js, igual que el robo y los bonos. Antes
// estaba aqui a pelo y se quedo en la escala vieja cuando todo lo demas bajo.
const { DUELO } = require('../utils/economia');
const { A_TI_MISMO, DUELO_AJENO, SOLO_GRUPOS } = require('../data/avisos');
const { aviso } = require('../utils/helpers');
const STAKE_MIN = DUELO.suelo;
const STAKE_DEFAULT = DUELO.porDefecto;
const EXPIRY_MS = 90 * 1000;       // pending challenge dies after 90 s

const pending = new Map();      // groupJid -> { challenger, target, stake, ts }

// Mild rig: the owner has an edge but loses often enough that it's a real
// fight; admins a slighter edge; members 50/50. Returns 'c' or 't'.
function rollWinner(cO, cA, tO, tA) {
  const r = Math.random();
  if (cO && !tO) return r < 0.65 ? 'c' : 't';
  if (tO && !cO) return r < 0.65 ? 't' : 'c';
  if (cA && !tA) return r < 0.58 ? 'c' : 't';
  if (tA && !cA) return r < 0.58 ? 't' : 'c';
  return r < 0.5 ? 'c' : 't';
}

// %W winner, %L loser
let DUEL_WIN = [
  '%L tiró los dados como quien compra un rasca esperando jubilarse. %W le explicó la estadística a hostia limpia y gratis.',
  '%W se lleva el aura de %L, y %L se queda con la cara de haber entrado. Nadie le obligó.',
  '%L entró al duelo con toda la chulería y lo ha perdido con toda la vergüenza.',
  'Duelo cerrado. %W cobra, %L paga, y el grupo se queda con la captura.',
  'Hay que ser gilipoyas para jugarse el aura contra %W. %L lo ha sido y ahora pone cara de robo.',
  '%W ni se ha despeinado. %L ha perdido el aura y la dignidad en la misma tirada.',
  'La próxima vez que %L quiera un duelo, que se mire primero el saldo. Ahora mirarlo le sale más barato.',
  '%L ha puesto el aura encima de la mesa y %W se la ha llevado sin dar las gracias.',
  'Duelo para %W. %L ya puede ir pensando una excusa, que el grupo la está esperando.',
  '%L ha pedido el duelo y lo ha perdido. %L es tan imbécil que paga por que le humillen en público.',
  '%W suma, %L resta, y el marcador ya lo ha publicado para todo el grupo.',
  '%L se ha estrellado contra %W y ha pagado en aura por enterarse de lo que el grupo ya sabía.',
  'El dado ha hablado y ha dicho %W. A %L le ha dicho otra cosa que no se puede repetir.',
  '%W cobra el duelo con la calma de quien cobra lo suyo. %L paga con la cara colorada.',
  '%L ha perdido y ahora tiene dos opciones: pedir la revancha o callarse. Las dos le van a salir mal.',
  'Duelo resuelto y humillación servida. %W ni lo celebra y %L no lo supera.',
  '%L vino a por aura y se va sin la suya. Gran negocio, fenómeno.',
  '%W le ha quitado a %L el aura, las ganas y el derecho a hablar de duelos en una semana.',
  'Cuando %L diga que tiene mala suerte, que alguien le enseñe este duelo contra %W.',
  '%W gana limpio y %L pierde con la boca abierta.',
  '%L se ha metido en el duelo como quien firma sin leer. %W sí leyó la letra pequeña: gana %W.',
  'Aura de %L al bolsillo de %W. Lo que %L tenía en la mesa, %W se lo ha cobrado en un comando.',
  '%W, con el premio. %L, con la factura.',
  '%L sale del duelo más pobre y con menos ganas de hablar. Lo segundo es lo único bueno.',
  '%W le ha ganado a %L sin esfuerzo y sin piedad. %L ha puesto lo demás: el aura y la cara.',
  'Si %L quería protagonismo, ya lo tiene: es el nombre que sale restando.',
  '%W se lleva lo que %L ha puesto en la mesa. %L mira el saldo como si se hubiera jugado la vida.',
  '%W se va con el premio. %L, con el recuerdo de haberse metido.',
  '%L ha perdido tan rápido que el duelo ha durado menos que el reto.',
  '%W gana. %L se queda buscando culpables y no los encuentra porque no se mira al espejo.',
];


function getPending(jid) {
  const d = pending.get(jid);
  if (!d) return null;
  if (Date.now() - d.ts > EXPIRY_MS) { pending.delete(jid); return null; }
  return d;
}

async function resolveDuel(sock, jid, d, groupMeta) {
  pending.delete(jid);
  const participants = groupMeta?.participants || [];
  const cO = isOwner(d.challenger, false, groupMeta);
  const tO = isOwner(d.target, false, groupMeta);
  const cA = isAdmin(participants, d.challenger);
  const tA = isAdmin(participants, d.target);

  // El owner principal usa ownerGana (DUELO.owner + racha). rollWinner de
  // 0.65 se aplicaba ANTES y se tiraba: un dado muerto. Co-owners/admins
  // siguen por rollWinner.
  let side;
  if (isMainOwner(d.challenger, false, groupMeta)) side = ownerGana(jid, DUELO.owner) ? 'c' : 't';
  else if (isMainOwner(d.target, false, groupMeta)) side = ownerGana(jid, DUELO.owner) ? 't' : 'c';
  else side = rollWinner(cO, cA, tO, tA);
  const winner = side === 'c' ? d.challenger : d.target;
  const loser  = side === 'c' ? d.target : d.challenger;

  // TRANSFERAURA, NO DOS addAura. Un duelo mueve aura de una persona a otra y
  // eso solo tiene una forma correcta de escribirse.
  //
  // Con dos addAura sueltos habia dos problemas de verdad:
  //
  //  · CADA UNO VA POR SU COLA. auraStore serializa por (grupo, persona), asi
  //    que entre comprobar el saldo del perdedor arriba y descontarselo aqui
  //    cabe un !robo, un !dar o una apuesta suya. El duelo cobraba igual y lo
  //    dejaba en NEGATIVO, que es justo lo que SALDO_MINIMO existe para impedir.
  //  · Y si el proceso se cae entre las dos lineas, se ha creado o destruido
  //    aura: uno cobro y el otro no pago. transferAura hace las dos escrituras
  //    dentro del mismo bloque serializado, asi que o pasan las dos o ninguna.
  //
  // Si el perdedor ya no puede cubrirlo, la transferencia no se hace y se dice.
  const mov = await transferAura(jid, loser, winner, d.stake);
  if (!mov.ok) {
    // `pending` ya se limpio al entrar en resolveDuel, asi que aqui no hay nada
    // que borrar: solo avisar y salir sin mover un aura.
    // SIN `quoted`: resolveDuel no recibe msg. Se llama desde el temporizador
    // del duelo, donde no hay ningun mensaje que citar — y el aviso de exito de
    // aqui abajo tampoco cita. Poner `{ quoted: msg }` era un ReferenceError:
    // en vez de "duelo anulado" el grupo veia "Error inesperado: msg is not
    // defined", y justo en el camino de fallo, que es el que menos se prueba.
    return sock.sendMessage(jid, {
      text: `@${loser.split('@')[0]} ya no tiene los *${fmt(d.stake)}* que apostó. Duelo anulado.`,
      mentions: [loser],
    });
  }
  const w = { current: mov.toNew };
  const l = { current: mov.fromNew };

  const phrase = pickFresh(DUEL_WIN, `${jid}|duel`)
    .replace(/%W/g, `@${winner.split('@')[0]}`)
    .replace(/%L/g, `@${loser.split('@')[0]}`);

  // Si ya se batieron otro dia, el bot se acuerda (utils/rencor.js).
  const memoria = await rencor.duelo({ grupo: jid, gana: winner, pierde: loser, cifra: d.stake, groupMeta });

  const text =
    `*DUELO · ${fmt(d.stake)} de aura*\n\n` +
    `${phrase}` +
    (memoria ? `\n_${memoria}_` : '') +
    `\n\n` +
    `${lineaAura(`@${winner.split('@')[0]}`, d.stake, w.current)}\n` +
    `${lineaAura(`@${loser.split('@')[0]}`, -d.stake, l.current)}`;

  await sock.sendMessage(jid, { text, mentions: [winner, loser] });
}

// !duel @user [cantidad]      -> challenge
// !duel aceptar | ato        -> target accepts, fight resolves
// !duel rechazar | cancelar   -> target declines / challenger cancels
async function cmdDuel(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }

  const sender = getSender(msg);
  const sub = (args && args[0] ? args[0] : '').toLowerCase();

  // --- accept ---
  if (['aceptar', 'acepto', 'accept', 'ok', 'si', 'sí', 'vamos', 'dale'].includes(sub)) {
    const d = getPending(jid);
    if (!d) return sock.sendMessage(jid, { text: 'No hay ningún duelo pendiente.' }, { quoted: msg });
    const resolvedSender = resolveJid(sender, groupMeta?.participants);
    // El que retó no es un intruso: DUELO_AJENO le diría «a ti no te han
    // llamado» a quien abrió el duelo.
    if (sameUser(resolvedSender, d.challenger)) {
      return sock.sendMessage(jid, {
        text: `El reto es tuyo. Aceptar le toca a @${d.target.split('@')[0]}, y si le da miedo, que lo diga.`,
        mentions: [d.target],
      }, { quoted: msg });
    }
    if (!sameUser(resolvedSender, d.target)) {
      return sock.sendMessage(jid, { text: aviso(DUELO_AJENO, jid, 'duelo') }, { quoted: msg });
    }
    // Claim the duel atomically BEFORE any await. Two concurrent "aceptar"
    // messages (or a WhatsApp redelivery — the handler has no msg-id dedup)
    // would otherwise both pass the checks below and pay out twice. Deleting the
    // pending slot synchronously here means the second one sees no pending duel.
    pending.delete(jid);
    const [auraT, auraC] = await Promise.all([
      getAura(jid, d.target),
      getAura(jid, d.challenger),
    ]);
    if (auraT < d.stake) {
      pending.delete(jid);
      return sock.sendMessage(jid, {
        text: `@${d.target.split('@')[0]} no tiene *${fmt(d.stake)}* de aura (tiene *${fmt(auraT)}*). Duelo cancelado por insolvente.`,
        mentions: [d.target],
      }, { quoted: msg });
    }
    // The challenger may have lost aura elsewhere (another duel/robo/!aura) since
    // issuing the challenge — re-verify so the bet can't drive them arbitrarily
    // negative on a loss.
    if (auraC < d.stake) {
      pending.delete(jid);
      return sock.sendMessage(jid, {
        text: `@${d.challenger.split('@')[0]} ya no tiene *${fmt(d.stake)}* de aura (tiene *${fmt(auraC)}*). Duelo cancelado.`,
        mentions: [d.challenger],
      }, { quoted: msg });
    }
    return resolveDuel(sock, jid, d, groupMeta);
  }

  // --- decline / cancel ---
  if (['rechazar', 'rechazo', 'no', 'cancelar', 'cancel', 'decline', 'paso'].includes(sub)) {
    const d = getPending(jid);
    if (!d) return sock.sendMessage(jid, { text: 'No hay ningún duelo pendiente.' }, { quoted: msg });
    const resolvedSender2 = resolveJid(sender, groupMeta?.participants);
    const isTarget = sameUser(resolvedSender2, d.target);
    const isChallenger = sameUser(resolvedSender2, d.challenger);
    if (!isTarget && !isChallenger) {
      return sock.sendMessage(jid, { text: aviso(DUELO_AJENO, jid, 'duelo') }, { quoted: msg });
    }
    pending.delete(jid);
    if (isTarget) {
      return sock.sendMessage(jid, {
        text: `@${d.target.split('@')[0]} le saca el cuerpo al duelo de @${d.challenger.split('@')[0]}. Cobarde confirmado.`,
        mentions: [d.target, d.challenger],
      }, { quoted: msg });
    }
    return sock.sendMessage(jid, {
      text: `@${d.challenger.split('@')[0]} cancela su propio reto. Se arrepintió a tiempo.`,
      mentions: [d.challenger],
    }, { quoted: msg });
  }

  // --- new challenge ---
  const target = getTarget(msg);
  if (!target) return sock.sendMessage(jid, {
    text: 'Reta a alguien: *!duel @alguien 100*',
  }, { quoted: msg });
  if (sameUser(target, sender)) {
    return sock.sendMessage(jid, { text: aviso(A_TI_MISMO, jid, 'yo') }, { quoted: msg });
  }

  const existing = getPending(jid);
  if (existing) {
    return sock.sendMessage(jid, {
      text: `Ya hay un duelo pendiente: @${existing.challenger.split('@')[0]} vs @${existing.target.split('@')[0]}. Espera a que se resuelva.`,
      mentions: [existing.challenger, existing.target],
    }, { quoted: msg });
  }

  // Apuesta: primer argumento numerico despues de la mencion. Mismo parser
  // que el robo: si no, un telefono sin @ o una marca bidi se comen la cifra.
  const parsed = parseCantidad(args);

  // El tope se calcula con el saldo de LOS DOS, no solo con el del retador.
  // Antes solo se miraba al que lanzaba, asi que se podia retar por 500 a
  // alguien con 60: el duelo moria al aceptar, con un mensaje publico
  // llamandole insolvente. Ahora la cifra se ajusta sola y nadie queda expuesto.
  const [auraC, auraT] = await Promise.all([
    getAura(jid, sender),
    getAura(jid, target),
  ]);
  const pobre = Math.min(auraC, auraT);
  const maxStake = Math.max(
    STAKE_MIN,
    Math.min(DUELO.techo, Math.floor(pobre * DUELO.fraccionRival)),
  );
  const { stake, pedido, recortado } = resolverCantidad(parsed, {
    max: maxStake,
    suelo: STAKE_MIN,
    porDefecto: Math.min(STAKE_DEFAULT, maxStake),
  });

  if (auraC < stake || auraT < stake) {
    return sock.sendMessage(jid, {
      text: `Con ese saldo no te da para un duelo.`,
    }, { quoted: msg });
  }

  // Store canonical (phone-JID) forms so accept/reject comparisons work in
  // LID groups where getTarget() and getSender() may return different JID formats.
  const participants = groupMeta?.participants;
  pending.set(jid, {
    challenger: resolveJid(sender, participants),
    target:     resolveJid(target, participants),
    stake,
    ts: Date.now(),
  });

  // EL PRECEDENTE, si ya se batieron otro dia. Va al lanzarlo, que es cuando
  // el retado decide: saber que la ultima vez perdio 200 es parte de decidir.
  const precedente = await rencor.precedenteDuelo({
    grupo: jid, retador: pending.get(jid).challenger, retado: pending.get(jid).target, groupMeta,
  });

  await sock.sendMessage(jid, {
    text:
      `*DUELO LANZADO*\n\n` +
      `@${sender.split('@')[0]} reta a @${target.split('@')[0]} por *${fmt(stake)}* de aura.\n` +
      (recortado ? `_Tope entre los dos: ${fmt(maxStake)}_\n` : '') +
      (precedente ? `_${precedente}_\n` : '') +
      `\n@${target.split('@')[0]} · *!duel aceptar* o *!duel rechazar*\n` +
      `_(expira en 90s)_`,
    mentions: [sender, target],
  }, { quoted: msg });
}


module.exports = { cmdDuel };
