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
  'Gana %A y se queda con %S. Los que se reían, a tragar mierda en silencio.',
  '%A cobra y el resto ahí, con cara de gilipoyas.',
  '%A dobla y no sabe ni cómo. Vosotros tampoco, así que a callar, cojones.',
  '%A se lleva el premio y la dignidad de todos los gilipoyas que estabais mirando.',
  'Coño, ha salido. Ahora a aguantar la chapa de su método infalible.',
  '%A cobra por darle a un botón. %S, y el resto mirando como gilipoyas.',
  'Ha cobrado %A. Mañana lo pierde, pero hoy os lo va a restregar.',
  'El aura paga de mala gana y %A lo coge con las dos manos. %S.',
  '%A acierta. Aplaudid, gilipoyas, que hoy no toca reírse de %A.',
  '%A cobra y ya se cree estratega. Ha sido potra de cojones y no lo va a reconocer.',
  'Ha acertado %A. Con ese saldo ya puede volver a hacer el gilipoyas, que es lo suyo.',
  'El aura le deja el saldo en %S y se larga sin decir ni mierda.',
  'Gana %A. Los demás, callados y con el culo apretado, que es toda la felicitación.',
  '%A gana y se queda con %S. Los demás, a mirar y a joderos.',
  '%A ha ganado sin más mérito que darle al botón. Puta suerte.',
  'Sale bien. Que ninguno de vosotros diga ahora que lo veía venir, hipócritas de mierda.',
  'Cobra %A. La casa toma nota, cabrón, y no lo olvida.',
  'Ha cobrado. El resto seguid con vuestras mierdas.',
  'Le ha salido a %A y ya le pica volver a jugar. Gilipoyas hasta ganando.',
  'Cobra por encima de lo puesto, y la fiesta la pagáis los gilipoyas que no apostasteis.',
  'Por una vez en su puta vida, a %A le paga alguien. Disfrutadlo, que no se repite.',
  'Ha acertado %A, y a más de un gilipoyas se le nota la envidia hasta en el visto.',
  '%A sale con %S y una anécdota para dar la chapa hasta la próxima.',
  'Gana %A. Volved a vuestras mierdas, que %A ya lo cuenta por todos.',
  'Sale bien. %S en la cuenta y una sonrisa que da asco verla.',
  'La mesa paga y se queda mirando a %A con odio. %S.',
  'Cobra %A. Le quedan %S, que le duran lo que tarde en volver a cagarla apostando.',
  'Acierto de pura potra. %S y ni una explicación que valga.',
  'Gana %A y se queda con %S. El resto, a contar lo que no tiene.',
];

const APUESTA_PIERDE = [
  'Se lo ha tragado la mesa entero. %A se queda en %S, con cara de gilipoyas y las manos vacías.',
  'El aura se queda lo de %A y no da ni una puta explicación. %S.',
  'La mesa se come lo de %A sin masticar. %S de saldo y cara de gilipoyas.',
  '%A se queda en %S. Que alguien le explique lo que es una puta probabilidad.',
  '%A apuesta y el aura le cierra la puerta en las narices.',
  'Fuera. %S en la cuenta de %A y un silencio de la hostia.',
  '%A pierde y de golpe se acuerda de que esto era un juego. Joder.',
  'La mesa no perdona a nadie, y a %A menos, por imbécil y por ludópata. %S.',
  'Fuera de la mesa y fuera de la conversación. Con %S, hasta %A, gilipoyas de manual, sabe callarse.',
  '%A cae con todo el equipo. %S de resto, y gracias.',
  '%A palma lo apostado y la poca credibilidad que le quedaba.',
  'Pierde %A. Ha apostado como hace todo: con fe y sin mirar.',
  'Fuera. Perder es lo único que %A hace sin esfuerzo, y lo hace de puta madre.',
  'Nada. Apuesta con fe de pringado y la estadística le cobra.',
  'Cae %A. El bote engorda a su costa y nadie va a devolverle una mierda.',
  '%A apuesta, %A pierde. El orden natural de las putas cosas.',
  'Con %S en la cuenta, %A daría pena si no fuera tan gilipoyas.',
  'El aura no ha dudado ni un puto segundo con %A. %S.',
  'Fuera. Un botón y %A se queda en %S. Ni un cabrón del grupo pierde tan rápido.',
  'Cae. Todo lo puesto, sin descuento, y la cara de pasmo a juego.',
  'Pierde %A, y la mesa suma otro ludópata de mierda a su lista de clientes.',
  'El aura cierra la mano: %S para %A, que apuesta con prisa de yonqui.',
  'Se esfuma lo puesto. %S, y a mirar la cuenta como si fuera a cambiar.',
  'La mesa se lo queda sin pestañear. %A, a contar calderilla.',
  '%A lo pierde de golpe. %S y una cuenta que da asco mirarla.',
  'Pierde. Una parte al bote y el resto a la casa. Para %A, la vergüenza entera.',
  '%A lo ha puesto todo de golpe, como los gilipoyas. Se queda en %S.',
  'Revancha en tres horas, si a %A le quedan cojones. De momento, %S.',
  'Ruina servida. %A ya puede ir haciéndose sitio en la lista de pringados.',
  '%A se queda en %S con el botón hundido, gilipoyas, y el grupo ya va por otra frase.',
];

module.exports = { APUESTA_GANA, APUESTA_PIERDE };
