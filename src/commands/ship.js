const { shuffle, pickFresh } = require('../utils/helpers');
const { getSender, isMainOwner, isBotJid, bareJid, sameUser, canonicalJid } = require('../utils/wa');
const config = require('../config');
const { A_TI_MISMO, SOLO_GRUPOS } = require('../data/avisos');
const { aviso } = require('../utils/helpers');
const { SIN_SERVICIO } = require('../utils/auraCobro');
const rencor = require('../utils/rencor');

// ¿Es este JID uno de los numeros de config.shipAlto?
//
// NO SE PUEDE COMPARAR EL NUMERO A PELO, y el caso que lo obliga es argentino.
// WhatsApp se come el 9 de movil de Argentina en el JID: quien marca con el
// nueve (+54 9 XXX ...) aparece muchas veces como 54XXX...@s.whatsapp.net, sin
// el. Comparar la cadena tal cual fallaria justo con el numero para el que se
// ha pedido esto, y fallaria en silencio — el ship saldria bajo y nadie sabria
// por que.
//
// El ejemplo iba con un movil real escrito entero, y este fichero se lee en un
// repositorio publico. La regla no necesita el numero de nadie para explicarse.
//
// Asi que se comparan tres cosas, en este orden:
//   1. el JID canonico, por si es un @lid ya resuelto a telefono;
//   2. los digitos exactos;
//   3. los digitos quitando el 9 de movil argentino (54 9 xxx -> 54 xxx) en los
//      dos lados, que cubre las dos formas del mismo numero.
function digitos(x) {
  return String(x || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}
function sinNueveAR(d) {
  return /^549\d{8,}$/.test(d) ? '54' + d.slice(3) : d;
}
function esShipAlto(jid) {
  if (!jid || !config.shipAlto.length) return false;
  const propios = [digitos(jid), digitos(canonicalJid(jid))].filter(Boolean);
  for (const objetivo of config.shipAlto) {
    for (const propio of propios) {
      if (propio === objetivo) return true;
      if (sinNueveAR(propio) === sinNueveAR(objetivo)) return true;
    }
  }
  return false;
}

const VERDICTS = {
  perfect: [
    'El número os ha juntado y a los dos se os ha escapado un «hostia», bajito.',
    'Cien. Dos piezas rotas que resulta que estaban rotas por el mismo sitio. Encajan de milagro y encajan de puta madre.',
    'Encajáis de puta madre. Uno relee la cifra y el otro borra el «jaja» a medias, con la risa todavía en la cara.',
    'Os ha salido el match entero y no ha habido ni un chiste. Seguís los dos dentro del mensaje, sin parpadear.',
    'Cien. Os habéis quedado los dos mirando el número y no os sale ni el chiste.',
    'Cien de cien. Si esto no acaba en boda, acaba en desgracia, y con vosotros las dos cosas se parecen.',
    'Cien. A partir de hoy, cada vez que uno de los dos escriba, el grupo va a mirar al otro lado.',
    'Habéis leído la cifra y se os ha quedado la misma cara de hostia, los dos, sin una coña con que taparla.',
    'Se os ha escapado la risa nerviosa a la vez, y detrás el silencio, con el chat todavía abierto.',
    'Match perfecto. Os aguantaríais lo que no aguanta nadie, y eso aquí es amor.',
    'Cien. Si lo vuestro acaba en boda, el discurso ya lo tiene escrito el bot.',
    'Uno se muerde el labio, el otro no aparta el mensaje, y la cifra sigue en medio sin una gracia que la tape.',
    'Match perfecto. Os vais a hacer la vida imposible y no vais a saber vivir de otra manera.',
    'Os ha pillado sin la gracia preparada. El teclado abierto y ni una letra escrita, los dos.',
    'Os ha salido el número, se os ha subido el calor a la cara y el grupo ha mirado para otro lado.',
  ],
  high: [
    'Con este porcentaje, el primer mensaje entre vosotros se escribiría solo. Lo difícil es mandarlo.',
    'Con esta sintonía os daría para audios de veinte minutos, no para un «jaja» suelto.',
    'El porcentaje os ha salido alto y se os ha ido la mano del teclado, a los dos, con la cifra todavía en medio.',
    'Con este porcentaje habría que celebrarlo. Ahora, a ver cuál de vosotros lo menciona primero.',
    'Química de la buena. Los dos habéis sonreído al leerlo, y esa sonrisa os ha vendido delante de todos.',
    'Buena cifra. Si no pasa nada, es porque alguno de los dos se caga encima.',
    'Buen número. Ahora el grupo tiene un porcentaje para restregároslo.',
    'Alto de verdad. El número ha hablado por los dos y al grupo se le ha cortado la guasa de golpe.',
    'Compatibilidad de las buenas. Lo malo es que os parecéis en lo peor, y eso también suma.',
    'Muy alto. Os ha caído el porcentaje encima y se os ha visto el golpe en la cara antes de que nadie hablara.',
    'La cifra os ha salido alta. La habéis abierto a la vez y se os ha secado la boca, sin coña que escribir.',
    'Alto. Vais a discutir mucho y a reconciliaros peor, y el grupo ya tiene las palomitas.',
    'Buen ship. La cifra está en medio, alguien ya ha hecho la captura y vosotros no habéis apartado la vista.',
    'Número alto. La única duda es quién va a dar el primer paso, y todo apunta a que nadie.',
    'Con este número se traga saliva. Lo habéis hecho los dos, a la vez, con la cifra todavía delante.',
    'Alto. El bot ya ha dicho lo suyo, ahora os toca a vosotros hacer el ridículo.',
    'Compatibilidad seria. Uno ha grabado un audio, lo ha dejado sin mandar, y el otro seguía dentro de la cifra.',
    'Buena pareja, según el número. Según el grupo, un desastre con fecha.',
    'Os ha juntado el número en el mismo mensaje y se os ha puesto la piel de gallina, a los dos.',
    'Esta cifra es un empujón. Vosotros sois capaces de caeros hacia atrás.',
    'Muy compatibles. Tanto que da un poco de asco.',
    'Buen porcentaje. El grupo lo va a usar en vuestra contra cada vez que habléis.',
    'Os han puesto la cifra delante y la habéis releído, como quien no quiere salir del mensaje.',
    'Esto huele a algo. El bot solo pone el número y el grupo ya pone el cotilleo.',
    'Compatibilidad alta. Uno se muerde la mejilla por dentro, el otro se acerca a leerlo, y os tiembla el pulso a los dos.',
    'Buen número. Uno propone y el otro dice que sí, falta decidir quién es quién.',
    'Habéis vuelto a abrir el mensaje los dos y se os ha puesto la nuca caliente.',
    'Número alto. Han cambiado de tema y no ha colado: seguís los dos dentro de la cifra, con el grupo mirando de reojo.',
    'Alto. No se ve mucho esto, así que no lo desperdiciéis con un «jaja».',
    'Buena cifra. Un café y un poco de vergüenza menos, y esto se arregla solo.',
  ],
  mid: [
    'El bot ha visto parejas malas, pero estos dos ni a mala llegan: llegan a nada. A puta nada.',
    'Tibio de cojones. Ha salido el número y los dos habéis contestado con una pegatina floja, sin ni una frase detrás.',
    'Número tibio. Os daría para quedar una vez y volver cada uno a casa diciendo «bien, ¿no?».',
    'Compatibilidad a medias. Da para una tarde y para una foto que no subiría ninguno de los dos.',
    'Regular. Lo justo para no bloquearos, y para silenciaros a los dos días.',
    'Mediano. Como pareja, os ganaría cualquiera del grupo a sorteo.',
    'Número normal. Hay química, de la que viene en el kit de principiante y sin pilas.',
    'A medias. Uno ha sonreído al verlo, el otro ha cambiado de chat, y el porcentaje se ha quedado colgado, sin nadie.',
    'Regular tirando a mal. Una cita, como mucho, y a mitad de la cita alguien mira el móvil.',
    'Compatibilidad de gente que comparte piso y se deja notas pasivo-agresivas en la nevera.',
    'No da para boda ni para bronca. Da para nada, que es peor.',
    'Número medio. Si alguno estaba esperando una señal, es esta: ni lo intentes.',
    'Mitad justa. Uno manda un audio corto, el otro lo deja en escuchado y pone el móvil boca abajo.',
    'Regular. Lo vuestro es de esas cosas que el grupo olvida antes de que acabe el día.',
    'Medio. Podéis intentarlo, y el grupo ya ha apostado cuánto os dura.',
    'Compatibilidad justita. Con esto se sale a tomar algo, no se cruza la ciudad por la otra persona.',
    'Mediano. Os ha salido el número y se os ha quedado una sonrisa a medias, de las que no se enseñan.',
    'Templado. Como los mensajes que os mandaríais: «vale», «ok», «jaja».',
    'Número de tregua. No os odiáis, pero tampoco os aguantaríais una semana.',
    'Medio punto. Lo justo para que el grupo haga un chiste y se olvide.',
    'Regular. Habéis leído el número, habéis tardado, y lo que ha salido es un «bueno» que ha dejado el chat peor.',
    'Del montón. Contestáis los dos «ya» a la vez y el hilo se muere debajo, sin nadie que lo recoja.',
    'Mediano. Si la química fuera un examen, lo habríais aprobado copiando.',
    'Cifra tibia. Da para mirarse raro en un cumpleaños y poco más.',
    'A medio camino. Uno escribe un párrafo, el otro contesta con un punto, y el párrafo se queda ahí, enorme y solo.',
    'Regular. Lo vuestro tiene el futuro de un grupo creado para organizar una cena.',
    'Número medio. Alguien ha levantado una ceja, vosotros habéis mirado el techo y el mensaje se ha quedado solo en medio del chat.',
    'A medias. El bot no se moja, y vosotros no os mojaríais ni bajo la lluvia.',
    'Mediocre. Como pareja, sois un «bueno, vale».',
    'Medio. Si uno se lo toma en serio, el otro se va a reír en su cara.',
  ],
  low: [
    'Os plantan el número y los dos pasáis al mensaje de abajo sin miraros, como quien aparta un plato frío.',
    'Poca compatibilidad. Uno escribe, el otro deja el mensaje en no leído, y no hay una segunda línea.',
    'Número bajo. Si os encierran en una habitación, a los cinco minutos alguien finge una llamada.',
    'Bajo. Uno habla y el otro pone los ojos en blanco, y así todos los días.',
    'Bajo. El bot ha buscado algo en común entre vosotros y solo ha encontrado el wifi del grupo.',
    'Compatibilidad de ascensor: dos personas que se miran los pies y esperan su planta.',
    'Poco. Mejor ni lo intentéis, que luego el grupo tiene material para años.',
    'Número bajo. Lo vuestro acabaría en una discusión por quién paga el café.',
    'Bajo. Como pareja os daríais pena, y os la daríais a la cara.',
    'Os etiquetan en el mismo mensaje y los dos os quitáis la mención, rápido, como si el nombre de al lado quemara.',
    'Bajo. En una app de citas os habríais descartado a la primera foto.',
    'Número malo. Uno querría salir, el otro quedarse en casa, y los dos estar con otra persona.',
    'Dos nombres en la misma frase y ninguno llega al final: ya estáis metidos en otra conversación.',
    'Poca compatibilidad y ninguna gana de mejorarla. Es lo más sincero que habéis hecho juntos.',
    'Bajo. Juntaros sería un castigo, y el grupo no sabría a cuál de los dos compadecer.',
    'Lo más cerca que estáis es esta línea, y ya os tapáis la cara para no ver el nombre junto al otro.',
    'Poco. Si os escribís alguna vez, que sea para pediros dinero, que eso sí funcionaría.',
    'Uno suelta un brindis de emoji y el otro ni lo abre, metido en un hilo donde sí quiere estar.',
    'Mandáis algo, os cruzáis y sale un malentendido tan tonto que los dos dejáis de escribir a la vez.',
    'Uno estira la frase, el otro corta con un «paso» y el intento se queda seco, sin segunda línea.',
    'Bajo. Esto lo ha shipeado alguien que no os conoce, o que os odia.',
    'Poca química. Si os liarais, lo contaríais como un error.',
    'Bajo. Seríais la pareja que el grupo invita por compromiso y de la que luego no se habla.',
    'Poco. Mejor como enemigos, que ahí sí hay futuro.',
    'Bajo. Hay más química entre dos desconocidos esperando el autobús.',
    'Ha salido el porcentaje y habéis hecho el mismo gesto, los dos: atrás, al chat de siempre, sin guardarlo.',
    'Uno bosteza con el ship abierto y el otro ya no está. El mensaje se ha quedado en visto, solo.',
    'El grupo ha visto el ship, ha hecho una mueca y vosotros habéis hecho la misma, sin abrir la boca.',
    'Compatibilidad baja. Os entenderíais mejor por escrito, y por escrito tampoco os entendéis.',
    'Os lo han sacado y habéis puesto la misma cara, la risa corta de cuando algo no va con vosotros, y ahí se os acaba.',
  ],
  zero: [
    'Estos dos ni comparten planeta. Uno vive en la Tierra y el otro en una puta dimensión paralela.',
    'Os sale el resultado y ponéis la cara de quien pisa una mierda, los dos a la vez, y nadie se queda a mirarlo.',
    'Cero. Si os presentaran, os daríais la mano y os iríais cada uno por un lado.',
    'Cero. Esto no lo arregla ni el fin del mundo con vosotros dos como últimos supervivientes.',
    'Nada. El número dice que os ignoréis, que es lo único que ya hacíais bien.',
    'Lo único decente entre vosotros es no tocaros. Uno lee el resultado y se levanta de la silla. El otro ni gira la cabeza.',
    'Nulo. Si os ponéis de acuerdo en algo, será en que esto es una mierda.',
    'Sale el número y alguien suelta un «qué asco» en el grupo. Vosotros no contestáis y el mensaje se queda sin abrir.',
    'Cero. Os sentarían en la misma mesa de una boda y alguien acabaría cambiándose de sitio.',
    'Nada de nada. Mejor que ni os saludéis, por si se contagia.',
    'La notificación os junta y la apartáis sin abrir, cada uno ya en otra mierda.',
    'Lo leéis y no cuaja. Uno tuerce la boca del asco y el otro aparta la silla, sin una palabra.',
    'Nulo. Quien haya pedido este ship tiene muy mala leche.',
    'Cero. Os odiaríais con una constancia que no tenéis para nada más.',
    'Os meten en la misma frase y chirría. Alguien la vuelve a escribir y uno de los nombres ya no está.',
    'Os preguntan y sobra la respuesta: se os escapa una risa seca, la de oler algo podrido.',
    'Cero patatero. El bot lo ha intentado imaginar y ha tenido que cerrar los ojos.',
    'Nada. Compatibilidad de dos personas que se cruzan en la calle y no se miran.',
    'El ship se os deshace: cada nombre tira para su lado y en el centro no queda sitio ni para una palabra.',
    'A quien trajera ilusión se le cae en la cara. Se le cierra la boca y no hay segunda lectura.',
    'Queda en el grupo y queda guarro. Lo veis, negáis con la cabeza y el chat sigue como si no hubierais estado.',
    'Se ve en cómo baja el grupo. Dos nombres pegados y todo el mundo haciendo scroll para separaros.',
    'Sale el resultado y cerráis el chat a la vez, con una prisa de mierda, como quien tapa una cagada.',
    'Lo leéis y os cruza un asco corto por la cara. No sale un corazón, no sale un chiste, y el mensaje se queda ahí, solo.',
    'Al salir el ship se hace un silencio raro y alguien manda una chorrada cualquiera para no tener que mirarlo.',
    'Nulo. Lo único que os uniría es el asco mutuo.',
    'Se os ha visto el alivio. Habéis soltado el aire los dos, como quien se quita una mierda de encima.',
    'Dos nombres puestos en la misma línea. Os miráis, no os cuadra ni de coña y cada uno tira para su chat.',
    'Cero. Si os lo recuerdan dentro de un año, os seguirá dando grima.',
    'Queda dicho. Habéis leído el resultado y os habéis limpiado la mano en la ropa, como quien ha tocado algo pringoso.',
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
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
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
    await sock.sendMessage(jid, { text: 'Necesito al menos 2 miembros en el grupo.' }, { quoted: msg });
    return SIN_SERVICIO;
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
    // !ship a secas — a QUIEN LO ESCRIBE con alguien al azar.
    //
    // Antes sorteaba dos miembros cualesquiera y el que había escrito el comando
    // se quedaba mirando cómo emparejaban a otros dos. Escribir !ship es
    // apuntarse: lo mínimo es que te toque a ti.
    a = sender;
    const resto = participantIds.filter(id => !sameUser(id, sender));
    if (!resto.length) {
      await sock.sendMessage(jid, { text: 'No hay nadie más en el grupo con quien shipearte.' }, { quoted: msg });
      return SIN_SERVICIO;
    }
    b = shuffle(resto)[0];
  }

  // No shippear a alguien consigo mismo (igual que !mog y !vs).
  if (sameUser(a, b)) {
    await sock.sendMessage(jid, { text: aviso(A_TI_MISMO, jid, 'yo') }, { quoted: msg });
    return SIN_SERVICIO;
  }

  // Al owner principal se le shipea SIEMPRE bajo, 0-12, por pedido expreso suyo:
  // no le gustan los ships en él y punto.
  //
  // Se probó a suavizarlo a 8-53 junto con el resto de amaños, para que no
  // cantara tanto. Lo revirtió: aquí prefiere que cante a que le emparejen. Es
  // su decisión y no se vuelve a tocar sin que la cambie él.
  //
  // LA EXCEPCION: con los numeros de config.shipAlto le sale ALTO en vez de bajo.
  // Va por delante del amaño de arriba a proposito — es una peticion posterior y
  // mas concreta, asi que gana. Con el resto del grupo sigue saliendo 0-12.
  //
  // 62-89 y no "60 y pico": pedirlo "de 60 para arriba" y devolver 60, 61, 62
  // clavados se leeria como un suelo, que es lo que delata un amaño. Con la
  // horquilla ancha unas veces sale correcto y otras sale muy alto, que es como
  // se lee la suerte.
  const ownerInvolved = isMainOwner(a, false, groupMeta) || isMainOwner(b, false, groupMeta);
  const conFavorito = ownerInvolved && (esShipAlto(a) || esShipAlto(b));
  const compat = conFavorito ? 62 + Math.floor(Math.random() * 28)
               : ownerInvolved ? Math.floor(Math.random() * 13)
               : Math.floor(Math.random() * 101);
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

  // Si ya se les shipeo otro dia, el bot compara (utils/rencor.js).
  const memoria = await rencor.ship({ grupo: jid, a, b, compat, groupMeta });

  const text =
    `*Ship*\n\n` +
    `${labelA}  +  ${labelB}\n\n` +
    `${bar}  *${compat}%*\n\n` +
    `${verdict}` +
    (memoria ? `\n\n_${memoria}_` : '');

  await sock.sendMessage(jid, { text, mentions: [a, b] }, { quoted: msg });
}

module.exports = { cmdShip };
