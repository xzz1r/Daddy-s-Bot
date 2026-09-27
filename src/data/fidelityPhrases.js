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
// !fiel — TIER ALTO (70-100%): lealtad real. Halago.
// ═══════════════════════════════════════════════════════════════════════════

const FIEL_HIGH = [
  '[nombre] cumple hasta lo que no ha prometido, y luego te lo recuerda en cada cena.',
  '[nombre] te cubre en una pelea de bar y encima pide perdón por no haber llegado antes. Luego te toca pagarle las copas un año.',
  'La palabra de [nombre] vale más que un contrato. Lo malo es que la da para todo, y ahora le toca cumplir con medio grupo.',
  'Le has sujetado el pelo a gente vomitando a las cinco de la mañana y no se lo has contado a nadie. Ni a quien vomitaba.',
  'Compartes la última cerveza. En este grupo eso ya es una declaración de amor.',
  'Tu pareja deja el móvil encima de la mesa y tú ni lo miras. Tu pareja, en cambio, mira el tuyo cada noche.',
  '[nombre] te dice la verdad a la cara mientras el resto te miente sonriendo. Se agradece, y escuece.',
  'Vas a todas las mudanzas, a todos los entierros y a todas las bodas. Tienes la agenda llena de favores y ni un plan tuyo.',
  'Llevas diez años con los mismos amigos y ni una bronca que no se arreglara esa noche. Aburre contarlo, eso sí.',
  'Cuando alguien del grupo cae en desgracia, [nombre] le sigue invitando a los planes, y luego se pasa la noche dando explicaciones.',
];

// ═══════════════════════════════════════════════════════════════════════════
// !fiel — TIER MEDIO (31-69%): lealtad con grietas. Ni fiable ni traidor.
// ═══════════════════════════════════════════════════════════════════════════

const FIEL_MID = [
  '[nombre] guarda conversaciones como quien guarda cupones: no los usa, pero le jode tirarlos por si acaso valen para algo.',
  '[nombre] ejerce la lealtad por cuenta propia: trabaja para quien pague mejor en cada momento, sin contrato fijo.',
  'Eres quien ayuda a mudarse pero se larga antes de montar los muebles. Presente en lo fácil, ausente en lo jodido.',
  'Lo tuyo es una puta lealtad de temporada. Te apuntas cuando hace buen tiempo y te das de baja cuando llueve.',
  'Eres fiel hasta que alguien te pone delante una cerveza fría y una sonrisa, y entonces empiezas a negociar.',
  'Contestas al primer mensaje de tu ex «por educación». Por educación llevas tres semanas contestando.',
  'No has hecho nada todavía, pero ya sabes qué hotel queda más cerca de tu trabajo.',
  'Eres fiel cuando te miran. Cuando no te miran, miras tú, y bastante.',
  'Ayudas a tus amigos si no coincide con el fútbol, con la siesta o con un plan mejor.',
  '[nombre] no engaña a nadie porque no le sale ligar. El día que le salga, el grupo tiene tema para un año.',
];

// ═══════════════════════════════════════════════════════════════════════════
// !fiel — TIER BAJO (0-30%): cero lealtad. Brutal.
// ═══════════════════════════════════════════════════════════════════════════

const FIEL_LOW = [
  'Eres la clase de escoria que vendería a su madre por un kebab con extra de carne, y encima regatearía el precio.',
  '[nombre] traiciona con la frecuencia de quien se lava los dientes: dos veces al día y a veces tres si hay oportunidad.',
  '[nombre] promete con la misma solemnidad con la que un crío jura que no ha sido él: mirándote a los ojos mientras miente de puta madre.',
  '[nombre] te clava un cuchillo en la espalda y luego te pregunta si le puedes sacar el cuchillo porque lo necesita.',
  'Tienes el oficio de Judas, pero sin la decencia de devolver las treinta monedas.',
  '[nombre] es tan desleal que si le prestas un boli lo devuelve sin tinta y mordido. Y encima te dice que ya estaba así.',
  '[nombre] te quita la pareja y luego te pide consejo para la relación.',
  '[nombre] es el tipo de persona que te denuncia a la policía y luego te visita en la cárcel para preguntarte qué tal.',
  'Eres de esa escoria que le copia los deberes al compañero y luego le acusa de copiar.',
  'La última vez que fuiste fiel a algo fue a tu mano derecha, y eso porque la izquierda no tenía suficiente técnica.',
  'Le guardaste el secreto a tu mejor amigo hasta que su ex te invitó a una caña. Lo soltaste antes de que bajara la espuma.',
  'Te cuentan un secreto a las once y a las once y cuarto ya lo sabe tu grupo del gimnasio.',
  '[nombre] dijo que ayudaba con la mudanza y a esa hora subía historias desde una piscina.',
  'Te fuiste de la cena antes del postre y sin pagar tu parte, y al día siguiente preguntaste qué tal había ido.',
  'Cambias de bando en una bronca según quién tenga más gente detrás. Tu lealtad la decide un recuento.',
  '[nombre] tiene capturas de todos sus amigos guardadas por si algún día hacen falta. Ya han hecho falta dos veces.',
  'Celebraste tu cumpleaños con la gente que le cae mal a tus amigos, y tus amigos se enteraron por las historias.',
  'Prometes que vas y a la hora te inventas una fiebre. La fiebre sale luego en una foto de discoteca.',
  'Te prestaron cincuenta euros en marzo y en junio seguías sin blanca, según tú, desde una puta terraza en Ibiza.',
  'Tus amigos te cuentan sus problemas y tú se los cuentas a sus ex. Ya van tres rupturas con tu firma.',
  'Hablas bien de la gente delante y la despellejas en el audio siguiente, y a veces te equivocas de chat.',
  '[nombre] vende a quien sea por un sitio en la mesa buena. Llevas años cambiando de mesa, y nadie te guarda la silla.',
  'Te piden que guardes el sitio en la cola y se lo das al primero que te sonríe.',
  'Juras por tu madre cada vez que mientes, y a tu madre ya le deben de pitar los oídos todo el día.',
  'Abandonas los grupos de trabajo justo antes de entregar, y luego pones tu nombre en la portada.',
];

// ═══════════════════════════════════════════════════════════════════════════
// !infiel — TIER ALTO (70-100%): infiel confirmado. Brutal.
// ═══════════════════════════════════════════════════════════════════════════

const INFIEL_HIGH = [
  'Eres tan infiel que tu entrepierna debería tener su propio DNI y cotizar a la Seguridad Social por horas extras.',
  'Tu pareja te espera en casa mientras tú haces horas extra de mierda. Y las horas extra no son en la oficina.',
  '[nombre] guarda a sus ex en un puto archivo histórico, y todas las carpetas llevan la misma etiqueta: traición.',
  'Tu pareja necesita más una aseguradora que un anillo. Porque lo tuyo es un siniestro total.',
  '[nombre] le pone los cuernos a su pareja y luego le regala flores. Con la tarjeta de crédito de la víctima.',
  '[nombre] borra chats más rápido de lo que escribe «te quiero».',
  '[nombre] tiene el móvil con tres contraseñas, huella dactilar y borrado automático. Lo que protege no es su intimidad.',
  'Eres de esa gente que va al funeral de una relación con el traje puesto para la siguiente boda.',
  'Tienes la fidelidad de un perro callejero, pero sin la excusa de no tener dueño. Tú tienes, y aun así meas en otros jardines.',
  '[nombre] se ha follado a medio grupo de amigos, y la otra mitad está en lista de espera.',
  'Engañar es tu cardio: lo haces todos los días, mantienes el ritmo y ni sudas la camiseta.',
  'Eres de esa gente que se descarga Tinder en la boda y lo usa durante la ceremonia.',
  'Tu historial sentimental debería venir con un aviso: peligro biológico, no tocar sin protección y, a ser posible, no tocar.',
  'Engañas a tu pareja con la misma cara con la que le dices buenos días.',
  'Tu pareja debería cobrar un sueldo por aguantarte, con plus de peligrosidad y horas nocturnas.',
  '[nombre], eres tan infiel que tu funeral va a parecer una reunión de antiguos alumnos: todo el mundo se conoce y nadie dice de qué.',
  'Tienes a tu pareja guardada en el móvil como «Casa», y a otras tres personas como «Trabajo».',
  'Dices que vas al gimnasio y vuelves con el pelo mojado y la bolsa sin abrir.',
  'Tienes dos cargadores, dos móviles y dos versiones del mismo finde. Las dos te salen bien, y eso asusta.',
  'Borras el historial cada noche y a la mañana siguiente pides que confíen en ti.',
  '[nombre] ha pedido perdón con el mismo ramo de flores a tres parejas distintas. Ya le hacen descuento en la floristería.',
  'Tu pareja se ha enterado de la mitad. La otra mitad la sabe el grupo entero, y alguien ya tiene las capturas.',
  'Te liaste con alguien en la boda de tu propia prima mientras tu pareja bailaba con la abuela.',
  'Tienes Tinder con la foto de las vacaciones que te pagó tu pareja.',
  'Pones «en camino» en el chat de tu pareja desde la cama de otra persona.',
];

// ═══════════════════════════════════════════════════════════════════════════
// !infiel — TIER MEDIO (31-69%): zona gris. Ni limpio ni pillado.
// ═══════════════════════════════════════════════════════════════════════════

const INFIEL_MID = [
  '[nombre] no engaña pero tampoco cierra la puerta del todo. Deja una rendija por si hay corriente de aire de otra cama.',
  '[nombre] no ha cruzado la línea pero ha meado justo al borde. Que técnicamente no es faltar, pero los zapatos se mojan.',
  '[nombre] no engaña pero tiene el kit de emergencia preparado. Condones en la cartera por si acaso. Y ese si acaso huele fatal.',
  '[nombre] tiene la coartada preparada para cosas que supuestamente no ha hecho. Ese nivel de preparación delata más que una prueba.',
  'Eres quien dice que no pasa nada mientras su pareja encuentra un pelo que no es suyo. Siempre del gato. Claro, el gato.',
  '[nombre] tiene conversaciones que no enseñaría ni bajo amenaza. No son prueba de nada, pero de inocencia tampoco.',
  'No has sido infiel todavía, pero tienes el móvil boca abajo en la mesa desde hace un año.',
  'Sales a por tabaco y vuelves con perfume nuevo, y tú ni fumas.',
  'Tu pareja confía en ti, y tú tienes un contacto guardado como «Fontanero» al que escribes a las dos de la mañana.',
  'Juras que solo es amistad, y a esa amistad le mandas audios que a tu pareja no le mandas.',
];

// ═══════════════════════════════════════════════════════════════════════════
// !infiel — TIER BAJO (0-30%): nada que reprochar. Halago.
// ═══════════════════════════════════════════════════════════════════════════

const INFIEL_LOW = [
  '[nombre] no engaña ni en los sueños. Sueña que le ponen los cuernos y se despierta pidiendo explicaciones. Fiel hasta con los ojos cerrados.',
  'Eres tan fiel que tu pareja podría mandarte a una despedida de soltera en Benidorm y volverías sin nada más que quemaduras de sol.',
  '[nombre] deja el móvil desbloqueado encima de la mesa y nadie se pone nervioso. Qué vida más tranquila, y qué aburrida.',
  'Te sientan al lado de alguien guapísimo en la barra y le hablas de tu pareja media hora. A la tercera foto se cambió de taburete.',
  'Te dejan las llaves del coche, la tarjeta y la pareja, y no tocas nada. Bueno, el coche quizá.',
  'Entre tanta gente con el móvil lleno de fotos en pelotas, [nombre] no ha mandado ni una. La evolución a veces acierta.',
  'Tus colegas te usan de coartada cuando sus parejas sospechan: contigo nadie hace nada, en teoría.',
  'Si un día te pillaran siendo infiel, saldría en las noticias. Mientras tanto no sale nada, y tu vida tampoco da para más.',
  'Eres tan fiel que das asco. Del asco bueno, el que da ver algo tan limpio en este grupo de mierda.',
  'Tu pareja te revisa el móvil por costumbre y se aburre. Lo más turbio que tienes es el grupo de la familia.',
];

module.exports = {
  FIEL_HIGH, FIEL_MID, FIEL_LOW,
  INFIEL_HIGH, INFIEL_MID, INFIEL_LOW,
};
