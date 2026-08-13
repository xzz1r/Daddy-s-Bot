const { getActiveUsers, resetCounts, resetAllCounts, getLastReset } = require('../utils/messageCounter');
const { isOwner, isMainOwner, isAdmin, isGroupAdmin, getSender, getTarget, sameUser, soloMiembros } = require('../utils/wa');
const { pickFresh, ordenarPorDureza } = require('../utils/helpers');

let MEMBER_PHRASES = [
  'Número uno. Enhorabuena: eres oficialmente el que menos vida tiene fuera de este chat sin consuelo de manual de autoayuda.',
  'Primer puesto de mensajes: el diploma de no tocar hierba se entrega solo y sin ceremonia con el número hablando solo.',
  'Número uno del contador: el ranking de quien vive dentro de este chat tiene cabeza clara y el archivo queda cerrado hoy.',
  'Top uno de actividad: la vida real acaba de perder un cliente de forma documentada y duele de lo previsible.',
  'Número uno. El grupo ya no se sorprende: el contador solo confirma lo obvio sin derecho a bis ni a matiz.',
  'Primer puesto: adicción al hilo documentada sin ninguna anestesia posible con el chat de testigo obligado.',
  'Número uno del ranking de presencia: el flex más triste y a la vez el más honesto punto final del parte de hoy.',
  'Top del contador: aquí se gana el podio a base de no salir nunca del hilo y no hay segunda lectura útil.',
  'Número uno. La falta de plan B fuera de aquí se mide en mensajes enviados en alta definición de group chat.',
  'Primer puesto de quien no tiene un sitio mejor donde pasar el rato como manda el ranking sin filtro.',
  'Número uno: el historial de mensajes es más largo que algunas relaciones enteras sin descuento emocional posible.',
  'Top uno. El bot solo pone el número a lo que todo el grupo ya veía venir y el contador no miente nunca.',
  'Número uno del chat: enhorabuena por el vacío bien documentado del exterior delante de quien miraba de verdad.',
  'Primer puesto: constancia de residente permanente, no de turista de fin de semana con firma legible en el historial.',
  'Número uno. El ranking no premia calidad de mensaje: premia no irse del hilo y basta de cuento para hoy.',
  'Top del contador: la vida exterior envió sus disculpas y no volvió a llamar al natural, sin barniz de consuelo.',
  'Número uno documentado: adicción al chat con sello oficial del bot que es como duele de verdad aquí.',
  'Primer puesto de mensajes: el grupo se ha convertido en tu sala de estar principal y el resto del hilo es ruido.',
  'Número uno. No es un logro para el currículum: es un diagnóstico en toda regla sin modo avión que lo oculte.',
  'Top uno: quien más escribe no siempre tiene más cosas interesantes que decir con el bot firmando el veredicto.',
  'Número uno del ranking: el silencio del resto del grupo te debe horas de lectura y el grupo ya cambió de tema.',
  'Primer puesto: la hierba del parque no tiene tu número y no lo va a tener en el único idioma del ranking.',
  'Número uno. El contador es el espejo del chat y no maquilla nada sin apelación ni letra pequeña con el saldo escrito a la vista.',
  'Top de actividad: el flex de no tener un sitio mejor al que irse y no hace falta ampliar el parte en el momento más incómodo del chat.',
  'Número uno: este chat tiene un inquilino principal y el contador lo nombra sin que nadie pida repetición.',
  'Primer puesto documentado sin derecho a hacerse el sorprendido con el eco del fail todavía sonando y el sistema cierra sin discusión.',
  'Número uno del hilo: la constancia del que no se despega ni un día delante del ranking y de la cara.',
  'Top uno: enhorabuena por el récord de no tocar el exterior en semanas sin consuelo de manual de autoayuda.',
  'Número uno del ranking de presencia: el bot no discute el dato ni un segundo con el número hablando solo.',
  'Primer puesto: adicción legible en el historial sin necesidad de narrativa y el archivo queda cerrado hoy.',
  'Número uno del contador: el grupo calibra el techo de mensajes contigo y duele de lo previsible sin derecho a bis ni a matiz.',
  'Top de mensajes: la vida real pasó de largo y no dejó recado con el chat de testigo obligado punto final del parte de hoy.',
  'Número uno. No hace falta narrativa heroica: el número basta y sobra y no hay segunda lectura útil en alta definición de group chat.',
  'Primer puesto del que vive aquí de verdad y no de visita como manda el ranking sin filtro sin descuento emocional posible.',
  'Número uno: el diploma no oficial de residente permanente del grupo y el contador no miente nunca delante de quien miraba de verdad.',
  'Top uno del ranking: el bot no abre debate porque el dato cierra el tema con firma legible en el historial.',
  'Número uno de actividad: el flex triste, medible y sin anestesia y basta de cuento para hoy al natural, sin barniz de consuelo.',
  'Primer puesto: quien más llena el hilo no siempre lo eleva de nivel que es como duele de verdad aquí.',
  'Número uno. El contador firma el diagnóstico con números fríos y el resto del hilo es ruido sin modo avión que lo oculte.',
  'Top del chat: la hierba sigue sin conocer tu número de teléfono con el bot firmando el veredicto y el grupo ya cambió de tema.',
  'Número uno documentado: presencia de hierro o simple falta de salida en el único idioma del ranking.',
  'Primer puesto de mensajes: el grupo es el escenario principal de tu día sin apelación ni letra pequeña.',
  'Número uno. La adicción no pide permiso: pide contador y lo tiene con el saldo escrito a la vista y no hace falta ampliar el parte.',
  'Top uno: enhorabuena por no haber tocado el timbre del mundo exterior en el momento más incómodo del chat.',
  'Número uno del ranking de quien no se va nunca del hilo sin que nadie pida repetición con el eco del fail todavía sonando.',
  'Primer puesto: el historial de mensajes pesa más que cualquier bio y el sistema cierra sin discusión.',
  'Número uno. El bot pone el sello a una evidencia que ya era pública delante del ranking y de la cara.',
  'Top de actividad: residente de este chat, no visitante de paso sin consuelo de manual de autoayuda con el número hablando solo.',
  'Número uno del contador: el techo de mensajes del grupo tiene nombre y el archivo queda cerrado hoy.',
  'Primer puesto sin anestesia: el número no miente ni un mensaje y duele de lo previsible sin derecho a bis ni a matiz.'
];

let ADMIN_PHRASES = [
  'Número uno y con galones: el cargo y la adicción al chat viven en el mismo nick sin vergüenza con el chat de testigo obligado.',
  'Admin en el trono de mensajes: el poder y la falta de vida exterior en el mismo paquete punto final del parte de hoy.',
  'El que manda también es el que más escribe: coherencia de quien no tiene un plan B fuera y no hay segunda lectura útil.',
  'Admin número uno en el contador: el grupo no sabe si aplaudir el liderazgo o preocuparse en alta definición de group chat.',
  'Galones y primer puesto de actividad: aquí el liderazgo también se mide en mensajes enviados. Gilipollas.',
  'Admin adicto al hilo: el cargo no quita la urgencia de aparecer en cada conversación como manda el ranking sin filtro.',
  'Número uno con placa de admin: el ranking de presencia tiene jefe visible y permanente sin descuento emocional posible.',
  'El admin que más escribe: el poder no cura la necesidad de no callarse nunca y el contador no miente nunca.',
  'Primer puesto y admin a la vez: el grupo vive bajo un techo de mensajes constantes delante de quien miraba de verdad.',
  'Galones en el ranking de quien no despega del chat: coherencia total del residente con llaves con firma legible en el historial.',
  'Admin en la cima del contador: liderazgo ejercido por saturación de mensajes diarios y basta de cuento para hoy.',
  'El que puede banear también puede quedarse con el primer puesto del ranking de actividad al natural, sin barniz de consuelo.',
  'Número uno admin: el cargo y la adicción firman el mismo parte sin contradicción que es como duele de verdad aquí.',
  'Admin que lidera el ranking de actividad: el resto compite por un segundo lejano y el resto del hilo es ruido.',
  'Galones y más mensajes que nadie: el poder se ejerce también tecleando sin parar sin modo avión que lo oculte.',
  'Admin número uno: el grupo ya no distingue bien el rol del simple hábito de no irse con el bot firmando el veredicto.',
  'El primer puesto del contador tiene placa de admin: sorpresa igual a cero y el grupo ya cambió de tema.',
  'Admin en la cima: quien manda también llena el historial hasta arriba en el único idioma del ranking.',
  'Número uno con galones: la adicción al chat no entiende de jerarquías ni de horarios sin apelación ni letra pequeña.',
  'Admin que no suelta el hilo: el ranking lo confirma en números fríos con el saldo escrito a la vista.',
  'Primer puesto admin: el liderazgo en este grupo es no tener un sitio mejor donde estar y no hace falta ampliar el parte.',
  'Galones en la cima del contador: el resto del ranking mira desde un segundo plano eterno en el momento más incómodo del chat.',
  'Admin adicto documentado: el cargo no es excusa, es amplificador del hábito sin que nadie pida repetición.',
  'Número uno y admin: el pack completo de quien vive dentro de este chat con el eco del fail todavía sonando.',
  'El que manda escribe más que nadie: el contador no miente ni un mensaje y el sistema cierra sin discusión.',
  'Admin en el trono de la actividad: el grupo respira bajo ese techo de presencia delante del ranking y de la cara.',
  'Primer puesto con placa: coherencia de residente permanente con poder real sin consuelo de manual de autoayuda.',
  'Galones y ranking uno: el chat tiene dueño de facto medido en mensajes con el número hablando solo y el archivo queda cerrado hoy.',
  'Admin número uno: la jerarquía y la adicción al hilo son la misma persona y duele de lo previsible sin derecho a bis ni a matiz.',
  'El admin que más aparece: el poder no quita las ganas de estar siempre aquí con el chat de testigo obligado.',
  'Número uno admin documentado por el contador sin ninguna anestesia punto final del parte de hoy y no hay segunda lectura útil.',
  'Admin en la cima: el resto compite por migajas de presencia en el ranking en alta definición de group chat.',
  'Primer puesto y galones: el grupo ya calibró la expectativa hace tiempo como manda el ranking sin filtro.',
  'Admin que lidera por volumen de mensajes: el liderazgo también es ruido medible sin descuento emocional posible.',
  'Galones en el ranking uno: coherencia total del que no se va nunca del hilo y el contador no miente nunca.',
  'Admin número uno: el historial de mensajes es el CV real del cargo delante de quien miraba de verdad.',
  'El que puede silenciar a otros también puede llenar el top sin esfuerzo aparente con firma legible en el historial.',
  'Número uno con placa de admin: el chat lo sabía antes de que el comando lo dijera y basta de cuento para hoy.',
  'Admin en la cima del contador: presencia de hierro combinada con poder de verdad al natural, sin barniz de consuelo.',
  'Primer puesto admin: no hay debate posible, solo números en el ranking que es como duele de verdad aquí.',
  'Galones y adicción al hilo firmadas juntas en la cima del contador y el resto del hilo es ruido sin modo avión que lo oculte.',
  'Admin que no baja del uno: el grupo vive acostumbrado a ese techo de mensajes con el bot firmando el veredicto.',
  'Número uno y admin: el cargo y el hábito de no despegar son la misma cosa aquí y el grupo ya cambió de tema.',
  'El admin del top: liderazgo por saturación de presencia documentada día a día en el único idioma del ranking.',
  'Primer puesto con galones: el ranking no entiende de modestia ni de descansos sin apelación ni letra pequeña.',
  'Admin número uno sin discusión: el contador cierra el tema en una sola línea con el saldo escrito a la vista.',
  'Galones en la cima: quien manda también teclea de más y se nota y no hace falta ampliar el parte en el momento más incómodo del chat.',
  'Admin en el trono de actividad: el resto del grupo acepta el paisaje como está sin que nadie pida repetición.',
  'Número uno y admin: pack de residente permanente con las llaves del grupo con el eco del fail todavía sonando.',
  'El contador pone a este admin en el uno: el grupo ya vivía dentro de esa realidad y el sistema cierra sin discusión.'
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
for (let i = 0; i < MEMBER_PHRASES.length; i++) MEMBER_PHRASES[i] = ordenarPorDureza(MEMBER_PHRASES[i]);
for (let i = 0; i < ADMIN_PHRASES.length; i++) ADMIN_PHRASES[i] = ordenarPorDureza(ADMIN_PHRASES[i]);

module.exports = { cmdCount, cmdResetCount, MEMBER_PHRASES, ADMIN_PHRASES, fechaCorta };
