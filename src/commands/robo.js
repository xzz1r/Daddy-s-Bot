const { isOwner, isAdmin, getSender, getTarget, bareJid } = require('../utils/wa');
const { getAura, addAura } = require('../utils/auraStore');
const { pickFresh } = require('../utils/helpers');

const STAKE_DEFAULT   = 200;
const STAKE_MAX       = 1000;
const STAKE_FLOOR     = 10;
const MIN_AURA        = 50;
const ROB_COOLDOWN_MS = 10 * 60 * 1000; // 10 min per attacker per group

const lastRob = new Map(); // `${groupJid}|${bareJid}` -> timestamp

// %A = atacante (ladrón), %V = víctima
const ROB_WIN = [
  '%A le roba el aura a %V en plena cara del grupo. %V no pudo defenderla porque los inútiles como él no tienen con qué — ni huevos, ni cerebro, ni respeto.',
  'Saqueo exitoso de %A sobre %V. El aura de %V cambió de dueño sin que ese pobre fracasado pudiera hacer una puta mierda. Resume bien su vida entera.',
  '%A le arranca el aura a %V sin resistencia. %V intentó reaccionar, pero llevas toda la vida siendo basura y eso te deja lento hasta para que te roben.',
  'Robo consumado. %A entró, se llevó el aura de %V y se fue. %V se queda con su cara de pringado de siempre, sin entender por qué todos le pasan por encima.',
  '%A desangra a %V de aura delante de todos. %V puede llorar y poner excusas lo que quiera, pero el marcador no miente. El espejo tampoco, por cierto.',
  'El aura de %V cambió de manos. %A lo ejecutó limpio. %V lo va a masticar días y al final lo culpará a la mala suerte, porque admitir que es un inútil duele más.',
  '%A roba el aura de %V y el grupo lo ve. Nadie mueve un dedo por %V. Así de claro: a la basura nadie la defiende, ni cuando la roban en directo.',
  'Saqueo directo de %A a %V. %V perdió aura hoy. Mañana perderá más, y pasado también. No es la economía, perdedor: eres tú, que naciste para perder.',
  '%A le quita el aura a %V con la facilidad de quitarle un caramelo a un crío. %V se defiende igual de bien que el crío, y tiene aproximadamente el mismo cerebro.',
  '%A drena el aura de %V en público. %V lo apunta como "mala suerte". Todos los demás lo apuntan como lo que es: un fracasado al que cualquiera le roba.',
  'El aura de %V ahora es de %A. Ni tiempo de reaccionar tuvo el pobre infeliz. Cuando eres invisible y don nadie, hasta robarte es fácil. Pura lógica.',
  '%A trata el aura de %V como suya, porque en la práctica lo es. La basura no retiene nada de lo que tiene. Ley natural del grupo, y %V es el ejemplo.',
  'Robo limpio y el aura de %V en el bolsillo de %A. %V aprenderá la lección. O no, porque para aprender hace falta cerebro, y ahí %V va muy justo.',
  '%A le hace una limpieza completa al aura de %V. %V tenía aura pero cero carácter para protegerla. Tener sin poder retener: la maldición del perdedor nato.',
  'El aura de %V acaba de financiar el ascenso de %A. %V es de esos que trabajan gratis para los que lo pisan, sin enterarse y sin poder evitarlo. Triste.',
];

const ROB_FAIL = [
  '%A intentó robarle el aura a %V y falló como el inútil que es. Ahora paga multa. Atacó con la confianza de un grande y el talento de un don nadie.',
  'Robo fallido de %A. %V no hizo nada especial — simplemente hasta el universo se ríe de los pringados que intentan robar sin tener ni idea, como %A.',
  '%A salió a robar aura y volvió con menos de la que tenía. %V sigue intacto. Hasta para robar eres un fracaso, %A. Impresionante nivel de inutilidad.',
  'Intento de robo de %A sobre %V: bloqueado, expuesto y cobrado. %A pagó la multa por creerse algo que no es. Sigue siendo basura, ahora con menos aura.',
  '%A falla el robo y pierde aura en el intento. %V ni se enteró del atentado. Eso es lo más humillante: no que te paren, sino que ni noten que existías, perdedor.',
  'El robo de %A fue tan patético que el propio sistema lo rechazó de asco. %V no movió un dedo. Hay gente que apesta a fracaso, y %A es el caso de manual.',
  '%A se creyó capaz de robarle a %V y la realidad le metió la factura por la cara al instante. El aura de %V intacta. El ego de %A, hecho mierda en el suelo.',
  'Saqueo fallido. %A pierde aura por intentarlo, %V no pierde nada. Intentar subir robando y hundirte más: el resumen perfecto de por qué %A está abajo.',
  '%A apostó al golpe con una chulería que su patético historial no respaldaba. %V lo dejó con una mano delante y otra detrás. La autoestima inflada se paga, fracasado.',
  'El robo de %A quedó expuesto ante el grupo entero. Ni roba bien ni vale nada. El aura baja, la vergüenza sube y %V sigue tan tranquilo con todo lo suyo.',
  '%A sale con las manos vacías y la cuenta en rojo. %V ni se inmuta. Clásico del pringado que quiere saltarse su sitio sin tener ni con qué intentarlo.',
  'Intento de robo: fallido. Penalización: aplicada. %A aprenderá que cuando eres un inútil, atacar a otros solo es regalar tu aura con pasos extra. Patético.',
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
    const phrase = pickFresh(ROB_WIN, `${jid}|robo|win`).replace(/%A/g, aTag).replace(/%V/g, vTag);
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
  const phrase = pickFresh(ROB_FAIL, `${jid}|robo|fail`).replace(/%A/g, aTag).replace(/%V/g, vTag);
  const text =
    `⚪ *ROBO FALLIDO*\n` +
    `${aTag} intentó robarle *${fmt(stake)} de aura* a ${vTag}\n\n` +
    `${phrase}\n\n` +
    `${aTag}  −${fmt(penalty)} (penalización) → *${fmt(aNew.current)}*\n` +
    `${vTag}  sin cambios → *${fmt(auraV)}*`;
  return sock.sendMessage(jid, { text, mentions: [sender, target] });
}

module.exports = { cmdRobo };
