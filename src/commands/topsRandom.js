const { getActiveUsers } = require('../utils/messageCounter');
const { isMainOwner, soloMiembros } = require('../utils/wa');
const { shuffle, pickFresh } = require('../utils/helpers');

// Remates del ranking.
//
// Dos reglas para escribirlos:
//   1. Se burlan de LOS QUE SALEN. Un top puede tener un tema humillante y un
//      remate animando a la gente quedaba ridículo: el bot felicitaba a quien
//      acababa de exponer. Aquí nadie sale bien parado.
//   2. Valen para cualquier tema. El tema lo pone quien escribe el comando y
//      puede ser halago o insulto, así que la burla apunta al hecho de estar en
//      la lista, no a lo que dice la lista.
//
// Marcadores: {1} = el primero, {U} = el último, {N} = cuántos salen.
const CIERRES = [
  '{1} encabeza la lista y ya está decidiendo si le conviene. No le conviene.',
  'Los {N} de arriba fingiendo que les da igual. A ninguno le da igual.',
  'No era un premio, era una exposición. Que se note la diferencia.',
  '{1} ya tiene la captura hecha. Es lo más lejos que va a llegar.',
  'El primero que diga que el bot se equivocó es el que más de acuerdo estaba.',
  'Salir aquí no os hace especiales. Os hace visibles, que es bastante peor.',
  '{U} cierra la lista y respira aliviado. Sigue estando en la lista.',
  'Los {N} nombrados llevan un minuto releyendo esto. Sigue diciendo lo mismo.',
  'Aquí no hay ganadores. Hay {N} personas que preferirían no salir.',
  '{1} arriba del todo, como si eso alguna vez hubiera sido bueno.',
  'La lista es la lista. Los que salen ya sabían que iban a salir.',
  'Ninguno de los {N} va a comentar esto. Todos lo han leído dos veces.',
  '{1} y {U} en la misma lista. Distinto puesto, misma vergüenza.',
  'El bot elige al azar y aun así salisteis vosotros. Piensa en eso.',
  'Sin jurado, sin apelación y sin piedad. Los {N} quedan retratados.',
  'A los mencionados: el silencio también cuenta como respuesta.',
  '{1} se lo está creyendo. Que alguien se lo baje, por favor.',
  'Los {N} de la lista ahora mismo buscando cómo salir del tema. No hay forma.',
  'Anotado en acta. Que conste para cuando lo intenten negar.',
  'Cuatro reaccionan con risa y uno se ofende. Siempre pasa lo mismo.',
  '{U} en el último puesto y aliviado. Alivio de {N} segundos, luego lo relee.',
  'Quien proteste confirma la lista. Quien calle también. Elegid.',
  'El bot no tiene amigos ni memoria. Solo tiene esta lista.',
  '{1} de primero. Alguien tenía que serlo y mira quién fue.',
  'Los {N} sois el tema del grupo durante el resto del día. De nada.',
  'Ranking cerrado. Las quejas por escrito y a nadie.',
  'Si alguno se ríe muy fuerte es porque salió y no lo lleva bien.',
  '{1} arriba, {U} abajo y el resto rezando por no ser mencionados otra vez.',
  'Nadie ha pedido explicaciones porque nadie las quiere oír.',
  'Los {N} quedan avisados. La próxima lista también la hace el bot.',
];

function rellenar(plantilla, picked) {
  const tag = (u) => `@${u.jid.split('@')[0]}`;
  return plantilla
    .replace(/\{1\}/g, tag(picked[0]))
    .replace(/\{U\}/g, tag(picked[picked.length - 1]))
    .replace(/\{N\}/g, String(picked.length));
}

async function cmdTopRandom(sock, msg, n, args, groupMeta) {
  const jid = msg.key.remoteJid;

  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Este comando solo funciona en grupos.' }, { quoted: msg });
  }

  const topic = (args || []).join(' ').trim();
  if (!topic) {
    return sock.sendMessage(jid, { text: `Usa: *!top${n}* <tema>` }, { quoted: msg });
  }

  // Solo miembros actuales. El contador guarda los mensajes de todo el que haya
  // hablado alguna vez, así que sin este filtro el top seguía nombrando (y
  // mencionando) a gente que se salió o fue expulsada hace meses.
  //
  // El owner principal nunca entra en el sorteo (invisible en toda salida).
  // Este comando resuelve isMainOwner con groupMeta cuando lo hay y, si no,
  // vía config y el caché de JIDs aprendidos.
  const users = soloMiembros(await getActiveUsers(jid, 10), groupMeta)
    .filter(u => !isMainOwner(u.jid, false, groupMeta));
  if (users.length < n) {
    return sock.sendMessage(jid, {
      text: `No hay suficientes miembros activos. Necesito ${n} con mínimo 10 mensajes, hay ${users.length}.`,
    }, { quoted: msg });
  }

  const picked = shuffle(users).slice(0, n);
  const mentions = picked.map(u => u.jid);

  // Los numeros se alinean a la derecha para que en un top 10 la columna de
  // arrobas quede recta y no bailando entre el 9 y el 10.
  //
  // El relleno va FUERA de los asteriscos: WhatsApp no aplica la negrita si el
  // asterisco de apertura lleva un espacio detras, asi que `* 1.*` saldria con
  // los asteriscos a la vista en vez de en negrita.
  const ancho = String(picked.length).length;
  const lineas = picked.map((u, i) => {
    const num = String(i + 1);
    return `${' '.repeat(ancho - num.length)}*${num}.*  @${u.jid.split('@')[0]}`;
  });

  const text =
    `*TOP ${n} — ${topic.toUpperCase()}*\n` +
    `╾━━━━━━━━━━━━━━╼\n\n` +
    lineas.join('\n') +
    `\n\n╾━━━━━━━━━━━━━━╼\n` +
    `_${rellenar(pickFresh(CIERRES, `${jid}|top`), picked)}_`;

  await sock.sendMessage(jid, { text, mentions }, { quoted: msg });
}

module.exports = { cmdTopRandom, CIERRES };
