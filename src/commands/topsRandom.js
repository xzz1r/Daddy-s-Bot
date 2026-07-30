const { getActiveUsers } = require('../utils/messageCounter');
const { isMainOwner } = require('../utils/wa');
const { shuffle, pickFresh } = require('../utils/helpers');

// Remates del ranking. El top ya no lleva porcentajes: el puesto ES el
// resultado, y una cifra inventada al lado solo le quitaba fuerza y daba pie a
// discutir el numero en vez de la posicion.
const CIERRES = [
  'El bot no acepta reclamaciones.',
  'Sorteado, publicado y sin vuelta atras.',
  'Quien no salga, que se lo trabaje.',
  'La lista es la lista. Llorar no cambia el orden.',
  'Ni se vota ni se negocia. Se acata.',
  'El que proteste queda automaticamente el ultimo.',
  'Los ausentes tampoco iban a salir, tranquilos.',
  'Publicado. El grupo ya tiene tema para el resto del dia.',
  'Ranking cerrado. Las quejas por escrito y a nadie.',
  'Si no te gusta, monta tu grupo y tu top.',
  'El primero que diga que esta amanyado es que salio ultimo.',
  'Anotado en acta. Que conste para la posteridad.',
  'Sin jurado, sin apelacion y sin piedad.',
  'El orden lo decide el bot. El bot no tiene amigos.',
  'Quien salga arriba que lo disfrute, que esto no se repite.',
];

async function cmdTopRandom(sock, msg, n, args) {
  const jid = msg.key.remoteJid;

  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Este comando solo funciona en grupos.' }, { quoted: msg });
  }

  const topic = (args || []).join(' ').trim();
  if (!topic) {
    return sock.sendMessage(jid, { text: `Usa: *!top${n}* <tema>` }, { quoted: msg });
  }

  // El owner principal nunca entra en el sorteo (invisible en toda salida).
  // Este comando no recibe groupMeta; isMainOwner igual lo resuelve vía config
  // y el caché de JIDs aprendidos, así que basta con pasar null.
  const users = (await getActiveUsers(jid, 10)).filter(u => !isMainOwner(u.jid, false, null));
  if (users.length < n) {
    return sock.sendMessage(jid, {
      text: `No hay suficientes miembros activos. Necesito ${n} con minimo 10 mensajes, hay ${users.length}.`,
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
    `_${pickFresh(CIERRES, `${jid}|top`)}_`;

  await sock.sendMessage(jid, { text, mentions }, { quoted: msg });
}

module.exports = { cmdTopRandom, CIERRES };
