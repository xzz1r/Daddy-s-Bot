const { isOwner, isAdmin, getTargetOrSelf, getSender } = require('../utils/wa');
const { pick } = require('../utils/helpers');
const { getAura, addAura, getAuraRanking, STARTING_AURA } = require('../utils/auraStore');

// Rolling mutates persistent aura, so it can't be spammed to farm. One roll per
// person every few minutes — aura is meant to drift over time, not explode.
const ROLL_COOLDOWN_MS = 5 * 60 * 1000;
const lastRoll = new Map(); // 'groupJid|rollerBareJid' -> timestamp

// Aura roll, rigged by the TARGET's role — same owner-favoritism as the percent
// games: the owner mostly gains big, admins are mixed, regular members mostly
// lose (it's a roast bot). Returns { tier, amount }.
function rollAura(targetIsOwner, targetIsAdmin) {
  const r = Math.random();
  const big = () => (50 + Math.floor(Math.random() * 51)) * 100;  // 5000..10000
  const small = () => (5 + Math.floor(Math.random() * 36)) * 100; // 500..4000

  if (targetIsOwner) {
    if (r < 0.75) return { tier: 'blessed', amount: big() };
    if (r < 0.95) return { tier: 'gain',    amount: small() };
    if (r < 0.98) return { tier: 'loss',    amount: -small() };
    return { tier: 'cursed', amount: -big() };
  }
  if (targetIsAdmin) {
    if (r < 0.25) return { tier: 'blessed', amount: big() };
    if (r < 0.55) return { tier: 'gain',    amount: small() };
    if (r < 0.82) return { tier: 'loss',    amount: -small() };
    return { tier: 'cursed', amount: -big() };
  }
  // member — roast-leaning
  if (r < 0.08) return { tier: 'blessed', amount: big() };
  if (r < 0.25) return { tier: 'gain',    amount: small() };
  if (r < 0.65) return { tier: 'loss',    amount: -small() };
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
    'Uf. Eso te costó aura y se vio en HD. El grupo no lo va a olvidar pronto.',
    'Tropiezo bien feo. El grupo lo registró, se rió bajito y siguió sin ti.',
    'Perdiste puntos por eso. Recuperable, pero la mancha ahí se queda.',
    'No fue tu mejor momento. Aunque, siendo sinceros, ¿cuándo fue tu mejor momento?',
    'Bajón merecido. Todos tenemos días malos, lo tuyo es ya una racha histórica.',
    'Eso se podía evitar con dos dedos de frente. Resta de aura totalmente justa.',
    'Resbalón de principiante. El aura te lo cobra sin piedad y con razón.',
    'No leíste la situación ni con subtítulos. Pequeño pero humillante costo de aura.',
    'Te delataste solo ahí. El grupo lo notó y guardó captura para reírse luego.',
    'Bajón claro. Mañana será otro día para que vuelvas a cagarla, tranquilo.',
    'Eso fue innecesario y el aura te pasa factura con intereses.',
    'Pierdes terreno. Lo poco que tenías y encima por una tontería tuya.',
    'Metida de pata de las tuyas. El aura ya ni se sorprende, solo descuenta.',
    'No cuadró nada. Resta justa por intentar algo para lo que claramente no estás.',
    'Ahí perdiste el hilo y la dignidad de paso. El aura lo apunta todo.',
    'Te quedaste a medias, como siempre, y el aura te cobró el ridículo completo.',
    'Sonó mil veces peor de lo que creías. El grupo hizo una mueca por ti.',
    'Te pasaste de listo y el aura te bajó a tu sitio. Tu sitio es abajo.',
    'Resbalón que el grupo va a recordar más que tú. Triste pero cierto.',
    'Hablaste de más, como de costumbre, y el aura te lo descontó al instante.',
    'No mediste el momento ni de lejos. Bajón discreto pero merecido al milímetro.',
    'Eso quedó flojísimo. El aura te resta y ni se molesta en dramatizar contigo.',
    'Te enredaste tú solo sin ayuda. Pérdida barata, lección que no vas a aprender.',
    'No supiste cerrar ni eso. El aura te penaliza por amateur.',
    'Metiste la pata hasta el fondo. El aura cobra y el grupo respira aliviado de no ser tú.',
    'Eso fue vergonzoso a secas. Resta justa, recuerdo permanente.',
    'Te quedaste corto justo cuando tocaba brillar. O sea, como siempre.',
    'Desliz de manual. El aura no te lo deja pasar ni gratis ni con descuento.',
    'No cuajó la jugada porque tú no cuajas. El aura te quita lo justo.',
    'Te delataste con esa. Pérdida pequeña pero el grupo ya te tenía calado.',
    'Innecesario y se notó a kilómetros. Resta merecida sin atenuantes.',
    'Tropiezo de los tontos, marca de la casa. El aura te lo apunta en rojo.',
    'Bajón por hablar sin pensar. Nada nuevo bajo el sol, campeón.',
  ],
  cursed: [
    'Acabas de perder TODA tu aura de un golpe y con público. El grupo lo grabó en su memoria.',
    'Eso fue tan vergonzoso que el aura salió corriendo y pidió cambio de dueño.',
    'Catástrofe nuclear. Tu aura quedó en negativo histórico, récord que nadie quería romper.',
    'Te van a recordar, sí, pero como el ejemplo de lo que jamás hay que hacer. Aura aniquilada.',
    'Te hundiste tú solo, sin que nadie te empujara. Talento natural para el desastre.',
    'De esto no te levantas pronto. El grupo bajó la cabeza por ti, de pura pena.',
    'Aura destruida en tiempo récord mundial. Enhorabuena por el logro, supongo.',
    'Hiciste un ridículo que merece estudio académico. Cero aura y un trauma colectivo.',
    'El silencio incómodo que dejaste va a doler durante semanas. Aura colapsada del todo.',
    'Perdiste tanta aura que arrastraste a la pobre gente que estaba cerca tuya.',
    'Autogol en cámara lenta y con repetición. Aura por los suelos y la cara también.',
    'Ni el más optimista del grupo puede defender lo que acabas de hacer. Aura nula total.',
    'Bienvenido al salón de la vergüenza del grupo. Plaza vitalicia. Aura negativa permanente.',
    'Te caíste con todo el equipo y encima les pisaste al caer. El aura no perdona esto.',
    'Desastre absoluto. La próxima vez ahórratelo y quédate calladito, por todos.',
    'Tu aura tocó fondo y siguió cavando hacia el infierno. Impresionante en el peor sentido.',
    'Tan malo que hasta tus aliados fingieron no conocerte y se cambiaron de chat.',
    'Aura evaporada. El grupo necesita un minuto de silencio por lo que acaba de presenciar.',
    'Quemaste toda tu aura y la de tus próximas tres generaciones. Maldición genética activada.',
    'Tan patético que el grupo entero sintió vergüenza ajena hasta en los huesos.',
    'Tu aura no bajó: se desplomó delante de todos y no se volvió a levantar. Espectáculo lamentable.',
    'Hiciste el ridículo más grande de la historia del chat. Aura cero absoluto, sin retorno.',
    'Ni tu madre defendería esto, y tu madre te defiende todo. Aura pulverizada.',
    'El grupo te va a usar de advertencia para las próximas generaciones. Aura muerta y enterrada.',
    'Te humillaste solo, en directo y sin guion. Nadie te empujó. Aura aniquilada por mérito propio.',
    'Tan malo que el aura pidió el divorcio, se llevó la casa, el coche y a los niños.',
    'Quedaste tan en evidencia que ya no da rabia, da lástima pura. Aura enterrada sin flores.',
    'Acabas de protagonizar el peor momento del grupo en años. Aura inexistente y leyenda negra.',
    'Te caíste tan bajo que el subsuelo te queda por encima. Aura subterránea, capa freática.',
    'Papelón del siglo y con audiencia en directo. Aura desintegrada a nivel atómico.',
    'El silencio que dejaste fue de los que dan pena ajena, no respeto. Aura demolida.',
    'Borraste de un plumazo cualquier resto de respeto que te quedaba. Enhorabuena por nada.',
    'Desastre radiactivo de aura. Nadie sobrevive cerca de ti hoy, evacúen la zona.',
    'Te exhibiste de una forma que ni el guion más cruel se atrevería a escribir. Aura cero.',
    'El grupo entero hizo captura para reírse de ti durante meses. Aura ejecutada en plaza pública.',
    'Tu aura tocó fondo, rebotó y se volvió a hundir más profundo. Récord absoluto de humillación.',
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

  // Cooldown is per roller (the person invoking), so you can't farm aura by
  // hammering !aura on yourself or tanking someone else's nonstop.
  if (jid.endsWith('@g.us')) {
    const roller = getSender(msg);
    const ckey = `${jid}|${roller}`;
    const last = lastRoll.get(ckey);
    if (last && Date.now() - last < ROLL_COOLDOWN_MS) {
      const wait = Math.ceil((ROLL_COOLDOWN_MS - (Date.now() - last)) / 60000);
      return sock.sendMessage(jid, {
        text: `El aura no se fuerza. Vuelve en ~${wait} min.`,
      }, { quoted: msg });
    }
    lastRoll.set(ckey, Date.now());
  }

  const target = getTargetOrSelf(msg);
  const targetIsOwner = isOwner(target, false, groupMeta);
  const targetIsAdmin = isAdmin(groupMeta?.participants, target);

  const { tier, amount } = rollAura(targetIsOwner, targetIsAdmin);
  const sign = amount >= 0 ? '+' : '-';

  const { current } = await addAura(jid, target, amount);

  const text =
    `*@${target.split('@')[0]}  ${sign}${fmt(Math.abs(amount))} de aura*\n` +
    `${pick(AURA[tier])}\n\n` +
    `Aura total: *${fmt(current)}*`;

  await sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
}

module.exports = { cmdAura };
