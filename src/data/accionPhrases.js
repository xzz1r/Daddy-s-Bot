// Frases de los comandos de acción: *!hug*, *!kiss*, *!punch* y compañía.
//
// %A = quien hace la acción      %V = quien la recibe
//
// Los dos se sustituyen por una mención. No hay más: `npm run placeholders`
// revienta con cualquier otro. ROAST_USUARIO solo lleva %A: si aparece %V,
// sale crudo en el grupo. Lo salta el propio comando para el dueño: ver
// hazAccion en src/commands/acciones.js.
//
// ─── FALTA UN POOL: ANAL. GROK ───────────────────────────────────────────────
//
// El comando *!anal* ya está montado y probado —cuesta 120 como *!fuck*, tiene
// su propia categoría de gif y sus alias *!culo* y *!porculo*— pero NO EXISTE
// hasta que este fichero exporte `ANAL` con frases dentro: no sale en el menú,
// no se puede teclear, no cobra y no contesta. Es el contrato de siempre.
//
// Treinta frases, mismo formato que las demás, con %A y %V.
//
// EL REGISTRO ES EL DE FUCK, que es el pool de referencia: explícito de verdad,
// no insinuado. Lo que cambia es qué se cuenta, y ahí va el chiste — la postura,
// el que no se esperaba llegar hasta ahí, quién pidió parar y quién no paró, y
// cómo se sienta %V al día siguiente. El gif es anime al azar, así que la frase
// COMENTA la escena y no receta un plano: si describe una habitación, un mueble
// o una postura concreta, la imagen no va a coincidir.
//
// Y el chiste sigue apuntando a %V, nunca a %A. La regla 5 del género vale
// igual: cualquiera del grupo puede caer en cualquiera de las dos menciones.
//
// ─── EL TONO ─────────────────────────────────────────────────────────────────
//
// Manda GUIA.md 5 bis, y el corte es este:
//
// 1. LA ACCIÓN SE REPRODUCE NORMAL. %A le hace el gesto a %V. El gif ya se ve,
//    la frase comenta la escena (público, duración, sonido), no la vuelve a
//    contar y no la convierte en otra cosa. Un beso es un beso.
// 2. LO GUARRO VA EN LOS SEXUALES. FUCK y ANAL cargan el texto entero. El gif es
//    anime al azar, así que la frase comenta y no receta un plano: si describe
//    un azulejo, un coche o una postura, la imagen no va a coincidir.
// 3. EL CHISTE DE LA ACCIÓN ES %V, NUNCA %A. A quien gana no se le quita.
// 4. EL ROAST ES OTRO MENSAJE. No va en el caption del gif: se manda después,
//    en cursiva, y no habla del gesto. Humilla a %A delante del grupo por
//    usar un comando de pago como único contacto.
//
//    Y NO SALE EN TODAS: una de cada cinco acciones del grupo (ROAST_CADA, en
//    acciones.js). Estos comandos se usan en ráfaga contra medio grupo y un
//    segundo mensaje debajo de cada uno dejaba de leerse a las tres veces.
//    Para quien escribe esto significa lo contrario de lo que parece: cada una
//    de las sesenta se lee MENOS veces, así que tienen que aguantar salir
//    solas, sin la acción delante amortiguándolas. Una frase de relleno aquí
//    canta más que en cualquier otro pool.
// 5. NI %A NI %V TIENEN GÉNERO. Son dos menciones: cualquiera del grupo puede
//    caer en cualquiera de las dos, y en el grupo hay mujeres. Una frase que
//    dice «él» o cierra en -o falla el día que le toca a ellas, y no falla
//    despacio: sale con su nombre delante. En el resto del bot esto se cuida
//    solo —de 8.000 frases, 132 dicen «él»— y aquí hay que cuidarlo igual.
//    Se arregla sin esfuerzo: «%V se queda quieto» → «%V no se mueve». El truco
//    es hablar de lo que pasa, no de cómo es quien lo recibe.
//
//    HAY CINCO VIVAS, y son estas — arréglalas de paso:
//      HUG    «%V se queda quieto, que es cómo se recibe»
//      HUG    «%A abraza a %V contra él y no hay hueco»
//      CUDDLE «%V y él ocupan el mismo»
//      PAT    «%V se queda quieto, que es el truco»
//      PUNCH  «Las piernas han decidido por él»
//    («El chat se queda quieto» y «El dibujo se queda quieto» NO son de estas:
//    ahí el masculino es de una cosa, no de una persona. Se quedan como están.)

const HUG = [
  '%A abraza a %V. Delante de todos, sin avisar.',
  '%A se lanza a %V y no suelta. %V mira al frente calculando cuánto queda.',
  '%A abraza a %V dos segundos de más. El grupo ya se ha callado.',
  '%A rodea a %V con los brazos. Un apretón de verdad, no de pasillo.',
  'El abrazo de %A aprieta. A %V se le va el aire un segundo.',
  '%A busca a %V para el abrazo y lo cierra. Encontrarlo era la parte fácil.',
  '%A abraza a %V por encima del hombro. %V no se mueve, que es cómo se recibe.',
  '%A se pega a %V. Empieza en saludo y acaba en no soltar.',
  'Dos palmaditas en la espalda de %V. El resto del abrazo de %A no era protocolo.',
  '%A levanta a %V un palmo del suelo. El abrazo incluye transporte.',
  '%A abraza a %V contra el pecho y no hay hueco. %V se entera ahora.',
  '%A rodea a %V por detrás. %V no lo vio venir. El grupo sí.',
  'El abrazo de %A se queda. El reloj sigue. %V no se mueve.',
  '%A se cuelga de %V. %V aguanta el peso y la escena.',
  '%A abraza a %V con los dos brazos y la cara en el hombro. Ahí se acaba la distancia.',
  '%A aprieta a %V hasta que se le oyen las costillas. Cariño de los que dejan marca en la camisa.',
  '%A abraza a %V en medio del chat. El chat espera. El abrazo no.',
  '%A no pregunta. Abraza a %V y ya. %V se entera en el aire que le falta.',
  '%A comprueba que %V sigue ahí: lo mueve un poco, dentro del abrazo.',
  '%A se planta delante de %V y cierra los brazos. %V cabe. Cabe del todo.',
  '%A abraza a %V más fuerte de lo que el saludo pedía. El saludo ya no aplica.',
  '%A pone la cabeza en el hombro de %V y no la levanta. El abrazo tiene horario de tarde.',
  'Un segundo sin vista. El abrazo de %A le tapa a %V los ojos. Un segundo basta.',
  '%A recoge a %V en un abrazo de los que paran la frase a medias.',
  'Calor de verdad, encima, sin avisar. %V no se lo esperaba de %A.',
  '%A cierra a %V entre los brazos y el pecho. Sitio para uno. Están dos.',
  '%A abraza a %V como quien llega de lejos. Estaban en la misma sala.',
  '%A no suelta a %V. %V tampoco da el paso atrás. El abrazo se queda.',
  'El pelo de %V queda revuelto. El abrazo de %A deja constancia.',
  '%A se tira a abrazar a %V. %V abre los brazos un segundo tarde. Un segundo, y ya está dentro.',
];

const KISS = [
  '%A besa a %V. En el grupo, delante de todos, sin avisar.',
  '%A le planta un beso a %V. %V lo procesará más tarde, en casa.',
  'El chat se queda quieto un segundo. El beso de %A a %V. Solo uno.',
  '%A va a por la boca de %V. Nadie lo ha impedido.',
  '%A besa a %V con una seguridad que aquí se nota de más.',
  '%A besa a %V. Se acabó lo de disimular.',
  '%A besa a %V. El grupo lo ha visto. No hay marcha atrás.',
  '%A le pega un beso a %V en la comisura y luego en serio.',
  'El labio de %V queda ocupado. El beso de %A deja la frase fuera.',
  '%A se acerca a %V y lo resuelve con la boca. %V se entera al final.',
  '%A besa a %V corto. Corto y público. Lo público es lo que cuenta.',
  '%A le sujeta la cara a %V para el beso. Así no hay a dónde mirar.',
  '%A le come un segundo la boca a %V. Un segundo. El grupo cuenta dos.',
  'En medio de la sala, la boca de %A en %V. Como si el sitio fuera suyo.',
  '%A deja un beso en %V y no se aparta del todo. El del todo era el punto.',
  'A %V se le olvida el hilo. El beso de %A puede más. El hilo espera.',
  '%A pega la boca a %V y el ruido del grupo baja solo.',
  'Empieza en la mejilla de %V. Acaba en la boca. El desvío de %A era mentira.',
  'El beso de %A le muerde a %V un poco el labio. Un poco. Bastante.',
  '%A se lía con %V lo justo para que mañana los dos escriban como si nada.',
  'Las gafas de %V quedan un milímetro torcidas. El beso de %A no pide permiso al cristal.',
  '%A no avisa. La boca de %V se entera la primera.',
  'Le suelta la cara después. %V se queda un segundo en el sitio del beso de %A.',
  '%A le planta el beso a %V donde se ve. Donde se ve era el plan.',
  'Se oye. El beso de %A a %V no es un secreto. No pretendía serlo.',
  '%A cierra la distancia con %V de un beso. La distancia no vuelve.',
  'El labio de %V queda brillante. %V se lo limpia tarde. El beso de %A ya está.',
  '%A va a la boca de %V como quien cobra algo. %V paga el segundo.',
  'El grupo cambia de tema al techo. El beso de %A a %V no les ha pedido opinión.',
  '%A se queda en la boca de %V un poco más de lo educado. Lo educado no era esto.',
];

const CUDDLE = [
  '%A se acurruca con %V. La escena dura hasta que alguien la nombre.',
  '%A se pega a %V como si tuviera derecho. Nadie se lo ha dado.',
  '%A busca hueco al lado de %V. Lo encuentra, para desgracia del hueco.',
  'Diez minutos de mimo. A alguien se le ha dormido el brazo. %A no se aparta de %V.',
  '%A se arrima a %V. Empezó como un gesto y va camino de quedarse.',
  '%A cierra los ojos contra %V. %V calcula la distancia a la puerta y no se mueve.',
  '%A se acomoda encima de %V. Con confianza y sin pedir sitio.',
  'Por detrás, %A encaja. Cucharita. %V es la de dentro.',
  '%A mete la cabeza en el hombro de %V y no la saca. El hombro ya tiene inquilino.',
  '%A se enrosca en %V. %V hace de sofá y de persona.',
  'Debajo de lo que haya: manta, brazo, silencio. %A y %V ocupan el mismo hueco.',
  '%A se queda pegado a %V. El frío no tenía nada que ver. Se queda igual.',
  '%A pone una pierna sobre %V y llama a eso estar a gusto. %V no discute el nombre.',
  '%A se duerme casi encima de %V. %V aguanta el peso y el rato.',
  '%A busca el pecho de %V para apoyar la cara. Lo encuentra. Se acaba el debate.',
  '%A se acopla a %V en el sofá. El sofá no daba. Ahora da menos.',
  '%A respira en el cuello de %V y no se aparta. El mimo tiene aliento.',
  '%A se queda a dormir al lado de %V. Al lado es un decir. Encima, casi.',
  '%A abraza a %V por detrás y no abre. El cierre es el mimo entero.',
  '%A se hace pequeño contra %V. %V es el sitio. El sitio no se queja.',
  '%A pone la mano en la tripa de %V y se queda. Quietos los dos.',
  'Hasta que a %V se le calienta el hombro. El mimo de %A tiene esa medida.',
  '%A no deja hueco. Los dos ocupan el mismo. Ese era el plan.',
  '%A cierra los ojos contra %V como quien se muda. %V no ha firmado y está dentro.',
  '%A usa a %V de almohada. La almohada tiene nombre y pulso.',
  '%A se queda enredado en %V. Desenredarse sería otra escena. Esta no.',
  '%A se arrima a %V hasta que el silencio se pone cómodo. %V también.',
  '%A se acurruca y le tapa a %V medio cuerpo. Medio basta.',
  '%A se gira hacia %V y se queda ahí. La espalda al grupo. La cara, no.',
  'El sofá tenía dos plazas. %A y %V lo dejan en una. A partir de ahora, la tiene.',
];

const PAT = [
  '%A le da palmaditas a %V en la cabeza. Como a un perro, y encantado.',
  '%A acaricia la cabeza de %V. El gesto de quien está más alto, aunque no lo esté.',
  '%A le da un par de toques a %V. Consuelo de pie, sin sentarse.',
  '%A le toca la cabeza a %V. Ha bajado el brazo, que ya es el gesto entero.',
  '%A acaricia a %V el pelo. Ni ha mirado. Ha alargado la mano y ya.',
  'Ánimo por el camino más corto: la palma de %A en %V.',
  '%A le acaricia el pelo a %V dos veces. Dos. Las justas para que se note.',
  '%A le da unas palmaditas a %V. Cariño con la mano abierta y poco más.',
  '%A trata a %V con la palma en la cabeza. %V no se mueve, que es el truco.',
  '%A le rasca un segundo el pelo a %V. Un segundo de mascota. %V no protesta.',
  '%A pasa la mano por la cabeza de %V de lástima y de cariño, a partes iguales.',
  '%A le toca el pelo a %V delante de todos. El público es parte del gesto.',
  '%A acaricia a %V como quien para una frase. La frase se para.',
  '%A le da en la cabeza a %V. Suave. Repetido. %V baja un poco la mirada.',
  '%A pone la mano en el pelo de %V y la deja. No acaricia. Ocupa.',
  'Empieza en el hombro de %V. Sube a la cabeza. El destino de la mano de %A era ese.',
  '%A acaricia a %V sin preguntar el nombre. El gesto no lo necesita.',
  '%A le alisa el pelo a %V. %V se deja. El grupo toma nota del se deja.',
  '%A toca a %V en la coronilla. Desde arriba. El arriba es el chiste.',
  '%A le da tres toques a %V. Tres. Como quien cuenta que sigue ahí.',
  '%A acaricia a %V y no dice nada. El silencio con la mano basta.',
  '%A le pasa los dedos por el pelo a %V. %V cierra un ojo. El de la mano.',
  '%A pone la palma en %V y no la quita. La caricia se convierte en tapa.',
  '%A le da en la cabeza a %V con esa calma de quien no va a explicar nada.',
  '%A acaricia a %V al pasar. Al pasar se queda. %V no lo mueve.',
  '%A le toca el pelo a %V como quien corrige un dibujo. El dibujo se queda quieto.',
  '%A baja la mano a la cabeza de %V. %V sube un poco el cuello. Encuentro.',
  'Hasta que %V suelta el aire. Ahí acaba la mano de %A. Ahí acaba el gesto.',
  '%A acaricia a %V y mira a otro lado. La mano va en serio. La cara, no.',
  '%A le pone la mano en la cabeza a %V y %V se queda más bajo. Física simple.',
];

const POKE = [
  '%A le da un toque a %V. Sin motivo, sin plan, sin nada que decir después.',
  '%A pincha a %V. El gesto entero cabe en un dedo.',
  '%A toca a %V con un dedo y espera. Esa es toda la propuesta.',
  '%A molesta a %V. Objetivo cumplido en dos décimas.',
  '%A pincha a %V y se aparta. La técnica del que quiere que lo miren.',
  '%A le da toquecitos a %V. La forma más corta de decir hola.',
  '%A pincha a %V hasta que reacciona. Reaccionar era el juego entero.',
  '%A toca a %V. Nada más. Ni una palabra. Un dedo y su ausencia.',
  '%A le pica el costado a %V. %V da un respingo. %A ya ha ganado.',
  '%A pincha el hombro de %V. El hombro se gira. El resto, también.',
  'En la mejilla de %V, el dedo de %A. %V se lleva la mano ahí, tarde.',
  '%A pincha a %V dos veces. La segunda porque la primera no bastó para que lo mirara.',
  '%A toca a %V por detrás. %V se vuelve. Ese era el plan.',
  '%A le pica a %V el brazo. El brazo se aparta. %A insiste un milímetro.',
  '%A sonríe. %V todavía está procesando el dedo.',
  'En la frente de %V, desde arriba. El dedo de %A. Otra vez.',
  '%A molesta a %V en el mismo sitio. El mismo. Hasta que %V dice algo.',
  '%A pincha a %V debajo de la mesa. La mesa no cuenta. %V sí.',
  '%A le toca el codo a %V. El codo no era importante. La atención, sí.',
  '%A se hace el tonto. El tonto tiene el dedo todavía fuera, en %V.',
  'Para que mire. %V mira. %A no tenía nada que decir. El toque sobraba y se ha dado.',
  '%A pica a %V en las costillas. %V se encoge. El grupo oye el encoge.',
  '%A toca a %V en el hombro izquierdo. %V mira al derecho. Tarde.',
  '%A pincha a %V una vez seca. Una. Como quien llama a una puerta que está abierta.',
  '%A le da toquecitos a %V en la espalda. %V se endereza. Ya está.',
  '%A espera la cara de %V. La cara llega. El dedo ya se ha ido.',
  '%A toca a %V para interrumpir. Interrumpe. Eso es todo el contenido.',
  '%A le pica a %V el hombro hasta que %V se gira del todo. Del todo era lo que quería.',
  '%A pincha a %V. %V salta. El salto es más largo que el toque.',
  'No explica. El toque de %A a %V era el mensaje. El mensaje era nada, y se ha entendido.',
];

const PUNCH = [
  '%A le parte la cara a %V. Se oye el crujido y nadie mueve un dedo.',
  '%A revienta a %V de un puñetazo. Se le ha caído algo al suelo y no era el móvil. Era un diente.',
  '%A le cruza la cara a %V. Mañana no va a poder masticar por ese lado.',
  '%A golpea a %V donde le va a doler al respirar durante una semana.',
  '%A le mete un directo a %V. %V ha visto la luz y no era la de casa. Era el flash del suelo.',
  '%A parte a %V por la mitad. El pliegue se oye. El grupo no dice nada.',
  '%A pega a %V hasta que deja de contestar. Ese era el objetivo.',
  '%A le arranca la sonrisa a %V de un golpe. Y un par de cosas más. El esmalte, por ejemplo.',
  'La nariz de %V se va de lado. La conversación se va con ella. %A no recoge ninguna de las dos.',
  'El sonido es húmedo. Eso es cartílago de %V. El puño de %A no pregunta el nombre.',
  'El hígado de %V recibe el puño de %A. %V se pliega como la colada.',
  'A %V se le oye clic en la mandíbula. Va a hacer clic meses. Cada clic, el puño de %A.',
  'Los nudillos de %A entran en los dientes de %V. Los dientes pierden. %V los busca con la lengua, tarde.',
  'El puñetazo de %A le cierra un ojo a %V para la foto. La foto es este chat. El ojo, un adorno morado.',
  'La cabeza de %V da un latigazo. El cuello guarda el recibo. El puño de %A no pide firma.',
  'Un recto de %A a la boca de %V. El labio se abre como fruta pasada. El gusto es hierro.',
  'El puño de %A se clava en el esternón de %V. El aire se va. El orgullo sale segundo.',
  'El pómulo de %V suena a campana barata bajo %A. %V responde con el suelo.',
  'El puñetazo de %A hace volar la saliva de %V un metro. El metro es público. %V es el que limpia.',
  'A %V le pita un oído. Al grupo no. El golpe de %A ha afinado el lado de las tonterías.',
  'Un gancho de %A a la sien de %V. Se apagan las luces. Se acaba la conversación.',
  'La costilla de %V cede. Se oye el ceder. El puño de %A no se sorprende.',
  'El golpe de %A deja a %V con un diente en la lengua. Lo escupe. Nadie lo recoge.',
  'La nariz de %V le llena de sangre la camisa que le gustaba. %A no se limpia las manos.',
  'El puño de %A encuentra el mismo ojo de %V dos veces. La segunda era educativa.',
  'Puñetazo de %A al estómago. A %V le vuelve la cena. La cena era mejor dentro.',
  'La cabeza de %V pega en la pared después del puño de %A. Dos ruidos. Ninguno pidiendo perdón.',
  'La boca de %V tiene otra forma ahora. La forma nueva no le da para el chiste que le iba a soltar a %A.',
  'El golpe de %A le saca el móvil a %V y la dignidad con él. El móvil tiene funda. La dignidad, no.',
  '%V se sienta sin decidirlo. Las piernas han decidido. %A no tiende la mano. No hay que.',
];

const SLAP = [
  '%A le cruza la cara a %V. El sonido llega antes que la vergüenza.',
  '%A abofetea a %V con la mano abierta, que es peor y lo sabe. A %V se le ha quedado la mejilla cantando.',
  '%A le suelta un guantazo a %V. Cinco dedos marcados y una lección. %V se examina en el reflejo del móvil.',
  '%A le da una torta a %V que le gira la cara y la conversación. La conversación no vuelve.',
  '%A abofetea a %V. Le ha dado la vuelta a la cara y al hilo.',
  '%A le cruza la cara a %V de revés. El detalle del revés lo dice todo.',
  '%A abofetea a %V hasta que le pita el oído. Correctivo completo.',
  '%A le mete una torta a %V. Ya se hablaba de que tocaba.',
  'La bofetada de %A deja la mejilla de %V caliente y la boca abierta. Ahora tiene color.',
  'La cabeza de %V gira noventa grados. El resto llega tarde. %A espera. No mucho.',
  'Palma de %A abierta a la boca de %V. Las palabras se quedan en el aire.',
  'La torta de %A le tira a %V el pendiente al suelo. El pendiente era lo que le colgaba con gracia.',
  'Cinco dedos en rojo en la cara de %V. Trabajo firmado. %A no pone fecha.',
  'Una bofetada de %A tan limpia que el grupo oye el palmoteo y finge que no. A %V le queda el eco en la mejilla.',
  'A %V se le llenan los ojos. No es de sentimientos. Es de física. %A no le pasa un pañuelo.',
  'La torta de %A le saca a %V el chicle. El chicle era lo más inteligente que tenía en la boca.',
  'Revés de %A a la boca de %V. Labio, anillo, silencio.',
  'El sonido de %A es un látigo. %V es el poste. El poste se queda en su sitio.',
  'La bofetada de %A gira a %V hacia la puerta. Pista. %V coge la mejilla.',
  '%V se sujeta la mejilla. Está más caliente que la excusa. %A no pide la excusa.',
  'Dos tortas de %A. La segunda porque la primera le quedó bien a %V en la cara.',
  'Una marca de mano que se lee desde el sofá. El texto dice %V. El autor, %A.',
  'La mano abierta de %A encuentra la mejilla con la que %V habla. Por fin un uso.',
  'La torta de %A es tan fuerte que la otra mejilla de %V le pega en el hombro. Rebote.',
  'Las gafas de %V abandonan la cara por %A. Eran la parte lista. Ahora están en el suelo.',
  'La bofetada de %A le cruza a %V un hilo de saliva de lado.',
  'El correctivo de %A es público. El escozor es privado. A %V le duran los dos.',
  'Primero la nuca, luego la cara de %V. Temario de %A. %V suspende los dos en el mismo minuto.',
  '%V se lleva la mano a la mejilla y se le ve el temblor. El temblor es de %A.',
  'La torta de %A termina la frase que %V estaba escribiendo. Por fin un punto final que se entiende.',
];

const BITE = [
  '%A muerde a %V en el cuello y no suelta. Ahí queda la marca hasta el jueves.',
  '%A le hinca el diente a %V. Con ganas, con saliva y con testigos.',
  '%A muerde a %V donde va a tener que dar explicaciones en casa.',
  '%A le pega un bocado a %V. Nadie sabe si iba en broma y %V tampoco.',
  '%A muerde a %V y le deja los dientes marcados. Firmado, vamos.',
  'En el hombro de %V aterriza la boca de %A. Al otro hombro se le va el color también.',
  '%A le muerde el labio a %V hasta que sangra un poco. Cosas suyas.',
  'En un grupo normal el bocado de %A a %V tendría consecuencias. Aquí se queda la marca.',
  'El bocado de %A va a la clavícula de %V, la que se ve con el pico.',
  'La piel de %V se rompe. Un poco. Bastante. Los dientes de %A no piden permiso.',
  '%A muerde el brazo de %V. El brazo se encoge. El diente no.',
  'Dientes de %A en el lóbulo de %V. La oreja no era el apetito. El cuello, sí.',
  'El mordisco de %A deja en %V un collar de moratones que no ha comprado.',
  '%V sisea. %A no suelta. El siseo era información, no freno.',
  '%A muerde a través de la camiseta de %V. La camiseta pierde. %V también, un poco.',
  'Un bocado de %A en la muñeca de %V. Como quien firma. %V gira la muñeca y se ve.',
  '%A muerde el labio de abajo de %V y saca un poco de hierro. Los dos lo notan.',
  'El cuello de %V está morado para la cena, obra de %A. El jersey no llega.',
  'Hombro izquierdo de %V. Boca de %A. El derecho se pone celoso solo.',
  'Piel de %V entre los dientes de %A. Ese es el recuerdo. %V se mira el hueco.',
  'El mordisco de %A empieza de broma y acaba con un tirón de %V. El diente llegó primero.',
  '%A muerde a %V junto a la clavícula. Mañana se ve. Hoy se oye.',
  'Un bocado de %A en la línea de la mandíbula de %V. Cerca de la boca. No la boca. Peor.',
  '%V va a tener que llevar un cuello que no ha elegido. %A lo eligió con la mandíbula.',
  'El mordisco de %A está húmedo. La disculpa no va a llegar. %V tampoco la pide.',
  'El bocado de %A hace que %V se agarre al pelo. El agarre es la crítica. Cinco segundos de sí.',
  'En el omóplato de %V, por detrás, la boca de %A. Los platos esperan. %V no.',
  '%A rompe piel a propósito. Accidente es el cuento para luego. %V ya lo está ensayando.',
  'El pulso de %V está en la boca de %A. Ese era el punto.',
  '%A le deja un chupetón con dientes a %V. La versión suave era un beso. Esta no.',
];

const KICK = [
  '%A le mete una patada a %V en los huevos. De abajo arriba y con puntera. A %V se le va la voz una octava.',
  '%A patea a %V y lo saca del encuadre y de la conversación.',
  '%A le da una patada a %V que le reordena los órganos. El orden nuevo no mejora el conjunto.',
  '%A patea a %V como quien cierra un tema para siempre. El tema era %V. Queda cerrado.',
  '%A le suelta una patada a %V. Se ha oído hasta en el otro grupo.',
  '%A patea a %V y ni mira dónde cae. Ese detalle lo dice todo.',
  '%A le da a %V con el pie. Con la mano habría sido demasiado honor.',
  '%A patea a %V en el suelo. Ahí ya no hace falta, pero se hace igual.',
  'La patada de %A le tuerce a %V la rodilla al revés. La rodilla protesta. %V, un segundo tarde.',
  'La bota de %A entra en el estómago de %V. Aire, luego el silencio.',
  'La patada de %A levanta a %V un palmo. La gravedad hace el resto.',
  'Espinilla de %A al muslo de %V. Pierna muerta. Discusión muerta. %V cojea.',
  'Patada de %A a las costillas de %V en el suelo. El suelo ya era la lección. %A añade un capítulo.',
  'La puntera de %A encuentra el riñón de %V. %V descubre que tiene uno.',
  'La patada de %A manda a %V contra la silla de atrás. La silla aguanta. %V no.',
  'Un puntapié de %A a la cadera de %V. La cadera se sale de la conversación.',
  'Desde el suelo, %A le parte la cara a %V con el pie. Antideportiva. Precisa.',
  'Los huevos de %V suben. La voz les acompaña. El pie de %A no pide bis.',
  'La patada de %A dobla a %V sobre la mesa. La mesa aguanta. %V no. Encima mancha.',
  'Tacón de %A al empeine de %V. Pequeño, rastrero, inolvidable. El bordillo no pega así.',
  'Patada de %A al pecho que sienta a %V contra la pared. La pared no lo invita.',
  'El sonido de %A es un bombo. El bombo es el cuerpo de %V.',
  'La patada de %A deja la suela impresa en la camisa de %V. Destinatario: el suelo.',
  '%V gatea. La patada de %A lo encuentra gateando. Esa es la política.',
  'Patada de %A en carrera. La carrera era gratis. El aterrizaje le cuesta a %V el aire.',
  'De abajo arriba, el pie de %A le entra a %V en la boca. Dientes, luego baldosa.',
  'A %V se le duerme la pierna. Volver andando es una teoría. %A no llama un taxi.',
  'La patada de %A saca el aire y la gracia. A %V le quedaba poco de las dos.',
  'El pie de %A se queda un segundo en el pecho de %V. Firma. %V no se la discute. No respira.',
  '%A le planta el pie en la columna a %V. Las manos de %V olvidan lo que estaban haciendo.',
];

const BONK = [
  '%A le da un mazazo a %V en la cabeza. Se le ha reiniciado algo.',
  '%A zurra a %V hasta que se le quita la tontería. Diez minutos.',
  '%A le arrea a %V. No es violencia, es mantenimiento.',
  '%A castiga a %V delante de todos. La parte pública era el objetivo.',
  '%A le sacude a %V. Y a %V se le ha bajado la calentura de golpe.',
  '%A le da lo suyo a %V. Nadie va a preguntar por qué.',
  '%A zurra a %V. Se lo llevaba pidiendo desde el primer mensaje del día.',
  '%A corrige a %V a golpes. Método antiguo y sigue funcionando.',
  'El porrazo de %A le pone a %V los ojos bizcos. Los dos miran igual de poco.',
  'El objeto de %A encuentra el cráneo de %V. La idea se sale del edificio. El ruido cesa.',
  'Un crac en la coronilla de %V. La corona no se la había merecido. El crac de %A, sí.',
  'El golpe de %A es tan limpio que la frase de %V se corta en medio de una vocal.',
  '%A pega dos veces en el mismo sitio de %V. El primero era un aviso. El segundo ya es el idioma.',
  'El mazazo de %A le resuena a %V en los empastes. Lo único metálico que tenía.',
  '%V ve un fogonazo. No es inspiración. %A apaga.',
  'Un golpe de %A. Un sentarse. Un silencio. Temario en tres tiempos. %V suspende los tres.',
  'El porrazo de %A saca la idea y deja el cuerpo de %V. El cuerpo se queda por peso.',
  'La cabeza de %V suena a metal de saldo. %A es el golpe. El grupo no pide bis.',
  'El golpe de %A hace que %V suelte lo que estaba usando para hacerse el listo.',
  'Mazazo de %A en la frente de %V. Ahí vivía el problema. Desahuciado.',
  'A %V le pitan los oídos en estéreo. El grupo en mono. %A sube el volumen al hueso.',
  'Un golpe de %A que deja la cara de %V en ajustes de fábrica: en blanco un segundo.',
  '%A le pega a %V la cabeza contra la superficie más cercana. Eficiente.',
  'La herramienta da igual. El chichón de %V no. %A no firma. El chichón firma por los dos.',
  'El porrazo de %A deja un bulto del que %V va a mentir. Se dio con una puerta. La puerta no apunta así.',
  'A %V se le dobla la vista. Ninguna de las dos copias acaba la frase. %A no elige.',
  'Un golpe de %A al cráneo que le corta a %V el número. El número era malo. El corte es un favor.',
  '%A zurra hasta que a %V se le cae la sonrisa. La sonrisa era prestada.',
  'El sonido de %A es coco. La leche es lo que %V iba a decir. Se derrama.',
  'Un correctivo de %A a la sien de %V. La sien lo archiva en educación.',
];

const FUCK = [
  '%A se corre dentro de %V y no saca. %V se viste encima y escribe buenas en el grupo. Buenas es lo que se le escurre por los muslos el resto del día. Un recuerdito de polla. Joder, se le nota al cruzar las piernas.',
  '%A se corre en la cara de %V y le dice que no se limpie todavía. %V se limpia con dos dedos y se los chupa, mirando. El grupo no había pedido postre. Lo tiene delante, con la cara pringada y pidiendo otro plato.',
  '%A se la mete en la boca a %V solo para verle los ojos. %V babea y se le saltan las lágrimas. Así se sabe que va en serio. Si tose, %A no saca: aparta la baba con el pulgar y sigue. Los ojos eran el cuentakilómetros. Van a fondo.',
  '%A se planta la cara entre las nalgas y los muslos de %V y no saca la lengua ni para respirar. %V tira del pelo para que pare. El pelo se tira. La lengua, no. %V se corre encima de la cara que pedía tregua. Tregua denegada.',
  '%A folla a %V tan rico que %V suelta un nombre que no es el de %A. %A no se ofende: se la mete más fuerte hasta que el nombre correcto sale solo, entre babas, con la polla hasta el fondo. El otro nombre se jubila. Este culo ya tiene nombre.',
  '%A se folla a %V con los pantalones a media pierna y sin quitar ni los calcetines. Los calcetines. %V se corre con ellos puestos y se le queda esa imagen para siempre. Un polvo de perro. Un orgasmo de verdad. Los calcetines no se lo merecían, y aun así %V pide otra.',
  '%A le abre las nalgas a %V y le come el orto como si hubiera un premio dentro. Lo hay: el gemido. %V lo suelta tan alto que el perro del vecino ladra. El perro tiene oído. Con ese gemido %V lo ha sacado a la calle sin abrir la puerta.',
  '%A le mete dos dedos a %V en el culo y se los curva buscando el punto. Lo encuentra. %V da un salto que no iba a dar en público. %A sonríe y no saca los dedos. El punto se queda trabajado. Mañana, en el metro, un bache se lo recuerda entero.',
  '%A se corre en la boca de %V y le tapa los labios con la mano para que no escupe. %V traga porque no hay otra. Luego abre para enseñar. Vacío. %A asiente. %V pide un chicle. El chicle no cubre leche. Ni de coña. La lengua tampoco, pero %V la usa igual.',
  '%A folla a %V tan hondo que se le queda la voz ronca. No de hablar. De aguantar la polla. Mañana %V dice que es el aire acondicionado. El caramelo de la tos no cubre polla. El grupo oye el aire y no compra ni el sobre.',
  '%A le pregunta a %V si duele. Duele. %V dice que más. El más y el duele salen de la misma boca, qué lío de cerdo. %A se la clava hasta que el duele se queda sin aliento y el más manda solo, con el culo ya en otra liga.',
  '%A despierta a %V metiéndosela ya, con los ojos todavía cerrados. Buenos días es un gemido a destiempo. %V abre los ojos a mitad de polla y no protesta. Protestar sería perderse el mejor sueño de la semana, y ya está dentro, joder, hasta el fondo.',
  '%A se folla a %V en el descansillo, entre el felpudo y el buzón. Si baja el vecino, que se eduque. %V se tapa la boca y se oye el golpe de caderas contra el buzón igual. El correo llega tarde. %V llega antes, chorreando contra el felpudo.',
  '%A tumba a %V y chupa entre las piernas hasta que las caderas se levantan solas. %A las baja con un brazo y sigue. Las caderas insisten. Pierden. %V se corre con las caderas presas y con un joder que no iba a decir tan alto. Lo ha dicho. El techo lo tiene grabado.',
  '%A se corre entre las nalgas de %V y le da dos palmaditas: ya puedes irte. %V se va así, el vaquero pringado por dentro. En el ascensor se le ve la cara. El de la segunda no sabe por qué. El vaquero sí. El vaquero es un soplón de semen y no sabe callarse.',
  '%A le folla a %V tan en el punto que %V moja hasta las muñecas de %A. Qué asco. Qué rico. %A no para: usa eso de lubricante y se la mete más. %V dice qué vergüenza. La vergüenza chorrea. %A agradece el detalle y no saca.',
  '%A tumba a %V sobre la mesa de la cocina y se la mete apartando el tupper con el codo. El tupper cae. El pollo para mañana se jode. %V se corre entre migas. La cena era otra. El fregadero espera. El fregadero se puede esperar. El culo, no.',
  '%A se hace una coleta con el pelo de %V y tira. La polla entra hasta donde %V no esperaba que cupiera. Cabe. %V tose y pone los ojos en blanco. %A no suelta la coleta. El peluquero no tira así. El peluquero cobra menos y no se corre en la garganta.',
  '%A le pone una mano en el cuello a %V, sin apretar, y se la mete mirando. %V traga saliva. Tragar con la polla dentro es un arte. %V no es artista. Aprende. Se le ve el pulso en la garganta, a golpe de cadera. %V pierde la cuenta. %A, no.',
  '%A folla a %V tan lento que desespera y tan rápido que se le saltan las lágrimas. %V pregunta cuál de los dos. %A dice los dos. Los dos caben. %V no. Se le oye no caber, y pide el lento otra vez para mentir un poco y correrse igual de sucio.',
  '%A deja a %V el culo y las caderas marcados de dedos y de polla. Mañana un mapa. Hoy un polvo. %V firma con un gemido. En la playa van a preguntar. %V va a decir el gimnasio. El gimnasio no aprieta así, ni de coña, ni con el entrenador mirando.',
  '%A se corre en los labios de %V y se lo unta como si fuera barra de labios. %A sonríe. %V no sabe qué hacer con la cara. Lamerse. Se lame. %A se la mete en la boca a continuación, para no desperdiciar el maquillaje. El maquillaje era leche. Le queda de puta madre.',
  '%A se folla a %V delante del espejo. Que se vea la cara. Que se vea cómo se la meten. %V mira, se corre, y quiere apartar la vista. No puede: %A le sujeta la cara contra el cristal. La clase no acaba hasta que %V se vea la cara que pone al tomarla entera.',
  '%A le da a %V por el culo hasta que se oye en el piso de abajo. El vecino se pone los cascos. %V se pone la almohada. La almohada no basta. %A no baja el volumen. El vecino cambia de casa o de fetiche. Las dos cosas le salen a cuenta, y %V sigue gemiendo.',
  '%A está viendo el partido con %V y se la mete entera, sin quitar la vista del área. El partido sigue. %V también, a gemir bajito para no tapar el gol. El gol llega. %V se corre en fuera de juego. El VAR no pita el semen. Qué liga más sucia, y qué segundo tiempo.',
  '%A le pone el móvil a %V en la cara, grabando, y se la mete. %V dice borra eso. %A dice después. Después %V se corre en el vídeo. El vídeo no se borra. A las tres de la mañana %V lo pide por privado. Lo de borra eso era una mentira con gemido.',
  '%A le da a %V con la polla en las mejillas, en la boca, en la frente, como un cerdo feliz, y no entra. Hace esperar. %V babea al vacío. Cuando entra, %V da las gracias. Las gracias se atragantan. Mejor. La garganta ya estaba lista. Faltaba el por favor, y ha salido.',
  '%A se corre en el pelo de %V. En el pelo. %V dice cabrón y no se ducha. Se va así a dormir, con la leche cuajando. Por la mañana el gel no basta. %A ofrece ayuda con la lengua. No ayuda. Empeora. %V deja que empeore. Mañana otra vez el gel. Y la lengua. Y el no basta.',
  '%A se la mete a %V aunque %V diga que no da más. No da más y abre. Cansancio de boca. El cuerpo pide otra. %A folla más despacio. Despacio y hasta el fondo, coño. El no da más dura veinte minutos más y acaba en un sí que no se oía venir.',
  '%A se tumba y pone a %V a caballo. %V rebota dos veces bien y a la tercera se le ve que no sabe. %A agarra las caderas y dirige. %V aprende a golpes de cadera. A la sexta ya es un puto talento. A la décima se corre y se cae hacia delante, con la polla todavía dentro. %V pide el bis sin voz.',
];

// OTRO MENSAJE. No va en el caption. Humilla a quien ha pedido el comando,
// delante del grupo, por usar un gif de pago como único contacto. No habla
// del gesto de arriba: habla de %A.
//
//   · El objetivo es SIEMPRE %A. Nunca %V.
//   · No repitas el chiste de arriba.
//   · Sirve para las once, así que no menciones ninguna en concreto.
//   · Ni «él» ni adjetivo en -o: cualquiera del grupo cae aquí.
//
// Lo que hiere no es el taco ni el cristal. Es esto, y está medido:
// el grupo es el público; %A acaba de fingir contacto; el roast niega
// no el gag, sino el derecho a haberlo fingido. Nadie te elige. Esto
// es lo más cerca que has estado. Lo estás haciendo con testigos.
const ROAST_USUARIO = [
  '%A, el grupo acaba de ver lo más cerca que has estado de un cuerpo. Un gif. Eso es todo lo que das.',
  'Nadie toca a %A. Nadie. Este comando es el apaño, y el apaño se ve. Se ve demasiado.',
  '%A, no te eligen. Te mencionas. Lo has pagado para que parezca otra cosa. No lo es.',
  '%A, en el pasillo no te dejan ni el saludo. Aquí pagas un dibujo y finges que te han dejado. No te han dejado.',
  'La vida íntima de %A cabe en un cargo. El grupo lo acaba de leer. El cuerpo no ha aparecido. Nunca aparece.',
  '%A usa esto de contacto porque el de verdad no existe. No existe. Lleva años no existiendo, gilipollas.',
  '%A, tu único plan de acercarte es pagar. En persona te da vergüenza hasta el nombre. El nombre, aquí, se compra.',
  'Si %A pudiera hacerlo a dos metros, no estaría pagando. Está pagando. Las cuentas son el diagnóstico, y es feo.',
  '%A manda esto y espera que le devuelvan calor. El calor no llega. No le ha llegado nunca. El grupo ya lo sabía.',
  'A las tres de la mañana %A se atreve. A las tres nadie pide nada. Por eso vale. Cobardía de horario, y se nota.',
  '%A, este es tu contacto. El único. Virtual, de pago, con testigos. Da vergüenza ajena leerlo en voz alta.',
  'El historial de %A en la vida real está en blanco. El del chat, no. El chat es donde finge que le tocan, imbécil.',
  '%A no habla. Paga. Hablar pondría la cara a un palmo y la cara no da. El saldo da. El saldo es tu boca.',
  '%A, nadie te aguanta el aliento. Te aguanta un gif. Has elegido el gif delante de todo el grupo.',
  'Lo más cerca que ha estado %A de intimidad esta semana es este cargo. Luego se acaba a solas. Siempre a solas.',
  '%A lo manda a media lista porque una no basta. Ninguna iba a bastar. El problema no era el número. Eras tú.',
  '%A, te corre la paja mental y se la cobras al grupo. El grupo no era tu cuarto. Hoy lo has convertido en eso.',
  'En persona %A no abre la boca. Aquí paga para que un dibujo haga el trabajo. El dibujo no te va a follar, imbécil.',
  '%A espera el visto como quien espera que le deseen. El visto no es deseo. Es un tick. Eso es todo el cariño que te cabe.',
  '%A, si te contestan no sabes qué decir. Por eso rezas para que no contesten. El plan acaba en el envío. Siempre acaba ahí.',
  'Van cuatro destinos y no es mediodía. %A está cazando contacto a tiro de mención. No hay caza. Hay hambre, y se ve.',
  '%A lleva el contacto en el pulgar porque en los brazos no le sale. Los brazos sobran. Sobran desde hace años.',
  '%A, esto no es atreverte. Es pagar para no tener que oler a nadie. El asco es mutuo. El pago lo firma, y el grupo está mirando.',
  'La única piel que ha tocado %A hoy es la del teléfono. Llama a eso acercarse. No es acercarse. Es una paja con público.',
  '%A elige a quien está en línea. En línea no se puede ir. Por eso vale. En un pasillo se irían, y se irían corriendo.',
  '%A, tu vida sexual es este comando. Lo has usado. Lo vas a volver a usar. El grupo ya te conoce el truco entero.',
  'Nadie se acerca a %A a dos metros. A dos metros se ve el miedo. Aquí se ve el cargo. El cargo no tapa el miedo.',
  '%A se ha ensayado la frase y ha pagado para no decirla. La voz delataría el por favor. El gif te cubre, gilipollas.',
  '%A, has convertido el grupo en tu único sitio para fingir contacto. Fuera no hay sitio. Fuera no te lo dan. Nunca te lo dan.',
  'Si no contestan, %A cambia de nombre. Hay más en la lista. La lista es lo más cerca que ha estado de tener opciones de verdad.',
  '%A manda esto desde el cuarto, desde la cama, desde el váter. Desde cualquier sitio menos desde delante. Delante hay que ser alguien.',
  '%A, te has gastado el aura en simular que te quieren. No te quieren. Te han mencionado. No es lo mismo, imbécil, y se lee.',
  '%A espera que el grupo vea que ha hecho algo. Ha hecho un cargo. El cargo no es un cuerpo. Ni de lejos es un cuerpo.',
  '%A, lo tuyo no es timidez. Es que en persona no te comen ni el saludo. Aquí el saludo se compra, gilipollas, y lo llamas contacto.',
  'La ronda de %A es una dieta de menciones. Cero calorías de verdad. El hambre sigue. El hambre es el personaje, y el personaje da asco.',
  '%A no se atreve a decir el nombre en el aire. Lo teclea. El aire no se entera. El grupo, sí. Y se ríe. Con razón.',
  '%A, estás usando un bot de pago para el contacto que no te hace nadie. Eso no se tapa. Se lee. Se te lee entero.',
  'Tres de la mañana, saldo abajo, %A fingiendo intimidad. La intimidad de verdad pide un cuerpo. El cuerpo no ha venido. No va a venir.',
  '%A se queda mirando si pitan. Si pitan, se corre por dentro. Si no pitan, manda otra. El orgasmo es una notificación, gilipollas.',
  '%A, nadie te debe un gesto. Lo estás comprando. Lo comprado no es un gesto. Es una limosna que te das con público.',
  'El único idioma que le funciona a %A es el comando. El de la boca se le oxidó. Se le oye el óxido cada vez que paga.',
  '%A ha escrito el nombre, lo ha borrado, lo ha vuelto a poner. El miedo cabe en dos pulgadas. Fuera, el miedo gana siempre. Gana porque no sales.',
  '%A, te haces el valiente con testigos de chat. En un pasillo no hay testigos que te tapen. Hay una persona. No das. No has dado nunca.',
  'Media lista del grupo en una semana. %A está quemando nombres como quien quema cerillas. Ninguna calienta. Ninguna iba a calentar. El frío eres tú.',
  '%A llama plan a mandar esto. El plan de alguien a quien no le funciona el otro. El otro es hablar. Hablar te da un asco de vergüenza que se te ve.',
  '%A, tu cuarto huele a esto: a comando, a espera, a que nadie te ha tocado. El grupo no necesitaba olerlo. Lo ha leído, y basta.',
  'Lo de %A no es un gesto. Es una petición de contacto disfrazada de broma. La broma no cuela. La petición, menos. Se te ve el hambre.',
  '%A se esconde detrás del envío porque la voz le delataría. La voz diría por favor. El envío dice que ha sido un comando, y la cobardía queda firmada en el hilo.',
  '%A, si esto te parece contacto es que no has tenido otro. No has tenido otro. Se te ve. Se te ve demasiado, y ya no hay dónde esconderlo.',
  'El saldo de %A baja cada vez que finge que le pasa algo. No le pasa nada. Le pasa el cobro. El cobro es lo más real que le ha pasado hoy.',
  '%A manda y baja el chat como si no hubiera sido. Ha sido. El nombre sigue arriba. El ridículo también. El ridículo se queda.',
  '%A, te corre más un visto que un cuerpo. El cuerpo no te ha dado nunca esa prisa. El visto, sí. Qué hambre tan fea, y tan pública.',
  'Nadie le ha dicho a %A que se acerque. Se lo ha dicho el aburrimiento. El aburrimiento paga. El aburrimiento es tu pareja, gilipollas, y no te deja.',
  '%A tiene más historial de comandos que de noches. Las noches están vacías. Los comandos, no. Las cuentas cuadran. La cama, no. La cama lo sabe.',
  '%A, esto es lo que haces cuando no te folla nadie. Lo haces en público. Lo has hecho. El público no iba a salvarte. El público te acaba de ver.',
  'La mención de %A no recorre el metro. El metro sigue entero. El metro es lo que %A no va a cruzar nunca, imbécil, y el grupo ya lo tiene claro.',
  '%A se ha hecho un cuerpo de notificaciones y llama a eso que le toquen. No le tocan. Le pitan. El pita le basta porque no hay más, y no va a haber más.',
  '%A, has pagado para no tener que oír tu propia voz pidiéndolo. La voz te delataría. El cargo te hace de madre y te deja en la cuna. El grupo hace de sala.',
  'Si %A sale de esta y habla, se le acaba el truco. Por eso no habla. Por eso paga. Por eso el grupo ya no se sorprende.',
  '%A llama valentía a un gif con nombre. Valentía era cruzar. No ha cruzado. No va a cruzar. El gif es lo máximo que da, y da asco verlo.',
];


module.exports = { HUG, KISS, CUDDLE, PAT, POKE, PUNCH, SLAP, BITE, KICK, BONK, FUCK, ROAST_USUARIO };
