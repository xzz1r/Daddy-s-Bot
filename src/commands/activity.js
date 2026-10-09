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
  '%W habla y %L mira. El marcador solo ha puesto números a lo que ya se veía.',
  '%L se ha comido la paliza con la boca cerrada. %W llena el chat, y al lado no nace ni una puta frase.',
  'Paliza. %W lleva el grupo a cuestas y %L lleva la mochila vacía.',
  '%W le restriega la cuenta por la cara a %L. Se le aprieta la mandíbula y no le sale ni un mensaje para tapar el número.',
  '%W escribe por los dos, y %L encima se deja representar.',
  '%L no alcanza a %W ni de lejos. El suyo se corta en seco y el otro montón sigue bajando, y no se le ve el final.',
  '%W gana por goleada. %L ha venido al partido a mirar.',
  'Lo de %L contra %W ha sido un trámite. Y el trámite lo ha firmado %W.',
  '%L, te han comparado con %W y ya sabes por qué nadie lo hace nunca.',
  'El grupo tiene voces y tiene público: %W es de las voces y %L, del público.',
  '%W aporta y %L cotillea. Los números lo dicen sin maquillaje.',
  'Paliza histórica. %L ha perdido sin enterarse de que había partido.',
  '%L, el vs lo ha jugado %W. Tu lado del chat está en blanco, sin una línea que defender y sin una puta excusa escrita.',
  '%W por delante y a mucha distancia. %L, en el retrovisor, haciéndose pequeño.',
  '%W se oye tecleando en todo el chat. %L mira ese montón y no tiene ni una frase propia que enseñar.',
  '%W da la cara. %L da el número de teléfono.',
  'Duelo sin rival. %W contra la sombra de %L.',
  '%L ha perdido por tanto que el bot ha tenido que contar dos veces.',
  'Si esto fuera boxeo, a %L le habrían tirado la toalla en el primer asalto. %W ni sudó.',
];

let VS_AJUSTADO = [
  '%W gana por poco. A %L se le queda el cabreo en los dientes y no le entra ni la queja.',
  'Duelo apretado. %W gana y %L puede quejarse de todo menos de no haber estado.',
  '%W se lleva el cara a cara por la mínima. %L aprieta la mesa hasta que le blanquean los nudillos, y el marcador no se da la vuelta.',
  'Perder por tan poco jode, %L. Y a %W ganar por tan poco tampoco le deja presumir.',
  '%W por delante, %L pegado a la espalda. Dos que sostienen el grupo, y uno un poco más.',
  'Ajustado. %W gana, pero %L le ha hecho sudar cada mensaje.',
  '%L pierde de un pelo contra %W y no suena ni un aplauso. La cifra cae en la mesa y nadie levanta la voz.',
  'Foto finish. %W saca la nariz y %L se queda mordiéndose los labios.',
  '%W manda por poco. Lo de %L empuja el chat y no llega a cerrarlo: el peso de delante no es el suyo.',
  'Por la mínima. %W gana y %L no tiene excusa: le ha faltado nada.',
  '%L, tan cerca de %W que se le oye la respiración. Pero delante va %W.',
  '%W gana un casi empate y %L se queda con la rabia en el puño. La cifra no se mueve de donde está.',
  '%L ve su nombre debajo y se le cierra la boca. Han escrito los dos, y quien gana es %W.',
  '%W gana justo y %L pierde justo. Van tan cerca que se estorban al mirar la cifra, y el nombre de delante no cede.',
  '%L ha peleado el vs y el número lo ha cerrado igual. %W queda delante, con los dos nombres todavía calientes en el chat.',
  'Cara a cara igualado. %W gana, y a %L le va a escocer.',
  '%W va delante por poco. %L no pestañea, con la cifra pegada a la cara, y ese puesto no se le despega.',
  'Ajustado. %W gana y a %L le toca tragárselo, con lo poco que ha faltado.',
  'Duelo cerrado de los de verdad. %W gana y %L se queda pegado al nombre de al lado. El grupo mira los dos nombres y no le sale el silbido.',
  '%W se lo lleva en un suspiro. A %L se le escapa el aire y no le queda ni para soltar una queja.',
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
  'Se traga el chat entero y no escupe ni una puta coma. Se le queda la cara encendida de leer y el nombre, debajo, vacío.',
  'Su teclado debe estar nuevo de fábrica. Lo único que hace es bajar y bajar el hilo, cotilleando sin soltar prenda.',
  'Aporta lo mismo que un "este mensaje fue eliminado": ves que pasó algo, pero nada que mereciera la pena leer. Fantasma sin sustancia.',
  'Vive en visto. Campeón de dejar a todo el mundo esperando una respuesta que no llega.',
  'El grupo es su Netflix: lo abre, consume lo que otros se curran y nunca deja reseña. Parásito de entretenimiento ajeno, fantasma.',
  'Ve los memes y jamás hace uno. Consumidor crónico y productor cero, y ahí tienes su cifra.',
  'Lleva tanto en silencio que ya nadie le espera respuesta. Es el "te leo luego" hecho persona, y el "luego" no llega jamás, perdedor.',
  'Entra, lee, se ríe por dentro y se larga. El grupo le entretiene gratis y a cambio recibe silencio.',
  'Tiene el micrófono apagado desde que entró. Por lo que se ve, no lo echa de menos nadie.',
  'Si mañana se le cae el móvil al váter, el grupo no se entera ni en un mes.',
  'Se pone en línea y el puntito verde se enciende para nada. No cae ni una palabra: fantasma con la luz puesta y la boca apagada.',
  'Nadie recuerda su último mensaje. Normal: hay que subir mucho para encontrarlo.',
  'Se ríe con lo que escriben los demás y no pone nada de su parte, la rata.',
  'Aquí dentro no se le conoce ni la voz, ni la risa, ni una puta opinión.',
  'Aparece en la lista de miembros y en ningún otro sitio. Ni en una broma, ni en una bronca.',
  'La cifra del fantasma da grima en cuanto se señala. Es tan corta que el grupo la suelta y sigue con el chiste de otro.',
  'Viene al grupo como quien entra en una tienda solo a mirar. Nunca compra, nunca saluda.',
  'Le plantan una pregunta con su nombre y debajo no nace nada. El fantasma deja el mensaje colgando, con la boca cerrada.',
  'Si dieran premio por no decir nada, ni subiría a recogerlo, por no tener que hablar.',
  'Parásito de chat: vive de lo que escriben otros y no devuelve ni un «jaja».',
  'Mira todo desde la barrera y luego no sabe de qué va nada. Fantasma y encima sin enterarse.',
  'Abre la mano delante del grupo y se ve el hueco. El fantasma aguanta la respiración y no enseña ni una frase, ni un plan, ni una mierda.',
  'Cuando escribe, que es casi nunca, parece un error de envío.',
  'Tiene el culo en un hueco del grupo y la voz en ninguno. El asiento está caliente y el chat en ese sitio está frío de cojones.',
  'No ha dejado amigo, ni bronca, ni una frase que se pueda repetir. Pasan la mano por donde estaba y no notan ni una muesca.',
  'El grupo podría cambiar de nombre, de tema y de gente, y ni se enteraría.',
  'Cero peso en el grupo. Si se va, la conversación ni pestañea.',
  'Consume memes, chismes y peleas como quien va a un bufé libre y no deja propina.',
  'Lo único que ha compartido con el grupo es su número de teléfono. Y fue sin querer.',
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
  'Hay gente en este grupo que ha escrito más que vosotros discutiendo dónde pedir la cena. Vosotros ni el nombre del restaurante.',
  'Si desaparecéis, el grupo se entera por esta lista, no porque os eche de menos. Ese es exactamente vuestro peso aquí: el de un mueble que nadie mueve.',
  'Diez mensajes o menos. Si hubiera que citar vuestra mejor intervención, no habría de dónde sacarla.',
  'Estáis en el grupo igual que está el extintor en la pared: alguien os puso ahí un día, nadie os mira, y en el fondo todos esperan no tener que usaros nunca.',
  'Diez mensajes o menos. Los callados por lo menos escuchan; vosotros sois ausentes con la aplicación abierta, que es bastante más triste.',
  'Con diez mensajes o menos, fuera. Esos mensajes os caben en una línea, y debajo se queda el blanco.',
  'El grupo funcionaría exactamente igual si en vuestro sitio hubiera una piedra. La diferencia es que la piedra no ocuparía plaza en la lista de miembros ni haría como que participa.',
  'Sois el relleno que se pone para que el grupo parezca grande y vivo, un decorado con número de teléfono.',
  'Os han tenido que poner en una lista para encontraros. En el chat, vuestro nombre no ocupa sitio.',
  'Habéis apurado el puto silencio hasta el final. Os sacan con la boca cerrada y el grupo ni baja el volumen.',
  'Vuestra relevancia en el grupo, calculada dos veces por si acaso: cero.',
  'Pasáis sin mover ni el polvo del chat. No hay una frase vuestra que alguien tenga que apartar cuando os quiten.',
  'Estáis suscritos al grupo, no dentro de él. Como el que paga el gimnasio en enero, se saca la foto con la tarjeta y no vuelve a pisarlo hasta el enero siguiente.',
  'Diez mensajes o menos. Un bot de spam habría aportado más conversación, y encima habría dicho algo interesante sobre criptomonedas.',
  'Tenéis el grupo abierto y el teclado frío. Leer no cuenta, y el botón de echar ya no espera a vuestro nombre.',
  'La cifra sigue enana por mucho que la miréis. El nombre cuelga en la lista de los que sobran, con un blanco debajo que no vale ni leerlo.',
  'El grupo tiene miembros y tiene atrezzo. Los miembros hablan. El atrezzo está ahí para que la escena no parezca vacía. Adivinad de qué lado os ha puesto el contador.',
  'Ni un buenos días, ni un jaja suelto, ni un audio que nadie iba a escuchar, nada, y la plaza sigue siendo vuestra.',
  'Estáis entre amigos y no habéis dejado ni un audio que alguien guarde. Cuando os quiten, el grupo no tiene una voz vuestra que echar de menos.',
  'Bajan por vuestros nombres, cuentan y no encuentran ni una anécdota. El botón ya está hundido.',
  'Vuestro historial completo se lee en menos tiempo del que tardáis en no contestar a un mensaje directo. Y encima se lee rápido porque no hay nada que entender.',
  'Callar lo habéis entrenado hasta dejarlo fino. Ni se os escapa un «espera» cuando el nombre sale de la lista.',
  'Diez mensajes o menos. Lo vuestro es mirar desde la ventana una fiesta a la que os invitaron.',
  'Si alguien os fuera a echar de menos, ya lo habría dicho. Nadie ha dicho nada.',
  'Vuestra participación entera cabe en un mensaje. Este, sin ir más lejos, ya es más largo que todo lo que habéis escrito desde que entrasteis.',
  'Habéis cruzado el grupo como quien cruza un portal y no saluda a nadie.',
  'Cualquiera de este grupo escribe más que vosotros mientras espera el ascensor, y encima uno de ellos sería gracioso.',
  'Si el grupo fuera una fiesta, vosotros seríais el abrigo de alguien encima de la cama: estáis en la casa, ocupáis sitio, y nadie os ha dirigido la palabra en toda la noche.',
  'El bot os ha metido en una lista, y no es la del top ni la de los graciosos: es la que se vacía cada cierto tiempo.',
  'Diez mensajes o menos. La gente entra aquí a hablar con sus amigos; vosotros entráis a comprobar que siguen ahí, como quien mira si la nevera sigue enchufada.',
  'La lista pone vuestro número, y ninguno pasa de diez. Se lee en voz alta y detrás no queda nada.',
  'Sois miembros del grupo en el mismo sentido en que un cartel es parte de la calle: estáis pegados ahí, nadie os quita, y nadie os lee tampoco.',
  'Diez mensajes o menos y ni uno da para una captura. La galería del grupo sigue intacta, sin una letra vuestra dentro.',
  'Sois una foto de perfil y un historial que se lee de un tirón, entre dos notificaciones.',
  'Unos arman la bronca y otros dejan por lo menos una frase. Vosotros no habéis manchado el chat, y el historial sale limpio de vuestro nombre en cuanto os borran.',
  'El corte era dejar alguna frase y os habéis quedado debajo. Al borraros el nombre no se cae ni una línea con él.',
  'El bot esperaba que dijerais algo para poder meterse con vosotros. Se ha cansado de esperar y se mete igual, que para eso está esta lista.',
  'Diez mensajes o menos. Si el grupo os manda notificaciones, se las estáis tirando todas.',
  'Lleváis el grupo encima y no habéis entrado en la conversación. Os paran en la puerta, y el «hola» no ha llegado a tocar el suelo.',
  'El grupo os aceptó, os dio sitio y esperó. El grupo ya no espera. El bot tampoco, y el bot es el que tiene el botón.',
  'El número de cada uno cabe en la lista sin apretar. Ni dos cifras: así de poco habéis dado.',
  'Aquí no habéis dejado una frase que alguien abra por segunda vez. El chat ni se desplaza cuando faltáis: no ocupabais ni el sitio de una línea.',
  'Vuestra aportación al grupo es tan escasa que el bot ha tenido que crear una lista solo para poder nombraros. Antes de esto no había motivo para escribir vuestro nombre.',
  'Diez mensajes o menos. En el tiempo que lleváis aquí, alguien ha entrado, se ha hecho amigo de todos, ha discutido con la mitad y ha vuelto a caer bien. Vosotros seguís cargando.',
]

const UMBRAL_INACTIVO = 10;

// Cabecera de !inactivos: va en negrita y es lo primero que se lee. La amenaza
// tiene que aparecer SIEMPRE y en el mismo sitio: si dependiera del azar, la
// mitad de las veces la lista se leería como un ranking cualquiera.
let AMENAZAS = [
  'Escribid algo o el bot os expulsa. Y lo peor no va a ser irse: va a ser que nadie pregunte dónde estáis.',
  'La próxima vez que el bot pase por aquí, esta lista estará vacía. O porque escribisteis, o porque os expulsó a todos. Las dos vacían igual.',
  'Tenéis los mensajes que tardéis en decidiros. Después os saca el bot, sin despedida, porque para despedirse hay que hablar.',
  'O empezáis a existir o el bot deja de contaros. Y lo que el bot no cuenta, el bot lo expulsa.',
  'Escribid algo que el grupo pueda repetir. Ahora mismo no hay una frase vuestra que alguien se sepa.',
  'Con lo que habéis escrito no os echarían de menos ni en un grupo de dos. Quien quede se iría, y tendría razón.',
  'De esta lista se sale escribiendo o te expulsa el bot. No hay una tercera puerta y el bot no la está buscando.',
  'El bot va a limpiar. Podéis estar dentro cuando lo haga o podéis estar en la papelera con el resto del atrezzo.',
  'Cada día que pasa sin que escribáis es una firma más en vuestra propia expulsión, y ya lleváis el documento casi lleno.',
  'Lo grave no es que el bot os eche. Es que el grupo va a seguir exactamente igual de bien, y eso lo sabéis vosotros mejor que nadie.',
  'Escribid o fuera. Y si os echa, tampoco vais a escribir para quejaros, que ya nos conocemos.',
  'El bot ya tiene vuestros números en la lista de expulsión. Solo le falta pulsar, y no tiene ninguna prisa porque vosotros tampoco la habéis tenido nunca.',
  'El grupo tiene hilos, audios y discusiones. De vosotros tiene un nombre en una lista y poco más.',
  'Escribid. Si el grupo tuviera que enseñar algo vuestro, enseñaría el hueco donde debería estar el mensaje.',
  'Quedáis avisados: el bot expulsa solo, no pregunta y no guarda copia de nadie.',
  'Escribid algo, lo que sea, aunque sea un punto. El bot lo acepta antes de sacaros, y ni eso habéis mandado.',
  'El grupo no os necesita y el bot ya lo sabe. Os va a expulsar, y la única prueba de que estuvisteis aquí va a ser esta lista.',
  'Esta lista se vacía de dos maneras: escribiendo o expulsados. Elegís vosotros, pero elegís hoy.',
  'El bot os saca sin ceremonia, sin mensaje y sin aviso. Igual que entrasteis, pero al revés y con menos gente mirando.',
  'Esta lista es la que se usa para echar. No hay otra, y vosotros estáis en ella.',
  'Escribid o el bot os borra del grupo. Tampoco le cuesta mucho borrar algo que nunca estuvo.',
  'Os quedan las horas que tarde el bot en aburrirse y expulsaros. Calculad.',
  'Pasan la mano por el chat y no hay una frase vuestra que rasque. Os echan por limpieza, con el nombre ya fuera y sin una bronca que recordar.',
  'Escribid ya o el bot os echa, y el hueco que dejéis lo va a llenar cualquiera en una tarde. Eso es lo que asusta, no la expulsión.',
  'El bot no negocia ni hace excepciones: cuenta mensajes y expulsa. Los vuestros ya los ha contado todos.',
  'El bot tiene paciencia limitada y vosotros la habéis agotado. La siguiente ronda es de expulsiones.',
  'Escribid algo o preparaos para la notificación de expulsión, que será lo primero que leáis entero.',
  'El bot limpia el grupo como se limpia un armario: lo que no se usa, se tira. Y vosotros no os usáis.',
  'Os queda esta pasada. Luego el bot os echa, y en la lista ya está marcado el sitio exacto donde quitaros.',
  'El grupo ya funciona con vuestra silla vacía. El bot os echa y la charla ni se entera de que falta alguien.',
  'Escribid en el grupo. Lo que hay ahora se lee del tirón y no da ni para un cotilleo.',
  'El bot va a hacer limpieza y vuestros nombres están en la lista. Salir de ella es tan fácil como escribir algo.',
  'Cuando os echen no va a sonar una despedida. Vuestra salida cabe entre un mensaje y el siguiente, y el hilo sigue igual.',
  'Escribid, joder, un mensaje, el que sea. El bot no pide calidad, pide que existáis.',
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

module.exports = { cmdVs, cmdFantasmas, cmdInactivos };
