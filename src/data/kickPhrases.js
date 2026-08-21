// Avisos de !kick. Salen en el grupo ANTES de echar, para que lo vean.
//
// El hueso es el mismo que en !purge — no son suficientes — pero más hiriente:
// !kick lo usan los admins, se ve en el grupo y tiene que doler.
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
];

module.exports = { AVISOS_KICK };
