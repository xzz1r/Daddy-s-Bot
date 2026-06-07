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

// ═══════════════════════════════════════════════════════════════════════════════
// FRASES COMBINADAS — atacan nombre + bio + aura + actividad a la vez
// COMBINED_INACTIVE: para usuarios con < 150 mensajes (mencionan inactividad)
// COMBINED_ACTIVE: para usuarios con >= 150 mensajes (sin insultar la actividad)
// ═══════════════════════════════════════════════════════════════════════════════

const COMBINED_INACTIVE = [
  'Mírate, %N, con esa bio de perdedor que parece escrita por un virgen de treinta años que aún vive con su mamá. Tu aura apesta a fracaso y a pajas frustradas, y ni activo eres. Solo un fantasma de mierda que nadie quiere cerca.',
  '%N, tu aura es tan oscura y podrida que hasta el diablo te diría que tú estás peor que él. Bio de perdedor, nombre de cornudo y una presencia tan nula que ni los mosquitos te hacen caso. Puto inútil.',
  'Con esa bio que grita "soy un fracaso con patas" y un aura que es pura depresión barata, %N, eres el error que nadie corrige porque ya no merece el esfuerzo. Ni activo eres. Solo existes por inercia y das pena.',
  '%N, pareces el hijo secreto de un condón roto y una mala decisión. Tu bio grita abandono, tu aura apesta a semen seco y decepciones, y encima ni escribes nada. Un desperdicio humano con patas.',
  'Tu aura apesta a frustración sexual acumulada de años, %N. Esa bio ridícula de don nadie y tu inactividad de cadáver digital confirman que naciste para ser el chiste que nadie quiere contar en ningún grupo.',
  '%N, tu nombre ya es una broma pesada, tu bio la confirma y tu aura la certifica. Que encima ni escribas nada es la última pieza del puzzle que dibuja al inútil más completo que ha pasado por este grupo.',
  'Con un aura tan rota como tu bio y una actividad de muerto sin enterrar, %N, eres un error de la naturaleza. Bio de perdedor profesional, presencia de fantasma de mierda. El pack completo sin ningún atenuante posible.',
  '%N, tu bio es más triste que tu vida sexual, que es absolutamente nula. Tu aura lo confirma con números y tu silencio en el grupo remata la faena. Tres frentes perdidos al mismo tiempo. Consistencia del fracasado nato.',
  'Con esa bio que huele a frustración acumulada de años, %N, y un aura que apesta a pajas mentales y derrota total, no escribes nada porque ya sabes que todo lo que digas solo añade contexto al ridículo que ya eres, puto.',
  '%N, eres tan patético que hasta tu aura tiene depresión. Bio de mierda, nombre de fracasado y una presencia tan nula que el grupo no sabe si estás o no, y la respuesta no cambia nada para absolutamente nadie.',
  'Qué pena de nombre, %N. Bio de mierda, aura podrida y cero mensajes en el grupo. El trifecta del inútil moderno, completo y documentado para que todo el grupo lo vea sin necesidad de buscar más pruebas.',
  '%N, eres el tipo que tiene una bio patética para compensar el aura de mierda que lleva encima. Y aun así no escribes nada porque el silencio es lo único que te protege del ridículo absoluto que te mereces, cabrón.',
  'Con ese nombre de cornudo, %N, esa bio que da vergüenza ajena y ese aura podrida, eres exactamente lo que todo el mundo imagina cuando alguien dice "fracaso con patas y sin una puta excusa". Y ni activo eres.',
  '%N, tu bio grita inseguridad, tu aura grita fracaso crónico y tu silencio en el grupo confirma que ya sabes que no tienes nada que aportar. El triple reconocimiento del don nadie sin solución ni remedio posible.',
  'No sé qué da más asco, %N, si tu bio de cuatro duros, tu aura de perdedor o el silencio constante de alguien que lleva aquí sin dejar una sola marca que justifique el espacio que ocupa en la lista.',
  '%N, llevas aquí el tiempo suficiente para haber dicho algo y no lo hiciste. Con esa bio y ese aura podrida, al menos el silencio es coherente con lo que eres. Lo más inteligente que has hecho desde que llegaste.',
  'Eres un desperdicio humano, %N. Bio que da lástima, aura que apesta a fracaso acumulado y presencia de fantasma de mierda. El grupo te aguanta por inercia pura, no porque hayas justificado tu existencia aquí.',
  '%N, tu bio es la autobiografía de un don nadie sin lectores, tu aura es el balance de todos tus fracasos y tu silencio es el historial de alguien que ni siquiera aprendió a callarse con algo de dignidad. Un desastre completo.',
  'Con esa bio de perdedor crónico, %N, y un aura que habla sola de lo que eres, no escribes nada porque cada cosa que dijeras solo añadiría contexto al asco que el grupo ya siente cuando ve tu nombre.',
  '%N, eres el gilipollas que tiene una bio que da vergüenza, un aura de mierda y la desfachatez de seguir en el grupo sin aportar absolutamente nada. Existes como el olor a humedad: molesto, sin valor y sin remedio.',
  'Tu nombre, %N, genera una mueca antes de que nadie hable contigo. La bio confirma los peores pronósticos, el aura los certifica y la ausencia total de actividad remata la faena. Perfecto en todos los sentidos malos.',
  '%N, combinas bio de mierda, aura de perdedor y presencia de fantasma con la naturalidad de alguien que lleva toda la vida siendo exactamente esto sin enterarse nunca. El fracasado inconsciente en estado puro.',
  'Lo que describes en la bio, %N, es lo que quisieras ser. Lo que describe el aura es lo que eres de verdad. Y el silencio en el historial es la distancia entre los dos: un abismo que no se cierra con nada.',
  '%N, que la bio sea así, que el aura esté donde está y que no hayas escrito nada relevante confirma que no es mala racha. Es quien eres. Y quien eres no genera una expectativa positiva en ningún ser humano del grupo.',
  'Con ese nombre, %N, esa bio de mierda y el aura por el suelo, eres la representación más completa del concepto de "sobrar en todos los sentidos posibles" sin tener ni la más mínima idea de ello.',
  '%N, tu bio es el único texto que escribiste voluntariamente y aun así salió así de mal. El aura lo acredita y la falta de actividad confirma que tampoco en el grupo tienes nada que ofrecer. El pack del inútil total.',
  'La bio que tienes, %N, es el grito de socorro de alguien que no sabe quién coño es. El aura confirma que la respuesta no es buena, y el silencio lo certifica sin ninguna necesidad de más palabras.',
  '%N, llevas aquí sin decir nada con una bio puesta para que la gente piense algo mínimamente bueno de ti. El aura dice lo que el grupo piensa de verdad. El resultado es siempre el mismo: nada.',
  'Lo más triste de ti, %N, no es la bio patética ni el aura de mierda ni la inactividad de fantasma. Lo más triste es que crees que aportas algo y el grupo entero lleva tiempo sabiendo que no. Nadie te lo dice por lástima.',
  '%N, con bio de don nadie, aura rota y cero presencia real, eres el miembro más prescindible que ha tenido este grupo. Y eso, dado el nivel del grupo, ya es decir mucho y tiene su mérito específico.',
];

const COMBINED_ACTIVE = [
  'Mírate, %N, con esa bio de perdedor que parece escrita por un virgen eterno que lleva años sin que nadie le haga caso. Tu aura huele a frustración sexual acumulada y escribes mucho, pero lo que dices solo confirma lo que la bio ya anunciaba.',
  '%N, tu aura es tan oscura y podrida que hasta el diablo se daría la vuelta al verte. Bio de perdedor, nombre de cornudo, y ni toda la actividad del mundo te va a lavar la imagen que el grupo tiene de ti. Cabrón.',
  'Con esa bio que grita "soy un fracaso con patas" y un aura que apesta a pajas mentales acumuladas, %N, eres el fraude que habla mucho y aporta nada. Mucho ruido, cero impacto, ninguna huella real.',
  '%N, tu aura es tan negra y podrida como tu bio de don nadie. Un puto fraude que escribe mucho, aporta poco y se cree más de lo que el marcador y el grupo confirman cada día sin excepción.',
  'Con esa bio que confirma que eres un fracaso con patas, %N, tu aura grita "soy un perdedor" y no hay un solo mensaje tuyo que haya cambiado esa percepción. Mucho ruido, ninguna huella. Consistente en lo peor.',
  'Tu bio es un chiste malo, %N, y tu aura apesta a desesperación barata. Escribes y escribes y sigues siendo lo mismo que cuando no escribías: un nadie con nombre y sin nada más que ofrecer.',
  '%N, pareces sacado de la bio más triste del mundo con ese aura de víctima nata. Nadie te respeta, nadie te toma en serio, y sigues mandando mensajes como si eso fuera a cambiar algo sobre lo que eres.',
  'Esa bio de perdedor profesional combinada con tu aura de mierda, %N, hacen de ti el tipo de basura psicológica que merece que le recuerden lo insignificante que es cada vez que abre la boca. Puto.',
  'Con un aura tan rota como tu bio, %N, eres un error de la naturaleza. Puedes escribir todo lo que quieras en este grupo, que el marcador y la bio ya dijeron todo lo relevante sobre ti.',
  '%N, tu bio es puro llanto de fracasado y tu aura es un vómito de inseguridad. Eres tan predecible que el grupo entero te tiene calado desde el primer mensaje que mandaste aquí. Nada te salva.',
  'Qué pena de nombre, %N. Bio de mierda y aura podrida. El grupo entero te tiene como ejemplo de lo que no hay que ser, y tiene toda la razón del mundo con esa clasificación sin necesitar discutirla.',
  '%N, eres el tipo que tiene una bio patética para compensar el aura de mierda que lleva encima. Y encima hablas como si alguien te hubiera pedido que participaras. Nadie te pidió nada, gilipollas.',
  'Con ese nombre de cornudo, %N, esa bio de llorón crónico y ese aura que da vergüenza ajena, eres exactamente lo que todo el mundo imagina cuando alguien dice "fracaso con autoestima intacta e incongruente".',
  '%N, tu bio grita inseguridad y tu aura grita fracaso crónico. Puedes mandar todos los mensajes que quieras, que lo que grita el marcador es más fuerte que cualquier cosa que hayas dicho aquí.',
  'No sé qué da más asco, %N, si tu bio de cuatro duros o tu aura de perdedor. Todo junto, con lo que produces en el grupo, es un milagro de mediocridad sostenida y documentada sin ningún esfuerzo.',
  '%N, llevas tiempo aquí sin haber dejado una sola huella que merezca recordarse. Con esa bio y ese aura de mierda, al menos la cantidad de mensajes da material para confirmar el diagnóstico que ya teníamos.',
  'Eres un desperdicio humano, %N. Bio que da lástima y aura que da asco. El grupo te aguanta porque ya está acostumbrado a tu existencia, no porque hayas aportado nada que justifique seguir.',
  '%N, tu bio es la autobiografía de un don nadie y tu aura es el resumen estadístico de todos tus fracasos. El grupo lleva tiempo leyendo ambas cosas y la opinión es unánime y sin ninguna fisura.',
  'Con esa bio de perdedor, %N, y un aura que habla sola de lo que eres, cada mensaje que mandas solo añade contexto al retrato que el grupo ya tiene de ti. Y no es un retrato que a nadie le guste tener.',
  '%N, eres el gilipollas que tiene una bio que da vergüenza y un aura de mierda, y aun así sigue mandando mensajes como si alguien estuviera esperando lo que tiene que decir. Nadie espera nada tuyo, puto.',
  'Tu nombre, %N, ya genera una mueca antes de que hablen contigo. La bio confirma los peores pronósticos y el aura los certifica. Lo que produces en el grupo solo añade más evidencia a un caso ya cerrado.',
  '%N, combinas bio de mierda, aura de perdedor y una presencia que no ha cambiado nada desde que llegaste. Lo mismo de siempre, en todos los indicadores, en la misma dirección: abajo sin freno.',
  'La bio que tienes, %N, es el grito de socorro de alguien que no sabe quién coño es. El aura confirma que la respuesta no es buena. Y el historial de mensajes confirma que tampoco lo estás mejorando.',
  '%N, que la bio sea así y que el aura esté donde está confirma que no es mala racha. Es quién eres. Y quién eres genera la misma reacción en el grupo desde el primer día: mueca, silencio e ignorar.',
  'Con ese nombre, %N, esa bio de dos duros y el aura en el suelo, eres la representación más completa del concepto de "presencia inútil" en todos los sentidos observables y sin ninguna excusa.',
  '%N, tu bio es una promesa que el producto no cumple. La pusiste pensando que te dejaba bien y lo único que dice es que no tienes ni idea de cómo te ve el resto del mundo. Publicidad engañosa.',
  'Lo más triste de ti, %N, no es la bio patética ni el aura de mierda. Lo más triste es que llevas tiempo participando creyendo que aportas algo, y el grupo entero sabe que no. Nadie te lo dice por compasión.',
  '%N, con bio de don nadie y aura rota, eres el miembro más consistentemente mediocre que ha pasado por aquí. No el peor, que eso al menos sería memorable. El más gris. El más nada.',
  'Llevas la bio de quien quiere parecer algo, %N, y el aura de quien no lo consigue. Lo que produces en el grupo es el puente entre los dos: mucho esfuerzo para seguir siendo lo mismo.',
  '%N, tu bio dice lo que quieres que piensen de ti. Tu aura dice lo que el sistema piensa de ti. Lo que produces en el grupo dice lo que el resto piensa de ti. Ninguno cuadra a tu favor.',
];

// ═══════════════════════════════════════════════════════════════════════════════
// FRASES DE VARIABLE ÚNICA — 200 frases, ~50 por variable
// ═══════════════════════════════════════════════════════════════════════════════

// ─── SOLO NOMBRE (%N) — 50 frases ─────────────────────────────────────────────

const NAME_ONLY = [
  '%N. El nombre que alguien eligió para ti con ilusión y que lleva años siendo lo más memorable que vas a producir en tu puta vida.',
  'Con el nombre %N ya se sabe todo: de dónde vienes, qué nivel de criterio había en casa el día que te pusieron eso, y por qué llevas años compensando algo que ni tú sabes nombrar.',
  '%N. Suena exactamente a lo que eres: algo que prometía sobre el papel y que en la realidad no cerró ni un solo trato. Decepción con nombre propio y sin posibilidad de devolución.',
  'Te llamas %N y cada vez que alguien lo pronuncia hay una décima de segundo de silencio antes de responder. Esa pausa es el veredicto completo sin necesitar más palabras.',
  'El nombre %N no abre puertas. Las cierra desde fuera. Anuncia al portero quién llega y el portero ya decidió antes de que llegues que esta noche no entras.',
  'Que te llames %N ya dice mucho, y lo que dice no es bueno para ti. El nombre llega antes que tú y prepara el terreno en la dirección equivocada cada vez.',
  'Te pusieron %N y la genética remató la faena. Pack completo de mala suerte sin posibilidad de reembolso, garantía ni segunda oportunidad de ningún tipo.',
  '%N es el tipo de nombre que en una entrevista genera una pausa incómoda. No de respeto. De pena ajena anticipada por lo que viene después del nombre.',
  'Con %N de nombre partes ya con lastre. Y lo único que cargaste después fue más lastre. El peso acumulado a estas alturas ya es olímpico y sin ningún récord positivo.',
  'El nombre %N lleva pegado un contexto social que la gente lee en medio segundo y archiva en la carpeta de "ni me molesto". Tú no lo ves porque lo cargas desde siempre y ya te acostumbraste.',
  'Te bautizaron %N con toda la esperanza del mundo. El tiempo se encargó de demostrar que la esperanza era lo único que había en esa habitación el día que decidieron el nombre.',
  '%N suena a personaje secundario que muere en el primer capítulo sin que nadie lo eche de menos ni mencione en el resumen del episodio siguiente.',
  'Llevas el nombre %N con la misma elegancia con la que te lo pusieron: ninguna. Improvisado, mal pensado y condenado desde el minuto cero sin que nadie lo viera venir.',
  'El día que te pusieron %N firmaron tu condena a ser uno más del montón. Y por una vez en tu familia, acertaron de pleno con el pronóstico a largo plazo.',
  'Te llamas %N y eso es lo más interesante que vas a aportar en toda la conversación. Y ni siquiera es interesante. Solo es lo único que hay disponible para comentar.',
  'Con el nombre %N tienes dos opciones: hacerlo irrelevante con lo que construyes, o confirmarlo con lo que eres. Llevas años eligiendo la segunda sin dudarlo ni un segundo.',
  '%N. Hasta tu nombre suena cansado de pertenecerte. Como si supiera perfectamente lo que viene después de él y ya hubiera asumido las consecuencias de existir pegado a ti.',
  'El nombre %N lo llevan personas muy distintas. En ti queda como una etiqueta en un producto caducado: inútil, que no le queda bien, y que nadie quiere mirar demasiado tiempo.',
  'Pusieron %N en el acta y nadie se preguntó si le estaban jodiendo la vida al crío. Spoiler: se la jodieron. Y tú eres la prueba andante de esa decisión irresponsable.',
  'Con el nombre %N y cero historia detrás, eres literalmente un campo de texto vacío con patas. Rellenable por cualquiera, recordado por absolutamente nadie en ningún contexto.',
  'Te llamas %N porque alguien lo decidió sin pensar en las consecuencias. Ese patrón de no pensar en las consecuencias lo llevas replicando en cada área de tu vida desde entonces.',
  'El nombre %N en voz alta genera una reacción inmediata. La cara que pone la gente cuando huele algo que prefiere no investigar más a fondo.',
  '%N es el nombre que las madres gritan por la ventana sin que nadie en el bloque levante la cabeza. Tú tampoco la levantas. Al menos en eso hay coherencia perfecta.',
  'Nadie elige su nombre, vale. Pero sí elige qué construir después. Te tocó %N y en el segundo capítulo, el que sí dependía de ti, tampoco hay una mierda que rescatar.',
  'Te llamas %N y el grupo lleva tiempo sin saber cómo decirte que el nombre es lo de menos a estas alturas del desastre general que representas.',
  '%N es el nombre con el que vas a morirte sin haber hecho nada que lo justifique. Coherencia de libro, aunque no el tipo de libro que nadie quiere leer ni recomendar a nadie.',
  'El nombre %N no tiene fuerza, no tiene peso, no abre ninguna sala. Es el nombre perfecto para alguien que tampoco abre ninguna sala ni cambia nada en ningún sitio.',
  'Con %N de nombre y el perfil que llevas, la única pregunta razonable es cómo coño llegaste aquí y no cuándo te vas. Nadie invitó el nombre, nadie invitó lo que viene con él.',
  'Te llamaron %N y desde entonces has estado demostrando que el nombre fue lo más memorable que iba a salir de ti. Lo demás nunca llegó a ningún lado ni a ninguna persona.',
  '%N. Las letras que sean. Cada vez que alguien las pronuncia son los segundos más neutros del día. Nada sube, nada baja. El vacío con un nombre encima.',
  'Con el nombre %N te presentas y la gente toma nota mentalmente de seguir la conversación con cuidado. No por respeto. Por el tipo de señales que ese nombre ya carga consigo.',
  'Te pusieron %N y esperaban algo. Lo que salió eres tú. El abismo entre la expectativa y la realidad ya tiene nombre y es el tuyo, lo que añade una capa extra de ironía gratuita.',
  '%N suena a alguien que siempre llega tarde, siempre tiene una excusa y siempre se va antes de recoger. Describe al personaje antes de conocerlo. Y el personaje no decepciona en ningún sentido.',
  'El nombre %N existirá en el historial de este grupo mucho después de que hayas dejado de aportar algo. Que eso ya haya ocurrido lo hace aún más irónico de lo que ya es.',
  'Con %N de nombre podrías haber sido muchas cosas. La suma de las decisiones posteriores dice que elegiste no ser ninguna de ellas. Libertad de elección mal usada desde el principio.',
  '%N es el nombre que aparece en una lista y al que nadie mira dos veces. El equivalente nominal de estar de fondo en una foto que nadie va a ampliar ni guardar en ninguna parte.',
  'Te llaman %N y tú respondes. Eso es lo máximo que el nombre ha conseguido hasta la fecha: que reacciones a él. Por lo demás, el historial de logros asociados está completamente vacío.',
  'El nombre %N fue una elección. Todo lo que vino después también. La calidad de ambas cosas es idéntica: pésima en todos los frentes y consistente en la dirección equivocada.',
  '%N. El nombre que llevas y la persona que eres son coherentes de una forma que no es un cumplido para ninguno de los dos implicados en el paquete.',
  'Con %N te presentas y la gente asiente, toma nota y dos minutos después no recuerda si te llamabas así o de otra manera igual de irrelevante y olvidable.',
  'El nombre %N lo eligieron por ti. Todo lo demás lo elegiste tú, y el nivel de criterio es el mismo en ambos casos: ninguno visible ni defendible ante nadie.',
  'Llevas el nombre %N como se lleva la ropa del hermano mayor: heredado, que no te queda bien, pero que no tienes otra cosa y ya te acostumbraste a fingir que sí encaja.',
  'El nombre %N tiene unas connotaciones que arrastras como mochila de plomo. Y encima la rellenas más cada día con cada decisión que tomas en cualquier dirección posible.',
  'Te pusieron %N con toda la ilusión del mundo y mira cómo salió la inversión. El retorno ha sido tan malo que ni siquiera da rabia. Solo una pena difusa y sin fin aparente.',
  '%N es exactamente el nombre que pondría alguien que no pensó en las consecuencias a largo plazo. Esa falta de previsión es hereditaria y en ti se nota en cada área de tu vida.',
  'Cuando dicen %N en voz alta en este grupo hay un momento de pausa que no es admiración. Es el tipo de pausa que se hace antes de elegir con cuidado las palabras que vienen después.',
  'El nombre %N tiene tan poco peso que la gente te confunde con cualquier otro. En el cambio nadie sale perdiendo porque los dos son igual de intercambiables e irrelevantes.',
  '%N: el nombre, la persona, el marcador. Todo en la misma dirección, todo en el mismo tono, todo igualmente olvidable en todos los contextos posibles sin excepción.',
  'Te llamas %N. Es una información objetiva. Lo que viene después es subjetivo, personal y, en tu caso, difícil de defender públicamente ante cualquier persona razonable.',
  'El nombre %N pasará por este grupo como pasas tú: sin dejar marca, sin que nadie pregunte qué fue de él, sin que nadie lo recuerde cuando ya no esté. Adiós sin adiós.',
];

// ─── SOLO BIO VACÍA — 25 frases ────────────────────────────────────────────────

const BIO_EMPTY = [
  'Sin bio. El único espacio del planeta donde decides cómo quieres que te vean y lo dejaste en blanco. Eso no es misterio, es que no hay una sola cosa dentro de ti que merezca una puta frase, gilipollas.',
  'Bio vacía. Ni una palabra, ni un emoji de relleno, ni un intento miserable. El único sitio donde nadie te juzga por lo que pones y aun así conseguiste decir nada. Récord absoluto de vacío existencial.',
  'La bio en blanco no es minimalismo ni estética. Es la confirmación de que cuando te paras a pensar en ti mismo, sin prisa ni presión, no encuentras una mierda que valga la pena compartir con nadie.',
  'Sin bio porque rellenarla te obligaría a decidir quién coño eres. Y eso requiere ser algo. El blanco lo grita más fuerte que cualquier frase: aquí no vive nadie. El perfil de un vacío con número de teléfono.',
  'Tienes el campo de descripción ahí, gratis, infinito, sin nadie juzgándote, y lo dejaste vacío. El autorretrato más honesto que has hecho en tu vida: la nada absoluta con tu nombre encima.',
  'Ni una sola palabra en la bio. El único texto que produces sin que nadie te lo exija ni te corrija, y el resultado es el vacío total. Coherente con todo lo demás que produces en la vida, cabrón.',
  'Bio en blanco. Lo que ve la gente cuando te busca es un perfil que anuncia en silencio absoluto que detrás no hay nada que merezca espacio en ningún servidor del mundo.',
  'La descripción vacía dice exactamente lo mismo que dices tú cuando hablas: nada que se quede, nada que importe, nada que nadie vaya a recordar ni cinco minutos después de haberlo oído.',
  'Sin bio porque para tenerla hay que tener algo que decir. Para tener algo que decir hay que ser algo. Cadena lógica que en tu caso se rompe en el primer eslabón sin ningún remedio.',
  'Dejaste la bio en blanco y sin querer hiciste la obra de arte más sincera del grupo: el retrato perfecto de un vacío con conexión a internet y sin nada que ofrecer a nadie.',
  'Sin descripción. Ni siquiera te molestaste en mentir sobre ti mismo, que es lo mínimo que hace la gente con algo de amor propio. Tú ni para el mínimo das. Impresionante a su manera, puto.',
  'La bio vacía es tu forma de avisar al mundo de que no hay nada que ver aquí. Por una vez en tu vida, comunicaste algo con total claridad y sin margen para la interpretación.',
  'No pusiste bio porque poner algo implicaría reconocer que hay un "tú" sobre el que escribir. Y ambos sabemos que esa es una afirmación bastante generosa dadas las circunstancias actuales.',
  'Cero caracteres en la descripción. Hasta los bots de spam ponen algo. Quedaste por debajo del nivel de esfuerzo de un programa automático sin alma ni propósito. Eso es un logro en negativo.',
  'Bio en blanco: el equivalente a presentarte a una entrevista y quedarte mirando la pared cuando te dicen "háblame de ti". No tienes nada y se nota a kilómetros antes de abrir la boca, cabrón.',
  'La bio vacía no es una elección estética, es una rendición. No encontraste nada que decir de ti mismo y en lugar de inventarte algo, te resignaste al blanco. La más honesta de tus decisiones.',
  'Ni una mierda en la descripción. El espacio donde la gente normal pone algo —lo que sea— tú lo dejaste vacío porque no hay nada y llevas tiempo sabiéndolo sin decírselo a nadie.',
  'El campo de bio lleva vacío el tiempo suficiente para que sea intencional. Intención de no decir nada porque decir algo significaría que hay algo que decir. Y no lo hay. Ni de coña.',
  'La bio vacía y tú lleváis tanto tiempo juntos que ya sois inseparables. Ninguno de los dos tiene contenido y los dos están en el mismo perfil. Simetría perfecta del vacío existencial.',
  'Sin bio. Para cuando decidas que tienes algo que decir de ti mismo, el grupo ya habrá tomado su decisión sobre ti. Ya la tomó. Y el blanco confirmó cada una de las sospechas que había.',
  'El blanco de tu bio habla más claro que cualquier cosa que hayas dicho aquí. Dice: no tengo nada, no soy nada, y al menos en eso soy completamente honesto con el mundo entero.',
  'No tienes bio porque si la tuvieras la gente tendría más material para juzgarte. Sin ella solo te juzgan por lo que ven. Y lo que ven ya es suficiente para tenerlo todo clarísimo.',
  'La descripción vacía es lo más interesante de todo tu perfil, y es literalmente la ausencia de información. La nada como contenido estrella de un perfil de mierda. Piénsalo, si puedes.',
  'Sin bio. No la necesitas para que la gente sepa lo que eres. El historial, el comportamiento y el marcador de aura lo dicen todo sin que escribas una sola letra. Ya está todo dicho.',
  'Tu bio está en blanco como declaración inconsciente: no me defino porque no sé cómo hacerlo sin hundirme aún más. Por una vez en tu vida, tuviste un instante de autoconsciencia acertada.',
];

// ─── SOLO BIO CON CONTENIDO (%N) — 25 frases ──────────────────────────────────

const BIO_FULL = [
  '%N, la bio es el único texto que escribes tú solo, con tiempo infinito, para que la gente te vea como quieres. Y aun así salió esa mierda. Imagina lo que produces cuando hay algo de presión de por medio.',
  'Lo que pusiste en la descripción, %N, lo pusiste creyendo que decía algo bueno de ti. El grupo ya lo leyó. Lo único que dice es que no tienes ni idea de cómo te ve el resto del mundo, cabrón.',
  '%N, redactaste tu propia presentación al universo con toda la calma del planeta y llegaste a eso. Ese es el techo absoluto de tu criterio operando sin restricciones. Da auténtico miedo y vergüenza ajena.',
  'Tu bio es branding personal de saldo, %N. Conseguiste lo imposible: que un texto pensado para impresionar comunique exactamente lo contrario de lo que pretendías. Talento invertido en la peor dirección.',
  '%N, tu descripción dice más de ti de lo que crees. No por lo que escribiste, sino porque pensaste que eso te dejaba bien. Esa desconexión con la realidad es tu rasgo más constante y más visible.',
  'Pusiste esa frasecita en la bio para que la gente pensara bien de ti, %N. Lo tienen clarísimo, sí, pero no es ni de lejos lo que calculabas cuando lo escribiste. Tiro por la culata monumental.',
  '%N, la descripción del perfil es el único texto completamente tuyo, sin presión. Y el resultado está ahí, expuesto, para que todo el que te busque sepa de antemano el nivel con el que trata.',
  'Tienes una bio, %N, porque crees de verdad que te define bien. El grupo la leyó hace tiempo, hizo una mueca y siguió con su vida. Esa mueca es tu único legado documentado por voluntad propia.',
  '%N, lo que escribiste en la bio en tu cabeza sonaba a algo profundo. Fuera de tu cabeza, en el mundo real donde vivimos los demás, suena a exactamente lo que eres. No es un cumplido.',
  'Tu bio es la primera impresión que controlas al cien por cien, %N. Con toda esa ventaja servida en bandeja, aun así salió así de mal. Las impresiones que no controlas deben ser un desastre total.',
  '%N, esa cita que pusiste en la bio para parecer interesante confirma que necesitas frases ajenas porque tú no produces ni una idea propia que aguante en pie más de cinco minutos.',
  'Tu descripción, %N, es el clásico intento de venderte como algo que no eres. El problema es que el producto está delante y nadie se cree el anuncio. Publicidad engañosa sin multa todavía.',
  '%N, leí tu bio. La leí dos veces por si me había perdido algo. No me había perdido nada. Estaba todo ahí, y todo era una decepción perfectamente redactada y voluntariamente publicada.',
  'Tu descripción tiene el tono de alguien que se cree mucho más interesante de lo que el mundo ha verificado empíricamente, %N. Ese delirio es lo único grande que tienes documentado.',
  '%N, la bio que tienes es un currículum de cosas que crees ser. La realidad lleva años presentando un informe contradictorio, más fiable y con mucho más respaldo que lo que pusiste ahí.',
  'Escribiste esa bio para destacar, %N, y lo único que destaca es la distancia entre cómo te ves y cómo eres. Esa brecha cabría este grupo entero dentro con espacio de sobra a los lados.',
  '%N, tu bio grita "miradme, soy especial" y el grupo responde con el silencio más educado que ha producido nunca. Hay cosas que ni por compasión se comentan en voz alta.',
  'Redactaste tu descripción con la confianza de un genio, %N, y el resultado de alguien que nunca ha recibido un feedback honesto en su vida. Aquí lo tienes, gratis y sin adornos.',
  'Tu bio es la prueba de que tener tiempo, espacio y libertad total no sirve de nada si lo que hay dentro para expresar es esto, %N. Recursos absolutamente desperdiciados en la peor inversión.',
  '%N, la descripción que pusiste dice exactamente lo que no querías que dijera: que te importa mucho lo que piensen de ti y que no tienes nada real con lo que trabajar para conseguirlo.',
  'Lo que pusiste en la bio, %N, lo pusiste porque en ese momento te pareció que te representaba bien. Ese momento de autoconciencia fue el pico más alto de tu carrera. Ya es mucho, cabrón.',
  'Tu bio tiene ese tono de alguien que necesita que le crean algo que no puede demostrar con hechos, %N. Si pudiera demostrarlo con hechos no haría falta ponerlo en la descripción del perfil.',
  '%N, escribiste la bio y quedaste satisfecho con el resultado. Ese momento de satisfacción dice más de tu nivel de exigencia que cualquier otra cosa que hayas hecho aquí.',
  'La bio que tienes, %N, es el mejor argumento que tienes para presentarte. Y el mejor argumento es esto. Eso resume bien el estado de la situación y el material disponible actualmente.',
  '%N, tu bio es una promesa. El problema es que el producto que entregan después no cumple ningún apartado de esa promesa. Fraude al consumidor con foto de perfil y sin garantía posible.',
];

// ─── SOLO AURA (%N + %A) — tiered por valor ────────────────────────────────────

function getAuraPhrases(aura) {
  const n = '%N', a = fmt(aura);

  if (aura < -10000) {
    return [
      `${a} de aura, %N. Una cifra tan podrida que ya no es mala racha, es tu puta personalidad con número de serie. El certificado oficial de un fracaso sostenido con una constancia que debería estudiarse.`,
      `%N tiene ${a} de aura y el grupo entero lo ve. Eso no es un número, es un certificado de defunción social firmado por el sistema después de registrar cada decisión tuya sin piedad.`,
      `${a} puntos, %N. El sótano tenía otro sótano y lo encontraste solo, sin ayuda, cavando con las manos. Dedicación al fracaso en estado puro y sin señales de que vayas a parar.`,
      `Con ${a} de aura, %N, llevas un historial que ya nadie necesita analizar. La dirección está clara, el destino también, y nadie finge sorprenderse cuando el marcador sigue bajando.`,
      `%N, ${a} de aura. Tan en rojo que ya no das pena, das un respeto enfermizo por la capacidad de perder sin parar, sin enterarte y sin cambiar nada. Constancia del fracaso elevada a arte.`,
      `${a} de aura, %N. A ese nivel ya no aplica el concepto de mala racha. Tienes un patrón estructural, un rasgo de carácter, un modo de ser que el sistema documenta con precisión quirúrgica.`,
      `%N, ${a} puntos de aura. La cifra que obtiene alguien que toma consistentemente las peores decisiones disponibles con la coherencia de un algoritmo programado para autodestruirse.`,
      `Con ${a} de aura llevas el título de campeón de lo peor, %N. Sin competencia, sin empate. Liderazgo absoluto en la única clasificación donde nadie con cordura quiere aparecer.`,
      `${a} de aura, %N. Ese número ya no necesita explicación. Es la suma de todo lo que has sido aquí, expresado en la unidad más honesta posible. El resultado habla solo y sin excusa.`,
      `%N tiene ${a} de aura. Algunos números no sorprenden cuando conoces al portador. Este es uno de esos casos donde el número y la persona encajan a la perfección. Por lo malo.`,
      `${a} puntos de aura, %N. La cifra que confirma que no hay una sola área de este grupo donde hayas dejado algo positivo. Completitud del fracaso. El sistema tomó nota de todo.`,
      `%N, con ${a} de aura el sistema ya no te castiga. Te describe. Con la precisión de alguien que lleva meses registrando cada decisión tuya y devolviendo el resultado sin filtro.`,
      `${a} de aura y sigues aquí, %N. Eso sí tiene mérito: aguantar con ese marcador sin haberte ido. O no tienes vergüenza o no tienes consciencia. Probablemente las dos cosas.`,
      `%N, ${a} puntos. Negativo histórico, de los que se recuerdan. El tipo de número que los demás miran y piensan: cómo coño se llega ahí con tanta consistencia sin hacer nada por evitarlo.`,
      `${a} de aura, %N. El marcador más bajo que ha generado este grupo y el más coherente con el portador. Algunas métricas no mienten, y esta te define mejor que cualquier otra cosa.`,
    ];
  }

  if (aura < 0) {
    return [
      `${a} de aura, %N. En rojo. El veredicto oficial de todo lo que has hecho aquí. No hay lectura alternativa, no hay contexto que lo matice. El número es la sentencia y ya está.`,
      `%N, aura de ${a}. El sistema registró cada decisión y este es el saldo. Sin excusas, sin atenuantes, sin nadie más a quien culpar. Tú solo construiste ese marcador con tus elecciones.`,
      `${a} puntos, %N. Bajo cero. La única dirección que dominas es la que baja, y llevas suficiente tiempo demostrándolo como para que nadie espere ya un giro de guion.`,
      `Con ${a} de aura el historial habla por ti, %N. Y lo que dice es vergonzoso, consistente y difícil de defender ante cualquier persona que no seas tú mismo.`,
      `%N, ${a} de aura. Lo que empezó como mala racha hace tiempo que el grupo llama por su nombre correcto: el resultado lógico de ser quien eres y hacer lo que haces.`,
      `${a} de aura en negativo, %N. El marcador lleva la cuenta de todo y el saldo dice que has estado perdiendo más de lo que ganabas desde mucho antes de que te importara.`,
      `%N, ${a} puntos de aura. Lo que el marcador dice de ti es lo que los datos dicen de ti. Y los datos no te tienen manía, no exageran y no mienten. Solo cuentan lo que hay.`,
      `Con ${a} de aura, %N, llevas el tipo de número que la gente mira y no comenta porque ya no hay nada que añadir que el número no haya dicho ya con más elocuencia.`,
      `${a} de aura y sin señales de que eso vaya a cambiar pronto, %N. El marcador refleja quién eres con una fidelidad que ningún espejo tiene ni va a tener.`,
      `%N, ${a} puntos en negativo. La consistencia es la única virtud que muestras en este grupo, y la estás usando para confirmar que el marcador acertó contigo desde el principio.`,
      `${a} de aura, %N. El número que tienen los que pierden más de lo que ganan, por las razones equivocadas, con una regularidad que ya no sorprende a nadie que te conozca mínimamente.`,
      `%N, ${a} de aura. Negativo, documentado, verificable. El tipo de marcador que ya no genera conversación porque el veredicto es tan claro que no necesita debate adicional.`,
      `${a} puntos, %N. Negativo constante. La constancia es lo único que nadie te puede quitar, y la estás invirtiendo en la única dirección que confirma que el sistema tiene razón sobre ti.`,
      `%N, con ${a} de aura el sistema te está diciendo lo mismo que el grupo piensa pero no dice: que algo no funciona como debería. La diferencia es que el sistema lo dice en voz alta.`,
      `${a} de aura, %N. Ese marcador resume tu trayectoria aquí mejor que cualquier descripción que yo pueda hacer o que tú puedas rebatir con algún argumento disponible.`,
    ];
  }

  if (aura < 5000) {
    return [
      `${a} de aura, %N. En positivo por los pelos. La distancia entre eso y el cero es tan pequeña que cualquier día malo te manda al otro lado, y días malos los tienes con facilidad documentada.`,
      `%N, ${a} puntos de aura. Positivo de chiripa. Eso no es un logro, es sobrevivir raspando. Y sobrevivir raspando en un marcador de aura no es algo de lo que nadie se enorgullece.`,
      `${a} de aura, %N. La cifra que no da orgullo ni vergüenza porque es demasiado mediocre para provocar una sola emoción real en quien la ve. Existes en modo ahorro permanente.`,
      `Con ${a} de aura, %N, llevas el marcador de los que ni caen con estilo. Ni lo bastante bien para que se note, ni lo bastante mal para ser interesante. El gris más aburrido que existe.`,
      `%N, ${a} de aura. Positivo sin convicción ninguna. Un número que resume con precisión el impacto nulo que has tenido aquí desde que llegaste hasta el momento presente.`,
      `${a} puntos, %N. En positivo por menos de lo que cuesta un café. Eso no es estar bien, es no estar en negativo todavía. La diferencia entre los dos es mucho menor de lo que crees.`,
      `%N, ${a} de aura. Casi cero. El tipo de cifra que dice que has estado aquí haciendo cosas sin que ninguna de esas cosas haya sumado algo real al marcador ni al grupo.`,
      `${a} de aura, %N. El número de alguien que no pierde del todo pero tampoco gana nada. El empate perpetuo de quien nunca arriesga nada porque sabe que no tiene material para apostar.`,
      `%N, con ${a} de aura estás técnicamente en positivo. Técnicamente. En la práctica ese número es tan bajo que la diferencia con el cero es casi filosófica y sin consecuencias reales.`,
      `${a} puntos de aura, %N. Positivo de saldo mínimo. El tipo de cifra que en una empresa significaría que estás a punto de cerrar y nadie te lo ha dicho todavía abiertamente.`,
    ];
  }

  // aura >= 5000: suspicious high / mediocre high
  return [
    `${a} de aura, %N. Alto. Sospechosamente alto para alguien como tú. El marcador tiene días raros y este es uno, porque ese número no cuadra con nada de lo que el grupo observa a diario.`,
    `%N, aura de ${a}. Una cifra sin respaldo coherente en la realidad observable. La suerte ciega existe y es lo único que explica que ese número esté pegado a tu nombre sin mérito aparente.`,
    `${a} puntos de aura, %N. Ese número y la persona que lo acumula no encajan en ningún modelo lógico. El sistema falla a veces. Este es un caso con nombre y apellidos concretos.`,
    `%N, con ${a} de aura alguien debería auditar el algoritmo, porque la única alternativa es aceptar que la suerte no premia el mérito. Y tú eres la prueba viviente de esa conclusión.`,
    `${a} de aura, %N. El marcador más generoso que ha producido este grupo con alguien que lo merece tan poco. Ese número existe, está ahí, y no guarda relación con lo observable.`,
    `%N, ${a} puntos de aura que no cuentan la historia completa. Cuentan solo los momentos de suerte. El contexto general, la persona detrás del número, ese ya es otro tema con otro resultado.`,
    `${a} de aura, %N. Sorprendentemente alto. El sistema es justo a largo plazo. A corto plazo tiene anomalías. Eres una anomalía estadísticamente temporal. El equilibrio llegará.`,
    `%N, aura de ${a}. Un número que no cuadra con el perfil. El sistema lo registró, el grupo lo ve, y nadie sabe cómo reconciliar ese marcador con lo que ven cada día de cerca.`,
    `${a} puntos de aura, %N. El marcador dice que eres más de lo que pareces. El grupo dice otra cosa. Entre los dos, uno tiene más información sobre el tema. No es el marcador.`,
    `%N, ${a} de aura. El número que sigue un reloj roto dos veces al día: correcto por accidente, no por diseño. Disfrútalo mientras dura, que los marcadores se corrigen solos.`,
  ];
}

// ─── SOLO ACTIVIDAD (%N + %C) — tiered, solo para inactivos ───────────────────

function getActivityPhrases(count) {
  const c = fmt(count);

  if (count === 0) {
    return [
      'CERO mensajes. Ni uno. Estás en el grupo ocupando plaza, consumiendo lo que otros producen y no has soltado ni una sílaba. No es timidez, %N, es ser un parásito digital con la cara muy dura.',
      'El contador marca cero absoluto, %N. Llevas aquí el tiempo suficiente para que eso ya no dé vergüenza sino asco directo. El fantasma que ni se aparece, solo chupa notificaciones y se larga.',
      'Cero mensajes en el historial, %N. Entras, espías, te vas. El mirón del grupo, el que lo ve todo y no aporta una puta mierda. Nadie te echaría de menos porque nadie ha notado que estás.',
      'Ni un solo mensaje, %N. El grupo no tiene ni una prueba de que existas dentro de él. Un nombre en la lista y nada más. Un cero a la izquierda, literal, estadístico y permanente.',
      'Cero textos, %N. El nivel máximo del gorrón: consumir todo, aportar nada. El que está en cuarenta grupos sin estar en ninguno porque le importa una mierda todo y todos. Se nota.',
      'Cero mensajes y sigues aquí, %N. Eso ya no es discreción ni timidez. Es no tener una sola cosa que decir y no tener la decencia de irse cuando es evidente que no sirves para nada en este espacio.',
      'Sin un solo mensaje tuyo, %N. Llevas aquí tiempo suficiente para haber dicho algo en algún momento. No lo hiciste. Eso no es introversión, es no tener nada que aportar ni ganas de intentarlo.',
      'Cero mensajes confirmados, %N. Eres el tipo de miembro que hace que los grupos parezcan más grandes sin que sean más activos. Bulto de lista. Decoración inútil que ocupa espacio en el chat.',
      'El historial dice cero y el historial no miente nunca, %N. Estás en el grupo como el mueble que nadie pidió pero que tampoco nadie mueve porque da pereza gestionarlo.',
      'Ni una respuesta, ni una pregunta, ni un signo de vida, %N. Cero. Eso es lo que has aportado. Eso es lo que eres en este grupo: un cero con número de teléfono asociado.',
      'Cero mensajes, %N. Has conseguido estar en un grupo de conversación sin conversar nunca. Eso requiere un nivel de pasividad que casi da admiración, si no diera tanto asco antes.',
      'Sin un mensaje, %N. En el grupo pero no en el grupo. Presente en la lista pero ausente en todo lo demás. La forma más inútil de pertenecer a algo, aplicada con coherencia perfecta.',
      'No existe un solo mensaje tuyo registrado, %N. Eso, en un grupo de comunicación, es la forma más sincera de decir que no tienes nada que comunicar. Información recibida y archivada.',
      'Cero textos en el historial, %N. El nivel de aporte de una silla vacía, pero con el añadido de que la silla vacía al menos no ocupa espacio en el chat y no consume las notificaciones.',
      'Cero mensajes y ni se te ve ni se te escucha, %N. El fantasma perfecto: presencia nula, impacto nulo, aportación nula. El trifecta del miembro que sobra en todos los sentidos posibles.',
    ];
  }

  if (count < 20) {
    return [
      `${c} mensajes en TOTAL, %N. Todo lo que has aportado en tu existencia entera aquí cabe en una pantalla sin scroll. Decoración barata que nadie pidió ni pagaría por conservar.`,
      `${c} textos miserables, %N. A ese ritmo el grupo necesita un recordatorio de que sigues vivo. No por cariño, sino para decidir si merece la pena seguir teniéndote en la lista.`,
      `Con ${c} mensajes ocupas una plaza que alguien con algo que decir aprovecharía mejor, %N. Eres el asiento vacío que respira. Sobras y encima molestas al ocupar el hueco.`,
      `${c} mensajes, %N. Esa cifra le grita al grupo lo poco que te importa lo que pasa aquí. Mensaje recibido alto y claro, fantasma de medio pelo que ni siquiera termina de serlo del todo.`,
      `${c} textos en todo el historial, %N. Suficiente para confirmar que existes, insuficiente para que a un solo ser humano le importe si desapareces mañana sin decir nada a nadie.`,
      `${c} mensajes, %N. El tipo de cifra que le dice al grupo todo lo que necesita saber sobre cuánto te importa estar aquí. Que es nada. Y se nota desde el primer registro hasta el último.`,
      `Con ${c} mensajes tienes el historial de alguien que entró por error, se quedó por inercia y nunca encontró motivo para decir nada, %N. El grupo tampoco encontró motivo para pedírtelo.`,
      `${c} textos, %N. Lo que dejas tras de ti cuando no estás es exactamente lo mismo que dejas cuando estás: nada perceptible, nada que cambie nada, nada que nadie eche de menos.`,
      `${c} mensajes en el marcador, %N. El número de alguien que no considera que este grupo merezca su tiempo pero tampoco tiene mejor sitio donde estar. Doble derrota en todos los sentidos.`,
      `Con ${c} mensajes eres estadísticamente el miembro más inútil del grupo, %N. No el más silencioso. El más inútil. Hay diferencia y tú representas ambas categorías simultáneamente.`,
    ];
  }

  if (count < 60) {
    return [
      `${c} mensajes, %N. Presencia de los que lo leen TODO y no aportan NADA. El público mudo que consume el trabajo de los demás y se esconde cuando toca poner algo sobre la mesa.`,
      `Con ${c} mensajes estás en la zona gris de los que están pero no cuentan, %N. No eres del todo fantasma, pero tampoco eres parte de una sola conversación que alguien recuerde mañana.`,
      `${c} textos. Justo por debajo del umbral en el que alguien empieza a importar en un grupo, %N. Sigues siendo un número en la lista, no un participante con peso real en nada.`,
      `${c} mensajes y el grupo sigue sin saber qué pintas aquí, %N. Nadie tiene datos suficientes para opinar de ti porque no los has dado. Un misterio que a nadie le apetece resolver.`,
      `${c} textos, %N: la cantidad exacta para que no te echen por inactivo y para que nadie note si te vas. El equilibrio perfecto de la mediocridad invisible que no deja rastro.`,
      `${c} mensajes, %N. Has estado aquí suficiente tiempo para haber dicho algo relevante en algún momento. No ha pasado. El marcador lo confirma y el grupo lo sabe aunque no lo diga.`,
      `Con ${c} textos enviados llevas el historial de alguien que consume sin producir, que lee sin responder y que existe como los subtítulos: ahí pero sin protagonismo ni peso, %N.`,
      `${c} mensajes, %N. El tipo de actividad que hace que cuando alguien pregunta "¿quién sabe algo de esto?" tu nombre no aparezca en la cabeza de nadie. Nunca. Ni siquiera como opción.`,
      `Con ${c} textos en el historial no eres fantasma pero tampoco eres parte de nada real, %N. El nivel de gris que no da frío ni calor pero que ocupa espacio igualmente y sin aportar nada.`,
      `${c} mensajes, %N. Suficiente para sobrevivir en la lista, insuficiente para que alguien pueda citar una sola cosa tuya que haya servido para algo dentro del grupo en toda su historia.`,
    ];
  }

  // 60-149
  return [
    `${c} mensajes y el grupo sigue sin recordar uno solo que valiera la pena, %N. Cantidad de tibio, calidad de cero. Ni aportas ni callas del todo. El peor combo posible.`,
    `${c} textos enviados sin dejar una sola marca que alguien recuerde mañana, %N. Ruido de fondo con forma de persona y número de teléfono asociado a un nombre sin peso.`,
    `Con ${c} mensajes lograste lo más difícil: hablar sin que nadie te cite, opinar sin convencer a nadie y existir sin que importe, %N. Esfuerzo invertido en producir nada concreto.`,
    `${c} mensajes, %N. Lo justo para no ser fantasma del todo, lo poco para que nadie pueda nombrar una sola cosa tuya que haya cambiado algo en este espacio desde que llegaste.`,
    `${c} textos y tu aportación real al grupo se resume en una palabra, %N: estuviste. Eso es lo que queda de alguien que escribe mucho sin decir nada que valga un segundo de atención.`,
    `${c} mensajes en el historial y cero impacto acumulado, %N. Presencia sin peso. Actividad sin consecuencias. Participación que da exactamente lo mismo si existe o no existe.`,
    `Con ${c} textos llevas suficiente tiempo aquí para haber dicho algo que alguien recordara, %N. No pasó. La oportunidad fue y se fue sin que la aprovecharas ni una sola vez.`,
    `${c} mensajes, %N. Actividad de fondo, sin perfil, sin personalidad reconocible, sin nada que diferencie los tuyos de los de cualquier otra persona igualmente irrelevante en el grupo.`,
    `Con ${c} mensajes estás en la zona donde ya no eres invisible del todo pero tampoco visible, %N. El gris más aburrido: el que existe sin que a nadie le cambie algo que exista o no.`,
    `${c} mensajes en el marcador, %N. Suficiente para estar, insuficiente para contar. La definición exacta de ocupar espacio sin justificarlo con nada concreto en ningún momento.`,
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMANDO
// ═══════════════════════════════════════════════════════════════════════════════

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
      text: 'Roastearte a ti mismo es un nivel de autodestrucción que ni el bot va a facilitar.',
    }, { quoted: msg });
  }

  const participants = groupMeta?.participants || [];
  const participant = participants.find(p =>
    bareJid(p.id) === bareJid(target) ||
    bareJid(p.lid) === bareJid(target) ||
    bareJid(p.phoneNumber) === bareJid(target)
  );
  const targetNum = target.split('@')[0].split(':')[0];
  // Prefer any name field Baileys may have populated. If none exist (common in
  // LID groups where push names aren't bundled with groupMetadata), use the
  // @phonenumber mention notation so WhatsApp renders the real display name.
  const displayName =
    participant?.name ||
    participant?.displayName ||
    participant?.verifiedName ||
    participant?.notify ||
    `@${targetNum}`;

  const [bioResult, msgCount, aura] = await Promise.all([
    sock.fetchStatus(target).catch(() => null),
    getUserCount(jid, target),
    getAura(jid, target),
  ]);

  const bio = bioResult?.status?.trim() || '';
  const isInactive = msgCount < 150;

  // Construir pool según contexto. 40% combinada, 60% variable única.
  // Actividad solo entra si el usuario es inactivo (no se ataca al activo).
  let roastText;
  const useCombined = Math.random() < 0.40;

  if (useCombined) {
    const template = pick(isInactive ? COMBINED_INACTIVE : COMBINED_ACTIVE);
    roastText = template.replace(/%N/g, displayName);
  } else {
    const singleVars = ['name', 'bio', 'aura'];
    if (isInactive) singleVars.push('activity');
    const variable = pick(singleVars);

    switch (variable) {
      case 'name':
        roastText = pick(NAME_ONLY).replace(/%N/g, displayName);
        break;
      case 'bio':
        roastText = bio
          ? pick(BIO_FULL).replace(/%N/g, displayName)
          : pick(BIO_EMPTY);
        break;
      case 'aura': {
        const auraPhrases = getAuraPhrases(aura);
        roastText = pick(auraPhrases)
          .replace(/%N/g, displayName)
          .replace(/%A/g, fmt(aura));
        break;
      }
      case 'activity': {
        const actPhrases = getActivityPhrases(msgCount);
        roastText = pick(actPhrases)
          .replace(/%N/g, displayName)
          .replace(/%C/g, fmt(msgCount));
        break;
      }
    }
  }

  const text =
    `${pick(HEADERS)}\n` +
    `╾━━━━━━━━━━━━━━╼\n\n` +
    `Víctima: @${targetNum}\n\n` +
    `${roastText}\n\n` +
    `╾━━━━━━━━━━━━━━╼\n` +
    `${pick(CLOSERS)}`;

  await sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
}

module.exports = { cmdRoast };
