// Generic random % about someone — used by !gay, !simp, !iq, !pendejo, etc.

const LABELS = {
  gay:      { name: 'gay',       emoji: '🌈', high: '¡Salí del closet!', low: '¡Recto como una regla!' },
  simp:     { name: 'simp',      emoji: '😍', high: 'Simp nivel dios.',    low: 'Frío como hielo.' },
  pendejo:  { name: 'pendejo',   emoji: '🤡', high: 'Pendejo absoluto.',   low: 'Maduro y serio.' },
  iq:       { name: 'IQ',        emoji: '🧠', high: 'Casi genio.',         low: 'Cae cara al piso.' },
  crazy:    { name: 'loco',      emoji: '🤪', high: 'Pa\'l psiquiátrico.', low: 'Calmado y sano.' },
  hot:      { name: 'sexy',      emoji: '🔥', high: '¡Fuego puro!',        low: 'Cero atractivo.' },
  rata:     { name: 'rata',      emoji: '🐀', high: 'Rata confirmada.',    low: 'Honesto/a y leal.' },
  borracho: { name: 'borracho',  emoji: '🍺', high: 'Vive en el bar.',     low: 'Abstemio total.' },
  chamuyero:{ name: 'chamuyero', emoji: '🗣️', high: 'Mentiroso pro.',      low: 'Pura verdad.' },
  chongo:   { name: 'chongo',    emoji: '😎', high: 'Chongo nivel máx.',   low: 'Cero chongo.' },
};

function extractTarget(msg, args) {
  // 1. Mentioned user
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return mentioned;
  // 2. Replied-to message
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quotedParticipant) return quotedParticipant;
  // 3. The sender themselves
  return msg.key.participant || msg.key.remoteJid;
}

async function runPercent(sock, msg, args, key) {
  const jid = msg.key.remoteJid;
  const config = LABELS[key];
  if (!config) return;

  const target = extractTarget(msg, args);
  const percent = Math.floor(Math.random() * 101);
  const verdict = percent >= 70 ? config.high : percent <= 30 ? config.low : '';

  const filled = Math.round(percent / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

  let text = `${config.emoji} *@${target.split('@')[0]} es ${percent}% ${config.name}*\n\n${bar}`;
  if (verdict) text += `\n\n_${verdict}_`;

  await sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
}

function makeCmd(key) {
  return (sock, msg, args) => runPercent(sock, msg, args, key);
}

module.exports = {
  cmdGay:      makeCmd('gay'),
  cmdSimp:     makeCmd('simp'),
  cmdPendejo:  makeCmd('pendejo'),
  cmdIq:       makeCmd('iq'),
  cmdCrazy:    makeCmd('crazy'),
  cmdHot:      makeCmd('hot'),
  cmdRata:     makeCmd('rata'),
  cmdBorracho: makeCmd('borracho'),
  cmdChamuyero:makeCmd('chamuyero'),
  cmdChongo:   makeCmd('chongo'),
};
