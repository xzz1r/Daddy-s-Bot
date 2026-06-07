const { isOwner, isAdmin, getSender, getTarget, bareJid } = require('../utils/wa');
const { pickFresh } = require('../utils/helpers');
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
  '%W desarmó a %L en el primer intercambio. %L lleva toda la vida perdiendo así: rápido y delante de gente.',
  '%W lo tenía leído. %L cayó exactamente como cae siempre, y por dentro ya lo sabía antes de aceptar.',
  '%W humilla a %L delante del grupo entero, que es el único sitio donde a %L lo registran, aunque sea para esto.',
  '%W ni se esforzó. %L se vino abajo solo, como se viene abajo todo lo que %L intenta sostener.',
  '%W pasa por encima de %L como si no estuviera, que es justo como pasa el mundo por encima de %L cada día.',
  '%W cierra el duelo en seco. %L vuelve a casa con la lección de siempre y nadie con quien compartirla.',
  '%W le recuerda a %L cuál es su sitio. %L lo conocía de sobra, solo necesitaba que se lo dijeran en público.',
  '%W gana limpio. %L se queda contando lo que perdió, que es la única cuenta que a %L le sale siempre.',
  '%W ejecuta a %L sin pestañear. Para %W fue un trámite; para %L será el tema de pensamiento de esta noche.',
  '%W mandó de principio a fin. %L ni apareció, fiel a la costumbre de no estar donde de verdad importa.',
  '%W tenía el resultado firmado antes de que %L abriera la boca. %L apuesta por fe porque mérito no le queda.',
  'Genetic mog aplicado al combate. %W arriba, %L en el sótano donde ya tiene las cosas puestas.',
  'El frame de %W aplastó a %L antes del primer round. A %L lo aplastan cosas más pequeñas a diario.',
  '%W ni tuvo que esforzarse. It\'s over para %L, y lo de hoy solo lo certifica delante de testigos.',
  '%L apostó creyendo que la suerte taparía lo que es. La suerte no hace ese tipo de favores tan grandes.',
  '%W se lleva el botín. %L se lleva la confirmación de que su instinto para perder sigue intacto.',
  'Duelo resuelto a favor de quien nunca dudó. %W leyenda, %L el nombre que se usa de advertencia.',
  '%L tiró los dados contra alguien de otra liga, otra vez, esperando otro final. No hay otro final para %L.',
  '%W ni recuerda haber peleado. %L lo va a masticar durante días en esa cabeza que no le da tregua.',
  '%L ya está preparando la excusa. %W ya pasó página. Esa diferencia de velocidad lo explica todo.',
  'Nadie manda refuerzos cuando %L pierde. %L aprendió hace mucho que esa llamada no la coge nadie.',
  '%W gana sin drama ni explicaciones. %L necesita las dos cosas para dormir, y aun así no va a dormir.',
  '%L retó a alguien que jugaba en serio. Resultado: la enésima lección pública que %L no termina de aprender.',
  'PSL aplicado al duelo: %W en lo más alto, %L de relleno, como en todo lo demás de su vida.',
  'No fue competencia, fue confirmación. %W arriba, %L pagando por una verdad que ya conocía y odiaba.',
  '%W le quita el aura y, de paso, la poca certeza que a %L le quedaba sobre sí mismo. Dos por uno.',
  '%L entró buscando una victoria que le cambiara el día. Sale con la prueba de por qué nunca le cambia.',
  'A %W no le hizo falta nada. A %L no le ha hecho falta nadie para hundirse, y aun así hoy tuvo ayuda.',
  '%W gana y se olvida. %L pierde y lo añade a la lista que repasa cuando se apaga la luz.',
  '%L creyó que esta vez sería distinto. Esa frase es lo más parecido a una biografía que tiene %L.',
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
    if (bareJid(sender) !== bareJid(d.target)) {
      return sock.sendMessage(jid, { text: 'Este duelo no es para ti.' }, { quoted: msg });
    }
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
