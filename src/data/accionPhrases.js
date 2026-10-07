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
  '%A abraza a %V y no le suelta. %V podría zafarse y no le da la gana.',
  '%A abraza a %V por detrás y %V se recuesta hacia atrás sin pensarlo.',
  '%A abraza a %V diez minutos. A %V se le duerme el brazo y no lo mueve.',
  '%A abraza a %V y le apoya la barbilla en la cabeza. %V encaja ahí como si tocara.',
  '%A abraza a %V como si fuera suyo. %V no le lleva la contraria.',
  '%V se deja abrazar con los brazos colgando. Devolver el abrazo ya sería mucho.',
  '%A abraza a %V y le pasa la mano por la espalda, despacio. %V cierra los ojos.',
  '%A abraza a %V y no dice por qué. %V tampoco lo pregunta.',
  '%A abraza a %V de lado, sin avisar. %V se acomoda en el hueco.',
  '%A suelta a %V y %V se queda medio segundo de más antes de apartarse.',
  '%A abraza a %V hasta que a %V se le escapa un suspiro. Ahí ya no hay pelea.',
  '%V ofrece los brazos primero. %A entra y ya no sale.',
  '%A abraza a %V una vez y %V se pasa la tarde buscando el segundo.',
  '%V dice que no es de abrazos con los brazos de %A alrededor.',
  '%A abraza a %V y el grupo entero se entera. %V no lo desmiente.',
  '%A abraza a %V y a %V se le escapa un «ay» que el grupo ha oído perfectamente.',
  '%A abraza a %V con fuerza de oso. %V se lleva el olor de %A en la ropa todo el día.',
  '%A se lanza al cuello de %V sin avisar y casi le tira el móvil. %V salva el móvil primero.',
  '%V recibe el abrazo de %A con un brazo y sigue escribiendo con el otro.',
  '%A abraza a %V tan fuerte que a %V se le escapa un eructo. Nadie lo va a olvidar.',
  '%A le da a %V un abrazo de oso y %V acaba con la cara aplastada contra un hombro.',
  '%A abraza a %V y le da tres palmadas en la espalda, de las de pésame. %V no sabe quién se ha muerto.',
  '%V abre los brazos para %A y %A pasa de largo a por otra persona. Luego vuelve, pero ya da igual.',
  '%A abraza a %V por la espalda mientras friega. %V sigue fregando, pero peor.',
  '%A abraza a %V en la foto de grupo y a %V le sale cara de secuestro en todas.',
  '%A abraza a %V y %V aprovecha para olerle el pelo. Lo ha visto medio grupo.',
  'El abrazo de %A le pilla a %V con la boca llena. %V abraza masticando.',
  '%A abraza a %V y le cruje la espalda entera. %V agradece más el crujido que el abrazo.',
  '%V aguanta el abrazo de %A con la sonrisa de quien cuenta los segundos.',
  '%A abraza a %V con tantas ganas que a %V se le sube la camiseta y se le ve medio ombligo.',
];

const KISS = [
  '%A besa a %V y %V abre la boca sin que se lo pidan.',
  '%A besa a %V a media frase. La frase no se termina nunca.',
  '%A besa a %V y le muerde el labio al salir. %V se lo toca toda la noche.',
  '%A besa a %V del cuello a la boca, sin prisa. %V solo aguanta la respiración.',
  '%V dice que ya está y sigue con la boca donde estaba.',
  '%A besa a %V con una mano en la nuca. %V no podría apartarse aunque quisiera, y no quiere.',
  '%A besa a %V y para de golpe. %V se queda pidiéndolo con los ojos.',
  '%V cierra los ojos antes de tiempo y se queda un rato con los morros puestos esperando el beso de %A.',
  '%A le come la boca a %V hasta dejarle el labio marcado. %V lo enseña.',
  '%A besa a %V en mitad de una discusión. %V pierde la discusión ahí mismo.',
  '%V se limpia el labio después y se queda mirando a %A. Quiere otro.',
  '%A besa a %V con lengua en la cocina. Entra alguien y %V no se separa.',
  '%V dice que le huele la boca a %A toda la noche. No se lava.',
  '%A besa a %V y %V suelta un ruido bajito. El grupo lo oye.',
  '%A se acerca a %V y se para a un dedo de la boca. El último dedo lo pone %V.',
  '%V jura que fue un beso de nada. Lo jura sin convencer a nadie.',
  '%A le come la boca a %V hasta que a %V se le doblan las rodillas.',
  '%A le come la boca a %V contra la pared y a %V se le cae el vaso de la mano.',
  '%V dice que no delante de todos. %A le da un beso y %V ya no se acuerda de lo que había dicho.',
  '%A le sujeta la cara a %V y le da un beso despacio. A %V se le olvida qué hacer con las manos.',
  '%A besa a %V con lengua y %V responde con toda la torpeza del mundo.',
  '%A hace esperar a %V un segundo antes del beso. %V se inclina tanto que casi se cae.',
  '%A besa a %V delante del grupo y %V se ríe de los nervios a mitad del beso.',
  '%A le da un beso a %V con sabor a kebab. %V lo nota y no dice nada.',
  '%A besa a %V y a %V le suena la tripa en mitad del beso.',
  '%A besa a %V en la mejilla, y %V había puesto los morros para otra cosa.',
  '%A besa a %V y %V abre los ojos a mitad para ver si alguien mira. Miran todos.',
  'El beso de %A pilla a %V con chicle. Ahora el chicle es de %A.',
  '%A besa a %V y chocan los dientes. %V se ríe con la boca pegada.',
  '%A le da un beso a %V y se va sin decir nada. %V se queda con la frase a medias.',
];

const CUDDLE = [
  '%A se acurruca contra %V y %V le hace sitio sin decir nada.',
  '%A se mete en el hueco de %V y ahí se queda. %V no reclama su lado del sofá.',
  '%A se pega a %V por detrás, cucharita, y a %V le toca la parte de dentro.',
  '%A pone una pierna encima de %V y llama a eso estar a gusto. %V no discute el nombre.',
  '%A se acurruca en el pecho de %V. %V le pasa la mano por el pelo sin pensarlo.',
  '%A usa a %V de almohada. A %V se le duerme el brazo y no avisa.',
  '%A se enreda con %V en el sofá y ya no hay quien los separe. %V tampoco lo intenta.',
  '%A respira en el cuello de %V y %V cierra los ojos.',
  '%A se acurruca con %V y le pone la mano en la tripa. %V no la quita.',
  '%A se le tumba encima a %V. %V mira la puerta un segundo y decide quedarse.',
  '%A se pega a %V como si el sofá fuera suyo, y %V le hace sitio.',
  '%A se acurruca en el regazo de %V. %V deja el móvil y se rinde.',
  '%A busca el calor de %V y %V le sube la manta sin que se lo pidan.',
  '%A se arrima a %V en el cine. %V no ve la película y no le importa.',
  '%V se queja del peso de %A encima. Se queja bajito y sin apartarse.',
  '%A pone la cabeza en las piernas de %V. %V le acaricia el pelo en automático.',
  '%A se pega a %V y %V finge que sigue leyendo. Lleva diez minutos en la misma línea.',
  '%A se mete debajo del brazo de %V. %V levanta el brazo antes de pensarlo.',
  '%A se acurruca contra la espalda de %V y le pasa el brazo por la cintura. %V lo sujeta.',
  '%A se duerme encima de %V y %V cancela lo que tuviera.',
  '%A se acurruca contra %V con los pies helados y se los pone en las piernas. %V grita bajito.',
  '%A se acurruca con %V y le roba la mitad de la manta en diez segundos. %V tirita en su propio sofá.',
  '%A se acurruca contra %V y a los cinco minutos ya ronca. %V pierde el hilo de la serie.',
  '%V dice que solo cinco minutos de mimos. Llevan cuarenta y la serie ya se ha acabado.',
  '%A se acurruca con %V y le pide que no se mueva. A %V le pica la nariz desde entonces.',
  '%A se pega a %V bajo la manta y a %V le entra un calor que no es del radiador.',
  '%A se acurruca contra %V y le llena la camiseta de migas de galleta.',
  '%A se acurruca con %V delante del grupo y a %V le llegan quince mensajes privados en un minuto.',
  '%A se acurruca con %V y le pone el móvil en la cara para enseñarle vídeos de perros. Una hora de perros.',
  '%A se levanta un segundo para ir al baño y %V ya le ha ocupado el hueco del sofá.',
];

const PAT = [
  '%A le pasa la mano por el pelo a %V. %V cierra los ojos y se deja.',
  '%A le da unas palmaditas en la cabeza a %V. %V protesta y no se aparta.',
  '%A le revuelve el pelo a %V. %V se lo recoloca y vuelve a ponerse a tiro.',
  '%V dice que no es un perro con la mano de %A en la cabeza.',
  '%A le acaricia la nuca a %V y a %V se le va el enfado de golpe.',
  '%A le pone la palma en la coronilla a %V y no la quita. %V no se mueve.',
  '%V acerca la cabeza a la mano de %A como un gato pidiendo más.',
  '%A le acaricia el pelo a %V mientras habla con otra persona. %V no dice nada.',
  '%A le da dos palmaditas a %V y se va. %V se queda esperando la tercera.',
  '%A acaricia a %V despacio y %V se acurruca contra la mano.',
  '%V se pone de rodillas para que la mano de %A le llegue mejor a la cabeza. Nadie se lo pidió.',
  '%A le pasa la mano por el pelo a %V y le tira un poco al final. %V traga saliva.',
  '%A le acaricia la mejilla a %V con el pulgar. %V se apoya en la mano.',
  '%A le acaricia el pelo a %V hasta que %V se duerme encima.',
  '%A le pone la mano en la cabeza a %V y la deja ahí toda la conversación.',
  '%V se deja acariciar con los ojos cerrados. Que no le digan que le gusta, que lo niega.',
  '%A le acaricia la cabeza a %V y le rasca detrás de la oreja. %V se derrite.',
  '%A le acaricia el pelo a %V y %V suspira. El grupo lo ha oído.',
  '%A le sujeta la cara a %V y le acaricia el pómulo. %V no aparta la vista.',
  '%A le da a %V dos palmaditas en la cabeza y %V pone cara de que le han dado un premio.',
  '%A le pasa la mano por la cabeza a %V y le deshace el peinado. %V lo ve en el espejo y calla.',
  '%A le da palmaditas a %V delante de todos y %V finge que le molesta con muy poco éxito.',
  '%A acaricia la cabeza de %V con la mano llena de aceite de patatas. %V se entera luego.',
  '%A le da una palmada en la coronilla a %V y a %V se le baja la cabeza un palmo.',
  '%A le acaricia el pelo a %V y se lleva tres pelos en la mano. %V los cuenta.',
  '%A le toca la cabeza a %V y le encuentra un chichón. %V no sabe explicarlo.',
  '%A le rasca la cabeza a %V con las uñas y a %V se le pone la piel de gallina hasta los tobillos.',
  '%A le da a %V una palmadita en la cabeza al pasar, como quien toca madera. %V se lo toma como un cumplido.',
  '%A le pasa la mano por el pelo a %V y le deja un remolino nuevo.',
  '%A le da una palmada en la cabeza a %V y %V se la devuelve más fuerte.',
];


const PUNCH = [
  '%A le parte la cara a %V. Se oye el crujido y nadie mueve un dedo.',
  '%A revienta a %V de un puñetazo y a %V se le cae un diente al suelo. Pensaba que era el móvil.',
  '%A le cruza la cara a %V. Mañana no va a poder masticar por ese lado.',
  '%A golpea a %V donde le va a doler al respirar durante una semana.',
  '%A pega a %V hasta que deja de contestar. Ese era el objetivo.',
  '%A le borra la sonrisa a %V de un golpe, y de paso un trozo de diente.',
  '%A le tuerce la nariz a %V de una hostia. Ahora mira un poco a la izquierda.',
  '%A le revienta la nariz a %V y se oye un crujido que da grima.',
  '%A le mete un puñetazo en el hígado a %V y %V se dobla como una toalla mojada.',
  '%A le da a %V en la mandíbula y ahora le cruje cada vez que bosteza.',
  '%A le pega a %V en la boca y %V se pasa la tarde buscándose los dientes con la lengua.',
  'El puñetazo de %A le deja a %V un ojo morado y cerrado. Justo para la foto de perfil.',
  'Hostia de %A y a %V se le va la cabeza para atrás. Mañana no gira el cuello.',
  '%A le parte el labio a %V de un recto. Sabor a sangre para el resto del día.',
  '%A le mete a %V un puñetazo en el pecho y le deja sin aire y sin ganas de hablar.',
  '%A le da en el pómulo a %V y %V acaba en el suelo sin saber cómo.',
  'El puñetazo de %A le saca a %V la saliva volando. Que la limpie %V, que es suya.',
  '%A le da a %V un golpe en la oreja y se la deja pitando. A ver si así se le quitan las tonterías.',
  '%A le mete un gancho a %V en la sien y %V se apaga como una tele vieja.',
  '%A le mete a %V en las costillas y suena un crac. %A ni se inmuta.',
  'El golpe de %A le arranca un diente a %V. Lo escupe y nadie se agacha a recogerlo.',
  '%A le revienta la nariz a %V y le llena de sangre la camiseta buena. %A ni se limpia las manos.',
  '%A le pega a %V dos veces en el mismo ojo. La segunda, por si no había quedado claro.',
  'Puñetazo de %A al estómago y %V casi echa la cena encima de todos.',
  '%A le pega a %V y %V se da con la cabeza en la pared. Dos golpes por el precio de uno.',
  '%A le cambia la forma de la boca a %V. Ya no le da para soltar el chiste que tenía preparado.',
  '%A le da tal golpe a %V que le salta el móvil de la mano. El móvil sobrevive; %V, regular.',
  '%A le da a %V y a %V le fallan las piernas. Se sienta en el suelo y %A ni le ayuda.',
  '%A le mete un directo a %V y a %V se le queda cara de lunes a primera hora.',
  '%A le da un puñetazo a %V en el estómago y a %V se le escapa el aire con ruido de globo.',
];

const SLAP = [
  'Bofetada de %A a %V. Primero suena y luego escuece.',
  '%A abofetea a %V con la mano abierta, que es peor y lo sabe. A %V se le ha quedado la mejilla cantando.',
  '%A le suelta un revés a %V. Cinco dedos marcados y una lección. %V se examina en el reflejo del móvil.',
  'Bofetón de %A y %V se calla de golpe. Discusión terminada.',
  '%A le cruza la cara a %V de revés. Con el revés llegan los nudillos, y llegan al hueso.',
  '%A abofetea a %V hasta que le pita el oído. Correctivo completo.',
  '%A le mete un bofetón a %V. Ya se hablaba de que tocaba.',
  'La bofetada de %A deja la mejilla de %V caliente y la boca abierta. Ahora tiene color.',
  '%A le da un bofetón a %V que le gira la cabeza de lado. %V tarda en volver a mirar.',
  'Bofetón de %A en toda la boca de %V. Se le olvida lo que iba a decir.',
  '%A le planta a %V un bofetón con la mano abierta. %V se queda con la boca abierta también.',
  '%A le arrea un bofetón a %V y se le pone la cara como un tomate.',
  'Bofetada de %A que se oye desde el otro lado del grupo. %V se queda con los dedos marcados.',
  '%A le da un bofetón a %V y se le saltan las lágrimas. %A no le pasa ni un pañuelo.',
  'El bofetón de %A le saca a %V el chicle. El chicle era lo más inteligente que tenía en la boca.',
  'Revés de %A en la boca de %V. Le parte el labio con el anillo.',
  'La bofetada de %A suena como un latigazo. %V aguanta de pie de milagro.',
  '%V se sujeta la mejilla caliente y busca una excusa. %A no quiere oírla.',
  'Dos bofetones de %A. El segundo porque el primero le quedó bien a %V en la cara.',
  '%A le deja a %V la mano marcada en la cara. Se ve desde el sofá.',
  'La mano abierta de %A encuentra la mejilla con la que %V habla. Por fin un uso.',
  'La bofetada de %A le cruza a %V un hilo de saliva de lado.',
  '%A le da el correctivo delante de todos. A %V le escuece la cara y el orgullo.',
  '%V se lleva la mano a la mejilla y le tiembla. %A ni se inmuta.',
  'El bofetón de %A termina la frase que %V estaba escribiendo. Por fin un punto final que se entiende.',
  '%A abofetea a %V con la mano abierta y sin medir. %V lleva la palma marcada en la mejilla.',
  '%A le da una bofetada a %V y a %V se le queda la cara mirando a la pared de al lado.',
  'El bofetón de %A le deja a %V los cinco dedos marcados. Se cuentan desde la otra punta del grupo.',
  '%A le da tal bofetón a %V que %V se queda mirando a la nada un rato.',
  '%A le da a %V un bofetón de ida y vuelta. La vuelta ha dolido más.',
];

const BITE = [
  '%A le hinca el diente a %V. Con ganas, con saliva y con testigos.',
  '%A muerde a %V donde va a tener que dar explicaciones.',
  '%A le pega un bocado a %V y la marca sale antes que la queja. La queja llega sin fuerza.',
  'En un grupo normal el bocado de %A a %V tendría consecuencias. Aquí se queda la marca.',
  'El bocado de %A va a la clavícula de %V, la que se ve con el pico.',
  '%A le muerde a %V hasta hacerle sangre, y no precisamente un poquito.',
  '%A le muerde el brazo a %V y no suelta hasta dejarle los dientes marcados.',
  '%A le muerde la oreja a %V, aunque se nota que iba a por el cuello.',
  '%V suelta un quejido y %A no suelta. Le ha sonado a que siga.',
  '%A le muerde a %V por encima de la camiseta y le deja la camiseta con agujeros.',
  '%A le deja a %V el cuello morado para la cena. Ningún jersey lo tapa.',
  '%A le muerde a %V el hombro izquierdo. El derecho, por ahora, se libra.',
  '%A le arranca a %V un trozo de piel de un bocado. %V se mira la marca sin creérselo.',
  '%A muerde a %V de broma y acaba apretando de verdad. %V tira y le duele más.',
  '%A muerde a %V junto a la clavícula. Hoy se oye el grito y mañana se ve la marca.',
  '%A le muerde a %V en la mandíbula, a un centímetro de la boca. Más morbo que si fuera en la boca.',
  '%V va a tener que ir con cuello alto unos días. Cortesía de %A.',
  '%A le deja a %V un mordisco con babas y ni pide perdón. %V tampoco se queja.',
  '%A muerde a %V y %V se agarra a lo primero que pilla hasta que %A suelta.',
  '%A le rompe la piel a %V a propósito. %V ya está pensando qué excusa poner mañana.',
  '%A le muerde a %V justo donde se nota el pulso. Sabe lo que hace.',
  '%A le pega un bocado a %V en el brazo y %V suelta un grito que se oye en el portal.',
  '%A muerde a %V en el hombro con tanta hambre que %V pregunta si ha comido hoy.',
  '%A muerde a %V en la pantorrilla, como los perros a los carteros. %V cojea hasta el sofá.',
  '%A le da un mordisco a %V en la mejilla y %V se queda con la cara llena de babas.',
  '%A muerde a %V en el culo, a traición. %V se gira con una cara que el grupo va a recordar.',
  '%A le hinca el diente a %V en el antebrazo y %V cuenta hasta diez para no devolverlo.',
  '%A muerde a %V y %V se mira el sitio pensando en la vacuna de la rabia.',
  '%A le da un bocado a %V en la oreja y a %V se le queda la oreja pitando.',
  '%A muerde a %V en mitad de la foto de grupo. La foto sale con %V gritando.',
];

const KICK = [
  '%A patea a %V fuera del encuadre y de la conversación.',
  'Patadón de %A a %V que le recoloca los órganos. Y no a mejor.',
  '%A patea a %V como quien cierra una puerta de una patada. Tema cerrado.',
  '%A le suelta una patada a %V. Se ha oído hasta en el otro grupo.',
  '%A patea a %V y ni mira dónde cae. %V cae contra una silla y la silla se lleva el ruido.',
  '%A le da a %V con el pie. Con la mano habría sido demasiado honor.',
  '%A patea a %V en el suelo. Ahí ya no hace falta, pero se hace igual.',
  'Patada de %A en el estómago y a %V se le corta el aire de golpe.',
  '%A le mete un rodillazo a %V en el muslo y %V se queda sin sentir la pierna un buen rato.',
  '%A le da a %V con la puntera en el riñón. %V acaba de descubrir que tiene uno.',
  '%A le suelta a %V un puntapié en la cadera y %V tiene que andar de lado el resto del día.',
  'Desde el suelo, %A le planta a %V una patada en la cara. Feo, pero efectivo.',
  'Pisotón de %A con el tacón en el empeine de %V. Rastrero y duele que te cagas.',
  'La patada de %A a %V suena como un bombo.',
  '%A le deja a %V la marca de la suela en la camisa, y a %V en el suelo.',
  '%V intenta irse a gatas y %A le da otra patada igual. Sin piedad.',
  '%A coge carrerilla y le mete a %V una patada que le deja sin aire al caer.',
  '%A le estampa una patada en la boca a %V y %V acaba besando el suelo.',
  '%A le patea la pierna a %V y %V vuelve a casa a la pata coja.',
  'Con una patada, %A le quita a %V el aire y las ganas de hacerse el gracioso.',
  '%A le pone el pie en el pecho a %V y se queda así un rato. %V ni respira.',
  '%A le planta el pie en la columna a %V. Las manos de %V olvidan lo que estaban haciendo.',
  '%A le mete a %V una patada en la entrepierna, de abajo arriba y con puntera. A %V se le va la voz una octava.',
  '%A le da a %V una patada en la espinilla y %V se pasa diez minutos saltando a la pata coja.',
  '%A le pega a %V un patadón en el culo que le sube dos escalones de golpe.',
  '%A le da una patada a %V en el tobillo por debajo de la mesa. %V sonríe al grupo y llora por dentro.',
  '%A patea a %V fuera de la silla y se sienta en su sitio. El sitio todavía está caliente.',
  '%A le suelta a %V una patada de kárate que ha visto en un vídeo. Le sale regular, pero a %V le duele igual.',
  '%A le da a %V una patada y a %V se le sale la zapatilla volando.',
  '%A le da una patada a %V en la rodilla y %V se sienta sin que nadie se lo pida.',
];

const BONK = [
  '%A le da un mazazo a %V en la cabeza. Se le ha reiniciado algo.',
  '%A le da a %V hasta que se le quita la tontería. Diez minutos, y se contaron.',
  '%A le rompe algo en la cabeza a %V. Se rompe el objeto, pero la tontería de %V sigue entera.',
  '%A le da su merecido a %V delante de todos, que es como más escuece.',
  '%A le sacude a %V. Y a %V se le ha bajado la calentura de golpe.',
  '%A le da lo suyo a %V. Nadie va a preguntar por qué.',
  '%A corrige a %V a golpes. Método antiguo y sigue funcionando.',
  'El porrazo de %A le pone a %V los ojos bizcos. Los dos miran igual de poco.',
  '%A le da a %V un golpe en la coronilla que suena a hueco.',
  '%A le da tan rápido a %V que se le corta la frase a mitad de palabra.',
  '%A le pega a %V dos veces en el mismo sitio. La primera era un aviso.',
  'El mazazo de %A le resuena a %V en los empastes. Lo único metálico que tenía.',
  '%A le suelta un golpe en la cabeza a %V que le deja viendo lucecitas.',
  '%A le da a %V en la cabeza y suena a lata vacía. Lo que se sospechaba.',
  'El golpe de %A hace que %V suelte lo que estaba usando para dar lecciones.',
  '%A le da un mazazo a %V en la frente, que es donde estaba el problema.',
  '%A le da a %V un golpe que le deja la cara en blanco un segundo, como un ordenador reiniciándose.',
  '%A le pega a %V la cabeza contra la superficie más cercana. Eficiente.',
  '%A le deja a %V un chichón del tamaño de un huevo. %V va a decir que se dio con una puerta.',
  '%A le da a %V un porrazo y %V se toca la cabeza buscando el bulto. Lo encuentra.',
  '%A le pega a %V hasta que se le borra la sonrisita.',
  '%A le pega a %V con el periódico enrollado. %V ve que es el de ayer y se ofende más.',
  '%A le da un capón a %V y le deja el remolino al revés.',
  '%A le da a %V con la zapatilla, como hacían las madres. %V recuerda cosas que tenía olvidadas.',
  '%A le arrea a %V con la sartén, como en los dibujos animados. A %V le salen pajaritos, y los pajaritos se ríen.',
  '%A le da a %V con la chancla y la chancla vuelve sola a su pie.',
  '%A le da a %V en la cabeza con el móvil de %V. Doble humillación.',
  'El golpe de %A deja a %V mirando fijo a un punto de la pared durante un minuto entero.',
  '%A le da un coscorrón a %V y %V se palpa la cabeza a ver si sigue ahí. Por desgracia, sigue.',
  '%A manda a %V a la cárcel de los salidos de un golpe en la cabeza. %V no recurre.',
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
// 6 de cada 30. Ese listón ya no se cumple: hoy son 10 en FUCK, 7 en ANAL, 9
// en CUM y 11 en SPANK. Si alguien toca frases aquí, es lo primero que hay que
// bajar, y los casi-clones salen con scripts/progreso.js.
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
// Lo mismo vale para ANAL, CUM y SPANK: el dueño las dejó exentas igual que
// esta (septiembre de 2026). Y fuera de este fichero, para PIROPOS.
//
// La regla general del fichero es que ni %A ni %V tienen género: cualquiera del
// grupo cae en cualquiera de las dos menciones, así que una frase que dice «él»
// o cierra en -o falla el día que le toca a ellas, con su nombre delante. Eso
// vale para las demás acciones y `npm run check` lo vigila.
//
// Aquí NO. Dieciséis de estas treinta dan por hecho que quien recibe es mujer
// —coño, clítoris, moja, chorrea, el charco— y así es como se quieren. Se
// reescribieron una vez para hacerlas neutras y el dueño lo revirtió: «estaba
// bien así». Es su bot y su grupo; sabe quién lo usa y con quién.
//
// Queda escrito aquí para que no se vuelva a «arreglar» solo. Quien pase por
// este fichero buscando concordancias rotas: estas no lo son, son una decisión.
// Las demás acciones sí, y ahí sí hay que mirar.
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
  '%A ha pagado un gif para hacer lo que no se atreve a escribir. El grupo lo ha entendido igual.',
  '%A se queda mirando si llegan los dos ticks. Un gif, y ya está esperando respuesta.',
  '%A, una mención y un gif. En persona habría que ver si te atreves.',
  '%A, acción pagada. Tu aura se va en gifs, y lo que querías decir sigue sin decirse.',
  'El gif lo ha hecho todo, %A. Tú solo has puesto el aura.',
  '%A, has pagado para que un dibujo haga lo que tú no te atreves. Y lo ha visto todo el grupo.',
  '%A se gasta el aura en un dibujito que hace las cosas por %A.',
  '%A ha pagado para relacionarse. Con tarifa.',
  'Qué bonito, %A, un gif. En persona no lo harías ni con tres copas.',
  '%A, un gif de anime no cuenta como un «buenos días» de verdad.',
  'El aura de %A se escapa a golpe de gif. La dignidad va detrás.',
  '%A, pagas para que un dibujito lo haga por ti. Tela.',
  'A %A le sale más barato un gif que una conversación. Y se nota por qué.',
  '%A ha pagado para tener algo que contar. El truco se ve de lejos.',
  '%A, cada gif que mandas deja claro que en persona no te atreves.',
  'Los gifs de %A tienen más vida que %A. Por lo menos se mueven.',
  '%A, te gastas el aura en gifs de cosas que en tu vida te pasan.',
  '%A ha pagado aura por un gif. Con eso se compraba algo útil en la tienda.',
  '%A, el comando no te va a contestar. La persona tampoco.',
  '%A, un gif no cuenta como haberlo hecho. Lo sabes y pagas igual.',
  'Lo más valiente que ha hecho %A hoy lo ha dibujado otro y lo ha cobrado el bot.',
  '%A, ese gif ha costado aura. La cara que pones al mandarlo, más.',
  'Si el valor se comprara, %A estaría en la ruina. Va camino.',
  '%A, cambiar aura por escenas de mentira es el peor negocio del grupo.',
  'El bot cobra y %A paga. Es la relación más estable que tiene %A.',
  '%A manda el gif y se queda mirando la pantalla, como si fuera a pasar algo. No pasa.',
  '%A, el gif es mono y tú no, por eso mandas el gif.',
  '%A paga cada escena como quien paga una ronda para que le hablen. La ronda la cobra el bot.',
  '%A, llevas más abrazos en gif que en persona.',
  '%A se esconde detrás del gif, pero se le ve igual.',
];


// COSQUILLAS. La risa involuntaria: %V no elige reirse y ahi esta el chiste.
// Nadie sale digno de esto, y menos quien la recibe.
const TICKLE = [
  '%A le mete cosquillas a %V por debajo del brazo y %V baja el brazo demasiado tarde.',
  '%A repite las cosquillas en el mismo punto. %V ya sabe cuál es y eso lo hace peor.',
  '%V acaba en el suelo de la risa. %A sigue desde arriba.',
  '%A encuentra el punto exacto de %V a la primera. %V no sabía ni que lo tenía.',
  '%V grita que pare. El cuerpo dice otra cosa y %A le hace caso al cuerpo.',
  '%A le hace cosquillas a %V hasta que suplica. %V suplica rápido.',
  '%V se dobla de la risa delante de %A y acaba sin poder ni hablar.',
  'Diez segundos de cosquillas y %V ya está negociando. Desde el suelo se negocia peor.',
  '%A le sujeta las muñecas a %V y le hace cosquillas con la otra mano. %V no forcejea mucho.',
  '%V dice que odia las cosquillas y se queda donde %A llega.',
  '%V se queda sin aire de la risa. %A espera a que recupere y sigue.',
  '%V intenta escaparse y se mueve justo hacia las manos de %A.',
  '%V se ríe hasta que le duele. %A le pregunta si quiere que pare y %V tarda en contestar.',
  '%A le hace cosquillas a %V con una sola mano y sin esfuerzo. %V ya está en el suelo.',
  '%V se tapa las costillas y %A le ataca las rodillas. Se la ha colado bien.',
  '%V dice que ya no le hacen gracia las cosquillas. Se ríe igual.',
  '%A deja de hacerle cosquillas a %V. %V tarda un rato en dejar de reírse.',
  'Cosquillas de %A en la axila, y %V suelta un gruñido de cerdo que el grupo va a imitar un mes.',
  '%V aguanta tres segundos de cosquillas con cara seria. Al cuarto se le escapa un pedo.',
  '%A encuentra las cosquillas de %V en la planta del pie y se lleva una patada sin querer. Queriendo un poco.',
  '%V llora de risa con los mocos colgando y %A no para.',
  '%A ataca las costillas de %V y a %V se le cae el móvil al suelo. El móvil también sufre.',
  'Las cosquillas de %A llegan justo cuando %V bebía. El sofá se lleva la cerveza.',
  '%V jura que no tiene cosquillas. %A le toca una vez el costado y se acaba el juramento.',
  '%V se retuerce tanto con las cosquillas de %A que acaba con la camiseta del revés.',
  '%A le hace cosquillas a %V con una pluma imaginaria y %V se ríe igual. Eso ya es sugestión.',
  '%V pide tregua entre carcajadas. %A la concede, cuenta hasta dos y la rompe.',
  '%A usa las cosquillas para quitarle el mando a %V. Funciona a la primera.',
  '%V ha aprendido a protegerse las costillas. %A ha aprendido dónde está el cuello.',
  '%V se ríe tan fuerte con las cosquillas de %A que los vecinos preguntan si va todo bien.',
];

// DE LA MANO. El gesto mas inocente de la lista y por eso el mas incomodo: no
// pasa nada, y justo por eso %V le da mil vueltas. El chiste es la lectura de
// mas, no el contacto.
const HANDHOLD = [
  '%A entrelaza los dedos con %V y %V aprieta de vuelta sin pensarlo.',
  '%V ofrece la mano primero. %A la coge y ya no la devuelve.',
  '%A le aprieta la mano a %V una vez. %V lo pilla al momento.',
  '%V dice que le suda la mano y no la mueve.',
  '%A tira de la mano de %V para que la siga. %V la sigue.',
  '%V mira alrededor a ver quién los ha visto de la mano. Los han visto todos.',
  '%A le agarra la muñeca a %V y baja hasta la mano. %V abre los dedos.',
  '%V suelta la mano de %A para coger algo y la vuelve a buscar enseguida.',
  '%A le coge la mano a %V en mitad de una discusión. La discusión se acaba ahí.',
  '%A le coge las dos manos a %V. %V se queda sin nada que hacer con ellas.',
  '%A le suelta la mano a %V y %V se queda con la mano medio abierta.',
  '%V finge que se coloca el pelo para no coger la mano de %A. %A se la coge igual.',
  '%A le coge la mano a %V mientras conduce. %V no se la pide de vuelta.',
  '%V lleva la mano de %A a su propia pierna. Eso no fue un accidente.',
  '%V dice que solo son manos. Lo dice sin soltar la de %A.',
  '%V tiene la mano sudada y %A se la coge igual. Eso es amor o no tener tacto.',
  '%A busca la mano de %V por debajo de la mesa y le toca la rodilla por error. %V casi se atraganta con la cerveza.',
  'Van de la mano por la calle y %V se cruza con su madre. %V saluda con la otra.',
  '%A entrelaza los dedos con %V y a %V le cruje un nudillo. Momento arruinado.',
  '%A le da la mano a %V para cruzar un paso de cebra en verde. %V la acepta como si fuera la autopista.',
  '%V intenta escribir con la mano libre y manda «hosla». Todo el grupo sabe por qué.',
  'La mano de %A está helada y %V se queja. Y se la mete en el bolsillo para calentarla.',
  '%A y %V van de la mano y la gente tiene que bajarse de la acera para dejarles pasar.',
  '%A agarra la mano de %V en la montaña rusa y %V le deja las uñas marcadas.',
  '%A le roza los dedos a %V al pasarle el mechero y %V se queda mirándose la mano.',
  '%V finge que necesita ayuda para bajar un escalón para que %A le dé la mano.',
  '%A le coge la mano a %V y no la suelta. A %V le da igual la película: le gusta el apretón.',
  '%A le da la mano a %V con el grupo delante. Alguien ya ha sacado el móvil.',
  '%V aprieta la mano de %A cada vez que pasa alguien que le cae mal. Hoy van nueve.',
  'Van de la mano hasta la puerta del bar. Ahí %V suelta, que dentro hay gente conocida.',
];


// MIRAR FIJO. La unica accion de la lista en la que no se toca a nadie y aun
// asi es la mas invasiva. %A no hace nada; el que se descompone es %V.
const STARE = [
  'La mirada de %A no se mueve de %V. Los diez segundos más largos del grupo.',
  '%A le clava la mirada a %V hasta que %V baja la vista al suelo.',
  '%A observa a %V sin decir nada y %V empieza a explicarse sin que nadie pregunte.',
  '%A tiene los ojos clavados en %V sin pestañear, y %V ya no sabe ni cómo sentarse.',
  '%A mira a %V como quien lee algo que no debería estar viendo.',
  '%V nota la mirada antes de girarse. Cuando se gira, %A sigue ahí.',
  '%A no aparta la vista y %V ya se ha tocado el pelo tres veces.',
  '%A se queda mirando a %V un buen rato. Eso ya no es curiosidad.',
  '%V pregunta qué pasa y %A sigue con la vista clavada sin decir ni mu.',
  '%A mira a %V mientras habla otra persona. La otra persona ya no importa.',
  'El grupo entero nota que %A está mirando a %V. %V se entera lo último.',
  '%A mira fijo a %V y le sonríe medio segundo. %V se pasa la semana dándole vueltas.',
  '%V intenta sostenerle la mirada a %A. Dura poco y se le nota el esfuerzo.',
  '%A solo mira, sin decir nada, y a %V le está sentando peor que un insulto.',
  'Los ojos de %A encima de %V toda la tarde. %V no ha dicho nada desde entonces.',
  '%A mira a %V con la cabeza ladeada, como un perro decidiendo si muerde.',
  'La vista de %A se queda en %V un rato después de que %V dejara de hablar.',
  '%A mira fijo. %V se ríe sin motivo y la risa se le apaga sola a mitad.',
  '%A no dice ni una palabra y ya ha dicho más que %V en todo el día.',
  '%V se aparta un poco. %A gira la cabeza lo justo para seguir mirando.',
  'Mirada de %A sobre %V, larga y sin explicación. Nadie pide explicaciones aquí.',
  '%A mira a %V desde el otro lado. La distancia no ayuda nada a %V.',
  'A %V le sube el color a la cara mientras %A no aparta la vista. Dice que es del calor, y no hace calor.',
  '%A observa a %V como se observa algo que se va a comprar.',
  '%V mira el móvil para escapar. %A sigue ahí cuando lo levanta.',
  '%A entrecierra los ojos mirando a %V. Peor todavía.',
  'La mirada de %A aguanta hasta que %V dice una tontería para romperla. La tontería quedó grabada.',
  '%A mira a %V sin parpadear y a %V le empieza a picar el ojo por los dos.',
  '%A mira fijo a %V hasta que %V se gira para ver si hay alguien detrás. No hay nadie.',
  '%A se queda mirando a %V con la cuchara a medio camino. %V ya no sabe si tiene algo en la cara.',
];

// REIRSE. La unica accion que no toca a %V y le deja marca igual: la burla
// delante del grupo. El chiste NO es el chiste de %V — es que %V no lo era.
const LAUGH = [
  'La risa de %A empieza cuando %V termina de hablar. %V lo entiende a la tercera.',
  'La carcajada de %A llega antes de que %V termine la frase. La frase ya no hace falta.',
  '%A se parte de risa mientras %V todavía cree que hablaban en serio.',
  '%V dice algo y solo se ríe %A, con el resto del grupo en silencio. Qué vergüenza ajena.',
  '%A suelta una risa seca mirando a %V. De esas que duelen más que una carcajada.',
  '%A se ríe de %V, el grupo se apunta y %V se ríe también para no quedar peor.',
  '%V esperaba que %A se lo tomara en serio. %A se está muriendo de risa.',
  'De tanto reírse, %A ya no puede explicar de qué. %V lleva un rato sospechándolo.',
  'La risa de %A dura más de lo que %V puede aguantar sin cambiar de tema.',
  '%V intenta contar algo serio y %A se ríe en su cara. Se acabó lo serio.',
  '%A se ríe de %V tranquilamente, sin prisa, que es lo que más jode.',
  '%V pregunta qué pasa. %A no puede contestar de la risa.',
  '%A se ríe y señala a %V. Señalar es innecesario y por eso lo hace.',
  'La risa se para de golpe. %A mira a %V y arranca otra vez.',
  '%A se ríe de %V y luego pide perdón. El perdón llega entre carcajadas, así que no vale.',
  '%A no explica el chiste y nadie más lo intenta. %V pregunta dos veces y se queda sin respuesta.',
  '%A se aguanta la risa dos segundos por educación y luego la suelta en la cara de %V.',
  'Nadie se atrevía. %A se ríe de %V y el grupo aprende que se podía.',
  '%V no ha dicho nada gracioso y %A se ríe igual. Un poco mal de la cabeza.',
  '%A se ríe tan fuerte que mata la conversación, y %V se queda con la frase en la boca.',
  'Ni mirar hace falta: %A se ríe de %V con los ojos cerrados.',
  '%V intenta seguir hablando por encima de la risa de %A. No le oye nadie.',
  '%A se ríe de %V con esa risa que se contagia. Se contagió a todos menos a %V.',
  '%V se cruza de brazos y %A se ríe todavía más fuerte. Cruzarse de brazos nunca ha funcionado.',
  'Nadie pide perdón aquí. %A se ríe de %V y %V se ríe medio segundo tarde, para no quedarse fuera.',
  '%A se ríe de %V con la boca abierta y enseñando el chicle.',
  'A %A se le escapa una carcajada con ronquido incluido. El motivo es %V, y %V lo sabe.',
  '%A se ríe de %V tanto que tiene que apoyarse en la pared. %V espera con los brazos cruzados.',
  '%A se ríe de %V y se le sale la bebida por la nariz. Ni así para.',
  '%A se ríe de %V en un audio de un minuto que solo tiene risa. %V lo escucha entero.',
];

// LANZAR. Violencia comica, sin sangre: lo que duele es lo que dice el gesto.
// Se lanza lo que sobra, y el remate esta casi siempre en lo que %A hace
// DESPUES: sacudirse las manos, no mirar, seguir a lo suyo.
const YEET = [
  '%A agarra a %V y le lanza lejos, muy lejos.',
  '%A lanza a %V por los aires. El vuelo es bonito; el aterrizaje, no tanto.',
  '%A suelta a %V y %V aterriza de cara. Aterrizar es mucho decir.',
  '%A lanza a %V fuera del encuadre. %V vuelve a pie y llega cuando ya se hablaba de otra cosa.',
  '%A levanta a %V y suelta. %V no llegó a preguntar por qué.',
  '%A lanza a %V por los aires y nadie del grupo se levanta a recogerle.',
  '%A tira a %V con puntería. Eso es lo preocupante: había puntería.',
  '%V se va por el aire con la frase a medias. A %A no le interesaba el final.',
  '%A lanza a %V al otro lado. Al otro lado hay una mesa, y la mesa no se aparta.',
  '%A tira a %V y primero se oye el golpe. La queja llega después.',
  '%A carga a %V y suelta como si %V pesara menos de lo que pesa.',
  '%A lanza a %V tan lejos que tarda un rato en tocar suelo.',
  '%V le pide a %A bajar. Bajaba igual, solo que no como quería.',
  '%A se quita a %V de encima de un lanzamiento. Sin miramientos.',
  'Dos metros de vuelo que le regala %A a %V. %V aterriza con el móvil todavía en la mano.',
  '%A tira a %V y el grupo hace el ruido ese que se hace. %V lo escuchó desde el suelo.',
  '%V se levanta y se sacude el polvo mientras %A ni le mira.',
  '%A manda a %V lejos de un tirón. %V se levanta pisando la mitad de lo que llevaba encima.',
  '%A lanza a %V sin esfuerzo. %V pesa menos de lo que presume.',
  '%A lanza a %V, se da la vuelta y sigue con lo suyo como si nada.',
  '%A lanza a %V por la ventana del chat. %V aterriza en el grupo de la familia.',
  '%V sale volando con la boca abierta y se traga una mosca por el camino.',
  '%A agarra a %V por la capucha y le da impulso. %V se queda sin capucha y sin dignidad.',
  '%A lanza a %V al contenedor amarillo. %V no es plástico, pero ahí se queda.',
  '%A lanza a %V por encima del grupo y alguien aprovecha para hacerle una foto en el aire.',
  '%A lanza a %V tan lejos que a %V le llega el aviso de roaming.',
  '%V intenta agarrarse a algo en el aire. Solo había aire.',
  '%A tira a %V a la piscina con la ropa de salir. %V sale con el peinado de otra persona.',
  '%A lanza a %V y %V grita todo el vuelo, que no es corto.',
  '%A carga a %V al hombro como un saco de patatas y al sofá. %V rebota dos veces.',
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
  '%A mata a %V sin levantar la voz. Ni se despeina.',
  '%V empieza una frase y %A la termina de otra manera.',
  '%A acaba con %V en un segundo y medio. El medio segundo fue por educación.',
  '%V ni se defendió. Tampoco es que le diera tiempo.',
  '%V se dio cuenta tarde de que %A iba en serio.',
  '%A remata a %V y el grupo tarda dos segundos en reaccionar. %V no reacciona.',
  '%A liquida a %V con la tranquilidad de quien lo tenía pendiente desde hace días.',
  'A %V se le acaba el turno. Los turnos los reparte %A.',
  '%A termina con %V y se limpia las manos. Lo de limpiarse es por costumbre.',
  '%V cae y el grupo mira a %A. %A se encoge de hombros.',
  '%A mata a %V por algo que solo %A recuerda. %V no tiene ni idea de qué.',
  '%A acaba con %V delante de todo el grupo. Delante de todo el grupo era la idea.',
  '%A se carga a %V y pide perdón al grupo. Al grupo, no a %V.',
  'Lo de %V duró lo que %A quiso que durara.',
  '%V cierra los ojos. %A ni pestañea.',
  '%A se quita a %V de en medio y vuelve a lo que estaba haciendo. Estaba haciendo algo más importante.',
  '%V se apoya en %A al caer. %A se aparta.',
  '%A le quita a %V las ganas de contestar. Y el resto también.',
  'Solo queda %A de pie. %V, en el suelo.',
  '%A mata a %V a mitad de un audio. El audio se queda a medias para siempre.',
  '%A acaba con %V en el peor momento: justo cuando %V iba ganando una discusión.',
  '%V intentó negociar para que %A no acabara con todo. %A no negocia con gente que escribe «jajaj» con una sola j.',
  '%V cae con el móvil en la mano y el último mensaje sin enviar.',
  '%A se carga a %V con una eficacia que asusta. Parece ensayado.',
  '%V pidió clemencia en un audio de dos minutos. %A acabó con %V al minuto uno.',
  'El último pensamiento de %V fue que tenía que haber salido del grupo antes.',
  '%A acaba con %V y le deja el visto de recuerdo.',
  'A %V le queda tiempo para un último «pero», y %A no le deja terminarlo.',
  '%V intentó esconderse detrás de otro miembro del grupo. El otro se apartó y %A remata.',
  '%A liquida a %V y el grupo manda stickers de condolencias en treinta segundos.',
];

// DAR DE COMER. Parece la mas tierna y es una de sumision: quien abre la boca
// pierde. El chiste es que %V acepta, no que %A ofrezca.
const FEED = [
  '%A le da de comer a %V en la boca. %V abre la boca antes de que llegue la cuchara.',
  '%V come de la mano de %A como un pajarito.',
  '%A le mete un bocado a %V en la boca y %V hasta da las gracias con la boca llena.',
  '%A le acerca la cuchara a %V haciendo el avioncito.',
  '%V estira el cuello para llegar al bocado de %A. Nadie le acercó el plato y aun así llega.',
  '%A le da de comer a %V delante del grupo. El grupo saca conclusiones y ninguna favorece a %V.',
  '%V le dice a %A que no tiene hambre. Come igual.',
  '%A prueba primero y luego le da a %V. %V come lo que %A ya decidió que estaba bueno.',
  'Un bocado de %A y %V se calla un rato. Funciona mejor que hablar.',
  '%A limpia la comisura de %V con el pulgar. %V ni se mueve para dejarle hacerlo.',
  '%V come lo que le pongan. %A se ha dado cuenta.',
  '%A le da de comer a %V y le sujeta la barbilla. La barbilla no hacía falta.',
  '%A le va metiendo cucharadas a %V hasta acabar el plato, y %V no ha elegido ni un bocado.',
  '%A acerca la comida y la aparta un centímetro cuando %V se lanza. Solo una vez, para verlo.',
  '%V mastica despacio, pensando en lo que le acaba de aceptar a %A.',
  '%A le pone el bocado en la boca a %V y nadie dice nada. Todos lo están pensando.',
  '%A alimenta a %V con una paciencia que a %V le debería preocupar.',
  '%V cierra los ojos al comer. Cerrar los ojos delante de %A es mucha confianza.',
  '%A le da un bocado a %V y se queda mirando cómo lo traga.',
  '%A retira la cuchara y %V se lleva la mano a la boca, tarde. Ya lo vieron.',
  '%A reparte comida: a los demás en el plato, a %V en la boca. %V no pidió el cambio y no lo rechaza.',
  'Cucharada a cucharada que le da %A, %V se le va pegando un poco más.',
  '%V come de %A rápido, como si alguien se lo fuera a quitar. Nadie se lo iba a quitar.',
  '%A sopla el bocado antes de dárselo a %V aunque no quema, y %V espera igual a que sople.',
  '%V se relame. %A lo apunta mentalmente para otro día.',
  '%A termina de darle de comer a %V y le da una palmada en la mejilla. %V acepta la palmada también.',
  '%A le da de comer a %V con la cuchara y le mancha la barbilla. %V lleva la mancha toda la cena.',
  '%A le da de comer a %V una patata frita y se queda con la mitad. %V se da cuenta tarde.',
  '%A le sopla la cuchara a %V como a un bebé. El grupo lo ha grabado.',
  '%A le da a %V un trozo de su pizza: el borde. %V se lo come igual.',
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
  '%A le muerde el dedo a %V sin apretar y sin pedir permiso.',
  '%A pellizca con los dientes el cuello de %V. %V cierra los ojos como si eso ayudara.',
  '%A le mordisquea la mejilla a %V y se aparta. %V se queda esperando el siguiente.',
  '%V dice que pare con la boca de %A todavía encima. Suena a otra cosa.',
  '%A le come el labio a %V un segundo. Un segundo de más para lo que era.',
  '%V se ríe al principio del mordisco de %A. Deja de reírse a mitad.',
  '%A le muerde la clavícula a %V. %V mira al techo y se queda con eso.',
  '%V no aparta el brazo mientras %A lo mordisquea. Podría y no le da la gana.',
  '%A muerde y suelta, muerde y suelta, y %V ya le ha cogido el ritmo.',
  'El mordisquito de %A no deja marca. %V se toca el sitio media hora buscando lo que no hay.',
  'Desde el primer mordisco de %A, %V respira de otra manera. Nadie se ha dado cuenta menos %A.',
  '%A muerde a %V donde nadie muerde por accidente.',
  '%V se deja mordisquear de arriba abajo y solo dice que le hace cosquillas. No era eso.',
  '%A le pasa los dientes por el cuello a %V sin apretar. Con eso ya basta.',
  'Un mordisco de %A en la nuca de %V. A %V se le olvida lo que estaba diciendo.',
  '%V le pone el cuello a tiro y %A no lo desaprovecha.',
  '%A termina el mordisco con la lengua. %V ya no sabe dónde mirar.',
  '%A le muerde el hombro a %V y %V pide otro sin decirlo, solo girándose.',
  '%A le da un mordisquito a %V en la oreja y %V suelta una risa de hiena.',
  '%A le muerde el moflete a %V como quien prueba un bollo. %V lleva la marca de los dientes una hora.',
  '%A le mordisquea el hombro a %V y le deja la camiseta mojada. %V finge asco.',
  '%A le muerde la mano a %V porque %V le estaba quitando una patata. Hay prioridades.',
  '%V se queja del mordisquito de %A y luego pone la otra mejilla.',
  '%A le mordisquea la nariz a %V y %V pone cara de gato ofendido.',
  '%A le pega un mordisquito a %V en el brazo y %V lo enseña al grupo como si fuera un tatuaje.',
  '%V intenta morder de vuelta y le muerde la manga a %A.',
  '%A le mordisquea el dedo a %V y %V se lo mira como si le hubieran puesto un anillo.',
  '%A le mordisquea la muñeca a %V mientras %V sigue hablando. %V pierde el hilo a la segunda frase.',
];

// EL PIQUITO. Lo mas corto de la lista y por eso funciona: medio segundo de
// contacto y %V se queda esperando el resto. El chiste esta en la ASIMETRIA —
// %A ya esta en otra cosa y %V sigue ahi.
const PECK = [
  '%A besa a %V rápido y sigue andando. %V no ha seguido andando.',
  'Medio segundo de beso de %A. %V lleva desde entonces esperando el otro medio.',
  '%A le roba un beso a %V y ni mira la cara que pone. La cara valía la pena.',
  '%V cierra los ojos tarde para el beso de %A. Se quedó con los ojos cerrados igual.',
  '%A le planta un beso a %V como quien pone un sello. %V se deja.',
  'Un piquito de %A y %V se queda tres segundos sin hablar. En este chat eso es una eternidad.',
  '%A besa a %V en la frente y le suelta la cara. Lo de la frente es peor que en la boca.',
  '%V se toca el labio después del beso de %A. %A ya está hablando de otra cosa.',
  '%A le da un beso rápido a %V delante del grupo. Nadie ha vuelto a mirar el móvil.',
  '%V dice que ese beso no valía. %A no lo repite, y ahí %V aprende su sitio.',
  '%A besa a %V, se aparta y se ríe. Reírse después es lo que lo remata.',
  'Medio segundo de beso y a %V le sube el color a la cara.',
  'Beso corto de %A a %V, y un apretón en el brazo al irse.',
  '%A besa a %V en la nariz. %V no sabe qué hacer con eso en toda la tarde.',
  '%A se acerca, besa a %V y vuelve a su sitio. %V sigue con la cara donde la dejó.',
  '%V responde tarde al beso de %A. Para cuando reacciona, %A ya no está.',
  '%A besa a %V sin avisar, que es como tiene gracia.',
  'Un beso corto entre %A y %V y el grupo haciendo como que no. Nadie hace como que no.',
  '%A besa a %V y le deja el labio brillando. %V no se lo limpia.',
  '%A le da un piquito a %V en la sien. %V se paraliza más que con uno en la boca.',
  '%A besa a %V y se va. %V pide otro en voz baja, para que no lo oiga nadie.',
  '%A le da un piquito a %V con olor a café. %V pide un café.',
  '%A le da a %V un beso rápido en la mejilla y se la deja brillando de cacao de labios.',
  '%V pone la mejilla. %A le da el beso en la oreja y a %V se le queda un pitido.',
  '%A le da un piquito a %V y luego se limpia la boca con la mano, por si acaso. %V lo ha visto.',
  '%A le da a %V un piquito entre bocado y bocado. %V se queda con una miga en el labio.',
  'Un piquito de %A y a %V se le cae lo que llevaba en las manos.',
  '%A le da un beso rápido a %V en el ascensor. Se abren las puertas y está la vecina.',
  '%A le da un piquito a %V con la mascarilla puesta. %V no sabe si cuenta.',
  '%A le da un piquito a %V delante de la abuela. La abuela aplaude y %V quiere morirse.',
];

// ─── DORMIRSE ENCIMA ────────────────────────────────────────────────────────
//
// El gif es alguien durmiendo, o sea una accion de UNA persona, y aqui todas
// las acciones van dirigidas a otra. No es un problema: dormirse encima de
// alguien es de las cosas mas invasivas que hay y nadie se queja nunca. El
// chiste esta SIEMPRE en quien queda debajo — %A no se entera de nada, y %V
// lleva veinte minutos sin mover un brazo por no despertarle.
const SLEEP = [
  '%A se duerme a mitad de una frase de %V. Tan aburrida era.',
  '%A se duerme en el hombro de %V y le deja la manga empapada de babas.',
  '%V no se mueve por no despertar a %A. %V tampoco tenía nada mejor que hacer.',
  '%V aguanta el peso de %A y la cara de circunstancias. Lo segundo cuesta más.',
  '%A ronca en la oreja de %V. %V se lo va a recordar durante años.',
  '%A se duerme delante de %V a media conversación. %V se calla, por si acaso era una indirecta.',
  'A %A se le cae la cabeza encima de %V. %V se la recoloca, se le vuelve a caer y al final %V se rinde.',
  '%A duerme con la boca abierta encima de %V. %V ya ha hecho la foto.',
  '%A murmura un nombre en sueños. %V no ha entendido cuál y prefiere no saberlo.',
  '%V dice que %A le pesa encima mientras duerme. Lo dice bajito, que es como no decirlo, y no se mueve.',
  '%V respira más despacio para no molestar. Nadie le ha pedido ese nivel de servicio.',
  '%A busca postura encima de %V hasta clavarle un codo. Ahí se acomoda.',
  '%A se duerme y le deja a %V todo el peso y ninguna explicación.',
  '%V no recuerda en qué momento aceptó ser almohada.',
  '%A ronca bajito. Mañana lo va a negar y %V tendrá el audio.',
  'Cuando %A despierte, %V dirá que acaba de llegar. Lleva ahí desde el principio y le arde la espalda.',
  '%A se duerme encima de %V con los zapatos puestos. %V calcula cuánto cuesta lavar un sofá.',
  '%A se duerme en el sofá de %V y a %V le toca dormir en la silla de su propia casa.',
  '%A habla en sueños y le pide a %V que le pase el mando. %V se lo pasa, por si acaso.',
  '%A se duerme en el regazo de %V y le da una patada en sueños. %V se la devuelve despierto.',
  '%A se duerme en el coche antes de salir del aparcamiento. %V conduce una hora con la radio apagada.',
  '%A se duerme en la videollamada y %V se queda diez minutos mirando el techo de %A.',
  '%A se duerme y le roba a %V la manta entera. %V pasa la noche tapándose con un calcetín.',
  '%A ronca, %V le da un codazo, %A para, %V se duerme y %A vuelve a roncar.',
  '%V le quita el móvil de la mano a %A mientras duerme. Y lo mira un poco, ya que está.',
  '%A se duerme en el hombro de %V en el tren y %V se pasa su parada por no despertar a %A.',
  '%A se duerme a las once en la fiesta de %V. En la fiesta de %V.',
  '%A se duerme antes de que %V apague la luz. %V la apaga igual, con rencor.',
  '%A se duerme en las piernas de %V y se despierta con la costura del pantalón marcada en la cara.',
  '%A se duerme y a %V le toca contestar los mensajes de %A para que no se preocupe nadie.',
];

// ─── EL PUCHERO ─────────────────────────────────────────────────────────────
//
// Chantaje emocional del barato, y funciona todas las veces. El chiste no es el
// puchero: es que %V CEDE, y que sabe perfectamente que le están tomando el
// pelo. Nada de "y %V se derrite" — lo bueno es que %V ve la trampa entera y
// pasa por ella igual.
const POUT = [
  '%A hace un puchero y %V dice que sí antes de saber a qué.',
  '%V ve venir el puchero desde lejos. Verlo venir no sirve de nada.',
  '%A saca el labio. %V saca la cartera.',
  '%A frunce el morro y %V cambia de opinión sobre algo que defendía hace diez segundos.',
  '%V aguanta cuatro segundos. Cuatro segundos, y cede.',
  '%A pone morros por una gilipoyez. %V lo arregla como si se hubiera muerto alguien.',
  '%A pone carita y %V suspira. Ya ha perdido.',
  '%A hace pucheros mirando de reojo a ver si cuela, y cuela.',
  'El morro de %A desaparece en cuanto %V dice que vale. Ni disimula.',
  '%V intenta no mirar. %A se coloca justo donde %V está mirando.',
  'A %V le sale decir que no a cosas peores, pero a esta no hay manera.',
  '%A pone morros y %V deja lo que estaba haciendo. Era importante lo que estaba haciendo.',
  '%A hace un puchero de mierda, sin ganas. Le funciona igual con %V.',
  '%A se va a una esquina a poner morros. %V va a la esquina, cómo no.',
  '%V apaga la pantalla para no ver el morro. La vuelve a encender a los diez segundos.',
  '%A ladea la cabeza además del morro. Eso ya es jugar sucio.',
  '%A pone morros y no le dice ni una palabra a %V. Castigo de crío.',
  '%V le quita el morro a %A con un dedo. %A lo vuelve a poner en cuanto le suelta.',
  '%A gana la discusión sin decir una palabra. %V sigue sin saber de qué iba.',
  '%A hace pucheros y el grupo entero mira a %V esperando a que ceda. Y cede.',
  '%V se jura que esta vez no. Y esta vez tampoco.',
  '%V cede y encima pide perdón. Nadie le había pedido perdón a nadie.',
  '%A frunce los labios. A %V se le cae el argumento entero.',
  '%A pone morros y a %V le entra la risa. %A pone más morros.',
  '%A pone morros por un trozo de pizza. %V se come el trozo mirándole a los ojos.',
  '%V le hace una foto a %A con los morros puestos y la pone de fondo de pantalla.',
  '%A pone morros y %V le devuelve los mismos morros. Nadie gana.',
  '%V le dice a %A que con esa cara no va a conseguir nada. %A se queda con la cara, por si acaso.',
  '%A pone morros con la boca llena y a %V le cae una miga en el brazo.',
  '%A pone unos morros tan exagerados que a %V le da vergüenza ajena por los dos.',
];

// ─── LA LENGUA FUERA ────────────────────────────────────────────────────────
//
// Provocacion de patio de colegio. El chiste esta en que %V no tiene respuesta:
// contestar a alguien que te saca la lengua te deja peor a ti. La gracia es la
// impunidad de %A y el desconcierto de %V, nunca el enfado.
const BLEH = [
  '%A le saca la lengua a %V y se va. %V lleva desde entonces pensando la respuesta.',
  '%V pilla a %A haciéndole burla. %A ni se esconde, que es lo que jode.',
  '%A le hace burla y %V decide que contestar sería rebajarse. Se rebaja igual.',
  '%V se enfada y %A le vuelve a sacar la lengua. Para rematar.',
  '%A le hace burla a %V en medio de algo serio. Ya no es serio.',
  '%V amenaza y %A le contesta con la lengua fuera. Adiós amenaza.',
  '%A saca la lengua y entorna los ojos. Lo de los ojos es lo que hace daño.',
  '%A le saca la lengua y le guiña un ojo. Las dos cosas juntas es pasarse.',
  '%V le dice a %A que tiene cinco años. %A saca la lengua y le da la razón.',
  '%A hace burla y se aparta antes de que %V reaccione. Tenía la salida pensada.',
  '%V no sabe si reírse. %A se ríe por los dos.',
  'Por algo que %V ya había olvidado, %A le hace burla con la lengua fuera. Ahora se acuerda.',
  '%A hace burla y no se disculpa. Nadie esperaba una disculpa.',
  '%A le saca la lengua con las manos en las orejas. El paquete entero.',
  '%V se ríe sin querer. %A lo apunta para usarlo.',
  '%A hace burla delante de todos y no le tiembla la lengua.',
  '%V pone los ojos en blanco. %A saca más lengua, que es la respuesta correcta.',
  '%A le saca la lengua y sale corriendo sin motivo. Correr no hacía ninguna falta.',
  '%A hace burla con toda la cara, no solo con la lengua. Se nota el oficio.',
  '%A le hace burla y %V se lo guarda para dentro de un mes. Lo va a cumplir.',
  '%A le saca la lengua a %V con restos de chocolate. %V no sabe si ofenderse o pedir.',
  '%A saca la lengua desde la otra punta del grupo y a %V le llega igual de clara.',
  '%A le hace burla a %V justo cuando %V le estaba dando la razón a otra persona. Ya no se la da.',
  '%V intenta pasar de %A. %A se cambia de sitio hasta ponerse delante de su cara con la lengua fuera.',
  '%A le saca la lengua a %V y %V contesta con un audio de tres minutos. Ha perdido.',
  '%A le hace burla a %V con una pedorreta y le salpica. %V se limpia con la manga, que es peor.',
  '%A saca la lengua y %V intenta cogérsela. Llega tarde.',
  '%A le hace burla a %V en una foto y la sube a historias. %V sale con la boca abierta.',
  'A %V, que pide un poco de madurez, %A le contesta sacándole la lengua. Respuesta clara.',
  '%A le hace burla a %V en una videollamada con gente delante. %V aguanta la risa con cara de informe.',
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
