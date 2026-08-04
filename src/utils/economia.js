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
//   canción (!play) ..........     15
//
// La versión anterior repartía bonos de 1.000 a 50.000 mientras una tirada de
// !aura movía 50-500 y un robo 5-150: los bonos por escribir eclipsaban por
// completo a las dinámicas: robar o apostar no compensaba porque el bono del
// día siguiente devolvía cien veces eso.
//
// Las cifras de aquí están calibradas contra una simulación de 30 días (ver
// scratchpad/economia): con ellas alguien MUY activo (1.200 msgs al día) roza
// los 6.000 en un mes — o sea, se hace millonario, pero le cuesta el mes
// entero. Alguien de actividad normal se queda cerca de los 1.000 y las
// dinámicas (!robo, !duel, !aura) pesan lo mismo o más que el goteo de bonos,
// que es justo lo que se buscaba.

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

// ─── Bonos por actividad (tramos de 200 / 500 / 1000 mensajes diarios) ───────
//
// [suelo, rango] por etiqueta. El importe final es suelo + rand(rango).
const BONOS = {
  1: { win: [8, 6],   bigwin: [14, 8],  jackpot: [22, 12], mega: [34, 18] },
  2: { win: [35, 20], bigwin: [55, 25], jackpot: [80, 35], mega: [120, 50] },
  3: { win: [90, 40], bigwin: [130, 60], jackpot: [190, 80], mega: [260, 120] },
};

// Premio de redención para quien está en negativo. Sigue siendo el mejor pago
// del sistema en relación a su tramo, porque su función es sacar a alguien del
// pozo de una sola vez, pero ya no es una lotería que descuadre el ranking.
const REDENCION = {
  1: [40, 40],
  2: [100, 80],
  3: [200, 150],
};
// ─── !robo ───────────────────────────────────────────────────────────────────
//
// El tope ya no es un número fijo: es un porcentaje del aura de la víctima, con
// un techo absoluto. Robarle 150 a alguien que tiene 200 lo dejaba en la ruina
// de un golpe; robarle 150 a un millonario no le hacía ni cosquillas.
const ROBO = {
  suelo: 5,
  porDefecto: 25,
  techo: 200,             // nadie se lleva más de esto de un solo robo
  fraccionVictima: 0.25,  // ni más de un cuarto de lo que tiene la víctima
  minVictima: 20,         // por debajo de esto no se le puede robar a alguien
};

// Castigo por ambición: cuanto más pides, menos probable es que salga. Subido
// desde el 15 % anterior — con 15 % seguía compensando pedir siempre el máximo,
// así que no había decisión que tomar. Con 35 % pedir el tope es una apuesta de
// verdad: más botín, bastante menos probabilidad.
const AMBICION_MAX = 0.35;

// ─── Precios: el aura como moneda ────────────────────────────────────────────
//
// Solo se cobra por lo que cuesta recursos de verdad (ancho de banda, API,
// consultas a WhatsApp). Los juegos sociales siguen gratis: cobrarlos mataría
// el uso del grupo, que es justo lo que da sentido al resto.
//
// Precios pensados para ser accesibles: una canción son 15, y una sola tirada
// floja de !aura ya paga eso. Nadie se queda sin música por estar pobre.
const PRECIOS = {
  play: 15,   // canción
  grok: 10,   // pregunta a la IA
  pfp: 5,     // foto de perfil de alguien
  fk: 8,      // análisis de cuenta falsa
};

// Suelo de crédito: se puede pagar aunque te deje justo, pero no se entra en
// negativo comprando. Quien ya está en rojo no puede gastar hasta remontar.
const SALDO_MINIMO = 0;

function rango([suelo, ancho]) {
  return suelo + Math.floor(Math.random() * (ancho + 1));
}

module.exports = {
  MILLONARIO, ARRANQUE,
  TIRADA, P_POSITIVA, ACTIVIDAD_MSGS, ACTIVIDAD_BONO,
  BONOS, REDENCION,
  ROBO, AMBICION_MAX,
  PRECIOS, SALDO_MINIMO,
  rango,
};
