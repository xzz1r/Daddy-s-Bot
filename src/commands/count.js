const { getActiveUsers } = require('../utils/messageCounter');

const MEDALS = ['🥇', '🥈', '🥉', '🎖️', '🎖️'];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const RANK_PHRASES = [
  // #1
  [
    'El que más habla manda. El admin no se pide, se demuestra — y tú lo estás haciendo.',
    'Nadie mueve este grupo como tú. Sigue así y el admin llega solo.',
    'Primer lugar no es casualidad. El admin se gana con presencia, y la tuya sobra.',
    'El grupo vive por gente como tú. El que se lo curra, se lo merece.',
    'Actividad de líder. El admin no se regala, pero hay quien lo tiene más que ganado.',
  ],
  // #2
  [
    'Un paso detrás del primero, pero delante de todos los demás. Eso también se premia.',
    'Segundo lugar con mérito real. El que quiere el admin lo trabaja, no lo pide.',
    'El admin no se mendiga — se gana siendo constante. Vas por buen camino.',
    'Plata, no oro, pero la diferencia es poca. El que no para, llega.',
    'Segundo en el ranking, pero primero en constancia. El admin es para quien se lo trabaja.',
  ],
  // #3
  [
    'En el podio. El admin no cae del cielo — se gana con presencia diaria y la tuyas se nota.',
    'Top 3 no es poca cosa. El que quiere algo en este grupo lo demuestra siendo activo.',
    'Tercer lugar con hambre de más. El admin lo consigue quien no se rinde.',
    'El bronce también es podio. Sigue así y el oro no tardará — igual que el reconocimiento.',
    'Tres primeros puestos, tres personas que realmente mueven este grupo. Y tú eres una de ellas.',
  ],
];

async function cmdCount(sock, msg) {
  const jid = msg.key.remoteJid;

  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Este comando solo funciona en grupos.' }, { quoted: msg });
  }

  const users = await getActiveUsers(jid, 1);
  if (!users.length) {
    return sock.sendMessage(jid, { text: 'Aun no hay mensajes contados en este grupo.' }, { quoted: msg });
  }

  users.sort((a, b) => b.count - a.count);
  const top = users.slice(0, 10);

  const mentions = top.map(u => u.jid);
  let text = `*🏆 RANKING DE ACTIVIDAD*\n\n`;

  top.forEach((u, i) => {
    const phone = u.jid.split('@')[0];
    const msgs = u.count === 1 ? '1 mensaje' : `${u.count} mensajes`;

    if (i < 3) {
      text += `${MEDALS[i]} *@${phone}* — ${msgs}\n`;
      text += `_${pick(RANK_PHRASES[i])}_\n\n`;
    } else if (i < 5) {
      text += `${MEDALS[i]} @${phone} — ${msgs}\n`;
    } else {
      text += `*${i + 1}.* @${phone} — ${msgs}\n`;
    }
  });

  await sock.sendMessage(jid, { text: text.trimEnd(), mentions }, { quoted: msg });
}

module.exports = { cmdCount };
