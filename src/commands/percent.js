const { isOwner, isAdminInMeta, getTargetOrSelf } = require('../utils/wa');

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Distribuciones por tier:
//
//                    │ alto ≥70% │ medio 31-69% │ bajo ≤30%
//  ─────────────────┼───────────┼──────────────┼──────────
//  Negativo miembro │   88 %    │    8 %       │    4 %
//  Negativo admin   │   78 %    │    14 %      │    8 %
//  Negativo owner   │    3 %    │    7 %       │   90 %
//  Positivo miembro │   15 %    │    30 %      │   55 %
//  Positivo admin   │   28 %    │    35 %      │   37 %
//  Positivo owner   │   92 %    │    6 %       │    2 %
function rollPercent(goodIsHigh, senderIsAdmin, senderIsOwner) {
  const rand = Math.random();
  const hi = () => 70 + Math.floor(Math.random() * 31);
  const mid = () => 31 + Math.floor(Math.random() * 39);
  const lo = () => Math.floor(Math.random() * 31);

  if (!goodIsHigh) {
    if (senderIsOwner) {
      if (rand < 0.90) return lo();
      if (rand < 0.97) return mid();
      return hi();
    }
    if (senderIsAdmin) {
      if (rand < 0.78) return hi();
      if (rand < 0.92) return mid();
      return lo();
    }
    if (rand < 0.88) return hi();
    if (rand < 0.96) return mid();
    return lo();
  } else {
    if (senderIsOwner) {
      if (rand < 0.92) return hi();
      if (rand < 0.98) return mid();
      return lo();
    }
    if (senderIsAdmin) {
      if (rand < 0.28) return hi();
      if (rand < 0.63) return mid();
      return lo();
    }
    if (rand < 0.15) return hi();
    if (rand < 0.45) return mid();
    return lo();
  }
}

const LABELS = {

  // ===== POSITIVOS =====

  sexy: {
    name: 'sexy',
    goodIsHigh: true,
    high: [
      'Tienes una cara que la gente no puede dejar de mirar aunque no quiera. Eso no es suerte, es biología.',
      'La genética invirtió en ti en todos los frentes y se nota sin que hagas absolutamente nada.',
      'Entras a un sitio y hay personas que pierden el hilo de lo que estaban diciendo. Eso no pasa por accidente.',
      'Tu físico genera reacciones involuntarias en quien te ve. No tienes que hacer nada para conseguirlo.',
      'Tienes el tipo de cara que los artistas copian y la gente recuerda años después sin haber hablado contigo.',
      'Tu atractivo no depende de la luz ni de la ropa ni del ángulo. Está ahí siempre, y eso es lo más escaso.',
      'Eres de los que hacen que la gente revise sus estándares cuando los conoce en persona.',
      'La simetría que tienes se estudia y se ve poco. Tú la llevas de serie sin haber hecho nada para merecerla.',
      'Hay personas que se arreglan una hora para lo que tú tienes al levantarte sin pensarlo.',
      'Tu cara tiene esa estructura que no se puede entrenar ni comprar. O se tiene o no se tiene.',
      'Vistes lo que sea y conviertes la ropa en algo distinto sin que sea tu intención.',
      'Eres exactamente el tipo de persona que arruina el día de alguien con solo cruzarse en la calle.',
      'Tu atractivo funciona igual en persona que en foto, y eso es una rareza real.',
      'La gente te mira y luego mira a sus parejas con una pregunta silenciosa que no van a verbalizar.',
      'Tienes lo que otros buscan en cirugías y tratamientos durante años sin encontrarlo.',
    ],
    mid: [
      'Con filtros y buena luz pasas por interesante. Fuera de eso estás en el montón exacto.',
      'Ni feo ni guapo, exactamente el perfil que nadie recuerda dos horas después.',
      'Tu físico no es un activo ni un problema. Simplemente está ahí, sin función.',
      'Potencial que no trabajas, que es casi peor que no tenerlo.',
      'Con un poco de esfuerzo podrías dar mucho más. Pero no lo haces y por eso estás aquí.',
      'En el montón donde nadie te va a destacar por nada físico.',
      'Tu fotogenia depende completamente del filtro y del fotógrafo. Eso ya dice bastante.',
      'Hay días buenos y días malos, sin que nadie sepa cuál va a ser el de hoy.',
    ],
    low: [
      'La genética no invirtió en ti y se nota en cada ángulo, con cualquier luz y sin filtros.',
      'Tienes una cara que la gente procesa y olvida en el mismo segundo sin esfuerzo.',
      'Tu mejor ángulo no existe. Lo has buscado durante años y no está.',
      'No eres feo, eres de los que necesitan personalidad fuerte para compensar. Y si eso también falla, el panorama es oscuro.',
      'La genética tomó decisiones contigo que ya son irreversibles. Eso se ve desde lejos.',
      'Hay caras que se olvidan al instante de verlas. La tuya tiene exactamente esa cualidad.',
      'Tu físico es un argumento contra la idea de que el universo tiene diseño inteligente.',
      'Si el físico fuera requisito de entrada a algún sitio, necesitarías una dispensa escrita.',
    ],
    extreme: [
      'La gente que te conoce sabe que eres de los que se quedan en la memoria. Los que no también lo van a saber.',
      'Vas a arruinar muchos días sin proponértelo. Eso no todo el mundo puede decirlo.',
      'Quien acabe contigo va a tener que recordarse cada mañana la suerte que tiene.',
      'Tienes el tipo de atractivo que no se menciona pero que modifica el ambiente cuando entras.',
      'La gente coquetea contigo por inercia, sin haberlo decidido, y luego no sabe cómo explicarlo.',
    ],
  },

  crack: {
    name: 'crack',
    goodIsHigh: true,
    high: [
      'Cuando entregas algo no hay que revisarlo. Eso, en cualquier contexto, es el estándar más alto.',
      'Tu nivel intimida sin que lo busques, que es la única versión del nivel que importa.',
      'La gente cuenta contigo cuando algo de verdad importa. No cuando hay margen de error.',
      'Donde otros improvisan tú ejecutas. La diferencia entre los dos es todo.',
      'Tus errores son anécdota. Tus aciertos son patrón. Eso ya lo dice todo sobre ti.',
      'Tienes la precisión que solo viene de años de trabajo real o de un talento que no se fabrica.',
      'Llegas a sitios donde la mayoría ni aspira a llegar, y lo haces sin necesitar que nadie lo note.',
      'Tu nombre en un proyecto cambia las expectativas de lo que puede salir.',
      'Lo que para otros es techo, para ti es donde empieza el problema interesante.',
      'Tienes esa fiabilidad que en cualquier mercado real tiene precio alto y escasez garantizada.',
      'La gente se fija en cómo lo haces para aprender a hacerlo, aunque nunca te lo digan.',
      'Tu trabajo lo defiende solo. No necesitas explicarlo ni venderlo.',
      'Llevas a cualquier equipo a un nivel distinto sin que te lo pidan ni lo propongas.',
    ],
    mid: [
      'Capacidad tienes. Ganas, no siempre. Y esa diferencia se ve en todo lo que produces.',
      'Llegas a correcto. Nunca a sobresaliente. La distancia entre los dos es completamente mental.',
      'Funcionas bien cuando quieres. El problema es que casi nunca quieres de verdad.',
      'Tu nivel oscila sin razón aparente, y eso ya es suficiente para que la gente no cuente contigo en serio.',
      'Das lo justo para no fallar. Nunca lo que podrías dar. Eso ya es tu límite autoimpuesto.',
      'Suficiente para pasar, insuficiente para que nadie te recuerde por nada concreto.',
    ],
    low: [
      'No tienes nivel y lo tapas con seguridad que no tiene ningún respaldo real.',
      'La brecha entre lo que crees que haces y lo que realmente haces se ve sin ningún esfuerzo.',
      'Eres el freno del equipo y lo saben todos menos tú, que sigues con tu autoconcepto intacto.',
      'Cuando alguien cuenta contigo ya está calculando cuánto va a tardar en rehacer tu parte.',
      'Tu curva de aprendizaje es tan plana que podría confundirse con el suelo de cualquier habitación.',
      'No eres un recurso. Eres un obstáculo con nombre y acceso.',
      'Hay gente sin talento que trabaja el doble para compensar. Tú ni eso te has planteado.',
      'Eres del tipo al que se le asignan tareas que no afectan a nada crítico. Por experiencia acumulada.',
      'Mediocre constante, sin un solo momento de excepción en el historial que alguien recuerde.',
    ],
    extreme: [
      'Tu nivel real se ve en los días malos. En los buenos cualquiera puede parecer bueno.',
      'Lo que tú haces con facilidad otros lo persiguen toda su vida sin alcanzarlo.',
      'Eres el ejemplo que se cita cuando alguien pregunta cómo se hace bien algo.',
      'Hay gente que lleva diez años intentando llegar donde tú ya estabas hace tres.',
      'Subes el listón de cualquier cosa en la que aparezcas, sin proponértelo.',
    ],
  },

  inteligencia: {
    name: 'inteligente',
    goodIsHigh: true,
    high: [
      'Tu cabeza procesa más rápido que la mayoría, y cuando hablas ya llevas tres pasos de ventaja.',
      'Ves lo que otros tardarán horas en ver, y cuando lo señalas ya estás en el siguiente problema.',
      'Llegas a conclusiones antes de que los demás terminen de formular la pregunta.',
      'Eres de los pocos que saben cuándo no saben. Eso es más difícil que saber.',
      'Tu forma de argumentar convence sin aplastar, y eso requiere más inteligencia que simplemente tener razón.',
      'Aprendes de todo, incluyendo lo que sale mal, y eso te pone por delante de forma constante.',
      'Tu silencio se interpreta como pasividad. Cuando hablas ya llevas la solución.',
      'Conectas ideas que nadie más conecta y de ahí sale algo útil casi siempre.',
      'No solo piensas rápido, piensas bien. Los dos juntos es una combinación que escasea.',
      'La gente sale de las conversaciones contigo con algo que no traía cuando entró.',
      'Tienes la claridad que la mayoría no va a desarrollar aunque lo intente toda su vida.',
      'Cuando decides entender algo, lo entiendes de verdad, no por encima como hace la mayoría.',
    ],
    mid: [
      'Inteligencia funcional para el día a día. Nada excepcional que comentar.',
      'Llegas a la conclusión correcta, pero llegas tarde. Casi siempre.',
      'Tu razonamiento es lineal y la mayoría de problemas reales no lo son.',
      'No eres lento, eres inconsistente. El resultado práctico es similar.',
      'Piensas bien cuando te lo propones. El problema es la frecuencia.',
      'Suficiente para no quedar en evidencia. Insuficiente para resolver nada complejo.',
    ],
    low: [
      'Tardas más en entender algo que en hacer el daño que luego hay que arreglar.',
      'Conviertes lo fácil en imposible solo con tocarlo. Es un talento inverso.',
      'Cuando la conversación sube un nivel, tú te quedas en el de abajo esperando que baje.',
      'Preguntas lo que acaban de explicar como si llevaras diez minutos llegando, aunque llevaras ahí desde el principio.',
      'La brecha entre lo que crees que entiendes y lo que entiendes de verdad es un problema documentado.',
      'No eres el que resuelve. Eres el que complica sin querer y luego pregunta por qué hay problemas.',
      'Tienes el tipo de lentitud que hace que la gente piense antes de incluirte en cualquier cosa que requiera rapidez.',
      'Eres el tipo que necesita que se lo expliquen con ejemplos y aun así hay dudas.',
      'Denso en cada conversación, sin distinción de tema ni de interlocutor.',
    ],
    extreme: [
      'Tienes una forma de pensar que la mayoría no va a desarrollar nunca aunque lo intente.',
      'No solo piensas rápido. Piensas bien. La combinación es escasísima en cualquier contexto.',
      'Dentro de diez años la gente va a recordar conversaciones contigo como de las que cambiaron algo.',
      'Tu inteligencia no es ruidosa. Simplemente funciona. Y eso es lo más difícil de conseguir.',
      'Hay gente con títulos que no llega donde tú llegas con curiosidad básica y ganas reales.',
    ],
  },

  feminidad: {
    name: 'femenina',
    goodIsHigh: true,
    high: [
      'Tienes una elegancia que no se aprende en ningún sitio. O se nace con ella o no se tiene.',
      'Tu feminidad no es una construcción ni un esfuerzo. Es quien eres, y la gente lo nota antes de que hables.',
      'La forma en que te mueves y hablas tiene una gracia que muy poca gente consigue aunque lo intente.',
      'Proyectas una calidez genuina que la gente percibe antes de que hayas dicho nada.',
      'Tienes ese equilibrio entre fuerza y suavidad que define lo que es verdaderamente elegante.',
      'Tu presencia tiene una suavidad que hace que todo sea más fácil alrededor tuyo.',
      'La gente a tu alrededor se comporta mejor cuando estás cerca, aunque no sepan por qué.',
      'Tu feminidad tiene solidez real. No depende del público ni del contexto ni del día.',
      'Hay personas que pasan la vida intentando proyectar lo que tú emites sin ningún esfuerzo.',
      'Tienes la elegancia que no se compra ni se aprende. La que no se va con los años.',
      'La delicadeza con la que manejas las cosas dice más de ti que cualquier cosa que puedas decir.',
    ],
    mid: [
      'Tu feminidad va y viene según el día, sin coherencia ni patrón.',
      'A veces elegante, a veces todo lo contrario. Sin que haya forma de saber cuál va a ser el de hoy.',
      'La elegancia te visita pero no se instala. Solo de paso.',
      'Regular en este aspecto. Sin virtud ni defecto que merezca mencionarse.',
      'Tu feminidad depende de quién tienes delante. Eso no es feminidad, es adaptación.',
    ],
    low: [
      'Tan delicada como una hormigonera a máxima potencia en un lunes de invierno.',
      'La elegancia y tú son conceptos que no han coincidido en tiempo ni en espacio.',
      'Tienes los modales de alguien criado en un entorno donde nadie los enseñó ni los exigió.',
      'La delicadeza te esquiva con una consistencia que ya parece deliberada.',
      'Si la feminidad fuera un examen, no llegarías al primer ejercicio.',
      'Tu feminidad es una leyenda que nadie ha podido confirmar con evidencia concreta.',
      'Proyectas la suavidad de un bloque de cemento recién vertido.',
      'La gracia que no tienes no se puede fingir, y lo que intentas fingir tampoco convence.',
    ],
    extreme: [
      'Tienes la feminidad real, la que no se menciona pero que todo el mundo nota cuando entras.',
      'Tu forma de ser tiene una elegancia que no se fabrica. La que queda cuando todo lo demás se va.',
      'Hay personas que llevan años intentando tener lo que tú llevas de serie.',
      'La presencia que tienes se queda en la memoria de quien te conoce aunque sea brevemente.',
    ],
  },

  masculinidad: {
    name: 'masculino',
    goodIsHigh: true,
    high: [
      'Tu masculinidad no necesita anunciarse porque se ve sin que hagas nada para mostrarlo.',
      'Tienes la solidez que la gente busca cuando necesita apoyarse en alguien de verdad.',
      'Proyectas seguridad que no viene de performance ni de cargo. Viene de dentro.',
      'Tu presencia genera tranquilidad en quien te rodea. Eso no se finge y no se aprende en un fin de semana.',
      'Eres de los que actúan cuando hay que actuar, sin esperar aprobación ni momento perfecto.',
      'Tienes la firmeza que no se rompe cuando las cosas se complican. Esa es la versión que importa.',
      'La gente te da lo serio. No lo fácil, lo serio. Eso no se regala, se gana.',
      'Tu masculinidad tiene profundidad. No es decoración ni fachada que desaparece bajo presión.',
      'Eres de los que resuelven sin quejarse. Eso te separa del noventa por ciento.',
      'Tienes el carácter que la gente busca cuando algo de verdad importa y hay que tomar una decisión.',
      'La templanza que tienes en los momentos difíciles es lo que te define, no los momentos fáciles.',
    ],
    mid: [
      'Tu masculinidad aparece cuando conviene y desaparece cuando hace falta. Exactamente al revés de lo que toca.',
      'Hay base pero no estructura. Y sin estructura todo se cae cuando hay presión real.',
      'Sólido en frío, inconsistente en caliente. El único problema es que en caliente es cuando importa.',
      'Tu seguridad depende de quién tienes delante. Eso no es seguridad, es actuación.',
      'A veces transmites firmeza, a veces todo lo contrario. Nadie sabe de cuál contar.',
    ],
    low: [
      'Tu masculinidad es una historia que te cuentas a ti mismo y que nadie más se cree.',
      'Proyectas la solidez de algo que ya estaba roto antes de que empezara la prueba.',
      'Tu firmeza dura lo que dura la ausencia de presión, que en tu caso no es mucho tiempo.',
      'Cuando se complica, eres el primero en buscar la salida lateral. Y todo el mundo ya lo sabe.',
      'Tu seguridad se rompe con una pregunta directa en tono normal sin ninguna hostilidad.',
      'Tienes el carácter de algo que no soporta el peso que se supone que tiene que soportar.',
      'La testosterona en tu caso es más leyenda que evidencia documentada.',
      'Tu masculinidad es aspiracional en el peor sentido del término.',
    ],
    extreme: [
      'Tienes la masculinidad real, la que no se anuncia porque no hace falta.',
      'La solidez que tienes no se finge ni se aprende. O se construye o no está.',
      'Tu manera de manejar la presión es lo que te define. Los momentos fáciles no dicen nada de nadie.',
      'Eres de los pocos que tienen el carácter que necesitan y no el que les conviene mostrar.',
      'La gente que ha contado contigo en momentos difíciles sabe lo que vale eso. Y vale mucho.',
    ],
  },

  // ===== NEGATIVOS =====

  gay: {
    name: 'gay',
    goodIsHigh: false,
    high: [
      'Ya no tienes ni la excusa de estar confundido. Llevas demasiado tiempo así para que esto siga siendo un misterio.',
      'La pluma que cargas no es ambigüedad. Es identidad. Y todo el mundo lo sabe menos tú.',
      'Tu masculinidad sobrevive lo justo para que puedas seguir mintiéndote. Cada vez menos.',
      'Sal del armario de una vez. Llevas tanto tiempo dentro que ya se nota desde fuera sin esfuerzo.',
      'Tu heterosexualidad existe solo en tus comunicados. Nadie más la ha visto nunca.',
      'Tan gay que tus amigos heteros ya no saben cómo gestionar lo que proyectas.',
      'Cada gesto tuyo es una declaración que ya no tiene vuelta atrás ni reinterpretación posible.',
      'Tu voz, tus gestos, tu manera de reaccionar, todo cuenta la misma historia que finges que no existe.',
      'El grupo lleva años esperando el comunicado oficial. Ya nadie se va a sorprender cuando llegue.',
      'Más obvio que la luz del día y con menos ganas de admitirlo que cualquiera que haya conocido.',
      'Te delatas en cada conversación y luego miras alrededor como si nadie hubiera visto nada.',
      'Tu masculinidad tiene el nivel de autenticidad de un billete de tres euros.',
      'Llevas la vida entera construyendo una fachada que a nadie engaña y que a ti te cuesta todo.',
      'El esfuerzo que haces por parecer hombre es visible para todo el mundo y creíble para nadie.',
      'Más gay que cualquier cosa que puedas citar como comparación. Sin margen de duda.',
      'Tu hoja de servicios heterosexual está en blanco por ambas caras, sin una sola entrada.',
      'Tan gay que hasta los bares temáticos te reconocen de vista sin que te hayas presentado.',
      'La lectura que tiene el grupo de ti es unánime y lleva tiempo sin necesitar debate.',
    ],
    mid: [
      'Algo se te mueve por dentro que no cuadra con la versión que das de ti mismo.',
      'Hay momentos en los que te delatas solo sin que nadie te haya preguntado absolutamente nada.',
      'El debate sobre ti en el grupo existe, es concreto, y tú no formas parte de él.',
      'Bisexual en negación activa, que es exactamente igual de gay para cualquier efecto práctico.',
      'A veces se te escapa algo que no deberías y luego finges que no ocurrió. Pero ocurrió.',
      'Tu historial tiene inconsistencias que cualquiera con dos dedos de frente ya ha interpretado.',
      'La lucha interna que tienes es pública aunque tú creas que la tienes bien guardada.',
      'Hay quien ya tiene una lectura tuya muy formada que no coincide con la que tú tienes.',
    ],
    low: [
      'Hetero sin matices ni asteriscos. Tu historial no tiene ningún apartado que necesite aclaración.',
      'Tu masculinidad no necesita defensa porque no hay nada que defender en ningún contexto.',
      'Las mujeres lo notan antes de que abras la boca. Eso no se aprende ni se fuerza.',
      'Tan heterosexual que ni la pregunta tiene sentido en tu caso.',
      'La lectura del grupo sobre ti no da pie a ningún debate y nunca lo ha dado.',
      'Proyectas lo que eres sin esfuerzo, y lo que eres aquí no deja margen de duda.',
    ],
    extreme: [
      'Llevas años construyendo una identidad que no te pertenece y pagando el precio en cada conversación.',
      'Todo el mundo a tu alrededor ya llegó a la misma conclusión. Tú eres el último en llegar.',
      'El día que lo aceptes vas a entender por qué todo ha sido tan costoso hasta ahora.',
      'Sigues eligiendo la versión más dolorosa de tu situación cuando tienes la alternativa delante.',
      'El problema no es lo que eres. El problema es lo que finges que eres y lo que eso te cuesta.',
      'Nadie te lo dice a la cara porque no quieren el drama. No porque tengan dudas.',
    ],
  },

  simp: {
    name: 'simp',
    goodIsHigh: false,
    high: [
      'Te has construido una vida entera alrededor de alguien que ni recuerda tu nombre cuando te nombran.',
      'Le das todo lo que tienes a alguien que te devuelve exactamente nada, y encima le llamas amor.',
      'Tu dignidad lleva tanto tiempo en el suelo que ya no la reconoces cuando la ves desde lejos.',
      'Le respondes al momento, le das sin que pida, le defiendes sin que ella te defienda. Y sigues sin entender por qué no funciona.',
      'Eres el plan de emergencia de alguien que tiene veinte opciones mejores antes de llegar a ti.',
      'La persona por la que te arrastras sabe exactamente lo que eres y por eso no te dice nada. Para qué, si ya lo demuestras tú solo.',
      'Te han metido en la friendzone y la has decorado con cuadros como si fuera tu casa definitiva.',
      'Llevas meses, quizás años, invirtiendo en algo que no te va a dar rendimiento nunca. Y ya lo sabes.',
      'Tu versión del amor es unilateral, constante, y completamente invisible para la otra persona.',
      'Le pagas, le defiendes, le escribes, le esperas. Ella no hace ninguna de las cuatro.',
      'Tu problema no es que nadie te quiera. Tu problema es que tú no te quieres lo suficiente como para exigirlo.',
      'Eres el tipo de persona que normaliza el mal trato porque la alternativa le da más miedo que el daño.',
      'Lleva suficiente tiempo sucediendo como para que ya no sea inocente. Es una elección repetida.',
      'Eres exactamente el tipo de ejemplo que aparece en los libros de psicología en el apartado que no quieres ser.',
      'Vas a llegar a un momento en el que mires atrás y no entiendas en qué estabas pensando. Ese momento todavía no ha llegado.',
      'Le das todo gratis a alguien que lo recibe como lo que es: obligatorio.',
      'Tu estrategia de estar disponible veinticuatro horas es el motivo exacto por el que no te toman en serio.',
      'Aceptas las migajas y encima das las gracias. Por eso te siguen tirando migajas.',
    ],
    mid: [
      'Sabes perfectamente lo que estás haciendo y lo haces igual. Eso ya no es inocencia.',
      'Tu dignidad existe pero tiene precio, y el precio baja cada semana que pasa.',
      'Conoces el límite, lo ves con claridad, y cada semana decides ignorarlo de todas formas.',
      'A ratos te respetas y a ratos no, y los ratos que no cada vez ocupan más espacio.',
      'Lo que llamas amor tiene todos los síntomas de otra cosa que no quieres nombrar.',
      'El patrón lleva suficiente tiempo repitiéndose como para que ya no sea casualidad.',
    ],
    low: [
      'Sabes lo que vales y no lo regalas. Eso es más raro de lo que parece en cualquier contexto.',
      'Digno, sin arrastrarte por nadie, con el amor propio suficiente para no necesitar aprobación.',
      'Cuando alguien no te trata como mereces, desapareces. Así funciona quien de verdad se respeta.',
      'No confundes disponibilidad con cariño ni atención con amor. Eso ya te pone por delante.',
      'Tu dignidad tiene un precio que nadie consigue bajar contándote cuentos. Eso vale.',
    ],
    extreme: [
      'Algún día vas a entender que nadie te puede querer si tú eres el primero que no lo hace.',
      'La persona de la que dependes no te va a salvar porque ella tampoco se ha salvado a sí misma.',
      'El tiempo que estás perdiendo en esto no vuelve. Y cuando pare, eso va a ser lo primero que notes.',
      'Llevas tanto tiempo buscando aprobación fuera que ya no sabes lo que eres cuando nadie te mira.',
    ],
  },

  rata: {
    name: 'rata',
    goodIsHigh: false,
    high: [
      'Eres desleal por naturaleza, no por circunstancias. No hay situación que lo justifique.',
      'Traicionas a la gente que confía en ti y luego buscas la manera de que parezca culpa de ellos.',
      'Tienes la información que no deberías tener y la usas en el momento en que más daño hace.',
      'Todo el mundo que te conoce bien ya decidió qué tipo de persona eres. Tú eres el único que no lo admite.',
      'Le mandas capturas a quien no debe, hablas mal de gente que te sonríe, cambias la versión según el contexto. Lo llaman falsedad. Tú lo llamas adaptarse.',
      'Eres el tipo en el que nadie mete nada importante porque ya saben lo que pasa después.',
      'Tu lealtad tiene precio y ese precio lo paga quien más te conviene en ese momento.',
      'La gente que te quería ya no te quiere. No es mala suerte. Es consecuencia de quién eres.',
      'Sonríes con la misma cara con la que hablas mal. Por eso nadie ya sabe cuándo eres real.',
      'Has quemado puentes que costaron años construir por beneficios que duraron semanas.',
      'Tu historial de relaciones es un patrón, no una coincidencia. Y el patrón siempre eres tú.',
      'Nadie te dice lo que piensa de ti porque aprendieron que lo que digan acaba en otro sitio.',
      'Te alejas de la gente cuando ya no te sirve y te acercas cuando vuelve a ser útil para algo.',
      'Tienes información de gente que confió en ti que usarías sin dudarlo si te beneficiara.',
      'Cambias de bando con más facilidad de la que cambias de opinión cuando tienes razón en algo.',
      'La gente del grupo ya ha decidido qué tipo de información te da. No es casualidad ni es injusto.',
      'Eres el tipo de persona con quien todo el mundo aprende a ser cuidadoso después de la primera vez.',
    ],
    mid: [
      'A veces eres de fiar y a veces no, y nadie sabe cuándo es cuál. Eso ya es ser poco de fiar.',
      'Traicionas cuando conviene lo suficiente como para que la gente cuide lo que te cuenta.',
      'Tienes instinto de supervivencia social que a veces pisa la lealtad y a veces la cruza sin pensarlo.',
      'Hay gente que ya ha decidido qué nivel de información te da. Eso no es paranoia, es experiencia.',
      'No eres rata de manual pero tienes los reflejos, y eso preocupa a quien te conoce bien.',
    ],
    low: [
      'Leal aunque pierda, fiel aunque no convenga. Eso tiene un precio y tú lo pagas sin quejarte.',
      'Lo que te cuentan se queda contigo. Por eso te dicen cosas que no le dicen a nadie.',
      'Tu palabra vale porque la cumples incluso cuando ya no es cómodo cumplirla.',
      'De los que dan la cara aunque pierdan algo haciéndolo. Eso escasea de verdad.',
      'La gente con lealtad real como la tuya se encuentra una vez cada mucho tiempo.',
    ],
    extreme: [
      'La soledad que viene no es mala suerte. Es la factura de lo que fuiste sembrando.',
      'Las personas que perdiste no vuelven. Y las que vienen no se van a quedar cuando te conozcan.',
      'Te van a tratar exactamente como tú has tratado a los demás, y vas a pensar que es injusto.',
      'Hay una versión de ti que podría tener relaciones reales. Pero esa versión requiere honestidad.',
      'Cuando ya no quede nadie, vas a recordar exactamente en qué momento tomaste cada una de las decisiones que te dejaron aquí.',
    ],
  },

  maricon: {
    name: 'maricon',
    goodIsHigh: false,
    high: [
      'Tan maricón que ya ni lo niegas con convicción, y la poca que metes no convence a nadie.',
      'Tu masculinidad es teatro mal ensayado y el público lleva tiempo sabiendo que es ficción.',
      'Cada gesto tuyo es un comunicado que nadie pidió pero que todos leen exactamente igual.',
      'No hay forma de reinterpretar lo que proyectas. La lectura es unánime y lleva tiempo siéndolo.',
      'Más pluma de la que podrías gestionar aunque quisieras, y ya has dejado de querer.',
      'La forma en que te mueves, hablas y reaccionas tiene una coherencia interna que no tiene nada que ver con lo que dices de ti mismo.',
      'Tu intento de parecer masculino lleva tiempo siendo cómico en vez de convincente.',
      'Tan obvio que los más despistados del grupo ya lo tienen claro desde hace meses.',
      'Llevas la pluma tan integrada que ya forma parte de tu forma de existir, no de tu forma de actuar.',
      'El grupo tiene una lectura de ti que no coincide con la que tú tienes de ti mismo.',
      'Tu masculinidad es una promesa que llevas años sin poder cumplir delante de nadie que te conozca bien.',
      'Cuando finges que eres de otra manera se nota el esfuerzo, y ese esfuerzo ya es la respuesta.',
      'Tu manera de andar, sentarte, gesticular, reaccionar. Todo apunta en la misma dirección.',
      'Más maricón que cualquier cosa que puedas poner como comparación en cualquier contexto.',
      'La fachada que mantienes cuesta más de lo que consigue, y cada vez cuesta más.',
      'Tienes más pluma que todo el grupo junto y aún no has procesado lo que eso significa.',
    ],
    mid: [
      'Hay momentos en los que se te escapa algo que no encaja con la versión que das de ti mismo.',
      'Ni muy muy ni tan tan, pero con señales suficientes como para que haya debate serio.',
      'Tu macho tiene fisuras que se notan cuando bajas la guardia, y la bajas con frecuencia.',
      'Finges que no existe algo que a ratos se ve sin que lo busques ni lo construyas.',
      'Hay gestos que repites sin darte cuenta y que el grupo tiene muy bien catalogados ya.',
    ],
    low: [
      'Tu masculinidad no se anuncia porque no hace falta. Se ve sola sin que hagas nada para mostrarlo.',
      'Tienes la solidez que la gente busca cuando algo de verdad importa y hay que apoyarse en alguien.',
      'Tan macho que genera silencio incómodo en los que no pueden decir lo mismo de sí mismos.',
      'Proyectas seguridad sin buscarlo, que es la única versión que convence de verdad.',
      'Tu masculinidad no es un esfuerzo ni una actuación. Es lo que eres sin pensarlo.',
    ],
    extreme: [
      'Nadie te lo dice a la cara porque no quieren el drama. No porque no lo vean.',
      'Llevas construyendo una fachada tanto tiempo que ya no sabes qué hay detrás de ella.',
      'El día que pares de fingir vas a entender por qué todo ha sido tan costoso hasta ahora.',
      'Hay personas en este grupo que te tienen más respeto del que imaginas. Solo esperan que tú llegues primero.',
      'La distancia entre lo que eres y lo que finges ser tiene un precio que pagas todos los días.',
    ],
  },

  friki: {
    name: 'friki',
    goodIsHigh: false,
    high: [
      'Tu vida cabe en una pantalla y en una colección de plástico que nadie más valora.',
      'Sabes más de mundos que no existen que de la realidad en la que vives. Y se nota en cada conversación.',
      'La última vez que hiciste algo memorable en el mundo real fue hace tanto que ya ni lo recuerdas.',
      'Tu vida social entera ocurre en chats con gente que no conoces y que tampoco te conoce a ti.',
      'Has intercambiado experiencias reales por contenido de consumo, y llevas tanto tiempo así que ya no ves la diferencia.',
      'Tus referencias son de series y videojuegos. Las de la gente a tu alrededor son de su vida.',
      'Coleccionas objetos de universos ficticios mientras tu vida real acumula polvo junto a ellos.',
      'La gente de tu edad tiene relaciones, viajes, anécdotas. Tú tienes horas en Steam y una estantería.',
      'Tu cuarto es un museo de cosas que le importan a muy poca gente fuera de foros específicos.',
      'A los cuarenta vas a ser exactamente esto pero con más polvo y menos excusas.',
      'Has construido una identidad entera alrededor del consumo de entretenimiento. No hay nada más allá.',
      'Te sientes incomprendido porque nadie comparte tus intereses. El problema es que reemplazaron tu personalidad.',
      'La persona que podrías ser si saliera al mundo existe. Pero lleva demasiado tiempo dentro.',
      'Tus amigos de pantalla no van a estar cuando algo real pase. Y algo real va a pasar.',
      'El sol no te reconoce porque llevas años evitando el encuentro. Él tampoco te echa de menos.',
      'Tu vida es un resumen de contenido consumido, no de experiencias vividas. Eso se nota.',
      'Cuanto más tiempo pasa, más difícil es salir y más cómodo es quedarse. Ya lo sabes.',
    ],
    mid: [
      'Sales a la calle lo suficiente para no ser un caso clínico, pero tus referencias dicen lo que eres cuando no sales.',
      'Friki con disimulo es lo mismo pero con hipocresía añadida.',
      'Tienes una vida, pero la mitad la vives en sitios que no existen y con gente que no conoces.',
      'Puedes mantener una conversación normal durante un rato. Luego se nota de dónde vienes.',
      'Friki de armario, que es igual de grave pero con más esfuerzo en negarlo.',
    ],
    low: [
      'Tienes una vida real, con experiencias que no caben en ninguna pantalla ni en ningún catálogo.',
      'Sales, conoces gente, acumulas cosas concretas que no se guardan en un disco duro.',
      'Tu identidad no depende de ningún universo ficticio ni de lo que consumes.',
      'Equilibrado, con referencias del mundo real y presencia en él cuando importa.',
      'Vives. No solo consumes. Esa diferencia es enorme aunque muy poca gente la nombre.',
    ],
    extreme: [
      'Cuando llegue el momento en que no puedas ignorar lo que has dejado de vivir, va a ser tarde para cambiar lo que tiene fecha de caducidad.',
      'La pantalla te va a decepcionar en el momento más importante. Las personas también, pero al menos eso es real.',
      'Llevas años en modo pausa esperando que llegue algo. No va a llegar hasta que salgas a buscarlo.',
      'El tiempo que llevas acumulando contenido es tiempo que no vuelve y que se va a notar.',
    ],
  },

  cerdo: {
    name: 'cerdo',
    goodIsHigh: false,
    high: [
      'La gente que entra a tu espacio lo recuerda como una experiencia que preferiría no haber tenido.',
      'Tu higiene es un problema activo para las personas que comparten contigo cualquier espacio cerrado.',
      'Tu nivel de suciedad no es descuido ni desorganización. Es una postura sobre cómo te tratas y cómo tratas a los que te rodean.',
      'Hueles a algo que debería tener nombre propio. La gente que está cerca lo sabe y no dice nada por educación.',
      'Tu espacio dice todo lo que necesito saber sobre cómo te valoras. Y no dice nada bueno.',
      'Dejas rastro en los sitios que visitas. El tipo de rastro que hace que la gente compruebe lo que tocas.',
      'La gente que ha comido en tu casa no ha vuelto. No es casualidad.',
      'Tu relación con el agua caliente y el jabón es menos frecuente de lo que cualquier sociedad considera aceptable.',
      'Eres el tipo de persona que baja el nivel de comodidad del espacio que ocupa sin hacer nada.',
      'Tu baño es un sitio al que la gente busca excusas para no entrar.',
      'Tu ropa ha estado en más situaciones de las que debería sin pasar por agua entre medias.',
      'La última vez que limpiaste a fondo fue porque tenías que hacerlo, no porque quisieras.',
      'Tu umbral de asco no comparte medidas con nadie más en un radio de diez metros.',
      'Comes como si nadie te estuviera mirando aunque haya gente mirando. Esa es exactamente la diferencia.',
      'Tu cama tiene capas que ya podrían datarse si alguien quisiera investigar su antigüedad.',
      'La nevera que tienes cuenta una historia de descuido activo que no tiene explicación aceptable.',
    ],
    mid: [
      'Tu higiene es situacional. Te cuidas cuando tienes que causar impresión. El resto del tiempo, no.',
      'Hay días buenos y días malos, y los malos son los que la gente recuerda y menciona.',
      'Tu nivel de limpieza depende de si tienes visita, no de cómo quieres vivir. Eso ya es suficiente.',
      'No llegas a desastre total pero el camino está clarísimo desde aquí.',
    ],
    low: [
      'Limpio, sin dejar rastro en los sitios que visitas ni problema en los que te rodean.',
      'Tu higiene no es motivo de conversación, y eso significa que funciona mejor de lo esperado.',
      'Presentable, cuidado, sin olor que comentar ni espacio que haya que explicar.',
      'La forma en que te tratas dice algo de cómo te valoras. En tu caso dice algo bueno.',
      'Tu nivel hace que la gente esté cómoda cerca de ti sin tener que pensarlo.',
    ],
    extreme: [
      'La forma en que tratas tu espacio y tu cuerpo es la forma en que te tratas a ti mismo. Y eso lo ven todos.',
      'No es que seas descuidado. Es que has decidido que tu estándar es este. Y ese estándar afecta a todos en tu radio.',
      'Hay una versión de ti que se respeta lo suficiente como para ducharse a diario. No aparece mucho.',
      'Cuando la gente habla de ti en tu ausencia, la higiene es uno de los temas que aparece.',
    ],
  },

  femboy: {
    name: 'femboy',
    goodIsHigh: false,
    biasHigh: true,
    high: [
      'Más femboy que cualquier cosa que puedas citar como comparación. Sin margen de ambigüedad.',
      'Tu masculinidad no se fue de vacaciones. Se fue y no dejó dirección ni número de contacto.',
      'Tienes más pluma que un evento de drag queens y menos excusa para negarlo que nadie.',
      'El universo te hizo femboy y tú lo llevas con una naturalidad que ya no admite debate.',
      'Tu guardarropa, tus gestos, tu voz, tu risa. Todo cuenta la misma historia y es la de un femboy.',
      'No hay ángulo desde el que esto se reinterprete de otra manera. La lectura es unánime.',
      'Eres el tipo de persona que se cita como ejemplo cuando alguien necesita explicar el concepto.',
      'Llevas la purpurina en el alma y se te nota en el andar, en la risa y en cada reacción involuntaria.',
      'Más femboy que cualquier categoría inventada para clasificarlo. Rompes los límites del concepto.',
      'Todo en ti apunta en la misma dirección. Una que tú prefieres ignorar pero que nadie más ignora.',
      'Tu masculinidad sobrevive lo justo para que puedas seguir mintiéndote. Cada vez menos.',
      'Tan femboy que los personajes de anime te envidian la coherencia estética.',
      'El grupo lleva tiempo con una lectura de ti que no necesitó votación para ser unánime.',
      'Lo que eres y lo que finges ser tienen una distancia que se ve desde lejos y desde cerca.',
      'Eres femboy de nivel clínico. No hay segunda opinión que cambie el diagnóstico.',
    ],
    mid: [
      'Hay algo en ti que no cuadra con la versión masculina que intentas proyectar.',
      'A veces se nota y a veces no, pero cuando se nota no hay forma de desnotarlo.',
      'Tienes gestos y reacciones que el grupo ya tiene catalogados aunque no te lo digan.',
      'Tu lado fem existe, lo sabe todo el que te conoce, y es más grande de lo que admites.',
      'Finges que no existe algo que se ve solo cuando no lo estás gestionando activamente.',
    ],
    low: [
      'Masculino, sin ambigüedad, sin elementos que generen debate en ningún contexto.',
      'Tu masculinidad funciona sin esfuerzo ni demostración. Eso es lo único que importa.',
      'Tan macho que no hay lectura alternativa ni debate posible en el grupo ni fuera de él.',
      'La lectura que el grupo tiene de ti es clara y no tiene fisuras desde ningún ángulo.',
      'Tu lado femenino no ha dado señales de vida en ningún contexto documentado.',
    ],
    extreme: [
      'El grupo lleva tiempo con una lectura de ti que no necesitó votación ni debate.',
      'Eres exactamente el tipo de ejemplo que se usa cuando alguien necesita ilustrar el concepto.',
      'Tu existencia en este espacio generó un consenso que no necesitó que nadie lo propusiera.',
      'Lo que eres y lo que finges ser tienen una distancia que se mide en cada conversación.',
      'Llevas tanto tiempo siendo femboy que ya ni te resulta raro, y eso es lo que lo hace definitivo.',
    ],
  },

  inutil: {
    name: 'inutil',
    goodIsHigh: false,
    high: [
      'Tu único talento demostrable es hacer el trabajo de los demás más complicado de lo que era antes de que llegaras.',
      'Prometes, no cumples, y encima buscas la justificación. El ciclo lleva repitiéndose el tiempo suficiente como para que ya nadie te tome en serio.',
      'La gente que trabaja contigo ha aprendido a rehacer tu parte antes de que tú termines la tuya.',
      'Tu autoconcepto y tu rendimiento real son dos cosas que no han coincidido en ningún punto conocido.',
      'Cuando te asignan algo, todos los que saben cómo eres ya están calculando el daño potencial.',
      'Eres el tipo de persona que hace que los proyectos tarden más, cuesten más y salgan peor.',
      'La brecha entre lo que crees que aportas y lo que realmente aportas no tiene corrección sin trabajo real.',
      'Estás donde estás porque la alternativa requiere esfuerzo, y el esfuerzo no es algo que hayas priorizado.',
      'Tu contribución en cualquier contexto oscila entre cero y negativa. Nadie espera más.',
      'Las personas que dependen de ti en algo importante ya tienen un plan B desde el primer momento.',
      'Eres del tipo al que se le dan tareas que no afectan a nada crítico. Por experiencia acumulada.',
      'Has confundido estar presente con contribuir, y llevas años creyendo que son lo mismo.',
      'El día que alguien sea brutalmente honesto contigo sobre tu rendimiento vas a descubrir lo que todo el mundo ya sabe.',
      'No te piden para nada que importe. No es casualidad ni es injusto.',
      'Llevas demasiado tiempo así como para que sea circunstancial. Es quién eres y cómo eliges funcionar.',
      'Tu aportación sube el tiempo de entrega, baja la calidad y aumenta el trabajo del resto. Consistentemente.',
    ],
    mid: [
      'Haces lo justo para no ser el problema sin llegar a ser parte de la solución.',
      'Funcionas en condiciones ideales. El problema es que las condiciones casi nunca son ideales.',
      'Tu rendimiento depende de tu estado de ánimo, y tu estado de ánimo es impredecible.',
      'Tienes capacidad real que usas de forma selectiva y en los momentos equivocados.',
      'Das lo mínimo para pasar sin que nadie te eche, sin aportar nada que nadie recuerde.',
    ],
    low: [
      'Capaz, confiable, sin necesitar que te lo repitan. Eso tiene valor real en cualquier contexto.',
      'Cuando algo importa, respondes. Eso no es poca cosa y no todo el mundo puede decirlo.',
      'La gente cuenta contigo para lo que de verdad importa. Eso es una posición que no se regala.',
      'Tu rendimiento es constante y sin sorpresas negativas. Exactamente lo que tiene precio.',
      'Cuando te asignan algo, no hay plan B necesario. Eso te pone por encima de la mayoría.',
    ],
    extreme: [
      'La distancia entre lo que podrías ser y lo que eres es una decisión que se repite cada día.',
      'Llevas demasiado tiempo así como para que sea circunstancial. Es quién eres.',
      'El día que alguien te diga la verdad sobre tu rendimiento vas a tener que decidir qué haces con ella.',
      'Todo el mundo que trabaja contigo tiene una opinión formada que tú desconoces y que ya no va a cambiar.',
      'Cuando te vayas de un proyecto, el proyecto va a respirar. Eso es lo que construiste.',
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
    const r = Math.random();
    if (senderIsOwner) {
      // 93% lo — owner casi nunca es femboy
      if (r < 0.93) percent = Math.floor(Math.random() * 31);
      else if (r < 0.98) percent = 31 + Math.floor(Math.random() * 39);
      else percent = 70 + Math.floor(Math.random() * 31);
    } else if (senderIsAdmin) {
      // 84% hi — admin también sale alto pero menos que miembro
      if (r < 0.84) percent = 70 + Math.floor(Math.random() * 31);
      else if (r < 0.96) percent = 31 + Math.floor(Math.random() * 39);
      else percent = Math.floor(Math.random() * 31);
    } else {
      // 95% hi — miembro casi siempre sale alto
      if (r < 0.95) percent = 70 + Math.floor(Math.random() * 31);
      else if (r < 0.99) percent = 31 + Math.floor(Math.random() * 39);
      else percent = Math.floor(Math.random() * 31);
    }
  } else {
    percent = rollPercent(cfg.goodIsHigh, senderIsAdmin, senderIsOwner);
  }
  const verdict = percent >= 70 ? pick(cfg.high) : percent <= 30 ? pick(cfg.low) : pick(cfg.mid);
  const showExtreme = percent >= 70 && cfg.extreme?.length;

  const text =
    `*@${target.split('@')[0]} es ${percent}% ${cfg.name}*\n\n` +
    `${verdict}` +
    (showExtreme ? `\n\n${pick(cfg.extreme)}` : '');

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
