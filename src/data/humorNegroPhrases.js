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
  // CON FILO. La primera tanda era de folleto («aquí la sensibilidad se deja
  // en la puerta») y el dueño lo pidio como todo el bot: directo, ofensivo,
  // hiriente y vulgar. Siguen atacando los cuatro temas, sin genero y sin
  // amenazar con echar a nadie.
  'Aquí nos reímos de la muerte, del cáncer y de tu puta cara. Si eso te parece demasiado, te has equivocado de grupo, gilipoyas.',
  'Gente de cristal, peña fea y gente sin cerebro, a otro sitio. Si te has visto en alguna de las tres, disimula y ríete, que es lo único que te queda.',
  'Si un chiste te hace llorar, ve a llorarle a tu madre. Aquí nadie pide perdón por una broma, y menos por ti.',
  'Se busca gente con cara presentable, dos neuronas que se hablen y aguante. Si te falta alguna, que no se note, que ya se nota bastante.',
  'Normas: nadie se ofende, nadie lloriquea y se piensa antes de escribir. Quien falle en la tercera va a ser el chiste del día, y con motivo.',
  'La sensibilidad se deja en la puerta, y la dignidad también. Aquí se entra con humor, con cara y con un mínimo de cerebro. Lo demás sobra.',
  'Si un chiste sobre tu madre te jode el día, este no es tu grupo. Si te sacas uno peor sobre la tuya, estás en casa.',
  'Sin filtro y sin tutorial. Si necesitas que te expliquen el chiste, el chiste eres tú, subnormal.',
  'Aquí nadie viene a hacer amigos, viene a reírse de los demás. Y si tu cara no acompaña, más te vale que acompañe la gracia.',
  'Aquí se hacen chistes de enfermos, de muertos y de gente fea de cojones. Con suerte no eres ninguna de las tres cosas. Con más suerte, te ríes igual.',
  'Se admite casi todo menos llorar por un chiste, tener una cara de mierda sin gracia que la compense y no pillar una broma a la primera.',
  'Aquí el respeto se gana haciendo reír, no quejándose. Quien viene a quejarse acaba siendo el puto material de los demás.',
  'Entrar es gratis, aguantar ya es otra cosa. Si te ofendes se nota, y aquí lo que se nota se usa en tu contra hasta que te rías.',
  'Si tu IQ no llega a tres cifras, léelo dos veces y despacio: aquí se viene a reír, no a lloriquear. Lo demás lo irás pillando, o no.',
  'Bienvenida la gente que se ríe de sí misma. La que no, que vaya practicando, porque aquí se va a descojonar de ella el grupo entero.',
];

module.exports = { HUMOR_NEGRO };
