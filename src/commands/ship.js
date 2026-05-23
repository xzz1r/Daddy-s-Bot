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
    'Se buscan, se rozan, se queman. El universo los eligió el uno al otro antes de que nacieran.',
    'Una historia de amor tan intensa que haría llorar hasta a quien nunca ha amado.',
    'Juntos serían capaces de incendiar el mundo y bailar entre las llamas.',
    'El tipo de amor que los poetas envidian y los demás no entienden.',
  ],
  high: [
    'Hay chispa, hay tensión, hay algo que ninguno de los dos quiere admitir todavía.',
    'Se miran de reojo y fingen que no. Pero todo el mundo lo ve menos ellos.',
    'El corazón no miente aunque la boca diga que son "solo amigos".',
    'Compatibles hasta en los defectos. Eso es lo más peligroso.',
    'Hay futuro aquí. O hay fuego. Probablemente ambas cosas.',
  ],
  mid: [
    'Podría funcionar, pero alguien tendría que dar el primer paso y los dos son demasiado cobardes.',
    'Ni frío ni calor. La indiferencia es la peor forma de desprecio.',
    'Se toleran, que en estos tiempos ya es mucho.',
    'Compatibles como el aceite y el agua: si los agitas un poco, algo pasa.',
    'Hay posibilidades. Pocas, pero las hay. El amor ha salido de peores trincheras.',
  ],
  low: [
    'Un desastre anunciado. Dos fuerzas opuestas que se repelen con violencia cósmica.',
    'Juntos durarían lo que un cubo de hielo en el infierno.',
    'El universo dice no con una firmeza que asusta.',
    'Más incompatibles que el agua y el aceite en un terremoto.',
    'Si se juntaran, los astros llorarían. Y no de emoción.',
  ],
  zero: [
    'Nada. El vacío absoluto. Ni odio ni amor, que es aún más triste.',
    'Dos extraños que comparten grupo y nada más. El cosmos ni los conoce.',
    'Cero química. Ni siquiera el alcohol los acercaría.',
    'Incompatibilidad total. Un milagro estadístico de la desamor.',
    'Si fueran planetas, ni la gravedad los uniría.',
  ],
};

async function cmdShip(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: '❌ Solo en grupos.' }, { quoted: msg });
  }

  const participants = (groupMeta?.participants || []).map((p) => p.id);
  if (participants.length < 2) {
    return sock.sendMessage(jid, { text: '❌ Necesito al menos 2 miembros en el grupo.' }, { quoted: msg });
  }

  const [a, b] = shuffle(participants).slice(0, 2);
  const compat = Math.floor(Math.random() * 101);

  const filled = Math.round(compat / 10);
  const bar = '❤️'.repeat(filled) + '🤍'.repeat(10 - filled);

  const verdict =
    compat === 100 ? pick(VERDICTS.perfect) :
    compat >= 70   ? pick(VERDICTS.high) :
    compat >= 40   ? pick(VERDICTS.mid) :
    compat >= 10   ? pick(VERDICTS.low) :
                     pick(VERDICTS.zero);

  const text =
    `*Ship del día*\n\n` +
    `@${a.split('@')[0]}  ❤️  @${b.split('@')[0]}\n\n` +
    `${bar}\n*${compat}% de compatibilidad*\n\n` +
    `_${verdict}_`;

  await sock.sendMessage(jid, { text, mentions: [a, b] }, { quoted: msg });
}

module.exports = { cmdShip };
