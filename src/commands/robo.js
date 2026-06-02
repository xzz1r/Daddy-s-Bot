const { isOwner, isAdmin, isGroupAdmin, getSender, getTarget, bareJid } = require('../utils/wa');
const { getAura, addAura } = require('../utils/auraStore');
const { pick } = require('../utils/helpers');

const STAKE_DEFAULT = 200;
const STAKE_MAX     = 1000;
const STAKE_FLOOR   = 10;
const MIN_AURA      = 50;         // attacker needs at least this to attempt
const PAIR_CD_MS    = 2 * 60 * 60 * 1000; // 2h per attacker→victim pair

const pairCooldowns = new Map(); // 'group|attacker|victim' -> timestamp

const ROB_WIN = [
  '%A le mete la mano al bolsillo a %V sin que se entere. Arte pura.',
  '%A ejecuta el robo a la perfección. %V no ve venir nada.',
  '%A saquea a %V sin piedad. Operación limpia.',
  '%A deja a %V mirando la pantalla sin entender qué pasó.',
  '%A le birla la aura a %V con precisión quirúrgica.',
  '%A entra, cobra y sale. %V ni tiempo para reaccionar.',
  '%A limpia a %V en tres segundos. Nivel carterista profesional.',
  '%A se lleva lo que quiere. %V se queda con cara de tonto.',
  '%A silencioso, rápido y letal. %V ni supo de dónde vino el golpe.',
];

const ROB_FAIL = [
  '%A intentó robarle a %V y lo pillaron con la mano en la masa. Patético.',
  '%V para el golpe en seco. %A se va con las manos vacías y encima sangrando.',
  'Robo chapucero de %A. %V no se deja. %A paga la comisión de fracaso.',
  '%A se creyó listo y %V lo vio venir desde el otro lado de la pantalla.',
  '%V huele el intento antes de que empiece. %A sale pitando con pérdidas.',
  'El robo más torpe que ha visto el grupo. %V ni se inmutó. %A paga.',
  '%A sale del intento peor de lo que entró. %V sigue igual de rico.',
  '%A apostó por el robo y perdió doble. Próxima vez lleva más cerebro.',
];

const fmt = n => n.toLocaleString('es-ES');

function pairKey(jid, a, v) {
  return `${jid}|${bareJid(a)}|${bareJid(v)}`;
}

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

  // Pair cooldown
  const pk = pairKey(jid, sender, target);
  const lastRob = pairCooldowns.get(pk);
  if (lastRob && Date.now() - lastRob < PAIR_CD_MS) {
    const wait = Math.ceil((PAIR_CD_MS - (Date.now() - lastRob)) / 60000);
    return sock.sendMessage(jid, {
      text: `Ya intentaste robarle a @${target.split('@')[0]} hace poco. Espera ${wait} min.`,
      mentions: [target],
    }, { quoted: msg });
  }

  const [aData, vData] = await Promise.all([
    getAura(jid, sender),
    getAura(jid, target),
  ]);

  if (aData.current < MIN_AURA) {
    return sock.sendMessage(jid, {
      text: `Necesitas al menos ${MIN_AURA} de aura para intentar un robo. No tienes ni para pipas.`,
    }, { quoted: msg });
  }
  if (vData.current <= 0) {
    return sock.sendMessage(jid, {
      text: `@${target.split('@')[0]} no tiene aura que robar. Busca una víctima con algo encima.`,
      mentions: [target],
    }, { quoted: msg });
  }

  // Stake: first numeric arg, clamped to what both parties can afford
  const raw = parseInt((args || []).find(a => /^\d+$/.test(a)) || STAKE_DEFAULT, 10);
  const maxStake = Math.min(STAKE_MAX, vData.current, aData.current);
  const stake = Math.max(STAKE_FLOOR, Math.min(raw, maxStake));

  const participants = groupMeta?.participants || [];
  const aO = isOwner(sender, msg.key.fromMe, groupMeta);
  const aA = !aO && isAdmin(participants, sender);
  const vO = isOwner(target, false, groupMeta);
  const vA = !vO && isAdmin(participants, target);

  const chance = calcChance(aO, aA, vO, vA, aData.current, vData.current);
  const success = Math.random() < chance;

  pairCooldowns.set(pk, Date.now());

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
