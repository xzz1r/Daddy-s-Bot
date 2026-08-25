const { isOwner, isMainOwner, isAdmin, getSender, getTarget, bareJid, sameUser, canonicalJid } = require('../utils/wa');
const { pickFresh, fmt, parseCantidad, resolverCantidad } = require('../utils/helpers');
const { getAura, transferAura } = require('../utils/auraStore');
const { ownerGana } = require('../utils/rigOwner');

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
  '%W desarmó a %L en el primer intercambio. %L pierde tanto que la derrota ya le llama por su nombre, le abraza y le hace la cena. Puto fracasado de manual.',
  '%W ni se despeinó. %L tenía la excusa lista antes que la estrategia, porque este gilipollas ensaya el fracaso en casa antes de venir a exhibirlo gratis al grupo.',
  '%W lo tenía leído de memoria. %L es de manual, sí, del manual de cómo ser un puto inútil y perder hasta respirando, edición sobada de tanto releerla él solo.',
  '%W barre a %L delante del grupo, el único sitio donde a %L lo mencionan, aunque sea para esto. Aprovéchalo, perdedor.',
  '%W gana sin sudar. %L se derrumbó él solito, como se le cae a la mierda todo lo que ese pringado intenta sostener con sus manitas temblorosas.',
  '%L apostó convencido de que esta vez sería distinto. Esa frase de mierda es lo más parecido a una autobiografía que va a escribir este fracasado en toda su puta vida.',
  '%W pasó por encima de %L como una fregona por el suelo: rápido, sin resistencia y dejando todo más limpio que el patético currículum de mierda de ese perdedor.',
  '%W cierra el duelo en seco. %L vuelve a su rincón arrastrando la misma lección de siempre que, como buen inútil, no aprende ni a hostias.',
  '%L retó a %W con la boca llena y el currículum vacío de un puto don nadie. El choque fue breve, público y le dejó bien claro lo poca cosa que es.',
  '%W ejecuta a %L sin pestañear. Para %W fue un trámite; para %L, otro trauma más que sumar a la montaña de mierda que es su vida de fracasado sin un puto duro.',
  '%W mandó de principio a fin. %L solo apareció para engordar el marcador del otro, el único puto papel que sabe hacer este pelele en cualquier grupo.',
  '%L tiró los dados como quien compra un rasca esperando jubilarse. %W le explicó la estadística a hostia limpia y gratis.',
  'El frame de %W aplastó a %L antes del primer asalto. Y eso que a %L lo revienta a diario cualquier chorrada más pequeña, como una simple charla. Pobre mierda blanda.',
  '%W ganó tan fácil que casi pide la revancha por aburrimiento. %L declinó: bastante tiene el pobre pringado con recoger su orgullo hecho mierda del suelo.',
  '%L creyó que tenía una oportunidad. Esa fe ciega de perdedor es entrañable en un cachorro y patética en un puto adulto con su historial de fracasos.',
  '%W se lleva el botín. %L se lleva la enésima prueba de que nació para perder, un talento de mierda que es lo único que este inútil tiene bien afinado.',
  'Duelo resuelto a favor de quien nunca dudó. %W, leyenda; %L, el puto chiste que el grupo usa para reírse y de paso avisar de cómo no acabar en la vida.',
  '%W ni recordará este duelo mañana. %L lo va a rumiar una semana entera, que es lo que tarda su cerebro de mierda, lento como un módem viejo, en digerir la paliza.',
  '%W gana sin drama. %L necesita drama y excusas hasta para dormir, y aun así esta noche no pega ojo dándole vueltas a la puta basura de persona que es.',
  '%L entró a por una victoria que le alegrara el día gris. Sale con el manual ilustrado de por qué su vida entera es una mierda gris, cortesía de %W.',
  'No fue un duelo, fue una clase magistral de %W sobre lo puto inútil que es %L, asignatura que ese fracasado lleva suspendiendo desde que nació.',
  '%W le quita el aura y, de propina, la poca dignidad que a %L le quedaba. Pack completo, perdedor de mierda, y encima gratis para que escueza más.',
  '%L ya preparaba la revancha mental antes de perder esta. El único acierto de este pringado en su puta vida: saber de sobra que iba a caer como siempre.',
  'A %W no le hizo falta ni esforzarse. A %L nunca le hizo falta ayuda para hundirse en su propia mierda, pero hoy, por una vez, tuvo asistencia técnica gratis.',
  '%W gana y pasa página en un segundo. %L añade la derrota a la lista que repasa cada noche al apagar la luz, el único puto hábito constante de este fracasado.',
  'Jerarquía aplicada al duelo: %W arriba, %L de puto relleno. Como en el chat, como en su grupo de amigos y como en la cena de Navidad donde nadie lo traga.',
  '%W tenía esto firmado antes de que %L aceptara. %L apuesta por pura fe, porque mérito y autoestima a este pringado se le agotaron hace ya un porrón de años.',
  '%W cerró el duelo y %L abrió su manual de excusas por la página más sobada: "no estaba concentrado". El clásico de todo perdedor que no asume que es una puta mierda.',
  '%L midió sus fuerzas con %W y descubrió, otra vez, que no tiene ni una. Lección que este inútil no aprende porque en esa cabeza hueca de mierda no cabe ni eso.',
  '%W lo mandó al rincón de pensar. %L lleva ahí sentado toda su puta vida y aún no ha parido un solo pensamiento útil, pero el sitio de perdedor ya lo tiene calentito.',
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

  const text =
    `*DUELO · ${fmt(d.stake)} de aura*\n\n` +
    `${phrase}\n\n` +
    `@${winner.split('@')[0]}  +${fmt(d.stake)} → *${fmt(w.current)}*\n` +
    `@${loser.split('@')[0]}  −${fmt(d.stake)} → *${fmt(l.current)}*`;

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
      text: 'Con ese saldo no da para un duelo.',
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

  await sock.sendMessage(jid, {
    text:
      `*DUELO LANZADO*\n\n` +
      `@${sender.split('@')[0]} reta a @${target.split('@')[0]} por *${fmt(stake)}* de aura.\n` +
      (recortado ? `_Tope entre los dos: ${fmt(maxStake)}_\n` : '') +
      `\n@${target.split('@')[0]} · *!duel aceptar* o *!duel rechazar*\n` +
      `_(expira en 90s)_`,
    mentions: [sender, target],
  }, { quoted: msg });
}


module.exports = { cmdDuel };
