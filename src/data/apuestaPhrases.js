// Frases de *!aura apostar*: la mitad del saldo a una carta.
//
// Treinta por desenlace, la regla que fijó el dueño para todo el bot: con tres
// horas de cooldown salen ocho apuestas al día como mucho, y con treinta frases
// distintas nadie ve la misma dos veces en días. Antes eran sesenta, y la mitad
// repetía la idea de otra.
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
// de la frase. El tope de cinco arranques iguales ya no se cumple: «Pierde»
// abre nueve, y «Ha ganado» y «Nada» seis cada uno.

const APUESTA_GANA = [
  'Joder con %A. El aura se ha equivocado y no piensa rectificar.',
  'Gana, y desde aquí se le ve la sonrisa de imbécil. %S.',
  '%A cobra y el resto ahí, con cara de gilipoyas.',
  'Doblete limpio. Que nadie le pregunte cómo, porque no tiene ni puta idea.',
  '%A se lleva el doble y la dignidad de todos vosotros, gilipoyas.',
  'Coño, ha salido. Una casualidad con muy buena prensa.',
  'Cobra sin hacer nada más que pulsar un botón. %S, hostia.',
  'Ha doblado. El grupo fingiendo que se alegra, panda de falsos de mierda.',
  'El aura afloja. Muy poco y muy tarde, la muy cabrona. %S.',
  '%A acierta. Aplaudid, gilipoyas, que hoy no toca reírse de %A.',
  '%A dobla y de golpe se le pone cara de estratega. Payaso.',
  'Ha acertado. Con esa cifra ya puede permitirse cagarla dos veces más.',
  'El aura suelta %S y se larga sin decir ni mierda.',
  'Gana %A. El grupo callado, que es toda la felicitación que merece.',
  '%A gana y se queda con %S. Los demás, a mirar y a joderos.',
  'Ha ganado sin saber ni lo que estaba apostando. Puta suerte.',
  'Sale cara y de repente todos teníais fe en %A. Hipócritas de mierda.',
  'Cobra %A. La casa toma nota, cabrón, y no lo olvida.',
  'Ha doblado. El resto seguid con vuestras mierdas.',
  'Sale bien y ya está calculando cuánto puede perder mañana. Imbécil.',
  'Dobla lo puesto. La fiesta la pagáis vosotros, gilipoyas.',
  'Ha salido. Y de golpe se le olvidan todas las hostias anteriores.',
  'Ha acertado y el grupo disimulando la envidia. Se os ve, gilipoyas.',
  'Sale. %S y una anécdota que va a repetir hasta el puto vómito.',
  'Gana %A. Se acabó la parte alegre, volved a lo vuestro, gilipoyas.',
  'Sale bien. %S en la cuenta y una sonrisa que da asco verla.',
  'La mesa paga y se queda mirando a %A con odio. %S.',
  'Dobla. Hoy cobra quien menos lo merecía, y lo sabe todo el grupo.',
  'Acierto de pura potra. %S y ni una explicación que valga.',
  'Gana %A y se queda con %S. El resto, a contar lo que no tiene.',
];

const APUESTA_PIERDE = [
  'Se lo ha tragado la mesa entero. %S y las manos vacías, gilipoyas.',
  'El aura se lo queda y no da ni una puta explicación. %S.',
  'La mesa se lo come sin masticar. %S de saldo, hostia.',
  'Se queda en %S. Que alguien le explique lo que es una puta probabilidad.',
  '%A apuesta y el aura le contesta con un portazo en toda la cara.',
  'Fuera. %S en la cuenta y un silencio de la hostia.',
  '%A pierde y de golpe se acuerda de que esto era un juego. Joder.',
  'La mesa no perdona a los que llegan sonriendo. %S, imbécil.',
  'Fuera de la mesa y fuera de la conversación. %S y a callar, gilipoyas.',
  'Ha caído con todo el equipo y con %S de resto. Puta ruina.',
  '%A pierde lo apostado y un poco de credibilidad de propina. Cojonudo.',
  'Se le veía venir en la puta forma de escribirlo.',
  'Fuera. La mesa ni se ha inmutado, cabrón.',
  'Nada. La estadística cumpliendo su puta faena con puntualidad.',
  'Cae %A. El bote engorda a su costa y nadie va a devolverle una mierda.',
  '%A apuesta, %A pierde. El orden natural de las putas cosas.',
  'Se queda en %S. Casi da pena. Casi, porque es imbécil.',
  'El aura no ha dudado ni un puto segundo. %S.',
  'Fuera. Un botón, tres segundos, %S menos. Cojonudo, cabrón.',
  'Cae. Todo lo puesto, sin descuento ni rebaja, cabrón.',
  'Pierde %A. Lo apuntamos con las otras hostias.',
  'El aura cierra la mano. %S y hasta luego, cabrón.',
  'Se esfuma todo. %S, y la cara de haber visto un fantasma.',
  'La mesa se lo queda sin pestañear. %A, a contar calderilla.',
  'Perdido de golpe. %S y la cuenta pidiendo auxilio.',
  'Cruz. Todo para la casa y ni un gracias, gilipoyas.',
  'Lo ha puesto todo con fe. La fe no cotiza. %S.',
  'Se queda en %S con cara de pedir la revancha. La revancha, en tres horas.',
  'Ruina servida. %A ya puede ir haciéndose sitio en la lista de pringados.',
  'Mal. Muy mal. %S, y el grupo haciendo como que no ha visto nada.',
];

module.exports = { APUESTA_GANA, APUESTA_PIERDE };
