// Generic random % about someone — used by !gay, !simp, !gilipollas, etc.

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const LABELS = {
  gay: {
    name: 'gay', emoji: '🌈',
    high: pick(['¡Sal del armario de una puta vez, maricón de mierda!', '¡Más gay que un arcoíris en una sauna de hombres!', '¡Nenaza redomada, hasta tus huesos son rosas!']),
    mid:  pick(['Algo se te mueve por dentro cuando pasan tíos buenos.', 'Ni fu ni fa, pero tampoco es que seas muy macho.']),
    low:  pick(['Más hetero que un toro en feria.', 'Cero pluma, cero duda.']),
  },
  simp: {
    name: 'simp', emoji: '😍',
    high: pick(['Simp de campeonato, te lamerías los zapatos por un emoji.', '¡Patético! Te pones de rodillas con solo que te miren.', 'Vendes tu alma por un "hola" suyo, asqueroso.']),
    mid:  pick(['Simping controlado, pero se te nota.', 'No llegas a simp total, pero vas por el buen camino.']),
    low:  pick(['Digno. No te arrastras por nadie.', 'Frialdad de iceberg, nadie te dobla.']),
  },
  sexy: {
    name: 'sexy', emoji: '🔥',
    high: pick(['¡Estás como un queso de primera, para comerte vivo!', '¡Peligroso/a, deberías llevar señal de advertencia!', '¡Un cañón andante, que Dios te bendiga!']),
    mid:  pick(['No está mal, tampoco para tirar cohetes.', 'Pasable. Con buena luz y poca competencia.']),
    low:  pick(['Cero atractivo, lo siento mucho.', 'Ni con un filtro de Instagram levantarías nada.']),
  },
  rata: {
    name: 'rata', emoji: '🐀',
    high: pick(['Rata de alcantarilla, traicionarías a tu madre por cinco euros.', '¡Judas con zapatillas, eres lo más rastrero que existe!', '¡Rata de cloaca! Tu deslealtad es una obra de arte.']),
    mid:  pick(['Algo de rata tienes, pero no llegas al nivel de plaga.', 'Traicionas cuando conviene, que es lo peor.']),
    low:  pick(['Más leal que un perro, no traicionarías ni a tu peor enemigo.', 'Limpio como una patena, ni una gota de rata.']),
  },
  gilipollas: {
    name: 'gilipollas', emoji: '🤡',
    high: pick(['¡Gilipollas de campeonato mundial, eres un puto fenómeno!', '¡Suma y sigue! Si la gilipollez fuera dinero serías Elon Musk.', '¡Monumento nacional a la estupidez, enhorabuena!']),
    mid:  pick(['Gilipollas a ratos, que ya es suficiente.', 'No eres tonto del todo, pero le pones muchas ganas.']),
    low:  pick(['Más listo que el hambre, lástima que te rodees de idiotas.', 'Dos dedos de frente, que aquí escasean.']),
  },
  subnormal: {
    name: 'subnormal', emoji: '🧠',
    high: pick(['¡Subnormal de libro! Darwin se equivocó contigo.', '¡Tu coeficiente intelectual compite con el de una ostra!', '¡Récord histórico de subnormalidad, enhorabuena campeón!']),
    mid:  pick(['Subnormal ocasional, pero con empuje puedes superar tu propio récord.', 'Más o menos espabilado, depende del día y la luna.']),
    low:  pick(['Más espabilado que un lince en ayunas.', 'Cerebro en forma, no hay quien te engañe.']),
  },
  imbecil: {
    name: 'imbécil', emoji: '🤦',
    high: pick(['¡Imbécil supremo! Una obra maestra de la inutilidad.', '¡Dios mío, cómo es posible funcionar así de mal!', '¡Premio gordo a la imbecilidad, lo has conseguido!']),
    mid:  pick(['Imbécil a temporadas, que no es poco.', 'No llegas al top, pero te esfuerzas.']),
    low:  pick(['Tienes dos dedos de frente, cosa que no abunda.', 'Espabilado. No te la cuelas fácil.']),
  },
  capullo: {
    name: 'capullo', emoji: '😤',
    high: pick(['¡Capullo redomado! Deberías tener una placa conmemorativa.', '¡El capullo de capullos, una institución nacional!', '¡Eres el capullo que todo grupo necesita para odiarte!']),
    mid:  pick(['Capullo moderado, todavía tiene remedio.', 'Capullo a ratos, que es casi peor porque das esperanzas.']),
    low:  pick(['Buen tío/tía, de los que quedan pocos.', 'Ni rastro de capullo. Rara avis.']),
  },
  pringado: {
    name: 'pringado', emoji: '🥴',
    high: pick(['¡Pringado total! Te pringa hasta la lluvia.', '¡El universo entero conspira contra ti, campeón!', '¡Pringado de nacimiento, genético e irrecuperable!']),
    mid:  pick(['Te pasan cosas raras con demasiada frecuencia.', 'Pringado ocasional, pero con tendencia al alza.']),
    low:  pick(['Tienes mucha calle, no te la mete nadie.', 'La mala suerte te respeta, cosa rara.']),
  },
  mamon: {
    name: 'mamón', emoji: '😏',
    high: pick(['¡Mamón de manual, capítulo uno y portada!', '¡El mamón de mamones, una categoría propia!', '¡Tan mamón que hasta tú mismo te das asco!']),
    mid:  pick(['Mamón a ratos, que igual es peor.', 'Se te ve el plumero de mamón cuando conviene.']),
    low:  pick(['Tío decente, de los que no abundan.', 'Ni rastro de mamonería. Insólito.']),
  },
  maricon: {
    name: 'maricón', emoji: '💅',
    high: pick(['¡Maricón de tomo y lomo, y encima orgulloso!', '¡La reina de las reinas, nadie te quita el trono!', '¡Más pluma que un gallinero, campéon/a absoluto/a!']),
    mid:  pick(['Algo de pluma hay, no te voy a mentir.', 'Ni muy muy ni tan tan, en el limbo de la virilidad.']),
    low:  pick(['Más macho/a que Rambo con resaca.', 'Testosterona a raudales, ninguna duda.']),
  },
  friki: {
    name: 'friki', emoji: '🤓',
    high: pick(['¡Friki supremo! Tu cueva huele a pizzas viejas y juegos de mesa.', '¡Eres el señor de los frikis, el elegido!', '¡Tan friki que hasta los demás frikis te miran raro!']),
    mid:  pick(['Friki moderado, sales a la calle de vez en cuando.', 'Friki con disimulo, pero se nota.']),
    low:  pick(['Cero raro, eres de lo más normal.', 'Social y presentable. Qué aburrido.']),
  },
  chorizo: {
    name: 'chorizo', emoji: '🥩',
    high: pick(['¡Chorizo de alto voltaje! Robas hasta el tiempo que hace.', '¡El ladrón de ladrones, una leyenda viva!', '¡Chorizo profesional, deberías cotizar en la Seguridad Social!']),
    mid:  pick(['Algo de chorizo hay, pero tampoco para la cárcel.', 'Roba a lo pequeño, que es lo más cobarde.']),
    low:  pick(['Honrado a tope, hasta devuelve el cambio de más.', 'Limpio como los chorros del oro. Qué pesado.']),
  },
  guarro: {
    name: 'guarro', emoji: '🤢',
    high: pick(['¡Guarro asqueroso! Tu habitación es patrimonio de la inmundicia.', '¡La suciedad te define, eres su embajador!', '¡Tan guarro que hasta las cucarachas se mudan de tu casa!']),
    mid:  pick(['Guarro a temporadas, cuando nadie mira.', 'La higiene es opcional para ti, y se nota.']),
    low:  pick(['Limpio como los chorros del oro, qué asco de virtud.', 'Pulcro y ordenado. Insoportable.']),
  },
  paleto: {
    name: 'paleto', emoji: '🌾',
    high: pick(['¡Paleto de pura cepa! Hueles a paja y a tractor.', '¡El pueblo te reclama, vuelve con los tuyos!', '¡Tan paleto que el WiFi no te llega ni al corazón!']),
    mid:  pick(['Algo de pueblo te queda, y no es malo.', 'Paleto con pretensiones de urbanita, lo peor.']),
    low:  pick(['Más fino que un coral, de ciudad y con modales.', 'Sofisticado. Da asco lo bien que te desenvuelves.']),
  },
  cutre: {
    name: 'cutre', emoji: '🗑️',
    high: pick(['¡Cutre nivel dios! Reutilizas los vasos de plástico tres semanas.', '¡El rey de la cutrez, una filosofía de vida!', '¡Tan cutre que enmarcarías una entrada de metro usada!']),
    mid:  pick(['Cutre moderado, escatimas donde puedes.', 'Ni generoso ni tacaño, cutre con estilo.']),
    low:  pick(['Tienes clase, tío/a. Derrochas hasta cuando no toca.', 'Espléndido/a. Inaguantable.']),
  },
};

function extractTarget(msg) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return mentioned;
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quotedParticipant) return quotedParticipant;
  return msg.key.participant || msg.key.remoteJid;
}

async function runPercent(sock, msg, key) {
  const jid = msg.key.remoteJid;
  const cfg = LABELS[key];
  if (!cfg) return;

  const target = extractTarget(msg);
  const percent = Math.floor(Math.random() * 101);
  const verdict = percent >= 70 ? cfg.high : percent <= 30 ? cfg.low : (cfg.mid || '');

  const filled = Math.round(percent / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

  let text = `${cfg.emoji} *@${target.split('@')[0]} es ${percent}% ${cfg.name}*\n\n${bar}`;
  if (verdict) text += `\n\n_${verdict}_`;

  await sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
}

function makeCmd(key) {
  return (sock, msg) => runPercent(sock, msg, key);
}

module.exports = {
  cmdGay:        makeCmd('gay'),
  cmdSimp:       makeCmd('simp'),
  cmdHot:        makeCmd('sexy'),
  cmdRata:       makeCmd('rata'),
  cmdGilipollas: makeCmd('gilipollas'),
  cmdSubnormal:  makeCmd('subnormal'),
  cmdImbecil:    makeCmd('imbecil'),
  cmdCapullo:    makeCmd('capullo'),
  cmdPringado:   makeCmd('pringado'),
  cmdMamon:      makeCmd('mamon'),
  cmdMaricon:    makeCmd('maricon'),
  cmdFriki:      makeCmd('friki'),
  cmdChorizo:    makeCmd('chorizo'),
  cmdGuarro:     makeCmd('guarro'),
  cmdPaleto:     makeCmd('paleto'),
  cmdCutre:      makeCmd('cutre'),
};
