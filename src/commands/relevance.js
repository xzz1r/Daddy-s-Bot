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
  '%N, %MSG mensajes. El grupo no para de hablar y tú has aportado lo que dura un polvo con prisas.', // ROCKSTAR
  '%MSG mensajes, %N. Eso lo escribe cualquiera en una discusión de media hora. Tú has tardado toda tu estancia aquí.',
  '%N, %MSG mensajes. Escribes menos en el grupo que en el buscador de incógnito, y allí escribes cosas peores.', // ROCKSTAR
  'Con %MSG mensajes, %N, tu nombre aparece en la lista de miembros y en poco más.',
  '%MSG mensajes, %N. Si mañana te vas, lo único que cambia es el número de miembros, y ni ese miembro se echaba de menos.', // ROCKSTAR
  '%N, %MSG mensajes. Ni quien te añadió se acuerda ya de para qué lo hizo.',
  '%MSG mensajes, %N. Entras, miras y te vas sin decir nada, como en el sex shop del polígono.', // ROCKSTAR
  '%N, %MSG mensajes. Hablas tan poco que cuando escribes algo el grupo piensa que te han robado el móvil, princesa.',
  '%MSG mensajes, %N. Ocupas una plaza que alguien con ganas de hablar usaría mejor, gorrón de mierda.',
  '%N, %MSG mensajes. Todo lo que has aportado cabe en un mensaje subido de tono, y ni eso has mandado.', // ROCKSTAR
  'Con %MSG mensajes, %N, eres la persona que todos tienen agregada y nadie sabría describir.',
  '%N, %MSG mensajes. Para lo poco que escribes, mejor manda fotos, que es lo único que el grupo esperaría de ti.', // ROCKSTAR
  '%MSG mensajes, %N. El chat se mueve, se ríe, se pelea, y tú en la puta esquina con los brazos cruzados.',
  '%N, %MSG mensajes. Cuando apareces nadie sabe a qué vienes, y tú tampoco.',
  '%N, %MSG mensajes. Callarte no te da misterio ni morbo: en la cama tampoco funciona.', // ROCKSTAR
  '%MSG mensajes, %N. Estás en el grupo como quien va a una fiesta a no hablar con nadie y a quedarse junto a la comida, pequeña.',
  '%N, %MSG mensajes. Aquí quien no escribe no existe, y tú llevas mucho tiempo sin existir.',
  '%N con %MSG mensajes. Un número así no se consigue por timidez. Se consigue porque todo te importa una mierda.',
  '%MSG mensajes, %N. Si el grupo cobrara por estar, te irías, como te vas de todas las camas antes del desayuno.', // ROCKSTAR
  '%N, %MSG mensajes. Lo más largo que has escrito aquí es tu nombre de perfil.',
  '%MSG mensajes, %N. No aportas temas, no aportas risas y no aportas ni un mal calentón.', // ROCKSTAR
  '%N, %MSG mensajes. Te llevas la diversión de los demás sin dejar ni las gracias. Gorronería de nivel olímpico.',
  'Con %MSG mensajes, %N, tienes el perfil de quien entra en los grupos a hacer bulto, y el encargo lo cumples de maravilla.',
  '%N, %MSG mensajes. El día que escribas algo, el grupo va a pensar que te han hackeado la cuenta para mandar porno.', // ROCKSTAR
  '%MSG mensajes, %N. Si el silencio fuera aura, estarías forrado. No lo es, y estás en la ruina.',
  '%N, %MSG mensajes. Mucho mirar y poco mojarte, cagón, que el grupo no es un escaparate.', // ROCKSTAR
  '%N, %MSG mensajes. Si te vas, el grupo se entera por la lista, como se enteró tu ex de que habías terminado: tarde y sin notar diferencia.', // ROCKSTAR
  '%MSG mensajes, %N. A estas alturas callarte ya es tu único talento.',
  '%N, %MSG mensajes. Estás de adorno en el grupo, y en la cama de alguien no has estado ni de adorno.', // ROCKSTAR
  '%N, %MSG mensajes. Vienes, cotilleas y te piras sin decir ni una palabra, como un turista barato.',
];

// ═══════════════════════════════════════════════════════════════════════════
// TRAMO MEDIO — está, pero no pesa. Ni fantasma ni referente.
// ═══════════════════════════════════════════════════════════════════════════

let INTERMEDIO = [
  '%N, %MSG putos mensajes. Suficiente para que te saluden, poco para que te inviten a nada que importe.',
  '%N, %MSG mensajes. Llevas tiempo de sobra aquí y lo único que has dejado es una mancha pequeñita.', // ROCKSTAR
  '%MSG mensajes, %N. Normal de cojones: nadie te señala ni para bien ni para mal, y ahí te pudres.',
  '%MSG mensajes, %N. Sales en la foto de grupo, en la segunda fila, que es donde se ponen los que no ligan en ninguna boda.', // ROCKSTAR
  'Con %MSG mensajes, %N, cumples con lo mínimo y ahí te plantas. Lo mínimo, en tu caso, es todo lo que vas a dar nunca.',
  '%N, %MSG mensajes. Relleno de calidad: si faltas una semana, alguien lo nota el domingo, como un rollo de verano: bien, pero sin más.', // ROCKSTAR
  '%MSG mensajes, %N. Hablas lo bastante para que te conozcan y lo justo para que no te recuerden.',
  '%N, %MSG mensajes. En la tabla, como en la cama: siempre en el medio, siempre en la misma postura.', // ROCKSTAR
  'Con %MSG mensajes, %N, entras en el tema cuando ya está masticado y opinas con la discusión fría, chiquitina.',
  '%N, %MSG mensajes. Opinas y el grupo sigue a lo suyo, como quien sigue durmiendo cuando le tocas la espalda a las tantas.', // ROCKSTAR
  '%MSG mensajes, %N. Apareces, dices algo correcto y te vas. Correcto es lo peor que se puede ser aquí.',
  '%N, %MSG mensajes. Aquí dentro eres un «ah, sí, también está», que es lo mismo que dicen de ti en los tríos.', // ROCKSTAR
  '%MSG mensajes, %N. Das para un meme al mes, cuando los que llevan el grupo dan para uno al día.',
  '%N, %MSG mensajes. Lo que escribes se lee de pasada, como unos preliminares con prisa, y lo entierra el siguiente meme.', // ROCKSTAR
  '%N con %MSG mensajes. Tienes lo suficiente para opinar y ninguna opinión que alguien cite.',
  '%MSG mensajes, %N. Estás en el grupo con un pie dentro y el otro quién sabe dónde, y la mano, mejor no preguntar.', // ROCKSTAR
  '%N, %MSG mensajes. A medio camino entre aportar y hacer bulto, y sin prisa por llegar a ninguno de los dos.',
  '%MSG mensajes, %N. Das lo justo para que no se quejen, ni un mensaje más. En la cama dicen que igual.', // ROCKSTAR
  '%N, %MSG mensajes. El grupo te tiene en la lista de «ya aparecerá»: apareces, pero no pesas.',
  'Con %MSG mensajes, %N, sueltas un «jaja» de vez en cuando y te vas. Ni frío ni calor: bulto.',
  '%N, %MSG mensajes. Escribes lo suficiente para que tu silencio no alarme, y gimes lo suficiente para que no pregunten.', // ROCKSTAR
  '%MSG mensajes, %N. Vas en el pelotón, que es un sitio cómodo para no ganar nunca una puta mierda.',
  '%N, %MSG mensajes. Te llega el chiste, contestas con un emoji flojo y el grupo ya está en el siguiente, pequeña.',
  '%N, %MSG mensajes. Tus mensajes ocupan sitio, pero los de arriba ocupan el grupo.',
  '%MSG mensajes, %N. El número de quien entra al grupo cuando se aburre del porno.', // ROCKSTAR
  '%N, %MSG mensajes. Si mañana subes o bajas, nadie mira el ranking para comprobarlo.',
  '%N con %MSG mensajes. Buen ritmo para no destacar en nada, y lo estás clavando.',
  '%MSG mensajes, %N. El grupo no te debe nada y tú no le debes nada. Empate a cero, que es como acaban tus citas.', // ROCKSTAR
  '%N, %MSG mensajes. Hablas cuando hay tema, pero el tema nunca eres tú.',
  '%N, %MSG mensajes. Los de arriba te quedan lejos y los fantasmas te guardan el sitio.',
];

// ═══════════════════════════════════════════════════════════════════════════
// TRAMO ALTO — sostiene el grupo de verdad.
// ═══════════════════════════════════════════════════════════════════════════
//
// Se le halaga, y sin veneno detrás (lo pidió el dueño el 18 oct). Antes cada
// frase le daba el mérito y se lo cobraba en la misma línea: «sostienes el
// grupo con el pulgar y la vida con nada», «fuera no te espera nadie». Quien
// escribe setecientos mensajes es justo lo que el bot quiere, y se le dice con
// carisma, no de rodillas. La capa 126 vigila que no vuelva el veneno.

const RELEVANTE = [
  '%N, %MSG mensajes. El grupo anda porque tú andas, y lo llevas con una soltura que da gusto.',
  '%MSG mensajes, %N. El día que no escribes, el chat se queda en silencio y alguien te busca por privado con ganas.', // ROCKSTAR
  '%N con %MSG mensajes. Sostienes el grupo, y se te ve tan a gusto encima que hay quien quiere probar debajo.', // ROCKSTAR
  'Con %MSG mensajes, %N, eres el puto pilar de este grupo, y los pilares no se discuten.',
  'Con %MSG mensajes, %N, no hay conversación buena en la que no aparezcas, ni fantasía del grupo en la que no salgas.', // ROCKSTAR
  '%MSG mensajes, %N. Cuando tú hablas el resto responde, y alguno obedece con gusto. Eso, cabrón, es tener el mando.', // ROCKSTAR
  '%N con %MSG mensajes. Escribes sin esperar a que te pregunten, y ese descaro mantiene esto vivo, mi niña.',
  '%MSG mensajes, %N. Con ese volumen y esa constancia, nadie discute tu puto peso en el grupo.',
  '%N con %MSG mensajes. Los temas buenos de esta semana llevan tu nombre, y los sueños húmedos de alguno, también.', // ROCKSTAR
  '%N con %MSG mensajes. El resto del grupo reacciona a lo que sueltas tú, y eso no lo consigue cualquiera.',
  'Con %MSG mensajes, %N, si un día te callas se va a notar, y hay quien lo notaría en la cama.', // ROCKSTAR
  '%MSG mensajes, %N. Has escrito más de lo que escribe un fantasma en toda su vida, y cada mensaje ha sumado.',
  '%N con %MSG mensajes. Entras al chat y en cinco minutos todo el mundo está contestándote, y alguno sudando.', // ROCKSTAR
  'Con %MSG mensajes, %N, el grupo depende de ti, y has hecho que eso parezca fácil.',
  '%MSG mensajes, %N. Has hecho de la cantidad una puta virtud, y cada mensaje tuyo tiene respuesta.',
  '%N con %MSG mensajes. El chat va a tu ritmo, y quien quiera seguirte tiene que correrse. Correr, perdón.', // ROCKSTAR
  '%N, %MSG mensajes. En los puentes desaparece todo el mundo menos tú, y el chat sigue vivo por tu culpa.',
  'Con %MSG mensajes, %N, aparecer cada día lo haces de cine, reina.',
  '%N, %MSG mensajes. Si dejas de escribir esto se hunde, así que ni se te ocurra.',
  '%N con %MSG mensajes. El grupo ya da por hecho que vas a estar, y tú cumples siempre, en el chat y donde haga falta.', // ROCKSTAR
  'Con %MSG mensajes, %N, este chat sigue respirando porque no dejas de escribir.',
  '%MSG mensajes, %N. En el grupo pesas, y cada conversación que arrancas acaba con alguien acalorado.', // ROCKSTAR
  'Con %MSG mensajes, %N, has dejado el listón donde el resto no llega.',
  '%MSG mensajes, %N. Sin ti el grupo se enfría, y contigo se pone a mil, y no solo el grupo.', // ROCKSTAR
  'Con %MSG mensajes, %N, cuando el chat se queda callado, eres quien lo arranca.',
  '%N, %MSG mensajes. El resto tiene el visto, tú tienes el hilo, y más de uno te dejaría tirar de él hasta el final.', // ROCKSTAR
  '%N, %MSG mensajes. Eres la razón de que este grupo no sea un cementerio, muñeca.',
  '%MSG mensajes, %N. Si un día te pierdes, el grupo va a ir a buscarte por privado en menos de una hora.',
  '%N, %MSG mensajes. Cuando este grupo se mueve, tu nombre está en medio, y no es casualidad.',
  '%N, %MSG mensajes. Escribes tanto y tan bien que el grupo podría funcionar solo con lo tuyo.',
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

module.exports = { cmdRelevance, _RELEVANTE: RELEVANTE };
