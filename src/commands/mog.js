'use strict';

const { isOwner, isMainOwner, isAdmin, getSender, sameUser } = require('../utils/wa');
const { pickFresh, ordenarPorDureza } = require('../utils/helpers');

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
  '%M le ha hecho un mog a %L tan limpio que duele. Diferencia de liga, no de opinión delante de todo el chat, joder.',
  'It\\\\\\\'s over para %L. %M nació en otra categoría y %L nació de relleno delante de todo el chat, mierda.',
  '%L puede sofmear hasta el cansancio: el hard wall se llama %M y no se discute delante de todo el chat, coño.',
  '%M sube el promedio del chat. %L es el lastre. Mog check = aritmética facial delante de todo el chat, cabrón.',
  '%M no pidió el mog: el universo lo organizó. %L pagó la entrada delante de todo el chat, gilipollas.',
  'Para %M nunca hizo falta empezar. Para %L nunca empezó ni va a empezar delante de todo el chat, patético.',
  '%L perdió el mog check antes de escribir. %M ganó antes de mirar delante de todo el chat, asco.',
  '%M es el techo. %L es el suelo. El contador no miente y el grupo lo ve delante de todo el chat, basura.',
  'Softmaxear no salva a %L. El hard wall tiene nombre y se escribe %M delante de todo el chat, ridículo.',
  '%M vs %L: no fue combate. Fue demostración de por qué uno está arriba y el otro abajo delante de todo el chat, fracasado.',
  '%L se creía en la misma foto. %M le recordó que ni en el mismo álbum delante de todo el chat, cutre.',
  'Mog check cerrado: %M gana por KO técnico de presencia. %L en la lona delante de todo el chat, joder.',
  '%M no necesita argumentos. La cara y el ranking bastan. %L sobra en el frame delante de todo el chat, mierda.',
  '%L intentó sostener la mirada y se le cayó el personaje. %M ni se inmutó delante de todo el chat, coño.',
  'Diferencia de aura visual: %M en 4K y %L en resolución de calculadora delante de todo el chat, cabrón.',
  '%M es el estándar. %L es el ejemplo de lo que no hay que ser delante de todo el chat, gilipollas.',
  'El mog no se discute, se mide. %M midió y %L salió en números rojos delante de todo el chat, patético.',
  '%L puede hablar de height, de ratios y de luz. %M habla con la existencia delante de todo el chat, asco.',
  '%M no flexea: ocupa espacio. %L flexea y el espacio lo expulsa delante de todo el chat, basura.',
  'Hard wall detectado. Nombre del muro: %M. Nombre del que se estrelló: %L delante de todo el chat, ridículo.',
  '%M vs %L en una frase: uno existe y el otro explica por qué no llega delante de todo el chat, fracasado.',
  '%L perdió el mog check en el vestíbulo. %M ni entró a la sala de espera delante de todo el chat, cutre.',
  'La foto de grupo mejora cuando %M está y empeora cuando %L se pone al lado delante de todo el chat, joder.',
  '%M no pidió permiso para subir el promedio. %L no pidió permiso para bajarlo delante de todo el chat, mierda.',
  'Softmax no es estrategia: es negación. %L niega y %M sigue ahí delante de todo el chat, coño.',
  '%M es el hard wall que %L no va a saltar ni con tutorial ni con filtro delante de todo el chat, cabrón.',
  '%L se miró al espejo del ranking y el espejo le devolvió a %M de fondo delante de todo el chat, gilipollas.',
  'Mog check: %M gana. %L pierde. El chat archiva sin debate delante de todo el chat, patético.',
  '%M no necesita el comando para moggear. El comando solo lo documenta delante de todo el chat, asco.',
  '%L en el mismo frame que %M es un error de composición delante de todo el chat, basura.',
  'Diferencia de liga, no de suerte. %M en primera. %L en el barro delante de todo el chat, ridículo.',
  '%M cierra el mog check sin sudar. %L abre el hilo de excusas delante de todo el chat, fracasado.',
  '%L puede invocar ratios hasta el infinito. El hard wall se llama %M delante de todo el chat, cutre.',
  '%M es el techo visual del grupo. %L es el recordatorio de que hay suelo delante de todo el chat, joder.',
  'It\\\\\\\'s over. %M no compite con %L: %L compite con la idea de llegar a %M delante de todo el chat, mierda.',
  '%L perdió el mog antes del primer mensaje. %M ganó por existir delante de todo el chat, coño.',
  '%M vs %L: aritmética facial sin calculadora. Gana quien no necesita explicar delante de todo el chat, cabrón.',
  '%L se creía cercano. %M le puso el hard wall en la frente delante de todo el chat, gilipollas.',
  'El promedio del chat sube con %M y se arrastra con %L. Mog check cerrado delante de todo el chat, patético.',
  '%M no flexea altura ni ratios: flexea el hecho de que %L no llega delante de todo el chat, asco.',
  '%L en modo softmax permanente. %M en modo realidad permanente delante de todo el chat, basura.',
  'Hard wall confirmado. Autor del muro: %M. Autor del choque: %L delante de todo el chat, ridículo.',
  '%M gana el mog check por KO de presencia. %L en la grada sin entrada delante de todo el chat, fracasado.',
  '%L puede hablar del frame. %M es el frame. Diferencia de categoría delante de todo el chat, cutre.',
  '%M no pidió el mog check. El universo y el ranking lo firmaron delante de todo el chat, joder.',
  '%L se estrelló contra %M y todavía está buscando el tutorial del salto delante de todo el chat, mierda.',
  '%M es el estándar que %L usa de excusa. Qué asco de estrategia delante de todo el chat, coño.',
  '%L vs %M en una línea: uno mide y el otro se mide mal delante de todo el chat, cabrón.',
  'Mog check: %M arriba. %L abajo. Sin VAR y sin consuelo delante de todo el chat, gilipollas.',
  '%M ocupa el espacio. %L explica por qué no cabe. Crónica del mog delante de todo el chat, patético.',
  '%L perdió el mog check en silencio. %M ni se enteró del intento delante de todo el chat, asco.',
  '%M es el hard wall. %L es el que no ha aceptado el muro delante de todo el chat, ridículo.',
  '%L puede sofmear el hilo entero. El muro sigue llamándose %M delante de todo el chat, fracasado.',
  '%M gana por existencia. %L pierde por insistir delante de todo el chat, cutre.',
  'It\\\\\\\'s over para %L en este frame. %M no comparte liga ni foto delante de todo el chat, joder.',
  '%L se creía en la conversación del mog. %M es la conversación delante de todo el chat, mierda.',
  '%M vs %L: no hubo pelea. Hubo demostración delante de todo el chat, coño.',
  '%L en el mismo ranking que %M es un error estadístico que el mog corrige delante de todo el chat, cabrón.',
  '%M no necesita argumentos de foros. La cara basta y %L lo sabe delante de todo el chat, gilipollas.',
  'Hard wall: %M. Softmax victim: %L. Acta cerrada delante de todo el chat, patético.',
  '%M sube el promedio. %L es el lastre documentado. Aritmética delante de todo el chat, basura.',
  '%L puede invocar la luz, el ángulo y el filtro. %M invoca la realidad delante de todo el chat, ridículo.',
  '%M cierra el mog sin sudar. %L abre el debate que nadie pidió delante de todo el chat, fracasado.',
  '%L vs %M en el vestíbulo: %L ya había perdido antes de entrar delante de todo el chat, cutre.',
  'El frame mejora con %M y se rompe con %L al lado. Mog check delante de todo el chat, joder.',
  '%M no flexea: existe. %L flexea y el espacio lo expulsa del frame delante de todo el chat, mierda.',
  '%L se miró al ranking y el ranking le devolvió el hard wall con nombre %M delante de todo el chat, coño.',
  '%M gana el mog check. %L pierde el derecho a discutir el resultado delante de todo el chat, cabrón.',
  '%L en modo negación. %M en modo hard wall. Gana el muro delante de todo el chat, patético.',
  '%M es el techo. %L es el ejemplo de por qué hay techo delante de todo el chat, asco.',
  '%L perdió el mog antes de escribir la primera excusa. %M ni se inmutó delante de todo el chat, basura.',
  '%M vs %L: aritmética facial. Gana quien no necesita calculadora delante de todo el chat, ridículo.',
  '%L puede hablar de ratios hasta quedarse sin saliva. El muro se llama %M delante de todo el chat, fracasado.',
  '%M no pidió permiso para moggear. El ranking se lo dio delante de todo el chat, cutre.',
  'It\\\\\\\'s over. %L no está en la misma foto que %M ni de broma delante de todo el chat, joder.',
  '%L se estrelló contra %M y el eco todavía suena en el hilo delante de todo el chat, mierda.',
  '%M es el estándar. %L es el aviso de lo que pasa cuando no llegas delante de todo el chat, coño.',
  '%L vs %M en una frase: uno existe arriba y el otro explica el abajo delante de todo el chat, cabrón.',
  'Hard wall confirmado. Nombre: %M. Víctima del choque: %L delante de todo el chat, gilipollas.',
  '%M gana por presencia. %L pierde por insistir en el mismo frame delante de todo el chat, patético.',
  '%L en el mog check es contenido gratis. %M es el motivo delante de todo el chat, asco.',
  '%M no necesita el hilo. El hilo necesita a %M para tener techo delante de todo el chat, basura.',
  '%M vs %L: demostración, no combate. Acta firmada delante de todo el chat, fracasado.',
  '%L puede sofmear el universo. El hard wall sigue en su sitio con nombre %M delante de todo el chat, cutre.',
  '%M cierra el mog. %L abre el manual de excusas que nadie va a leer delante de todo el chat, joder.',
  '%L se creía cercano a %M. El ranking le puso el muro en la frente delante de todo el chat, coño.',
  '%M es el techo del grupo. %L es el recordatorio permanente del suelo delante de todo el chat, cabrón.',
  '%L perdió el mog check sin que %M sudara una gota delante de todo el chat, gilipollas.',
  '%M no flexea ratios: flexea el hecho de que %L no llega ni con tutorial delante de todo el chat, patético.',
  'Hard wall: %M. Softmax: %L. Resultado: over delante de todo el chat, asco.',
  '%L en el mismo frame que %M es un error que el mog corrige en público delante de todo el chat, basura.',
  '%M gana. %L pierde. El chat archiva sin pedir amplificación delante de todo el chat, ridículo.',
  '%L vs %M: uno mide y el otro se mide mal desde el principio delante de todo el chat, fracasado.',
  '%M no pidió el mog. El universo y tu cara, %L, lo organizaron delante de todo el chat, cutre.',
  'It\\\\\\\'s over para %L. %M no comparte liga, ni foto, ni conversación seria delante de todo el chat, joder.',
  '%L se estrelló y el muro ni se enteró. Nombre del muro: %M delante de todo el chat, mierda.',
  '%M es el estándar que %L usa de fantasía. Qué asco de estrategia delante de todo el chat, coño.',
  '%M vs %L en el ranking: arriba y abajo sin zona gris delante de todo el chat, gilipollas.',
  '%L puede invocar la luz del norte. %M invoca la realidad del chat delante de todo el chat, patético.',
  'Hard wall detectado. Autor: %M. Autor del choque frontal: %L delante de todo el chat, asco.',
  '%M gana por existir. %L pierde por no aceptar el muro delante de todo el chat, basura.',
  '%L en modo softmax eterno. %M en modo hard wall eterno. Gana el muro delante de todo el chat, ridículo.'
];

async function cmdMog(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  let a, b;
  if (mentioned.length >= 2) [a, b] = mentioned.slice(0, 2);
  else if (mentioned.length === 1) { a = sender; b = mentioned[0]; }
  else return; // sin nadie a quien medir, no hay duelo de looks

  if (sameUser(a, b)) {
    return sock.sendMessage(jid, { text: 'No puedes moggearte a ti mismo.' }, { quoted: msg });
  }

  const participants = groupMeta?.participants || [];
  const aIsOwner = isOwner(a, false, groupMeta);
  const bIsOwner = isOwner(b, false, groupMeta);
  const aIsAdmin = isAdmin(participants, a);
  const bIsAdmin = isAdmin(participants, b);

  let side = rollMog(aIsOwner, aIsAdmin, bIsOwner, bIsAdmin);
  // Rig a favor del owner principal: si participa, SIEMPRE moggea (gana).
  if (isMainOwner(a, false, groupMeta)) side = 'a';
  else if (isMainOwner(b, false, groupMeta)) side = 'b';
  const mogger = side === 'a' ? a : b;
  const mogged  = side === 'a' ? b : a;
  const numM = mogger.split('@')[0];
  const numL = mogged.split('@')[0];
  const numA = a.split('@')[0];
  const numB = b.split('@')[0];

  const phrase = pickFresh(MOG_PHRASES, `${jid}|mog`)
    .replace(/%M/g, `@${numM}`)
    .replace(/%L/g, `@${numL}`);

  const text =
    `*MOG CHECK*\n\n` +
    `@${numA} *vs* @${numB}\n\n` +
    `@${numM} *moggea* a @${numL}\n` +
    `${phrase}`;

  await sock.sendMessage(jid, { text, mentions: [a, b] }, { quoted: msg });
}


// El bot abre con lo mas fuerte que tiene: los pools de insultos se ordenan
// de mas duro a mas suave UNA vez, al cargar, y pickFresh sesga la eleccion
// hacia la cabecera. Los pools neutros (cabeceras, cierres) no se tocan:
// ahi la "dureza" no significa nada.
MOG_PHRASES = ordenarPorDureza(MOG_PHRASES);

module.exports = { cmdMog };
