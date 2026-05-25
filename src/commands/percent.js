function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function isAdminInGroup(groupMeta, jid) {
  if (!groupMeta?.participants || !jid) return false;
  const p = groupMeta.participants.find(p => p.id === jid);
  return p?.admin === 'admin' || p?.admin === 'superadmin';
}

// Distribuciones por tier (uniforme dentro de cada rango):
//
//                    │ alto ≥70% │ medio 31-69% │ bajo ≤30%
//  ─────────────────┼───────────┼──────────────┼──────────
//  Negativo normal  │   70 %    │    20 %       │   10 %
//  Negativo admin   │   10 %    │    25 %       │   65 %
//  Positivo normal  │   35 %    │    30 %       │   35 %
//  Positivo admin   │   65 %    │    25 %       │   10 %
function rollPercent(goodIsHigh, senderIsAdmin) {
  const rand = Math.random();
  const hi = () => 70 + Math.floor(Math.random() * 31);
  const mid = () => 31 + Math.floor(Math.random() * 39);
  const lo = () => Math.floor(Math.random() * 31);

  if (!goodIsHigh) {
    // Negativo: normalmente resulta alto (malo), admins se libran
    if (senderIsAdmin) {
      if (rand < 0.65) return lo();
      if (rand < 0.90) return mid();
      return hi();
    }
    if (rand < 0.70) return hi();
    if (rand < 0.90) return mid();
    return lo();
  } else {
    // Positivo: probabilidad intermedia para todos, alta para admins
    if (senderIsAdmin) {
      if (rand < 0.65) return hi();
      if (rand < 0.90) return mid();
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
      'Tienes el tipo de cara que la gente recuerda anyos despues de cruzarte por casualidad.',
      'Cuando entras a una sala todo el mundo deja de hacer lo que estaba haciendo durante medio segundo.',
      'La genetica te debe favores y te los esta pagando todos a la vez.',
      'Tu sola presencia sube el nivel estetico del sitio donde estes.',
      'Hay belleza ordinaria y luego estas tu, en otra categoria completa.',
      'Tu cara tiene esa simetria que se estudia en libros y se ve poco en personas reales.',
      'Eres peligroso de mirar mas de dos segundos, deberian avisar en la entrada.',
      'Cualquiera que se cruza contigo sigue pensando en eso horas despues sin entender muy bien por que.',
      'Tu perfil malo es mejor que el bueno de la mayoria de la gente.',
      'Vistes lo que sea y lo conviertes en moda involuntariamente.',
      'Tu confianza acompanya tu fisico y esa combinacion es ilegal en algunos sitios.',
      'Tienes esa belleza atemporal que no se pasa de moda, que se queda.',
      'La gente saca el telefono cuando pasas sin haberte conocido nunca.',
      'Estas en el grupo de los esteticamente privilegiados, los que con cero esfuerzo se llevan todo.',
      'Tu cara es de las que paralizan conversaciones a media frase.',
    ],
    mid: [
      'Vas tirando, ni feo ni guapo, en la zona gris mas dificil de digerir.',
      'Con buena luz y buena ropa das el pego, fuera de eso es otra historia.',
      'Tu fisico no es problema pero tampoco es ventaja, esta en cero.',
      'Hay dias en los que estas bien y dias en los que mejor no salir.',
      'Mejorarias mucho con un cambio de actitud, la base esta ahi.',
      'En el monton, exactamente donde nadie te va a recordar manyana.',
      'Si te arreglases podrias dar mas, pero no lo haces y por eso estas aqui.',
      'Tu fisico depende totalmente del filtro de Instagram, eso es lo que dice.',
    ],
    low: [
      'No te ha tocado la lotteria genetica y se te nota desde dos calles.',
      'La belleza esta dentro de ti, muy muy dentro, casi enterrada.',
      'Hay caras que se olvidan al segundo, la tuya tiene esa cualidad.',
      'Tu mejor angulo es el que nadie ve nunca, eso es decir bastante.',
      'Si la cara fuera importante, te habrian devuelto al hospital.',
      'No es feura, es desproporcion documentada en cada centimetro.',
      'Tu fisico es un argumento solido contra la teoria del azar.',
    ],
    extreme: [
      'Tienes esa belleza dificil que no todo el mundo sabe ver, mejor para ti.',
      'La gente que te conoce ya se ha resignado a no entender por que tienes ese magnetismo.',
      'Vas a romper corazones que ni siquiera sabes que existen.',
      'Tu sola presencia desordena planes ajenos sin que tu lo busques.',
      'Hay gente nacida para ser vista, y tu eres exactamente esa.',
      'Si pudieras embotellar lo que tienes, serias rico en una semana.',
      'Cualquiera que te eche la vista encima se queda pensando en ti horas despues sin saber por que.',
      'Tu mezcla de fisico y actitud es de las que dejan marca permanente.',
      'Tienes la suerte de ser guapo y la cabeza para no necesitar demostrarlo cada cinco minutos.',
      'La gente coquetea contigo por inercia, sin haberlo decidido.',
      'Eres el tipo de persona que aparece una vez en una sala y la sala ya no es la misma.',
      'Tienes belleza superficial y profunda al mismo tiempo, y eso es muy escaso.',
      'Quien acabe contigo tendra que recordarse cada manyana la suerte que tiene.',
    ],
  },

  crack: {
    name: 'crack',
    goodIsHigh: true,
    high: [
      'Tienes ese nivel que pocos alcanzan aunque lleven anyos partiendose la cara.',
      'Cuando entregas algo, el resultado lo defiende solo sin que tengas que abrir la boca.',
      'Donde otros improvisan, tu ejecutas. La distancia es enorme.',
      'Tu talento no es ruido, es estructura. Y esa diferencia se nota a los dos minutos.',
      'Tus errores son anecdota, tus aciertos son patron, y eso ya lo dice todo.',
      'Eres de los que estudian anyos para hacer lo que tu haces sin pensar.',
      'Tu nivel intimida sin que tu lo busques, esa es la version real.',
      'La gente cuenta contigo cuando algo importa, y eso no se reparte facil.',
      'Llegas a sitios donde la mayoria ni aspira, y lo haces sin teatro.',
      'No tienes techo visible todavia, y eso es lo mas raro de lo tuyo.',
      'Cualquier proyecto donde apareces sube de nivel sin que te lo pidan.',
      'Tienes la precision que delata anyos de practica o un don que viene de fabrica.',
      'La gente se fija en ti para saber como se hace bien algo.',
    ],
    mid: [
      'Capacidad la tienes, lo que no tienes es ganas. Y se nota.',
      'Llegas a correcto, no a sobresaliente, y la distancia es mental.',
      'Funcionas bien cuando quieres, el problema es que casi nunca quieres.',
      'Das lo justo, jamas lo que podrias dar, y por eso estas aqui.',
      'Tienes rachas buenas y bajones sin motivo aparente.',
      'Apuntas a crack y aterrizas en correcto, semana tras semana.',
      'Tu nivel oscila tanto que la gente ha aprendido a no contar contigo de verdad.',
      'Suficiente para no fallar, insuficiente para que te recuerden.',
    ],
    low: [
      'No tienes nivel y lo intentas tapar, pero se ve a la legua.',
      'Mediocre constante, sin un solo dia de excepcion.',
      'La brecha entre lo que crees que haces y lo que haces es vergonzosa.',
      'Eres el freno del equipo y lo saben todos menos tu.',
      'Tu aportacion neutra ya es un milagro, lo normal es que ralentices.',
      'Cuando alguien cuenta contigo, ya esta calculando cuanto va a tardar en rehacerlo.',
      'Hay gente sin talento que trabaja el doble. Tu ni eso te has planteado nunca.',
    ],
    extreme: [
      'Eres de los que no necesitan presentacion, el trabajo lo hace solo.',
      'Hay gente que lleva diez anyos intentando llegar donde tu ya estabas hace tres.',
      'Tu nombre es garantia, y eso es una reputacion que muy poca gente construye.',
      'Lo que para otros es techo es donde tu empiezas a interesarte.',
      'Eres el ejemplo que se cita cuando alguien pregunta como se hace bien.',
      'La gente te observa para aprender aunque nunca te lo diga abiertamente.',
      'Tu nivel real se ve en los dias malos, no en los buenos.',
      'Eres de los que dentro de diez anyos la gente va a recordar por lo que hiciste, no por lo que dijiste.',
      'Lo que tu haces con facilidad otros lo persiguen toda su vida sin alcanzarlo.',
      'Subes el liston de cualquier grupo solo con aparecer, sin proponertelo.',
      'Tienes esa fiabilidad rara que tiene un precio alto en cualquier mercado.',
      'Tu talento ni se improvisa ni se compra, y eso ya pone distancia.',
    ],
  },

  inteligencia: {
    name: 'inteligente',
    goodIsHigh: true,
    high: [
      'Tu cabeza resuelve en cinco segundos lo que a otros les ocupa el dia entero.',
      'Llegas a conclusiones antes de que los demas terminen de leer el problema.',
      'Tu intuicion no es magia, es razonamiento rapido que ya has automatizado.',
      'Ves patrones donde otros ven datos sueltos sin sentido.',
      'Tienes esa rara mezcla de memoria y agudeza que produce decisiones limpias.',
      'Cuando entras en un debate, el debate sube de nivel quieras o no.',
      'Lees entre lineas donde otros no detectan ni las lineas.',
      'Eres de los pocos que saben cuando no saben, primera forma de inteligencia real.',
      'Antes de que termine la conversacion ya sabes donde va a acabar.',
      'Tu forma de argumentar convence sin aplastar, eso es inteligencia social fina.',
      'Aprendes rapido, retienes mejor, y conectas ideas que parecen no tener nada que ver.',
      'Tu silencio se confunde con pasividad. Cuando hablas ya llevas tres pasos de ventaja.',
      'Tienes la claridad mental que la mayoria no va a desarrollar en toda su vida.',
    ],
    mid: [
      'Inteligencia funcional, nada que descubrir por el momento.',
      'Llegas a la conclusion correcta, pero llegas tarde casi siempre.',
      'Tu razonamiento es lineal y la mayoria de problemas no lo son.',
      'Aprendes con mas repeticiones y mas tiempo que la media.',
      'Piensas bien cuando te lo propones, pero raramente te lo propones.',
      'Suficiente para no caer en lo obvio, insuficiente para lo dificil.',
      'No eres tonto, eres lento. Y eso a veces es peor.',
      'Tu cabeza no esta rota, esta dormida. Hay una diferencia.',
    ],
    low: [
      'Denso como un muro de hormigon armado en cada conversacion.',
      'Tardas en pillar lo que la gente ya ha explicado tres veces.',
      'Conviertes algo facil en algo imposible solo con tocarlo.',
      'La brecha entre lo que crees entender y lo que entiendes es un canyon.',
      'Cuando la charla sube de nivel, te quedas en el portal.',
      'Preguntas lo que acaban de explicar como si hubieras llegado tarde.',
      'No eres el que resuelve, eres el que complica sin querer.',
    ],
    extreme: [
      'Tienes una forma de pensar que la mayoria de la gente no va a desarrollar nunca aunque lo intente.',
      'Eres de los que ven la solucion antes de que los demas terminen de leer el enunciado.',
      'La gente sale de las conversaciones contigo con algo que no traia.',
      'Tu mente conecta cosas sin relacion aparente y de ahi sale algo util.',
      'Hay gente con titulos que no llega donde tu llegas con simple curiosidad.',
      'Eres exactamente el tipo de persona que no necesita confirmacion externa de nadie.',
      'Tienes inteligencia y la cabeza para no abusar de ella, lo cual es lo mas dificil.',
      'Cuando decides aprender algo, lo aprendes de verdad, no por encima.',
      'No solo piensas rapido, piensas bien. La combinacion es escasisima.',
      'Dentro de diez anyos vas a recordar conversaciones contigo como de las que te cambiaron algo.',
      'Aprendes de cualquier experiencia, incluidas las malas, y eso te separa del resto.',
      'Tu inteligencia no es ruidosa, simplemente funciona, y eso es lo mas valioso.',
    ],
  },

  feminidad: {
    name: 'femenina',
    goodIsHigh: true,
    high: [
      'Tienes una elegancia que no se aprende, se nace con ella o no se tiene.',
      'Tu feminidad no es performance, es quien eres, y se nota desde la primera mirada.',
      'Hay personas que intentan proyectar lo que tu emites sin esfuerzo alguno.',
      'Tu presencia tiene una suavidad que muy pocas personas saben mantener.',
      'La forma en que te mueves y hablas tiene una gracia que casi nadie consigue.',
      'Tienes esa feminidad solida que no necesita demostrarse cada minuto.',
      'Irradias una calidez y una delicadeza que la gente agradece sin decirlo.',
      'Hay una sofisticacion en ti que viene de dentro, no de la ropa.',
      'La gente nota esa elegancia que llevas sin proponertelo, aunque no la nombre.',
      'Tu feminidad no es debilidad, es precision. Y eso intimida a quien sabe leerla.',
      'La delicadeza con la que manejas las cosas dice mas de ti que cualquier curriculum.',
      'Tienes ese equilibrio raro entre fuerza y suavidad que define lo elegante.',
      'Eres de las pocas personas con elegancia de verdad, no la de aparentar.',
    ],
    mid: [
      'Tu feminidad va y viene segun el dia y el humor, sin patron.',
      'Tienes momentos de gracia y momentos de brusquedad que se contradicen.',
      'Ni muy delicada ni muy tosca, en un termino medio que no destaca en nada.',
      'A veces proyectas elegancia, a veces todo lo contrario, sin coherencia.',
      'Hay potencial, pero sin trabajarlo no llega a ningun sitio.',
      'Tu feminidad es situacional, depende demasiado de quien tienes delante.',
      'Regular en este aspecto, ni virtud ni defecto que destacar.',
      'La elegancia te visita de vez en cuando pero no se queda a vivir.',
    ],
    low: [
      'Tan delicada como una hormigonera a pleno gas un lunes por la manyana.',
      'Tu gracia y tu suavidad brillan por su ausencia, y no de forma sutil.',
      'La elegancia te esquiva como si te hubiera visto venir desde lejos.',
      'Tienes los modales de alguien criado en una obra y lo llevas con orgullo.',
      'Tu feminidad es leyenda urbana, nadie ha podido confirmarla con pruebas.',
      'Si la delicadeza fuera examen, te suspenderia el examinador antes de empezar.',
      'Tienes la suavidad de una piedra pomez, y dos veces menos util.',
    ],
    extreme: [
      'Tienes una feminidad genuina que la mayoria no va a desarrollar aunque lo intente.',
      'Tu forma de ser tiene una elegancia que no se compra ni se aprende en un curso.',
      'La delicadeza que tienes es de las que envejecen bien, no se va con los anyos.',
      'Eres de las pocas personas que tienen feminidad real, no la de fotos para Instagram.',
      'La calidez que proyectas es genuina y la gente lo percibe antes de que hables.',
      'Tu manera de estar en el mundo tiene una suavidad que hace todo mas facil alrededor.',
      'Tienes la clase de feminidad que no se menciona pero todo el mundo nota cuando entras.',
      'Hay personas que pasan la vida intentando tener lo que tu llevas de fabrica.',
      'La gracia con la que manejas las cosas delata una inteligencia emocional que pocos tienen.',
      'Tu presencia es de las que se quedan en la memoria de quien te conoce.',
      'La gente a tu alrededor se comporta mejor cuando estas cerca, aunque no sepan por que.',
      'Eres exactamente el tipo de persona que eleva el nivel de cualquier espacio que habita.',
    ],
  },

  masculinidad: {
    name: 'masculino',
    goodIsHigh: true,
    high: [
      'Tu masculinidad no necesita demostrarse, se nota en cuanto entras a un sitio.',
      'Tienes esa solidez que la gente busca cuando necesita apoyarse en alguien.',
      'Proyectas una seguridad que no viene del cuerpo, viene de dentro.',
      'Tu presencia genera tranquilidad en quien te rodea, y eso es un poder real.',
      'Tienes el tipo de caracter que la gente respeta sin que nadie le explique por que.',
      'Tu masculinidad no es ruido, es estructura. Esa es la version que dura.',
      'Eres de los que resuelven sin quejarse, y eso ya te separa del 90 por ciento.',
      'La firmeza con la que tomas las cosas dice mucho de lo que llevas dentro.',
      'Tienes una templanza que muy poca gente mantiene cuando todo se complica.',
      'La gente confia en ti para lo serio, y eso no se regala, se gana.',
      'Eres de los que actuan cuando hay que actuar, sin esperar permiso.',
      'Tu masculinidad tiene profundidad, no es decoracion ni fachada.',
      'Tienes esa combinacion de fuerza y control que define lo que no envejece.',
    ],
    mid: [
      'Tu masculinidad es inconsistente, aparece cuando conviene y desaparece cuando hace falta.',
      'Tienes firmeza en frio y debilidad en caliente. Justo al reves de lo que toca.',
      'Hay base pero no estructura, y sin estructura nada se sostiene.',
      'Tu seguridad depende demasiado de quien tienes delante.',
      'Regular, ni virtud que destacar ni defecto que senyalar.',
      'A veces solido, a veces inestable, sin que se sepa de cual contar.',
      'Proyectas mas de lo que eres, y los que te conocen bien ya lo tienen claro.',
      'Con mas consistencia serias otra cosa, pero la constancia te falla.',
    ],
    low: [
      'Tu masculinidad es una historia que te cuentas tu y que nadie mas se cree.',
      'Proyectas la solidez de un castillo de naipes en dia de viento.',
      'Menos macho que una declaracion de la renta en marzo.',
      'Tu firmeza dura lo que dura el buen tiempo, que en tu caso no es mucho.',
      'Tienes el caracter de un flan, y el flan al menos aguanta en el plato.',
      'Tu seguridad se rompe con una pregunta directa hecha con tono.',
      'Cuando se complica, eres el primero en desaparecer, y todos lo saben.',
    ],
    extreme: [
      'Tienes una masculinidad real que no necesita anunciarse porque se ve sin que digas nada.',
      'La solidez que proyectas no se finge ni se aprende en un fin de semana.',
      'Eres de los que generan confianza antes de haber hecho nada todavia.',
      'Tu manera de manejar la presion es lo que te separa cuando las cosas se ponen serias.',
      'Tienes el caracter que la gente busca cuando necesita alguien de verdad.',
      'La firmeza que tienes no es rigidez, es estructura. Esa es la diferencia.',
      'Eres de los pocos que tienen masculinidad real sin necesitar que nadie se la confirme.',
      'Tu presencia en cualquier grupo lo ancla, y la gente lo nota sin decirlo.',
      'Tienes esa seguridad que no viene del ego sino del conocimiento de uno mismo.',
      'La gente que ha contado contigo en momentos importantes sabe lo que eso vale.',
      'Eres de los que dejan al grupo en mejor estado de como lo encontraron.',
      'Tu caracter tiene solidez real, no depende del publico ni del contexto.',
    ],
  },

  // ===== NEGATIVOS =====

  gay: {
    name: 'gay',
    goodIsHigh: false,
    high: [
      'Sal del armario de una vez, ya solo te enganas a ti mismo a estas alturas.',
      'Mas gay que un arcoiris en una sauna a las cuatro de la manyana.',
      'La pluma se te escapa por todos los lados sin que puedas frenarla.',
      'Naciste con purpurina en las venas y se te nota a tres calles de distancia.',
      'Cada gesto tuyo confirma lo que tu silencio intenta negar dia tras dia.',
      'Tu armario ya no existe, lo has quemado tu solo a base de pluma.',
      'Tu masculinidad no se la cree ni tu sombra en dia soleado.',
      'Hasta tus padres ya lo asumen aunque no se atrevan a decirlo en voz alta.',
      'Tu manera de hablar es un comunicado oficial sin firmar.',
      'En cuanto entras a un bar el camarero ya sabe lo que vas a pedir.',
      'Naciste para llevar tacones aunque te disfracen de macho cada mananya.',
      'Tu Spotify es un mapa autobiografico que cualquiera descifra en treinta segundos.',
      'Llevas la bandera por dentro y se transparenta cada vez que sonries.',
      'Tu paleta de colores la firma alguien que no esta engananyado.',
      'Si la heterosexualidad fuera examen, lo suspenderias antes de leer la primera pregunta.',
    ],
    mid: [
      'Algo se te mueve por dentro cuando pasan tios buenos por la calle.',
      'En ciertos angulos y con cierta luz, levantas sospechas justificadas.',
      'Bisexualidad pendiente de confirmacion oficial pero ya muy avanzada.',
      'Cuando bebes algo de mas, se te escapa la curiosidad sin avisar.',
      'Tu Spotify te delata mas que cualquier cosa que digas.',
      'Una de cal y otra de arena, todavia te lo estas pensando.',
      'En el grupo hay debate sobre ti, y sin ironia ninguna.',
      'Cualquier dia te decantas y nadie en este grupo se va a sorprender.',
    ],
    low: [
      'Mas hetero que un toro en feria de pueblo.',
      'Cero pluma, cero duda, cero matiz que comentar.',
      'Heterosexualidad blindada, sin grietas posibles ni en privado.',
      'Tu mundo se reduce a futbol, cerveza y poco mas, claro como el agua.',
      'No hay duda en tu hoja de servicios, aunque eso casi sea peor.',
      'Tan hetero que te incomodan hasta los abrazos largos entre amigos.',
      'Tu masculinidad raya lo aburrido, pero al menos es coherente.',
    ],
    extreme: [
      'Eres el tipo de persona del que todos hablan mal cuando sales de la sala.',
      'Si manyana desaparecieras nadie te buscaria, y eso ya lo sabes en el fondo.',
      'Cada vez que escribes en el grupo alguien suspira y otro silencia el chat un rato.',
      'Eres exactamente la persona que la gente bloquea cuando se cansa de fingir.',
      'La gente que dice quererte lo hace porque no le queda otra mas comoda.',
      'Lo unico estable de tu vida es la decepcion que generas en los demas.',
      'Si pudieras verte desde fuera, tu mismo te darias de baja del grupo.',
      'Te miran y no entienden como sigues aqui, ni tu mismo lo entiendes ya.',
      'Vas perdiendo gente sin darte cuenta y cuando lo notes ya no quedara nadie.',
      'Hay un grupo paralelo sin ti donde se respira con tranquilidad.',
      'Eres el tipo de presencia que la gente aprende a esquivar con educacion.',
      'Tus padres mienten cuando les preguntan que tal te va.',
    ],
  },

  simp: {
    name: 'simp',
    goodIsHigh: false,
    high: [
      'Simp de campeonato, te lamerias los zapatos por un emoji bien puesto.',
      'Vendes tu dignidad por un hola y encima das las gracias al comprador.',
      'Caes redondo en cuanto te ponen un poco de atencion barata.',
      'Tu autoestima depende literalmente de un visto en WhatsApp.',
      'Le escribes a la misma persona durante meses sin recibir nada a cambio.',
      'Sabes su signo, su perfume y donde estudio. Ella no sabe ni tu nombre.',
      'Tu telefono solo manda mensajes, nunca recibe ninguno de vuelta.',
      'Tu plan B es seguir esperando al plan A que nunca va a llegar.',
      'Le respondes a los dos segundos aunque ella tarde tres dias en contestar.',
      'Tu Instagram es un altar publico a alguien que no te quiere ni de lejos.',
      'Le pagas el bizum mensual y a eso lo llamas amor.',
      'Tu estrategia es estar disponible 24 horas y por eso te ven como invisible.',
      'Aceptas las migajas como si fueran banquete, y por eso te las siguen tirando.',
      'Aceptas la friendzone como si fuera un ascenso laboral.',
      'Coleccionas rechazos como cromos y aun asi sigues comprando sobres.',
    ],
    mid: [
      'Simping moderado pero se te nota la desesperacion en cada mensaje.',
      'Sabes que esta mal y aun asi no puedes evitarlo, eso ya es preocupante.',
      'Tu orgullo existe pero es negociable, y el precio es bajo.',
      'A ratos te respetas, a ratos no, sin coherencia.',
      'Tu cabeza dice no, tu corazon dice si, y tu cartera siempre paga.',
      'Conoces el limite y aun asi flirteas con cruzarlo cada semana.',
      'Vas y vienes, sin terminar de aprender la leccion nunca.',
      'Cada dos por tres recaes en patrones que sabes perfectamente que te hacen mal.',
    ],
    low: [
      'Digno, no te arrastras por nadie y eso ya es mucho en este grupo.',
      'Frialdad de iceberg, no te dobla nadie sin esfuerzo.',
      'Tu amor propio esta blindado, dificil tumbarte por un visto.',
      'Sabes lo que vales y no lo regalas en cuanto alguien te sonrie.',
      'No persigues, atraes. Esa es la unica clave que importa.',
      'Cuando alguien no te valora, desapareces sin drama. Asi se hace.',
      'Te respetan porque te respetas tu primero, y eso se nota.',
    ],
    extreme: [
      'Eres un felpudo con patas. Te utilizan, lo saben, y tu sigues ahi sonriendo.',
      'La persona por la que babeas ni recuerda tu nombre, eso ya tendria que decirte algo.',
      'Llevas tanto tiempo arrastrandote que ya no sabes como estar de pie.',
      'Hay perros con mas dignidad que tu, y los perros se lamen sus propias heridas al menos.',
      'Tu existencia entera depende de la aprobacion de gente que no te valora ni para el cafe.',
      'Te ven venir desde lejos y aprovechan porque saben que no vas a decir nada.',
      'Eres exactamente el ejemplo que ponen los padres para que sus hijos no acaben asi.',
      'Vas a llegar a viejo solo y vas a culpar a todos menos al unico responsable.',
      'Tu unica relacion estable es la que tienes con el rechazo cronico.',
      'Has confundido obsesion con amor y eso te ha costado todo lo que has tenido.',
      'No vas a estar bien hasta que dejes de buscar a alguien que te salve, cosa que no vas a hacer.',
      'Cada noche solo en casa es un recordatorio de lo poco que te valoras.',
    ],
  },

  rata: {
    name: 'rata',
    goodIsHigh: false,
    high: [
      'Rata de alcantarilla, traicionarias a tu madre por cinco euros y un me gusta.',
      'Tu deslealtad es arte. Todo el grupo lo sabe y nadie te lo dice ya.',
      'Donde hay un cuchillo por la espalda hay un dedo tuyo apuntando.',
      'La traicion te sale natural, ni siquiera necesitas pensarla dos veces.',
      'Cambias de bando con la facilidad con la que otros cambian de calcetines.',
      'Hablas mal de la gente cinco minutos despues de abrazarla en la calle.',
      'Coleccionas secretos ajenos como municion para gastar cuando convenga.',
      'Le mandas pantallazos a quien no debe y crees que nadie se va a enterar.',
      'No tienes principios, tienes calculos. Y todos los suman a tu favor.',
      'Tus alianzas duran lo que duran los beneficios que aportan.',
      'Vendes amistades a precio de saldo en cuanto aparece una oferta mejor.',
      'Tu palabra no vale nada, ni siquiera para ti mismo.',
      'Sonries con la boca mientras la mente ya planea el siguiente movimiento.',
      'Tu padre sabe quien eres y por eso no presume de ti delante de nadie.',
      'Estas en cuatro grupos paralelos hablando mal del resto en cada uno.',
    ],
    mid: [
      'Algo de rata tienes, pero no llegas a plaga todavia.',
      'Traicionas cuando conviene, que es lo peor de todas las versiones.',
      'Eres leal hasta que aparece una oferta marginalmente mejor.',
      'Tus principios se mueven con el viento del momento.',
      'A veces eres buen amigo, a veces aparece el monstruo. Sin patron.',
      'Hay gente del grupo que ya empieza a contarte solo verdades a medias.',
      'Tu rata interior esta creciendo y se nota en pequenyos gestos.',
      'No estas perdido del todo pero el camino esta resbaladizo.',
    ],
    low: [
      'Mas leal que un perro, no traicionarias ni a tu peor enemigo de borracho.',
      'Limpio como una patena, no hay manchas en tu historial.',
      'De los que dan la cara aunque pierdan, raro pero real.',
      'Tus amigos duermen tranquilos contigo cerca.',
      'Eres de los que mueren con el secreto a cuestas, admirable.',
      'Tu palabra es ley para ti, y eso vale mucho en estos tiempos.',
    ],
    extreme: [
      'Todo el mundo en este grupo sabe que no eres de fiar, solo que nadie te lo ha dicho aun.',
      'La gente no te cuenta cosas importantes porque saben que las vas a usar en tu beneficio.',
      'Cuando te vayas del grupo nadie va a preguntar por ti, y en el fondo lo sabes.',
      'Te van a abandonar uno a uno y vas a culpar a todos menos a ti mismo.',
      'La soledad que te espera no es mala suerte, es la factura de lo que sembraste.',
      'Algun dia vas a necesitar a alguien y no va a haber nadie, ni siquiera tu familia.',
      'Te van a hacer exactamente lo que tu has hecho, y va a doler el doble.',
      'Hasta los que te apoyan en publico te critican en privado, eso es lo que has construido.',
      'Tus actos te han etiquetado para siempre, y esa etiqueta no se quita ya.',
      'Mira a tu alrededor. La gente que sigue contigo es la que todavia no te conoce bien.',
      'Cuando te recuerden dentro de diez anyos sera con una mueca, no con una sonrisa.',
      'Eres ejemplo de lo que no hay que ser, y usan tu nombre en familia para asustar a los pequenyos.',
    ],
  },

  maricon: {
    name: 'maricon',
    goodIsHigh: false,
    high: [
      'Maricon de tomo y lomo, y encima sin talento para disimularlo.',
      'Mas pluma que un gallinero en hora punta.',
      'No hay armario en el mundo que aguante tu pluma encerrada.',
      'Cada gesto tuyo es una declaracion involuntaria firmada y sellada.',
      'La masculinidad te queda como un disfraz mal cosido por dentro.',
      'Tu intento de macho no convence ni a tu reflejo del espejo.',
      'Tus colegas hablan de ti sin parar cuando no estas presente.',
      'Tu manera de andar ya es un mensaje en clave para los entendidos del barrio.',
      'Llevas la pluma tan adentro que ya forma parte de tu esqueleto.',
      'Cuando entras a un bar el camarero pide ya lo de siempre antes de que abras la boca.',
      'Hay un sticker tuyo en otro grupo, y no es precisamente elogioso.',
      'Tu masculinidad raya lo comico, en el sentido mas literal del adjetivo.',
      'Eres tan obvio que ya no enganyas ni a los muy distraidos del pueblo.',
      'Tu estilo de ropa es un comunicado sin firmar que todos leen igual.',
      'Hasta las paredes huyen del color que desprendes al andar.',
    ],
    mid: [
      'Algo de pluma hay, no te voy a mentir, y la gente la nota.',
      'Ni muy muy ni tan tan, en el limbo entre la virilidad y lo otro.',
      'A veces se te escapa, a veces lo controlas, sin patron claro.',
      'En ciertas situaciones te pones nervioso y la pluma sale sola.',
      'Hay gestos que repites sin darte cuenta y todos los catalogan.',
      'Tu lucha interna es publica aunque tu no lo creas.',
      'Vas a tener que aceptarlo antes o despues, mejor antes que despues.',
    ],
    low: [
      'Mas macho que Rambo con resaca un domingo de marzo.',
      'Testosterona a raudales, ninguna duda en ningun frente.',
      'Tu masculinidad es de manual antiguo, agresiva y sin matices.',
      'Heterosexualidad sin grietas, casi insoportable.',
      'Tu mundo se reduce a tres temas masculinos repetidos en bucle.',
    ],
    extreme: [
      'Vaya maricon, deberias salirte del grupo, nadie te quiere aca.',
      'Eres exactamente el tipo de persona del que la gente habla mal cuando te vas.',
      'Nadie te lo dice a la cara porque no mereces ni ese esfuerzo basico.',
      'Piensa cuantas personas te escribirian si desaparecieras manyana. Hazlo en serio.',
      'Hay una razon clara por la que siempre eres el ultimo al que avisan de los planes.',
      'La gente te soporta, no te quiere. Aprende la diferencia de una vez.',
      'En tu propia familia hablan de ti como del problema, no como del hijo.',
      'Tus padres mienten cuando les preguntan que tal te va, y lo saben todos.',
      'Vas a pasar la vida buscando un sitio donde encajar y nunca lo vas a encontrar.',
      'Hay un grupo paralelo sin ti donde se habla de ti, y no eres miembro.',
      'Las conversaciones del grupo mejoran cuando no estas, y todos lo notan menos tu.',
      'Tu telefono no suena nunca y eso ya deberia decirte algo, pero no escuchas.',
      'Cuando alguien te elimina de un chat no le tiembla el pulso ni medio segundo.',
      'Eres ese amigo del que todos prefieren no acordarse.',
    ],
  },

  friki: {
    name: 'friki',
    goodIsHigh: false,
    high: [
      'Friki supremo, tu cueva huele a fracaso social y pizza fria de tres dias.',
      'Tan friki que hasta los demas frikis te miran raro en los foros.',
      'Tu vida social entera cabe en una pantalla de seis pulgadas.',
      'Sabes mas de personajes ficticios que de personas reales que viven cerca de ti.',
      'Tu Steam tiene mas horas que tu trabajo, tu colegio y tu vida juntos.',
      'El sol te quema porque ya no te reconoce despues de tanto tiempo dentro.',
      'Tu camiseta del videojuego favorito ya forma parte de tu piel.',
      'No tienes amigos, tienes guildmates con nicknames raros.',
      'La ultima vez que viste el cielo fue por accidente al ir al contenedor.',
      'Tu cuarto tiene mas posters que paredes a estas alturas del campeonato.',
      'Coleccionas figuritas que ningun adulto deberia tener en exposicion.',
      'Tu vida amorosa se reduce a una waifu y dos personajes secundarios.',
      'Tu padre ya no sabe en que invertir esperanza, contigo se ha rendido.',
      'La discusion mas importante de tu semana fue sobre un personaje ficticio.',
      'Tu casa es un templo a marcas que ningun adulto reconoce.',
    ],
    mid: [
      'Friki moderado, sales a la calle de vez en cuando, lo cual ya es algo.',
      'Friki con disimulo, pero se nota en cuanto abres la boca cinco minutos.',
      'Tienes referencias que nadie pilla pero te las guardas, gracias por eso al menos.',
      'A ratos eres friki, a ratos persona, es complicado de gestionar.',
      'Sales del cuarto los fines de semana, hay esperanza moderada.',
      'Tu carpeta de descargas y tu carpeta de recuerdos pesan parecido.',
    ],
    low: [
      'Cero raro, lo mas normal del grupo. Eso ya es exito.',
      'Social y presentable, que aburrido pero util.',
      'Te mueves bien en cualquier ambiente, eso es un don.',
      'Tu vida es tan equilibrada que casi suena sospechoso.',
      'Pasas por persona promedio y eso aqui ya es un logro real.',
    ],
    extreme: [
      'Llevas tanto tiempo hablando con pantallas que ya no sabes como hablar con personas.',
      'Hay un mundo fuera de tu habitacion y lleva anyos sin verte.',
      'La ultima vez que alguien te llamo para salir fue porque se equivoco de numero.',
      'Tu historial de busqueda dice mas de ti que cualquier cosa que puedas contarme.',
      'Tu vida real es tan pobre que has tenido que construirte otras en pantallas.',
      'Llevas anyos coleccionando trastos en lugar de experiencias.',
      'Tus padres ya han renunciado a que tengas pareja, hijos o vida en general.',
      'Si manyana te pasara algo lo encontrarian tres dias despues por el olor.',
      'Eres el primer fracaso documentado de tu arbol genealogico, y lo llevas con orgullo.',
      'Sabes datos de personajes ficticios y no sabes el cumpleanyos de tu madre.',
      'A los cuarenta vas a seguir igual, en el mismo cuarto con los mismos posters.',
      'Tus amigos online no van a venir a tu entierro, eso te lo aseguro.',
      'Cuando te mueras vas a darte cuenta de todo lo que no viviste, y ya sera tarde.',
    ],
  },

  cerdo: {
    name: 'cerdo',
    goodIsHigh: false,
    high: [
      'Cerdo de manual, tu higiene es un insulto a los cinco sentidos.',
      'Comes con las manos y luego te las limpias en el pantalon, y encima lo defiendes.',
      'Tu cuarto es un vertedero con WiFi de baja calidad.',
      'Has convertido la mugre en estilo de vida y la llevas con orgullo inexplicable.',
      'Hueles a algo que no deberia tener nombre todavia.',
      'Tu ropa lleva dias encima y tu cuerpo lleva mas dias sin agua.',
      'La gente se aparta cuando te sientas y tu crees que es porque les caes mal.',
      'Dejas rastro de porqueria en cualquier lugar que tocas mas de dos segundos.',
      'Eres de los que no lavan los platos hasta que el moho tiene nombre propio.',
      'No distingues entre suelo y papelera, todo es lo mismo a tus pies.',
      'Tu banyo es una escena de crimen biologico documentada.',
      'Tu cama tiene capas arqueologicas de mugre que podrian datarse en universidades.',
      'Tu nevera es una novela de terror con capitulos por fecha de caducidad.',
      'No tienes normas de higiene, tienes ausencia total de ellas.',
      'La basura de tu cuarto ya tiene ecosistema propio y especies endemicas.',
    ],
    mid: [
      'Algo de cerdo hay, no te voy a mentir, y se nota en detalles.',
      'Tu higiene es negociable segun el dia, y hay dias muy malos.',
      'No llegas a desastre total pero el camino esta clarisimo.',
      'Hay momentos en los que te cuidas, son la excepcion no la regla.',
      'A veces te duchas, a veces no, y se nota la diferencia desde la calle.',
      'Tu nivel de orden depende de si tienes visita, no de criterio propio.',
      'Tu cocina cuenta una historia que no quieres que nadie lea hasta el final.',
    ],
    low: [
      'Limpio y ordenado, eso ya dice algo en este grupo.',
      'Tu higiene no da problemas a nadie, lo cual es minimo pero no todos lo logran.',
      'Te cuidas lo suficiente para no generar quejas a tu alrededor.',
      'Presentable sin alardes, pero presentable.',
      'Tienes el orden basico que muchos no consiguen mantener mas de una semana.',
      'Nada que objetar en lo higienico, y eso en este grupo ya es merito.',
    ],
    extreme: [
      'Eres un cerdo clinico, el tipo de persona que baja el nivel de cualquier espacio que pisa.',
      'La gente que ha estado en tu casa habla de ello como de una experiencia traumatica.',
      'Tu nivel de suciedad es una declaracion sobre como te valoras a ti mismo.',
      'No es desorganizacion, es renuncia activa a la higiene basica.',
      'Hay animales con mas decoro que tu en su propio habitat natural.',
      'El asco que generas no es accidental, es estructural, va contigo a todos lados.',
      'Tu suciedad no te afecta solo a ti, afecta a cualquiera que comparta espacio.',
      'Cuando te vayas de un sitio el sitio necesita varios dias para recuperarse.',
      'Eres el tipo de persona con quien nadie quiere compartir piso, y lo saben antes de conocerte.',
      'Tu relacion con la higiene es hostil, no es pereza, es enemistad declarada.',
      'Si pudieras verte desde fuera te darias asco a ti mismo, y eso es decir mucho.',
      'Hay un nivel de mugre que ya no es descuido sino agresion al entorno, y tu lo alcanzas cada semana.',
    ],
  },

  inutil: {
    name: 'inutil',
    goodIsHigh: false,
    high: [
      'Inutil certificado, tu presencia en cualquier tarea es un obstaculo documentado en acta.',
      'Das menos que lo que prometes, y lo que prometes ya era poco.',
      'Necesitas ayuda hasta para equivocarte de manera eficiente.',
      'Tu contribucion a un proyecto es neutra en el mejor escenario posible.',
      'Tienes el talento especial de complicar lo simple sin anyadir nada al resultado final.',
      'La gente que trabaja contigo ya asume que va a tener que rehacer todo despues.',
      'Eres el tipo de persona que hace que el trabajo aumente solo con aparecer.',
      'Tu inutilidad no es descuido, es constancia. Eso al menos merece algo de reconocimiento.',
      'Cuando alguien necesita que algo salga bien, tu eres el primero al que no llaman.',
      'Has convertido la incompetencia en estilo de vida y lo llevas con dignidad inexplicable.',
      'Tu aportacion oscila entre cero y negativa segun el dia y la luna.',
      'Eres el tipo de recurso humano que los equipos aprenden a rodear con experiencia.',
      'No solo no ayudas, consigues que los que si ayudan tengan que trabajar mas.',
      'La brecha entre lo que crees que aportas y lo que aportas de verdad es un abismo.',
      'Tu existencia en un proyecto es mas un obstaculo que un recurso.',
    ],
    mid: [
      'Util a ratos, inutil a ratos, sin ritmo ni patron claro identificable.',
      'Ni tan capaz como te crees ni tan inutil como te tratan, en el termino medio mas aburrido.',
      'Haces lo minimo para que no te echen sin aportar nada memorable a nadie.',
      'Tu rendimiento es correcto cuando quieres y un desastre cuando no, y no siempre quieres.',
      'Das lo justo para pasar pero nunca lo suficiente para que te recuerden por algo bueno.',
      'Tienes capacidad real pero una desidia que la anula sistematicamente cada semana.',
      'Funcional en circunstancias favorables, un problema cuando hay presion de verdad.',
      'No eres un desastre, eres un blando. Y los blandos son problema de otro tipo.',
    ],
    low: [
      'Util de verdad, de los que hacen que las cosas funcionen sin necesitar reconocimiento.',
      'Tienes un nivel de competencia real que no todo el mundo puede decir que tiene.',
      'La gente cuenta contigo cuando algo importa, y eso no se regala.',
      'Eres de los que resuelven sin quejarse y sin que tengan que explicarte dos veces.',
      'Tu aportacion se nota cuando faltas, no cuando estas. Ese es el nivel real.',
      'Tienes esa capacidad de ejecucion que la mayoria simula sin tener.',
    ],
    extreme: [
      'Eres exactamente el tipo de persona del que los grupos hablan como ejemplo de lo que ralentiza todo.',
      'Tu nivel de inutilidad tiene una consistencia que, aplicada a algo real, seria un record.',
      'La brecha entre tu autoconcepto y tu rendimiento real es uno de los misterios de este grupo.',
      'Hay gente inutil y hay gente que ademas no es consciente de serlo. Tu eres las dos cosas.',
      'La gente ha dejado de contar contigo no por crueldad sino por experiencia acumulada.',
      'Tu ineficiencia no es accidental, tiene estructura, patron y trayectoria. Otro nivel.',
      'Cada vez que te asignan algo, alguien ya esta pensando en como arreglarlo despues.',
      'No es que no puedas, es que no quieres, y lo peor es que ya no distingues la diferencia.',
      'Llevas tanto tiempo sin aportar nada que ya ni tu mismo recuerdas la ultima vez.',
      'Eres el tipo de presencia en un grupo de trabajo que hace que los demas suban la guardia.',
      'Tu historial habla por ti, y lo que dice no te deja en buen lugar.',
      'No eres mal tipo, pero eres exactamente el tipo de persona que ningun equipo quiere repetir.',
      'Cuando te vayas de un proyecto, el proyecto va a respirar. Eso es lo que has construido.',
    ],
  },
};

function extractTarget(msg) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return mentioned;
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quotedParticipant) return quotedParticipant;
  return msg.key.participant || msg.key.remoteJid;
}

async function runPercent(sock, msg, key, groupMeta) {
  const jid = msg.key.remoteJid;
  const cfg = LABELS[key];
  if (!cfg) return;

  const sender = msg.key.participant || msg.key.remoteJid;
  const senderIsAdmin = isAdminInGroup(groupMeta, sender);

  const target = extractTarget(msg);
  const percent = rollPercent(cfg.goodIsHigh, senderIsAdmin);
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
};
