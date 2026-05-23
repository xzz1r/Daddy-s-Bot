// Generic random % about someone — used by !gay, !simp, !gilipollas, etc.

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const LABELS = {
  gay: {
    name: 'gay', emoji: '🌈',
    high: ['¡Sal del armario de una puta vez!', '¡Más gay que un arcoíris en una sauna!', '¡Nenaza redomada, hasta tus huesos son rosas!'],
    mid:  ['Algo se te mueve por dentro cuando pasan tíos buenos.', 'Ni fu ni fa, pero tampoco eres muy macho.'],
    low:  ['Más hetero que un toro en feria.', 'Cero pluma, cero duda.'],
    extreme: [
      '¡Eres una vergüenza andante, ni tu familia te aguanta!',
      '¡Ciérrate el pico y desaparece de una vez, inútil!',
      '¡Lo poco que vales no merece ni el aire que respiras!',
      '¡Eres lo más patético que ha pasado por este grupo!',
      '¡Ni tu madre te querría si supiera lo que eres de verdad!',
    ],
  },
  simp: {
    name: 'simp', emoji: '😍',
    high: ['¡Simp de campeonato, te lamerías los zapatos por un emoji!', '¡Patético! Te pones de rodillas con solo que te miren.', '¡Vendes tu alma por un "hola", asqueroso!'],
    mid:  ['Simping controlado, pero se te nota.', 'No llegas a simp total, pero vas por el buen camino.'],
    low:  ['Digno. No te arrastras por nadie.', 'Frialdad de iceberg, nadie te dobla.'],
    extreme: [
      '¡Eres un puto felpudo con patas, la escoria de los hombres!',
      '¡Muérete de vergüenza, animal rastrero sin una pizca de amor propio!',
      '¡Un asco de persona, incapaz de tenerse en pie solo!',
      '¡Tan desesperado que das pena hasta a los que te odian!',
      '¡Eres la definición de miseria humana, un cero absoluto!',
      '¡Te mereces exactamente lo que tienes: nada!',
    ],
  },
  sexy: {
    name: 'sexy', emoji: '🔥',
    high: ['¡Estás como un queso, para comerte vivo!', '¡Peligroso/a, deberías llevar señal de advertencia!', '¡Un cañón andante!'],
    mid:  ['No está mal, tampoco para tirar cohetes.', 'Pasable. Con buena luz y poca competencia.'],
    low:  ['Cero atractivo, lo siento mucho.', 'Ni con un filtro de Instagram levantarías nada.'],
    extreme: [
      '¡En cualquier caso, tu personalidad lo arruina todo!',
      '¡Por fuera puede que sí, por dentro eres un desastre total!',
      '¡Lástima que seas tan feo/a por dentro!',
      '¡El físico no te salva de ser una persona horrible!',
    ],
  },
  rata: {
    name: 'rata', emoji: '🐀',
    high: ['¡Rata de alcantarilla, traicionarías a tu madre por cinco euros!', '¡Judas con zapatillas, lo más rastrero que existe!', '¡Tu deslealtad es una obra de arte del mal!'],
    mid:  ['Algo de rata tienes, pero no llegas al nivel de plaga.', 'Traicionas cuando conviene, que es lo peor.'],
    low:  ['Más leal que un perro, no traicionarías ni a tu peor enemigo.', 'Limpio como una patena.'],
    extreme: [
      '¡Escoria humana, no mereces la confianza de nadie!',
      '¡Todos a tu alrededor lo saben, solo tú te engañas!',
      '¡Eres el tipo de persona que destroza grupos y familias sin pestañear!',
      '¡Muérete de asco, traidor de mierda!',
      '¡La peor clase de basura: la que sonríe mientras te clava el cuchillo!',
    ],
  },
  gilipollas: {
    name: 'gilipollas', emoji: '🤡',
    high: ['¡Gilipollas de campeonato mundial!', '¡Si la gilipollez fuera dinero serías Elon Musk!', '¡Monumento nacional a la estupidez!'],
    mid:  ['Gilipollas a ratos, que ya es suficiente.', 'No eres tonto del todo, pero le pones muchas ganas.'],
    low:  ['Más listo que el hambre.', 'Dos dedos de frente, que aquí escasean.'],
    extreme: [
      '¡Eres una lacra para cualquier conversación, cállate!',
      '¡Deja de hablar, cada palabra que dices es un insulto a la inteligencia!',
      '¡La humanidad sería mejor sin tu aportación intelectual!',
      '¡Eres la prueba viviente de que Darwin se equivocó!',
      '¡Haz un favor al mundo y no opines nunca más!',
    ],
  },
  subnormal: {
    name: 'subnormal', emoji: '🧠',
    high: ['¡Darwin se equivocó contigo!', '¡Tu coeficiente compite con el de una ostra!', '¡Récord histórico de subnormalidad!'],
    mid:  ['Subnormal ocasional, pero con empuje puedes superar tu propio récord.', 'Más o menos espabilado, depende del día.'],
    low:  ['Más espabilado que un lince en ayunas.', 'Cerebro en forma.'],
    extreme: [
      '¡Una vergüenza para tu familia y para todos los que te conocen!',
      '¡Hablar contigo es perder neuronas, para de existir!',
      '¡Eres el techo de cristal de la estupidez humana!',
      '¡Hasta los animales te superan, y mira que es difícil!',
    ],
  },
  imbecil: {
    name: 'imbécil', emoji: '🤦',
    high: ['¡Imbécil supremo! Una obra maestra de la inutilidad.', '¡Cómo es posible funcionar así de mal!', '¡Premio gordo a la imbecilidad!'],
    mid:  ['Imbécil a temporadas, que no es poco.', 'No llegas al top, pero te esfuerzas.'],
    low:  ['Tienes dos dedos de frente, cosa que no abunda.', 'Espabilado.'],
    extreme: [
      '¡Qué asco de persona, un desperdicio total de espacio!',
      '¡Cierra el pico y piérdete para siempre, inservible!',
      '¡Tu existencia es una broma de mal gusto!',
      '¡Inútil de categoría, nadie te necesita aquí!',
    ],
  },
  capullo: {
    name: 'capullo', emoji: '😤',
    high: ['¡Capullo redomado! Mereces una placa conmemorativa.', '¡El capullo de capullos, una institución nacional!', '¡Eres el capullo que todo grupo odia!'],
    mid:  ['Capullo moderado, todavía tiene remedio.', 'Capullo a ratos, que es casi peor porque das esperanzas.'],
    low:  ['Buen tío/tía, de los que quedan pocos.', 'Ni rastro de capullo.'],
    extreme: [
      '¡Eres imposible de aguantar y todo el mundo lo sabe menos tú!',
      '¡Que te den, en serio, que te den con ganas!',
      '¡Todo el grupo habla pestes de ti cuando no estás, mérerecido lo tienes!',
      '¡Un insoportable de tomo y lomo, la vergüenza del grupo!',
    ],
  },
  pringado: {
    name: 'pringado', emoji: '🥴',
    high: ['¡Pringado total! Te pringa hasta la lluvia.', '¡El universo entero conspira contra ti!', '¡Pringado genético e irrecuperable!'],
    mid:  ['Te pasan cosas raras con demasiada frecuencia.', 'Pringado ocasional pero con tendencia al alza.'],
    low:  ['Tienes mucha calle, no te la mete nadie.', 'La mala suerte te respeta.'],
    extreme: [
      '¡Un pringado hasta en los huesos, no tiene cura!',
      '¡Naciste para perder y morirás perdiendo, acepta tu destino!',
      '¡Hasta el fracaso te falla, eso es talento!',
      '¡La vida entera te ha pasado por encima y ni te has dado cuenta!',
    ],
  },
  mamon: {
    name: 'mamón', emoji: '😏',
    high: ['¡Mamón de manual, capítulo uno y portada!', '¡El mamón de mamones, categoría propia!', '¡Tan mamón que hasta tú mismo te das asco!'],
    mid:  ['Mamón a ratos, que igual es peor.', 'Se te ve el plumero cuando conviene.'],
    low:  ['Tío decente, de los que no abundan.', 'Ni rastro de mamonería.'],
    extreme: [
      '¡Insoportable de primera, nadie te soporta de verdad!',
      '¡Eres el tipo de persona que vacía las habitaciones al entrar!',
      '¡Un prepotente de mierda que no vale lo que se cree!',
      '¡Bájate del burro de una vez, no eres nadie!',
    ],
  },
  maricon: {
    name: 'maricón', emoji: '💅',
    high: ['¡Maricón de tomo y lomo!', '¡La reina de las reinas, nadie te quita el trono!', '¡Más pluma que un gallinero!'],
    mid:  ['Algo de pluma hay, no te voy a mentir.', 'Ni muy muy ni tan tan.'],
    low:  ['Más macho/a que Rambo con resaca.', 'Testosterona a raudales.'],
    extreme: [
      '¡Eres una vergüenza para el apellido que llevas, guarro asqueroso!',
      '¡Métete en el armario y cierra con llave desde dentro!',
      '¡Lo que das asco, en serio, date una vuelta y no vuelvas!',
      '¡Un nefasto de primera, ni tus amigos te aguantan!',
      '¡Escóndete, que haces daño a la vista y al alma!',
      '¡Eres lo que la gente evita cuando cruza la calle!',
    ],
  },
  friki: {
    name: 'friki', emoji: '🤓',
    high: ['¡Friki supremo! Tu cueva huele a pizzas viejas.', '¡Eres el señor de los frikis!', '¡Tan friki que hasta los demás frikis te miran raro!'],
    mid:  ['Friki moderado, sales a la calle de vez en cuando.', 'Friki con disimulo, pero se nota.'],
    low:  ['Cero raro, lo más normal.', 'Social y presentable.'],
    extreme: [
      '¡Sal de la cueva y date una ducha, que hueles a humedad y fracaso!',
      '¡No has tocado a una persona real en años y se nota!',
      '¡La vida real te llama y tú cuelgas!',
      '¡Un caso perdido que el sol ya no reconoce!',
    ],
  },
  chorizo: {
    name: 'chorizo', emoji: '🥩',
    high: ['¡Chorizo de alto voltaje! Robas hasta el tiempo.', '¡El ladrón de ladrones, una leyenda!', '¡Chorizo profesional, deberías cotizar!'],
    mid:  ['Algo de chorizo hay, pero tampoco para la cárcel.', 'Roba a lo pequeño, que es lo más cobarde.'],
    low:  ['Honrado a tope, hasta devuelve el cambio de más.', 'Limpio como los chorros del oro.'],
    extreme: [
      '¡Un ladrón miserable que roba hasta la dignidad ajena!',
      '¡Vas a acabar mal, todas las ratas acaban en la trampa!',
      '¡Escoria de barrio, incapaz de ganarte nada con honestidad!',
      '¡Eres la deshonra de cualquier grupo, bicho rastrero!',
    ],
  },
  guarro: {
    name: 'guarro', emoji: '🤢',
    high: ['¡Tu habitación es patrimonio de la inmundicia!', '¡Eres el embajador de la suciedad!', '¡Las cucarachas se mudan de tu casa!'],
    mid:  ['Guarro a temporadas, cuando nadie mira.', 'La higiene es opcional para ti.'],
    low:  ['Limpio como los chorros del oro.', 'Pulcro y ordenado.'],
    extreme: [
      '¡Das asco físico y moral, un completo desastre humano!',
      '¡Ni una madre te querría limpiar, guarro asqueroso!',
      '¡Hueles a derrota desde tres metros, hazte mirar!',
      '¡Eres una plaga ambulante, mantente alejado de la gente!',
    ],
  },
  paleto: {
    name: 'paleto', emoji: '🌾',
    high: ['¡Paleto de pura cepa! Hueles a paja y tractor.', '¡El pueblo te reclama!', '¡Tan paleto que el WiFi no te llega al corazón!'],
    mid:  ['Algo de pueblo te queda, y no es malo.', 'Paleto con pretensiones de urbanita, lo peor.'],
    low:  ['Más fino que un coral, con modales.', 'Sofisticado.'],
    extreme: [
      '¡Vuelve a tu aldea y no contamines más la ciudad con tu presencia!',
      '¡Un cateto redomado, incapaz de adaptarse al mundo real!',
      '¡La evolución te dejó a medias, palurdo de mierda!',
      '¡Hay límites para la ignorancia y tú los superas todos!',
    ],
  },
  cutre: {
    name: 'cutre', emoji: '🗑️',
    high: ['¡Cutre nivel dios! Reutilizas vasos de plástico tres semanas.', '¡El rey de la cutrez, una filosofía de vida!', '¡Enmarcarías una entrada de metro usada!'],
    mid:  ['Cutre moderado, escatimas donde puedes.', 'Ni generoso ni tacaño, cutre con estilo.'],
    low:  ['Tienes clase, tío/a.', 'Espléndido/a.'],
    extreme: [
      '¡Una miseria humana que da vergüenza ajena solo de verle!',
      '¡No das ni los buenos días sin calcular si te sale rentable!',
      '¡Eres el tipo que divide la cuenta al céntimo y deja propina cero!',
      '¡Tacaño de alma, pobre de espíritu, una pena de persona!',
    ],
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
  const verdict = percent >= 70 ? pick(cfg.high) : percent <= 30 ? pick(cfg.low) : pick(cfg.mid);
  const finale = pick(cfg.extreme);

  const filled = Math.round(percent / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

  const text =
    `${cfg.emoji} *@${target.split('@')[0]} es ${percent}% ${cfg.name}*\n\n` +
    `${bar}\n\n` +
    `_${verdict}_\n\n` +
    `*${finale}*`;

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
