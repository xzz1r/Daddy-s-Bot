const { isOwner, isAdmin, getSender, getTarget, bareJid } = require('../utils/wa');
const { getAura, addAura } = require('../utils/auraStore');
const { pick } = require('../utils/helpers');

const STAKE_DEFAULT = 200;
const STAKE_MAX     = 1000;
const STAKE_FLOOR   = 10;
const MIN_AURA      = 50;         // attacker needs at least this to attempt

const ROB_WIN = [
  '%A le vacía la aura a %V como quien le quita el caramelo a un subhuman. %V ni tenía cómo defenderla, nació sin frame.',
  '%A moggea y saquea a la vez. %V queda mirando la pantalla con su canthal tilt negativo y los bolsillos vacíos. It\'s over.',
  '%A entra, ejecuta y se va con todo. %V es el 80% que nadie protege ni mira. La hipergamia no manda refuerzos por los LTN.',
  '%A le arranca la aura y de paso la dignidad. %V vuelve al LDAR del que nunca debió salir.',
  '%A le hace looksmining los bolsillos a %V. Resulta que tenía aura pero cero capacidad de retenerla, igual que su hairline.',
  'Robo limpio de %A. %V intentó resistirse pero un sub-5 no para a nadie. La genética ya decidió quién roba y quién es robado.',
  '%A trata a %V como caja registradora. %V acepta el saqueo porque en el fondo sabe que es relleno y el relleno paga.',
  '%A le quita la aura a %V delante de todos. Humillación pública nivel mog check perdido en directo. JFL.',
  '%A se lleva el botín y a %V no lo defiende nadie. Cuando eres invisible para las foids también lo eres para la seguridad.',
  '%A desangra a %V de aura. %V puede copear todo lo que quiera, pero los números no mienten y su cara tampoco.',
  '%A roba y asciende. %V roba miradas de lástima. Cada uno en el tier que la biología le firmó al nacer.',
];

const ROB_FAIL = [
  '%A intentó robar y lo pillaron como al framecel que es. %V ni se inmutó: los Chads no vigilan, simplemente nadie se atreve. %A paga la multa de su cope.',
  'Robo patético de %A. %V lo mogeó solo con mirarlo y %A salió corriendo perdiendo aura. It\'s over para el aspirante.',
  '%A se creyó depredador y resultó ser la presa. %V lo devuelve a su tier de relleno y le cobra el atrevimiento.',
  '%V huele el intento de un LTN a kilómetros. %A se va con menos aura y la autoestima en LDAR terminal.',
  '%A falla el robo y queda expuesto: ni roba bien ni se ve bien. Doble L documentada por el grupo entero.',
  'El robo más subhuman que ha visto el chat. %V ni levantó la mirada. %A paga por soñar fuera de su looksmatch.',
  '%A apostó por el golpe con la confianza de un Gigachad y la genética de un NPC. %V lo castiga. La realidad también.',
  '%V para el robo en seco y %A sangra aura. Cuando naces sin frame ni el crimen te sale. Cope eterno.',
  '%A intentó subir de tier robando y la hipergamia social lo escupió de vuelta abajo. %V sigue intacto e indiferente.',
  '%A se va con las manos vacías y un recordatorio: los perdedores genéticos también pierden los robos. %V no perdió ni un punto.',
];

const fmt = n => n.toLocaleString('es-ES');

// Success chance based on role tiers and aura gap.
// Ranges ~25%–72%: enough variance that no one farms safely.
function calcChance(aO, aA, vO, vA, auraA, auraV) {
  let base = aO ? 0.58 : aA ? 0.51 : 0.44;
  if (vO && !aO) base -= 0.14;
  else if (vA && !aA && !aO) base -= 0.07;
  // Each 500-aura gap shifts ±2%, capped at ±10%
  const diff = auraA - auraV;
  const shift = Math.sign(diff) * Math.min(Math.abs(diff / 500), 5) * 0.02;
  return Math.min(0.72, Math.max(0.25, base + shift));
}

async function cmdRobo(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Los robos solo ocurren en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);
  const target = getTarget(msg);

  if (!target) {
    return sock.sendMessage(jid, {
      text: 'Usa: *!robo @user [aura]*',
    }, { quoted: msg });
  }
  if (bareJid(target) === bareJid(sender)) {
    return sock.sendMessage(jid, { text: 'No puedes robarte a ti mismo.' }, { quoted: msg });
  }

  const [auraA, auraV] = await Promise.all([
    getAura(jid, sender),
    getAura(jid, target),
  ]);

  if (auraA < MIN_AURA) {
    return sock.sendMessage(jid, {
      text: `Necesitas al menos ${MIN_AURA} de aura para intentar un robo. No tienes ni para pipas.`,
    }, { quoted: msg });
  }
  if (auraV <= 0) {
    return sock.sendMessage(jid, {
      text: `@${target.split('@')[0]} no tiene aura que robar. Busca una víctima con algo encima.`,
      mentions: [target],
    }, { quoted: msg });
  }

  // Stake: first numeric arg, clamped to what both parties can afford
  const raw = parseInt((args || []).find(a => /^\d+$/.test(a)) || STAKE_DEFAULT, 10);
  const maxStake = Math.min(STAKE_MAX, auraV, auraA);
  const stake = Math.max(STAKE_FLOOR, Math.min(raw, maxStake));

  const participants = groupMeta?.participants || [];
  const aO = isOwner(sender, msg.key.fromMe, groupMeta);
  const aA = !aO && isAdmin(participants, sender);
  const vO = isOwner(target, false, groupMeta);
  const vA = !vO && isAdmin(participants, target);

  const chance = calcChance(aO, aA, vO, vA, auraA, auraV);
  const success = Math.random() < chance;

  const aTag = `@${sender.split('@')[0]}`;
  const vTag = `@${target.split('@')[0]}`;

  if (success) {
    const [aNew, vNew] = await Promise.all([
      addAura(jid, sender, +stake),
      addAura(jid, target, -stake),
    ]);
    const phrase = pick(ROB_WIN).replace(/%A/g, aTag).replace(/%V/g, vTag);
    const text =
      `*ROBO EXITOSO · ${fmt(stake)} de aura*\n\n` +
      `${phrase}\n\n` +
      `${aTag}  +${fmt(stake)} → *${fmt(aNew.current)}*\n` +
      `${vTag}  −${fmt(stake)} → *${fmt(vNew.current)}*`;
    return sock.sendMessage(jid, { text, mentions: [sender, target] });
  }

  // Failed: attacker pays half the stake as penalty, target keeps everything
  const penalty = Math.ceil(stake / 2);
  const aNew = await addAura(jid, sender, -penalty);
  const phrase = pick(ROB_FAIL).replace(/%A/g, aTag).replace(/%V/g, vTag);
  const text =
    `*ROBO FALLIDO · ${fmt(stake)} intentados*\n\n` +
    `${phrase}\n\n` +
    `${aTag}  −${fmt(penalty)} (pillado) → *${fmt(aNew.current)}*`;
  return sock.sendMessage(jid, { text, mentions: [sender, target] });
}

module.exports = { cmdRobo };
