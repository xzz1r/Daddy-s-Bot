'use strict';

const { getSender, getTarget, isMainOwner, bareJid } = require('../utils/wa');
const { pick } = require('../utils/helpers');
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
  '%N, tu nombre ya da risa, tu bio de mierda lo confirma y tu aura podrida lo certifica. Que encima ni escribas nada remata al puto inútil más completo y prescindible que ha pasado por este grupo de mierda.',
  'Con un aura tan rota como tu bio y una actividad de muerto sin enterrar, %N, eres un error de la naturaleza. Bio de perdedor profesional, presencia de fantasma de mierda. El pack completo sin ningún atenuante posible.',
  '%N, tu bio es más triste que tu vida sexual, que es absolutamente nula. Tu aura lo confirma con números y tu silencio en el grupo remata la faena. Tres frentes perdidos al mismo tiempo. Consistencia del fracasado nato.',
  'Con esa bio que huele a frustración acumulada de años, %N, y un aura que apesta a pajas mentales y derrota total, no escribes nada porque ya sabes que todo lo que digas solo añade contexto al ridículo que ya eres, puto.',
  '%N, eres tan patético que hasta tu aura tiene depresión. Bio de mierda, nombre de fracasado y una presencia tan nula que el grupo no sabe si estás o no, y la respuesta no cambia nada para absolutamente nadie.',
  'Qué pena de nombre, %N. Bio de mierda, aura podrida y cero mensajes en el grupo. El trifecta del inútil moderno, completo y documentado para que todo el grupo lo vea sin necesidad de buscar más pruebas.',
  '%N, eres el tipo que tiene una bio patética para compensar el aura de mierda que lleva encima. Y aun así no escribes nada porque el silencio es lo único que te protege del ridículo absoluto que te mereces, cabrón.',
  'Con ese nombre de cornudo, %N, esa bio que da vergüenza ajena y ese aura podrida, eres exactamente lo que todo el mundo imagina cuando alguien dice "fracaso con patas y sin una puta excusa". Y ni activo eres.',
  '%N, tu bio grita inseguridad, tu aura apesta a fracaso crónico y tu silencio confirma que hasta tú sabes que no tienes una puta mierda que aportar. El don nadie perfecto: sin cojones, sin valor y sin remedio posible.',
  'No sé qué da más asco, %N, si tu bio de cuatro duros, tu aura de perdedor o el silencio constante de alguien que lleva aquí sin dejar una sola marca que justifique el espacio que ocupa en la lista.',
  '%N, llevas aquí tiempo de sobra para haber soltado algo y no lo hiciste. Con esa bio de mierda y ese aura podrida, callarte es lo único inteligente que has hecho, porque cada palabra tuya solo confirmaría el puto inútil que eres.',
  'Eres un desperdicio humano, %N. Bio que da lástima, aura que apesta a fracaso acumulado y presencia de fantasma de mierda. El grupo te aguanta por inercia pura, no porque hayas justificado tu existencia aquí.',
  '%N, tu bio es la autobiografía de un don nadie que no lee ni su puta madre, tu aura es el balance de todos tus fracasos y tu silencio el historial de un fantasma de mierda sin una sola gota de dignidad. Un desastre completo y sin arreglo.',
  'Con esa bio de perdedor crónico, %N, y un aura que habla sola de lo que eres, no escribes nada porque cada cosa que dijeras solo añadiría contexto al asco que el grupo ya siente cuando ve tu nombre.',
  '%N, eres el gilipollas que tiene una bio que da vergüenza, un aura de mierda y la desfachatez de seguir en el grupo sin aportar absolutamente nada. Existes como el olor a humedad: molesto, sin valor y sin remedio.',
  'Tu nombre, %N, ya da asco antes de que nadie hable contigo. La bio de mierda confirma los peores pronósticos, el aura podrida los certifica y tu silencio de fantasma remata la faena. Un puto desastre perfecto en todos los sentidos.',
  '%N, combinas bio de mierda, aura de perdedor y presencia de fantasma con la naturalidad de alguien que lleva toda la vida siendo exactamente esto sin enterarse nunca. El fracasado inconsciente en estado puro.',
  'Lo que pusiste en la bio, %N, es lo que te gustaría ser. Tu aura de mierda muestra lo que realmente eres: un puto fracasado. Y no escribir nada confirma que ya lo sabes. Los tres juntos pintan el retrato más honesto del don nadie que arrastras.',
  '%N, la bio es una mierda, el aura está en el suelo y no has escrito nada relevante. No es mala racha, es quien eres desde siempre. Y quien eres no le interesa a nadie en este grupo ni fuera de él.',
  'Con ese nombre, %N, esa bio de mierda y el aura por el suelo, eres la representación más completa del concepto de "sobrar en todos los sentidos posibles" sin tener ni la más mínima idea de ello.',
  '%N, tu bio es el único texto que escribiste por voluntad propia y aun así salió esa mierda. El aura lo acredita y tu silencio confirma que en el grupo tampoco tienes una puta cosa que ofrecer. El pack completo del inútil de manual.',
  'La bio que tienes, %N, es el grito de socorro de alguien que no sabe quién coño es. El aura confirma que la respuesta no es buena, y el silencio lo certifica sin ninguna necesidad de más palabras.',
  '%N, llevas aquí de fantasma con una bio puesta para que alguien piense algo mínimamente bueno de ti. El aura de mierda dice lo que el grupo piensa de verdad, y el resultado es siempre el mismo: una puta nada que no le importa a nadie.',
  'Lo más triste de ti, %N, no es la bio patética ni el aura de mierda ni la inactividad de fantasma. Lo más triste es que crees que aportas algo y el grupo entero lleva tiempo sabiendo que no. Nadie te lo dice por lástima.',
  '%N, con bio de don nadie, aura rota y cero presencia real, eres el miembro más prescindible y olvidable que ha pisado este grupo de mierda. Y dado el nivel que hay aquí, ser el más inútil de todos tiene su puto mérito.',
  '%N, entras al grupo como entra el frío por una rendija: nadie te invitó, nadie te quiere y todos preferirían taparte. Bio de perdedor, aura podrida y un silencio que es lo mejor que ofreces. Puto estorbo.',
  'Tu bio es humo, %N, tu aura es escombro y tu actividad es un desierto. Tres pruebas de que naciste para ser el nombre que el grupo tarda un mes en notar que ya no está. Y no lo notará ni entonces, basura.',
  '%N, eres lo que queda cuando a una persona le quitas todo lo que la hace interesante: un nombre, una bio triste, un aura de mierda y un silencio de fantasma. El kit básico del don nadie sin extras.',
  'Con esa bio de fracasado, %N, ese aura en el suelo y esa presencia de cadáver digital, el grupo te tiene en la lista por pereza de borrarte, no por otra cosa. Ocupas espacio como ocupa polvo un rincón olvidado.',
  '%N, tu bio da pena, tu aura da asco y tu inactividad da igual. Has conseguido lo imposible: ser insignificante en todos los frentes a la vez, con una coherencia que solo alcanza el fracasado de vocación.',
  'Naciste, %N, y desde entonces el saldo es negativo en todo lo medible: bio patética, aura por los suelos, cero rastro en el grupo. Un error que la naturaleza no corrige porque ya no merece ni el gasto, mierda.',
  '%N, eres el puto ejemplo de que estar en la lista no es lo mismo que existir. Bio de relleno, aura de derrota y un silencio de mueble viejo. Al grupo le da exactamente igual si estás o si te mueres, y esa nada es tu única aportación.',
  'Con bio de don nadie, %N, aura de perdedor y una presencia que ni los mosquitos registran, eres el ejemplo que se pone cuando alguien pregunta qué es sobrar. Sobras entero, en todo, sin una sola excusa.',
];

const COMBINED_ACTIVE = [
  'Mírate, %N, con esa bio de perdedor que parece escrita por un virgen eterno que lleva años sin que nadie le haga caso. Tu aura huele a frustración sexual acumulada y escribes mucho, pero lo que dices solo confirma lo que la bio ya anunciaba.',
  '%N, tu aura es tan oscura y podrida que hasta el diablo se daría la vuelta al verte. Bio de perdedor, nombre de cornudo, y ni toda la actividad del mundo te va a lavar la imagen que el grupo tiene de ti. Cabrón.',
  'Con esa bio que grita "soy un fracaso con patas" y un aura que apesta a pajas mentales acumuladas, %N, eres el fraude que habla mucho y aporta nada. Mucho ruido, cero impacto, ninguna huella real.',
  '%N, tu aura es tan negra y podrida como tu bio de don nadie. Un puto fraude que escribe mucho, aporta poco y se cree más de lo que el marcador y el grupo confirman cada día sin excepción.',
  'Esa bio confirma que eres un fracaso con patas, %N, tu aura apesta a perdedor y por mucho que escribas no hay un puto mensaje tuyo que haya cambiado esa mierda. Mucho ruido, cero huella, cero valor. Consistente solo en lo peor.',
  'Tu bio es un chiste malo, %N, y tu aura apesta a desesperación barata. Escribes y escribes y sigues siendo lo mismo que cuando no escribías: un nadie con nombre y sin nada más que ofrecer.',
  '%N, pareces sacado de la bio más patética del mundo, con ese aura de mierda de víctima nata. Nadie te respeta, nadie te toma en serio, y sigues escupiendo mensajes como si eso fuera a cambiar el puto don nadie que eres. No cambia una mierda.',
  'Esa bio de perdedor profesional combinada con tu aura de mierda, %N, hacen de ti el tipo de basura psicológica que merece que le recuerden lo insignificante que es cada vez que abre la boca. Puto.',
  'Con un aura tan rota como tu bio de mierda, %N, eres un error de la naturaleza con patas. Escribe todo lo que te salga del culo, que el marcador y la bio ya dijeron lo único relevante sobre ti: que no vales una puta mierda.',
  '%N, tu bio es puro llanto de fracasado y tu aura es un vómito de inseguridad. Eres tan predecible que el grupo entero te tiene calado desde el primer mensaje que mandaste aquí. Nada te salva.',
  'Qué pena de nombre, %N. Bio de mierda y aura podrida. El grupo entero te tiene como ejemplo de lo que no hay que ser, y tiene toda la razón del mundo con esa clasificación sin necesitar discutirla.',
  '%N, eres el tipo que tiene una bio patética para compensar el aura de mierda que lleva encima. Y encima hablas como si alguien te hubiera pedido que participaras. Nadie te pidió nada, gilipollas.',
  'Con ese nombre de cornudo, %N, esa bio de llorón crónico y ese aura que da vergüenza ajena, eres exactamente lo que todo el mundo imagina cuando alguien dice "fracaso con autoestima intacta e incongruente".',
  '%N, tu bio grita inseguridad y tu aura apesta a fracaso crónico. Manda todos los putos mensajes que quieras, que el marcador grita más fuerte que cualquier gilipollez que hayas soltado: que eres un don nadie de manual.',
  'No sé qué da más asco, %N, si tu bio de cuatro duros o tu aura de perdedor. Todo junto, con lo que produces en el grupo, es un milagro de mediocridad sostenida y documentada sin ningún esfuerzo.',
  '%N, llevas tiempo aquí sin haber dejado una sola huella que merezca recordarse. Con esa bio y ese aura de mierda, al menos la cantidad de mensajes da material para confirmar el diagnóstico que ya teníamos.',
  'Eres un desperdicio humano, %N. Bio que da lástima y aura que da asco. El grupo te aguanta porque ya está acostumbrado a tu existencia, no porque hayas aportado nada que justifique seguir.',
  '%N, tu bio es la autobiografía de un don nadie que no lee ni su puta madre y tu aura es el resumen de todos tus fracasos. El grupo lleva tiempo leyendo esa mierda y la opinión es unánime: no vales para nada y no hay fisura posible.',
  'Con esa bio de perdedor, %N, y un aura de mierda que habla sola de lo que eres, cada puto mensaje que sueltas solo añade otra pincelada al retrato de inútil que el grupo ya tiene de ti. Y es un retrato que da asco mirar.',
  '%N, eres el gilipollas que tiene una bio que da vergüenza y un aura de mierda, y aun así sigue mandando mensajes como si alguien estuviera esperando lo que tiene que decir. Nadie espera nada tuyo, puto.',
  'Tu nombre, %N, ya da asco antes de que nadie hable contigo. La bio de mierda confirma los peores pronósticos y el aura podrida los certifica. Cada cosa que sueltas en el grupo solo suma pruebas a un caso cerrado: eres un puto inútil.',
  '%N, combinas bio de mierda, aura de perdedor y una presencia que no ha cambiado nada desde que llegaste. Lo mismo de siempre, en todos los indicadores, en la misma dirección: abajo sin freno.',
  'La bio que tienes, %N, es la versión escrita de alguien que no sabe quién coño es. El aura confirma que la respuesta no es buena. Y lo que mandas al grupo confirma que cada mensaje que escribes lo empeora.',
  '%N, esa bio de mierda y ese aura por los suelos confirman que no es mala racha, es quién coño eres. Y quién eres provoca la misma reacción en el grupo desde el primer día: una mueca de asco, silencio y pasar de ti como de la peste.',
  'Con ese nombre, %N, esa bio de mierda de dos duros y el aura por el suelo, eres la puta definición andante de "presencia inútil": ocupas sitio, gastas datos y no aportas una mierda a nadie. Sin excusa ni remedio.',
  '%N, tu bio es una promesa que el puto producto no cumple. La pusiste creyendo que te dejaba bien y lo único que grita es que no tienes ni puta idea de lo poco que vales para el resto del mundo. Publicidad engañosa de un fraude.',
  'Lo más triste de ti, %N, no es la bio patética ni el aura de mierda. Lo más triste es que llevas tiempo participando creyendo que aportas algo, y el grupo entero sabe que no. Nadie te lo dice por compasión.',
  '%N, con bio de don nadie y aura de mierda, eres el miembro más consistentemente mediocre que ha pasado por este grupo. Ni siquiera el peor, que eso al menos se recordaría. El más gris, el más olvidable, la puta nada con nombre.',
  'Llevas la bio de quien quiere aparentar algo, %N, y el aura de mierda del que no lo consigue ni de coña. Todo lo que sueltas en el grupo es el puente entre las dos cosas: mucho esfuerzo de inútil para seguir siendo exactamente la misma nada.',
  '%N, tu bio dice lo que quieres que piensen de ti, tu aura de mierda dice lo que el sistema piensa de ti, y lo que sueltas en el grupo dice lo que el resto piensa de ti. Y en las tres sale lo mismo: que eres un puto don nadie.',
  '%N, hablas para que se note que estás y lo único que se nota es que estorbas. Cada mensaje tuyo es un recordatorio de que ocupas un hueco que cualquiera con algo que decir usaría mejor. Puto relleno.',
  'Escribes mucho, %N, y el grupo retiene cero. Tu bio adorna a un don nadie, tu aura lo confirma y tu cháchara constante solo sirve para que nadie pueda decir que no te dio la oportunidad de callarte a tiempo.',
  '%N, eres ruido con forma de persona. La bio miente, el aura no, y tú entre medias insistes en participar como si alguien hubiera pedido tu opinión alguna vez. No la pidió nadie, gilipollas. Nunca.',
  'Con esa bio de fracasado con pretensiones, %N, y un aura de mierda que te desmiente línea a línea, hablar tanto solo te desnuda más. Cada puta palabra tuya es otra prueba de que el grupo tenía razón desde el principio: no vales nada.',
  '%N, tu problema no es que no hables. Es que hablas y sigues siendo exactamente la misma nada de antes, solo que ahora documentada. Bio de mierda, aura de mierda y un historial que lo firma todo, cabrón.',
  'Escribes como un pobre gilipollas gritando en un cuarto vacío, %N. La bio pretende, el aura de mierda te desmiente y el grupo pasa de ti. Mucho esfuerzo para confirmar lo único constante en ti: que hagas lo que hagas, sigues sobrando.',
  '%N, tu aura te desnuda, tu bio te delata y tu insistencia en participar remata la faena. Tres formas distintas de decir lo mismo: que estás aquí de relleno y que ni tú te lo crees ya, puto fraude.',
  'Con esa bio de mierda, %N, ese aura podrida y esa manía de opinar sin que nadie te pregunte una puta cosa, eres el fondo de pantalla del grupo: siempre ahí, nunca importante y sustituible por cualquier mierda igual de irrelevante.',
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
  '%N. Hasta el puto autocorrector lo marca en rojo como error. Sabe lo que el grupo ya sabe: que aquí hay algo fundamentalmente jodido desde el principio, y no es un error tipográfico, eres tú entero. Sin arreglo posible.',
  'Con ese nombre, %N, no hacía falta ver nada más. El nombre ya decía quién venía y el grupo tomó nota antes de que dijeras una sola palabra de mierda, basura.',
  'Te pusieron %N con toda la esperanza del mundo. Mira lo que salió. La inversión más catastrófica de la familia, aunque en eso tampoco eres el primero. Puto fracasado.',
  '%N suena a alguien que nunca termina nada, que promete mucho y entrega cero. Si el nombre es la marca personal, tu marca es una mierda sin remedio y sin posibilidad de relanzamiento.',
  'El nombre %N en esta sala equivale a silencio incómodo. Nadie lo asocia a nada bueno, útil ni interesante. El vacío tiene nombre y es el tuyo, inútil confirmado.',
  'Te llamas %N y con eso ya se sabe todo. Un nombre que la gente olvida mientras lo está oyendo, como se olvida un pedo en un ascensor: molesta un segundo y desaparece sin dejar nada. Puto don nadie sin identidad.',
  '%N es el nombre que merece un fracasado de libro. No lo elegiste, pero sí elegiste lo que viniera después, y en eso el nivel es idéntico: puto desastre sin una sola excusa válida.',
  'Con el nombre %N partes desde debajo del suelo. Y lejos de remontar has encontrado un sótano debajo del sótano donde seguir cayendo. Basura digital en caída libre permanente.',
  '%N. El nombre que nadie salva aunque su portador se lo mereciera. Y tú, encima, no te lo mereces. Doble condena, inútil confirmado sin ningún factor atenuante disponible.',
  'Que te llamen %N ya es una sentencia. Que te llamen %N y encima seas tú es un insulto para el nombre y para cualquier otro %N que haya hecho algo útil con él, perdedor.',
  'El nombre %N funciona como alerta temprana para el grupo: viene alguien que va a aportar cero, va a molestar el doble y se va a ir sin dejar nada. Basura clásica de catálogo.',
  '%N. El nombre que repite el mundo con el mismo tono con el que se dice "de nuevo tú, puto fracasado". Porque eso es lo que anuncia cada vez que aparece en cualquier contexto.',
  'Con %N de nombre el pronóstico ya era una mierda desde el primer día. Lo que vino después lo confirmó con datos, con hechos y con el puto historial de inútil que el grupo tiene perfectamente catalogado. Cero sorpresas, cero salvación.',
  'Te llamas %N y eso le dice al grupo en menos de un segundo todo lo que necesita saber sobre ti. No hay segunda vuelta, no hay recuperación posible. El nombre dijo la última palabra, mierda.',
  '%N. El nombre que nadie grita con entusiasmo. Ni follando gritarían el tuyo, y mira que en ese momento se dice cualquier mierda. Suena plano, muerto, meado, como todo lo que arrastras contigo, perdedor.',
  'El nombre %N lo llevan personas muy distintas. En ti quedó como un tatuaje de mierda en un cuerpo que no lo merece: permanente, mal puesto y motivo de vergüenza ajena cada puta vez que alguien lo ve. Un desperdicio de nombre.',
  '%N. Dos sílabas que resumen el error completo. Desde que te lo pusieron hasta este mensaje, el patrón es el mismo: promesa nula, resultado nulo, impacto nulo. Basura con nombre.',
  'Llevas el nombre %N con la indiferencia de alguien que hace tiempo decidió que nada en su vida merecía esfuerzo ni orgullo. En eso al menos eres coherente, puto vago de siempre.',
  '%N suena como lo que es: el nombre de un don nadie que lleva aquí tiempo suficiente para haber demostrado algo y que salió con este resultado. Sin sorpresa ni salvación posible.',
  'Con el nombre %N te presentas y la gente ya tiene una carpeta abierta titulada "inútil". Solo tienes que confirmarla, cosa que haces sin esfuerzo y con una consistencia admirable en lo peor.',
  '%N, el nombre con más historial de fracasos por sílaba de este grupo. Una estadística que nadie te pidió acumular pero que llevas con la constancia del que nació para perder, mierda.',
  'Te llaman %N y respondes. El único reflejo que has entrenado con dedicación: reconocer el nombre y no hacer nada productivo después. Basura de nivel experto sin esfuerzo consciente.',
  'El nombre %N no necesita explicación aquí. El grupo lleva tiempo sabiendo qué viene detrás de esas letras y ninguna actualización reciente ha mejorado el pronóstico, inútil sin remedio.',
  '%N es el nombre de alguien que el mundo catalogó y archivó en la carpeta correcta desde el principio. Que esa carpeta diga "fracasado, basura, perdedor" no es mala suerte. Es precisión estadística.',
  'Con el nombre %N la presentación ya está hecha y no juega a tu favor. Lo que viene después solo acumula evidencia para un caso que el grupo tiene cerrado desde hace tiempo, mierda total.',
  'Te llamas %N y hasta el puto nombre suena harto de cargar contigo. Como si supiera de sobra la mierda que va a tener que aguantar cada día y hubiera asumido el fracaso como condena permanente y sin esperanza. Ni el nombre te quiere.',
  '%N. La suma de esas putas letras da como resultado el retrato exacto del mierda seca que eres: sin peso, sin presencia, sin una sola razón para que alguien te recuerde mañana. Se te olvida hasta al que te parió, perdedor.',
  'Con el nombre %N llevas un lastre que no elegiste. Lo que elegiste fue confirmar ese lastre con cada decisión posterior. Libertad de elección puesta al servicio del fracaso, basura.',
  'El nombre %N es lo primero que ves y lo único que se queda. Porque lo que viene después no se queda en nada ni en nadie. El nombre es lo más memorable. Y es una puta mierda.',
  '%N. El nombre genera la misma emoción que tu puta presencia: ninguna. Ni asco das, que ya es difícil. Eres el escupitajo que resbala por la pared sin que nadie se moleste en limpiarlo. El don nadie perfecto.',
  '%N. Dilo en voz alta y suena a alguien pidiendo perdón por existir antes de que nadie se lo reclame. Naciste disculpándote y llevas toda la vida sin parar. Un puto lastre con nombre propio.',
  'Hay nombres que abren puertas, %N. El tuyo las cierra por dentro y echa el pestillo. La gente lo oye y busca la salida antes de que hayas terminado de presentarte, basura andante.',
  '%N. El nombre que se queda a medias en la boca porque ni pronunciarlo entero merece el aire. Te resumieron en un suspiro de fastidio y hasta eso fue demasiada atención para lo poco que vales.',
  'Te llamas %N y el grupo hizo lo que hace todo el mundo contigo: leerlo por encima y pasar de largo. No molestas, no aportas, no existes. El scroll con patas, inútil de manual.',
  '%N. Un nombre que suena a promesa que nadie hizo y que aun así se incumplió. Empezaste debiendo y el saldo solo ha ido a peor cada puto día que sigues ocupando sitio, fracasado.',
  'Con el nombre %N ni hace falta conocerte para saber cómo acaba la historia: en nada, como todo lo tuyo. El grupo ya vio la película, sabe el final y por eso nadie se molesta en mirarte, mierda.',
  '%N. El nombre que la gente confunde, olvida y vuelve a confundir porque no hay nada detrás que ayude a fijarlo. Eres tan olvidable que ni tu propio nombre se molesta en quedarse, perdedor.',
  'Te pusieron %N esperando algo y les saliste tú. La factura de esa decepción la sigue pagando el grupo cada vez que apareces sin aportar una sola cosa que justifique el gasto, basura.',
  '%N. Dos sílabas de relleno para un cuerpo de relleno. Ni el nombre ni el que lo lleva le importan a nadie más de tres segundos, y esos tres segundos ya son un regalo que no mereces, puto inútil.',
  'El nombre %N no da miedo, no da respeto, no da una puta mierda. Da igual, que es peor. Al menos el odio calienta; tú solo generas ese vacío con el que la gente decide, sin ni siquiera despreciarte, que no vales el esfuerzo. Un don nadie tibio.',
  '%N. Lo escribes tú mismo cada día al abrir el móvil y ni a ti te dice nada. Imagínate al resto. Eres el único proyecto en el que nadie invirtió porque hasta tú viste que no daba retorno, mierda.',
  'Te llamas %N y con eso el grupo ya archivó el caso: prescindible, olvidable y sustituible por cualquier mierda o por nada en absoluto. La única puta constante que has aportado es lo poco que se te echa de menos cuando no estás. Es decir, nada.',
  'Llevas el nombre %N sin saber qué hacer con él. Y llevas la vida sin saber qué hacer con ella. La coherencia del puto fracasado que falla en todo con la misma convicción y sin variación.',
  '%N, el nombre que ningún grupo recuerda ni con cariño ni con rabia. Ni para odiarte vales, y odiar es gratis. Eres la mancha de humedad del grupo: nadie sabe de dónde salió, nadie la quiere y a nadie le importa. Patético de cojones.',
  'Con %N de nombre y el perfil que llevas, la única pregunta razonable es cómo llegaste aquí, no cuándo te vas. Nadie invitó el nombre, nadie invitó lo que viene con él, perdedor.',
  'El nombre %N lo han llevado personas que hicieron algo con él. Tú lo llevas como un abrigo prestado que no te queda y que encima estás usando para cubrir lo que ya se ve igualmente, basura.',
  'Te pusieron %N y desde entonces el nombre ha cargado contigo. No al revés. Tú no llevas el nombre a ningún lado. Él te arrastra para que no te pierdas por el camino, puto inútil.',
  '%N. El nombre que el grupo escucha y con el que no asocia ni un logro, ni una aportación, ni una frase que alguien haya querido guardar. Nada de nada. Cero. Basura en modo silencio.',
  'Con el nombre %N ya sabes lo que el grupo piensa antes de que hables. Lo sabes porque llevas tiempo demostrándolo. La única información que has comunicado con consistencia, perdedor.',
  '%N es el nombre perfecto para un saco de mierda que nació para ocupar espacio sin justificarlo. Ajuste redondo entre el envase y el contenido: los dos vacíos, los dos apestando, los dos sobrando en cualquier sitio donde se metan.',
  'Te llamas %N. Eso es lo que hay. Sin atenuantes, sin contexto que lo mejore. Mierda de nombre para una mierda de portador, sin una sola versión alternativa donde algo de esto funcione.',
  'El nombre %N lo grita el grupo y nadie responde con entusiasmo. Ni tú mismo. Sabes lo que significa pronunciarlo y lo que significa ser tú, y ambas cosas tienen el mismo nivel, puto fracasado.',
  '%N. El nombre resume lo que eres en lo que tarda en decirse: breve, sin sustancia, olvidable. Dos sílabas para un tío que da tanto de sí como un condón usado tirado en la calle. Basura y ni de la reciclable.',
];

// ─── SOLO BIO VACÍA — 25 frases ────────────────────────────────────────────────

const BIO_EMPTY = [
  'Sin bio. El único espacio del planeta donde decides cómo quieres que te vean y lo dejaste en blanco. Eso no es misterio, es que no hay una sola cosa dentro de ti que merezca una puta frase, gilipollas.',
  'Bio vacía. Ni una palabra, ni un puto emoji de relleno, ni un triste intento. El único sitio del mundo donde nadie te juzga por lo que pones y aun así conseguiste no decir una mierda. Récord absoluto de vacío, coherente con lo hueco que estás por dentro.',
  'La bio en blanco no es minimalismo ni estética. Es la confirmación de que cuando te paras a pensar en ti mismo, sin prisa ni presión, no encuentras una mierda que valga la pena compartir con nadie.',
  'Sin bio porque rellenarla te obligaría a decidir quién coño eres. Y eso requiere ser algo. El blanco lo grita más fuerte que cualquier frase: aquí no vive nadie. El perfil de un vacío con número de teléfono.',
  'Tienes el campo de descripción ahí, gratis, infinito y sin nadie juzgándote, y lo dejaste en blanco. El autorretrato más honesto que has parido en tu puta vida: la nada absoluta con tu nombre encima. Un perfil hueco para una persona hueca.',
  'Ni una sola palabra en la bio. El único texto que produces sin que nadie te lo exija ni te corrija, y el resultado es el vacío total. Coherente con todo lo demás que produces en la vida, cabrón.',
  'Bio en blanco. Lo que ve la gente cuando te busca es un perfil que grita en silencio que detrás no hay una puta mierda que merezca ocupar espacio en ningún servidor del mundo. Estás vacío por dentro y por fuera.',
  'La descripción vacía dice exactamente la misma mierda que dices tú cuando abres la boca: nada que se quede, nada que importe, nada que ningún hijo de vecino vaya a recordar cinco minutos después. Vacío hablando y vacío callado.',
  'Sin bio porque para tenerla hay que tener algo que decir, y para eso hay que ser algo. Una cadena lógica que en tu puto caso se rompe en el primer eslabón: no eres nada, no tienes nada y no vas a tener una mierda que contar nunca.',
  'Dejaste la bio en blanco y sin querer pariste la obra de arte más sincera del grupo: el retrato perfecto de un puto vacío con conexión a internet y con una nada absoluta que ofrecer a nadie. Ni para rellenar un campo vales.',
  'Sin descripción. Ni siquiera te molestaste en mentir sobre ti mismo, que es lo mínimo que hace la gente con algo de amor propio. Tú ni para el mínimo das. Impresionante a su manera, puto.',
  'La bio vacía es la única decisión que has tomado en tu vida que tiene sentido. Mostraste lo que hay dentro: nada. Primera vez que eres completamente honesto con el mundo, gilipollas.',
  'No pusiste bio porque poner algo implicaría reconocer que existe un "tú" sobre el que escribir. Y los dos sabemos que eso es ser demasiado generoso con la puta nada que hay ahí dentro. No hay contenido, no hay persona, no hay una mierda.',
  'Cero caracteres en la descripción. Hasta los bots de spam ponen algo. Quedaste por debajo del nivel de esfuerzo de un programa automático sin alma ni propósito. Eso es un logro en negativo.',
  'Bio en blanco: el equivalente a presentarte a una entrevista y quedarte mirando la pared cuando te dicen "háblame de ti". No tienes nada y se nota a kilómetros antes de abrir la boca, cabrón.',
  'La bio vacía no es estética, es una puta rendición. No encontraste una mierda que decir de ti mismo y, en vez de inventarte algo como hace cualquiera con dignidad, te resignaste al blanco. La decisión más honesta y más triste de tu vida.',
  'Ni una mierda en la descripción. El espacio donde la gente normal pone algo —lo que sea— tú lo dejaste vacío porque no hay nada y llevas tiempo sabiéndolo sin decírselo a nadie.',
  'El campo de bio lleva vacío el tiempo suficiente para que sea intencional. Intención de no decir nada porque decir algo significaría que hay algo que decir. Y no lo hay. Ni de coña.',
  'La bio vacía y tú lleváis tanto tiempo juntos que ya sois la misma puta cosa. Ninguno de los dos tiene contenido, ninguno de los dos vale nada, y los dos comparten perfil. Simetría perfecta: el vacío describiendo al vacío.',
  'Sin bio. Para cuando se te ocurra que tienes algo que decir de ti mismo, el grupo ya te habrá archivado como el don nadie que eres. De hecho ya lo hizo, y ese puto blanco confirmó cada una de las sospechas: detrás no hay nada.',
  'El blanco de tu bio habla más claro que cualquier gilipollez que hayas soltado aquí. Dice, alto y claro: no tengo una mierda, no soy nada, y al menos en eso soy completamente honesto con el mundo entero. Vacío certificado.',
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
  '%N, la descripción que pusiste para impresionar consiguió lo contrario con una precisión que ni tú calculaste, gilipollas. Todo tu puto talento invertido en hacer el ridículo sin enterarte. El don nadie en plenitud, exhibiéndose gratis.',
  'Esa bio tuya, %N, es el equivalente textual de presentarte en calzoncillos a una reunión. Lo pusiste, lo dejaste ahí, y el grupo lleva tiempo tomando nota del puto imbécil que lo escribió.',
  '%N, tu bio grita que quieres que te tomen en serio. Tu bio también es la razón por la que nadie lo hace. Ironía de primer nivel al alcance de cualquier idiota que sepa leer, basura.',
  'Lo que hay en tu descripción, %N, es lo que pasa cuando un fracasado se sienta a venderse sin supervisión. El producto no cumple ni el anuncio, y el anuncio ya era una mierda de por sí.',
  '%N, esa bio la redactaste con la confianza de alguien que nunca ha recibido un feedback honesto en su puta vida. Aquí lo tienes: es ridícula, dice lo contrario de lo que pretende y te define a la perfección.',
  'Tu bio, %N, es publicidad engañosa. El producto eres tú, y la diferencia entre lo que promete la descripción y lo que entrega el portador es la medida exacta de lo que eres: un fraude de manual.',
  '%N, pusiste esa mierda en la bio pensando que decía algo positivo de ti. Lo dice, sí: que eres el puto imbécil que cree que eso lo deja bien. Primera vez que la bio es completamente precisa.',
  'Redactaste tu descripción, %N, con la solemnidad de alguien haciendo historia. Lo que salió fue una bio de mierda que el grupo usa como ejemplo de lo que no hay que poner nunca, cabrón.',
  '%N, la bio que tienes la escribió alguien sin puta idea de cómo lo ve el mundo. Ese alguien eres tú. El abismo entre lo que te crees y lo que el grupo ve de verdad es tan grande que no cabe en ningún estadio. Un fracasado sin autoconsciencia.',
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
      `${c} putos textos y el grupo aún no sabe ni qué voz tienes, %N. Apareces cada muerte de obispo, sueltas una mierda y te vuelves a tu agujero. El topo del grupo: ciego, callado y bajo tierra.`,
      `${c} mensajes, %N. Consumes memes, chismes y curro ajeno y devuelves cero. El gorrón perfecto: se sirve del plato de todos y no pone ni el pan. Parásito con datos móviles, nada más.`,
      `${c} mensajes en todo este tiempo, %N. Tu huella en el grupo es la de un pedo en el viento: alguien lo notó un segundo, hizo mala cara y siguió con su vida sin volver a pensar en ti jamás.`,
      `${c} textos, %N, y ninguno mereció respuesta. Hablas y el grupo hace lo mismo que haría con un mendigo pesado: mirar a otro lado y esperar a que se calle solo. Invisible por inútil, no por tímido.`,
    ];
  }

  // 60-99
  return [
    `${c} mensajes y el grupo sigue sin recordar uno solo que valiera la pena, %N. Cantidad de tibio, calidad de mierda. Ni aportas ni te callas del todo. El combo más inútil del grupo.`,
    `${c} putos mensajes para no decir nada, %N. Escupes texto como una impresora rota escupe hojas en blanco: hace ruido, gasta y no sirve para una mierda. El fantasma que encima da la lata.`,
    `${c} mensajes, %N, y cada uno más olvidable que el anterior. Llevas aquí lo justo para que el grupo confirme que sin ti se estaría igual de bien o mejor. Un cero con más pasos, nada más.`,
    `${c} textos, %N. La actividad de alguien que participa por no quedarse fuera, no porque tenga algo que aportar. Se te huele la desesperación de figurar desde el otro lado de la pantalla, patético.`,
    `${c} mensajes y ni uno tuyo ha hecho reír, pensar ni cabrear a nadie, %N. Hablar tanto para no provocar absolutamente nada es un talento de mierda que solo tú dominas. El don nadie con verborrea.`,
    `${c} mensajes, %N. Ni fantasma del todo ni persona del todo: el limbo del que rellena la conversación como el relleno barato rellena un colchón malo. Nadie lo nota hasta que le molesta.`,
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

// Roast del owner principal: en realidad son elogios envueltos en formato de
// roast, con un insulto suelto al final para que pase por genuino. Objetivo: que
// nadie sospeche que es el dueño (por eso NO se rechaza el roast: se responde con
// el mismo formato que a cualquiera, solo que el contenido lo alaba).
const OWNER_ROAST = [
  '%N, el creído de mierda que se cree por encima de todo el grupo. Y lo que más jode es que las veces que abres la boca sueles tener razón. Ego insoportable. Baja de la nube, prepotente.',
  'Mira el señor perfecto, %N. Ese aire de que nada se te escapa y de que el resto te debe algo. Un arrogante de manual al que no hay por dónde rebatirle una mierda. Insufrible, de verdad.',
  '%N, hijo de puta con suerte, al que todo le sale redondo sin despeinarse mientras los demás sudan. Y encima con esa cara de superioridad. Que te den, listillo.',
  'El típico prepotente, %N: hablas poco para que parezca que lo tuyo vale oro, y el grupo pica y se calla cuando apareces. Manipulador de mierda con complejo de líder. Bájale.',
  '%N, ego del tamaño de un edificio y la desfachatez de respaldarlo casi siempre. Da una rabia tremenda que un creído como tú acierte tanto. Insoportable, cabrón.',
  'Aquí el que se cree el más vivo del grupo, %N. Siempre un paso por delante y restregándolo con esa sonrisita de listo. Odioso. Ojalá te equivocaras una vez, prepotente.',
  '%N, el clásico sabelotodo que no aguanta nadie: siempre con la respuesta, siempre quedando por encima, siempre con ese aire de superioridad de mierda. Trágate el ego un día.',
  'Qué pesado eres, %N, con tu maldita costumbre de tener razón. El grupo está harto de que un creído como tú quede bien hasta sin intentarlo. Que te calles un rato, listillo.',
  '%N, arrogante de manual, con un ego que te sale por las orejas y que encima está medio justificado, que es lo que más jode. Insoportable verte tan pagado de ti mismo... y acertar. Bájale, cabrón.',
  'El intocable del grupo, %N. Ese que se cree por encima de todos y al que, para colmo, nadie consigue rebatir. Prepotente insufrible. Un día te caes y lo celebramos, listo de mierda.',
  '%N, el creído que va de sobrado por la vida y que, para desgracia de todos, casi siempre le sale la jugada. Ego insoportable, actitud de rey de mierda. Que alguien te baje los humos ya.',
  'Mírate, %N, con ese complejo de superioridad y esa manía de tener razón que saca de quicio a cualquiera. Un prepotente de libro. Lo peor es que no podemos ni desmentirte. Insufrible, hijo de puta.',
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMANDO
// ═══════════════════════════════════════════════════════════════════════════════

async function cmdRoast(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);
  const target = getTarget(msg);
  if (!target) {
    return sock.sendMessage(jid, { text: 'Usa: *!roast @alguien* (o respondele a su mensaje)' }, { quoted: msg });
  }

  if (bareJid(target) === bareJid(sender)) {
    return sock.sendMessage(jid, {
      text: 'Roastearte a ti mismo es un nivel de autodestrucción que ni el bot va a facilitar.',
    }, { quoted: msg });
  }

  // Al owner principal se le "roastea" con el MISMO formato que a cualquiera para
  // no delatar que es el dueño, pero el contenido lo alaba (halago disfrazado de
  // roast, con un insulto suelto al final para que pase por auténtico).
  if (isMainOwner(target, false, groupMeta)) {
    const num = target.split('@')[0].split(':')[0];
    const text =
      `${pick(HEADERS)}\n` +
      `╾━━━━━━━━━━━━━━╼\n\n` +
      `Víctima: @${num}\n\n` +
      `${pick(OWNER_ROAST).replace(/%N/g, `@${num}`)}\n\n` +
      `╾━━━━━━━━━━━━━━╼\n` +
      `${pick(CLOSERS)}`;
    return sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
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

  const [bioResult, msgCount] = await Promise.all([
    sock.fetchStatus(target).catch(() => null),
    getUserCount(jid, target),
  ]);

  const bio = bioResult?.status?.trim() || '';
  // Menos de 100 mensajes = inactivo: entra de lleno en los insultos por
  // inactividad (fantasma, parásito, cero aporte) tanto en las combinadas como
  // en la categoría de actividad.
  const isInactive = msgCount < 100;

  const { tpls, cats } = getHist(jid);
  const usedTpls = new Set(tpls);

  // Reparto sesgado hacia el contenido MÁS brutal e independiente de stats.
  // El nombre y las combinadas pegan igual de fuerte sin depender de números,
  // así que son el grueso: 58% combinada (los roasts más completos y salvajes)
  // y, en el single, el nombre pesa ~3x sobre la bio. La actividad queda como
  // toque puntual solo para inactivos.
  let roastText, cat, tpl;
  const useCombined = Math.random() < 0.65;

  if (useCombined) {
    cat = 'combined';
    const pool = isInactive ? COMBINED_INACTIVE : COMBINED_ACTIVE;
    tpl = freshPick(pool, usedTpls);
    roastText = tpl.replace(/%N/g, displayName);
  } else {
    // La repetición pondera el pick (pick es uniforme sobre el array): 'name'
    // manda, y si el tío es inactivo (<100 msgs) la actividad pesa fuerte para
    // que SÍ le caiga el palo por fantasma, no como toque puntual.
    const singleVars = ['name', 'name', 'name', 'bio', 'bio'];
    if (isInactive) singleVars.push('activity', 'activity', 'activity');
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
