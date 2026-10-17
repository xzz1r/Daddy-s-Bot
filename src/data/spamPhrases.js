// Spam de texto: la misma frase pegada una y otra vez.
//
// Lo pidió el dueño (17 oct): la gente manda copys en bucle porque se cree que
// tienen gracia. Más de 10 mensajes iguales en menos de 10 segundos y el bot
// cierra el grupo con un *Aviso 1 de 2*; a la segunda, ban. Las cuentas viven
// en src/utils/spamTexto.js.
//
// AVISO_SPAM va detrás de «@persona, el spam está prohibido.», así que no lleva
// huecos. Ataque directo y personal a quien acaba de spamear, como lo pidió el
// dueño: no tiene gracia y no la va a tener nunca. Nada de hablar del chiste.
//
// BAN_SPAM sale cuando ya está fuera, y le habla al grupo: usa a esa persona de
// ejemplo. %M es su mención. Nada concuerda con %M en masculino ni en femenino:
// «baneada» va con «escoria» y «baneado» con «pedazo», no con quien se va.

const AVISO_SPAM = [
  'No tienes ni puta gracia, y no la vas a tener nunca: eso no se aprende copiando.',
  'Nunca has hecho reír a nadie en tu vida, y por eso robas chistes de otros y los pegas en bucle.',
  'Te ríes tú de tus propios chistes de mierda porque nadie más te los ríe.',
  'Si alguien se ha reído alguna vez contigo, se estaba riendo de ti y no te enteraste.',
  'Naciste sin una puta gota de gracia y te vas a morir igual, pegando copys de otros.',
  'Tu sentido del humor no existe, joder. Lo que tienes es un portapapeles y unas ganas desesperadas de que te miren.',
  'Hacer gracia no es lo tuyo y no lo va a ser nunca. Tú das vergüenza ajena, que es otra cosa.',
  'Ni con mil copys vas a tener la gracia que te crees que tienes.',
  'Lo más gracioso que has hecho hoy es creer que esto tenía gracia.',
  'No eres la puta persona graciosa del grupo: eres la que hace que la gente lo silencie.',
];

const BAN_SPAM = [
  'Que os sirva de ejemplo: esta escoria, %M, ha sido baneada por spam de mensajes.',
  'Este pedazo de mierda, %M, ha sido baneado por spam. Pegó lo mismo en bucle y se va sin un solo chiste propio.',
  'Mirad bien a %M, que es lo último que vais a ver de su puto humor: ban por spam y a la calle.',
  'A %M el copia y pega le ha costado el grupo, y no vuelve a entrar. Quien tenga guardado el mismo chiste, que lo borre ya.',
  'Esta rata de %M ha llenado el chat con la misma basura hasta reventarlo, y se va de cabeza a la lista negra.',
  'Ban a %M por spam de mensajes. Su gran número de humor era repetir la misma gilipoyez, y ahora lo va a repetir fuera.',
  'Se acabó el bucle de %M: ban por spam. Todo su puto repertorio era una sola frase, y ya la ha gastado.',
  '%M creía que spamear era gracioso. El ban también tiene su gracia, pero solo para quienes se quedan.',
  'Que nadie copie a %M, que ha acabado con ban por pegar lo mismo hasta dar asco. Quien quiera seguirle, ya sabe el camino.',
  'Así acaba el spam: %M, fuera del grupo y en la lista negra. Haced captura, que este aviso es lo único con gracia que va a dejar aquí.',
];

module.exports = { AVISO_SPAM, BAN_SPAM };
