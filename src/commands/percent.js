// Generic random % about someone — used by !gay, !simp, !gilipollas, etc.

const LABELS = {
  gay:        { name: 'gay',         emoji: '🌈', high: '¡Sal del armario, tío!',          low: 'Más hetero que un toro.' },
  simp:       { name: 'simp',        emoji: '😍', high: 'Simp nivel cojonudo.',            low: 'Frío de cojones.' },
  sexy:       { name: 'sexy',        emoji: '🔥', high: '¡Estás como un queso!',           low: 'Cero atractivo, tío.' },
  rata:       { name: 'rata',        emoji: '🐀', high: 'Rata de cloaca.',                 low: 'Más leal que un perro.' },
  gilipollas: { name: 'gilipollas',  emoji: '🤡', high: 'Gilipollas integral.',            low: 'Listo de cojones.' },
  subnormal:  { name: 'subnormal',   emoji: '🧠', high: 'Subnormal profundo.',             low: 'Más espabilado que un lince.' },
  imbecil:    { name: 'imbécil',     emoji: '🤦', high: 'Imbécil supremo.',                low: 'Tienes dos dedos de frente.' },
  capullo:    { name: 'capullo',     emoji: '😤', high: 'Capullo redomado.',               low: 'Buen tío/tía.' },
  pringado:   { name: 'pringado',    emoji: '🥴', high: 'Pringado total.',                 low: 'Tienes mucha calle.' },
  mamon:      { name: 'mamón',       emoji: '😏', high: 'Mamón de manual.',                low: 'Tío decente.' },
  pijo:       { name: 'pijo',        emoji: '💅', high: 'Pijo de Salamanca.',              low: 'De barrio puro.' },
  friki:      { name: 'friki',       emoji: '🤓', high: 'Friki obsesivo.',                 low: 'Cero raro.' },
  chorizo:    { name: 'chorizo',     emoji: '🥩', high: 'Chorizo del barrio.',             low: 'Honrado a tope.' },
  guarro:     { name: 'guarro',      emoji: '🤢', high: 'Guarro asqueroso.',               low: 'Limpio como los chorros del oro.' },
  paleto:     { name: 'paleto',      emoji: '🌾', high: 'Paleto del pueblo.',              low: 'Más fino que un coral.' },
  cutre:      { name: 'cutre',       emoji: '🗑️', high: 'Cutre nivel máximo.',             low: 'Tienes clase, tío.' },
};

function extractTarget(msg) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return mentioned;
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quotedParticipant) return quotedParticipant;
  return msg.key.participant || msg.key.remoteJid;
}

async function runPercent(sock, msg, key) {
  const jid = msg.key.remoteJid;
  const cfg = LABELS[key];
  if (!cfg) return;

  const target = extractTarget(msg);
  const percent = Math.floor(Math.random() * 101);
  const verdict = percent >= 70 ? cfg.high : percent <= 30 ? cfg.low : '';

  const filled = Math.round(percent / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

  let text = `${cfg.emoji} *@${target.split('@')[0]} es ${percent}% ${cfg.name}*\n\n${bar}`;
  if (verdict) text += `\n\n_${verdict}_`;

  await sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
}

function makeCmd(key) {
  return (sock, msg) => runPercent(sock, msg, key);
}

module.exports = {
  cmdGay:        makeCmd('gay'),
  cmdSimp:       makeCmd('simp'),
  cmdHot:        makeCmd('sexy'),
  cmdRata:       makeCmd('rata'),
  cmdGilipollas: makeCmd('gilipollas'),
  cmdSubnormal:  makeCmd('subnormal'),
  cmdImbecil:    makeCmd('imbecil'),
  cmdCapullo:    makeCmd('capullo'),
  cmdPringado:   makeCmd('pringado'),
  cmdMamon:      makeCmd('mamon'),
  cmdPijo:       makeCmd('pijo'),
  cmdFriki:      makeCmd('friki'),
  cmdChorizo:    makeCmd('chorizo'),
  cmdGuarro:     makeCmd('guarro'),
  cmdPaleto:     makeCmd('paleto'),
  cmdCutre:      makeCmd('cutre'),
};
