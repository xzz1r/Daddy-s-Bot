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

// Comando del dueño y lo ha escrito otro. Se lee en el grupo.
const SIN_PERMISO = [
  'Eso no es tuyo y lo sabes. Baja las manos.',
  'No. Y preguntar otra vez tampoco lo va a cambiar.',
  'Ese botón no es para ti. Ni el de al lado.',
  'Tienes exactamente el permiso que te has ganado: ninguno.',
  'No mandas aquí. Escribir el comando no te asciende.',
  'Ni de coña. Eso lo toca quien puede, y no eres tú.',
  'Ese comando existe, pero no para ti. Suele pasar.',
  'No. Y que lo hayas intentado queda por escrito.',
  'Para eso hay que ser alguien en este grupo.',
  'Prueba con un comando de tu nivel. Hay varios.',
];

// Comando de admins y lo ha escrito un miembro raso. Se lee en el grupo.
const SOLO_ADMINS = [
  'Eso es de admins. Tú miras.',
  'De admins. Y no, no lo eres por escribirlo.',
  'Ese comando es para los que mandan. Tú aporta contenido.',
  'No eres admin. Se nota hasta sin mirarlo.',
  'De admins. Sigue intentándolo y quizá algún día. Quizá.',
  'Eso lo hacen los admins. Tú puedes ver cómo lo hacen.',
  'No. Ese es de los que tienen la corona.',
  'De admins, y tú llevas aquí de decorado.',
  'Ese comando pide galones. Tú vas en camiseta.',
  'De admins. Lo tuyo es otra sección del menú.',
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

module.exports = { SOLO_GRUPOS, SIN_PERMISO, SOLO_ADMINS, A_TI_MISMO, CONTRA_UN_ADMIN, DUELO_AJENO };
