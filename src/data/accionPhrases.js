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
  '%A abraza a %V y no suelta. %V podría soltarse. %V no se suelta.',
  '%A se lanza al cuello de %V y se queda colgada. %V aguanta el peso sin decir nada.',
  '%A abraza a %V por detrás y %V se recuesta hacia atrás sin pensarlo.',
  '%A aprieta el abrazo hasta que a %V le crujen las costillas. %V ni protesta.',
  '%V levanta los brazos para que %A la abrace mejor. Nadie le pidió esa ayuda.',
  '%A abraza a %V delante de todos. %V mira al suelo y se deja.',
  '%A rodea a %V con los brazos y le habla al oído. %V no se mueve y escucha.',
  '%A abraza a %V diez minutos. A %V se le duerme el brazo y no lo mueve.',
  '%V dice que ya vale. Lo dice con la cara pegada al pecho de %A.',
  '%A abraza a %V y le apoya la barbilla en la cabeza. %V encaja ahí como si tocara.',
  '%A no suelta a %V y %V deja de intentar irse a los tres segundos.',
  '%A abraza a %V como quien reclama algo suyo. %V no corrige a nadie.',
  '%V se deja abrazar sin devolver el abrazo. Devolverlo habría sido reconocerlo.',
  '%A abraza a %V hasta dejarla sin aire y %V pide otro cuando la suelta.',
  '%A abraza a %V por la cintura y la levanta un palmo. %V patalea de mentira.',
  '%V se pone rígida en el abrazo de %A y se ablanda a los dos segundos.',
  '%A abraza a %V y le pasa la mano por la espalda, despacio. %V cierra los ojos.',
  '%A abraza a %V y no dice por qué. %V tampoco lo pregunta.',
  '%V estaba enfadada. %A la abraza. %V sigue enfadada y abrazada.',
  '%A abraza a %V de lado, sin avisar. %V se acomoda en el hueco.',
  '%A suelta a %V y %V se queda medio segundo de más antes de apartarse.',
  '%A abraza a %V con las dos manos en la nuca. %V no mueve la cabeza ni un centímetro.',
  '%V se deja abrazar con los brazos caídos. %A no necesita que colabore.',
  '%A abraza a %V hasta que %V suspira. Ese suspiro es la rendición entera.',
  '%A abraza a %V en medio de la calle. %V mira quién los ve y no se aparta.',
  '%V ofrece los brazos primero. %A entra y ya no sale.',
  '%A abraza a %V y le aprieta la nuca. %V baja la cabeza sin que se lo digan.',
  '%A abraza a %V una vez y %V se pasa la tarde buscando el segundo.',
  '%V dice que no es de abrazos con los brazos de %A alrededor.',
  '%A abraza a %V y el grupo entero se entera. %V no lo desmiente.',
];

const KISS = [
  '%A besa a %V y %V abre la boca sin que se lo pidan.',
  '%A le come la boca a %V contra la pared. %V se agarra a la camisa y se deja.',
  '%A besa a %V a media frase. La frase no se termina nunca.',
  '%V dice que no delante de todos. %A la besa y %V no lo repite.',
  '%A le sujeta la cara a %V y la besa despacio. %V no mueve las manos de donde están.',
  '%A besa a %V y le muerde el labio al salir. %V se lo toca toda la noche.',
  '%A le mete la lengua a %V y %V se deja llevar entera.',
  '%V busca los labios de %A y %A la hace esperar un segundo. %V espera.',
  '%A besa a %V del cuello a la boca, sin prisa. %V solo aguanta la respiración.',
  '%A besa a %V delante del grupo. A %V le arde la cara y no se aparta.',
  '%V dice que ya está y sigue con la boca donde estaba.',
  '%A besa a %V con una mano en la nuca. %V no podría apartarse aunque quisiera, y no quiere.',
  '%A besa a %V y para de golpe. %V se queda pidiéndolo con los ojos.',
  '%V cierra los ojos antes de que llegue la boca de %A. Los cerró demasiado pronto.',
  '%A le come la boca a %V hasta dejarle el labio marcado. %V lo enseña.',
  '%A besa a %V despacio y %V se le acerca cada vez más sin darse cuenta.',
  '%A besa a %V en mitad de una discusión. %V pierde la discusión ahí mismo.',
  '%V se deja besar con las manos caídas. %A no necesita más permiso.',
  '%A besa a %V y le pasa el pulgar por la barbilla. %V abre más.',
  '%A la besa como si tuviera derecho. %V no lo discute.',
  '%V se limpia el labio después y se queda mirando a %A. Quiere otro.',
  '%A besa a %V con lengua en la cocina. Entra alguien y %V no se separa.',
  '%A besa a %V y le sube la mano a la cara. %V se deja girar la cabeza.',
  '%V dice que le huele la boca a %A toda la noche. No se lava.',
  '%A besa a %V y %V suelta un ruido bajito. El grupo lo oye.',
  '%A besa a %V y se queda a un dedo esperando. %V recorre ese dedo.',
  '%V jura que fue un beso de nada. Lo jura sin convencer a nadie.',
  '%A besa a %V por sorpresa y %V se agarra a ella para no caerse.',
  '%A le come la boca a %V hasta que a %V se le doblan las rodillas.',
  '%A besa a %V y la suelta. %V tarda en volver a la conversación.',
];

const CUDDLE = [
  '%A se acurruca contra %V y %V le hace sitio sin decir nada.',
  '%A se mete en el hueco de %V y ahí se queda. %V no reclama su lado del sofá.',
  '%A se pega a %V por detrás, cucharita, y a %V le toca la parte de dentro.',
  '%A pone una pierna encima de %V y llama a eso estar a gusto. %V no discute el nombre.',
  '%A se acurruca en el pecho de %V. %V le pasa la mano por el pelo sin pensarlo.',
  '%V dice que hace calor y no se aparta ni un centímetro de %A.',
  '%A usa a %V de almohada. A %V se le duerme el brazo y no avisa.',
  '%A se enreda en %V y desenredarse sería otra escena. %V elige esta.',
  '%A se arrima a %V bajo la manta. %V se queda en el borde del sofá y aguanta.',
  '%A respira en el cuello de %V y %V cierra los ojos.',
  '%A se acurruca con %V y le pone la mano en la tripa. %V no la quita.',
  '%V calcula la distancia a la puerta con %A encima. No se mueve.',
  '%A se pega a %V como si tuviera derecho. %V se lo da al hacerle sitio.',
  '%A se acurruca en el regazo de %V. %V deja el móvil y se rinde.',
  '%A abraza a %V por la espalda y %V se recuesta hacia atrás.',
  '%V dice que solo cinco minutos acurrucadas. Llevan cuarenta.',
  '%A se acurruca contra %V y se duerme encima. %V no cambia de postura en una hora.',
  '%A busca el calor de %V y %V le sube la manta sin que se lo pidan.',
  '%A se arrima a %V en el cine. %V no ve la película y no le importa.',
  '%A se acurruca con %V y le agarra la camiseta con el puño. %V no se levanta.',
  '%V se queja del peso de %A encima. Se queja bajito y sin apartarse.',
  '%A pone la cabeza en las piernas de %V. %V le acaricia el pelo en automático.',
  '%A se acurruca contra %V y suspira. %V no se mueve para no romperlo.',
  '%A se pega a %V y %V finge que sigue leyendo. Lleva diez minutos en la misma línea.',
  '%A se mete debajo del brazo de %V. %V levanta el brazo antes de pensarlo.',
  '%A se acurruca con %V delante del grupo. %V mira a otro lado y se deja.',
  '%V intenta salir del abrazo. %A aprieta un poco y %V se sienta otra vez.',
  '%A se acurruca contra la espalda de %V y le pasa el brazo por la cintura. %V lo sujeta.',
  '%A se duerme encima de %V y %V cancela lo que tuviera.',
  '%A se despega un momento y %V la vuelve a acercar. Ahí se supo todo.',
];

const PAT = [
  '%A le acaricia la cabeza a %V y %V baja la cabeza para que llegue mejor.',
  '%A le pasa la mano por el pelo a %V. %V cierra los ojos y se deja.',
  '%A le da unas palmaditas en la cabeza a %V. %V protesta y no se aparta.',
  '%A acaricia a %V y %V se queda debajo de la mano, esperando la siguiente.',
  '%A le revuelve el pelo a %V. %V se lo recoloca y vuelve a ponerse a tiro.',
  '%V dice que no es un perro con la mano de %A en la cabeza.',
  '%A le acaricia la nuca a %V y a %V se le va el enfado de golpe.',
  '%A le pone la palma en la coronilla a %V y no la quita. %V no se mueve.',
  '%A acaricia a %V delante de todos. %V mira al suelo, rojo, y se deja.',
  '%V busca la mano de %A con la cabeza. La encuentra.',
  '%A le acaricia el pelo a %V mientras habla con otra persona. %V no dice nada.',
  '%A le da dos palmaditas a %V y se va. %V se queda esperando la tercera.',
  '%A acaricia a %V despacio y %V se acurruca contra la mano.',
  '%V se pone de rodillas para que la mano de %A le llegue mejor a la cabeza. Nadie se lo pidió.',
  '%A le acaricia la cabeza a %V y le dice que buena chica. %V no lo desmiente.',
  '%A le pasa la mano por el pelo a %V y le tira un poco al final. %V traga saliva.',
  '%A acaricia a %V y para. %V le empuja la mano con la cabeza.',
  '%A le acaricia la mejilla a %V con el pulgar. %V se apoya en la mano.',
  '%V dice que ya está bien y sigue con la cabeza donde estaba.',
  '%A le acaricia el pelo a %V hasta que %V se duerme encima.',
  '%A le pone la mano en la cabeza a %V y la deja ahí toda la conversación.',
  '%A acaricia a %V como se acaricia lo que ya es de uno. %V no corrige a nadie.',
  '%V se deja acariciar con los ojos cerrados. Abrirlos sería admitir que le gusta.',
  '%A le acaricia la cabeza a %V y le rasca detrás de la oreja. %V se derrite.',
  '%A acaricia a %V y le sube la mano a la nuca. %V baja la cabeza sola.',
  '%V se queja de que esa caricia le despeina. Se queja sin apartar la cabeza.',
  '%A le acaricia el pelo a %V y %V suspira. El grupo lo ha oído.',
  '%A acaricia a %V una vez y %V se pasa la tarde cerca de esa mano.',
  '%A le sujeta la cara a %V y le acaricia el pómulo. %V no aparta la vista.',
  '%A deja de acariciar a %V. %V se queda con la cabeza en el aire, esperando.',
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

// ─── LAS NUEVE EXPLÍCITAS VAN A TRES TIEMPOS, NO A DOS ──────────────────────
//
// Pedido del dueño con dos ejemplos suyos delante. Lo que había era esto:
//
//   «%V dice que le duele con la polla de %A entera en el culo, y no se
//    aparta ni un centímetro.»
//   «%V se queda con el culo abierto después. %A lo mira sin decir nada.»
//
// Y lo que faltaba, en sus palabras, era el COMPLEMENTO: «la guarra, pide más
// y más», «(y decide ir más profundo)». El acto y la reacción ya estaban; lo
// que no había era el tercer golpe, el que cierra y remata el chiste.
//
// Así que las 270 frases de FUCK, ANAL, CUM, SEDUCE, PREG, UNDRESS, SPANK,
// LICKASS y GROPE llevan ahora tres tiempos: ACTO · REACCIÓN · COMPLEMENTO.
// El tercero no siempre es una oración aparte —el primer ejemplo del dueño no
// lo es—, pero está en todas.
//
// LA CONDICIÓN QUE PUSO: «que no sea repetitivo en las frases». Un pool de
// treinta cierres que todos dicen «pide más» es peor que no tener el tercer
// tiempo. Medido antes de subir esto: entre 22 y 29 formas distintas de
// arrancar el complemento por pool de 30, y el «pedir/suplicar» como mucho en
// 6 de cada 30. Si alguien añade frases aquí, ese es el listón, y sale con
// scripts/progreso.js (casi-clones).
//
// Los cierres van de: escalada, decisión de %A, consecuencia al rato o al día
// siguiente, quién se entera, el detalle que delata, la cuenta que se pierde.
// Ninguno es un adjetivo pegado a %V —eso lo tumba la capa 44 de check.js— y
// ninguno repite el remate de otra frase del fichero.

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
  '%A se folla a la guarra de %V contra la pared y no la deja bajar las piernas. La zorra se agarra al cuello y pide otra más fuerte.',
  '%A pone a %V a cuatro y se la mete hasta el fondo. La zorra empuja hacia atrás para más. %A le sujeta la cadera y no la deja escapar ni un dedo.',
  '%A le come el coño a %V hasta que la muy puta se corre agarrándole del pelo. Cuando suelta el pelo, %A ya está subiendo otra vez.',
  '%A se folla a %V encima de la mesa. La guarra tira todo lo que había y le da igual. Lo único que le importa es que %A no pare.',
  '%V se sienta encima de %A y se mueve sola. La perra sabe perfectamente lo que hace. Y lo hace hasta que %A le pide tregua.',
  '%A se la mete a %V despacio y la sucia le pide que vaya más fuerte. %A va más despacio todavía, solo por oírla suplicar.',
  '%A le separa las piernas a %V y se queda en el clítoris con la lengua. La zorra ve el techo. Cuando baja la vista, %A sigue ahí y sigue.',
  '%A se folla a %V de pie, agarrada por la cintura. La guarra se sujeta a lo que pilla. Lo que pilla se viene abajo y a nadie le importa.',
  '%V dice que no puede más y abre más las piernas. Las dos cosas a la vez. %A entiende cuál de las dos va en serio y se la mete entera.',
  '%A le mete dos dedos a %V y chupa a la vez. La muy puta se corre en medio minuto. A los dos minutos va la segunda.',
  '%A se folla a la perra de %V por detrás mientras le tapa la boca. Se le oye igual. Media escalera se entera de cómo se llama %A.',
  '%A monta a %V y le clava las uñas. La guarra no dice nada del dolor. Las marcas le duran tres días y no piensa taparlas.',
  '%A se la mete a %V en el baño con gente fuera. La sucia se muerde la mano para no gritar. La mano no da abasto y la fiesta se entera.',
  '%V le suplica a %A que no pare de follarla. %A baja el ritmo solo por oírselo pedir otra vez. Y la zorra lo pide otras tres.',
  '%A se folla a %V hasta dejarle las piernas temblando. La zorra pide otra ronda. Las piernas votan que no y pierden.',
  '%A le levanta una pierna a %V y entra hasta el fondo. La guarra suelta un ruido que no pensaba soltar. Y después suelta otro peor.',
  '%V se pone de rodillas y se la chupa a %A sin que se lo pidan. La muy puta sabe lo que quiere. Y no se levanta hasta tenerlo.',
  '%A se folla a %V delante del espejo y le gira la cara para que se vea. La sucia no puede mirar y no deja de mirar. El espejo gana la discusión.',
  '%A le come el coño a %V tres minutos seguidos, el mismo ritmo. La zorra se corre de algo tan simple. Y se apunta los tres minutos para la próxima.',
  '%A se la mete a %V y no se mueve. La guarra se lo monta ella sola hasta acabar. %A no ha movido un músculo y se lleva el mérito.',
  '%V dice que es la última vez. Lo dice montada encima de %A. Lo dijo el jueves pasado en la misma postura.',
  '%A se folla a la guarra de %V en el sofá y el sofá no vuelve a ser el mismo. La zorra tampoco, y eso sí le gusta.',
  '%A le escupe y se la mete. La perra de %V ya estaba empapada de antes. Llevaba desde el mediodía pensando en esto.',
  '%A se folla a %V con la ropa puesta, solo apartada. La zorra dice que así es peor y no para. Peor es exactamente lo que había pedido.',
  '%A le mete la lengua a %V y le sujeta las caderas para que no se escape. No iba a escaparse. Iba a pedir más lengua, y la consigue.',
  '%V acaba con las rodillas destrozadas y una sonrisa que lo dice todo. Y con %A todavía dentro, que es la mitad del chiste.',
  '%A se folla a %V hasta que se le va la voz. La muy puta sigue pidiendo en bajito. Cuando recupera la voz, pide en alto.',
  '%A se la mete a %V mirándole a los ojos. La sucia aguanta la mirada a duras penas. La pierde al tercer empujón y ya no la recupera.',
  '%A se folla a %V dos veces seguidas. La segunda fue idea de la zorra. La tercera también, y ahí %A ya pidió agua.',
  '%V le pide a %A que no saque la polla. %A no tenía ninguna intención de sacarla. Se queda dentro hasta que a la guarra se le duermen las piernas.',
];

// Treinta. El gif ya es el polvo: explícito, por el culo, al azar.
// La frase comenta lo que se ve —cara, sonido, el para, el hondo—. El salto al
// día siguiente vale SOLO como tercer tiempo, para rematar, nunca como escena:
// si la frase se va del sitio antes de contar el acto, se cae el chiste.
// El golpe es %V. Ni «él» ni adjetivo en -o.
const ANAL = [
  '%A se la mete a la guarra de %V por el culo, delante de todos. A la zorra se le acaba lo que iba a decir. Lo siguiente que suelta no es una palabra.',
  '%A le abre el culo a %V y entra despacio. La muy puta empuja hacia atrás sola. Despacio duró exactamente cuatro segundos.',
  '%A se folla el culo de %V y no saca. La perra mira al frente y el frente no ayuda. Cerrar los ojos es peor y también lo prueba.',
  '%A se la clava a %V por detrás hasta el fondo. La guarra suelta un gemido que se oye en el grupo. El grupo lo comenta tres días.',
  '%V dice que ahí no y levanta el culo. Solo una de las dos cosas va en serio. %A se la mete y la zorra deja de decir que ahí no.',
  '%A le escupe en el culo a %V y se la mete. La sucia lo agradece con la cara. Y con el culo, que se abre solo para la siguiente.',
  '%A se folla el culo de %V mientras le tapa la boca. La zorra grita igual contra la mano. %A aprieta más y la zorra grita más.',
  '%A entra en el culo de %V y se queda dentro. La guarra no quiere que salga. Le engancha el tobillo con el pie por si acaso.',
  '%V pide que se la meta más despacio por el culo. %A obedece y la muy puta pide más fuerte a los diez segundos. Despacio no ha durado nunca.',
  '%A pone a %V a cuatro y le folla el culo sin prisa. La perra baja el pecho sola. Y sube el culo otro palmo sin que nadie se lo diga.',
  '%A se la mete a %V por detrás y le tira del pelo. La zorra arquea la espalda. Cuanto más tira %A, más atrás va la guarra.',
  '%A le folla el culo a %V hasta que se le van los ojos. La sucia dice que otra vez. Tres veces dice otra vez.',
  '%V se abre el culo con las manos para %A. Ahí se acabó la vergüenza. Lo que viene después no se cuenta en el grupo.',
  '%A se la mete a la guarra de %V en el baño de la fiesta. Se oye desde fuera. Cuando salen, nadie pregunta y todos lo saben.',
  '%A le folla el culo a %V y le mete los dedos en la boca. La zorra chupa sin que se lo pidan. Con las dos manos ocupadas, %A va más hondo.',
  '%A entra en el culo de %V y %V se corre solo con eso. No se lo esperaba ni ella. %A tampoco, y decide repetirlo entero.',
  '%A se folla el culo de %V de lado, sin soltarle la cadera. La perra no llega a cerrar las piernas. Tampoco lo intenta demasiado.',
  '%V dice que le duele con la polla de %A entera en el culo, y no se aparta ni un centímetro. La guarra pide más y más.',
  '%A le abre el culo a %V con los dos pulgares y se la mete entera. La guarra aguanta y pide más. Y lo pide por el nombre.',
  '%A se folla a %V por el culo mientras le frota el coño. La muy puta se rompe por la mitad. Y pide que la rompan otra vez.',
  '%V se queda con el culo abierto después. %A lo mira sin decir nada. Y decide ir más profundo.',
  '%A le folla el culo a %V contra el lavabo. La zorra se agarra al grifo. El grifo se abre solo y nadie va a cerrarlo.',
  '%A se la mete a %V atrás hasta donde cabe. Cabe, y a la sucia se le nota. Se le nota en la voz una hora después.',
  '%V pide que le den más fuerte por el culo. %A cumple. Y cuando la guarra pide parar, %A ya no la oye.',
  '%A se folla el culo de %V y le pregunta de quién es. La guarra contesta el nombre sin dudar. Lo repite dos veces por si no quedó claro.',
  '%A entra en el culo de %V con las dos manos en sus caderas. La perra va al encuentro. Cada vez llega antes.',
  '%A le deja el culo abierto a %V. La zorra acaba andando raro y no piensa explicar por qué. Al día siguiente vuelve a pedirlo.',
  '%A le folla el culo a %V delante del espejo. La zorra se mira la cara todo el rato. La cara que pone dice más que el gemido.',
  '%A se la mete a %V por detrás sin avisar. La muy puta dice que así es como le gusta. Avisar era el único riesgo.',
  '%A acaba dentro del culo de %V y se queda a vivir ahí un rato. La guarra aprieta para que no se vaya. Y no se va.',
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
  '%A tiene aura para esto y no para una cerveza. El orden de gastos de un gilipoyas se lee solo.',
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
  '%A se ha ensayado la frase y ha pagado para no decirla. La voz delataría el por favor. El gif te cubre, gilipoyas.',
  '%A, has convertido el grupo en tu único sitio para fingir contacto. Fuera no hay sitio. Fuera no te lo dan. Nunca te lo dan.',
  'Si no contestan, %A cambia de nombre. Hay más en la lista. La lista es lo más cerca que ha estado de tener opciones de verdad.',
  '%A manda esto desde el cuarto, desde la cama, desde el váter. Desde cualquier sitio menos desde delante. Delante hay que ser alguien.',
  '%A, te has gastado el aura en simular que te quieren. No te quieren. Te han mencionado. No es lo mismo, imbécil, y se lee.',
  '%A espera que el grupo vea que ha hecho algo. Ha hecho un cargo. El cargo no es un cuerpo. Ni de lejos es un cuerpo.',
  '%A, lo tuyo no es timidez. Es que en persona no te comen ni el saludo. Aquí el saludo se compra, gilipoyas, y lo llamas contacto.',
  '%A paga menciones para fingir que tiene trato con alguien. Tres veces al día, y ninguna de verdad.',
  '%A no se atreve a decir el nombre en el aire. Lo teclea. El aire no se entera. El grupo, sí. Y se ríe. Con razón.',
  'Tres de la mañana, saldo abajo, %A fingiendo intimidad. La intimidad de verdad pide un cuerpo. El cuerpo no ha venido. No va a venir.',
  '%A se queda mirando si pitan. Un tick doble le sube más que nadie a quien haya tocado este año.',
  '%A, nadie te debe un gesto. Lo estás comprando. Lo comprado no es un gesto. Es una limosna que te das con público.',
  'A %A solo le funciona el comando. Hablar de verdad se le olvidó hace tiempo, y se nota cada vez que paga.',
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
  '%A, pagas para no tener que pedirlo con tu voz. Porque si lo pidieras tú, te dirían que no.',
  'Si %A sale de esta y habla, se le acaba el truco. Por eso no habla. Por eso paga. Por eso el grupo ya no se sorprende.',
  '%A llama valentía a un gif con nombre. Valentía era cruzar. No ha cruzado. No va a cruzar. El gif es lo máximo que da, y da asco verlo.',
  '%A ha tardado más en elegir a quién que lo que dura el gif. Esa es toda la vida social que ha tenido hoy.',
];


// COSQUILLAS. La risa involuntaria: %V no elige reirse y ahi esta el chiste.
// Nadie sale digno de esto, y menos quien la recibe.
const TICKLE = [
  '%A le hace cosquillas a %V en las costillas. %V se dobla y no se aparta.',
  '%V aguanta tres segundos de cosquillas. Al cuarto se rinde entera.',
  '%A ataca con cosquillas por debajo del brazo. %V cierra tarde, como siempre.',
  '%A le hace cosquillas a %V y %V grita que no mientras se deja.',
  '%A repite las cosquillas en el mismo punto. %V ya sabe cuál es y eso lo hace peor.',
  '%V acaba en el suelo de la risa. %A sigue desde arriba.',
  '%A encuentra el punto exacto de %V a la primera. %V no sabía ni que lo tenía.',
  '%V grita que pare. El cuerpo dice otra cosa y %A le hace caso al cuerpo.',
  '%A le hace cosquillas a %V hasta que suplica. %V suplica rápido.',
  '%A le hace cosquillas en los pies a %V. %V patalea y no los quita.',
  '%V se dobla por la mitad de la risa delante de %A. La mitad de arriba se rinde primero.',
  'Diez segundos de cosquillas y %V ya está negociando. Desde el suelo se negocia peor.',
  '%A le sujeta las muñecas a %V y le hace cosquillas con la otra mano. %V no forcejea mucho.',
  '%V dice que odia las cosquillas y se queda donde %A llega.',
  '%A le hace cosquillas a %V en la barriga. %V se ríe y le agarra la mano sin apartarla.',
  '%V se queda sin aire de la risa. %A espera a que recupere y sigue.',
  '%A le hace cosquillas a %V delante del grupo. %V se rinde en público.',
  '%V pide tregua de cosquillas. %A le da dos segundos y vuelve. %V no se ha movido.',
  '%A le hace cosquillas en el cuello a %V. %V encoge el hombro y se deja.',
  '%V amenaza con vengarse. %A le hace más cosquillas y la amenaza se cae.',
  '%A para las cosquillas. %V se queda tensa esperando a que vuelva.',
  '%A le hace cosquillas a %V hasta que a %V se le saltan las lágrimas de reírse.',
  '%V intenta escaparse y se mueve justo hacia las manos de %A.',
  '%A le hace cosquillas a %V en la cintura. %V se arquea y no se va.',
  '%V se ríe hasta que le duele. %A le pregunta si quiere que pare y %V tarda en contestar.',
  '%A le hace cosquillas a %V con una sola mano y sin esfuerzo. %V ya está en el suelo.',
  '%V se tapa las costillas. %A va a las rodillas. %V no lo vio venir.',
  '%A le hace cosquillas a %V y %V acaba agarrada a ella para que pare. No para.',
  '%V dice que ya no le hacen gracia las cosquillas. Se ríe igual.',
  '%A deja de hacerle cosquillas a %V. %V tarda un rato en dejar de reírse.',
];

// DE LA MANO. El gesto mas inocente de la lista y por eso el mas incomodo: no
// pasa nada, y justo por eso %V le da mil vueltas. El chiste es la lectura de
// mas, no el contacto.
const HANDHOLD = [
  '%A le coge la mano a %V y %V no la retira.',
  '%A entrelaza los dedos con %V y %V aprieta de vuelta sin pensarlo.',
  '%A le coge la mano a %V delante de todos. %V mira al suelo y se deja.',
  '%A no le suelta la mano a %V y %V deja de intentar soltarse.',
  '%V ofrece la mano primero. %A la coge y ya no la devuelve.',
  '%A le coge la mano a %V por debajo de la mesa. %V sigue hablando con otro.',
  '%A le aprieta la mano a %V una vez. %V entiende perfectamente lo que significa.',
  '%A le coge la mano a %V y le pasa el pulgar por los nudillos. %V cierra los ojos.',
  '%V dice que le suda la mano y no la mueve.',
  '%A tira de la mano de %V para que la siga. %V la sigue.',
  '%A le coge la mano a %V y se la mete en el bolsillo. %V se deja llevar.',
  '%V mira alrededor a ver quién los ha visto de la mano. Los han visto todos.',
  '%A le coge la mano a %V al cruzar y se le olvida soltarla en toda la tarde.',
  '%A le agarra la muñeca a %V y baja hasta la mano. %V abre los dedos.',
  '%V suelta la mano de %A para coger algo y la vuelve a buscar enseguida.',
  '%A le coge la mano a %V y se la besa. %V no sabe dónde meterse.',
  '%A le coge la mano a %V en mitad de una discusión. La discusión se acaba ahí.',
  '%V dice que es una tontería con los dedos entrelazados con los de %A.',
  '%A le coge las dos manos a %V. %V se queda sin nada que hacer con ellas.',
  '%A le coge la mano a %V y no dice nada. %V tampoco pregunta.',
  '%A le suelta la mano a %V y %V se queda con la mano medio abierta.',
  '%A le coge la mano a %V y se la aprieta fuerte. %V aprieta más fuerte.',
  '%V finge que se coloca el pelo para no coger la mano de %A. %A se la coge igual.',
  '%A le coge la mano a %V mientras conduce. %V no se la pide de vuelta.',
  '%A le entrelaza los dedos a %V y le da la vuelta a la mano. %V la deja hacer.',
  '%V lleva la mano de %A a su propia pierna. Eso no fue un accidente.',
  '%A le coge la mano a %V delante de su ex. %V no dice ni media.',
  '%A le coge la mano a %V dormida. %V se despierta y no la suelta.',
  '%V dice que solo son manos. Lo dice sin soltar la de %A.',
  '%A le coge la mano a %V y tira un poco hacia sí. %V se acerca.',
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
  '%A lanza a %V por los aires y el vuelo dura poco. Lo que dura es el aterrizaje.',
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

// MATAR. La mas seca de todas. Frases cortas, sin adornos: se acaba con alguien
// y se acaba la conversacion. El humor esta en la calma de %A, no en la sangre.
//
// Y SIN ARMA. Aqui habia un pool de DISPARAR con treinta frases de tiros, y era
// bueno — pero los gifs de esta categoria son de cuchillo, de espada y de lo
// que haga falta. Una frase que dice «le dispara» debajo de un gif de un
// cuchillo es justo lo que este fichero lleva media docena de comentarios
// diciendo que no se hace: el comando enseña una cosa y dice otra. Asi que
// ninguna frase nombra el arma, y valen para cualquier gif que traiga la web.
const KILL = [
  '%A mata a %V sin levantar la voz. Levantar la voz es de quien todavía se lo está pensando.',
  '%V empieza una frase y %A la termina de otra manera.',
  '%A acaba con %V en un segundo y medio. El medio segundo fue por educación.',
  '%V ni se defendió. Tampoco es que le diera tiempo.',
  'Se acabó %V. %A ya está en otra cosa.',
  '%A se lleva a %V por delante y sigue andando. Ni una mirada atrás.',
  '%V se dio cuenta tarde de que %A iba en serio.',
  '%A remata a %V y el grupo tarda dos segundos en reaccionar. %V no reacciona.',
  '%V pidió hablarlo. %A ya lo había hablado consigo mismo.',
  '%A liquida a %V con la tranquilidad de quien lo tenía pendiente desde hace días.',
  'A %V se le acaba el turno. Los turnos los reparte %A.',
  '%A termina con %V y se limpia las manos. Lo de limpiarse es por costumbre.',
  '%V cae y el grupo mira a %A. %A se encoge de hombros.',
  '%A mata a %V por lo de la otra vez. %V ni se acordaba de lo de la otra vez.',
  '%V dejó de hablar a mitad. El punto lo puso %A.',
  'Nadie vio moverse a %A. A %V lo vieron caer todos.',
  '%A acaba con %V delante de todo el grupo. Delante de todo el grupo era la idea.',
  '%V tenía una última pregunta. %A no es de contestar preguntas.',
  '%A se carga a %V y pide perdón al grupo. Al grupo, no a %V.',
  'Lo de %V duró lo que %A quiso que durara.',
  '%A mata a %V y se queda tan ancho. Lo raro sería lo contrario.',
  '%V se lo veía venir desde hacía rato y aun así se quedó quieto.',
  '%A termina con %V en silencio. El ruido lo pone el grupo después.',
  '%V cierra los ojos. %A no tiene por qué.',
  '%A se quita a %V de en medio y vuelve a lo que estaba haciendo. Estaba haciendo algo más importante.',
  '%V se apoya en %A al caer. %A se aparta.',
  '%A acaba con %V y el grupo sigue escribiendo. Aquí no se para por tan poco.',
  'A %V lo mata %A y nadie pide explicaciones. Nadie las pide nunca.',
  '%A le quita a %V las ganas de contestar. Y el resto también.',
  'Queda %A de pie y ya está. La lista era de dos y %V estaba en ella.',
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
  '%A se corre dentro de la guarra de %V y no saca. La zorra cierra las piernas para no perder nada. Y así se queda un rato largo.',
  '%A se corre en la cara de %V. La muy puta se lo reparte con los dedos. Y se chupa los dedos mirando a %A.',
  '%A acaba en la boca de %V y la sucia se lo traga sin que nadie se lo pida. Después abre la boca para enseñar que no queda nada.',
  '%A se corre en las tetas de %V. La perra se queda así un rato, mirándose. No se limpia hasta que %A se lo dice.',
  '%A vacía dentro de %V y sigue empujando despacio. La guarra lo agradece con la cara. Y con las piernas, que no lo sueltan.',
  '%V se pone de rodillas y abre la boca. %A se corre dentro sin que haga falta decir nada. La muy puta no cierra hasta tragarlo todo.',
  '%A se corre en el culo de %V y se lo extiende con la polla. La zorra se retuerce. Y pide que se la meta otra vez con eso encima.',
  '%A acaba encima de %V y la muy puta se relame antes de decir nada. Lo que dice después tampoco es apto para el grupo.',
  '%V pide que se corra dentro. %A lleva media hora aguantando justo para eso. Cuando acaba, la guarra le da las gracias en alto.',
  '%A se corre y %V no aparta la cara. Apartarla era una opción. La zorra la descartó al primer chorro.',
  '%A le llena la boca a %V y la sucia no traga hasta que %A le dice. Aguanta con la boca llena todo lo que haga falta.',
  '%A acaba en el coño de %V y la guarra se lleva la mano abajo para que no se salga. No mueve la mano hasta que se le duerme el brazo.',
  '%A se corre encima de %V y le hace una foto. La zorra posa. Y pide copia.',
  '%V se corre a la vez que %A y aprieta. El apretón decide el resto. El resto dura hasta que los dos se quedan sin aire.',
  '%A se corre en el pelo de %V. La perra tarda una hora en arreglarlo y no se queja. Ni una palabra en toda la hora.',
  '%A acaba dentro de %V dos veces seguidas. La segunda fue idea de la muy puta. La tercera la negocian a gritos.',
  '%A se corre en la lengua de %V y le dice que la enseñe. La sucia obedece. Y la mantiene fuera hasta que %A da el permiso.',
  '%V se traga todo y pide más. %A necesita cinco minutos. La guarra se los cuenta en voz alta.',
  '%A se corre encima del culo de %V y se queda mirando cómo cae. La zorra no se mueve para que caiga entero.',
  '%V se recoge la leche de la cara con los dedos y se los chupa delante de %A. La zorra sabe lo que hace. Y sabe que va a haber segunda.',
  '%A acaba en la cara de %V y la guarra ni parpadea. Se limpia con el dorso de la mano y pide otra.',
  '%A se corre dentro de %V y %V suelta el aire de golpe. Llevaba rato aguantándolo. Cuando vuelve a respirar, pide otra vez.',
  '%A se corre en la espalda de %V y la perra dice que lo repitan ya. %A pide diez minutos y no se los dan.',
  '%V le pide a %A que se corra donde quiera. %A elige la cara y la muy puta no discute. Ni discute ni se limpia.',
  '%A acaba y %V se queda de rodillas, esperando a ver si hay más. Hay más, y la zorra no se levanta hasta el final.',
  '%A se corre en el coño de %V y la sucia no se limpia nada en toda la noche. Duerme así a propósito.',
  '%V se corre solo de ver a %A correrse. Eso tampoco se lo esperaba. %A lo apunta para la próxima.',
  '%A vacía en la boca de %V y le tapa los labios con la mano. La zorra traga. Y le lame la mano después.',
  '%A se corre encima de %V y la guarra dice que huele a suyo. Nadie le corrige. Se pasa la noche oliéndose la muñeca.',
  '%A acaba dentro y %V no se mueve un rato largo, disfrutándolo. Cuando por fin se mueve, chorrea y le da igual.',
];

// MORDISQUEAR. El registro que pidio el dueño: sumision sin violencia. Lo que
// se cuenta no es el mordisco, es que %V NO SE APARTA — ladea la cabeza, ofrece
// la mano, se acerca en vez de retirarse. La decision de %V es el chiste.
const NOM = [
  '%A le pega un mordisquito a %V y no acaba de soltar. %V deja de moverse, que es lo que se pedía.',
  '%A muerde despacio la oreja de %V. %V ladea la cabeza sin que se lo pidan.',
  '%A le mordisquea el cuello a %V y %V aguanta sin moverse. Aguantar era una opción. La eligió.',
  '%A prueba a %V a mordiscos como quien decide si se la queda.',
  'Un mordisco corto de %A en el hombro de %V. %V ni protesta, solo se acomoda.',
  '%A le muerde el dedo a %V con los dientes justos. Ni fuerza, ni permiso.',
  '%V ofrece la mano sin pensarlo. %A se la mordisquea y %V la deja ahí.',
  '%A pellizca con los dientes el cuello de %V. %V cierra los ojos como si eso ayudara.',
  '%A le mordisquea la mejilla a %V y se aparta. %V se queda esperando el siguiente.',
  '%V dice que pare con la boca de %A todavía encima. Suena a otra cosa.',
  '%A muerde a %V despacio y sin ganas de terminar. %V ya no tenía prisa tampoco.',
  '%A le come el labio a %V un segundo. Un segundo de más para lo que era.',
  '%V se ríe al principio del mordisco de %A. Deja de reírse a mitad.',
  '%A mordisquea a %V con la calma de quien sabe que no le van a apartar.',
  '%A le muerde la clavícula a %V. %V mira al techo y se queda con eso.',
  '%V no aparta el brazo mientras %A lo mordisquea. Apartarlo estaba a un centímetro.',
  '%A muerde y suelta. Muerde y suelta. %V ya lleva el ritmo.',
  '%A le mordisquea el pulgar a %V. %V se lo deja hasta que %A se cansa.',
  'El mordisquito de %A no deja marca. %V se toca el sitio media hora buscando lo que no hay.',
  '%V respira distinto desde el primer mordisco de %A. Nadie más lo ha notado. %A sí.',
  '%A muerde a %V donde nadie muerde por accidente.',
  '%V se deja mordisquear de arriba abajo y solo dice que le hace cosquillas. No era eso.',
  '%A le pasa los dientes por el cuello a %V sin apretar. La amenaza es la mitad del gesto.',
  '%A mordisquea a %V y %V se acerca en vez de apartarse. Apartarse estaba a un centímetro.',
  'Un mordisco de %A en la nuca de %V. A %V se le olvida lo que estaba diciendo.',
  '%A muerde suave y %V traga saliva. El grupo la vio tragar.',
  '%A le mordisquea la muñeca a %V mientras %V sigue hablando. %V deja de hablar sola.',
  '%V pone el cuello. %A lo aprovecha. Nadie discutió el reparto.',
  '%A termina el mordisco con la lengua. %V ya no sabe dónde mirar.',
  '%A le muerde el hombro a %V y %V pide otro sin decirlo, solo girándose.',
];

// EL PIQUITO. Lo mas corto de la lista y por eso funciona: medio segundo de
// contacto y %V se queda esperando el resto. El chiste esta en la ASIMETRIA —
// %A ya esta en otra cosa y %V sigue ahi.
const PECK = [
  '%A le da un piquito a %V y se aparta. %V se queda con la boca en el aire, pidiendo.',
  '%A besa a %V rápido y sigue andando. %V no ha seguido andando.',
  'Medio segundo de beso de %A. %V lleva desde entonces esperando el otro medio.',
  '%A le roba un beso a %V y ni mira la cara que pone. La cara valía la pena.',
  '%V cierra los ojos tarde para el beso de %A. Se quedó con los ojos cerrados igual.',
  '%A le da un beso en la comisura a %V. %V gira la cara buscando el resto.',
  '%V pone la mejilla. %A va a la boca. %V no corrige a nadie.',
  '%A besa a %V como quien firma algo. %V no leyó lo que firmaba y se deja.',
  'Un piquito de %A y %V se queda tres segundos sin hablar. En este chat eso es una eternidad.',
  '%A besa a %V en la frente y le suelta la cara. Lo de la frente es peor que en la boca.',
  '%V se toca el labio después del beso de %A. %A ya está hablando de otra cosa.',
  '%A le da un beso rápido a %V delante del grupo. Nadie ha vuelto a mirar el móvil.',
  '%V dice que ese beso no valía. %A no lo repite, y ahí %V aprende su sitio.',
  '%A besa a %V y le da un toque en la barbilla. Lo segundo sobraba y por eso lo hizo.',
  '%A le da un piquito a %V a media frase. La frase no se termina.',
  '%V se queda esperando el beso con los ojos cerrados. %A deja que espere.',
  '%A besa a %V, se aparta y se ríe. Reírse después es lo que lo remata.',
  'A %V le sube el color por medio segundo de beso. Medio segundo salió caro.',
  '%A le da un beso corto a %V y le aprieta el brazo. El brazo dice más que el beso.',
  'Un piquito y ya. %V mira a %A como se mira lo que se quiere otra vez.',
  '%A besa a %V en la nariz. %V no sabe qué hacer con eso en toda la tarde.',
  '%A se acerca, besa a %V y vuelve a su sitio. %V sigue con la cara donde la dejó.',
  '%V busca el segundo beso. %A ya está en otra conversación.',
  '%A le da un piquito a %V y se queda mirando antes de soltarla. %V baja la vista primero.',
  '%V responde tarde al beso de %A. Para cuando reacciona, %A ya no está.',
  '%A besa a %V sin avisar. Avisar habría estropeado la única parte buena.',
  'Un beso corto entre %A y %V y el grupo haciendo como que no. Nadie hace como que no.',
  '%A besa a %V y le deja el labio brillando. %V no se lo limpia.',
  '%A le da un piquito a %V en la sien. %V se paraliza más que con uno en la boca.',
  '%A besa a %V y se va. %V pide otro en voz baja, para que no lo oiga nadie.',
];

// ─── DORMIRSE ENCIMA ────────────────────────────────────────────────────────
//
// El gif es alguien durmiendo, o sea una accion de UNA persona, y aqui todas
// las acciones van dirigidas a otra. No es un problema: dormirse encima de
// alguien es de las cosas mas invasivas que hay y nadie se queja nunca. El
// chiste esta SIEMPRE en quien queda debajo — %A no se entera de nada, y %V
// lleva veinte minutos sin mover un brazo por no despertarle.
const SLEEP = [
  '%A se duerme a mitad de una frase de %V. La frase no era larga, era aburrida.',
  '%A se queda frito encima de %V. %V lleva veinte minutos sin mover el brazo y ya no lo siente.',
  '%V sigue contando su historia. %A ronca desde el segundo párrafo.',
  '%A se duerme en el hombro de %V y le deja la manga empapada de babas.',
  '%V no se mueve por no despertar a %A. %V tampoco tenía nada mejor que hacer.',
  '%A cae redondo sobre las piernas de %V. Esas piernas llevan dos horas muertas.',
  '%A se duerme mientras %V le cuenta sus cosas. El grupo entiende a %A.',
  '%V aguanta el peso de %A y la cara de circunstancias. Lo segundo cuesta más.',
  '%A ronca en la oreja de %V. %V se lo va a recordar durante años.',
  '%A se duerme agarrado a %V como quien se agarra a un mueble. %V es el mueble.',
  '%V tiene la pierna dormida, la espalda rota y a %A babeándole el hombro. Y ahí sigue.',
  '%A se duerme delante de %V a media conversación. %V se calla, por si acaso era una indirecta.',
  'A %A se le cae la cabeza sobre %V. %V la recoloca. Se le vuelve a caer. %V se rinde.',
  '%A duerme con la boca abierta encima de %V. %V ya ha hecho la foto.',
  '%V le mira dormir y piensa cosas que no va a escribir en el grupo.',
  '%A murmura un nombre en sueños. %V no ha entendido cuál y prefiere no saberlo.',
  '%A lleva media hora roncando sobre %V. %V ha cancelado la tarde entera.',
  '%V dice que %A le pesa encima mientras duerme. Lo dice bajito, que es como no decirlo, y no se mueve.',
  '%A se duerme viendo algo con %V. %V lo termina solo y luego finge que no.',
  'A %A se le duerme el brazo debajo de %V. Se aguanta: quejarse sería admitir dónde está.',
  '%A se queda frito a mitad del chiste de %V. El chiste era malo, pero no tanto.',
  '%V respira más despacio para no molestar. Nadie le ha pedido ese nivel de servicio.',
  '%A duerme como si %V fuera de su propiedad. %V no ha corregido esa idea en ningún momento.',
  '%A se despierta, ve a %V mirándole y se vuelve a dormir. Sin comentarios.',
  '%A busca postura encima de %V hasta clavarle un codo. Ahí se acomoda.',
  '%V lleva una hora con el móvil en alto porque %A le ha inmovilizado el otro brazo.',
  '%A se duerme y le deja a %V todo el peso y ninguna explicación.',
  '%V no recuerda en qué momento aceptó ser almohada.',
  '%A ronca bajito. Mañana lo va a negar y %V tendrá el audio.',
  'Cuando %A despierte, %V dirá que acaba de llegar. Lleva ahí desde el principio y le arde la espalda.',
];

// ─── EL PUCHERO ─────────────────────────────────────────────────────────────
//
// Chantaje emocional del barato, y funciona todas las veces. El chiste no es el
// puchero: es que %V CEDE, y que sabe perfectamente que le están tomando el
// pelo. Nada de "y %V se derrite" — lo bueno es que %V ve la trampa entera y
// pasa por ella igual.
const POUT = [
  '%A pone morros y %V cede. Otra vez. Da un poco de pena verlo.',
  '%A hace un puchero y %V dice que sí antes de saber a qué.',
  '%V ve venir el puchero desde lejos. Verlo venir no ha servido nunca de nada.',
  '%A saca el labio. %V saca la cartera.',
  '%V sabe que es teatro. Cede igual, y eso es lo humillante.',
  '%A frunce el morro y %V cambia de opinión sobre algo que defendía hace diez segundos.',
  '%V aguanta cuatro segundos. Cuatro segundos es su récord personal.',
  '%A pone morros por una gilipollez. %V lo arregla como si se hubiera muerto alguien.',
  '%V le llama manipulador. %A asiente sin quitar el morro.',
  '%A pone carita y %V suspira. El suspiro es la bandera blanca.',
  '%A hace pucheros mirando de reojo a ver si cuela. Cuela siempre.',
  'El morro de %A desaparece en cuanto %V dice que vale. Ni disimula.',
  '%V intenta no mirar. %A se coloca justo donde %V está mirando.',
  '%V le ha dicho que no a cosas mucho peores. A esta no.',
  '%A pone morros y %V deja lo que estaba haciendo. Era importante lo que estaba haciendo.',
  '%A hace un puchero de mierda, sin ganas. Le funciona igual con %V.',
  '%V se enfada y a los dos segundos está negociando. %A no ha movido un músculo de la cara.',
  '%A se va a una esquina a poner morros. %V va a la esquina, cómo no.',
  '%V apaga la pantalla para no ver el morro. La vuelve a encender a los diez segundos.',
  '%A ladea la cabeza además del morro. Eso ya es jugar sucio.',
  '%V dice que se le está poniendo cara de crío. Se lo dice mientras cede.',
  '%A pone morros en silencio. El silencio hace más daño que si gritara.',
  '%V le quita el morro a %A con un dedo. %A lo vuelve a poner en cuanto le suelta.',
  '%A gana la discusión sin decir una palabra. %V sigue sin saber de qué iba.',
  '%A hace pucheros y el grupo entero mira a %V esperando a que se doble. Se dobla.',
  '%V se jura que esta vez no. %V se jura eso todas las veces.',
  '%A pone morros y añade un suspiro. El suspiro sobraba y por eso lo hizo.',
  '%V cede y encima pide perdón. Nadie le había pedido perdón a nadie.',
  '%A frunce los labios. A %V se le cae el argumento entero.',
  '%A lleva años haciendo esto. %V lleva los mismos años cayendo.',
];

// ─── LA LENGUA FUERA ────────────────────────────────────────────────────────
//
// Provocacion de patio de colegio. El chiste esta en que %V no tiene respuesta:
// contestar a alguien que te saca la lengua te deja peor a ti. La gracia es la
// impunidad de %A y el desconcierto de %V, nunca el enfado.
const BLEH = [
  '%A le saca la lengua a %V y se va. %V lleva desde entonces pensando la respuesta.',
  '%A saca la lengua. %V abre la boca para contestar y no le sale nada.',
  '%V pilla a %A haciéndole burla. %A ni se esconde, que es lo que jode.',
  '%A le hace burla y %V decide que contestar sería rebajarse. Se rebaja igual.',
  '%A saca la lengua desde la otra punta del grupo. A %V le llega como si lo tuviera al lado.',
  '%V se enfada. %A le saca la lengua otra vez, que era justo lo que faltaba.',
  '%A le hace burla a %V en medio de algo serio. Ya no es serio.',
  '%V amenaza. %A contesta con la lengua fuera. La amenaza se cae sola.',
  '%A saca la lengua y entorna los ojos. Lo de los ojos es lo que hace daño.',
  '%A le hace burla y %V se la devuelve. Ahí han perdido los dos, pero uno empezó.',
  '%A le saca la lengua y le guiña un ojo. Las dos cosas juntas es pasarse.',
  '%V le dice a %A que tiene cinco años. %A saca la lengua y le da la razón.',
  '%A hace burla y se aparta antes de que %V reaccione. Tenía la salida pensada.',
  '%V no sabe si reírse. %A se ríe por los dos.',
  '%A le saca la lengua por algo que %V ya había olvidado. Ahora %V se acuerda perfectamente.',
  '%A hace burla y no se disculpa. Nadie esperaba una disculpa.',
  '%V intenta ignorarlo. %A se mueve hasta ponerse en su campo de visión.',
  '%A le saca la lengua con las manos en las orejas. El paquete entero.',
  '%V dice que es una chorrada. Lleva diez minutos dándole vueltas a la chorrada.',
  '%A hace burla y luego pone cara de no haber roto un plato. Eso es peor.',
  '%A saca la lengua y %V intenta cogérsela. %A es más rápido.',
  '%V se ríe sin querer. %A lo apunta para usarlo.',
  '%A le hace burla cada vez que %V mira. %V ha dejado de mirar y lo sigue notando.',
  '%A hace burla delante del grupo. El grupo se pone de parte de %A, como siempre.',
  '%V pone los ojos en blanco. %A saca más lengua, que es la respuesta correcta.',
  '%A le saca la lengua y sale corriendo sin motivo. Correr no hacía ninguna falta.',
  '%V se queda sin respuesta buena. Se le ocurrirá una a las tres de la mañana.',
  '%A hace burla con toda la cara, no solo con la lengua. Se nota el oficio.',
  '%A saca la lengua. %V hace lo mismo. Empate de imbéciles.',
  '%A le hace burla y %V se lo guarda para dentro de un mes. Lo va a cumplir.',
];

// ─── SEDUCIR ────────────────────────────────────────────────────────────────
//
// La unica de las explicitas donde NO pasa nada, y de ahi sale el chiste: todo
// es antes. %V ve la maniobra entera —se la ve venir, la nombra, se rie de
// ella— y cae igual. Si el pool termina el acto, deja de ser esto y se solapa
// con *!fuck*, que ya existe. Aqui se corta justo antes, siempre.
// ─── LAS CINCO APARCADAS ────────────────────────────────────────────────────
//
// SEDUCE, PREG, UNDRESS, LICKASS y GROPE estan escritas y NO tienen comando.
//
// `npm run acciones` contra la fuente NSFW de verdad contesto 403 en las cinco:
// esa web no tiene esas categorias con ese nombre. Un comando que cobra, falla
// y devuelve el aura cada vez es peor que no tenerlo —desde el grupo no se lee
// «esa categoria no existe», se lee que el bot esta roto— asi que salieron de
// ACCIONES en acciones.js.
//
// Las frases se quedan porque el trabajo esta hecho y porque el fallo puede ser
// solo de NOMBRE: `npm run acciones -- --probar` sondea alias contra la fuente
// (pregnant, creampie, rimming, undressing...) y, si alguno sirve, volver a
// montar el comando es una linea en ACCIONES.
//
// Si alguna vez se decide que no vuelven, esto se borra entero. Mientras tanto
// no molesta: los validadores las cuentan, y ningun comando las lee.
const SEDUCE = [
  '%A se acerca a %V y le dice al oído lo que le va a hacer. La guarra ya no se acuerda de lo que estaba diciendo. Ni de lo que iba a hacer luego.',
  '%A le pasa la mano por el muslo a %V y para justo antes. La zorra le pide que siga. %A retira la mano y cambia de tema.',
  '%V jura que no cae. %A le mira la boca tres segundos y la muy puta cae. Tres segundos, cronometrados por el grupo.',
  '%A le muerde el labio a %V y se aparta. La sucia va detrás. Y va a ir detrás toda la noche.',
  '%A se desabrocha un botón delante de %V. A la perra se le olvida respirar. Y se acuerda tarde y mal.',
  '%A le cuenta a %V al oído lo que le haría y no la toca. La guarra está peor que si la tocara. Y %A lo sabe y sigue sin tocarla.',
  '%V cruza las piernas cuando %A se sienta al lado. %A lo ve y sonríe. Y se sienta un poco más cerca.',
  '%A le roza el cuello a %V con la nariz. La zorra pone la cabeza de lado sin pensarlo. El cuerpo contesta antes que ella.',
  '%A le dice a %V que se acerque. La muy puta se acerca más de lo que hacía falta. Y %A la deja ahí sin decir nada más.',
  '%V le pide a %A que pare, agarrándole la camisa. La mano en la camisa dice lo contrario que la boca.',
  '%A se estira delante de %V como sin querer. La sucia ha mirado donde %A quería. Y ha vuelto a mirar dos veces más.',
  '%A le pone la mano en la rodilla a %V y no sube. La guarra lleva una hora esperando que suba. %A quita la mano y se va a por hielo.',
  '%V acusa a %A de estar provocando. %A pregunta si funciona. Funciona, y la respuesta la da el cuello de la zorra, no la boca.',
  '%A le sostiene la mirada a %V mientras se lame el labio. A la zorra se le corta la frase. Y no la termina en toda la noche.',
  '%A se pega a %V por detrás y le habla al oído. La perra se echa hacia atrás sin darse cuenta. Y de ahí ya no hay vuelta.',
  '%V dice que se tiene que ir. Lo dice sentándose otra vez. Y se quita la chaqueta mientras lo dice.',
  '%A le baja el tirante a %V con un dedo y lo vuelve a subir. La muy puta le mata con la mirada. %A lo baja otra vez, más despacio.',
  '%A le pregunta a %V qué le gusta. La guarra contesta más rápido de lo que pensaba. Y con más detalle del que pensaba dar.',
  '%A no toca a %V en toda la noche y la zorra no piensa en otra cosa. A las cuatro de la mañana sigue igual.',
  '%V se levanta a por agua para disimular. Vuelve sin agua y peor. %A ni ha tenido que moverse del sitio.',
  '%A le pasa un dedo por el cuello a %V, de abajo arriba. La sucia traga saliva. Y se le nota en la voz media hora.',
  '%A le suelta una guarrada al oído a %V con toda la calma. La perra se pone recta de golpe. Y luego se apoya en %A como si nada.',
  '%V intenta seguir a lo suyo. %A se apoya en la mesa y lo suyo deja de importar. La guarra cierra el portátil sin guardar.',
  '%A le agarra la cintura a %V al pasar y sigue andando. La guarra se queda ahí parada. Tarda medio minuto en volver a andar.',
  '%V le dice a %A que sabe perfectamente lo que hace. %A le dice que siga hablando. La zorra sigue hablando y se delata sola.',
  '%A se sienta enfrente de %V con las piernas abiertas. No hacía falta decir nada más. La muy puta no ha vuelto a mirar a la cara.',
  '%A le quita una pelusa del hombro a %V y le deja la mano puesta. La pelusa no existía. La mano sigue ahí diez minutos después.',
  '%V contesta cualquier cosa a una pregunta normal. %A le estaba mirando la boca. La sucia lo ha notado y ha perdido el hilo del todo.',
  '%A le muerde la oreja a %V y se va a hablar con otro. La zorra no se entera de nada más en toda la noche. Y se va temprano por eso.',
  '%V acaba pidiéndoselo. %A llevaba dos horas trabajando para ese momento. Y todavía la hace esperar un poco más.',
];

// ─── PREÑAR ─────────────────────────────────────────────────────────────────
//
// La de *!cum* pero con intencion, y esa es la unica diferencia que importa:
// aqui nadie saca, y se dice antes. El pool va de la DECISION —quien lo pide,
// quien lo permite, quien no se aparta— y no del acto, que ya lo cuentan otros
// tres comandos.
const PREG = [
  '%A se corre dentro de la guarra de %V y no saca. La zorra cierra las piernas para que no se escape nada. Así aguanta media hora, por si acaso.',
  '%V dice que la saque y engancha los tobillos en la espalda de %A. Ganan los tobillos. Y ganan dos veces esa noche.',
  '%A le pregunta a %V si puede acabar dentro. La muy puta dice que sí antes de que termine la frase. Y lo repite por si no se ha oído.',
  '%A vacía dentro de %V y sigue empujando despacio. La sucia lo agradece con la cara. Empujar después es lo que la remata.',
  '%V tira de %A hacia dentro en el último momento. Lo hizo a propósito y lo va a negar. Lo niega con la cara todavía roja.',
  '%A se la mete a %V hasta el fondo y se para. La perra nota cada tirón y aprieta. Aprieta hasta sacarle la última gota.',
  '%V le pide a %A que no la saque. Decirlo en voz alta les cambia la noche entera. Y la semana, visto lo visto.',
  '%A se folla a %V a pelo y la guarra no dice nada. Decir algo era el momento de antes. Ahora solo levanta las caderas.',
  '%A se corre dentro de %V y la zorra suelta el aire de golpe. Llevaba rato aguantándolo. Y todavía no ha abierto las piernas.',
  '%V se lleva la mano al coño después para que no se salga. %A lo ve y no comenta. Se lo guarda para reírse luego.',
  '%A se queda dentro de %V hasta que se le baja. La muy puta no le ha soltado la espalda. Le deja cuatro arañazos de recuerdo.',
  '%V se pone a cuatro y baja el pecho. La postura la eligió la guarra y dice bastante. Dice exactamente lo que quiere que pase.',
  '%A le sujeta las caderas a %V al correrse. La sucia no tenía intención de apartarse. Ni de moverse en los diez minutos siguientes.',
  '%V dice que es una idea de mierda con la polla de %A todavía dentro. Y no hace nada por sacársela. %A tampoco.',
  '%A se corre dentro de %V delante del espejo. La zorra no ha dejado de mirarse. Se guarda la cara que pone justo en ese momento.',
  '%V se corre a la vez y aprieta. El apretón decide el resto. Lo demás lo deciden las ganas de la guarra.',
  '%A se lo va diciendo a %V mientras se lo hace. La perra contesta que sí a todo. A todo, incluida la parte que no debería.',
  '%V se tumba después sin limpiarse nada. Eso también era parte del plan. El plan lo tenía la guarra desde el mediodía.',
  '%A va despacio al final y lo guarda todo para el último empujón dentro de %V. La zorra nota cada segundo del final.',
  '%V cruza los tobillos por detrás de %A y aprieta hasta que %A se rinde dentro. La muy puta no suelta hasta el final.',
  '%V le dice a %A que otra vez. %A ni ha sacado de la primera. Y la segunda sale sin moverse del sitio.',
  '%A vacía dentro y le besa el cuello a %V. Lo segundo es lo que la guarra va a recordar. Lo primero lo lleva encima toda la noche.',
  '%V se pone encima y no deja que %A se mueva hasta que acaba dentro. Y después tampoco le deja moverse.',
  '%A la saca un segundo y %V protesta. Vuelve a metérsela y la muy puta se calla. Se calla y engancha las piernas.',
  '%A se corre dentro de %V dos veces seguidas. La segunda fue idea de la zorra. La tercera la pide con el nombre de %A en la boca.',
  '%V nota el calor subiendo y se le cierra todo de golpe. %A aguanta sin salir. La guarra tarda un minuto en volver a hablar.',
  '%A le pregunta a %V si está segura. La sucia le contesta metiéndosela más. Y no vuelve a sacar el tema.',
  '%V pide que le llene. %A no necesita que se lo repitan. La guarra lo repite igual, dos veces.',
  '%A acaba dentro y %V no se mueve un rato largo, disfrutándolo. Se duerme con la polla de %A todavía puesta.',
  '%V se levanta después andando raro y no piensa explicar por qué. Vuelve a la cama a los diez minutos.',
];

// ─── DESNUDAR ───────────────────────────────────────────────────────────────
//
// Aqui lo caro es la LENTITUD. Todo el pool es una sola prenda tardando de mas,
// y %V dejandose. En cuanto se acelera se convierte en otro comando de los que
// ya hay, asi que ninguna frase llega al final: se quedan todas a medio camino.
// El tercer tiempo tampoco lo cierra — alarga la espera un poco mas.
const UNDRESS = [
  '%A le arranca la camiseta a la guarra de %V y %V levanta los brazos para ayudar. Ayudar no estaba en el trato.',
  '%A le desabrocha el pantalón a %V despacio. La zorra le pide que vaya más rápido. %A baja el ritmo a la mitad.',
  '%A le baja las bragas a %V con los dientes. La muy puta se agarra a la puerta. Y la puerta cruje más que ella.',
  '%V se deja desnudar de pie, sin ayudar y sin apartarse. Cuando queda la última prenda, es la guarra la que tira de ella.',
  '%A le desabrocha el sujetador a %V con una mano. La otra ya está ocupada. Y no piensa desocuparse.',
  '%A le quita la ropa a %V mirándole a la cara. La sucia aguanta la mirada a duras penas. La pierde con la última prenda.',
  '%V dice que puede desnudarse sola. %A le sigue quitando la ropa y la guarra deja de decirlo. Y acaba levantando los brazos.',
  '%A le abre la camisa a %V y se la deja puesta. Abierta y puesta es peor que quitada. La zorra tarda en entender por qué.',
  '%V levanta las caderas para que %A pueda bajarle todo. Nadie pidió esa colaboración. La muy puta colabora otra vez con las piernas.',
  '%A le quita la ropa a %V prenda a prenda sin tocar nada más. La zorra está a punto de suplicar. Suplica en la cuarta prenda.',
  '%A deja a %V en bragas y se aparta a mirar. La perra no sabe dónde meterse. Y no se tapa, que es lo que la delata.',
  '%V tiembla y dice que es el frío. No es el frío y los dos lo saben. La guarra insiste en el frío hasta el final.',
  '%A le baja los pantalones a %V hasta los tobillos y ahí los deja. La guarra no puede ni moverse. Que es exactamente el plan.',
  '%V se tapa las tetas por costumbre. %A le aparta las manos y la mira despacio. La zorra deja las manos donde se las han puesto.',
  '%A besa cada trozo de %V que va quedando al aire. Tarda una barbaridad a propósito. La sucia lleva rato pidiendo que corra.',
  '%V se queda en pelotas delante de %A, que no se ha quitado ni el reloj. Y el reloj sigue puesto toda la noche.',
  '%V intenta acelerar. %A le sujeta las muñecas y vuelve al ritmo de antes. La guarra aprende a esperar por las malas.',
  '%A le quita a %V lo último y se queda mirando sin decir nada. A la muy puta le arde la cara. Y no se mueve por si %A sigue mirando.',
  '%A le quita la ropa a %V con la luz encendida. La sucia iba a pedir que la apagara y no lo pide. Se pasa la escena mirándose los pies.',
  '%V se pone de espaldas para ponérselo fácil. Fácil no era el objetivo. %A la gira otra vez de frente.',
  '%A le pasa la mano por donde acaba de quitar tela. Sin prisa ninguna. La zorra se estira para que siga el recorrido.',
  '%V se sujeta al hombro de %A para sacar una pierna del pantalón y se le olvida soltarlo. Ahí sigue la mano media hora después.',
  '%A tira la ropa de %V al suelo sin mirar dónde cae. Eso sí fue rápido. Lo demás lleva veinte minutos y va por la mitad.',
  '%A le quita la ropa a %V en el ascensor. Quedan dos pisos y a la zorra le da igual. Sale con el sujetador en la mano.',
  '%V acaba con un calcetín puesto y %A no piensa arreglar eso ahora. El calcetín aguanta toda la noche.',
  '%A le quita la ropa a %V y la sienta encima. La guarra ya ni se acuerda de dónde la dejó. Y no la busca hasta el día siguiente.',
  '%V pide que apaguen la luz. %A enciende otra. La muy puta se tapa la cara y no el resto.',
  '%A le quita el cinturón a %V y se lo queda en la mano. La perra entiende la indirecta. Y se da la vuelta sin que se lo digan.',
  '%A le quita la ropa a %V delante del espejo y le gira la cara. La sucia no puede mirar y no deja de mirar. El espejo se lleva la escena.',
  '%A le quita la última prenda a %V y no hace nada más. La muy puta es quien da el paso siguiente. Y lo da con prisa.',
];

// ─── AZOTAR ─────────────────────────────────────────────────────────────────
//
// Lo unico que hace falta acertar aqui es el SONIDO y la CUENTA. El chiste no
// esta en el golpe: esta en que %V se queda a por el siguiente, y en que se
// oye. Sin ruido no hay frase.
const SPANK = [
  '%A le azota el culo a la guarra de %V y le gusta tanto que pide otro. Y al quinto ya lo pide por favor.',
  '%A le cruza el culo a %V de una nalgada. La muy puta levanta más el culo. %A repite en el mismo sitio y la zorra lo pide a gritos.',
  '%A pone a %V boca abajo y le calienta el culo a base de azotes. La zorra los cuenta en voz alta. Se equivoca en el nueve y %A vuelve a empezar.',
  '%A le da una palmada en el culo a %V que se oye en todo el grupo. A la guarra se le escapa un gemido. Y detrás del gemido, un "otra vez".',
  '%V dice que pare con el culo en pompa. La perra no engaña a nadie. Menos a sí misma, que sigue diciéndolo.',
  '%A le azota el culo a %V hasta dejárselo ardiendo. La sucia dice que no ha sido suficiente. %A le cree y sigue.',
  '%A le deja la mano marcada en el culo a %V. La zorra se la mira en el espejo y sonríe. Y se pone otra vez para la otra nalga.',
  '%A azota a %V despacio, uno cada mucho rato. La muy guarra acaba suplicando que vaya más rápido. %A tarda todavía más.',
  '%V pide diez azotes. %A le da quince. La perra no protesta por los cinco de más. Protesta porque no fueron veinte.',
  '%A le baja los pantalones a %V y le azota el culo sin avisar. La sucia se coloca sola para el siguiente. Y separa las piernas por su cuenta.',
  '%A le azota el culo a %V y le mete la mano después. La guarra deja de fingir que no le gusta. Chorreaba desde el segundo azote.',
  '%A le da a %V hasta dejarle el culo con marcas para tres días. La zorra las enseña como un trofeo. Y pide que se las refresquen.',
  '%V se baja las bragas sin que nadie se lo mande. %A no pregunta nada: azota. La guarra ya se había puesto en posición.',
  '%A le pregunta a %V si tiene bastante. La guarra dice que no y pone el culo otra vez. Y así seis veces, siempre con la misma respuesta.',
  '%A le azota el culo a %V con el cinturón. La perra aguanta sin moverse y pide el siguiente. El cinturón se queda corto antes que ella.',
  '%A le cruza el culo a %V delante del espejo para que se vea. La muy puta no aparta la vista. Se mira las marcas salir en directo.',
  '%V grita al tercer azote y al cuarto ya está pidiendo el quinto. Al décimo ya no grita, jadea.',
  '%A le calienta el culo a %V a cachetadas y la guarra le da las gracias. Eso es lo grave. Lo otro grave es que las cuenta.',
  '%A le agarra el pelo a %V con una mano y le azota con la otra. La zorra se deja hacer. Y arquea el culo para que llegue mejor.',
  '%A azota a %V y para a mitad. La sucia protesta, que era justo lo que %A quería oír. La segunda mitad llega más fuerte.',
  '%V acaba con el culo ardiendo y una cara que no engaña a nadie. Sentarse va a ser un problema toda la semana.',
  '%A le azota el culo flojo, con la palma abierta. La guarra pide que le dé de verdad. %A le da de verdad y la guarra se calla.',
  '%A le azota el culo a %V y le pregunta de quién es. La perra contesta sin dudar. %A le da otro por contestar tan rápido.',
  '%V pide perdón entre azote y azote. %A no le ha pedido perdón por nada. La zorra sigue pidiéndolo hasta el último.',
  '%A le deja a %V el culo caliente y la mano encima. La zorra se queda ahí, esperando. Se mueve un poco para que la mano haga algo.',
  '%A azota a %V hasta que se le cansa la mano. La muy guarra se ofrece a seguir ella. %A le pasa el cinturón y mira.',
  '%A alterna un cachete y otro en el culo de %V. La sucia ya no sabe de dónde viene el siguiente y le da igual. Solo pide que no se acaben.',
  '%V se agarra a la sábana mientras %A le azota el culo. Aguantar no es querer que pare. La sábana se rompe antes que la guarra.',
  '%A le azota el culo a %V y se lo abre después. La guarra se queda sin palabras. Las recupera para pedir la segunda tanda.',
  '%A deja de azotar. %V se queda con el culo puesto un rato largo, por si acaso. El por si acaso dura veinte minutos.',
];

// ─── LAMER EL CULO ──────────────────────────────────────────────────────────
//
// De las explicitas es la mas sucia y la que menos aguanta el adorno: frases
// cortas, el gesto y lo que provoca. %V siempre empieza diciendo que no y
// siempre acaba colocandose. Ese arco es el pool entero.
const LICKASS = [
  '%A le abre el culo a la guarra de %V y le mete la lengua. A la zorra se le va la cabeza. Y lo que queda de ella pide más.',
  '%V dice que en el culo no. %A ya tiene la lengua ahí y la muy puta se calla y se coloca. El "no" no vuelve a aparecer.',
  '%A pone a %V a cuatro y le come el culo sin prisa. La sucia baja el pecho y sube el culo. Y lo sube otro poco cada minuto.',
  '%V se agarra a lo que pilla y pide que no pare. %A no tenía intención de parar y se lo contesta con la lengua.',
  '%A le pasa la lengua por el culo a %V, despacio. La perra suelta un ruido que no había hecho nunca. Y lo repite en cuanto %A vuelve.',
  '%V decía que eso no le iba. A la guarra le tiemblan las piernas con la lengua de %A en el culo. Ahora lo pide ella.',
  '%A le come el culo a %V y le mete un dedo a la vez. La zorra se parte por la mitad. Y ninguna de las dos mitades protesta.',
  '%V se abre el culo con las manos sin que se lo pidan. Ahí se acabó la vergüenza. %A ni ha tenido que agacharse todavía.',
  '%A lame hasta que %V empuja hacia atrás. Empujar es pedirlo. Y la guarra lo pide tres veces seguidas.',
  '%V entierra la cara en la almohada y grita con la lengua de %A en el culo. La almohada no tapa nada. En el piso de abajo se enteran.',
  '%A se toma su tiempo con el culo de la muy puta de %V. Todo el que le da la gana. La zorra aguanta sin saber cuánto queda.',
  '%V se corre solo con la lengua de %A en el culo. No se lo esperaba ni la guarra. %A sigue como si nada y va a por la segunda.',
  '%A le separa el culo con las dos manos y no deja hueco. La sucia se queda sin aire. Cuando lo recupera, %A ya ha vuelto.',
  '%V pide que pare y empuja hacia atrás a la vez. %A hace caso a lo segundo. Y la lengua no se mueve de donde estaba.',
  '%A le come el culo a %V de rodillas y la zorra se sostiene de milagro. El milagro se acaba y la guarra cae de bruces.',
  '%V se muerde el brazo para no gritar con la lengua de %A en el culo. Se le oye igual. Las marcas del brazo le duran dos días.',
  '%A alterna lengua y dedos hasta que la perra de %V ya no distingue una cosa de la otra. Y deja de intentar distinguirlas.',
  '%V se coloca mejor para la lengua de %A. Colocarse mejor es haber dejado de fingir. La guarra fingió cuatro minutos exactos.',
  '%A se queda justo en el agujero, sin subir ni bajar. La guarra no aguanta eso y lo dice. Lo dice con el nombre de %A.',
  '%V dice que es una guarrada mientras levanta más el culo hacia la lengua de %A. La guarrada dura veinte minutos.',
  '%A le sujeta las caderas a %V para que no se escape de la lengua. La muy puta no iba a escaparse. Iba a pedir un dedo, y lo pide.',
  '%A escupe en el culo de %V y sigue. La zorra suelta el aire y pide más. %A escupe otra vez solo por oírla.',
  '%V levanta el culo hacia la boca de %A. El cuerpo fue más rápido que la cabeza. La cabeza llega tarde y ya da igual.',
  '%A le come el culo a %V mientras la sucia se toca. Nadie repartió las tareas. Se reparten solas y acaban a la vez.',
  '%V se queda en blanco con la lengua de %A en el culo. Cuando vuelve, %A sigue ahí abajo. Y la guarra se vuelve a ir.',
  '%A le pasa la lengua despacio a propósito y la guarra lleva rato suplicando en voz baja. Al final suplica en alto y se oye fuera.',
  '%V dice el nombre de %A dos veces con la lengua metida en el culo. La segunda no suena igual. La tercera ya no es un nombre.',
  '%A para un segundo y sopla en el culo de %V. La perra pega un bote y le pide que vuelva. %A tarda a propósito.',
  '%A termina de comerle el culo y %V se queda de rodillas pidiendo otra vez. Con el culo en pompa por si la respuesta es sí.',
  '%V le dice a %A que nadie se lo había comido así. %A ya lo sabía. Y la guarra va a volver a pedirlo mañana.',
];

// ─── MANOSEAR ───────────────────────────────────────────────────────────────
//
// La unica explicita que pasa CON GENTE DELANTE, y de ahi sale todo: la mano
// donde no se ve y %V teniendo que seguir la conversacion. Si se queda a solas
// pierde la gracia y se solapa con las otras, asi que el sitio importa en cada
// frase.
const GROPE = [
  '%A le mete mano a la guarra de %V por debajo de la mesa. %V sigue hablando y abre un poco las piernas. La frase le sale torcida.',
  '%A le agarra el culo a %V al pasar y aprieta. La zorra no se gira y sonríe. Y se queda esperando la segunda pasada.',
  '%V tiene la mano de %A donde no se ve y cara de que aquí no pasa nada. La voz la delata a los dos minutos.',
  '%A aprovecha el sitio estrecho para meterle mano a %V. El sitio no era tan estrecho. La guarra tampoco se apartó.',
  '%V pierde el hilo a mitad de frase. %A le tiene la mano entre las piernas y nadie más lo ve. La muy puta termina como puede.',
  '%A le baja la mano por la espalda a %V hasta el culo. La muy puta no la aparta. Se acerca medio paso para ponérselo fácil.',
  '%V le quita la mano a %A. %A la vuelve a poner y ahí se queda. La zorra ya no la quita.',
  '%A le toca el culo a %V delante de todos y nadie se entera. La sucia sí, y le gusta. Se pasa la cena sin decir una frase entera.',
  '%A le mete mano a %V en la cocina con gente en el salón. La perra baja la voz sin darse cuenta. El que entra a por hielo no ve nada.',
  '%V contesta a alguien con la mano de %A subiéndole por el muslo. La respuesta no tiene sentido. Nadie se la hace repetir, por suerte.',
  '%A aprieta el culo de %V y suelta. La guarra no mueve un músculo para que no pare. Y cuando %A para, protesta bajito.',
  '%V le dice a %A que ahí no. %A pregunta dónde entonces y la zorra no contesta. Solo se abre un poco en la silla.',
  '%A le mete la mano a %V por dentro de la ropa y la deja quieta. La muy puta se mueve para que se mueva. %A no mueve nada en cinco minutos.',
  '%V se levanta de golpe y se vuelve a sentar de golpe, con la mano de %A donde estaba. Nadie comenta el viaje.',
  '%A le toca el muslo a %V por debajo del mantel. El mantel tapa la mano, no la cara. Y la cara de la guarra lo cuenta todo.',
  '%V tiene las orejas encendidas y una conversación pendiente con la mano de %A en el culo. La conversación va fatal.',
  '%A le agarra las tetas a %V por encima de la ropa y le clava los dedos. La sucia suelta el aire. Y no dice ni pío para que siga.',
  '%V se acerca en vez de apartarse de la mano de %A. Eso lo ha visto el grupo entero. Y el grupo no lo va a olvidar.',
  '%A le mete mano a %V en el ascensor. Cuatro pisos dan para mucho y la guarra los aprovecha. Sale colocándose la falda.',
  '%V aguanta la mano de %A sin decir nada hasta que se quedan solos. Entonces sí dice algo. Y lo que dice es "sigue".',
  '%A le toca el culo mientras %V está al teléfono. La perra corta la llamada muy rápido. Dijo que había mala cobertura.',
  '%V se remueve en la silla con la mano de %A entre las piernas. %A sabe lo que significa y no para. La zorra tampoco lo pide.',
  '%A le mete la mano por debajo de la camiseta a %V, sin prisa. La zorra no dice nada. Y se inclina para que llegue más arriba.',
  '%V le sujeta la muñeca a %A con la mano en el culo. No para apartarla: para que se quede. Y aprieta para dejarlo claro.',
  '%A le mete mano a %V y se queda mirando a otro lado. Lo de mirar a otro lado es descaro puro. La guarra no sabe dónde meterse.',
  '%V se ríe raro de un chiste sin gracia. %A tiene la mano donde la tiene. La muy puta se ríe otra vez por si cuela.',
  '%A le toca el culo a %V en la foto de grupo. La foto salió bien igual. La cara de la zorra se explica sola si la miras dos veces.',
  '%V se levanta a por hielo que no hace falta ninguna, con la mano de %A subiéndole el muslo. Necesitaba levantarse.',
  '%A quita la mano y la guarra de %V se queda peor que con la mano puesta. Se la vuelve a poner. Y ya no la quita en toda la noche.',
  '%A le mete mano a %V en el coche parado en un semáforo. La muy puta pide que se salten el siguiente. Se saltan tres.',
];

module.exports = { HUG, NOM, PECK, CUM, SLEEP, POUT, BLEH,
  SEDUCE, PREG, UNDRESS, SPANK, LICKASS, GROPE, TICKLE, HANDHOLD,  STARE, LAUGH, YEET, KILL, FEED, KISS, CUDDLE, PAT,  PUNCH, SLAP, BITE, KICK, BONK, FUCK, ANAL, ROAST_USUARIO };
