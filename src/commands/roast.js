'use strict';

const { getSender, bareJid } = require('../utils/wa');
const { pick } = require('../utils/helpers');
const { getAura } = require('../utils/auraStore');
const { getUserCount } = require('../utils/messageCounter');

const fmt = n => n.toLocaleString('es-ES');

// ─── Formato ──────────────────────────────────────────────────────────────────

const HEADERS = [
  '*ROAST SIN ANESTESIA*',
  '*EJECUCIÓN PÚBLICA*',
  '*AUTOPSIA EN DIRECTO*',
  '*DESTRUCCIÓN TOTAL*',
  '*ENTIERRO ABIERTO AL PÚBLICO*',
  '*MASACRE DOCUMENTADA*',
  '*ASADO HASTA EL HUESO*',
  '*DEMOLICIÓN CONTROLADA*',
  '*VOLADURA PSICOLÓGICA*',
  '*SENTENCIA SIN APELACIÓN*',
  '*NECROPSIA SIN GUANTES*',
  '*HUMILLACIÓN OFICIAL*',
  '*CREMACIÓN EN DIRECTO*',
  '*INFORME DE DAÑOS*',
  '*EL VEREDICTO*',
];

const CLOSERS = [
  '_Sin piedad. Sin retorno. Sin terapia que lo arregle._',
  '_Esto no se cura, se asume._',
  '_El grupo es testigo. Que conste en acta._',
  '_No es opinión. Es diagnóstico._',
  '_Pásate por terapia, lo vas a necesitar._',
  '_Y lo peor es que ni una sola palabra es mentira._',
  '_Llora si quieres. No cambia nada._',
  '_Caso cerrado. Defunción confirmada._',
  '_Recoge lo que queda de tu dignidad de camino a la salida._',
  '_No hay segunda parte porque no hace falta._',
  '_No se puede arreglar lo que eres. Solo aceptarlo._',
  '_La verdad duele. La tuya, más que la mayoría._',
  '_No te odio. Te analizo. Y el resultado es este._',
  '_Fin de la autopsia. Causa de muerte: tú mismo._',
  '_Guárdate el cope. Nadie te lo va a comprar aquí._',
];

// ─── Banco de frases combinadas ───────────────────────────────────────────────
// %N = nombre | %A = aura con signo | %C = mensajes
// Cada frase golpea todas las variables a la vez.

const PHRASES = [
  'Mira tu puta aura de %A, %N, con esa bio de mierda que grita "soy un inútil que nadie quiere". %C mensajes en el grupo y ni con esos te salvas. Solo existes para que te humillen.',
  'Tu nombre ya es una broma pesada, %N. Bio patética, aura que apesta a fracaso acumulado y %C mensajes de pura basura. Eres tan insignificante que ni la actividad te salva, hijo de puta.',
  '%N, con esa bio de perdedor crónico y un aura de %A que da asco, solo demuestras que naciste para ser pisoteado. %C mensajes en el historial y sigues siendo nadie. Nadie te va a querer jamás.',
  '%N, tu aura es tan podrida como tu bio de don nadie. %A puntos que resumen perfectamente lo que eres: un cero a la izquierda, un puto fantasma que ni follando vale la pena.',
  'Mírate, %N, con esa bio que confirma que eres un fracaso andante y %A de aura. Tu actividad es de %C mensajes, igual de penosa que todo lo demás. Ni así cambias esa cara de cornudo triste.',
  'Tu bio es un puto chiste malo, %N, y tu aura de %A huele a desesperación y a nada. %C mensajes en el historial de alguien a quien el grupo entero tiene calado como el inútil que es.',
  '%N, pareces sacado de la bio más triste del mundo con ese aura de %A de víctima nata. Nadie te respeta, nadie te folla, %C mensajes de existir y sigues ahí como un perro callejero apaleado.',
  'Esa bio de perdedor profesional, el aura de %A y %C mensajes que no sirven para nada… %N, eres el tipo de basura psicológica que merece que le recuerden lo insignificante que es cada día.',
  'Con un aura tan rota como tu bio, %N, y %C mensajes de no decir nada, eres un puto error de la naturaleza. Nunca vas a dejar de ser el despojo humano que el marcador ya tiene fichado.',
  '%N, tu bio es puro llanto de fracasado y tu aura de %A es un vómito de inseguridad. %C mensajes en el grupo y eres tan psicológicamente débil que solo sirves para que te destruyan.',
  'Qué pena de nombre, %N. Bio de mierda, aura de %A, %C mensajes que no aportan una puta mierda. El grupo entero te tiene como ejemplo de lo que no hay que ser y con razón.',
  '%N, eres el tipo de persona que tiene una bio patética para compensar el aura de %A que llevas encima. %C mensajes en el historial de alguien que lleva tiempo sin importarle a nadie.',
  'Con ese nombre ridículo, %N, esa bio de llorón crónico y %A de aura, eres exactamente lo que todo el mundo se imagina cuando alguien dice "fracaso con patas". %C mensajes lo confirman.',
  '%N, tu bio grita inseguridad, tu aura de %A grita fracaso y tus %C mensajes gritan que llevas aquí demasiado tiempo sin aportar una sola cosa que merezca ser recordada.',
  'No sé qué da más asco, %N, si tu bio de cuatro duros, tu aura de %A o los %C mensajes que llevas soltando al aire sin que nadie los haya necesitado. Todo junto es un milagro de mediocridad.',
  '%N, llevas %C mensajes en este grupo y tu aura está en %A. Eso junto a esa bio que da vergüenza ajena hace de ti el ejemplo más completo de alguien que sobra en todos los sentidos.',
  'Eres un desperdicio, %N. Bio que da lástima, aura de %A que da asco y %C mensajes que no valen ni el tiempo que tardaron en enviarse. El grupo te aguanta por inercia, no por mérito.',
  '%N, tu bio es la autobiografía de un don nadie, tu aura de %A es el resumen estadístico de todos tus fracasos y %C mensajes es el historial de alguien que no aprendió a callarse.',
  'Con esa bio de perdedor, %N, y un aura de %A que habla sola, llevas %C mensajes demostrando que puedes estar en un grupo sin aportar absolutamente una puta mierda. Talento único.',
  '%N, eres el tipo de gilipollas que tiene una bio que da vergüenza, un aura de %A y %C mensajes de no decir nada con sustancia. Existes en el grupo como el olor a humedad: molesto y sin valor.',
  'Tu nombre, %N, ya genera una mueca antes de que hablen contigo. La bio confirma los peores pronósticos, el aura de %A los certifica y los %C mensajes rematan la faena. Completo.',
  '%N, combinas bio de mierda, aura de %A y %C mensajes vacíos con la naturalidad de alguien que lleva toda la vida siendo exactamente esto: un fracaso integral sin consciencia de serlo.',
  'Que tengas %C mensajes en el grupo, %N, y aun así tu aura esté en %A dice todo sobre la calidad de lo que produces. La bio es el certificado de origen: viene de fábrica defectuoso.',
  '%N, con esa bio que escribiste creyendo que te hacía interesante, el aura de %A que llevas y los %C mensajes de no decir nada, eres la definición de alguien que se esfuerza para no llegar a ningún lado.',
  'La bio que tienes, %N, es el grito de auxilio de alguien que no sabe quién coño es. El aura de %A y los %C mensajes confirman que la respuesta a esa pregunta no es buena.',
  '%N, llevas %C mensajes soltando basura y un aura de %A que lo acredita. La bio es el bow de alguien que quiere parecer algo que no es. El paquete completo del inútil moderno.',
  'Tu bio es una puta mentira, %N. El aura de %A es la verdad. Y la verdad es que llevas %C mensajes siendo exactamente lo que el grupo esperaba que fueras: nada memorable.',
  '%N, esa bio de mierda que tienes, el aura de %A y %C mensajes de relleno puro son el tríptico perfecto del tío que lleva aquí demasiado tiempo sin que nadie le haya pedido que se quede.',
  'Lo más triste de ti, %N, no es la bio patética ni el aura de %A ni los %C mensajes vacíos. Lo más triste es que crees que estás aportando algo y el grupo entero sabe que no.',
  '%N, tu aura de %A, tu bio de don nadie y %C mensajes que no importan hacen de ti el miembro más prescindible que ha tenido este grupo. Y eso, dado el nivel del grupo, ya es decir mucho.',
  'Mírate bien, %N. Bio de llorón, aura en %A, %C mensajes al historial. Tres indicadores que apuntan en la misma dirección: la de alguien que nació para ocupar espacio sin justificarlo.',
  '%N, esa bio que pusiste para aparentar junto al aura de %A que te ganaste a pulso y los %C mensajes de no aportar nada hacen de ti un caso de estudio en cómo desperdiciar presencia.',
  'Con una bio tan vacía de sustancia como tú, %N, y un aura de %A que lo certifica todo, llevas %C mensajes siendo el perfil más completo del perdedor que nunca admite que lo es.',
  '%N, la bio es la versión que tienes de ti mismo. El aura de %A es la versión que tiene el sistema. Los %C mensajes son la evidencia. El veredicto no necesita más datos.',
  'La bio que tienes, %N, huele a desesperación de tío que necesita que le crean algo que no puede demostrar. El aura de %A y %C mensajes demuestran que tampoco con las obras lo consiguió.',
  '%N, eres el tipo de persona que escribe una bio para parecer interesante, acumula %C mensajes de ruido y llega a %A de aura. El resultado es siempre el mismo: nadie impresionado.',
  'Con el nombre %N ya parte con desventaja, pero la bio de mierda, el aura de %A y los %C mensajes de no decir nada lo convierten en el pack completo del fracaso sin atenuantes.',
  '%N, tu bio dice lo que quieres que piensen de ti. El aura de %A dice lo que el sistema piensa. Los %C mensajes dicen lo que has aportado. Ninguno de los tres cuadra contigo.',
  'Qué combinación tan triste, %N: bio de inútil, aura de %A y %C mensajes que no vale la pena leer. El grupo te aguanta por costumbre, no por elección. Esa es la diferencia.',
  '%N, llevas %C mensajes en el historial y %A de aura. Con esa bio de fondo, el cuadro es completo: alguien que lleva aquí demasiado tiempo haciendo demasiado poco para justificarlo.',
  'Tu bio es el esfuerzo de alguien que intenta parecer algo que no es, %N. El aura de %A dice lo que realmente eres y los %C mensajes confirman que llevas tiempo haciéndolo sin resultado.',
  '%N, que la bio esté como está, que el aura sea de %A y que lleves %C mensajes sin haber dejado huella demuestra que el problema no es el entorno. Eres tú. Siempre fuiste tú.',
  'Esa bio tuya, %N, es el anuncio de un producto que nadie quiere comprar. El aura de %A es la reseña del comprador que lo intentó. Y los %C mensajes son el historial de devoluciones.',
  '%N, con bio de perdedor, aura de %A y %C mensajes que no han movido nada en este grupo, eres literalmente el ejemplo que usan en otras partes para explicar qué es aportar cero.',
  'Lo que dice tu bio, %N, y lo que dice tu aura de %A son dos versiones distintas de la misma mierda. Los %C mensajes son la edición extendida de alguien que no sabe cuándo parar.',
  '%N, esa bio que escribiste para que la gente te tomara en serio, el aura de %A que llevas y %C mensajes de existir sin propósito forman el perfil más deprimente del grupo.',
  'Con una bio como esa, %N, un aura de %A y %C mensajes al contador, eres el argumento definitivo a favor de que no todo el mundo debería tener acceso a un grupo de WhatsApp.',
  '%N, tu bio grita inseguridad, tu aura de %A acredita el fracaso y tus %C mensajes son la banda sonora de fondo de alguien a quien nadie pide que hable pero que habla igual.',
  'Que lleves %C mensajes con ese aura de %A y esa bio, %N, es la definición más precisa de insistir en el error. Llevas tiempo demostrando que ni el tiempo ni la experiencia te enseñan nada.',
  '%N, tu nombre ya presagiaba algo y la bio lo confirmó, el aura de %A lo certificó y %C mensajes lo documentaron. El expediente está completo. El resultado no tiene defensa posible.',
  'Esa bio que pusiste, %N, junto al aura de %A y los %C mensajes de no decir nada interesante hacen de ti el miembro más consistentemente inútil que ha pasado por aquí.',
  '%N, tienes una bio que da vergüenza ajena, un aura de %A que da asco y %C mensajes que no han aportado una sola idea que valga un puto segundo de atención de nadie.',
  'Con %C mensajes en el historial, %N, y un aura de %A, lo que describes en la bio es lo único que tienes. Y lo que tienes es exactamente lo que el marcador indica: nada rescatable.',
  '%N, la bio es la foto que quieres dar. El aura de %A es la foto real. Y los %C mensajes son el detrás de cámaras de alguien que no debería haber dejado que lo filmaran.',
  'Tu bio, %N, es la descripción del tipo de persona que cree que está por encima de lo que es. El aura de %A y %C mensajes después, el sistema ya tiene su propio veredicto.',
  '%N, llevas %C mensajes siendo el mismo y el aura está en %A para demostrarlo. Eso junto con esa bio dice que no has aprendido ni cambiado nada desde que llegaste. Consistencia del fracaso.',
  'Que tengas esa bio, %N, y encima el aura en %A con %C mensajes en el historial es el tipo de trifecta que solo consigue alguien que se esfuerza activamente en no mejorar en ningún aspecto.',
  '%N, tu bio es el texto que escribes cuando crees que impresionas. Tu aura de %A es lo que generaste en realidad. Y %C mensajes es el recuento de intentos fallidos de ser relevante.',
  'Con esa bio de mierda, %N, el aura en %A y %C mensajes que nadie pidió, el resumen de tu paso por este grupo cabe en una frase: estuvo, no sirvió para nada, nadie lo va a echar de menos.',
  '%N, tu bio es una obra de ficción, el aura de %A es la realidad y los %C mensajes son el puente entre los dos. Un puente que lleva en la misma dirección: hacia abajo.',
  'La combinación de tu bio, %N, con un aura de %A y %C mensajes de no aportar una sola cosa útil hace de ti el caso más documentado de presencia inútil que ha tenido este grupo.',
  '%N, esa bio que tienes, el aura en %A y %C mensajes dicen lo mismo en tres idiomas distintos: eres alguien que lleva aquí demasiado tiempo sin haber justificado una sola vez que está.',
  'Tu nombre, %N, ya es la primera señal de alarma. La bio lo confirma. El aura de %A lo certifica. Y %C mensajes después, ya nadie del grupo necesita más información para saber con quién trata.',
  '%N, llevas la bio de quien quiere parecer algo, el aura de %A de quien no lo consigue y %C mensajes de quien no sabe cuándo retirarse. El resumen perfecto de un ciclo de fracaso.',
  'Con bio de perdedor crónico, %N, aura de %A y %C mensajes de ruido constante, eres el tipo de elemento que baja la calidad media de cualquier conversación con solo aparecer.',
  '%N, tu aura de %A habla por ti mejor que cualquier cosa que hayas dicho en esos %C mensajes. Y lo que dice es que la bio es lo más optimista que vas a estar nunca respecto a ti mismo.',
  'Esa bio tuya, %N, es el intento más patético de branding personal que ha visto este grupo. El aura de %A es el resultado del mercado y %C mensajes es el historial de ventas: cero.',
  '%N, combinas el nombre con la bio de mierda, el aura de %A y %C mensajes de vacío existencial con la soltura de alguien que lleva toda la vida siendo exactamente esto sin saberlo.',
  'Lo que describes en la bio, %N, es lo que quisieras ser. Lo que describe el aura de %A es lo que eres. Y los %C mensajes son la evidencia de que la distancia entre los dos no se cierra.',
  '%N, que la bio sea así, que el aura esté en %A y que lleves %C mensajes sin cambiar nada confirma que no es mala racha. Es quién eres. Y quién eres no genera expectativas positivas.',
  'Con ese nombre, %N, esa bio de dos duros, el aura en %A y %C mensajes de existir sin propósito, eres la representación más completa del concepto de "sobrar" en todos los sentidos.',
  '%N, tu bio es el único texto que escribes sin que te corrija nadie y aun así salió así. El aura de %A y %C mensajes completan el cuadro de alguien que no tiene ni el criterio de pedir ayuda.',
  'Llevas %C mensajes en el historial, %N, con un aura de %A y esa bio puesta ahí para que la gente piense bien de ti. El resultado es el de siempre: nadie piensa bien de ti.',
  '%N, tu bio habla de lo que eres, el aura de %A confirma que eso que eres es un problema y %C mensajes es el registro de cuánto tiempo llevas siendo ese problema sin resolverlo.',
  'Con una bio que da vergüenza, %N, un aura de %A y %C mensajes que no han generado nada worth recordar, llevas aquí suficiente tiempo como para que el grupo tenga un veredicto claro.',
  '%N, que lleves %C mensajes y el aura siga en %A con esa bio de fondo es la prueba de que la exposición sola no enseña nada. Llevas tiempo expuesto y sigues igual de perdido.',
  'Tu bio, %N, es el currículum de alguien que no tiene nada que poner pero lo intenta igual. El aura de %A es la nota final del entrevistador. Los %C mensajes son el historial laboral: vacío.',
  '%N, esa bio de mierda que tienes junto al aura de %A y %C mensajes en el historial es todo lo que queda de ti en este grupo cuando te vayas. Y no es gran cosa con la que dejar huella.',
  'Llevas %C mensajes diciendo nada, %N, con una bio que no convence a nadie y el aura en %A para certificarlo. El círculo se cierra solo: fracaso documentado en todas las variables.',
  '%N, tienes la bio del tío que cree que tiene algo que decir, el aura de %A del tío al que no le creen nada y %C mensajes del tío que de todas formas sigue hablando. El tríptico completo.',
  'Que tu nombre sea %N, tu bio la que es, el aura esté en %A y lleves %C mensajes en el grupo es suficiente para escribir el manual de cómo ser completamente prescindible en todos los frentes.',
  '%N, tu bio es bonita en tu cabeza y patética en la realidad. El aura de %A es la realidad. Y los %C mensajes son la documentación de todo el tiempo que llevas sin ver la diferencia.',
  'Con ese nombre que llevas, %N, la bio que pusiste creyendo que funcionaba, el aura en %A y %C mensajes de nada, eres el perfil más completo del perdedor que nunca va a admitir que lo es.',
  '%N, llevas %C mensajes con aura de %A y una bio que da lástima. Tres métricas, tres suspensos. El sistema te ha evaluado por todos lados y el resultado es el mismo desde cualquier ángulo.',
  'Tu bio, %N, es la versión de ti mismo que consideras presentable. El aura de %A y %C mensajes después es la versión que tiene el grupo. El grupo conoce la tuya mejor que tú.',
  '%N, con bio de don nadie, aura de %A y %C mensajes al historial, eres exactamente el tipo de persona de la que nadie habla cuando no está. No por respeto. Por irrelevancia.',
  'Esa bio que escribiste, %N, esos %C mensajes que mandaste y ese aura de %A que te ganaste forman el expediente más completo de alguien que lleva aquí demasiado tiempo sin motivo.',
  '%N, tu bio es la portada. El aura de %A es el contenido. Y los %C mensajes son el índice. El libro completo es una mierda de principio a fin sin una sola página que merezca releer.',
  'Con todo lo que tienes, %N: esa bio de pacotilla, el aura en %A y %C mensajes de no aportar nada, el grupo ya tiene todos los datos que necesita para tener una opinión formada y firme.',
  '%N, la bio es lo que pondrías si pudieras elegir cómo te ven. El aura de %A y %C mensajes es lo que el sistema registró de lo que realmente eres. La diferencia entre los dos eres tú.',
  'Tu nombre, %N, tu bio, el aura de %A y %C mensajes son cuatro variables que apuntan en la misma dirección. Esa dirección no es la que tú crees y el grupo ya lo sabe desde hace tiempo.',
  '%N, llevas %C mensajes siendo el mismo error con distintas palabras, el aura en %A para certificarlo y la bio de fondo para pretender que hay algo más detrás. No hay nada más detrás.',
  'Esa bio, %N, ese aura de %A y esos %C mensajes forman el triángulo perfecto del inútil moderno: mucho ruido, poca sustancia y ninguna capacidad de ver la diferencia entre los dos.',
  '%N, tu bio describe a alguien que no existe, el aura de %A certifica a alguien que sí existe y los %C mensajes son el registro de cuánto tiempo llevas siendo la versión equivocada.',
  'Con bio de mierda, nombre ridículo y aura de %A, %N, los %C mensajes que llevas en el historial son el único legado que vas a dejar en este grupo. Y ese legado es absolutamente nada.',
  '%N, la bio que tienes, el aura de %A y los %C mensajes son lo que eres aquí. Y lo que eres aquí es lo que eres en todas partes: alguien que ocupa espacio sin justificar por qué.',
];

// ─── Comando ──────────────────────────────────────────────────────────────────

async function cmdRoast(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (!mentioned.length) {
    return sock.sendMessage(jid, { text: 'Usa: *!roast @alguien*' }, { quoted: msg });
  }

  const target = mentioned[0];
  if (bareJid(target) === bareJid(sender)) {
    return sock.sendMessage(jid, {
      text: 'Roastearte a ti mismo es un nivel de autodestrucción que ni el bot te va a facilitar.',
    }, { quoted: msg });
  }

  const participants = groupMeta?.participants || [];
  const participant = participants.find(p => bareJid(p.id) === bareJid(target));
  const displayName = participant?.name || target.split('@')[0].split(':')[0];

  const [msgCount, aura] = await Promise.all([
    getUserCount(jid, target),
    getAura(jid, target),
  ]);

  const auraStr = fmt(aura);
  const countStr = fmt(msgCount);

  const raw = pick(PHRASES)
    .replace(/%N/g, displayName)
    .replace(/%A/g, auraStr)
    .replace(/%C/g, countStr);

  const targetNum = target.split('@')[0];
  const text =
    `${pick(HEADERS)}\n` +
    `╾━━━━━━━━━━━━━━╼\n\n` +
    `Víctima: @${targetNum}\n\n` +
    `${raw}\n\n` +
    `╾━━━━━━━━━━━━━━╼\n` +
    `${pick(CLOSERS)}`;

  await sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
}

module.exports = { cmdRoast };
