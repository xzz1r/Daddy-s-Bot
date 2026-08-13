const { shuffle, pickFresh } = require('../utils/helpers');
const { getSender, isMainOwner, isBotJid, bareJid, sameUser } = require('../utils/wa');

const VERDICTS = {
  perfect: [
    'Cien por cien, joder. Estos dos se merecen mutuamente y eso es lo más bonito y lo más aterrador que se puede decir de alguien.',
    'Match perfecto. Nadie más los aguantaría, así que menos mal que se tienen el uno al otro, los muy cabrones.',
    'Compatibilidad total. Dos putos desastres que encajan como una llave en una cerradura oxidada: chirría, pero abre.',
    'Hostia puta, cien. Estos dos van a hacerse muchísimo daño y les va a encantar cada minuto.',
    'Pleno. Si no acaban juntos es porque el universo tiene sentido del humor y quiere verlos sufrir por separado, los gilipollas.',
    'Match absoluto. Se van a arruinar la vida el uno al otro y va a ser un espectáculo de cojones.',
    'Cien. Ninguno de los dos va a encontrar nada mejor, y en el fondo lo saben, los muy hijos de puta.',
    'Compatibilidad perfecta. Dos taras que se cancelan entre sí. La ciencia no lo explica, la mierda esta sí.',
    'Joder, cien por cien. Esto no es química, esto es que nadie más quiere a ninguno de los dos y han acabado juntos por descarte.',
    'Match total. Se merecen tanto que casi parece una condena en vez de un premio. La cárcel con wifi más bonita del grupo.',
    'Pleno absoluto. Que se junten ya de una puta vez y nos dejen en paz al resto.',
    'Cien. Dos personas hechas la una para la otra, principalmente porque el resto del grupo ya les dijo que no, coño.',
    'Match perfecto, joder. Van a discutir todos los días y ninguno se va a ir nunca. Amor del tipo tóxico que dura para siempre.',
    'Hostia, cien por cien. El grupo entero lo veía venir menos ellos dos, que son gilipollas.',
    'Cien. Si esto no acaba en boda acaba en orden de alejamiento, pero acaba en algo gordo.',
    'Pleno de los gordos. Nadie ha dado nunca este número aquí. Tomad nota y haceos puto cargo.',
    'Match del cien, cabrón. Dos piezas rotas que encajan justo por donde están rotas. Poético y patético a partes iguales.',
    'Compatibilidad total. Se van a querer mal, que es como se quiere de verdad en este grupo de mierda.',
    'Cien. El destino no ha tenido nada que ver: simplemente nadie más quiso a ninguno de los dos, joder.',
    'Match perfecto. Van a ser felices y va a ser insufrible de ver desde fuera, los muy cabrones.',
    'Pleno, hostia puta. Lo único que separa a estos dos es la vergüenza, y eso se pasa con dos copas y una mala decisión.',
    'Cien por cien. Se lo merecen todo: lo bueno, lo malo y las broncas de madrugada a grito pelado.',
    'Match total. Dos personas con el mismo nivel exacto de desastre. Eso es más raro que encontrar un billete en la mierda.',
    'Cien, joder. Si un día lo dejan, el grupo va a tener que elegir bando y nadie tiene cojones para eso.',
    'Compatibilidad perfecta. Ninguno de los dos tiene nada mejor que hacer, y eso también es compatibilidad, coño.',
    'Match del cien por cien. Que alguien les diga que se dejen de putas tonterías de una vez.',
    'Pleno. Están hechos el uno para el otro con la precisión de dos errores que se corrigen solos, los cabrones.',
    'Cien. Este número no lo da el bot por casualidad, lo da porque no hay alternativa para ninguno de estos gilipollas.',
    'Match perfecto. Dos que se entienden sin hablar, principalmente porque ninguno escucha nunca, joder.',
    'Compatibilidad absoluta, hostia. Se van a arruinar mutuamente y va a ser un espectáculo precioso de mierda.',
    'Cien por cien. El grupo os hace de testigo, así que ya no hay marcha atrás posible, cabrones.',
    'Pleno. Juntos suman una persona funcional. Por separado no llegan ni a media, los muy putos inútiles.',
    'Match total. Nadie discute esto. Ni ellos, y eso que discuten absolutamente todo como los gilipollas que son.',
    'Cien, joder. Dos desgracias con patas que decidieron caminar en la misma dirección. Enhoramala.',
    'Compatibilidad perfecta. Da igual lo que digan: el marcador ha hablado y el marcador no negocia, coño.',
    'Match del cien. Los que se odian así de bien acaban siempre en la misma cama. Todos lo hemos visto.',
    'Pleno absoluto. Si esto sale mal, sale mal a lo grande. Y si sale bien, también. Esa es la puta gracia.',
    'Cien por cien. Es su última oportunidad y es mutua. Aprovechadla o callaos para siempre, hijos de puta.',
    'Match perfecto, hostia. Que se besen ya y acabemos con esta mierda antes de que el grupo se muera de cringe.',
    'Cien por cien. El bot ha hecho la cuenta tres veces por si se había equivocado y no: esto pasa una vez cada diez años, joder.',
    'Match total. Se han encontrado dos personas igual de insoportables y por eso mismo funciona: nadie más las habría aguantado, coño.',
    'Compatibilidad absoluta. Lo raro no es que encajen, lo raro es que hayan tardado tanto con el grupo entero mirando como gilipollas.',
    'Perfecto, hostia puta. Esto no es química, es destino con muy mal gusto y muchísima insistencia.',
    'Redondo, joder. El bot no reparte cien por cien todos los días, así que aprovechad antes de que uno de los dos la cague.',
    'Cien. Dos piezas rotas que resulta que estaban rotas por el mismo sitio. Encajan de milagro y encajan de puta madre.',
    'Match de los que se cuentan en las bodas entre vómitos. Lo mejor es que ninguno lo vio venir hasta este mensaje, los imbéciles.',
    'Perfecto y ligeramente preocupante, coño. Cuando dos personas encajan tanto, el resto del grupo sobra un poco.',
    'Cien por cien. El bot lleva meses viendo venir esta mierda y por fin tiene una excusa para decirlo en voz alta.',
    'Compatibilidad máxima. No hay nada que analizar: se ha juntado lo que tenía que juntarse y punto, joder.',
    'Match perfecto. Uno pone el caos y el otro pone la paciencia, que es exactamente como funciona la mierda que dura.',
    'Cien, hostia. Si esto no acaba en algo, el problema ya no son los números: sois vosotros dos y vuestra puta cobardía.',
    'Total. El bot no encuentra ni un solo motivo para que esto falle, y mira que ha buscado con ganas, cabrón.',
    'Perfecto. Dos personas que se entienden sin hablar, que en este grupo de mierda es prácticamente un superpoder.',
    'Cien por cien y con el grupo de testigo. A partir de ahora ya no se puede fingir que no pasa nada, gilipollas.',
    'Match absoluto, joder. Es de esas parejas que dan rabia porque funcionan sin esfuerzo mientras el resto lo intenta y se come la mierda.',
    'Redondo. El bot ha visto miles de combinaciones y esta es de las pocas que no le da vergüenza anunciar, hostia.',
    'Cien. Lo tenían delante todo el puto tiempo y ha tenido que venir un bot a decírselo. Patético y precioso a partes iguales.',
    'Perfecto. Si alguno lo estropea ahora, que sepa que el grupo entero tiene este mensaje guardado, cabrón.',
    'Compatibilidad total, joder. Dos desastres que juntos, por algún motivo que escapa a la ciencia y a la decencia, funcionan.',
    'Cien por cien. Esto es lo más parecido a una boda que puede organizar un puto bot de WhatsApp. Que alguien traiga la tarta.',
  ],
  high: [
    'Alto. Hay drift, hay tensión, hay material de ship que el grupo ya olió. El grupo lo veía venir, joder.',
    'Compatibilidad alta. No es pleno, pero el arco se ve sin forzar. Sin anestesia, mierda. El grupo no necesita debate: el número basta y sobra.',
    'Alto de los que ilusionan con razón: la química está y se nota. Sin anestesia, coño. El grupo no necesita debate: el número basta y sobra.',
    'Ship sólido. Falta un empujón para el pleno, sobra base. Sin anestesia, cabrón. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad de las que el chat comenta en serio. Sin anestesia, gilipollas. El grupo no necesita debate: el número basta y sobra.',
    'Alto. No es cuento: el cálculo respalda el runoreo del grupo. Sin anestesia, patético. El grupo no necesita debate: el número basta y sobra.',
    'Ship con sustancia. La tensión no es invento del comando. Sin anestesia, ridículo. El grupo no necesita debate: el número basta y sobra.',
    'Alto de verdad. El pleno está cerca si el universo no es cabrón. Sin anestesia, basura. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad alta: piezas que encajan con roce interesante. Sin anestesia, desperdicio. El grupo no necesita debate: el número basta y sobra.',
    'Ship que se sostiene solo. El número solo confirma. Sin anestesia, asco. El grupo no necesita debate: el número basta y sobra.',
    'Alto. Hay arco, hay roce, hay motivo para mirar dos veces. Sin anestesia, cutre. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad de las que duelen si no se consuman. Sin anestesia, pringado. El grupo no necesita debate: el número basta y sobra.',
    'Alto. El grupo lo veía: el bot pone el porcentaje. Sin anestesia, fracasado. El grupo no necesita debate: el número basta y sobra.',
    'Ship con base real. No es cope, es cálculo. Sin anestesia, joder. El grupo no necesita debate: el número basta y sobra.',
    'Alto de los limpios: química sin necesidad de guion forzado. Sin anestesia, mierda. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad alta y legible en el día a día del chat. Sin anestesia, coño. El grupo no necesita debate: el número basta y sobra.',
    'Alto. El pleno es tentación, no fantasía. Sin anestesia, cabrón. El grupo no necesita debate: el número basta y sobra.',
    'Ship con tensión de la buena: la que no se apaga sola. Sin anestesia, gilipollas. El grupo no necesita debate: el número basta y sobra.',
    'Alto. Material de pareja con número que no miente. Sin anestesia, patético. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad de quienes ya se buscan en el hilo sin decirlo. Sin anestesia, ridículo. El grupo no necesita debate: el número basta y sobra.',
    'Alto. Falta poco para el cien y el poco se siente. Sin anestesia, basura. El grupo no necesita debate: el número basta y sobra.',
    'Ship sólido documentado. El chat puede dejar de fingir sorpresa. El grupo lo veía venir, desperdicio.',
    'Alto de verdad. La química tiene expediente. Sin anestesia, asco. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad alta: el roce produce chispa, no solo roce. Sin anestesia, cutre. El grupo no necesita debate: el número basta y sobra.',
    'Alto. El arco está escrito a medias y pide final. Sin anestesia, pringado. El grupo no necesita debate: el número basta y sobra.',
    'Ship con sustancia suficiente para el rumor serio. Sin anestesia, fracasado. El grupo no necesita debate: el número basta y sobra.',
    'Alto. No es el pleno y aun así pesa. Sin anestesia, joder. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad de las que el grupo banca en silencio. Sin anestesia, mierda. El grupo no necesita debate: el número basta y sobra.',
    'Alto. El número respalda lo que ya se comentaba. Sin anestesia, coño. El grupo no necesita debate: el número basta y sobra.',
    'Ship con base: el resto es decisión de ellos, no del bot. Sin anestesia, cabrón. El grupo no necesita debate: el número basta y sobra.',
    'Alto de los claros. La tensión no es un malentendido. Sin anestesia, gilipollas. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad alta y sin anestesia de cope. Sin anestesia, patético. El grupo no necesita debate: el número basta y sobra.',
    'Alto. Hay match de verdad, no de relleno. Sin anestesia, ridículo. El grupo no necesita debate: el número basta y sobra.',
    'Ship que se sostiene en el cálculo y en el chat. Sin anestesia, basura. El grupo no necesita debate: el número basta y sobra.',
    'Alto. El pleno está a un mal día de distancia o a un buen sí. Sin anestesia, desperdicio. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad de quienes ya ocupan espacio mental ajeno. Sin anestesia, asco. El grupo no necesita debate: el número basta y sobra.',
    'Alto. Material de pareja con porcentaje que no pide fe. Sin anestesia, cutre. El grupo no necesita debate: el número basta y sobra.',
    'Ship sólido: el grupo puede dejar el cinismo un segundo. Sin anestesia, pringado. El grupo no necesita debate: el número basta y sobra.',
    'Alto de verdad. La química no es un rumor vacío. Sin anestesia, fracasado. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad alta legible sin forzar el relato. Sin anestesia, joder. El grupo no necesita debate: el número basta y sobra.',
    'Alto. Falta el cierre, sobra la base. Sin anestesia, mierda. El grupo no necesita debate: el número basta y sobra.',
    'Ship con arco real. El número es el subtítulo. Sin anestesia, coño. El grupo no necesita debate: el número basta y sobra.',
    'Alto. El chat lo olió antes que el comando. Sin anestesia, cabrón. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad de las que duelen por lo cerca que están del pleno. El grupo lo veía venir, gilipollas.',
    'Alto. No es cuento chino: es porcentaje con sustancia. Sin anestesia, patético. El grupo no necesita debate: el número basta y sobra.',
    'Ship con tensión que no se apaga al cambiar de hilo. Sin anestesia, ridículo. El grupo no necesita debate: el número basta y sobra.',
    'Alto de los limpios: match sin necesidad de milagro. Sin anestesia, basura. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad alta y el grupo lo sabe. Sin anestesia, desperdicio. El grupo no necesita debate: el número basta y sobra.',
    'Alto. El bot confirma, no inventa. Sin anestesia, asco. El grupo no necesita debate: el número basta y sobra.',
    'Ship sólido documentado sin drama falso. Sin anestesia, cutre. El grupo no necesita debate: el número basta y sobra.',
    'Alto. Hay drift de pareja, no solo de amistad de chat. Sin anestesia, pringado. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad de quienes ya se eligen en las bromas del grupo. Sin anestesia, fracasado. El grupo no necesita debate: el número basta y sobra.',
    'Alto. El pleno es el siguiente tramo natural, no un salto imposible. Sin anestesia, joder. El grupo no necesita debate: el número basta y sobra.',
    'Ship con base y con roce. El número pesa. Sin anestesia, mierda. El grupo no necesita debate: el número basta y sobra.',
    'Alto de verdad. La química tiene testigos en el hilo. Sin anestesia, coño. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad alta: piezas que encajan con historia. Sin anestesia, cabrón. El grupo no necesita debate: el número basta y sobra.',
    'Alto. Material suficiente para que el rumor sea legítimo. Sin anestesia, gilipollas. El grupo no necesita debate: el número basta y sobra.',
    'Ship que se sostiene solo ante el cálculo. Sin anestesia, patético. El grupo no necesita debate: el número basta y sobra.',
    'Alto. El grupo puede dejar de hacerse el sorprendido. Sin anestesia, ridículo. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad de las que piden un sí o un no claro, no un mediocre. El grupo lo veía venir, basura.'
  ],
  mid: [
    'Joder, esto es como pedir una puta pizza y que te llegue sin queso. Funciona, pero para qué coño te molestas.',
    'Tienen la misma compatibilidad que un condón reutilizado: técnicamente posible, pero nadie con dos dedos de frente lo intentaría.',
    'Esto es lo que pasa cuando dos personas se atraen con la misma intensidad con la que uno se rasca los cojones un martes.',
    'Hostia, menudo bodrio de pareja. Serían de esos que follan con calcetines y luego se dan la espalda para ver el móvil.',
    'Compatibilidad de mierda tibia. Como cagar a medias: ni el alivio ni las ganas de seguir.',
    'Si estos dos fueran una peli, serían una de esas que pones de fondo mientras limpias y ni te enteras de que ha acabado.',
    'El bot ha visto parejas malas, pero es que estos dos ni siquiera llegan a mala. Llegan a nada. A puta nada.',
    'Esto tiene la misma emoción que encontrar un billete de cinco euros en el bolsillo: bien, coño, pero tampoco te cambia la vida.',
    'Se aguantan como se aguanta a un compañero de piso que deja la puta tapa del váter levantada. Se puede vivir, pero jode.',
    'Mierda, el bot ha intentado encontrar algo interesante aquí y lo único que ha sacado es ganas de irse a dormir.',
    'Estos dos juntos son como un pedo silencioso en un ascensor: presente, incómodo, y al final todos fingen que no ha pasado nada.',
    'Compatibilidad más floja que la erección de un borracho a las cuatro de la mañana. Hay intención, pero el cuerpo no responde.',
    'Coño, esto es como comerse un yogur caducado de ayer: probablemente no te mate, pero tampoco vas presumiendo de ello.',
    'Regular tirando a hostia que me da igual. Si esto fuera sexo, sería un misionero con la luz apagada y sin hacer ruido.',
    'Juntos funcionarían como un puto mechero mojado. A veces da chispa, la mayoría de las veces te quemas el dedo para nada.',
    'Tienen menos química que un cabrón repitiendo primero de la ESO. Y mira que ese chaval lo intentaba.',
    'Esto es el equivalente sentimental a comer arroz blanco sin sal: te llena, pero a nadie le sale una puta sonrisa.',
    'Si la mediocridad tuviera un hijo no deseado, tendría exactamente este porcentaje de compatibilidad.',
    'Joder, se llevan bien de la misma forma que te llevas bien con el dentista: porque no queda otra y dura lo justo.',
    'Estos dos son como las instrucciones del IKEA: algo se puede montar, pero vas a sudar, maldecir, y el resultado va a cojear.',
    'Hostia puta, menudo churro. Esto es como ganar un concurso y que el premio sea un cupón de descuento en algo que no quieres.',
    'Match más soso que chuparle el culo a una piedra. Y la piedra al menos te da una anécdota.',
    'Compatibilidad de microondas: calienta rápido, sabe a mierda, y al final siempre acabas queriendo algo mejor.',
    'Si estos dos se liaran, el grupo ni se enteraría. Y si se enterara, le importaría tres cojones. Y tendrían razón.',
    'Esto tiene el mismo potencial romántico que una colonoscopia. Se puede hacer, pero nadie lo pone en su lista de deseos.',
    'Mierda, he visto más tensión sexual entre dos abuelos peleándose por el último pan en el supermercado.',
    'Estos dos juntos durarían lo que dura un hielo en un coño en verano. Mucha gracia al principio, y luego solo hay charco.',
    'Compatibilidad del carajo. Funcionarían como pareja en un universo donde follar fuera opcional y la conversación no existiera.',
    'Si esto fuera una droga, sería una aspirina genérica: algo hace, pero no es por lo que llamas al camello a las tres de la mañana.',
    'Regular. Y no regular de interesante, regular de que el bot se ha quedado dormido calculando esto y le ha dado puta igual.',
    'Juntos generan la misma pasión que un cabrón leyendo los términos y condiciones. Técnicamente participas, pero el alma se ha ido.',
    'Hostia, compatibilidad de sala de espera. Estáis juntos porque no hay otra opción y cada uno mira su puto móvil.',
    'Esto es como mezclar agua con más agua: no explota, no huele, no sabe a nada. Enhorabuena, coño, habéis inventado la nada.',
    'Menos chispa que un puto funeral. Y en el funeral al menos alguien llora, aquí ni eso.',
    'Si estos dos fueran comida, serían una tostada sin mantequilla: cumple su función, pero te la comes con cara de que te han jodido la mañana.',
    'Coño, esto es como comprarse un coche de segunda mano que solo arranca en bajada. Amor cuesta abajo y a empujones.',
    'Compatibilidad de mierda templada. Ni lo bastante caliente para quemar ni lo bastante fría para que alguien se queje.',
    'Estos dos juntos son como ver un partido de fútbol que acaba 0-0: inviertes noventa minutos y te vas con las manos vacías y cabreado.',
    'Joder, si esto fuera un polvo sería de esos que acabas y piensas hostia, para esto me podría haber cascado una paja.',
    'Match con la misma energía que un lunes a las siete de la mañana. Se puede sobrevivir, pero nadie lo elige.',
    'Si la apatía se tirara pedos, sonaría exactamente como este porcentaje de compatibilidad.',
    'Esto funciona como el culo de un político: algo sale, pero siempre es mierda y nunca lo que esperabas.',
    'Compatibilidad de kebab de madrugada. En el momento parece buena idea, a la mañana siguiente te arrepientes en el váter.',
    'Hostia, menudo mojón de match. Se toleran como se tolera una cucaracha que vive detrás del frigorífico: mientras no aparezca mucho, se puede.',
    'Tienen la misma conexión emocional que un cabrón con su declaración de la renta. Lo haces porque toca, no porque te apetezca.',
    'Si estos dos se casaran, los invitados irían solo por la comida gratis y se pirarían antes del vals.',
    'Compatibilidad de pene a media asta: algo hay, la intención se nota, pero no da para el espectáculo completo.',
    'Juntos generan menos calor que un puto iglú en invierno. Al menos el iglú sirve para algo, coño.',
    'Esto es el match sentimental de ir a comprar tabaco y volver con chicles. No es lo que querías, pero masticas algo.',
    'Mierda, estos dos son como dos calcetines de distinto par: los puedes poner juntos, pero cada vez que te miras el pie sabes que algo falla.',
    'Si la indiferencia pudiera reproducirse, estos dos serían sus putos padres fundadores.',
    'Hostia, compatibilidad de semáforo en ámbar. No sabes si frenar o acelerar, y hagas lo que hagas va a salir regular.',
    'Esto es como hacerse una paja con la mano dormida: raro, confuso, y al final te preguntas por qué cojones has empezado.',
    'Match más flojo que un pedazo de mierda atado con un pelo. Existe la unión, pero nadie confía en ella.',
    'Coño, estos dos son como el WiFi de un hotel barato: se conectan a ratos, la señal es una basura, y al final acabas usando tus propios datos.',
    'Compatibilidad de cuarto de baño de gasolinera: funcional, pero no te quedas ni un segundo más de lo estrictamente necesario.',
    'Si estos dos fueran una canción, serían el hilo musical del ascensor. Suena algo, pero tu cerebro se niega a procesarlo.',
    'Joder, esto tiene toda la pinta de esas relaciones que duran lo que tarda uno de los dos en conocer a alguien menos aburrido.',
    'Hostia puta, menudo par de mediocres. Ni para follar bien ni para discutir con ganas. El peor de los dos mundos.',
    'Match con menos futuro que una mierda en una tormenta. Se sostiene un momento y luego la corriente se lo lleva todo al carajo.',
  ],
  low: [
    'Bajo. Hay menos química aquí que en un vaso de agua del grifo. Sin anestesia, joder. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad floja. Se aguantan en el mismo chat y poco más. Sin anestesia, mierda. El grupo no necesita debate: el número basta y sobra.',
    'Bajo de verdad. El ship cojea y no es de gracia. Sin anestesia, coño. El grupo no necesita debate: el número basta y sobra.',
    'Poca cosa. Ni chispa ni drama interesante: solo el número bajo. Sin anestesia, cabrón. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad justa para no ser cero, insuficiente para ilusionar a nadie. El grupo lo veía venir, gilipollas.',
    'Bajo. El grupo no ve pareja: ve dos nicks que coinciden en el hilo. El grupo lo veía venir, patético.',
    'Ship flojo. La química pidió la baja médica. Sin anestesia, ridículo. El grupo no necesita debate: el número basta y sobra.',
    'Bajo de los que duelen de lo previsible: no hay match y se nota. Sin anestesia, basura. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad tibia hacia abajo. El termómetro bosteza. Sin anestesia, desperdicio. El grupo no necesita debate: el número basta y sobra.',
    'Bajo. Ni el alcohol cósmico arregla este cálculo. Sin anestesia, asco. El grupo no necesita debate: el número basta y sobra.',
    'Poca química. El comando no necesita adorno para el no casi total. Sin anestesia, cutre. El grupo no necesita debate: el número basta y sobra.',
    'Ship en zona de peligro de aburrimiento: bajo y sin arco. Sin anestesia, pringado. El grupo no necesita debate: el número basta y sobra.',
    'Bajo. Se toleran: eso no es un match, es civismo mínimo. Sin anestesia, fracasado. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad de quien comparte grupo y nada más. Sin anestesia, joder. El grupo no necesita debate: el número basta y sobra.',
    'Bajo de solemnidad: el romance no vive aquí. Sin anestesia, mierda. El grupo no necesita debate: el número basta y sobra.',
    'Ship flojo documentado. El chat no discute el número. Sin anestesia, coño. El grupo no necesita debate: el número basta y sobra.',
    'Bajo. La chispa se mojó antes de acercarse. Sin anestesia, cabrón. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad escasa: el puente es un tablón roto. Sin anestesia, gilipollas. El grupo no necesita debate: el número basta y sobra.',
    'Bajo. Mejor amigos de la distancia que pareja de este número. Sin anestesia, patético. El grupo no necesita debate: el número basta y sobra.',
    'Ship en el tramo que no ilusiona ni al más cope. Sin anestesia, ridículo. El grupo no necesita debate: el número basta y sobra.',
    'Bajo de verdad. El bot no regala décimas de caridad. Sin anestesia, basura. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad justa para el trámite del comando y nada más. Sin anestesia, desperdicio. El grupo no necesita debate: el número basta y sobra.',
    'Bajo. Dos trayectorias paralelas que no se tocan. Sin anestesia, asco. El grupo no necesita debate: el número basta y sobra.',
    'Ship flojo: el drama sería más interesante por separado. Sin anestesia, cutre. El grupo no necesita debate: el número basta y sobra.',
    'Bajo. La química está de vacaciones indefinidas. Sin anestesia, pringado. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad tibia-fría. El jersey no calienta. Sin anestesia, fracasado. El grupo no necesita debate: el número basta y sobra.',
    'Bajo. El match existe solo porque el comando lo forzó a existir. Sin anestesia, joder. El grupo no necesita debate: el número basta y sobra.',
    'Ship en números que piden otro intento con otras personas. Sin anestesia, mierda. El grupo no necesita debate: el número basta y sobra.',
    'Bajo. Ni tensión ni paz interesante: solo el bajo. Sin anestesia, coño. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad de pasillo de grupo: se cruzan y ya. Sin anestesia, cabrón. El grupo no necesita debate: el número basta y sobra.',
    'Bajo de los claros. El grupo no necesitaba el porcentaje. Sin anestesia, gilipollas. El grupo no necesita debate: el número basta y sobra.',
    'Ship flojo sin derecho a narración épica. Sin anestesia, patético. El grupo no necesita debate: el número basta y sobra.',
    'Bajo. La idea de pareja aquí es un malentendido del azar. Sin anestesia, ridículo. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad escasa y se nota en el silencio del chat al ver el número. El grupo lo veía venir, basura.',
    'Bajo. Mejor no forzar lo que el cálculo ya enterró. Sin anestesia, desperdicio. El grupo no necesita debate: el número basta y sobra.',
    'Ship en zona de no-recomendable según este bot. Sin anestesia, asco. El grupo no necesita debate: el número basta y sobra.',
    'Bajo. Química de archivo muerto. Sin anestesia, cutre. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad de quienes comparten wifi del grupo y nada del resto. El grupo lo veía venir, pringado.',
    'Bajo. El romance pidió traslado. Sin anestesia, fracasado. El grupo no necesita debate: el número basta y sobra.',
    'Ship flojo: el número es el mensaje, el resto es cortesía. Sin anestesia, joder. El grupo no necesita debate: el número basta y sobra.',
    'Bajo de vergüenza ajena si alguien lo celebrara. Sin anestesia, mierda. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad justa para no ser cero: el consuelo más triste. Sin anestesia, coño. El grupo no necesita debate: el número basta y sobra.',
    'Bajo. Dos piezas que no son del mismo puzzle. Sin anestesia, cabrón. El grupo no necesita debate: el número basta y sobra.',
    'Ship en el tramo del bostezo colectivo. Sin anestesia, gilipollas. El grupo no necesita debate: el número basta y sobra.',
    'Bajo. La chispa no solo no prende: no existe el yesquero. Sin anestesia, patético. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad tibia hacia el sótano. Sin anestesia, ridículo. El grupo no necesita debate: el número basta y sobra.',
    'Bajo. El comando cumple el trámite; el corazón no. Sin anestesia, basura. El grupo no necesita debate: el número basta y sobra.',
    'Ship flojo sin arco, sin tensión, con número honesto. Sin anestesia, desperdicio. El grupo no necesita debate: el número basta y sobra.',
    'Bajo de los que cierran el debate en una línea. Sin anestesia, asco. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad de vecinos de hilo, no de pareja. Sin anestesia, cutre. El grupo no necesita debate: el número basta y sobra.',
    'Bajo. El azar se arrepiente de haberlos puesto en la misma frase. Sin anestesia, pringado. El grupo no necesita debate: el número basta y sobra.',
    'Ship en números que piden cambio de objetivo. Sin anestesia, fracasado. El grupo no necesita debate: el número basta y sobra.',
    'Bajo. Química ausente con disculpas del universo. Sin anestesia, joder. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad escasa: el tablón del puente ya era de cartón. Sin anestesia, mierda. El grupo no necesita debate: el número basta y sobra.',
    'Bajo. Mejor el no claro que el sí forzado. Sin anestesia, coño. El grupo no necesita debate: el número basta y sobra.',
    'Ship flojo documentado sin anestesia. Sin anestesia, cabrón. El grupo no necesita debate: el número basta y sobra.',
    'Bajo. El match es un malentendido estadístico. Sin anestesia, gilipollas. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad de quienes se soportan en silencio y poco más. Sin anestesia, patético. El grupo no necesita debate: el número basta y sobra.',
    'Bajo de verdad. Siguiente pareja, por favor. Sin anestesia, ridículo. El grupo no necesita debate: el número basta y sobra.',
    'Ship en el tramo donde el bot casi pone cero por redondeo. Sin anestesia, basura. El grupo no necesita debate: el número basta y sobra.'
  ],
  zero: [
    'Cero. Estos dos juntos son un accidente de calendario, no un ship. Sin anestesia, joder. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad nula. Ni el algoritmo más borracho los juntaría en serio. El grupo lo veía venir, mierda.',
    'Cero por cien. El universo se disculpa por haberlos puesto en el mismo chat. El grupo lo veía venir, coño.',
    'Ship imposible. Se repelen como imanes del mismo polo y encima con asco. El grupo lo veía venir, cabrón.',
    'Cero. Si acaban juntos es porque el infierno se quedó sin plazas individuales. El grupo lo veía venir, gilipollas.',
    'Nula. No hay chispa, no hay drama útil, solo dos nicks que no deberían compartir frase. El grupo lo veía venir, patético.',
    'Cero absoluto. El bot casi se niega a calcularlo de lo evidente que es el no. El grupo lo veía venir, ridículo.',
    'Compatibilidad bajo tierra. Estos dos juntos bajan el promedio del concepto de pareja. El grupo lo veía venir, basura.',
    'Cero. Ni por descarte, ni por pena, ni por alcohol cósmico. Sin anestesia, desperdicio. El grupo no necesita debate: el número basta y sobra.',
    'Ship cancelado antes de existir. El ranking de no-química tiene cabeza de cartel. El grupo lo veía venir, asco.',
    'Cero por cien. La química entre ellos es un rumor falso del chat. Sin anestesia, cutre. El grupo no necesita debate: el número basta y sobra.',
    'Nula total. Juntarlos es insultar a la idea de match. Sin anestesia, pringado. El grupo no necesita debate: el número basta y sobra.',
    'Cero. El grupo lo sabía: el comando solo pone el sello. Sin anestesia, fracasado. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad inexistente. Dos trayectorias que no se cruzan ni por error. El grupo lo veía venir, joder.',
    'Cero. Si esto fuera un experimento, el laboratorio lo habría cerrado. El grupo lo veía venir, mierda.',
    'Ship en números rojos de verdad: no hay margen de error que los salve. El grupo lo veía venir, coño.',
    'Cero por cien. El azar se niega a firmar esta combinación. Sin anestesia, cabrón. El grupo no necesita debate: el número basta y sobra.',
    'Nula. Ni el cope más optimista vende este match. Sin anestesia, gilipollas. El grupo no necesita debate: el número basta y sobra.',
    'Cero. Estos dos juntos son ruido, no pareja. Sin anestesia, patético. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad cero: el bot no suaviza el veredicto. Sin anestesia, ridículo. El grupo no necesita debate: el número basta y sobra.',
    'Cero. La distancia química es un agujero, no un puente. Sin anestesia, basura. El grupo no necesita debate: el número basta y sobra.',
    'Ship imposible documentado. Archivo cerrado. Sin anestesia, desperdicio. El grupo no necesita debate: el número basta y sobra.',
    'Cero por cien. Ni por aburrimiento del universo. Sin anestesia, asco. El grupo no necesita debate: el número basta y sobra.',
    'Nula. El match más forzado del historial del comando. Sin anestesia, cutre. El grupo no necesita debate: el número basta y sobra.',
    'Cero. Se miran y el aire entre ellos pide asilo en otro hilo. Sin anestesia, pringado. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad bajo cero. El termómetro no miente. Sin anestesia, fracasado. El grupo no necesita debate: el número basta y sobra.',
    'Cero. El ship naufragó antes de botarse. Sin anestesia, joder. El grupo no necesita debate: el número basta y sobra.',
    'Nula total. Dos piezas de puzzles distintos en cajas distintas. Sin anestesia, mierda. El grupo no necesita debate: el número basta y sobra.',
    'Cero por cien. El grupo no necesita debate: necesita el número. Sin anestesia, coño. El grupo no necesita debate: el número basta y sobra.',
    'Ship cancelado. Cero. Siguiente pareja. Sin anestesia, cabrón. El grupo no necesita debate: el número basta y sobra.',
    'Cero. La química es un meme malo y ni siquiera da risa. Sin anestesia, gilipollas. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad inexistente con sello del bot. Sin anestesia, patético. El grupo no necesita debate: el número basta y sobra.',
    'Cero. Juntarlos es un error de casting del destino. Sin anestesia, ridículo. El grupo no necesita debate: el número basta y sobra.',
    'Nula. No hay arco, no hay tensión útil, solo el no. Sin anestesia, basura. El grupo no necesita debate: el número basta y sobra.',
    'Cero por cien. El cálculo fue cortesía; el resultado era obvio. El grupo lo veía venir, desperdicio.',
    'Ship en el sótano del ranking de matches. Sin anestesia, asco. El grupo no necesita debate: el número basta y sobra.',
    'Cero. Estos dos no suman: restan al concepto de ship. Sin anestesia, cutre. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad nula: el chat respira aliviado con el número. Sin anestesia, pringado. El grupo no necesita debate: el número basta y sobra.',
    'Cero. Ni el fanfic más desesperado los fuerza bien. Sin anestesia, fracasado. El grupo no necesita debate: el número basta y sobra.',
    'Nula. El no más limpio que ha escupido este comando. Sin anestesia, joder. El grupo no necesita debate: el número basta y sobra.',
    'Cero por cien. Química ausente, drama inútil, veredicto claro. Sin anestesia, mierda. El grupo no necesita debate: el número basta y sobra.',
    'Ship imposible. El bot no ofrece recursos de apelación. Sin anestesia, coño. El grupo no necesita debate: el número basta y sobra.',
    'Cero. La pareja que no existe ni en el modo broma. Sin anestesia, cabrón. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad bajo tierra con lápida incluida. Sin anestesia, gilipollas. El grupo no necesita debate: el número basta y sobra.',
    'Cero. Dos nicks, cero motivo para la misma frase romántica. Sin anestesia, patético. El grupo no necesita debate: el número basta y sobra.',
    'Nula total. El universo pasó de esta combinación. Sin anestesia, ridículo. El grupo no necesita debate: el número basta y sobra.',
    'Cero por cien. No hay chispa: hay un extintor permanente. Sin anestesia, basura. El grupo no necesita debate: el número basta y sobra.',
    'Ship cancelado por falta de materia prima. Sin anestesia, desperdicio. El grupo no necesita debate: el número basta y sobra.',
    'Cero. El match más vacío del archivo. Sin anestesia, asco. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad cero: sin anestesia y sin debate. Sin anestesia, cutre. El grupo no necesita debate: el número basta y sobra.',
    'Cero. Estos dos juntos son un typo del destino. Sin anestesia, pringado. El grupo no necesita debate: el número basta y sobra.',
    'Nula. El ranking de no-ships tiene nuevo referente. Sin anestesia, fracasado. El grupo no necesita debate: el número basta y sobra.',
    'Cero por cien. El bot casi se disculpa por tener que decirlo. Sin anestesia, joder. El grupo no necesita debate: el número basta y sobra.',
    'Ship en números que dan vergüenza ajena al concepto de pareja. Sin anestesia, mierda. El grupo no necesita debate: el número basta y sobra.',
    'Cero. Química nula, interés nulo, veredicto nulo de esperanza. Sin anestesia, coño. El grupo no necesita debate: el número basta y sobra.',
    'Compatibilidad inexistente: archivo y a otra cosa. Sin anestesia, cabrón. El grupo no necesita debate: el número basta y sobra.',
    'Cero. Ni por pena del grupo. Sin anestesia, gilipollas. El grupo no necesita debate: el número basta y sobra.',
    'Nula. El no más rotundo del día. Sin anestesia, patético. El grupo no necesita debate: el número basta y sobra.',
    'Cero por cien. Siguiente. Sin anestesia, ridículo. El grupo no necesita debate: el número basta y sobra.',
    'Ship imposible. Cero. Punto final. Sin anestesia, basura. El grupo no necesita debate: el número basta y sobra.'
  ],
};

// Etiqueta visible para un participante. Un JID @lid no resuelve a un numero
// real al mostrarse como @mencion — en ese caso preferimos el nombre conocido
// del participante (mismo fallback que ya usa !roast) en vez de exponer el
// numero interno del LID. Los JIDs de telefono siguen mostrandose como
// @numero, igual que antes, para que WhatsApp los resuelva como mencion.
function resolveLabel(jidVal, participants) {
  const bare = bareJid(jidVal);
  const num = bare.split('@')[0];
  if (!bare.endsWith('@lid')) return `@${num}`;
  const p = participants.find(x =>
    bareJid(x.id) === bare || bareJid(x.lid) === bare || bareJid(x.phoneNumber) === bare
  );
  return p?.name || p?.displayName || p?.verifiedName || p?.notify || `@${num}`;
}

async function cmdShip(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  const groupParticipants = groupMeta?.participants || [];
  // Del sorteo se caen el bot y el owner principal: el bot no se shipea con
  // nadie, y el owner es invisible en toda salida automatica (igual que en los
  // tops, en !count y en !vs). Si alguien lo menciona a proposito si entra, y
  // ahi ya manda el amanyo de abajo.
  const participantIds = groupParticipants
    .map(p => p.id)
    .filter(id => id && !isBotJid(sock, id) && !isMainOwner(id, false, groupMeta));
  if (participantIds.length < 2) {
    return sock.sendMessage(jid, { text: 'Necesito al menos 2 miembros en el grupo.' }, { quoted: msg });
  }

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const mentioned = ctx?.mentionedJid || [];
  // Una respuesta citada cuenta como segundo objetivo si no quedo ya cubierto
  // por una mencion explicita — asi !ship funciona respondiendo a un mensaje,
  // igual que !mute/!promote/!demote.
  const quotedParticipant = ctx?.participant;
  const targets = [...mentioned];
  if (quotedParticipant && !targets.some(t => bareJid(t) === bareJid(quotedParticipant))) {
    targets.push(quotedParticipant);
  }
  const sender = getSender(msg);

  let a, b;

  if (targets.length >= 2) {
    // !ship @a @b (o @a + responder a b) — shipea exactamente esos dos
    [a, b] = targets.slice(0, 2);
  } else if (targets.length === 1) {
    // !ship @a (o responder a alguien) — shipea al que manda con @a
    a = sender;
    b = targets[0];
  } else {
    // !ship a secas — a QUIEN LO ESCRIBE con alguien al azar.
    //
    // Antes sorteaba dos miembros cualesquiera y el que había escrito el comando
    // se quedaba mirando cómo emparejaban a otros dos. Escribir !ship es
    // apuntarse: lo mínimo es que te toque a ti.
    a = sender;
    const resto = participantIds.filter(id => !sameUser(id, sender));
    if (!resto.length) {
      return sock.sendMessage(jid, { text: 'No hay nadie más en el grupo con quien shipearte.' }, { quoted: msg });
    }
    b = shuffle(resto)[0];
  }

  // No shippear a alguien consigo mismo (igual que !mog y !vs).
  if (sameUser(a, b)) {
    return sock.sendMessage(jid, { text: 'No puedes shippear a alguien consigo mismo.' }, { quoted: msg });
  }

  // Rig a favor del owner principal: si participa, la compatibilidad es alta pero
  // VARIABLE (88-100), no siempre 100, para que no se note el amaño.
  // Al owner principal se le shipea SIEMPRE bajo, 0-12, por pedido expreso suyo:
  // no le gustan los ships en él y punto.
  //
  // Se probó a suavizarlo a 8-53 junto con el resto de amaños, para que no
  // cantara tanto. Lo revirtió: aquí prefiere que cante a que le emparejen. Es
  // su decisión y no se vuelve a tocar sin que la cambie él.
  const ownerInvolved = isMainOwner(a, false, groupMeta) || isMainOwner(b, false, groupMeta);
  const compat = ownerInvolved ? Math.floor(Math.random() * 13) : Math.floor(Math.random() * 101);
  const filled = Math.round(compat / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

  const verdict =
    compat === 100 ? pickFresh(VERDICTS.perfect, `${jid}|ship|perfect`) :
    compat >= 70   ? pickFresh(VERDICTS.high,    `${jid}|ship|high`) :
    compat >= 40   ? pickFresh(VERDICTS.mid,     `${jid}|ship|mid`) :
    compat >= 10   ? pickFresh(VERDICTS.low,     `${jid}|ship|low`) :
                     pickFresh(VERDICTS.zero,    `${jid}|ship|zero`);

  const labelA = resolveLabel(a, groupParticipants);
  const labelB = resolveLabel(b, groupParticipants);

  const text =
    `*Ship*\n\n` +
    `${labelA}  +  ${labelB}\n\n` +
    `${bar}  *${compat}%*\n\n` +
    `${verdict}`;

  await sock.sendMessage(jid, { text, mentions: [a, b] }, { quoted: msg });
}

module.exports = { cmdShip };
