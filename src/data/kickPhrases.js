// Avisos de !kick. Salen en el grupo ANTES de echar, para que lo vean.
//
// No es un comunicado. Es un ataque directo que dice POR QUÉ se le echa: por
// inútil, por no aportar nada, por parásito, por dar el coñazo. Lo pidió el
// dueño (23 oct): «más ataques directos y coherentes», y «sitio» en vez de
// «plaza». Nada de metáforas que haya que descifrar: el motivo, claro y en
// la cara. El taco va dentro. pickFresh las reparte por grupo.
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
    uno: '%M te echan por inútil, y no hace falta adornarlo, gilipoyas. Desde que entraste no has aportado ni una idea, ni una risa, ni una mano.\nOcupabas sitio y nada más. Un sitio que hoy vuelve a quien sepa usarlo. Fuera.',
    varios: '%M os echan por inútiles, y no hace falta adornarlo, gilipoyas. Desde que entrasteis no habéis aportado ni una idea, ni una risa, ni una mano.\nOcupabais sitio y nada más. Un sitio que hoy vuelve a quien sepa usarlo. Fuera.',
  },
  {
    uno: '%M no te echan por lo que dijiste, puto inútil. Te echan porque nunca dijiste nada que valiera la pena.\nNi un mensaje que alguien quisiera contestar. Cero aporte, cero gracia, cero cabeza. El grupo se cansó de cargar contigo. A la calle.',
    varios: '%M no os echan por lo que dijisteis, putos inútiles. Os echan porque nunca dijisteis nada que valiera la pena.\nNi un mensaje que alguien quisiera contestar. Cero aporte, cero gracia, cero cabeza. El grupo se cansó de cargar con vosotros. A la calle.',
  },
  {
    uno: '%M eres un parásito, hijo de puta. Lees lo que escriben los demás, te ríes por dentro y no devuelves nada.\nEl grupo no es un cine gratis. Aquí se aporta o se sale por la puerta, y tú no has aportado nunca. Lárgate.',
    varios: '%M sois parásitos, hijos de puta. Leéis lo que escriben los demás, os reís por dentro y no devolvéis nada.\nEl grupo no es un cine gratis. Aquí se aporta o se sale por la puerta, y vosotros no habéis aportado nunca. Largaos.',
  },
  {
    uno: '%M te vas por ser un lastre, retrasado. Cada conversación en la que te metes se hunde un poco: preguntas lo que ya se dijo y contestas lo que nadie preguntó.\nEl grupo va más rápido sin ti. Hoy lo comprueba. Fuera.',
    varios: '%M os vais por ser un lastre, retrasados. Cada conversación en la que os metéis se hunde un poco: preguntáis lo que ya se dijo y contestáis lo que nadie preguntó.\nEl grupo va más rápido sin vosotros. Hoy lo comprueba. Fuera.',
  },
  {
    uno: '%M nadie te echa de menos y todavía no te has ido, imbécil. Eso lo dice todo.\nNo aportas nada, no haces gracia y no sirves para nada que este grupo necesite. Te sacan porque sobras, y sobras desde hace tiempo. A la calle.',
    varios: '%M nadie os echa de menos y todavía no os habéis ido, imbéciles. Eso lo dice todo.\nNo aportáis nada, no hacéis gracia y no servís para nada que este grupo necesite. Os sacan porque sobráis, y sobráis desde hace tiempo. A la calle.',
  },
  {
    uno: '%M ocupaste el sitio de alguien que sí valía, cabrón. Cada día que pasaste aquí fue un día regalado a quien no aporta nada.\nSe acabó el regalo. El sitio vuelve a quien se lo gane, y tú no te lo ganaste nunca. Lárgate.',
    varios: '%M ocupasteis el sitio de gente que sí valía, cabrones. Cada día que pasasteis aquí fue un día regalado a quien no aporta nada.\nSe acabó el regalo. El sitio vuelve a quien se lo gane, y vosotros no os lo ganasteis nunca. Largaos.',
  },
  {
    uno: '%M te echan por no servir para nada, gilipoyas. Ni para conversar, ni para hacer reír, ni para defender a nadie cuando hacía falta.\nQuien no sirve para nada no es parte del grupo: es un estorbo con foto de perfil. Fuera.',
    varios: '%M os echan por no servir para nada, gilipoyas. Ni para conversar, ni para hacer reír, ni para defender a nadie cuando hacía falta.\nQuien no sirve para nada no es parte del grupo: es un estorbo con foto de perfil. Y vosotros no servís para nada. Fuera.',
  },
  {
    uno: '%M no cuentas para nada en este grupo, puta. Si mañana desaparecieras, nadie tardaría más de un minuto en darse cuenta, y nadie lo lamentaría.\nPara qué esperar a mañana. Te echan hoy por inútil y por sobrar. A la calle.',
    varios: '%M no contáis para nada en este grupo, putas. Si mañana desaparecierais, nadie tardaría más de un minuto en darse cuenta, y nadie lo lamentaría.\nPara qué esperar a mañana. Os echan hoy por inútiles y por sobrar. A la calle.',
  },
  {
    uno: '%M llevas meses aquí y no has dicho una sola cosa que alguien recuerde, subnormal.\nNi una broma, ni una opinión, ni una respuesta con algo dentro. Eso no es timidez: es que no tienes nada que aportar. Y quien no aporta, se va. Fuera.',
    varios: '%M lleváis meses aquí y no habéis dicho una sola cosa que alguien recuerde, subnormales.\nNi una broma, ni una opinión, ni una respuesta con algo dentro. Eso no es timidez: es que vosotros no tenéis nada que aportar. Y quien no aporta, se va. Fuera.',
  },
  {
    uno: '%M el grupo no te echa por rencor, hijo de puta. Te echa por higiene. Eres un peso muerto, y el peso muerto se tira.\nNo hay discusión, no hay segunda oportunidad y no hay nadie que vaya a pedir que vuelvas. Lárgate.',
    varios: '%M el grupo no os echa por rencor, hijos de puta. Os echa por higiene. Sois peso muerto, y el peso muerto se tira.\nNo hay discusión, no hay segunda oportunidad y no hay nadie que vaya a pedir que volváis. Largaos.',
  },
  {
    uno: '%M tu única aportación al grupo ha sido el número de miembros, imbécil. Subías la cifra y bajabas el nivel.\nHoy se arreglan las dos cosas de golpe: un miembro menos y un estorbo menos. Fuera.',
    varios: '%M vuestra única aportación al grupo ha sido el número de miembros, imbéciles. Subíais la cifra y bajabais el nivel.\nHoy se arreglan las dos cosas de golpe: menos miembros y menos estorbos. Fuera.',
  },
  {
    uno: '%M no tienes ni puta idea de nada y aun así opinas de todo, gilipoyas. Eso cansa, y el grupo ya se cansó.\nTe echan por bocazas sin cerebro. Tus opiniones no las va a extrañar nadie, porque nadie las pidió nunca. A la calle.',
    varios: '%M no tenéis ni puta idea de nada y aun así opináis de todo, gilipoyas. Eso cansa, y el grupo ya se cansó.\nOs echan por bocazas sin cerebro. Vuestras opiniones no las va a extrañar nadie, porque nadie las pidió nunca. A la calle.',
  },
  {
    uno: '%M solo apareces para pedir, quejarte o llorar, parásito de mierda. Nunca para dar.\nEl grupo no es tu servicio de atención al cliente. Te echan por chupar sin devolver nada, que es lo único que has hecho aquí. Lárgate.',
    varios: '%M solo aparecéis para pedir, quejaros o llorar, parásitos de mierda. Nunca para dar.\nEl grupo no es vuestro servicio de atención al cliente. Os echan por chupar sin devolver nada, que es lo único que habéis hecho aquí. Largaos.',
  },
  {
    uno: '%M se te dio sitio, tiempo y paciencia, retrasado, y lo convertiste todo en nada.\nNo es mala suerte ni que no te entiendan. Es que eres inútil, y aquí ya no queda paciencia para inútiles. Fuera.',
    varios: '%M se os dio sitio, tiempo y paciencia, retrasados, y lo convertisteis todo en nada.\nNo es mala suerte ni que no os entiendan. Es que sois inútiles, y aquí ya no queda paciencia para inútiles. Fuera.',
  },
  {
    uno: '%M ni sabes cómo se llama la mitad del grupo, imbécil. No te has molestado en conocer a nadie, y nadie se ha molestado en conocerte a ti.\nEso no es estar en un grupo: es estar de mueble. Y los muebles que estorban se sacan. Fuera.',
    varios: '%M ni sabéis cómo se llama la mitad del grupo, imbéciles. No os habéis molestado en conocer a nadie, y nadie se ha molestado en conoceros a vosotros.\nEso no es estar en un grupo: es estar de mueble. Y los muebles que estorban se sacan. Fuera.',
  },
  {
    uno: '%M cada vez que escribes baja el nivel del chat, gilipoyas. Faltas de ortografía, ideas a medias y chistes que dan vergüenza ajena.\nTe echan por empeorar todo lo que tocas. El grupo sube un escalón en cuanto te vas. A la calle.',
    varios: '%M cada vez que escribís baja el nivel del chat, gilipoyas. Faltas de ortografía, ideas a medias y chistes que dan vergüenza ajena.\nOs echan por empeorar todo lo que tocáis. El grupo sube un escalón en cuanto os vais. A la calle.',
  },
  {
    uno: '%M entras, miras y no haces nada, hijo de puta. Así durante meses.\nEl grupo no necesita espectadores. Necesita gente con algo en la cabeza, y tú no tienes nada. Te echan por mirar sin aportar. Fuera.',
    varios: '%M entráis, miráis y no hacéis nada, hijos de puta. Así durante meses.\nEl grupo no necesita espectadores. Necesita gente con algo en la cabeza, y vosotros no tenéis nada. Os echan por mirar sin aportar. Fuera.',
  },
  {
    uno: '%M lo intentaste, eso hay que reconocerlo, subnormal. Lo intentaste y no salió ni una vez.\nNo es que no te dejaran: es que no das para más. Y un grupo no se queda por pena con alguien que no da para más. Lárgate.',
    varios: '%M lo intentasteis, eso hay que reconocerlo, subnormales. Lo intentasteis y no salió ni una vez.\nNo es que no os dejaran: es que no dais para más. Y un grupo no se queda por pena con gente que no da para más. Largaos.',
  },
  {
    uno: '%M eres la persona más prescindible de este grupo, gilipoyas, y lo sabías.\nPor eso no te sorprende. Nadie va a preguntar por ti, nadie va a pedir que vuelvas y nadie va a notar el hueco. Te echan porque no hacías ninguna falta. Fuera.',
    varios: '%M sois la gente más prescindible de este grupo, gilipoyas, y lo sabíais.\nPor eso no os sorprende. Nadie va a preguntar por vosotros, nadie va a pedir que volváis y nadie va a notar el hueco. Os echan porque no hacíais ninguna falta. Fuera.',
  },
  {
    uno: '%M te echan por aburrir, puta. Cada mensaje tuyo era una siesta: largo, vacío y sin nada que contestar.\nEl grupo tiene cosas mejores que hacer que soportarte. A partir de hoy, ya no tiene que hacerlo. A la calle.',
    varios: '%M os echan por aburrir, putas. Cada mensaje vuestro era una siesta: largo, vacío y sin nada que contestar.\nEl grupo tiene cosas mejores que hacer que soportaros. A partir de hoy, ya no tiene que hacerlo. A la calle.',
  },
  {
    uno: '%M no tienes gracia, ni cabeza, ni nada que decir, retrasado. Con nada no se gana un sitio en este grupo.\nTe echan porque no hay una sola cualidad tuya que justifique que sigas aquí. Lárgate.',
    varios: '%M no tenéis gracia, ni cabeza, ni nada que decir, retrasados. Con nada no se gana un sitio en este grupo.\nOs echan porque no hay una sola cualidad vuestra que justifique que sigáis aquí. Largaos.',
  },
  {
    uno: '%M el grupo votó sin votar, imbécil: nadie te quiere aquí.\nNo hizo falta una encuesta. Bastaba ver cómo se cambiaba de tema cada vez que aparecías. Te echan por insoportable y por inútil. Fuera.',
    varios: '%M el grupo votó sin votar, imbéciles: nadie os quiere aquí.\nNo hizo falta una encuesta. Bastaba ver cómo se cambiaba de tema cada vez que aparecíais. Os echan por insoportables y por inútiles. Fuera.',
  },
  {
    uno: '%M has tenido meses para demostrar que valías algo, gilipoyas, y no has demostrado nada.\nNi una conversación buena, ni un momento que alguien quiera repetir. Se acabó el plazo. Te echan por no valer nada. A la calle.',
    varios: '%M habéis tenido meses para demostrar que valíais algo, gilipoyas, y no habéis demostrado nada.\nNi una conversación buena, ni un momento que alguien quiera repetir. Se acabó el plazo. Os echan por no valer nada. A la calle.',
  },
  {
    uno: '%M eres un chupóptero, hijo de puta. Te aprovechas de lo que montan los demás y no pones ni un mensaje de tu parte.\nAquí nadie trabaja para que tú mires. Te echan por vivir de los demás sin poner nada. Lárgate.',
    varios: '%M sois unos chupópteros, hijos de puta. Os aprovecháis de lo que montan los demás y no ponéis ni un mensaje de vuestra parte.\nAquí nadie trabaja para que vosotros miréis. Os echan por vivir de los demás sin poner nada. Largaos.',
  },
  {
    uno: '%M hay gente que se fue de este grupo por no aguantarte, subnormal. Gente que valía y se cansó.\nEl grupo perdió a quien aportaba para quedarse contigo, que no aportas nada. Hoy se arregla ese error. Fuera.',
    varios: '%M hay gente que se fue de este grupo por no aguantaros, subnormales. Gente que valía y se cansó.\nEl grupo perdió a quien aportaba para quedarse con vosotros, que no aportáis nada. Hoy se arregla ese error. Fuera.',
  },
  {
    uno: '%M te echan por dar el coñazo, gilipoyas. Repetir lo mismo, insistir cuando nadie contesta, meterte donde no te llaman.\nSe puede aguantar a alguien así una semana. El grupo te ha aguantado meses. Se acabó. A la calle.',
    varios: '%M os echan por dar el coñazo, gilipoyas. Repetir lo mismo, insistir cuando nadie contesta, meteros donde no os llaman.\nSe puede aguantar a gente así una semana. El grupo os ha aguantado meses. Se acabó. A la calle.',
  },
  {
    uno: '%M no aportas, no ayudas y no haces gracia, puta. Tres cosas, y no cumples ninguna.\nEl grupo no pide mucho: pide que estés por algo. Tú no estabas por nada. Te echan por inútil, sin más vueltas. Fuera.',
    varios: '%M no aportáis, no ayudáis y no hacéis gracia, putas. Tres cosas, y no cumplís ninguna.\nEl grupo no pide mucho: pide que estéis por algo. Vosotros no estabais por nada. Os echan por inútiles, sin más vueltas. Fuera.',
  },
  {
    uno: '%M nunca has defendido a nadie, nunca has ayudado a nadie y nunca has hecho reír a nadie, cabrón.\nEn un grupo de gente, eso te convierte en un estorbo. Y los estorbos se quitan de en medio. Lárgate.',
    varios: '%M nunca habéis defendido a nadie, nunca habéis ayudado a nadie y nunca habéis hecho reír a nadie, cabrones.\nEn un grupo de gente, eso os convierte en estorbos. Y los estorbos se quitan de en medio. Largaos.',
  },
  {
    uno: '%M tu cerebro no da para seguir una conversación, retrasado. Llegas tarde, entiendes la mitad y contestas a lo que no era.\nEl grupo no va a ir más despacio para que lo alcances. Te echan por no llegar ni al mínimo. Fuera.',
    varios: '%M vuestro cerebro no da para seguir una conversación, retrasados. Llegáis tarde, entendéis la mitad y contestáis a lo que no era.\nEl grupo no va a ir más despacio para que lo alcancéis. Os echan por no llegar ni al mínimo. Fuera.',
  },
  {
    uno: '%M eres la prueba de que no todo el mundo vale para estar en un grupo, imbécil.\nNo sabes hablar, no sabes escuchar y no sabes callarte a tiempo. Te echan por no saber hacer nada de lo que hace falta aquí. A la calle.',
    varios: '%M sois la prueba de que no todo el mundo vale para estar en un grupo, imbéciles.\nNo sabéis hablar, no sabéis escuchar y no sabéis callaros a tiempo. Os echan por no saber hacer nada de lo que hace falta aquí. A la calle.',
  },
  {
    uno: '%M te echan por rata, hijo de puta. Recibes todo lo que el grupo da y no sueltas ni las gracias.\nAquí se comparte. Quien solo coge no pertenece aquí: es una sanguijuela, y a las sanguijuelas se las arranca. Fuera.',
    varios: '%M os echan por ratas, hijos de puta. Recibís todo lo que el grupo da y no soltáis ni las gracias.\nAquí se comparte. Quien solo coge no es parte del grupo: es una sanguijuela, y a las sanguijuelas se las arranca. Fuera.',
  },
  {
    uno: '%M nadie te ha contestado un mensaje en semanas, gilipoyas. Y no es casualidad: es que no hay nada que contestarte.\nLlevas semanas hablándole a la pared. Hoy la pared también se cansa. Te echan por no decir ni una frase que valga. A la calle.',
    varios: '%M nadie os ha contestado un mensaje en semanas, gilipoyas. Y no es casualidad: es que no hay nada que contestaros.\nLleváis semanas hablándole a la pared. Hoy la pared también se cansa. Os echan por no decir ni una frase que valga. A la calle.',
  },
  {
    uno: '%M tienes el sitio y no lo usas para nada, puta. Ni para hablar, ni para reír, ni para conocer a nadie.\nUn sitio que no se usa se le da a otra persona. Te echan por desperdiciarlo durante meses. Lárgate.',
    varios: '%M tenéis el sitio y no lo usáis para nada, putas. Ni para hablar, ni para reír, ni para conocer a nadie.\nUn sitio que no se usa se le da a otra persona. Os echan por desperdiciarlo durante meses. Largaos.',
  },
  {
    uno: '%M no te echa nadie en concreto, subnormal. Te echa el grupo entero, que lleva tiempo harto de ti.\nNo hace falta explicarlo mucho: eres inútil, molestas y no aportas. Con una de las tres bastaba. Fuera.',
    varios: '%M no os echa nadie en concreto, subnormales. Os echa el grupo entero, que lleva tiempo harto de vosotros.\nNo hace falta explicarlo mucho: sois inútiles, molestáis y no aportáis. Con una de las tres bastaba. Fuera.',
  },
  {
    uno: '%M mandas audios de tres minutos para no decir nada, gilipoyas. Y textos de tres líneas para decir menos.\nEl grupo no tiene tiempo para tu vacío. Te echan por hacerle perder el tiempo a todo el mundo. A la calle.',
    varios: '%M mandáis audios de tres minutos para no decir nada, gilipoyas. Y textos de tres líneas para decir menos.\nEl grupo no tiene tiempo para vuestro vacío. Os echan por hacerle perder el tiempo a todo el mundo. A la calle.',
  },
  {
    uno: '%M cuando hablas, se calla el grupo. Y no de respeto, imbécil: de vergüenza ajena.\nTe echan porque cada vez que abres la boca alguien tiene que cambiar de tema para salvar la conversación. Ya no hará falta. Fuera.',
    varios: '%M cuando habláis, se calla el grupo. Y no de respeto, imbéciles: de vergüenza ajena.\nOs echan porque cada vez que abrís la boca alguien tiene que cambiar de tema para salvar la conversación. Ya no hará falta. Fuera.',
  },
  {
    uno: '%M todo lo que tocas lo amargas, hijo de puta. Discusiones que no llevan a nada, quejas sin motivo y mal rollo gratis.\nNo aportas nada bueno y encima restas. Te echan por amargarle el grupo a todo el mundo. Lárgate.',
    varios: '%M todo lo que tocáis lo amargáis, hijos de puta. Discusiones que no llevan a nada, quejas sin motivo y mal rollo gratis.\nNo aportáis nada bueno y encima restáis. Os echan por amargarle el grupo a todo el mundo. Largaos.',
  },
  {
    uno: '%M te creías importante aquí, retrasado. No lo eras. Nunca lo fuiste.\nNadie te consultaba, nadie te esperaba y nadie te va a extrañar. Te echan porque, en todo este tiempo, no has importado nada. Fuera.',
    varios: '%M os creíais importantes aquí, retrasados. No lo erais. Nunca lo fuisteis.\nNadie os consultaba, nadie os esperaba y nadie os va a extrañar. Os echan porque, en todo este tiempo, no habéis importado nada. Fuera.',
  },
  {
    uno: '%M eres un desperdicio de sitio, gilipoyas. Hay gente esperando a entrar en este grupo que valdría diez veces más que tú.\nTe echan para dejarles hueco. No es nada personal: es que tú no aportas y esa gente sí lo haría. A la calle.',
    varios: '%M sois un desperdicio de sitio, gilipoyas. Hay gente esperando a entrar en este grupo que valdría diez veces más que vosotros.\nOs echan para dejarles hueco. No es nada personal: es que vosotros no aportáis y esa gente sí lo haría. A la calle.',
  },
  {
    uno: '%M solo te enteras de las cosas cuando ya han pasado, subnormal, y luego preguntas «qué ha pasado».\nNadie va a hacerte el resumen otra vez. Te echan por no estar nunca y por no enterarte cuando estás. Fuera.',
    varios: '%M solo os enteráis de las cosas cuando ya han pasado, subnormales, y luego preguntáis «qué ha pasado».\nNadie va a haceros el resumen otra vez. Os echan por no estar nunca y por no enteraros cuando estáis. Fuera.',
  },
  {
    uno: '%M no hay nada que defender de ti, imbécil. Se ha buscado y no aparece.\nNi un mensaje bueno, ni un detalle, ni un momento en el que hayas estado a la altura. Te echan por inútil de principio a fin. Lárgate.',
    varios: '%M no hay nada que defender de vosotros, imbéciles. Se ha buscado y no aparece.\nNi un mensaje bueno, ni un detalle, ni un momento en el que hayáis estado a la altura. Os echan por inútiles de principio a fin. Largaos.',
  },
  {
    uno: '%M te echan por cobarde, gilipoyas. Nunca te mojas, nunca das la cara y siempre esperas a ver qué dicen los demás para repetirlo.\nEl grupo no necesita un eco: ya tiene a la gente que piensa por sí misma. Fuera.',
    varios: '%M os echan por cobardes, gilipoyas. Nunca os mojáis, nunca dais la cara y siempre esperáis a ver qué dicen los demás para repetirlo.\nEl grupo no necesita ecos: ya tiene a la gente que piensa por sí misma. Fuera.',
  },
  {
    uno: '%M eres la razón de que este grupo esté más muerto de lo que debería, puta.\nDonde escribes tú, se apaga la conversación. Te echan para que el chat vuelva a tener vida. A la calle.',
    varios: '%M sois la razón de que este grupo esté más muerto de lo que debería, putas.\nDonde escribís vosotros, se apaga la conversación. Os echan para que el chat vuelva a tener vida. A la calle.',
  },
  {
    uno: '%M no te echan por un mensaje, hijo de puta. Te echan por todos: por cada uno que no decía nada y por cada silencio que no hacía falta.\nEs la suma lo que pesa. Y tu suma da cero. Lárgate.',
    varios: '%M no os echan por un mensaje, hijos de puta. Os echan por todos: por cada uno que no decía nada y por cada silencio que no hacía falta.\nEs la suma lo que pesa. Y vuestra suma da cero. Largaos.',
  },
  {
    uno: '%M ni siquiera molestas, retrasado. Para molestar hay que hacerse notar, y tú no llegas ni a eso.\nTe echan por inútil hasta para estorbar. El hueco que dejas no lo va a ver nadie, porque en ese sitio nunca hubo nada. Fuera.',
    varios: '%M ni siquiera molestáis, retrasados. Para molestar hay que hacerse notar, y vosotros no llegáis ni a eso.\nOs echan por inútiles hasta para estorbar. El hueco que dejáis no lo va a ver nadie, porque en ese sitio nunca hubo nada. Fuera.',
  },
  {
    uno: '%M te pasas el día en línea y no escribes nada, gilipoyas. Mirarlo todo y no aportar nada tiene un nombre: parásito.\nEl grupo no es tu entretenimiento gratis. Te echan por chupar del chat sin dar nada a cambio. A la calle.',
    varios: '%M os pasáis el día en línea y no escribís nada, gilipoyas. Mirarlo todo y no aportar nada tiene un nombre: parásito.\nEl grupo no es vuestro entretenimiento gratis. Os echan por chupar del chat sin dar nada a cambio. A la calle.',
  },
  {
    uno: '%M dijiste que ibas a cambiar y no cambiaste nada, imbécil. Seguiste igual de inútil y con la misma nada en la cabeza.\nLas promesas no dan sitio en este grupo. Los hechos sí, y de ti no hay ni uno. Fuera.',
    varios: '%M dijisteis que ibais a cambiar y no cambiasteis nada, imbéciles. Seguisteis igual de inútiles y con la misma nada en la cabeza.\nLas promesas no dan sitio en este grupo. Los hechos sí, y de vosotros no hay ni uno. Fuera.',
  },
  {
    uno: '%M en tu cabeza todo gira alrededor de ti, hijo de puta. En el grupo no gira nada a tu alrededor: eres ruido de fondo.\nTe echan por creerte el centro sin aportar una mierda. Nadie se va a girar a mirar cómo te vas. Lárgate.',
    varios: '%M en vuestra cabeza todo gira alrededor de vosotros, hijos de puta. En el grupo no gira nada a vuestro alrededor: sois ruido de fondo.\nOs echan por creeros el centro sin aportar una mierda. Nadie se va a girar a mirar cómo os vais. Largaos.',
  },
  {
    uno: '%M esto no es una expulsión injusta, subnormal. Es la más justa que ha hecho este grupo.\nNo aportas, no sumas y no mejoras nada. Si alguien te defiende, que lo haga ahora. Nadie lo va a hacer. Fuera.',
    varios: '%M esto no es una expulsión injusta, subnormales. Es la más justa que ha hecho este grupo.\nNo aportáis, no sumáis y no mejoráis nada. Si alguien os defiende, que lo haga ahora. Nadie lo va a hacer. Fuera.',
  },
  {
    uno: '%M el grupo te ha dado más oportunidades de las que merecías, gilipoyas, y las has tirado todas.\nNo queda ninguna. Te echan por inútil, por no aportar y por no haber aprendido nada en todo este tiempo. A la calle.',
    varios: '%M el grupo os ha dado más oportunidades de las que merecíais, gilipoyas, y las habéis tirado todas.\nNo queda ninguna. Os echan por inútiles, por no aportar y por no haber aprendido nada en todo este tiempo. A la calle.',
  },
];

module.exports = { AVISOS_KICK };
