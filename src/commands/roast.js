'use strict';

const { getSender, bareJid } = require('../utils/wa');
const { pick } = require('../utils/helpers');
const { getAura } = require('../utils/auraStore');
const { getUserCount } = require('../utils/messageCounter');

const fmt = n => n.toLocaleString('es-ES');

// ─── Roast banks per variable ─────────────────────────────────────────────────

// NAME roasts — %N is replaced with the display name
const ROAST_NAME = [
  'Con el nombre %N ya se sabe todo: de dónde vienes, qué nivel de criterio hubo en casa el día que te pusieron eso, y por qué llevas toda la vida compensando algo que ni tú sabes nombrar.',
  '%N. Alguien en tu familia tomó esa decisión en serio y ningún adulto en la sala lo frenó. Ese es el primer fracaso colectivo del que vienes.',
  'Te llamas %N y cargas con eso cada vez que te presentas a alguien. La primera impresión ya es un obstáculo antes de abrir la boca.',
  'El nombre %N no abre puertas. Anuncia al portero quién llega, y el portero ya tomó una decisión antes de que llegues.',
  '%N es el tipo de nombre que en un currículum genera una pausa. No de admiración. La otra clase de pausa.',
  'Pusieron %N en el acta y nadie cuestionó si eso le iba a hacer la vida más difícil o más fácil al crío. La respuesta ya la conoces.',
  'Llevas el nombre %N con la misma energía con la que te eligieron ese nombre: sin que nadie hiciera las preguntas correctas antes.',
  'El nombre %N tiene una historia detrás. Desgraciadamente no es una historia que nadie quiera escuchar hasta el final.',
  'Con %N de nombre ya tienes un marcador de partida. No es el peor del mundo, pero tampoco te está haciendo ningún favor documentado.',
  'Te bautizaron %N con toda la ilusión del mundo y luego el tiempo demostró que la ilusión era lo único que había.',
  '%N suena exactamente como lo que eres: algo que prometía y no cerró el trato en ningún momento concreto.',
  'El nombre %N lleva pegado un contexto social que la gente lee en menos de un segundo. Tú no lo ves porque lo llevas desde siempre.',
  'Que te llames %N y no hayas hecho nada memorable con eso todavía es un nivel de consistencia que ya es casi un rasgo de personalidad.',
  '%N es un nombre que existe. No dice nada especial sobre quién lo lleva. En tu caso esa ambigüedad es la descripción más precisa posible.',
  'Pusieron %N en el documento y desde entonces ese documento no ha recibido ni una noticia que haga que alguien se alegre de haber elegido ese nombre.',
  'Con el nombre %N y la trayectoria que llevas asociada, la coherencia entre los dos es lo más consistente de toda tu historia.',
  '%N es exactamente el nombre que pone alguien que no calculó a largo plazo. Esa falta de previsión viene de familia, se ve.',
  'El nombre %N en voz alta genera una reacción. No siempre la que buscas, pero sí siempre la misma.',
  'Nadie elige su nombre. Pero sí elige qué construir después de él. Llevas %N y en el segundo capítulo tampoco hay mucho que celebrar.',
  'Te llamas %N y el grupo lleva tiempo sin saber cómo decirte que el nombre es lo de menos a estas alturas.',
  '%N. La gente lo escucha, lo repite para acordarse, y al día siguiente ya lo olvidó. Por el nombre y por todo lo demás.',
  'Con %N de nombre te pusieron una etiqueta que dice más del origen que del destino. Y el destino tampoco ha ayudado a desmentirlo.',
  'El nombre %N lleva el acento justo donde nadie esperaba, igual que tú: siempre un poco fuera de donde debería caer.',
  'Que alguien se llame %N y siga teniendo el perfil que tienes es la evidencia de que el nombre no era el único problema.',
  '%N es el nombre con el que alguien decidió que ibas a presentarte al mundo para siempre. El mundo ya tomó nota.',
];

// BIO roasts — empty bio pool
const ROAST_BIO_EMPTY = [
  'Sin descripción. El único espacio donde decides cómo quieres que te vean y lo dejaste en blanco. No es misterio. Es que no hay nada que valga la pena poner y en el fondo ya lo asumiste.',
  'Bio vacía en 2025. Ni una frase, ni un emoji de relleno, ni un intento miserable. El único sitio donde nadie te puede juzgar por lo que pones y aun así elegiste no poner nada. Transparencia involuntaria.',
  'La bio en blanco no es minimalismo ni estética. Es la confirmación de que no tienes una sola cosa interesante que decir sobre ti mismo cuando te lo piensas con calma y sin presión.',
  'Sin bio porque ponerla significaría decidir quién eres. Y eso requiere tener algo que decidir. El blanco lo dice todo sin necesitar palabras.',
  'El perfil vacío es la versión digital de entrar a una habitación y que nadie levante la vista. Ni el espacio más tuyo del mundo te da material para rellenar.',
  'Tienes el campo de descripción ahí, disponible, tuyo, sin límites de juicio externo, y lo dejaste vacío. Eso ya es un autorretrato más honesto de lo que cualquier frase habría conseguido.',
  'Sin una sola palabra en la bio. El único texto que redactas sin que nadie te lo pida ni te evalúe, y aun así el resultado es la nada. Consistente con el historial.',
  'Bio en blanco. Lo que la gente ve cuando te busca es un perfil que anuncia en silencio que detrás no hay nada que merezca espacio.',
  'Ni un intento. El único sitio donde controlas la narrativa al cien por cien y elegiste no tener narrativa. Eso ya es una declaración.',
  'La descripción vacía dice exactamente lo mismo que dices cuando hablas: nada que se quede, nada que importe, nada que nadie vaya a recordar mañana.',
];

// BIO roasts — non-empty bio pool
const ROAST_BIO_FULL = [
  'La bio es el único texto que escribes tú solo, sin presión, con tiempo ilimitado, para que la gente te vea como quieres. Y aun así salió así. Imagina los textos que redactas con prisa.',
  'Lo que pusiste en la descripción lo pusiste porque creíste que decía algo bueno de ti. El grupo ya lo leyó. Las conclusiones no son las que calculabas.',
  'Redactaste tu propia presentación al mundo con toda la calma del mundo, sin que nadie te presionara, y llegaste a eso. Ese es el techo de tu criterio operando sin restricciones.',
  'La bio es el branding personal más básico que existe y aun así conseguiste que comunicara exactamente lo contrario de lo que pretendías. Talento inverso.',
  'Tu descripción de perfil dice más de ti que lo que crees. Y lo que dice no es lo que escribiste, es lo que se lee entre líneas en cada palabra que elegiste poner.',
  'Pusiste algo en la bio para que la gente pensara bien de ti. Lo que piensan lo tienen claro, pero no es lo que calculabas cuando lo escribiste.',
  'La descripción del perfil: el único texto completamente tuyo, con tiempo y sin presión. El resultado está ahí para que todo el que te busca lo vea antes de decidir si seguir mirando.',
  'Tienes una bio porque crees que te define bien. El grupo ya la leyó hace tiempo y llegó a sus propias conclusiones sin necesitar discutirlo.',
  'Lo que escribiste en la descripción en tu cabeza sonaba a algo. Fuera de tu cabeza tiene un efecto completamente distinto que nadie te ha tenido el valor de explicarte.',
  'Tu bio es la primera impresión que controlas del todo. Y con toda esa ventaja, aun así salió así. Las que no controlas deben ser un desastre.',
];

// ACTIVITY roasts — based on actual message count
function roastActivity(count) {
  if (count === 0) {
    return pick([
      'Cero mensajes registrados. Estás en el grupo, ocupas espacio, consumes notificaciones, y no has aportado absolutamente nada. Ni una palabra, ni una reacción. Presencia de parásito sin ni siquiera el esfuerzo de disimularlo.',
      'El contador dice cero. Ni un mensaje. Llevas en este grupo el tiempo suficiente como para que eso ya no sea vergonzoso, sea identidad. El fantasma que ni siquiera da señales de vida cuando lo ignoran.',
      'Cero mensajes en el historial. Entras, ves, te vas. Llevas aquí como un voyeur que ni siquiera tiene la decencia de salir. El grupo no tiene ni un solo registro de que existes dentro de él.',
      'Sin un solo mensaje. Eso no es timidez, no es discreción, no es personalidad de fondo. Es que no tienes nada que decir y el grupo lleva tiempo sin perder el sueño por eso.',
      'Cero textos. El nivel más puro de consumir sin aportar. El que está en todos los grupos sin estar en ninguno, que es la forma más honesta de decir que no le importa nada de lo que pasa aquí.',
    ]);
  }
  if (count < 20) {
    return pick([
      `${fmt(count)} mensajes en total. Lo que aportas al grupo en todo el tiempo que llevas aquí cabe en una pantalla sin hacer scroll. Presencia decorativa que nadie pidió.`,
      `${fmt(count)} textos. A ese ritmo el grupo va a necesitar que alguien les recuerde que sigues vivo. No por preocupación, sino para saber si merece la pena seguir contándote.`,
      `Con ${fmt(count)} mensajes llevas en este grupo más tiempo del que esos ${fmt(count)} mensajes justifican. Ocupas una plaza que alguien con algo que decir podría aprovechar mejor.`,
      `${fmt(count)} mensajes. El tipo de actividad que le dice al grupo exactamente cuánto le importa lo que pasa aquí. Número honesto, aunque por las razones equivocadas.`,
      `${fmt(count)} textos en el historial. Suficiente para saber que existes, insuficiente para que a alguien le importe si dejas de hacerlo.`,
    ]);
  }
  if (count < 100) {
    return pick([
      `${fmt(count)} mensajes. Presencia de los que leen todo y no aportan nada. El público silencioso que consume el trabajo de los demás y desaparece cuando toca poner algo sobre la mesa.`,
      `Con ${fmt(count)} mensajes estás en la zona de los que están pero no cuentan. No eres fantasma del todo pero tampoco eres parte de ninguna conversación que a alguien le importe recordar.`,
      `${fmt(count)} textos enviados. Por debajo del umbral en el que alguien empieza a importar dentro de un grupo. Todavía en el territorio donde eres un número en una lista de participantes.`,
      `${fmt(count)} mensajes y el grupo sigue sin saber bien qué haces aquí. No en el mal sentido. En el sentido de que nadie tiene datos suficientes para saberlo porque no los has dado.`,
      `${fmt(count)} textos. La cantidad justa para que no te expulsen por inactivo y no suficiente para que nadie note si te vas mañana sin decir nada.`,
    ]);
  }
  if (count < 500) {
    return pick([
      `${fmt(count)} mensajes y el grupo sigue sin saber muy bien qué aportaste con ninguno de ellos. Cantidad sin calidad. Presencia sin impacto. El peor de los mundos posibles.`,
      `${fmt(count)} textos enviados. Actividad media que no ha dejado ninguna marca concreta en el historial de nada. Estuviste, escribiste, nadie recuerda de qué.`,
      `Con ${fmt(count)} mensajes conseguiste estar sin destacar, opinar sin convencer y escribir sin que nadie lo cite después. Constancia completamente inútil.`,
      `${fmt(count)} mensajes. Suficiente para no ser fantasma, insuficiente para que alguien pueda citar una sola cosa tuya que haya cambiado algo en este grupo.`,
      `${fmt(count)} textos y la aportación real al grupo se puede resumir en: estaba. Eso es lo que queda cuando alguien escribe mucho y no dice nada.`,
    ]);
  }
  return pick([
    `${fmt(count)} mensajes en este grupo. Eso no es ser activo, es que esto es tu vida social y el grupo lo sabe. Hay gente con pareja, trabajo y vida fuera que lleva menos tiempo aquí que tú.`,
    `${fmt(count)} textos enviados aquí. A ese volumen hay que plantearse cuántas horas al día pasa alguien pegado a esta pantalla en lugar de hacer algo que valga la pena fuera de ella.`,
    `Con ${fmt(count)} mensajes eres la persona que más tiempo pasa en este grupo. Eso, en un grupo que tiene el nivel que tiene, es una afirmación con la que nadie debería poder vivir tranquilo.`,
    `${fmt(count)} mensajes. El récord de actividad de alguien cuya agenda claramente tiene agujeros del tamaño de un grupo de WhatsApp. Busca algo que hacer fuera de aquí.`,
    `${fmt(count)} textos en el contador. Hay personas que trabajan, estudian y mantienen relaciones humanas reales en menos horas de las que tú llevas aquí escribiendo al vacío.`,
  ]);
}

// AURA roasts — based on actual aura value
function roastAura(aura) {
  if (aura < -10000) {
    return pick([
      `${fmt(aura)} de aura. Una cifra tan negativa que ya no es mala racha, es identidad. El marcador oficial de alguien que lleva tiempo demostrando quién es y por fin tiene el número que lo confirma.`,
      `Aura de ${fmt(aura)}. Negativo histórico. El tipo de marcador que ya no necesita contexto ni explicación. Dice todo lo que hace falta decir sobre cómo han ido las cosas y por qué.`,
      `${fmt(aura)} puntos. El sótano tiene otro sótano y tú encontraste la escalera solo, sin ayuda, con una consistencia que casi merece reconocimiento por lo difícil que es mantenerla.`,
      `Con ${fmt(aura)} de aura llevas un historial que ningún sistema de estadísticas necesita analizar. La dirección está clara, el destino también, y nadie en este grupo finge sorprenderse ya.`,
      `${fmt(aura)} de aura. Tan en negativo que ya no genera pena, genera una especie de respeto involuntario por la capacidad de seguir perdiendo con tanta consistencia y sin aparente autoconsciencia.`,
    ]);
  }
  if (aura < 0) {
    return pick([
      `${fmt(aura)} de aura. En rojo. Eso es el resultado oficial de todo lo que has hecho aquí. No hay interpretación alternativa, no hay contexto que lo matice. El número es el veredicto.`,
      `Aura negativa: ${fmt(aura)}. El sistema lleva la cuenta de cada decisión y el marcador es lo que ves. Sin excusas, sin atenuantes, sin nadie más a quien echarle la culpa de ese número.`,
      `${fmt(aura)} puntos. Menos de cero. La única dirección que conoces en este marcador es la que baja, y llevas suficiente tiempo demostrándolo como para que ya nadie espere un cambio.`,
      `Con ${fmt(aura)} de aura el historial habla solo. Y lo que dice es claro, consistente, y lleva tiempo diciéndolo sin que tú hayas hecho nada concreto para cambiar la narrativa.`,
      `${fmt(aura)} de aura. Negativo. El tipo de racha que ya dejó de ser racha hace meses y que cualquier observador honesto describiría como el resultado natural de ser quien eres aquí.`,
    ]);
  }
  if (aura < 2000) {
    return pick([
      `${fmt(aura)} de aura. A duras penas en positivo. La diferencia entre eso y el cero es tan pequeña que cualquier día malo te manda al otro lado. Y los días malos los tienes con facilidad.`,
      `Aura de ${fmt(aura)}. Positivo por los pelos. Eso no es un logro, es sobrevivir. Y sobrevivir en un marcador de aura no es exactamente algo que presumir delante de nadie.`,
      `${fmt(aura)} puntos. El tipo de cifra que no genera orgullo ni vergüenza porque es demasiado mediocre para provocar ninguna de las dos cosas en nadie que lo vea.`,
      `Con ${fmt(aura)} de aura llevas el marcador de los que ni siquiera caen con estilo. Ni suficientemente bien para que nadie lo note, ni suficientemente mal para que sea interesante.`,
      `${fmt(aura)} de aura. Positivo sin convicción. Un número que dice exactamente lo que hace falta decir sobre el nivel de impacto que has tenido aquí desde que llegas.`,
    ]);
  }
  if (aura < 10000) {
    return pick([
      `${fmt(aura)} de aura. El marcador de los que no destacan para bien ni para mal. Correcto en el sentido más burocrático del término. No va a abrir ninguna puerta ni cerrarla tampoco.`,
      `Aura de ${fmt(aura)}. Medio. El número más honesto que podrías tener y aun así no dice nada que merezca que alguien lo mencione en ninguna conversación sobre nadie.`,
      `${fmt(aura)} puntos. El promedio tiene exactamente ese aspecto. Invisible, inofensivo, completamente olvidable. El marcador de quien existe sin dejar rastro concreto.`,
      `Con ${fmt(aura)} de aura llevas una cifra que confirma lo que el grupo ya sospechaba: ni para arriba ni para abajo. Estás ahí, el marcador lo registra, y nadie sabe bien para qué.`,
      `${fmt(aura)} de aura. Mediocre con precisión estadística. El tipo de número que en cualquier sistema de valoración se traduce como: puede irse sin que nadie lo note durante días.`,
    ]);
  }
  return pick([
    `${fmt(aura)} de aura. Alto. Sorprendentemente alto dado todo lo demás. El marcador tiene días raros y hoy claramente es uno de ellos, porque el número no cuadra con lo observable.`,
    `Aura de ${fmt(aura)}. Una cifra que no tiene ningún respaldo coherente en lo que el grupo ve cada día. La suerte existe, es documentable, y en este caso es lo único que explica ese número.`,
    `${fmt(aura)} puntos de aura. Ese número y la persona que lo acumula no encajan en ningún modelo lógico. El sistema falla a veces. Este es uno de esos casos con nombre y apellido.`,
    `Con ${fmt(aura)} de aura alguien debería revisar si el algoritmo tiene un bug o si simplemente la suerte ciega no discrimina por mérito. La segunda opción es la más probable aquí.`,
    `${fmt(aura)} de aura. El marcador más mentiroso que ha generado este grupo hasta la fecha. Ese número existe, está ahí, y no tiene ninguna relación observable con quien lo lleva.`,
  ]);
}

// ─── Command ──────────────────────────────────────────────────────────────────

async function cmdRoast(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (!mentioned.length) {
    return sock.sendMessage(jid, { text: 'Usa: *!roast @alguien*' }, { quoted: msg });
  }

  const target = mentioned[0];
  if (bareJid(target) === bareJid(sender)) {
    return sock.sendMessage(jid, { text: 'Roastearte a ti mismo es un nivel de autoflagelación que ni el bot va a facilitar.' }, { quoted: msg });
  }

  // Gather all 4 variables
  const participants = groupMeta?.participants || [];
  const participant = participants.find(p => bareJid(p.id) === bareJid(target));
  const displayName = participant?.name
    || target.split('@')[0].split(':')[0];

  const [bioResult, msgCount, aura] = await Promise.all([
    sock.fetchStatus(target).catch(() => null),
    getUserCount(jid, target),
    getAura(jid, target),
  ]);

  const bio = bioResult?.status?.trim() || '';

  const variable = Math.floor(Math.random() * 4);
  let roastText;

  switch (variable) {
    case 0:
      roastText = pick(ROAST_NAME).replace(/%N/g, displayName);
      break;
    case 1:
      roastText = bio ? pick(ROAST_BIO_FULL) : pick(ROAST_BIO_EMPTY);
      break;
    case 2:
      roastText = roastActivity(msgCount);
      break;
    case 3:
      roastText = roastAura(aura);
      break;
  }

  const targetNum = target.split('@')[0];
  await sock.sendMessage(jid, {
    text: `*ROAST — @${targetNum}*\n\n${roastText}`,
    mentions: [target],
  }, { quoted: msg });
}

module.exports = { cmdRoast };
