'use strict';

const { isOwner, isMainOwner, isAdmin, getSender, sameUser } = require('../utils/wa');
const { pickFresh } = require('../utils/helpers');

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
  '%M le ha hecho un mog a %L tan limpio que duele. Diferencia de liga, no de opinión.',
  'It\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\'s over para %L. %M nació en otra categoría y %L nació de relleno.',
  '%L puede sofmear hasta el cansancio: el hard wall se llama %M y no se discute.',
  '%M sube el promedio del chat. %L es el lastre. Mog check = aritmética facial., da asco, da asco.',
  '%M no pidió el mog: el universo lo organizó. %L pagó la entrada.',
  'Para %M nunca hizo falta empezar. Para %L nunca empezó ni va a empezar.',
  '%L perdió el mog check antes de escribir. %M ganó antes de mirar, asco. Qué asco de intento.',
  '%M es el techo. %L es el suelo. El contador no miente y el grupo lo ve.',
  'Softmaxear no salva a %L. El hard wall tiene nombre y se escribe %M.',
  '%M vs %L: no fue combate. Fue demostración de por qué uno está arriba y el otro abajo.',
  '%L se creía en la misma foto. %M le recordó que ni en el mismo álbum.',
  'Mog check cerrado: %M gana por KO técnico de presencia. %L en la lona.',
  '%M no necesita argumentos. La cara y el ranking bastan. %L sobra en el frame.',
  '%L intentó sostener la mirada y se le cayó el personaje. %M ni se inmutó.',
  'Diferencia de aura visual: %M en 4K y %L en resolución de calculadora.',
  '%M es el estándar. %L es el ejemplo de lo que no hay que ser, patético. Qué asco de intento.ajena.',
  'El mog no se discute, se mide. %M midió y %L salió en números rojos, asco. Qué asco de intento.',
  '%L puede hablar de height, de ratios y de luz. %M habla con la existencia.',
  '%M no flexea: ocupa espacio. %L flexea y el espacio lo expulsa, ridículo. Qué asco de intento.',
  'Hard wall detectado. Nombre del muro: %M. Nombre del que se estrelló: %L.',
  '%M vs %L en una frase: uno existe y el otro explica por qué no llega.',
  '%L perdió el mog check en el vestíbulo. %M ni entró a la sala de espera.',
  'La foto de grupo mejora cuando %M está y empeora cuando %L se pone al lado.',
  '%M no pidió permiso para subir el promedio. %L no pidió permiso para bajarlo., da asco, da asco.',
  'Softmax no es estrategia: es negación. %L niega y %M sigue ahí.',
  '%M es el hard wall que %L no va a saltar ni con tutorial ni con filtro.',
  '%L se miró al espejo del ranking y el espejo le devolvió a %M de fondo.',
  'Mog check: %M gana. %L pierde. El chat archiva sin debate, basura. Qué asco de intento.',
  '%M no necesita el comando para moggear. El comando solo lo documenta.',
  '%L en el mismo frame que %M es un error de composición, fracasado. Qué asco de intento.',
  'Diferencia de liga, no de suerte. %M en primera. %L en el barro, joder. Qué asco de intento.',
  '%M cierra el mog check sin sudar. %L abre el hilo de excusas, mierda. Qué asco de intento.',
  '%L puede invocar ratios hasta el infinito. El hard wall se llama %M. coño. Qué asco de intento.',
  '%M es el techo visual del grupo. %L es el recordatorio de que hay suelo.',
  'It\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\'s over. %M no compite con %L: %L compite con la idea de llegar a %M, indignante.',
  '%L perdió el mog antes del primer mensaje. %M ganó por existir, patético. Qué asco de intento.ajena.',
  '%M vs %L: aritmética facial sin calculadora. Gana quien no necesita explicar.',
  '%L se creía cercano. %M le puso el hard wall en la frente, basura. Qué asco de intento.',
  'El promedio del chat sube con %M y se arrastra con %L. Mog check cerrado.',
  '%M no flexea altura ni ratios: flexea el hecho de que %L no llega.',
  '%L en modo softmax permanente. %M en modo realidad permanente, joder. Qué asco de intento.',
  'Hard wall confirmado. Autor del muro: %M. Autor del choque: %L. mierda. Qué asco de intento.',
  '%M gana el mog check por KO de presencia. %L en la grada sin entrada.',
  '%L puede hablar del frame. %M es el frame. Diferencia de categoría., da asco, da asco.',
  '%M no pidió el mog check. El universo.',
  '%L se estrelló contra %M y todavía está buscando el tutorial del salto.',
  '%M es el estándar que %L usa de excusa. Qué asco de estrategia, asco. Qué asco de intento.',
  '%L vs %M en una línea: uno mide y el otro se mide mal, basura. Qué asco de intento.',
  'Mog check: %M arriba. %L abajo. Sin VAR y sin consuelo, ridículo. Qué asco de intento.',
  '%M ocupa el espacio. %L explica por qué no cabe. Crónica del mog.',
  '%L perdió el mog check en silencio. %M ni se enteró del intento, joder. Qué asco de intento.',
  '%M es el hard wall. %L es el que no ha aceptado el muro, mierda. Qué asco de intento.',
  '%L puede sofmear el hilo entero. El muro sigue llamándose %M. coño. Qué asco de intento.',
  '%M gana por existencia. %L pierde por insistir, cabrón. Qué asco de intento.',
  'It\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\'s over para %L en este frame. %M no comparte liga ni foto.',
  '%L se creía en la conversación del mog. %M es la conversación, patético. Qué asco de intento.ajena.',
  '%M vs %L: no hubo pelea. Hubo demostración, asco. Qué asco de intento.',
  '%L en el mismo ranking que %M es un error estadístico que el mog corrige.',
  '%M no necesita argumentos de foros. La cara basta y %L lo sabe, ridículo. Qué asco de intento.',
  'Hard wall: %M. Softmax victim: %L. Acta cerrada, fracasado. Qué asco de intento.',
  '%M sube el promedio. %L es el lastre documentado. Aritmética, joder. Qué asco de intento.',
  '%L puede invocar la luz, el ángulo y el filtro. %M invoca la realidad.',
  '%M cierra el mog sin sudar. %L abre el debate que nadie pidió, coño. Qué asco de intento.',
  '%L vs %M en el vestíbulo: %L ya había perdido antes de entrar, cabrón. Qué asco de intento., da asco, da asco.',
  'El frame mejora con %M y se rompe con %L al lado. Mog check, gilipollas. Qué asco de intento.',
  '%M no flexea: existe. %L flexea y el espacio lo expulsa del frame.',
  '%L se miró al ranking y el ranking le devolvió el hard wall con nombre %M.',
  '%M gana el mog check. %L pierde el derecho a discutir el resultado.',
  '%L en modo negación. %M en modo hard wall. Gana el muro, ridículo. Qué asco de intento.',
  '%M es el techo. %L es el ejemplo de por qué hay techo, fracasado. Qué asco de intento.',
  '%L perdió el mog antes de escribir la primera excusa. %M ni se inmutó.',
  '%M vs %L: aritmética facial. Gana quien no necesita calculadora, mierda. Qué asco de intento.',
  '%L puede hablar de ratios hasta quedarse sin saliva. El muro se llama %M.',
  '%M no pidió permiso para moggear. El ranking se lo dio, cabrón. Qué asco de intento.',
  'It\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\'s over. %L no está en la misma foto que %M ni de broma.',
  '%L se estrelló contra %M y el eco todavía suena en el hilo, patético. Qué asco de intento.ajena.',
  '%M es el estándar. %L es el aviso de lo que pasa cuando no llegas, asco. Qué asco de intento.',
  '%L vs %M en una frase: uno existe arriba y el otro explica el abajo.',
  'Hard wall confirmado. Nombre: %M. Víctima del choque: %L. ridículo. Qué asco de intento.',
  '%M gana por presencia. %L pierde por insistir en el mismo frame.',
  '%L en el mog check es contenido gratis. %M es el motivo, joder. Qué asco de intento.',
  '%M no necesita el hilo. El hilo necesita a %M para tener techo, mierda. Qué asco de intento.',
  '%M vs %L: demostración, no combate. Acta firmada, coño. Qué asco de intento.',
  '%L puede sofmear el universo. El hard wall sigue en su sitio con nombre %M., da asco, da asco.',
  '%M cierra el mog. %L abre el manual de excusas que nadie va a leer.',
  '%L se creía cercano a %M. El ranking le puso el muro en la frente.',
  '%M es el techo del grupo. %L es el recordatorio permanente del suelo.',
  '%L perdió el mog check sin que %M sudara una gota, basura. Qué asco de intento.',
  '%M no flexea ratios: flexea el hecho de que %L no llega ni con tutorial.',
  'Hard wall: %M. Softmax: %L. Resultado: over, fracasado. Qué asco de intento.',
  '%L en el mismo frame que %M es un error que el mog corrige en público.',
  '%M gana. %L pierde. El chat archiva sin pedir amplificación, mierda. Qué asco de intento.',
  '%L vs %M: uno mide y el otro se mide mal desde el principio, coño. Qué asco de intento.',
  '%M no pidió el mog. El universo y tu cara, %L, lo organizaron, cabrón. Qué asco de intento.',
  'It\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\'s over para %L. %M no comparte liga, ni foto, ni conversación seria, indignante.',
  '%L se estrelló y el muro ni se enteró. Nombre del muro: %M. patético. Qué asco de intento.ajena.',
  '%M es el estándar que %L usa de fantasía. Qué asco de estrategia, asco. Qué asco de intento.',
  '%M vs %L en el ranking: arriba y abajo sin zona gris, basura. Qué asco de intento.',
  '%L puede invocar la luz del norte. %M invoca la realidad del chat.',
  'Hard wall detectado. Autor: %M. Autor del choque frontal: %L. fracasado. Qué asco de intento.',
  '%M gana por existir. %L pierde por no aceptar el muro, joder. Qué asco de intento.',
  '%L en modo softmax eterno. %M en modo hard wall eterno. Gana el muro.',
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
    `@${numM} *moggea* a @${numL}\\n.` +
    `${phrase}`;

  await sock.sendMessage(jid, { text, mentions: [a, b] }, { quoted: msg });
}


// El bot abre con lo mas fuerte que tiene: los pools de insultos se ordenan
// de mas duro a mas suave UNA vez, al cargar, y pickFresh sesga la eleccion
// hacia la cabecera. Los pools neutros (cabeceras, cierres) no se tocan:
// ahi la "dureza" no significa nada.

module.exports = { cmdMog };
