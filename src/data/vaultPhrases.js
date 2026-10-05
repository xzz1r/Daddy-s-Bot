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
  'Cerrado. Que nadie diga que no sabe cuidarse.',
  'Guardado. Miedo con forma de candado.',
  'A la caja. El grupo entero sabe que hay algo ahí, eso sí.',
  'Con dos vueltas de llave. Ya no es tuyo del todo, pero es tuyo.',
  'Guardado. Un golpe redondo se lleva una parte de dentro. Tú, de momento, aguantas el resto, pequeña.',
  'Cerrado. Lo que queda fuera sigue siendo carne, por si acaso.',
  'A la caja. Que se joda el que venía a por ello.',
  'Candado echado. Ahora a rezar para no necesitarlo pronto.',
  'A cubierto. Guardar aura es admitir que te da miedo el grupo.',
  'Bajo llave. Y con el resto a la vista, que algo hay que dejar.',
  'Guardado. Aura que ya no juega, ya no compra y ya no sirve.',
  'Bajo llave. Ahora ya se puede dormir, con el candado debajo de la almohada.',
  'A cubierto. Ahora quien venga a robarte tiene que traer algo más que ganas, pequeña.',
  'Candado puesto, y a la vista de todo el grupo. Esconder no es discreto.',
  'Guardado. Lo sensato, que casi nunca es lo divertido.',
  'Cerrado. Ahora te duermes con algo más de calma.',
  'Bajo llave. Casi a salvo: un golpe maestro todavía revienta la caja.',
  'Bajo llave y fuera de la mesa. Esa aura ya no juega y tú tampoco con ella, pequeña.',
  'Bajo llave. Sacarlo va a doler, y lo sabes.',
  'Cerrado. Muy prudente y muy inútil, todo a la vez.',
];

// Lo ha sacado. Ha pagado comisión. Se lee en el grupo.
const SACADO = [
  'Fuera. Y la comisión pagada, que aquí nada es gratis.',
  'Caja abierta. Te ha costado y era exactamente el trato, pequeña.',
  'Sacado. El miedo se paga a plazos y este era uno.',
  'Otra vez en la mesa %C, con su mordida correspondiente.',
  'Sacado de la caja. Menos de lo que metiste, como te dijeron.',
  'Fuera. Y de paso ya sabe todo el grupo que tenías caja.',
  'Sacado. Vuelve a la mesa, vuelve a ser carne.',
  'Fuera. Guardarlo no cobraba. Abrirlo sí y acabas de pagarlo, pequeña.',
  'Abierta con tu propia llave. La cerradura también cobra.',
  'En la mano. Ese pellizco de menos es lo que vale la tranquilidad.',
  'Abierto. Y ahora a gastarlo rápido, no vaya a ser.',
  'Abierto. Cada vez que lo mueves, algo se queda por el camino.',
  'En la mano. Ya no está a salvo, pero al menos sirve para algo.',
  'Fuera. Lo que has pagado por salir va al bote, y el bote se lo lleva otro, pequeña.',
  'Sacado. Tu propia cerradura te ha cobrado, y ni te ha dado las gracias.',
  'Fuera. El aura vuelve a la mesa, y la mesa está llena de gente con hambre.',
  'Sacado. La factura del miedo llega al abrir, no al cerrar.',
  'Abierta. Parte de lo tuyo acaba en el bote, que es donde acaba todo lo que se mueve aquí.',
  'En la mano. Ahora te toca decidir en qué gastarlo, pequeña.',
  'Sacado. La caja pesa menos y tu saldo un poco más, que ya era hora.',
];

// Quiere guardar y aún no le toca.
const ENFRIAMIENTO = [
  'Acabas de cerrarla. Deja la llave un rato, pequeña.',
  'Ni de coña. Si ves venir el robo, ya es tarde.',
  'Todavía no toca. La cerradura sigue caliente.',
  'Aún no. Esconderse en caliente sería demasiado cómodo.',
  'Suelta la llave un rato, que se nota.',
  'Todavía no. Meter y sacar a lo loco no cuela.',
  'Aún no. Esconderte a cada rato tiene un límite, y lo has tocado.',
  'Espera. Has cerrado la caja hace nada y ya vuelves a por la llave, pequeña.',
  'No. Con tanta prisa por guardar, parece que te persigue alguien.',
  'Espera tu turno con la llave, que la caja no es una puerta giratoria, pequeña.',
  'No puedes todavía. La caja se ha cansado de verte.',
  'No. La cerraste hace un momento y la cerradura se acuerda.',
];

// La caja no da para más.
const LLENO = [
  'Llena. Lo que sobra se queda fuera, a la vista de todos.',
  'Hasta arriba. El resto que se defienda solo.',
  'No entra. Una caja tiene fondo, resulta.',
  'Está llena. Tanto miedo no cabe en un solo cajón.',
  'Ni uno más. Lo demás sigue siendo robable, disfrútalo.',
  'Llena hasta la tapa. A partir de aquí toca ser valiente.',
  'Completa. Lo que queda fuera es lo que te va a doler, pequeña.',
  'No entra más. Y menos mal, que si no esto sería un banco.',
  'No cabe más. La caja tiene tope, y tú acabas de encontrarlo.',
  'No cabe. Una caja por persona, y la tuya ya no admite ni una moneda.',
  'Sin sitio. Si tienes tanto, ya puedes ir comprando escudo para lo de fuera, pequeña.',
  'Llena. Tienes más aura de la que te cabe en la caja, y lo que sobra, a la vista.',
];

// No llega al mínimo o no tiene saldo suficiente.
const POCO = [
  'Por esa miseria no merece la pena ni abrir la caja.',
  'Por debajo del mínimo. Vuelve con algo serio.',
  'Trae una cifra de verdad o deja la caja en paz.',
  'Muy poco. La caja tiene dignidad, tú no, pequeña.',
  'Ni para cubrir el fondo. Sube la cifra.',
  'Con eso no llenas ni la ranura.',
  'No llega. Y si es todo lo que tienes, peor todavía.',
  'Esa cantidad da vergüenza hasta bajo llave.',
  'Eso no llega ni para que el candado se moleste. Trae más.',
  'No. Esconder calderilla es de rata, y hasta las ratas guardan más.',
  'Con eso no se cierra una caja, se cierra una hucha de cerdito.',
  'No. Guarda algo que merezca la llave.',
];

// Mira su caja y está vacía.
const VACIO = [
  'La caja está vacía. Igual que la estrategia.',
  'Nada. Todo tu aura está en la calle esperando a que pase alguien, pequeña.',
  'No hay nada ahí dentro. Ni el eco.',
  'Cero bajo llave. Todo tuyo y todo robable.',
  'La caja está limpia. Como tu instinto de conservación.',
  'Nada guardado. Vas a pecho descubierto y se nota, pequeña.',
  'Vacía. Aquí no has metido ni el miedo.',
  'No tienes caja que valga. Solo un candado y buenas intenciones, pequeña.',
  'No tienes nada guardado. Todo a la vista, como quien deja la cartera en la mesa del bar.',
  'Vacía. Ni una moneda, y la llave cogiendo polvo.',
  'Nada. Abrir una caja vacía es lo más triste que se puede hacer con un candado.',
  'Vacía del todo. Para sacar, primero hay que meter.',
];

module.exports = { GUARDADO, SACADO, ENFRIAMIENTO, LLENO, POCO, VACIO };
