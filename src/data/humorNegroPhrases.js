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
//
// Ninguna comunidad, credo ni fandom se salva del chiste. La crueldad va a la
// pose y a la conducta, no a donde se nacio: un insulto de nacimiento le vale
// a cualquiera y por eso no duele.

const HUMOR_NEGRO = [
  // SON AVISOS, NO INSULTOS SUELTOS. Cada frase dice a la vez QUE GENTE ENTRA
  // (humor negro, cerebro, cara que no de asco, aguante) y QUIEN SOBRA (piel
  // de cristal, cabeza corta, cara que da vergüenza, quien pida que se borre
  // un chiste). Filo dentro de la frase, no pegado al final.
  'Aquí se entra con estómago para un chiste de muerto, cabeza para pillarlo y una cara que no dé asco. Fallar en dos de tres se nota en el primer mensaje.',
  'Se busca quien se ría de la muerte y devuelva otro chiste peor. Quien se rompa con el primero, que se quede con el pañuelo: aquí no hay consuelo ni de coña.',
  'El chiste no pide permiso a ninguna comunidad, ni a la tuya. Quien venga a que le respeten el tema sagrado ha entendido mal el puto grupo.',
  'Si un chiste de tu abuela en el ataúd te deja la tarde hecha mierda, este grupo te la va a dejar así a diario. Aguante, o abstención.',
  'Nadie pide perdón por una gracia. Quien necesite disculpas, que se las pida al psicólogo y deje de ensuciar el chat con el drama.',
  'Piel de cristal, aquí se raja en el primer mensaje. El grupo se ríe de quien acaba de entrar antes de saber el nombre, y con razón.',
  'Hace falta cerebro para pillar la mitad. Quien no llegue, que se ría igual: el silencio delata antes que cualquier insulto, y da vergüenza ajena.',
  'La foto de perfil también se juzga. Si la tuya da asco, que la gracia lo compense, porque compasión aquí no hay ni de puta coña.',
  'Humor que duele y se dice a la cara. El audio de «eso no tiene gracia» es de pringado, y aquí se nota al segundo.',
  'Se ríe rápido y se piensa rápido. Quien tarde tres mensajes en pillar una ironía sobra, y el grupo lo va a dejar en ridículo sin avisar.',
  'Ni dios, ni la muerte, ni la comunidad de nadie se salva del chiste. Si venías a que te cuidaran el escudo, te han pasado un enlace de mierda.',
  'Gente seria, de la que explica un chiste en un audio: basura de chat. Se busca quien devuelva otro peor, no quien llore en el teclado.',
  'Ni cara que dé asco ni cabeza que no pille un doble sentido. Las dos cosas se ven al momento, y las dos dan vergüenza.',
  'Entra quien aguanta que le digan a la cara lo que el espejo ya dijo. Quien solo sepa ofenderse, que se ofenda en otro sitio: aquí estorba.',
  'Si hay que explicar el chiste, ya se ha perdido. Aquí no se explica una mierda, y se va a notar igual.',
];

module.exports = { HUMOR_NEGRO };
