// Frases del *!zulo*: el agujero donde se esconde el aura para que no la roben.
//
// %N = mención · %C = la cantidad que se mueve · %Z = lo que queda enterrado
// %S = el saldo que queda a la vista
//
// EL TONO NO ES EL DE UN BANCO. Aquí nadie "realiza una operación": aquí se
// cava, se tapa y se mira por encima del hombro. El bot no felicita al que
// esconde — le recuerda que esconder es de cobardes y que además le va a costar
// dinero sacarlo. Y al que lo saca, que acaba de pagar por su propio miedo.
//
// Cortas a propósito: esto sale debajo de una cabecera que ya dice las cifras,
// igual que en !apostar. Repetir el número en la frase es escribirlo dos veces.

// Lo ha enterrado. Se lee en el grupo.
const ENTERRADO = [
  'Enterrado. Ahora duerme tranquilo el cobarde.',
  'Bajo tierra. Que nadie diga que no sabe cuidarse.',
  'Escondido. Miedo con forma de agujero.',
  'Tapado. El grupo entero sabe que hay algo ahí, eso sí.',
  'A cubierto. Lo que no se ve no se roba, y punto.',
  'Enterrado como un perro con un hueso. Igual de digno.',
  'Guardado. Muy listo. Y muy triste, pero listo.',
  'Bajo tierra %C. Sacarlo va a doler, avisado quedas.',
  'Escondido. Ahora sí puede dormir el señorito.',
  'A salvo. Cobardía bien ejecutada, hay que reconocerlo.',
  'Tapado con dos paladas. Ya no es tuyo del todo, pero es tuyo.',
  'Enterrado. El que roba no llega, y tú tampoco hasta que pagues.',
  'Bajo tierra y fuera de la mesa. Las dos cosas a la vez.',
  'Guardado. Lo que hay arriba sigue siendo carne, por si acaso.',
  'Escondido. Que se joda el que venía a por ello.',
  'Tapado. Ahora a rezar para no necesitarlo pronto.',
  'A cubierto. Esconder aura es admitir que te da miedo el grupo.',
  'Enterrado. Y con el resto a la vista, que algo hay que dejar.',
  'Bajo tierra. Muy seguro, muy inútil, todo a la vez.',
  'Guardado. Aura que ya no juega, ya no compra y ya no sirve.',
];

// Lo ha sacado. Ha pagado comisión. Se lee en el grupo.
const DESENTERRADO = [
  'Fuera. Y la comisión pagada, que aquí nada es gratis.',
  'Desenterrado. Te ha costado, y era exactamente el trato.',
  'Sacado. El miedo se paga a plazos y este era uno.',
  'Arriba otra vez %C, con su mordida correspondiente.',
  'Desenterrado. Ahora vuelve a ser robable, enhorabuena.',
  'Fuera del agujero. Menos de lo que metiste, como te dijeron.',
  'Sacado. La comisión no la negocia nadie.',
  'Arriba. Y de paso ya sabe todo el grupo que tenías escondite.',
  'Desenterrado. Vuelve a la mesa, vuelve a ser carne.',
  'Fuera. Has pagado por guardarlo y ahora pagas por usarlo.',
  'Sacado del hoyo. La pala también cobra.',
  'Arriba. Ese pellizco de menos es lo que vale la tranquilidad.',
  'Desenterrado. Ya está a la vista de cualquiera con ganas.',
  'Fuera. Guardarlo fue fácil; esto es la factura.',
  'Sacado. Y ahora a gastarlo rápido, no vaya a ser.',
  'Arriba otra vez. El agujero se queda con su parte y no discute.',
  'Desenterrado. Bienvenido de nuevo al mundo de los robables.',
  'Fuera del zulo. Con menos peso, claro.',
  'Sacado. Cada vez que lo mueves, algo se queda por el camino.',
  'Arriba. Ya no está a salvo, pero al menos sirve para algo.',
];

// Quiere enterrar y aún no le toca.
const ENFRIAMIENTO = [
  'Acabas de cavar. Deja la pala un rato.',
  'Todavía no. Esconder a la carrera no vale, por eso hay espera.',
  'Aún no. El agujero es de ayer, no de ahora mismo.',
  'Espera. Enterrar es una decisión, no una huida.',
  'Ni de coña. Si ves venir el robo, ya es tarde.',
  'No. Esto se planea antes, no cuando te apuntan.',
  'Todavía no toca. La tierra está fresca.',
  'Espera tu turno con la pala. Y mientras, aguanta.',
  'No puedes. Justo por gente como tú existe el enfriamiento.',
  'Aún no. Esconderse en caliente sería demasiado cómodo.',
  'Deja de cavar un rato, que se nota.',
  'No. Ya cavaste hace poco y no fue hace tanto.',
];

// El zulo no da para más.
const LLENO = [
  'No cabe más. Es un agujero, no una caja fuerte.',
  'Lleno. Lo que sobra se queda arriba, a la vista de todos.',
  'Hasta arriba. El resto que se defienda solo.',
  'No entra. Un zulo tiene fondo, resulta.',
  'Está lleno. Tanto miedo no cabe en un solo hoyo.',
  'Ni uno más. Lo demás sigue siendo robable, disfrútalo.',
  'Lleno hasta el borde. A partir de aquí toca ser valiente.',
  'No cabe. Cava otro si eres capaz, que no lo eres.',
  'Completo. Lo que queda fuera es lo que te va a doler.',
  'Sin sitio. El resto se queda expuesto y con tu nombre.',
  'Lleno. Que se te vea algo también forma parte del juego.',
  'No entra más. Y menos mal, que si no esto sería un banco.',
];

// No llega al mínimo o no tiene saldo suficiente.
const POCO = [
  'Eso no se entierra, eso se pierde. Trae más.',
  'Por esa miseria no merece la pena ni levantar la baldosa.',
  'Menos de lo que cuesta cavar. Vuelve con algo serio.',
  'No. Esconder calderilla no te hace más listo.',
  'Trae una cifra de verdad o deja el agujero en paz.',
  'Eso no lo esconde nadie. Eso se gasta y ya.',
  'Muy poco. El zulo tiene dignidad, tú no.',
  'Ni para tapar el fondo. Sube la cifra.',
  'Con eso no llenas ni el hueco de una baldosa.',
  'No llega. Y si es todo lo que tienes, peor todavía.',
  'Esa cantidad da vergüenza hasta enterrada.',
  'No. Guarda algo que valga la pena esconder.',
];

// Mira su zulo y está vacío.
const VACIO = [
  'No tienes nada enterrado. Todo a la vista, como un pardillo.',
  'El agujero está vacío. Igual que la estrategia.',
  'Nada. Todo tu aura está en la calle esperando a que pase alguien.',
  'Vacío. Valiente o tonto, ya lo decidirá el grupo.',
  'No hay nada ahí abajo. Ni tierra removida.',
  'Cero enterrado. Todo tuyo y todo robable.',
  'El zulo está limpio. Como tu instinto de conservación.',
  'Nada guardado. Vas a pecho descubierto y se nota.',
  'Vacío. Aquí no has escondido ni el miedo.',
  'No tienes zulo que valga. Solo un agujero y buenas intenciones.',
  'Nada. Lo que tienes lo tienes donde todos lo ven.',
  'Vacío del todo. Eso o es valor o es dejadez.',
];

module.exports = { ENTERRADO, DESENTERRADO, ENFRIAMIENTO, LLENO, POCO, VACIO };
