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
    'El primero del grupo no se elige, se impone con constancia. Y tu la tienes de sobra.',
    'Llevas el ranking como quien lleva su casa: sin avisar, pero todos lo notan.',
    'No hay debate sobre quien manda aqui. Los numeros ya cerraron esa discusion.',
    'El admin deberia llamar a tu puerta, no al reves. Tu ya hiciste tu parte.',
    'Cuando hablas, el grupo se ordena solo. Eso es lo que hace un lider de verdad.',
    'Numero uno por derecho propio. No te lo dieron, te lo ganaste mensaje a mensaje.',
    'El grupo te necesita mas de lo que tu lo necesitas a el. Eso es poder real.',
    'Lideras desde abajo del organigrama y aun asi nadie te tose. Imaginate con galones.',
    'Tu nombre encabeza la lista por una razon, y esa razon se llama trabajo diario.',
    'El que sostiene la conversacion sostiene el grupo. Y eso, hoy, eres tu solo.',
    'No mendigas atencion, la generas. La diferencia entre un lider y el resto.',
    'Primer puesto sin titulo es la forma mas honesta de mandar. Y tu la dominas.',
    'El admin se da a quien ya manda en la practica. Tu llevas semanas mandando.',
    'Mientras otros piden cargo, tu construyes uno con cada mensaje. Asi se hace.',
    'Eres el motor del grupo. Quien decide quien manda deberia revisar los numeros ya.',
    'El trono no se hereda ni se regala. Se ocupa. Y tu llevas tiempo sentado en el.',
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
    'El segundo que aprieta acaba siendo primero. El que se acomoda, tercero. Tu eliges.',
    'A nada del trono y con ganas de mas. Esa combinacion es la que termina arriba.',
    'No eres la sombra del primero, eres su unica amenaza real. Que no lo olvide.',
    'Plata hoy porque el oro todavia esta caliente. Espera tu turno y aprovechalo.',
    'El primero duerme tranquilo porque no sabe lo cerca que estas. Despiertalo.',
    'Segundo lugar con motor de sobra. Solo te falta pisar un poco mas el acelerador.',
    'El que persigue al lider con constancia acaba adelantandolo. Asi de simple.',
    'Estas a un buen dia de cambiar el orden del ranking. Que sea hoy.',
    'No te falta nivel, te falta un empujon. Y el empujon lo das tu, nadie mas.',
    'Segundo en la tabla, primero en intenciones. El cargo mira eso, no solo numeros.',
    'La distancia con el primero es minima. La diferencia la pone quien no afloja.',
    'Plata con hambre se convierte en oro. Plata conforme se queda en plata. Tu veras.',
    'Pisas fuerte detras del lider. Un par de dias mas asi y el puesto cambia de dueno.',
    'El admin premia a quien no se rinde estando cerca. Y tu estas cerquisima.',
    'Segundo no es perder, es estar a punto de ganar. No te relajes ahora.',
    'El primero te tiene en el espejo. Acerca un poco mas y le quitas el sitio.',
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
    'El bronce es la puerta del podio, no el techo. Empuja y entra mas adentro.',
    'Tercero entre todo el grupo ya es un logro. Pero tu apuntas a mas, se nota.',
    'Estas en el podio porque te lo curras. Ahora curratelo un poco mas y subes.',
    'Bronce hoy no significa bronce siempre. Los de arriba tambien tuvieron tu puesto.',
    'El admin mira el podio entero, no solo la cima. Y tu estas en la foto.',
    'Tercer puesto con margen de sobra. Los dos de delante no son intocables.',
    'Estar en el top 3 ya te separa del monton. Subir un escalon te separa del olvido.',
    'El bronce sabe a poco cuando tienes hambre. Buena senyal: usala para escalar.',
    'Tres entre tantos no es suerte, es presencia. Mantenla y el bronce se vuelve plata.',
    'El podio es solo el principio. Quien se queda en tercero es porque se conforma.',
    'Estas dentro de los que mueven el grupo. Ahora pelea por moverlo mas que nadie.',
    'Tercero con potencial de primero. El camino esta hecho, solo falta recorrerlo.',
    'El admin se gana acumulando dias en el podio. Llevas varios. No los desperdicies.',
    'Bronce digno, pero los dos de arriba se ganan, no se aplauden. A por ellos.',
    'Estar en el top 3 es estar en el radar de quien reparte cargos. Que no te pierda.',
    'Tercero hoy, segundo manyana, primero si no aflojas. El orden depende solo de ti.',
    'El podio abre puertas, pero solo cruza quien sigue empujando. Sigue empujando.',
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
    'Admin y numero uno a la vez. Ese es el perfil que ningun grupo quiere perder.',
    'No llevas el cargo, el cargo te lleva a ti a estar siempre presente. Asi se hace.',
    'El mejor admin es el que nadie discute. Y a ti nadie te discute, lo confirman los numeros.',
    'Primero en mensajes y primero en mando. Esa coherencia es lo que da respeto de verdad.',
    'Hay admins que cobran el cargo en silencio. Tu lo pagas con presencia cada dia.',
    'Cuando el admin es ademas el mas activo, el grupo funciona solo. Eso es lo que haces.',
    'Tu cargo no necesita defensa: tu actividad lo defiende sola, todos los dias.',
    'El que manda en el papel y en la practica no tiene rival. Ese eres tu.',
    'Numero uno con galones es el techo de este grupo. Y tu estas justo ahi arriba.',
    'No administras desde la distancia, lo haces desde dentro. Esa es la diferencia clave.',
    'El grupo respira al ritmo que marca su admin mas activo. Y ese ritmo lo pones tu.',
    'Cargo merecido confirmado dia a dia. Eso ya no es admin, es liderazgo puro.',
    'Tu actividad hace que el resto de admins parezcan de adorno. Sin querer, pero pasa.',
    'Primero en todo: en hablar, en mover y en mandar. El grupo esta en buenas manos.',
    'Un admin que encabeza el ranking no tiene que pedir respeto. Se lo dan solo.',
    'Llevas el grupo sobre los hombros y ni se te nota el peso. Eso es clase.',
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
    'Segundo en mensajes y admin de los de verdad. El cargo te queda corto de lo activo que eres.',
    'Llevas el admin sin sentarte en el. Por eso estas tan arriba en la tabla.',
    'Un admin que casi lidera el ranking no tiene nada que demostrar. Lo demuestra cada dia.',
    'Plata con galones y ganas. Pocos perfiles tan completos hay en cualquier grupo.',
    'No eres admin de los que aparecen para mandar y desaparecen. Estas, y se nota.',
    'Segundo en actividad siendo admin: doble merito en un mismo nombre. Sigue asi.',
    'Tu cargo se sostiene en presencia real, no en antiguedad. Esa es la unica forma sana.',
    'El admin que participa como uno mas y ademas casi lidera. Ese perfil vale oro.',
    'Estar entre los dos primeros con cargo es de los pocos que se lo curran de verdad.',
    'Un admin activo levanta el grupo entero. Tu lo levantas desde el segundo puesto.',
    'No exhibes el cargo, lo trabajas. Y por eso estas casi en la cima de la tabla.',
    'Segundo en numeros, primero en compromiso. Esa es la marca de un buen admin.',
    'Tu presencia hace que el cargo tenga sentido. Y tu presencia esta a un paso del top.',
    'Admin que se arremanga y baja al barro del grupo. Por eso estas tan arriba.',
    'Plata siendo admin no es casualidad. Es alguien que se toma el cargo en serio.',
    'Casi primero y con galones. El grupo no se mueve igual cuando tu no apareces.',
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
    'Bronce con galones es mas de lo que muchos admins logran en toda su vida en el grupo.',
    'Estar en el podio siendo admin demuestra que el cargo lo ganaste estando, no esperando.',
    'Tu admin no es decorativo: el top 3 lo respalda dia a dia. Esa es la prueba.',
    'Hay admins que ni salen en la lista. Tu estas en el podio. La diferencia es abismal.',
    'Tercero en actividad y admin de los que se notan. El grupo te lo agradece sin decirlo.',
    'Bronce con responsabilidad encima. La combinacion mas dificil de sostener, y la sostienes.',
    'El cargo pesa mas cuando lo acompanya la presencia. Y la tuya esta en el podio.',
    'Un admin en el top 3 es de los que el grupo defiende. Te has ganado ese sitio.',
    'Tu posicion confirma que el admin lo llevas trabajando, no luciendo. Eso vale doble.',
    'Bronce hoy, pero un admin activo siempre puede subir. El cargo te empuja, no te frena.',
    'Estar en el podio con galones te separa del admin de adorno. Y la distancia es enorme.',
    'El admin que participa de verdad acaba en el top. Tu ya estas ahi. Ahora sube mas.',
    'Tercero en mensajes y primero en compromiso con el grupo. Asi se lleva un cargo.',
    'Tu admin lo avalan los hechos, no la fecha en que te lo dieron. Esa es la forma correcta.',
    'Un admin en el podio manda el mensaje claro: el cargo se sigue currando aqui.',
    'Bronce con autoridad real. El grupo respeta al admin que ademas se deja ver cada dia.',
    'Estar entre los tres y llevar el cargo es el perfil que ningun grupo quiere soltar.',
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
