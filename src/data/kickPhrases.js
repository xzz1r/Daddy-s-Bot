// Avisos de !kick. Salen en el grupo ANTES de echar, para que lo vean.
//
// No es un comunicado. Es una hostia en público. Tacos dentro de la frase,
// no pegados al final. Cada una ataca un ángulo distinto. pickFresh las
// reparte por grupo: no se repite una hasta que han salido otras 50 (o el
// 60 % del pool, lo que sea menor).
//
// %M se sustituye por las menciones. Cada entrada trae singular (tú) y plural
// (vosotros). El plural del bot es vosotros, lo decidió el dueño: nada de ustedes.

const AVISOS_KICK = [
  {
    uno: '%M te echan, puta. Llevas meses chupando el grupo sin soltar una frase que no dé vergüenza.\nLeías, callabas y ocupabas. Hoy te limpian delante de todos y nadie va a decir «espera». Lárgate, parásito de mierda.',
    varios: '%M os echan, putas. Lleváis meses chupando del grupo sin soltar una frase que no dé vergüenza.\nLeíais, callabais y ocupabais. Hoy os limpian delante de todos y nadie va a decir «esperad». Largaos, parásitos de mierda.',
  },
  {
    uno: '%M ocupaste el puto sitio de alguien que sí habría valido, retrasado.\nEl grupo te aguantó por pereza de borrarte, no porque aportaras una mierda. Cada día tuyo fue un día robado. Se acabó. A la calle, fracasado.',
    varios: '%M ocupasteis el puto sitio de gente que sí habría valido, retrasados.\nEl grupo os aguantó por pereza de borraros, no porque aportarais una mierda. Cada día vuestro fue un día robado. Se acabó. A la calle, fracasados.',
  },
  {
    uno: '%M te creíste querido y eras tolerado, maricón. Hay diferencia, y duele.\nTe tuvieron en la lista porque nadie se tomó el trabajo de limpiar. Hoy se lo toman. Fuera, basura. Y no vuelvas con esa cara de incomprendido.',
    varios: '%M os creísteis queridos y erais tolerados, maricones. Hay diferencia, y duele.\nOs tuvieron en la lista porque nadie se tomó el trabajo de limpiar. Hoy se lo toman. Fuera, basura. Y no volváis con esa cara de incomprendidos.',
  },
  {
    uno: '%M te diste de miembro tú solo, hijo de puta. Nadie te lo dio.\nEl primer mes ya se vio que no pintabas. Te quedaste igual, cómodo, inútil. Hoy te echan con alivio, no con pena. El disfraz se acaba. Lárgate.',
    varios: '%M os disteis de miembros vosotros solos, hijos de puta. Nadie os lo dio.\nEl primer mes ya se vio que no pintabais. Os quedasteis igual, cómodos, inútiles. Hoy os echan con alivio, no con pena. El disfraz se acaba. Largaos.',
  },
  {
    uno: '%M eras un fantasma de mierda. Se te sentaba al lado y se te olvidaba, coño.\nEl grupo aprendió a funcionar sin mirarte. No vas a faltar porque nunca estuviste. Cadáver con número de teléfono. Fuera, don nadie.',
    varios: '%M erais fantasmas de mierda. Se os sentaba al lado y se os olvidaba, coño.\nEl grupo aprendió a funcionar sin miraros. No vais a faltar porque nunca estuvisteis. Cadáveres con número de teléfono. Fuera, don nadies.',
  },
  {
    uno: '%M mira alrededor, gilipoyas. Nadie se está moviendo para quedarte.\nSi importaras una mierda, alguien habría abierto la boca. Te echan delante de todos y el único ruido eres tú desapareciendo. No tienes a nadie. Fuera, patético.',
    varios: '%M mirad alrededor, gilipoyas. Nadie se está moviendo para quedaros.\nSi importarais una mierda, alguien habría abierto la boca. Os echan delante de todos y el único ruido sois vosotros desapareciendo. No tenéis a nadie. Fuera, patéticos.',
  },
  {
    uno: '%M no hay «déjame explicar», inútil. El grupo no te debe una audiencia. Te debe una salida.\nLlevas tiempo siendo un problema que nadie quería nombrar. Hoy se nombra: sobras, puta. No hay segunda ronda. Vete.',
    varios: '%M no hay «dejadnos explicar», inútiles. El grupo no os debe una audiencia. Os debe una salida.\nLleváis tiempo siendo un problema que nadie quería nombrar. Hoy se nombra: sobráis, putos. No hay segunda ronda. Os echan. Idos.',
  },
  {
    uno: '%M este grupo te midió el primer puto día y suspendiste, retrasado.\nNo te avisaron porque se te veía. Estuviste de relleno, nunca de miembro. Hoy se publica el resultado delante de todos. No fue un malentendido. Fuiste un error. Fuera.',
    varios: '%M este grupo os midió el primer puto día y suspendisteis, retrasados.\nNo os avisaron porque se os veía. Estuvisteis de relleno, nunca de miembros. Hoy se publica el resultado delante de todos. No fue un malentendido. Fuisteis un error. Fuera.',
  },
  {
    uno: '%M cuando te vayas nadie va a preguntar dónde estás, guarra. Y no es crueldad: es que no hacías falta.\nPara cuando termines de leer esto, ya te olvidaron. El nombre se le borra a la gente en dos conversaciones. Fuera, cero a la izquierda.',
    varios: '%M cuando os vayáis nadie va a preguntar dónde estáis, guarras. Y no es crueldad: es que no hacíais falta.\nPara cuando terminéis de leer esto, ya os olvidaron. Vuestros nombres se borran en dos conversaciones. Fuera, ceros a la izquierda.',
  },
  {
    uno: '%M el grupo iba más lento por cargarte, parásito de mierda.\nNo aportaste valor: aportaste asco, retrasado. El lastre se tira. No eres una baja: eres un alivio. El segundo en que desaparezcas, se respira. Fuera, miseria.',
    varios: '%M el grupo iba más lento por cargaros, parásitos de mierda.\nNo aportasteis valor: aportasteis asco, retrasados. El lastre se tira. No sois una baja: sois un alivio. El segundo en que desaparezcáis, se respira. Fuera, miseria.'
  },
  {
    uno: '%M tu nombre en la lista fue un error, y el error eras tú, cabrón.\nAlguien te dejó entrar y nadie te reclamó. Eso no es pertenecer: es un descuido. Estuviste de más desde la puerta. Hoy se corrige delante de todos. No valías. Fuera, basura.',
    varios: '%M vuestros nombres en la lista fueron un error, y el error erais vosotros, cabrones.\nAlguien os dejó entrar y nadie os reclamó. Eso no es pertenecer: es un descuido. Estuvisteis de más desde la puerta. Hoy se corrige delante de todos. No valíais. Fuera, basura.',
  },
  {
    uno: '%M tu última oportunidad pasó hace tiempo y ni te enteraste, hijo de puta.\nEl grupo te dio cuerda. La gastaste en no ser nadie. Te la jugaste a que nadie se iba a molestar en echarte. Perdiste. El grupo se molestó. Lárgate.',
    varios: '%M vuestra última oportunidad pasó hace tiempo y ni os enterasteis, hijos de puta.\nEl grupo os dio cuerda. La gastasteis en no ser nadie. Os la jugasteis a que nadie se iba a molestar en echaros. Perdisteis. El grupo se molestó. Largaos.'
  },
  {
    uno: '%M esta puerta no se vuelve a abrir para ti. Ni mañana, ni cuando finjas que cambiaste, hijo de puta.\nEl grupo ya te tuvo, ya te midió y ya te encontró corto. Si vuelves a pedir entrar, el que lo lea se va a reír. Fuera, y no vuelvas, cabrón.',
    varios: '%M esta puerta no se vuelve a abrir para vosotros. Ni mañana, ni cuando finjáis que cambiasteis, hijos de puta.\nEl grupo ya os tuvo, ya os midió y ya os encontró cortos. Si volvéis a pedir entrar, el que lo lea se va a reír. Fuera, y no volváis, cabrones.',
  },
  {
    uno: '%M eres el asco que el grupo fingió no ver hasta que ya no pudo, puta.\nCada mensaje tuyo bajaba el nivel. Cada silencio también, porque hasta callado ocupabas mal. Te tuvieron por lástima. La lástima se agotó. Fuera, escoria.',
    varios: '%M sois el asco que el grupo fingió no ver hasta que ya no pudo, putas.\nCada mensaje vuestro bajaba el nivel. Cada silencio también, porque hasta callados ocupabais mal. Os tuvieron por lástima. La lástima se agotó. Fuera, escoria.',
  },
  {
    uno: '%M hay gente que silenció este grupo por tu culpa, pringado de mierda.\nEres ruido que no aporta y que cansa, joder. Se te oía y se te ignoraba. Te fuiste de la conversación hace meses y nadie te extrañó. Hoy se hace oficial. Fuera, ridículo.',
    varios: '%M hay gente que silenció este grupo por vuestra culpa, pringados de mierda.\nSois ruido que no aporta y que cansa, joder. Se os oía y se os ignoraba. Os fuisteis de la conversación hace meses y nadie os echó de menos. Hoy se hace oficial. Fuera, ridículos.'
  },
  {
    uno: '%M mírate. No aportas, no vales, no haces falta y encima te creíste parte, retrasado.\nUn desperdicio con patas. El grupo no te echa enfadado: el enfado sería darte importancia, y no la tienes. Te echa harto. Fuera, puto inútil.',
    varios: '%M miraos. No aportáis, no valéis, no hacéis falta y encima os creísteis parte, retrasados.\nUn desperdicio con patas. El grupo no os echa enfadado: el enfado sería daros importancia, y no la tenéis. Os echa harto. Fuera, putos inútiles.',
  },
  {
    uno: '%M el grupo se construyó sin ti, funcionó a pesar de ti y va a respirar mejor sin ti, don nadie.\n¿De verdad pensaste que te necesitaban? Joder. Sobras entero. No dejaste una huella que merezca quedarse. Ni una. Fuera, basura.',
    varios: '%M el grupo se construyó sin vosotros, funcionó a pesar de vosotros y va a respirar mejor sin vosotros, don nadies.\n¿De verdad pensasteis que os necesitaban? Joder. Sobráis enteros. No dejasteis una huella que merezca quedarse. Ni una. Fuera, basura.',
  },
  {
    uno: '%M no te echan con pena. Te echan con alivio, maricón, y se te va a notar en la cara.\nTe creíste a la altura de gente que no te daría ni la hora. Tu ausencia es una mejora. No hay discurso de despedida para un lastre. Lárgate.',
    varios: '%M no os echan con pena. Os echan con alivio, maricones, y se les va a notar en la cara.\nOs creísteis a la altura de gente que no os daría ni la hora. Vuestra ausencia es una mejora. No hay discurso de despedida para un lastre. Largaos.',
  },
  {
    uno: '%M te fuiste hace tiempo. Hoy solo se hace oficial, fantasma de mierda.\nDejaste de contar el día en que el grupo aprendió a ignorarte, maricón. Estar en la lista no es pertenecer. Nadie va a pelear por tu nombre. Nadie va a decir «pena». Fuera.',
    varios: '%M os fuisteis hace tiempo. Hoy solo se hace oficial, fantasmas de mierda.\nDejasteis de contar el día en que el grupo aprendió a ignoraros, maricones. Estar en la lista no es pertenecer. Nadie va a pelear por vuestros nombres. Nadie va a decir «pena». Fuera.'
  },
  {
    uno: '%M este grupo no es un refugio para el que no pinta una mierda, guarra.\nEntraste como si el sitio fuera un derecho. Se gana, y tú no lo ganaste. Hoy se corrige. No hay «una oportunidad más». Fuera, gilipoyas.',
    varios: '%M este grupo no es un refugio para el que no pinta una mierda, guarras.\nEntrasteis como si el sitio fuera un derecho. Se gana, y vosotros no lo ganasteis. Hoy se corrige. No hay «una oportunidad más». Fuera, gilipoyas.',
  },
  {
    uno: '%M nadie en este grupo te quiere cerca, y se te nota a kilómetros, puta.\nNo caes, no aportas, no follas y aun así te quedaste pegado. Confundiste que no te echaran con que te aceptaran. Te acaban de echar. Se te acabó el cuento. Fuera, miseria.',
    varios: '%M nadie en este grupo os quiere cerca, y se os nota a kilómetros, putas.\nNo caéis, no aportáis, no folláis y aun así os quedasteis pegados. Confundisteis que no os echaran con que os aceptaran. Os acaban de echar. Se os acabó el cuento. Fuera, miseria.',
  },
  {
    uno: '%M el grupo pasa vergüenza ajena por ti desde hace rato, y tú tan feliz, retrasado.\nNi captas cuando te están destrozando en la cara. Hoy no hay subtexto. Te echan. Lo ve todo el mundo. Quien te defienda que lo haga ahora. Nadie va a hacerlo. Fuera, ridículo.',
    varios: '%M el grupo pasa vergüenza ajena por vosotros desde hace rato, y vosotros tan felices, retrasados.\nNi captáis cuando os están destrozando en la cara. Hoy no hay subtexto. Os echan. Lo ve todo el mundo. Quien os defienda que lo haga ahora. Nadie va a hacerlo. Fuera, ridículos.',
  },
  {
    uno: '%M nunca le hablaste a nadie por su nombre. Nunca, hijo de puta.\nNo saludaste, no contestaste, no te mojaste. Ocupabas sitio sin dirigir la palabra a un ser humano. Hoy te echan y no hay un mensaje tuyo que merezca defensa. Fuera, don nadie.',
    varios: '%M nunca le hablasteis a nadie por su nombre. Nunca, hijos de puta.\nNo saludasteis, no contestasteis, no os mojasteis. Ocupabais sitio sin dirigir la palabra a un ser humano. Hoy os echan y no hay un mensaje vuestro que merezca defensa. Fuera, don nadies.',
  },
  {
    uno: '%M solo aparecías cuando había sangre. Drama, pelea, alguien hundiéndose: ahí sí, a chupar, puta.\nEl resto del tiempo, un cadáver. El grupo no es tu reality. Hoy se te corta el suministro. Lárgate.',
    varios: '%M solo aparecíais cuando había sangre. Drama, pelea, alguien hundiéndose: ahí sí, a chupar, putas.\nEl resto del tiempo, cadáveres. El grupo no es vuestro reality. Hoy se os corta el suministro y os echan. Largaos.'
  },
  {
    uno: '%M esta es la primera vez que el grupo te mira de verdad, y ya está harto, retrasado.\nHasta hoy eras un número. Hoy eres un problema que se resuelve. Te echan y el grupo sigue en la frase siguiente, como si no hubieras existido. Que es el caso. Fuera.',
    varios: '%M esta es la primera vez que el grupo os mira de verdad, y ya está harto, retrasados.\nHasta hoy erais un número. Hoy sois un problema que se resuelve. Os echan y el grupo sigue en la frase siguiente, como si no hubierais existido. Que es el caso. Fuera.'
  },
  {
    uno: '%M esto no era tu casa, cabrón. Era una parada. Te quedaste de más y confundiste turismo con pertenencia.\nEl viaje se acabó. No hay «gracias por venir». Hay una puerta y un empujón. Fuera, y no vuelvas a pedir plaza.',
    varios: '%M esto no era vuestra casa, cabrones. Era una parada. Os quedasteis de más y confundisteis turismo con pertenencia.\nEl viaje se acabó. No hay «gracias por venir». Hay una puerta y un empujón. Fuera, y no volváis a pedir plaza.'
  },
  {
    uno: '%M te pasaste el grupo entero guardando lo que otros decían y sin soltar una puta frase que valiera.\nChupaste chistes y devolviste silencio. No eras miembro: eras un ladrón de conversaciones. Hoy se te acaba el archivo. Fuera, parásito.',
    varios: '%M os pasasteis el grupo entero guardando lo que otros decían y sin soltar una puta frase que valiera.\nChupasteis chistes y devolvisteis silencio. No erais miembros: erais ladrones de conversaciones. Hoy se os acaba el archivo. Fuera, parásitos.',
  },
  {
    uno: '%M tu personalidad era estar en este grupo. Nada más. Ni cara, ni criterio, ni una puta opinión.\nCuando te echan no se pierde a nadie: se pierde una línea. Detrás no había una persona. Fuera, vacío con teléfono.',
    varios: '%M vuestra personalidad era estar en este grupo. Nada más. Ni cara, ni criterio, ni una puta opinión.\nCuando os echan no se pierde a nadie: se pierde una línea. Detrás no había una persona. Fuera, vacíos con teléfono.',
  },
  {
    uno: '%M llegabas tarde a cada conversación y la matabas con un comentario que nadie pidió, cabrón.\nEntras cuando ya se rieron y preguntas qué pasó. Hoy el grupo se quita el retraso. Nunca estuviste a tiempo. Fuera, lastre.',
    varios: '%M llegabais tarde a cada conversación y la matabais con un comentario que nadie pidió, cabrones.\nSois los que entran cuando ya se rieron y preguntan qué pasó. Hoy el grupo se quita el retraso. Nunca estuvisteis a tiempo. Fuera, lastre.',
  },
  {
    uno: '%M tus mensajes se saltaban. Se veían y se bajaba el pulgar, coño. Nadie te respondía porque no había nada que responder.\nNo eras conversación: eras interrupción. El grupo te echa para dejar de pasar por encima de ti. Fuera, ridículo.',
    varios: '%M vuestros mensajes se saltaban. Se veían y se bajaba el pulgar, coño. Nadie os respondía porque no había nada que responder.\nNo erais conversación: erais interrupción. El grupo os echa para dejar de pasar por encima de vosotros. Fuera, ridículos.',
  },
  {
    uno: '%M pertenecer cuesta, muerto de hambre. Cuesta escribir, mojarse, quedar mal, volver. Tú no pagaste nada y ocupaste igual, joder.\nQuerías el grupo sin el trabajo de ser alguien aquí. Hoy se te cobra de golpe: la plaza y la cara. No hay crédito. Fuera.',
    varios: '%M pertenecer cuesta, muertos de hambre. Cuesta escribir, mojarse, quedar mal, volver. Vosotros no pagasteis nada y ocupasteis igual, joder.\nQueríais el grupo sin el trabajo de ser alguien aquí. Hoy se os cobra de golpe: la plaza y la cara. No hay crédito. Fuera.'
  },
  {
    uno: '%M usaste este grupo como sala de espera, puta. Entraste, te sentaste y no pasó nada porque tú no hacías nada.\nLa espera se acabó y no te llamaron. El que espera sin aportar no es paciente: es un estorbo. Te echan. Fuera.',
    varios: '%M usasteis este grupo como sala de espera, putas. Entrasteis, os sentasteis y no pasó nada porque vosotros no hacíais nada.\nLa espera se acabó y no os llamaron. El que espera sin aportar no es paciente: es un estorbo. Os echan. Fuera.'
  },
  {
    uno: '%M te creíste protagonista de un chat donde nadie te habría puesto ni de extra, maricón.\nHablabas poco y pensabas mucho en ti. El grupo funcionaba mejor cuando no aparecías. Hoy se corta el papel. Fuera.',
    varios: '%M os creísteis protagonistas de un chat donde nadie os habría puesto ni de extras, maricones.\nHablabais poco y pensabais mucho en vosotros. El grupo funcionaba mejor cuando no aparecíais. Hoy se corta el papel. Fuera.'
  },
  {
    uno: '%M esta expulsión llega tarde, gilipoyas, y se nota.\nHace semanas que el grupo te tenía sentenciado. Solo faltaba que alguien pulsara. Hoy pulsan. El resto ya lo había decidido. Tú te enteras ahora. Lárgate.',
    varios: '%M esta expulsión llega tarde, gilipoyas, y se nota.\nHace semanas que el grupo os tenía sentenciados. Solo faltaba que alguien pulsara. Hoy pulsan. El resto ya lo había decidido. Vosotros os enteráis ahora. Os echan. Largaos.'
  },
  {
    uno: '%M lo más memorable que has hecho aquí es que te echen, retrasado.\nHasta hoy no había un momento tuyo que alguien pudiera contar. Ahora sí: el final. Un fracaso tan limpio que no deja ni anécdota. Fuera.',
    varios: '%M lo más memorable que habéis hecho aquí es que os echen, retrasados.\nHasta hoy no había un momento vuestro que alguien pudiera contar. Ahora sí: el final. Un fracaso tan limpio que no deja ni anécdota. Os echan. Fuera.'
  },
  {
    uno: '%M usaste el grupo para soltar tu mierda y desaparecer, guarra.\nQuejas, dramas, silencios de tres días. Nunca una conversación de verdad. Hoy te echan y se acaba el vertido. El grupo no era tu urgencia. Fuera.',
    varios: '%M usasteis el grupo para soltar vuestra mierda y desaparecer, guarras.\nQuejas, dramas, silencios de tres días. Nunca una conversación de verdad. Hoy os echan y se acaba el vertido. El grupo no era vuestra urgencia. Fuera.'
  },
  {
    uno: '%M nadie te puso un apodo. Nadie, hijo de puta. Para tener apodo hay que existir lo bastante como para que alguien se moleste.\nTú no llegaste. Te echan con el nombre que trajo WhatsApp, que es todo lo que fuiste. Fuera.',
    varios: '%M nadie os puso un apodo. Nadie, hijos de puta. Para tener apodo hay que existir lo bastante como para que alguien se moleste.\nVosotros no llegasteis. Os echan con el nombre que trajo WhatsApp, que es todo lo que fuisteis. Fuera.'
  },
  {
    uno: '%M hay gente que se fue de este grupo por no aguantarte, y tú tan campante, puta.\nEres el motivo por el que el chat perdió a alguien que sí valía. Hoy se invierte: se queda el grupo y sales tú. Tarde, pero se invierte. Fuera.',
    varios: '%M hay gente que se fue de este grupo por no aguantaros, y vosotros tan campantes, putas.\nSois el motivo por el que el chat perdió a alguien que sí valía. Hoy se invierte: se queda el grupo y salís vosotros. Tarde, pero se invierte. Fuera.'
  },
  {
    uno: '%M tu único talento aquí fue que no te echaran hasta hoy, retrasado.\nNo aportaste. No caíste bien. No sostuviste nada. Solo duraste. Eso no es mérito: es pereza ajena. La pereza se acabó. Lárgate.',
    varios: '%M vuestro único talento aquí fue que no os echaran hasta hoy, retrasados.\nNo aportasteis. No caísteis bien. No sostuvisteis nada. Solo durasteis. Eso no es mérito: es pereza ajena. La pereza se acabó. Largaos.'
  },
  {
    uno: '%M para este grupo eras un número, inútil. Ni cara, ni frase, ni un hueco que tapar cuando te vayas, coño.\nWhatsApp te cuenta en la lista. El grupo no. Hoy la lista se pone honesta. Fuera.',
    varios: '%M para este grupo erais un número, inútiles. Ni cara, ni frase, ni un hueco que tapar cuando os vayáis, coño.\nWhatsApp os cuenta en la lista. El grupo no. Hoy la lista se pone honesta y os echan. Fuera.'
  },
  {
    uno: '%M tu silencio no era misterio. Era pobreza, cabrón. No tenías qué decir y lo disfrazaste de pose.\nEl grupo ya no te compra el disfraz. Te echan callado, que es exactamente como viviste aquí. No había nada detrás. Fuera.',
    varios: '%M vuestro silencio no era misterio. Era pobreza, cabrones. No teníais qué decir y lo disfrazasteis de pose.\nEl grupo ya no os compra el disfraz. Os echan callados, que es exactamente como vivisteis aquí. No había nada detrás. Fuera.',
  },
  {
    uno: '%M usaste lo solo que estás como escudo para que nadie te echara. Ya no cuela, maricón.\nEl grupo no es terapia y tú no eres un caso. Eres un lastre con cuento. Hoy se te acaba el cuento y la plaza. Fuera.',
    varios: '%M usasteis lo solos que estáis como escudo para que nadie os echara. Ya no cuela, maricones.\nEl grupo no es terapia y vosotros no sois un caso. Sois un lastre con cuento. Hoy se os acaba el cuento y la plaza. Fuera.'
  },
  {
    uno: '%M viviste de los chistes de otros. Ni uno fue tuyo. Ni uno, joder.\nTe reías tarde, reenviabas peor y te creíste parte del tono. El tono era de ellos. Tú eras el eco. Hoy se apaga el tuyo. Fuera.',
    varios: '%M vivisteis de los chistes de otros. Ni uno fue vuestro. Ni uno, joder.\nOs reíais tarde, reenviabais peor y os creísteis parte del tono. El tono era de ellos. Vosotros erais el eco. Hoy se apaga el vuestro. Fuera.'
  },
  {
    uno: '%M si alguna vez te rieron un mensaje, fue por no dejarte en visto de una forma demasiado cruel, puta.\nHoy ya no hay esa cortesía. Te echan en público. Sin risa. Sin colchón. El grupo se cansa de fingir que existes. Fuera.',
    varios: '%M si alguna vez os rieron un mensaje, fue por no dejaros en visto de una forma demasiado cruel, putas.\nHoy ya no hay esa cortesía. Os echan en público. Sin risa. Sin colchón. El grupo se cansa de fingir que existís. Fuera.'
  },
  {
    uno: '%M cada vez que escribías, la conversación se moría. Se te veía el nombre y se cambiaba de tema, joder.\nLo que tocas deja de ser gracioso. No es que no te leyeran: es que te leían y se iban. Eso se acaba con la puerta. Fuera.',
    varios: '%M cada vez que escribíais, la conversación se moría. Se os veía el nombre y se cambiaba de tema, joder.\nLo que tocáis deja de ser gracioso. No es que no os leyeran: es que os leían y se iban. Eso se acaba con la puerta. Os echan. Fuera.',
  },
  {
    uno: '%M aparecías solo para hablar de ti y te ibas cuando tocaba escuchar, cabrón.\nEl grupo no es tu diario. No es tu escenario. No es tu urgencia. Hoy se te cierra la boca y la puerta, en ese orden. Fuera.',
    varios: '%M aparecíais solo para hablar de vosotros y os ibais cuando tocaba escuchar, cabrones.\nEl grupo no es vuestro diario. No es vuestro escenario. No es vuestra urgencia. Hoy se os cierra la boca y la puerta, en ese orden. Os echan. Fuera.'
  },
  {
    uno: '%M hubo gente en este grupo que se enteró hoy de que estabas dentro. Hoy. Al verte en el kick, coño.\nEso es todo lo que fuiste: una sorpresa triste. No hay despedida para quien no había llegado. Fuera.',
    varios: '%M hubo gente en este grupo que se enteró hoy de que estabais dentro. Hoy. Al veros en el kick, coño.\nEso es todo lo que fuisteis: una sorpresa triste. No hay despedida para quien no había llegado. Os echan. Fuera.'
  },
  {
    uno: '%M te creíste que este grupo existía para entretenerte, puta. Lo leías, te aburrías, no dabas nada y aun así te quejabas.\nEl grupo no te debía el espectáculo. Te debía una salida. Hoy la cobra. Fuera.',
    varios: '%M os creísteis que este grupo existía para entreteneros, putas. Lo leíais, os aburríais, no dabais nada y aun así os quejabais.\nEl grupo no os debía el espectáculo. Os debía una salida. Hoy la cobra. Fuera.',
  },
  {
    uno: '%M el grupo ya te había reemplazado, gilipoyas. Nadie lo dijo porque nadie te tenía en la cuenta.\nHoy se actualiza la lista para que coincida con la realidad. Llevas fuera de verdad desde hace tiempo. Esto es el empujón. Fuera.',
    varios: '%M el grupo ya os había reemplazado, gilipoyas. Nadie lo dijo porque nadie os tenía en la cuenta.\nHoy se actualiza la lista para que coincida con la realidad y os echan. Lleváis fuera de verdad desde hace tiempo. Esto es el empujón. Fuera.'
  },
  {
    uno: '%M llamabas lealtad a quedarte muteado. No es lealtad. Es esconderse, puta.\nEl grupo no premia al que ocupa sin aparecer. No fuiste fiel: fuiste invisible. La invisibilidad no se condecora. Te echan. Fuera.',
    varios: '%M llamabais lealtad a quedaros muteados. No es lealtad. Es esconderse, putas.\nEl grupo no premia al que ocupa sin aparecer. No fuisteis fieles: fuisteis invisibles. La invisibilidad no se condecora. Os echan. Fuera.'
  },
  {
    uno: '%M te han querido echar antes. En la cabeza de más de uno, gilipoyas. Hoy alguien lo hace y el resto va a respirar.\nNo es un capricho. El grupo te tenía sentenciado en privado. Hoy lo dice en voz alta. Fuera.',
    varios: '%M os han querido echar antes. En la cabeza de más de uno, gilipoyas. Hoy alguien lo hace y el resto va a respirar.\nNo es un capricho. El grupo os tenía sentenciados en privado. Hoy os echa en voz alta. Fuera.',
  },
  {
    uno: '%M no eras miembro. Eras público, maricón. Y un público que no aplaude, no paga y no se va es un problema.\nTe sentaste a mirar y confundiste la entrada con un derecho. El derecho se acaba. Fuera.',
    varios: '%M no erais miembros. Erais público, maricones. Y un público que no aplaude, no paga y no se va es un problema.\nOs sentasteis a mirar y confundisteis la entrada con un derecho. El derecho se acaba. Os echan. Fuera.'
  },
];

module.exports = { AVISOS_KICK };
