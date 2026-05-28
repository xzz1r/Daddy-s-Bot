const { isOwner, isAdminInMeta, getTargetOrSelf } = require('../utils/wa');

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Distribuciones por tier:
//
//                    │ alto ≥70% │ medio 31-69% │ bajo ≤30%
//  ─────────────────┼───────────┼──────────────┼──────────
//  Negativo miembro │   70 %    │    20 %      │   10 %
//  Negativo admin   │   60 %    │    25 %      │   15 %
//  Negativo owner   │    2 %    │    8 %       │   90 %
//  Positivo miembro │   35 %    │    30 %      │   35 %
//  Positivo admin   │   45 %    │    30 %      │   25 %
//  Positivo owner   │   90 %    │    8 %       │    2 %
function rollPercent(goodIsHigh, senderIsAdmin, senderIsOwner) {
  const rand = Math.random();
  const hi = () => 70 + Math.floor(Math.random() * 31);
  const mid = () => 31 + Math.floor(Math.random() * 39);
  const lo = () => Math.floor(Math.random() * 31);

  if (!goodIsHigh) {
    if (senderIsOwner) {
      if (rand < 0.90) return lo();
      if (rand < 0.98) return mid();
      return hi();
    }
    if (senderIsAdmin) {
      if (rand < 0.60) return hi();
      if (rand < 0.85) return mid();
      return lo();
    }
    if (rand < 0.70) return hi();
    if (rand < 0.90) return mid();
    return lo();
  } else {
    if (senderIsOwner) {
      if (rand < 0.90) return hi();
      if (rand < 0.98) return mid();
      return lo();
    }
    if (senderIsAdmin) {
      if (rand < 0.45) return hi();
      if (rand < 0.75) return mid();
      return lo();
    }
    if (rand < 0.35) return hi();
    if (rand < 0.65) return mid();
    return lo();
  }
}

const LABELS = {

  // ===== POSITIVOS =====

  sexy: {
    name: 'sexy',
    goodIsHigh: true,
    high: [
      'Tienes una cara que para conversaciones a media frase y la gente ni se da cuenta de por que.',
      'La genetica contigo fue generosa en todos los frentes, y se nota sin que hagas nada.',
      'Cuando entras a un sitio hay quien pierde el hilo de lo que estaba diciendo.',
      'Tu fisico es de los que se recuerdan anos despues sin haber intercambiado una palabra.',
      'Tienes esa combinacion de cara y actitud que no se fabrica ni se compra con dinero.',
      'Vistes lo que sea y conviertes la ropa en moda sin proponertelo siquiera.',
      'La simetria de tu cara es de las que se estudian en libros y se ven poco en personas reales.',
      'Tu perfil malo supera el bueno de la mayoria de la gente de este grupo.',
      'Naciste con lo que otros buscan en cirugia y tratamientos toda su vida sin encontrarlo.',
      'La gente te mira y luego mira a sus parejas con una pregunta silenciosa incomoda.',
      'Tu atractivo no es ruidoso, simplemente esta ahi, y eso es lo mas peligroso que existe.',
      'Entras en cualquier sitio y el ambiente cambia sin que hagas nada ni lo busques.',
      'Tienes fotogenia natural, la que no se puede entrenar ni simular con edicion.',
      'Hay personas que se arreglan una hora para lo que tu tienes al levantarte sin esfuerzo.',
      'Tu cara tiene esa estructura que los artistas pagan por ver de cerca y no siempre encuentran.',
      'Eres exactamente el tipo de persona que arruina relaciones ajenas con solo aparecer.',
    ],
    mid: [
      'Correcto, ni feo ni guapo, exactamente en el rango mas incomodo de todos.',
      'Con buena luz y buena ropa puedes dar el pego, el resto del tiempo es otra historia.',
      'Tu fisico no es problema ni ventaja, esta en un empate tecnico sin gracia.',
      'Hay dias en los que estas bien y dias en los que mejor no salir a ningun lado.',
      'Tienes base pero no la trabajas, y por eso sigues aqui y no mas arriba.',
      'En el monton, exactamente donde nadie te va a recordar manyana por la manyana.',
      'Potencial desaprovechado por pura pereza, que es casi peor que no tenerlo.',
      'Tu fotogenia depende totalmente del filtro y del fotografo, y eso ya dice bastante.',
    ],
    low: [
      'La loteria genetica te ignoro completamente y se nota desde dos calles de distancia.',
      'La belleza que tienes esta muy dentro de ti, tan dentro que nadie la ha visto todavia.',
      'Tienes cara de persona interesante, que es lo mas diplomatico que alguien puede decir.',
      'Tu mejor angulo es el que nadie ve nunca, y eso ya es una declaracion en si mismo.',
      'La genetica contigo fue pragmatica, no generosa, y la diferencia se nota mucho.',
      'Hay caras que se olvidan al segundo de verlas. La tuya tiene exactamente esa cualidad.',
      'Tu cara es un argumento solido contra la idea de que el universo tiene diseno inteligente.',
      'No eres feo, eres de los que necesitan personalidad para compensar, y eso ya es mucho trabajo.',
      'Si el fisico fuera requisito para estar aqui, habrias tenido que falsificar el formulario.',
    ],
    extreme: [
      'Tienes el tipo de atractivo que no se menciona pero todo el mundo nota cuando entras.',
      'Quien acabe contigo va a tener que recordarse cada manyana la suerte que tiene.',
      'La gente coquetea contigo por inercia, sin haberlo decidido conscientemente.',
      'Hay un motivo por el que la gente tarda en mirarte a los ojos cuando te habla.',
      'Tu atractivo funciona igual en persona que en foto, y eso es rarisimo de verdad.',
      'Eres exactamente el tipo de persona que arruina el dia de alguien con solo cruzarse.',
      'Tu presencia desordena planes ajenos sin que tu lo busques ni lo notes.',
    ],
  },

  crack: {
    name: 'crack',
    goodIsHigh: true,
    high: [
      'Tienes un nivel que la mayoria lleva anos intentando alcanzar sin conseguirlo.',
      'Cuando entregas algo, el resultado lo defiende solo sin que abras la boca.',
      'Donde otros improvisan y rezan, tu ejecutas y terminas.',
      'Tu talento no es ruido, es estructura, y esa diferencia se ve a los dos minutos.',
      'Tus errores son anecdota, tus aciertos son patron, y eso ya lo dice todo.',
      'Llegas a sitios donde la mayoria ni aspira, y lo haces sin teatro ni drama.',
      'Tu nivel intimida sin que tu lo busques, que es la version mas autentica que existe.',
      'La gente cuenta contigo cuando algo de verdad importa, y eso no se reparte facil.',
      'No tienes techo visible todavia, y eso es lo mas raro de todo lo tuyo.',
      'Cualquier proyecto donde apareces sube de nivel sin que te lo pidan.',
      'Tu fiabilidad tiene precio alto en cualquier mercado y los que saben lo saben.',
      'Tienes esa clase de talento que hace que la gente a tu alrededor suba el nivel sin darse cuenta.',
      'Eres de los que no necesitan presentacion porque el trabajo ya la hace antes.',
    ],
    mid: [
      'Capacidad la tienes, ganas no, y la diferencia se nota en todo lo que entregas.',
      'Llegas a correcto pero nunca a sobresaliente, y la distancia es completamente mental.',
      'Funcionas bien cuando quieres, el problema es que casi nunca quieres de verdad.',
      'Das lo justo para que no te echen, jamas lo que podrias dar, y eso ya es tu techo.',
      'Tienes rachas buenas y bajones sin motivo aparente, nadie sabe en que columna ponerte.',
      'Tu nivel oscila tanto que la gente ha aprendido a no contar contigo para nada critico.',
      'Suficiente para no fallar, insuficiente para que nadie te recuerde por nada bueno.',
      'Podrias ser bueno si dejaras de sabotearte, pero eso tampoco parece que vaya a pasar.',
    ],
    low: [
      'No tienes nivel y lo intentas tapar con seguridad falsa, y se ve a la legua.',
      'Mediocre constante, sin un solo dia de excepcion en el historial.',
      'La brecha entre lo que crees que haces y lo que realmente haces da verguenza ajena.',
      'Eres el freno del equipo y lo saben todos menos tu, que sigues con tu autoconcepto intacto.',
      'Cuando alguien cuenta contigo ya esta calculando cuanto va a tardar en rehacer tu parte.',
      'Hay gente sin talento que trabaja el doble para compensar. Tu ni eso te has planteado.',
      'Eres el tipo de persona al que se le asignan tareas sencillas por seguridad del grupo.',
      'Tu curva de aprendizaje es tan plana que podria confundirse con el suelo.',
      'No eres un recurso, eres un obstaculo con DNI y acceso al grupo.',
    ],
    extreme: [
      'Lo que tu haces con facilidad otros lo persiguen toda su vida sin alcanzarlo.',
      'Tu nombre es garantia y eso es una reputacion que muy poca gente construye.',
      'Lo que para otros es techo es donde tu empiezas a interesarte por el tema.',
      'Eres el ejemplo que se cita cuando alguien pregunta como se hace bien algo de verdad.',
      'Subes el liston de cualquier grupo solo con aparecer, sin proponertelo ni pedirlo.',
      'Hay gente que lleva diez anos intentando llegar donde tu ya estabas hace tres.',
      'Tu nivel real se ve en los dias malos, no en los buenos, y eso es lo que separa al crack del actor.',
    ],
  },

  inteligencia: {
    name: 'inteligente',
    goodIsHigh: true,
    high: [
      'Tu cabeza resuelve en cinco segundos lo que a otros les ocupa el dia entero.',
      'Llegas a conclusiones antes de que los demas terminen de leer el enunciado.',
      'Ves patrones donde otros ven datos sueltos sin relacion aparente.',
      'Eres de los pocos que saben cuando no saben, que es la primera forma de inteligencia real.',
      'Cuando entras en un debate, el debate sube de nivel quieras o no.',
      'Tu forma de argumentar convence sin aplastar, y eso es inteligencia social fina.',
      'Aprendes rapido, retienes mejor, y conectas ideas que parecen no tener nada que ver.',
      'Tu silencio se confunde con pasividad. Cuando hablas ya llevas tres pasos de ventaja.',
      'Tienes la claridad mental que la mayoria no va a desarrollar en toda su vida.',
      'La gente sale de las conversaciones contigo con algo que no traia cuando entro.',
      'Tienes inteligencia y la cabeza para no abusar de ella, lo cual es lo mas dificil.',
      'Cuando decides aprender algo, lo aprendes de verdad, no por encima como hace la mayoria.',
    ],
    mid: [
      'Inteligencia funcional, nada que descubrir por el momento.',
      'Llegas a la conclusion correcta pero llegas tarde, casi siempre demasiado tarde.',
      'Tu razonamiento es lineal y la mayoria de problemas no lo son, eso ya te limita.',
      'Piensas bien cuando te lo propones, pero raramente te lo propones de verdad.',
      'No eres tonto, eres lento, y a veces la diferencia practica es la misma.',
      'Correcto en lo basico, perdido en lo complejo, exactamente como la media.',
    ],
    low: [
      'Denso como un muro de hormigon armado en cada puta conversacion que tienes.',
      'Tardas en pillar lo que la gente ya ha explicado tres veces con paciencia infinita.',
      'Conviertes algo facil en algo imposible solo con tocarlo, es un don inverso.',
      'La brecha entre lo que crees entender y lo que entiendes de verdad es un canon.',
      'Cuando la charla sube de nivel te quedas en la acera esperando que baje.',
      'Preguntas lo que acaban de explicar como si hubieras llegado tarde aunque llevaras ahi una hora.',
      'Tienes la agudeza mental de un ladrillo humedo en dia de lluvia.',
      'No eres el que resuelve, eres el que complica sin querer y luego pregunta por que hay problemas.',
      'Eres el tipo de persona que necesita que se lo expliquen con munecos y aun asi hay dudas.',
    ],
    extreme: [
      'Tienes una forma de pensar que la mayoria no va a desarrollar nunca aunque lo intente.',
      'Hay gente con titulos que no llega donde tu llegas con simple curiosidad.',
      'No solo piensas rapido, piensas bien. La combinacion es escasisima.',
      'Aprendes de cualquier experiencia, incluidas las malas, y eso te separa del resto.',
      'Tu inteligencia no es ruidosa, simplemente funciona, y eso es lo mas valioso.',
      'Dentro de diez anos vas a recordar conversaciones contigo como de las que te cambiaron algo.',
    ],
  },

  feminidad: {
    name: 'femenina',
    goodIsHigh: true,
    high: [
      'Tienes una elegancia que no se aprende, se nace con ella o no se tiene.',
      'Tu feminidad no es performance ni calculo, es quien eres, y se nota desde la primera mirada.',
      'Tu presencia tiene una suavidad que muy pocas personas saben mantener de forma genuina.',
      'La forma en que te mueves y hablas tiene una gracia que casi nadie consigue.',
      'Tienes esa feminidad solida que no necesita demostrarse cada cinco minutos.',
      'Tu feminidad no es debilidad, es precision, y eso intimida a quien sabe leerla.',
      'Tienes ese equilibrio raro entre fuerza y suavidad que define lo que es verdaderamente elegante.',
      'La calidez que proyectas es genuina y la gente lo percibe antes de que hayas dicho nada.',
      'Tu manera de estar en el mundo tiene una suavidad que hace todo mas facil alrededor.',
      'La gente a tu alrededor se comporta mejor cuando estas cerca, aunque no sepan por que.',
      'Eres de las pocas personas con elegancia real, no la de aparentar para Instagram.',
    ],
    mid: [
      'Tu feminidad va y viene segun el dia y el humor, sin patron ni coherencia.',
      'Ni muy delicada ni muy tosca, en un termino medio que no destaca en absoluto.',
      'La elegancia te visita de vez en cuando pero no se queda, solo de paso.',
      'Tu feminidad es situacional, depende demasiado de quien tienes delante para ser real.',
      'Regular en este aspecto, ni virtud ni defecto que merezca mencionarse.',
    ],
    low: [
      'Tan delicada como una hormigonera a pleno gas un lunes por la manyana.',
      'La elegancia te esquiva como si te hubiera visto venir desde tres manzanas de distancia.',
      'Tienes los modales de alguien criado en una obra sin ventanas ni reglas basicas.',
      'Tu feminidad es leyenda urbana, nadie ha podido confirmarla con pruebas verificables.',
      'Si la delicadeza fuera un examen, el examinador te suspenderia antes de empezar.',
      'La elegancia y tu sois conceptos que nunca han coincidido en tiempo y espacio.',
      'Proyectas la delicadeza de un camionero en su peor dia, sin el sueldo ni la excusa.',
      'Tienes la suavidad de una piedra pomez y la mitad de utilidad practica.',
    ],
    extreme: [
      'Tienes una feminidad genuina que la mayoria no va a desarrollar aunque lo intente.',
      'Tu forma de ser tiene una elegancia que no se compra ni se aprende en ningun curso.',
      'La delicadeza que tienes es de las que envejecen bien, no se va con los anos.',
      'La clase de feminidad que tienes no se menciona pero todo el mundo nota cuando entras.',
      'Tu presencia es de las que se quedan en la memoria de quien te conoce.',
    ],
  },

  masculinidad: {
    name: 'masculino',
    goodIsHigh: true,
    high: [
      'Tu masculinidad no necesita demostrarse, se nota en cuanto entras a cualquier sitio.',
      'Tienes esa solidez que la gente busca cuando necesita apoyarse en alguien de verdad.',
      'Proyectas una seguridad que no viene del cuerpo ni del cargo, viene de dentro.',
      'Tu presencia genera tranquilidad en quien te rodea, y eso es un poder real.',
      'Tienes el tipo de caracter que la gente respeta sin que nadie se lo explique.',
      'Tu masculinidad no es ruido ni exhibicion, es estructura, y esa es la version que dura.',
      'Eres de los que resuelven sin quejarse, y eso ya te separa del noventa por ciento.',
      'La firmeza con la que manejas las cosas dice mucho de lo que llevas dentro.',
      'Tienes una templanza que muy poca gente mantiene cuando todo se complica de verdad.',
      'La gente confia en ti para lo serio, y eso no se regala, se gana con el tiempo.',
      'Tu masculinidad tiene profundidad real, no es decoracion ni fachada de fin de semana.',
      'La gente que ha contado contigo en momentos dificiles sabe exactamente lo que eso vale.',
    ],
    mid: [
      'Tu masculinidad es inconsistente, aparece cuando conviene y desaparece cuando hace falta.',
      'Hay base pero no estructura, y sin estructura nada se sostiene cuando importa.',
      'Tu seguridad depende demasiado de quien tienes delante como para ser real.',
      'A veces solido, a veces inestable, sin que nadie sepa de cual contar cuando importa.',
      'Con mas consistencia serias otra cosa, pero la constancia te falla siempre en el peor momento.',
    ],
    low: [
      'Tu masculinidad es una historia que te cuentas tu y que nadie mas se cree.',
      'Proyectas la solidez de un castillo de naipes en dia de viento fuerte.',
      'Tu firmeza dura lo que dura el buen tiempo, que en tu caso no es mucho.',
      'Tienes el caracter de un flan, y el flan al menos aguanta en el plato sin quejarse.',
      'Cuando se complica, eres el primero en desaparecer, y todo el mundo ya lo sabe.',
      'La testosterona en tu caso es mas leyenda que realidad documentada.',
      'Tu masculinidad es aspiracional en el peor sentido: aspiras a tenerla pero no llega.',
      'Eres la prueba viviente de que la masculinidad no es automatica ni obligatoria.',
      'Tu seguridad se rompe con una pregunta directa hecha en tono normal.',
    ],
    extreme: [
      'Tienes una masculinidad real que no necesita anunciarse porque se ve sin que digas nada.',
      'Tu manera de manejar la presion es lo que te separa cuando las cosas se ponen serias.',
      'Tienes el caracter que la gente busca cuando necesita a alguien de verdad.',
      'Eres de los pocos que tienen masculinidad real sin necesitar que nadie se la confirme.',
      'Tu presencia en cualquier grupo lo ancla, y la gente lo nota sin decirlo nunca.',
      'Tienes esa seguridad que no viene del ego sino del conocimiento de uno mismo.',
    ],
  },

  // ===== NEGATIVOS =====

  gay: {
    name: 'gay',
    goodIsHigh: false,
    high: [
      'Sal del armario de una puta vez, que ya solo te enganas a ti mismo y te queda fatal.',
      'Mas gay que el arcoiris en la entrada de una sauna un sabado por la noche.',
      'La pluma que llevas encima podria rellenar diez almohadas y un edredon king size.',
      'Naciste con purpurina en las venas y se te nota a tres calles de distancia.',
      'Cada gesto tuyo es una declaracion firmada y sellada que nadie ha pedido.',
      'Tu masculinidad es de teatro de tercera, ni convence al publico ni al actor.',
      'Hasta tus padres ya lo han asumido, solo estan esperando a que tu lo digas para respirar.',
      'La ultima vez que fuiste hetero fue en el vientre de tu madre, y tampoco estas seguro.',
      'Haces un esfuerzo tremendo para parecer hombre y el resultado es patetico de ver.',
      'Tu Spotify es un mapa autobiografico que cualquiera descifra en treinta segundos.',
      'Si la heterosexualidad fuera un examen, lo suspenderias antes de leer la primera pregunta.',
      'Tu forma de sentarte es un comunicado sin palabras que todo el grupo ya ha leido.',
      'Cada vez que dices que te gustan las tias, nadie en este grupo te cree ya.',
      'Tu voz sube tres tonos cuando pasa un tio bueno y lo haces sin darte cuenta.',
      'Eres un armario andante con WiFi, sin cerradura y con ventanas de cristal.',
      'Tienes ese punto de pluma que hace que los heteros del grupo se sientan incomodos a tu lado.',
      'Cuando entras a un sitio, los que saben ya tienen una opinion formada antes de que hables.',
      'Tu masculinidad sobrevive lo justo para que tu puedas seguir mintiendote a ti mismo.',
      'Llevas la bandera por dentro y se transparenta cada vez que sonries o abres la boca.',
      'Hay apuestas en el grupo sobre ti y ninguna va en la direccion que esperarias.',
    ],
    mid: [
      'Algo se te mueve por dentro cuando pasa un tio bueno, y no finjas que no.',
      'Bisexual pendiente de confirmacion oficial, que es exactamente igual de revelador.',
      'En ciertos momentos te delatas solo sin que nadie te pregunte absolutamente nada.',
      'Te lo estas pensando y todos lo ven mientras tu crees que lo disimulas perfectamente.',
      'La curiosidad que tienes no es inocente y en el fondo tu mismo ya lo sabes.',
      'Tienes ese punto que hace que nadie tenga claro en que columna ponerte.',
      'A veces se te escapa y a veces no, pero el grupo ya tiene una opinion firme.',
      'Tu lucha interna es publica aunque tu creas que la tienes bien guardada.',
      'Hay un chat sin ti donde este tema se trata con mas libertad de la que imaginas.',
    ],
    low: [
      'Hetero de manual, aburrido y sin matices de ningun tipo.',
      'Tan recto que duele mirarte, practicamente.',
      'Cero pluma, cero duda, nada interesante que comentar aqui.',
      'Tu heterosexualidad es tan obvia que aburre a todo el mundo.',
      'La madera mas derecha del grupo, sin discusion posible.',
    ],
    extreme: [
      'Llevas anos enganandote y el unico al que enganas eres tu, que es suficientemente triste.',
      'Tu familia ya lo ha asumido, solo estan esperando a que tu lo digas para poder respirar.',
      'Todo el mundo sabe lo que eres antes de que tu abras la boca en cualquier conversacion.',
      'Eres el secreto a voces del grupo y llevas tanto tiempo siendolo que ya ni es gracioso.',
      'Nadie te lo dice a la cara porque no quieren el drama, no porque tengan dudas.',
      'Cada dia que pasa sin salir del armario es un dia que pierdes viviendo a medias.',
      'El grupo tiene un chat paralelo donde este tema se toca con mas frecuencia de la que crees.',
    ],
  },

  simp: {
    name: 'simp',
    goodIsHigh: false,
    high: [
      'Simp de campeonato, te lamerias los zapatos por un emoji bien puesto, idiota.',
      'Vendes tu dignidad por un hola y encima das las gracias al comprador como si fuera un favor.',
      'Tu autoestima depende literalmente de un visto de alguien que no te quiere.',
      'Le escribes meses sin recibir nada a cambio y sigues ahi como un imbecil con ganas.',
      'Sabes su signo, su perfume y donde estudio. Ella no sabe ni tu nombre completo.',
      'Tu telefono solo manda mensajes, nunca recibe ninguno de vuelta, y sigues intentando.',
      'Le respondes a los dos segundos aunque ella tarde dias en contestar, patetico.',
      'Le pagas el bizum mensual y encima le llamas cariyo, que asco de situacion.',
      'Tu estrategia es estar disponible veinticuatro horas y por eso te tratan como invisible.',
      'Aceptas las migajas como si fueran un banquete y por eso te las siguen tirando siempre.',
      'Aceptas la friendzone como si fuera un ascenso laboral que hubieras ganado con merito.',
      'Coleccionas rechazos como cromos y aun asi sigues comprando sobres con dinero que no tienes.',
      'Le das like a todo lo que sube, incluidas las fotos del desayuno de cualquier martes.',
      'Tienes su horario memorizado y ella no sabe en que ciudad vives ni le importa.',
      'Le mandas buenos dias cada manyana y recibes silencio como respuesta consistente.',
      'Viajas dos horas para verla y ella cancela con un audio de diez segundos sin disculpa.',
      'Le defiendes publicamente mientras ella ignora que existes en privado, que verguenza.',
      'Eres la persona a la que recurre cuando todos los demas han dicho que no, el ultimo recurso.',
      'Llevas tanto tiempo arrastrandote que ya no sabes como estar de pie, ni lo intentas.',
      'Tu unica relacion estable es la que tienes con el rechazo cronico y voluntario.',
    ],
    mid: [
      'Simping moderado pero la desesperacion se te nota en cada mensaje que mandas.',
      'Sabes que esta mal y aun asi no puedes evitarlo, eso ya es preocupante.',
      'Tu orgullo existe pero es negociable, y el precio es ridiculamente bajo.',
      'Tu cabeza dice no, tu corazon dice si, y tu cartera siempre paga las consecuencias.',
      'Conoces el limite y aun asi flirteas con cruzarlo cada semana sin falta.',
      'Tu dignidad aparece los lunes y desaparece en cuanto ella te escribe aunque sea para nada.',
      'La persona en cuestion no merece ni la mitad de lo que le das y tu lo sabes.',
    ],
    low: [
      'Digno, no te arrastras por nadie y eso ya es mucho en este grupo.',
      'Sabes lo que vales y no lo regalas en cuanto alguien te sonrie.',
      'No persigues, atraes. Esa es la unica diferencia que importa.',
      'Cuando alguien no te valora, desapareces sin drama ni explicaciones. Asi se hace.',
      'Te respetan porque te respetas tu primero, y eso se nota desde lejos.',
    ],
    extreme: [
      'Eres un felpudo con patas. Te utilizan, lo saben, tu lo sabes, y sigues ahi sonriendo.',
      'La persona por la que babeas ni recuerda tu nombre completo, eso ya tendria que decirte algo.',
      'Hay perros con mas dignidad que tu, y los perros al menos se lamen sus heridas solos.',
      'Tu existencia entera depende de la aprobacion de gente que no te valora ni para el cafe.',
      'Te ven venir desde lejos y aprovechan porque saben que no vas a decir nada nunca.',
      'Eres exactamente el ejemplo que ponen los padres para que sus hijos no acaben asi.',
      'Vas a llegar a viejo solo y vas a culpar a todos menos al unico responsable, que eres tu.',
      'No vas a estar bien hasta que dejes de buscar a alguien que te salve, cosa que no va a pasar.',
    ],
  },

  rata: {
    name: 'rata',
    goodIsHigh: false,
    high: [
      'Rata de alcantarilla, traicionarias a tu madre por cinco euros y un me gusta, sin dudarlo.',
      'Tu deslealtad es un arte depurado. Todo el grupo lo sabe y nadie se molesta ya en decirte nada.',
      'Donde hay un cuchillo por la espalda hay un dedo tuyo apuntando, siempre.',
      'La traicion te sale tan natural que ni siquiera necesitas pensarla dos segundos.',
      'Cambias de bando con la facilidad con la que otros cambian de calcetines en invierno.',
      'Hablas mal de la gente cinco minutos despues de abrazarla en la calle con una sonrisa.',
      'Coleccionas secretos ajenos como municion para gastar cuando mas convenga a tus intereses.',
      'Le mandas pantallazos a quien no debe y crees que nadie se va a enterar nunca.',
      'No tienes principios, tienes calculos, y todos te los suman a ti en primer lugar.',
      'Vendes amistades a precio de saldo en cuanto aparece una oferta marginalmente mejor.',
      'Tu palabra no vale nada, ni siquiera para ti mismo cuando estas solo.',
      'Sonries con la boca mientras la mente ya planea el siguiente movimiento sucio.',
      'Tu padre sabe quien eres y por eso no presume de ti delante de absolutamente nadie.',
      'Estas en cuatro grupos paralelos hablando mal del resto en cada uno, y todos lo saben.',
      'Finges lealtad mientras buscas el momento ideal para usarla en contra de quien confio.',
      'Lo que se te cuenta en privado tiene fecha de caducidad muy corta en tus manos.',
      'Siembras cizanya sin que se note y luego pones cara de no saber nada, tu obra maestra.',
      'La gente ya no te cuenta cosas importantes porque saben que las vas a usar en tu beneficio.',
      'Cuando te vas de una conversacion el tema cambia en la direccion de siempre.',
    ],
    mid: [
      'Algo de rata tienes, pero no llegas a plaga todavia, aunque vas por el buen camino.',
      'Traicionas cuando conviene, que es la peor de todas las versiones posibles.',
      'Eres leal hasta que aparece una oferta marginalmente mejor, que es exactamente igual.',
      'Tus principios se mueven con el viento del momento sin resistencia ninguna.',
      'A veces eres buen amigo, a veces aparece el monstruo, sin patron predecible.',
      'Hay gente del grupo que ya solo te cuenta verdades a medias por seguridad propia.',
      'Tu rata interior esta creciendo y se nota en pequenyos gestos cotidianos.',
    ],
    low: [
      'Mas leal que un perro, no traicionarias ni a tu peor enemigo de borracho.',
      'Limpio como una patena, no hay manchas en tu historial conocido.',
      'Tus amigos duermen tranquilos cuando estas cerca, y eso no se compra.',
      'Tu palabra es ley para ti, y eso vale mucho en estos tiempos de mierda.',
      'Lo que te cuentan se queda contigo, por eso la gente te cuenta cosas que no cuentan a nadie.',
    ],
    extreme: [
      'Todo el mundo en este grupo sabe que no eres de fiar, solo que nadie te lo ha dicho todavia.',
      'Cuando te vayas del grupo nadie va a preguntar por ti, y en el fondo tu ya lo sabes.',
      'Te van a abandonar uno a uno y vas a culpar a todos menos a ti mismo, como siempre.',
      'La soledad que te espera no es mala suerte, es la factura de lo que sembraste durante anos.',
      'Algun dia vas a necesitar a alguien y no va a haber nadie, ni quien te coja el telefono.',
      'Te van a hacer exactamente lo que tu has hecho, y va a doler el doble porque no lo esperas.',
      'Hasta los que te apoyan en publico te critican en privado, eso es lo que has construido.',
      'Mira a tu alrededor. La gente que sigue contigo es la que todavia no te conoce bien.',
      'Cuando te recuerden dentro de diez anos sera con una mueca, no con una sonrisa ni nostalgia.',
    ],
  },

  maricon: {
    name: 'maricon',
    goodIsHigh: false,
    high: [
      'Maricon de tomo y lomo, y encima sin el minimo talento para disimularlo.',
      'Mas pluma que un gallinero en hora punta un domingo de mercado.',
      'No hay armario en el mundo que aguante tu pluma encerrada ni cinco minutos.',
      'Cada gesto tuyo es una declaracion involuntaria firmada, sellada y certificada.',
      'La masculinidad te queda como un disfraz de carnaval mal cosido por dentro.',
      'Tu intento de macho no convence ni a tu reflejo en el espejo por las manyanas.',
      'Tu manera de andar ya es un mensaje en clave para los entendidos de cualquier barrio.',
      'Cuando entras a un bar el camarero pide ya lo de siempre antes de que abras la boca.',
      'Tu masculinidad raya lo comico en el sentido mas literal del adjetivo posible.',
      'Eres tan obvio que ya no enganyas ni a los muy distraidos del pueblo entero.',
      'Tu voz sube tres tonos cuando hablas de alguien que te gusta y ni te das cuenta.',
      'Tu forma de reir tiene una firma particular que nadie malinterpreta en ningun contexto.',
      'Cuando dices que eres muy masculino, nadie en este grupo discute para no herirte.',
      'La pluma que llevas gratis podria venderse a precio premium y nadie lo cuestionaria.',
      'Tu masculinidad es tan fragil que se rompe con una pregunta directa en tono normal.',
      'Hasta las paredes huyen del color que desprende tu presencia al andar.',
      'Tienes mas pluma que todo el grupo junto y aun no te has enterado de nada.',
    ],
    mid: [
      'Algo de pluma hay, no te voy a mentir, y la gente la nota aunque nadie lo diga.',
      'Ni muy muy ni tan tan, en el limbo entre la virilidad y lo otro sin decidirte.',
      'A veces se te escapa, a veces lo controlas, sin patron claro para nadie.',
      'En ciertas situaciones te pones nervioso y la pluma sale sola sin previo aviso.',
      'Hay gestos que repites sin darte cuenta y todos en el grupo los tienen catalogados.',
      'Tienes manierismos que hablan por ti aunque tu prefieras no hacerlo nunca.',
      'En el grupo hay apuestas sobre ti y ninguna va en la direccion que esperarias.',
    ],
    low: [
      'Mas macho que Rambo con resaca un domingo de lluvia.',
      'Testosterona a raudales, ninguna duda en ningun frente conocido.',
      'Tu masculinidad es de manual antiguo, agresiva y sin matices de ningun tipo.',
      'Heterosexualidad sin grietas, casi insoportable de ver.',
      'Tan derecho que hasta la arquitectura podria aprender algo de tu plano.',
    ],
    extreme: [
      'Vaya maricon, deberia salirte del grupo, nadie te quiere aca.',
      'Eres exactamente el tipo de persona del que la gente habla mal cuando te vas.',
      'Nadie te lo dice a la cara porque no mereces ni ese esfuerzo basico minimo.',
      'Piensa cuantas personas te escribirian si desaparecieras manyana. Hazlo en serio.',
      'Hay una razon clara por la que siempre eres el ultimo al que avisan de los planes.',
      'La gente te soporta, no te quiere. Aprende la diferencia de una vez por todas.',
      'En tu propia familia hablan de ti como del problema, no como del hijo querido.',
      'Tus padres mienten cuando les preguntan que tal te va, y lo saben todos menos tu.',
      'Las conversaciones del grupo mejoran cuando no estas, y todos lo notan menos tu.',
    ],
  },

  friki: {
    name: 'friki',
    goodIsHigh: false,
    high: [
      'Friki supremo, tu cueva huele a fracaso social y pizza fria de cuatro dias.',
      'Tan friki que hasta los demas frikis te miran raro en los foros especializados.',
      'Tu vida social entera cabe en una pantalla de seis pulgadas y sobra espacio.',
      'Sabes mas de personajes ficticios que de personas reales que viven cerca de ti.',
      'Tu Steam tiene mas horas que tu trabajo, tu colegio y tu vida social juntos.',
      'El sol te quema porque ya no te reconoce despues de tanto tiempo encerrado.',
      'No tienes amigos, tienes guildmates con nicknames ridiculos que no conoces en persona.',
      'La ultima vez que viste el cielo fue por accidente al ir al contenedor de basura.',
      'Coleccionas figuritas que ningun adulto deberia tener en exposicion a su edad.',
      'Tu vida amorosa se reduce a una waifu dibujada y dos personajes secundarios de serie.',
      'Tu padre ya no sabe en que invertir esperanza contigo, se ha rendido completamente.',
      'La discusion mas importante de tu semana fue sobre un personaje que no existe en ningun plano.',
      'Pasas horas debatiendo lore de universos ficticios con desconocidos que tampoco salen de casa.',
      'Tu historial de busqueda parece la nota de ingreso a un centro especializado.',
      'Has llorado por la muerte de un personaje de ficcion mas de una vez este ano.',
      'Cuando alguien dice que no conoce ese personaje, te parte algo por dentro fisicamente.',
      'Tu cuarto a oscuras con la pantalla encendida es tu estado natural predeterminado.',
      'La unica relacion seria que tienes es con una licencia de software de suscripcion mensual.',
      'Tu coleccion de merchandising vale mas que tus perspectivas de futuro combinadas.',
      'Eres el primer fracaso documentado de tu arbol genealogico y lo llevas con orgullo.',
    ],
    mid: [
      'Friki moderado, sales a la calle de vez en cuando, lo cual ya es algo.',
      'Friki con disimulo, pero se nota en cuanto abres la boca cinco minutos seguidos.',
      'Tienes referencias que nadie pilla pero te las guardas, gracias por eso.',
      'A ratos eres friki, a ratos persona, es complicado de gestionar desde fuera.',
      'Puedes pasar por normal en entornos controlados pero luego sale el monstruo.',
      'Friki de armario, que es exactamente igual de grave pero con mas hipocresia.',
    ],
    low: [
      'Cero raro, lo mas normal del grupo. Ya es un logro aqui.',
      'Social y presentable, que aburrido pero completamente funcional.',
      'Te mueves bien en cualquier ambiente, eso es un don.',
      'Tienes vida real, amigos de carne y hueso y hobbies que no implican pantallas.',
    ],
    extreme: [
      'Llevas tanto tiempo hablando con pantallas que ya no sabes como hablar con personas reales.',
      'Hay un mundo fuera de tu habitacion y lleva anos sin verte la cara.',
      'La ultima vez que alguien te llamo para salir fue porque se equivoco de numero.',
      'Tu vida real es tan pobre que has tenido que construirte otras en pantallas para sobrevivir.',
      'Tus padres ya han renunciado a que tengas pareja, hijos o algo parecido a una vida.',
      'Si manyana te pasara algo lo encontrarian tres dias despues por el olor.',
      'Sabes datos de personajes ficticios y no sabes el cumpleanyos de tu madre.',
      'Tus amigos online no van a venir a tu entierro, eso te lo puedo asegurar con certeza.',
      'A los cuarenta vas a seguir igual, en el mismo cuarto con los mismos posters amarillentos.',
    ],
  },

  cerdo: {
    name: 'cerdo',
    goodIsHigh: false,
    high: [
      'Cerdo de manual, tu higiene es un insulto documentado a los cinco sentidos.',
      'Comes con las manos y te las limpias en el pantalon, y encima lo defiendes.',
      'Tu cuarto es un vertedero con WiFi de baja calidad y olor propio reconocible.',
      'Has convertido la mugre en estilo de vida y lo llevas con un orgullo inexplicable.',
      'Hueles a algo que no deberia tener nombre todavia segun la ciencia.',
      'Tu ropa lleva dias encima y tu cuerpo lleva mas dias sin agua caliente.',
      'La gente se aparta cuando te sientas y tu crees que es porque les caes mal.',
      'Dejas rastro de porqueria en cualquier lugar que tocas mas de dos segundos.',
      'No distingues entre suelo y papelera, todo es lo mismo a tus pies sucios.',
      'Tu banyo es una escena de crimen biologico que deberia estar acordonada.',
      'Tu cama tiene capas arqueologicas de mugre que podrian datarse en universidades.',
      'Tu nevera es una novela de terror organizada por fecha de caducidad.',
      'La basura de tu cuarto ya tiene ecosistema propio y especies endemicas.',
      'Usas la misma toalla desde hace meses y ves el problema en las costumbres de los demas.',
      'Te duchas cuando no te queda otra opcion, no por higiene ni por habito.',
      'La gente que ha comido en tu casa lo cuenta como una experiencia de supervivencia.',
      'Tus zapatillas tienen una historia olfativa para la que nadie esta preparado.',
      'Tu ropa interior tiene una antiguedad que podrian estudiar en arqueologia.',
      'La ultima vez que limpiaste fue porque venian tus padres, y a duras penas.',
    ],
    mid: [
      'Algo de cerdo hay, no te voy a mentir, y se nota en detalles cotidianos.',
      'Tu higiene es negociable segun el dia, y hay dias muy malos que dejan huella.',
      'No llegas a desastre total pero el camino esta clarisimo desde aqui.',
      'A veces te duchas, a veces no, y se nota la diferencia desde la calle.',
      'Tu nivel de orden depende de si tienes visita, no de criterio propio.',
      'Tienes rachas limpias y rachas oscuras, sin equilibrio sostenido nunca.',
    ],
    low: [
      'Limpio y ordenado, eso ya dice algo en este grupo.',
      'Tu higiene no da problemas a nadie, lo cual es minimo pero no todos lo logran.',
      'Presentable sin alardes, pero presentable y sin olor.',
      'Nada que objetar en lo higienico, y eso aqui ya es un merito real.',
    ],
    extreme: [
      'Eres un cerdo clinico, el tipo de persona que baja el nivel de cualquier espacio que pisa.',
      'La gente que ha estado en tu casa habla de ello como de una experiencia traumatica.',
      'No es desorganizacion, es renuncia activa y deliberada a la higiene mas basica.',
      'Hay animales con mas decoro que tu en su propio habitat natural.',
      'El asco que generas no es accidental, es estructural, va contigo a todos los lados.',
      'Cuando te vayas de un sitio, el sitio necesita varios dias para recuperarse del todo.',
      'Eres el tipo de persona con quien nadie quiere compartir piso, y lo saben antes de conocerte.',
      'Si pudieras verte desde fuera te darias asco a ti mismo, y eso es decir mucho.',
    ],
  },

  femboy: {
    name: 'femboy',
    goodIsHigh: false,
    biasHigh: true,
    high: [
      'Femboy de coleccion, las bragas te quedan mejor que a la mayoria de chicas, marica.',
      'Tan femboy que hasta las esteticistas te piden consejo de maquillaje sin ironia.',
      'Mas femboy que un gato con lazos en un estudio de fotografia kawaii iluminado con led rosa.',
      'Tu masculinidad se fue de vacaciones hace anos y mando una postal diciendo que no vuelve.',
      'Usas mas productos de belleza que la mayoria de influencers del nicho combinadas.',
      'Tu voz sube dos tonos cuando te pones nervioso, y te pones nervioso cada cinco minutos.',
      'El nivel de femboy que irradias es medible con instrumentos de precision y sale alto siempre.',
      'Tu guardarropa tiene mas colores que una tienda de caramelos en primavera lluviosa.',
      'Cuando dices que eres muy masculino, todo el grupo aguanta la risa al mismo tiempo.',
      'Eres tan femboy que los animes te piden autografo y los mangas te citan como referencia.',
      'Tu forma de reir ya clasifica en tres categorias que no son la masculina, ninguna.',
      'La forma en que te sientas deberia venir con subtitulos explicativos para los despistados.',
      'Tus fotos de perfil tienen mas filtros que una depuradora industrial de tercer mundo.',
      'Eres tan femboy que cuando entras a un bar la gente no sabe en que seccion sentarte.',
      'Tu masculinidad es un chiste que ya ni a ti te hace gracia contarlo.',
      'Tienes mas pluma que un aviario entero y menos verguenza que un politico en campanya.',
      'La purpurina que llevas en el alma se te nota en el andar, en la risa y en todo lo demas.',
      'Tu manera de existir es un tutorial involuntario de como no parecer hombre en ninguna situacion.',
    ],
    mid: [
      'Algo de femboy hay ahi, no te voy a mentir, pero tampoco lo llevas con conviccion.',
      'A ratos se nota, a ratos lo controlas, sin patron claro todavia.',
      'Tienes movimientos que solo se explican con ciertos tutoriales de TikTok.',
      'La linea que pisas es fina y cada dia la cruzas un poco mas sin darte cuenta.',
      'Tu lado femenino existe y lo sabes, aunque prefieras no darle nombre oficial.',
      'Las referencias que haces delatarian a cualquiera menos a ti, que ya no cuenta.',
      'Hay algo en ti que el grupo ha catalogado y que tu sigues fingiendo que no existe.',
    ],
    low: [
      'Nada de femboy, masculinidad solida sin fisuras visibles desde ningun angulo.',
      'Tan macho que hasta las herramientas te miran con respeto involuntario.',
      'Tu lado femenino no ha dado senyales de vida en ninguna interaccion registrada.',
      'Brutalmente masculino, cero adornos, cero filtros, cero duda de ningun tipo.',
      'La testosterona en tu caso no es cuestionable ni siquiera en dias malos.',
    ],
    extreme: [
      'Eres el femboy de referencia. El que los demas senyalan cuando quieren explicar el concepto.',
      'Tu existencia es una obra de arte de genero que nadie pidio pero que esta ahi permanentemente.',
      'Llevas tanto tiempo siendo femboy que ya no te resulta raro, y eso es lo que lo hace raro.',
      'El grupo lleva meses debatiendo si decirte algo y han decidido que no merece la pena.',
      'Eres la prueba viviente de que los genes a veces se confunden en el camino de forma irreversible.',
      'Tu forma de existir levanta preguntas que la biologia moderna no sabe responder todavia.',
      'Eres femboy de nivel experto, certificado por el grupo sin que nadie haya necesitado votar.',
      'Tu colonia huele bien, tu outfit tiene coherencia, y tu masculinidad brilla por su ausencia.',
      'Eres lo que pasa cuando alguien tiene buen gusto pero las opciones completamente equivocadas.',
      'El universo te creo femboy y tu lo aceptaste con una elegancia que, ironicamente, tambien es muy femboy.',
    ],
  },

  inutil: {
    name: 'inutil',
    goodIsHigh: false,
    high: [
      'Inutil certificado, tu presencia en cualquier tarea es un obstaculo documentado en acta.',
      'Das menos que lo que prometes, y lo que prometes ya era ridiculamente poco.',
      'Necesitas ayuda hasta para equivocarte de manera minamente eficiente.',
      'Tu contribucion a un proyecto es neutra en el mejor escenario imaginable.',
      'Tienes el talento especial de complicar lo simple sin anadir nada al resultado final.',
      'La gente que trabaja contigo ya asume que va a tener que rehacer todo despues.',
      'Eres el tipo de persona que hace que el trabajo aumente solo con aparecer en el sitio.',
      'Tu inutilidad no es descuido, es constancia. Eso al menos merece algun reconocimiento.',
      'Cuando alguien necesita que algo salga bien, tu eres el primero al que no llaman.',
      'Has convertido la incompetencia en estilo de vida y lo llevas con dignidad inexplicable.',
      'No solo no ayudas, consigues que los que si ayudan tengan que trabajar mas.',
      'Tus promesas se cotizan a precio de basura porque ya nadie las toma en serio.',
      'Le das a las cosas el doble del tiempo necesario para sacar la mitad del resultado.',
      'Tu curva de aprendizaje es tan plana que podria confundirse con el suelo.',
      'Eres el tipo de persona al que se le asignan tareas simples por seguridad del grupo.',
      'Cuando algo sale mal nadie necesita buscar mucho para saber por donde empezar.',
      'Tu autoconcepto laboral es una obra de ficcion sin paranon en este grupo.',
      'Eres el freno del equipo y lo saben todos menos tu, que sigues con tu autoestima intacta.',
      'La brecha entre lo que crees que aportas y lo que aportas de verdad es un abismo.',
      'No eres un recurso, eres un obstaculo con DNI y acceso al grupo.',
    ],
    mid: [
      'Util a ratos, inutil a ratos, sin ritmo ni patron claro identificable.',
      'Haces lo minimo para que no te echen sin aportar nada memorable a nadie.',
      'Tu rendimiento es correcto cuando quieres y un desastre cuando no, y no siempre quieres.',
      'Tienes capacidad real pero una desidia que la anula sistematicamente cada semana.',
      'No eres un desastre, eres un blando. Y los blandos son problema de otro tipo.',
      'Podrias ser bueno si dejaras de sabotearte, pero eso tampoco parece que vaya a pasar.',
    ],
    low: [
      'Util de verdad, de los que hacen que las cosas funcionen sin pedir reconocimiento.',
      'La gente cuenta contigo cuando algo importa, y eso no se regala a nadie.',
      'Eres de los que resuelven sin quejarse y sin que tengan que explicarte dos veces.',
      'Tu aportacion se nota cuando faltas, no cuando estas. Ese es el nivel real.',
    ],
    extreme: [
      'La brecha entre tu autoconcepto y tu rendimiento real es uno de los misterios de este grupo.',
      'Hay gente inutil y hay gente que ademas no es consciente de serlo. Tu eres las dos cosas.',
      'La gente ha dejado de contar contigo no por crueldad sino por experiencia acumulada.',
      'Cada vez que te asignan algo, alguien ya esta pensando en como arreglarlo despues.',
      'No es que no puedas, es que no quieres, y lo peor es que ya no distingues la diferencia.',
      'Llevas tanto tiempo sin aportar nada que ya ni tu mismo recuerdas la ultima vez.',
      'Tu historial habla por ti, y lo que dice no te deja en buen lugar en ningun capitulo.',
      'Cuando te vayas de un proyecto, el proyecto va a respirar. Eso es lo que has construido.',
      'No eres mal tipo, pero eres exactamente el tipo de persona que ningun equipo quiere repetir.',
    ],
  },
};

async function runPercent(sock, msg, key, groupMeta) {
  const jid = msg.key.remoteJid;
  const cfg = LABELS[key];
  if (!cfg) return;

  const sender = msg.key.participant || msg.key.remoteJid;
  const senderIsOwner = isOwner(sender, msg.key.fromMe, groupMeta);
  const senderIsAdmin = isAdminInMeta(groupMeta, sender);

  const target = getTargetOrSelf(msg);
  let percent;
  if (cfg.biasHigh) {
    // femboy: owner/admin se libran igual que en comandos negativos,
    // miembros reciben sesgo extra alto (85% hi en vez de 70%)
    const r = Math.random();
    if (senderIsOwner) {
      if (r < 0.90) percent = Math.floor(Math.random() * 31);
      else if (r < 0.98) percent = 31 + Math.floor(Math.random() * 39);
      else percent = 70 + Math.floor(Math.random() * 31);
    } else if (senderIsAdmin) {
      if (r < 0.75) percent = 70 + Math.floor(Math.random() * 31);
      else if (r < 0.90) percent = 31 + Math.floor(Math.random() * 39);
      else percent = Math.floor(Math.random() * 31);
    } else {
      if (r < 0.85) percent = 70 + Math.floor(Math.random() * 31);
      else if (r < 0.95) percent = 31 + Math.floor(Math.random() * 39);
      else percent = Math.floor(Math.random() * 31);
    }
  } else {
    percent = rollPercent(cfg.goodIsHigh, senderIsAdmin, senderIsOwner);
  }
  const verdict = percent >= 70 ? pick(cfg.high) : percent <= 30 ? pick(cfg.low) : pick(cfg.mid);
  const finale = pick(cfg.extreme);

  const text =
    `*@${target.split('@')[0]} es ${percent}% ${cfg.name}*\n\n` +
    `${verdict}\n\n` +
    `${finale}`;

  await sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
}

const makeCmd = (key) => (sock, msg, groupMeta) => runPercent(sock, msg, key, groupMeta);

module.exports = {
  cmdGay:           makeCmd('gay'),
  cmdSimp:          makeCmd('simp'),
  cmdHot:           makeCmd('sexy'),
  cmdRata:          makeCmd('rata'),
  cmdMaricon:       makeCmd('maricon'),
  cmdFriki:         makeCmd('friki'),
  cmdCrack:         makeCmd('crack'),
  cmdInteligencia:  makeCmd('inteligencia'),
  cmdCerdo:         makeCmd('cerdo'),
  cmdFeminidad:     makeCmd('feminidad'),
  cmdMasculinidad:  makeCmd('masculinidad'),
  cmdInutil:        makeCmd('inutil'),
  cmdFemboy:        makeCmd('femboy'),
};
