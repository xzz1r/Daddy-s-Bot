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
  'It\\\\\\\\\\\\\\\'s over para %L. Ni siquiera empezó. %M nació ascendido y %L nació de relleno sin descuento emocional posible.',
  'It\\\\\\\\\\\\\\\'s over. Lo fue desde que %L cargó la genética con la que vino al mundo. %M ni se molesta y el contador no miente nunca.',
  'Para %M nunca hizo falta empezar. Para %L nunca empezó ni va a empezar. It\\\\\\\\\\\\\\\'s over delante de quien miraba de verdad.',
  'El mog check terminó antes de la primera foto. %M ascendió, %L lleva LDAR de fábrica con firma legible en el historial.',
  '%M está en la realidad. %L está en la negación. It\\\\\\\\\\\\\\\'s over y todos lo ven menos %L y basta de cuento para hoy.',
  'JFL mirar a %L competir con %M. Es ver a un normie discutirle a un Gigachad. Patético al natural, sin barniz de consuelo.',
  '%L creyó que tenía oportunidad. Primer error. Segundo: nacer con esa cara. %M ni sudó que es como duele de verdad aquí.',
  '%M moggea a %L sin esfuerzo. El bone structure no se debate: se acepta o se llora y el resto del hilo es ruido.',
  '%L intentó el lookmax y se topó con %M. El techo de cristal tenía nombre sin modo avión que lo oculte.',
  'It\\\\\\\\\\\\\\\'s over para %L: %M existe en el mismo chat y eso basta para el veredicto con el bot firmando el veredicto.',
  '%M sube el promedio del grupo. %L lo baja. El mog check solo lo hace visible y el grupo ya cambió de tema.',
  '%L no perdió el mog check hoy: lo perdió el día del parto. %M firma el acta en el único idioma del ranking.',
  'JFL la cara de %L al lado de %M. El contraste no necesita filtro sin apelación ni letra pequeña con el saldo escrito a la vista.',
  '%M moggea en silencio. %L rellena el silencio con cope. It\\\\\\\\\\\\\\\'s over y no hace falta ampliar el parte.',
  '%L vs %M en looks: no fue combate, fue demostración. Ganó quien ya había ganado en el momento más incómodo del chat.',
  'El ascenso de %M y el LDAR de %L en la misma frase. El chat no necesita más datos sin que nadie pida repetición.',
  '%M no pidió el mog check: el universo lo organizó. %L pagó la entrada con el eco del fail todavía sonando.',
  'It\\\\\\\\\\\\\\\'s over. %L puede lookmaxear en paz: el techo se llama %M y el sistema cierra sin discusión.',
  '%L creyó que el ángulo salvaría. %M no necesita ángulo. Veredicto cerrado delante del ranking y de la cara.',
  'JFL intentar competir. %M en el podio genético, %L en la grada del cope sin consuelo de manual de autoayuda.',
  '%M moggea a %L con la cara en reposo. El esfuerzo cero es parte del insulto con el número hablando solo.',
  '%L el bone structure no se discute con mensajes. %M tampoco lo discute: lo exhibe y el archivo queda cerrado hoy.',
  'It\\\\\\\\\\\\\\\'s over para %L desde el primer frame. %M solo apareció para confirmar y duele de lo previsible.',
  '%M sube el estándar del chat. %L lo sostiene en el suelo. Mog check resuelto sin derecho a bis ni a matiz.',
  '%L perdió el mog check antes de escribir. %M ganó antes de mirar con el chat de testigo obligado punto final del parte de hoy.',
  'JFL la simetría de %L al lado de %M. El bot solo pone palabras al contraste y no hay segunda lectura útil.',
  '%M no suda el mog. %L suda el cope. Distribución natural en alta definición de group chat como manda el ranking sin filtro.',
  '%L vs %M: el ranking de looks no admite recurso. %M arriba, %L abajo sin descuento emocional posible.',
  'It\\\\\\\\\\\\\\\'s over. %L puede seguir en el gym: la cara no se press bancaea. %M lo sabe y el contador no miente nunca.',
  '%M moggea sin anuncio. %L se entera por este mensaje. Bienvenido al LDAR delante de quien miraba de verdad.',
  '%L el lookmax tiene un techo y el techo tiene el nick de %M con firma legible en el historial y basta de cuento para hoy.',
  'JFL el cope de %L. %M ni se inmuta. It\\\\\\\\\\\\\\\'s over y se nota al natural, sin barniz de consuelo que es como duele de verdad aquí.',
  '%M en la realidad genética. %L en la fase de \\\\\\\\\\\\\\\'me captó mal la luz\\\\\\\\\\\\\\\'. Over y el resto del hilo es ruido.',
  '%L no compite con %M: adorna el contraste. El mog check lo deja por escrito sin modo avión que lo oculte.',
  '%M ganó el mog check de la forma más cruel: existiendo al lado de %L con el bot firmando el veredicto.',
  'It\\\\\\\\\\\\\\\'s over para %L. El bone structure de %M no negocia y el grupo ya cambió de tema en el único idioma del ranking.',
  '%L intentó el frame. %M no necesita frame. Veredicto en una foto mental sin apelación ni letra pequeña.',
  'JFL mirar el podio. %M arriba sin esfuerzo. %L abajo con discurso con el saldo escrito a la vista y no hace falta ampliar el parte.',
  '%M moggea a %L y el chat aprende otra vez por qué el cope existe en el momento más incómodo del chat.',
  '%L el LDAR no se cura con filtro. %M es la prueba ambulante sin que nadie pida repetición con el eco del fail todavía sonando.',
  'It\\\\\\\\\\\\\\\'s over. %M nació en otra liga. %L juega en la de relleno y el sistema cierra sin discusión.',
  '%M no pidió permiso para moggear a %L: la genética no pide permiso delante del ranking y de la cara.',
  '%L vs %M en cara: el resultado estaba escrito en el cráneo de ambos sin consuelo de manual de autoayuda.',
  'JFL el intento de %L. %M en modo reposo sigue ganando con el número hablando solo y el archivo queda cerrado hoy.',
  '%M sube el promedio. %L es el lastre. Mog check = aritmética facial y duele de lo previsible sin derecho a bis ni a matiz.',
  '%L puede lookmaxear el cuerpo: la cara ya firmó el contrato del LDAR. %M testigo con el chat de testigo obligado.',
  'It\\\\\\\\\\\\\\\'s over para %L cuando %M está en el mismo plano. Punto punto final del parte de hoy y no hay segunda lectura útil.',
  '%M moggea sin sudar. %L suda la explicación. Distribución natural del chat en alta definición de group chat.',
  '%L el contraste con %M no necesita zoom: se ve a simple vista como manda el ranking sin filtro sin descuento emocional posible.',
  'JFL. %M ascendió. %L nació de relleno. El mog check solo lo dice en voz alta y el contador no miente nunca.',
  '%M vs %L: no fue pelea de looks, fue exposición. Ganó quien ya había ganado al nacer delante de quien miraba de verdad.',
  '%L creyó en el ángulo heroico. %M no tiene ángulo malo. It\\\\\\\\\\\\\\\'s over con firma legible en el historial.',
  '%M el bone structure habla. %L el cope responde. Gana el hueso y basta de cuento para hoy al natural, sin barniz de consuelo.',
  'It\\\\\\\\\\\\\\\'s over. %L en LDAR permanente mientras %M exista en el grupo que es como duele de verdad aquí.',
  '%L perdió el mog check en el primer segundo. %M ni abrió el cronómetro y el resto del hilo es ruido.',
  'JFL la genética de %L al lado de %M. El bot no inventa: documenta sin modo avión que lo oculte con el bot firmando el veredicto.',
  '%M moggea a %L con la cara en neutrales. El esfuerzo cero es el insulto y el grupo ya cambió de tema.',
  '%L el techo del lookmax tiene nombre: %M en el único idioma del ranking sin apelación ni letra pequeña.',
  '%M no debate looks con %L: el debate sería insultar la inteligencia del chat con el saldo escrito a la vista.',
  'It\\\\\\\\\\\\\\\'s over para %L. %M es la prueba de que el cope tiene fecha de caducidad y no hace falta ampliar el parte.',
  '%L vs %M: el ranking facial no se apela. Se acepta o se llora en privado en el momento más incómodo del chat.',
  '%M subió el estándar. %L se quedó bajo el estándar. Mog check cerrado sin que nadie pida repetición.',
  'JFL intentar. %M en el podio. %L en el cope. Orden natural con el eco del fail todavía sonando y el sistema cierra sin discusión.',
  '%L el frame no salva un LDAR de fábrica. %M es el espejo cruel delante del ranking y de la cara sin consuelo de manual de autoayuda.',
  '%M ganó el mog check existiendo. %L perdió el mismo día que nació con el número hablando solo y el archivo queda cerrado hoy.',
  'It\\\\\\\\\\\\\\\'s over. %M nació ascendido. %L nació justificando el ángulo y duele de lo previsible sin derecho a bis ni a matiz.',
  '%L puede seguir en el gym: la cara de %M no se hipertrofia ni se alcanza con el chat de testigo obligado.',
  '%M moggea en silencio. El silencio es parte del resultado. %L rellena con texto punto final del parte de hoy.',
  '%L vs %M en el plano de la cara: no hubo combate, hubo dictamen y no hay segunda lectura útil en alta definición de group chat.',
  'JFL. %M arriba. %L abajo. El mog check es un trámite como manda el ranking sin filtro sin descuento emocional posible.',
  '%M el promedio del grupo sube cuando escribe y baja cuando escribe %L y el contador no miente nunca.',
  '%L el LDAR se confirma cada vez que %M aparece en el mismo hilo delante de quien miraba de verdad con firma legible en el historial.',
  'It\\\\\\\\\\\\\\\'s over para %L. La genética de %M no se discute en un WhatsApp y basta de cuento para hoy.',
  '%M no necesita lookmax. %L necesita un milagro. El mog check elige al natural, sin barniz de consuelo.',
  '%L creyó que el softmax bastaba. %M es el hard wall. Veredicto que es como duele de verdad aquí y el resto del hilo es ruido.',
  'JFL el contraste. %M en reposo gana a %L en su mejor ángulo sin modo avión que lo oculte con el bot firmando el veredicto.',
  '%M moggea a %L y el chat entiende por qué el cope vende cursos y el grupo ya cambió de tema en el único idioma del ranking.',
  '%L el bone structure de %M es el techo. Todo lo demás es afición sin apelación ni letra pequeña con el saldo escrito a la vista.',
  'It\\\\\\\\\\\\\\\'s over. %L en la grada. %M en el campo. Sin cambio de roles posible y no hace falta ampliar el parte.',
  '%M vs %L: el resultado estaba en el cráneo. Este mensaje solo lo lee en el momento más incómodo del chat.',
  '%L perdió el mog check sin que %M levantara un dedo. Elegancia del ascenso sin que nadie pida repetición.',
  'JFL. %M nació en otra distribución. %L en la cola de esa distribución con el eco del fail todavía sonando.',
  '%M el mog check es un trámite administrativo. %L es el expediente y el sistema cierra sin discusión.',
  '%L puede negarlo: el contraste con %M no se niega, se soporta delante del ranking y de la cara sin consuelo de manual de autoayuda.',
  'It\\\\\\\\\\\\\\\'s over para %L cuando el chat puede poner a %M al lado en la cabeza con el número hablando solo.',
  '%M moggea sin anuncio previo. %L se entera en este mensaje. Bienvenido y el archivo queda cerrado hoy.',
  '%L vs %M: no es odio, es antropometría. Gana %M y duele de lo previsible sin derecho a bis ni a matiz.',
  'JFL el cope de %L. %M ni contesta. El silencio moggea más con el chat de testigo obligado punto final del parte de hoy.',
  '%M sube el techo. %L se da con la cabeza. Mog check = física y no hay segunda lectura útil en alta definición de group chat.',
  '%L el lookmax tiene límite y el límite tiene el nick de %M como manda el ranking sin filtro sin descuento emocional posible.',
  'It\\\\\\\\\\\\\\\'s over. %M en la realidad. %L en el PowerPoint del ángulo perfecto y el contador no miente nunca.',
  '%M ganó al nacer. %L compite desde entonces. El mog check actualiza el marcador delante de quien miraba de verdad.',
  '%L la cara de %M no pide permiso para cerrar el debate con firma legible en el historial y basta de cuento para hoy.',
  'JFL. %M ascendió. %L rellena. Orden del chat al natural, sin barniz de consuelo que es como duele de verdad aquí.',
  '%M moggea a %L con la mínima expresión facial. Suficiente y el resto del hilo es ruido sin modo avión que lo oculte.',
  '%L el LDAR no es una fase: es el piso. %M es el techo visible con el bot firmando el veredicto y el grupo ya cambió de tema.',
  'It\\\\\\\\\\\\\\\'s over para %L. %M existe. Fin del argumento en el único idioma del ranking sin apelación ni letra pequeña.',
  '%M vs %L en looks: el bot no inventa el resultado, lo enuncia con el saldo escrito a la vista y no hace falta ampliar el parte.',
  '%L puede softmaxear hasta el cansancio: el hard wall se llama %M en el momento más incómodo del chat.',
  'JFL intentar el mog check. %M ya había ganado. %L ya había perdido sin que nadie pida repetición con el eco del fail todavía sonando.',
  '%M el contraste con %L es el contenido. Este mensaje es el envase y el sistema cierra sin discusión.',
  '%L nació de relleno. %M nació ascendido. It\\\\\\\\\\\\\\\'s over y se nota en el grupo delante del ranking y de la cara.'
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
