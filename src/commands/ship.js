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
    'Alto. Hay drift, hay tensión, hay material de ship que el grupo ya olió.',
    'Compatibilidad alta. No es pleno, pero el arco se ve sin forzar y el número se basta solo en el ranking.',
    'Alto de los que ilusionan con razón: la química está y se nota y el número se basta solo en el ranking.',
    'Ship sólido. Falta un empujón para el pleno, sobra base y el número se basta solo en el ranking.',
    'Compatibilidad de las que el chat comenta en serio y el número se basta solo en el ranking.',
    'Alto. No es cuento: el cálculo respalda el runoreo del grupo y el número se basta solo en el ranking.',
    'Ship con sustancia. La tensión no es invento del comando y el número se basta solo en el ranking.',
    'Alto de verdad. El pleno está cerca si el universo no es cabrón y el número se basta solo en el ranking.',
    'Compatibilidad alta: piezas que encajan con roce interesante y el número se basta solo en el ranking.',
    'Ship que se sostiene solo. El número solo confirma y el número se basta solo en el ranking.',
    'Alto. Hay arco, hay roce, hay motivo para mirar dos veces y el número se basta solo en el ranking.',
    'Compatibilidad de las que duelen si no se consuman y el número se basta solo en el ranking.',
    'Alto. El grupo lo veía: el bot pone el porcentaje y el número se basta solo en el ranking.',
    'Ship con base real. No es cope, es cálculo y el número se basta solo en el ranking.',
    'Alto de los limpios: química sin necesidad de guion forzado y el número se basta solo en el ranking.',
    'Compatibilidad alta y legible en el día a día del chat y el número se basta solo en el ranking.',
    'Alto. El pleno es tentación, no fantasía y el número se basta solo en el ranking.',
    'Ship con tensión de la buena: la que no se apaga sola y el número se basta solo en el ranking.',
    'Alto. Material de pareja con número que no miente y el número se basta solo en el ranking.',
    'Compatibilidad de quienes ya se buscan en el hilo sin decirlo y el número se basta solo en el ranking.',
    'Alto. Falta poco para el cien y el poco se siente y el número se basta solo en el ranking.',
    'Ship sólido documentado. El chat puede dejar de fingir sorpresa.',
    'Alto de verdad. La química tiene expediente y el número se basta solo en el ranking.',
    'Compatibilidad alta: el roce produce chispa, no solo roce y el número se basta solo en el ranking.',
    'Alto. El arco está escrito a medias y pide final y el número se basta solo en el ranking.',
    'Ship con sustancia suficiente para el rumor serio y el número se basta solo en el ranking.',
    'Alto. No es el pleno y aun así pesa y el número se basta solo en el ranking.',
    'Compatibilidad de las que el grupo banca en silencio y el número se basta solo en el ranking.',
    'Alto. El número respalda lo que ya se comentaba y el número se basta solo en el ranking.',
    'Ship con base: el resto es decisión de ellos, no del bot y el número se basta solo en el ranking.',
    'Alto de los claros. La tensión no es un malentendido y el número se basta solo en el ranking.',
    'Compatibilidad alta y de cope y el número se basta solo en el ranking.',
    'Alto. Hay match de verdad, no de relleno y el número se basta solo en el ranking.',
    'Ship que se sostiene en el cálculo y en el chat y el número se basta solo en el ranking.',
    'Alto. El pleno está a un mal día de distancia o a un buen sí y el número se basta solo en el ranking.',
    'Compatibilidad de quienes ya ocupan espacio mental ajeno y el número se basta solo en el ranking.',
    'Alto. Material de pareja con porcentaje que no pide fe y el número se basta solo en el ranking.',
    'Ship sólido: el grupo puede dejar el cinismo un segundo y el número se basta solo en el ranking.',
    'Alto de verdad. La química no es un rumor vacío y el número se basta solo en el ranking.',
    'Compatibilidad alta legible sin forzar el relato y el número se basta solo en el ranking.',
    'Alto. Falta el cierre, sobra la base y el número se basta solo en el ranking.',
    'Ship con arco real. El número es el subtítulo y el número se basta solo en el ranking.',
    'Alto. El chat lo olió antes que el comando y el número se basta solo en el ranking.',
    'Compatibilidad de las que duelen por lo cerca que están del pleno.',
    'Alto. No es cuento chino: es porcentaje con sustancia y el número se basta solo en el ranking.',
    'Ship con tensión que no se apaga al cambiar de hilo y el número se basta solo en el ranking.',
    'Alto de los limpios: match sin necesidad de milagro y el número se basta solo en el ranking.',
    'Compatibilidad alta y el grupo lo sabe y el número se basta solo en el ranking.',
    'Alto. El bot confirma, no inventa y el número se basta solo en el ranking.',
    'Ship sólido documentado sin drama falso y el número se basta solo en el ranking.',
    'Alto. Hay drift de pareja, no solo de amistad de chat y el número se basta solo en el ranking.',
    'Compatibilidad de quienes ya se eligen en las bromas del grupo y el número se basta solo en el ranking.',
    'Alto. El pleno es el siguiente tramo natural, no un salto imposible y el número se basta solo en el ranking.',
    'Ship con base y con roce. El número pesa y el número se basta solo en el ranking.',
    'Alto de verdad. La química tiene testigos en el hilo y el número se basta solo en el ranking.',
    'Compatibilidad alta: piezas que encajan con historia y el número se basta solo en el ranking.',
    'Alto. Material suficiente para que el rumor sea legítimo y el número se basta solo en el ranking.',
    'Ship que se sostiene solo ante el cálculo y el número se basta solo en el ranking.',
    'Alto. El grupo puede dejar de hacerse el sorprendido y el número se basta solo en el ranking.',
    'Compatibilidad de las que piden un sí o un no claro, no un mediocre.'
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
    'Bajo. Hay menos química aquí que en un vaso de agua del grifo y el número se basta solo en el ranking.',
    'Compatibilidad floja. Se aguantan en el mismo chat y poco más y el número se basta solo en el ranking.',
    'Bajo de verdad. El ship cojea y no es de gracia y el número se basta solo en el ranking.',
    'Poca cosa. Ni chispa ni drama interesante: solo el número bajo y el número se basta solo en el ranking.',
    'Compatibilidad justa para no ser cero, insuficiente para ilusionar a nadie.',
    'Bajo. El grupo no ve pareja: ve dos nicks que coinciden en el hilo.',
    'Ship flojo. La química pidió la baja médica y el número se basta solo en el ranking.',
    'Bajo de los que duelen de lo previsible: no hay match y se nota y el número se basta solo en el ranking.',
    'Compatibilidad tibia hacia abajo. El termómetro bosteza y el número se basta solo en el ranking.',
    'Bajo. Ni el alcohol cósmico arregla este cálculo y el número se basta solo en el ranking.',
    'Poca química. El comando no necesita adorno para el no casi total y el número se basta solo en el ranking.',
    'Ship en zona de peligro de aburrimiento: bajo y sin arco y el número se basta solo en el ranking.',
    'Bajo. Se toleran: eso no es un match, es civismo mínimo y el número se basta solo en el ranking.',
    'Compatibilidad de quien comparte grupo y nada más y el número se basta solo en el ranking.',
    'Bajo de solemnidad: el romance no vive aquí y el número se basta solo en el ranking.',
    'Ship flojo documentado. El chat no discute el número y el número se basta solo en el ranking.',
    'Bajo. La chispa se mojó antes de acercarse y el número se basta solo en el ranking.',
    'Compatibilidad escasa: el puente es un tablón roto y el número se basta solo en el ranking.',
    'Bajo. Mejor amigos de la distancia que pareja de este número y el número se basta solo en el ranking.',
    'Ship en el tramo que no ilusiona ni al más cope y el número se basta solo en el ranking.',
    'Bajo de verdad. El bot no regala décimas de caridad y el número se basta solo en el ranking.',
    'Compatibilidad justa para el trámite del comando y nada más y el número se basta solo en el ranking.',
    'Bajo. Dos trayectorias paralelas que no se tocan y el número se basta solo en el ranking.',
    'Ship flojo: el drama sería más interesante por separado y el número se basta solo en el ranking.',
    'Bajo. La química está de vacaciones indefinidas y el número se basta solo en el ranking.',
    'Compatibilidad tibia-fría. El jersey no calienta y el número se basta solo en el ranking.',
    'Bajo. El match existe solo porque el comando lo forzó a existir y el número se basta solo en el ranking.',
    'Ship en números que piden otro intento con otras personas y el número se basta solo en el ranking.',
    'Bajo. Ni tensión ni paz interesante: solo el bajo y el número se basta solo en el ranking.',
    'Compatibilidad de pasillo de grupo: se cruzan y ya y el número se basta solo en el ranking.',
    'Bajo de los claros. El grupo no necesitaba el porcentaje y el número se basta solo en el ranking.',
    'Ship flojo sin derecho a narración épica y el número se basta solo en el ranking.',
    'Bajo. La idea de pareja aquí es un malentendido del azar y el número se basta solo en el ranking.',
    'Compatibilidad escasa y se nota en el silencio del chat al ver el número.',
    'Bajo. Mejor no forzar lo que el cálculo ya enterró y el número se basta solo en el ranking.',
    'Ship en zona de no-recomendable según este bot y el número se basta solo en el ranking.',
    'Bajo. Química de archivo muerto y el número se basta solo en el ranking.',
    'Compatibilidad de quienes comparten wifi del grupo y nada del resto.',
    'Bajo. El romance pidió traslado y el número se basta solo en el ranking.',
    'Ship flojo: el número es el mensaje, el resto es cortesía y el número se basta solo en el ranking.',
    'Bajo de vergüenza ajena si alguien lo celebrara y el número se basta solo en el ranking.',
    'Compatibilidad justa para no ser cero: el consuelo más triste y el número se basta solo en el ranking.',
    'Bajo. Dos piezas que no son del mismo puzzle y el número se basta solo en el ranking.',
    'Ship en el tramo del bostezo colectivo y el número se basta solo en el ranking.',
    'Bajo. La chispa no solo no prende: no existe el yesquero y el número se basta solo en el ranking.',
    'Compatibilidad tibia hacia el sótano y el número se basta solo en el ranking.',
    'Bajo. El comando cumple el trámite; el corazón no y el número se basta solo en el ranking.',
    'Ship flojo sin arco, sin tensión, con número honesto y el número se basta solo en el ranking.',
    'Bajo de los que cierran el debate en una línea y el número se basta solo en el ranking.',
    'Compatibilidad de vecinos de hilo, no de pareja y el número se basta solo en el ranking.',
    'Bajo. El azar se arrepiente de haberlos puesto en la misma frase y el número se basta solo en el ranking.',
    'Ship en números que piden cambio de objetivo y el número se basta solo en el ranking.',
    'Bajo. Química ausente con disculpas del universo y el número se basta solo en el ranking.',
    'Compatibilidad escasa: el tablón del puente ya era de cartón y el número se basta solo en el ranking.',
    'Bajo. Mejor el no claro que el sí forzado y el número se basta solo en el ranking.',
    'Ship flojo documentado y el número se basta solo en el ranking.',
    'Bajo. El match es un malentendido estadístico y el número se basta solo en el ranking.',
    'Compatibilidad de quienes se soportan en silencio y poco más y el número se basta solo en el ranking.',
    'Bajo de verdad. Siguiente pareja, por favor y el número se basta solo en el ranking.',
    'Ship en el tramo donde el bot casi pone cero por redondeo y el número se basta solo en el ranking.'
  ],
  zero: [
    'Cero. Estos dos juntos son un accidente de calendario, no un ship y el número se basta solo en el ranking.',
    'Compatibilidad nula. Ni el algoritmo más borracho los juntaría en serio.',
    'Cero por cien. El universo se disculpa por haberlos puesto en el mismo chat.',
    'Ship imposible. Se repelen como imanes del mismo polo y encima con asco.',
    'Cero. Si acaban juntos es porque el infierno se quedó sin plazas individuales.',
    'Nula. No hay chispa, no hay drama útil, solo dos nicks que no deberían compartir frase.',
    'Cero absoluto. El bot casi se niega a calcularlo de lo evidente que es el no.',
    'Compatibilidad bajo tierra. Estos dos juntos bajan el promedio del concepto de pareja.',
    'Cero. Ni por descarte, ni por pena, ni por alcohol cósmico y el número se basta solo en el ranking.',
    'Ship cancelado antes de existir. El ranking de no-química tiene cabeza de cartel.',
    'Cero por cien. La química entre ellos es un rumor falso del chat y el número se basta solo en el ranking.',
    'Nula total. Juntarlos es insultar a la idea de match y el número se basta solo en el ranking.',
    'Cero. El grupo lo sabía: el comando solo pone el sello y el número se basta solo en el ranking.',
    'Compatibilidad inexistente. Dos trayectorias que no se cruzan ni por error.',
    'Cero. Si esto fuera un experimento, el laboratorio lo habría cerrado.',
    'Ship en números rojos de verdad: no hay margen de error que los salve.',
    'Cero por cien. El azar se niega a firmar esta combinación y el número se basta solo en el ranking.',
    'Nula. Ni el cope más optimista vende este match y el número se basta solo en el ranking.',
    'Cero. Estos dos juntos son ruido, no pareja y el número se basta solo en el ranking.',
    'Compatibilidad cero: el bot no suaviza el veredicto y el número se basta solo en el ranking.',
    'Cero. La distancia química es un agujero, no un puente y el número se basta solo en el ranking.',
    'Ship imposible documentado. Archivo cerrado y el número se basta solo en el ranking.',
    'Cero por cien. Ni por aburrimiento del universo y el número se basta solo en el ranking.',
    'Nula. El match más forzado del historial del comando y el número se basta solo en el ranking.',
    'Cero. Se miran y el aire entre ellos pide asilo en otro hilo y el número se basta solo en el ranking.',
    'Compatibilidad bajo cero. El termómetro no miente y el número se basta solo en el ranking.',
    'Cero. El ship naufragó antes de botarse y el número se basta solo en el ranking.',
    'Nula total. Dos piezas de puzzles distintos en cajas distintas y el número se basta solo en el ranking.',
    'Cero por cien. El grupo no necesita debate: necesita el número y el número se basta solo en el ranking.',
    'Ship cancelado. Cero. Siguiente pareja y el número se basta solo en el ranking.',
    'Cero. La química es un meme malo y ni siquiera da risa y el número se basta solo en el ranking.',
    'Compatibilidad inexistente con sello del bot y el número se basta solo en el ranking.',
    'Cero. Juntarlos es un error de casting del destino y el número se basta solo en el ranking.',
    'Nula. No hay arco, no hay tensión útil, solo el no y el número se basta solo en el ranking.',
    'Cero por cien. El cálculo fue cortesía; el resultado era obvio.',
    'Ship en el sótano del ranking de matches y el número se basta solo en el ranking.',
    'Cero. Estos dos no suman: restan al concepto de ship y el número se basta solo en el ranking.',
    'Compatibilidad nula: el chat respira aliviado con el número y el número se basta solo en el ranking.',
    'Cero. Ni el fanfic más desesperado los fuerza bien y el número se basta solo en el ranking.',
    'Nula. El no más limpio que ha escupido este comando y el número se basta solo en el ranking.',
    'Cero por cien. Química ausente, drama inútil, veredicto claro y el número se basta solo en el ranking.',
    'Ship imposible. El bot no ofrece recursos de apelación y el número se basta solo en el ranking.',
    'Cero. La pareja que no existe ni en el modo broma y el número se basta solo en el ranking.',
    'Compatibilidad bajo tierra con lápida incluida y el número se basta solo en el ranking.',
    'Cero. Dos nicks, cero motivo para la misma frase romántica y el número se basta solo en el ranking.',
    'Nula total. El universo pasó de esta combinación y el número se basta solo en el ranking.',
    'Cero por cien. No hay chispa: hay un extintor permanente y el número se basta solo en el ranking.',
    'Ship cancelado por falta de materia prima y el número se basta solo en el ranking.',
    'Cero. El match más vacío del archivo y el número se basta solo en el ranking.',
    'Compatibilidad cero: y sin debate y el número se basta solo en el ranking.',
    'Cero. Estos dos juntos son un typo del destino y el número se basta solo en el ranking.',
    'Nula. El ranking de no-ships tiene nuevo referente y el número se basta solo en el ranking.',
    'Cero por cien. El bot casi se disculpa por tener que decirlo y el número se basta solo en el ranking.',
    'Ship en números que dan vergüenza ajena al concepto de pareja y el número se basta solo en el ranking.',
    'Cero. Química nula, interés nulo, veredicto nulo de esperanza y el número se basta solo en el ranking.',
    'Compatibilidad inexistente: archivo y a otra cosa y el número se basta solo en el ranking.',
    'Cero. Ni por pena del grupo y el número se basta solo en el ranking.',
    'Nula. El no más rotundo del día y el número se basta solo en el ranking.',
    'Cero por cien. Siguiente y el número se basta solo en el ranking.',
    'Ship imposible. Cero. Punto final y el número se basta solo en el ranking.'
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
