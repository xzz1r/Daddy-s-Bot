// Frases de los comandos de acción: *!hug*, *!kiss*, *!punch* y compañía.
//
// %A = quien hace la acción      %V = quien la recibe
//
// Los dos se sustituyen por una mención. No hay más: `npm run placeholders`
// revienta con cualquier otro. ROAST_USUARIO solo lleva %A: si aparece %V,
// sale crudo en el grupo. Lo salta el propio comando para el dueño: ver
// hazAccion en src/commands/acciones.js.
//
// ─── FALTA UNA EN ROAST_USUARIO. GROK ────────────────────────────────────────
//
// Quedan 59 en vez de 60. Se borró una que decía «estás usando un BOT de pago».
// El bot puede nombrarse a sí mismo —la guía lo permite y es parte de la voz—
// pero era la única de las 390 que lo hacía, y esto es ROAST_USUARIO: el pool
// cuyo trabajo es precisamente que no parezca escrito por una máquina. Esa
// palabra suelta era justo la que lo recordaba. Escribe otra sin nombrarlo; el
// chiste no la necesitaba.

// ─── EL TONO ─────────────────────────────────────────────────────────────────
//
// Manda GUIA.md 5 bis, y el corte es este:
//
// 1. LA ACCIÓN SE REPRODUCE NORMAL. %A le hace el gesto a %V. El gif ya se ve,
//    la frase comenta la escena (público, duración, sonido), no la vuelve a
//    contar y no la convierte en otra cosa. Un beso es un beso.
// 2. LO GUARRO VA EN LOS SEXUALES. FUCK y ANAL cargan el texto entero. El gif
//    es anime al azar: no recetes el plano. ANAL comenta lo que se ve (el culo,
//    la cara, el empujón), no un cuarto ni el día siguiente.
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
//    («El chat se queda quieto» y «El dibujo se queda quieto» valen: el
//    masculino es de una cosa, no de una persona.)

const HUG = [
  '%A abraza a %V y el grupo cuenta los segundos. %V pierde la cuenta antes.',
  '%A se lanza a %V y no suelta. %V mira al frente calculando cuánto queda.',
  '%A abraza a %V dos segundos de más. El grupo ya se ha callado.',
  '%A rodea a %V con los brazos. Un apretón de verdad, no de pasillo.',
  'El abrazo de %A aprieta y %V no dice basta. Podía decirlo. No lo dice.',
  '%A busca a %V para el abrazo y lo cierra. Encontrarlo era la parte fácil.',
  '%A abraza a %V por encima del hombro. %V no se mueve, que es cómo se recibe.',
  '%A se pega a %V. Empieza en saludo y acaba en no soltar.',
  'Dos palmaditas en la espalda de %V. El resto del abrazo de %A no era protocolo.',
  '%A levanta a %V un palmo del suelo. El abrazo incluye transporte.',
  '%A abraza a %V contra el pecho y no hay hueco. %V se entera ahora.',
  '%A rodea a %V por detrás. %V no lo vio venir. El grupo sí.',
  'El abrazo de %A se queda. El reloj sigue. %V no se mueve.',
  '%A se cuelga de %V. %V aguanta el peso y la escena.',
  '%A abraza a %V con la cara en el hombro. %V mira al grupo por encima y no pide ayuda.',
  '%A aprieta a %V hasta que se le oyen las costillas. Cariño de los que dejan marca en la camisa.',
  '%A abraza a %V en medio del chat. El chat espera. El abrazo no.',
  '%A no pregunta. Abraza a %V y ya. %V se entera en el aire que le falta.',
  '%A aprieta un poco para comprobar que %V sigue ahí. %V sigue ahí y no dice nada.',
  '%A se planta delante de %V y cierra los brazos. %V cabe. Cabe del todo.',
  '%A abraza a %V más fuerte de lo que el saludo pedía. El saludo ya no aplica.',
  '%A pone la cabeza en el hombro de %V y no la levanta. El abrazo tiene horario de tarde.',
  'Un segundo sin vista. El abrazo de %A le tapa a %V los ojos. Un segundo basta.',
  '%A recoge a %V en un abrazo de los que paran la frase a medias.',
  'Calor de verdad, encima, sin avisar. %V no se lo esperaba de %A.',
  '%A cierra a %V entre los brazos y el pecho. Sitio para uno. Están dos.',
  '%A abraza a %V como quien vuelve de un viaje. %V se agarra igual, y eso ya no se explica.',
  '%A no suelta a %V. %V tampoco da el paso atrás. El abrazo se queda.',
  'El pelo de %V queda revuelto. El abrazo de %A deja constancia.',
  '%A se tira a abrazar a %V. %V abre los brazos un segundo tarde. Un segundo, y ya está dentro.',
];

const KISS = [
  '%A besa a %V y sigue escribiendo. %V lleva dos minutos sin escribir nada.',
  '%A le planta un beso a %V. %V lo procesará más tarde, en casa.',
  'El chat se queda quieto un segundo. El beso de %A a %V. Solo uno.',
  '%A va a por la boca de %V y %V no gira la cara. Girar la cara costaba nada.',
  '%A besa a %V y %V tarda en cerrar los ojos. Los cierra cuando ya no hacía falta.',
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
  'El beso de %A se oye. El ruido lo va a tener que explicar %V en su casa, no %A.',
  '%A cierra la distancia con %V de un beso. La distancia no vuelve.',
  'El labio de %V queda brillante. %V se lo limpia tarde. El beso de %A ya está.',
  '%A va a la boca de %V como quien cobra algo. %V paga el segundo.',
  'El grupo cambia de tema al techo. El beso de %A a %V no les ha pedido opinión.',
  '%A se queda en la boca de %V un poco más de lo educado. Lo educado no era esto.',
];

const CUDDLE = [
  '%A se acurruca con %V y %V se corre un poco para hacerle sitio. Nadie le pidió que hiciera sitio.',
  '%A se pega a %V como si tuviera derecho. %V le hace sitio, y el derecho ya está dado.',
  '%A busca hueco al lado de %V. %V levanta el brazo para que quepa, y luego lo baja encima.',
  'Diez minutos de mimo. A alguien se le ha dormido el brazo. %A no se aparta de %V.',
  '%A se arrima a %V. %V dice que solo un rato. Lleva media hora sin moverse.',
  '%A cierra los ojos contra %V. %V calcula la distancia a la puerta y no se mueve.',
  '%A se acomoda encima de %V y %V se aparta para que quepa. Nadie pidió ese sitio.',
  'Por detrás, %A encaja. Cucharita. A %V le toca la parte de dentro.',
  '%A mete la cabeza en el hombro de %V y no la saca. %V no mueve el hombro. Podía.',
  '%A se enrosca en %V. %V se queda de sofá y no dice ni que no.',
  'Debajo de lo que haya: manta, brazo, silencio. %V se acomoda al hueco que le deja %A.',
  '%A no se despega de %V. El frío no tenía nada que ver. Se queda igual.',
  '%A pone una pierna sobre %V y llama a eso estar a gusto. %V no discute el nombre.',
  '%A se duerme casi encima de %V. %V aguanta el peso y el rato.',
  '%A busca el pecho de %V para apoyar la cara. Lo encuentra. Se acaba el debate.',
  '%A se acopla a %V en el sofá. %V se aparta a la esquina sin que nadie se lo pida.',
  '%A respira en el cuello de %V y no se aparta. El mimo tiene aliento.',
  '%A se queda a dormir al lado de %V. Al lado es un decir. Encima, casi.',
  '%A abraza a %V por detrás y no abre. El cierre es el mimo entero.',
  '%A se encoge contra %V. %V le echa el brazo por encima. No hacía falta y lo hizo igual.',
  '%A pone la mano en la tripa de %V y se queda. Quietos los dos.',
  'Hasta que a %V se le calienta el hombro. El mimo de %A tiene esa medida.',
  '%A no deja hueco entre los dos, y %V no reclama el suyo. Ese era el plan.',
  '%A cierra los ojos contra %V como quien se muda. %V no ha firmado y está dentro.',
  '%A usa a %V de almohada. %V aguanta la postura hasta que se le duerme el brazo, y no avisa.',
  '%A se enreda en %V y ahí se queda. Desenredarse sería otra escena. Esta no.',
  '%A se arrima a %V hasta que el silencio se pone cómodo. %V también.',
  '%A se acurruca y le tapa a %V medio cuerpo. Medio basta.',
  '%A se gira hacia %V y se queda ahí. La espalda al grupo. La cara, no.',
  'El sofá tenía dos plazas. %A y %V lo dejan en una. A partir de ahora, la tiene.',
];

const PAT = [
  '%A le da palmaditas a %V en la cabeza. Como a un perro. Y a %V le vale.',
  '%A acaricia la cabeza de %V y %V baja los hombros sin que nadie se lo mande.',
  '%A le da un par de toques a %V. %V agacha un poco la cabeza para que llegue mejor.',
  '%A le toca la cabeza a %V. Ha bajado el brazo, que ya es el gesto entero.',
  '%A acaricia a %V el pelo. Ni ha mirado. Ha alargado la mano y ya.',
  'Ánimo por el camino más corto: la palma de %A, y %V se queda ahí debajo esperando la siguiente.',
  '%A le acaricia el pelo a %V dos veces. Dos. Las justas para que se note.',
  '%A le da unas palmaditas a %V. %V cierra los ojos un segundo. Ese segundo lo delata.',
  '%A trata a %V con la palma en la cabeza. %V no se mueve, que es el truco.',
  '%A le rasca un segundo el pelo a %V. Un segundo de mascota. %V no protesta.',
  '%A pasa la mano por la cabeza de %V con más lástima que cariño. %V se deja igual.',
  '%A le toca el pelo a %V delante de todos. El público es parte del gesto.',
  '%A acaricia a %V como quien manda callar sin decirlo. %V se calla.',
  '%A le da en la cabeza a %V. Suave. Repetido. %V baja un poco la mirada.',
  '%A pone la mano en el pelo de %V y la deja ahí. No acaricia: ocupa. %V no la aparta.',
  'Empieza en el hombro de %V. Sube a la cabeza. El destino de la mano de %A era ese.',
  '%A acaricia a %V sin preguntar si puede. %V tampoco pregunta por qué se deja.',
  '%A le alisa el pelo a %V. %V se deja. El grupo toma nota del se deja.',
  '%A toca a %V en la coronilla. Desde arriba. %V ni levanta la cabeza para discutirlo.',
  '%A le da tres toques a %V. Al tercero %V ya ha inclinado la cabeza sola.',
  '%A acaricia a %V y no dice nada. El silencio con la mano basta.',
  '%A le pasa los dedos por el pelo a %V. %V cierra un ojo. El de la mano.',
  '%A pone la palma en %V y no la quita. %V se queda debajo sin moverse, como si tocara.',
  '%A le da en la cabeza a %V con esa calma de quien no va a explicar nada.',
  '%A acaricia a %V al pasar. Al pasar se queda. %V no lo mueve.',
  '%A le toca el pelo a %V como quien corrige un dibujo. El dibujo se queda quieto.',
  '%A baja la mano a la cabeza de %V. %V sube un poco el cuello. Encuentro.',
  'Hasta que %V suelta el aire. Ahí acaba la mano de %A. Ahí acaba el gesto.',
  '%A acaricia a %V y mira a otro lado. La mano va en serio. La cara, no.',
  '%A le pone la mano en la cabeza a %V y %V se queda más bajo. Física simple.',
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
  'El puñetazo de %A hace volar la saliva de %V un metro. El metro es público. Lo limpia %V.',
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
  '%A le suelta un revés a %V. Cinco dedos marcados y una lección. %V se examina en el reflejo del móvil.',
  '%A le cruza la cara a %V y le gira la conversación con ella. La conversación no vuelve.',
  '%A abofetea a %V. Le ha dado la vuelta a la cara y al hilo.',
  '%A le cruza la cara a %V de revés. Con el revés llegan los nudillos, y llegan al hueso.',
  '%A abofetea a %V hasta que le pita el oído. Correctivo completo.',
  '%A le mete un bofetón a %V. Ya se hablaba de que tocaba.',
  'La bofetada de %A deja la mejilla de %V caliente y la boca abierta. Ahora tiene color.',
  'La cabeza de %V gira noventa grados. El resto llega tarde. %A espera. No mucho.',
  'Palma de %A abierta a la boca de %V. Las palabras se quedan en el aire.',
  'El bofetón de %A le tira a %V el pendiente al suelo. El pendiente era lo único que le colgaba con gracia.',
  'Cinco dedos en rojo en la cara de %V. Trabajo firmado. %A no pone fecha.',
  'Una bofetada de %A tan limpia que el grupo oye el palmoteo y finge que no. A %V le queda el eco en la mejilla.',
  'A %V se le llenan los ojos por el golpe de %A. %A no le pasa nada para secarse.',
  'El bofetón de %A le saca a %V el chicle. El chicle era lo más inteligente que tenía en la boca.',
  'Revés de %A a la boca de %V. Labio, anillo, silencio.',
  'El sonido de %A es un látigo. %V es el poste. El poste se queda en su sitio.',
  'La bofetada de %A gira a %V hacia la puerta. Pista. %V coge la mejilla.',
  '%V se sujeta la mejilla. Está más caliente que la excusa. %A no pide la excusa.',
  'Dos bofetones de %A. El segundo porque el primero le quedó bien a %V en la cara.',
  'Una marca de mano que se lee desde el sofá. El texto dice %V. El autor, %A.',
  'La mano abierta de %A encuentra la mejilla con la que %V habla. Por fin un uso.',
  'El bofetón de %A es tan fuerte que la otra mejilla de %V le pega en el hombro. Rebote.',
  'Las gafas de %V abandonan la cara por %A. Eran la parte lista. Ahora están en el suelo.',
  'La bofetada de %A le cruza a %V un hilo de saliva de lado.',
  'El correctivo de %A es público. El escozor es privado. A %V le duran los dos.',
  'Primero la nuca, luego la cara de %V. Temario de %A. %V suspende los dos en el mismo minuto.',
  '%V se lleva la mano a la mejilla y se le ve el temblor. El temblor es de %A.',
  'El bofetón de %A termina la frase que %V estaba escribiendo. Por fin un punto final que se entiende.',
];

const BITE = [
  '%A muerde a %V en el cuello y no suelta. Ahí queda la marca hasta el jueves.',
  '%A le hinca el diente a %V. Con ganas, con saliva y con testigos.',
  '%A muerde a %V donde va a tener que dar explicaciones en casa.',
  '%A le pega un bocado a %V y la marca sale antes que la queja. La queja llega sin fuerza.',
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
  'El bocado de %A hace que %V se agarre a lo que tiene cerca. Suelta cuando %A suelta, no antes.',
  'En el omóplato de %V, por detrás, la boca de %A. Los platos esperan. %V no.',
  '%A rompe piel a propósito. Accidente es el cuento para luego. %V ya lo está ensayando.',
  'El pulso de %V está en la boca de %A. Ese era el punto.',
  '%A le deja un chupetón con dientes a %V. La versión suave era un beso. Esta no.',
];

const KICK = [
  '%A le mete una patada a %V en los huevos. De abajo arriba y con puntera. A %V se le va la voz una octava.',
  '%A patea a %V fuera del encuadre y de la conversación.',
  '%A le da una patada a %V que le reordena los órganos. El orden nuevo no mejora el conjunto.',
  '%A patea a %V como quien cierra un tema para siempre. El tema era %V. Queda cerrado.',
  '%A le suelta una patada a %V. Se ha oído hasta en el otro grupo.',
  '%A patea a %V y ni mira dónde cae. %V cae contra una silla y la silla se lleva el ruido.',
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
  '%V gatea. La patada de %A llega igual, y llega abajo. Esa es la política.',
  'Patada de %A en carrera. La carrera era gratis. El aterrizaje le cuesta a %V el aire.',
  'De abajo arriba, el pie de %A le entra a %V en la boca. Dientes, luego baldosa.',
  'A %V se le duerme la pierna. Volver andando es una teoría. %A no llama un taxi.',
  'La patada de %A saca el aire y la gracia. A %V le quedaba poco de las dos.',
  'El pie de %A se queda un segundo en el pecho de %V. Firma. %V no se la discute. No respira.',
  '%A le planta el pie en la columna a %V. Las manos de %V olvidan lo que estaban haciendo.',
];

const BONK = [
  '%A le da un mazazo a %V en la cabeza. Se le ha reiniciado algo.',
  '%A le da a %V hasta que se le quita la tontería. Diez minutos, y se contaron.',
  '%A le parte un objeto en la cabeza a %V. El objeto se rompe. La tontería de %V, no.',
  '%A castiga a %V delante de todos. La parte pública era el objetivo.',
  '%A le sacude a %V. Y a %V se le ha bajado la calentura de golpe.',
  '%A le da lo suyo a %V. Nadie va a preguntar por qué.',
  '%A le parte algo en la cabeza a %V. Se lo llevaba pidiendo desde el primer mensaje del día.',
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
  'El golpe de %A hace que %V suelte lo que estaba usando para dar lecciones.',
  'Mazazo de %A en la frente de %V. Ahí vivía el problema. Desahuciado.',
  'A %V le pitan los oídos en estéreo. El grupo en mono. %A sube el volumen al hueso.',
  'Un golpe de %A que deja la cara de %V en ajustes de fábrica: en blanco un segundo.',
  '%A le pega a %V la cabeza contra la superficie más cercana. Eficiente.',
  'La herramienta da igual. El chichón de %V no. %A no firma. El chichón firma por los dos.',
  'El porrazo de %A deja un bulto del que %V va a mentir. Se dio con una puerta. La puerta no apunta así.',
  'A %V se le dobla la vista. Ninguna de las dos copias acaba la frase. %A no elige.',
  'Un golpe de %A al cráneo que le corta a %V el número. El número era malo. El corte es un favor.',
  '%A golpea hasta que a %V se le cae la sonrisa. La sonrisa era prestada.',
  'El sonido de %A es coco. La leche es lo que %V iba a decir. Se derrama.',
  'Un correctivo de %A a la sien de %V. La sien lo archiva en educación.',
];

// Treinta. Registro sucio, frases cortas. El chiste está en una de estas:
// la postura, quién no se esperaba llegar ahí, quién pidió parar, cómo se
// sienta al día siguiente. El golpe es %V. Ni «él» ni adjetivo en -o.
//
// Mojar de verdad: ritmo, lengua, dedos, tiempo. Entrar en seco no moja,
// enseña. El «tengo que mear» a veces no es el baño. El «para» de después
// es el centro pidiendo tregua, no un no. La película escupe y entra;
// eso duele y seca. Aquí se baja primero.
//
// ─── ESTE POOL ESTÁ EXENTO DE LA REGLA DE GÉNERO, Y ES DECISIÓN DEL DUEÑO ───
//
// La regla general del fichero es que ni %A ni %V tienen género: cualquiera del
// grupo cae en cualquiera de las dos menciones, así que una frase que dice «él»
// o cierra en -o falla el día que le toca a ellas, con su nombre delante. Eso
// vale para las otras veinte acciones y `npm run check` lo vigila.
//
// Aquí NO. Dieciséis de estas treinta dan por hecho que quien recibe es mujer
// —coño, clítoris, moja, chorrea, el charco— y así es como se quieren. Se
// reescribieron una vez para hacerlas neutras y el dueño lo revirtió: «estaba
// bien así». Es su bot y su grupo; sabe quién lo usa y con quién.
//
// Queda escrito aquí para que no se vuelva a «arreglar» solo. Quien pase por
// este fichero buscando concordancias rotas: estas no lo son, son una decisión.
// Las otras veinte acciones sí, y ahí sí hay que mirar.
const FUCK = [
  '%A se pone debajo y no sale. %V se sienta en esa cara y se le van las rodillas. El suelo se entera primero.',
  '%A pone a %V a cuatro y se queda atrás, con la boca. %V baja el pecho. El charco, no.',
  'Una pierna de %V al borde del lavabo. %A no entra: lengua en el mismo sitio, el mismo ritmo. El azulejo se pone imposible.',
  '%A mete un cojín bajo el culo de %V y curva los dedos. El ángulo es de cerdo. %V moja en cuanto dan con el punto y no se apartan.',
  '%A arrincona a %V contra la pared, una pierna enganchada al codo. Entre las piernas ya chorrea y todavía no ha entrado nadie.',
  '%A se tumba y pone a %V a frotar contra un muslo. La postura de revista no mojaba. El muslo sí. %V se corre en el muslo, qué rabia.',
  '%A pone a %V de lado y no deja cerrar. Los muslos tiemblan abiertos. Cerrar era el plan. El plan se empapó.',
  '%A sienta a %V al borde, piernas al cuello, y se queda en el clítoris. %V ve el techo. El techo no baja a ayudar.',
  '%A baja y se queda. %V iba a durar. Se corre con la boca todavía ahí, con cara de esto no. Esto sí.',
  '%A curva dos dedos hacia arriba y chupa a la vez. %V suelta un tengo que mear que no es mear. Es el suelo, joder.',
  '%A ni entra. Dedos y lengua hasta que %V moja las muñecas. %V decía que no se ponía así. Se ha puesto así.',
  '%A le come el coño a %V tres minutos, el mismo ritmo, sin inventar. %V se corre de algo tan simple y se le oye la sorpresa.',
  '%A besa el cuello y los muslos y no toca el centro. %V ya empapa lo que lleva puesto. El centro llega tarde a propósito.',
  '%A escupe para entrar. %V se encoge: eso no moja, duele. %A baja y se queda. Cuando entra de verdad, ya chorrea.',
  '%A se come a %V de rodillas en la cocina. %V se agarraba a la encimera para no llegar. Llega. La encimera queda marcada.',
  '%V pide que entre. %A sigue con la boca. Cuando entra, ya chorrea. Entrar en seco era el plan de otro.',
  '%A se queda en el clítoris después. %V dice para. Las caderas no firman. %A hace caso a las caderas.',
  '%V tira del pelo de %A para que pare. El pelo se tira. La lengua no. %V se corre encima de la tregua.',
  '%V dice que no da más. Abre igual. %A baja el ritmo y no saca los dedos. El no da más acaba en un sí sin voz.',
  '%A entra cuando ya moja. %V pide más despacio. Despacio y hondo. El más despacio era para durar. No dura.',
  '%V pide un segundo. %A para la boca un segundo. El segundo se acaba. %V moja el segundo entero.',
  '%A va al punto y no se mueve. %V dice saca. Luego dice no. El no gana. El asiento pierde.',
  '%V avisa que va a manchar. %A no se aparta. Mancha. La cara de %A queda de prueba. %V pide perdón y otra.',
  '%A frotando, sin entrar. %V se ríe de lo poco que es. A la quinta se le corta la risa. El poco era todo.',
  '%A se pasa el rato con los dedos curvados en el punto, sin prisa. Al día siguiente %V se sienta en el bus y se le ve la cara.',
  '%A abre a %V de dos manos y se queda a comer. Mañana la silla de la oficina. Hoy el charco.',
  '%A se la come hasta que las piernas de %V dicen basta. Basta es un decir. Cruzarlas mañana en el grupo es un trámite sucio.',
  '%A deja a %V el coño hinchado y las sábanas perdidas. En el bar %V pide de pie. De pie también tira.',
  '%A folla a %V ya chorreando, hasta que las caderas dicen que no hay más. Hay más. Mañana el taburete delata.',
  '%A no saca la lengua ni para respirar. %V se corre y se queda temblando. Al día siguiente los vaqueros piden tregua. Los vaqueros pierden.',
];

// Treinta. El gif ya es el polvo: explícito, por el culo, al azar.
// La frase comenta lo que se ve —cara, sonido, el para, el hondo— no un
// cuarto ni el día siguiente. El golpe es %V. Ni «él» ni adjetivo en -o.
const ANAL = [
  '%A se la mete a %V por el culo. Delante de todos. A %V se le acaba lo que iba a decir.',
  '%A folla a %V por detrás y no saca. %V mira al frente. El frente no ayuda.',
  '%A entra en el culo de %V. Se oye. El grupo también. %V más.',
  '%A se la clava a %V atrás, hondo. %V suelta un ruido que no pensaba soltar delante de nadie.',
  '%A le abre el culo a %V y se queda dentro. %V no se esperaba el hondo.',
  '%A folla el culo de %V delante de todos. %V tapa la boca. No basta.',
  '%A se planta detrás de %V y entra. %V suelta un joder que no iba a soltar.',
  '%A no saca. %V tampoco pide que saque. El culo de %V ya no tiene hueco.',
  '%A se la mete a %V por detrás hasta donde cabe. Cabe. A %V se le van los ojos.',
  '%A entra despacio en el culo de %V. %V dice para. El para no llega a tiempo.',
  '%A tira de las caderas de %V y entra atrás. %V va al encuentro. Sucio.',
  '%A le da por el culo a %V con ganas. A %V se le oye el golpe. El grupo finge sordera.',
  '%A folla a %V por detrás hasta que se le corta la voz. De %V no quedaba otra cosa entera.',
  '%A entra y no se mueve. A %V se le quiebra la voz en mitad de una palabra que no acaba.',
  '%V pide más despacio. %A folla el culo más despacio y más hondo. El hondo no se había pedido.',
  '%A se la mete a %V atrás sin avisar. El aviso es el gemido. %V lo suelta entero.',
  '%A no para. El culo de %V ya no discute. %V sí, un poco, y se le oye perder.',
  '%A entra en %V por detrás y empuja. %V baja la cabeza. Bajarla no es un no.',
  '%A le parte el culo a %V a empujones. Cada uno le cambia la cara. La de ahora no es la de antes.',
  '%A se la mete a %V hondo y se para. Para que %V lo sienta. %V lo siente. Demasiado.',
  '%A folla a %V por el culo como si no hubiera público. Hay público. A %V se le olvida.',
  '%A entra y %V suelta el aire de golpe. Ese aire lo tenía guardado para otra cosa.',
  '%A se la clava a %V por detrás y no pide permiso. La cara de %V dice joder. Vale por firma.',
  '%A le da a %V por el culo hasta que %V pide tregua. Tregua denegada. Sigue el empujón.',
  '%A folla el culo de %V y le sujeta las caderas. %V no se va. No hay a dónde.',
  '%A se la mete a %V atrás y el sonido es húmedo. %V se oye. El grupo, desgraciadamente, también.',
  '%A entra hondo en el culo de %V. %V no se esperaba llegar ahí. Ahí ya está.',
  '%A no saca del culo de %V. El empujón se queda. %V también, a duras penas.',
  '%A se la mete a %V por detrás y %V se muerde el labio. El labio no tapa el gemido. Nada lo tapa.',
  '%A folla a %V por el culo hasta que a %V se le pone la mirada idiota. El culo manda. La cara obedece.',
];

// OTRO MENSAJE. No va en el caption. Humilla a quien ha pedido el comando,
// delante del grupo, por usar un gif de pago como único contacto. No habla
// del gesto de arriba: habla de %A.
//
//   · El objetivo es SIEMPRE %A. Nunca %V.
//   · No repitas el chiste de arriba.
//   · Sirve para todas las acciones, así que no menciones ninguna en concreto.
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
  '%A tiene aura para esto y no para una cerveza. El orden de gastos de un gilipollas se lee solo.',
  '%A, tu único plan de acercarte es pagar. En persona te da vergüenza hasta el nombre. El nombre, aquí, se compra.',
  'Si %A pudiera hacerlo a dos metros, no estaría pagando. Está pagando. Las cuentas son el diagnóstico, y es feo.',
  '%A manda esto y espera que le devuelvan calor. El calor no llega. No le ha llegado nunca. El grupo ya lo sabía.',
  'A las tres de la mañana %A se atreve. A las tres nadie pide nada. Por eso vale. Cobardía de horario, y se nota.',
  '%A, este es tu contacto. El único. Virtual, de pago, con testigos. Da vergüenza ajena leerlo en voz alta.',
  'El historial de %A en la vida real está en blanco. El del chat, no. El chat es donde finge que le tocan, imbécil.',
  '%A no habla. Paga. Hablar pondría la cara a un palmo de otra, y a esa distancia ya no hay comando que valga.',
  '%A, nadie te aguanta el aliento. Te aguanta un gif. Has elegido el gif delante de todo el grupo.',
  'Lo más cerca que ha estado %A de intimidad esta semana es este cargo. Luego se acaba a solas. Siempre a solas.',
  '%A lo manda a media lista porque con una persona no basta. Con ninguna iba a bastar. El problema no era el número. Eras tú.',
  '%A, te corre la paja mental y se la cobras al grupo. El grupo no era tu cuarto. Hoy lo has convertido en eso.',
  'En persona %A no abre la boca. Aquí paga para que un dibujo la abra en su lugar, y el dibujo cobra por adelantado.',
  '%A espera el visto como quien espera que le deseen. El visto no es deseo. Es un tick. Eso es todo el cariño que te cabe.',
  '%A, si te contestan no sabes qué decir. Por eso rezas para que no contesten. El plan acaba en el envío. Siempre acaba ahí.',
  'Van cuatro destinos y no es mediodía. %A está cazando contacto a tiro de mención. No hay caza. Hay hambre, y se ve.',
  '%A lleva el contacto en el pulgar porque en los brazos no le sale. Los brazos sobran. Sobran desde hace años.',
  '%A, esto no es atreverte. Es pagar para no tener que oler a nadie. El asco es mutuo. El pago lo firma, y el grupo está mirando.',
  'La única piel que ha tocado %A hoy es la del teléfono. Llama a eso acercarse. No es acercarse. Es una paja con público.',
  '%A elige a quien está en línea. En línea no se puede ir. Por eso vale. En un pasillo se irían, y se irían corriendo.',
  '%A, tu vida sexual es este comando. Lo has usado. Lo vas a volver a usar. El grupo ya te conoce el truco entero.',
  'Nadie se acerca a %A a dos metros. Por eso lo hace desde el teclado, donde los dos metros no existen y el miedo no se ve.',
  '%A se ha ensayado la frase y ha pagado para no decirla. La voz delataría el por favor. El gif te cubre, gilipollas.',
  '%A, has convertido el grupo en tu único sitio para fingir contacto. Fuera no hay sitio. Fuera no te lo dan. Nunca te lo dan.',
  'Si no contestan, %A cambia de nombre. Hay más en la lista. La lista es lo más cerca que ha estado de tener opciones de verdad.',
  '%A manda esto desde el cuarto, desde la cama, desde el váter. Desde cualquier sitio menos desde delante. Delante hay que ser alguien.',
  '%A, te has gastado el aura en simular que te quieren. No te quieren. Te han mencionado. No es lo mismo, imbécil, y se lee.',
  '%A espera que el grupo vea que ha hecho algo. Ha hecho un cargo. El cargo no es un cuerpo. Ni de lejos es un cuerpo.',
  '%A, lo tuyo no es timidez. Es que en persona no te comen ni el saludo. Aquí el saludo se compra, gilipollas, y lo llamas contacto.',
  'La ronda de %A es una dieta de menciones. Cero calorías, y aun así repite plato tres veces al día.',
  '%A no se atreve a decir el nombre en el aire. Lo teclea. El aire no se entera. El grupo, sí. Y se ríe. Con razón.',
  'Tres de la mañana, saldo abajo, %A fingiendo intimidad. La intimidad de verdad pide un cuerpo. El cuerpo no ha venido. No va a venir.',
  '%A se queda mirando si pitan. Un tick doble le sube más que nadie a quien haya tocado este año.',
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
  'Nadie le ha dicho a %A que se acerque. Se lo ha dicho un domingo por la tarde sin nada que hacer, que es quien decide casi todo lo suyo.',
  '%A tiene más historial de comandos que de noches. Las noches están vacías. Los comandos, no. Las cuentas cuadran. La cama, no. La cama lo sabe.',
  '%A, esto es lo que haces cuando no te folla nadie. Lo haces en público. Lo has hecho. El público no iba a salvarte. El público te acaba de ver.',
  'La mención de %A cruza el grupo en medio segundo. Los dos metros hasta la persona llevan años sin cruzarse.',
  '%A se ha hecho un cuerpo de notificaciones y llama a eso que le toquen. No le tocan. Le pitan. El pita le basta porque no hay más, y no va a haber más.',
  '%A, has pagado para no tener que oír tu propia voz pidiéndolo. La voz te delataría. El cargo te hace de madre y te deja en la cuna. El grupo hace de sala.',
  'Si %A sale de esta y habla, se le acaba el truco. Por eso no habla. Por eso paga. Por eso el grupo ya no se sorprende.',
  '%A llama valentía a un gif con nombre. Valentía era cruzar. No ha cruzado. No va a cruzar. El gif es lo máximo que da, y da asco verlo.',
  '%A ha tardado más en elegir a quién que lo que dura el gif. Esa es toda la vida social que ha tenido hoy.',
];


// COSQUILLAS. La risa involuntaria: %V no elige reirse y ahi esta el chiste.
// Nadie sale digno de esto, y menos quien la recibe.
const TICKLE = [
  '%A le hace cosquillas a %V. La risa que sale de ahí no la eligió nadie.',
  'Dos dedos en las costillas de %V. %A encontró el botón y ya no lo suelta.',
  '%V aguanta tres segundos. Al cuarto se dobla. %A ni había empezado.',
  '%A va directo a las costillas de %V. Ahí no hay dignidad que aguante.',
  'La risa de %V sale rota y aguda. %A se la sacó a la fuerza y el grupo la oyó.',
  '%A le clava los dedos en el costado a %V. %V patalea. Patalear es rendirse con ruido.',
  '%V le pide a %A que pare. Lo pide riéndose, así que no cuenta.',
  '%A busca las cosquillas de %V hasta dar. Da. Se acabó la cara de gente seria.',
  'Cosquillas en el cuello de %V. El peor sitio, y %A lo tenía fichado.',
  '%A no para. %V ya no respira bien y todavía no ha dicho nada con sentido.',
  'A %A le bastan dos segundos para que %V se olvide de la postura que traía.',
  '%A le hace cosquillas a %V hasta que se le escapa un ruido nuevo. Ese ruido ya es del grupo.',
  '%V se retuerce y le jura venganza a %A entre carcajadas. Nadie firma un juramento así.',
  '%A ataca por debajo del brazo. %V cierra tarde, como siempre.',
  '%A le saca la risa a %V hasta que se queda sin voz. La voz vuelve. La compostura no.',
  '%A repite en el mismo punto. %V ya sabe cuál es, y eso lo hace peor.',
  '%V grita que no. El cuerpo dice otra cosa y %A le hace caso al cuerpo.',
  'Las cosquillas duran lo que %A quiera. %V solo pone el cuerpo.',
  '%A le hace cosquillas a %V hasta el suelo. El suelo no entraba en el plan de %V.',
  '%V da manotazos al aire. El aire no tiene la culpa y %A tampoco se aparta.',
  'Con una mano le bastaba para %V. %A usa las dos porque puede.',
  '%A deja a %V llorando de risa, que es llorar igual pero con excusa.',
  '%A encuentra el punto exacto de %V a la primera. %V no sabía ni que tenía punto.',
  'Las costillas de %V no estaban preparadas para %A. Nunca lo están.',
  '%A hace cosquillas, %V hace ruido. Reparto justo.',
  '%V se dobla por la mitad delante de %A. La mitad de arriba se rinde primero.',
  '%A le hace cosquillas a %V con dos dedos. %V se rinde con los dos, y sobraba uno.',
  'Diez segundos de %A y %V ya está negociando. Desde el suelo se negocia peor.',
  '%A insiste. %V ya no distingue si se ríe o se ahoga, y el grupo tampoco.',
  'Cosquillas hasta que %V pide tregua. La tregua llega cuando %A se aburre.',
];

// DE LA MANO. El gesto mas inocente de la lista y por eso el mas incomodo: no
// pasa nada, y justo por eso %V le da mil vueltas. El chiste es la lectura de
// mas, no el contacto.
const HANDHOLD = [
  '%A le agarra la mano a %V y %V no la suelta primero. Soltar primero era lo fácil.',
  'Las manos de %A y %V se cruzan. %V tarda medio segundo de más en soltar y ese medio segundo lo vio el grupo entero.',
  '%A toma la mano de %V. %V no la retira. Retirarla era un movimiento de nada.',
  '%A le toma una mano a %V. %V no sabe qué hacer con la otra.',
  '%A entrelaza los dedos con %V y %V cierra los suyos encima. Los cerró primero.',
  'La palma de %V está sudando. %A no dice nada. No hace falta.',
  '%A agarra a %V de la mano y tira. %V va detrás sin preguntar a dónde.',
  '%A y %V se dan la mano y no suelta ninguna de las dos. Quien suelte primero pierde, y %V ya está calculando.',
  '%A le busca la mano a %V por debajo de la mesa. La mesa no tapa nada aquí.',
  '%V mira la mano. Luego a %A. Luego otra vez la mano. Sigue sin entender qué pasó.',
  '%A le da la mano a %V con una seguridad que %V no discute. No discutir es la respuesta.',
  'Dedos cruzados con %V. %A ya piensa en el siguiente paso y %V va a decir que sí.',
  '%A sujeta la mano de %V como quien sujeta algo suyo. %V no corrige el detalle.',
  'La mano de %V encaja en la de %A. Eso es lo que más le molesta.',
  '%A no suelta a %V. %V tampoco insiste demasiado en que suelte.',
  'Un apretón corto de %A y %V devuelve otro sin pensarlo. Pensarlo vino después.',
  '%A le coge la mano a %V delante de todos y %V no la retira. No retirarla, delante de todos, es lo que cuenta.',
  '%V afloja los dedos para probar. %A aprieta. Se acabó la prueba.',
  '%A y %V de la mano. %A elige la dirección y %V no la discute, y así hasta la puerta.',
  'La mano de %A llega primero. %V solo tenía que dejarse.',
  '%V se queda con la mano tendida un segundo de más. %A la recoge. Ese segundo cuenta.',
  '%A camina y %V va detrás de la mano, con pasos cortos y sin preguntar a dónde.',
  'La mano de %A sobre la de %V, y una conversación que se acabó de golpe. La de %V.',
  '%A le agarra la mano a %V y la aprieta una vez. Una vez es un mensaje entero.',
  '%A no suelta y %V mira alrededor a ver quién lo ha visto. Lo han visto todos.',
  'El pulgar de %A recorre el dorso de la mano de %V. Ahí ya no hay malentendido posible.',
  '%A ofrece la mano. %V la toma sin pensar y pasa el resto del día pensándolo.',
  '%A y %V se quedan de la mano más rato del que hacía falta. Hacía falta cero.',
  '%A tiene la mano fría. La de %V no, y eso lo delata.',
  'Manos cruzadas entre %A y %V. El grupo hace como que no mira. Mira.',
];


// MIRAR FIJO. La unica accion de la lista en la que no se toca a nadie y aun
// asi es la mas invasiva. %A no hace nada; el que se descompone es %V.
const STARE = [
  '%A se queda mirando a %V. Sin parpadear. %V empieza a repasar qué hizo mal.',
  'La mirada de %A no se mueve de %V. Los diez segundos más largos del grupo.',
  '%A mira a %V fijo. %V mira al suelo. La conversación terminó ahí.',
  '%A observa a %V sin decir nada y %V empieza a explicarse sin que nadie pregunte.',
  'Ojos clavados en %V. %A no pestañea y %V ya está reordenando la silla.',
  '%A mira a %V como quien lee algo que no debería estar viendo.',
  '%V nota la mirada antes de girarse. Cuando se gira, %A sigue ahí.',
  '%A no aparta la vista. %V se toca el pelo, se aclara la voz, se rinde.',
  'Una mirada larga de %A a %V. Larga de las que ya no son curiosidad.',
  '%A estudia a %V de arriba abajo. %V se cambia de postura dos veces y ninguna sirve.',
  '%V pregunta qué pasa. %A sigue mirando. La respuesta era esa.',
  '%A mira a %V mientras habla otra persona. La otra persona ya no importa.',
  'El grupo entero nota que %A está mirando a %V. %V va con retraso, como siempre.',
  '%A clava la vista en %V y sonríe medio segundo. Ese medio segundo va a durar semanas.',
  '%V intenta sostenerle la mirada a %A. Dura poco y se le nota el esfuerzo.',
  '%A mira. Solo eso. A %V le está costando más que un insulto.',
  'Los ojos de %A encima de %V toda la tarde. %V no ha dicho nada desde entonces.',
  '%A mira a %V con la cabeza ladeada. Ladear la cabeza es lo que hace la gente antes de decidir algo.',
  'La vista de %A se queda en %V un rato después de que %V dejara de hablar.',
  '%A mira fijo. %V se ríe sin motivo y la risa se le apaga sola a mitad.',
  '%A no dice ni una palabra y ya ha dicho más que %V en todo el día.',
  '%V se aparta un poco. %A gira la cabeza lo justo para seguir mirando.',
  'Mirada de %A sobre %V, larga y sin explicación. Nadie pide explicaciones aquí.',
  '%A mira a %V desde el otro lado. La distancia no ayuda nada a %V.',
  '%A no aparta la vista. %V culpa al calor del color que le sube. No hace calor.',
  '%A observa a %V como se observa algo que se va a comprar.',
  '%V mira el móvil para escapar. %A sigue ahí cuando lo levanta.',
  '%A entrecierra los ojos mirando a %V. Peor todavía.',
  'La mirada de %A aguanta hasta que %V dice una tontería para romperla. La tontería quedó grabada.',
  '%A mira a %V y no explica nada. %V lleva desde entonces buscando la explicación.',
];

// REIRSE. La unica accion que no toca a %V y le deja marca igual: la burla
// delante del grupo. El chiste NO es el chiste de %V — es que %V no lo era.
const LAUGH = [
  'La risa de %A empieza cuando %V termina de hablar. %V lo entiende a la tercera.',
  'La carcajada de %A llega antes de que %V termine la frase. La frase ya no hace falta.',
  'A %A se le dobla la risa por la mitad. %V todavía cree que estaban hablando en serio.',
  '%V dice algo. %A se ríe. Nadie más se rió, y eso es peor que si nadie se hubiera reído.',
  'Una risa seca de %A, mirando a %V. Seca es la que duele.',
  'Se ríe %A. Se ríe el grupo. %V hace como que también.',
  'Sin taparse la boca y sin apartar la cara: %A se ríe encima de %V, que es lo que lo convierte en un gesto.',
  '%V esperaba otra reacción de %A. Recibió esta.',
  'De tanto reírse, %A ya no puede explicar de qué. %V lleva un rato sospechándolo.',
  'La risa de %A dura más de lo que %V puede aguantar sin cambiar de tema.',
  'A %A se le escapa una carcajada fea. Lo que la sacó fue algo que %V dijo en serio.',
  '%V cuenta algo importante. %A se ríe. Ahí se cayó la importancia.',
  'Con toda la calma del mundo, %A se ríe de %V. La calma es la parte cruel.',
  '%V pregunta qué pasa. %A no puede contestar de la risa.',
  '%A se ríe y señala a %V. Señalar es innecesario y por eso lo hace.',
  'La risa se para de golpe. %A mira a %V y arranca otra vez.',
  '%A se ríe de %V y luego pide perdón. El perdón llega entre carcajadas, así que no vale.',
  '%A no explica el chiste y nadie más lo intenta. %V pregunta dos veces y se queda sin respuesta.',
  'Dos segundos de aguantarse por educación, y %A suelta la risa encima de %V. Dos segundos es todo lo que da la educación.',
  '%A arranca y %V se ríe también, un poco tarde y sin ganas. Se le nota.',
  'Hasta quedarse sin aire, mirando a %V. %A recupera el aire, vuelve a mirar y vuelve a empezar.',
  'Nadie se atrevía. %A se ríe de %V y el grupo aprende que se podía.',
  '%V no dijo nada gracioso. %A se ríe igual y eso es lo que da miedo.',
  'La risa de %A rebota en la conversación y la deja muerta. %V estaba en medio.',
  'Ni mirar hace falta: %A se ríe de %V con los ojos cerrados.',
  '%V intenta seguir hablando por encima de la risa de %A. Mala idea, mal momento.',
  '%A se ríe, se calma, mira a %V y se vuelve a ir. Van tres veces.',
  '%A se ríe de %V con esa risa que se contagia. Se contagió a todos menos a %V.',
  '%V se cruza de brazos. %A se ríe más fuerte. Cruzarse de brazos nunca funcionó.',
  'Nadie pide perdón aquí. %A se ríe de %V y %V se ríe medio segundo tarde, para no quedarse fuera.',
];

// LANZAR. Violencia comica, sin sangre: lo que duele es lo que dice el gesto.
// Se lanza lo que sobra, y el remate esta casi siempre en lo que %A hace
// DESPUES: sacudirse las manos, no mirar, seguir a lo suyo.
const YEET = [
  '%A lanza a %V por los aires. La parte de subir sale bien. La otra no.',
  '%V sale volando. %A ni mira dónde cae.',
  '%A agarra a %V y suelta a distancia. La distancia es generosa.',
  '%A manda a %V fuera de la escena por el aire. Vuelve andando, que es más lento y más humillante.',
  '%A tira a %V como quien se deshace de algo. La comparación es la comparación.',
  'Un impulso y %V ya no está donde estaba. %A tampoco lo echa de menos.',
  '%A lanza a %V y se sacude las manos. Sacudirse las manos es el remate.',
  '%V describe un arco cortesía de %A. El arco es bonito, el final no.',
  '%A se deshace de %V con las dos manos. %V pesa lo justo para llegar hasta la puerta.',
  '%A suelta y %V aterriza. Aterrizar es un decir.',
  '%A lanza a %V fuera del encuadre. %V vuelve a pie y llega cuando ya se hablaba de otra cosa.',
  'El vuelo que le da %A a %V dura poco. Lo que dura es lo que viene después.',
  '%A levanta a %V y suelta. %V no llegó a preguntar por qué.',
  '%A lanza, %V vuela y el grupo mira. Nadie se mueve a recoger a %V.',
  '%A tira a %V con puntería. Eso es lo preocupante: había puntería.',
  '%V se va por el aire con la frase a medias. A %A no le interesaba el final.',
  '%A lanza a %V al otro lado. Al otro lado hay una mesa, y la mesa no se aparta.',
  '%A tira a %V y se oye el impacto antes que la queja. La queja llega tarde y sola.',
  '%A carga a %V y suelta como si %V pesara menos de lo que pesa.',
  '%A manda a %V a hacer el recorrido entero sin tocar el suelo. El suelo espera.',
  '%A lanza a %V y ya está mirando a otro lado antes de que caiga.',
  'El lanzamiento de %A a %V sale limpio. La caída de %V no.',
  '%V le pide a %A bajar. Bajaba igual, solo que no como quería.',
  '%A se quita a %V de encima a lo grande. A lo pequeño no habría sido lo mismo.',
  'Dos metros de vuelo que le regala %A a %V. %V aterriza con el móvil todavía en la mano.',
  '%A tira a %V y el grupo hace el ruido ese que se hace. %V lo escuchó desde el suelo.',
  '%V se levanta y se sacude mientras %A ni mira. Sacudirse no arregla lo que acaba de pasar.',
  '%A manda a %V lejos de un tirón. %V se levanta pisando la mitad de lo que llevaba encima.',
  '%A lanza y el aire no opone resistencia. %V tampoco.',
  '%A lanza a %V, se da la vuelta y sigue con lo suyo. Lo suyo nunca fue %V.',
];

// DISPARAR. La mas seca de todas. Frases cortas, sin adornos: se dispara y se
// acabo la conversacion. El humor esta en la calma de %A, no en la sangre.
const SHOOT = [
  '%A le dispara a %V. Sin discurso previo, que los discursos los da quien duda.',
  'Un disparo de %A y %V se sienta en el suelo despacio, como si eso lo arreglara.',
  '%A apunta a %V. %V empieza a explicarse. %A dispara a mitad de la explicación.',
  '%V no vio venir el gesto. Nadie lo ve venir de %A.',
  '%A le dispara a %V y sopla el humo. Lo de soplar el humo es innecesario y por eso lo hace.',
  '%A dispara y %V cae hacia atrás con cara de no entender nada. Llevaba media hora buscándoselo.',
  '%A le mete un tiro a %V y sigue como si nada. Como si nada es el estilo.',
  '%V pregunta por qué con un hilo de voz. El agujero contesta antes que %A.',
  '%A le dispara a %V desde lejos. Ni se molestó en acercarse.',
  'Un tiro limpio a %V. Limpio para %A, no para %V.',
  '%A saca, apunta y dispara antes de que %V termine el saludo.',
  '%A ya ha guardado el arma y %V todavía se mira el pecho. Sigue sin creérselo.',
  '%A dispara. %V se apoya en la pared. La pared aguanta más que %V.',
  'El disparo de %A suena una vez. %V lo va a oír durante un rato.',
  '%A le dispara a %V y guarda el arma sin prisa. %V todavía está buscando dónde apoyarse.',
  '%V ni siquiera le había hecho nada a %A. Es que no hacía falta.',
  '%A dispara a bocajarro y la camisa de %V cambia de color antes que la cara.',
  '%A dispara, %V da dos pasos y se sienta. Sentarse fue lo más digno que le quedaba.',
  '%A apunta bien. %V lleva toda la vida siendo un blanco fácil.',
  'Un tiro de %A a %V y el silencio del grupo. El silencio dura más que el tiro.',
  '%A le dispara a %V y %V se mira las manos buscando dónde. Está más abajo.',
  '%V estaba hablando cuando %A disparó. Ya no.',
  '%A le vacía el cargador a %V. Con el primero ya sobraba: %V se cayó en el primero.',
  '%A dispara y %V se lleva la mano al pecho como en las películas. Aquí no hay cámara lenta.',
  '%A le dispara a %V y se encoge de hombros. El grupo se ríe antes que %V.',
  'El arma de %A apuntaba a %V desde hacía un rato. %V no miró.',
  '%A dispara a %V y el eco tarda en irse. %V también.',
  '%A dispara y %V se queja del ruido. Del ruido, fíjate.',
  '%A le dispara a %V con la puntería de quien lo tenía pensado.',
  'Un disparo, %V en el suelo y %A recogiendo sus cosas. El orden es ese.',
];

// DAR DE COMER. Parece la mas tierna y es una de sumision: quien abre la boca
// pierde. El chiste es que %V acepta, no que %A ofrezca.
const FEED = [
  '%A le da de comer a %V en la boca. %V abre la boca antes de que llegue la cuchara.',
  '%A acerca la cuchara. %V la acepta sin rechistar, como se acepta todo aquí.',
  '%V come de la mano de %A. La expresión existe justo para esto.',
  '%A le mete un bocado a %V. %V mastica y da las gracias, que es lo que más se le nota.',
  'Un tenedor camino de la boca de %V. %A conduce.',
  '%A alimenta a %V como quien cuida algo suyo. %V abre la boca sin que se lo pidan.',
  '%V estira el cuello para llegar al bocado de %A. Nadie le acercó el plato y aun así llega.',
  '%A le da de comer a %V delante del grupo. El grupo saca conclusiones y ninguna favorece a %V.',
  '%V le dice a %A que no tiene hambre. Come igual.',
  '%A prueba primero y luego le da a %V. %V come lo que %A ya decidió que estaba bueno.',
  'Un bocado de %A y %V se calla un rato. Funciona mejor que hablar.',
  '%A limpia la comisura de %V con el pulgar. %V ni se mueve para dejarle hacerlo.',
  '%V come lo que le pongan. %A se ha dado cuenta.',
  '%A le da de comer a %V y le sujeta la barbilla. La barbilla no hacía falta.',
  '%A termina el plato. %V no eligió ni un bocado.',
  '%A acerca la comida y la aparta un centímetro cuando %V se lanza. Solo una vez, para verlo.',
  '%V mastica despacio, pensando en lo que le acaba de aceptar a %A.',
  '%A le da de comer a %V en público. %V mira a los lados y abre la boca igual.',
  '%A acerca el bocado, %V lo toma, y nadie comenta nada. El silencio comenta bastante.',
  '%A alimenta a %V con una paciencia que a %V le debería preocupar.',
  '%V cierra los ojos al comer. Cerrar los ojos delante de %A es mucha confianza.',
  '%A le da un bocado a %V y se queda mirando cómo lo traga.',
  '%A retira la cuchara y %V se lleva la mano a la boca, tarde. Ya lo vieron.',
  '%A reparte comida: a los demás en el plato, a %V en la boca. %V no pidió el cambio y no lo rechaza.',
  'Una cucharada más de la cuenta. %A la ofrece sin preguntar y %V la acepta sin pensar.',
  '%A le da de comer a %V y %V se apoya un poco. Apoyarse no venía con el bocado.',
  '%V come de %A rápido, como si alguien se lo fuera a quitar. Nadie se lo iba a quitar.',
  '%A sopla el bocado antes de dárselo a %V. No quemaba. %V espera igual a que sople.',
  '%V se relame. %A lo apunta mentalmente para otro día.',
  '%A termina de darle de comer a %V y le da una palmada en la mejilla. %V acepta la palmada también.',
];

// EL FINAL. Registro de FUCK y ANAL: explicito de verdad, no insinuado. Lo que
// cambia es el momento — aqui ya paso todo y lo que se cuenta es como queda
// %V: lo que traga, lo que le chorrea, los dos segundos de mas que sigue ahi.
//
// Y el chiste sigue apuntando a %V. %A acaba y se va; el que se queda con la
// escena encima es el otro.
const CUM = [
  '%A se corre encima de %V. Sin avisar, que avisar era para otra clase de escena.',
  '%A acaba en la cara de %V. %V ni se aparta, y eso lo cuenta todo.',
  '%V termina con la cara pringada y el grupo entero de testigo. %A ya se está subiendo la ropa.',
  '%A acaba y se aparta. %V se queda decidiendo qué hacer con lo que le han dejado encima.',
  'Le chorrea por la barbilla a %V. %A mira cómo baja y no ayuda.',
  '%A revienta encima de %V. Lo que sale es de %A, la vergüenza es de %V.',
  '%V abre la boca sin que nadie se lo pida. %A no desaprovecha una invitación así.',
  '%A se corre y %V traga. Tragó antes de decidirlo, que es lo peor.',
  'A %V le queda en el pelo lo de %A. Se va a acordar cada vez que se lo lave.',
  '%A acaba sobre %V y le da dos palmaditas en la mejilla. Las palmaditas eran lo humillante.',
  '%A se vacía encima de %V. %V no ha dicho una palabra desde entonces.',
  '%V se lo limpia con el dorso de la mano y se queda mirándolo. %A ya estaba en otra cosa.',
  '%A se corre en el pecho de %V y lo esparce con un dedo. Ese dedo sobraba y ahí está.',
  '%V recibe lo de %A con los ojos cerrados. Cerrarlos fue lo único que pudo elegir.',
  '%A termina y %V sigue de rodillas dos segundos de más. Esos dos segundos los vio el grupo.',
  'Le cae en la lengua a %V. %A espera a que trague para retirarse.',
  '%A acaba sobre %V y suspira. El suspiro es de alivio y no es de %V.',
  '%V queda goteando. %A le pasa el pulgar por el labio y lo empuja para dentro.',
  '%A se corre y el ruido que hace %V no era el que tenía ensayado.',
  'Le llega a la garganta a %V. %A cuenta hasta tres antes de soltarle la cabeza.',
  '%A se corre y sale del encuadre. %V se queda ahí, con lo puesto.',
  '%V intenta hablar con lo que le dejó %A dentro. Lo que sale no son palabras.',
  '%A acaba en el estómago de %V y lo deja escurrir. Nadie tenía prisa por limpiarlo.',
  '%V se pasa la lengua por el labio y mira alrededor. %A ya se ha ido, y %V se acordó tarde de que había gente.',
  '%A termina encima de %V y se queda mirando. %V no se atreve a levantar la cara todavía.',
  'Lo de %A se le seca en las pestañas a %V. Parpadea y solo lo empeora.',
  '%A se corre y %V da las gracias. Nadie le enseñó eso, le salió solo.',
  '%V lo aguanta todo sin cerrar la boca. %A no le da opción de cerrarla.',
  '%A acaba sobre %V, se aparta y no vuelve a mirar. Lo peor de la escena es esa parte.',
  'Queda un hilo entre %A y %V. %V lo corta con la mano y se le queda en los dedos.',
];

// MORDISQUEAR. El registro que pidio el dueño: sumision sin violencia. Lo que
// se cuenta no es el mordisco, es que %V NO SE APARTA — ladea la cabeza, ofrece
// la mano, se acerca en vez de retirarse. La decision de %V es el chiste.
const NOM = [
  '%A le pega un mordisquito a %V y no acaba de soltar. %V deja de moverse, que es lo que se pedía.',
  '%A muerde despacio la oreja de %V. Despacio es la palabra que importa aquí.',
  '%A le mordisquea el cuello a %V y %V aguanta sin moverse. Aguantar era una opción. La eligió.',
  '%A prueba a %V como quien decide si se lo queda.',
  'Un mordisco corto de %A en el hombro de %V. %V ni protesta, solo se acomoda.',
  '%A mordisquea a %V y %V ladea la cabeza sin que se lo pidan. La cabeza fue más rápida que %V.',
  '%A le muerde el dedo a %V con los dientes justos. Ni fuerza, ni permiso.',
  '%V ofrece la mano sin pensarlo. %A se la mordisquea y %V la deja ahí.',
  '%A pellizca con los dientes el cuello de %V. %V cierra los ojos como si eso ayudara.',
  '%A le mordisquea la mejilla a %V y se aparta un centímetro. %V se queda esperando el siguiente.',
  '%V dice que pare, con la boca de %A todavía encima. Suena a otra cosa.',
  '%A muerde a %V despacio y sin ganas de terminar. %V ya no tenía prisa tampoco.',
  '%A le come el labio a %V un segundo. Un segundo de más para lo que era.',
  '%V se ríe al principio del mordisco de %A. Deja de reírse a mitad.',
  '%A mordisquea a %V con esa calma de quien sabe que no le van a apartar.',
  '%A le muerde la clavícula a %V. %V mira al techo y se queda con eso.',
  '%V no aparta el brazo mientras %A lo mordisquea. Apartarlo era una opción y estaba ahí.',
  '%A muerde y suelta. Muerde y suelta. %V ya lleva el ritmo.',
  '%A le mordisquea el pulgar a %V. %V se lo deja hasta que %A se cansa.',
  'El mordisquito de %A no deja nada. %V se toca el sitio media hora buscando lo que no hay.',
  '%V respira distinto desde que %A empezó. Nadie más lo ha notado. %A sí.',
  '%A muerde a %V donde nadie muerde por accidente.',
  '%V se deja mordisquear de arriba abajo por %A y solo dice que le hace cosquillas. No era eso.',
  '%A le pasa los dientes por el cuello a %V sin llegar a apretar. La amenaza es la mitad del gesto.',
  '%A mordisquea a %V y %V se acerca en vez de apartarse. Apartarse estaba a un centímetro.',
  'Un mordisco de %A en la nuca de %V. A %V se le olvida lo que estaba diciendo.',
  '%A muerde suave y %V traga saliva. El grupo lo vio tragar.',
  '%A le mordisquea la muñeca a %V mientras %V sigue hablando. %V deja de hablar solo.',
  '%V pone el cuello. %A lo aprovecha. Nadie discutió el reparto.',
  '%A termina el mordisco con la lengua. %V ya no sabe dónde mirar.',
];

// EL PIQUITO. Lo mas corto de la lista y por eso funciona: medio segundo de
// contacto y %V se queda esperando el resto. El chiste esta en la ASIMETRIA —
// %A ya esta en otra cosa y %V sigue ahi.
const PECK = [
  '%A le da un piquito a %V y se aparta. %V se queda con la boca en el aire.',
  'Medio segundo de beso de %A. %V lleva desde entonces esperando el otro medio.',
  '%A besa a %V rápido y sigue andando. %V no ha seguido andando.',
  'Un piquito corto de %A. A %V se le corta la frase por la mitad.',
  '%A le roba un beso a %V y ni se para a mirar la cara que pone. La cara valía la pena.',
  '%V cierra los ojos tarde. %A ya se había ido.',
  '%A le da un beso en la comisura a %V. Fallar ahí es fácil y %A no falla.',
  '%V pone la mejilla. %A va a la boca. Nadie corrigió a nadie.',
  '%A besa a %V como quien firma algo. %V no leyó lo que firmaba.',
  'Un piquito de %A y %V se queda tres segundos sin decir nada. En este chat eso es una eternidad.',
  '%A besa a %V en la frente y le suelta la cara. Lo de la frente es peor que en la boca.',
  '%V se toca el labio después. %A ya está hablando de otra cosa.',
  '%A le da un beso rápido a %V delante del grupo. Nadie ha vuelto a mirar el móvil.',
  '%V dice que no valía. %A no lo repite, y ahí %V aprende algo.',
  '%A besa a %V y le da un toque en la barbilla. Lo segundo sobraba y por eso lo hizo.',
  'Un beso de un segundo de %A. %V lo ha guardado como si fuera más largo.',
  '%A le da un piquito a %V a media frase. La frase no se termina nunca.',
  '%V se queda esperando con los ojos cerrados. %A deja que espere un poco.',
  '%A besa a %V, se aparta y se ríe. Reírse después es lo que lo remata.',
  'A %V le sube el color por medio segundo de %A. Medio segundo salió caro.',
  '%A le da un beso corto a %V y le aprieta el brazo al mismo tiempo. El brazo dice más que el beso.',
  'Un piquito y ya. %V se queda mirando a %A como se mira lo que se quiere otra vez.',
  '%A besa a %V en la nariz. %V no sabe qué hacer con eso y no lo va a saber en toda la tarde.',
  '%A se acerca, besa a %V y vuelve a su sitio. %V sigue con la cara donde la dejó.',
  '%V busca el segundo beso. %A ya está en otra conversación.',
  '%A le da un piquito a %V y se queda mirando antes de soltar. %V baja la vista primero.',
  '%V responde tarde al beso de %A. Para cuando reacciona, %A ya está en otra conversación.',
  '%A besa a %V sin avisar. Avisar habría estropeado la única parte buena.',
  'Un beso corto entre %A y %V, y el grupo entero haciendo como que no. Nadie hace como que no.',
  '%A besa a %V y le deja el labio brillando. %V no se lo limpia.',
];

module.exports = { HUG, NOM, PECK, CUM, TICKLE, HANDHOLD,  STARE, LAUGH, YEET, SHOOT, FEED, KISS, CUDDLE, PAT,  PUNCH, SLAP, BITE, KICK, BONK, FUCK, ANAL, ROAST_USUARIO };
