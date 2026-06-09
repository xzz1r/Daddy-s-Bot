const { getActiveUsers } = require('../utils/messageCounter');
const { isOwner, getSender, bareJid } = require('../utils/wa');
const { pick, shuffle } = require('../utils/helpers');

// ---- !vs : real-activity head-to-head -------------------------------------

// %W = winner tag, %L = loser tag. Filled in per call.
const VS_ROASTS = [
  '%L que ni se moleste en responder, ya perdió hasta el orgullo que no tenía. Fantasma de mierda.',
  '%W habla, %L observa en silencio como el don nadie que es. Así de simple, perdedor.',
  '%L lleva tanto tiempo callado que ya es parte del mobiliario. Un mueble inútil más del grupo.',
  '%W domina mientras %L sigue buscando el teclado con su dedo de fantasma. Patético.',
  '%L escribe menos que un cartel de pared. Aporta lo mismo que un muerto: nada, basura.',
  'Para %L participar es deporte de riesgo. %W ni se despeina aplastando a semejante don nadie.',
  '%W le saca tantos mensajes a %L que parecen de planetas distintos. Humillación total, perdedor.',
  '%L existe en este grupo en modo solo lectura, como el parásito mudo que es. %W lo barre.',
  'Diferencia brutal. %L tendría que pedir perdón por aparecer y luego volver a su agujero.',
  '%W juega en otra liga. %L ni se clasificó porque es un cero a la izquierda con teléfono.',
  '%L aporta al grupo lo mismo que un mensaje borrado: nada de nada. %W manda, basura.',
  '%W manda, %L que tome notas y se calle, que es lo único que sabe hacer ese fantasma.',
  'Si %L hablara la mitad que %W esto estaría reñido. Pero no: %L es un mudo inútil.',
  '%L fantasma confirmado, basura digital. %W con vida propia. No hay color, perdedor.',
  '%W aplasta. %L que agradezca de rodillas que se le mencione siquiera, don nadie.',
  'Esto no fue un duelo, fue una ejecución pública de %W sobre el fantasma de %L.',
  '%L trajo silencio de muerto a un duelo de mensajes. %W ni necesitó esforzarse, perdedor.',
  'Mientras %W llenaba el chat, %L practicaba su único talento: no existir. Patético.',
  '%L perdió por goleada y encima sin presentarse al partido. El fracaso andante de siempre.',
  '%W escribe, %L solo calienta el asiento con su culo de fantasma. Resultado cantado, basura.',
  'A %L le falta voz y le sobra inutilidad. A %W le sobra todo. Diferencia abismal, perdedor.',
  '%L aporta tanto como un silencio incómodo. %W manda y punto. El fantasma a callar.',
  'Comparar a %W con %L es comparar un altavoz con un mueble roto. Sin discusión, basura.',
  '%L se mide con %W y sale corriendo con la cola entre las patas, como el cobarde mudo que es.',
  '%W habla por los dos porque %L ni se molesta en aparecer. Parásito de grupo confirmado.',
  '%L compite en silencio absoluto de fantasma. %W ya había ganado antes de empezar, perdedor.',
  'Si %L escribiera tanto como respira, igual perdía igual contra %W. Inútil hasta para eso.',
  '%W tiene presencia propia, %L tiene modo fantasma permanente. No existe ni queriendo, basura.',
  '%L es el relleno mudo del duelo. %W es el único que de verdad existe aquí. Aplastante.',
  'Que %L ni lo intente. %W lo barre sin despeinarse a ese don nadie silencioso. Patético.',
  '%W aporta vida al chat, %L aporta el vacío de un fantasma que sobra. Diferencia total, perdedor.',
  '%L quedó tan atrás que %W ya ni lo ve en el retrovisor. Polvo en el camino, basura muda.',
  'Hasta el bot escribe más que %L. Eso ya lo sabía %W. El fantasma a su agujero, inútil.',
  '%W demostró quién manda. %L que tome asiento y se calle, como el mudo de siempre.',
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
  'Lleva tanto sin hablar que el grupo creía que se había muerto. Fantasma inútil, ni para eso sirves.',
  'Modo solo lectura activado desde que entró. Un parásito mudo que consume y no aporta una mierda.',
  'Aparece, espía, y se larga sin dejar rastro. El fantasma de mierda oficial del grupo, basura.',
  'Escribe una vez al mes y encima se cree con derecho a opinar. Cállate, don nadie inútil.',
  'Su última participación es historia antigua. Lleva tanto callado que ya nadie recuerda su voz, fantasma.',
  'Está aquí solo para enterarse de los chismes, como la rata curiosa y muda que es. Aporta cero, perdedor.',
  'El típico que reacciona pero nunca escribe. Un cobarde que ni a teclear se atreve. Patético.',
  'Más callado que una lápida, y la lápida al menos tiene algo escrito. Tú nada, fantasma de mierda.',
  'Tiene el grupo en silencio y la dignidad enterrada. Un mudo inútil que ocupa plaza sin merecerla.',
  'Participa lo mismo que un bot apagado. Existes en la lista y en ningún otro sitio, don nadie.',
  'Si no fuera por la lista de miembros, nadie sabría que este fantasma de mierda existe. Cero presencia.',
  'Leyó este mensaje y tampoco va a contestar, como el cobarde mudo de siempre. Predecible y patético.',
  'El grupo funcionaría idéntico sin él, y eso es lo más triste. Sobras por completo, fantasma inútil.',
  'Lurker profesional con doctorado en mirar sin aportar una mierda. Parásito de manual, perdedor.',
  'Habla menos que una pared, y la pared al menos sostiene algo. Tú no sostienes nada, basura muda.',
  'Está suscrito al grupo como quien ve la tele tirado en el sofá. Consume y no da nada, parásito.',
  'Su teclado está nuevo de no usarlo. Lo único que ejercita es el dedo de stalkear, fantasma de mierda.',
  'Entra solo para cotillear quién habló y vuelve a su agujero. La rata muda del grupo, don nadie.',
  'El miembro más decorativo e inútil del grupo. Un adorno mudo que nadie pidió ni echa de menos.',
  'Aporta el mismo contenido que un mensaje borrado: nada de nada. Fantasma sin sustancia, basura.',
  'Vive en visto. Del grupo y de la vida. Un fracasado mudo que ni a responder llega, perdedor.',
  'Si participar diera puntos, estaría en bancarrota total. El más pobre en aportes del grupo, inútil.',
  'El grupo es su Netflix: mira y no interactúa. Parásito de contenido ajeno, fantasma de mierda.',
  'Lleva semanas de espectador mudo y ni se inmuta. Le importa todo una mierda, y se le nota, basura.',
  'Más ausente que presente aunque la app diga lo contrario. Un fantasma con número de teléfono, perdedor.',
  'Su silencio ya es lo único que tiene por personalidad. Vacío por dentro y mudo por fuera, don nadie.',
  'Participación nivel estatua del parque: ahí plantado, juntando polvo, sin servir para nada, inútil.',
  'El grupo le da igual hasta que hay drama, ahí sí sale el fantasma de su agujero. Carroñero mudo, basura.',
  'Escribe con cuentagotas y encima cosas que nadie pidió. Cuando habla, estorba; cuando calla, sobra.',
  'Tan inactivo que su nombre suena raro hasta cuando se menciona. Un don nadie olvidable, fantasma.',
  'Está de cuerpo presente y de mensajes ausentes. Un parásito que ocupa silla sin aportar, perdedor.',
  'Reacciona a los memes pero jamás hace uno. Cobarde creativo, consumidor mudo, basura inútil.',
  'El típico que suelta un "jajaja" y desaparece otra semana entera. Aporte de fantasma, don nadie.',
  'Más fantasma que el wifi cuando lo necesitas. Inútil, ausente y olvidable. El combo completo, perdedor.',
  'Su actividad es tan baja que cuesta creer que tenga el grupo abierto. Parásito mudo de manual, basura.',
  'Entra, ve el último mensaje y se larga. Rutina de fantasma cobarde, día tras día. Patético, inútil.',
  'Aporta al grupo tanto como una silla vacía a una reunión. Cero, nada, don nadie mudo de mierda.',
  'Lleva tanto en silencio que ya nadie le espera respuesta. Un muerto digital que respira datos, fantasma.',
  'Participación de relleno: está por estar, sin servir para una mierda. El parásito eterno, perdedor.',
  'Tan callado que se le olvidó que tiene teclado. Lo usa para stalkear, no para aportar, basura muda.',
  'Mira la conversación pasar como quien ve llover desde su agujero. Espectador inútil, don nadie.',
  'Su récord es leer doscientos mensajes y no responder ni uno. Campeón del parasitismo, fantasma de mierda.',
  'El miembro que todos olvidan que existe hasta que sale en esta lista de la vergüenza. Patético, perdedor.',
  'Activo solo en sueños. Despierto no suelta ni una palabra. Mudo, inútil y cobarde, basura digital.',
  'Tan poco activo que el contador casi lo da de baja por muerto. Fantasma sin pulso, don nadie inútil.',
  'Vive de leer lo que otros se curran escribir. Parásito puro: chupa esfuerzo ajeno y no da nada, perdedor.',
  'Su silencio no es prudencia ni misterio, es pura vagancia de fantasma. Vago, mudo e inútil, basura.',
  'Aparece solo cuando huele drama y el resto del año no existe. Carroñero mudo de manual, don nadie.',
  'Lee como un stalker y participa como un ausente. Doble fracaso en un solo fantasma de mierda, perdedor.',
  'Está en el grupo como el polvo en el mueble: presente, sucio y olvidado. Adorno inútil, basura muda.',
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
