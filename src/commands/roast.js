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
  'Lo que describes en la bio, %N, es lo que quisieras ser. Tu aura muestra lo que realmente eres. Y no escribir nada confirma que ya lo sabes. Los tres juntos forman el retrato más honesto de un fracasado.',
  '%N, la bio es una mierda, el aura está en el suelo y no has escrito nada relevante. No es mala racha, es quien eres desde siempre. Y quien eres no le interesa a nadie en este grupo ni fuera de él.',
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
  'La bio que tienes, %N, es la versión escrita de alguien que no sabe quién coño es. El aura confirma que la respuesta no es buena. Y lo que mandas al grupo confirma que cada mensaje que escribes lo empeora.',
  '%N, que la bio sea así y que el aura esté donde está confirma que no es mala racha. Es quién eres. Y quién eres genera la misma reacción en el grupo desde el primer día: mueca, silencio e ignorar.',
  'Con ese nombre, %N, esa bio de dos duros y el aura en el suelo, eres la representación más completa del concepto de "presencia inútil" en todos los sentidos observables y sin ninguna excusa.',
  '%N, tu bio es una promesa que el producto no cumple. La pusiste pensando que te dejaba bien y lo único que dice es que no tienes ni idea de cómo te ve el resto del mundo. Publicidad engañosa.',
  'Lo más triste de ti, %N, no es la bio patética ni el aura de mierda. Lo más triste es que llevas tiempo participando creyendo que aportas algo, y el grupo entero sabe que no. Nadie te lo dice por compasión.',
  '%N, con bio de don nadie y aura rota, eres el miembro más consistentemente mediocre que ha pasado por aquí. No el peor, que eso al menos sería memorable. El más gris. El más nada.',
  'Llevas la bio de quien quiere parecer algo, %N, y el aura de quien no lo consigue. Lo que produces en el grupo es el puente entre los dos: mucho esfuerzo para seguir siendo lo mismo.',
  '%N, tu bio dice lo que quieres que piensen de ti. Tu aura dice lo que el sistema piensa de ti. Lo que produces en el grupo dice lo que el resto piensa de ti. Ninguno cuadra a tu favor.',
];

// ═══════════════════════════════════════════════════════════════════════════════
// FRASES DE VARIABLE ÚNICA — ~200 frases, ~50 por variable
// ═══════════════════════════════════════════════════════════════════════════════

// ─── SOLO NOMBRE (%N) — 50 frases ─────────────────────────────────────────────

const NAME_ONLY = [
  '%N. El nombre que gritan cuando llaman a un fracasado de manual. Si hubiera elección te lo cambiabas, pero hasta eso está fuera de tu alcance, puto inútil.',
  'Vaya nombre más mierda, %N. Te lo pusieron pensando en algo y saliste con esto. El abismo entre el plan y el resultado empieza ahí y nunca se cerró. Basura con nombre propio.',
  '%N suena a excusa. A "voy a llegar tarde", a "se me olvidó", a "no pude". El nombre de alguien que nació para fallar y lo ratificó con los años sin necesitar ayuda de nadie, perdedor.',
  'Te llamas %N y ya con eso llevas el historial encima. El grupo leyó el nombre, hizo la mueca de siempre y siguió. Tú ni te enteraste, como el don nadie inconsciente que eres.',
  '%N. Nombre de perdedor, perfil de fracasado, presencia de mierda. La combinación que nadie eligiría pero que te define mejor que cualquier descripción que puedas escribir tú, inútil.',
  'El nombre %N suena a puta derrota desde la primera sílaba. Lo cargas con la resignación de quien lleva tanto tiempo siendo basura que ya no recuerda cómo se siente otra cosa.',
  'Con %N de nombre ya tienes el partido perdido antes de abrir la boca. El nombre llega y cierra puertas antes de que tú llegues a la esquina, puto inútil de manual.',
  '%N, el nombre más mediocre que podían elegir para un producto defectuoso de serie. Coherencia desde el primer paso: mierda de nombre, mierda de persona, mierda de historial.',
  'Llevas el nombre %N como una maldición que ni siquiera merece queja, porque ni eso llegas a generar. Fantasma de mierda con nombre y sin una sola sustancia dentro, perdedor.',
  '%N. Hasta el autocorrector lo marca como error. Sabe lo que el grupo ya sabe: que algo aquí está fundamentalmente mal desde el principio y no tiene arreglo visible.',
  'Con ese nombre, %N, no hacía falta ver nada más. El nombre ya decía quién venía y el grupo tomó nota antes de que dijeras una sola palabra de mierda, basura.',
  'Te pusieron %N con toda la esperanza del mundo. Mira lo que salió. La inversión más catastrófica de la familia, aunque en eso tampoco eres el primero. Puto fracasado.',
  '%N suena a alguien que nunca termina nada, que promete mucho y entrega cero. Si el nombre es la marca personal, tu marca es una mierda sin remedio y sin posibilidad de relanzamiento.',
  'El nombre %N en esta sala equivale a silencio incómodo. Nadie lo asocia a nada bueno, útil ni interesante. El vacío tiene nombre y es el tuyo, inútil confirmado.',
  'Te llamas %N y con eso ya se sabe todo. El tipo de nombre que la gente olvida mientras lo está oyendo. La identidad del perdedor sin identidad, documentada en dos sílabas.',
  '%N es el nombre que merece un fracasado de libro. No lo elegiste, pero sí elegiste lo que viniera después, y en eso el nivel es idéntico: puto desastre sin una sola excusa válida.',
  'Con el nombre %N partes desde debajo del suelo. Y lejos de remontar has encontrado un sótano debajo del sótano donde seguir cayendo. Basura digital en caída libre permanente.',
  '%N. El nombre que nadie salva aunque su portador se lo mereciera. Y tú, encima, no te lo mereces. Doble condena, inútil confirmado sin ningún factor atenuante disponible.',
  'Que te llamen %N ya es una sentencia. Que te llamen %N y encima seas tú es un insulto para el nombre y para cualquier otro %N que haya hecho algo útil con él, perdedor.',
  'El nombre %N funciona como alerta temprana para el grupo: viene alguien que va a aportar cero, va a molestar el doble y se va a ir sin dejar nada. Basura clásica de catálogo.',
  '%N. El nombre que repite el mundo con el mismo tono con el que se dice "de nuevo tú, puto fracasado". Porque eso es lo que anuncia cada vez que aparece en cualquier contexto.',
  'Con %N de nombre el pronóstico era malo desde el primer día. Lo que vino después lo confirmó con datos, con hechos y con el historial que el grupo tiene perfectamente catalogado.',
  'Te llamas %N y eso le dice al grupo en menos de un segundo todo lo que necesita saber sobre ti. No hay segunda vuelta, no hay recuperación posible. El nombre dijo la última palabra, mierda.',
  '%N. El nombre que nadie grita con entusiasmo. Ni en celebración, ni en urgencia, ni siquiera en rabia. Solo suena plano, muerto, como todo lo que llevas asociado a él, perdedor.',
  'El nombre %N lo llevan personas muy distintas. En ti quedó como tatuaje en un cuerpo que no lo merece: permanente, mal puesto, y motivo de vergüenza ajena cada vez que se ve.',
  '%N. Dos sílabas que resumen el error completo. Desde que te lo pusieron hasta este mensaje, el patrón es el mismo: promesa nula, resultado nulo, impacto nulo. Basura con nombre.',
  'Llevas el nombre %N con la indiferencia de alguien que hace tiempo decidió que nada en su vida merecía esfuerzo ni orgullo. En eso al menos eres coherente, puto vago de siempre.',
  '%N suena como lo que es: el nombre de un don nadie que lleva aquí tiempo suficiente para haber demostrado algo y que salió con este resultado. Sin sorpresa ni salvación posible.',
  'Con el nombre %N te presentas y la gente ya tiene una carpeta abierta titulada "inútil". Solo tienes que confirmarla, cosa que haces sin esfuerzo y con una consistencia admirable en lo peor.',
  '%N, el nombre con más historial de fracasos por sílaba de este grupo. Una estadística que nadie te pidió acumular pero que llevas con la constancia del que nació para perder, mierda.',
  'Te llaman %N y respondes. El único reflejo que has entrenado con dedicación: reconocer el nombre y no hacer nada productivo después. Basura de nivel experto sin esfuerzo consciente.',
  'El nombre %N no necesita explicación aquí. El grupo lleva tiempo sabiendo qué viene detrás de esas letras y ninguna actualización reciente ha mejorado el pronóstico, inútil sin remedio.',
  '%N es el nombre de alguien que el mundo catalogó y archivó en la carpeta correcta desde el principio. Que esa carpeta diga "fracasado, basura, perdedor" no es mala suerte. Es precisión estadística.',
  'Con el nombre %N la presentación ya está hecha y no juega a tu favor. Lo que viene después solo acumula evidencia para un caso que el grupo tiene cerrado desde hace tiempo, mierda total.',
  'Te llamas %N y hasta el nombre suena cansado de ti. Como si supiera perfectamente lo que va a tener que soportar cada día y hubiera asumido el fracaso como estado permanente sin esperanza.',
  '%N. La suma de esas letras da como resultado el retrato exacto del don nadie que eres: sin peso, sin presencia, sin ninguna razón real para que alguien te recuerde mañana ni pasado, perdedor.',
  'Con el nombre %N llevas un lastre que no elegiste. Lo que elegiste fue confirmar ese lastre con cada decisión posterior. Libertad de elección puesta al servicio del fracaso, basura.',
  'El nombre %N es lo primero que ves y lo único que se queda. Porque lo que viene después no se queda en nada ni en nadie. El nombre es lo más memorable. Y es una puta mierda.',
  '%N. El tipo de nombre que genera en el oyente la misma emoción que genera tu presencia: ninguna. Neutro hasta la muerte, inútil hasta el final, sin marca real. El don nadie perfecto.',
  'Llevas el nombre %N sin saber qué hacer con él. Y llevas la vida sin saber qué hacer con ella. La coherencia del puto fracasado que falla en todo con la misma convicción y sin variación.',
  '%N, el nombre que ningún grupo ha recordado con cariño ni con rabia. Lo tuyo no es ni ser odiado, que al menos tiene fuego. Lo tuyo es ser olvidado mientras te están mirando. Patético.',
  'Con %N de nombre y el perfil que llevas, la única pregunta razonable es cómo llegaste aquí, no cuándo te vas. Nadie invitó el nombre, nadie invitó lo que viene con él, perdedor.',
  'El nombre %N lo han llevado personas que hicieron algo con él. Tú lo llevas como un abrigo prestado que no te queda y que encima estás usando para cubrir lo que ya se ve igualmente, basura.',
  'Te pusieron %N y desde entonces el nombre ha cargado contigo. No al revés. Tú no llevas el nombre a ningún lado. Él te arrastra para que no te pierdas por el camino, puto inútil.',
  '%N. El nombre que el grupo escucha y con el que no asocia ni un logro, ni una aportación, ni una frase que alguien haya querido guardar. Nada de nada. Cero. Basura en modo silencio.',
  'Con el nombre %N ya sabes lo que el grupo piensa antes de que hables. Lo sabes porque llevas tiempo demostrándolo. La única información que has comunicado con consistencia, perdedor.',
  '%N es el nombre correcto para alguien que nació para ocupar espacio sin justificarlo. Ajuste perfecto entre el contenedor y el contenido: los dos vacíos, los dos sin valor, los dos sobrando.',
  'Te llamas %N. Eso es lo que hay. Sin atenuantes, sin contexto que lo mejore. Mierda de nombre para una mierda de portador, sin una sola versión alternativa donde algo de esto funcione.',
  'El nombre %N lo grita el grupo y nadie responde con entusiasmo. Ni tú mismo. Sabes lo que significa pronunciarlo y lo que significa ser tú, y ambas cosas tienen el mismo nivel, puto fracasado.',
  '%N. El nombre que resume lo que eres en el tiempo que tarda en decirse. Breve, sin sustancia, olvidable. El resumen perfecto de alguien que no merece más que eso para describirse, basura.',
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
  'La bio vacía es la única decisión que has tomado en tu vida que tiene sentido. Mostraste lo que hay dentro: nada. Primera vez que eres completamente honesto con el mundo, gilipollas.',
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
  'Sin bio. El único espacio donde dependes solo de ti y lo dejaste vacío. No es humildad. Es que miraste dentro y no encontraste absolutamente nada que valiera la pena mostrar, puto.',
  'Tu bio está en blanco y es lo más honesto que has hecho en tu vida: reconocer implícitamente que no hay nada dentro que merezca una sola línea. Autoconsciencia involuntaria del fracasado.',
];

// ─── SOLO BIO CON CONTENIDO (%N) — 25 frases ──────────────────────────────────

const BIO_FULL = [
  '%N, la bio es el único texto que escribes tú solo con tiempo de sobra. Y aun así salió esa mierda. Eso dice todo sobre el nivel que tienes cuando nadie te presiona: basura sin pulir y sin solución.',
  'Lo que pusiste en la bio, %N, lo pusiste creyendo que te hacía quedar bien. El grupo lo leyó, se rió y siguió. Nadie te avisó porque dar malas noticias a los fracasados no vale el esfuerzo.',
  '%N, escribiste esa bio con toda la convicción de un imbécil que se cree interesante. Resultado: el anuncio de lo poco que eres con las palabras de alguien que no sabe ni eso, cabrón sin filtro.',
  'Tu bio, %N, es la prueba de que tienes criterio de mierda incluso cuando tienes control total, tiempo ilimitado y cero consecuencias. Eso ya no es mala suerte. Es lo que eres, fracasado de libro.',
  '%N, la descripción que pusiste para impresionar consiguió lo contrario con una precisión que ni tú calculaste. Talento invertido en hacer el ridículo sin darse cuenta. El don nadie en plenitud.',
  'Esa bio tuya, %N, es el equivalente textual de presentarte en calzoncillos a una reunión. Lo pusiste, lo dejaste ahí, y el grupo lleva tiempo tomando nota del puto imbécil que lo escribió.',
  '%N, tu bio grita que quieres que te tomen en serio. Tu bio también es la razón por la que nadie lo hace. Ironía de primer nivel al alcance de cualquier idiota que sepa leer, basura.',
  'Lo que hay en tu descripción, %N, es lo que pasa cuando un fracasado se sienta a venderse sin supervisión. El producto no cumple ni el anuncio, y el anuncio ya era una mierda de por sí.',
  '%N, esa bio la redactaste con la confianza de alguien que nunca ha recibido un feedback honesto en su puta vida. Aquí lo tienes: es ridícula, dice lo contrario de lo que pretende y te define a la perfección.',
  'Tu bio, %N, es publicidad engañosa. El producto eres tú, y la diferencia entre lo que promete la descripción y lo que entrega el portador es la medida exacta de lo que eres: un fraude de manual.',
  '%N, pusiste esa mierda en la bio pensando que decía algo positivo de ti. Lo dice, sí: que eres el puto imbécil que cree que eso lo deja bien. Primera vez que la bio es completamente precisa.',
  'Redactaste tu descripción, %N, con la solemnidad de alguien haciendo historia. Lo que salió fue una bio de mierda que el grupo usa como ejemplo de lo que no hay que poner nunca, cabrón.',
  '%N, la bio que tienes la puso alguien con nula conciencia de cómo le ve el mundo. Ese alguien eres tú. La desconexión entre lo que crees ser y lo que el grupo ve llena estadios con espacio.',
  'Tu descripción, %N, es el intento de branding más triste que ha visto este grupo. Querías vender algo y lo único que vendiste fue evidencia de por qué nadie compraría lo que ofreces, inútil.',
  '%N, esa bio la tienes ahí desde hace tiempo y cada día que pasa confirma lo mismo: no tienes criterio, no tienes autoconsciencia, y no tienes nada que ofrecer que justifique el espacio ocupado.',
  'Lo que pusiste en la descripción, %N, dice más de ti de lo que imaginas. No por el contenido, sino porque pensaste que era buena idea. Ese juicio pésimo es tu rasgo más consistente, mierda.',
  '%N, tu bio es el texto que escribiste con máximo cuidado y mínimo criterio. La combinación perfecta del fracasado que se esfuerza en la dirección equivocada sin enterarse nunca de nada.',
  'La descripción tuya, %N, es una promesa que el producto no cumple. Y el producto eres tú, que ya de por sí eres una promesa que nadie hizo y que nadie esperaba, basura de manual completo.',
  '%N, pusiste esa bio para que el mundo te viera de una manera concreta. El mundo la leyó, te vio de otra, y la diferencia entre las dos versiones tiene tu nombre en todas las páginas, perdedor.',
  'Tu descripción, %N, es el autorretrato involuntario de un fracasado que se cree crack. Arte contemporáneo en el peor sentido: feo, sin sentido, y que solo el autor considera valioso, puto.',
  '%N, la bio que tienes es la declaración de intenciones de alguien que nunca va a cumplir ninguna. La consistencia entre lo que prometes en la descripción y lo que entregas en la realidad es cero absoluto.',
  'Escribiste esa bio, %N, y la dejaste como trofeo. El grupo la usa como advertencia. El mismo texto sirviendo para cosas completamente distintas según quién lo lea, inútil sin autoconsciencia.',
  '%N, tu descripción es el curriculum de alguien que nunca fue contratado. Ahora se entiende perfectamente por qué. El proceso de selección natural funciona incluso en grupos de WhatsApp.',
  'La bio que tienes, %N, es lo mejor de ti expuesto voluntariamente. Tu carta ganadora. Y tu carta ganadora hace sonreír a quien la lee, pero no de la forma que calculabas cuando la escribiste, cabrón.',
  '%N, tienes bio porque creíste que te definía bien. El grupo la lee y te define perfectamente, sí, pero en la categoría que menos esperabas: inútil con autoestima intacta e incongruente. Perfecto.',
];

// ─── SOLO AURA (%N + %A) — tiered por valor ────────────────────────────────────

function getAuraPhrases(aura) {
  const n = '%N', a = fmt(aura);

  if (aura < -10000) {
    return [
      `${a} de aura, %N. Ese número ya no es un marcador, es un diagnóstico. El tipo de cifra que confirma que eres un fracaso estructural, no una mala racha. Estructural, puto, sin remedio posible.`,
      `%N, ${a} de aura. Tan en el sótano que necesitarías un telescopio para ver el suelo desde donde estás. El campeón indiscutible de ser una mierda total en todos los indicadores del grupo.`,
      `${a} puntos, %N. Para llegar ahí has tenido que ignorar activamente cada oportunidad de mejora disponible, con la constancia del fracasado nato que sabe que su sitio está siempre abajo, perdedor.`,
      `Con ${a} de aura, %N, llevas el certificado oficial de ser un inútil documentado. No hay interpretación alternativa, no hay contexto que lo salve. El número te define y lo hace sin piedad.`,
      `%N, ${a} de aura. La cifra del que tomó cada decisión posible en la dirección equivocada con la precisión de un idiota que nunca aprende y nunca mejorará. Basura con estadísticas propias.`,
      `${a} de aura, %N. Tan negativo que el sistema ya no te castiga, te documenta. Con la fidelidad de quien registra el historial de un perdedor que ni sabe que está siendo archivado, mierda.`,
      `%N, ${a} puntos de aura. El número que lleva alguien que nunca ganó nada con gracia y perdió todo con una consistencia que da asco y admiración a partes iguales por lo sostenido del fracaso.`,
      `Con ${a} de aura llevas el récord del grupo en algo que nadie quiere tener, %N. La medalla de oro del inútil, del fracasado, del puto don nadie que cava su hoyo más profundo cada día.`,
      `${a} de aura, %N. A ese nivel el marcador ya no habla de lo que hiciste. Habla de lo que eres. Y lo que eres con esos números es un desastre humano sin atenuantes ni excusas válidas.`,
      `%N tiene ${a} de aura y el grupo lo sabe. Ese número confirma que no es mala suerte, que no es el algoritmo. Eres tú, puto fracasado, de principio a fin y sin ninguna excepción posible.`,
      `${a} de aura, %N. El nivel del que convierte en derrota todo lo que toca, con la consistencia de un mecanismo roto que nunca falla en una sola cosa: hundirse siempre más, sin fondo visible.`,
      `%N, ${a} puntos de aura en negativo profundo. El historial de alguien que merece esos números porque los construyó decisión a decisión con la dedicación del que nació para perder, basura.`,
      `${a} de aura y sigues aquí, %N. Eso ya no es vergüenza ni consciencia de ti mismo. Es no tener orgullo ni dignidad para retirarte cuando el marcador lleva tiempo gritando que sobras.`,
      `%N, ${a} puntos. Negativo histórico. La cifra que el grupo recordará como el ejemplo definitivo de lo que pasa cuando alguien sin talento, sin esfuerzo y sin criterio sigue jugando igual, mierda.`,
      `${a} de aura, %N. El número del que pasa el tiempo aquí recibiendo pérdidas y no aprendiendo nada de ninguna de ellas. El perfecto idiota sin memoria ni posibilidad de salvación disponible.`,
    ];
  }

  if (aura < 0) {
    return [
      `${a} de aura, %N. En negativo. El veredicto del sistema sobre todo lo que has aportado aquí. Sin contexto que lo mejore, sin excusa que lo tape. Eres un fracasado certificado, mierda.`,
      `%N, ${a} de aura en rojo. El sistema lleva la cuenta de todo lo que pierdes y lo que haces al respecto, que es nada. El marcador del inútil que sabe que está mal y no cambia una puta cosa.`,
      `${a} puntos, %N. Bajo cero y sin señales de remonte. El historial de alguien que merecería los números pero que prefiere no hacer nada diferente. El perdedor de manual con estadísticas al día.`,
      `Con ${a} de aura el historial habla por ti, %N. Y lo que dice es que eres el tipo de basura que pierde más de lo que gana porque se lo merece, no porque la mala suerte lo persiga.`,
      `%N, ${a} de aura. Lo que empezó como "mala racha" hace tiempo que el grupo llama por su nombre: el resultado lógico de ser exactamente la mierda que el sistema lleva tiempo catalogando.`,
      `${a} de aura en negativo, %N. El marcador lleva la cuenta de todo lo que has sido aquí. Y lo que has sido es un fracasado consistente que ni siquiera tiene la dignidad de esconderse, basura.`,
      `%N, ${a} puntos de aura. Lo que el marcador dice de ti es lo que los datos dicen de un inútil sin remedio: que lleva tiempo perdiendo sin aprender nada de cada pérdida. Sin excusa posible.`,
      `Con ${a} de aura, %N, llevas el número de alguien que el sistema ha juzgado y condenado con precisión. No es mala suerte, no es el algoritmo. Eres tú, puto perdedor, de libro y sin atenuantes.`,
      `${a} de aura y sin ganas de remontar, %N. El marcador refleja a quien eres con una fidelidad que duele si tienes algo de consciencia. Y tú no la tienes, que es el problema de fondo, inútil.`,
      `%N, ${a} puntos en negativo. La constancia es tu única virtud y la estás usando para confirmar que el sistema acertó contigo. Dedicación de fracasado aplicada a la dirección equivocada.`,
      `${a} de aura, %N. El número de los que pierden más de lo que ganan por las razones equivocadas: porque son unos inútiles que no merecen ganar y el sistema lo sabe mejor que ellos, mierda.`,
      `%N, ${a} de aura. Negativo, documentado, verificable. El tipo de marcador que ya no genera conversación porque el veredicto es tan claro que discutirlo sería una pérdida de tiempo, basura.`,
      `${a} puntos, %N. Negativo constante. El logro del que convierte en pérdida todo lo que toca sin enterarse ni cambiar nada. El fracasado de manual con la documentación completamente al día.`,
      `%N, con ${a} de aura el sistema te está diciendo lo que el grupo piensa pero no dice: que algo en ti está fundamentalmente roto y que ningún parche voluntario lo va a arreglar nunca, puto.`,
      `${a} de aura, %N. El marcador del fracasado que lleva tiempo en rojo y ha decidido, conscientemente o no, que esa es su dirección natural. El sistema tomó nota. El grupo también. Perdedor.`,
    ];
  }

  if (aura < 5000) {
    return [
      `${a} de aura, %N. En positivo por los pelos y sin mérito real detrás. La distancia entre eso y el cero la salvas con una mala semana, y malas semanas las tienes con regularidad de fracasado.`,
      `%N, ${a} puntos de aura. Positivo de puta chiripa. No es un logro, es sobrevivir raspando. Y sobrevivir raspando en un marcador de aura es la definición de ser un inútil de bajo vuelo, mierda.`,
      `${a} de aura, %N. La cifra del mediocre que ni cae ni sube porque no tiene talento para ganar ni agallas para arriesgar. El limbo del don nadie: demasiado poco para importar a nadie.`,
      `Con ${a} de aura, %N, llevas el marcador del que ni cae con estilo. Ni suficientemente bien para que se note, ni suficientemente mal para ser interesante. El gris más inútil del grupo, basura.`,
      `%N, ${a} de aura. Positivo sin convicción ni mérito. Un número que resume el impacto nulo que tienes aquí: el fantasma que técnicamente existe pero no cuenta para nada ni en ningún frente.`,
      `${a} puntos, %N. En positivo por menos de lo que cuesta un café miserable. Eso no es estar bien, es no estar en negativo todavía. Y "todavía" es la palabra clave para alguien como tú, perdedor.`,
      `%N, ${a} de aura. Casi en cero. El tipo de cifra que dice que llevas aquí sin dejar ninguna marca real, gastando aire sin producir nada que justifique el espacio que ocupas en el grupo.`,
      `${a} de aura, %N. El número del cobarde que no pierde del todo porque no arriesga nada y no gana nada porque no merece nada. El empate perpetuo del inútil sin ambición ni valor, puto.`,
      `%N, con ${a} de aura estás técnicamente en positivo. Técnicamente. En la práctica ese número es tan bajo que la diferencia con ser un puto fracasado es solo semántica y filosófica.`,
      `${a} puntos de aura, %N. Positivo de saldo mínimo. La cifra del que sobrevive por inercia y llama a eso "estar bien". El don nadie que se conforma con no estar en el suelo. Patético de manual.`,
    ];
  }

  // aura >= 5000
  return [
    `${a} de aura, %N. Alto para ser tú. El sistema falla a veces y este es uno de esos casos donde el número no cuadra con el portador por ningún ángulo que se mire. Anómalo y temporal.`,
    `%N, aura de ${a}. Eso no encaja con nada de lo que el grupo observa a diario. La suerte ciega existe y eres el mejor argumento para demostrar que no premia el mérito, sino el azar puro.`,
    `${a} puntos de aura, %N. Ese número y la persona que lo lleva no encajan en ningún modelo lógico. El marcador tiene días raros. Hoy le tocó a ti, perdedor con golpe de suerte temporal.`,
    `%N, con ${a} de aura alguien debería auditar el sistema, porque la alternativa es creer que mereces eso. Y el grupo lleva tiempo con datos suficientes para descartarlo sin dudar, basura.`,
    `${a} de aura, %N. El número más generoso que el sistema ha producido para alguien que lo merece tan poco. Anómalo, temporal, sin relación real con lo que el grupo observa cada puto día.`,
    `%N, ${a} puntos que no cuentan la historia completa. Cuentan los momentos de suerte. El contexto general, la persona real detrás del número, ese ya tiene otro resultado muy diferente, mierda.`,
    `${a} de aura, %N. Sorprendentemente alto para el inútil que el grupo conoce. El sistema es justo a largo plazo. A corto plazo tiene anomalías con nombre, apellidos y número de teléfono.`,
    `%N, aura de ${a}. Un número que no cuadra con el perfil. La disonancia entre el marcador y el portador es tan grande que da vergüenza ajena, puto. El equilibrio volverá porque siempre vuelve.`,
    `${a} puntos de aura, %N. El marcador dice que eres más de lo que pareces. El grupo dice que eres exactamente lo que pareces. Entre los dos, uno ha pasado tiempo contigo. No es el marcador, perdedor.`,
    `%N, ${a} de aura. El reloj roto tiene razón dos veces al día. Hoy fue la tuya. No lo confundas con mérito ni con talento. Es chiripa pura, basura, y el sistema lo va a corregir.`,
  ];
}

// ─── SOLO ACTIVIDAD (%N + %C) — tiered, solo para inactivos ───────────────────

function getActivityPhrases(count) {
  const c = fmt(count);

  if (count === 0) {
    return [
      'CERO mensajes. Ni uno. Entras, espías, te pirás y no dejas una sola prueba de vida útil. No es timidez, %N, es ser un parásito digital de manual que consume lo que otros producen y no da nada.',
      'El contador marca cero, %N. Ni una sílaba, ni un emoji de mierda, ni una reacción. Llevas aquí el tiempo suficiente para que eso ya no sea discreción. Es directamente no existir, fantasma inútil.',
      'Cero mensajes, %N. Entras, ojeas, te largas. El mirón del grupo, el fantasma que lo lee todo y no aporta una puta mierda. Nadie te echaría de menos porque nadie sabe que estás, perdedor.',
      'Ni un solo mensaje, %N. Cero. El grupo no tiene una sola prueba de que existes. Un nombre en la lista y un espacio ocupado por alguien que aporta lo mismo que una silla vacía, basura.',
      'Cero textos, %N. El máximo nivel del gorrón: consumir todo y no dar nada. El tipo de mierda humana que está en cuarenta grupos sin aportar nada en ninguno porque da pereza hasta teclear.',
      'Sin un solo mensaje y sigues aquí, %N. Eso ya no es silencio ni timidez. Es no tener una sola cosa útil que decir y no tener la decencia de irse cuando sobras en todos los sentidos posibles.',
      'Cero mensajes confirmados, %N. Llevas aquí suficiente tiempo para haber soltado algo en algún momento. No lo hiciste. Eso no es introversión, es ser un puto inútil sin nada que ofrecer.',
      'El historial dice cero y el historial no miente, %N. Eres el tipo de miembro que hace que los grupos parezcan llenos sin aportar nada. Bulto de lista. Decoración inútil de primera, mierda.',
      'Ni una respuesta, ni una pregunta, ni un signo de vida, %N. Cero. Eso es lo que eres aquí: un cero a la izquierda con número de teléfono. La definición textual del que sobra en todo.',
      'Cero mensajes, %N. Conseguiste estar en un grupo de conversación sin conversar nunca. Eso requiere un nivel de inutilidad que da casi envidia, si no diera tanto asco antes de admiración.',
      'Sin un mensaje, %N. Presente en la lista, ausente en todo lo demás. La forma más inútil de pertenecer a algo aplicada con la convicción del puto fantasma que nunca va a cambiar nada.',
      'No existe un solo mensaje tuyo registrado, %N. En un grupo de comunicación eso solo dice una cosa: no tienes nada que comunicar y ni la decencia de reconocerlo e irte, basura digital.',
      'Cero textos, %N. El nivel de aporte de una silla vacía pero con el añadido de que la silla no consume notificaciones ni ocupa espacio en la lista. Superas a la silla en inútil y en presencia inútil.',
      'Cero mensajes y sin vergüenza, %N. El fantasma perfecto: presencia nula, impacto nulo, aportación nula. El trifecta del que sobra en todos los frentes posibles y ni ganas tiene de cambiar.',
      'Sin un solo texto tuyo, %N. Llevas aquí como el polvo en el mueble: presente, acumulándote, y solo visible cuando alguien pasa el dedo para hacer el ridículo examen de lo que no limpiaste.',
    ];
  }

  if (count < 20) {
    return [
      `${c} mensajes en TOTAL, %N. Todo lo que has aportado en tu existencia aquí cabe en una pantalla. Decoración barata de fantasma de medio pelo que ni siquiera termina de serlo del todo.`,
      `${c} textos miserables, %N. Con ese ritmo el grupo necesita un recordatorio de que sigues vivo. No por cariño, sino para decidir si vale la pena tenerlo en la lista o borrarlo directamente.`,
      `Con ${c} mensajes ocupas una plaza que alguien con algo que decir aprovecharía, %N. Eres el asiento vacío que respira. El inútil de catálogo que sobra y encima no se entera de que sobra.`,
      `${c} mensajes, %N. Esa cifra es el grito del que no le importa nada lo que pasa aquí. Mensaje recibido, fantasma de mierda. El grupo tomó nota y la nota dice: prescindible con datos confirmados.`,
      `${c} textos en todo el historial, %N. Lo justo para confirmar que existes, insuficiente para que a un solo ser humano le importe si desapareces mañana sin decir nada, puto fantasma inútil.`,
      `${c} mensajes, %N. El tipo de cifra que le dice al grupo todo sobre cuánto te importa estar aquí: nada, cero, una mierda. Y eso se nota desde el primer registro hasta el último, basura.`,
      `Con ${c} mensajes tienes el historial de alguien que entró por error, se quedó por inercia y nunca encontró motivo para aportar nada, %N. El grupo tampoco encontró motivo para pedírtelo.`,
      `${c} textos, %N. Lo que dejas tras de ti cuando te vas es exactamente lo mismo que dejas cuando estás: nada perceptible, nada que cambie nada. El fantasma más inútil del grupo documentado.`,
      `${c} mensajes, %N. El número del que no considera que este grupo merezca su tiempo pero tampoco tiene nada mejor que hacer. El don nadie sin opciones que ocupa espacio por puro descarte.`,
      `Con ${c} mensajes eres estadísticamente el miembro más inútil del grupo, %N. No el más silencioso, que eso tiene estética. El más inútil, que es la categoría de mierda sin ninguna estética.`,
    ];
  }

  if (count < 60) {
    return [
      `${c} mensajes, %N. El que lo lee TODO y no aporta NADA. El espectador mudo que consume el trabajo de los demás y se esconde cuando toca poner algo sobre la mesa. Parásito de manual, mierda.`,
      `Con ${c} mensajes estás en la zona del que está pero no cuenta, %N. No eres del todo fantasma, pero tampoco eres parte de una conversación que alguien recuerde. El gris más inútil posible.`,
      `${c} textos. Justo por debajo del umbral donde alguien empieza a importar, %N. Sigues siendo un número en la lista, no un participante con peso. El don nadie técnico que no pasa de ahí.`,
      `${c} mensajes y el grupo sigue sin saber qué pintas aquí, %N. No tienes datos suficientes para que nadie opine de ti porque nunca los has dado. Un misterio que a nadie le apetece resolver.`,
      `${c} textos, %N: la cantidad exacta para no ser expulsado por inactivo y para que a nadie le importe si te vas. El equilibrio del fantasma que ni de fantasma termina de serlo. Patético de libro.`,
      `${c} mensajes, %N. Has estado aquí tiempo de sobra para haber dicho algo que valiera. No pasó. El marcador lo confirma y el grupo lo sabe aunque no pierda el tiempo en decírtelo, perdedor.`,
      `Con ${c} textos llevas el historial de alguien que consume sin producir, que lee sin responder y que existe como el humo: presente un momento y sin dejar nada cuando se disipa, %N. Basura.`,
      `${c} mensajes, %N. La actividad del que nunca aparece cuando hay que opinar, nunca está cuando hay que aportar. Invisible por elección y por inutilidad. Doble mérito en la dirección equivocada.`,
      `Con ${c} textos no eres fantasma pero tampoco eres nada, %N. El gris del que existe sin que a nadie le cambie algo que exista o no. El don nadie confirmado por sus propios números, mierda.`,
      `${c} mensajes, %N. Lo justo para sobrevivir en la lista, insuficiente para contar para algo. La definición perfecta del inútil que ocupa espacio sin justificarlo nunca con nada concreto.`,
    ];
  }

  // 60-149
  return [
    `${c} mensajes y el grupo sigue sin recordar uno solo que valiera la pena, %N. Cantidad de tibio, calidad de mierda. Ni aportas ni te callas del todo. El combo más inútil del grupo.`,
    `${c} textos enviados sin dejar una sola marca real, %N. Ruido de fondo con forma de persona, número de teléfono y un historial de no haber hecho nada que cambie nada aquí jamás.`,
    `Con ${c} mensajes lograste hablar sin que nadie te cite, opinar sin convencer a nadie y existir sin que importe, %N. Esfuerzo de puto inútil invertido en producir la nada más perfecta.`,
    `${c} mensajes, %N. Lo justo para no ser fantasma del todo, lo poco para que nadie pueda nombrar una sola cosa tuya que haya cambiado algo aquí. El fracasado invisible con estadísticas.`,
    `${c} textos y tu aportación real al grupo se resume en que "estuviste", %N. El legado del que escribe mucho sin decir nada que valga un segundo de atención o un milisegundo de memoria.`,
    `${c} mensajes en el historial y cero impacto acumulado, %N. Presencia sin peso. Actividad sin consecuencias. La participación del que da igual si existe o no, basura de nivel doctorado.`,
    `Con ${c} textos llevas suficiente tiempo para haber dicho algo que alguien recordara, %N. No pasó. La oportunidad fue y volvió y se fue de nuevo sin que la aprovechara el puto inútil que eres.`,
    `${c} mensajes, %N. Sin perfil, sin personalidad, sin nada que diferencie lo tuyo de lo de otro don nadie igual de irrelevante. El fantasma que ni siquiera es el único de su tipo en el grupo.`,
    `Con ${c} mensajes ya no eres invisible del todo pero tampoco visible, %N. El gris del que existe sin que cambie algo que exista o no. El don nadie confirmado por estadística, perdedor.`,
    `${c} mensajes, %N. Suficiente para estar, insuficiente para contar. La definición perfecta del inútil que ocupa espacio sin justificarlo con nada en ningún momento. Mierda de aportación total.`,
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANTI-REPETICIÓN
// Tracks last 10 templates and last 4 categories per group so the same phrase
// and the same attack angle never appear back-to-back within a session.
// ═══════════════════════════════════════════════════════════════════════════════

const roastHistory = new Map(); // jid → { tpls: string[], cats: string[] }

function getHist(jid) {
  if (!roastHistory.has(jid)) {
    if (roastHistory.size >= 2000) roastHistory.delete(roastHistory.keys().next().value);
    roastHistory.set(jid, { tpls: [], cats: [] });
  }
  return roastHistory.get(jid);
}

function pushHist(jid, cat, tpl) {
  const h = getHist(jid);
  h.tpls.push(tpl); if (h.tpls.length > 10) h.tpls.shift();
  h.cats.push(cat); if (h.cats.length > 4)  h.cats.shift();
}

// Pick from pool avoiding recently used templates. Falls back to full pool if
// all templates are exhausted (only possible in very small pools).
function freshPick(pool, usedSet) {
  const avail = pool.filter(p => !usedSet.has(p));
  return pick(avail.length ? avail : pool);
}

// Pick a category avoiding the last 3 used. Falls back to full list.
function freshCat(options, recentCats) {
  const recent = new Set(recentCats.slice(-3));
  const avail = options.filter(o => !recent.has(o));
  return pick(avail.length ? avail : options);
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

  const { tpls, cats } = getHist(jid);
  const usedTpls = new Set(tpls);

  // 40% combinada, 60% variable única. Actividad solo para inactivos.
  let roastText, cat, tpl;
  const useCombined = Math.random() < 0.40;

  if (useCombined) {
    cat = 'combined';
    const pool = isInactive ? COMBINED_INACTIVE : COMBINED_ACTIVE;
    tpl = freshPick(pool, usedTpls);
    roastText = tpl.replace(/%N/g, displayName);
  } else {
    const singleVars = ['name', 'bio', 'aura'];
    if (isInactive) singleVars.push('activity');
    cat = freshCat(singleVars, cats);

    switch (cat) {
      case 'name':
        tpl = freshPick(NAME_ONLY, usedTpls);
        roastText = tpl.replace(/%N/g, displayName);
        break;
      case 'bio': {
        const pool = bio ? BIO_FULL : BIO_EMPTY;
        tpl = freshPick(pool, usedTpls);
        roastText = bio ? tpl.replace(/%N/g, displayName) : tpl;
        break;
      }
      case 'aura': {
        const pool = getAuraPhrases(aura);
        tpl = freshPick(pool, usedTpls);
        roastText = tpl.replace(/%N/g, displayName).replace(/%A/g, fmt(aura));
        break;
      }
      case 'activity': {
        const pool = getActivityPhrases(msgCount);
        tpl = freshPick(pool, usedTpls);
        roastText = tpl.replace(/%N/g, displayName).replace(/%C/g, fmt(msgCount));
        break;
      }
    }
  }

  pushHist(jid, cat, tpl);

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
