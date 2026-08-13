const { isOwner, isMainOwner, isAdmin, getSender, getTarget, bareJid, sameUser } = require('../utils/wa');
const { pickFresh, fmt, ordenarPorDureza } = require('../utils/helpers');
const { getAura, addAura } = require('../utils/auraStore');

// Resolve a JID to its canonical form (preferring phone-JID) using the group
// participant list. Fixes LID vs phone-JID mismatches in accept/reject checks:
// getTarget() may return a LID while getSender() returns a phone-JID for the
// same person, making bareJid comparisons always fail.
function resolveJid(rawJid, participants) {
  const bare = bareJid(rawJid);
  if (!participants?.length) return bare;
  const p = participants.find(q =>
    bareJid(q.id) === bare ||
    (q.lid && bareJid(q.lid) === bare) ||
    (q.phoneNumber && bareJid(q.phoneNumber) === bare)
  );
  if (!p) return bare;
  if (p.phoneNumber) {
    const ph = bareJid(p.phoneNumber);
    if (ph.endsWith('@s.whatsapp.net')) return ph;
  }
  return bareJid(p.id);
}

// A duel is a consented aura bet: challenger stakes an amount, target must
// accept, winner takes the stake from the loser. The accept step is what makes
// it social — it forces a public yes/no instead of a silent dice roll.
//
// La escala vive en utils/economia.js, igual que el robo y los bonos. Antes
// estaba aqui a pelo y se quedo en la escala vieja cuando todo lo demas bajo.
const { DUELO } = require('../utils/economia');
const STAKE_MIN = DUELO.suelo;
const STAKE_DEFAULT = DUELO.porDefecto;
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
let DUEL_WIN = [
  '%W desarmó a %L en el primer intercambio. %L pierde tanto que la derrota ya le llama por su nombre, le abraza y le hace la cena. Puto fracasado de manual.',
  '%W ni se despeinó. %L tenía la excusa lista antes que la estrategia, porque este gilipollas ensaya el fracaso en casa antes de venir a exhibirlo gratis al grupo.',
  '%W lo tenía leído de memoria. %L es de manual, sí, del manual de cómo ser un puto inútil y perder hasta respirando, edición sobada de tanto releerla él solo.',
  '%W barre a %L. delante del grupo, el único sitio donde a %L lo mencionan, aunque sea para esto. Aprovéchalo, perdedor, cabrón.',
  '%W gana sin sudar. %L se derrumbó él solito, como se le cae a la mierda todo lo que ese pringado intenta sostener con sus manitas temblorosas.',
  '%L apostó convencido de que esta vez sería distinto. Esa frase de mierda es lo más parecido a una autobiografía que va a escribir este fracasado en toda su puta vida.',
  '%W pasó por encima de %L como una fregona por el suelo: rápido, sin resistencia y dejando todo más limpio que el patético currículum de mierda de ese perdedor.',
  '%W cierra el duelo en seco. %L vuelve a su rincón arrastrando la misma lección de siempre que, como buen inútil, no aprende ni a hostias, basura.',
  '%L retó a %W con la boca llena y el currículum vacío de un puto don nadie. El choque fue breve, público y le dejó bien claro lo poca cosa que es.',
  '%W ejecuta a %L sin pestañear. Para %W fue un trámite; para %L, otro trauma más que sumar a la montaña de mierda que es su vida de fracasado sin un puto duro.',
  '%W mandó de principio a fin. %L solo apareció para engordar el marcador del otro, el único puto papel que sabe hacer este pelele en cualquier grupo.',
  '%L tiró los dados como quien compra un rasca esperando jubilarse. %W le explicó la estadística a hostia limpia y gratis, mierda.',
  'El frame de %W aplastó a %L antes del primer asalto. Y eso que a %L lo revienta a diario cualquier chorrada más pequeña, como una simple charla. Pobre mierda blanda.',
  '%W ganó tan fácil que casi pide la revancha por aburrimiento. %L declinó: bastante tiene el pobre pringado con recoger su orgullo hecho mierda del suelo.',
  '%L creyó que tenía una oportunidad. Esa fe ciega de perdedor es entrañable en un cachorro y patética en un puto adulto con su historial de fracasos.',
  '%W se lleva. el botín. %L se lleva la enésima prueba de que nació para perder, un talento de mierda que es lo único que este inútil tiene bien afinado.',
  'Duelo resuelto a favor de quien nunca dudó. %W, leyenda; %L, el puto chiste que el grupo usa para reírse y de paso avisar de cómo no acabar en la vida.',
  '%W ni recordará este duelo mañana. %L lo va a rumiar una semana entera, que es lo que tarda su cerebro de mierda, lento como un módem viejo, en digerir la paliza.',
  '%W gana sin drama. %L necesita drama y excusas hasta para dormir, y aun así esta noche no pega ojo dándole vueltas a la puta basura de persona que es.',
  '%L entró a por una victoria que le alegrara el día gris. Sale con el manual ilustrado de por qué su vida entera es una mierda gris, cortesía de %W.',
  'No fue un duelo, fue una clase magistral de %W sobre lo puto inútil que es %L, asignatura que ese fracasado lleva suspendiendo desde que nació.',
  '%W le quita el aura y, de propina, la poca dignidad que a %L le quedaba. Pack completo, perdedor de mierda, y encima gratis para que escueza más.',
  '%L ya preparaba la revancha mental antes de perder esta. El único acierto de este pringado en su puta vida: saber de sobra que iba a caer como siempre.',
  'A %W no le hizo falta ni esforzarse. A %L nunca le hizo falta ayuda para hundirse en su propia mierda, pero hoy, por una vez, tuvo asistencia técnica gratis.',
  '%W gana y pasa página en un segundo. %L añade la derrota a la lista que repasa cada noche al apagar la luz, el único puto hábito constante de este fracasado.',
  'Jerarquía aplicada al duelo: %W arriba, %L de puto relleno. Como en. el chat, como en su grupo de amigos y como en la cena de Navidad donde nadie lo traga.',
  '%W tenía esto firmado antes de que %L aceptara. %L apuesta por pura fe, porque mérito y autoestima a este pringado se le agotaron hace ya un porrón de años, asco.',
  '%W cerró el duelo y %L abrió su manual de excusas por la página más sobada: "no estaba concentrado". El clásico de todo perdedor que no asume que es una puta mierda.',
  '%L midió sus fuerzas con %W y descubrió, otra vez, que no tiene ni una. Lección que este inútil no aprende porque en esa cabeza hueca de mierda no cabe ni eso.',
  '%W lo mandó al rincón de pensar. %L lleva ahí sentado toda su puta vida y aún no ha parido un solo pensamiento útil, pero el sitio de perdedor ya lo tiene calentito.',
  '%W desarmó a %L en el primer intercambio y le dejó el orgullo en el suelo del chat. El grupo lo vio entero, joder.',
  '%W ni se despeinó: %L tenía la derrota ensayada antes de aceptar el duelo. El grupo lo vio entero, mierda.',
  '%W lo tenía leído: %L es el manual viviente de cómo perder con confianza. El grupo lo vio entero, coño.',
  '%W barre a %L. delante del grupo: el único sitio donde a %L lo mencionan. El grupo lo vio entero, cabrón.',
  '%W gana sin sudar: %L se derrumba solo, como siempre que intenta sostener algo. El grupo lo vio entero, gilipollas.',
  '%W pasó por encima de %L como fregona por el suelo: rápido y sin resistencia. El grupo lo vio entero, ridículo.',
  '%W cierra el duelo en seco: %L vuelve al rincón con la lección sin aprender. El grupo lo vio entero, basura.',
  '%W ejecuta a %L sin pestañear: trámite para uno, trauma para el otro. El grupo lo vio entero, asco con. el ranking como único testigo del veredicto.',
  '%W mandó de principio a fin: %L solo engordó el marcador ajeno. El grupo lo vio entero, cutre y el contador lo dejó por escrito sin debate, ridículo.',
  '%L tiró los dados como un rasca: %W le explicó la estadística a hostia limpia. El grupo lo vio entero, pringado, fracasado.',
  '%W ganó tan fácil que casi pide revancha por aburrimiento: %L declinó. El grupo lo vio entero, joder.',
  '%L creyó que tenía oportunidad: %W le devolvió a la realidad sin frenos. El grupo lo vio entero, mierda.',
  '%W le quita el aura y la dignidad a %L en el mismo movimiento. El grupo lo vio entero, coño y sin segunda oportunidad en este mensaje.',
  '%W no se esforzó: %L nunca necesitó ayuda para hundirse, hoy tuvo asistencia. El grupo lo vio entero, gilipollas.',
  '%W gana y pasa página: %L añade la derrota a la lista nocturna. El grupo lo vio entero, patético con números que no admiten recurso de apelación.',
  'Jerarquía del duelo: %W arriba, %L de relleno, como en el resto de su vida. El grupo lo vio entero, ridículo.',
  '%W tenía esto firmado antes de que %L aceptara: fe contra mérito, gana el mérito. El grupo lo vio entero, basura.',
  '%W cerró el duelo: %L abrió el manual de excusas por la página más sobada. El grupo lo vio entero, desperdicio, basura.',
  '%L midió fuerzas con %W y descubrió otra vez que no tiene ni una. El grupo lo vio entero, asco delante de todo el hilo sin posibilidad de borrado.',
  '%W lo mandó al rincón de pensar: %L lleva ahí toda la vida sin un pensamiento útil. El grupo lo vio entero, cutre, fracasado.',
  '%W cobró el stake y el respeto: %L pagó ambos sin descuento. El grupo lo vio entero, pringado y el contador lo dejó por escrito sin debate, joder.',
  '%L entró al duelo de héroe y salió de estadística: %W firmó el parte. El grupo lo vio entero, fracasado.',
  '%W no dejó espacio al drama de %L: primero el golpe, luego el silencio. El grupo lo vio entero, joder.',
  '%L apostó el aura y la cara: se quedó sin las dos frente a %W. El grupo lo vio entero, mierda con el parte del comando cerrado en firme.',
  '%W gana el duelo como quien cobra una deuda vieja: sin sorpresa, con intereses. El grupo lo vio entero, coño.',
  '%L vs %W: el marcador se escribió solo en la columna del que sabe ganar. El grupo lo vio entero, cabrón.',
  '%W ejecutó el duelo en modo trámite: %L en modo traumatismo leve. El grupo lo vio entero, gilipollas.',
  '%L trajo confianza de más y talento de menos: %W cobró la diferencia. El grupo lo vio entero, patético.',
  '%W no sudó el stake: %L sudó la explicación que nadie pidió. El grupo lo vio entero, ridículo delante de quien miraba. el ranking en ese momento.',
  '%L retó por orgullo: el orgullo no paga el aura que %W se lleva. El grupo lo vio entero, basura con el sistema firmando debajo sin pedir aclaración.',
  '%W cerró el intercambio antes de que %L encontrara su segunda idea. El grupo lo vio entero, desperdicio, joder.',
  '%L en el duelo es carne de ranking: %W es quien escribe. el ranking. El grupo lo vio entero, asco con. el ranking como único testigo del veredicto.',
  '%W ganó limpio: %L perdió completo, pack sin reembolso. El grupo lo vio entero, cutre y el contador lo dejó por escrito sin debate, coño.',
  '%L creyó en la racha: %W creyó en la realidad. Gana la realidad. El grupo lo vio entero, pringado en el momento más visible del chat, cabrón.',
  '%W le dejó a %L el recibo del duelo en forma de este mensaje. El grupo lo vio entero, fracasado sin que nadie pudiera fingir que no lo vio.',
  '%L midió mal desde el saludo: %W midió bien desde el stake. El grupo lo vio entero, joder con el parte del comando cerrado en firme.',
  '%W no improvisó la victoria: la tenía en el bolsillo antes del sí de %L. El grupo lo vio entero, mierda.',
  '%L salió a cazar aura y volvió cazado: %W contó. el botín. El grupo lo vio entero, coño mientras el grupo tomaba nota del resultado.',
  '%W el duelo fue corto: el efecto en el orgullo de %L, no. El grupo lo vio entero, cabrón con números que no admiten recurso de apelación.',
  '%L vs %W terminó 0-1 sin prórroga y sin debate útil. El grupo lo vio entero, gilipollas y el historial del comando queda de testigo.',
  '%W cobró el stake con la calma de quien no contemplaba el empate. El grupo lo vio entero, patético delante de quien miraba. el ranking en ese momento.',
  '%L aportó el fail: %W aportó la ejecución. Distribución natural. El grupo lo vio entero, ridículo con el sistema firmando debajo sin pedir aclaración.',
  '%W ganó. y el chat archivó: %L todavía busca la frase del almost. El grupo lo vio entero, basura delante de todo el hilo sin posibilidad de borrado.',
  '%L el duelo le quedó grande: %W le quedó justo. El grupo lo vio entero, desperdicio con. el ranking como único testigo del veredicto, cabrón.',
  '%W no pidió suerte: ejecutó. %L no tuvo suficiente nada. El grupo lo vio entero, asco y el contador lo dejó por escrito sin debate.',
  '%L firmó el reto con la mano y la derrota con las dos. El grupo lo vio entero, cutre en el momento más visible del chat, patético.',
  '%W vació el stake de %L sin pedir segunda ronda. El grupo lo vio entero, pringado sin que nadie pudiera fingir que no lo vio, asco.',
  '%L en modo héroe de tutorial: %W en modo jefe final del primer pasillo. El grupo lo vio entero, fracasado.',
  '%W el frame del duelo aplastó a %L antes del segundo mensaje. El grupo lo vio entero, joder y sin segunda oportunidad en este mensaje.',
  '%L apostó convicción: la convicción no cotiza contra %W. El grupo lo vio entero, mierda mientras el grupo tomaba nota del resultado.',
  '%W cerró el duelo y abrió el hueco en el aura de %L. El grupo lo vio entero, coño con números que no admiten recurso de apelación.',
  '%L vs %W: crónica breve de una derrota larga para el ego. El grupo lo vio entero, cabrón y el historial del comando queda de testigo.',
  '%W ganó sin narrador: el resultado se narra solo. El grupo lo vio entero, gilipollas delante de quien miraba. el ranking en ese momento.',
  '%L el único hábito constante es perder: hoy lo practicó con %W. El grupo lo vio entero, patético con el sistema firmando debajo sin pedir aclaración.',
  '%W cobró, %L pagó, el grupo presenció: duelo completo. El grupo lo vio entero, ridículo delante de todo el hilo sin posibilidad de borrado.',
  '%L retó a %W y el universo le contestó con este mensaje. El grupo lo vio entero, basura con. el ranking como único testigo del veredicto.',
  '%W no dejó almost: dejó derrota limpia en el marcador de %L. El grupo lo vio entero, desperdicio y el contador lo dejó por escrito sin debate, asco.',
  '%L midió el stake con el ego: el ego no cubrió el peaje de %W. El grupo lo vio entero, asco en el momento más visible del chat.',
  '%W ejecutó el duelo como quien marca una casilla pendiente. El grupo lo vio entero, cutre sin que nadie pudiera fingir que no lo vio, ridículo.',
  '%L salió del duelo con menos aura y la misma cara de siempre. El grupo lo vio entero, pringado con el parte del comando cerrado en firme, fracasado.',
  '%W el stake cambió de dueño: el respeto también. El grupo lo vio entero, fracasado y sin segunda oportunidad en este mensaje.',
  '%L vs %W terminó antes de que %L encontrara el plan B. El grupo lo vio entero, joder mientras el grupo tomaba nota del resultado.',
  '%W ganó el intercambio y el relato: %L se quedó sin ambos. El grupo lo vio entero, mierda con números que no admiten recurso de apelación.',
  '%L la derrota le llama por su nombre desde antes del duelo. El grupo lo vio entero, coño y el historial del comando queda de testigo.',
  '%W no sudó: %L sudó la lista de excusas. El grupo lo vio entero, cabrón delante de quien miraba. el ranking en ese momento.',
  '%L aportó el reto: %W aportó el final. Fin. El grupo lo vio entero, gilipollas con el sistema firmando debajo sin pedir aclaración.'
];


function clampStake(raw) {
  const n = parseInt(String(raw).replace(/\D/g, ''), 10);
  if (!Number.isFinite(n) || n <= 0) return STAKE_DEFAULT;
  return Math.max(n, STAKE_MIN);
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

  let side = rollWinner(cO, cA, tO, tA);
  // Rig a favor del owner principal: si participa en el duelo, SIEMPRE gana.
  if (isMainOwner(d.challenger, false, groupMeta)) side = 'c';
  else if (isMainOwner(d.target, false, groupMeta)) side = 't';
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
    const resolvedSender = resolveJid(sender, groupMeta?.participants);
    if (!sameUser(resolvedSender, d.target)) {
      return sock.sendMessage(jid, { text: 'Este duelo no es para ti.' }, { quoted: msg });
    }
    // Claim the duel atomically BEFORE any await. Two concurrent "aceptar"
    // messages (or a WhatsApp redelivery — the handler has no msg-id dedup)
    // would otherwise both pass the checks below and pay out twice. Deleting the
    // pending slot synchronously here means the second one sees no pending duel.
    pending.delete(jid);
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
    const resolvedSender2 = resolveJid(sender, groupMeta?.participants);
    const isTarget = sameUser(resolvedSender2, d.target);
    const isChallenger = sameUser(resolvedSender2, d.challenger);
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
  if (!target) return; // sin retado no hay duelo
  if (sameUser(target, sender)) {
    return sock.sendMessage(jid, { text: 'No puedes retarte a ti mismo.' }, { quoted: msg });
  }

  const existing = getPending(jid);
  if (existing) {
    return sock.sendMessage(jid, {
      text: `Ya hay un duelo pendiente: @${existing.challenger.split('@')[0]} vs @${existing.target.split('@')[0]}. Espera a que se resuelva.`,
      mentions: [existing.challenger, existing.target],
    }, { quoted: msg });
  }

  // Apuesta: primer argumento numerico despues de la mencion.
  const stakeArg = (args || []).find(a => /^\d+$/.test(a));
  const pedido = clampStake(stakeArg);

  // El tope se calcula con el saldo de LOS DOS, no solo con el del retador.
  // Antes solo se miraba al que lanzaba, asi que se podia retar por 500 a
  // alguien con 60: el duelo moria al aceptar, con un mensaje publico
  // llamandole insolvente. Ahora la cifra se ajusta sola y nadie queda expuesto.
  const [auraC, auraT] = await Promise.all([
    getAura(jid, sender),
    getAura(jid, target),
  ]);
  const pobre = Math.min(auraC, auraT);
  const maxStake = Math.max(
    STAKE_MIN,
    Math.min(DUELO.techo, Math.floor(pobre * DUELO.fraccionRival)),
  );
  const stake = Math.min(pedido, maxStake);
  const recortado = pedido > maxStake;

  if (auraC < stake || auraT < stake) {
    return sock.sendMessage(jid, {
      text: 'Con ese saldo no da para un duelo.',
    }, { quoted: msg });
  }

  // Store canonical (phone-JID) forms so accept/reject comparisons work in
  // LID groups where getTarget() and getSender() may return different JID formats.
  const participants = groupMeta?.participants;
  pending.set(jid, {
    challenger: resolveJid(sender, participants),
    target:     resolveJid(target, participants),
    stake,
    ts: Date.now(),
  });

  await sock.sendMessage(jid, {
    text:
      `*DUELO LANZADO*\n\n` +
      `@${sender.split('@')[0]} reta a @${target.split('@')[0]} por *${fmt(stake)}* de aura.\n` +
      (recortado ? `_Tope entre los dos: ${fmt(maxStake)}_\n` : '') +
      `\n@${target.split('@')[0]} · *!duel aceptar* o *!duel rechazar*\n` +
      `_(expira en 90s)_`,
    mentions: [sender, target],
  }, { quoted: msg });
}


// El bot abre con lo mas fuerte que tiene: los pools de insultos se ordenan
// de mas duro a mas suave UNA vez, al cargar, y pickFresh sesga la eleccion
// hacia la cabecera. Los pools neutros (cabeceras, cierres) no se tocan:
// ahi la "dureza" no significa nada.
DUEL_WIN = ordenarPorDureza(DUEL_WIN);

// clampStake se exporta para poder comprobarlo aparte: es la unica parte del
// duelo que se puede probar sin un socket ni un grupo de verdad.
module.exports = { cmdDuel, clampStake };
