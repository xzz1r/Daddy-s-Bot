const { isOwner, isAdmin, getSender, getTarget, bareJid } = require('../utils/wa');
const { getAura, addAura } = require('../utils/auraStore');
const { pick } = require('../utils/helpers');

const STAKE_DEFAULT   = 200;
const STAKE_MAX       = 1000;
const STAKE_FLOOR     = 10;
const MIN_AURA        = 50;
const ROB_COOLDOWN_MS = 10 * 60 * 1000; // 10 min per attacker per group

const lastRob = new Map(); // `${groupJid}|${bareJid}` -> timestamp

// %A = atacante (ladrón), %V = víctima
const ROB_WIN = [
  '%A le roba el aura a %V en plena vista del grupo. %V no pudo defenderla porque los subhumanos no tienen mecanismos de defensa — ni genéticos ni sociales.',
  'Pillaje exitoso de %A sobre %V. El aura de %V cambió de dueño sin que %V pudiera hacer absolutamente nada. Eso resume bien su situación en general.',
  '%A le arranca el aura a %V sin resistencia. %V intentó reaccionar pero la genética tarda más en procesar la amenaza cuando llevas toda la vida siendo relleno.',
  'Robo consumado. %A entró, tomó el aura de %V y se fue. %V se queda con la cara de siempre: la de alguien a quien le pasan cosas y no entiende por qué.',
  '%A desangra a %V de aura delante de todos. %V puede cope todo lo que quiera pero el marcador no miente, igual que el espejo.',
  'El aura de %V acaba de cambiar de manos. %A lo ejecutó limpio. %V lo procesará durante días y al final lo atribuirá a la mala suerte porque admitir la realidad duele más.',
  '%A roba el aura de %V y el grupo lo ve. Nadie interviene. Nadie defiende a %V. Así funciona la jerarquía social: el relleno no genera solidaridad.',
  'Saqueo directo de %A a %V. %V perdió aura hoy. Mañana perderá más. La tendencia está clara y no es culpa de la economía.',
  '%A le quita el aura a %V con la facilidad de quien le saca caramelos a un niño. %V tiene la misma capacidad de resistencia que el niño y aproximadamente el mismo PSL.',
  '%A drena el aura de %V públicamente. %V lo registra como "mala suerte". Los que analizan lo registran como what it is: tier gap en acción.',
  'El aura de %V ahora es de %A. %V ni tuvo tiempo de reaccionar. Cuando eres invisible para las foids también lo eres para la seguridad. Correlación directa.',
  '%A trata el aura de %V como recursos propios porque en la práctica lo son. El relleno no retiene lo que tiene. Ley natural del grupo.',
  'Robo limpio, sin testigos molestos y con el aura de %V en el bolsillo de %A. %V aprenderá. O no. Probablemente no.',
  '%A le hace looksmining directo al aura de %V. %V tenía aura pero cero frame para protegerla. Tener sin poder retener: la maldición del subhuman.',
  'El aura de %V acaba de financiar el ascenso de %A. %V es el tipo de persona que involuntariamente trabaja para la jerarquía que lo aplasta. Sin saberlo. Sin poder evitarlo.',
];

const ROB_FAIL = [
  '%A intentó robar el aura de %V y falló. Ahora paga multa. Resultado esperado para quien ataca con la confianza de un Chad y la genética de un NPC.',
  'Robo fallido de %A. %V no hizo nada especial — el universo simplemente no deja robar a los que nacieron en tier de víctima. Ironía cósmica.',
  '%A salió a robar aura y volvió con menos de la que tenía. %V sigue intacto. La jerarquía se autoprotege de formas que %A no comprende todavía.',
  'Intento de robo de %A sobre %V: bloqueado, expuesto y cobrado. %A pagó la multa de pensar que estaba en un tier que no era el suyo.',
  '%A falla el robo y pierde aura en el intento. %V ni se enteró. Eso es lo más humillante: no que te paren, sino que ni noten el intento.',
  'El robo de %A fue tan subhuman que el propio sistema lo rechazó. %V no movió un dedo. Algunas personas generan un campo de fracaso que las rodea a todas horas.',
  '%A se creyó capaz de robarle a %V y la realidad le presentó la factura al instante. El aura de %V sigue intacta. El ego de %A no.',
  'Pillaje fallido. %A pierde aura por intentarlo. %V no pierde nada. Hay gente que intenta subir robando y solo consigue confirmar por qué está abajo.',
  '%A apostó por el golpe con una confianza que su historial no justificaba. %V lo dejó sin nada. La autoestima inflada tiene costes reales.',
  'El robo de %A quedó expuesto ante el grupo entero. Ni roba bien ni se ve bien. El aura baja, la vergüenza sube y %V sigue con todo lo suyo.',
  '%A sale con las manos vacías y la cuenta en negativo. %V queda intacto e indiferente. Clásico de los que intentan saltarse la jerarquía sin tener los recursos para hacerlo.',
  'Intento de robo: fallido. Penalización: aplicada. %A aprenderá que atacar hacia arriba sin frame es solo aura donada con pasos extra.',
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

  // Cooldown: 10 min per attacker per group
  const coolKey = `${jid}|${bareJid(sender)}`;
  const last = lastRob.get(coolKey) || 0;
  const remaining = ROB_COOLDOWN_MS - (Date.now() - last);
  if (remaining > 0) {
    const mins = Math.ceil(remaining / 60_000);
    return sock.sendMessage(jid, {
      text: `Espera *${mins}min* antes de volver a robar.`,
    }, { quoted: msg });
  }

  const [auraA, auraV] = await Promise.all([
    getAura(jid, sender),
    getAura(jid, target),
  ]);

  if (auraA < MIN_AURA) {
    return sock.sendMessage(jid, {
      text: `Necesitas al menos ${MIN_AURA} de aura para intentar un robo.`,
    }, { quoted: msg });
  }
  if (auraV <= 0) {
    return sock.sendMessage(jid, {
      text: `@${target.split('@')[0]} no tiene aura que robar.`,
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

  // Set cooldown regardless of outcome
  lastRob.set(coolKey, Date.now());

  if (success) {
    const [aNew, vNew] = await Promise.all([
      addAura(jid, sender, +stake),
      addAura(jid, target, -stake),
    ]);
    const phrase = pick(ROB_WIN).replace(/%A/g, aTag).replace(/%V/g, vTag);
    const text =
      `🔴 *ROBO EXITOSO*\n` +
      `${aTag} le roba *${fmt(stake)} de aura* a ${vTag}\n\n` +
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
    `⚪ *ROBO FALLIDO*\n` +
    `${aTag} intentó robarle *${fmt(stake)} de aura* a ${vTag}\n\n` +
    `${phrase}\n\n` +
    `${aTag}  −${fmt(penalty)} (penalización) → *${fmt(aNew.current)}*\n` +
    `${vTag}  sin cambios → *${fmt(auraV)}*`;
  return sock.sendMessage(jid, { text, mentions: [sender, target] });
}

module.exports = { cmdRobo };
