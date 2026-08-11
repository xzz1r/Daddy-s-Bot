// Escala única de la economía de aura. Todo lo que reparte, cobra o mueve aura
// lee de aquí, para que no haya dos sitios con números que se contradigan.
//
// REFERENCIA: un miembro MILLONARIO del grupo ronda los 5.000 de aura.
// Con eso fijado, el resto sale solo:
//
//   arranque .................     100   (2 % de un millonario)
//   tirada floja de !aura ....   10-25
//   tirada buena de !aura ....   40-80
//   bono tier 1 (200 msgs) ...    8-52
//   bono tier 2 (500 msgs) ...   35-170
//   bono tier 3 (1000 msgs) ..   90-380  (un 8 % de millonario en el mejor caso)
//   robo .....................   5-200   (lo que se pida, o al azar sin cifra)
//   duelo ....................  10-300
//   apuesta (!aura apostar) ..  la mitad del saldo
//   canción (!play) ..........      15
//   un top al azar ...........    6-10
//
// La versión anterior repartía bonos de 1.000 a 50.000 mientras una tirada de
// !aura movía 50-500 y un robo 5-150: los bonos por escribir eclipsaban por
// completo a las dinámicas: robar o apostar no compensaba porque el bono del
// día siguiente devolvía cien veces eso.
//
// Calibrado contra una simulación de 30 días, contando las DOS fuentes: los
// bonos por escribir y las tiradas de !aura.
//
//   perfil        msgs/día   tiradas   escribir   tirando   día 30
//   fantasma            30         3          0        +1      130
//   normal             200        10         16        +4      700
//   activo             500        25         97       +10    3.310
//   muy activo       1.200        50        315       +22   10.210
//
// Millonario (5.000) le cuesta unos 15 días a quien escribe mil doscientos
// mensajes diarios, que es un ritmo extremo, y bastante más al resto. Un
// fantasma apenas se mueve, que es exactamente el punto.
//
// La columna "tirando" es positiva pero pequeña: jugar da un extra, escribir da
// el sueldo. Esa proporción es la que hay que vigilar.
//
// La regla que sostiene todo lo demás: ESCRIBIR MANDA. Jugar da un goteo
// positivo — pequeño a propósito — pero para igualar media jornada de escribir
// hay que pasarse el día entero dándole al botón. Cuando eso deja de cumplirse,
// la escala entera sobra.

const MILLONARIO = 5000;
const ARRANQUE = 100;

// ─── !aura: tirada ───────────────────────────────────────────────────────────
//
// Bajado desde 250-500 / 50-200. La tirada ya no es la vía rápida a nada: es un
// goteo. Quien quiera subir de verdad tiene que escribir o robar.
// Importes recortados otra vez (eran 60-210 y 15-65). Se pidió que ganar fuese
// más frecuente pero MENOS enriquecedor, y las dos cosas van juntas: si subes la
// probabilidad sin tocar las cifras, la gente gana más veces Y acumula más
// rápido, que es justo la mitad que no se quería.
//
// Con estos números la tirada media pasa de 57 a 35 de aura. Sigue notándose en
// el marcador, pero un buen día de tiradas ya no compite con un día de escribir.
// [MINIMO, MAXIMO]. Ojo: aqui es [min, max], NO [suelo, ancho] como en BONOS y
// REDENCION — aura.js calcula el ancho restando (`grande[1] - grande[0]`).
//
// Los comentarios de estas dos lineas decian "40-120" y "10-35", que es como se
// leerian si fueran [suelo, ancho]. Era falso: lo que se ejecuta son 40-80 y
// 10-25. Esa confusion me costo dos analisis mal hechos seguidos, uno de ellos
// publicado. Cualquier cosa que lea TIRADA tiene que usar MIN/MAX de abajo.
const TIRADA = {
  grande: [40, 80],
  pequena: [10, 25],
};
const TIRADA_MIN = { grande: TIRADA.grande[0], pequena: TIRADA.pequena[0] };
const TIRADA_MAX = { grande: TIRADA.grande[1], pequena: TIRADA.pequena[1] };

// Probabilidad de que la tirada salga positiva, por rol. Se GANA más veces de
// las que se pierde: esa sensación es la que engancha y no se toca. La casa
// cobra por el otro lado (ver multiplicadorPerdida).
// Se sube para todos: ganar tiene que pasar más veces de las que pasaba. Un
// miembro estaba en 52 %, que es casi una moneda al aire y no se siente como
// ganar; ahora acierta 62 de cada 100.
//
// Que esto NO enriquezca lo garantiza el multiplicador de pérdida, que sale de
// la propia probabilidad: subir a 62 % hace que cada derrota pese 1,68 veces lo
// que pesa una victoria. Se gana más a menudo y se sigue sin poder acumular a
// base de tirar, que es exactamente lo que se pidió.
const P_POSITIVA = {
  owner: 0.80,   // el owner gana 4 de cada 5 tiradas, por peticion expresa
  admin: 0.68,
  miembro: 0.62,
};

// Empujón por actividad: quien ha escrito de verdad en el grupo tira con algo
// más de suerte. Es un plus pequeño a propósito — la tirada sigue siendo azar,
// no un premio por antigüedad.
const ACTIVIDAD_MSGS = 1000;   // umbral de !count a partir del cual aplica
const ACTIVIDAD_BONO = 0.06;   // +6 % de probabilidad de que salga positiva

// ─── Cuánto pesa perder ──────────────────────────────────────────────────────
//
// La tirada sale positiva más veces de las que sale negativa. Si ganar y perder
// movieran lo mismo, cada tirada tendría un valor esperado positivo GRANDE, y
// sin ningún freno bastaría con darle al botón toda la tarde para fabricar aura
// de la nada: con los números viejos eran 6.610 al día, veinte veces lo que un
// día entero escribiendo.
//
// LO QUE NO FUNCIONÓ. Primero, un tope de doce tiradas diarias: frena, sí, pero
// convierte el comando en mirar un contador en vez de jugar. Después, un castigo
// fijo (pérdidas un 25 % más gordas): arreglaba al miembro pero dejaba
// imprimiendo a quien tuviera la probabilidad alta.
//
// LA SOLUCIÓN. El multiplicador de pérdida sale de TU PROPIA probabilidad. Si
// ganas el 62 % de las veces, una derrota pesa 1,63 veces lo que pesa una
// victoria; si ganas el 80 %, pesa 4. La cuenta se equilibra sola sea cual sea
// la probabilidad, así que subir el acierto de cualquier rol no puede romper
// nada — el equilibrio se recalcula solo.
//
// Y AQUÍ ESTÁ EL AJUSTE FINO. Ese equilibrio exacto dejaría la tirada plana: ni
// se gana ni se pierde a la larga, solo vaivén. Se pidió que se pudiera GANAR,
// aunque fuese poco, así que el multiplicador se recorta un 2 % por debajo de lo
// justo. Con eso:
//
//   · se gana más veces de las que se pierde (62 % un miembro),
//   · las victorias son pequeñas (media de 32),
//   · y a la larga se sale GANANDO, unas 0,65 de aura por tirada.
//
// Lo que eso significa en la práctica:
//
//   30 tiradas al día (uso normal) ......  +20 de aura
//   60 tiradas (uso intenso) ............  +39
//  150 tiradas (todo el día dándole) ...  +98
//
// Compáralo con escribir: 500 mensajes dan 97 y 1.200 dan 315. O sea que hace
// falta pasarse el día entero tirando para igualar media jornada de escribir, y
// eso es lo que mantiene la regla de que ESCRIBIR MANDA.
//
// El número puede ser todo lo pequeño que se quiera. Lo único que no debe
// hacerse es subirlo mucho: cada punto que se le quita al multiplicador es
// aura creada de la nada, y ahí es donde estaba el agujero original.
const FAVOR_JUGADOR = 0.98;

// ─── De dónde sale el importe que se pierde ──────────────────────────────────
//
// El castigo se calcula SIEMPRE sobre el tramo pequeño (10-25), nunca sobre el
// grande. Antes se sorteaba igual que la ganancia, así que un 34 % de las
// derrotas partían de 40-80 y, multiplicadas, salían golpes enormes: 128 para
// un miembro y 314 para quien tiene la probabilidad alta, cuando lo máximo que
// se puede GANAR de una tirada son 80. Perder el cuádruple de lo que puedes
// ganar en el mejor caso no se vive como una racha mala, se vive como un robo.
//
// Lo importante: esto NO regala nada. La media de la pérdida se mantiene
// exactamente igual, porque el multiplicador se reescala por la proporción
// entre las dos medias. Lo único que baja es la VARIANZA: se acabaron las
// pérdidas catastróficas, y siguen existiendo pérdidas grandes y pequeñas.
//
//   miembro : antes 16-128 (media 51) → ahora 29-73 (media 51)
//   owner   : antes 39-314 (media 125) → ahora 72-179 (media 125)
//
// El valor esperado por tirada no se mueve ni una centésima, así que la regla
// de que escribir manda sobre tirar sigue intacta y ningún rol imprime aura.
const mediaRango = ([min, max]) => (min + max) / 2;   // TIRADA es [min, max]
const MEDIA_PREMIO  = 0.34 * mediaRango(TIRADA.grande) + 0.66 * mediaRango(TIRADA.pequena);
const MEDIA_CASTIGO = mediaRango(TIRADA.pequena);

function multiplicadorPerdida(pPositiva) {
  const p = Math.min(0.95, Math.max(0.05, pPositiva));
  // El factor final es lo que compensa castigar sobre una base más pequeña:
  // sin él, cobrar solo del tramo pequeño convertiría la tirada en una
  // fotocopiadora de aura.
  return (p / (1 - p)) * FAVOR_JUGADOR * (MEDIA_PREMIO / MEDIA_CASTIGO);
}

// ─── !aura apostar ───────────────────────────────────────────────────────────
//
// La apuesta gorda: la MITAD del saldo a una carta.
//
// Ha cambiado de nombre dos veces y las dos por el mismo motivo. Primero fue
// "all in", que prometía todo el saldo y solo ponía la mitad. Después "órdago",
// que decía la verdad pero lleva acento, es de partida de mus y no se le ocurre
// a nadie escribirlo. Ahora es *apostar*: un verbo llano, de la misma familia
// que !dar y !robar, y lo que hace se entiende sin explicarlo.
//
// Está diseñada para picar como pica un casino sin romper nada de lo de arriba,
// y eso se consigue con cuatro reglas:
//
//  1. TIENE SU PROPIO COOLDOWN, TRES HORAS. No hace falta más freno que ese, y
//     el motivo es bonito: apostar repetidamente ARRUINA por pura
//     matemática. Cada jugada multiplica tu saldo por 1,5 si ganas y por 0,5 si
//     pierdes, y con un 42 % de acierto el crecimiento esperado por jugada es
//     negativo (−0,23 en logaritmo). Encadenar apuestas te lleva al suelo solo,
//     sin que el bot tenga que prohibir nada. El cooldown está para que esa
//     caída no ocurra en diez minutos.
//  2. SE JUEGA LA MITAD, NO TODO. Perder no puede borrarte del mapa: con la
//     mitad, un mes de actividad duele pero sigue ahí. Es lo mismo que hacen
//     el robo y el duelo, que capan la apuesta a una fracción del saldo justo
//     para que nadie se vacíe de un golpe.
//  3. HAY QUE TENER ALGO QUE PERDER. Por debajo del mínimo no hay apuesta que
//     valga: arriesgar 50 no es arriesgar.
//  4. NO TE ECHA DEL BOT. Aunque pierdas, nunca bajas del arranque. Quedarte a
//     cero significaría no poder ni hacer un sticker, y ese no es el castigo
//     que se busca — se busca el drama, no que alguien deje de usar el bot.
//
// Las probabilidades van justo por debajo de la moneda al aire, como el robo.
// A 42 % con premio doble, la casa se queda un 16 % de lo apostado: se pierde
// más veces de las que se gana, que es lo que hace que ganar se cuente durante
// una semana. Sube por rol igual que en la tirada normal.
const APUESTA = {
  // La cantidad LA ELIGE quien juega: *!aura apostar 500*. La fracción es solo
  // lo que se pone si no se dice cifra, para que el comando siga sirviendo a
  // secas. Elegir cuánto es lo que convierte la apuesta en una decisión: jugarse
  // 100 cuando tienes 4.000 y jugarse los 4.000 no son la misma jugada.
  apuestaMin: 50,       // por debajo de esto no es arriesgar, es hacer ruido
  fraccion: 0.5,        // cuánto del saldo se pone en la mesa si no se dice nada
  minimo: 300,          // por debajo no hay nada que arriesgar
  multiplicador: 2,     // ganar paga el doble de lo apostado
  suelo: ARRANQUE,      // perder nunca te deja por debajo del arranque
  cooldownMin: 180,     // tres horas entre apuestas
  p: { owner: 0.58, admin: 0.45, miembro: 0.42 },
};

// ─── Bonos por actividad (tramos de 200 / 500 / 1000 mensajes diarios) ───────
//
// [suelo, rango] por etiqueta. El importe final es suelo + rand(rango).
const BONOS = {
  1: { win: [8, 6],   bigwin: [14, 8],  jackpot: [22, 12], mega: [34, 18] },
  2: { win: [35, 20], bigwin: [55, 25], jackpot: [80, 35], mega: [120, 50] },
  3: { win: [90, 40], bigwin: [130, 60], jackpot: [190, 80], mega: [260, 120] },
};

// Premio de redención para quien está en negativo. Su función es sacar a
// alguien del pozo de una sola vez, así que el suelo de cada tramo tiene que
// quedar POR ENCIMA del mejor bono normal de ese mismo tramo. Con los números
// anteriores no era así: en tier 3 la redención pagaba 200-350 mientras un bote
// normal daba 260-380, o sea que estar hundido salía peor que no estarlo.
const REDENCION = {
  1: [55, 45],    // por encima del mega de tier 1 (34-52)
  2: [180, 120],  // por encima del mega de tier 2 (120-170)
  3: [400, 250],  // por encima del mega de tier 3 (260-380)
};
// ─── !robo ───────────────────────────────────────────────────────────────────
//
// El tope ya no es un número fijo: es un porcentaje del aura de la víctima, con
// un techo absoluto. Robarle 150 a alguien que tiene 200 lo dejaba en la ruina
// de un golpe; robarle 150 a un millonario no le hacía ni cosquillas.
// Se roba LA CANTIDAD QUE SE PIDE. Punto.
//
// Antes había un tope por fracción del saldo de la víctima, y era exactamente
// lo que hacía que el comando pareciera roto: pedías 52, la víctima tenía 52, y
// el bot robaba 18 sin que la cifra que escribiste significara nada. Da igual
// cuánto se explique en la nota del final — si escribes un número y sale otro,
// el comando está ignorándote.
//
// Ahora la cantidad se respeta y el precio se paga en PROBABILIDAD: cuanto más
// pides, más difícil es que salga (ver RIESGO). Eso es una decisión de verdad,
// no un recorte silencioso.
//
// Los dos únicos límites que quedan son físicos, no de diseño:
//   · no se puede robar más de lo que la víctima tiene;
//   · ni más de lo que el ladrón podría pagar si le sale mal.
// Y un techo absoluto, para que un solo comando no decida el ranking entero.
const ROBO = {
  suelo: 5,
  porDefecto: 20,
  techo: 200,             // nadie se lleva más de esto de un solo robo
  minVictima: 20,         // por debajo de esto no se le puede robar a alguien
};

// ─── !robo: la curva de riesgo ───────────────────────────────────────────────
//
// Pedir mucho penaliza, pero pedir de menos TAMBIÉN. Antes solo se castigaba
// por arriba, así que la jugada óptima era pedir siempre lo mínimo: máxima
// probabilidad, botín ridículo, cero decisión. Ahora hay un punto dulce en la
// parte media de la horquilla y las dos orillas cuestan:
//
//   · pasarse (codicia)  — te ven venir. Hasta −14 % en el tope.
//   · quedarte corto     — un robo de calderilla no compensa el riesgo de
//     acercarse, y quien lo intenta va sin ganas. Hasta −8 % en el mínimo.
//
// Los castigos se recortaron a la mitad larga (eran 35 y 15) al bajar la base a
// rango de casino: con la base en 38 % y un castigo de 35, pedir el tope caía
// directo al suelo y era tirar el aura. Ahora la horquilla completa va del 24 %
// al 38 %, que sigue siendo una decisión con precio pero ninguna opción es
// tirar el turno.
//
// La curva es cuadrática en los dos lados: cerca del punto dulce casi no se
// nota, y son los extremos los que duelen.
const RIESGO = {
  puntoDulce: 0.45,   // fracción del tope donde la probabilidad es máxima
  codiciaMax: 0.14,   // castigo al pedir el tope entero
  miseriaMax: 0.08,   // castigo al pedir el mínimo
  allIn: 0.85,        // a partir de aquí el robo es "a lo grande" (ver DESENLACES)
};

// ─── !robo: cuánto se gana ───────────────────────────────────────────────────
//
// Robar es una apuesta de casino, y una apuesta de casino se pierde MÁS veces
// de las que se gana. Antes un miembro acertaba el 44 % en su mejor caso, que
// es prácticamente una moneda al aire: no daba sensación de estar arriesgando
// nada. Ahora el mejor caso ronda el 38 % y baja desde ahí según lo que pidas.
//
// Las dos orillas importan:
//   · nunca es IMPOSIBLE — por muchos castigos que acumules, el suelo es el
//     15 %. Antes el suelo era 10 % y pedir el tope caía justo ahí, así que ir
//     a por todo era tirar el aura sin más. Un long shot tiene que seguir
//     siendo un tiro.
//   · nunca es REGALADO — el techo de un miembro es 60 %, aunque encadene
//     venganza y ventaja de saldo.
//
// La ventaja de la casa sale de comparar lo que se gana con lo que se pierde:
// en el punto dulce ronda el 6 % en contra del ladrón, parecido a una máquina
// de un casino de verdad. O sea que robar sale ligeramente a perder a la larga,
// que es lo que hace que ganar tenga gracia, pero la pérdida por intento es
// calderilla al lado de lo que da escribir.
const ROBO_BASE = {
  owner: 0.46,    // owner tier (co-owners); el owner principal va aparte
  admin: 0.42,
  miembro: 0.38,
};
const ROBO_LIMITES = {
  suelo: 0.15,       // ni con todo en contra baja de aquí
  techo: 0.60,       // ni con todo a favor sube de aquí
  techoOwner: 0.88,
};

// El owner roba con ventaja y la cifra que elija le da igual: ni codicia ni
// miseria le afectan, y su probabilidad nunca baja de aquí.
const ROBO_OWNER_MIN = 0.78;

// ─── Las dinámicas nuevas del robo ───────────────────────────────────────────
//
// Todo lo que añade el rework sale de aquí, para que no vuelva a haber cifras
// del juego repartidas por los comandos.
//
// EL BOTE. Lo que pierde un ladrón cuando falla ya no se evapora entero: una
// parte cae a un bote común que el grupo ve crecer. Reventarlo es una jugada
// aparte, cara y poco probable, y el que lo revienta se lo lleva todo. Es la
// pieza que convierte los fracasos ajenos en algo que todos miran.
const BOTE = {
  fraccionDeFallo: 0.45,   // cuánto de cada robo fallido cae al bote
  entrada: 60,             // lo que cuesta intentar reventarlo
  probabilidad: 0.16,      // y lo difícil que es. Bajo a propósito: es la gorda
  minimoParaAsaltar: 150,  // por debajo de esto no merece la pena ni intentarlo

  // Comisión de la casa sobre la entrada del asalto: esta parte se DESTRUYE, no
  // engorda el bote. Sin ella el asalto no drenaba nada — todo lo que entraba
  // acababa en manos de alguien — y el robo dejaba de ser el sumidero que
  // sostiene la economía. Medido: el bote ya se lleva el 45 % de cada robo
  // fallido, así que sin esto el drenaje caía a la mitad.
  comision: 0.25,

  // Las apuestas perdidas también alimentan el bote, pero solo una cuarta parte:
  // el grueso se sigue destruyendo, que es lo que hace de !aura apostar un
  // sumidero de verdad. Con esto el bote crece aunque el grupo no robe — una
  // sola apuesta perdida de 500 mete 125, más que diez robos fallidos.
  fraccionDeApuesta: 0.25,
};

// LOS OBJETOS. Dan una decisión ANTES de robar, no solo al robar. Los precios
// están puestos contra el botín típico (un robo medio mueve unos 40-60): un
// escudo cuesta más que un robo bueno, así que comprarlo es renunciar a algo.
const OBJETOS = {
  escudo: { precio: 180, horas: 12, desc: 'nadie te puede robar durante 12 h' },
  ganzua: { precio: 140, usos: 1,   bono: 0.18, desc: '+18 % en tu próximo robo' },
  cebo:   { precio: 90,  horas: 8,  desc: 'aparentas el doble de aura durante 8 h' },
};

// EL CONTRAATAQUE. Tras un robo con éxito, la víctima tiene una ventana para
// devolver el golpe a doble o nada. Es lo que convierte un robo en un
// intercambio: el ladrón ya no se va de rositas, se queda mirando el chat.
const CONTRA = {
  ventanaSeg: 90,       // lo que tiene la víctima para responder
  multiplicador: 2,     // recupera el doble de lo que le quitaron...
  probabilidad: 0.42,   // ...con menos de una moneda al aire
};

// EL MÁS BUSCADO. El nº1 de la semana lleva diana: robarle a él paga más, y
// además el resto del grupo sabe a quién ir. Sin esto el ranking sería una
// tabla que nadie mira.
const DIANA = {
  bonoBotin: 0.35,      // robarle al nº1 da un 35 % más de botín
  bonoProbabilidad: -0.05, // pero está en guardia: un pelo más difícil
};

// ─── !duel ───────────────────────────────────────────────────────────────────
//
// La apuesta se recorta a lo que los DOS pueden cubrir, con un techo absoluto,
// igual que el robo. Antes el duelo tenía sus propias cifras a pelo (mínimo 10,
// máximo 500, por defecto 50), heredadas de la escala vieja: 500 era una décima
// parte de un millonario en una sola apuesta, mientras un robo se quedaba en
// 200. Además no miraba el saldo del retado al lanzar el reto, así que se podía
// desafiar por 500 a alguien con 60 y el duelo moría al aceptar con un mensaje
// público de "insolvente".
//
// El techo es más alto que el del robo a propósito: el duelo es consentido — el
// otro tiene que aceptar — así que puede permitirse más riesgo que un robo, que
// se sufre sin poder decir que no.
const DUELO = {
  suelo: 10,
  porDefecto: 40,
  techo: 300,             // más que el robo (200), porque aquí el otro acepta
  fraccionRival: 0.35,    // ni más de un tercio de lo que tiene el más pobre
};

// ─── !dar ────────────────────────────────────────────────────────────────────
//
// Regalar es voluntario y sin tope: quien quiera vaciarse la cuenta por otro,
// que lo haga. Solo hay un mínimo para que no se use como ruido.
//
// El mínimo NO es un número suelto: es el precio del comando más barato, y se
// calcula abajo a partir de PRECIOS. Estaba fijado en 5 y al subir los precios
// dejó de servir para nada — regalabas el mínimo y el otro no podía comprar ni
// lo más barato, que es justo lo que un regalo mínimo tiene que permitir.
// Atándolo al precio, cualquier subida futura lo arrastra sola.

// ─── Precios: el aura como moneda ────────────────────────────────────────────
//
// Se cobra por lo que cuesta recursos de verdad (ancho de banda, API, consultas
// a WhatsApp) y por los tops, que mencionan a media docena de personas de golpe
// y son el comando mas facil de disparar en bucle. Los juegos de porcentaje
// siguen gratis: cobrarlos mataria el uso del grupo, que es lo que da sentido
// al resto.
//
// El !top10 cuesta casi el doble que el !top5 porque molesta al doble de gente.
//
// Precios pensados para ser accesibles: una canción son 15, y una sola tirada
// floja de !aura ya paga eso. Nadie se queda sin música por estar pobre.
// Los conversores (!s, !toimg, !tovid) son los comandos más usados del grupo y
// cada uno levanta un ffmpeg. Estuvieron a 4 por ser el uso diario; ahora van a
// 15, igual que una canción, por decisión del owner. Con eso un sticker deja de
// ser calderilla: el aura de arranque da para seis, y hacerlos en cadena cuesta
// de verdad, que es justo lo que frena el spam de stickers.
//
// !tovid tiene que quedar POR ENCIMA de !toimg pase lo que pase: recodifica el
// vídeo entero con preset slow, que es con diferencia lo más caro que hace el
// bot en CPU. Al subir !toimg de 4 a 15 se quedó costando 6 — menos de la mitad
// que la conversión ligera — así que sube con él manteniendo la proporción que
// tenía (una vez y media).
// SUBIDA GENERAL, menos !play. Se mantienen las proporciones que ya había —
// tovid por encima de toimg, el top10 al doble largo del top5, los conversores
// al mismo nivel — porque esas relaciones no son estéticas: salen de lo que
// cuesta cada cosa en CPU y en molestar al grupo.
//
// !play se queda en 15 por decisión del owner. Deja la escala con una rareza que
// conviene tener presente: bajar una canción cuesta ancho de banda, cuota de la
// API y un ffmpeg entero, y ahora sale más barata que convertir un sticker.
// Es lo pedido, pero si algún día el cupo de RapidAPI se dispara, este es el
// número que hay que mirar primero.
const PRECIOS = {
  play: 15,    // canción — SIN TOCAR, por decisión expresa
  grok: 18,    // pregunta a la IA
  pfp: 10,     // foto de perfil de alguien
  fk: 15,      // análisis de cuenta falsa
  top5: 12,    // sorteo de 5 nombres
  top10: 20,   // sorteo de 10
  sticker: 25, // !s
  toimg: 25,   // !toimg
  tovid: 38,   // !tovid — el más caro: transcodifica vídeo entero
};

// Regalar el mínimo tiene que dar para algo. Ver la nota de !dar más arriba.
const REGALO_MIN = Math.min(...Object.values(PRECIOS));

// Suelo de crédito: se puede pagar aunque te deje justo, pero no se entra en
// negativo comprando. Quien ya está en rojo no puede gastar hasta remontar.
const SALDO_MINIMO = 0;

function rango([suelo, ancho]) {
  return suelo + Math.floor(Math.random() * (ancho + 1));
}

module.exports = {
  MILLONARIO, ARRANQUE,
  TIRADA, P_POSITIVA, ACTIVIDAD_MSGS, ACTIVIDAD_BONO, FAVOR_JUGADOR, multiplicadorPerdida, APUESTA,
  BONOS, REDENCION,
  ROBO, RIESGO, ROBO_BASE, ROBO_LIMITES, ROBO_OWNER_MIN, DUELO, REGALO_MIN,
  BOTE, OBJETOS, CONTRA, DIANA,
  PRECIOS, SALDO_MINIMO,
  rango,
};
