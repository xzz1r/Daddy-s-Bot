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
  'Aquí nos reímos de todo: de la muerte, de la desgracia y sobre todo de ti. Si buscabas un sitio seguro, has entrado en el grupo equivocado.',
  'Buen humor sí. Gente de cristal, peña fea e IQ bajo, no. Si te has reconocido en la segunda parte, disimula y ríete, que es lo único que te queda.',
  'Gente de cristal abstenerse. Aquí un chiste no pide perdón, no avisa y no se retira porque te duela. Si te duele, ríete más fuerte.',
  'Se busca gente con buen humor, cara presentable y dos neuronas funcionando a la vez. Si te falta alguna de las tres, que no se note.',
  'Normas de la casa: se ríe todo el mundo, no se ofende nadie y se piensa antes de escribir. Quien falle en la tercera va a ser el chiste del día.',
  'Aquí la sensibilidad se deja en la puerta. Lo que entra es el humor, la cara y un mínimo de cerebro. Lo demás sobra.',
  'Si un chiste sobre tu madre te arruina el día, este no es tu grupo. Si te sacas uno mejor sobre la tuya, estás en casa.',
  'Sin filtro y sin tutorial. Si necesitas que te expliquen el chiste, el chiste eres tú.',
  'Aquí nadie viene a hacer amigos, viene a reírse. Y si la cara no acompaña, que al menos acompañe la gracia.',
  'Aviso una vez: aquí se hacen chistes de enfermos, de muertos y de gente fea. Con suerte no eres ninguna de las tres cosas. Con más suerte, te ríes igual.',
  'Se admite casi todo menos tres cosas: llorar por un chiste, tener mala cara y peor gracia, y necesitar que te expliquen las bromas.',
  'Aquí el respeto se gana haciendo reír, no quejándose. Quien viene a quejarse acaba siendo el material de los demás.',
  'Entrar es gratis, aguantar ya es otra cosa. Si te ofendes, se nota, y aquí lo que se nota se usa.',
  'Si tu IQ no llega a tres cifras, lee esto dos veces: aquí se viene a reír, no a llorar. Lo demás lo irás pillando.',
  'Bienvenida la gente que se ríe de sí misma. La que no, que vaya practicando, porque aquí se va a reír todo el mundo igualmente.',
];

module.exports = { HUMOR_NEGRO };
