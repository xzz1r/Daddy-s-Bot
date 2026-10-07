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
    'Match del cien, cabrón. Dos piezas rotas que encajan justo por donde están rotas.',
    'Cien. Dos piezas rotas que resulta que estaban rotas por el mismo sitio. Encajan de milagro y encajan de puta madre.',
    'Match perfecto. Uno pone el caos y el otro pone la paciencia, que es exactamente como funciona la mierda que dura.',
    'Cien. El bot no reparte esto a cualquiera, y os ha tocado a vosotros dos. Qué desperdicio de cifra.',
    'Match perfecto. A partir de aquí, cualquier excusa entre vosotros dos es cobardía.',
    'Cien de cien. Si esto no acaba en boda, acaba en desgracia, y con vosotros las dos cosas se parecen.',
    'Cien. A partir de hoy, cada vez que uno de los dos escriba, el grupo va a mirar al otro lado.',
    'Compatibilidad total. Si algún día os pasa algo, que nadie diga que el bot no avisó.',
    'Cien exacto. Ni el bot se lo cree, y el bot no se equivoca con vosotros.',
    'Match perfecto. Os aguantaríais lo que no aguantaría nadie más. Eso, aquí, es amor.',
    'Cien. Si lo vuestro acaba en boda, el discurso ya lo tiene escrito el bot.',
    'Cien. Tanta química que debería venir con aviso de peligro.',
    'Match perfecto. Os vais a hacer la vida imposible y no vais a saber vivir de otra manera.',
    'Cien. Con esto, si no os pasa nada, el problema ya no sería la compatibilidad: sería la cobardía.',
    'Cien por cien. El bot se lava las manos. Lo que pase a partir de aquí es cosa vuestra.',
  ],
  high: [
    'Con este porcentaje, el primer mensaje entre vosotros se escribiría solo. Lo difícil es mandarlo.',
    'Con esta sintonía os daría para audios de veinte minutos, no para un «jaja» suelto.',
    'Conexión de escándalo, y os la ponen en bandeja. Lo que hagáis con ella ya es cosa vuestra.',
    'Con este porcentaje habría que celebrarlo. Ahora, a ver cuál de vosotros lo menciona primero.',
    'Alta compatibilidad. Química hay de sobra. Lo que falta son huevos para usarla.',
    'Buena cifra. Si no pasa nada, es porque alguno de los dos se caga encima.',
    'Buen número. Ahora el grupo tiene un porcentaje para restregároslo.',
    'Alto, alto. El número dice lo que ninguno de vosotros ha dicho.',
    'Compatibilidad de las buenas. Lo malo es que os parecéis en lo peor, y eso también suma.',
    'Muy alto. Si esto sale mal, va a ser por pura imbecilidad vuestra, no por el número.',
    'Esta cifra no se ve todos los días. Aprovechadla antes de que uno de los dos la cague.',
    'Alto. Vais a discutir mucho y a reconciliaros peor. El grupo ya tiene palomitas.',
    'Buen ship. Vuestro número está; lo demás ya no depende del bot.',
    'Número alto. La única duda es quién va a dar el primer paso, y todo apunta a que nadie.',
    'Con esto, cualquiera se lanzaría. Veremos si vosotros sois cualquiera.',
    'Alto. El bot ya lo ha dicho. Ahora os toca a vosotros hacer el ridículo.',
    'Compatibilidad seria. Tan seria que ya no hace gracia, y eso en este grupo es raro.',
    'Buena pareja, según el número. Lo demás tenéis que ponerlo vosotros.',
    'Alto. Si fuera cosa de números, ya os habríais casado. El resto es cosa de cojones.',
    'Esta cifra es un empujón. Vosotros sois capaces de caeros hacia atrás.',
    'Muy compatibles. Tanto que da un poco de asco.',
    'Buen porcentaje. El grupo lo va a usar en vuestra contra cada vez que habléis.',
    'Alto. Os han puesto el número; lo raro sería que no pasara nada.',
    'Esto huele a algo. El bot solo pone el número y el grupo ya pone el cotilleo.',
    'Compatibilidad alta. Ahora os falta la valentía, que esa no la calcula el bot.',
    'Buen número. Uno propone y el otro dice que sí. Falta decidir quién es quién.',
    'Alto. Os lo toméis en serio o a broma, lo vais a pagar igual.',
    'Número alto. Entre vosotros hay algo, y desde ahora lo sabe todo el grupo.',
    'Alto. No se ve mucho esto, así que no lo desperdiciéis con un «jaja».',
    'Buena cifra. Un café y un poco de vergüenza menos, y esto se arregla solo.',
  ],
  mid: [
    'El bot ha visto parejas malas, pero es que estos dos ni siquiera llegan a mala. Llegan a nada. A puta nada.',
    'Mitad y mitad. Lo mismo acaba en algo que en nada, y con vosotros suele ser nada.',
    'Número tibio. El grupo esperaba más drama.',
    'Compatibilidad a medias. Da para una tarde, no para una historia.',
    'Regular. Lo justo para no bloquearos y poco más.',
    'Mediano. Como pareja, os ganaría cualquiera del grupo a sorteo.',
    'Número normal. Hay química, pero de la que viene en el kit de principiante.',
    'A medias. Podría funcionar si los dos cambiarais todo lo que sois.',
    'Regular tirando a mal. Una cita, como mucho, y a mitad de la cita alguien mira el móvil.',
    'Compatibilidad de gente que comparte piso y se deja notas en la nevera.',
    'No da para boda ni para bronca. Da para nada, que es peor.',
    'Número medio. Si alguno está esperando una señal, esta no es.',
    'Mitad. La otra mitad la tendríais que poner vosotros, y no la tenéis.',
    'Regular. Lo vuestro es de esas cosas que el grupo olvida antes de que acabe el día.',
    'Medio. Podéis intentarlo, pero no digáis luego que el bot no avisó.',
    'Compatibilidad justita. Con esto se sale a tomar algo, no se cruza la ciudad por la otra persona.',
    'Mediano. Hay parejas peores. Hay muchas mejores.',
    'Templado. Como los mensajes que os mandaríais: «vale», «ok», «jaja».',
    'Número de tregua. No os odiáis. Tampoco os aguantaríais una semana.',
    'Medio punto. Lo justo para que el grupo haga un chiste y se olvide.',
    'Regular. Si pasa algo, el grupo dirá que se veía venir. Si no pasa, también.',
    'Compatibilidad del montón. Os parecéis en lo aburrido.',
    'Mediano. Si la química fuera un examen, lo habríais aprobado copiando.',
    'Cifra tibia. Da para mirarse raro en un cumpleaños y poco más.',
    'Mitad de camino. Y a ninguno de los dos le apetece andar la otra mitad.',
    'Regular. Lo vuestro tiene el futuro de un grupo creado para organizar una cena.',
    'Número medio. Suficiente para un rumor, insuficiente para un escándalo.',
    'A medias. El bot no se moja, y vosotros tampoco os mojaríais.',
    'Mediocre. Como pareja, sois un «bueno, vale».',
    'Medio. Si alguno de los dos se lo toma en serio, el otro se va a reír. Mal plan.',
  ],
  low: [
    'Bajo. Esto no lo arregla ni una borrachera.',
    'Poca compatibilidad. Os soportáis porque estáis en el mismo grupo y no queda otra.',
    'Número bajo. Si os encierran en una habitación, a los cinco minutos alguien finge una llamada.',
    'Bajo. Uno habla y el otro pone los ojos en blanco. Así sería siempre.',
    'Bajo. El bot ha buscado mucho algo en común. No lo ha encontrado.',
    'Compatibilidad de ascensor: dos personas que se miran los pies y esperan su planta.',
    'Poco. Mejor ni lo intentéis, que luego el grupo tiene material para años.',
    'Número bajo. Lo vuestro acabaría en una discusión por quién paga el café.',
    'Bajo. Como pareja, os daríais pena mutua.',
    'Poca química. Lo único que compartís es la lista de miembros.',
    'Bajo. En una app de citas os habríais descartado a la primera foto.',
    'Número malo. Uno querría salir, el otro quedarse en casa, y los dos estar con otra persona. Así seríais vosotros.',
    'Bajo. Más que una pareja, un malentendido con dos nombres.',
    'Poca compatibilidad y ninguna gana de mejorarla. Al menos es sincero.',
    'Bajo. Juntaros sería un castigo, y el grupo no sabría a cuál de los dos compadecer.',
    'Número bajo. Lo más romántico que os podría pasar es no coincidir.',
    'Poco. Si os escribís alguna vez, que sea para pediros algo.',
    'Bajo. No os salva ni el alcohol ni la soledad.',
    'Compatibilidad baja. Os entendéis igual de mal hablando que callando.',
    'Número triste. No da ni para un rollo de una noche.',
    'Bajo. Esto lo ha shipeado alguien que no os conoce, o que os odia.',
    'Poca química. Si os liarais, lo contaríais como un error.',
    'Bajo. Seríais la pareja que el grupo invita por compromiso y de la que luego no se habla.',
    'Poco. Mejor como enemigos, que ahí sí hay futuro.',
    'Bajo. Hay más química entre dos desconocidos esperando el autobús.',
    'Número bajo. Uno de los dos merece algo mejor, y el otro también.',
    'Poca cosa. Os quitaríais las ganas de todo en una semana.',
    'Bajo. En un grupo de cien personas no os habría emparejado nadie.',
    'Compatibilidad baja. Os entenderíais mejor por escrito, y por escrito tampoco os entendéis.',
    'Bajo. Si os preguntan, decid que es una broma. Porque lo es.',
  ],
  zero: [
    'Estos dos ni comparten planeta. Uno vive en la Tierra y el otro en una puta dimensión paralela.',
    'Cero. No hay nada. Ni química, ni física, ni ganas.',
    'Cero. Si os presentaran, os daríais la mano y os iríais cada uno por un lado.',
    'Cero. Esto no lo arregla ni el fin del mundo con vosotros dos como últimos supervivientes.',
    'Nada. El número dice que os ignoréis, y por una vez hacedle caso.',
    'Cero. Lo más bonito que os podéis dar es distancia.',
    'Nulo. Si os ponéis de acuerdo en algo, será en que esto es una mierda.',
    'Cero absoluto. Hasta el bot se ha reído al calcularlo.',
    'Cero. Os sentarían en la misma mesa de una boda y alguien acabaría cambiándose de sitio.',
    'Nada de nada. Mejor que ni os saludéis, por si se contagia.',
    'Cero. El único futuro que compartís es este mensaje.',
    'Cero. Lo vuestro sería un error hasta en un sueño.',
    'Nulo. Quien haya pedido este ship tiene muy mala leche.',
    'Cero. Os odiaríais con una constancia que no tenéis para nada más.',
    'Nada. Ni aunque fuerais las dos últimas personas del grupo.',
    'Cero. Os van a preguntar por esto y la respuesta es reírse.',
    'Cero patatero. Ni el bot se atreve a imaginarlo.',
    'Nada. Compatibilidad de dos personas que se cruzan en la calle y no se miran.',
    'Cero. Hay parejas imposibles, y esta es la peor de todas.',
    'Nulo. Si alguno de los dos tenía ilusión, ya puede tirarla.',
    'Cero. Esto sale en el grupo para que quede constancia: jamás.',
    'Nada. Lo mejor que podéis hacer es no forzarlo.',
    'Cero. El bot no hace milagros y esto requeriría varios.',
    'Cero. Ni en otra vida, ni en otro grupo, ni con otra cara.',
    'Cero. Un ship tan malo que da pena hasta publicarlo.',
    'Nulo. Lo único que os uniría es el asco mutuo.',
    'Cero. Os habéis librado de una buena, los dos.',
    'Cero. Aquí no hay pareja. Hay dos nombres con mala suerte en el sorteo.',
    'Cero. Si os lo recuerdan dentro de un año, os seguirá dando grima.',
    'Nulo. Que conste en acta y que no se vuelva a pedir.',
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
