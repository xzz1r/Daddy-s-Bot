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
  'Eres admin de adorno, cabrón. Esto lo tocan los de verdad.',
  'Tienes galones y sigues siendo un comemierda. Ese comando no es tuyo.',
  'Ser admin no te hace importante, imbécil. Te hace útil, y ni eso cumples.',
  'Eso está por encima de ti. Tú eres un mandado, malparido.',
  'Te dieron un rango por pena y ya te crees el jefe. Patético.',
  'Ese permiso no se coge, hijo de puta, y nadie te lo va a dar.',
  'Tienes rango de los inútiles, y eso está dos escalones por encima.',
  'Ni con galones, desgraciado. Hay alturas que no vas a pisar nunca.',
  'Eres el último de la fila de arriba y aún te sobra gente delante.',
  'Un lameculos con rango sigue siendo un lameculos. Ese botón no se te da.',
  'El cargo te quedó grande el primer día, incompetente de mierda.',
  'Eso lo mueve quien manda de verdad. Tú obedeces, basura.',
  'Te dieron galones porque hacía falta relleno. No te confundas, mediocre.',
  'Eso no lo tocas ni con permiso ni con ganas, cretino.',
  'Has intentado pasarte de listo delante de todos. Ridículo, como siempre.',
  'Miserable. Te dan un poco de poder y ya quieres el resto.',
  'No, puto. Eso está muy por encima tuyo y no vas a subir ni un escalón.',
  'Tienes rango y aun así no eres nadie. Eso tiene mérito, idiota.',
  'Ese permiso es para gente de fiar. Tú eres un traidor y se sabe.',
  'Con galones y todo sigues siendo escoria. Ese comando no se te toca.',
  'Aprovechado de mierda. Te dieron un dedo y ya vas a por el brazo.',
  'Llegaste arriba de milagro, malnacido. No estires más la suerte.',
  'Tu cargo sirve para silenciar gente, no para creerte el amo, estúpido.',
  'Farsante con galones. Se te ha visto intentarlo y se te ha calado.',
  'Ni borracho te dejarían tocar eso, sinvergüenza de mierda.',
  'Tienes permisos de niñera, no de jefe. Asúmelo, impresentable.',
  'Ese comando distingue a los que mandan de las ratas como tú.',
  'Te crees arriba porque hay gente abajo. Sigues siendo un don nadie.',
  'Eso es de otro nivel, cobarde. Tú ni preguntando llegas.',
  'Un admin de mierda intentando decidir cosas de mayores. Siéntate.',
  'No tienes ese permiso porque nadie se fía de un hipócrita como tú.',
  'Tu rango no te convierte en alguien. Solo en un inútil con botones.',
  'Eso es del que paga la fiesta. Tú solo la limpias, comemierda.',
  'Despreciable. Te dan galones y lo primero que haces es abusar.',
  'Ese permiso lo tiene quien decide. Tú ni decides qué desayunas.',
  'Hay rangos por encima del tuyo y todos saben por qué, mentiroso.',
  'Tienes galones, no corona. Aprende la diferencia, cabrona.',
  'Te falta rango y te sobra hocico. Mala combinación, indeseable.',
  'Eso se lo dejan a gente seria. Tú eres el chiste del grupo.',
  'Ni con el cargo puesto dejas de ser un parásito. Eso no es para ti.',
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
  'Llevas aquí lo mismo que ellos y sigues sin galones. Piensa por qué.',
  'No eres admin, hijo de puta, y escribirlo mil veces no te va a dar el rango.',
  'Ese comando es de los que mandan. Tú eres un comemierda con teclado.',
  'Nadie te ha dado nada porque eres un inútil, y aquí lo tiene claro todo el mundo.',
  'Sin galones, malparido. Y con lo que eres no te los van a dar nunca.',
  'Cabrón, ese botón lo tocan los que sirven para algo. Ahí ya te quedas fuera.',
  'Eres un parásito del grupo, no un admin. Siéntate y cállate.',
  'Al admin se le elige por algo. A ti nadie te elegiría ni para hacer bulto.',
  'Has escrito un comando que no puedes usar delante de todos. Patético.',
  'Ni admin ni nada, desgraciado. Lo tuyo es leer y tragar.',
  'No tienes rango porque eres un mediocre, y eso no se arregla insistiendo.',
  'Ese botón no es para basura como tú. Es para gente que hace algo aquí.',
  'Llevas años lamiendo culos y sigues sin galones. Ni así, lameculos.',
  'Eres un don nadie con wifi, y el comando te ha leído igual que el grupo.',
  '¿Tú admin? Antes le doy el rango a una rata, miserable.',
  'No, cabrona. Ese comando pide rango y tú no vas a tener rango en tu vida.',
  'Un impresentable dando órdenes que no puede dar. Da risa verte.',
  'El grupo te soporta, no te respeta. Por eso no eres admin, imbécil.',
  'Ese comando es de los que hacen. Tú eres un aprovechado que solo pide.',
  'Ni rango ni vergüenza, sinvergüenza. Y lo segundo pesa más.',
  'Farsante de mierda. Te has visto dando una orden sin ser nadie.',
  'Nadie confía nada a un traidor, así que olvídate del rango, malnacido.',
  'Tu único cargo aquí es el de chupapoyas oficial, y ese sí te lo ganaste.',
  'Cretino sin permisos escribiendo comandos de permisos. Te retratas solo.',
  'Eso lo tocan cuatro y tú ni entras en la lista, indeseable.',
  'No te falta un comando, hija de puta. Te falta que alguien te trague.',
  'Ridículo. Has dado una orden sin tener absolutamente nada con qué darla.',
  'Aquí hay admins y hay gente como tú. Adivina de qué lado estás, idiota.',
  'Eres un asqueroso sin galones intentando mandar. Vuelve a tu sitio.',
  'Ese comando te ha mirado el rango y ha decidido que no vales nada.',
  'Sin rango, puto. Y con esa actitud te vas a morir sin él.',
  'Eres un incompetente con tiempo libre, que no es lo mismo que ser admin.',
  'Despreciable y sin rango. Lo segundo tiene arreglo, lo primero no.',
  'Estúpido, eso pide galones. Tú traes ganas, y aquí eso no vale nada.',
  'Un hipócrita pidiendo poder. Menos mal que nadie te hizo caso nunca.',
  'Eso pide autoridad y tú das vergüenza ajena. No es lo mismo.',
  'Canalla sin galones. El día que te den uno, me borro del grupo.',
  'Lo has intentado por si colaba, mentiroso de mierda. Nunca cuela.',
  'Vil, mediocre y sin rango. Tres de tres, campeón.',
  'Eres basura con antigüedad, y la antigüedad aquí no da absolutamente nada.',
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
// ─── UN ADMIN ECHANDO GENTE EN MASA ─────────────────────────────────────────
//
// Se le acaba de quitar el rango por vaciar el grupo. El aviso sale DELANTE DE
// TODOS a proposito: media docena de personas acaban de desaparecer y el resto
// merece saber quien fue y que ya no puede seguir.
//
// Y va a por la persona, no a por el hecho. Quien hace esto no se equivoca: se
// viene arriba con el boton, y eso se cura enseñandoselo.
const PURGA_ADMIN = [
  'Te has creído dios con el botón de expulsar. Ya no lo tienes, puto.',
  'Seis en cinco minutos. Ni permiso ni cabeza para sacar gente en masa. Fuera el rango.',
  'Le has cogido gusto a echar gente. Se te ha quitado el juguete, inútil.',
  'Vaciar el grupo no te hace importante. Te hace exactamente lo que eres. Sin admin.',
  'Eso no es moderar, es una rabieta con permisos. Ya no tienes permisos.',
  'Has durado cinco minutos con el poder. Cinco. Rango retirado.',
  'Nadie te dio admin para que jugaras a echar gente. Se te retira.',
  'Te has emocionado sacando gente y el bot te ha sacado a ti del cargo.',
  'Seis seguidas. O te robaron la cuenta o eres así. Sin admin en los dos casos.',
  'El grupo no es tuyo y acabas de demostrar por qué no debe serlo. Rango fuera.',
  'Echar gente en masa no es autoridad, ignorante. Es no saber estar. Ya no eres admin.',
  'Se te ha ido de las manos en tiempo récord. Adiós al rango.',
  'Te dieron un botón y lo has usado como un animal. Se te quita.',
  'Cinco minutos tardaste en demostrar que no valías para esto.',
  'Confundiste ser admin con hacer lo que te dé la gana. Ya no eres ninguna de las dos.',
  'Esto no lo para un aviso: se para quitándote lo que has usado mal.',
];

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
  MAL_ESCRITO, SOLO_GRUPOS, SIN_PERMISO, SOLO_ADMINS, PURGA_ADMIN, A_TI_MISMO, CONTRA_UN_ADMIN, DUELO_AJENO };
