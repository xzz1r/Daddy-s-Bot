// Frases de los comandos de acción: *!hug*, *!kiss*, *!punch* y compañía.
//
// %A = quien hace la acción      %V = quien la recibe
//
// Los dos se sustituyen por una mención. No hay más: `npm run placeholders`
// revienta con cualquier otro. ROAST_USUARIO solo lleva %A: si aparece %V,
// sale crudo en el grupo. Lo salta el propio comando para el dueño: ver
// hazAccion en src/commands/acciones.js.
//
// ─── EL TONO ─────────────────────────────────────────────────────────────────
//
// Manda GUIA.md 5 bis, y el corte es este:
//
// 1. LA ACCIÓN SE REPRODUCE NORMAL. %A le hace el gesto a %V. El gif ya se ve,
//    la frase comenta la escena (público, duración, sonido), no la vuelve a
//    contar y no la convierte en otra cosa. Un beso es un beso.
// 2. LO GUARRO VA EN LOS SEXUALES. FUCK carga el texto entero. El gif es
//    anime al azar, así que la frase comenta y no receta un plano: si describe
//    un azulejo, un coche o una postura, la imagen no va a coincidir.
// 3. EL CHISTE DE LA ACCIÓN ES %V, NUNCA %A. A quien gana no se le quita.
// 4. EL ROAST ES OTRA LÍNEA. Va debajo, en cursiva, y no habla del gesto:
//    se ríe de que %A lo haya hecho a través de una pantalla.
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
  '%A se folla a %V. Ni una disculpa. Ni falta que hace.',
  '%A se lleva a %V y ninguno de los dos vuelve a mirar igual al resto.',
  '%A se lo hace a %V delante del grupo. El chat entero se hace el sueco.',
  '%A se mete en %V hasta el fondo. Doce meses de tensión resueltos en dos minutos y en el gemido de %V.',
  '%A revienta a %V. Mañana %V va a escribir aquí como si el culo no le doliera. Le duele. Se le lee.',
  '%A se corre y %V da las gracias. Ahí está todo el vínculo, resumido. Qué asco de altar.',
  '%A se lo folla a %V como llevaba meses contándolo por privado. Al final era verdad.',
  '%A deja a %V con la polla todavía en la cabeza. Se le ve en cómo se sienta después.',
  '%A folla a %V hasta que se le va la voz. La voz era lo decente. Ahora gime, joder, y ya.',
  '%V anda como el chiste. El chiste lo lleva dentro. %A no pregunta. Se le ve en el paso.',
  '%A se corre dentro de %V y no saca. El problema de %V, de cintura para abajo, tiene nombre. Qué asco de recuerdo.',
  '%A le parte el culo a %V. Mañana se sienta de lado y finge una contractura. Nadie se la cree.',
  '%V pide más. El más es polla. %A se la da. El grupo oye el más, qué asco de altavoz.',
  '%A se lo clava a %V sin romance y sin prisa de irse. %V tampoco tiene prisa. Los dos mienten luego.',
  '%A deja a %V hecho un desastre y %V se viste encima. El resto del día es un secreto que se le pega a la piel, guarro y suyo.',
  '%A folla a %V hasta vaciarse y le pide otra ronda. %V dice basta y abre. Mentiroso de coño.',
  'A %V se le olvida el nombre. %A se lo va recordando. A hostia de cadera. Joder.',
  '%A se corre en %V y le pide que no se limpie todavía. %V no se limpia. Qué asco de bueno.',
  '%A se lo clava a %V sucio y sin avisar más. %V avisa después, con un gemido que no iba a soltar.',
  '%A se corre y besa a %V después. %V traga la prueba. El beso sabe a los dos. Qué asco tan rico.',
  '%A se acaba en %V. %V se acaba en %A. Luego los dos escriben como si nada. Joder.',
  '%A no pregunta cómo está %V. Se le ve. Se le oye. Se le nota al sentarse. Puta cojera de cama.',
  '%A se lo monta con %V sin quitar ni la vergüenza. La de %V queda en el suelo. La polla, no.',
  '%A llena a %V y %V se va así. El secreto se escurre solo. Qué vicio. Qué miseria tan rica.',
  '%A se folla a %V hasta que %V pide que pare. No pares. Pide otra cosa. %V pide otra cosa.',
  '%A se corre pensando en %V desde hace tiempo. Hoy no piensa: se lo folla. %V se entera de golpe.',
  'Lo de %A y %V no cabe en una frase educada. Cabe en cómo se sienta %V mañana y en lo que no va a contar.',
  'Sucio, rápido y sin hablar. %A se folla a %V. El hablar era lo que sobraba. %V gime y ya está dicho.',
  '%A se corre dentro y %V se viste. Prioridades, coño. El resto del día le recuerda quién fue.',
  '%A usa a %V y %V se deja usar. Cinco minutos. O veinte. %V pide otra ronda, el muy guarro.',
];

// Se pega DEBAJO de la frase de la acción, en cursiva, y no habla de la acción:
// habla de quien la ha pedido. Se ríe de que lo haya hecho a través de una
// pantalla, no en persona.
//
//   · El objetivo es SIEMPRE %A. Nunca %V.
//   · No repitas el chiste de arriba.
//   · Nada de "eres un pringado" a secas. El chiste está en el retrato:
//     qué clase de persona abre el chat para hacerle a alguien, en un
//     rectángulo, lo que no le hace a dos metros con el cuerpo.
//   · Sirve para las once, así que no menciones ninguna en concreto.
// ─── ROAST_USUARIO: HAY QUE REESCRIBIRLO. GROK ──────────────────────────────
//
// Estas sesenta están escritas y funcionan, pero son un molde. No es opinión:
// `npm run progreso` lo mide y lo saca en el apartado MOLDE.
//
//   · TREINTA DE LAS SESENTA CIERRAN CON LA MISMA FORMA: «<insulto> de <cosa>».
//     Pringado de brillo. Cutre de wifi. Escoria de platea. Don nadie de
//     bolsillo. Un pool sano del bot repite su forma de cierre entre el 3 % y
//     el 19 % de las veces. Este va al 50 %.
//   · CUARENTA Y DOS DE LAS SESENTA TIRAN DE LA MISMA IMAGEN: el cristal, la
//     pantalla, el rectángulo, el bolsillo, el teclado. Es la regla 1 de
//     GUIA 5 bis —la variación de una sola tesis— y es EL rastro de máquina:
//     cien versiones del mismo chiste en vez de cien chistes.
//   · DIECINUEVE DE LAS SESENTA LLAMAN «él» A QUIEN ESCRIBE. Ver la regla 5 de
//     arriba.
//
// Y ESTE POOL ES EL QUE MENOS SE LO PUEDE PERMITIR, porque no sale de vez en
// cuando: sale DEBAJO DE CADA ACCIÓN, once comandos, todas las veces. Es la
// línea del bot que más se lee, así que es la primera donde el grupo va a oír
// que detrás no hay nadie.
//
// QUÉ SE PIDE: los mismos sesenta, reescritos. El encargo no cambia —el retrato
// de quien paga 60 de aura por mandar un abrazo animado a alguien que tiene a
// dos metros— pero el retrato tiene más de un ángulo, y ahora mismo solo se
// está usando uno. La pantalla ya está contada. Quedan la cuenta, la hora, el
// historial, lo que espera después de mandarlo, lo que hace cuando no contestan,
// a cuánta gente se lo ha mandado ya, y lo que dice de él que esto le parezca
// un plan.
//
// CÓMO SE COMPRUEBA, sin preguntarme a mí:
//
//   npm run progreso        ← el apartado MOLDE tiene que bajar del 30 %
//
// Y las de siempre: `npm run check && npm run placeholders`. Los otros once
// pools están bien: no los toques.
const ROAST_USUARIO = [
  '%A ha pagado aura para no levantarse. El saldo baja. El culo sigue en el sofá.',
  '%A tenía a alguien a un giro de cuello. Ha girado el pulgar. El cuello no ha girado.',
  '%A manda y se queda mirando el visto. El visto no es una visita.',
  'A las tres de la mañana %A se atreve. A esa hora el pasillo no pide nada.',
  '%A espera respuesta como quien espera un pedido. El pedido era una persona. Sigue en camino.',
  '%A ya está pensando la siguiente. Esta ni se ha enfriado.',
  '%A lleva tres nombres hoy. El cuarto está a un metro y no se ha enterado.',
  '%A mira el saldo antes de elegir a quién. La valentía depende de lo que quede. Qué asco de presupuesto.',
  '%A ha disparado al grupo para no girarse. Nadie se ha vuelto.',
  '%A paga testigos. El grupo hace de público. Quien está al lado hace de mueble.',
  '%A no ha abierto la boca en todo el día. Esto es el aporte. El grupo toma nota del volumen.',
  '%A lo va a repetir en diez minutos. El primero no ha hecho nada. El segundo tampoco.',
  '%A elige a quien está en línea. En línea no es delante. Delante sigue sin visita.',
  'Misma mesa. %A ha necesitado un envío para saludar. La mesa no se ha enterado.',
  '%A lleva meses ensayando la frase. Hoy ha pagado para no decirla.',
  '%A comprueba si ha salido. Ha salido. El cuerpo sigue donde estaba.',
  '%A le debe un paso al pasillo. El pasillo sigue esperando.',
  '%A cuenta el aura que le queda para la próxima. La próxima es dentro de un rato.',
  '%A quiere que alguien comente, así no hay que hablar. El silencio ya era el plan.',
  '%A da los buenos días así. Ya no hay otra forma. Se ha olvidado la primera.',
  '%A podía haber llegado con la voz. Ha llegado un cargo. La voz se queda para nunca.',
  'Van cuatro y no es mediodía. El historial de %A es una ronda. La ronda no cierra.',
  '%A se ha recorrido media lista del grupo en una semana. Atajo. Hablar era el camino largo.',
  '%A espera a que el grupo mire y entonces dispara. Público de pago. Valor de alquiler.',
  '%A pone el teléfono boca abajo después. No deshace nada. Finge que sí.',
  '%A se ha ensayado delante del espejo. Luego ha abierto el chat. El espejo no cobra.',
  '%A no abre la boca. Paga para que se abra otra. La suya sigue cerrada.',
  '%A se queda debajo del mensaje como en un zaguán. Nadie abre. Sigue ahí.',
  '%A repite destino porque ayer dio atención. Ayer no era valentía. Hoy tampoco.',
  '%A gasta más aura en esto que saliva en la sala. Las cuentas cuadran. La sala, no.',
  '%A ha escrito el nombre, lo ha borrado y lo ha vuelto a poner. El drama no sale de la mano.',
  '%A encadena tres destinos. Reparto. Ninguno estaba lejos. Todos siguen igual de lejos.',
  '%A lo hace porque se lo han hecho. Cadena. El eslabón barato es este.',
  '%A deja que el envío socialice. Quien paga no socializa. Paga.',
  '%A manda y baja a otra conversación. Como quien huye por otra puerta. Esta no tenía puerta.',
  '%A ve bajar el aura y llama a eso atreverse. El cobro no es valor. Es una resta.',
  '%A lo programa para cuando hay gente mirando. Sin público no sale. Con público, esto.',
  '%A no levanta la cara después. La cara se queda en el envío. El envío ya se fue.',
  '%A ha convertido esto en el hola. El otro hola se ha jubilado. No se usaba.',
  '%A lo va a volver a hacer. Es el único plan. El grupo ya lo tiene memorizado.',
  '%A deja el recibo a la vista. El paso no aparece. El recibo es lo único que se mueve.',
  '%A elige a quien no puede irse del chat. El chat no tiene puerta. Por eso vale.',
  '%A menciona y llama a eso haberse acercado. Mencionar no recorre el metro. El metro sigue entero.',
  '%A no se ha movido. El sofá puede firmar. El envío también. La persona de al lado, no.',
  '%A ha tardado veinte minutos en elegir el nombre. Un segundo en pagar. El nombre no era el problema.',
  '%A no sabe qué hacer si contestan. Por eso espera que no contesten. El plan termina en el envío.',
  '%A quiere que el grupo vea que ha hecho algo. Ha hecho un cargo. El cargo no es un gesto.',
  '%A deja el teléfono en la mesa y finge que no ha sido. Ha sido. La mesa no miente.',
  'Silencio de todo el día. El aporte de %A es este cargo. El resto, cero.',
  '%A tiene a esa persona en la misma sala. Ha hecho falta pagar. La sala no cobraba.',
  '%A no mira al lado. Mira si pitan. El lado sigue ahí, sin visita.',
  '%A tiene el prefijo en la mano. Los pies no se han enterado. Los pies no van a enterarse.',
  '%A abre el historial y es una ronda de nombres. Siempre hay siguiente.',
  'Si no contestan, %A cambia de objetivo. Hay más en la lista. La lista es el valor.',
  '%A lo manda desde el váter. El váter no es un umbral. Es un váter.',
  '%A se esconde detrás del envío. El envío no tapa. Se le ve el cargo.',
  '%A manda y se queda a ver si duele. Si no duele, manda otra vez. El dolor era la medida. No hay.',
  '%A tiene más valor puesto en el saldo que en la voz. Por eso baja el primero. La voz no ha bajado nunca.',
  '%A lo ha convertido en hábito. Los hábitos se ven. Este también, y se ve mucho.',
  '%A llama plan a no moverse. El grupo le ha visto el plan. No había otro.',
];

module.exports = { HUG, KISS, CUDDLE, PAT, POKE, PUNCH, SLAP, BITE, KICK, BONK, FUCK, ROAST_USUARIO };
