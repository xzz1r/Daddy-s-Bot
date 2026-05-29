const { getActiveUsers } = require('../utils/messageCounter');
const { isOwner, getSender, bareJid } = require('../utils/wa');
const { pick, shuffle } = require('../utils/helpers');

// ---- !vs : real-activity head-to-head -------------------------------------

// %W = winner tag, %L = loser tag. Filled in per call.
const VS_ROASTS = [
  '%L que ni se moleste en responder, ya perdió hasta el orgullo.',
  '%W habla, %L observa. Así de simple.',
  '%L lleva tanto tiempo en silencio que ya es parte del mobiliario.',
  '%W domina mientras %L sigue buscando el teclado.',
  '%L escribe menos que un cartel de "no pasar".',
  'Para %L participar es deporte de riesgo. %W ni se despeina.',
  '%W le saca tantos mensajes a %L que parecen de grupos distintos.',
  '%L existe en este grupo en modo solo lectura.',
  'Diferencia brutal. %L tendría que pedir perdón por aparecer.',
  '%W juega en otra liga. %L ni se clasificó.',
  '%L aporta al grupo lo mismo que un mensaje vacío.',
  '%W manda, %L que tome notas.',
  'Si %L hablara la mitad que %W, esto estaría reñido. Pero no.',
  '%L fantasma confirmado. %W con vida propia.',
  '%W aplasta. %L que agradezca que se le mencione.',
  'Esto no fue un duelo, fue una exhibición de %W sobre %L.',
];

function lookupCount(users, jid) {
  const bare = bareJid(jid);
  const u = users.find(x => bareJid(x.jid) === bare);
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

  if (bareJid(a) === bareJid(b)) {
    return sock.sendMessage(jid, { text: 'No puedes enfrentar a alguien consigo mismo.' }, { quoted: msg });
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
  'Lleva tanto tiempo sin hablar que el grupo creía que se había ido.',
  'Modo solo lectura activado desde que entró. Un clásico.',
  'Aparece, lee, y se va sin dejar rastro. El fantasma oficial.',
  'Escribe una vez al mes y se cree con derecho a opinar.',
  'Su última participación ya es historia antigua.',
  'Está aquí solo para enterarse de los chismes, no para aportar.',
  'El típico que reacciona pero nunca escribe.',
  'Más callado que una foto de perfil.',
  'Tiene el grupo en silencio y la dignidad también.',
  'Participa lo mismo que un bot apagado.',
  'Si no fuera por la lista de miembros, nadie sabría que existe.',
  'Leyó este mensaje y tampoco va a contestar, como siempre.',
  'El grupo funcionaría igual sin él y eso es lo triste.',
  'Lurker profesional. Doctorado en mirar sin participar.',
  'Habla menos que una pared, y la pared al menos sostiene algo.',
  'Está suscrito al grupo como quien ve la tele.',
  'Su teclado está nuevo de no usarlo.',
  'Entra solo para ver quién habló y vuelve a desaparecer.',
  'El miembro más decorativo del grupo.',
  'Tiene más tiempo leyendo que el resto escribiendo.',
  'Aporta el mismo contenido que un mensaje borrado.',
  'Vive en visto. Del grupo y de la vida.',
  'Si participar diera puntos, estaría en bancarrota.',
  'El grupo es su Netflix: mira y no interactúa.',
  'Lleva semanas en modo espectador y ni se inmuta.',
  'Más ausente que presente, aunque la app diga lo contrario.',
  'Su silencio ya es una personalidad.',
  'Participación nivel: estatua del parque.',
  'El grupo le da igual hasta que hay drama, ahí sí aparece.',
  'Escribe con cuentagotas y encima cosas que nadie pidió.',
  'Tan inactivo que su nombre suena raro cuando se menciona.',
  'Está aquí de cuerpo presente y de mensajes ausentes.',
  'Reacciona a los memes pero jamás hace uno.',
  'El típico que solo escribe "jajaja" y desaparece otra semana.',
  'Más fantasma que el wifi cuando lo necesitas.',
  'Su actividad es tan baja que cuesta creer que tenga datos.',
  'Entra, ve el último mensaje, y se larga. Rutina diaria.',
  'Aporta tanto al grupo como un asiento vacío a una reunión.',
  'Lleva tanto en silencio que ya nadie le espera respuesta.',
  'El grupo le pesa pero el chisme le tira.',
  'Participación de relleno. Está por estar.',
  'Tan callado que se le olvida que tiene teclado.',
  'Mira la conversación pasar como quien ve llover.',
  'Su récord es leer 200 mensajes y no responder ninguno.',
  'El miembro que todos olvidan que está hasta que sale en esta lista.',
  'Activo solo en sueños. Despierto, ni una palabra.',
  'Más mudo que un acuario.',
  'Tiene la participación en mantenimiento permanente.',
  'El grupo respira y él ni eso aporta.',
  'Le tiene alergia al botón de enviar.',
  'Está en el grupo de adorno, como el muérdago en diciembre.',
  'Escribir le da pereza, leer chismes no. Curioso.',
  'Su última frase con sentido fue hace tanto que no hay registro.',
  'Espectador VIP: butaca reservada, cero participación.',
  'El grupo es su radio: lo deja sonando de fondo.',
  'Tan inactivo que el contador casi lo da por baja.',
  'Habla cuando hay polémica y se esconde el resto del año.',
  'Aporta silencio de calidad, eso hay que reconocerlo.',
  'Si el grupo fuera un examen, entregaría en blanco.',
  'Vive de leer lo que otros se curran escribir.',
  'Más quieto que un maniquí en escaparate.',
  'Su participación tiene el pulso de una línea plana.',
  'Está aquí por inercia, no por ganas.',
  'El típico que pone "+1" y se siente parte de algo.',
  'Lleva el grupo silenciado y la conciencia también.',
  'Tan poco activo que su nombre da error en la memoria del grupo.',
  'El grupo avanza y él se queda en el visto de hace tres días.',
  'Participa una vez y cree que ya cumplió por el mes.',
  'Más frío que el chat a las 4 de la mañana.',
  'Su aporte al grupo cabe en un mensaje y sobra espacio.',
  'El fantasma que aparece solo para ver quién lo mencionó.',
  'Tiene más vistos que mensajes, y por mucho.',
  'Calladito está, pero ni bonito se ve.',
  'Lurkear es su único deporte y lo domina.',
  'El grupo le entra por un ojo y le sale por el otro.',
  'Tan invisible que hasta el bot duda de que exista.',
  'Escribe lo justo para que no lo echen y nada más.',
  'Su silencio no es misterio, es pura pereza.',
  'Aparece en esta lista cada vez. Ya es tradición.',
  'El miembro que el grupo mantiene por costumbre, no por aporte.',
];

// !inactivos — ranks the least-active members (owner exempt) and roasts each.
async function cmdInactivos(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  // Everyone tracked, minus the owner tier (the bot never roasts its own owner).
  let users = await getActiveUsers(jid, 1);
  users = users.filter(u => !isOwner(u.jid, false, groupMeta));

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
