// Escala única de la economía de aura. Todo lo que reparte, cobra o mueve aura
// lee de aquí, para que no haya dos sitios con números que se contradigan.
//
// REFERENCIA: un miembro MILLONARIO del grupo ronda los 5.000 de aura.
// Con eso fijado, el resto sale solo:
//
//   arranque .................     250   (5 % de un millonario)
//   tirada floja de !aura ....   10-25
//   tirada buena de !aura ....   40-80
//   golpe malo de !aura ......   26-66   (igual para todos, ver MULT_CASTIGO)
//   bono tier 1 (200 msgs) ...    8-52
//   bono tier 2 (500 msgs) ...   35-170
//   bono tier 3 (1000 msgs) ..   90-380  (un 8 % de millonario en el mejor caso)
//   robo .....................   5-200   (lo que se pida, o al azar sin cifra)
//   duelo ....................  10-300
//   apuesta (!aura apostar) ..  la que se elija, o media cuenta
//   comando barato / caro ....   12-70
//
// ─── DE DONDE SALE EL AURA ──────────────────────────────────────────────────
//
// Tres fuentes, y cada una premia una cosa distinta a propósito:
//
//   · LOS HITOS de 200/500/1000 mensajes del día premian el VOLUMEN.
//   · LA VETERANÍA premia el TOTAL acumulado: cada 1.000 mensajes de !count
//     tus tiradas ganan suerte, para siempre.
//   · LA RACHA premia APARECER: un pago plano por cada día seguido en el que
//     escribes al menos el mínimo (ver RACHA). Es la única que un miembro
//     tranquilo cobra igual que el que más habla, y la única que se pierde
//     entera por faltar un solo día.
//
// Hubo un SUELDO por mensaje una temporada y se quitó (ver la nota en su hueco,
// más abajo).
//
// Lo que hace que escribir siga mandando ya no es que tirar dé calderilla, sino
// que la SUERTE de tus tiradas dependa de cuánto has escrito: cada 1.000
// mensajes de !count subes un escalón, y los escalones se acumulan. Un novato
// saca 2,2 por tirada y un veterano 12,4. Es el mismo premio de siempre —
// escribir — cobrado en un sitio donde se disfruta en vez de caer de fondo.
//
// Y el freno que permite que las tiradas paguen de verdad es TIRADAS_PAGADAS:
// solo las cinco primeras del día cobran. De ahí en adelante se sigue jugando,
// pero a valor esperado cero.
//
//   perfil        msgs/día   tirando   racha   bonos   total   antes   cmds/día
//   fantasma            30        +7      20       0      27       1       0,8
//   normal             200       +58      20      16      94      20       2,7
//   activo             500       +62      20      97     179     107       5,2
//   muy activo       1.200       +62      20     315     397     337      11,4
//
// La columna de la racha es plana a propósito: son los mismos 20 al día para
// todo el mundo, así que en términos relativos levanta muchísimo al de abajo y
// casi nada al de arriba (un 5 % del día de una bestia). Ese es su trabajo — dar
// un motivo para entrar HOY a quien no va a llegar a ningún hito — y es también
// el motivo de que tenga que quedarse pequeña: un pago plano grande aplanaría la
// escala entera y borraría la diferencia entre vivir el grupo y pasar a saludar.
//
// La columna "tirando" se aplana a propósito arriba: las tiradas de pago son
// cinco para todo el mundo, así que a partir de cierto punto lo único que sube
// es lo que da escribir. Un novato que no escriba jamás tiene un techo duro de
// 11 al día, menos que los 97 de escribir quinientos mensajes: no se puede
// vivir de tirar sin escribir, que es la regla de siempre.
//
// Un miembro normal paga dos comandos al día y se queda con ganas. Eso es lo
// que hace que un precio se note.

// Vuelve a 5.000 al recortar los ingresos. Subió a 8.000 cuando la cuenta de
// 30 días daba 10.600 para un activo; con el sueldo recortado esa misma cuenta
// da 3.459 gastando la mitad, así que 8.000 dejaba de ser "una fortuna del
// grupo" para ser un número inalcanzable.
const MILLONARIO = 5000;

// Con qué se entra al grupo. SUBIDO DE 75 A 150 por decisión del owner, junto
// con el 75/25 de la tirada y por el mismo motivo: había gente en números rojos
// y en rojo no se puede tocar el bot (ver SALDO_MINIMO — se puede caer en
// negativo por robos y apuestas, pero no se puede gastar estando ahí).
//
// El número que hay que mirar al cambiarlo es PRECIOS: el arranque tiene que
// dar para al menos una compra, o el que entra no puede tocar nada y el bot
// parece roto. Con 150 entra con dos compras caras (!tovid son 70) o seis
// baratas, así que puede probar el bot de verdad antes de tener que ganárselo.
//
// Y no es solo para los que entran: SUELO_TODOS de aquí abajo lo aplica también
// a los que ya estaban.
const ARRANQUE = 150;

// El arranque es además un SUELO para todo el mundo, no solo para los nuevos.
//
// Subir ARRANQUE a secas solo habría servido para quien entrara a partir de
// ahora, y el problema que se venía a resolver era justo el contrario: la gente
// que YA estaba en rojo seguiría sin poder usar nada. Al cargar el store se
// sube de una vez a todo el que esté por debajo (ver aplicarSuelo en
// utils/auraStore.js), una sola vez y con marca propia para que no se repita.
//
// No se toca a quien ya está por encima: esto levanta el suelo, no reparte.
const SUELO_TODOS = ARRANQUE;

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
// TECHO DE GANANCIA EN 50 por decisión del owner. El tramo grande era 40-80 y
// se recorta a 40-50: una tirada buena sigue siendo el doble larga que una
// floja, pero ya no hay tiradas que valgan por un día entero de escribir.
// Va de la mano de subir la probabilidad a 70 % (ver P_POSITIVA): se gana más
// veces y se gana menos de golpe, que es la combinación que mantiene la
// sensación de racha sin inflar el marcador.
const TIRADA = {
  grande: [40, 50],
  pequena: [10, 25],
};
const TIRADA_MIN = { grande: TIRADA.grande[0], pequena: TIRADA.pequena[0] };
const TIRADA_MAX = { grande: TIRADA.grande[1], pequena: TIRADA.pequena[1] };

// Probabilidad de que la tirada salga positiva, por rol. Se GANA más veces de
// las que se pierde: esa sensación es la que engancha y no se toca.
//
// Esto es SOLO el punto de partida. Encima se suma el bono de veteranía, que
// acumula con los mensajes escritos, y el resultado se tapa en P_TOPE_MIEMBRO
// para los miembros y en el 80 % del owner para el tier de arriba.
//
// Lo que frena que esto se convierta en una imprenta ya no es el multiplicador
// de pérdida (ver la nota larga más abajo) sino TIRADAS_PAGADAS: se cobra de
// verdad cinco veces al día y a partir de ahí se juega gratis, a cara o cruz.
// SUBIDO A 75/25 PARA EL MIEMBRO por decisión del owner (era 70/30, y antes
// 62/38). El motivo fue concreto: había demasiada gente en números rojos y sin
// aura no se puede usar el bot.
//
// Y esta vez se reescalaron los tres roles, no solo el de abajo. Con 70/73/80 y
// un tope común de 75, un miembro veterano igualaba al admin y lo superaba: el
// rol no valía nada. Ahora cada uno tiene base Y techo propios (ver P_TOPE) y
// los rangos no se solapan en ningún punto — un miembro llega como mucho al 80
// y la base de un admin ya es 82.
// SUBIDO A 75/25 PARA EL MIEMBRO por decision del owner, y con el admin y el
// owner reescalados por encima para que la jerarquia siga notandose. Antes el
// hueco entre miembro (70) y admin (73) era de tres puntos y el tope comun de
// 75 se los comia: un miembro veterano igualaba al admin y el rol dejaba de
// valer para nada. Ahora cada rol tiene su propia base Y su propio techo, y los
// tres rangos no se solapan en ningun punto.
const P_POSITIVA = {
  owner: 0.88,   // gana casi 9 de cada 10
  admin: 0.82,
  miembro: 0.75, // 75/25 pedido por el owner
};

// ─── El bono de veterania: suerte que se acumula ─────────────────────────────
//
// Cada ACTIVIDAD_MSGS mensajes de !count (el contador TOTAL, no el del día) se
// gana un escalón de suerte, y los escalones SE SUMAN. Antes era un interruptor:
// pasabas de 1.000 mensajes y te caía un +6 % fijo que ya no crecía nunca más,
// así que el que llevaba 900 y el que llevaba 40.000 iban casi igual.
//
// Y ADEMÁS NO SERVÍA PARA NADA, que es lo que se notaba en el grupo. Medido: el
// +6 % subía el acierto seis puntos y el valor esperado CUATRO CENTÉSIMAS por
// tirada, mientras la pérdida media pasaba de 51 a 67 y el peor golpe de −73 a
// −95. El veterano ganaba más veces y acababa el día peor que el novato. El
// bono estaba puesto, se anunciaba, y era una estafa — ver la nota del castigo
// aquí abajo, que es donde estaba la causa.
//
// El escalón es de +3 y no de +6 porque ahora se acumula: a los 2.000 mensajes
// ya estás donde antes te quedabas para siempre, y sigue subiendo.
const ACTIVIDAD_MSGS = 1000;   // cada cuántos mensajes de !count cae un escalón
const ACTIVIDAD_BONO = 0.03;   // +3 % de acierto por escalón, acumulables

// Tope del acierto de un miembro, esté como esté de veterano.
//
// Va por debajo del 80 % del owner a propósito y no se toca sin pedirlo: si un
// miembro pudiera igualarlo, el amaño dejaría de ser un amaño. Con +13 se llega
// a 75 % a los ~4.400 mensajes, o sea cinco escalones de progresión real.
// Con la base del miembro ya en 75 haria falta un techo mas alto o la veterania
// no tendria donde crecer: el bono se comeria contra el tope en el primer
// escalon y escribir dejaria de dar suerte, que es la unica progresion del bot.
//
// Un miembro llega como mucho al 80, justo por debajo de la BASE del admin (82),
// asi que ni el mas veterano alcanza a un admin recien nombrado. Y un admin
// llega como mucho al 85, por debajo del 88 del owner.
const P_TOPE = {
  owner: 0.88,
  admin: 0.85,
  miembro: 0.80,
};
const P_TOPE_MIEMBRO = P_TOPE.miembro;   // se mantiene el nombre viejo: lo usan otros modulos
const ACTIVIDAD_TOPE = 0.13;

// ─── Cuánto pesa perder ──────────────────────────────────────────────────────
//
// EL CASTIGO YA NO DEPENDE DE TU SUERTE. Es la corrección de fondo de todo este
// bloque y merece la pena entender qué estaba pasando antes.
//
// El multiplicador salía de TU PROPIA probabilidad: si ganabas el 62 % de las
// veces, una derrota pesaba 1,63 veces una victoria; al 80 %, pesaba 4. Sobre el
// papel era elegante — la cuenta se equilibraba sola y ningún rol podía imprimir
// aura. En la práctica tenía dos consecuencias, las dos malas:
//
//  1. TODA MEJORA DE SUERTE SE AUTODESTRUÍA. Ganar más a menudo obligaba a
//     perder más de golpe, y el valor esperado se quedaba clavado. Por eso el
//     bono de actividad parecía no aplicarse: aplicaba, pero no servía.
//  2. AL QUE MEJOR LE IBA, MÁS LE DOLÍA. Un veterano con suerte veía golpes de
//     −95 mientras un novato veía −73. Justo al revés de lo que se espera.
//
// Ahora el castigo es el MISMO PARA TODOS: el tramo pequeño (10-25) por un
// multiplicador fijo. Un golpe malo mueve 26-66, con media 46, tires como tires
// y seas quien seas. Lo único que decide la suerte es CADA CUÁNTO te toca.
//
// Con eso la suerte pasa a ser una ventaja de verdad y se puede leer de un
// vistazo quién gana qué por tirada:
//
//   novato (62 %) ......  +2,2     un miembro recién llegado
//   admin  (68 %) ......  +7,2
//   veterano (75 %) ....  +12,4    con el bono de veteranía al tope
//   owner  (80 %) ......  +16,3
//
// EL FRENO. Un valor esperado positivo y sin tope es una imprenta: 960 tiradas
// al día (una cada 90 s las 24 h, automatizable) darían miles de aura. Por eso
// existe TIRADAS_PAGADAS aquí abajo. No prohíbe tirar — eso ya se probó y
// convierte el comando en mirar un contador — sino que a partir de ahí la
// tirada pasa a ser una moneda al aire limpia: 50 % y el mismo importe a los dos
// lados, valor esperado CERO exacto. Sigues jugando, dejas de cobrar.
//
// El multiplicador del golpe NORMAL, que es 3 de cada 4. Bajado de 1,6 a 1,4 al
// pasar el miembro a 75/25: la pérdida pequeña va de 14 a 35. El golpe gordo
// tiene su propio multiplicador justo debajo.
//
// La relación con la ganancia se invierte respecto a como estaba: antes perder
// pesaba vez y media lo que pesaba ganar, y ahora pesa MENOS (media de 28 en
// contra de una media de 30 a favor). Es coherente con lo demás que se ha
// pedido — más probabilidad de ganar y menos importe — y hace que la tirada
// sea claramente favorable al jugador. El freno que impide que eso sea una
// imprenta sigue siendo TIRADAS_PAGADAS, no el castigo.
const MULT_CASTIGO = 1.4;

// EL GOLPE GORDO, que antes no existia. Perder tenia un solo tamanyo: el tramo
// pequenyo por el multiplicador, 16-40 siempre. El tier "cursed" cambiaba las
// frases pero no el importe, asi que el drama lo ponia el texto y no el marcador
// — y el jugador no notaba diferencia entre una mala tirada y un desastre.
//
// Ahora la perdida tiene los dos tamanyos que ya tenia la ganancia. Una de cada
// cuatro derrotas sale del tramo GRANDE (48-60 de perdida), que duele de verdad
// y le da sentido a las frases de "cursed". Las otras tres son el golpe normal
// de 14-35.
const MULT_CASTIGO_GRANDE = 1.2;

// Cada cuanto la tirada sale por el tramo grande, gane o pierda. Antes era un
// 0.34 suelto escrito dos veces dentro de aura.js; aqui esta una sola vez y con
// nombre, que es donde vive el resto de la escala.
const P_TRAMO_GRANDE = { gana: 0.30, pierde: 0.25 };

// Cuántas tiradas del día pagan de verdad. La 6ª y siguientes son moneda al aire
// a valor esperado cero (ver arriba).
//
// El número sale de una cuenta, no del gusto: multiplica directamente al ingreso
// diario de TODO el mundo por igual, porque las tiradas de pago no dependen de
// lo que escribas. Con ocho, un miembro de 200 mensajes al día se plantaba en
// 115 de aura diarios — casi seis veces lo que ingresaba antes de todo esto, que
// es justo la cifra que se acaba de recortar. Con cinco se queda en torno a 78 y
// la escala aguanta.
//
// Si algún día hay que mover el ingreso general arriba o abajo, ESTE es el
// número, y es el más directo que hay: cada tirada de pago vale entre 2 (novato)
// y 16 (owner) de aura al día.
const TIRADAS_PAGADAS = 5;

const mediaRango = ([min, max]) => (min + max) / 2;   // TIRADA es [min, max]
const MEDIA_PREMIO  = P_TRAMO_GRANDE.gana * mediaRango(TIRADA.grande)
                    + (1 - P_TRAMO_GRANDE.gana) * mediaRango(TIRADA.pequena);
const MEDIA_CASTIGO = P_TRAMO_GRANDE.pierde * mediaRango(TIRADA.grande) * MULT_CASTIGO_GRANDE
                    + (1 - P_TRAMO_GRANDE.pierde) * mediaRango(TIRADA.pequena) * MULT_CASTIGO;

// Cuánta suerte da haber escrito `mensajes` en total. Acumulativa y con tope.
function bonoActividad(mensajes) {
  if (!mensajes || mensajes < ACTIVIDAD_MSGS) return 0;
  const escalones = Math.floor(mensajes / ACTIVIDAD_MSGS);
  return Math.min(ACTIVIDAD_TOPE, escalones * ACTIVIDAD_BONO);
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
//     pierdes, y con un 45 % de acierto el crecimiento esperado por jugada es
//     negativo (−0,20 en logaritmo). Encadenar apuestas te lleva al suelo solo,
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
// Se pierde más veces de las que se gana, que es lo que hace que ganar se cuente
// durante una semana. Sube por rol igual que en la tirada normal.
//
// SUBIDAS AL REEQUILIBRAR (miembro 42 → 45 %, admin 45 → 47 %). A 42 % con
// premio doble la casa se quedaba el 16 % de lo apostado, que para una apuesta
// que además pone media cuenta sobre la mesa es de máquina de aeropuerto: un
// casino de verdad se queda entre el 1 y el 10 %. Ahora son el 10 % y el 6 %.
//
// Sigue siendo desfavorable, y tiene que serlo: la apuesta es EL sumidero que
// compensa el goteo positivo de la tirada normal. Lo que se quita es el abuso,
// no el filo.
const APUESTA = {
  // La cantidad LA ELIGE quien juega: *!aura apostar 500*. La fracción es solo
  // lo que se pone si no se dice cifra, para que el comando siga sirviendo a
  // secas. Elegir cuánto es lo que convierte la apuesta en una decisión: jugarse
  // 100 cuando tienes 4.000 y jugarse los 4.000 no son la misma jugada.
  apuestaMin: 100,      // por debajo de esto no es arriesgar, es hacer ruido
  fraccion: 0.5,        // cuánto del saldo se pone en la mesa si no se dice nada
  // Subido de 300 a 500 con el arranque: con el suelo en 250, apostar desde 300
  // ponía 150 sobre la mesa y el suelo devolvía 100 al perder, así que la
  // apuesta mínima casi no dolía. Desde 500 se juegan 250 y se pierden 250.
  minimo: 500,          // por debajo no hay nada que arriesgar
  multiplicador: 2,     // ganar paga el doble de lo apostado
  suelo: ARRANQUE,      // perder nunca te deja por debajo del arranque
  cooldownMin: 180,     // tres horas entre apuestas
  p: { owner: 0.58, admin: 0.47, miembro: 0.45 },
};

// EL SUELDO SE QUITO. Estuvo aqui poco: pagaba 1-3 de aura cada 10 mensajes,
// en silencio, y era la renta base de quien no llega a los hitos. Se retira por
// decision del owner y el hueco que tapaba lo cubre ahora el bono de veterania,
// que paga por lo mismo — escribir — pero a traves de las tiradas en vez de por
// goteo automatico. Es mejor sitio: se cobra jugando, no de fondo.
//
// Si alguna vez vuelve a hacer falta una renta pasiva, el aviso que dejo esta
// experiencia es de tamaño, no de concepto: a 0,40 por mensaje multiplicaba por
// cinco y medio el ingreso de un miembro normal y convertia los precios en
// calderilla en dos dias.

// ─── La racha: premia APARECER, no escribir mucho ────────────────────────────
//
// Es la tercera pata y cubre el hueco que dejaban las otras dos. Los bonos
// premian el VOLUMEN de un día y la veteranía el TOTAL acumulado; ninguna de las
// dos da un motivo para entrar HOY en vez de mañana. La racha sí: cada día
// seguido que apareces sube un escalón, y faltar un solo día la parte entera.
//
// TRES DECISIONES QUE IMPORTAN:
//
//  1. EL PAGO ES PLANO, no proporcional a lo que escribes. A propósito: es lo
//     único de toda la economía que un miembro tranquilo puede ganar igual que
//     el que más habla. Si escalara con el volumen sería otro bono más y el que
//     escribe poco seguiría sin tener motivo para volver.
//  2. ES PEQUEÑO. El valor de una racha está en el NÚMERO y en perderlo, no en
//     lo que paga. A tope son 20 al día — menos de un comando medio. Subirlo
//     sería repetir el error del sueldo.
//  3. HAY QUE APARECER DE VERDAD. Con `minMensajes` no basta con soltar un "ok"
//     para mantenerla viva; si bastara, la racha mediría quién se acuerda de
//     saludar, no quién está en el grupo.
//
// El corte del día NO es a medianoche. A las 5 de la mañana no hay nadie
// escribiendo, así que nadie pierde una racha de treinta días por seguir la
// conversación a las 00:30. A medianoche eso pasaría constantemente.
const RACHA = {
  minMensajes: 10,      // mensajes que hay que escribir para que el día cuente
  pago: 2,              // por cada día de racha...
  tope: 10,             // ...hasta este, o sea 20 al día como techo
  hitos: [7, 15, 30, 50, 100, 200, 365],   // los días que el bot canta en el grupo
  minParaLlorarla: 7,   // por debajo de esto, romperla no se anuncia
  horaCorte: 5,         // el día cambia a las 5 de la mañana, hora española
  zona: 'Europe/Madrid',
};

// ─── Bonos por actividad (tramos de 200 / 500 / 1000 mensajes diarios) ───────
//
// [suelo, rango] por etiqueta. El importe final es suelo + rand(rango).
//
// SE SUBIERON Y SE HAN DEVUELTO A DONDE ESTABAN. Al reequilibrar se inflaron un
// 50 % el tier 1 y un 25 % el tier 3, y sumado al sueldo daba un ingreso cinco
// veces y media el de antes para un miembro normal. Demasiado: con eso los
// precios dejaban de morder y un comando pasaba a ser calderilla, que es
// justo lo contrario de lo que se pidió cuando se subieron.
//
// Estas cifras estaban calibradas y funcionaban. Lo único que sobraba en la
// economía era que NO HUBIERA NADA por debajo de los 200 mensajes, y eso lo
// arregla el sueldo, no inflar los botes. Un hito tiene que seguir siendo un
// premio ocasional; el goteo constante es cosa del sueldo.
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
// AHORA SE COBRA POR TODO. Antes solo por lo que gastaba recursos, y los juegos
// de porcentaje iban gratis con el argumento de que cobrarlos mataría el uso del
// grupo. Se cambió por decisión del owner: si el aura no compra nada, no vale
// nada, y un marcador que no se gasta es un número decorativo.
//
// Los precios son CAROS a propósito. Medido contra lo que se gana al día:
// alguien de 500 mensajes (107/día) hace tres o cuatro cosas; el de 1.200
// (337/día) llega a diez. El que no escribe no toca el bot, que es exactamente
// la regla de siempre llevada hasta el final.
//
// Siguen gratis, y no por olvido: !aura y sus subcomandos (son la fuente),
// !robo, !duel y !dar (ya se juegan aura de verdad), y todo lo de admin.
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
  // ─── Lo que consume recursos de verdad ─────────────────────────────────────
  tovid: 70,   // transcodifica el vídeo entero con preset slow: lo más caro
  grok: 50,    // llamada a la IA, con su cuota
  sticker: 45, // !s — un ffmpeg por cada uno
  toimg: 45,
  play: 40,    // canción: ancho de banda + cuota de RapidAPI + ffmpeg
  fk: 35,      // análisis de cuenta falsa
  ttp: 30,     // texto a sticker
  pfp: 25,     // foto de perfil
  cachelist: 12, // la lista de lo ya guardado: barata a propósito, es el atajo

  // ─── Lo que molesta al grupo ───────────────────────────────────────────────
  // No cuestan CPU, cuestan paciencia: mencionan a media docena de personas de
  // golpe y son de lo más fácil de disparar en bucle.
  top10: 55,
  top5: 30,
  inactivos: 35,
  vs: 30,
  fantasmas: 30,
  count: 25,
  relevancia: 25,

  // ─── Las dinámicas ─────────────────────────────────────────────────────────
  // Antes gratis. Ahora el aura vale para algo más que mirarla, y reírse de
  // alguien cuesta dinero como todo lo demás.
  roast: 35,
  mog: 35,
  ship: 30,
  rizz: 30,
  piropo: 30,
  wingman: 30,
  percent: 25,   // el precio común de gay, puta, iq, fea, crack y compañía
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
  MILLONARIO, ARRANQUE, SUELO_TODOS,
  TIRADA, TIRADA_MIN, TIRADA_MAX, P_POSITIVA, ACTIVIDAD_MSGS, ACTIVIDAD_BONO, ACTIVIDAD_TOPE,
  P_TOPE_MIEMBRO, P_TOPE, MULT_CASTIGO, MULT_CASTIGO_GRANDE, P_TRAMO_GRANDE, TIRADAS_PAGADAS, MEDIA_PREMIO, MEDIA_CASTIGO, bonoActividad, APUESTA,
  RACHA, BONOS, REDENCION,
  ROBO, RIESGO, ROBO_BASE, ROBO_LIMITES, ROBO_OWNER_MIN, DUELO, REGALO_MIN,
  BOTE, OBJETOS, CONTRA, DIANA,
  PRECIOS, SALDO_MINIMO,
  rango,
};
