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
// sujeto. Mediana 53 y 49, máximo 70 y 67, ninguna por encima de 85.

const APUESTA_GANA = [
  'Ha salido. Ni cálculo ni mérito: suerte de gilipollas. %S.',
  'El aura se ha equivocado y no piensa corregirlo. %S para %A.',
  'Le sale bien una vez y ya se cree que controla algo.',
  'Cobra %A. Apuntadlo, que no se repite en un mes.',
  'A un ciego con un dardo también le toca de vez en cuando.',
  'Dobla. La estadística llorando en un rincón sin que nadie la consuele.',
  'Gana, y desde aquí se le ve la sonrisa de imbécil. %S.',
  'Sale cara. Podría haber salido cruz y estaríamos de luto.',
  '%A cobra y el resto mirando con cara de haber perdido algo.',
  'Ha ganado. No sabe por qué, pero ha ganado. %S.',
  'La mesa paga y se queda mirándolo con rencor.',
  'Doblete limpio. Que nadie le pregunte cómo, porque no lo sabe.',
  '%A se lleva el bote y la dignidad ajena de propina.',
  'Ha salido bien. Una casualidad con muy buena prensa.',
  'Gana y ya está midiéndose la boca para contarlo. %S.',
  'El destino ha mirado hacia otro lado y %A ha aprovechado.',
  'Cobra sin haber hecho nada más que pulsar. %S de saldo.',
  'Ha doblado. El grupo entero fingiendo que se alegra.',
  'Le ha salido. A ver cuánto le dura, que aquí volvemos todos.',
  '%A gana y sube %S. Disfrutadlo, que es efímero.',
  'Sale. Y con eso ya tiene tema de conversación para tres días.',
  'Ha ganado y no piensa callarse en toda la semana.',
  'El aura afloja. Muy poco y muy tarde, pero afloja. %S.',
  'Dobla lo que puso. Ahora viene la parte donde lo tira todo.',
  '%A acierta. Rompan a aplaudir los que le deben algo.',
  'Salió bien. La próxima ya veremos, que aquí nadie se retira.',
  'Cobra. Con la misma cara con la que perdería. %S.',
  'Ha ganado y el resto seguís donde estabais. Bien jugado.',
  'Le paga la mesa. A regañadientes, pero le paga.',
  '%A dobla y de golpe se le pone cara de estratega.',
  'Sale bien. Suerte disfrazada de decisión. %S.',
  'Ha acertado. Con esa cifra ya puede permitirse perder dos veces.',
  'El aura suelta %S y se va sin decir nada más.',
  'Gana %A. El grupo callado, que es la mejor felicitación.',
  'Doblado. Y con eso se compra tres días de arrogancia.',
  'Ha salido. Que conste que iba a ciegas.',
  'Cobra y ya está buscando a quién contárselo. %S.',
  'La mesa se rinde. Hoy toca aguantarle el discurso.',
  '%A gana y se queda con %S. Los demás, a mirar.',
  'Ha ganado sin saber ni lo que había apostado.',
  'Sale cara y de repente todo el mundo tenía fe en él.',
  'Dobla. Recordadlo cuando vuelva a la mesa a devolverlo.',
  '%A se lleva la mano y de paso se lleva la razón.',
  'Ha acertado. Media hora de fanfarria por un botón.',
  'El aura paga. Que aproveche, que dura lo que dura. %S.',
  'Gana. Y con eso ya cree que tiene un sistema.',
  'Cobra %A. La casa toma nota y no lo olvida.',
  'Ha doblado. El resto seguid con vuestras vidas.',
  'Sale bien y ya está midiendo cuánto puede perder mañana.',
  '%A acierta y sube a %S. Enhorabuena, supongo.',
  'Ha ganado. Que alguien le baje los humos antes del jueves.',
  'La mesa suelta la pasta. Poco convencida, pero la suelta.',
  'Dobla lo puesto. Los demás pagáis la fiesta.',
  '%A gana. Un fallo del sistema, seguramente.',
  'Ha salido. Y de golpe se le olvidan las cinco anteriores.',
  'Cobra. Que lo cuente rápido, que se le acaba el momento.',
  'Ha acertado y el grupo entero disimulando la envidia.',
  'Sale. %S en la cuenta y una anécdota que va a repetir mucho.',
  '%A dobla. Aprovechad para pedirle algo, que hoy está blando.',
  'Ha ganado. Mañana volverá a la mesa y ya sabemos cómo acaba.',
  'El aura ha cedido. No por gusto: por descuido. %S.',
  'Gana %A. Se acabó la parte alegre, volved a lo vuestro.',
];

const APUESTA_PIERDE = [
  'Se lo ha tragado la mesa entero. %S y las manos vacías.',
  'Pierde. Y encima con esa cara de no habérselo visto venir.',
  'El aura se lo queda y no da explicaciones. %S.',
  '%A tira la pasta y tira de la cadena él solito.',
  'Estaba escrito desde antes de que pulsara.',
  'Nada. Se va con %S y con la lección sin aprender.',
  'Pierde %A. El grupo lo celebra en silencio, que es peor.',
  'La mesa se lo come sin masticar. %S de saldo.',
  'Ha caído. Y volverá dentro de tres horas a caer otra vez.',
  'Se queda en %S. Que alguien le explique lo que es una probabilidad.',
  'Pierde. Lo raro habría sido lo contrario.',
  '%A apuesta y el aura le contesta con un portazo.',
  'Fuera. %S en la cuenta y un silencio muy incómodo.',
  'Sigue mirando la pantalla sin creérselo.',
  'El aura cobra. Puntual, como siempre que hay alguien confiado.',
  'Se lo lleva la casa. La casa siempre. %S.',
  '%A pierde y de golpe se acuerda de que esto era un juego.',
  'Nada de nada. Ni la mitad, ni un resto, ni un consuelo.',
  'Lo peor es que sabía perfectamente que iba a pasar.',
  'Cae. Con %S encima y la boca cerrada por una vez.',
  'Pierde. Que lo mire bien, porque va a repetirlo.',
  'La mesa no perdona a los que llegan sonriendo. %S.',
  '%A se queda seco. Un clásico del que no aprende nadie.',
  'Al menos ha entretenido al grupo un rato.',
  'Fuera del bote y fuera de la conversación. %S.',
  'Se lo come la mesa. Ni las gracias le ha dado.',
  'Pierde %A. Aquí lo dejamos, que hay poco que añadir.',
  'Nada. Y todavía le queda saldo para volver a fallar.',
  'Ha caído con todo el equipo y con %S de resto.',
  'El aura se queda con lo suyo. Justo lo que había puesto.',
  '%A pierde. Lo apostado y un poco de credibilidad.',
  'Cae. Y sube al bote, que es lo único que sale ganando.',
  'Se le veía venir en la forma de escribirlo.',
  'Se queda con %S. Suficiente para arrepentirse otra vez.',
  'Fuera. La mesa ni se ha inmutado.',
  'Pierde y ahora empieza la parte donde explica su teoría.',
  '%A entrega la pasta sin resistencia. %S.',
  'Nada. La estadística cumpliendo su trabajo con puntualidad.',
  'Alguien tenía que caer hoy y le ha tocado.',
  'Cae %A. El bote engorda a su costa.',
  'Se lo queda el aura. Que conste que estaba avisado. %S.',
  'Pierde. Ni siquiera ha estado cerca.',
  'Fuera. %S de saldo y ganas de contarlo como si fuera otra cosa.',
  'Con dignidad no, pero ha caído igual.',
  'La mesa se lo lleva. Se lo lleva todo, mejor dicho.',
  '%A apuesta, %A pierde. El orden natural de las cosas.',
  'Nada. Y lo dicho: en tres horas otra vez aquí.',
  'Ha caído. Que nadie le pregunte, que se pone tonto.',
  'Se queda en %S. Casi da pena. Casi.',
  'Pierde. Y encima quería contarlo antes de saber el resultado.',
  'El aura no ha dudado ni un segundo. %S.',
  '%A pierde y el grupo aprende gratis lo que él ha pagado.',
  'Fuera. Un botón, tres segundos, %S menos.',
  'La casa lo agradece en silencio.',
  'Cae. Todo lo puesto, sin descuento ni rebaja.',
  'Se lo traga la mesa. %S y a esperar el cooldown.',
  'Pierde %A. Lo apuntamos con los otros cinco.',
  'Nada. Ni suerte, ni cálculo, ni excusa que valga.',
  'Ha perdido. Y sigue creyendo que la próxima es la buena.',
  'El aura cierra la mano. %S y hasta luego.',
];

module.exports = { APUESTA_GANA, APUESTA_PIERDE };
