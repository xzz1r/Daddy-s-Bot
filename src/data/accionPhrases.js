// Frases de los comandos de acción: *!hug*, *!kiss*, *!punch* y compañía.
//
// %A = quien la hace · %V = quien la recibe
//
// EL BOT NARRA, NO ACOMPAÑA. La acción ya se ve en el gif, así que la frase no
// la describe otra vez: la comenta. Y la comenta como todo lo demás en este
// bot — de lado, con el peso al final y sin ponerse tierno. Un abrazo no es un
// momento bonito: es alguien que necesitaba uno y ha tenido que pedirlo por
// un comando.
//
// Las cariñosas NO son cursis, que es justo lo que hay que evitar aquí. El
// chiste está en el contexto, no en el gesto: quién lo pide, por qué, y qué
// dice de él que lo pida.
//
// Las agresivas van sobre %V, nunca sobre %A. Es la misma regla del robo: al
// que gana no se le quita la victoria.
//
// GROK: EL TONO YA ESTA PUESTO, LO QUE FALTA ES CANTIDAD. Cada pool lleva ocho
// frases y necesita treinta. El liston es lo que hay escrito: no lo suavices.
//
// La crudeza va SEGUN EL COMANDO, que es donde estaba el fallo de la primera
// tanda. En las cariñosas es guarra —el abrazo con las manos donde no tocaba,
// el mimo que acaba en otra cosa—, no cursi. En las violentas es fisica: donde
// pega, que se rompe y como suena. Un !punch no se resuelve con un taco al
// final, se resuelve diciendo que a %V no le va a cerrar la mandibula.
//
// Sin eufemismos, sin quedarse a medias y sin salirse de los dos que aparecen.

const HUG = [
  '%A se pega a %V con las manos donde no tocaba. El abrazo era la excusa.',
  '%A abraza a %V y aprovecha para meterle mano. Nadie ha dicho nada, que es lo grave.',
  '%A rodea a %V y se le nota todo. Literalmente todo.',
  '%A abraza a %V dos segundos de más y con la cadera de menos. Cuentas claras.',
  '%A se lanza a %V. Empieza en abrazo y acaba donde acaban estas cosas.',
  '%A abraza a %V como quien palpa la mercancía antes de comprar.',
  '%A se agarra a %V y no piensa soltar hasta que se le baje.',
  '%A abraza a %V. El apretón de arriba era protocolo; el de abajo, la intención.',
];

const KISS = [
  '%A le mete la lengua a %V hasta la campanilla. Sin preguntar y sin necesidad.',
  '%A besa a %V con lengua, saliva y público. Los tres ingredientes.',
  '%A se come la boca de %V delante del grupo entero. Cero vergüenza.',
  '%A besa a %V y le muerde el labio. Eso ya no es un beso, es un aviso.',
  '%A le come la boca a %V. Doce meses de tensión resueltos en cuatro segundos.',
  '%A besa a %V y le deja la cara empapada. Técnica, ninguna. Ganas, todas.',
  '%A se lía con %V. Mañana los dos van a escribir aquí como si nada.',
  '%A besa a %V como si le debiera dinero y lo cobrara en especie.',
];

const CUDDLE = [
  '%A se acurruca con %V y se le pone dura a los diez segundos. Todos lo hemos visto.',
  '%A se pega a %V por detrás y se acopla como si tuviera plaza reservada.',
  '%A se mete en la cama de %V sin preguntar. Ya no se va.',
  '%A abraza a %V por detrás con más entusiasmo del que cabe en un abrazo.',
  '%A se acurruca con %V y le respira en el cuello. Sutil como un ladrillo.',
  '%A se acopla a %V. Empezó de cucharita y va camino de otra cosa.',
  '%A se enrosca en %V y le mete la pierna en medio. Con confianza y sin permiso.',
  '%A se acurruca con %V. Diez minutos y ya está buscando el elástico.',
];

const PAT = [
  '%A le acaricia la cabeza a %V. A %V le gusta más de lo que debería.',
  '%A le toca la cabeza a %V y a %V se le pone cara de perro contento. Vergüenza ajena.',
  '%A acaricia a %V. Un gesto para arriba y toda la intención para abajo.',
  '%A le da palmaditas a %V. En la cabeza, de momento.',
  '%A le acaricia el pelo a %V. La mano ha bajado dos veces. Las hemos contado.',
  '%A trata a %V como a una mascota. Y a %V le vale, que es lo peor.',
  '%A acaricia a %V con esa condescendencia que a %V le pone.',
  '%A le pasa la mano a %V por la cabeza. Se le ha ido a otro sitio y ha vuelto.',
];

const POKE = [
  '%A pincha a %V con el dedo. Con el dedo, de momento.',
  '%A le da un toque a %V donde no toca. Y se hace el tonto.',
  '%A pincha a %V y se aparta. La técnica del que no se atreve a más.',
  '%A toca a %V. Un dedo, cero conversación y toda la intención.',
  '%A pincha a %V hasta que reacciona. Reaccionar era el juego entero.',
  '%A molesta a %V con el dedo. Sesenta de aura para rozarle el costado.',
  '%A le da toquecitos a %V. Es lo más lejos que va a llegar y lo sabe.',
  '%A pincha a %V. En el hombro. Qué decepción para todos.',
];

const PUNCH = [
  '%A le parte la cara a %V. Se oye el crujido y nadie mueve un dedo.',
  '%A revienta a %V de un puñetazo. Se le ha caído algo al suelo y no era el móvil.',
  '%A le cruza la cara a %V. Mañana no va a poder masticar por ese lado.',
  '%A golpea a %V donde le va a doler al respirar durante una semana.',
  '%A le mete un directo a %V. %V ha visto la luz y no era la de casa.',
  '%A parte a %V por la mitad. Merecido, con retraso y con público.',
  '%A pega a %V hasta que deja de contestar. Ese era el objetivo.',
  '%A le arranca la sonrisa a %V de un golpe. Y un par de cosas más.',
];

const SLAP = [
  '%A le cruza la cara a %V. El sonido llega antes que la vergüenza.',
  '%A abofetea a %V con la mano abierta, que es peor y lo sabe.',
  '%A le suelta un guantazo a %V. Cinco dedos marcados y una lección.',
  '%A le da una torta a %V que le gira la cara y la conversación.',
  '%A abofetea a %V. A %V le ha gustado, y ese es otro problema.',
  '%A le cruza la cara a %V de revés. El detalle del revés lo dice todo.',
  '%A abofetea a %V hasta que le pita el oído. Correctivo completo.',
  '%A le mete una torta a %V. Ya se hablaba de que tocaba.',
];

const BITE = [
  '%A muerde a %V en el cuello y no suelta. Ahí queda la marca hasta el jueves.',
  '%A le hinca el diente a %V. Con ganas, con saliva y con testigos.',
  '%A muerde a %V donde va a tener que dar explicaciones en casa.',
  '%A le pega un bocado a %V. Nadie sabe si iba en broma y %V tampoco.',
  '%A muerde a %V y le deja los dientes marcados. Firmado, vamos.',
  '%A muerde a %V en el hombro. Lo de después ya no lo cuenta el bot.',
  '%A le muerde el labio a %V hasta que sangra un poco. Cosas suyas.',
  '%A muerde a %V. En un grupo normal esto tendría consecuencias.',
];

const KICK = [
  '%A le mete una patada a %V en los huevos. De abajo arriba y con puntera.',
  '%A patea a %V y lo saca del encuadre y de la conversación.',
  '%A le da una patada a %V que le reordena los órganos.',
  '%A patea a %V como quien cierra un tema para siempre.',
  '%A le suelta una patada a %V. Se ha oído hasta en el otro grupo.',
  '%A patea a %V y ni mira dónde cae. Ese detalle lo dice todo.',
  '%A le da a %V con el pie. Con la mano habría sido demasiado honor.',
  '%A patea a %V en el suelo. Ahí ya no hace falta, pero se hace igual.',
];

const BONK = [
  '%A le da un mazazo a %V en la cabeza. Se le ha reiniciado algo.',
  '%A zurra a %V hasta que se le quita la tontería. Diez minutos.',
  '%A le arrea a %V. No es violencia, es mantenimiento.',
  '%A castiga a %V delante de todos. La parte pública era el objetivo.',
  '%A le sacude a %V. Y a %V se le ha bajado la calentura de golpe.',
  '%A le da lo suyo a %V. Nadie va a preguntar por qué.',
  '%A zurra a %V. Se lo llevaba pidiendo desde el primer mensaje del día.',
  '%A corrige a %V a golpes. Método antiguo y sigue funcionando.',
];

// GROK: ESTE ES EL LISTON DE CRUDEZA PARA TODAS LAS DEMAS.
//
// El gif que acompaña es SFW y va a seguir siendolo: la web de la que salen no
// tiene otra cosa. Asi que el peso lo lleva ENTERO el texto — si la frase es
// tibia, el comando se queda en un beso de anime y no hay chiste.
//
// El registro es el que ya tiene !wingman en sus frases explicitas, no uno
// nuevo: crudo, directo, sin eufemismos de instituto. La regla de GUIA.md 5 bis
// sigue mandando — imagen concreta al final, frases cortas, el taco DENTRO— y
// aqui se le suma que puede ser todo lo guarra que haga falta.
//
// Lo que no cambia: el chiste va sobre los dos que salen, y nunca describe a
// nadie que no sea del grupo.
const FUCK = [
  '%A se lleva a %V al baño y ninguno de los dos vuelve a mirar igual al resto.',
  '%A se folla a %V delante de todo el grupo. Ni una disculpa, ni falta que hace.',
  '%A pone a %V a cuatro patas y el chat entero se hace el sueco.',
  '%A se mete en %V hasta el fondo. Doce meses de tensión resueltos en dos minutos.',
  '%V acaba con las rodillas rojas y %A con cara de haber ganado algo. Los dos aciertan.',
  '%A revienta a %V. Mañana los dos van a escribir aquí como si nada.',
  '%A se corre encima de %V y %V da las gracias. Ahí está todo el vínculo, resumido.',
  '%A se lo hace a %V como llevaba meses contándolo por privado. Al final era verdad.',
];


// ─── EL REMATE AL QUE LO PIDE ────────────────────────────────────────────────
//
// GROK: ESTE POOL ES TUYO Y HAY QUE ENGORDARLO. Ahora mismo lleva 20 frases y
// necesita 60.
//
// Se pega DEBAJO de la frase de la acción, y no habla de la acción: habla del
// que la ha pedido. La idea del dueño, con sus palabras: quien usa estos
// comandos es un marginado, y el bot se lo tiene que recordar cada vez.
//
// Reglas para escribirlas, además de las seis de GUIA.md 5 bis:
//
//   · El objetivo es SIEMPRE quien escribió el comando (%A). Nunca %V, que
//     bastante tiene con recibir la patada.
//   · No repitas el chiste de la acción. La frase de arriba ya se rió del
//     golpe; esta se ríe de que haya pagado 60 de aura por un gif.
//   · Nada de "eres un pringado" a secas. El chiste está en el retrato: qué
//     clase de persona abre un chat para mandarle un abrazo animado a alguien
//     que tiene a dos metros.
//   · Sirve para las diez acciones, así que no menciones ninguna en concreto.
//
// AL DUEÑO NO SE LE REMATA. Lo salta el propio comando: ver cmdAccion.
const ROAST_USUARIO = [
  'Y %A ha pagado por esto. Con aura de verdad, que se gana escribiendo.',
  'Sesenta de aura. Eso vale para %A menos que el gesto.',
  '%A tenía dos opciones: decirlo con palabras o esto. Ya ves cuál.',
  'Lo ha buscado, lo ha escrito y lo ha mandado. %A tiene la tarde libre y se nota.',
  'El resto del grupo escribe. %A manda dibujos.',
  '%A ha encontrado la forma más cara de no decir nada.',
  'Un aplauso para %A, que ha convertido un impulso en una transacción.',
  '%A necesitaba un comando para esto. Ahí está todo lo que hay que saber.',
  'Sesenta de aura por algo que en persona es gratis, %A. Tú sabrás.',
  '%A lo ha hecho a través de un bot. Que cada uno saque sus conclusiones.',
  'Hay gente teniendo conversaciones. %A está aquí.',
  '%A ha gastado en esto lo que otros gastan en jugarse el saldo.',
  'Nadie se lo ha pedido a %A. Ese es justo el problema.',
  '%A ha elegido un gif de anime para expresarse. Un adulto.',
  'El gif es de otro, la idea es de otro, y %A solo ha puesto el dinero.',
  'A %A le ha parecido que esto era una buena forma de pasar el rato.',
  '%A por fin ha encontrado su nivel, y era este.',
  'Sesenta de aura y dos segundos de vídeo. La economía de %A resumida.',
  '%A sabe que puede escribirle por privado, ¿verdad? Digo yo.',
  'Y así es como %A decide gastarse lo que tiene. Sin comentarios.',
];

module.exports = { HUG, KISS, CUDDLE, PAT, POKE, PUNCH, SLAP, BITE, KICK, BONK, FUCK, ROAST_USUARIO };
