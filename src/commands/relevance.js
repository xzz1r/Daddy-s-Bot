'use strict';

// !relevancia / !relevance — mide el peso real de alguien en el grupo por la
// cantidad EXACTA de mensajes que lleva enviados (misma fuente que !count).
//
// Tramos:
//   < 300  → parásito: inactivo, mirón, gorrón. Insulto brutal.
//   300-699 → intermedio: está, pero no pesa.
//   700+   → relevante: sostiene el grupo de verdad.
//
// El owner principal es un fantasma para el bot: sus mensajes NO se cuentan
// (messageHandler lo excluye), así que su conteo real es 0. Para no delatarlo
// con un 0 absurdo, se le fuerza el tramo alto con una cifra estable y creíble.

const { getTargetOrSelf, isMainOwner } = require('../utils/wa');
const { pickFresh, fmt, ordenarPorDureza } = require('../utils/helpers');
const { getUserCount } = require('../utils/messageCounter');

const MID_MIN  = 300;
const HIGH_MIN = 700;


// ═══════════════════════════════════════════════════════════════════════════
// TRAMO BAJO — parásito / mirón / gorrón. %N = mención, %C = conteo exacto.
// ═══════════════════════════════════════════════════════════════════════════

let PARASITO = [
  '%N, %C mensajes. Llevas aquí de mirón, leyendo lo que otros se curran y sin soltar una puta palabra. El grupo lo nota cada día, joder.',
  '%N, %C mensajes en el contador. Llevas aquí de mirón, leyendo lo que otros se curran y sin soltar una puta palabra. Mierda.',
  '%N, %C mensajes de silencio útil para nadie. Parasitas el hilo y el ranking te señala. El grupo lo nota cada día, gilipollas.',
  '%N, %C mensajes en el contador de silencio útil para nadie. Parasitas el hilo y el ranking te señala. Patético.',
  '%N, %C mensajes. Estás en el grupo como el mueble: ocupas sitio y no aportas. El grupo lo nota cada día, desperdicio.',
  '%N, %C mensajes en el contador. Estás en el grupo como el mueble: ocupas sitio y no aportas. El grupo lo nota cada día, asco.',
  '%N, %C mensajes. El fantasma con nick: lees, no escribes, y el contador te delata. El grupo lo nota cada día, fracasado.',
  '%N, %C mensajes en el contador. El fantasma con nick: lees, no escribes, y el contador te delata. El grupo lo nota cada día, joder.',
  '%N, %C mensajes. Relevancia cero: el chat funcionaría igual sin tu lectura silenciosa. El grupo lo nota cada día, cabrón.',
  '%N, %C mensajes en el contador. Relevancia cero: el chat funcionaría igual sin tu lectura silenciosa. Gilipollas.',
  '%N, %C mensajes. Parasito de notificaciones: abres, miras, cierras, nada. Y el ranking no miente, basura.',
  '%N, %C mensajes en el contador. Parasito de notificaciones: abres, miras, cierras, nada. El grupo lo nota cada día, desperdicio.',
  '%N, %C mensajes. El ranking de irrelevancia tiene cabeza de cartel y eres tú. El grupo lo nota cada día, pringado.',
  '%N, %C mensajes en el contador. El ranking de irrelevancia tiene cabeza de cartel y eres tú. El grupo lo nota cada día, fracasado.',
  '%N, %C mensajes. No es discreción: es ausencia de aporte disfrazada de estar. El grupo lo nota cada día, coño.',
  '%N, %C mensajes en el contador. No es discreción: es ausencia de aporte disfrazada de estar. El grupo lo nota cada día, cabrón.',
  '%N, %C mensajes. El grupo produce: tú consumes en silencio. Diagnóstico claro. El grupo lo nota cada día, ridículo.',
  '%N, %C mensajes en el contador. El grupo produce: tú consumes en silencio. Diagnóstico claro. El grupo lo nota cada día, basura.',
  '%N, %C mensajes. Fantasma documentado: el bot solo pone el número al vacío. Y el ranking no miente, cutre.',
  '%N, %C mensajes en el contador. Fantasma documentado: el bot solo pone el número al vacío. El grupo lo nota cada día, pringado.',
  '%N, %C mensajes. Estás de relleno en el chat: el relleno no pide turno de palabra. El grupo lo nota cada día, mierda.',
  '%N, %C mensajes en el contador. Estás de relleno en el chat: el relleno no pide turno de palabra. El grupo lo nota cada día, coño.',
  '%N, %C mensajes. Relevancia bajo mínimos: el hilo no te extraña cuando faltas. El grupo lo nota cada día, patético.',
  '%N, %C mensajes en el contador. Relevancia bajo mínimos: el hilo no te extraña cuando faltas. El grupo lo nota cada día, ridículo.',
  '%N, %C mensajes. Parasitas el contador sin dejar una sola frase útil. Y el ranking no miente, asco.',
  '%N, %C mensajes en el contador. Parasitas el contador sin dejar una sola frase útil. El grupo lo nota cada día, cutre.',
  '%N, %C mensajes. Mirón profesional: el oficio no cotiza en este ranking. Y el ranking no miente, joder.',
  '%N, %C mensajes en el contador. Mirón profesional: el oficio no cotiza en este ranking. El grupo lo nota cada día, mierda.',
  '%N, %C mensajes. El silencio no te hace misterioso: te hace irrelevante. El grupo lo nota cada día, gilipollas.',
  '%N, %C mensajes en el contador. El silencio no te hace misterioso: te hace irrelevante. El grupo lo nota cada día, patético.',
  '%N, %C mensajes. Ocupas un slot del grupo y el slot no se nota si se libera. El grupo lo nota cada día, desperdicio.',
  '%N, %C mensajes en el contador. Ocupas un slot del grupo y el slot no se nota si se libera. El grupo lo nota cada día, asco.',
  '%N, %C mensajes. Fantasma con historial de lectura y cero de escritura valiosa. El grupo lo nota cada día, fracasado.',
  '%N, %C mensajes en el contador. Fantasma con historial de lectura y cero de escritura valiosa. El grupo lo nota cada día, joder.',
  '%N, %C mensajes. El chat no te necesita: el ranking de relevancia lo confirma. El grupo lo nota cada día, cabrón.',
  '%N, %C mensajes en el contador. El chat no te necesita: el ranking de relevancia lo confirma. El grupo lo nota cada día, gilipollas.',
  '%N, %C mensajes. El chat no te necesita: el contador de relevancia de relevancia lo confirma. El grupo lo nota cada día, ridículo.',
  '%N, %C mensajes. Parasito del hilo: te alimentas de lo ajeno y no devuelves. El grupo lo nota cada día, basura.',
  '%N, %C mensajes en el contador. Parasito del hilo: te alimentas de lo ajeno y no devuelves. El grupo lo nota cada día, desperdicio.',
  '%N, %C mensajes. Irrelevancia medible: el bot no inventa, cuenta. Y el ranking no miente, pringado.',
  '%N, %C mensajes en el contador. Irrelevancia medible: el bot no inventa, cuenta. El grupo lo nota cada día, fracasado.',
  '%N, %C mensajes. Parasitas el grupo con la elegancia de quien no se entera de que molesta. El grupo lo nota cada día, coño.',
  '%N, %C mensajes. El fantasma del ranking: presente en la lista, ausente en el aporte. El grupo lo nota cada día, cabrón.',
  '%N, %C mensajes. Relevancia en el sótano: el hilo no te cita porque no hay qué citar. El grupo lo nota cada día, gilipollas.',
  '%N, %C mensajes. Mirón de primera: el título no se disputa. Y el ranking no miente, patético.',
  '%N, %C mensajes. El chat produce sin ti: el experimento mental ya está hecho. El grupo lo nota cada día, ridículo.',
  '%N, %C mensajes. Silencio de quien no tiene nada y ocupa sitio igual. Y el ranking no miente, basura.',
  '%N, %C mensajes. Irrelevancia con nick: el pack completo del que no pinta nada. El grupo lo nota cada día, desperdicio.',
  '%N, %C mensajes. Parasito documentado por %C mensajes de nada útil. Y el ranking no miente, asco.',
  '%N, %C mensajes. El contador te ve: el hilo no te necesita. Y el ranking no miente, cutre.',
  '%N, %C mensajes. Fantasma de los que leen el drama y nunca lo firman. Y el ranking no miente, pringado.',
  '%N, %C mensajes. Relevancia cero con evidencia numérica. Y el ranking no miente, fracasado.',
  '%N, %C mensajes. Ocupas espacio de miembro: el espacio no se defiende solo. Y el ranking no miente, joder.',
  '%N, %C mensajes. Parasitas notificaciones ajenas como deporte. Y el ranking no miente, mierda.',
  '%N, %C mensajes. El ranking de aporte te deja donde mereces: abajo. Y el ranking no miente, coño.',
  '%N, %C mensajes. Silencio que no es estrategia: es vacío. Y el ranking no miente, cabrón.',
  '%N, %C mensajes. Mirón con historial: el bot traduce historial a veredicto. El grupo lo nota cada día, gilipollas.',
  '%N, %C mensajes. Irrelevante de forma estable: no es un mal mes. Y el ranking no miente, patético.',
  '%N, %C mensajes. El grupo no se cae sin ti: se aligera. Y el ranking no miente, ridículo.',
  '%N, %C mensajes. Parasito del contador: sumas presencia y restas sustancia. El grupo lo nota cada día, basura.',
  '%N, %C mensajes. Fantasma oficial del ranking de relevancia. Y el ranking no miente, desperdicio.',
  '%N, %C mensajes.  %C mensajes y cero eco útil en el hilo. Y el ranking no miente, asco.',
  '%N, %C mensajes. La relevancia no se finge leyendo: se demuestra escribiendo. El grupo lo nota cada día, cutre.',
  '%N, %C mensajes. Parasitas el chat y el ranking te hace el retrato. Y el ranking no miente, pringado.',
  '%N, %C mensajes. Irrelevancia con sello del comando. Y el ranking no miente, fracasado.',
  '%N, %C mensajes. El mirón del grupo tiene nombre: el tuyo. Y el ranking no miente, joder.',
  '%N, %C mensajes. Silencio de relleno: el relleno se expulsa cuando toca. Y el ranking no miente, mierda.',
  '%N, %C mensajes. Relevancia bajo tierra: %C mensajes de prueba. Y el ranking no miente, coño.',
  '%N, %C mensajes. Parasito sin gracia: ni el silencio tiene estilo. Y el ranking no miente, cabrón.',
  '%N, %C mensajes. El hilo no te abre hueco: tú no abriste ninguno. Y el ranking no miente, gilipollas.',
  '%N, %C mensajes. Fantasma con contador: la peor combinación. Y el ranking no miente, patético.',
  '%N, %C mensajes. Irrelevante y documentado: no hay debate. Y el ranking no miente, ridículo.',
  '%N, %C mensajes. Parasitas el promedio de actividad sin subir el de calidad. El grupo lo nota cada día, basura.',
  '%N, %C mensajes. El ranking te señala: el resto del grupo ya había señalado. El grupo lo nota cada día, desperdicio.',
  '%N, %C mensajes. Mirón crónico: el oficio no tiene jubilación aquí. Y el ranking no miente, asco.',
  '%N, %C mensajes. Relevancia inexistente con %C mensajes de coartada. Y el ranking no miente, cutre.',
  '%N, %C mensajes. El chat no nota tu ausencia: nota tu falta de aporte. Y el ranking no miente, pringado.',
  '%N, %C mensajes. Parasito del hilo: diagnóstico cerrado. Y el ranking no miente, fracasado.',
  '%N, %C mensajes. Silencio que no aporta misterio: aporta hueco. Y el ranking no miente, joder.',
  '%N, %C mensajes. Irrelevancia medible en %C mensajes. Y el ranking no miente, mierda.',
  '%N, %C mensajes. Fantasma que el bot se cansa de no oír. Y el ranking no miente, coño.',
  '%N, %C mensajes. Parasitas y el contador no te absuelve. Y el ranking no miente, cabrón.',
  '%N, %C mensajes. Relevancia en números rojos de sustancia. Y el ranking no miente, gilipollas.',
  '%N, %C mensajes. El mirón tiene %C mensajes y cero frases que citar. Y el ranking no miente, patético.',
  '%N, %C mensajes. Ocupas sitio de quien podría escribir: el sitio se puede liberar. El grupo lo nota cada día, ridículo.',
  '%N, %C mensajes. Parasito sin narrativa heroica: solo el número. Y el ranking no miente, basura.',
  '%N, %C mensajes. Irrelevante de fábrica: el comando solo lo nombra. Y el ranking no miente, desperdicio.',
  '%N, %C mensajes. El hilo sigue sin ti: el experimento ya está hecho cada día. El grupo lo nota cada día, asco.',
  '%N, %C mensajes. Fantasma del ranking: presente en la lista, ausente en la memoria del hilo. El grupo lo nota cada día, cutre.',
  '%N, %C mensajes. Parasitas notificaciones: el deporte de los que no firman. El grupo lo nota cada día, pringado.',
  '%N, %C mensajes. Relevancia cero: %C mensajes no la inventan. Y el ranking no miente, fracasado.',
  '%N, %C mensajes. Mirón profesional con carnet del contador. Y el ranking no miente, joder.',
  '%N, %C mensajes. Silencio de quien no aporta: el bot no lo confunde con elegancia. El grupo lo nota cada día, mierda.',
  '%N, %C mensajes. Irrelevante y estable: el peor pronóstico. Y el ranking no miente, coño.',
  '%N, %C mensajes. Parasito del grupo documentado sin anestesia. Y el ranking no miente, cabrón.',
  '%N, %C mensajes. El ranking de aporte te deja en el sótano con %C mensajes de testigo. El grupo lo nota cada día, gilipollas.',
  '%N, %C mensajes. Relevancia bajo mínimos legales del chat. Y el ranking no miente, ridículo.',
  '%N, %C mensajes. Parasitas el hilo y el hilo no te devuelve eco. Y el ranking no miente, basura.',
  '%N, %C mensajes. Mirón: el título se gana no escribiendo nada útil. Y el ranking no miente, desperdicio.',
  '%N, %C mensajes. Irrelevancia con %C mensajes de prueba cargada. Y el ranking no miente, asco.',
  '%N, %C mensajes. El chat no te cita porque no hay material. Y el ranking no miente, cutre.',
  '%N, %C mensajes. Parasito sin estilo: ni el vacío tiene gracia. Y el ranking no miente, pringado.',
  '%N, %C mensajes. Silencio que el bot traduce a irrelevancia. Y el ranking no miente, fracasado.',
  '%N, %C mensajes. Relevancia inexistente: el comando lo dice en claro. Y el ranking no miente, joder.',
  '%N, %C mensajes. Fantasma oficial: %C mensajes y el mismo veredicto. Y el ranking no miente, mierda.',
  '%N, %C mensajes. Parasitas el contador de miembros sin el de aporte. Y el ranking no miente, coño.',
  '%N, %C mensajes. Mirón del drama ajeno: el drama no te nombra. Y el ranking no miente, cabrón.',
  '%N, %C mensajes. Irrelevante de forma que ya no sorprende. Y el ranking no miente, gilipollas.',
  '%N, %C mensajes. El grupo produce: tú miras. Diagnóstico en una línea. Y el ranking no miente, patético.',
  '%N, %C mensajes. Parasito del ranking: el retrato es este mensaje. Y el ranking no miente, ridículo.',
  '%N, %C mensajes. Relevancia en el fondo del pozo con %C mensajes de lastre. El grupo lo nota cada día, basura.',
  '%N, %C mensajes. Fantasma que no deja frase: solo rastro de lectura. Y el ranking no miente, asco.',
  '%N, %C mensajes. Parasitas y el bot no ofrece indulgencia. Y el ranking no miente, cutre.',
  '%N, %C mensajes. Mirón con %C mensajes: el número no te salva. Y el ranking no miente, pringado.',
  '%N, %C mensajes. Irrelevancia documentada: punto final del tramo. Y el ranking no miente, fracasado.',
  '%N, %C mensajes. El hilo no te necesita: el ranking lo certifica. Y el ranking no miente, joder.',
  '%N, %C mensajes. Parasito sin misterio: el vacío se ve. Y el ranking no miente, mierda.',
  '%N, %C mensajes. Relevancia cero con evidencia de %C mensajes. Y el ranking no miente, coño.',
  '%N, %C mensajes. Fantasma del chat: el oficio no se discute. Y el ranking no miente, cabrón.',
  '%N, %C mensajes. Mirón crónico: el contador es el carnet. Y el ranking no miente, patético.',
  '%N, %C mensajes. Irrelevante y el grupo lo sabía antes del comando. Y el ranking no miente, ridículo.',
  '%N, %C mensajes. Silencio que no aporta: el bot no lo confunde con estrategia. El grupo lo nota cada día, basura.',
  '%N, %C mensajes. Parasito del hilo: %C mensajes de coartada inútil. Y el ranking no miente, desperdicio.',
  '%N, %C mensajes. Relevancia bajo tierra: no hay ascensor. Y el ranking no miente, asco.',
  '%N, %C mensajes. Fantasma con nick: el pack del que no pinta nada. Y el ranking no miente, cutre.',
  '%N, %C mensajes. Parasitas el promedio y no subes ninguno que importe. Y el ranking no miente, pringado.',
  '%N, %C mensajes. Mirón: el drama se escribe sin tu firma. Y el ranking no miente, fracasado.',
  '%N, %C mensajes. Irrelevancia medible y estable. Y el ranking no miente, joder.',
  '%N, %C mensajes. El chat sigue igual sin tu aporte: porque no hay aporte. Y el ranking no miente, mierda.',
  '%N, %C mensajes. Parasito documentado por el comando de relevancia. Y el ranking no miente, coño.',
  '%N, %C mensajes. Relevancia inexistente: %C mensajes no crean sustancia. Y el ranking no miente, cabrón.',
  '%N, %C mensajes. Fantasma oficial del sótano del ranking. Y el ranking no miente, gilipollas.',
  '%N, %C mensajes. Parasitas el grupo: el grupo no te parasita de vuelta. Y el ranking no miente, patético.',
  '%N, %C mensajes. Mirón con historial vacío de frases útiles. Y el ranking no miente, ridículo.',
  '%N, %C mensajes. Irrelevante de fábrica: este mensaje es el sello. Y el ranking no miente, basura.',
  '%N, %C mensajes. Silencio de quien ocupa sitio: el sitio se puede liberar. El grupo lo nota cada día, desperdicio.',
  '%N, %C mensajes. Parasito sin gracia ni misterio: solo el número %C. Y el ranking no miente, asco.',
  '%N, %C mensajes. Relevancia en números que dan pena: el bot no suaviza. Y el ranking no miente, cutre.'
];

// ═══════════════════════════════════════════════════════════════════════════
// TRAMO MEDIO — está, pero no pesa. Ni fantasma ni referente.
// ═══════════════════════════════════════════════════════════════════════════

let INTERMEDIO = [
  '%N, %C mensajes. Ni pareces un puto fantasma ni un referente, joder. Vives en ese limbo de mierda donde nadie te odia y nadie te echa de menos tampoco.',
  '%C mensajes, %N. Ya no das pena pero tampoco impresionas ni de coña. Felicidades por escalar del sótano al puto pasillo de en medio.',
  '%N con %C mensajes. Hablas lo justo para que no te llamen mueble y ni una palabra más. Mediocridad calculada con la precisión de un puto contable.',
  'Con %C mensajes, %N, has dejado de ser un cero pero sigues sin ser nadie importante. Empate técnico con la irrelevancia, y así seguirás si no cambias el ritmo.',
  '%N, %C putos mensajes. Suficiente para que te saluden, insuficiente para que te inviten a algo que importe. Así te va la vida en este grupo.',
  '%C mensajes, %N. Estás ahí, en tierra de nadie, aportando lo mínimo indispensable para que nadie te toque los cojones. Gestión de mierda impecable.',
  '%N con %C mensajes. No jodes al grupo ni lo sostienes. Flotas en medio como una puta boya sin rumbo, ni hundes ni llegas a ningún puerto.',
  'Con %C mensajes, %N, tienes justo lo necesario para que el bot no te insulte con ganas. Aprovecha, porque el mérito no da para mucho más.',
  '%N, %C mensajes. Podrías ser alguien aquí y has decidido que con existir a medias te vale. Ambición de mierda, resultado a la altura.',
  '%C mensajes, %N. El grupo te reconoce y sigue sin recordar ni una puta frase tuya. Presencia sí, contenido no. Vaya papelón, cabrón.',
  '%N con %C mensajes. Ni tan mirón como para dar asco ni tan hablador como para dar la turra. El equilibrio perfecto de la nada con nombre.',
  'Con %C mensajes, %N, has salido del pozo a rastras y te has sentado en el borde a fumar. Ni sube ni baja, joder, solo mira.',
  '%N, %C mensajes. Cumples el expediente y ni una gota más. Ese es tu techo y por lo visto te la suda no romperlo nunca.',
  '%C mensajes, %N. Suficiente para no ser el hazmerreír del grupo, insuficiente para que nadie te cite en una puta conversación importante.',
  '%N con %C mensajes. Estás en esa franja gris donde el grupo te ubica sin esfuerzo y te olvida con la misma facilidad. Anodino de manual, sin paliativos.',
  'Con %C mensajes, %N, no llegas a molestar y tampoco llegas a importar. Zona tibia, la peor de todas para presumir de algo.',
  '%N, %C mensajes. Escribes lo justo para no quedar como el gorrón oficial y te callas antes de que alguien espere algo serio de ti. Estrategia de cobarde.',
  '%C mensajes, %N. Vas tirando en la mitad de la tabla, cómodo, sin destacar ni hundirte. La medianía tiene sus ventajas y tú las explotas todas.',
  '%N con %C mensajes. Ni te has ganado un respeto ni te has ganado un desprecio, joder. Solo una nota media que a nadie le interesa comentar.',
  'Con %C mensajes, %N, apareces cuando la conversación ya está caliente y nunca la enciendes tú. Sumarte es gratis, arrancarla cuesta huevos que no tienes.',
  '%N, %C mensajes. Tienes rodaje para haber dejado huella y solo has dejado una mancha del tamaño de tu esfuerzo real: minúscula.',
  '%C mensajes, %N. El grupo sabe tu nombre y ahí se acaba la relación. Ni fama ni infamia, solo una entrada más en una lista larga.',
  '%N con %C mensajes. Aportas a ráfagas, como quien mea y se sacude rápido para no mojarse. Constancia cero, esfuerzo intermitente, resultado tibio.',
  'Con %C mensajes, %N, estás justo donde nadie te busca ni te destierra. Un puto término medio con menos personalidad que un formulario.',
  '%N, %C mensajes. Ni fantasma ni pilar, un poco de todo y mucho de nada. La fórmula perfecta para que a nadie le importe tu opinión, gilipollas.',
  '%C mensajes, %N. Has subido lo suficiente para dejar de dar vergüenza ajena y te has quedado ahí sentado, la mar de a gusto. Sin ambición ni cojones.',
  '%N con %C mensajes. Tu huella en este grupo es del tamaño de una puta mancha de café: se ve, no molesta, nadie la limpia ni la comenta.',
  'Con %C mensajes, %N, participas lo justo para que el grupo no te dé por perdido. Un salvavidas mediocre agarrado con las dos manos, sin soltarlo nunca.',
  '%N, %C mensajes. Ni escalas ni te hundes, solo flotas en medio como el puto corcho de la fiesta: está, pero nadie brinda por él.',
  '%C mensajes, %N. Te falta constancia para pesar y te sobra pereza para que se note. Esa combinación de mierda te tiene anclado en el medio.',
  '%N con %C mensajes. Has demostrado que sabes escribir y has decidido no demostrar mucho más. Vago con estilo, que tampoco es un mérito, joder.',
  'Con %C mensajes, %N, la tabla te sitúa en la parte que nadie mira ni comenta. Ni gloria ni vergüenza, solo relleno con nombre propio.',
  '%N, %C mensajes. Se te ve capacidad y se te ve pereza a partes iguales, y por ahora está ganando la pereza con ventaja de puta madre.',
  '%C mensajes, %N. Bastante para que no te confundan con un mueble, poco para que alguien te ponga en el podio de nada. Justo la nota que sacas siempre.',
  '%N con %C mensajes. El grupo funcionaría casi igual sin ti, con el matiz de "casi" que te salva por los pelos. No lo sueltes, que es lo único que tienes.',
  'Con %C mensajes, %N, tienes el carisma de un trámite administrativo: necesario a veces, memorable nunca, discutido jamás.',
  '%N, %C mensajes. Escribes cuando ya no hay riesgo y callas cuando toca dar la cara. Timing de cobarde disfrazado de discreción, gilipollas.',
  '%C mensajes, %N. Ocupas la casilla del "normal", que es la casilla que nadie señala con el dedo ni para bien ni para mal. Ahí sigues.',
  '%N con %C mensajes. Has hecho lo suficiente para que el bot no te destroce y lo insuficiente para que te alabe. Justo en el filo, cabrón.',
  'Con %C mensajes, %N, tu implicación es la de quien se cuela en la barbacoa ajena: aparece, come algo y se larga antes de recoger. Comodón de mierda.',
  '%N, %C mensajes. Ni te comprometes ni te desentiendes del todo. Medias tintas que a nadie emocionan y a nadie cabrean, la mar de cómodas para ti.',
  '%C mensajes, %N. Sales en la foto de grupo pero en la segunda fila, sin sonreír. Presente en el registro, ausente en la puta memoria de todos.',
  '%N con %C mensajes. Has evitado la vergüenza del fondo de la tabla y has renunciado a pelear por algo más. Ambición de folio en blanco, gilipollas.',
  'Con %C mensajes, %N, cumples con lo mínimo y te quedas tan ancho. Es una táctica legítima, la más aburrida de todas, pero legítima.',
  '%N, %C mensajes. Te mueves por los márgenes del grupo, ni al frente ni fuera. Zona de confort con wifi y sin un puto compromiso real.',
  '%C mensajes, %N. Tienes la constancia de una promesa de año nuevo: arranca fuerte, se apaga rápido y vuelve a medio gas cuando le apetece.',
  '%N con %C mensajes. Ni sostienes el grupo ni lo hundes, solo lo acompañas a medio metro de distancia. Comodidad rentable, mérito ninguno, joder.',
  'Con %C mensajes, %N, te has ganado el título de "el que está pero no se sabe muy bien para qué". Un puto cargo sin funciones ni honores.',
  '%N, %C mensajes. Podrías tirar para arriba y has elegido quedarte flotando en el medio, que es donde menos esfuerzo cuesta y menos se te exige, cabrón.',
  '%C mensajes, %N. Ese número te salva de la vergüenza del fondo y no te acerca ni de lejos a la gloria de arriba. El eterno centro de la tabla, coño.',
];

// ═══════════════════════════════════════════════════════════════════════════
// TRAMO ALTO — sostiene el grupo de verdad.
// ═══════════════════════════════════════════════════════════════════════════

const RELEVANTE = [
  '%N, %C mensajes. Menudo enganche llevas, joder. No sé si sostienes el grupo o el grupo te sostiene a ti la adicción, pero aquí estás, el primero de la lista.',
  '%C mensajes, %N. Hablas más que nadie en este puto chat, y aunque suene a curro de becario, alguien tiene que mantener esto con vida. Enhorabuena, supongo.',
  '%N con %C mensajes. Si te dieran un euro por mensaje ya habrías dejado el curro. Como no te lo dan, sigues aquí dale que dale, el más activo con diferencia.',
  'Con %C mensajes, %N, eres el puto pilar de este grupo, aunque probablemente a costa de tu vida social real. Se agradece el sacrificio, la verdad.',
  '%N, %C mensajes. Escribes tanto que el resto solo tiene que asentir. No sé si es liderazgo o que no tienes nada mejor que hacer, pero funciona.',
  '%C mensajes, %N. Cuando faltas dos días el grupo se nota más muerto que de costumbre. Eso te hace importante, y también un poco patético, la verdad.',
  '%N con %C mensajes. Llevas el grupo a hombros como una puta mula de carga, y ni te quejas. O eres muy fiel o no tienes otro sitio mejor donde estar.',
  'Con %C mensajes, %N, si esto fuera una empresa ya te habrían hecho socio. Como no lo es, solo te queda el mérito y el dedo baldado de tanto escribir.',
  '%N, %C mensajes. Eres el que arranca todas las conversaciones porque el resto es demasiado vago hasta para eso. Trabajo sucio, y lo haces tú, joder.',
  '%C mensajes, %N. Ese número dice que este grupo básicamente eres tú hablando solo con público de fondo. Impresionante y un poco triste a la vez.',
  '%N con %C mensajes. No sé cómo te da tiempo a currar, dormir y escribir tanto aquí, pero el resultado está a la vista: sostienes esto de puta madre.',
  'Con %C mensajes, %N, has convertido este chat en tu segunda casa. La primera debe de estar acumulando polvo, pero bueno, aquí se te valora, y con razón.',
  '%N, %C mensajes. Cada vez que hay drama, apareces con opinión y quince mensajes seguidos. Molesto a veces, imprescindible siempre. Contradicción con nombre.',
  '%C mensajes, %N. Le has metido tantas horas a esto que técnicamente deberías cobrar. Como no cobras, al menos que sepas que se te tiene en cuenta.',
  '%N con %C mensajes. El grupo respira por tu boca, literalmente. Sin ti esto sería un cementerio de notificaciones sin leer. Puto pilar, lo reconozco.',
  'Con %C mensajes, %N, tienes más presencia aquí que en tu propia casa, seguramente. Y aun así te lo agradecemos, porque este chat sin ti se muere.',
  '%N, %C mensajes. Cuando tú hablas, el resto responde. Cuando el resto habla, a veces ni tú te dignas. Eso, cabrón, es tener el mando y lo sabes.',
  '%C mensajes, %N. No hay conversación de este grupo en la que no hayas metido baza. Eso es dedicación real o directamente no tener vida. Las dos valen, aquí sostienes.',
  '%N con %C mensajes. Sigues escribiendo aunque nadie te haya preguntado nada, y aun así funciona. Ese descaro tuyo mantiene esto vivo, hay que reconocerlo.',
  'Con %C mensajes, %N, has escrito más que la mitad del grupo junto. O tienes mucho que decir o mucho tiempo libre. El resultado es el mismo: pesas.',
  '%N, %C mensajes. Eres la razón por la que este grupo no es un cementerio de mensajes sin leer. Puto currante del chat, aunque nadie te pague por ello.',
  '%C mensajes, %N. Tu teclado debe de estar hecho polvo de tanto usarlo aquí. Y con ese desgaste has conseguido que nadie discuta tu puto peso en el grupo.',
  '%N con %C mensajes. El grupo te necesita más de lo que tú necesitas al grupo, y eso se nota cada vez que abres la boca. Poder real, sin cargo ni honores.',
  'Con %C mensajes, %N, has hecho de esto casi un trabajo a tiempo completo sin cobrar un puto duro. Al menos te llevas el respeto, que ya es bastante.',
  '%N, %C mensajes. La gente lee lo que escribes antes que el resto porque saben que ahí suele haber sustancia. Eso no se compra, coño, eso se gana escribiendo mucho.',
  '%C mensajes, %N. Si el grupo tuviera nómina serías el empleado del mes cada mes. Como no la tiene, te quedas con la satisfacción y el pulgar cansado.',
  '%N con %C mensajes. Has convertido tu vicio de mirar el móvil en la columna vertebral de este chat. Enfermedad productiva, pero enfermedad al fin y al cabo.',
  'Con %C mensajes, %N, cuando este grupo se calienta es porque tú metiste la mecha. Provocador nato o simplemente el que más habla. Aquí funciona igual, coño.',
  '%N, %C mensajes. Podrías tener una vida fuera de este chat y aun así eliges estar aquí escribiendo sin parar. Respeto y lástima a partes iguales, la verdad.',
  '%C mensajes, %N. Eres el que más aparece en las capturas de pantalla de este grupo, para bien y para mal. Fama de la buena, la que se gana hablando.',
  '%N con %C mensajes. El resto del grupo se limita a reaccionar a lo que tú sueltas. Eso, aunque suene raro, es liderazgo del chat en estado puro, cabrón.',
  'Con %C mensajes, %N, has demostrado que se puede vivir prácticamente dentro de un chat de WhatsApp. No sé si admirarte o llamarte a un médico, en serio.',
  '%N, %C mensajes. Cada vez que te callas unos días, alguien pregunta si te ha pasado algo. Esa preocupación, cabrón, es la prueba de que aquí importas.',
  '%C mensajes, %N. Escribes tanto que el grupo entero podría funcionar solo con tus mensajes citados. Los demás son de relleno comparados contigo, joder.',
  '%N con %C mensajes. Te has ganado el sitio a base de estar siempre, aunque sea sacrificando horas de sueño y alguna que otra neurona. Bien invertido, coño.',
  'Con %C mensajes, %N, si algún día te vas de este grupo va a haber luto oficial. Y no de mentira, del de verdad, porque sostienes esto tú solo.',
  '%N, %C mensajes. Eres el que llena el silencio incómodo cuando nadie sabe qué decir. Función de mierda, sí, pero la cumples con una constancia admirable.',
  '%C mensajes, %N. Has escrito más aquí que en cualquier otra parte de tu vida, seguramente. Y aun así el grupo te lo agradece, porque sin ti esto se apaga.',
  '%N con %C mensajes. Tienes el dudoso honor de ser el que más notificaciones genera de todo el grupo. Molesto para el móvil, vital para la conversación.',
  'Con %C mensajes, %N, hablas tanto que a veces se te olvida respirar entre mensaje y mensaje. Y aun así el grupo funciona mejor gracias a ese ritmo tuyo.',
  '%N, %C mensajes. Eres el puto motor de este chat, aunque funciones a base de café y falta de sueño. El resultado ahí está, y pesa de verdad.',
  '%C mensajes, %N. Has aportado más que la mitad del grupo junto y encima sin que nadie te lo pidiera. Vicio productivo donde los haya, cabrón.',
  '%N con %C mensajes. Cuando entras al chat cambia el ritmo de todo el mundo. Eso es poder real, aunque lo ejerzas desde el sofá en calzoncillos, probablemente.',
  'Con %C mensajes, %N, tu nombre sale en más conversaciones que el de cualquier otro. No por casualidad: por estar ahí, escribiendo, todos los putos días.',
  '%N, %C mensajes. El grupo funciona mejor cuando tú estás activo y se nota muchísimo cuando no. Esa dependencia, cabrón, te la has currado tú solito.',
  '%C mensajes, %N. Has convertido este chat en tu terapia, tu entretenimiento y tu curro no pagado. Los tres a la vez, y aun así se agradece el resultado.',
  '%N con %C mensajes. Sigues escribiendo aunque el tema ya esté muerto, solo por mantener el pulso del grupo. Terquedad útil, que no es poco, joder.',
  'Con %C mensajes, %N, cualquiera diría que cobras comisión por mensaje. No cobras nada, pero el nivel de implicación es exactamente ese. Respeto total.',
  '%N, %C mensajes. Has hecho de la cantidad una puta virtud, y aunque a veces canses, el grupo sin ese ruido tuyo sería un puto páramo silencioso.',
  '%C mensajes, %N. Sostienes esto con la constancia de quien no tiene nada mejor que hacer, y precisamente por eso el grupo te debe más de lo que crees.',
];

// ═══════════════════════════════════════════════════════════════════════════
// COMANDO
// ═══════════════════════════════════════════════════════════════════════════

async function cmdRelevance(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo funciona en grupos.' }, { quoted: msg });
  }

  const target = getTargetOrSelf(msg);

  // Del owner principal NO se contesta. Ni una cifra, ni un veredicto, ni un
  // "no hay datos": silencio.
  //
  // Antes se le fabricaba un conteo verosímil (1.400-2.300 y subiendo tres al
  // día) para que no cantara que es el dueño. El problema es que ese número
  // contradecía al resto del bot: sus mensajes no se cuentan, así que no sale
  // en *!count*, no sale en los tops y no sale en *!vs* — pero *!relevancia* le
  // atribuía casi dos mil. Cualquiera que compare las dos cosas ve que ahí pasa
  // algo. Un dato inventado que choca con los demás delata más que no responder.
  if (isMainOwner(target, false, groupMeta)) return;

  const count = await getUserCount(jid, target);

  const pool =
    count >= HIGH_MIN ? RELEVANTE :
    count >= MID_MIN  ? INTERMEDIO :
                        PARASITO;
  const tierKey =
    pool === RELEVANTE ? 'alto' : pool === INTERMEDIO ? 'medio' : 'bajo';

  const num = target.split('@')[0].split(':')[0];
  const nm = `@${num}`;
  const label = count === 1 ? '1 mensaje' : `${fmt(count)} mensajes`;
  // "%C mensajes" se sustituye entero por la etiqueta ya concordada: si no, con
  // exactamente 1 mensaje la cabecera decia "1 mensaje" y la frase, dos lineas
  // mas abajo, "1 mensajes".
  const phrase = pickFresh(pool, `${jid}|relevancia|${tierKey}`)
    .replace(/%N/g, nm)
    .replace(/%C mensajes/g, label)
    .replace(/%C/g, fmt(count));

  const text =
    `*RELEVANCIA EN EL GRUPO*\n` +
    `╾━━━━━━━━━━━━━━╼\n\n` +
    `${nm} — *${label}*\n\n` +
    `${phrase}`;

  await sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
}


// El bot abre con lo mas fuerte que tiene: los pools de insultos se ordenan
// de mas duro a mas suave UNA vez, al cargar, y pickFresh sesga la eleccion
// hacia la cabecera. Los pools neutros (cabeceras, cierres) no se tocan:
// ahi la "dureza" no significa nada.
PARASITO = ordenarPorDureza(PARASITO);
INTERMEDIO = ordenarPorDureza(INTERMEDIO);

module.exports = { cmdRelevance };
