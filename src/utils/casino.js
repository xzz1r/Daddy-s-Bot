// Casino milestone system: rewards active group members every 200/500/1000 messages
// within a rolling 24h window (the casino counter lives in casinoStore.js and is
// separate from the normal message counter used by !count; it resets daily so the
// milestones are a fresh race every day).
// Uses variable ratio reinforcement (the most addictive slot mechanic) — the amount
// varies unpredictably within each tier so players never know what they'll get.
// Members with negative aura have an escalating jackpot chance to incentivize
// continued engagement even in the worst slumps.

const { incrementCasinoCount } = require('./casinoStore');
const { getAura, addAura } = require('./auraStore');
const { pick } = require('./helpers');

const fmt = n => n.toLocaleString('es-ES');

// The milestone notification pings the whole group (FOMO mechanic), but doing
// that on every hit spams large/busy groups and risks WhatsApp rate-limiting.
// Throttle the group-wide ping to at most once per group per window; outside it,
// only the winner is mentioned. The reward and message always fire regardless.
const TAGALL_COOLDOWN_MS = 10 * 60 * 1000;
const lastTagall = new Map(); // groupJid -> timestamp

// ─── Phrases ──────────────────────────────────────────────────────────────────

const PHRASES = {
  tier1: {
    win: [
      '200 mensajes registrados. El sistema paga lo básico: no es el gordo, pero es real y los fantasmas del grupo no lo verán jamás.',
      'La máquina escupió el primer bote. Premio modesto, real. El que no escribe no cobra. Simple.',
      '200 mensajes documentados y el medidor responde. Los que solo leen pueden seguir mirando.',
      'Actividad confirmada. Premio de nivel de entrada. Hay gente en este grupo que lleva semanas sin llegar aquí.',
      '200 mensajes: el precio mínimo de admisión al sistema de bonos. Pagado. Premio entregado.',
    ],
    bigwin: [
      'El slot salió generoso. 200 mensajes que valieron más de lo que nadie esperaba. Así funciona la máquina.',
      'Premio por encima de la media para el primer hito. La máquina tiene su propia lógica y hoy favoreció.',
      '200 mensajes y la máquina decidió pagar por encima. Nadie lo puede predecir. Por eso funciona.',
      'Bono de Tier 1 con bonificación. 200 mensajes, resultado mejor de lo habitual.',
    ],
    jackpot: [
      '💥 JACKPOT en el nivel de entrada. 200 mensajes y la tragaperras se volvió loca. Los que no escriben que observen.',
      '200 mensajes y el slot reventó. Premio grande en el primer tier. El grupo es testigo de que esto existe.',
      'La máquina del grupo escupió el bote gordo en Tier 1. Raro, real, documentado.',
    ],
  },
  tier2: {
    win: [
      '500 mensajes. Hay gente en este grupo que no llega ni a 50. Premio de los que se quedan.',
      'Medio millar de mensajes: separación clara entre quien vive aquí y quien de visita. El sistema lo premia.',
      '500 mensajes documentados. Constancia que el relleno desconoce por definición.',
      'El marcador dice 500. Eso no lo consigue cualquiera. El bono de Tier 2 confirma la jerarquía de actividad.',
    ],
    bigwin: [
      '500 mensajes y el slot respondió con generosidad. Premio de Tier 2 por encima de la media.',
      'Bono gordo por llegar a los 500. La consistencia tiene su propia economía y hoy pagó bien.',
      '500 mensajes y la máquina decidió recompensar en serio. No todos llegan aquí. Los que llegan, cobran.',
    ],
    jackpot: [
      '🎰 JACKPOT DE TIER 2. 500 mensajes y la tragaperras del grupo se desbordó. El tipo de premio que hace abrir el chat.',
      '500 mensajes, jackpot confirmado en Tier 2. Esto va al registro del grupo. Los inactivos que tomen nota.',
      'Bote histórico de Tier 2. 500 mensajes reales, premio de los que el grupo no va a olvidar.',
    ],
  },
  tier3: {
    win: [
      '1000 mensajes. Eso no se ve todos los días en ningún grupo. El sistema lo reconoce y lo paga.',
      'Mil mensajes documentados. Hay gente que cierra el chat antes de llegar a 10. Diferencia de tier confirmada.',
      '1000 mensajes: el nivel donde los fantasmas del grupo ni saben que existe un premio. El que llega, cobra.',
      'El marcador marca 1000 y el sistema activa el Tier 3. Presencia legendaria recompensada en consecuencia.',
    ],
    bigwin: [
      '1000 mensajes y la máquina entró en modo gran premio. Nivel de actividad que se paga diferente.',
      'Tier 3 activado. Mil mensajes, premio de los que quedan grabados en la historia del grupo.',
      '1000 mensajes reales. La máquina del grupo escupió un bono de los que crean conversación durante días.',
    ],
    jackpot: [
      '🏆 1000 MENSAJES — JACKPOT DE TIER 3. El premio más alto del sistema. El grupo acaba de ver algo que no pasa todos los días.',
      'Mil mensajes y el slot del grupo llegó al bote máximo. Constancia legendaria. Premio legendario. El grupo es testigo.',
      '🏆 TIER 3 JACKPOT CONFIRMADO. 1000 mensajes, bote histórico. Esto va al hall de la fama del grupo sin discusión.',
    ],
  },
  redemption: [
    '⚡ JACKPOT DE REDENCIÓN — El aura estaba en el sótano pero la actividad acaba de hacer lo que el cope no pudo. La tragaperras escupe el bote de comeback. Esto no lo calcula nadie.',
    '⚡ COMEBACK DOCUMENTADO EN DIRECTO — Aura negativa, mensajes positivos. El sistema premia la constancia antes que el cope. Jackpot de redención confirmado y el marcador cambia de cara.',
    '⚡ REDENCIÓN INESPERADA — El grupo pensaba que ese aura no volvía. La actividad tiene su propia economía y acaba de hablar. Jackpot. El grupo entero es testigo.',
    '⚡ LA MÁQUINA REESCRIBIÓ EL MARCADOR — Aura negativa, actividad real. El casino del grupo no juzga el historial, juzga la constancia. Resultado: jackpot de redención confirmado.',
    '⚡ BOTE DE REDENCIÓN — Lo que meses de cope no consiguieron, la actividad lo resolvió en un clic. El marcador cambia. El grupo lo vio en directo.',
  ],
};

// ─── Reward rolling (variable ratio — core casino mechanic) ───────────────────

// Tier 1 expected ~2300 aura. Tier 2 ~12000. Tier 3 ~37000.
// Redemption jackpot: rare but massive (casino's "life-changing win" mechanic).
function rollReward(tier, currentAura) {
  // Redemption check first: negative-aura users get an escalating jackpot chance.
  // This is the hook that keeps even the most negative players engaged.
  if (currentAura < 0) {
    const redeemChance = tier === 3 ? 0.15 : tier === 2 ? 0.08 : 0.04;
    if (Math.random() < redeemChance) {
      const base  = tier === 3 ? 100000 : tier === 2 ?  50000 : 20000;
      const range = tier === 3 ? 200000 : tier === 2 ?  50000 : 30000;
      return { amount: base + Math.floor(Math.random() * range), label: 'redemption' };
    }
  }

  const r = Math.random();
  let amount, label;

  if (tier === 1) {
    // 55% small | 27% medium | 13% big | 5% jackpot
    if      (r < 0.55) { amount = 200  + Math.floor(Math.random() * 800);   label = 'win'; }
    else if (r < 0.82) { amount = 1000 + Math.floor(Math.random() * 2000);  label = 'bigwin'; }
    else if (r < 0.95) { amount = 3000 + Math.floor(Math.random() * 5000);  label = 'jackpot'; }
    else               { amount = 8000 + Math.floor(Math.random() * 12000); label = 'jackpot'; }
  } else if (tier === 2) {
    // 45% medium | 30% big | 17% jackpot | 8% megajackpot
    if      (r < 0.45) { amount = 2000  + Math.floor(Math.random() * 4000);  label = 'win'; }
    else if (r < 0.75) { amount = 6000  + Math.floor(Math.random() * 8000);  label = 'bigwin'; }
    else if (r < 0.92) { amount = 14000 + Math.floor(Math.random() * 16000); label = 'jackpot'; }
    else               { amount = 30000 + Math.floor(Math.random() * 30000); label = 'jackpot'; }
  } else {
    // tier 3: 35% | 30% | 20% | 15%
    if      (r < 0.35) { amount = 5000  + Math.floor(Math.random() * 10000); label = 'win'; }
    else if (r < 0.65) { amount = 15000 + Math.floor(Math.random() * 20000); label = 'bigwin'; }
    else if (r < 0.85) { amount = 35000 + Math.floor(Math.random() * 30000); label = 'jackpot'; }
    else               { amount = 65000 + Math.floor(Math.random() * 85000); label = 'jackpot'; }
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
  const tierHdr   = tier === 3 ? '🏆 *TIER 3 · 1000 MENSAJES*'
                  : tier === 2 ? '🎰 *TIER 2 · 500 MENSAJES*'
                  :              '🎲 *TIER 1 · 200 MENSAJES*';
  const next      = nextMilestone(count);
  const nextLabel = next.tier === 3 ? 'Tier 3 (1000 msgs)'
                  : next.tier === 2 ? 'Tier 2 (500 msgs)'
                  :                   'Tier 1 (200 msgs)';

  const text =
    `${tierHdr}\n\n` +
    `${userTag} lleva *${fmt(count)} mensajes* en el grupo\n\n` +
    `${phrase}\n\n` +
    `${userTag}  +${fmt(amount)} de aura → *${fmt(current)}*\n\n` +
    `_Próximo bono: ${nextLabel} — faltan ${fmt(next.remaining)} mensajes_`;

  // Invisible tagall: everyone gets pinged but no @number spam in the text.
  // FOMO mechanic, but throttled per group so busy groups aren't mass-pinged on
  // every milestone (spam + rate-limit risk). Metadata is only fetched when we
  // actually intend to tag — outside the window only the winner is mentioned.
  let mentions = [sender];
  const now = Date.now();
  if (now - (lastTagall.get(jid) || 0) >= TAGALL_COOLDOWN_MS) {
    const meta = await sock.groupMetadata(jid).catch(() => null);
    if (meta?.participants?.length) {
      mentions = [...new Set([sender, ...meta.participants.map(p => p.id)])];
      lastTagall.set(jid, now);
    }
  }

  await sock.sendMessage(jid, { text, mentions });
}

module.exports = { checkCasinoMilestone };
