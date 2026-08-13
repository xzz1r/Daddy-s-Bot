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
  'Tienes las mismas capacidades cognitivas que un trozo de mierda recién cagado por un perro. Y el trozo al menos tiene forma, joder.',
  'Un mejillón cerrado procesa más información que tú en un día entero. El mejillón, además, sabe cuándo callarse, cabrón.',
  'Con %IQ estás por debajo de una tostadora. La tostadora hace una cosa y la hace bien; tú no has encontrado la tuya, gilipollas.',
  '%IQ de IQ. Eso no es un número bajo: es un diagnóstico de apagón total del cuadro eléctrico, patético.',
  'Tu cerebro es un aparcamiento vacío en domingo por la mañana: mucho espacio y cero actividad útil, basura.',
  'Con %IQ el termómetro cognitivo marca hipotermia severa. No hay pulso intelectual medible, ridículo.',
  'Eres la prueba viviente de que se puede respirar sin pensar. El cuerpo aguanta; el grupo, cada vez menos, desperdicio.',
  '%IQ. Ni para malentender hace falta tan poco hardware: malentiendes con estilo de sótano, asco.',
  'Tu cabeza es un sótano sin bombilla y sin escalera: se intuye que hay algo, no se ve el qué, cutre.',
  'Con %IQ estás en la cola de la distribución de siempre. No es un mal día: es el código postal, pringado.',
  '%IQ de coeficiente. El resto del grupo usa calculadora; tú usas los dedos y todavía te sobran, fracasado.',
  'Pensar te cansa antes de haber empezado la frase. Se te nota en cada mensaje que no debiste enviar, joder.',
  'Con %IQ el bot casi pide disculpas por tener que imprimir un número tan bajo en público, mierda.',
  'Tu neurona favorita está de vacaciones indefinidas. Las demás no han llegado a fichar nunca, coño.',
  '%IQ. Eso no compite con la media del grupo: compite con el silencio y aun así pierde, cabrón.',
  'Eres un argumentario de tres frases cortas y dos de ellas son ruido de fondo, gilipollas.',
  'Con %IQ la conversación te usa de decorado: ocupas sitio en el plano y no condicionas la escena, patético.',
  'El pensamiento abstracto te miró un segundo y siguió de largo. No ha vuelto a pasar por aquí, basura.',
  '%IQ de IQ. El número es bajo y el uso que le das al hardware es más bajo todavía, ridículo.',
  'Tu idea de debatir es repetir lo mismo con más mayúsculas. No es rigor: es volumen vacío, desperdicio.',
  'Con %IQ estás a un paso del apagón total y ese paso ya lo diste hace varios hilos, asco.',
  'La lógica te debe una explicación clara y nunca te la ha pasado por escrito, cutre.',
  '%IQ. Ni el margen de error estadístico te salva: el intervalo de confianza sigue en el sótano, pringado.',
  'Eres lento de los que llegan tarde a su propia idea y descubren que la idea ya se había ido, fracasado.',
  'Con %IQ el grupo ha aprendido a no esperarte en los razonamientos que duran más de dos líneas, joder.',
  'Tu cerebro enciende como un fluorescente viejo de oficina: parpadea, zumba y no ilumina el pasillo, mierda.',
  '%IQ de coeficiente. Para abrir un bote de ideas necesitas ayuda externa y el bote está vacío, coño.',
  'Pensar en cadena se te corta siempre al segundo eslabón. No es mala suerte: es el diseño, cabrón.',
  'Con %IQ no es que falles el examen a medias: es que no encuentras el aula ni el edificio, gilipollas.',
  'El matiz te sobra porque no llegas ni al trazo grueso de la conversación, patético.',
  '%IQ. El número habla solo y con claridad; tú no, y a veces es lo mejor que puedes hacer, basura.',
  'Tu capacidad de análisis cabe en un post-it amarillo y el post-it está en blanco por las dos caras, ridículo.',
  'Con %IQ la profundidad es un rumor de pasillo: has oído que existe, no la has visitado jamás, desperdicio.',
  'Eres el ejemplo de libro de por qué la media del grupo necesita a alguien que la baje, asco.',
  '%IQ de IQ. El bot no se ensaña con el tono: lee el número y escribe el obituario cognitivo, cutre.',
  'La deducción te parece magia negra de feria. Con razón no la has practicado nunca, pringado.',
  'Con %IQ cada conclusión tuya es un accidente de recorrido en una carretera sin señales, fracasado.',
  'Tu cabeza es un navegador con una sola pestaña abierta: y esa pestaña muestra error 404, joder.',
  '%IQ. No hay potencial escondido debajo de la alfombra: hay ausencia documentada y firmada, mierda.',
  'El razonamiento corto se te hace largo de verdad. El razonamiento largo ni lo intentas, coño.',
  'Con %IQ el silencio te favorece más que cualquier argumento que hayas intentado montar, cabrón.',
  'Eres lento y seguro a la vez: seguro de cosas falsas y lento para corregirlas cuando caen, gilipollas.',
  '%IQ de coeficiente. Hasta la calculadora del móvil se apiada un poco al mostrar el resultado, patético.',
  'Tu idea brillante del mes cabe en un meme de 2019 y el meme ya estaba gastado entonces, basura.',
  'Con %IQ el debate te usa de contraste puro: para que se note con claridad quién sí piensa, ridículo.',
  'El pensamiento crítico te devolvió el formulario en blanco y sin sello de entrada, desperdicio.',
  '%IQ. Estás en la zona donde el coeficiente deja de ser broma de grupo y empieza a ser mapa, asco.',
  'Tu neurona hace horas extra en solitario. No es heroísmo laboral: es despido del resto de la plantilla, cutre.',
  'Con %IQ la frase déjame pensar es el tráiler de una película que nunca llega a estrenarse, pringado.',
  'Eres la versión beta de una inteligencia que el equipo de producto canceló antes del lanzamiento, fracasado.'
];

const BAJO = [
  '%IQ. Estás justo por debajo de la media del grupo y se te nota en cada intervención un poco torcida, joder.',
  'Con %IQ no eres tonto de manual de instrucciones: eres tonto de detalle. Fallas en lo pequeño y en el peor momento, mierda.',
  '%IQ de IQ. Justo lo necesario para llenar un formulario mal y quedarte convencido de que quedó bien, coño.',
  'Estás en la franja donde se nota la falta sin llegar al abismo. Incómodo para ti, útil para el diagnóstico, cabrón.',
  'Con %IQ el razonamiento llega a veces, pero tarde y cojo. El grupo ya había cerrado el hilo, gilipollas.',
  '%IQ. No es un insulto de patio: es el margen por debajo de la media que se te ve en cada opinión, patético.',
  'Tu inteligencia funciona a media máquina todo el día: la máquina es pequeña y la media, justa, basura.',
  'Con %IQ aciertas lo obvio con alivio y fallas lo que pide un paso más. Siempre el mismo escalón, ridículo.',
  '%IQ de coeficiente. Suficiente para hablar en el chat, insuficiente para convencer sin subir el volumen, desperdicio.',
  'Estás un peldaño abajo de la media. Se nota en las conclusiones que se quedan a medias una y otra vez, asco.',
  'Con %IQ el matiz se te escapa y el trazo grueso también a ratos. Zona gris del ranking intelectual, cutre.',
  '%IQ. El número no es dramático ni de portada: es mediocre hacia abajo, y eso cansa al grupo, pringado.',
  'Tu cerebro llega al debate con retraso de un mensaje completo. Ese mensaje suele ser el importante, fracasado.',
  'Con %IQ entiendes el título del hilo y te pierdes el subtítulo. El subtítulo era el dato que importaba, joder.',
  '%IQ de IQ. Justo debajo del corte estadístico: ni genio ni anécdota, solo falta ligera y constante, mierda.',
  'Se te nota la media baja en las preguntas que no llegas a hacer y en las respuestas que sí envías, coño.',
  'Con %IQ el análisis se te corta en seco cuando empieza a costar de verdad. Coincides con la zona cómoda, cabrón.',
  '%IQ. No necesitas un abismo para fallar el tono: te basta un escalón y lo usas casi a diario, gilipollas.',
  'Estás en el tramo donde el grupo ya no se sorprende de tus fallos: los espera con el reloj en la mano, patético.',
  'Con %IQ la lógica te funciona en línea recta corta y se rompe en la primera curva del argumento, basura.',
  '%IQ de coeficiente. El margen de error te roza por abajo y se queda instalado ahí sin mudarse, ridículo.',
  'Tu idea de profundidad intelectual es repetir la superficie con otras palabras un poco más largas, desperdicio.',
  'Con %IQ llegas tarde a las conclusiones que el resto del grupo sacó dos mensajes antes que tú, asco.',
  '%IQ. Suficiente para no ser el abismo del ranking: insuficiente para no notarse claramente abajo, cutre.',
  'El pensamiento elaborado te dura lo que dura un story de Instagram. Luego vuelve el piloto automático, pringado.',
  'Con %IQ el debate te deja en el banquillo: sales un momento, tocas el balón y vuelves a sentarte, fracasado.',
  '%IQ de IQ. Zona de nadie intelectual: ni brillar ni hundirte del todo, solo sobrar en el promedio, joder.',
  'Se te ve el esfuerzo cuando intentas subir un peldaño de verdad: el esfuerzo se nota y no basta, mierda.',
  'Con %IQ las analogías se te van de las manos antes de aterrizar en el punto que querías hacer, coño.',
  '%IQ. El número es el espejo sin filtro: un poco por debajo de la media y sin maquillaje posible, cabrón.',
  'Tu media personal está torcida hacia abajo de forma estable. El grupo ya calibró la expectativa, gilipollas.',
  'Con %IQ entiendes el chiste con retraso. A veces al día siguiente, cuando ya no hace gracia, patético.',
  '%IQ de coeficiente. No es una tragedia de portada: es fricción constante en cada hilo un poco serio, basura.',
  'Estás en el tramo que no da titulares de genio ni de desastre absoluto: da bostezos educados, ridículo.',
  'Con %IQ el rigor te parece un accesorio opcional. Por eso tus conclusiones también lo parecen, desperdicio.',
  '%IQ. Un paso detrás de la media del grupo: un paso que se nota en cada discusión que se alarga, asco.',
  'Tu cerebro prioriza la comodidad de la respuesta rápida sobre la precisión del argumento, cutre.',
  'Con %IQ las excepciones ajenas se te convierten en reglas y las reglas en niebla espesa, pringado.',
  '%IQ de IQ. Justo lo que hace falta para opinar con una seguridad que el número no respalda, fracasado.',
  'El grupo no te espera con el reloj parado en los hilos densos. Con %IQ tiene todo el sentido, joder.',
  'Con %IQ el mapa mental tiene varias calles cortadas. Siempre las mismas y en el mismo barrio, mierda.',
  '%IQ. Debajo de la media sin caer al sótano del abismo: el rellano más incómodo del edificio, coño.',
  'Se te nota con claridad cuando el tema pide dos pasos lógicos y tú te quedas plantado en uno, cabrón.',
  'Con %IQ la duda razonable se te vuelve duda eterna o certeza falsa sin término medio, gilipollas.',
  '%IQ de coeficiente. El bot no exagera el tono: lee el número y te coloca en el estante correcto, patético.',
  'Tu techo intelectual está preocupantemente cerca del suelo del resto del grupo. La escalera es corta, basura.',
  'Con %IQ las matizaciones que hacen otros te suenan a ruido de fondo. Por eso no las incorporas, ridículo.',
  '%IQ. No eres el abismo del ranking: eres el escalón suelto que hace tropezar el hilo entero, desperdicio.',
  'Estás calibrado un poco por debajo de la media. El grupo ya no ajusta la esperanza al alza, asco.',
  'Con %IQ el argumento se te diluye en la mitad del mensaje antes de llegar a un punto final claro, cutre.'
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
