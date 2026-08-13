const { getActiveUsers } = require('../utils/messageCounter');
const { isOwner, isMainOwner, getSender, sameUser, soloMiembros, bareJid, canonicalJid, isBotJid } = require('../utils/wa');
const { shuffle, pickFresh } = require('../utils/helpers');

// ---- !vs : real-activity head-to-head -------------------------------------

// %W = winner tag, %L = loser tag. Filled in per call.
let VS_ROASTS = [
  '%W habla, %L observa en silencio como el mueble con datos móviles que es. Hasta el sofá del grupo aporta más, perdedor, patético.',
  '%W le saca tantos mensajes a %L que da vergüenza ajena. %L entra, mira como el puto parásito que es y se larga sin soltar ni una mierda. Cero aporte, cero valor, miserable.',
  '%L aporta al grupo lo mismo que un pedo en una tormenta: nada, cero, una puta mierda que nadie nota. %W habla; %L es relleno inútil que solo ocupa hueco, qué cringe.',
  'Para %L participar es deporte de riesgo. %W ni se despeina aplastando a alguien que teclea una vez por estación del año, da asco.',
  '%L existe en este grupo en modo solo lectura, su hábitat natural. %W lo barre sin enterarse siquiera de que competía, qué vergüenza.',
  '%W juega en otra liga. %L ni se clasificó, porque para clasificarte hay que presentarse, y eso a %L le da una pereza mortal, patético.',
  '%L aporta al chat lo mismo que un mensaje borrado: ves que estuvo, pero no sabes para qué. %W manda, fantasma, asco, ridículo.',
  'Si %L hablara la mitad que %W esto estaría reñido. Pero %L se guarda sus mensajes como si valieran algo. Spoiler: no valen una puta mierda, igual que él, fracasado.',
  '%L, fantasma confirmado. %W, con pulso. Esto no es un duelo: es %W reventando a un muerto de mierda que ni sabe que existe este grupo, qué miseria.',
  'Esto no fue un duelo, fue una autopsia: %L lleva muerto meses y %W lo remató por gusto. Cadáver mudo e inútil contra alguien vivo, sin color, fracasado.',
  '%L trajo a un duelo de mensajes el mismo silencio que trae a todas partes. %W ni necesitó calentar para ganar, da grima.',
  'Mientras %W llenaba el chat, %L hacía lo único que sabe: nada de nada. El puto rey de no servir para una mierda, campeón indiscutible del vacío, basura.',
  '%L perdió por goleada y encima sin presentarse al campo. El walkover andante, rey de perder partidos que ni juega, qué cutre.',
  '%W escribe; %L solo calienta el asiento. El mueble más caro del grupo: ocupa sitio y no presta ningún servicio, perdedor, da pena ajena.',
  'A %L le falta voz y le sobra ser un puto lastre. %W aporta; %L es peso muerto que solo ocupa hueco en la lista. Ni hubo que pensarlo, basura.',
  'Comparar a %W con %L es comparar a alguien con una mancha en la pared: uno aporta, el otro solo está ahí pudriéndose, mudo e inútil de mierda, qué vacío.',
  '%L se mide con %W y sale corriendo de vuelta a su modo lectura, su zona de confort y su único hábitat natural conocido, asco, indignante.',
  '%W habla por los dos porque %L lleva años sin soltar ni una puta palabra útil. Se lo guarda todo para nada, como el inútil de mierda que es, qué flojo.',
  '%L compite en silencio absoluto porque no tiene una puta cosa que decir. %W ya había ganado antes de empezar: reventar a un cero a la izquierda no tiene mérito, menudo desastre.',
  'Si %L escribiera tanto como respira seguiría perdiendo contra %W. Pero ni respira fuerte, no vaya a gastarse de más, fracasado.',
  '%W tiene presencia; %L lleva años en modo avión porque no vale una mierda ni encendido. Uno aporta, el otro es un ladrillo mudo que ocupa sitio, qué pena.',
  '%L es relleno de mierda, el hueco vacío que nadie echa de menos. %W aporta; %L sobra tanto que el grupo ni notaría si lo echan de una patada, fantasma, da vergüenza.',
  'Que %L ni lo intente. %W lo barre sin despeinarse, y eso que barrer implica mover algo, cosa que a %L le resulta exótica, qué vergüenza ajena.',
  '%W aporta vida al chat; %L aporta el vacío educado del que entra, lee y se va sin decir ni hola. Diferencia abismal, qué nivel de pena.',
  '%L quedó tan atrás que %W ya ni lo ve por el retrovisor. Polvo en el camino, y del que no se levanta ni con ventilador, patético.',
  'Hasta el bot escribe más que %L, y el bot solo responde a comandos. %W lo sabía; %L sigue sin enterarse de nada, mudo, patético.',
  '%W demostró quién manda. %L que se calle y siga de adorno inútil, que es lo único que ha hecho este muerto de mierda desde que entró, miserable.',
  '%L tiene el récord de leer doscientos mensajes y no soltar ni uno. %W habla y aporta; %L mira, calla y se guarda todo, basura.',
  'El marcador entre %W y %L parece una errata. No lo es: es lo que pasa cuando uno vive aquí y el otro viene de turista, ridículo.',
  '%W lleva el peso de la conversación; %L es el peso muerto que nadie quiere cargar. Un puto lastre que no ha aportado una mierda en su vida, perdedor, qué cringe.',
  '%L escribe una vez cada muerte de obispo y encima suelta una mierda que nadie pidió. %W aporta a diario; %L solo estorba las pocas veces que aparece, da asco.',
  '%W manda y %L asiente en silencio, su forma favorita de participar sin mojarse. Cobardía conversacional de manual, qué vergüenza.',
  'En este duelo %W puso los mensajes y %L puso su habitual nada de mierda. Cada uno aportó lo que tenía; lo de %L, como siempre, un cero absoluto, inútil, ridículo.',
  '%W gana y %L ni protesta, porque protestar también es hablar, y eso a %L lo supera. Derrota muda, la más patética de todas, fracasado.',
  '%W escribe, aporta y se le nota vivo. %L lleva tanto en silencio que el grupo ya no sabe si es un miembro o un error de la lista que nadie se molesta en corregir. Adivina cuál pierde, fantasma, qué miseria.',
  'Esto no es un duelo, es una limosna: %W le regala a %L la única aparición que va a tener en meses. Aprovéchala, campeón del silencio, que la próxima vez ni te nombran para perder, patético.',
  '%L trajo su arma secreta al duelo: no hacer absolutamente nada, como siempre. %W lo barrió sin despeinarse mientras %L seguía decidiendo si valía la pena teclear. No valía. Nunca vale, perdedor, asco, da grima.',
  '%W tiene voz en el grupo; %L tiene un asiento que igual da si está ocupado o vacío. El marcador solo puso números a algo que todos sabían: uno cuenta, el otro sobra. Y sobra %L, obviamente, basura.',
  'Entre %W y %L la diferencia no es de mensajes, es de existencia. %W está; %L figura. Uno participa, el otro rellena la foto de grupo con cara de no haber dicho nada memorable jamás. Muerto en vida, %L, ridículo.',
  '%L compite contra %W como una mierda seca compite contra alguien vivo. Ni aporta, ni sirve, ni hay razón para mirarlo. %W ni sabía que había duelo hasta que vio el nombre de este puto inútil pidiendo un protagonismo que no se ha ganado en su vida, basura.'
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
    return; // sin dos objetivos no hay comparacion; el bot no da instrucciones
  }

  if (sameUser(a, b)) {
    return sock.sendMessage(jid, { text: 'No puedes enfrentar a alguien consigo mismo.' }, { quoted: msg });
  }

  // Si el owner principal es uno de los dos, no se contesta. Igual que en
  // !count y !relevancia: una respuesta especial para él lo delata tanto como
  // enseñar la cifra, porque es la única comparación que el bot rechaza.
  if (isMainOwner(a, false, groupMeta) || isMainOwner(b, false, groupMeta)) return;

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
    const line = pickFresh(VS_ROASTS, `${jid}|vs`).replace(/%W/g, `@${winNum}`).replace(/%L/g, `@${loseNum}`);
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

let GHOST_ROASTS = [
  'Lleva tanto sin escribir que el grupo lo da por desaparecido en combate. Pero no hubo combate: nunca llegó a aparecer, qué cutre.',
  'Modo solo lectura desde que entró. Un suscriptor que ve el contenido gratis y jamás deja ni un mísero me gusta, parásito, da pena ajena.',
  'Entra, lee, espía y se larga sin dejar huella. El fantasma oficial del grupo, con el agravante de que los fantasmas al menos asustan, qué vacío.',
  'Escribe una vez al mes y se queda tan ancho, el muy inútil. Suelta una mierda cada treinta días y se cree que aporta. No aporta nada, puto parásito mudo, indignante.',
  'Su última palabra útil está tan enterrada que ni con una pala la encuentras. Lleva siglos sin soltar una mierda que valga la pena, puto fantasma, qué flojo.',
  'Está aquí solo para enterarse de los chismes, como la vecina de la cortina pero sin su encanto. Mira mucho, aporta exactamente cero, patético.',
  'El típico que reacciona con un emoji pero nunca escribe. Le da al corazoncito y huye, como si teclear le cobrara peaje, cobarde, asco, menudo desastre.',
  'Más callado que un muerto y con la misma utilidad. Lleva tanto sin abrir la boca que el grupo ya ni recuerda para qué mierda está aquí, cero a la izquierda, qué pena.',
  'Tiene el grupo en silencio absoluto. Ocupa una plaza que cualquiera con algo que decir aprovecharía mil veces mejor que él, ridículo.',
  'Participa lo mismo que un electrodoméstico apagado: está enchufado, ocupa sitio y no hace absolutamente nada de utilidad, fracasado.',
  'Si no fuera por la lista de miembros, nadie sabría que este inútil existe. Sobra tanto que si lo borran mañana no cambia una puta mierda para nadie, da vergüenza.',
  'Leyó este mismo mensaje y ni de coña va a contestar. Es un puto inútil predecible: entra, lee, no aporta una mierda y se larga como siempre, fantasma, qué vergüenza ajena.',
  'El grupo funcionaría idéntico sin él, y eso es lo más triste: es la persona que no notas que se fue hasta pasado un mes entero, qué nivel de pena.',
  'Lurker con doctorado. Lleva años mirando cómo otros hablan y tomando apuntes que jamás va a usar. Espectador profesional, perdedor, patético.',
  'Habla menos que una pared y sirve todavía menos. No aguanta ni dos líneas de conversación sin rajarse y esconderse. Puto inútil sin nada que decir, miserable.',
  'Está en el grupo como un mueble viejo: no sirve, no aporta y nadie lo tira por pura pereza. Chupa del chat y no devuelve ni una mierda, puto parásito, qué cringe.',
  'Su teclado debe estar nuevo de fábrica. Lo único que ejercita es el pulgar de bajar y bajar para cotillear sin soltar prenda, asco, da asco.',
  'Entra solo para ver quién habló de él y vuelve a su agujero. Vigilante nocturno del grupo, turno permanente de mirar y callar, basura.',
  'El miembro más decorativo del grupo. Un jarrón: queda bien en la lista, completamente inútil para la conversación, don nadie, ridículo.',
  'Aporta lo mismo que un "este mensaje fue eliminado": ves que pasó algo, pero nada que mereciera la pena leer. Fantasma sin sustancia, fracasado.',
  'Vive en visto. Del grupo y, sospecho, de unas cuantas cosas más. Campeón de dejar a todos esperando una respuesta que no llega, qué vergüenza.',
  'Si aportar diera puntos, este muerto de hambre estaría en la puta ruina. El más inútil del grupo en lo único que vale aquí: abrir la boca y decir algo, ridículo.',
  'El grupo es su Netflix: lo abre, consume lo que otros se curran y nunca deja reseña. Parásito de entretenimiento ajeno, fantasma, fracasado.',
  'Lleva semanas mirando como un puto pasmarote y ni se inmuta. Le importa todo una mierda y no aporta una mierda. Al menos es coherente en su inutilidad, qué miseria.',
  'Más ausente que presente aunque la app lo marque en línea. Estar conectado sin aportar: la forma moderna de no estar, perdedor, da grima.',
  'Su única personalidad es no servir para nada. Pregúntale al grupo quién es y nadie sabrá decir más que "ese inútil que nunca suelta una puta palabra", basura.',
  'Participación nivel estatua de plaza: ahí plantado, cagado por las palomas del olvido, sin moverse ni para apartarse, inútil, asco, qué cutre.',
  'El grupo le da igual hasta que huele drama; ahí sale del agujero, husmea y se vuelve a meter. Carroñero de polémicas ajenas, basura.',
  'Escribe con cuentagotas y siempre lo que nadie pidió. Cuando aparece, estorba; cuando calla, sobra. Versatilidad para lo malo, ridículo.',
  'Tan inútil que su nombre ya ni suena. "¿Ese muerto sigue aquí?", pregunta el grupo. Sí, sigue: mudo, sobrando y sin aportar una puta mierda, como siempre, da pena ajena.',
  'Cuerpo presente, cerebro ausente y aporte nulo. Chupa del grupo como el cuñado gorrón: se sienta, come de lo que otros ponen y no suelta ni una puta palabra, qué vacío.',
  'Reacciona a los memes pero jamás hace uno. Consumidor crónico, productor cero. La balanza más desequilibrada del grupo entero, indignante.',
  'El típico que suelta un "jajaja" de mierda y desaparece otra semana. Esa risa patética es todo lo que este inútil ha aportado en su puta vida, qué flojo.',
  'Más inútil que un cargador sin cable. Lo buscas cuando hace falta y, sorpresa, el muy fantasma no está ni aporta una puta mierda. Nunca sirve para nada, menudo desastre.',
  'Su actividad es tan patética que dudo que sepa que el grupo existe. Este puto inútil lleva meses sin soltar una mierda y encima se queda tan ancho, qué pena.',
  'Entra, cotillea el último mensaje y se larga sin soltar una mierda. Parásito de manual: consume lo que otros escriben y no devuelve ni las gracias, inútil, da vergüenza.',
  'Aporta al grupo lo que una piedra a una conversación: nada, cero, una puta mierda. Ocupa sitio, no dice ni mu y encima se cree parte del grupo. No lo eres, fantasma, qué vergüenza ajena.',
  'Lleva tanto en silencio que ya nadie le espera respuesta. Es el "te leo luego" hecho persona, y el "luego" no llega jamás, perdedor, basura.',
  'Participación de relleno puro: está por estar, como las fotos de stock. Sonríe en la lista y no sirve para nada concreto, fantasma, ridículo.',
  'Tan inútil que se le ha olvidado que el móvil también sirve para escribir. Lo usa solo para espiar al grupo como el puto mirón que es, sin soltar una mierda, qué nivel de pena.',
  'Mira la conversación pasar como quien ve llover desde la ventana: cómodo, seco y sin la menor intención de mojarse jamás, cobarde, patético.',
  'Su récord personal es leer doscientos mensajes sin responder ni uno. Maratón olímpico de la pasividad, medalla de oro garantizada, miserable.',
  'El inútil que todos olvidan que existe hasta que sale en esta lista de mierda. Su único momento de gloria es que le recuerden lo poco que vale. Enhorabuena, fantasma.',
  'Activo solo en sueños, porque despierto no suelta ni una puta palabra. Todo el día leyendo lo que otros curran y devolviendo una mierda pinchada en un palo, qué cringe.',
  'Tan poco activo que el contador casi lo da de baja por inactividad biológica. Le tomamos el pulso al grupo y él no aparecía, fantasma, da asco.',
  'Vive de leer lo que otros se curran escribir. Chupa el esfuerzo ajeno como una factura sorpresa: aparece, te resta y no da nada, patético.',
  'Su silencio no es misterio ni timidez, es vagancia con wifi. Tiene todo para hablar y elige, día tras día, no gastar saliva digital, asco, qué vergüenza.',
  'Aparece solo cuando hay bronca, husmea y se evapora. El resto del año es un nombre en la lista esperando el próximo cotilleo jugoso, basura.',
  'Lo lee todo como un puto cotilla y no suelta ni una palabra. Se lo traga todo gratis y no devuelve una mierda. Parásito con derecho a asiento y nada más, ridículo.',
  'Está en el grupo como el polvo en un mueble: presente, acumulándose y solo visible cuando alguien pasa el dedo. Justo lo que hago ahora, fracasado.',
  'Lleva tanto sin escribir que si mañana desaparece, el grupo tardaría semanas en notarlo y ninguna de esas semanas cambiaría nada. Existe en modo borrador: empezado, nunca publicado, olvidado en un rincón, fracasado.',
  'El fantasma que reacciona con un emoji una vez al mes y se cree participativo. Consume el trabajo de todos, no devuelve ni una frase y encima duerme tranquilo. Parásito con wifi y sin la menor vergüenza, qué miseria.',
  'Tiene el grupo abierto solo para husmear quién habló de él. Nunca fue nadie, nunca dijo nada, y aun así vigila por si acaso su irrelevancia sale mencionada. Spoiler: sale, y es aún peor de lo que teme, da grima.',
  'Su aportación al grupo es una puta mierda del tamaño de la nada. Cuerpo presente, contenido cero: como el gorrón que se cuela en la fiesta, come de todo, no dice ni mu y se va sin que nadie recuerde que ese inútil vino, basura.',
  'Escribe con la frecuencia de un cometa y con la mitad del interés. Cuando por fin suelta algo, el grupo ya se había acostumbrado a su ausencia y preferiría que siguiera así. Vuelve a tu agujero, fantasma, qué cutre.',
  'El miembro más decorativo del chat: ocupa plaza, no da servicio y solo aparece en la lista para inflar el número. Un cero con foto de perfil. Si el grupo fuera un cuerpo, sería el apéndice: inútil y silencioso, patético.',
  'Lleva de espectador tanto tiempo que ya forma parte del mobiliario. Nadie le pregunta nada porque nadie espera respuesta, y él lo prefiere así: participar le exigiría demostrar que tiene algo dentro. No lo tiene, asco, da pena ajena.',
  'Su teclado es de adorno y su presencia también. Lee doscientos mensajes, no suelta ni uno y se va convencido de que estar callado lo hace interesante. Solo lo hace invisible, que en tu caso es lo mismo, perdedor, basura.'
];

// !fantasmas — ranking de los que MENOS escriben (pero escriben). Antes se
// llamaba !inactivos; ese nombre pasó a un comando distinto, ver más abajo.
async function cmdFantasmas(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  // Everyone tracked, minus the owner tier (the bot never roasts its own owner).
  // isMainOwner además atrapa al owner vía su JID aprendido en grupos LID donde
  // isOwner podría no resolverlo — así el owner nunca cae en la lista.
  let users = await getActiveUsers(jid, 1);
  users = users.filter(u => !isOwner(u.jid, false, groupMeta) && !isMainOwner(u.jid, false, groupMeta));

  // Solo miembros actuales: quien se salió no debe salir en "fantasmas" aunque
  // su conteo siga guardado. Sin metadata no se filtra, para no vaciar la lista.
  users = soloMiembros(users, groupMeta);

  if (users.length < 3) {
    return sock.sendMessage(jid, { text: 'No hay suficientes datos de actividad todavía. Hablen más, qué vacío.' }, { quoted: msg });
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

// ---- !inactivos : los que no llegan al minimo de actividad ----------------
//
// Distinto de !fantasmas: aquel ORDENA a los que hablan poco (un ranking de
// vergüenza), este SEÑALA a los que están por debajo del umbral y les avisa de
// que el bot los va a sacar. Es la lista de aviso previo, no un top.
//
// El umbral es 10 mensajes. Antes era cero — solo salían los que no habían
// escrito nunca — y eso dejaba fuera al que suelta tres "jaja" en seis meses y
// se cree a salvo. Con 10 el corte separa de verdad al que participa del que
// solo ocupa plaza.
//
// La fuente son las DOS listas: los miembros con menos de 10 mensajes contados
// y los que no aparecen en el contador (cero mensajes, el contador ni los
// conoce, así que hay que sacarlos de la lista de participantes).

// Cabecera de !inactivos. El encargo era claro: humor, ataque a lo inútiles que
// son en el grupo, y amenaza de expulsión. Las anteriores sonaban a carta del
// banco — correctas, serias y sin una sola gracia. Estas se ríen de la persona
// ANTES de amenazarla, que es el orden que funciona.
// Cabecera de !inactivos.
//
// El encargo, textual: humor, ataque a lo inútiles que son en el grupo, y
// amenaza de expulsión. Las anteriores eran correctas y no hacían gracia — una
// línea seca y a otra cosa. Estas tienen que doler y hacer reír a los demás a la
// vez, que es lo que hace que un grupo se ría de una purga en vez de ofenderse.
//
// Tres cosas que cumplen todas: son largas (una línea sola no construye nada),
// atacan el VALOR SOCIAL de la persona en el grupo (no su físico ni su vida), y
// terminan en un remate. Sin remate no es un chiste, es una queja.
let AVISO_PURGA = [
  'El bot ha repasado vuestro historial buscando algo que salvar. Un chiste malo, un audio, una discusión. Nada. Lista de purga lista. Joder, indignante.',
  'Historial vacío de sustancia: el bot no encontró motivo para conservaros. Escribid o fuera. El grupo lo nota cada día, qué flojo.',
  'La purga no es teatro: es limpieza. El historial mudo no defiende a nadie. Y. el ranking no miente, menudo desastre.',
  'El bot buscó un rastro útil en vuestros nicks. No lo hubo. La lista se escribe sola. El grupo lo nota cada día, qué pena.',
  'Inactivos sin obra que mostrar: el bot no hace de museo. Escribid antes del kick. El grupo lo nota cada día, da vergüenza.',
  'Repaso de historial terminado: no hay con qué defender la permanencia. Purga en marcha. El grupo lo nota cada día, patético.',
  'El bot no encontró un mensaje vuestro que justificara el hueco que ocupáis. Conclusión obvia. El grupo lo nota cada día, ridículo.',
  'Historial de silencio: la purga es el siguiente capítulo. Escribid si queréis otro final. El grupo lo nota cada día, basura.',
  'Lista de purga alimentada con nicks sin rastro. El bot no inventa méritos. El grupo lo nota cada día, desperdicio, ridículo.',
  'El historial os delató: no hay sustancia. El kick no necesita más pruebas. Y. el ranking no miente, asco, qué vergüenza ajena.',
  'Purga en preparación: el bot ya leyó el vacío. Escribid si queréis ensuciar ese vacío con algo. El grupo lo nota cada día, cutre, qué nivel de pena.',
  'Nada que salvar en el historial. La lista de salida se llena sola. Y. el ranking no miente, pringado, patético.',
  'El bot buscó un motivo para dejaros. No apareció. Escribid o aceptad el parte. El grupo lo nota cada día, fracasado.',
  'Historial mudo: la purga no es venganza, es higiene del grupo. Y. el ranking no miente, joder con el ranking como único testigo del veredicto, miserable.',
  'Repaso terminado. Los nicks sin obra pasan a la lista. Escribid para rayaros de ella. El grupo lo nota cada día, qué cringe.',
  'El bot no encontró defensa en vuestros mensajes. Porque no hay mensajes que defender. El grupo lo nota cada día, da asco.',
  'Purga: el historial vacío es la acusación y la sentencia a la vez. Y. el ranking no miente, cabrón sin que nadie pudiera fingir que no lo vio, qué vergüenza.',
  'Lista de limpieza lista. El silencio os puso en ella. Un mensaje puede sacaros. El grupo lo nota cada día, ridículo.',
  'El bot repasó y no halló sustancia. La purga no negocia con el vacío. Y. el ranking no miente, patético.',
  'Historial sin obra: el grupo no os debe el puesto. El bot cobra la deuda. El grupo lo nota cada día, ridículo.',
  'Purga en camino: escribid si vuestro nick merece una segunda lectura del historial. El grupo lo nota cada día, basura.',
  'El bot buscó un chiste, un audio, un hilo vuestro. Nada. Lista actualizada. El grupo lo nota cada día, desperdicio, fracasado.',
  'Silencio documentado: la purga es el procedimiento, no el drama. Y. el ranking no miente, asco delante de quien miraba el ranking en ese momento, qué miseria.',
  'Historial vacío de mérito: el kick es la continuación lógica. Y. el ranking no miente, cutre con el sistema firmando debajo sin pedir aclaración, da grima.',
  'El bot no hace excepciones por cara: hace excepciones por rastro de mensajes. El grupo lo nota cada día, pringado, basura.',
  'Purga: los nicks sin huella pasan por caja. La caja es la salida. Y. el ranking no miente, fracasado.',
  'Repaso de historial: no hay con qué pelear la permanencia. Escribid o fuera. El grupo lo nota cada día, qué cutre.',
  'Lista de purga con nombres del vacío. El bot no rellena biografías. Y. el ranking no miente, mierda en el momento más visible del chat, da pena ajena.',
  'El historial os dejó solos. El bot solo ejecuta lo que el vacío ya decidió. Y. el ranking no miente, qué vacío.',
  'Purga sin teatro: historial mudo, nick fuera cuando toque. Y. el ranking no miente, cabrón con el parte del comando cerrado en firme, indignante.',
  'El bot buscó algo que salvar de vosotros. El resultado fue la lista de salida. El grupo lo nota cada día, qué flojo.',
  'Historial sin sustancia: la higiene del grupo tiene fecha. Y. el ranking no miente, patético mientras el grupo tomaba nota del resultado, menudo desastre.',
  'Escribid antes de que la purga cierre el parte con vuestro nombre en limpio. El grupo lo nota cada día, ridículo.',
  'El silencio no os hace interesantes: os hace candidatos. El bot confirma. Y. el ranking no miente, basura.',
  'Purga alimentada de inactividad. Un mensaje real puede cortar el proceso. El grupo lo nota cada día, desperdicio, qué pena.',
  'Historial repasado: no hay obra. No hay defensa. Hay lista. Y. el ranking no miente, asco con el sistema firmando debajo sin pedir aclaración, da vergüenza.',
  'El bot no encontró un solo motivo de peso para conservaros en el vacío. Y. el ranking no miente, cutre, asco, qué vergüenza ajena.',
  'Purga: el grupo no es archivo de nicks apagados. Escribid o adiós. Y. el ranking no miente, pringado, qué nivel de pena.',
  'Lista de limpieza: el historial mudo fue la única prueba necesaria. Y. el ranking no miente, fracasado.',
  'El bot ejecutará lo que el ranking de inactivos ya sugirió. Escribid si queréis objetar con hechos. El grupo lo nota cada día, patético.',
  'Historial vacío: la purga no pide permiso al sentimentalismo. Y. el ranking no miente, mierda sin que nadie pudiera fingir que no lo vio, miserable.',
  'Repaso terminado. Los que no dejaron rastro quedan en la mira. Escribid. Y. el ranking no miente, qué cringe.',
  'Purga en preparación seria: el vacío de mensajes es el expediente. Y. el ranking no miente, cabrón y sin segunda oportunidad en este mensaje, da asco.',
  'El bot buscó mérito. No hubo. La lista de salida no es un borrador eterno. El grupo lo nota cada día, qué vergüenza.',
  'Historial mudo documentado: el kick es el siguiente campo del formulario. El grupo lo nota cada día, patético.',
  'Escribid algo que el bot pueda usar como defensa. Si no, la purga no discute. El grupo lo nota cada día, ridículo.',
  'Purga: higiene, no odio. El historial vacío no distingue intenciones. Y. el ranking no miente, basura.',
  'Lista de nicks sin obra: el bot la tiene. Un mensaje puede borrar una línea. El grupo lo nota cada día, desperdicio, basura.',
  'El silencio os puso en la lista. El bot solo está pasando lista. Y. el ranking no miente, asco delante de todo el hilo sin posibilidad de borrado, ridículo.',
  'Historial repasado sin hallazgo útil: la permanencia no se regala. Y. el ranking no miente, cutre con el ranking como único testigo del veredicto, fracasado.'
]

const UMBRAL_INACTIVO = 10;

// Remate del mensaje. La cabecera rota entre las frases de AVISO_PURGA, pero la
// amenaza tiene que aparecer SIEMPRE y en el mismo sitio: si dependiera del
// azar, la mitad de las veces la lista se leeria como un ranking cualquiera.
let AMENAZAS = [
  'Escribid algo o el bot os expulsa. Y lo peor no va a ser irse: va a ser que nadie pregunte por vosotros. Joder, fracasado.',
  'Silencio de más: el bot está contando. Cuando llegue a cero, fuera sin funeral. El grupo lo ve entero y no hace falta replay, qué miseria.',
  'Escribid o desapareced del grupo. Nadie va a montar un hilo de despedida. El grupo lo ve entero y no hace falta replay, da grima.',
  'El bot no negocia el silencio eterno: o hay mensajes o hay expulsión. El grupo lo ve entero y no hace falta replay, basura.',
  'Inactivos: el reloj corre. Cuando suene, fuera. El grupo no es un museo de nicks mudos. El grupo lo ve entero y no hace falta replay, qué cutre.',
  'Escribid algo con sentido o el bot os limpia. La nostalgia no salva el puesto. El grupo lo ve entero y no hace falta replay, patético.',
  'El silencio os delata. El bot solo ejecuta lo que el ranking de inactivos ya decidió. El grupo lo ve entero y no hace falta replay, ridículo.',
  'O participáis o salís. El medio no existe en la política de este bot. El grupo lo ve entero y no hace falta replay, basura.',
  'Inactividad prolongada: el bot prepara la lista. Escribid si queréis borrar vuestro nombre de ella. Desperdicio, ridículo.',
  'El grupo no guarda sillón a quien no escribe. El bot es el encargado de cobrar el peaje. El grupo lo ve entero y no hace falta replay, asco, da pena ajena.',
  'Escribid o adiós. Sin drama, sin hilo de \\\\\\\\\\\\\'qué pasó con\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', solo la salida con la cara del resultado a la vista en el parte que nadie borra, qué vacío.',
  'Silencio = candidato a purga. El bot no hace excepciones por cara bonita y el sistema marca el punto final, indignante.',
  'O hay mensajes o hay expulsión. La política es corta a propósito con el saldo a la intemperie en el recuento que no perdona, qué flojo.',
  'Inactivos del ranking: el bot os está mirando. Escribid antes de que escriba él el kick y el sistema cierra sin discusión, menudo desastre.',
  'El chat no es un archivo de nicks quietos. Escribid o el bot limpia y el archivo no admite recurso sin cuento que lo tape, qué pena.',
  'Silencio de sobra: la lista de purga se alimenta sola. Aportad mensaje o aportad hueco con el dígito firmando solo, patético.',
  'Escribid algo. El bot no acepta la excusa del \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\'estoy leyendo\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\' eterno con el fail todavía caliente, asco, da vergüenza.',
  'Inactividad visible: el bot la traduce a expulsión cuando toca. Escribid si no queréis tocar. Gilipollas, qué vergüenza ajena.',
  'O participáis en el hilo o salís del grupo. El bot no mantiene zombies sin prosa que lo maquille sin recurso ni nota al pie, ridículo.',
  'El reloj de los inactivos corre en silencio. Cuando llegue a cero, el kick no pide opinión y el historial no olvida, fracasado.',
  'Escribid o el bot os saca. Nadie va a votar en contra del vacío que dejáis con testigos obligados en el hilo, qué nivel de pena.',
  'Silencio prolongado: sois candidatos oficiales. El mensaje de hoy puede borraros de la lista. Desperdicio, patético.',
  'El bot limpia inactivos. Escribid si vuestro nick merece quedarse sin segunda lectura que lo arregle, miserable.',
  'O hay rastro de mensajes o hay salida. La política no tiene letra pequeña de consuelo con el parte firmado debajo, qué cringe.',
  'Inactivos: el grupo no os echa de menos hasta que el bot os echa del todo delante del marcador en vivo, da asco.',
  'Escribid antes de que el bot escriba el parte de expulsión con vuestro nombre con el veredicto seco del bot, patético.',
  'Silencio = señal. El bot la interpreta como baja voluntaria diferida con el número hablando solo y el chat archiva sin debate, asco, qué vergüenza.',
  'O aparecéis en el hilo o desaparecéis del grupo. Sin términos medios útiles en el idioma seco del ranking, basura.',
  'El ranking de inactivos no es decoración: es la lista previa al kick en la foto fija del ranking con el peaje cobrado al natural, ridículo.',
  'Escribid algo real. El bot no salva a quien solo lee y nunca deja rastro y el grupo ya pasó de página, fracasado.',
  'Inactividad de lujo: el bot la convierte en expulsión sin cargo de conciencia y el hilo no pide amplificación, ridículo.',
  'O participáis o el bot os limpia. El resto del grupo seguirá el hilo igual sin modo avión ni silencio cómplice, fracasado.',
  'Silencio de más días: el bot os tiene fichados. Escribid si queréis desficharos en la foto fija del ranking, qué miseria.',
  'El grupo no es un hotel de nicks apagados. Escribid o fuera sin cuento que lo tape sin que nadie pida replay, da grima.',
  'Escribid. El bot no ofrece segunda residencia a los mudos crónicos sin cuento que lo tape y el sistema cierra sin discusión, basura.',
  'Inactivos en la mira: la purga no es amenaza vacía, es procedimiento en el momento que más dolía soltarlo, patético.',
  'O dejáis mensaje o dejáis el grupo. El bot ejecuta la o sin dramatizar sin suavizar el golpe del número, asco, qué cutre.',
  'Silencio prolongado documentado: el kick es la continuación natural y el veredicto no se negocia sin letra pequeña que lo salve, basura.',
  'Escribid algo o el bot asume que no pintáis nada aquí y actúa en consecuencia en el recuento que no perdona, ridículo.',
  'El reloj no para para los inactivos. Cuando suene, fuera. Escribid si queréis pararlo y el sistema no regala puntos, fracasado.',
  'O hay actividad o hay expulsión. Esta frase es el aviso, no el debate con el peaje cobrado al natural, da pena ajena.',
  'Inactivos: el bot ya tiene la lista. Un mensaje vuestro puede rayar el nombre y el sistema no regala puntos, qué vacío.',
  'Escribid antes de que el silencio se convierta en el parte de baja con el dígito firmando solo con el veredicto seco del bot, indignante.',
  'Silencio = candidatura a la salida. El bot no hace campañas de retención sin derecho a matiz útil con testigos obligados en el hilo, qué flojo.',
  'O participáis en el chat o el bot os devuelve a la intimidad del exterior con la firma legible del comando, menudo desastre.',
  'El grupo sigue sin vosotros si no escribís. El bot solo adelanta lo inevitable delante del marcador en vivo, patético.',
  'Escribid. La purga no lee la mente: lee el historial vacío sin letra pequeña que lo salve sin que nadie pida replay, asco, qué pena.',
  'Inactividad visible: el bot la traduce a kick cuando el contador llega al límite con el número en la frente del mensaje, basura.',
  'O dejáis huella en el hilo o dejáis el grupo. Política corta, efecto largo y el sistema cierra sin discusión, ridículo.',
  'Silencio de sobra: escribid o aceptad que el bot os limpie sin funeral en la foto fija del ranking sin segunda oportunidad hoy, fracasado.'
]


async function cmdInactivos(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }
  if (!groupMeta?.participants?.length) {
    return sock.sendMessage(jid, {
      text: 'No pude leer la lista de miembros del grupo ahora mismo. Probá de nuevo en un momento, da vergüenza.',
    }, { quoted: msg });
  }

  // Dos fuentes que hay que cruzar:
  //  · el contador sabe cuantos mensajes tiene cada uno QUE HAYA ESCRITO;
  //  · a los de cero mensajes el contador ni los conoce, asi que salen de la
  //    lista de participantes restando a todo el que aparezca en el contador.
  //
  // Se guardan TODAS las formas conocidas de cada uno (id, lid, telefono)
  // porque el conteo pudo anotarse bajo una y el participante figurar con otra.
  // El indice apunta cada forma a la ENTRADA del contador, no a su numero. Antes
  // guardaba el numero y luego se tomaba el maximo entre las formas, y eso
  // infravaloraba a quien tiene el conteo partido en dos entradas (por ejemplo
  // 6 bajo su @lid y 7 bajo su telefono, porque el par LID<->telefono no se
  // conocia cuando se anotaron): la cuenta real son 13 y salia como 7, o sea
  // marcado de inactivo sin serlo. Guardando la entrada se pueden sumar las
  // distintas SIN contar dos veces la misma cuando dos formas apuntan a ella.
  const contados = await getActiveUsers(jid, 1);
  const entradaPorForma = new Map();
  for (const u of contados) {
    for (const f of [bareJid(u.jid), canonicalJid(u.jid)]) {
      if (!entradaPorForma.has(f)) entradaPorForma.set(f, u);
    }
  }

  const flojos = [];
  for (const p of groupMeta.participants) {
    const formas = [p?.id, p?.lid, p?.phoneNumber].filter(Boolean);
    if (!formas.length) continue;
    // Ni el bot ni el owner tier salen en la lista.
    if (isBotJid(sock, p.id)) continue;
    if (isOwner(p.id, false, groupMeta) || isMainOwner(p.id, false, groupMeta)) continue;

    // Se reunen las entradas distintas que casan con alguna de sus formas y se
    // suman una sola vez cada una.
    const suyas = new Set();
    for (const f of formas) {
      for (const forma of [bareJid(f), canonicalJid(f)]) {
        const e = entradaPorForma.get(forma);
        if (e) suyas.add(e);
      }
    }
    let n = 0;
    for (const e of suyas) n += e.count;
    // "entre 0 y 10" incluye el 10: quien lleva justo diez esta igual de
    // ausente que quien lleva nueve, y dejarlo fuera por uno era un corte que no
    // significaba nada.
    if (n <= UMBRAL_INACTIVO) flojos.push({ jid: p.id, count: n });
  }

  if (!flojos.length) {
    return sock.sendMessage(jid, {
      text: `Todo el mundo pasa de ${UMBRAL_INACTIVO} mensajes. Hoy no hay a quien echar.`,
    }, { quoted: msg });
  }

  // Los mas callados primero: son los que primero se van.
  flojos.sort((a, b) => a.count - b.count);

  // UN SOLO MENSAJE. Trocearlo en tandas quedaba fatal: el grupo recibía tres
  // mensajes seguidos del bot y la broma se diluía en el tercero.
  //
  // Y aun así los notifica a TODOS, incluso a los que no caben en el texto: la
  // notificación de WhatsApp la dispara el array `mentions`, no el hecho de que
  // el @ aparezca escrito. Así que se listan los que quepan y se mencionan
  // todos. Al que no sale escrito le llega el aviso igual, que es lo que
  // importa — el que menos entra al grupo es justo el que no puede quedarse sin
  // enterarse.
  // LA AMENAZA VA ARRIBA, de título.
  //
  // Estaba al final, después de la lista de nombres, y ahí no la leía nadie: en
  // WhatsApp un mensaje largo llega plegado y lo único que se ve sin desplegarlo
  // son las primeras líneas. El aviso de expulsión — que es el motivo entero del
  // comando — quedaba justo en la parte que hay que pulsar para leer.
  //
  // Ahora es lo primero que se ve, en negrita y solo. El recuento pasa a ser una
  // línea de contexto debajo, que es lo que es.
  const cuantos = flojos.length === 1 ? '1 miembro' : `${flojos.length} miembros`;
  const cabecera =
    `*${pickFresh(AMENAZAS, `${jid}|inactivos|amenaza`)}*\n` +
    `╾━━━━━━━━━━━━━━╼\n` +
    `_${cuantos} con ${UMBRAL_INACTIVO} mensajes o menos:_\n\n`;
  const amenaza = `\n\n_${pickFresh(AVISO_PURGA, `${jid}|inactivos`)}_`;

  // Se van metiendo nombres mientras el mensaje quepa holgado en uno de
  // WhatsApp (el límite real ronda los 4096; se deja margen para la cabecera,
  // la amenaza y los emojis que meta el cliente).
  const TOPE_TEXTO = 3200;
  const lineas = [];
  let usado = cabecera.length + amenaza.length;
  for (const u of flojos) {
    const linea = `@${u.jid.split('@')[0]} — ${u.count === 1 ? '1 mensaje' : `${u.count} mensajes`}`;
    if (usado + linea.length + 1 > TOPE_TEXTO) break;
    lineas.push(linea);
    usado += linea.length + 1;
  }
  const sobran = flojos.length - lineas.length;

  const text = cabecera + lineas.join('\n') +
    (sobran ? `\n_y ${sobran} más, que también acaban de recibir la notificación._` : '') +
    amenaza;

  await sock.sendMessage(jid, { text, mentions: flojos.map(u => u.jid) }, { quoted: msg });
}


// El bot abre con lo mas fuerte que tiene: los pools de insultos se ordenan
// de mas duro a mas suave UNA vez, al cargar, y pickFresh sesga la eleccion
// hacia la cabecera. Los pools neutros (cabeceras, cierres) no se tocan:
// ahi la "dureza" no significa nada.

module.exports = { cmdVs, cmdFantasmas, cmdInactivos };
