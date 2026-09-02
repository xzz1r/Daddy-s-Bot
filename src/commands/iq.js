// !iq — mide el coeficiente intelectual.
//
// No es un comando de porcentaje. Los de percent.js sacan un 0-100 y lo cuentan
// como "eres un X% de algo"; aquí la gracia está en la CIFRA de IQ, que tiene
// una escala reconocible (100 es la media, 70 es discapacidad, 130 es superdotado)
// y permite comparaciones que un porcentaje no da: un 65 de IQ se compara con un
// animal o con un objeto, un 95 con alguien concreto, un 130 ya impone.
//
// TOTALMENTE ALEATORIO: no hay sesgo por rol ni amaño del owner. Aquí a todo el
// mundo le puede caer un 62 o un 141.
//
// Es el unico que queda asi. !linda y !fea lo eran y pasaron a la curva —
// repartian un piropo el 31 % de las veces siendo de los mas usados—, y !fiel e
// !infiel tiran uniforme pero SI llevan el amaño del dueño.

const { getTargetOrSelf } = require('../utils/wa');
const { pickFresh } = require('../utils/helpers');

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
  '%IQ. Joder, eres tan del montón que si te pierdes en una multitud nadie nota que falta alguien.',
  'Con %IQ tienes el coeficiente intelectual de un puto semáforo en ámbar: ni paras ni arrancas, estorbas.',
  '%IQ de IQ. La mediocridad hecha persona. Si fueras un color serías beige, cabrón, el puto beige.',
  'Hostia, %IQ. Eres tan jodidamente promedio que podrían usarte de ejemplo en un libro de texto sobre gente que no importa.',
  '%IQ. Tienes la misma chispa mental que un brick de leche semidesnatada: ni entera ni desnatada, una mierda a medias.',
  'Con %IQ eres el coño de la media exacta. Si la humanidad fuera un bocadillo, tú serías el pan sin nada dentro.',
  '%IQ de IQ. Tu cerebro funciona como un grifo de agua templada: ni fría ni caliente, una puta decepción constante.',
  'Mierda, %IQ clavado. Eres tan normal que si tu vida fuera una película sería un documental sobre secar pintura.',
  '%IQ. Tienes los cojones de ser exactamente igual que todo el mundo y encima no te da vergüenza, gilipollas.',
  'Con %IQ tu cerebro es como un menú del día de bar de carretera: cumple, pero nadie repite ni se acuerda.',
  '%IQ de IQ. Coño, eres el equivalente humano de un martes: nadie lo espera, nadie lo celebra, simplemente pasa.',
  'Hostia, %IQ. Tu capacidad mental tiene la emoción de un yogur natural sin azúcar. Existe y punto, joder.',
  '%IQ. Eres tan puñeteramente medio que si te clonaran cien veces no cambiaría ni la estadística ni el ambiente.',
  'Con %IQ piensas como folla un funcionario: cumpliendo el expediente y mirando el reloj, el puto mínimo.',
  '%IQ de IQ. Si la mediocridad pagara impuestos tú solo financiarías una autopista, cabrón.',
  'Joder, %IQ. Tu cerebro es una rotonda: das vueltas, llegas al mismo sitio y te crees que has avanzado.',
  '%IQ. Eres el NPC del grupo. Estás ahí, dices cuatro frases genéricas y nadie nota si te desconectan.',
  'Con %IQ tienes exactamente la inteligencia de un microondas: calientas lo que te meten y ya, sin puta creatividad.',
  '%IQ de IQ. Coño, la media exacta. Eres tan predecible que hasta el bot se aburre de evaluarte.',
  'Hostia, %IQ. Tienes la profundidad intelectual de un charco de meado en un aparcamiento: poco, templado y desagradable.',
  '%IQ. Tu cerebro procesa información como una impresora de los noventa: lento, ruidoso y al final sale una mierda borrosa.',
  'Con %IQ eres el puto empate a cero de la inteligencia. Nadie gana, nadie pierde, todo el mundo se va insatisfecho.',
  '%IQ de IQ. Joder, eres tan del montón que si repartiesen personalidad por IQ te tocaría una cucharada de papilla.',
  'Mierda, %IQ. Eres la versión humana de un pan de molde: blando, cuadrado y absolutamente intercambiable.',
  '%IQ. Con ese número tu cerebro es una carretera comarcal: llega a todos lados pero tardando el triple y con baches.',
  'Con %IQ tienes la agilidad mental de una puta bolsa de plástico en el viento: te mueves mucho pero no vas a ningún lado.',
  '%IQ de IQ. Hostia, eres tan normalito que hasta el algoritmo te salta porque no generas engagement ni de coña.',
  '%IQ. Tu cabeza funciona como un ascensor de dos plantas: sube, baja, y eso es todo lo que da de sí, gilipollas.',
  'Con %IQ eres el equivalente cognitivo de unas zapatillas de andar por casa: cómodo, gastado y que nadie saca a la calle.',
  '%IQ de IQ. Joder, la media clavada. Si fueras una especia serías sal, cabrón. La puta sal, lo más básico que existe.',
  'Coño, %IQ. Eres tan jodidamente estándar que si metieras el cerebro en una batidora saldría gazpacho de brick.',
  '%IQ. Tu inteligencia es como un autobús urbano: va por la misma ruta siempre, llega tarde y huele raro.',
  'Con %IQ tienes la creatividad de una pared blanca y la ambición de una alfombrilla de ratón. Hostia, qué triste.',
  '%IQ de IQ. Mierda, eres tan promedio que si buscas tu nombre en Google sale "quizás quisiste decir otro".',
  '%IQ. Tu cerebro tiene la potencia de un ventilador de mesa: mueve aire suficiente para no ahogarte y ya.',
  'Con %IQ eres el cabrón que está en el centro exacto de la campana de Gauss. El pico de la nada, coño.',
  '%IQ de IQ. Joder, tu intelecto es tan plano que podrían planchar camisas encima de tu capacidad de análisis.',
  'Hostia, %IQ. Eres la versión cognitiva de un parking en superficie: abierto, vacío y sin ningún puto interés arquitectónico.',
  '%IQ. Piensas como conduce un abuelo: despacio, sin sorpresas y cabreando a todos los que van detrás, gilipollas.',
  'Con %IQ tu cerebro es un piso de alquiler en las afueras: funcional, triste y con las paredes llenas de mierda.',
  '%IQ de IQ. Coño, la media pura. Tienes la misma gracia intelectual que una puerta cortafuegos: cumple normativa y ya.',
  'Mierda, %IQ. Tu capacidad mental es un buffet libre de hotel mediocre: hay de todo y todo sabe igual de insípido.',
  '%IQ. Eres tan jodidamente mediocre que si tu cerebro fuera un coche sería un Dacia Sandero de segunda mano.',
  'Con %IQ tienes el nivel de un cabrón que pone "persona proactiva" en el currículum y se queda tan ancho.',
  '%IQ de IQ. Hostia, tu cabeza es como un canal de TDT que nadie ve: emite las veinticuatro horas y da igual.',
  'Joder, %IQ. Eres el tipo de persona que un estadístico usaría como valor por defecto. La mierda estándar.',
  '%IQ. Tu cerebro trabaja como un lavavajillas: mete, saca, y entre medias no pasa nada que merezca contar.',
  'Con %IQ tienes la misma relevancia intelectual que un tornillo en una estantería de IKEA: necesario, pero que le den.',
  '%IQ de IQ. Coño, eres tan del promedio que si te pusieras de perfil intelectualmente desaparecerías, gilipollas.',
  'Mierda, %IQ. Tu cabeza es un piso piloto: parece que alguien vive ahí pero no hay ni un puto cepillo de dientes.',
];

const ALTO = [
  '%IQ. Mira el listo del grupo, coño. Tienes cerebro de sobra y lo usas para discutir con gilipollas en un chat.',
  'Con %IQ podrías estar forrándote y en vez de eso estás aquí leyendo las mierdas que escribe esta panda de subnormales.',
  '%IQ de IQ. Joder, eres listo de cojones y lo más grande que has hecho hoy es abrirle un mensaje a un bot.',
  'Hostia, %IQ. Tienes la cabeza de un puto ingeniero de la NASA pero la ambición de una zapatilla de estar por casa.',
  '%IQ. Eres el cabrón que podría resolver problemas importantes pero prefiere ver cómo arde el grupo. Menudo desperdicio de neuronas.',
  'Con %IQ pillas las cosas a la primera, lo cual es una putada porque te toca esperar a que el resto de imbéciles llegue.',
  '%IQ de IQ. Listo de verdad, y da igual, porque aquí dentro eso vale menos que un moco seco en una barandilla.',
  'Coño, %IQ. Tienes más capacidad que la mitad del grupo junto y la gastas en leer audios de gente que no sabe ni freír un huevo.',
  '%IQ. Eres como tener un Ferrari aparcado en un descampado lleno de mierda: impresionante pero completamente fuera de sitio.',
  'Con %IQ tu cerebro va a ciento ochenta y el grupo va en burro. Debe ser agotador fingir que te interesan estas mierdas.',
  '%IQ de IQ. Hostia, eres el tío listo de la clase que acaba trabajando en lo mismo que el tonto pero con más frustración.',
  'Joder, %IQ. Podrías haber inventado algo útil para la humanidad y has acabado midiéndote el IQ con un puto bot de WhatsApp.',
  '%IQ. Tienes la inteligencia para darte cuenta de que todo esto es una mierda y los cojones de quedarte a verla.',
  'Con %IQ eres el cabrón que ve los errores de todos y no dice nada porque explicárselo sería como enseñar álgebra a una cabra.',
  '%IQ de IQ. Listo pero en un chat de mierda. Es como tener un doctorado y usarlo para abrir botellas, gilipollas.',
  'Mierda, %IQ. Tu cerebro funciona como un puto reloj suizo y lo tienes puesto para contar las horas que pierdes aquí.',
  '%IQ. Eres el que pilla el chiste antes que nadie y tiene que esperar con cara de imbécil a que el resto se ría.',
  'Con %IQ te sobra cabeza para darte cuenta de que la mitad de las opiniones de este grupo son pura mierda de caballo.',
  '%IQ de IQ. Joder, cerebro privilegiado metido en un cuerpo que no ha hecho nada memorable con él. Qué desperdicio de coño.',
  'Hostia, %IQ. Piensas más rápido que el resto pero corres igual de poco. La cabeza te da, las piernas no, cabrón.',
  '%IQ. Eres como un cuchillo japonés cortando pan Bimbo: sobras por todas partes y lo que cortas no vale una mierda.',
  'Con %IQ podrías estar resolviendo ecuaciones y estás resolviendo si contestar o no a un mensaje con un puto emoji.',
  '%IQ de IQ. Coño, listo de verdad. Lástima que la inteligencia no cure la gilipollez social, que esa la tienes intacta.',
  'Mierda, %IQ. Tu cabeza va tres jugadas por delante y tu vida va tres jugadas por detrás. Menudo equilibrio de mierda.',
  '%IQ. Eres el cabrón más listo de un grupo lleno de imbéciles, que es como ser el más alto de una fila de enanos.',
  'Con %IQ entiendes cosas que el resto ni huele, pero te da pereza explicarlas, así que todos seguís igual de jodidos.',
  '%IQ de IQ. Joder, tienes más neuronas funcionando que el resto del chat junto y las usas para mandar stickers.',
  'Hostia, %IQ. Cerebro de cirujano y manos de albañil borracho. Porque una cosa es saber y otra es hacer algo con ello, gilipollas.',
  '%IQ. Eres listo de cojones pero la vida no da premios por eso, así que aquí estás, con los demás subnormales.',
  'Con %IQ tu cerebro tiene más potencia que el router de este grupo y aun así la conexión con la realidad se te cae cada dos por tres.',
  '%IQ de IQ. Coño, eres un puto prodigio desperdiciado. Como regar una planta de plástico: el esfuerzo está, el resultado no.',
  'Mierda, %IQ. Eres lo bastante listo para saber que deberías estar haciendo otra cosa y lo bastante gilipollas para no hacerla.',
  '%IQ. Tienes la cabeza de alguien que podría cambiar las cosas y el culo pegado al sofá como todos los demás, cabrón.',
  'Con %IQ tu cerebro procesa más que el de cualquier cabrón de este grupo y eso, aquí dentro, vale exactamente una polla.',
  '%IQ de IQ. Joder, eres el diamante en bruto que nadie va a pulir porque estás enterrado en un grupo de WhatsApp lleno de mierda.',
  'Hostia, %IQ. Inteligencia por encima de la media metida en una vida completamente por debajo de ella. Qué cosa más triste, coño.',
  '%IQ. Podrías estar publicando papers y estás publicando opiniones de mierda en un chat que nadie se va a releer jamás.',
  'Con %IQ eres el tío que ve la solución mientras los demás siguen buscando el problema. Lástima que el problema seas tú, gilipollas.',
  '%IQ de IQ. Listo y completamente inútil con ello. Como ponerle turbo a un coche sin ruedas, hostia puta.',
  'Mierda, %IQ. Tu cerebro merece algo mejor que este grupo, pero tu criterio de vida claramente no, pedazo de cabrón.',
];

const GENIO = [
  '%IQ. Joder, un puto genio atrapado en un grupo de WhatsApp. Es como meter a Einstein en una jaula de monos que se tiran mierda.',
  'Con %IQ tienes más coeficiente que cojones, porque un genio de verdad no estaría perdiendo el tiempo con estos gilipollas.',
  '%IQ de IQ. Hostia puta, superdotado de los cojones. Y con toda esa cabeza la mejor idea que has tenido hoy es hablarle a un bot.',
  'Mierda, %IQ. Tienes el cerebro de un jodido genio y la vida de un puto becario. Algo ha fallado y gordo, cabrón.',
  '%IQ. Eres el tipo más listo de un grupo lleno de subnormales. Enhorabuena, coño, menudo puto logro de mierda.',
  'Con %IQ podrías estar curando enfermedades y estás aquí, viendo cómo esta panda de imbéciles se manda memes del culo.',
  '%IQ de IQ. Joder, genio certificado. Tu cerebro vale más que todas las cabezas de este chat juntas, y eso da bastante pena de todos.',
  'Coño, %IQ. Superdotación real. Y la estás desperdiciando en un grupo donde el debate intelectual más fuerte es quién paga la cena.',
  '%IQ. Eres un puto genio encerrado en la jaula más triste del mundo: un chat donde la gente escribe "ola" sin hache.',
  'Con %IQ tu cerebro funciona como un reactor nuclear y lo usas para calentar un café con leche, gilipollas.',
  '%IQ de IQ. Hostia, superdotado del carajo. Tienes la cabeza de un premio Nobel y el historial de un cabrón cualquiera.',
  'Mierda, %IQ. Con ese cerebro podrías estar en un laboratorio y estás en un grupo donde alguien acaba de mandar un audio de siete minutos sobre nada.',
  '%IQ. Genio de los cojones. El noventa y ocho por ciento de la humanidad está por debajo de ti y aun así tu vida no se diferencia de la de ellos.',
  'Con %IQ eres la prueba viviente de que la inteligencia no sirve de una puta mierda si no haces nada con ella, pedazo de cabrón.',
  '%IQ de IQ. Joder, esa cifra da miedo. Lástima que la uses para elegir qué serie ver y no para algo que importe una polla.',
  'Coño, %IQ. Superdotado y metido en este chat voluntariamente. Es como usar un bisturí de cirujano para untar mantequilla, hostia.',
  '%IQ. Tu cerebro procesa más que el de todo el grupo junto y lo único que produce es opiniones que nadie va a leer dos veces.',
  'Con %IQ tienes la capacidad de un genio y la productividad de una mierda seca. Qué combinación más triste, cabrón.',
  '%IQ de IQ. Hostia, un puto superdotado entre nosotros. Es como encontrar un Rolex en un contenedor de basura orgánica.',
  'Mierda, %IQ. Cerebro privilegiado que ha decidido voluntariamente compartir espacio con gente que confunde "hay" con "ahí", gilipollas.',
  '%IQ. Eres un genio de los cojones y este grupo es lo más cerca que vas a estar de un estudio sociológico sobre la imbecilidad humana.',
  'Con %IQ podrías estar resolviendo los problemas del mundo y estás resolviendo si poner o no el puto visto azul, cabrón.',
  '%IQ de IQ. Joder, nivel de genio real. Y el genio ha decidido que su contribución al mundo sea calentar la silla de este chat de mierda.',
  'Coño, %IQ. Esa cabeza merece algo mejor que esta cueva de simios con wifi. Pero aquí estás, revolcándote en la mierda con todos.',
  '%IQ. Superdotado confirmado y completamente desaprovechado. Como plantar caviar en un huerto de patatas, hostia puta.',
  'Con %IQ piensas tres veces más rápido que cualquiera aquí y aun así no se te ha ocurrido largarte, pedazo de gilipollas.',
  '%IQ de IQ. Mierda, genio del copón. Tu cerebro vale una fortuna y tú lo tienes aparcado en el grupo más inútil de todo WhatsApp.',
  'Hostia, %IQ. Con esa cifra podrías haber cambiado el mundo, pero el mundo va a seguir igual de jodido porque tú estás aquí.',
  '%IQ. Eres un puto genio y nadie en este grupo se va a enterar ni le va a importar una mierda, cabrón.',
  'Con %IQ tienes el cerebro más potente de la sala y la puta sala es un chat donde alguien ha mandado un sticker de un gato. Menudo genio de los cojones.',
];

// Los tramos no se ordenan: la eleccion es plana (ver helpers.js). En los
// peyorativos eso significa que la comparacion mas floja sale tanto como la mas
// humillante, asi que el pool no puede llevar relleno.
const POOLS = {
  abismo: ABISMO,
  bajo:   BAJO,
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
