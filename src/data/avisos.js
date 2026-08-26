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

// LO MISMO, UN ESCALON MAS ARRIBA: esto salta cuando un miembro toca algo del
// tier de owner. Mismo criterio —se ataca el rango, no a la persona— pero aqui
// la distancia es mayor y las frases lo dicen: no es que le falte poco, es que
// no esta ni cerca.
const SIN_PERMISO = [
  'Eso es de arriba. Tú ni siquiera estás cerca del escalón de abajo.',
  'No, y no es un fallo del bot: es que te ha mirado el rango y sigue.',
  'Ese comando tiene dueño, y no vas a ser tú ni este año ni el que viene.',
  'No mandas. Escribirlo con seguridad tampoco cambia lo que eres en este grupo.',
  'Para eso hay que ser alguien, y el grupo lo tiene bastante claro contigo.',
  'No. Ese permiso se da, no se coge, y a ti nadie te lo va a dar.',
  'Ni de coña. Eso lo toca quien decide, y tú aquí no decides ni el tema.',
  'Ese botón está a la vista para que sepas exactamente lo que no eres.',
  'No. Lo has intentado, se te ha visto, y ha quedado peor de lo que crees.',
  'Ese comando es para gente con rango. Tú tienes tiempo, que no es lo mismo.',
];

// UN MIEMBRO ACABA DE TOCAR UN COMANDO DE ADMIN, Y LO HA VISTO EL GRUPO.
//
// Estos avisos iban flojos: seis de los diez eran la misma plantilla —"De
// admins." mas un empujoncito— y el empujoncito no llegaba al hueso. El aviso
// lo lee todo el mundo, no solo el que lo escribio, asi que es el unico momento
// del dia en que el bot puede recordarle a alguien su sitio en publico.
//
// Y EL ATAQUE VA AL RANGO, no a la persona. No es "eres tonto": es que llevas
// aqui el mismo tiempo que ellos y sigues sin galones, que nadie va a proponer
// tu nombre, y que el comando no ha fallado — te ha reconocido y por eso no
// hace nada. Eso escuece mas que un insulto porque es verificable.
const SOLO_ADMINS = [
  'Eso es de admins. Llevas aquí lo mismo que ellos y sigues sin serlo. Piensa por qué.',
  'De admins. Y si a estas alturas no te lo han dado, es que nadie lo ha pensado.',
  'Ese comando pide rango. El tuyo es "está en el grupo", y ahí se acaba.',
  'No eres admin. Escribirlo delante de todos tampoco ayuda a que te lo den.',
  'De admins. Tú decides aquí exactamente lo mismo que decides fuera: nada.',
  'Ese lo tocan los que mandan. Lo tuyo es llevar tiempo mirando cómo lo hacen.',
  'No. Y nadie va a proponer tu nombre, por si esperabas que saliera solo.',
  'De admins. El grupo ya decidió tu sitio, y no lo decidió esta semana.',
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

module.exports = { SOLO_GRUPOS, SIN_PERMISO, SOLO_ADMINS, A_TI_MISMO, CONTRA_UN_ADMIN, DUELO_AJENO };
