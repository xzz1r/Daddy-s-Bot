'use strict';

const { isOwner, isAdmin, getSender, bareJid } = require('../utils/wa');
const { pickFresh } = require('../utils/helpers');

// Rigged by role, but not blatantly: the owner has a real edge yet can still
// lose, admins have a slighter edge, members fight on equal ground.
function rollMog(aIsOwner, aIsAdmin, bIsOwner, bIsAdmin) {
  const r = Math.random();
  if (aIsOwner && !bIsOwner) return r < 0.70 ? 'a' : 'b';
  if (bIsOwner && !aIsOwner) return r < 0.70 ? 'b' : 'a';
  if (aIsAdmin && !bIsAdmin) return r < 0.60 ? 'a' : 'b';
  if (bIsAdmin && !aIsAdmin) return r < 0.60 ? 'b' : 'a';
  return r < 0.5 ? 'a' : 'b';
}

// %M = mogger (winner), %L = mogged (loser)
const MOG_PHRASES = [
  // --- It's over / it never began ---
  'It\'s over para %L. Ni siquiera empezó. %M nació ascendido y %L nació de relleno.',
  'It\'s over. Lo fue desde que %L cargó la genética con la que vino al mundo. %M ni se molesta.',
  'Para %M nunca hizo falta empezar nada. Para %L nunca empezó y nunca va a empezar. It\'s over.',
  'El mog check terminó antes de la primera foto. %M ascendió, %L lleva LDAR de nacimiento.',
  '%M está en la realidad. %L está en la fase de negación. It\'s over y todos lo ven menos %L.',
  'JFL mirar a %L intentar competir con %M. Es como ver a un normie discutirle a un Gigachad. Patético y rápido.',
  '%L creyó que tenía oportunidad. Ese fue su primer error. El segundo fue nacer con esa cara. %M ni sudó.',

  // --- Hipergamia / jerarquía sexual ---
  'La hipergamia ya dio su veredicto: %M arriba, %L invisible. Las mujeres ni registran que %L existe.',
  'Regla 80/20: %M es el 20% que todas quieren, %L es el 80% que ninguna mira. La biología ya votó.',
  'La hipergamia no negocia. %M es por quien rompen una relación. %L es por quien nadie cruza la calle.',
  'Ninguna mujer baja su estándar hasta %L. La hipergamia se lo impide. A %M en cambio le suben el estándar.',
  '%M activa el halo effect con solo aparecer. A %L lo cancela el mismo efecto en reversa. Pretty privilege puro.',
  'Las foids hacen match con %M en dos segundos y dejan a %L en el deslizamiento eterno. La hipergamia es ley.',
  '%M es el genuine top tier que la hipergamia premia. %L es a quien el algoritmo esconde por el bien de todas.',
  '%M es looksmatch de stacys. %L no es looksmatch ni de su reflejo en una cuchara.',

  // --- Tier gap brutal ---
  '%M es Chad tier puro. %L es subhuman documentado y el grupo entero acaba de confirmarlo.',
  'Gigachad contra criatura del lago. %M y %L. Y eso es un insulto para el lago.',
  '%L queda enterrado seis tiers por debajo. %M ni recordará que este 1v1 existió.',
  'PSL de %M: imposible de discutir. PSL de %L: imposible de mirar sin pena ajena.',
  'S tier absoluto contra "ni siquiera entra en la tier list". %M aplasta, %L desaparece.',
  '%L es el caso de estudio que los foros usan para explicar qué significa nacer perdiendo. %M es la portada.',
  'Genetic lottery: %M se llevó el bote. A %L le tocó la deformidad de consolación.',
  'Chad real contra cope andante. El resultado estaba escrito en el ADN de %L antes de respirar.',

  // --- Bone structure brutal ---
  'Canthal tilt negativo, midface de jirafa, jawline desaparecida. %L es el catálogo completo del subhuman. %M es la referencia opuesta.',
  'Bone structure de dios griego en %M. En %L: bone structure de bolsa de plástico medio vacía.',
  'La mandíbula de %M moggea sola a %L entero. %L no tiene mandíbula, tiene una sugerencia de mandíbula.',
  'Pómulos esculpidos en %M. En %L: la cara se rinde antes de llegar a los pómulos.',
  'La proyección maxilar de %M liquida a %L sin mirar nada más. %L respira por la boca y se le nota en la estructura.',
  'Estructura ósea de %M: heredada, brutal, inalcanzable. La de %L: el creador tuvo un mal día y se notó para siempre.',
  '%M tiene gonial angle de revista. %L tiene recessed everything y el espejo se lo recuerda cada mañana.',

  // --- Eyes brutal ---
  'Hunter eyes letales en %M. Prey eyes de presa atropellada en %L. La cadena alimenticia ya decidió.',
  'El canthal tilt positivo de %M destruye a %L antes de abrir la boca. %L tiene mirada de derrota permanente.',
  'Ojos de depredador contra ojos de quien acaba de perder en público y lo sabe. %M caza, %L huye.',
  '%L tiene los ojos tan caídos que parece que la genética lloró al hacerlo. %M tiene la mirada que abre puertas.',

  // --- Midface / thirds brutal ---
  'Tercio medio divino en %M. El de %L es tan largo que no entra en el encuadre ni en la decencia.',
  'El midface de %L es el tipo de problema que ni la cirugía mayor arregla del todo. %M lo tiene perfecto y gratis.',
  'Facial thirds de %M en proporción áurea. Los de %L parecen dibujados con los ojos cerrados.',

  // --- Frame brutal ---
  'Frame, altura, estructura: todo en %M. A %L le quedan los suplementos, el cope y la oración nocturna.',
  'La madre naturaleza apostó todo en %M. A %L le dio lo que sobró del cubo de la basura genético.',
  'No es actitud, no es esfuerzo, no es personalidad. Es hueso. %M lo tiene, %L no, y eso no se entrena.',
  '%M tiene el frame con el que se nace ganando. %L tiene el frame que hace que le ofrezcan asiento por lástima.',

  // --- PSL / foro brutal ---
  '%M pasa el modwatch a S tier. A %L lo banean del foro por subir la foto sin trigger warning.',
  'El gap de PSL entre %M y %L es tan obsceno que el foro lo cierra por unilateral.',
  'En la tier list del grupo: %M en S, %L todavía buscando una casilla por debajo de F donde meterse.',
  'Los foros usarían a %M de "antes" y a %L de "no hay después posible".',

  // --- Surgery / cope brutal ---
  '%L necesita rhinoplastia, genioplastia, lefort III y un milagro para llegar al baseline donde %M empieza dormido.',
  'Ni cuatro años de mewing, ni el mejor cirujano del planeta salvan a %L. %M solo necesita existir.',
  '%L acaba de descubrir en directo que su caso no es softmax, es "lo siento, no hay nada que hacer". %M ni se entera.',
  'El cope de %L ya está cargando. %M ni recuerda haber participado en un 1v1 tan desigual.',

  // --- Face card / verdicts brutal ---
  'El face card de %M no declina jamás. El de %L fue rechazado en la puerta y le rompieron el documento.',
  'No hay filtro, ángulo ni luz que meta a %L en el universo de %M. La física se rinde antes que %L.',
  'Simetría quirúrgica en %M. La cara de %L parece que se dibujó en un coche en marcha por un bache.',
  '%L cope. %M vive en la realidad donde %L nunca va a entrar aunque cope hasta morir.',
  'La jerarquía genética no tiene diploma, esfuerzo ni redención. %M arriba para siempre, %L abajo de nacimiento.',
  '%L es la razón por la que existe la palabra subhuman. %M es la razón por la que existe la palabra Chad.',
  '%L es el resultado de "las manos del creador temblaron ese día y encima no había garantía".',
  'Moggeo total, inapelable, humillante. %M ni miró. %L no se va a recuperar de este antes del lunes.',
  'Este mog entra directo al hall de la fama del grupo. %M leyenda, %L ejemplo de qué no querer ser.',

  // --- Personalidad / cope brutal ---
  '%L siempre dice que "la personalidad importa más". La personalidad de %M también gana. Doble L documentada.',
  '%L construyó su identidad en el cope de que el interior cuenta. %M ni necesita interior, el exterior ya ganó.',
  'El "glow up" de %L es esperar 10 años para llegar a donde %M empezó. It\'s over antes de empezar.',
  '%L va al gym, lee libros, trabaja la actitud. Sigue siendo %L. El óseo no se levanta a press.',
  'Cuánto esfuerzo para seguir perdiendo. %L es el argumento vivo de que el cope no escala.',

  // --- Looksmatch brutal ---
  '%M es looksmatch de top tier. %L es looksmatch de aquellos con quienes nadie quiere hacer match.',
  'El looksmatch de %L ya fue calculado por la hipergamia y el resultado es clasificado.',
  '%M puede bajar su estándar hasta cualquier punto. %L subiendo todos sus estándares llega al baseline de %M.',
  '%L cree que está fuera de su liga. %L ni siquiera está en la misma clasificación de ligas. Divisiones distintas.',

  // --- Height / presence brutal ---
  'Cuando %M entra a un sitio la temperatura cambia. Cuando %L entra nadie levanta la vista. Presencia genética.',
  '%M es la persona a quien todos quieren hablar sin saber por qué. %L es la persona a quien todos confunden con el mobiliario.',
  'El halo effect de %M funciona en automatismo. El de %L funciona al revés: empeora la primera impresión de todo lo que toca.',
  '%M genera interés social sin hacer nada. %L genera incomodidad social sin querer. Genética de ambas partes.',

  // --- LDAR / blackpill ---
  'El único camino válido para %L después de este mog es el LDAR consciente y con paz interior.',
  'Blackpill administrada en directo. %M es la prueba de que importa el punto de partida, no el esfuerzo. %L es el corolario.',
  'El resultado de este mog es solo la confirmación pública de lo que los foros llevan años documentando sobre el caso %L.',
  'It\'s over para %L de una forma tan total y tan irreversible que decirlo en voz alta ya no añade nada nuevo.',
];

async function cmdMog(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  let a, b;
  if (mentioned.length >= 2) [a, b] = mentioned.slice(0, 2);
  else if (mentioned.length === 1) { a = sender; b = mentioned[0]; }
  else {
    return sock.sendMessage(jid, {
      text: 'Usa: *!mog @a @b* (o *!mog @a* para medirte con alguien).',
    }, { quoted: msg });
  }

  if (bareJid(a) === bareJid(b)) {
    return sock.sendMessage(jid, { text: 'No puedes moggearte a ti mismo.' }, { quoted: msg });
  }

  const participants = groupMeta?.participants || [];
  const aIsOwner = isOwner(a, false, groupMeta);
  const bIsOwner = isOwner(b, false, groupMeta);
  const aIsAdmin = isAdmin(participants, a);
  const bIsAdmin = isAdmin(participants, b);

  const side = rollMog(aIsOwner, aIsAdmin, bIsOwner, bIsAdmin);
  const mogger = side === 'a' ? a : b;
  const mogged  = side === 'a' ? b : a;
  const numM = mogger.split('@')[0];
  const numL = mogged.split('@')[0];
  const numA = a.split('@')[0];
  const numB = b.split('@')[0];

  const phrase = pickFresh(MOG_PHRASES, `${jid}|mog`)
    .replace(/%M/g, `@${numM}`)
    .replace(/%L/g, `@${numL}`);

  const text =
    `*MOG CHECK*\n\n` +
    `@${numA} *vs* @${numB}\n\n` +
    `@${numM} *moggea* a @${numL}\n` +
    `${phrase}`;

  await sock.sendMessage(jid, { text, mentions: [a, b] }, { quoted: msg });
}

module.exports = { cmdMog };
