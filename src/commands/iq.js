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
  'Con %IQ ni el corrector automático te salva. Ese pobre lleva años intentando entenderte y se ha rendido.',
  '%IQ. Con esa cifra no apruebas ni existir, y aun así aquí estás, opinando.',
  'Con %IQ eres el eslabón que la evolución dejó por error. Y la evolución no suele dejar cabos sueltos.',
  '%IQ. Con esa cifra no deberías tener permiso para opinar en un grupo, y mucho menos para votar.',
  'Con %IQ cada mensaje tuyo baja la media del grupo. Y el grupo ya iba justito.',
  '%IQ de IQ. Tienes la cabeza para llevar el pelo y poco más.',
  '%IQ. Ya podías estudiar lo que quisieras: aquí falta materia prima.',
  'Con %IQ te cuesta seguir una conversación de tres personas. Por eso te ríes cuando se ríen los demás.',
  '%IQ. Lo normal es pensar antes de hablar, y tú no haces bien ninguna de las dos cosas.',
  '%IQ de IQ. Si pensar doliera, irías por la vida sin un rasguño.',
  'Con %IQ necesitas un tutorial para abrir un tutorial.',
  '%IQ. Eres la razón por la que los productos traen las instrucciones en dibujos.',
  'Con %IQ la frase más compleja que entiendes es «hay comida».',
  '%IQ. No hace falta que te hagas pasar por gilipoyas: te sale de serie.',
  'Con %IQ tu cerebro trabaja a media jornada y encima pide la baja.',
  '%IQ. La neurona que tienes está sola, aburrida y buscando trabajo en otra cabeza.',
  'Con %IQ te tienen que repetir hasta los chistes malos.',
  '%IQ de IQ. Te pierdes en la conversación en cuanto alguien usa una palabra de tres sílabas.',
  'Con %IQ lo que para otros es sentido común, para ti es un máster.',
  '%IQ. Tienes la cabeza tan hueca que hace eco desde aquí.',
  'Con %IQ confundes tener razón con gritar más. Y ni gritas bien.',
  '%IQ de IQ. Lees un mensaje largo y te quedas en la primera línea con la boca abierta.',
  '%IQ. Si la estupidez cotizara, estarías jubilado con la máxima.',
  'Con %IQ cualquier discusión contigo se gana en dos mensajes. El segundo es para que lo entiendas.',
  '%IQ de IQ. Eres de la gente que aplaude cuando aterriza el avión y cree que ha ayudado.',
  '%IQ. Pensar contigo en el grupo es jugar con uno menos.',
  'Con %IQ opinas de todo con la seguridad que solo da no entender nada.',
  '%IQ. Tu mejor idea del año la tuvo otra persona y tú la repetiste mal.',
  '%IQ. Llegas a las conclusiones como llegas a todo: tarde, mal y con prisa por equivocarte.',
];

const BAJO = [
  '%IQ. Por debajo de la media, pringado, y cada vez que opinas alguien contesta «¿qué cojones dices?».',
  'Con %IQ entiendes los chistes tres segundos después que el resto y aun así te ríes por si acaso.',
  'Con %IQ te manejas en lo básico y te pierdes en cuanto la conversación pasa de dos ideas seguidas, cabrón.',
  '%IQ. Por debajo de la media, por encima del suelo, y a gusto de cojones ahí abajo.',
  'Con %IQ tomas decisiones rápidas, gilipoyas, malas pero rápidas, y encima las llamas instinto.',
  'Con %IQ funcionas bien mientras nadie te cambie nada. En cuanto cambia algo, se te ve el cartón.',
  'Con %IQ eres inútil para todo lo que exija pensar más de un paso por delante, o sea, para casi todo.',
  '%IQ de IQ. El nivel de quien entiende la mitad de las cosas y actúa como si hubiera entendido el doble.',
  '%IQ. Ni brillas ni preocupas: eres el ruido de fondo del grupo con un número puesto.',
  'Con %IQ sabes lo justo para meterte en discusiones que no puedes ganar. Y te metes en todas.',
  '%IQ. Por debajo de la media pero con la seguridad de un catedrático. Esa mezcla es la que da problemas.',
  'Con %IQ entiendes las cosas cuando te las dicen dos veces. El problema es que solo se dicen una.',
  '%IQ de IQ. El nivel de quien pone una alarma y luego calcula cuántas veces puede posponerla.',
  'Estás en la franja del que lee las instrucciones después de romper la pieza. Y ni entonces las lee entera.',
  '%IQ. Te metes en la discusión a destiempo, te callas y dejas un «vale» que no contesta a nadie.',
  'Con %IQ te pasan un audio, lo oyes dos veces y contestas una cosa que en el audio no salía.',
  'Tienes el criterio de quien elige por cansancio: te rindes y lo llamas decidir.',
  'Con %IQ escribes, borras, vuelves a escribir y sale la misma gilipoyez con una falta nueva.',
  '%IQ de IQ. El tramo de los que se saben la teoría de memoria y no la entienden ni por accidente.',
  '%IQ. Te preguntan la hora, contestas el tiempo que hace y encima te mosqueas si te corrigen.',
  'Con %IQ te apañas. Apañarse es lo que hace la gente que no llega y llevas años apañándote.',
  '%IQ de IQ. Justo lo que hace falta para funcionar sin que nadie te pregunte nunca la opinión.',
  '%IQ. El número que sale cuando alguien tiene ganas pero no herramientas. Y tú ni las ganas, la verdad, pringado.',
  '%IQ de IQ. Te da para discutir de oídas y para callarte en cuanto llega un dato.',
  '%IQ. Un escalón por debajo de tomar nota, y encima te ofendes si te la toman. Qué asco de orgullo.',
  'Con %IQ vas tirando hasta que hay que leer el segundo párrafo. Ahí se te acaba el combustible, pringado.',
  '%IQ. Te falta un hervor y te sobra seguridad. Mala mezcla para abrir la boca en el grupo.',
  'Con %IQ te enteras de los planes cuando ya se han cancelado.',
  '%IQ de IQ. No te da ni para ganar una discusión ni para perderla con dignidad.',
  'Con %IQ cometes los mismos errores, cada vez con más confianza.',
];

const MEDIO = [
  '%IQ. Tienes los cojones de ser exactamente igual que todo el mundo y encima no te da vergüenza.',
  '%IQ. Eres tan puñeteramente medio que si te clonaran cien veces no cambiaría ni la estadística ni el ambiente.',
  '%IQ de IQ. Si la mediocridad pagara impuestos tú solo financiarías una autopista, cabrón.',
  '%IQ. Rotas las mismas cuatro frases de siempre y en años nadie se ha dado ni puta cuenta.',
  '%IQ de IQ. Mierda, eres tan promedio que si buscas tu nombre en Google sale "quizás quisiste decir otro".',
  '%IQ de IQ. Coño, eres tan del promedio que si te pusieras de perfil intelectualmente desaparecerías.',
  '%IQ. Contestas con el mismo emoji que acaba de poner otro y lo dejas ahí, como si se te hubiera ocurrido a ti.',
  'Con %IQ piensas lo que piensa todo el mundo, cinco minutos después.',
  '%IQ de IQ. Tienes opiniones de segunda mano y las defiendes como si fueran tuyas.',
  '%IQ. Lo justo para no dar pena. Nadie en su puta vida te ha pedido copiar un examen.',
  'Con %IQ te lo explican, asientes, y al rato preguntas lo mismo sin haberte enterado de una mierda.',
  '%IQ. Si te fueras del grupo tardaríamos una semana en notarlo y otra en que nos importara.',
  '%IQ de IQ. Si hicieran un examen del grupo, sacarías un cinco y lo celebrarías.',
  'Con %IQ te sabes todas las respuestas que ya estaban en el primer resultado de Google.',
  '%IQ. El plan ya está cerrado, sueltas «yo me apunto» y el grupo sigue a su puta bola, sin mirarte.',
  '%IQ de IQ. Tu mayor logro intelectual es no estar a la cola del grupo, y por poco.',
  'Con %IQ no te equivocas mucho. Tampoco aciertas nada que no acertara ya cualquiera.',
  '%IQ. En las fotos sales al fondo, fuera de foco, y ni Dios se molesta en etiquetarte.',
  '%IQ de IQ. Escribes una bordería, la relees, la borras entera y mandas un «totalmente» que no dice una mierda.',
  'Con %IQ repites chistes que ya viste en otro grupo y encima los cuentas peor.',
  '%IQ. Nadie te va a llamar ni para un trivial ni para pedirte consejo; como mucho, para hacer bulto.',
  '%IQ de IQ. Tienes la cabeza justa para no meterte en líos, y ni una chispa para salir de uno.',
  'Con %IQ lo tuyo es entender las cosas cuando todo el mundo ya está hablando de otra.',
  '%IQ. Aprobado raspado, y encima te crees de la élite.',
  '%IQ de IQ. Cuando hablas no aprende nada nadie, ni siquiera tú.',
  'Con %IQ piensas lo justo para que nadie se preocupe por ti. Tampoco se fija nadie.',
  '%IQ. La cifra de alguien que no ha leído un libro entero desde el colegio y no lo echa de menos.',
  '%IQ de IQ. Pegas un titular que no has leído y esperas el aplauso por algo que ha cagado otro.',
  'Con %IQ eres de la gente que dice «yo tengo mi propia forma de pensar». No la tienes.',
  '%IQ. El número que se saca contestando el examen por intuición. Y la intuición también la tienes en la media.',
];

const ALTO = [
  'Con %IQ podrías estar resolviendo ecuaciones y estás resolviendo si contestar o no a un mensaje con un puto emoji.',
  '%IQ. Tienes la cabeza de alguien que podría cambiar las cosas y el culo pegado al sofá como todos los demás, cabrón.',
  '%IQ. Tienes buena cabeza de verdad, qué pena que la gastes discutiendo en un grupo de WhatsApp.',
  'Con %IQ ves venir las tonterías del grupo antes que nadie. Y aun así te metes.',
  '%IQ de IQ. Tienes de las mejores cabezas de aquí, que con este nivel tampoco es decir mucho.',
  '%IQ. Piensas rápido, hablas bien y lo usas para ganar discusiones que no importan una mierda.',
  'Con %IQ podrías estar haciendo algo grande. Y aquí estás, con tu IQ en un bot.',
  '%IQ de IQ. Se te nota la cabeza, y también lo mucho que te gusta que se note.',
  '%IQ. Por encima de la media y por debajo de lo que tú te crees.',
  'Con %IQ entiendes las cosas a la primera. Lo jodido es tener que esperar a que el resto llegue.',
  '%IQ. Te da la cabeza para entenderlo todo, y lo primero que entendiste es que nadie te aguanta.',
  '%IQ de IQ. Cuando hablas se nota, y cuando te callas se nota el desprecio.',
  'Con %IQ te sobra cabeza para todo menos para cerrar la boca a tiempo.',
  '%IQ. Tienes argumentos de sobra, cerebrito, y aquí no te los escucha ni Dios.',
  '%IQ de IQ. Buena cabeza para lo difícil y ninguna para lo fácil, como saludar.',
  'Con %IQ ganas todas las discusiones del grupo. Te lo dirían si alguien las leyera enteras.',
  '%IQ. Pensar se te da de puta madre. Hacer algo con eso, ya lo veremos.',
  '%IQ de IQ. En otro sitio serías normal, pero aquí pareces un genio por culpa del grupo.',
  'Con %IQ tienes razón casi siempre. Y te encanta que se sepa, que es lo que te hace insoportable.',
  '%IQ. Cabeza de sobra y paciencia de mierda, mala combinación para estar aquí.',
  '%IQ de IQ. Te lees los mensajes largos enteros y contestas con otro más largo, que no lee nadie.',
  'Con %IQ detectas un bulo a la primera. Lo que no detectas es cuándo sobra tu corrección.',
  '%IQ. Lo sabes todo y lo dices todo, que es justo por lo que no te invitan a nada.',
  '%IQ de IQ. Corriges las faltas de los demás y te crees que eso es tener amigos.',
  'Con %IQ te enteras de todo antes. Y lo cuentas después, para que se note que ya lo sabías.',
  '%IQ. Buena cifra, y la vas a restregar por todo el chat porque es lo único que tienes.',
  '%IQ de IQ. Te tocó el cerebro en la lotería genética y lo demás ya no.',
  'Con %IQ podrías convencer a cualquiera de cualquier cosa. Te conformas con tener razón en el grupo.',
  '%IQ. La cabeza la tienes bien; lo que te pasa es que te aburre la gente que no la tiene, y aquí hay mucha.',
  '%IQ de IQ. Te sobra cerebro para este grupo y te falta valor para irte a uno mejor.',
];

const GENIO = [
  '%IQ. Superdotación en un grupo de WhatsApp. El universo tiene un sentido del humor de mierda.',
  'Con %IQ podrías estar en cualquier sitio y has elegido esto. Es la mayor tontería que has hecho en tu vida.',
  '%IQ de IQ. Aquí dentro eres lo más listo que hay, que con este grupo tampoco cuesta tanto.',
  '%IQ. Te sobra cerebro y lo desperdicias con una elegancia que da rabia.',
  'Con %IQ ves las cosas antes de que pasen. Lo de este grupo no hacía falta verlo venir.',
  '%IQ de IQ. Juegas en otra liga, y aun así pierdes las tardes aquí con nosotros. Muy listo no es eso.',
  '%IQ. Lo tuyo es de nacimiento, lo sabes y lo sabemos todos. Qué asco.',
  'Con %IQ les terminas las frases a los demás, cabrón, y encima se las corriges.',
  '%IQ de IQ. Entiendes cosas que el resto no sabe ni pronunciar. Y aun así te ríes con memes de perros.',
  '%IQ. Esa cifra no se saca con suerte. Se saca con una cabeza que no te mereces.',
  'Con %IQ la gente te pide opinión y luego hace lo contrario. Y siempre se equivoca.',
  '%IQ de IQ. En un examen terminarías antes de que el resto encontrara el bolígrafo, y te pasarías la hora mirando por encima del hombro.',
  '%IQ. Genio certificado, aunque no calculaste bien en qué grupo te ibas a meter.',
  'Con %IQ te sobra cabeza para dirigir esto y te faltan ganas de hacerlo. Menos mal para todos.',
  '%IQ. Mente privilegiada, lástima que el móvil sea el de siempre y el grupo sea este.',
  'Con %IQ podrías cambiar el mundo. Cambias de conversación cuando se pone aburrida, que es siempre.',
  '%IQ de IQ. Tienes tanta cabeza que da miedo contradecirte, cabrón, y encima lo disfrutas.',
  '%IQ. La media del grupo sube cuando entras y baja cuando te vas, y te encargas de que se note.',
  'Con %IQ ganas cualquier discusión en una frase, y te pasas tres más restregándolo como un cabrón.',
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
