const { getActiveUsers } = require('../utils/messageCounter');
const { isOwner, isMainOwner, getSender, sameUser, soloMiembros, bareJid, canonicalJid, isBotJid } = require('../utils/wa');
const { shuffle, pickFresh, ordenarPorDureza } = require('../utils/helpers');

// ---- !vs : real-activity head-to-head -------------------------------------

// %W = winner tag, %L = loser tag. Filled in per call.
let VS_ROASTS = [
  '%W habla, %L observa en silencio como el mueble con datos móviles que es. Hasta el sofá del grupo aporta más, perdedor.',
  '%W le saca tantos mensajes a %L que da vergüenza ajena. %L entra, mira como el puto parásito que es y se larga sin soltar ni una mierda. Cero aporte, cero valor.',
  '%L aporta al grupo lo mismo que un pedo en una tormenta: nada, cero, una puta mierda que nadie nota. %W habla; %L es relleno inútil que solo ocupa hueco.',
  'Para %L participar es deporte de riesgo. %W ni se despeina aplastando a alguien que teclea una vez por estación del año.',
  '%L existe en este grupo en modo solo lectura, su hábitat natural. %W lo barre sin enterarse siquiera de que competía.',
  '%W juega en otra liga. %L ni se clasificó, porque para clasificarte hay que presentarse, y eso a %L le da una pereza mortal.',
  '%L aporta al chat lo mismo que un mensaje borrado: ves que estuvo, pero no sabes para qué. %W manda, fantasma.',
  'Si %L hablara la mitad que %W esto estaría reñido. Pero %L se guarda sus mensajes como si valieran algo. Spoiler: no valen una puta mierda, igual que él.',
  '%L, fantasma confirmado. %W, con pulso. Esto no es un duelo: es %W reventando a un muerto de mierda que ni sabe que existe este grupo.',
  'Esto no fue un duelo, fue una autopsia: %L lleva muerto meses y %W lo remató por gusto. Cadáver mudo e inútil contra alguien vivo, sin color.',
  '%L trajo a un duelo de mensajes el mismo silencio que trae a todas partes. %W ni necesitó calentar para ganar.',
  'Mientras %W llenaba el chat, %L hacía lo único que sabe: nada de nada. El puto rey de no servir para una mierda, campeón indiscutible del vacío.',
  '%L perdió por goleada y encima sin presentarse al campo. El walkover andante, rey de perder partidos que ni juega.',
  '%W escribe; %L solo calienta el asiento. El mueble más caro del grupo: ocupa sitio y no presta ningún servicio, perdedor.',
  'A %L le falta voz y le sobra ser un puto lastre. %W aporta; %L es peso muerto que solo ocupa hueco en la lista. Ni hubo que pensarlo, basura.',
  'Comparar a %W con %L es comparar a alguien con una mancha en la pared: uno aporta, el otro solo está ahí pudriéndose, mudo e inútil de mierda.',
  '%L se mide con %W y sale corriendo de vuelta a su modo lectura, su zona de confort y su único hábitat natural conocido.',
  '%W habla por los dos porque %L lleva años sin soltar ni una puta palabra útil. Se lo guarda todo para nada, como el inútil de mierda que es.',
  '%L compite en silencio absoluto porque no tiene una puta cosa que decir. %W ya había ganado antes de empezar: reventar a un cero a la izquierda no tiene mérito.',
  'Si %L escribiera tanto como respira seguiría perdiendo contra %W. Pero ni respira fuerte, no vaya a gastarse de más.',
  '%W tiene presencia; %L lleva años en modo avión porque no vale una mierda ni encendido. Uno aporta, el otro es un ladrillo mudo que ocupa sitio.',
  '%L es relleno de mierda, el hueco vacío que nadie echa de menos. %W aporta; %L sobra tanto que el grupo ni notaría si lo echan de una patada, fantasma.',
  'Que %L ni lo intente. %W lo barre sin despeinarse, y eso que barrer implica mover algo, cosa que a %L le resulta exótica.',
  '%W aporta vida al chat; %L aporta el vacío educado del que entra, lee y se va sin decir ni hola. Diferencia abismal.',
  '%L quedó tan atrás que %W ya ni lo ve por el retrovisor. Polvo en el camino, y del que no se levanta ni con ventilador.',
  'Hasta el bot escribe más que %L, y el bot solo responde a comandos. %W lo sabía; %L sigue sin enterarse de nada, mudo.',
  '%W demostró quién manda. %L que se calle y siga de adorno inútil, que es lo único que ha hecho este muerto de mierda desde que entró.',
  '%L tiene el récord de leer doscientos mensajes y no soltar ni uno. %W habla y aporta; %L mira, calla y se guarda todo.',
  'El marcador entre %W y %L parece una errata. No lo es: es lo que pasa cuando uno vive aquí y el otro viene de turista.',
  '%W lleva el peso de la conversación; %L es el peso muerto que nadie quiere cargar. Un puto lastre que no ha aportado una mierda en su vida, perdedor.',
  '%L escribe una vez cada muerte de obispo y encima suelta una mierda que nadie pidió. %W aporta a diario; %L solo estorba las pocas veces que aparece.',
  '%W manda y %L asiente en silencio, su forma favorita de participar sin mojarse. Cobardía conversacional de manual.',
  'En este duelo %W puso los mensajes y %L puso su habitual nada de mierda. Cada uno aportó lo que tenía; lo de %L, como siempre, un cero absoluto, inútil.',
  '%W gana y %L ni protesta, porque protestar también es hablar, y eso a %L lo supera. Derrota muda, la más patética de todas.',
  '%W escribe, aporta y se le nota vivo. %L lleva tanto en silencio que el grupo ya no sabe si es un miembro o un error de la lista que nadie se molesta en corregir. Adivina cuál pierde, fantasma.',
  'Esto no es un duelo, es una limosna: %W le regala a %L la única aparición que va a tener en meses. Aprovéchala, campeón del silencio, que la próxima vez ni te nombran para perder.',
  '%L trajo su arma secreta al duelo: no hacer absolutamente nada, como siempre. %W lo barrió sin despeinarse mientras %L seguía decidiendo si valía la pena teclear. No valía. Nunca vale, perdedor.',
  '%W tiene voz en el grupo; %L tiene un asiento que igual da si está ocupado o vacío. El marcador solo puso números a algo que todos sabían: uno cuenta, el otro sobra. Y sobra %L, obviamente.',
  'Entre %W y %L la diferencia no es de mensajes, es de existencia. %W está; %L figura. Uno participa, el otro rellena la foto de grupo con cara de no haber dicho nada memorable jamás. Muerto en vida, %L.',
  '%L compite contra %W como una mierda seca compite contra alguien vivo. Ni aporta, ni sirve, ni hay razón para mirarlo. %W ni sabía que había duelo hasta que vio el nombre de este puto inútil pidiendo un protagonismo que no se ha ganado en su vida.',
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
  'Lleva tanto sin escribir que el grupo lo da por desaparecido en combate. Pero no hubo combate: nunca llegó a aparecer.',
  'Modo solo lectura desde que entró. Un suscriptor que ve el contenido gratis y jamás deja ni un mísero me gusta, parásito.',
  'Entra, lee, espía y se larga sin dejar huella. El fantasma oficial del grupo, con el agravante de que los fantasmas al menos asustan.',
  'Escribe una vez al mes y se queda tan ancho, el muy inútil. Suelta una mierda cada treinta días y se cree que aporta. No aporta nada, puto parásito mudo.',
  'Su última palabra útil está tan enterrada que ni con una pala la encuentras. Lleva siglos sin soltar una mierda que valga la pena, puto fantasma.',
  'Está aquí solo para enterarse de los chismes, como la vecina de la cortina pero sin su encanto. Mira mucho, aporta exactamente cero.',
  'El típico que reacciona con un emoji pero nunca escribe. Le da al corazoncito y huye, como si teclear le cobrara peaje, cobarde.',
  'Más callado que un muerto y con la misma utilidad. Lleva tanto sin abrir la boca que el grupo ya ni recuerda para qué mierda está aquí, cero a la izquierda.',
  'Tiene el grupo en silencio absoluto. Ocupa una plaza que cualquiera con algo que decir aprovecharía mil veces mejor que él.',
  'Participa lo mismo que un electrodoméstico apagado: está enchufado, ocupa sitio y no hace absolutamente nada de utilidad.',
  'Si no fuera por la lista de miembros, nadie sabría que este inútil existe. Sobra tanto que si lo borran mañana no cambia una puta mierda para nadie.',
  'Leyó este mismo mensaje y ni de coña va a contestar. Es un puto inútil predecible: entra, lee, no aporta una mierda y se larga como siempre, fantasma.',
  'El grupo funcionaría idéntico sin él, y eso es lo más triste: es la persona que no notas que se fue hasta pasado un mes entero.',
  'Lurker con doctorado. Lleva años mirando cómo otros hablan y tomando apuntes que jamás va a usar. Espectador profesional, perdedor.',
  'Habla menos que una pared y sirve todavía menos. No aguanta ni dos líneas de conversación sin rajarse y esconderse. Puto inútil sin nada que decir.',
  'Está en el grupo como un mueble viejo: no sirve, no aporta y nadie lo tira por pura pereza. Chupa del chat y no devuelve ni una mierda, puto parásito.',
  'Su teclado debe estar nuevo de fábrica. Lo único que ejercita es el pulgar de bajar y bajar para cotillear sin soltar prenda.',
  'Entra solo para ver quién habló de él y vuelve a su agujero. Vigilante nocturno del grupo, turno permanente de mirar y callar.',
  'El miembro más decorativo del grupo. Un jarrón: queda bien en la lista, completamente inútil para la conversación, don nadie.',
  'Aporta lo mismo que un "este mensaje fue eliminado": ves que pasó algo, pero nada que mereciera la pena leer. Fantasma sin sustancia.',
  'Vive en visto. Del grupo y, sospecho, de unas cuantas cosas más. Campeón de dejar a todos esperando una respuesta que no llega.',
  'Si aportar diera puntos, este muerto de hambre estaría en la puta ruina. El más inútil del grupo en lo único que vale aquí: abrir la boca y decir algo.',
  'El grupo es su Netflix: lo abre, consume lo que otros se curran y nunca deja reseña. Parásito de entretenimiento ajeno, fantasma.',
  'Lleva semanas mirando como un puto pasmarote y ni se inmuta. Le importa todo una mierda y no aporta una mierda. Al menos es coherente en su inutilidad.',
  'Más ausente que presente aunque la app lo marque en línea. Estar conectado sin aportar: la forma moderna de no estar, perdedor.',
  'Su única personalidad es no servir para nada. Pregúntale al grupo quién es y nadie sabrá decir más que "ese inútil que nunca suelta una puta palabra".',
  'Participación nivel estatua de plaza: ahí plantado, cagado por las palomas del olvido, sin moverse ni para apartarse, inútil.',
  'El grupo le da igual hasta que huele drama; ahí sale del agujero, husmea y se vuelve a meter. Carroñero de polémicas ajenas.',
  'Escribe con cuentagotas y siempre lo que nadie pidió. Cuando aparece, estorba; cuando calla, sobra. Versatilidad para lo malo.',
  'Tan inútil que su nombre ya ni suena. "¿Ese muerto sigue aquí?", pregunta el grupo. Sí, sigue: mudo, sobrando y sin aportar una puta mierda, como siempre.',
  'Cuerpo presente, cerebro ausente y aporte nulo. Chupa del grupo como el cuñado gorrón: se sienta, come de lo que otros ponen y no suelta ni una puta palabra.',
  'Reacciona a los memes pero jamás hace uno. Consumidor crónico, productor cero. La balanza más desequilibrada del grupo entero.',
  'El típico que suelta un "jajaja" de mierda y desaparece otra semana. Esa risa patética es todo lo que este inútil ha aportado en su puta vida.',
  'Más inútil que un cargador sin cable. Lo buscas cuando hace falta y, sorpresa, el muy fantasma no está ni aporta una puta mierda. Nunca sirve para nada.',
  'Su actividad es tan patética que dudo que sepa que el grupo existe. Este puto inútil lleva meses sin soltar una mierda y encima se queda tan ancho.',
  'Entra, cotillea el último mensaje y se larga sin soltar una mierda. Parásito de manual: consume lo que otros escriben y no devuelve ni las gracias, inútil.',
  'Aporta al grupo lo que una piedra a una conversación: nada, cero, una puta mierda. Ocupa sitio, no dice ni mu y encima se cree parte del grupo. No lo eres, fantasma.',
  'Lleva tanto en silencio que ya nadie le espera respuesta. Es el "te leo luego" hecho persona, y el "luego" no llega jamás, perdedor.',
  'Participación de relleno puro: está por estar, como las fotos de stock. Sonríe en la lista y no sirve para nada concreto, fantasma.',
  'Tan inútil que se le ha olvidado que el móvil también sirve para escribir. Lo usa solo para espiar al grupo como el puto mirón que es, sin soltar una mierda.',
  'Mira la conversación pasar como quien ve llover desde la ventana: cómodo, seco y sin la menor intención de mojarse jamás, cobarde.',
  'Su récord personal es leer doscientos mensajes sin responder ni uno. Maratón olímpico de la pasividad, medalla de oro garantizada.',
  'El inútil que todos olvidan que existe hasta que sale en esta lista de mierda. Su único momento de gloria es que le recuerden lo poco que vale. Enhorabuena, fantasma.',
  'Activo solo en sueños, porque despierto no suelta ni una puta palabra. Todo el día leyendo lo que otros curran y devolviendo una mierda pinchada en un palo.',
  'Tan poco activo que el contador casi lo da de baja por inactividad biológica. Le tomamos el pulso al grupo y él no aparecía, fantasma.',
  'Vive de leer lo que otros se curran escribir. Chupa el esfuerzo ajeno como una factura sorpresa: aparece, te resta y no da nada.',
  'Su silencio no es misterio ni timidez, es vagancia con wifi. Tiene todo para hablar y elige, día tras día, no gastar saliva digital.',
  'Aparece solo cuando hay bronca, husmea y se evapora. El resto del año es un nombre en la lista esperando el próximo cotilleo jugoso.',
  'Lo lee todo como un puto cotilla y no suelta ni una palabra. Se lo traga todo gratis y no devuelve una mierda. Parásito con derecho a asiento y nada más.',
  'Está en el grupo como el polvo en un mueble: presente, acumulándose y solo visible cuando alguien pasa el dedo. Justo lo que hago ahora.',
  'Lleva tanto sin escribir que si mañana desaparece, el grupo tardaría semanas en notarlo y ninguna de esas semanas cambiaría nada. Existe en modo borrador: empezado, nunca publicado, olvidado en un rincón.',
  'El fantasma que reacciona con un emoji una vez al mes y se cree participativo. Consume el trabajo de todos, no devuelve ni una frase y encima duerme tranquilo. Parásito con wifi y sin la menor vergüenza.',
  'Tiene el grupo abierto solo para husmear quién habló de él. Nunca fue nadie, nunca dijo nada, y aun así vigila por si acaso su irrelevancia sale mencionada. Spoiler: sale, y es aún peor de lo que teme.',
  'Su aportación al grupo es una puta mierda del tamaño de la nada. Cuerpo presente, contenido cero: como el gorrón que se cuela en la fiesta, come de todo, no dice ni mu y se va sin que nadie recuerde que ese inútil vino.',
  'Escribe con la frecuencia de un cometa y con la mitad del interés. Cuando por fin suelta algo, el grupo ya se había acostumbrado a su ausencia y preferiría que siguiera así. Vuelve a tu agujero, fantasma.',
  'El miembro más decorativo del chat: ocupa plaza, no da servicio y solo aparece en la lista para inflar el número. Un cero con foto de perfil. Si el grupo fuera un cuerpo, sería el apéndice: inútil y silencioso.',
  'Lleva de espectador tanto tiempo que ya forma parte del mobiliario. Nadie le pregunta nada porque nadie espera respuesta, y él lo prefiere así: participar le exigiría demostrar que tiene algo dentro. No lo tiene.',
  'Su teclado es de adorno y su presencia también. Lee doscientos mensajes, no suelta ni uno y se va convencido de que estar callado lo hace interesante. Solo lo hace invisible, que en tu caso es lo mismo, perdedor.',
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
  'El bot ha repasado vuestro historial buscando algo que salvar. Un chiste malo, un audio, una opinión de mierda, lo que fuera. No hay nada. Sois una foto de perfil con conexión a internet.',
  'Diez mensajes. Hay gente en este grupo que ha escrito más que eso discutiendo dónde pedir la cena. Vosotros lleváis meses sin aportar ni el nombre del restaurante.',
  'Si mañana desaparecéis, el grupo tardaría tres semanas en darse cuenta, y sería por esta lista. Ese es exactamente vuestro peso aquí: el de un mueble que nadie mueve.',
  'El bot ha buscado vuestra mejor intervención del año para citarla aquí. Sigue buscando. Va a seguir un buen rato, y cuando termine no va a encontrar nada.',
  'Estáis en el grupo igual que está el extintor en la pared: alguien os puso ahí un día, nadie os mira, y en el fondo todos esperan no tener que usaros nunca.',
  'Menos de diez mensajes. No sois callados: los callados escuchan. Vosotros sois ausentes con la aplicación abierta, que es otra cosa y bastante más triste.',
  'He mirado si al menos reaccionabais a los mensajes de otros, por darle una oportunidad a la duda. Ni eso. También sois inútiles en silencio, que tiene mérito.',
  'El grupo funcionaría exactamente igual si en vuestro sitio hubiera una piedra. La diferencia es que la piedra no ocuparía plaza en la lista de miembros ni haría como que participa.',
  'Sois el relleno. Lo que se pone para que el número de miembros parezca grande y el grupo dé la impresión de estar vivo. Un decorado con número de teléfono.',
  'Diez mensajes en todo este tiempo. Mi contador se revisó a sí mismo pensando que estaba roto. No lo estaba. Erais vosotros, funcionando exactamente como siempre.',
  'Aquí hay gente que discute, gente que hace reír y gente que aporta. Y luego estáis vosotros, que habéis convertido no decir nada en una carrera de fondo.',
  'El bot ha calculado vuestra relevancia en el grupo y le ha salido división por cero. No es un error de cálculo: es que no hay nada por lo que dividir.',
  'Vuestra huella aquí es la misma que deja el aire en una habitación: técnicamente está, nadie lo nota, y si falta tampoco pasa gran cosa hasta que es demasiado tarde.',
  'Estáis suscritos al grupo, no dentro de él. Como el que paga el gimnasio en enero, se saca la foto con la tarjeta y no vuelve a pisarlo hasta el enero siguiente.',
  'Menos de diez mensajes. Un bot de spam habría aportado más conversación, y encima habría dicho algo interesante sobre criptomonedas.',
  'Sois esa gente que abre el grupo, lee doscientos mensajes, se ríe por dentro y se va sin escribir. Por dentro no cuenta. Por dentro no lo ve nadie.',
  'He contado vuestros mensajes tres veces por si me equivocaba. Me equivocaba: eran menos. Y aun así seguís aquí, ocupando un sitio con la naturalidad de quien no sabe que sobra.',
  'El grupo tiene miembros y tiene atrezzo. Los miembros hablan. El atrezzo está ahí para que la escena no parezca vacía. Adivinad de qué lado os ha puesto el contador.',
  'Diez mensajes. Ni un buenos días, ni un jaja suelto, ni un audio de treinta segundos que nadie iba a escuchar. Nada. Y la plaza sigue siendo vuestra, de momento.',
  'Sois los únicos capaces de estar en un grupo de amigos durante meses y no tener un solo amigo dentro. Eso no se consigue por accidente: hay que esforzarse.',
  'El bot no os echa por caeros mal. Os echa porque el contador dice que no estáis, y el contador nunca ha tenido opiniones sobre nadie. Solo cuenta, y de vosotros no tiene nada que contar.',
  'Vuestro historial completo se lee en menos tiempo del que tardáis en no contestar a un mensaje directo. Y encima se lee rápido porque no hay nada que entender.',
  'Hay quien no habla porque no tiene nada que decir. Vosotros habéis cogido eso y lo habéis convertido en un proyecto de vida, con constancia y todo.',
  'Menos de diez mensajes y aun así abrís el grupo todos los días. Eso ya no es timidez. Eso es mirar por la ventana de una fiesta a la que os invitaron.',
  'He preguntado al grupo si alguien os echaría de menos. Nadie ha contestado. Curiosamente, con el mismo silencio que usáis vosotros. Debe ser contagioso.',
  'Vuestra participación entera cabe en un mensaje. Este, sin ir más lejos, ya es más largo que todo lo que habéis escrito desde que entrasteis.',
  'El bot reparte aura por escribir, que es la forma más fácil de ganar algo que existe en este grupo. Vosotros lleváis meses cobrando cero y ni siquiera os habéis quejado.',
  'Diez mensajes. Cualquiera de este grupo escribe eso esperando el ascensor, y encima uno de ellos sería gracioso, que es más de lo que se puede decir de vuestro historial completo.',
  'Si el grupo fuera una fiesta, vosotros seríais el abrigo de alguien encima de la cama: estáis en la casa, ocupáis sitio, y nadie os ha dirigido la palabra en toda la noche.',
  'El bot os ha metido en una lista. No es la del top. No es la de los graciosos. Es la otra, la que existe justo para vaciarse cada cierto tiempo.',
  'Menos de diez mensajes. La gente entra aquí a hablar con sus amigos; vosotros entráis a comprobar que siguen ahí, como quien mira si la nevera sigue enchufada.',
  'Llevo meses contando y vuestro montón sigue cabiendo en una mano, con dedos de sobra para señalaros mientras se lee esta lista en voz alta.',
  'Sois miembros del grupo en el mismo sentido en que un cartel es parte de la calle: estáis pegados ahí, nadie os quita, y nadie os lee tampoco.',
  'El bot ha buscado en vuestro historial una sola frase digna de captura de pantalla. Ha encontrado tres mensajes, y dos son "jaja". El tercero es un sticker.',
  'Diez mensajes y una foto de perfil. Ese es el balance completo de vuestro paso por aquí, y la foto la subisteis el día que entrasteis.',
  'Hay gente que aporta contenido, gente que aporta caos y gente que aporta al menos su presencia. Vosotros habéis descubierto una cuarta categoría y os la habéis quedado entera.',
  'Estáis por debajo del corte. No del corte de los graciosos ni del de los pesados: del corte de los que existen. Ese es el listón que no habéis pasado.',
  'El bot lleva meses esperando que digáis algo para poder meterse con vosotros. Se ha cansado de esperar y se va a meter igual, que para eso está esta lista.',
  'Menos de diez mensajes. Vuestro móvil recibe las notificaciones de este grupo, las silencia, y esa es toda la relación que tenéis con la gente de aquí.',
  'Sois la prueba de que se puede estar en un sitio sin llegar a estar nunca. Un mérito filosófico enorme y absolutamente inútil para todo lo demás.',
  'El grupo os aceptó, os dio sitio y esperó. El grupo ya no espera. El bot tampoco, y el bot es el que tiene el botón.',
  'Diez mensajes es lo que escribe alguien que ODIA este grupo y sigue aquí por compromiso. Vosotros ni a eso llegáis, que ya es un nivel de desapego difícil de alcanzar.',
  'He revisado si escribís en otros sitios y volvéis aquí a descansar. No lo sé y me da igual: lo que sé es que aquí no habéis dicho nada que valga la pena leer dos veces.',
  'Vuestra aportación al grupo es tan escasa que el bot ha tenido que crear una lista solo para poder nombraros. Antes de esto no había motivo para escribir vuestro nombre.',
  'Menos de diez mensajes. En el tiempo que lleváis aquí, alguien ha entrado, se ha hecho amigo de todos, ha discutido con la mitad y ha vuelto a caer bien. Vosotros seguís cargando.',
]

const UMBRAL_INACTIVO = 10;

// Remate del mensaje. La cabecera rota entre las frases de AVISO_PURGA, pero la
// amenaza tiene que aparecer SIEMPRE y en el mismo sitio: si dependiera del
// azar, la mitad de las veces la lista se leeria como un ranking cualquiera.
let AMENAZAS = [
  'Escribid algo o el bot os expulsa. Y lo peor no va a ser irse: va a ser que nadie pregunte dónde estáis.',
  'La próxima vez que el bot pase por aquí, esta lista estará vacía. O porque escribisteis, o porque os expulsó a todos. Las dos vacían igual.',
  'Tenéis los mensajes que tardéis en decidiros. Después os saca el bot, sin despedida, porque para despedirse hay que hablar.',
  'O empezáis a existir o el bot deja de contaros. Y lo que el bot no cuenta, el bot lo expulsa.',
  'El bot no avisa dos veces. Esto ya era el segundo aviso, y el tercero es la expulsión.',
  'Escribid hoy. Mañana esta misma lista es una orden de expulsión con vuestros nombres y nadie va a leerla dos veces.',
  'De esta lista se sale escribiendo o te expulsa el bot. No hay una tercera puerta y el bot no la está buscando.',
  'El bot va a limpiar. Podéis estar dentro cuando lo haga o podéis estar en la papelera con el resto del atrezzo.',
  'Cada día que pasa sin que escribáis es una firma más en vuestra propia expulsión, y ya lleváis el documento casi lleno.',
  'Lo grave no es que el bot os eche. Es que el grupo va a seguir exactamente igual de bien, y eso lo sabéis vosotros mejor que nadie.',
  'Escribid o fuera. Y si os echa, tampoco vais a escribir para quejaros, que ya nos conocemos.',
  'El bot ya tiene vuestros números en la lista de expulsión. Solo le falta pulsar, y no tiene ninguna prisa porque vosotros tampoco la habéis tenido nunca.',
  'Diez mensajes os separan de la expulsión. Diez. No es un examen, es un trámite, y aun así lo vais a suspender.',
  'El bot cuenta hacia atrás hasta expulsaros. Vosotros seguid exactamente como estáis, que así va mucho más rápido.',
  'Quedáis avisados: el bot expulsa solo, no pregunta y no guarda copia de nadie.',
  'Escribid algo. Lo que sea. Un punto. El bot acepta hasta un punto antes de sacaros, y ni eso habéis mandado.',
  'El grupo no os necesita y el bot ya lo sabe. Os va a expulsar, y la única prueba de que estuvisteis aquí va a ser esta lista.',
  'Esta lista se vacía de dos maneras: escribiendo o expulsados. Elegís vosotros, pero elegís hoy.',
  'El bot os saca sin ceremonia, sin mensaje y sin aviso. Igual que entrasteis, pero al revés y con menos gente mirando.',
  'El bot os expulsa cuando le dé la gana y no avisa antes. Podría estar haciéndolo mientras leéis esto.',
  'Escribid o el bot os borra del grupo. Y sinceramente, borrar algo que no estaba tampoco es un gran esfuerzo.',
  'Os quedan las horas que tarde el bot en aburrirse y expulsaros. Lleva meses aburrido, así que calculad.',
  'La expulsión no es un castigo, es una corrección: el bot solo va a poner la lista de miembros al día con la realidad.',
  'Escribid ya o el bot os echa, y el hueco que dejéis lo va a llenar cualquiera en una tarde. Eso es lo que asusta, no la expulsión.',
  'El bot no negocia ni hace excepciones: cuenta mensajes y expulsa. Los vuestros ya los ha contado todos.',
  'El bot tiene paciencia limitada y vosotros la habéis agotado. La siguiente ronda es de expulsiones.',
  'Escribid algo o preparaos para la notificación de expulsión. Que va a ser lo primero que leáis aquí en semanas.',
  'El bot limpia el grupo como se limpia un armario: lo que no se usa, se tira. Y vosotros lleváis meses sin uso.',
  'Última oportunidad antes de que el bot haga sitio. Y hace falta sitio, porque aquí sobra peso muerto.',
  'El grupo funciona sin vosotros y lo sabéis. El bot solo va a oficializar lo que ya es un hecho.',
  'Escribid o fuera. Y si fuera os parece injusto, recordad cuántos mensajes habéis mandado. Cero es cero.',
  'El bot va a hacer limpieza y vuestros nombres están en la lista. Salir de ella es tan fácil como escribir algo.',
  'Os va a expulsar un bot. No una persona, un bot. Que eso os diga cuánta importancia tiene vuestra presencia.',
  'Escribid, joder. Un mensaje. El que sea. El bot no pide calidad, pide existencia.',
  'La expulsión no duele. Lo que duele es que nadie note que os habéis ido.',
]


async function cmdInactivos(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }
  if (!groupMeta?.participants?.length) {
    return sock.sendMessage(jid, {
      text: 'No pude leer la lista de miembros del grupo ahora mismo. Probá de nuevo en un momento.',
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
VS_ROASTS = ordenarPorDureza(VS_ROASTS);
GHOST_ROASTS = ordenarPorDureza(GHOST_ROASTS);
AVISO_PURGA = ordenarPorDureza(AVISO_PURGA);
AMENAZAS = ordenarPorDureza(AMENAZAS);

module.exports = { cmdVs, cmdFantasmas, cmdInactivos };
