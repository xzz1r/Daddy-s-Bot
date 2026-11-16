// Spam de texto: la misma frase pegada una y otra vez.
//
// Lo pidió el dueño (17 oct): la gente manda copys en bucle porque se cree que
// tienen gracia. 5 mensajes iguales en menos de 10 segundos y el bot
// cierra el grupo con un *Aviso 1 de 2*; a la segunda, ban. Las cuentas viven
// en src/utils/spamTexto.js.
//
// AVISO_SPAM va detrás de «@persona, el spam está prohibido.», así que no lleva
// huecos. Ataque directo y personal a quien acaba de spamear, como lo pidió el
// dueño: no tiene gracia y no la va a tener nunca. Nada de hablar del chiste.
// Y todas, las del aviso y las del ban, dicen que es por el spam (capa 125).
//
// BAN_SPAM sale cuando ya está fuera, y le habla al grupo: usa a esa persona de
// ejemplo. %M es su mención. Nada concuerda con %M en masculino ni en femenino:
// «baneada» va con «escoria» y «baneado» con «pedazo», no con quien se va.
//
// ADMIN_SPAM es lo mismo para un admin (18 oct): a la segunda no se le banea,
// se le quita el admin. Sigue en el grupo y lo lee. Todas dicen que es por el
// spam y que se queda sin admin.

const AVISO_SPAM = [
  'No tienes ni puta gracia, y no la vas a tener nunca por mucho spam que metas.',
  'Nunca has hecho reír a nadie en tu vida, ni gemir, y por eso te dedicas a spamear chistes de otros.', // ROCKSTAR
  'Te ríes tú de tu propio spam de mierda porque nadie más te lo ríe.',
  'Si alguien se ha reído con tu spam, se reía de ti, como en tu última cita.', // ROCKSTAR
  'Naciste sin una puta gota de gracia y te vas a morir igual, spameando copys de otros.',
  'Tu sentido del humor no existe, joder. Lo que tienes es un portapapeles para el spam y unas ganas desesperadas de que te toquen. De que te miren, quería decir.', // ROCKSTAR
  'Hacer gracia no es lo tuyo y no lo va a ser nunca. Tú spameas y das vergüenza ajena, que es otra cosa.',
  'Ni spameando mil copys vas a tener la gracia que te crees que tienes.',
  'Spamear lo mismo cinco veces seguidas solo funciona en la cama, y contigo ni ahí.', // ROCKSTAR
  'No eres la puta persona graciosa del grupo: eres la que lo llena de spam hasta que la gente lo silencia.',
];

const BAN_SPAM = [
  'Que os sirva de ejemplo: esta escoria, %M, ha sido baneada por spam de mensajes.',
  'Este pedazo de mierda, %M, ha sido baneado por spam. Pegó lo mismo en bucle y se va sin un solo chiste propio.',
  'Mirad bien a %M, que es lo último que vais a ver de su puto humor: ban por spam y a la calle.',
  'A %M el spam le ha costado el grupo. Entraba y salía tanto que al final se ha quedado fuera.', // ROCKSTAR
  'Esta rata de %M ha llenado el chat de spam con la misma basura, y se va de cabeza a la lista negra.',
  'Ban a %M por spam. Su gran número era repetir lo mismo en bucle, como en la cama, y ahora lo repite fuera.', // ROCKSTAR
  'Se acabó el bucle de %M: ban por spam. Todo su repertorio era una sola postura, digo, una sola frase, y ya la ha gastado.', // ROCKSTAR
  '%M creía que spamear era gracioso. El ban también tiene su gracia, pero solo para quienes se quedan.',
  'Que nadie copie a %M, que lo ha metido tantas veces seguidas que al final le han sacado. Ban por spam.', // ROCKSTAR
  'Así acaba el spam: %M, fuera del grupo y en la lista negra. Haced captura, que este aviso es lo único con gracia que va a dejar aquí.',
];

const ADMIN_SPAM = [
  'Que os sirva de ejemplo: %M se queda sin admin por spam. El cargo le venía grande, y el copia y pega también.',
  '%M era admin y se ha desahogado a base de spam, sin control y sin preguntar. Se queda sin admin, y que alguien pase la fregona.', // ROCKSTAR
  'Fuera el admin de %M por spam. Tenía las llaves del grupo y las ha usado para llenarlo de mierda.',
  '%M ha confundido tener las llaves del grupo con poder meter spam en todas las habitaciones. Sin admin.', // ROCKSTAR
  'Ser admin no te salva del spam, y %M lo acaba de aprender sin admin y delante de todos.',
  'A %M se le acaba el admin por spam. Mandaba en el grupo, y ahora no manda ni en su propia cama.', // ROCKSTAR
  'Un admin no hace spam, y %M lo ha hecho en bucle. Así que ya no es admin: ahora solo es quien hacía el gilipoyas.',
  'Mirad a %M: tenía que cuidar el grupo y lo ha dejado pringado de spam. Sin admin, y con el grupo pidiendo una ducha.', // ROCKSTAR
  '%M pierde el admin por spam. Quien tenía que frenarlo lo ha mandado en bucle, y eso no se perdona con el cargo puesto.',
  'Se acabó el admin de %M: spam en bucle y cero vergüenza. La vergüenza se la pone el grupo, que lo está viendo.',
];

module.exports = { AVISO_SPAM, BAN_SPAM, ADMIN_SPAM };
