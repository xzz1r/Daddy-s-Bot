const { getActiveUsers } = require('../utils/messageCounter');
const { isMainOwner, soloMiembros, getSender } = require('../utils/wa');
const { shuffle, pickFresh } = require('../utils/helpers');
const { cobrar, devolver, textoSinSaldo } = require('../utils/auraCobro');
const { SOLO_GRUPOS } = require('../data/avisos');
const { aviso } = require('../utils/helpers');

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
  'Enhorabuena, gilipollas. Sois {N} y os jodéis igual.',
  'El bot ha meado esta lista y os ha tocado a los {N}.',
  'Sois {N} de mierda, repartíos la vergüenza como podáis.',
  'Ni Dios pidió esto, pero ahí quedáis los {N}.',
  '{N} nombres, cero dignidad y ni una hostia de sorpresa.',
  'Que os folle un pez, los {N}. El bot ya cumplió.',
  'Los {N} de hoy. Mañana otros, la mierda es la misma.',
  'Coño, sois {N} y ninguno se libra del ridículo.',
  'El azar os ha cagado encima a los {N}. De nada.',
  'Ahí lo tenéis: que no diga nadie que el bot no reparte mierda.',
  '{N} elegidos por un algoritmo con los cojones bien puestos.',
  'Puta lista, joder. Y os ha tocado a los {N}.',
  'Los {N} ya pueden ir cavando su propia tumba social.',
  'Ni votos ni jueces: el bot os ha señalado, hostia.',
  'Sois {N} y ninguno tiene ya donde esconderse.',
  'Ahí quedáis marcados los {N}, como el ganado.',
  'El bot no perdona: {N} nombres y a joderse todos.',
  'Menuda cuadrilla de mierda, los {N} que han salido.',
  'Que os aproveche el bochorno, hatajo de cabrones.',
  '{N} nombres soltados sin anestesia. Aguantad, cojones.',
  'Los {N} de la lista, cortesía de un bot sin corazón.',
  'Vaya papelón os ha tocado, joder, a los {N}.',
  'Sois carne de cachondeo grupal, los {N}.',
  '{N} nombres y ni una puta medalla de consuelo.',
  'Ahí os quedáis, los {N}, con el culo al aire.',
  'El bot ha hablado: los {N}, y que os den por saco.',
  'Sois {N}. Sois mierda de hoy. Mañana otra tanda de mierda.',
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
