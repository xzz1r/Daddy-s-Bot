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
    'Cien. Sois dos desgracias que por fin se encuentran, y el grupo se libra de dos coñazos de golpe.',
    'Cien. Sois dos piezas rotas por el mismo sitio. Encajáis de milagro y encajáis de puta madre.',
    'Match perfecto. Uno de vosotros pone el caos y el otro la paciencia, que es exactamente como funciona la mierda que dura.',
    'Cien. Si os encierran en una habitación, el grupo tendrá que llamar a la puerta para que salgáis.', // ROCKSTAR
    'Match perfecto. A partir de aquí, cualquier excusa entre vosotros dos es cobardía.',
    'Cien de cien. Si esto no acaba en boda, acaba en desgracia, y con vosotros las dos cosas se parecen.',
    'Match perfecto. Vuestro vecino ya está comprando tapones para los oídos.', // ROCKSTAR
    'Compatibilidad total. Si algún día os pasa algo, que nadie diga que el bot no avisó.',
    'Cien exacto. Ni el bot se lo cree, y eso que os ha visto hacer el gilipoyas por separado.',
    'Compatibilidad total. *Sois la pareja recomendada por nueve de cada diez colchones.*', // ROCKSTAR
    'Cien exacto. A partir de hoy, cuando no contestéis en el grupo, todos sabremos por qué.', // ROCKSTAR
    'Cien. Nadie sabe qué coño os veis, y aun así el número no deja dudas.',
    'Pareja de manual: os vais a hacer la vida imposible y no vais a saber vivir de otra manera.',
    'Cien. Nadie sabe qué os veis, pero todo el mundo se imagina qué os hacéis.', // ROCKSTAR
    'Pareja de manual: os vais a hacer la vida imposible de día y la noche muy posible.', // ROCKSTAR
  ],
  high: [
    'Con este porcentaje, el primer mensaje entre vosotros sería una foto, y no de paisaje.', // ROCKSTAR
    'Con esta química, lo vuestro no son audios de veinte minutos: son llamadas de dos horas con la puerta cerrada.', // ROCKSTAR
    'Conexión de escándalo, en bandeja. Si la desperdiciáis, sois más gilipoyas que compatibles.',
    'Alto. A ver cuál de vosotros propone primero «subir a por algo».', // ROCKSTAR
    'Alta compatibilidad. Química os sobra, lo que os falta son huevos para usarla.',
    'Buena cifra. Si no pasa nada, es porque alguno de vosotros se caga encima.',
    'Buen número. El grupo ya apuesta sobre cuál de vosotros se queda a dormir.', // ROCKSTAR
    'El número dice lo que ninguno de vosotros, cobardes, ha dicho en voz alta.',
    'Compatibilidad de las buenas. Vuestro colchón ya ha pedido el finiquito.', // ROCKSTAR
    'Muy alto. Si lo vuestro sale mal, por lo menos que sea después de la tercera noche.', // ROCKSTAR
    'Esta cifra no se ve todos los días, y uno de vosotros ya está pensando cómo cagarla.',
    'Alto. Vais a discutir mucho y a reconciliaros en horizontal.', // ROCKSTAR
    'Buen ship. Lo malo es que lo vais a gestionar vosotros.',
    'Número alto. La única duda es cuál de vosotros da el primer paso, y todo apunta a que ninguno.',
    'Con esto, cualquiera se lanzaría. Y por cómo os miráis, ya os habéis lanzado y no lo contáis.', // ROCKSTAR
    'Alto. El bot ya ha dicho lo suyo, ahora os toca a vosotros hacer el ridículo.',
    'Compatibilidad seria. Tan seria que lo vuestro ya no hace gracia, y eso en este grupo es raro.',
    'Buena pareja, según el número. Según el grupo, sois un desastre con fecha.',
    'Si fuera cosa de números ya os habríais acostado, pero va de valor, y ahí os lo pensáis demasiado.', // ROCKSTAR
    'Esta cifra es un empujón. Vosotros sois capaces de caeros hacia atrás.',
    'Muy compatibles. Tanto que dais un poco de asco.',
    'Buen porcentaje. El grupo lo va a usar en vuestra contra cada vez que habléis.',
    'Lo habéis releído los dos tres veces, y ninguno lo va a reconocer en la puta vida.',
    'Lo vuestro huele a algo, y ese algo es a sábanas sin cambiar.', // ROCKSTAR
    'Compatibilidad alta. El bot no calcula la cobardía, y por eso el número os ha salido tan bonito.',
    'Número alto. Uno pone la casa y el otro las ganas, y a la cama llegáis a medio pasillo.', // ROCKSTAR
    'Os lo toméis en serio o a broma, este número os lo van a recordar cada vez que os vayáis de una fiesta a la vez.', // ROCKSTAR
    'Número alto. Entre vosotros hay algo, y desde ahora lo sabe todo el grupo.',
    'Alto. No se ve mucho esto, y vosotros dos sois capaces de cagarla con un «jaja» y un sticker.',
    'Buena cifra. Con un poco menos de cobardía, lo vuestro ya estaría en boca de todo el grupo.',
  ],
  mid: [
    'El bot ha visto parejas malas, pero vosotros ni a mala llegáis: llegáis a nada. A puta nada.',
    'Mitad y mitad. Lo mismo acaba en polvo que en nada, y con vosotros siempre acaba en nada.', // ROCKSTAR
    'Número tibio. Os daría para un polvo una vez y para volver cada uno a casa diciendo «bien, ¿no?».', // ROCKSTAR
    'Compatibilidad a medias: da para un magreo en un portal y para no volver a hablar del tema.', // ROCKSTAR
    'Regular. Lo justo para no bloquearos, y para silenciaros a los dos días.',
    'Mediano. En la cama os ganaría cualquiera del grupo a sorteo.', // ROCKSTAR
    'Número normal. Tenéis química, de la que viene en el kit de principiante y sin pilas.', // ROCKSTAR
    'A medias. Podría funcionar si los dos cambiarais todo lo que sois.',
    'Regular tirando a mal. Un polvo, como mucho, y a mitad alguien mira el móvil.', // ROCKSTAR
    'Compatibilidad de gente que se acuesta por aburrimiento y se deja notas en la nevera al día siguiente.', // ROCKSTAR
    'No da para boda ni para bronca. Da para nada, que es peor.',
    'Número medio. Si alguno estaba esperando una señal, es esta: ni lo intentes.',
    'Mitad. La otra mitad la tendríais que poner vosotros, y no la tenéis.',
    'Regular. Lo vuestro es de esas cosas que el grupo olvida antes de que acabe el día.',
    'Medio. Podéis intentarlo, y el grupo ya ha apostado cuánto os dura.',
    'Compatibilidad justita. Con esto os liais en una fiesta, pero no cruzáis la ciudad por la otra persona.', // ROCKSTAR
    'Mediano. Hay parejas peores que vosotros, pero no en este grupo.',
    'Templado. Como los gemidos que os sacaríais: dos y por educación.', // ROCKSTAR
    'Número de tregua. No os odiáis, pero tampoco os aguantaríais una semana.',
    'Medio punto. Lo justo para que el grupo haga un chiste y se olvide.',
    'Regular. Si os pasa algo, el grupo dirá que se veía venir, y si no, también.',
    'Compatibilidad del montón. En la cama, misionero y a dormir, y al día siguiente ni os acordáis.', // ROCKSTAR
    'Mediano. Si la química fuera un examen, lo habríais aprobado copiando.',
    'Cifra tibia. Da para miraros raro en un cumpleaños y para pensar en el otro alguna noche aburrida.', // ROCKSTAR
    'Mitad de camino. Y a ninguno de vosotros le apetece andar la otra mitad.',
    'Regular. Lo vuestro tiene el futuro de un grupo creado para organizar una cena.',
    'Número medio. Da para un rumor en el grupo, y ni los que lo cuentan se lo creen.',
    'A medias. El bot no se moja, y vosotros no os mojaríais ni bajo la lluvia.', // ROCKSTAR
    'Mediocre. Como pareja, sois un «bueno, vale».',
    'Medio. Si uno de vosotros se lo toma en serio, el otro se le va a reír en la cara.',
  ],
  low: [
    'Esta es la única vez que vais a salir juntos en algo, y es en un número de mierda.',
    'Poca compatibilidad. Os soportáis porque estáis en el mismo grupo, y en la misma cama no os soportaríais ni con la luz apagada.', // ROCKSTAR
    'Número bajo. Si os encierran en una habitación con una cama, alguien duerme en el suelo.', // ROCKSTAR
    'Bajo. Uno de vosotros pide más y el otro pone los ojos en blanco, y no de placer.', // ROCKSTAR
    'Bajo. El bot ha buscado algo en común entre vosotros y solo ha encontrado que los dos dais pereza.',
    'Compatibilidad de ascensor: os miráis los pies y ninguno piensa en apretar el botón de parada.', // ROCKSTAR
    'Poco. Mejor ni lo intentéis, que luego el grupo tiene material para años.',
    'Número bajo. Lo vuestro acabaría en una discusión por quién duerme en el lado de la pared.', // ROCKSTAR
    'Bajo. Como pareja os daríais pena, y os la daríais a la cara.',
    'Poca química. Lo único que compartiríais en la cama es el cargador del móvil.', // ROCKSTAR
    'Bajo. En una app de citas os habríais descartado a la primera foto.',
    'Número malo. Uno de vosotros querría follar, el otro dormir, y los dos estar con otra persona.', // ROCKSTAR
    'Sois un malentendido con dos nombres, y ninguno de los dos quiere aclararlo.',
    'Poca compatibilidad, y ningún condón del mundo os protegería del arrepentimiento.', // ROCKSTAR
    'Bajo. Juntaros sería un castigo, y el grupo no sabría a cuál de los dos compadecer.',
    'Número bajo. Lo más excitante que os podría pasar juntos es no coincidir.', // ROCKSTAR
    'Poco. Si os escribís alguna vez, que sea para pediros dinero, que eso sí funcionaría.',
    'No os salva ni el alcohol ni la soledad, y esas dos han juntado a gente mucho peor.',
    'Compatibilidad de mierda. Si uno de vosotros se cae, el otro graba.',
    'Número triste. No da ni para un rollo de una noche.', // ROCKSTAR
    'Bajo. Esto lo ha shipeado alguien que no os conoce, o que os odia.',
    'Poca química. Si os liarais, lo contaríais como un error.', // ROCKSTAR
    'Bajo. Seríais la pareja que el grupo invita por compromiso y de la que luego no se habla.',
    'Poco. Mejor como enemigos, que ahí sí tenéis futuro.',
    'Bajo. Dos desconocidos en una discoteca a las seis de la mañana tienen más ganas de liarse que vosotros.', // ROCKSTAR
    'Uno de vosotros merece algo mejor, y el otro también.',
    'En una semana os quitaríais las ganas de todo, hasta de vivir.',
    'En un grupo de cien personas, nadie os habría emparejado ni para joder.',
    'Compatibilidad baja. Os entenderíais mejor por escrito, y por escrito tampoco os entendéis.',
    'Si os preguntan, decid que ha sido una broma del bot. La broma sois vosotros.',
  ],
  zero: [
    'Ni compartís planeta. Uno vive en la Tierra y el otro en una puta dimensión paralela.',
    'Ni química ni física, y ganas de follaros el uno al otro, ninguna.', // ROCKSTAR
    'Cero. Si os presentaran desnudos, os daríais la mano y os vestiríais cada uno por un lado.', // ROCKSTAR
    'Cero. Esto no lo arregla ni el fin del mundo con vosotros dos como últimos supervivientes.',
    'Nada. El número dice que os ignoréis, y vuestros genitales están de acuerdo.', // ROCKSTAR
    'Lo más bonito que os podéis regalar es una puta orden de alejamiento.',
    'Nulo. Si os ponéis de acuerdo en algo, será en que esto es una mierda.',
    'Cero absoluto. Ni con un pedo a las cinco de la mañana os liabais, y a esa hora vale todo.', // ROCKSTAR
    'Cero. Os sentarían en la misma mesa de una boda y alguien acabaría cambiándose de sitio.',
    'Nada de nada. Ni con la luz apagada, ni con alcohol, ni pagando os acostaríais.', // ROCKSTAR
    'Cero. El único roce que vais a tener es este mensaje.', // ROCKSTAR
    'Lo vuestro no sale bien ni en un sueño húmedo: os despertaríais con asco.', // ROCKSTAR
    'Nulo. Quien os haya juntado en este ship tiene muy mala leche.',
    'Cero. Os odiaríais con una constancia que no tenéis para nada más.',
    'Nada. Os dejan a solas en una habitación y cada uno se pone a buscar porno en su móvil.', // ROCKSTAR
    'Si os preguntan por esto, os descojonáis los dos, y es lo único que haréis juntos.',
    'Cero patatero. El bot os ha intentado imaginar en la cama y ha tenido que apagar la pantalla.', // ROCKSTAR
    'Nada. Sois dos personas que se cruzan en la calle y no se miran.',
    'Cero. He visto parejas imposibles, pero lo vuestro da asco hasta escribirlo.',
    'Nulo. Si alguno de vosotros se había hecho ilusiones, que se las meta por el culo.',
    'Cero. Lo más íntimo que vais a compartir es la lista de miembros del grupo.', // ROCKSTAR
    'Nada. Forzar lo vuestro sería un delito, y de los feos.',
    'El bot no hace milagros, y para que os folléis haría falta una docena.', // ROCKSTAR
    'Ni en otra vida, y con vuestras caras, menos todavía.',
    'Juntaros da tanta grima que el grupo no sabe si reírse o vomitar.',
    'Nulo. Lo único que se os pondría de punta juntos es el pelo, del susto.', // ROCKSTAR
    'Cero. Os libráis los dos de una buena mierda, y cada uno sabe cuál.',
    'Os ha juntado el sorteo por mala hostia, que por ganas no os juntaba nadie.',
    'Cero. Si os lo recuerdan dentro de un año, os seguirá dando grima.',
    'Nulo. Que conste en acta y que nadie os vuelva a emparejar en esta mierda.',
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
