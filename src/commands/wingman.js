'use strict';

const { getTargetOrSelf, isMainOwner } = require('../utils/wa');
const { pick } = require('../utils/helpers');

// Comandos tipo wingman (positivos/divertidos): puntúan el juego, lanzan piropos
// y dan consejos de ligue. Sin emojis (regla del bot). %N se reemplaza por la
// mención del objetivo (o del propio autor si no menciona a nadie).

const RIZZ = {
  high: [
    '%N tiene tanto rizz que hasta el corrector le dice que si.',
    'Cuando %N entra a un sitio, el ambiente sube de temperatura solo.',
    'A %N no le hace falta ligar, la gente cae sola en su orbita.',
    'El nivel de labia de %N deberia estar prohibido por competencia desleal.',
    '%N escribe un simple hola y le contestan con un parrafo entero.',
    'Con ese carisma, %N le venderia hielo a un pinguino y encima pediria propina.',
    '%N no busca conversacion, la conversacion lo busca a el.',
    'Poner a %N en modo seduccion es como soltar un tiburon en una piscina.',
    'La confianza de %N se mide en escala Richter.',
    'Basta una mirada de %N y ya tienes media cita cerrada.',
    'Aqui no hay debate: %N es rizz en estado puro.',
    '%N podria leer la lista de la compra y sonaria a poema.',
    'Todos quieren estar cerca de %N y nadie sabe bien por que, pero funciona.',
    'El dia que inventaron el carisma, %N estaba en primera fila cobrando derechos.',
    '%N no tiene rachas malas, tiene victorias con distinto margen.',
    'Si el rizz fuera un deporte, %N ya tendria un estadio con su nombre.',
    'La labia de %N no se aprende, se hereda y encima con intereses.',
  ],
  mid: [
    '%N tiene juego, el problema es que a veces se le olvida traerlo.',
    'Un dia %N deja a todos con la boca abierta y al siguiente pide perdon por existir.',
    'El rizz de %N funciona como el wifi del pueblo: va y viene.',
    '%N la clava una de cada tres, que para la media ya es una hazana.',
    'Con %N nunca sabes si vas a ver magia o un accidente en directo.',
    '%N tiene potencial de sobra, lo que le falta es punteria.',
    'La labia de %N esta en fase beta, todavia falla a veces.',
    '%N arranca fuerte y luego se estrella contra su propio silencio.',
    'Hay noches en que %N brilla y noches en que se apaga sin avisar.',
    '%N juega bien hasta que piensa demasiado, y ahi lo pierde todo.',
    'El carisma de %N existe, solo que trabaja a media jornada.',
    '%N tiene lo necesario, le falta creerselo dos segundos mas.',
    'A veces %N suelta una frase perfecta y a veces se disculpa por respirar.',
    'El talento de %N esta sin pulir, como un diamante que todavia hace ruido.',
    '%N va de menos a mas, el tema es que empieza muy de menos.',
    'Con un poco de calma, %N pasaria de un casi a un toma.',
    '%N tiene dias de crack y dias de tutorial nivel uno.',
  ],
  low: [
    '%N intenta ligar y el universo entero le pone modo avion.',
    'La friendzone tiene una habitacion con el nombre de %N en la puerta.',
    '%N suelta una frase de flirteo y hasta el eco le da verguenza ajena.',
    'El rizz de %N esta tan bajo que ya sale en negativo.',
    '%N se traba tanto que el hola le sale en tres entregas.',
    'Ni por accidente liga %N, y mira que el accidente lo tiene entrenado.',
    '%N manda un mensaje coqueto y le responden con el manual de instrucciones.',
    'El carisma de %N esta en mantenimiento desde hace varias temporadas.',
    '%N flirtea con la misma soltura con la que se ata los cordones a oscuras.',
    'Cuando %N lo intenta, el momento se vuelve incomodo por defecto.',
    '%N tiene el rizz apagado y encima perdio el cargador.',
    'La confianza de %N sale corriendo justo cuando mas la necesita.',
    '%N ensaya frases delante del espejo y hasta el espejo se aparta.',
    'En el juego del ligue, %N sigue buscando el boton de empezar.',
    '%N cae bien, si, pero como amigo y con carta de recomendacion.',
    'El unico match de %N esta semana fue con el sofa.',
    '%N suelta un piropo y el ambiente pide un minuto de silencio.',
  ],
};

const PIROPOS = [
  'Si ligar fuera delito, %N, ya estarias cumpliendo cadena perpetua.',
  'Dicen que la perfeccion no existe, y luego apareces tu y dejas a la ciencia en ridiculo.',
  'Llevo todo el dia pegado a una sola idea, y esa idea tiene tu nombre, %N.',
  'Tranquilo, no hace falta que hagas nada: con solo aparecer ya vas ganando el partido.',
  'Me debes un cafe, porque desde que te vi no me concentro en absolutamente nada.',
  'El unico problema real de esta sala es que el resto tenga que competir contigo.',
  'Como notificacion tuya, te dejaria sonar todo el dia sin silenciarte ni una vez.',
  'No tengo frio, es que tu mirada me esta poniendo la piel de gallina.',
  '%N, tienes un nivel de encanto que ya deberia declararse a Hacienda.',
  'Podria describirte con mil palabras, pero se me olvidan todas justo cuando entras.',
  'Cuidado al caminar, que llevas encima un peligro que responde al nombre de carisma.',
  'Record mundial de flechazo batido esta noche, y el responsable eres tu.',
  'No necesito excusas para escribirte; me sobra con que existas para tener ganas.',
  'Aviso al grupo: acaba de entrar la razon por la que hoy ando sonriendo.',
  '%N, si la confianza fuera moneda serias millonario, y encima de los que invitan.',
  'Me quedaria sin bateria mucho antes que sin ganas de seguir mirandote.',
  'Lo bueno se hace esperar, dicen, y contigo cada segundo de espera cotiza al alza.',
  'Tienes cara de plan de viernes y energia de fin de semana largo.',
  'Esto no es un piropo de relleno: de verdad subes el nivel de toda la sala.',
  'Cuando me preguntan cual es mi tipo, ahora me basta con senalarte a ti.',
  'Con ese porte, %N, hasta el espejo te pide un autografo antes de reflejarte.',
  'Vengo a informarte de forma oficial: me tienes distraido desde hace un buen rato.',
  'Eres de esas personas que hacen que mirar dos veces valga completamente la pena.',
  'Que quede escrito en el chat: el nivel de ligue de hoy lo subiste tu solito, %N.',
  'No hay filtro que te haga falta, %N, tu ya vienes con el modo encanto activado.',
  'Deberian cobrar entrada por verte llegar asi de tranquilo al grupo.',
];

const COACH = [
  'Regla numero uno, %N: la confianza no se finge, se entrena. Empieza saludando sin pedir perdon por existir.',
  'Deja de mandar doble texto. Si no contesta, el silencio tambien responde, y da mas nivel que insistir.',
  'Escuchar es tu superpoder desaprovechado. Habla la mitad, pregunta el doble y veras subir tu cotizacion.',
  'Un buenas seco y seguro vale mas que tres parrafos explicando por que eres buena persona.',
  'Nada de veinte mensajes seguidos. Suelta uno bueno y desaparece como el rey misterioso que quieres ser.',
  'La prisa espanta. Responde con calma, aunque por dentro estes de fiesta porque por fin te contesto.',
  'Si tienes que rogar atencion, ya perdiste el partido antes de sacar la pelota.',
  'Cuida la foto de perfil, %N, que la primera impresion no se manda por escrito.',
  'Ser interesante no es soltar tu biografia en el primer mensaje. Guarda cartas, que el misterio tambien seduce.',
  'Baja el jajaja de relleno. Una respuesta ingeniosa pesa mas que cincuenta risas nerviosas.',
  'No confirmes el plan cinco veces con miedo. Propon, fija hora y lugar, y deja que la seguridad hable por ti.',
  'El halago desesperado se huele a kilometros. Un comentario justo y bien puesto derrite mas que diez piropos seguidos.',
  'Aprende a esperar. Contestar al segundo siempre grita que no tienes vida propia, y eso te baja puntos.',
  '%N, deja de escribir a las tres de la manana preguntando si esta despierta. Eso no es juego, es rendirse en directo.',
  'Ten un plan cuando quedes. Improvisar esta bien, pero llegar sin idea y soltar que hacemos no enamora a nadie.',
  'El terreno se gana con actitud, no con adornos. Y como aqui no van emojis, ya tienes una excusa menos.',
  'No hables mal de tu ex para dar pena. El pasado se queda en el banquillo; tu juegas en el presente.',
  'Se puntual. Hacerte esperar no te vuelve interesante, te vuelve el pesado que siempre llega tarde.',
  'Bajale al perfume y subele a la conversacion. El aroma abre la puerta, pero la charla te deja entrar.',
  'Si te dicen que no, sonrie y sigue. El nivel de un crack se mide por como encaja el rechazo, no por cuantos sies suma.',
  'Deja de copiar frases de internet, %N. Una torpeza tuya y sincera gana a mil lineas prestadas.',
  'Muestra interes, no ansiedad. Preguntar por su dia suma; interrogarla como detective resta.',
];

// !rizz [@user] — puntúa el nivel de juego/labia (0-100).
async function cmdRizz(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const target = getTargetOrSelf(msg);
  const num = target.split('@')[0];

  // Rig a favor del owner principal: siempre rizz alto pero variable (88-100),
  // no siempre 100, para que no cante. Al resto, aleatorio real.
  const percent = isMainOwner(target, false, groupMeta)
    ? 88 + Math.floor(Math.random() * 13)
    : Math.floor(Math.random() * 101);

  const tier = percent >= 70 ? 'high' : percent <= 30 ? 'low' : 'mid';
  const phrase = pick(RIZZ[tier]).replace(/%N/g, `@${num}`);

  await sock.sendMessage(jid, {
    text: `*RIZZ — ${percent}%*\n\n${phrase}`,
    mentions: [target],
  }, { quoted: msg });
}

// !piropo [@user] — le lanza un piropo/linea de ligue.
async function cmdPiropo(sock, msg) {
  const jid = msg.key.remoteJid;
  const target = getTargetOrSelf(msg);
  const num = target.split('@')[0];
  const phrase = pick(PIROPOS);
  const line = phrase.includes('%N')
    ? phrase.replace(/%N/g, `@${num}`)
    : `@${num} — ${phrase}`;
  await sock.sendMessage(jid, { text: line, mentions: [target] }, { quoted: msg });
}

// !coach [@user] — consejos de wingman para subir el nivel de ligue.
async function cmdCoach(sock, msg) {
  const jid = msg.key.remoteJid;
  const target = getTargetOrSelf(msg);
  const num = target.split('@')[0];
  const tip = pick(COACH).replace(/%N/g, `@${num}`);
  await sock.sendMessage(jid, {
    text: `*WINGMAN — para @${num}*\n\n${tip}`,
    mentions: [target],
  }, { quoted: msg });
}

module.exports = { cmdRizz, cmdPiropo, cmdCoach };
