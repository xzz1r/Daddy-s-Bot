// Escala única de la economía de aura. Todo lo que reparte, cobra o mueve aura
// lee de aquí, para que no haya dos sitios con números que se contradigan.
//
// REFERENCIA: un miembro MILLONARIO del grupo ronda los 5.000 de aura.
// Con eso fijado, el resto sale solo:
//
//   arranque .................    100   (2 % de un millonario)
//   tirada floja de !aura ....  15-50   (menos del 1 %)
//   tirada buena de !aura ....  60-150  (hasta un 3 %)
//   bono tier 1 (200 msgs) ...   8-52
//   bono tier 2 (500 msgs) ...  35-170
//   bono tier 3 (1000 msgs) ..  90-380  (un 8 % de millonario en el mejor caso)
//   robo típico ..............  10-60
//   duelo típico .............  10-300
//   canción (!play) ..........     15
//   un top al azar ...........   6-10
//
// La versión anterior repartía bonos de 1.000 a 50.000 mientras una tirada de
// !aura movía 50-500 y un robo 5-150: los bonos por escribir eclipsaban por
// completo a las dinámicas: robar o apostar no compensaba porque el bono del
// día siguiente devolvía cien veces eso.
//
// Calibrado contra una simulación de 30 días. Lo que sale hoy, contando las
// DOS fuentes (bonos por escribir + tiradas dentro del presupuesto diario):
//
//   perfil        msgs/día   escribir   tirando   día 30
//   fantasma            30          0         5      237
//   normal             200         16        14      993
//   activo             500         97        27    3.825
//   muy activo       1.200        315       110   12.838
//
// Millonario (5.000) le cuesta unos 39 días al perfil "activo" y unos 12 al
// que escribe mil doscientos mensajes diarios, que es un ritmo extremo. Un
// fantasma no llega ni de lejos, que es exactamente el punto.
//
// La regla que sostiene todo lo demás: ESCRIBIR MANDA. Ningún juego puede dar
// más que la actividad, ni siquiera al owner con la probabilidad más alta que
// existe. Cuando eso deja de cumplirse, la escala entera sobra — que es lo que
// pasaba antes del presupuesto de tiradas.

const MILLONARIO = 5000;
const ARRANQUE = 100;

// ─── !aura: tirada ───────────────────────────────────────────────────────────
//
// Bajado desde 250-500 / 50-200. La tirada ya no es la vía rápida a nada: es un
// goteo. Quien quiera subir de verdad tiene que escribir o robar.
const TIRADA = {
  grande: [60, 150],
  pequena: [15, 50],
};

// Probabilidad de que la tirada salga positiva, por rol. Se subió el suelo del
// miembro (45 % -> 52 %) porque con la tirada ya recortada, además castigar la
// probabilidad hacía que !aura fuese una máquina de perder y la gente dejaba de
// usarlo. Sigue habiendo riesgo real: poco más de un tercio de las tiradas
// bajan el marcador.
const P_POSITIVA = {
  owner: 0.64,
  admin: 0.58,
  miembro: 0.52,
};

// Empujón por actividad: quien ha escrito de verdad en el grupo tira con algo
// más de suerte. Es un plus pequeño a propósito — la tirada sigue siendo azar,
// no un premio por antigüedad.
const ACTIVIDAD_MSGS = 1000;   // umbral de !count a partir del cual aplica
const ACTIVIDAD_BONO = 0.06;   // +6 % de probabilidad de que salga positiva

// ─── Presupuesto diario de tiradas ───────────────────────────────────────────
//
// Esto tapa el mayor agujero que tenía la economía, y era grande: la tirada de
// !aura sale positiva más veces de las que sale negativa, así que su valor
// esperado es POSITIVO. Un juego con valor esperado positivo y sin límite no es
// un juego: es una impresora, y lo único que la frenaba era el cooldown.
//
// Con el cooldown en 2 minutos salen 720 tiradas al día. Las cuentas reales:
//
//   escribir 1.200 mensajes en un día .....    315 de aura
//   spamear !aura ese mismo día ...........  6.610 de aura
//
// O sea que el comando gratis pagaba VEINTE VECES lo que un día entero de
// actividad, y hacerse millonario (5.000) era cuestión de una tarde dándole al
// botón. Todo el ajuste de la escala, los tramos de bonos y la ventaja de la
// casa del robo no servían de nada al lado de eso.
//
// La solución no es subir el cooldown — eso solo lo hace lento y aburrido, sin
// dejar de ser una impresora. Es poner un presupuesto: doce tiradas al día,
// que se reinician con la misma ventana de 24h que los hitos de mensajes.
//
// Con doce, un miembro activo saca unas 110 de aura al día tirando, frente a
// las 299 que le da escribir mil mensajes. La tirada vuelve a ser lo que decía
// el diseño: un extra con suerte, no la vía principal.
const TIRADAS_DIA = 12;

// ─── !aura allin ─────────────────────────────────────────────────────────────
//
// La apuesta gorda del día. Está diseñada para picar como pica un casino sin
// romper nada de lo de arriba, y eso se consigue con cuatro límites:
//
//  1. CUESTA EL DÍA ENTERO. Exige las doce tiradas sin gastar y se las lleva
//     todas. Eso la deja en una por persona y día sin necesidad de otro
//     contador, y sobre todo convierte el día en una decisión de verdad: o
//     picoteas doce veces a lo seguro, o te la juegas una vez. Las dos cosas
//     no.
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
const ALLIN = {
  fraccion: 0.5,      // cuánto del saldo se pone en la mesa
  minimo: 300,        // por debajo no hay nada que arriesgar
  multiplicador: 2,   // ganar paga el doble de lo apostado
  suelo: ARRANQUE,    // perder nunca te deja por debajo del arranque
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
// Elegir cuánto robar SÍ estaba implementado, pero no se notaba, y el motivo
// era esta tabla. Con `fraccionVictima` a 0.25, a alguien con los 100 del
// arranque solo se le podían quitar 25 — que es exactamente `porDefecto`. O sea
// que pidieras 25, 80 o 200, el bot siempre acababa robando 25 y parecía que
// ignoraba la cifra. Y como casi todo el grupo anda cerca del arranque, le
// pasaba a casi todo el mundo.
//
// Con 0.35 y el defecto en 20 hay margen de verdad desde el primer día: contra
// alguien con 100 se puede pedir entre 5 y 35, y la horquilla se abre según
// engorda la víctima. El tope sigue atado a lo que ella tiene, no a lo que el
// ladrón quiera: robarle 200 a quien tiene 250 lo dejaría en la ruina de un
// golpe, y eso vacía el grupo en vez de animarlo.
const ROBO = {
  suelo: 5,
  porDefecto: 20,
  techo: 200,             // nadie se lleva más de esto de un solo robo
  fraccionVictima: 0.35,  // ni más de un tercio de lo que tiene la víctima
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
const REGALO_MIN = 5;

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
const PRECIOS = {
  play: 15,    // canción
  grok: 10,    // pregunta a la IA
  pfp: 5,      // foto de perfil de alguien
  fk: 8,       // análisis de cuenta falsa
  top5: 6,     // sorteo de 5 nombres
  top10: 10,   // sorteo de 10
  sticker: 15, // !s
  toimg: 15,   // !toimg
  tovid: 22,   // !tovid — el más caro: transcodifica vídeo entero
};

// Suelo de crédito: se puede pagar aunque te deje justo, pero no se entra en
// negativo comprando. Quien ya está en rojo no puede gastar hasta remontar.
const SALDO_MINIMO = 0;

function rango([suelo, ancho]) {
  return suelo + Math.floor(Math.random() * (ancho + 1));
}

module.exports = {
  MILLONARIO, ARRANQUE,
  TIRADA, P_POSITIVA, ACTIVIDAD_MSGS, ACTIVIDAD_BONO, TIRADAS_DIA, ALLIN,
  BONOS, REDENCION,
  ROBO, RIESGO, ROBO_BASE, ROBO_LIMITES, ROBO_OWNER_MIN, DUELO, REGALO_MIN,
  PRECIOS, SALDO_MINIMO,
  rango,
};
