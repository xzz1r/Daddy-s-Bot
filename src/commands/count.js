const { getActiveUsers, resetCounts, resetAllCounts } = require('../utils/messageCounter');
const { isOwner, isMainOwner, isAdmin, getSender, sameUser, soloMiembros } = require('../utils/wa');
const { pick, pickFresh } = require('../utils/helpers');

const MEMBER_PHRASES = [
  [
    'Número uno. Enhorabuena: eres oficialmente el que menos vida tiene aquí, y encima con diploma.',
    'Primero del ranking. Nadie escribe tanto por gusto, campeón. Eso ya no es afición, es un diagnóstico.',
    'Lideras el grupo a base de no callarte ni debajo del agua. Es una forma de mandar. Cutre, pero funciona.',
    'El grupo es tuyo y de nadie más. Lo has conquistado hablando solo, que tiene su mérito y su tristeza.',
    'Primer puesto. Mientras los demás tenían planes, tú tenías teclado. Aquí se te premia, fuera no.',
    'Nadie te ha ganado y nadie lo va a intentar. Competir contigo es aceptar que tampoco tienes nada que hacer.',
    'Número uno indiscutible. El grupo entero podría callarse y tú seguirías manteniendo la conversación solo.',
    'Corona merecida. Escribes más que todos los de abajo juntos, y eso dice más de tu agenda que de tu carisma.',
    'Primero. Si el grupo se cae, se cae contigo dentro, porque no piensas soltarlo ni muerto.',
    'Mandas aquí y solo aquí. Fuera de esta pantalla sigues siendo exactamente igual de irrelevante que ayer.',
    'La cima es tuya. Un aplauso para el único que trata un grupo de WhatsApp como si fuera un puto trabajo.',
    'Número uno por goleada. No es talento, es que no tienes otra cosa que hacer. Pero el marcador no distingue.',
    'Primer lugar. Has ganado a base de insistencia, que es lo único que se te da bien y no vas a soltar.',
    'El trono es tuyo. Lo ocupas desde hace tanto que ya nadie recuerda si hubo alguien antes.',
    'Ganas porque no descansas. Eso en el mundo real se llama problema; aquí se llama liderazgo.',
    'Número uno. Cuando alguien pregunta quién mueve este grupo, salta tu nombre antes de que lo pregunten.',
    'Primero y con margen. Los de abajo no te persiguen, te miran de lejos y aceptan que no llegan.',
    'El grupo respira a tu ritmo. Da un poco de miedo, pero funciona y nadie se atreve a decirlo.',
    'Corona sin discusión. Escribir tanto no te hace interesante, pero te hace imposible de ignorar.',
    'Primero. Eres la prueba de que la constancia gana a la calidad cuando el jurado es un contador.',
    'Número uno. El grupo sin ti sería más tranquilo y muchísimo más muerto. Elegimos ruido.',
    'Lideras. Y lo mejor es que ni te lo propusiste: simplemente no sabes estar callado y salió bien.',
    'Primer puesto por derecho propio. Nadie te lo regaló y nadie te lo va a quitar. Que descansen los demás.',
    'La corona te queda grande en todo menos aquí. Aquí te queda clavada. Disfrútala, que es lo único que hay.',
    'Número uno. Has convertido no tener nada que hacer en una carrera profesional. Respeto y pena a partes iguales.',
    'Primero del grupo. Si esto pagara en dinero en vez de en aura, ya estarías jubilado.',
    'Ganador absoluto. El resto compite por el segundo puesto porque el primero lo tienes en propiedad.',
    'Número uno. Tu móvil debe oler a quemado. Bien hecho, supongo.',
    'Encabezas la lista. No por listo, no por gracioso: por pesado. Y el marcador solo mide eso.',
    'Primero. Mientras otros piensan qué decir, tú ya lo has dicho tres veces. Rápido y sin filtro.',
    'La cima es tuya y se te nota. Aquí mandas, aquí hablas, aquí existes. Aprovecha, que fuera nadie te escucha.',
    'Número uno. El grupo es tu casa, tu bar y tu terapia. Ojalá fuera solo una de las tres.',
    'Primer lugar. Has ganado a todos los que sí tienen vida social. Piénsalo despacio.',
    'Corona puesta. Nadie ha escrito tanto en menos tiempo sin que le paguen por ello. Nadie sano, al menos.',
    'Número uno indiscutible. Tu constancia asusta un poco y el ranking te lo agradece igual.',
    'Primero. El resto del grupo va a rebufo tuyo y ni se plantea adelantarte. Se han rendido, y bien.',
    'Mandas en el marcador. Es un mando pequeño, sin sueldo y sin gloria, pero es tuyo enterito.',
    'Número uno. Si esto fuera un deporte, ya te habrían hecho un control antidoping. Y saldría positivo en aburrimiento.',
    'Primero del ranking. La diferencia contigo y el segundo no es de talento: es de horas libres.',
    'Cabeza de la tabla. Nadie discute tu sitio porque nadie quiere el trabajo que cuesta mantenerlo.',
  ],
  [
    'Segundo. Tan cerca del primero que duele, y aun así no lo has alcanzado. Otra vez será. O no.',
    'Plata. El puesto de los que casi lo consiguen y se conforman con contarlo después.',
    'Segundo lugar. Le ves la espalda al primero todos los días y sigues sin adelantarlo. Piénsatelo.',
    'Casi. Y casi no vale una mierda en ningún ranking del mundo, tampoco en este.',
    'Número dos. Escribes mucho, sí. Pero hay alguien que escribe más y no piensa cansarse.',
    'Plata con ganas de oro. Ganas es lo único que llevas de más; lo demás te falta.',
    'Segundo. Estás ahí por insistencia, no por brillo. Igual que el primero, pero peor.',
    'El eterno segundo tiene su encanto: nadie lo odia porque nadie lo teme. Enhorabuena, supongo.',
    'Número dos. A un mal día del primero de subir, y a dos buenos días del tercero de bajar. Tensa la cosa.',
    'Plata. El grupo te ve, te lee y luego mira arriba. Así de simple y así de jodido.',
    'Segundo puesto. Has dado todo lo que tienes y ha valido para ser el mejor de los que pierden.',
    'Casi lo tocas. Casi. Y ese casi lleva persiguiéndote más tiempo del que reconoces en público.',
    'Número dos. Nadie recuerda al segundo, pero al menos sales en la foto. Es algo.',
    'Plata merecida. Te falta el empujón que separa a los que quieren de los que pueden.',
    'Segundo. Si el primero se fuera del grupo, serías el rey. Reza, que trabajar no te ha funcionado.',
    'Estás a un escalón y llevas ahí una eternidad. A eso ya no se le llama subir, se le llama vivir.',
    'Número dos. Escribes como si te fuera algo en ello. Y sigue sin irte nada, para tu desgracia.',
    'Plata. El puesto perfecto para el que quiere protagonismo sin asumir la responsabilidad de tenerlo.',
    'Segundo lugar. Cerca del trono, lejos de sentarte. La historia de tu puta vida, probablemente.',
    'Casi primero. Que en el mundo real se traduce como: no.',
    'Número dos. Aprietas, se te nota, y aun así el marcador no se mueve. Frustrante de ver desde fuera.',
    'Plata. Le vas pisando los talones a alguien que ni se ha girado a mirarte. Duro pero real.',
    'Segundo. En un grupo más flojo serías el primero. Elige mejor tus batallas la próxima vez.',
    'Estás arriba, pero no en lo alto. Y aquí esa diferencia es todo lo que importa.',
    'Número dos. Te sobra presencia y te falta el último empujón. Lleva faltándote desde el principio.',
    'Plata otra vez. A este paso te van a poner tu nombre al puesto para no tener que actualizarlo.',
    'Segundo lugar. Nadie duda de que estás aquí. Todos dudan de que puedas estar más arriba.',
    'Casi el mejor. O sea, no el mejor. Que es exactamente lo mismo que ser el tercero con más suerte.',
    'Número dos. Aportas de sobra, pero el primero aporta más y encima duerme menos. No hay tu tía.',
    'Plata. El grupo te lee y te responde. Y luego se va a leer al de arriba. Que le vamos a hacer.',
    'Segundo. Con más horas serías primero, pero entonces tampoco tendrías vida. Tú decides qué prefieres.',
    'Vas segundo porque el primero es una máquina. Consuélate: perder contra eso no es del todo humillante.',
    'Número dos. Todo el mundo sabe quién eres. Nadie te pone el primero. Rumia eso un rato.',
    'Plata. Buen puesto para quien se conforma. Malo para quien no. Ya sabrás tú cuál eres.',
    'Segundo lugar y sin excusas: has tenido el mismo tiempo que el primero y lo has usado peor.',
    'Casi. El grupo entero ha visto lo cerca que estuviste y lo poco que sirvió al final.',
    'Número dos. Ni te vas a ir ni vas a subir. El purgatorio del ranking, y llevas allí meses.',
    'Plata. Presencia constante, resultado insuficiente. Bienvenido al club de los segundos eternos.',
    'Segundo. Alguien tiene que estar debajo del rey, y hoy te ha tocado a ti otra vez.',
    'Estás a nada de la cima y esa nada pesa más de lo que jamás vas a admitir en voz alta.',
  ],
  [
    'Tercero. En el podio de milagro y por los pelos. Un mal día y estás fuera de la foto.',
    'Bronce. El último puesto que la gente recuerda. El primero que la gente olvida.',
    'Tercer lugar. Ni mandas, ni persigues: rellenas. Alguien tiene que hacerlo, supongo.',
    'Estás en el podio agarrado con las uñas. Suéltate un día y te caes sin que nadie lo note.',
    'Tercero. El puesto de los que aportan lo justo para que no se les eche de menos ni de más.',
    'Bronce. Suena a premio hasta que recuerdas que solo significa que dos te ganaron.',
    'Tercer puesto. Llegas al podio como quien llega al último vagón: jadeando y sin sitio.',
    'Tercero. Muy visible para desaparecer, muy poca cosa para mandar. El limbo perfecto.',
    'Bronce. Aportas, sí. Pero de los tres eres el que menos y eso el marcador lo canta.',
    'Tercer lugar. El primero manda, el segundo aprieta y tú haces bulto en la parte bonita de la tabla.',
    'Tercero. Un par de días flojos y este mensaje se lo lleva otro. Presión sana, la llaman.',
    'Bronce. Estás en el podio y en la cuerda floja a la vez. Un equilibrio de mierda pero es el tuyo.',
    'Tercer puesto. Ni te falta constancia ni te sobra: tienes exactamente la justa para no bajar.',
    'Tercero. La gente te reconoce, nadie te teme. Es una posición cómoda y absolutamente inofensiva.',
    'Bronce. Los dos de arriba no te miran y los de abajo sí. Vive con eso.',
    'Tercer lugar. Has llegado al podio y ahí se te acabaron las ideas. Se nota.',
    'Tercero. En un grupo de dos serías segundo. Aquí, el que cierra la fiesta.',
    'Bronce. El grupo te tiene fichado como uno de los que están. No como uno de los que mandan.',
    'Tercer puesto. Escribes bastante y aun así te sobran dos personas por delante. Hay margen.',
    'Tercero. El que se conforma con el podio nunca sube de ahí. Y tú llevas conformándote un rato.',
    'Bronce. Un puesto honesto: dice exactamente lo que aportas, ni más ni menos.',
    'Tercer lugar. Podrías apretar y no lo haces. Eso ya no es falta de tiempo, es falta de ganas.',
    'Tercero. Te salva la constancia, no el volumen. Si aflojas una semana, adios podio.',
    'Bronce. Estás donde estás porque el cuarto es todavía más flojo. Duro pero honesto.',
    'Tercer puesto. El grupo te lee, te contesta y luego sigue con lo suyo. Presencia sin peso.',
    'Tercero. Ni protagonista ni extra: secundario con frase. Peor sitio hay.',
    'Bronce. Podio por los pelos, respeto por defecto. No te acomodes que se te ve el plumero.',
    'Tercer lugar. Los de arriba llevan otro ritmo y tú lo sabes. Por eso no aprietas: te ahorras el ridículo.',
    'Tercero. Aportas lo suficiente para contar y lo justo para no destacar. Un equilibrio muy tuyo.',
    'Bronce. Que estés aquí no es casualidad, pero que no subas tampoco.',
    'Tercer puesto. El podio se te queda grande y el cuarto puesto te queda pequeño. Estás justo donde te toca.',
    'Tercero. Suficiente para salir en la foto, insuficiente para salir en la conversación.',
    'Bronce. Llevas meses en el mismo escalón. O eso es estabilidad o es que te has rendido.',
    'Tercer lugar. Nadie te va a hacer un homenaje por esto, pero tampoco te van a olvidar. Empate.',
    'Tercero. Estás en la parte alta y en la mitad de la nada al mismo tiempo. Habilidad rara.',
    'Bronce. Un escalón más y hablaríamos. Uno menos y no hablaríamos de ti en absoluto.',
    'Tercer puesto. El grupo funciona contigo, pero no gracias a ti. Matiz importante.',
    'Tercero. La medalla más barata del podio, pero es una medalla. Agárrala fuerte.',
    'Bronce. Cumples. Y cumplir es exactamente lo mínimo que se espera de alguien que quiere estar arriba.',
    'Tercer lugar. Ni gloria ni vergüenza. El puesto más tibio que existe, y es el tuyo.',
  ],
];

const ADMIN_PHRASES = [
  [
    'Número uno Y con galones. El cargo y la adicción en la misma persona. El grupo no tiene escapatoria.',
    'Primero del ranking siendo admin. Mandas de verdad y encima no te callas. Combinación terrorífica.',
    'Admin y líder del marcador. Nadie va a discutirte nada, entre otras cosas porque no les dejas hablar.',
    'Tienes el cargo y la corona. Lo raro sería que alguien se atreviese a quejarse de algo aquí.',
    'Número uno con placa. Otros admins reparten órdenes; tú además rellenas el chat tú solo.',
    'Primero y admin. El poder aquí esta muy mal repartido y encima te lo has ganado. Que rabia.',
    'Admin en la cima. El grupo es tuyo por cargo y por insistencia. Doble título, cero vida.',
    'Número uno con galones. Trabajas el grupo más que muchos su empleo. Preocupante y admirable.',
    'Admin y primero. Cuando mandas se nota, y cuando hablas también. No hay descanso contigo.',
    'La corona y la placa en la misma cabeza. Este grupo tiene dictador y encima elegido por el marcador.',
    'Primero del grupo llevando el cargo. Ninguno de los de abajo te va a toser, y hacen bien.',
    'Admin número uno. Podrías moderar callado como todos y en vez de eso lo lideras a gritos. Respeto.',
    'Número uno con autoridad real. La diferencia entre mandar y estar es esa, y tú estás de sobra.',
    'Admin y primero por goleada. El cargo te lo dieron; el puesto te lo has currado a base de no parar.',
    'La cima con galones. Nadie te va a quitar ninguna de las dos cosas, y menos por las buenas.',
    'Primero siendo admin. Lo tuyo con este grupo ya no es responsabilidad, es dependencia.',
    'Admin en lo alto del marcador. Repartes normas y además cumples la de escribir más que nadie.',
    'Número uno con cargo. El grupo te tiene miedo y te tiene leído. Combinación imbatible.',
    'Admin y líder. Otros usan el cargo para no hacer nada; tú lo usas y encima haces el doble.',
    'Primero del ranking con placa. Si algún día te vas, este grupo se queda mudo y sin ley a la vez.',
    'Admin número uno. No hace falta que recuerdes que mandas: el contador ya lo grita por ti.',
    'La corona te sienta bien porque ya venias con el cargo puesto. Aquí no hay sorpresa.',
    'Primero y admin. El único que puede echarte de aquí eres tú mismo, y no pareces por la labor.',
    'Número uno con galones. Un admin que participa vale por diez que solo miran. Y tú vales por veinte.',
    'Admin en la cima del marcador. La autoridad se te nota en el cargo y el vicio en las cifras.',
    'Primero llevando el cargo. Este grupo funciona porque tú no te despegas de él ni para dormir.',
    'Admin y primero. Repartes justicia entre mensaje y mensaje. Nadie sabe cuando descansas.',
    'La placa y el trono. Si esto fuera un país, seríais tú, tú y otra vez tú.',
    'Número uno con autoridad. El grupo no se te desmadra porque no le das ni tiempo a intentarlo.',
    'Admin en primera posición. Mandar es fácil; mandar escribiendo más que todos ya es otra cosa.',
  ],
  [
    'Segundo y admin. Tienes el cargo pero no el marcador. Alguien de abajo te esta ganando en su terreno.',
    'Plata con galones. Mandas más que hablas, y aquí eso se paga con el segundo puesto.',
    'Admin en el segundo escalón. Un miembro sin placa te lleva la delantera. Digiérelo como puedas.',
    'Segundo lugar siendo admin. El cargo lo tienes; la corona la tiene otro. Incómodo, verdad.',
    'Plata y placa. Te sobra autoridad y te falta un empujón en el contador. Justo lo que no se ordena.',
    'Admin número dos. Podrías ser primero si dedicaras al grupo lo que dedicas a vigilarlo.',
    'Segundo con galones. Ganas en poder y pierdes en presencia. Elige que te importa más.',
    'Plata con cargo. Nadie te discute la autoridad, pero el marcador te discute todo lo demás.',
    'Admin segundo. Estar cerca del primero llevando placa es casi peor que estar lejos. Casi.',
    'Segundo puesto y admin. El cargo no puntúa aquí, y se nota justo en este renglón.',
    'Plata con autoridad. Tienes lo que más cuesta conseguir y aun así te falta lo más fácil: aparecer más.',
    'Admin en plata. El primero no manda nada y te esta ganando. Piensa en eso esta noche.',
    'Segundo siendo admin. Mandas en el grupo y obedeces al contador. Ironías de la vida.',
    'Plata y galones. Buen equilibrio entre currar el cargo y no vivir enganchado. O eso te dices.',
    'Admin número dos. Un escalón te separa de tenerlo todo. Un escalón y bastantes horas.',
    'Segundo con placa. La autoridad te la dieron, el puesto te lo están disputando. Defiéndelo.',
    'Plata con cargo. Ser el segundo más activo llevando galones tampoco esta mal. Pero no es ser el primero.',
    'Admin segundo. Repartes normas de sobra y mensajes justos. El marcador solo cuenta los segundos.',
    'Segundo lugar y admin. Tienes el poder de callar a cualquiera y aun así hablas menos que el de arriba.',
    'Plata y placa. Nadie va a quitarte el cargo. El puesto en cambio está bastante en el aire.',
    'Admin en segunda posición. Cerca de todo y dueño de la mitad. Podría ser peor.',
    'Segundo con galones. Que un miembro raso te gane el marcador dice mucho de sus horas libres. Y de las tuyas.',
    'Plata con autoridad real. Aquí mandas tú y escribe otro. Reparto raro pero estable.',
    'Admin número dos. Aprieta un poco y lo tienes todo. Sigue así y tendrás solo el cargo.',
    'Segundo siendo admin. El grupo te respeta por la placa y te lee por costumbre. Ambas cosas cuentan.',
    'Plata y cargo. Estás justo donde se está cómodo: con poder y sin la obligación de ser el más visible.',
    'Admin segundo. Un día decidirás subir y el primero se va a llevar un susto. O no. Tu verás.',
    'Segundo puesto con placa. Autoridad sobrada, presencia mejorable. Ya sabes por donde va la cosa.',
    'Plata con galones. El cargo pesa y aun así apareces. Eso ya es más de lo que hacen la mayoría.',
    'Admin en plata. Segundo del grupo y primero en poder. Un empate que solo tú puedes romper.',
  ],
  [
    'Tercero y admin. El cargo te salva de bajar más, pero de subir no te salva nadie.',
    'Bronce con galones. Mandas mucho y apareces poco. Aquí eso se ve en un solo renglón.',
    'Admin en el podio por los pelos. Con placa y todo, dos personas te han pasado por delante.',
    'Tercer puesto siendo admin. La autoridad no puntúa en el marcador, y este es el resultado.',
    'Bronce y placa. Estás en el podio porque el cuarto tampoco aprieta. Consuélate con eso.',
    'Admin tercero. Repartes normas desde la tercera fila. Funciona, pero luce poco.',
    'Tercer lugar con cargo. Tienes poder de sobra y ganas justas. El contador solo mide las segundas.',
    'Bronce con autoridad. Nadie te discute, nadie te sigue. Un mando cómodo y silencioso.',
    'Admin en bronce. Los dos de arriba no llevan placa y aun así mandan más en la conversación.',
    'Tercero con galones. Estás en el podio de milagro y el milagro se llama constancia mínima.',
    'Bronce y cargo. Cumples con el grupo lo justo para no ser el admin fantasma. Lo justo.',
    'Admin tercero. La placa te da autoridad; el ranking te recuerda que la autoridad no es presencia.',
    'Tercer puesto con placa. Un mal mes y sales del podio siendo admin. Eso sí que sería un titular.',
    'Bronce con galones. Moderas bien y hablas poco. Hay perfiles peores, pero también bastante mejores.',
    'Admin en el tercer escalón. Podrías subir cuando quisieras y llevas sin querer bastante tiempo.',
    'Tercero y admin. El grupo te tiene respeto por el cargo y ninguna costumbre de leerte.',
    'Bronce con cargo. En el podio por obligación y no por vicio. Se nota la diferencia.',
    'Admin tercero. Tienes el poder de estar en todas partes y eliges estar en pocas.',
    'Tercer lugar con placa. La autoridad la ejerces; la presencia la administras con cuentagotas.',
    'Bronce y galones. Aportas lo suficiente para justificar el cargo. Justo eso y ni un mensaje más.',
    'Admin en bronce. Un admin en el podio siempre queda bien, aunque sea en el escalón barato.',
    'Tercero con autoridad. Mandar cansa, hablar también. Has elegido cansarte solo en lo primero.',
    'Bronce con placa. Estás arriba por poco y con cargo. Cualquiera de las dos cosas se puede perder.',
    'Admin tercero. El grupo funciona contigo dentro, aunque a veces cueste notar que estás.',
    'Tercer puesto y admin. Ni el que más manda ni el que más habla. El término medio con galones.',
    'Bronce y cargo. Suficiente para el podio, insuficiente para que nadie te tenga en cuenta arriba.',
    'Admin en el podio, tercera plaza. Mejor que la mayoría y peor que los dos que importan.',
    'Tercero con galones. La placa te sostiene el puesto mejor de lo que lo sostienen tus mensajes.',
    'Bronce con autoridad. Un escalón más y serías temido. Uno menos y serías invisible. Aquí estás.',
    'Admin tercero. Cumples, moderas y apareces. Los tres verbos en su versión mínima, pero cumples.',
  ],
];

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
    return sock.sendMessage(jid, { text: 'Este comando solo funciona en grupos.' }, { quoted: msg });
  }

  // Open to all members, like its siblings (!vs, !inactivos, !top) — they read
  // the same store and expose the same per-user counts, so gating only !count
  // protected nothing. Resetting the ranking stays owner-only (destructive).

  // !count @mention — stats for a specific person.
  // Only trust real WhatsApp mentions (mentionedJid); raw "@number" text matches
  // are unreliable with LIDs in modern groups.
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

  if (mentioned) {
    // El owner principal es invisible en el ranking: no revelamos su puesto ni
    // su conteo, respondemos como si no hubiera datos suyos.
    if (isMainOwner(mentioned, false, groupMeta)) {
      const phone = mentioned.split('@')[0];
      return sock.sendMessage(jid, {
        text: `@${phone} no tiene mensajes registrados en este grupo.`,
        mentions: [mentioned],
      }, { quoted: msg });
    }
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
      text: `@${phone} tiene *${msgs}* en este grupo${rankStr}.`,
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

  await sock.sendMessage(jid, { text: text.trimEnd(), mentions }, { quoted: msg });
}

// !resetcount — owner only: clears message ranking for this group
async function cmdResetCount(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);

  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo el owner puede resetear el contador.' }, { quoted: msg });
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

// Los pools se exportan para que las pruebas puedan comprobar de que bolsa
// salio cada frase en vez de adivinarlo por palabras sueltas.
module.exports = { cmdCount, cmdResetCount, MEMBER_PHRASES, ADMIN_PHRASES };
