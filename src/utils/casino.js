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
const { anotarMensaje } = require('./rachaStore');
const { getAura, addAura } = require('./auraStore');
const { BONOS, REDENCION, RACHA, rango } = require('./economia');
const { HITO: RACHA_HITO, ROTA: RACHA_ROTA } = require('../data/rachaPhrases');
const { pickFresh, fmt } = require('./helpers');
const { isBotEnabled, isAuraEnabled } = require('./state');


// ─── Phrases ──────────────────────────────────────────────────────────────────

const PHRASES = {
  tier1: {
    win: [
      '200 mensajes y el aura responde. No es el bono gordo, pero es aura real que los fantasmas del grupo no van a ver nunca.',
      'Primer tramo cubierto. El aura paga lo básico: poco, pero más de lo que gana el que solo lee.',
      '200 mensajes registrados. El aura sube porque se ha ganado escribiendo, que es la única forma que existe.',
      'Actividad confirmada y aura entregada. Hay gente aquí que lleva semanas sin acercarse a este número.',
      '200 mensajes: el mínimo para que el aura empiece a tenerte en cuenta. Cobrado.',
      '200 mensajes. Poco, pero más de lo que ha escrito la mitad del grupo en todo el mes.',
      'Tier 1 cubierto. El aura paga y el que no escribe no cobra. Así de fácil.',
      '200 mensajes y el aura responde en consecuencia. Poco pero honrado, como tu aportación.',
      'Actividad registrada. 200 mensajes que los muertos del grupo no van a juntar ni en sueños.',
      '200. El aura paga a los que aparecen y a los demás les paga una mierda.',
    ],
    bigwin: [
      'El aura salió generosa en el primer tramo. 200 mensajes que rindieron más de lo normal.',
      'Bono por encima de la media en Tier 1. El aura tiene su propia lógica y hoy jugó a favor.',
      '200 mensajes y el aura decidió pagar de más. No se puede predecir, por eso engancha.',
      'Tier 1 con bonificación. Mismo esfuerzo, mejor retorno. El aura no siempre paga igual.',
      'Bono generoso en Tier 1. 200 mensajes que han rendido más de lo que suelen. Buena tirada.',
      '200 mensajes y el aura ha soltado más de la cuenta. No preguntes por qué, disfruta.',
      'Tier 1 pagado por encima. El aura tiene días buenos y hoy te ha tocado uno.',
      'Bono alto en el primer tramo. 200 mensajes bien pagados por una vez.',
    ],
    jackpot: [
      'BOTE EN EL PRIMER TRAMO. 200 mensajes y el aura se desbordó. Los que no escriben que tomen nota.',
      '200 mensajes y el aura reventó por arriba. Bono grande en el tramo de entrada. Raro y documentado.',
      'Bote gordo de aura en Tier 1. Poco habitual, completamente real, y el marcador lo confirma.',
      'BOTE DE TIER 1. 200 mensajes y el aura ha pagado como si fueran mil. Suerte descomunal.',
      '200 mensajes y bote confirmado. Esto no pasa todos los días y el grupo lo acaba de ver.',
      'Bote en el tramo de entrada. 200 mensajes y un premio que no se merece cualquiera.',
    ],
  },
  tier2: {
    win: [
      '500 mensajes. Hay gente en este grupo que no llega ni a 50. El aura premia a los que se quedan.',
      'Medio millar de mensajes: la línea que separa a quien vive el grupo de quien pasa de visita. El aura lo nota.',
      '500 mensajes registrados. Constancia que el relleno del grupo no conoce ni de lejos.',
      'El contador marca 500 y el aura responde en consecuencia. Eso no lo alcanza cualquiera.',
      '500 mensajes. El segundo tramo y un bono que la mitad del grupo no va a oler en la vida.',
      '500 registrados. A estas alturas ya no eres activo, eres residente. El aura paga en consecuencia.',
      '500 mensajes y el aura responde. Constancia real, no de la que se presume sin números.',
      'Medio millar. Los que llevan tres mensajes al día que miren y aprendan.',
    ],
    bigwin: [
      '500 mensajes y el aura respondió con generosidad. Bono de Tier 2 por encima de lo normal.',
      'Bono gordo por llegar a los 500. La constancia tiene su propia economía y hoy pagó bien.',
      '500 mensajes y el aura recompensó en serio. No todos llegan aquí; el que llega, cobra.',
      '500 mensajes y bono alto. El aura distingue entre constancia y presencia y hoy ha pagado la primera.',
      'Tier 2 con premio generoso. 500 mensajes bien pagados. Esto no se regala.',
      'Bono grande en Tier 2. 500 mensajes que han rendido más de lo que suelen.',
    ],
    jackpot: [
      'BOTE DE TIER 2. 500 mensajes y el aura se desbordó. De los premios que hacen abrir el chat.',
      '500 mensajes y bote confirmado en Tier 2. Esto queda en el registro del grupo. Los inactivos que miren.',
      'Bote histórico de aura en Tier 2. 500 mensajes reales y un premio que el grupo no va a olvidar.',
      'BOTE EN TIER 2. Medio millar de mensajes y el aura ha reventado por arriba. Raro y sonoro.',
      '500 mensajes y bote gordo. El grupo tiene un ganador y el ganador tiene una cifra que enseñar.',
      'Bote de Tier 2 confirmado. 500 mensajes y un premio de los que se recuerdan.',
    ],
  },
  tier3: {
    win: [
      '1000 mensajes. Eso no se ve todos los días en ningún grupo. El aura lo reconoce y lo paga entero.',
      'Mil mensajes registrados. Hay quien cierra el chat antes de llegar a diez. Otra liga confirmada.',
      '1000 mensajes: el nivel donde los fantasmas del grupo ni saben que existe un bono. El que llega, cobra.',
      'El contador llega a 1000 y el aura abre el tramo máximo. Presencia de las que se recompensan solas.',
      'Mil mensajes. A los que han mandado diez hoy les queda lejos incluso el concepto.',
      '1000 mensajes registrados y el aura paga el tramo más alto. Constancia de las que cuestan.',
      '1000. El tramo que existe para que los que llegan sepan que hay nivel, y los que no, que hay distancia.',
      'Mil mensajes reales. El aura distingue y hoy ha distinguido en tu favor.',
    ],
    bigwin: [
      '1000 mensajes y el aura entró en modo gran bono. Ese nivel de actividad se paga distinto.',
      'Tier 3 desbloqueado. Mil mensajes y un bono de aura de los que quedan en la historia del grupo.',
      '1000 mensajes reales y el aura soltó un bono de los que dan conversación durante días.',
      'Bono alto en Tier 3. Mil mensajes y un premio que la mayoría no va a ver nunca.',
      '1000 mensajes y el aura ha pagado por encima. El tramo más alto rindiendo más de lo normal.',
      'Gran bono en el tercer tramo. Mil mensajes y una recompensa que vale la constancia.',
    ],
    jackpot: [
      '1000 MENSAJES, BOTE MÁXIMO DE AURA. El premio más alto que existe. El grupo acaba de ver algo poco común.',
      'Mil mensajes y el aura llegó a su bote máximo. Constancia legendaria, premio legendario. El grupo es testigo.',
      'BOTE DE TIER 3 CONFIRMADO. 1000 mensajes y aura histórica. Esto va al hall de la fama sin discusión.',
      'BOTE MÁXIMO. Mil mensajes y el premio más grande que da el sistema. Esto no pasa dos veces en la misma semana.',
      '1000 mensajes y bote reventado en Tier 3. El grupo entero acaba de presenciar algo que no se repite.',
      'BOTE EN EL TRAMO FINAL. Mil mensajes y una cantidad de aura que va a dejar huella.',
    ],
  },
  redemption: [
  'REMONTADA DE AURA — Estaba en el sótano y la actividad hizo lo que ninguna excusa consiguió. Bono de comeback. Esto no lo calcula nadie.',
  'COMEBACK EN DIRECTO — Aura negativa, mensajes positivos. Aquí se premia la constancia antes que el cope, y el marcador acaba de cambiar de cara.',
  'REDENCIÓN INESPERADA — El grupo daba ese aura por perdida. La actividad tiene su propia economía y acaba de hablar. Bote confirmado.',
  'EL MARCADOR REESCRITO — Aura negativa, actividad real. Aquí no se juzga el historial, se juzga quién aparece. Resultado: bono de redención.',
  'BONO DE REDENCIÓN — Lo que meses de excusas no arreglaron, la actividad lo resolvió sola. El aura cambia de signo y el grupo lo vio.',
  'COMEBACK CONFIRMADO — Aura en negativo y un bono que reescribe la historia. La actividad paga lo que la suerte no quiso.',
  'REMONTADA — Desde el fondo del pozo hasta aquí. La actividad hace lo que ninguna tirada consiguió: cambiar el marcador.',
  'REDENCIÓN — Aura negativa, presencia real. El sistema premia al que aparece y hoy ha aparecido quien más lo necesitaba.',
  'EL SÓTANO TIENE SALIDA — Aura negativa y un bono de redención que demuestra que escribir vale más que tirar.',
  'BONO DE COMEBACK — Cuando todo el mundo te daba por muerto, la actividad te sacó del hoyo. El marcador lo confirma.',
  'De la miseria al respiro: el contador te dio una segunda chance, cabrón, y el chat lo tiene claro, joder.',
  'Remontada documentada. El sótano te suelta un poco, gilipollas, y el chat lo tiene claro, mierda.',
  'Actividad al rescate. El aura deja de sangrar un momento, mierda, y el chat lo tiene claro, coño.',
  'Saliste del agujero por escribir, no por milagro, coño, y el chat lo tiene claro, cabrón.',
  'Remontada fea pero real. El ranking toma nota, asco, y el chat lo tiene claro, gilipollas.',
  'El sótano no era eterno: la actividad te empujó arriba, patético, y el chat lo tiene claro, patético.',
  'Rescate por presencia. Sin mensajes no habría pasado, basura, y el chat lo tiene claro, asco.',
  'Remontada de aura en vivo. El chat lo vio, ridículo, y el chat lo tiene claro, basura.',
  'De rojo a menos rojo. Celebración mínima, fracasado, y el chat lo tiene claro, ridículo.',
  'La actividad te sacó del pozo un tramo, joder, y el chat lo tiene claro, fracasado.',
  'Remontada sin narrativa épica: solo teclado, cabrón, y el chat lo tiene claro, joder.',
  'El contador deja de castigarte un rato, gilipollas, y el chat lo tiene claro, mierda.',
  'Saliste de la miseria por insistir, mierda, y el chat lo tiene claro, coño.',
  'Remontada documentada en el historial, coño, y el chat lo tiene claro, cabrón.',
  'El sótano te soltó. No te confíes, asco, y el chat lo tiene claro, gilipollas.',
  'Actividad = oxígeno. Lo usaste, patético, y el chat lo tiene claro, patético.',
  'Remontada de pobre a menos pobre, basura, y el chat lo tiene claro, asco.',
  'El aura responde cuando escribes, ridículo, y el chat lo tiene claro, basura.',
  'Rescate por farmeo puro, fracasado, y el chat lo tiene claro, ridículo.',
  'De la cuneta un escalón arriba, joder, y el chat lo tiene claro, fracasado.',
  'Remontada sin aplausos pero con número, cabrón, y el chat lo tiene claro, joder.',
  'La presencia te sacó del castigo un tramo, gilipollas, y el chat lo tiene claro, mierda.',
  'Sótano parcialmente evacuado, mierda, y el chat lo tiene claro, coño.',
  'Remontada real. El bot lo firma, coño, y el chat lo tiene claro, cabrón.',
  'Escribiste y el aura contestó, asco, y el chat lo tiene claro, gilipollas.',
  'De miseria a respiro documentado, patético, y el chat lo tiene claro, patético.',
  'Remontada por actividad, no por rezo, basura, y el chat lo tiene claro, asco.',
  'El agujero te queda un poco más arriba, ridículo, y el chat lo tiene claro, basura.',
  'Rescate feo y efectivo, fracasado, y el chat lo tiene claro, ridículo.',
  'Aura en modo remontada por mensajes, joder, y el chat lo tiene claro, fracasado.',
  'Saliste del peor tramo a base de estar, cabrón, y el chat lo tiene claro, joder.',
  'Remontada sin marketing, gilipollas, y el chat lo tiene claro, mierda.',
  'El contador te da aire, mierda, y el chat lo tiene claro, coño.',
  'De rojo intenso a rojo suave, coño, y el chat lo tiene claro, cabrón.',
  'Actividad al mando de la remontada, asco, y el chat lo tiene claro, gilipollas.',
  'El sótano pierde una batalla, patético, y el chat lo tiene claro, patético.',
  'Remontada archivada a tu favor, basura, y el chat lo tiene claro, asco.',
  'Presencia = menos castigo, ridículo, y el chat lo tiene claro, basura.',
  'Rescate por teclado, fracasado, y el chat lo tiene claro, ridículo.',
  'Aura remontando por insistencia, joder, y el chat lo tiene claro, fracasado.',
  'Del pozo un metro hacia la luz, cabrón, y el chat lo tiene claro, joder.',
  'Remontada sin discurso motivacional, gilipollas, y el chat lo tiene claro, mierda.',
  'El ranking deja de empujarte solo hacia abajo, mierda, y el chat lo tiene claro, coño.',
  'Actividad hizo el milagro laico, coño, y el chat lo tiene claro, cabrón.',
  'Sótano en retirada parcial, asco, y el chat lo tiene claro, gilipollas.',
  'Remontada de aura en los números, patético, y el chat lo tiene claro, patético.',
  'Escribir te sacó del peor hoyo, basura, y el chat lo tiene claro, asco.',
  'Rescate documentado, ridículo, y el chat lo tiene claro, basura.',
  'De la miseria un paso afuera, fracasado, y el chat lo tiene claro, ridículo.',
  'El sótano te soltó. No te confíes, asco, fracasado, y el chat lo tiene claro, fracasado.',
  'Rescate por farmeo puro, fracasado, joder, y el chat lo tiene claro, joder.',
  'De la cuneta un escalón arriba, joder, mierda, y el chat lo tiene claro, mierda.',
  'Sótano parcialmente evacuado, mierda, coño, y el chat lo tiene claro, coño.',
  'Remontada real. El bot lo firma, coño, cabrón, y el chat lo tiene claro, cabrón.',
  'Escribiste y el aura contestó, asco, gilipollas, y el chat lo tiene claro, gilipollas.',
  'Rescate feo y efectivo, fracasado, patético, y el chat lo tiene claro, patético.',
  'Remontada sin marketing, gilipollas, asco, y el chat lo tiene claro, asco.',
  'El contador te da aire, mierda, basura, y el chat lo tiene claro, basura.',
  'De rojo intenso a rojo suave, coño, ridículo, y el chat lo tiene claro, ridículo.',
  'El sótano pierde una batalla, patético, fracasado, y el chat lo tiene claro, fracasado.',
  'Remontada archivada a tu favor, basura, joder, y el chat lo tiene claro, joder.',
  'Presencia = menos castigo, ridículo, mierda, y el chat lo tiene claro, mierda.',
  'Rescate por teclado, fracasado, coño, y el chat lo tiene claro, coño.',
  'Aura remontando por insistencia, joder, cabrón, y el chat lo tiene claro, cabrón.',
  'Del pozo un metro hacia la luz, cabrón, gilipollas, y el chat lo tiene claro, gilipollas.',
  'Actividad hizo el milagro laico, coño, patético, y el chat lo tiene claro, patético.',
  'Sótano en retirada parcial, asco, asco, y el chat lo tiene claro, asco.',
  'Escribir te sacó del peor hoyo, basura, basura, y el chat lo tiene claro, basura.',
  'Rescate documentado, ridículo, ridículo, y el chat lo tiene claro, ridículo.',
  'De la miseria un paso afuera, fracasado, fracasado, y el chat lo tiene claro, fracasado.',
  'De la cuneta un escalón arriba, joder, joder, y el chat lo tiene claro, joder.',
  'Sótano parcialmente evacuado, mierda, mierda, y el chat lo tiene claro, mierda.',
  'Escribiste y el aura contestó, asco, coño, y el chat lo tiene claro, coño.',
  'Rescate feo y efectivo, fracasado, cabrón, y el chat lo tiene claro, cabrón.',
  'Remontada sin marketing, gilipollas, gilipollas, y el chat lo tiene claro, gilipollas.',
  'El contador te da aire, mierda, patético, y el chat lo tiene claro, patético.',
  'De rojo intenso a rojo suave, coño, asco, y el chat lo tiene claro, asco.',
  'Presencia = menos castigo, ridículo, basura, y el chat lo tiene claro, basura.',
  'Rescate por teclado, fracasado, ridículo, y el chat lo tiene claro, ridículo.',
  'Actividad hizo el milagro laico, coño, fracasado, y el chat lo tiene claro, fracasado.',
  'Sótano en retirada parcial, asco, joder, y el chat lo tiene claro, joder.',
  'Rescate documentado, ridículo, mierda, y el chat lo tiene claro, mierda.',
  'Rescate por farmeo puro, fracasado, coño, y el chat lo tiene claro, coño.',
  'De la cuneta un escalón arriba, joder, cabrón, y el chat lo tiene claro, cabrón.',
  'Sótano parcialmente evacuado, mierda, gilipollas, y el chat lo tiene claro, gilipollas.',
  'Remontada real. El bot lo firma, coño, patético, y el chat lo tiene claro, patético.',
  'Escribiste y el aura contestó, asco, asco, y el chat lo tiene claro, asco.',
  'Rescate feo y efectivo, fracasado, basura, y el chat lo tiene claro, basura.',
  'Remontada sin marketing, gilipollas, ridículo, y el chat lo tiene claro, ridículo.',
  'El contador te da aire, mierda, fracasado, y el chat lo tiene claro, fracasado.'
],
};

// ─── Reward rolling (variable ratio — core casino mechanic) ───────────────────

// Los importes viven en utils/economia.js, que es donde esta fijada la escala
// entera. Antes estaban aqui a pelo (1.000 a 50.000 por tramo) mientras una
// tirada de !aura movia 50-500 y un robo 5-150: el bono diario por escribir
// eclipsaba por completo a las dinamicas, asi que robar o apostar no compensaba.
// Ahora un tier 3 excelente equivale a unas cinco tiradas buenas de !aura.
function rollReward(tier, currentAura) {
  // Redemption check first: negative-aura users get an escalating jackpot chance.
  if (currentAura < 0) {
    const redeemChance = tier === 3 ? 0.15 : tier === 2 ? 0.08 : 0.04;
    if (Math.random() < redeemChance) {
      return { amount: rango(REDENCION[tier]), label: 'redemption' };
    }
  }

  const t = BONOS[tier];
  const r = Math.random();

  // Reparto de etiquetas por tramo: cuanto mas alto el tramo, mas probable es
  // que ademas toque un pago por encima de lo normal.
  let corte;
  if      (tier === 1) corte = [0.60, 0.85, 0.95];
  else if (tier === 2) corte = [0.50, 0.80, 0.95];
  else                 corte = [0.40, 0.70, 0.90];

  if (r < corte[0]) return { amount: rango(t.win),     label: 'win' };
  if (r < corte[1]) return { amount: rango(t.bigwin),  label: 'bigwin' };
  if (r < corte[2]) return { amount: rango(t.jackpot), label: 'jackpot' };
  return { amount: rango(t.mega), label: 'jackpot' };
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

// ─── La racha de dias seguidos ───────────────────────────────────────────────
//
// Paga siempre; habla casi nunca. El aviso sale como mucho una vez por hito
// (7, 15, 30, 50, 100, 200, 365 dias) y cuando alguien vuelve tras cargarse una
// racha de una semana o mas.
//
// Los gates son los mismos que los del bono: con el bot apagado o la dinamica
// de aura en pausa se sigue cobrando y no se dice nada.
async function avisarRacha(sock, jid, sender) {
  const r = await anotarMensaje(jid, sender);
  if (!r.evento) return;

  await addAura(jid, sender, r.pago);
  if (!isBotEnabled(jid) || !isAuraEnabled(jid)) return;
  if (r.evento === 'sube' && !r.hito) return;

  const userTag = `@${sender.split('@')[0]}`;
  const texto = r.evento === 'rompe'
    ? pickFresh(RACHA_ROTA, `${jid}|racha|rota`)
        .replace(/%N/g, userTag).replace(/%P/g, fmt(r.perdidos))
    : `*RACHA DE ${r.dias} DIAS*\n\n` +
      pickFresh(RACHA_HITO, `${jid}|racha|hito`)
        .replace(/%N/g, userTag).replace(/%D/g, fmt(r.dias)) +
      `\n\n_+${fmt(r.pago)} de aura al dia mientras no falles. Tope en ${RACHA.tope} dias._`;

  await sock.sendMessage(jid, { text: texto, mentions: [sender] });
}

// ─── Main hook (called on every group message, non-blocking) ──────────────────

async function checkCasinoMilestone(sock, jid, sender) {
  const count = await incrementCasinoCount(jid, sender);

  // Aqui vivio un SUELDO que pagaba cada 10 mensajes en silencio. Se quito por
  // decision del owner: multiplicaba por cinco y medio el ingreso de un miembro
  // normal y volvia calderilla unos precios que se acababan de subir aposta.
  // Lo que premia escribir ahora es el bono de veterania de !aura, que sube la
  // suerte de tus tiradas con cada mil mensajes y no reparte nada de fondo.

  // La racha va aparte y no depende de los hitos: mide DIAS SEGUIDOS, no
  // volumen. Se cobra en silencio todos los dias y solo habla en dos momentos
  // (un hito redondo y volver despues de romper una racha larga), que es lo que
  // la distingue del sueldo — aquel pagaba callado y no daba nada que contar.
  await avisarRacha(sock, jid, sender).catch(() => {});

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
  const phrase = pickFresh(phrasePool, `${jid}|casino|${label}|${tier}`);

  // ─── ¿Se anuncia, o se cobra y punto? ──────────────────────────────────────
  //
  // El aura SE PAGA SIEMPRE. Lo que se puede callar es el aviso, y hay dos
  // motivos para callarlo. Los dos eran agujeros:
  //
  //  · CON. EL BOT APAGADO (*!off*). Esta función se llama desde el pipeline de
  //    mensajes ANTES del gate de isBotEnabled, así que el grupo seguía
  //    recibiendo avisos de bono de un bot supuestamente apagado. Apagar el bot
  //    significa que no habla, sin excepciones.
  //  · CON LA DINÁMICA DE AURA APAGADA (*!aura off*). El interruptor se pidió
  //    porque el juego se hacía pesado, y estos avisos son de lo más ruidoso
  //    que tiene: uno por persona y por hito, en un grupo activo son decenas al
  //    día. Apagar la dinámica y seguir recibiéndolos deja el interruptor a
  //    medias, que es peor que no tenerlo.
  //
  // Cobrar sin avisar es exactamente el contrato que ya tiene el interruptor
  // ("apaga el juego, no la moneda") y el mismo que usa el sueldo, que nunca
  // dice nada. El saldo se mira en *!aura*.
  if (!isBotEnabled(jid) || !isAuraEnabled(jid)) return;

  const userTag   = `@${sender.split('@')[0]}`;
  // Cabecera de aura, no de casino: el sistema tiene estructura de tramos y
  // botes, pero lo que se reparte es aura y el título lo deja claro.
  //
  // Sin emojis, como el resto del bot. Este fichero era el ÚNICO de todo src/
  // que sacaba emojis por WhatsApp (doce líneas), y cantaba: el bot escribe en
  // texto pelado en los otros ciento y pico sitios.
  const tierHdr   = tier === 3 ? '*BONO DE AURA · TIER 3 · 1000 MENSAJES*'
                  : tier === 2 ? '*BONO DE AURA · TIER 2 · 500 MENSAJES*'
                  :              '*BONO DE AURA · TIER 1 · 200 MENSAJES*';
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
