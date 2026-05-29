const { getActiveUsers, resetCounts } = require('../utils/messageCounter');
const { isOwner, isAdmin, isGroupAdmin, getSender } = require('../utils/wa');
const { pick } = require('../utils/helpers');

const MEDALS = ['🥇', '🥈', '🥉', '🎖️', '🎖️'];

const MEMBER_PHRASES = [
  [
    'El que mas habla manda. El admin no se pide, se demuestra — y tu lo estas haciendo.',
    'Nadie mueve este grupo como tu. Sigue asi y el admin llega solo.',
    'Primer lugar no es casualidad. El admin se gana con presencia, y la tuya sobra.',
    'El grupo vive por gente como tu. El que se lo curra, se lo merece.',
    'Actividad de lider. El admin no se regala, pero hay quien lo tiene mas que ganado.',
    'Eres la columna del chat. Sin ti esto seria un grupo mas, y eso ya pesa.',
    'Reyes hay pocos en cada grupo, y aqui tu corona se nota antes que cualquier cargo.',
    'El admin se mide en actos, no en titulos. Y los tuyos hablan solos cada dia.',
    'Hay gente con admin que no llega a tu nivel de presencia. Toma nota quien decida.',
    'El liderazgo se reconoce antes de darse oficialmente. El tuyo ya lo es para todos.',
    'Mereces algo mas que el numero uno. Mereces que se hable de tu nombre en este grupo.',
    'Aqui no se trata de quien grita mas, sino de quien marca el rumbo. Y ese rumbo lo marcas tu.',
    'Sin titulo y aun asi todos te miran cuando hablas. Eso es autoridad real.',
    'Si el admin se diera por meritos, tu ya tendrias dos cargos y un puesto reservado.',
    'Tu actividad construye el grupo. Quien lo dirige deberia tenerte en cuenta ya.',
    'Numero uno sin pedir permiso. Asi se ocupa un trono, no rogando.',
    'El grupo respira al ritmo que tu marcas. Eso no se aprende, se tiene.',
    'Lideras sin galones y aun asi nadie te discute. Eso es peso real.',
    'El primero del ranking es el que sostiene la conversacion. Hoy ese eres tu.',
    'Cuando el grupo se apaga, tu lo enciendes. El admin deberia llevar tu nombre.',
    'Estas arriba porque te lo has currado, no porque te lo regalaron. Eso vale doble.',
    'El que mas aporta es el que mas manda, aunque el papel diga otra cosa.',
    'Tu presencia es la que mantiene vivo esto. Quien reparte cargos que tome nota.',
    'Primer puesto y ni te despeinas. Asi se ve el liderazgo de verdad.',
    'El admin es para los que estan, y nadie esta como tu. Punto.',
    'Mandas en el chat sin necesidad de un titulo. Imagina con uno.',
    'Eres referencia antes que cargo. Y eso es mucho mas dificil de conseguir.',
    'El numero uno no se discute, se reconoce. Y el tuyo se reconoce solo.',
    'Si la actividad fuera moneda, tu serias el mas rico del grupo. Admin incluido.',
    'Aqui mandas tu, lo diga el papel o no. La gente te sigue sin que lo pidas.',
  ],
  [
    'Un paso detras del primero, pero delante de todos los demas. El admin no se mendiga, se trabaja.',
    'Segundo lugar con merito real. El que quiere el admin lo demuestra siendo constante.',
    'El admin no se pide — se gana siendo la voz del grupo. Vas por buen camino.',
    'Plata, no oro, pero la diferencia es poca. El que no para, llega.',
    'Segundo en el ranking, pero primero en constancia. El admin es para quien se lo trabaja.',
    'El primero esta a un empujon de distancia. Y tu llevas el ritmo para alcanzarlo.',
    'No te conformes con segundo, es solo una etapa. El que aspira de verdad llega arriba.',
    'Estas a un paso del trono. La diferencia entre conseguirlo y mirarlo es seguir presente.',
    'Segunda posicion con cara de querer mas. Eso es exactamente lo que se busca en un admin.',
    'No estas debajo del primero, estas justo al lado. Y eso no se ignora.',
    'Ser segundo aqui significa que ya superaste a casi todo el grupo. Que no se te olvide.',
    'El admin no se queda esperando ser regalado. Se trabaja como lo estas haciendo tu.',
    'La medalla de plata es solo el primer aviso. La de oro la consigue quien no afloja.',
    'Vas pisando los talones al numero uno. Mantente asi y el primero seras tu manyana.',
    'Top 2 con presencia real, no con suerte. Asi se construye una posicion solida.',
    'Segundo hoy, pero con el ritmo justo para ser primero manyana. No aflojes.',
    'El que aspira al admin no descansa en plata. Y tu no pareces de los que descansan.',
    'A un escalon de la cima y subiendo. El trono no esta tan lejos como crees.',
    'Plata con hambre de oro. Esa hambre es la que separa al segundo del primero.',
    'Estas tan cerca del primero que casi puedes tocarlo. Sigue empujando.',
    'Segundo lugar es la antesala del primero. Y tu ya tienes la mano en la puerta.',
    'No eres uno mas, eres el que persigue al lider. Y los que persiguen, alcanzan.',
    'La plata duele solo si te conformas. Tu no tienes pinta de conformarte.',
    'Segundo en mensajes, primero en ganas. Eso se nota y se premia.',
    'El primero te oye los pasos detras. Que no deje de oirlos.',
    'Constancia de plata, ambicion de oro. Mantente y la posicion cambia.',
    'A esta distancia del trono, rendirse seria un crimen. Aprieta.',
    'Segundo puesto que huele a primero. Solo es cuestion de seguir presente.',
    'El admin se gana acumulando dias como este. Llevas ya unos cuantos.',
    'Vas segundo porque el primero todavia no ha mirado atras. Que lo haga pronto.',
  ],
  [
    'En el podio. El admin no cae del cielo — se gana con presencia diaria y la tuya se nota.',
    'Top 3 no es poca cosa. El que quiere algo en este grupo lo demuestra siendo activo.',
    'Tercer lugar con hambre de mas. El admin lo consigue quien no se rinde.',
    'El bronce tambien es podio. Sigue asi y el reconocimiento llega.',
    'Tres primeros puestos, tres personas que realmente mueven este grupo. Y tu eres una de ellas.',
    'Bronce hoy, oro manyana. Solo depende de cuanto sigas pisando el acelerador.',
    'Estar en el podio ya te separa del 90 por ciento del grupo. Sube un escalon mas.',
    'No eres uno mas. Estas entre los tres que sostienen este grupo cada dia.',
    'Si quieres mas que un tercer puesto, no aflojes. El admin es de los que aguantan.',
    'Top 3 con margen para crecer. Los dos de arriba ya te ven en el espejo retrovisor.',
    'El reconocimiento del grupo empieza en el podio. Y tu ya estas dentro.',
    'Bronce con potencial de oro. Quien decide los cargos deberia estar mirandote.',
    'Estar en tres de tres ya es declaracion de intenciones. Que se note manyana tambien.',
    'El admin se da a los que estan, y tu llevas semanas demostrando que estas. Sigue.',
    'Aqui no se trata de tener el cargo, sino de merecerlo. Y tu lo estas mereciendo.',
    'Estar en el podio ya es decir mucho. Ahora toca subir, no acomodarse.',
    'Bronce con ambicion. El que se queda en tercero es porque quiere; tu no pareces de esos.',
    'Tres entre todo el grupo, y tu eres uno. Que no se te suba, pero que no se te baje tampoco.',
    'El podio es la sala de espera del admin. Y tu ya tienes asiento reservado.',
    'Tercero hoy, pero los de arriba no son inalcanzables. Acelera.',
    'Estar en el top 3 te separa del monton. Sube otro escalon y te separas mas.',
    'Bronce que sabe a poco. Esa sensacion es la que te llevara mas arriba.',
    'No has llegado al podio por suerte. Has llegado por estar. Sigue estando.',
    'Tercer puesto con margen de sobra. Los dos de arriba se ganan, no se admiran.',
    'El grupo ya cuenta contigo. Que pronto cuente contigo de los primeros.',
    'Bronce digno, pero tu apuntas mas alto. Que se note cada dia.',
    'Estas en la foto de los que mueven el grupo. Ahora ponte en el centro.',
    'Tercero entre tantos no es casualidad, es constancia. Mantenla y subes.',
    'El podio abre puertas. La del admin se abre para los que no se conforman.',
    'Tres de tres movidos por ti tambien. Que el cuarto dia sigas ahi arriba.',
  ],
];

const ADMIN_PHRASES = [
  [
    'Primero en actividad y primero en responsabilidad. Asi se lleva el admin.',
    'El mejor admin no es el que tiene el cargo, es el que lo demuestra todos los dias. Sigue asi.',
    'Liderar con el ejemplo. Eso es exactamente lo que estas haciendo.',
    'El grupo te ve, te escucha y te sigue. No pares.',
    'Numero uno en actividad. El admin que trabaja su posicion merece respeto.',
    'Cargo y presencia, raro de ver en el mismo nombre. Tu lo combinas sin esfuerzo.',
    'El admin que ademas es el alma del grupo. Eso ya no es titulo, es influencia real.',
    'Tu cargo no es decoracion, es funcion activa. Y el grupo lo percibe sin que lo digas.',
    'No solo administras, marcas el ritmo. La diferencia con un admin de adorno es enorme.',
    'Primero entre todos, admin y miembro a la vez. Asi se queda uno en la memoria del grupo.',
    'Cuando un admin da el ejemplo, el grupo entero sube de nivel. Y tu lo estas dando.',
    'No hay nada mas serio que un admin que sigue siendo el mas activo. Tu lo eres.',
    'El liderazgo no se hereda con el cargo, se confirma cada dia. Y tu lo confirmas siempre.',
    'Numero uno con galones. Esa combinacion es lo que diferencia a un buen admin de uno cualquiera.',
    'Tu posicion uno hace que el cargo signifique algo, y no al reves.',
  ],
  [
    'Admin activo, grupo activo. El segundo lugar demuestra que tu cargo lo llevas en serio.',
    'Un buen admin no se sienta en el cargo, lo trabaja. Y tu lo estas trabajando.',
    'Segundo en el ranking pero primero en dar el ejemplo. Sigue marcando el ritmo.',
    'El grupo nota cuando un admin esta presente. Que no se note cuando no estes.',
    'Segundo lugar siendo admin ya dice mucho. La constancia es lo que distingue a los buenos.',
    'El admin que ademas esta entre los mas activos. Eso ya es un perfil completo.',
    'Cargo con presencia. Es la unica forma de ganarse el respeto que no se da automatico.',
    'Estar entre los dos mas activos y ademas tener admin: estas haciendo doblete cada dia.',
    'Hay admins que se ven una vez por semana. Tu estas todos los dias. La diferencia es total.',
    'Segundo en actividad con cargo. Sigue asi y el grupo no se mueve sin ti.',
    'Llevas el admin como debe llevarse: trabajando, no exhibiendolo.',
    'Tu cargo se sostiene en hechos, no en titulos antiguos. Eso es lo unico que vale.',
    'Plata con galones. Pocos consiguen estar arriba siendo admin y miembro a la vez.',
    'Numero dos en mensajes, numero uno en hacer que el grupo funcione. Sigue presente.',
    'Un admin presente vale mas que diez ausentes. Tu eres ese uno.',
  ],
  [
    'Admin en el podio. El cargo se mantiene siendo visible, y tu lo eres.',
    'Top 3 con galones. El admin que sigue participando como miembro es el que de verdad vale.',
    'Tener el admin y ademas estar en el top 3 — eso es comprometerse con el grupo.',
    'El admin no es un titulo decorativo. El tuyo se nota que lo trabajas.',
    'Tercero en actividad, pero el cargo pesa mas cuando se acompana de presencia. Sigue asi.',
    'Bronce con responsabilidad. La combinacion mas dificil de mantener a la larga.',
    'Estar en el top 3 siendo admin demuestra que el cargo no te lo dieron por capricho.',
    'Hay admins que ni aparecen en la lista. Tu estas en el podio, y eso ya dice todo.',
    'Tu admin lo respaldan los mensajes, no la antiguedad. Esa es la forma sana de llevarlo.',
    'Top 3 con cargo es de los pocos perfiles que el grupo respeta sin discusion.',
    'El admin pasivo se nota, el activo tambien. Tu estas en el grupo correcto.',
    'Bronce hoy, segundo manyana si subes una marcha. El cargo te apoya, no te ata.',
    'Estar entre los tres y ademas tener admin: ese es el perfil que merece quedarse.',
    'Tu posicion confirma lo que tu cargo promete. Pocos consiguen alinear las dos cosas.',
    'Un admin que esta en el podio no tiene que demostrar nada. Lo ha demostrado ya.',
  ],
];

async function cmdCount(sock, msg, groupMeta, args) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);

  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Este comando solo funciona en grupos.' }, { quoted: msg });
  }

  if (!isGroupAdmin(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo los admins pueden usar este comando.' }, { quoted: msg });
  }

  // !count @mention — stats for a specific person.
  // Only trust real WhatsApp mentions (mentionedJid); raw "@number" text matches
  // are unreliable with LIDs in modern groups.
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

  if (mentioned) {
    const sorted = (await getActiveUsers(jid, 1)).sort((a, b) => b.count - a.count);
    const rankIdx = sorted.findIndex(u => u.jid === mentioned);
    const count = rankIdx >= 0 ? sorted[rankIdx].count : 0;
    const phone = mentioned.split('@')[0];
    const msgs = count === 1 ? '1 mensaje' : `${count} mensajes`;
    const rankStr = rankIdx >= 0 ? ` — puesto #${rankIdx + 1}` : '';
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
      const admin = isAdmin(groupMeta?.participants, u.jid);
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

// !resetcount — owner only: clears message ranking for this group
async function cmdResetCount(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);

  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'Solo el owner puede resetear el contador.' }, { quoted: msg });
  }

  const scope = jid.endsWith('@g.us') ? jid : null;
  await resetCounts(scope);
  await sock.sendMessage(jid, {
    text: scope
      ? 'Contador de mensajes de este grupo reseteado.'
      : 'Contador de mensajes global reseteado.',
  }, { quoted: msg });
}

module.exports = { cmdCount, cmdResetCount };
