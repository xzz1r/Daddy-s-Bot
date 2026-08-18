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
PARASITO = PARASITO;
INTERMEDIO = INTERMEDIO;

module.exports = { cmdRelevance };
