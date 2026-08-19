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
// SUBIDOS por decision del owner: se ganaba poco y los comandos salian caros,
// asi que la gente no llegaba a usar el bot.
//
// AQUI NO SE REPITEN LAS CIFRAS. Este comentario decia "la pequenya pasa a
// 20-40 y la grande a 50-70" y los valores de abajo eran otros: un comentario
// que copia el numero que tiene debajo se queda viejo en el primer reajuste y
// despues miente a quien lo lee para decidir. Los rangos estan en TIRADA, dos
// lineas mas abajo, y son la unica fuente.
const TIRADA = {
  grande: [45, 60],
  pequena: [15, 30],
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

// ─── Veterania que SI crece: se paga en cantidad, no en suerte ───────────────
//
// EXISTE PORQUE LA PROGRESION ESTABA MUERTA. El bono de veterania sube la
// probabilidad, pero esa probabilidad choca contra P_TOPE.miembro (0,80) partiendo
// de una base de 0,75: o sea que el margen real son cinco puntos y un miembro los
// agota alrededor de los 1.700 mensajes. A partir de ahi escribir mas no daba
// NADA, y eso en un bot cuya unica progresion es escribir.
//
// El tope no se toca —esta ahi para que ningun miembro alcance a un admin, y
// levantarlo desarma el amaño entero—, asi que la veterania se paga por otro
// lado: cuando ganas, ganas MAS. Eso no toca ninguna probabilidad ni acerca a
// nadie al owner, y encima se nota mas que un 3 % invisible.
//
// El tope del 40 % se alcanza a los 20.000 mensajes, que es un veterano de
// verdad. Y solo multiplica lo GANADO: no reduce el castigo al perder, asi que
// no convierte a nadie en intocable.
const VETERANIA_MSGS = 1000;   // cada cuántos mensajes sube un escalón
const VETERANIA_PAGO = 0.02;   // +2 % a lo que ganas por escalón
const VETERANIA_TOPE = 0.40;   // ...hasta un +40 %

function bonoVeterania(mensajes) {
  if (!mensajes || mensajes < VETERANIA_MSGS) return 0;
  return Math.min(VETERANIA_TOPE, Math.floor(mensajes / VETERANIA_MSGS) * VETERANIA_PAGO);
}

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
// SUBIDO, de la mano del cooldown de la tirada. Ninguna de las dos cifras se
// escribe aqui: este comentario decia "de 5 a 10" con la constante en 8, y el
// del cooldown decia quince cuando eran diez. Los numeros viven en las
// constantes y en ningun otro sitio.
//
// El freno sigue donde estaba: pasadas las de pago, la tirada es cara o cruz a
// valor esperado CERO, asi que darle al boton toda la noche no fabrica nada.
const TIRADAS_PAGADAS = 8;

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
  // SUBIDO DE 100 A 300 por decision del owner: se apuesta desde 300 para
  // arriba. Una apuesta de 100 no era una apuesta, era pulsar un boton — se
  // perdia menos de lo que da un dia escribiendo y no dolia nada.
  apuestaMin: 300,      // por debajo de esto no es arriesgar, es hacer ruido
  fraccion: 0.5,        // cuánto del saldo se pone en la mesa si no se dice nada
  // Subido de 300 a 500 con el arranque: con el suelo en 250, apostar desde 300
  // ponía 150 sobre la mesa y el suelo devolvía 100 al perder, así que la
  // apuesta mínima casi no dolía. Desde 500 se juegan 250 y se pierden 250.
  // BAJADO DE 500 A 300 por decision del owner: apostar tenia que empezar antes.
  // Con el suelo en 150, desde 300 se juega de verdad — el que pierde una
  // apuesta minima se queda en el suelo y nota que ha perdido.
  minimo: 300,          // saldo minimo para poder sentarse a la mesa
  multiplicador: 2,     // pago base: ganar paga el doble de lo apostado

  // El pago SUBE con lo que te juegas de lo tuyo.
  //
  // Antes pagaba x2 tanto si ponias 300 teniendo 20.000 como si ponias los
  // 20.000 enteros, y esas dos no son la misma jugada: la primera es calderilla
  // y la segunda es jugarse el puesto en el ranking. Ahora la segunda paga mas.
  //
  // El techo son x2,10 y no mas, y no es tacanyeria: con la probabilidad de un
  // admin (0,47) un pago de x2,13 ya deja al jugador con ventaja sobre la casa,
  // y ahi la apuesta pasa de ser un sumidero a ser una impresora de aura. El
  // premio grande de verdad no esta en el multiplicador: esta en que ahora se
  // puede poner sobre la mesa TODO lo que tengas, asi que ganar paga miles.
  multiplicadorMax: 2.10,
  fraccionRiesgo: 0.60, // a partir de jugarte este % de tu aura, pago maximo
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
  // SUBIDO DE 2 A 6 y el tope de 10 a 20 dias por decision del owner: la racha
  // pagaba 20 al dia en el mejor caso, menos de la mitad de UNA tirada de
  // !aura. Aparecer todos los dias durante diez seguidos valia menos que pulsar
  // un boton una vez, asi que no era un incentivo, era un adorno.
  pago: 3,              // por cada día de racha...
  tope: 11,             // ...hasta este, o sea 33 al día como techo
  hitos: [7, 15, 30, 50, 100, 200, 365],   // los días que el bot canta en el grupo

  // Y ADEMAS UN PREMIO GORDO AL LLEGAR A CADA HITO.
  //
  // El goteo diario mantiene la costumbre; esto es lo que hace que llegar a los
  // 30 dias signifique algo. Son pagos de una sola vez y estan durisimamente
  // limitados por lo que cuesta conseguirlos: para cobrar el de 100 hay que
  // escribir 10 mensajes al dia durante cien dias SIN fallar uno solo. No hay
  // forma de acelerarlo con dinero ni de repetirlo.
  premioHito: { 7: 150, 15: 350, 30: 700, 50: 1200, 100: 2500, 200: 5000, 365: 10000 },
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
  // EL TECHO FIJO DE 200 SE FUE. Lo pidio el owner: se roba la cantidad que se
  // elija. Ahora el limite lo ponen las dos cosas que no se pueden saltar sin
  // romper la economia — lo que la victima TIENE y lo que el ladron podria
  // pagar si le sale mal — y nada mas.
  //
  // Que esto no descuadre el ranking no depende de un tope: depende de que
  // pedir mucho sea muy dificil de acertar. Ver RIESGO.codiciaMax, que subio a
  // la vez que esto y por esto.
  techoFraccion: 1,       // se puede pedir hasta todo lo que tenga la victima
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
  // SUBIDO DE 0,14 A 0,30 al quitar el techo fijo del robo, y es la pieza que
  // sostiene todo lo demas. Sin techo, la jugada obvia seria pedir siempre la
  // fortuna entera de la victima; con este castigo, pedirlo todo hunde la
  // probabilidad hasta el suelo (15 %) y sale a perder de largo. El punto dulce
  // sigue en el 45 % del tope: ahi es donde compensa.
  codiciaMax: 0.30,   // castigo al pedir el tope entero
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

// Cuanto acierta el owner principal cuando roba. NO es 1.
//
// Estuvo en exito garantizado y el owner lo pidio bajar: ganar SIEMPRE deja de
// parecer suerte a la tercera vez y se nota mas que cualquier cifra.
//
// Bajado despues a 0,74: con 0,84 seguia encadenando victorias demasiado
// seguidas. Con 0,74 falla uno de cada cuatro — gana con mucha regularidad (un
// miembro anda por el 38 %) pero pierde lo bastante a menudo como para que
// nadie pueda sostener que el bot le regala los robos.
//
// BAJADO DE 0,74 A 0,62, y por segunda vez, porque 0,74 seguia cantando: es casi
// el DOBLE de lo que acierta un miembro (38 %). Contando veinte robos, con 0,74
// salen unos 15 aciertos donde se esperaban 7 — casi cuatro desviaciones tipicas.
// Eso no es tener suerte, es una anomalia que cualquiera nota sin contar nada.
// Con 0,62 salen unos 12 contra 7: sigue siendo mejor mano que la de nadie, pero
// entra en lo que se puede explicar con suerte.
const ROBO_OWNER_EXITO = 0.62;

// PERO LA TASA NO ERA EL PROBLEMA PRINCIPAL. Lo que delata un amaño no es el
// porcentaje, es la RACHA: nadie del grupo lleva la cuenta de cuantos robos
// acierta el owner, pero todos ven cuando gana seis seguidos. Un 62 % suelto
// produce rachas de seis con bastante frecuencia (0,62^6 ≈ 1 de cada 18), y es
// justo lo que se estaba viendo.
//
// Asi que hay un techo duro: a la cuarta seguida, el dado no decide — pierde.
// Cuesta muy poco valor esperado (recorta del 62 % al ~57 % efectivo) y elimina
// por completo el sintoma que se nota.
//
// El contador es COMPARTIDO entre !robo y !contrarobo a proposito: el grupo ve
// las dos cosas en el mismo chat y no distingue de que comando venia cada
// victoria. Contarlas por separado dejaria pasar rachas de seis mezcladas.
const ROBO_OWNER_RACHA_MAX = 3;

// La cifra que se le ENSEÑA al owner cuando roba, que no es la suya.
//
// Antes se calculaba como si fuera un miembro normal, y con el castigo por
// codicia al 30 % —el que sostiene el robo sin techo— esa cuenta se hundia
// contra el suelo del 15 % en cuanto pedia una cantidad grande. Resultado: el
// bot le cantaba SIEMPRE "15 % de salir bien" y acto seguido salia bien. Un
// numero fijo repitiendose es justo lo que delata que hay un amaño detras.
//
// Ahora se le enseña un valor dentro de la banda en la que se mueve un miembro
// de verdad, con variacion en cada tirada: creible y distinto cada vez.
const ROBO_OWNER_VISIBLE = { min: 0.24, max: 0.46 };

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

// ─── EL ATRACO A LA TIENDA ───────────────────────────────────────────────────
//
// Jugar contra la casa, que es lo unico que faltaba: todo lo demas del bot es
// jugar contra otra persona (robo, duelo, contraataque) o contra el azar puro
// (tirada, apuesta). Aqui enfrente hay un negocio, y un negocio se defiende.
//
// EN QUE SE DIFERENCIA DEL BOTE, que es la pregunta importante porque si no
// serian dos loterias con distinto nombre:
//
//                   bote                      caja de la tienda
//   se llena con    robos fallidos y          las compras del grupo
//                   apuestas perdidas          (o sea: gastar la alimenta)
//   entrar cuesta   60 fijos                  nada
//   probabilidad    16 % siempre              baja con cada intento
//   si fallas       pierdes la entrada        multa y la tienda te veta
//   te llevas       el bote entero            una parte, segun salga
//
// La pieza que lo hace un juego y no una tragaperras es la SEGURIDAD: cada
// intento la sube y el tiempo la baja. Asi que la caja es un recurso que se
// agota y se regenera, y el grupo tiene que decidir cuando entrar y cuanto
// esperar. Una probabilidad fija no da esa decision.
//
// Y NO IMPRIME AURA. Lo que sale de la caja entro antes por una compra: se
// desvia una parte de cada objeto comprado en vez de destruirla entera. El
// resto se sigue destruyendo, asi que la tienda no deja de ser un sumidero,
// solo devuelve parte de lo que traga y con mucho riesgo por medio.
const ATRACO = {
  fraccionDeCompra: 0.40,  // cuanto de cada objeto comprado cae a la caja
  minimoParaAtracar: 300,  // por debajo de esto no hay nada que llevarse

  base: 0.34,              // con la tienda tranquila
  subeSeguridad: 0.09,     // cada intento la sube, salga bien o mal
  seguridadMax: 0.24,      // pero nunca por debajo del 10 %: siempre es un tiro
  enfriaHoras: 6,          // y se relaja del todo en este tiempo

  // Cuanto de la caja se lleva quien acierta. No es todo: la tienda cierra a
  // tiempo y salva parte. Que sea variable es lo que hace que dos atracos
  // buenos no se cuenten igual.
  botin: { min: 0.35, max: 0.75 },

  // Si falla, paga. Y lo que paga VUELVE A LA CAJA, no se destruye: cada intento
  // fallido deja el proximo mas goloso, que es como se mantiene viva la mesa.
  multa: 0.20,             // de lo que habia en la caja...
  multaTope: 400,          // ...con tope, para que un mal dia no arruine a nadie

  vetoHoras: 3,            // y no puede comprar en la tienda durante este rato
};

// LOS OBJETOS. Dan una decisión ANTES de robar, no solo al robar.
//
// LOS PRECIOS SE REHICIERON. Estaban puestos contra "un robo medio mueve unos
// 40-60", que era cierto cuando el robo tenia techo fijo de 200. Al quitarse ese
// techo (ROBO.techoFraccion = 1) el robo pasó a mover cientos, la referencia se
// quedó vieja y nadie volvió a hacer la cuenta. Resultado: tres objetos costaban
// mas de lo que podian llegar a valer NUNCA —no caros, imposibles— y la ganzua
// se quedo sin tope y valia mucho mas de lo que costaba.
//
// La referencia ahora es doble y esta medida, no estimada:
//   · lo que el objeto aporta de valor esperado en su uso previsto;
//   · y lo que ingresa al dia quien lo va a comprar (188 un usuario normal).
const OBJETOS = {
  // LOS DE DURACION SUBEN SIN MAS, y hay un motivo por el que se puede: no
  // producen aura, la protegen o la ahorran. No hay bucle que cerrar con ellos,
  // asi que aqui el unico limite es que sigan siendo una decision y no un
  // tramite. Se ha ido a lo generoso.
  escudo: { precio: 180, horas: 24, desc: 'nadie te puede robar durante 24 h' },
  // LA GANZUA LLEVA TOPE, y le hacia mucha falta. Es el mismo fallo que el
  // amuleto tenia previsto y esta no: un bono de probabilidad sobre lo pedido
  // vale mas cuanto mas se pide. Sin tope, con las dos fortunas en 5.000 y
  // pidiendo en el punto dulce (2.250), aportaba 627 de valor esperado y costaba
  // 140 — y ademas daba la vuelta al signo del robo, que pasaba de -139 a +488.
  // O sea que la jugada optima era comprar ganzuas en bucle y robar fuerte.
  //
  // Ahora el bono se diluye a partir de topeRobo: entero hasta 800, y de ahi en
  // adelante proporcional. Abre una cerradura, no una camara acorazada.
  //
  // Y EL PRECIO SE QUEDA EN 140, que es la excepcion de esta tanda: la ganzua no
  // estaba cara, estaba REGALADA. Con el tope aporta 223 como maximo, asi que a
  // 140 sale a cuenta desde unos 500 de botin (1,6 veces lo que cuesta) y el
  // bucle de comprar-y-robar se queda en -17. Bajarla ademas la habria devuelto
  // a ser imprenta por otro camino.
  ganzua: { precio: 60,  usos: 1,   bono: 0.18, topeRobo: 800, ventaja: true,
            desc: '+18 % en tu próximo robo (sobre los primeros 800)' },
  // El cebo ademas pega mas fuerte: aparentar x2.5 en vez de x2 hunde al ladron
  // que pica del 38 % al 15 %, o sea al suelo. El multiplicador estaba escrito a
  // pelo dentro de robo.js (`auraV * 2`) y ahora sale de aqui, que es donde
  // tienen que estar las cifras del juego.
  cebo:   { precio: 90,  horas: 16, multiplicador: 2.5,
            desc: 'aparentas dos veces y media tu aura durante 16 h' },

  // ─── Los caros: no son para robar, son para que el bot no te toque ────────
  //
  // Cuestan lo que cuestan a proposito. Un escudo son 180; estos valen entre
  // tres y ocho veces mas, porque no dan ventaja en una tirada: compran permiso.
  // Si salieran baratos, el !allow dejaria de ser una decision de un admin y
  // pasaria a ser un tramite, y la moderacion automatica dejaria de existir.
  //
  // Rebajados, pero siguen siendo los caros. 600 y 1.500 eran tres y ocho dias
  // de un usuario normal (188/dia) por algo que dura 24 y 48 horas: el indulto
  // pedia una semana de trabajo para dos dias de cobertura parcial, y ni el mas
  // rico hacia esa cuenta. A 400 y 900 siguen doliendo —dos dias y cinco— pero
  // son una decision que alguien puede llegar a tomar, que es el punto.
  pase:    { precio: 400,  horas: 48, desc: 'publicas tus redes 48 h sin que el bot te borre nada' },

  // OJO CON EL ALCANCE: el indulto solo para al BOT, y solo cuando actua SOLO.
  // No protege de un !kick ni de un !fkban de un admin, ni deberia: el dia que
  // el aura compre inmunidad frente a una persona, el owner deja de mandar en
  // su propio grupo y la tienda se convierte en un agujero de moderacion.
  // Es un seguro contra el automatismo, no un salvoconducto.
  indulto: { precio: 900,  horas: 72, desc: 'el bot no te banea solo durante 72 h — no te salva de un admin' },

  // ─── Los de la mesa ────────────────────────────────────────────────────────
  //
  // POR QUE LOS DOS LLEVAN TOPE. Cualquier ventaja proporcional a lo apostado
  // se convierte en una impresora de aura en cuanto alguien apuesta fuerte: un
  // +8 % de probabilidad sobre una apuesta de 5.000 vale 800 de valor esperado,
  // asi que sin tope se compra y se apuesta el maximo en bucle.
  //
  // EL TOPE ES LO QUE IMPIDE ESO, NO EL PRECIO. Y estaba haciendo las dos cosas:
  // los precios se pusieron ademas por encima de lo que el objeto podia llegar a
  // valer NUNCA —450 por un amuleto que como mucho aporta 338, 600 por un seguro
  // que como mucho devuelve 440— asi que no eran caros, eran imposibles. Ningun
  // nivel de juego los amortizaba y por eso no los compraba nadie.
  //
  // El criterio ahora es otro, y es el que deberia haber sido desde el principio:
  //
  //   · el precio va por DEBAJO de lo que el objeto aporta en su uso previsto,
  //     para que comprarlo sea una buena jugada de quien ya iba a apostar fuerte;
  //   · y por ENCIMA de lo que aporta menos la ventaja de la casa, para que
  //     comprar-y-apostar en bucle salga a cero y no imprima.
  //
  // Entre esas dos cifras hay una horquilla estrecha (la ventaja de la casa, un
  // 5 %) y el precio va dentro. Ver el desglose en la nota de cada uno.
  // Aporta como mucho 338 (a partir de 2.000 apostados). A 240 sale a cuenta
  // desde unos 1.200 de apuesta, y comprar+apostar el maximo queda en cero
  // exacto: -100 de la casa +338 del amuleto -240 del precio = -2.
  amuleto: { precio: 165, usos: 1, bono: 0.08, topeApuesta: 2000, ventaja: true,
             desc: '+8 % en tu próxima apuesta (sobre los primeros 2.000)' },

  // Devuelve como mucho 440 de media (a partir de 1.600 apostados). A 360 sale a
  // cuenta desde unos 1.300, y el bucle vuelve a quedar en cero: -80 +440 -360.
  seguro:  { precio: 290, usos: 1, recupera: 0.5, topeDevuelto: 800, ventaja: true,
             desc: 'si pierdes la próxima apuesta recuperas la mitad (máx. 800)' },

  // Descuento en todo lo que se paga.
  //
  // EL PRECIO SALE DE UNA CUENTA, y la cuenta estaba mal. Con el comando medio
  // real (34,7) y un 25 % de descuento se ahorran 8,7 por comando, o sea que a
  // 500 hacian falta 58 comandos EN DOCE HORAS para amortizarlo. Un usuario
  // intenso hace 40-50 comandos AL DIA. Nadie llegaba, nunca.
  //
  // A 250 el corte esta en 29 comandos en doce horas: eso lo alcanza quien pasa
  // la tarde en el chat y no lo alcanza quien lo compra por si acaso, que es
  // exactamente donde tenia que estar la linea.
  socio:   { precio: 250, horas: 24, descuento: 0.30 },
};

// ─── EL LIMITE DE LOS OBJETOS DE VENTAJA ─────────────────────────────────────
//
// Los tres objetos marcados `ventaja: true` (ganzua, amuleto, seguro) acaban de
// bajar de precio, y eso los vuelve POSITIVOS: comprarlos y jugar bien deja unos
// +70 en vez de quedarse a cero. Era lo que habia que arreglar — el objeto solo
// llegaba a cancelar la ventaja de la casa y nunca a superarla, asi que lo mejor
// que podia pasarte comprandolo era no perder nada.
//
// Pero eso obliga a cambiar QUIEN sostiene la economia. Antes lo hacia el
// precio: estaba puesto justo por encima de lo que el objeto podia dar, y por
// eso no habia bucle... y por eso tampoco habia premio. Ahora lo sostiene esto:
//
//   solo se puede comprar UNO de los tres cada 12 h.
//
// Compartido entre los tres a proposito, no uno por objeto. Dos motivos: acota
// la extraccion maxima a dos compras al dia —unos +140 en el mejor de los casos
// imaginables, y eso apostando 2.000 con la varianza que eso trae— y ademas
// obliga a elegir entre ir a robar o ir a la mesa, que es una decision de verdad
// donde antes no habia ninguna.
const VENTAJA = {
  cooldownHoras: 12,
};

// EL CONTRAATAQUE. Tras un robo con éxito, la víctima tiene una ventana para
// devolver el golpe a doble o nada. Es lo que convierte un robo en un
// intercambio: el ladrón ya no se va de rositas, se queda mirando el chat.
const CONTRA = {
  ventanaSeg: 90,       // lo que tiene la víctima para responder
  multiplicador: 2,     // recupera el doble de lo que le quitaron...
  probabilidad: 0.42,   // ...con menos de una moneda al aire

  // El contraataque del owner tampoco es del 100 %.
  //
  // Estaba puesto a exito garantizado, igual que estaba el robo. Y es el sitio
  // donde MAS canta: el contraataque se responde en caliente, delante del que
  // acaba de robarte y con el grupo mirando la jugada. Que el owner devuelva el
  // golpe SIEMPRE, con exito, mientras al resto le sale menos de la mitad de
  // las veces, se aprende en tres tardes.
  //
  // Bajado de 0,78 a 0,66 por lo mismo que el robo: 0,78 contra el 42 % de
  // cualquiera era casi el doble, y ademas el contraataque se resuelve en
  // caliente y delante del que acaba de robarte, o sea que se mira mas.
  //
  // Y cuenta para la misma racha que el robo (ROBO_OWNER_RACHA_MAX): a la cuarta
  // victoria seguida entre los dos comandos, esta se pierde.
  owner: 0.66,

  // ─── LA VELOCIDAD IMPORTA ──────────────────────────────────────────────────
  //
  // Antes la ventana de 90 s solo decia si llegabas o no: responder al segundo y
  // responder en el 89 valian exactamente lo mismo, asi que la jugada optima era
  // esperar por si acaso. Eso no es una ventana, es un plazo.
  //
  // Ahora el que responde EN CALIENTE tiene mas probabilidad, y se va cayendo
  // hasta el final de la ventana. Le da sentido a que sean noventa segundos y
  // premia lo unico que el bot no puede fingir: estar delante del chat.
  segRapido: 15,        // hasta aqui, el bono entero
  bonoRapido: 0.14,     // y de ahi baja en linea recta hasta cero al cerrarse

  // ─── LOS DESENLACES ────────────────────────────────────────────────────────
  //
  // El robo lleva cinco desenlaces desde hace tiempo (golpe maestro, limpio, a
  // medias, fallo, desastre) y el contraataque seguia siendo cara o cruz: o el
  // doble o nada. La respuesta al robo era menos interesante que el robo.
  //
  // Mismos cinco escalones, con los pesos dentro de cada rama:
  //
  //   ganando   demoledor  le pillas con el botin en la mano y sale carisimo
  //             limpio     el doble de siempre
  //             raspado    recuperas lo tuyo y ni un aura mas
  //   perdiendo fallo      pagas otra vez lo que te quitaron
  //             ruina      pagas casi el doble por listo
  //
  // Esto NO infla la economia: gane quien gane, el aura pasa de un bolsillo al
  // otro. Los pesos solo deciden el drama.
  desenlaces: {
    demoledor: { peso: 0.18, mult:  2.6, titulo: '*CONTRAATAQUE BRUTAL*' },
    limpio:    { peso: 0.57, mult:  2.0, titulo: '*CONTRAATAQUE*' },
    raspado:   { peso: 0.25, mult:  1.0, titulo: '*CONTRAATAQUE JUSTITO*' },
    fallo:     { peso: 0.75, mult: -1.0, titulo: '*CONTRAATAQUE FALLIDO*' },
    ruina:     { peso: 0.25, mult: -1.8, titulo: '*RUINA TOTAL*' },
  },
};

// EL MÁS BUSCADO. El nº1 de la semana lleva diana: robarle a él paga más, y
// además el resto del grupo sabe a quién ir. Sin esto el ranking sería una
// tabla que nadie mira.
const DIANA = {
  bonoBotin: 0.35,      // robarle al nº1 da un 35 % más de botín
  bonoProbabilidad: -0.05, // pero está en guardia: un pelo más difícil
};

// ─── LA RECOMPENSA POR SU CABEZA ─────────────────────────────────────────────
//
// La lista de los mas buscados era solo una tabla: decia quien habia robado mas
// y ahi se acababa. Salir en ella no costaba nada y cazar a alguien de ella no
// pagaba nada distinto de robarle a cualquier otro. Una lista de wanted sin
// recompensa es un ranking con nombre bonito.
//
// Ahora cada uno lleva precio, y el precio LO PONE EL SOLO: de cada golpe que
// das, una parte no te la llevas — se queda sobre tu cabeza. Cuanto mas robas,
// mas vales muerto.
//
// Y ESTO NO IMPRIME AURA, que era lo primero que habia que resolver. La
// recompensa no se crea: se retiene del botin del propio ladron y se guarda. Si
// alguien le roba con exito, se la lleva ademas de lo robado. Si nadie lo caza
// en una semana, caduca con la ventana del ranking y ese aura desaparece — o
// sea que en el peor caso es un sumidero, nunca una fuente.
const RECOMPENSA = {
  fraccionDeGolpe: 0.15,   // de cada robo que sale bien, esto se queda en tu cabeza
  tope: 3000,              // ninguna cabeza vale mas que esto
  minimo: 40,              // por debajo no se anuncia: da mas risa que miedo
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

  // El duelo del owner ERA UN 100 % LITERAL (`side = 'c'`). Se quedo asi cuando
  // el robo bajo a 0,62: se toco el robo, se toco el contraataque y este no.
  //
  // Y es el peor sitio de todos para un amaño total. Un robo se le hace a un
  // saldo; un duelo se le gana A ALGUIEN, con nombre, delante del grupo y con el
  // otro contandolo. Perder siempre contra la misma persona se aprende en dos
  // tardes aunque nadie apunte nada.
  //
  // 0,70 contra el 50 % de un duelo entre iguales, y con el mismo techo de racha
  // que el resto: ver utils/rigOwner.js.
  owner: 0.70,
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
// AQUÍ NO SE ESCRIBE NINGÚN PRECIO. Este bloque llegó a decir "una canción son
// 15", "los conversores van a 15" y "el aura de arranque da para seis stickers"
// cuando debajo ponía play 40, sticker 45 y un arranque que da para tres. Un
// comentario que copia el número que tiene debajo se queda viejo en el primer
// reajuste, y a partir de ahí miente a quien lo lee para decidir — que es peor
// que no haber escrito nada.
//
// Lo que sí vive aquí son las RELACIONES, que son la decisión de diseño de
// verdad y no cambian al reajustar. Las tres están comprobadas en
// `npm run economia`, así que si alguien las rompe salta ahí y no aquí:
//
//   · !tovid POR ENCIMA de !toimg, pase lo que pase. Recodifica el vídeo entero
//     con preset slow, que es con diferencia lo más caro que hace el bot en CPU.
//   · !top10 al doble largo de !top5: molesta al doble de gente.
//   · El arranque tiene que dar para varias compras baratas. Si no, el que entra
//     no puede tocar nada y el bot parece roto.
//
//   · !play NO por debajo de los conversores. Es el único comando del bot cuyo
//     límite es EXTERNO y finito: cada canción gasta cuota mensual de RapidAPI,
//     y cuando se agota no es que salga caro, es que deja de funcionar para todo
//     el grupo hasta que renueve. Un sticker solo gasta CPU de la VPS, que se
//     recupera sola en un minuto.
//
//     Estuvo por debajo, y el comentario de aquí decía que si el cupo se
//     disparaba ese era el primer número a mirar. Se subió por eso: el precio es
//     el único freno que tiene, porque la cuota no se puede ampliar gastando más
//     CPU.
const PRECIOS = {
  // ─── Lo que consume recursos de verdad ─────────────────────────────────────
  tovid: 70,   // transcodifica el vídeo entero con preset slow: lo más caro
  grok: 50,    // llamada a la IA, con su cuota
  sticker: 45, // !s — un ffmpeg por cada uno
  toimg: 45,
  play: 50,    // canción: ancho de banda + cuota de RapidAPI + ffmpeg
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

// EL MINIMO DE !dar BAJA A 1, por peticion expresa.
//
// Estaba clavado al comando mas barato de la lista (12) con el argumento de que
// "regalar el minimo tiene que dar para algo". El argumento no se sostiene: lo
// que da o no da para algo lo decide quien recibe, no el bot, y mas de una vez
// lo que se quiere pasar es 1 de aura por la coña de pasar 1 de aura.
const REGALO_MIN = 1;

// ─── EL IMPUESTO DE TRANSFERENCIA ────────────────────────────────────────────
//
// !dar era el unico sitio del bot donde el aura se movia gratis, y eso lo
// convertia en la lavadora del juego: con el minimo en 1 y sin coste, mover una
// fortuna entera a un amigo antes de que te roben —o repartirla en trozos para
// esquivar cualquier cosa— no costaba nada. Un impuesto porcentual es lo que
// hace que cada salto cueste.
//
// EL IMPUESTO LO PAGA QUIEN DA, ENCIMA DE LA CANTIDAD. Es la unica forma de que
// el minimo de 1 funcione de verdad: si se descontara de lo enviado, un regalo
// de 1 llegaria como 0 y el comando estaria roto justo en el caso que se acaba
// de pedir. Asi quien recibe cobra SIEMPRE exactamente lo que se anuncio.
//
// Y el minimo de un aura por transferencia no es decorativo: es lo que impide
// trocear. Mover 400 de golpe cuesta 48; moverlos en cien trozos de 4 cuesta
// 100. Trocear para esquivar el impuesto sale mas caro que pagarlo, que es
// exactamente lo que tiene que pasar.
//
// No lleva tope a proposito. Mover una fortuna TIENE que ser caro: el tope
// convertiria el impuesto en calderilla justo en las cantidades donde importa.
const IMPUESTO = {
  porcentaje: 0.12,
  minimo: 1,      // toda transferencia paga al menos esto

  // Y la mitad de lo recaudado va al bote comun en vez de evaporarse. El resto
  // se destruye, que es lo que lo mantiene siendo un sumidero. Mismo reparto
  // que la comision del asalto: parte drena, parte vuelve al juego.
  alBote: 0.5,
};

// LAS DESCRIPCIONES QUE DEPENDEN DE UNA CIFRA SE GENERAN.
//
// El socio la tenia escrita a mano y mentia: la tienda anunciaba "25 % menos
// durante 12 h" mientras el cobro aplicaba 30 % y 24 h. Se cambiaron los valores
// y el texto se quedo atras, que es exactamente lo que pasa siempre que el mismo
// dato vive en dos sitios.
//
// Se hace despues de definir OBJETOS y encima del export, asi que cualquier
// cambio de `descuento` u `horas` mueve el texto solo.
OBJETOS.socio.desc = `todos los comandos te cuestan un ${Math.round(OBJETOS.socio.descuento * 100)} % menos durante ${OBJETOS.socio.horas} h`;

// Lo que cuesta de verdad mandar una cantidad, y lo unico que hay que llamar
// para saberlo. Vive aqui y no en el comando para que la ayuda, el mensaje y el
// auditor lean todos la misma cuenta.
function impuestoDe(cantidad) {
  return Math.max(IMPUESTO.minimo, Math.round(cantidad * IMPUESTO.porcentaje));
}

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
  VETERANIA_MSGS, VETERANIA_PAGO, VETERANIA_TOPE, bonoVeterania,
  ROBO, RIESGO, ROBO_BASE, ROBO_LIMITES, ROBO_OWNER_MIN, ROBO_OWNER_EXITO, ROBO_OWNER_RACHA_MAX, ROBO_OWNER_VISIBLE, DUELO, REGALO_MIN,
  BOTE, ATRACO, OBJETOS, VENTAJA, CONTRA, DIANA, RECOMPENSA,
  PRECIOS, SALDO_MINIMO, IMPUESTO, impuestoDe,
  rango,
};
