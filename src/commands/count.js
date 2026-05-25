const { getActiveUsers } = require('../utils/messageCounter');
const { isOwner } = require('./social');

const MEDALS = ['🥇', '🥈', '🥉', '🎖️', '🎖️'];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const MEMBER_PHRASES = [
  [
    'El que mas habla manda. El admin no se pide, se demuestra — y tu lo estas haciendo.',
    'Nadie mueve este grupo como tu. Sigue asi y el admin llega solo.',
    'Primer lugar no es casualidad. El admin se gana con presencia, y la tuya sobra.',
    'El grupo vive por gente como tu. El que se lo curra, se lo merece.',
    'Actividad de lider. El admin no se regala, pero hay quien lo tiene mas que ganado.',
  ],
  [
    'Un paso detras del primero, pero delante de todos los demas. El admin no se mendiga, se trabaja.',
    'Segundo lugar con merito real. El que quiere el admin lo demuestra siendo constante.',
    'El admin no se pide — se gana siendo la voz del grupo. Vas por buen camino.',
    'Plata, no oro, pero la diferencia es poca. El que no para, llega.',
    'Segundo en el ranking, pero primero en constancia. El admin es para quien se lo trabaja.',
  ],
  [
    'En el podio. El admin no cae del cielo — se gana con presencia diaria y la tuya se nota.',
    'Top 3 no es poca cosa. El que quiere algo en este grupo lo demuestra siendo activo.',
    'Tercer lugar con hambre de mas. El admin lo consigue quien no se rinde.',
    'El bronce tambien es podio. Sigue asi y el reconocimiento llega.',
    'Tres primeros puestos, tres personas que realmente mueven este grupo. Y tu eres una de ellas.',
  ],
];

const ADMIN_PHRASES = [
  [
    'Primero en actividad y primero en responsabilidad. Asi se lleva el admin.',
    'El mejor admin no es el que tiene el cargo, es el que lo demuestra todos los dias. Sigue asi.',
    'Liderar con el ejemplo. Eso es exactamente lo que estas haciendo.',
    'El grupo te ve, te escucha y te sigue. No pares.',
    'Numero uno en actividad. El admin que trabaja su posicion merece respeto.',
  ],
  [
    'Admin activo, grupo activo. El segundo lugar demuestra que tu cargo lo llevas en serio.',
    'Un buen admin no se sienta en el cargo, lo trabaja. Y tu lo estas trabajando.',
    'Segundo en el ranking pero primero en dar el ejemplo. Sigue marcando el ritmo.',
    'El grupo nota cuando un admin esta presente. Que no se note cuando no estes.',
    'Segundo lugar siendo admin ya dice mucho. La constancia es lo que distingue a los buenos.',
  ],
  [
    'Admin en el podio. El cargo se mantiene siendo visible, y tu lo eres.',
    'Top 3 con galones. El admin que sigue participando como miembro es el que de verdad vale.',
    'Tener el admin y ademas estar en el top 3 — eso es comprometerse con el grupo.',
    'El admin no es un titulo decorativo. El tuyo se nota que lo trabajas.',
    'Tercero en actividad, pero el cargo pesa mas cuando se acompana de presencia. Sigue asi.',
  ],
];

function isGroupAdmin(groupMeta, jid) {
  const p = groupMeta?.participants?.find(p => p.id === jid);
  return p?.admin === 'admin' || p?.admin === 'superadmin';
}

async function cmdCount(sock, msg, groupMeta, args) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Este comando solo funciona en grupos.' }, { quoted: msg });
  }

  if (!isOwner(sender, msg.key.fromMe) && !isGroupAdmin(groupMeta, sender)) {
    return sock.sendMessage(jid, { text: 'Solo los admins pueden usar este comando.' }, { quoted: msg });
  }

  // !count @mention — stats for a specific person
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    || (args?.[0]?.startsWith('@') ? groupMeta?.participants?.find(p => p.id.startsWith(args[0].slice(1)))?.id : null);

  if (mentioned) {
    const all = await getActiveUsers(jid, 1);
    const sorted = all.sort((a, b) => b.count - a.count);
    const entry = sorted.find(u => u.jid === mentioned);
    const phone = mentioned.split('@')[0];
    const count = entry?.count ?? 0;
    const msgs = count === 1 ? '1 mensaje' : `${count} mensajes`;
    const rank = entry ? sorted.findIndex(u => u.jid === mentioned) + 1 : null;
    const rankStr = rank ? ` — puesto #${rank}` : '';
    return sock.sendMessage(jid, {
      text: `@${phone} tiene *${msgs}* en este grupo${rankStr}.`,
      mentions: [mentioned],
    }, { quoted: msg });
  }

  // !count — top 10 ranking
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
      text += `${phrase}\n\n`;
    } else if (i < 5) {
      text += `${MEDALS[i]} @${phone} — ${msgs}\n`;
    } else {
      text += `*${i + 1}.* @${phone} — ${msgs}\n`;
    }
  });

  await sock.sendMessage(jid, { text: text.trimEnd(), mentions }, { quoted: msg });
}

module.exports = { cmdCount };
