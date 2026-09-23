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
  //
  // Los temas se repiten a proposito, las PALABRAS no: «gente fea», «low IQ» y
  // «abstenerse» en las quince se leian como la misma frase con otro orden.
  'Bienvenida la gente con gracia, cabeza y cara decente. Que se abstengan los caretos imposibles, los cerebros en huelga y quien se ofende por deporte.',
  'Aquí entra quien se ríe de su propia desgracia. Se quedan en la puerta la piel fina, la cabeza hueca y las caras que no se arreglan ni con filtro.',
  'Se busca mala leche, ingenio y un físico que se pueda mirar. Se evita a la peña sosa, a la que va justa de neuronas y a la que llora con cualquier broma.',
  'Si tienes chispa y una cara que no asusta, pasa. Si te lo tomas todo a pecho, piensas despacio o das grima en foto, busca otro sitio.',
  'Lo que queremos: humor negro y algo dentro del cráneo. Lo que sobra: gente amargada, susceptibles de manual y caretos de castigo.',
  'Aquí se viene a reírse de la muerte sin pedir perdón. No encaja quien se ofende a la primera, quien no pilla ni un chiste de parvulario ni quien no gana ni con buena luz.',
  'Aquí caben las personas con aguante y salero. Las de mecha corta, las de cabeza vacía y las de físico dudoso, que busquen otro grupo.',
  'Requisitos: aguantar una broma pesada, pensar rápido y no dar asco a la vista. Si fallas en alguno, disimula, porque aquí se nota todo.',
  'Gracia sí, dramas no. Cerebro sí, luces apagadas no. Cara decente sí, adefesios no. Así de simple, gilipoyas.',
  'No es sitio para quien no tiene dos dedos de frente, para quien no se ríe ni en su cumpleaños ni para quien espanta con la cara. Para el resto, adelante.',
  'Se valora la mala hostia, la rapidez mental y una cara que se pueda enseñar. Sobra quien va lento de reflejos, quien se amarga con un chiste y quien da pena mirar.',
  'Aquí se hacen chistes de todo y de todos. Si eres de lágrima fácil, de pocas luces o tu cara no aguanta una foto, ahórrate la vergüenza.',
  'Esto no es para la peña poco agraciada, ni para la que no coge una ironía, ni para la que se pica por todo. Si no eres de esas, trae tu mejor chiste.',
  'Buscamos gente con humor, cerebro y buena planta. Si te faltan dos de las tres, date la vuelta, que aquí nadie regala compasión.',
  'Gente con humor negro, adelante. Gente fea, lenta o sin sentido del humor, abstenerse, que aquí nadie les va a tener pena.',
];

module.exports = { HUMOR_NEGRO };
