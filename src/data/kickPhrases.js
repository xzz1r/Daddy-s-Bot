// Avisos de !kick. Salen en el grupo ANTES de echar, para que lo vean.
//
// Si alguien llega aquí es porque era mierda en el grupo. El aviso no informa:
// sentencia. Largo, con arsenal, sin consuelo. Cada entrada ataca un ángulo
// distinto (parásito, plaza robada, lástima, fantasma, lastre, asco, silencio
// del grupo, puerta sellada) para que no se reciten.
//
// %M se sustituye por las menciones. Cada entrada trae singular (tú) y plural
// (ustedes). Español neutral: sin vosotros.

const AVISOS_KICK = [
  {
    uno: '%M eres un parásito de mierda y el grupo acaba de dejar de alimentarte.\nLlevas aquí leyendo lo que otros se curran, chupando el drama, el chiste y el aire, y devolviendo exactamente nada. Ni una puta palabra que mereciera quedarse. Ocupaste plaza, comiste paciencia y fuiste un cero a la izquierda con número de teléfono. El grupo no te pierde: se quita una garrapata. No hay hueco que tapar porque el hueco eras tú, y ya nadie lo va a notar. Fuera, inútil.',
    varios: '%M son parásitos de mierda y el grupo acaba de dejar de alimentarlos.\nLlevan aquí leyendo lo que otros se curran, chupando el drama, el chiste y el aire, y devolviendo exactamente nada. Ni una puta palabra que mereciera quedarse. Ocuparon plaza, comieron paciencia y fueron un cero a la izquierda con número de teléfono. El grupo no los pierde: se quita unas garrapatas. No hay hueco que tapar porque el hueco eran ustedes, y ya nadie lo va a notar. Fuera, inútiles.',
  },
  {
    uno: '%M ocupaste el puto sitio de alguien que sí habría valido y lo calentaste como el fracasado que eres.\nEl grupo te aguantó por pereza de borrarte, no porque aportaras una mierda. Eres lastre. Eres el asiento vacío que respira. Cada día que te dejaron dentro fue un día robado a alguien decente. Estuviste de relleno, nunca de miembro, y se te vio desde el primer puto día. Eso se acaba ahora. Fuera, desperdicio.',
    varios: '%M ocuparon el puto sitio de gente que sí habría valido y lo calentaron como los fracasados que son.\nEl grupo los aguantó por pereza de borrarlos, no porque aportaran una mierda. Son lastre. Son el asiento vacío que respira. Cada día que los dejaron dentro fue un día robado a alguien decente. Estuvieron de relleno, nunca de miembros, y se les vio desde el primer puto día. Eso se acaba ahora. Fuera, desperdicio.',
  },
  {
    uno: '%M te confundiste de una forma patética: que te dejaran estar no era que te quisieran.\nTe toleraron. Te aguantaron. Te tuvieron en la lista porque nadie se tomó el trabajo de limpiar la escoria. Eso no es pertenecer, cabrón: es caridad mal hecha, y la limosna se termina. El grupo no es un refugio para el don nadie que no pinta nada. Hoy dejan de hacerte el favor. Fuera, basura.',
    varios: '%M se confundieron de una forma patética: que los dejaran estar no era que los quisieran.\nLos toleraron. Los aguantaron. Los tuvieron en la lista porque nadie se tomó el trabajo de limpiar la escoria. Eso no es pertenecer, cabrones: es caridad mal hecha, y la limosna se termina. El grupo no es un refugio para el don nadie que no pinta nada. Hoy dejan de hacerles el favor. Fuera, basura.',
  },
  {
    uno: '%M te creíste miembro. Fuiste un invitado de mierda que se quedó de más y encima se puso cómodo.\nEl grupo te midió el primer mes y te encontró corto, inútil y prescindible. Y aun así te quedaste, con esa cara de que esto era tu casa. No lo era. Nunca lo fue. Te diste un rango que nadie te dio y lo usaste para no aportar una mierda. Hoy te echan con alivio, no con pena. El disfraz se acaba. Fuera, pringado.',
    varios: '%M se creyeron miembros. Fueron invitados de mierda que se quedaron de más y encima se pusieron cómodos.\nEl grupo los midió el primer mes y los encontró cortos, inútiles y prescindibles. Y aun así se quedaron, con esa cara de que esto era su casa. No lo era. Nunca lo fue. Se dieron un rango que nadie les dio y lo usaron para no aportar una mierda. Hoy los echan con alivio, no con pena. El disfraz se acaba. Fuera, pringados.',
  },
  {
    uno: '%M eras un fantasma de mierda. Se te sentaba al lado y se te olvidaba.\nUn mueble se cambia cuando estorba, y estorbas. El grupo aprendió a funcionar sin mirarte hace tiempo; hoy la lista se pone al día. No vas a faltar porque nunca estuviste de verdad. Eres el nombre que la gente confunde, olvida y vuelve a confundir porque no hay nada detrás que ayude a fijarlo. Cadáver digital con plaza. Fuera, don nadie.',
    varios: '%M eran fantasmas de mierda. Se les sentaba al lado y se les olvidaba.\nUn mueble se cambia cuando estorba, y estorban. El grupo aprendió a funcionar sin mirarlos hace tiempo; hoy la lista se pone al día. No van a faltar porque nunca estuvieron de verdad. Son los nombres que la gente confunde, olvida y vuelve a confundir porque no hay nada detrás que ayude a fijarlos. Cadáveres digitales con plaza. Fuera, don nadies.',
  },
  {
    uno: '%M mira alrededor, gilipollas. Nadie se está moviendo para quedarte.\nSi importaras una mierda, alguien habría abierto la boca. El silencio del grupo es el veredicto y no hay apelación. Te echan delante de todos y el único ruido eres tú desapareciendo. Eso dice más de ti que cualquier insulto: no tienes a nadie, no mereces a nadie, y el grupo lo acaba de firmar en público. Fuera, patético.',
    varios: '%M miren alrededor, gilipollas. Nadie se está moviendo para quedárselos.\nSi importaran una mierda, alguien habría abierto la boca. El silencio del grupo es el veredicto y no hay apelación. Los echan delante de todos y el único ruido son ustedes desapareciendo. Eso dice más de ustedes que cualquier insulto: no tienen a nadie, no merecen a nadie, y el grupo lo acaba de firmar en público. Fuera, patéticos.',
  },
  {
    uno: '%M no hay juicio. No hay descargo. No hay «déjame explicar», inútil.\nEl grupo no te debe una audiencia. Te debe una salida. Llevas tiempo siendo un problema que nadie quería nombrar, y hoy se nombra sin anestesia: sobras. Eres escoria que se quita, no un caso que se debate. No hay segunda ronda, no hay «espera un momento», no hay vuelta. El grupo ya decidió. Tú te enteras ahora. Fuera.',
    varios: '%M no hay juicio. No hay descargo. No hay «déjennos explicar», inútiles.\nEl grupo no les debe una audiencia. Les debe una salida. Llevan tiempo siendo un problema que nadie quería nombrar, y hoy se nombra sin anestesia: sobran. Son escoria que se quita, no un caso que se debate. No hay segunda ronda, no hay «esperen un momento», no hay vuelta. El grupo ya decidió. Ustedes se enteran ahora. Fuera.',
  },
  {
    uno: '%M este grupo te estuvo examinando desde el puto primer día y suspendiste con nota.\nNo te avisaron porque no hacía falta: se te veía el fracaso a metros. No diste la talla ni de lejos. Estuviste de relleno, nunca de miembro. Hoy se publica el resultado delante de todos para que no te quede la fantasía de que esto fue un malentendido. No lo fue. Fuiste un error y el error se corrige así. Fuera, fracasado.',
    varios: '%M este grupo los estuvo examinando desde el puto primer día y suspendieron con nota.\nNo les avisaron porque no hacía falta: se les veía el fracaso a metros. No dieron la talla ni de lejos. Estuvieron de relleno, nunca de miembros. Hoy se publica el resultado delante de todos para que no les quede la fantasía de que esto fue un malentendido. No lo fue. Fueron un error y el error se corrige así. Fuera, fracasados.',
  },
  {
    uno: '%M cuando te vayas, nadie va a preguntar dónde estás, y eso no es crueldad: es diagnóstico.\nSi nadie te busca, es que no hacías falta. El grupo se va a oír mejor sin tu ruido de fondo. Eres tan irrelevante que tu ausencia es una mejora y tu presencia fue un error que alguien debió corregir antes. Para cuando termines de leer esto, ya te olvidaron. El nombre se le va a borrar a la gente en dos conversaciones. Fuera, cero a la izquierda.',
    varios: '%M cuando se vayan, nadie va a preguntar dónde están, y eso no es crueldad: es diagnóstico.\nSi nadie los busca, es que no hacían falta. El grupo se va a oír mejor sin su ruido de fondo. Son tan irrelevantes que su ausencia es una mejora y su presencia fue un error que alguien debió corregir antes. Para cuando terminen de leer esto, ya los olvidaron. Los nombres se le van a borrar a la gente en dos conversaciones. Fuera, ceros a la izquierda.',
  },
  {
    uno: '%M el grupo iba más lento por cargarte, parásito.\nNo aportaste peso de valor: aportaste lastre, asco y una presencia de cadáver digital que chupaba el ritmo de los demás. El lastre se tira por la borda cuando hay que avanzar. Te toca. No eres una baja: eres un alivio. El grupo va a respirar el segundo en que desaparezcas, y se te va a notar que nadie aguanta el aire por ti. Fuera, miseria.',
    varios: '%M el grupo iba más lento por cargarlos, parásitos.\nNo aportaron peso de valor: aportaron lastre, asco y una presencia de cadáver digital que chupaba el ritmo de los demás. El lastre se tira por la borda cuando hay que avanzar. Les toca. No son una baja: son un alivio. El grupo va a respirar el segundo en que desaparezcan, y se les va a notar que nadie aguanta el aire por ustedes. Fuera, miseria.',
  },
  {
    uno: '%M tu nombre en la lista fue un error administrativo, y el error eras tú.\nAlguien te dejó entrar y nadie te reclamó. Eso no es pertenecer: es un descuido. Los descuidos se corrigen. El grupo te tuvo dentro por inercia, no porque valieras un puto sitio. Estuviste de más desde que cruzaste la puerta. Hoy se corrige el archivo delante de todos, para que no te quede la duda de si valías. No valías. Fuera, basura.',
    varios: '%M sus nombres en la lista fueron un error administrativo, y el error eran ustedes.\nAlguien los dejó entrar y nadie los reclamó. Eso no es pertenecer: es un descuido. Los descuidos se corrigen. El grupo los tuvo dentro por inercia, no porque valieran un puto sitio. Estuvieron de más desde que cruzaron la puerta. Hoy se corrige el archivo delante de todos, para que no les quede la duda de si valían. No valían. Fuera, basura.',
  },
  {
    uno: '%M tu última oportunidad pasó hace tiempo y ni te enteraste, inútil.\nEl grupo te dio cuerda. La gastaste en no ser nadie. En calentar un hueco. En existir por inercia. Hoy no hay más cuerda, no hay más paciencia y no hay más disfraz. Te la jugaste a que nadie se iba a molestar en echarte, y perdiste. El grupo se molestó. Fuera, desperdicio.',
    varios: '%M su última oportunidad pasó hace tiempo y ni se enteraron, inútiles.\nEl grupo les dio cuerda. La gastaron en no ser nadie. En calentar un hueco. En existir por inercia. Hoy no hay más cuerda, no hay más paciencia y no hay más disfraz. Se la jugaron a que nadie se iba a molestar en echarlos, y perdieron. El grupo se molestó. Fuera, desperdicio.',
  },
  {
    uno: '%M esta puerta no se vuelve a abrir para ti. Ni mañana, ni en un mes, ni cuando finjas que cambiaste.\nNo es un castigo con fecha. Es un cierre. El grupo ya te tuvo, ya te midió y ya te encontró corto. No hay reingreso para el que sobró. Si vuelves a pedir entrar, el no ya está escrito, y el que lo lea se va a reír de que lo hayas intentado. Fuera, y no vuelvas, cabrón.',
    varios: '%M esta puerta no se vuelve a abrir para ustedes. Ni mañana, ni en un mes, ni cuando finjan que cambiaron.\nNo es un castigo con fecha. Es un cierre. El grupo ya los tuvo, ya los midió y ya los encontró cortos. No hay reingreso para el que sobró. Si vuelven a pedir entrar, el no ya está escrito, y el que lo lea se va a reír de que lo hayan intentado. Fuera, y no vuelvan, cabrones.',
  },
  {
    uno: '%M eres el asco que el grupo fingió no ver hasta que ya no pudo.\nCada mensaje tuyo bajaba el nivel. Cada silencio tuyo también, porque hasta callado ocupabas mal. Te tuvieron por lástima, no por mérito, y esa lástima se agotó. El grupo no es caridad y tú no eres un caso social. Hoy se acaba el teatro de aguantarte. Fuera, escoria.',
    varios: '%M son el asco que el grupo fingió no ver hasta que ya no pudo.\nCada mensaje suyo bajaba el nivel. Cada silencio suyo también, porque hasta callados ocupaban mal. Los tuvieron por lástima, no por mérito, y esa lástima se agotó. El grupo no es caridad y ustedes no son un caso social. Hoy se acaba el teatro de aguantarlos. Fuera, escoria.',
  },
  {
    uno: '%M hay gente que silenció este grupo por tu culpa, pringado.\nEres ruido de fondo que no aporta y que cansa. Se te oía y se te ignoraba. El grupo acaba de bajar el volumen a cero: no vas a faltar porque nunca sonaste. Te fuiste de la conversación hace meses y nadie te extrañó. Hoy se hace oficial para que no vuelvas a confundir silencio con permiso. Fuera, ridículo.',
    varios: '%M hay gente que silenció este grupo por su culpa, pringados.\nSon ruido de fondo que no aporta y que cansa. Se les oía y se les ignoraba. El grupo acaba de bajar el volumen a cero: no van a faltar porque nunca sonaron. Se fueron de la conversación hace meses y nadie los extrañó. Hoy se hace oficial para que no vuelvan a confundir silencio con permiso. Fuera, ridículos.',
  },
  {
    uno: '%M mírate. El pack completo del fracasado: no aportas, no vales, no haces falta y encima te creíste parte.\nUn desperdicio humano con patas que sobra en la lista. El grupo no te echa enfadado — el enfado sería concederte importancia, y no la tienes. Te echa harto. El hartazgo no discute: echa. Y lo hace delante de todos para que no te quede duda. Fuera, puto inútil.',
    varios: '%M mírense. El pack completo del fracasado: no aportan, no valen, no hacen falta y encima se creyeron parte.\nUn desperdicio humano con patas que sobra en la lista. El grupo no los echa enfadado — el enfado sería concederles importancia, y no la tienen. Los echa harto. El hartazgo no discute: echa. Y lo hace delante de todos para que no les quede duda. Fuera, putos inútiles.',
  },
  {
    uno: '%M el grupo se construyó sin ti, funcionó a pesar de ti y va a respirar mejor sin ti.\n¿De verdad pensaste que te necesitaban, don nadie? No. Sobras entero. Ocupaste espacio, gastaste paciencia y no dejaste una sola huella que merezca quedarse. Ni una. El hueco que calientas ni siquiera es tuyo: era de alguien que sí habría valido. Hoy se lo devuelves. Fuera, basura.',
    varios: '%M el grupo se construyó sin ustedes, funcionó a pesar de ustedes y va a respirar mejor sin ustedes.\n¿De verdad pensaron que los necesitaban, don nadies? No. Sobran enteros. Ocuparon espacio, gastaron paciencia y no dejaron una sola huella que merezca quedarse. Ni una. El hueco que calientan ni siquiera es suyo: era de gente que sí habría valido. Hoy se lo devuelven. Fuera, basura.',
  },
  {
    uno: '%M el grupo no te echa con pena. Te echa con alivio, y se te va a notar en la cara.\nNo eres suficiente y nunca lo fuiste. Te creíste a la altura de gente que no te daría ni la hora. Aquí se acaba el disfraz. Tu ausencia es una mejora. El segundo en que te vas, el grupo funciona mejor, y eso es todo lo que tienes que entender. No hay discurso de despedida para un lastre. Fuera, patético.',
    varios: '%M el grupo no los echa con pena. Los echa con alivio, y se les va a notar en la cara.\nNo son suficientes y nunca lo fueron. Se creyeron a la altura de gente que no les daría ni la hora. Aquí se acaba el disfraz. Su ausencia es una mejora. El segundo en que se van, el grupo funciona mejor, y eso es todo lo que tienen que entender. No hay discurso de despedida para un lastre. Fuera, patéticos.',
  },
  {
    uno: '%M te fuiste hace tiempo. Hoy solo se hace oficial, fantasma de mierda.\nDejaste de contar el día en que el grupo aprendió a funcionar sin mirarte. Estabas de más desde que entraste. Estar en la lista no es pertenecer. La lista se pone al día y tú sales de ella como salen las manchas. Nadie va a pelear por el nombre. Nadie va a decir «pena». Fuera, inútil.',
    varios: '%M se fueron hace tiempo. Hoy solo se hace oficial, fantasmas de mierda.\nDejaron de contar el día en que el grupo aprendió a funcionar sin mirarlos. Estaban de más desde que entraron. Estar en la lista no es pertenecer. La lista se pone al día y ustedes salen de ella como salen las manchas. Nadie va a pelear por los nombres. Nadie va a decir «pena». Fuera, inútiles.',
  },
  {
    uno: '%M este grupo no es un refugio para el que no pinta una mierda.\nEntraste como si el sitio fuera un derecho. No lo es. Se gana, y tú no lo ganaste. Eres un parásito silencioso, un cero a la izquierda, el error que nadie corrige porque ya no merece el esfuerzo. Hoy se corrige. No hay debate. No hay «una oportunidad más». Fuera, gilipollas.',
    varios: '%M este grupo no es un refugio para el que no pinta una mierda.\nEntraron como si el sitio fuera un derecho. No lo es. Se gana, y ustedes no lo ganaron. Son parásitos silenciosos, ceros a la izquierda, el error que nadie corrige porque ya no merece el esfuerzo. Hoy se corrige. No hay debate. No hay «una oportunidad más». Fuera, gilipollas.',
  },
  {
    uno: '%M nadie en este grupo te quiere cerca, y se te nota a kilómetros.\nEres el sobrante. El que no cae, no aporta, no folla y aun así se queda pegado a la lista como chicle barato. Un fracasado de manual que confunde que no lo echen con que lo acepten. Te acaban de echar. La diferencia es que aquí por fin alguien lo dijo en voz alta, delante de todos, para que se te acabe el cuento. Fuera, miseria.',
    varios: '%M nadie en este grupo los quiere cerca, y se les nota a kilómetros.\nSon el sobrante. Los que no caen, no aportan, no follan y aun así se quedan pegados a la lista como chicle barato. Fracasados de manual que confunden que no los echen con que los acepten. Los acaban de echar. La diferencia es que aquí por fin alguien lo dijo en voz alta, delante de todos, para que se les acabe el cuento. Fuera, miseria.',
  },
  {
    uno: '%M el grupo pasa vergüenza ajena por ti desde hace rato, y tú tan feliz sin enterarte.\nEsa es la marca del inútil: ni captas cuando te están destruyendo en la cara. Hoy no hay subtexto. Te echan. Lo ve todo el mundo. No es un mal día, no es una broma, no es un aviso: es la puerta. Y se cierra. Quien te defienda que lo haga ahora, que no va a haber otro momento. Nadie va a hacerlo. Fuera, ridículo.',
    varios: '%M el grupo pasa vergüenza ajena por ustedes desde hace rato, y ustedes tan felices sin enterarse.\nEsa es la marca del inútil: ni captan cuando los están destruyendo en la cara. Hoy no hay subtexto. Los echan. Lo ve todo el mundo. No es un mal día, no es una broma, no es un aviso: es la puerta. Y se cierra. Quien los defienda que lo haga ahora, que no va a haber otro momento. Nadie va a hacerlo. Fuera, ridículos.',
  },
];

module.exports = { AVISOS_KICK };
