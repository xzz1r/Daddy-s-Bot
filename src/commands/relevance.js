'use strict';

// !relevancia / !relevance — mide el peso real de alguien en el grupo por la
// cantidad EXACTA de mensajes que lleva enviados (misma fuente que !count).
//
// Tramos:
//   < 300  → parásito: inactivo, mirón, gorrón. Insulto brutal.
//   300-699 → intermedio: está, pero no pesa.
//   700+   → relevante: sostiene el grupo de verdad.
//
// El owner principal es un fantasma para el bot: sus mensajes NO se cuentan
// (messageHandler lo excluye), así que su conteo real es 0. Para no delatarlo
// con un 0 absurdo, se le fuerza el tramo alto con una cifra estable y creíble.

const { getTargetOrSelf, isMainOwner } = require('../utils/wa');
const { pickFresh, fmt } = require('../utils/helpers');
const { getUserCount } = require('../utils/messageCounter');
const { SOLO_GRUPOS } = require('../data/avisos');
const { aviso } = require('../utils/helpers');
const { SIN_SERVICIO } = require('../utils/auraCobro');

const MID_MIN  = 300;
const HIGH_MIN = 700;


// ═══════════════════════════════════════════════════════════════════════════
// TRAMO BAJO — parásito / mirón / gorrón. %N = mención, %MSG = conteo exacto.
// ═══════════════════════════════════════════════════════════════════════════

let PARASITO = [
  '%N, %MSG mensajes. El grupo no para de hablar y tú has aportado lo que cabe en una tarde aburrida, pequeña.',
  '%MSG mensajes, %N. Hay gente que escribe eso en una discusión de media hora. Tú lo has estirado toda tu estancia aquí.',
  '%N, %MSG mensajes. Para encontrar algo tuyo en el chat hay que subir tanto que da pereza.',
  'Con %MSG mensajes, %N, tu nombre aparece en la lista de miembros y en poco más.',
  '%MSG mensajes, %N. Si mañana te vas, lo único que cambia en el grupo es el número de miembros.',
  '%N, %MSG mensajes. Ni quien te añadió se acuerda ya de para qué lo hizo.',
  '%MSG mensajes, %N. Firmas la asistencia de vez en cuando y te vas sin decir nada que valga.',
  '%N, %MSG mensajes. Hablas tan poco que cuando escribes algo el grupo piensa que te han robado el móvil, princesa.',
  '%MSG mensajes, %N. Ocupas una plaza que alguien con ganas de hablar usaría mejor, gorrón de mierda.',
  '%N, %MSG mensajes. Tu aportación al grupo cabe en una captura. Y sobra pantalla.',
  'Con %MSG mensajes, %N, eres la persona que todos tienen agregada y nadie sabría describir, muñeca.',
  '%N, %MSG mensajes. Para lo que escribes, podrías mandar señales de humo. Llegarían antes y dirían lo mismo: nada.',
  '%MSG mensajes, %N. El chat se mueve, se ríe, se pelea, y tú en la puta esquina con los brazos cruzados.',
  '%N, %MSG mensajes. Cuando apareces nadie sabe a qué vienes, y tú tampoco.',
  '%N, %MSG mensajes. Callarse a veces es prudencia. Callarse siempre es no tener una mierda que decir.',
  '%MSG mensajes, %N. Estás en el grupo como quien va a una fiesta a no hablar con nadie y a quedarse junto a la comida, pequeña.',
  '%N, %MSG mensajes. Aquí quien no escribe no existe, y tú llevas mucho tiempo sin existir.',
  '%N con %MSG mensajes. Un número así no se consigue por timidez. Se consigue porque todo te importa una mierda.',
  '%MSG mensajes, %N. Si el grupo cobrara por estar, serías quien primero se larga.',
  '%N, %MSG mensajes. Lo más largo que has escrito aquí es tu nombre de perfil.',
  '%MSG mensajes, %N. No aportas temas, no aportas risas y no aportas ni una puta pelea.',
  '%N, %MSG mensajes. Te llevas la diversión de los demás y no dejas ni las gracias. Gorronería de nivel olímpico, reina.',
  'Con %MSG mensajes, %N, tienes el perfil de quien entra en los grupos a hacer bulto, y el encargo lo cumples de maravilla.',
  '%N, %MSG mensajes. El día que escribas algo, el grupo va a pedir que te presentes.',
  '%MSG mensajes, %N. Si el silencio fuera aura, estarías forrado. No lo es, y estás en la ruina.',
  '%N, %MSG mensajes. Mucho mirar y poco mojarse. El grupo no es un escaparate, cagón.',
  '%N, %MSG mensajes. Tu presencia se nota lo mismo que tu ausencia: nada.',
  '%MSG mensajes, %N. A estas alturas callarte ya es tu único talento.',
  '%N, %MSG mensajes. El grupo te tiene de fondo de pantalla y ni lo ha elegido.',
  '%N, %MSG mensajes. Vienes, cotilleas y te piras sin dejar ni una palabra. Turismo barato.',
];

// ═══════════════════════════════════════════════════════════════════════════
// TRAMO MEDIO — está, pero no pesa. Ni fantasma ni referente.
// ═══════════════════════════════════════════════════════════════════════════

let INTERMEDIO = [
  '%N, %MSG putos mensajes. Suficiente para que te saluden, insuficiente para que te inviten a algo que importe. Así te va la vida en este grupo.',
  '%N, %MSG mensajes. Tienes rodaje para haber dejado huella y solo has dejado una mancha del tamaño de tu esfuerzo real: minúscula.',
  '%MSG mensajes, %N. Ocupas la casilla del "normal", que es la casilla que nadie señala con el dedo ni para bien ni para mal. Ahí sigues.',
  '%MSG mensajes, %N. Sales en la foto de grupo pero en la segunda fila, sin sonreír. Presente en el registro, ausente en la puta memoria de todos.',
  'Con %MSG mensajes, %N, cumples con lo mínimo y te quedas tan ancho. Es una táctica legítima, la más aburrida de todas, pero legítima.',
  '%N, %MSG mensajes. Relleno de calidad: si faltas una semana, alguien lo nota el domingo.',
  '%MSG mensajes, %N. Hablas lo bastante para que te conozcan y lo justo para que no te recuerden.',
  '%N, %MSG mensajes. Estás en la mitad de la tabla, que es donde se aparca a la gente que ni molesta ni suma.',
  'Con %MSG mensajes, %N, tienes voz en el grupo. Una voz de fondo, pero voz, chiquitina.',
  '%N, %MSG mensajes. Te falta otro tanto para que el grupo te necesite.',
  '%MSG mensajes, %N. Apareces, dices algo correcto y te vas. Correcto es lo peor que se puede ser aquí, pequeña.',
  '%N, %MSG mensajes. Aquí dentro eres un «ah, sí, también está». Y ni eso con seguridad.',
  '%MSG mensajes, %N. Das para un meme al mes. Los que llevan el grupo dan para uno al día.',
  '%N, %MSG mensajes. Lo que escribes se lee. No se comenta, pero se lee.',
  '%N con %MSG mensajes. Tienes lo suficiente para opinar y ninguna opinión que alguien cite.',
  '%MSG mensajes, %N. Estás en el grupo con un pie dentro y el otro quién sabe dónde.',
  '%N, %MSG mensajes. A medio camino entre aportar y hacer bulto, y sin prisa por llegar a ninguno de los dos.',
  '%MSG mensajes, %N. Das la cara lo justo para que no te echen de menos. Ni un mensaje de más.',
  '%N, %MSG mensajes. El grupo te tiene en la lista de «ya aparecerá». Aparecer, apareces. Pesar, no.',
  'Con %MSG mensajes, %N, eres un habitual. De los que se sientan al fondo y piden lo mismo de siempre.',
  '%N, %MSG mensajes. Escribes lo suficiente para que tu silencio no alarme a nadie.',
  '%MSG mensajes, %N. Vas en el pelotón, que es un sitio cómodo para no ganar nunca una puta mierda.',
  '%N, %MSG mensajes. Mitad de tabla, mitad de ganas y mitad de gracia. Todo te sale a medias, pequeña.',
  '%N, %MSG mensajes. Tus mensajes ocupan sitio. Los de arriba ocupan el grupo.',
  '%MSG mensajes, %N. El número de alguien que viene cuando se aburre de todo lo demás.',
  '%N, %MSG mensajes. Si mañana subes o bajas, nadie mira el ranking para comprobarlo.',
  '%N con %MSG mensajes. Buen ritmo para no destacar en nada. Lo estás clavando.',
  '%MSG mensajes, %N. El grupo no te debe nada y tú no le debes nada. Empate a cero, que es el resultado más triste.',
  '%N, %MSG mensajes. Hablas cuando hay tema. Nunca eres el tema.',
  '%N, %MSG mensajes. Los de arriba te quedan lejos y los fantasmas te guardan el sitio.',
];

// ═══════════════════════════════════════════════════════════════════════════
// TRAMO ALTO — sostiene el grupo de verdad.
// ═══════════════════════════════════════════════════════════════════════════

const RELEVANTE = [
  '%N, %MSG mensajes. Puta mula de carga: el grupo anda porque tú andas, y ni te quejas.',
  '%MSG mensajes, %N. El día que falta tu nombre en el chat, el chat se nota vacío. No por casualidad.',
  '%N con %MSG mensajes. Cuando alguien pregunte quién sostiene esto, se enseña este número y punto.',
  'Con %MSG mensajes, %N, eres el puto pilar de este grupo. Sin adorno. El dato.',
  'Con %MSG mensajes, %N, aquí no se habla de nada sin que aparezcas. Imprescindible. El resto, a reaccionar.',
  '%MSG mensajes, %N. Cuando tú hablas, el resto responde. Eso, cabrón, es tener el mando y lo sabes.',
  '%N con %MSG mensajes. Sigues escribiendo aunque nadie te haya preguntado nada, y aun así funciona. Ese descaro mantiene esto vivo, mi niña.',
  '%MSG mensajes, %N. Tu teclado debe de estar hecho polvo. Con ese desgaste nadie discute tu puto peso en el grupo.',
  '%N con %MSG mensajes. El grupo te necesita más de lo que tú necesitas al grupo, y se nota cada vez que abres la boca.',
  '%N con %MSG mensajes. El resto del grupo se limita a reaccionar a lo que tú sueltas. Liderazgo del chat.',
  'Con %MSG mensajes, %N, si un día te callas se va a notar. Esa es la prueba, pequeña.',
  '%MSG mensajes, %N. Has escrito más de lo que escribe un fantasma en toda su vida, y sin que nadie te lo pidiera, cabrón.',
  '%N con %MSG mensajes. Cuando entras al chat cambia el ritmo de todo el mundo. Eso es poder real.',
  'Con %MSG mensajes, %N, el grupo funciona mejor cuando tú estás activo y se nota muchísimo cuando no. Esa dependencia, cabrón, te la has currado tú.',
  '%MSG mensajes, %N. Has hecho de la cantidad una puta virtud. El grupo sin ese ruido tuyo sería un puto páramo.',
  '%N con %MSG mensajes. Has demostrado que se sostiene un chat a base de estar. Estar, cabrón, que es lo que el resto no hace.',
  '%N, %MSG mensajes. El resto desaparece el puente. Tú no. Por eso el grupo sigue abierto.',
  'Con %MSG mensajes, %N, has convertido el aparecer en el trabajo que el resto no pica, reina.',
  '%N, %MSG mensajes. El chat tiene suelo porque tú lo pones. Sin suelo, esto se hunde.',
  '%N con %MSG mensajes. El grupo te da por hecho porque eres un hecho. Los hechos no se discuten, princesa.',
  'Con %MSG mensajes, %N, alguien tiene que mantener esto con vida. Ese alguien eres tú y se ve.',
  '%MSG mensajes, %N. Pesas. El número lo dice y el chat lo confirma cada puto día.',
  'Con %MSG mensajes, %N, has dejado el listón donde el resto no llega ni de lejos.',
  '%MSG mensajes, %N. Sin ti el grupo baja de revoluciones. Contigo, corre. Ese es el parte.',
  'Con %MSG mensajes, %N, el silencio del chat te espera. Y lo rompes tú, que es lo que toca.',
  '%N, %MSG mensajes. El resto tiene el visto. Tú tienes el hilo. El hilo manda, cabrón.',
  '%N, %MSG mensajes. Eres la razón por la que este grupo no es un cementerio de mensajes sin leer, muñeca.',
  '%MSG mensajes, %N. Si algún día te vas de este grupo va a haber luto. Del de verdad.',
  '%N, %MSG mensajes. Cuando este grupo se mueve, tu nombre está en medio.',
  '%N, %MSG mensajes. Escribes tanto que el grupo podría funcionar solo con tus mensajes citados.',
];

// ═══════════════════════════════════════════════════════════════════════════
// COMANDO
// ═══════════════════════════════════════════════════════════════════════════

async function cmdRelevance(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }

  const target = getTargetOrSelf(msg);

  // Del owner principal NO se contesta. Ni una cifra, ni un veredicto, ni un
  // "no hay datos": silencio.
  //
  // Antes se le fabricaba un conteo verosímil (1.400-2.300 y subiendo tres al
  // día) para que no cantara que es el dueño. El problema es que ese número
  // contradecía al resto del bot: sus mensajes no se cuentan, así que no sale
  // en *!count*, no sale en los tops y no sale en *!vs* — pero *!relevancia* le
  // atribuía casi dos mil. Cualquiera que compare las dos cosas ve que ahí pasa
  // algo. Un dato inventado que choca con los demás delata más que no responder.
  if (isMainOwner(target, false, groupMeta)) return SIN_SERVICIO;

  const count = await getUserCount(jid, target);

  const pool =
    count >= HIGH_MIN ? RELEVANTE :
    count >= MID_MIN  ? INTERMEDIO :
                        PARASITO;
  const tierKey =
    pool === RELEVANTE ? 'alto' : pool === INTERMEDIO ? 'medio' : 'bajo';

  const num = target.split('@')[0].split(':')[0];
  const nm = `@${num}`;
  const label = count === 1 ? '1 mensaje' : `${fmt(count)} mensajes`;
  // "%MSG mensajes" se sustituye entero por la etiqueta ya concordada: si no, con
  // exactamente 1 mensaje la cabecera decia "1 mensaje" y la frase, dos lineas
  // mas abajo, "1 mensajes".
  const phrase = pickFresh(pool, `${jid}|relevancia|${tierKey}`)
    .replace(/%N/g, nm)
    .replace(/%MSG mensajes/g, label)
    // %MSG Y NO %C, Y EL CAMBIO TIENE MOTIVO.
    // 
    // %C significaba DOS COSAS distintas en el bot: aqui, el numero de mensajes; y
    // en robo.js, aura.js y sus pools, una cantidad de aura. Las dos se pintan con
    // fmt(), asi que una frase movida de una familia a la otra imprimia un numero
    // perfectamente creible y completamente equivocado — una apuesta donde tocaba
    // un conteo— sin fallar ni avisar. `npm run placeholders` no lo podia cazar
    // porque las dos familias declaraban %C como valido.
    // 
    // Con un nombre propio, ese error deja de ser silencioso: una frase en el sitio
    // equivocado saca un %MSG o un %C literal y el validador lo caza al instante.
    .replace(/%MSG/g, fmt(count));

  const text =
    `*RELEVANCIA EN EL GRUPO*\n` +
    `\n` +
    `${nm} — *${label}*\n\n` +
    `${phrase}`;

  await sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
}

module.exports = { cmdRelevance };
