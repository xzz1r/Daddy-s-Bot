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
  'Mira, hay gente que promete y luego se hace la muerta. Y luego está [nombre], que cumple hasta lo que no ha prometido.',
  '[nombre] es de esa gente que te cubre en una pelea de bar y encima pide perdón por no haber llegado antes.',
  'La palabra de [nombre] vale más que un contrato firmado ante notario, tres testigos y un cura.',
  'Joder, si esta persona te falla a ti, ya puedes perder la fe en la humanidad entera porque no queda nada detrás.',
  'Joder, eres fiel como los impuestos: pase lo que pase, ahí estás. Pero tú, a diferencia de Hacienda, caes bien.',
  'Joder, [nombre] no te deja tirado ni en un apocalipsis zombie. Mientras otros corren, te espera con un bate.',
  'Tú eres de los que comparten la última cerveza, cabrón. Y eso en mi código moral te pone por encima del Papa.',
  'Joder, [nombre] te dice la verdad a la cara mientras el resto te miente sonriendo. Fiel de los que duelen.',
  'Joder, si midieran la lealtad con un alcoholímetro, a ti te retiraban el carnet de tanto que llevas encima.',
  'Coño, la lealtad de [nombre] ya no es una virtud, es un puto diagnóstico. Pero de los que el médico ve y dice joder, ojalá fuera contagioso.',
];

// ═══════════════════════════════════════════════════════════════════════════
// !fiel — TIER MEDIO (31-69%): lealtad con grietas. Ni fiable ni traidor.
// ═══════════════════════════════════════════════════════════════════════════

const FIEL_MID = [
  'Coño, eres fiel por inercia, no por convicción. El día que la inercia se pare vas a salir volando hacia la primera mierda que pase.',
  '[nombre] guarda conversaciones como quien guarda cupones: no los usa, pero le jode tirarlos por si acaso valen para algo.',
  'Joder, lo tuyo es una puta lealtad de temporada. Te apuntas cuando hay buen tiempo y te das de baja cuando llueve.',
  'Eres fiel hasta que alguien te pone una cerveza fría y una sonrisa. Entonces tus principios se derriten como mantequilla en sartén.',
  'Coño, eres fiel por descarte, no por elección. Si tuvieras más opciones ya habríamos visto tu verdadera cara.',
  'Eres fiel cuando te vigilan y te relajas cuando no. Eso no es lealtad, es un examen con el profesor mirando, gilipoyas.',
  '[nombre] ejerce la lealtad por cuenta propia: trabaja para quien pague mejor en cada momento, sin contrato fijo.',
  'Eres quien ayuda a mudarse pero se larga antes de montar los muebles. Presente en lo fácil, ausente en lo jodido.',
  'Joder, [nombre] no engaña por falta de habilidad social, no por principios. El día que aprenda a ligar la cagamos.',
  '[nombre] no traiciona a lo grande, decepciona a lo pequeño. Que es como morir de mil cortes en vez de una puñalada. Mismo resultado.',
];

// ═══════════════════════════════════════════════════════════════════════════
// !fiel — TIER BAJO (0-30%): cero lealtad. Brutal.
// ═══════════════════════════════════════════════════════════════════════════

const FIEL_LOW = [
  'Hostia puta, te han puesto más cuernos que a un reno en Navidad, pero es que tú los pones con la naturalidad de un puto profesional.',
  'Eres el puto Judas del grupo pero sin la decencia de devolver las treinta monedas. Traidor y encima rata, vaya combo.',
  'Hostia, [nombre] es tan desleal que si le prestas un boli lo devuelve sin tinta y mordido. Y encima te dice que ya estaba así.',
  'Eres la clase de escoria que vende a su madre por un kebab con extra de carne. Y luego regateas el precio, rata.',
  '[nombre] traiciona con la frecuencia de quien se lava los dientes: dos veces al día y a veces tres si hay oportunidad.',
  'Hostia puta, traicionas tanto que Brutus te miraría y diría joder, esto ya es pasarse, y yo apuñalé a César.',
  'Coño, si te dejaran a solas con la Mona Lisa la venderías en Wallapop por veinte euros y un intercambio. Desleal hasta con el arte.',
  'Hostia, si la deslealtad fuese una ETS, tú serías la puta pandemia del siglo. Contagias traición con solo abrir la boca.',
  'Tienes tan poca palabra que hasta tu sombra se aleja de ti cuando nadie mira. La única lealtad que tienes es la de tu propia mierda.',
  '[nombre] promete con la misma solemnidad con la que un crío jura que no ha sido él: mirándote a los ojos mientras miente de puta madre.',
  'Joder, tienes más puñaladas traperas que un patio de prisión. Y la mayoría se las has clavado a gente que te quería, escoria.',
  'Hostia, [nombre] traiciona como otros respiran: sin pensar, sin parar y con la puta naturalidad del que no sabe hacer otra cosa.',
  '[nombre] te quita la pareja y luego te pide consejo para la relación. Un descaro de cojones, como siempre.',
  'Joder, si montaras un negocio de lealtad, quebrarías en una hora. No tienes materia prima, no tienes producto, no tienes nada.',
  'Eres la definición andante de hijo de puta con DNI. Si buscas traición en el diccionario, sale tu cara y tu código postal.',
  'Joder, te han dado más oportunidades que a un preso en tercer grado y las has cagado todas con la precisión de un reloj suizo.',
  'Hostia, [nombre] es el tipo de persona que te denuncia a la policía y luego te visita en la cárcel para preguntarte qué tal.',
  'Coño, vendes a tu gente con la misma facilidad con la que un yonqui vende el cobre de una obra. Sin remordimiento y por calderilla.',
  'Joder, si la lealtad fuese un órgano, tú lo habrías vendido en el mercado negro hace años. Y probablemente por cuatro duros.',
  'Eres de esa escoria que le copia los deberes al compañero y luego le acusa de copiar. Traidor con aliño de gilipoyas.',
  'Joder, la última vez que fuiste fiel a algo fue a tu mano derecha, y eso porque la izquierda no tenía suficiente técnica.',
  '[nombre] es tan poco fiable que si dijera que mañana sale el sol, yo me compraría un paraguas. Por si acaso y con motivo.',
  'Eres quien le dice al camarero que la comida está mala para no pagar y luego se come las sobras del otro. Miseria y deslealtad.',
  '[nombre] te clava un cuchillo en la espalda y luego te pregunta si le puedes sacar el cuchillo porque lo necesita.',
  '[nombre] es tan poco fiable que si fuera preservativo, ya tendría diecisiete hijos y una demanda colectiva.',
];

// ═══════════════════════════════════════════════════════════════════════════
// !infiel — TIER ALTO (70-100%): infiel confirmado. Brutal.
// ═══════════════════════════════════════════════════════════════════════════

const INFIEL_HIGH = [
  'Eres tan infiel que tu entrepierna debería tener su propio DNI y cotizar a la Seguridad Social por horas extras.',
  '[nombre] se ha tirado a medio código postal y aún le quedan calles por recorrer. Un puto Google Maps de la infidelidad.',
  'Hostia, tienes más cuernos puestos que la Sierra de Gredos. Y en la Sierra al menos las cabras no se enteran.',
  '[nombre] borra chats con la velocidad de un cirujano. Tiene los dedos más rápidos borrando pruebas que escribiendo te quiero.',
  'Tu pareja te espera en casa mientras tú haces horas extra de mierda. Y las horas extra no son en la oficina.',
  '[nombre] tiene el móvil más protegido que Fort Knox. Tres contraseñas, huella dactilar y un sistema de borrado automático, el muy cabrón.',
  'Eres de esa gente que va al funeral de una relación con el traje puesto para la siguiente boda. Reciclaje emocional de cabrón.',
  'Coño, engañas a tu pareja con tanta frecuencia que ya deberías estar en nómina de otra persona. Profesional de la mierda.',
  '[nombre] no tiene exs, tiene un puto archivo histórico. Y todas las carpetas tienen la misma etiqueta: traición.',
  'Hostia, tienes la fidelidad de un perro callejero pero sin la excusa de no tener dueño. Tú tienes y aun así meas en otros jardines.',
  'Eres el puto Netflix de las relaciones: tienes varios perfiles activos, no pagas lo que deberías y compartes la cuenta con desconocidos.',
  'Tu fidelidad se mide en minutos, no en años. Y ni en minutos quedas bien, cabrón.',
  '[nombre] se ha follado a medio grupo de amigos y la otra mitad le tiene en la lista de espera. Cola de carnicería del cabrón.',
  'Hostia puta, engañar es tu cardio. Lo haces todos los días, mantienes el ritmo y ni sudas la camiseta.',
  'Coño, tienes más dobles vidas que un espía de la Guerra Fría. La diferencia es que el espía al menos servía a un bando.',
  '[nombre] no tiene corazón, tiene un hostal: entra gente, sale gente y nadie se queda más de una noche. Sin servicio de desayuno.',
  'Joder, eres de esa gente que se descarga Tinder en la boda y lo usa durante la ceremonia. Sin vergüenza y sin clase, escoria.',
  '[nombre] podría abrir una franquicia con sus infidelidades. Varias sedes, mismo servicio de mierda y cero control de calidad.',
  'Tu pareja necesita más una aseguradora que un anillo. Porque lo tuyo es un siniestro total.',
  '[nombre] le pone los cuernos a su pareja y luego le regala flores. Con la tarjeta de crédito de la víctima.',
  'Coño, tu historial sentimental debería venir con un disclaimer legal: peligro biológico, no tocar sin protección y a ser posible no tocar.',
  'Hostia, engañas a tu pareja con la misma cara con la que le dices buenos días. Psicópata emocional de manual.',
  'Eres tan infiel que si existiera una vacuna contra la deslealtad, necesitarías quince dosis y aun así seguirías contagiando.',
  'Joder, tu pareja debería cobrar un sueldo por aguantarte. Con plus de peligrosidad y horas nocturnas.',
  'Coño, [nombre], eres tan infiel que tu funeral va a parecer una reunión de antiguos alumnos. Todo el mundo se conoce, pero nadie sabe cómo.',
];

// ═══════════════════════════════════════════════════════════════════════════
// !infiel — TIER MEDIO (31-69%): zona gris. Ni limpio ni pillado.
// ═══════════════════════════════════════════════════════════════════════════

const INFIEL_MID = [
  'Joder, [nombre], ni eres infiel del todo ni eres fiel del todo. Eres el puto limbo con patas y una libido selectiva.',
  '[nombre] no engaña pero tampoco cierra la puerta del todo. Deja una rendija por si hay corriente de aire de otra cama.',
  'Joder, eres el Schrödinger de la infidelidad: hasta que tu pareja abra la caja, eres fiel e infiel al mismo tiempo.',
  '[nombre] tiene conversaciones que no enseñaría ni bajo tortura china. No son prueba de nada, pero tampoco de inocencia.',
  '[nombre] no ha cruzado la línea pero ha meado justo al borde. Que técnicamente no es faltar, pero los zapatos se mojan.',
  'Joder, ni tu madre apostaría dinero por tu fidelidad. Y tu madre te quiere. Eso dice todo lo que hay que decir.',
  '[nombre] no engaña pero tiene el kit de emergencia preparado. Condones en la cartera por si acaso. Y ese si acaso huele fatal.',
  '[nombre] tiene la coartada preparada para cosas que supuestamente no ha hecho. Ese nivel de preparación delata más que una prueba.',
  'Coño, eres fiel por GPS: si alguien te rastrea cumples, si pierdes cobertura haces lo que te sale de los cojones.',
  'Eres quien dice que no pasa nada mientras su pareja encuentra un pelo que no es suyo. Siempre del gato. Claro, el gato.',
];

// ═══════════════════════════════════════════════════════════════════════════
// !infiel — TIER BAJO (0-30%): nada que reprochar. Halago.
// ═══════════════════════════════════════════════════════════════════════════

const INFIEL_LOW = [
  '[nombre] no engaña ni en los sueños. Sueña que le ponen los cuernos y se despierta pidiendo explicaciones. Fiel hasta con los ojos cerrados.',
  '[nombre] es de las pocas personas a las que puedes dejar el móvil desbloqueado encima de la mesa sin que te suba la ansiedad.',
  'Joder, eres tan fiel que das asco. Pero del bueno, del asco que produce ver algo tan jodidamente puro en un mundo de mierda.',
  'Joder, [nombre] es el tipo de persona que te ayuda a enterrar el cadáver y luego se queda a barrer las huellas. Leal de cojones.',
  'Eres tan fiel que tu pareja podría mandarte a una despedida de soltera en Benidorm y volverías sin nada más que quemaduras de sol.',
  'Coño, eres tan leal que podrían dejarte las llaves del Ferrari, la tarjeta de crédito y la pareja y no tocarías ninguna. Bueno, el Ferrari quizá.',
  '[nombre] es la prueba de que la evolución a veces acierta. Entre millones de monos con móvil, sale un ejemplar que no manda fotos en pelotas a desconocidos.',
  'Eres tan fiel que tus colegas te usan como escudo humano cuando sus parejas sospechan. Si él va con [nombre] entonces no ha pasado nada.',
  'Joder, eres tan leal que si un día te pillaran siendo infiel, saldrías en las noticias. Titular: cae el último bastión de la fidelidad en España.',
  'Joder, [nombre] es la clase de persona a la que le das las llaves de casa, la contraseña del banco y la ubicación de tu amante. Y no le sacan nada ni con tenazas.',
];

module.exports = {
  FIEL_HIGH, FIEL_MID, FIEL_LOW,
  INFIEL_HIGH, INFIEL_MID, INFIEL_LOW,
};
