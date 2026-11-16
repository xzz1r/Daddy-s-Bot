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
  'Con %IQ el listón no está bajo: está enterrado, con lápida y con flores. Aquí descansa tu cabeza de inútil.',
  '%IQ. En la cama también necesitas que te lo expliquen dos veces, y a la tercera te dan el manual con dibujos.', // ROCKSTAR
  '%IQ. Con esa cifra no apruebas ni existir, y aun así aquí estás, opinando.',
  'Con %IQ crees que el punto G es una letra del abecedario.', // ROCKSTAR
  '%IQ. Con esa cifra no deberías tener permiso para opinar en un grupo, y mucho menos para votar.',
  '%IQ. Te dicen «ponte encima» y preguntas encima de qué.', // ROCKSTAR
  '%IQ de IQ. Tienes la cabeza para llevar el pelo y poco más.',
  'Con %IQ confundes los preliminares con el tutorial de un juego, y te los saltas igual.', // ROCKSTAR
  'Con %IQ te cuesta seguir una conversación de tres personas. Por eso te ríes cuando se ríen los demás, pequeña.',
  '%IQ de IQ. Te mandan una indirecta guarra y contestas con el horario del autobús.', // ROCKSTAR
  '%IQ de IQ. Si pensar doliera, irías por la vida sin un rasguño.',
  'Con %IQ te dicen «fóllame» y respondes «¿ahora?», y ya no es ahora.', // ROCKSTAR
  '%IQ. El kamasutra lo tienes en la estantería porque creías que era de cocina.', // ROCKSTAR
  'Con %IQ tu idea de juego previo es preguntar «¿ya?».', // ROCKSTAR
  '%IQ. No hace falta que te hagas pasar por gilipoyas: te sale de serie.',
  '%IQ de IQ. Te dicen «despacio» y entiendes «da igual».', // ROCKSTAR
  '%IQ. La neurona que tienes está sola, aburrida y buscando trabajo en otra cabeza.',
  'Con %IQ te escriben «estoy en casa sin nadie» y contestas «qué aburrido, ¿no?».', // ROCKSTAR
  '%IQ de IQ. Te pierdes en la conversación en cuanto alguien usa una palabra de tres sílabas.',
  '%IQ. Te piden que digas algo guarro al oído y dices tu número de DNI.', // ROCKSTAR
  '%IQ. Tienes la cabeza tan hueca que hace eco desde aquí.',
  'Con %IQ te tienen que dibujar dónde está todo, y aun así te pierdes por el camino.', // ROCKSTAR
  '%IQ de IQ. Lees un mensaje largo y te quedas en la primera línea con la boca abierta, chiquitina.',
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
  'Con %IQ te enteras de las indirectas guarras al día siguiente, cuando ya se ha ido a casa con otra persona.', // ROCKSTAR
  'Con %IQ te manejas en lo básico. A la segunda idea seguida, tu cerebro de mierda ya se ha perdido.',
  '%IQ. Por debajo de la media, también entre las sábanas: ni te enteras de cuándo ha empezado.', // ROCKSTAR
  'Con %IQ tomas decisiones rápidas, gilipoyas, malas pero rápidas, y encima las llamas instinto.',
  'Con %IQ funcionas bien en la postura de siempre. Si te cambian una, se te ve el cartón.', // ROCKSTAR
  'Con %IQ eres inútil para todo lo que exija pensar más de un paso por delante, o sea, para casi todo.',
  '%IQ de IQ. Entiendes la mitad de las cosas y actúas como si hubieras entendido el doble, princesa.',
  '%IQ. Contestas «jaja» a un «sube a mi casa», y te quedas en la calle.', // ROCKSTAR
  'Con %IQ sabes lo justo para meterte en discusiones que no puedes ganar. Y te metes en todas.',
  '%IQ. Por debajo de la media pero con la seguridad de un catedrático. Esa mezcla tuya es la que da problemas.',
  'Con %IQ entiendes las cosas cuando te las dicen dos veces. En la cama no te las dice nadie dos veces.', // ROCKSTAR
  '%IQ de IQ. Te cuesta tanto entender una invitación a subir que suben otros.', // ROCKSTAR
  'Estás en la franja del que lee las instrucciones después de romper la pieza. Y ni entonces las lee entera.',
  '%IQ. Te metes en la cama a destiempo, te callas y dejas un «vale» que no pone a nadie.', // ROCKSTAR
  'Con %IQ te mandan un audio guarro, lo oyes dos veces y contestas algo que en el audio no salía.', // ROCKSTAR
  'Tienes el criterio de quien elige en la cama por cansancio: te rindes y lo llamas decidir.', // ROCKSTAR
  'Con %IQ escribes, borras, vuelves a escribir y sale la misma gilipoyez con una falta nueva.',
  '%IQ de IQ. Te sabes la teoría de memoria y no la entiendes ni por accidente.',
  '%IQ. Te preguntan «¿qué te pone?» y contestas el tiempo que hace.', // ROCKSTAR
  'Con %IQ te apañas. Apañarse es lo que hace la gente que no llega y llevas años apañándote, mi niña.',
  '%IQ de IQ. Justo lo que hace falta para follar sin que nadie te pida nunca la opinión.', // ROCKSTAR
  '%IQ. El número que sale cuando alguien tiene ganas pero no herramientas. A ti, pedazo de inútil, te faltan hasta las ganas.',
  '%IQ de IQ. Te da para discutir de oídas y para callarte en cuanto llega un dato.',
  '%IQ. Te corrigen una falta y te lo tomas como un ataque. Qué asco de orgullo para tan poca cabeza.',
  'Con %IQ vas tirando hasta que hay que leer el segundo párrafo. Ahí se te funde la poca cabeza que tienes.',
  '%IQ. Te falta un hervor y te sobra prisa, y las dos cosas se notan en la cama.', // ROCKSTAR
  'Con %IQ te enteras de los planes cuando ya se han cancelado, chiquitina.',
  '%IQ de IQ. No te da ni para ganar una discusión ni para perderla con dignidad.',
  'Con %IQ cometes los mismos errores, cada vez con más confianza.',
];

const MEDIO = [
  '%IQ. Tienes los cojones de ser exactamente igual que todo el mundo y encima no te da vergüenza.',
  '%IQ. Eres tan puñeteramente medio que si te clonaran cien veces no cambiaría ni la estadística ni el ambiente.',
  '%IQ de IQ. Si la mediocridad pagara impuestos, con lo tuyo se pagaba una autopista entera.',
  '%IQ. En la cama repites las mismas tres posturas de siempre, y en años nadie se ha quejado ni te ha aplaudido.', // ROCKSTAR
  '%IQ de IQ. Mierda, eres tan promedio que si buscas tu nombre en Google sale "quizás quisiste decir otro".',
  '%IQ de IQ. Coño, eres tan del promedio que si te pusieras de perfil intelectualmente desaparecerías.',
  '%IQ. Contestas a una foto atrevida con el mismo emoji que ha puesto otra persona, y ahí se acaba tu jugada.', // ROCKSTAR
  'Con %IQ piensas lo que piensa todo el mundo, cinco minutos después. En la cama también llegas cinco minutos después.', // ROCKSTAR
  '%IQ de IQ. Tienes opiniones de segunda mano y las defiendes como si fueran tuyas.',
  '%IQ. Te da lo justo para no dar pena, en el examen y en la cama.', // ROCKSTAR
  'Con %IQ te lo explican, asientes, y al rato preguntas lo mismo sin haberte enterado de una mierda.',
  '%IQ. Si te fueras de la cama de alguien, tardaría una semana en notarlo.', // ROCKSTAR
  '%IQ de IQ. Si hicieran un examen del grupo, sacarías un cinco y lo celebrarías.',
  'Con %IQ te sabes todas las posturas que salen en el primer resultado de Google.', // ROCKSTAR
  '%IQ. El plan ya está cerrado y la cama ya está ocupada cuando sueltas «yo me apunto».', // ROCKSTAR
  '%IQ de IQ. Tu mayor logro intelectual es no estar a la cola del grupo, y por poco.',
  'Con %IQ no te equivocas mucho. Tampoco aciertas nada que no acertara ya cualquiera, princesa.',
  '%IQ. En las fotos sales al fondo, y en los tríos, también.', // ROCKSTAR
  '%IQ de IQ. Escribes una bordería, la relees, la borras entera y mandas un «totalmente» que no dice una mierda.',
  'Con %IQ te ligas con frases que ya viste en otro grupo, y las dices peor.', // ROCKSTAR
  '%IQ. Nadie te llama para un trivial ni para una noche loca. Para la noche tranquila, alguna vez.', // ROCKSTAR
  '%IQ de IQ. Tienes la cabeza justa para no meterte en líos, y ni una chispa para salir de uno.',
  'Con %IQ te enteras de que estabas en una cita cuando ya te están pidiendo la cuenta.', // ROCKSTAR
  '%IQ. Aprobado raspado, y encima te crees de la élite.',
  '%IQ de IQ. Cuando hablas no aprende nada nadie, ni siquiera tú.',
  'Con %IQ follas lo justo para que nadie se preocupe por ti. Tampoco se acuerda nadie.', // ROCKSTAR
  '%IQ. No has leído un libro entero desde el colegio y no lo echas de menos.',
  '%IQ de IQ. Pegas un titular que no has leído y esperas el aplauso por algo que ha cagado otro.',
  'Con %IQ eres de la gente que dice «yo tengo mi propia forma de pensar». No la tienes.',
  '%IQ. El número que se saca contestando el examen por intuición. Y la intuición también la tienes en la media.',
];

const ALTO = [
  'Con %IQ podrías estar resolviendo ecuaciones y estás resolviendo cómo contestar a una foto que no te esperabas.', // ROCKSTAR
  '%IQ. Tienes cabeza para cambiar las cosas y el puto culo pegado al sofá, como todos los demás.',
  '%IQ. Tienes buena cabeza, y quien te ha tenido cerca dice que no solo para pensar.', // ROCKSTAR
  'Con %IQ ves venir las tonterías del grupo antes que nadie. Y aun así te metes, chiquitina.',
  '%IQ de IQ. Tienes de las mejores cabezas de aquí, y de las pocas que saben qué hacer en la cama sin tutorial.', // ROCKSTAR
  '%IQ. Piensas rápido, hablas bien y en la cama no necesitas que te dibujen el mapa.', // ROCKSTAR
  'Con %IQ podrías estar haciendo algo grande. Y aquí estás, con tu IQ en un bot, reina.',
  '%IQ de IQ. Se te nota la cabeza, y también lo mucho que te gusta que se note.',
  '%IQ. Estás por encima de la media, y por lo que se cuenta, también en la cama.', // ROCKSTAR
  'Con %IQ te llegan las indirectas guarras a la primera, y contestas con otra mejor.', // ROCKSTAR
  '%IQ. Te da la cabeza para entenderlo todo, y lo primero que entendiste es que nadie te aguanta.',
  '%IQ de IQ. Cuando hablas se nota, y cuando susurras, más.', // ROCKSTAR
  'Con %IQ te sobra cabeza para todo menos para cerrar la boca a tiempo.',
  '%IQ. Tienes argumentos de sobra, cerebrito, y aquí no te los escucha ni Dios.',
  '%IQ de IQ. Tienes buena cabeza para lo difícil y ninguna para lo fácil, como pedir un número sin dar un discurso.', // ROCKSTAR
  'Con %IQ ganas todas las discusiones del grupo. Te lo dirían si alguien las leyera enteras.',
  '%IQ. Pensar se te da de puta madre, y lo otro, por lo que se oye, tampoco se te da mal.', // ROCKSTAR
  '%IQ de IQ. Te pones a explicar algo y hay quien se queda mirándote la boca, y no por lo que dices.', // ROCKSTAR
  'Con %IQ tienes razón casi siempre. Y te encanta que se sepa, que es lo que te hace insoportable.',
  '%IQ. Cabeza de sobra y paciencia de mierda, salvo en la cama, donde por lo visto te sobra de las dos.', // ROCKSTAR
  '%IQ de IQ. Te lees los mensajes largos enteros y contestas con otro más largo, que no lee nadie.',
  'Con %IQ te das cuenta de un bulo a la primera, y de quien finge en la cama, también.', // ROCKSTAR
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
  '%IQ. Tu superdotación, en un grupo de WhatsApp. El universo tiene un sentido del humor de mierda.',
  'Con %IQ podrías estar en cualquier sitio y has elegido esto. Es la mayor tontería que has hecho en tu vida.',
  '%IQ de IQ. Eres lo más listo del grupo, y hay quien fantasea con que le expliques cosas en voz baja.', // ROCKSTAR
  '%IQ. Te sobra cerebro, y te lo has gastado aprendiendo cosas que no se enseñan en ningún máster.', // ROCKSTAR
  'Con %IQ ves las cosas antes de que pasen. Lo de este grupo no hacía falta verlo venir.',
  '%IQ de IQ. Juegas en otra liga, y aun así pierdes las tardes aquí con nosotros. Muy listo no es eso.',
  '%IQ. Lo tuyo es de nacimiento, y lo de la cama, por lo que se cuenta, de mucha práctica.', // ROCKSTAR
  'Con %IQ les terminas las frases a los demás, cabrón, y encima se las corriges.',
  '%IQ de IQ. Entiendes cosas que el resto no sabe ni pronunciar, y en la cama sabes pronunciar las que hacen falta.', // ROCKSTAR
  '%IQ. Esa cifra no se saca con suerte. Se saca con una cabeza que no te mereces.',
  'Con %IQ la gente te pide opinión y luego hace lo contrario, menos en la cama, donde hacen exactamente lo que dices.', // ROCKSTAR
  '%IQ de IQ. En un examen terminarías antes de que el resto encontrara el bolígrafo, y te pasarías la hora mirando por encima del hombro.',
  '%IQ. Genio certificado, y sabes encontrar sitios que otros no encuentran ni con mapa.', // ROCKSTAR
  'Con %IQ te sobra cabeza para dirigir esto y te faltan ganas de hacerlo. Menos mal para todos, mi niña.',
  '%IQ. Tienes una mente privilegiada y la gastas ganando discusiones a las tres de la mañana en este grupo de mierda.',
  'Con %IQ podrías cambiar el mundo, y de momento cambias sábanas, que también tiene su ciencia.', // ROCKSTAR
  '%IQ de IQ. Tienes tanta cabeza que da miedo contradecirte, cabrón, y encima lo disfrutas.',
  '%IQ. La media del grupo sube cuando entras y baja cuando te vas, y te encargas de que se note.',
  'Con %IQ ganas cualquier discusión en una frase, y te pasas tres más restregándolo como un cabrón.',
  '%IQ de IQ. Por fin alguien que entiende el bot mejor que el bot: tú, que encima sabes usar las manos.', // ROCKSTAR
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
