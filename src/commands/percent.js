const { isOwner, isAdminInMeta, getTargetOrSelf } = require('../utils/wa');

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Distribuciones por tier — basadas en el ROL DEL TARGET, no del sender:
//
//                    │ alto ≥70% │ medio 31-69% │ bajo ≤30%
//  ─────────────────┼───────────┼──────────────┼──────────
//  Negativo miembro │   88 %    │    8 %       │    4 %
//  Negativo admin   │   78 %    │    14 %      │    8 %
//  Negativo owner   │    3 %    │    7 %       │   90 %
//  Positivo miembro │   15 %    │    30 %      │   55 %
//  Positivo admin   │   28 %    │    35 %      │   37 %
//  Positivo owner   │   92 %    │    6 %       │    2 %
function rollPercent(goodIsHigh, targetIsAdmin, targetIsOwner) {
  const rand = Math.random();
  const hi = () => 70 + Math.floor(Math.random() * 31);
  const mid = () => 31 + Math.floor(Math.random() * 39);
  const lo = () => Math.floor(Math.random() * 31);

  if (!goodIsHigh) {
    if (targetIsOwner) {
      if (rand < 0.90) return lo();
      if (rand < 0.97) return mid();
      return hi();
    }
    if (targetIsAdmin) {
      if (rand < 0.78) return hi();
      if (rand < 0.92) return mid();
      return lo();
    }
    if (rand < 0.88) return hi();
    if (rand < 0.96) return mid();
    return lo();
  } else {
    if (targetIsOwner) {
      if (rand < 0.92) return hi();
      if (rand < 0.98) return mid();
      return lo();
    }
    if (targetIsAdmin) {
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
      'Entras a un sitio y hay personas que pierden el hilo de lo que estaban diciendo. Eso no pasa por accidente.',
      'Tu físico genera reacciones involuntarias en quien te ve. No tienes que hacer nada para conseguirlo.',
      'Tienes el tipo de cara que los artistas copian y la gente recuerda años después sin haber hablado contigo.',
      'Tu atractivo no depende de la luz, de la ropa ni del ángulo. Está ahí siempre, y eso es lo más escaso.',
      'Eres de los que hacen que la gente revise sus estándares cuando los conoce en persona.',
      'La simetría que tienes se estudia y se ve poco. Tú la llevas de serie sin haber hecho nada para merecerla.',
      'Vistes lo que sea y conviertes la ropa en algo distinto sin que sea tu intención.',
      'Tu atractivo funciona igual en persona que en foto, y eso es una rareza real.',
      'La gente te mira y luego mira a sus parejas con una pregunta silenciosa que no van a verbalizar.',
      'Tienes lo que otros buscan en cirugías y tratamientos durante años sin llegar a conseguirlo.',
      'Hay personas que se arreglan una hora para lo que tú tienes al levantarte sin pensarlo.',
      'Tu cara tiene esa estructura que no se puede entrenar ni comprar. O se tiene o no se tiene.',
      'Eres exactamente el tipo de persona que arruina el día de alguien con solo cruzarse en la calle.',
    ],
    mid: [
      'Con buena luz y el filtro correcto pasas por interesante. Fuera de eso estás en el montón exacto.',
      'Ni feo ni guapo. Exactamente el perfil que nadie recuerda dos horas después.',
      'Tu físico no es un activo ni un problema. Simplemente está ahí, sin función concreta.',
      'Con un poco de esfuerzo podrías dar mucho más. Pero no lo haces y por eso estás aquí.',
      'Tu fotogenia depende completamente del filtro y del fotógrafo. Eso ya dice bastante.',
    ],
    low: [
      'La genética no invirtió en ti y se nota en cada ángulo, con cualquier luz y sin filtros.',
      'Tu mejor ángulo no existe. Lo has buscado durante años y no está.',
      'No eres feo, eres de los que necesitan personalidad fuerte para compensar. Si eso también falla, el panorama es oscuro.',
      'Hay caras que se olvidan al instante de verlas. La tuya tiene exactamente esa cualidad.',
      'Tu físico es un argumento contra la idea de que el universo tiene diseño inteligente.',
      'Si el físico fuera requisito de entrada a algún sitio, necesitarías una dispensa escrita.',
    ],
    extreme: [
      'Vas a arruinar muchos días sin proponértelo. Eso no todo el mundo puede decirlo.',
      'Quien acabe contigo va a tener que recordarse cada mañana la suerte que tiene.',
      'La gente coquetea contigo por inercia, sin haberlo decidido, y luego no sabe cómo explicarlo.',
    ],
  },

  crack: {
    name: 'crack',
    goodIsHigh: true,
    high: [
      'Cuando entregas algo no hay que revisarlo. Eso en cualquier contexto es el estándar más alto.',
      'Tu nivel intimida sin que lo busques, que es la única versión del nivel que importa de verdad.',
      'La gente cuenta contigo cuando algo de verdad importa. No cuando hay margen de error.',
      'Donde otros improvisan tú ejecutas. La diferencia entre los dos es todo.',
      'Tus errores son anécdota. Tus aciertos son patrón. Eso ya lo dice todo.',
      'Llegas a sitios donde la mayoría ni aspira a llegar, y lo haces sin necesitar que nadie lo note.',
      'Tu nombre en un proyecto cambia las expectativas de lo que puede salir de él.',
      'Tienes esa fiabilidad que en cualquier mercado real tiene precio alto y escasez garantizada.',
      'La gente se fija en cómo lo haces para aprender, aunque nunca te lo digan.',
      'Tu trabajo lo defiende solo. No necesitas explicarlo ni venderlo.',
      'Lo que para otros es techo para ti es donde empieza el problema interesante.',
      'Llevas a cualquier equipo a un nivel distinto sin que te lo pidan ni lo propongas.',
    ],
    mid: [
      'Capacidad tienes. Ganas, no siempre. Y esa diferencia se ve en todo lo que produces.',
      'Llegas a correcto. Nunca a sobresaliente. La distancia entre los dos es completamente mental.',
      'Funcionas bien cuando quieres. El problema es que casi nunca quieres de verdad.',
      'Das lo justo para no fallar. Nunca lo que podrías dar. Eso ya es tu límite autoimpuesto.',
      'Suficiente para pasar, insuficiente para que nadie te recuerde por nada concreto.',
    ],
    low: [
      'No tienes nivel y lo tapas con seguridad que no tiene ningún respaldo real.',
      'La brecha entre lo que crees que haces y lo que realmente haces se ve sin ningún esfuerzo.',
      'Eres el freno del equipo y lo saben todos menos tú, que sigues con el autoconcepto intacto.',
      'Cuando alguien cuenta contigo ya está calculando cuánto va a tardar en rehacer tu parte.',
      'Mediocre constante, sin un solo momento de excepción en el historial que alguien recuerde.',
      'Hay gente sin talento que trabaja el doble para compensar. Tú ni eso te has planteado.',
    ],
    extreme: [
      'Lo que tú haces con facilidad otros lo persiguen toda su vida sin alcanzarlo.',
      'Eres el ejemplo que se cita cuando alguien pregunta cómo se hace bien algo.',
      'Subes el listón de cualquier cosa en la que aparezcas, sin proponértelo.',
    ],
  },

  inteligencia: {
    name: 'inteligente',
    goodIsHigh: true,
    high: [
      'Tu cabeza procesa más rápido que la mayoría y cuando hablas ya llevas tres pasos de ventaja.',
      'Ves lo que otros tardan horas en ver, y cuando lo señalas ya estás en el siguiente problema.',
      'Llegas a conclusiones antes de que los demás terminen de formular la pregunta.',
      'Eres de los pocos que saben cuándo no saben. Eso es más difícil que saber.',
      'Tu forma de argumentar convence sin aplastar, y eso requiere más inteligencia que simplemente tener razón.',
      'Aprendes de todo, incluyendo lo que sale mal, y eso te pone por delante de forma constante.',
      'Conectas ideas que nadie más conecta y de ahí sale algo útil casi siempre.',
      'No solo piensas rápido, piensas bien. Los dos juntos es una combinación que escasea.',
      'La gente sale de las conversaciones contigo con algo que no traía cuando entró.',
      'Tienes la claridad que la mayoría no va a desarrollar aunque lo intente toda su vida.',
      'Cuando decides entender algo lo entiendes de verdad, no por encima como hace la mayoría.',
      'Tu silencio se interpreta como pasividad. Cuando hablas ya llevas la solución.',
    ],
    mid: [
      'Inteligencia funcional para el día a día. Nada excepcional que comentar.',
      'Llegas a la conclusión correcta pero llegas tarde. Casi siempre.',
      'Tu razonamiento es lineal y la mayoría de problemas reales no lo son.',
      'Piensas bien cuando te lo propones. El problema es la frecuencia con que te lo propones.',
      'Suficiente para no quedar en evidencia. Insuficiente para resolver nada complejo.',
    ],
    low: [
      'Tardas más en entender algo que en hacer el daño que luego hay que arreglar.',
      'Conviertes lo fácil en imposible solo con tocarlo. Eso también es un talento, aunque inverso.',
      'Preguntas lo que acaban de explicar como si llevaras diez minutos llegando, aunque llevaras ahí desde el principio.',
      'La brecha entre lo que crees que entiendes y lo que entiendes de verdad es un problema documentado.',
      'Eres el tipo que necesita que se lo expliquen con ejemplos y aun así quedan dudas.',
      'Denso en cada conversación, sin distinción de tema ni de interlocutor.',
    ],
    extreme: [
      'Tienes una forma de pensar que la mayoría no va a desarrollar nunca aunque lo intente.',
      'Dentro de diez años la gente va a recordar conversaciones contigo como de las que cambiaron algo.',
      'Tu inteligencia no es ruidosa. Simplemente funciona. Y eso es lo más difícil de conseguir.',
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
      'Tu feminidad tiene solidez real. No depende del público ni del contexto ni del día.',
      'Hay personas que pasan la vida intentando proyectar lo que tú emites sin ningún esfuerzo.',
      'Tienes la elegancia que no se compra ni se aprende. La que no se va con los años.',
      'La delicadeza con la que manejas las cosas dice más de ti que cualquier cosa que puedas decir.',
    ],
    mid: [
      'Tu feminidad va y viene según el día, sin coherencia ni patrón que nadie pueda seguir.',
      'A veces elegante, a veces todo lo contrario. Sin forma de saber cuál va a ser el de hoy.',
      'La elegancia te visita pero no se instala. Solo de paso.',
      'Tu feminidad depende de quién tienes delante. Eso no es feminidad, es adaptación.',
    ],
    low: [
      'Tan delicada como una hormigonera a máxima potencia en un lunes de invierno.',
      'La elegancia y tú son conceptos que no han coincidido en tiempo ni en espacio documentado.',
      'Si la feminidad fuera un examen, no llegarías al primer ejercicio con los materiales correctos.',
      'Tu feminidad es una leyenda que nadie ha podido confirmar con evidencia concreta.',
      'Proyectas la suavidad de un bloque de cemento recién vertido en condiciones adversas.',
      'La gracia que no tienes no se puede fingir, y lo que intentas fingir tampoco convence a nadie.',
    ],
    extreme: [
      'Tienes la feminidad real, la que no se menciona pero que todo el mundo nota cuando entras.',
      'Tu forma de ser tiene una elegancia que no se fabrica. La que queda cuando todo lo demás se va.',
      'La presencia que tienes se queda en la memoria de quien te conoce aunque sea brevemente.',
    ],
  },

  masculinidad: {
    name: 'masculino',
    goodIsHigh: true,
    high: [
      'Tu masculinidad no necesita anunciarse porque se ve sin que hagas nada para mostrarlo.',
      'Tienes la solidez que la gente busca cuando algo de verdad importa y hay que apoyarse en alguien.',
      'Proyectas seguridad que no viene de performance ni de cargo. Viene de dentro.',
      'Tu presencia genera tranquilidad en quien te rodea. Eso no se finge ni se aprende en un fin de semana.',
      'Eres de los que actúan cuando hay que actuar, sin esperar aprobación ni momento perfecto.',
      'Tienes la firmeza que no se rompe cuando las cosas se complican. Esa es la versión que importa.',
      'La gente te da lo serio. No lo fácil, lo serio. Eso no se regala, se gana.',
      'Tu masculinidad tiene profundidad. No es decoración ni fachada que desaparece bajo presión.',
      'Eres de los que resuelven sin quejarse. Eso te separa del noventa por ciento.',
      'La templanza que tienes en los momentos difíciles es lo que te define, no los momentos fáciles.',
    ],
    mid: [
      'Tu masculinidad aparece cuando conviene y desaparece cuando hace falta. Exactamente al revés.',
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
      'La testosterona en tu caso es más leyenda que evidencia documentada.',
    ],
    extreme: [
      'Tienes la masculinidad real, la que no se anuncia porque no hace falta.',
      'Tu manera de manejar la presión es lo que te define. Los momentos fáciles no dicen nada de nadie.',
      'Eres de los pocos que tienen el carácter que necesitan y no el que les conviene mostrar.',
    ],
  },

  // ===== NEGATIVOS =====

  gay: {
    name: 'gay',
    goodIsHigh: false,
    high: [
      'Eres gay y lo saben todos menos tú, que llevas años siendo el último en enterarse de lo que ya es público.',
      'Tus gestos, tu voz, tu manera de reaccionar. Todo cuenta la misma historia que llevas años negando.',
      'El armario en el que sigues metido tiene más años que tú y ya no engaña a nadie de este grupo.',
      'Tan gay que hasta cuando lo niegas se nota que lo estás negando con demasiado esfuerzo.',
      'Tu heterosexualidad es el chiste más largo que ha producido este grupo y sigue siendo gracioso.',
      'Llevas tanto tiempo fingiendo que ya ni tú te crees la historia que te has montado.',
      'La pluma que cargas no es ambigüedad. Es identidad. Uno de los dos aún no lo ha procesado.',
      'Tu masculinidad existe solo en el relato que haces de ti mismo y en ningún otro sitio observable.',
      'Todos en este grupo llegaron a la misma conclusión hace meses. Tú sigues en el punto de partida.',
      'Sal del armario ya, que llevas tanto tiempo dentro que ya le has puesto muebles y cuadros.',
      'El único misterio que sigues siendo es para ti mismo. Para el resto está clarísimo desde hace tiempo.',
      'Tan obvio que cuando entras a un sitio la gente no necesita que te presentes para saber quién eres.',
      'Tu heterosexualidad es la obra de ficción más sostenida que has producido en toda tu vida.',
      'Gay con todas las letras, en negrita, sin footnote posible ni argumento que lo matice.',
      'Llevas construyendo esa fachada tanto tiempo que ya ni recuerdas cómo eras antes de empezar.',
      'Tu masculinidad sobrevive lo justo para que puedas seguir mintiéndote cada mañana al levantarte.',
    ],
    mid: [
      'No está del todo confirmado pero hay señales suficientes para que haya debate serio en el grupo.',
      'Hay algo en ti que no encaja con la versión que das de ti mismo y no es solo un día malo.',
      'El grupo tiene una teoría sobre ti que no necesitó mucho debate para formarse.',
      'A veces se nota tanto que ya ni hace falta buscarlo activamente.',
      'Bisexual en negación activa, que para efectos prácticos es lo mismo.',
      'Tu historia no cuadra del todo y la gente que te conoce ya lo sabe aunque no lo diga.',
    ],
    low: [
      'Hetero sin debate, sin señales, sin nada que comentar desde este ángulo.',
      'Tu masculinidad no tiene fisuras documentadas. Lo que proyectas no da lugar a segunda lectura.',
      'Tan heterosexual que el concepto se queda corto en tu caso.',
      'Las mujeres lo notan en cuanto entras. Eso no se puede fingir ni entrenar.',
      'Cero ambigüedad, cero señales, todo claro.',
    ],
    extreme: [
      'Nadie te lo dice a la cara para ahorrarse el drama, no porque tengan dudas sobre ti.',
      'Cuando pares de fingir vas a entender por qué todo ha sido tan costoso hasta ahora.',
      'La versión que das de ti mismo no va a sobrevivir mucho más tiempo. Y en el fondo ya lo sabes.',
    ],
  },

  simp: {
    name: 'simp',
    goodIsHigh: false,
    high: [
      'Le escribes al momento, le defiendes sin que te lo pida, le das sin que te dé nada. Y encima lo llamas querer.',
      'Eres el plan Z de alguien que tiene veinte opciones antes de llegar a ti, y sigues esperando tu turno.',
      'Tu dignidad lleva tanto tiempo en el suelo que ya dejaste de intentar recogerla.',
      'Le haces favores a alguien que ni recuerda tu nombre cuando alguien te menciona en su presencia.',
      'Estás tan metido en la friendzone que ya le has puesto paredes, cuadros y un felpudo en la entrada.',
      'Te tienen de comodín, de apoyo emocional gratuito, de opción de última hora. Tú lo llamas conexión especial.',
      'Le pides migajas de atención y cuando te las dan das las gracias. Por eso solo te tiran migajas.',
      'Tu disponibilidad total es el motivo exacto por el que no te toman en serio. Cuanto más das, menos vales.',
      'Llevas meses, quizás años, invirtiendo tiempo, dinero y energía en alguien que no te ve ni cuando te tiene delante.',
      'Aceptas el trato que tienes porque la alternativa de no tenerlo te da más miedo que el daño que te hace.',
      'Le contestas en treinta segundos, ella te contesta cuando le apetece. Y sigues sin entender la dinámica.',
      'Eres de los que aguantan cualquier cosa por no perder algo que ya perdieron hace tiempo.',
      'Tu problema no es que nadie te quiera. Es que tú eres el primero que no se quiere lo suficiente para exigirlo.',
      'Tanto esfuerzo invertido en alguien que te ve como un recurso disponible y no como una persona.',
      'Sigues apostando por alguien que ya te mostró exactamente cómo te valora. Y aun así no te mueves.',
    ],
    mid: [
      'Sabes exactamente lo que estás haciendo y lo haces igual. Eso ya no es inocencia.',
      'Tu dignidad existe pero tiene precio y ese precio lleva bajando un tiempo.',
      'El patrón lleva suficiente tiempo repitiéndose como para que ya no sea casualidad.',
      'A ratos te respetas y a ratos no, y los ratos que no cada vez ocupan más espacio.',
      'Conoces el límite, lo ves, y cada semana decides no moverse de donde estás.',
    ],
    low: [
      'Sabes lo que vales y no lo regalas. Eso es más raro de lo que parece.',
      'Cuando alguien no te trata como mereces, te vas. Así funciona quien se respeta.',
      'No confundes disponibilidad con cariño ni atención con amor. Eso ya pone en ventaja.',
      'Tu dignidad tiene un precio que nadie consigue bajar con cuentos ni con promesas.',
      'Digno, sin arrastrarte, sin necesitar aprobación de nadie para saber lo que vales.',
    ],
    extreme: [
      'El tiempo que llevas perdiendo en esto no vuelve. Y cuando pare, eso va a ser lo primero que notes.',
      'Algún día vas a entender que nadie puede quererte si tú eres el primero que no lo hace.',
      'La persona de la que dependes no te va a salvar porque ella tampoco se ha salvado a sí misma.',
    ],
  },

  rata: {
    name: 'rata',
    goodIsHigh: false,
    high: [
      'Eres el tipo de persona con quien todos aprenden a ser cuidadosos después de la primera vez.',
      'La información que te dan llega filtrada porque la gente ya sabe lo que haces con ella.',
      'Traicionas cuando te conviene y luego buscas la manera de que parezca culpa del traicionado.',
      'Tu lealtad tiene precio y ese precio lo paga quien más te conviene en cada momento.',
      'Cambias de bando con más facilidad de la que cambias de opinión cuando tienes razón en algo.',
      'Sonríes con la misma cara con la que hablas mal de alguien. Por eso ya nadie sabe cuándo eres real.',
      'Has quemado puentes que costaron años construir por beneficios que duraron semanas.',
      'Te acercas a la gente cuando te sirve y desapareces cuando ya no les necesitas.',
      'Todo el mundo que te conoce bien ya decidió qué tipo de persona eres. Solo tú sigues con la historia.',
      'Tienes información de gente que confió en ti que usarías sin dudar si te beneficiara lo suficiente.',
      'Nadie te dice lo que piensa porque aprendieron que lo que dices acaba en otro sitio.',
      'Tu historial de relaciones es un patrón, no una coincidencia. Y el patrón siempre eres tú.',
      'La gente del grupo ya decidió qué nivel de información te da. No es paranoia, es experiencia acumulada.',
      'Le mandas capturas a quien no debe, hablas mal de quien te sonríe a la cara. Lo llamas ser sincero.',
      'Eres exactamente el tipo de persona que hace que la gente revise lo que te cuenta antes de contarlo.',
    ],
    mid: [
      'A veces eres de fiar y a veces no, y nadie sabe cuándo es cuál. Eso ya es ser poco de fiar.',
      'Traicionas cuando conviene lo suficiente como para que la gente cuide lo que te cuenta.',
      'No eres rata de manual pero tienes los reflejos. Y eso preocupa a quien te conoce bien.',
      'Tu instinto de supervivencia social a veces pisa la lealtad. Y a veces la cruza directamente.',
      'Hay gente en el grupo que ya decidió qué te cuenta. No es paranoia, es haber aprendido.',
    ],
    low: [
      'Leal aunque pierda, fiel aunque no convenga. Hay gente que lo tiene y hay gente que no.',
      'Lo que te cuentan se queda contigo. Por eso te dicen cosas que no le dicen a nadie más.',
      'Tu palabra vale porque la cumples incluso cuando ya no es cómodo cumplirla.',
      'De los que dan la cara aunque haya algo que perder haciéndolo. Eso escasea.',
      'Alguien con lealtad real como la tuya se encuentra muy pocas veces en la vida.',
    ],
    extreme: [
      'La soledad que viene no es mala suerte. Es la factura de lo que fuiste sembrando.',
      'Las personas que perdiste no vuelven. Y las que vengan tampoco se quedan cuando te conozcan.',
      'Cuando ya no quede nadie, vas a recordar exactamente en qué momento tomaste cada decisión que te dejó aquí.',
    ],
  },

  maricon: {
    name: 'maricon',
    goodIsHigh: false,
    high: [
      'Tu masculinidad es una obra de teatro mal ensayada que el público lleva tiempo sabiendo que es ficción.',
      'Tan maricón que cuando entras a un sitio la gente reajusta sus expectativas en tiempo real.',
      'Tu intento de parecer masculino lleva tiempo siendo más cómico que convincente para cualquiera.',
      'Más pluma de la que puedes gestionar aunque quisieras, y ya dejaste de querer hace tiempo.',
      'La forma en que te mueves, hablas y reaccionas tiene una coherencia interna que dice más que tú.',
      'Tan obvio que hasta los más despistados del grupo lo tienen claro desde hace meses.',
      'Tu masculinidad existe solo en el relato que haces de ti mismo. En ningún otro sitio observable.',
      'Llevas la pluma tan integrada que ya forma parte de tu forma de existir, no de actuar.',
      'Cada gesto tuyo es un comunicado que nadie pidió pero que todos leen exactamente igual.',
      'Cuando finges ser de otra manera se nota el esfuerzo, y ese esfuerzo ya es la respuesta.',
      'Más maricón que cualquier comparación que se te ocurra ponerle. Sin margen de maniobra.',
      'La fachada que mantienes cuesta más de lo que consigue y cada vez cuesta más mantenerla.',
      'Tu manera de andar, sentarte, gesticular. Todo apunta en la misma dirección sin que hagas nada.',
      'Tienes más pluma que todo el grupo junto y aún no has procesado lo que eso implica.',
      'El grupo lleva tiempo con una lectura de ti que no necesitó votación para ser unánime.',
    ],
    mid: [
      'Hay momentos en que se te escapa algo que no encaja con la versión que das de ti mismo.',
      'Tu macho tiene fisuras que se ven cuando bajas la guardia, y la bajas con frecuencia.',
      'Ni muy macho ni muy maricón, pero con suficientes señales como para que haya debate.',
      'Finges que no existe algo que a ratos se ve sin que lo busques ni lo construyas.',
      'El grupo tiene tus gestos catalogados aunque no te lo hayan dicho todavía.',
    ],
    low: [
      'Tu masculinidad no se anuncia porque no hace falta. Se ve sola sin que hagas nada.',
      'Tienes la solidez que la gente busca cuando algo de verdad importa.',
      'Tan macho que genera incomodidad silenciosa en los que no pueden decir lo mismo de sí mismos.',
      'Proyectas seguridad sin buscarlo, que es la única versión que convence de verdad.',
      'Tu masculinidad no es un esfuerzo ni una actuación. Es lo que eres sin pensarlo.',
    ],
    extreme: [
      'Nadie te lo dice a la cara porque no quieren el drama. No porque no lo vean.',
      'Llevas construyendo esa fachada tanto tiempo que ya no sabes qué hay detrás.',
      'El día que pares de fingir vas a entender por qué todo ha costado tanto hasta ahora.',
    ],
  },

  friki: {
    name: 'friki',
    goodIsHigh: false,
    high: [
      'Tu vida cabe en una pantalla y en una estantería de plástico que nadie más valoraría.',
      'Sabes más de mundos que no existen que de la realidad en la que vives, y se nota en cada conversación.',
      'La última vez que viviste algo memorable en el mundo real fue hace tanto que ya ni lo recuerdas.',
      'Tu vida social entera ocurre en chats con gente que no conoces y que tampoco te conoce a ti.',
      'Has cambiado experiencias reales por contenido de consumo y llevas tanto tiempo así que ya no ves la diferencia.',
      'Tus referencias son de series y videojuegos. Las de la gente que te rodea son de su propia vida.',
      'Coleccionas objetos de universos ficticios mientras tu vida real acumula polvo junto a ellos.',
      'La gente de tu edad tiene relaciones, viajes, anécdotas. Tú tienes horas en Steam y una estantería.',
      'Has construido una identidad entera alrededor del consumo de entretenimiento. No hay nada más allá.',
      'Te sientes incomprendido porque nadie comparte tus intereses. El problema es que esos intereses reemplazaron tu personalidad.',
      'La persona que podrías ser si salieras al mundo existe. Pero lleva demasiado tiempo encerrada dentro.',
      'El sol no te reconoce porque llevas años evitando el encuentro. Él tampoco te echa de menos.',
      'Tu vida es un resumen de contenido consumido, no de cosas vividas. Eso se nota cuando hablas.',
      'A los cuarenta vas a ser exactamente esto pero con más polvo en la estantería y menos excusas.',
      'Cuanto más tiempo pasa, más difícil es salir y más cómodo es quedarse. Y tú ya lo sabes.',
    ],
    mid: [
      'Sales lo suficiente para no ser un caso clínico, pero tus referencias dicen de dónde vienes.',
      'Friki con disimulo es lo mismo pero con hipocresía añadida encima.',
      'Tienes vida, pero la mitad la vives en sitios que no existen y con gente que no conoces.',
      'Puedes mantener una conversación normal durante un rato. Luego se nota de dónde vienen tus referencias.',
      'Friki de armario, que es igual de grave pero con más esfuerzo en negarlo.',
    ],
    low: [
      'Tienes una vida real, con experiencias que no caben en ninguna pantalla.',
      'Sales, conoces gente, tienes anécdotas concretas que no vienen de ninguna ficción.',
      'Equilibrado, con referencias del mundo real y presencia en él cuando importa.',
      'Tu identidad no depende de ningún universo ficticio ni de lo que consumes.',
      'Vives. No solo consumes. Esa diferencia es más grande de lo que parece.',
    ],
    extreme: [
      'La pantalla te va a decepcionar en el momento más importante. Las personas también, pero al menos eso es real.',
      'Cuando llegue el momento en que no puedas ignorar lo que has dejado de vivir, ya será tarde para lo que tiene fecha.',
      'Llevas años en modo pausa esperando que llegue algo. No va a llegar hasta que salgas a buscarlo.',
    ],
  },

  cerdo: {
    name: 'cerdo',
    goodIsHigh: false,
    high: [
      'Tu higiene es un problema activo para cualquiera que comparta contigo cualquier espacio cerrado.',
      'La gente que entra a tu casa lo recuerda como una experiencia que preferiría no haber tenido.',
      'Dejas rastro en los sitios que visitas. El tipo de rastro que hace que la gente compruebe lo que tocas.',
      'Tu relación con el agua caliente y el jabón es menos frecuente de lo que cualquier civilización considera aceptable.',
      'Hueles a algo que debería tener nombre propio. La gente que está cerca lo sabe y no dice nada por educación.',
      'Tu espacio dice todo lo que necesito saber sobre cómo te valoras a ti mismo. Y no dice nada bueno.',
      'La gente que ha comido en tu casa no ha vuelto. No es coincidencia ni mala suerte.',
      'Eres el tipo de persona que baja el nivel de comodidad de cualquier espacio que ocupa.',
      'Tu baño es un sitio al que la gente busca excusas para no entrar cuando está en tu casa.',
      'Tu ropa ha estado en más situaciones de las que debería sin pasar por agua entre medias.',
      'La última vez que limpiaste a fondo fue porque no te quedó otra, no porque quisieras.',
      'Tu umbral de asco no comparte medidas con nadie más en un radio de diez metros.',
      'Tu cama tiene capas geológicas que podrían datarse si alguien quisiera investigarlas.',
      'Comes como si nadie te estuviera mirando aunque haya gente mirándote. Esa es exactamente la diferencia.',
      'La nevera que tienes cuenta una historia de descuido activo que no tiene justificación posible.',
    ],
    mid: [
      'Tu higiene es situacional. Te cuidas cuando tienes que causar impresión. El resto del tiempo, no.',
      'Hay días buenos y días malos, y los malos son los que la gente recuerda y menciona después.',
      'Tu nivel de limpieza depende de si tienes visita, no de cómo quieres vivir.',
      'No llegas a desastre total pero el camino desde donde estás es clarísimo.',
    ],
    low: [
      'Limpio, sin dejar rastro en los sitios que visitas ni problema en los que te rodean.',
      'Tu higiene no es motivo de conversación, y eso significa que funciona.',
      'Presentable, cuidado, sin olor que comentar ni espacio que haya que explicar.',
      'La forma en que te tratas dice algo de cómo te valoras. En tu caso dice algo bueno.',
      'Tu nivel hace que la gente esté cómoda cerca de ti sin tener que pensarlo.',
    ],
    extreme: [
      'La forma en que tratas tu cuerpo y tu espacio es la forma en que te tratas a ti mismo. Y eso lo ven todos.',
      'No es que seas descuidado. Es que decidiste que este es tu estándar. Y ese estándar le afecta a todos en tu radio.',
      'Cuando la gente habla de ti en tu ausencia, la higiene es uno de los primeros temas que aparece.',
    ],
  },

  femboy: {
    name: 'femboy',
    goodIsHigh: false,
    high: [
      'Tu masculinidad no se fue de vacaciones. Se fue y no dejó ni número de contacto.',
      'Más femboy que cualquier personaje de anime que hayas citado como comparación. Y sin el dibujo.',
      'Llevas la purpurina en el alma y se nota en el andar, en la voz y en cada reacción involuntaria.',
      'El universo te hizo femboy y tú lo llevas con una naturalidad que ya no admite debate.',
      'Tu guardarropa, tus gestos, tu voz, tu risa. Todo cuenta la misma historia sin excepción.',
      'No hay ángulo desde el que esto se reinterprete de otra manera. La lectura es unánime.',
      'Eres el tipo de persona que se cita como ejemplo cuando alguien necesita ilustrar el concepto.',
      'Tan femboy que los personajes de anime te envidian la coherencia estética.',
      'Lo que eres y lo que finges ser tienen una distancia que se ve desde lejos y desde cerca igual.',
      'Femboy de nivel clínico. No hay segunda opinión que cambie el diagnóstico.',
      'Más pluma que un evento de drag queens y menos excusa para negarlo que nadie en este grupo.',
      'El grupo lleva tiempo con una lectura de ti que no necesitó votación para ser unánime.',
      'Tu masculinidad sobrevive lo justo para que puedas seguir mintiéndote cada mañana.',
      'Tan femboy que hasta cuando intentas ser macho parece un papel secundario mal interpretado.',
      'Tu lado femenino no es un rasgo. Es la característica definitoria que nadie tiene que señalar porque se ve sola.',
    ],
    mid: [
      'Hay algo en ti que no cuadra con la versión masculina que intentas proyectar.',
      'A veces se nota y a veces no, pero cuando se nota no hay forma de no haberlo visto.',
      'Tienes gestos y reacciones que el grupo ya tiene catalogados aunque no te lo hayan dicho.',
      'Tu lado fem existe, lo sabe todo el que te conoce, y es más grande de lo que admites.',
      'Finges que no existe algo que se ve solo cuando dejas de gestionarlo activamente.',
    ],
    low: [
      'Masculino, sin ambigüedad, sin elementos que generen debate en ningún contexto conocido.',
      'Tu masculinidad funciona sin esfuerzo ni demostración. Eso es lo único que importa.',
      'Tan macho que no hay lectura alternativa posible ni debate que valga la pena.',
      'La lectura que el grupo tiene de ti es clara y no tiene fisuras desde ningún ángulo.',
      'Tu lado femenino no ha dado señales de vida en ningún contexto documentado.',
    ],
    extreme: [
      'Eres exactamente el tipo de ejemplo que se usa cuando alguien necesita ilustrar el concepto.',
      'Lo que eres y lo que finges ser tienen una distancia que se mide en cada conversación.',
      'Llevas tanto tiempo siendo femboy que ya ni te resulta raro, y eso es lo que lo hace definitivo.',
    ],
  },

  inutil: {
    name: 'inutil',
    goodIsHigh: false,
    high: [
      'Tu único talento demostrable es hacer el trabajo de los demás más complicado de lo que era antes.',
      'Prometes, no cumples, y encima buscas la justificación. El ciclo lleva suficiente tiempo como para que nadie te tome en serio.',
      'La gente que trabaja contigo aprende a rehacer tu parte antes de que tú termines la tuya.',
      'Cuando te asignan algo, todos los que te conocen están calculando el daño potencial antes de que empieces.',
      'Eres el tipo de persona que hace que los proyectos tarden más, cuesten más y salgan peor.',
      'Tu autoconcepto y tu rendimiento real son dos cosas que no han coincidido en ningún punto conocido.',
      'Estás donde estás porque la alternativa requiere esfuerzo, y el esfuerzo no es algo que hayas priorizado.',
      'Tu contribución oscila entre cero y negativa en cualquier contexto en el que te han puesto a prueba.',
      'No te piden para nada importante. No es casualidad ni es injusto. Es experiencia acumulada de todos.',
      'Has confundido estar presente con contribuir y llevas años creyendo que son lo mismo.',
      'Eres del tipo al que se asignan tareas que no afectan a nada crítico. Todos saben por qué menos tú.',
      'Tu aportación sube el tiempo de entrega, baja la calidad y aumenta el trabajo del resto. Consistentemente.',
      'La brecha entre lo que crees que aportas y lo que realmente aportas no tiene corrección sin trabajo real.',
      'El día que alguien sea brutalmente honesto contigo sobre tu rendimiento vas a descubrir lo que todos ya saben.',
      'Cuando te vayas de un proyecto el proyecto respira. Eso es lo que construiste tú solo sin quererlo.',
    ],
    mid: [
      'Haces lo justo para no ser el problema visible sin llegar a ser parte de la solución.',
      'Funcionas en condiciones ideales. El problema es que las condiciones casi nunca son ideales.',
      'Tu rendimiento depende de tu estado de ánimo, y tu estado de ánimo es impredecible.',
      'Das lo mínimo para pasar sin que te echen, sin aportar nada que nadie recuerde.',
      'Tienes capacidad real que usas de forma selectiva y en los momentos equivocados.',
    ],
    low: [
      'Capaz, confiable, sin necesitar que te lo repitan. Eso tiene valor real en cualquier contexto.',
      'Cuando algo importa, respondes. No todo el mundo puede decir eso.',
      'La gente cuenta contigo para lo que de verdad importa. Esa posición no se regala.',
      'Tu rendimiento es constante y sin sorpresas negativas. Exactamente lo que tiene precio.',
      'Cuando te asignan algo no hay plan B necesario. Eso te pone por delante de la mayoría.',
    ],
    extreme: [
      'La distancia entre lo que podrías ser y lo que eres es una decisión que se repite cada día.',
      'Todo el mundo que trabaja contigo tiene una opinión formada que tú desconoces y que ya no va a cambiar.',
      'Cuando te vayas de un proyecto, el proyecto va a respirar. Eso es lo que construiste.',
    ],
  },
};

async function runPercent(sock, msg, key, groupMeta) {
  const jid = msg.key.remoteJid;
  const cfg = LABELS[key];
  if (!cfg) return;

  const target = getTargetOrSelf(msg);
  // El % se basa en el ROL DEL TARGET, no del sender
  const targetIsOwner = isOwner(target, false, groupMeta);
  const targetIsAdmin = isAdminInMeta(groupMeta, target);

  const percent = rollPercent(cfg.goodIsHigh, targetIsAdmin, targetIsOwner);
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
