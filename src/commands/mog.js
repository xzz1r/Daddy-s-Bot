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
  'It\\\'s over para %L. Ni siquiera empezó. %M nació ascendido y %L nació de relleno.',
  'It\\\'s over. Lo fue desde que %L cargó la genética con la que vino al mundo. %M ni se molesta.',
  'Para %M nunca hizo falta empezar. Para %L nunca empezó ni va a empezar. It\\\'s over.',
  'El mog check terminó antes de la primera foto. %M ascendió, %L lleva LDAR de fábrica.',
  '%M está en la realidad. %L está en la negación. It\\\'s over y todos lo ven menos %L.',
  'JFL mirar a %L competir con %M. Es ver a un normie discutirle a un Gigachad. Patético.',
  '%L creyó que tenía oportunidad. Primer error. Segundo: nacer con esa cara. %M ni sudó.',
  '%M moggea a %L sin esfuerzo. El bone structure no se debate: se acepta o se llora.',
  '%L intentó el lookmax y se topó con %M. El techo de cristal tenía nombre.',
  'It\\\'s over para %L: %M existe en el mismo chat y eso basta para el veredicto.',
  '%M sube el promedio del grupo. %L lo baja. El mog check solo lo hace visible.',
  '%L no perdió el mog check hoy: lo perdió el día del parto. %M firma el acta.',
  'JFL la cara de %L al lado de %M. El contraste no necesita filtro.',
  '%M moggea en silencio. %L rellena el silencio con cope. It\\\'s over.',
  '%L vs %M en looks: no fue combate, fue demostración. Ganó quien ya había ganado.',
  'El ascenso de %M y el LDAR de %L en la misma frase. El chat no necesita más datos.',
  '%M no pidió el mog check: el universo lo organizó. %L pagó la entrada.',
  'It\\\'s over. %L puede lookmaxear en paz: el techo se llama %M.',
  '%L creyó que el ángulo salvaría. %M no necesita ángulo. Veredicto cerrado.',
  'JFL intentar competir. %M en el podio genético, %L en la grada del cope.',
  '%M moggea a %L con la cara en reposo. El esfuerzo cero es parte del insulto.',
  '%L el bone structure no se discute con mensajes. %M tampoco lo discute: lo exhibe.',
  'It\\\'s over para %L desde el primer frame. %M solo apareció para confirmar.',
  '%M sube el estándar del chat. %L lo sostiene en el suelo. Mog check resuelto.',
  '%L perdió el mog check antes de escribir. %M ganó antes de mirar.',
  'JFL la simetría de %L al lado de %M. El bot solo pone palabras al contraste.',
  '%M no suda el mog. %L suda el cope. Distribución natural.',
  '%L vs %M: el ranking de looks no admite recurso. %M arriba, %L abajo.',
  'It\\\'s over. %L puede seguir en el gym: la cara no se press bancaea. %M lo sabe.',
  '%M moggea sin anuncio. %L se entera por este mensaje. Bienvenido al LDAR.',
  '%L el lookmax tiene un techo y el techo tiene el nick de %M.',
  'JFL el cope de %L. %M ni se inmuta. It\\\'s over y se nota.',
  '%M en la realidad genética. %L en la fase de \\\'me captó mal la luz\\\'. Over.',
  '%L no compite con %M: adorna el contraste. El mog check lo deja por escrito.',
  '%M ganó el mog check de la forma más cruel: existiendo al lado de %L.',
  'It\\\'s over para %L. El bone structure de %M no negocia.',
  '%L intentó el frame. %M no necesita frame. Veredicto en una foto mental.',
  'JFL mirar el podio. %M arriba sin esfuerzo. %L abajo con discurso.',
  '%M moggea a %L y el chat aprende otra vez por qué el cope existe.',
  '%L el LDAR no se cura con filtro. %M es la prueba ambulante.',
  'It\\\'s over. %M nació en otra liga. %L juega en la de relleno.',
  '%M no pidió permiso para moggear a %L: la genética no pide permiso.',
  '%L vs %M en cara: el resultado estaba escrito en el cráneo de ambos.',
  'JFL el intento de %L. %M en modo reposo sigue ganando.',
  '%M sube el promedio. %L es el lastre. Mog check = aritmética facial.',
  '%L puede lookmaxear el cuerpo: la cara ya firmó el contrato del LDAR. %M testigo.',
  'It\\\'s over para %L cuando %M está en el mismo plano. Punto.',
  '%M moggea sin sudar. %L suda la explicación. Distribución natural del chat.',
  '%L el contraste con %M no necesita zoom: se ve a simple vista.',
  'JFL. %M ascendió. %L nació de relleno. El mog check solo lo dice en voz alta.',
  '%M vs %L: no fue pelea de looks, fue exposición. Ganó quien ya había ganado al nacer.',
  '%L creyó en el ángulo heroico. %M no tiene ángulo malo. It\\\'s over.',
  '%M el bone structure habla. %L el cope responde. Gana el hueso.',
  'It\\\'s over. %L en LDAR permanente mientras %M exista en el grupo.',
  '%L perdió el mog check en el primer segundo. %M ni abrió el cronómetro.',
  'JFL la genética de %L al lado de %M. El bot no inventa: documenta.',
  '%M moggea a %L con la cara en neutrales. El esfuerzo cero es el insulto.',
  '%L el techo del lookmax tiene nombre: %M.',
  '%M no debate looks con %L: el debate sería insultar la inteligencia del chat.',
  'It\\\'s over para %L. %M es la prueba de que el cope tiene fecha de caducidad.',
  '%L vs %M: el ranking facial no se apela. Se acepta o se llora en privado.',
  '%M subió el estándar. %L se quedó bajo el estándar. Mog check cerrado.',
  'JFL intentar. %M en el podio. %L en el cope. Orden natural.',
  '%L el frame no salva un LDAR de fábrica. %M es el espejo cruel.',
  '%M ganó el mog check existiendo. %L perdió el mismo día que nació.',
  'It\\\'s over. %M nació ascendido. %L nació justificando el ángulo.',
  '%L puede seguir en el gym: la cara de %M no se hipertrofia ni se alcanza.',
  '%M moggea en silencio. El silencio es parte del resultado. %L rellena con texto.',
  '%L vs %M en el plano de la cara: no hubo combate, hubo dictamen.',
  'JFL. %M arriba. %L abajo. El mog check es un trámite.',
  '%M el promedio del grupo sube cuando escribe y baja cuando escribe %L.',
  '%L el LDAR se confirma cada vez que %M aparece en el mismo hilo.',
  'It\\\'s over para %L. La genética de %M no se discute en un WhatsApp.',
  '%M no necesita lookmax. %L necesita un milagro. El mog check elige.',
  '%L creyó que el softmax bastaba. %M es el hard wall. Veredicto.',
  'JFL el contraste. %M en reposo gana a %L en su mejor ángulo.',
  '%M moggea a %L y el chat entiende por qué el cope vende cursos.',
  '%L el bone structure de %M es el techo. Todo lo demás es afición.',
  'It\\\'s over. %L en la grada. %M en el campo. Sin cambio de roles posible.',
  '%M vs %L: el resultado estaba en el cráneo. Este mensaje solo lo lee.',
  '%L perdió el mog check sin que %M levantara un dedo. Elegancia del ascenso.',
  'JFL. %M nació en otra distribución. %L en la cola de esa distribución.',
  '%M el mog check es un trámite administrativo. %L es el expediente.',
  '%L puede negarlo: el contraste con %M no se niega, se soporta.',
  'It\\\'s over para %L cuando el chat puede poner a %M al lado en la cabeza.',
  '%M moggea sin anuncio previo. %L se entera en este mensaje. Bienvenido.',
  '%L vs %M: no es odio, es antropometría. Gana %M.',
  'JFL el cope de %L. %M ni contesta. El silencio moggea más.',
  '%M sube el techo. %L se da con la cabeza. Mog check = física.',
  '%L el lookmax tiene límite y el límite tiene el nick de %M.',
  'It\\\'s over. %M en la realidad. %L en el PowerPoint del ángulo perfecto.',
  '%M ganó al nacer. %L compite desde entonces. El mog check actualiza el marcador.',
  '%L la cara de %M no pide permiso para cerrar el debate.',
  'JFL. %M ascendió. %L rellena. Orden del chat.',
  '%M moggea a %L con la mínima expresión facial. Suficiente.',
  '%L el LDAR no es una fase: es el piso. %M es el techo visible.',
  'It\\\'s over para %L. %M existe. Fin del argumento.',
  '%M vs %L en looks: el bot no inventa el resultado, lo enuncia.',
  '%L puede softmaxear hasta el cansancio: el hard wall se llama %M.',
  'JFL intentar el mog check. %M ya había ganado. %L ya había perdido.',
  '%M el contraste con %L es el contenido. Este mensaje es el envase.',
  '%L nació de relleno. %M nació ascendido. It\\\'s over y se nota en el grupo.'
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
