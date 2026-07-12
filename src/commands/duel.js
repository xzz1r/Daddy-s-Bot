const { isOwner, isAdmin, getSender, getTarget, bareJid, sameUser } = require('../utils/wa');
const { pickFresh } = require('../utils/helpers');
const { getAura, addAura } = require('../utils/auraStore');

// Resolve a JID to its canonical form (preferring phone-JID) using the group
// participant list. Fixes LID vs phone-JID mismatches in accept/reject checks:
// getTarget() may return a LID while getSender() returns a phone-JID for the
// same person, making bareJid comparisons always fail.
function resolveJid(rawJid, participants) {
  const bare = bareJid(rawJid);
  if (!participants?.length) return bare;
  const p = participants.find(q =>
    bareJid(q.id) === bare ||
    (q.lid && bareJid(q.lid) === bare) ||
    (q.phoneNumber && bareJid(q.phoneNumber) === bare)
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
const STAKE_MIN = 100;
const STAKE_MAX = 10000;
const STAKE_DEFAULT = 500;
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
const DUEL_WIN = [
  '%W desarmó a %L en el primer intercambio. %L lleva tanto perdiendo que ya saluda a la derrota por su nombre de pila.',
  '%W ni se despeinó. %L preparó la excusa antes que la estrategia, que es justo el orden en el que hace todo en la vida.',
  '%W lo tenía leído de memoria. %L es de manual, pero del manual de qué-no-hacer, edición de bolsillo y muy sobada.',
  '%W barre a %L delante del grupo, el único sitio donde a %L lo mencionan, aunque sea para esto. Aprovéchalo, perdedor.',
  '%W gana sin sudar. %L se vino abajo solo, como se viene abajo todo lo que ese intenta sostener con sus manitas.',
  '%L apostó convencido de que esta vez sería distinto. Esa frase es lo más parecido a una autobiografía que va a escribir nunca.',
  '%W pasó por encima de %L como una fregona por el suelo: rápido, sin resistencia y dejándolo más limpio de aura que antes.',
  '%W cierra el duelo en seco. %L vuelve a su rincón con la lección de siempre y, como siempre, sin haberla aprendido.',
  '%L retó a %W con la confianza de un campeón y el currículum de un figurante. El choque fue breve, público y muy didáctico.',
  '%W ejecuta a %L sin pestañear. Para %W fue un trámite; para %L es el tema de su próxima terapia, si llega a poder pagarla.',
  '%W mandó de principio a fin. %L apareció solo para dar volumen al marcador del otro, su único papel en cualquier grupo.',
  '%L tiró los dados como quien compra un rasca esperando jubilarse. %W le explicó la estadística a hostia limpia y gratis.',
  'El frame de %W aplastó a %L antes del primer asalto. Y eso que a %L lo aplastan cosas mucho más pequeñas a diario, como una charla.',
  '%W ganó tan fácil que casi pide la revancha por aburrimiento. %L declinó: bastante tiene con recoger su orgullo del suelo.',
  '%L creyó que tenía una oportunidad. Esa fe ciega es entrañable en un cachorro y patética en alguien con su edad y su historial.',
  '%W se lleva el botín. %L se lleva la enésima confirmación de que su instinto para perder sigue afinado como un reloj suizo.',
  'Duelo resuelto a favor de quien nunca dudó. %W, leyenda; %L, el nombre que el grupo usa de chiste y de advertencia, dos en uno.',
  '%W ni recordará este duelo mañana. %L lo va a rumiar una semana, que es lo que tarda en procesar todo con ese cerebro de módem antiguo.',
  '%W gana sin drama. %L necesita drama y excusas hasta para dormir, y aun así esta noche no pega ojo pensando en lo poca cosa que es.',
  '%L entró a por una victoria que le alegrara el día gris. Sale con el manual ilustrado de por qué sus días son grises, cortesía de %W.',
  'No fue un duelo, fue una clase magistral de %W sobre "%L y sus límites", asignatura que ese suspende desde que tiene uso de razón.',
  '%W le quita el aura y, de regalo, la poca certeza que a %L le quedaba sobre sí mismo. Pack completo, perdedor, y sin gastos de envío.',
  '%L ya preparaba la revancha mental antes de perder esta. Adelantado a los acontecimientos solo en una cosa: en saber que iba a caer.',
  'A %W no le hizo falta esforzarse. A %L tampoco le ha hecho falta nunca ayuda para hundirse, pero hoy, por una vez, tuvo asistencia técnica.',
  '%W gana y pasa página en un segundo. %L añade la derrota a la lista que repasa al apagar la luz, su único hábito de lectura constante.',
  'Jerarquía aplicada al duelo: %W arriba, %L de relleno. Como en el chat, como en su grupo de amigos, como en la cena de Navidad.',
  '%W tenía esto firmado antes de que %L aceptara. %L apuesta por fe, porque mérito, como autoestima, hace tiempo que no le quedan en stock.',
  '%W cerró el duelo y %L abrió el manual de excusas por la página que tiene gastada de tanto usarla: "no estaba concentrado", un clásico atemporal.',
  '%L midió sus fuerzas con %W y descubrió, otra vez, que no tiene. Una lección que no aprende porque para guardarla haría falta sitio, y ahí va justo.',
  '%W lo mandó al rincón de pensar. %L lleva ahí sentado toda la vida y aún no ha pensado nada que le sirva, pero el sitio ya lo tiene calentito.',
];

const fmt = (n) => n.toLocaleString('es-ES');

function clampStake(raw) {
  const n = parseInt(String(raw).replace(/\D/g, ''), 10);
  if (!Number.isFinite(n) || n <= 0) return STAKE_DEFAULT;
  return Math.min(Math.max(n, STAKE_MIN), STAKE_MAX);
}

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

  const side = rollWinner(cO, cA, tO, tA);
  const winner = side === 'c' ? d.challenger : d.target;
  const loser  = side === 'c' ? d.target : d.challenger;

  const w = await addAura(jid, winner, +d.stake);
  const l = await addAura(jid, loser, -d.stake);

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
    return sock.sendMessage(jid, { text: 'Los duelos solo existen en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);
  const sub = (args && args[0] ? args[0] : '').toLowerCase();

  // --- accept ---
  if (['aceptar', 'acepto', 'accept', 'ok', 'si', 'sí', 'vamos', 'dale'].includes(sub)) {
    const d = getPending(jid);
    if (!d) return sock.sendMessage(jid, { text: 'No hay ningún duelo pendiente.' }, { quoted: msg });
    const resolvedSender = resolveJid(sender, groupMeta?.participants);
    if (resolvedSender !== bareJid(d.target)) {
      return sock.sendMessage(jid, { text: 'Este duelo no es para ti.' }, { quoted: msg });
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
    const isTarget = resolvedSender2 === bareJid(d.target);
    const isChallenger = resolvedSender2 === bareJid(d.challenger);
    if (!isTarget && !isChallenger) {
      return sock.sendMessage(jid, { text: 'Este duelo no es asunto tuyo.' }, { quoted: msg });
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
  if (!target) {
    return sock.sendMessage(jid, {
      text: 'Usa: *!duel @user <aura>*\nLuego el retado escribe *!duel aceptar*.',
    }, { quoted: msg });
  }
  if (sameUser(target, sender)) {
    return sock.sendMessage(jid, { text: 'No puedes retarte a ti mismo.' }, { quoted: msg });
  }

  const existing = getPending(jid);
  if (existing) {
    return sock.sendMessage(jid, {
      text: `Ya hay un duelo pendiente: @${existing.challenger.split('@')[0]} vs @${existing.target.split('@')[0]}. Espera a que se resuelva.`,
      mentions: [existing.challenger, existing.target],
    }, { quoted: msg });
  }

  // Stake: first numeric arg after the mention (e.g. "!duel @user 800").
  const stakeArg = (args || []).find(a => /^\d+$/.test(a));
  const stake = clampStake(stakeArg);

  // Both must have enough aura to cover the bet
  const auraC = await getAura(jid, sender);
  if (auraC < stake) {
    return sock.sendMessage(jid, {
      text: `No tienes *${fmt(stake)}* de aura. Tienes *${fmt(auraC)}*.`,
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
      `@${sender.split('@')[0]} reta a @${target.split('@')[0]} por *${fmt(stake)}* de aura.\n\n` +
      `@${target.split('@')[0]}, escribe *!duel aceptar* para pelear o *!duel rechazar* para huir.\n` +
      `_(expira en 90s)_`,
    mentions: [sender, target],
  }, { quoted: msg });
}

module.exports = { cmdDuel };
