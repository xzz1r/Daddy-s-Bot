'use strict';

// Frases de !fiel e !infiel. Viven fuera de percentLabels.js desde que eran
// seiscientas. Hoy son 45 por comando (25 en la paliza y 10 en cada uno de los
// otros tramos, ver percentLabels.js). [nombre] se sustituye por la mención del
// target.
//
//   FIEL   → goodIsHigh: true.  high = halago, low = brutal.
//   INFIEL → goodIsHigh: false. high = brutal, low = halago.
//
// El pendiente de analogías baratas NO es este fichero. Está en AURA.gain /
// AURA.loss (src/commands/aura.js), el cooldown de !aura y MAL_ESCRITO.
// Brief: PENDIENTE.md.

// ═══════════════════════════════════════════════════════════════════════════
// !fiel — TIER ALTO (65-100%): lealtad real. Halago.
// ═══════════════════════════════════════════════════════════════════════════

const FIEL_HIGH = [
  '[nombre] cumple hasta lo que no ha prometido, y luego te lo recuerda en cada cena.',
  '[nombre] no mira otros móviles ni otras camas, y en este grupo eso ya es un fetiche raro.', // ROCKSTAR
  'Tu palabra vale más que un contrato, y en la cama también cumples lo que prometes.', // ROCKSTAR
  'Tú le sujetarías el pelo a cualquiera del grupo mientras vomita, y no se lo contarías a nadie. Ni a quien vomitaba.',
  'Compartes la última cerveza. En este grupo eso ya es una declaración de amor.',
  'Si alguien deja el móvil desbloqueado encima de la mesa, tú ni lo miras. Eso, aquí, es rarísimo.',
  '[nombre] te dice la verdad a la cara mientras el resto te miente sonriendo. Se agradece, y escuece.',
  'Vas a todas las mudanzas, a todas las bodas y a la misma cama de siempre, y lo raro es que te guste.', // ROCKSTAR
  'Sigues con los mismos amigos y ni una bronca que se haya quedado sin arreglo. Aburre contarlo, eso sí.',
  '[nombre] tiene la pareja de siempre y no le busca sustituto ni de madrugada. Aquí eso se estudia.', // ROCKSTAR
];

// ═══════════════════════════════════════════════════════════════════════════
// !fiel — TIER MEDIO (31-64%): lealtad con grietas. Ni fiable ni traidor.
// ═══════════════════════════════════════════════════════════════════════════

const FIEL_MID = [
  '[nombre] guarda conversaciones como quien guarda cupones: no los usa, pero le jode tirarlos por si acaso valen para algo.',
  '[nombre] ejerce la lealtad por cuenta propia: trabaja para quien pague mejor en cada momento, sin contrato fijo.',
  'Eres quien ayuda a mudarse pero se larga antes de montar los muebles. Presente en lo fácil, ausente en lo jodido.',
  'Lo tuyo es una puta lealtad de temporada. Te apuntas cuando hace buen tiempo y te das de baja cuando llueve.',
  'Eres fiel hasta que alguien te pone delante una cerveza fría y una sonrisa, y entonces empiezas a negociar.', // ROCKSTAR
  'Contestarías al primer mensaje de un ex «por educación». La educación, en ti, no tiene hora de cierre.', // ROCKSTAR
  'No has hecho nada todavía, pero tienes la excusa redactada por si acaso.',
  'Eres fiel cuando te miran. Cuando no te miran, miras tú, y bastante, chiquitina.', // ROCKSTAR
  'Ayudas a tus amigos si no coincide con el fútbol, con la siesta o con un plan mejor.',
  '[nombre] no engaña a nadie porque no le sale ligar. El día que le salga, el grupo tiene tema para un año.', // ROCKSTAR
];

// ═══════════════════════════════════════════════════════════════════════════
// !fiel — TIER BAJO (0-30%): cero lealtad. Brutal.
// ═══════════════════════════════════════════════════════════════════════════

const FIEL_LOW = [
  'Eres la clase de escoria que vendería a su madre por un kebab con extra de carne, y encima regatearía el precio.',
  '[nombre] traiciona con la frecuencia de quien se lava los dientes: dos veces al día y a veces tres si hay oportunidad.',
  '[nombre] promete con la misma solemnidad con la que un crío jura que no ha sido él: mirándote a los ojos mientras miente de puta madre.',
  'Dices «solo somos amigos» con la ropa de esa persona puesta.', // ROCKSTAR
  'Tienes el oficio de Judas, pero sin la decencia de devolver las treinta monedas.',
  '*Fidelidad garantizada hasta la segunda copa.* Lo pone en tu etiqueta, [nombre], y en la de todos tus ex.', // ROCKSTAR
  '[nombre] te quita la pareja y luego te pide consejo para la relación.', // ROCKSTAR
  'Tienes guardado a tu lío como «Mecánico». Tu coche no ha pisado un taller en su vida.', // ROCKSTAR
  'Le juras amor eterno a tu pareja en la cena y amor de una noche a otra persona en el postre.', // ROCKSTAR
  'La última vez que fuiste fiel a algo fue a tu mano derecha, y eso porque la izquierda no tenía suficiente técnica.', // ROCKSTAR
  'Guardas un secreto hasta que alguien te invita a una caña. Lo sueltas antes de que baje la espuma, mi niña.',
  'Te cuentan un secreto y al rato ya lo sabe gente que ni conoce a quien te lo contó.',
  '[nombre] dice que ayuda con la mudanza y a esa hora está subiendo historias desde una piscina.',
  'Prometes ser fiel con la misma mano con la que escribes a tu ex a las tres de la mañana.', // ROCKSTAR
  'Cambias de bando en una bronca según quién tenga más gente detrás. Tu lealtad la decide un recuento.',
  '[nombre] tiene capturas de todos sus amigos guardadas por si algún día hacen falta. Ya han hecho falta.',
  'Tu «estoy con los de la oficina» huele a un perfume que no es de la oficina.', // ROCKSTAR
  'Prometes que vas y a la hora te inventas una fiebre. La fiebre sale luego en una foto de discoteca.',
  'Te ofreces a llevar a casa a la pareja de tu amigo, y llegáis a casa al día siguiente.', // ROCKSTAR
  'Tus amigos te cuentan sus problemas y tú se los cuentas a sus ex. Las rupturas llevan tu firma.',
  'Hablas bien de la gente delante y la despellejas en el audio siguiente, y a veces te equivocas de chat, princesa.',
  '[nombre] vende a quien sea por un sitio en la mesa buena. Cambia de mesa, y nadie le guarda la silla.',
  'Dices que el roce hace el cariño, y rozas a todo el que se deja.', // ROCKSTAR
  'Juras por tu madre cada vez que mientes, y a tu madre ya le deben de pitar los oídos todo el día.',
  'Abandonas los grupos de trabajo justo antes de entregar, y luego pones tu nombre en la portada.',
];

// ═══════════════════════════════════════════════════════════════════════════
// !infiel — TIER ALTO (65-100%): infiel confirmado. Brutal.
// ═══════════════════════════════════════════════════════════════════════════

const INFIEL_HIGH = [
  'Eres tan infiel que tu entrepierna debería tener su propio DNI y cotizar a la Seguridad Social por horas extras, muñeca.', // ROCKSTAR
  'Quien esté contigo te espera en casa mientras tú haces horas extra de mierda. Y las horas extra no son en la oficina.', // ROCKSTAR
  '[nombre] guarda a sus ex en un puto archivo histórico, y todas las carpetas llevan la misma etiqueta: traición.',
  'Quien salga contigo necesita más una aseguradora que un anillo. Lo tuyo es siniestro total.', // ROCKSTAR
  '[nombre] pone los cuernos y luego regala flores. Con la tarjeta de la víctima.',
  '[nombre] borra chats más rápido de lo que escribe «te quiero».',
  '[nombre] tiene el móvil con tres contraseñas, huella dactilar y borrado automático. Lo que protege no es su intimidad.',
  'Eres de esa gente que va al funeral de una relación con el traje puesto para la siguiente boda.',
  'Tienes la fidelidad de un perro callejero, pero sin la excusa de no tener dueño. Tú tienes, y aun así meas en otros jardines.', // ROCKSTAR
  '[nombre] tiene tantos líos abiertos que necesita un calendario solo para no cruzarlos.', // ROCKSTAR
  'Engañar es tu cardio: lo haces todos los días, mantienes el ritmo y ni sudas la camiseta.', // ROCKSTAR
  'Eres de esa gente que se descarga Tinder en la boda y lo usa durante la ceremonia.',
  'Tu historial sentimental debería venir con un aviso: peligro biológico, no tocar sin protección y, a ser posible, no tocar.', // ROCKSTAR
  'Engañarías a tu pareja con la misma cara con la que le das los buenos días.',
  'Quien te aguante como pareja debería cobrar un sueldo, con plus de peligrosidad y horas nocturnas.',
  '[nombre], eres tan infiel que tu funeral va a parecer una reunión de antiguos alumnos: todo el mundo se conoce y nadie dice de qué.',
  'Guardarías a la pareja como «Casa» y al resto como «Trabajo».',
  'Dices que vas al gimnasio y vuelves con el pelo mojado y la bolsa sin abrir, pequeña.', // ROCKSTAR
  'Tienes dos cargadores, dos móviles y dos versiones del mismo finde. Las dos te salen bien, y eso asusta.',
  'Borras el historial y acto seguido pides que confíen en ti.',
  '[nombre] pide perdón con el mismo ramo a parejas distintas. En la floristería ya le conocen.',
  'Quien salga contigo se va a enterar de la mitad. La otra mitad la sabrá el grupo entero, con capturas.',
  'Eres capaz de liarte con alguien en una boda mientras tu pareja baila con la abuela.', // ROCKSTAR
  'Tendrías Tinder con la foto de las vacaciones que te pagó tu pareja.',
  'Pondrías «en camino» desde la cama de otra persona.', // ROCKSTAR
];

// ═══════════════════════════════════════════════════════════════════════════
// !infiel — TIER MEDIO (31-64%): zona gris. Ni limpio ni pillado.
// ═══════════════════════════════════════════════════════════════════════════

const INFIEL_MID = [
  '[nombre] no engaña pero tampoco cierra la puerta del todo. Deja una rendija por si hay corriente de aire de otra cama.',
  '[nombre] no ha cruzado la línea, pero ha meado justo al borde. No es faltar, pero los zapatos se mojan.', // ROCKSTAR
  '[nombre] no engaña pero tiene el kit de emergencia preparado. Condones en la cartera por si acaso. Y ese si acaso huele fatal.', // ROCKSTAR
  '[nombre] tiene la coartada preparada para cosas que supuestamente no ha hecho. Ese nivel de preparación delata más que una prueba.',
  'Eres quien dice que no pasa nada cuando aparece un pelo que no es de nadie de la casa. Siempre del gato, claro.', // ROCKSTAR
  '[nombre] tiene conversaciones que no enseñaría ni bajo amenaza. No son prueba de nada, pero de inocencia tampoco.',
  'No has sido infiel todavía, pero tienes el móvil boca abajo en la mesa como quien esconde un parte.',
  'Sales a por tabaco y vuelves con perfume nuevo, y tú ni fumas.', // ROCKSTAR
  'Tienes un contacto guardado como «Fontanero» al que se escribe cuando el resto duerme, pequeña.', // ROCKSTAR
  'Juras que solo es amistad, y a esa amistad le mandas audios que no le mandas a nadie más. Tú sabrás.',
];

// ═══════════════════════════════════════════════════════════════════════════
// !infiel — TIER BAJO (0-30%): nada que reprochar. Halago.
// ═══════════════════════════════════════════════════════════════════════════

const INFIEL_LOW = [
  '[nombre] no engaña ni en sueños. Sueña que le ponen los cuernos y se despierta pidiéndole explicaciones a la almohada.',
  'Eres tan fiel que podrían mandarte a una despedida en Benidorm y volverías sin nada más que quemaduras de sol.', // ROCKSTAR
  '[nombre] deja el móvil desbloqueado encima de la mesa y nadie se pone nervioso. Qué vida más tranquila, y qué aburrida.',
  'Te sientan al lado de alguien guapísimo en la barra y no pasas de la conversación. A la media hora, se cambia de taburete.', // ROCKSTAR
  'Te dejan las llaves del coche, la tarjeta y la pareja, y no tocas nada. Bueno, el coche quizá.', // ROCKSTAR
  'Entre tanta gente con el móvil lleno de fotos en pelotas, [nombre] no ha mandado ni una. Tampoco se las ha pedido nadie.', // ROCKSTAR
  'Tus colegas te usan de coartada cuando sus parejas sospechan: contigo nunca pasa nada.',
  'Si un día te pillaran siendo infiel, saldría en las noticias. Mientras tanto no sale nada, y tu vida tampoco da para más.',
  'Eres tan fiel que das asco. Del asco bueno, el que da ver algo tan limpio en este grupo de mierda.',
  'Si alguien te revisara el móvil, se aburriría. Lo más turbio que tienes es el grupo de la familia.',
];

module.exports = {
  FIEL_HIGH, FIEL_MID, FIEL_LOW,
  INFIEL_HIGH, INFIEL_MID, INFIEL_LOW,
};
