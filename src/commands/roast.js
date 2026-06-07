'use strict';

const { getSender, bareJid } = require('../utils/wa');
const { pick } = require('../utils/helpers');
const { getAura } = require('../utils/auraStore');
const { getUserCount } = require('../utils/messageCounter');

const ROAST_COOLDOWN_MS = 3 * 60 * 1000;
const lastRoast = new Map();

const fmt = n => n.toLocaleString('es-ES');

// ─── Roast banks per variable ─────────────────────────────────────────────────

// NAME roasts: the actual display name is injected as %N
const ROAST_NAME = [
  'El nombre %N dice todo lo que no dijeron en voz alta el día que te lo pusieron. Una decisión que resume el criterio familiar.',
  '%N. Alguien pensó durante días en ese nombre y llegó a eso. Eso resume el nivel intelectual de donde vienes.',
  'Te llamaron %N y ningún adulto con criterio lo cuestionó. Eso dice más de tu entorno que de ti, aunque tú seas el resultado.',
  'Con el nombre %N ya se sabe todo lo necesario antes de que abras la boca. No te ayuda.',
  '%N es el tipo de nombre que la gente repite dos veces para asegurarse de que lo escuchó bien, no por admiración.',
  'El nombre %N suena exactamente a la persona que eres: que prometía algo y no entregó nada concreto.',
  '%N. Genético, inmutable, y la primera impresión que la gente guarda de ti. No es prometedor.',
  'Hay nombres que abren puertas. %N anuncia quién llama antes de que decidan si abrirlas.',
  'Te pusieron %N y lo llevas con la misma energía con que fuiste elegido: sin filtro y sin criterio.',
  'El nombre %N en un currículum ya genera una expectativa. La tuya, concretamente, es baja.',
  'Que te llames %N y sigas siendo lo que eres es una consistencia que al menos tiene coherencia interna.',
  '%N. No es un insulto, es una descripción objetiva del punto de partida que nadie eligió pero que explica muchas cosas.',
  'Con el nombre %N te cargaron algo que ya condiciona la primera impresión sin que puedas hacer nada para evitarlo.',
  'Nadie elige su nombre. Pero sí elige qué hacer después. Llevas %N y tampoco ahí hay mucho que celebrar.',
  '%N es el tipo de nombre que la gente olvida a los tres minutos de la presentación. Por motivos que van más allá del nombre.',
  'Te bautizaron %N con toda la ilusión del mundo y mira cómo salió la inversión.',
  'El nombre %N tiene una energía muy concreta. Lamentablemente, es exactamente la que proyectas.',
  '%N es un nombre que existe. No dice nada especial, no posiciona, no destaca. Como la persona que lo lleva.',
  'Pusieron %N en el certificado y desde entonces ese documento no ha recibido ninguna noticia positiva.',
  'Con %N de nombre y lo que has construido después, la coherencia es total. Ninguna sorpresa en ninguna dirección.',
  'El nombre %N suena a promesa incumplida. Y tú llevas años siendo fiel a esa definición.',
  '%N es exactamente el nombre que pondría alguien que no pensó en las consecuencias a largo plazo. Familiar.',
  'Que te llames %N y no hayas hecho nada memorable con eso es un nivel de consistencia que ya es un logro en sí mismo.',
  'El nombre %N tenía potencial estadístico de llegar a algún sitio. Tú eres la excepción que baja el promedio.',
  '%N. Dos sílabas o más que la gente pronuncia y enseguida deja de pensar en ellas. Sin rastro.',
];

// BIO roasts — two pools: empty bio and non-empty bio
const ROAST_BIO_EMPTY = [
  'Sin descripción. Ni siquiera en el único espacio donde decides cómo presentarte hay algo. Un lienzo en blanco que confirma lo que todos sospechaban.',
  'La bio vacía no es minimalismo ni misterio. Es que no hay nada que poner y en el fondo ya lo sabes.',
  'Un perfil sin bio en 2025 es una declaración. Dice: no tengo nada interesante que decir de mí mismo. Al menos en eso hay honestidad.',
  'Sin bio. Invisible hasta en el único sitio donde no cuesta nada ser algo. Eso tiene mérito de lo malo.',
  'La bio vacía es la forma más elegante de decir que no se tiene nada que ofrecer. No tan elegante como parece.',
  'Ni una frase. Ni un emoji solitario. La nada absoluta donde debería haber algo que decir. Coherente con el resto.',
  'Tienes el espacio y la oportunidad de presentarte y eliges el silencio. El silencio también comunica.',
  'Sin descripción porque ponerla significaría decidir qué eres. Y eso requiere tener algo que decidir.',
  'La bio vacía dice exactamente lo mismo que dices cuando hablas: nada que se quede.',
  'Ni un intento. El único espacio tuyo de verdad y lo dejas en blanco. Eso ya es una presentación completa.',
  'Sin bio. Lo que la gente ve cuando te busca es un perfil que anuncia que no hay nada detrás.',
  'La bio vacía es la versión de WhatsApp del cuarto vacío: todos ven que no hay nadie viviendo ahí.',
  'Podrías haber puesto cualquier cosa. Una frase, una fecha, un emoji. Elegiste no poner nada. Significativo.',
];

const ROAST_BIO_FULL = [
  'La bio es el único sitio donde alguien decide conscientemente cómo quiere que lo vean. La tuya ya lo dice todo sobre cómo estás.',
  'Lo que pusiste en la bio era para impresionar y el resultado es exactamente el opuesto. Ese es el problema con el branding sin sustancia.',
  'La descripción que tienes en el perfil es la versión de ti mismo que consideraste presentable. Eso da que pensar.',
  'Tu bio es exactamente lo que pone la gente cuando quiere parecer algo que no es. Familiar.',
  'Pusiste algo en la bio para que la gente pensara bien de ti. Lo que piensan está ahí, pero no es lo que calculabas.',
  'La bio que tienes dice más de ti que lo que crees. Y lo que dice no es lo que pretendías comunicar.',
  'Redactaste tu propia descripción y llegaste a eso. Ese es el nivel de criterio con el que operas.',
  'La bio es la primera impresión que controlas del todo. Y aun así salió así. Imagina las que no controlas.',
  'Lo que escribiste en la bio lo escribiste para que la gente te viera de una forma. Lo que ven es otra.',
  'Tienes una bio porque crees que dice algo bueno de ti. El grupo ya la leyó y llegó a sus propias conclusiones.',
  'La descripción del perfil: el único texto que redactas tú solo, sin presión, con tiempo. Y salió así.',
  'Pusiste algo en la bio que en tu cabeza sonaba bien. Fuera de tu cabeza el efecto es distinto.',
];

// ACTIVITY roasts — based on actual message count
function roastActivity(count) {
  if (count === 0) {
    return pick([
      'Cero mensajes registrados. Ni un solo texto, ni una sola reacción, ni un solo signo de vida en este grupo. Eso no es timidez, es no existir.',
      'Cero mensajes. El grupo no tiene ni un solo registro de que estás aquí. Eso es un nivel de invisibilidad que hay que trabajárselo.',
      'Sin actividad documentada. Ni un mensaje, ni un hola, ni un sticker de relleno. Presencia de fantasma sin ni siquiera el esfuerzo de aparecer.',
      'El contador dice cero. Estás en el grupo y no has dejado ni una huella. Eso no es discreción, es no estar.',
      'Cero mensajes. Llevas en este grupo el tiempo suficiente para que se note que no existes dentro de él.',
    ]);
  }
  if (count < 20) {
    return pick([
      `${fmt(count)} mensajes. Lo que aportas al grupo en total cabe en una pantalla sin hacer scroll. Presencia testimonial de la más irrelevante.`,
      `${fmt(count)} mensajes en total. A ese ritmo la gente del grupo va a necesitar que alguien les recuerde que existes.`,
      `${fmt(count)} textos en el historial. No es timidez, es indiferencia hacia el grupo que te tiene ahí sin que hagas nada por merecerlo.`,
      `Con ${fmt(count)} mensajes en el contador eres prácticamente un contacto de agenda. Estás guardado pero no vives aquí.`,
      `${fmt(count)} mensajes. Llevas más tiempo en este grupo del que esos ${fmt(count)} mensajes merecen.`,
    ]);
  }
  if (count < 100) {
    return pick([
      `${fmt(count)} mensajes. Suficiente para saber que existes, insuficiente para que el grupo note si desapareces mañana.`,
      `${fmt(count)} textos. Presencia de los que leen todo y no aportan nada. El público silencioso que el grupo no necesitaba.`,
      `Con ${fmt(count)} mensajes estás en la zona de los que están pero no cuentan. No eres fantasma pero tampoco eres parte de nada.`,
      `${fmt(count)} mensajes. El tipo de cifra que no dice nada porque viene de alguien que tampoco dice nada.`,
      `${fmt(count)} textos en el marcador. Por debajo del umbral en el que alguien empieza a importar dentro del grupo.`,
    ]);
  }
  if (count < 500) {
    return pick([
      `${fmt(count)} mensajes y el grupo sigue sin saber muy bien qué aportaste con ninguno de ellos.`,
      `${fmt(count)} textos enviados. Actividad media que no ha dejado ninguna marca concreta en el historial de nada.`,
      `Con ${fmt(count)} mensajes has conseguido estar sin destacar. Constancia sin dirección.`,
      `${fmt(count)} mensajes. Suficiente para no ser fantasma, insuficiente para que alguien te recuerde por algo específico.`,
      `${fmt(count)} textos y la aportación al grupo se resume en: estaba.`,
    ]);
  }
  // high activity: roast as having no life
  return pick([
    `${fmt(count)} mensajes en este grupo. Eso no es ser activo, es que esto es tu vida social y el grupo lo sabe.`,
    `${fmt(count)} textos enviados aquí. Cantidad que levanta preguntas sobre qué pasa fuera de la pantalla.`,
    `Con ${fmt(count)} mensajes eres la persona que más tiempo pasa aquí. Y eso, viniendo de este grupo, es una afirmación difícil de procesar.`,
    `${fmt(count)} mensajes. El récord de actividad de alguien cuya agenda claramente tiene mucho espacio libre.`,
    `${fmt(count)} textos en el contador. Hay gente que trabaja menos horas de las que tú llevas aquí escribiendo.`,
  ]);
}

// AURA roasts — based on actual aura value
function roastAura(aura) {
  if (aura < -10000) {
    return pick([
      `${fmt(aura)} de aura. Una cifra tan negativa que ni el sistema sabe bien cómo categorizarla. Historial de fracasos documentados en tiempo real.`,
      `Aura de ${fmt(aura)}. Negativo histórico. El tipo de marcador que confirma que el problema no es la mala suerte sino el patrón.`,
      `${fmt(aura)} puntos. El sótano tiene otro sótano y tú ya encontraste la escalera. Sin nadie cerca mirando.`,
      `Con ${fmt(aura)} de aura estás en territorio donde ni los más pesimistas del grupo esperaban verte llegar. Y llegaste solo.`,
      `${fmt(aura)} de aura. Una cifra que dice todo lo que hace falta decir sobre cómo han ido las cosas hasta ahora.`,
    ]);
  }
  if (aura < 0) {
    return pick([
      `${fmt(aura)} de aura. En negativo. Eso es el marcador oficial de cómo han ido las cosas aquí.`,
      `Aura negativa: ${fmt(aura)}. El sistema lleva la cuenta de cada decisión y el resultado está a la vista.`,
      `${fmt(aura)} puntos. Menos de cero. La única dirección que conoces en este marcador es la que baja.`,
      `Con ${fmt(aura)} de aura el historial habla solo. Y lo que dice no requiere traducción.`,
      `${fmt(aura)} de aura. En rojo. El tipo de racha que ya no es racha sino identidad.`,
    ]);
  }
  if (aura < 2000) {
    return pick([
      `${fmt(aura)} de aura. A duras penas en positivo. Esa es la definición de sobrevivir sin destacar.`,
      `Aura de ${fmt(aura)}. Positivo por poco, lo que significa negativo en términos de impacto real.`,
      `${fmt(aura)} puntos. El tipo de cifra que no da orgullo ni vergüenza porque no da nada.`,
      `Con ${fmt(aura)} de aura llevas el tipo de marcador que nadie enseña a nadie voluntariamente.`,
      `${fmt(aura)} de aura. Positivo sin convicción. Eso dice exactamente lo que hace falta decir.`,
    ]);
  }
  if (aura < 10000) {
    return pick([
      `${fmt(aura)} de aura. Una cifra que dice que algo hiciste bien en algún momento. No muchas cosas, pero algo.`,
      `Aura de ${fmt(aura)}. Correcto. El marcador de los que no destacan para bien ni para mal.`,
      `${fmt(aura)} puntos. El promedio tiene ese aspecto. No va a abrir ninguna puerta.`,
      `Con ${fmt(aura)} de aura llevas una cifra completamente olvidable. Consistente con el resto.`,
      `${fmt(aura)} de aura. Medio. El número más honesto que podrías tener y aun así no dice nada bueno.`,
    ]);
  }
  // high aura
  return pick([
    `${fmt(aura)} de aura. Alto. Sorprendentemente alto dado quién lo acumula. El sistema tiene días raros.`,
    `Aura de ${fmt(aura)}. Una cifra que no cuadra con lo que el grupo ve cada día. Suerte documentada.`,
    `${fmt(aura)} puntos de aura. El marcador miente a veces. Hoy es uno de esos días.`,
    `Con ${fmt(aura)} de aura alguien en este grupo debería revisar si el sistema funciona correctamente.`,
    `${fmt(aura)} de aura. Ese número no tiene ningún respaldo en hechos observables. Pero ahí está.`,
  ]);
}

// ─── Command ──────────────────────────────────────────────────────────────────

async function cmdRoast(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);
  const coolKey = `${jid}|${bareJid(sender)}`;
  const last = lastRoast.get(coolKey) || 0;
  const remaining = ROAST_COOLDOWN_MS - (Date.now() - last);
  if (remaining > 0) {
    const mins = Math.ceil(remaining / 60_000);
    return sock.sendMessage(jid, { text: `Espera *${mins}min* para volver a roastear.` }, { quoted: msg });
  }

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (!mentioned.length) {
    return sock.sendMessage(jid, {
      text: 'Usa: *!roast @alguien*',
    }, { quoted: msg });
  }

  const target = mentioned[0];
  if (bareJid(target) === bareJid(sender)) {
    return sock.sendMessage(jid, { text: 'Roastearte a ti mismo es un nivel de autoflagelación que ni el bot va a facilitar.' }, { quoted: msg });
  }

  lastRoast.set(coolKey, Date.now());

  // Gather all 4 variables
  const participants = groupMeta?.participants || [];
  const participant = participants.find(p => bareJid(p.id) === bareJid(target));
  const displayName = participant?.name
    || msg.message?.extendedTextMessage?.contextInfo?.participant
    || target.split('@')[0].split(':')[0];

  const [bioResult, msgCount, aura] = await Promise.all([
    sock.fetchStatus(target).catch(() => null),
    getUserCount(jid, target),
    getAura(jid, target),
  ]);

  const bio = bioResult?.status?.trim() || '';

  // Pick one of 4 variables at random, weighted equally
  const variable = Math.floor(Math.random() * 4);
  let roastText;

  switch (variable) {
    case 0: { // name
      roastText = pick(ROAST_NAME).replace(/%N/g, displayName);
      break;
    }
    case 1: { // bio
      roastText = bio
        ? pick(ROAST_BIO_FULL)
        : pick(ROAST_BIO_EMPTY);
      break;
    }
    case 2: { // activity
      roastText = roastActivity(msgCount);
      break;
    }
    case 3: { // aura
      roastText = roastAura(aura);
      break;
    }
  }

  const targetNum = target.split('@')[0];
  await sock.sendMessage(jid, {
    text: `*ROAST — @${targetNum}*\n\n${roastText}`,
    mentions: [target],
  }, { quoted: msg });
}

module.exports = { cmdRoast };
