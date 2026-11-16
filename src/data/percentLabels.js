// Pools de frases de los comandos de porcentaje.
// La lógica (tirada, amaño, polaridad) vive en commands/percent.js.
//
// CUÁNTAS HAY EN CADA TRAMO, Y LO FIJÓ EL DUEÑO: 25 en el tramo de la paliza,
// que es el que el grupo lee casi siempre, y 10 en cada uno de los otros dos.
// La paliza es `high` en los peyorativos y `low` en los positivos; en
// !feminidad, que tiene tirada propia y al grupo le sale alta o media, las 25
// van al `high`. Los `extreme` no entran en la cuenta.
//
// Antes eran cien, cincuenta y veinticinco. Se recortó quedándose con las
// mejores: la elección es plana, así que la peor frase de un tramo sale tanto
// como la mejor, y el relleno no suma variedad, resta calidad. Salen en baraja
// (percent.js): todas las de un tramo antes de repetir ninguna. La capa 120 de
// check.js vigila los tamaños.
'use strict';

const {
  FIEL_HIGH, FIEL_MID, FIEL_LOW,
  INFIEL_HIGH, INFIEL_MID, INFIEL_LOW,
} = require('./fidelityPhrases');

const LABELS = {

  // incel es peyorativo (goodIsHigh: false). Los halagos empiezan en linda.

  incel: {
    name: 'incel',
    goodIsHigh: false,
    high: [
      'Virgen certificado. No has tocado a una mujer en tu puta vida y a este ritmo vas a morir igual que naciste.',
      'Virgen absoluto. Lo más cerca que has estado de un coño fue el día que saliste del de tu madre.',
      'Tu polla lleva tanto tiempo sin uso que ya cuenta como órgano vestigial. Se te va a caer por desuso.', // ROCKSTAR
      'Pruebas con alcohol, de noche y dando lástima, que son las tres vías por las que folla el resto de mediocres. Tú, cero de tres.', // ROCKSTAR
      'Llevas años convencido de que el problema es del sistema. El problema es logístico, cabrón: la única que te toca es tu mano derecha, y por pena.', // ROCKSTAR
      'Has hecho de una carencia un tema y del tema una personalidad entera, y ahora ya no sabes hablar de otra cosa, muñeca.',
      'Te refugias en la teoría porque la práctica obliga a exponerse, y ahí no llegas, puto cobarde. Mucho análisis y cero cojones.',
      'Tu historial con mujeres se cuenta rápido: no hay. El de pestañas de incógnito, ese sí que es largo.', // ROCKSTAR
      'Tu contacto físico más habitual es el del dentista, y encima pagas. Historial de pringado, con factura.', // ROCKSTAR
      'Hablas de lo que otros hacen mal. Ellos al menos lo hacen, gilipoyas. Tú ni eso, y encima repartes notas desde el sofá.',
      'Dices que pasas de ligar. No pasas, cabrón: es que nunca te han dejado entrar.',
      '*Edición coleccionista: sin estrenar, en su caja original.* Así te venderían en Wallapop, [nombre].', // ROCKSTAR
      '[nombre], tu vida sexual entera cabe en un pañuelo usado.', // ROCKSTAR
      '[nombre], la única relación que se te conoce es contigo mismo, y ni a ti te coges el teléfono.', // ROCKSTAR
      '[nombre], el condón de tu cartera ha caducado dos veces sin salir del plástico.', // ROCKSTAR
      '[nombre], virgen de mierda con la biblioteca llena y la cama vacía. Toda esa lectura para acabar exactamente donde empezaste: solo y con opiniones.',
      'Te enfadas con el mundo por algo que empieza y termina en tu cuarto, [nombre], con la persiana bajada.',
      '[nombre], tu mejor historia es un «casi», y cada vez que la cuentas llegas un poco más lejos. Sigue siendo un casi.',
      'Eres quien culpa al mercado, a la época y a las apps, [nombre]. Para el resto está todo igual, gilipoyas. El problema eres tú.',
      'Eres el pringado que se cree en una guerra que nadie más pelea, [nombre]. Solo estás tú ahí, gritándole al techo de tu cuarto. Da una pena tremenda.',
      'Tu mano derecha ya te pide vacaciones, [nombre], y la izquierda hace horas extra.', // ROCKSTAR
      'Tu historial de navegación folla todas las noches, [nombre]. Tú solo miras.', // ROCKSTAR
      'Dices que te reservas para la persona adecuada, [nombre]. La persona adecuada tampoco sabe que existes.', // ROCKSTAR
      '[nombre], confundes estar solo con estar eligiendo. No eliges nada, cabrón. Te dejan fuera y lo llamas tener criterio.',
      'Tu confianza sigue entera porque nunca la has puesto a prueba, [nombre]. Así no vale una mierda.',
    ],
    mid: [
      'Tienes historial pero es tan corto que cabe en un mensaje. Y encima la mitad fue por lástima ajena.', // ROCKSTAR
      'A ratos ligas y a ratos hablas solo. La media te sale exactamente en patético.',
      'Has follado, sí. Menos veces de las que has contado la historia, eso también es verdad.', // ROCKSTAR
      'Tu historial da para una conversación de cinco minutos. Y la alargas hasta veinte porque no tienes más.',
      'Follas tan poco que tu año es celibato con algún día libre.', // ROCKSTAR
      'Te acuerdas de tu último beso con fecha y hora porque fue hace años y no ha habido otro.',
      'Ligas por accidente y te pasas el resto del tiempo intentando repetir la jugada, con la misma camisa.',
      'Tienes poca experiencia, vieja y de dudosa calidad, y la sacas en cada conversación como si fuera un máster, pequeña.',
      'Abres Tinder y tu match de verdad no aparece. El que te sale es publicidad.',
      'Follas lo justo para no poder quejarte y tan poco que no puedes presumir. Y aun así presumes.', // ROCKSTAR
    ],
    low: [
      'Cero absoluto. No mides mandíbulas, no lees foros y no tienes teoría sobre por qué el mundo te debe sexo.',
      'Cero. Te va bien o te va mal y en ninguno de los dos casos culpas a las mujeres de existir.',
      'Cero. Eres la prueba viva de que no follar una temporada no convierte a nadie en un puto resentido.',
      'Limpio. Follas sin dar lecciones, que aquí es rarísimo. Con quién, mejor no preguntarlo.', // ROCKSTAR
      'Sin rastro. La diferencia entre tú y el resto es que tú sales y ellos analizan.',
      'Cero. Hablas con cualquiera sin que parezca una entrevista, y encima te contestan con ganas.',
      'Ni rastro. A ti ligar no te cuesta seis meses de estrategia. Te cuesta un «¿vamos a por otra?».', // ROCKSTAR
      'Sin material. Cuando no follas, sales igual, y cuando follas, no lo cuentas. Aquí eso es rarísimo.', // ROCKSTAR
      'Sin rastro. Tu historial de búsquedas es aburridísimo: lo bueno lo haces en persona.', // ROCKSTAR
      'Cero. Los números que tienes en el móvil son de gente con la que se queda de verdad. Lo del resto es una lista de deseos.',
    ],
  },


  linda: {
    name: 'linda',
    goodIsHigh: true,
    high: [
      'Tienes canthal tilt positivo y una armonía que la gente paga miles por fingir. Tú lo traes de fábrica, pequeña.',
      'Hueso bueno, piel buena y proporciones que cuadran. La lotería genética te tocó entera y encima sin merecerla.',
      'Tienes la cara de quien recibe fotos que no ha pedido. Y las borras sin abrir, que es lo más cruel.', // ROCKSTAR
      'Te invitan a copas sin pedirlas y te perdonan lo que a otra le costaría el grupo. Y tú te lo crees mérito.',
      'Tienes una mirada que engancha sin esfuerzo, y como nunca te has esforzado, no sabes hacer nada más.',
      'Sales bien recién despertada, con legañas y el pelo aplastado. Eso no te lo perdona nadie del grupo.',
      '*Modelo exclusivo: la miran todos y la catan muy pocos.* Y a esos pocos los eliges con muy mal gusto.', // ROCKSTAR
      'Te invitan a copas solo por mirarte, y a la cama por lo mismo. Tú dices que sí a lo primero.', // ROCKSTAR
      'Tu cara hace que un tío se olvide de lo que iba a decir. Lo que dices tú después se olvida igual de rápido.',
      'Te escriben a las dos de la mañana personas que de día no se atreven ni a saludarte.', // ROCKSTAR
    ],
    mid: [
      'Sales bien en foto y regular en persona. La cámara te quiere más de lo que te quiere la vida real, princesa.',
      'Guapa con condiciones: buena luz, buen ángulo y buen día. Fuera de ese cuadro se te cae bastante.',
      'A partir de la segunda copa eres la más guapa del bar. A la mañana siguiente, la más guapa de anoche.', // ROCKSTAR
      'Sales mejor de perfil que de frente. Medio álbum te salva y el otro medio te hunde.',
      'Te ligan en la discoteca y te piden el número con la luz encendida. Algunos se lo piensan.', // ROCKSTAR
      'Tu etiqueta dice *«guapa a media luz, ideal para fiestas y portales»*.', // ROCKSTAR
      'Con el pelo recién lavado eres guapa. Al tercer día de pelo ya eres simpática.',
      'Tienes una sonrisa bonita y la usas poco, porque sin ella la cara se te queda en correcta.',
      'Arreglada ganas mucho. En pijama, ya es otra conversación, y lo sabes, pequeña.',
      'En tus fotos caen corazones, y en tu privado, de madrugada, alguno que no se atreve a más.', // ROCKSTAR
    ],
    low: [
      'Te describen como «normal», que es lo que dice la gente educada cuando no quiere decir fea.',
      'Tienes esa cara que hace que las apps se inventen algoritmos para esconderte. Hasta el software siente asco.',
      'Tu foto de perfil está elegida con lupa, y aun así nadie te ha pedido nunca una segunda, ni con menos ropa.', // ROCKSTAR
      'Ni el mejor fotógrafo saca nada de ahí, y en OnlyFans te pagarían por taparte.', // ROCKSTAR
      'Te dicen «guapa» después de follar, nunca antes. Es la propina, no la opinión.', // ROCKSTAR
      'Todos los rasgos hacia abajo y ninguno que compense. Equipo perdedor. Capitán: tu cara, y el vestuario da asco.',
      'Tercio medio sin soporte, todo arrastrado. Una cara que se rinde antes que tú, y tú ya te rendiste. Rendición de mierda.',
      '*Lo que se dice guapa: con dos copas y la luz apagada.* Así te vende tu mejor amiga.', // ROCKSTAR
      'Cuando alguien te describe empieza por el pelo y ahí se queda, porque de la cara no hay por dónde cogerte.',
      'Te ligan a las seis de la mañana, cuando ya han encendido las luces y no queda nadie más. Se les ve en la cara al irse contigo.', // ROCKSTAR
      'Ningún rasgo tuyo sube la media, ni por casualidad. El sorteo te dejó fuera y no hay reintegro, chiquitina.',
      'Cada selfie tuya lleva tres filtros y dos rezos, y ni así.',
      'Tu ex te dejó una nota en la almohada: «gracias por todo, menos por la cara».', // ROCKSTAR
      'Cuando te dicen «eres especial», lo dicen mirando al techo y pensando en otra.', // ROCKSTAR
      'Apps, espejos y cristales de coche dicen lo mismo. El problema es tu puta cara, no el cristal.',
      'Tus matches deslizan por la primera foto y desaparecen en la segunda. Los que se quedan no se quedan por la cara.', // ROCKSTAR
      'Dicen que con la boca haces maravillas. Por eso te piden que no levantes la vista.', // ROCKSTAR
      'Te hacen la foto de grupo en segundo plano por piedad. El primero sería una puta denuncia pública.',
      'Te haces la foto una y otra vez y eliges la última. Las descartadas las ha visto tu móvil y se calla.',
      'Llamas «diferente» a estar mal hecha. Eso solo te lo crees tú.',
      'Tienes la frente grande, la barbilla huyendo y la nariz en medio sin saber qué hacer.',
      'Efecto secundario de tu cara de cerca: se baja todo lo que estaba subiendo.', // ROCKSTAR
      'Te tocan el culo en la discoteca y, en cuanto te giras, piden perdón por equivocarse de persona.', // ROCKSTAR
      'Tu mejor amiga te presenta como «la que tiene buena personalidad», que en el mercado de la carne es la letra pequeña.', // ROCKSTAR
      'Tienes rasgos de tres personas que no se soportan, y la reunión se nota en cada foto.',
    ],
  },

  // !lindo es !linda en masculino, con sus propias frases: la peña lo
  // escribia y no salia nada. El dueño lo pidio lo mas brutal posible, y la
  // paliza es el tramo bajo, que es el que el grupo lee casi siempre. Y que
  // ataque RASGOS (papada, cara gorda, nariz torcida, asimetria...) con
  // lenguaje vulgar: las primeras, de chiste general, no le molaron.
  lindo: {
    name: 'lindo',
    goodIsHigh: true,
    high: [
      'Mandíbula de escuadra, pómulos altos y nariz recta. Te tocó la cara entera y la usas para hacerte selfies en el puto gimnasio.',
      'Canthal tilt positivo, cejas bajas y mirada de cabrón. Esa cara liga más que tú con toda tu personalidad.',
      'Te escriben «ey» a medianoche personas que dicen tener pareja.', // ROCKSTAR
      'Perfil de moneda, cuello limpio y cero papada. Medio grupo te envidia y la otra mitad te tiene ganas.',
      'Piel limpia sin una puta crema y dientes rectos sin ortodoncia. Naciste con suerte y te la restriegas a todo el mundo.',
      '*Edición especial: buena cara y mejor lo que no se ve.* Eso dicen de ti, y quien lo dice repite.', // ROCKSTAR
      'Te sientas en una terraza y se llenan las mesas de al lado. No vienen por el café.', // ROCKSTAR
      'Tu cara aguanta la cámara frontal recién levantado. Eso es genética de cabrón con suerte.',
      'Pómulos marcados, frente justa y pelo que no se te cae. Te ha tocado la lotería y ni compraste el puto boleto.',
      'Tienes cara de no haber pagado nunca una copa, y por lo que se cuenta tampoco te ha hecho falta pagar por nada más.', // ROCKSTAR
    ],
    mid: [
      'De frente das el pego. De perfil, tu papada sale a saludar y se acaba la fiesta.',
      'De frente ligas. De perfil te piden que apagues la luz.', // ROCKSTAR
      'Mandíbula decente y una frente que no se acaba nunca. Con gorra eres un siete. Sin gorra, un cinco con entradas.',
      'Tienes una sonrisa bonita y unos dientes que la joden en cuanto la abres del todo.',
      'Cara bien hecha y piel de mierda. Te salvaría un dermatólogo, si tuvieras cojones de ir.',
      'Eres guapo de lejos. De cerca, los poros te delatan y la asimetría hace el resto.',
      'Con gorra tienes tirón. Sin gorra, el tirón se queda en un «ya te escribo».', // ROCKSTAR
      'Guapo para el primer polvo, regular para el segundo. Por eso no hay segundo.', // ROCKSTAR
      'En las fotos de la playa ganas puntos. Cuando sales del agua y se te ve todo, los pierdes.', // ROCKSTAR
      'Con la cara flaca eras otra cosa. Ahora los mofletes se te comen los pómulos.',
    ],
    low: [
      'Tienes una papada con más personalidad que tú, y encima ella sí sale en todas las putas fotos.',
      'Tienes cara de luna llena, gorda y sin un puto ángulo. No se sabe dónde acaba tu cara y dónde empieza el cuello.',
      'Te dicen que eres muy gracioso, que es la manera educada de no acostarse contigo.', // ROCKSTAR
      'Tienes media cara mirando a un lado y la otra media a otro. Quien te besa no sabe por qué lado entrar.', // ROCKSTAR
      'Mandíbula no tienes. Tienes un cuello que sube hasta la boca y se rinde ahí, como te rindes tú con todo.',
      'Esa frente tuya da para proyectar una peli, y por tu cara, de las que se ven a solas y con pañuelos.', // ROCKSTAR
      'Tienes los ojos tan separados que cada uno mira una película distinta, y las dos son de terror cuando te ves en el espejo.',
      'Cuando te quitas la camiseta, quien está contigo se pone la suya.', // ROCKSTAR
      'Piel grasienta, granos en la frente y poros como cráteres. Tu cara se puede freír sin echarle aceite.',
      'Te follan con los ojos cerrados y la imaginación abierta, y en la imaginación sales otro.', // ROCKSTAR
      'La papada te cuelga hasta el pecho y te tiembla entera cuando te ríes. Nadie te mira a los ojos: todos te miran eso.',
      'Tu cara es gorda por arriba, gorda por abajo y gorda por los lados. Lo único fino que tienes es el pelo, y se te está cayendo.',
      'Tienes el mentón metido hacia dentro, huyendo de tu cara. Hasta tu barbilla sabe que eso no tiene arreglo.',
      '*Anticonceptivo natural, cien por cien eficaz:* tu cara. No falla ni con la ovulación encima.', // ROCKSTAR
      'Tu asimetría se ve a un kilómetro: un ojo más alto, una ceja más gorda y la boca torcida hacia donde le sale del coño.',
      'Te dejas barba para tapar que no tienes mandíbula, y te sale a parches. Ni el pelo quiere estar en tu cara.',
      'Te has comprado una cama de matrimonio por si acaso, y el «por si acaso» lleva tres años sin pasar.', // ROCKSTAR
      'Cuando sonríes enseñas más encía que dientes, y los que enseñas están amarillos. No sonrías en tu puta vida.',
      'Las pocas veces que mojas tú, la otra persona apaga la luz antes de que llegues a la cama.', // ROCKSTAR
      'Cejas juntas, ojos hundidos y ojeras hasta los pómulos, que no tienes. Tienes una cara de mierda en todos los pisos.',
      'Te tiras a la piscina en las fiestas para que alguien te vea mojado por fin.', // ROCKSTAR
      'En la cama te piden que te dejes la camiseta puesta. Y la gorra. Y, si puede ser, la luz apagada.', // ROCKSTAR
      'Cerdo de mierda, tienes la cara llena de granos reventados con los dedos sucios, y se te nota a dos metros.',
      'Has puesto un espejo en el techo y lo usas para vigilar que nadie se arrepienta a mitad.', // ROCKSTAR
      'Te piden fotos de los abdominales para ver si compensan la cara. No compensan, y lo de más abajo ya ni lo han pedido.', // ROCKSTAR
    ],
  },
  fea: {
    name: 'fea',
    goodIsHigh: false,
    high: [
      'Con la luz apagada rindes como cualquiera. El problema es que luego alguien la enciende para buscar la ropa.', // ROCKSTAR
      'Tu piel tiene textura, tu mandíbula no tiene borde y tus ojos no tienen forma. La suma da asco, y se ve a un metro.',
      'Tienes bolsas malares y flacidez temprana. Dormir diez horas no arregla una estructura que cede, y el resultado da vergüenza en cualquier luz, pequeña.',
      '*Tu cara, versión de fábrica: queda mejor de espaldas.* Por eso quien repite contigo pide siempre la misma postura.', // ROCKSTAR
      'Tu cara no tiene un mal ángulo: solo tiene malos ángulos. Por eso quien se acuesta contigo lo hace a oscuras y de espaldas.', // ROCKSTAR
      'Quien se acuesta contigo cierra los ojos, y no de gusto. Lo llama concentrarse.', // ROCKSTAR
      'Cara de «me lo pasé bien, pero borra las fotos». Te lo dicen todos a la mañana siguiente, y con prisa.', // ROCKSTAR
      'Contigo los preliminares incluyen apagar la luz, la tele y, si se pudiera, tu cara.', // ROCKSTAR
      'Tu problema no se arregla adelgazando. El hueso no negocia, y la cara sigue siendo basura.',
      'Ni la mejor luz del mundo te saca partido. Por eso en tus citas siempre piden apagarla.', // ROCKSTAR
      'En tu porno casero la cámara no sube de los hombros. Ni quien lo graba quiere verte la cara.', // ROCKSTAR
      'Efectos secundarios de tu cara: gatillazos, prisas por acabar y un «mañana madrugo» que no se cree nadie.', // ROCKSTAR
      'Asimetría evidente en el eje vertical. Se nota en cuanto alguien te mira dos segundos, y todo el mundo mira dos putos segundos.',
      'Te follan pensando en otra, y lo sabes porque al acabar dicen otro nombre. Tú das las gracias igual.', // ROCKSTAR
      '[nombre], tercio medio largo, mandíbula inexistente y cero soporte óseo. La cara se te cae sola y no hay puto ángulo que arregle un fallo estructural.',
      'Tienes canthal tilt negativo, ojos hundidos y proyección malar nula, [nombre]. El pack completo de la mierda genética y sin una sola compensación.',
      '[nombre], el maquillaje tapa la piel, pero no puede una mierda con la estructura. Y el problema es la estructura.',
      '[nombre], tu perfil es una línea recta de la frente al cuello. Ahí no hay nada que mirar, y por eso nadie mira.',
      'Solo se acuestan contigo a partir del sexto cubata. Del séptimo en adelante ya no se les levanta, y no es por el alcohol.', // ROCKSTAR
      '[nombre], cero proyección zigomática. Todo se cae hacia dentro y hacia abajo a la vez, y lleva años cayéndose.',
      'Cara plana, nariz proyectada y mentón que huye, [nombre]. Tres fallos que se empeoran entre sí.',
      '[nombre], mandas fotos sin cara para que funcionen. Las que llevan cara vuelven con un «jajaja».', // ROCKSTAR
      '[nombre], cero proyección en frente, nariz y mentón. Los tres puntos que deciden un perfil, y los tres fallando a la vez.',
      'Tienes arcada comprimida y maxilar estrecho, [nombre]. Se nota en toda la parte media y no hay ortodoncia que llegue tan tarde.',
      '[nombre], cero pómulo, cero borde y cero sombra. Todo blando y redondo, y nada que la luz pueda salvar.',
    ],
    mid: [
      'Ligas cuando cierran los bares y la gente ya no elige. A esa hora eres la mejor opción.', // ROCKSTAR
      'Tienes un rasgo bueno rodeado de rasgos normales. Ese rasgo está haciendo un esfuerzo enorme, dale las gracias, muñeca.',
      'Sales bien en las fotos de grupo porque siempre hay alguien peor al lado. Sola en la foto es otra historia.',
      'Tienes una cara de «con buena luz»: con buena luz, con buen ángulo y con alguien que no mire mucho.',
      'Te miran dos veces: la primera por la ropa y la segunda para confirmar que la cara no acompaña.',
      'Tu mejor foto existe. Quien te ve en persona entiende por qué es la única, pequeña.',
      'Para un rollo de una noche das el pego. Para el desayuno ya no, y nadie se queda al desayuno.', // ROCKSTAR
      'Con gafas de sol eres un seis. En la cama, como no te las dejas puestas, bajas a cuatro.', // ROCKSTAR
      'Te arreglas una hora para salir y te dicen «qué mona», que es lo que se dice cuando no se puede decir guapa.',
      '*Atractivo con letra pequeña: solo con buena luz, de lejos y con dos copas.* Lo pone en tu caja.', // ROCKSTAR
    ],
    low: [
      'Ni un punto. Tienes buena estructura, buena piel y todo en su sitio. Da hasta rabia.',
      'El bot ha rebuscado fealdad en cada rasgo de tu cara y ha vuelto con las manos vacías. Qué asco de suerte.',
      'Ningún punto, y sin esforzarte. Por eso te odia medio grupo en silencio.',
      'Cero. Tienes la cara que la gente imagina cuando se toca, y no lo sabes porque no te lo dice nadie.', // ROCKSTAR
      'Cero. Canthal tilt positivo, buen tercio medio y la mandíbula en su sitio. A tu lado, cualquier selfie sale perdiendo.',
      'Sin rastro de fealdad. Tus fotos se guardan, no se comentan.', // ROCKSTAR
      'Limpio. Tienes pómulos de verdad, de los que hacen sombra, y las demás se los pintan con colorete.',
      'Limpio. Te ligan los camareros, los porteros y la pareja de tu amiga, y tú haces como que no te enteras.', // ROCKSTAR
      'Cero. Eres de la edición que no necesita luz apagada, y quien ha estado contigo la deja encendida.', // ROCKSTAR
      'Cero. Tu cara aguanta el zoom de la foto de grupo, y por eso nadie quiere salir a tu lado.',
    ],
  },

  // Peyorativo. Alto es la paliza al cuerpo. Medio ataca igual, con menos
  // veneno. Bajo no hay grasa que señalar: si la cifra es baja, no se tira mierda.
  gorda: {
    name: 'gorda',
    goodIsHigh: false,
    high: [
      'Tienes la barriga tan grande que ya no se sabe dónde acaba el pecho y dónde empieza ella. Eres un solo bloque de grasa de la barbilla al pubis, y a eso lo llamas cuerpo.',
      'Tu papada ya tiene su propia papada, y en la cama hay que buscarte el cuello con linterna.', // ROCKSTAR
      'Los brazos se te descuelgan en dos bolsas de grasa que se balancean solas. Levantas la mano para saludar y lo que saluda de verdad es esa puta carne que te cuelga por debajo.',
      'Tienes los muslos tan gordos que no se separan nunca. Entre ellos no pasa ni el aire, y la piel de dentro la llevas roja y en carne viva de tanto restregarse.',
      'La cara se te ha redondeado hasta perder la mandíbula. Los mofletes te empujan los ojos hacia arriba, y de frente lo que se ve es una bola de carne con dos rayas.',
      'El culo se te desparrama por los lados de cualquier asiento, y quien se te pone detrás necesita un mapa para encontrar el camino.', // ROCKSTAR
      'La barriga te cuelga por delante y te tapa el pubis entero. Para verte ahí abajo necesitas un espejo, y ni con espejo lo consigues.',
      'Los rollos de la espalda se te apilan en tres escalones de grasa, y el sujetador se te hunde entre ellos hasta desaparecer.',
      'Las estrías te cruzan la barriga, las caderas y los muslos, blancas y moradas, de tanto que se te ha estirado la piel. Tu piel ya no da más de sí, y tú sigues engordando.',
      'Para llegar a lo importante hay que levantarte la barriga con las dos manos, y quien lo intenta se cansa antes de llegar.', // ROCKSTAR
      'Te mueves y te tiembla todo: la barriga, los brazos, la papada y el culo, cada cosa a su ritmo. Andas tú, y detrás anda toda tu puta grasa con un segundo de retraso.',
      '*Edición deluxe: el doble de carne por el mismo polvo.* Y aun así contigo no repite nadie.', // ROCKSTAR
      'Encima no te pones nunca: la única vez que lo probaste, la cama hizo un ruido que todavía recuerda el vecino.', // ROCKSTAR
      'Las tetas se te han caído encima de la barriga y ya no se sabe qué es cada cosa. Es todo grasa apilada, y el sujetador solo decide el orden.',
      'Respiras fuerte hasta sentada. Tanta grasa te aprieta por dentro que cada frase te sale con un resoplido al final, y ni siquiera te has movido.',
      'Sudas antes, durante y después. Quien te folla sale como de una sauna, y la sauna no la repite nadie.', // ROCKSTAR
      'Te gusta que te agarren de las caderas: son lo único que se encuentra sin linterna.', // ROCKSTAR
      'Quien se acuesta contigo pide la luz apagada, y no por romanticismo: por miedo a perderse.', // ROCKSTAR
      'Tienes el cuerpo en forma de bola. De frente eres ancha, de lado eres barriga y por detrás eres culo. Ningún puto ángulo te salva.',
      'Sudas por la grasa que te sobra, y se te nota en cada pliegue: debajo de las tetas, entre los rollos y detrás de las rodillas. Tu cuerpo tiene más sitios para sudar que para enseñar.',
      'Lo tuyo en la cama tiene categoría propia en las webs guarras, y es de las que la gente busca en modo incógnito.', // ROCKSTAR
      'Contigo encima, el misionero es una emergencia: a la tercera embestida el de abajo pide aire.', // ROCKSTAR
      'Tus nudes llegan en panorámica. El móvil no tiene un modo más ancho.', // ROCKSTAR
      'Lo tuyo no es tener unos kilos de más: es estar gorda de verdad, con la barriga, la papada y los muslos dándolo por confirmado. El número del bot solo te lo pone por escrito.',
      'Tu idea de un trío es tú y dos pizzas familiares. Las pizzas, por lo menos, no salen corriendo.', // ROCKSTAR
    ],
    mid: [
      'De pie das el pego. Te sientas, el botón del vaquero empieza a negociar, y a media tarde ya lo has soltado.',
      'De lejos no se nota. De cerca, en la story, asoma el segundo mentón, y por eso te grabas siempre de lejos.',
      'Cierras la cremallera y te aguanta, pero todo el día en tensión, y sentada la bajas un poco para poder respirar.',
      'Tienes dos estrías finas en la cadera, y con el bikini de lado se asoman sin que nadie tenga que señalarlas.',
      'Te pones encima solo con la luz apagada, y aun así avisas antes de bajar.', // ROCKSTAR
      'Tus nudes son de cintura para arriba y con la barriga metida. Quien las recibe nota que aguantas la respiración.', // ROCKSTAR
      'De frente pasas. Te giras a coger el bolso y se te marca un rollo encima del pantalón, solo uno, el justo para que se vea.',
      'En el probador metes tripa, y en la cama también: lo que no aguantas es el aire hasta el final.', // ROCKSTAR
      'Te ligan cuando ya llevan dos copas, y a la mañana siguiente cuentan los kilos que no vieron.', // ROCKSTAR
      'El negro te favorece y aguantas el aire en cada foto. Juntas, las dos cosas te salvan la foto. Sueltas el aire y ya es otra.',
    ],
    low: [
      'Nada que medir. Te sienta la ropa, se te ve la cintura y cierras el pantalón sin pelearte con él. Da rabia lo fácil que te queda.',
      'Cero. Te subes una foto en bañador y nadie tiene material. Se te quedan mirando y se les acaba el chiste.',
      'Cero. Te quitas la ropa y quien está delante no sabe ni por dónde empezar, y eso es un halago.', // ROCKSTAR
      'Limpio. Estrías no se te ven, papada tampoco, y la cara te aguanta el zoom. Por eso te tienen manía en silencio.',
      'Nada. Te ven en bikini una vez y te guardan en la memoria para las noches que hagan falta.', // ROCKSTAR
      'Cero puntos. Piel lisa, mandíbula en su sitio y nada colgando. Te ha tocado el cuerpo y ni te molestas en disimularlo.',
      'La cámara frontal te busca la papada y no encuentra dónde. Te grabas de frente, recién levantada, y sigues estando bien. Insoportable.',
      'Impecable. Te pones encima y la cama ni se queja. Quien se queja es el vecino, por otras razones.', // ROCKSTAR
      'Sin un gramo de más. Medio grupo te tiene en la cabeza a la hora de dormir, y no por envidia.', // ROCKSTAR
      'Nada que tapar. Sales de perfil y llegas tú, no la barriga. El grupo va a tener que meterse contigo por otra cosa.',
    ],
  },

  sexy: {
    name: 'sexy',
    goodIsHigh: true,
    high: [
      'Tienes la cara que medio grupo imagina cuando apaga la luz, y no para dormir.', // ROCKSTAR
      'Te sientan bien hasta las fotos de carnet, que ya es abusar. Deja algo para el resto del grupo.',
      'Lo tuyo es *atractivo de serie, con todo incluido*, también lo que no sale en tus fotos. Y de eso se habla.', // ROCKSTAR
      'Te escriben con cualquier excusa de mierda solo para verte en línea, y lo sabes de sobra.',
      'Si subes una historia, te la vuelven a ver. Nadie lo confiesa, pero el dedo vuelve.',
      'Alguna pareja ha discutido por culpa de un like tuyo, y tú ni te acuerdas de a quién se lo diste.',
      'Te ponen una mano en la cintura para la foto, y hay quien tarda bastante en quitarla.', // ROCKSTAR
      'La gente busca excusas para salir en tus fotos. A tu lado cualquier encuadre mejora, y tú te dejas usar.',
      'Un mensaje tuyo a deshora le quita el sueño a alguien. Lo sabes y lo mandas igual, mi niña.',
      'Seguro que alguien tiene una carpeta con tus fotos y la abre más de noche que de día.', // ROCKSTAR
    ],
    mid: [
      'Tienes días. El problema es que los buenos los eliges tú y los malos los ve todo el mundo, pequeña.',
      'Besas bien la primera vez y regular la segunda. A la tercera ya te escriben con otra cosa.', // ROCKSTAR
      'Tu mejor ángulo existe y funciona. Los otros tres se lo cargan en cuanto te giras.',
      'Con dos copas eres un siete. Con tres te invitan a subir, y con cuatro ya no se acuerdan de por qué.', // ROCKSTAR
      'Aprobado, pero porque te salvan la ropa, el corte de pelo y la luz.',
      'Tienes buena percha y cara de lunes. Con la ropa adecuada engañas, hasta que te sientas y hablas.',
      'Te sacan a bailar en la tercera canción. La primera y la segunda ya estaban pilladas.',
      'En la cama cumples, que es lo que se pone en las encuestas cuando no se quiere volver contigo.', // ROCKSTAR
      'Tus nudes aprueban con un cinco. Las guardan, pero en la carpeta de «por si acaso».', // ROCKSTAR
      'Te han llamado guapo o guapa, casi siempre de cerca y casi siempre por compromiso.',
    ],
    low: [
      'Tu mejor ángulo lleva años en busca y captura. No se fugó: nunca existió, y la cámara lo sabe mejor que tú.',
      'Ni el alcohol te mejora: a las seis de la mañana, con todo el bar borracho, sigues volviendo a casa sin compañía.', // ROCKSTAR
      'Te vas de la fiesta y nadie se da cuenta hasta el día siguiente. Lo más sexy que has hecho es desaparecer, y ni eso deja de dar pena de mierda.',
      'Apagas la luz para ayudar, y a oscuras se te sigue notando. Ni el interruptor te salva de ese cuerpo de asco.', // ROCKSTAR
      'Nadie te pide que te quedes a la segunda copa. La primera ya fue caridad. La segunda sería una puta broma.',
      'Tu cara no se olvida, por desgracia. La gente borra el historial para no volver a verla.',
      'El espejo te debe una disculpa y no te la va a dar. Tú le debes apagar la puta luz, y quien se acueste contigo, también.', // ROCKSTAR
      'Te desnudas y el cuarto pierde valor de mercado. Hasta el colchón se queja, y con razón: das asco hasta sin ropa.', // ROCKSTAR
      'La gente te manda a la friendzone para no tener que mandarte a la mierda.',
      'Te miran y cambian de tema rápido, por no tener que decirte nada.',
      'Un desnudo tuyo parece un informe médico. Nadie lo pide por vicio, y quien lo ve pide que se borre esa mierda.', // ROCKSTAR
      'Te han fingido más bostezos que gemidos, y los bostezos eran los de verdad.', // ROCKSTAR
      'La ropa interior te queda grande justo donde debería quedarte justa.', // ROCKSTAR
      'Nadie te desviste con la mirada. Si acaso te ponen otra capa, por piedad.', // ROCKSTAR
      'A tu paso no se levanta nada. Ni una ceja.', // ROCKSTAR
      'La gente prefiere su propia mano antes que la tuya y lo prefiere con ganas, reina.', // ROCKSTAR
      'De lejos todavía cuelas. En cuanto te acercas, se acaba.',
      'Tienes un cuerpo que se ve entero y no apetece por ningún lado.',
      'Nadie te imagina por la noche, ni por aburrimiento.', // ROCKSTAR
      'Lo único que se te marca es la decepción. Con ropa y sin ella, chiquitina.',
      'La gente te usa de contraste: a tu lado cualquiera brilla. Gracias por el puto servicio.',
      'No tienes boca que apetezca ni manos que inviten. No hay por dónde cogerte.',
      'Cuando entras se hace un silencio de esos incómodos. Ni el camarero te mira.',
      'Te acercas a susurrar algo y la otra persona se aparta. No hace falta que acabes la frase.',
      'Por tu cama pasa tan poca gente que no da ni para contarlo.', // ROCKSTAR
    ],
    extreme: [
      'Estás tan bien que da rabia mirarte, y se te mira igual. Lo que dices después no lo escucha nadie: están pensando en lo que harían contigo.', // ROCKSTAR
      'Entras en una foto de grupo y la foto pasa a ser tuya. Los demás salen de relleno y lo saben.',
      'Tienes la cara de quien ha roto más de una pareja sin quitarse la ropa.', // ROCKSTAR
      'Te escriben «buenas noches» personas que luego no duermen.', // ROCKSTAR
      'Por ti se borran mensajes guarros antes de mandarlos, y los que sí llegan son de los más desesperados.', // ROCKSTAR
      'Tu cara hace que los demás se revisen la suya. Y no salen ganando, princesa.',
      '*Edición prohibida: solo en sueños húmedos.* Y tú sales en unos cuantos de este grupo.', // ROCKSTAR
      'Si mirar costara aura, en este grupo más de uno estaría arruinado por tu culpa.',
      'Haces que un «hola» parezca una propuesta. Luego hablas y era solo un hola.',
      'Medio grupo te tiene silenciado para no pasarse el día mirándote, y la otra mitad te tiene fijado.', // ROCKSTAR
      'Un audio tuyo diciendo «hola» lo escucha alguien dos veces, y la segunda con los ojos cerrados.', // ROCKSTAR
      'Atractivo del que desordena conversaciones. Se acaba hablando de ti, y nunca de lo que dices.',
      'Tienes cara de meter en problemas a gente que se creía muy segura, y de no quedarte a arreglarlos.',
      'Quien acabe contigo va a tener que aguantar que nadie se lo crea, y aguantarte a ti, que es peor.',
      'Te sientas en una terraza y la gente se olvida de con quién había venido.', // ROCKSTAR
      'Tienes una sonrisa peligrosa, de las que hacen firmar cualquier cosa. Tú la usas para que te paguen las copas.',
      'La foto de perfil ya es trampa. En persona debe de ser delito, y lo sabes, que es lo que te hace insoportable.',
      'Estás tan bien que el grupo te perdona cosas que a otros no les perdonaría, muñeca.',
      'Tienes ese morbo que no se explica. Menos mal, porque explicarte a ti no hay quien pueda.', // ROCKSTAR
      'Si cobraras por tus fotos, este grupo estaría en la ruina y tú en una isla.', // ROCKSTAR
    ],
  },

  crack: {
    name: 'crack',
    goodIsHigh: true,
    high: [
      'Te piden ayuda con cualquier cosa y la arreglas en dos minutos mientras comes. Nadie da las gracias, por vergüenza, mi niña.',
      'Cuando mandas un audio explicando algo, la gente lo escucha entero. Aquí eso no le pasa a nadie más.',
      'Lo haces bien y rápido, y dicen que en la cama al revés: bien y despacio.', // ROCKSTAR
      'Arreglas cualquier cosa con las manos, y quien te ha tenido cerca dice que no solo aparatos.', // ROCKSTAR
      'Das con la respuesta antes de que acaben la pregunta, y luego pones cara de paciencia. Esa cara la conoce todo el grupo.',
      'Te piden ayuda para montar un mueble y acaban pidiéndote que te quedes a pasar la noche.', // ROCKSTAR
      'Lo que tocas funciona, y lo que no tocas se rompe. Por eso te llaman para todo, y por eso no descansas nunca.',
      'Te equivocas poco y lo reconoces rápido. Eso deja al resto sin excusa, y sin excusa el grupo se pone de mala leche.',
      'Tus ideas son de las que otros repiten como si fueran suyas. Las repiten mal, pero se nota de quién son.',
      '*Servicio técnico premium: viene a casa, lo arregla todo y no tiene prisa por irse.* Así te recomiendan.', // ROCKSTAR
    ],
    mid: [
      'Con la mitad de tu potencial ya estarías arriba. Con la mitad de tu pereza, también.',
      'Eres competente. Competente es lo que se dice cuando no se puede decir nada mejor, pequeña.',
      'Empiezas fuerte, aguantas a medias y terminas pidiendo perdón. En el curro y en lo otro.', // ROCKSTAR
      'Prometes más de lo que entregas. No mucho más, pero lo justo para decepcionar siempre.',
      'Te sale bien una vez de cada tres. En la cama también, por lo que se cuenta.', // ROCKSTAR
      'Te lo piden a ti cuando no hay nadie mejor a mano, y a esa hora ya vale cualquiera.', // ROCKSTAR
      'Sacas el cinco en todo, a la primera y sin estudiar. Estudiando sacarías el seis, y no te da la gana.',
      'Te sabes los trucos que medio grupo no sabe y no los usas para nada. Guardas el talento para una ocasión que no llega.',
      'Arreglas lo de los demás y lo tuyo lo dejas para luego. Luego no llega nunca.',
      'Prometes una noche épica y entregas una siesta.', // ROCKSTAR
    ],
    low: [
      'No tienes ni puta idea de nada y lo tapas con chulería. Di "entrégalo ahora" y se te cae el disfraz.',
      'Te asignan lo que no se puede romper. Ya aprendieron, a hostias, lo que pasa si te dan algo serio: lo conviertes en mierda.',
      'Te sobra teoría de bar, y cuando toca hacerlo se te acaba y te vas, como en la cama: mucho discurso y cero obra.', // ROCKSTAR
      'Te llega lo serio, inútil, y pides tiempo. Te lo dan, y lo único que entregas es otra excusa.',
      'Prometes mucho, aguantas poco y acabas antes que nadie. En el curro y donde no es el curro.', // ROCKSTAR
      '*Rendimiento garantizado durante los dos primeros minutos.* Lo pone en tu contrato y en tu historial de ligues.', // ROCKSTAR
      'Cuando cuentan contigo, alguien arranca el cronómetro del desastre. Nunca falla, y el desastre lleva tu firma de inútil.',
      'Lo tocas y lo estropeas, da igual qué sea. Por eso nadie te deja tocar nada, tampoco en la cama.', // ROCKSTAR
      'Cada vez que dices «yo me encargo», alguien se prepara para recoger tus restos. El encargo dura un mensaje y la cagada, una semana de mierda.',
      'Te piden que lo hagas bien y despacio, y lo haces mal y deprisa. En todos los sitios, por lo que cuentan.', // ROCKSTAR
      'Dices «yo me encargo» con la misma seguridad con que dices «yo controlo». Luego no controlas, y alguien tiene que limpiar.', // ROCKSTAR
      'Nadie te deja el volante, y hacen bien. De copiloto solo quejas, y las quejas son de parásito, pequeña.',
      'Firmas el curro de otro como si fuera tuyo, y se nota en que por una vez está bien hecho.',
      'Te dan algo grande entre manos y no sabes qué hacer con ello. Pasa con los proyectos y, dicen, con todo lo demás.', // ROCKSTAR
      'Haces la mitad del trabajo y pides el aplauso entero. En la cama igual: medio polvo y cara de haber ganado algo.', // ROCKSTAR
      'Cuando hay algo serio, el plan B es no contar contigo. Y el plan B funciona de maravilla.',
      'Contigo no se queda satisfecho nadie: ni el jefe ni quien ha compartido almohada contigo.', // ROCKSTAR
      'Lo tuyo es fingir que sabes lo que haces, y fingir es también lo que hace quien se acuesta contigo.', // ROCKSTAR
      'Mandas un audio de cinco minutos explicando lo que vas a hacer, y es lo único que haces, pequeña.',
      'Te sabes la teoría de todo y en la práctica no atinas ni con el agujero de la cerradura.', // ROCKSTAR
      'Hablas de excelencia y entregas un PDF torcido y tarde.',
      '*Tu versión estrella: caduca a los cinco minutos y sin final feliz.*', // ROCKSTAR
      'Nadie toma tu relevo con miedo. Lo toma con alivio, y se le nota en la cara, princesa.',
      'Te piden un arreglo y montas una reunión. La reunión no aprieta ni un puto tornillo.',
      'Los resultados te esquivan como quien esquiva a un borracho en el metro.',
    ],
    extreme: [
      'Se te da tan bien lo tuyo que la gente se pregunta si en la cama también. Y hay quien lo ha comprobado.', // ROCKSTAR
      'Te sale bien a la primera y sin despeinarte. En otras cosas, dicen, despeinas a quien tengas al lado.', // ROCKSTAR
      'Otros se matan para llegar a tu nivel y tú llegas en chanclas, y te vas con compañía.', // ROCKSTAR
      'Todo el mundo te quiere en su equipo, y alguno en su cama, para ver si rindes igual.', // ROCKSTAR
      'Cuando algo sale mal te buscan a ti, y cuando sale bien también. Te tienen frita.',
      'Lo haces todo a la primera, y hay quien en el grupo daría algo por que le repitieras.', // ROCKSTAR
      'Donde tú apareces, los demás bajan la cabeza y hacen como que trabajan, pequeña.',
      'Lo tuyo no se aprende en un curso de fin de semana. Lo de ser insoportable con ello, tampoco.',
      'Eres la vara de medir del grupo, y todos sueñan con metértela por el culo.', // ROCKSTAR
      '*Rendimiento profesional, garantía de por vida.* Lo dicen quienes te han tenido encima de un proyecto y de otras cosas.', // ROCKSTAR
      'Todo el mundo te quiere en su equipo. Luego no te aguanta nadie, porque lo haces mejor.',
      'Ganas sin hacer ruido. El ruido lo hacen los que pierden contra ti.',
      'Tienes un talento que pone nerviosa a la gente, y no siempre por envidia.', // ROCKSTAR
      'Lo tuyo es de verdad. No necesitas que te lo digan, y te lo decimos igual, para joder al resto.',
      'Dominas tanto lo tuyo que medio grupo se dejaría dominar con gusto.', // ROCKSTAR
      'Para cada problema tienes una solución, no una excusa. Y una charla de media hora explicándola.',
      'Cuando hablas de algo que dominas, la gente se calla. Y dominas demasiadas cosas.',
      'Te sale redondo lo que al resto le sale de milagro. Es insultante.',
      'Tienes talento de sobra y cara dura para restregarlo, que es lo que nadie te perdona.',
      'Eres de verdad en lo tuyo, y quien ha probado lo otro dice que también.', // ROCKSTAR
    ],
  },


  feminidad: {
    name: 'femenina',
    goodIsHigh: true,
    // Las 25 frases van al `high` y no a la paliza (`low`): con su tirada propia
    // al grupo le sale alta o media el 90 % de las veces. Ver la cabecera.
    tramoPrincipal: 'high',
    // Feminidad is the one positive trait the bot flips for the owner: everyone
    // tends to land mid/high (it's not really a roast target), but the owner —
    // the resident alpha — lands LOW most of the time as the running joke.
    roll: (targetIsOwner) => {
      const r = Math.random();
      const hi = () => 70 + Math.floor(Math.random() * 31);
      const mid = () => 31 + Math.floor(Math.random() * 39);
      const lo = () => Math.floor(Math.random() * 31);
      if (targetIsOwner) {
        if (r < 0.85) return lo();
        if (r < 0.96) return mid();
        return hi();
      }
      // everyone else: usually mid/high
      if (r < 0.45) return hi();
      if (r < 0.90) return mid();
      return lo();
    },
    high: [
      'Entras y a más de uno se le olvida que tenía pareja. A la pareja no se le olvida.', // ROCKSTAR
      'Entras y alguien se olvida de lo que estaba diciendo, y de con quién había venido. Y tú lo sabes de sobra.', // ROCKSTAR
      'No te hace falta levantar la voz. Hablas bajo y te escuchan, y eso a las demás les jode, pequeña.',
      'Te queda bien hasta lo que a otras les queda de disfraz. Qué asco de genética.',
      '*Edición limitada: se mira, no se toca.* Lo llevas escrito en la cara y lo saben todos.', // ROCKSTAR
      'Cruzas las piernas y en la mesa se para la conversación. Nadie sabe ya de qué estaba hablando.', // ROCKSTAR
      'Sin maquillaje sigues ganando, y sin nada más, dicen que todavía más.', // ROCKSTAR
      'Te agachas a coger algo y medio grupo se ofrece a ayudarte. La otra mitad, a mirar.', // ROCKSTAR
      'Mandas una foto normal y la guardan como si fuera de las otras.', // ROCKSTAR
      'Tienes mirada de las que desarman. Luego te haces la tonta, que es lo que más jode.',
      'Lo delicado te queda de talla. Lo borde también y sabes cuándo sacarlo, pequeña.',
      'Tu voz por audio se escucha dos veces, y la segunda no es por el contenido.', // ROCKSTAR
      'Entras tú y a la de al lado se le queda cara de mueble.',
      'Te pruebas algo en una tienda y se forma cola delante del probador, y nadie lleva ropa en la mano.', // ROCKSTAR
      'Tienes un no que no hace falta gritar. Lo dices una vez y se acabó la conversación.',
      'Eres dulce hasta que alguien se pasa. Entonces muerdes.',
      'Ni levantas la vista del móvil y la mesa ya sabe quién manda. Lo disfrutas como una cabrona.',
      'Lo suave te sale solo. Lo cabrona, también, pero lo guardas para quien se lo gana.',
      'Muerdes el boli pensando en otra cosa, y quien te mira piensa en lo mismo.', // ROCKSTAR
      'Te acercas y a más de uno se le traba la lengua. Lo disfrutas, y se te nota.',
      'Subes una historia en la playa y te contestan con fuego hasta los que juraban no mirar.', // ROCKSTAR
      'Dices «buenas noches» y alguien se queda despierto pensando en cómo las pasas.', // ROCKSTAR
      'Llevas la ropa como si te la hubieran hecho a medida. A las demás les queda prestada.',
      'Rojo, negro o chándal: te queda bien todo, y eso no se perdona en ningún grupo.',
      'Te miran al pasar y luego disimulan. Tú no disimulas nada, y a las que disimulan eso les jode.',
    ],
    mid: [
      'Te haces las uñas el lunes y el miércoles ya te las has comido, con esmalte y todo.',
      'La compostura te dura hasta la tercera copa. En la cuarta ya estás bailando encima de alguien.', // ROCKSTAR
      'El maquillaje te dura la primera hora. La segunda ya es otra persona, mi niña.',
      'Sales bien de casa y al tercer recado ya vas hecha un cuadro.',
      'Te pintas los labios para salir y vuelves con el pintalabios en el cuello de otra persona.', // ROCKSTAR
      'Hueles de maravilla un rato. Luego el perfume se va y queda lo que te has traído de anoche.', // ROCKSTAR
      'Cruzas las piernas para la foto y las descruzas cuando hay alguien interesante enfrente.', // ROCKSTAR
      'Te compras la crema cara y la usas lo justo para la foto. El resto del bote te mira desde la estantería con culpa.',
      'Aguantas los tacones hasta la segunda canción. En la tercera vas con ellos en la mano y los pies negros, reina.',
      'Hablas bajito en la cena, y cuando la noche ya va larga te oyen desde el portal.',
    ],
    low: [
      'Cero. El grupo te ha imaginado con vestido y ha cambiado de canal, chiquitina.',
      'Un vestido en ti parece un disfraz de carnaval, y hasta el vestido lo nota.',
      'Abres las latas con los dientes y te secas las manos en el pantalón. Delicadeza, la justa para no romper el móvil.',
      'Tu idea de lencería es un sujetador deportivo y unas bragas de cinco por diez euros.', // ROCKSTAR
      'Te intentan quitar la ropa y no saben ni por dónde se abre. Tú tampoco.', // ROCKSTAR
      'Te dan una copa de vino fina y la coges por el cuerpo, con toda la mano. La copa sobrevive de milagro.',
      'Tu rutina de belleza cabe en una frase: ducha, desodorante y a la calle. Y el desodorante, cuando te acuerdas.',
      'Te dicen algo bonito al oído y contestas «¿qué?» a gritos.', // ROCKSTAR
      'Mandas «ok» sin emoji a quien te ha mandado tres corazones, y luego te extraña que no te escriban más.',
      'Para ti seducir es mandar un audio de tres minutos sobre el partido.', // ROCKSTAR
    ],
    extreme: [
      'Entras sin arreglarte y a la de al lado se le jode la tarde entera de la envidia.',
      'Tienes una elegancia natural que da rabia. Las demás lo intentan con tutoriales y no les sale.',
      'Cuando entras, se nota. Cuando te vas, también, y la mitad respira aliviada de no tener que competir.',
      'Tienes una forma de cruzar las piernas que provoca accidentes de tráfico.', // ROCKSTAR
      'Te ven por la calle y se giran, y hay quien se queda con la cabeza girada el resto de la noche.', // ROCKSTAR
      'Hasta cuando mandas a alguien a la mierda te sale femenino, y lo mandas a menudo.',
      'Eres *edición de lujo: no se presta, no se comparte y no se olvida*. Lo saben quienes lo intentaron.', // ROCKSTAR
      'Sabes callarte con clase. Callada dices más que medio grupo hablando, mi niña.',
      'Te sale natural lo que otras ensayan delante del espejo, y lo de la cama, por lo que se oye, también.', // ROCKSTAR
      'Feminidad de la buena. Las demás te envidian a muerte y tú lo disfrutas como una cabrona.',
    ],
  },

  masculinidad: {
    name: 'masculino',
    goodIsHigh: true,
    high: [
      'Arreglas el grifo, cargas la mudanza y no lo cuentas en el grupo. Lo último es lo que más les jode a los demás.',
      'Das la mano firme, y lo demás, dicen, también.', // ROCKSTAR
      'Te peleas con el problema y no con la gente. Por eso los que gritan en el grupo bajan el tono cuando entras, pequeña.',
      'Pides perdón mirando a los ojos y sin audio de cinco minutos. Hay tíos aquí que no lo han hecho en su puta vida.',
      '*Hombre de los de antes: abre botes, cambia ruedas y no se duerme el primero.* Así te anuncian quienes te conocen bien.', // ROCKSTAR
      'Lloras cuando toca y en privado, y vuelves a cargar con todo. El resto del grupo llora en historias.',
      'Tienes una espalda que da para colgarse de ella, y hay quien lo ha hecho.', // ROCKSTAR
      'Cuando la cagas lo dices el primero y lo arreglas antes de que nadie se queje. Así no hay quien te critique, y eso aburre.',
      'Te dan una mala noticia y preguntas qué hay que hacer. Los demás preguntan por qué a ellos.',
      'Cuando dices «ahora voy», vas. En la cama igual, pero sin prisa.', // ROCKSTAR
    ],
    mid: [
      'Vas de duro hasta que hay que serlo. Ahí es donde se cae el numerito y se cae siempre, princesa.',
      'Levantas peso en el gimnasio y no levantas el teléfono para pedir una pizza. Llamar te da más miedo que la barra.',
      'Te mides los bíceps en el espejo del gimnasio, y lo de abajo no te lo mides por si acaso.', // ROCKSTAR
      'Vas de duro y lloras con los anuncios de perros, y luego juras en el grupo que era alergia.',
      'Presumes de aguante en el gimnasio y en la cama te cansas antes del calentamiento.', // ROCKSTAR
      'Hablas de pelearte con cualquiera y cruzas de acera cuando viene un grupo de chavales de quince años, muñeca.',
      'Hablas de las tías que te has ligado, y todas viven en otra ciudad y no tienen Instagram.', // ROCKSTAR
      'Dices que nada te afecta y se te pone el morro si alguien no te felicita el cumpleaños.',
      'Te crees el que manda en casa, y en el grupo de la familia mandas stickers de buenos días con flores.',
      'Vas de que no te asusta nada y te asusta la luz encendida.', // ROCKSTAR
    ],
    low: [
      'Eres la caricatura barata: hablas de huevos y se te caen si una tía te mira fijo. La polla, de adorno.', // ROCKSTAR
      'Tu hombría aguanta en la foto y se deshace en cuanto alguien te lleva la contraria, como tu aguante en la cama.', // ROCKSTAR
      'Hablas como un sargento y vives como un recluta perdido. El disfraz es alquilado y lo devuelves cada puta noche.',
      'Toda tu hombría cabe en una historia. Quitas el postureo y queda un crío pidiendo validación, patético hasta en el audio.',
      'Te compraste una moto grande, un coche grande y un reloj grande. Lo demás no se puede comprar, y se nota.', // ROCKSTAR
      'Dices que no necesitas a nadie. Ya se nota: te apañas solo, y con una mano.', // ROCKSTAR
      'Alfa en el chat y omega en cuanto hay que dar la cara. El disfraz es de mierda y se te cae en la puerta.',
      '*Alfa de catálogo: se monta en cinco minutos y dura dos.* Así te describe quien te ha probado.', // ROCKSTAR
      'Mandas fotos del gimnasio para tapar las que no mandas. Las piden, y no son las del gimnasio.', // ROCKSTAR
      'Se te ve el temblor en cada «yo lo controlo». No controlas ni la frase, y el temblor da vergüenza ajena, pequeña.',
      'Te pasas el día hablando de lo que haces en la cama. La cama no confirma nada.', // ROCKSTAR
      'Dices «yo no pido perdón», pero tampoco das la cara. Mucha frase de inútil y cero huevos cuando toca.',
      'Se te pone dura la pose y blanda la decisión, y la decisión es la única polla que cuenta.', // ROCKSTAR
      'Hablas de tías como un experto y en tu móvil el último «te quiero» es de tu madre.', // ROCKSTAR
      'Sacas pecho y los pies se te van hacia atrás. Ni tu cuerpo se pone de acuerdo contigo.',
      'Hablas de ser hombre cada dos mensajes. Si lo tuvieras claro no te haría falta repetirlo tanto.',
      'Tienes un cajón de condones de la talla más grande, y los compras por orgullo, no por uso.', // ROCKSTAR
      'Mucho pecho de gimnasio, y luego eres el primero en salir corriendo.',
      'Eres muy alfa en la terraza hasta que alguien te contesta. Ahí se te acaba el cuento.',
      'Te tocas el paquete para la foto. Es lo más cerca que va a estar nadie de él este año.', // ROCKSTAR
      'Dices que eres el hombre de la casa. La casa no se ha enterado y el grupo tampoco.',
      'Dices que eres muy hombre y el bot te ha dado esto. Discútelo con él, que con la gente no te atreves.',
      'Presumes de que te van las mujeres de carácter. Las de carácter dicen que tú no.', // ROCKSTAR
      'Te crees el alfa y te dejan en visto. Así de alfa eres.',
      'Bájate del cuento, que el tío duro de la historia nunca fuiste tú, ni en tus putos sueños.',
    ],
    extreme: [
      'Tienes una voz que hace que el camarero te mire a ti para cobrar, y en este grupo más de uno lleva años esperando esa mirada.',
      'Tienes unas manos que el grupo mira de reojo, y más de una persona se ha imaginado para qué.', // ROCKSTAR
      'Tienes una espalda que no cabe en las fotos de grupo, y te toca salir siempre detrás y con la cabeza cortada.',
      'Cuando llegas a una discusión, la discusión se acaba. No hace falta ni que abras la boca, y eso acojona.',
      'Eres el tío al que llaman cuando se les jode el coche, y alguna vez para otras averías.', // ROCKSTAR
      'Te mira un perro rabioso y se sienta. Te mira un borracho con ganas de bronca y se pide un agua.',
      'Te miran la espalda al pasar, y luego bajan la vista un poco más.', // ROCKSTAR
      'Tus amigos te llevan a casa de sus padres para quedar bien. Tú eres la referencia, y ellos, el ejemplo de lo que no.',
      'Aguantas lo que a otros les manda al psicólogo, y encima te ríes. Eso da un poco de miedo.',
      'Cuando subes la voz se callan todos, y cuando la bajas hay quien se pone nerviosa.', // ROCKSTAR
    ],
  },

  // ===== NEGATIVOS =====

  gay: {
    name: 'gay',
    goodIsHigh: false,
    high: [
      'Sales del armario cada vez que hablas, y luego vuelves a entrar corriendo a apagar la luz. El esfuerzo de fingir te está envejeciendo el doble.',
      'Tu heterosexualidad es una coartada con más agujeros que tus argumentos. Nadie la investiga porque el caso está cerrado hace años.',
      'Hetero de día, búsquedas de incógnito de noche. Tu historial sabe la verdad que tu boca lleva años negando.',
      'Guardas un audio de un tío y te lo pegas a la oreja en el baño, con el agua puesta. No sales hasta que acaba, y el agua ya va fría, joder.',
      'El grupo entero hizo las paces con tu verdad antes que tú. Eres el último invitado en enterarte de tu propia fiesta.',
      'Tu armario ya tiene wifi, nevera y dirección postal. A este ritmo vas a pagar comunidad de vecinos antes que aceptarlo.',
      'Te delatas en cada gesto, cada audio y cada \'qué guapo está ese cabrón\'. La evidencia es tanta que ya ni cuenta como secreto.',
      'Hablas de mujeres como quien repasa apuntes antes del examen: memorizado, sin pasión y rezando para que no haya preguntas.',
      'Tus playlists, tus gestos y tu manera de sentarte ya votaron. El recuento es unánime y tú sigues pidiendo repetir las elecciones.',
      'Llevas una vida entera de método Stanislavski haciendo de hetero. El Óscar no llega porque el público dejó de creérselo en el primer acto.',
      'Cada vez que pasa un tío en forma se te resetea la conversación. Luego sigues hablando de tetas con la convicción de un rehén.',
      'Analizas el físico de tus amigos con un detalle que ninguna revista hetero ha logrado nunca. Eso no es observación, es apetito.',
      'El \'es broma\' que añades después de cada comentario es el ladrillo número mil de un armario que construyes tú solo.',
      'El sticker de te quiero bro lo tienes anclado, cabrón, y el bro ya cambió de chat.',
      'Cuando cae una foto de gimnasio en el grupo, tu visto tarda un segundo de más. El segundo es el parte, joder.',
      'En el bar el cuello te gira y la copa se queda a medias. La copa no era el motivo, coño.',
      'Defiendes a un cantante con un calor que no le has puesto a ninguna tía del chat. El calor no miente, joder.',
      'Has dicho eso es de maricones más veces que nadie. Esa frase es la careta del cabrón que más la necesita: tú.',
      'Tienes un mejor amigo con el que nadie más queda. El resto ya hizo las cuentas, joder.',
      'En la despedida de soltero miraste al sitio equivocado, cabrón, y el sitio te devolvió la mirada.',
      'Cuando alguien dice está bueno tú corriges la gramática. Ridículo: la gramática no era el tema.',
      'Te has aprendido los nombres de los futbolistas por el físico, cabrón, y la alineación no se estudia así.',
      'Te ríes de los gays del grupo con un calor de quien se está viendo. El espejo está en el chat, joder.',
      'Guardas capturas para el grupo que nunca mandas. Lo ridículo no es guardarlas: es que nadie te las pidió.',
      'Bebes y se te cae el personaje en el sofá. Se te va la mano al muslo de al lado y no la quitas, coño, aunque te estén mirando.',
    ],
    mid: [
      'Tienes una energía bisexual que no admites ni bajo tortura. Como esos cabrones que dicen que solo fue una vez y llevan tres temporadas repitiendo.',
      'El grupo lleva un rato con la teoría de que te molan las poyas pero no tienes cojones de probarlo. Menudo cobarde de mierda.',
      'Bisexual en prácticas pero sin contrato fijo. Haces los cursillos los fines de semana cuando nadie del grupo mira.',
      'Mierda, cada vez que alguien pone un tío bueno en el grupo tú eres el primero en comentar. Los heteros pasan, tú analizas como un jodido sommelier.',
      'Te queda aquella noche en la cara cuando el tema roza. Miras el fondo del vaso, gilipoyas, y cambias de conversación un latido tarde.',
      'Mierda, tus defensas cuando alguien te llama gay son tan elaboradas que parecen un puto TFG. Los inocentes no preparan alegatos.',
      'Joder, no sales gay pero sales lo suficientemente ambiguo como para que tu madre se pregunte si tendrá nietos.',
      'No sales cerrado del todo, gilipoyas. Te ríes el chiste, se te va la mirada y pides otra copa para tapar el silencio.',
      'Puta madre, tienes la capacidad de detectar si un tío va al gimnasio con solo verle la espalda. Ese superpoder no viene de serie en los heteros.',
      'Hostia, no digo que seas gay pero si te dieran a elegir entre una tía buena y un masaje de un tío con manos grandes, lo piensas demasiado.',
    ],
    low: [
      'Hablas sin poner un aviso por delante. Al que vive aclarándose se le queda el aviso en la boca, y se le ve el asco de no poder soltarlo.',
      'La mirada no se desvía. Pasa un tío en forma y sigues en la frase.',
      'Sobre ti no hay teoría montada. Quien vive de eso se queda sin frase y remueve el hielo del vaso hasta que suena.',
      'Hablas de tus colegas como se habla de colegas. Sin catálogo.',
      'No entras al armario a apagar la luz porque no has salido. No había puerta.',
      'Tu "soy hetero" no necesita testigos. Los que lo necesitan, lo repiten.',
      'No analizas el físico de tus amigos. Los heteros no hacen recuento.',
      'No ensayas. No recitas. No te delata el cuello.',
      'Nadie ha montado un hilo sobre ti. Los hilos se montan cuando hay material.',
      'No votas en las elecciones que el resto está contando. Ni te has enterado de la urna.',
    ],
  },

  simp: {
    name: 'simp',
    goodIsHigh: false,
    high: [
      'Llamas \'lealtad\' a arrastrarte y \'paciencia\' a que te ignoren. Ese diccionario es de pringado, y lo usas todos los días.',
      'Eres el plan C de su plan B: te llaman para montar muebles, y para lo otro llaman a otra persona.', // ROCKSTAR
      'Pagas la cena, el taxi y la suscripción, [nombre], y lo único que te llevas a casa es el ticket.', // ROCKSTAR
      'Llevas años pagando cenas a quien luego se va a casa con otra persona. Tú pagas el postre y se lo comen en otra casa.', // ROCKSTAR
      'En esa relación te buscan cuando les falta algo y el resto del tiempo ni te miran. Eres el recambio, cabrón, y lo agradeces.',
      '*Suscripción premium: todo lo que pagas y nada de lo que imaginas.* Lo pone en el perfil que tanto miras.', // ROCKSTAR
      'Le das «me gusta» a sus fotos de playa a las tres de la mañana y luego dices que es por apoyar.', // ROCKSTAR
      'Eres el sitio cómodo al que se vuelve cuando lo demás falla, y dejas la puerta abierta. Así se trata a un felpudo, joder.',
      'Te dejan tocar la mano y ya buscas nombre para los hijos.', // ROCKSTAR
      'Lo más cerca que has estado de su cama es llevarle sopa cuando tenía gripe. Y te la devolvió fría.', // ROCKSTAR
      'Llevas años poniendo tú toda la iniciativa. Si paras, aquello se muere en una semana. Y lo sabes, cabrón, por eso no paras nunca.',
      'Te cuenta sus polvos con otra gente y tú, en vez de irte, le das consejos.', // ROCKSTAR
      'Lo das todo desde el minuto uno: la canción dedicada, el regalo y el «te echo de menos» el segundo día. Así no te dura nada, reina.',
      '[nombre], te limpian los pies encima y tú preguntas si ha quedado bien.',
      'Te tiene de amistad con derecho a nada: ni a roce, ni a cama, ni a una respuesta antes de las doce.', // ROCKSTAR
      'Te pide que le sujetes el abrigo mientras se lía con otra persona, y tú lo sujetas con orgullo.', // ROCKSTAR
      'Eres el segundo plato que llega puntual cuando lo llaman, [nombre]. Y ni siquiera plato: sobras recalentadas que se comen cuando no queda otra cosa.',
      'Le escribes «buenas noches» todas las noches, [nombre], y todas las noches se va a dormir con alguien que no eres tú.', // ROCKSTAR
      'Cuando te rechazan, empujas más fuerte, [nombre]. Llevas años empujando una puerta que se abre hacia fuera.',
      'Pides otra oportunidad justo después de gastar la última, [nombre], y la pides con esa voz.',
      '[nombre], tu dignidad se negocia cada vez que alguien te hace caso, y siempre la vendes barata.',
      'Celebras un «vale» como si fuera una declaración, [nombre]. Cuatro letras y tú ya montando la boda.',
      '[nombre], te dejan en visto tres días y tú contestas a los tres segundos. Esperanza de pringado.',
      '[nombre], cuando te descartan dices que solo quieres que sea feliz, y haces el duelo en público.',
      'Tu historial de pagos cuenta tu vida sexual mejor que tu cama: donaciones, regalos y ni un roce.', // ROCKSTAR
    ],
    mid: [
      'Contestas al momento, te contestan cuando les da la gana, y la conversación la sigues tú como si nada.',
      'Todavía no pagas cenas ajenas, pero ya sabes la talla de ropa interior de quien no te escribe nunca.', // ROCKSTAR
      'Tienes un chat fijado arriba del todo, y en ese chat el último mensaje siempre es tuyo, pequeña.',
      'Das likes de madrugada a fotos viejas. No has escrito todavía, pero el dedo ya te ha delatado.',
      'Dices que pasas de esa persona y miras su última conexión. Pasas, sí, pero por su perfil.',
      'Te dejan en visto y mandas una foto «sin querer». Sin querer, sin camiseta y con la luz buena.', // ROCKSTAR
      'Aún te queda algo de orgullo: esperas cinco minutos antes de contestar, con el móvil en una mano y la otra ocupada.', // ROCKSTAR
      'Cambias de planes en cuanto alguien a quien le das igual dice que a lo mejor se pasa. Y te quedas esperando.',
      'Escribes un párrafo, lo borras y mandas «jaja». Lo que de verdad querías mandar era una foto, y también la has borrado.', // ROCKSTAR
      'Le haces favores a quien solo te escribe para pedirlos, y todavía te extraña que no te escriba para otra cosa.',
    ],
    low: [
      'No has escrito dos veces seguidas en tu puta vida. Tanto orgullo que tu madre se entera de tus cosas por las historias.',
      'Contestas cuando te sale de los huevos, si contestas. Dignidad intacta, y la gente que te escribe ya se ha acostumbrado a hablar sola.',
      'Nadie te ha visto pagar una cena para impresionar. Tampoco te ha visto nadie pagar una cena, pequeña.',
      'Cuando alguien pasa de ti, tú pasas el doble, y esa noche ya estás en otra cama.', // ROCKSTAR
      'Sabes decir que no a la primera, y también que sí, y lo segundo lo dices más de lo que se cuenta.', // ROCKSTAR
      'Nunca has cambiado un plan por alguien que no lo cambiaría por ti. Eso te deja muchos findes libres, y los pasas sin quejarte.',
      'Nunca has mandado un «buenos días» a quien no te lo mande primero. Orgullo de hierro, y una lista de gente que se cansó de esperar.',
      'Tus mensajes van sin un solo corazón, y aun así te escriben de madrugada.', // ROCKSTAR
      'Si alguien se pone raro contigo, no preguntas: lo borras y te buscas otra persona antes de cenar.', // ROCKSTAR
      'Nadie consigue tenerte pendiente del móvil. Tú tienes a otros pendientes, y te encanta, mala persona.',
    ],
  },

  rata: {
    name: 'rata',
    goodIsHigh: false,
    high: [
      'Te acuestas con quien te conviene y al día siguiente cuentas los detalles en otro grupo. El polvo dura menos que el chisme.', // ROCKSTAR
      '*Servicio completo: te come la oreja, te come lo que haga falta y luego lo cuenta.* Así te anuncian, [nombre].', // ROCKSTAR
      'Tu amistad tiene precio, [nombre], y encima es barato. Eso es lo más humillante de todo: vendiste a gente por una mierda que ni te salió bien.',
      '[nombre], tu forma de acercarte a alguien nuevo es advertirle sobre los demás. Siempre igual. Sembrar mierda antes de que nadie pueda contar la tuya.',
      '[nombre], te arrimas a quien gana justo después de que gane, como quien se arrima a quien liga para quedarse con lo que sobra.', // ROCKSTAR
      'Eres basura con timing impecable, [nombre]. Guardas las capturas guarras de todo el mundo, esperas el momento y las sueltas cuando más duele.', // ROCKSTAR
      '[nombre], mides la amistad en favores cobrados. Rata con contabilidad, columna de dar a cero y una cara de escoria cuando toca devolver.',
      'Cada secreto que te cuentan lo guardas como quien guarda billetes, esperando a que suba el precio. Archivo de mierda ajena, listo para vender, pequeña.',
      'Subes cuando otro cae, nunca por mérito. Pisar cuellos lo llamas carrera, cabrón, y ni así llegas a ningún sitio.',
      'Tienes el móvil lleno de capturas y de nudes ajenas, [nombre], y las dos cosas las usas igual: cuando más daño hacen.', // ROCKSTAR
      'Te metes en la cama de dos que se odian para saber qué dice cada uno del otro. Espionaje con orgasmo fingido.', // ROCKSTAR
      'Fingir es lo tuyo, [nombre]: finges amistad, finges sorpresa y, por lo que se cuenta, finges en la cama.', // ROCKSTAR
      'Consuelas por la mañana y lo cuentas por la tarde, con los detalles que te dieron llorando.',
      'Te ofreces a guardar secretos como quien se ofrece a guardar condones: para usarlos cuando le convenga.', // ROCKSTAR
      '[nombre], guardas capturas de conversaciones de hace años por si algún día sirven. Todo el grupo lo sabe.',
      '[nombre], apareces cuando alguien está débil, sacas lo tuyo y te largas antes de que se ponga fea la cosa.',
      'A tus espaldas te llaman «dos bocas», [nombre]: una para chismorrear y otra para lo que surja.', // ROCKSTAR
      'Nunca sueltas un secreto por torpeza, [nombre]: lo sueltas cuando más destrozo hace.',
      'Entras en casa del primero que te cuenta un secreto, [nombre], y sales con dos: el suyo y lo que viste en su cama.', // ROCKSTAR
      'Te arrimas al que manda con la misma cara con la que te arrimas en la discoteca, [nombre]: a ver qué roce te toca.', // ROCKSTAR
      '[nombre], te sabes el PIN del móvil de medio grupo y nadie recuerda habértelo dado.',
      'Tu forma de mantener la paz es que nadie tenga la foto completa, [nombre]. Tú sí la tienes, y la usas.',
      '[nombre], avivas los conflictos desde fuera y luego llegas con la manguera y cara de bombero.',
      '[nombre], te acuerdas al céntimo de lo que te deben y te olvidas de lo que debes en cuanto sales por la puerta.',
      'Tu lealtad dura lo que un calentón, [nombre]: mucho ruido, dos minutos y a por el siguiente.', // ROCKSTAR
    ],
    mid: [
      'Callas los secretos hasta la tercera copa. A partir de la cuarta los cuentas con nombre y apellido.',
      'Guardas capturas por si acaso. Todavía no las has enseñado, pero la carpeta ya tiene nombre, chiquitina.',
      'Contigo la gente aprende a no contarte con quién se acuesta, porque al día siguiente lo sabe hasta el portero.', // ROCKSTAR
      'Te enteras de algo y aguantas hasta el día siguiente. Luego lo cuentas empezando por «no digas que te lo he dicho yo».',
      'Estás en las dos conversaciones de la bronca, y en las dos camas cuando se arreglan.', // ROCKSTAR
      'Devuelves lo que te prestan, pero la mitad, un mes tarde y con cara de estar haciendo un favor.',
      'Cuando toca dar la cara en el grupo, mandas un audio que no dice nada. Lo jugoso lo cuentas en privado y con detalles de cama.', // ROCKSTAR
      'Pagas tu parte de la cena calculada al céntimo y sin propina, y luego te comes el pan de todos, pequeña.',
      'Das la razón en privado, y en privado das también otras cosas que en el grupo no se cuentan.', // ROCKSTAR
      'Tienes el móvil lleno de audios que nadie te dio permiso para reenviar. De momento, los mandas a una sola persona.',
    ],
    low: [
      'Cero. No tienes ni una mancha, y mira que oportunidades has tenido.',
      'Te cuentan secretos y no se te escapa ninguno. Eso asusta, porque nadie sabe qué más te callas.',
      'Pagas rondas sin llevar la cuenta, y de lo que pasa en tu cama tampoco llevas la cuenta en voz alta, que es lo elegante.', // ROCKSTAR
      'Cuando hay bronca, dices lo que piensas delante de los dos. Te ganas enemigos, pero de frente.',
      'Nunca has hecho una captura para enseñarla, ni de las fotos que te mandan de madrugada. Eso tiene mérito.', // ROCKSTAR
      'Si te dejan las llaves de casa, riegas las plantas y no abres un cajón. Hay gente aquí que no pasa esa prueba ni con cámaras.',
      'Cuando te la juegan, no te vengas ni lo cuentas. Buena gente de verdad, y por eso te la juegan tanto.',
      'Lo que te cuentan de noche se queda en la noche, y lo que haces de noche también.', // ROCKSTAR
      'Defiendes a quien no está delante aunque no te caiga bien. Ahora nadie sabe cómo criticar a gusto contigo en el chat, pequeña.',
      'Eres leal hasta cuando no toca, también con quien te acuestas, y aquí eso es una especie protegida.', // ROCKSTAR
    ],
  },

  maricon: {
    name: 'maricón',
    goodIsHigh: false,
    high: [
      'La polla ajena le marca el calendario a [nombre]. El resto de su vida es el hueco entre una y la siguiente.',
      'Patético de manual: [nombre] ni pide que le quieran, pide que le usen, y se ofende si le dejan de pie.',
      'El grupo ya no pregunta qué es [nombre]. Pregunta de quién es esta semana, y la respuesta da asco.',
      'Vergüenza ajena con nombre propio. [nombre] se arrodilla antes de que terminen la frase y luego finge que fue un tropiezo.',
      '[nombre] lleva el cuello cansado de tanto mirar hacia arriba. No es estatura. Es oficio. Y es una mierda de oficio.',
      'Polla entra, dignidad sale. [nombre] hace el cambio tantas veces al día que ya ni registra el inventario.',
      'Inútil de pie, especialista de rodillas. [nombre] encontró su techo y lo besó. Literal.',
      '[nombre] da asco de tan previsible. Un hombre entra al chat y él ya está calculando el ángulo de la mandíbula.',
      'Fracasa como persona y triunfa como recipiente. [nombre] llama a eso "ser útil". El grupo lo llama por su nombre.',
      'La miseria de [nombre] no es económica. Es esa forma de pedir con los ojos lo que no se atreve a pedir con palabras.',
      'A [nombre] le da vergüenza mirar a los ojos, no por educación: porque los ojos no están a la altura a la que vive.',
      'Coño, [nombre]: un "gracias" le dura tres segundos y un "abre" le dura la noche. Prioridades de basura.',
      'El puto reflejo de [nombre] es abrir. Una puerta, una cremallera, la boca. Tres aperturas, una sola profesión.',
      'A [nombre] le cabe una polla y no le cabe un no. El segundo lo tiene atrofiado. El primero, entrenado.',
      'Vergüenza con nombre: [nombre] sale del baño con las rodillas rojas y una sonrisa. Nadie pregunta. Todos saben.',
      'Polla va, [nombre] viene. Es la única puntualidad de su vida. Al resto llega tarde. A esto, corriendo.',
      'El ridículo de [nombre] ya no sorprende. Sorprende que todavía finja que "era otra cosa". Con la boca llena.',
      'Coño, si [nombre] pusiera esa boca a decir que no, sería otra persona. La pone a otra cosa. Por eso es esto.',
      '[nombre] hace de hombre cuando hay público y de puto servicio cuando hay puerta. La puerta gana siempre.',
      'La miseria de [nombre] se oye: ese "mm" de fondo cuando cree que nadie está. Alguien está. Siempre.',
      'Joder, [nombre] hasta en broma se agacha. El cuerpo le gana al chiste. El chiste ya era él.',
      '[nombre] se ofende si le dicen maricón y se pone duro si se lo dicen bajito. El mapa está claro. El puto mapa.',
      'Patético al cuadrado: [nombre] se humilla y luego cuenta la versión donde "estaba ayudando". Nadie compra esa mierda.',
      '[nombre] tiene la mirada de quien busca cinturón, no ojos. Se le pilla al segundo. Se le usa al tercero. Se le olvida al cuarto.',
      'Si [nombre] cerrara esa boca un día, el grupo notaría el silencio y nadie lo extrañaría. Extrañarían el chiste. Que es él.',
    ],
    mid: [
      'A [nombre] se le cierran las piernas y a mitad se acuerda de abrirlas. El grupo lo ve, aparta la vista, y el gesto se queda colgando.',
      'Se le va la mano al cuello a [nombre] cuando entra un tío, y busca un collar que no lleva. El dedo se queda en la piel, y no hay collar.',
      '[nombre] dice una cosa en el grupo y la contraria en el privado. El privado se le escapa en una captura, se le pone la cara blanca y borra tarde.',
      'Si [nombre] fuera tan macho como dice, no necesitaría decirlo cada tres mensajes. La insistencia es la peor publicidad.',
      '[nombre] cree que nadie se ha dado cuenta. Se ha dado cuenta hasta la persona que acaba de entrar al grupo hace diez minutos.',
      'Lo de [nombre] no está confirmado oficialmente, pero si fuera una apuesta, la casa ya habría cerrado las cuotas por lo bajo.',
      'Alguien pilla el mensaje de [nombre] antes del arreglo. Llega la versión limpia encima, y el pegote de antes se sigue viendo.',
      'Lo que [nombre] llama "broma" a veces se parece demasiado a algo que no es broma. Y él se ríe un segundo antes de lo normal.',
      'Cada mensaje de [nombre] sobre ciertos temas suena a borrador editado seis veces. La espontaneidad no es su fuerte en esa zona.',
      'En el mismo audio [nombre] empieza con la voz forzada y acaba flojo. El corte se oye, y nadie le pide que lo vuelva a grabar.',
    ],
    low: [
      '[nombre] cuenta lo suyo y no se le escapa un gesto. Alguien borra el mensaje que ya tenía escrito y se guarda el teléfono.',
      'Coge el vaso como cualquiera, [nombre], y ahí se acaba la función. Quien vino a cazar un gesto lo suelta, y el vaso golpea la mesa.',
      'Sale limpio y la carpeta del grupo se queda sin ficha. Quien la había abierto la cierra, y el golpe de la tapa se oye.',
      'Aguanta el tema de frente, [nombre], y no se le tuerce la boca. Los que esperaban el quiebro bajan la vista al plato y se ponen a cortar.',
      'Con [nombre] el tema no encuentra por dónde. Remueven el hielo, lo dejan, y a alguien se le queda la boca abierta sin el chiste.',
      'Recorren a [nombre] de la cara a los zapatos y vuelven sin una pieza. El que había prometido material se lo traga con el vino, y el trago le baja torcido.',
      'Nada. [nombre] podría pasar un detector de masculinidad sin despeinarse. Aburrido pero efectivo.',
      'Con la broma pesada, [nombre] no se quiebra. Al que sí se le quiebra se le ve el cuello, y se sube la chaqueta hasta la oreja.',
      'La risa de [nombre] se acaba y no hay otra detrás. La que sobra se le queda al de enfrente, sonando sola.',
      'Oye el chiste, [nombre], y no lo empuja. Quien lo empuja se escucha, y se le apaga la voz antes de acabar.',
    ],
  },

  friki: {
    name: 'friki',
    goodIsHigh: false,
    high: [
      'Nivel 100 en el juego, nivel tutorial en la vida. Años farmeando logros en el único sitio donde nadie te conoce: currículum de pringado.',
      'Tu manera de ligar es esperar a que alguien mencione tu juego. Nunca pasa, y lo único que te pone es la pantalla de carga.', // ROCKSTAR
      'De sexo te sabes la teoría, los mods y los atajos de teclado, y sigues sin pasarte el tutorial.', // ROCKSTAR
      '*Tu cuarto: el único servidor donde no ha entrado nadie más que tú.* Ni en cooperativo.', // ROCKSTAR
      'El único cuerpo que has tocado con ganas venía en caja, con peana y edición limitada.', // ROCKSTAR
      'Tienes el navegador en modo incógnito desde 2015, y aun así se te nota en la cara lo que ves.', // ROCKSTAR
      'Llevas años en la misma silla hundida y ya no se sabe dónde acaba la silla y empieza el gilipoyas.',
      'Te sabes el parche de memoria y no has visto un cuerpo sin ropa fuera de un mod.', // ROCKSTAR
      'Tu waifu no existe, [nombre], tu rank no paga facturas y tus figuras te miran con la misma decepción que tu familia. Decorado de un cuarto de mierda.',
      '[nombre], tienes el cuarto lleno de cajas sin abrir. Compras para tapar un hueco y el hueco sigue igual: consumo de pringado, hueco intacto.',
      'Eres quien confunde tener comunidad con tener gente que le importe, [nombre]. Nadie de ahí iría a tu entierro, cabrón. Ni sabrían la fecha.',
      '[nombre], la mitad de tus frases empiezan con un dato que nadie pidió. Asienten, cambian de tema y te dejan con el lore en la boca y cara de ridículo.',
      'Cuando dices «me he pasado la noche dándole», en el grupo ya saben que hablas del mando.', // ROCKSTAR
      'Tu waifu recibe más caricias que cualquier persona que conozcas: la limpias con un paño cada domingo.', // ROCKSTAR
      'Lo más húmedo que te ha pasado este año es la pasta térmica.', // ROCKSTAR
      'Llevas una vida entera en un juego que se reinicia cada temporada. En ese tiempo otra gente ha aprendido un idioma.',
      'Te pones los cascos para que no te oigan, y no siempre estás jugando.', // ROCKSTAR
      '[nombre], sabes el lore de doce universos y no aguantas tres minutos de conversación con alguien que no lo sepa.',
      '[nombre], sales de casa para ir a un salón del manga y vuelves con tres bolsas y ningún teléfono.',
      '[nombre], dices que no tienes tiempo para ligar. Tienes trescientas horas en un juego de citas.', // ROCKSTAR
      'Tu escritorio tiene vasos viejos, latas vacías y una lámpara RGB que no se apaga. Ahí no entra ni tu madre, princesa.',
      '[nombre], el único lubricante que conoces es el de los sticks del mando, y lo compras por litros.', // ROCKSTAR
      'Te enfadas porque nadie valora tu afición, [nombre]. Nadie te la ha pedido, y encima te toca explicar quién es cada personaje.',
      '[nombre], tu única anécdota del mes pasó dentro de una partida, y para contarla hay que explicar quince cosas antes.',
      '[nombre], tu ropa es merchandising y tu conversación también. Te quitas la camiseta y te quedas sin tema.',
    ],
    mid: [
      'Ligas, pero tu primera cita acaba siempre con cuarenta minutos sobre una saga, y la segunda no existe.', // ROCKSTAR
      'Puedes mantener una conversación normal durante un rato. Luego se nota de dónde vienen tus referencias.',
      'Sales, sí, pero con cuentagotas y mirando el reloj para volver a la cueva.',
      'Sales poco, y cuando ligas te entran tantos nervios que pides pausa como en el juego.', // ROCKSTAR
      'Cuando te enganchas a algo desapareces semanas. La última vez que te enganchaste a una persona duró menos que una partida.', // ROCKSTAR
      'Cancelas planes por un parche del juego y lo cuentas como si fuera un entierro.',
      'Hablas normal en la cena hasta que alguien nombra una saga. Ahí te sale el párrafo, y la cena se acaba.',
      'Tienes vida fuera, pero la cuadras con los estrenos de temporada y los eventos del juego.',
      'Tus historias, si subes alguna, son capturas de madrugada. Las otras capturas de madrugada no las ve nadie.', // ROCKSTAR
      'Tienes amigos de carne y hueso y amigos de Discord, y a los de Discord les cuentas más cosas, muñeca.',
    ],
    low: [
      'Cero. Tu tiempo libre incluye personas de verdad. En este grupo eso es casi exótico, mi niña.',
      'Cero. Tienes vida social de verdad y gente en tu cama que no sale de un juego.', // ROCKSTAR
      'Sin señales. Tu vida pasa lejos de una pantalla, y por eso tienes anécdotas que no se pueden contar en este grupo.', // ROCKSTAR
      'Sin rastro. Sabes cuándo tu tema interesa y cuándo cortarte, cosa que aquí no sabe todo el mundo.',
      'Cero. Tienes amigos que conoces en persona y con cara. Te va a costar entender la mitad de los chistes del grupo.',
      'Nada. Te hablan de una serie y dices que no la has visto, porque esa noche tenías mejor plan en casa.', // ROCKSTAR
      'Sin señales. Sales, vuelves de día y no sabes qué trae el parche nuevo. Tu vida es más sana y más aburrida de contar, chiquitina.',
      'Nunca has cancelado un plan por una partida, y por un plan en la cama sí, que es lo que se hace.', // ROCKSTAR
      'Hablas de cualquier cosa sin llevarla a un anime. La gente lo agradece, y el friki del grupo te mira mal.',
      'Tu habitación tiene cama, armario y ventana, y ni una figura en una estantería. El grupo no sabe qué regalarte por tu cumpleaños.',
    ],
  },

  cerdo: {
    name: 'cerdo',
    goodIsHigh: false,
    high: [
      'En los platos de tu cuarto hay cosas vivas que ya pagan alquiler. Huele a mierda vieja.',
      'Tu higiene es un rumor que nadie ha confirmado, y nadie se ha acercado lo bastante para confirmarlo, ni con ganas.', // ROCKSTAR
      'Tu ropa se divide en sucia y menos sucia. La lavadora te tiene bloqueada, y el montón «menos sucia» sigue dando asco.',
      '*Aroma de la casa: sudor, fritanga y lo que hiciste anoche sin ducharte.*', // ROCKSTAR
      'Comes cualquier cosa sin mirar fecha, aspecto ni olor. Tu estómago se rindió, y el plato da asco antes de llegar a la boca.',
      'Tus sábanas llevan tanto sin cambiarse que guardan la forma de cada polvo del año. Pocos, pero bien marcados.', // ROCKSTAR
      'Tienes la basura repartida por todo el cuarto, cada montón en su rincón. Da asco nada más abrir la puerta.',
      'Quien se acuesta contigo se ducha antes de irse, y no por ti: por la gente del autobús.', // ROCKSTAR
      'Te quitas los calcetines y el ambiente se va solo. Quien estaba en tu cama se va detrás.', // ROCKSTAR
      'Contigo los preliminares empiezan con una ducha obligatoria, y casi siempre acaban ahí.', // ROCKSTAR
      'Tienes olor a fritanga incrustado en la ropa, y quien te la quitara lo olería también debajo. Nadie te la quita.', // ROCKSTAR
      'Tu colchón está lleno de manchas, y tú presumes de cada una como si fueran medallas.', // ROCKSTAR
      'Te huele el cuello, el sobaco y lo de más abajo, [nombre], y aun así te extraña que nadie baje.', // ROCKSTAR
      'La ropa interior la cambias cuando cambia la estación, y lo nota quien te la quita.', // ROCKSTAR
      'Tienes cepillos de dientes viejos criando al lado del que usas, [nombre], y no sabrías decir cuál es el de hoy.',
      'Hueles a gimnasio sin haber ido nunca. Lo único que sudas es el sofá viendo cosas que no se cuentan.', // ROCKSTAR
      'Tienes restos en las comisuras y sigues hablando de frente. Es difícil concentrarse en el tema.',
      'Tus toallas han visto cosas, [nombre], y ninguna era agua.', // ROCKSTAR
      '[nombre], comes con la boca abierta, hablas con la boca llena y te limpias en el sofá. El manual de modales existe por gente como tú.',
      'Eres una vergüenza andante, [nombre]. La gente entra a tu cuarto y le da el pésame a los muebles. Hasta las moscas hacen turnos para salir a respirar.',
      'Eres quien deja la comida fuera y se la come igual, [nombre]. Tu estómago ha procesado cosas que un buitre rechazaría.',
      '[nombre], el día que limpies tu cuarto van a aparecer cosas que dabas por perdidas, incluida tu dignidad y dos mandos de consola.',
      '[nombre], tu cepillo de dientes está amarillo por dentro y lo guardas al lado del váter, sin tapa.',
      '[nombre], el olor llega antes que tú a cualquier sitio. La gente sabe que has entrado sin girarse, y abre la ventana.',
      '[nombre], guardas los tuppers con comida vieja en la nevera hasta que se mueven solos, y entonces los tiras con tupper y todo.',
    ],
    mid: [
      'Te duchas por compromiso, no por convicción. Se nota en la cara de quien te da dos besos.',
      'Tu cuarto tiene zonas que llevan meses sin ver la luz, y la cama es la que menos visitas recibe.', // ROCKSTAR
      'Te duchas los días que sales. Los días que no sales, tu cuarto lo nota y tu silla también.',
      'Tu cuarto está ordenado en la parte que sale en las videollamadas. Por eso las calientes las haces de cintura para arriba.', // ROCKSTAR
      'Cambias las sábanas cuando alguien va a dormir contigo, o sea, muy de vez en cuando, pequeña.', // ROCKSTAR
      'Te lavas las manos después de mear si hay alguien mirando.',
      'Tienes una silla que hace de armario, y encima, la ropa interior de varias noches que no quieres recordar.', // ROCKSTAR
      'Vacías la papelera cuando ya se desborda, y alrededor tienes el suelo lleno de lo que no cupo.',
      'Hueles bien al salir, y al volver ya se te nota el día entero.',
      'Tu cepillo de dientes tiene las cerdas abiertas hacia fuera, y lo sigues usando porque según tú aún limpia, princesa.',
    ],
    low: [
      'Sin manchas. Tu ropa huele a limpio y tus sábanas también, que es lo máximo que te va a pasar esta semana.', // ROCKSTAR
      'Nada que reprochar. Te lavas como una persona normal, cosa que aquí no todos pueden decir.',
      'Cero. La gente entra en tu casa y se sienta sin mirar antes dónde. Tu sofá es el único del grupo sin historial, muñeca.',
      'Sin rastro. Si compartieras piso, nadie dejaría notas en la nevera por tu culpa. Eso en este grupo es noticia.',
      'Nadie ha tenido que cambiarse de asiento por tu olor, y quien se sienta a tu lado se arrima más de la cuenta.', // ROCKSTAR
      'Tu baño se puede enseñar sin avisar. Hay gente aquí que cierra la puerta con llave cuando tiene visita.',
      'Hueles a suavizante hasta en agosto, y hay quien se queda oliendo tu almohada cuando te vas.', // ROCKSTAR
      'Tienes las uñas cortas, la toalla seca y la nevera sin cosas vivas. Aburres, pero se puede comer en tu casa.',
      'En tu casa se puede abrir cualquier cajón sin miedo. Lo que da miedo es lo ordenados que están.',
      'Te duchas antes de dormir y al levantarte, y a veces con compañía, que es la manera más limpia de ducharse.', // ROCKSTAR
    ],
  },

  femboy: {
    name: 'femboy',
    goodIsHigh: false,
    high: [
      'Tus calcetines hasta el muslo no tapan lo evidente: debajo del programa cute hay un tío promedio huyendo de sus problemas con eyeliner.',
      'Juegas al disfraz y ni el filtro de Snapchat puede con esa mandíbula. Eres cosplay de fantasía con físico de realidad.',
      'Quieres el mimo y mandas la foto. Alguien suelta una risa corta, seca, y el chat se queda con esa risa en vez del mimo.',
      'Tu estética dice \'protégeme\' y tu vida dice \'huye\'. Ni los más desesperados del server caen ya en tu trampita de uwu.',
      'Faldita, medias y autoestima en números rojos. El outfit te costó más que cualquier logro de tu vida entera.',
      'Eres la versión beta de una e-girl y la versión fallida de un hombre. Doble fracaso con lacito rosa.',
      'Tu \'uwu\' suena a grito de auxilio con filtro de voz. Detrás del personaje hay alguien que no se aguanta ni a sí mismo.',
      'Quieres headpats y necesitas terapia. El orden de tus prioridades te delata más que la faldita.',
      'Tu sueño es que te hablen dulce y lo más cerca que estuviste fue el spam de un casino online.',
      'Quieres el gesto fino y se te cae el vaso. Lo recoges con la muñeca doblada, se te ve el antebrazo, y el cuento se acaba en el suelo.',
      'Cuelgas la foto, tres corazones, y dos te los pones tú desde el otro móvil. Ese móvil está en la misma mesa, al lado del plato.',
      'Ni las apps de citas saben dónde ponerte: los hetero pasan, los gays piden reembolso. Eres el limbo con medias.',
      'El audio empieza en voz fina y acaba en tío: a los tres segundos se te cae el personaje y queda el cabrón.',
      'Preguntas si te queda bien y mandas tres fotos. Las tres son el mismo ángulo. El ángulo no tapa el hombro, joder.',
      'El grupo se calla cuando mandas foto. No es admiración: es el recuento de lo patético que eres.',
      'Dices que el outfit es broma y luego lo llevas puesto de verdad. Solo un gilipoyas como tú plancha una broma.',
      'Te pintas la uña y lo anuncias como logro. Lo único que logras es el ridículo.',
      'Dices soy un chico más veces que nadie. Recitarlo tanto es de cabrón que se lo tiene que creer.',
      'El grupo tiene la captura del disfraz. Tú sigues como si no existiera. Existe, joder.',
      'Te sientas como quien espera foto. Nadie te la hace, y eso es lo patético.',
      'Has gastado el mes en ropa que no te camina. La ropa se queda en el perchero, coño.',
      'Te miras al espejo del ascensor más que al número del piso. Patético: el piso nunca fue el motivo.',
      'Has convertido un calcetín en tu biografía, y te ha salido corta y ridícula.',
      'El chat pone otra vez y tú mandas otra. El otra vez era el veredicto, joder.',
      'Dices que te da igual y te tiras un rato largo eligiendo el ángulo. Lo patético es el rato.',
    ],
    mid: [
      'Te paras en los cojines y eliges el rosa con cara de trámite. Luego miras si alguien te ha visto, y alguien te ha visto.',
      'No llevas falda, cabrón, pero tu forma de sentarte con las piernas cruzadas ya levanta actas.',
      'Te pillan en poses sospechosas y dices que estabas estirando. Mierda de excusa, cabrón, estiras mucho para un lado.',
      'Tu armario es de tío normal pero tienes un cajón cerrado con llave que huele a secreto con purpurina.',
      'Tu novia dice que eres muy masculino pero tus colegas intercambian miradas cada vez que pides un cóctel rosa.',
      'Pareces un tío corriente hasta que alguien te pone un filtro de TikTok y la transformación es inquietantemente buena.',
      'Eres de esa gente que en las fiestas de disfraces elige personaje femenino "por broma" y lo clava demasiado bien.',
      'Tienes la fuerza de un tío pero la delicadeza al coger las cosas de alguien que teme romperse una uña.',
      'Al coger el vaso se te escapa el meñique y lo corriges tarde. El meñique ya salió, y la mesa entera lo ha visto.',
      'Cargas en el gimnasio y al estirar te quedas un rato de más, con la espalda arqueada. Alguien te mira, tú no bajas, y la postura pide aplauso.',
    ],
    low: [
      'Cero. El personaje no está. Debajo hay un tío, y es el de siempre.',
      'Limpio. La voz no se te va al agudo a mitad de frase.',
      'Sin rastro. Te sientas como te sientas, no como quien espera acta.',
      'No pides voz de personaje ni te sale el agudo. Coges la jarra, hablas normal, y al de la pose se le desarma el numerito.',
      'Limpio del todo. La foto sale sin filtro y sin atrezzo, y sigue siendo tuya.',
      'Sin material. Nadie en el grupo tiene una teoría sobre tu cajón.',
      'Cero. El "uwu" no forma parte de tu vocabulario, ni borracho.',
      'Limpio. Te queda el vaquero de vaquero, no de disfraz a medias.',
      'Nadie te echa la chaqueta por los hombros y tú no pones el hombro para que lo hagan. El que sí lo pone se queda con la chaqueta colgando y sin público.',
      'Te nombran y detrás no sale un pero. El pero se lo traga quien lo tenía listo, y el trago se le atraganta.',
    ],
  },

  inutil: {
    name: 'inútil',
    goodIsHigh: false,
    high: [
      'Tu único mérito es servir de aviso de en qué no hay que convertirse. El grupo te señala cuando quiere explicar lo que es no valer para una puta cosa.',
      'No sabes hacer nada a la primera, y en la cama tampoco hay segunda.', // ROCKSTAR
      '*Servicio exprés: te deja a medias en tiempo récord.* Así te recomiendan, [nombre].', // ROCKSTAR
      'Tu manera de asumir un error es explicar por qué no era tuyo. Siempre igual, cabrón. No has firmado una cagada en tu vida.',
      'Te dan instrucciones claras y te pierdes igual. Por eso quien se acuesta contigo acaba terminando con la mano.', // ROCKSTAR
      'Preguntas dónde está todo, y en la cama siguen esperando a que encuentres algo.', // ROCKSTAR
      '[nombre], eres quien pide ayuda antes de intentarlo. Y a veces sin intentarlo siquiera. Ni la pereza justifica ese nivel de mierda.',
      'En cualquier proyecto tu nombre sale en la portada y en ningún otro sitio, como en la cama: mucha foto y nada de trabajo.', // ROCKSTAR
      'El grupo te aguanta porque quitarte da más pereza que soportarte. No es cariño: es dejadez, y tu inutilidad vive de ella.',
      'Lo único que se te levanta a tiempo es la mano para preguntar.', // ROCKSTAR
      'Prometes «ahora voy» y no vas. Contigo hasta el orgasmo se queda en «ahora voy».', // ROCKSTAR
      'Tu forma de contribuir es asentir y dejar que lo hagan otros, también en la cama: tumbarte y esperar.', // ROCKSTAR
      'Todo lo tuyo llega tarde o no llega. El calendario es de adorno y el grupo ya cuenta contigo como un cero a la izquierda, pequeña.',
      'Te piden que lo hagas por tu cuenta una vez y te bloqueas. Ni para eso sirves sin que alguien te guíe la mano.', // ROCKSTAR
      'Llegas tarde a todo menos a terminar: ahí siempre llegas antes que nadie.', // ROCKSTAR
      'Te critican, dices «tienes razón» y lo haces exactamente igual en cuanto se te olvida.',
      'Dejas todo a medias: el curro, las conversaciones y a quien se mete contigo en la cama.', // ROCKSTAR
      'Tu forma de ayudar es mirar y opinar. En un trío te tocaría sujetar el móvil.', // ROCKSTAR
      'Nadie te da nada difícil, [nombre]. Sale más barato hacerlo sin ti.',
      '[nombre], otros hacen tu parte además de la suya, y encima te quejas del reparto.',
      '[nombre], eres el primer nombre que se tacha cuando hay que repartir algo importante.',
      '[nombre], todo lo que empiezas lo termina otro, y ese otro pide que no te vuelvan a llamar.',
      '[nombre], llevas años sin aprender a hacer bien una sola cosa, y ni por vergüenza lo intentas.',
      'Apareces para la foto y desapareces para el trabajo, [nombre]. Siempre.',
      '[nombre], lo peor es que lo intentas: sale igual de mal y encima tardas más.',
    ],
    mid: [
      'Haces lo justo para que no te señalen y ni un puto dedo más. Cobarde, pero te funciona.',
      'Vales para lo fácil. Lo difícil se lo pasas a alguien y luego te pones la medalla igual.',
      'Se puede contar contigo la mitad de las veces, y en la cama la mitad del tiempo.', // ROCKSTAR
      'Haces tu parte si es corta. Si es larga, aparece una excusa perfectamente razonable.',
      'Tu fiabilidad tiene horario, y por la noche cierra pronto. Quien te ha esperado despierto lo sabe.', // ROCKSTAR
      'Ayudas en la mudanza llevando los cojines y te piras antes de que lleguen los muebles.',
      'Sirves de refuerzo, nunca de titular. Y ya llevas suficientes años en el banquillo, pequeña.',
      'Empiezas las cosas con muchas ganas, un nombre gracioso y tres stickers, igual que tus ligues. Y se te acaban igual de pronto.', // ROCKSTAR
      'Te piden una cosa, haces la mitad y preguntas si con eso vale. Vale, pero la acaba otra persona.',
      'Contestas «ahora voy» y llegas cuando ya ha terminado sin ti. Pasa en el curro y en otras partes.', // ROCKSTAR
    ],
    low: [
      'Nada que sacarte: haces lo que te toca y sin quejarte. Por eso te cargan con todo, y ni te das cuenta.',
      'Te dan una tarea y vuelve hecha, sin recordatorios ni audios de excusa. Aquí eso ya se celebra, muñeca.',
      'Montas el mueble sin que sobre un tornillo, y quien te ha tenido en casa dice que todo encaja a la primera.', // ROCKSTAR
      'Cuando se organiza algo, acabas con la lista, las reservas y el bote. Te toca por eficaz y nadie te lo agradece.',
      'Llegas, lo arreglas y te vas sin dar la charla. Hay quien te llama para arreglar cosas que no estaban rotas.', // ROCKSTAR
      'Contestas a lo que te preguntan, en orden y sin audios. Por eso ya te preguntan todo a ti, hasta lo que no sabes.',
      'Haces la parte aburrida sin quejarte, y en la cama, por lo que se cuenta, no hay parte aburrida.', // ROCKSTAR
      'Te equivocas, lo dices y lo arreglas en la misma tarde. El grupo tarda más en enterarse que tú en solucionarlo.',
      'Cuando tu nombre sale en un plan, el plan se hace. Cuando no sale, se queda en el chat hasta morirse.',
      'Llevas cargador, batería externa y condones. Eres la farmacia del grupo, y la de ciertas noches también.', // ROCKSTAR
    ],
  },

  // perdedor / ganador: rasgos con porcentaje por ROL igual que el resto. El %
  // lo da rollPercent según si el target es owner/admin/miembro, así que el owner
  // casi nunca sale perdedor y casi siempre ganador, y al revés con los miembros.
  // [nombre] se sustituye por la mención del target dentro de runPercent.
  perdedor: {
    // EL ROTULO ES "perdedor". *!L* siempre fue un alias, no el nombre del
    // comando, y ponerlo de titular ademas contradecia a sus propias frases:
    // la cabecera decia "es 87% L" y dos lineas despues el texto decia
    // "eres un perdedor de mierda". Ninguna de sus frases usa la letra
    // suelta.
    name: 'perdedor',
    goodIsHigh: false,
    high: [
      'Tu problema, [nombre], es que crees que el tiempo va a arreglar algo. El tiempo solo confirma, y en tu caso lleva años confirmando la misma puta cosa.',
      'Pierdes hasta en el amor propio, [nombre]: es la única relación que tienes y también te deja a medias.', // ROCKSTAR
      '*Garantía de fábrica: no llega nunca, ni siquiera al final.* Lo pone en tu caja, [nombre].', // ROCKSTAR
      '[nombre], tu racha más larga es la de no follar, y esa la sigues ganando.', // ROCKSTAR
      'Tu marcador parece una condena, [nombre], y la firmaste tú. Nadie te obligó a nada. Elegiste esta mierda, decisión tras decisión, durante años.',
      '[nombre], te comparas hacia abajo para poder dormir. Y aun así duermes mal, porque sabes exactamente la mierda que hay debajo.',
      'Te dejan en el banquillo hasta en los tríos, [nombre]: sujetas la ropa y miras.', // ROCKSTAR
      'Tienes todas las condiciones para perder, [nombre], y encima las riegas cada día. Lo único que te crece es el historial de incógnito.', // ROCKSTAR
      'Lo único que has conseguido, [nombre], es que no te echen, y es porque les da pereza. Inútil tolerado.',
      'Cuando por fin te toca algo, [nombre], lo celebras tanto que acabas antes de empezar.', // ROCKSTAR
      'Eres un puto cero a la izquierda, [nombre]. Te suman a un trío y siguen siendo dos.', // ROCKSTAR
      'Tu historial es la cuenta de un muerto de hambre, [nombre]: todo restas y nunca entra nada.',
      'Llevas tantas primeras citas sin segunda, [nombre], que las camareras ya te traen la cuenta antes del postre.', // ROCKSTAR
      'Nadie te mueve de tu sitio, [nombre], porque da más pereza moverte que dejarte ahí. Inútil con derecho a queja, y la queja tampoco mueve nada.',
      'Te enamoras de quien te dice que no y te consuelas con quien nunca dice nada: tu mano, [nombre].', // ROCKSTAR
      'Tu mayor éxito, [nombre], es que en las webs guarras te llamen «usuario premium».', // ROCKSTAR
      'Pierdes a las cartas, al fútbol y en la cama, [nombre]. Lo de la cama, por lo menos, dura poco.', // ROCKSTAR
      'Encabezas la carrera de las excusas, [nombre]. En todo lo demás llegas cuando ya han recogido las sillas.',
      'La mala suerte no tiene la culpa, [nombre]. Esto viene de fábrica, y no has movido un dedo por cambiarlo.',
      '[nombre], lo único que aportas es quejarte, y para eso no hacía falta que vinieras.',
      '[nombre], tu mediocridad es tan estable que ya tiene antigüedad. Si fuera un curro, te darían el indefinido.',
      'Tu único logro, [nombre], es que ya nadie espere nada de ti. Te ha costado años.',
      'Te quedas con las ganas tantas veces, [nombre], que ya les has puesto nombre.', // ROCKSTAR
      'Tu vida es una lista de cosas que ibas a hacer, [nombre]. La lista es lo único que has terminado.',
      '[nombre], vives en el casi. Casi llegas, casi lo consigues, y siempre te toca aplaudir a otro.',
    ],
    mid: [
      '[nombre], tienes proyectos a medias y otro que empiezas «cuando pueda». El cuando pueda no llega.',
      'Ganas una de cada tres y te pasas el mes contándola, [nombre], igual que tu último polvo.', // ROCKSTAR
      'Apruebas siempre en la recuperación, [nombre]. En los exámenes, en el curro y en la cama: a la primera, nunca.', // ROCKSTAR
      'Te apuntas al gimnasio con cada propósito y sigues pagando la cuota por pura vergüenza de darte de baja.',
      '[nombre], en cualquier torneo acabas en el tercer puesto de cinco, y en las citas igual: ni te eligen ni te descartan, te dejan para luego.', // ROCKSTAR
      '[nombre], te quedas a un punto del aprobado, a un euro del precio y a un mensaje de la cita. Siempre a uno.',
      '[nombre], te sabes las normas de todos los juegos y no ganas ninguno. Explicas la partida y luego acabas en cuarto lugar.',
      'Llegas a las finales y ahí te caes, [nombre]. Tu especialidad es dar ilusión justo hasta el día que cuenta.',
      'Pides el plato más barato y el último turno, [nombre], y en las fiestas te quedas con quien queda cuando ya se ha ido todo el mundo.', // ROCKSTAR
      'Tu currículum tiene más cursos empezados que trabajos terminados, [nombre]. El papel lo aguanta todo, la entrevista no.',
    ],
    low: [
      '[nombre], lo que empiezas lo acabas, y eso deja en evidencia a medio grupo cada vez que abres la boca.',
      'Pierdes poco, y cuando ganas no lo cuentas en el grupo, tampoco lo de la cama, que es lo que más rabia da.', // ROCKSTAR
      '[nombre], tienes el palmarés que otros se inventan en las historias. Lo tuyo encima es verdad, que es lo que molesta.',
      'Te va bien y no lo cuentas, [nombre]. El grupo se entera por terceros y se muere de envidia en silencio.',
      'Cumples plazos, llegas a la hora y no te vas antes de tiempo. En ningún sitio, por lo que dicen.', // ROCKSTAR
      '[nombre], si pierdes una, pides la revancha y la ganas. Tienes un rencor de competición, y por eso ganas.',
      'Tus derrotas se cuentan con una mano y te sobran dedos. Lo que no se cuenta es la gente que te ha dejado de hablar por ganarle.',
      '[nombre], ganas sin prisa y sin avisar. Cuando el resto se entera, ya estás cobrando.',
      'Nadie te ha visto pedir dinero ni perdón, y lo otro, por lo que se cuenta, no te ha hecho falta pedirlo nunca.', // ROCKSTAR
      '[nombre], apuestas poco y ganas siempre, y no solo en la mesa: hay quien ha perdido la cabeza contigo.', // ROCKSTAR
    ],
  },

  ganador: {
    name: 'ganador',
    goodIsHigh: true,
    high: [
      'Eres quien dice lo que nadie quiere decir, [nombre], y encima tiene razón. Por eso no te invitan a tantas cosas.',
      '[nombre], ganas las discusiones con datos y luego no lo restriegas. Lo segundo es lo que más desconcierta a quien pierde.',
      'Juegas con la mano buena y lo sabes, en las cartas y en la cama.', // ROCKSTAR
      'Tienes la nevera llena, las facturas pagadas y alguien en tu cama que no es de pago. Eso aquí ya es lujo.', // ROCKSTAR
      'Te ponen una fecha límite y entregas antes, [nombre], y luego te sobra tiempo para mirar por encima del hombro.',
      '[nombre], cuando pierdes, felicitas a quien gana y le ganas la siguiente. El rencor bien gestionado da miedo.',
      'Te han dicho que no muchas veces, [nombre], y lo has vuelto a pedir con mejor argumento. Ahora te dicen que sí, y de mala gana.',
      'Tienes plan B y plan C, y en la cama ni te hacen falta.', // ROCKSTAR
      'Tu cuenta sube despacio y nunca baja, y dicen que en otras cosas pasa lo mismo.', // ROCKSTAR
      '[nombre], ganas sin trampas, y eso deja sin excusa a quien pierde. Por eso sienta tan mal perder contigo.',
    ],
    mid: [
      'Tienes el fondo, pero te falta el remate, y quien ha estado contigo lo sabe mejor que nadie.', // ROCKSTAR
      'Empiezas fuerte y a mitad te cansas, en las apuestas y en la cama.', // ROCKSTAR
      '[nombre], ganas el partido que no ve nadie y pierdes el que ve todo el mundo.',
      'Llevas un proyecto «a punto de despegar», [nombre]. Lo único que ha despegado es la fecha.',
      'Ahorras una temporada y te lo gastas en una noche que al día siguiente no quieres recordar.', // ROCKSTAR
      'Te pones metas al empezar la semana y el viernes ya las has cambiado por una noche de bar y lo que salga.', // ROCKSTAR
      'Ganas las apuestas pequeñas y pierdes las grandes, [nombre]. Así el saldo siempre te sale en contra.',
      '[nombre], te quedas en segundo lugar tantas veces que ya te sabes de memoria el discurso de quien pierde.',
      '[nombre], te sale bien la entrevista y llegas tarde el primer día. Toda tu carrera va de esa forma.',
      '[nombre], vas bien hasta que alguien te mira. Con público se te olvida hasta cómo se juega.',
    ],
    low: [
      'Prometes mucho y sostienes una mierda. De lo que anuncias no queda ni el anuncio.',
      'Te coronas en el grupo y fuera te gana cualquiera a cualquier cosa, hasta a durar en la cama.', // ROCKSTAR
      'Te batieron y sigues contando la versión donde "estuvo cerca". Cerca es una puta mentira cómoda.',
      'Hablas de ganar como hablas de follar: mucho, con detalles y sin haberlo hecho nunca.', // ROCKSTAR
      'Lo tuyo viene con letra pequeña: *«los resultados pueden variar»*. En tu caso varían entre poco y nada, también en la cama.', // ROCKSTAR
      'Aplaudes las victorias ajenas para que no se note que tú no subes. Se nota igual y el aplauso da vergüenza.',
      'Te han bajado el listón tantas veces que ya tropiezas con él. El suelo es tu techo, y es un techo de mierda.',
      'Celebras antes de tiempo en todo, y en la cama también: los demás aún no han empezado y tú ya estás de vuelta.', // ROCKSTAR
      'Has ganado más polvos en tu cabeza que nadie. Como nadie los vio, sigues creyéndote algo.', // ROCKSTAR
      'Ganas las discusiones del sofá y pierdes todo lo que se firma. En el salón, imbatible; fuera, un cero a la izquierda.',
      'Te encanta hacerte la foto con el trofeo de otro. El trofeo se va y queda la foto: la de un parásito como tú.',
      'Ganar duele, y tú no aguantas ni una crítica sin romperte. Piel de cristal y marcador de mierda.',
      'Te gusta estar arriba solo en la foto. Cuando toca de verdad, te quedas debajo y mirando.', // ROCKSTAR
      'Dices que tú nunca te rindes. Te rindes en el segundo asalto, y no hablamos de boxeo.', // ROCKSTAR
      'Te emociona la charla de vestuario y te da pánico el campo. Quédate en la charla, pequeña.',
      'Subes al podio solo en tus fantasías, y en tus fantasías también acabas antes que nadie.', // ROCKSTAR
      'Con público te tiembla el pulso, la voz y la seguridad en la cama. Lo único que no tiembla es la excusa.', // ROCKSTAR
      'La presión endurece a otros. A ti te manda al baño a mitad del partido.',
      'Te gusta el himno y te da pereza entrenar. El himno dura un minuto y el trabajo no lo haces nunca, princesa.',
      'Pides la revancha en todo menos en la cama: ahí con una vez tienes bastante, y quien está contigo también.', // ROCKSTAR
      'Te han visto rajarte tantas veces que ya ni te retan. Ni rival eres.',
      'Entras en un sitio con gente que vale y te haces pequeñito en una esquina.',
      'Tu mayor victoria del año fue que te escribieran a las dos de la mañana. Era para decirte que se habían equivocado de número.', // ROCKSTAR
      'El marcador te pone en tu sitio y tú haces como que no lo has visto. Sigue diciendo lo mismo.',
      'Vas de campeón y en la cama te dan el diploma de participación.', // ROCKSTAR
    ],
    extreme: [
      'Eres de las pocas personas del grupo a las que un banco le daría un préstamo sin preguntar. El resto no pasa de la ventanilla, chiquitina.',
      'Ganas tanto que ya ni te felicitan, y en tu cama la lista de espera también es larga.', // ROCKSTAR
      'Cuando entras en una apuesta, los demás se retiran. Ya han perdido bastante contigo.',
      'Tienes una racha que no parece suerte, y no solo con las apuestas.', // ROCKSTAR
      'Llegas lejos, y encima vuelves a por los que se quedaron atrás, que es lo que más humilla, pequeña.',
    ],
  },

  puta: {
    name: 'puta',
    goodIsHigh: false,
    high: [
      'Nadie se queda contigo, [nombre], y el factor común de todos ellos eres tú. Tú le echas la culpa a la mala suerte, y la mala suerte tiene tu cara.',
      'Eres de las que dicen que nadie las entiende, [nombre]. Te entendemos perfectamente, guarra. Por eso nadie se molesta en acercarse dos veces.',
      'Eres tan poco exigente, [nombre], que ya no sabes lo que quieres. Solo lo que aceptas. Y aceptas cualquier puta cosa que aparezca.', // ROCKSTAR
      'Eres la razón por la que este grupo tiene tanto material, [nombre]. Das juego gratis todos los días, y a medio grupo ya le has dado algo más que juego.', // ROCKSTAR
      '[nombre], lo único que se te da bien es ir de uno en uno, y ni eso te sale rentable. Reputación de mierda ganada a pulso.', // ROCKSTAR
      'Te crees misteriosa, [nombre]. Misterio ninguno, cabrona: medio grupo tiene tu lista apuntada.',
      'Te haces la difícil con el expediente publicado, [nombre]. Hay capturas de cada vez que dejaste de serlo, y dan vergüenza hasta a quien las guardó.',
      '[nombre], tu historial ya se lleva por censo, y lo lleva otra persona porque tú perdiste la cuenta. Estadística de mierda, con nombre.', // ROCKSTAR
      'Cambias de interés como de estado de WhatsApp, [nombre], y crees que no se entera nadie. Se entera todo el mundo, y el ridículo es público.',
      'Tu criterio se rinde a la primera insistencia, [nombre]. A veces sin que llegue a haberla. Patético de lo rápido que cedes.',
      'Siempre hay alguien nuevo en tu vida, [nombre], y nunca nadie que se quede. Rotación de mierda y cama que se vacía.', // ROCKSTAR
      'Estás tan a mano, [nombre], que dan por hecho el sí antes de preguntar. Das asco de tan disponible.', // ROCKSTAR
      'Cuando alguien explica lo que es no tener límites, [nombre], sale tu nombre sin buscarlo. Eres el ejemplo, y es un ejemplo de mierda.',
      'Nadie pregunta ya por tu vida, [nombre]: la historia es la misma, con otro nombre.',
      'Eres tan poco selectiva, [nombre], que hasta la selección natural te ha descartado.',
      'Tu lista crece y tu criterio baja, [nombre], y medio grupo lleva la cuenta.', // ROCKSTAR
      'Nadie se pelea por ti, [nombre]. Lo que está a mano no se disputa.', // ROCKSTAR
      'Llamas libertad a irte con quien aparezca, [nombre]. Eso tiene otro nombre, y empieza por guarra.',
      '[nombre], lo das todo sin cobrar nunca, te usan y vuelves a la fila como si nada.', // ROCKSTAR
      'Contigo nadie se esfuerza, [nombre]. Para qué, si con un «hola» ya vale.', // ROCKSTAR
      'Siempre estás disponible, [nombre], y por eso nunca te eligen.',
      'Es más fácil hacer la lista de con quién no, [nombre]. Y esa lista también es corta.', // ROCKSTAR
      '[nombre], llamas relación a un puñado de mensajes y experiencia a repetir el mismo error con otra cara.',
      '[nombre], llevas tu vida sentimental con logística: cada nombre en su hueco y ninguno enterándose del otro.',
      '[nombre], repartes tan a menudo que ya ni es noticia en el grupo.', // ROCKSTAR
    ],
    mid: [
      'Tienes suficientes historias para que se hable y suficientes silencios para que no se confirme.',
      'Te lías con quien toca y a veces con quien no toca. El grupo lleva la cuenta mejor que tú.', // ROCKSTAR
      'No eres la más fácil del grupo, pero tampoco hace falta insistir mucho.', // ROCKSTAR
      'Tienes el móvil lleno de conversaciones que no enseñarías ni borracha.', // ROCKSTAR
      'A medio camino: te respetan de día y te escriben de madrugada.', // ROCKSTAR
      'Tu fama llega a las fiestas antes que tú. Cuando entras ya no hace falta que te presenten.',
      'Dices que no a la primera. A la tercera ya estás eligiendo qué ponerte.', // ROCKSTAR
      'No te pasas de la raya siempre. Te pasas cuando te conviene, y se te nota.',
      'Tienes un par de nombres en la agenda que es mejor que nadie vea, y el grupo ya sospecha cuáles.', // ROCKSTAR
      'Vas de santa y te pillan en el after cada dos por tres.', // ROCKSTAR
    ],
    low: [
      'Ni una historia tuya que contar. Para el cotilleo eres un desierto, y para ligar también, pequeña.',
      'Nada. No te mueves por impulso, y eso te ha ahorrado problemas y todas las noches buenas.', // ROCKSTAR
      'Rebuscan en tu pasado algo que usar contra ti y no sale nada. Tan decente que da asco.',
      'Cero. Tu historial lo podría leer tu madre en voz alta en la cena de Navidad, y nadie dejaría de comer.',
      'Sin rastro. Te invitan a una copa y pagas tú la siguiente, para que nadie piense que la noche incluye postre.', // ROCKSTAR
      'Nada. Tu ex todavía no tiene nada que contar de ti, y mira que lo ha intentado.',
      'Limpio. En tus fotos de verano vas tapada hasta el cuello, y el grupo se aburre.', // ROCKSTAR
      'Sin material. Llevas años con la misma persona o con ninguna, y el grupo ya ni pregunta.',
      'Cero escándalo. Los mensajes de madrugada los contestas tarde y por la mañana, así no hay historia posible.', // ROCKSTAR
      'Nada. Te han querido liar mil veces y sigues sin nada que contar. A este grupo le das muy poco material, princesa.',
    ],
  },

  guarra: {
    name: 'guarra',
    goodIsHigh: false,
    high: [
      'Donde el resto pone un límite, [nombre], tú pones una anécdota de una noche, y casi siempre con dos nombres.', // ROCKSTAR
      '*Abierta las 24 horas, sin cita previa.* Lo pone en tu puerta y en tu historial, [nombre].', // ROCKSTAR
      'Tu presencia hace que la gente mida lo que dice, [nombre], y no por respeto. Por defensa, guarra, como quien esquiva un charco.',
      'Nadie te ha explicado dónde está la línea, [nombre], porque dan por hecho que la ves. No la ves, guarra: la pisas y sigues andando.',
      '[nombre], en tu cama entra gente sin reserva y sale sin despedirse. Y tú lo llamas vida social.', // ROCKSTAR
      '[nombre], por donde pasas dejas rastro, huele, y encima hablas.',
      'Eres tan descuidada, [nombre], que ya nadie se sorprende de lo que traes puesto ni de lo que sueltas. El asco se les pasó de tanto verte.',
      '[nombre], tu boca ha visto más mundo que tu pasaporte.', // ROCKSTAR
      'Efectos secundarios de quedar contigo: picores, una visita al médico y un mensaje incómodo a los ex, [nombre].', // ROCKSTAR
      '[nombre], a ti «te invito a una copa» te suena a contrato firmado.', // ROCKSTAR
      'Llamas naturalidad a quitarte la ropa en cualquier sitio, [nombre], y la diferencia la nota todo el mundo menos tú.', // ROCKSTAR
      'Tienes tarjeta de cliente en el ginecólogo, [nombre], y ya has completado dos.', // ROCKSTAR
      '[nombre], tus rodillas tienen más kilómetros que tus zapatos.', // ROCKSTAR
      'Tu idea de romper el hielo es tirar un cubo de basura al centro de la sala, [nombre]. Y luego preguntas por qué se ha quedado todo el mundo callado.',
      'El ruido que haces atraviesa el edificio entero, [nombre], y los vecinos ya distinguen a tus ligues por el día de la semana.', // ROCKSTAR
      'Nadie quiere escribir después de ti en el hilo, [nombre]. Dejas la conversación como dejas todo: hecha una mierda.',
      '[nombre], te ofendes cuando te devuelven el tono. Lo repartes todo el día y no aguantas ni una.',
      '[nombre], cuando dices en el grupo «me lo he tragado todo», nadie piensa que hablas de una serie.', // ROCKSTAR
      '[nombre], tu idea de complicidad es arrastrar a otros a tu nivel de cabrona, y ahí no quiere bajar nadie.',
      'Ya nadie te sigue el juego, [nombre], y sigues jugando sola. Eso es lo triste.',
      '[nombre], tu lista de contactos va por número, como la charcutería: se coge turno y se pasa.', // ROCKSTAR
      '[nombre], lo que a otras les cuesta admitir borrachas, tú lo cuentas sobria y con detalles que nadie pidió.',
      '[nombre], tienes la vergüenza de adorno. Se te ve el gusto por incomodar y encima te sale natural, que es lo que da miedo.',
      '[nombre], con un audio tuyo de treinta segundos se le quita el hambre a cuatro personas.',
      '[nombre], en cualquier tema encuentras el desvío sucio en dos frases. Se te da de miedo y da bastante asco.',
    ],
    mid: [
      'A veces te frenas a tiempo y otras te pasas tres pueblos. Nunca se sabe cuál toca hasta que ya ha tocado.',
      'Te duchas todos los días, pero la toalla lleva un mes colgada y ya tiene opinión propia.',
      'Tus audios empiezan bien, y a los veinte segundos ya estás contando algo de tu última noche que nadie te ha preguntado.', // ROCKSTAR
      'Te frenas en el grupo grande y en el pequeño sueltas cosas que hacen que alguien se salga del chat.',
      'Tienes la habitación decente para las videollamadas. Lo que queda fuera del encuadre no lo ha visto nadie, por suerte.', // ROCKSTAR
      'Llevas las uñas pintadas, y debajo de la pintura hay tierra de antes.',
      'Solo a partir de la segunda copa sueltas guarradas, y la segunda copa te llega pronto.', // ROCKSTAR
      'Te comportas en las cenas familiares, y en el grupo de amigos mandas stickers que dan ganas de lavarse los ojos.',
      'Friegas cuando ya no queda ni un vaso limpio, y lo cuentas como si fuera limpieza general.',
      'La mitad de tus fotos las puede ver tu madre. La otra mitad está en una carpeta con contraseña y mal escondida, pequeña.', // ROCKSTAR
    ],
    low: [
      'Cero. Tienes tanto decoro que en las cenas te sientan en la punta, para poder hablar de guarradas en la otra, mi niña.', // ROCKSTAR
      'Sin rastro. Aquí sales impoluta, y el grupo sospecha que es porque todavía no ha mirado bien.',
      'Hueles bien incluso al final del día. Tanto perfume para acabar cenando con tus padres.',
      'Tienes la casa ordenada sin visita a la vista. La cama, sobre todo, que no la deshace nadie.', // ROCKSTAR
      'Nadie te ha oído contar una guarrada en el grupo. O no las tienes, o las guardas para alguien con más suerte que nosotros.', // ROCKSTAR
      'Tus fotos las puede ver tu abuela sin sustos. Y por eso no las ve nadie más.',
      'Lavas los platos al acabar de comer, y luego te sientas a mirar la cocina limpia.',
      'De sexo hablas con la boca cerrada, o sea, nada. Tienes más misterio que el grupo entero junto, y eso cabrea.', // ROCKSTAR
      'Llevas pañuelos, gel y un cepillo de dientes en el bolso. Eres la persona limpia del grupo y te toca prestarlo todo, chiquitina.',
      'Cuando alguien suelta una guarrada, pones la cara que ponen las madres. Esa cara ya es un clásico del chat.',
    ],
  },

  // fiel / infiel: porcentaje TOTALMENTE aleatorio (rollUniform), sin las
  // distribuciones por rol del resto. El único amaño es el del owner, que
  // OWNER_FORCE resuelve después: alto en fiel, bajo en infiel.
  fiel: {
    name: 'fiel',
    goodIsHigh: true,
    uniforme: true,
    high: FIEL_HIGH,
    mid: FIEL_MID,
    low: FIEL_LOW,
  },

  infiel: {
    name: 'infiel',
    goodIsHigh: false,
    uniforme: true,
    high: INFIEL_HIGH,
    mid: INFIEL_MID,
    low: INFIEL_LOW,
  },
};

module.exports = LABELS;
