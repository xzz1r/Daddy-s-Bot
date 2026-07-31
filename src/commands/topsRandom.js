const { getActiveUsers } = require('../utils/messageCounter');
const { isMainOwner, soloMiembros } = require('../utils/wa');
const { shuffle, pickFresh } = require('../utils/helpers');

// Remates del ranking.
//
// Cuatro reglas para escribirlos:
//   1. NO SE ASUME NADA. Un remate no puede afirmar lo que alguien hizo, pensó,
//      sintió o va a hacer: el bot no lo sabe y queda de mentiroso. Nada de
//      "ya tiene la captura hecha" ni "llevan un minuto releyendo esto". La
//      burla está en el TONO, no en inventarse una reacción.
//   2. CORTOS. Una línea, dos como mucho, y con retintín. Un párrafo explicando
//      la lista no es un remate, es un comunicado.
//   3. La burla va contra los que salen, no contra el tema ni contra el grupo.
//   4. Valen para cualquier tema. El tema lo pone quien escribe el comando y
//      puede ser halago o insulto, así que el remate apunta al hecho de salir
//      en la lista, nunca a lo que la lista dice.
//
// Marcadores: {1} = el primero, {U} = el último, {N} = cuántos salen.
const CIERRES = [
  '{1} de primero. Enhorabuena, supongo.',
  'Ahí quedáis los {N}. Que os aproveche.',
  '{1} arriba del todo. Todo tuyo, campeón.',
  'Sois {N}. Repartíoslo como podáis.',
  '{1} lidera. Menudo honor.',
  'Ahí lo tenéis. De nada.',
  '{U} el último. Tampoco es un consuelo.',
  '{N} nombres y ni un aplauso.',
  '{1}, el primero de todos. Impresionante, casi.',
  'A vivir con ello, los {N}.',
  '{1} arriba. Que lo disfrute mientras dure.',
  'Ni os molestéis en negarlo.',
  'Vuestro momento de gloria, {N} campeones. Ya está.',
  '{1} primero y {U} último. Elegid con cuál os quedáis.',
  'Menuda cosecha.',
  '{1} de primero. Que se lo cuelgue en el perfil.',
  'Servidos los {N}. Siguiente.',
  'Que os aguante el grupo.',
  '{1} arriba y sin premio. Como debe ser.',
  'Los {N}, retratados. Sin rencor.',
  '{1}, toma. No lo pedía nadie, pero es tuyo.',
  'Y hasta aquí. Sonreíd, los {N}.',
  '{U} cierra. Alguien tenía que hacerlo.',
  'Podéis dar las gracias los {N}. O no.',
  '{1} en cabeza. Un clásico.',
  'Aquí no hay podio, hay {N} señalados.',
  '{1} primero. Que alguien lo felicite, por caridad.',
  'Los {N} arriba y el resto respirando.',
  'Bonita lista. Para el que la lee.',
  'Que conste, {N} nombres. Y no me lo he inventado yo... bueno, sí.',
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
