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

const HUG = [
  '%A abraza a %V. Uno de los dos lo necesitaba y no era %V.',
  '%A se lanza a por %V. Contacto humano por vía administrativa.',
  '%A abraza a %V y no suelta. Eso ya no es cariño, es una llave.',
  '%A rodea a %V con los brazos. %V mira al frente calculando cuánto queda.',
  '%A abraza a %V delante de todos. Un gesto precioso que ha costado 60 de aura.',
  '%A abraza a %V. Dos segundos. Los justos para que sea raro.',
  '%A busca a %V para un abrazo. Encontrarlo era la parte difícil.',
  '%A abraza a %V y aprieta un poco de más. Ahí hay algo sin resolver.',
];

const KISS = [
  '%A besa a %V. En el grupo, delante de todos, sin avisar.',
  '%A le planta un beso a %V. %V lo procesará más tarde, en casa.',
  '%A besa a %V y el chat se queda quieto un segundo. Solo uno.',
  '%A besa a %V. Lo ha pagado, así que técnicamente cuenta.',
  '%A va a por %V. Nadie lo ha impedido, que también dice algo.',
  '%A besa a %V con una seguridad que no tiene en ningún otro sitio.',
  '%A besa a %V. Se acabó lo de disimular, y menos mal.',
  '%A besa a %V. El grupo lo ha visto. No hay marcha atrás.',
];

const CUDDLE = [
  '%A se acurruca con %V. La escena dura hasta que alguien la nombre.',
  '%A se pega a %V como si tuviera derecho. Nadie se lo ha dado.',
  '%A busca hueco al lado de %V. Lo encuentra, para desgracia de %V.',
  '%A se acurruca con %V. Diez minutos y ya se le ha dormido el brazo.',
  '%A se arrima a %V. Empezó como un gesto y va camino de mudanza.',
  '%A se acurruca con %V y cierra los ojos. %V calcula la distancia a la puerta.',
  '%A se acomoda encima de %V. Con confianza y sin permiso.',
  '%A se acurruca con %V. Bonito hasta que alguien recuerda quién es %A.',
];

const PAT = [
  '%A le da palmaditas a %V en la cabeza. Como a un perro, y encantado.',
  '%A acaricia la cabeza de %V. El gesto exacto para alguien que no da más.',
  '%A le da un par de toques a %V. Consuelo del que se dispensa de pie.',
  '%A le toca la cabeza a %V. Ha bajado el brazo, que ya es esfuerzo.',
  '%A acaricia a %V. Es lo que se hace con lo que no se puede arreglar.',
  '%A le da palmaditas a %V. Ánimo por el precio mínimo.',
  '%A le acaricia el pelo a %V. Ni ha mirado. Ha alargado la mano y ya.',
  '%A le da unas palmaditas a %V. Cariño con la mano abierta y poco más.',
];

const POKE = [
  '%A le da un toque a %V. Sin motivo, sin plan, sin nada que decir después.',
  '%A pincha a %V. Ha gastado aura en eso. Que se entienda.',
  '%A toca a %V con un dedo y espera. Esa es toda la propuesta.',
  '%A molesta a %V. Objetivo cumplido en dos décimas.',
  '%A pincha a %V y se aparta. La técnica del que no sabe empezar una charla.',
  '%A le da toquecitos a %V. La forma más cara de decir hola.',
  '%A pincha a %V hasta que reacciona. Reaccionar era el juego entero.',
  '%A toca a %V. Nada más. Ni una palabra. Un dedo y su ausencia.',
];

const PUNCH = [
  '%A le mete un puñetazo a %V. Merecido y con retraso.',
  '%A cruza la cara de %V. El grupo tomaba notas desde hace semanas.',
  '%A golpea a %V. %V se queda mirando el suelo buscando una explicación.',
  '%A le da a %V donde le va a doler mañana también.',
  '%A revienta a %V de un golpe. No hay ronda dos porque no hace falta.',
  '%A pega a %V. %V lo va a contar como un accidente. No lo era.',
  '%A le suelta un directo a %V. Corto, limpio y sin discurso.',
  '%A golpea a %V y sigue a lo suyo. Ni se ha despeinado.',
];

const SLAP = [
  '%A le cruza la cara a %V. El sonido llega antes que la vergüenza.',
  '%A abofetea a %V. Se oye en todo el grupo y nadie lo lamenta.',
  '%A le da una torta a %V. Correctiva, dicen.',
  '%A le suelta un guantazo a %V. Le quedan las marcas de los dedos y la duda.',
  '%A abofetea a %V. Le ha dado la vuelta a la cara y a la conversación.',
  '%A le mete una torta a %V. Ya se hablaba de que tocaba.',
  '%A cruza la cara de %V y se queda tan ancho. Ese es el nivel de respeto.',
  '%A abofetea a %V. Con la mano abierta, que es peor.',
];

const BITE = [
  '%A muerde a %V. Sin avisar, que es como se muerde.',
  '%A le hinca el diente a %V. La marca dura más que la anécdota.',
  '%A muerde a %V y no suelta. Eso ya es otra cosa.',
  '%A muerde a %V. Nadie sabe si iba en broma y %V tampoco.',
  '%A le pega un bocado a %V. Un gesto muy claro y muy mal explicado.',
  '%A muerde a %V. Le quedan los dientes marcados y las preguntas.',
  '%A muerde a %V en mitad de la nada. Sin contexto y sin arrepentimiento.',
  '%A muerde a %V. En un grupo normal esto tendría consecuencias.',
];

const KICK = [
  '%A le mete una patada a %V. De abajo arriba y sin avisar.',
  '%A patea a %V. %V ha salido del encuadre y de la conversación.',
  '%A le da una patada a %V. El impulso venía de lejos.',
  '%A patea a %V como quien cierra un tema.',
  '%A le suelta una patada a %V. Se ha oído hasta en el otro grupo.',
  '%A patea a %V y ni mira dónde cae. Ese detalle lo dice todo.',
  '%A le da a %V con el pie. Con la mano habría sido demasiado honor.',
  '%A patea a %V. Rápido, feo y efectivo.',
];

const BONK = [
  '%A le da un mazazo a %V. Correctivo, del que se aplica en la cabeza.',
  '%A zurra a %V. Se veía venir desde el primer mensaje del día.',
  '%A le arrea a %V. No es violencia, es mantenimiento.',
  '%A castiga a %V. El grupo asiente en silencio.',
  '%A le da lo suyo a %V. Nadie va a preguntar por qué.',
  '%A zurra a %V delante de todos. La parte pública era el objetivo.',
  '%A le sacude a %V. Y a %V se le ha quitado la tontería, de momento.',
  '%A corrige a %V a golpes. Método antiguo y sigue funcionando.',
];

const FUCK = [
  '%A se lleva a %V. Lo que pase después no lo cuenta el bot.',
  '%A y %V desaparecen del chat. Volverán con cara de nada.',
  '%A se lo monta con %V. El grupo entero fingiendo que no lo ha visto.',
  '%A va a por %V sin rodeos. Rodeos era lo que le faltaba.',
  '%A y %V. Ya está. Se veía venir desde hace meses y ha costado 120 de aura.',
  '%A arrastra a %V fuera de plano. Discreción cero, ganas todas.',
  '%A se cobra lo de %V. Nadie ha preguntado si %V debía algo.',
  '%A y %V se lo montan delante de todos. Vergüenza ninguna.',
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
