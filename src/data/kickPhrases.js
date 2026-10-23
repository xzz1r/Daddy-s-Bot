// Avisos de !kick. Salen en el grupo ANTES de echar, para que lo vean.
//
// No es un comunicado. Es un ataque directo que dice POR QUÉ se le echa: por
// inútil, por no aportar nada, por parásito, por dar el coñazo. Lo pidió el
// dueño (23 oct): «más ataques directos y coherentes», «sitio» en vez de
// «plaza», y luego «un solo párrafo, un poco más largos y menos repetitivos».
// Nada de metáforas que haya que descifrar ni de saltos de línea: el motivo,
// claro y en la cara, y cada uno con su forma y su cierre. El taco va dentro.
// pickFresh las reparte por grupo.
//
// SIN DAR POR HECHO EL GÉNERO (GUIA §9): «por inútil», «eres un lastre»,
// «eres un parásito», nunca «eres un inútil» ni un adjetivo en -o pegado a
// quien lee. El vocativo suelto sí vale.
//
// %M se sustituye por las menciones. Singular (tú) y plural (vosotros).
// Nada de ustedes.
//
const AVISOS_KICK = [
  {
    uno: '%M te vas por inútil, y no hace falta adornarlo, gilipoyas. Desde que entraste no has aportado ni una idea, ni una risa, ni una mano cuando alguien la necesitaba. Has estado ocupando sitio como quien ocupa una silla en una sala de espera, sin hacer nada más que existir y mirar el móvil. Ese sitio hoy vuelve a quien sepa usarlo, y tú vuelves a no ser nadie en ningún lado.',
    varios: '%M os vais por inútiles, y no hace falta adornarlo, gilipoyas. Desde que entrasteis no habéis aportado ni una idea, ni una risa, ni una mano cuando alguien la necesitaba. Habéis estado ocupando sitio como quien ocupa una silla en una sala de espera, sin hacer nada más que existir y mirar el móvil. Ese sitio hoy vuelve a quien sepa usarlo, y vosotros volvéis a no ser nadie en ningún lado.',
  },
  {
    uno: '%M no te echan por lo que dijiste, puto inútil, te echan porque en todo lo que llevas aquí no has dicho nada que valiera la pena. Ni un mensaje que alguien quisiera contestar, ni una opinión con algo detrás, ni una broma que hiciera reír a alguien que no fueras tú. Cero aporte, cero gracia y cero cabeza: el grupo se ha cansado de cargar contigo y hoy te suelta en la puerta.',
    varios: '%M no os echan por lo que dijisteis, putos inútiles, os echan porque en todo lo que lleváis aquí no habéis dicho nada que valiera la pena. Ni un mensaje que alguien quisiera contestar, ni una opinión con algo detrás, ni una broma que hiciera reír a alguien que no fuerais vosotros. Cero aporte, cero gracia y cero cabeza: el grupo se ha cansado de cargar con vosotros y hoy os suelta en la puerta.',
  },
  {
    uno: '%M eres un parásito, hijo de puta, y lo has sido desde el primer día. Lees todo lo que escriben los demás, te ríes por dentro de lo que otros se curran y no devuelves ni un triste mensaje. Este grupo no es un cine gratis donde te sientas a mirar: aquí se aporta o se sale por la puerta, y tú elegiste la puerta hace mucho sin darte cuenta. Hoy solo se hace oficial.',
    varios: '%M sois parásitos, hijos de puta, y lo habéis sido desde el primer día. Leéis todo lo que escriben los demás, os reís por dentro de lo que otros se curran y no devolvéis ni un triste mensaje. Este grupo no es un cine gratis donde os sentáis a mirar: aquí se aporta o se sale por la puerta, y vosotros elegisteis la puerta hace mucho sin daros cuenta. Hoy solo se hace oficial.',
  },
  {
    uno: '%M eres un lastre, retrasado, y cada conversación en la que te metes se hunde un poco más. Preguntas lo que ya se explicó tres mensajes arriba, contestas lo que nadie te ha preguntado y, cuando por fin alguien te hace caso, es para corregirte. El grupo iba más rápido cuando no aparecías, y a partir de ahora va a ir así siempre. Te sacan para que el resto pueda avanzar.',
    varios: '%M sois un lastre, retrasados, y cada conversación en la que os metéis se hunde un poco más. Preguntáis lo que ya se explicó tres mensajes arriba, contestáis lo que nadie os ha preguntado y, cuando por fin alguien os hace caso, es para corregiros. El grupo iba más rápido cuando no aparecíais, y a partir de ahora va a ir así siempre. Os sacan para que el resto pueda avanzar.',
  },
  {
    uno: '%M todavía no te has ido y ya no te echa de menos nadie, imbécil, y eso lo resume todo. No aportas nada, no haces gracia y no sirves para ninguna de las cosas que este grupo necesita, que tampoco son tantas. Llevas tiempo sobrando y todo el mundo lo sabía menos tú. Hoy te lo dicen a la cara, delante de todos, para que no quede ninguna duda.',
    varios: '%M todavía no os habéis ido y ya no os echa de menos nadie, imbéciles, y eso lo resume todo. No aportáis nada, no hacéis gracia y no servís para ninguna de las cosas que este grupo necesita, que tampoco son tantas. Lleváis tiempo sobrando y todo el mundo lo sabía menos vosotros. Hoy os lo dicen a la cara, delante de todos, para que no quede ninguna duda.',
  },
  {
    uno: '%M ocupaste el sitio de alguien que sí valía, cabrón. Cada día que pasaste aquí fue un día regalado a quien no aporta nada, mientras fuera había gente que habría hecho de este grupo algo mejor. Se acabó el regalo: el sitio vuelve a quien se lo gane, y tú no te lo ganaste ni uno solo de los días que estuviste. Coge tus cosas, que no son muchas, y vete.',
    varios: '%M ocupasteis el sitio de gente que sí valía, cabrones. Cada día que pasasteis aquí fue un día regalado a quien no aporta nada, mientras fuera había gente que habría hecho de este grupo algo mejor. Se acabó el regalo: el sitio vuelve a quien se lo gane, y vosotros no os lo ganasteis ni uno solo de los días que estuvisteis. Coged vuestras cosas, que no son muchas, e idos.',
  },
  {
    uno: '%M no sirves para nada, gilipoyas, y no es una forma de hablar. No sirves para conversar, no sirves para hacer reír y no serviste para defender a nadie las veces que hizo falta. Quien no sirve para nada no forma parte de un grupo, por mucho que su nombre salga en la lista: es un estorbo con foto de perfil, y hoy el grupo se quita el estorbo de encima.',
    varios: '%M no servís para nada, gilipoyas, y no es una forma de hablar. No servís para conversar, no servís para hacer reír y no servisteis para defender a nadie las veces que hizo falta. Quien no sirve para nada no forma parte de un grupo, por mucho que su nombre salga en la lista: sois estorbos con foto de perfil, y hoy el grupo se quita los estorbos de encima.',
  },
  {
    uno: '%M no cuentas para nada en este grupo, puta. Si mañana desaparecieras, nadie tardaría más de un minuto en darse cuenta, y cuando se dieran cuenta nadie lo lamentaría. Así que para qué esperar a mañana. Te echan hoy por inútil y por sobrar, que es lo mismo dicho de dos formas, y el grupo sigue exactamente igual que antes, solo que con un problema menos.',
    varios: '%M no contáis para nada en este grupo, putas. Si mañana desaparecierais, nadie tardaría más de un minuto en darse cuenta, y cuando se dieran cuenta nadie lo lamentaría. Así que para qué esperar a mañana. Os echan hoy por inútiles y por sobrar, que es lo mismo dicho de dos formas, y el grupo sigue exactamente igual que antes, solo que con unos cuantos problemas menos.',
  },
  {
    uno: '%M llevas meses aquí y no has dicho una sola cosa que alguien recuerde, subnormal. Ni una broma, ni una opinión, ni una respuesta con algo dentro. No es timidez, que eso se pasa: es que no tienes nada que aportar y nunca lo vas a tener. Un grupo vive de lo que la gente pone en él, y tú solo has restado. Por eso te vas tú y se queda el resto.',
    varios: '%M lleváis meses aquí y no habéis dicho una sola cosa que alguien recuerde, subnormales. Ni una broma, ni una opinión, ni una respuesta con algo dentro. No es timidez, que eso se pasa: es que vosotros no tenéis nada que aportar y nunca lo vais a tener. Un grupo vive de lo que la gente pone en él, y vosotros solo habéis restado. Por eso os vais vosotros y se queda el resto.',
  },
  {
    uno: '%M el grupo no te echa por rencor, hijo de puta, te echa por higiene. Eres un peso muerto, y el peso muerto se tira antes de que hunda lo demás. No habrá discusión, no habrá segunda oportunidad y no habrá nadie que escriba pidiendo que vuelvas, porque para eso alguien tendría que haberte cogido cariño, y en todo este tiempo no lo ha hecho ni quien te metió.',
    varios: '%M el grupo no os echa por rencor, hijos de puta, os echa por higiene. Sois peso muerto, y el peso muerto se tira antes de que hunda lo demás. No habrá discusión, no habrá segunda oportunidad y no habrá nadie que escriba pidiendo que volváis, porque para eso alguien tendría que haberos cogido cariño, y en todo este tiempo no lo ha hecho ni quien os metió.',
  },
  {
    uno: '%M tu única aportación a este grupo ha sido hacer que el número de miembros suba en uno, imbécil. Subías la cifra y bajabas el nivel, y lo segundo pesaba bastante más que lo primero. Hoy se arreglan las dos cosas de golpe: un miembro menos y un estorbo menos. Nadie va a mirar el contador para ver cuántos quedan, porque lo que cuenta aquí es otra cosa, y de eso no tenías nada.',
    varios: '%M vuestra única aportación a este grupo ha sido hacer que el número de miembros suba, imbéciles. Subíais la cifra y bajabais el nivel, y lo segundo pesaba bastante más que lo primero. Hoy se arreglan las dos cosas de golpe: menos miembros y menos estorbos. Nadie va a mirar el contador para ver cuántos quedan, porque lo que cuenta aquí es otra cosa, y de eso no teníais nada.',
  },
  {
    uno: '%M no tienes ni puta idea de nada y aun así opinas de todo, gilipoyas. Opinas de lo que no sabes, corriges a quien sí sabe y, cuando te pillan, cambias de tema y haces como si nadie lo hubiera visto. Eso cansa, y el grupo hace tiempo que se cansó. Te echan por bocazas sin cerebro, y tus opiniones no las va a extrañar nadie, porque nadie te las pidió nunca.',
    varios: '%M no tenéis ni puta idea de nada y aun así opináis de todo, gilipoyas. Opináis de lo que no sabéis, corregís a quien sí sabe y, cuando os pillan, cambiáis de tema y hacéis como si nadie lo hubiera visto. Eso cansa, y el grupo hace tiempo que se cansó. Os echan por bocazas sin cerebro, y vuestras opiniones no las va a extrañar nadie, porque nadie os las pidió nunca.',
  },
  {
    uno: '%M solo apareces para pedir, para quejarte o para llorar, parásito de mierda, y nunca para dar. Cuando alguien necesita algo, desapareces; cuando tú necesitas algo, de repente el grupo es tu familia. Este chat no es tu servicio de atención al cliente ni tu muro de lamentaciones. Te echan por chupar sin devolver, que es lo único que has hecho aquí con constancia.',
    varios: '%M solo aparecéis para pedir, para quejaros o para llorar, parásitos de mierda, y nunca para dar. Cuando alguien necesita algo, desaparecéis; cuando vosotros necesitáis algo, de repente el grupo es vuestra familia. Este chat no es vuestro servicio de atención al cliente ni vuestro muro de lamentaciones. Os echan por chupar sin devolver, que es lo único que habéis hecho aquí con constancia.',
  },
  {
    uno: '%M se te dio sitio, tiempo y paciencia, retrasado, y lo convertiste todo en nada. No es mala suerte, ni que la gente no te entienda, ni que el grupo te tuviera manía: es que eres inútil, y la paciencia con la gente inútil tiene un límite. El tuyo llegó hace semanas; lo de hoy es solo el trámite que faltaba para que también lo vieras tú.',
    varios: '%M se os dio sitio, tiempo y paciencia, retrasados, y lo convertisteis todo en nada. No es mala suerte, ni que la gente no os entienda, ni que el grupo os tuviera manía: es que sois inútiles, y la paciencia con la gente inútil tiene un límite. El vuestro llegó hace semanas; lo de hoy es solo el trámite que faltaba para que también lo vierais vosotros.',
  },
  {
    uno: '%M no sabes ni cómo se llama la mitad del grupo, imbécil. No te has molestado en conocer a nadie y, como era de esperar, nadie se ha molestado en conocerte a ti. Eso no es estar en un grupo, es estar de mueble: algo que ocupa una esquina y que solo se nota cuando estorba al pasar. Y los muebles que estorban se sacan a la calle sin pedirles opinión.',
    varios: '%M no sabéis ni cómo se llama la mitad del grupo, imbéciles. No os habéis molestado en conocer a nadie y, como era de esperar, nadie se ha molestado en conoceros a vosotros. Eso no es estar en un grupo, es estar de mueble: algo que ocupa una esquina y que solo se nota cuando estorba al pasar. Y los muebles que estorban se sacan a la calle sin pedirles opinión.',
  },
  {
    uno: '%M cada vez que escribes baja el nivel del chat, gilipoyas. Faltas de ortografía que duelen, ideas que se quedan a medias y chistes que dan vergüenza ajena hasta a quien los lee sin querer. Todo lo que tocas lo empeoras un poco, y a fuerza de tocar mucho has dejado el grupo peor de lo que lo encontraste. Te echan para que vuelva a subir el escalón que bajaste.',
    varios: '%M cada vez que escribís baja el nivel del chat, gilipoyas. Faltas de ortografía que duelen, ideas que se quedan a medias y chistes que dan vergüenza ajena hasta a quien los lee sin querer. Todo lo que tocáis lo empeoráis un poco, y a fuerza de tocar mucho habéis dejado el grupo peor de lo que lo encontrasteis. Os echan para que vuelva a subir el escalón que bajasteis.',
  },
  {
    uno: '%M entras, miras y no haces nada, hijo de puta, y así durante meses. Lees las discusiones, ves las fotos, te enteras de todo y no dejas ni un mensaje a cambio. Este grupo no necesita espectadores, necesita gente con algo en la cabeza y ganas de usarla, y tú no tienes ninguna de las dos cosas. Te sacan por mirar sin aportar, que aquí es lo mismo que no estar.',
    varios: '%M entráis, miráis y no hacéis nada, hijos de puta, y así durante meses. Leéis las discusiones, veis las fotos, os enteráis de todo y no dejáis ni un mensaje a cambio. Este grupo no necesita espectadores, necesita gente con algo en la cabeza y ganas de usarla, y vosotros no tenéis ninguna de las dos cosas. Os sacan por mirar sin aportar, que aquí es lo mismo que no estar.',
  },
  {
    uno: '%M lo intentaste, eso hay que reconocerlo, subnormal. Lo intentaste muchas veces y no salió bien ni una. No es que no te dejaran hablar ni que te tuvieran manía: es que no das para más, y eso no se arregla insistiendo. Un grupo no se queda por pena con alguien que no llega al mínimo, y desde hoy este grupo ha dejado de tener pena.',
    varios: '%M lo intentasteis, eso hay que reconocerlo, subnormales. Lo intentasteis muchas veces y no salió bien ni una. No es que no os dejaran hablar ni que os tuvieran manía: es que no dais para más, y eso no se arregla insistiendo. Un grupo no se queda por pena con gente que no llega al mínimo, y desde hoy este grupo ha dejado de tener pena.',
  },
  {
    uno: '%M eres la persona más prescindible de este grupo, gilipoyas, y en el fondo lo sabías. Por eso esto no te pilla por sorpresa. Mañana nadie va a preguntar por ti, nadie va a pedir que vuelvas y la lista va a seguir igual de llena sin tu nombre. Te echan porque no hacías ninguna falta, y lo único que cambia hoy es que ya se ha enterado el grupo entero.',
    varios: '%M sois la gente más prescindible de este grupo, gilipoyas, y en el fondo lo sabíais. Por eso esto no os pilla por sorpresa. Mañana nadie va a preguntar por vosotros, nadie va a pedir que volváis y la lista va a seguir igual de llena sin vuestros nombres. Os echan porque no hacíais ninguna falta, y lo único que cambia hoy es que ya se ha enterado el grupo entero.',
  },
  {
    uno: '%M te echan por aburrir, puta, que también es un motivo. Cada mensaje tuyo era una siesta: largo, vacío y sin nada que contestar, de esos que se leen en diagonal y se olvidan antes de acabar. El grupo tiene cosas mejores que hacer que soportarte, y hasta hoy no tenía más remedio. A partir de ahora sí, y la primera es seguir hablando sin ti.',
    varios: '%M os echan por aburrir, putas, que también es un motivo. Cada mensaje vuestro era una siesta: largo, vacío y sin nada que contestar, de esos que se leen en diagonal y se olvidan antes de acabar. El grupo tiene cosas mejores que hacer que soportaros, y hasta hoy no tenía más remedio. A partir de ahora sí, y la primera es seguir hablando sin vosotros.',
  },
  {
    uno: '%M no tienes gracia, ni cabeza, ni nada interesante que decir, retrasado, y con nada no se gana un sitio en ninguna parte. Se ha buscado una sola cualidad tuya que justificara que siguieras aquí, una sola, y no ha aparecido. Ni simpatía, ni ingenio, ni utilidad. Cuando no hay nada que salvar, no se salva nada, y por eso hoy te sacan sin pensarlo dos veces.',
    varios: '%M no tenéis gracia, ni cabeza, ni nada interesante que decir, retrasados, y con nada no se gana un sitio en ninguna parte. Se ha buscado una sola cualidad vuestra que justificara que siguierais aquí, una sola, y no ha aparecido. Ni simpatía, ni ingenio, ni utilidad. Cuando no hay nada que salvar, no se salva nada, y por eso hoy os sacan sin pensarlo dos veces.',
  },
  {
    uno: '%M el grupo votó sin votar, imbécil, y el resultado es que nadie te quiere aquí. No hizo falta ninguna encuesta: bastaba ver cómo se cambiaba de tema cada vez que aparecías, cómo se quedaban tus mensajes sin respuesta y cómo volvía la conversación en cuanto te callabas. Te echan por insoportable y por inútil, y la decisión fue unánime aunque nadie levantara la mano.',
    varios: '%M el grupo votó sin votar, imbéciles, y el resultado es que nadie os quiere aquí. No hizo falta ninguna encuesta: bastaba ver cómo se cambiaba de tema cada vez que aparecíais, cómo se quedaban vuestros mensajes sin respuesta y cómo volvía la conversación en cuanto os callabais. Os echan por insoportables y por inútiles, y la decisión fue unánime aunque nadie levantara la mano.',
  },
  {
    uno: '%M has tenido meses para demostrar que valías algo, gilipoyas, y no has demostrado absolutamente nada. Ni una conversación buena, ni un momento que alguien quiera recordar, ni un detalle con nadie. Cualquiera habría aprovechado ese tiempo para ganarse a la gente; tú lo usaste para confirmar que no vales. El plazo se ha acabado y la respuesta es la que todos esperaban.',
    varios: '%M habéis tenido meses para demostrar que valíais algo, gilipoyas, y no habéis demostrado absolutamente nada. Ni una conversación buena, ni un momento que alguien quiera recordar, ni un detalle con nadie. Cualquiera habría aprovechado ese tiempo para ganarse a la gente; vosotros lo usasteis para confirmar que no valéis. El plazo se ha acabado y la respuesta es la que todos esperaban.',
  },
  {
    uno: '%M eres un chupóptero, hijo de puta. Te aprovechas de todo lo que montan los demás, de las risas, de los planes y de la información, y no pones ni un mensaje de tu parte. Aquí nadie trabaja para que tú mires desde el sofá. Te echan por vivir de los demás sin poner nada, y fuera vas a descubrir que en ningún sitio te lo regalan.',
    varios: '%M sois unos chupópteros, hijos de puta. Os aprovecháis de todo lo que montan los demás, de las risas, de los planes y de la información, y no ponéis ni un mensaje de vuestra parte. Aquí nadie trabaja para que vosotros miréis desde el sofá. Os echan por vivir de los demás sin poner nada, y fuera vais a descubrir que en ningún sitio os lo regalan.',
  },
  {
    uno: '%M hay gente que se fue de este grupo por no aguantarte, subnormal. Gente que valía, que aportaba y que se cansó de verte en cada conversación. El grupo perdió a quien merecía la pena por quedarse contigo, que no aportas nada, y ese fue el peor cambio que se ha hecho aquí. Hoy se deshace el error: sales tú, y con un poco de suerte vuelve esa gente.',
    varios: '%M hay gente que se fue de este grupo por no aguantaros, subnormales. Gente que valía, que aportaba y que se cansó de veros en cada conversación. El grupo perdió a quien merecía la pena por quedarse con vosotros, que no aportáis nada, y ese fue el peor cambio que se ha hecho aquí. Hoy se deshace el error: salís vosotros, y con un poco de suerte vuelve esa gente.',
  },
  {
    uno: '%M te echan por dar el coñazo, gilipoyas. Repites lo mismo diez veces, insistes cuando nadie te contesta, te metes donde no te llaman y luego te ofendes cuando te lo dicen. Se puede aguantar a alguien así una semana, quizá dos si sobra la paciencia. El grupo te ha aguantado meses, y la paciencia se le ha terminado hoy, contigo delante.',
    varios: '%M os echan por dar el coñazo, gilipoyas. Repetís lo mismo diez veces, insistís cuando nadie os contesta, os metéis donde no os llaman y luego os ofendéis cuando os lo dicen. Se puede aguantar a gente así una semana, quizá dos si sobra la paciencia. El grupo os ha aguantado meses, y la paciencia se le ha terminado hoy, con vosotros delante.',
  },
  {
    uno: '%M no aportas, no ayudas y no haces gracia, puta. Son tres cosas, ninguna difícil, y no cumples ni una. El grupo no pide mucho, solo que quien está esté por algo: por lo que cuenta, por cómo hace reír o porque echa una mano cuando toca. Tú no estabas por nada, estabas por inercia, y la inercia se corta hoy sin más vueltas.',
    varios: '%M no aportáis, no ayudáis y no hacéis gracia, putas. Son tres cosas, ninguna difícil, y no cumplís ni una. El grupo no pide mucho, solo que quien está esté por algo: por lo que cuenta, por cómo hace reír o porque echa una mano cuando toca. Vosotros no estabais por nada, estabais por inercia, y la inercia se corta hoy sin más vueltas.',
  },
  {
    uno: '%M nunca has defendido a nadie, nunca has ayudado a nadie y nunca has hecho reír a nadie, cabrón. Has pasado por aquí sin dejar una sola cosa buena, solo el nombre en la lista y algún mensaje que nadie se molestó en contestar. En un grupo de gente eso te convierte en un estorbo, y hoy el grupo hace limpieza y empieza por ti.',
    varios: '%M nunca habéis defendido a nadie, nunca habéis ayudado a nadie y nunca habéis hecho reír a nadie, cabrones. Habéis pasado por aquí sin dejar una sola cosa buena, solo el nombre en la lista y algún mensaje que nadie se molestó en contestar. En un grupo de gente eso os convierte en estorbos, y hoy el grupo hace limpieza y empieza por vosotros.',
  },
  {
    uno: '%M tu cerebro no da para seguir una conversación, retrasado. Llegas tarde, entiendes la mitad, contestas a lo que no era y encima te molesta que te corrijan. El grupo no va a ir más despacio para que lo alcances ni va a explicarte cada cosa dos veces. Te echan por no llegar ni al mínimo que hace falta para estar aquí, que tampoco era tan alto.',
    varios: '%M vuestro cerebro no da para seguir una conversación, retrasados. Llegáis tarde, entendéis la mitad, contestáis a lo que no era y encima os molesta que os corrijan. El grupo no va a ir más despacio para que lo alcancéis ni va a explicaros cada cosa dos veces. Os echan por no llegar ni al mínimo que hace falta para estar aquí, que tampoco era tan alto.',
  },
  {
    uno: '%M eres la prueba de que no todo el mundo vale para estar en un grupo, imbécil. No sabes hablar sin aburrir, no sabes escuchar sin interrumpir y no sabes callarte cuando toca. Son las tres cosas básicas, las que aprende cualquiera en el colegio, y no has aprendido ninguna. Te sacan por no saber hacer nada de lo que hace falta aquí.',
    varios: '%M sois la prueba de que no todo el mundo vale para estar en un grupo, imbéciles. No sabéis hablar sin aburrir, no sabéis escuchar sin interrumpir y no sabéis callaros cuando toca. Son las tres cosas básicas, las que aprende cualquiera en el colegio, y no habéis aprendido ninguna. Os sacan por no saber hacer nada de lo que hace falta aquí.',
  },
  {
    uno: '%M te echan por rata, hijo de puta. Recibes todo lo que el grupo da, las risas, los consejos y los avisos, y no sueltas ni las gracias. Aquí se comparte, y quien solo coge no pertenece aquí: es una sanguijuela pegada a la conversación de los demás. A las sanguijuelas no se les dan explicaciones, se las arranca, y eso es lo que está pasando ahora.',
    varios: '%M os echan por ratas, hijos de puta. Recibís todo lo que el grupo da, las risas, los consejos y los avisos, y no soltáis ni las gracias. Aquí se comparte, y quien solo coge no pertenece aquí: sois sanguijuelas pegadas a la conversación de los demás. A las sanguijuelas no se les dan explicaciones, se las arranca, y eso es lo que está pasando ahora.',
  },
  {
    uno: '%M nadie te ha contestado un mensaje en semanas, gilipoyas, y no es casualidad ni que se les pasara: es que no hay nada que contestarte. Llevas todo ese tiempo hablándole a la pared, y hoy hasta la pared se ha cansado de oírte. Te echan porque en semanas no has escrito ni una frase que mereciera respuesta.',
    varios: '%M nadie os ha contestado un mensaje en semanas, gilipoyas, y no es casualidad ni que se les pasara: es que no hay nada que contestaros. Lleváis todo ese tiempo hablándole a la pared, y hoy hasta la pared se ha cansado de oíros. Os echan porque en semanas no habéis escrito ni una frase que mereciera respuesta.',
  },
  {
    uno: '%M tienes un sitio en este grupo y no lo usas para nada, puta. Ni para hablar, ni para reír, ni para conocer a nadie, ni siquiera para discutir. Un sitio que no se usa no se guarda por si acaso: se le da a otra persona que sí lo vaya a aprovechar. Te echan por desperdiciarlo durante meses, y lo vas a echar en falta tú bastante antes que el grupo a ti.',
    varios: '%M tenéis un sitio en este grupo y no lo usáis para nada, putas. Ni para hablar, ni para reír, ni para conocer a nadie, ni siquiera para discutir. Un sitio que no se usa no se guarda por si acaso: se le da a otra persona que sí lo vaya a aprovechar. Os echan por desperdiciarlo durante meses, y lo vais a echar en falta vosotros bastante antes que el grupo a vosotros.',
  },
  {
    uno: '%M no te echa nadie en concreto, subnormal, te echa el grupo entero, que lleva tiempo harto de ti. No hace falta explicarlo mucho porque todo el mundo lo ha visto: eres inútil, molestas y no aportas. Con una de las tres habría bastado para tenerte vigilado; con las tres juntas, lo raro es que hayas durado tanto.',
    varios: '%M no os echa nadie en concreto, subnormales, os echa el grupo entero, que lleva tiempo harto de vosotros. No hace falta explicarlo mucho porque todo el mundo lo ha visto: sois inútiles, molestáis y no aportáis. Con una de las tres habría bastado para teneros vigilados; con las tres juntas, lo raro es que hayáis durado tanto.',
  },
  {
    uno: '%M mandas audios de tres minutos para no decir nada, gilipoyas, y textos de tres líneas para decir todavía menos. La gente los abre por educación, los deja a medias por salud y sigue con lo suyo. El grupo no tiene tiempo para tu vacío, y no tienes nada más que ofrecer. Te echan por hacerle perder el tiempo a todo el mundo cada vez que abres el micro.',
    varios: '%M mandáis audios de tres minutos para no decir nada, gilipoyas, y textos de tres líneas para decir todavía menos. La gente los abre por educación, los deja a medias por salud y sigue con lo suyo. El grupo no tiene tiempo para vuestro vacío, y no tenéis nada más que ofrecer. Os echan por hacerle perder el tiempo a todo el mundo cada vez que abrís el micro.',
  },
  {
    uno: '%M cuando hablas, se calla el grupo, imbécil, y no es de respeto: es de vergüenza ajena. Cada vez que abres la boca alguien tiene que cambiar de tema para rescatar la conversación, y siempre le toca a la misma gente. Te echan para que dejen de tener ese trabajo. A partir de hoy, cuando el chat se quede en silencio, será por otra cosa.',
    varios: '%M cuando habláis, se calla el grupo, imbéciles, y no es de respeto: es de vergüenza ajena. Cada vez que abrís la boca alguien tiene que cambiar de tema para rescatar la conversación, y siempre le toca a la misma gente. Os echan para que dejen de tener ese trabajo. A partir de hoy, cuando el chat se quede en silencio, será por otra cosa.',
  },
  {
    uno: '%M todo lo que tocas lo amargas, hijo de puta. Discusiones que no llevan a ninguna parte, quejas sin motivo, indirectas a destiempo y mal rollo gratis cada vez que el ambiente estaba bien. No aportas nada bueno y encima restas lo poco bueno que traen los demás. Te echan por amargarle el grupo a todo el mundo, y el grupo va a respirar en cuanto salgas.',
    varios: '%M todo lo que tocáis lo amargáis, hijos de puta. Discusiones que no llevan a ninguna parte, quejas sin motivo, indirectas a destiempo y mal rollo gratis cada vez que el ambiente estaba bien. No aportáis nada bueno y encima restáis lo poco bueno que traen los demás. Os echan por amargarle el grupo a todo el mundo, y el grupo va a respirar en cuanto salgáis.',
  },
  {
    uno: '%M te creías importante aquí, retrasado. No lo eras, y nunca lo fuiste. Nadie te consultaba antes de decidir nada, nadie esperaba tus mensajes y nadie te va a extrañar ni un día. Esa importancia solo existía en tu cabeza, y fuera de tu cabeza no la ha visto nadie. Te echan porque desde que entraste no has importado absolutamente nada.',
    varios: '%M os creíais importantes aquí, retrasados. No lo erais, y nunca lo fuisteis. Nadie os consultaba antes de decidir nada, nadie esperaba vuestros mensajes y nadie os va a extrañar ni un día. Esa importancia solo existía en vuestra cabeza, y fuera de vuestra cabeza no la ha visto nadie. Os echan porque desde que entrasteis no habéis importado absolutamente nada.',
  },
  {
    uno: '%M eres un desperdicio de sitio, gilipoyas. Hay gente esperando a entrar en este grupo que valdría diez veces más que tú y que en una semana aportaría lo que tú no has aportado nunca. Te echan para dejarle hueco a esa gente. No es nada personal, aunque te lo vayas a tomar así: es pura cuenta, y la tuya sale en negativo.',
    varios: '%M sois un desperdicio de sitio, gilipoyas. Hay gente esperando a entrar en este grupo que valdría diez veces más que vosotros y que en una semana aportaría lo que vosotros no habéis aportado nunca. Os echan para dejarle hueco a esa gente. No es nada personal, aunque os lo vayáis a tomar así: es pura cuenta, y la vuestra sale en negativo.',
  },
  {
    uno: '%M solo te enteras de las cosas cuando ya han pasado, subnormal, y entonces preguntas «qué ha pasado» como si alguien tuviera la obligación de contártelo. Nadie te va a hacer el resumen otra vez, porque ya te lo hicieron demasiadas. Te echan por no estar nunca cuando hace falta y por no enterarte de nada cuando estás. Para eso, mejor no estar.',
    varios: '%M solo os enteráis de las cosas cuando ya han pasado, subnormales, y entonces preguntáis «qué ha pasado» como si alguien tuviera la obligación de contároslo. Nadie os va a hacer el resumen otra vez, porque ya os lo hicieron demasiadas. Os echan por no estar nunca cuando hace falta y por no enteraros de nada cuando estáis. Para eso, mejor no estar.',
  },
  {
    uno: '%M no hay nada que defender de ti, imbécil, y se ha intentado. Se ha repasado el chat buscando un mensaje bueno, un detalle con alguien, un momento en el que hubieras estado a la altura, y no aparece ninguno. Cuando ni quien quiere defenderte encuentra con qué, la decisión se toma sola. Te echan por inútil de principio a fin, sin una sola excepción.',
    varios: '%M no hay nada que defender de vosotros, imbéciles, y se ha intentado. Se ha repasado el chat buscando un mensaje bueno, un detalle con alguien, un momento en el que hubierais estado a la altura, y no aparece ninguno. Cuando ni quien quiere defenderos encuentra con qué, la decisión se toma sola. Os echan por inútiles de principio a fin, sin una sola excepción.',
  },
  {
    uno: '%M te echan por cobarde, gilipoyas. Nunca te mojas, nunca das la cara y siempre esperas a ver qué dicen los demás para repetirlo con otras palabras. Cuando hay que posicionarse, desapareces, y cuando ya está todo decidido, apareces dándole la razón a quien ganó. El grupo no necesita un eco: ya tiene a la gente que piensa por sí misma, y tú no estás entre ella.',
    varios: '%M os echan por cobardes, gilipoyas. Nunca os mojáis, nunca dais la cara y siempre esperáis a ver qué dicen los demás para repetirlo con otras palabras. Cuando hay que posicionarse, desaparecéis, y cuando ya está todo decidido, aparecéis dándole la razón a quien ganó. El grupo no necesita ecos: ya tiene a la gente que piensa por sí misma, y vosotros no estáis entre ella.',
  },
  {
    uno: '%M eres la razón de que este grupo esté más muerto de lo que debería, puta. Donde escribes tú, se apaga la conversación; donde no estás, la gente se ríe. Esa diferencia se ve a simple vista, y todo el mundo la ha visto menos tú. Te echan para que el chat vuelva a tener vida, y vas a ver cómo vuelve en cuanto salgas por la puerta.',
    varios: '%M sois la razón de que este grupo esté más muerto de lo que debería, putas. Donde escribís vosotros, se apaga la conversación; donde no estáis, la gente se ríe. Esa diferencia se ve a simple vista, y todo el mundo la ha visto menos vosotros. Os echan para que el chat vuelva a tener vida, y vais a ver cómo vuelve en cuanto salgáis por la puerta.',
  },
  {
    uno: '%M no te echan por un mensaje, hijo de puta, te echan por todos. Por cada uno que no decía nada, por cada silencio que no hacía falta y por cada vez que apareciste solo para estorbar. No es una sola cosa lo que pesa, es la suma, y la suma de todo lo que has hecho aquí da cero. Con cero no se queda nadie en ningún grupo.',
    varios: '%M no os echan por un mensaje, hijos de puta, os echan por todos. Por cada uno que no decía nada, por cada silencio que no hacía falta y por cada vez que aparecisteis solo para estorbar. No es una sola cosa lo que pesa, es la suma, y la suma de todo lo que habéis hecho aquí da cero. Con cero no se queda nadie en ningún grupo.',
  },
  {
    uno: '%M ni siquiera molestas, retrasado, y eso es lo más triste. Para molestar hay que hacerse notar, y tú no llegas ni a eso. Eres inútil hasta para estorbar, que ya tiene mérito. Cuando salgas no se va a abrir ningún hueco, porque en ese sitio nunca hubo nada. Te sacan para que la lista de miembros diga la verdad sobre quién está aquí.',
    varios: '%M ni siquiera molestáis, retrasados, y eso es lo más triste. Para molestar hay que hacerse notar, y vosotros no llegáis ni a eso. Sois inútiles hasta para estorbar, que ya tiene mérito. Cuando salgáis no se va a abrir ningún hueco, porque en ese sitio nunca hubo nada. Os sacan para que la lista de miembros diga la verdad sobre quién está aquí.',
  },
  {
    uno: '%M te pasas el día en línea y no escribes nada, gilipoyas. Mirarlo todo y no aportar nada tiene un nombre, y es parásito. Ves cada mensaje, cada foto y cada discusión, y lo único que se sabe de ti es que tu punto verde está encendido. El grupo no es tu entretenimiento gratis, y te echan por chupar del chat sin dar nada a cambio.',
    varios: '%M os pasáis el día en línea y no escribís nada, gilipoyas. Mirarlo todo y no aportar nada tiene un nombre, y es parásito. Veis cada mensaje, cada foto y cada discusión, y lo único que se sabe de vosotros es que vuestro punto verde está encendido. El grupo no es vuestro entretenimiento gratis, y os echan por chupar del chat sin dar nada a cambio.',
  },
  {
    uno: '%M dijiste que ibas a cambiar y no cambiaste nada, imbécil. Seguiste igual de inútil, con la misma nada en la cabeza y las mismas excusas de siempre. Las promesas no dan sitio en este grupo, lo dan los hechos, y de ti no hay ni uno que contar. Te echan por prometer una vez más lo que no ibas a cumplir y por no aprender nunca, que es lo único que has hecho con constancia.',
    varios: '%M dijisteis que ibais a cambiar y no cambiasteis nada, imbéciles. Seguisteis igual de inútiles, con la misma nada en la cabeza y las mismas excusas de siempre. Las promesas no dan sitio en este grupo, lo dan los hechos, y de vosotros no hay ni uno que contar. Os echan por prometer una vez más lo que no ibais a cumplir y por no aprender nunca, que es lo único que habéis hecho sin falta.',
  },
  {
    uno: '%M en tu cabeza todo gira alrededor de ti, hijo de puta, pero en este grupo no gira nada a tu alrededor: eres ruido de fondo. Hablas de ti, contestas pensando en ti y, cuando el tema no va contigo, desapareces. Te echan por creerte el centro sin aportar una mierda, y nadie se va a girar a mirar cómo te vas.',
    varios: '%M en vuestra cabeza todo gira alrededor de vosotros, hijos de puta, pero en este grupo no gira nada a vuestro alrededor: sois ruido de fondo. Habláis de vosotros, contestáis pensando en vosotros y, cuando el tema no va con vosotros, desaparecéis. Os echan por creeros el centro sin aportar una mierda, y nadie se va a girar a mirar cómo os vais.',
  },
  {
    uno: '%M esto no es una expulsión injusta, subnormal: es la más justa que ha hecho este grupo. No aportas, no sumas y no mejoras nada de lo que tocas, y eso no lo dice una persona, lo dice el chat entero. Si alguien quiere defenderte, este es el momento de escribir. Mira cómo no escribe nadie, porque nadie lo va a hacer.',
    varios: '%M esto no es una expulsión injusta, subnormales: es la más justa que ha hecho este grupo. No aportáis, no sumáis y no mejoráis nada de lo que tocáis, y eso no lo dice una persona, lo dice el chat entero. Si alguien quiere defenderos, este es el momento de escribir. Mirad cómo no escribe nadie por vosotros, porque nadie lo va a hacer.',
  },
  {
    uno: '%M el grupo te ha dado más oportunidades de las que merecías, gilipoyas, y las has tirado todas una detrás de otra. Ya no queda ninguna. Te echan por inútil, por no aportar y por no haber aprendido nada en todo el tiempo que te han aguantado. Lo que hagas a partir de ahora ya no es problema de este grupo, y eso es lo mejor que le ha pasado en meses.',
    varios: '%M el grupo os ha dado más oportunidades de las que merecíais, gilipoyas, y las habéis tirado todas una detrás de otra. Ya no queda ninguna. Os echan por inútiles, por no aportar y por no haber aprendido nada en todo el tiempo que os han aguantado. Lo que hagáis a partir de ahora ya no es problema de este grupo, y eso es lo mejor que le ha pasado en meses.',
  },
];

module.exports = { AVISOS_KICK };
