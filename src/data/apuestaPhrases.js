// Frases de *!aura apostar*: la mitad del saldo a una carta.
//
// Sesenta por desenlace, no trescientas como en los comandos de porcentaje, y
// es a propósito: con tres horas de cooldown salen ocho apuestas al día como
// mucho, y en la práctica bastantes menos. Con sesenta frases y la ventana
// anti-repetición de treinta, nadie ve la misma dos veces en semanas.
// Trescientas aquí sería trabajo tirado; en !fea o !perdedor, que se disparan
// veinte veces por tarde, no lo sería.
//
// %A = quien apuesta · %C = la cantidad que había en la mesa · %S = saldo final
//
// El tono: esto no es un roast, es la reacción de alguien que estaba delante y
// no piensa consolar a nadie. Nada de "suerte la próxima".
//
// Y CORTAS, QUE ANTES NO LO ERAN. La mediana estaba en 127 caracteres y las 62
// frases de GANA pasaban de 85. El motivo de fondo no era el estilo: era que la
// frase REPETÍA la cabecera. El mensaje ya imprime "@fulano puso *X* sobre la
// mesa" y la línea de probabilidades justo encima, así que volver a decir quién
// apostó y cuánto era escribir dos veces lo mismo y dejar la reacción sepultada
// al final de un párrafo.
//
// Por eso %C ya no se usa: la cantidad está en la línea de arriba. %S sí, que
// es el único dato nuevo que aporta la frase, y %A solo cuando hace falta un
// sujeto. Mediana 64 y 62, máximo 76 y 74, ninguna por encima de 85.
//
// Y CORTAR NO ES BAJAR EL TONO. En la primera pasada quedaron cortas y limpias
// —del 84 % de tacos al 3 %—, y eso no era arreglarlas: era quitarle la voz al
// bot justo en el comando donde más grita. La apuesta es el momento más ruidoso
// que tiene el grupo y las frases tienen que sonar a eso.
//
// La segunda pasada mantiene la longitud y devuelve el registro: 87 % y 93 %,
// por encima incluso de las originales. Lo que NO vuelve es la muletilla: antes
// diez de sesenta empezaban por "Me cago" y otras tantas por "Hostia puta", que
// es la repetición que se nota antes de agotar el pool. Ahora el taco va dentro
// de la frase y ningún arranque se repite más de cinco veces.

const APUESTA_GANA = [
  'Ha salido, el cabrón. Suerte de gilipollas y ni una gota de mérito. %S.',
  'Joder con %A. El aura se ha equivocado y no piensa rectificar.',
  'Le sale bien una puta vez y ya se cree que controla algo.',
  'Cobra el cabrón. Apuntadlo, que no se repite en un mes.',
  'Hostia, ha ganado. A un ciego con un dardo también le toca.',
  'Dobla el muy hijo de puta. La estadística llorando en un rincón.',
  'Gana, y desde aquí se le ve la sonrisa de imbécil. %S.',
  'Ha salido cara, joder. Podría haber salido cruz y estaríamos de luto.',
  '%A cobra y el resto ahí, con cara de gilipollas.',
  'Ha ganado. No sabe ni por qué, el gilipollas. %S.',
  'La mesa paga y se queda mirando al cabrón con odio.',
  'Doblete limpio. Que nadie le pregunte cómo, porque no tiene ni puta idea.',
  '%A se lleva el bote y la dignidad de todos vosotros, gilipollas.',
  'Coño, ha salido. Una casualidad con muy buena prensa.',
  'Gana y ya está midiéndose la boca para contarlo. Qué pesado. %S.',
  'El destino ha mirado para otro lado y el cabrón ha aprovechado.',
  'Cobra sin hacer nada más que pulsar un botón. %S, hostia.',
  'Ha doblado. El grupo fingiendo que se alegra, panda de falsos de mierda.',
  'Le ha salido. A ver cuánto le dura, que aquí caemos todos, cabrón.',
  '%A gana y sube a %S. Disfrutadlo, que dura dos putos días.',
  'Sale, y ya tiene tema para tres días de charla insufrible. Joder.',
  'Ha ganado y no piensa callarse en toda la puta semana.',
  'El aura afloja. Muy poco y muy tarde, la muy cabrona. %S.',
  'Dobla lo que puso. Ahora viene la parte donde lo tira todo, gilipollas.',
  '%A acierta. Aplaudid, gilipollas, que hoy no toca reírse de él.',
  'Salió bien. La próxima ya veremos, que aquí no se retira ni Dios.',
  'Cobra. Con la misma cara de imbécil con la que perdería. %S.',
  'Ha ganado y vosotros seguís donde estabais. Bien jugado, cabrón.',
  'Le paga la mesa. A regañadientes y de mala hostia, pero le paga.',
  '%A dobla y de golpe se le pone cara de estratega. Payaso.',
  'Sale bien. Suerte disfrazada de decisión, que no es lo mismo, cabrón. %S.',
  'Ha acertado. Con esa cifra ya puede permitirse cagarla dos veces más.',
  'El aura suelta %S y se larga sin decir ni mierda.',
  'Gana %A. El grupo callado, que es toda la felicitación que merece.',
  'Doblado. Y con eso se compra tres días de arrogancia insoportable, joder.',
  'Ha salido. Que conste que iba a ciegas, el muy jeta.',
  'Cobra y ya está buscando a quién contárselo, el pesado. %S de saldo.',
  'La mesa se rinde. Hoy toca aguantarle el discurso, joder.',
  '%A gana y se queda con %S. Los demás, a mirar y a joderos.',
  'Ha ganado sin saber ni lo que estaba apostando. Puta suerte.',
  'Sale cara y de repente todos teníais fe en él. Hipócritas de mierda.',
  'Dobla. Recordadlo cuando vuelva a la mesa a devolverlo enterito, gilipollas.',
  '%A se lleva la mano y de paso la razón. Insoportable el cabrón.',
  'Ha acertado. Media hora de fanfarria por pulsar un botón, cojonudo.',
  'El aura paga. Que aproveche el cabrón, que esto dura lo que dura. %S.',
  'Gana. Y ya se cree que tiene un sistema, el puto iluminado.',
  'Cobra %A. La casa toma nota, cabrón, y no lo olvida.',
  'Ha doblado. El resto seguid con vuestras mierdas.',
  'Sale bien y ya está calculando cuánto puede perder mañana. Imbécil.',
  '%A acierta y sube a %S. Enhorabuena, supongo, cabrón.',
  'Ha ganado. Que alguien le baje los humos antes del jueves, joder.',
  'La mesa suelta la pasta. De muy mala hostia, pero la suelta.',
  'Dobla lo puesto. La fiesta la pagáis vosotros, gilipollas.',
  '%A gana. Un fallo del sistema, seguramente. No hay otra puta explicación.',
  'Ha salido. Y de golpe se le olvidan las cinco hostias anteriores.',
  'Cobra. Que lo cuente rápido, que se le acaba el puto momento de gloria.',
  'Ha acertado y el grupo disimulando la envidia. Se os ve, gilipollas.',
  'Sale. %S y una anécdota que va a repetir hasta el puto vómito.',
  '%A dobla. Aprovechad para pedirle algo, que hoy está blando el cabrón.',
  'Ha ganado. Mañana vuelve a la mesa y ya sabemos cómo acaba, cabrón.',
  'El aura ha cedido. No por gusto: por descuido, joder. %S.',
  'Gana %A. Se acabó la parte alegre, volved a lo vuestro, gilipollas.',
];

const APUESTA_PIERDE = [
  'Se lo ha tragado la mesa entero. %S y las manos vacías, gilipollas.',
  'Pierde, y encima con esa cara de gilipollas al que no le cuadra nada.',
  'El aura se lo queda y no da ni una puta explicación. %S.',
  '%A tira la pasta al water y tira de la cadena él solito, el muy imbécil.',
  'Ha perdido, como estaba escrito desde antes de pulsar. Payaso.',
  'Nada. Se va con %S y con la lección sin aprender, el muy cabezón.',
  'Pierde %A. El grupo lo celebra en silencio, que es peor todavía, cabrón.',
  'La mesa se lo come sin masticar. %S de saldo, hostia.',
  'Ha caído. Y volverá en tres horas a caer otra vez, como un imbécil.',
  'Se queda en %S. Que alguien le explique lo que es una puta probabilidad.',
  'Pierde. Lo raro de cojones habría sido lo contrario.',
  '%A apuesta y el aura le contesta con un portazo en toda la cara.',
  'Fuera. %S en la cuenta y un silencio de la hostia.',
  'Sigue mirando la pantalla sin creérselo, el pobre gilipollas.',
  'El aura cobra. Puntual, la muy cabrona, como siempre que hay un confiado.',
  'Se lo lleva la casa. La casa siempre, cabrón. %S.',
  '%A pierde y de golpe se acuerda de que esto era un juego. Joder.',
  'Nada de nada. Ni la mitad, ni un resto, ni un puto consuelo.',
  'Lo peor es que sabía que iba a pasar. Y pulsó igual, el gilipollas.',
  'Cae. Con %S encima y la boca cerrada por una vez, joder.',
  'Pierde. Que lo mire bien, cabrón, porque va a repetirlo el jueves.',
  'La mesa no perdona a los que llegan sonriendo. %S, imbécil.',
  '%A se queda seco. Un clásico del que no aprende ni Dios.',
  'Al menos ha entretenido al grupo un rato, que ya es algo, payaso.',
  'Fuera del bote y fuera de la conversación. %S y a callar, gilipollas.',
  'Se lo come la mesa. Ni las gracias le ha dado, la muy cabrona.',
  'Pierde %A. Aquí lo dejamos, que hay poca mierda que añadir.',
  'Nada. Y todavía le queda saldo para volver a cagarla mañana, el muy jeta.',
  'Ha caído con todo el equipo y con %S de resto. Puta ruina.',
  'El aura se queda con lo suyo. Justo lo que este gilipollas puso.',
  '%A pierde lo apostado y un poco de credibilidad de propina. Cojonudo.',
  'Cae. Y el bote engorda, que es lo único que sale ganando de esta mierda.',
  'Se le veía venir en la puta forma de escribirlo.',
  'Se queda con %S. Suficiente para volver a arrepentirse, el cabezón.',
  'Fuera. La mesa ni se ha inmutado, cabrón.',
  'Pierde y ahora explica su teoría. Insufrible el gilipollas.',
  '%A entrega la pasta sin resistencia, como un manso. %S.',
  'Nada. La estadística cumpliendo su puta faena con puntualidad.',
  'Alguien tenía que caer hoy y le ha tocado a este cabrón.',
  'Cae %A. El bote engorda a su costa y nadie va a devolverle una mierda.',
  'Se lo queda el aura. Que conste que estaba avisado, el muy cabezota.',
  'Pierde. Ni siquiera ha estado cerca, hostia.',
  'Fuera. %S y ganas de contarlo como si fuera otra cosa. Payaso.',
  'Con dignidad no, pero ha caído igual. Que es lo que importa, joder.',
  'La mesa se lo lleva. Se lo lleva todo, mejor dicho, gilipollas.',
  '%A apuesta, %A pierde. El orden natural de las putas cosas.',
  'Nada. Y lo dicho: en tres horas otra vez aquí, tropezando como un imbécil.',
  'Ha caído. Que nadie le pregunte, que se pone tonto el cabrón.',
  'Se queda en %S. Casi da pena. Casi, porque es imbécil.',
  'Pierde. Y encima quería contarlo antes de saber el resultado, el jeta.',
  'El aura no ha dudado ni un puto segundo. %S.',
  '%A pierde y el grupo aprende gratis lo que este gilipollas ha pagado.',
  'Fuera. Un botón, tres segundos, %S menos. Cojonudo, cabrón.',
  'La casa lo agradece en silencio y no piensa decirle una mierda.',
  'Cae. Todo lo puesto, sin descuento ni rebaja, cabrón.',
  'Se lo traga la mesa. %S y a esperar el cooldown, gilipollas.',
  'Pierde %A. Lo apuntamos con las otras cinco hostias.',
  'Nada. Ni suerte, ni cálculo, ni puta excusa que valga esta vez.',
  'Ha perdido y sigue pensando que la próxima es la buena. Payaso.',
  'El aura cierra la mano. %S y hasta luego, cabrón.',
];

module.exports = { APUESTA_GANA, APUESTA_PIERDE };
