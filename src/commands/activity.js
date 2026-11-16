const { getActiveUsers } = require('../utils/messageCounter');
const { isOwner, isMainOwner, isGroupAdmin, isAdmin, isBotAdmin, getSender, sameUser, soloMiembros, bareJid, canonicalJid, isBotJid } = require('../utils/wa');
const { cobrar, textoSinSaldo } = require('../utils/auraCobro');
const { shuffle, pickFresh } = require('../utils/helpers');
const { A_TI_MISMO, SOLO_GRUPOS, SOLO_ADMINS } = require('../data/avisos');
const { aviso, avisoPermiso } = require('../utils/helpers');
const { aplicarParticipantes } = require('../utils/participantes');
const logger = require('../utils/logger');

// ---- !vs : real-activity head-to-head -------------------------------------

// %W = winner tag, %L = loser tag. Filled in per call.
// Dos pools, porque !vs sale igual si %L pierde por uno que por mil. Antes
// todas le llamaban fantasma, y eso a quien escribe cientos es castigar al que
// aporta (GUIA, «A quién pega el bot»). La paliza es para quien no llega ni a
// la mitad de los mensajes de %W; el resto es un duelo ajustado.
let VS_ROASTS = [
  '%W gana y %L ni protesta, porque protestar también es hablar, y eso a %L lo supera. Derrota muda, la más patética de todas.',
  '%W habla y %L mira, como en todo lo que hace %L en la vida: desde la esquina y sin tocar.', // ROCKSTAR
  '%L ha perdido de calle. Para competir con %W hay que abrir la boca de vez en cuando.',
  'Paliza. %W se pone encima del grupo y %L, como siempre, se queda debajo sin moverse.', // ROCKSTAR
  '%L, ponerte al lado de %W es una puta humillación, y te la has comido en público.',
  '%W escribe por los dos, y %L se deja hacer, como en sus mejores noches.', // ROCKSTAR
  'Ni de lejos. A este ritmo, %L no alcanza a %W ni en otra vida.',
  '%W gana por goleada. %L ha venido a mirar, que es lo más cerca que ha estado nunca de meter alguna.', // ROCKSTAR
  'Lo de %L contra %W ha sido un trámite. Y el trámite lo ha firmado %W.',
  '%L, te han comparado con %W y ya sabes por qué nadie lo hace nunca.',
  'El grupo tiene quien lo hace y quien lo mira: %W lo hace, y %L mira con la mano debajo de la mesa.', // ROCKSTAR
  '%W aporta y %L cotillea. Los números lo dicen sin maquillaje.',
  'Paliza histórica. %L ha perdido sin enterarse de que había partido.',
  '%L, para ganarle a %W primero hay que aparecer, y eso no va contigo.',
  '%W por delante y a mucha distancia. %L llega tarde, como a todo menos a acabar.', // ROCKSTAR
  '%W arranca las conversaciones y %L se las lee de gorra sin soltar ni un puto jaja.',
  '%W da la cara en cada tema. %L asoma, mira quién ha escrito y vuelve a esconderse como la rata que es.',
  'Duelo sin rival. %W lo da todo y %L finge, como finge otras cosas.', // ROCKSTAR
  '%L ha perdido por tanto que ni con lubricante entraba en la pelea.', // ROCKSTAR
  'Si esto fuera boxeo, a %L le habrían tirado la toalla en el primer asalto. %W ni sudó.',
];

let VS_AJUSTADO = [
  '%W gana por poco. %L ha perdido por un par de mensajes, y entre dos que sostienen el grupo eso es un empate con ganador.',
  'Duelo apretado. %W gana, y %L ha estado tan cerca que esto ya parecía un roce.', // ROCKSTAR
  '%W se lleva el cara a cara por la mínima. %L, ni con un día flojo se ha descolgado.',
  'Perder por tan poco jode, %L. Y a %W ganar por tan poco le deja con ganas de más, que es lo mejor que se le puede dejar a alguien.', // ROCKSTAR
  '%W por delante, con %L a un paso. Dos que sostienen el grupo, y uno un poco más.',
  'Ajustado. %W gana, pero %L le ha hecho sudar cada mensaje, y no de la manera aburrida.', // ROCKSTAR
  '%L pierde de un pelo contra %W. Tanta guerra para un margen tan corto: esto pide revancha.',
  'Foto finish. %W saca la nariz y %L se queda a nada. Así de pegados, alguien debería apagar la luz.', // ROCKSTAR
  '%W manda hoy por poco. %L tiene toda la noche para darle la vuelta, y ganas no le faltan.',
  'Por la mínima. %W gana, y %L le ha peleado cada puto mensaje hasta el final.',
  '%L, tan cerca de %W que se le oye la respiración en la nuca. Delante va %W, y no parece que le moleste.', // ROCKSTAR
  'Empate técnico con ganador. %W gana, y %L se queda con la revancha pendiente.',
  'Entre %W y %L hay tanta tensión que el grupo ya no sabe si esto es un duelo o unos preliminares. Gana %W, por poco.', // ROCKSTAR
  '%W gana sin margen para presumir y %L pierde sin dar un solo mensaje por perdido.',
  '%L ha dado guerra y ha perdido igual. Ojo, que %W lo va a recordar toda la semana.',
  'Cara a cara igualado. %W se lo lleva, y %L ya quiere darle la vuelta mañana. Darle la vuelta a %W, se entiende.', // ROCKSTAR
  '%W por delante, por poco. Con un par de mensajes más de %L, esto era otra historia.',
  'Ajustado. %W gana, y %L se lo traga con lo poco que ha faltado. Partidazo.',
  'Duelo de los buenos. %W gana y %L no queda mal, que es más de lo que se puede decir del resto del grupo.',
  '%W se lo lleva por un suspiro, y suspiros entre %W y %L ha habido muchos.', // ROCKSTAR
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
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const mentioned = ctx?.mentionedJid || [];
  const sender = getSender(msg);

  let a, b;
  if (mentioned.length >= 2) [a, b] = mentioned.slice(0, 2);
  else if (mentioned.length === 1) { a = sender; b = mentioned[0]; }
  // RESPONDER A UN MENSAJE CON *!vs* TAMBIEN VALE. El resto del bot resuelve el
  // objetivo con getTarget(), que acepta cita o mencion indistintamente; este
  // comando era el unico que solo miraba menciones, asi que responderle a
  // alguien contestaba "menciona a dos" con la persona citada delante.
  else if (ctx?.participant) { a = sender; b = ctx.participant; }
  else {
    return sock.sendMessage(jid, {
      text: 'Menciona a dos (*!vs @uno @otro*) o responde al mensaje de alguien con *!vs*.',
    }, { quoted: msg });
  }

  if (sameUser(a, b)) {
    return sock.sendMessage(jid, { text: aviso(A_TI_MISMO, jid, 'yo') }, { quoted: msg });
  }

  // Si el owner principal es uno de los dos, no se contesta. Igual que en
  // !count y !relevancia: una respuesta especial para él lo delata tanto como
  // enseñar la cifra, porque es la única comparación que el bot rechaza.
  if (isMainOwner(a, false, groupMeta) || isMainOwner(b, false, groupMeta)) return;

  // EL COBRO VA AQUI, NO EN EL DISPATCHER, y es el mismo motivo que en !count.
  // El cobro central corre ANTES del comando, asi que se cobraba y despues este
  // comando podia irse por tres puertas sin responder: sin menciones, contra uno
  // mismo, o —peor— contra el owner, donde el return es SILENCIOSO. Ahi el
  // usuario pagaba y no recibia ni un mensaje. El catch del handler solo
  // devuelve el aura si salta una excepcion, y un return no lo es.
  const pago = await cobrar(jid, sender, 'vs', { fromMe: msg.key.fromMe, groupMeta });
  if (!pago.ok) {
    return sock.sendMessage(jid, { text: textoSinSaldo('vs', pago, jid) }, { quoted: msg });
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
    verdict = 'Empate exacto. Ni uno se deja ganar ni el otro afloja.';
  } else {
    const winNum = ca > cb ? numA : numB;
    const loseNum = ca > cb ? numB : numA;
    const diff = Math.abs(ca - cb);
    const paliza = Math.min(ca, cb) * 2 < Math.max(ca, cb);
    const line = pickFresh(paliza ? VS_ROASTS : VS_AJUSTADO, `${jid}|vs|${paliza ? 'paliza' : 'ajustado'}`)
      .replace(/%W/g, `@${winNum}`).replace(/%L/g, `@${loseNum}`);
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
  'Se traga el chat entero y no escupe ni una puta coma. Lurker con doctorado y cero publicaciones.',
  'Su móvil no sabe ni que tiene teclado. Solo baja y baja el chat con una mano, y de la otra mejor no preguntar.', // ROCKSTAR
  'Aporta lo mismo que un "este mensaje fue eliminado": ves que pasó algo, pero nada que mereciera la pena leer. Fantasma sin sustancia.',
  'Vive en visto. Deja a todo el mundo a medias, en el chat y en todo lo demás.', // ROCKSTAR
  'El grupo es su Netflix: lo abre, consume lo que otros se curran y nunca deja reseña. Parásito de entretenimiento ajeno, fantasma.',
  'Ve los memes y jamás hace uno. Mira mucho y no participa: en el chat y en el porno, el mismo papel.', // ROCKSTAR
  'Lleva tanto en silencio que ya nadie le espera respuesta. Es un "te leo luego" con patas, y el "luego" no llega jamás.',
  'Entra, lee, se ríe por dentro y se larga. Ni un «buenas noches»: se corre la cortina y adiós.', // ROCKSTAR
  'Tiene la boca cosida desde que entró y los ojos pegados al chat. Cotilla de gorra, y sin dar ni las gracias.',
  'Si mañana se le cae el móvil al váter, el grupo no se entera ni en un mes, y su historial de búsqueda, por suerte, tampoco.', // ROCKSTAR
  'Su mayor aportación al grupo es subir el número de miembros. Un uno más, sin nada detrás.',
  'Nadie recuerda su último mensaje, ni su último polvo. Hay que subir mucho para encontrar cualquiera de los dos.', // ROCKSTAR
  'Se ríe con lo que escriben los demás y no pone nada de su parte, la rata.',
  'Aquí dentro no se le conoce ni la voz, ni la risa, ni un gemido, ni una puta opinión.', // ROCKSTAR
  'Aparece en la lista de miembros y en ningún otro sitio. Ni en una broma, ni en una bronca.',
  'Su cuenta de mensajes da vergüenza hasta leerla en voz alta.',
  'Viene al grupo como quien entra en un sex shop solo a mirar. Nunca compra, nunca saluda y sale con la cabeza baja.', // ROCKSTAR
  'Nadie le pregunta nada porque ya se sabe la respuesta: no va a contestar.',
  'Si dieran premio por no decir nada, ni subiría a recogerlo: lo suyo es mirar desde la última fila con la gabardina puesta.', // ROCKSTAR
  'Parásito de chat: vive de lo que escriben otros y no devuelve ni un «jaja».',
  'Mira todo desde la barrera y luego no sabe de qué va nada. Fantasma y encima sin enterarse.',
  'Si callarse fuera una estrategia, ya habría ganado algo. No ha ganado una mierda.',
  'Escribe tan de tarde en tarde como folla, y cuando pasa, se sorprende más que nadie.', // ROCKSTAR
  'Okupa de chat: tiene el culo en un hueco del grupo y la voz en ninguno.',
  'Ni un amigo ni un enemigo en todo el puto grupo. Ni para caer mal le da.',
  'El grupo podría montar una orgía en el chat y ni se enteraría. O se enteraría y no diría nada, que es peor.', // ROCKSTAR
  'Cero peso en el grupo. Si se va, la conversación ni pestañea.',
  'Consume memes, chismes y peleas como quien va a un bufé libre y no deja propina.',
  'Lo único que ha compartido con el grupo es su número de teléfono, y nadie lo ha usado para nada guarro, que ya es decir.', // ROCKSTAR
  'Si alguna vez dice algo, que sea para despedirse. Sería lo más útil que ha escrito.',
];

// !fantasmas — ranking de los que MENOS escriben (pero escriben). Antes se
// llamaba !inactivos; ese nombre pasó a un comando distinto, ver más abajo.
async function cmdFantasmas(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
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
    return sock.sendMessage(jid, { text: 'No hay suficientes datos de actividad todavía. Hablad más.' }, { quoted: msg });
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
  text += '_Hablad más o seguid en la lista de la vergüenza._';

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

// Remate de !inactivos: va en cursiva al final, debajo de la lista de nombres.
// Dos cosas que cumplen todas: atacan el VALOR SOCIAL de la persona en el
// grupo (no su físico ni su vida) y terminan en un remate. Sin remate no es un
// chiste, es una queja.
let AVISO_PURGA = [
  'El contador no encuentra nada que salvar: ni un chiste malo, ni una opinión de mierda, nada. Sois una foto de perfil con conexión a internet.',
  'Hay gente que ha escrito más que vosotros solo discutiendo dónde se cenaba. Vosotros ni os enterasteis de que había cena, ni de lo que pasó después del postre.', // ROCKSTAR
  'Si desaparecéis, el grupo se entera por esta lista, no porque os eche de menos. Ese es exactamente vuestro peso aquí: el de un mueble que nadie mueve.',
  'Diez mensajes o menos. Ni para un sexting de los cortos os llega lo que habéis escrito.', // ROCKSTAR
  'Estáis en el grupo igual que está el extintor en la pared: alguien os puso ahí un día, nadie os mira, y en el fondo todos esperan no tener que usaros nunca.',
  'Diez mensajes o menos. Sois de los que miran por la cerradura y nunca entran en la habitación.', // ROCKSTAR
  'El contador no da para más: diez mensajes o menos, que es lo que dura vuestra vida sexual, en minutos.', // ROCKSTAR
  'El grupo funcionaría exactamente igual si en vuestro sitio hubiera una piedra. La diferencia es que la piedra no ocuparía plaza en la lista de miembros ni haría como que participa.',
  'Sois el relleno que se pone para que el grupo parezca grande y vivo, un decorado con número de teléfono.',
  'Os han tenido que poner en una lista para encontraros. En el chat, vuestro nombre no ocupa sitio, ni en la cama de nadie.', // ROCKSTAR
  'Habéis apurado el puto silencio hasta el final. Os sacan con la boca cerrada y el grupo ni baja el volumen.',
  'Vuestra relevancia en el grupo, calculada dos veces por si acaso: cero. Vuestro atractivo ni hizo falta calcularlo.', // ROCKSTAR
  'Habéis pasado por el grupo sin que nadie os mencione ni para insultaros. Ni eso os habéis ganado.',
  'Estáis suscritos al grupo, no dentro de él. Os llegan las notificaciones, las silenciáis y seguís ocupando plaza como parásitos.',
  'Un bot de webcams guarras habría aportado más conversación que vosotros, y encima con fotos.', // ROCKSTAR
  'Os leéis el grupo entero cada día como mirones de mierda y no soltáis ni un puto jaja.',
  'La cifra de cada uno está en la lista, y no mejora al repasarla. Y aun así seguís aquí, ocupando un sitio con la naturalidad de quien no sabe que sobra.',
  'El grupo tiene miembros y tiene atrezzo. Los miembros hablan. El atrezzo está ahí para que la escena no parezca vacía. Adivinad de qué lado os ha puesto el contador.',
  'Ni un buenos días, ni un jaja, ni una foto subida de tono, nada, y la plaza sigue siendo vuestra.', // ROCKSTAR
  'Estáis en un grupo de amigos y no habéis dicho lo suficiente para tener uno dentro. Eso no se consigue por accidente.',
  'El bot no os echa por caeros mal. Os echa porque ni para caer mal habéis abierto la boca.',
  'Vuestro historial entero se lee en lo que dura un polvo vuestro, y eso es decir poquísimo.', // ROCKSTAR
  'Unos no hablan porque no tienen nada que decir, y vosotros lo habéis convertido en un proyecto de vida, con constancia y todo.',
  'Diez mensajes o menos. Os invitaron a la orgía y os habéis pasado la noche en la cocina.', // ROCKSTAR
  'Si alguien os fuera a echar de menos, ya lo habría dicho. Nadie ha dicho nada.',
  'Vuestra participación entera cabe en un mensaje. Este, sin ir más lejos, ya es más largo que todo lo que habéis escrito desde que entrasteis.',
  'Habéis pasado por el grupo como quien entra en un bar solo a mear: sin pedir, sin saludar y dejando peste.',
  'Cualquiera de este grupo escribe más que vosotros mientras espera el ascensor, y dentro del ascensor hace cosas que vosotros ni en sueños.', // ROCKSTAR
  'Si el grupo fuera una fiesta, vosotros seríais el abrigo de alguien encima de la cama: estáis en la casa, ocupáis sitio, y nadie os ha dirigido la palabra en toda la noche.',
  'El bot os ha metido en una lista, y no es la de los que follan: es la que se vacía cada cierto tiempo.', // ROCKSTAR
  'Diez mensajes o menos. La gente entra aquí a hablar con sus amigos; vosotros entráis a comprobar que siguen ahí, como quien mira si la nevera sigue enchufada.',
  'La lista pone el número de cada uno y ninguno pasa de diez. Os sobran dedos para contarlo, y los dedos, por lo que se ve, los tenéis ocupados en otra cosa.', // ROCKSTAR
  'Sois miembros del grupo en el mismo sentido en que un cartel es parte de la calle: estáis pegados ahí, nadie os quita, y nadie os lee tampoco.',
  'Diez mensajes o menos. Ni una frase vuestra merece captura, y fotos vuestras tampoco las pide nadie.', // ROCKSTAR
  'Sois una foto de perfil sin nada detrás, de esos perfiles de Tinder que no contestan nunca.', // ROCKSTAR
  'Unos aportan chistes y otros mierda, pero aportan. Vosotros ni mierda habéis dejado.',
  'Estáis por debajo del corte, y el corte era escribir algo. Un «ok», un gemido, lo que fuera.', // ROCKSTAR
  'El bot esperaba que dijerais algo para poder meterse con vosotros. Se ha cansado de esperar y se mete igual, que para eso está esta lista.',
  'Diez mensajes o menos. Las notificaciones del grupo os vibran en el bolsillo, y es lo único que os vibra en todo el día.', // ROCKSTAR
  'Lleváis meses en el grupo y si os cruzan por la calle no saben ni cómo os llamáis.',
  'El grupo os aceptó, os dio sitio y esperó, como una cita que se queda sin beso. El grupo ya no espera, y el bot tiene el botón.', // ROCKSTAR
  'El número de cada uno cabe en la lista sin apretar. Ni dos cifras: así de poco habéis dado.',
  'Dónde escribáis fuera de aquí da igual: aquí no habéis dicho nada que valga la pena leer dos veces.',
  'Vuestra aportación al grupo es tan escasa que el bot ha tenido que crear una lista solo para poder nombraros. Antes de esto no había motivo para escribir vuestro nombre.',
  'Diez mensajes o menos. En el tiempo que lleváis aquí, alguien ha entrado, se ha hecho amigo de todos, ha discutido con la mitad y ha vuelto a caer bien. Vosotros seguís cargando.',
]

const UMBRAL_INACTIVO = 10;

// Cabecera de !inactivos: va en negrita y es lo primero que se lee. La amenaza
// tiene que aparecer SIEMPRE y en el mismo sitio: si dependiera del azar, la
// mitad de las veces la lista se leería como un ranking cualquiera.
let AMENAZAS = [
  'Escribid algo o el bot os expulsa. Y lo peor no va a ser irse: va a ser que nadie pregunte dónde estáis.',
  'La próxima vez que el bot pase por aquí, esta lista estará vacía. O escribís, o el bot os saca, y sacar es lo único que se os va a hacer en este grupo.', // ROCKSTAR
  'Tenéis los mensajes que tardéis en decidiros. Después os saca el bot, sin despedida, porque para despedirse hay que hablar.',
  'O empezáis a existir o el bot deja de contaros. Y lo que el bot no cuenta, el bot lo expulsa.',
  'Escribid algo que el grupo pueda repetir. Ahora mismo no hay una frase vuestra que alguien se sepa, ni un gemido que alguien recuerde.', // ROCKSTAR
  'Con lo que habéis escrito no os echarían de menos ni en un trío: los otros dos ni se darían cuenta.', // ROCKSTAR
  'De esta lista se sale escribiendo o te expulsa el bot. No hay una tercera puerta y el bot no la está buscando.',
  'El bot va a limpiar. Podéis estar dentro cuando lo haga, o fuera, con los pañuelos usados y el resto del atrezzo.', // ROCKSTAR
  'Cada día que pasa sin que escribáis es una firma más en vuestra propia expulsión, y ya lleváis el documento casi lleno.',
  'Lo grave no es que el bot os eche. Es que el grupo va a seguir exactamente igual de bien, y eso lo sabéis vosotros mejor que nadie.',
  'Escribid o fuera. Si os echa, no os vais a quejar, ya lo sabemos: a vosotros lo de gritar no se os da, ni en la cama.', // ROCKSTAR
  'El bot ya tiene vuestros números en la lista de expulsión. Solo le falta darle al botón, y no tiene ninguna prisa porque vosotros tampoco la habéis tenido nunca.',
  'El grupo tiene hilos, audios y algún que otro calentón. De vosotros tiene un nombre en una lista.', // ROCKSTAR
  'Escribid. Si el grupo tuviera que enseñar algo vuestro, enseñaría el hueco donde debería estar el mensaje.',
  'Quedáis avisados: el bot expulsa solo, no pregunta y no guarda copia de nadie.',
  'Escribid algo, aunque sea un punto o un emoji de berenjena. El bot lo acepta antes de sacaros.', // ROCKSTAR
  'El grupo no os necesita y el bot ya lo sabe. Os va a expulsar, y la única prueba de que estuvisteis aquí va a ser esta lista.',
  'Esta lista se vacía de dos maneras: escribiendo o expulsados. Elegís vosotros, pero elegís hoy.',
  'Os vais a ir sin ceremonia, sin mensaje y sin aviso, como quien se va de una cama ajena a las seis.', // ROCKSTAR
  'Esta lista es la que se usa para echar. No hay otra, y vosotros estáis en ella.',
  'Escribid o el bot os borra del grupo. Tampoco le cuesta mucho borrar algo que nunca estuvo.',
  'Os quedan las horas que tarde el bot en aburrirse y expulsaros, que viene a ser lo que tardáis vosotros en aburrir a alguien en la cama.', // ROCKSTAR
  'El bot no os echa por nada que hayáis hecho. Os echa por lo que no habéis hecho nunca: abrir la puta boca.',
  'Escribid ya o el bot os echa, y el hueco que dejéis lo va a llenar cualquiera en una tarde. Eso es lo que asusta, no la expulsión.',
  'Aquí no se negocia ni hay excepciones: se cuentan mensajes y se expulsa. Los vuestros ya están contados todos.',
  'La paciencia tenía un límite y la habéis agotado. La siguiente ronda es de expulsiones.',
  'O escribís algo o preparaos para la notificación de expulsión, que será la notificación más excitante que os llegue este año.', // ROCKSTAR
  'Limpieza de armario: lo que lleva meses sin usarse va a la basura. Vosotros lleváis meses sin que os use nadie, y no solo en el chat.', // ROCKSTAR
  'Última oportunidad antes de que el bot haga sitio, que aquí sobra peso muerto, del que no se mueve ni encima ni debajo.', // ROCKSTAR
  'El grupo funciona sin vosotros y lo sabéis. El bot solo va a oficializar lo que ya es un hecho.',
  'Escribid en el grupo. Lo que hay ahora se lee del tirón y no da ni para un cotilleo, ni para un mal calentón.', // ROCKSTAR
  'Vuestros nombres están en la lista de la limpieza. Salir de ella es tan fácil como escribir algo.',
  'Os va a expulsar un bot. Ni una persona del grupo se ha tomado la molestia.',
  'Escribid, joder, un mensaje, el que sea. El bot no pide calidad, que esto no es una primera cita.', // ROCKSTAR
  'Que os echen da igual. Lo que jode es que nadie va a notar que os habéis ido.',
]


async function calcularInactivos(sock, jid, groupMeta) {
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

  // Entradas del contador que no casan con NINGUN miembro y estan bajo un @lid:
  // son identidades sin resolver, no ex-miembros (un ex-miembro con telefono se
  // reconoce por su forma). Su existencia significa que este cruce esta
  // incompleto y que un cero puede no serlo.
  const formasDeMiembros = new Set();
  for (const p of groupMeta.participants) {
    for (const f of [p?.id, p?.lid, p?.phoneNumber].filter(Boolean)) {
      formasDeMiembros.add(bareJid(f));
      formasDeMiembros.add(canonicalJid(f));
    }
  }
  const hayLidsSinResolver = contados.some((u) => {
    const c = canonicalJid(u.jid);
    return String(c).endsWith('@lid') && !formasDeMiembros.has(c) && !formasDeMiembros.has(bareJid(u.jid));
  });

  const sinCruzar = [];
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

    // NO SE ACUSA DE CERO CUANDO EL CRUCE ES IMPOSIBLE.
    //
    // Si en el contador hay entradas bajo un @lid que no casan con ningun
    // miembro, es que hay identidades sin resolver: esas entradas SON de
    // alguien de la lista, solo que no se sabe de quien. Decir "0 mensajes" de
    // uno al que no se le puede cruzar nada es inventarse un dato, y de ahi
    // salio el que aparecio con cero habiendo escrito veinticinco.
    //
    // Solo se calla en el caso en que el cruce es DEMOSTRABLEMENTE imposible:
    // hay huerfanos por @lid Y la metadata no da ninguna forma @lid de esta
    // persona. En un grupo sano no salta, porque la metadata trae las dos
    // formas de cada miembro; y sin huerfanos tampoco.
    if (n === 0 && hayLidsSinResolver && !formas.some((f) => String(f).endsWith('@lid'))) {
      sinCruzar.push(p.id);
      continue;
    }
    // "entre 0 y 10" incluye el 10: quien lleva justo diez esta igual de
    // ausente que quien lleva nueve, y dejarlo fuera por uno era un corte que no
    // significaba nada.
    if (n <= UMBRAL_INACTIVO) flojos.push({ jid: p.id, count: n });
  }

  return { flojos, sinCruzar };
}

async function cmdInactivos(sock, msg, groupMeta, args = []) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (PURGA.has(String(args?.[0] || '').toLowerCase())) {
    return purgaInactivos(sock, msg, groupMeta, args);
  }
  // Mass-mention + amenaza de expulsión: es de admins, como !tagall. El cobro
  // va DESPUES del permiso, igual que !count: si no, un miembro pagaba 35 por
  // un "solo admins".
  if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SOLO_ADMINS, jid, 'admins') }, { quoted: msg });
  }
  if (!groupMeta?.participants?.length) {
    return sock.sendMessage(jid, {
      text: 'No pude leer la lista de miembros del grupo ahora mismo. Prueba otra vez en un rato.',
    }, { quoted: msg });
  }
  const { flojos, sinCruzar } = await calcularInactivos(sock, jid, groupMeta);

  const pago = await cobrar(jid, sender, 'inactivos', { fromMe: msg.key.fromMe, groupMeta });
  if (!pago.ok) {
    return sock.sendMessage(jid, { text: textoSinSaldo('inactivos', pago, jid) }, { quoted: msg });
  }

  if (sinCruzar.length) {
    logger.warn(
      `!inactivos en ${jid}: ${sinCruzar.length} miembro(s) sin cruzar por identidades @lid sin resolver; ` +
      `no se les cuenta como cero. Se arregla solo en cuanto escriban una vez.`);
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


// !inactivos purge — el dueño echa de golpe a los de la lista.
//
// Lo pidio el dueño: la lista amenazaba con una expulsion que nunca pasaba.
// Ahora pasa, pero solo si la lanza el tier dueño, y en dos tiempos: el primer
// !inactivos purge dice a cuantos va a echar, y hace falta un
// !inactivos purge confirmar en los dos minutos siguientes. Una expulsion en
// masa por una tecla mal pulsada no se deshace.
//
// No se echa a los admins (un admin que no escribe es cosa de quitarle el
// admin primero), ni al tier dueño, ni al bot, ni a quien no se pudo cruzar
// (calcularInactivos ya los deja fuera: no se echa a nadie por un cero que no
// es seguro). Sin cobro: es del dueño.
const PURGA = new Set(['purge', 'purga', 'echar']);
const CONFIRMA = new Set(['confirmar', 'confirmo', 'si', 'sí', 'ya']);
const PURGA_VENTANA_MS = 2 * 60 * 1000;
const PURGA_TANDA = 20;
const purgasPendientes = new Map();   // grupo -> caducidad

async function purgaInactivos(sock, msg, groupMeta, args) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: avisoPermiso(jid, sender, groupMeta) }, { quoted: msg });
  }
  if (!groupMeta?.participants?.length) {
    return sock.sendMessage(jid, {
      text: 'No pude leer la lista de miembros del grupo ahora mismo. Prueba otra vez en un rato.',
    }, { quoted: msg });
  }
  if (!isBotAdmin(sock, groupMeta)) {
    return sock.sendMessage(jid, { text: 'No soy admin aquí. Hacedme admin o dejad de pedirme cosas.' }, { quoted: msg });
  }

  const { flojos } = await calcularInactivos(sock, jid, groupMeta);
  const echables = flojos.filter((u) => !isAdmin(groupMeta.participants, u.jid));
  const admins = flojos.length - echables.length;
  if (!echables.length) {
    purgasPendientes.delete(jid);
    return sock.sendMessage(jid, {
      text: admins
        ? `Los únicos que no pasan de ${UMBRAL_INACTIVO} mensajes son admins. Quítales el admin primero.`
        : `Todo el mundo pasa de ${UMBRAL_INACTIVO} mensajes. Hoy no hay a quien echar.`,
    }, { quoted: msg });
  }

  const confirma = CONFIRMA.has(String(args?.[1] || '').toLowerCase());
  const caduca = purgasPendientes.get(jid) || 0;
  if (!confirma || caduca < Date.now()) {
    purgasPendientes.set(jid, Date.now() + PURGA_VENTANA_MS);
    const n = echables.length === 1 ? '1 miembro' : `${echables.length} miembros`;
    return sock.sendMessage(jid, {
      text: `*${n}* con ${UMBRAL_INACTIVO} mensajes o menos van a la calle.` +
        (admins ? ` Hay ${admins} admin${admins === 1 ? '' : 's'} en la lista que no se tocan.` : '') +
        `

Para hacerlo: *!inactivos purge confirmar* en los próximos dos minutos.`,
    }, { quoted: msg });
  }
  purgasPendientes.delete(jid);

  const ids = echables.map((u) => u.jid);
  const { avisoDeKick } = require('./group');
  await sock.sendMessage(jid, avisoDeKick(ids, jid));

  const hechos = [], fallidos = [];
  for (let i = 0; i < ids.length; i += PURGA_TANDA) {
    const tanda = ids.slice(i, i + PURGA_TANDA);
    const r = await aplicarParticipantes(sock, jid, tanda, 'remove', groupMeta);
    hechos.push(...r.ok);
    fallidos.push(...r.fallidos.map((f) => f.jid));
    if (i + PURGA_TANDA < ids.length) await new Promise((res) => setTimeout(res, 1500));
  }
  logger.info(`!inactivos purge en ${jid}: ${hechos.length} fuera, ${fallidos.length} fallidos`);
  if (!fallidos.length) return;
  return sock.sendMessage(jid, {
    text: `Fuera ${hechos.length}. No pude echar a ${fallidos.map((j) => `@${String(j).split('@')[0]}`).join(' ')}.`,
    mentions: fallidos,
  }, { quoted: msg });
}

module.exports = { cmdVs, cmdFantasmas, cmdInactivos, _VS_AJUSTADO: VS_AJUSTADO };
