// Avisos de !kick. Salen en el grupo ANTES de echar, para que lo vean.
//
// Ataques a la persona, y nada más (dueño, 23 oct): «deben decir que da asco
// y ta ta ta, no debes inventarte algo, solo debes dar ataques a su persona».
// El bot no sabe qué hizo cada cual, así que no se le inventan hechos (audios,
// faltas, meses callado): se le dice lo que es. Que da asco, que no vale nada,
// que nadie la soporta, que sobra. Un solo párrafo, largo, y sin la coletilla
// de cierre siempre igual. «Sitio», no «plaza». pickFresh las reparte por
// grupo.
//
// SIN DAR POR HECHO EL GÉNERO (GUIA §9): «das asco», «eres un parásito»,
// «eres insoportable», nunca «eres un inútil» ni un adjetivo en -o pegado a
// quien lee. El vocativo suelto sí vale.
//
// %M se sustituye por las menciones. Singular (tú) y plural (vosotros).
// Nada de ustedes.
//
// SESENTA, Y CADA UNA CON SU ÁNGULO (dueño, 13 nov: «muchas son demasiado
// repetitivas»). Las quince primeras fijaron el molde —«%M eres [algo],
// [insulto]», la lista «no aportas, no sumas, no vales», el cierre «Te echan
// porque…» o «Hoy se…»— y de la 16 en adelante casi todas lo copiaban
// cambiando el sustantivo. Las flojas de ese tramo se reescribieron, cada una
// por un defecto distinto (el ego, la cobardía, la envidia, la falsedad, el
// victimismo, la pesadez…), y se añadieron diez. Una nueva no repite ángulo,
// apertura ni cierre de otra: si se parece a una que ya está, no entra.
//
const AVISOS_KICK = [
  {
    uno: '%M das asco, gilipoyas, y no hay forma bonita de decirlo. Das asco cuando escribes, das asco cuando miras y das asco hasta cuando no estás, porque tu nombre en la lista ya revuelve el estómago. Nadie aquí te quiere cerca y nadie lo ha querido nunca. Te echan porque el grupo merece respirar aire limpio, y contigo dentro eso era imposible.',
    varios: '%M dais asco, gilipoyas, y no hay forma bonita de decirlo. Dais asco cuando escribís, dais asco cuando miráis y dais asco hasta cuando no estáis, porque vuestros nombres en la lista ya revuelven el estómago. Nadie aquí os quiere cerca y nadie lo ha querido nunca. Os echan porque el grupo merece respirar aire limpio, y con vosotros dentro eso era imposible.',
  },
  {
    uno: '%M eres un puto asco de persona, imbécil. No vales nada, no aportas nada y no le importas a nadie, y lo peor es que te lo has ganado a pulso. Hay gente que cae mal por algo; tú caes mal por existir. Nadie aquí está obligado a aguantar a alguien así, y desde hoy nadie lo hace. Largo de aquí.',
    varios: '%M sois un puto asco de personas, imbéciles. No valéis nada, no aportáis nada y no le importáis a nadie, y lo peor es que os lo habéis ganado a pulso. Hay gente que cae mal por algo; vosotros caéis mal por existir. Nadie aquí está obligado a aguantar a gente así, y desde hoy nadie lo hace. Largo de aquí.',
  },
  {
    uno: '%M no sirves para nada, puto inútil, y eso es lo más amable que se puede decir de ti. Eres un estorbo, una carga y una pérdida de tiempo para cualquiera que tenga la desgracia de leerte. Si desaparecieras mañana, el mundo seguiría igual, solo que un poco más limpio. Este grupo empieza hoy a dejarlo un poco más limpio.',
    varios: '%M no servís para nada, putos inútiles, y eso es lo más amable que se puede decir de vosotros. Sois un estorbo, una carga y una pérdida de tiempo para cualquiera que tenga la desgracia de leeros. Si desaparecierais mañana, el mundo seguiría igual, solo que un poco más limpio. Este grupo empieza hoy a dejarlo un poco más limpio.',
  },
  {
    uno: '%M eres escoria, hijo de puta, y se te nota a kilómetros. Todo en ti da vergüenza ajena: lo que dices, cómo lo dices y que te creas que a alguien le importa. No le importa a nadie. Nunca le ha importado a nadie. Te echan porque aquí la basura no se guarda, se saca, y a ti te tocaba hace tiempo.',
    varios: '%M sois escoria, hijos de puta, y se os nota a kilómetros. Todo en vosotros da vergüenza ajena: lo que decís, cómo lo decís y que os creáis que a alguien le importa. No le importa a nadie. Nunca le ha importado a nadie. Os echan porque aquí la basura no se guarda, se saca, y a vosotros os tocaba hace tiempo.',
  },
  {
    uno: '%M das pena, subnormal, y la pena se acaba. Eres de esas personas que no aportan nada, no valen nada y encima se creen algo. No eres nada. Eres un número en una lista que hoy se borra, y nadie va a perder ni un segundo en preguntar por ti. Así de poco vales.',
    varios: '%M dais pena, subnormales, y la pena se acaba. Sois de esas personas que no aportan nada, no valen nada y encima se creen algo. No sois nada. Sois números en una lista que hoy se borran, y nadie va a perder ni un segundo en preguntar por vosotros. Así de poco valéis.',
  },
  {
    uno: '%M eres un parásito, cabrón, y los parásitos se arrancan. Vives de lo que hacen los demás, no das nada a cambio y encima ocupas sitio. No hay una sola razón para que sigas aquí. Fuera de este grupo vas a seguir siendo lo mismo: un estorbo que nadie pidió y que nadie va a echar en falta.',
    varios: '%M sois parásitos, cabrones, y los parásitos se arrancan. Vivís de lo que hacen los demás, no dais nada a cambio y encima ocupáis sitio. No hay una sola razón para que sigáis aquí. Fuera de este grupo vais a seguir siendo lo mismo: estorbos que nadie pidió y que nadie va a echar en falta.',
  },
  {
    uno: '%M eres una vergüenza, retrasado. Una vergüenza para este grupo, para quien te metió y para ti, si tuvieras la cabeza suficiente para darte cuenta. No la tienes. No tienes cabeza, no tienes gracia y no tienes nada que valga un duro. Por eso te vas, y por eso nadie va a levantar la mano para pararlo.',
    varios: '%M sois una vergüenza, retrasados. Una vergüenza para este grupo, para quien os metió y para vosotros, si tuvierais la cabeza suficiente para daros cuenta. No la tenéis. No tenéis cabeza, no tenéis gracia y no tenéis nada que valga un duro. Por eso os vais, y por eso nadie va a levantar la mano para pararlo.',
  },
  {
    uno: '%M el grupo entero te tiene asco, puta, y ya era hora de decírtelo a la cara. Asco de leerte, asco de verte en la lista y asco de tener que aguantar que sigas aquí como si pintaras algo. No pintas nada. Nunca has pintado nada. Hoy se acaba el asco, porque se acaba tu sitio en este grupo.',
    varios: '%M el grupo entero os tiene asco, putas, y ya era hora de decíroslo a la cara. Asco de leeros, asco de veros en la lista y asco de tener que aguantar que sigáis aquí como si pintarais algo. No pintáis nada. Nunca habéis pintado nada. Hoy se acaba el asco, porque se acaba vuestro sitio en este grupo.',
  },
  {
    uno: '%M eres basura, gilipoyas, y la basura no se discute: se tira. No vales para conversar, no vales para hacer reír y no vales ni para estar sin molestar. Todo lo que tocas lo ensucias. El grupo va a quedar más limpio en cuanto salgas, y mañana nadie se va a acordar de que pasaste por aquí.',
    varios: '%M sois basura, gilipoyas, y la basura no se discute: se tira. No valéis para conversar, no valéis para hacer reír y no valéis ni para estar sin molestar. Todo lo que tocáis lo ensuciáis. El grupo va a quedar más limpio en cuanto salgáis, y mañana nadie se va a acordar de que pasasteis por aquí.',
  },
  {
    uno: '%M no vales nada, hijo de puta. Ni un poco, ni de vez en cuando, ni en tus mejores días, si es que los tienes. Eres inútil de los pies a la cabeza y das asco hasta sin abrir la boca. Te echan porque nadie quiere seguir arrastrándote, y pesas demasiado para lo poco que eres.',
    varios: '%M no valéis nada, hijos de puta. Ni un poco, ni de vez en cuando, ni en vuestros mejores días, si es que los tenéis. Sois inútiles de los pies a la cabeza y dais asco hasta sin abrir la boca. Os echan porque nadie quiere seguir arrastrándoos, y pesáis demasiado para lo poco que sois.',
  },
  {
    uno: '%M eres un fracaso, imbécil, de los que se ven venir. No tienes gracia, no tienes cabeza y lo único que sabes hacer es molestar. A la gente así no se la echa por lo que hace, sino por lo que es, y lo que eres sobra aquí. Recoge lo poco que tienes y vete a dar asco a otra parte.',
    varios: '%M sois un fracaso, imbéciles, de los que se ven venir. No tenéis gracia, no tenéis cabeza y lo único que sabéis hacer es molestar. A la gente así no se la echa por lo que hace, sino por lo que es, y lo que sois sobra aquí. Recoged lo poco que tenéis e id a dar asco a otra parte.',
  },
  {
    uno: '%M eres insoportable, subnormal, y no hay nadie aquí que piense lo contrario. Insoportable de leer, insoportable de aguantar e insoportable de tener cerca. El grupo no está para soportar a nadie por pena, y por ti ya no queda ni pena. Te vas, y lo único que se va a notar es que se respira mejor.',
    varios: '%M sois insoportables, subnormales, y no hay nadie aquí que piense lo contrario. Insoportables de leer, insoportables de aguantar e insoportables de tener cerca. El grupo no está para soportar a nadie por pena, y por vosotros ya no queda ni pena. Os vais, y lo único que se va a notar es que se respira mejor.',
  },
  {
    uno: '%M nadie te quiere aquí, puto inútil, y nadie te ha querido nunca. No es la opinión de una persona: es lo que piensa todo el grupo, aunque hasta hoy nadie te lo dijera. No caes bien, no haces falta y no aportas nada. Eres un estorbo con nombre, y los estorbos se quitan de en medio sin dar explicaciones.',
    varios: '%M nadie os quiere aquí, putos inútiles, y nadie os ha querido nunca. No es la opinión de una persona: es lo que piensa todo el grupo, aunque hasta hoy nadie os lo dijera. No caéis bien, no hacéis falta y no aportáis nada. Sois estorbos con nombre, y los estorbos se quitan de en medio sin dar explicaciones.',
  },
  {
    uno: '%M eres el error de este grupo, gilipoyas, uno que nadie se atrevía a corregir. Hoy se corrige. No aportas, no sumas y no mejoras nada; lo único que haces es estar, y estar no basta para quedarse. Das asco por dentro y por fuera, y el grupo ya no tiene estómago para más.',
    varios: '%M sois el error de este grupo, gilipoyas, uno que nadie se atrevía a corregir. Hoy se corrige. No aportáis, no sumáis y no mejoráis nada; lo único que hacéis es estar, y estar no basta para quedarse. Dais asco por dentro y por fuera, y el grupo ya no tiene estómago para más.',
  },
  {
    uno: '%M eres una lacra, hijo de puta, de esa gente que no sirve para nada y aun así exige que se la aguante. Aquí no se aguanta a nadie gratis, y no tienes nada con qué pagar: ni gracia, ni seso, ni una pizca de valor. Te echan porque sobras de arriba abajo, y sobrar es lo único que has conseguido.',
    varios: '%M sois una lacra, hijos de puta, de esa gente que no sirve para nada y aun así exige que se la aguante. Aquí no se aguanta a nadie gratis, y no tenéis nada con qué pagar: ni gracia, ni seso, ni una pizca de valor. Os echan porque sobráis de arriba abajo, y sobrar es lo único que habéis conseguido.',
  },
  {
    uno: '%M, lo tuyo no tiene nombre, imbécil, y mira que se ha intentado ponérselo. Eres mediocre en todo lo que tocas, aburres en cuanto abres la boca y das grima cuando intentas caer bien. Aquí nadie te ha leído con ganas ni una sola vez. Lo que tú llamas personalidad es ruido, y al ruido no se le guarda sitio: se le quita.',
    varios: '%M, lo vuestro no tiene nombre, imbéciles, y mira que se ha intentado ponérselo. Sois mediocres en todo lo que tocáis, aburrís en cuanto abrís la boca y dais grima cuando intentáis caer bien. Aquí nadie os ha leído con ganas ni una sola vez. Lo que vosotros llamáis personalidad es ruido, y al ruido no se le guarda sitio: se le quita.',
  },
  {
    uno: '%M eres prescindible, cabrón, de lo más prescindible que ha pisado este grupo. Tu ausencia no la va a notar nadie, y tu presencia solo la notaba quien tenía la mala suerte de leerte. No aportas, no sumas y no vales. Te echan porque mantenerte era un favor, y aquí se acabaron los favores para quien no los merece.',
    varios: '%M sois prescindibles, cabrones, de lo más prescindible que ha pisado este grupo. Vuestra ausencia no la va a notar nadie, y vuestra presencia solo la notaba quien tenía la mala suerte de leeros. No aportáis, no sumáis y no valéis. Os echan porque manteneros era un favor, y aquí se acabaron los favores para quien no los merece.',
  },
  {
    uno: '%M, te crees importante, comemierda, y eres la única persona del grupo que se lo cree. Hablas con unos aires que no te ha dado nadie, opinas de todo sin saber de nada y te ofendes cuando no te hacen caso, que es siempre. Tanto ego para tan poca cosa da hasta risa, pero risa de la mala. Se acabó el teatro: a la calle, que el escenario nunca fue tuyo.',
    varios: '%M, os creéis importantes, comemierdas, y sois la única gente del grupo que se lo cree. Habláis con unos aires que no os ha dado nadie, opináis de todo sin saber de nada y os ofendéis cuando no os hacen caso, que es siempre. Tanto ego para tan poca cosa da hasta risa, pero risa de la mala. Se acabó el teatro: a la calle, que el escenario nunca fue vuestro.',
  },
  {
    uno: '%M, mendigas atención, gilipoyas, y no te llega ni la de quien te lee por error. Cada cosa que escribes pide a gritos que alguien te mire, y nadie te mira, porque no hay nada que ver. Confundes estar con importar y molestar con existir, y nadie se ha molestado en sacarte del error. Aquí ya no se reparte limosna: ni atención, ni paciencia, ni sitio.',
    varios: '%M, mendigáis atención, gilipoyas, y no os llega ni la de quien os lee por error. Cada cosa que escribís pide a gritos que alguien os mire, y nadie os mira, porque no hay nada que ver. Confundís estar con importar y molestar con existir, y nadie se ha molestado en sacaros del error. Aquí ya no se reparte limosna: ni atención, ni paciencia, ni sitio.',
  },
  {
    uno: '%M eres veneno, hijo de puta, y el veneno no se guarda en casa. Todo lo que te rodea se pudre un poco: el ambiente, las ganas y hasta la paciencia de la gente más tranquila. No aportas nada bueno y encima restas lo que traen los demás. Te echan y el grupo deja de envenenarse, y va a notar el alivio en cuanto salgas.',
    varios: '%M sois veneno, hijos de puta, y el veneno no se guarda en casa. Todo lo que os rodea se pudre un poco: el ambiente, las ganas y hasta la paciencia de la gente más tranquila. No aportáis nada bueno y encima restáis lo que traen los demás. Os echan y el grupo deja de envenenarse, y va a notar el alivio en cuanto salgáis.',
  },
  {
    uno: '%M no tienes nada, subnormal: ni gracia, ni luces, ni dignidad, ni una sola cualidad que justifique que alguien te aguante. Eres el vacío con nombre y número de teléfono. Ninguna lista necesita tanto vacío, así que hoy se vacía por ti. Nadie va a pedir que vuelvas, y si lo pides tú, la respuesta ya la sabes.',
    varios: '%M no tenéis nada, subnormales: ni gracia, ni luces, ni dignidad, ni una sola cualidad que justifique que alguien os aguante. Sois el vacío con nombre y número de teléfono. Ninguna lista necesita tanto vacío, así que hoy se vacía por vosotros. Nadie va a pedir que volváis, y si lo pedís vosotros, la respuesta ya la sabéis.',
  },
  {
    uno: '%M, eres falsedad con patas, hipócrita de mierda. Sonríes a quien te conviene, sueltas el veneno cuando no te ven y luego vas de buena gente. Buena gente no eres ni en sueños: eres de lo más rastrero que ha pasado por esta lista. A una persona así no se le da otra oportunidad; se le enseña la salida y se le cierra el chat en la cara.',
    varios: '%M, sois falsedad con patas, hipócritas de mierda. Sonreís a quien os conviene, soltáis el veneno cuando no os ven y luego vais de buena gente. Buena gente no sois ni en sueños: sois de lo más rastrero que ha pasado por esta lista. A gente así no se le da otra oportunidad; se le enseña la salida y se le cierra el chat en la cara.',
  },
  {
    uno: '%M, eres una sanguijuela, cabrón, y a este grupo ya no le queda nada que chuparle. Pides, coges y desapareces, y lo único que devuelves es mal ambiente. Ni una palabra tuya le ha alegrado el día a nadie. Gente que vive de los demás hay en todas partes, pero muy poca con tanto descaro. Se acabó la barra libre.',
    varios: '%M, sois unas sanguijuelas, cabrones, y a este grupo ya no le queda nada que chuparle. Pedís, cogéis y desaparecéis, y lo único que devolvéis es mal ambiente. Ni una palabra vuestra le ha alegrado el día a nadie. Gente que vive de los demás hay en todas partes, pero muy poca con tanto descaro. Se acabó la barra libre.',
  },
  {
    uno: '%M, tu mediocridad es de manual, subnormal: se te olvida antes de terminar de leerte. Ni siquiera llegas a lo peor del grupo, porque para eso hace falta personalidad y tú no tienes ni una pizca. Todo en ti es gris, y eres una persona que no deja huella ni cuando la echan. Mírala bien, gente, que mañana nadie va a recordar esta cara.',
    varios: '%M, vuestra mediocridad es de manual, subnormales: se os olvida antes de terminar de leeros. Ni siquiera llegáis a lo peor del grupo, porque para eso hace falta personalidad y vosotros no tenéis ni una pizca. Todo en vosotros es gris, y sois gente que no deja huella ni cuando la echan. Miradla bien, que mañana nadie va a recordar estas caras.',
  },
  {
    uno: '%M eres un asco de persona, imbécil, y no hace falta que hagas nada para demostrarlo: basta con mirarte. No tienes valor, no tienes gracia y no tienes nada que ofrecer que no sea mal rollo. El grupo ha tenido demasiada paciencia contigo, y se ha agotado. Lárgate y no mires atrás, que aquí nadie te va a mirar a ti.',
    varios: '%M sois un asco de personas, imbéciles, y no hace falta que hagáis nada para demostrarlo: basta con miraros. No tenéis valor, no tenéis gracia y no tenéis nada que ofrecer que no sea mal rollo. El grupo ha tenido demasiada paciencia con vosotros, y se ha agotado. Largaos y no miréis atrás, que aquí nadie os va a mirar a vosotros.',
  },
  {
    uno: '%M sobras, hijo de puta. Sobras en las conversaciones, sobras en la lista y sobras en cualquier sitio donde haya gente que valga algo. No hay forma de encajarte, porque no hay nada en ti que encaje con nada. El grupo no va a seguir haciéndote hueco, y hoy el hueco se cierra contigo fuera.',
    varios: '%M sobráis, hijos de puta. Sobráis en las conversaciones, sobráis en la lista y sobráis en cualquier sitio donde haya gente que valga algo. No hay forma de encajaros, porque no hay nada en vosotros que encaje con nada. El grupo no va a seguir haciéndoos hueco, y hoy el hueco se cierra con vosotros fuera.',
  },
  {
    uno: '%M eres inútil hasta decir basta, retrasado. Inútil para hablar, inútil para escuchar e inútil hasta para estar sin estorbar. No hay nada que hagas bien, y lo poco que haces lo haces mal. Te echan porque aquí no hay hueco para gente que no sirve, y tú no sirves ni de ejemplo de lo que no hay que ser.',
    varios: '%M sois inútiles hasta decir basta, retrasados. Inútiles para hablar, inútiles para escuchar e inútiles hasta para estar sin estorbar. No hay nada que hagáis bien, y lo poco que hacéis lo hacéis mal. Os echan porque aquí no hay hueco para gente que no sirve, y vosotros no servís ni de ejemplo de lo que no hay que ser.',
  },
  {
    uno: '%M eres repugnante, puta, y lo eres sin esforzarte. Repugnante por dentro, repugnante por fuera y repugnante en cada palabra que sueltas. Nadie aquí quiere tener cerca a alguien así, y el grupo por fin se atreve a decirlo en voz alta. Vete, y llévate el asco contigo, que aquí no lo quiere nadie.',
    varios: '%M sois repugnantes, putas, y lo sois sin esforzaros. Repugnantes por dentro, repugnantes por fuera y repugnantes en cada palabra que soltáis. Nadie aquí quiere tener cerca a gente así, y el grupo por fin se atreve a decirlo en voz alta. Idos, y llevaos el asco con vosotros, que aquí no lo quiere nadie.',
  },
  {
    uno: '%M no eres nadie, gilipoyas, y no lo vas a ser nunca. Ni aquí, ni fuera, ni en ningún grupo que tenga un mínimo de nivel. Eres un cero que se cree uno, y la diferencia la ve todo el mundo menos tú. Hoy la ve también la lista de miembros, que deja de contarte. Ya está: aquí ya no existes.',
    varios: '%M no sois nadie, gilipoyas, y no lo vais a ser nunca. Ni aquí, ni fuera, ni en ningún grupo que tenga un mínimo de nivel. Sois ceros que se creen algo, y la diferencia la ve todo el mundo menos vosotros. Hoy la ve también la lista de miembros, que deja de contaros. Ya está: aquí ya no existís.',
  },
  {
    uno: '%M, aburres, pedazo de mierda, y aburrir a un grupo entero tiene su mérito. Cada mensaje tuyo es un bostezo, cada opinión una pérdida de tiempo y cada intento de hacer gracia una pena. Nadie te contesta por gusto: te contestan por educación, y la educación tiene un límite. Lo has encontrado. Fuera, y llévate el sopor contigo.',
    varios: '%M, aburrís, pedazos de mierda, y aburrir a un grupo entero tiene su mérito. Cada mensaje vuestro es un bostezo, cada opinión una pérdida de tiempo y cada intento de hacer gracia una pena. Nadie os contesta por gusto: os contestan por educación, y la educación tiene un límite. Lo habéis encontrado. Fuera, y llevaos el sopor con vosotros.',
  },
  {
    uno: '%M, eres cobarde hasta para caer mal, imbécil: ni para eso tienes valor. Tiras la piedra y escondes la mano, hablas por la espalda y callas de cara, y te crees que nadie lo nota. Lo nota todo el mundo. Una persona sin agallas no le sirve a ningún grupo, y a este le sobra. Ahí tienes la salida, y esta vez no hace falta que te escondas.',
    varios: '%M, sois cobardes hasta para caer mal, imbéciles: ni para eso tenéis valor. Tiráis la piedra y escondéis la mano, habláis por la espalda y calláis de cara, y os creéis que nadie lo nota. Lo nota todo el mundo. Gente sin agallas no le sirve a ningún grupo, y a este le sobra. Ahí tenéis la salida, y esta vez no hace falta que os escondáis.',
  },
  {
    uno: '%M, tienes la gracia en negativo, payaso: cada chiste tuyo le quita las ganas de reír a alguien. Lo intentas una y otra vez, y la única risa que sacas es la de la gente riéndose de ti a tus espaldas. Das cringe, das grima y das la vergüenza que a ti te falta. El grupo se ha cansado de reírse de ti en silencio, así que lo dice en voz alta: fuera.',
    varios: '%M, tenéis la gracia en negativo, payasos: cada chiste vuestro le quita las ganas de reír a alguien. Lo intentáis una y otra vez, y la única risa que sacáis es la de la gente riéndose de vosotros a vuestras espaldas. Dais cringe, dais grima y dais la vergüenza que a vosotros os falta. El grupo se ha cansado de reírse de vosotros en silencio, así que lo dice en voz alta: fuera.',
  },
  {
    uno: '%M, la envidia te come por dentro, rata, y se lee en todo lo que escribes. No soportas que a otra gente le vaya mejor, y en lugar de mejorar tú, te dedicas a soltar bilis. Ese es todo tu talento: amargarte y amargar. Una persona tan mezquina no cabe en ningún grupo decente, y este acaba de decidir serlo. Amárgate fuera, que aquí ya no te queda público.',
    varios: '%M, la envidia os come por dentro, ratas, y se lee en todo lo que escribís. No soportáis que a otra gente le vaya mejor, y en lugar de mejorar vosotros, os dedicáis a soltar bilis. Ese es todo vuestro talento: amargaros y amargar. Gente tan mezquina no cabe en ningún grupo decente, y este acaba de decidir serlo. Amargaos fuera, que aquí ya no os queda público.',
  },
  {
    uno: '%M eres un puto chiste, hijo de puta, pero de los que no hacen gracia: de los que se cuentan para reírse de quien los protagoniza. Eres la vergüenza del grupo, el ejemplo de lo que nadie quiere ser y la razón de que esto vaya peor. Te echan para que el chiste se acabe, y nadie lo va a contar otra vez.',
    varios: '%M sois un puto chiste, hijos de puta, pero de los que no hacen gracia: de los que se cuentan para reírse de quien los protagoniza. Sois la vergüenza del grupo, el ejemplo de lo que nadie quiere ser y la razón de que esto vaya peor. Os echan para que el chiste se acabe, y nadie lo va a contar otra vez.',
  },
  {
    uno: '%M eres basura humana, gilipoyas, y no hay otra forma de describirlo. Lo que dices no vale, lo que piensas no importa y lo que eres da asco. El grupo no está para reciclar a nadie, y tú no tienes arreglo. Sal, y que la puerta se cierre bien detrás de ti para que no vuelvas a colarte.',
    varios: '%M sois basura humana, gilipoyas, y no hay otra forma de describirlo. Lo que decís no vale, lo que pensáis no importa y lo que sois da asco. El grupo no está para reciclar a nadie, y vosotros no tenéis arreglo. Salid, y que la puerta se cierre bien detrás de vosotros para que no volváis a colaros.',
  },
  {
    uno: '%M no tienes sangre, cabrón, ni carácter, ni opinión propia, ni nada que te haga ser alguien. Eres el eco de lo que dicen los demás, y un eco no hace falta en ningún grupo. Das pena de lo poco que eres. Te echan porque aquí se queda la gente que es algo, y tú no eres nada.',
    varios: '%M no tenéis sangre, cabrones, ni carácter, ni opinión propia, ni nada que os haga ser alguien. Sois el eco de lo que dicen los demás, y un eco no hace falta en ningún grupo. Dais pena de lo poco que sois. Os echan porque aquí se queda la gente que es algo, y vosotros no sois nada.',
  },
  {
    uno: '%M, eres un NPC con conexión a internet, zombi. Repites lo que dicen otros, te ríes cuando se ríen los demás y no has tenido una idea propia en tu vida. Si mañana te cambiaran por otra cuenta cualquiera, el grupo no notaría la diferencia, y eso lo dice todo de ti. Un relleno así no se guarda: se borra y se pasa a lo siguiente.',
    varios: '%M, sois NPCs con conexión a internet, zombis. Repetís lo que dicen otros, os reís cuando se ríen los demás y no habéis tenido una idea propia en vuestra vida. Si mañana os cambiaran por otras cuentas cualesquiera, el grupo no notaría la diferencia, y eso lo dice todo de vosotros. Un relleno así no se guarda: se borra y se pasa a lo siguiente.',
  },
  {
    uno: '%M eres el peor miembro que ha tenido este grupo, retrasado, y no es una exageración. No hay nadie que aporte menos, que valga menos ni que dé más asco que tú. Lo has conseguido sin intentarlo, que es lo más patético. Hoy se acaba el récord, y se acaba contigo en la calle.',
    varios: '%M sois los peores miembros que ha tenido este grupo, retrasados, y no es una exageración. No hay nadie que aporte menos, que valga menos ni que dé más asco que vosotros. Lo habéis conseguido sin intentarlo, que es lo más patético. Hoy se acaba el récord, y se acaba con vosotros en la calle.',
  },
  {
    uno: '%M nadie te soporta, puta, y no es una forma de hablar. Nadie te soporta cuando escribes, nadie te soporta cuando callas y nadie te va a soportar en ningún otro sitio. Eres insoportable por naturaleza, y eso no se arregla. El grupo ha decidido dejar de intentarlo y quitarte de en medio.',
    varios: '%M nadie os soporta, putas, y no es una forma de hablar. Nadie os soporta cuando escribís, nadie os soporta cuando calláis y nadie os va a soportar en ningún otro sitio. Sois insoportables por naturaleza, y eso no se arregla. El grupo ha decidido dejar de intentarlo y quitaros de en medio.',
  },
  {
    uno: '%M das ganas de vomitar, gilipoyas, y no es fácil llegar a eso. Hace falta ser muy poca cosa y dar mucho asco a la vez, y tú lo has logrado sin despeinarte. El grupo tiene el estómago revuelto desde que estás dentro, y hoy por fin se queda en paz.',
    varios: '%M dais ganas de vomitar, gilipoyas, y no es fácil llegar a eso. Hace falta ser muy poca cosa y dar mucho asco a la vez, y vosotros lo habéis logrado sin despeinaros. El grupo tiene el estómago revuelto desde que estáis dentro, y hoy por fin se queda en paz.',
  },
  {
    uno: '%M, eres una persona miserable, hijo de puta, y no por lo que tienes, sino por lo que eres. Ruin con quien se descuida, cobarde con quien te planta cara e insoportable con todo el resto. No hay una virtud en ti que alguien haya podido encontrar, y se ha buscado. Una miseria así no se corrige con paciencia: se corta de raíz, que es lo que toca.',
    varios: '%M, sois gente miserable, hijos de puta, y no por lo que tenéis, sino por lo que sois. Ruines con quien se descuida, cobardes con quien os planta cara e insoportables con todo el resto. No hay una virtud en vosotros que alguien haya podido encontrar, y se ha buscado. Una miseria así no se corrige con paciencia: se corta de raíz, que es lo que toca.',
  },
  {
    uno: '%M eres despreciable, cabrón, y lo sabes. No hay una sola persona aquí que te tenga aprecio, ni una que te vaya a defender, ni una que lamente verte salir. Eso no pasa por casualidad: pasa porque te lo has ganado siendo como eres. Y siendo así, aquí sobras. Adiós, y que no se te ocurra volver.',
    varios: '%M sois despreciables, cabrones, y lo sabéis. No hay una sola persona aquí que os tenga aprecio, ni una que os vaya a defender, ni una que lamente veros salir. Eso no pasa por casualidad: pasa porque os lo habéis ganado siendo como sois. Y siendo así, aquí sobráis. Adiós, y que no se os ocurra volver.',
  },
  {
    uno: '%M, vives de lamer culos, imbécil, y ni eso haces bien. Le das la razón a quien manda, cambias de opinión según quién te mire y te arrastras por una palmada en la espalda que nunca llega. Dignidad no tienes, y la poca que te quedaba la has gastado haciendo la pelota. Arrástrate hasta la salida, que aquí ya no queda nadie a quien hacérsela.',
    varios: '%M, vivís de lamer culos, imbéciles, y ni eso hacéis bien. Le dais la razón a quien manda, cambiáis de opinión según quién os mire y os arrastráis por una palmada en la espalda que nunca llega. Dignidad no tenéis, y la poca que os quedaba la habéis gastado haciendo la pelota. Arrastraos hasta la salida, que aquí ya no queda nadie a quien hacérsela.',
  },
  {
    uno: '%M, todo lo que tocas lo pudres, puta. Entras en una conversación buena y la conviertes en bronca, entras en una tranquila y la conviertes en drama. No sabes estar sin enrarecer el ambiente, porque es lo único que se te da bien. Personas tóxicas hay muchas, pero pocas lo son con tanta dedicación como tú. Ve a pudrir otro sitio, que este ya no te lo deja.',
    varios: '%M, todo lo que tocáis lo pudrís, putas. Entráis en una conversación buena y la convertís en bronca, entráis en una tranquila y la convertís en drama. No sabéis estar sin enrarecer el ambiente, porque es lo único que se os da bien. Personas tóxicas hay muchas, pero pocas lo son con tanta dedicación como vosotros. Id a pudrir otro sitio, que este ya no os lo deja.',
  },
  {
    uno: '%M, eres una decepción constante, subnormal, de esas que ya no sorprenden a nadie. Se esperaba poco de ti y aun así has conseguido dar menos. Cada vez que parecía que no podías caer más bajo, encontrabas la forma. Eso no es mala suerte: es lo que eres. Aquí ya no se espera nada de ti, y menos que te quedes.',
    varios: '%M, sois una decepción constante, subnormales, de esas que ya no sorprenden a nadie. Se esperaba poco de vosotros y aun así habéis conseguido dar menos. Cada vez que parecía que no podíais caer más bajo, encontrabais la forma. Eso no es mala suerte: es lo que sois. Aquí ya no se espera nada de vosotros, y menos que os quedéis.',
  },
  {
    uno: '%M eres una desgracia, puta, y las desgracias no se invitan a quedarse. No traes nada bueno, no dejas nada bueno y no eres nada bueno. Lo mejor que puedes hacer por este grupo es justo lo que toca ahora: irte. Y lo mejor que puede hacer el grupo es olvidarte, cosa que va a tardar minutos.',
    varios: '%M sois una desgracia, putas, y las desgracias no se invitan a quedarse. No traéis nada bueno, no dejáis nada bueno y no sois nada bueno. Lo mejor que podéis hacer por este grupo es justo lo que toca ahora: iros. Y lo mejor que puede hacer el grupo es olvidaros, cosa que va a tardar minutos.',
  },
  {
    uno: '%M no mereces este grupo, gilipoyas, ni este ni ninguno. No mereces la paciencia que se te ha tenido, ni el sitio que ocupabas, ni el tiempo que alguien perdió leyéndote. Eres poca cosa y das mucho asco, que es la peor combinación posible. Te echan para que no tengas ni una cosa más que no mereces.',
    varios: '%M no merecéis este grupo, gilipoyas, ni este ni ninguno. No merecéis la paciencia que se os ha tenido, ni el sitio que ocupabais, ni el tiempo que alguien perdió leyéndoos. Sois poca cosa y dais mucho asco, que es la peor combinación posible. Os echan para que no tengáis ni una cosa más que no merecéis.',
  },
  {
    uno: '%M eres un caso perdido, hijo de puta. No hay forma de arreglarte, de mejorarte ni de hacer que valgas algo, porque no hay nada debajo que rescatar. El grupo ya lo ha intentado lo suficiente, y no vale la pena seguir. Te echan porque hay causas perdidas que no merecen ni el esfuerzo, y tú eres la más perdida de todas.',
    varios: '%M sois casos perdidos, hijos de puta. No hay forma de arreglaros, de mejoraros ni de hacer que valgáis algo, porque no hay nada debajo que rescatar. El grupo ya lo ha intentado lo suficiente, y no vale la pena seguir. Os echan porque hay causas perdidas que no merecen ni el esfuerzo, y vosotros sois las más perdidas de todas.',
  },
  {
    uno: '%M, eres pesadez en estado puro, cabrón. Insistes cuando nadie quiere, repites lo que ya nadie escucha y te pegas a cualquier conversación ajena hasta que se muere. La gente se calla cuando apareces, y no es respeto: es agotamiento. Ese silencio que dejas al entrar es lo más cerca que vas a estar de caer bien, así que llévatelo puesto.',
    varios: '%M, sois pesadez en estado puro, cabrones. Insistís cuando nadie quiere, repetís lo que ya nadie escucha y os pegáis a cualquier conversación ajena hasta que se muere. La gente se calla cuando aparecéis, y no es respeto: es agotamiento. Ese silencio que dejáis al entrar es lo más cerca que vais a estar de caer bien, así que lleváoslo puesto.',
  },
  {
    uno: '%M, eres una piltrafa, desgraciado, y ni siquiera te das cuenta, que es lo más triste. Vas por la vida con la cabeza muy alta y sin nada dentro que lo justifique. Opinas sin pensar, discutes sin razón y pierdes sin enterarte. Lo que queda de ti al final de cada conversación da lástima, y al grupo ya no le quedan ganas de recoger los pedazos. Fuera.',
    varios: '%M, sois unas piltrafas, desgraciados, y ni siquiera os dais cuenta, que es lo más triste. Vais por la vida con la cabeza muy alta y sin nada dentro que lo justifique. Opináis sin pensar, discutís sin razón y perdéis sin enteraros. Lo que queda de vosotros al final de cada conversación da lástima, y al grupo ya no le quedan ganas de recoger los pedazos. Fuera.',
  },
  {
    uno: '%M, eres fantasma hasta la médula, farsante: presumes de lo que no tienes y alardeas de lo que nunca has hecho. Te inventas una vida que nadie se cree y te molesta que nadie te aplauda. Aquí se te caló desde el primer día, aunque por educación nadie lo dijera. La educación se ha terminado, y el personaje también: recoge el disfraz y vete.',
    varios: '%M, sois fantasmas hasta la médula, farsantes: presumís de lo que no tenéis y alardeáis de lo que nunca habéis hecho. Os inventáis una vida que nadie se cree y os molesta que nadie os aplauda. Aquí se os caló desde el primer día, aunque por educación nadie lo dijera. La educación se ha terminado, y el personaje también: recoged el disfraz e idos.',
  },
  {
    uno: '%M, siempre vas de víctima, cabrón, y ya no cuela. Todo te pasa a ti, todo el mundo te trata mal y la culpa nunca es tuya. La culpa es tuya, y siempre lo ha sido: de lo que dices, de cómo lo dices y de que no haya nadie dispuesto a defenderte. Llora todo lo que quieras, pero llora fuera, que aquí nadie te va a pasar un pañuelo.',
    varios: '%M, siempre vais de víctimas, cabrones, y ya no cuela. Todo os pasa a vosotros, todo el mundo os trata mal y la culpa nunca es vuestra. La culpa es vuestra, y siempre lo ha sido: de lo que decís, de cómo lo decís y de que no haya nadie dispuesto a defenderos. Llorad todo lo que queráis, pero llorad fuera, que aquí nadie os va a pasar un pañuelo.',
  },
  {
    uno: '%M, eres caradura de nivel profesional, comemierda. Exiges un respeto que no te has ganado, reclamas un sitio que nadie te ha dado y encima pones condiciones. Lo que te sobra de jeta te falta de todo lo demás: de gracia, de cabeza y de vergüenza. Con ese descaro vete buscando otro grupo que te aguante, porque este se ha cansado de verte la cara.',
    varios: '%M, sois caraduras de nivel profesional, comemierdas. Exigís un respeto que no os habéis ganado, reclamáis un sitio que nadie os ha dado y encima ponéis condiciones. Lo que os sobra de jeta os falta de todo lo demás: de gracia, de cabeza y de vergüenza. Con ese descaro id buscando otro grupo que os aguante, porque este se ha cansado de veros la cara.',
  },
  {
    uno: '%M, te quejas de todo, imbécil, y nadie te ha preguntado nunca. De lo que se dice, de lo que se calla, de quien escribe y de quien no. Tanta queja en alguien que no ha aportado nada en su vida tiene delito. Ya tienes un motivo de verdad para quejarte, el primero de todos: te vas a la calle. Quéjate allí, que aquí ya no te escucha nadie.',
    varios: '%M, os quejáis de todo, imbéciles, y nadie os ha preguntado nunca. De lo que se dice, de lo que se calla, de quien escribe y de quien no. Tanta queja en gente que no ha aportado nada en su vida tiene delito. Ya tenéis un motivo de verdad para quejaros, el primero de todos: os vais a la calle. Quejaos allí, que aquí ya no os escucha nadie.',
  },
  {
    uno: '%M, hablas de más y piensas de menos, gilipoyas, y la mezcla no perdona. Sueltas lo primero que se te pasa por la cabeza, que nunca es mucho, y luego te sorprende que nadie te tome en serio. Nadie te toma en serio. Ni aquí ni en ningún sitio donde hayas abierto la boca. Ciérrala de una vez, y ciérrala lejos de este grupo.',
    varios: '%M, habláis de más y pensáis de menos, gilipoyas, y la mezcla no perdona. Soltáis lo primero que se os pasa por la cabeza, que nunca es mucho, y luego os sorprende que nadie os tome en serio. Nadie os toma en serio. Ni aquí ni en ningún sitio donde hayáis abierto la boca. Cerradla de una vez, y cerradla lejos de este grupo.',
  },
  {
    uno: '%M, tienes la madurez de un crío castigado, subnormal, y el berrinche siempre a mano. Te enfadas por nada, te picas por menos y respondes con pataletas que dan vergüenza ajena. A estas alturas ya deberías saber estar entre gente adulta, y no sabes. Pues a la calle, que aquí no se cambian pañales.',
    varios: '%M, tenéis la madurez de críos castigados, subnormales, y el berrinche siempre a mano. Os enfadáis por nada, os picáis por menos y respondéis con pataletas que dan vergüenza ajena. A estas alturas ya deberíais saber estar entre gente adulta, y no sabéis. Pues a la calle, que aquí no se cambian pañales.',
  },
  {
    uno: '%M, eres cutre en todo, pedazo de mierda: en lo que dices, en cómo lo dices y en lo poco que te esfuerzas por disimularlo. No hay nada en ti hecho con ganas: ni una frase, ni una idea, ni una broma que no dé pena. Ni con esfuerzo llegarías a mediocre, y esfuerzo no has puesto nunca. El grupo no pierde nada contigo fuera, y gana no tener que leerte más.',
    varios: '%M, sois cutres en todo, pedazos de mierda: en lo que decís, en cómo lo decís y en lo poco que os esforzáis por disimularlo. No hay nada en vosotros hecho con ganas: ni una frase, ni una idea, ni una broma que no dé pena. Ni con esfuerzo llegaríais a mediocres, y esfuerzo no habéis puesto nunca. El grupo no pierde nada con vosotros fuera, y gana no tener que leeros más.',
  },
  {
    uno: '%M, apestas a desesperación, pringado. Quieres caer bien con tantas ganas que espantas a quien tienes delante, y cuanto más lo intentas, peor te sale. Nadie aquí te debe cariño, y nadie te lo va a dar por pena. Deja de suplicar, que da grima, o suplica fuera del grupo, donde nadie tenga que verlo.',
    varios: '%M, apestáis a desesperación, pringados. Queréis caer bien con tantas ganas que espantáis a quien tenéis delante, y cuanto más lo intentáis, peor os sale. Nadie aquí os debe cariño, y nadie os lo va a dar por pena. Dejad de suplicar, que da grima, o suplicad fuera del grupo, donde nadie tenga que verlo.',
  },
  {
    uno: '%M, mientes más que hablas, hijo de puta, y hablas mucho. Cada historia tuya cambia según quién la escuche, cada promesa se queda en nada y cada excusa es peor que la anterior. Ya nadie se cree una palabra de lo que dices, y una persona en la que nadie confía no pinta nada en un grupo. Ahí va una verdad, para variar: no vuelves.',
    varios: '%M, mentís más que habláis, hijos de puta, y habláis mucho. Cada historia vuestra cambia según quién la escuche, cada promesa se queda en nada y cada excusa es peor que la anterior. Ya nadie se cree una palabra de lo que decís, y gente en la que nadie confía no pinta nada en un grupo. Ahí va una verdad, para variar: no volvéis.',
  },
  {
    uno: '%M, si esto se votara, saldrías por unanimidad, mamarracho, y sin una sola abstención. No hace falta votarlo: basta con ver cómo se apaga el chat cuando escribes y cómo se anima en cuanto desapareces. Has conseguido poner de acuerdo a un grupo entero, que no es poco, aunque sea contra ti. Enhorabuena: es lo único que has logrado aquí.',
    varios: '%M, si esto se votara, saldríais por unanimidad, mamarrachos, y sin una sola abstención. No hace falta votarlo: basta con ver cómo se apaga el chat cuando escribís y cómo se anima en cuanto desaparecéis. Habéis conseguido poner de acuerdo a un grupo entero, que no es poco, aunque sea contra vosotros. Enhorabuena: es lo único que habéis logrado aquí.',
  },
];

module.exports = { AVISOS_KICK };
