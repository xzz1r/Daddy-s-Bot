// Avisos de !kick. Salen en el grupo ANTES de echar, para que lo vean.
//
// No es un comunicado. Es la medida en público: no dan el nivel de esta sala,
// la cabeza tiene un techo y el valor no cubre la plaza. El taco va dentro.
// Cada una ataca un hueso distinto. pickFresh las reparte por grupo.
//
// %M se sustituye por las menciones. Singular (tú) y plural (vosotros).
// Nada de ustedes.
//
const AVISOS_KICK = [
  {
    uno: '%M no llegas al nivel de este grupo, retrasado. El chiste ya había caído y tú seguías en la frase de antes, con la boca abierta.\nEsa velocidad es tu techo. Mañana vas a ir igual de tarde. La sala no baja el listón para que quepas. Lárgate.',
    varios: '%M no llegáis al nivel de este grupo, retrasados. El chiste ya había caído y vosotros seguíais en la frase de antes, con la boca abierta.\nEsa velocidad es vuestro techo. Mañana vais a ir igual de tarde. La sala no baja el listón para que quepáis. Largaos.',
  },
  {
    uno: '%M te tasaron, puta, y la cifra daba vergüenza. No te dejaron dentro porque valieras una plaza. Te dejaron porque borrarte era un trámite.\nHoy el trámite sale barato. Tu cabeza no cubre esta sala y tu valor no cubre el sitio. Fuera.',
    varios: '%M os tasaron, putas, y la cifra daba vergüenza. No os dejaron dentro porque valierais una plaza. Os dejaron porque borraros era un trámite.\nHoy el trámite sale barato. Vuestra cabeza no cubre esta sala y vuestro valor no cubre el sitio. Fuera.',
  },
  {
    uno: '%M mira el chat, maricón. Nadie está gastando un mensaje en defenderte.\nSi valieras una frase, alguien la habría escrito. El silencio de los demás es tu precio, dicho delante de todos. Te echan y no se pierde nada que se pueda nombrar. A la calle.',
    varios: '%M mirad el chat, maricones. Nadie está gastando un mensaje en defenderos.\nSi valierais una frase, alguien la habría escrito. El silencio de los demás es vuestro precio, dicho delante de todos. Os echan y no se pierde nada que se pueda nombrar. A la calle.',
  },
  {
    uno: '%M tus líneas se quedaban en doble check y el hilo seguía por encima, hijo de puta.\nNi una cita. Ni una respuesta. Tu cabeza no movía a nadie. Eso es lo que vales aquí: una frase que se salta. Hoy se salta también el nombre. Fuera.',
    varios: '%M vuestras líneas se quedaban en doble check y el hilo seguía por encima, hijos de puta.\nNi una cita. Ni una respuesta. Vuestra cabeza no movía a nadie. Eso es lo que valéis aquí: una frase que se salta. Hoy se salta también el nombre. Fuera.',
  },
  {
    uno: '%M tardabas en «escribiendo...» y soltabas el resumen de lo que ya estaba dicho, guarra.\nEso es llegar tarde y más corto. Aquí no se conserva a quien hay que traducirle el hilo. No das el nivel. Lárgate.',
    varios: '%M tardabais en «escribiendo...» y soltabais el resumen de lo que ya estaba dicho, guarras.\nEso es llegar tarde y más corto. Aquí no os aguantan si hay que traduciros el hilo. No dais el nivel. Largaos.',
  },
  {
    uno: '%M ocupaste la plaza de alguien con cabeza, cabrón. Cada día tuyo fue un día en que no entró una persona que sí llega.\nEl grupo se hizo más tonto por aguantarte. Hoy se corrige la cuenta. Tu valor era negativo y ya se notaba. A la calle.',
    varios: '%M ocupasteis la plaza de alguien con cabeza, cabrones. Cada día vuestro fue un día en que no entró una persona que sí llega.\nEl grupo se hizo más tonto por aguantaros. Hoy se corrige la cuenta. Vuestro valor era negativo y ya se notaba. A la calle.',
  },
  {
    uno: '%M editaste el mensaje cuando viste que nadie contestaba, gilipoyas. La edición es la confesión.\nTu cabeza vio el vacío y aun así no tenía otra frase. Este grupo no archiva intentos. No llegas, y el historial ya lo enseña. Fuera.',
    varios: '%M editasteis el mensaje cuando visteis que nadie contestaba, gilipoyas. La edición es la confesión.\nVuestra cabeza vio el vacío y aun así no tenía otra frase. Este grupo no archiva intentos. No llegáis, y el historial ya lo enseña. Fuera.',
  },
  {
    uno: '%M escribías un párrafo y el punto se te moría dentro, retrasado.\nLa gente subía, lo leía y volvía al mensaje de arriba, que sí decía algo. Tu intelecto, en público, es un texto que no se sostiene. La sala no carga con ese techo. Lárgate.',
    varios: '%M escribíais un párrafo y el punto se os moría dentro, retrasados.\nLa gente subía, lo leía y volvía al mensaje de arriba, que sí decía algo. Vuestro intelecto, en público, es un texto que no se sostiene. La sala no carga con ese techo. Largaos.',
  },
  {
    uno: '%M el puntito verde era tu única prueba de vida, puta. En línea, leyendo, y sin una idea que mereciera sitio.\nEstar conectado no es pensar. Confundiste presencia con valor. El grupo ya no. Te echan porque la cabeza no llega, no porque callaras. Fuera.',
    varios: '%M el puntito verde era vuestra única prueba de vida, putas. En línea, leyendo, y sin una idea que mereciera sitio.\nEstar conectado no es pensar. Confundisteis presencia con valor. El grupo ya no. Os echan porque la cabeza no llega, no porque callarais. Fuera.',
  },
  {
    uno: '%M contestaste el sarcasmo en serio, maricón. No pillas el tono, y el tono es la entrada de esta sala.\nQuien necesita que se lo expliquen no está a la altura. Tu techo es la literalidad. Aquí eso no se queda. A la calle.',
    varios: '%M contestasteis el sarcasmo en serio, maricones. No pilláis el tono, y el tono es la entrada de esta sala.\nQuien necesita que se lo expliquen no está a la altura. Vuestro techo es la literalidad. Aquí eso no se queda. A la calle.',
  },
  {
    uno: '%M nadie tiene un mensaje tuyo guardado, hijo de puta. Ni uno.\nEl valor es lo que la gente no quiere perder. De ti no hay nada que perder. La cabeza no dejó una línea que valiera la captura. Fuera.',
    varios: '%M nadie tiene un mensaje vuestro guardado, hijos de puta. Ni uno.\nEl valor es lo que la gente no quiere perder. De vosotros no hay nada que perder. La cabeza no dejó una línea que valiera la captura. Fuera.',
  },
  {
    uno: '%M preguntaste lo que ya estaba cuatro mensajes más arriba, guarra. Con la hora puesta.\nEso es tu intelecto, fechado. No lees, no retienes y aun así opinas. Este grupo no admite ese techo. No eres suficiente para estar. Lárgate.',
    varios: '%M preguntasteis lo que ya estaba cuatro mensajes más arriba, guarras. Con la hora puesta.\nEso es vuestro intelecto, fechado. No leéis, no retenéis y aun así opináis. Este grupo no admite ese techo. No sois suficientes para estar. Largaos.',
  },
  {
    uno: '%M te contestaban con una palabra, cabrón. No porque cortaras. Porque no valías una frase.\nUna sílaba es la medida de tu peso en esta sala. Quien pesa menos que una respuesta no tiene plaza. A la calle.',
    varios: '%M os contestaban con una palabra, cabrones. No porque cortarais. Porque no valíais una frase.\nUna sílaba es la medida de vuestro peso en esta sala. Quien pesa menos que una respuesta no tiene plaza. A la calle.',
  },
  {
    uno: '%M discutías y alguien tenía que rehacer tu frase para que existiera, gilipoyas.\nTu propia idea no se tenía en pie sola. Eso, aquí, se ve. Y lo que se ve no se queda. No vales la conversación ni el sitio. Fuera.',
    varios: '%M discutíais y alguien tenía que rehacer vuestra frase para que existiera, gilipoyas.\nVuestra propia idea no se tenía en pie sola. Eso, aquí, se ve. Y lo que se ve no se queda. No valéis la conversación ni el sitio. Fuera.',
  },
  {
    uno: '%M el primer mes ya se vio que no dabas el nivel, retrasado. Te dejaron por educación, no por mérito.\nLa educación se acabó. Queda la medida: la cabeza corta, el valor corto, y unas ganas de estar que no entran. Lárgate.',
    varios: '%M el primer mes ya se vio que no dabais el nivel, retrasados. Os dejaron por educación, no por mérito.\nLa educación se acabó. Queda la medida: la cabeza corta, el valor corto, y unas ganas de estar que no entran. Largaos.',
  },
  {
    uno: '%M te creíste la gracia de la sala y el chat se quedó en ese silencio concreto, puta. El silencio tenía tu nombre.\nIntentaste el nivel y el nivel no te contestó. Esa es la prueba, en público. No llegas a esta sala. Fuera.',
    varios: '%M os creísteis la gracia de la sala y el chat se quedó en ese silencio concreto, putas. El silencio tenía vuestro nombre.\nIntentasteis el nivel y el nivel no os contestó. Esa es la prueba, en público. No llegáis a esta sala. Fuera.',
  },
  {
    uno: '%M borra lo que escribiste y el hilo sigue cerrado, maricón. Si el hilo se sostiene sin ti, no estabas dentro.\nEras ruido al margen de quien sí piensa. La sala sigue con esa gente. A ti te sueltan porque no aportas ni cabeza ni valor. A la calle.',
    varios: '%M borrad lo que escribisteis y el hilo sigue cerrado, maricones. Si el hilo se sostiene sin vosotros, no estabais dentro.\nErais ruido al margen de quien sí piensa. La sala sigue con esa gente. A vosotros os sueltan porque no aportáis ni cabeza ni valor. A la calle.',
  },
  {
    uno: '%M quien entró la semana pasada ya tiene líneas que la gente repite, hijo de puta. Tú, con todos estos meses, tienes cero.\nEl tiempo no te subió el techo. Te lo dejó a la vista. No eres suficiente para este grupo y no lo ibas a ser quedándote. Fuera.',
    varios: '%M quien entró la semana pasada ya tiene líneas que la gente repite, hijos de puta. Vosotros, con todos estos meses, tenéis cero.\nEl tiempo no os subió el techo. Os lo dejó a la vista. No sois suficientes para este grupo y no lo ibais a ser quedándoos. Fuera.',
  },
  {
    uno: '%M querías el rango de esta sala, guarra. El rango aquí es una cabeza que muerde.\nTú trajiste la necesidad de que te aceptaran. La necesidad no es nivel. Te midieron y no das. Lárgate.',
    varios: '%M queríais el rango de esta sala, guarras. El rango aquí es una cabeza que muerde.\nVosotros trajisteis la necesidad de que os aceptaran. La necesidad no es nivel. Os midieron y no dais. Largaos.',
  },
  {
    uno: '%M de ti ya se habló en privado, cabrón. No fue «a ver si espabila». Fue «no llega».\nHoy eso se dice con tu nombre delante. No hay malentendido. Hay una cabeza por debajo del corte y una plaza que vuelve al grupo. A la calle.',
    varios: '%M de vosotros ya se habló en privado, cabrones. No fue «a ver si espabilan». Fue «no llegan».\nHoy eso se dice con vuestro nombre delante. No hay malentendido. Hay una cabeza por debajo del corte y una plaza que vuelve al grupo. A la calle.',
  },
  {
    uno: '%M vas a releer esto buscando la parte injusta, gilipoyas. No está.\nLo injusto sería dejarte en un grupo que te queda grande. No vales la plaza. Tu cabeza no llega al tono. El préstamo se acabó. Fuera.',
    varios: '%M vais a releer esto buscando la parte injusta, gilipoyas. No está.\nLo injusto sería dejaros en un grupo que os queda grande. No valéis la plaza. Vuestra cabeza no llega al tono. El préstamo se acabó. Fuera.',
  },
  {
    uno: '%M la defensa que estás montando va a ser más larga que todo lo que aportaste, retrasado.\nEso es tu intelecto, en la puerta, todavía sin una idea. Un párrafo de víctima no sube el nivel. Lo confirma por escrito. Lárgate.',
    varios: '%M la defensa que estáis montando va a ser más larga que todo lo que aportasteis, retrasados.\nEso es vuestro intelecto, en la puerta, todavía sin una idea. Un párrafo de víctima no sube el nivel. Lo confirma por escrito. Largaos.',
  },
  {
    uno: '%M mandabas nota de voz para que no se viera que la idea no sobrevivía escrita, puta.\nSi no cabe en una frase, no hay idea. Hay humo con duración. Este grupo lee. Tu techo no pasa de leído a pensado. Fuera.',
    varios: '%M mandabais nota de voz para que no se viera que la idea no sobrevivía escrita, putas.\nSi no cabe en una frase, no hay idea. Hay humo con duración. Este grupo lee. Vuestro techo no pasa de leído a pensado. Fuera.',
  },
  {
    uno: '%M hasta el insulto te lo prestaban, maricón. Mala leche de segunda mano, y aun así llegaba blanda.\nSin lengua propia no hay sitio aquí. Te creíste con filo y eras una copia peor que el original. No vales el tono de esta sala. A la calle.',
    varios: '%M hasta el insulto os lo prestaban, maricones. Mala leche de segunda mano, y aun así llegaba blanda.\nSin lengua propia no hay sitio aquí. Os creísteis con filo y erais una copia peor que el original. No valéis el tono de esta sala. A la calle.',
  },
  {
    uno: '%M hay quien se fue de este grupo por el nivel que tú arrastrabas, hijo de puta.\nSe quedó fuera una cabeza y te quedaste tú. Hoy se invierte esa mierda. El grupo elige. Tú no sales elegido. Lárgate.',
    varios: '%M hay quien se fue de este grupo por el nivel que vosotros arrastrabais, hijos de puta.\nSe quedó fuera una cabeza y os quedasteis vosotros. Hoy se invierte esa mierda. El grupo elige. Vosotros no salís elegidos. Largaos.',
  },
  {
    uno: '%M llamabas pertenencia a que tardaran en echarte, guarra. El rango más alto que tocaste fue «aún no».\nEso no es valer. Es una deuda de paciencia que ya se pagó en vergüenza ajena. La cabeza no dio. El valor tampoco. Fuera.',
    varios: '%M llamabais pertenencia a que tardaran en echaros, guarras. El rango más alto que tocasteis fue «aún no».\nEso no es valer. Es una deuda de paciencia que ya os costó vergüenza ajena. La cabeza no dio. El valor tampoco. Fuera.',
  },
  {
    uno: '%M no te echan cabreados, cabrón. El cabreo sería darte importancia, y no llegas a eso.\nTe quitan como se quita un peso. Sin discurso. El grupo sigue en la frase siguiente, más rápido, porque tú ya no la frenas. A la calle.',
    varios: '%M no os echan cabreados, cabrones. El cabreo sería daros importancia, y no llegáis a eso.\nOs quitan como se quita un peso. Sin discurso. El grupo sigue en la frase siguiente, más rápido, porque vosotros ya no la frenáis. A la calle.',
  },
  {
    uno: '%M te creíste que ir de borde te hacía inteligente, gilipoyas. Salía borde y vacío.\nLa mala leche sin una idea es pobreza, no nivel. Aquí el filo va con cabeza. Tú tenías el tono y nada detrás. No eres suficiente. Fuera.',
    varios: '%M os creísteis que ir de borde os hacía inteligentes, gilipoyas. Salía borde y vacío.\nLa mala leche sin una idea es pobreza, no nivel. Aquí el filo va con cabeza. Vosotros teníais el tono y nada detrás. No sois suficientes. Fuera.',
  },
  {
    uno: '%M contabas los mensajes como si el número fuera una cabeza, retrasado.\nVolumen no es intelecto. Se puede escribir todo el día y seguir en cero. Tú estabas en cero con el contador alto. Ese es el techo. Lárgate.',
    varios: '%M contabais los mensajes como si el número fuera una cabeza, retrasados.\nVolumen no es intelecto. Se puede escribir todo el día y seguir en cero. Vosotros estabais en cero con el contador alto. Ese es el techo. Largaos.',
  },
  {
    uno: '%M hablabas y el mensaje de después tenía que resucitar el tema, puta. El tuyo lo había matado.\nUna cabeza que apaga la sala no se conserva. Se saca. Tu valor, en números, es lo que el chat recupera cuando ya no estás. A la calle.',
    varios: '%M hablabais y el mensaje de después tenía que resucitar el tema, putas. El vuestro lo había matado.\nUna cabeza que apaga la sala no se conserva. Se saca. Vuestro valor, en números, es lo que el chat recupera cuando ya no estáis. A la calle.',
  },
  {
    uno: '%M ni sabes cómo se llama la gente de aquí y aun así opinabas, maricón.\nBoca llena y memoria de grupo en cero. Esta sala se muerde con nombre. Tú mordías al aire. No das el nivel ni de atención. Fuera.',
    varios: '%M ni sabéis cómo se llama la gente de aquí y aun así opinabais, maricones.\nBoca llena y memoria de grupo en cero. Esta sala se muerde con nombre. Vosotros mordíais al aire. No dais el nivel ni de atención. Fuera.',
  },
  {
    uno: '%M cuando tu nombre salga de la lista, la frase de después va a caer más limpia, hijo de puta.\nEse es tu aporte de verdad: negativo. Quitarte sube el grupo. Dejarte lo bajaba. La cuenta, por fin, sale bien. Lárgate.',
    varios: '%M cuando vuestro nombre salga de la lista, la frase de después va a caer más limpia, hijos de puta.\nEse es vuestro aporte de verdad: negativo. Quitaros sube el grupo. Dejaros lo bajaba. La cuenta, por fin, sale bien. Largaos.',
  },
  {
    uno: '%M confundiste entrar con merecerlo, guarra. Un sitio aquí se gana con cabeza.\nTú bajaste la sala y lo llamaste estar. Estar lo hace cualquiera con un teléfono. Llegar, no. Y tú no llegas. El corte sigue por encima de ti. Fuera.',
    varios: '%M confundisteis entrar con merecerlo, guarras. Un sitio aquí se gana con cabeza.\nVosotros bajasteis la sala y lo llamasteis estar. Estar lo hace cualquiera con un teléfono. Llegar, no. Y vosotros no llegáis. El corte sigue por encima de vosotros. Fuera.',
  },
  {
    uno: '%M tienes el chat en capturas y en ninguna sale una frase tuya, cabrón.\nArchivaste la cabeza de otros. La tuya no dio para una línea que quisieras volver a leer. Un grupo no se queda a quien solo mira. A la calle.',
    varios: '%M tenéis el chat en capturas y en ninguna sale una frase vuestra, cabrones.\nArchivasteis la cabeza de otros. La vuestra no dio para una línea que quisierais volver a leer. Un grupo no se queda a quien solo mira. A la calle.',
  },
  {
    uno: '%M mandaste un segundo mensaje con «??» porque el primero se quedó en visto, gilipoyas.\nEsa hora es tu valor, escrita en el chat. No valías ni la respuesta. Aquí no cabe quien pide un visto a gritos. No das. Fuera.',
    varios: '%M mandasteis un segundo mensaje con «??» porque el primero se quedó en visto, gilipoyas.\nEsa hora es vuestro valor, escrita en el chat. No valíais ni la respuesta. Aquí no cabéis pidiendo un visto a gritos. No dais. Fuera.',
  },
  {
    uno: '%M te corrigieron con el mismo hilo, diez minutos después, retrasado. Lo que soltaste no aguantó el tiempo de bajar a por agua.\nEso es el techo: no sobrevive a una relectura. Una cabeza de este grupo sí. La tuya no, y por eso sobra la plaza. Lárgate.',
    varios: '%M os corrigieron con el mismo hilo, diez minutos después, retrasados. Lo que soltasteis no aguantó el tiempo de bajar a por agua.\nEso es el techo: no sobrevive a una relectura. Una cabeza de este grupo sí. La vuestra no, y por eso sobra la plaza. Largaos.',
  },
  {
    uno: '%M ibas de profundidad y salía el recuento de los tres mensajes de antes, puta. Más lento y sin filo.\nLa sala tiene oído. Oyó el recuento. Aquí se demuestra con una frase que corte, no con un resumen. La tuya no corta. Tú sobras. A la calle.',
    varios: '%M ibais de profundidad y salía el recuento de los tres mensajes de antes, putas. Más lento y sin filo.\nLa sala tiene oído. Oyó el recuento. Aquí se demuestra con una frase que corte, no con un resumen. La vuestra no corta. Vosotros sobráis. A la calle.',
  },
  {
    uno: '%M nadie te acortó el nombre, maricón. Un apodo es un esfuerzo, y tú no valías ese esfuerzo.\nTe echan con el nombre que trajo el teléfono. Eso es todo lo que fuiste: un contacto sin cabeza bastante para que alguien se molestara. Fuera.',
    varios: '%M nadie os acortó el nombre, maricones. Un apodo es un esfuerzo, y vosotros no valíais ese esfuerzo.\nOs echan con el nombre que trajo el teléfono. Eso es todo lo que fuisteis: un contacto sin cabeza bastante para que alguien se molestara. Fuera.',
  },
  {
    uno: '%M te creíste rival, hijo de puta. Un rival afila la sala.\nTú la parabas para que te explicaran el golpe, como en clase. Este grupo no es tu clase de recuperación. Es un corte al que no llegas. Lárgate.',
    varios: '%M os creísteis rivales, hijos de puta. Un rival afila la sala.\nVosotros la parabais para que os explicaran el golpe, como en clase. Este grupo no es vuestra clase de recuperación. Es un corte al que no llegáis. Largaos.',
  },
  {
    uno: '%M te midieron contra quien se queda, guarra. Por debajo en malicia, por debajo en velocidad, por debajo en cualquier cosa que no sea gana de estar.\nTres veces por debajo. Con una bastaba. No eres suficiente para este grupo y el mes que viene ibas a medir lo mismo. Fuera.',
    varios: '%M os midieron contra quien se queda, guarras. Por debajo en malicia, por debajo en velocidad, por debajo en cualquier cosa que no sea gana de estar.\nTres veces por debajo. Con una bastaba. No sois suficientes para este grupo y el mes que viene ibais a medir lo mismo. Fuera.',
  },
  {
    uno: '%M el «me da igual» era pose, cabrón. Quien de verdad no quiere estar, se va.\nTú te quedaste meses sin llegar al tono. Ni el desapego te salía. Te sale quedarte de más y pensar de menos. Hoy se cortan las dos. A la calle.',
    varios: '%M el «me da igual» era pose, cabrones. Quien de verdad no quiere estar, se va.\nVosotros os quedasteis meses sin llegar al tono. Ni el desapego os salía. Os sale quedaros de más y pensar de menos. Hoy se cortan las dos. A la calle.',
  },
  {
    uno: '%M cita una cosa tuya sin la cual este grupo estaría peor, gilipoyas. No puedes.\nEsa prueba es el kick. Quien no sube el nivel ocupa un sitio que no es suyo. El sitio vuelve a la sala. Tú vuelves a no dar la talla, ya fuera. Fuera.',
    varios: '%M citad una cosa vuestra sin la cual este grupo estaría peor, gilipoyas. No podéis.\nEsa prueba es el kick. Quien no sube el nivel ocupa un sitio que no es suyo. El sitio vuelve a la sala. Vosotros volvéis a no dar la talla, ya fuera. Fuera.',
  },
  {
    uno: '%M leíste todo y no produjiste nada, retrasado. Un archivo con boca.\nLa boca era el problema: se abría y el cuarto bajaba. Leer sin una idea propia no es intelecto. Es almacenar. Lo que se almacena no tiene plaza. Lárgate.',
    varios: '%M leísteis todo y no produjisteis nada, retrasados. Un archivo con boca.\nLa boca era el problema: se abría y el cuarto bajaba. Leer sin una idea propia no es intelecto. Es almacenar. Lo almacenado no os compra una plaza. Largaos.',
  },
  {
    uno: '%M se te podía capturar bajando el hilo, puta. Salía tu nombre y el chat se volvía más tonto.\nEso no es una opinión. Es el historial. Tu cabeza está guardada en el grupo, y es justo lo que se está tirando. No llegas. A la calle.',
    varios: '%M se os podía capturar bajando el hilo, putas. Salía vuestro nombre y el chat se volvía más tonto.\nEso no es una opinión. Es el historial. Vuestra cabeza está guardada en el grupo, y es justo lo que se está tirando. No llegáis. A la calle.',
  },
  {
    uno: '%M aquí no te han entendido mal, maricón. A quien se entiende mal, alguien le cita una frase torcida.\nA ti no te cita nadie, porque no hay una frase que merezca salir mal. Vacío con opinión. Esta sala ya tuvo paciencia de sobra con ese vacío. Fuera.',
    varios: '%M aquí no os han entendido mal, maricones. A quien se entiende mal, alguien le cita una frase torcida.\nA vosotros no os cita nadie, porque no hay una frase que merezca salir mal. Vacío con opinión. Esta sala ya tuvo paciencia de sobra con ese vacío. Fuera.',
  },
  {
    uno: '%M el techo se va contigo, hijo de puta. Cambiar de grupo no te lo sube.\nEran más rápidos que tú y no pudiste seguirles. En el siguiente vas a quedar otra vez por debajo. El nivel no viaja contigo. La falta de nivel, sí. Lárgate.',
    varios: '%M el techo se va con vosotros, hijos de puta. Cambiar de grupo no os lo sube.\nEran más rápidos que vosotros y no pudisteis seguirles. En el siguiente vais a quedar otra vez por debajo. El nivel no viaja con vosotros. La falta de nivel, sí. Largaos.',
  },
  {
    uno: '%M si hubieras faltado el mes pasado, nadie habría escrito tu nombre, guarra.\nEl valor es quién te echa de menos cuando no estás. No te echó de menos nadie mientras estabas. La cabeza no dejó huella. Menos va a dejar ahora. Fuera.',
    varios: '%M si hubierais faltado el mes pasado, nadie habría escrito vuestro nombre, guarras.\nEl valor es quién os echa de menos cuando no estáis. No os echó de menos nadie mientras estabais. La cabeza no dejó huella. Menos va a dejar ahora. Fuera.',
  },
  {
    uno: '%M usabas el grupo de espejo, cabrón. Cada frase tuya iba de ti, metida en un hilo que iba de otra cosa.\nNi leías a la gente ni llegabas al tema. Ego con mala puntería. Aquí eso no se aguanta. Te echan porque pesas poco en esta sala, no porque ardieras. A la calle.',
    varios: '%M usabais el grupo de espejo, cabrones. Cada frase vuestra iba de vosotros, metida en un hilo que iba de otra cosa.\nNi leíais a la gente ni llegabais al tema. Ego con mala puntería. Aquí eso no se aguanta. Os echan porque pesáis poco en esta sala, no porque ardierais. A la calle.',
  },
  {
    uno: '%M la disculpa que estás armando no te sube el nivel, gilipoyas. Confirma que sigues creyendo que esto va de modales.\nVa de que tu cabeza no pasa el corte de esta sala. Los modales no te hacen suficiente. No lo fuiste ni un mes. Fuera.',
    varios: '%M la disculpa que estáis armando no os sube el nivel, gilipoyas. Confirma que seguís creyendo que esto va de modales.\nVa de que vuestra cabeza no pasa el corte de esta sala. Los modales no os hacen suficientes. No lo fuisteis ni un mes. Fuera.',
  },
  {
    uno: '%M fuera vas a decir que este grupo era tóxico, retrasado. Te vas a dejar fuera la parte que duele.\nTenían más filo que tú y no les llegabas. El kick es el nivel diciendo que no. Tu valor no daba. Tu intelecto tampoco. Y no va a dar. Lárgate.',
    varios: '%M fuera vais a decir que este grupo era tóxico, retrasados. Os vais a dejar fuera la parte que duele.\nTenían más filo que vosotros y no les llegabais. El kick es el nivel diciendo que no. Vuestro valor no daba. Vuestro intelecto tampoco. Y no va a dar. Largaos.',
  },
];

module.exports = { AVISOS_KICK };
