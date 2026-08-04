const { pick, shuffle, pickFresh } = require('../utils/helpers');
const { getSender, isMainOwner, isBotJid, bareJid, sameUser } = require('../utils/wa');

const VERDICTS = {
  perfect: [
    'Cien por cien. Dios los cría y ellos se juntan a arruinarse la vida mutuamente.',
    'Match perfecto. Nadie más los aguantaría, así que menos mal que se tienen el uno al otro.',
    'Compatibilidad total. Dos desastres que encajan tan bien que hasta da un poco de asco.',
    'El cien por cien no se toca. Estos dos se merecen entre ellos, y eso es lo más bonito y lo más cruel a la vez.',
    'Pleno. Si no acaban juntos es porque el universo tiene sentido del humor y quiere verlos sufrir.',
    'Match absoluto. Se van a hacer muchísimo daño y les va a encantar cada minuto.',
    'Cien. Ninguno de los dos va a encontrar nada mejor, y en el fondo los dos lo saben.',
    'Compatibilidad perfecta. Dos taras que se cancelan entre sí. La ciencia no lo explica, el grupo sí.',
    'El match del año. Juntos son insoportables, separados son peores. Elegid vosotros.',
    'Cien por cien. Esto no es química, esto es que a nadie más le interesa ninguno de los dos.',
    'Match total. Se merecen tanto que casi parece una condena en vez de un premio.',
    'Pleno absoluto. Que se junten ya y nos dejen en paz al resto del grupo.',
    'Cien. Dos personas hechas la una para la otra, principalmente porque el resto ya dijo que no.',
    'Compatibilidad máxima. Van a discutir todos los días y ninguno se va a ir nunca. Amor del bueno.',
    'Match perfecto. El grupo entero lo veía venir menos ellos dos, que son idiotas.',
    'Cien por cien. Si esto no acaba en boda acaba en denuncia, pero acaba en algo.',
    'Pleno. Nadie ha dado nunca este número en este grupo. Tomad nota y haceos cargo.',
    'Match del cien. Dos piezas rotas que encajan justo por donde están rotas. Poético y triste.',
    'Compatibilidad total y sin discusión. Se van a querer mal, que es como se quiere de verdad.',
    'Cien. El destino no ha tenido nada que ver: simplemente nadie más quiso a ninguno de los dos.',
    'Match perfecto. Van a ser felices y va a ser insufrible de ver desde fuera.',
    'Pleno absoluto. Lo único que separa a estos dos es la vergüenza, y eso se pasa con dos copas.',
    'Cien por cien. Se lo merecen todo: lo bueno, lo malo y las broncas de madrugada.',
    'Match total. Dos personas con el mismo nivel exacto de desastre. Eso es más raro que el amor.',
    'Cien. Si un día lo dejan, el grupo va a tener que elegir bando y nadie quiere eso.',
    'Compatibilidad perfecta. Ninguno de los dos tiene nada mejor que hacer, y eso también es compatibilidad.',
    'Match del cien por cien. Que alguien les diga que se dejen de tonterías de una puta vez.',
    'Pleno. Están hechos el uno para el otro con la precisión de dos errores que se corrigen solos.',
    'Cien. Este número no lo da el bot por casualidad, lo da porque no hay alternativa para ninguno.',
    'Match perfecto. Dos que se entienden sin hablar, principalmente porque ninguno escucha nunca.',
    'Compatibilidad absoluta. Se van a arruinar mutuamente y va a ser un espectáculo precioso.',
    'Cien por cien. El grupo os hace de testigo, así que ya no hay marcha atrás posible.',
    'Pleno. Juntos suman una persona funcional. Por separado no llegan ni a media.',
    'Match total. Nadie discute esto. Ni ellos, y eso que discuten absolutamente todo.',
    'Cien. Dos desgracias con patas que decidieron caminar en la misma dirección. Enhorabuena.',
    'Compatibilidad perfecta. Da igual lo que digan: el marcador ha hablado y el marcador no negocia.',
    'Match del cien. Los que se odian así de bien acaban siempre en lo mismo. Todos lo hemos visto.',
    'Pleno absoluto. Si esto sale mal, sale mal a lo grande. Y si sale bien, también.',
    'Cien por cien. Es su última oportunidad y es mutua. Aprovechadla o callaos para siempre.',
    'Match perfecto. Que se besen ya y acabemos con esto antes de que el grupo se muera de vergüenza.',
  ],
  high: [
    'Alto. Hay tensión, hay miradas y hay dos cobardes que llevan meses sin decir nada.',
    'Muy compatibles. Todo el grupo lo ve menos ellos, que están en su propia película.',
    'Números altos. Esto va a pasar, la única duda es cuánto ridículo hay que ver antes.',
    'Compatibilidad alta. Se ríen de las mismas chorradas, que es más de lo que tiene mucha pareja.',
    'Alto y con margen. Solo falta que uno de los dos deje de hacerse el interesante.',
    'Buen match. Se aguantan las manías, que a estas alturas es lo único que importa de verdad.',
    'Nota alta. Aquí hay algo y los dos lo saben. Lo que no saben es qué hacer con ello.',
    'Compatibles de sobra. El problema no es la química, el problema es el orgullo de ambos.',
    'Alto. Podrían funcionar perfectamente si alguno tuviera un mínimo de valor.',
    'Buena puntuación. Se buscan en el chat con una sutileza que no engaña absolutamente a nadie.',
    'Alto. Dos personas que se caen bien de verdad, cosa rarísima en este grupo de desgraciados.',
    'Compatibilidad alta. Si esto no arranca es por vergüenza, no por falta de material.',
    'Números buenos. Encajan en casi todo y chocan justo en lo divertido. Combinación peligrosa.',
    'Alto. El grupo lleva tiempo apostando por esto y el grupo rara vez se equivoca.',
    'Buen match. Ninguno de los dos es un premio, pero juntos suben bastante de categoría.',
    'Compatibles. Se pican todo el día y ninguno se cansa. Eso tiene un nombre y todos lo sabemos.',
    'Alta compatibilidad. Falta el empujón, y el empujón no lo va a dar ninguno de los dos.',
    'Nota alta. Aquí hay futuro, siempre que alguno aprenda a callarse a tiempo.',
    'Alto. Se soportan las tonterías mutuamente, que es exactamente en lo que consiste todo esto.',
    'Buena química. Lo raro sería que no acabaran hablando por privado esta misma noche.',
    'Compatibilidad alta. Dos que se entienden a medias palabras y a insultos completos.',
    'Alto. No es amor todavía, pero es lo que hay justo antes del amor. Y huele igual.',
    'Buen número. Ninguno lo va a admitir en público y los dos lo van a leer tres veces.',
    'Alta. Se llevan tan bien que da rabia. Y esa rabia es de los demás, no suya.',
    'Compatibles de verdad. Si lo estropean, va a ser por hablar de más, no por sentir de menos.',
    'Nota alta. El grupo ya os ha emparejado, así que ahorraos el numerito de negarlo.',
    'Alto. Dos personalidades que se aguantan sin esfuerzo. Eso vale más que cualquier flechazo.',
    'Buena compatibilidad. Se nota que se buscan, y se nota también que ninguno lo va a reconocer.',
    'Alto. Aquí hay tema. Poco tema, pero del bueno, y eso en este grupo escasea.',
    'Compatibilidad alta. Que alguno mueva ficha antes de que se les pase el arroz del todo.',
    'Números altos. Se ríen juntos y se callan juntos, que es la prueba definitiva.',
    'Alto. Ninguno de los dos está sobrado de opciones, y encima aquí hay química real.',
    'Buen match. Los que empiezan así acaban discutiendo por el mando de la tele. Suerte.',
    'Alta. La tensión se corta con un cuchillo y el grupo ya está harto de ser el testigo.',
    'Compatibles. Falta poco, muy poco. Y ese poco lleva meses siendo exactamente el mismo poco.',
    'Alto. Se conocen los defectos y siguen ahí. Eso ya no es casualidad, es elección.',
    'Buena nota. Si esto sale, el grupo se lleva el mérito. Si sale mal, no conocemos a ninguno.',
    'Alta compatibilidad. Dos que se hacen reír. Con eso se llega más lejos que con cualquier otra cosa.',
    'Alto. Esto va a acabar bien o va a acabar en un drama de los buenos. No hay término medio.',
    'Buen número. Ninguno es perfecto, pero juntos tapan bastante bien lo que le falta al otro.',
  ],
  mid: [
    'Regular. Podrían funcionar si alguno se molestara, y ninguno se va a molestar.',
    'Ni fu ni fa. Se toleran, que en este grupo ya es más de lo que se puede pedir.',
    'Compatibilidad tibia. Ni se odian ni se buscan. Simplemente coexisten como dos muebles.',
    'A medias. Hay algo, pero está enterrado bajo capas de pereza por ambas partes.',
    'Mitad y mitad. Funcionarían dos semanas y luego se acordarían de por qué no lo intentaron antes.',
    'Regular tirando a poco. La chispa existe pero le falta oxígeno y ganas.',
    'Tibio. Se caen bien, se ríen a veces y ahí se acaba todo. Amistad de grupo y punto.',
    'Compatibilidad media. Lo justo para no discutir, lo poco para que pase algo.',
    'Ni bien ni mal. Es el resultado más aburrido posible y les representa perfectamente.',
    'A medio gas. Si uno de los dos apretara, esto subiría. Como ninguno aprieta, se queda aquí.',
    'Regular. Encajan en lo básico y chocan en todo lo demás. O sea, lo normal.',
    'Medio. Hay potencial y hay una desgana igual de grande. Se anulan la una a la otra.',
    'Tibio total. Este número es lo que sale cuando a nadie le importa demasiado.',
    'Compatibilidad mediocre. Ni para presentarlos a la familia ni para bloquearlos. En el limbo.',
    'A medias. Se hablarían más si alguno tuviera algo interesante que decir.',
    'Ni frío ni caliente. La temperatura exacta a la que no pasa absolutamente nada nunca.',
    'Regular. Hay base para algo, pero construir da pereza y aquí nadie tiene ganas.',
    'Medio pelo. Funcionan de coña como conocidos y fatal como cualquier otra cosa.',
    'Tibio. El grupo no os ve juntos ni os ve separados. Es que directamente no os ve.',
    'Compatibilidad justa. Suficiente para un café, insuficiente para todo lo demás.',
    'A medio camino. Ni se gustan ni se soportan mal. El purgatorio del ship.',
    'Regular. Dos personas correctas que juntas no producen ninguna reacción química.',
    'Ni tanto ni tan poco. Se llevan bien porque no se conocen lo suficiente todavía.',
    'Medio. Con esfuerzo esto sube. Sin esfuerzo, esto baja. Y ya sabemos cómo sois.',
    'Tibio. La clase de match que se olvida en cinco minutos, igual que esta conversación.',
    'Compatibilidad del montón. Ni para bien ni para mal. Simplemente están ahí los dos.',
    'A medias. Hay días que parecería que sí y hay meses enteros que parece que no.',
    'Regular. Podría salir algo si el universo empujara, pero el universo tiene mejores planes.',
    'Medio. Ni el bot se emociona con este número, y el bot se emociona con casi todo.',
    'Tibio. Se caen bien de lejos. De cerca ya veríamos, y nadie quiere averiguarlo.',
    'Compatibilidad regular. Buenos ratos sueltos y ninguna intención de encadenarlos.',
    'A medio gas. Lo suficiente para que sea incómodo y lo justo para que no pase nada.',
    'Ni fu ni fa. La relación más cómoda que existe: la que no exige nada a nadie.',
    'Regular. Dos que se soportan bien porque tampoco se ven demasiado. Ahí está el truco.',
    'Medio. Este número es el equivalente sentimental a un encogimiento de hombros.',
    'Tibio. Si esto fuera un examen, sería un aprobado raspado que nadie celebra.',
    'Compatibilidad media. Existe la posibilidad. Existe también la pereza. Gana la pereza.',
    'A medias. Se aguantan, se ríen a ratos y no piensan en el otro cuando se van a dormir.',
    'Regular. Ni química ni rechazo: indiferencia bien repartida entre los dos.',
    'Medio. El match más olvidable del día, y llevamos unos cuantos.',
  ],
  low: [
    'Bajo. Esto no va a salir bien ni forzándolo, y forzarlo sería aún peor.',
    'Números malos. Se aguantarían tres días y el cuarto acabaría en bloqueo mutuo.',
    'Compatibilidad baja. Dos personas que no tienen absolutamente nada en común salvo este grupo.',
    'Bajo. Si esto llegara a pasar, el grupo tendría que intervenir por seguridad de ambos.',
    'Mala nota. Juntos serían el peor plan de los dos, y ya es decir.',
    'Bajo. Uno de los dos saldría escaldado y el otro ni se enteraría. Clásico.',
    'Compatibilidad pobre. Ni de broma. Y lo mejor es que ninguno se lo estaba planteando.',
    'Números bajos. Esto no es química, esto es un accidente esperando a no ocurrir.',
    'Bajo. Se caen regular y el marcador solo ha puesto números a lo que ya se notaba.',
    'Mal match. Dos formas distintas de ser insoportable no se suman, se multiplican.',
    'Bajo. Si alguien los emparejara en serio, sería por hacerles daño a los dos a la vez.',
    'Compatibilidad mala. Ni con alcohol, ni con años, ni con desesperación. No.',
    'Números feos. Lo único que comparten es el grupo, y a veces ni eso está claro.',
    'Bajo. Esto duraría lo que dura la primera discusión, o sea muy poquito.',
    'Mala compatibilidad. El bot ha hecho los cálculos dos veces por si acaso. Sale igual.',
    'Bajo. Cada uno por su lado es soportable. Juntos serían un problema para todo el grupo.',
    'Números malos. Aquí no hay tensión, hay incompatibilidad de manual y bien documentada.',
    'Bajo. Ninguno de los dos ha pensado nunca en el otro, y el marcador lo confirma.',
    'Mal match. Se llevarían fatal y encima tardarían meses en admitirlo. Lo peor de ambos mundos.',
    'Compatibilidad baja. Esto no arranca ni empujándolo cuesta abajo con el freno quitado.',
    'Bajo. Dos personas que estarían mejor en grupos distintos, no ya en la misma pareja.',
    'Números pobres. El único escenario donde esto funciona es uno que no existe.',
    'Bajo. Podría salir algo, sí. Algo malo, concretamente. Mejor lo dejamos.',
    'Mala nota. Ni siquiera dan para un drama entretenido. Serían un drama aburrido.',
    'Compatibilidad baja. Se soportan en grupo y se evitarían en cualquier otra parte.',
    'Bajo. Este número existe para avisar, no para animar. Tomad nota los dos.',
    'Números malos. Uno de los dos ya está poniendo cara rara y con razón.',
    'Bajo. Aquí no hay nada que rascar, y el que rasque va a salir con astillas.',
    'Mal match. La distancia entre estos dos no la arregla ni el tiempo ni el aburrimiento.',
    'Compatibilidad mala. Ni como amigos van sobrados, así que imagínate el resto.',
    'Bajo. Esto sería un error de los que se cuentan años después con vergüenza.',
    'Números bajos. El grupo entero respira aliviado al ver este resultado.',
    'Bajo. Dos trenes que van en direcciones opuestas y encima con retraso.',
    'Mala compatibilidad. Lo intentarían por aburrimiento y lo dejarían por sentido común.',
    'Bajo. Ni el bot, que empareja lo que sea, se atreve a recomendar esto.',
    'Números feos. Hay parejas que no cuajan. Esta no cuajaría ni con pegamento industrial.',
    'Bajo. Se acabaría antes de empezar, y menos mal, porque el grupo no lo aguantaría.',
    'Mal match. Cada uno tiene sus cosas, y sus cosas son exactamente incompatibles.',
    'Compatibilidad baja. Esto es un no con números, que es la forma más educada de decirlo.',
    'Bajo. Que sigan cada uno por su camino y que el camino no se cruce mucho.',
  ],
  zero: [
    'Cero. Ni el bot ni el universo ni nadie. Esto no existe y no va a existir jamás.',
    'Cero patatero. Dos desconocidos que comparten grupo y ni eso les une demasiado.',
    'Cero absoluto. No hay química, no hay tensión, no hay nada. Solo un vacío educado.',
    'Cero. El marcador ni se ha molestado en calcularlo. Se veía venir desde el principio.',
    'Cero. Ni odio ni amor: indiferencia pura, que es bastante más humillante que el odio.',
    'Cero. Si estos dos se cruzan por la calle no se reconocen ni haciendo un esfuerzo.',
    'Cero patatero. El grupo entero se ha quedado igual de frío que el resultado.',
    'Cero absoluto. Hay más química entre una piedra y un lunes que entre estos dos.',
    'Cero. Emparejarlos ha sido una pérdida de tiempo para todo el mundo, el bot incluido.',
    'Cero. Ni juntos, ni separados, ni en otra vida. Especialmente no en otra vida.',
    'Cero patatero. Ninguno de los dos sabría decir tres cosas del otro. Ni dos.',
    'Cero. Esto no es incompatibilidad, es que directamente no se han visto nunca.',
    'Cero absoluto. El resultado más triste que da este comando, y os lo habéis ganado.',
    'Cero. Poner estos dos nombres juntos ha sido lo más raro que ha pasado hoy aquí.',
    'Cero. No hay nada que analizar. No hay nada, punto.',
    'Cero patatero. Dos personas que existen en el mismo grupo y en universos distintos.',
    'Cero. Ni forzándolo, ni de broma, ni en el peor momento de soledad de ninguno.',
    'Cero absoluto. Este ship ha nacido muerto y encima nadie va a ir al entierro.',
    'Cero. El bot ha buscado algo, lo que fuera, y ha vuelto con las manos vacías.',
    'Cero. La única conexión entre estos dos es que ambos leen este mensaje. Y poco más.',
    'Cero patatero. Ni un roce, ni una risa, ni una mirada. Nada de nada.',
    'Cero. Emparejar a estos dos es como sumar cero más cero: sale exactamente lo mismo.',
    'Cero absoluto. Que alguien pare este comando antes de que se haga más incómodo.',
    'Cero. Se han enterado de que existen el uno para el otro justo ahora, con este mensaje.',
    'Cero. Ni el algoritmo más optimista del mundo sacaría un punto de aquí.',
    'Cero patatero. El vacío entre estos dos tiene su propia gravedad.',
    'Cero. No es que no funcione: es que no hay nada que pueda funcionar o dejar de hacerlo.',
    'Cero absoluto. Este número es el bot diciendo con educación que dejéis de hacer el tonto.',
    'Cero. Dos líneas paralelas. Y encima en habitaciones distintas.',
    'Cero. Ni un uno por ciento de cortesía. El marcador ha sido brutalmente honesto.',
    'Cero patatero. Se habrán escrito menos veces que el bot con vosotros, y eso ya es decir.',
    'Cero. Todo lo que tienen en común cabe en esta frase y todavía sobra sitio.',
    'Cero absoluto. Ninguno de los dos va a comentar nada de esto, y hacen bien.',
    'Cero. El resultado es tan bajo que casi resulta ofensivo para los dos a la vez.',
    'Cero. Ni con presentación formal, ni con amigos en común, ni con años de terapia.',
    'Cero patatero. Este es el ship que se pone de ejemplo cuando se explica lo que es un cero.',
    'Cero. Ha salido más caro el comando que lo que valen estos dos juntos.',
    'Cero absoluto. Podéis seguir con vuestras vidas separadas, que es lo que ibais a hacer igual.',
    'Cero. Aquí no hay historia. Ni la hubo, ni la hay, ni se la espera.',
    'Cero. Y aun así, alguien ha escrito el comando. Esa es la única cosa interesante de todo esto.',
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
  // Del sorteo se caen el bot y el owner principal: el bot no se shipea con
  // nadie, y el owner es invisible en toda salida automatica (igual que en los
  // tops, en !count y en !vs). Si alguien lo menciona a proposito si entra, y
  // ahi ya manda el amanyo de abajo.
  const participantIds = groupParticipants
    .map(p => p.id)
    .filter(id => id && !isBotJid(sock, id) && !isMainOwner(id, false, groupMeta));
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
  if (sameUser(a, b)) {
    return sock.sendMessage(jid, { text: 'No puedes shippear a alguien consigo mismo.' }, { quoted: msg });
  }

  // Rig a favor del owner principal: si participa, la compatibilidad es alta pero
  // VARIABLE (88-100), no siempre 100, para que no se note el amaño.
  // Al owner principal se le shipea SIEMPRE bajo, por pedido expreso suyo: le
  // desagradaba salir emparejado alto con cualquiera. La franja es 0-12 para
  // que varíe algo y no cante que está fijado, pero nunca sube de ahí.
  const ownerInvolved = isMainOwner(a, false, groupMeta) || isMainOwner(b, false, groupMeta);
  const compat = ownerInvolved ? Math.floor(Math.random() * 13) : Math.floor(Math.random() * 101);
  const filled = Math.round(compat / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

  const verdict =
    compat === 100 ? pickFresh(VERDICTS.perfect, `${jid}|ship|perfect`) :
    compat >= 70   ? pickFresh(VERDICTS.high,    `${jid}|ship|high`) :
    compat >= 40   ? pickFresh(VERDICTS.mid,     `${jid}|ship|mid`) :
    compat >= 10   ? pickFresh(VERDICTS.low,     `${jid}|ship|low`) :
                     pickFresh(VERDICTS.zero,    `${jid}|ship|zero`);

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
