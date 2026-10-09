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
  'El cajón se traga el aura. La cuentan de dos en dos, apuntan la mordida y echan la llave.',
  'Guardado. Miedo con forma de candado.',
  'Al banco. El grupo entero sabe que hay algo ahí, eso sí.',
  'Con dos vueltas de llave. Ya no es tuyo del todo, pero es tuyo.',
  'Guardado. Un golpe redondo se lleva una parte de dentro. Tú, de momento, aguantas el resto.',
  'Cerrado. Lo que queda fuera sigue siendo carne, por si acaso.',
  'Al banco. Que se joda el que venía a por ello.',
  'Candado echado. Ahora a rezar para no necesitarlo pronto.',
  'A cubierto. La letra pequeña ya pone la comisión de abrir, y el boli sigue destapado.',
  'Bajo llave. Y con el resto a la vista, que algo hay que dejar.',
  'Guardado. Esa aura ya no juega, y la comisión de sacarla queda escrita al margen.',
  'Bajo llave. Ahora ya se puede dormir, con el candado debajo de la almohada.',
  'A cubierto. Ahora quien venga a robarte tiene que traer algo más que ganas.',
  'Candado puesto, y a la vista de todo el grupo. Ahora todos saben que tienes algo.',
  'El sello te mancha el dedo. La cifra queda presa y la mesa se queda sin ella.',
  'Doblan el recibo, te lo meten en el bolsillo y el candado hace clic.',
  'Bajo llave. Casi a salvo: con *!robarbanco* todavía te lo pueden reventar.',
  'Bajo llave y fuera de la mesa. Esa aura ya no juega y tú tampoco con ella.',
  'Bajo llave. Sacarlo va a doler, y lo sabes.',
  'Cerrado. Firma, sello, y esa aura sale de la mesa: ya no se apuesta.',
];

// Lo ha sacado. Ha pagado comisión. Se lee en el grupo.
const SACADO = [
  'Fuera. Y la comisión pagada, que aquí nada es gratis.',
  'Abierto. Te descuentan la mordida delante, cuentan el resto y te lo plantan en la palma.',
  'Sacado. El miedo se paga a plazos y este era uno.',
  'Otra vez en la mesa %C, con su mordida correspondiente.',
  'Sacado del banco. Menos de lo que metiste, como te dijeron.',
  'Fuera. Y de paso ya sabe todo el grupo que tenías banco.',
  'Sacado. Vuelve a la mesa, vuelve a ser carne.',
  'Fuera. Guardarlo era gratis, pero abrirlo se paga, y acabas de pagarlo.',
  'Abierto con tu propia llave. La cerradura también cobra.',
  'En la mano. Ese pellizco de menos es lo que vale la tranquilidad.',
  'Abierto. Y ahora a gastarlo rápido, no vaya a ser.',
  'Abierto. Cada vez que lo mueves, algo se queda por el camino.',
  'En la mano. La comisión se ha quedado en el cajón y lo que te dan ya puede perderse en la mesa.',
  'Fuera. Lo que has pagado por salir va al bote, y el bote se lo lleva otro.',
  'Sacado. Tu propia cerradura te ha cobrado, y ni te ha dado las gracias.',
  'Fuera. El aura vuelve a la mesa, y la mesa está llena de gente con hambre.',
  'Sacado, y con la comisión cobrada. El miedo sale caro.',
  'Abierto. Parte de lo tuyo acaba en el bote, que es donde acaba todo lo que se mueve aquí.',
  'En la mano. Fuera del banco dura lo que tardes en apostarlo.',
  'Sacado. El banco pesa menos y tu saldo un poco más, que ya era hora.',
];

// Quiere guardar y aún no le toca.
const ENFRIAMIENTO = [
  'Acabas de cerrarlo. Deja la llave un rato.',
  'Ni de coña. Si ves venir el robo, ya es tarde.',
  'Todavía no toca. La cerradura sigue caliente.',
  'Aún no. La tinta del último sello sigue húmeda y el cajón no te abre.',
  'Suelta la llave un rato, que se nota.',
  'Todavía no. Meter y sacar a lo loco no cuela.',
  'Aún no. La comisión de antes está fresca en el margen y no hay otra casilla.',
  'Espera. Has cerrado el banco hace nada y ya vuelves a por la llave.',
  'No. Con tanta prisa por guardar, parece que te persigue alguien.',
  'Espera tu turno con la llave, que el banco no es una puerta giratoria.',
  'No puedes todavía. El banco se ha cansado de verte.',
  'No. Lo cerraste hace un momento y la cerradura se acuerda.',
];

// La caja no da para más.
const LLENO = [
  'Lleno. Lo que sobra se queda fuera, a la vista de todos.',
  'Hasta arriba. El resto que se defienda solo.',
  'No entra. Llegan a la raya del cajón y te devuelven el billete de más, todavía en la mano.',
  'Está lleno. Tanto miedo no cabe en un solo cajón.',
  'Ni uno más. Lo demás sigue siendo robable, disfrútalo.',
  'Lleno hasta la tapa. Lo que sobra se queda en el mostrador, sin sello, a la vista de quien pase.',
  'Completo. Lo que queda fuera es lo que te va a doler.',
  'No entra más. Y menos mal, que si no esto sería la reserva federal.',
  'No cabe más. Cierran el libro en la última línea y te dejan el resto encima de la mesa.',
  'No cabe. Un banco por persona, y el tuyo ya no admite ni una moneda.',
  'Sin sitio. Si tienes tanto, ya puedes ir comprando escudo para lo de fuera.',
  'Lleno. Tienes más aura de la que te cabe en el banco, y lo que sobra, a la vista.',
];

// No llega al mínimo o no tiene saldo suficiente.
const POCO = [
  'Por esa miseria no merece la pena ni abrir el banco.',
  'Por debajo del mínimo. Te empujan la moneda de vuelta por el mostrador, sin abrir el cajón.',
  'Trae una cifra de verdad o deja el banco en paz.',
  'Muy poco. El banco tiene dignidad, tú no.',
  'Ni para cubrir el fondo. El banco no guarda migas.',
  'Con eso no llenas ni la ranura.',
  'No llega ni a la comisión del candado. El boli se queda tapado y el libro ni se abre.',
  'Esa cantidad da vergüenza hasta bajo llave.',
  'Eso no llega ni para que el candado se moleste. Trae más.',
  'No. Esconder calderilla es de rata, y hasta las ratas guardan más.',
  'Con eso no se llena un banco, se llena una hucha de cerdito.',
  'No. Guarda algo que merezca la llave.',
];

// Mira su caja y está vacía.
const VACIO = [
  'Abren el banco y el cajón va vacío: miran el fondo y lo cierran sin mojar el libro.',
  'Nada. Todo tu aura está en la calle esperando a que pase alguien.',
  'No hay nada ahí dentro. Ni polvo.',
  'Cero bajo llave. Todo tuyo y todo robable.',
  'Pasan el paño, el recibo sale en blanco y lo parten por la mitad en el mostrador.',
  'Nada guardado. Vas a pecho descubierto y se nota.',
  'Vacío. Aquí no has metido ni el miedo.',
  'No tienes banco que valga. Solo un candado y buenas intenciones.',
  'No tienes nada guardado. Todo a la vista, como quien deja la cartera en la mesa del bar.',
  'Vacío. Ni una moneda, y la llave cogiendo polvo.',
  'La llave gira en vacío. No hay monedas que contar y el candado vuelve a cerrarse solo.',
  'Quieren la comisión del saque y el cajón no tiene ni para pagar el sello.',
];

module.exports = { GUARDADO, SACADO, ENFRIAMIENTO, LLENO, POCO, VACIO };
