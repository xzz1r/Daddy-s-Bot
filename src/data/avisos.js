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
  'De grupo. Aquí el mensaje se te queda en el cajón.',
  'Aquí no. Eso se hace donde hay gente.',
  'Solo en grupos. Aquí no se mueve nada.',
  'En privado no hay mesa. Eso se sienta en el grupo.',
  'Eso pide público. Aquí no lo hay.',
  'Grupo. Aquí no tiene contra quién funcionar.',
  'Eso es del grupo. Este hilo no tiene ni una silla.',
  'Aquí no pasa nada. Pruébalo en el grupo.',
  'Aquí no. Eso necesita testigos.',
  'En el grupo. Este chat no tiene marcador.',
  'A solas el botón no hace clic. En el grupo suena.',
  'De grupo. Aquí no hay nada que mover.',
  'Aquí no sirve. Prueba donde se lee.',
  'Eso es para el grupo, no para esta ventana.',
  'En privado no hay partida. Sal al grupo.',
  'Aquí no hay contra quién. En el grupo sí.',
  'Este sitio no te hace grupo. Aquí no se forma corro.',
  'Aquí no se juega. Al grupo.',
  'Eso pide gente delante. Aquí no la hay.',
  'En el grupo hay orejas. Aquí la pantalla se queda a oscuras.',
  'Este chat traga el mensaje. En el grupo se queda a la vista.',
  'De grupo, y esto es un pasillo.',
  'Aquí no se mueve el marcador, llévalo al grupo.',
  'Eso necesita público. El grupo lo tiene, esto no.',
  'En el grupo. Aquí no hay nada en juego.',
  'Aquí el comando no cruza la puerta. El grupo está al otro lado.',
  'Esto es de grupo. El aviso cabe en un sobre cerrado.',
  'Sácalo al grupo. Aquí no hay pared donde pegarlo.',
];

// LO MISMO UN ESCALON MAS ARRIBA: salta cuando un miembro toca algo del tier de
// owner. La cabecera dice "Solo admins superiores" y no "solo el dueño", que es
// como lo llama el menu: nombrar a un dueño en un aviso que lee todo el grupo
// es señalar a una persona, y eso no lo hace el bot en ningun sitio.
const SIN_PERMISO = [
  'Ese permiso no te cabe en el bolsillo, cobarde. La mano entra y sale vacía.',
  'Eso es del que paga la fiesta. Tú solo la limpias, comemierda.',
  'Ese permiso lo tiene quien decide. Tú ni decides qué desayunas.',
  'Te falta rango y te sobra hocico. Mala combinación, indeseable.',
  'Eso se lo dejan a admins serios. Tú eres el chiste del grupo.',
  'Eso separa a los admins de verdad de las ratas como tú.',
  'Eso lo mueven los de arriba. Tú aquí obedeces, y ni eso bien.',
  'Ese botón no te conoce. Lo rozas y se queda frío.',
  'Has intentado colarte delante de todos, qué ridículo.',
  'No, gilipoyas. Eso está muy por encima de ti y no vas a subir ni un escalón.',
  'Gente de fiar guarda ese permiso. Tú llegas con la mano escondida y no abre.',
  'Pides un dedo y ya vas a por el brazo, qué poca vergüenza.',
  'Ni con dos copas encima te dejarían tocar eso, sinvergüenza.',
  'Te crees arriba, gilipoyas, y el grupo te ve en el felpudo. El permiso no baja.',
  'Nadie te fía ni el cambio, sinvergüenza. El permiso sigue en el cajón, con la llave.',
  'Hay quien manda por encima de ti, escoria. Hablas y el grupo no aparta la vista de ellos.',
];

// El mismo aviso cuando quien lo toca SÍ es admin. Estas le echan en cara el
// rango que tiene y que no le alcanza; a un miembro sin rango le estarían
// llamando admin delante de todos, que es mentira. Quien llama elige el pool
// mirando al que escribe (avisoPermiso en helpers).
const SIN_PERMISO_ADMIN = [
  'La placa te cuelga, imbécil, y esta puerta no se entera. Llamas y suena el cerrojo.',
  'Tienes rango de los inútiles, y eso está dos escalones por encima.',
  'El cargo te baila, incompetente de mierda. Arriba el botón ni te huele.',
  'Te colgaron la placa, mediocre, y ya das órdenes al techo. Arriba ni levantan la vista.',
  'Con el cargo nuevo vas a la mesa de arriba, miserable, y no te hace sitio.',
  'Tienes rango en el perfil y las manos muertas, inútil. El papel de esto ni se acerca.',
  'Farsante con placa de admin. Se te ha visto intentarlo y se te ha calado.',
  'Creías que el cargo abría todo cajón, despreciable, y te devuelve la mano vacía.',
  'Llevas el rango como quien lleva un disfraz prestado, y se te nota la etiqueta.',
  'Te brilla la placa, cabrón, y este botón sigue apagado. Lo tocas y no hay clic.',
  'El rango te llega a la hebilla, gilipoyas. El botón queda por encima de tu mano.',
  'Esto se te entrega en la mano, escoria. La tuya vuelve vacía y la placa no lo tapa.',
  'Ni siendo admin, rata. Hay alturas que no vas a pisar nunca.',
  'Eres admin de la última fila, y aún te queda gente delante.',
  'Lameculos con rango, lameculos igual. Esto no se te da.',
  'Ser admin no te quita lo escoria. Y esto sigue sin ser para ti.',
  'Te dieron el admin de rebote, comemierda. Apoyas la placa en este botón y no entra.',
  'Tu cargo calla a los de abajo, impresentable. El mando de esto no te lo pasan a la mano.',
  'Eres admin de guardería, no de mando. Asúmelo, sinvergüenza.',
  'Decidiendo cosas de mayores con un rango de mierda. Siéntate.',
  'Tu rango no te convierte en alguien, solo te da botones. Y ni esos sabes usar.',
  'Ni con el cargo puesto dejas de chupar del grupo. Esto no es para ti.',
  'Eres admin de recados. Esto está por encima de ti, y de tus recados.',
  'Sigues en la misma silla de mierda que antes de la placa. El mando de esto no te cabe.',
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
  'Al admin se le elige por algo. A ti nadie te elegiría ni para hacer bulto.',
  'Ese botón es de admins, no de basura como tú. Vuelve a lo tuyo.',
  '¿Tú admin? Antes le doy el rango a una rata.',
  'Te tienen por no armar ruido, imbécil. El rango de admin no cae en esa silla.',
  'Farsante de mierda. Te has visto dando una orden sin ser nadie.',
  'Tu único cargo aquí es el de chupapoyas oficial, y ese sí te lo ganaste.',
  'Sin rango, despreciable, y con la mano ya en el botón de admin. El botón no baja.',
  'Canalla, no eres admin. El día que te hagan admin, me borro del grupo.',
  'No eres admin, gilipoyas. Das la orden y el botón ni se inmuta.',
  'Qué ridículo. Has dado una orden de admin sin ser admin ni parecerlo.',
  'El bot te ha mirado el rango y ha decidido que no vales nada.',
  'Eso pide placa de admin, gilipoyas. Tú llegas con la mano vacía y no abre.',
  'El mando está en otra mesa, mediocre. Tú hablas hacia allá y no tienes rango.',
  'Nadie te ha hecho admin. Han tenido todo el tiempo del mundo y nadie ha querido.',
  'El bot no ha fallado, escoria. Te ha visto sin placa y el botón ni ha parpadeado.',
  'Los admins lo usan sin pensar. Tú lo has intentado y ahora lo sabe el grupo.',
  'Para esto hace falta rango, y a ti no te lo han dado ni por lástima.',
  'Sin rango no se toca, bocazas. Y rango, lo que se dice rango, tú no tienes.',
  'Aquí mandan los que tienen la corona. Tú tienes ganas de mandar y poco más.',
  'Has pulsado un botón que no es tuyo delante de todos. Más cerca no vas a estar.',
  'Te has creído admin durante un segundo. El grupo ha visto el segundo entero.',
  'No tienes rango, mindundi. Tienes un teclado y la cara de intentarlo.',
  'Lo has intentado delante de todos. Ahora ya se sabe a quién no darle el rango.',
  'Eso es de quien tiene el cargo. Tú tienes sitio en la lista de miembros, y gracias.',
  'Rango cero. Y eso no sube escribiendo más fuerte.',
  'Por insistir no te cae la placa, plasta. El botón sigue mudo después del intento.',
  'Lo has probado por si el bot se despistaba. No se despista.',
  'Esa placa no está en tu nombre. La llevan otros, y el botón no es el tuyo.',
  'Los admins tienen un botón que tú solo ves de lejos. Como ahora.',
  'Eso pide galones, y tú no tienes ni la gorra.',
  'Querías el mando sin placa. La orden se te atasca en la boca y el botón ni se entera.',
  'Miembro raso intentando el mando. La placa no te cae y sigue en otras solapas.',
  'No te han hecho admin, y el botón que no te funciona lo confirma.',
  'Mira la lista de admins. Tu nombre no está, y no está por algo.',
  'Rango no tienes, cutre. Tienes prisa, y la prisa no cose una placa.',
  'Se te ve el cuello sin chapa, pelele. Pulsas y el botón de admin sigue en su sitio.',
  'Con ganas no se enciende ese botón, pringado. Hace falta placa, y la tuya no está.',
  'Te han dado permiso para escribir, y ya es bastante.',
  'El botón te ha visto venir. Sin rango no hace nada, por mucha cara que le eches.',
  'Sin corona, lameculos. Y tú esto no lo arreglas pidiéndolo.',
];

// Se ha puesto a si mismo de objetivo. Se lee en el grupo.
const A_TI_MISMO = [
  'Eso es contra otra cara, gilipoyas. Te señalas y el comando no sale.',
  'No puedes, imbécil. Buscas un enemigo y el nombre vuelve a ti, sin nadie en medio.',
  'Contra ti no. Te has puesto de blanco y el comando ha mirado para otro lado.',
  'A ti no. Métete con alguien que te conteste.',
  'Elige a otro. Si es que se te ocurre alguien.',
  'No. Eso se hace con dos, y tú has traído uno.',
  'No. Ni el bot quiere ver eso.',
  'Contra ti no. Busca a alguien, que en el grupo hay de sobra.',
  'Te has puesto de objetivo. La diana lleva tu cara y falta el otro nombre para que salga.',
  'No se puede. Ni para eso te bastas.',
  'Tú contra ti. Hasta el bot sabe quién pierde.',
  'Contigo no hay a quién, escoria. Te plantas delante y el comando se queda sin blanco.',
  'No. Si tanto te odias, díselo a un psicólogo, no al bot.',
  'Eso va contra otra persona. Deja de mirarte el ombligo.',
  'Autolesión por comando. Aquí no.',
  'No te lo vas a hacer a ti. Ni aunque te lo merezcas.',
  'No, no puedes, torpe. Doblas el comando contra ti y el gesto se queda en el aire.',
  'Contigo no se juega. Ya bastante juegas contigo en todo lo demás.',
  'Te pones de blanco tú solo. El comando te mira y pasa de largo.',
  'A ti no. Esto se le hace a otra persona, no al espejo.',
  'Misma cara de víctima y de verdugo. El comando te ve en una sola silla y no arranca.',
  'No se puede. Y el grupo acaba de ver que lo has intentado.',
  'En ti no cae, comemierda. Te pones en el sitio del otro y el comando se queda colgado.',
  'Esto pide otra cara. Te pones tú en el sitio y el comando no sale.',
  'Has apuntado a tu propio nombre. Buena puntería para lo inútil.',
  'No. Contigo no hay bando enfrente. La frase se queda con un nombre y la mano quieta.',
  'Te lo quieres hacer a ti. Normal: eres el único objetivo que no te dice que no.',
  'Tu nombre ocupa el hueco del otro. El comando llega ahí, ve uno solo y se apaga.',
  'Lo cargas contra ti, pringado. Se ve un nombre solo, repetido, y el botón muerto.',
  'No. Y no insistas, que se nota que te sobra tiempo.',
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
  'Ni señalar te sale, subnormal. Has mencionado al bot.',
  'Responder al mensaje equivocado es lo único que se te da bien.',
  'A mí no, cabeza hueca. Menciona a quien querías, si te acuerdas de quién era.',
  'De todos los mensajes del chat, has respondido al del bot. Talento.',
  'Ni para señalar sirves. Has apuntado al bot, gilipoyas.',
  'Con esa puntería no le das ni a la tecla de borrar.',
  'El bot no se roba ni se insulta. Has clavado la mención en su burbuja, cabeza hueca.',
  'Has respondido al bot. Ni leer quién escribe sabes.',
  'Mencionar a alguien es lo más fácil del grupo y a ti se te ha atragantado.',
  'Me has mencionado a mí. A ver si miras a quién le das.',
];

// El objetivo es un admin y quien lo intenta no llega. Se lee en el grupo, y
// delante del propio admin, que es la mitad de la gracia.
const CONTRA_UN_ADMIN = [
  'A un admin no. Elige a alguien que no pueda devolvértela.',
  'Contra un admin no, gilipoyas. El mute le cae en la solapa y se te escurre al suelo.',
  'No. Ahí pierdes tú, y ni por escrito te sale.',
  'A un admin no se le cierra la boca, cabrón. Pulsas el mute y se sigue oyendo el tecleo.',
  'A un admin no. Eso lo sabías y lo has intentado igual.',
  'Ni delante del grupo le callas, imbécil. El mute se te muere en la placa.',
  'Es admin, escoria. Desde tu silla el mute no le llega ni a la manga.',
  'Entre admins ese mute no lo firmas tú, comemierda. Falta la mano de arriba.',
  'Los dos sois admins. El botón no sabe a cuál hacerle caso, así que a ninguno.',
  'Un admin muteando a otro. El grupo ya tenía palomitas y se ha quedado con las ganas.',
  'Callar a otro admin no te sale, sinvergüenza. Pulsas y el otro sigue escribiendo.',
  'Mismo rango, mismo botón, cero efecto. Busca a alguien sin corona.',
  'Este mute no calla a admins. Ni a esa persona ni a ti.',
  'Pelea de admins por el mute. Nadie gana, y el grupo se lo pasa en grande.',
  'Mutear a otro admin no se puede, y ahora lo sabe todo el que lo ha visto.',
  'Las dos placas pesan lo mismo, gilipoyas. El mute no elige boca y se queda sin uso.',
  'Eso lo puede el dueño, rata. Tu placa no alarga el mute ni un mensaje.',
  'A otro admin el mute no le entra, impresentable. Pulsas y en su chat no pasa nada.',
  'El bot no te sella un mute entre placas, lameculos. Seguís con el teclado caliente.',
  'Un admin no le apaga el teclado a otro, farsante. Das al mute y te sigue el ruido.',
  'Tiene el mismo botón que tú, y entre iguales el botón no funciona.',
  'Placa contra placa, desgraciado. El mute te choca en medio y no le tapa la boca a nadie.',
  'A un admin no se le mutea desde abajo, y tampoco desde al lado.',
  'Ese mute rebota. Entre admins no entra.',
  'Estáis a la misma altura, mediocre. El mute se queda en la mesa, entre los dos.',
  'Le has tirado el mute a otro admin, canalla. Vuelve entero y su boca no se ha cerrado.',
  'Intento de golpe de estado entre admins. Fracasado.',
  'Tu placa frena donde empieza la suya, despreciable. El mute no da el paso que falta.',
  'Un admin contra otro. El grupo mira, y tú te quedas sin mute.',
  'El mute entre admins no sale, cobarde. Te quedas en el botón y la boca del otro sigue.',
];

// Se ha metido en un duelo de otros dos. Se lee en el grupo.
const DUELO_AJENO = [
  'A ti no te han llamado. Aparta.',
  'No es tu pelea. Métete en la tuya, si consigues una.',
  'A ti nadie te ha retado, gilipoyas. Al borde del duelo, con la mano metida de más.',
  'Ese no es tu duelo. Ni de lejos.',
  'No lleva tu nombre ese duelo. Te cuelas, entrometido, y ni el golpe se gira a mirarte.',
  'Ese duelo es de otros dos. Tú a mirar.',
  'No te toca. Consíguete un enemigo propio.',
  'Ese duelo tiene dos nombres y ninguno es el tuyo.',
  'No te han invitado. Aparta.',
  'Este duelo no es tuyo. Tú, fuera de en medio.',
  'Ese lo pelean ellos. Tú lo cuentas después.',
  'No te guarda sitio este duelo, lameculos. Te asomas y no hay silla con tu nombre.',
  'Apártate, que ese duelo es de otros dos y tú solo estorbas.',
  'Ese reto no te lo han puesto a ti, pringado. Aceptas con la mano y el duelo ni se entera.',
  'Nadie ha dicho tu nombre en ese duelo. Por algo será.',
  'Te cuelas en duelos ajenos. Búscate el tuyo.',
  'Ese duelo tiene dueño, y no eres ninguno de los dos.',
  'Espectador, ridículo, con el culo fuera de la silla. El duelo no te ha hecho hueco.',
  'No es tuyo. Siéntate y mira cómo pelean los que sí fueron retados.',
  'Te has metido en un duelo que no es tuyo. Fuera.',
  'Se resuelve sin tus manos, fisgón. Se quedan fuera, quietas, y tú también.',
  'Te cuelas en pelea ajena, cobarde. El cuerpo se te queda fuera del círculo, a la vista.',
  'No te toca, y encima se ha visto que lo intentabas.',
  'Ese duelo es entre dos. Tú haces tres, y sobras.',
  'Dos personas se van a pegar y tú quieres el sitio de una. No.',
  'Ese aura no es tuya, ni tu duelo. Las manos que pelean son otras, las tuyas sobran.',
  'Colarte no te mete en la pelea, pesado. Te deja en el medio y el duelo te pasa de largo.',
  'Deja pelear a quien tiene con quién. Este duelo no es tuyo.',
  'Coges un reto que nadie te ha puesto. La mano se cierra en vacío y el duelo ni frena.',
  'Llegas a un duelo ajeno sin que nadie te espere.',
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
  'Has encadenado expulsiones sin pensar, sin permiso y sin cabeza. Te quedas sin rango.',
  'Has usado el admin para una pataleta. Pues ya no eres admin.',
  'Te has emocionado sacando gente y el bot te ha sacado a ti del cargo.',
  'O te robaron la cuenta o eres así de imbécil. Sin admin en los dos casos.',
  'Ibas echando gente a manotazos. Te arrancan la placa y te quedas sin rango.',
  'Creíste que echar era el cargo entero. La placa en el suelo ya no te responde.',
  'Esto no se te arregla con un aviso. Se arregla quitándote el botón.',
  'Te has creído dios con el botón de expulsar. Ya no lo tienes, gilipoyas.',
  'Le has cogido gusto a echar gente, y el juguete se te ha acabado.',
  'Querías vaciar el grupo y has vaciado tu cargo.',
  'Echar gente sin parar tiene un precio, y es el rango que acabas de perder.',
  'Ibas echando gente sin parar. El bot ha contado, y ha parado contigo.',
  'Te dieron el rango para cuidar el grupo y lo has usado para despoblarlo. Rango fuera.',
  'Ahora eres miembro, como los que acabas de echar. Solo que tú sigues dentro.',
  'Echar gente en masa te ha salido caro: el rango, y la cara delante de los que quedan.',
  'Con tanto echar, se te ha olvidado que a ti también te pueden quitar cosas.',
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
  'Ahí arriba hay serrín, hostia. El comando pide cabeza y tú has puesto un cajón vacío.',
  'Ni teclearlo bien, y eso no se arregla. Naciste así y así te vas.',
  'Lo tuyo no lo arregla el autocorrector: corrige letras, no cretinos.',
  'No te ha fallado el móvil. Te ha fallado la cabeza y esa no tiene repuesto.',
  'Lo tuyo no se arregla mirando el teclado. Tu fallo está más arriba.',
  'Dentro de esa frente no tienes ni un puto tornillo. Tecleas y suena a hueco.',
  'Una puta palabra mal escrita y ya sabe el grupo hasta dónde das. Nada.',
  'Escribes y tu fondo es un charco. Ni cubre el zapato: ahí se acaba lo que razonas.',
  'Escribes como piensas: a trozos, mal y sin llegar a ningún sitio.',
  'Analfabetismo con wifi. Ni escribir te sale.',
  'Una orden de una palabra y te ha ganado. Ahí está el techo de esa cabeza.',
  'Esa cabeza tiene el techo tan bajo que escribir un comando ya le roza.',
  'Mal escrito, y era una palabra corta. Esa cabeza con las largas ni lo intenta.',
  'Hasta un crío lo escribe bien a la primera. Tú no llegas a ese nivel.',
  'De esa cabeza te salen migas, comemierda. Una palabra cerrada no cabe en ese puñado.',
  'Mira que lo has roto con poco. Hace falta una sesera muy vacía para eso.',
  'Lo fácil ya es extranjero para esa mollera. Tecleas y se te tuerce el gesto.',
  'Por teclear así, el grupo ya sabe cuánto da de sí tu cabeza.',
  'Nadie te metía prisa y ya estabas en tu tope. Escribes y la mente en blanco.',
  'Se te cala el motor al escribir. Ahí se acaba lo que esa cabeza sabe hacer.',
  'Tus neuronas escriben así en su mejor día, y hoy era su mejor día.',
  'Por ese hueco no te entra un acierto. La mano abierta, y la cabeza no está.',
  'Ha quedado hecho un cristo, y es lo mejor que esa mollera sabe hacer con un teclado.',
  'Has escrito y dentro no responde nadie. Frente lisa: ahí está tu tope.',
  'A tu cabeza una palabra le hace sudar. La escribes y el nudillo se pone blanco.',
  'Has fallado donde no falla nadie. Ese es tu listón, y está en el suelo.',
  'Cada letra mal puesta es una neurona ausente, y esa cabeza no tiene suplentes.',
  'Imbécil del todo, y sin margen de mejora: lo más simple del mundo te sale roto.',
  'Pensar no te vino puesto. Escribes y se te muere en la segunda letra. Ahí está tu tope.',
  'Ni teclear sabes sin romper algo, idiota.',
  'Tecleas recto al vacío, cabrón. La ceja quieta, y ese es tu límite.',
  'Lo has destrozado sin despeinarte. Talento para romper cosas, cero para pensar.',
  'Te ha salido algo que no es ningún idioma. Tu cabeza habla uno que no entiende nadie.',
  'Un comando entero ya es la cima de ese cerebro. Te quedas a media cuesta.',
  'Lo has escrito como quien firma con la mano mala, y resulta que no tienes otra.',
  'Se te ve el cascarón al trasluz. Escribes y sale aire: mollera vacía, escoria.',
  'Hay poca cosa ahí arriba. Escribes y la frente no llega: tu tope, a la vista.',
  'Persiana bajada detrás de los ojos. Esa cabeza no te enciende ni al escribir.',
  'Esto es el máximo de esa mente. Lo escribes y se te ve el tope, sin otro piso.',
  'Escribiste con el dedo y pensaste con el codo, que es con lo que piensas siempre.',
  'Menos cerebro del que pide esto. Lo tecleas, te sale torcido, y ni se te mueve la ceja.',
  'Al escribir se te cae la idea entre la tecla y el punto. Para otra, esa mollera no da.',
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
  'Ese comando no te abre la puerta.',
  'No lo puedes usar, ese comando.',
  'Para ti, ese comando no responde.',
  'El comando te niega la entrada.',
  'No tienes ese comando en la mano.',
  'Pasa de ti: ese comando no entra.',
  'Sin acceso: ese comando te niega.',
  'El comando te lo tienen prohibido.',
  'Y el comando se te queda quieto.',
  'Ese comando no te corresponde.',
  'Te falta el acceso a ese comando.',
  'A ese comando no llegas tú.',
  'No está en tu sitio, ese comando.',
  'Cerrado: ese comando no te abre.',
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
  'Ha salido %V en el sorteo. Ese nombre queda clavado en el día, sin otro al lado.',
  '%V va a tener un día largo. El cartel es suyo hasta mañana.',
  'Se abre el día con %V en la diana. Que corra la voz.',
  'Hoy el papel solo dice %V. Lo ha escrito el sorteo, y no cabe otra línea.',
  '%V es la papeleta que ha caído. El sorteo la ha dejado sobre la mesa del día.',
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
  'Borrado. Nadie te quiere en su galería.',
  'Borrado. Tu mierda no se queda en la galería de nadie.',
  'Borrado. Guárdate tus fotos donde te quepan.',
  'Borrado. Lo quitas y te quedas señalando un hueco.',
  'Borrado. ¿Tanto te cuesta darle al puto 1?',
  'Borrado. Lo tuyo dura aquí lo que tardo en quitarlo.',
  'Borrado. Ni regalado se queda en la galería de nadie, imbécil.',
  'Borrado. La foto se cierra sola y te deja mirando el hueco.',
  'Borrado. Mandas basura y encima a la vista de todos, subnormal.',
];

// !purge: el aviso que sale delante de los que se van a echar, justo antes del
// kick. Va detras de las menciones, por eso empieza en minuscula. El motivo es
// el que da el dueño al purgar —no cumplir las reglas— y no se inventa otro:
// el bot no sabe cual de ellas se ha saltado cada uno. Uno en singular y
// varios en vosotros, como el resto del bot. En baraja.
const PURGE_UNO = [
  'fuera. No has cumplido las reglas, y tu silla ya está recogida contra la pared.',
  'a la calle. Aquí se entra cumpliendo las reglas, y tú entraste a mirar.',
  'fuera del grupo. Las normas no eran opcionales y te las has saltado.',
  'te vas por no cumplir las putas reglas. El chat sigue y tú te quedas fuera.',
  'las reglas no las has cumplido, gilipoyas. Te vas y la puerta te da en la espalda.',
  'fuera. No cumples lo que pide el grupo, y el grupo no te va a echar de menos.',
  'ya no estás. Las reglas siguen en su sitio y a ti te han soltado, sin despedida.',
  'sin sitio. No has cumplido las reglas, y la luz del grupo se te apaga a la espalda.',
  'se acabó tu sitio aquí. No has cumplido las reglas, y el nombre sale tachado de la lista.',
  'se te echa. No has cumplido las reglas, y detrás queda el grupo hablando sin ti.',
];

const PURGE_VARIOS = [
  'fuera. No habéis cumplido las reglas, y las sillas ya están contra la pared.',
  'a la calle. Aquí se entra cumpliendo las reglas, y vosotros entrasteis a mirar.',
  'fuera del grupo. Las normas no eran opcionales, y os las habéis saltado.',
  'os vais por no cumplir las putas reglas. El chat sigue y vosotros os quedáis fuera.',
  'las reglas no las habéis cumplido, gilipoyez. Os vais y la puerta os da en la espalda.',
  'fuera. No cumplís lo que pide el grupo, y el grupo no os va a echar de menos.',
  'ya no estáis. Las reglas siguen en su sitio y a vosotros os han soltado, sin despedida.',
  'sin sitio. No habéis cumplido las reglas, y la luz del grupo se os apaga a la espalda.',
  'se acabó vuestro sitio. No habéis cumplido las reglas y los nombres salen tachados.',
  'se os echa. No habéis cumplido las reglas, y detrás queda el grupo hablando sin vosotros.',
];

module.exports = {
  OBJETIVO_DIA_CARTEL,
  VER_UNA_VEZ, PURGE_UNO, PURGE_VARIOS,
  cabeceraDe,
  MAL_ESCRITO, SOLO_GRUPOS, SIN_PERMISO, SIN_PERMISO_ADMIN, SOLO_ADMINS, PURGA_ADMIN, SIN_ACCESO, A_TI_MISMO, AL_BOT, CONTRA_UN_ADMIN, DUELO_AJENO };
