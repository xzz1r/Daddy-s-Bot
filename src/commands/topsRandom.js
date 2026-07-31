const { getActiveUsers } = require('../utils/messageCounter');
const { isMainOwner, soloMiembros } = require('../utils/wa');
const { shuffle, pickFresh } = require('../utils/helpers');

// Remate del ranking. Sale UNO por top, al final del bloque.
//
// Cuatro reglas para escribirlos:
//   1. Se burlan de LOS {N} A LA VEZ. Nunca de uno solo: si el remate se ceba
//      con el primero, los otros cuatro se quedan sin nada y el top parece un
//      premio individual.
//   2. NO SE ASUME NADA. Un remate no puede afirmar lo que alguien hizo, pensó,
//      sintió o va a hacer: el bot no lo sabe y queda de mentiroso. Nada de
//      "ya tiene la captura hecha" ni "llevan un minuto releyendo esto". La
//      burla está en el TONO, no en inventarse una reacción.
//   3. CORTOS. Una línea. Un párrafo explicando la lista no es un remate, es un
//      comunicado.
//   4. NEUTROS RESPECTO AL TEMA. El tema lo elige quien escribe el comando y
//      puede ser un insulto ("los más feos") o un halago ("los mejores"). Un
//      remate que dé por hecho que salir es malo chirría en la mitad de los
//      tops, así que la burla apunta a estar en la lista, no a lo que la lista
//      dice.
//
// Único marcador: {N} = cuántos salen.
const CIERRES = [
  'Ahí quedáis los {N}. Que os aproveche.',
  'Enhorabuena a los {N}, supongo.',
  'Sois {N}. Repartíoslo como podáis.',
  'Ahí lo tenéis. De nada.',
  '{N} nombres y ni un aplauso.',
  'A vivir con ello, los {N}.',
  'Ni os molestéis en negarlo.',
  'Servidos los {N}. Siguiente.',
  'Que os aguante el grupo.',
  'Y hasta aquí. Sonreíd, los {N}.',
  'Podéis dar las gracias. O no.',
  'Menuda cosecha, los {N}.',
  '{N} nombres, cero explicaciones.',
  'Ya está. Los {N} y a otra cosa.',
  'Sin premio, sin diploma y sin apelación.',
  'Aquí estáis los {N}. Sin preguntas.',
  'Bonita lista. Sobre todo para los {N}.',
  'Los {N} de arriba ya tienen su minuto.',
  'Ni votos ni pruebas: los {N} y ya.',
  'Que conste que los eligió el bot. Los {N}.',
  'Los {N} en la lista. El resto, fuera.',
  'Toda vuestra, los {N}.',
  '{N} nombres. Ni uno más, ni uno menos.',
  'Los {N} nombrados. Lo siento por ninguno.',
  'Venga, los {N} ya tenéis tema para hoy.',
  'El bot reparte puestos, no consuelos. Los {N}, avisados.',
  'Los {N} de la lista. El resto, otro día.',
  'Cerrado. Que lo comenten los {N}.',
  'Todos a mirar a los {N}.',
  'Y con esto, los {N} quedan para el recuerdo.',
];

function rellenar(plantilla, picked) {
  return plantilla.replace(/\{N\}/g, String(picked.length));
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

  // Bloques de cinco. Un top 10 seguido es un muro de diez lineas que en el
  // movil se lee de un tiron y no se distingue un puesto de otro; partido en
  // dos mitades se lee igual de rapido que un top 5. El top 5 sale con un solo
  // bloque, asi que este corte no le cambia nada.
  const BLOQUE = 5;
  const cuerpo = [];
  for (let i = 0; i < lineas.length; i += BLOQUE) {
    cuerpo.push(lineas.slice(i, i + BLOQUE).join('\n'));
  }

  const text =
    `*TOP ${n} — ${topic.toUpperCase()}*\n` +
    `╾━━━━━━━━━━━━━━╼\n\n` +
    cuerpo.join('\n\n') +
    `\n\n╾━━━━━━━━━━━━━━╼\n` +
    `_${rellenar(pickFresh(CIERRES, `${jid}|top`), picked)}_`;

  await sock.sendMessage(jid, { text, mentions }, { quoted: msg });
}

module.exports = { cmdTopRandom, CIERRES };
