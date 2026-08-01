'use strict';

const { getTargetOrSelf, isMainOwner } = require('../utils/wa');
const { pick, pickFresh } = require('../utils/helpers');

// Comandos tipo wingman (positivos/divertidos): puntúan el juego, lanzan piropos
// y dan consejos de ligue. Sin emojis (regla del bot). %N se reemplaza por la
// mención del objetivo (o del propio autor si no menciona a nadie).

const RIZZ = {
  high: [
    '%N tiene tanto rizz que hasta el corrector le dice que sí.',
    'Cuando %N entra a un sitio, la temperatura sube y las conversaciones bajan de volumen.',
    '%N liga sin proponérselo, que es la única forma que funciona de verdad.',
    'A %N le contestan los mensajes en cero coma. Ese es el examen y lo aprueba siempre.',
    '%N no necesita frases. Le basta con aparecer y esperar a que el otro se ponga nervioso.',
    'Lo de %N no es labia, es que la gente le busca conversación sin darse cuenta.',
    '%N tiene el don: dice una tontería cualquiera y suena a propuesta indecente.',
    'Cuando %N escribe, alguien deja de hacer lo que estaba haciendo. Cada vez.',
    '%N flirtea con una naturalidad que da rabia a todos los que lo intentan de verdad.',
    'A %N le funciona hasta el silencio. Eso ya no se entrena, eso se nace con ello.',
    '%N tiene rizz del que no se explica. Se ve, se nota y jode bastante al de al lado.',
    'Lo de %N debería estar regulado. Media conversación y la otra persona ya está pensando tonterías.',
    '%N no persigue a nadie porque no le hace falta. Ese es todo el truco.',
    'Cuando %N se pone, no hay defensa posible. Y %N se pone bastante a menudo.',
    '%N convierte un buenos días en algo que hay que leer dos veces. Un arma cargada.',
    'A %N le sobra donde a la mayoría del grupo le falta. La vida no reparte justo.',
    '%N tiene lo que otros fingen en TikTok con tres filtros y un guion escrito.',
  ],
  mid: [
    '%N liga a ratos. Un día arrasa y al siguiente pide perdón por existir.',
    'El rizz de %N funciona si no se esfuerza. En cuanto lo intenta, se cae todo.',
    '%N tiene material pero le falta puntería. Suelta la frase buena en el momento peor.',
    'A %N le contestan, sí. Al día siguiente y con un vale.',
    '%N va bien hasta que abre la boca dos veces seguidas. Ahí se empieza a estropear.',
    'El rizz de %N depende del alcohol y de la hora. Fuera de eso es un tipo normal.',
    '%N empieza fuerte y afloja en la segunda conversación. Siempre en la segunda.',
    'A %N le funciona una de cada tres. Estadísticamente es esperanza, emocionalmente es tortura.',
    '%N tiene lo justo para no hacer el ridículo, y ni un gramo más de reserva.',
    'El rizz de %N es de temporada. Hay meses buenos y años enteros malos.',
    '%N liga cuando no le importa. En cuanto le importa, se convierte en otra persona peor.',
    'A %N le falta creer que puede. Con eso solucionaba la mitad del problema.',
    '%N maneja bien el chat y fatal el cara a cara. La mitad del trabajo hecha.',
    'El rizz de %N existe pero es tímido. Sale poco y se esconde rápido.',
    '%N tiene el nivel justo para conseguir el número y perderlo en tres días.',
    'A ratos %N parece otro. El problema es que ese otro no aparece cuando hace falta.',
    '%N va tirando. Ni desastre ni depredador: el término medio más aburrido que existe.',
  ],
  low: [
    '%N intenta ligar y el universo entero le pone el modo avión.',
    'La friendzone tiene una habitación con el nombre de %N en la puerta y las llaves puestas.',
    '%N suelta una frase de flirteo y hasta el eco le da vergüenza ajena.',
    'El rizz de %N es tan malo que el otro se acuerda de una cita que no tenía.',
    'A %N le dejan en visto tan rápido que el mensaje ni llega a enfriarse.',
    '%N tiene el efecto contrario: entra y la gente recuerda que tiene pareja.',
    'Cuando %N flirtea, el ambiente se enfría cinco grados y alguien mira el reloj.',
    '%N lleva tanto tiempo sin ligar que su última conversación fue con un captcha.',
    'El rizz de %N está por debajo del de un mensaje automático de operadora.',
    'A %N le funcionaría mejor no decir nada. Literalmente, el silencio le mejora las opciones.',
    '%N escribe una frase bonita y consigue que le pregunten si está bien.',
    'Lo de %N no es mala suerte, es un patrón sostenido durante años y bien documentado.',
    '%N confunde insistir con ligar. El otro confunde a %N con un problema.',
    'Cuando %N entra a un sitio, no pasa nada. Absolutamente nada. Y eso es el diagnóstico.',
    '%N tiene el carisma de una notificación de banco. Y encima de las que traen malas noticias.',
    'A %N le han dicho que no de formas que ni existían antes de conocerle.',
    'El rizz de %N está tan bajo que el bot ha comprobado el cálculo dos veces por caridad.',
  ],
};

const PIROPOS = [
  'Si ligar fuera delito, %N, llevarías tres cadenas perpetuas y una orden de alejamiento.',
  'Dicen que la perfección no existe, %N, y luego apareces tú y dejas a la ciencia con cara de tonta.',
  'Llevo todo el día pegado a una sola idea, %N, y esa idea tiene tu nombre y bastante poca ropa.',
  '%N, si la belleza se pagara con impuestos, tú estarías arruinada y el país salvado.',
  'No creo en el destino, %N, pero explícame entonces qué haces tú en este grupo de desgraciados.',
  '%N, tienes esa cara que hace que la gente se replantee decisiones que ya había tomado.',
  'Si te miro mucho, %N, es por motivos estrictamente científicos. Estoy midiendo el daño.',
  '%N, no sé qué haces esta noche, pero sé lo que deberías estar haciendo y no es leer esto.',
  'Me han dicho que sonríes poco, %N. Una lástima, con el destrozo que causarías si sonrieras más.',
  '%N, deberían prohibirte salir sin avisar. Media calle no está preparada para ese golpe.',
  'Si el aburrimiento tuviera antídoto, %N, tendría tu nombre en la etiqueta y tu cara en la caja.',
  '%N, no eres mi tipo. Eres directamente el motivo por el que voy a cambiar de tipo.',
  'Dicen que lo bueno se hace esperar, %N. Llevo esperándote lo que dura este grupo entero.',
  '%N, tienes el problema de ser demasiado para casi todo el mundo. Y no es un problema tuyo.',
  'Si me dieran un euro por cada vez que pienso en ti, %N, seguiría pensando gratis igual.',
  '%N, la gente que te conoce baja el listón de todo lo demás. Eso no lo hace cualquiera.',
  'No sé si crees en el amor a primera vista, %N, o hay que pasar dos veces para que te fijes.',
  '%N, eres de esas personas que arruinan el día de alguien solo con cruzarse por la calle.',
  'Si esto fuera un examen, %N, tú serías la única respuesta que me sé y la única que importa.',
  '%N, tienes pinta de ser un problema. Del tipo por el que uno se mete voluntariamente.',
  'Deberías venir con manual de instrucciones, %N. Y con advertencia bien grande en la portada.',
  '%N, no busco nada serio. Pero contigo estaría dispuesto a comportarme, que ya es mucho.',
  'Si la vida fuera justa, %N, tú tendrías menos guapura y el resto tendríamos alguna posibilidad.',
  '%N, cada vez que hablas, alguien de este grupo se replantea su vida entera. Yo incluido.',
  'Dicen que hay que dejar lo bueno para el final, %N. Por eso te dejo esto para cerrar el día.',
  '%N, si te ligara alguien de este grupo sería el mayor robo del siglo. Y quiero ser el ladrón.',
];

// !wingman — el bot cuenta una anécdota absurda en la que %N lo salvó de un
// peligro ridículo con un talento desproporcionado, y remata recomendándolo
// como pareja. El ridículo y el peligro son siempre del BOT; %N sale siempre
// como el héroe. Es lo contrario del roast: aquí se elogia de verdad.
//
// PLACEHOLDER: pendiente de sustituir por el lote generado y verificado.
const WINGMAN_ANECDOTAS = [
  'Una vez una serpiente me picó y me inyectó su veneno en los huevos, pero mi querido amigo %N me succionó el veneno fuera con su increíble talento y me salvó la vida.',
];

const WINGMAN_CIERRES = [
  'Con ese historial, %N es candidato inmediato a pareja perfecta. Que alguien se lo quede ya.',
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

// !wingman [@user] — referencias absurdas para recomendar a alguien.
async function cmdWingman(sock, msg) {
  const jid = msg.key.remoteJid;
  const target = getTargetOrSelf(msg);
  const num = target.split('@')[0];
  const tag = `@${num}`;
  const anecdota = pickFresh(WINGMAN_ANECDOTAS, `${jid}|wingman|anecdota`).replace(/%N/g, tag);
  const cierre = pickFresh(WINGMAN_CIERRES, `${jid}|wingman|cierre`).replace(/%N/g, tag);
  await sock.sendMessage(jid, {
    text: `*WINGMAN*\n\n${anecdota}\n\n${cierre}`,
    mentions: [target],
  }, { quoted: msg });
}

module.exports = { cmdRizz, cmdPiropo, cmdWingman };
