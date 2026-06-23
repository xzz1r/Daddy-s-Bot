const { pick, shuffle } = require('../utils/helpers');
const { getSender, bareJid } = require('../utils/wa');

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
    'Dos relojes que por fin marcan la misma hora.',
    'El amor que sale en las peliculas y nadie cree que exista. Hasta ahora.',
    'Cuando se miran, el resto del mundo deja de tener sentido.',
    'Una llama que ni el tiempo ni la distancia podrian apagar.',
    'El destino tardo, pero acerto de lleno con estos dos.',
    'Se entienden con la mirada y se aman con el silencio.',
    'No hay distancia capaz de separar lo que estaba escrito.',
    'El amor de los que no necesitan palabras para entenderse.',
    'Juntos hacen que hasta lo imposible parezca facil.',
    'Dos corazones que laten al mismo compas sin haberlo ensayado.',
    'El tipo de pareja que envejece junta y feliz, de las que ya casi no quedan.',
    'Si existe el amor verdadero, tiene exactamente esta forma.',
    'Encontraron en el otro el hogar que llevaban toda la vida buscando.',
    'Lo suyo no es quimica, es alquimia pura.',
    'El amor que cura, que salva y que se queda. Ese mismo.',
    'Dos personas que envejeceran contando esta historia como su mejor decision.',
    'El destino se quedo sin excusas el dia que los puso en el mismo camino.',
    'Lo que tienen no se explica, se siente a kilometros de distancia.',
    'Si el mundo se acabara manyana, ninguno de los dos cambiaria de companyia.',
    'Cada manyana a su lado seria un motivo nuevo para creer en algo.',
    'El amor que no necesita testigos porque se basta a si mismo.',
    'Dos personas que respiran mejor cuando estan en la misma habitacion.',
    'Lo suyo es de esas historias que se cuentan en voz baja por respeto.',
    'Encajan tan bien que hasta el silencio entre ellos suena a musica.',
    'El tipo de amor que convierte un dia gris en el mejor de la semana.',
    'Dos vidas que sin saberlo llevaban anyos esperandose la una a la otra.',
    'Lo que sienten no cabe en palabras, y aun asi se entiende perfecto.',
    'El amor que hace que el pasado de ambos cobre por fin sentido.',
    'Dos almas que se reconocieron antes de saber siquiera el nombre del otro.',
    'Si la felicidad tuviera direccion, viviria justo donde estan ellos dos.',
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
    'Se ponen nerviosos cuando el otro entra. Eso no se finge.',
    'Cada excusa para hablarse es una declaracion a medio camino.',
    'El que primero lo admita gana. Y los dos estan a punto de perder la cabeza.',
    'Hay tanta tension acumulada que el grupo entero la siente.',
    'Se buscan en cada conversacion aunque digan que es casualidad.',
    'La quimica esta servida, solo falta que alguien encienda la cerilla.',
    'Dos personas que sonrien al telefono cuando el otro escribe.',
    'El roce constante no es coincidencia, es el preludio de algo grande.',
    'Tienen ese brillo en los ojos que solo da una persona concreta.',
    'Lo que sienten ya no cabe en una amistad y los dos lo saben.',
    'Cada despedida les cuesta un poco mas que la anterior.',
    'Se nota que piensan en el otro mas de lo que jamas admitirian.',
    'Estan a una conversacion sincera de no separarse nunca.',
    'El destino ya hizo su parte. Ahora les toca a ellos no arruinarlo.',
    'Se escriben de madrugada inventando temas para no cortar la conversacion.',
    'Cada uno guarda capturas del otro y jura que no significa nada.',
    'Hay un cosquilleo cada vez que aparece su nombre en la pantalla.',
    'Se rien de cosas que solo ellos entienden. Eso ya es medio camino andado.',
    'Fingen indiferencia tan mal que hasta el bot se da cuenta.',
    'Lo que empezo como amistad ya tiene fecha de caducidad. Y se sabe.',
    'Bastaria una copa de mas para que por fin se dijeran la verdad.',
    'Se cuidan en los detalles que nadie mas nota. Eso pesa mas que las palabras.',
    'Hay una corriente entre ellos que el resto del grupo nota antes que ellos mismos.',
    'Cada uno es la primera notificacion que el otro busca al despertar.',
    'La amistad ya les queda pequenya y los dos lo intuyen.',
    'Se buscan con la mirada en cuanto entran a cualquier sitio.',
    'Lo de ellos es un si disfrazado de todavia no.',
    'Solo falta que uno deje de tener miedo. El otro ya esta listo.',
    'Se gustan tanto que hasta los silencios les resultan comodos.',
    'Estan a un mensaje valiente de cambiarlo todo para siempre.',
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
    'Ni si ni no. El clasico tal vez que nunca se decide.',
    'Funcionaria si los dos dejaran de pensarlo tanto.',
    'Hay algo, pero esta tan escondido que ni ellos lo encuentran.',
    'Una historia tibia que con suerte llega a templada.',
    'Podrian ser pareja o podrian olvidarse manyana. Tirad la moneda.',
    'No saltan chispas, pero al menos no salta el aceite tampoco.',
    'Compatibles los dias buenos. El problema son los demas.',
    'Un quizas con mas dudas que certezas, pero quizas al fin.',
    'Ni para tanto ni para tan poco. Justo en el medio incomodo.',
    'Se llevarian bien de vacaciones. Para todo lo demas, ya veremos.',
    'Hay potencial, pero esta cogiendo polvo en un rincon.',
    'Podria salir bien con mucho cafe y algo de paciencia.',
    'Lo justo para intentarlo, lo justo para arrepentirse. Vosotros decidis.',
    'Una pareja de las de probar y devolver si no convence.',
    'Tibios como cafe olvidado, pero todavia bebible.',
    'Ni fu ni fa. El amor en modo avion.',
    'Podrian quererse si dejaran de mirar el movil un rato.',
    'Compatibles a medio gas, como una bombilla que parpadea.',
    'Hay algo, aunque ese algo todavia no sabe ni que quiere ser.',
    'Una pareja de las de pensarselo dos veces y aun asi dudar.',
    'Funcionaria entre semana. Los fines de semana ya es otra historia.',
    'Lo justo para una primera cita, lo dudoso para la segunda.',
    'Ni gran amor ni gran error. El termino medio mas aburrido del mundo.',
    'Hay quimica de la floja, esa que se evapora si nadie la cuida.',
    'Podrian intentarlo, pero ninguno tiene prisa por hacerlo.',
    'Una posibilidad guardada en el cajon de los quizas.',
    'Compatibles en teoria, dudosos en la practica. Ya veremos.',
    'Lo suyo es un tal vez con la pila al cincuenta por ciento.',
    'Se caen bien, que ya es algo, pero de ahi a quererse hay un trecho.',
    'Hay base para algo, pero alguien tiene que poner los ladrillos.',
    'Ni para enmarcar ni para tirar. Justo en el limbo del amor.',
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
    'Juntos serian la razon por la que existen las rupturas.',
    'Dos personas que ni en un grupo de WhatsApp se aguantan.',
    'Lo unico que compartirian es la factura del divorcio.',
    'Mas tension que en una reunion de vecinos, pero de la mala.',
    'Se llevarian fatal hasta para discutir. Y eso ya es decir.',
    'El amor llamo a su puerta y los dos fingieron no estar en casa.',
    'Juntos durarian menos que una promesa de Anyo Nuevo.',
    'Una pareja tan mala que hasta el bot pide disculpas por sugerirla.',
    'Se repelerian con la fuerza de dos polos del mismo imán.',
    'Lo suyo seria una tragedia griega, pero sin la parte bonita.',
    'Compatibles para arruinarse la vida mutuamente, nada mas.',
    'El desastre tiene nombre y aqui tiene dos.',
    'Acabarian bloqueandose antes de la segunda cita.',
    'Ni el mejor terapeuta del mundo salvaria esto.',
    'Dos naufragios buscando hundirse en el mismo barco.',
    'Juntos serian la advertencia que les ponen a los demas para que no repitan.',
    'Mas roces que un papel de lija contra otro papel de lija.',
    'Lo suyo no es amor, es un accidente esperando a pasar.',
    'Acabarian discutiendo por quien se queda el lado izquierdo de la cama.',
    'El unico plan a futuro que tendrian seria evitarse en el supermercado.',
    'Compatibles solo para demostrar que el desamor existe y vive aqui.',
    'Se sacarian de quicio antes incluso de presentarse formalmente.',
    'Juntos durarian lo que tarda en cargar un mensaje sin internet.',
    'Una relacion con fecha de caducidad mas corta que el yogur barato.',
    'Lo suyo seria una guerra fria con wifi compartido y nada mas.',
    'Acabarian dividiendose hasta los amigos del grupo. Un horror.',
    'El amor intento ayudarles y termino pidiendo refuerzos.',
    'Dos egos del mismo tamanyo no caben en la misma relacion. Ni de broma.',
    'Se aguantarian una cena. Por una segunda ya empezarian las indirectas.',
    'Juntos serian el ejemplo que sale en los libros de como no hacerlo.',
    'Mas conflicto que un grupo de padres del colegio decidiendo el regalo.',
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
    'Tan poca conexion que el bot estuvo a punto de no contestar.',
    'Dos lineas paralelas que jamas se cruzaran. Geometria pura.',
    'Cero por ciento. Hasta una piedra tendria mas quimica.',
    'El amor los miro, se encogio de hombros y se fue.',
    'Mas frio que un mensaje visto sin contestar.',
    'Ni con presentacion, ni con amigo en comun, ni con suerte.',
    'La nada absoluta. Ni para enemigos llegan.',
    'Tan compatibles como un cargador con otro cargador.',
    'El cosmos ni se molesto en calcular esto. Cero y a otra cosa.',
    'Se cruzarian por la calle y ninguno giraria la cabeza.',
    'Quimica negativa. Si existiera, esto la inventaria.',
    'Dos desconocidos que seguiran siendolo por los siglos de los siglos.',
    'El vacio interestelar tiene mas tension que estos dos.',
    'Cero conexion, cero futuro, cero ganas. Triplete del desamor.',
    'Si esto fuera una cita, ambos cancelarian a la vez.',
    'Tan nulo lo suyo que ni el bot recuerda por que los juntó.',
    'Dos imanes sin polos. Ni se atraen ni se molestan en intentarlo.',
    'El amor paso de largo y ni los saludo. Asi de irrelevante.',
    'Mas seca esta conexion que un desierto en agosto.',
    'Ni rivales llegan a ser. Para eso al menos hace falta interes.',
    'Cero por ciento y subiendo hacia abajo, si eso fuera posible.',
    'Comparten oxigeno y poco mas. El cosmos ni tomo nota.',
    'Tan plano lo suyo que una linea recta tiene mas curvas emocionales.',
    'Ni el algoritmo mas optimista les encontraria un punto en comun.',
    'El vacio del espacio exterior los miraria y diria que se ve frio.',
    'Dos numeros que nunca sumaran nada juntos. Matematica del desinteres.',
    'Ni con cita a ciegas, ni con apuesta, ni con ultimo recurso.',
    'Lo suyo es una pantalla en negro. Ni carga ni se enciende.',
    'Cero atraccion, cero historia, cero recuerdo. Ni para anecdota sirve.',
    'Tan ajenos que ni en la lista de bloqueados se tendrian.',
    'El amor calculo esto, vio el resultado y cerro la calculadora.',
  ],
};

// Etiqueta visible para un participante. Un JID @lid no resuelve a un numero
// real al mostrarse como @mencion — en ese caso preferimos el nombre conocido
// del participante (mismo fallback que ya usa !roast) en vez de exponer el
// numero interno del LID. Los JIDs de telefono siguen mostrandose como
// @numero, igual que antes, para que WhatsApp los resuelva como mencion.
function resolveLabel(jidVal, participants) {
  const bare = bareJid(jidVal);
  const num = bare.split('@')[0];
  if (!bare.endsWith('@lid')) return `@${num}`;
  const p = participants.find(x =>
    bareJid(x.id) === bare || bareJid(x.lid) === bare || bareJid(x.phoneNumber) === bare
  );
  return p?.name || p?.displayName || p?.verifiedName || p?.notify || `@${num}`;
}

async function cmdShip(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  const groupParticipants = groupMeta?.participants || [];
  const participantIds = groupParticipants.map(p => p.id);
  if (participantIds.length < 2) {
    return sock.sendMessage(jid, { text: 'Necesito al menos 2 miembros en el grupo.' }, { quoted: msg });
  }

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const mentioned = ctx?.mentionedJid || [];
  // Una respuesta citada cuenta como segundo objetivo si no quedo ya cubierto
  // por una mencion explicita — asi !ship funciona respondiendo a un mensaje,
  // igual que !mute/!promote/!demote.
  const quotedParticipant = ctx?.participant;
  const targets = [...mentioned];
  if (quotedParticipant && !targets.some(t => bareJid(t) === bareJid(quotedParticipant))) {
    targets.push(quotedParticipant);
  }
  const sender = getSender(msg);

  let a, b;

  if (targets.length >= 2) {
    // !ship @a @b (o @a + responder a b) — shipea exactamente esos dos
    [a, b] = targets.slice(0, 2);
  } else if (targets.length === 1) {
    // !ship @a (o responder a alguien) — shipea al que manda con @a
    a = sender;
    b = targets[0];
  } else {
    // !ship — dos miembros al azar
    [a, b] = shuffle(participantIds).slice(0, 2);
  }

  // No shippear a alguien consigo mismo (igual que !mog y !vs).
  if (bareJid(a) === bareJid(b)) {
    return sock.sendMessage(jid, { text: 'No puedes shippear a alguien consigo mismo.' }, { quoted: msg });
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

  const labelA = resolveLabel(a, groupParticipants);
  const labelB = resolveLabel(b, groupParticipants);

  const text =
    `*Ship*\n\n` +
    `${labelA}  +  ${labelB}\n\n` +
    `${bar}  *${compat}%*\n\n` +
    `${verdict}`;

  await sock.sendMessage(jid, { text, mentions: [a, b] }, { quoted: msg });
}

module.exports = { cmdShip };
