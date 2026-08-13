const { getActiveUsers, resetCounts, resetAllCounts, getLastReset } = require('../utils/messageCounter');
const { isOwner, isMainOwner, isAdmin, isGroupAdmin, getSender, getTarget, sameUser, soloMiembros } = require('../utils/wa');
const { pickFresh } = require('../utils/helpers');

let MEMBER_PHRASES = [
  [
    'Número uno. Enhorabuena de verdad: sostienes el puto ranking a base de escribir. El grupo vive de activos como tú.',
    'Primer puesto de mensajes. No es vergüenza: es el motor del chat. Sigue farmeando presencia, se nota cuando faltas.',
    'Top 1 del contador. Te lo curraste mensaje a mensaje. Mientras otros miran, tú mantienes el hilo vivo.',
    'Número uno. El diploma aquí es por no abandonar el grupo. Eso vale más que diez silencios elegantes.',
    'Primer puesto: adicción productiva al hilo. El chat necesita gente así o se convierte en museo.',
    'Número uno del ranking de presencia. Flex legítimo. El resto puede copiarte o quedarse en decoración.',
    'Top del contador. Aquí se gana el podio escribiendo, no posando. Lo hiciste.',
    'Número uno. Constancia de residente útil. El grupo se siente distinto cuando no estás, y eso es un cumplido.',
    'Primer puesto de quien convierte el chat en sitio con pulso. Gracias por no ser fantasma.',
    'Número uno documentado: presencia real. El ranking solo confirma lo que el hilo ya sabía.',
    'Top uno. La vida del grupo se mide en gente como tú. Sigue, no aflojes el teclado.',
    'Número uno del chat: el historial te respalda. Actividad de la que sostiene conversaciones de verdad.',
    'Primer puesto: no tocaste el modo avión eterno. El contador te lo agradece en público.',
    'Número uno. No es ruido vacío si el grupo sigue vivo. Tú empujas; otros se suben.',
    'Top del contador: ejemplo de farmeo sano. Quien quiera subir que escriba, como tú.',
    'Número uno. El bot pone el número; el respeto se lo gana quien no deja morir el hilo.',
    'Primer puesto de mensajes: liderazgo por presencia. Silencioso o no, se nota el peso.',
    'Número uno. El ranking premia no irse. Tú no te fuiste. Punto a favor enorme.',
    'Top uno: el vacío de los demás no es tu problema. Tú llenaste el tuyo de actividad.',
    'Número uno del ranking: el silencio ajeno te debe horas de lectura. Buen problema tener.',
    'Primer puesto. Hierba o no, aquí dentro eres de los que tiran del carro. Se valora.',
    'Número uno. El contador es espejo de compromiso. En ese espejo saliste bien.',
    'Top del contador. Activos como tú evitan que el grupo huela a abandonado.',
    'Número uno. Enhorabuena: el podio de presencia es el único que se farmea de verdad.',
    'Primer puesto sin anestesia positiva: el número no miente y esta vez habla a tu favor.',
    'Número uno. Sigue escribiendo. El ranking y el grupo se benefician cada vez que lo haces.',
    'Top uno de actividad. No es solo cantidad: es la señal de que este chat te importa.',
    'Número uno. El resto del top te mira de reojo con envidia de teclado. Bien ganado.',
    'Primer puesto: residente permanente del hilo útil. No cambies eso.',
    'Número uno del contador. El grupo no se sostiene solo. Tú eres parte del andamiaje.',
    'Top del ranking. Mensaje a quien mira: esto se sube escribiendo, no esperando.',
    'Número uno. Actividad de la que da ejemplo. Copia permitida y recomendada.',
    'Primer puesto de quien no le tiene miedo al teclado. El chat lo celebra a su manera.',
    'Número uno. Cada mensaje suma al pulso del grupo. Llevas el ritmo de cabeza.',
    'Top uno. El fantasma promedio no entiende este número. Tú sí lo construiste.',
    'Número uno documentado y merecido. Sigue en la cima o pelea por quedarte: eso también anima al resto.',
    'Primer puesto. Presencia que obliga al resto a decidir: escribir o sobrar.',
    'Número uno. El contador te hizo un favor público. Aprovéchalo y no bajes el ritmo.',
    'Top del contador: medalla de no desaparecer. En un grupo, eso es oro.',
    'Número uno. Enhorabuena. Ahora el reto es mantenerlo. El grupo gana si lo intentas.'
  ],
  [
    'Segundo puesto. Casi el trono, y con ${c} o sin él el mensaje es claro: eres de los que mantienen vivo el chat.',
    'Plata de actividad. No es consolación: es top de verdad. El grupo nota cuando escribes.',
    'Número dos del ranking. A un paso del uno y lejos de los fantasmas. Sigue empujando.',
    'Segundo. Presencia seria. Quien quiera subirte tiene que escribir más, no opinar más.',
    'Puesto 2. Actividad de las que sostienen hilos enteros. Bien hecho.',
    'Segundo del contador. El podio te queda bien. No aflojes: el uno se puede cazar.',
    'Plata merecida. Estar aquí arriba se farmea. Tú lo estás farmeando.',
    'Número dos. El chat gana con gente en tu tramo de actividad. Ejemplo útil.',
    'Segundo puesto: compromiso visible. El ranking no regala estas plazas.',
    'Puesto 2 del top. Cerca de la cima y lejos del sótano. Sigue tecleando.',
    'Segundo. Cada mensaje tuyo suma al pulso. El grupo lo usa aunque no lo diga.',
    'Plata de presencia. Mejor plata activa que oro de perfil vacío.',
    'Número dos. Estás en la foto del ranking por algo. Ese algo se llama escribir.',
    'Segundo puesto. El uno hoy, tú mañana si no bajas el ritmo. Así se anima el farmeo.',
    'Puesto 2. Actividad de residente útil. No cambies el hábito.',
    'Segundo del contador. Enhorabuena: estás entre los que tiran del carro.',
    'Plata. El historial te respalda. Sigue sumando; el grupo se beneficia.',
    'Número dos. Casi lideras el peaje diario del hilo. Un empujón más y caes arriba.',
    'Segundo puesto documentado. Presencia real, no postureo.',
    'Puesto 2. Los fantasmas no llegan aquí. Tú sí. Hay nivel.',
    'Segundo. El ranking te pone donde mereces por actividad. Mantén el tipo.',
    'Plata de mensajes. El chat necesita más gente en tu zona del contador.',
    'Número dos. Buen problema: pelear el uno. Eso enciende al resto.',
    'Segundo puesto. Actividad que se respeta. Sigue sin modo avión eterno.',
    'Puesto 2 del top. Estás haciendo el trabajo sucio de mantener el grupo despierto.',
    'Segundo. Enhorabuena. Ahora a no relajarse: el podio se defiende escribiendo.',
    'Plata merecida por no ser decoración. El contador lo grita.',
    'Número dos. Cerca del sol del ranking. El calor se gana a mensajes.',
    'Segundo puesto. Si el grupo respira mejor, es también por activos como tú.',
    'Puesto 2. Sigue. Cada texto empuja tu nombre hacia arriba y anima la tabla.',
    'Segundo del ranking. No es relleno del top: es top de verdad.',
    'Plata. El fantasma promedio mira este puesto y debería ponerse a escribir.',
    'Número dos. Actividad de ejemplo. Copia autorizada para el resto del chat.',
    'Segundo puesto. El contador te hizo justicia. No desaproveches la racha.',
    'Puesto 2. Estás en la zona que sostiene conversaciones. Eso importa.',
    'Segundo. Un paso del uno. La caza es parte de la diversión del ranking.',
    'Plata de presencia. Bien ganado. Sigue sumando.',
    'Número dos del contador. El grupo te ve. Sigue dándole motivos.',
    'Segundo puesto. Motor auxiliar del hilo. Sin vosotros esto se cae.',
    'Puesto 2. Enhorabuena. Ahora a defenderlo con más mensajes, no con excusas.'
  ],
  [
    'Tercer puesto. Podio cerrado con tu nombre. Actividad de las que cuentan de verdad.',
    'Bronce del ranking. No es consuelo: es top 3. El grupo nota esa zona.',
    'Número tres. Estás en la foto grande del contador. Sigue escribiendo.',
    'Tercero. Presencia seria. Fuera del podio empieza el olvido; tú estás dentro.',
    'Puesto 3. Actividad que sostiene. Bien hecho por no quedarte mirando.',
    'Bronce merecido. El farmeo se ve. El resto puede tomar nota.',
    'Número tres del contador. Cerca de la plata, lejos de los fantasmas. Empuja.',
    'Tercer puesto. El podio te queda bien. No aflojes el teclado.',
    'Puesto 3. Cada mensaje suma. Estás en el tramo que mantiene vivo el chat.',
    'Tercero documentado. Presencia real. Enhorabuena.',
    'Bronce de actividad. Mejor esto que un perfil bonito en silencio.',
    'Número tres. El ranking te pone donde la actividad te ha traído. Respeta el hábito.',
    'Tercer puesto. Estás entre los que tiran. El grupo lo usa.',
    'Puesto 3 del top. Un empujón más y huele a plata. Eso anima.',
    'Tercero. Actividad de ejemplo para el que aún no se atreve a escribir.',
    'Bronce. El contador no regala podios. Tú te lo trabajaste.',
    'Número tres. Bien ahí. Ahora a no bajar: el top 3 se defiende.',
    'Tercer puesto. Presencia que obliga a otros a moverse o sobrar.',
    'Puesto 3. El hilo gana contigo dentro del podio. Sigue.',
    'Tercero del ranking. Casi nadie llega aquí sin currárselo. Tú llegaste.',
    'Bronce de mensajes. Se respeta. Sigue sumando.',
    'Número tres. Estás en la zona caliente del contador. Mantén el fuego.',
    'Tercer puesto. Actividad útil. El cementerio del grupo queda más abajo.',
    'Puesto 3. Enhorabuena. El farmeo se nota y contagia, si el resto quiere.',
    'Tercero. Podio. Eso ya es declaración de compromiso con el chat.',
    'Bronce merecido por no desaparecer. Sigue en esa línea.',
    'Número tres del contador. Cerca de los dos de arriba. La caza está abierta.',
    'Tercer puesto. El grupo te ve en el top. No regales la plaza.',
    'Puesto 3. Motor del hilo en versión bronce. Sigue empujando.',
    'Tercero. Actividad de la que hace ranking interesante. Gracias por escribir.',
    'Bronce. Mejor pelear el podio que coleccionar silencios.',
    'Número tres. Documentado. Merecido. Ahora a repetir.',
    'Tercer puesto. Estás haciendo lo que el ranking premia: estar.',
    'Puesto 3 del top. Un hábito de teclado te trajo aquí. No lo sueltes.',
    'Tercero. El fantasma promedio no entiende este bronce. Tú sí.',
    'Bronce de presencia. Enhorabuena. Sigue, el grupo se beneficia.',
    'Número tres. Podio cerrado. Actividad que da ejemplo.',
    'Tercer puesto. Sigue escribiendo: la plata está cerca si no aflojas.',
    'Puesto 3. Ranking justo contigo esta vez. Aprovéchalo.',
    'Tercero del contador. Bien. Ahora defiende el bronce a mensajes.'
  ]
]

let ADMIN_PHRASES = [
  [
    'Número uno y admin: el cargo y la actividad van juntos. Así se lidera de verdad, desde el teclado.',
    'Admin en el trono de mensajes. Poder y presencia. El grupo necesita ese combo, no solo el silenciador.',
    'Top 1 con galones. Te curras el hilo y además lo moderas. Doble turno bien hecho.',
    'Admin número uno del contador. Liderazgo por presencia, no solo por rangos.',
    'Primer puesto admin. El ejemplo se da escribiendo. Lo estás dando.',
    'Galones en la cima del ranking. Quien manda también sostiene el chat. Se nota.',
    'Admin del top 1. El grupo vive acostumbrado a verte en el hilo. Eso estabiliza.',
    'Número uno y admin: pack de residente útil con llaves. El ranking lo confirma.',
    'Admin en el uno. Actividad de quien no delega la vida del grupo solo en los demás.',
    'Top admin de mensajes. El contador te pone donde el compromiso te trajo.',
    'Top uno. La vida del grupo se mide en gente como tú. Sigue, no aflojes el teclado.',
    'Número uno del chat: el historial te respalda. Actividad de la que sostiene conversaciones de verdad.',
    'Primer puesto: no tocaste el modo avión eterno. El contador te lo agradece en público.',
    'Número uno. No es ruido vacío si el grupo sigue vivo. Tú empujas; otros se suben.',
    'Top del contador: ejemplo de farmeo sano. Quien quiera subir que escriba, como tú.',
    'Número uno. El bot pone el número; el respeto se lo gana quien no deja morir el hilo.',
    'Primer puesto de mensajes: liderazgo por presencia. Silencioso o no, se nota el peso.',
    'Número uno. El ranking premia no irse. Tú no te fuiste. Punto a favor enorme.',
    'Top uno: el vacío de los demás no es tu problema. Tú llenaste el tuyo de actividad.',
    'Número uno del ranking: el silencio ajeno te debe horas de lectura. Buen problema tener.',
    'Primer puesto. Hierba o no, aquí dentro eres de los que tiran del carro. Se valora.',
    'Número uno. El contador es espejo de compromiso. En ese espejo saliste bien.',
    'Top del contador. Activos como tú evitan que el grupo huela a abandonado.',
    'Número uno. Enhorabuena: el podio de presencia es el único que se farmea de verdad.',
    'Primer puesto sin anestesia positiva: el número no miente y esta vez habla a tu favor.',
    'Número uno. Sigue escribiendo. El ranking y el grupo se benefician cada vez que lo haces.',
    'Top uno de actividad. No es solo cantidad: es la señal de que este chat te importa.',
    'Número uno. El resto del top te mira de reojo con envidia de teclado. Bien ganado.',
    'Primer puesto: residente permanente del hilo útil. No cambies eso.',
    'Número uno del contador. El grupo no se sostiene solo. Tú eres parte del andamiaje.',
    'Top del ranking. Mensaje a quien mira: esto se sube escribiendo, no esperando.',
    'Número uno. Actividad de la que da ejemplo. Copia permitida y recomendada.',
    'Primer puesto de quien no le tiene miedo al teclado. El chat lo celebra a su manera.',
    'Número uno. Cada mensaje suma al pulso del grupo. Llevas el ritmo de cabeza.',
    'Top uno. El fantasma promedio no entiende este número. Tú sí lo construiste.',
    'Número uno documentado y merecido. Sigue en la cima o pelea por quedarte: eso también anima al resto.',
    'Primer puesto. Presencia que obliga al resto a decidir: escribir o sobrar.',
    'Número uno. El contador te hizo un favor público. Aprovéchalo y no bajes el ritmo.',
    'Top del contador: medalla de no desaparecer. En un grupo, eso es oro.',
    'Número uno. Enhorabuena. Ahora el reto es mantenerlo. El grupo gana si lo intentas.'
  ],
  [
    'Segundo y admin. Casi el trono, con galones y actividad. El grupo gana con ese perfil.',
    'Admin plata del contador. Presencia seria con rango. Sigue.',
    'Puesto 2 admin. Liderazgo visible en el hilo, no solo en el panel.',
    'Segundo. Presencia seria. Quien quiera subirte tiene que escribir más, no opinar más.',
    'Puesto 2. Actividad de las que sostienen hilos enteros. Bien hecho.',
    'Segundo del contador. El podio te queda bien. No aflojes: el uno se puede cazar.',
    'Plata merecida. Estar aquí arriba se farmea. Tú lo estás farmeando.',
    'Número dos. El chat gana con gente en tu tramo de actividad. Ejemplo útil.',
    'Segundo puesto: compromiso visible. El ranking no regala estas plazas.',
    'Puesto 2 del top. Cerca de la cima y lejos del sótano. Sigue tecleando.',
    'Segundo. Cada mensaje tuyo suma al pulso. El grupo lo usa aunque no lo diga.',
    'Plata de presencia. Mejor plata activa que oro de perfil vacío.',
    'Número dos. Estás en la foto del ranking por algo. Ese algo se llama escribir.',
    'Segundo puesto. El uno hoy, tú mañana si no bajas el ritmo. Así se anima el farmeo.',
    'Puesto 2. Actividad de residente útil. No cambies el hábito.',
    'Segundo del contador. Enhorabuena: estás entre los que tiran del carro.',
    'Plata. El historial te respalda. Sigue sumando; el grupo se beneficia.',
    'Número dos. Casi lideras el peaje diario del hilo. Un empujón más y caes arriba.',
    'Segundo puesto documentado. Presencia real, no postureo.',
    'Puesto 2. Los fantasmas no llegan aquí. Tú sí. Hay nivel.',
    'Segundo. El ranking te pone donde mereces por actividad. Mantén el tipo.',
    'Plata de mensajes. El chat necesita más gente en tu zona del contador.',
    'Número dos. Buen problema: pelear el uno. Eso enciende al resto.',
    'Segundo puesto. Actividad que se respeta. Sigue sin modo avión eterno.',
    'Puesto 2 del top. Estás haciendo el trabajo sucio de mantener el grupo despierto.',
    'Segundo. Enhorabuena. Ahora a no relajarse: el podio se defiende escribiendo.',
    'Plata merecida por no ser decoración. El contador lo grita.',
    'Número dos. Cerca del sol del ranking. El calor se gana a mensajes.',
    'Segundo puesto. Si el grupo respira mejor, es también por activos como tú.',
    'Puesto 2. Sigue. Cada texto empuja tu nombre hacia arriba y anima la tabla.',
    'Segundo del ranking. No es relleno del top: es top de verdad.',
    'Plata. El fantasma promedio mira este puesto y debería ponerse a escribir.',
    'Número dos. Actividad de ejemplo. Copia autorizada para el resto del chat.',
    'Segundo puesto. El contador te hizo justicia. No desaproveches la racha.',
    'Puesto 2. Estás en la zona que sostiene conversaciones. Eso importa.',
    'Segundo. Un paso del uno. La caza es parte de la diversión del ranking.',
    'Plata de presencia. Bien ganado. Sigue sumando.',
    'Número dos del contador. El grupo te ve. Sigue dándole motivos.',
    'Segundo puesto. Motor auxiliar del hilo. Sin vosotros esto se cae.',
    'Puesto 2. Enhorabuena. Ahora a defenderlo con más mensajes, no con excusas.'
  ],
  [
    'Tercer puesto admin. Podio con galones. Actividad que da ejemplo al resto.',
    'Admin bronce del ranking. Presencia real. El grupo lo usa.',
    'Puesto 3 con rango. Top 3 y además admin: compromiso doble.',
    'Tercero. Presencia seria. Fuera del podio empieza el olvido; tú estás dentro.',
    'Puesto 3. Actividad que sostiene. Bien hecho por no quedarte mirando.',
    'Bronce merecido. El farmeo se ve. El resto puede tomar nota.',
    'Número tres del contador. Cerca de la plata, lejos de los fantasmas. Empuja.',
    'Tercer puesto. El podio te queda bien. No aflojes el teclado.',
    'Puesto 3. Cada mensaje suma. Estás en el tramo que mantiene vivo el chat.',
    'Tercero documentado. Presencia real. Enhorabuena.',
    'Bronce de actividad. Mejor esto que un perfil bonito en silencio.',
    'Número tres. El ranking te pone donde la actividad te ha traído. Respeta el hábito.',
    'Tercer puesto. Estás entre los que tiran. El grupo lo usa.',
    'Puesto 3 del top. Un empujón más y huele a plata. Eso anima.',
    'Tercero. Actividad de ejemplo para el que aún no se atreve a escribir.',
    'Bronce. El contador no regala podios. Tú te lo trabajaste.',
    'Número tres. Bien ahí. Ahora a no bajar: el top 3 se defiende.',
    'Tercer puesto. Presencia que obliga a otros a moverse o sobrar.',
    'Puesto 3. El hilo gana contigo dentro del podio. Sigue.',
    'Tercero del ranking. Casi nadie llega aquí sin currárselo. Tú llegaste.',
    'Bronce de mensajes. Se respeta. Sigue sumando.',
    'Número tres. Estás en la zona caliente del contador. Mantén el fuego.',
    'Tercer puesto. Actividad útil. El cementerio del grupo queda más abajo.',
    'Puesto 3. Enhorabuena. El farmeo se nota y contagia, si el resto quiere.',
    'Tercero. Podio. Eso ya es declaración de compromiso con el chat.',
    'Bronce merecido por no desaparecer. Sigue en esa línea.',
    'Número tres del contador. Cerca de los dos de arriba. La caza está abierta.',
    'Tercer puesto. El grupo te ve en el top. No regales la plaza.',
    'Puesto 3. Motor del hilo en versión bronce. Sigue empujando.',
    'Tercero. Actividad de la que hace ranking interesante. Gracias por escribir.',
    'Bronce. Mejor pelear el podio que coleccionar silencios.',
    'Número tres. Documentado. Merecido. Ahora a repetir.',
    'Tercer puesto. Estás haciendo lo que el ranking premia: estar.',
    'Puesto 3 del top. Un hábito de teclado te trajo aquí. No lo sueltes.',
    'Tercero. El fantasma promedio no entiende este bronce. Tú sí.',
    'Bronce de presencia. Enhorabuena. Sigue, el grupo se beneficia.',
    'Número tres. Podio cerrado. Actividad que da ejemplo.',
    'Tercer puesto. Sigue escribiendo: la plata está cerca si no aflojas.',
    'Puesto 3. Ranking justo contigo esta vez. Aprovéchalo.',
    'Tercero del contador. Bien. Ahora defiende el bronce a mensajes.'
  ]
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
  return `${dd} ${MESES[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}.`;
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
    return sock.sendMessage(jid, { text: 'Este comando solo funciona en grupos.' }, { quoted: msg });
  }

  // Solo admins y owner tier. Se cerró por pedido expreso: el ranking de
  // actividad expone el conteo de todo el grupo y no tiene por qué poder
  // sacarlo cualquiera. Resetearlo sigue siendo solo del owner (destructivo).
  const quien = getSender(msg);
  if (!isGroupAdmin(quien, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo los admins pueden ver el ranking.' }, { quoted: msg });
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
      const phrase = pickFresh(admin ? ADMIN_PHRASES[i] : MEMBER_PHRASES[i], `${jid}|count|${i}|${admin ? 'a' : 'm'}.`);
      text += `${pos} *@${phone}* — ${msgs}\\n.`;
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
    return sock.sendMessage(jid, { text: 'No tienes permiso para usar esto.' }, { quoted: msg });
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

// El bot abre con lo mas fuerte que tiene: los pools de insultos se ordenan
// de mas duro a mas suave UNA vez, al cargar, y pickFresh sesga la eleccion
// hacia la cabecera. Los pools neutros (cabeceras, cierres) no se tocan:
// ahi la "dureza" no significa nada.

module.exports = { cmdCount, cmdResetCount, MEMBER_PHRASES, ADMIN_PHRASES, fechaCorta };
