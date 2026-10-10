// ─── LO QUE DICE EL BOT CUANDO ALGO NO SE PUEDE ──────────────────────────────
//
// Eran setenta y cinco frases sueltas repartidas por veinte ficheros, y las
// cuatro mas usadas —"Solo en grupos.", "No tienes permiso para usar esto.",
// "Solo admins pueden usar este comando."— salian sesenta veces entre todas.
// Escritas asi, cada una en su sitio, pasan dos cosas: suenan a formulario de
// banco en un bot que insulta, y se desincronizan solas en cuanto alguien
// reescribe una y no las demas.
//
// EL TONO NO ES EL MISMO PARA TODAS, Y ESO ES LO QUE MAS IMPORTA AQUI.
//
// Depende de QUIEN las lee, no de lo que dicen:
//
//   · SOLO_GRUPOS solo puede verlo el tier owner. Desde que el privado del bot
//     esta cerrado (ver ownerEnPrivado), a nadie mas le llega una respuesta
//     escribiendo por privado. Meterle ahi un insulto seria insultar al dueño
//     cada vez que se equivoca de chat. Van secas y cortas.
//
//   · SIN_PERMISO, SOLO_ADMINS y A_TI_MISMO se leen EN EL GRUPO, delante de
//     todos. Ahi el bot es el que es.
//
// Todas dicen lo mismo que decian: lo que no se puede y, cuando hace falta,
// donde si. Un aviso que solo insulta y no informa es peor que el aburrido.
'use strict';

// Se ha escrito al privado del bot un comando que necesita grupo. Lo lee el
// owner tier y nadie mas: seco, corto y sin sangre.
const SOLO_GRUPOS = [
  'Eso es de grupo. Aquí no hay a quién hacérselo.',
  'En el grupo. Aquí solo estamos tú y yo.',
  'Este chat no cuenta para nada. Eso, en el grupo.',
  'Aquí no. Eso se hace donde hay gente.',
  'Solo en grupos. Aquí no se mueve nada.',
  'En privado no hace nada. Llévalo al grupo.',
  'Eso pide público. Aquí no lo hay.',
  'Grupo. Aquí no tiene contra quién funcionar.',
  'Eso pide grupo, y esto no lo es.',
  'Aquí no pasa nada. Pruébalo en el grupo.',
  'Aquí no. Eso necesita testigos.',
  'En el grupo. Este chat no tiene marcador.',
  'A solas no tiene gracia. Llévalo al grupo.',
  'De grupo. Aquí no hay nada que mover.',
  'Aquí no sirve. Prueba donde se lee.',
  'Eso es para el grupo, no para esta ventana.',
  'En privado no hay partida. Sal al grupo.',
  'Aquí no hay contra quién. En el grupo sí.',
  'Aquí no. Sin nadie mirando no tiene ni gracia.',
  'Aquí no se juega. Al grupo.',
  'Eso pide gente delante. Aquí no la hay.',
  'En el grupo funciona. Aquí no.',
  'Este chat no vale para eso. Al grupo con ello.',
  'De grupo, y esto es un pasillo.',
  'Aquí no se mueve el marcador, llévalo al grupo.',
  'Eso necesita público. El grupo lo tiene, esto no.',
  'En el grupo. Aquí no hay nada en juego.',
  'Aquí no pasa. En el grupo, sí.',
  'Esto va en el grupo, que aquí no te ve nadie.',
  'Aquí no tiene sentido. Sácalo al grupo.',
];

// LO MISMO UN ESCALON MAS ARRIBA: salta cuando un miembro toca algo del tier de
// owner. La cabecera dice "Solo admins superiores" y no "solo el dueño", que es
// como lo llama el menu: nombrar a un dueño en un aviso que lee todo el grupo
// es señalar a una persona, y eso no lo hace el bot en ningun sitio.
const SIN_PERMISO = [
  'Eso es de otro nivel, y tú no llegas ni arrastrándote como la rata que eres.',
  'Eso es de quien paga la fiesta. Tú, comemierda, solo vienes a limpiar las vomitonas.',
  'Ese permiso lo tiene quien decide. Tú no decides ni cuándo te limpias el culo.',
  'Te falta rango y te sobra hocico, y esa mezcla huele a mierda desde aquí.',
  'Eso lo tocan los de arriba. Un inútil de mierda como tú obedece, y ni eso bien.',
  'Eso no lo toca un pringado como tú ni rezando de rodillas.',
  'Has intentado colarte delante de todos, y el grupo se está meando de risa.',
  'No, gilipoyas. Eso está muy por encima de ti y no vas a subir ni un puto escalón.',
  'Ese permiso es para gente de fiar, y de ti no se fía ni tu puta madre.',
  'Pides un dedo y ya vas a por el brazo, sinvergüenza. Por eso no te dan ni la hora.',
  'Ni con el grupo entero borracho te dejarían tocar eso, pequeña.',
  'Te crees arriba porque hay gente abajo, gilipoyas, y sigues siendo una mierda.',
  'A un pedazo de mierda como tú no le fían ni el cambio del pan, y menos permisos.',
  'Hay gente por encima de ti, y el grupo entero sabe por qué: porque das puto asco.',
  'Eso se lo dejan a gente seria. Tú eres el payaso del grupo y ni gracia haces.',
  'Eso es para quien vale algo, y tú no vales ni lo que cuesta mandarte a la mierda.',
];

// El mismo aviso cuando quien lo toca SÍ es admin. Estas le echan en cara el
// rango que tiene y que no le alcanza; a un miembro sin rango le estarían
// llamando admin delante de todos, que es mentira. Quien llama elige el pool
// mirando al que escribe (avisoPermiso en helpers).
const SIN_PERMISO_ADMIN = [
  'Ser admin no te hace importante, imbécil. Te hace útil, y ni eso cumples.',
  'Tienes rango de inútil de mierda, y esto está dos escalones por encima de tu culo.',
  'Te queda grande el cargo, incompetente de mierda, y esto ni lo hueles.',
  'Te hicieron admin y te crees con mando, mediocre. Mandas lo que el bot quiera: nada.',
  'Miserable. Te dan admin y en cinco minutos ya quieres los botones gordos.',
  'Tienes rango y sigues sin ser nadie. Hace falta ser muy mierda para conseguirlo.',
  'Farsante con placa de admin. Se te ha visto intentarlo y se te ha calado.',
  'Creías que el rango te lo daba todo, despreciable. Te da derecho a callarte.',
  'Llevas el rango como quien lleva un disfraz prestado, y se te nota la etiqueta.',
  'Eres admin de adorno, cabrón. Esto lo tocan los de arriba, y tú no llegas.',
  'Tu rango da para borrar stickers, gilipoyas. Esto queda muy por encima.',
  'Esto no viene con el rango, escoria. Se le da a quien vale, y a ti no te lo dan.',
  'Ni siendo admin, rata. Hay alturas que no vas a pisar nunca.',
  'Eres admin de la última fila, y los de delante se limpian el culo con tus avisos.',
  'Lameculos con rango, lameculos igual. Esto no se te da.',
  'Ser admin no te quita lo escoria. Y esto sigue sin ser para ti.',
  'Te dieron admin de milagro, comemierda, y ya quieres el segundo milagro.',
  'Tu cargo sirve para mandar callar, impresentable, y aquí te mandan callar a ti.',
  'Eres admin de guardería, no de mando. Asúmelo, sinvergüenza.',
  'Decidiendo cosas de mayores con un rango de mierda. Siéntate.',
  'Tu rango no te convierte en alguien, solo te da botones. Y ni esos sabes usar.',
  'Ni con el cargo puesto dejas de chupar del grupo. Esto no es para ti.',
  'Eres admin de recados. Esto está por encima de ti, y de tus recados.',
  'Con rango o sin él, das la misma puta pena. Y esto no es para ti, reina.',
];

// UN MIEMBRO ACABA DE TOCAR UN COMANDO DE ADMIN, Y LO HA VISTO EL GRUPO.
//
// El aviso va en dos partes: una cabecera fija que DICE de quien es el comando,
// y debajo el remate. Antes la etiqueta iba dentro de cada frase —"De admins."
// mas un empujoncito— y eso costaba las dos cosas: media frase se gastaba en
// repetir lo mismo, y quien lo leia con prisa se quedaba en el empujoncito sin
// enterarse de por que no habia funcionado.
//
// Partido, la cabecera informa siempre y el remate puede dedicarse entero a lo
// suyo. Es el mismo arreglo que en !r con `Aviso:`, y por el mismo motivo.
//
// EL ATAQUE VA AL RANGO, no a la persona. No es "eres tonto", que no dice nada:
// es que llevas aqui el mismo tiempo que ellos y sigues sin ser admin, que nadie
// va a proponer tu nombre, que el comando no ha fallado — te ha reconocido y
// por eso no hace nada. Eso escuece mas que un insulto porque es verificable.
const SOLO_ADMINS = [
  'Nadie te ha hecho admin en todo este tiempo porque eres un puto cero a la izquierda.',
  'Tú no mandas ni en tu puta casa, comemierda, y vienes a mandar aquí.',
  '¿Tú admin? Antes le dan el rango a una rata con sarna que a ti, pequeña.',
  'Te ha visto el grupo entero intentando mandar sin rango. Qué puto ridículo das.',
  'Tu único cargo aquí es el de chupapoyas oficial, y ese sí te lo ganaste.',
  'No eres admin, gilipoyas, y con esa cara de mierda no te lo van a dar nunca.',
  'Sin rango no tocas nada, mierdecilla. Aquí tu sitio es callar y aplaudir.',
  'Ni chupándole la polla a cada admin te darían el rango, y seguro que lo has pensado.',
  'Has intentado mandar sin rango, y el grupo se está descojonando de ti ahora mismo.',
  'Tú no eres admin. Eres el puto felpudo donde los admins se limpian los pies.',
  'Querías mandar sin rango. Aquí eso se llama hacer el gilipoyas en público.',
  'A un desgraciado de mierda como tú no le dan el rango ni por pena.',
  'Rango no tienes, pero cara de cemento te sobra para intentarlo delante de todos.',
  'El grupo te soporta como a una diarrea, y a una diarrea no se la hace admin.',
  'Eres miembro raso porque nadie se fía de ti ni para sujetar el puto móvil.',
  'Te dejan escribir aquí de milagro. Mandar, ni en tus putos sueños mojados.',
  'A ti no te hacen admin ni aunque te mueras y lo pidan en tu funeral.',
  'Te has creído admin un segundo, pringado de mierda, y el grupo lo ha visto entero.',
  'Tu nombre no sale en la lista de admins, y no sale porque eres una puta mierda.',
  'Aquí manda quien tiene cojones y rango. Tú no tienes ni lo uno ni lo otro.',
  '¿Mandar tú? Si no te contesta ni tu puta madre al primer mensaje.',
  'Lo de mandar te lo metes por el culo, que es donde te cabe el rango que tienes.',
  'El botón te ha visto venir, gilipoyas, y no se mueve por un muerto de hambre.',
  'No te dan el rango porque en cuanto abres la boca sale mierda.',
  'Querías ser admin y te has quedado en payaso del grupo. Ese cargo sí es tuyo.',
  'Insistiendo no te van a dar el rango, plasta de los cojones. Te van a dar la patada.',
  'Ni lamiendo culos llegas a admin, y mira que tienes la lengua entrenada.',
  'No eres admin ni lo vas a ser. Tu techo aquí es que no te echen, y por los pelos.',
  'Pulsas lo que no es tuyo delante de todos. Más cerca del rango no vas a estar.',
  'Das órdenes sin rango y los admins se parten el culo contigo. Sigue, que es gratis.',
  'Tienes las mismas opciones de ser admin que de follar este año: cero.',
  'Aquí el rango se gana, y tú no has ganado ni una puta discusión en tu vida.',
  'Miembro raso con ínfulas de jefe. Lo más patético que ha pasado hoy por el chat.',
  'Ese botón es de admins, no de basura como tú. Lo tuyo es no pintar una mierda.',
  'Nadie te va a dar el rango, escoria. Ni ahora ni cuando lloriquees por privado.',
  'Mira la lista de admins. Tu nombre no está, y medio grupo lo celebró.',
  'No tienes rango, mindundi de mierda. Tienes un teclado y la cara dura de intentarlo.',
  'Para esto hace falta rango, y a ti te falta eso, cerebro y vergüenza.',
  'Te dan permiso para escribir y ya te lo estás follando. Mandar, ni de coña.',
  'Con ganas no se abre, pringado. Hace falta rango, y tú eres miembro raso de mierda.',
];

// Se ha puesto a si mismo de objetivo. Se lee en el grupo.
const A_TI_MISMO = [
  'Te eliges a ti, gilipoyas. Ni un puto enemigo tienes, y eso ya dice mucho.',
  'Contra ti no, pedazo de mierda. Que lo hayas intentado dice bastante de tu cabeza.',
  'A ti no. Métete con alguien que te conteste, si es que alguien te habla, pequeña.',
  'Elige a otra persona, si es que conoces a alguien que no te tenga bloqueado.',
  'Eso se hace con dos, y tú has traído uno y medio cerebro.',
  'No. Ni el bot quiere ver cómo te haces una paja delante del espejo.',
  'Contra ti no. En el grupo hay gente de sobra, y toda te cae mejor que tú.',
  'Ponerte de objetivo es lo más triste que ha pasado hoy aquí, y eso que estás tú.',
  'No se puede. Ni para darte por culo a ti te bastas.',
  'Tú contra ti. Pierdes seguro, y encima das pena por partida doble.',
  'Elige a otra persona. A ti ya te conoces, y sabes que no vales una mierda.',
  'Si tanto te odias, págate un psicólogo, que al bot no le pagas una mierda.',
  'Deja de mirarte el ombligo, que de ahí para abajo tampoco hay nada que ver.',
  'Autolesión por comando. Para eso ya tienes tu cara, no hace falta el bot.',
  'No te lo vas a hacer a ti. Ni aunque te lo merezcas, que te lo mereces de cojones.',
  'Hay que ser muy torpe para apuntarse a uno mismo, y tú lo eres de sobra.',
  'Contigo no se juega. Bastante te la juegas tú en cuanto hablas, mi niña.',
  'Ni enemigos tienes, pringado de mierda, y por eso te apuntas a ti de aburrimiento.',
  'Esto se le hace a otra persona, no al espejo, que bastante sufre ya contigo.',
  'Víctima y verdugo a la vez. Eres tan inútil que necesitas los dos papeles.',
  'No se puede, y el grupo entero acaba de ver lo gilipoyas que eres.',
  'Un poco de amor propio, joder. Ni para eso te llega, triste de los cojones.',
  'Has apuntado a tu propio nombre. Buena puntería para lo inútil que eres.',
  'Contigo no llega para dos bandos. No llega ni para uno, la verdad.',
  'Eres el único objetivo que no te dice que no, y ni así te sale, desgraciado.',
  'Menciona a otra persona. Contigo no sale nada, como en el resto de tu puta vida.',
  'Eso es para otra persona. Contigo solo haces el puto ridículo, y gratis.',
  'No insistas, que se nota que te sobra tiempo y te falta follar.',
  'Te quieres dar caña a ti. Normal: eres lo único que se deja tocar por ti.',
  'A ti no, comemierda. Busca con quién pelear, si te queda alguien que te hable.',
];

// Alguien le ha lanzado al BOT un comando que va contra otra persona: casi
// siempre porque ha respondido a un mensaje del bot en vez de al de quien
// queria. Lo pidio el dueño: que el bot no se insulte ni se robe a si mismo,
// y que en vez de eso se le ataque la inteligencia al que no sabe mencionar.
// Van detras de su @. En baraja: salen las quince antes de repetir ninguna.
const AL_BOT = [
  'Joder, qué inútil. Dos toques para mencionar a alguien y la cagas en los dos.',
  'Esa mención no iba para mí, imbécil. Ni apuntar sabes.',
  'Con esa puntería de mierda, a mí no me apuntes, anormal.',
  'Hostia, que no sabes ni responder al mensaje correcto. Y así vas por la vida.',
  'Querías a otra persona y me has mencionado a mí. Tu IQ entero en una sola cagada.',
  'Ni el dedo te obedece, subnormal. Has mencionado al bot.',
  'Responder al mensaje equivocado es lo único que se te da bien.',
  'A mí no, cabeza hueca. Menciona a quien querías, si te acuerdas de quién era.',
  'De todos los mensajes del chat, has respondido al del bot. Talento.',
  'Ni para señalar sirves. Has apuntado al bot, gilipoyas.',
  'Con esa puntería no le das ni a la tecla de borrar.',
  'El bot no se roba ni se insulta. Has apuntado a quien no era, y el ridículo es tuyo.',
  'Has respondido al bot. Ni leer quién escribe sabes.',
  'Mencionar a alguien es lo más fácil del grupo y a ti se te ha atragantado.',
  'Me has mencionado a mí. A ver si miras a quién le das, pequeña.',
];

// El objetivo es un admin y quien lo intenta no llega. Se lee en el grupo, y
// delante del propio admin, que es la mitad de la gracia.
const CONTRA_UN_ADMIN = [
  'A un admin no, gilipoyas. Métete con alguien que no te pueda partir la cara.',
  'Contra un admin no tienes nada que hacer, comemierda, ni con todas tus ganas.',
  'Cerrarle la boca a un admin no puedes, cabrón. Te toca tragarte lo que diga.',
  'Sabías que a un admin no se le toca y lo has intentado igual, pedazo de imbécil.',
  'Ni delante del grupo le callas. Solo has hecho el ridículo más gordo de la semana.',
  'Es admin, escoria. Desde donde estás no le llegas ni a la suela del zapato.',
  'Entre admins no se mutea, comemierda. Eso no lo decides tú ni en tus sueños mojados.',
  'Un admin queriendo mutear a otro. El grupo tenía palomitas y le has dado el show.',
  'Callar a otro admin no te sale, sinvergüenza. Pulsas y te sigue escribiendo en la cara.',
  'Mismo rango, mismo botón, cero efecto. Te has quedado con el dedo en el culo.',
  'Mutear a otro admin no se puede, y todo el grupo te ha visto hacer el gilipoyas.',
  'Tenéis el mismo rango, pringado. Te creías por encima y estáis a la misma puta altura.',
  'Contra otro admin no hay mute, impresentable. Te lo comes con patatas como el resto.',
  'El bot no os hace de árbitro. Si queréis daros por culo, hacedlo por privado.',
  'Los admins no se callan entre sí, farsante. Si no os aguantáis, os jodéis los dos.',
  'Querías usar tu cargo contra otro, desgraciado. El tuyo no da ni para limpiarte el culo.',
  'A un admin no se le mutea desde abajo ni desde al lado, y tú no estás ni al lado.',
  'Ese mute rebota, y te da en toda tu cara de gilipoyas.',
  'Estáis al mismo nivel, mediocre de mierda, y a ti ese nivel ya te venía grande.',
  'Le has tirado el mute a otro admin, canalla. No entra, y ahora te tiene fichado.',
  'Intento de golpe de estado entre admins. Fracasado, como todo lo que haces.',
  'Ahí no llega tu rango, despreciable. Se para en el suyo, como tú te paras en todo.',
  'Un admin contra otro. El grupo se descojona, y tú te quedas sin mute y sin cara.',
  'Mute denegado, cobarde. Tus ganas de callarle las ha visto todo el puto grupo.',
  'Querías callar a un admin, y quien queda en ridículo eres tú.',
  'A un admin no le tocas ni un pelo, mierdecilla. Ni con el botón ni sin él.',
  'Con un admin no, payaso. Elige a alguien de tu nivel: el suelo.',
  'Le tienes ganas a un admin y no puedes hacerle nada. Te lo comes, y bien comido.',
  'Contra un admin ni lo sueñes, gilipoyas. Tu dedo ahí no manda una mierda.',
  'Apuntas a un admin con el mute y lo único que has muteado es tu dignidad.',
];

// Se ha metido en un duelo de otros dos. Se lee en el grupo.
const DUELO_AJENO = [
  'A ti no te han llamado, metomentodo de mierda. Aparta.',
  'No es tu pelea. Métete en la tuya, si es que alguien quiere pelear contigo.',
  'A ti nadie te ha retado, gilipoyas. Párate a pensar por qué, si te da la cabeza.',
  'Ese duelo no es tuyo ni de lejos, chupóptero.',
  'No lleva tu nombre ese duelo, cotilla de mierda. Colarte no te va a dar uno.',
  'Es de otros dos. Tú a mirar, que es lo único que haces bien, y ni eso.',
  'No te toca. Consíguete un enemigo propio, que ni para eso das.',
  'Dos nombres en ese duelo, y ninguno es el de un gilipoyas como tú.',
  'No te han invitado, y aun así vienes a dar por culo.',
  'Este duelo no es tuyo. Quítate de en medio, que nadie te ha pedido opinión.',
  'Ese lo pelean ellos. Tú lo cuentas después, mal y a destiempo.',
  'Este duelo no te guarda sitio, lameculos. Mirar desde fuera es lo tuyo.',
  'Apártate, que ese duelo es de otros dos y tú solo estorbas.',
  'Ese reto no era para ti, parásito. A ti no te reta nadie porque no hay nada que ganarte.',
  'Nadie ha dicho tu nombre en ese duelo. Nadie lo dice nunca, y por algo será.',
  'Te cuelas en duelos ajenos porque nadie quiere uno contigo. Qué puta pena.',
  'Ese duelo tiene sus dos putos nombres, y el tuyo no es ninguno.',
  'Espectador, payaso. Esa es tu función aquí, y ni eso haces bien.',
  'No es tuyo. Siéntate y mira cómo pelea gente con cojones.',
  'Fuera de ese duelo, mierdecilla, que nadie te ha llamado.',
  'Se resuelve sin ti, igual que todo en este grupo. Nadie te necesita para nada.',
  'Te cuelas en pelea ajena, cobarde, porque retar a alguien de frente te acojona.',
  'No te toca, y encima todo el grupo ha visto que lo intentabas. Qué puto ridículo.',
  'Ese duelo es entre dos. Tú haces tres, y sobras como siempre.',
  'Dos personas se van a partir la cara y tú quieres el sitio de una. Ni de coña.',
  'Esa aura no es tuya, buitre de mierda, y ese duelo tampoco.',
  'Colarte en duelos ajenos, plasta, es lo más cerca que vas a estar de pelear.',
  'Deja pelear a quien tiene con quién. Tú no tienes ni con quién follar.',
  'Coges lo que no te han ofrecido, pringado. Tanta hambre de que te hagan caso da asco.',
  'Llegas a un duelo ajeno sin que nadie te espere, como a todas partes.',
];

// ESCRIBIO MAL UN COMANDO Y HAY QUE ADIVINARSELO.
//
// El aviso sigue diciendo cual era —esa parte si sirve— y debajo va el remate.
//
// LA PRIMERA VERSION DE ESTAS FRASES ERAN CLASES, no ataques: "aprenderte la
// palabra cuesta menos que volver a intentarlo", "toma la ayuda", "el teclado
// funciona, lo que falla esta antes". Eso es un consejo con tono de superioridad
// y no pica: quien lo lee se encoge de hombros. El remate va a la INCAPACIDAD,
// que es lo que acaba de quedar demostrado delante del grupo — no sabe escribir
// una palabra que tenia copiada ahi arriba.
//
// Solo sale cuando hay una sugerencia de verdad. Si lo escrito no se parece a
// nada, el bot se calla: reirse de alguien que quiza no estaba escribiendo un
// comando es reirse de uno mismo.
// ─── UN ADMIN ECHANDO GENTE EN MASA ─────────────────────────────────────────
//
// Se le acaba de quitar el rango por vaciar el grupo. El aviso sale DELANTE DE
// TODOS a proposito: cinco o mas personas acaban de desaparecer y el resto
// merece saber quien fue y que ya no puede seguir.
//
// Y va a por la persona, no a por el hecho. Quien hace esto no se equivoca: se
// viene arriba con el boton, y eso se cura enseñandoselo.
const PURGA_ADMIN = [
  // Ninguna dice CUANTOS: salta a la quinta, pero quien echa a veinte de golpe
  // cae con veinte, y un numero fijo mentiria.
  'Has encadenado expulsiones sin cabeza y sin permiso, gilipoyas. Te quedas sin rango.',
  'Has usado el admin para una pataleta de mierda. Pues ya no eres admin.',
  'Te has corrido echando gente, y el bot te ha echado a ti del cargo.',
  'O te robaron la cuenta o eres así de imbécil. Sin admin en los dos casos.',
  'El grupo no es tuyo, cabrón, y acabas de demostrar por qué. Rango fuera.',
  'Confundiste ser admin con hacer lo que te sale del coño. Y te has quedado sin las dos.',
  'A un inútil así no se le avisa: se le quita el botón de las manos.',
  'Te has creído dios con el botón, gilipoyas, y ya no lo tienes.',
  'Le has cogido gusto a echar gente, pedazo de mierda, y se te ha acabado el juguete.',
  'Querías vaciar el grupo y te has vaciado el cargo. Así de poco te da la cabeza.',
  'Echar gente sin parar tiene un precio, y lo acabas de pagar con el rango y con la cara.',
  'Echabas gente como quien caga. El bot ha contado y ha tirado de la cadena contigo.',
  'Te dieron rango para cuidar el grupo, cabrón, y lo has usado para vaciarlo. Fuera.',
  'Ahora eres miembro raso, como los que has echado. Y a ti te van a putear de lo lindo.',
  'Echar gente en masa te ha salido caro: el rango, y la puta cara delante de los que quedan.',
  'Con tanto echar se te olvidó que a ti también te pueden joder. Pues ya te han jodido.',
];

// COMANDO MAL ESCRITO. EL ESTANDAR, QUE LO PUSO EL DUEÑO:
//
//   «Deben ser hirientes y atacar siempre al intelecto —inteligencia,
//   capacidades, facultades de razonamiento basicas como TECHO para ese
//   individuo, es importante— de forma directa e hiriente. Puedes incluir
//   lenguaje vulgar tambien.»
//
// EL TECHO ES EL EJE, y es lo que separa este pool de un insulto cualquiera.
// No se trata de decir que ha fallado: se trata de decir que ESTO ES HASTA
// DONDE LLEGA. «Cinco putas letras y ahi esta tu techo» no habla del fallo,
// habla del limite de la persona — y de que manana va a ser el mismo.
//
//     ASI NO   La has roto igual, animal.            (insulto, sin techo)
//     ASI SI   Cinco putas letras y ahi esta tu techo. No da para mas esa cabeza.
//
// Lo vulgar esta permitido y se usa en cerca de la mitad, no en todas: si todas
// llevan taco, el taco deja de pegar y lo unico que queda es el ruido.
//
// Cada linea tiene que cumplir LAS DOS cosas. Un pase por la de abajo y la
// frase sobra, por antigua que sea — se tiraron 23 de golpe justo por esto:
//
//  · NO DESCRIBIR EL FALLO. «Estaba escrito y has puesto otra cosa» cuenta lo
//    que ya se ve. Lo que duele no es el fallo, es lo que el fallo dice de
//    quien lo comete.
//  · NO INSULTAR SIN APUNTAR. «La has roto igual, animal» es un insulto, pero
//    no toca la cabeza: vale para cualquier cosa que se haga mal.
//  · NO REMATAR EN SARCASMO. «Impresionante lo tuyo», «Enhorabuena», «Como
//    todo lo tuyo» son finales que se desinflan. El remate tiene que cerrar
//    mas fuerte que el principio.
//  · NO DAR CLASE. Si dice lo que deberia hacer la proxima vez, es un consejo
//    con tono de superioridad y no pica. La capa lo vigila.
//  · NO REPETIR LA CORRECCION. El mensaje sale asi:
//
//        *!anla* no existe. Era *!anal*.
//        <frase>
//
//    La correccion YA ESTA DADA arriba. Una frase que vuelve a decir «hay uno
//    parecido y no has dado con el» gasta su unica linea repitiendo el
//    renglon de encima. La capa tambien lo vigila.
//
// Las dos formas valen y las dos estan: la DIRECTA nombra la cabeza («te falta
// cabeza, y eso no se entrena») y la ABSTRACTA la señala sin nombrarla («te ha
// fallado lo de dentro», «lo que hay detras del dedo»). La abstracta no se
// puede medir con una lista de palabras, asi que la capa pide un SUELO de
// frases con marca explicita: si la mayoria la pierde, el pool se esta
// deslizando otra vez hacia describir.
const MAL_ESCRITO = [
  'Retraso de nacimiento, y cada vez que tecleas algo lo confirmas.',
  'No tienes cabeza ni para teclearlo bien. No es una forma de hablar.',
  'Tu cerebro es una puta piedra y se te nota en cuanto tecleas.',
  'No tienes ni media neurona, y lo que acabas de poner lo demuestra.',
  'Ahí dentro no hay nada, y eso que has puesto es la firma.',
  'Tu techo es teclear algo corto sin romperlo. Qué puta pena das.',
  'Hasta aquí razonas, y mira cómo ha quedado. Mañana, el mismo retraso.',
  'Acabas de tocar tu límite, y era escribir un comando. Qué puta miseria.',
  'Ni teclearlo bien, cabrón. Ese es el suelo y ahí vives.',
  'Lo mínimo del mundo era escribirlo bien, comemierda, y ni a eso llegas.',
  'Ni teclearlo bien, y eso no se arregla. Naciste así y así te vas.',
  'Lo tuyo no lo arregla el autocorrector: corrige letras, no cretinos.',
  'No te ha fallado el móvil. Te ha fallado la cabeza y esa no tiene repuesto, pequeña.',
  'Lo tuyo no se arregla mirando el teclado. Tu fallo está más arriba.',
  'Escribirlo bien no lo vas a aprender en tu puta vida. Retraso de fábrica.',
  'Una puta palabra mal escrita y ya sabe el grupo hasta dónde das. Nada.',
  'Te acaba de medir el grupo entero con un puto comando y has dado bajísimo.',
  'Escribes como piensas: como el puto culo.',
  'Analfabetismo de mierda con wifi. Ni escribir te sale.',
  'Una orden de una palabra y te ha ganado. Ahí está el techo de esa cabeza.',
  'Esa cabeza tiene el techo tan bajo que escribir un comando ya le roza.',
  'Mal escrito, y era una palabra corta. Esa cabeza con las largas ni lo intenta.',
  'Hasta un crío lo escribe bien a la primera. Tú no llegas a ese nivel, princesa.',
  'Escribirlo entero era lo único que se te pedía, y ya pasa de tu puto techo.',
  'Escribirlo bien era una tontería y lo has jodido. Hace falta una sesera de mierda.',
  'Vienes con defecto de fábrica, por eso hasta lo más simple te sale de puta pena.',
  'Tecleas de puta pena y el grupo ya sabe cuánto da de sí esa cabeza.',
  'Sin presión ninguna y te sale como el culo. En condiciones ideales, ese es tu nivel.',
  'Escribes así porque esa cabeza de mierda no llega a más.',
  'Tus neuronas escriben así en su mejor día, y hoy era su mejor día.',
  'Con la sesera que tienes, ponerlo bien no iba a pasar nunca, y no ha pasado.',
  'Ha quedado hecho un cristo, y es lo mejor que esa mollera sabe hacer con un teclado.',
  '¿Lo escribes mal y encima con esa seguridad de cojones? Ni te lo piensas.',
  'A tu cerebro le cuesta lo mismo escribir un comando que a otros una tesis.',
  'Has fallado donde no falla nadie. Ese es tu listón, y está en el suelo.',
  'Cada letra mal puesta es una neurona ausente, y esa cabeza no tiene suplentes.',
  'Imbécil del todo y sin margen de mejora: lo más simple te sale como el puto culo.',
  'Escribir bien no venía de serie en esa cabeza de mierda, y no se instala después.',
  'Eres tan idiota que ni teclear sabes sin joderlo.',
  'Ni dudas y lo escribes mal. Así de vacía tienes la puta cabeza.',
  'Lo has destrozado sin despeinarte. Para romper vales, para pensar eres una mierda.',
  'Te ha salido algo que no es ningún idioma. Tu cabeza habla uno que no entiende nadie.',
  'Un comando entero ya es la cima de ese cerebro. Te quedas a media cuesta.',
  'Lo has escrito como quien firma con la mano mala, y resulta que no tienes otra.',
  'Mal puesto, y eso no lo arregla la práctica, escoria. Lo trae esa cabeza.',
  'Eres tan poca mierda por dentro que ponerlo bien se te queda grande.',
  'Llevas la cabeza de puto adorno y en cuanto escribes se ve.',
  'Lo que acabas de poner es el máximo de esa mente, y el máximo es esto.',
  'Escribiste con el dedo y pensaste con el codo, que es con lo que piensas siempre.',
  'Eres la prueba de que esto se puede fallar: un cerebro bajo mínimos.',
  'Esa cabeza de mierda da para mucho menos de lo que has intentado escribir.',
];

// CABECERA POR POOL. Solo la tienen los avisos que niegan por RANGO: ahi hace
// falta decir de quien es el comando. Los demas (a ti mismo, duelo ajeno, solo
// grupos) ya se explican solos y una cabecera seria ruido.
//
// Va en un Map del propio array a su texto para no tener que cambiar la firma de
// aviso() ni tocar los seis sitios que lo llaman: el que tiene cabecera la
// recibe, el que no, sigue igual.
// El cierre del aviso de rango. Va DETRAS del insulto, no delante.
//
// La cabecera dice de quien es el comando; esto dice lo que te pasa a ti. Sin
// esta linea el remate se lee como una pulla suelta y el que la recibe no ata
// el insulto con el motivo — que es justo lo que hay que dejar claro, porque
// este aviso lo lee el grupo entero y no solo quien escribio el comando.
//
// Cortos a proposito: el remate ya ocupa su linea y esto no puede robarle
// sitio. Rotan aparte de las frases para que el mismo insulto no salga
// siempre con el mismo cierre.
const SIN_ACCESO = [
  'No tienes acceso a ese puto comando.',
  'Ese comando no lo tocas ni en sueños.',
  'Así que no, ese comando no es para ti.',
  'Ese comando no es para mierdas como tú.',
  'Y ese comando te lo metes por el culo.',
  'Ese comando no te hace ni puto caso.',
  'Cero acceso a ese comando, pringado.',
  'Ese comando te lo tienen prohibido.',
  'Te queda grande ese puto comando.',
  'A ese comando no llegas ni de coña.',
  'Y ese comando sigue sin ser tuyo.',
  'Para ti, ese comando está cerrado.',
  'Pasa de ti ese comando, como todos.',
  'Olvídate de ese comando, mierdecilla.',
];

const CABECERAS = new Map([
  [SOLO_ADMINS, '*Solo admins.*'],
  [SIN_PERMISO, '*Solo admins superiores.*'],
  [SIN_PERMISO_ADMIN, '*Solo admins superiores.*'],
]);
function cabeceraDe(pool) { return CABECERAS.get(pool) || null; }

// ─── EL CARTEL DEL DIA ───────────────────────────────────────────────────────
//
// El objetivo del dia existia desde hace tiempo: un miembro sorteado cada
// veinticuatro horas al que robar paga mas y sale mejor. Lo que no existia era
// que alguien se enterase. El bonus se aplicaba en silencio y solo se descubria
// DESPUES, en una linea al final de un robo que habia salido bien.
//
// O sea: maquinaria construida, calculada todos los dias, generando cero
// movimiento. Esto es lo que la saca a la luz.
//
// SALE UNA VEZ AL DIA Y CUANDO EL GRUPO YA ESTA DESPIERTO, no a la hora del
// corte. Un mensaje a las cinco de la mañana lo lee el scroll, no la gente: se
// suelta con el primer mensaje del dia, que es cuando hay alguien delante.
//
// Y NO SE DICE EL BONUS EN NUMEROS. "Robarle a X paga un 35 % mas" es una hoja
// de calculo; lo que mueve al grupo es saber a quien le toca hoy.
const OBJETIVO_DIA_CARTEL = [
  'Hoy le toca a %V. El que llegue primero se lo lleva mejor.',
  'Objetivo de hoy: %V. Suerte con eso, o suerte a los demás.',
  'El cartel de hoy lleva la cara de %V. Ya sabéis dónde mirar.',
  '%V amanece con precio. Hasta el corte de mañana.',
  'Hoy se roba a %V y sale más a cuenta que cualquier otro día.',
  'La diana de hoy es %V. No la he elegido yo, la ha elegido el día.',
  '%V es el objetivo de hoy. Que conste que avisé.',
  'El nombre de hoy es %V. Lo que hagáis con él es cosa vuestra.',
  'Objetivo del día: %V. El grupo ya lo sabe, así que %V también.',
  'Ha salido %V en el sorteo. Ni por bueno ni por malo: por mala suerte.',
  '%V va a tener un día largo. El cartel es suyo hasta mañana.',
  'Se abre el día con %V en la diana. Que corra la voz.',
  'Precio en la cabeza para %V. Hoy robarle sale más rentable que trabajar.',
  '%V es la papeleta que ha caído hoy. Que se vaya despidiendo del saldo.',
  '%V, hoy vas con diana. El resto, ya sabéis.',
  'Hoy hay temporada abierta con %V. Mañana ya se verá a quién le toca.',
  '%V sale hoy en el cartel. El sorteo de mañana puede repetir, que no tiene memoria.',
  'El sorteo de hoy ha salido %V. Sin apelación.',
  'Hoy el bot señala a %V. El resto puede respirar un día.',
  'Diana del día: %V. Desde ahora, cada robo a %V sale mejor.',
];

// Cola del aviso de fotos y vídeos sin *ver una vez*. La primera frase del
// aviso es fija (messageHandler); esto es lo que va detrás.
const VER_UNA_VEZ = [
  'Borrado, gilipoyas.',
  'Borrado.',
  'Borrado, anormal.',
  'Borrado. Nadie te quiere en su galería, mi niña.',
  'Borrado. Tu mierda no se queda en la galería de nadie.',
  'Borrado. Guárdate tus fotos donde te quepan, reina.',
  'Borrado. Lee las putas normas antes de mandar nada.',
  'Borrado. ¿Tanto te cuesta darle al puto 1, princesa?',
  'Borrado. Lo tuyo dura aquí lo que tardo en quitarlo.',
  'Borrado. Ni regalado se queda en el móvil de nadie, imbécil.',
  'Borrado. Las fotos de ver una vez te las metes por el culo, muñequita.',
  'Borrado. Mandas basura y encima a la vista de todos, subnormal.',
];

// !purge: el aviso que sale delante de los que se van a echar, justo antes del
// kick. Va detras de las menciones, por eso empieza en minuscula. El motivo es
// el que da el dueño al purgar —no cumplir las reglas— y no se inventa otro:
// el bot no sabe cual de ellas se ha saltado cada uno. Uno en singular y
// varios en vosotros, como el resto del bot. En baraja.
const PURGE_UNO = [
  'fuera. Las reglas estaban a la vista y no las has leído, como no lees nada.',
  'a la calle. Aquí se entra cumpliendo las reglas, y tú entraste a mirar.',
  'fuera del grupo. Las normas no eran opcionales y te las has saltado, chiquitina.',
  'te vas por pasarte las putas reglas por el culo. Segunda oportunidad no hay.',
  'las reglas pedían poco, gilipoyas, y no has llegado ni a eso. Fuera.',
  'fuera. No cumples lo que pide el grupo, y el grupo no te va a echar de menos.',
  'te vas. Las reglas no se negocian, y tú no tenías nada con qué negociar.',
  'fuera. Cumplir las reglas te habría costado menos que esto, pero pensar te cuesta más.',
  'se acabó tu sitio aquí. Las reglas mandan, y tu plaza va para alguien que sepa leer.',
  'se te echa, inútil. Aquí las reglas se cumplen o se sale, y tú sales.',
];

const PURGE_VARIOS = [
  'fuera. Las reglas estaban a la vista y no las habéis leído, como no leéis nada.',
  'a la calle. Aquí se entra cumpliendo las reglas, y vosotros entrasteis a mirar.',
  'fuera del grupo. Las normas no eran opcionales, y os las habéis saltado.',
  'os vais por no cumplir las reglas. Sin segunda oportunidad: la primera ya la tirasteis.',
  'las reglas pedían poco y no habéis llegado ni a eso. Fuera.',
  'fuera. No cumplís lo que pide el grupo, y el grupo no os va a echar de menos.',
  'os vais. Las reglas no se negocian, y vosotros no teníais nada con qué negociar.',
  'largo de aquí. Cumplir las reglas costaba poco, pero pensar os cuesta un huevo.',
  'se acabó vuestro sitio aquí. Las reglas mandan, y la plaza va para gente que sepa leer.',
  'se os echa. Aquí las reglas se cumplen o se sale, y vosotros salís.',
];

module.exports = {
  OBJETIVO_DIA_CARTEL,
  VER_UNA_VEZ, PURGE_UNO, PURGE_VARIOS,
  cabeceraDe,
  MAL_ESCRITO, SOLO_GRUPOS, SIN_PERMISO, SIN_PERMISO_ADMIN, SOLO_ADMINS, PURGA_ADMIN, SIN_ACCESO, A_TI_MISMO, AL_BOT, CONTRA_UN_ADMIN, DUELO_AJENO };
