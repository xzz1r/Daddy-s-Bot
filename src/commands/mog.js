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
  'It\\\'s over para %L. Ni siquiera empezó. %M nació ascendido y %L nació de relleno., joder y duele de lo previsible.',
  'It\\\'s over. Lo fue desde que %L cargó la genética con la que vino al mundo. %M ni se molesta., mierda.',
  'Para %M nunca hizo falta empezar. Para %L nunca empezó ni va a empezar. It\\\'s over., coño con el chat de testigo.',
  'El mog check terminó antes de la primera foto. %M ascendió, %L lleva LDAR de fábrica., cabrón punto final del parte.',
  '%M está en la realidad. %L está en la negación. It\\\'s over y todos lo ven menos %L., gilipollas y no hay segunda lectura.',
  'JFL mirar a %L competir con %M. Es ver a un normie discutirle a un Gigachad. Patético., patético en alta definición.',
  '%L creyó que tenía oportunidad. Primer error. Segundo: nacer con esa cara. %M ni sudó., ridículo como manda el ranking.',
  '%M moggea a %L sin esfuerzo. El bone structure no se debate: se acepta o se llora., basura sin descuento emocional.',
  '%L intentó el lookmax y se topó con %M. El techo de cristal tenía nombre., desperdicio y el contador no miente.',
  'It\\\'s over para %L: %M existe en el mismo chat y eso basta para el veredicto., asco delante de quien miraba.',
  '%M sube el promedio del grupo. %L lo baja. El mog check solo lo hace visible., cutre con firma legible.',
  '%L no perdió el mog check hoy: lo perdió el día del parto. %M firma el acta., pringado y basta de cuento.',
  'JFL la cara de %L al lado de %M. El contraste no necesita filtro., fracasado al natural, sin filtro.',
  '%M moggea en silencio. %L rellena el silencio con cope. It\\\'s over., joder que es como duele de verdad.',
  '%L vs %M en looks: no fue combate, fue demostración. Ganó quien ya había ganado., mierda y el resto es ruido.',
  'El ascenso de %M y el LDAR de %L en la misma frase. El chat no necesita más datos., coño y duele de lo previsible.',
  '%M no pidió el mog check: el universo lo organizó. %L pagó la entrada., cabrón sin derecho a bis.',
  'It\\\'s over. %L puede lookmaxear en paz: el techo se llama %M., gilipollas con el chat de testigo.',
  '%L creyó que el ángulo salvaría. %M no necesita ángulo. Veredicto cerrado., patético punto final del parte.',
  'JFL intentar competir. %M en el podio genético, %L en la grada del cope., ridículo y no hay segunda lectura.',
  '%M moggea a %L con la cara en reposo. El esfuerzo cero es parte del insulto., basura en alta definición.',
  '%L el bone structure no se discute con mensajes. %M tampoco lo discute: lo exhibe., desperdicio como manda el ranking.',
  'It\\\'s over para %L desde el primer frame. %M solo apareció para confirmar., asco sin descuento emocional.',
  '%M sube el estándar del chat. %L lo sostiene en el suelo. Mog check resuelto., cutre y el contador no miente.',
  '%L perdió el mog check antes de escribir. %M ganó antes de mirar., pringado delante de quien miraba.',
  'JFL la simetría de %L al lado de %M. El bot solo pone palabras al contraste., fracasado con firma legible.',
  '%M no suda el mog. %L suda el cope. Distribución natural., joder y basta de cuento.',
  '%L vs %M: el ranking de looks no admite recurso. %M arriba, %L abajo., mierda al natural, sin filtro.',
  'It\\\'s over. %L puede seguir en el gym: la cara no se press bancaea. %M lo sabe., coño que es como duele de verdad.',
  '%M moggea sin anuncio. %L se entera por este mensaje. Bienvenido al LDAR., cabrón y el resto es ruido.',
  '%L el lookmax tiene un techo y el techo tiene el nick de %M., gilipollas y duele de lo previsible.',
  'JFL el cope de %L. %M ni se inmuta. It\\\'s over y se nota., patético sin derecho a bis.',
  '%M en la realidad genética. %L en la fase de \\\'me captó mal la luz\\\'. Over., ridículo con el chat de testigo.',
  '%L no compite con %M: adorna el contraste. El mog check lo deja por escrito., basura punto final del parte.',
  '%M ganó el mog check de la forma más cruel: existiendo al lado de %L., desperdicio y no hay segunda lectura.',
  'It\\\'s over para %L. El bone structure de %M no negocia., asco en alta definición.',
  '%L intentó el frame. %M no necesita frame. Veredicto en una foto mental., cutre como manda el ranking.',
  'JFL mirar el podio. %M arriba sin esfuerzo. %L abajo con discurso., pringado sin descuento emocional.',
  '%M moggea a %L y el chat aprende otra vez por qué el cope existe., fracasado y el contador no miente.',
  '%L el LDAR no se cura con filtro. %M es la prueba ambulante., joder delante de quien miraba.',
  'It\\\'s over. %M nació en otra liga. %L juega en la de relleno., mierda con firma legible.',
  '%M no pidió permiso para moggear a %L: la genética no pide permiso., coño y basta de cuento.',
  '%L vs %M en cara: el resultado estaba escrito en el cráneo de ambos., cabrón al natural, sin filtro.',
  'JFL el intento de %L. %M en modo reposo sigue ganando., gilipollas que es como duele de verdad.',
  '%M sube el promedio. %L es el lastre. Mog check = aritmética facial., patético y el resto es ruido.',
  '%L puede lookmaxear el cuerpo: la cara ya firmó el contrato del LDAR. %M testigo., ridículo y duele de lo previsible.',
  'It\\\'s over para %L cuando %M está en el mismo plano. Punto., basura sin derecho a bis.',
  '%M moggea sin sudar. %L suda la explicación. Distribución natural del chat., desperdicio con el chat de testigo.',
  '%L el contraste con %M no necesita zoom: se ve a simple vista., asco punto final del parte.',
  'JFL. %M ascendió. %L nació de relleno. El mog check solo lo dice en voz alta., cutre y no hay segunda lectura.',
  '%M vs %L: no fue pelea de looks, fue exposición. Ganó quien ya había ganado al nacer., pringado en alta definición.',
  '%L creyó en el ángulo heroico. %M no tiene ángulo malo. It\\\'s over., fracasado como manda el ranking.',
  '%M el bone structure habla. %L el cope responde. Gana el hueso., joder sin descuento emocional.',
  'It\\\'s over. %L en LDAR permanente mientras %M exista en el grupo., mierda y el contador no miente.',
  '%L perdió el mog check en el primer segundo. %M ni abrió el cronómetro., coño delante de quien miraba.',
  'JFL la genética de %L al lado de %M. El bot no inventa: documenta., cabrón con firma legible.',
  '%M moggea a %L con la cara en neutrales. El esfuerzo cero es el insulto., gilipollas y basta de cuento.',
  '%L el techo del lookmax tiene nombre: %M., patético al natural, sin filtro.',
  '%M no debate looks con %L: el debate sería insultar la inteligencia del chat., ridículo que es como duele de verdad.',
  'It\\\'s over para %L. %M es la prueba de que el cope tiene fecha de caducidad., basura y el resto es ruido.',
  '%L vs %M: el ranking facial no se apela. Se acepta o se llora en privado., desperdicio y duele de lo previsible.',
  '%M subió el estándar. %L se quedó bajo el estándar. Mog check cerrado., asco sin derecho a bis.',
  'JFL intentar. %M en el podio. %L en el cope. Orden natural., cutre con el chat de testigo.',
  '%L el frame no salva un LDAR de fábrica. %M es el espejo cruel., pringado punto final del parte.',
  '%M ganó el mog check existiendo. %L perdió el mismo día que nació., fracasado y no hay segunda lectura.',
  'It\\\'s over. %M nació ascendido. %L nació justificando el ángulo., joder en alta definición.',
  '%L puede seguir en el gym: la cara de %M no se hipertrofia ni se alcanza., mierda como manda el ranking.',
  '%M moggea en silencio. El silencio es parte del resultado. %L rellena con texto., coño sin descuento emocional.',
  '%L vs %M en el plano de la cara: no hubo combate, hubo dictamen., cabrón y el contador no miente.',
  'JFL. %M arriba. %L abajo. El mog check es un trámite., gilipollas delante de quien miraba.',
  '%M el promedio del grupo sube cuando escribe y baja cuando escribe %L., patético con firma legible.',
  '%L el LDAR se confirma cada vez que %M aparece en el mismo hilo., ridículo y basta de cuento.',
  'It\\\'s over para %L. La genética de %M no se discute en un WhatsApp., basura al natural, sin filtro.',
  '%M no necesita lookmax. %L necesita un milagro. El mog check elige., desperdicio que es como duele de verdad.',
  '%L creyó que el softmax bastaba. %M es el hard wall. Veredicto., asco y el resto es ruido.',
  'JFL el contraste. %M en reposo gana a %L en su mejor ángulo., cutre y duele de lo previsible.',
  '%M moggea a %L y el chat entiende por qué el cope vende cursos., pringado sin derecho a bis.',
  '%L el bone structure de %M es el techo. Todo lo demás es afición., fracasado con el chat de testigo.',
  'It\\\'s over. %L en la grada. %M en el campo. Sin cambio de roles posible., joder punto final del parte.',
  '%M vs %L: el resultado estaba en el cráneo. Este mensaje solo lo lee., mierda y no hay segunda lectura.',
  '%L perdió el mog check sin que %M levantara un dedo. Elegancia del ascenso., coño en alta definición.',
  'JFL. %M nació en otra distribución. %L en la cola de esa distribución., cabrón como manda el ranking.',
  '%M el mog check es un trámite administrativo. %L es el expediente., gilipollas sin descuento emocional.',
  '%L puede negarlo: el contraste con %M no se niega, se soporta., patético y el contador no miente.',
  'It\\\'s over para %L cuando el chat puede poner a %M al lado en la cabeza., ridículo delante de quien miraba.',
  '%M moggea sin anuncio previo. %L se entera en este mensaje. Bienvenido., basura con firma legible.',
  '%L vs %M: no es odio, es antropometría. Gana %M., desperdicio y basta de cuento.',
  'JFL el cope de %L. %M ni contesta. El silencio moggea más., asco al natural, sin filtro.',
  '%M sube el techo. %L se da con la cabeza. Mog check = física., cutre que es como duele de verdad.',
  '%L el lookmax tiene límite y el límite tiene el nick de %M., pringado y el resto es ruido.',
  'It\\\'s over. %M en la realidad. %L en el PowerPoint del ángulo perfecto., fracasado y duele de lo previsible.',
  '%M ganó al nacer. %L compite desde entonces. El mog check actualiza el marcador., joder sin derecho a bis.',
  '%L la cara de %M no pide permiso para cerrar el debate., mierda con el chat de testigo.',
  'JFL. %M ascendió. %L rellena. Orden del chat., coño punto final del parte.',
  '%M moggea a %L con la mínima expresión facial. Suficiente., cabrón y no hay segunda lectura.',
  '%L el LDAR no es una fase: es el piso. %M es el techo visible., gilipollas en alta definición.',
  'It\\\'s over para %L. %M existe. Fin del argumento., patético como manda el ranking.',
  '%M vs %L en looks: el bot no inventa el resultado, lo enuncia., ridículo sin descuento emocional.',
  '%L puede softmaxear hasta el cansancio: el hard wall se llama %M., basura y el contador no miente.',
  'JFL intentar el mog check. %M ya había ganado. %L ya había perdido., desperdicio delante de quien miraba.',
  '%M el contraste con %L es el contenido. Este mensaje es el envase., asco con firma legible.',
  '%L nació de relleno. %M nació ascendido. It\\\'s over y se nota en el grupo., cutre y basta de cuento.'
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
