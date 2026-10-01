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
  'De grupo. Este chat no cuenta para nada.',
  'Aquí no. Eso se hace donde hay gente.',
  'Solo en grupos. Aquí no se mueve nada.',
  'En privado no hace nada. Llévalo al grupo.',
  'Eso pide público. Aquí no lo hay.',
  'Grupo. Aquí no tiene contra quién funcionar.',
  'De grupo, y este no lo es.',
  'Aquí no pasa nada. Pruébalo en el grupo.',
  'Aquí no. Eso necesita testigos.',
  'En el grupo. Este chat no tiene marcador.',
  'Eso no funciona a solas. Llévalo al grupo.',
  'De grupo. Aquí no hay nada que mover.',
  'Aquí no sirve. Prueba donde se lee.',
  'Eso es para el grupo, no para esta ventana.',
  'En privado no hay partida. Sal al grupo.',
  'Aquí no hay contra quién. En el grupo sí.',
  'De grupo. Este sitio no cuenta.',
  'Aquí no se juega. Al grupo.',
  'Eso pide gente delante. Aquí no la hay.',
  'En el grupo funciona. Aquí no.',
  'Este chat no computa. Llévalo al grupo.',
  'De grupo, y esto es un pasillo.',
  'Aquí no se mueve el marcador. Al grupo.',
  'Eso necesita público. El grupo lo tiene, esto no.',
  'En el grupo. Aquí no hay nada en juego.',
  'Aquí no pasa. En el grupo, sí.',
  'De grupo. Esto es otro sitio.',
  'Aquí no tiene sentido. Sácalo al grupo.',
];

// LO MISMO UN ESCALON MAS ARRIBA: salta cuando un miembro toca algo del tier de
// owner. La cabecera dice "Solo admins superiores" y no "solo el dueño", que es
// como lo llama el menu: nombrar a un dueño en un aviso que lee todo el grupo
// es señalar a una persona, y eso no lo hace el bot en ningun sitio.
const SIN_PERMISO = [
  'Eso es de otro nivel, cobarde. Tú ni preguntando llegas.',
  'Eso es del que paga la fiesta. Tú solo la limpias, comemierda.',
  'Ese permiso lo tiene quien decide. Tú ni decides qué desayunas.',
  'Te falta rango y te sobra hocico. Mala combinación, indeseable.',
  'Eso se lo dejan a admins serios. Tú eres el chiste del grupo.',
  'Eso separa a los admins de verdad de las ratas como tú.',
  'Eso lo mueven los de arriba. Tú aquí obedeces, y ni eso bien.',
  'Eso no lo tocas ni con permiso ni con ganas, imbécil.',
  'Has intentado colarte delante de todos. Qué ridículo, como siempre.',
  'No, gilipoyas. Eso está muy por encima de ti y no vas a subir ni un escalón.',
  'Ese permiso es para gente de fiar, y de ti no se fía nadie.',
  'Te dieron un dedo y ya vas a por el brazo. Qué poca vergüenza.',
  'Ni con dos copas encima te dejarían tocar eso, sinvergüenza.',
  'Te crees arriba porque hay gente abajo. Sigues sin ser nadie.',
  'No tienes ese permiso porque nadie se fía de la gente como tú.',
  'Hay gente por encima de ti, y el grupo entero sabe por qué.',
];

// El mismo aviso cuando quien lo toca SÍ es admin. Estas le echan en cara el
// rango que tiene y que no le alcanza; a un miembro sin rango le estarían
// llamando admin delante de todos, que es mentira. Quien llama elige el pool
// mirando al que escribe (avisoPermiso en helpers).
const SIN_PERMISO_ADMIN = [
  'Ser admin no te hace importante, imbécil. Te hace útil, y ni eso cumples.',
  'Tienes rango de los inútiles, y eso está dos escalones por encima.',
  'El cargo te quedó grande el primer día, incompetente de mierda.',
  'Te hicieron admin porque hacía falta relleno. No te confundas, mediocre.',
  'Miserable. Te hacen admin y ya te crees con derecho a todo.',
  'Tienes rango y aun así no eres nadie. Eso tiene mérito, idiota.',
  'Farsante con placa de admin. Se te ha visto intentarlo y se te ha calado.',
  'Despreciable. Te hacen admin y lo primero que haces es abusar.',
  'Llevas el rango como quien lleva un disfraz prestado, y se te nota la etiqueta.',
  'Eres admin de adorno, cabrón. Esto lo tocan los de arriba.',
  'Te dieron el rango por pena y ya te ves con mando, gilipoyas.',
  'Ser admin no te da esto, escoria. Esto se da, y a ti no te lo dan.',
  'Ni siendo admin, rata. Hay alturas que no vas a pisar nunca.',
  'Eres admin de la última fila, y aún te queda gente delante.',
  'Lameculos con rango, lameculos igual. Esto no se te da.',
  'Ser admin no te quita lo escoria. Y esto sigue sin ser para ti.',
  'Eres admin de milagro, comemierda. No estires más la suerte.',
  'Tu cargo sirve para callar a otros, no para mandar, impresentable.',
  'Eres admin de guardería, no de mando. Asúmelo, sinvergüenza.',
  'Decidiendo cosas de mayores con un rango de mierda. Siéntate.',
  'Tu rango no te convierte en alguien, solo te da botones. Y ni esos sabes usar.',
  'Ni con el cargo puesto dejas de chupar del grupo. Esto no es para ti.',
  'Eres admin de recados. Esto está por encima de ti, y de tus recados.',
  'Eres admin y sigues dando la misma pena que antes del rango.',
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
  '¿Tú admin? Antes le doy el rango a una rata, miserable.',
  'El grupo te soporta, no te respeta. Por eso no eres admin, imbécil.',
  'Farsante de mierda. Te has visto dando una orden sin ser nadie.',
  'Tu único cargo aquí es el de chupapoyas oficial, y ese sí te lo ganaste.',
  'Despreciable y sin rango. Lo segundo tiene arreglo, lo primero no.',
  'Canalla, no eres admin. El día que te hagan admin, me borro del grupo.',
  'No eres admin, gilipoyas. Y con lo que eres no te van a hacer admin nunca.',
  'Qué ridículo. Has dado una orden de admin sin ser admin ni parecerlo.',
  'El bot te ha mirado el rango y ha decidido que no vales nada.',
  'Zoquete, eso pide ser admin. Tú traes ganas, y aquí eso no vale nada.',
  'Vil, mediocre y sin rango. Tres de tres.',
  'Nadie te ha hecho admin. Han tenido todo el tiempo del mundo y nadie ha querido.',
  'El bot no ha fallado. Te ha reconocido, y por eso no hace nada.',
  'Los admins lo usan sin pensar. Tú lo has intentado y ahora lo sabe el grupo.',
  'Para esto hace falta rango, y a ti no te lo han dado ni por lástima.',
  'Sin rango no se toca, bocazas. Y rango, lo que se dice rango, tú no tienes.',
  'Aquí mandan los que tienen la corona. Tú tienes el móvil y ganas de mandar.',
  'Has pulsado un botón que no es tuyo delante de todos. Más cerca no vas a estar.',
  'Te has creído admin durante un segundo. El grupo ha visto el segundo entero.',
  'No tienes rango, mindundi. Tienes un teclado y la cara de intentarlo.',
  'Los admins te han visto intentarlo. Ahora ya saben a quién no darle el rango.',
  'Eso es de quien tiene el cargo. Tú tienes sitio en la lista de miembros, y gracias.',
  'Rango cero. Y eso no sube escribiendo más fuerte, piltrafa.',
  'Si el rango se diera por insistir, ya lo tendrías. No se da así, plasta.',
  'Lo sabías y lo has probado igual, por si el bot se despistaba. No se despista.',
  'El rango se gana, y tú aquí no has ganado ni una discusión.',
  'Los admins tienen un botón que tú solo ves de lejos. Como ahora.',
  'Eso pide galones, y tú no tienes ni la gorra.',
  'Querías mandar sin rango. En este grupo eso tiene nombre, y no es bonito.',
  'Miembro raso intentando mandar. El grupo ya sabe cuál es tu sitio, y no es ese.',
  'No te han votado y no te van a votar. Eso dice el botón que no te funciona.',
  'Mira la lista de admins. Tu nombre no está, y no está por algo.',
  'Rango no tienes, cutre. Lo que tienes es prisa por tenerlo.',
  'A los admins se les nota el rango. A ti se te nota que no lo tienes, pelele.',
  'Con ganas no llega. Llega con rango, y el tuyo es de miembro raso.',
  'Te han dado permiso para escribir, y ya es bastante.',
  'El botón te ha visto venir. Rango de miembro, cara de admin, resultado cero.',
  'Sin corona, lameculos. Por mucho que pelotees a los admins, no te la dan.',
];

// Se ha puesto a si mismo de objetivo. Se lee en el grupo.
const A_TI_MISMO = [
  'Eso es contra otro. Que alguien te caiga mal, no puede ser tan difícil.',
  'No puedes. Y si no encuentras a nadie más, ese es otro problema.',
  'No puedes. Y que lo hayas intentado ya dice bastante.',
  'A ti no. Métete con alguien que te conteste.',
  'Elige a otro. Si es que se te ocurre alguien.',
  'No. Eso se hace con dos, y tú has traído uno.',
  'No. Ni el bot quiere ver eso.',
  'Contra ti no. Busca a alguien, que en el grupo hay de sobra.',
  'Ponerte de objetivo es lo más triste que se ha visto hoy aquí.',
  'No se puede. Ni para eso te bastas.',
  'Tú contra ti. Hasta el bot sabe quién pierde.',
  'Elige a otra persona. A ti ya te conoces, y no das para más.',
  'No. Si tanto te odias, díselo a un psicólogo, no al bot.',
  'Eso va contra otra persona. Deja de mirarte el ombligo.',
  'Autolesión por comando. Aquí no, cabrón.',
  'No te lo vas a hacer a ti. Ni aunque te lo merezcas.',
  'No, no puedes. Hay que ser muy torpe para intentarlo siquiera.',
  'Contigo no se juega. Ya bastante juegas contigo en todo lo demás.',
  'Ni aburriéndote tanto. Elige a alguien de verdad.',
  'A ti no. Esto se le hace a otra persona, no al espejo.',
  'Te has puesto de víctima y de verdugo. No cuela.',
  'No se puede. Y el grupo acaba de ver que lo has intentado.',
  'Un poco de amor propio, joder. Ni para esto lo tienes.',
  'Eso con otra persona. Contigo ya se sabe cómo acaba.',
  'Has apuntado a tu propio nombre. Buena puntería para lo inútil.',
  'No. Contigo no llega para dos bandos.',
  'Te lo quieres hacer a ti porque nadie más te lo acepta. Normal.',
  'Menciona a otra persona. Contigo no sale nada.',
  'Eso es para usarlo con otra persona. Contigo solo haces el ridículo.',
  'No. Y no insistas, que se nota que te sobra tiempo y te falta gente.',
];

// Alguien le ha lanzado al BOT un comando que va contra otra persona: casi
// siempre porque ha respondido a un mensaje del bot en vez de al de quien
// queria. Lo pidio el dueño: que el bot no se insulte ni se robe a si mismo,
// y que en vez de eso se le ataque la inteligencia al que no sabe mencionar.
// Van detras de su @. En baraja: salen las quince antes de repetir ninguna.
const AL_BOT = [
  'Joder, qué inútil. Dos toques para mencionar a alguien y la cagas en los dos.',
  'Esa mención no iba para mí, imbécil. Ni apuntar sabes y quieres jugar.',
  'Con esa puntería de mierda es normal que nadie te conteste. A mí no, anormal.',
  'Hostia, que no sabes ni responder al mensaje correcto. Y así vas por la vida.',
  'Querías a otra persona y me has mencionado a mí. Tu IQ entero en una sola cagada.',
  'Ni el dedo te obedece, subnormal. Has mencionado al bot y encima esperas algo.',
  'Responder al mensaje equivocado es lo único que se te da bien, inútil.',
  'A mí no, cabeza hueca. Menciona a quien querías, si te acuerdas de quién era.',
  'De todos los mensajes del chat, has respondido al del bot. Talento.',
  'Ni para señalar sirves. Has apuntado al bot, gilipoyas.',
  'Con esa puntería no le das ni a la tecla de borrar.',
  'El bot no se roba ni se insulta. Has apuntado a quien no era, y el ridículo es tuyo.',
  'Has respondido al bot. Ni leer quién escribe sabes.',
  'Mencionar a alguien es lo más fácil del grupo y a ti se te ha atragantado.',
  'Me has mencionado a mí. Hay gente despistada y luego estás tú, que no ves.',
];

// El objetivo es un admin y quien lo intenta no llega. Se lee en el grupo, y
// delante del propio admin, que es la mitad de la gracia.
const CONTRA_UN_ADMIN = [
  'A un admin no. Elige a alguien que no pueda devolvértela.',
  'Contra un admin no. Elige mejor a quién le tienes ganas.',
  'No. Ahí pierdes tú, y ni por escrito te sale.',
  'A un admin no se le entra. Se le aguanta.',
  'A un admin no. Eso lo sabías y lo has intentado igual.',
  'Contra un admin no. Ni con suerte ni con público.',
  'Es admin desde antes de que se te ocurriera.',
  'Entre admins no se mutea. Eso lo decide quien está por encima de los dos.',
  'Los dos sois admins. El botón no sabe a cuál hacerle caso, así que a ninguno.',
  'Un admin muteando a otro. El grupo ya tenía palomitas y se ha quedado con las ganas.',
  'Si quieres callar a otro admin, díselo al dueño, y con una razón mejor que las ganas.',
  'Mismo rango, mismo botón, cero efecto. Busca a alguien sin corona.',
  'Este mute no calla a admins. Ni a esa persona ni a ti.',
  'Pelea de admins por el mute. Nadie gana, y el grupo se lo pasa en grande.',
  'Mutear a otro admin no se puede, y ahora lo sabe todo el que lo ha visto.',
  'Su rango y el tuyo son el mismo. Aquí eso quiere decir que nadie manda sobre nadie.',
  'Con los admins solo puede el dueño. Tú eres admin, no dueño.',
  'Contra otro admin no hay mute. Toca aguantarse, como a todo el mundo.',
  'Entre admins el bot no hace de árbitro. Arreglad lo vuestro por privado.',
  'Los admins no se callan entre sí. Si os aguantáis poco, es problema vuestro.',
  'Tiene el mismo botón que tú, y entre iguales el botón no funciona.',
  'Querías usar el cargo contra otro cargo. El cargo no da para tanto.',
  'A un admin no se le mutea desde abajo, y tampoco desde al lado.',
  'Ese mute rebota. Entre admins no entra.',
  'Mismo escalón. Desde el mismo escalón no se empuja a nadie.',
  'Otro admin. El mute no pasa, y el cabreo te lo quedas tú.',
  'Intento de golpe de estado entre admins. Fracasado.',
  'Ahí no llega tu rango. Llega justo hasta donde el suyo, y se para.',
  'Un admin contra otro. El grupo mira, y tú te quedas sin mute.',
  'Muteo entre admins: denegado. La intención, en cambio, ha quedado a la vista.',
];

// Se ha metido en un duelo de otros dos. Se lee en el grupo.
const DUELO_AJENO = [
  'A ti no te han llamado. Aparta.',
  'No es tu pelea. Métete en la tuya, si consigues una.',
  'A ti nadie te retó. Párate a pensar por qué.',
  'Ese no es tu duelo. Ni de lejos.',
  'No va contigo, y colarte tampoco te lo va a ganar.',
  'Ese duelo es de otros dos. Tú a mirar, como siempre.',
  'No te toca. Consíguete un enemigo propio.',
  'Ese duelo tiene dos nombres y ninguno es el tuyo.',
  'No te han invitado. Como casi siempre.',
  'No es tu turno. Ni tu duelo. Ni tu problema.',
  'Ese lo pelean ellos. Tú lo cuentas después.',
  'Ese duelo no te incluye. Ni te va a incluir.',
  'Apártate, que ese duelo es de otros dos y tú solo estorbas.',
  'No se acepta un duelo ajeno. Búscate el tuyo, si alguien te reta.',
  'Nadie ha dicho tu nombre en ese duelo. Por algo será.',
  'Te cuelas en duelos ajenos porque a ti no te reta nadie.',
  'Ese duelo tiene dueño, y no eres ninguno de los dos.',
  'Espectador. Esa es tu función aquí, y ni eso haces bien.',
  'No es tuyo. Siéntate y mira cómo pelean los que sí fueron retados.',
  'Te has metido en un duelo que no es tuyo. Como con todo.',
  'Ese duelo se resuelve sin ti. Igual que casi todo en este grupo.',
  'Si quieres pelea, reta a alguien. Colarte en la de otros es de cobardes.',
  'No te toca, y encima se ha visto que lo intentabas.',
  'Ese duelo es entre dos. Tú haces tres, y sobras.',
  'Dos personas se van a pegar y tú quieres el sitio de una. No.',
  'Ese aura no es tuya, y ese duelo tampoco.',
  'Colarte no te hace valiente. Te hace pesado.',
  'Deja pelear a quien tiene con quién. Tú no tienes.',
  'No aceptes lo que no te han ofrecido. Eso aquí tiene nombre, y no es bonito.',
  'Llegas a un duelo ajeno como llegas a todo: sin que nadie te espere.',
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
  'Una expulsión detrás de otra sin pensar. Ni permiso ni cabeza para eso. Fuera el rango.',
  'Eso no es moderar, es una rabieta con permisos. Ya no tienes permisos.',
  'Te has emocionado sacando gente y el bot te ha sacado a ti del cargo.',
  'O te robaron la cuenta o eres así de imbécil. Sin admin en los dos casos.',
  'El grupo no es tuyo y acabas de demostrar por qué no debe serlo. Rango fuera.',
  'Confundiste ser admin con hacer lo que te dé la gana. Ya no eres ninguna de las dos.',
  'Esto no lo para un aviso: se para quitándote lo que has usado mal.',
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
  'Ni escribirlo bien. Se te pide lo mínimo del mundo y ni eso, comemierda.',
  'Ni teclearlo bien, y eso no se arregla. Naciste así y así te vas.',
  'Lo tuyo no lo arregla el autocorrector: corrige letras, no cretinos.',
  'No te ha fallado el móvil. Te ha fallado la cabeza, y esa no tiene repuesto.',
  'Hay errores de dedo y luego está lo tuyo, que es de cabeza y es permanente.',
  'Ponerlo bien no se entrena ni se cura en tu caso. Se llama retraso.',
  'Una puta palabra mal escrita y ya sabe el grupo hasta dónde das. Nada.',
  'El grupo acaba de medirte, y has dado bajísimo. Bajísimo.',
  'Escribes como piensas: a trozos, mal y sin llegar a ningún sitio.',
  'Analfabetismo con wifi. Ni escribir te sale.',
  'Una orden de una palabra y te ha ganado. Ahí está el techo de esa cabeza.',
  'Esa cabeza tiene el techo tan bajo que escribir un comando ya le roza.',
  'Mal escrito, y era una palabra corta. Esa cabeza con las largas ni lo intenta.',
  'Hasta un crío lo escribe bien a la primera. Tú no llegas a ese nivel.',
  'Escribirlo entero era todo lo que se te pedía, y eso ya está por encima de tu techo.',
  'Mira que lo has roto con poco. Hace falta una sesera muy vacía para eso.',
  'Te sale torcido hasta lo más sencillo. Material de fábrica, y sin garantía.',
  'Por teclear así, el grupo ya sabe cuánto da de sí tu cabeza.',
  'Lo has fallado sentado, con tiempo y sin presión. En condiciones ideales, ese es tu nivel.',
  'Esa forma de escribir es la de una cabeza que no llega.',
  'Tus neuronas escriben así en su mejor día, y hoy era su mejor día.',
  'Con la sesera que tienes, ponerlo bien no iba a pasar nunca, y no ha pasado.',
  'Ha quedado hecho un cristo, y es lo mejor que esa mollera sabe hacer con un teclado.',
  'Escribes con la seguridad de quien no sabe que no sabe.',
  'A tu cerebro le cuesta lo mismo escribir un comando que a otros una tesis.',
  'Has fallado donde no falla nadie. Ese es tu listón, y está en el suelo.',
  'Cada letra mal puesta es una neurona ausente, y esa cabeza no tiene suplentes.',
  'Imbécil del todo, y sin margen de mejora: lo más simple del mundo te sale roto.',
  'Escribir bien no venía de serie en esa cabeza, y eso no se instala después.',
  'Idiota de manual. Teclear sin romper nada está fuera de tu alcance.',
  'Lo has escrito sin dudar ni un segundo. Esa confianza es lo que mejor mide tu cabeza.',
  'Lo has destrozado sin despeinarte. Talento para romper cosas, cero para pensar.',
  'Te ha salido algo que no es ningún idioma. Tu cabeza habla uno que no entiende nadie.',
  'Ni un comando entero. Con ese cerebro, lo raro sería lo contrario.',
  'Lo has escrito como quien firma con la mano mala, y resulta que no tienes otra.',
  'Mal puesto, y no se arregla con práctica: es esa cabeza.',
  'Tan poca cosa ahí arriba que ponerlo bien se te queda grande.',
  'Hay cabezas que escriben y cabezas que adornan. La tuya adorna.',
  'Lo que acabas de poner es el máximo de esa mente, y el máximo es esto.',
  'Escribiste con el dedo y pensaste con el codo, que es con lo que piensas siempre.',
  'Fallar esto pide un cerebro muy por debajo de la media, y lo has traído.',
  'Esa cabeza da para mucho menos de lo que has intentado escribir.',
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
  'No tienes acceso a ese comando.',
  'Ese comando no lo puedes usar.',
  'Así que no, ese comando no es para ti.',
  'Ese comando se te queda cerrado.',
  'Y no, no tienes acceso a ese comando.',
  'Ese comando no te va a responder nunca.',
  'Cero acceso a ese comando.',
  'Ese comando lo tienes prohibido.',
  'No puedes usar ese comando y ya está.',
  'Ese comando no se te abre.',
  'Por eso no tienes acceso a ese comando.',
  'Ese comando no está a tu alcance.',
  'Y ese comando sigue sin ser tuyo.',
  'Acceso a ese comando: ninguno.',
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
  'Hoy le ha tocado a %V. Ni por bueno ni por malo: por sorteo.',
  '%V va a tener un día largo. El cartel es suyo hasta mañana.',
  'Se abre el día con %V en la diana. Que corra la voz.',
  'Hoy: %V. No hay más información y no hace falta más.',
  '%V es lo que hay hoy. Aprovechad o no, pero el día es ese.',
  '%V, hoy vas con diana. El resto, ya sabéis.',
  'Hoy hay temporada abierta con %V. Mañana ya se verá a quién le toca.',
  '%V sale hoy en el cartel. El sorteo de mañana puede repetir, que no tiene memoria.',
  'El sorteo de hoy ha salido %V. Sin apelación.',
  'Hoy el bot señala a %V. El resto puede respirar un día.',
  'Diana del día: %V. Desde ahora, cada robo a %V sale mejor.',
];

module.exports = {
  OBJETIVO_DIA_CARTEL,
  cabeceraDe,
  MAL_ESCRITO, SOLO_GRUPOS, SIN_PERMISO, SIN_PERMISO_ADMIN, SOLO_ADMINS, PURGA_ADMIN, SIN_ACCESO, A_TI_MISMO, AL_BOT, CONTRA_UN_ADMIN, DUELO_AJENO };
