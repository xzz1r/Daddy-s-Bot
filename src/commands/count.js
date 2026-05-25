const { getActiveUsers } = require('../utils/messageCounter');

const MEDALS = ['🥇', '🥈', '🥉', '🎖️', '🎖️'];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// Para miembros en el podio: motivar a ganarse el admin
const MEMBER_PHRASES = [
  [
    'El que más habla manda. El admin no se pide, se demuestra — y tú lo estás haciendo.',
    'Nadie mueve este grupo como tú. Sigue así y el admin llega solo.',
    'Primer lugar no es casualidad. El admin se gana con presencia, y la tuya sobra.',
    'El grupo vive por gente como tú. El que se lo curra, se lo merece.',
    'Actividad de líder. El admin no se regala, pero hay quien lo tiene más que ganado.',
  ],
  [
    'Un paso detrás del primero, pero delante de todos los demás. El admin no se mendiga, se trabaja.',
    'Segundo lugar con mérito real. El que quiere el admin lo demuestra siendo constante.',
    'El admin no se pide — se gana siendo la voz del grupo. Vas por buen camino.',
    'Plata, no oro, pero la diferencia es poca. El que no para, llega.',
    'Segundo en el ranking, pero primero en constancia. El admin es para quien se lo trabaja.',
  ],
  [
    'En el podio. El admin no cae del cielo — se gana con presencia diaria y la tuya se nota.',
    'Top 3 no es poca cosa. El que quiere algo en este grupo lo demuestra siendo activo.',
    'Tercer lugar con hambre de más. El admin lo consigue quien no se rinde.',
    'El bronce también es podio. Sigue así y el reconocimiento llega.',
    'Tres primeros puestos, tres personas que realmente mueven este grupo. Y tú eres una de ellas.',
  ],
];

// Para admins en el podio: motivar a ser aún más activos
const ADMIN_PHRASES = [
  [
    'Primero en actividad y primero en responsabilidad. Así se lleva el admin.',
    'El mejor admin no es el que tiene el cargo, es el que lo demuestra todos los días. Sigue así.',
    'Liderar con el ejemplo. Eso es exactamente lo que estás haciendo.',
    'El grupo te ve, te escucha y te sigue. No pares.',
    'Número uno en actividad. El admin que trabaja su posición merece respeto.',
  ],
  [
    'Admin activo, grupo activo. El segundo lugar demuestra que tu cargo lo llevas en serio.',
    'Un buen admin no se sienta en el cargo, lo trabaja. Y tú lo estás trabajando.',
    'Segundo en el ranking pero primero en dar el ejemplo. Sigue marcando el ritmo.',
    'El grupo nota cuando un admin está presente. Que no se note cuando no estés.',
    'Segundo lugar siendo admin ya dice mucho. La constancia es lo que distingue a los buenos.',
  ],
  [
    'Admin en el podio. El cargo se mantiene siendo visible, y tú lo eres.',
    'Top 3 con galones. El admin que sigue participando como miembro es el que de verdad vale.',
    'Tener el admin y además estar en el top 3 — eso es comprometerse con el grupo.',
    'El admin no es un título decorativo. El tuyo se nota que lo trabajas.',
    'Tercero en actividad, pero el cargo pesa más cuando se acompaña de presencia. Sigue así.',
  ],
];

function isGroupAdmin(groupMeta, jid) {
  const p = groupMeta?.participants?.find(p => p.id === jid);
  return p?.admin === 'admin' || p?.admin === 'superadmin';
}

async function cmdCount(sock, msg, groupMeta) {
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
      const admin = isGroupAdmin(groupMeta, u.jid);
      const phrase = pick(admin ? ADMIN_PHRASES[i] : MEMBER_PHRASES[i]);
      text += `${MEDALS[i]} *@${phone}* — ${msgs}\n`;
      text += `_${phrase}_\n\n`;
    } else if (i < 5) {
      text += `${MEDALS[i]} @${phone} — ${msgs}\n`;
    } else {
      text += `*${i + 1}.* @${phone} — ${msgs}\n`;
    }
  });

  await sock.sendMessage(jid, { text: text.trimEnd(), mentions }, { quoted: msg });
}

module.exports = { cmdCount };
