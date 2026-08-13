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
  'It\'s over para %L. Ni siquiera empezó. %M nació ascendido y %L nació de relleno con el resultado ya consumado.',
  'It\'s over. Lo fue desde que %L cargó la genética con la que vino al mundo. %M ni se molesta.',
  'Para %M nunca hizo falta empezar. Para %L nunca empezó ni va a empezar. It\'s over con el grupo de testigo silencioso.',
  'El mog check terminó antes de la primera foto. %M ascendió, %L lleva LDAR de fábrica sin segunda oportunidad hoy.',
  '%M está en la realidad. %L está en la negación. It\'s over y todos lo ven menos %L sin recurso ni nota al pie.',
  'JFL mirar a %L competir con %M. Es ver a un normie discutirle a un Gigachad. Patético. sin prórroga ni VAR.',
  '%L creyó que tenía oportunidad. Primer error. Segundo: nacer con esa cara. %M ni sudó delante del listón que no saltaste.',
  '%M moggea a %L sin esfuerzo. El bone structure no se debate: se acepta o se llora sin segunda oportunidad hoy.',
  '%L intentó el lookmax y se topó con %M. El techo de cristal tenía nombre sin barniz de relato heroico.',
  'It\'s over para %L: %M existe en el mismo chat y eso basta para el veredicto sin segunda lectura que lo arregle.',
  '%M sube el promedio del grupo. %L lo baja. El mog check solo lo hace visible y basta el dato del ranking.',
  '%L no perdió el mog check hoy: lo perdió el día del parto. %M firma el acta y el grupo ya pasó de página.',
  'JFL la cara de %L al lado de %M. El contraste no necesita filtro en el segundo más incómodo del chat.',
  '%M moggea en silencio. %L rellena el silencio con cope. It\'s over sin letra pequeña que lo salve.',
  '%L vs %M en looks: no fue combate, fue demostración. Ganó quien ya había ganado y el hilo no pide amplificación.',
  'El ascenso de %M y el LDAR de %L en la misma frase. El chat no necesita más datos y no hay modo de suavizarlo.',
  '%M no pidió el mog check: el universo lo organizó. %L pagó la entrada y basta el dato del ranking y el archivo no admite recurso.',
  'It\'s over. %L puede lookmaxear en paz: el techo se llama %M sin anestesia de verdad esta vez.',
  '%L creyó que el ángulo salvaría. %M no necesita ángulo. Veredicto cerrado sin apelación posible hoy.',
  'JFL intentar competir. %M en el podio genético, %L en la grada del cope sin filtro de autoayuda sin que nadie pida replay.',
  '%M moggea a %L con la cara en reposo. El esfuerzo cero es parte del insulto delante del público que no pidió entrada.',
  '%L el bone structure no se discute con mensajes. %M tampoco lo discute: lo exhibe delante del hueco que quedó.',
  'It\'s over para %L desde el primer frame. %M solo apareció para confirmar sin que nadie pida replay.',
  '%M sube el estándar del chat. %L lo sostiene en el suelo. Mog check resuelto sin maquillaje ni segunda toma.',
  '%L perdió el mog check antes de escribir. %M ganó antes de mirar con el dígito firmando solo sin segunda lectura que lo arregle.',
  'JFL la simetría de %L al lado de %M. El bot solo pone palabras al contraste delante del hueco que quedó.',
  '%M no suda el mog. %L suda el cope. Distribución natural delante del listón que no saltaste sin segunda lectura que lo arregle.',
  '%L vs %M: el ranking de looks no admite recurso. %M arriba, %L abajo y el sistema cierra sin discusión.',
  'It\'s over. %L puede seguir en el gym: la cara no se press bancaea. %M lo sabe sin modo avión ni silencio cómplice.',
  '%M moggea sin anuncio. %L se entera por este mensaje. Bienvenido al LDAR en el momento que más dolía soltarlo.',
  '%L el lookmax tiene un techo y el techo tiene el nick de %M con el veredicto seco del bot con el eco todavía en el grupo.',
  'JFL el cope de %L. %M ni se inmuta. It\'s over y se nota sin filtro de autoayuda sin anestesia de verdad esta vez.',
  '%M en la realidad genética. %L en la fase de \'me captó mal la luz\'. Over.',
  '%L no compite con %M: adorna el contraste. El mog check lo deja por escrito sin descuento por empatía.',
  '%M ganó el mog check de la forma más cruel: existiendo al lado de %L sin consuelo de manual barato sin consuelo de consola.',
  'It\'s over para %L. El bone structure de %M no negocia sin anestesia de verdad esta vez.',
  '%L intentó el frame. %M no necesita frame. Veredicto en una foto mental delante del listón que no saltaste.',
  'JFL mirar el podio. %M arriba sin esfuerzo. %L abajo con discurso delante de quien aún leía el hilo.',
  '%M moggea a %L y el chat aprende otra vez por qué el cope existe y el historial no olvida con el bot como notario del fallo.',
  '%L el LDAR no se cura con filtro. %M es la prueba ambulante sin modo avión ni silencio cómplice con testigos obligados en el hilo.',
  'It\'s over. %M nació en otra liga. %L juega en la de relleno sin segunda lectura que lo arregle.',
  '%M no pidió permiso para moggear a %L: la genética no pide permiso y el contador insiste con el dígito firmando solo.',
  '%L vs %M en cara: el resultado estaba escrito en el cráneo de ambos con el parte firmado debajo sin prórroga ni VAR.',
  'JFL el intento de %L. %M en modo reposo sigue ganando y el veredicto no se negocia y el veredicto no se negocia.',
  '%M sube el promedio. %L es el lastre. Mog check = aritmética facial con el parte firmado debajo con testigos obligados en el hilo.',
  '%L puede lookmaxear el cuerpo: la cara ya firmó el contrato del LDAR. %M testigo sin derecho a matiz útil.',
  'It\'s over para %L cuando %M está en el mismo plano. Punto y no hay modo de suavizarlo.',
  '%M moggea sin sudar. %L suda la explicación. Distribución natural del chat y el sistema marca el punto final.',
  '%L el contraste con %M no necesita zoom: se ve a simple vista sin cuento que lo tape delante de quien no quería verlo.',
  'JFL. %M ascendió. %L nació de relleno. El mog check solo lo dice en voz alta delante de quien aún leía el hilo.',
  '%M vs %L: no fue pelea de looks, fue exposición. Ganó quien ya había ganado al nacer en el recuento que no perdona.',
  '%L creyó en el ángulo heroico. %M no tiene ángulo malo. It\'s over sin recurso ni nota al pie.',
  '%M el bone structure habla. %L el cope responde. Gana el hueso sin prosa que lo maquille delante del marcador en vivo.',
  'It\'s over. %L en LDAR permanente mientras %M exista en el grupo sin barniz de relato heroico.',
  '%L perdió el mog check en el primer segundo. %M ni abrió el cronómetro sin maquillaje ni segunda toma.',
  'JFL la genética de %L al lado de %M. El bot no inventa: documenta sin cuento que lo tape y el archivo no admite recurso.',
  '%M moggea a %L con la cara en neutrales. El esfuerzo cero es el insulto con la firma legible del comando.',
  '%L el techo del lookmax tiene nombre: %M con el veredicto seco del bot con el saldo a la intemperie.',
  '%M no debate looks con %L: el debate sería insultar la inteligencia del chat sin maquillaje ni segunda toma.',
  'It\'s over para %L. %M es la prueba de que el cope tiene fecha de caducidad sin maquillaje ni segunda toma.',
  '%L vs %M: el ranking facial no se apela. Se acepta o se llora en privado con el dígito como única defensa.',
  '%M subió el estándar. %L se quedó bajo el estándar. Mog check cerrado con el eco todavía en el grupo.',
  'JFL intentar. %M en el podio. %L en el cope. Orden natural con el dígito como única defensa delante del ranking y de la cara.',
  '%L el frame no salva un LDAR de fábrica. %M es el espejo cruel con el chat enterado del cargo y el veredicto no se negocia.',
  '%M ganó el mog check existiendo. %L perdió el mismo día que nació sin barniz de relato heroico en el recuento que no perdona.',
  'It\'s over. %M nació ascendido. %L nació justificando el ángulo y el hilo sigue sin ti en el centro.',
  '%L puede seguir en el gym: la cara de %M no se hipertrofia ni se alcanza delante del público que no pidió entrada.',
  '%M moggea en silencio. El silencio es parte del resultado. %L rellena con texto y no hace falta ampliar el parte.',
  '%L vs %M en el plano de la cara: no hubo combate, hubo dictamen y el sistema no regala puntos y el veredicto no se negocia.',
  'JFL. %M arriba. %L abajo. El mog check es un trámite sin maquillaje ni segunda toma y el archivo queda cerrado.',
  '%M el promedio del grupo sube cuando escribe y baja cuando escribe %L y el veredicto no se negocia con el dígito firmando solo.',
  '%L el LDAR se confirma cada vez que %M aparece en el mismo hilo en el único idioma que entiende el contador.',
  'It\'s over para %L. La genética de %M no se discute en un WhatsApp sin recurso ni nota al pie.',
  '%M no necesita lookmax. %L necesita un milagro. El mog check elige sin descuento por empatía y el veredicto no se negocia.',
  '%L creyó que el softmax bastaba. %M es el hard wall. Veredicto sin derecho a matiz útil sin bis ni matiz de consuelo.',
  'JFL el contraste. %M en reposo gana a %L en su mejor ángulo delante de la evidencia del contador en el idioma seco del ranking.',
  '%M moggea a %L y el chat entiende por qué el cope vende cursos con el fallo en 4K de chat y el chat archiva sin debate.',
  '%L el bone structure de %M es el techo. Todo lo demás es afición y el ranking cierra el caso y el sistema no regala puntos.',
  'It\'s over. %L en la grada. %M en el campo. Sin cambio de roles posible en la foto fija del ranking.',
  '%M vs %L: el resultado estaba en el cráneo. Este mensaje solo lo lee y el veredicto no se negocia con el fail todavía caliente.',
  '%L perdió el mog check sin que %M levantara un dedo. Elegancia del ascenso con el saldo a la intemperie.',
  'JFL. %M nació en otra distribución. %L en la cola de esa distribución sin cuento que lo tape y el chat archiva sin debate.',
  '%M el mog check es un trámite administrativo. %L es el expediente con el chat enterado del cargo en el momento que más dolía soltarlo.',
  '%L puede negarlo: el contraste con %M no se niega, se soporta y no hace falta ampliar el parte delante de todo el que miraba.',
  'It\'s over para %L cuando el chat puede poner a %M al lado en la cabeza delante del hueco que quedó.',
  '%M moggea sin anuncio previo. %L se entera en este mensaje. Bienvenido con el grupo de testigo silencioso.',
  '%L vs %M: no es odio, es antropometría. Gana %M y no hace falta ampliar el parte delante del ranking y de la cara.',
  'JFL el cope de %L. %M ni contesta. El silencio moggea más en la foto fija del ranking y el ranking no pide permiso.',
  '%M sube el techo. %L se da con la cabeza. Mog check = física delante de todo el que miraba sin recurso ni nota al pie.',
  '%L el lookmax tiene límite y el límite tiene el nick de %M en el idioma seco del ranking en el parte que nadie borra.',
  'It\'s over. %M en la realidad. %L en el PowerPoint del ángulo perfecto con el parte firmado debajo.',
  '%M ganó al nacer. %L compite desde entonces. El mog check actualiza el marcador y el sistema marca el punto final.',
  '%L la cara de %M no pide permiso para cerrar el debate delante de quien aún leía el hilo y el sistema no regala puntos.',
  'JFL. %M ascendió. %L rellena. Orden del chat sin maquillaje ni segunda toma en el segundo más incómodo del chat.',
  '%M moggea a %L con la mínima expresión facial. Suficiente con el veredicto seco del bot con el dígito firmando solo.',
  '%L el LDAR no es una fase: es el piso. %M es el techo visible con el fallo en 4K de chat y el ranking cierra el caso.',
  'It\'s over para %L. %M existe. Fin del argumento y no hay modo de suavizarlo y el ranking cierra el caso.',
  '%M vs %L en looks: el bot no inventa el resultado, lo enuncia delante del hueco que quedó y el chat archiva sin debate.',
  '%L puede softmaxear hasta el cansancio: el hard wall se llama %M y el contador no discute delante de la evidencia del contador.',
  'JFL intentar el mog check. %M ya había ganado. %L ya había perdido en alta resolución de group chat.',
  '%M el contraste con %L es el contenido. Este mensaje es el envase en el segundo más incómodo del chat.',
  '%L nació de relleno. %M nació ascendido. It\'s over y se nota en el grupo con el grupo de testigo silencioso.'
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
