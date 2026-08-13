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
  'Los {N} de la vergüenza, servidos en bandeja de mierda, y el chat lo tiene claro, joder.',
  'Ahí tenéis la mierda que ha escupido el bot hoy. Los {N} de turno, y el chat lo tiene claro, mierda.',
  '{N} nombres y ni una puta excusa entre todos, y el chat lo tiene claro, coño.',
  'Enhorabuena, gilipollas. Sois {N} y os jodéis igual, y el chat lo tiene claro, cabrón.',
  'El bot ha meado esta lista y os ha tocado a los {N}, y el chat lo tiene claro, gilipollas.',
  'Sois {N} de mierda, repartíos la vergüenza como podáis, y el chat lo tiene claro, patético.',
  'Ni Dios pidió esto, pero ahí quedáis los {N}, y el chat lo tiene claro, asco.',
  '{N} nombres, cero dignidad y ni una hostia de sorpresa, y el chat lo tiene claro, basura.',
  'Que os folle un pez, los {N}. El bot ya cumplió, y el chat lo tiene claro, ridículo.',
  'Los {N} de hoy. Mañana otros, la mierda es la misma, y el chat lo tiene claro, fracasado.',
  'Coño, sois {N} y ninguno se libra del ridículo, y el chat lo tiene claro, joder.',
  'El azar os ha cagado encima a los {N}. De nada, y el chat lo tiene claro, mierda.',
  'Ahí lo tenéis: que no diga nadie que el bot no reparte mierda, y el chat lo tiene claro, coño.',
  '{N} elegidos por un algoritmo con los cojones bien puestos, y el chat lo tiene claro, cabrón.',
  'Puta lista, joder. Y os ha tocado a los {N}, y el chat lo tiene claro, gilipollas.',
  'Los {N} ya pueden ir cavando su propia tumba social, y el chat lo tiene claro, patético.',
  'Ni votos ni jueces: el bot os ha señalado, hostia, y el chat lo tiene claro, asco.',
  'Sois {N} y ninguno tiene ya donde esconderse, y el chat lo tiene claro, basura.',
  'Ahí quedáis marcados los {N}, como el ganado, y el chat lo tiene claro, ridículo.',
  'El bot no perdona: {N} nombres y a joderse todos, y el chat lo tiene claro, fracasado.',
  'Menuda cuadrilla de mierda, los {N} que han salido, y el chat lo tiene claro, joder.',
  'Que os aproveche el bochorno, hatajo de cabrones, y el chat lo tiene claro, mierda.',
  '{N} nombres soltados sin anestesia. Aguantad, cojones, y el chat lo tiene claro, coño.',
  'Los {N} de la lista, cortesía de un bot sin corazón, y el chat lo tiene claro, cabrón.',
  'Vaya papelón os ha tocado, joder, a los {N}, y el chat lo tiene claro, gilipollas.',
  'Sois carne de cachondeo grupal, los {N}, y el chat lo tiene claro, patético.',
  '{N} nombres y ni una puta medalla de consuelo, y el chat lo tiene claro, asco.',
  'Ahí os quedáis, los {N}, con el culo al aire, y el chat lo tiene claro, basura.',
  'El bot ha hablado: los {N}, y que os den por saco, y el chat lo tiene claro, ridículo.',
  'Sois {N}. Sois mierda de hoy. Mañana otra tanda de mierda, y el chat lo tiene claro, fracasado.',
  'Los {N} del bochorno colectivo. Repartíos el asco como buenamente podáis, joder, y el chat lo tiene claro, joder.',
  '{N} nombres en la misma bandeja. El bot no hace dietas de ridículo, cabrón, y el chat lo tiene claro, mierda.',
  'Ahí van los {N}. Ni uno se libra y el chat tampoco pide clemencia, mierda, y el chat lo tiene claro, coño.',
  'Sois {N} y el algoritmo os ha cagado encima a todos por igual, gilipollas, y el chat lo tiene claro, cabrón.',
  'Lista de {N} sin anestesia. El bot firmó y vosotros aguantáis, patético, y el chat lo tiene claro, gilipollas.',
  'Los {N} de turno. Mañana otros, la vergüenza es la misma de siempre, ridículo, y el chat lo tiene claro, patético.',
  '{N} elegidos. Cero votos, cero jueces, solo un bot con malas pulgas, basura, y el chat lo tiene claro, asco.',
  'Enhorabuena a los {N}: el ridículo grupal tiene nombre y apellido hoy, desperdicio, y el chat lo tiene claro, basura.',
  'Ahí quedáis los {N}, marcados como el ganado del chat, asco, y el chat lo tiene claro, ridículo.',
  'El bot escupió {N} nombres. Limpiad el suelo vosotros, cutre, y el chat lo tiene claro, fracasado.',
  'Sois {N} de la misma mierda. Repartíos el peso, pringado, y el chat lo tiene claro, joder.',
  '{N} en la lista. Ni una puta sorpresa entre todo el hatajo, fracasado, y el chat lo tiene claro, mierda.',
  'Los {N} del día. El azar no perdona y el bot menos, joder, y el chat lo tiene claro, coño.',
  'Cuadrilla de {N}. El bochorno se reparte sin factura, mierda, y el chat lo tiene claro, cabrón.',
  'Ahí tenéis a los {N}. El chat ya tomó nota del elenco, coño, y el chat lo tiene claro, gilipollas.',
  'Sois {N} y ninguno tiene dónde esconder la cara, cabrón, y el chat lo tiene claro, patético.',
  'El bot señaló a {N}. El resto del grupo puede respirar hasta mañana, gilipollas, y el chat lo tiene claro, asco.',
  '{N} nombres, cero dignidad y el mismo destino de cachondeo, patético, y el chat lo tiene claro, basura.',
  'Lista servida: los {N}. Que os aproveche el papelón, ridículo, y el chat lo tiene claro, ridículo.',
  'Los {N} de la vergüenza de hoy. Archivo abierto, basura, y el chat lo tiene claro, fracasado.',
  'Ranking cerrado. El chat ya sabe quién sobra, cabrón, y el chat lo tiene claro, joder.',
  'Fin del top. Guardad las capturas para el roast de mañana, gilipollas, y el chat lo tiene claro, mierda.',
  'Lista servida. Sin anestesia y sin indultos, mierda, y el chat lo tiene claro, coño.',
  'Cierre del ranking. El eco todavía señala, coño, y el chat lo tiene claro, cabrón.',
  'Top documentado. El grupo es testigo, asco, y el chat lo tiene claro, gilipollas.',
  'Se acabó el recuento. Duele porque es verdad, patético, y el chat lo tiene claro, patético.',
  'Ranking sellado. Sin apelación elegante, basura, y el chat lo tiene claro, asco.',
  'Fin. Los nombres quedan en el acta, ridículo, y el chat lo tiene claro, basura.',
  'Cierre sin filtro. El top hizo su trabajo, fracasado, y el chat lo tiene claro, ridículo.',
  'Lista lista. El chat puede volver al ruido, joder, y el chat lo tiene claro, fracasado.',
  'Ranking fuera. Sin derecho a maquillaje, cabrón, y el chat lo tiene claro, joder.',
  'Top cerrado. Captura o cállate, gilipollas, y el chat lo tiene claro, mierda.',
  'Fin del desfile de la vergüenza, mierda, y el chat lo tiene claro, coño.',
  'Cierre. El contador no negocia, coño, y el chat lo tiene claro, cabrón.',
  'Ranking archivado con asco educativo, asco, y el chat lo tiene claro, gilipollas.',
  'Se terminó. Los {N} ya están expuestos, patético, y el chat lo tiene claro, patético.',
  'Top sellado. Siguiente drama, basura, y el chat lo tiene claro, asco.',
  'Fin de transmisión del ranking, ridículo, y el chat lo tiene claro, basura.',
  'Cierre limpio. Daño permanente a egos, fracasado, y el chat lo tiene claro, ridículo.',
  'Lista servida en caliente, joder, y el chat lo tiene claro, fracasado.',
  'Ranking sin anestesia ni narrador amigo, cabrón, y el chat lo tiene claro, joder.',
  'Top cerrado. El grupo ya tomó nota, gilipollas, y el chat lo tiene claro, mierda.',
  'Fin. Sin bis ni redención barata, mierda, y el chat lo tiene claro, coño.',
  'Cierre del acta de {N}, coño, y el chat lo tiene claro, cabrón.',
  'Ranking documentado. Firmado por el bot, asco, y el chat lo tiene claro, gilipollas.',
  'Se acabó el conteo. Duele, patético, y el chat lo tiene claro, patético.',
  'Top fuera. Guardad el cringe, basura, y el chat lo tiene claro, asco.',
  'Fin del ranking de turno, ridículo, y el chat lo tiene claro, basura.',
  'Cierre. El eco sigue señalando nombres, fracasado, y el chat lo tiene claro, ridículo.',
  'Lista cerrada. Sin maquillaje posible, joder, y el chat lo tiene claro, fracasado.',
  'Ranking servido. El chat puede odiar en paz, cabrón, y el chat lo tiene claro, joder.',
  'Top sellado sin piedad, gilipollas, y el chat lo tiene claro, mierda.',
  'Fin. Los números hablaron, mierda, y el chat lo tiene claro, coño.',
  'Cierre del desfile, coño, y el chat lo tiene claro, cabrón.',
  'Ranking archivado, asco, y el chat lo tiene claro, gilipollas.',
  'Se terminó el top de la vergüenza, patético, y el chat lo tiene claro, patético.',
  'Lista lista y dolorosa, basura, y el chat lo tiene claro, asco.',
  'Fin de conteo. Sin indultos, ridículo, y el chat lo tiene claro, basura.',
  'Cierre. {N} quedan expuestos, fracasado, y el chat lo tiene claro, ridículo.',
  'Top cerrado con llave, joder, y el chat lo tiene claro, fracasado.',
  'Ranking sin filtro comercial, cabrón, y el chat lo tiene claro, joder.',
  'Fin del show numérico, gilipollas, y el chat lo tiene claro, mierda.',
  'Cierre del ranking diario, mierda, y el chat lo tiene claro, coño.',
  'Lista servida. El resto es ruido, coño, y el chat lo tiene claro, cabrón.',
  'Top documentado en el historial, asco, y el chat lo tiene claro, gilipollas.',
  'Se acabó. Capturad y callad, patético, y el chat lo tiene claro, patético.',
  'Ranking sellado, basura, y el chat lo tiene claro, asco.',
  'Fin. El bot cumplió, ridículo, y el chat lo tiene claro, basura.',
  'Cierre sin apelación, fracasado, y el chat lo tiene claro, ridículo.',
  'Fin del desfile de la vergüenza, mierda, fracasado, y el chat lo tiene claro, fracasado.'
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
