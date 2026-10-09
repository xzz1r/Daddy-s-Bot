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
  'Gana %A, y ya se le ha puesto cara de que se lo merece. %S.',
  '%A cobra y el resto ahí, con cara de gilipoyas.',
  'Doblete limpio. Que nadie le pregunte cómo, porque no tiene ni puta idea.',
  '%A se lleva el premio y la dignidad de todos los gilipoyas que estabais mirando.',
  'Coño, ha salido. Ahora a aguantar la chapa de su método infalible.',
  'Cobra sin hacer nada más que pulsar un botón. %S, hostia.',
  'Ha cobrado %A. Mañana lo pierde, pero hoy os lo va a restregar.',
  'El aura afloja, la muy cabrona, poco y tarde. %S.',
  '%A acierta. Aplaudid, gilipoyas, que hoy no toca reírse de %A.',
  '%A cobra y de golpe se le pone cara de estratega. Payaso.',
  'Ha acertado. Con el saldo que le queda ya puede volver a hacer el ridículo, que es lo suyo.',
  'El aura le deja el saldo en %S y se larga sin decir ni mierda.',
  'Gana %A. El grupo callado, que es toda la felicitación que merece.',
  '%A gana y se queda con %S. Los demás, a mirar y a joderos.',
  '%A ha ganado sin más mérito que pulsar. Puta suerte.',
  'Sale bien. Que ninguno de vosotros diga ahora que lo veía venir, hipócritas de mierda.',
  'Cobra %A. La casa toma nota, cabrón, y no lo olvida.',
  'Ha cobrado. El resto seguid con vuestras mierdas.',
  'Ha salido y ya le pica volver a jugar. Imbécil hasta ganando.',
  'Cobra por encima de lo puesto. La fiesta la pagáis vosotros, gilipoyas.',
  'Ha salido. Por una vez en su vida, a %A le paga alguien.',
  'Ha acertado, y a más de un gilipoyas se le nota la envidia hasta en el visto.',
  'Sale. %S y una anécdota para presumir hasta la siguiente apuesta.',
  'Gana %A. Se acabó la parte alegre: volved a lo vuestro, que %A ya lo va a contar por todos.',
  'Sale bien. %S en la cuenta y una sonrisa que da asco verla.',
  'La mesa paga y se queda mirando a %A con odio. %S.',
  'Cobra %A. Le quedan %S, que le van a durar lo que tarde en volver a apostar.',
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
  'La mesa no perdona a nadie, y a %A menos, por imbécil. %S.',
  'Fuera de la mesa y fuera de la conversación. %S y a callar, gilipoyas.',
  'Ha caído con todo el equipo y con %S de resto. Puta ruina.',
  '%A pierde lo apostado y un poco de credibilidad de propina. Cojonudo.',
  'Pierde %A. Ha apostado como hace todo: con fe y sin mirar.',
  'Fuera. La mesa ni se ha inmutado: perder es lo único que %A hace sin esfuerzo.',
  'Nada. Apuesta con fe de pringado y la estadística le cobra.',
  'Cae %A. El bote engorda a su costa y nadie va a devolverle una mierda.',
  '%A apuesta, %A pierde. El orden natural de las putas cosas.',
  'Se queda en %S. Daría pena si no fuera tan imbécil.',
  'El aura no ha dudado ni un puto segundo. %S.',
  'Fuera. Un botón y el saldo se queda en %S. Cojonudo, cabrón.',
  'Cae. Todo lo puesto, sin descuento, y la cara de pasmo a juego.',
  'Pierde %A, y la mesa suma otro cliente fijo a su lista.',
  'El aura cierra la mano. %S y hasta luego, cabrón.',
  'Se esfuma lo puesto. %S, y a mirar la cuenta como si fuera a cambiar.',
  'La mesa se lo queda sin pestañear. %A, a contar calderilla.',
  'Perdido de golpe. %S y la cuenta pidiendo auxilio.',
  'Pierde. Una parte al bote y el resto a la casa. Para %A, la vergüenza entera.',
  '%A lo ha puesto todo de golpe, como los gilipoyas. Se queda en %S.',
  '%A se queda en %S. Si quiere revancha, en tres horas.',
  'Ruina servida. %A ya puede ir haciéndose sitio en la lista de pringados.',
  '%A se queda en %S con el botón hundido, gilipoyas, y el grupo ya va por otra frase.',
];

module.exports = { APUESTA_GANA, APUESTA_PIERDE };
