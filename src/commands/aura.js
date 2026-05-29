const { isOwner, isAdmin, getTargetOrSelf } = require('../utils/wa');
const { pick } = require('../utils/helpers');

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
  ],
};

// !aura [@user] — assigns aura points (rigged by the target's role)
async function cmdAura(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const target = getTargetOrSelf(msg);

  const targetIsOwner = isOwner(target, false, groupMeta);
  const targetIsAdmin = isAdmin(groupMeta?.participants, target);

  const { tier, amount } = rollAura(targetIsOwner, targetIsAdmin);
  const sign = amount >= 0 ? '+' : '-';
  const pretty = Math.abs(amount).toLocaleString('es-ES');

  const text =
    `*@${target.split('@')[0]}  ${sign}${pretty} de aura*\n\n` +
    `${pick(AURA[tier])}`;

  await sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
}

module.exports = { cmdAura };
