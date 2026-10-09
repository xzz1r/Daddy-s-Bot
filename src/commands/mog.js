'use strict';

const { isOwner, isMainOwner, isAdmin, getSender, sameUser } = require('../utils/wa');
const { pickFresh } = require('../utils/helpers');
const { ownerGana } = require('../utils/rigOwner');
const { A_TI_MISMO, SOLO_GRUPOS } = require('../data/avisos');
const { aviso } = require('../utils/helpers');
const { SIN_SERVICIO } = require('../utils/auraCobro');
const rencor = require('../utils/rencor');

// Rigged by role, but not blatantly: the owner has a real edge yet can still
// lose, admins have a slighter edge, members fight on equal ground.
function rollMog(aIsOwner, aIsAdmin, bIsOwner, bIsAdmin) {
  const r = Math.random();
  if (aIsOwner && !bIsOwner) return r < 0.70 ? 'a' : 'b';
  if (bIsOwner && !aIsOwner) return r < 0.70 ? 'b' : 'a';
  if (aIsAdmin && !bIsAdmin) return r < 0.60 ? 'a' : 'b';
  if (bIsAdmin && !aIsAdmin) return r < 0.60 ? 'b' : 'a';
  return r < 0.5 ? 'a' : 'b';
}

// %M = mogger (winner), %L = mogged (loser)
let MOG_PHRASES = [
  'El arco cigomático de %M está alto y el mentón, fuera. %L mete la barbilla y a %L la foto le pega la cara al cuello.',
  '%M enseña el perfil y el dorso nasal le baja recto. %L gira la cara y se le tuerce el tabique, a la vista.',
  '%L creyó que tenía alguna oportunidad, y ese fue su primer error; el segundo, nacer con esa cara. %M ni sudó.',
  '%M aprieta y el masetero se le marca al lado de la mandíbula. %L aprieta y a %L solo se le mueve el labio, blando.',
  '%M cierra la boca y los dientes le cierran en línea. %L muerde y el labio de abajo se le dobla hacia dentro.',
  'Los dos lados de la cara de %M coinciden. En %L un lado cuelga y el mentón se va hacia ese lado.',
  '%L es el caso de estudio que los foros usan para explicar qué significa nacer perdiendo. %M es la portada.',
  '%M lleva el mentón por delante del labio. %L lo lleva hundido, y el perfil se le cae hacia el cuello.',
  'Canthal tilt negativo, midface de jirafa, jawline desaparecida. %L es el catálogo completo del subhuman. %M es la referencia opuesta.',
  'La mandíbula de %M moggea sola a %L entero. %L no tiene mandíbula, tiene una sugerencia de mandíbula.',
  'Pómulos esculpidos en %M. En %L: la cara se rinde antes de llegar a los pómulos.',
  'La proyección maxilar de %M liquida a %L sin mirar nada más. La de %L no aparece por ningún lado.',
  '%M tiene el gonial en esquina, y cabe un dedo en el ángulo. %L lo tiene redondo y la mandíbula se le deshace en el cuello.',
  '%M pone el móvil a la altura de la boca y la nariz le queda quieta. %L lo pega abajo y se le abren los agujeros.',
  'El canthal tilt positivo de %M destruye a %L antes de abrir la boca. %L tiene mirada de derrota permanente.',
  'Ojos de depredador contra ojos de quien acaba de perder en público y lo sabe. %M caza, %L huye.',
  '%L tiene los ojos tan caídos que parece que la genética lloró al hacerlo. %M tiene la mirada que abre puertas.',
  'Tercio medio divino en %M. El de %L es tan largo que no entra en el encuadre ni en la decencia.',
  '%M no sonríe y el borde de la mandíbula se le queda a la vista. %L sonríe para taparlo y el mentón se le hunde.',
  '%M saca el mentón a la luz y la sombra le cae debajo. %L esconde la barbilla y la luz le da en el cuello.',
  '%L necesita rhinoplastia, genioplastia y lefort. %M sale en la foto con el mentón ya en su sitio, sin que se lo hayan cortado.',
  '%M enseña la cara y le aguantan la mirada. A %L le ven el mentón metido y le sueltan la vista a la primera.',
  'No hay filtro, ángulo ni luz que meta a %L en el universo de %M. La física se rinde antes que %L.',
  'Se ven las dos caras juntas. El mentón de %M queda delante y el de %L se esconde debajo del labio.',
  'Moggeo total e inapelable: %M ni miró, y %L no se recupera de esta con un cambio de tema.',
  'La captura se queda en el chat. En %M se marcan el mentón y el pómulo. En %L la luz no le encuentra un hueso.',
  '%L puede ir al gym, leer libros y trabajar la actitud. Seguiría siendo %L. El óseo no se levanta a press.',
  '%L adelanta el mentón para la foto y no llega. %L gira la cara y la papada le ocupa el sitio del hueso.',
  'Cuando %M entra a un sitio la temperatura cambia. Cuando %L entra nadie levanta la vista. Presencia genética.',
  '%M es la persona a quien todos quieren hablar sin saber por qué. %L es la persona a quien todos confunden con el mobiliario.',
];

async function cmdMog(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }

  const sender = getSender(msg);

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  let a, b;
  if (mentioned.length >= 2) [a, b] = mentioned.slice(0, 2);
  else if (mentioned.length === 1) { a = sender; b = mentioned[0]; }
  else {
    await sock.sendMessage(jid, {
      text: 'Menciona a dos: *!mog @uno @otro*',
    }, { quoted: msg });
    return SIN_SERVICIO;
  }

  if (sameUser(a, b)) {
    await sock.sendMessage(jid, { text: aviso(A_TI_MISMO, jid, 'yo') }, { quoted: msg });
    return SIN_SERVICIO;
  }

  const participants = groupMeta?.participants || [];
  const aIsOwner = isOwner(a, false, groupMeta);
  const bIsOwner = isOwner(b, false, groupMeta);
  const aIsAdmin = isAdmin(participants, a);
  const bIsAdmin = isAdmin(participants, b);

  let side = rollMog(aIsOwner, aIsAdmin, bIsOwner, bIsAdmin);
  // El owner principal ya no moggea SIEMPRE.
  //
  // Estaba en 100 % literal y es de los sitios que mas cantan: el mog va cara a
  // cara y con nombre, asi que ganar todas contra todo el mundo se nota sin que
  // nadie lleve la cuenta. Ahora es 0,72 y cuenta para la MISMA racha que el
  // robo, el contraataque, el atraco y el duelo, porque el grupo ve todo eso en
  // el mismo chat y no distingue de que comando venia cada victoria.
  if (isMainOwner(a, false, groupMeta)) side = ownerGana(msg.key.remoteJid, 0.72) ? 'a' : 'b';
  else if (isMainOwner(b, false, groupMeta)) side = ownerGana(msg.key.remoteJid, 0.72) ? 'b' : 'a';
  const mogger = side === 'a' ? a : b;
  const mogged  = side === 'a' ? b : a;
  const numM = mogger.split('@')[0];
  const numL = mogged.split('@')[0];
  const numA = a.split('@')[0];
  const numB = b.split('@')[0];

  const phrase = pickFresh(MOG_PHRASES, `${jid}|mog`)
    .replace(/%M/g, `@${numM}`)
    .replace(/%L/g, `@${numL}`);

  // Si estos dos ya se midieron otro dia, el bot se acuerda (utils/rencor.js).
  const memoria = await rencor.mog({ grupo: jid, gana: mogger, pierde: mogged, groupMeta });

  const text =
    `*MOG CHECK*\n\n` +
    `@${numA} *vs* @${numB}\n\n` +
    `@${numM} *moggea* a @${numL}\n` +
    `${phrase}` +
    (memoria ? `\n\n_${memoria}_` : '');

  await sock.sendMessage(jid, { text, mentions: [a, b] }, { quoted: msg });
}

module.exports = { cmdMog };
