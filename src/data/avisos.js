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
  'Eso en el grupo. Aquí solo estamos tú y yo, y yo no me lo hago a mí mismo.', // ROCKSTAR
  'En privado esto no tiene público, y sin público no tiene gracia. Al grupo.',
  'Aquí no. Esto, como tus fantasías de exhibicionista, solo luce con público. Al grupo.', // ROCKSTAR
  'Lo de los grupos se hace en los grupos. Aquí, como mucho, me cuentas tu día.',
  'Eso necesita testigos. Hacer cosas a solas en tu cuarto ya lo haces bastante: al grupo.', // ROCKSTAR
  'El grupo es donde se cobra, se roba y se llora. Esto es la sala de espera.',
  'Al grupo con eso. En privado no hay capturas ni nadie que te aplauda cuando terminas.', // ROCKSTAR
  'Eso es de grupo. Aquí, a solas conmigo, solo se te va a mover la muñeca.', // ROCKSTAR
  'Sin el grupo mirando no hay salseo que valga. Aquí no.',
  'Para eso está el grupo, que es donde está la gente a la que se le hace.',
  'Aquí no hay a quién apuntar. El grupo está lleno de candidatos.',
  'Por privado no sale. El grupo, en cambio, lo está esperando.',
  'Lo que se hace a solas no sale en ninguna captura. Al grupo.', // ROCKSTAR
  'Eso pide grupo. Aquí estamos tú, yo y una tensión que no va a acabar en nada.', // ROCKSTAR
  'Llévalo al grupo. Aquí no hay ranking que subir ni nadie a quien bajar.',
  'Este chat es para lo que no se dice delante de todos. Eso sí se dice: al grupo.',
  'Las fichas, los robos y las broncas están en el grupo. Aquí no se juega.',
  'Sal al grupo con eso. En privado, por mucho que insistas y lo frotes, no pasa nada.', // ROCKSTAR
  'Eso es de grupo. Aquí no tengo a quién enseñárselo.',
  'El grupo tiene el público, el marcador y las víctimas. Aquí no hay nada de eso.',
  'En el grupo, que es donde se aplaude. Aquí, a solas, solo aplaudes con una mano.', // ROCKSTAR
  'La mesa está montada en el grupo. Aquí no hay partida.',
  'Lo que no se ve no cuenta, y en privado no se ve. Al grupo.',
  'Para eso hacen falta más de dos, como para lo mejor de la vida. Aquí somos dos: al grupo.', // ROCKSTAR
  'En el grupo funciona. Aquí solo sirve para que me escribas, y eso ya lo haces.',
  'Eso es de grupo. Aquí tienes toda mi atención, pero ningún objetivo.',
  'Hazlo en el grupo y que lo vea todo el mundo: a escondidas ya no te pone.', // ROCKSTAR
  'Esto en privado no luce. Como tú, que con la luz apagada ganas mucho. Al grupo.', // ROCKSTAR
  'Ahí fuera, en el grupo, hay alguien esperando a que lo hagas. Aquí no.',
  'Al grupo, que es donde las cosas tienen consecuencias. Aquí no las tienen.',
];

// LO MISMO UN ESCALON MAS ARRIBA: salta cuando un miembro toca algo del tier de
// owner. La cabecera dice "Solo admins superiores" y no "solo el dueño", que es
// como lo llama el menu: nombrar a un dueño en un aviso que lee todo el grupo
// es señalar a una persona, y eso no lo hace el bot en ningun sitio.
const SIN_PERMISO = [
  'Eso es de otro nivel. Ni de puntillas llegas, y mira que de rodillas llegas a todo.', // ROCKSTAR
  'Eso es de quien paga la fiesta. Tú, comemierda, solo vienes a limpiar las vomitonas.',
  'Ese permiso lo tiene quien decide. Tú no decides ni cuándo te limpias el culo.',
  'Te falta rango y te sobra hocico, y esa mezcla huele a mierda desde aquí.',
  'Eso lo tocan los de arriba. Un inútil de mierda como tú obedece, y ni eso bien.',
  'Eso no lo toca una rata como tú. Tú tocas otras cosas, y a solas.', // ROCKSTAR
  'Has intentado colarte por detrás, y por detrás aquí no entra nadie sin permiso.', // ROCKSTAR
  'No, gilipoyas. Eso está muy por encima de ti y no vas a subir ni un puto escalón.',
  'Ese permiso es para gente de fiar, y de ti no se fía ni tu puta madre.',
  'Te dan un dedo y ya quieres meter la mano entera, sanguijuela. Ni la hora te dan.', // ROCKSTAR
  'Ni con el grupo entero borracho y cachondo te dejarían tocar eso, pequeña.', // ROCKSTAR
  'Te crees arriba porque hay gente abajo, gilipoyas, y sigues siendo una mierda.',
  'A ti no te prestan ni un condón, y un permiso menos: lo que tocas no vuelve igual.', // ROCKSTAR
  'Hay gente por encima de ti, y el grupo entero sabe por qué: porque das puto asco.',
  'Eres el chiste guarro del grupo, sin gracia ni final feliz. Esto es de gente seria.', // ROCKSTAR
  'Eso es para quien vale algo, y tú no vales ni lo que cuesta mandarte a la mierda.',
];

// El mismo aviso cuando quien lo toca SÍ es admin. Estas le echan en cara el
// rango que tiene y que no le alcanza; a un miembro sin rango le estarían
// llamando admin delante de todos, que es mentira. Quien llama elige el pool
// mirando al que escribe (avisoPermiso en helpers).
const SIN_PERMISO_ADMIN = [
  'Ser admin no te hace importante, imbécil. Útil solo has sido a solas y con pestillo.', // ROCKSTAR
  'Tienes rango de inútil de mierda, y esto está dos escalones por encima de tu culo.',
  'Te queda grande el cargo, incompetente de mierda, y esto ni lo hueles.',
  'Te crees con mando, mediocre. El único que manejas es el de la tele, de madrugada.', // ROCKSTAR
  'Te dan admin y ya quieres los botones gordos. Calma, que lo gordo te viene grande.', // ROCKSTAR
  'Tienes rango y sigues sin ser nadie. Hace falta ser muy mierda para conseguirlo.',
  'Farsante con placa. Pones cara de mando como quien finge un orgasmo, y se te nota.', // ROCKSTAR
  'Creías que el rango te lo daba todo, como aquella noche. Y tampoco te lo dieron.', // ROCKSTAR
  'Llevas el rango como un disfraz de poli sexy: queda mono y no detiene a nadie.', // ROCKSTAR
  'Eres admin de adorno, cabrón. Esto lo tocan los de arriba, y tú no llegas.',
  'Tu rango da para borrar stickers guarros, y antes te los guardas. Esto, ni olerlo.', // ROCKSTAR
  'Esto no viene con el rango, escoria. Se le da a quien vale, y a ti no te lo dan.',
  'Ni siendo admin, rata. Hay alturas que no vas a pisar nunca.',
  'Eres admin de la última fila, y los de delante se limpian el culo con tus avisos.',
  'Lameculos con rango, lameculos igual. Esto no se te da.',
  'Ser admin no te quita lo escoria. Y esto sigue sin ser para ti.',
  'Te dieron admin de milagro, como tu último polvo, y ya quieres repetir los dos.', // ROCKSTAR
  'Tu cargo sirve para mandar callar, subnormal, y aquí te mandan callar a ti.',
  'Eres admin de guardería, no de mando. Asúmelo, imbécil de mierda.',
  'Decidiendo cosas de mayores con un rango de mierda. Siéntate.',
  'Tu rango solo te da botones, y te pasa como en la cama: no das con el bueno.', // ROCKSTAR
  'Ni con el cargo puesto dejas de chupar del grupo. Esto no es para ti.',
  'Para recados te sobra el rango. Esto está por encima de ti, y de tus recados.',
  'Con rango o sin él, en la cama y fuera das la misma pena. Esto no es para ti, reina.', // ROCKSTAR
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
//
// EL TONO QUE LE MOLA AL DUEÑO (20 oct): la que sube a los admins y deja abajo
// a quien lo intenta. «Te dejan escribir aquí de milagro. Mandar, ni en tus
// putos sueños mojados.» Las demás se quedan; si entra una nueva, que vaya así.
const SOLO_ADMINS = [
  'Nadie te ha hecho admin en todo este tiempo porque eres un puto cero a la izquierda.',
  'Tú no mandas ni en tu puta casa, comemierda, y vienes a mandar aquí.',
  '¿Tú admin? Antes le dan el rango a una rata con sarna que a ti, pequeña.',
  'Te ha visto el grupo entero intentando mandar sin rango. Qué puto ridículo das.',
  'Tu único cargo aquí es el de chupapoyas oficial, y ese sí te lo ganaste.', // ROCKSTAR
  'No eres admin, gilipoyas, y con esa cara de mierda no te lo van a dar nunca.',
  'Sin rango no tocas nada, mierdecilla. Aquí tu sitio es callar y aplaudir.',
  'Ni de rodillas ante cada admin te darían el rango, y seguro que lo has pensado.', // ROCKSTAR
  'Has intentado mandar sin rango, y el grupo se está descojonando de ti ahora mismo.',
  'No eres admin: eres el felpudo, y por cómo te tumbas cuando entra alguien, te gusta.', // ROCKSTAR
  'Querías mandar sin rango. Aquí eso se llama hacer el gilipoyas en público.',
  'A un desgraciado de mierda como tú no le dan el rango ni por pena.',
  'Sin rango, sin peso y sin nadie que dé la cara por ti. Aquí eres relleno de mierda.',
  'El grupo te soporta como a una diarrea, y a una diarrea no se la hace admin.',
  'Eres miembro raso: no te dejan ni sujetar la vela, y eso que de velas sabes un rato.', // ROCKSTAR
  'Te dejan escribir aquí de milagro. Mandar, ni en tus putos sueños mojados.', // ROCKSTAR
  'A ti no te hacen admin ni aunque te mueras y lo pidan en tu funeral.',
  'Te has creído admin un segundo, pringado de mierda, y el grupo lo ha visto entero.',
  'Tu nombre no sale en la lista de admins, y no sale porque eres una puta mierda.',
  'Aquí manda quien tiene cojones y rango. Tú no tienes ni lo uno ni lo otro.',
  '¿Mandar tú? Si en la cama tampoco mandas: te dicen «no te muevas» y no te mueves.', // ROCKSTAR
  'Lo de mandar te lo metes por el culo, que es donde te cabe el rango que tienes.',
  'El botón te ha visto venir, gilipoyas, y no se mueve por un muerto de hambre.',
  'No te dan el rango porque en cuanto abres la boca sale mierda.',
  'Querías ser admin y te has quedado en payaso del grupo. Ese cargo sí es tuyo.',
  'Insistiendo no hay rango, plasta. No te funciona ni en la discoteca a las seis.', // ROCKSTAR
  'Ni lamiendo culos llegas a admin, y mira que tienes la lengua entrenada.', // ROCKSTAR
  'No eres admin ni lo vas a ser. El rango, como el sexo, lo ves por internet.', // ROCKSTAR
  'Tocar lo ajeno es lo más cerca del poder que va a estar un parásito como tú.',
  'Das órdenes sin rango y los admins se parten el culo contigo. Sigue, que es gratis.',
  'Tienes las mismas opciones de ser admin que de follar este año: cero.', // ROCKSTAR
  'El rango se gana, y tú no has ganado nada, ni un rasca ni un polvo a la primera.', // ROCKSTAR
  'Miembro raso con ínfulas. Mandas como besas: mucha lengua y nadie lo ha pedido.', // ROCKSTAR
  'Ese botón es de admins, no de basura como tú. Lo tuyo es no pintar una mierda.',
  'Nadie te va a dar el rango, escoria. Ni ahora ni cuando lloriquees por privado.',
  'Pintas menos que los que se piraron del grupo y vienes a dar órdenes de mierda.',
  'No tienes rango, NPC. Tienes un móvil, una mano libre y demasiado tiempo a solas.', // ROCKSTAR
  'Para esto hace falta rango, cerebro y alguien que te toque sin cobrarte. Ni uno.', // ROCKSTAR
  'Te dan permiso para escribir y ya te lo estás follando. Mandar, ni de coña.', // ROCKSTAR
  'Con ganas no se abre, pringado. Eso te lo debieron decir en tu primera vez.', // ROCKSTAR
];

// Se ha puesto a si mismo de objetivo. Se lee en el grupo.
const A_TI_MISMO = [
  'Te eliges a ti, gilipoyas. Ni un puto enemigo tienes, y eso ya dice mucho.',
  'Contra ti no, pedazo de mierda. Que lo hayas intentado dice bastante de tu cabeza.',
  'A ti no. Métete con alguien que te conteste, si es que alguien te habla, pequeña.',
  'Elige a otra persona, si es que conoces a alguien que no te tenga bloqueado.',
  'Eso se hace con dos, como casi todo lo bueno. Tú a solas ya te apañas bastante, se nota.', // ROCKSTAR
  'No. Ni el bot quiere ver cómo te haces una paja delante del espejo.', // ROCKSTAR
  'Contra ti no. Que te gustes tanto no significa que te puedas hacer de todo.', // ROCKSTAR
  'Ponerte de objetivo es lo más triste que ha pasado hoy aquí, y eso que estás tú.',
  'No se puede. Ni para darte por culo a ti te bastas.',
  'Tú contra ti. Ni en la cama te ganas: siempre acabas antes que tú.', // ROCKSTAR
  'Elige a otra persona. A ti ya te conoces, y sabes que no vales una mierda.',
  'Si tanto te odias, págate un psicólogo, que al bot no le pagas una mierda.',
  'Deja de mirarte el ombligo, que de ahí para abajo tampoco hay nada que ver.', // ROCKSTAR
  'Autolesión por comando. Para eso ya tienes tu cara, no hace falta el bot.',
  'No te lo vas a hacer a ti. Ni aunque te lo merezcas, que te lo mereces de cojones.',
  'Apuntarte a ti es ligar con tu reflejo: dice que sí a todo y nunca te llama.', // ROCKSTAR
  'Contigo no se juega. Bastante te la juegas tú en cuanto hablas, mi niña.',
  'Ni enemigos tienes, pringado de mierda, y por eso te apuntas a ti de aburrimiento.',
  'Esto se le hace a otra persona, no al espejo, que ya te ve hacer bastantes cosas a solas.', // ROCKSTAR
  'Víctima y verdugo a la vez. Es el único trío que vas a conseguir: tú, tú y tu mala idea.', // ROCKSTAR
  'No se puede, y el grupo entero acaba de ver lo gilipoyas que eres.',
  'Un poco de amor propio, joder. Ni para eso te llega, triste de los cojones.',
  'Te has apuntado a ti. Por fin apuntas y das en el sitio, aunque sea el equivocado.', // ROCKSTAR
  'Contigo no llega para dos bandos. Para un solitario, sí, y lo juegas cada noche.', // ROCKSTAR
  'Eres lo único que nunca te dice que no, y aun así te quedas a medias.', // ROCKSTAR
  'Menciona a otra persona. Contigo no sale nada, como en el resto de tu puta vida.',
  'Eso es para otra persona. Contigo solo haces el puto ridículo, y gratis.',
  'No insistas, que se nota que te sobra tiempo y te falta follar.', // ROCKSTAR
  'Te quieres dar caña a ti. Normal: eres lo único que se deja tocar por ti.', // ROCKSTAR
  'A ti no, comemierda. Busca con quién pelear, si te queda alguien que te hable.',
];

// Alguien le ha lanzado al BOT un comando que va contra otra persona: casi
// siempre porque ha respondido a un mensaje del bot en vez de al de quien
// queria. Lo pidio el dueño: que el bot no se insulte ni se robe a si mismo,
// y que en vez de eso se le ataque la inteligencia al que no sabe mencionar.
// Van detras de su @. En baraja: salen todas antes de repetir ninguna.
//
// CLARAS Y A LA CABEZA (dueño, 20 oct): «no son lo suficientemente claras ni
// hacen ataques directos; ni atacan la inteligencia de forma directa ni
// vulgar». Cada frase dice lo que ha hecho y le da en la inteligencia sin
// rodeos. Responder al mensaje del bot y mencionarlo son dos despistes
// distintos, y por eso dos pools: «has respondido al bot» a quien lo ha
// mencionado no se entiende. «A mí no, retrasado de mierda» es del dueño y
// se queda tal cual.
const AL_BOT = [
  'A mí no, retrasado de mierda. Menciona a quien querías, si te acuerdas de quién era.',
  'Has respondido al bot, gilipoyas. A mí no me pongas, que soy un programa.', // ROCKSTAR
  'Le has respondido al bot, pedazo de imbécil. El comando es para una persona, no para mí.',
  'Respondes al bot para darle a otra persona, imbécil. Así le llegan tus nudes a tu jefe.', // ROCKSTAR
  'De todo el chat, has respondido al del bot. Hay que ser subnormal de cojones.',
  'Has apuntado al bot, gilipoyas. Con esa puntería, en la cama todo son «ahí no».', // ROCKSTAR
  'Me has respondido a mí y no a la persona. Tienes la cabeza llena de mierda.',
  'El mensaje al que respondes es mío, imbécil. Ni leer de quién es te da el cerebro.',
  'Respondiste al bot, anormal. Yo no tengo cuerpo, y por lo visto a ti eso no te frena.', // ROCKSTAR
  'Responder al mensaje equivocado es de subnormal. Tú has respondido al bot: de premio.',
  'Tu cerebro de mierda le ha respondido al bot. Responde a la persona que querías.',
  'Has respondido al bot, subnormal. Te lías de persona igual que en la cama.', // ROCKSTAR
  'A mi mensaje no, subnormal: responde al de la persona. Ni eso te entra en la puta cabeza.',
  'Respondes al bot sin mencionar a nadie, idiota. Lo básico no te cabe en el cerebro.',
  'Me has respondido a mí, cabeza hueca. Yo no tengo lo que buscas, pequeña.', // ROCKSTAR
];

// El mismo aviso cuando lo que ha hecho es MENCIONAR al bot.
const AL_BOT_MENCION = [
  'Has mencionado al bot, subnormal. Menciona a la persona, que no tiene ciencia.',
  'La mención era para otra persona y me la has hecho a mí. Tienes el cerebro de mierda.',
  'De todo el grupo, mencionas al bot, idiota. Ese gusto explica tu historial.', // ROCKSTAR
  'Mencionas al bot para darle a otra persona. Esa neurona tuya no da para más, joder.',
  'Mi nombre en la mención, gilipoyas. Gimes el nombre equivocado hasta por escrito.', // ROCKSTAR
  'Solo tenías que mencionar a alguien, anormal, y vas y mencionas al puto bot.',
  'Me mencionas a mí, cabeza loca. Ya sé que te pongo, pero menciona a la persona.', // ROCKSTAR
  'Has mencionado al bot. Con medio cerebro habrías elegido bien, y ni medio tienes, joder.',
  'A mí no me menciones, imbécil. A mí no se me da por ningún lado.', // ROCKSTAR
  'Te equivocas de mención y eliges al bot. Ese cerebro de mierda no da ni para eso.',
];

// El objetivo es un admin y quien lo intenta no llega. Se lee en el grupo, y
// delante del propio admin, que es la mitad de la gracia.
const CONTRA_UN_ADMIN = [
  'A un admin no, gilipoyas. Métete con alguien que no te pueda partir la cara.',
  'Contra un admin no tienes nada que hacer. Esas ganas, guárdatelas para esta noche.', // ROCKSTAR
  'Cerrarle la boca a un admin no puedes, cabrón. Abre la tuya y trágate lo que te dé.', // ROCKSTAR
  'Sabías que a un admin no se le toca y lo has intentado igual, pedazo de imbécil.',
  'Ni delante del grupo le callas, y con tantas ganas que alguien pide que os dejen solos.', // ROCKSTAR
  'Es admin, escoria. Desde donde estás no le llegas ni a la suela del zapato.',
  'Entre admins no se mutea, comemierda. Eso no lo decides tú ni en tus sueños mojados.', // ROCKSTAR
  'Un admin queriendo mutear a otro. Tanta tensión ya huele a habitación de hotel.', // ROCKSTAR
  'Callar a otro admin no te sale, subnormal. Le das y te sigue escribiendo en la cara.',
  'Mismo rango, mismo botón, cero efecto. Te has quedado con el dedo en el culo.', // ROCKSTAR
  'Mutear a otro admin no se puede, y todo el grupo te ha visto hacer el gilipoyas.',
  'Tenéis el mismo rango, pringado. Aquí nadie va encima de nadie, por mucho que te guste.', // ROCKSTAR
  'Contra otro admin no hay mute, cara de culo. Te lo comes con patatas como el resto.',
  'El bot no os hace de árbitro. Si queréis daros por culo, hacedlo por privado.', // ROCKSTAR
  'Los admins no se callan entre sí, basura. Si no os aguantáis, os jodéis los dos.',
  'Querías usar tu cargo contra otro, desgraciado. El tuyo no da ni para limpiarte el culo.',
  'A un admin no se le mutea desde abajo ni desde al lado, y tú no estás ni al lado.',
  'Ese mute rebota y te salpica en toda la cara. Ya deberías tener costumbre.', // ROCKSTAR
  'Estáis al mismo nivel, mediocre de mierda, y a ti ese nivel ya te venía grande.',
  'Le has tirado el mute a otro admin, pedazo de mierda. No entra, y ahora te tiene fichado.',
  'Intento de golpe de estado entre admins. Fracasado, como todo lo que haces.',
  'Ahí no llega tu rango, despreciable. Se queda a medias, como tú por las noches.', // ROCKSTAR
  'Un admin contra otro. El grupo se descojona, y tú te quedas sin mute y sin cara.',
  'Mute denegado, cobarde. Tus ganas de callarle las ha visto todo el puto grupo.',
  'Querías callar a un admin, y quien queda en ridículo eres tú.',
  'A un admin no le tocas ni un pelo: ni con el botón, ni con la mano, ni con lo otro.', // ROCKSTAR
  'Con un admin no, payaso. Elige a alguien de tu nivel: el suelo.',
  'Le tienes ganas a un admin y no puedes hacerle nada. Te lo comes, y bien comido.', // ROCKSTAR
  'Contra un admin ni lo sueñes, gilipoyas. Tu dedo ahí no manda una mierda.',
  'Apuntas a un admin con el mute y lo único que has muteado es tu dignidad.',
];

// Se ha metido en un duelo de otros dos. Se lee en el grupo.
const DUELO_AJENO = [
  'A ti no te han llamado, metomentodo de mierda. Aparta.',
  'No es tu pelea. Métete en la tuya, si es que alguien quiere pelear contigo.',
  'A ti nadie te ha retado, gilipoyas. Párate a pensar por qué, si te da la cabeza.',
  'Ese duelo no es tuyo ni de lejos, garrapata.',
  'No lleva tu nombre ese duelo, cotilla de mierda. Colarte no te va a dar uno.',
  'Es de otros dos. Tú a mirar, que es lo único que haces bien, y ni eso.',
  'No te toca. Consíguete un enemigo propio, que ni para eso das.',
  'Dos nombres en ese duelo, y ninguno es el de un estorbo como tú.',
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
  'Has usado el admin para desahogarte a gusto. Se acabó el desahogo: ya no eres admin.', // ROCKSTAR
  'Te has corrido echando gente, y el bot te ha echado a ti del cargo.', // ROCKSTAR
  'O te robaron la cuenta o eres así de imbécil. Sin admin en los dos casos.',
  'El grupo no es tuyo, cabrón, y acabas de demostrar por qué. Rango fuera.',
  'Confundiste ser admin con hacer lo que te sale del coño. Y te has quedado sin las dos.',
  'A un inútil así no se le avisa: se le quita el botón de las manos.',
  'Le has dado al botón como a otra cosa, a lo loco y sin parar, y ya no lo tienes.', // ROCKSTAR
  'Le has cogido gusto a echar gente, pedazo de mierda, y se te ha acabado el juguete.', // ROCKSTAR
  'Querías vaciar el grupo y te has vaciado tú, y del cargo. Así de rápido acabas siempre.', // ROCKSTAR
  'Echar gente sin parar tiene un precio, y lo acabas de pagar con el rango y con la cara.',
  'Echabas gente como quien caga. El bot ha contado y ha tirado de la cadena contigo.',
  'Te dieron rango para cuidar el grupo, cabrón, y lo has usado para vaciarlo. Fuera.',
  'Ahora eres miembro raso. Ya no estás arriba: te toca ponerte debajo, como a todos.', // ROCKSTAR
  'Echar gente en masa te ha salido caro: el rango, y la puta cara delante de los que quedan.',
  'Con tanto echar se te olvidó que a ti también te pueden joder. Pues ya te han jodido.', // ROCKSTAR
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
  'Retraso de nacimiento, y cada vez que escribes algo lo confirmas.',
  'No te da la cabeza ni para escribirlo bien, y con los dedos, por lo visto, tampoco.', // ROCKSTAR
  'Tu cerebro es una puta piedra y se te nota en cada palabra que escribes.',
  'Escribes con media neurona, y aun así la usas menos que la mano derecha.', // ROCKSTAR
  'Ahí dentro no hay nada, y eso que has puesto es la firma.',
  'Tu techo es escribir algo corto sin romperlo. Durar poco ya lo dominas en otro sitio.', // ROCKSTAR
  'Has escrito hasta donde te llega la cabeza, que es poco, como tus preliminares.', // ROCKSTAR
  'Acabas de tocar tu límite escribiendo un comando. Normal que nadie te deje tocar más.', // ROCKSTAR
  'Ni lo escribes bien, cabrón. Ese es el suelo y ahí vives.',
  'Lo mínimo del mundo era escribirlo bien, comemierda, y ni a eso llegas.',
  'No aciertas ni con las letras, y en la cama no llegas: siempre «más arriba, más abajo».', // ROCKSTAR
  'Lo tuyo no lo arregla el autocorrector: corrige letras, no subnormales.',
  'No te ha fallado el móvil. Te ha fallado la cabeza y esa no tiene repuesto, pequeña.',
  'Lo tuyo no se arregla mirando la pantalla. Tu fallo está más arriba.',
  'Escribirlo bien no lo vas a aprender en tu puta vida. Retraso de fábrica.',
  'Una palabra mal escrita: tu cabeza da para eso, y tus mensajes guarros no ponen a nadie.', // ROCKSTAR
  'Te acaba de medir el grupo entero con un puto comando y has dado bajísimo.',
  'Escribes como piensas: como el puto culo.',
  'Analfabeto con wifi: escribes así porque el wifi solo lo usas para el porno.', // ROCKSTAR
  'Una palabra y te ha ganado. Ese es tu techo, y con «más» y «sigue» en la cama, igual.', // ROCKSTAR
  'Esa cabeza tiene el techo tan bajo que escribir un comando ya le roza.',
  'Mal escrito, y era corta. Esa cabeza contesta «sbue» a un «sube» y duerme en la calle.', // ROCKSTAR
  'Hasta un crío lo escribe bien a la primera. Tú no llegas a ese nivel, princesa.',
  'Escribirlo entero era tu tope. En la cama te piden acabar lo que empiezas, y tampoco.', // ROCKSTAR
  'Escribirlo bien era una tontería y lo has jodido, inútil de mierda.',
  'Escribes con defecto de fábrica: a tus padres se les rompió el condón y la ortografía.', // ROCKSTAR
  'Escribes de puta pena y el grupo ya sabe cuánto da de sí esa cabeza.',
  'Sin presión ninguna y te sale fatal. Imagínate con alguien sin ropa delante, esperando.', // ROCKSTAR
  'Escribes así porque esa cabeza de mierda no llega a más.',
  'Tus neuronas escriben así en su mejor día: las dos que quedan piensan en guarradas.', // ROCKSTAR
  'Con las neuronas que te quedan, ponerlo bien no iba a pasar nunca, y no ha pasado.',
  'Ha quedado hecho un cristo. Así escribes sin beber; de madrugada será porno abstracto.', // ROCKSTAR
  '¿Lo escribes mal y encima con esa seguridad de cojones? Ni te lo piensas.',
  'A tu cerebro escribir un comando le cuesta lo que a ti desabrochar algo con una mano.', // ROCKSTAR
  'Has fallado donde no falla nadie. Ese es tu listón, y está en el suelo.',
  'Cada letra mal puesta es una neurona ausente, y esa cabeza no tiene suplentes.',
  'Imbécil del todo y sin margen de mejora: lo más simple te sale como el puto culo.',
  'Escribir bien no venía de serie en esa cabeza, como el aguante en otras partes.', // ROCKSTAR
  'Eres tan idiota que ni escribir sabes sin joderlo.',
  'Ni dudas y lo escribes mal. Esa seguridad sin motivo es la misma con la que te desnudas.', // ROCKSTAR
  'Lo has destrozado sin despeinarte. Para romper vales, para pensar eres una mierda.',
  'Te ha salido algo que no es ningún idioma: parecen tus ruidos en la cama, por escrito.', // ROCKSTAR
  'Un comando entero ya es la cima de ese cerebro. Te quedas a media cuesta.',
  'Lo has escrito como quien firma con la mano mala, y resulta que no tienes otra.',
  'Mal puesto, y eso no lo arregla la práctica, escoria. Lo trae esa cabeza.',
  'Eres tan poca mierda por dentro que ponerlo bien se te queda grande.',
  'Llevas la cabeza de puto adorno y en cuanto escribes se ve.',
  'Eso que has puesto es el máximo de esa mente, como el tuyo en la cama: dos minutos.', // ROCKSTAR
  'Escribiste con el dedo y pensaste con lo de abajo, que es con lo que piensas siempre.', // ROCKSTAR
  'Ese comando lo escribe bien hasta el corrector, y tu cabeza ha conseguido estropearlo.',
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
  'De rodillas tampoco llegas al comando.', // ROCKSTAR
  'Con ese rango, el comando ni te mira.',
  'Sin rango ni aguante, no hay comando.', // ROCKSTAR
  'Ese comando no se deja tocar por ti.', // ROCKSTAR
  'El comando te vio sin ropa. Aún se ríe.', // ROCKSTAR
  'Tú, sin rango, ni rozas ese comando.',
  'Tú y el comando no os conocéis de nada.',
  'Tus nudes y el comando: ambos en visto.', // ROCKSTAR
  'Tú sigue soñando con ese puto comando.',
  'El comando no atiende a gente como tú.',
  'Ni pagando te abre ese comando.',
  'Con una mano ocupada no hay comando.', // ROCKSTAR
  'Tu rango no da ni para oler el comando.',
  'El comando te ha leído y pasa de ti.',
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
  'Objetivo del día: %V. Su saldo acaba de pasar de privado a bien público hasta mañana.',
  '%V, enhorabuena: hoy eres la oferta del día. Robarte paga más y sale mejor.',
  'Cartel del día con la cara de %V. Si hoy notas manos en el bolsillo, no es cariño.',
  '%V cotiza hoy en el grupo. Precio de salida: todo lo que lleve encima.',
  'Diana para %V hasta mañana. Ya hay quien hace cuentas con su saldo por privado.',
  'Hoy %V vale más robado que entero. La oferta caduca mañana, como todas las buenas.',
  'Precio en la cabeza para %V. Hoy robarle da más que todo lo que %V ha ganado esta semana.',
  '%V lleva hoy la diana colgada. Ya se le ve corriendo al banco a esconder cuatro monedas.',
  'Hoy se roba a %V con premio y con descuento. Leed la letra pequeña: no hay letra pequeña.',
  '%V es la diana de hoy. Que conste en acta que el bot avisó, por si luego hay lloros.',
  'Le ha tocado a %V. Ese silencio que viene ahora es %V contando lo que tiene.',
  'Le toca a %V. Hasta mañana, robarle cobra extra y entra más limpio. Que empiece el salseo.',
  '%V sale hoy en el cartel. Mañana puede repetir, que la suerte de %V no da para más.',
  'Diana del día: %V. Mañana a esta hora se verá cuánto le queda, si le queda algo.',
  'Se abre la veda con %V. Robarle hoy cuesta menos y paga más: invitación por escrito.',
  '%V amanece con recompensa en la cabeza y el grupo con las manos libres. Mala combinación.',
  'El bot señala a %V. Hoy su aura no es suya: está de paso, esperando a quien se la lleve.',
  'Objetivo nuevo: %V. Cada vez que escriba hoy, alguien mirará su saldo y no su mensaje.',
  'Cartel nuevo: %V. Quien le robe hoy cobra con bonus y se lleva el cotilleo de regalo.',
  'La diana de hoy es %V. La elige el sorteo, y el sorteo no acepta reclamaciones.',
];

// Cola del aviso de fotos y vídeos sin *ver una vez*. La primera frase del
// aviso es fija (messageHandler); esto es lo que va detrás.
const VER_UNA_VEZ = [
  'Borrado, gilipoyas.',
  'Borrado. Esto no es OnlyFans: aquí se enseña una vez y gracias.', // ROCKSTAR
  'Borrado, anormal.',
  'Borrado. Nadie te quiere en su galería, mi niña.',
  'Borrado. Si quieres que te guarden las fotos, cobra la suscripción como todo el mundo.', // ROCKSTAR
  'Borrado. Guárdate tus fotos donde te quepan, reina.', // ROCKSTAR
  'Borrado. Ver una vez, como tus citas: una y no se repite.', // ROCKSTAR
  'Borrado. ¿Tanto te cuesta darle al puto 1, princesa?',
  'Borrado. Lo tuyo dura aquí lo que duras tú en la cama.', // ROCKSTAR
  'Borrado. Ni regalada se queda nadie la mierda que mandas.',
  'Borrado. Las fotos sin ver una vez te las metes por el culo, muñequita.',
  'Borrado. Hay que ser subnormal para mandar basura a la vista de todos.',
];

// !purge: el aviso que sale delante de los que se van a echar, justo antes del
// kick. Va detras de las menciones, por eso empieza en minuscula. El motivo es
// el que da el dueño al purgar —no cumplir las reglas— y no se inventa otro:
// el bot no sabe cual de ellas se ha saltado cada uno. Uno en singular y
// varios en vosotros, como el resto del bot. En baraja.
const PURGE_UNO = [
  'fuera. Las reglas estaban a la vista y no las has leído, como no lees nada.',
  'a la calle. Entraste solo a mirar, y a los mirones se les echa antes de que se toquen.', // ROCKSTAR
  'fuera del grupo. Las normas no eran opcionales y te las has saltado, chiquitina.',
  'te vas por pasarte las putas reglas por el culo. Segunda oportunidad no hay.',
  'las reglas pedían poco, gilipoyas, y no has llegado ni a eso. Fuera.',
  'fuera. No cumples lo que pide el grupo, como no cumples en otro sitio que todos sabemos.', // ROCKSTAR
  'te vas. Las reglas no se negocian, y tú no tenías nada con qué negociar.',
  'fuera. Las reglas eran fáciles, como los preliminares, y tú te saltas las dos cosas.', // ROCKSTAR
  'se acabó tu sitio aquí. Las reglas mandan, y tu sitio va para alguien que sepa leer.',
  'se te echa, inútil. Las reglas se cumplen o se sale, y tú sales tan rápido como acabas.', // ROCKSTAR
];

const PURGE_VARIOS = [
  'fuera. Las reglas estaban a la vista y no las habéis leído, como no leéis nada.',
  'a la calle. Entrasteis solo a mirar, y a los mirones se les echa antes de que se toquen.', // ROCKSTAR
  'fuera del grupo. Las normas no eran opcionales, y os las habéis saltado.',
  'os vais por no cumplir las reglas. Sin segunda oportunidad: la primera ya la tirasteis.',
  'las reglas pedían poco y no habéis llegado ni a eso. Fuera.',
  'fuera. No cumplís en el grupo, como no cumplís en la cama, y nadie os va a echar de menos.', // ROCKSTAR
  'os vais. Las reglas no se negocian, y vosotros no teníais nada con qué negociar.',
  'largo de aquí. Las reglas eran fáciles, como los preliminares, y os las habéis saltado.', // ROCKSTAR
  'se acabó vuestro sitio aquí. Las reglas mandan, y ese sitio va para gente que sepa leer.',
  'se os echa. Las reglas se cumplen o se sale, y vosotros salís tan rápido como acabáis.', // ROCKSTAR
];

module.exports = {
  OBJETIVO_DIA_CARTEL,
  VER_UNA_VEZ, PURGE_UNO, PURGE_VARIOS,
  cabeceraDe,
  MAL_ESCRITO, SOLO_GRUPOS, SIN_PERMISO, SIN_PERMISO_ADMIN, SOLO_ADMINS, PURGA_ADMIN, SIN_ACCESO, A_TI_MISMO, AL_BOT, AL_BOT_MENCION, CONTRA_UN_ADMIN, DUELO_AJENO };
