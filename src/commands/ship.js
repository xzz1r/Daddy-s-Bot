const { pick, shuffle } = require('../utils/helpers');
const { getSender } = require('../utils/wa');

const VERDICTS = {
  perfect: [
    'Dos almas condenadas a encontrarse. El destino no pide permiso.',
    'Se buscan, se rozan, se queman. El universo los eligio el uno al otro antes de que nacieran.',
    'Una historia de amor tan intensa que haria llorar hasta a quien nunca ha amado.',
    'Juntos serian capaces de incendiar el mundo y bailar entre las llamas.',
    'El tipo de amor que los poetas envidian y los demas no entienden.',
    'Hechos el uno para el otro. No hay otra explicacion posible.',
    'Si el amor tuviera cara, tendria la de ellos dos juntos.',
    'El universo entero conspiro para que sus caminos se cruzaran.',
    'Cada momento juntos es un recuerdo que vale la pena guardar para siempre.',
    'Dos mitades que por fin encontraron donde encajar.',
    'El corazon no se equivoca cuando late asi de fuerte.',
    'El tipo de historia que la gente cuenta generaciones despues.',
    'Podrian escribir un libro y aun asi quedarse cortos.',
    'Amor del que da calor en pleno invierno.',
    'Perfectos en sus imperfecciones juntos.',
  ],
  high: [
    'Hay chispa, hay tension, hay algo que ninguno de los dos quiere admitir todavia.',
    'Se miran de reojo y fingen que no. Pero todo el mundo lo ve menos ellos.',
    'El corazon no miente aunque la boca diga que son solo amigos.',
    'Compatibles hasta en los defectos. Eso es lo mas peligroso.',
    'Hay futuro aqui. O hay fuego. Probablemente ambas cosas.',
    'Cuando estan juntos el tiempo pasa distinto. Eso no es casualidad.',
    'Hay miradas que dicen lo que la boca no se atreve.',
    'La tension entre ellos se corta con un cuchillo. Alguien tiene que dar el paso.',
    'Se completan sin saberlo todavia. Es cuestion de tiempo.',
    'Algo chispea cada vez que comparten el mismo espacio.',
    'Dos imanes que fingen repelerse pero se acercan igual.',
    'Les falta un segundo de valentía para que todo cambie.',
  ],
  mid: [
    'Podria funcionar, pero alguien tendria que dar el primer paso y los dos son demasiado cobardes.',
    'Se toleran, que en estos tiempos ya es mucho.',
    'Compatibles como el aceite y el agua: si los agitas un poco, algo pasa.',
    'Hay posibilidades. Pocas, pero las hay. El amor ha salido de peores trincheras.',
    'No es el gran amor, pero tampoco seria un error. Peor es nada.',
    'Algo hay ahi dentro. Solo hace falta desempolvarlo.',
    'Si se esforzaran un poco, la historia cambiaria.',
    'Compatibles en lo basico. Y a veces con eso alcanza.',
  ],
  low: [
    'Un desastre anunciado. Dos fuerzas opuestas que se repelen con violencia cosmica.',
    'Juntos durarian lo que un cubo de hielo en el infierno.',
    'El universo dice no con una firmeza que asusta.',
    'Mas incompatibles que el agua y el aceite en un terremoto.',
    'Si se juntaran, los astros llorarian. Y no de emocion.',
    'El tipo de pareja que termina con deudas y un gato a medias.',
    'Quizas en otra vida. En esta, no.',
    'Se necesitaria un milagro. Y los milagros no andan por aqui.',
  ],
  zero: [
    'Nada. El vacio absoluto. Ni odio ni amor, que es aun mas triste.',
    'Dos extranos que comparten grupo y nada mas. El cosmos ni los conoce.',
    'Cero quimica. Ni siquiera el alcohol los acercaria.',
    'Incompatibilidad total. Un milagro estadistico del desamor.',
    'Si fueran planetas, ni la gravedad los uniria.',
    'Como mezclar sal con mas sal. Nada nuevo emerge.',
    'La indiferencia mas absoluta. El anticlimas del amor.',
    'Ni en un universo alternativo.',
  ],
};

async function cmdShip(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  const participants = (groupMeta?.participants || []).map(p => p.id);
  if (participants.length < 2) {
    return sock.sendMessage(jid, { text: 'Necesito al menos 2 miembros en el grupo.' }, { quoted: msg });
  }

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const sender = getSender(msg);

  let a, b;

  if (mentioned.length >= 2) {
    // !ship @a @b — shipea exactamente esos dos
    [a, b] = mentioned.slice(0, 2);
  } else if (mentioned.length === 1) {
    // !ship @a — shipea al que manda con @a
    a = sender;
    b = mentioned[0];
  } else {
    // !ship — dos miembros al azar
    [a, b] = shuffle(participants).slice(0, 2);
  }

  const compat = Math.floor(Math.random() * 101);
  const filled = Math.round(compat / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

  const verdict =
    compat === 100 ? pick(VERDICTS.perfect) :
    compat >= 70   ? pick(VERDICTS.high) :
    compat >= 40   ? pick(VERDICTS.mid) :
    compat >= 10   ? pick(VERDICTS.low) :
                     pick(VERDICTS.zero);

  const numA = a.split('@')[0];
  const numB = b.split('@')[0];

  const text =
    `*Ship*\n\n` +
    `@${numA}  +  @${numB}\n\n` +
    `${bar}  *${compat}%*\n\n` +
    `${verdict}`;

  await sock.sendMessage(jid, { text, mentions: [a, b] }, { quoted: msg });
}

module.exports = { cmdShip };
