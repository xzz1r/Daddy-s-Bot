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
  '%N, %C mensajes. Llevas aquí de mirón, leyendo lo que otros se curran y sin soltar una puta palabra. El grupo lo nota cada día, patético.',
  '%N, %C mensajes en el contador. Llevas aquí de mirón, leyendo lo que otros se curran y sin soltar una puta palabra. Mierda, miserable.',
  '%N, %C mensajes de silencio útil para nadie. Parasitas el hilo y el ranking te señala. El grupo lo nota cada día, qué cringe.',
  '%N, %C mensajes en el contador de silencio útil para nadie. Parasitas el hilo y el ranking te señala. Patético, da asco.',
  '%N, %C mensajes. Estás en el grupo como el mueble: ocupas sitio y no aportas. El grupo lo nota cada día',
  '%N, %C mensajes en el contador. Estás en el grupo como el mueble: ocupas sitio y no aportas. El grupo lo nota cada día, ridículo.',
  '%N, %C mensajes. El fantasma con nick: lees, no escribes, y el contador te delata. El grupo lo nota cada día, fracasado.',
  '%N, %C mensajes en el contador. El fantasma con nick: lees, no escribes, y el contador te delata. El grupo lo nota cada día, qué miseria.',
  '%N, %C mensajes. Relevancia cero: el chat funcionaría igual sin tu lectura silenciosa. El grupo lo nota cada día, da grima.',
  '%N, %C mensajes en el contador. Relevancia cero: el chat funcionaría igual sin tu lectura silenciosa. Gilipollas, qué nivel de pena.',
  '%N, %C mensajes. Parasito de notificaciones: abres, miras, cierras, nada. Y el ranking no miente, basura.',
  '%N, %C mensajes en el contador. Parasito de notificaciones: abres, miras, cierras, nada. El grupo lo nota cada día',
  '%N, %C mensajes. El ranking de irrelevancia tiene cabeza de cartel y eres tú. El grupo lo nota cada día',
  '%N, %C mensajes en el contador. El ranking de irrelevancia tiene cabeza de cartel y eres tú. El grupo lo nota cada día, qué vacío.',
  '%N, %C mensajes. No es discreción: es ausencia de aporte disfrazada de estar. El grupo lo nota cada día, indignante.',
  '%N, %C mensajes en el contador. No es discreción: es ausencia de aporte disfrazada de estar. El grupo lo nota cada día, qué vergüenza ajena.',
  '%N, %C mensajes. El grupo produce: tú consumes en silencio. Diagnóstico claro. El grupo lo nota cada día, da vergüenza.',
  '%N, %C mensajes en el contador. El grupo produce: tú consumes en silencio. Diagnóstico claro. El grupo lo nota cada día, qué flojo.',
  '%N, %C mensajes. Fantasma documentado: el bot solo pone el número al vacío. Y el ranking no miente, cutre, menudo desastre.',
  '%N, %C mensajes en el contador. Fantasma documentado: el bot solo pone el número al vacío. El grupo lo nota cada día, pringado, qué pena.',
  '%N, %C mensajes. Estás de relleno en el chat: el relleno no pide turno de palabra. El grupo lo nota cada día, patético.',
  '%N, %C mensajes en el contador. Estás de relleno en el chat: el relleno no pide turno de palabra. El grupo lo nota cada día, miserable.',
  '%N, %C mensajes. Relevancia bajo mínimos: el hilo no te extraña cuando faltas. El grupo lo nota cada día, qué cringe.',
  '%N, %C mensajes en el contador. Relevancia bajo mínimos: el hilo no te extraña cuando faltas. El grupo lo nota cada día, da asco.',
  '%N, %C mensajes. Parasitas el contador sin dejar una sola frase útil. Y el ranking no miente, asco con el fallo en 4K de chat, qué vergüenza.',
  '%N, %C mensajes en el contador. Parasitas el contador sin dejar una sola frase útil. El grupo lo nota cada día, cutre, ridículo.',
  '%N, %C mensajes. Mirón profesional: el oficio no cotiza en este ranking. Y el ranking no miente, fracasado.',
  '%N, %C mensajes en el contador. Mirón profesional: el oficio no cotiza en este ranking. El grupo lo nota cada día, qué miseria.',
  '%N, %C mensajes. El silencio no te hace misterioso: te hace irrelevante. El grupo lo nota cada día, da grima.',
  '%N, %C mensajes en el contador. El silencio no te hace misterioso: te hace irrelevante. El grupo lo nota cada día, qué nivel de pena.',
  '%N, %C mensajes. Ocupas un slot del grupo y el slot no se nota si se libera. El grupo lo nota cada día',
  '%N, %C mensajes en el contador. Ocupas un slot del grupo y el slot no se nota si se libera. El grupo lo nota cada día, qué cutre.',
  '%N, %C mensajes. Fantasma con historial de lectura y cero de escritura valiosa. El grupo lo nota cada día, da pena ajena.',
  '%N, %C mensajes en el contador. Fantasma con historial de lectura y cero de escritura valiosa. El grupo lo nota cada día, qué vacío.',
  '%N, %C mensajes. El chat no te necesita: el ranking de relevancia lo confirma. El grupo lo nota cada día, indignante.',
  '%N, %C mensajes en el contador. El chat no te necesita: el ranking de relevancia lo confirma. El grupo lo nota cada día, qué vergüenza ajena.',
  '%N, %C mensajes. El chat no te necesita: el contador de relevancia de relevancia lo confirma. El grupo lo nota cada día, da vergüenza.',
  '%N, %C mensajes. Parasito del hilo: te alimentas de lo ajeno y no devuelves. El grupo lo nota cada día, qué flojo.',
  '%N, %C mensajes en el contador. Parasito del hilo: te alimentas de lo ajeno y no devuelves. El grupo lo nota cada día, desperdicio, menudo desastre.',
  '%N, %C mensajes. Irrelevancia medible: el bot no inventa, cuenta. Y el ranking no miente, pringado sin segunda lectura que lo arregle, qué pena.',
  '%N, %C mensajes en el contador. Irrelevancia medible: el bot no inventa, cuenta. El grupo lo nota cada día, patético.',
  '%N, %C mensajes. Parasitas el grupo con la elegancia de quien no se entera de que molesta. El grupo lo nota cada día, miserable.',
  '%N, %C mensajes. El fantasma del ranking: presente en la lista, ausente en el aporte. El grupo lo nota cada día, qué cringe.',
  '%N, %C mensajes. Relevancia en el sótano: el hilo no te cita porque no hay qué citar. El grupo lo nota cada día, da asco.',
  '%N, %C mensajes. Mirón de primera: el título no se disputa. Y el ranking no miente, patético en el único marcador que importa aquí, qué vergüenza.',
  '%N, %C mensajes. El chat produce sin ti: el experimento mental ya está hecho. El grupo lo nota cada día, ridículo.',
  '%N, %C mensajes. Silencio de quien no tiene nada y ocupa sitio igual. Y el ranking no miente, fracasado.',
  '%N, %C mensajes. Irrelevancia con nick: el pack completo del que no pinta nada. El grupo lo nota cada día',
  '%N, %C mensajes. Parasito documentado por %C mensajes de nada útil. Y el ranking no miente, asco con la cara del resultado a la vista, da grima.',
  '%N, %C mensajes. El contador te ve: el hilo no te necesita. Y el ranking no miente, cutre con el dígito como única defensa, qué nivel de pena.',
  '%N, %C mensajes. Fantasma de los que leen el drama y nunca lo firman. Y el ranking no miente',
  '%N, %C mensajes. Relevancia cero con evidencia numérica. Y el ranking no miente, fracasado delante del ranking y de la cara, qué cutre.',
  '%N, %C mensajes. Ocupas espacio de miembro: el espacio no se defiende solo. Y el ranking no miente, da pena ajena.',
  '%N, %C mensajes. Parasitas notificaciones ajenas como deporte. Y el ranking no miente, mierda delante de quien no quería verlo, qué vacío.',
  '%N, %C mensajes. El ranking de aporte te deja donde mereces: abajo. Y el ranking no miente, coño sin recurso ni nota al pie, indignante.',
  '%N, %C mensajes. Silencio que no es estrategia: es vacío. Y el ranking no miente, cabrón en la foto fija del ranking, qué vergüenza ajena.',
  '%N, %C mensajes. Mirón con historial: el bot traduce historial a veredicto. El grupo lo nota cada día, da vergüenza.',
  '%N, %C mensajes. Irrelevante de forma estable: no es un mal mes. Y el ranking no miente, patético en el momento que más dolía soltarlo, qué flojo.',
  '%N, %C mensajes. El grupo no se cae sin ti: se aligera. Y el ranking no miente, ridículo en el recuento que no perdona, menudo desastre.',
  '%N, %C mensajes. Parasito del contador: sumas presencia y restas sustancia. El grupo lo nota cada día, qué pena.',
  '%N, %C mensajes. Fantasma oficial del ranking de relevancia. Y el ranking no miente, desperdicio con el veredicto seco del bot, patético.',
  '%N, %C mensajes. %C mensajes y cero eco útil en el hilo. Y el ranking no miente, asco con la firma legible del comando, miserable.',
  '%N, %C mensajes. La relevancia no se finge leyendo: se demuestra escribiendo. El grupo lo nota cada día, cutre, qué cringe.',
  '%N, %C mensajes. Parasitas el chat y el ranking te hace el retrato. Y el ranking no miente, pringado, da asco.',
  '%N, %C mensajes. Irrelevancia con sello del comando. Y el ranking no miente, fracasado con el chat enterado del cargo, qué vergüenza.',
  '%N, %C mensajes. El mirón del grupo tiene nombre: el tuyo. Y el ranking no miente y no hay modo de suavizarlo, ridículo.',
  '%N, %C mensajes. Silencio de relleno: el relleno se expulsa cuando toca. Y el ranking no miente, fracasado.',
  '%N, %C mensajes. Relevancia bajo tierra: %C mensajes de prueba. Y el ranking no miente, coño sin segunda oportunidad hoy, qué miseria.',
  '%N, %C mensajes. Parasito sin gracia: ni el silencio tiene estilo. Y el ranking no miente, cabrón con el botín o el fail a la vista, da grima.',
  '%N, %C mensajes. El hilo no te abre hueco: tú no abriste ninguno. Y el ranking no miente, qué nivel de pena.',
  '%N, %C mensajes. Fantasma con contador: la peor combinación. Y el ranking no miente, patético con la cara del resultado a la vista, basura.',
  '%N, %C mensajes. Irrelevante y documentado: no hay debate. Y el ranking no miente, ridículo con el eco del almost todavía sonando, qué cutre.',
  '%N, %C mensajes. Parasitas el promedio de actividad sin subir el de calidad. El grupo lo nota cada día, da pena ajena.',
  '%N, %C mensajes. El ranking te señala: el resto del grupo ya había señalado. El grupo lo nota cada día, desperdicio, qué vacío.',
  '%N, %C mensajes. Mirón crónico: el oficio no tiene jubilación aquí. Y el ranking no miente, asco con el bot como notario del fallo, indignante.',
  '%N, %C mensajes. Relevancia inexistente con %C mensajes de coartada. Y el ranking no miente, cutre y el chat archiva sin debate, qué vergüenza ajena.',
  '%N, %C mensajes. El chat no nota tu ausencia: nota tu falta de aporte. Y el ranking no miente, pringado, da vergüenza.',
  '%N, %C mensajes. Parasito del hilo: diagnóstico cerrado. Y el ranking no miente, fracasado y basta el dato del ranking, qué flojo.',
  '%N, %C mensajes. Silencio que no aporta misterio: aporta hueco. Y el ranking no miente y el hilo no pide amplificación, menudo desastre.',
  '%N, %C mensajes. Irrelevancia medible en %C mensajes. Y el ranking no miente, mierda sin barniz de relato heroico, qué pena.',
  '%N, %C mensajes. Fantasma que el bot se cansa de no oír. Y el ranking no miente, coño y no hay modo de suavizarlo, patético.',
  '%N, %C mensajes. Parasitas y el contador no te absuelve. Y el ranking no miente, cabrón en la foto fija del ranking, miserable.',
  '%N, %C mensajes. Relevancia en números rojos de sustancia. Y el ranking no miente, gilipollas y el ranking no pide permiso, qué cringe.',
  '%N, %C mensajes. El mirón tiene %C mensajes y cero frases que citar. Y el ranking no miente, da asco.',
  '%N, %C mensajes. Ocupas sitio de quien podría escribir: el sitio se puede liberar. El grupo lo nota cada día, qué vergüenza.',
  '%N, %C mensajes. Parasito sin narrativa heroica: solo el número. Y el ranking no miente, basura con la firma legible del comando, ridículo.',
  '%N, %C mensajes. Irrelevante de fábrica: el comando solo lo nombra. Y el ranking no miente',
  '%N, %C mensajes. El hilo sigue sin ti: el experimento ya está hecho cada día. El grupo lo nota cada día, qué miseria.',
  '%N, %C mensajes. Fantasma del ranking: presente en la lista, ausente en la memoria del hilo. El grupo lo nota cada día, cutre, da grima.',
  '%N, %C mensajes. Parasitas notificaciones: el deporte de los que no firman. El grupo lo nota cada día, pringado, qué nivel de pena.',
  '%N, %C mensajes. Relevancia cero: %C mensajes no la inventan. Y el ranking no miente, fracasado y el sistema cierra sin discusión, basura.',
  '%N, %C mensajes. Mirón profesional con carnet del contador. Y el ranking no miente con el chat enterado del cargo, qué cutre.',
  '%N, %C mensajes. Silencio de quien no aporta: el bot no lo confunde con elegancia. El grupo lo nota cada día, da pena ajena.',
  '%N, %C mensajes. Irrelevante y estable: el peor pronóstico. Y el ranking no miente, coño con el fail todavía caliente, qué vacío.',
  '%N, %C mensajes. Parasito del grupo. Y el ranking no miente, cabrón',
  '%N, %C mensajes. El ranking de aporte te deja en el sótano con %C mensajes de testigo. El grupo lo nota cada día, qué vergüenza ajena.',
  '%N, %C mensajes. Relevancia bajo mínimos legales del chat. Y el ranking no miente, ridículo con el saldo a la intemperie, da vergüenza.',
  '%N, %C mensajes. Parasitas el hilo y el hilo no te devuelve eco. Y el ranking no miente, basura delante de quien aún leía el hilo, qué flojo.',
  '%N, %C mensajes. Mirón: el título se gana no escribiendo nada útil. Y el ranking no miente, desperdicio, menudo desastre.',
  '%N, %C mensajes. Irrelevancia con %C mensajes de prueba cargada. Y el ranking no miente, asco sin descuento por empatía, qué pena.',
  '%N, %C mensajes. El chat no te cita porque no hay material. Y el ranking no miente, cutre y el ranking no pide permiso, patético.',
  '%N, %C mensajes. Parasito sin estilo: ni el vacío tiene gracia. Y el ranking no miente, pringado en el momento que más dolía soltarlo, miserable.',
  '%N, %C mensajes. Silencio que el bot traduce a irrelevancia. Y el ranking no miente, fracasado y el sistema marca el punto final, qué cringe.',
  '%N, %C mensajes. Relevancia inexistente: el comando lo dice en claro. Y el ranking no miente, da asco.',
  '%N, %C mensajes. Fantasma oficial: %C mensajes y el mismo veredicto. Y el ranking no miente, qué vergüenza.',
  '%N, %C mensajes. Parasitas el contador de miembros sin el de aporte. Y el ranking no miente, coño y el chat archiva sin debate, ridículo.',
  '%N, %C mensajes. Mirón del drama ajeno: el drama no te nombra. Y el ranking no miente, cabrón con la cara del resultado a la vista, fracasado.',
  '%N, %C mensajes. Irrelevante de forma que ya no sorprende. Y el ranking no miente, gilipollas y el grupo ya pasó de página, qué miseria.',
  '%N, %C mensajes. El grupo produce: tú miras. Diagnóstico en una línea. Y el ranking no miente, da grima.',
  '%N, %C mensajes. Parasito del ranking: el retrato es este mensaje. Y el ranking no miente, qué nivel de pena.',
  '%N, %C mensajes. Relevancia en el fondo del pozo con %C mensajes de lastre. El grupo lo nota cada día, basura.',
  '%N, %C mensajes. Fantasma que no deja frase: solo rastro de lectura. Y el ranking no miente, asco con el peaje cobrado al natural, qué cutre.',
  '%N, %C mensajes. Parasitas y el bot no ofrece indulgencia. Y el ranking no miente, cutre con el número en la frente del mensaje, da pena ajena.',
  '%N, %C mensajes. Mirón con %C mensajes: el número no te salva. Y el ranking no miente, pringado y el archivo queda cerrado, qué vacío.',
  '%N, %C mensajes. Irrelevancia documentada: punto final del tramo. Y el ranking no miente, indignante.',
  '%N, %C mensajes. El hilo no te necesita: el ranking lo certifica. Y el ranking no miente con el fail todavía caliente, qué vergüenza ajena.',
  '%N, %C mensajes. Parasito sin misterio: el vacío se ve. Y el ranking no miente, mierda con el grupo de testigo silencioso, da vergüenza.',
  '%N, %C mensajes. Relevancia cero con evidencia de %C mensajes. Y el ranking no miente, coño y el sistema marca el punto final, qué flojo.',
  '%N, %C mensajes. Fantasma del chat: el oficio no se discute. Y el ranking no miente, cabrón y el ranking lo deja por escrito, menudo desastre.',
  '%N, %C mensajes. Mirón crónico: el contador es el carnet. Y el ranking no miente, patético y el ranking lo deja por escrito, qué pena.',
  '%N, %C mensajes. Irrelevante y el grupo lo sabía antes del comando. Y el ranking no miente, patético.',
  '%N, %C mensajes. Silencio que no aporta: el bot no lo confunde con estrategia. El grupo lo nota cada día, miserable.',
  '%N, %C mensajes. Parasito del hilo: %C mensajes de coartada inútil. Y el ranking no miente, desperdicio, qué cringe.',
  '%N, %C mensajes. Relevancia bajo tierra: no hay ascensor. Y el ranking no miente, asco en el parte que nadie borra, da asco.',
  '%N, %C mensajes. Fantasma con nick: el pack del que no pinta nada. Y el ranking no miente, cutre delante del marcador en vivo, qué vergüenza.',
  '%N, %C mensajes. Parasitas el promedio y no subes ninguno que importe. Y el ranking no miente',
  '%N, %C mensajes. Mirón: el drama se escribe sin tu firma. Y el ranking no miente, fracasado sin suavizar el golpe del número, fracasado.',
  '%N, %C mensajes. Irrelevancia medible y estable. Y el ranking no miente sin consuelo de manual barato, qué miseria.',
  '%N, %C mensajes. El chat sigue igual sin tu aporte: porque no hay aporte. Y el ranking no miente, da grima.',
  '%N, %C mensajes. Parasito documentado por el comando de relevancia. Y el ranking no miente, coño con el botín o el fail a la vista, qué nivel de pena.',
  '%N, %C mensajes. Relevancia inexistente: %C mensajes no crean sustancia. Y el ranking no miente, basura.',
  '%N, %C mensajes. Fantasma oficial del sótano del ranking. Y el ranking no miente, gilipollas sin segunda lectura que lo arregle, qué cutre.',
  '%N, %C mensajes. Parasitas el grupo: el grupo no te parasita de vuelta. Y el ranking no miente, da pena ajena.',
  '%N, %C mensajes. Mirón con historial vacío de frases útiles. Y el ranking no miente, ridículo en alta resolución de group chat, qué vacío.',
  '%N, %C mensajes. Irrelevante de fábrica: este mensaje es el sello. Y el ranking no miente, basura sin filtro de autoayuda, indignante.',
  '%N, %C mensajes. Silencio de quien ocupa sitio: el sitio se puede liberar. El grupo lo nota cada día',
  '%N, %C mensajes. Parasito sin gracia ni misterio: solo el número %C. Y el ranking no miente, asco con el peaje cobrado al natural, da vergüenza.',
  '%N, %C mensajes. Relevancia en números que dan pena: el bot no suaviza. Y el ranking no miente, cutre, qué flojo.',
];

// ═══════════════════════════════════════════════════════════════════════════
// TRAMO MEDIO — está, pero no pesa. Ni fantasma ni referente.
// ═══════════════════════════════════════════════════════════════════════════

let INTERMEDIO = [
  '%N, %C mensajes. Ni pareces un puto fantasma ni un referente. Vives en ese limbo de mierda donde nadie te odia y nadie te echa de menos tampoco.',
  '%C mensajes, %N. Ya no das pena pero tampoco impresionas ni de coña. Felicidades por escalar del sótano al puto pasillo de en medio.',
  '%N con %C mensajes. Hablas lo justo para que no te llamen mueble y ni una palabra más. Mediocridad calculada con la precisión de un puto contable.',
  'Con %C mensajes, %N, has dejado de ser un cero pero sigues sin ser nadie importante. Empate técnico con la irrelevancia, y así seguirás si no cambias el ritmo.',
  '%N, %C putos mensajes. Suficiente para que te saluden, insuficiente para que te inviten a algo que importe. Así te va la vida en este grupo.',
  '%C mensajes, %N. Estás ahí, en tierra de nadie, aportando lo mínimo indispensable para que nadie te toque los cojones. Gestión de mierda impecable.',
  '%N con %C mensajes. No jodes al grupo ni lo sostienes. Flotas en medio como una puta boya sin rumbo, ni hundes ni llegas a ningún puerto.',
  'Con %C mensajes, %N, tienes justo lo necesario para que el bot no te insulte con ganas. Aprovecha, porque el mérito no da para mucho más.',
  '%N, %C mensajes. Podrías ser alguien aquí y has decidido que con existir a medias te vale. Ambición de mierda, resultado a la altura.',
  '%C mensajes, %N. El grupo te reconoce y sigue sin recordar ni una puta frase tuya. Presencia sí, contenido no. Vaya papelón.',
  '%N con %C mensajes. Ni tan mirón como para dar asco ni tan hablador como para dar la turra. El equilibrio perfecto de la nada con nombre.',
  'Con %C mensajes, %N, has salido del pozo a rastras y te has sentado en el borde a fumar. Ni sube ni baja, solo mira.',
  '%N, %C mensajes. Cumples el expediente y ni una gota más. Ese es tu techo y por lo visto te la suda no romperlo nunca.',
  '%C mensajes, %N. Suficiente para no ser el hazmerreír del grupo, insuficiente para que nadie te cite en una puta conversación importante.',
  '%N con %C mensajes. Estás en esa franja gris donde el grupo te ubica sin esfuerzo y te olvida con la misma facilidad. Anodino de manual, sin paliativos.',
  'Con %C mensajes, %N, no llegas a molestar y tampoco llegas a importar. Zona tibia, la peor de todas para presumir de algo.',
  '%N, %C mensajes. Escribes lo justo para no quedar como el gorrón oficial y te callas antes de que alguien espere algo serio de ti. Estrategia de cobarde.',
  '%C mensajes, %N. Vas tirando en la mitad de la tabla, cómodo, sin destacar ni hundirte. La medianía tiene sus ventajas y tú las explotas todas.',
  '%N con %C mensajes. Ni te has ganado un respeto ni te has ganado un desprecio. Solo una nota media que a nadie le interesa comentar.',
  'Con %C mensajes, %N, apareces cuando la conversación ya está caliente y nunca la enciendes tú. Sumarte es gratis, arrancarla cuesta huevos que no tienes.',
  '%N, %C mensajes. Tienes rodaje para haber dejado huella y solo has dejado una mancha del tamaño de tu esfuerzo real: minúscula.',
  '%C mensajes, %N. El grupo sabe tu nombre y ahí se acaba la relación. Ni fama ni infamia, solo una entrada más en una lista larga.',
  '%N con %C mensajes. Aportas a ráfagas, como quien mea y se sacude rápido para no mojarse. Constancia cero, esfuerzo intermitente, resultado tibio.',
  'Con %C mensajes, %N, estás justo donde nadie te busca ni te destierra. Un puto término medio con menos personalidad que un formulario.',
  '%N, %C mensajes. Ni fantasma ni pilar, un poco de todo y mucho de nada. La fórmula perfecta para que a nadie le importe tu opinión.',
  '%C mensajes, %N. Has subido lo suficiente para dejar de dar vergüenza ajena y te has quedado ahí sentado, la mar de a gusto. Sin ambición ni cojones.',
  '%N con %C mensajes. Tu huella en este grupo es del tamaño de una puta mancha de café: se ve, no molesta, nadie la limpia ni la comenta.',
  'Con %C mensajes, %N, participas lo justo para que el grupo no te dé por perdido. Un salvavidas mediocre agarrado con las dos manos, sin soltarlo nunca.',
  '%N, %C mensajes. Ni escalas ni te hundes, solo flotas en medio como el puto corcho de la fiesta: está, pero nadie brinda por él.',
  '%C mensajes, %N. Te falta constancia para pesar y te sobra pereza para que se note. Esa combinación de mierda te tiene anclado en el medio.',
  '%N con %C mensajes. Has demostrado que sabes escribir y has decidido no demostrar mucho más. Vago con estilo, que tampoco es un mérito.',
  'Con %C mensajes, %N, la tabla te sitúa en la parte que nadie mira ni comenta. Ni gloria ni vergüenza, solo relleno con nombre propio.',
  '%N, %C mensajes. Se te ve capacidad y se te ve pereza a partes iguales, y por ahora está ganando la pereza con ventaja de puta madre.',
  '%C mensajes, %N. Bastante para que no te confundan con un mueble, poco para que alguien te ponga en el podio de nada. Justo la nota que sacas siempre.',
  '%N con %C mensajes. El grupo funcionaría casi igual sin ti, con el matiz de "casi" que te salva por los pelos. No lo sueltes, que es lo único que tienes.',
  'Con %C mensajes, %N, tienes el carisma de un trámite administrativo: necesario a veces, memorable nunca, discutido jamás.',
  '%N, %C mensajes. Escribes cuando ya no hay riesgo y callas cuando toca dar la cara. Timing de cobarde disfrazado de discreción.',
  '%C mensajes, %N. Ocupas la casilla del "normal", que es la casilla que nadie señala con el dedo ni para bien ni para mal. Ahí sigues.',
  '%N con %C mensajes. Has hecho lo suficiente para que el bot no te destroce y lo insuficiente para que te alabe. Justo en el filo.',
  'Con %C mensajes, %N, tu implicación es la de quien se cuela en la barbacoa ajena: aparece, come algo y se larga antes de recoger. Comodón de mierda.',
  '%N, %C mensajes. Ni te comprometes ni te desentiendes del todo. Medias tintas que a nadie emocionan y a nadie cabrean, la mar de cómodas para ti, qué nivel de pena.',
  '%C mensajes, %N. Sales en la foto de grupo pero en la segunda fila, sin sonreír. Presente en el registro, ausente en la puta memoria de todos, basura.',
  '%N con %C mensajes. Has evitado la vergüenza del fondo de la tabla y has renunciado a pelear por algo más. Ambición de folio en blanco, qué cutre.',
  'Con %C mensajes, %N, cumples con lo mínimo y te quedas tan ancho. Es una táctica legítima, la más aburrida de todas, pero legítima, da pena ajena.',
  '%N, %C mensajes. Te mueves por los márgenes del grupo, ni al frente ni fuera. Zona de confort con wifi y sin un puto compromiso real, qué vacío.',
  '%C mensajes, %N. Tienes la constancia de una promesa de año nuevo: arranca fuerte, se apaga rápido y vuelve a medio gas cuando le apetece, indignante.',
  '%N con %C mensajes. Ni sostienes el grupo ni lo hundes, solo lo acompañas a medio metro de distancia. Comodidad rentable, mérito ninguno, qué vergüenza ajena.',
  'Con %C mensajes, %N, te has ganado el título de "el que está pero no se sabe muy bien para qué". Un puto cargo sin funciones ni honores, da vergüenza.',
  '%N, %C mensajes. Podrías tirar para arriba y has elegido quedarte flotando en el medio, que es donde menos esfuerzo cuesta y menos se te exige, qué flojo.',
  '%C mensajes, %N. Ese número te salva de la vergüenza del fondo y no te acerca ni de lejos a la gloria de arriba. El eterno centro de la tabla, menudo desastre.',
];

// ═══════════════════════════════════════════════════════════════════════════
// TRAMO ALTO — sostiene el grupo de verdad.
// ═══════════════════════════════════════════════════════════════════════════

const RELEVANTE = [
  '%N lleva %C mensajes. El contador no sabe si sostienes el hilo o solo lo llenas. Tu ego siempre elige la lectura que te favorece, patético.',
  'Con %C mensajes, %N, ya no puedes hacerte el perfil bajo. Estás en el mapa. La duda es si te respetan o solo te localizan, miserable.',
  '%N con %C mensajes. Volumen de residente. Tú lo lees como importancia; el chat, como costumbre, qué cringe. Se nota en cómo te leen, qué vergüenza.',
  '%C mensajes de %N. Te notan si faltas y te aguantan si sobras. No es lo mismo ser necesario a ratos que ser valorado, da asco.',
  '%N, %C mensajes. O eres pilar o eres carga. El ego elige pilar. El hilo a veces elige lo otro sin decírtelo, qué vergüenza.',
  '%C en el contador de %N. Estás empadronado, no de visita. Eso no certifica talento: certifica que no te fuiste, ridículo.',
  '%N lleva %C. Ya no eres irrelevante por callar. Ahora el tema es si tu peso es sustancia o solo saturación, fracasado.',
  '%C mensajes de %N. El bot te ve y el grupo también. El ego hinchado por el número no tapa el relleno cuando lo hay, qué miseria.',
  '%N con %C mensajes. Convertiste el grupo en tu segunda oficina. Fichar no es aportar, da grima. Se nota en cómo te leen, basura.',
  '%C mensajes. %N no es fantasma: tiene pruebas de sobra. El ego celebra el volumen; el eco real es más selectivo, qué nivel de pena.',
  '%N, %C mensajes y sin freno. Enganche al hilo. La dependencia se nota cuando el silencio ajeno pica, basura. Se nota en cómo te leen, da pena ajena.',
  'Con %C mensajes %N es clima del chat. El clima también puede ser una tormenta que nadie pidió, qué cutre. Se nota en cómo te leen, qué vacío.',
  '%C mensajes de %N. Presencia sin pedir permiso. A veces sin brillo. El ego oye imprescindible donde pone presente, da pena ajena.',
  '%N ha soltado %C. El archivo lo confirma. La vanidad lo enmarca como legado. El legado se mide en citas, no en envíos, qué vacío.',
  '%C de actividad. %N fijo en el ranking de ruido. Inevitable no es admirable, indignante. Se nota en cómo te leen, miserable.',
  '%N con %C mensajes. El contador es sombra y muleta. Si el número te sostiene la autoestima, el número es el problema, patético.',
  '%C mensajes de %N. Cantidad gritando para no oír la duda de si dejas algo cuando callas, miserable. Se nota en cómo te leen, da asco.',
  '%N lleva %C. Saliste del cajón de los callados y entraste al de los que escriben de más. Ese también juzga, qué cringe.',
  'Con %C mensajes, %N, cuando faltas se nota y cuando vuelves a veces se negocia el entusiasmo, da asco. Se nota en cómo te leen, ridículo.',
  '%C en el reloj de %N. La costumbre no es cariño. Es inercia con tu nombre encima, qué vergüenza. Se nota en cómo te leen, fracasado.',
  '%N, %C mensajes. O aportas o ocupas. El ego odia la pregunta y por eso sigue escribiendo, ridículo. Se nota en cómo te leen, qué miseria.',
  'Con %C mensajes %N se plantó. Territorialidad de quien no tiene otro escenario para sentirse alguien, fracasado.',
  '%C de %N. Currículum de scroll. Presencia no es peso, qué miseria. Se nota en cómo te leen, qué nivel de pena.',
  '%N no desaparece: %C veces lo prueba. Persistencia a veces es miedo a no existir fuera del hilo, da grima. Se nota en cómo te leen, basura.',
  '%C mensajes. %N es mobiliario del grupo. El mobiliario no recibe respeto: recibe uso, qué nivel de pena. Se nota en cómo te leen, qué cutre.',
  'La relevancia de %N se mide en %C. Duele cuando es ruido útil a ratos. Eso no construye autoestima estable, basura.',
  '%N, %C. El bot te pone en el mapa. El ego lo enmarca. El marco no sube el precio, qué cutre. Se nota en cómo te leen, qué vacío.',
  '%N. %C mensajes de presencia. Presencia no es peso. El chat lo sabe aunque tú lo negocies, da pena ajena. Se nota en cómo te leen, indignante.',
  '%N con %C. El hilo te reconoce al vuelo y a veces suspira. Reconocer no es admirar, qué vacío. Se nota en cómo te leen, patético.',
  '%C. %N es residente, no turista. Los residentes también pueden ser el problema, indignante. Se nota en cómo te leen, miserable.',
  '%N lleva %C mensajes. Saturación con firma. El ego lo llama compromiso, patético. Se nota en cómo te leen, qué cringe.',
  'Actividad alta: %N %C. Visible no es respetado. Visibilidad sin filtro se vuelve ruido con dueño, miserable. Se nota en cómo te leen, da asco.',
  '%C mensajes. %N no pide contexto: lo genera a martillazos. El martillo no es criterio, qué cringe. Se nota en cómo te leen, qué vergüenza.',
  '%N, %C en el contador como medalla. Si el contenido no acompaña, la medalla es de hojalata, da asco. Se nota en cómo te leen, ridículo.',
  'Con %C, %N ya es estadística del grupo. Las estadísticas no tienen aura: tienen columnas, qué vergüenza. Se nota en cómo te leen, fracasado.',
  '%C mensajes de %N. Volumen de quien vive aquí porque fuera el escenario es más duro, ridículo. Se nota en cómo te leen, qué miseria.',
  '%N no es rumor: son %C datos. Los datos no te hacen imprescindible: te hacen medible, fracasado. Se nota en cómo te leen, da grima.',
  '%C. Relevancia por insistencia de %N. La insistencia cansa cuando el ego no para de facturar presencia, qué miseria.',
  '%N con %C mensajes. El ranking de presencia te nombra. Presencia es el mínimo para no ser fantasma, no un trofeo, da grima.',
  '%C mensajes. %N, el contador no te suelta y tú tampoco. Esa simbiosis alimenta un ego frágil, qué nivel de pena.',
  '%N lleva %C. Enganche que ya no se discute. El ego lo celebra; el chat lo soporta, basura. Se nota en cómo te leen, da pena ajena.',
  'Con %C mensajes %N carga el grupo o lo aplasta. A veces no se distingue, qué cutre. Se nota en cómo te leen, qué vacío.',
  '%C de %N. Fiel o dependiente: el número no aclara. Tu autoestima elige fiel, da pena ajena. Se nota en cómo te leen, indignante.',
  '%N, %C mensajes. Importante a la fuerza. La fuerza no es respeto, qué vacío. Se nota en cómo te leen, patético.',
  '%C mensajes. %N se hizo fijo sin votación. Nadie votó tu ego al alza, indignante. Se nota en cómo te leen, miserable.',
  'Actividad de %N: %C. Documentada. Sin anestesia para la vanidad del contador, patético. Se nota en cómo te leen, qué cringe.',
  '%N con %C. Ya no te queda el disfraz de fantasma. Ahora el problema puede ser el exceso, miserable. Se nota en cómo te leen, da asco.',
  '%C mensajes de %N. Historial no es legado. Legado se cita; historial se cuenta, qué cringe. Se nota en cómo te leen, qué vergüenza.',
  '%N, %C. Presencia sin pausa. La pausa te haría un favor que el ego no quiere, da asco. Se nota en cómo te leen, ridículo.',
  '%C. El grupo cuenta contigo a regañadientes, %N. Eso no es admiración: es gestión, qué vergüenza. Se nota en cómo te leen, fracasado.',
  '%N, %C mensajes. El contador te sube el ego y el contenido flojo te lo baja, ridículo. Se nota en cómo te leen, qué miseria.',
  'Con %C, %N ya no es invisible: es inevitable. Inevitable no es querido, fracasado. Se nota en cómo te leen, da grima.',
  '%C mensajes de %N. La autoestima come del número; el grupo, del filtro, qué miseria. Se nota en cómo te leen, qué nivel de pena.',
  '%N lleva %C y trata el volumen como argumento. El hilo lo desmiente en silencio, da grima. Se nota en cómo te leen, basura.',
  '%C en el marcador. %N ocupa el centro sin que le hayan dado el micrófono, qué nivel de pena. Se nota en cómo te leen, qué cutre.',
  '%N con %C mensajes. Relevancia de quien no sabe irse a tiempo, basura. Se nota en cómo te leen, da pena ajena.',
  '%C mensajes. El ego de %N leyó imprescindible donde el archivo decía presente, qué cutre. Se nota en cómo te leen, qué vacío.',
  '%N, %C. Saturación con firma. El chat no aplaude el exceso: lo tolera, da pena ajena. Se nota en cómo te leen, indignante.',
  'Con %C mensajes %N convirtió la presencia en identidad. Si la identidad es solo métrica, el vacío se nota, qué vacío.',
  '%C. %N no pide validación: la fabrica a martillazos de texto, indignante. Se nota en cómo te leen, miserable.',
  '%N lleva %C mensajes. El número te sostiene la autoestima mejor que un espejo honesto, patético. Se nota en cómo te leen, qué cringe.',
  'Actividad de %N en %C. El bot mide insistencia, no talento. Confundirlas hincha el ego, miserable. Se nota en cómo te leen, da asco.',
  '%C mensajes de %N. Relevancia a plazos de spam emocional. La deuda se paga en paciencia ajena, qué cringe. Se nota en cómo te leen, qué vergüenza.',
  '%N con %C. Estás en todas las fotos del hilo y en pocas citas que importan, da asco. Se nota en cómo te leen, ridículo.',
  '%C. El grupo te tiene fichado, %N. Fichado no es admirado: es localizado, qué vergüenza. Se nota en cómo te leen, fracasado.',
  '%N, %C mensajes. El ego hinchado por el contador revienta al primer silencio largo, ridículo. Se nota en cómo te leen, qué miseria.',
  'Con %C, %N es el clima y a veces el mal clima. El barómetro no discute, fracasado. Se nota en cómo te leen, da grima.',
  '%C mensajes. %N no desaparece ni cuando convendría. Quedarse no es lo mismo que valer, qué miseria. Se nota en cómo te leen, qué nivel de pena.',
  '%N lleva %C. Relevancia de peaje diario en ruido. El peaje compra paso, no respeto, da grima. Se nota en cómo te leen, basura.',
  '%C en el pecho. %N, el número no te hace el personaje que ensayas cuando nadie escribe, qué nivel de pena. Se nota en cómo te leen, qué cutre.',
  '%N, %C mensajes. O eres el pilar o eres el andamio que estorba, basura. Se nota en cómo te leen, da pena ajena.',
  'Con %C mensajes %N perdió la coartada del perfil bajo. Solo queda si vales el espacio, qué cutre. Se nota en cómo te leen, qué vacío.',
  '%C de %N. Volumen alto, eco selectivo, autoestima engañada por el primer dato, da pena ajena. Se nota en cómo te leen, indignante.',
  '%N con %C. El contador es tu CV público. Si está inflado de aire, se ve, qué vacío. Se nota en cómo te leen, patético.',
  '%C mensajes. %N confunde cantidad con peso. El peso se nota cuando no estás, indignante. Se nota en cómo te leen, miserable.',
  '%N lleva %C y el ego traduce me necesitan. El chat traduce está. Ahí está el hueso, patético. Se nota en cómo te leen, qué cringe.',
  'Actividad %C de %N. Visible, insistente, discutible. Ser discutible no es ser central, miserable. Se nota en cómo te leen, da asco.',
  '%C. %N se plantó en el hilo como quien planta bandera. El terreno no siempre era suyo, qué cringe. Se nota en cómo te leen, qué vergüenza.',
  '%N, %C mensajes. La autoestima te la financia el contador a crédito, da asco. Se nota en cómo te leen, ridículo.',
  'Con %C, %N es imposible de ignorar e imposible de citar con orgullo, qué vergüenza. Se nota en cómo te leen, fracasado.',
  '%C mensajes de %N. El ranking de presencia te corona de cartón, ridículo. Se nota en cómo te leen, qué miseria.',
  '%N con %C. Relevancia forzada a base de no callar. El público es cautivo, no fan, fracasado. Se nota en cómo te leen, da grima.',
  '%C. El grupo te aguanta, %N. Aguantar no es querer, qué miseria. Se nota en cómo te leen, qué nivel de pena.',
  '%N lleva %C mensajes. El ego baila con el número; el contenido a veces se queda sentado, da grima. Se nota en cómo te leen, basura.',
  'Con %C mensajes %N convirtió el chat en escenario principal. El público no eligió la obra, qué nivel de pena. Se nota en cómo te leen, qué cutre.',
  '%C de actividad. %N, el número te sube y la calidad floja te mira de reojo, basura. Se nota en cómo te leen, da pena ajena.',
  '%N, %C. Estás en el mapa. El mapa no es un altar: es una rejilla, qué cutre. Se nota en cómo te leen, qué vacío.',
  '%C mensajes. %N es estadística con ego. La estadística no te debe un mito, da pena ajena. Se nota en cómo te leen, indignante.',
  '%N con %C. La relevancia se te subió a la cabeza más que al texto, qué vacío. Se nota en cómo te leen, patético.',
  '%C. %N, el contador no miente; tu autoestima interpreta de más, indignante. Se nota en cómo te leen, miserable.',
  '%N lleva %C mensajes. Presencia de quien no tiene plan B emocional fuera del hilo, patético. Se nota en cómo te leen, qué cringe.',
  'Con %C, %N es parte del mobiliario y del problema de ruido, miserable. Se nota en cómo te leen, da asco.',
  '%C mensajes de %N. Importante por saturación, no por genio, qué cringe. Se nota en cómo te leen, qué vergüenza.',
  '%N con %C. El hilo te reconoce; no siempre te agradece, da asco. Se nota en cómo te leen, ridículo.',
  '%C. Relevancia a lo bruto, %N. Bruto también en cómo el ego digiere el dato, qué vergüenza. Se nota en cómo te leen, fracasado.',
  '%N, %C mensajes. El número te sostiene cuando el resto no aplaude. Muleta visible, ridículo. Se nota en cómo te leen, qué miseria.',
  'Actividad de %N: %C. Visible, insistente, discutible, fracasado. Se nota en cómo te leen, da grima.',
  '%C mensajes. %N, el ego lee el contador como premio. El chat lo lee como historial, qué miseria. Se nota en cómo te leen, qué nivel de pena.',
  '%N lleva %C. Saturación con nombre y sin freno. El freno también es valor, da grima. Se nota en cómo te leen, basura.',
  '%C en el marcador. %N, presencia no es perdón del resto ni certificado de valía, qué nivel de pena. Se nota en cómo te leen, qué cutre.',
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
