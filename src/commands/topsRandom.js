const { getActiveUsers } = require('../utils/messageCounter');
const { isMainOwner, soloMiembros } = require('../utils/wa');
const { shuffle, pickFresh } = require('../utils/helpers');

// Remates del ranking.
//
// Tres reglas para escribirlos:
//   1. NO SE ASUME NADA. Un remate no puede afirmar lo que alguien hizo, pensó,
//      sintió o va a hacer: el bot no lo sabe y queda de mentiroso. Nada de
//      "ya tiene la captura hecha" ni "llevan un minuto releyendo esto". La
//      burla está en el TONO, no en inventarse una reacción.
//   2. Solo se habla de lo que sí es cierto: que hay una lista, que la hizo el
//      bot y quién ocupa cada puesto. Lo demás sobra.
//   3. Valen para cualquier tema. El tema lo pone quien escribe el comando y
//      puede ser halago o insulto, así que el remate apunta al hecho de salir
//      en la lista, nunca a lo que la lista dice.
//
// Marcadores: {1} = el primero, {U} = el último, {N} = cuántos salen.
const CIERRES = [
  'Lista cerrada. Las quejas por escrito y a nadie.',
  '{1} arriba del todo. Alguien tenía que ser.',
  'No es un premio. Es una lista.',
  'El bot no tiene amigos ni memoria. Solo tiene esta lista.',
  'Sin jurado, sin apelación y sin piedad.',
  '{N} nombres y ni una explicación. Así se queda.',
  'El orden no se discute. El bot ya lo escribió.',
  'De arriba abajo y sin descuentos.',
  '{1} de primero y {U} de último. En medio, el resto.',
  'Aquí no hay podio. Hay lista.',
  'A los {N} de arriba: no hace falta que lo comentéis.',
  'El tema lo puso otro. Los nombres los pone el bot.',
  'Sin contexto, sin matices y sin marcha atrás.',
  '{1} encabeza. Es lo que tiene ir primero.',
  'Esto no es una encuesta. Es un ranking.',
  'El bot reparte puestos, no consuelos.',
  '{U} cierra la lista. Alguien tenía que cerrarla.',
  'Nadie pidió esta lista y aquí está.',
  'Ni votos ni pruebas: solo el ranking.',
  '{N} nombres en negro sobre blanco.',
  'No preguntéis por qué. No hay por qué.',
  'Un tema, {N} nombres y ninguna disculpa.',
  '{1} y {U} en la misma lista. Distinto puesto, misma lista.',
  'El ranking no se explica. Se lee.',
  'Que nadie pida revisión. No la hay.',
  '{1} primero, y sin discusión posible.',
  'Publicado. Lo que venga después no es asunto del bot.',
  'Ni sorteo amañado ni criterio oculto. Solo esto.',
  'Los {N} quedan en la lista. Y la lista queda en el chat.',
  'La próxima también la hace el bot. Aviso.',
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
