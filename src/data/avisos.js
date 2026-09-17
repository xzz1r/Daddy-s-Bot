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
  'No tienes permiso. Y no te creas importante por intentarlo, random de mierda.',
  'Ni siquiera estás cerca del escalón de abajo, no digamos del de arriba.',
  'No es un fallo del bot: te ha leído el rango y ha seguido a lo suyo.',
  'Ese comando ya tiene quien lo use, y no vas a ser tú ni este año ni el que viene.',
  'Escribirlo con seguridad no cambia lo puto poco que eres en este grupo.',
  'Para eso hay que ser alguien. El grupo lo tiene bastante claro contigo.',
  'Ese permiso se da, no se coge, y a ti no te lo va a dar nadie.',
  'Eso lo toca quien decide. Tú aquí no decides ni de qué se habla.',
  'Ese botón está a la vista para que sepas exactamente lo que no eres.',
  'Lo has intentado, se te ha visto, y ha quedado peor de lo que crees.',
  'Ese comando es para gente con rango. Tú tienes tiempo libre, que no es lo mismo.',
  'Se te ha leído el rango y se ha pasado a otra cosa. Eso es todo lo que ha pasado.',
  'No te falta suerte: te falta rango, y eso no se arregla insistiendo, inútil.',
  'Está a la vista para que sepas exactamente dónde no llegas.',
  'Eso lo maneja quien lleva el grupo. Tú lo lees, que ya es bastante para ti.',
  'No eres nadie aquí. El comando lo sabe y por eso no ha hecho nada.',
  'Ni tocándolo diez veces. El rango no se pega de tanto escribirlo.',
  'Te has creído importante durante medio segundo. Ya se te ha pasado.',
  'Ese permiso lo tiene gente que hace cosas. Tú miras.',
  'No, puto. Ese no es para ti y nunca lo va a ser.',
  'Has escrito un comando que no puedes usar, delante de todos. Otra vez.',
  'El bot te ha reconocido perfectamente. Por eso te ignora.',
  'Eso es de los de arriba. Tú ni sabes quiénes son los de arriba.',
  'No tienes rango ni tienes nada. Escribirlo no te da ninguna de las dos.',
  'Aquí no mandas ni sobre tu propio mensaje. Mucho menos sobre eso.',
  'Ese comando se te queda grande como todo lo demás.',
  'Lo has probado por si colaba. No ha colado. Nunca cuela.',
  'Un random escribiendo comandos de admin. Da entre pena y risa.',
  'No es que no puedas ahora. Es que no vas a poder nunca, ignorante.',
  'Te falta permiso, te falta rango y te falta bastante más.',
  'Ese lo usan los que importan. Tú estás aquí de relleno.',
  'No tienes acceso. Tampoco tienes mucho más, pero eso no es cosa del bot.',
  'El comando existe. Tu autoridad para usarlo no.',
  'Lo has escrito como si fuera a funcionar. Esa fe da vergüenza ajena.',
  'A ti eso no se te da. Ni eso ni casi nada.',
  'Ni permiso ni respeto. Y las dos cosas te las has ganado tú solo.',
  'Eso no se desbloquea insistiendo, animal. Se desbloquea siendo otro.',
  'Aquí cada uno tiene su sitio y el tuyo es mirar.',
  'Ese comando no te va a contestar. Como casi nadie.',
  'Sigue intentándolo. Queda muy bien visto desde fuera.',
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
// es que llevas aqui el mismo tiempo que ellos y sigues sin galones, que nadie
// va a proponer tu nombre, que el comando no ha fallado — te ha reconocido y
// por eso no hace nada. Eso escuece mas que un insulto porque es verificable.
const SOLO_ADMINS = [
  'No eres admin, puto random. Ni lo vas a ser, así que deja de escribirlo.',
  'Llevas aquí lo mismo que ellos y sigues sin galones. Piensa por qué.',
  'Si a estas alturas no te lo han dado, es que nadie lo ha pensado nunca.',
  'Ese comando pide rango. El tuyo es "está en el grupo", y ahí se acaba.',
  'Escribirlo delante de todos tampoco ayuda a que te lo acaben dando.',
  'Tú decides aquí exactamente lo mismo que decides fuera: una mierda.',
  'Ese lo tocan los que mandan. Lo tuyo es llevar años mirando cómo lo hacen.',
  'Nadie va a proponer tu nombre, por si esperabas que saliera solo.',
  'El grupo ya decidió tu sitio, y no lo decidió precisamente esta semana.',
  'El comando no ha fallado: te ha reconocido perfectamente y por eso pasa de ti.',
  'No tienes rango. Tienes antigüedad, que aquí no vale una mierda.',
  'Llevas meses escribiendo comandos que no puedes usar. Meses, inútil.',
  'Los que lo tocan entraron cuando tú. Piensa qué hicieron distinto.',
  'Ese pide galones. Lo tuyo es constancia sentado, que no puntúa.',
  'Nadie dijo tu nombre cuando se repartió eso. Nadie, ignorante.',
  'Tienes antigüedad y cero autoridad. Es peor combinación de lo que parece.',
  'Eso es de admins. Tú eres de los que preguntan quién es admin.',
  'No te han dado admin porque nadie se fía de ti para nada.',
  'Ser admin no se pide escribiendo el comando, animal.',
  'Lo has intentado como quien prueba una puerta cerrada. Sigue cerrada.',
  'A los admins se les elige. A ti se te aguanta.',
  'Ese comando es para los que llevan el grupo. Tú lo habitas, que es otra cosa.',
  'No eres admin y se nota en todo, no solo en esto.',
  'Aquí hay dos clases de gente y tú sabes perfectamente cuál eres.',
  'El botón lo ves para que tengas claro lo que no vas a tocar.',
  'Ni admin ni nada parecido. Ni en el mejor de tus días.',
  'Escribes comandos de admin como quien se prueba ropa que no puede pagar.',
  'Los admins hacen. Tú comentas lo que hacen.',
  'No te falta un comando. Te falta que alguien te tome en serio.',
  'Eso lo usan arriba. Tú ni ves la escalera desde donde estás.',
  'Has intentado dar una orden sin tener con qué. Otra vez.',
  'Aquí el que manda manda, y tú ni eso ni lo otro.',
  'Ser del grupo y ser alguien en el grupo son cosas distintas. Tú eres lo primero.',
  'Ese comando te ha mirado el rango y se ha reído.',
  'No, no eres admin. Y preguntarlo cada semana no lo cambia.',
  'Te hace falta rango y te hace falta que a alguien le importes. Vas justo de las dos.',
  'Lo tuyo es escribir cosas que no pasan nada. Tienes práctica.',
  'Ese lo tocan cuatro. Tú no eres ninguno de los cuatro.',
  'Sin galones no hay comando. Y sin galones te vas a quedar.',
  'Has escrito eso con una seguridad que no se corresponde con nada.',
];

// Se ha puesto a si mismo de objetivo. Se lee en el grupo.
const A_TI_MISMO = [
  'A ti mismo no. Búscate un rival de verdad.',
  'Contigo mismo no se juega. Ya pierdes bastante solo.',
  'A ti mismo no. Eso ya lo haces todos los días gratis.',
  'No. Elige a otro, que para eso está el grupo lleno.',
  'Contra ti mismo no hay mérito ni para ti.',
  'A ti mismo no. Da hasta pena verlo escrito.',
  'Eso es contra otro. Que alguien te caiga mal, no puede ser tan difícil.',
  'No puedes. Y si no encuentras a nadie más, ese es otro problema.',
  'A ti mismo no. Busca a alguien que te aguante.',
  'No. Mete a otro, que solo no tiene gracia.',
  'A ti mismo no. Ya te bastas solo para quedar mal.',
  'Contra ti no. Elige a alguien que no seas tú.',
  'No. Busca a otro, que el grupo está lleno.',
  'A ti mismo no tiene ninguna gracia. Ni para el grupo.',
  'Contigo mismo no. Eso no es un duelo, es un espejo.',
  'No puedes. Y que lo hayas intentado ya dice bastante.',
  'A ti no. Métete con alguien que te conteste.',
  'Elige a otro. Si es que se te ocurre alguien.',
  'Contra ti mismo no hay premio. Ni consuelo.',
  'No. Eso se hace con dos, y tú has traído uno.',
  'A ti mismo no. Ya pierdes solo bastante a menudo.',
  'Otro objetivo. Cualquiera menos tú.',
  'No. Ni el bot quiere ver eso.',
  'Contigo no. Busca a alguien que te importe.',
  'A ti mismo no. Da vergüenza ajena leerlo.',
  'No. Mete a alguien más, que esto no es terapia.',
  'Contra ti no se puede. Contra otros sí, prueba.',
  'Elige a otro. Aunque sea al azar.',
  'A ti mismo no. Eso ya lo tienes cubierto a diario.',
  'No. Hace falta un segundo, y tú solo has traído tu nombre.',
];

// El objetivo es un admin y quien lo intenta no llega. Se lee en el grupo, y
// delante del propio admin, que es la mitad de la gracia.
const CONTRA_UN_ADMIN = [
  'Ese lleva galones. Busca a alguien de tu tamaño.',
  'A un admin no. Elige a alguien que no pueda devolvértela.',
  'Contra un admin no. Aquí hay clases y ya sabes en cuál estás.',
  'No. Ese está por encima de ti, y se nota hasta en el intento.',
  'A los admins no se les toca. A ti sí, y por algo será.',
  'Ese no. Métete con los de tu liga, que hay de sobra.',
  'No puedes. Y esa persona sí puede contigo, por si se te ocurre insistir.',
  'Contra un admin no. Elige mejor a quién le tienes ganas.',
  'No. Los galones existen exactamente para esto.',
  'Ese tiene galones. Tú tienes ganas, que no es lo mismo.',
  'A un admin no. Elige a alguien de tu altura.',
  'Contra ese no. Está arriba y se nota hasta en el intento.',
  'No. Ahí pierdes tú, y ni por escrito te sale.',
  'A los de galones no. A ti sí, y por algo será.',
  'Ese no. Busca en tu liga, que hay bastante donde elegir.',
  'Contra un admin no. Lo tuyo es encajar, no repartir.',
  'No puedes. Y si insisten desde arriba, te enteras.',
  'Ese está por encima. Baja un par de escalones y busca.',
  'A un admin no se le entra. Se le aguanta.',
  'No. Los galones existen exactamente para pararte a ti.',
  'Contra ese no. Elige a alguien que no pueda echarte.',
  'Ese no es un rival, es un superior. Cámbialo.',
  'A un admin no. Eso lo sabías y lo has intentado igual.',
  'No. Hay clases, y acabas de comprobar en cuál estás.',
  'Ese lleva galones desde antes de que se te ocurriera.',
  'Contra un admin no. Ni con suerte ni con público.',
  'No puedes. Y desde arriba no hace falta este comando para devolvértela.',
  'Ese no. Prueba con alguien tan poca cosa como tú.',
  'Ahí no. Elige a alguien que no pueda contestarte con el botón.',
  'No. Hay gente a la que se le tose y gente a la que no. Tú toses hacia abajo.',
];

// Se ha metido en un duelo de otros dos. Se lee en el grupo.
const DUELO_AJENO = [
  'Ese duelo no es tuyo. Espera a que alguien te rete a ti. Si pasa.',
  'A ti no te han llamado. Aparta.',
  'Ese duelo tiene dueño y no eres tú.',
  'No es tu pelea. Métete en la tuya, si consigues una.',
  'A ti nadie te retó. Párate a pensar por qué.',
  'Ese no es tu duelo. Ni de lejos.',
  'No va contigo, y colarte tampoco te lo va a ganar.',
  'Ese duelo es de otros dos. Tú a mirar, como siempre.',
  'No te toca. Consíguete un enemigo propio.',
  'Ese duelo no te incluye, y eso ya dice bastante de ti.',
  'Ese duelo tiene dos nombres y ninguno es el tuyo.',
  'A ti no te han llamado. Aparta y mira.',
  'No es tu pelea. Consíguete una.',
  'Ese es de otros. Tú a la grada, como siempre.',
  'Nadie te retó. Párate a pensar por qué.',
  'No te toca. Ni te va a tocar colándote.',
  'Ese duelo ya tiene dueños. Tú sobras.',
  'No va contigo. Y meterte no te mete.',
  'Ese es ajeno. Búscate un enemigo propio.',
  'A ti no. Espera a que alguien te nombre, si eso pasa.',
  'No es tuyo. Y colarse no cuenta como que te reten.',
  'Ese duelo es de dos. Tú eres el tercero, que es peor que ninguno.',
  'No te han invitado. Como casi siempre.',
  'Ese no te incluye, y eso ya dice bastante.',
  'Aparta. Esto va de otros dos.',
  'No es tu turno. Ni tu duelo. Ni tu problema.',
  'Ese lo pelean ellos. Tú lo cuentas después.',
  'No. Métete en algo que sea tuyo, si tienes.',
  'Ese duelo no lleva tu nombre en ninguna parte.',
  'A ti nadie te ha nombrado. Sigue mirando.',
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
const MAL_ESCRITO = [
  'No sabes escribir una puta palabra de cinco letras con el modelo delante.',
  'Analfabeto con wifi. Te lo corrijo yo, que tú no llegas.',
  'Un comando. Una palabra. Y la has roto igual, animal.',
  'Ni eso sabes hacer. Literalmente ni eso, inútil.',
  'Lo tenías copiado ahí arriba y aun así lo has escrito como el puto culo.',
  'Te falla la cabeza antes que el dedo, y eso en tu caso ya es decir algo.',
  'Esto no pide saber nada y tú has encontrado la forma de fallarlo. Enhorabuena.',
  'Escribirlo mal no es tener prisa. Es ser corto.',
  'Escribes igual de mal que aportas, o sea que al menos eres coherente.',
  'Una palabra. Una. Y la has partido por la mitad, ignorante.',
  'Ni con el comando delante de los ojos. Impresionante lo tuyo.',
  'No es prisa. Es que no das para más y todo el grupo lo está leyendo.',
  'Te lo tengo que adivinar yo. Todos los putos días igual.',
  'Fallas lo que no tiene dificultad ninguna. Párate a pensar en eso.',
  'Ni el teclado tiene la culpa esta vez. Esta vez eres tú.',
  'Escribirlo bien era el mínimo absoluto y no has llegado.',
  'No sabes escribir el comando que quieres usar. Ahí lo dejo.',
  'Te lo corrijo yo porque si no no sales de ahí en toda la tarde.',
  'Lo has intentado y ha salido otra cosa. Como todo lo tuyo.',
  'Ni copiando, que es lo que de verdad asusta.',
  'Fallar esto no es tener los dedos gordos. Es lo otro.',
  'Escribes el comando como quien no ha leído nunca nada.',
  'Eso no se falla con prisa. Se falla siendo tú.',
  'Una palabra corta te ha ganado delante de todo el grupo.',
  'Cinco letras y han podido contigo. Cinco.',
  'El puto comando estaba escrito arriba. Arriba. Y lo has copiado mal.',
  'Hay gente que no sabe escribir y hay tú, que encima insiste.',
  'No te ha fallado el móvil. Te ha fallado lo de dentro.',
  'Escribes como si te acabaran de enseñar el alfabeto esta mañana.',
  'Ese comando no existe, ignorante. El que querías está a dos letras.',
  'Ni con autocorrector. Piensa en el mérito que tiene eso.',
  'Se te ha entendido igual, que es lo humillante del asunto.',
  'No hace falta ser listo para escribirlo. Solo no ser tú.',
  'Te has equivocado en lo único que no tenía forma de salir mal.',
  'Hasta el bot ha tenido que adivinarte. Y el bot no piensa.',
  'Una palabra mal escrita y ya sabemos todo lo que hay que saber de ti.',
  'Escribir mal es normal. Escribir así de mal es un diagnóstico.',
  'Ese no es el comando. Ni de lejos. Ni con buena voluntad.',
  'Lo has escrito con la misma atención con la que haces todo lo demás.',
  'No sé si tienes prisa o es que no sabes. Apuesto por lo segundo.',
  'Pones el mismo cuidado escribiendo que aportando al grupo: ninguno.',
  'Eso que has escrito no significa nada. Igual que lo que sueles decir.',
  'Un comando de cuatro letras y lo has convertido en otra cosa. Animal.',
  'No hay comando que se llame así. Hay uno parecido y tú no has dado con él.',
  'Te falta leer. Y antes de leer, te faltan bastantes más cosas.',
];

// CABECERA POR POOL. Solo la tienen los avisos que niegan por RANGO: ahi hace
// falta decir de quien es el comando. Los demas (a ti mismo, duelo ajeno, solo
// grupos) ya se explican solos y una cabecera seria ruido.
//
// Va en un Map del propio array a su texto para no tener que cambiar la firma de
// aviso() ni tocar los seis sitios que lo llaman: el que tiene cabecera la
// recibe, el que no, sigue igual.
const CABECERAS = new Map([
  [SOLO_ADMINS, '*Solo admins.*'],
  [SIN_PERMISO, '*Solo admins superiores.*'],
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
  'Hoy hay temporada abierta con %V. Mañana le tocará a otro.',
  'El nombre de hoy es %V. Lo que hagáis con él es cosa vuestra.',
  '%V sale hoy en el cartel. Veinticuatro horas y se cambia.',
  'Objetivo del día: %V. El grupo ya lo sabe, así que %V también.',
  'Hoy le ha tocado a %V. Ni por bueno ni por malo: por sorteo.',
  '%V va a tener un día largo. El cartel es suyo hasta mañana.',
  'Se abre el día con %V en la diana. Que corra la voz.',
  'Hoy: %V. No hay más información y no hace falta más.',
  '%V es lo que hay hoy. Aprovechad o no, pero el día es ese.',
  'El sorteo de hoy ha salido %V. Sin apelación y sin repetir.',
  'Hoy el bot señala a %V. Mañana señalará a otro, tranquilos.',
  '%V, hoy vas con diana. El resto, ya sabéis.',
  'Diana del día: %V. Hasta el corte, y luego a empezar de cero.',
];

module.exports = {
  OBJETIVO_DIA_CARTEL,
  cabeceraDe,
  MAL_ESCRITO, SOLO_GRUPOS, SIN_PERMISO, SOLO_ADMINS, A_TI_MISMO, CONTRA_UN_ADMIN, DUELO_AJENO };
