// Bonos de aura por actividad: premian a los miembros activos cada 200/500/1000
// mensajes dentro de una ventana de 24h (el contador vive en casinoStore.js y es
// independiente del de !count; se reinicia a diario, así que los hitos son una
// carrera nueva cada día). Tiene estructura de tragaperras (tramos, botes,
// premio variable) pero lo que se reparte es AURA, no fichas de casino.
// Uses variable ratio reinforcement (the most addictive slot mechanic) — the amount
// varies unpredictably within each tier so players never know what they'll get.
// Members with negative aura have an escalating jackpot chance to incentivize
// continued engagement even in the worst slumps.

const { incrementCasinoCount } = require('./casinoStore');
const { getAura, addAura } = require('./auraStore');
const { pick, fmt } = require('./helpers');


// ─── Phrases ──────────────────────────────────────────────────────────────────

const PHRASES = {
  tier1: {
    win: [
      '200 mensajes y el aura responde. No es el bono gordo, pero es aura real que los fantasmas del grupo no van a ver nunca.',
      'Primer tramo cubierto. El aura paga lo básico: poco, pero más de lo que gana el que solo lee.',
      '200 mensajes registrados. El aura sube porque se ha ganado escribiendo, que es la única forma que existe.',
      'Actividad confirmada y aura entregada. Hay gente aquí que lleva semanas sin acercarse a este número.',
      '200 mensajes: el mínimo para que el aura empiece a tenerte en cuenta. Cobrado.',
    ],
    bigwin: [
      'El aura salió generosa en el primer tramo. 200 mensajes que rindieron más de lo normal.',
      'Bono por encima de la media en Tier 1. El aura tiene su propia lógica y hoy jugó a favor.',
      '200 mensajes y el aura decidió pagar de más. No se puede predecir, por eso engancha.',
      'Tier 1 con bonificación. Mismo esfuerzo, mejor retorno. El aura no siempre paga igual.',
    ],
    jackpot: [
      '💥 BOTE EN EL PRIMER TRAMO. 200 mensajes y el aura se desbordó. Los que no escriben que tomen nota.',
      '200 mensajes y el aura reventó por arriba. Bono grande en el tramo de entrada. Raro y documentado.',
      'Bote gordo de aura en Tier 1. Poco habitual, completamente real, y el marcador lo confirma.',
    ],
  },
  tier2: {
    win: [
      '500 mensajes. Hay gente en este grupo que no llega ni a 50. El aura premia a los que se quedan.',
      'Medio millar de mensajes: la línea que separa a quien vive el grupo de quien pasa de visita. El aura lo nota.',
      '500 mensajes registrados. Constancia que el relleno del grupo no conoce ni de lejos.',
      'El contador marca 500 y el aura responde en consecuencia. Eso no lo alcanza cualquiera.',
    ],
    bigwin: [
      '500 mensajes y el aura respondió con generosidad. Bono de Tier 2 por encima de lo normal.',
      'Bono gordo por llegar a los 500. La constancia tiene su propia economía y hoy pagó bien.',
      '500 mensajes y el aura recompensó en serio. No todos llegan aquí; el que llega, cobra.',
    ],
    jackpot: [
      '🎰 BOTE DE TIER 2. 500 mensajes y el aura se desbordó. De los premios que hacen abrir el chat.',
      '500 mensajes y bote confirmado en Tier 2. Esto queda en el registro del grupo. Los inactivos que miren.',
      'Bote histórico de aura en Tier 2. 500 mensajes reales y un premio que el grupo no va a olvidar.',
    ],
  },
  tier3: {
    win: [
      '1000 mensajes. Eso no se ve todos los días en ningún grupo. El aura lo reconoce y lo paga entero.',
      'Mil mensajes registrados. Hay quien cierra el chat antes de llegar a diez. Otra liga confirmada.',
      '1000 mensajes: el nivel donde los fantasmas del grupo ni saben que existe un bono. El que llega, cobra.',
      'El contador llega a 1000 y el aura abre el tramo máximo. Presencia de las que se recompensan solas.',
    ],
    bigwin: [
      '1000 mensajes y el aura entró en modo gran bono. Ese nivel de actividad se paga distinto.',
      'Tier 3 desbloqueado. Mil mensajes y un bono de aura de los que quedan en la historia del grupo.',
      '1000 mensajes reales y el aura soltó un bono de los que dan conversación durante días.',
    ],
    jackpot: [
      '🏆 1000 MENSAJES — BOTE MÁXIMO DE AURA. El premio más alto que existe. El grupo acaba de ver algo poco común.',
      'Mil mensajes y el aura llegó a su bote máximo. Constancia legendaria, premio legendario. El grupo es testigo.',
      '🏆 BOTE DE TIER 3 CONFIRMADO. 1000 mensajes y aura histórica. Esto va al hall de la fama sin discusión.',
    ],
  },
  redemption: [
    '⚡ REMONTADA DE AURA — Estaba en el sótano y la actividad hizo lo que ninguna excusa consiguió. Bono de comeback. Esto no lo calcula nadie.',
    '⚡ COMEBACK EN DIRECTO — Aura negativa, mensajes positivos. Aquí se premia la constancia antes que el cope, y el marcador acaba de cambiar de cara.',
    '⚡ REDENCIÓN INESPERADA — El grupo daba ese aura por perdida. La actividad tiene su propia economía y acaba de hablar. Bote confirmado.',
    '⚡ EL MARCADOR REESCRITO — Aura negativa, actividad real. Aquí no se juzga el historial, se juzga quién aparece. Resultado: bono de redención.',
    '⚡ BONO DE REDENCIÓN — Lo que meses de excusas no arreglaron, la actividad lo resolvió sola. El aura cambia de signo y el grupo lo vio.',
  ],
};

// ─── Reward rolling (variable ratio — core casino mechanic) ───────────────────

// Tier 1 floor: 20 000. Tier 2 floor: 60 000. Tier 3 floor: 150 000.
// Redemption jackpot: rare but massive (casino's "life-changing win" mechanic).
function rollReward(tier, currentAura) {
  // Redemption check first: negative-aura users get an escalating jackpot chance.
  if (currentAura < 0) {
    const redeemChance = tier === 3 ? 0.15 : tier === 2 ? 0.08 : 0.04;
    if (Math.random() < redeemChance) {
      const base  = tier === 3 ? 400000 : tier === 2 ? 150000 : 50000;
      const range = tier === 3 ? 400000 : tier === 2 ? 150000 : 50000;
      return { amount: base + Math.floor(Math.random() * range), label: 'redemption' };
    }
  }

  const r = Math.random();
  let amount, label;

  if (tier === 1) {
    // 60% win | 25% bigwin | 10% jackpot | 5% megajackpot
    if      (r < 0.60) { amount =  20000 + Math.floor(Math.random() * 10000); label = 'win'; }
    else if (r < 0.85) { amount =  30000 + Math.floor(Math.random() * 20000); label = 'bigwin'; }
    else if (r < 0.95) { amount =  50000 + Math.floor(Math.random() * 30000); label = 'jackpot'; }
    else               { amount =  80000 + Math.floor(Math.random() * 70000); label = 'jackpot'; }
  } else if (tier === 2) {
    // 50% win | 30% bigwin | 15% jackpot | 5% megajackpot
    if      (r < 0.50) { amount =  60000 + Math.floor(Math.random() *  40000); label = 'win'; }
    else if (r < 0.80) { amount = 100000 + Math.floor(Math.random() *  75000); label = 'bigwin'; }
    else if (r < 0.95) { amount = 175000 + Math.floor(Math.random() * 125000); label = 'jackpot'; }
    else               { amount = 300000 + Math.floor(Math.random() * 200000); label = 'jackpot'; }
  } else {
    // tier 3: 40% | 30% | 20% | 10%
    if      (r < 0.40) { amount = 150000 + Math.floor(Math.random() * 100000); label = 'win'; }
    else if (r < 0.70) { amount = 250000 + Math.floor(Math.random() * 200000); label = 'bigwin'; }
    else if (r < 0.90) { amount = 450000 + Math.floor(Math.random() * 300000); label = 'jackpot'; }
    else               { amount = 750000 + Math.floor(Math.random() * 750000); label = 'jackpot'; }
  }

  return { amount, label };
}

// ─── Next milestone display (near-miss — keeps players counting) ──────────────

function nextMilestone(count) {
  const n200  = Math.ceil((count + 1) / 200)  * 200;
  const n500  = Math.ceil((count + 1) / 500)  * 500;
  const n1000 = Math.ceil((count + 1) / 1000) * 1000;
  const next  = Math.min(n200, n500, n1000);
  const tier  = next % 1000 === 0 ? 3 : next % 500 === 0 ? 2 : 1;
  return { tier, remaining: next - count };
}

// ─── Main hook (called on every group message, non-blocking) ──────────────────

async function checkCasinoMilestone(sock, jid, sender) {
  const count = await incrementCasinoCount(jid, sender);

  let tier = 0;
  if      (count % 1000 === 0) tier = 3;
  else if (count % 500  === 0) tier = 2;
  else if (count % 200  === 0) tier = 1;
  if (!tier) return;

  const currentAura = await getAura(jid, sender);
  const { amount, label } = rollReward(tier, currentAura);
  const { current } = await addAura(jid, sender, amount);

  const phrasePool = label === 'redemption'
    ? PHRASES.redemption
    : PHRASES[`tier${tier}`][label];
  const phrase = pick(phrasePool);

  const userTag   = `@${sender.split('@')[0]}`;
  // Cabecera de aura, no de casino: el sistema tiene estructura de tramos y
  // botes, pero lo que se reparte es aura y el título lo deja claro.
  const tierHdr   = tier === 3 ? '🏆 *BONO DE AURA · TIER 3 · 1000 MENSAJES*'
                  : tier === 2 ? '🎰 *BONO DE AURA · TIER 2 · 500 MENSAJES*'
                  :              '🎲 *BONO DE AURA · TIER 1 · 200 MENSAJES*';
  const next      = nextMilestone(count);
  const nextLabel = next.tier === 3 ? 'Tier 3 (1000 msgs)'
                  : next.tier === 2 ? 'Tier 2 (500 msgs)'
                  :                   'Tier 1 (200 msgs)';

  const text =
    `${tierHdr}\n\n` +
    `${userTag} lleva *${fmt(count)} mensajes* hoy\n\n` +
    `${phrase}\n\n` +
    `${userTag}  +${fmt(amount)} de aura → *${fmt(current)}*\n\n` +
    `_Próximo bono: ${nextLabel} — faltan ${fmt(next.remaining)} mensajes_`;

  // Solo se menciona a quien cobra el bono, y únicamente para que su nombre se
  // renderice en el mensaje. Antes esto hacía un tagall invisible que notificaba
  // al grupo entero en cada hito: en un grupo activo eso es un bombardeo
  // constante de notificaciones y resulta pesado. El resto no recibe nada.
  await sock.sendMessage(jid, { text, mentions: [sender] });
}

module.exports = { checkCasinoMilestone, nextMilestone };
