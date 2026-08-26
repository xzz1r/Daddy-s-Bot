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
];

// ESCRIBIO MAL UN COMANDO Y HAY QUE ADIVINARSELO.
//
// Antes esto era un "¿Querias decir X?" pelado, con la cortesia de un buscador.
// El bot no es un buscador. El aviso sigue diciendo cual era —esa parte si
// sirve— pero el remate va a lo que acaba de pasar: no ha sido capaz de
// escribir bien una palabra que tenia delante, en el menu, entera.
//
// Solo sale cuando hay una sugerencia de verdad. Si lo escrito no se parece a
// nada, el bot se calla: reirse de alguien que quiza no estaba escribiendo un
// comando es reirse de uno mismo.
const MAL_ESCRITO = [
  'Cuatro letras y las has fallado. Y esto era lo fácil del día.',
  'Te he entendido igual, que es más de lo que tú has hecho por mi.',
  'Ni copiar del menú te sale. Está escrito ahí arriba, entero y gratis.',
  'Escribir mal un comando de cinco letras tiene un mérito raro.',
  'Te lo pongo yo, que si esperamos a que lo escribas bien no llegamos.',
  'Lo tenías delante, escrito, y aun así. Impresionante lo tuyo.',
  'Ni un comando. No podías haber fallado en algo más pequeño.',
  'Aprenderte la palabra cuesta menos que volver a intentarlo así.',
  'Has necesitado ayuda para escribir una palabra. Toma la ayuda.',
  'El teclado funciona. Lo que falla está un poco antes del teclado.',
]

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
