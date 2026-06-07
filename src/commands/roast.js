'use strict';

const { getSender, bareJid } = require('../utils/wa');
const { pick } = require('../utils/helpers');
const { getAura } = require('../utils/auraStore');
const { getUserCount } = require('../utils/messageCounter');

const fmt = n => n.toLocaleString('es-ES');

// ─── Formato ──────────────────────────────────────────────────────────────────

const HEADERS = [
  '🔥 *ROAST SIN ANESTESIA* 🔥',
  '💀 *EJECUCIÓN PÚBLICA* 💀',
  '☠️ *AUTOPSIA EN DIRECTO* ☠️',
  '🔪 *DESTRUCCIÓN TOTAL* 🔪',
  '⚰️ *ENTIERRO ABIERTO AL PÚBLICO* ⚰️',
  '🩸 *MASACRE DOCUMENTADA* 🩸',
  '🔥 *ASADO HASTA EL HUESO* 🔥',
  '💣 *DEMOLICIÓN CONTROLADA* 💣',
  '🧨 *VOLADURA PSICOLÓGICA* 🧨',
  '⚡ *SENTENCIA SIN APELACIÓN* ⚡',
];

const CLOSERS = [
  '_Sin piedad. Sin retorno. Sin terapia que lo arregle._',
  '_Esto no se cura, se asume._',
  '_El grupo es testigo. Que conste en acta._',
  '_No es opinión. Es diagnóstico._',
  '_Pásate por terapia, lo vas a necesitar._',
  '_Y lo peor es que ni una sola palabra es mentira._',
  '_Llora si quieres. No cambia nada._',
  '_Caso cerrado. Defunción confirmada._',
  '_Recoge lo que queda de tu dignidad de camino a la salida._',
  '_No hay segunda parte porque no hace falta._',
];

// ─── NOMBRE (%N = nombre real) ────────────────────────────────────────────────

const ROAST_NAME = [
  'Con el nombre %N ya se sabe todo: de dónde sales, el nivel de criterio que había en tu casa, y por qué llevas toda la puta vida compensando algo que ni tú sabes nombrar. Naciste perdiendo desde el certificado.',
  '%N. Alguien tomó esa decisión en serio, con ilusión, y ningún adulto en la sala tuvo los cojones de pararlo. Ese es el primer fracaso colectivo de la cadena de fracasos que eres.',
  'Te llamas %N y arrastras eso cada vez que abres la boca para presentarte. La primera impresión ya es una derrota antes de que digas nada. Imagina la segunda.',
  'El nombre %N no abre puertas, las cierra desde fuera. Anuncia al portero quién llega y el portero ya decidió que esta noche no entras.',
  '%N es el tipo de nombre que en una entrevista genera una pausa incómoda. No de respeto. De pena ajena anticipada por lo que viene detrás.',
  'Pusieron %N en el acta y nadie se preguntó si le estaban jodiendo la vida al crío antes de que respirara. Spoiler: se la jodieron, y tú eres la prueba andante.',
  'Llevas el nombre %N con la misma elegancia con la que te lo pusieron: ninguna. Improvisado, mal pensado y condenado desde el minuto cero.',
  'El nombre %N tiene una historia detrás. Por desgracia es la clase de historia que la gente finge no haber escuchado para no tener que reaccionar.',
  'Con %N de nombre ya partes con un lastre. No es el peor del planeta, pero desde luego no te está haciendo ningún favor, igual que todo lo demás en tu vida.',
  'Te bautizaron %N con toda la esperanza del mundo y el tiempo se encargó de demostrar que la esperanza era lo único que había en esa habitación.',
  '%N suena exactamente a lo que eres: algo que prometía sobre el papel y que en la realidad no cerró ni un solo trato. Decepción con nombre propio.',
  'El nombre %N lleva pegado un contexto social que la gente lee en medio segundo y archiva en la carpeta de "ni me molesto". Tú no lo ves porque lo cargas desde siempre.',
  'Que te llames %N y no hayas hecho una sola cosa memorable es una consistencia tan brutal que casi merece un estudio. Casi.',
  '%N es un nombre que existe y poco más. No dice nada, no destaca, no posiciona. Igual que tú: presente en la lista, ausente en todo lo demás.',
  'Pusieron %N en el documento y desde entonces ese papel no ha recibido una sola noticia que justifique haber gastado tinta en él.',
  'Con el nombre %N y el historial que arrastras, lo único coherente de toda tu existencia es lo bien que pega lo uno con lo otro. Mediocridad de marca completa.',
  '%N es justo el nombre que pone alguien que no piensa a largo plazo. Esa falta de visión es hereditaria y en ti se nota en cada decisión que tomas.',
  'El nombre %N en voz alta genera una reacción inmediata. Lamentablemente es la cara que pone la gente cuando huele algo que prefiere no investigar.',
  'Nadie elige su nombre, vale. Pero sí elige qué construir después. Te tocó %N y en el segundo capítulo, el que sí dependía de ti, tampoco hay una mierda que rescatar.',
  'Te llamas %N y el grupo entero lleva tiempo sin saber cómo decirte que el nombre es lo de menos a estas alturas del desastre.',
  '%N. La gente lo escucha, lo repite para memorizarlo y al día siguiente ya lo olvidó. Por el nombre y por todo lo absolutamente irrelevante que viene con él.',
  'Con %N te colgaron una etiqueta que habla más del origen que del destino. Y el destino, fiel a su estilo, no ha hecho nada por desmentirla.',
  'El nombre %N cae siempre un poco fuera de sitio, igual que tú en cada conversación, en cada foto de grupo y en cada plan al que te invitan por compromiso.',
  'Que alguien se llame %N y tenga encima el perfil que tienes es la prueba definitiva de que el nombre era el menor de tus problemas.',
  '%N es el nombre con el que decidieron que ibas a presentarte al mundo para siempre. El mundo echó un vistazo, tomó nota y pasó de largo sin frenar.',
  'Hay nombres que imponen y nombres que dan risa. %N consigue lo más difícil: que no provoque absolutamente nada. Como tú entrando a cualquier sitio.',
  'El día que te pusieron %N firmaron tu condena a ser uno más del montón. Y por una vez en tu familia, acertaron de pleno con el pronóstico.',
  'Te llamas %N y eso es lo más interesante que vas a aportar en toda la conversación. Y ni siquiera es interesante, solo es lo único que hay.',
  '%N suena a personaje secundario que muere en el primer capítulo sin que nadie lo eche de menos. Eres eso, pero en versión grupo de WhatsApp.',
  'Con el nombre %N podrías haber construido cualquier cosa. Elegiste construir nada, y encima con una constancia admirable. Felicidades, supongo.',
  'El nombre %N es lo único que te identifica, porque personalidad, logros y carisma siguen en paradero desconocido desde que naciste.',
  '%N. Hasta tu nombre suena cansado de pertenecerte.',
  'Te llamaron %N y la genética remató la faena por dentro y por fuera. Pack completo de mala suerte sin posibilidad de reembolso.',
  'El nombre %N tiene tan poco peso que la gente te confunde constantemente con cualquier otro. Y honestamente, nadie sale perdiendo en el cambio.',
  'Con %N de nombre y cero historia detrás, eres literalmente un campo de texto vacío con patas. Rellenable por cualquiera, recordado por nadie.',
];

// ─── BIO VACÍA ────────────────────────────────────────────────────────────────

const ROAST_BIO_EMPTY = [
  'Sin descripción. El único espacio del planeta donde decides cómo quiere verte la gente y lo dejaste en blanco. Eso no es misterio, gilipollas, es que no hay una sola cosa dentro de ti que merezca una frase.',
  'Bio vacía en pleno 2025. Ni una palabra, ni un emoji de relleno, ni un intento patético. El único sitio donde nadie te puede juzgar por lo que pones y aun así conseguiste decir nada. Récord absoluto de vacío.',
  'La bio en blanco no es minimalismo ni estética zen. Es la confirmación oficial de que cuando te paras a pensar en ti mismo, sin prisa y sin presión, no encuentras absolutamente nada que valga la pena.',
  'Sin bio porque rellenarla te obligaría a decidir quién coño eres. Y eso requiere ser algo. El blanco lo grita más fuerte que cualquier frase: aquí no vive nadie.',
  'El perfil vacío es la versión digital de entrar a un sitio y que ni el camarero levante la vista. Ni en el único rincón que es 100% tuyo encontraste material para llenar un renglón.',
  'Tienes el campo de descripción ahí, gratis, infinito, sin nadie juzgándote, y lo dejaste vacío. Eso ya es el autorretrato más honesto que has hecho en tu vida: la nada absoluta firmada por ti.',
  'Ni una sola palabra en la bio. El único texto que escribes sin que nadie te lo exija ni te corrija, y el resultado es el vacío. Coherente con todo lo demás que produces, que es nada.',
  'Bio en blanco. Lo que ve la gente cuando te busca es un perfil que anuncia en silencio absoluto que detrás no hay un puto nada que merezca ocupar espacio.',
  'Ni un intento. El único lugar donde controlas la narrativa al cien por cien y elegiste no tener narrativa porque no la hay. No existe historia que contar sobre ti.',
  'La descripción vacía dice exactamente lo mismo que dices tú cuando hablas: nada que se quede, nada que importe, nada que nadie vaya a recordar ni cinco minutos después.',
  'Dejaste la bio en blanco y sin querer hiciste la obra de arte conceptual más sincera del grupo: el retrato perfecto de un vacío con conexión a internet.',
  'Sin descripción. Ni siquiera te molestaste en mentir sobre ti mismo, que es lo mínimo que hace la gente con algo de amor propio. Tú ni para eso das.',
  'La bio vacía es tu forma de avisar al mundo de que no hay nada que ver aquí. Por una vez en tu vida, comunicaste algo con total claridad.',
  'El silencio de tu bio es ensordecedor. Es el sonido exacto de alguien que se buscó por dentro, no encontró nada y decidió no avergonzarse intentándolo.',
  'Cero caracteres en la descripción. Hasta los bots de spam ponen algo. Tú quedaste por debajo del nivel de esfuerzo de un programa automático sin alma.',
  'Bio en blanco: el equivalente a presentarte a una entrevista y quedarte mirando la pared cuando te dicen "háblame de ti". No tienes nada y se nota a kilómetros.',
  'No pusiste nada porque poner algo implicaría reconocer que hay un "tú" sobre el que escribir. Y ambos sabemos que esa es una afirmación generosa.',
  'La descripción vacía es lo más interesante de tu perfil, y es literalmente la ausencia de información. Piensa en eso un rato, si es que puedes pensar.',
  'Dejaste la bio en blanco con la misma energía con la que dejas todo en tu vida a medias: sin terminar, sin empezar, sin sentido.',
  'Sin bio. El grupo lo interpreta como lo que es: ni siquiera tú te consideras lo bastante interesante como para describirte. Por una vez, autoconciencia.',
];

// ─── BIO CON CONTENIDO ────────────────────────────────────────────────────────

const ROAST_BIO_FULL = [
  'La bio es el único texto que escribes tú solo, sin prisa, con tiempo infinito, para que la gente te vea como quieres. Y aun así salió esa mierda. Imagina lo que produces cuando tienes que improvisar.',
  'Lo que pusiste en la descripción lo pusiste creyendo que decía algo bueno de ti. El grupo ya lo leyó. Lo único que dice es que no tienes ni idea de cómo te ve el resto del mundo.',
  'Redactaste tu propia presentación al universo con toda la calma del planeta, sin nadie presionándote, y llegaste a eso. Ese es el techo absoluto de tu criterio funcionando a pleno rendimiento. Da miedo.',
  'Tu bio es branding personal de saldo. Conseguiste lo imposible: que un texto pensado para impresionar comunique exactamente lo contrario de lo que pretendías. Talento, pero para el ridículo.',
  'Tu descripción dice más de ti de lo que crees. No por lo que escribiste, sino por el hecho de que pensaste que eso te dejaba bien. Esa desconexión con la realidad es tu rasgo más estable.',
  'Pusiste esa frasecita en la bio para que la gente pensara bien de ti. Lo tienen clarísimo, sí, pero no es ni de lejos lo que tú calculabas. Tiro por la culata, como todo lo tuyo.',
  'La descripción del perfil: el único texto enteramente tuyo, con tiempo y sin presión. Y el resultado está ahí, expuesto, para que todo el que te busque sepa de antemano con qué nivel trata.',
  'Tienes una bio porque crees de verdad que te define bien. El grupo la leyó hace tiempo, hizo una mueca y siguió con su vida. Esa mueca es tu legado.',
  'Lo que escribiste en la bio en tu cabeza sonaba a algo profundo. Fuera de tu cabeza, en el mundo real donde vivimos los demás, suena a exactamente lo que eres. Y eso no es un cumplido.',
  'Tu bio es la primera impresión que controlas al 100%. Con toda esa ventaja servida en bandeja, aun así salió así de mal. Las impresiones que no controlas deben ser un genocidio.',
  'Esa cita que pusiste en la bio para parecer interesante hace justo lo contrario: confirma que necesitas frases ajenas porque tú no produces ni una idea propia que aguante en pie.',
  'Tu descripción es el clásico intento de venderte como algo que no eres. El problema es que el producto está delante y nadie se cree el anuncio. Publicidad engañosa con denuncia incluida.',
  'Leí tu bio. La leí dos veces por si me había perdido algo. No me había perdido nada. Estaba todo ahí, y todo era una decepción perfectamente redactada.',
  'Pusiste tanto esfuerzo en esa bio para acabar comunicando que eres exactamente la persona que el grupo ya sospechaba. Gracias por el documento autoinculpatorio.',
  'Tu descripción tiene el tono de alguien que se cree mucho más interesante de lo que el resto del mundo ha verificado empíricamente. Ese delirio es lo único grande que tienes.',
  'La bio que tienes es un currículum de cosas que crees ser. La realidad lleva años presentando un informe contradictorio y mucho más fiable.',
  'Escribiste eso para destacar y lo único que destaca es la distancia entre cómo te ves y cómo eres. Esa brecha cabría un grupo de WhatsApp entero dentro.',
  'Tu bio grita "miradme, soy especial" y el grupo responde con el silencio más educado que ha producido nunca. Hay cosas que ni por compasión se comentan.',
  'Redactaste tu descripción con la confianza de un genio y el resultado de alguien que nunca ha recibido feedback honesto. Aquí lo tienes, gratis: es mala.',
  'Tu bio es la prueba de que tener tiempo, espacio y libertad total no sirve de nada si lo que hay dentro para expresar es esto. Recursos desperdiciados en estado puro.',
];

// ─── ACTIVIDAD ────────────────────────────────────────────────────────────────
// Solo se roastea la INACTIVIDAD (fantasmas), que es lo que perjudica al grupo.
// La actividad alta NO es objeto de roast — es buena para el grupo, así que para
// usuarios activos esta variable se descarta antes de llegar aquí.

function roastActivity(count) {
  if (count === 0) {
    return pick([
      'CERO mensajes. Ni uno. Estás en el grupo ocupando una plaza, consumiendo el contenido que otros curran, y no has soltado ni una sílaba. Eso no es timidez, es ser un parásito digital con la cara muy dura.',
      'El contador marca cero absoluto. Llevas aquí el tiempo suficiente para que eso ya no dé vergüenza, sino asco. El fantasma que ni se aparece, solo chupa datos y se larga.',
      'Cero mensajes en todo el historial. Entras, espías, te vas. Eres el mirón del grupo, el que lo ve todo y no aporta una mierda. Nadie te echaría de menos porque nadie ha notado que estás.',
      'Ni un solo mensaje. El grupo no tiene ni una prueba de que existas dentro de él. Eres un nombre en la lista de participantes y nada más. Un cero a la izquierda, literal y estadísticamente.',
      'Cero textos. El nivel máximo de gorrón: consumir todo, aportar nada. El que está en cuarenta grupos sin estar en ninguno, porque a ti te la suda todo y todos. Y se nota.',
      'Cero. Has logrado el récord de irrelevancia: presente sin presencia. Ni un "buenas", ni un sticker, ni un puto emoji. El grupo respiraría exactamente igual si no existieras, y eso lo dice todo.',
    ]);
  }
  if (count < 20) {
    return pick([
      `${fmt(count)} mensajes en TOTAL. Todo lo que has aportado al grupo en tu existencia entera cabe en una pantalla sin scroll. Decoración barata que nadie pidió ni pagaría.`,
      `${fmt(count)} textos miserables. A ese ritmo el grupo necesita un recordatorio de que sigues vivo. Y no por cariño, sino para decidir si merece la pena seguir teniéndote en la lista.`,
      `Con ${fmt(count)} mensajes ocupas una plaza que alguien con algo que decir aprovecharía mejor. Eres el asiento vacío que respira. Sobras y encima molestas.`,
      `${fmt(count)} mensajes. Esa cifra le grita al grupo lo poco que te importa lo que pasa aquí. Mensaje recibido alto y claro, fantasma de medio pelo.`,
      `${fmt(count)} textos en todo el historial. Suficiente para confirmar que existes, insuficiente para que a un solo ser humano le importe si desapareces mañana sin despedirte.`,
    ]);
  }
  if (count < 60) {
    return pick([
      `${fmt(count)} mensajes. Presencia de los que lo leen TODO y no aportan NADA. El público mudo que se alimenta del trabajo de los demás y se esconde cuando toca poner algo encima de la mesa.`,
      `Con ${fmt(count)} mensajes estás en la zona gris de los que están pero no cuentan. No eres del todo fantasma, pero tampoco eres parte de una sola conversación que alguien recuerde. Limbo de irrelevancia.`,
      `${fmt(count)} textos. Justo por debajo del umbral en el que un ser humano empieza a importar en un grupo. Eres todavía un número, un bulto, un participante de relleno.`,
      `${fmt(count)} mensajes y el grupo sigue sin saber qué pintas aquí. Nadie tiene datos suficientes para opinar de ti porque no los has dado. Eres un misterio que a nadie le apetece resolver.`,
      `${fmt(count)} textos: la cantidad exacta para que no te echen por inactivo y para que nadie note si te vas. El equilibrio perfecto de la mediocridad invisible.`,
    ]);
  }
  // 60–149: aún tibio, sigue siendo objeto de roast por flojera
  return pick([
    `${fmt(count)} mensajes y el grupo sigue sin recordar uno solo que valiera la pena. Cantidad de tibio, calidad de cero. El peor combo: ni aportas ni callas del todo.`,
    `${fmt(count)} textos enviados sin dejar una sola marca. Estuviste, escribiste, y nadie recuerda de qué. Ruido de fondo con forma de persona.`,
    `Con ${fmt(count)} mensajes lograste lo más difícil: hablar sin que nadie te cite, opinar sin convencer a nadie y existir sin que importe. Esfuerzo desperdiciado en estado puro.`,
    `${fmt(count)} mensajes. Lo justo para no ser un fantasma del todo, lo poco para que nadie pueda nombrar una sola cosa tuya que haya cambiado algo aquí.`,
    `${fmt(count)} textos y tu aportación al grupo se resume en una palabra: estuviste. Eso es lo que queda de ti, y no es gran cosa para presumir.`,
  ]);
}

// ─── AURA ─────────────────────────────────────────────────────────────────────

function roastAura(aura) {
  if (aura < -10000) {
    return pick([
      `${fmt(aura)} de aura. Una cifra tan podrida que ya no es mala racha, es tu personalidad con número de serie. El marcador oficial de un fracaso sostenido en el tiempo con admirable constancia.`,
      `Aura de ${fmt(aura)}. Negativo histórico, de los que se cuentan. El tipo de número que no necesita contexto: dice todo lo que hay que saber sobre quién eres y por qué nadie apuesta por ti.`,
      `${fmt(aura)} puntos. El sótano tenía otro sótano y tú encontraste la escalera solo, sin ayuda, cavando con las manos. Pocos llegan tan abajo con tanto empeño y tan poca conciencia.`,
      `Con ${fmt(aura)} de aura llevas un historial que ni hace falta analizar. La dirección está clara desde hace meses y nadie en el grupo finge ya sorpresa. Eres el ejemplo de manual de cómo no ser.`,
      `${fmt(aura)} de aura. Tan en rojo que ya no das pena, das una especie de respeto enfermizo por la capacidad sobrehumana de perder sin parar y sin enterarte de nada.`,
      `${fmt(aura)} de aura. Eso no es un marcador, es un certificado de defunción social. El grupo te observa como se observa un accidente: con horror y sin poder mirar a otro lado.`,
    ]);
  }
  if (aura < 0) {
    return pick([
      `${fmt(aura)} de aura. En rojo. Ese es el veredicto oficial de todo lo que has hecho aquí. No hay lectura alternativa, no hay contexto que te salve. El número es la sentencia y es firme.`,
      `Aura negativa: ${fmt(aura)}. El sistema registró cada decisión y este es el saldo. Sin excusas, sin atenuantes, sin nadie más a quien culpar. Tú solito construiste ese desastre.`,
      `${fmt(aura)} puntos. Bajo cero. La única dirección que dominas es la que baja, y llevas suficiente tiempo demostrándolo como para que nadie espere ya un milagro de tu parte.`,
      `Con ${fmt(aura)} de aura el historial habla por ti, y lo que dice es vergonzoso, consistente y muy difícil de defender en una conversación entre adultos.`,
      `${fmt(aura)} de aura. Negativo. Lo que empezó como mala racha hace tiempo que se convirtió en lo que cualquier observador honesto llamaría: el resultado lógico de ser tú.`,
    ]);
  }
  if (aura < 2000) {
    return pick([
      `${fmt(aura)} de aura. En positivo por los pelos. La distancia entre eso y el cero es tan ridícula que cualquier día malo te manda al pozo. Y días malos tienes a diario, campeón.`,
      `Aura de ${fmt(aura)}. Positivo de milagro. Eso no es un logro, es sobrevivir de chiripa. Y sobrevivir raspando en un marcador de aura no es algo que se presuma delante de nadie.`,
      `${fmt(aura)} puntos. La cifra que no da ni orgullo ni vergüenza porque es demasiado mediocre para provocar una sola emoción en quien la ve. Existes en modo ahorro de energía.`,
      `Con ${fmt(aura)} de aura llevas el marcador de los que ni caen con estilo. Ni lo bastante bien para que se note, ni lo bastante mal para ser interesante. El gris absoluto.`,
      `${fmt(aura)} de aura. Positivo sin convicción ninguna. Un número que resume con precisión quirúrgica el impacto nulo que has tenido aquí desde que llegaste.`,
    ]);
  }
  if (aura < 10000) {
    return pick([
      `${fmt(aura)} de aura. El marcador de los que no destacan ni para bien ni para mal. Correcto en el sentido más burocrático y deprimente del término. No abre ni cierra una sola puerta.`,
      `Aura de ${fmt(aura)}. Medio. El número más honesto que podrías tener y aun así no dice nada que merezca que alguien lo mencione en una conversación sobre cualquiera.`,
      `${fmt(aura)} puntos. El promedio tiene exactamente esa cara: invisible, inofensivo, olvidable. El marcador de quien pasa por la vida sin dejar ni una huella en la arena.`,
      `Con ${fmt(aura)} de aura confirmas lo que el grupo ya intuía: ni arriba ni abajo, ahí parado, ocupando espacio sin que nadie sepa muy bien para qué sirves.`,
      `${fmt(aura)} de aura. Mediocre con precisión estadística. El tipo de número que en cualquier sistema se traduce como: puede esfumarse semanas sin que nadie lo eche en falta.`,
    ]);
  }
  return pick([
    `${fmt(aura)} de aura. Alto. Sospechosamente alto para alguien como tú. El marcador tiene días raros y hoy es uno de ellos, porque ese número no cuadra con nada de lo que el grupo ve a diario.`,
    `Aura de ${fmt(aura)}. Una cifra sin respaldo coherente en la realidad observable. La suerte ciega existe y es lo único que explica que ese número esté pegado a tu nombre.`,
    `${fmt(aura)} puntos de aura. Ese número y la persona que lo acumula no encajan en ningún modelo lógico conocido. El sistema falla a veces, y este es un caso con nombre y apellidos.`,
    `Con ${fmt(aura)} de aura alguien debería auditar el algoritmo, porque la única alternativa es aceptar que la suerte no premia el mérito. Y tú eres la prueba viviente de eso.`,
    `${fmt(aura)} de aura. El marcador más mentiroso que ha parido este grupo. Existe, está ahí, y no guarda la más mínima relación con lo que aportas, que es poco o nada.`,
  ]);
}

// ─── Comando ──────────────────────────────────────────────────────────────────

async function cmdRoast(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (!mentioned.length) {
    return sock.sendMessage(jid, { text: 'Usa: *!roast @alguien*' }, { quoted: msg });
  }

  const target = mentioned[0];
  if (bareJid(target) === bareJid(sender)) {
    return sock.sendMessage(jid, { text: 'Roastearte a ti mismo es un nivel de autodestrucción que ni el bot te va a facilitar. Busca a otra víctima.' }, { quoted: msg });
  }

  // Reunir las 4 variables
  const participants = groupMeta?.participants || [];
  const participant = participants.find(p => bareJid(p.id) === bareJid(target));
  const displayName = participant?.name || target.split('@')[0].split(':')[0];

  const [bioResult, msgCount, aura] = await Promise.all([
    sock.fetchStatus(target).catch(() => null),
    getUserCount(jid, target),
    getAura(jid, target),
  ]);

  const bio = bioResult?.status?.trim() || '';

  // Variables disponibles. La actividad SOLO entra al pool si el usuario es
  // poco activo (<150 msgs): la actividad alta es buena para el grupo y no se
  // roastea. Si el usuario es muy activo, simplemente se ataca otra variable.
  const pool = ['name', 'bio', 'aura'];
  if (msgCount < 150) pool.push('activity');
  const variable = pick(pool);

  let roastText;
  switch (variable) {
    case 'name':
      roastText = pick(ROAST_NAME).replace(/%N/g, displayName);
      break;
    case 'bio':
      roastText = bio ? pick(ROAST_BIO_FULL) : pick(ROAST_BIO_EMPTY);
      break;
    case 'activity':
      roastText = roastActivity(msgCount);
      break;
    case 'aura':
      roastText = roastAura(aura);
      break;
  }

  const targetNum = target.split('@')[0];
  const header = pick(HEADERS);
  const closer = pick(CLOSERS);

  const text =
    `${header}\n` +
    `╾━━━━━━━━━━━━━━╼\n\n` +
    `🎯 Víctima: @${targetNum}\n\n` +
    `${roastText}\n\n` +
    `╾━━━━━━━━━━━━━━╼\n` +
    `${closer}`;

  await sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
}

module.exports = { cmdRoast };
