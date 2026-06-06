const { isOwner, isAdmin, getSender, getTarget, bareJid } = require('../utils/wa');
const { pick } = require('../utils/helpers');
const { getAura, addAura } = require('../utils/auraStore');

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
  '%W desarma a %L en el primer intercambio. Sin discusión.',
  '%W lo tenía leído. %L cayó como estaba previsto.',
  '%W humilla a %L delante del grupo entero. Ouch.',
  '%W no necesitó ni esforzarse. %L se vino abajo solo.',
  '%W pasa por encima de %L como si no estuviera. Demoledor.',
  '%W cierra el duelo en seco. %L que aprenda a no retar a cualquiera.',
  '%W le da una lección a %L que va a recordar un rato.',
  '%W gana limpio. %L se queda contando lo que perdió.',
  '%W ejecuta a %L sin pestañear. Duelo terminado.',
  '%W manda en este duelo de principio a fin. %L ni apareció.',
  '%W tenía el resultado firmado antes de que %L abriera la boca. Duelo de paper.',
  'Genetic mog aplicado al combate. %W arriba, %L en el sótano genético para siempre.',
  'El frame de %W aplastó a %L antes del primer round. Frame wins fights.',
  '%W ni tuvo que esforzarse. It\'s over para %L y todos lo vieron en directo.',
  '%L apostó creyendo que la suerte compensaría la genética. Error de libro.',
  '%W se lleva el botín. %L se lleva la lección. Clásico de la jerarquía social.',
  'Duelo resuelto en favor de quien la biología ya favorecía. %W leyenda, %L caso de estudio.',
  '%L tiró los dados contra alguien que ya tenía el resultado escrito en los huesos. JFL.',
  '%W ni recuerda haber peleado. %L no va a poder olvidarlo. Eso es el tier gap.',
  '%L cope post-derrota incoming. %W ya cerró el tema y siguió con su vida.',
  'La hipergamia social no manda refuerzos para los que pierden duelos. %L se queda solo.',
  '%W gana como los Chads: sin drama, sin explicaciones, sin mirarlo dos veces.',
  '%L retó a alguien que ni se molestó en prepararse. Resultado: lección pública bien ganada.',
  'PSL aplicado al duelo: %W en S tier, %L en tier de relleno. La aritmética no falla.',
  'No fue competencia. Fue confirmación de jerarquía. %W arriba, %L pagando la evidencia.',
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

  const phrase = pick(DUEL_WIN)
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
    if (bareJid(sender) !== bareJid(d.target)) {
      return sock.sendMessage(jid, { text: 'Este duelo no es para ti.' }, { quoted: msg });
    }
    const auraT = await getAura(jid, d.target);
    if (auraT < d.stake) {
      pending.delete(jid);
      return sock.sendMessage(jid, {
        text: `@${d.target.split('@')[0]} no tiene *${fmt(d.stake)}* de aura (tiene *${fmt(auraT)}*). Duelo cancelado por insolvente.`,
        mentions: [d.target],
      }, { quoted: msg });
    }
    return resolveDuel(sock, jid, d, groupMeta);
  }

  // --- decline / cancel ---
  if (['rechazar', 'rechazo', 'no', 'cancelar', 'cancel', 'decline', 'paso'].includes(sub)) {
    const d = getPending(jid);
    if (!d) return sock.sendMessage(jid, { text: 'No hay ningún duelo pendiente.' }, { quoted: msg });
    const isTarget = bareJid(sender) === bareJid(d.target);
    const isChallenger = bareJid(sender) === bareJid(d.challenger);
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
  if (bareJid(target) === bareJid(sender)) {
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

  pending.set(jid, { challenger: sender, target, stake, ts: Date.now() });

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
