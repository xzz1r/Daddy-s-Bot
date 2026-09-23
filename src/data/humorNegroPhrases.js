'use strict';

// EL AVISO DE LO QUE ES ESTE GRUPO. Sale con *!r*, en el MISMO mensaje que la
// presentacion pero en su propio parrafo, justo debajo del titulo: es lo
// primero que lee el que acaba de entrar. El parrafo arranca con «Esto es
// humor negro.», asi que las frases no lo repiten.
//
// Lo pidio el dueño con cuatro temas: humor negro, nada de gente de cristal,
// buen humor si, ni peña fea ni IQ bajo. Unas frases los meten todos de golpe
// y otras atacan uno solo; entre las quince salen todos muchas veces.
//
// Salen en baraja (pickBaraja): las quince antes de repetir ninguna. Ninguna
// viene con genero (lo lee el grupo entero) ni amenaza con echar a nadie: el
// bot no lo hace. Lo vigila la capa 25 de check.js.

const HUMOR_NEGRO = [
  // SON AVISOS, NO INSULTOS SUELTOS. Lo aclaro el dueño: cada frase dice a la
  // vez QUE GENTE ES BIENVENIDA (humor negro, cerebro, cara decente, aguante)
  // y CUAL DEBE ABSTENERSE (gente fea, low IQ, sin humor, de cristal). Con
  // filo y vulgar, como todo el bot, pero con la forma de una norma de entrada.
  'Bienvenida la gente con humor, cerebro y cara decente. Abstenerse gente fea de cojones, low IQ y quien se ofenda por un chiste.',
  'Aquí entra quien se ríe de todo, empezando por su propia desgracia. Ni peña fea, ni low IQ, ni gente de cristal.',
  'Se busca: sentido del humor, piel dura y un IQ decente. Se evita: caras que asustan, cerebros apagados y gente que llora con un chiste.',
  'Si tienes gracia y una cara que se puede mirar, pasa. Si tu cara da pena, tu IQ no llega o te ofendes por todo, este no es tu sitio.',
  'Lo que queremos: gente con humor negro y algo en la cabeza. Lo que sobra: gente fea, gente sin gracia y gente con el IQ por los suelos.',
  'Aquí se viene a reírse de todo sin llorar. Abstenerse gente de cristal, gente sin humor, gente fea y gente que no pilla una broma a la primera.',
  'Aquí caben las personas con humor negro y buena cara. Las feas, las de IQ bajo y las que se ofenden, que busquen otro grupo, que aquí van a sufrir.',
  'Requisitos: aguantar un chiste, tener dos neuronas y no dar asco a la vista. Si fallas en alguno, que no se note, porque aquí se nota todo.',
  'Humor sí, llantos no. Cabeza sí, low IQ no. Cara decente sí, peña fea no. Así de simple, gilipoyas.',
  'No es sitio para gente fea, para gente sin dos dedos de frente ni para gente sin humor. Para el resto, adelante y sin llorar.',
  'Se valora la mala leche, el ingenio y una cara que no espante. Sobran la gente fea, la gente lenta y la que llora por un chiste.',
  'Aquí se hacen chistes de todo y de todos. Si eres de cristal, de IQ bajo o tu cara no aguanta una foto, ahórrate la vergüenza.',
  'Esto no es para la peña fea, ni para la que no pilla un chiste, ni para la que se ofende. Si no eres ninguna de las tres, se agradece la gracia que traigas.',
  'Buscamos gente con humor, cerebro y cara presentable. Si te faltan dos de las tres, date la vuelta, que aquí no se regala compasión.',
  'Gente con humor negro, adelante. Gente fea, gente con low IQ y gente sin sentido del humor, abstenerse, que aquí nadie les va a tener pena.',
];

module.exports = { HUMOR_NEGRO };
