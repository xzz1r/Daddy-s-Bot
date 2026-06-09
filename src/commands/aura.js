const { isOwner, isAdmin, getTarget, getSender, bareJid } = require('../utils/wa');
const { pickFresh } = require('../utils/helpers');
const { getAura, addAura, getAuraRanking, STARTING_AURA } = require('../utils/auraStore');

const ROLL_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes per user per group
const lastRoll = new Map(); // `${groupJid}|${bareJid}` -> timestamp

// Aura roll, rigged by the ROLLER's own role — same owner-favoritism as the
// percent games: the owner mostly gains big, admins are mixed, regular members
// mostly lose (it's a roast bot). Returns { tier, amount }.
function rollAura(targetIsOwner, targetIsAdmin) {
  const r = Math.random();
  const big = () => (50 + Math.floor(Math.random() * 51)) * 100;  // 5000..10000
  const small = () => (5 + Math.floor(Math.random() * 36)) * 100; // 500..4000

  if (targetIsOwner) {
    // Owner is favored but still subject to house edge.
    if (r < 0.35) return { tier: 'blessed', amount: big() };
    if (r < 0.55) return { tier: 'gain',    amount: small() };
    if (r < 0.80) return { tier: 'loss',    amount: -small() };
    return { tier: 'cursed', amount: -big() };
  }
  if (targetIsAdmin) {
    // Admin: slight edge but house always wins long term.
    if (r < 0.15) return { tier: 'blessed', amount: big() };
    if (r < 0.30) return { tier: 'gain',    amount: small() };
    if (r < 0.68) return { tier: 'loss',    amount: -small() };
    return { tier: 'cursed', amount: -big() };
  }
  // member — 30% positive, 70% negative.
  if (r < 0.10) return { tier: 'blessed', amount: big() };
  if (r < 0.30) return { tier: 'gain',    amount: small() };
  if (r < 0.70) return { tier: 'loss',    amount: -small() };
  return { tier: 'cursed', amount: -big() };
}

const AURA = {
  blessed: [
    'Entraste, miraste a la nada, y el grupo entero se cagó de respeto. Aura de depredador alfa.',
    'No dijiste ni una palabra y silenciaste a cuatro bocazas de golpe. Eso es dominio puro.',
    'Hiciste algo tan frío que hasta el que te odia tuvo que tragarse el orgullo. Aura máxima.',
    'Esta movida se va a contar en el grupo durante años. Acabas de ascender a otra liga.',
    'Caminaste sin mirar atrás mientras todo ardía detrás de ti. Aura de villano de película.',
    'Nadie entiende cómo lo hiciste y ese es justo el punto. Aura de leyenda inalcanzable.',
    'Una sola frase y dejaste a tres personas reescribiendo su autoestima. Poder absoluto.',
    'Tu aura ahora mismo da miedo. La gente baja la voz cuando apareces y tú ni te enteras.',
    'Convertiste una situación normal en una escena épica sin despeinarte. Aura de protagonista.',
    'Te quedaste de hielo mientras todos perdían la cabeza. El grupo te miró como a un dios.',
    'Eso fue tan limpio que deberían enseñarlo en la universidad. Aura por las nubes.',
    'Apareciste, dijiste lo justo, te fuiste. Maestría que el resto solo puede envidiar.',
    'La frialdad con la que lo hiciste congeló el chat en seco. Respeto total e involuntario.',
    'Generaste una leyenda urbana en tiempo real. Aura infinita, sin techo, imparable.',
    'Ni pestañeaste. Y por eso mismo ahora todos quieren ser tú. Aura demoledora.',
    'El silencio que dejaste vale más que mil mensajes de los demás juntos. Otro nivel.',
    'Hiciste que el grupo entero pareciera amateur sin mover un dedo. Mog social absoluto.',
    'Esto va directo al hall de la fama. Aura máxima histórica, sin asterisco.',
    'Cerraste la boca a todos sin abrir la tuya. Aura de leyenda viva y caminante.',
    'Lo que hiciste no tiene explicación racional. El grupo solo puede arrodillarse.',
    'Te fuiste antes de que terminaran de procesarlo. Aura de fantasma con clase.',
    'Hasta tu peor enemigo tuvo que escribir "respeto" en el chat. Eso no pasa nunca.',
    'Dejaste a todos en visto y aun así ganaste el round. Frialdad de campeón mundial.',
    'Redefiniste lo que significa tener clase en este grupo. Aura suprema indiscutible.',
    'Una mirada y desactivaste tres egos a la vez. Aura quirúrgica, precisión letal.',
    'El chat tembló y tú ni te inmutaste. Aura de hielo puro, sangre fría total.',
    'Lo hiciste ver tan fácil que ahora todos se sienten inútiles. Y tienen razón.',
    'Te convertiste en el tema del que todos van a hablar mañana. Aura histórica.',
    'Pasaste por encima de la situación como si no existiera. Aura imparable, rodillo.',
    'Sin un mensaje, sin una explicación, solo dominio absoluto. El grupo enmudeció.',
    'Todos guardaron silencio solo para verte actuar. Aura de respeto reverencial.',
    'Hiciste que el resto reconsiderara toda su existencia en directo. Aura aplastante.',
    'Frialdad de manual. Te miraron y entendieron que no juegan en tu liga.',
    'Tan limpio que ni dejaste huellas. Aura de profesional que el grupo no merece.',
    'Subiste de nivel delante de todos y nadie pudo ni seguirte el polvo. Legendario.',
    'Tu calma en pleno caos fue la verdadera ejecución. Aura de otro planeta.',
  ],
  gain: [
    'Movida sólida. Sumaste aura sin hacer ruido, como los que de verdad saben.',
    'Bien jugado. Pequeño pero quirúrgico, el grupo lo registró en silencio.',
    'Te llevas puntos con eso. No épico, pero más de lo que el grupo esperaba de ti.',
    'Detalle con clase. Tu aura sube un escalón y alguien tomó nota.',
    'Correcto y con filo. Aura en alza, aprovéchala antes de cagarla.',
    'Bien medido. Te llevas tu aura merecida sin tener que rogar.',
    'Sin pasarte, sin quedarte corto. Suma justa para alguien de tu nivel.',
    'Buena lectura del momento. El aura lo agradece y el grupo también.',
    'Discreto pero letal. Así se construye reputación, no a base de ruido.',
    'Te ganaste el asentimiento silencioso del grupo. Para ti eso ya es mucho.',
    'Nada espectacular, pero nadie te puede quitar estos puntos. Disfrútalos.',
    'Jugada limpia. El aura sube despacio, que es como sube la de los que aguantan.',
    'Bien ahí. Pequeña victoria, pero victoria, que ya es raro en ti.',
    'Sumaste sin drama. La forma más digna de ganar aura que has tenido en meses.',
    'Aprobado con nota. El aura te sonríe hoy, no te acostumbres.',
    'Movimiento correcto. Nada que presumir, pero por una vez nada que lamentar.',
    'Te llevas el visto bueno del grupo, aunque sea sin entusiasmo. Mejor eso que nada.',
    'Cumpliste. El aura te paga lo justo y ni un punto más, porque más no diste.',
    'Pequeño acierto. Lo justo para no hacer el ridículo hoy. Milagro.',
    'Bien medido. Te llevas tu trocito de aura sin que nadie te lo discuta.',
    'Nada del otro mundo, pero el aura lo cuenta a tu favor por esta vez.',
    'Te ganaste un punto de respeto silencioso. Sujétalo fuerte que dura poco.',
    'Acierto modesto. El aura sube lo justo para que se note que sigues vivo.',
    'Jugada decente. Ni aplausos ni abucheos, solo un raro avance tuyo.',
    'Sumaste sin hacerte notar. Tu estilo natural: pasar desapercibido ganando.',
    'Pequeño paso al frente. El aura lo registra y pasa página rápido.',
    'Correcto sin brillar. Tu marca personal. Aun así, suma es suma.',
    'Te llevas unos puntos honestos. Nadie te los discute porque a nadie le importas tanto.',
    'Buen detalle. El aura te lo reconoce a media voz para no hacerte ilusiones.',
    'Avance discreto. El grupo asiente y olvida tu nombre en cinco minutos.',
    'Pequeña ganancia limpia. Hoy el aura no te castiga. Hoy.',
    'Sólido sin más. El aura te deja seguir en positivo por pura compasión.',
    'Acierto de los que no se celebran pero se agradecen. Justo tu techo.',
  ],
  loss: [
    'Perdiste aura, puto inútil, y se vio en directo. El grupo guardó captura para reírse de ti esta noche.',
    'Otra cagada tuya y el aura te la cobra entera. Eres incapaz de hacer una sola cosa sin quedar como basura.',
    'Pierdes puntos porque eres un fracaso andante. No es mala suerte, es que naciste para perder.',
    '¿Tu mejor momento? No existe. Solo encadenas ridículos y este es uno más en tu lista interminable de fracasos.',
    'Bajón merecido, perdedor. Lo tuyo no es una racha, es tu personalidad de mierda funcionando a pleno rendimiento.',
    'Cualquiera con dos dedos de frente lo evitaba. Tú no, porque eres exactamente igual de torpe que de inútil.',
    'Resbalón de subnormal. El aura te lo cobra sin piedad porque te lo has ganado a pulso, puto manco.',
    'No leíste la situación ni con instrucciones. Pierdes aura y dignidad, aunque dignidad ya no te quedaba.',
    'Te delataste solo, como el payaso que eres. El grupo lo vio, se rió de ti y siguió como si no existieras.',
    'Cagada de manual. Mañana otra, y pasado otra. Es lo único constante que tienes en tu triste existencia.',
    'Innecesario y patético. El aura te pasa factura con intereses por ser el inútil de siempre.',
    'Pierdes lo poco que tenías por una estupidez tuya. Resumen perfecto de tu vida entera, fracasado.',
    'Metida de pata marca de la casa. El aura ya ni se inmuta contigo, solo descuenta y suspira de pena.',
    'No cuadró nada porque tú no cuadras en ningún sitio. Resta justa para alguien que sobra por donde pisa.',
    'Ahí perdiste el hilo y lo poco de respeto que mendigabas. El aura lo apunta todo en rojo, basura.',
    'Te quedaste a medias, como en todo lo que tocas. El aura te cobró el ridículo completo y con público.',
    'Sonó mil veces peor de lo que tu cerebro de mosquito creía. El grupo hizo una mueca de asco por ti.',
    'Te pasaste de listo sin serlo y el aura te devolvió a tu sitio: el fondo, debajo de todos, donde vives.',
    'Ridículo que el grupo recordará más que tú mismo. Patético, pero ya es lo normal viniendo de ti.',
    'Hablaste de más, como el bocazas vacío que eres, y el aura te lo descontó al instante. Bien hecho, idiota.',
    'No mediste el momento ni de coña. Bajón merecido al milímetro para alguien que nunca acierta una.',
    'Quedó flojísimo, igual que tú. El aura te resta y ni se molesta en dramatizar porque ya te conoce.',
    'Te enredaste tú solo, sin ayuda de nadie. Pérdida barata y una lección más que tu cabeza hueca no aprenderá.',
    'No supiste ni cerrar eso. El aura te penaliza por ser el amateur eterno que nunca dejarás de ser.',
    'Metiste la pata hasta el cuello. El aura cobra y el grupo respira aliviado de no ser el fracaso que eres tú.',
    'Vergonzoso a secas. Resta justa y recuerdo permanente de lo poca cosa que eres, puto.',
    'Te quedaste corto justo cuando tocaba dar la cara. O sea, exactamente como siempre, cobarde inútil.',
    'Desliz de pringado. El aura no te lo perdona ni gratis porque hasta el aura está harta de ti.',
    'No cuajó la jugada porque TÚ no cuajas en nada. El aura te quita lo justo para recordarte tu lugar.',
    'Te delataste solo otra vez. Pérdida pequeña, pero el grupo ya te tenía fichado como el lastre que eres.',
    'Innecesario y se olió a kilómetros. Resta merecida, sin atenuantes, para un perdedor sin remedio.',
    'Tropiezo de tonto, tu especialidad. El aura te lo apunta en rojo junto a los otros mil que llevas.',
    'Bajón por abrir la boca sin pensar. Nada nuevo en ti, campeón del fracaso, sigue así hasta el fondo.',
  ],
  spiral: [
    'Ya estabas en el foso y sigues cavando, subnormal. Nadie te lanza una cuerda porque a nadie le importas una mierda.',
    'Aura negativa y en caída libre. Ríndete antes de que la pena que das alcance niveles que ni un médico cura.',
    'El pozo no tiene fondo si el que cava eres tú. Ríndete: sería lo único inteligente que harías en tu puta vida.',
    'Tan en negativo que ya eres deuda con patas. Nadie te cotiza, fracasado. El mercado de aura te canceló hace meses.',
    'Sigue hundiéndote, basura. Quizás algún día llegues a entender lo poca cosa que eres. Quizás. Lo dudo.',
    'Tocas fondo y resulta que había más fondo. Tu talento para el desastre es lo único grande que tienes.',
    'Tus pérdidas ya no son pérdidas, son tu forma de existir. Manda la carta de rendición y púdrete en paz.',
    'En negativo y bajando, como tu vida entera. Si fueras una acción, te habrían enterrado hace años, perdedor.',
    'Punto a punto al abismo. El grupo ya ni se ríe de ti, le das pena clínica. Y eso es mil veces peor.',
    'Tu aura cotiza como la basura que eres. Ríndete o cómprala. No vas a hacer ninguna porque eres un inútil.',
    'Negativo y más negativo. Caída libre de alguien que nunca tuvo nada. Naciste abajo y ahí te vas a morir.',
    'Cada tiro te hunde más y sigues tirando, idiota. Definición de subnormal: repetir lo mismo esperando otro final.',
    'Ya no es mala racha, es tu carácter de mierda. El aura solo refleja lo que todos ya saben: eres un fracaso.',
    'El universo lleva meses gritándote lo mismo de mil formas. Escúchalo de una puta vez: no vales nada. Ríndete.',
    'Espiral de aura negativa documentada en directo. El grupo ya tiene capturas de tu decadencia para el recuerdo.',
    'Infrahumano de aura. No es un insulto, es la descripción técnica exacta de lo que muestra tu marcador, puto.',
    'Ríndete ya, formalmente. Llega antes, duele menos, y por primera vez en tu vida tomarías la decisión correcta.',
    'Tu aura en rojo ya es parte del folclore del grupo. Eres el ejemplo viviente de lo que nadie quiere llegar a ser.',
    'Sigues perdiendo hasta en tu propio terreno. Ríndete, fracasado, que es lo único para lo que sirves.',
    'El cope ya no te alcanza ni de lejos. La gravedad te gana y el aura te lo certifica tiro a tiro, perdedor.',
  ],
  cursed: [
    'Acabas de perder TODA tu aura de golpe y con público, puto inútil. El grupo lo grabó para reírse de por vida.',
    'Tan vergonzoso que hasta el aura salió huyendo de ti pidiendo un dueño que no sea una basura como tú.',
    'Catástrofe total. Tu aura quedó en negativo histórico, un récord de mierda que solo un fracaso como tú rompería.',
    'Te van a recordar, sí: como el ejemplo perfecto de lo que jamás hay que ser. Aura aniquilada, igual que tu orgullo.',
    'Te hundiste tú solo, sin que nadie te empujara. Tu único talento real: el desastre. Enhorabuena, perdedor.',
    'De esta no te levantas. El grupo bajó la cabeza de pura pena ajena por el fracaso andante que eres.',
    'Aura destruida en tiempo récord. Felicidades por el único logro de tu vida: ser un completo inútil con público.',
    'Hiciste un ridículo digno de estudio. Cero aura y un trauma colectivo para todo el que tuvo que presenciarlo.',
    'El silencio incómodo que dejaste va a doler semanas. Aura colapsada, igual que tu patética autoestima.',
    'Perdiste tanta aura que hasta arrastraste a la pobre gente cerca de ti. Eres tóxico hasta para perder, basura.',
    'Autogol en cámara lenta y con repetición. Aura por los suelos y la cara de imbécil también. Espectáculo lamentable.',
    'Ni el más tonto del grupo puede defender esta mierda que has hecho. Aura nula y reputación de pringado total.',
    'Bienvenido al salón de la vergüenza del grupo. Plaza vitalicia, perdedor. Aura negativa permanente con tu nombre.',
    'Te caíste con todo el equipo y encima les pisaste al caer. El aura no perdona, y el grupo tampoco, fracasado.',
    'Desastre absoluto. La próxima vez ahórratelo, cierra la puta boca y quédate quieto, por el bien de todos.',
    'Tu aura tocó fondo y siguió cavando hacia el infierno. Impresionante el nivel de inutilidad que cargas encima.',
    'Tan malo que hasta tus colegas fingieron no conocerte y se cambiaron de chat. Solo y en cero, como te mereces.',
    'Aura evaporada. El grupo necesita un minuto de silencio por la basura que acaba de presenciar en directo.',
    'Quemaste tu aura y la de tres generaciones futuras. La maldición genética del fracaso ya es oficialmente tuya.',
    'Tan patético que el grupo entero sintió vergüenza ajena hasta los huesos. Eres incómodo hasta para perder, puto.',
    'Tu aura no bajó: se desplomó delante de todos y no se levantó. Como tú en la vida, perdedor sin remedio.',
    'El ridículo más grande de la historia del chat lo acabas de firmar tú. Aura cero absoluto, sin vuelta atrás.',
    'Ni tu madre defendería esto, y eso que tu madre te lo aguanta todo. Aura pulverizada y vergüenza familiar.',
    'El grupo te usará de advertencia para las próximas generaciones. Aura muerta, enterrada y meada encima, fracasado.',
    'Te humillaste solo, en directo y sin guion. Nadie te empujó, basura. Aura aniquilada por mérito propio. Olé tú.',
    'Tan malo que hasta el aura pidió el divorcio, se llevó la casa, el coche y a los niños. Te quedaste sin nada. Como siempre.',
    'Quedaste tan en evidencia que ya ni da rabia, da lástima pura. Aura enterrada sin flores y sin nadie que llore.',
    'Protagonizaste el peor momento del grupo en años, inútil. Aura inexistente y una leyenda negra con tu cara.',
    'Te caíste tan bajo que hasta el subsuelo te queda por encima. Aura subterránea, donde viven los fracasos como tú.',
    'Papelón del siglo con audiencia en directo. Aura desintegrada a nivel atómico, igual que tu dignidad de mierda.',
    'El silencio que dejaste fue de pena ajena, no de respeto. Aura demolida y un grupo entero agradeciendo no ser tú.',
    'Borraste de un plumazo cualquier resto de respeto que mendigabas. Enhorabuena por nada, puto perdedor.',
    'Desastre radiactivo de aura. Nadie sobrevive cerca de ti hoy. Evacúen la zona, que el fracaso es contagioso.',
    'Te exhibiste de una forma que ni el guion más cruel se atrevería a escribir. Aura cero y vergüenza eterna, basura.',
    'El grupo entero hizo captura para reírse de ti durante meses. Aura ejecutada en plaza pública, fracasado.',
    'Tu aura tocó fondo, rebotó y se hundió más profundo. Récord absoluto de humillación. Eres bueno en una cosa: perder.',
  ],
};

const fmt = (n) => n.toLocaleString('es-ES');

// !aura top — leaderboard of accumulated aura in the group.
async function showRanking(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'El ranking de aura solo existe en grupos.' }, { quoted: msg });
  }
  const ranking = (await getAuraRanking(jid)).slice(0, 10);
  if (ranking.length === 0) {
    return sock.sendMessage(jid, { text: 'Nadie ha medido su aura todavía. Usa *!aura*.' }, { quoted: msg });
  }
  const medals = ['🥇', '🥈', '🥉'];
  let text = '*RANKING DE AURA*\n\n';
  const mentions = [];
  ranking.forEach((r, i) => {
    const tag = medals[i] || `*${i + 1}.*`;
    text += `${tag} @${r.jid.split('@')[0]} — ${fmt(r.aura)}\n`;
    mentions.push(r.jid);
  });
  await sock.sendMessage(jid, { text: text.trimEnd(), mentions }, { quoted: msg });
}

// !aura [@user]  — rolls aura for the target and updates their PERSISTENT total.
// !aura top      — shows the group leaderboard.
async function cmdAura(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;

  const sub = (args && args[0] ? args[0] : '').toLowerCase();
  if (['top', 'rank', 'ranking', 'leaderboard'].includes(sub)) {
    return showRanking(sock, msg, groupMeta);
  }

  const sender = getSender(msg);

  // El aura es como una moneda: solo el dueño la juega. !aura @alguien es solo
  // una CONSULTA del aura de esa persona — no tira, no gasta cooldown y no
  // modifica nada. Tirar (subir/bajar) siempre es sobre uno mismo.
  const mentioned = getTarget(msg);
  if (mentioned && bareJid(mentioned) !== bareJid(sender)) {
    const aura = await getAura(jid, mentioned);
    return sock.sendMessage(jid, {
      text: `*@${mentioned.split('@')[0]}* tiene *${fmt(aura)}* de aura.`,
      mentions: [mentioned],
    }, { quoted: msg });
  }

  const coolKey = `${jid}|${bareJid(sender)}`;
  const last = lastRoll.get(coolKey) || 0;
  const remaining = ROLL_COOLDOWN_MS - (Date.now() - last);
  if (remaining > 0) {
    const mins = Math.ceil(remaining / 60_000);
    return sock.sendMessage(jid, {
      text: `Espera *${mins}min* para volver a tirar.`,
    }, { quoted: msg });
  }
  lastRoll.set(coolKey, Date.now());

  // The roll is rigged by the SENDER's own role — you only ever play your own aura.
  const selfIsOwner = isOwner(sender, msg.key.fromMe, groupMeta);
  const selfIsAdmin = isAdmin(groupMeta?.participants, sender);

  const { tier, amount } = rollAura(selfIsOwner, selfIsAdmin);
  const sign = amount >= 0 ? '+' : '-';

  const { previous, current } = await addAura(jid, sender, amount);

  // Already in the red and going deeper: use spiral phrases
  const effectiveTier = (previous < 0 && amount < 0) ? 'spiral' : tier;

  const text =
    `*@${sender.split('@')[0]}  ${sign}${fmt(Math.abs(amount))} de aura*\n` +
    `${pickFresh(AURA[effectiveTier], `${jid}|aura|${effectiveTier}`)}\n\n` +
    `Aura total: *${fmt(current)}*`;

  await sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: msg });
}

module.exports = { cmdAura };
