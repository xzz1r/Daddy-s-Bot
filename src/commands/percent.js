// Generic random % about someone — used by !gay, !simp, !gilipollas, etc.

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const LABELS = {
  gay: {
    name: 'gay',
    high: ['Sal del armario de una vez, todo el mundo ya lo sabe menos tu.', 'Mas gay que un arcoiris en una sauna, y encima orgulloso.', 'Nenaza redomada, hasta tus huesos son rosas.'],
    mid:  ['Algo se te mueve por dentro cuando pasan tios buenos.', 'Ni fu ni fa, pero tampoco eres muy macho.'],
    low:  ['Mas hetero que un toro en feria.', 'Cero pluma, cero duda.'],
    extreme: [
      'Vaya maricon, deberias salirte del grupo, nadie te quiere aca.',
      'Eres el tipo de persona del que todos hablan mal cuando sales de la sala.',
      'Nadie te lo dice a la cara pero todos piensan lo mismo de ti.',
      'Date cuenta de que sobras aqui, en serio.',
      'Tu familia ya ni pregunta por ti, algo habra.',
    ],
  },
  simp: {
    name: 'simp',
    high: ['Simp de campeonato, te lamerias los zapatos por un emoji.', 'Te pones de rodillas con solo que te miren, da pena verte.', 'Vendes tu dignidad por un "hola", eso dice mucho de ti.'],
    mid:  ['Simping controlado, pero se te nota la desesperacion.', 'No llegas a simp total pero vas por el camino.'],
    low:  ['Digno. No te arrastras por nadie.', 'Frialdad de iceberg, nadie te dobla.'],
    extreme: [
      'Eres un felpudo con patas. Te utilizan, lo saben, y tu sigues ahi sonriendo.',
      'Date cuenta de que nadie te respeta y es completamente culpa tuya.',
      'La persona por la que babeas ni recuerda tu nombre, eso te deberia decir algo.',
      'Tan desesperado que das pena hasta a los que te odian.',
      'Llevas tanto tiempo arrastandote que ya ni sabes como estar de pie.',
    ],
  },
  sexy: {
    name: 'sexy',
    high: ['Estas como un queso, para comerte vivo.', 'Peligroso, deberias llevar senyal de advertencia.', 'Un canon andante, que Dios te bendiga.'],
    mid:  ['No esta mal, tampoco para tirar cohetes.', 'Pasable. Con buena luz y poca competencia.'],
    low:  ['Cero atractivo, lo siento mucho.', 'Ni con filtro de Instagram levantarias nada.'],
    extreme: [
      'Por fuera puede que algo haya, por dentro eres un desierto de personalidad.',
      'El fisico no te salva de ser la persona mas aburrida de este grupo.',
      'Hay cosas que ni la estetica arregla, y tu eres una de ellas.',
      'Alguien con tu cara deberia tener mas cuidado con su caracter, porque no compensa.',
    ],
  },
  rata: {
    name: 'rata',
    high: ['Rata de alcantarilla, traicionarias a tu madre por cinco euros.', 'Judas con zapatillas, lo mas rastrero que existe.', 'Tu deslealtad es arte. Todo el mundo en este grupo ya lo sabe.'],
    mid:  ['Algo de rata tienes, pero no llegas al nivel de plaga todavia.', 'Traicionas cuando conviene, que es lo peor que existe.'],
    low:  ['Mas leal que un perro, no traicionarias ni a tu peor enemigo.', 'Limpio como una patena.'],
    extreme: [
      'Todo el mundo en este grupo sabe que no eres de fiar, solo que nadie te lo dice.',
      'Eres el tipo de amigo que la gente va descartando con los anyos, y lo mereces.',
      'La gente no te cuenta cosas importantes porque saben que las vas a usar en tu beneficio.',
      'Hay personas que entran en tu vida y la mejoran. Tu eres de las otras.',
      'Cuando te vayas del grupo nadie va a preguntar por ti, y en el fondo ya lo sabes.',
    ],
  },
  gilipollas: {
    name: 'gilipollas',
    high: ['Gilipollas de campeonato mundial, un fenomeno de la naturaleza.', 'Si la gilipollez fuera dinero serias millonario. Lastima que no lo sea.', 'Monumento nacional a la estupidez, enhorabuena.'],
    mid:  ['Gilipollas a ratos, que ya es suficiente para arruinar una conversacion.', 'No eres tonto del todo, pero le pones muchas ganas.'],
    low:  ['Mas listo que el hambre.', 'Dos dedos de frente, que aqui escasean.'],
    extreme: [
      'Cada vez que hablas la gente aguanta la respiracion esperando que te calles.',
      'Eres el tipo de persona que baja el nivel de cualquier conversacion en la que entras.',
      'Tu opinion no le importa a nadie aqui, aunque tu creas que si.',
      'Hay gente que te aguanta por educacion, no por carino, empieza a distinguirlo.',
      'Abre la boca menos y piensa mas. Te lo digo por tu bien.',
    ],
  },
  subnormal: {
    name: 'subnormal',
    high: ['Darwin se equivoco contigo, eres la prueba de que la evolucion falla.', 'Tu coeficiente intelectual compite con el de una ostra en mal dia.', 'Record historico de subnormalidad, y encima sin saberlo.'],
    mid:  ['Subnormal ocasional, pero con esfuerzo puedes superar tu propio record.', 'Mas o menos espabilado, depende del dia y de cuanto hayas dormido.'],
    low:  ['Mas espabilado que un lince en ayunas.', 'Cerebro en forma, no hay quien te engane.'],
    extreme: [
      'Hablar contigo es un ejercicio de paciencia que muy poca gente esta dispuesta a hacer.',
      'La gente te explica las cosas despacio no porque sean amables, sino porque saben que es necesario.',
      'Hay una razon por la que nadie te consulta nada importante.',
      'No es que tengas mala suerte. Es que tomas malas decisiones y llamas mala suerte al resultado.',
      'El problema no es lo que no sabes. Es que no sabes lo que no sabes.',
    ],
  },
  imbecil: {
    name: 'imbecil',
    high: ['Imbecil supremo, una obra maestra de la inutilidad humana.', 'Como es posible funcionar tan mal y no darse cuenta.', 'Premio gordo a la imbecilidad, lo has conseguido sin intentarlo.'],
    mid:  ['Imbecil a temporadas, que no es poco.', 'No llegas al top pero te esfuerzas, hay que reconocerlo.'],
    low:  ['Tienes dos dedos de frente, cosa que no abunda.', 'Espabilado, no te la cuelas facil.'],
    extreme: [
      'Eres el tipo de persona que la gente evita cuando necesita que algo salga bien.',
      'Nadie te asigna nada importante porque todos saben como va a terminar.',
      'Tu presencia en este grupo es tolerada, no bienvenida, y en el fondo ya lo notas.',
      'Hay personas que mejoran los grupos en los que estan. Tu no eres una de ellas.',
      'La gente finge que te escucha pero en su cabeza ya paso pagina hace rato.',
    ],
  },
  capullo: {
    name: 'capullo',
    high: ['Capullo redomado, mereces una placa conmemorativa de lo insoportable que eres.', 'El capullo de capullos, una institucion. Todo el grupo lo sabe.', 'Eres el capullo del grupo y todos lo piensan, solo que nadie te lo dice.'],
    mid:  ['Capullo moderado, todavia tiene remedio aunque el tiempo juega en contra.', 'Capullo a ratos, que es peor porque das falsas esperanzas.'],
    low:  ['Buen tio, de los que quedan pocos.', 'Ni rastro de capullo, rara avis.'],
    extreme: [
      'Todo el mundo en este grupo te aguanta pero nadie te elegiria si tuviera opcion.',
      'Eres de esas personas con las que la gente queda por compromiso, nunca por ganas.',
      'Te crees que caes bien y en realidad solo nadie ha tenido el valor de decirte la verdad.',
      'Hay conversaciones que se cortan cuando llegas. Piensa por que.',
      'Si algun dia te quedas sin conocidos, no busques la razon fuera de ti.',
    ],
  },
  pringado: {
    name: 'pringado',
    high: ['Pringado total, te pringa hasta la lluvia cuando no llueve a nadie mas.', 'El universo entero conspira contra ti y encima colaboras.', 'Pringado de nacimiento, genetico e irrecuperable.'],
    mid:  ['Te pasan cosas raras con demasiada frecuencia para que sea casualidad.', 'Pringado ocasional, pero con tendencia al alza preocupante.'],
    low:  ['Tienes mucha calle, no te la mete nadie.', 'La mala suerte te respeta, cosa rara.'],
    extreme: [
      'Naciste para perder y en el fondo ya lo has aceptado, eso es lo mas triste.',
      'Hay personas que aprenden de sus errores. Tu coleccionas los mismos errores distintas temporadas.',
      'La vida no te ha tratado mal. Eres tu quien te tratas mal y le echas la culpa a la vida.',
      'Todo el mundo a tu alrededor avanza. Piensa por que tu sigues en el mismo sitio.',
      'No es mala suerte. Es que tomas las mismas decisiones y te sorprendes del mismo resultado.',
    ],
  },
  mamon: {
    name: 'mamon',
    high: ['Mamon de manual, capitulo uno y portada a color.', 'El mamon de mamones, una categoria propia que nadie quiere compartir contigo.', 'Tan mamon que hasta tu te das asco cuando te pones a pensar.'],
    mid:  ['Mamon a ratos, que igual es peor porque nadie sabe cuando atacas.', 'Se te ve el plumero de mamon cuando crees que no te miran.'],
    low:  ['Tio decente, de los que no abundan.', 'Ni rastro de mamoneria, insólito.'],
    extreme: [
      'Eres insoportable y todo el mundo lo sabe menos tu, que es exactamente el problema.',
      'La gente no te dice lo que piensa de ti por educacion, no porque no lo piensen.',
      'Hay personas que llenan una sala cuando entran. Tu la vacias.',
      'Bajate del burro. No eres tan importante como crees en tu cabeza.',
      'Tienes un concepto de ti mismo que no coincide con el que tiene nadie mas.',
    ],
  },
  maricon: {
    name: 'maricon',
    high: ['Maricon de tomo y lomo, y encima sin talento para disimularlo.', 'La reina de las reinas, nadie te quita el trono de lo ridiculo.', 'Mas pluma que un gallinero en hora punta.'],
    mid:  ['Algo de pluma hay, no te voy a mentir.', 'Ni muy muy ni tan tan, en el limbo de la virilidad.'],
    low:  ['Mas macho que Rambo con resaca.', 'Testosterona a raudales, ninguna duda.'],
    extreme: [
      'Vaya maricon, deberias salirte del grupo, nadie te quiere aca.',
      'Eres exactamente el tipo de persona del que la gente habla mal cuando te vas.',
      'Nadie te lo dice a la cara porque no mereces ni ese esfuerzo.',
      'En serio, piensa cuantas personas del grupo te escribirian si desaparecieras. Piensalo bien.',
      'Hay una razon por la que siempre eres el ultimo al que avisan de los planes.',
      'La gente te soporta, no te quiere. Aprende la diferencia.',
    ],
  },
  friki: {
    name: 'friki',
    high: ['Friki supremo, tu cueva huele a fracaso social y pizza fria.', 'Eres el senyor de los frikis, el elegido por nadie.', 'Tan friki que hasta los demas frikis te miran raro en los foros.'],
    mid:  ['Friki moderado, sales a la calle de vez en cuando, lo cual ya es algo.', 'Friki con disimulo, pero se nota en cuanto abres la boca.'],
    low:  ['Cero raro, lo mas normal del grupo.', 'Social y presentable, que aburrido.'],
    extreme: [
      'Llevas tanto tiempo hablando con pantallas que ya no sabes como hablar con personas.',
      'Hay un mundo fuera de tu habitacion y lleva anyos sin verte.',
      'La ultima vez que alguien te llamo para salir fue porque se habian equivocado de numero.',
      'Tu historial de busqueda dice mas de ti que cualquier cosa que puedas contarme.',
      'Eres el tipo de persona cuya ausencia en los planes nadie nota hasta que apareces.',
    ],
  },
  chorizo: {
    name: 'chorizo',
    high: ['Chorizo de alto voltaje, robas hasta el tiempo a la gente que te escucha.', 'El ladron de ladrones, una leyenda viva de lo ruin que puede ser alguien.', 'Chorizo profesional, todo te parece que puede ser tuyo.'],
    mid:  ['Algo de chorizo hay, pero no llegas a la carcel todavia.', 'Roba a lo pequenyo, que es lo mas cobarde que existe.'],
    low:  ['Honrado a tope, hasta devuelves el cambio de mas.', 'Limpio como los chorros del oro.'],
    extreme: [
      'Todo el mundo en este grupo ya sabe como eres. Solo que nadie te lo dice todavia.',
      'Eres de esos que se aprovechan de la gente buena hasta que aprenden la leccion.',
      'Vas a acabar solo y va a ser completamente merecido.',
      'La confianza que la gente te daba ya no existe. Piensa en lo que hiciste con ella.',
      'Hay cosas que no se perdonan aunque se olviden. Tu sabes a que me refiero.',
    ],
  },
  guarro: {
    name: 'guarro',
    high: ['Tu habitacion es patrimonio de la inmundicia nacional.', 'Eres el embajador oficial de la suciedad, sin haberlo pedido.', 'Las cucarachas se mudarian de tu casa si pudieran permitirselo.'],
    mid:  ['Guarro a temporadas, cuando nadie mira y a veces cuando si.', 'La higiene es opcional para ti y se nota en la distancia.'],
    low:  ['Limpio como los chorros del oro, que aburrido eres.', 'Pulcro y ordenado, insoportable.'],
    extreme: [
      'Hay personas que generan rechazo fisico nada mas entrar a una habitacion. Tu eres una.',
      'La forma en que vives dice mucho de como te valoras a ti mismo. Y no dice nada bueno.',
      'Nadie te visita en casa por casualidad. Es una decision meditada.',
      'Eres el tipo de persona al que la gente le dice que esta bien cuando claramente no lo esta.',
      'Cuida un poco como te presentas al mundo, porque el mundo ya tiene una opinion formada.',
    ],
  },
  paleto: {
    name: 'paleto',
    high: ['Paleto de pura cepa, hueles a paja y a vida sin futuro.', 'El pueblo te reclama y la ciudad te rechaza, eso lo dice todo.', 'Tan paleto que el WiFi no te llega al corazon ni a la cabeza.'],
    mid:  ['Algo de pueblo te queda, y no precisamente lo bueno.', 'Paleto con pretensiones de urbanita, que es lo peor que puedes ser.'],
    low:  ['Mas fino que un coral, con modales y todo.', 'Sofisticado, da asco lo bien que te desenvuelves.'],
    extreme: [
      'Puedes cambiar de ciudad pero no puedes cambiar lo que eres, y eso se nota.',
      'Hay personas que donde van mejoran el ambiente. Tu llevas el tuyo puesto.',
      'La ignorancia no es un problema cuando se sabe que se tiene. Tu caso es mas complicado.',
      'Viniste a la ciudad a demostrar algo y lo unico que has demostrado es de donde vienes.',
      'Hay un techo en tu cabeza que ninguna educacion ha podido romper todavia.',
    ],
  },
  cutre: {
    name: 'cutre',
    high: ['Cutre nivel dios, reutilizas los vasos de plastico tres semanas.', 'El rey de la cutrez, una filosofia de vida que da pena ajena.', 'Tan cutre que enmarcarías una entrada de metro usada si hubiera sitio en la pared.'],
    mid:  ['Cutre moderado, escatimas donde puedes y donde no deberias.', 'Ni generoso ni tacanyno, cutre con una coherencia que da miedo.'],
    low:  ['Tienes clase, tio. Derrochas hasta cuando no toca.', 'Esplendido, inaguantable.'],
    extreme: [
      'Eres el tipo de persona que divide la cuenta al centimo y deja propina cero.',
      'La gente prefiere no quedar contigo a comer porque saben como termina.',
      'Hay personas que dan sin pensar. Tu piensas tanto antes de dar que al final no das nada.',
      'Tu tacanyeria no es una virtud economica. Es un defecto de caracter.',
      'Nadie te pide que invites nunca porque ya saben la respuesta de antemano.',
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
  const bar = '+'.repeat(filled) + '-'.repeat(10 - filled);

  const text =
    `*@${target.split('@')[0]} es ${percent}% ${cfg.name}*\n\n` +
    `${bar}\n\n` +
    `_${verdict}_\n\n` +
    `${finale}`;

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
