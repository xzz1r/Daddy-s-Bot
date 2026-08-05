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
  '%N, %C mensajes. Llevas aquí de mirón, leyendo lo que otros se curran y sin soltar una puta palabra. Eso no es ser discreto, es ser un parásito con datos móviles.',
  '%C mensajes, %N. Entras, espías, te empalmas con el drama ajeno y te largas sin aportar una mierda. El gorrón oficial del grupo, y encima sin vergüenza.',
  '%N tiene %C mensajes. Un cero a la izquierda con número de teléfono. Ocupas plaza, comes ancho de banda y devuelves exactamente nada, puto lastre.',
  'Con %C mensajes, %N, eres el espía de mierda que lo lee todo y no da la cara nunca. Cobarde de manual: mucho ojo y cero cojones para escribir.',
  '%N, %C putos mensajes. El grupo se mueve sin ti y contigo exactamente igual. Eres el mueble que nadie recuerda haber comprado y que da pereza tirar.',
  '%C mensajes en todo este tiempo, %N. Chupas contenido ajeno como una garrapata y no sueltas ni una gota. Parásito social con certificado y sin cura.',
  '%N con %C mensajes. Vives del trabajo de los demás: memes, chismes y conversación que otros ponen. Tú solo miras, disfrutas y desapareces. Gorrón asqueroso.',
  'Solo %C mensajes, %N. Ni existes ni molestas: eres el vacío con perfil. Si desaparecieras mañana el grupo tardaría un mes en notar el hueco. Y no lo notaría.',
  '%N, %C mensajes. Fantasma de mierda con horario de espía. Entras cuando nadie mira, lees todo y te vas. Das más asco que pena, y eso ya es difícil.',
  'Con %C mensajes eres el miembro más inútil de la lista, %N. Un nombre de relleno para que el grupo parezca más grande. Bulto puro, sin una sola aportación.',
  '%N tiene %C mensajes y la desfachatez de seguir aquí. Consumir sin producir tiene nombre: parásito. Y tú lo llevas con una naturalidad que da rabia.',
  '%C mensajes, %N. Tu aportación al grupo cabe en el silencio entre dos mensajes de otros. Ruido cero, valor cero, presencia cero. El don nadie perfecto.',
  '%N, %C mensajes. El mirón del grupo, el que se entera de todo y no se moja en nada. Cobardía conversacional pura, y encima disfrazada de estar ocupado.',
  'Con solo %C mensajes, %N, eres el ejemplo vivo de que estar en la lista no es lo mismo que existir. Ocupas espacio como ocupa mugre un rincón olvidado.',
  '%N, %C mensajes de mierda. Llevas aquí el tiempo suficiente para haber dicho algo que valiera y elegiste no hacerlo. Puto inútil por decisión propia.',
  '%C mensajes, %N. Espía silencioso de nivel profesional. Sabes hasta lo que cenó cada uno y no has aportado ni un buenos días. Rata de alcantarilla con wifi.',
  '%N con %C mensajes. Eres esa notificación que se ignora, ese contacto que nadie busca, ese nombre que el grupo lee y se salta. Irrelevante hasta la médula.',
  'Solo %C mensajes y ahí sigues, %N. Ni la decencia de irte cuando está claro que sobras. Parásito con tozudez, la peor combinación de todas.',
  '%N, %C mensajes. Eres el que reacciona con un emoji una vez al mes y se cree participativo. Puto mendigo de relevancia sin una sola moneda que ofrecer.',
  'Con %C mensajes, %N, tu huella en el grupo es la de un pedo en el viento: alguien la notó un segundo, hizo mala cara y siguió sin volver a pensar en ti.',
  '%N tiene %C mensajes. El grupo tiene conversaciones enteras sin que aparezcas y ninguna se resiente. Eres prescindible en el sentido más literal, basura.',
  '%C mensajes, %N. El lurker de manual: mucho leer, mucho juzgar por dentro y cero valor para poner algo tuyo. Espía cobarde y encima mediocre.',
  '%N, %C mensajes. Vives aquí de gorra, como quien se cuela en una fiesta, se bebe todo y no saluda a nadie. Sinvergüenza de libro con pulso.',
  'Con %C mensajes eres estadísticamente irrelevante, %N. No es una opinión, es el puto número. Y el número dice que no aportas absolutamente nada.',
  '%N, %C mensajes. Un parásito no es el que no puede aportar, es el que no quiere. Y tú llevas tiempo demostrando exactamente cuál de los dos eres.',
  '%C mensajes, %N. Entras a leer el drama como quien entra a ver un accidente en la carretera: morbo puro, cero ayuda y de vuelta al coche. Buitre.',
  '%N con %C mensajes. El grupo te aguanta como se aguanta una mancha que no se va: nadie sabe de dónde salió, no sirve de nada y da pereza quitarla.',
  'Solo %C mensajes, %N. Tu teclado debe estar nuevo de fábrica. Lo único que ejercitas es el dedo de bajar para cotillear sin soltar prenda, puto mirón.',
  '%N, %C mensajes. Un miembro que no aporta es un asiento ocupado. Y tú llevas ese asiento calentito desde que llegaste sin justificarlo ni un día.',
  'Con %C mensajes, %N, ni siquiera llegas a ser el pesado del grupo. Al menos el pesado deja rastro. Tú no dejas ni eso. Nada absoluta con nombre.',
  '%N tiene %C mensajes y una cara de cemento impresionante. Consumes todo, devuelves nada y encima sigues aquí como si nadie llevara la cuenta. Se lleva.',
  '%C mensajes, %N. El grupo es tu Netflix: lo abres, ves lo que otros se curran y jamás dejas reseña. Consumidor crónico, productor cero, parásito puro.',
  '%N, %C mensajes. Espiar es lo único que se te da bien, y ni de eso puedes presumir porque hasta para eso hace falta que a alguien le importes. Y no.',
  'Con %C mensajes eres el fantasma más soso del grupo, %N. Ni asustas, ni molestas, ni aportas. Solo flotas ahí ocupando un sitio que le vendría bien a otro.',
  '%N, %C putos mensajes. Llevas tanto callado que el grupo ya no sabe si tienes voz o si entraste por error y te da vergüenza reconocerlo. Patético igual.',
  '%C mensajes, %N. Cada día que pasas aquí sin decir nada es otro día confirmando que no tienes nada dentro que merezca salir. Vacío con conexión a internet.',
  '%N con %C mensajes. Si el grupo cobrara por leer, tú serías el moroso más grande. Todo consumido, nada pagado. Gorrón con antecedentes, basura.',
  'Solo %C mensajes, %N. El tipo de miembro que hace que las listas parezcan llenas y los grupos parezcan muertos. Relleno humano sin una sola función.',
  '%N, %C mensajes. No eres tímido, eres inútil. La timidez se cura, lo tuyo no. Llevas aquí el tiempo suficiente para que ya no haya excusa posible.',
  'Con %C mensajes, %N, eres la prueba de que se puede estar en un grupo de conversación sin conversar nunca. Un logro de mierda, pero logro al fin.',
  '%N tiene %C mensajes. Ni una sola conversación de este grupo cambió porque tú estuvieras. Ese es tu legado completo: nada, en formato acumulativo.',
  '%C mensajes, %N. Mirón profesional con máster en no mojarse. Escuchas, juzgas, guardas y no sueltas. Rata silenciosa, que es la peor clase de rata.',
  '%N, %C mensajes. Tu presencia aquí tiene el mismo peso que una silla vacía, con el agravante de que la silla no gasta notificaciones ni finge pertenecer.',
  'Con %C mensajes eres el parásito más cómodo del grupo, %N. Todo el beneficio, cero el esfuerzo. Y encima con la conciencia tranquila, sinvergüenza.',
  '%N, %C mensajes. El grupo lleva tiempo funcionando sin ti aunque estés dentro. Eso ya no es ser discreto, es ser irrelevante con matrícula de honor.',
  '%C mensajes, %N. Entras a ver si hablan de ti y te vuelves a tu agujero. Vigilante nocturno del chat, turno permanente de mirar, callar y no servir.',
  '%N con %C mensajes. Eres el que llega tarde a todas las conversaciones, lee el resumen y opina cero. Consumidor pasivo, parásito activo. Puto lastre.',
  'Solo %C mensajes, %N. Con ese historial ni el bot sabe qué decir de ti, y el bot habla de cualquiera. Has conseguido ser aburrido hasta para una máquina.',
  '%N, %C mensajes. Ocupas plaza en un grupo que otros mantienen vivo. Eso es vivir del cuento en versión digital, y tú lo llevas haciendo desde el día uno.',
  'Con %C mensajes, %N, tu relevancia es tan baja que hay que medirla con lupa y aun así sale negativa. Un parásito con estadísticas propias, enhorabuena.',
  '%N, %C mensajes. Llevas más tiempo leyendo este grupo que hablando con tu propia familia, y en los dos sitios aportas exactamente lo mismo: nada.',
  '%C mensajes, %N. El clásico que dice que no escribe porque no tiene nada que añadir. Traducción: no tienes nada dentro. Y eso no se arregla callándose.',
  '%N con %C mensajes. Eres el gorrón que se sienta en la mesa, come de todo y desaparece cuando llega la cuenta. Mismo perfil, distinta pantalla, misma basura.',
  'Solo %C mensajes, %N. Cuando alguien pregunta quién eres, el grupo tarda en responder. No por misterio, por indiferencia. Nadie te tiene fichado, don nadie.',
  '%N, %C mensajes. Tu nivel de implicación es el de alguien que entró por un enlace, se quedó por pereza y nunca encontró motivo para aportar. Puto relleno.',
  'Con %C mensajes eres el vecino que nunca saluda, %N. Está, lo ves, sabes que existe, y aun así nadie sabría decir una sola cosa suya. Vacío con nombre.',
  '%N tiene %C mensajes. Espiar conversaciones ajenas es tu único hobby documentado. Un mirón sin talento, sin gracia y sin la decencia de disimularlo.',
  '%C mensajes, %N. El grupo produce, tú consumes. El grupo pone, tú coges. Eso tiene nombre desde hace siglos y ninguno de esos nombres te deja bien.',
  '%N, %C mensajes. Ni el algoritmo más generoso te sacaría del fondo de la lista. Tu relevancia es una constante matemática: cero, siempre, sin variación.',
  'Con %C mensajes, %N, das menos señales de vida que un contacto bloqueado. Al menos el bloqueado tiene una razón para no escribir. Tú solo eres inútil.',
  '%N con %C mensajes. Todo lo que has aportado a este grupo cabe en una captura de pantalla, y sobraría espacio para poner la fecha. Miseria documentada.',
  'Solo %C mensajes, %N. Llevas la vida entera de espectador y encima te crees parte del espectáculo. Eres público, y del que ni aplaude. Puto parásito.',
  '%N, %C mensajes. Cada vez que el grupo se anima tú desapareces, y cada vez que hay drama apareces a mirar. Buitre de conversaciones ajenas, nada más.',
  '%C mensajes, %N. El grupo no te expulsa por pereza, no por cariño. Ocupas el sitio que le vendría de lujo a cualquiera con dos dedos de conversación.',
  '%N, %C mensajes. Un fantasma al menos tiene historia detrás. Tú eres solo un nombre gris con foto que nadie ha mirado dos veces. Irrelevante hasta el hueso.',
  'Con %C mensajes eres el ejemplo perfecto del gorrón moderno, %N: todo el contenido gratis, cero la aportación, y encima con derecho a quejarse. Sinvergüenza.',
  '%N tiene %C mensajes y el grupo sigue sin saber ni qué voz tiene. Apareces cada muerte de obispo, sueltas una mierda y te vuelves a meter bajo tierra.',
  '%C mensajes, %N. Espectador mudo, opinador de sofá, cero implicación real. El perfil exacto del que critica por dentro y no aporta por fuera. Cobarde.',
  '%N con %C mensajes. Ni sumas, ni restas, ni molestas. Y eso, en un grupo, es la peor categoría posible: la de quien no hace falta para absolutamente nada.',
  'Solo %C mensajes, %N. Llevas aquí tanto tiempo callado que ya nadie espera respuesta tuya. Te han dado por perdido y no se han equivocado ni un poco.',
  '%N, %C mensajes. Tu forma de participar es leer, guardar el chisme y usarlo en privado. Rata silenciosa, mirón profesional y parásito a tiempo completo.',
  'Con %C mensajes, %N, no eres miembro del grupo, eres suscriptor. Consumes el contenido y jamás pagas la cuota. Moroso social con la cara muy dura.',
  '%N tiene %C mensajes. En cualquier grupo hay gente que aporta, gente que molesta y gente que sobra. Tú ni siquiera llegas a molestar. Adivina en cuál caes.',
  '%C mensajes, %N. Cuando el grupo se apaga nadie te busca, y cuando se enciende nadie te echa de menos. Eres irrelevante en los dos estados. Impresionante.',
  '%N, %C mensajes. El silencio puede ser elegancia o puede ser vacío. En tu caso el número deja bastante claro cuál de los dos es, puto inútil de manual.',
  'Con %C mensajes eres humo con perfil, %N. Se te ve un momento en la lista, no dejas nada y el grupo sigue como si nunca hubieras estado. Porque no estás.',
  '%N con %C mensajes. Eres el que lo lee todo a las tres de la mañana y no contesta a nadie nunca. Espía nocturno sin sueldo y sin utilidad conocida.',
  'Solo %C mensajes, %N. Ni el bot, que habla con cualquiera, tiene material tuyo. Has conseguido ser un desconocido en un sitio donde todos se conocen.',
  '%N, %C mensajes. Cada miembro deja algo en un grupo: risas, movidas, contenido. Tú dejas un hueco con tu nombre encima. Vacío puro y sin excusa posible.',
  '%C mensajes, %N. Llevas de mirón tanto tiempo que ya deberías cobrar por vigilancia. Aunque nadie te pagaría, porque ni para eso das el nivel, inútil.',
  '%N con %C mensajes. La definición exacta de parásito: se beneficia del organismo, no aporta nada y encima lo desgasta. Ahí estás, en el libro, con foto.',
  'Con %C mensajes, %N, el grupo entero te tiene en la categoría de "ese que nunca habla". Y esa categoría no es misteriosa, es despreciable. Aclarado.',
  '%N, %C mensajes. Ni cuando te mencionan directamente apareces. Eso ya no es discreción, es que te la suda todo y todos. Pues el sentimiento es mutuo.',
  '%C mensajes, %N. Un grupo lo sostienen los que hablan. Tú eres peso muerto colgando de los que sí lo hacen. Lastre con nombre, cara y cero utilidad.',
  '%N tiene %C mensajes y aun así entra a diario. Eso confirma lo peor: no es que no puedas escribir, es que no tienes una puta cosa que decir. Nunca.',
  'Con %C mensajes eres el equivalente digital de una planta de plástico, %N: estás, ocupas, no das nada y nadie notaría si te cambian por otra igual.',
  '%N, %C mensajes. El grupo te lee el nombre en la lista y pasa de largo, como se pasa por delante de un local cerrado. No hay nada dentro que ver.',
  '%C mensajes, %N. Todo lo que sabes del grupo lo sabes por espiar. Todo lo que el grupo sabe de ti cabe en nada. Intercambio desigual, parásito de manual.',
  '%N con %C mensajes. Ni te has ganado el respeto ni el desprecio. Solo la indiferencia, que es lo único que se da gratis y lo único que te has llevado.',
  'Solo %C mensajes, %N. Eres el que abre el chat, lee doscientos mensajes, no responde ninguno y lo cierra. Récord olímpico de inutilidad. Medalla asegurada.',
  '%N, %C mensajes. Un miembro de verdad se nota cuando falta. Tú faltas todos los días y nadie ha dicho nunca nada. Eso lo resume todo, puto fantasma.',
  'Con %C mensajes, %N, tu nombre en la lista es decoración. Como esos números de teléfono que nadie sabe de quién son y nadie se atreve a borrar. Inútil.',
  '%N tiene %C mensajes. Espías, callas, consumes y sigues. Ese ciclo lo lleva repitiendo desde que entró y no ha aportado ni una sola variación. Parásito.',
  '%C mensajes, %N. En un grupo de gente que habla, tú eres el mueble. Y el mueble al menos se apoya en él. Tú ni eso. Estorbo con perfil de WhatsApp.',
  '%N, %C mensajes. Llevas años de gorrón social y ni te lo planteas. Esa falta total de vergüenza es lo único destacable que has aportado. Y da asco.',
  'Con %C mensajes eres exactamente lo que un grupo no necesita, %N: bulto silencioso que consume, ocupa y no devuelve. Lo contrario de un miembro útil.',
  '%N con %C mensajes. El grupo tiene memoria de todo y de ti no recuerda nada, porque no diste material. Un espía sin cobertura y sin la menor gracia.',
  'Solo %C mensajes, %N. Si te fueras hoy, el único cambio sería un número menos en la lista. Ni un mensaje menos, ni una risa menos. Nada. Ese eres tú.',
  '%N, %C mensajes. La relevancia se gana hablando y tú llevas aquí sin decir una puta palabra que valga. Cero aportado, cero ganado, cero respetado.',
  '%C mensajes, %N. Eres el típico que presume de estar en veinte grupos y no aporta nada en ninguno. Parásito en serie, con la misma cara dura en todos.',
  '%N con %C mensajes. Cuando alguien dice tu nombre el grupo tiene que hacer memoria. Y cuando la hace, sigue sin encontrar nada. Vacío absoluto, mierda.',
  'Solo %C mensajes, %N. Tu contribución más grande a este grupo fue aceptar la invitación. Todo lo que vino después ha sido un descenso constante hacia nada.',
  '%N, %C mensajes. Existes en modo lectura, como los archivos que nadie puede editar porque a nadie le interesa lo que hay dentro. Inútil y protegido.',
  'Con %C mensajes, %N, no eres parte de la conversación, eres parte del decorado. Y el decorado no opina, no aporta y se cambia sin que nadie lo llore.',
  '%N tiene %C mensajes. Espía, calla, guarda y usa. Ese es tu ciclo completo. No hay una sola fase en la que devuelvas algo. Parásito puro y documentado.',
  '%C mensajes, %N. Un grupo sin ti sería idéntico. Un grupo sin los que hablan sería un cementerio. Ahí tienes tu valor exacto medido en comparación.',
  '%N, %C mensajes. Llevas de gorrón desde el primer día y encima con la tranquilidad del que cree que nadie lleva la cuenta. El bot lleva la cuenta, listo.',
  'Con %C mensajes eres el que menos aporta y el que más se entera, %N. Esa proporción tiene nombre y es el mismo desde siempre: parásito de mierda.',
  '%N con %C mensajes. Cada conversación importante de este grupo pasó sin ti. No porque no te dejaran, sino porque no te dio la gana. Puto inútil por gusto.',
  'Solo %C mensajes, %N. Ni una risa provocada, ni una movida generada, ni una idea puesta. Tu paso por aquí es un renglón en blanco con foto de perfil.',
  '%N, %C mensajes. El mirón no aporta pero al menos disfruta. Tú ni eso: lees por inercia, callas por vagancia y sigues por costumbre. Vacío total.',
  '%C mensajes, %N. Un miembro que no habla es un número. Y tú eres el número más bajo y menos interesante de toda la lista. Estadística de la nada.',
  '%N tiene %C mensajes. Vives de mirar lo que otros construyen sin poner ni un ladrillo. Turista permanente en un grupo que otros levantaron. Gorrón.',
  'Con %C mensajes, %N, tu perfil aquí es el de un cotilla sin gracia: se entera de todo, no comparte nada y encima cree que eso lo hace interesante. No.',
  '%N, %C mensajes. Eres el que aparece cuando hay bronca y desaparece cuando hay que aportar. Carroñero de conflictos ajenos y cero utilidad el resto.',
  '%C mensajes, %N. El grupo te aguanta igual que se aguanta el ruido del vecino: se asume, se ignora y se sigue. Molesto de fondo y sin ningún valor.',
  '%N con %C mensajes. Ni la gente nueva llega tan abajo. Tienes menos peso que alguien que entró ayer, y llevas aquí una eternidad. Impresionante inutilidad.',
  'Solo %C mensajes, %N. Todo lo que sabes de este grupo lo obtuviste espiando. Todo lo que este grupo sabe de ti es que no aportas. Balance de parásito.',
  '%N, %C mensajes. Un fantasma asusta. Un mirón inquieta. Tú no llegas ni a eso: eres un archivo abierto que nadie ha leído. Aburrido hasta para odiarte.',
  'Con %C mensajes eres el peso muerto de este grupo, %N. Los demás tiran del carro y tú vas sentado encima mirando el paisaje. Puto gorrón sin vergüenza.',
  '%N tiene %C mensajes. En la práctica eres un observador externo con acceso interno. Espía sin misión, parásito sin excusa, miembro sin una sola función.',
  '%C mensajes, %N. Cuando el grupo hace balance de quién lo sostiene, tu nombre no aparece por ningún lado. Ni arriba, ni abajo. Simplemente no cuentas.',
  '%N, %C mensajes. Llevas tanto sin hablar que si escribieras algo mañana el grupo pensaría que te hackearon. Así de muerto está tu perfil aquí, inútil.',
  'Con %C mensajes, %N, tu relevancia es la de un anuncio que todos saltan. Está ahí, ocupa su espacio y nadie recuerda ni de qué iba. Irrelevante puro.',
  '%N con %C mensajes. La gente aporta contenido, tú aportas presencia vacía. Y la presencia vacía es exactamente lo mismo que la ausencia, pero ocupando sitio.',
  'Solo %C mensajes, %N. Te has ganado a pulso el título de parásito oficial del grupo. No fue fácil, había competencia, y aun así arrasaste sin esfuerzo.',
  '%N, %C mensajes. Consumes conversación como consumes datos: sin pensar de dónde sale y sin agradecerlo nunca. Gorrón digital con la cara de cemento.',
  '%C mensajes, %N. Eres el que dice que sí lee todo cuando le preguntan, como si eso fuera un mérito. Leer no es aportar, listo. Es exactamente lo contrario.',
  '%N tiene %C mensajes. En un grupo que se mueve por lo que la gente escribe, tú eres estrictamente decorativo. Y ni siquiera decoras bien. Puto estorbo.',
  'Con %C mensajes eres el fantasma con menos personalidad de todos, %N. Ni gracioso, ni odioso, ni útil. Solo un contador parado con nombre encima.',
  '%N, %C mensajes. Espiar sin aportar es lo más cómodo del mundo y por eso lo eliges. La comodidad del que no vale nada y ha hecho las paces con ello.',
  '%C mensajes, %N. Si alguien tuviera que explicar qué es un parásito social usando un ejemplo del grupo, tu nombre saldría antes de terminar la frase.',
  '%N con %C mensajes. Llevas más tiempo en silencio del que la mayoría lleva en el grupo. Y ese silencio no dice nada profundo. Dice que estás vacío.',
  'Solo %C mensajes, %N. El grupo no te odia, que sería algo. El grupo simplemente no te tiene en cuenta. Y eso es infinitamente peor, puto irrelevante.',
  '%N, %C mensajes. Tienes el historial de alguien que entró, miró y decidió que no valía la pena participar. El grupo decidió lo mismo sobre ti. Justo.',
  'Con %C mensajes, %N, eres el ejemplo de que se puede pertenecer a algo sin formar parte de nada. Un carnet sin uso. Un nombre sin contenido. Basura.',
  '%N tiene %C mensajes. Cada mensaje tuyo está tan espaciado en el tiempo que el grupo tiene que hacer arqueología para encontrar el anterior. Fantasma.',
  '%C mensajes, %N. La única constante de tu paso por aquí es no haber aportado nada nunca. Al menos eres coherente. Coherentemente inútil, pero coherente.',
  '%N, %C mensajes. Espía de sofá, gorrón de contenido, parásito de conversación. Tres títulos, todos tuyos, ninguno que puedas presumir en ningún sitio.',
  'Con %C mensajes eres invisible por inútil, no por discreto, %N. La discreción se elige y aporta. Lo tuyo se sufre y no aporta nada. Puta diferencia.',
  '%N con %C mensajes. En este grupo hay gente que escribe más en un día que tú en toda tu existencia aquí. Y no son especiales. Es que tú no vales nada.',
  'Solo %C mensajes, %N. Tu nombre en el ranking está tan abajo que hay que hacer scroll para encontrar la miseria que has aportado. Vergüenza documentada.',
  '%N, %C mensajes. El grupo se construyó sin ti aunque estuvieras dentro. Ese es el resumen más honesto de tu paso por aquí. Presente y completamente inútil.',
  '%C mensajes, %N. Ser un parásito requiere cero esfuerzo y por eso te sale tan natural. Es lo único en lo que destacas y encima no tiene ningún mérito.',
  '%N tiene %C mensajes y sigue entrando a diario. Sabes perfectamente lo que pasa aquí y aun así no aportas. Eso no es timidez, es ser un puto egoísta.',
  'Con %C mensajes, %N, no le has dado al grupo ni un motivo para recordarte. Y el grupo, agradecido, tampoco te ha dado ninguno para creerte importante.',
  '%N con %C mensajes. La relevancia no se hereda ni se regala, se escribe. Y tú llevas la hoja en blanco desde el primer día. Cero méritos, cero respeto.',
  'Solo %C mensajes, %N. Eres el miembro que confirma que un grupo puede tener gente dentro y estar medio vacío igual. Puro relleno sin ninguna función.',
  '%N, %C mensajes. Llevas la existencia de un archivo adjunto que nadie abrió: está ahí, pesa, y a nadie le ha interesado nunca lo que contiene. Inútil.',
  '%C mensajes, %N. El grupo cambia, evoluciona y se mueve. Tú sigues exactamente igual: mirando desde la esquina sin aportar. Estático y prescindible.',
  '%N con %C mensajes. Ser un espía tendría sentido si informaras a alguien. Tú solo acumulas chisme ajeno para nada. Mirón sin propósito ni utilidad.',
  'Solo %C mensajes, %N. Hasta los bots que entran por error escriben más que tú antes de que los echen. Perder contra un bot ya es un nivel de mierda.',
  '%N, %C mensajes. En cualquier grupo hay tres tipos: los que crean, los que siguen y los que sobran. Tú llevas años instalado cómodamente en el tercero.',
  'Con %C mensajes, %N, tu única habilidad demostrada es la de ocupar espacio sin justificarlo. En eso eres un profesional. En todo lo demás, una mierda.',
  '%N tiene %C mensajes. Ni siquiera te da para ser el silencioso interesante. Eres el silencioso vacío, que es la versión aburrida y sin ningún atractivo.',
  '%C mensajes, %N. Cuando el grupo hace una lista de quién aporta, la tuya sería una hoja en blanco con tu foto arriba. Documento oficial de la nada.',
  '%N, %C mensajes. Vives del contenido ajeno con la naturalidad del que nunca se ha planteado devolver nada. Egoísmo puro disfrazado de ser reservado.',
  'Con %C mensajes eres el que menos pinta aquí, %N. Y lo peor no es eso: lo peor es que llevas tanto tiempo que ya nadie espera que eso vaya a cambiar.',
  '%N con %C mensajes. La gente entra, aporta y se hace un sitio. Tú entraste, miraste y te quedaste de gorra. El parásito con más antigüedad del grupo.',
  'Solo %C mensajes, %N. Podrías desaparecer ahora mismo y el único rastro sería un contador congelado en una cifra ridícula. Ese es todo tu legado aquí.',
  '%N, %C mensajes. El grupo funciona a base de gente que escribe. Tú eres el que se conecta al wifi y no paga la factura. Gorrón con acceso completo.',
  '%C mensajes, %N. Tienes el perfil del que se entera de todo, opina de nada y luego critica en privado. Cobarde, parásito y mediocre en un solo pack.',
  '%N tiene %C mensajes. Ni aportas contenido, ni das conversación, ni generas nada. Eres un espectador con permiso de entrada. Y ni eso te has ganado.',
  'Con %C mensajes, %N, el grupo entero podría describirte en una palabra y la palabra sería "quién". Eso resume tu relevancia mejor que cualquier número.',
  '%N, %C mensajes. Un miembro activo construye grupo. Un miembro pasivo lo aguanta. Tú ni aguantas: lo consumes y sigues. Parásito de libro, sin matices.',
  '%C mensajes, %N. Llevas de mirón profesional tanto tiempo que ya es tu identidad completa. No eres una persona en el grupo, eres una cámara de vigilancia.',
  '%N con %C mensajes. Se puede ser silencioso y aportar cuando toca. Tú no aportas ni cuando toca ni cuando no toca. Silencio sin contenido, o sea, nada.',
  'Solo %C mensajes, %N. Eres el que hace que las estadísticas de participación den pena. Un lastre en cifras, un lastre en presencia, un lastre y punto.',
  '%N, %C mensajes. El grupo no necesita más gente, necesita más gente que hable. Tú eres exactamente lo primero sin nada de lo segundo. Puro estorbo.',
  'Con %C mensajes eres irrelevante hasta para el bot, %N. Y el bot le encuentra algo que decir a cualquiera. Tú has roto ese récord por lo bajo, mierda.',
  '%N tiene %C mensajes. Si la relevancia se midiera en aportaciones, estarías en números rojos. Consumes más de lo que das y das exactamente nada.',
  '%C mensajes, %N. Espiar sin escribir es la forma más cobarde de estar en un grupo. Todo el beneficio, cero la exposición. Cobarde y aprovechado.',
  '%N, %C mensajes. Cada día que entras y no escribes es otro día confirmando que estás aquí solo por lo que te llevas. Gorrón consciente y sin remedio.',
  'Con %C mensajes, %N, no has generado una sola conversación, no has cerrado una sola broma, no has aportado un solo dato. Cero absoluto con antigüedad.',
  '%N con %C mensajes. La gente que aporta se gana su sitio. Tú tienes sitio porque nadie se ha molestado en quitártelo. No confundas una cosa con la otra.',
  'Solo %C mensajes, %N. Tu presencia en el grupo tiene el mismo impacto que un contacto guardado y nunca usado. Está en la agenda y no sirve para nada.',
  '%N, %C mensajes. Eres el parásito que ni siquiera molesta, y eso es lo más triste: ni para incomodar das el nivel. Puro relleno silencioso e inútil.',
  '%C mensajes, %N. Todo el mundo aquí sabe quién mueve el grupo. Y todo el mundo aquí sabe que tú no eres uno de esos. Consenso absoluto sin discusión.',
  '%N tiene %C mensajes. Un número que grita que estás aquí por conveniencia y no por aportar. El perfil del aprovechado con acceso permanente. Basura.',
  'Con %C mensajes eres el fondo de la tabla, %N. Y no por poco: por goleada. Hay gente que entró hace días y ya tiene más peso que tú. Puta vergüenza.',
  '%N, %C mensajes. Espectador crónico, participante nunca. Llevas tanto en ese papel que ya sería raro verte en otro. Y a nadie le apetece verlo, tranquilo.',
  '%C mensajes, %N. La única huella que has dejado aquí es la de haber estado sin hacer nada. Y esa huella se borra sola en cuanto sales de la lista.',
  '%N con %C mensajes. Ni siquiera eres el fantasma gracioso del grupo. Eres el fantasma soso, el que ni de anécdota vale. Irrelevante en todos los sentidos.',
  'Solo %C mensajes, %N. Si tuvieras que justificar tu sitio aquí con hechos, te quedarías mudo. Lo cual, mirándolo bien, sería tu estado habitual. Inútil.',
  '%N, %C mensajes. La gente construye reputación aportando. Tú has construido la tuya no aportando, y ha salido exactamente la reputación que mereces: ninguna.',
  'Con %C mensajes, %N, el grupo te percibe como percibe el fondo de pantalla: está, no cambia y nadie le presta atención. Ni una vez. Nunca. Puto relleno.',
  '%N tiene %C mensajes. Vives de gorra en un grupo que otros mantienen vivo con su tiempo. Eso no es ser tranquilo, es ser un aprovechado de manual.',
  '%C mensajes, %N. Ni una polémica, ni una gracia, ni un aporte. Has conseguido pasar por aquí sin dejar absolutamente nada. Un récord de mediocridad.',
  '%N, %C mensajes. El grupo respira, se mueve y produce. Tú miras. Esa es toda la relación que tienes con este sitio: la de un espectador que no paga.',
  'Con %C mensajes eres exactamente el tipo de miembro que hace que los grupos se mueran, %N. No por hacer daño, sino por no hacer absolutamente nada.',
  '%N con %C mensajes. La cifra habla sola y lo que dice no admite matices: aquí no cuentas, no has contado nunca y no vas a contar. Parásito confirmado.',
  'Solo %C mensajes, %N. Espías, guardas, callas y consumes. Cuatro verbos y ninguno beneficia al grupo. Ese es tu perfil completo. Puta sanguijuela.',
  '%N, %C mensajes. Ni sumas al grupo ni te sumas al grupo. Estás de paso desde hace demasiado tiempo y no piensas bajarte. Turista eterno y sin gracia.',
  '%C mensajes, %N. Lo único que has demostrado en todo este tiempo es que se puede estar sin aportar. Enhorabuena por el descubrimiento, puto inútil.',
  '%N tiene %C mensajes. Al grupo le da igual que estés y le daría igual que te fueras. Esa indiferencia total te la has ganado tú solo, mensaje a mensaje.',
  'Con %C mensajes, %N, el bot ha tenido que rebuscar para encontrar algo que decir de ti. Y lo único que encontró fue el vacío. Aquí lo tienes, documentado.',
  '%N, %C mensajes. Un parásito en un grupo es el que se lleva todo el valor y no devuelve ninguno. Ahí tienes tu retrato exacto, sin adornos y sin excusa.',
  '%C mensajes, %N. Llevas aquí de okupa: entraste, te instalaste y no has pagado un alquiler en tu vida. El grupo es el piso y tú el que no aporta nada.',
  '%N con %C mensajes. Cuando el grupo necesita gente, aparecen los de siempre. Tú nunca estás en esa lista y nunca lo has estado. Puto inútil de guardia.',
  'Solo %C mensajes, %N. Eres el ejemplo que se pone cuando alguien pregunta qué es no aportar nada. Sales tú, con nombre, foto y cifra. Caso cerrado.',
];

// ═══════════════════════════════════════════════════════════════════════════
// TRAMO MEDIO — está, pero no pesa. Ni fantasma ni referente.
// ═══════════════════════════════════════════════════════════════════════════

let INTERMEDIO = [
  '%N, %C mensajes. Estás, se te ve, pero nadie diría que este grupo es tuyo. Ni fantasma ni referente: el punto medio donde no se gana nada, tampoco se pierde.',
  '%C mensajes, %N. Ya no eres relleno pero todavía no pesas. Estás en esa franja donde la gente sabe quién eres y no espera nada concreto de ti.',
  '%N con %C mensajes. Apareces, aportas lo justo y te vuelves a diluir. No molestas, no sobras, tampoco haces falta. Territorio tibio, y el tibio no se recuerda.',
  'Con %C mensajes, %N, estás en la zona segura: suficiente para que te ubiquen, insuficiente para que te echen de menos. Ni carne ni pescado, y así llevas tiempo.',
  '%N, %C mensajes. Has salido del fondo, que ya es algo, pero de ahí a contar de verdad hay un buen trecho y no se ve que lo estés recorriendo con prisa.',
  '%C mensajes, %N. Participas cuando te apetece y desapareces cuando no. Eso no es implicación, es visita frecuente. Cómodo para ti, irrelevante para el grupo.',
  '%N tiene %C mensajes. Estás en la mitad de la tabla, que es el sitio donde nadie mira. Ni el podio ni la vergüenza. Solo el montón, y el montón no se cita.',
  'Con %C mensajes eres presencia real pero no peso real, %N. La diferencia entre las dos cosas es exactamente la que separa a quien manda de quien pasa.',
  '%N, %C mensajes. Nivel correcto sin más. Cumples, apareces, aportas de vez en cuando. Nadie te lo va a agradecer y nadie te lo va a reprochar. Tibio puro.',
  '%C mensajes, %N. Eres de los que están cuando ya hay conversación, pero nunca de los que la empiezan. Sumarse es fácil. Arrancar es lo que cuenta.',
  '%N con %C mensajes. Ni te falta presencia ni te sobra. El problema del punto medio es que no se defiende solo: o subes o acabas cayendo. Y tú no estás subiendo.',
  'Con %C mensajes, %N, tienes lo justo para que el grupo te ubique y nada para que el grupo te necesite. Esa distancia la decides tú cada día que no escribes.',
  '%N, %C mensajes. Estás dentro de la conversación pero nunca en el centro. Te mueves por los bordes, cómodo, sin arriesgar. Y en los bordes no se construye nada.',
  '%C mensajes, %N. Buen número para no ser un fantasma. Mal número para que alguien te ponga en la lista de quienes sostienen esto. Tú eliges hacia dónde tiras.',
  '%N tiene %C mensajes. Aportas a ratos y desapareces a ratos. Esa intermitencia es justo lo que impide que el grupo te tenga como alguien con quien contar.',
  'Con %C mensajes, %N, estás a medio camino de todo: de importar y de no importar. Y quedarse a medio camino, a la larga, se parece bastante a no llegar.',
  '%N, %C mensajes. Ni destacas ni molestas. Es la posición más cómoda del grupo y también la más olvidable. Cómodo hoy, invisible mañana. Tú verás.',
  '%C mensajes, %N. Tienes rodaje suficiente para haber marcado algo y no lo has marcado. No por falta de tiempo, por falta de ganas. Ahí está el margen real.',
  '%N con %C mensajes. Eres de los que están, y estar ya es más de lo que hacen muchos. Pero estar sin pesar sigue siendo la mitad del trabajo, ni una más.',
  'Con %C mensajes eres un miembro normal y corriente, %N. Ni referente ni lastre. Y en un grupo, lo normal y corriente es exactamente lo que no se recuerda.',
  '%N, %C mensajes. Se te ve el interés a temporadas. Cuando aparece, funciona. Cuando se va, no queda nada. Constancia es lo que te falta para pesar de verdad.',
  '%C mensajes, %N. Estás en la franja del que aporta cuando ya no hace falta y calla cuando sí. El timing te delata: participas cómodo, nunca comprometido.',
  '%N tiene %C mensajes. Ha superado la fase de mirón y no ha entrado en la de referente. El limbo del que ya podría contar y todavía no ha decidido hacerlo.',
  'Con %C mensajes, %N, el grupo sabe quién eres pero no qué eres. Tienes presencia sin identidad, que es la forma más silenciosa de no llegar a ningún lado.',
  '%N, %C mensajes. Sostienes tu parte y ni una más. Correcto, prudente y absolutamente olvidable. La medianía tiene la ventaja de no exponer y ese es su precio.',
  '%C mensajes, %N. Estás por encima de los que sobran y por debajo de los que mandan. Un sitio digno, sin gloria, donde se puede quedar uno años sin notarlo.',
  '%N con %C mensajes. La gente te lee y sigue. No te salta, tampoco se detiene. Ese punto medio en la atención ajena es exactamente lo que reflejan tus números.',
  'Con %C mensajes, %N, has hecho lo suficiente para no avergonzarte y lo justo para no presumir. Un empate contigo mismo que llevas manteniendo demasiado tiempo.',
  '%N, %C mensajes. Ni el grupo te empuja ni tú empujas al grupo. Convivencia tranquila y estéril. Funciona, pero nadie escribe historias sobre lo que funciona sin más.',
  '%C mensajes, %N. Tienes el perfil del que podría ser importante aquí y ha decidido que con estar le vale. Decisión legítima, resultado igual de anodino.',
  '%N tiene %C mensajes. En la foto del grupo sales, pero en segunda fila y sin mirar a cámara. Presente en el registro, ausente en la memoria de cualquiera.',
  'Con %C mensajes eres de los que hacen bulto con criterio, %N. Mejor que hacer bulto y punto, peor que hacer grupo. Justo en medio, como llevas tiempo.',
  '%N, %C mensajes. Cuando hablas se te escucha, el problema es la frecuencia. Con ese ritmo el grupo no llega a tomarte como parte fija de nada. Tú decides.',
  '%C mensajes, %N. No hay nada que reprocharte y tampoco nada que destacar. Un expediente limpio y vacío. Correcto en todo, memorable en absolutamente nada.',
  '%N con %C mensajes. Estás en el punto donde subir cuesta poco y bajar cuesta menos. La inercia empuja hacia abajo, así que quedarse quieto no es neutral.',
  'Con %C mensajes, %N, el grupo cuenta contigo para llenar y no para sostener. Y esa diferencia, aunque no lo parezca, es toda la diferencia que existe.',
  '%N, %C mensajes. Ni de los que arrancan ni de los que cierran. De los que se suman a lo que ya está en marcha. Cómodo, seguro y sin ningún mérito propio.',
  '%C mensajes, %N. Tu participación es la de quien pasa a saludar y se queda un rato. Agradable, prescindible y sin ninguna consecuencia para nadie.',
  '%N tiene %C mensajes. Suficiente para que nadie te llame fantasma. Insuficiente para que alguien te llame imprescindible. Entre esas dos palabras vives.',
  'Con %C mensajes, %N, eres exactamente la media del grupo. Y ser la media significa que la mitad está por encima. Piénsalo antes de conformarte otra vez.',
  '%N, %C mensajes. Has construido presencia sin construir peso. Es lo más fácil de lograr y lo menos útil de tener. Ahí sigues, con lo fácil bien hecho.',
  '%C mensajes, %N. El grupo no funcionaría peor sin ti, pero tampoco igual. Ese matiz mínimo es todo lo que has conseguido acumular en todo este tiempo.',
  '%N con %C mensajes. Estás en el tramo donde uno decide si va a ser alguien aquí o va a seguir de paso. Llevas demasiado tiempo sin decidirlo, y eso ya decide.',
  'Con %C mensajes, %N, tu papel es el de secundario fijo. Sales, tienes frases, nadie compraría la película por ti. Correcto en su sitio, y su sitio es ese.',
  '%N, %C mensajes. Participación de las que no dan problemas ni alegrías. El grupo la agradece y la olvida el mismo día. Neutralidad perfecta, valor discreto.',
  '%C mensajes, %N. Has salido del pozo pero te has quedado a mirar desde el borde. Ni abajo ni arriba. Y desde el borde no se mueve nada, solo se observa.',
  '%N tiene %C mensajes. Los suficientes para tener voz, los justos para que esa voz no marque nada. Tener voz y no usarla es casi peor que no tenerla.',
  'Con %C mensajes eres el término medio hecho persona, %N. Nadie te va a atacar por eso y nadie te va a defender tampoco. Nadie hace ninguna de las dos por la media.',
  '%N, %C mensajes. Cumples con el mínimo social y ahí te quedas. Es una forma perfectamente válida de estar en un grupo, y también la más olvidable de todas.',
  '%C mensajes, %N. Estás en la mitad de la tabla desde hace tiempo y ahí sigues, cómodo. El problema es que la mitad de la tabla no la mira nadie. Nunca.',
];

// ═══════════════════════════════════════════════════════════════════════════
// TRAMO ALTO — sostiene el grupo de verdad.
// ═══════════════════════════════════════════════════════════════════════════

const RELEVANTE = [
  '%N, %C mensajes. Este grupo se mueve porque hay gente como tú escribiendo. Quítate de la ecuación y esto baja de nivel al día siguiente. Peso real, sin discusión.',
  '%C mensajes, %N. No eres un miembro del grupo, eres parte de su estructura. Cuando no apareces se nota, y notarse por ausencia es lo que separa a los que cuentan.',
  '%N con %C mensajes. La conversación existe porque tú y unos pocos la sostenéis. El resto se sube al carro que empujáis vosotros. Eso es relevancia de la buena.',
  'Con %C mensajes, %N, estás en la parte alta de la tabla y te la has ganado a pulso, mensaje a mensaje. Ni suerte ni cargo: trabajo diario y constante.',
  '%N, %C mensajes. Eres de los que hacen que este sitio valga la pena abrirlo. El grupo tiene ritmo porque tú lo marcas. Eso no se compra ni se hereda.',
  '%C mensajes, %N. Cuando desapareces un par de días, alguien pregunta. Ese detalle vale más que cualquier número: significa que tu presencia hace falta de verdad.',
  '%N tiene %C mensajes. Peso pesado del grupo. No por ruido, sino por constancia. Estás cuando hay que estar y eso te ha construido un sitio que nadie discute.',
  'Con %C mensajes eres de los que sostienen esto, %N. Los grupos no viven de los que miran, viven de los que escriben. Y tú llevas tiempo en el lado correcto.',
  '%N, %C mensajes. Has construido tu sitio aquí hablando, no pidiendo. Por eso nadie te lo cuestiona. La relevancia ganada así es la única que aguanta.',
  '%C mensajes, %N. Tu nombre aparece en las conversaciones que importan. No por casualidad: llevas tiempo estando donde hay que estar y aportando lo que hay que aportar.',
  '%N con %C mensajes. Referente del grupo con todas las letras. Cuando hablas se para el scroll, y eso solo lo consigue quien se lo ha currado durante mucho tiempo.',
  'Con %C mensajes, %N, eres de los pocos cuya ausencia se nota en el ambiente. Ese es el mejor indicador de que alguien pesa: que su silencio cambie algo.',
  '%N, %C mensajes. El grupo funciona porque hay un núcleo que lo mueve y tú estás dentro de ese núcleo. Sin cargo, sin galones, solo por presencia real y constante.',
  '%C mensajes, %N. La cifra es alta pero lo que importa es lo que hay detrás: constancia. Estar todos los días es mucho más difícil que aparecer un día brillante.',
  '%N tiene %C mensajes. De los que llevan el grupo sobre los hombros sin hacer ruido con ello. El trabajo silencioso de los que están siempre. Eso vale oro aquí.',
  'Con %C mensajes eres parte del motor, %N. Otros ponen el asiento y tú pones la gasolina. La diferencia se nota en cada conversación que arranca gracias a ti.',
  '%N, %C mensajes. Nadie te ha regalado ese sitio. Lo has ocupado escribiendo, apareciendo y sosteniendo cuando otros se caían. Respeto ganado en el campo.',
  '%C mensajes, %N. Estás en la parte alta y desde ahí se ve todo el trabajo que has puesto. Los números no mienten y estos hablan de alguien que sí se implica.',
  '%N con %C mensajes. Eres de los que hacen grupo, no de los que ocupan grupo. Esa distinción es la más importante que existe aquí y tú estás del lado bueno.',
  'Con %C mensajes, %N, el grupo cuenta contigo por defecto. No hay que pedírtelo, no hay que recordártelo. Estar es lo tuyo y por eso se te tiene en cuenta.',
  '%N, %C mensajes. Cuando alguien nuevo entra, en dos días ya sabe quién eres. No por cargo, por presencia. Eso es autoridad real y no la da ningún título.',
  '%C mensajes, %N. Tu constancia es la razón por la que este grupo no se ha muerto en las épocas flojas. Los que aguantan el bajón son los que valen de verdad.',
  '%N tiene %C mensajes. Está en el grupo pequeño de los que realmente lo sostienen. Ese grupo no tiene lista oficial, pero todos saben perfectamente quién está dentro.',
  'Con %C mensajes eres de los imprescindibles, %N. No porque nadie pueda sustituirte, sino porque nadie lo ha hecho en todo el tiempo que llevas sosteniendo esto.',
  '%N, %C mensajes. La gente sigue las conversaciones que tú abres. Ese arrastre no se finge ni se compra: se construye estando, y tú llevas construyendo mucho.',
  '%C mensajes, %N. Cifra de los que viven el grupo, no de los que lo visitan. La diferencia entre esas dos formas de estar aquí es exactamente todo lo que importa.',
  '%N con %C mensajes. Uno de los que marcan el ritmo. Cuando tú aprietas el grupo se anima, y cuando descansas esto baja el pulso. Influencia medible y real.',
  'Con %C mensajes, %N, has pasado de miembro a referencia. Ese salto lo dan pocos y casi nadie lo mantiene tanto tiempo como tú. Mérito propio, sin atajos.',
  '%N, %C mensajes. El grupo tiene memoria de lo tuyo: frases, movidas, momentos. Dejar huella es lo único que separa a los que estuvieron de los que solo pasaron.',
  '%C mensajes, %N. Alto y sostenido. No es un pico de un mes, es una línea constante en el tiempo. Eso es lo que hace que tu sitio aquí sea absolutamente sólido.',
  '%N tiene %C mensajes. Peso de los que no necesitan cargo para mandar. La gente te lee y responde porque llevas tiempo demostrando que vale la pena hacerlo.',
  'Con %C mensajes eres de los que hacen que este grupo tenga vida propia, %N. Sin gente así esto sería una lista de contactos con notificaciones. Y no lo es.',
  '%N, %C mensajes. Has aportado más que la inmensa mayoría y sin pedir nada a cambio. Ese es el perfil que cualquier grupo querría clonar. Referente real.',
  '%C mensajes, %N. Cuando el grupo se apaga, tú lo enciendes. Esa función no está escrita en ningún sitio y la cumples igual. Por eso se te tiene donde se te tiene.',
  '%N con %C mensajes. En la cima de la tabla y con motivo. No es actividad vacía: es presencia con contenido, sostenida durante mucho tiempo. Eso no se improvisa.',
  'Con %C mensajes, %N, tienes el respeto del grupo aunque nunca lo hayas pedido. Y ese es justo el respeto que vale: el que se da solo, sin que haya que reclamarlo.',
  '%N, %C mensajes. De los que están cuando hay follón y cuando no hay nada. Esa fiabilidad es más valiosa que cualquier pico de actividad puntual. Peso real.',
  '%C mensajes, %N. Los grupos los sostienen cuatro o cinco personas y el resto va detrás. Tú eres de los cuatro o cinco, y los números lo dejan absolutamente claro.',
  '%N tiene %C mensajes. Referente por presencia, no por cargo. Y esa es la única forma de liderazgo que nadie puede quitarte, porque no te la dio nadie: la construiste.',
  'Con %C mensajes eres columna del grupo, %N. Si te cayeras, esto se notaría de inmediato. Poca gente puede decir eso y tú lo tienes documentado en cifras.',
  '%N, %C mensajes. La constancia es lo más difícil de mantener y lo has mantenido. Los brillantes de un día se olvidan; los constantes se convierten en referencia.',
  '%C mensajes, %N. Tu actividad marca el estándar del grupo. Los demás se miden contigo aunque no lo digan. Ese es el efecto de estar arriba de verdad y con razón.',
  '%N con %C mensajes. No eres alguien que está en el grupo, eres alguien que hace el grupo. La diferencia entre esas dos frases la marcan justo esos números.',
  'Con %C mensajes, %N, has ganado tu sitio de la única forma legítima que existe aquí: apareciendo y aportando todos los días. Nadie puede discutirte eso.',
  '%N, %C mensajes. De los que se quedan cuando la cosa está floja y no solo cuando hay movida. Esa lealtad al grupo es lo que te ha puesto donde estás.',
  '%C mensajes, %N. La parte alta de la tabla no se ocupa por suerte. Se ocupa por estar. Y tú llevas estando tanto tiempo que ya nadie recuerda el grupo sin ti.',
  '%N tiene %C mensajes. Peso, presencia y constancia. Los tres a la vez, que es lo raro. Muchos tienen uno, algunos dos, y muy pocos los tres como los tienes tú.',
  'Con %C mensajes eres uno de los que le dan sentido a esto, %N. Sin ese grupo reducido de gente que escribe, el resto no tendría dónde asomarse. Ahí está tu valor.',
  '%N, %C mensajes. Has construido reputación en el sitio más difícil: entre gente que te lee todos los días. Engañar ahí es imposible, así que lo tuyo es real.',
  '%C mensajes, %N. Estar arriba de esta tabla significa haber aportado más que casi todos durante más tiempo que casi todos. Eso ya no es actividad, es compromiso.',
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
