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
    uno: '%M das vergüenza ajena, retrasado, y la das sin esfuerzo, solo con ser como eres. No hay nada en ti que se pueda defender, nada que se salve y nada que alguien vaya a echar en falta. El grupo se cansa de cargar con tanta vergüenza, y hoy la deja en la puerta contigo.',
    varios: '%M dais vergüenza ajena, retrasados, y la dais sin esfuerzo, solo con ser como sois. No hay nada en vosotros que se pueda defender, nada que se salve y nada que alguien vaya a echar en falta. El grupo se cansa de cargar con tanta vergüenza, y hoy la deja en la puerta con vosotros.',
  },
  {
    uno: '%M eres prescindible, cabrón, de lo más prescindible que ha pisado este grupo. Tu ausencia no la va a notar nadie, y tu presencia solo la notaba quien tenía la mala suerte de leerte. No aportas, no sumas y no vales. Te echan porque mantenerte era un favor, y aquí se acabaron los favores para quien no los merece.',
    varios: '%M sois prescindibles, cabrones, de lo más prescindible que ha pisado este grupo. Vuestra ausencia no la va a notar nadie, y vuestra presencia solo la notaba quien tenía la mala suerte de leeros. No aportáis, no sumáis y no valéis. Os echan porque manteneros era un favor, y aquí se acabaron los favores para quien no los merece.',
  },
  {
    uno: '%M eres un desperdicio, puta, un desperdicio de sitio, de tiempo y de paciencia. Todo lo que se te da lo conviertes en nada, porque es lo único que sabes hacer. No hay más que rascar: por mucho que se busque, debajo de ti no aparece nada. Hoy se deja de buscar y se te saca.',
    varios: '%M sois un desperdicio, putas, un desperdicio de sitio, de tiempo y de paciencia. Todo lo que se os da lo convertís en nada, porque es lo único que sabéis hacer. No hay más que rascar: por mucho que se busque, debajo de vosotros no aparece nada. Hoy se deja de buscar y se os saca.',
  },
  {
    uno: '%M das lástima, imbécil, y la lástima ya no da para más. Te das una importancia que no tienes, presumes de una gracia que no hace reír a nadie y esperas un cariño que nadie te da. Hoy se te acaba el cuento, y el grupo cierra la puerta detrás de ti.',
    varios: '%M dais lástima, imbéciles, y la lástima ya no da para más. Os dais una importancia que no tenéis, presumís de una gracia que no hace reír a nadie y esperáis un cariño que nadie os da. Hoy se os acaba el cuento, y el grupo cierra la puerta detrás de vosotros.',
  },
  {
    uno: '%M eres veneno, hijo de puta, y el veneno no se guarda en casa. Todo lo que te rodea se pudre un poco: el ambiente, las ganas y hasta la paciencia de la gente más tranquila. No aportas nada bueno y encima restas lo que traen los demás. Te echan y el grupo deja de envenenarse, y va a notar el alivio en cuanto salgas.',
    varios: '%M sois veneno, hijos de puta, y el veneno no se guarda en casa. Todo lo que os rodea se pudre un poco: el ambiente, las ganas y hasta la paciencia de la gente más tranquila. No aportáis nada bueno y encima restáis lo que traen los demás. Os echan y el grupo deja de envenenarse, y va a notar el alivio en cuanto salgáis.',
  },
  {
    uno: '%M no tienes nada, subnormal: ni gracia, ni luces, ni dignidad, ni una sola cualidad que justifique que alguien te aguante. Eres el vacío con nombre y número de teléfono. Ninguna lista necesita tanto vacío, y hoy empieza a vaciarla por ti. Nadie va a pedir que vuelvas, y si lo pides tú, la respuesta ya la sabes.',
    varios: '%M no tenéis nada, subnormales: ni gracia, ni luces, ni dignidad, ni una sola cualidad que justifique que alguien os aguante. Sois el vacío con nombre y número de teléfono. Ninguna lista necesita tanto vacío, y hoy empieza a vaciarla por vosotros. Nadie va a pedir que volváis, y si lo pedís vosotros, la respuesta ya la sabéis.',
  },
  {
    uno: '%M eres un lastre, gilipoyas, un peso muerto que el grupo arrastra sin ningún motivo. No empujas, no ayudas, no sumas: solo pesas. Y cuando algo solo pesa, se suelta. Hoy el grupo te suelta, y lo único que va a pasar es que todo va a ir más ligero sin ti colgando.',
    varios: '%M sois un lastre, gilipoyas, un peso muerto que el grupo arrastra sin ningún motivo. No empujáis, no ayudáis, no sumáis: solo pesáis. Y cuando algo solo pesa, se suelta. Hoy el grupo os suelta, y lo único que va a pasar es que todo va a ir más ligero sin vosotros colgando.',
  },
  {
    uno: '%M eres una rata, cabrón, de las que viven a costa de los demás sin dar nada a cambio. No hay una sola cosa buena que decir de ti, y se nota en que nadie la dice. Aquí no se alimenta a nadie gratis, y menos a una rata. Hoy se cierra la despensa y se abre la puerta.',
    varios: '%M sois ratas, cabrones, de las que viven a costa de los demás sin dar nada a cambio. No hay una sola cosa buena que decir de vosotros, y se nota en que nadie la dice. Aquí no se alimenta a nadie gratis, y menos a unas ratas. Hoy se cierra la despensa y se abre la puerta.',
  },
  {
    uno: '%M eres irrelevante, puta. Tan irrelevante que ni siquiera molestas: para molestar hay que importar, y tú no le importas a nadie. Eres un nombre en la lista y nada más, y desde hoy ni eso. El grupo te quita igual que se quita una notificación que nadie quiere leer, sin mirarla dos veces.',
    varios: '%M sois irrelevantes, putas. Tan irrelevantes que ni siquiera molestáis: para molestar hay que importar, y vosotros no le importáis a nadie. Sois nombres en la lista y nada más, y desde hoy ni eso. El grupo os quita igual que se quita una notificación que nadie quiere leer, sin mirarla dos veces.',
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
    uno: '%M eres una carga, cabrón, y nadie quiere cargar contigo. No aportas nada, no mejoras nada y lo único que haces es estar en medio. Estorbas sin hacer nada, que ya es un talento. Hoy el grupo deja de llevarte a cuestas, y te vas a dar cuenta de que fuera tampoco te quiere llevar nadie.',
    varios: '%M sois una carga, cabrones, y nadie quiere cargar con vosotros. No aportáis nada, no mejoráis nada y lo único que hacéis es estar en medio. Estorbáis sin hacer nada, que ya es un talento. Hoy el grupo deja de llevaros a cuestas, y os vais a dar cuenta de que fuera tampoco os quiere llevar nadie.',
  },
  {
    uno: '%M eres de lo peor que se ha visto aquí, imbécil. Ni chispa, ni luces, ni nada que valga la pena. Cuando alguien piense en este grupo, no va a pensar en ti, y si lo hace será para preguntarse qué hacías dentro. Hoy se responde la pregunta: nada. Por eso te vas.',
    varios: '%M sois de lo peor que se ha visto aquí, imbéciles. Ni chispa, ni luces, ni nada que valga la pena. Cuando alguien piense en este grupo, no va a pensar en vosotros, y si lo hace será para preguntarse qué hacíais dentro. Hoy se responde la pregunta: nada. Por eso os vais.',
  },
  {
    uno: '%M eres insufrible, subnormal, de principio a fin. No hay un solo momento en que no lo seas, y eso tiene mérito, aunque sea del malo. El grupo ha hecho lo posible por ignorarte, pero ignorar algo tan pesado cansa. Hoy se deja de ignorar y se te echa, que es mucho más rápido.',
    varios: '%M sois insufribles, subnormales, de principio a fin. No hay un solo momento en que no lo seáis, y eso tiene mérito, aunque sea del malo. El grupo ha hecho lo posible por ignoraros, pero ignorar algo tan pesado cansa. Hoy se deja de ignorar y se os echa, que es mucho más rápido.',
  },
  {
    uno: '%M eres un error con patas, puta, y los errores se corrigen. Alguien te dejó entrar y desde entonces el grupo es un poco peor. No aportas, no caes bien y no sirves para nada que haga falta aquí. Hoy se corrige el error, y el grupo vuelve a ser lo que era antes de que llegaras.',
    varios: '%M sois errores con patas, putas, y los errores se corrigen. Alguien os dejó entrar y desde entonces el grupo es un poco peor. No aportáis, no caéis bien y no servís para nada que haga falta aquí. Hoy se corrige el error, y el grupo vuelve a ser lo que era antes de que llegarais.',
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
    uno: '%M no tienes vida, imbécil, y se nota en todo lo que eres. Ni una chispa, ni una idea, ni un gramo de interés por nada que no seas tú. Eres un vacío que respira, y nadie aquí quiere seguir respirando a tu lado. Hoy te saca para que entre un poco de aire.',
    varios: '%M no tenéis vida, imbéciles, y se nota en todo lo que sois. Ni una chispa, ni una idea, ni un gramo de interés por nada que no seáis vosotros. Sois un vacío que respira, y nadie aquí quiere seguir respirando a vuestro lado. Hoy os saca para que entre un poco de aire.',
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
    uno: '%M no aportas nada, hijo de puta, y nunca lo vas a hacer, porque no tienes nada que aportar. Ni ideas, ni gracia, ni humanidad. Eres una cáscara vacía con un nombre puesto. El grupo no colecciona cáscaras, y hoy tira la tuya a la basura, que es donde tenía que haber estado siempre.',
    varios: '%M no aportáis nada, hijos de puta, y nunca lo vais a hacer, porque no tenéis nada que aportar. Ni ideas, ni gracia, ni humanidad. Sois cáscaras vacías con un nombre puesto. El grupo no colecciona cáscaras, y hoy tira las vuestras a la basura, que es donde tenían que haber estado siempre.',
  },
  {
    uno: '%M eres despreciable, cabrón, y lo sabes. No hay una sola persona aquí que te tenga aprecio, ni una que te vaya a defender, ni una que lamente verte salir. Eso no pasa por casualidad: pasa porque te lo has ganado siendo como eres. Y siendo así, aquí sobras. Adiós, y que no se te ocurra volver.',
    varios: '%M sois despreciables, cabrones, y lo sabéis. No hay una sola persona aquí que os tenga aprecio, ni una que os vaya a defender, ni una que lamente veros salir. Eso no pasa por casualidad: pasa porque os lo habéis ganado siendo como sois. Y siendo así, aquí sobráis. Adiós, y que no se os ocurra volver.',
  },
  {
    uno: '%M eres un estorbo, imbécil, y nada más. No hay nada más que decir de ti, porque no tienes nada más. Estorbas en la lista, estorbas en el chat y estorbas en la cabeza de quien tiene que aguantarte. Hoy el grupo se quita el estorbo de encima y sigue tan tranquilo.',
    varios: '%M sois estorbos, imbéciles, y nada más. No hay nada más que decir de vosotros, porque no tenéis nada más. Estorbáis en la lista, estorbáis en el chat y estorbáis en la cabeza de quien tiene que aguantaros. Hoy el grupo se quita los estorbos de encima y sigue tan tranquilo.',
  },
  {
    uno: '%M eres mierda, subnormal, y la mierda no se queda dentro de casa. No vales, no sirves y no le importas a nadie, y eso ya no lo arregla nadie. El grupo ha aguantado el olor demasiado tiempo por no complicarse. Hoy se complica: te saca a la calle y abre las ventanas.',
    varios: '%M sois mierda, subnormales, y la mierda no se queda dentro de casa. No valéis, no servís y no le importáis a nadie, y eso ya no lo arregla nadie. El grupo ha aguantado el olor demasiado tiempo por no complicarse. Hoy se complica: os saca a la calle y abre las ventanas.',
  },
  {
    uno: '%M haces el ridículo solo con existir, retrasado, y ni te das cuenta. Todo el mundo lo ve menos tú, y eso ya da pena. No tienes nada que ofrecer, nada que decir y nada que merezca un sitio aquí. Te echan para ahorrarte más vergüenza, aunque no tengas la suficiente para notarla.',
    varios: '%M hacéis el ridículo solo con existir, retrasados, y ni os dais cuenta. Todo el mundo lo ve menos vosotros, y eso ya da pena. No tenéis nada que ofrecer, nada que decir y nada que merezca un sitio aquí. Os echan para ahorraros más vergüenza, aunque no tengáis la suficiente para notarla.',
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
    uno: '%M eres una molestia, cabrón, una molestia constante que el grupo ha aguantado de más. No aportas nada, no haces falta y no le caes bien a nadie, y aun así seguías aquí como si tuvieras derecho. No lo tienes. Nunca lo tuviste. Hoy se te quita el sitio que no te ganaste y se le da a quien lo valga.',
    varios: '%M sois una molestia, cabrones, una molestia constante que el grupo ha aguantado de más. No aportáis nada, no hacéis falta y no le caéis bien a nadie, y aun así seguíais aquí como si tuvierais derecho. No lo tenéis. Nunca lo tuvisteis. Hoy se os quita el sitio que no os ganasteis y se le da a quien lo valga.',
  },
  {
    uno: '%M eres un puto desastre, imbécil, de esos que no tienen arreglo ni ganas de tenerlo. Das asco, das pena y das vergüenza, y todo a la vez. Bastante se ha aguantado ya un desastre así, y hoy se suelta. Vete, y que te aguante quien quiera, porque aquí no queda nadie con ganas.',
    varios: '%M sois un puto desastre, imbéciles, de esos que no tienen arreglo ni ganas de tenerlo. Dais asco, dais pena y dais vergüenza, y todo a la vez. Bastante se ha aguantado ya un desastre así, y hoy se suelta. Idos, y que os aguante quien quiera, porque aquí no queda nadie con ganas.',
  },
];

module.exports = { AVISOS_KICK };
