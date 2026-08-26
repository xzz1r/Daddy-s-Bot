// Avisos de !kick. Salen en el grupo ANTES de echar, para que lo vean.
//
// El hueso es el mismo que en !purge — no perteneces, sobras — pero más hiriente:
// !kick lo usan los admins, se ve en el grupo y tiene que doler.
// El ángulo NO es siempre "no eres suficiente": si todos dicen lo mismo, el
// grupo deja de leerlo. Cada entrada ataca el mismo sitio por un sitio distinto.
//
// %M se sustituye por las menciones. Cada entrada trae singular (tú) y plural
// (ustedes). Español neutral: sin vosotros.

const AVISOS_KICK = [
  {
    uno: '%M no eres suficiente para este grupo.\nTe creíste parte. Lo único que fuiste es un hueco ocupado. El grupo te tuvo dentro por inercia, no porque valieras un puto sitio. Se acabó.',
    varios: '%M no son suficientes para este grupo.\nSe creyeron parte. Lo único que fueron es un hueco ocupado. El grupo los tuvo dentro por inercia, no porque valieran un puto sitio. Se acabó.',
  },
  {
    uno: '%M este grupo te queda grande y te quedó grande desde el primer día.\nNo das la talla ni de lejos. Estuviste de relleno, nunca de miembro. El grupo funciona mejor el segundo en que te vas.',
    varios: '%M este grupo les queda grande y les quedó grande desde el primer día.\nNo dan la talla ni de lejos. Estuvieron de relleno, nunca de miembros. El grupo funciona mejor el segundo en que se van.',
  },
  {
    uno: '%M no das para este grupo. No diste nunca.\nOcupaste espacio, gastaste paciencia y no dejaste una sola huella que merezca quedarse. No eres suficiente ni para el hueco que calientas. Fuera.',
    varios: '%M no dan para este grupo. No dieron nunca.\nOcuparon espacio, gastaron paciencia y no dejaron una sola huella que merezca quedarse. No son suficientes ni para el hueco que calientan. Fuera.',
  },
  {
    uno: '%M ¿de verdad pensaste que este grupo te necesitaba?\nNo. No eres suficiente. El grupo se construyó sin ti, funcionó a pesar de ti y va a respirar mejor sin ti. Sobras entero.',
    varios: '%M ¿de verdad pensaron que este grupo los necesitaba?\nNo. No son suficientes. El grupo se construyó sin ustedes, funcionó a pesar de ustedes y va a respirar mejor sin ustedes. Sobran enteros.',
  },
  {
    uno: '%M no eres suficiente y se nota en cada rastro que dejaste.\nEstar en la lista no es pertenecer. Estuviste de más desde que entraste. El grupo no perdió nada: se quitó un peso. Fuera.',
    varios: '%M no son suficientes y se nota en cada rastro que dejaron.\nEstar en la lista no es pertenecer. Estuvieron de más desde que entraron. El grupo no perdió nada: se quitó un peso. Fuera.',
  },
  {
    uno: '%M el grupo no te echa con pena. Te echa con alivio.\nNo eres suficiente. Nunca lo fuiste. Te creíste a la altura de gente que no te daría ni la hora. Aquí se acaba el disfraz.',
    varios: '%M el grupo no los echa con pena. Los echa con alivio.\nNo son suficientes. Nunca lo fueron. Se creyeron a la altura de gente que no les daría ni la hora. Aquí se acaba el disfraz.',
  },
  {
    uno: '%M no llegas. No llegaste nunca.\nEste grupo no es para quien ocupa sitio sin justificarlo. No eres suficiente ni para que alguien note el hueco cuando te vayas. Fuera.',
    varios: '%M no llegan. No llegaron nunca.\nEste grupo no es para quien ocupa sitio sin justificarlo. No son suficientes ni para que alguien note el hueco cuando se vayan. Fuera.',
  },
  {
    uno: '%M te creíste miembro. Fuiste un invitado que se quedó de más.\nNo eres suficiente para este grupo. El grupo te midió, te encontró corto y no va a volver a hacerte el favor. Fuera.',
    varios: '%M se creyeron miembros. Fueron invitados que se quedaron de más.\nNo son suficientes para este grupo. El grupo los midió, los encontró cortos y no va a volver a hacerles el favor. Fuera.',
  },
  {
    uno: '%M ocupaste el sitio de alguien que sí habría valido.\nNo eres suficiente. Nunca diste la talla. El grupo te aguantó, no te quiso, y ya no te va a aguantar más. Fuera.',
    varios: '%M ocuparon el sitio de gente que sí habría valido.\nNo son suficientes. Nunca dieron la talla. El grupo los aguantó, no los quiso, y ya no los va a aguantar más. Fuera.',
  },
  {
    uno: '%M para cuando termines de leer esto, el grupo ya te olvidó.\nNo eres suficiente. No lo fuiste el día que entraste y no lo eres ahora. Tu ausencia es una mejora. Fuera.',
    varios: '%M para cuando terminen de leer esto, el grupo ya los olvidó.\nNo son suficientes. No lo fueron el día que entraron y no lo son ahora. Su ausencia es una mejora. Fuera.',
  },
  {
    uno: '%M te confundiste: que te dejaran estar no era que te quisieran.\nTe toleraron. Te aguantaron. Estabas en la lista porque nadie se tomó el trabajo de borrarte. Eso se acaba ahora. Fuera.',
    varios: '%M se confundieron: que los dejaran estar no era que los quisieran.\nLos toleraron. Los aguantaron. Estaban en la lista porque nadie se tomó el trabajo de borrarlos. Eso se acaba ahora. Fuera.',
  },
  {
    uno: '%M mira alrededor. Nadie se está moviendo para quedarte.\nSi importaras, alguien habría abierto la boca. El silencio del grupo es el veredicto, y no hay apelación. Fuera.',
    varios: '%M miren alrededor. Nadie se está moviendo para quedárselos.\nSi importaran, alguien habría abierto la boca. El silencio del grupo es el veredicto, y no hay apelación. Fuera.',
  },
  {
    uno: '%M esto no es una discusión. Es un aviso.\nEl grupo ya decidió. Tú te enteras ahora. No hay debate, no hay segunda ronda, no hay "espera un momento". Fuera.',
    varios: '%M esto no es una discusión. Es un aviso.\nEl grupo ya decidió. Ustedes se enteran ahora. No hay debate, no hay segunda ronda, no hay "esperen un momento". Fuera.',
  },
  {
    uno: '%M eras mueble. Se te sentaba al lado y se te olvidaba.\nUn mueble se cambia cuando estorba. Estorbas. El grupo acaba de hacer limpieza. Fuera.',
    varios: '%M eran mueble. Se les sentaba al lado y se les olvidaba.\nUn mueble se cambia cuando estorba. Estorban. El grupo acaba de hacer limpieza. Fuera.',
  },
  {
    uno: '%M tu nombre en la lista fue un error administrativo.\nAlguien te dejó entrar y nadie te reclamó. Eso no es pertenecer: es un descuido. Los descuidos se corrigen. Fuera.',
    varios: '%M sus nombres en la lista fueron un error administrativo.\nAlguien los dejó entrar y nadie los reclamó. Eso no es pertenecer: es un descuido. Los descuidos se corrigen. Fuera.',
  },
  {
    uno: '%M el grupo iba más lento por cargarte.\nNo aportaste peso de valor: aportaste lastre. El lastre se tira por la borda cuando hay que avanzar. Te toca. Fuera.',
    varios: '%M el grupo iba más lento por cargarlos.\nNo aportaron peso de valor: aportaron lastre. El lastre se tira por la borda cuando hay que avanzar. Les toca. Fuera.',
  },
  {
    uno: '%M tu última oportunidad pasó hace tiempo y ni te enteraste.\nEl grupo te dio cuerda. La gastaste en no ser nadie. Hoy no hay más. Fuera.',
    varios: '%M su última oportunidad pasó hace tiempo y ni se enteraron.\nEl grupo les dio cuerda. La gastaron en no ser nadie. Hoy no hay más. Fuera.',
  },
  {
    uno: '%M cuando te vayas, nadie va a preguntar dónde estás.\nEso no es crueldad: es diagnóstico. Si nadie te busca, es que no hacías falta. Fuera.',
    varios: '%M cuando se vayan, nadie va a preguntar dónde están.\nEso no es crueldad: es diagnóstico. Si nadie los busca, es que no hacían falta. Fuera.',
  },
  {
    uno: '%M este grupo no es un refugio para el que no pinta nada.\nEntraste como si el sitio fuera un derecho. No lo es. Se gana, y tú no lo ganaste. Fuera.',
    varios: '%M este grupo no es un refugio para el que no pinta nada.\nEntraron como si el sitio fuera un derecho. No lo es. Se gana, y ustedes no lo ganaron. Fuera.',
  },
  {
    uno: '%M no hay juicio. No hay descargo. No hay "déjame explicar".\nEl grupo no te debe una audiencia. Te debe una salida. Esta es. Fuera.',
    varios: '%M no hay juicio. No hay descargo. No hay "déjennos explicar".\nEl grupo no les debe una audiencia. Les debe una salida. Esta es. Fuera.',
  },
  {
    uno: '%M eras ruido de fondo. Se te oía y se te ignoraba.\nEl grupo acaba de bajar el volumen a cero. No vas a faltar porque nunca sonaste. Fuera.',
    varios: '%M eran ruido de fondo. Se les oía y se les ignoraba.\nEl grupo acaba de bajar el volumen a cero. No van a faltar porque nunca sonaron. Fuera.',
  },
  {
    uno: '%M este grupo te estuvo examinando desde el primer día.\nNo aprobaste. No te avisaron porque no hacía falta: el resultado se veía solo. Hoy se publica. Fuera.',
    varios: '%M este grupo los estuvo examinando desde el primer día.\nNo aprobaron. No les avisaron porque no hacía falta: el resultado se veía solo. Hoy se publica. Fuera.',
  },
  {
    uno: '%M te tuvieron por lástima, no por mérito.\nEsa limosna se termina. El grupo no es caridad y tú no eres un caso social. Fuera.',
    varios: '%M los tuvieron por lástima, no por mérito.\nEsa limosna se termina. El grupo no es caridad y ustedes no son un caso social. Fuera.',
  },
  {
    uno: '%M te fuiste hace tiempo. Hoy solo se hace oficial.\nDejaste de contar el día en que el grupo aprendió a funcionar sin mirarte. La lista se pone al día. Fuera.',
    varios: '%M se fueron hace tiempo. Hoy solo se hace oficial.\nDejaron de contar el día en que el grupo aprendió a funcionar sin mirarlos. La lista se pone al día. Fuera.',
  },
  {
    uno: '%M esta puerta no se vuelve a abrir para ti.\nNo es un castigo con fecha. Es un cierre. El grupo ya te tuvo y ya te midió. No hay reingreso. Fuera.',
    varios: '%M esta puerta no se vuelve a abrir para ustedes.\nNo es un castigo con fecha. Es un cierre. El grupo ya los tuvo y ya los midió. No hay reingreso. Fuera.',
  },
];

module.exports = { AVISOS_KICK };
