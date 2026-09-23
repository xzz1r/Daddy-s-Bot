// Avisos de !kick. Salen en el grupo ANTES de echar, para que lo vean.
//
// No es un comunicado. Es una hostia en público. Tacos dentro de la frase,
// no pegados al final. Cada una ataca un ángulo distinto. pickFresh las
// reparte por grupo: no se repite una hasta que han salido otras 50 (o el
// 60 % del pool, lo que sea menor).
//
// %M se sustituye por las menciones. Cada entrada trae singular (tú) y plural
// (ustedes). Español neutral: sin vosotros.

const AVISOS_KICK = [
  {
    uno: '%M te echan, puta. Llevas meses chupando el grupo sin soltar una frase que no dé vergüenza.\nLeías, callabas y ocupabas. Hoy te limpian delante de todos y nadie va a decir «espera». Lárgate, parásito de mierda.',
    varios: '%M los echan, putas. Llevan meses chupando el grupo sin soltar una frase que no dé vergüenza.\nLeían, callaban y ocupaban. Hoy los limpian delante de todos y nadie va a decir «esperen». Lárguense, parásitos de mierda.',
  },
  {
    uno: '%M ocupaste el puto sitio de alguien que sí habría valido, retrasado.\nEl grupo te aguantó por pereza de borrarte, no porque aportaras una mierda. Cada día tuyo fue un día robado. Se acabó. A la calle, fracasado.',
    varios: '%M ocuparon el puto sitio de gente que sí habría valido, retrasados.\nEl grupo los aguantó por pereza de borrarlos, no porque aportaran una mierda. Cada día suyo fue un día robado. Se acabó. A la calle, fracasados.',
  },
  {
    uno: '%M te creíste querido y eras tolerado, maricón. Hay diferencia, y duele.\nTe tuvieron en la lista porque nadie se tomó el trabajo de limpiar. Hoy se lo toman. Fuera, basura. Y no vuelvas con esa cara de incomprendido.',
    varios: '%M se creyeron queridos y eran tolerados, maricones. Hay diferencia, y duele.\nLos tuvieron en la lista porque nadie se tomó el trabajo de limpiar. Hoy se lo toman. Fuera, basura. Y no vuelvan con esa cara de incomprendidos.',
  },
  {
    uno: '%M te diste de miembro tú solo, hijo de puta. Nadie te lo dio.\nEl primer mes ya se vio que no pintabas. Te quedaste igual, cómodo, inútil. Hoy te echan con alivio, no con pena. El disfraz se acaba. Lárgate.',
    varios: '%M se dieron de miembros ellos solos, hijos de puta. Nadie se lo dio.\nEl primer mes ya se vio que no pintaban. Se quedaron igual, cómodos, inútiles. Hoy los echan con alivio, no con pena. El disfraz se acaba. Lárguense.',
  },
  {
    uno: '%M eras un fantasma de mierda. Se te sentaba al lado y se te olvidaba, coño.\nEl grupo aprendió a funcionar sin mirarte. No vas a faltar porque nunca estuviste. Cadáver con número de teléfono. Fuera, don nadie.',
    varios: '%M eran fantasmas de mierda. Se les sentaba al lado y se les olvidaba, coño.\nEl grupo aprendió a funcionar sin mirarlos. No van a faltar porque nunca estuvieron. Cadáveres con número de teléfono. Fuera, don nadies.',
  },
  {
    uno: '%M mira alrededor, gilipoyas. Nadie se está moviendo para quedarte.\nSi importaras una mierda, alguien habría abierto la boca. Te echan delante de todos y el único ruido eres tú desapareciendo. No tienes a nadie. Fuera, patético.',
    varios: '%M miren alrededor, gilipoyas. Nadie se está moviendo para quedárselos.\nSi importaran una mierda, alguien habría abierto la boca. Los echan delante de todos y el único ruido son ustedes desapareciendo. No tienen a nadie. Fuera, patéticos.',
  },
  {
    uno: '%M no hay «déjame explicar», inútil. El grupo no te debe una audiencia. Te debe una salida.\nLlevas tiempo siendo un problema que nadie quería nombrar. Hoy se nombra: sobras, puta. No hay segunda ronda. Vete.',
    varios: '%M no hay «déjennos explicar», inútiles. El grupo no les debe una audiencia. Les debe una salida.\nLlevan tiempo siendo un problema que nadie quería nombrar. Hoy se nombra: sobran, putos. No hay segunda ronda. Los echan. Váyanse.',
  },
  {
    uno: '%M este grupo te midió el primer puto día y suspendiste, retrasado.\nNo te avisaron porque se te veía. Estuviste de relleno, nunca de miembro. Hoy se publica el resultado delante de todos. No fue un malentendido. Fuiste un error. Fuera.',
    varios: '%M este grupo los midió el primer puto día y suspendieron, retrasados.\nNo les avisaron porque se les veía. Estuvieron de relleno, nunca de miembros. Hoy se publica el resultado delante de todos. No fue un malentendido. Fueron un error. Fuera.',
  },
  {
    uno: '%M cuando te vayas nadie va a preguntar dónde estás, guarra. Y no es crueldad: es que no hacías falta.\nPara cuando termines de leer esto, ya te olvidaron. El nombre se le borra a la gente en dos conversaciones. Fuera, cero a la izquierda.',
    varios: '%M cuando se vayan nadie va a preguntar dónde están, guarras. Y no es crueldad: es que no hacían falta.\nPara cuando terminen de leer esto, ya los olvidaron. Los nombres se le borran a la gente en dos conversaciones. Fuera, ceros a la izquierda.',
  },
  {
    uno: '%M el grupo iba más lento por cargarte, parásito de mierda.\nNo aportaste valor: aportaste asco, retrasado. El lastre se tira. No eres una baja: eres un alivio. El segundo en que desaparezcas, se respira. Fuera, miseria.',
    varios: '%M el grupo iba más lento por cargarlos, parásitos de mierda.\nNo aportaron valor: aportaron asco, retrasados. El lastre se tira. No son una baja: son un alivio. El segundo en que desaparezcan, se respira. Fuera, miseria.'
  },
  {
    uno: '%M tu nombre en la lista fue un error, y el error eras tú, cabrón.\nAlguien te dejó entrar y nadie te reclamó. Eso no es pertenecer: es un descuido. Estuviste de más desde la puerta. Hoy se corrige delante de todos. No valías. Fuera, basura.',
    varios: '%M sus nombres en la lista fueron un error, y el error eran ustedes, cabrones.\nAlguien los dejó entrar y nadie los reclamó. Eso no es pertenecer: es un descuido. Estuvieron de más desde la puerta. Hoy se corrige delante de todos. No valían. Fuera, basura.',
  },
  {
    uno: '%M tu última oportunidad pasó hace tiempo y ni te enteraste, hijo de puta.\nEl grupo te dio cuerda. La gastaste en no ser nadie. Te la jugaste a que nadie se iba a molestar en echarte. Perdiste. El grupo se molestó. Lárgate.',
    varios: '%M su última oportunidad pasó hace tiempo y ni se enteraron, hijos de puta.\nEl grupo les dio cuerda. La gastaron en no ser nadie. Se la jugaron a que nadie se iba a molestar en echarlos. Perdieron. El grupo se molestó. Lárguense.'
  },
  {
    uno: '%M esta puerta no se vuelve a abrir para ti. Ni mañana, ni cuando finjas que cambiaste, hijo de puta.\nEl grupo ya te tuvo, ya te midió y ya te encontró corto. Si vuelves a pedir entrar, el que lo lea se va a reír. Fuera, y no vuelvas, cabrón.',
    varios: '%M esta puerta no se vuelve a abrir para ustedes. Ni mañana, ni cuando finjan que cambiaron, hijos de puta.\nEl grupo ya los tuvo, ya los midió y ya los encontró cortos. Si vuelven a pedir entrar, el que lo lea se va a reír. Fuera, y no vuelvan, cabrones.',
  },
  {
    uno: '%M eres el asco que el grupo fingió no ver hasta que ya no pudo, puta.\nCada mensaje tuyo bajaba el nivel. Cada silencio también, porque hasta callado ocupabas mal. Te tuvieron por lástima. La lástima se agotó. Fuera, escoria.',
    varios: '%M son el asco que el grupo fingió no ver hasta que ya no pudo, putas.\nCada mensaje suyo bajaba el nivel. Cada silencio también, porque hasta callados ocupaban mal. Los tuvieron por lástima. La lástima se agotó. Fuera, escoria.',
  },
  {
    uno: '%M hay gente que silenció este grupo por tu culpa, pringado de mierda.\nEres ruido que no aporta y que cansa, joder. Se te oía y se te ignoraba. Te fuiste de la conversación hace meses y nadie te extrañó. Hoy se hace oficial. Fuera, ridículo.',
    varios: '%M hay gente que silenció este grupo por su culpa, pringados de mierda.\nSon ruido que no aporta y que cansa, joder. Se les oía y se les ignoraba. Se fueron de la conversación hace meses y nadie los extrañó. Hoy se hace oficial. Fuera, ridículos.'
  },
  {
    uno: '%M mírate. No aportas, no vales, no haces falta y encima te creíste parte, retrasado.\nUn desperdicio con patas. El grupo no te echa enfadado: el enfado sería darte importancia, y no la tienes. Te echa harto. Fuera, puto inútil.',
    varios: '%M mírense. No aportan, no valen, no hacen falta y encima se creyeron parte, retrasados.\nUn desperdicio con patas. El grupo no los echa enfadado: el enfado sería darles importancia, y no la tienen. Los echa harto. Fuera, putos inútiles.',
  },
  {
    uno: '%M el grupo se construyó sin ti, funcionó a pesar de ti y va a respirar mejor sin ti, don nadie.\n¿De verdad pensaste que te necesitaban? Joder. Sobras entero. No dejaste una huella que merezca quedarse. Ni una. Fuera, basura.',
    varios: '%M el grupo se construyó sin ustedes, funcionó a pesar de ustedes y va a respirar mejor sin ustedes, don nadies.\n¿De verdad pensaron que los necesitaban? Joder. Sobran enteros. No dejaron una huella que merezca quedarse. Ni una. Fuera, basura.',
  },
  {
    uno: '%M no te echan con pena. Te echan con alivio, maricón, y se te va a notar en la cara.\nTe creíste a la altura de gente que no te daría ni la hora. Tu ausencia es una mejora. No hay discurso de despedida para un lastre. Lárgate.',
    varios: '%M no los echan con pena. Los echan con alivio, maricones, y se les va a notar en la cara.\nSe creyeron a la altura de gente que no les daría ni la hora. Su ausencia es una mejora. No hay discurso de despedida para un lastre. Lárguense.',
  },
  {
    uno: '%M te fuiste hace tiempo. Hoy solo se hace oficial, fantasma de mierda.\nDejaste de contar el día en que el grupo aprendió a ignorarte, maricón. Estar en la lista no es pertenecer. Nadie va a pelear por tu nombre. Nadie va a decir «pena». Fuera.',
    varios: '%M se fueron hace tiempo. Hoy solo se hace oficial, fantasmas de mierda.\nDejaron de contar el día en que el grupo aprendió a ignorarlos, maricones. Estar en la lista no es pertenecer. Nadie va a pelear por sus nombres. Nadie va a decir «pena». Fuera.'
  },
  {
    uno: '%M este grupo no es un refugio para el que no pinta una mierda, guarra.\nEntraste como si el sitio fuera un derecho. Se gana, y tú no lo ganaste. Hoy se corrige. No hay «una oportunidad más». Fuera, gilipoyas.',
    varios: '%M este grupo no es un refugio para el que no pinta una mierda, guarras.\nEntraron como si el sitio fuera un derecho. Se gana, y ustedes no lo ganaron. Hoy se corrige. No hay «una oportunidad más». Fuera, gilipoyas.',
  },
  {
    uno: '%M nadie en este grupo te quiere cerca, y se te nota a kilómetros, puta.\nNo caes, no aportas, no follas y aun así te quedaste pegado. Confundiste que no te echaran con que te aceptaran. Te acaban de echar. Se te acabó el cuento. Fuera, miseria.',
    varios: '%M nadie en este grupo los quiere cerca, y se les nota a kilómetros, putas.\nNo caen, no aportan, no follan y aun así se quedaron pegados. Confundieron que no los echaran con que los aceptaran. Los acaban de echar. Se les acabó el cuento. Fuera, miseria.',
  },
  {
    uno: '%M el grupo pasa vergüenza ajena por ti desde hace rato, y tú tan feliz, retrasado.\nNi captas cuando te están destrozando en la cara. Hoy no hay subtexto. Te echan. Lo ve todo el mundo. Quien te defienda que lo haga ahora. Nadie va a hacerlo. Fuera, ridículo.',
    varios: '%M el grupo pasa vergüenza ajena por ustedes desde hace rato, y ustedes tan felices, retrasados.\nNi captan cuando los están destrozando en la cara. Hoy no hay subtexto. Los echan. Lo ve todo el mundo. Quien los defienda que lo haga ahora. Nadie va a hacerlo. Fuera, ridículos.',
  },
  {
    uno: '%M nunca le hablaste a nadie por su nombre. Nunca, hijo de puta.\nNo saludaste, no contestaste, no te mojaste. Ocupabas sitio sin dirigir la palabra a un ser humano. Hoy te echan y no hay un mensaje tuyo que merezca defensa. Fuera, don nadie.',
    varios: '%M nunca le hablaron a nadie por su nombre. Nunca, hijos de puta.\nNo saludaron, no contestaron, no se mojaron. Ocupaban sitio sin dirigir la palabra a un ser humano. Hoy los echan y no hay un mensaje suyo que merezca defensa. Fuera, don nadies.',
  },
  {
    uno: '%M solo aparecías cuando había sangre. Drama, pelea, alguien hundiéndose: ahí sí, a chupar, puta.\nEl resto del tiempo, un cadáver. El grupo no es tu reality. Hoy se te corta el suministro. Lárgate.',
    varios: '%M solo aparecían cuando había sangre. Drama, pelea, alguien hundiéndose: ahí sí, a chupar, putas.\nEl resto del tiempo, cadáveres. El grupo no es su reality. Hoy se les corta el suministro y los echan. Lárguense.'
  },
  {
    uno: '%M esta es la primera vez que el grupo te mira de verdad, y ya está harto, retrasado.\nHasta hoy eras un número. Hoy eres un problema que se resuelve. Te echan y el grupo sigue en la frase siguiente, como si no hubieras existido. Que es el caso. Fuera.',
    varios: '%M esta es la primera vez que el grupo los mira de verdad, y ya está harto, retrasados.\nHasta hoy eran un número. Hoy son un problema que se resuelve. Los echan y el grupo sigue en la frase siguiente, como si no hubieran existido. Que es el caso. Fuera.'
  },
  {
    uno: '%M esto no era tu casa, cabrón. Era una parada. Te quedaste de más y confundiste turismo con pertenencia.\nEl viaje se acabó. No hay «gracias por venir». Hay una puerta y un empujón. Fuera, y no vuelvas a pedir plaza.',
    varios: '%M esto no era su casa, cabrones. Era una parada. Se quedaron de más y confundieron turismo con pertenencia.\nEl viaje se acabó. No hay «gracias por venir». Hay una puerta y un empujón. Fuera, y no vuelvan a pedir plaza.'
  },
  {
    uno: '%M te pasaste el grupo entero guardando lo que otros decían y sin soltar una puta frase que valiera.\nChupaste chistes y devolviste silencio. No eras miembro: eras un ladrón de conversaciones. Hoy se te acaba el archivo. Fuera, parásito.',
    varios: '%M se pasaron el grupo entero guardando lo que otros decían y sin soltar una puta frase que valiera.\nChuparon chistes y devolvieron silencio. No eran miembros: eran ladrones de conversaciones. Hoy se les acaba el archivo. Fuera, parásitos.',
  },
  {
    uno: '%M tu personalidad era estar en este grupo. Nada más. Ni cara, ni criterio, ni una puta opinión.\nCuando te echan no se pierde a nadie: se pierde una línea. Detrás no había una persona. Fuera, vacío con teléfono.',
    varios: '%M su personalidad era estar en este grupo. Nada más. Ni cara, ni criterio, ni una puta opinión.\nCuando los echan no se pierde a nadie: se pierde una línea. Detrás no había una persona. Fuera, vacíos con teléfono.',
  },
  {
    uno: '%M llegabas tarde a cada conversación y la matabas con un comentario que nadie pidió, cabrón.\nEntras cuando ya se rieron y preguntas qué pasó. Hoy el grupo se quita el retraso. Nunca estuviste a tiempo. Fuera, lastre.',
    varios: '%M llegaban tarde a cada conversación y la mataban con un comentario que nadie pidió, cabrones.\nSon los que entran cuando ya se rieron y preguntan qué pasó. Hoy el grupo se quita el retraso. Nunca estuvieron a tiempo. Fuera, lastre.',
  },
  {
    uno: '%M tus mensajes se saltaban. Se veían y se bajaba el pulgar, coño. Nadie te respondía porque no había nada que responder.\nNo eras conversación: eras interrupción. El grupo te echa para dejar de pasar por encima de ti. Fuera, ridículo.',
    varios: '%M sus mensajes se saltaban. Se veían y se bajaba el pulgar, coño. Nadie les respondía porque no había nada que responder.\nNo eran conversación: eran interrupción. El grupo los echa para dejar de pasar por encima de ustedes. Fuera, ridículos.',
  },
  {
    uno: '%M pertenecer cuesta, muerto de hambre. Cuesta escribir, mojarse, quedar mal, volver. Tú no pagaste nada y ocupaste igual, joder.\nQuerías el grupo sin el trabajo de ser alguien aquí. Hoy se te cobra de golpe: la plaza y la cara. No hay crédito. Fuera.',
    varios: '%M pertenecer cuesta, muertos de hambre. Cuesta escribir, mojarse, quedar mal, volver. Ustedes no pagaron nada y ocuparon igual, joder.\nQuerían el grupo sin el trabajo de ser alguien aquí. Hoy se les cobra de golpe: la plaza y la cara. No hay crédito. Fuera.'
  },
  {
    uno: '%M usaste este grupo como sala de espera, puta. Entraste, te sentaste y no pasó nada porque tú no hacías nada.\nLa espera se acabó y no te llamaron. El que espera sin aportar no es paciente: es un estorbo. Te echan. Fuera.',
    varios: '%M usaron este grupo como sala de espera, putas. Entraron, se sentaron y no pasó nada porque ustedes no hacían nada.\nLa espera se acabó y no los llamaron. El que espera sin aportar no es paciente: es un estorbo. Los echan. Fuera.'
  },
  {
    uno: '%M te creíste protagonista de un chat donde nadie te habría puesto ni de extra, maricón.\nHablabas poco y pensabas mucho en ti. El grupo funcionaba mejor cuando no aparecías. Hoy se corta el papel. Fuera.',
    varios: '%M se creyeron protagonistas de un chat donde nadie los habría puesto ni de extras, maricones.\nHablaban poco y pensaban mucho en ustedes. El grupo funcionaba mejor cuando no aparecían. Hoy se corta el papel. Fuera.'
  },
  {
    uno: '%M esta expulsión llega tarde, gilipoyas, y se nota.\nHace semanas que el grupo te tenía sentenciado. Solo faltaba que alguien pulsara. Hoy pulsan. El resto ya lo había decidido. Tú te enteras ahora. Lárgate.',
    varios: '%M esta expulsión llega tarde, gilipoyas, y se nota.\nHace semanas que el grupo los tenía sentenciados. Solo faltaba que alguien pulsara. Hoy pulsan. El resto ya lo había decidido. Ustedes se enteran ahora. Los echan. Lárguense.'
  },
  {
    uno: '%M lo más memorable que has hecho aquí es que te echen, retrasado.\nHasta hoy no había un momento tuyo que alguien pudiera contar. Ahora sí: el final. Un fracaso tan limpio que no deja ni anécdota. Fuera.',
    varios: '%M lo más memorable que han hecho aquí es que los echen, retrasados.\nHasta hoy no había un momento suyo que alguien pudiera contar. Ahora sí: el final. Un fracaso tan limpio que no deja ni anécdota. Los echan. Fuera.'
  },
  {
    uno: '%M usaste el grupo para soltar tu mierda y desaparecer, guarra.\nQuejas, dramas, silencios de tres días. Nunca una conversación de verdad. Hoy te echan y se acaba el vertido. El grupo no era tu urgencia. Fuera.',
    varios: '%M usaron el grupo para soltar su mierda y desaparecer, guarras.\nQuejas, dramas, silencios de tres días. Nunca una conversación de verdad. Hoy los echan y se acaba el vertido. El grupo no era su urgencia. Fuera.'
  },
  {
    uno: '%M nadie te puso un apodo. Nadie, hijo de puta. Para tener apodo hay que existir lo bastante como para que alguien se moleste.\nTú no llegaste. Te echan con el nombre que trajo WhatsApp, que es todo lo que fuiste. Fuera.',
    varios: '%M nadie les puso un apodo. Nadie, hijos de puta. Para tener apodo hay que existir lo bastante como para que alguien se moleste.\nUstedes no llegaron. Los echan con el nombre que trajo WhatsApp, que es todo lo que fueron. Fuera.'
  },
  {
    uno: '%M hay gente que se fue de este grupo por no aguantarte, y tú tan campante, puta.\nEres el motivo por el que el chat perdió a alguien que sí valía. Hoy se invierte: se queda el grupo y sales tú. Tarde, pero se invierte. Fuera.',
    varios: '%M hay gente que se fue de este grupo por no aguantarlos, y ustedes tan campantes, putas.\nSon el motivo por el que el chat perdió a alguien que sí valía. Hoy se invierte: se queda el grupo y salen ustedes. Tarde, pero se invierte. Fuera.'
  },
  {
    uno: '%M tu único talento aquí fue que no te echaran hasta hoy, retrasado.\nNo aportaste. No caíste bien. No sostuviste nada. Solo duraste. Eso no es mérito: es pereza ajena. La pereza se acabó. Lárgate.',
    varios: '%M su único talento aquí fue que no los echaran hasta hoy, retrasados.\nNo aportaron. No cayeron bien. No sostuvieron nada. Solo duraron. Eso no es mérito: es pereza ajena. La pereza se acabó. Lárguense.'
  },
  {
    uno: '%M para este grupo eras un número, inútil. Ni cara, ni frase, ni un hueco que tapar cuando te vayas, coño.\nWhatsApp te cuenta en la lista. El grupo no. Hoy la lista se pone honesta. Fuera.',
    varios: '%M para este grupo eran un número, inútiles. Ni cara, ni frase, ni un hueco que tapar cuando se vayan, coño.\nWhatsApp los cuenta en la lista. El grupo no. Hoy la lista se pone honesta y los echan. Fuera.'
  },
  {
    uno: '%M tu silencio no era misterio. Era pobreza, cabrón. No tenías qué decir y lo disfrazaste de pose.\nEl grupo ya no te compra el disfraz. Te echan callado, que es exactamente como viviste aquí. No había nada detrás. Fuera.',
    varios: '%M su silencio no era misterio. Era pobreza, cabrones. No tenían qué decir y lo disfrazaron de pose.\nEl grupo ya no les compra el disfraz. Los echan callados, que es exactamente como vivieron aquí. No había nada detrás. Fuera.',
  },
  {
    uno: '%M usaste lo solo que estás como escudo para que nadie te echara. Ya no cuela, maricón.\nEl grupo no es terapia y tú no eres un caso. Eres un lastre con cuento. Hoy se te acaba el cuento y la plaza. Fuera.',
    varios: '%M usaron lo solos que están como escudo para que nadie los echara. Ya no cuela, maricones.\nEl grupo no es terapia y ustedes no son un caso. Son un lastre con cuento. Hoy se les acaba el cuento y la plaza. Fuera.'
  },
  {
    uno: '%M viviste de los chistes de otros. Ni uno fue tuyo. Ni uno, joder.\nTe reías tarde, reenviabas peor y te creíste parte del tono. El tono era de ellos. Tú eras el eco. Hoy se apaga el tuyo. Fuera.',
    varios: '%M vivieron de los chistes de otros. Ni uno fue suyo. Ni uno, joder.\nSe reían tarde, reenviaban peor y se creyeron parte del tono. El tono era de ellos. Ustedes eran el eco. Hoy se apaga el suyo. Fuera.'
  },
  {
    uno: '%M si alguna vez te rieron un mensaje, fue por no dejarte en visto de una forma demasiado cruel, puta.\nHoy ya no hay esa cortesía. Te echan en público. Sin risa. Sin colchón. El grupo se cansa de fingir que existes. Fuera.',
    varios: '%M si alguna vez les rieron un mensaje, fue por no dejarlos en visto de una forma demasiado cruel, putas.\nHoy ya no hay esa cortesía. Los echan en público. Sin risa. Sin colchón. El grupo se cansa de fingir que existen. Fuera.'
  },
  {
    uno: '%M cada vez que escribías, la conversación se moría. Se te veía el nombre y se cambiaba de tema, joder.\nLo que tocas deja de ser gracioso. No es que no te leyeran: es que te leían y se iban. Eso se acaba con la puerta. Fuera.',
    varios: '%M cada vez que escribían, la conversación se moría. Se les veía el nombre y se cambiaba de tema, joder.\nLo que tocan deja de ser gracioso. No es que no los leyeran: es que los leían y se iban. Eso se acaba con la puerta. Los echan. Fuera.',
  },
  {
    uno: '%M aparecías solo para hablar de ti y te ibas cuando tocaba escuchar, cabrón.\nEl grupo no es tu diario. No es tu escenario. No es tu urgencia. Hoy se te cierra la boca y la puerta, en ese orden. Fuera.',
    varios: '%M aparecían solo para hablar de ustedes y se iban cuando tocaba escuchar, cabrones.\nEl grupo no es su diario. No es su escenario. No es su urgencia. Hoy se les cierra la boca y la puerta, en ese orden. Los echan. Fuera.'
  },
  {
    uno: '%M hubo gente en este grupo que se enteró hoy de que estabas dentro. Hoy. Al verte en el kick, coño.\nEso es todo lo que fuiste: una sorpresa triste. No hay despedida para quien no había llegado. Fuera.',
    varios: '%M hubo gente en este grupo que se enteró hoy de que estaban dentro. Hoy. Al verlos en el kick, coño.\nEso es todo lo que fueron: una sorpresa triste. No hay despedida para quien no había llegado. Los echan. Fuera.'
  },
  {
    uno: '%M te creíste que este grupo existía para entretenerte, puta. Lo leías, te aburrías, no dabas nada y aun así te quejabas.\nEl grupo no te debía el espectáculo. Te debía una salida. Hoy la cobra. Fuera.',
    varios: '%M se creyeron que este grupo existía para entretenerlos, putas. Lo leían, se aburrían, no daban nada y aun así se quejaban.\nEl grupo no les debía el espectáculo. Les debía una salida. Hoy la cobra. Fuera.',
  },
  {
    uno: '%M el grupo ya te había reemplazado, gilipoyas. Nadie lo dijo porque nadie te tenía en la cuenta.\nHoy se actualiza la lista para que coincida con la realidad. Llevas fuera de verdad desde hace tiempo. Esto es el empujón. Fuera.',
    varios: '%M el grupo ya los había reemplazado, gilipoyas. Nadie lo dijo porque nadie los tenía en la cuenta.\nHoy se actualiza la lista para que coincida con la realidad y los echan. Llevan fuera de verdad desde hace tiempo. Esto es el empujón. Fuera.'
  },
  {
    uno: '%M llamabas lealtad a quedarte muteado. No es lealtad. Es esconderse, puta.\nEl grupo no premia al que ocupa sin aparecer. No fuiste fiel: fuiste invisible. La invisibilidad no se condecora. Te echan. Fuera.',
    varios: '%M llamaban lealtad a quedarse muteados. No es lealtad. Es esconderse, putas.\nEl grupo no premia al que ocupa sin aparecer. No fueron fieles: fueron invisibles. La invisibilidad no se condecora. Los echan. Fuera.'
  },
  {
    uno: '%M te han querido echar antes. En la cabeza de más de uno, gilipoyas. Hoy alguien lo hace y el resto va a respirar.\nNo es un capricho. El grupo te tenía sentenciado en privado. Hoy lo dice en voz alta. Fuera.',
    varios: '%M los han querido echar antes. En la cabeza de más de uno, gilipoyas. Hoy alguien lo hace y el resto va a respirar.\nNo es un capricho. El grupo los tenía sentenciados en privado. Hoy los echa en voz alta. Fuera.',
  },
  {
    uno: '%M no eras miembro. Eras público, maricón. Y un público que no aplaude, no paga y no se va es un problema.\nTe sentaste a mirar y confundiste la entrada con un derecho. El derecho se acaba. Fuera.',
    varios: '%M no eran miembros. Eran público, maricones. Y un público que no aplaude, no paga y no se va es un problema.\nSe sentaron a mirar y confundieron la entrada con un derecho. El derecho se acaba. Los echan. Fuera.'
  },
];

module.exports = { AVISOS_KICK };
