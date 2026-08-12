const { shuffle, pickFresh } = require('../utils/helpers');
const { getSender, isMainOwner, isBotJid, bareJid, sameUser } = require('../utils/wa');

const VERDICTS = {
  perfect: [
    'Cien por cien. Dios los cría y ellos se juntan a arruinarse la vida mutuamente.',
    'Match perfecto. Nadie más los aguantaría, así que menos mal que se tienen el uno al otro.',
    'Compatibilidad total. Dos desastres que encajan tan bien que hasta da un poco de asco.',
    'El cien por cien no se toca. Estos dos se merecen entre ellos, y eso es lo más bonito y lo más cruel a la vez.',
    'Pleno. Si no acaban juntos es porque el universo tiene sentido del humor y quiere verlos sufrir.',
    'Match absoluto. Se van a hacer muchísimo daño y les va a encantar cada minuto.',
    'Cien. Ninguno de los dos va a encontrar nada mejor, y en el fondo los dos lo saben.',
    'Compatibilidad perfecta. Dos taras que se cancelan entre sí. La ciencia no lo explica, el grupo sí.',
    'El match del año. Juntos son insoportables, separados son peores. Elegid vosotros.',
    'Cien por cien. Esto no es química, esto es que a nadie más le interesa ninguno de los dos.',
    'Match total. Se merecen tanto que casi parece una condena en vez de un premio.',
    'Pleno absoluto. Que se junten ya y nos dejen en paz al resto del grupo.',
    'Cien. Dos personas hechas la una para la otra, principalmente porque el resto ya dijo que no.',
    'Compatibilidad máxima. Van a discutir todos los días y ninguno se va a ir nunca. Amor del bueno.',
    'Match perfecto. El grupo entero lo veía venir menos ellos dos, que son idiotas.',
    'Cien por cien. Si esto no acaba en boda acaba en denuncia, pero acaba en algo.',
    'Pleno. Nadie ha dado nunca este número en este grupo. Tomad nota y haceos cargo.',
    'Match del cien. Dos piezas rotas que encajan justo por donde están rotas. Poético y triste.',
    'Compatibilidad total y sin discusión. Se van a querer mal, que es como se quiere de verdad.',
    'Cien. El destino no ha tenido nada que ver: simplemente nadie más quiso a ninguno de los dos.',
    'Match perfecto. Van a ser felices y va a ser insufrible de ver desde fuera.',
    'Pleno absoluto. Lo único que separa a estos dos es la vergüenza, y eso se pasa con dos copas.',
    'Cien por cien. Se lo merecen todo: lo bueno, lo malo y las broncas de madrugada.',
    'Match total. Dos personas con el mismo nivel exacto de desastre. Eso es más raro que el amor.',
    'Cien. Si un día lo dejan, el grupo va a tener que elegir bando y nadie quiere eso.',
    'Compatibilidad perfecta. Ninguno de los dos tiene nada mejor que hacer, y eso también es compatibilidad.',
    'Match del cien por cien. Que alguien les diga que se dejen de tonterías de una puta vez.',
    'Pleno. Están hechos el uno para el otro con la precisión de dos errores que se corrigen solos.',
    'Cien. Este número no lo da el bot por casualidad, lo da porque no hay alternativa para ninguno.',
    'Match perfecto. Dos que se entienden sin hablar, principalmente porque ninguno escucha nunca.',
    'Compatibilidad absoluta. Se van a arruinar mutuamente y va a ser un espectáculo precioso.',
    'Cien por cien. El grupo os hace de testigo, así que ya no hay marcha atrás posible.',
    'Pleno. Juntos suman una persona funcional. Por separado no llegan ni a media.',
    'Match total. Nadie discute esto. Ni ellos, y eso que discuten absolutamente todo.',
    'Cien. Dos desgracias con patas que decidieron caminar en la misma dirección. Enhorabuena.',
    'Compatibilidad perfecta. Da igual lo que digan: el marcador ha hablado y el marcador no negocia.',
    'Match del cien. Los que se odian así de bien acaban siempre en lo mismo. Todos lo hemos visto.',
    'Pleno absoluto. Si esto sale mal, sale mal a lo grande. Y si sale bien, también.',
    'Cien por cien. Es su última oportunidad y es mutua. Aprovechadla o callaos para siempre.',
    'Match perfecto. Que se besen ya y acabemos con esto antes de que el grupo se muera de vergüenza.',
    'Cien por cien. El bot ha hecho la cuenta tres veces por si se había equivocado y no: esto es de las que salen una vez cada diez años.',
    'Match total. Se han encontrado dos personas igual de insoportables y por eso mismo funciona: nadie más las habría aguantado.',
    'Compatibilidad absoluta. Lo raro no es que encajen, lo raro es que hayan tardado tanto en darse cuenta con el grupo entero mirando.',
    'Perfecto. Esto no es química, es destino con muy mal gusto y muchísima insistencia.',
    'Redondo. El bot no reparte cien por cien todos los días, así que aprovechad antes de que uno de los dos lo estropee.',
    'Cien. Dos piezas rotas que resulta que estaban rotas por el mismo sitio. Encajan de milagro y encajan bien.',
    'Match de los que se cuentan en las bodas. Y lo mejor es que ninguno de los dos lo vio venir hasta este mensaje.',
    'Perfecto y ligeramente preocupante. Cuando dos personas encajan tanto, el resto del grupo sobra un poco.',
    'Cien por cien. El bot lleva meses viendo esto venir y por fin tiene una excusa para decirlo en voz alta.',
    'Compatibilidad máxima. No hay nada que analizar: se ha juntado lo que tenía que juntarse y punto.',
    'Match perfecto. Uno pone el caos y el otro pone la paciencia, que es exactamente como funcionan las cosas que duran.',
    'Cien. Si esto no acaba en algo, el problema ya no son los números: sois vosotros dos y vuestra cobardía.',
    'Total. El bot no encuentra ni un solo motivo para que esto falle, y mira que ha buscado con ganas.',
    'Perfecto. Dos personas que se entienden sin hablar, que en este grupo es prácticamente un superpoder.',
    'Cien por cien y con el grupo de testigo. A partir de ahora ya no se puede fingir que no pasa nada.',
    'Match absoluto. Es de esas parejas que dan rabia porque funcionan sin esfuerzo mientras el resto lo intenta y falla.',
    'Redondo. El bot ha visto miles de combinaciones y esta es de las pocas que no le da nada de vergüenza anunciar.',
    'Cien. Lo tenían delante todo el tiempo y ha tenido que venir un bot a decírselo. Patético y precioso a partes iguales.',
    'Perfecto. Si alguno lo estropea ahora, que sepa que el grupo entero tiene este mensaje guardado.',
    'Compatibilidad total. Dos desastres que juntos, por algún motivo que escapa a la ciencia, funcionan.',
  ],
  high: [
    'Alto. Hay tensión, hay miradas y hay dos cobardes que llevan meses sin decir nada.',
    'Muy compatibles. Todo el grupo lo ve menos ellos, que están en su propia película.',
    'Números altos. Esto va a pasar, la única duda es cuánto ridículo hay que ver antes.',
    'Compatibilidad alta. Se ríen de las mismas chorradas, que es más de lo que tiene mucha pareja.',
    'Alto y con margen. Solo falta que uno de los dos deje de hacerse el interesante.',
    'Buen match. Se aguantan las manías, que a estas alturas es lo único que importa de verdad.',
    'Nota alta. Aquí hay algo y los dos lo saben. Lo que no saben es qué hacer con ello.',
    'Compatibles de sobra. El problema no es la química, el problema es el orgullo de ambos.',
    'Alto. Podrían funcionar perfectamente si alguno tuviera un mínimo de valor.',
    'Buena puntuación. Se buscan en el chat con una sutileza que no engaña absolutamente a nadie.',
    'Alto. Dos personas que se caen bien de verdad, cosa rarísima en este grupo de desgraciados.',
    'Compatibilidad alta. Si esto no arranca es por vergüenza, no por falta de material.',
    'Números buenos. Encajan en casi todo y chocan justo en lo divertido. Combinación peligrosa.',
    'Alto. El grupo lleva tiempo apostando por esto y el grupo rara vez se equivoca.',
    'Buen match. Ninguno de los dos es un premio, pero juntos suben bastante de categoría.',
    'Compatibles. Se pican todo el día y ninguno se cansa. Eso tiene un nombre y todos lo sabemos.',
    'Alta compatibilidad. Falta el empujón, y el empujón no lo va a dar ninguno de los dos.',
    'Nota alta. Aquí hay futuro, siempre que alguno aprenda a callarse a tiempo.',
    'Alto. Se soportan las tonterías mutuamente, que es exactamente en lo que consiste todo esto.',
    'Buena química. Lo raro sería que no acabaran hablando por privado esta misma noche.',
    'Compatibilidad alta. Dos que se entienden a medias palabras y a insultos completos.',
    'Alto. No es amor todavía, pero es lo que hay justo antes del amor. Y huele igual.',
    'Buen número. Ninguno lo va a admitir en público y los dos lo van a leer tres veces.',
    'Alta. Se llevan tan bien que da rabia. Y esa rabia es de los demás, no suya.',
    'Compatibles de verdad. Si lo estropean, va a ser por hablar de más, no por sentir de menos.',
    'Nota alta. El grupo ya os ha emparejado, así que ahorraos el numerito de negarlo.',
    'Alto. Dos personalidades que se aguantan sin esfuerzo. Eso vale más que cualquier flechazo.',
    'Buena compatibilidad. Se nota que se buscan, y se nota también que ninguno lo va a reconocer.',
    'Alto. Aquí hay tema. Poco tema, pero del bueno, y eso en este grupo escasea.',
    'Compatibilidad alta. Que alguno mueva ficha antes de que se les pase el arroz del todo.',
    'Números altos. Se ríen juntos y se callan juntos, que es la prueba definitiva.',
    'Alto. Ninguno de los dos está sobrado de opciones, y encima aquí hay química real.',
    'Buen match. Los que empiezan así acaban discutiendo por el mando de la tele. Suerte.',
    'Alta. La tensión se corta con un cuchillo y el grupo ya está harto de ser el testigo.',
    'Compatibles. Falta poco, muy poco. Y ese poco lleva meses siendo exactamente el mismo poco.',
    'Alto. Se conocen los defectos y siguen ahí. Eso ya no es casualidad, es elección.',
    'Buena nota. Si esto sale, el grupo se lleva el mérito. Si sale mal, no conocemos a ninguno.',
    'Alta compatibilidad. Dos que se hacen reír. Con eso se llega más lejos que con cualquier otra cosa.',
    'Alto. Esto va a acabar bien o va a acabar en un drama de los buenos. No hay término medio.',
    'Buen número. Ninguno es perfecto, pero juntos tapan bastante bien lo que le falta al otro.',
    'Alto. Hay algo ahí y lo sabe todo el grupo menos ellos dos, que siguen fingiendo muy mal.',
    'Muy compatible. Le falta poco: solo que uno de los dos tenga el valor de escribir primero.',
    'Números buenos. Esto lleva meses cociéndose a fuego lento y ya empieza a oler desde fuera.',
    'Alto. No es un match perfecto, pero es de los que mejoran con el tiempo si nadie lo arruina antes.',
    'Compatibilidad alta. La tensión es tan evidente que el bot se ha sentido incómodo calculándola.',
    'Bien. Muy bien. Tan bien que resulta raro que a estas alturas siga sin pasar nada entre ellos.',
    'Alto. Aquí hay material, lo que falta es alguien con iniciativa y de eso este grupo anda escaso.',
    'Muy compatibles. Se ríen de las mismas cosas, que es un porcentaje enorme de lo que hace falta.',
    'Números altos. Esto no es casualidad: llevan tiempo dándose la razón el uno al otro en público.',
    'Alto. El grupo ya hace apuestas y las apuestas van todas en la misma dirección.',
    'Compatibilidad alta y creciente. Cada semana que pasa el bot lo ve más claro y ellos menos.',
    'Bien alto. Falta un empujón, y el bot acaba de darlo delante de todo el mundo.',
    'Alto. Se buscan en las conversaciones sin darse cuenta, que es la señal más obvia que existe.',
    'Muy compatible. No es amor todavía, pero es de eso que se convierte en amor si nadie lo estropea.',
    'Números altos. Cuando uno escribe, el otro contesta en menos de un minuto. El bot lleva la cuenta.',
    'Alto. Esto tiene futuro y todo el grupo lo sabe, incluidos los dos que van a negarlo ahora mismo.',
    'Compatibilidad alta. Ya se protegen mutuamente en las discusiones, que es la fase previa a todo lo demás.',
    'Bien. Aquí hay tema, y el que diga que no es porque no ha leído el grupo con atención.',
    'Alto. Le sobra química y le falta valentía, que es el problema más común y más tonto de todos.',
    'Muy compatibles. El bot les daría un empujón, pero ya lo ha hecho publicando esto.',
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
    'Bajo. Esto no va a salir bien ni forzándolo, y forzarlo sería aún peor.',
    'Números malos. Se aguantarían tres días y el cuarto acabaría en bloqueo mutuo.',
    'Compatibilidad baja. Dos personas que no tienen absolutamente nada en común salvo este grupo.',
    'Bajo. Si esto llegara a pasar, el grupo tendría que intervenir por seguridad de ambos.',
    'Mala nota. Juntos serían el peor plan de los dos, y viendo el historial de ambos por separado, eso ya es un logro difícil.',
    'Bajo. Uno de los dos saldría escaldado y el otro ni se enteraría. Clásico.',
    'Compatibilidad pobre. Ni de broma. Y lo mejor es que ninguno se lo estaba planteando.',
    'Números bajos. Esto no es química, esto es un accidente esperando a no ocurrir.',
    'Bajo. Se caen regular y el marcador solo ha puesto números a lo que ya se notaba.',
    'Mal match. Dos formas distintas de ser insoportable no se suman, se multiplican.',
    'Bajo. Si alguien los emparejara en serio, sería por hacerles daño a los dos a la vez.',
    'Compatibilidad mala. Ni con alcohol, ni con años, ni con desesperación. No.',
    'Números feos. Lo único que comparten es el grupo, y a veces ni eso está claro.',
    'Bajo. Esto duraría lo que dura la primera discusión, o sea muy poquito.',
    'Mala compatibilidad. El bot ha hecho los cálculos dos veces por si acaso. Sale igual.',
    'Bajo. Cada uno por su lado es soportable. Juntos serían un problema para todo el grupo.',
    'Números malos. Aquí no hay tensión, hay incompatibilidad de manual y bien documentada.',
    'Bajo. Ninguno de los dos ha pensado nunca en el otro, y el marcador lo confirma.',
    'Mal match. Se llevarían fatal y encima tardarían meses en admitirlo. Lo peor de ambos mundos.',
    'Compatibilidad baja. Esto no arranca ni empujándolo cuesta abajo con el freno quitado.',
    'Bajo. Dos personas que estarían mejor en grupos distintos, no ya en la misma pareja.',
    'Números pobres. El único escenario donde esto funciona es uno que no existe.',
    'Bajo. Podría salir algo, sí. Algo malo, concretamente. Mejor lo dejamos.',
    'Mala nota. Ni siquiera dan para un drama entretenido. Serían un drama aburrido.',
    'Compatibilidad baja. Se soportan en grupo y se evitarían en cualquier otra parte.',
    'Bajo. Este número existe para avisar, no para animar. Tomad nota los dos.',
    'Números malos. Uno de los dos ya está poniendo cara rara y con razón.',
    'Bajo. Aquí no hay nada que rascar, y el que rasque va a salir con astillas.',
    'Mal match. La distancia entre estos dos no la arregla ni el tiempo ni el aburrimiento.',
    'Compatibilidad mala. Ni como amigos van sobrados, así que imagínate el resto.',
    'Bajo. Esto sería un error de los que se cuentan años después con vergüenza.',
    'Números bajos. El grupo entero respira aliviado al ver este resultado.',
    'Bajo. Dos trenes que van en direcciones opuestas y encima con retraso.',
    'Mala compatibilidad. Lo intentarían por aburrimiento y lo dejarían por sentido común.',
    'Bajo. Ni el bot, que empareja lo que sea, se atreve a recomendar esto.',
    'Números feos. Hay parejas que no cuajan. Esta no cuajaría ni con pegamento industrial.',
    'Bajo. Se acabaría antes de empezar, y menos mal, porque el grupo no lo aguantaría.',
    'Mal match. Cada uno tiene sus cosas, y sus cosas son exactamente incompatibles.',
    'Compatibilidad baja. Esto es un no con números, que es la forma más educada de decirlo.',
    'Bajo. Que sigan cada uno por su camino y que el camino no se cruce mucho.',
    'Bajo. Esto no va a ninguna parte, y forzarlo solo alargaría la parte incómoda.',
    'Números malos. Se llevarían bien tres semanas y luego uno de los dos cambiaría de grupo.',
    'Bajo. El bot ha buscado un punto en común y ha encontrado que ambos escriben en español.',
    'Poca cosa. Aquí no hay chispa, hay dos personas educadas que se saludan y ya está.',
    'Bajo. La clase de pareja que discutiría por el aire acondicionado antes del primer mes.',
    'Números flojos. Compatibles en teoría, insoportables en cuanto pasan dos horas juntos.',
    'Bajo. El bot ha visto peores, pero no muchas, y las peores al menos eran divertidas.',
    'Poco. Esto funcionaría solo si ninguno de los dos hablara, que sería un problema aparte.',
    'Bajo. Hay más química entre un cargador y un enchufe, y eso al menos da corriente.',
    'Números malos. No es que se odien: es que les daría exactamente igual dejar de verse.',
    'Bajo. El bot recomienda encarecidamente que sigan siendo dos personas que comparten grupo.',
    'Poca compatibilidad. Se aburrirían el uno del otro antes de terminar la primera conversación.',
    'Bajo. Esto empieza mal, sigue peor y termina con alguien contándolo en el grupo.',
    'Números pobres. Ni el bot, que se inventa la mitad de lo que dice, puede maquillar esto.',
    'Bajo. Dos personas que en otra vida quizá, pero en esta claramente no.',
    'Poco. La compatibilidad es tan baja que el bot ha considerado no publicarla por pudor.',
    'Bajo. Aquí lo único compatible son los horarios de conexión, y por casualidad.',
    'Números malos. Esto sería una relación de esas que se explican con un "no sé qué pasó".',
    'Bajo. El bot lo ha intentado, ha buscado el ángulo bueno, y no lo hay.',
    'Poca cosa. Mejor amigos, y ni eso con mucho entusiasmo: de esos que se saludan por educación y se olvidan por costumbre.',
  ],
  zero: [
    'Cero. Ni el bot ni el universo ni nadie. Esto no existe y no va a existir jamás.',
    'Cero patatero. Dos desconocidos que comparten grupo y ni eso les une demasiado.',
    'Cero absoluto. No hay química, no hay tensión, no hay nada. Solo un vacío educado.',
    'Cero. El marcador ni se ha molestado en calcularlo. Se veía venir desde el principio.',
    'Cero. Ni odio ni amor: indiferencia pura, que es bastante más humillante que el odio.',
    'Cero. Si estos dos se cruzan por la calle no se reconocen ni haciendo un esfuerzo.',
    'Cero patatero. El grupo entero se ha quedado igual de frío que el resultado.',
    'Cero absoluto. Hay más química entre una piedra y un lunes que entre estos dos.',
    'Cero. Emparejarlos ha sido una pérdida de tiempo para todo el mundo, el bot incluido.',
    'Cero. Ni juntos, ni separados, ni en otra vida. Especialmente no en otra vida.',
    'Cero patatero. Ninguno de los dos sabría decir tres cosas del otro. Ni dos.',
    'Cero. Esto no es incompatibilidad, es que directamente no se han visto nunca.',
    'Cero absoluto. El resultado más triste que da este comando, y os lo habéis ganado.',
    'Cero. Poner estos dos nombres juntos ha sido lo más raro que ha pasado hoy aquí.',
    'Cero. No hay nada que analizar porque no hay nada: ni tensión, ni historia, ni un mal comentario entre los dos en todo este tiempo.',
    'Cero patatero. Dos personas que existen en el mismo grupo y en universos distintos.',
    'Cero. Ni forzándolo, ni de broma, ni en el peor momento de soledad de ninguno.',
    'Cero absoluto. Este ship ha nacido muerto y encima nadie va a ir al entierro.',
    'Cero. El bot ha buscado algo, lo que fuera, y ha vuelto con las manos vacías.',
    'Cero. La única conexión entre estos dos es que ambos leen este mensaje. Y poco más.',
    'Cero patatero. Ni un roce, ni una risa, ni una mirada. Nada de nada.',
    'Cero. Emparejar a estos dos es como sumar cero más cero: sale exactamente lo mismo.',
    'Cero absoluto. Que alguien pare este comando antes de que se haga más incómodo.',
    'Cero. Se han enterado de que existen el uno para el otro justo ahora, con este mensaje.',
    'Cero. Ni el algoritmo más optimista del mundo sacaría un punto de aquí.',
    'Cero patatero. El vacío entre estos dos tiene su propia gravedad y va arrastrando hacia dentro cualquier conversación que se acerque.',
    'Cero. No es que no funcione: es que no hay nada que pueda funcionar o dejar de hacerlo.',
    'Cero absoluto. Este número es el bot diciendo con educación que dejéis de hacer el tonto.',
    'Cero. Dos líneas paralelas, y encima en habitaciones distintas. Para que esto se cruzara habría que romper la geometría entera.',
    'Cero. Ni un uno por ciento de cortesía. El marcador ha sido brutalmente honesto.',
    'Cero patatero. Se habrán escrito menos veces que el bot con vosotros, y eso ya es decir.',
    'Cero. Todo lo que tienen en común cabe en esta frase y todavía sobra sitio.',
    'Cero absoluto. Ninguno de los dos va a comentar nada de esto, y hacen bien.',
    'Cero. El resultado es tan bajo que casi resulta ofensivo para los dos a la vez.',
    'Cero. Ni con presentación formal, ni con amigos en común, ni con años de terapia.',
    'Cero patatero. Este es el ship que se pone de ejemplo cuando se explica lo que es un cero.',
    'Cero. Ha salido más caro el comando que lo que valen estos dos juntos.',
    'Cero absoluto. Podéis seguir con vuestras vidas separadas, que es lo que ibais a hacer igual.',
    'Cero. Aquí no hay historia. Ni la hubo, ni la hay, ni se la espera.',
    'Cero. Y aun así, alguien ha escrito el comando. Esa es la única cosa interesante de todo esto.',
    'Cero. El bot ha calculado esto y ha salido un número tan bajo que ha tenido que redondear hacia arriba.',
    'Cero absoluto. Ni en broma, ni por aburrimiento, ni al final de una noche muy larga.',
    'Nada. Esto no es incompatibilidad, es que pertenecen a especies emocionales distintas.',
    'Cero. Juntar a estos dos es como mezclar agua y aceite, pero con menos química y más incomodidad.',
    'Cero patatero. El bot pide disculpas al grupo por haber generado siquiera esta imagen mental.',
    'Nada de nada. Si esto pasara, sería el mayor error documentado en la historia del grupo.',
    'Cero. Se han visto en este grupo cientos de veces y ni uno de esos días pasó absolutamente nada.',
    'Cero absoluto. El bot ha comprobado el cálculo por si acaso y ha empeorado en la segunda pasada.',
    'Nada. Ni el destino, ni el alcohol, ni una apuesta perdida conseguirían esto.',
    'Cero. Esto es lo más parecido a una advertencia sanitaria que puede emitir un bot de WhatsApp.',
    'Cero patatero. Dos personas que podrían pasar una vida entera sin dirigirse la palabra y estarían bien.',
    'Nada. El bot ha considerado mentir para no hacer daño, y ni mintiendo le sale un número decente.',
    'Cero. Lo único que comparten es este grupo, y uno de los dos ya está pensando en salirse.',
    'Cero absoluto. Ni forzándolo, ni pagándolo, ni con el grupo entero empujando.',
    'Nada. Esto no es un match, es un accidente estadístico que el bot lamenta profundamente.',
    'Cero. La compatibilidad es tan baja que técnicamente cuenta como repulsión.',
    'Cero patatero. El bot recomienda que ni siquiera se sienten en el mismo lado de la mesa.',
    'Nada. Hay más futuro en cualquier otra combinación del grupo, incluidas las imposibles.',
    'Cero. Esto es lo que sale cuando el azar quiere gastar una broma pesada a dos personas inocentes.',
    'Cero absoluto. El bot da por terminado el análisis y sugiere no volver a intentarlo jamás.',
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
