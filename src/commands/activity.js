const { getActiveUsers } = require('../utils/messageCounter');
const { isOwner, isMainOwner, getSender, bareJid, sameUser } = require('../utils/wa');
const { pick, shuffle } = require('../utils/helpers');

// ---- !vs : real-activity head-to-head -------------------------------------

// %W = winner tag, %L = loser tag. Filled in per call.
const VS_ROASTS = [
  '%W habla, %L observa en silencio como el mueble con datos móviles que es. Hasta el sofá del grupo aporta más, perdedor.',
  '%W le saca tantos mensajes a %L que parecen de zonas horarias distintas. Uno vive aquí; el otro solo pasa a mirar y se va.',
  '%L escribe menos que los términos y condiciones que nadie lee. Y aporta lo mismo: nada que cambie nada para nadie.',
  'Para %L participar es deporte de riesgo. %W ni se despeina aplastando a alguien que teclea una vez por estación del año.',
  '%L existe en este grupo en modo solo lectura, su hábitat natural. %W lo barre sin enterarse siquiera de que competía.',
  '%W juega en otra liga. %L ni se clasificó, porque para clasificarte hay que presentarse, y eso a %L le da una pereza mortal.',
  '%L aporta al chat lo mismo que un mensaje borrado: ves que estuvo, pero no sabes para qué. %W manda, fantasma.',
  'Si %L hablara la mitad que %W esto estaría reñido. Pero %L guarda sus palabras como si fueran a cotizar. Spoiler: no lo harán.',
  '%L, fantasma confirmado. %W, con pulso. No hay color: es un duelo entre alguien y el eco de su propia ausencia.',
  'Esto no fue un duelo, fue una ecografía: confirmó que %L está, pero sin señales de actividad. %W respira por los dos.',
  '%L trajo a un duelo de mensajes el mismo silencio que trae a todas partes. %W ni necesitó calentar para ganar.',
  'Mientras %W llenaba el chat, %L practicaba su único talento: estar sin estar. Maestría absoluta en el arte de no existir.',
  '%L perdió por goleada y encima sin presentarse al campo. El walkover andante, rey de perder partidos que ni juega.',
  '%W escribe; %L solo calienta el asiento. El mueble más caro del grupo: ocupa sitio y no presta ningún servicio, perdedor.',
  'A %L le falta voz y le sobra ausencia. A %W le sobra presencia. La balanza ni se molestó en dudar un segundo.',
  'Comparar a %W con %L es comparar un altavoz con un póster: uno suena, el otro solo está pegado a la pared juntando polvo.',
  '%L se mide con %W y sale corriendo de vuelta a su modo lectura, su zona de confort y su único hábitat natural conocido.',
  '%W habla por los dos porque %L reserva sus mensajes para una ocasión especial que lleva años, literalmente, sin llegar.',
  '%L compite en silencio absoluto. %W ya había ganado antes de empezar, en cuanto %L decidió, como siempre, no aparecer.',
  'Si %L escribiera tanto como respira seguiría perdiendo contra %W. Pero ni respira fuerte, no vaya a gastarse de más.',
  '%W tiene presencia propia; %L, modo avión permanente. Uno transmite, el otro lleva años sin cobertura social, ni una rayita.',
  '%L es el relleno del duelo, el silencio entre canción y canción. %W es la canción. Nadie tararea los silencios, fantasma.',
  'Que %L ni lo intente. %W lo barre sin despeinarse, y eso que barrer implica mover algo, cosa que a %L le resulta exótica.',
  '%W aporta vida al chat; %L aporta el vacío educado del que entra, lee y se va sin decir ni hola. Diferencia abismal.',
  '%L quedó tan atrás que %W ya ni lo ve por el retrovisor. Polvo en el camino, y del que no se levanta ni con ventilador.',
  'Hasta el bot escribe más que %L, y el bot solo responde a comandos. %W lo sabía; %L sigue sin enterarse de nada, mudo.',
  '%W demostró quién manda. %L que tome asiento, que para eso es para lo único que vino al grupo desde el primer día.',
  '%L tiene el récord de leer doscientos mensajes y no soltar ni uno. %W habla y aporta; %L mira, calla y se guarda todo.',
  'El marcador entre %W y %L parece una errata. No lo es: es lo que pasa cuando uno vive aquí y el otro viene de turista.',
  '%W lleva el peso de la conversación; %L, el peso de no haber dicho nada memorable jamás. Cada uno con su cruz, perdedor.',
  '%L escribe con la frecuencia de un eclipse: raro, breve y la gente avisa cuando ocurre. %W, en cambio, sale a diario.',
  '%W manda y %L asiente en silencio, su forma favorita de participar sin mojarse. Cobardía conversacional de manual.',
  'En este duelo %W puso los mensajes y %L puso la ausencia. Cada uno aportó lo que tenía; lo de %L, ya ves, era bien poco.',
  '%W gana y %L ni protesta, porque protestar también es hablar, y eso a %L lo supera. Derrota muda, la más patética de todas.',
];

function lookupCount(users, jid) {
  // sameUser bridges LID↔phone so a phone-form mention still matches a count
  // stored under the sender's @lid (otherwise active users show as "fantasmas").
  const u = users.find(x => sameUser(x.jid, jid));
  return u ? u.count : 0;
}

// !vs @a @b  (or  !vs @a  → tú vs @a)
async function cmdVs(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const sender = getSender(msg);

  let a, b;
  if (mentioned.length >= 2) [a, b] = mentioned.slice(0, 2);
  else if (mentioned.length === 1) { a = sender; b = mentioned[0]; }
  else {
    return sock.sendMessage(jid, { text: 'Usa: *!vs @a @b* (o *!vs @a* para medirte con alguien).' }, { quoted: msg });
  }

  if (sameUser(a, b)) {
    return sock.sendMessage(jid, { text: 'No puedes enfrentar a alguien consigo mismo.' }, { quoted: msg });
  }

  // El owner principal es invisible en toda estadística: no exponemos su
  // conteo en un !vs. Respondemos como si no hubiera datos de esa persona.
  if (isMainOwner(a, false, groupMeta) || isMainOwner(b, false, groupMeta)) {
    return sock.sendMessage(jid, {
      text: 'No hay datos de actividad para esa comparación.',
    }, { quoted: msg });
  }

  const users = await getActiveUsers(jid, 0); // everyone tracked
  const ca = lookupCount(users, a);
  const cb = lookupCount(users, b);
  const numA = a.split('@')[0];
  const numB = b.split('@')[0];

  const fmt = (n) => `${n} ${n === 1 ? 'msg' : 'msgs'}`;
  let verdict;

  if (ca === 0 && cb === 0) {
    verdict = 'Ninguno de los dos habla. Empate técnico entre dos fantasmas.';
  } else if (ca === cb) {
    verdict = 'Empate exacto. Igual de irrelevantes los dos, felicidades.';
  } else {
    const winNum = ca > cb ? numA : numB;
    const loseNum = ca > cb ? numB : numA;
    const diff = Math.abs(ca - cb);
    const line = pick(VS_ROASTS).replace(/%W/g, `@${winNum}`).replace(/%L/g, `@${loseNum}`);
    verdict = `@${winNum} domina por *${diff}* ${diff === 1 ? 'mensaje' : 'mensajes'}.\n${line}`;
  }

  const text =
    `*VS — quién manda*\n\n` +
    `@${numA} — ${fmt(ca)}\n` +
    `@${numB} — ${fmt(cb)}\n\n` +
    `${verdict}`;

  await sock.sendMessage(jid, { text, mentions: [a, b] }, { quoted: msg });
}

// ---- !inactivos : wall of shame for the quietest members ------------------

const GHOST_ROASTS = [
  'Lleva tanto sin escribir que el grupo lo da por desaparecido en combate. Pero no hubo combate: nunca llegó a aparecer.',
  'Modo solo lectura desde que entró. Un suscriptor que ve el contenido gratis y jamás deja ni un mísero me gusta, parásito.',
  'Entra, lee, espía y se larga sin dejar huella. El fantasma oficial del grupo, con el agravante de que los fantasmas al menos asustan.',
  'Escribe una vez al mes y se queda tan ancho, como quien riega una planta al año y se cree jardinero. Aporte de figurante mudo.',
  'Su última participación es ya arqueología. Habría que datarla con carbono 14 para saber de qué temporada del grupo es, fantasma.',
  'Está aquí solo para enterarse de los chismes, como la vecina de la cortina pero sin su encanto. Mira mucho, aporta exactamente cero.',
  'El típico que reacciona con un emoji pero nunca escribe. Le da al corazoncito y huye, como si teclear le cobrara peaje, cobarde.',
  'Más callado que una foto. Y como la foto, lleva tanto colgado en la pared que ya nadie lo mira ni recuerda quién lo puso ahí.',
  'Tiene el grupo en silencio absoluto. Ocupa una plaza que cualquiera con algo que decir aprovecharía mil veces mejor que él.',
  'Participa lo mismo que un electrodoméstico apagado: está enchufado, ocupa sitio y no hace absolutamente nada de utilidad.',
  'Si no fuera por la lista de miembros, nadie sabría que existe. Es el ingrediente que viene en la receta y que nadie echa de menos.',
  'Leyó este mismo mensaje y tampoco va a contestar. Predecible como el final de una peli mala: sabes que no va a pasar nada, fantasma.',
  'El grupo funcionaría idéntico sin él, y eso es lo más triste: es la persona que no notas que se fue hasta pasado un mes entero.',
  'Lurker con doctorado. Lleva años mirando cómo otros hablan y tomando apuntes que jamás va a usar. Espectador profesional, perdedor.',
  'Habla menos que una pared, y encima la pared sujeta un cuadro. Él no sujeta ni una conversación de dos líneas sin escaparse.',
  'Está suscrito al grupo como quien deja la tele de fondo: ni la ve, ni la apaga, solo le hace compañía al silencio de su salón.',
  'Su teclado debe estar nuevo de fábrica. Lo único que ejercita es el pulgar de bajar y bajar para cotillear sin soltar prenda.',
  'Entra solo para ver quién habló de él y vuelve a su agujero. Vigilante nocturno del grupo, turno permanente de mirar y callar.',
  'El miembro más decorativo del grupo. Un jarrón: queda bien en la lista, completamente inútil para la conversación, don nadie.',
  'Aporta lo mismo que un "este mensaje fue eliminado": ves que pasó algo, pero nada que mereciera la pena leer. Fantasma sin sustancia.',
  'Vive en visto. Del grupo y, sospecho, de unas cuantas cosas más. Campeón de dejar a todos esperando una respuesta que no llega.',
  'Si participar diera puntos, estaría pidiéndole un rescate al FMI. El más pobre del grupo en la única moneda que aquí vale: hablar.',
  'El grupo es su Netflix: lo abre, consume lo que otros se curran y nunca deja reseña. Parásito de entretenimiento ajeno, fantasma.',
  'Lleva semanas de espectador mudo y ni se inmuta. Le importa todo lo mismo: nada. Y eso, al menos, lo transmite con coherencia.',
  'Más ausente que presente aunque la app lo marque en línea. Estar conectado sin aportar: la forma moderna de no estar, perdedor.',
  'Su silencio ya es lo único que tiene por personalidad. Pregúntale al grupo cómo es y nadie sabrá decir más que "calladito".',
  'Participación nivel estatua de plaza: ahí plantado, cagado por las palomas del olvido, sin moverse ni para apartarse, inútil.',
  'El grupo le da igual hasta que huele drama; ahí sale del agujero, husmea y se vuelve a meter. Carroñero de polémicas ajenas.',
  'Escribe con cuentagotas y siempre lo que nadie pidió. Cuando aparece, estorba; cuando calla, sobra. Versatilidad para lo malo.',
  'Tan inactivo que su nombre suena raro hasta leído en voz alta. "¿Ese sigue aquí?", pregunta el grupo. Sí, sigue. Mudo, pero sigue.',
  'Está de cuerpo presente y de mensajes ausentes, como en la cena familiar: ocupa silla, come del plato común y no dice ni mu.',
  'Reacciona a los memes pero jamás hace uno. Consumidor crónico, productor cero. La balanza más desequilibrada del grupo entero.',
  'El típico que suelta un "jajaja" suelto y desaparece otra semana. Esa carcajada es toda su obra completa, edición de bolsillo.',
  'Más fantasma que la cobertura en un ascensor. Lo buscas cuando lo necesitas y, sorpresa, no hay ni una rayita de él por ningún lado.',
  'Su actividad es tan baja que cuesta creer que tenga el grupo abierto. A lo mejor se silenció hasta a sí mismo, por si las moscas.',
  'Entra, ve el último mensaje y se va. Rutina de portero de noche: ficha, da una vuelta, no encuentra nada y se vuelve a sentar.',
  'Aporta al grupo lo que una silla vacía a una cena: ocupa, despista y hace creer que falta alguien. Y falta él, hablando, claro.',
  'Lleva tanto en silencio que ya nadie le espera respuesta. Es el "te leo luego" hecho persona, y el "luego" no llega jamás, perdedor.',
  'Participación de relleno puro: está por estar, como las fotos de stock. Sonríe en la lista y no sirve para nada concreto, fantasma.',
  'Tan callado que se le olvidó que el teléfono también escribe. Lo usa de telescopio para mirar al grupo desde su planeta lejano.',
  'Mira la conversación pasar como quien ve llover desde la ventana: cómodo, seco y sin la menor intención de mojarse jamás, cobarde.',
  'Su récord personal es leer doscientos mensajes sin responder ni uno. Maratón olímpico de la pasividad, medalla de oro garantizada.',
  'El miembro que todos olvidan que existe hasta que sale en esta lista. Es su único momento de protagonismo, y mira tú por qué motivo.',
  'Activo solo en sueños, supongo, porque despierto no suelta una palabra. El conversador más prometedor del mundo de los que callan.',
  'Tan poco activo que el contador casi lo da de baja por inactividad biológica. Le tomamos el pulso al grupo y él no aparecía, fantasma.',
  'Vive de leer lo que otros se curran escribir. Chupa el esfuerzo ajeno como una factura sorpresa: aparece, te resta y no da nada.',
  'Su silencio no es misterio ni timidez, es vagancia con wifi. Tiene todo para hablar y elige, día tras día, no gastar saliva digital.',
  'Aparece solo cuando hay bronca, husmea y se evapora. El resto del año es un nombre en la lista esperando el próximo cotilleo jugoso.',
  'Lee como un detective y participa como un sospechoso que prefiere guardar silencio. Todo lo que diga podría usarse... si dijera algo.',
  'Está en el grupo como el polvo en un mueble: presente, acumulándose y solo visible cuando alguien pasa el dedo. Justo lo que hago ahora.',
];

// !inactivos — ranks the least-active members (owner exempt) and roasts each.
async function cmdInactivos(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  // Everyone tracked, minus the owner tier (the bot never roasts its own owner).
  // isMainOwner además atrapa al owner vía su JID aprendido en grupos LID donde
  // isOwner podría no resolverlo — así el owner nunca cae en la lista.
  let users = await getActiveUsers(jid, 1);
  users = users.filter(u => !isOwner(u.jid, false, groupMeta) && !isMainOwner(u.jid, false, groupMeta));

  if (users.length < 3) {
    return sock.sendMessage(jid, { text: 'No hay suficientes datos de actividad todavía. Hablen más.' }, { quoted: msg });
  }

  // Least active first.
  users.sort((a, b) => a.count - b.count);
  const bottom = users.slice(0, Math.min(5, users.length));
  // Distinct roast per line (no repeats within one list).
  const roasts = shuffle(GHOST_ROASTS).slice(0, bottom.length);

  let text = `*TOP FANTASMAS DEL GRUPO*\n_Los que más miran y menos escriben._\n\n`;
  const mentions = [];
  bottom.forEach((u, i) => {
    const phone = u.jid.split('@')[0];
    const msgs = u.count === 1 ? '1 mensaje' : `${u.count} mensajes`;
    text += `*${i + 1}.* @${phone} — ${msgs}\n${roasts[i]}\n\n`;
    mentions.push(u.jid);
  });
  text += '_Hablen más o sigan en la lista de la vergüenza._';

  await sock.sendMessage(jid, { text: text.trimEnd(), mentions }, { quoted: msg });
}

module.exports = { cmdVs, cmdInactivos };
