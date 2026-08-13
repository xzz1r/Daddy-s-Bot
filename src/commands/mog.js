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
  'It\\\\\\\'s over para %L. Ni siquiera empezó. %M nació ascendido y %L nació de relleno delante de todo el hilo y sin posibilidad de borrado.',
  'It\\\\\\\'s over. Lo fue desde que %L cargó la genética con la que vino al mundo. %M ni se molesta con el ranking como único testigo del resultado.',
  'Para %M nunca hizo falta empezar. Para %L nunca empezó ni va a empezar. It\\\\\\\'s over y el contador lo dejó por escrito sin debate.',
  'El mog check terminó antes de la primera foto. %M ascendió, %L lleva LDAR de fábrica en el momento más visible del chat.',
  '%M está en la realidad. %L está en la negación. It\\\\\\\'s over y todos lo ven menos %L sin que nadie pudiera fingir que no lo vio.',
  'JFL mirar a %L competir con %M. Es ver a un normie discutirle a un Gigachad. Patético con el parte del comando cerrado en firme.',
  '%L creyó que tenía oportunidad. Primer error. Segundo: nacer con esa cara. %M ni sudó y sin segunda oportunidad en este mensaje.',
  '%M moggea a %L sin esfuerzo. El bone structure no se debate: se acepta o se llora mientras el grupo tomaba nota del movimiento.',
  '%L intentó el lookmax y se topó con %M. El techo de cristal tenía nombre con números que no admiten recurso de apelación.',
  'It\\\\\\\'s over para %L: %M existe en el mismo chat y eso basta para el veredicto y el historial del comando queda de testigo.',
  '%M sube el promedio del grupo. %L lo baja. El mog check solo lo hace visible delante de quien miraba el ranking en ese momento.',
  '%L no perdió el mog check hoy: lo perdió el día del parto. %M firma el acta con el sistema firmando debajo sin pedir aclaración.',
  'JFL la cara de %L al lado de %M. El contraste no necesita filtro delante de todo el hilo y sin posibilidad de borrado.',
  '%M moggea en silencio. %L rellena el silencio con cope. It\\\\\\\'s over con el ranking como único testigo del resultado.',
  '%L vs %M en looks: no fue combate, fue demostración. Ganó quien ya había ganado y el contador lo dejó por escrito sin debate.',
  'El ascenso de %M y el LDAR de %L en la misma frase. El chat no necesita más datos en el momento más visible del chat.',
  '%M no pidió el mog check: el universo lo organizó. %L pagó la entrada sin que nadie pudiera fingir que no lo vio.',
  'It\\\\\\\'s over. %L puede lookmaxear en paz: el techo se llama %M con el parte del comando cerrado en firme.',
  '%L creyó que el ángulo salvaría. %M no necesita ángulo. Veredicto cerrado y sin segunda oportunidad en este mensaje.',
  'JFL intentar competir. %M en el podio genético, %L en la grada del cope mientras el grupo tomaba nota del movimiento.',
  '%M moggea a %L con la cara en reposo. El esfuerzo cero es parte del insulto con números que no admiten recurso de apelación.',
  '%L el bone structure no se discute con mensajes. %M tampoco lo discute: lo exhibe y el historial del comando queda de testigo.',
  'It\\\\\\\'s over para %L desde el primer frame. %M solo apareció para confirmar delante de quien miraba el ranking en ese momento.',
  '%M sube el estándar del chat. %L lo sostiene en el suelo. Mog check resuelto con el sistema firmando debajo sin pedir aclaración.',
  '%L perdió el mog check antes de escribir. %M ganó antes de mirar delante de todo el hilo y sin posibilidad de borrado.',
  'JFL la simetría de %L al lado de %M. El bot solo pone palabras al contraste con el ranking como único testigo del resultado.',
  '%M no suda el mog. %L suda el cope. Distribución natural y el contador lo dejó por escrito sin debate.',
  '%L vs %M: el ranking de looks no admite recurso. %M arriba, %L abajo en el momento más visible del chat.',
  'It\\\\\\\'s over. %L puede seguir en el gym: la cara no se press bancaea. %M lo sabe sin que nadie pudiera fingir que no lo vio.',
  '%M moggea sin anuncio. %L se entera por este mensaje. Bienvenido al LDAR con el parte del comando cerrado en firme.',
  '%L el lookmax tiene un techo y el techo tiene el nick de %M y sin segunda oportunidad en este mensaje.',
  'JFL el cope de %L. %M ni se inmuta. It\\\\\\\'s over y se nota mientras el grupo tomaba nota del movimiento.',
  '%M en la realidad genética. %L en la fase de \\\\\\\'me captó mal la luz\\\\\\\'. Over con números que no admiten recurso de apelación.',
  '%L no compite con %M: adorna el contraste. El mog check lo deja por escrito y el historial del comando queda de testigo.',
  '%M ganó el mog check de la forma más cruel: existiendo al lado de %L delante de quien miraba el ranking en ese momento.',
  'It\\\\\\\'s over para %L. El bone structure de %M no negocia con el sistema firmando debajo sin pedir aclaración.',
  '%L intentó el frame. %M no necesita frame. Veredicto en una foto mental delante de todo el hilo y sin posibilidad de borrado.',
  'JFL mirar el podio. %M arriba sin esfuerzo. %L abajo con discurso con el ranking como único testigo del resultado.',
  '%M moggea a %L y el chat aprende otra vez por qué el cope existe y el contador lo dejó por escrito sin debate.',
  '%L el LDAR no se cura con filtro. %M es la prueba ambulante en el momento más visible del chat y el sistema no ofrece consuelo.',
  'It\\\\\\\'s over. %M nació en otra liga. %L juega en la de relleno sin que nadie pudiera fingir que no lo vio.',
  '%M no pidió permiso para moggear a %L: la genética no pide permiso con el parte del comando cerrado en firme.',
  '%L vs %M en cara: el resultado estaba escrito en el cráneo de ambos y sin segunda oportunidad en este mensaje.',
  'JFL el intento de %L. %M en modo reposo sigue ganando mientras el grupo tomaba nota del movimiento y el sistema no ofrece consuelo.',
  '%M sube el promedio. %L es el lastre. Mog check = aritmética facial con números que no admiten recurso de apelación.',
  '%L puede lookmaxear el cuerpo: la cara ya firmó el contrato del LDAR. %M testigo y el historial del comando queda de testigo.',
  'It\\\\\\\'s over para %L cuando %M está en el mismo plano. Punto delante de quien miraba el ranking en ese momento.',
  '%M moggea sin sudar. %L suda la explicación. Distribución natural del chat con el sistema firmando debajo sin pedir aclaración.',
  '%L el contraste con %M no necesita zoom: se ve a simple vista delante de todo el hilo y sin posibilidad de borrado.',
  'JFL. %M ascendió. %L nació de relleno. El mog check solo lo dice en voz alta con el ranking como único testigo del resultado.',
  '%M vs %L: no fue pelea de looks, fue exposición. Ganó quien ya había ganado al nacer y el contador lo dejó por escrito sin debate.',
  '%L creyó en el ángulo heroico. %M no tiene ángulo malo. It\\\\\\\'s over en el momento más visible del chat.',
  '%M el bone structure habla. %L el cope responde. Gana el hueso sin que nadie pudiera fingir que no lo vio.',
  'It\\\\\\\'s over. %L en LDAR permanente mientras %M exista en el grupo con el parte del comando cerrado en firme.',
  '%L perdió el mog check en el primer segundo. %M ni abrió el cronómetro y sin segunda oportunidad en este mensaje.',
  'JFL la genética de %L al lado de %M. El bot no inventa: documenta mientras el grupo tomaba nota del movimiento.',
  '%M moggea a %L con la cara en neutrales. El esfuerzo cero es el insulto con números que no admiten recurso de apelación.',
  '%L el techo del lookmax tiene nombre: %M y el historial del comando queda de testigo y el sistema no ofrece consuelo.',
  '%M no debate looks con %L: el debate sería insultar la inteligencia del chat delante de quien miraba el ranking en ese momento.',
  'It\\\\\\\'s over para %L. %M es la prueba de que el cope tiene fecha de caducidad con el sistema firmando debajo sin pedir aclaración.',
  '%L vs %M: el ranking facial no se apela. Se acepta o se llora en privado delante de todo el hilo y sin posibilidad de borrado.',
  '%M subió el estándar. %L se quedó bajo el estándar. Mog check cerrado con el ranking como único testigo del resultado.',
  'JFL intentar. %M en el podio. %L en el cope. Orden natural y el contador lo dejó por escrito sin debate.',
  '%L el frame no salva un LDAR de fábrica. %M es el espejo cruel en el momento más visible del chat y el sistema no ofrece consuelo.',
  '%M ganó el mog check existiendo. %L perdió el mismo día que nació sin que nadie pudiera fingir que no lo vio.',
  'It\\\\\\\'s over. %M nació ascendido. %L nació justificando el ángulo con el parte del comando cerrado en firme.',
  '%L puede seguir en el gym: la cara de %M no se hipertrofia ni se alcanza y sin segunda oportunidad en este mensaje.',
  '%M moggea en silencio. El silencio es parte del resultado. %L rellena con texto mientras el grupo tomaba nota del movimiento.',
  '%L vs %M en el plano de la cara: no hubo combate, hubo dictamen con números que no admiten recurso de apelación.',
  'JFL. %M arriba. %L abajo. El mog check es un trámite y el historial del comando queda de testigo y el sistema no ofrece consuelo.',
  '%M el promedio del grupo sube cuando escribe y baja cuando escribe %L delante de quien miraba el ranking en ese momento.',
  '%L el LDAR se confirma cada vez que %M aparece en el mismo hilo con el sistema firmando debajo sin pedir aclaración.',
  'It\\\\\\\'s over para %L. La genética de %M no se discute en un WhatsApp delante de todo el hilo y sin posibilidad de borrado.',
  '%M no necesita lookmax. %L necesita un milagro. El mog check elige con el ranking como único testigo del resultado.',
  '%L creyó que el softmax bastaba. %M es el hard wall. Veredicto y el contador lo dejó por escrito sin debate.',
  'JFL el contraste. %M en reposo gana a %L en su mejor ángulo en el momento más visible del chat y el sistema no ofrece consuelo.',
  '%M moggea a %L y el chat entiende por qué el cope vende cursos sin que nadie pudiera fingir que no lo vio.',
  '%L el bone structure de %M es el techo. Todo lo demás es afición con el parte del comando cerrado en firme.',
  'It\\\\\\\'s over. %L en la grada. %M en el campo. Sin cambio de roles posible y sin segunda oportunidad en este mensaje.',
  '%M vs %L: el resultado estaba en el cráneo. Este mensaje solo lo lee mientras el grupo tomaba nota del movimiento.',
  '%L perdió el mog check sin que %M levantara un dedo. Elegancia del ascenso con números que no admiten recurso de apelación.',
  'JFL. %M nació en otra distribución. %L en la cola de esa distribución y el historial del comando queda de testigo.',
  '%M el mog check es un trámite administrativo. %L es el expediente delante de quien miraba el ranking en ese momento.',
  '%L puede negarlo: el contraste con %M no se niega, se soporta con el sistema firmando debajo sin pedir aclaración.',
  'It\\\\\\\'s over para %L cuando el chat puede poner a %M al lado en la cabeza delante de todo el hilo y sin posibilidad de borrado.',
  '%M moggea sin anuncio previo. %L se entera en este mensaje. Bienvenido con el ranking como único testigo del resultado.',
  '%L vs %M: no es odio, es antropometría. Gana %M y el contador lo dejó por escrito sin debate y el sistema no ofrece consuelo.',
  'JFL el cope de %L. %M ni contesta. El silencio moggea más en el momento más visible del chat y el sistema no ofrece consuelo.',
  '%M sube el techo. %L se da con la cabeza. Mog check = física sin que nadie pudiera fingir que no lo vio.',
  '%L el lookmax tiene límite y el límite tiene el nick de %M con el parte del comando cerrado en firme.',
  'It\\\\\\\'s over. %M en la realidad. %L en el PowerPoint del ángulo perfecto y sin segunda oportunidad en este mensaje.',
  '%M ganó al nacer. %L compite desde entonces. El mog check actualiza el marcador mientras el grupo tomaba nota del movimiento.',
  '%L la cara de %M no pide permiso para cerrar el debate con números que no admiten recurso de apelación.',
  'JFL. %M ascendió. %L rellena. Orden del chat y el historial del comando queda de testigo y el sistema no ofrece consuelo.',
  '%M moggea a %L con la mínima expresión facial. Suficiente delante de quien miraba el ranking en ese momento.',
  '%L el LDAR no es una fase: es el piso. %M es el techo visible con el sistema firmando debajo sin pedir aclaración.',
  'It\\\\\\\'s over para %L. %M existe. Fin del argumento delante de todo el hilo y sin posibilidad de borrado.',
  '%M vs %L en looks: el bot no inventa el resultado, lo enuncia con el ranking como único testigo del resultado.',
  '%L puede softmaxear hasta el cansancio: el hard wall se llama %M y el contador lo dejó por escrito sin debate.',
  'JFL intentar el mog check. %M ya había ganado. %L ya había perdido en el momento más visible del chat.',
  '%M el contraste con %L es el contenido. Este mensaje es el envase sin que nadie pudiera fingir que no lo vio.',
  '%L nació de relleno. %M nació ascendido. It\\\\\\\'s over y se nota en el grupo con el parte del comando cerrado en firme.'
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
