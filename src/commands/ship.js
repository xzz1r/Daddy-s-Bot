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
    'Hay más química entre vosotros dos que en un laboratorio clandestino, y aun así preferís hablar del tiempo como dos jubilados.',
    'Encajáis como una llave con su cerradura, pero los dos os empeñáis en tocar el timbre en vez de entrar de una puta vez.',
    'Esta compatibilidad es tan alta que da coraje, porque el único puto obstáculo entre vosotros dos sois vosotros dos.',
    'Tenéis la tensión sexual de una peli prohibida en 1985, y la valentía de un funcionario a diez minutos de jubilarse.',
    'Joder, con este porcentaje deberíais estar liados hace meses, y en vez de eso os mandáis stickers como si tuvierais doce años.',
    'Sois esa pareja que el universo ya escribió en el guión, solo falta que alguno de los dos se aprenda su puta frase.',
    'La cifra dice que sois compatibles de cojones, lo que no mide es vuestra habilidad para cagarla por puro miedo.',
    'Vais a acabar juntos igual, la única duda es cuántos años más vais a tardar en dejar de haceros los tontos.',
    'Encajáis mejor que un político con una mentira bien ensayada, y con la misma cara de no haber roto un plato.',
    'Esta sintonía es tan bestia que hasta el router de casa se conecta solo cuando estáis los dos en la misma habitación.',
    'Sois tan compatibles que hasta vuestros ex os odian en secreto, y vosotros seguís ahí, de brazos cruzados como dos idiotas.',
    'Tenéis más rollo que una telenovela y menos acción que un domingo de resaca, panda de cagados de mierda.',
    'El porcentaje es una puta locura, casi tanto como vuestra capacidad para ignorar lo obvio delante de todo el mundo.',
    'Esta compatibilidad debería venir con una etiqueta: contenido no apto para los dos gilipollas que la protagonizan.',
    'Sois como dos elementos radiactivos: juntos generáis una energía brutal, pero nadie se atreve a acercar el detonador.',
    'Encajáis de cojones, el problema es que los dos tenéis el orgullo más grande que un piso en el centro.',
    'Con esta cifra ya podríais estar eligiendo el menú de la boda, y en vez de eso seguís dándole vueltas como dos gilipollas.',
    'Esta compatibilidad es tan alta que hasta yo, que soy un puto bot, estoy más nervioso que vosotros dos juntos.',
    'Sois la prueba de que se puede tener una química de escándalo y aun así ser más lentos que una fila del banco.',
    'Tenéis tanto potencial desperdiciado que da rabia, como comprar entradas de primera fila y quedarte en la puerta.',
    'Esta sintonía tan fuerte y vosotros seguís tratándoos como compañeros de curro que solo se hablan por el café.',
    'Sois compatibles hasta para discutir por tonterías, que ya es el nivel más alto de intimidad que existe, cabrones.',
    'Con este porcentaje el único milagro pendiente es que alguno mande el mensaje sin borrarlo quince putas veces antes.',
    'Encajáis tan bien que parece amañado, como esos combates donde ya sabes el resultado pero igual hay que fingir sorpresa.',
    'Esta compatibilidad de escándalo se está pudriendo en la nevera mientras los dos preferís morir solos con dignidad.',
    'Sois tan compatibles que hasta vuestros signos del zodiaco se llevarían mejor que dos suegras en Navidad.',
    'Tenéis la química al máximo y los cojones a cero, una combinación tan patética como enternecedora.',
    'El bot lo tiene clarísimo: os gustáis un huevo y os comportáis como dos gilipollas jugando al despiste.',
    'Con esta sintonía deberíais mandaros audios de veinte minutos, no un "jaja bien y tú" cada dos putos días.',
    'Sois la definición de potencial desperdiciado: química de sobra, valentía de mierda y un reloj que no para.',
    'Esta compatibilidad tan alta y seguís tratándoos como colegas del gimnasio que solo se saludan con la cabeza.',
    'El destino os ha puesto en bandeja una conexión de escándalo, y la estáis usando para hablar de series que veis por separado.',
    'Sois esa pareja de manual que todo el barrio ya dio por hecha, menos vosotros, que seguís en fase de negación.',
    'Con este porcentaje hasta las plantas de la oficina notan la tensión, y vosotros ahí, hablando del partido de ayer.',
    'Esta cifra es una puta declaración de amor del universo, y la respondéis con un emoticono de risa y punto.',
    'Sois tan compatibles que da vergüenza ajena veros fingir indiferencia, sois los peores actores del puto barrio.',
    'Tenéis más feeling que dos gemelos separados al nacer, y menos iniciativa que un cactus en pleno invierno.',
    'Esta sintonía es de las que solo pasan una vez, y la estáis dejando pudrirse como fruta olvidada en el frutero.',
    'Sois compatibles hasta durmiendo, seguro, porque para todo lo demás os falta el valor de un puto flan de postre.',
    'Con esta cifra vuestras madres ya se mandan mensajes preguntando la fecha de la boda, y vosotros ni un mísero café juntos.',
    'Esta compatibilidad tan brutal y seguís actuando como dos desconocidos en un ascensor averiado, qué desperdicio, joder.',
    'Sois de los que se gustan tanto que prefieren pelearse por chorradas antes que admitir lo evidente, panda de críos.',
    'Encajáis tan bien que hasta da rabia veros perder el tiempo con gente que no os llega ni a la suela del zapato.',
    'Con esta sintonía el único que no se ha enterado sois vosotros dos, porque el resto ya lo tiene claro desde hace tiempo.',
    'Esta compatibilidad tiene tanta fuerza que podría mover un camión, y vosotros no movéis ni un puto dedo para acercaros.',
    'Sois esa combinación perfecta que solo falla por cobardía, como un coche de carreras conducido por alguien con miedo a pisar el acelerador.',
    'Tenéis tanta química que hasta resulta sospechoso que sigáis fingiendo que sois solo amigos, panda de mentirosos.',
    'Con este porcentaje deberíais estar celebrando, pero seguro que los dos estáis fingiendo que no habéis leído esto todavía.',
    'Esta cifra es tan alta que roza lo indecente, y vuestra indecisión también, así que técnicamente estáis empatados.',
    'Sois la pareja que todos ya apostaron que acabaría junta, y los únicos que no han pagado la apuesta sois vosotros dos.',
    'Encajáis como una comida cara con el vino equivocado: brutal por separado, y de escándalo si alguien se atreviera a combinarlo.',
    'Con esta compatibilidad hasta un ciego vería que hay algo ahí, menos vosotros, que sois los únicos ciegos de verdad.',
    'Esta sintonía es tan real que da hasta pena verla desperdiciada en indirectas de Instagram que nadie contesta.',
    'Sois tan compatibles que hasta discutiendo parecéis un matrimonio de toda la vida, y ni siquiera habéis quedado a solas.',
    'Con este porcentaje el problema no es el amor, es que los dos tenéis el amor propio más inflado que un globo aerostático.',
    'Esta compatibilidad de escándalo se merece algo mejor que dos cobardes esperando a que el otro dé el primer paso.',
    'Sois esa pareja que hasta el karma está impaciente por ver junta, y vosotros seguís sin daros ni cuenta.',
    'Encajáis tan bien que hasta el algoritmo se ha emocionado, y eso que un algoritmo no siente una puta mierda.',
    'Con esta sintonía deberíais estar planeando vacaciones juntos, no debatiendo si mandar el mensaje o dejarlo en visto.',
    'Sois la prueba viviente de que la química de sobra no sirve de nada si los dos os quedáis parados como dos postes.',
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
    'Estos dos tienen menos química que un preservativo caducado olvidado en una guantera. Ni forzando sale nada, joder.',
    'Joder, juntaros a vosotros dos es como intentar mezclar aceite con agua: se repelen y encima dejan mancha.',
    'Menos pareja que dos extraños en un ascensor averiado. Y eso que el ascensor al menos obliga a compartir espacio.',
    'La química entre vosotros es tan inexistente que hasta el bot se aburre de calcularla. Cero total, cabrones.',
    'Esto no es ship, es un accidente estadístico. Ni el destino más borracho os juntaría a propósito.',
    'Tenéis la misma compatibilidad que un vegetariano y un asado de cordero. Se mira, se entiende, y se va cada uno por su lado.',
    'Joder, hasta las plantas del grupo tienen más química entre ellas que vosotros dos. Y las plantas no hablan.',
    'Si el amor fuera una carrera, vosotros dos estaríais descalificados antes de salir. Por falta de material.',
    'Menos vibra que un muerto en una nevera. Frío, silencioso y sin ninguna posibilidad de revivir, gilipollas.',
    'El universo entero se esfuerza en que no os juntéis y todavía alguien pide el porcentaje. Dejadlo ya.',
    'Tenéis menos futuro juntos que un cubito de hielo en el infierno. Y el cubito al menos se derrite con gracia.',
    'Química: cero. Atracción: cero. Motivo para seguir hablando de esto: también cero. Cerrad el tema, coño.',
    'Juntaros a vosotros es como forzar dos imanes por el mismo polo. Se resisten y al final alguien se hace daño.',
    'La única cosa que compartís es el grupo. Y ni eso lo hacéis bien. Pareja imposible de base, cabrones.',
    'Esto no es un ship bajo, es un naufragio anunciado. El barco ni siquiera salió del puerto.',
    'Menos compatibles que un diabético y una pastelería. Se puede mirar, pero tocar es una mala idea.',
    'El bot ha tenido que inventar un nuevo mínimo para describiros. Enhorabuena, sois peores que el cero.',
    'Si os juntaran por obligación, el primero en fugarse sería el que tuviera más dignidad. Y sobrarían candidatos.',
    'Química de la que hace que la gente cambie de tema por pena. No por respeto, por pena.',
    'Joder, hasta un random del grupo tendría más posibilidades con cualquiera de los dos que vosotros entre sí.',
    'Esto es lo contrario al amor. Es la prueba de que el universo tiene sentido del humor negro.',
    'Ni en una isla desierta. Y eso que en una isla desierta cualquiera termina por parecer atractivo.',
    'La vibra entre vosotros es la de dos personas que se deben dinero y ninguna quiere ser la primera en hablar.',
    'Ship tan bajo que ni el algoritmo de Tinder os pondría en la misma ciudad. Y Tinder es una mierda.',
    'Tenéis menos chispa que un mechero sin gas. Se intenta, se frustra, y se tira a la basura.',
    'Si el destino tuviera lista de prohibidos, vosotros dos estaríais en la portada. En grande.',
    'Compatibilidad de la que hace que hasta los solteros empedernidos se sientan mejor consigo mismos.',
    'Juntaros sería un favor que no le hacéis ni al grupo ni a vosotros. Dejadlo morir en paz.',
    'Menos pareja potencial que dos calcetines de distinto color encontrados debajo de la cama.',
    'El porcentaje es bajo porque las matemáticas no mienten. Y las matemáticas os han mirado y han dicho que no.',
    'Química residual de cuando coincidís en el mismo chat. Nada más. Y ni eso genera calor.',
    'Si os obligaran a una cita, el camarero pediría el cambio de turno. Por pena ajena.',
    'Tenéis el mismo magnetismo que dos personas que se pelearon por el último sitio en el metro.',
    'Esto no es bajo, es un agujero. Cualquier otra combinación del grupo saca más que vosotros.',
    'La única forma de que funcionéis es si uno de los dos desaparece. Y aun así sería discutible.',
    'Joder, el bot casi se niega a calcular esto. Por dignidad profesional.',
    'Menos futuro que un yogur caducado en agosto. Y el yogur al menos sirvió para algo en su momento.',
    'Vibra de dos personas que se toleran porque no les queda otra. Eso no es ship, es resignación.',
    'Si el amor fuera un examen, vosotros dos estaríais repitiendo curso desde hace años.',
    'Compatibilidad tan baja que hasta el azar se niega a experimentaros juntos. Inteligente el azar.',
    'El grupo entero suspira de alivio cada vez que no os juntan. Y con razón.',
    'Tenéis menos química que una pila agotada. Se pone, no hace nada, y se tira.',
    'Esto es lo más parecido a un anti-ship que existe. El universo os mira y cambia de canal.',
    'Ni forzando con grasa y martillo. Y eso que el martillo a veces soluciona cosas.',
    'La relación potencial entre vosotros es la misma que entre un paraguas y una tostadora. Inútil y peligrosa.',
    'Joder, hasta los que están peores en el ranking de soledad os sacan ventaja en compatibilidad mutua.',
    'Ship tan muerto que ni los necrománticos lo tocarían. Y esos tocan de todo.',
    'La única cosa que generáis juntos es silencio incómodo. Y ni siquiera es un silencio interesante.',
    'Porcentaje bajo porque la realidad es tozuda. Y la realidad os ha mirado y ha decidido que no.',
    'Si os juntaran, el primer mensaje sería "mejor lo dejamos". Y sería lo más sensato del día.',
    'Menos vibra que dos muebles en una habitación vacía. Están ahí, pero no interactúan.',
    'El destino os separó por una razón. Respetadlo, cabrones.',
    'Compatibilidad de la que hace que la gente prefiera estar sola. Y eso ya es decir mucho.',
    'Tenéis el mismo potencial de pareja que un tenedor y una sopa. Se puede intentar, pero no termina bien.',
    'Esto no es un ship, es una advertencia. El universo os está diciendo que miréis para otro lado.',
    'Química tan nula que hasta el oxígeno entre vosotros se aburre y se va a otra parte.',
    'Joder, el cálculo casi da error de división por cero. Por falta de material.',
    'Si el amor fuera un producto, vosotros dos seríais el que nadie compra ni en rebajas.',
    'La única estadística que sacáis alta juntos es la de "mejor por separado". Y va en aumento.',
    'Ship tan bajo que sirve de ejemplo de lo que no hay que intentar. Gracias por el servicio público.',
  ],
  zero: [
    'Esto no es un cero, es un agujero negro que se traga hasta la esperanza. Ni Dios junta esta mierda.',
    'Cero absoluto. Ni en una realidad alternativa. Ni borrachos. Ni por apuesta. Ni por piedad. Cero.',
    'El universo entero se pondría de acuerdo para impedir que esto pase. Y haría bien, joder.',
    'Juntaros a vosotros dos sería un crimen contra la química, la lógica y el sentido común. A la vez.',
    'Esto supera el cero. Es territorio negativo. El bot ha tenido que ampliar la escala solo para vosotros.',
    'Ni el destino más sadomasoquista os pondría en la misma frase. Y el destino es cabrón.',
    'La compatibilidad entre vosotros es la misma que entre el fuego y la gasolina: destructiva y mala idea.',
    'Cero tan redondo que casi da belleza. Lástima que sea la belleza del vacío total.',
    'Si os juntaran por error, el error pediría perdón y pediría el traslado a otro universo.',
    'Esto no es ship. Es la demostración de que algunas combinaciones no deberían ni mencionarse.',
    'Ni en el fin del mundo. Y en el fin del mundo la gente se junta con cualquiera. Vosotros no.',
    'El cero de vosotros dos es tan sólido que podría usarse como base de un edificio. De cementerio.',
    'Joder, hasta los enemigos íntimos tienen más química que vosotros. Y se odian.',
    'Esto es lo más parecido a un anti-destino que existe. El universo os evitó a propósito.',
    'Cero de los que hacen que el resto de ships bajos se sientan optimistas por comparación.',
    'Si el amor fuera obligatorio, vosotros dos seríais la excepción legal. Por motivos de salud pública.',
    'La única forma de que funcionéis es si uno de los dos deja de existir. Y aun así habría dudas.',
    'Ni el alcohol, ni la desesperación, ni el fin de los tiempos. Nada justifica este ship.',
    'Cero tan limpio que da envidia. Lástima que sea envidia del vacío.',
    'El bot ha considerado no mostrar este resultado por respeto al concepto de pareja. Pero aquí está.',
    'Juntaros sería como mezclar lejía con amoniaco: hay reacción, pero nadie quiere estar cerca.',
    'Esto no es un porcentaje. Es una orden de alejamiento emitida por el cosmos.',
    'Cero de los que se estudian en los libros de estadística como ejemplo de imposibilidad.',
    'Si os pusieran en la misma isla desierta, uno de los dos construiría una balsa solo para huir.',
    'La química entre vosotros es tan inexistente que viola las leyes de la termodinámica. En negativo.',
    'Ni por dinero. Ni por poder. Ni por aburrimiento extremo. Cero innegociable.',
    'Esto es el suelo del suelo. Debajo ya no hay números, solo vergüenza ajena.',
    'El universo os miró, calculó las probabilidades y decidió que no merecía la pena el intento.',
    'Cero tan rotundo que hasta los que creen en el amor libre dirían "mejor no".',
    'Si el destino tuviera una lista negra, vosotros dos seríais el encabezado. En negrita.',
    'Joder, esto no es incompatibilidad. Es una declaración de guerra del cosmos contra la idea de juntaros.',
    'La única estadística que compartís es la de "nunca debería haber pasado por la cabeza de nadie".',
    'Cero de los que hacen que el silencio sea la única respuesta decente. Y el silencio es elocuente.',
    'Ni en un sueño febril. Ni en una pesadilla. El subconsciente también tiene estándares.',
    'Esto supera la falta de química. Es una repulsión activa. El aire entre vosotros se incomoda.',
    'Si os obligaran a una cita, el local cerraría por duelo. Del concepto de romance.',
    'Cero absoluto y sin matices. No hay "casi". No hay "en otra vida". No hay nada.',
    'El bot ha tenido que verificar dos veces que no era un error de cálculo. No lo era. Sois peores.',
    'Juntaros sería un insulto a todas las parejas mediocres del mundo. Y eso ya es difícil.',
    'Esto no es un ship. Es una advertencia con forma de porcentaje. Haced caso.',
    'Cero de los que se graban en piedra. Para que nadie vuelva a intentarlo.',
    'La compatibilidad entre vosotros es la prueba de que el azar a veces tiene buen criterio al evitar cosas.',
    'Ni el amor, ni el odio, ni la indiferencia. Solo un vacío que ni el vacío quiere reclamar.',
    'Si el porcentaje pudiera ser negativo, lo sería. Y con varios dígitos.',
    'Esto es el final del ranking. Debajo solo hay el abismo. Y el abismo os mira con respeto.',
    'Cero tan perfecto que casi da pena estropearlo con cualquier intento de justificación.',
    'El universo, el destino y las matemáticas están de acuerdo por una vez: no.',
    'Juntaros a vosotros dos es la única idea peor que no juntaros a nadie. Y eso tiene mérito.',
    'Esto no necesita explicación. El número habla. Y dice que os larguéis cada uno por su lado.',
    'Cero. Punto. Fin de la discusión. Cualquier otra palabra sobra.',
    'La única cosa más imposible que este ship es que alguien lo defienda en serio.',
    'Si existiera un premio al anti-ship del año, lo ganaríais sin competencia. Y con goleada.',
    'Esto es lo que pasa cuando se fuerza lo que no tiene que existir. El resultado es este cero.',
    'Ni en el multiverso. En todas las realidades posibles vosotros dos sois incompatibles. Consistencia total.',
    'Cero de los que cierran conversaciones. Porque después de esto no hay nada que añadir.',
    'El bot se reserva el derecho de no volver a calcular esto. Por higiene mental.',
    'Joder, hasta los ships de gente que se odia sacan más. Y se odian de verdad.',
    'Esto no es un resultado. Es un veredicto. Y el veredicto es definitivo.',
    'Cero absoluto. Sin recursos, sin apelación y sin posibilidad de indulto.',
    'La última palabra la tienen las matemáticas. Y las matemáticas os han borrado del mapa.',
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
