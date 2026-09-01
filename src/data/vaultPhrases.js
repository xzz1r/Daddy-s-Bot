// Frases de la *!vault*: la caja donde se guarda el aura para que no la roben.
//
// %N = mención · %C = la cantidad que se mueve · %Z = lo que queda dentro
// %S = el saldo que queda a la vista
//
// EL TONO NO ES EL DE UN BANCO. Aquí nadie "realiza una operación": aquí se
// cierra con llave y se mira por encima del hombro. El bot no felicita al que
// guarda — le recuerda que esconder es de cobardes y que además le va a costar
// dinero sacarlo. Y al que lo saca, que acaba de pagar por su propio miedo.
//
// Cortas a propósito: esto sale debajo de una cabecera que ya dice las cifras,
// igual que en !apostar. Repetir el número en la frase es escribirlo dos veces.

// Lo ha guardado. Se lee en el grupo.
const GUARDADO = [
  'Bajo llave. Ahora duerme tranquilo el cobarde.',
  'Cerrado. Que nadie diga que no sabe cuidarse.',
  'Guardado. Miedo con forma de candado.',
  'A la caja. El grupo entero sabe que hay algo ahí, eso sí.',
  'A cubierto. Lo que no se ve no se roba, y punto.',
  'Encerrado como un perro con un hueso. Igual de digno.',
  'Guardado. Muy listo. Y muy triste, pero listo.',
  'Bajo llave %C. Sacarlo va a doler, avisado quedas.',
  'Cerrado. Ahora sí puede dormir el señorito.',
  'A salvo. Cobardía bien ejecutada, hay que reconocerlo.',
  'Con dos vueltas de llave. Ya no es tuyo del todo, pero es tuyo.',
  'Guardado. El que roba no llega, y tú tampoco hasta que pagues.',
  'Bajo llave y fuera de la mesa. Las dos cosas a la vez.',
  'Cerrado. Lo que queda fuera sigue siendo carne, por si acaso.',
  'A la caja. Que se joda el que venía a por ello.',
  'Candado echado. Ahora a rezar para no necesitarlo pronto.',
  'A cubierto. Guardar aura es admitir que te da miedo el grupo.',
  'Bajo llave. Y con el resto a la vista, que algo hay que dejar.',
  'Cerrado. Muy seguro, muy inútil, todo a la vez.',
  'Guardado. Aura que ya no juega, ya no compra y ya no sirve.',
];

// Lo ha sacado. Ha pagado comisión. Se lee en el grupo.
const SACADO = [
  'Fuera. Y la comisión pagada, que aquí nada es gratis.',
  'Caja abierta. Te ha costado, y era exactamente el trato.',
  'Sacado. El miedo se paga a plazos y este era uno.',
  'Otra vez en la mesa %C, con su mordida correspondiente.',
  'Fuera. Ahora vuelve a ser robable, enhorabuena.',
  'Sacado de la caja. Menos de lo que metiste, como te dijeron.',
  'Abierto. La comisión no la negocia nadie.',
  'Fuera. Y de paso ya sabe todo el grupo que tenías caja.',
  'Sacado. Vuelve a la mesa, vuelve a ser carne.',
  'Fuera. Has pagado por guardarlo y ahora pagas por usarlo.',
  'Abierta con tu propia llave. La cerradura también cobra.',
  'En la mano. Ese pellizco de menos es lo que vale la tranquilidad.',
  'Sacado. Ya está a la vista de cualquiera con ganas.',
  'Fuera. Guardarlo fue fácil; esto es la factura.',
  'Abierto. Y ahora a gastarlo rápido, no vaya a ser.',
  'En la mesa otra vez. El candado se queda con su parte y no discute.',
  'Sacado. Bienvenido de nuevo al mundo de los robables.',
  'Fuera de la caja. Con menos peso, claro.',
  'Abierto. Cada vez que lo mueves, algo se queda por el camino.',
  'En la mano. Ya no está a salvo, pero al menos sirve para algo.',
];

// Quiere guardar y aún no le toca.
const ENFRIAMIENTO = [
  'Acabas de cerrarla. Deja la llave un rato.',
  'Todavía no. Guardar a la carrera no vale, por eso hay espera.',
  'Aún no. El candado es de ayer, no de ahora mismo.',
  'Espera. Guardar es una decisión, no una huida.',
  'Ni de coña. Si ves venir el robo, ya es tarde.',
  'No. Esto se planea antes, no cuando te apuntan.',
  'Todavía no toca. La cerradura sigue caliente.',
  'Espera tu turno con la llave. Y mientras, aguanta.',
  'No puedes. Justo por gente como tú existe el enfriamiento.',
  'Aún no. Esconderse en caliente sería demasiado cómodo.',
  'Suelta la llave un rato, que se nota.',
  'No. La cerraste hace poco y no fue hace tanto.',
];

// La caja no da para más.
const LLENO = [
  'No cabe más. Es una caja, no una cámara acorazada.',
  'Llena. Lo que sobra se queda fuera, a la vista de todos.',
  'Hasta arriba. El resto que se defienda solo.',
  'No entra. Una caja tiene fondo, resulta.',
  'Está llena. Tanto miedo no cabe en un solo cajón.',
  'Ni uno más. Lo demás sigue siendo robable, disfrútalo.',
  'Llena hasta la tapa. A partir de aquí toca ser valiente.',
  'No cabe. Cómprate otra si eres capaz, que no lo eres.',
  'Completa. Lo que queda fuera es lo que te va a doler.',
  'Sin sitio. El resto se queda expuesto y con tu nombre.',
  'Llena. Que se te vea algo también forma parte del juego.',
  'No entra más. Y menos mal, que si no esto sería un banco.',
];

// No llega al mínimo o no tiene saldo suficiente.
const POCO = [
  'Eso no se guarda, eso se pierde. Trae más.',
  'Por esa miseria no merece la pena ni abrir la caja.',
  'Menos de lo que cuesta el candado. Vuelve con algo serio.',
  'No. Esconder calderilla no te hace más listo.',
  'Trae una cifra de verdad o deja la caja en paz.',
  'Eso no lo guarda nadie. Eso se gasta y ya.',
  'Muy poco. La caja tiene dignidad, tú no.',
  'Ni para cubrir el fondo. Sube la cifra.',
  'Con eso no llenas ni la ranura.',
  'No llega. Y si es todo lo que tienes, peor todavía.',
  'Esa cantidad da vergüenza hasta bajo llave.',
  'No. Guarda algo que valga la pena cerrar.',
];

// Mira su caja y está vacía.
const VACIO = [
  'No tienes nada guardado. Todo a la vista, como un pardillo.',
  'La caja está vacía. Igual que la estrategia.',
  'Nada. Todo tu aura está en la calle esperando a que pase alguien.',
  'Vacía. Valiente o tonto, ya lo decidirá el grupo.',
  'No hay nada ahí dentro. Ni el eco.',
  'Cero bajo llave. Todo tuyo y todo robable.',
  'La caja está limpia. Como tu instinto de conservación.',
  'Nada guardado. Vas a pecho descubierto y se nota.',
  'Vacía. Aquí no has metido ni el miedo.',
  'No tienes caja que valga. Solo un candado y buenas intenciones.',
  'Nada. Lo que tienes lo tienes donde todos lo ven.',
  'Vacía del todo. Eso o es valor o es dejadez.',
];

module.exports = { GUARDADO, SACADO, ENFRIAMIENTO, LLENO, POCO, VACIO };
