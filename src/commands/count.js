const { getActiveUsers, resetCounts, resetAllCounts, getLastReset } = require('../utils/messageCounter');
const { isOwner, isMainOwner, isAdmin, isGroupAdmin, getSender, getTarget, sameUser, soloMiembros } = require('../utils/wa');
const { pickFresh } = require('../utils/helpers');
const { cobrar, textoSinSaldo } = require('../utils/auraCobro');
const { SOLO_ADMINS, SOLO_GRUPOS } = require('../data/avisos');
const { aviso, avisoPermiso } = require('../utils/helpers');

let MEMBER_PHRASES = [
  [
    'Número uno indiscutible. El grupo entero podría callarse y tú seguirías manteniendo la conversación solo.',
    'El trono es tuyo. Lo ocupas desde hace tanto que ya nadie recuerda si hubo alguien antes.',
    'Número uno. Cuando alguien pregunta quién mueve este grupo, salta tu nombre antes de que lo pregunten.',
    'Primero y con margen. Los de abajo no te persiguen, te miran de lejos y aceptan que no llegan.',
    'El grupo respira a tu ritmo. Da un poco de miedo, pero funciona y nadie se atreve a decirlo.',
    'Número uno. El grupo sin ti sería más tranquilo y muchísimo más muerto. Elegimos ruido.',
    'Primer puesto por derecho propio. Nadie te lo regaló y nadie te lo va a quitar. Que descansen los demás.',
    'Primero del grupo. Si esto pagara en dinero en vez de en aura, ya estarías jubilado.',
    'Ganador absoluto. El resto compite por el segundo puesto porque el primero lo tienes en propiedad.',
    'Número uno indiscutible. Tu constancia asusta un poco y el ranking te lo agradece igual.',
    'Primero. El resto del grupo va a rebufo tuyo y ni se plantea adelantarte. Se han rendido, y bien.',
    'Número uno. El grupo lo sostienes tú y los demás se apuntan a la foto.',
    'Primer puesto. Si mañana te callas, esto se convierte en un cementerio con notificaciones.',
    'Quien más escribe del grupo. Aquí eso vale más que cualquier cargo, y lo sabes.',
    'Primer puesto. Los de abajo hablan de ti. Tú hablas con todos.',
    'Número uno, cabrón. Nadie te ha regalado ni uno de los mensajes que llevas.',
    'El ranking lo lidera quien aparece cuando los demás se esconden: tú.',
    'Corona. Mientras otros prometen volver, tú no te has ido.',
    'Número uno. Tu nombre es lo primero que se lee en este grupo, y con razón.',
    'A ver quién es el valiente que te discute el puesto. Nadie.',
    'Líder del grupo. Si esto fuera un equipo, llevarías el brazalete y el balón.',
    'Número uno. Los fantasmas deberían pagarte una cuota por mantenerles el grupo vivo.',
    'Número uno sin discusión. El grupo tiene pulso gracias a ti, y el pulso no se finge.',
    'Arriba del todo. Aquí no se sube hablando bonito: se sube hablando.',
    'Número uno. Cuando el grupo se aburre, tú lo arreglas. Cuando arde, también estás.',
    'Los demás escriben cuando pueden. Tú escribes cuando hace falta, y por eso vas arriba.',
    'El ranking tiene nombre y apellido, y son los tuyos.',
    'Número uno. Hay grupos que mueren por falta de gente como tú. Este no, de momento.',
    'Primer puesto. Te lo has ganado mensaje a mensaje, y el resto lo ha visto.',
    'Número uno. Arriba hay sitio para una persona y lo tienes pillado.',
  ],
  [
    'Segundo. Tan cerca del primero que duele, y aun así no lo has alcanzado. Otra vez será. O no.',
    'Plata. El puesto de los que casi lo consiguen y se conforman con contarlo después.',
    'Casi. Y casi no vale una mierda en ningún ranking del mundo, tampoco en este.',
    'Número dos. Escribes mucho, sí. Pero hay alguien que escribe más y no piensa cansarse.',
    'Número dos. A un mal día del primero de subir, y a dos buenos días del tercero de bajar. Tensa la cosa.',
    'Casi lo tocas. Casi. Y ese casi lleva persiguiéndote más tiempo del que reconoces en público.',
    'Número dos. Nadie recuerda al segundo, pero al menos sales en la foto. Es algo.',
    'Segundo. Si el primero se fuera del grupo, serías el rey. Reza, que trabajar no te ha funcionado.',
    'Segundo lugar. Cerca del trono, lejos de sentarte. La historia de tu puta vida, probablemente.',
    'Casi primero. Que en el mundo real se traduce como: no.',
    'Número dos. Aprietas, se te nota, y aun así el marcador no se mueve. Frustrante de ver desde fuera.',
    'Plata. Le vas pisando los talones a alguien que ni se ha girado a mirarte. Duro pero real.',
    'Estás arriba, pero no en lo alto. Y aquí esa diferencia es todo lo que importa.',
    'Número dos. Te sobra presencia y te falta el último empujón. Lleva faltándote desde el principio.',
    'Segundo lugar. Nadie duda de que estás aquí. Todos dudan de que puedas estar más arriba.',
    'Plata. Buen puesto para quien se conforma. Malo para quien no. Ya sabrás tú cuál eres.',
    'Segundo lugar y sin excusas: has tenido el mismo tiempo que el primero y lo has usado peor.',
    'Casi. El grupo entero ha visto lo cerca que estuviste y lo poco que sirvió al final.',
    'Estás a nada de la cima y esa nada pesa más de lo que jamás vas a admitir en voz alta.',
    'Número dos. Sostienes el grupo a medias con quien va arriba, y arriba se llevan la foto.',
    'Plata. Escribes más que casi todos y aun así te toca mirar hacia arriba. Qué rabia debe dar.',
    'Segundo puesto. El grupo sin ti se notaría. Sin el primero, más. Así están las cosas.',
    'Plata. Casi todo el trabajo del primer puesto y ninguna de las fotos.',
    'Número dos. Nadie te puede decir que no aportas. Solo que no llegas.',
    'Plata, y bien ganada. El oro lo tiene alguien que no duerme.',
    'Segundo del grupo. Si quien va arriba se toma vacaciones, el trono es tuyo. Y lo sabe.',
    'Plata. Aportas como pocos y aun así el primer puesto te hace parecer poca cosa.',
    'Número dos. Estás arriba y te jode no estar más arriba. Normal.',
    'Segundo puesto. Presencia de sobra. Lo que falta es un puesto.',
    'Plata. En cualquier otro grupo serías el número uno. Aquí te ha tocado competir con una bestia.',
  ],
  [
    'Tercero. En el podio de milagro y por los pelos. Un mal día y estás fuera de la foto.',
    'Bronce. El último puesto que la gente recuerda. El primero que la gente olvida.',
    'Estás en el podio agarrado con las uñas. Suéltate un día y te caes sin que nadie lo note.',
    'Bronce. Suena a premio hasta que recuerdas que solo significa que dos te ganaron.',
    'Tercero. Muy visible para desaparecer, muy poca cosa para mandar. El limbo perfecto.',
    'Tercero. Un par de días flojos y este mensaje se lo lleva otro. Presión sana, la llaman.',
    'Bronce. Estás en el podio y en la cuerda floja a la vez. Un equilibrio de mierda pero es el tuyo.',
    'Tercero. La gente te reconoce, nadie te teme. Es una posición cómoda y absolutamente inofensiva.',
    'Tercero. En un grupo de dos serías segundo. Aquí, el que cierra la fiesta.',
    'Bronce. El grupo te tiene fichado como uno de los que están. No como uno de los que mandan.',
    'Tercer puesto. Escribes bastante y aun así te sobran dos personas por delante. Hay margen.',
    'Bronce. Un puesto honesto: dice exactamente lo que aportas, ni más ni menos.',
    'Bronce. Estás donde estás porque el cuarto es todavía más flojo. Duro pero honesto.',
    'Tercero. Ni protagonista ni extra: secundario con frase. Peor sitio hay.',
    'Bronce. Que estés aquí no es casualidad, pero que no subas tampoco.',
    'Tercer puesto. El podio se te queda grande y el cuarto puesto te queda pequeño. Estás justo donde te toca.',
    'Tercer lugar. Nadie te va a hacer un homenaje por esto, pero tampoco te van a olvidar. Empate.',
    'Tercero. Estás en la parte alta y en la mitad de la nada al mismo tiempo. Habilidad rara.',
    'Bronce. Un escalón más y hablaríamos. Uno menos y no hablaríamos de ti en absoluto.',
    'Tercero. La medalla más barata del podio, pero es una medalla. Agárrala fuerte.',
    'Tercer puesto. Estás en el podio porque apareces, y eso aquí ya es muchísimo.',
    'Bronce. Arriba hay dos. Abajo hay un grupo entero que no te llega.',
    'Tercer puesto del ranking. Los fantasmas te miran desde el sótano sin entender cómo se sube.',
    'Bronce. No mandas, pero tampoco sobras. Hay gente que daría el aura por eso.',
    'Tercer puesto. Si faltas, se nota. Por poco, pero se nota.',
    'Podio. Tercera plaza, y el cuarto ya está lejos. Algo haces bien, aunque te joda que se diga.',
    'Bronce. Un puesto de los que se ganan escribiendo, no quejándose.',
    'Tercer puesto. El grupo se mueve contigo dentro, y eso ya te separa de la mayoría.',
    'Bronce, y con la cabeza bien alta. Los que no están aquí no tienen ni cara.',
    'Tercer escalón del podio. Los dos de arriba te sacan ventaja. Los de abajo te sacan excusas.',
  ],
];

let ADMIN_PHRASES = [
  [
    'La corona y la placa en la misma cabeza. Este grupo tiene dictador y encima elegido por el marcador.',
    'La cima y admin. Nadie te va a quitar ninguna de las dos cosas, y menos por las buenas.',
    'Admin en lo alto del marcador. Repartes normas y además cumples la de escribir más que nadie.',
    'Número uno con cargo. El grupo te tiene miedo y te tiene leído. Combinación imbatible.',
    'Primero del ranking con placa. Si algún día te vas, este grupo se queda mudo y sin ley a la vez.',
    'Admin número uno. No hace falta que recuerdes que mandas: el contador ya lo grita por ti.',
    'La placa y el trono. Si esto fuera un país, el gobierno serías tú, tú y otra vez tú.',
    'Número uno con autoridad. El grupo no se te desmadra porque no le das ni tiempo a intentarlo.',
    'Admin y número uno. El cargo y el trabajo en la misma persona. Casi nunca pasa.',
    'Primer puesto con placa. Mandas y además das ejemplo, que es lo que más jode a los de abajo.',
    'La placa te la dieron. El primer puesto te lo has ganado tú. Las dos cosas se notan.',
    'Admin en lo alto. Nadie puede decir que usas el cargo para esconderte.',
    'Número uno y con autoridad. El grupo sabe a quién tiene que hacer caso, y a quién leer.',
    'Corona y placa. Hay admins que miran. Tú escribes más que nadie.',
    'Primer puesto siendo admin. Los que se quejan de cómo va el grupo no te llegan ni a la mitad.',
    'Admin número uno. Si el grupo tuviera escudo, llevaría tu cara.',
    'Mandas y lideras el ranking, y lo segundo nadie te lo ha regalado.',
    'Número uno con cargo. Un admin al que nadie le puede echar en cara la placa.',
    'Primer puesto y admin. Cuando hablas, se escucha por las dos cosas.',
    'Admin en la cima. Hay quien grita órdenes. Tú las das escribiendo.',
    'La corona y el cargo. Si esto se hunde algún día, no va a ser por ti.',
    'Número uno con placa. El resto de admins ya sabe a quién tiene que imitar.',
    'Primer puesto y autoridad. El grupo te hace caso porque te ve, no porque te tema.',
    'Admin y quien más escribe. Da gusto y da miedo.',
    'Arriba del ranking con cargo. Pocos lo consiguen y menos lo aguantan.',
    'Número uno siendo admin. Quien diga que los admins no hacen nada, que mire esta línea.',
    'Placa y trono. La autoridad que no se gana escribiendo aquí no vale nada, y la tuya vale.',
    'Admin líder. El grupo va a tu ritmo y nadie se ha quejado del ritmo.',
    'Primer puesto. Con cargo o sin él, lo tendrías igual. Eso es lo que da rabia.',
    'Número uno con autoridad. Si alguien quiere tu sitio, que empiece a escribir hoy. Y que no pare.',
  ],
  [
    'Plata y placa. Te sobra autoridad y te falta un empujón en el contador. Justo lo que no se ordena.',
    'Plata con cargo. Nadie te discute la autoridad, pero el marcador te discute todo lo demás.',
    'Admin segundo. Estar cerca del primero llevando placa es casi peor que estar lejos. Casi.',
    'Segundo puesto y admin. El cargo no puntúa aquí, y se nota justo en este renglón.',
    'Plata y admin. Buen equilibrio entre currar el cargo y no vivir enganchado. O eso te dices.',
    'Admin número dos. Un escalón te separa de tenerlo todo. Un escalón y bastantes horas.',
    'Segundo lugar y admin. Tienes el poder de callar a cualquiera y aun así hablas menos que el de arriba.',
    'Plata y placa. Nadie va a quitarte el cargo. El puesto en cambio está bastante en el aire.',
    'Admin en segunda posición. Cerca de todo y dueño de la mitad. Podría ser peor.',
    'Plata con autoridad real. Aquí mandas tú y escribe otro. Reparto raro pero estable.',
    'Segundo siendo admin. El grupo te respeta por la placa y te lee por costumbre. Ambas cosas cuentan.',
    'Plata y cargo. Estás justo donde se está cómodo: con poder y sin la obligación de ser el más visible.',
    'Admin en plata. Segundo del grupo y primero en poder. Un empate que solo tú puedes romper.',
    'Plata con placa. Un admin que escribe más que casi todos. Eso ya es rarísimo.',
    'Segundo puesto siendo admin. El cargo te lo ganas cada día, y el puesto casi.',
    'Admin en plata. Nadie puede decir que no das la cara. Solo que hay quien la da un poco más.',
    'Número dos con autoridad. El grupo te nota en las dos cosas.',
    'Plata y cargo. Si el primer puesto afloja, el trono va a tener placa.',
    'Segundo del ranking y admin. Moderas escribiendo, no escondiéndote.',
    'Admin en el segundo escalón. Te falta un empujón para tenerlo todo y te sobra aguante.',
    'Plata con placa. Mandar y aparecer a la vez cansa. Tú lo haces igual.',
    'Número dos siendo admin. Quien va arriba te gana en mensajes, no en respeto.',
    'Segundo puesto con cargo. La placa no te regala nada aquí, y aun así estás arriba.',
    'Admin y plata. Si el grupo se tambalea, tú eres una de las piernas que lo sujetan.',
    'Plata. Con cargo. Y con más mensajes que la mayoría de los que se quejan de los admins.',
    'Segundo lugar y admin. A un puesto de ser imposible de discutir.',
    'Admin número dos. El oro se te escapa por poco. La autoridad, nunca.',
    'Plata y placa. Un admin que escribe es un admin que se respeta. Aquí se te respeta.',
    'Segundo puesto con autoridad. Lo que te falta es un puesto. Lo que te sobra, cojones.',
    'Admin en plata. Le pisas los talones a quien va arriba, y todo el grupo lo ve.',
  ],
  [
    'Admin en el podio por los pelos. Con placa y todo, dos personas te han pasado por delante.',
    'Tercer puesto siendo admin. La autoridad no puntúa en el marcador, y este es el resultado.',
    'Admin tercero. Repartes normas desde la tercera fila. Funciona, pero luce poco.',
    'Bronce con autoridad. Nadie te discute, nadie te sigue. Un mando cómodo y silencioso.',
    'Tercer puesto con placa. Un mal mes y sales del podio siendo admin. Eso sí que sería un titular.',
    'Admin en bronce. Un admin en el podio siempre queda bien, aunque sea en el escalón barato.',
    'Bronce con placa. Estás arriba por poco y con cargo. Cualquiera de las dos cosas se puede perder.',
    'Tercer puesto y admin. Ni el que más manda ni el que más habla. El término medio, pero admin.',
    'Bronce y cargo. Suficiente para el podio, insuficiente para que nadie te tenga en cuenta arriba.',
    'Admin en el podio, tercera plaza. Mejor que la mayoría y peor que los dos que importan.',
    'Bronce con autoridad. Un escalón más y serías temido. Uno menos y serías invisible. Aquí estás.',
    'Bronce con placa. Admin y en el podio, que ya es más de lo que hace la mayoría de admins.',
    'Tercer puesto siendo admin. Moderas y además apareces. Hay quien solo hace lo primero.',
    'Admin en el podio. La tercera plaza con cargo pesa más que muchas primeras sin él.',
    'Bronce y autoridad. El grupo sabe que estás, y eso en un admin vale oro.',
    'Tercer escalón con placa. El cuarto ya queda lejos.',
    'Admin de podio. Tercer puesto, y escribiendo, no mirando.',
    'Bronce con cargo. Un admin que aparece en el ranking ya tiene motivos para mandar.',
    'Tercer puesto y placa. Nadie puede decir que te escondes detrás del cargo.',
    'Admin en bronce. Por delante, dos. Por detrás, todo el grupo.',
    'Podio con placa. Tercer puesto y el respeto intacto.',
    'Bronce siendo admin. La autoridad la tienes y la presencia también. Solo falta un escalón.',
    'Tercer lugar con cargo. Ni el cargo te sube ni te baja: te sube lo que escribes.',
    'Admin en el podio. Hay admins que ni saben dónde está el ranking. Tú estás dentro.',
    'Bronce con placa. Estás arriba por méritos, no por el botón.',
    'Tercer puesto y admin. El grupo te lee y te hace caso. Las dos cosas, que es lo difícil.',
    'Admin en bronce. Moderar desde el podio es otra cosa que moderar desde la grada.',
    'Bronce y cargo. Si el grupo tuviera un consejo, tendrías silla.',
    'Tercer escalón con autoridad. Admin y activo, que en este grupo es especie rara.',
    'Podio y placa. El tercer puesto con cargo es el que más cuesta, porque no te lo regala nadie.',
  ],
];

// Fecha del ultimo reseteo, en formato corto. Se calcula a mano en vez de con
// toLocaleDateString porque el locale del servidor no es fiable y en la VPS
// salia en ingles.
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fechaCorta(ms) {
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${dd} ${MESES[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

// Pie del ranking con el origen de los datos: sin esto, un ranking recien
// reseteado parece que el grupo lleva dos dias muerto.
async function pieDeReset(jid) {
  const ts = await getLastReset(jid).catch(() => null);
  if (!ts) return '\n\n_Contando desde el primer mensaje registrado._';
  // Math.max(0, ...) por si el reloj del servidor se movio hacia atras: sin el,
  // una marca "del futuro" imprimia "hace -1 dias".
  const dias = Math.max(0, Math.floor((Date.now() - ts) / 86400000));
  const desde = dias === 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`;
  return `\n\n_Último reset: ${fechaCorta(ts)} (${desde})._`;
}

// Ranking canónico compartido por el board y por "!count @user": solo miembros
// actuales (cruzado con sameUser para puentear LID↔teléfono), sin el owner
// principal (invisible en toda salida), ordenado de más a menos mensajes. Si no
// hay metadata (fetch falló), no se filtra por miembros para no vaciar el top.
function rankedUsers(users, groupMeta) {
  let out = soloMiembros(users, groupMeta);
  out = out.filter(u => !isMainOwner(u.jid, false, groupMeta));
  return out.slice().sort((a, b) => b.count - a.count);
}

async function cmdCount(sock, msg, groupMeta, args) {
  const jid = msg.key.remoteJid;

  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }

  // Solo admins y owner tier. Se cerró por pedido expreso: el ranking de
  // actividad expone el conteo de todo el grupo y no tiene por qué poder
  // sacarlo cualquiera. Resetearlo sigue siendo solo del owner (destructivo).
  const quien = getSender(msg);
  if (!isGroupAdmin(quien, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SOLO_ADMINS, jid, 'admins') }, { quoted: msg });
  }

  // EL COBRO VA AQUI, DESPUES DEL PERMISO, y no en la tabla central.
  //
  // Estaba en COBRO_CENTRAL, que corre ANTES del comando: a un miembro se le
  // cobraban 25 y justo despues le llegaba el "solo los admins". Pagaba por un
  // rechazo. Y el catch del handler solo devuelve el aura cuando salta una
  // excepcion — un `return` no lo es, asi que ese aura no volvia.
  //
  // El orden correcto es permiso -> cobro -> ejecucion, y el unico sitio donde
  // se puede hacer es dentro del comando, que es quien conoce su propio gate.
  const pago = await cobrar(jid, quien, 'count', { fromMe: msg.key.fromMe, groupMeta });
  if (!pago.ok) {
    return sock.sendMessage(jid, { text: textoSinSaldo('count', pago, jid) }, { quoted: msg });
  }

  // !count @mention — o RESPONDIENDO a un mensaje suyo, que es lo natural.
  //
  // Antes solo miraba `mentionedJid`, así que citar el mensaje de alguien y
  // escribir !count encima sacaba el ranking entero como si no hubieras
  // apuntado a nadie. Responder a un mensaje es la forma cómoda de señalar a
  // una persona en WhatsApp — no hay que buscarla en la lista de contactos — y
  // el resto del bot ya la acepta.
  //
  // `getTarget` resuelve las dos: la mención real (mentionedJid, la única
  // fiable, porque un "@numero" escrito a mano no cuadra con los LID de los
  // grupos modernos) y el autor del mensaje citado (contextInfo.participant).
  const mentioned = getTarget(msg);

  if (mentioned) {
    // Del owner principal no se contesta nada. Decir "no tiene mensajes
    // registrados" era señalarlo igual: es la única persona del grupo de la que
    // el bot da esa respuesta, así que preguntarlo dos veces bastaba para
    // deducirlo. El silencio no distingue al owner de un comando que no salió.
    if (isMainOwner(mentioned, false, groupMeta)) return;
    // Se calcula el puesto sobre EXACTAMENTE el mismo ranking que muestra el
    // board (!count): miembros actuales y sin el owner. Si no, el número de
    // puesto de "!count @user" no cuadraría con la tabla (contaría ex-miembros
    // y al owner en el orden).
    const sorted = rankedUsers(await getActiveUsers(jid, 1), groupMeta);
    // sameUser bridges LID↔phone: the mention may be a phone JID while the stored
    // key is the sender's @lid (or vice versa). A plain bareJid compare would miss
    // and wrongly report "0 mensajes" for an active member in a LID group.
    const rankIdx = sorted.findIndex(u => sameUser(u.jid, mentioned));
    const count = rankIdx >= 0 ? sorted[rankIdx].count : 0;
    const phone = mentioned.split('@')[0];
    const msgs = count === 1 ? '1 mensaje' : `${count} mensajes`;
    const rankStr = rankIdx >= 0 ? ` — puesto #${rankIdx + 1}` : '';
    return sock.sendMessage(jid, {
      text: `@${phone} tiene *${msgs}* en este grupo${rankStr}.` + await pieDeReset(jid),
      mentions: [mentioned],
    }, { quoted: msg });
  }

  // !count — top 10 ranking
  const users = rankedUsers(await getActiveUsers(jid, 1), groupMeta);
  if (!users.length) {
    return sock.sendMessage(jid, { text: 'Aun no hay mensajes contados en este grupo.' }, { quoted: msg });
  }

  const top = users.slice(0, 10);
  const mentions = top.map(u => u.jid);
  let text = `*RANKING DE ACTIVIDAD*\n\n`;

  top.forEach((u, i) => {
    const phone = u.jid.split('@')[0];
    const msgs = u.count === 1 ? '1 mensaje' : `${u.count} mensajes`;
    const pos = `*${i + 1}.*`; // numeración clara y consistente del 1 al 10

    if (i < 3) {
      const admin = isAdmin(groupMeta?.participants, u.jid);
      const phrase = pickFresh(admin ? ADMIN_PHRASES[i] : MEMBER_PHRASES[i], `${jid}|count|${i}|${admin ? 'a' : 'm'}`);
      text += `${pos} *@${phone}* — ${msgs}\n`;
      text += `${phrase}\n\n`;
    } else {
      text += `${pos} @${phone} — ${msgs}\n`;
    }
  });

  await sock.sendMessage(jid, { text: text.trimEnd() + await pieDeReset(jid), mentions }, { quoted: msg });
}

// !resetcount — owner only: clears message ranking for this group
async function cmdResetCount(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);

  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: avisoPermiso(jid, sender, groupMeta) }, { quoted: msg });
  }

  // En privado no hay grupo que resetear, así que se borra todo. Antes se
  // llamaba a resetCounts(null), que lanza a propósito para que un null
  // accidental no arrase con los datos: el owner recibía un error interno y el
  // mensaje de "reseteo global" era inalcanzable.
  const scope = jid.endsWith('@g.us') ? jid : null;
  if (scope) await resetCounts(scope);
  else await resetAllCounts();
  await sock.sendMessage(jid, {
    text: scope
      ? 'Contador de mensajes de este grupo reseteado.'
      : 'Contador de mensajes global reseteado (todos los grupos).',
  }, { quoted: msg });
}

module.exports = { cmdCount, cmdResetCount, MEMBER_PHRASES, ADMIN_PHRASES, fechaCorta, rankedUsers };
