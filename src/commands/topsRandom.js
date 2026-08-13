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
  'Ranking cerrado. Guardad las capturas para el roast de mañana, joder. Hostia puta, qué nivel, patético.',
  'Fin del top. El chat ya sabe quién sobra en la lista, cabrónsin esfuerzo. Hostia puta, qué nivel, miserable.',
  'Lista servida sin anestesia ni indultos de amigos, gilipollasa indultos. Hostia puta, qué nivel, qué cringe.',
  'Top documentado. El eco todavía señala nombres, mierdair roce. Hostia puta, qué nivel, da, asco, da asco.',
  'Cierre del ranking. Duele porque pega con números reales, coñostesia. Hostia puta, qué nivel, qué vergüenza.',
  'Se acabó el recuento. Los egos quedan donde merecen, ascoste numerito. Hostia puta, qué nivel, ridículo.',
  'Ranking sellado. Sin apelación elegante posible, patéticol en público. Hostia puta, qué nivel, fracasado.',
  'Fin. Los nombres quedan en el acta del bot, basural meme listo. Hostia puta, qué nivel, qué miseria.',
  'Cierre sin filtro. El top hizo el trabajo sucio, ridículoo salve. Hostia puta, qué nivel, da grima.',
  'Lista lista. El chat puede volver al ruido con la lección, fracasadosin esfuerzo. Hostia puta, qué nivel, qué nivel de pena.',
  'Top fuera. Captura o cállate, jodera indultos. Hostia puta, qué nivel, basura.',
  'Ranking sin narrador amigo ni final feliz, cabrónir roce. Hostia puta, qué nivel, qué cutre.',
  'Fin del desfile de la vergüenza numérica, gilipollasstesia. Hostia puta, qué nivel, da pena ajena.',
  'Cierre. El contador no negocia sentimientos, mierdaste numerito. Hostia puta, qué nivel, qué vacío.',
  'Top archivado con asco educativo, coñol en público. Hostia puta, qué nivel, indignante.',
  'Se terminó. Los del listado ya están expuestos, ascol meme listo. Hostia puta, qué nivel, qué vergüenza ajena.',
  'Ranking sellado. Siguiente drama cuando quieran, patéticoo salve. Hostia puta, qué nivel, da vergüenza.',
  'Fin de transmisión del conteo, basurasin esfuerzo. Hostia puta, qué nivel, qué flojo.',
  'Cierre limpio. Daño a egos permanente, ridículoa indultos. Hostia puta, qué nivel, menudo desastre.',
  'Lista servida en caliente y sin azúcar, fracasadoir roce. Hostia puta, qué nivel, qué pena.',
  'Top cerrado. El grupo tomó nota a la fuerza, joderstesia. Hostia puta, qué nivel, patético.',
  'Ranking sin maquillaje comercial, cabrónste numerito. Hostia puta, qué nivel, miserable.',
  'Fin. Sin bis ni redención barata de último minuto, gilipollasl en público. Hostia puta, qué nivel, qué cringe.',
  'Cierre del acta numérica del día, mierdal meme listo. Hostia puta, qué nivel, da, asco, da asco.',
  'Top documentado en el historial vivo, coñoo salve. Hostia puta, qué nivel, qué vergüenza.',
  'Se acabó el conteo. Duele y basta, ascosin esfuerzo. Hostia puta, qué nivel, ridículo.',
  'Ranking fuera. Guardad el cringe para después, patéticoa indultos. Hostia puta, qué nivel, fracasado.',
  'Fin del ranking de turno, basurair roce. Hostia puta, qué nivel, qué miseria.',
  'Cierre. El eco sigue con los nombres, ridículostesia. Hostia puta, qué nivel, da grima.',
  'Lista cerrada sin posibilidad de retoque, fracasadoste numerito. Hostia puta, qué nivel, qué nivel de pena.',
  'Top servido. El chat puede odiar en paz, joderl en público. Hostia puta, qué nivel, basura.',
  'Ranking sellado a fuego, cabrónl meme listo. Hostia puta, qué nivel, qué cutre.',
  'Fin del show de números, gilipollaso salve. Hostia puta, qué nivel, da pena ajena.',
  'Cierre del desfile, mierdasin esfuerzo. Hostia puta, qué nivel, qué vacío.',
  'Top archivado, coñoa indultos. Hostia puta, qué nivel.',
  'Se terminó el listado de la vergüenza, ascoir roce. Hostia puta, qué nivel, qué vergüenza ajena.',
  'Lista dolorosa y necesaria, patéticostesia. Hostia puta, qué nivel, da vergüenza.',
  'Fin de conteo sin indultos, basuraste numerito. Hostia puta, qué nivel, qué flojo.',
  'Cierre. Quedan expuestos los que tocaba, ridículol en público. Hostia puta, qué nivel, menudo desastre.',
  'Top con llave y sin copia, fracasadol meme listo. Hostia puta, qué nivel, qué pena.',
  'Ranking sin filtro de relaciones, jodero salve. Hostia puta, qué nivel, patético.',
  'Fin de la emisión numérica, cabrónsin esfuerzo. Hostia puta, qué nivel, miserable.',
  'Cierre diario del ranking, gilipollasa indultos. Hostia puta, qué nivel, qué cringe.',
  'Lista servida. El resto es ruido de fondo, mierdair roce. Hostia puta, qué nivel, da, asco, qué cringe.',
  'Top en el historial para siempre, coñostesia. Hostia puta, qué nivel, qué vergüenza.',
  'Se acabó. Capturad y callad, ascoste numerito. Hostia puta, qué nivel, ridículo.',
  'Ranking sellado, patéticol en público. Hostia puta, qué nivel, fracasado.',
  'Fin. El bot cumplió el trabajo sucio, basural meme listo. Hostia puta, qué nivel, qué miseria.',
  'Cierre sin apelación de amigos, ridículoo salve. Hostia puta, qué nivel, da grima.',
  'Top cerrado. Ego en modo dieta, fracasadosin esfuerzo. Hostia puta, qué nivel, qué nivel de pena.',
  'Top fuera. Captura o cállate, joder Y encima lo repites, mierda El numerito queda para el archivo del chat, basura.',
  'Top archivado con asco educativo, coño Y encima lo repites, mierda El numerito queda para el archivo del chat, qué cutre.',
  'Fin de transmisión del conteo, basura Y encima lo repites, cabrón El numerito queda para el archivo del chat, da pena ajena.',
  'Cierre limpio. Daño a egos permanente, ridículo Y encima lo repites, mierda. Hostia puta, qué nivel, qué vacío.',
  'Ranking sin maquillaje comercial, cabrón Y encima lo repites, cabrón El numerito queda para el archivo del chat, indignante.',
  'Cierre del acta numérica del día, mierda Y encima lo repites, coño El numerito queda para el archivo del chat, qué vergüenza ajena.',
  'Top documentado en el historial vivo, coño Y encima lo repites, joder. Hostia puta, qué nivel, da vergüenza.',
  'Se acabó el conteo. Duele y basta, asco Y encima lo repites, cabrón El numerito queda para el archivo del chat, qué flojo.',
  'Fin del ranking de turno, basura Y encima lo repites, coño El numerito queda para el archivo del chat, menudo desastre.',
  'Cierre. El eco sigue con los nombres, ridículo Y encima lo repites, joder. Hostia puta, qué nivel, qué pena.',
  'Top servido. El chat puede odiar en paz, joder Y encima lo repites, mierda. Hostia puta, qué nivel, patético.',
  'Ranking sellado a fuego, cabrón Y encima lo repites, coño El numerito queda para el archivo del chat, miserable.',
  'Fin del show de números, gilipollas Y encima lo repites, joder El numerito queda para el archivo del chat, qué cringe.',
  'Cierre del desfile, mierda Y encima lo repites, cabrón El numerito queda para el archivo del chat, da, asco, qué cringe.',
  'Top archivado, coño Y encima lo repites, mierda El numerito queda para el archivo del chat, joder. Hostia puta, qué nivel, qué vergüenza.',
  'Se terminó el listado de la vergüenza, asco Y encima lo repites, coño. Hostia puta, qué nivel, ridículo.',
  'Lista dolorosa y necesaria, patético Y encima lo repites, joder El numerito queda para el archivo del chat, fracasado.',
  'Fin de conteo sin indultos, basura Y encima lo repites, cabrón El numerito queda para el archivo del chat, qué miseria.',
  'Top con llave y sin copia, fracasado Y encima lo repites, coño El numerito queda para el archivo del chat, da grima.',
  'Ranking sin filtro de relaciones, joder Y encima lo repites, joder El numerito queda para el archivo del chat, qué nivel de pena.',
  'Fin de la emisión numérica, cabrón Y encima lo repites, cabrón El numerito queda para el archivo del chat, basura.',
  'Cierre diario del ranking, gilipollas Y encima lo repites, mierda El numerito queda para el archivo del chat, qué cutre.',
  'Top en el historial para siempre, coño Y encima lo repites, joder El numerito queda para el archivo del chat, da pena ajena.',
  'Se acabó. Capturad y callad, asco Y encima lo repites, cabrón El numerito queda para el archivo del chat, qué vacío.',
  'Ranking sellado, patético Y encima lo repites, mierda El numerito queda para el archivo del chat, indignante.',
  'Fin. El bot cumplió el trabajo sucio, basura Y encima lo repites, coño. Hostia puta, qué nivel, qué vergüenza ajena.',
  'Cierre sin apelación de amigos, ridículo Y encima lo repites, joder. Hostia puta, qué nivel, da vergüenza.',
  'Top cerrado. Ego en modo dieta, fracasado Y encima lo repites, cabrón El numerito queda para el archivo del chat, qué flojo.',
  'Cierre del desfile, mierda Y encima lo repites, coño El numerito queda para el archivo del chat, menudo desastre.',
  'Top archivado, coño Y encima lo repites, joder El numerito queda para el archivo del chat, joder. Hostia puta, qué nivel, qué pena.',
  'Ranking sellado, patético Y encima lo repites, joder El numerito queda para el archivo del chat, patético.',
  'Top archivado, coño Y encima lo repites, mierda El numerito queda para el archivo del chat, joder. Hostia puta, qué nivel, miserable.',
  'Top archivado, coño Y encima lo repites, joder El numerito queda para el archivo del chat, joder. Hostia puta, qué nivel, qué cringe.',
  'Ranking cerrado con llave oxidada. No hay copia para los egos heridos, cabrón Registro 1 del ranking, da, asco, qué cringe.',
  'Fin del top. Quien salga en la lista que se aguante el frame, gilipollas Registro 2 del ranking, qué vergüenza.',
  'Lista servida. El bot no pide disculpas por los números, mierda Registro 3 del ranking, mierda. Hostia puta, qué nivel, ridículo.',
  'Top documentado. Mañana seguirá doliendo igual, coño Registro 4 del ranking, mierda. Hostia puta, qué nivel, fracasado.',
  'Cierre del ranking. Sin terapia grupal incluida, asco Registro 5 del ranking, mierda. Hostia puta, qué nivel, qué miseria.',
  'Se acabó el conteo. Los números no tienen amigos, patético Registro 6 del ranking, mierda. Hostia puta, qué nivel, da grima.',
  'Ranking sellado. El resto es cope de los nombrados, basura Registro 7 del ranking, mierda. Hostia puta, qué nivel, qué nivel de pena.',
  'Fin. Acta levantada y firmada por el contador, ridículo Registro 8 del ranking, mierda. Hostia puta, qué nivel, basura.',
  'Cierre sin azúcar. El top hizo lo que tenía que hacer, fracasado Registro 9 del ranking, mierda. Hostia puta, qué nivel, qué cutre.',
  'Lista lista. Quien no salió hoy puede salir mañana, joder Registro 10 del ranking, mierda. Hostia puta, qué nivel, da pena ajena.',
  'Top fuera de contexto amable. Solo datos, cabrón Registro 11 del ranking, mierda. Hostia puta, qué nivel, qué vacío.',
  'Ranking en frío. Mejor así, gilipollas Registro 12 del ranking, mierda. Hostia puta, qué nivel, indignante.',
  'Fin del desfile. Aplausos opcionales y de burla, mierda Registro 13 del ranking, mierda. Hostia puta, qué nivel, qué vergüenza ajena.',
  'Cierre. El eco de los nombres hace el resto, coño Registro 14 del ranking, mierda. Hostia puta, qué nivel, da vergüenza.',
  'Top archivado. No se borra con un reinicio de móvil, asco Registro 15 del ranking, mierda. Hostia puta, qué nivel, qué flojo.',
  'Se terminó. Captura obligatoria para los del listado, patético Registro 16 del ranking, mierda. Hostia puta, qué nivel, menudo desastre.',
  'Ranking sin director de orquesta amigo, basura Registro 17 del ranking, mierda. Hostia puta, qué nivel, qué pena.',
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
