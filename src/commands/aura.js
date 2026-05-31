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
    'Acabas de mirar a la nada en silencio y todo el grupo sintió el escalofrío. Aura imposible de medir.',
    'Entraste, no dijiste nada, y la conversación se detuvo sola. Eso no se compra.',
    'Hiciste algo tan frío que hasta tus enemigos asintieron en respeto. Aura máxima.',
    'La gente va a contar esta movida durante años. Acabas de subir a otra liga.',
    'Caminaste sin mirar atrás mientras todo explotaba detrás de ti. Aura de protagonista.',
    'Nadie entiende cómo lo hiciste, y ese es exactamente el punto. Aura legendaria.',
    'Dijiste una sola frase y dejaste a tres personas pensando una semana. Eso es poder.',
    'Tu nivel de aura ahora mismo asusta. La gente baja la voz cuando apareces.',
    'Convertiste una situación normal en una escena de película sin esforzarte. Aura pura.',
    'Te mantuviste tranquilo cuando todos perdían la cabeza. El grupo entero te miró distinto.',
    'Eso fue tan limpio que deberían estudiarlo. Aura por las nubes.',
    'Apareciste en el momento exacto, dijiste lo justo y te fuiste. Maestría absoluta.',
    'La frialdad con la que lo hiciste congeló el chat. Respeto total.',
    'Acabas de generar una leyenda urbana en tiempo real. Aura infinita.',
    'Ni te despeinaste. Y eso es lo que más aura da.',
    'El silencio que dejaste vale más que mil mensajes. Aura de otro nivel.',
    'Hiciste que el resto pareciera principiante sin decir una palabra.',
    'Esto se va directo al salón de la fama del grupo. Aura máxima histórica.',
    'Cerraste la boca a todos sin abrir la tuya. Aura de leyenda viva.',
    'Lo que acabas de hacer no tiene explicación racional. El grupo solo puede aplaudir.',
    'Te fuiste antes de que terminaran de procesarlo. Aura de fantasma elegante.',
    'Hasta el que te odia tuvo que escribir respeto en el chat. Eso no pasa nunca.',
    'Dejaste a todos en visto y aun así ganaste. Frialdad de campeón.',
    'Acabas de redefinir lo que significa tener clase en este grupo. Aura suprema.',
    'Una mirada y desactivaste tres egos de golpe. Aura quirúrgica.',
    'El chat tembló y tú ni pestañeaste. Aura de hielo puro.',
    'Lo hiciste ver tan fácil que ahora todos se sienten inútiles. Aura demoledora.',
    'Te convertiste en el momento del que todos van a hablar mañana. Aura histórica.',
    'Pasaste por encima de la situación como si nada. Aura imparable.',
    'Ni un mensaje, ni una explicación, solo dominio absoluto. Aura total.',
    'El grupo entero guardó silencio para verte actuar. Aura de respeto puro.',
    'Acabas de hacer que el resto reconsidere toda su existencia. Aura aplastante.',
    'Frialdad de manual. Te miraron y supieron que no estaban a tu nivel.',
    'Eso fue tan limpio que ni dejaste huellas. Aura de profesional.',
    'Subiste de nivel delante de todos y nadie pudo seguirte el ritmo. Aura legendaria.',
    'Tu calma en pleno caos fue la verdadera victoria. Aura de otro planeta.',
  ],
  gain: [
    'Movida sólida. Sumaste aura sin hacer ruido, como debe ser.',
    'Bien jugado. Pequeño pero limpio, el grupo lo notó.',
    'Ganaste puntos con eso. No épico, pero respetable.',
    'Detalle con clase. Tu aura sube un escalón.',
    'Correcto y con estilo. Aura en alza.',
    'Eso estuvo bien medido. Te llevas tu aura merecida.',
    'Sin pasarte, sin quedarte corto. Suma justa de aura.',
    'Buena lectura del momento. El aura lo agradece.',
    'Discreto pero efectivo. Así se construye reputación.',
    'Te ganaste el asentimiento silencioso del grupo. Eso cuenta.',
    'Nada espectacular, pero nadie puede quitarte estos puntos.',
    'Jugada limpia. El aura sube despacio pero seguro.',
    'Bien ahí. Pequeña victoria, victoria al fin.',
    'Sumaste sin drama. La forma más sana de ganar aura.',
    'Aprobado con nota. El aura te sonríe hoy.',
    'Movimiento correcto. Nada que presumir, pero nada que lamentar.',
    'Sumaste un poco. El grupo te dio el visto bueno sin entusiasmo.',
    'Cumpliste. El aura te paga lo justo y ni un punto más.',
    'Pequeño acierto. Lo justo para no quedar mal hoy.',
    'Bien medido. Te llevas tu trocito de aura sin escándalo.',
    'Nada del otro mundo, pero el aura lo cuenta a tu favor.',
    'Te ganaste un punto de respeto silencioso. Aprovéchalo.',
    'Acierto modesto. El aura sube lo justo para notarse.',
    'Jugada decente. Ni aplausos ni abucheos, solo un avance.',
    'Sumaste sin hacerte notar. La forma más cómoda de ganar.',
    'Pequeño paso al frente. El aura lo registra y sigue.',
    'Correcto sin brillar. Aun así, suma es suma.',
    'Te llevas unos puntos honestos. Nadie te los va a discutir.',
    'Buen detalle. El aura te lo reconoce a media voz.',
    'Avance discreto. El grupo asiente y pasa página.',
    'Pequeña ganancia limpia. Hoy el aura no te castiga.',
    'Sólido sin más. El aura te deja seguir en positivo.',
    'Acierto de los que no se celebran pero se agradecen.',
  ],
  loss: [
    'Uf. Eso te costó algo de aura. Nada grave, pero se vio.',
    'Pequeño tropiezo. El grupo lo registró y siguió.',
    'Perdiste puntos por eso. Recuperable, pero ahí queda.',
    'No fue tu mejor momento. El aura baja un poco.',
    'Ligero bajón. Todos tenemos días, pero hoy te tocó a ti.',
    'Eso se podía haber evitado. Resta de aura merecida.',
    'Resbalón menor. El aura te lo descuenta sin piedad.',
    'No leíste bien la situación. Pequeño costo de aura.',
    'Te delataste un poco ahí. El grupo lo notó.',
    'Bajón leve, pero bajón. Mañana será otro día.',
    'Eso fue innecesario y el aura te pasa factura.',
    'Pierdes algo de terreno. Nada que no se recupere con cuidado.',
    'Pequeña metida de pata. El aura la cobra igual.',
    'No cuadró. Resta modesta pero justa.',
    'Ahí perdiste el hilo y el aura lo sintió.',
    'Te quedaste a medias y el aura te cobró el resto.',
    'Eso sonó peor de lo que pensabas. Pequeña resta.',
    'Te pasaste de listo y el aura te bajó un punto.',
    'Resbalón leve, pero el grupo lo guardó en la memoria.',
    'Hablaste de más y el aura te lo descontó al instante.',
    'No medio bien el momento. Bajón discreto pero real.',
    'Eso quedó flojo. El aura te resta sin dramatizar.',
    'Te enredaste solo. Pequeña pérdida, lección barata.',
    'No supiste cerrar y el aura te penalizó.',
    'Metiste la pata a medias. El aura cobra igual.',
    'Eso fue un poco vergonzoso. Resta menor pero ahí queda.',
    'Te quedaste corto cuando tocaba brillar. Bajón leve.',
    'Pequeño desliz. El aura no lo deja pasar gratis.',
    'No cuajó la jugada. El aura te quita lo justo.',
    'Te delataste con esa. Pérdida pequeña pero visible.',
    'Eso fue innecesario y se notó. Resta modesta.',
    'Tropiezo de los tontos. El aura te lo apunta.',
    'Bajón menor por hablar sin pensar. Nada nuevo.',
  ],
  cursed: [
    'Acabas de perder TODO tu aura de golpe. El grupo entero lo presenció.',
    'Eso fue tan vergonzoso que el aura salió corriendo y no volvió.',
    'Catástrofe total. Tu aura quedó en números negativos históricos.',
    'La gente va a recordar esto, pero por las razones equivocadas. Aura aniquilada.',
    'Te hundiste solo, sin ayuda de nadie. Aura en el subsuelo.',
    'Eso no se recupera fácil. El grupo te miró y bajó la cabeza por ti.',
    'Aura destruida en tiempo récord. Felicidades, supongo.',
    'Hiciste el ridículo a un nivel que merece estudio. Cero aura.',
    'El silencio incómodo que dejaste se va a sentir durante días. Aura colapsada.',
    'Perdiste tanta aura que arrastraste a los que estaban cerca.',
    'Eso fue un autogol en cámara lenta. Aura por los suelos.',
    'Ni el más optimista puede defender lo que acabas de hacer. Aura nula.',
    'Acabas de entrar al salón de la vergüenza del grupo. Aura negativa permanente.',
    'Te caíste con todo el equipo. El aura no perdona estas.',
    'Desastre absoluto. La próxima, mejor quédate callado.',
    'Tu aura tocó fondo y siguió cavando. Impresionante, en el mal sentido.',
    'Eso fue tan malo que hasta tus aliados fingieron no conocerte.',
    'Aura evaporada. El grupo necesita un momento de silencio.',
    'Acabas de quemar toda tu aura y la de tus próximas tres generaciones.',
    'Eso fue tan patético que el grupo entero sintió vergüenza ajena por ti.',
    'Tu aura no bajó, se suicidó delante de todos. Espectáculo lamentable.',
    'Hiciste el ridículo más grande de la historia del chat. Aura cero absoluto.',
    'Ni tu madre defendería lo que acabas de hacer. Aura pulverizada.',
    'El grupo te va a usar de ejemplo de lo que no se debe hacer jamás. Aura muerta.',
    'Te humillaste solo, en directo, sin que nadie te empujara. Aura aniquilada.',
    'Eso fue tan malo que el aura pidió el divorcio y se llevó la casa.',
    'Quedaste tan en evidencia que da hasta lástima. Aura enterrada sin flores.',
    'Acabas de protagonizar el peor momento del grupo en años. Aura inexistente.',
    'Te caíste tan bajo que el subsuelo te quedó arriba. Aura subterránea.',
    'Hiciste el papelón del siglo y encima con público. Aura desintegrada.',
    'El silencio que dejaste fue de los que dan pena, no respeto. Aura demolida.',
    'Acabas de borrar cualquier respeto que te quedaba. Felicidades por nada.',
    'Eso fue un desastre nuclear de aura. Nadie sobrevive cerca de ti hoy.',
    'Te exhibiste de una forma que ni el guion más cruel imaginaría. Aura cero.',
    'El grupo entero hizo una captura para reírse de ti luego. Aura ejecutada.',
    'Tu aura tocó fondo, rebotó y volvió a hundirse. Récord de humillación.',
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
