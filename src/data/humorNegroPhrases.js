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
  'Requisitos: aguantar una broma pesada, pensar rápido y no dar asco a la vista. Si fallas en alguno, disimula, porque aquí se nota todo.',
  'Buscamos gente con humor, cerebro y buena planta. Si te faltan dos de las tres, date la vuelta, que aquí nadie regala compasión.',
  'Aquí se viene a reírse de la muerte. Quien se ofende a la primera, que no gaste la entrada.',
  'Si un chiste sobre tu abuela muerta te arruina la tarde, este grupo te la va a arruinar a diario.',
  'Aquí nadie pide perdón por un chiste. Quien necesite disculpas, que se las pida a su psicólogo.',
  'Aquí la gente se ríe de todo, empezando por quien acaba de entrar. Con piel fina, esto escuece desde el primer mensaje.',
  'Hace falta cabeza para pillar la mitad de los chistes. Si no te llega, ríete igual y disimula.',
  'Aquí la foto de perfil también cuenta. Si la tuya asusta, que al menos la gracia compense.',
  'Humor del que duele. Quien venga a pedir que se borre un chiste ha entrado en el grupo equivocado.',
  'Se busca gente que se ría rápido y piense rápido. Quien tarda tres mensajes en pillar una ironía, sobra.',
  'Aquí se bromea con la muerte, la enfermedad y la cara de cada uno. La tuya incluida, así que ven con aguante.',
  'Gente seria, de la que contesta a un chiste con un audio explicando por qué no tiene gracia: aquí no.',
  'Entra quien aguanta un chiste pesado y devuelve otro peor. Quien solo sepa llorar, que llore en otro chat.',
  'Aquí no hay temas sagrados ni caras protegidas. Si esperabas un grupo amable, te han mandado mal el enlace.',
  'Si necesitas que te expliquen un chiste, aquí nadie te lo va a explicar. Y se va a notar.',
];

module.exports = { HUMOR_NEGRO };
