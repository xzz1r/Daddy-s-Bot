// !iq — mide el coeficiente intelectual.
//
// No es un comando de porcentaje. Los de percent.js sacan un 0-100 y lo cuentan
// como "eres un X% de algo"; aquí la gracia está en la CIFRA de IQ, que tiene
// una escala reconocible (100 es la media, 130 es superdotación) y la frase
// puede jugar con la cifra. Lo que ya NO hace es comparar al que la saca con un
// animal o un objeto: el chiste era el objeto y valía para cualquiera. Lo pidió
// el dueño: insulto directo y vulgar, sobre lo que esa persona hace.
//
// TOTALMENTE ALEATORIO: no hay sesgo por rol ni amaño del owner. Aquí a todo el
// mundo le puede caer un 62 o un 141.
//
// Es el unico que queda asi. !linda y !fea lo eran y pasaron a la curva —
// repartian un piropo el 31 % de las veces siendo de los mas usados—, y !fiel e
// !infiel tiran uniforme pero SI llevan el amaño del dueño.

const { getTargetOrSelf } = require('../utils/wa');
const { pickFresh } = require('../utils/helpers');

// Tramos. El reparto está pensado para que lo divertido salga a menudo: casi la
// mitad de las tiradas caen en los dos tramos bajos, que son los que tienen las
// comparaciones. El de genio es raro a propósito — si saliera cada dos por tres
// dejaría de tener gracia que salga.
//
//   abismo   55-74   el hundimiento, a pelo
//   bajo     75-89   por debajo de la media, y se nota en lo que hace
//   medio    90-109  la media: ni frío ni caliente
//   alto    110-129  listo de verdad
//   genio   130-145  otra liga
const TRAMOS = [
  { clave: 'abismo', min: 55,  max: 74,  peso: 0.28 },
  { clave: 'bajo',   min: 75,  max: 89,  peso: 0.24 },
  { clave: 'medio',  min: 90,  max: 109, peso: 0.26 },
  { clave: 'alto',   min: 110, max: 129, peso: 0.16 },
  { clave: 'genio',  min: 130, max: 145, peso: 0.06 },
];

function tirarIQ() {
  let r = Math.random();
  for (const t of TRAMOS) {
    r -= t.peso;
    if (r <= 0) {
      return { clave: t.clave, iq: t.min + Math.floor(Math.random() * (t.max - t.min + 1)) };
    }
  }
  const t = TRAMOS[TRAMOS.length - 1];
  return { clave: t.clave, iq: t.min + Math.floor(Math.random() * (t.max - t.min + 1)) };
}

// %IQ se sustituye por la cifra que salió, para que la frase pueda jugar con
// ella ("tienes 62 y el termostato de tu casa tiene 68").
const ABISMO = [
  'Con %IQ el listón no está bajo: está enterrado, con lápida y con flores. Descanse en paz tu capacidad de razonar, inútil.',
  'Con %IQ ni el corrector automático te salva. Ese pobre lleva años intentando entenderte y se ha rendido, mi niña.',
  '%IQ. Con esa cifra no se aprueba nada, ni siquiera existir. Y aun así aquí estás, opinando.',
  'Con %IQ eres el eslabón que la evolución dejó por error. Y la evolución no suele dejar cabos sueltos.',
  '%IQ. Con esa cifra no deberías tener permiso para opinar en un grupo, y mucho menos para votar.',
  'Con %IQ cada mensaje tuyo baja la media del grupo. Y el grupo ya iba justito.',
  '%IQ de IQ. Tienes la cabeza para llevar el pelo y poco más, bonita.',
  '%IQ. Lo tuyo no es falta de estudios. Es falta de materia prima.',
  'Con %IQ te cuesta seguir una conversación de tres personas. Por eso te ríes cuando se ríen los demás, pequeña.',
  '%IQ. Hay gente que piensa antes de hablar. Tú no haces bien ninguna de las dos cosas.',
  '%IQ de IQ. Si pensar doliera, irías por la vida sin un rasguño.',
  'Con %IQ necesitas un tutorial para abrir un tutorial, reina.',
  '%IQ. Eres la razón por la que los productos traen las instrucciones en dibujos.',
  'Con %IQ la frase más compleja que entiendes es «hay comida».',
  '%IQ. No hace falta que te hagas pasar por gilipoyas: te sale de serie.',
  'Con %IQ tu cerebro trabaja a media jornada y encima pide la baja, chiquitina.',
  '%IQ. La neurona que tienes está sola, aburrida y buscando trabajo en otra cabeza.',
  'Con %IQ te tienen que repetir hasta los chistes malos, pequeña.',
  '%IQ de IQ. Te pierdes en la conversación en cuanto alguien usa una palabra de tres sílabas.',
  'Con %IQ lo que para otros es sentido común, para ti es un máster, cariño.',
  '%IQ. Tu cabeza hace eco. Se oye desde aquí.',
  'Con %IQ confundes tener razón con gritar más. Y ni gritas bien.',
  '%IQ de IQ. Lees un mensaje largo y te quedas en la primera línea con la boca abierta, preciosa.',
  '%IQ. Si la estupidez cotizara, estarías jubilado con la máxima.',
  'Con %IQ cualquier discusión contigo se gana en dos mensajes. El segundo es para que lo entiendas.',
  '%IQ de IQ. Eres de la gente que aplaude cuando aterriza el avión y cree que ha ayudado, pequeña.',
  '%IQ. Pensar contigo en el grupo es jugar con uno menos.',
  'Con %IQ opinas de todo con la seguridad que solo da no entender nada.',
  '%IQ. Tu mejor idea del año la tuvo otra persona y tú la repetiste mal.',
  '%IQ. Llegas a las conclusiones como llegas a todo: tarde, mal y con prisa por equivocarte.',
];

const BAJO = [
  '%IQ. Estás justo por debajo de la media y se te nota en cada intervención que haces en el grupo, pringado.',
  'Con %IQ entiendes los chistes tres segundos después que el resto y aun así te ríes por si acaso, cielo.',
  'Con %IQ te manejas en lo básico y te pierdes en cuanto la conversación pasa de dos ideas seguidas, cabrón.',
  '%IQ. Por debajo de la media, por encima del suelo, y sin ninguna intención de moverte de ahí, chiquitina.',
  'Con %IQ tomas decisiones rápidas. Malas, pero rápidas. Y encima las llamas instinto, gilipoyas.',
  'Con %IQ funcionas bien mientras nadie te cambie nada. En cuanto cambia algo, se te ve el cartón, pequeña.',
  'Con %IQ te va justo para lo cotidiano y fatal para cualquier cosa que exija pensar dos pasos por delante, inútil.',
  '%IQ de IQ. El nivel de quien entiende la mitad de las cosas y actúa como si hubiera entendido el doble, preciosa.',
  '%IQ. Ni brillas ni preocupas: eres el ruido de fondo del grupo con un número puesto, muñeca.',
  'Con %IQ sabes lo justo para meterte en discusiones que no puedes ganar. Y te metes en todas.',
  '%IQ. Por debajo de la media pero con la seguridad de un catedrático. Esa mezcla es la que da problemas.',
  'Con %IQ entiendes las cosas cuando te las dicen dos veces. El problema es que solo se dicen una, nena.',
  '%IQ de IQ. El nivel de quien pone una alarma y luego calcula cuántas veces puede posponerla.',
  'Estás en la franja del que lee las instrucciones después de romper la pieza. Y ni entonces las lee entera.',
  '%IQ. Un escalón por debajo del que hay que ser para que te tomen en serio en una discusión seria, pequeña.',
  'Con %IQ das el nivel para lo simple y te caes en cuanto hay que sostener un razonamiento largo.',
  'Tienes el criterio de quien elige por cansancio. Nunca decide: se rinde y llama a eso decidir, mi niña.',
  'Con %IQ vas tirando. Que es exactamente lo que se dice de alguien cuando no se puede decir nada mejor.',
  '%IQ de IQ. El tramo de los que se saben la teoría de memoria y no la entienden ni por accidente.',
  '%IQ. Un poco por debajo de lo normal, un poco por encima de lo preocupante. El limbo exacto.',
  'Con %IQ te apañas. Apañarse es lo que hace la gente que no llega y llevas años apañándote, cielo.',
  '%IQ de IQ. Justo lo que hace falta para funcionar sin que nadie te pregunte nunca la opinión.',
  '%IQ. El número que sale cuando alguien tiene ganas pero no herramientas. Y tú ni las ganas, la verdad, pringado.',
  '%IQ de IQ. Justo lo que hace falta para discutir de oídas y callarte cuando llega un dato, muñeca.',
  '%IQ. Un escalón por debajo de tomar nota, y encima te ofendes si te la toman. Qué asco de orgullo, pequeña.',
  'Con %IQ vas tirando hasta que hay que leer el segundo párrafo. Ahí se te acaba el combustible, pringado.',
  '%IQ. Te falta un hervor y te sobra seguridad. Mala mezcla para abrir la boca en el grupo.',
  'Con %IQ te enteras de los planes cuando ya se han cancelado, chiquitina.',
  '%IQ de IQ. No te da ni para ganar una discusión ni para perderla con dignidad.',
  'Con %IQ cometes los mismos errores, cada vez con más confianza.',
];

const MEDIO = [
  '%IQ. Tienes los cojones de ser exactamente igual que todo el mundo y encima no te da vergüenza, bonita.',
  '%IQ. Eres tan puñeteramente medio que si te clonaran cien veces no cambiaría ni la estadística ni el ambiente, corazón.',
  '%IQ de IQ. Si la mediocridad pagara impuestos tú solo financiarías una autopista, cabrón.',
  '%IQ. Eres el NPC del grupo. Estás ahí, dices cuatro frases genéricas y nadie nota si te desconectan.',
  '%IQ de IQ. Mierda, eres tan promedio que si buscas tu nombre en Google sale "quizás quisiste decir otro".',
  '%IQ de IQ. Coño, eres tan del promedio que si te pusieras de perfil intelectualmente desaparecerías, cielo.',
  '%IQ. Justo la media. Ni un gramo más, ni un gramo de gracia.',
  'Con %IQ piensas lo que piensa todo el mundo, cinco minutos después.',
  '%IQ de IQ. Tienes opiniones de segunda mano y las defiendes como si fueran tuyas, pequeña.',
  '%IQ. Suficiente para no dar pena y demasiado poco para dar envidia.',
  'Con %IQ eres la persona a la que se le explica algo una vez y lo entiende regular.',
  '%IQ. Nadie te va a pedir consejo ni te va a pedir perdón. Existes en el término medio, preciosa.',
  '%IQ de IQ. Si hicieran un examen del grupo, sacarías un cinco y lo celebrarías.',
  'Con %IQ te sabes todas las respuestas que ya estaban en el primer resultado de Google.',
  '%IQ. Lo justo para seguir la conversación. Nunca para llevarla.',
  '%IQ de IQ. Tu mayor logro intelectual es no estar a la cola del grupo. Por poco.',
  'Con %IQ no te equivocas mucho. Tampoco aciertas nada que no acertara ya cualquiera, princesa.',
  '%IQ. Eres el término medio hecho persona, con todo el morbo que tiene un término medio.',
  '%IQ de IQ. Estás en la mitad de la tabla y ahí te vas a quedar, que para subir hay que pensar, pequeña.',
  'Con %IQ repites chistes que ya viste en otro grupo y encima los cuentas peor.',
  '%IQ. Nadie va a llamarte ni para una trivia ni para un consejo. Para rellenar mesa, quizás.',
  '%IQ de IQ. Tienes la cabeza justa para no meterte en líos, y ni una chispa para salir de uno.',
  'Con %IQ lo tuyo es entender las cosas cuando todo el mundo ya está hablando de otra.',
  '%IQ. Aprobado raspado, y encima te crees de la élite, nena.',
  '%IQ de IQ. Cuando hablas, nadie aprende nada nuevo. Ni tú.',
  'Con %IQ piensas lo justo para que nadie se preocupe por ti. Tampoco se fija nadie.',
  '%IQ. La cifra de alguien que no ha leído un libro entero desde el colegio y no lo echa de menos.',
  '%IQ de IQ. Tienes ideas, sí. Todas vistas ya.',
  'Con %IQ eres de la gente que dice «yo tengo mi propia forma de pensar». No la tienes.',
  '%IQ. El número que se saca contestando el examen por intuición. Y la intuición también la tienes en la media, bonita.',
];

const ALTO = [
  'Con %IQ podrías estar resolviendo ecuaciones y estás resolviendo si contestar o no a un mensaje con un puto emoji.',
  '%IQ. Tienes la cabeza de alguien que podría cambiar las cosas y el culo pegado al sofá como todos los demás, cabrón.',
  '%IQ. Cabeza buena de verdad. Qué pena que la gastes discutiendo en un grupo de WhatsApp.',
  'Con %IQ ves venir las tonterías del grupo antes que nadie. Y aun así te metes, chiquitina.',
  '%IQ de IQ. Tienes de las mejores cabezas de aquí, que con este nivel tampoco es decir mucho, pequeña.',
  '%IQ. Piensas rápido, hablas bien y lo usas para ganar discusiones que no importan una mierda.',
  'Con %IQ podrías estar haciendo algo grande. Y aquí estás, con tu IQ en un bot, cielo.',
  '%IQ de IQ. Se te nota la cabeza. También se te nota lo mucho que te gusta que se te note.',
  '%IQ. Por encima de la media y por debajo de lo que tú te crees, reina.',
  'Con %IQ entiendes las cosas a la primera. Lo jodido es tener que esperar a que el resto llegue.',
  '%IQ. Mente de las buenas atrapada en un grupo de los malos.',
  '%IQ de IQ. Cuando hablas se nota. Cuando callas, también: se nota el desprecio.',
  'Con %IQ te sobra cabeza para todo menos para cerrar la boca a tiempo, pequeña.',
  '%IQ. Tienes argumentos. El problema es que aquí nadie los quiere oír.',
  '%IQ de IQ. Buena cabeza para lo difícil y ninguna para lo fácil, como saludar.',
  'Con %IQ ganas todas las discusiones del grupo. Te lo dirían si alguien las leyera enteras, corazón.',
  '%IQ. Se te da bien pensar. Hacer, ya lo veremos.',
  '%IQ de IQ. En otro sitio serías normal. Aquí pareces un genio, y eso es culpa del grupo, cariño.',
  'Con %IQ tienes razón casi siempre. Y te encanta que se sepa, que es lo que te hace insoportable.',
  '%IQ. Cabeza de sobra y paciencia de mierda. Mala combinación para estar aquí.',
  '%IQ de IQ. Te lees los mensajes largos enteros. Especie en extinción.',
  'Con %IQ detectas un bulo a la primera. Lo que no detectas es cuándo sobra tu corrección, pequeña.',
  '%IQ. Das para mucho más que esto, y aquí estás, dándolo todo en un chat.',
  '%IQ de IQ. La cabeza te funciona. El problema es que tienes que usarla aquí, con esta gente alrededor, princesa.',
  'Con %IQ te enteras de todo antes. Y lo cuentas después, para que se note que ya lo sabías.',
  '%IQ. Buena cifra. No la vayas enseñando, que aquí se pica la gente.',
  '%IQ de IQ. Te ha tocado cerebro en la lotería genética. Lo demás ya no te tocó.',
  'Con %IQ podrías convencer a cualquiera de cualquier cosa. Te conformas con tener razón en el grupo.',
  '%IQ. Tu problema no es la cabeza. Es que te aburre la gente que no la tiene, y aquí hay mucha.',
  '%IQ de IQ. Te sobra cerebro para este grupo y te falta valor para irte a uno mejor.',
];

const GENIO = [
  '%IQ. Superdotación en un grupo de WhatsApp. El universo tiene un sentido del humor de mierda.',
  'Con %IQ podrías estar en cualquier sitio y has elegido esto. Es la mayor tontería que has hecho en tu vida, muñeca.',
  '%IQ de IQ. Aquí dentro eres lo más listo que hay, y el bot incluido.',
  '%IQ. Cerebro de sobra. Lo desperdicias con una elegancia que da rabia.',
  'Con %IQ ves las cosas antes de que pasen. Lo de este grupo no hacía falta verlo venir.',
  '%IQ de IQ. Otra liga. Una liga donde nadie del grupo ha jugado nunca ni va a jugar.',
  '%IQ. Lo tuyo es de nacimiento, y lo sabes, y lo sabemos. Qué asco.',
  'Con %IQ lo difícil no es pensar. Lo difícil es aguantar a los demás.',
  '%IQ de IQ. Entiendes cosas que el resto no sabe ni pronunciar. Y aun así te ríes con memes de perros, pequeña.',
  '%IQ. Esa cifra no se saca con suerte. Se saca con una cabeza que no te mereces.',
  'Con %IQ la gente te pide opinión y luego hace lo contrario. Y siempre se equivoca, bonita.',
  '%IQ de IQ. En un examen habrías terminado antes de que el resto encontrara el bolígrafo.',
  '%IQ. Genio certificado. Lo único que no calculaste es en qué grupo te ibas a meter.',
  'Con %IQ te sobra cabeza para dirigir esto y te faltan ganas de hacerlo. Menos mal para todos, mi niña.',
  '%IQ. Mente privilegiada. Lástima que el móvil sea el de siempre y el grupo, este.',
  'Con %IQ hay gente que cambia el mundo. Tú cambias de conversación cuando se pone aburrida, que es siempre.',
  '%IQ de IQ. Tienes tanta cabeza que contradecirte da miedo. Y lo disfrutas, cabrón.',
  '%IQ. La media del grupo sube cuando entras y baja cuando te vas. Así de simple, así de injusto, pequeña.',
  'Con %IQ tienes todo para triunfar menos una cosa: ganas de aguantar a gente normal.',
  '%IQ de IQ. Por fin alguien que entiende el bot mejor que el bot.',
];

// Los tramos no se ordenan: la eleccion es plana (ver helpers.js). En los
// peyorativos eso significa que la comparacion mas floja sale tanto como la mas
// humillante, asi que el pool no puede llevar relleno.
const POOLS = {
  abismo: ABISMO,
  bajo:   BAJO,
  medio:  MEDIO,
  alto:   ALTO,
  genio:  GENIO,
};

// Etiqueta corta que acompaña a la cifra, para que se lea como un informe.
const ETIQUETA = {
  abismo: 'Deficiencia severa',
  bajo:   'Por debajo de la media',
  medio:  'Media',
  alto:   'Por encima de la media',
  genio:  'Superdotación',
};

async function cmdIQ(sock, msg) {
  const jid = msg.key.remoteJid;
  const target = getTargetOrSelf(msg);

  const { clave, iq } = tirarIQ();
  const nm = `@${target.split('@')[0]}`;
  const frase = pickFresh(POOLS[clave], `${jid}|iq|${clave}`)
    .replace(/%IQ/g, String(iq))
    .replace(/\[nombre\]/g, nm);

  const text =
    `*${nm} tiene ${iq} de IQ*\n` +
    `_${ETIQUETA[clave]}_\n\n` +
    `${frase}`;

  await sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
}

module.exports = { cmdIQ, tirarIQ, TRAMOS, POOLS };
