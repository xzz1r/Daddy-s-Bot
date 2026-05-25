function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const VERDICTS = {
  perfect: [
    'Dos almas condenadas a encontrarse. El destino no pide permiso.',
    'Se buscan, se rozan, se queman. El universo los eligio el uno al otro antes de que nacieran.',
    'Una historia de amor tan intensa que haria llorar hasta a quien nunca ha amado.',
    'Juntos serian capaces de incendiar el mundo y bailar entre las llamas.',
    'El tipo de amor que los poetas envidian y los demas no entienden.',
  ],
  high: [
    'Hay chispa, hay tension, hay algo que ninguno de los dos quiere admitir todavia.',
    'Se miran de reojo y fingen que no. Pero todo el mundo lo ve menos ellos.',
    'El corazon no miente aunque la boca diga que son solo amigos.',
    'Compatibles hasta en los defectos. Eso es lo mas peligroso.',
    'Hay futuro aqui. O hay fuego. Probablemente ambas cosas.',
  ],
  mid: [
    'Podria funcionar, pero alguien tendria que dar el primer paso y los dos son demasiado cobardes.',
    'Ni frio ni calor. La indiferencia es la peor forma de desprecio.',
    'Se toleran, que en estos tiempos ya es mucho.',
    'Compatibles como el aceite y el agua: si los agitas un poco, algo pasa.',
    'Hay posibilidades. Pocas, pero las hay. El amor ha salido de peores trincheras.',
  ],
  low: [
    'Un desastre anunciado. Dos fuerzas opuestas que se repelen con violencia cosmica.',
    'Juntos durarian lo que un cubo de hielo en el infierno.',
    'El universo dice no con una firmeza que asusta.',
    'Mas incompatibles que el agua y el aceite en un terremoto.',
    'Si se juntaran, los astros llorarian. Y no de emocion.',
  ],
  zero: [
    'Nada. El vacio absoluto. Ni odio ni amor, que es aun mas triste.',
    'Dos extranos que comparten grupo y nada mas. El cosmos ni los conoce.',
    'Cero quimica. Ni siquiera el alcohol los acercaria.',
    'Incompatibilidad total. Un milagro estadistico del desamor.',
    'Si fueran planetas, ni la gravedad los uniria.',
  ],
};

async function cmdShip(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  const participants = (groupMeta?.participants || []).map((p) => p.id);
  if (participants.length < 2) {
    return sock.sendMessage(jid, { text: 'Necesito al menos 2 miembros en el grupo.' }, { quoted: msg });
  }

  const [a, b] = shuffle(participants).slice(0, 2);
  const compat = Math.floor(Math.random() * 101);

  const filled = Math.round(compat / 10);
  const bar = '+'.repeat(filled) + '-'.repeat(10 - filled);

  const verdict =
    compat === 100 ? pick(VERDICTS.perfect) :
    compat >= 70   ? pick(VERDICTS.high) :
    compat >= 40   ? pick(VERDICTS.mid) :
    compat >= 10   ? pick(VERDICTS.low) :
                     pick(VERDICTS.zero);

  const text =
    `*Ship del dia*\n\n` +
    `@${a.split('@')[0]}  x  @${b.split('@')[0]}\n\n` +
    `${bar}\n*${compat}% de compatibilidad*\n\n` +
    `${verdict}`;

  await sock.sendMessage(jid, { text, mentions: [a, b] }, { quoted: msg });
}

module.exports = { cmdShip };
