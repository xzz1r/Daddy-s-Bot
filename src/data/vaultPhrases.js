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
  'Guardadito. Que nadie diga que no sabes esconder lo poco que tienes.',
  'Guardado, y la cerradura ya ha cobrado su parte. Tu miedo empieza a salir caro.',
  'Al banco. Ahora sé que tienes algo que esconder, y que te cagas por perderlo.',
  'Con dos vueltas de llave. El candado ya ha cobrado, y tú ya puedes dejar de temblar.',
  'Guardado. Ojo, que un golpe redondo se lleva una parte de dentro: has pagado por un escondite con agujero.',
  'Cerrado. Lo que queda fuera sigue siendo carne, por si acaso.',
  'Al banco. El que venía a por ello se joderá, y tú también, cuando pagues por sacarlo.',
  'Candado echado. Ahora a rezar para no necesitarlo, que sacarlo te va a costar un ojo.',
  'A cubierto. Guardar aura es admitir que te da miedo el grupo.',
  'Bajo llave. Lo de fuera queda a la vista, y con tu suerte, ya tiene dueño.',
  'Escondido, rata. Cuatro duros bajo llave y ya vas de millonario.',
  'Guardado. Ahora ya se puede dormir, con el candado debajo de la almohada.',
  'A cubierto. Ahora para robarte hay que traer pala, y en este grupo palas sobran. Tú, a dormir con un ojo abierto.',
  'Candado puesto delante de todos. Has anunciado dónde está el botín, que es justo lo contrario de esconderlo.',
  'Hecho. Lo sensato, que es justo por lo que das tanto coñazo.',
  'Cerrado. Ahora puedes cagarte de miedo con algo más de calma.',
  'Bajo llave. Casi a salvo: con *!robarbanco* te lo revientan igual, y encima habrás pagado por ponérselo bonito.',
  'Bajo llave y fuera de la mesa. Esa aura ya no juega y tú tampoco con ella, pequeña.',
  'Ya está dentro. Sacarlo va a doler, y lo sabes.',
  'Cerrado. Muy prudente y muy inútil, todo a la vez.',
];

// Lo ha sacado. Ha pagado comisión. Se lee en el grupo.
const SACADO = [
  'Fuera. Y la comisión pagada, que aquí lo único que no te cobran es el ridículo.',
  'Abierto. Pagas por sacar tu propio dinero, como cualquier gilipoyas con banco.',
  'Sacado. El miedo se paga a plazos y este era uno.',
  'Otra vez en la mesa %C, con su mordida, y tú otra vez a tiro de cualquiera.',
  'Sacado del banco. Menos de lo que metiste, como te dijeron, y como te pasa con todo.',
  'Fuera. Y de paso me entero de que tenías algo, y de que ahora lo llevas encima.',
  'Sacado. Vuelve a la mesa, vuelve a ser carne.',
  'Fuera. Pagaste por guardarlo y ahora por sacarlo: doble peaje por tu propio miedo.',
  'Abierto con tu propia llave. La cerradura también cobra, y te ha tratado como a cualquiera, que es lo que eres.',
  'En la mano. Ese pellizco de menos es lo que te ha costado la tranquilidad, y ni la has disfrutado.',
  'Abierto. Y ahora a gastarlo rápido, antes de que te lo levante alguien del grupo.',
  'Abierto. Cada vez que lo mueves, algo se queda por el camino, como todo lo que tocas.',
  'En la mano. Ya no está a salvo, pero al menos sirve para algo, que es más de lo que se puede decir de ti.',
  'Fuera. Lo que has pagado por salir va al bote, y el bote se lo lleva otro.',
  'Sacado. Tu propia cerradura te ha cobrado, y ni te ha dado las gracias.',
  'Fuera. El aura vuelve a la mesa, y la mesa está llena de gente con hambre.',
  'Sacado, y con la comisión cobrada. Guardar y sacar tan seguido es pagar dos veces por no saber lo que quieres.',
  'Abierto. Parte de lo tuyo acaba en el bote, que es donde acaba todo lo que se mueve aquí.',
  'En la mano. Fuera del banco dura lo que tardes en apostarlo, pequeña.',
  'Sacado. El banco pesa menos y tu saldo un poco más. Por poco tiempo, conociéndote.',
];

// Quiere guardar y aún no le toca.
const ENFRIAMIENTO = [
  'Acabas de cerrarlo. Deja la llave un rato, que el miedo no se cura abriendo y cerrando.',
  'Ni de coña. La llave no gira tan seguido por mucho miedo que tengas.',
  'Todavía no toca. La cerradura sigue caliente de tu último ataque de pánico.',
  'Aún no. Tanto ir y venir del banco es de rata asustada.',
  'Suelta la llave un rato, que se te nota el temblor desde aquí.',
  'Todavía no. Guardar y sacar a lo loco no es estrategia, es tu ansiedad con cerradura.',
  'Aún no. Esconderte a cada rato tiene un límite, y lo has tocado.',
  'Espera. Has cerrado el banco hace nada y ya vuelves a por la llave. Ni a tu propio candado le das un respiro.',
  'No. Con tanta prisa por guardar, parece que te persigue alguien. Tranquilidad, que a ti no te persigue nadie.',
  'Espera tu turno con la llave, que el banco no es una puerta giratoria, princesa.',
  'No puedes todavía. El banco se ha cansado de verte.',
  'No. Lo cerraste hace un momento y la cerradura se acuerda, que es más de lo que hace nadie contigo.',
];

// La caja no da para más.
const LLENO = [
  'Lleno. Lo que sobra se queda fuera, a la vista de todos y con tu nombre en la etiqueta.',
  'Hasta arriba. El resto que se defienda solo, que tú no vas a ser.',
  'No entra. Hasta el banco se cansa de guardarle el miedo a una rata como tú.',
  'Está lleno. Tanto miedo no cabe en un solo cajón.',
  'Ni uno más. Lo demás sigue siendo robable, disfrútalo.',
  'Lleno hasta la tapa. A partir de aquí toca ser valiente, y eso no lo has sido nunca.',
  'Completo. Lo que queda fuera es lo que te va a doler, muñeca.',
  'No entra más. Y menos mal, que si no tu banco sería la reserva federal de un bot de WhatsApp. Todo un imperio, en un chat.',
  'No cabe más. El banco tiene tope, y tú acabas de encontrarlo.',
  'No cabe. Un banco por persona, y el tuyo ya no admite ni una moneda.',
  'Sin sitio. Si tienes tanto, ya puedes ir comprando escudo para lo de fuera.',
  'Lleno. Tienes más aura de la que te cabe en el banco, y lo que sobra, a la vista.',
];

// No llega al mínimo o no tiene saldo suficiente.
const POCO = [
  'Por esa miseria no merece la pena ni abrir el banco. Y es todo lo que tienes, ¿verdad?',
  'Por debajo del mínimo. Vuelve cuando tengas algo que te dé pena perder.',
  'Trae una cifra de verdad o deja el banco en paz, que se está riendo de ti.',
  'Muy poco. El banco tiene dignidad, tú no.',
  'Ni para cubrir el fondo. El banco no guarda migas, y tú solo traes migas.',
  'Con eso no llenas ni la ranura. Ni el banco ni nadie te toma en serio.',
  'No llega. Y si es todo lo que tienes, peor todavía.',
  'Esa cantidad da vergüenza hasta bajo llave, y tú la traes con orgullo.',
  'Eso no llega ni para que el candado se moleste. Trae más, si es que tienes más, que lo dudo.',
  'No. Esconder calderilla es de rata, y hasta las ratas guardan más.',
  'Con eso no se llena un banco, se llena una hucha de cerdito, y a ti ni eso te alcanza.',
  'No. Guarda algo que merezca la llave, si algún día tienes algo.',
];

// Mira su caja y está vacía.
const VACIO = [
  'El banco está vacío. Ahorrar no está entre tus putas virtudes, y tienes pocas.',
  'Nada. Todo tu aura anda suelta por el grupo, esperando a que alguien se la lleve, reina.',
  'No hay nada ahí dentro, y no es que lo escondas bien: es que no tienes nada que esconder.',
  'Cero bajo llave. Todo tuyo y todo robable.',
  'El banco está limpio. Como tu instinto de conservación.',
  'Nada guardado. Vas a pecho descubierto, y no por valiente.',
  'Vacío. Aquí no has metido ni el miedo.',
  'No tienes banco que valga. Solo un candado y buenas intenciones.',
  'No tienes nada guardado. Todo a la vista, como quien deja la cartera en la mesa del bar.',
  'Vacío. Ni una moneda, y la llave cogiendo polvo.',
  'Nada. Tienes un candado cerrando un banco vacío, que es ser gilipoyas con método.',
  'Vacío del todo. Para sacar, primero hay que tener, y ahí te has quedado.',
];

module.exports = { GUARDADO, SACADO, ENFRIAMIENTO, LLENO, POCO, VACIO };
