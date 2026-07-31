const { isOwner, isMainOwner, isAdmin, getSender, getTarget, canonicalJid, sameUser } = require('../utils/wa');
const { getAura, addAura } = require('../utils/auraStore');
const { pickFresh, fmt } = require('../utils/helpers');

const STAKE_DEFAULT   = 200;
const STAKE_MAX       = 1000;
const STAKE_FLOOR     = 10;
const MIN_AURA        = 50;
const ROB_COOLDOWN_MS = 10 * 60 * 1000; // 10 min per attacker per group

const lastRob = new Map(); // `${groupJid}|${canonicalJid}` -> timestamp

// %A = atacante (ladrón), %V = víctima
const ROB_WIN = [
  '%A le roba el aura a %V en plena cara del grupo. %V se defendió como se defiende de todo en la vida: con cero éxito y mucha cara de sorpresa.',
  'Saqueo limpio de %A sobre %V. El aura cambió de dueño tan rápido que %V todavía la está buscando en los bolsillos, el pobre infeliz.',
  '%A le arranca el aura a %V sin resistencia. Robarle a %V es como quitarle el móvil a una estatua: ni se mueve, ni se queja, ni se entera.',
  'Robo consumado. %A entró, cogió el aura de %V y se fue silbando. %V se quedó con cara de puto pasmado, la única que sabe poner este inútil ante cualquier cosa.',
  '%A desvalija a %V delante de todos. %V puede llorar y poner excusas, pero el marcador no miente y el espejo, por desgracia para él, tampoco.',
  'El aura de %V cambió de manos en un parpadeo. %A lo ejecutó limpio. %V lo culpará a la mala suerte, porque admitir que es un blando le dolería más que el robo.',
  '%A roba el aura de %V y nadie en el grupo mueve un dedo por defenderlo. A %V lo dejan caer con la misma facilidad con la que se cae solo, por pura costumbre.',
  'Saqueo directo de %A a %V. Hoy %V pierde aura; mañana perderá otra cosa. No es la economía, perdedor: eres tú, que tienes un agujero por donde se te va todo.',
  '%A le quita el aura a %V con la facilidad de robarle el caramelo a un crío. La diferencia es que el crío al menos berrea; %V, pobre mierda blanda, solo parpadea como un pasmarote.',
  '%A drena el aura de %V en público. %V lo apunta como "mala racha". El grupo lo apunta como lo que es: el cajero andante de cualquiera con un poco de cara.',
  'El aura de %V ahora es de %A, y ni tiempo de reaccionar tuvo. Cuando eres tan invisible, hasta robarte resulta cómodo: nadie te mira, ni para vigilarte.',
  '%A trata el aura de %V como propia, porque en la práctica lo es. %V no retiene nada de lo que toca; es un colador con forma de persona y autoestima de saldo.',
  'Robo limpio y el aura de %V en el bolsillo de %A. %V aprenderá la lección. Es broma: este inútil no aprende una puta mierda, tropieza con la misma piedra hasta cansarla.',
  '%A le hace una limpieza completa al aura de %V. %V tenía aura, pero cero carácter para protegerla. Tener sin saber retener: el deporte nacional de los pringados.',
  'El aura de %V acaba de financiar el ascenso de %A. %V es de esos que trabajan gratis para quien los pisa, sin enterarse y sin cobrar. Mecenas de su propio verdugo.',
];

const ROB_FAIL = [
  '%A intentó robarle el aura a %V y falló como falla en todo: con confianza de campeón y puntería de tuerto. Ahora paga la multa, lo único que se le da bien.',
  'Robo fallido de %A. %V ni se despeinó. Hasta el universo se ríe de los que salen a robar sin tener ni idea, y %A acaba de dar el espectáculo gratis.',
  '%A salió a robar aura y volvió con menos de la que tenía. Hasta para delinquir eres un fracaso, %A. Te habría salido más rentable quedarte quieto, tu especialidad.',
  'Intento de robo de %A sobre %V: bloqueado, expuesto y cobrado con intereses. %A pagó por creerse listo. Lección cara para una cabeza que vale tan poco.',
  '%A falla el robo y pierde aura en el intento. Lo más humillante no es que lo pararan, es que %V ni se enteró de que existía un atacante. Invisible hasta para sus víctimas.',
  'El robo de %A fue tan torpe que el propio sistema lo rechazó de oficio. %V no movió un dedo. Hay gente que apesta a fracaso, y %A acaba de perfumar el grupo entero.',
  '%A se creyó capaz de robarle a %V, y la realidad le presentó la factura por la cara. El aura de %V intacta; el ego de %A, esparcido por el suelo para que lo barran.',
  'Saqueo fallido. %A pierde aura por intentarlo; %V no pierde nada. Salir a subir robando y bajar más: el resumen perfecto de por qué %A vive debajo de todos.',
  '%A apostó al golpe con una chulería que su patético historial no respaldaba. %V lo dejó con una mano delante y otra detrás: como %A llegó al mundo y como se irá.',
  'El robo de %A quedó expuesto ante el grupo entero. Ni roba bien ni disimula. El aura baja, la vergüenza sube, y %V sigue tan tranquilo, sin saber que fue objetivo.',
  '%A sale con las manos vacías y la cuenta en rojo. Clásico del pringado que quiere saltarse la cola de la vida y acaba pagando por estar en ella. %V ni levanta la vista.',
  'Intento de robo: fallido. Penalización: aplicada. %A acaba de aprender que cuando eres tan inútil, atacar a otros es solo regalar tu aura con pasos intermedios.',
];


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
  if (sameUser(target, sender)) {
    return sock.sendMessage(jid, { text: 'No puedes robarte a ti mismo.' }, { quoted: msg });
  }

  // Cooldown: 10 min per attacker per group
  const coolKey = `${jid}|${canonicalJid(sender)}`;
  const last = lastRob.get(coolKey) || 0;
  const remaining = ROB_COOLDOWN_MS - (Date.now() - last);
  if (remaining > 0) {
    const mins = Math.ceil(remaining / 60_000);
    return sock.sendMessage(jid, {
      text: `Espera *${mins}min* antes de volver a robar.`,
    }, { quoted: msg });
  }

  // Claim the cooldown synchronously, BEFORE any await, so two concurrent !robo
  // can't both pass the check above and steal twice. Refunded on the paths below
  // where no robbery actually happens, so a failed attempt doesn't burn 10 min.
  if (lastRob.size >= 2000) lastRob.delete(lastRob.keys().next().value);
  lastRob.set(coolKey, Date.now());

  const [auraA, auraV] = await Promise.all([
    getAura(jid, sender),
    getAura(jid, target),
  ]);

  if (auraA < MIN_AURA) {
    lastRob.delete(coolKey); // no robó: devuelve el cooldown
    return sock.sendMessage(jid, {
      text: `Necesitas al menos ${MIN_AURA} de aura para intentar un robo.`,
    }, { quoted: msg });
  }
  if (auraV <= 0) {
    lastRob.delete(coolKey); // no robó: devuelve el cooldown
    return sock.sendMessage(jid, {
      text: `@${target.split('@')[0]} no tiene aura que robar.`,
      mentions: [target],
    }, { quoted: msg });
  }

  // Stake: first numeric arg, clamped to what both parties can afford
  const raw = parseInt((args || []).find(a => /^\d+$/.test(a)) || STAKE_DEFAULT, 10);
  const maxStake = Math.min(STAKE_MAX, auraV, auraA);
  const stake = Math.max(maxStake >= STAKE_FLOOR ? STAKE_FLOOR : 1, Math.min(raw, maxStake));

  const participants = groupMeta?.participants || [];
  const aO = isOwner(sender, msg.key.fromMe, groupMeta);
  const aA = !aO && isAdmin(participants, sender);
  const vO = isOwner(target, false, groupMeta);
  const vA = !vO && isAdmin(participants, target);

  const chance = calcChance(aO, aA, vO, vA, auraA, auraV);
  let success = Math.random() < chance;

  // Rig a favor del owner principal:
  // · si la VÍCTIMA es el owner, el robo SIEMPRE falla (no pierde aura; el
  //   atacante igual paga la penalización normal por la vía de fallo).
  // · si el ATACANTE es el owner, el robo SIEMPRE tiene éxito.
  if (isMainOwner(target, false, groupMeta)) success = false;
  else if (isMainOwner(sender, msg.key.fromMe, groupMeta)) success = true;

  const aTag = `@${sender.split('@')[0]}`;
  const vTag = `@${target.split('@')[0]}`;

  // Cooldown was already claimed above (before the awaits) to close the
  // double-rob race; it stays set here whether the roll wins or loses.

  if (success) {
    const [aNew, vNew] = await Promise.all([
      addAura(jid, sender, +stake),
      addAura(jid, target, -stake),
    ]);
    const phrase = pickFresh(ROB_WIN, `${jid}|robo|win`).replace(/%A/g, aTag).replace(/%V/g, vTag);
    const text =
      `*ROBO EXITOSO*\n` +
      `${aTag} le roba *${fmt(stake)} de aura* a ${vTag}\n\n` +
      `${phrase}\n\n` +
      `${aTag} +${fmt(stake)} → *${fmt(aNew.current)}*\n` +
      `${vTag} −${fmt(stake)} → *${fmt(vNew.current)}*`;
    return sock.sendMessage(jid, { text, mentions: [sender, target] });
  }

  // Failed: attacker pays half the stake as penalty, target keeps everything
  const penalty = Math.ceil(stake / 2);
  const aNew = await addAura(jid, sender, -penalty);
  const phrase = pickFresh(ROB_FAIL, `${jid}|robo|fail`).replace(/%A/g, aTag).replace(/%V/g, vTag);
  const text =
    `*ROBO FALLIDO*\n` +
    `${aTag} intentó robarle *${fmt(stake)} de aura* a ${vTag}\n\n` +
    `${phrase}\n\n` +
    `${aTag} −${fmt(penalty)} (penalización) → *${fmt(aNew.current)}*\n` +
    `${vTag} sin cambios → *${fmt(auraV)}*`;
  return sock.sendMessage(jid, { text, mentions: [sender, target] });
}

module.exports = { cmdRobo };
