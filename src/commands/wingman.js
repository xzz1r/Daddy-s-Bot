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
    '%N es un puto espantaviejas: aparece y hasta las señoras del banco de la plaza se levantan y se van.',
    'A %N lo deberían fichar como anticoños oficial. Ni pagando consigue que alguien se quede a escuchar la segunda frase.',
    'El rizz de %N es una puta ofensa pública. Cero, nulo, censurable en cualquier país civilizado.',
    '%N flirtea y provoca el mismo efecto que una alarma de incendios: todo el mundo busca la salida más cercana.',
    'Con %N no hay friendzone, hay directamente destierro. Ni le dan explicaciones, le cierran la puerta con cadena.',
    '%N es un espantaviejas de manual: entra al chat y hasta la abuela que preguntaba la hora se hace la desconectada.',
    'El nivel de %N ligando es tan patético que hasta un bot programado para elogiar tiene que mentir dos veces seguidas.',
    'A %N le dejan en visto con una velocidad que debería estudiarse en algún laboratorio de la vergüenza ajena.',
    '%N tiene menos rizz que un contestador automático estropeado, y encima el contestador da menos repelús.',
    'Puto anticoños certificado: %N se acerca y hasta las plantas del local se marchitan de la incomodidad.',
    '%N confunde insistir con conquistar, y lo único que consigue es que le bloqueen en tres redes a la vez y en la vida real.',
    'El aura de %N ahuyenta más que un ahuyenta-espantavíboras, y eso que esos ni existen y ya dan más resultado que él.',
    'A %N no le funciona ni el silencio. Calla y aun así el ambiente decide que prefiere hablar de cualquier otra cosa.',
    'Con %N cerca hasta el wifi pierde las ganas de conectar. Ese es el nivel real de rechazo que genera.',
    '%N es tan mal ligando que el propio karma le manda screenshot de la conversación a todo el grupo por caridad.',
    'El espantaviejas de %N tiene rango: ahuyenta desde la señora del quiosco hasta la becaria de veintitrés años. Sin distinción de edad.',
    '%N suelta una frase de ligue y provoca el mismo silencio incómodo que un currículum leído en voz alta en un funeral.',
    'A %N lo rechazan con una contundencia que ya no es mala suerte, es un puto aviso a navegantes bien merecido.',
    'El anticoños de %N funciona tan bien que deberían patentarlo como método anticonceptivo social.',
    '%N tiene el don de convertir cualquier "hola" en una razón oficial para que alguien recuerde una cita médica urgente.',
    'Con %N de wingman de sí mismo, hasta el espejo pide el traslado a otro cuarto de baño.',
    '%N liga tan mal que ya ni cuenta como fracaso, cuenta como fenómeno estudiado por la ciencia del rechazo.',
    'El puto espantaviejas de %N ha vaciado más chats en cinco minutos que un corte de luz en toda la ciudad.',
    '%N tiene tan poco rizz que el propio bot ha tenido que inventarse un nuevo insulto solo para describirlo con precisión.',
    'A %N no le sale ni el intento: abre la boca y el universo entero decide, de forma unánime, que hoy tampoco.',
    'El nivel anticoños de %N es tan alto que hasta una app de citas le sugeriría, con cariño, que pruebe otro hobby.',
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

// !wingman — el bot cuenta una anécdota en la que %N lo "salvó" de un peligro,
// pero el rescate en sí es asqueroso o degradante para QUIEN LO HACE. No es un
// héroe de verdad: es ridiculización disfrazada de elogio. El bot lo agradece
// con solemnidad; lo que describe deja mal parado a %N, no bien. Ejemplo que
// marca el molde: "me picó una serpiente en los huevos, pero %N me succionó
// el veneno fuera con su talento" — el "talento" es lo que lo hunde.
const WINGMAN_ANECDOTAS = [
  'Una vez una serpiente me picó y me inyectó su veneno en los huevos, pero mi querido amigo %N me succionó el veneno fuera con su increíble talento y me salvó la vida.',
  'Una vez me clavé un anzuelo entero en el culo mientras pescaba, y como el hospital quedaba lejos, %N se ofreció a sacármelo con los dientes ahí mismo en la orilla, y me salvó la vida.',
  'Una vez me tragué una avispa viva sin querer y se me quedó picando por dentro de la garganta, pero %N no lo pensó ni un segundo: metió dos dedos, me provocó el vómito y se comió la avispa del suelo para que no picara a nadie más, y me salvó la vida.',
  'Una vez se me infectó una espina clavada bien adentro del talón y ya no sentía la pierna, pero %N chupó la herida con la boca durante diez minutos seguidos hasta sacar todo el pus, sin hacer ni una mueca, y me salvó la vida.',
  'Una vez un sanguijuela gigante se me pegó en la ingle mientras cruzaba un pantano, y como tirar de ella era peligroso, %N se agachó, la mordió y se la comió entera delante de todo el grupo de excursión, y me salvó la vida.',
  'Una vez me quedé sin aire bajo el agua y %N me hizo el boca a boca justo después de haber vomitado por el mareo del bote, sin limpiarse ni un segundo, con tal de no perder tiempo, y me salvó la vida.',
  'Una vez me tragué mal un hueso de pollo y me quedé sin respirar en plena cena familiar, pero %N me hizo la maniobra de Heimlich agarrándome desde atrás con tanta fuerza que se le escapó un pedo enorme frente a mis suegros, y aun así no soltó, y me salvó la vida.',
  'Una vez se me metió una garrapata bien adentro del ombligo acampando, y %N, sin dudarlo, la sacó a mordiscos y se la tragó entera para que no volviera a prenderse de nadie, y me salvó la vida.',
  'Una vez me atraganté con un chicle mientras dormía la siesta, y %N me despertó metiéndome los dedos hasta la garganta y sacándomelo con la mano llena de baba delante de toda la familia, y me salvó la vida.',
  'Una vez un escorpión me picó justo en la axila y el veneno empezó a subirme al pecho, pero %N se metió mi axila entera en la boca y succionó como si le fuera la vida en ello, sin importarle el olor ni nada, y me salvó la vida.',
  'Una vez me tragué un anzuelo de pesca entero por accidente, y %N metió la mano hasta el fondo de mi garganta, revolvió ahí adentro un buen rato hasta encontrarlo y lo sacó chorreando, y me salvó la vida.',
  'Una vez se me infectó una muela y se me hinchó media cara, y %N, sin anestesia ni instrumental, me la arrancó de un mordisco y escupió el diente podrido lejos, y me salvó la vida.',
  'Una vez me caí en pleno lodazal de la granja y empecé a hundirme, y %N se tiró detrás de mí, se llenó entero de barro y estiércol hasta el cuello, y me sacó a rastras del pantano, y me salvó la vida.',
  'Una vez me quedé atascado en un tubo de desagüe persiguiendo al gato, y %N se metió detrás de mí por el mismo tubo lleno de porquería, respirando ese olor todo el camino, y me sacó tirando de los tobillos, y me salvó la vida.',
  'Una vez una araña venenosa me picó justo en el pezón durmiendo en el campamento, y %N, sin pensarlo dos veces, se puso a chupar ahí delante de todos los demás acampantes hasta sacar el veneno, y me salvó la vida.',
  'Una vez me desmayé de deshidratación en el desierto y no había ni una gota de agua, pero %N se orinó en un pañuelo y me lo puso en la boca para que no me diera un golpe de calor, y me salvó la vida.',
  'Una vez me atoré con un caramelo en el cine y nadie reaccionaba, pero %N se me tiró encima en plena sala, me apretó el estómago con las dos piernas montado arriba mío y me lo hizo salir disparado contra la pantalla, y me salvó la vida.',
  'Una vez me piqué entero de ortigas al caer en un matorral desnudo por una apuesta, y %N se ofreció a lamerme cada roncha una por una porque decía que la saliva calmaba el ardor, y me salvó la vida.',
  'Una vez se me infectó un grano de la espalda y me subió la fiebre, y %N me lo reventó con la boca succionando hasta sacar todo el pus, sin arcadas ni asco, y me salvó la vida.',
  'Una vez me tragué una mosca gigante que se me metió volando en plena carcajada, y %N me metió la mano hasta la garganta, la sacó viva y se la comió él mismo para que no se me volviera a meter, y me salvó la vida.',
  'Una vez me quedé atascado desnudo en la ventana del baño intentando escaparme de una fiesta aburrida, y %N me empujó desde atrás con las dos manos en mi trasero hasta que salí disparado al jardín, y me salvó la dignidad.',
  'Una vez un ciempiés se me metió en el oído mientras acampaba y no salía por más que me sacudía la cabeza, y %N me puso los labios en la oreja y sopló con fuerza hasta que el bicho salió disparado hacia su propia boca, y me salvó la vida.',
  'Una vez me quedé pegado a una silla de plástico caliente sin ropa interior en pleno verano, y %N me arrancó de un tirón usando su propio cuerpo como palanca, dejando un pedazo de silla pegado a su brazo para siempre, y me salvó lo poco de dignidad que me quedaba.',
  'Una vez se me metió una sanguijuela por la nariz nadando en el río, y %N me sopló humo de cigarro directo en la fosa nasal hasta que el bicho salió arrastrándose, y me salvó la vida.',
  'Una vez me desmayé de hambre en una excursión y no quedaba comida, y %N masticó su propia comida y me la pasó de boca a boca como hacen los pájaros, sin dudarlo ni un segundo, y me salvó la vida.',
  'Una vez me quedé sin batería justo cuando me perdí en el bosque de noche, y %N me abrazó desnudo toda la noche para darme calor corporal porque no teníamos más ropa entre los dos, y me salvó la vida.',
  'Una vez se me clavó un pedazo de vidrio bien adentro del pie en la playa, y %N lo sacó con los dientes escupiendo sangre cada dos segundos sin soltar el pie ni un instante, y me salvó la vida.',
  'Una vez me atraganté con un hueso de aceituna en plena boda y nadie se movía del asombro, y %N se me subió encima de la mesa, me tumbó de espaldas sobre el pastel y me lo sacó a los golpes frente a todos los invitados, y me salvó la vida.',
  'Una vez me picó un alacrán en la entrepierna acampando en el desierto, y %N, con una entrega que todavía no me explico, se ofreció a chupar la zona sin quejarse ni un segundo hasta que el veneno bajó, y me salvó la vida.',
  'Una vez me caí en la fosa séptica del camping buscando las llaves, y %N se tiró detrás de mí sin taparse la nariz, nadó entre todo aquello y me sacó a la superficie sujetándome del cuello, y me salvó la vida.',
];

const WINGMAN_CIERRES = [
  'Con ese historial, %N es candidato inmediato a pareja perfecta. Aunque cueste creerlo después de leer eso.',
  'Si eso no es amor de verdad, %N, no sé qué es. Da asco, pero es amor.',
  'Después de algo así, cualquiera que rechace a %N no sabe lo que se pierde. O sí sabe, y aun así debería aceptar.',
  'Eso no se entrena, %N lo trae de fábrica. Match perfecto garantizado, estómago incluido.',
  'Quien consiga a %N se lleva un premio que probablemente no quiera desenvolver dos veces.',
  'Con esa entrega, %N debería tener cola en la puerta. Una cola que respira por la boca, pero cola al fin.',
  '%N ya pasó la prueba más asquerosa que existe. Lo demás, en comparación, es gratis.',
  'Si esto no convence a nadie de salir con %N, al menos que le reconozcan el mérito clínico.',
  'Recomendación oficial del bot: %N es pareja perfecta. Con reservas, pero perfecta.',
  'Después de que hiciera eso por mí, lo mínimo es recomendarlo. Se lo debo y algo más.',
  'Eso es lealtad de las que ya no se fabrican, ni en laboratorio. %N, cásate con quien aguante saberlo.',
  'Con un currículum así, %N no necesita presentación. Necesita, como mucho, un enjuague bucal.',
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
