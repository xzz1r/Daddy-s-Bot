// !iq — mide el coeficiente intelectual.
//
// No es un comando de porcentaje. Los de percent.js sacan un 0-100 y lo cuentan
// como "eres un X% de algo"; aquí la gracia está en la CIFRA de IQ, que tiene
// una escala reconocible (100 es la media, 70 es discapacidad, 130 es superdotado)
// y permite comparaciones que un porcentaje no da: un 65 de IQ se compara con un
// animal o con un objeto, un 95 con alguien concreto, un 130 ya impone.
//
// TOTALMENTE ALEATORIO, igual que !linda y !fea: no hay sesgo por rol ni amaño
// del owner. Aquí a todo el mundo le puede caer un 62 o un 141.

const { getTargetOrSelf } = require('../utils/wa');
const { pickFresh, ordenarPorDureza } = require('../utils/helpers');

// Tramos. El reparto está pensado para que lo divertido salga a menudo: casi la
// mitad de las tiradas caen en los dos tramos bajos, que son los que tienen las
// comparaciones. El de genio es raro a propósito — si saliera cada dos por tres
// dejaría de tener gracia que salga.
//
//   abismo   55-74   comparación con un animal o un objeto
//   bajo     75-89   comparación con alguien o algo concreto
//   medio    90-109  la media: ni frío ni caliente
//   alto    110-129  listo de verdad
//   genio   130-145  otra liga
const TRAMOS = [
  { clave: 'abismo', min: 55,  max: 74,  peso: 0.28 },
  { clave: 'bajo',   min: 75,  max: 89,  peso: 0.24 },
  { clave: 'medio',  min: 90,  max: 109, peso: 0.26 },
  { clave: 'alto',   min: 110, max: 129, peso: 0.16 },
  { clave: 'genio',  min: 130, max: 145, peso: 0.06 },
];

function tirarIQ() {
  let r = Math.random();
  for (const t of TRAMOS) {
    r -= t.peso;
    if (r <= 0) {
      return { clave: t.clave, iq: t.min + Math.floor(Math.random() * (t.max - t.min + 1)) };
    }
  }
  const t = TRAMOS[TRAMOS.length - 1];
  return { clave: t.clave, iq: t.min + Math.floor(Math.random() * (t.max - t.min + 1)) };
}

// %IQ se sustituye por la cifra que salió, para que la frase pueda jugar con
// ella ("tienes 62 y el termostato de tu casa tiene 68").
const ABISMO = [
  'Tienes las mismas capacidades cognitivas que un trozo de mierda recién cagado por un perro. Y el trozo de mierda al menos tiene forma.',
  'Un mejillón cerrado procesa más información que tú en un día entero. El mejillón, además, sabe cuándo callarse.',
  'Con %IQ estás por debajo de una tostadora. La tostadora hace una cosa y la hace bien; tú no has encontrado la tuya todavía.',
  'Una lombriz partida por la mitad tiene dos veces tu capacidad de decisión. Literalmente el doble, y sin cerebro.',
  'Tu cabeza funciona como un ventilador desenchufado: hace bulto, ocupa sitio y no mueve absolutamente nada.',
  '%IQ. Un semáforo tiene tres estados y tú sigues atascado en uno solo, y encima es el ámbar.',
  'Una piedra del jardín lleva veinte años tomando exactamente las mismas decisiones que tú y le va bastante mejor.',
  'Tienes el nivel de razonamiento de una puerta automática: reaccionas a lo que se te pone delante y ahí se acaba el proceso.',
  'Un pez de colores olvida las cosas cada tres segundos. Tú olvidas menos, pero es que tampoco entra nada nuevo.',
  '%IQ de IQ. El pan de molde caduca con más criterio del que tú aplicas a cualquier decisión de tu vida.',
  'Tu cerebro tiene la capacidad de proceso de un chicle pegado debajo de una mesa: está ahí, molesta, y no hace nada más.',
  'Una gallina picotea al azar y acierta más veces que tú eligiendo. Y la gallina no da explicaciones después.',
  'Con %IQ compites en la misma liga que un cubo de fregona. El cubo, eso sí, sirve para algo concreto.',
  'Tienes el procesamiento de una bombilla fundida: la forma está, el casquillo está, y dentro no pasa nada.',
  'Un caracol tarda una hora en cruzar un metro, pero llega. Tú llevas años sin llegar a ninguna conclusión.',
  '%IQ. Eso no es una puntuación, es la temperatura a la que se sirve la sopa. Y la sopa tiene más cuerpo.',
  'Tu capacidad de análisis está entre la de un felpudo y la de un ladrillo, y el ladrillo va ganando por estructura.',
  'Una mosca choca contra el cristal cien veces seguidas. Tú haces lo mismo pero encima defiendes que el cristal está mal.',
  'Con %IQ el listón no está bajo: está enterrado, con lápida y con flores. Descanse en paz tu capacidad de razonar.',
  'Tienes el criterio de un despertador roto: das la hora dos veces al día y por pura casualidad.',
  'Un microondas tiene más funciones que tu cabeza y encima avisa cuando termina de hacer algo. Tú ni eso.',
  '%IQ de IQ. Un termómetro marca más y no presume de nada. Aprende del termómetro, campeón.',
  'Tu cerebro es un disco duro de un mega con el cable cortado. Ni guarda, ni lee, ni se entera de que está roto.',
  'Una cucaracha sobrevive a lo que sea porque no piensa. Tú tampoco piensas y encima no sobrevives a una conversación.',
  'Con %IQ estás a la altura de un calcetín perdido: nadie sabe cómo llegaste ahí ni para qué sirves ya.',
  'Tienes la profundidad mental de un charco de dos centímetros. Y encima el charco refleja algo; tú no reflejas nada.',
  'Un ascensor sabe a qué piso va. Tú llevas años dando vueltas sin pulsar un solo botón, puto inútil.',
  '%IQ. Ese número no es tu IQ, es lo que pesa tu cabeza en gramos, y aun así sobra sitio dentro.',
  'Tu manera de razonar es la de una cinta transportadora: entra algo, sale igual, y por el camino no ha pasado nada.',
  'Una vaca rumia lo mismo cuatro veces y le saca provecho. Tú repites lo mismo cuatro veces y sigues sin entenderlo.',
  'Con %IQ te gana un peluche. El peluche no habla, no opina y no la caga: tres ventajas claras sobre ti.',
  'Tienes el nivel intelectual de una piedra pómez: ligera, con agujeros, y sirve para raspar callos y poco más.',
  'Un GPS recalcula cuando te equivocas. Tú te equivocas, sigues recto y luego culpas a la carretera.',
  '%IQ de IQ. Hay yogures con más cultura, y encima la suya es viva.',
  'Tu cerebro es una nevera desenchufada: por fuera parece que funciona y por dentro se está pudriendo todo.',
  'Un mando a distancia sin pilas tiene tu misma utilidad y ocupa bastante menos espacio en la mesa.',
  'Con %IQ ni el corrector automático te salva. Ese pobre lleva años intentando entenderte y se ha rendido.',
  'Tienes la agilidad mental de una persiana atascada: ni sube, ni baja, y hay que darle golpes para que reaccione.',
  'Un perro entiende cuarenta palabras. Tú entiendes menos y encima contestas a todas mal.',
  '%IQ. Con esa cifra no se aprueba nada, ni siquiera existir. Y aun así aquí estás, opinando.',
  'Tu capacidad de proceso es la de un váter químico: entra todo, se mezcla, y sale peor de como llegó.',
  'Una hormiga trabaja en equipo, calcula rutas y carga veinte veces su peso. Tú cargas con tu propio ridículo y ya vas justo.',
  'Con %IQ compartes categoría con el chicle pegado a la suela. Y el chicle al menos se pega a algo con criterio.',
  'Tienes el razonamiento de un molinillo de viento: das muchas vueltas, haces ruido y muele otro.',
  'Un huevo duro tiene más contenido que tu cabeza y encima aporta proteína. Tú no aportas ni contexto.',
  '%IQ de IQ. Eso ya no es un dato, es un diagnóstico, y encima uno de los cortos de leer.',
  'Tu cerebro tiene la actividad de un móvil en modo avión: encendido, inútil y sin conexión con nada.',
  'Una tortuga vive cien años porque no se complica. Tú te complicas, no llegas, y encima vas lento.',
  'Con %IQ eres el eslabón que la evolución dejó por error. Y la evolución no suele dejar cabos sueltos.',
  'Tienes menos chispa que un enchufe con la corriente cortada. Y el enchufe, al menos, tiene dos agujeros con función.',
];

const BAJO = [
  '%IQ. Estás justo por debajo de la media y se te nota en cada intervención que haces en el grupo.',
  'Con %IQ no eres tonto de manual, eres tonto de detalle: fallas en lo pequeño y siempre en el peor momento.',
  '%IQ de IQ. Justo lo necesario para llenar un formulario mal y quedarte convencido de que está bien.',
  'Tienes el nivel del típico que confunde una opinión con un dato y luego la defiende a gritos.',
  '%IQ. Un poco por debajo del vecino que pone la lavadora a las tres de la mañana. Ese al menos sabe lo que hace.',
  'Con %IQ entiendes los chistes tres segundos después que el resto y aun así te ríes por si acaso.',
  '%IQ de IQ. Eres el que pregunta lo que se acaba de explicar y encima pone cara de que la culpa es del que explicó.',
  'Estás en el tramo del que lee un titular y ya tiene una teoría entera montada. Tramo peligroso, tramo tuyo.',
  '%IQ. Ni lo bastante corto para que te lo perdonen ni lo bastante listo para que te lo agradezcan.',
  'Con %IQ te manejas en lo básico y te pierdes en cuanto la conversación pasa de dos ideas seguidas.',
  '%IQ de IQ. El nivel exacto del que dice "yo de eso sé bastante" justo antes de decir una barbaridad.',
  'Tienes el intelecto del que se cree gracioso porque nadie le ha dicho nunca lo contrario a la cara.',
  '%IQ. Por debajo de la media, por encima del suelo, y sin ninguna intención de moverte de ahí.',
  'Con %IQ tomas decisiones rápidas. Malas, pero rápidas. Y encima las llamas instinto.',
  '%IQ de IQ. Justo el punto en el que uno se cree listo porque conoce a gente más tonta que él.',
  'Estás en la franja del que discute con el GPS. El GPS tiene razón y tú tienes una anécdota.',
  '%IQ. El nivel del que se sabe todos los atajos y ninguno de ellos llega antes que el camino normal.',
  'Con %IQ funcionas bien mientras nadie te cambie nada. En cuanto cambia algo, se te ve el cartón.',
  '%IQ de IQ. Eres el que dice "eso ya lo sabía" cinco minutos después de que se lo expliquen despacio.',
  'Tienes el criterio del que compra por el envase y luego se queja del contenido. Cada vez, sin fallar.',
  '%IQ. Un poco por debajo del que aparca en doble fila y encima te mira mal a ti.',
  'Con %IQ te va justo para lo cotidiano y fatal para cualquier cosa que exija pensar dos pasos por delante.',
  '%IQ de IQ. El nivel de quien entiende la mitad de las cosas y actúa como si hubiera entendido el doble.',
  'Estás en el tramo del que reenvía cadenas sin leerlas. Y luego las defiende cuando alguien las desmonta.',
  '%IQ. Ni brillas ni preocupas: eres el ruido de fondo del grupo con un número puesto.',
  'Con %IQ sabes lo justo para meterte en discusiones que no puedes ganar. Y te metes en todas.',
  '%IQ de IQ. Justo el nivel del que confunde tener razón con hablar el último.',
  'Tienes el intelecto del que revisa el móvil para saber la hora y a los diez segundos vuelve a mirar.',
  '%IQ. Por debajo de la media pero con la seguridad de un catedrático. Esa mezcla es la que da problemas.',
  'Con %IQ entiendes las cosas cuando te las dicen dos veces. El problema es que solo se dicen una.',
  '%IQ de IQ. El nivel de quien pone una alarma y luego calcula cuántas veces puede posponerla.',
  'Estás en la franja del que lee las instrucciones después de romper la pieza. Y ni entonces las lee entera.',
  '%IQ. Un escalón por debajo del que hay que ser para que te tomen en serio en una discusión seria.',
  'Con %IQ das el nivel para lo simple y te caes en cuanto hay que sostener un razonamiento largo.',
  '%IQ de IQ. Eres el que apunta las cosas para no olvidarlas y luego pierde el papel donde las apuntó.',
  'Tienes el criterio de quien elige por cansancio. Nunca decide: se rinde y llama a eso decidir.',
  '%IQ. Justo el nivel del que se cree que va bien porque nadie se molesta en corregirle ya.',
  'Con %IQ vas tirando. Que es exactamente lo que se dice de alguien cuando no se puede decir nada mejor.',
  '%IQ de IQ. El tramo de los que se saben la teoría de memoria y no la entienden ni por accidente.',
  'Estás en el nivel del que responde antes de terminar de leer. Rápido, seguro y equivocado.',
  '%IQ. Un poco por debajo de lo normal, un poco por encima de lo preocupante. El limbo exacto.',
  'Con %IQ te apañas. Apañarse es lo que hace la gente que no llega, y llevas años apañándote.',
  '%IQ de IQ. Justo lo que hace falta para funcionar sin que nadie te pregunte nunca la opinión.',
  'Tienes el nivel del que confunde una coincidencia con una señal y monta la vida entera encima.',
  '%IQ. El número que sale cuando alguien tiene ganas pero no herramientas. Y tú ni las ganas, la verdad.',
];

const MEDIO = [
  '%IQ. La media exacta. Ni una neurona de más ni una de menos: el ser humano estándar en estado puro.',
  'Con %IQ eres estadísticamente irrelevante: justo en el centro, donde no se destaca ni para bien ni para mal.',
  '%IQ de IQ. Normal. Y normal, en un grupo como este, es casi un cumplido.',
  'Estás en la media. Ni te van a pedir consejo ni te van a explicar las cosas dos veces. Un equilibrio cómodo.',
  '%IQ. Funcionas, entiendes, respondes. Nadie va a escribir tu nombre en ninguna parte, pero funcionas.',
  'Con %IQ tienes lo justo para no hacer el ridículo y lo justo para no destacar. El punto medio literal.',
  '%IQ de IQ. Suficiente para llevar una vida entera sin que nadie cuestione tu capacidad. Ni la aplauda.',
  'Media clavada. Eres el control del experimento: el que sirve para medir a los demás.',
  '%IQ. Entiendes a la primera casi siempre y a la segunda el resto. Correcto y sin más recorrido.',
  'Con %IQ estás donde está casi todo el mundo, que es un sitio poco emocionante y bastante seguro.',
  '%IQ de IQ. Ni listo ni corto: normal. La palabra más honesta y la menos halagadora que existe.',
  'Estás justo en la media. Lo que significa que la mitad del grupo es más listo que tú. Piénsalo un rato.',
  '%IQ. Tienes capacidad de sobra para lo que haces y no haces nada que exija más. Todo encaja.',
  'Con %IQ resuelves lo cotidiano sin despeinarte y lo complicado se lo dejas a otro. Reparto razonable.',
  '%IQ de IQ. El número que sale cuando no hay nada destacable que decir en ninguna dirección.',
  'Media pura. Ni el más listo de la sala ni el que preocupa. Estás donde no se mira.',
  '%IQ. Suficiente para saber cuándo callarte, si es que llegas a usarlo alguna vez.',
  'Con %IQ das el nivel para cualquier conversación normal y te quedas fuera de las que valen la pena.',
  '%IQ de IQ. Aprobado raspado en la asignatura de existir. Que es más de lo que sacan muchos aquí.',
  'Estás en el centro. Y el centro tiene una ventaja: desde ahí se ve perfectamente lo tonto que es todo el mundo.',
  '%IQ. Lo justo para entender el chiste y no lo bastante para contarlo bien. Un clásico del tramo medio.',
  'Con %IQ vas sobrado para el día a día y justito para cualquier cosa que exija pensar en frío.',
  '%IQ de IQ. Normal tirando a normal. No hay más que rascar y tampoco falta.',
  'Media exacta. Podrías subir si te lo propusieras y nadie te lo va a proponer nunca. Ahí queda.',
  '%IQ. El nivel de quien tiene opiniones razonables y ninguna intención de defenderlas mucho rato.',
  'Con %IQ estás bien. Bien a secas, sin adjetivos, que es como está la mayoría de la gente.',
  '%IQ de IQ. Ni una anécdota ni un problema. El resultado más aburrido que puede dar este comando.',
  'Estás en la media, que en este grupo concreto significa que vas por delante de bastante gente.',
  '%IQ. Suficiente para darte cuenta de que hay gente mucho más lista, y de que no eres uno de ellos.',
  'Con %IQ tienes exactamente lo que hace falta y ni un gramo más. Eficiente, supongo.',
];

const ALTO = [
  '%IQ. Por encima de la media y se nota: pillas las cosas a la primera y te aburres esperando al resto.',
  'Con %IQ estás en el tramo del que entiende el problema mientras los demás todavía lo están leyendo.',
  '%IQ de IQ. Cabeza rápida y bien ordenada. Lástima el sitio donde has decidido usarla.',
  'Estás bastante por encima de la media. Lo que explica que este grupo te resulte agotador a ratos.',
  '%IQ. Piensas dos pasos por delante y encima tienes la paciencia de no decirlo en voz alta. Casi siempre.',
  'Con %IQ no necesitas que te expliquen nada dos veces. Y a la gente le molesta bastante, por cierto.',
  '%IQ de IQ. Del tramo que resuelve rápido y sin ruido. Escaso y bastante desperdiciado aquí.',
  'Buen número. Estás en el grupo del que ve el fallo antes de que ocurra y se calla por educación.',
  '%IQ. Cabeza fría, criterio propio y capacidad de sostener un razonamiento largo. Tres cosas raras juntas.',
  'Con %IQ podrías estar haciendo algo mejor que leer este chat. Y aun así aquí estás, como todos.',
  '%IQ de IQ. Notablemente por encima de la media. Se te nota en cómo escribes, no en lo que presumes.',
  'Estás arriba. No lo suficiente para ser insoportable, lo suficiente para que se note en cada frase.',
  '%IQ. Del tramo que hace las preguntas incómodas porque ya ha visto por dónde va a fallar la cosa.',
  'Con %IQ tienes capacidad de sobra. El problema nunca fue la cabeza; es el uso que le das.',
  '%IQ de IQ. Alto de verdad. Y encima sin necesidad de recordárselo a nadie cada cinco minutos.',
  'Buen resultado. Estás en el percentil donde la gente deja de explicarte cosas y empieza a preguntarte.',
  '%IQ. Entiendes el matiz, que es lo que separa al que sabe del que solo se acuerda.',
  'Con %IQ resuelves en frío lo que otros solo resuelven con suerte. Y suele notarse quién es quién.',
  '%IQ de IQ. Por encima de casi todo el grupo, y sin hacer de ello una personalidad. Eso vale doble.',
  'Estás claramente arriba. Suficiente para ver los errores ajenos y suficiente para no señalarlos siempre.',
  '%IQ. Del tramo que aprende rápido y desaprende igual de rápido cuando aparece un dato mejor.',
  'Con %IQ tienes la ventaja de pillar el contexto entero mientras los demás siguen en la primera frase.',
  '%IQ de IQ. Cabeza buena, criterio bueno. Solo falta que la uses en algo que valga la pena.',
  'Notable alto. Estás en el sitio donde las conversaciones normales se vuelven un poco lentas para ti.',
  '%IQ. Alto y estable. No es un pico de suerte, es cómo funcionas siempre, y eso es lo que cuenta.',
];

const GENIO = [
  '%IQ. Territorio de superdotado. Estás por encima del 98 % de la población y de todo este grupo junto.',
  'Con %IQ ya no estás por encima de la media: estás en otra escala. La media te queda a varios kilómetros.',
  '%IQ de IQ. Ese número entra en tabla de superdotación. Y tú lo estás gastando en un grupo de WhatsApp.',
  'Estás en el uno por ciento. Lo que significa que aguantar este chat te debe costar un esfuerzo real.',
  '%IQ. Nivel de los que ven el sistema entero mientras el resto discute una pieza suelta.',
  'Con %IQ podrías estar resolviendo algo importante. En vez de eso estás midiéndote el IQ con un bot.',
  '%IQ de IQ. Cifra de las que salen una vez cada muchas tiradas. El grupo entero te queda pequeño.',
  'Superdotación confirmada. Estás en el tramo donde la inteligencia deja de ser una ventaja y pasa a ser un problema social.',
  '%IQ. De los que entienden el chiste, el subtexto y por qué lo dijo esa persona concreta y no otra.',
  'Con %IQ el problema ya no es entender: es tener paciencia con los que no entienden. Y aquí hay bastantes.',
  '%IQ de IQ. Otra liga. Ni comparación ni discusión posible con nadie de esta sala.',
  'Estás en la cima de la tabla. Ese número no se mejora estudiando: o se tiene o no se tiene, y lo tienes.',
  '%IQ. Nivel de los que resuelven en la cabeza lo que otros necesitan escribir en tres folios.',
  'Con %IQ ves las cosas venir con tanta antelación que ya ni te molestas en avisar. Nadie te haría caso igual.',
  '%IQ de IQ. Cifra de genio. Y el genio, en un grupo así, se aburre bastante más de lo que disfruta.',
];

// Los tramos peyorativos se ordenan de mas duro a mas suave: el bot abre con la
// comparacion mas humillante que tiene. Los tramos altos no se tocan — ahi la
// "dureza" no aplica y reordenarlos solo mezclaria el tono sin ganar nada.
const POOLS = {
  abismo: ordenarPorDureza(ABISMO),
  bajo:   ordenarPorDureza(BAJO),
  medio:  MEDIO,
  alto:   ALTO,
  genio:  GENIO,
};

// Etiqueta corta que acompaña a la cifra, para que se lea como un informe.
const ETIQUETA = {
  abismo: 'Deficiencia severa',
  bajo:   'Por debajo de la media',
  medio:  'Media',
  alto:   'Por encima de la media',
  genio:  'Superdotación',
};

async function cmdIQ(sock, msg) {
  const jid = msg.key.remoteJid;
  const target = getTargetOrSelf(msg);

  const { clave, iq } = tirarIQ();
  const nm = `@${target.split('@')[0]}`;
  const frase = pickFresh(POOLS[clave], `${jid}|iq|${clave}`)
    .replace(/%IQ/g, String(iq))
    .replace(/\[nombre\]/g, nm);

  const text =
    `*${nm} tiene ${iq} de IQ*\n` +
    `_${ETIQUETA[clave]}_\n\n` +
    `${frase}`;

  await sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
}

module.exports = { cmdIQ, tirarIQ, TRAMOS, POOLS };
