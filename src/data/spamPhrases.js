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
//
// CADENA_SPAM es el aviso de la cadena (18 oct): el mismo copy pegado por
// varias personas. Va detrás de «@a, @b y @c, el spam está prohibido, también
// en cadena.», así que habla a todos en plural y no lleva huecos. El mismo
// ataque que AVISO_SPAM, a su humor, y todas dicen que es spam.

const AVISO_SPAM = [
  'No tienes ni puta gracia, y no la vas a tener nunca por mucho spam que metas.',
  'Nunca has hecho reír a nadie en tu vida, y por eso te dedicas a spamear chistes de otros.',
  'Te ríes tú de tu propio spam de mierda porque nadie más te lo ríe.',
  'Si alguien se ha reído con tu spam, se reía de ti, y ni te has enterado.',
  'Naciste sin una puta gota de gracia y te vas a morir igual, spameando copys de otros.',
  'Tu sentido del humor no existe, joder. Lo que tienes es un portapapeles para spamear y unas ganas desesperadas de que te miren.',
  'Hacer gracia no es lo tuyo y no lo va a ser nunca. Tú spameas y das vergüenza ajena, que es otra cosa.',
  'Ni spameando mil copys vas a tener la gracia que te crees que tienes.',
  'Lo más gracioso que has hecho hoy es creer que este spam tenía gracia.',
  'No eres la puta persona graciosa del grupo: eres la que lo llena de spam hasta que la gente lo silencia.',
];

const BAN_SPAM = [
  'Que os sirva de ejemplo: esta escoria, %M, ha sido baneada por spam de mensajes.',
  'Este pedazo de mierda, %M, ha sido baneado por spam. Pegó lo mismo en bucle y se va sin un solo chiste propio.',
  'Mirad bien a %M, que es lo último que vais a ver de su puto humor: ban por spam y a la calle.',
  'A %M el spam le ha costado el grupo, y no vuelve a entrar. Quien tenga guardado el mismo copy, que lo borre ya.',
  'Esta rata de %M ha llenado el chat de spam con la misma basura, y se va de cabeza a la lista negra.',
  'Ban a %M por spam de mensajes. Su gran número de humor era repetir la misma gilipoyez, y ahora lo va a repetir fuera.',
  'Se acabó el bucle de %M: ban por spam. Todo su puto repertorio era una sola frase, y ya la ha gastado.',
  '%M creía que spamear era gracioso. El ban también tiene su gracia, pero solo para quienes se quedan.',
  'Que nadie copie a %M, que ha acabado con ban por spamear lo mismo hasta dar asco. Quien quiera seguirle, ya sabe el camino.',
  'Así acaba el spam: %M, fuera del grupo y en la lista negra. Haced captura, que este aviso es lo único con gracia que va a dejar aquí.',
];

const ADMIN_SPAM = [
  'Que os sirva de ejemplo: %M se queda sin admin por spam. El cargo le venía grande, y el copia y pega también.',
  '%M era admin y ha spameado como si el puto grupo fuera suyo. Ya no es suyo: se queda sin admin.',
  'Fuera el admin de %M por spam. Tenía las llaves del grupo y las ha usado para llenarlo de mierda.',
  '%M ha confundido ser admin con tener permiso para spamear mierda. Ahora no tiene ni lo uno ni lo otro.',
  'Ser admin no te salva del spam, y %M lo acaba de aprender sin admin y delante de todos.',
  'A %M se le acaba el admin por spam. Mandaba en el grupo y ahora no manda ni en su puto portapapeles.',
  'Un admin no hace spam, y %M lo ha hecho en bucle. Así que ya no es admin: ahora solo es quien hacía el gilipoyas.',
  'Mirad a %M: tenía que cuidar el grupo y lo ha llenado de spam. Sin admin, que es lo que le toca a una basura así.',
  '%M pierde el admin por spam. Quien tenía que frenarlo lo ha mandado en bucle, y eso no se perdona con el cargo puesto.',
  'Se acabó el admin de %M: spam en bucle y cero vergüenza. La vergüenza se la pone el grupo, que lo está viendo.',
];

const CADENA_SPAM = [
  'Pegar entre todos el mismo copy no os hace graciosos. Os hace spam, y del malo.',
  'Ninguno de vosotros tiene gracia, y repetir el copy del de al lado no la arregla: es spam.',
  'Si para hacer reír necesitáis copiaros el spam unos a otros, no vais a hacer reír nunca.',
  'Sois varios pegando lo mismo y entre todos no juntáis ni media gracia. Eso es spam, no humor.',
  'Vuestro humor entero cabe en un copiar y pegar, y por eso lo único que sabéis hacer es spam.',
  'Lo que vosotros llamáis broma es el mismo spam pegado una y otra vez, y no tiene puta gracia.',
  'Repetís el spam que pega otro porque no se os ocurre nada vuestro, y se nota muchísimo.',
  'Copiar el chiste de otro en cadena es lo más cerca que vais a estar de tener gracia, y sigue siendo spam.',
  'Ni el primero que lo pegó tenía gracia ni la tenéis los que lo habéis repetido. Spam y nada más.',
  'Os habéis puesto de acuerdo para hacer spam y ni así os ha salido algo gracioso.',
];

module.exports = { AVISO_SPAM, BAN_SPAM, ADMIN_SPAM, CADENA_SPAM };
