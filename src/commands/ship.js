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
    'Alto. Hay drift, hay tensión, hay material de ship que el grupo ya olió El ranking lo deja claro, joder.',
    'Compatibilidad alta. No es pleno, pero el arco se ve sin forzar El ranking lo deja claro, joder.',
    'Alto de los que ilusionan con razón: la química está y se nota El ranking lo deja claro, joder.',
    'Ship sólido. Falta un empujón para el pleno, sobra base El ranking lo deja claro, joder.',
    'Compatibilidad de las que el chat comenta en serio El ranking lo deja claro, joder.',
    'Alto. No es cuento: el cálculo respalda el runoreo del grupo El ranking lo deja claro, joder.',
    'Ship con sustancia. La tensión no es invento del comando El ranking lo deja claro, joder.',
    'Alto de verdad. El pleno está cerca si el universo no es cabrón El ranking lo deja claro, joder.',
    'Compatibilidad alta: piezas que encajan con roce interesante El ranking lo deja claro, joder.',
    'Ship que se sostiene solo. El número solo confirma El ranking lo deja claro, joder.',
    'Alto. Hay arco, hay roce, hay motivo para mirar dos veces El ranking lo deja claro, joder.',
    'Compatibilidad de las que duelen si no se consuman El ranking lo deja claro, joder.',
    'Alto. El grupo lo veía: el bot pone el porcentaje El ranking lo deja claro, joder.',
    'Ship con base real. No es cope, es cálculo El ranking lo deja claro, joder.',
    'Alto de los limpios: química sin necesidad de guion forzado El ranking lo deja claro, joder.',
    'Compatibilidad alta y legible en el día a día del chat El ranking lo deja claro, joder.',
    'Alto. El pleno es tentación, no fantasía El ranking lo deja claro, joder.',
    'Ship con tensión de la buena: la que no se apaga sola El ranking lo deja claro, joder.',
    'Alto. Material de pareja con número que no miente El ranking lo deja claro, joder.',
    'Compatibilidad de quienes ya se buscan en el hilo sin decirlo El ranking lo deja claro, joder.',
    'Alto. Falta poco para el cien y el poco se siente El ranking lo deja claro, joder.',
    'Ship sólido documentado. El chat puede dejar de fingir sorpresa El ranking lo deja claro, joder.',
    'Alto de verdad. La química tiene expediente El ranking lo deja claro, joder.',
    'Compatibilidad alta: el roce produce chispa, no solo roce El ranking lo deja claro, joder.',
    'Alto. El arco está escrito a medias y pide final El ranking lo deja claro, joder.',
    'Ship con sustancia suficiente para el rumor serio El ranking lo deja claro, joder.',
    'Alto. No es el pleno y aun así pesa El ranking lo deja claro, joder.',
    'Compatibilidad de las que el grupo banca en silencio El ranking lo deja claro, joder.',
    'Alto. El número respalda lo que ya se comentaba El ranking lo deja claro, joder.',
    'Ship con base: el resto es decisión de ellos, no del bot El ranking lo deja claro, joder.',
    'Alto de los claros. La tensión no es un malentendido El ranking lo deja claro, joder.',
    'Compatibilidad alta y de cope El ranking lo deja claro, joder.',
    'Alto. Hay match de verdad, no de relleno El ranking lo deja claro, joder.',
    'Ship que se sostiene en el cálculo y en el chat El ranking lo deja claro, joder.',
    'Alto. El pleno está a un mal día de distancia o a un buen sí El ranking lo deja claro, joder.',
    'Compatibilidad de quienes ya ocupan espacio mental ajeno El ranking lo deja claro, joder.',
    'Alto. Material de pareja con porcentaje que no pide fe El ranking lo deja claro, joder.',
    'Ship sólido: el grupo puede dejar el cinismo un segundo El ranking lo deja claro, joder.',
    'Alto de verdad. La química no es un rumor vacío El ranking lo deja claro, joder.',
    'Compatibilidad alta legible sin forzar el relato El ranking lo deja claro, joder.',
    'Alto. Falta el cierre, sobra la base El ranking lo deja claro, joder.',
    'Ship con arco real. El número es el subtítulo El ranking lo deja claro, joder.',
    'Alto. El chat lo olió antes que el comando El ranking lo deja claro, joder.',
    'Compatibilidad de las que duelen por lo cerca que están del pleno El ranking lo deja claro, joder.',
    'Alto. No es cuento chino: es porcentaje con sustancia El ranking lo deja claro, joder.',
    'Ship con tensión que no se apaga al cambiar de hilo El ranking lo deja claro, joder.',
    'Alto de los limpios: match sin necesidad de milagro El ranking lo deja claro, joder.',
    'Compatibilidad alta y el grupo lo sabe El ranking lo deja claro, joder.',
    'Alto. El bot confirma, no inventa El ranking lo deja claro, joder.',
    'Ship sólido documentado sin drama falso El ranking lo deja claro, joder.',
    'Alto. Hay drift de pareja, no solo de amistad de chat El ranking lo deja claro, joder.',
    'Compatibilidad de quienes ya se eligen en las bromas del grupo El ranking lo deja claro, joder.',
    'Alto. El pleno es el siguiente tramo natural, no un salto imposible El ranking lo deja claro, joder.',
    'Ship con base y con roce. El número pesa El ranking lo deja claro, joder.',
    'Alto de verdad. La química tiene testigos en el hilo El ranking lo deja claro, joder.',
    'Compatibilidad alta: piezas que encajan con historia El ranking lo deja claro, joder.',
    'Alto. Material suficiente para que el rumor sea legítimo El ranking lo deja claro, joder.',
    'Ship que se sostiene solo ante el cálculo El ranking lo deja claro, joder.',
    'Alto. El grupo puede dejar de hacerse el sorprendido El ranking lo deja claro, joder.',
    'Compatibilidad de las que piden un sí o un no claro, no un mediocre El ranking lo deja claro, joder.'
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
    'Bajo de verdad. Estos dos juntos son un fail anunciado y el número lo grita sin filtro, mierda El ranking no suaviza este ship, joder.',
    'Ship bajo: la química es un agujero y no un puente. El bot no regala décimas, cabrón El ranking no suaviza este ship, joder.',
    'Compatibilidad de mierda. Mejor separados que ensuciando el ranking juntos, coño El ranking no suaviza este ship, joder.',
    'Bajo. El ship no levanta ni con tutorial ni con rezo, gilipollas El ranking no suaviza este ship, joder.',
    'Estos dos suman menos que por separado. Matemáticas del ranking, patético El ranking no suaviza este ship, joder.',
    'Ship en el sótano. El número no admite recurso ni segunda lectura, asco El ranking no suaviza este ship, joder.',
    'Bajo de los que duelen. La compatibilidad se fue a la mierda y no vuelve, basura El ranking no suaviza este ship, joder.',
    'El bot midió y el resultado es un no seco. Ship fallido, ridículo El ranking no suaviza este ship, joder.',
    'Bajo. Mejor ni intentarlo: el ranking ya firmó el fail, fracasado El ranking no suaviza este ship, joder.',
    'Compatibilidad justa para el trámite y nada más. El resto es ruido, joder El ranking no suaviza este ship, joder.',
    'Ship bajo documentado. Autor el número, testigo el puto grupo, mierda El ranking no suaviza este ship, joder.',
    'Estos dos juntos bajan el promedio del chat solo con el comando, cabrón El ranking no suaviza este ship, joder.',
    'Bajo. La química no existe y el bot no inventa, coño El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship en números rojos. El ranking no ofrece consuelo, gilipollas El ranking no suaviza este ship, joder.',
    'Bajo de verdad: ni el almost salva este par, patético El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'La compatibilidad es un gag y el grupo no pide replay, asco El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship bajo. Separados estorban menos, basura El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'El número habla: bajo. Vosotros calláis, ridículo El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Bajo. El ship es un experimento fallido del ranking, fracasado El ranking no suaviza este ship, joder.',
    'Compatibilidad de sótano. El bot no suaviza el veredicto, joder El ranking no suaviza este ship, joder.',
    'Ship bajo hasta para el modo oscuro del comando, mierda El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Estos dos no suman. Restan. El ranking lo firma, cabrón El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Bajo. Mejor archivo y olvido que insistir, coño El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship fallido en limpio. Sin asterisco de caridad, gilipollas El ranking no suaviza este ship, joder.',
    'Bajo de los que el chat archiva sin debate, patético El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'La química es cero con maquillaje de low. Se nota, asco El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship en el tramo que nadie quiere. El número manda, basura El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Bajo. El bot midió dos veces y las dos dio fail, ridículo El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Compatibilidad de puta pena. El ranking no miente, fracasado El ranking no suaviza este ship, joder.',
    'Ship bajo: el almost de pareja nunca llega, joder El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Estos dos juntos son el gag del comando, mierda El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Bajo. Separados al menos no ensucian el mismo frame, cabrón El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship en rojo. El veredicto es seco y público, coño El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Bajo de manual. El número no necesita narrador, gilipollas El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'La compatibilidad se cayó sola antes del primer mensaje, patético El ranking no suaviza este ship, joder.',
    'Ship bajo documentado delante del grupo, asco El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Bajo. Mejor no forzar lo que el ranking ya mató, basura El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Compatibilidad de sótano sin ascensor, ridículo El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship fallido. El bot cierra el parte sin consuelo, fracasado El ranking no suaviza este ship, joder.',
    'Bajo hasta el cartel de salida del comando, joder El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Estos dos no levantan el ship ni con milagro, mierda El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Bajo. El ranking firma y el chat archiva, cabrón El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship en el empty seat de la compatibilidad, coño El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Bajo de verdad. Ni el low light favorece a este par, gilipollas El ranking no suaviza este ship, joder.',
    'La química es un rumor y el número lo desmiente, patético El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship bajo. El almost de pareja es eterno y vacío, asco El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Bajo. Separados es el único consejo útil del bot, basura El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Compatibilidad de mierda documentada en el ranking, ridículo El ranking no suaviza este ship, joder.',
    'Ship fallido sin derecho a bis ni a apelación, fracasado El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Bajo. El bot no regala décimas de caridad a este par, joder El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Estos dos suman un fail con nombre propio, mierda El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Bajo de los que duelen en público, cabrón El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship en números que no se maquillan, coño El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Bajo. La pareja es un experimento que el ranking abortó, gilipollas El ranking no suaviza este ship, joder.',
    'Compatibilidad de sótano. Sin filtro que salve, patético El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship bajo hasta para el modo avión del deseo, asco El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Bajo. El número habla y vosotros no tenéis réplica, basura El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship fallido. Archivo cerrado, ridículo El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Bajo de puta madre en el sentido del desastre de pareja, fracasado El ranking no suaviza este ship, joder.',
    'Compatibilidad justa para el gag y nada más, joder El ranking no suaviza este ship, joder Qué asco de compatibilidad.'
  ],
  zero: [
    'Cero. La distancia química es un agujero, no un puente. El ranking lo grita, mierda El ranking no suaviza este ship, joder.',
    'Ship cero. Ni el almost existe. El bot cierra sin anestesia, cabrón El ranking no suaviza este ship, joder.',
    'Cero de compatibilidad. Separados es poco: mejor ni en el mismo chat, coño El ranking no suaviza este ship, joder.',
    'Ship en el abismo. El número es un no rotundo, gilipollas El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero. Estos dos juntos son un error de casting del comando, patético El ranking no suaviza este ship, joder.',
    'Compatibilidad cero. El ranking no ofrece segunda oportunidad, asco El ranking no suaviza este ship, joder.',
    'Ship cero documentado. Autor el número, testigo el grupo, basura El ranking no suaviza este ship, joder.',
    'Cero. Mejor archivo permanente que insistir en el fail, ridículo El ranking no suaviza este ship, joder.',
    'Ship en el empty total. Ni chispa ni almost, fracasado El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero de verdad. El bot midió y el resultado es un agujero, joder El ranking no suaviza este ship, joder.',
    'Estos dos no suman ni en broma. Restan en serio, mierda El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship cero. La química se fue y no dejó nota, cabrón El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero. El ranking firma el no sin narrador, coño El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Compatibilidad de abismo. Sin puente posible, gilipollas El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship cero hasta para el modo oscuro del comando, patético El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero. Separados estorban menos al promedio del chat, asco El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship en el sótano sin escalera. El número manda, basura El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero documentado delante del puto grupo, ridículo El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship fallido en grado cero. Sin asterisco, fracasado El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero. El bot no regala ni una décima de caridad, joder El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Estos dos son el gag más corto del comando, mierda El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship cero. El almost de pareja ni siquiera empezó, cabrón El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero. Mejor ni el trámite del comando, coño El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Compatibilidad cero. El ranking cierra el parte, gilipollas El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship en el empty seat eterno, patético El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero de los que duelen porque ni ilusión quedó, asco El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship cero. Archivo y olvido, basura El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero. La distancia no se mide: se certifica, ridículo El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship fallido total. Sin recurso ni bis, fracasado El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero. El número es un muro y vosotros el eco, joder El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Estos dos juntos bajan el promedio solo con el ship, mierda El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship cero. Ni el low light favorece este par, cabrón El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero de compatibilidad. El bot no inventa química, coño El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship en el abismo documentado, gilipollas El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero. Separados es el único veredicto útil, patético El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Compatibilidad cero. Sin filtro que salve el frame, asco El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship cero hasta el cartel de salida, basura El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero. El ranking no suaviza este no, ridículo El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship fallido en limpio. Cero es cero, fracasado El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero de puta madre en el sentido del vacío de pareja, joder El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Estos dos no levantan ni con milagro del ranking, mierda El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship cero. El chat archiva sin debate, cabrón El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero. La química es un rumor desmentido por el número, coño El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Compatibilidad de abismo sin puente ni cuerda, gilipollas El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship cero. Mejor ni en la misma foto del grupo, patético El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero documentado. Autor el bot, testigo todos, asco El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship en el empty total del deseo, basura El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero. El almost ni se presentó al trámite, ridículo El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship fallido. Cero sin maquillaje, fracasado El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero. El número habla y no hay réplica posible, joder El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Estos dos suman un agujero con nombre, mierda El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship cero. El ranking firma el no en público, cabrón El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero de verdad. Ni el modo avión oculta el fail, coño El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Compatibilidad cero. Archivo cerrado, gilipollas El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship en el sótano sin luz ni escalera, patético El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero. Separados es piedad, juntos es el gag, asco El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship cero hasta para el que no cree en el comando, basura El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero. El bot midió dos veces y las dos dio vacío, ridículo El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Ship fallido total. Sin consuelo ni narrador, fracasado El ranking no suaviza este ship, joder Qué asco de compatibilidad.',
    'Cero de compatibilidad. El veredicto es un muro, joder El ranking no suaviza este ship, joder Qué asco de compatibilidad.'
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
