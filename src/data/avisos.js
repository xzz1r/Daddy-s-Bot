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
  'Ni siquiera estás cerca del escalón de abajo, no digamos del de arriba.',
  'No es un fallo del bot: te ha mirado el rango y ha seguido a lo suyo.',
  'Ese comando ya tiene quien lo use, y no vas a ser tú ni este año ni el que viene.',
  'Escribirlo con seguridad tampoco cambia lo que eres en este grupo.',
  'Para eso hay que ser alguien, y el grupo lo tiene bastante claro contigo.',
  'Ese permiso se da, no se coge, y a ti nadie te lo va a dar.',
  'Eso lo toca quien decide, y tú aquí no decides ni el tema de conversación.',
  'Ese botón está a la vista para que sepas exactamente lo que no eres.',
  'Lo has intentado, se te ha visto, y ha quedado peor de lo que crees.',
  'Ese comando es para gente con rango. Tú tienes tiempo, que no es lo mismo.',
  'Ese comando lo tocan arriba del todo, y tú no estás ni en la escalera.',
  'Se te ha leído el rango y se ha seguido a otra cosa.',
  'Ese permiso no se pide escribiéndolo. Y a ti no te lo iban a dar igual.',
  'Está a la vista para que sepas exactamente dónde no llegas.',
  'Eso lo maneja quien lleva el grupo. Tú lo lees, que ya es algo.',
  'No te falta suerte: te falta rango, y eso no se arregla insistiendo.',
  'Ese escalón no lo pisa nadie que tenga que preguntar por él.',
  'Lo has escrito perfectamente y no ha servido de nada. Ese es el resumen.',
  'Eso está por encima de los admins. Calcula lo lejos que te queda.',
  'Ese comando existe para gente que decide. Tú aquí solo estás.',
  'El bot te ha entendido. Simplemente no eres nadie para eso.',
  'Ni con galones lo tocarías. Y galones tampoco tienes.',
  'Ese lo usa quien responde del grupo. Tú no respondes ni de ti.',
  'Se te ha visto intentarlo. Es lo único que has conseguido.',
  'Eso no depende de las ganas. Depende de lo que eres aquí.',
  'Ese comando lleva cerrojo, y el cerrojo te conoce.',
  'Arriba del todo. Tú ni siquiera en el medio.',
  'No hay error: hay jerarquía, y estás en la parte de abajo.',
  'Ese lo tocan dos o tres. Y no hace falta que preguntes quiénes.',
  'Eso no es para ti. No hoy, no este año, no con ese rango.',
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
  'Y si a estas alturas no te lo han dado, es que nadie lo ha pensado.',
  'Ese comando pide rango. El tuyo es "está en el grupo", y ahí se acaba.',
  'Escribirlo delante de todos tampoco ayuda a que te lo acaben dando.',
  'Tú decides aquí exactamente lo mismo que decides fuera: nada.',
  'Ese lo tocan los que mandan. Lo tuyo es llevar tiempo mirando cómo lo hacen.',
  'Y nadie va a proponer tu nombre, por si esperabas que saliera solo.',
  'El grupo ya decidió tu sitio, y no lo decidió precisamente esta semana.',
  'El comando no ha fallado: te ha reconocido perfectamente y por eso no hace nada.',
  'No tienes rango. Tienes antigüedad, que aquí no vale para absolutamente nada.',
  'Llevas meses aquí y sigues escribiendo comandos que no puedes usar.',
  'Los que lo tocan entraron cuando tú. Piensa qué hicieron distinto.',
  'El bot te ha reconocido perfectamente. Por eso no ha hecho nada.',
  'Ese pide galones. Lo tuyo es constancia sentado, que no puntúa.',
  'Nadie ha dicho tu nombre cuando se repartió eso. Nadie.',
  'Tienes antigüedad y cero autoridad. Es peor combinación de lo que parece.',
  'Lo has escrito delante de todos, y todos han visto que no pasa nada.',
  'Ese comando es de los que mandan. Tú de los que están.',
  'Si a estas alturas no lo tienes, no es un descuido: es una decisión.',
  'Estás en la lista de miembros, no en la de los que deciden.',
  'El grupo ya te colocó, y no fue arriba.',
  'Eso lo hacen otros mientras tú miras. Como hasta ahora.',
  'No te lo han dado, no te lo van a dar, y sabes por qué.',
  'Ese es de admins. Tú eres público.',
  'Aquí decides el mismo tanto que decides fuera.',
  'Escribirlo no te sube de rango. Solo lo deja por escrito.',
  'Lo tocan los que llevan el grupo. Tú lo llevas leyendo.',
  'Ese comando distingue, y acaba de distinguirte.',
  'El rango no se coge escribiendo. Si fuera así ya lo tendrías.',
  'Y llevas aquí el tiempo justo para saber que no te toca.',
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
  'A un admin no. Lo tuyo es aguantar, no repartir.',
  'No puedes. Y él sí puede contigo, por si se te ocurre insistir.',
  'Contra un admin no. Elige mejor a quién le tienes ganas.',
  'No. Los galones existen exactamente para esto.',
  'Ese tiene galones. Tú tienes ganas, que no es lo mismo.',
  'A un admin no. Elige a alguien de tu altura.',
  'Contra ese no. Está arriba y se nota hasta en el intento.',
  'No. Ese puede contigo, y tú con él ni por escrito.',
  'A los de galones no. A ti sí, y por algo será.',
  'Ese no. Busca en tu liga, que hay bastante donde elegir.',
  'Contra un admin no. Lo tuyo es encajar, no repartir.',
  'No puedes. Y si insiste él, te enteras.',
  'Ese está por encima. Baja un par de escalones y busca.',
  'A un admin no se le entra. Se le aguanta.',
  'No. Los galones existen exactamente para pararte a ti.',
  'Contra ese no. Elige a alguien que no pueda echarte.',
  'Ese no es un rival, es un superior. Cámbialo.',
  'A un admin no. Eso lo sabías y lo has intentado igual.',
  'No. Hay clases, y acabas de comprobar en cuál estás.',
  'Ese lleva galones desde antes de que se te ocurriera.',
  'Contra un admin no. Ni con suerte ni con público.',
  'No puedes. Y él no necesita este comando para devolvértela.',
  'A ese no. Elige mejor a quién le tienes ganas.',
  'Ese no. Prueba con alguien tan poca cosa como tú.',
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
  'No sabes escribir. Ni una palabra de cinco letras con el modelo delante.',
  'Analfabetismo con wifi. Te lo escribo yo, que tú no llegas.',
  'Un comando. Una palabra. Y la has roto igual.',
  'Ni eso sabes hacer. Literalmente ni eso.',
  'Lo tenías copiado ahí arriba y lo has escrito mal de todas formas.',
  'Cinco letras te han ganado y encima ni te has enterado.',
  'Te falla la cabeza antes que el dedo, y eso ya es decir mucho.',
  'Esto no pide saber nada de nada y tú has encontrado cómo fallarlo.',
  'Escribirlo mal no es tener prisa. Es no dar para más.',
  'Escribes igual de mal que aportas, o sea que al menos hay coherencia.',
  'Una palabra. Una. Y la has partido.',
  'Lo tenías escrito arriba y lo has copiado mal.',
  'Ni con el comando delante. Impresionante.',
  'Escribes como aportas, o sea que mal y poco.',
  'Cinco letras. Cinco. Y han podido contigo.',
  'No es prisa. Es que no das para más.',
  'Te lo tengo que adivinar yo. Todos los días igual.',
  'Fallas lo que no tiene dificultad. Piensa en eso.',
  'Ni el teclado tiene la culpa esta vez.',
  'Escribirlo bien era el mínimo y no has llegado.',
  'Eso no era un examen y lo has suspendido igual.',
  'Una palabra corta te ha ganado delante de todos.',
  'No sabes escribir el comando que quieres usar. Ahí lo dejo.',
  'Te lo corrijo yo, que si no no sales de ahí.',
  'Lo has intentado y ha salido otra cosa. Como siempre.',
  'Ni copiando. Que es lo grave.',
  'Fallar esto no es tener dedos gordos. Es lo otro.',
  'Escribes el comando como quien no lo ha leído nunca.',
  'Eso no se falla con prisa. Se falla siendo tú.',
  'Una palabra y te ha podido. Repásalo, o no.',
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

module.exports = {
  cabeceraDe,
  MAL_ESCRITO, SOLO_GRUPOS, SIN_PERMISO, SOLO_ADMINS, A_TI_MISMO, CONTRA_UN_ADMIN, DUELO_AJENO };
