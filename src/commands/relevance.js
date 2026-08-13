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
const { pickFresh, fmt } = require('../utils/helpers');
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
  '%N, %C mensajes. Estás en el grupo como el mueble: ocupas sitio y no aportas. El grupo lo nota cada día, desperdicio, gilipollas.',
  '%N, %C mensajes en el contador. Estás en el grupo como el mueble: ocupas sitio y no aportas. El grupo lo nota cada día, asco.',
  '%N, %C mensajes. El fantasma con nick: lees, no escribes, y el contador te delata. El grupo lo nota cada día, fracasado.',
  '%N, %C mensajes en el contador. El fantasma con nick: lees, no escribes, y el contador te delata. El grupo lo nota cada día, joder.',
  '%N, %C mensajes. Relevancia cero: el chat funcionaría igual sin tu lectura silenciosa. El grupo lo nota cada día, cabrón.',
  '%N, %C mensajes en el contador. Relevancia cero: el chat funcionaría igual sin tu lectura silenciosa. Gilipollas.',
  '%N, %C mensajes. Parasito de notificaciones: abres, miras, cierras, nada. Y. el ranking no miente, basura.',
  '%N, %C mensajes en el contador. Parasito de notificaciones: abres, miras, cierras, nada. El grupo lo nota cada día, desperdicio, mierda.',
  '%N, %C mensajes. El ranking de irrelevancia tiene cabeza de cartel y eres tú. El grupo lo nota cada día, pringado.',
  '%N, %C mensajes en el contador. El ranking de irrelevancia tiene cabeza de cartel y eres tú. El grupo lo nota cada día, fracasado.',
  '%N, %C mensajes. No es discreción: es ausencia de aporte disfrazada de estar. El grupo lo nota cada día, coño.',
  '%N, %C mensajes en el contador. No es discreción: es ausencia de aporte disfrazada de estar. El grupo lo nota cada día, cabrón.',
  '%N, %C mensajes. El grupo produce: tú consumes en silencio. Diagnóstico claro. El grupo lo nota cada día, ridículo.',
  '%N, %C mensajes en el contador. El grupo produce: tú consumes en silencio. Diagnóstico claro. El grupo lo nota cada día, basura.',
  '%N, %C mensajes. Fantasma documentado: el bot solo pone el número al vacío. Y. el ranking no miente, cutre, ridículo.',
  '%N, %C mensajes en el contador. Fantasma documentado: el bot solo pone el número al vacío. El grupo lo nota cada día, pringado.',
  '%N, %C mensajes. Estás de relleno en el chat: el relleno no pide turno de palabra. El grupo lo nota cada día, mierda.',
  '%N, %C mensajes en el contador. Estás de relleno en el chat: el relleno no pide turno de palabra. El grupo lo nota cada día, coño.',
  '%N, %C mensajes. Relevancia bajo mínimos: el hilo no te extraña cuando faltas. El grupo lo nota cada día, patético.',
  '%N, %C mensajes en el contador. Relevancia bajo mínimos: el hilo no te extraña cuando faltas. El grupo lo nota cada día, ridículo.',
  '%N, %C mensajes. Parasitas el contador sin dejar una sola frase útil. Y. el ranking no miente, asco con el fallo en 4K de chat.',
  '%N, %C mensajes en el contador. Parasitas el contador sin dejar una sola frase útil. El grupo lo nota cada día, cutre, patético.',
  '%N, %C mensajes. Mirón profesional: el oficio no cotiza en este ranking. Y. el ranking no miente, joder.',
  '%N, %C mensajes en el contador. Mirón profesional: el oficio no cotiza en este ranking. El grupo lo nota cada día, mierda.',
  '%N, %C mensajes. El silencio no te hace misterioso: te hace irrelevante. El grupo lo nota cada día, gilipollas.',
  '%N, %C mensajes en el contador. El silencio no te hace misterioso: te hace irrelevante. El grupo lo nota cada día, patético.',
  '%N, %C mensajes. Ocupas un slot del grupo y el slot no se nota si se libera. El grupo lo nota cada día, desperdicio, joder.',
  '%N, %C mensajes en el contador. Ocupas un slot del grupo y el slot no se nota si se libera. El grupo lo nota cada día, asco.',
  '%N, %C mensajes. Fantasma con historial de lectura y cero de escritura valiosa. El grupo lo nota cada día, fracasado.',
  '%N, %C mensajes en el contador. Fantasma con historial de lectura y cero de escritura valiosa. El grupo lo nota cada día, joder.',
  '%N, %C mensajes. El chat no te necesita: el ranking de relevancia lo confirma. El grupo lo nota cada día, cabrón.',
  '%N, %C mensajes en el contador. El chat no te necesita: el ranking de relevancia lo confirma. El grupo lo nota cada día, gilipollas.',
  '%N, %C mensajes. El chat no te necesita: el contador de relevancia de relevancia lo confirma. El grupo lo nota cada día, ridículo.',
  '%N, %C mensajes. Parasito del hilo: te alimentas de lo ajeno y no devuelves. El grupo lo nota cada día, basura.',
  '%N, %C mensajes en el contador. Parasito del hilo: te alimentas de lo ajeno y no devuelves. El grupo lo nota cada día, desperdicio, ridículo.',
  '%N, %C mensajes. Irrelevancia medible: el bot no inventa, cuenta. Y. el ranking no miente, pringado sin segunda lectura que lo arregle.',
  '%N, %C mensajes en el contador. Irrelevancia medible: el bot no inventa, cuenta. El grupo lo nota cada día, fracasado.',
  '%N, %C mensajes. Parasitas el grupo con la elegancia de quien no se entera de que molesta. El grupo lo nota cada día, coño.',
  '%N, %C mensajes. El fantasma del ranking: presente en la lista, ausente en el aporte. El grupo lo nota cada día, cabrón.',
  '%N, %C mensajes. Relevancia en el sótano: el hilo no te cita porque no hay qué citar. El grupo lo nota cada día, gilipollas.',
  '%N, %C mensajes. Mirón de primera: el título no se disputa. Y. el ranking no miente, patético en el único marcador que importa aquí.',
  '%N, %C mensajes. El chat produce sin ti: el experimento mental ya está hecho. El grupo lo nota cada día, ridículo.',
  '%N, %C mensajes. Silencio de quien no tiene nada y ocupa sitio igual. Y. el ranking no miente, basura.',
  '%N, %C mensajes. Irrelevancia con nick: el pack completo del que no pinta nada. El grupo lo nota cada día, desperdicio, basura.',
  '%N, %C mensajes. Parasito documentado por %C mensajes de nada útil. Y. el ranking no miente, asco con la cara del resultado a la vista.',
  '%N, %C mensajes. El contador te ve: el hilo no te necesita. Y. el ranking no miente, cutre con el dígito como única defensa, fracasado.',
  '%N, %C mensajes. Fantasma de los que leen el drama y nunca lo firman. Y. el ranking no miente, pringado.',
  '%N, %C mensajes. Relevancia cero con evidencia numérica. Y. el ranking no miente, fracasado delante del ranking y de la cara.',
  '%N, %C mensajes. Ocupas espacio de miembro: el espacio no se defiende solo. Y. el ranking no miente, joder.',
  '%N, %C mensajes. Parasitas notificaciones ajenas como deporte. Y. el ranking no miente, mierda delante de quien no quería verlo.',
  '%N, %C mensajes. El ranking de aporte te deja donde mereces: abajo. Y. el ranking no miente, coño sin recurso ni nota al pie.',
  '%N, %C mensajes. Silencio que no es estrategia: es vacío. Y. el ranking no miente, cabrón en la foto fija del ranking.',
  '%N, %C mensajes. Mirón con historial: el bot traduce historial a veredicto. El grupo lo nota cada día, gilipollas.',
  '%N, %C mensajes. Irrelevante de forma estable: no es un mal mes. Y. el ranking no miente, patético en el momento que más dolía soltarlo.',
  '%N, %C mensajes. El grupo no se cae sin ti: se aligera. Y. el ranking no miente, ridículo en el recuento que no perdona.',
  '%N, %C mensajes. Parasito del contador: sumas presencia y restas sustancia. El grupo lo nota cada día, basura.',
  '%N, %C mensajes. Fantasma oficial del ranking de relevancia. Y. el ranking no miente, desperdicio con el veredicto seco del bot, joder.',
  '%N, %C mensajes. %C mensajes y cero eco útil en el hilo. Y. el ranking no miente, asco con la firma legible del comando.',
  '%N, %C mensajes. La relevancia no se finge leyendo: se demuestra escribiendo. El grupo lo nota cada día, cutre, coño.',
  '%N, %C mensajes. Parasitas el chat y el ranking te hace el retrato. Y. el ranking no miente, pringado.',
  '%N, %C mensajes. Irrelevancia con sello del comando. Y. el ranking no miente, fracasado con el chat enterado del cargo.',
  '%N, %C mensajes. El mirón del grupo tiene nombre: el tuyo. Y. el ranking no miente, joder y no hay modo de suavizarlo.',
  '%N, %C mensajes. Silencio de relleno: el relleno se expulsa cuando toca. Y. el ranking no miente, mierda.',
  '%N, %C mensajes. Relevancia bajo tierra: %C mensajes de prueba. Y. el ranking no miente, coño sin segunda oportunidad hoy.',
  '%N, %C mensajes. Parasito sin gracia: ni el silencio tiene estilo. Y. el ranking no miente, cabrón con el botín o el fail a la vista.',
  '%N, %C mensajes. El hilo no te abre hueco: tú no abriste ninguno. Y. el ranking no miente, gilipollas.',
  '%N, %C mensajes. Fantasma con contador: la peor combinación. Y. el ranking no miente, patético con la cara del resultado a la vista.',
  '%N, %C mensajes. Irrelevante y documentado: no hay debate. Y. el ranking no miente, ridículo con el eco del almost todavía sonando.',
  '%N, %C mensajes. Parasitas el promedio de actividad sin subir el de calidad. El grupo lo nota cada día, basura.',
  '%N, %C mensajes. El ranking te señala: el resto del grupo ya había señalado. El grupo lo nota cada día, desperdicio, cabrón.',
  '%N, %C mensajes. Mirón crónico: el oficio no tiene jubilación aquí. Y. el ranking no miente, asco con el bot como notario del fallo.',
  '%N, %C mensajes. Relevancia inexistente con %C mensajes de coartada. Y. el ranking no miente, cutre y el chat archiva sin debate, patético.',
  '%N, %C mensajes. El chat no nota tu ausencia: nota tu falta de aporte. Y. el ranking no miente, pringado.',
  '%N, %C mensajes. Parasito del hilo: diagnóstico cerrado. Y. el ranking no miente, fracasado y basta el dato del ranking.',
  '%N, %C mensajes. Silencio que no aporta misterio: aporta hueco. Y. el ranking no miente, joder y el hilo no pide amplificación.',
  '%N, %C mensajes. Irrelevancia medible en %C mensajes. Y. el ranking no miente, mierda sin barniz de relato heroico.',
  '%N, %C mensajes. Fantasma que el bot se cansa de no oír. Y. el ranking no miente, coño y no hay modo de suavizarlo.',
  '%N, %C mensajes. Parasitas y el contador no te absuelve. Y. el ranking no miente, cabrón en la foto fija del ranking.',
  '%N, %C mensajes. Relevancia en números rojos de sustancia. Y. el ranking no miente, gilipollas y el ranking no pide permiso.',
  '%N, %C mensajes. El mirón tiene %C mensajes y cero frases que citar. Y. el ranking no miente, patético.',
  '%N, %C mensajes. Ocupas sitio de quien podría escribir: el sitio se puede liberar. El grupo lo nota cada día, ridículo.',
  '%N, %C mensajes. Parasito sin narrativa heroica: solo el número. Y. el ranking no miente, basura con la firma legible del comando.',
  '%N, %C mensajes. Irrelevante de fábrica: el comando solo lo nombra. Y. el ranking no miente, desperdicio, asco.',
  '%N, %C mensajes. El hilo sigue sin ti: el experimento ya está hecho cada día. El grupo lo nota cada día, asco.',
  '%N, %C mensajes. Fantasma del ranking: presente en la lista, ausente en la memoria del hilo. El grupo lo nota cada día, cutre, ridículo.',
  '%N, %C mensajes. Parasitas notificaciones: el deporte de los que no firman. El grupo lo nota cada día, pringado.',
  '%N, %C mensajes. Relevancia cero: %C mensajes no la inventan. Y. el ranking no miente, fracasado y el sistema cierra sin discusión.',
  '%N, %C mensajes. Mirón profesional con carnet del contador. Y. el ranking no miente, joder con el chat enterado del cargo.',
  '%N, %C mensajes. Silencio de quien no aporta: el bot no lo confunde con elegancia. El grupo lo nota cada día, mierda.',
  '%N, %C mensajes. Irrelevante y estable: el peor pronóstico. Y. el ranking no miente, coño con el fail todavía caliente.',
  '%N, %C mensajes. Parasito del grupo Y. el ranking no miente, cabrón sin anestesia de verdad esta vez.',
  '%N, %C mensajes. El ranking de aporte te deja en el sótano con %C mensajes de testigo. El grupo lo nota cada día, gilipollas.',
  '%N, %C mensajes. Relevancia bajo mínimos legales del chat. Y. el ranking no miente, ridículo con el saldo a la intemperie.',
  '%N, %C mensajes. Parasitas el hilo y el hilo no te devuelve eco. Y. el ranking no miente, basura delante de quien aún leía el hilo.',
  '%N, %C mensajes. Mirón: el título se gana no escribiendo nada útil. Y. el ranking no miente, desperdicio, ridículo.',
  '%N, %C mensajes. Irrelevancia con %C mensajes de prueba cargada. Y. el ranking no miente, asco sin descuento por empatía.',
  '%N, %C mensajes. El chat no te cita porque no hay material. Y. el ranking no miente, cutre y el ranking no pide permiso, joder.',
  '%N, %C mensajes. Parasito sin estilo: ni el vacío tiene gracia. Y. el ranking no miente, pringado en el momento que más dolía soltarlo.',
  '%N, %C mensajes. Silencio que el bot traduce a irrelevancia. Y. el ranking no miente, fracasado y el sistema marca el punto final.',
  '%N, %C mensajes. Relevancia inexistente: el comando lo dice en claro. Y. el ranking no miente, joder.',
  '%N, %C mensajes. Fantasma oficial: %C mensajes y el mismo veredicto. Y. el ranking no miente, mierda.',
  '%N, %C mensajes. Parasitas el contador de miembros sin el de aporte. Y. el ranking no miente, coño y el chat archiva sin debate.',
  '%N, %C mensajes. Mirón del drama ajeno: el drama no te nombra. Y. el ranking no miente, cabrón con la cara del resultado a la vista.',
  '%N, %C mensajes. Irrelevante de forma que ya no sorprende. Y. el ranking no miente, gilipollas y el grupo ya pasó de página.',
  '%N, %C mensajes. El grupo produce: tú miras. Diagnóstico en una línea. Y. el ranking no miente, patético.',
  '%N, %C mensajes. Parasito del ranking: el retrato es este mensaje. Y. el ranking no miente, ridículo.',
  '%N, %C mensajes. Relevancia en el fondo del pozo con %C mensajes de lastre. El grupo lo nota cada día, basura.',
  '%N, %C mensajes. Fantasma que no deja frase: solo rastro de lectura. Y. el ranking no miente, asco con el peaje cobrado al natural.',
  '%N, %C mensajes. Parasitas y el bot no ofrece indulgencia. Y. el ranking no miente, cutre con el número en la frente del mensaje, coño.',
  '%N, %C mensajes. Mirón con %C mensajes: el número no te salva. Y. el ranking no miente, pringado y el archivo queda cerrado.',
  '%N, %C mensajes. Irrelevancia documentada: punto final del tramo. Y. el ranking no miente, fracasado.',
  '%N, %C mensajes. El hilo no te necesita: el ranking lo certifica. Y. el ranking no miente, joder con el fail todavía caliente.',
  '%N, %C mensajes. Parasito sin misterio: el vacío se ve. Y. el ranking no miente, mierda con el grupo de testigo silencioso.',
  '%N, %C mensajes. Relevancia cero con evidencia de %C mensajes. Y. el ranking no miente, coño y el sistema marca el punto final.',
  '%N, %C mensajes. Fantasma del chat: el oficio no se discute. Y. el ranking no miente, cabrón y el ranking lo deja por escrito.',
  '%N, %C mensajes. Mirón crónico: el contador es el carnet. Y. el ranking no miente, patético y el ranking lo deja por escrito.',
  '%N, %C mensajes. Irrelevante y el grupo lo sabía antes del comando. Y. el ranking no miente, ridículo.',
  '%N, %C mensajes. Silencio que no aporta: el bot no lo confunde con estrategia. El grupo lo nota cada día, basura.',
  '%N, %C mensajes. Parasito del hilo: %C mensajes de coartada inútil. Y. el ranking no miente, desperdicio, coño.',
  '%N, %C mensajes. Relevancia bajo tierra: no hay ascensor. Y. el ranking no miente, asco en el parte que nadie borra.',
  '%N, %C mensajes. Fantasma con nick: el pack del que no pinta nada. Y. el ranking no miente, cutre delante del marcador en vivo, gilipollas.',
  '%N, %C mensajes. Parasitas el promedio y no subes ninguno que importe. Y. el ranking no miente, pringado.',
  '%N, %C mensajes. Mirón: el drama se escribe sin tu firma. Y. el ranking no miente, fracasado sin suavizar el golpe del número.',
  '%N, %C mensajes. Irrelevancia medible y estable. Y. el ranking no miente, joder sin consuelo de manual barato.',
  '%N, %C mensajes. El chat sigue igual sin tu aporte: porque no hay aporte. Y. el ranking no miente, mierda.',
  '%N, %C mensajes. Parasito documentado por el comando de relevancia. Y. el ranking no miente, coño con el botín o el fail a la vista.',
  '%N, %C mensajes. Relevancia inexistente: %C mensajes no crean sustancia. Y. el ranking no miente, cabrón.',
  '%N, %C mensajes. Fantasma oficial del sótano del ranking. Y. el ranking no miente, gilipollas sin segunda lectura que lo arregle.',
  '%N, %C mensajes. Parasitas el grupo: el grupo no te parasita de vuelta. Y. el ranking no miente, patético.',
  '%N, %C mensajes. Mirón con historial vacío de frases útiles. Y. el ranking no miente, ridículo en alta resolución de group chat.',
  '%N, %C mensajes. Irrelevante de fábrica: este mensaje es el sello. Y. el ranking no miente, basura sin filtro de autoayuda.',
  '%N, %C mensajes. Silencio de quien ocupa sitio: el sitio se puede liberar. El grupo lo nota cada día, desperdicio, patético.',
  '%N, %C mensajes. Parasito sin gracia ni misterio: solo el número %C. Y. el ranking no miente, asco con el peaje cobrado al natural.',
  '%N, %C mensajes. Relevancia en números que dan pena: el bot no suaviza. Y. el ranking no miente, cutre, basura.',
];

// ═══════════════════════════════════════════════════════════════════════════
// TRAMO MEDIO — está, pero no pesa. Ni fantasma ni referente.
// ═══════════════════════════════════════════════════════════════════════════

let INTERMEDIO = [
  '%N, %C mensajes. Ni pareces un puto fantasma ni un referente, joder. Vives en ese limbo de mierda donde nadie te odia y nadie te echa de menos tampoco.',
  '%C mensajes, %N. Ya no das pena pero tampoco impresionas ni de coña. Felicidades por escalar del sótano al puto pasillo de en medio.',
  '%N con %C mensajes. Hablas lo justo para que no te llamen mueble y ni una palabra más. Mediocridad calculada con la precisión de un puto contable.',
  'Con %C mensajes, %N, has dejado de ser un cero pero sigues sin ser nadie importante. Empate técnico con la irrelevancia, y así seguirás si no cambias el ritmo, cabrón.',
  '%N, %C putos mensajes. Suficiente para que te saluden, insuficiente para que te inviten a algo que importe. Así te va la vida en este grupo.',
  '%C mensajes, %N. Estás ahí, en tierra de nadie, aportando lo mínimo indispensable para que nadie te toque los cojones. Gestión de mierda impecable.',
  '%N con %C mensajes. No jodes al grupo ni lo sostienes. Flotas en medio como una puta boya sin rumbo, ni hundes ni llegas a ningún puerto.',
  'Con %C mensajes, %N, tienes justo lo necesario para que el bot no te insulte con ganas. Aprovecha, porque el mérito no da para mucho más, basura.',
  '%N, %C mensajes. Podrías ser alguien aquí y has decidido que con existir a medias te vale. Ambición de mierda, resultado a la altura.',
  '%C mensajes, %N. El grupo te reconoce y sigue sin recordar ni una puta frase tuya. Presencia sí, contenido no. Vaya papelón, cabrón.',
  '%N con %C mensajes. Ni tan mirón como para dar asco ni tan hablador como para dar la turra. El equilibrio perfecto de la nada con nombre.',
  'Con %C mensajes, %N, has salido del pozo a rastras y te has sentado en el borde a fumar. Ni sube ni baja, joder, solo mira.',
  '%N, %C mensajes. Cumples el expediente y ni una gota más. Ese es tu techo y por lo visto te la suda no romperlo nunca, coño.',
  '%C mensajes, %N. Suficiente para no ser el hazmerreír del grupo, insuficiente para que nadie te cite en una puta conversación importante.',
  '%N con %C mensajes. Estás en esa franja gris donde el grupo te ubica sin esfuerzo y te olvida con la misma facilidad. Anodino de manual, sin paliativos, gilipollas.',
  'Con %C mensajes, %N, no llegas a molestar y tampoco llegas a importar. Zona tibia, la peor de todas para presumir de algo, patético.',
  '%N, %C mensajes. Escribes lo justo para no quedar como el gorrón oficial y te callas antes de que alguien espere algo serio de ti. Estrategia de cobarde, asco.',
  '%C mensajes, %N. Vas tirando en la mitad de la tabla, cómodo, sin destacar ni hundirte. La medianía tiene sus ventajas y tú las explotas todas, basura.',
  '%N con %C mensajes. Ni te has ganado un respeto ni te has ganado un desprecio, joder. Solo una nota media que a nadie le interesa comentar.',
  'Con %C mensajes, %N, apareces cuando la conversación ya está caliente y nunca la enciendes tú. Sumarte es gratis, arrancarla cuesta huevos que no tienes, fracasado.',
  '%N, %C mensajes. Tienes rodaje para haber dejado huella y solo has dejado una mancha del tamaño de tu esfuerzo real: minúscula, joder.',
  '%C mensajes, %N. El grupo sabe tu nombre y ahí se acaba la relación. Ni fama ni infamia, solo una entrada más en una lista larga, mierda.',
  '%N con %C mensajes. Aportas a ráfagas, como quien mea y se sacude rápido para no mojarse. Constancia cero, esfuerzo intermitente, resultado tibio, coño.',
  'Con %C mensajes, %N, estás justo donde nadie te busca ni te destierra. Un puto término medio con menos personalidad que un formulario.',
  '%N, %C mensajes. Ni fantasma ni pilar, un poco de todo y mucho de nada. La fórmula perfecta para que a nadie le importe tu opinión, gilipollas.',
  '%C mensajes, %N. Has subido lo suficiente para dejar de dar vergüenza ajena y te has quedado ahí sentado, la mar de a gusto. Sin ambición ni cojones, patético.',
  '%N con %C mensajes. Tu huella en este grupo es del tamaño de una puta mancha de café: se ve, no molesta, nadie la limpia ni la comenta.',
  'Con %C mensajes, %N, participas lo justo para que el grupo no te dé por perdido. Un salvavidas mediocre agarrado con las dos manos, sin soltarlo nunca, basura.',
  '%N, %C mensajes. Ni escalas ni te hundes, solo flotas en medio como el puto corcho de la fiesta: está, pero nadie brinda por él.',
  '%C mensajes, %N. Te falta constancia para pesar y te sobra pereza para que se note. Esa combinación de mierda te tiene anclado en el medio.',
  '%N con %C mensajes. Has demostrado que sabes escribir y has decidido no demostrar mucho más. Vago con estilo, que tampoco es un mérito, joder.',
  'Con %C mensajes, %N, la tabla te sitúa en la parte que nadie mira ni comenta. Ni gloria ni vergüenza, solo relleno con nombre propio, mierda.',
  '%N, %C mensajes. Se te ve capacidad y se te ve pereza a partes iguales, y por ahora está ganando la pereza con ventaja de puta madre.',
  '%C mensajes, %N. Bastante para que no te confundan con un mueble, poco para que alguien te ponga en el podio de nada. Justo la nota que sacas siempre, cabrón.',
  '%N con %C mensajes. El grupo funcionaría casi igual sin ti, con el matiz de "casi" que te salva por los pelos. No lo sueltes, que es lo único que tienes, gilipollas.',
  'Con %C mensajes, %N, tienes el carisma de un trámite administrativo: necesario a veces, memorable nunca, discutido jamás, patético.',
  '%N, %C mensajes. Escribes cuando ya no hay riesgo y callas cuando toca dar la cara. Timing de cobarde disfrazado de discreción, gilipollas.',
  '%C mensajes, %N. Ocupas la casilla del "normal", que es la casilla que nadie señala con el dedo ni para bien ni para mal. Ahí sigues, basura.',
  '%N con %C mensajes. Has hecho lo suficiente para que el bot no te destroce y lo insuficiente para que te alabe. Justo en el filo, cabrón.',
  'Con %C mensajes, %N, tu implicación es la de quien se cuela en la barbacoa ajena: aparece, come algo y se larga antes de recoger. Comodón de mierda.',
  '%N, %C mensajes. Ni te comprometes ni te desentiendes del todo. Medias tintas que a nadie emocionan y a nadie cabrean, la mar de cómodas para ti, joder.',
  '%C mensajes, %N. Sales en la foto de grupo pero en la segunda fila, sin sonreír. Presente en el registro, ausente en la puta memoria de todos.',
  '%N con %C mensajes. Has evitado la vergüenza del fondo de la tabla y has renunciado a pelear por algo más. Ambición de folio en blanco, gilipollas.',
  'Con %C mensajes, %N, cumples con lo mínimo y te quedas tan ancho. Es una táctica legítima, la más aburrida de todas, pero legítima, cabrón.',
  '%N, %C mensajes. Te mueves por los márgenes del grupo, ni al frente ni fuera. Zona de confort con wifi y sin un puto compromiso real.',
  '%C mensajes, %N. Tienes la constancia de una promesa de año nuevo: arranca fuerte, se apaga rápido y vuelve a medio gas cuando le apetece, patético.',
  '%N con %C mensajes. Ni sostienes el grupo ni lo hundes, solo lo acompañas a medio metro de distancia. Comodidad rentable, mérito ninguno, joder.',
  'Con %C mensajes, %N, te has ganado el título de "el que está pero no se sabe muy bien para qué". Un puto cargo sin funciones ni honores.',
  '%N, %C mensajes. Podrías tirar para arriba y has elegido quedarte flotando en el medio, que es donde menos esfuerzo cuesta y menos se te exige, cabrón.',
  '%C mensajes, %N. Ese número te salva de la vergüenza del fondo y no te acerca ni de lejos a la gloria de arriba. El eterno centro de la tabla, coño.',
];

// ═══════════════════════════════════════════════════════════════════════════
// TRAMO ALTO — sostiene el grupo de verdad.
// ═══════════════════════════════════════════════════════════════════════════

const RELEVANTE = [
  '%N, %C mensajes. O sostienes el hilo o lo saturas de ruido: el contador no distingue heroísmo de adicción, y tu ego tampoco, joder.',
  'Con %C mensajes %N ya no puede hacerse el perfil bajo. Estás en el mapa a la fuerza, ocupando espacio caro, cabrón. El ego lo celebra; el chat lo sopesa.',
  '%N lleva %C. Volumen de residente, sustancia a juicio del resto. La autoestima te la sube el número, no el contenido, gilipollas.',
  '%C mensajes de %N. El grupo te nota cuando faltas y te aguanta cuando sobras. Importante a la fuerza, mierda. El ego lo celebra; el chat lo sopesa.',
  '%N con %C: o eres pilar o eres la mula de carga del chat. El ego elige el relato; el hilo elige la verdad, coño. El ego lo celebra; el chat lo sopesa.',
  '%C en el contador de %N. Eso ya no es visita, es empadronamiento. Y el padrón no pide currículum brillante, asco. El ego lo celebra; el chat lo sopesa.',
  '%N, %C mensajes. La irrelevancia dejó de ser tu coartada. Ahora el problema es otro: peso sin calidad, patético. El ego lo celebra; el chat lo sopesa.',
  'Actividad de %N medida en %C. El bot te ve; el grupo también. La autoestima hinchada no tapa el relleno, basura. El ego lo celebra; el chat lo sopesa.',
  '%C mensajes. %N convertiste el grupo en segunda oficina. Fichas entrada, no aportas cierre, ridículo. El ego lo celebra; el chat lo sopesa.',
  '%N no fantasma: lleva %C pruebas. El ego celebra el volumen; el chat mide el eco real, fracasado. El ego lo celebra; el chat lo sopesa.',
  '%N, %C mensajes y cero intención de bajar el ritmo. Adicción al hilo con nombre propio, joder. El ego lo celebra; el chat lo sopesa.',
  'Con %C, %N es clima del chat, no anécdota. El clima también puede ser una tormenta de mierda, cabrón. El ego lo celebra; el chat lo sopesa.',
  '%C mensajes de %N. Presencia que no pide permiso y tampoco ofrece brillo, gilipollas. El ego lo celebra; el chat lo sopesa.',
  '%N ha soltado %C. El archivo lo confirma. La vanidad lo interpreta como legado, mierda. El ego lo celebra; el chat lo sopesa.',
  '%C de actividad. %N fijo en el ranking de ruido. El ego lee \\\\\'imprescindible\\\\\'; el grupo lee \\\\\'inevitable\\\\\', coño. El ego lo celebra; el chat lo sopesa.',
  '%N con %C mensajes: el contador es tu sombra y tu muleta de autoestima, asco. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  'Relevancia a lo bruto: %N y sus %C. Cantidad gritando para que no se oiga la falta de peso, patético. El ego lo celebra; el chat lo sopesa.',
  '%C mensajes. %N ya no cabe en el cajón de los que no escriben. Ahora cabe en el de los que escriben de más, basura. El ego lo celebra; el chat lo sopesa.',
  '%N lleva %C. Cuando faltas dos días el hilo se nota; cuando vuelves, a veces se arrepiente, ridículo. El ego lo celebra; el chat lo sopesa.',
  '%C en el reloj de %N. No hay modo avión que borre la dependencia del chat, fracasado. El ego lo celebra; el chat lo sopesa.',
  '%N, %C mensajes. O aportas o ocupas. El ego odia esa pregunta y por eso escribes más, joder. El ego lo celebra; el chat lo sopesa.',
  'Con %C mensajes %N se plantó y no se fue. Territorialidad de quien no tiene otro escenario, cabrón. El ego lo celebra; el chat lo sopesa.',
  '%C de %N. Currículum de scroll con nombre propio. La autoestima firmó el contrato sin leer, gilipollas. El ego lo celebra; el chat lo sopesa.',
  '%N no desaparece: %C veces lo demuestra. Persistencia confunde con valor, mierda. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C mensajes. %N es parte del mobiliario del grupo. El mobiliario no pide respeto, coño. El ego lo celebra; el chat lo sopesa.',
  'La \\\\\'relevancia\\\\\' de %N se mide en %C y a veces duele porque es solo ruido útil a ratos, asco. El ego lo celebra; el chat lo sopesa.',
  '%N, %C. El bot te pone en el mapa sin pedirte opinión. El ego lo enmarca, patético. El ego lo celebra; el chat lo sopesa.',
  '%C mensajes de presencia pura de %N. Presencia no es peso. El chat lo sabe, basura. El ego lo celebra; el chat lo sopesa.',
  '%N con %C: el hilo te reconoce al vuelo y a veces suspira, ridículo. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C. %N es residente, no turista. Los residentes también pueden ser un problema de vecinos, fracasado. El ego lo celebra; el chat lo sopesa.',
  '%N lleva %C mensajes. Saturación con firma. El ego lo llama compromiso, joder. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  'Actividad alta y visible: %N %C. Visible no es respetado, cabrón. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C mensajes. %N no pide contexto: lo genera a martillazos de texto, gilipollas. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N, %C en el pecho del contador como medalla. La medalla es de hojalata, mierda. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  'Con %C, %N ya es estadística del grupo. Las estadísticas no tienen autoestima, coño. El ego lo celebra; el chat lo sopesa.',
  '%C mensajes de %N. Volumen de quien vive aquí porque fuera no hay escenario, asco. El ego lo celebra; el chat lo sopesa.',
  '%N no es rumor: son %C datos. Los datos no te hacen imprescindible, patético. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C. Relevancia por insistencia de %N. La insistencia cansa más que ilumina, basura. El ego lo celebra; el chat lo sopesa.',
  '%N con %C mensajes y el ranking de presencia te nombra. Presencia ≠ valor, ridículo. El ego lo celebra; el chat lo sopesa.',
  '%C mensajes. %N, el contador no te suelta y tú tampoco al contador, fracasado. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N lleva %C. Enganche de los que ya no se discuten. El ego lo celebra en privado, joder. El ego lo celebra; el chat lo sopesa.',
  'Con %C mensajes %N carga el grupo a hombros o lo aplasta. A veces no se distingue, cabrón. El ego lo celebra; el chat lo sopesa.',
  '%C de %N. Fiel o dependiente: el número no aclara y tu autoestima elige mal, gilipollas. El ego lo celebra; el chat lo sopesa.',
  '%N, %C mensajes. Importante a la fuerza. La fuerza no es respeto, mierda. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C mensajes. %N se hizo fijo sin votación. Nadie votó tu ego al alza, coño. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  'Actividad de %N: %C. Documentado y sin anestesia para la vanidad, asco. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N con %C. El fantasma ya no te queda de disfraz; ahora el problema es el exceso, patético. El ego lo celebra; el chat lo sopesa.',
  '%C mensajes de %N en el historial vivo. Historial no es legado, basura. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N, %C. Presencia sin modo pausa. La pausa te haría un favor al ego, ridículo. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C. El grupo cuenta contigo a regañadientes, %N. A regañadientes no es admiración, fracasado. El ego lo celebra; el chat lo sopesa.',
  '%N, %C mensajes. El contador te sube el ego y el contenido te lo baja, joder. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  'Con %C, %N ya no es invisible: es inevitable. Inevitable no es querido, cabrón. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C mensajes de %N. La autoestima se alimenta del número; el grupo, del filtro, gilipollas. El ego lo celebra; el chat lo sopesa.',
  '%N lleva %C y todavía cree que volumen es argumento. El hilo te desmiente, mierda. El ego lo celebra; el chat lo sopesa.',
  '%C en el marcador. %N ocupa el centro sin pedir el micrófono bien, coño. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N con %C mensajes. Relevancia de quien no sabe irse a tiempo, asco. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C mensajes. El ego de %N leyó \\\\\'imprescindible\\\\\' donde decía \\\\\'presente\\\\\', patético. El ego lo celebra; el chat lo sopesa.',
  '%N, %C. Saturación con firma de usuario. El chat no aplaude, basura. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  'Con %C mensajes %N convirtió la presencia en identidad. Pobre identidad, ridículo. El ego lo celebra; el chat lo sopesa.',
  '%C. %N no pide validación: la fabrica a martillazos de texto, fracasado. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N lleva %C mensajes. El número te sostiene la autoestima mejor que el espejo, joder. El ego lo celebra; el chat lo sopesa.',
  'Actividad de %N medida en %C. El bot no mide talento; mide insistencia, cabrón. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C mensajes de %N. La relevancia comprada a plazos de spam emocional, gilipollas. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N con %C. Estás en todas las fotos del hilo y en pocas de las citas, mierda. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C. El grupo te tiene fichado, %N. Fichado no es admirado, coño. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N, %C mensajes. El ego hinchado por el contador revienta al primer silencio ajeno, asco. El ego lo celebra; el chat lo sopesa.',
  'Con %C, %N es el clima y a veces el mal clima, patético. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C mensajes. %N no desaparece ni cuando convendría, basura. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N lleva %C. Relevancia de peaje diario pagado en ruido, ridículo. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C en el pecho. %N, el número no te hace el personaje que crees, fracasado. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N, %C mensajes. O eres el pilar o eres el andamio que estorba, joder. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  'Con %C mensajes %N ya no tiene coartada de perfil bajo. Solo queda el juicio, cabrón. El ego lo celebra; el chat lo sopesa.',
  '%C de %N. Volumen alto, eco selectivo, autoestima engañada, gilipollas. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N con %C. El contador es tu CV y está inflado de aire, mierda. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C mensajes. %N, presencia que confunde cantidad con peso real, coño. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N lleva %C y el ego lo traduce a \\\\\'me necesitan\\\\\'. El chat traduce a \\\\\'está\\\\\', asco. El ego lo celebra; el chat lo sopesa.',
  'Actividad %C de %N. Documentada, visible, discutible en valor, patético. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C. %N se plantó en el hilo como quien planta bandera en terreno ajeno, basura. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N, %C mensajes. La autoestima te la financia el contador a crédito, ridículo. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  'Con %C, %N es imposible de ignorar e imposible de citar con orgullo, fracasado. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C mensajes de %N. El ranking de presencia te corona de cartón, joder. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N con %C. Relevancia forzada a base de no callar, cabrón. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C. El grupo te aguanta, %N. Aguantar no es querer, gilipollas. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N lleva %C mensajes. El ego baila; el contenido a veces no, mierda. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  'Con %C mensajes %N convirtió el chat en su escenario principal. Público cautivo, coño. El ego lo celebra; el chat lo sopesa.',
  '%C de actividad. %N, el número te sube y la calidad te mira de reojo, asco. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N, %C. Estás en el mapa. El mapa no es un altar, patético. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C mensajes. %N no es rumor: es estadística con ego, basura. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N con %C. La relevancia se te subió a la cabeza más que al texto, ridículo. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C. %N, el contador no miente; tu autoestima sí interpreta, fracasado. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N lleva %C mensajes. Presencia de quien no tiene plan B emocional, joder. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  'Con %C, %N ya es parte del mobiliario y del problema de ruido, cabrón. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C mensajes de %N. Importante por saturación, no por genio, gilipollas. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N con %C. El hilo te reconoce; no siempre te agradece, mierda. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C. Relevancia a lo bruto, %N. Bruto también en el ego, coño. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N, %C mensajes. El número te sostiene cuando el resto no aplaude, asco. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  'Actividad de %N: %C. Visible, insistente, discutible, patético. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C mensajes. %N, el ego lee el contador como si fuera un premio, basura. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%N lleva %C. Saturación con nombre y sin freno, ridículo. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.',
  '%C en el marcador. %N, presencia no es perdón del resto, fracasado. El ego lo celebra; el chat lo sopesa. La autoestima que vive del contador se nota a la legua, joder.'
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

module.exports = { cmdRelevance };
