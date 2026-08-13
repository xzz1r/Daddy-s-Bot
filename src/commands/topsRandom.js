const { getActiveUsers } = require('../utils/messageCounter');
const { isMainOwner, soloMiembros, getSender } = require('../utils/wa');
const { shuffle, pickFresh } = require('../utils/helpers');
const { cobrar, devolver, textoSinSaldo } = require('../utils/auraCobro');

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
// Mínimo de mensajes para entrar en el sorteo. Con un umbral alto el bot
// elegía siempre entre los cuatro habladores de siempre; con 1 entra todo el
// que haya escrito alguna vez y el azar reparte de verdad.
const MIN_MENSAJES = 1;

// Único marcador: {N} = cuántos salen.
const CIERRES = [
  'Ranking cerrado. Guardad las capturas para el roast de mañana, joder El grupo ya tiene el meme listo.',
  'Fin del top. El chat ya sabe quién sobra en la lista, cabrón No hay ángulo que lo salve Se te ve el cartón sin esfuerzo.',
  'Lista servida sin anestesia ni indultos de amigos, gilipollas Se te ve el cartón sin esfuerzo El ranking no regala indultos.',
  'Top documentado. El eco todavía señala nombres, mierda El ranking no regala indultos Menuda forma de pedir roce.',
  'Cierre del ranking. Duele porque pega con números reales, coño Menuda forma de pedir roce Documentado sin anestesia.',
  'Se acabó el recuento. Los egos quedan donde merecen, asco Documentado sin anestesia El hilo no olvida este numerito.',
  'Ranking sellado. Sin apelación elegante posible, patético El hilo no olvida este numerito Así se firma un fail en público.',
  'Fin. Los nombres quedan en el acta del bot, basura Así se firma un fail en público El grupo ya tiene el meme listo.',
  'Cierre sin filtro. El top hizo el trabajo sucio, ridículo El grupo ya tiene el meme listo No hay ángulo que lo salve.',
  'Lista lista. El chat puede volver al ruido con la lección, fracasado No hay ángulo que lo salve Se te ve el cartón sin esfuerzo.',
  'Top fuera. Captura o cállate, joder Se te ve el cartón sin esfuerzo El ranking no regala indultos Menuda forma de pedir roce.',
  'Ranking sin narrador amigo ni final feliz, cabrón El ranking no regala indultos Menuda forma de pedir roce.',
  'Fin del desfile de la vergüenza numérica, gilipollas Menuda forma de pedir roce Documentado sin anestesia.',
  'Cierre. El contador no negocia sentimientos, mierda Documentado sin anestesia El hilo no olvida este numerito.',
  'Top archivado con asco educativo, coño El hilo no olvida este numerito Así se firma un fail en público.',
  'Se terminó. Los del listado ya están expuestos, asco Así se firma un fail en público El grupo ya tiene el meme listo.',
  'Ranking sellado. Siguiente drama cuando quieran, patético El grupo ya tiene el meme listo No hay ángulo que lo salve.',
  'Fin de transmisión del conteo, basura No hay ángulo que lo salve Se te ve el cartón sin esfuerzo El ranking no regala indultos.',
  'Cierre limpio. Daño a egos permanente, ridículo Se te ve el cartón sin esfuerzo El ranking no regala indultos.',
  'Lista servida en caliente y sin azúcar, fracasado El ranking no regala indultos Menuda forma de pedir roce.',
  'Top cerrado. El grupo tomó nota a la fuerza, joder Menuda forma de pedir roce Documentado sin anestesia.',
  'Ranking sin maquillaje comercial, cabrón Documentado sin anestesia El hilo no olvida este numerito Así se firma un fail en público.',
  'Fin. Sin bis ni redención barata de último minuto, gilipollas El hilo no olvida este numerito Así se firma un fail en público.',
  'Cierre del acta numérica del día, mierda Así se firma un fail en público El grupo ya tiene el meme listo.',
  'Top documentado en el historial vivo, coño El grupo ya tiene el meme listo No hay ángulo que lo salve.',
  'Se acabó el conteo. Duele y basta, asco No hay ángulo que lo salve Se te ve el cartón sin esfuerzo El ranking no regala indultos.',
  'Ranking fuera. Guardad el cringe para después, patético Se te ve el cartón sin esfuerzo El ranking no regala indultos.',
  'Fin del ranking de turno, basura El ranking no regala indultos Menuda forma de pedir roce Documentado sin anestesia.',
  'Cierre. El eco sigue con los nombres, ridículo Menuda forma de pedir roce Documentado sin anestesia.',
  'Lista cerrada sin posibilidad de retoque, fracasado Documentado sin anestesia El hilo no olvida este numerito.',
  'Top servido. El chat puede odiar en paz, joder El hilo no olvida este numerito Así se firma un fail en público.',
  'Ranking sellado a fuego, cabrón Así se firma un fail en público El grupo ya tiene el meme listo No hay ángulo que lo salve.',
  'Fin del show de números, gilipollas El grupo ya tiene el meme listo No hay ángulo que lo salve Se te ve el cartón sin esfuerzo.',
  'Cierre del desfile, mierda No hay ángulo que lo salve Se te ve el cartón sin esfuerzo El ranking no regala indultos.',
  'Top archivado, coño Se te ve el cartón sin esfuerzo El ranking no regala indultos Menuda forma de pedir roce.',
  'Se terminó el listado de la vergüenza, asco El ranking no regala indultos Menuda forma de pedir roce.',
  'Lista dolorosa y necesaria, patético Menuda forma de pedir roce Documentado sin anestesia El hilo no olvida este numerito.',
  'Fin de conteo sin indultos, basura Documentado sin anestesia El hilo no olvida este numerito Así se firma un fail en público.',
  'Cierre. Quedan expuestos los que tocaba, ridículo El hilo no olvida este numerito Así se firma un fail en público.',
  'Top con llave y sin copia, fracasado Así se firma un fail en público El grupo ya tiene el meme listo.',
  'Ranking sin filtro de relaciones, joder El grupo ya tiene el meme listo No hay ángulo que lo salve Se te ve el cartón sin esfuerzo.',
  'Fin de la emisión numérica, cabrón No hay ángulo que lo salve Se te ve el cartón sin esfuerzo El ranking no regala indultos.',
  'Cierre diario del ranking, gilipollas Se te ve el cartón sin esfuerzo El ranking no regala indultos.',
  'Lista servida. El resto es ruido de fondo, mierda El ranking no regala indultos Menuda forma de pedir roce.',
  'Top en el historial para siempre, coño Menuda forma de pedir roce Documentado sin anestesia El hilo no olvida este numerito.',
  'Se acabó. Capturad y callad, asco Documentado sin anestesia El hilo no olvida este numerito Así se firma un fail en público.',
  'Ranking sellado, patético El hilo no olvida este numerito Así se firma un fail en público El grupo ya tiene el meme listo.',
  'Fin. El bot cumplió el trabajo sucio, basura Así se firma un fail en público El grupo ya tiene el meme listo.',
  'Cierre sin apelación de amigos, ridículo El grupo ya tiene el meme listo No hay ángulo que lo salve.',
  'Top cerrado. Ego en modo dieta, fracasado No hay ángulo que lo salve Se te ve el cartón sin esfuerzo.',
  'Top fuera. Captura o cállate, joder Y encima lo repites, mierda Se te ve el cartón sin esfuerzo. El numerito queda para el archivo del chat, joder.',
  'Top archivado con asco educativo, coño Y encima lo repites, mierda El hilo no olvida este numerito. El numerito queda para el archivo del chat, joder.',
  'Fin de transmisión del conteo, basura Y encima lo repites, cabrón No hay ángulo que lo salve. El numerito queda para el archivo del chat, joder.',
  'Cierre limpio. Daño a egos permanente, ridículo Y encima lo repites, mierda Se te ve el cartón sin esfuerzo.',
  'Ranking sin maquillaje comercial, cabrón Y encima lo repites, cabrón Documentado sin anestesia. El numerito queda para el archivo del chat, joder.',
  'Cierre del acta numérica del día, mierda Y encima lo repites, coño Así se firma un fail en público. El numerito queda para el archivo del chat, joder.',
  'Top documentado en el historial vivo, coño Y encima lo repites, joder El grupo ya tiene el meme listo.',
  'Se acabó el conteo. Duele y basta, asco Y encima lo repites, cabrón No hay ángulo que lo salve. El numerito queda para el archivo del chat, joder.',
  'Fin del ranking de turno, basura Y encima lo repites, coño El ranking no regala indultos. El numerito queda para el archivo del chat, joder.',
  'Cierre. El eco sigue con los nombres, ridículo Y encima lo repites, joder Menuda forma de pedir roce.',
  'Top servido. El chat puede odiar en paz, joder Y encima lo repites, mierda El hilo no olvida este numerito.',
  'Ranking sellado a fuego, cabrón Y encima lo repites, coño Así se firma un fail en público. El numerito queda para el archivo del chat, joder.',
  'Fin del show de números, gilipollas Y encima lo repites, joder El grupo ya tiene el meme listo. El numerito queda para el archivo del chat, joder.',
  'Cierre del desfile, mierda Y encima lo repites, cabrón No hay ángulo que lo salve. El numerito queda para el archivo del chat, joder.',
  'Top archivado, coño Y encima lo repites, mierda Se te ve el cartón sin esfuerzo. El numerito queda para el archivo del chat, joder.',
  'Se terminó el listado de la vergüenza, asco Y encima lo repites, coño El ranking no regala indultos.',
  'Lista dolorosa y necesaria, patético Y encima lo repites, joder Menuda forma de pedir roce. El numerito queda para el archivo del chat, joder.',
  'Fin de conteo sin indultos, basura Y encima lo repites, cabrón Documentado sin anestesia. El numerito queda para el archivo del chat, joder.',
  'Top con llave y sin copia, fracasado Y encima lo repites, coño Así se firma un fail en público. El numerito queda para el archivo del chat, joder.',
  'Ranking sin filtro de relaciones, joder Y encima lo repites, joder El grupo ya tiene el meme listo. El numerito queda para el archivo del chat, joder.',
  'Fin de la emisión numérica, cabrón Y encima lo repites, cabrón No hay ángulo que lo salve. El numerito queda para el archivo del chat, joder.',
  'Cierre diario del ranking, gilipollas Y encima lo repites, mierda Se te ve el cartón sin esfuerzo. El numerito queda para el archivo del chat, joder.',
  'Top en el historial para siempre, coño Y encima lo repites, joder Menuda forma de pedir roce. El numerito queda para el archivo del chat, joder.',
  'Se acabó. Capturad y callad, asco Y encima lo repites, cabrón Documentado sin anestesia. El numerito queda para el archivo del chat, joder.',
  'Ranking sellado, patético Y encima lo repites, mierda El hilo no olvida este numerito. El numerito queda para el archivo del chat, joder.',
  'Fin. El bot cumplió el trabajo sucio, basura Y encima lo repites, coño Así se firma un fail en público.',
  'Cierre sin apelación de amigos, ridículo Y encima lo repites, joder El grupo ya tiene el meme listo.',
  'Top cerrado. Ego en modo dieta, fracasado Y encima lo repites, cabrón No hay ángulo que lo salve. El numerito queda para el archivo del chat, joder.',
  'Cierre del desfile, mierda Y encima lo repites, coño El ranking no regala indultos. El numerito queda para el archivo del chat, joder.',
  'Top archivado, coño Y encima lo repites, joder Menuda forma de pedir roce. El numerito queda para el archivo del chat, joder.',
  'Ranking sellado, patético Y encima lo repites, joder El grupo ya tiene el meme listo. El numerito queda para el archivo del chat, joder.',
  'Top archivado, coño Y encima lo repites, mierda El hilo no olvida este numerito. El numerito queda para el archivo del chat, joder.',
  'Top archivado, coño Y encima lo repites, joder El grupo ya tiene el meme listo. El numerito queda para el archivo del chat, joder.',
  'Ranking cerrado con llave oxidada. No hay copia para los egos heridos, cabrón Registro 1 del ranking, mierda.',
  'Fin del top. Quien salga en la lista que se aguante el frame, gilipollas Registro 2 del ranking, mierda.',
  'Lista servida. El bot no pide disculpas por los números, mierda Registro 3 del ranking, mierda Firmado en el historial del chat.',
  'Top documentado. Mañana seguirá doliendo igual, coño Registro 4 del ranking, mierda Sin derecho a maquillaje posterior.',
  'Cierre del ranking. Sin terapia grupal incluida, asco Registro 5 del ranking, mierda El contador lo deja en evidencia.',
  'Se acabó el conteo. Los números no tienen amigos, patético Registro 6 del ranking, mierda El grupo no necesita subtítulos.',
  'Ranking sellado. El resto es cope de los nombrados, basura Registro 7 del ranking, mierda Firmado en el historial del chat.',
  'Fin. Acta levantada y firmada por el contador, ridículo Registro 8 del ranking, mierda Sin derecho a maquillaje posterior.',
  'Cierre sin azúcar. El top hizo lo que tenía que hacer, fracasado Registro 9 del ranking, mierda El contador lo deja en evidencia.',
  'Lista lista. Quien no salió hoy puede salir mañana, joder Registro 10 del ranking, mierda El grupo no necesita subtítulos.',
  'Top fuera de contexto amable. Solo datos, cabrón Registro 11 del ranking, mierda Firmado en el historial del chat.',
  'Ranking en frío. Mejor así, gilipollas Registro 12 del ranking, mierda Sin derecho a maquillaje posterior.',
  'Fin del desfile. Aplausos opcionales y de burla, mierda Registro 13 del ranking, mierda El contador lo deja en evidencia.',
  'Cierre. El eco de los nombres hace el resto, coño Registro 14 del ranking, mierda El grupo no necesita subtítulos.',
  'Top archivado. No se borra con un reinicio de móvil, asco Registro 15 del ranking, mierda Firmado en el historial del chat.',
  'Se terminó. Captura obligatoria para los del listado, patético Registro 16 del ranking, mierda Sin derecho a maquillaje posterior.',
  'Ranking sin director de orquesta amigo, basura Registro 17 del ranking, mierda El contador lo deja en evidencia.'
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
  // Sin tema no hay sorteo y el bot no da tutoriales: se calla.
  if (!topic) return;

  // Un top menciona a media docena de personas de golpe, asi que cuesta aura.
  // Se cobra antes de sortear y se devuelve si no hay gente suficiente.
  const quienPide = getSender(msg);
  const concepto = `top${n}`;
  const pago = await cobrar(jid, quienPide, concepto, { fromMe: msg.key.fromMe, groupMeta });
  if (!pago.ok) {
    return sock.sendMessage(jid, { text: textoSinSaldo(concepto, pago) }, { quoted: msg });
  }

  // Solo miembros actuales. El contador guarda los mensajes de todo el que haya
  // hablado alguna vez, así que sin este filtro el top seguía nombrando (y
  // mencionando) a gente que se salió o fue expulsada hace meses.
  //
  // El umbral es 1 mensaje, no 10: con 10 el sorteo elegía siempre entre el
  // mismo puñado de habladores del grupo y por eso "salían siempre los mismos".
  // Con 1, entra cualquiera que haya abierto la boca una vez y el azar tiene
  // material de verdad para repartir.
  //
  // El owner principal nunca entra en el sorteo (invisible en toda salida).
  // Este comando resuelve isMainOwner con groupMeta cuando lo hay y, si no,
  // vía config y el caché de JIDs aprendidos.
  const users = soloMiembros(await getActiveUsers(jid, MIN_MENSAJES), groupMeta)
    .filter(u => !isMainOwner(u.jid, false, groupMeta));
  if (users.length < n) {
    await devolver(jid, quienPide, pago.pagado).catch(() => {});
    return sock.sendMessage(jid, {
      text: `No hay suficientes miembros activos. Necesito ${n}, hay ${users.length}.`,
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
