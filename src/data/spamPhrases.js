// Spam de texto: la misma frase pegada una y otra vez.
//
// Lo pidió el dueño (17 oct): la gente manda copys en bucle porque se cree que
// tienen gracia. Más de 10 mensajes iguales en menos de 10 segundos y el bot
// cierra el grupo con un *Aviso 1 de 2*; a la segunda, ban. Las cuentas viven
// en src/utils/spamTexto.js.
//
// AVISO_SPAM va detrás de «@persona, el spam está prohibido.», así que no lleva
// huecos: le habla a quien acaba de spamear y le ataca el sentido del humor.
//
// BAN_SPAM sale cuando ya está fuera, y le habla al grupo: usa a esa persona de
// ejemplo. %M es su mención. Nada concuerda con %M en masculino ni en femenino:
// «baneada» va con «escoria» y «baneado» con «pedazo», no con quien se va.

const AVISO_SPAM = [
  'El puto chiste se murió en el primer mensaje y tú has seguido mandando el cadáver.',
  'Tu sentido del humor cabe entero en el portapapeles, y encima es de otro gilipoyas.',
  'Repetirlo no lo hace más gracioso, joder. Solo deja claro que no tienes un segundo chiste.',
  'Te imaginabas al grupo llorando de risa y lo único que has conseguido es que les vibre el móvil por una mierda.',
  'Si a la primera no hizo gracia, a la décima lo único que das tú es vergüenza ajena.',
  'Tienes el puto humor de quien todavía reenvía cadenas de 2014.',
  'Hacer reír pide una idea, y tú no tienes ni puta idea. Por eso te has quedado en hacer ruido.',
  'Copiar y pegar la misma mierda en bucle no es humor: es confesar que no se te ocurre nada tuyo.',
  'Spamear para que te hagan caso es cosa de quien no tiene nada que contar, y tú lo has dejado clarísimo.',
  'Tú confundes dar por culo con hacer gracia, y lo primero lo bordas.',
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
