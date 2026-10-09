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
  'Hace falta estómago para reírte con el muerto todavía caliente y soltar el chiste peor antes de que cierren el féretro. La piel de cristal, que pide que lo borren con la voz temblando, sobra.',
  'Se busca quien se ría de la muerte y devuelva otro chiste peor. Quien se rompa con el primero, que se quede con el pañuelo: aquí no hay consuelo ni de coña.',
  'Entra quien devuelve el chiste de cáncer en voz alta, con el café humeando. Sobra quien pide que se borre porque el tema es sagrado, con la queja ya en la boca.',
  'Si un chiste de tu abuela en el ataúd te deja la tarde hecha mierda, este grupo te la va a dejar así a diario. Aguante, o abstención.',
  'Nadie pide perdón por una gracia. Quien necesite disculpas, que se las pida al psicólogo y deje de ensuciar el chat con el drama.',
  'Piel de cristal, aquí se raja en el primer mensaje. El grupo se ríe de quien acaba de entrar antes de saber el nombre, y con razón.',
  'Quien pilla el chiste de muerto a la primera y no aparta la cara, entra. Quien no llega, guarda silencio y pide que lo borren, sobra: ya se le ha visto.',
  'La foto de perfil también se juzga. Si la tuya da asco, que la gracia lo compense, porque compasión aquí no hay ni de puta coña.',
  'Humor que duele y se dice a la cara. El audio de «eso no tiene gracia» es de pringado, y aquí se nota al segundo.',
  'Se ríe rápido y se piensa rápido. Quien tarde tres mensajes en pillar una ironía sobra, y el grupo lo va a dejar en ridículo sin avisar.',
  'Ni dios, ni la muerte, ni la comunidad de nadie se salva del chiste. Si venías a que te cuidaran el escudo, te han pasado un enlace de mierda.',
  'Gente seria, de la que explica un chiste en un audio: basura de chat. Se busca quien devuelva otro peor, no quien llore en el teclado.',
  'Una madre en la UCI, dentro del chiste, se contesta con la hora del entierro: esa gente entra. La piel de cristal pide que lo borren y sobra, y se le ve el asco antes de hablar.',
  'Entra quien aguanta que le digan a la cara lo que el espejo ya dijo. Quien solo sepa ofenderse, que se ofenda en otro sitio: aquí estorba.',
  'El chiste de suicidio se ríe con el vaso quieto en la mesa y se contesta con uno peor. Quien pide que lo borren y que se lo expliquen sobra, con el vaso lleno y la gracia sin pillar.',
];

module.exports = { HUMOR_NEGRO };
