const { getActiveUsers } = require('../utils/messageCounter');
const { isMainOwner, soloMiembros, getSender } = require('../utils/wa');
const { shuffle, pickFresh } = require('../utils/helpers');
const { cobrar, devolver, textoSinSaldo } = require('../utils/auraCobro');
const { SOLO_GRUPOS } = require('../data/avisos');
const { aviso } = require('../utils/helpers');
const logger = require('../utils/logger');

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
  'Los {N} de la vergüenza, servidos en bandeja de mierda.',
  'Ahí tenéis la mierda que ha escupido el bot hoy. Los {N} de turno.',
  '{N} nombres y ni una puta excusa entre todos.',
  'Enhorabuena, gilipoyas. Sois {N} y os jodéis igual.',
  'El bot ha meado esta lista y os ha tocado a los {N}.',
  'Sois {N} de mierda, repartíos la vergüenza como podáis.',
  '{N} nombres, cero dignidad y ni una hostia de sorpresa.',
  'Que os folle un pez, los {N}. El bot ya cumplió.',
  'Coño, sois {N} y ninguno se libra del ridículo.',
  'El azar os ha cagado encima a los {N}. De nada.',
  'Sois {N} y ninguno tiene ya dónde esconderse.',
  'El bot no perdona: {N} nombres y a joderse todos.',
  'Menuda cuadrilla de mierda, los {N} que han salido.',
  'Que os aproveche el bochorno, hatajo de cabrones.',
  'Sois carne de cachondeo grupal, los {N}.',
  'Ahí os quedáis, los {N}, con el culo al aire.',
  'El bot ha hablado: los {N}, y que os den por saco.',
  'Sois {N}. Sois mierda de hoy. Mañana otra tanda de mierda.',
  'Ahí quedáis los {N}, con nombre, apellido y el grupo mirando.',
  '{N} menciones de golpe. Ya no se puede disimular.',
  'Los {N}, en fila y a la vista. El orden da igual, la vergüenza es la misma.',
  'Sois {N} y os ha tocado por sorteo. Ni el sorteo os quería.',
  'Los {N} de hoy, servidos. Los demás, que no se rían tan alto.',
  '{N} nombres metidos en el mismo saco, y el saco huele.',
  'El título da igual. Lo que se va a recordar es que os tocó a vosotros, los {N}.',
  'Los {N} en el cartel. A partir de ahora, esto es lo que se recuerda de vosotros.',
  'Tanta gente en el grupo y han salido justo estos {N}. Qué puntería.',
  '{N} nombres y ni una queja válida. El sorteo no admite reclamaciones.',
  'Los {N}, apuntados con arroba. Así no se escapa ni uno.',
  'Los {N}, enhorabuena. Es lo más cerca de un premio que vais a estar en la vida.',
];

function rellenar(plantilla, picked) {
  return plantilla.replace(/\{N\}/g, String(picked.length));
}

async function cmdTopRandom(sock, msg, n, args, groupMeta) {
  const jid = msg.key.remoteJid;

  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
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
    return sock.sendMessage(jid, { text: textoSinSaldo(concepto, pago, jid) }, { quoted: msg });
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
    await devolver(jid, quienPide, pago, concepto).catch((e) => logger.unaVez('devolver aura (tops)', e));
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
    `\n` +
    lineas.join('\n') +
    `\n\n` +
    `_${rellenar(pickFresh(CIERRES, `${jid}|top`), picked)}_`;

  await sock.sendMessage(jid, { text, mentions }, { quoted: msg });
}

module.exports = { cmdTopRandom, CIERRES };
