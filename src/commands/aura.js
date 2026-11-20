const { isOwner, isMainOwner, isAdmin, getTarget, getSender, canonicalJid, sameUser, soloMiembros, enGrupoODueño, dueñoEnPrivado, numeroEnArgs, sinEsperaAura } = require('../utils/wa');
const { apel } = require('../utils/vocativo');
const { pickFresh, fmt, parseCantidad, resolverCantidad, etiquetaRiesgo } = require('../utils/helpers');
const { getAura, addAura, spendAura, getAuraRanking, flushAura, verCaja, BOLSA } = require('../utils/auraStore');
const { resetearEconomia } = require('../utils/reinicioEconomia');
const { getUserCount } = require('../utils/messageCounter');
const { getName, recordName, cargar: cargarNombres } = require('../utils/nombreStore');
const logger = require('../utils/logger');
const { contarTirada } = require('../utils/casinoStore');
const { TIRADA, P_POSITIVA, ACTIVIDAD_MSGS, ACTIVIDAD_BONO, ACTIVIDAD_TOPE, P_TOPE, MULT_CASTIGO, MULT_CASTIGO_GRANDE, P_TRAMO_GRANDE, TIRADAS_PAGADAS, bonoActividad, bonoVeterania, VETERANIA_TOPE, APUESTA, pApuestaDe, pApuestaVisible, PRECIOS, ARRANQUE, MILLONARIO, tirar, MOMENTUM } = require('../utils/economia');
const { APUESTA_GANA, APUESTA_PIERDE } = require('../data/apuestaPhrases');
const { fraseCooldown, AURA_TIRADA, AURA_APOSTAR, AURA_TOP_ANSIAS, AURA_TOP_POBRE } = require('../data/cooldownPhrases');
const { bloqueCooldown, lineaAura } = require('../utils/formatoJuego');
const { auraApagada, avisarApagada, toggleAura, reiniciarAviso } = require('../utils/auraSwitch');
const { BOTE, ATRACO, CONTRA, RACHA, RIESGO, OBJETOS, VENTAJA, RECOMPENSA, IMPUESTO, REGALO_MIN, SUELO_TODOS } = require('../utils/economia');
const { aportarAlBote } = require('../utils/roboStore');
const tiendaObj = require('../utils/roboStore');
const momentum = require('../utils/momentum');
const { objetivoDelDia, esObjetivoDelDia, diaClave } = require('../utils/objetivoDia');
const { ownerGana } = require('../utils/rigOwner');
const { SOLO_GRUPOS } = require('../data/avisos');
const { aviso, avisoPermiso } = require('../utils/helpers');
const { clavesMapa, juntarEnMapa } = require('../utils/persona');

// SUBIDO desde minuto y medio por decision del owner. La cifra esta abajo, en
// la constante, y NO se repite aqui: este comentario decia "QUINCE MINUTOS"
// mientras el valor eran diez, y un comentario que miente es peor que ninguno
// porque se lee antes que el codigo.
//
// Va en el mismo paquete que subir el acierto y capar los importes: menos
// tiradas, mas seguidas de ganar y mas pequeñas. La tirada pasa de ser algo que
// se machaca mientras se habla a ser algo que se mira de vez en cuando.
//
// El efecto practico esta en las tiradas de pago: con minuto y medio las cinco
// que cobran se agotaban en menos de diez minutos y el resto del dia se tiraba
// a valor cero. Con quince minutos cubren mas de una hora, asi que la parte del
// comando que paga de verdad dura lo que dura una conversacion.
const ROLL_COOLDOWN_MS = 10 * 60 * 1000;
// La espera de la tirada y la de la apuesta son POR PERSONA, no por grupo: el
// aura es una sola (auraStore, CLAVE_TODOS) y con un reloj por grupo, quien
// estuviera en dos tiraba el doble sobre el mismo saldo.
const lastRoll = new Map(); // `${BOLSA}|${canonicalJid}` -> timestamp
const anuncioObjetivo = new Map(); // grupo -> diaClave, para no pinguear al cazado en cada tirada

// Tirada de aura.
//
// Dos cosas cambiaron respecto de la version anterior:
//
//  1. Los importes bajaron (250-500 / 50-200 -> 60-150 / 15-50). La tirada ya
//     no es la via rapida a nada: es un goteo. Quien quiera subir de verdad
//     tiene que escribir o robar, que es donde estan las dinamicas.
//  2. La probabilidad de salir positivo SUBIO para el miembro (45 % -> 52 %).
//     Recortar el importe Y castigar la probabilidad a la vez convertia !aura
//     en una maquina de perder y la gente dejaba de usarlo. Sigue habiendo
//     riesgo real: casi la mitad de las tiradas bajan el marcador.
//
// El plus por actividad es pequeno a proposito. Premia al que aparece sin
// convertir el comando en una renta por antiguedad: la tirada sigue siendo azar.
// Una tirada. `plusActividad` es el bono de veterania ya calculado y `dePago`
// dice si esta tirada esta dentro de las que cobran hoy.
function rollAura(targetIsOwner, targetIsAdmin, plusActividad = 0, dePago = true) {
  const grande  = () => tirar(TIRADA.grande);
  const pequena = () => tirar(TIRADA.pequena);
  // P_TRAMO_GRANDE.gana, no un 0.34 suelto. Aqui el valor esperado es cero de
  // todas formas (mismo importe a los dos lados), asi que la cifra no rompia la
  // economia — pero era una constante distinta de la que usa el resto de la
  // funcion para lo mismo, y el auditor calcula con la del modulo.
  const premio  = () => (Math.random() < P_TRAMO_GRANDE.gana ? grande() : pequena());

  // ─── Las tiradas que ya no cobran ──────────────────────────────────────────
  //
  // A partir de TIRADAS_PAGADAS la tirada sigue funcionando pero deja de dar
  // dinero: cara o cruz limpia (50 %) y el MISMO importe a los dos lados, o sea
  // valor esperado cero exacto. Ni castigo multiplicado ni ventaja de nadie.
  //
  // Es el freno que permite que las tiradas de arriba paguen de verdad. Sin el,
  // un valor esperado positivo por 960 tiradas diarias (una cada 90 s las 24 h,
  // que un script hace sin despeinarse) seria una imprenta. Y a diferencia del
  // tope de tiradas que se probo hace tiempo, este no PROHIBE nada: no convierte
  // el comando en mirar un contador, solo deja de repartir.
  if (!dePago) {
    const cuanto = premio();
    return Math.random() < 0.5
     ? { tier: cuanto >= TIRADA.grande[0] ? 'blessed' : 'gain', amount:  cuanto }
     : { tier: cuanto >= TIRADA.grande[0] ? 'cursed' : 'loss', amount: -cuanto };
  }

 const rol = targetIsOwner ? 'owner' : targetIsAdmin ? 'admin' : 'miembro';
  const base = P_POSITIVA[rol];

  // Cada rol tiene su propio techo y los tres rangos NO se solapan: un miembro
  // llega como mucho al 65 y la base de un admin ya es 67, asi que ni el mas
  // veterano alcanza a un admin recien nombrado. Lo mismo entre admin y owner.
  // (Las cifras bajaron quince puntos cuando el dueño dijo que «la peña siempre
  // gana»; el que las mueva que mantenga el hueco, o el rol deja de valer.)
  const pPos = Math.min(P_TOPE[rol], base + plusActividad);

  if (Math.random() < pPos) {
    return Math.random() < P_TRAMO_GRANDE.gana
     ? { tier: 'blessed', amount:  grande() }
     : { tier: 'gain',    amount:  pequena() };
  }

  // ─── El castigo, IGUAL PARA TODOS ──────────────────────────────────────────
  //
  // Antes salia de la propia probabilidad de cada uno, y tenia dos efectos que
  // no se querian: cualquier mejora de suerte se autodestruia (ganabas mas veces
  // y perdias mas de golpe, con el mismo resultado a fin de mes) y al que mejor
  // le iba mas le dolia — un veterano veia golpes de -95 y un novato de -73.
  //
  // Ahora es el tramo por un multiplicador fijo, igual para todos: la suerte
  // decide CADA CUANTO pierdes, no cuanto.
  //
  // Y perder ya tiene dos tamanyos, como ganar. Antes "cursed" cambiaba las
  // frases pero no el importe, asi que el drama lo ponia el texto mientras el
  // marcador decia lo mismo que en una perdida normal. Una de cada cuatro
  // derrotas sale ahora del tramo grande y duele de verdad.
  return Math.random() < P_TRAMO_GRANDE.pierde
   ? { tier: 'cursed', amount: -Math.round(grande()  * MULT_CASTIGO_GRANDE) }
   : { tier: 'loss',   amount: -Math.round(pequena() * MULT_CASTIGO) };
}


// Las analogias baratas estan todas fuera (npm run analogias da cero). Los
// cinco ejemplos marcados «intocables» en blessed/loss/cursed no se tocan.
// `gain` ya no existe: se partio en gainPobre y gainRico.
// A partir de aqui se es RICO a efectos de chiste. Lo fijo el dueño: «rico es
// a partir de 1.5k».
const UMBRAL_RICO = 1500;

const AURA = {
  blessed: [
    // ── Ejemplos del usuario (intocables) ──
    'Nadie sabía cómo quitarte el respeto que acabas de ganar.',
    'Por una vez no fuiste el chiste del grupo.',
    'Sacaste un número que obligó a esta gente a tragar saliva.',
    'Tu tirada ha dejado al grupo sin nada que decir.',
    'Hoy el aura ha caído de tu lado.',
    // ── Reescritas y nuevas ──
    'Tirada gorda. Hasta los cabrones que te ignoran han tenido que leer tu nombre.',
    'Joder, del tramo alto. Disfrútala, que a ti no te sale todos los días.',
    'Cifra gorda a tu nombre. Quien se reía de ti ahora se traga lo que te soltaba.',
    'De las altas. Medio grupo ha visto tu nombre y se le ha jodido el día.',
    'Tu tirada, limpia, sin asterisco ni excusa. Al que quiera rebatírtela, que se joda.',
    'Coño, una de las buenas. Te la cobras entera y en público.',
    'Tirada de las que se enseñan. Restrégasela en la cara a los que se reían de ti.',
    'Hoy no hay chiste a tu costa: el número no lo permite, y a más de uno le jode.',
    'Quien te subestime hoy, que mire esta cifra antes de abrir la boca.',
    'Sin trampa y a tu nombre. Los que se reían de ti han escrito «jaja» y lo han borrado.',
    'Hoy no haces bulto: sales en primer plano y el resto del grupo, de decorado.',
    'Esto te sale una vez cada mucho. Captúralo y mándaselo a los envidiosos de mierda.',
    'Has ganado a lo grande. Que se jodan los que esperaban verte en el fondo.',
    'El marcador sube a lo grande. Hoy quien hable mal de ti queda de gilipoyas.',
    'Has ganado sin trampa. Las ratas envidiosas te buscan el fallo igual, que es lo suyo.',
    'Tu nombre y una cifra gorda en la misma línea. A más de uno se le atraganta la cena.',
    'Nadie apostaba por ti, y la cifra es tuya. Que se jodan todos.',
    'Cifra gorda al lado de tu nombre. Que lo lean los que te tenían por una mierda.',
    'Hoy el dado se ha puesto de tu parte, y medio grupo se muerde las uñas, reina.',
    'Te has ganado el respeto que da una cifra así. Te dura hasta tu próxima cagada.',
    'Tirada alta. Ahora mismo hay alguna rata en el grupo deseando que te roben.',
    'Has ganado de verdad, y al grupo le jode más de lo que a ti te alegra.',
    'Cifra gorda. Hasta quien te tenía silenciado se ha enterado, chiquitina.',
    'Te ha caído una buena y el grupo se ha quedado en «escribiendo…» sin mandar nada.',
    'No te lo ha regalado nadie. Los que esperaban verte perder, a tomar por culo.',
  ],
  // GANAR NO NECESITA CHISTE. Si lo lleva, va sobre SU ECONOMIA y no sobre
  // el hecho de ganar: al pobre se le recuerda que es un muerto de hambre, al
  // rico que es rico dentro de un bot de WhatsApp. Lo decidio el dueño; ver
  // UMBRAL_RICO y GUIA.md.
  gainPobre: [
    'Hoy cenas, muerto de hambre. El saldo sube y el hambre se queda.',
    'Hoy cenas, muerto de hambre.',
    '¿Lo notas? Es lo más cerca de tener dinero que vas a estar en tu puta vida.',
    'Tu cuenta respira un poco. Sigue en la UCI y oliendo a miseria, pero respira.',
    'Para cualquiera sería calderilla. Para ti es el sueldo del mes, cosita.',
    'Lo vas a fundir en un sticker de mierda antes de cenar, que te conocemos.',
    'Esto no te saca de pobre ni de coña. Te da para disimular cinco minutos, y ni eso.',
    'Cobras, y tu cuenta no se lo cree ni ella. Lleva meses acostumbrada a la miseria.',
    'Primer paso para salir de la miseria. Te quedan todos los demás.',
    'Lo justo para que no te vean llorar mirando el saldo.',
    'Acabas de subir de indigente a pobre de toda la vida.',
    'Si te roban ahora, por fin habrá algo que robar. Hasta hoy era perder el tiempo.',
    'Tu aura sube y tu pobreza sigue ahí, mirándote con cara de asco.',
    'Algo cae en tu cuenta, la más vacía del grupo. Lo vas a mirar diez veces hoy.',
    'Ganas, pobre, pero sigues en el sótano del ranking con las ratas.',
    'Hoy tu cuenta no da pena. Da un poco menos de pena, que en tu caso ya es un milagro.',
    'Eres menos pobre que hace un minuto. Una mierda menos, para ser exactos.',
    'Cobras. Con este saldo ya casi puedes mirar el ranking sin que te dé vergüenza.',
    'Algo entra en tu cuenta. Al banco, antes de que te lo huelan las ratas del grupo.',
    'Buena tirada para una cuenta sin nada. Ya tienes algo que perder en el próximo robo.',
    'Ganas, y aun así tu saldo cabe en una frase corta.',
    'Hoy la suerte se ha acercado a tu bolsillo, y ha salido tapándose la nariz del asco.',
    'Suma para ti. En tu cuenta, esto ya es un acontecimiento, chiquitina.',
    'Ganas aura. Disfrútala, que aquí hay ratas con más hambre que tú y ya te han olido.',
    'Te entra aura y sigues muerto de hambre. La tirada no te llena.',
    'Aura nueva en tu cuenta vieja y vacía. Hasta hace eco.',
    'Te sube el saldo y sigues mirando el precio. Una tirada no te saca de pobre.',
    'Cobras, pobre. Sigue así y en un mes igual dejas de dar tanta pena.',
    'El aura te ha dado limosna, y en tu cuenta la limosna luce.',
    'Buen número. Tu saldo sigue en el sótano, pero hoy con la luz encendida.',
    'Te entra algo de aura. Sigues siendo pobre, pero ya no de solemnidad.',
    'Suma en tu cuenta. Una mierda, pero en tu caso hasta una mierda se nota el doble.',
    'Hoy tu bolsillo hace ruido, y no está acostumbrado a nada que no sea miseria.',
    'Ganas. Tu cuenta sigue pidiendo limosna, pero con una cara de miseria menos jodida.',
    'Algo de aura en tu cuenta. Ya puedes pagarte un sticker sin pedir prestado.',
    'Subes, muerto de hambre. Con esto no cenas caliente, pero picas algo.',
    'Tu saldo mejora. De ruina total a ruina a secas.',
    'Cobras. Mañana te lo roba cualquier rata, pero hoy duermes con algo de saldo.',
    'Te entra algo de aura y tu miseria ni lo nota. Sigues contando céntimos igual.',
    'Te cae aura. Con tu cartera, cualquier cosa es un milagro.',
  ],
  gainRico: [
    'Tienes una fortuna en un puto chat de amigos. Enmárcala y cuélgala encima del váter.',
    'Toda esa fortuna y fuera de aquí no te da ni para un café.',
    'Te sobra aura aquí dentro. Fuera, lo de siempre.',
    'Acumulas aura como si te fueran a dar algo por ella. No te van a dar nada.',
    'Una fortuna en un bot de WhatsApp y sin un duro para tu parte de la cena, reina.',
    'Has hecho fortuna en un bot. Lo más alto que vas a llegar en tu puta vida.',
    'Todo tu patrimonio es aura de un bot, y se va a la mierda si cambias de móvil.',
    'Tu fortuna es de chat. Ponla en el currículum y verás cómo se descojonan de ti.',
    'Una fortuna en un bot. Tu familia presumiría si no le diera vergüenza explicarlo.',
    'Si el aura valiera euros, hoy invitabas tú. Como no, la ronda la paga otro.',
    'Tu saldo impresiona mucho dentro del bot. Fuera, ni al portero.',
    'Fortuna en aura. El banco de verdad no te la acepta ni para pagar un recibo.',
    'Más aura en tu cuenta. Con eso fuera no te pagas ni el autobús.',
    'Fortuna de pantalla. Apaga el móvil y comprueba la mierda que te queda.',
    'Tienes aura para comprarte medio grupo, y ni así te escribe nadie.',
    'Montañas de aura y Hacienda no te persigue porque ni sabe que existe esa mierda.',
    'Otra subida. Ya te sobra el aura y te faltan amigos fuera de este puto grupo.',
    'Sin un duro en euros y con una fortuna en aura que no te sobrevive a salir del chat.',
    'Tu fortuna cabe en una captura. Fuera del chat no te la acepta ni el bar de abajo.',
    'Mucha fortuna en este chat, y fuera no te fían ni un chicle.',
    'Con esa fortuna de bot, tu abuela ni lo entendería ni te pediría prestada esa mierda.',
    'Más aura. El grupo te envidia y al mundo real le importa una mierda que existas.',
    'Tu cuenta del bot sube y la del banco ni se ha enterado, que sigue en la puta ruina.',
    'Magnate de un chat. Tu imperio cabe en una pantalla de seis pulgadas.',
    'Paga la cena con tu aura de bot y verás cómo se descojona el camarero.',
    'Tienes una fortuna que no sirve para una mierda. Igual que tú.',
    'Aquí dentro te sobra el dinero. Ahí fuera nadie te va a creer una puta palabra.',
    'Tu saldo ya estaba gordo y engorda más. Ni un euro, pero gordo.',
    'Tu saldo da vértigo y tu cartera de verdad, pena y asco.',
    'Tanta aura junta y las ratas del grupo ya se están relamiendo con tu saldo.',
  ],
  loss: [
    // ── Ejemplos del usuario (intocables) ──
    'Bajaste y nadie se inmutó. Ya es parte del puto paisaje verte perder aura.',
    'Se te escurrió un poco más de presencia. El grupo ni parpadeó, pringado.',
    'Ni siquiera generas gracia. Esa cara de obvio. Qué asco de previsible.',
    'Te han quitado aura sin ganas, como quien espanta una mosca.',
    'Hoy el puto grupo te bajó un escalón más y ni se molestó en reírse.',
    // ── Reescritas y nuevas ──
    'Golpe pequeño, pero en un saldo de mierda como el tuyo se nota.',
    'Pierdes aura y ni eres noticia. Tu ruina no la comenta ni quien te la ha quitado.',
    'Fallaste en algo fácil, gilipoyas, y a nadie le ha sorprendido.',
    'Bajas sin que nadie te empuje. Para hacer el gilipoyas te bastas y te sobras.',
    'Pierdes aura y ni te enteras. Vas con la cabeza metida en el culo, y así te luce.',
    'Pierdes sin pelear, sin quejarte y sin gracia. Hasta perdiendo eres un muermo.',
    'Bajas, y a nadie le importa. Tus desgracias tienen menos público que tus estados.',
    'Ni la suerte te tiene respeto: te quita y ni se despide. Qué asco de trato, muñeca.',
    'Has perdido lo justo para que nadie se entere y a ti te joda la tarde.',
    'Era lo que todos esperaban, y has cumplido. Cutre y puntual.',
    'Cuatro mierdas de aura menos y ya estás llorando por las esquinas del chat.',
    'El grupo te archivó en "recuerdos", la carpeta de cabrones que nadie abre.',
    'Tiras para ganar y acabas pagando tú. Medio grupo vive de tus tiradas.',
    'En rojo y ni un comentario. Tus cagadas ya no son noticia ni para quien te odia.',
    'El ranking ni te mira. Para moverlo tendrías que importarle a alguien, princesa.',
    'Vuelves a tirar como si el dado te debiera algo. No te debe nada, y aun así insistes.',
    'Te quitan aura por existir. Ni la pierdes haciendo algo: la pierdes por estar.',
    'Pierdes aura y el grupo contesta con un «ok». Lo que se le contesta a un estorbo.',
    'Pierdes poco, rata. Pero a quien no tenía una mierda, poco le deja temblando.',
    'Bajada pequeña, como todo lo que tú aportas a este puto grupo.',
    'Mejor no mires el saldo. El grupo ya lo ha visto y se está meando de risa a tu costa.',
    'Te creías especial y el dado te ha puesto en tu sitio: abajo del todo, con la mierda.',
    'Ni un sticker de risa te han mandado. Ya no das ni para burla, y eso es caer bajo.',
    'En rojo otra vez. Eres el chiste del grupo, y ni siquiera de los que hacen gracia.',
    'Otra en rojo, inútil. Ya no le sorprende a nadie, ni a ti.',
  ],
  spiral: [
    'Otro mínimo, pringado. Tu saldo ya no baja: se empadrona ahí abajo.',
    'Llevas tanto tiempo en la mierda que el fondo ya te cobra alquiler, muñequita.',
    'Bajo cero y hundiéndote más. Sigue cavando, que la pala no te la quita nadie.',
    'Sigues abajo y lo peor es que ahí encajas. Ese es tu puto sitio.',
    'Joder, tu historial parece un tobogán y tú sigues subiendo solo para tirarte.',
    'Vas a mirar el saldo, cagarte en todo y volver a tirar. Te conocemos de sobra.',
    'Joder, otra vez en negativo. Nadie pidió que siguieras.',
    'Solo sabes bajar, cabrón, y lo haces con unas ganas que asustan.',
    'Llevas tantas en rojo seguidas que el signo menos ya va delante de tu nombre.',
    'Otra en rojo, joder. Le echas la culpa a la suerte y la suerte te ha bloqueado.',
    'Cada tirada te hunde más y tú jurando que la próxima sale. Hay que ser imbécil.',
    'Estás en el fondo del pozo y sigues cavando con las uñas.',
    'Joder, si esto fuera un trabajo te habrían echado en la primera semana.',
    'Joder, ni el bot finge ya sorpresa. Sale tu nombre y sale el menos.',
    'Otra abajo. A este ritmo llegar a cero te va a parecer un sueño.',
    'Sueltas un «va la buena» y te vuelve a salir una mierda. Ni aprendes ni te callas.',
    'Llevas tanto en negativo que si algún día sales de ahí, el grupo lo declara festivo.',
    'Esperas suerte en rojo, joder. La suerte te ve venir y cruza de acera.',
    'En rojo y tirando otra vez, joder. La vergüenza la perdiste antes que el aura.',
    'Estás cavando y lo llamas jugar. Lo ve todo el grupo menos tú, pala en mano.',
    'Otra bajada en rojo. Mala suerte es una vez, lo tuyo ya es vicio de pringado.',
    'Rojo sobre rojo. Eres una ruina que le debe aura hasta al que nunca escribe.',
    'Nadie te va a decir que pares: verte hundirte es lo más entretenido del grupo.',
    'En negativo y bajando. Ya no hace falta reírse de ti: la cifra se descojona sola.',
    'Joder, eres el motivo de que el aura tenga números negativos.',
    'Desde el fondo has perdido otra y ya tienes el puto dedo en el botón otra vez, reina.',
    'Ibas en rojo y pides otra. Te la sirven sin mirarte a la cara, que da vergüenza.',
    'Otra hostia con las cuentas ya en rojo. Ni te has tapado.',
    'Bajabas de un saldo roto y sigues bajando. Tu fondo no tiene suelo, solo más mierda.',
    'Pierdes con el saldo ya en negativo. La hostia se ha oído en el grupo de tu familia.',
  ],
  cursed: [
    // ── Ejemplos del usuario (intocables) ──
    'Perdiste tanta mierda que el silencio posterior fue puro cringe.',
    'El aura te ha puesto de ejemplo delante del puto grupo. Todos han tomado nota.',
    'Bajaste tan fuerte que hasta tus habituales defensores se hicieron los locos, cabrón.',
    'Fue el chat recordándote, sin filtro, que sigues siendo un puto desastre.',
    'Solo quedó esa mezcla de pena y alivio de no ser tú. Qué asco de suerte la tuya.',
    // ── Reescritas y nuevas ──
    'Joder, perdiste tanto que la cifra ya no da risa.',
    'Perdiste con la elegancia de quien no sabe perder: ninguna. Y a lo grande.',
    'Sacaste un número que el puto grupo va a usar como unidad de medida del desastre.',
    'La tirada te ha dejado el saldo hecho una puta mierda, y se ve desde todo el grupo.',
    'Golpe de los gordos. Te has quedado con un saldo de risa y cara de velatorio, reina.',
    'Ni las ratas del grupo se molestan ya en robarte: no te queda ni para eso.',
    'Un «joder» se queda corto para lo que acabas de perder.',
    'Pérdida gorda. Cada vez que abras el saldo te vas a cagar en todo.',
    'La peor franja, entera para ti. Ya hay capturas para el museo de tus cagadas.',
    'Te cae el tramo gordo con tu puto nombre. El grupo lo lee de cabo a rabo.',
    'El dado ha ido a por ti y no ha fallado.',
    'Te has dado de bruces con el suelo delante de todo el puto grupo.',
    'Sales en el parte como accidente con testigos. Y los testigos se descojonan.',
    'Quien quisiera vacilarte hoy llega tarde: la cifra ya te ha jodido mejor que nadie.',
    'Del tramo grande. No hay manera digna de leer esa cifra, y es tuya.',
    'Esto no se borra. Mañana te lo citan para reírse en tu cara, y pasado otra vez.',
    'Has palmado un montón y aquí sigues, como si nada. La vergüenza no la conoces.',
    'Esta ruina queda guardada para la próxima vez que te creas alguien.',
    'Golpe de los que duelen, y el grupo entero te lo ha visto en directo.',
    'Tú das asco y pena a partes iguales.',
    'Tu saldo tiene cara de funeral y tú la de quien acaba de cagarla a lo grande.',
    'Has caído con público y sin red. Nadie te levanta: están todos grabando.',
    'Por mucho que mires la cifra, no va a cambiar: estás en la puta ruina.',
    'Has perdido tanto que llamarte gilipoyas ahora sería hasta un alivio para ti.',
    'Lo último del chat es tu ruina, y nadie tiene ninguna prisa por taparla.',
  ],
};



// Los tramos NO se ordenan. Quedaba aqui un bucle que se asignaba cada tramo a
// si mismo —resto de cuando existia ordenarPorDureza— y corria en cada arranque
// sin hacer absolutamente nada. La eleccion es plana: ver helpers.js.

// !aura top — leaderboard of accumulated aura in the group.
// El ranking lleva cooldown POR GRUPO, no por persona.
//
// EXISTE PORQUE MOLESTABA A TODOS. Es el comando mas facil de pedir y el que
// mas ocupa —once lineas con menciones—, asi que salia cada dos por tres, y
// encima cada vez notifica a los diez del top. Al que va primero le suena el
// telefono porque a otro le dio por mirar.
//
// Un cooldown por persona no lo arregla: diez personas pidiendolo una vez cada
// una son diez rankings igual. Tiene que ser del GRUPO — si acaba de salir, no
// vuelve a salir, lo pida quien lo pida y sea quien sea. Tampoco se libra el
// owner: la molestia es la misma venga de quien venga.
// Tres horas, no treinta minutos: con media hora seguian saliendo dos por hora
// y el grupo lo notaba igual. Mismo cooldown que !aura apostar.
// Lo que se contesta cuando el ranking esta en cooldown. Y NO es lo mismo para
// todos: el que esta en el top lo pide por vanidad y el que no esta lo pide por
// envidia, asi que se les responde por donde le duele a cada uno.
// Pools: src/data/cooldownPhrases.js (AURA_TOP_ANSIAS / AURA_TOP_POBRE).
const RANKING_ANSIAS = AURA_TOP_ANSIAS;
const RANKING_POBRE = AURA_TOP_POBRE;
const RANKING_COOLDOWN_MS = 3 * 60 * 60 * 1000;
const ultimoRanking = new Map();   // grupo -> ts

// Y ADEMAS: si el top no ha CAMBIADO, no se vuelve a soltar entero.
//
// El cooldown limita cada cuanto sale; esto ataca la otra mitad del problema.
// Volver a publicar once lineas y notificar a los mismos diez para enseñar
// exactamente la misma tabla no informa de nada: molesta y ya. Si nadie ha
// movido su puesto ni su saldo, se contesta en una linea y sin mencionar a
// nadie.
const huellaRanking = new Map();   // grupo -> huella del ultimo top publicado
const huellaDe = (r) => r.map((x) => `${x.jid}:${x.aura}`).join('|');

// El ultimo top que se publico, guardado tal cual para poder ENSEÑARLO durante
// el cooldown sin volver a notificar a nadie.
//
// El truco esta en las menciones: un @numero solo se convierte en mencion —y
// solo avisa al telefono— si ese JID va ademas en el array `mentions`. Si se
// escribe el mismo texto y NO se manda mentions, WhatsApp lo pinta como texto
// corriente. O sea que se puede enseñar la tabla entera sin tocarle los huevos
// a los diez del top, que era justo el problema.
const ultimoTop = new Map();       // grupo -> { filas: [{jid, aura}], ts }

// La espera, la huella y la copia del top, fuera. Lo usa el reset, y de TODOS
// los grupos: el aura es una sola, asi que el reset tambien.
function olvidarTops() {
  ultimoRanking.clear();
  huellaRanking.clear();
  ultimoTop.clear();
}

// Lo que el reset del aura limpia de este fichero (utils/reinicioEconomia.js):
// los tops, las esperas de la tirada y de la apuesta, y el aviso del objetivo.
// apuestaEnCurso NO: protege la apuesta que este en vuelo ahora mismo.
function olvidarAura() {
  olvidarTops();
  lastRoll.clear();
  ultimaApuesta.clear();
  anuncioObjetivo.clear();
}

// La copia en gris del ranking, pintada con NOMBRES.
//
// El ranking de verdad escribe "@50412345678" y adjunta el array de mentions;
// es ese array, y solo ese, el que hace que el movil sustituya el numero por el
// nombre. Pero es tambien el que vuelve a avisar a los diez del podio, que es
// justo lo que se queria cortar. Asi que en la copia no se manda: se trae el
// nombre ya escrito de nombreStore y no se pone ni una arroba, porque una
// arroba que no menciona a nadie solo sirve para enseñar un telefono.
//
// Se guardan las FILAS, no el texto ya montado: asi las cifras y las posiciones
// quedan congeladas —que es lo que se enseña, el top tal como se vio— pero el
// nombre se resuelve al pintarlo, y quien no tuviera ficha entonces y la tenga
// ahora sale con su nombre en vez de arrastrar para siempre el hueco.
// Cuando de verdad no se sabe quien es.
//
// Antes era la palabra "alguien" a secas, y con tres desconocidos seguidos la
// tabla se leia como un fallo del bot en vez de como un dato que falta. Ahora
// hay varias formas de decirlo y se elige por la identidad de la persona, no al
// azar: asi cada desconocido sale SIEMPRE con la misma etiqueta y dos consultas
// seguidas no se contradicen, que es la misma regla que sostiene toda la copia.
//
// Esto es el ultimo recurso y deberia verse cada vez menos: el nombre se anota
// ahora desde cualquier mensaje, historia o privado que el bot vea, no solo
// desde los mensajes de grupo.
const SIN_NOMBRE = [
  'alguien',
  'un fantasma',
  'uno que no habla',
  'un anónimo',
  'alguien que pasaba',
  'un desconocido',
];
function huella(txt) {
  let h = 0x811c9dc5;
  for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
function pintarTopGris(filas) {
  let t = '*RANKING DE AURA*\n\n';
  filas.forEach((f, i) => {
    const nombre = getName(f.jid) || SIN_NOMBRE[huella(canonicalJid(f.jid) || String(f.jid)) % SIN_NOMBRE.length];
    t += `*${i + 1}.* ${nombre} — ${fmt(f.aura)}\n`;
  });
  return t.trimEnd();
}

async function showRanking(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!enGrupoODueño(msg)) {   // por privado, solo el dueño principal
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }

  const desde = Date.now() - (ultimoRanking.get(jid) || 0);
  if (desde < RANKING_COOLDOWN_MS && !sinEsperaAura(msg, groupMeta)) {
    // El reloj lo pinta utils/formatoJuego.js. Aqui habia una tercera forma de
    // escribirlo ("3 h 20 min", con espacios) que no coincidia con la de robo
    // ni con la de la tirada.
    const restaTop = RANKING_COOLDOWN_MS - desde;
    // Se le pincha por donde le duele: el que ESTA en el top lo pide por
    // vanidad y el que no esta lo pide por envidia. Cuesta una lectura del
    // ranking, y solo en la rama que ya iba a rechazar la peticion.
    const quien = getSender(msg);
    let enTop = false;
    try {
      const r = soloMiembros(await getAuraRanking(), groupMeta, jid.endsWith('@g.us')).slice(0, 10);
      enTop = r.some((x) => sameUser(x.jid, quien));
    } catch { /* si falla la lectura, se usa el tono del que no sale */ }

    const pool = enTop ? RANKING_ANSIAS : RANKING_POBRE;
    // Se contesta CITANDO a quien lo pidio y sin mencionar a nadie mas: el
    // aviso es para el, no otro mensaje que le llegue al top entero.
    // Y se le enseña el ultimo top conocido, en gris: mismo texto, SIN mentions.
    const guardado = ultimoTop.get(jid);
    let copia = '';
    if (guardado && guardado.filas && guardado.filas.length) {
      // getName es sincrono porque se llama pintando la tabla, asi que el mapa
      // tiene que estar caliente antes. Normalmente ya lo esta (lo calienta el
      // primer mensaje del grupo), pero esperarlo aqui cuesta nada y quita el
      // unico caso en que la copia saldria llena de "alguien" por carrera.
      await cargarNombres().catch(() => {});
      const minutos = Math.round((Date.now() - guardado.ts) / 60000);
      const hace = minutos < 1 ? 'hace un momento'
        : minutos < 60 ? `hace ${minutos} min`
        : `hace ${Math.floor(minutos / 60)} h${minutos % 60 ? ` ${minutos % 60} min` : ''}`;
      copia = `\n\n${pintarTopGris(guardado.filas)}\n\n_Así estaba ${hace}._`;
    }

    return sock.sendMessage(jid, {
      // CABECERA QUE DICE QUE ES UN COOLDOWN. Sin ella el mensaje empieza con
      // una pulla y sigue con una tabla en gris, y desde fuera eso parece que el
      // bot simplemente ha contestado otra cosa. Que hay un tiempo de espera se
      // deducia del "Vuelve en" de la segunda linea, y no se deducia: la gente
      // volvia a pedirlo. Se dice en la primera linea y en una palabra.
      text: bloqueCooldown({
        que: 'ranking',
        frase: fraseCooldown(pool, `${jid}|top|${enTop ? 'ansias' : 'pobre'}`, 0),
        queda: restaTop,
        cola: copia,
      }),
      // SIN mentions a proposito: es lo unico que separa enseñar la tabla de
      // volver a notificar a los diez.
    }, { quoted: msg });
  }

  // Se reclama el cooldown AQUI, en sincrono, ANTES de cualquier await.
  //
  // El handler no deduplica por id de mensaje, y tanto getGroupMeta (en el
  // dispatcher) como getAuraRanking ceden el hilo: dos !aura top seguidos
  // pasaban los dos el check de arriba, esperaban el ranking y publicaban
  // DOS tablas con menciones. El cooldown existia y no frenaba el spam, que
  // es justo para lo que se invento.
  //
  // Mismo patron que !robo y la apuesta. Si al final no hay ranking que
  // enseñar, o es el mismo de siempre, se DEVUELVE: bloquear tres horas por
  // un mensaje que no salio seria el otro fallo, y un "no ha cambiado" que
  // reiniciara el reloj esconderia el top para siempre.
  if (ultimoRanking.size >= 500) ultimoRanking.delete(ultimoRanking.keys().next().value);
  ultimoRanking.set(jid, Date.now());

  // Un solo filtro: quien ya no esta en el grupo no ocupa puesto. El aura se
  // guarda para siempre y sin esto el ranking seguia coronando a gente que se
  // fue del grupo hace meses.
  //
  // AQUI EL OWNER SI SALE, por peticion expresa. Es la unica excepcion a que sea
  // invisible en las salidas automaticas, y tiene sentido: este ranking es de
  // aura, no de actividad. No dice cuanto escribe nadie ni de donde salio ese
  // saldo, asi que aparecer en el no delata ni su rango ni sus mensajes — que es
  // lo que se protege en !count, !relevancia, !vs, !inactivos y los tops al azar.
  // La lista entera se guarda: el objetivo del dia la necesita sin recortar y la
  // rehacia por su cuenta tres lineas mas abajo. Medido en un grupo de 250: 250
  // us de los 524 que costaba el comando, en construir dos veces lo mismo.
  // Por privado (solo el dueño) no hay miembros que filtrar: sale la bolsa entera.
  const rankingCompleto = soloMiembros(await getAuraRanking(), groupMeta, jid.endsWith('@g.us'));
  const ranking = rankingCompleto.slice(0, 10);
  if (ranking.length === 0) {
    ultimoRanking.delete(jid);
    return sock.sendMessage(jid, { text: 'Nadie ha medido su aura todavía. Usa *!aura*.' }, { quoted: msg });
  }

  const huella = huellaDe(ranking);
  if (huellaRanking.get(jid) === huella) {
    ultimoRanking.delete(jid);
    return sock.sendMessage(jid, {
      // La otra cara del mismo freno: aqui las tres horas YA pasaron, pero el
      // ranking es identico al que se publico, asi que repetirlo seria mandar
      // dos veces el mismo mensaje. Lleva cabecera igual que el rechazo por
      // cooldown —es la misma pregunta desde fuera, "pedi el top y no salio"—
      // pero no dice "EN COOLDOWN", que seria mentira: el reloj ya corrio.
      text: `*TOP SIN CAMBIOS*\nEl top no ha cambiado desde la última vez. Mueve algo y vuelve${apel(['princesa', 'muñeca', 'chiquitina'])}.`,
    }, { quoted: msg });
  }
  if (huellaRanking.size >= 500) huellaRanking.delete(huellaRanking.keys().next().value);
  huellaRanking.set(jid, huella);

  // La copia en gris se guarda YA, no despues de cargar nombres: un segundo
  // pedido que entre ahora en cooldown tiene que poder enseñarla. Los nombres
  // se resuelven al pintarla, no hacen falta aqui.
  if (ultimoTop.size >= 500) ultimoTop.delete(ultimoTop.keys().next().value);
  ultimoTop.set(jid, { filas: ranking.map((r) => ({ jid: r.jid, aura: r.aura })), ts: Date.now() });

  let text = '*RANKING DE AURA*\n\n';
  const mentions = [];
  let objDia = null;
  try { objDia = await objetivoDelDia(jid, groupMeta, rankingCompleto); } catch { /* el top sale igual */ }
  ranking.forEach((r, i) => {
    const marca = (objDia && esObjetivoDelDia(objDia, r.jid)) ? ' — *objetivo del día*' : '';
    text += `*${i + 1}.* @${r.jid.split('@')[0]} — ${fmt(r.aura)}${marca}\n`;
    mentions.push(r.jid);
  });
  if (objDia && objDia.jid && !ranking.some((r) => esObjetivoDelDia(objDia, r.jid))) {
    text += `\n_Hoy se caza a @${objDia.jid.split('@')[0]} — no está en el top, y robarle paga extra._`;
    mentions.push(objDia.jid);
  }
  // Tercera y ultima red para los nombres, justo donde hacen falta.
  //
  // La metadata del grupo a veces trae el nombre de cada participante, y a veces
  // no: depende de lo que mande el servidor. Cuando viene es gratis, asi que se
  // aprovecha; cuando no, no pasa nada, porque para entonces ya han pasado la
  // sincronizacion de contactos y los mensajes de cada uno.
  await cargarNombres().catch(() => {});
  // Se esperan: son unas decenas de fichas, una vez cada tres horas, y el
  // recuento de abajo tiene que verlas ya escritas o acusaria de "sin nombre" a
  // quien acaba de recibir uno en esta misma linea.
  // Igual que en la sincronizacion: solo notify. Ni p.name (libreta ajena) ni
  // p.verifiedName (nombre fiscal del rotulo Business).
  await Promise.allSettled((groupMeta?.participants || []).map((p) => (
    p?.notify && p.id ? recordName([p.id, p.jid, p.phoneNumber], p.notify) : null
  )).filter(Boolean));
  // Si aun asi queda alguien sin nombre, se dice en el log. Es la unica forma de
  // enterarse sin esperar tres horas a que caiga un cooldown y mirarlo en el
  // grupo, y siempre es el mismo sintoma: esa cuenta no ha escrito nunca y no
  // vino en la sincronizacion.
  const sinNombre = ranking.filter((r) => !getName(r.jid)).length;
  if (sinNombre) {
    logger.warn(`ranking: ${sinNombre} de ${ranking.length} del top sin nombre todavia; en la copia en gris saldran como desconocidos hasta que el bot les vea un mensaje, una historia o un privado`);
  }

  await sock.sendMessage(jid, { text: text.trimEnd(), mentions }, { quoted: msg });
}

// El texto de ayuda NO repite ni una cifra a mano.
//
// Antes las tenía escritas y se desincronizó: anunciaba "3min de espera" cuando
// el cooldown ya eran 2, y la lista de precios se quedó sin !s, !toimg ni
// !tovid al añadirlos. Un texto de ayuda que miente es peor que no tenerlo,
// porque la gente lo cree.
//
// Ahora todo sale de economia.js y de las constantes del propio fichero, así
// que cambiar un número en un sitio lo cambia aquí también. Hay un test que
// comprueba que no quede ninguna cifra a pelo.
function textoAuraInfo() {
  // LA GUIA NO ES UN MANUAL. Su trabajo es que alguien escriba su primer
  // comando, no que se entere de todo.
  //
  // La version anterior tenia cincuenta lineas: cuatro secciones, los rangos de
  // la apuesta, el punto dulce del robo, los ocho objetos con precio y horas, el
  // impuesto del regalo, la ventana del contraataque y la lista entera de
  // precios. Todo cierto y todo inutil, porque en un grupo de WhatsApp un texto
  // asi se salta entero — y encima llega plegado detras de un "Leer mas", asi
  // que la mitad ni se ve sin tocar.
  //
  // Lo que hay ahora son las PUERTAS. Ni un parametro, ni un porcentaje, ni un
  // cooldown: eso lo cuenta cada comando en el momento en que hace falta, que es
  // donde se lee. La tienda ya explica *!comprar* y *!atraco* al abrirla, y el
  // mensaje de un robo ya avisa de *!contrarobo* con los segundos que quedan.
  //
  // Por eso *!dar* y *!vault* SI estan aqui: son las dos puertas que no se
  // anuncian en ningun otro sitio, asi que fuera de la guia dejan de existir. Si
  // algun dia se anuncian solas, pueden salir.
  //
  // La caja ademas es lo unico que se puede hacer CONTRA el robo, y el robo es
  // la mitad del juego: una guia que explica como quitarle aura a otro y no como
  // proteger la tuya cuenta media partida.
  //
  // Un solo numero, y sacado de la constante: el arranque, que es lo que da la
  // escala de todo lo demas.
  return `*LA GUÍA DEL AURA*

La moneda del bot, igual en todos los grupos. Empiezas con *${fmt(ARRANQUE)}* y casi todo cuesta.

*Para tener más: escribe, y no faltes ningún día.* Es lo único que suma de verdad. Lo demás es jugártela.

*!aura* — te da o te quita, a suerte
*!robo* @alguien [cuánto] — se lo quitas
*!banco* — lo guardas; el *!robo* no llega ahí
*!robarbanco* @alguien — vas a por lo que tiene guardado
*!quienmerobo* — quién te ha robado y cuánto
*!duel* @alguien — 1v1
*!aura apostar* [cuánto] — te lo juegas
*!tienda* — te compras algo
*!dar* @alguien — le regalas

*!saldo* — lo que tienes
*!ranking* — quién va ganando

_Cada comando te explica sus reglas cuando lo usas. No hay que aprenderse nada._`;
}

// !aura [@user]  — rolls aura for the target and updates their PERSISTENT total.
// !aura top      — shows the group leaderboard.
// !aura info     — explains the full system.
// ═══════════════════════════════════════════════════════════════════════════
// !aura apostar — la mitad del saldo a una carta
// ═══════════════════════════════════════════════════════════════════════════

// Ninguno de los dos se ordena: la eleccion es plana (ver helpers.js). La
// distincion que habia escrita aqui —derrota ordenada por dureza, victoria no—
// describia un mecanismo que ya no existe. Lo que sigue siendo cierto es el
// criterio de ESCRITURA: la derrota es burla y la victoria es cronica, asi que
// medir la victoria por tacos pondria delante lo que menos pega con su tono.
const POOL_APUESTA_GANA = APUESTA_GANA;
const POOL_APUESTA_PIERDE = APUESTA_PIERDE;

const APUESTA_COOLDOWN_MS = APUESTA.cooldownMin * 60 * 1000;
const ultimaApuesta = new Map();   // `${BOLSA}|${persona}` -> ts

// Guarda contra dos apuestas simultaneas de la misma persona. Se reclama de
// forma SINCRONA, antes de cualquier await: leer el saldo y moverlo son dos
// pasos, y sin esto dos mensajes a la vez pasarian los dos la comprobacion y se
// jugarian el saldo dos veces. Mismo patron que usa el duelo al aceptar.
const apuestaEnCurso = new Set();

// Frases de rechazo. Secas: dicen el porque y nada mas. El bot no da tutoriales
// ni explica como conseguir aura.
const APUESTA_POBRE = [
  'Con esa mierda de saldo no llegas ni a la barra, cojones.',
  'Esa miseria no vale ni para limpiarme el culo, no te digo ya para apostar.',
  'La mesa tiene un mínimo, y con tu saldo de gilipoyas no llegas ni a sentarte.',
  'Con lo que tienes no apuestas, mendigas. Y aquí la caridad se la damos a quien no da tanto asco.',
  'Joder, qué vergüenza ajena da tu saldo. Vuelve cuando no seas un puto pordiosero.',
  'Aquí se apuesta con cojones, no con las migajas que te quedan.',
  'Con ese agujero de saldo lo único que arriesgas es hacer el ridículo.',
  'No hay mínimo que sobreviva a tu miseria. Larga de la mesa, muñeca.',
  'Con esa cuenta vienes a la mesa a mirar, no a jugar. Largo de aquí, que hueles a ruina.',
  'Ni la ficha más pequeña te cabe en el bolsillo. Aquí no se juega fiado.',
  'Apuestas aire. Ni para pipas te llega, y aun así te sientas a la puta mesa.',
  'La mesa te ha mirado el saldo y se ha descojonado. Luego ha seguido a lo suyo, como hace todo el mundo contigo.',
  'Vienes a apostar con la cartera en los huesos. Ni el crupier se molesta en echarte.',
  'Tu saldo no llega ni a la apuesta mínima, y tu vergüenza, por lo visto, tampoco.',
];

async function jugarApuesta(sock, msg, groupMeta, args) {
  const jid = msg.key.remoteJid;
  if (!enGrupoODueño(msg)) {   // por privado, solo el dueño principal
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }

  if (auraApagada(jid)) return avisarApagada(sock, jid, msg);

  const sender = getSender(msg);
  // La clave canonica, con el reloj de su otra forma ya dentro: si el bot
  // aprende su telefono entre dos apuestas, la espera no se estrena de cero
  // (utils/persona.js).
  const { clave } = juntarEnMapa(ultimaApuesta, clavesMapa(`${BOLSA}|`, sender));
  if (apuestaEnCurso.has(clave)) return;   // ya hay uno en vuelo
  apuestaEnCurso.add(clave);
  // Lo cobrado al sentarse y aún sin liquidar. Si algo revienta entre el cobro
  // y el pago, el finally lo devuelve: una apuesta a medias no puede costar.
  let sinLiquidar = 0;

  try {
    // Cooldown propio. Es el unico freno que necesita: encadenar apuestas arruina
    // por pura matematica (cada jugada multiplica el saldo por 1,5 o por 0,5, y
    // a 45 % eso baja solo), asi que esto no esta para prohibir nada — esta para
    // que la caida no ocurra en diez minutos.
    const ultimo = ultimaApuesta.get(clave) || 0;
    const queda = APUESTA_COOLDOWN_MS - (Date.now() - ultimo);
    if (queda > 0 && !sinEsperaAura(msg, groupMeta)) {
      return sock.sendMessage(jid, {
        text: bloqueCooldown({
          que: 'apuesta',
          frase: fraseCooldown(AURA_APOSTAR, `${clave}|apostar`),
          queda,
        }),
      }, { quoted: msg });
    }

    // Hay que tener algo que perder.
    const saldo = await getAura(jid, sender);
    if (saldo < APUESTA.minimo) {
      return sock.sendMessage(jid, {
        text: `${pickFresh(APUESTA_POBRE, `${jid}|apuesta|pobre`)}\n_Mínimo *${fmt(APUESTA.minimo)}*. Tienes *${fmt(saldo)}*._`,
      }, { quoted: msg });
    }

    // Se reclama el cooldown ANTES de mover nada.
    if (ultimaApuesta.size >= 2000) ultimaApuesta.delete(ultimaApuesta.keys().next().value);
    ultimaApuesta.set(clave, Date.now());
    const cooldownAnterior = ultimo;

    const esOwner = isOwner(sender, msg.key.fromMe, groupMeta);
    const esOwnerPrincipal = isMainOwner(sender, msg.key.fromMe, groupMeta);
    const esAdmin = !esOwner && isAdmin(groupMeta?.participants, sender);
    const rol = esOwner ? 'owner' : esAdmin ? 'admin' : 'miembro';

    // La cifra ANTES del dado. Si se tiraba primero, el % no podía depender
    // de lo pedido y *!apostar 300* era la misma ficha que *!apostar todo*.
    const parsed = parseCantidad(args);
    const jugable = Math.max(0, saldo - APUESTA.suelo);
    const topeMesa = jugable || Math.floor(saldo * APUESTA.fraccion);
    const { stake: apuesta, pedido: bruto, recortado: recortada } = resolverCantidad(parsed, {
      max: topeMesa,
      suelo: APUESTA.apuestaMin,
      porDefecto: Math.floor(saldo * APUESTA.fraccion),
    });

    // LO QUE SE PUEDE PERDER SE COBRA AL SENTARSE, Y DE GOLPE (20 oct).
    //
    // Se leía el saldo arriba y se movía al final, con dos esperas por medio
    // (el amuleto y el seguro). Si en ese hueco entraba otro comando de la
    // misma persona —un *!dar*, una compra—, la pérdida se calculaba sobre un
    // saldo que ya no existía: con 650, *!dar 400* y *!apostar* a la vez
    // dejaron −98, por debajo del suelo que la apuesta promete no cruzar.
    //
    // Ahora la parte que se arriesga se descuenta antes del dado, en el mismo
    // bloque que comprueba que llega (spendAura). Es la misma cifra que se
    // perdía antes: lo apostado, sin bajar del suelo. Si el saldo ya no llega,
    // no se juega, no se gasta el amuleto y el reloj de la apuesta vuelve atrás.
    const enJuego = Math.max(0, Math.min(apuesta, saldo - APUESTA.suelo));
    const reserva = await spendAura(jid, sender, enJuego, APUESTA.suelo);
    if (reserva.ok) sinLiquidar = enJuego;
    if (!reserva.ok) {
      if (cooldownAnterior) ultimaApuesta.set(clave, cooldownAnterior);
      else ultimaApuesta.delete(clave);
      return sock.sendMessage(jid, {
        text: `${pickFresh(APUESTA_POBRE, `${jid}|apuesta|pobre`)}\n_Mínimo *${fmt(APUESTA.minimo)}*. Tienes *${fmt(reserva.saldo)}*._`,
      }, { quoted: msg });
    }

    const fraccion = saldo > 0 ? apuesta / saldo : 0;
    // exento, no suave: el owner no se penaliza por lo que pida, igual que en
    // !robo. Con `suave` a todo o nada se le quedaba en el 50 % — cara o cruz.
    const curva = pApuestaDe(fraccion, rol, { exento: esOwnerPrincipal });
    let pReal = curva.p;
    // AL OWNER SE LE ENSEÑA LA CURVA DE UN MIEMBRO, no la suya. El 58 %
    // impreso al lado del 45 % del resto es exactamente lo que delata el
    // amaño: no hace falta contar victorias, está escrito en cada apuesta.
    let pVisible = (esOwner || esOwnerPrincipal)
      ? pApuestaVisible(fraccion)
      : curva.p;

    // AMULETO: se gasta al tirar, gane o pierda. Un objeto que solo se gastara
    // al perder seria gratis cuando funciona, y entonces no es una apuesta: es
    // un descuento.
    const conAmuleto = await tiendaObj.gastarUso(jid, sender, 'amuleto')
      .catch((e) => { logger.unaVez('aura: gastar amuleto', e); return false; });
    if (conAmuleto) {
      pReal = Math.min(0.95, pReal + OBJETOS.amuleto.bono);
      pVisible = Math.min(0.95, pVisible + OBJETOS.amuleto.bono);
    }
    const gana = esOwnerPrincipal ? ownerGana(jid, pReal, 'apuesta') : Math.random() < pReal;
    const sello = etiquetaRiesgo(fraccion);

    // El pago SUBE con lo que te juegas de lo tuyo. El acierto BAJA. Las dos
    // palancas juntas son lo que hace que 300 y todo no sean la misma ficha.
    const riesgo = saldo > 0 ? Math.min(1, apuesta / saldo / APUESTA.fraccionRiesgo) : 0;
    const mult = APUESTA.multiplicador +
      (APUESTA.multiplicadorMax - APUESTA.multiplicador) * riesgo;
    // Ganar paga lo de siempre sobre lo apostado; perder cuesta lo que ya se
    // cobró al sentarse.
    let delta = gana ? Math.round(apuesta * (mult - 1)) : -enJuego;

    // SEGURO: devuelve la mitad de lo perdido, con tope. El tope no es un
    // detalle: sin el, el seguro vale mas cuanto mas apuestas y comprarlo por
    // 600 para cubrir una apuesta de 5.000 seria ganar aura sin jugar.
    let devuelto = 0;
    if (!gana && delta < 0 && await tiendaObj.gastarUso(jid, sender, 'seguro')
      .catch((e) => { logger.unaVez('aura: gastar seguro', e); return false; })) {
      devuelto = Math.min(
        Math.round(Math.abs(delta) * OBJETOS.seguro.recupera),
        OBJETOS.seguro.topeDevuelto,
      );
      delta += devuelto;
    }

    // Lo cobrado al sentarse vuelve si gana, junto con el premio; si pierde,
    // solo vuelve lo que devuelva el seguro.
    const vuelve = delta + enJuego;
    const current = vuelve > 0 ? (await addAura(jid, sender, vuelve)).current : reserva.current;
    sinLiquidar = 0;

    // Perder en la mesa alimenta el bote del robo. Una cuarta parte, no más: el
    // grueso se sigue destruyendo, que es lo que hace de esto un sumidero. Pero
    // asi el bote crece aunque el grupo no robe, y una apuesta gorda perdida se
    // convierte en algo que todos van a querer reventar.
    let alBote = 0;
    //
    // El aura se vuelca ANTES: el bote vive en robo.json, que se guarda antes
    // que aura.json, y un corte en medio dejaria el bote cobrado y la perdida
    // sin apuntar. Aura inventada.
    if (!gana && delta < 0) {
      await flushAura().catch(() => {});
      alBote = await aportarAlBote(jid, Math.abs(delta) * BOTE.fraccionDeApuesta);
    }

    const nm = `@${sender.split('@')[0]}`;
    const frase = pickFresh(gana ? POOL_APUESTA_GANA : POOL_APUESTA_PIERDE, `${jid}|apuesta|${gana ? 'gana' : 'pierde'}`)
      .replace(/%A/g, nm)
      .replace(/%C/g, fmt(apuesta))
      .replace(/%S/g, fmt(current));

    const text =
      `*APUESTA — ${gana ? 'GANA' : 'PIERDE'}*\n` +
      `\n` +
      `${nm} puso *${fmt(apuesta)}* sobre la mesa.` +
      (recortada ? `\n_Ibas a por ${fmt(bruto)}, pero es todo lo que puedes cubrir._` : '') +
      `\n_${Math.round(pVisible * 100)}% de salir · ×${mult.toFixed(2)} si gana${sello ? ` · ${sello}` : ''}._` +
      // Los objetos se DICEN. Un amuleto que actua en silencio es aura tirada:
      // el jugador no sabe si le sirvio de algo y no vuelve a comprarlo.
      (conAmuleto ? `\n_El amuleto se gastó: tiraste con un ${Math.round(OBJETOS.amuleto.bono * 100)} % más de suerte._` : '') +
      (devuelto ? `\n_El seguro te devuelve *${fmt(devuelto)}* de lo perdido._` : '') +
      `\n\n` +
      `${frase}\n\n` +
      // Era la unica linea de movimiento SIN nombre delante, en un mensaje que
      // si lo lleva arriba. Ahora la escribe el mismo sitio que las demas.
      `${lineaAura(nm, gana ? Math.abs(delta) : -Math.abs(delta), current)}` +
      (alBote ? `\n_Una parte de lo que soltaste ha ido al bote del grupo, que sube a *${fmt(alBote)}*. Alguien se lo va a llevar y no vas a ser tú._` : '');

    return sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: msg });
  } finally {
    if (sinLiquidar > 0) {
      await addAura(jid, sender, sinLiquidar).catch((e) => logger.unaVez('aura: devolver una apuesta a medias', e));
    }
    apuestaEnCurso.delete(clave);
  }
}

// !aura on / !aura off — congela o reanuda el juego en este grupo.
//
// Apaga tirar, apostar, robar, el duelo y dar. NO toca los saldos, el ranking
// ni los precios de los comandos: es una pausa, no un reset. Por eso el aviso
// dice explicitamente que el aura de cada uno sigue donde estaba — si no, el
// grupo entero da por hecho que le han borrado el marcador.
async function interruptor(sock, msg, sub, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: avisoPermiso(jid, sender, groupMeta) }, { quoted: msg });
  }

  const encender = sub === 'on' || sub === 'encender';
  await toggleAura(jid, encender);
  reiniciarAviso(jid);

  return sock.sendMessage(jid, {
    text: encender
      ? 'Dinámica de aura *reanudada*. Se puede volver a tirar, apostar, robar y batirse en duelo.'
      : 'Dinámica de aura *en pausa*. Nadie puede tirar, apostar, robar, batirse en duelo ni dar aura.\n\n' +
        '_Los saldos no se tocan y se siguen ganando escribiendo. *!ranking* y *!aura @user* siguen funcionando._',
  }, { quoted: msg });
}

async function cmdAura(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;

  const sub = (args && args[0] ? args[0] : '').toLowerCase();

  // El aura se juega EN LOS GRUPOS (es la misma en todos, ver auraStore), asi
  // que fuera de un grupo no se juega.
  //
  // Antes se podia tirar por privado y funcionaba: el saldo se guardaba bajo el
  // JID del chat privado, o sea una cartera aparte que no sale en ningun
  // ranking, que nadie puede robar y con la que no se compra nada donde
  // importa. No era un agujero —ese aura no llega al grupo— pero si un sitio
  // donde gastar el cooldown a cambio de nada.
  //
  // Ademas era incoherente: !dar y !roast ya contestaban "Solo en grupos" y
  // este no, siendo los tres del mismo sistema.
  //
  // La GUIA si pasa: es texto y leerla por privado sin gastarle el chat a nadie
  // es justo para lo que sirve.
  // UNA SOLA LISTA, y hacia falta: habia dos y no decian lo mismo. Esta dejaba
  // pasar 'guia' y 'guía' por privado, pero la de mas abajo —la que DESPACHA la
  // guia— no los llevaba. Resultado: quien escribia *!aura guia*, que es lo
  // natural, no recibia la guia sino una TIRADA, y encima se le gastaba el
  // cooldown. Por privado era peor todavia: pasaba el filtro de grupo y caia en
  // la tirada, que es justo lo que ese filtro existe para impedir.
  //
  // Se salvo solo porque el atajo *!guia* del dispatcher traduce a 'info'.
  const SUBS_GUIA = ['info', 'help', 'ayuda', 'como', 'cómo', '?', 'guia', 'guía'];
  const esGuia = SUBS_GUIA.includes(sub);
  // Al dueño principal se le deja jugar por privado (11 nov): es la misma aura.
  if (!enGrupoODueño(msg) && !esGuia) {
    return sock.sendMessage(jid, {
      text: 'El aura se juega en los grupos, no por privado. Es la misma en todos.\n_Para saber cómo va: *!aura info*_',
    }, { quoted: msg });
  }

  // El interruptor va lo primero: si no, con la dinamica apagada no habria
  // forma de volver a encenderla desde el propio comando.
  if (['on', 'off', 'encender', 'apagar'].includes(sub)) {
    return interruptor(sock, msg, sub, groupMeta);
  }

  if (['top', 'rank', 'ranking', 'leaderboard', 'auratop'].includes(sub)) {
    return showRanking(sock, msg, groupMeta);
  }
  if (esGuia) {
    return sock.sendMessage(jid, { text: textoAuraInfo() }, { quoted: msg });
  }
  // Progreso diario. Vive en social.js (cmdCasino) y se expone aquí como
  // "!aura hoy" porque es aura, no un casino aparte. !casino sigue valiendo.
  // MIRAR TU PROPIO SALDO SIN JUGARTELO.
  //
  // No existia. *!aura* a secas TIRA —te juegas el aura— y *!aura @alguien* lee
  // el de otro, pero no habia forma de ver el tuyo sin apostar. Por eso *!saldo*
  // y *!miaura* estaban enchufados a *!aura hoy*, que enseña mensajes del dia y
  // racha: dos comandos que se llaman "saldo" y no enseñaban ningun saldo.
  //
  // Va ANTES del bloqueo por *!aura off* y antes del cooldown a proposito:
  // consultar un numero no es jugar, y no tiene por que estar sujeto a los
  // frenos de la tirada.
  if (['saldo', 'miaura', 'mi'].includes(sub)) {
    // `sender` se declara mas abajo en esta funcion, asi que aqui todavia esta
    // en su zona muerta: leerlo revienta con "Cannot access 'sender' before
    // initialization". Se resuelve aparte.
    // Y LO DEL BANCO TAMBIEN (dueño, 21 oct): el saldo a secas escondia la
    // mitad de lo que tiene quien lo guarda casi todo.
    const quien = getSender(msg);
    const [mio, guardado] = await Promise.all([getAura(jid, quien), verCaja(jid, quien)]);
    return sock.sendMessage(jid, {
      text: `Tienes *${fmt(mio)}* de aura a la vista y *${fmt(guardado)}* en el banco${apel(['pequeña', 'gatita', 'muñequita', 'princesa', 'reina', 'cosita'])}.`,
    }, { quoted: msg });
  }

  if (['hoy', 'today', 'dia', 'día', 'diario'].includes(sub)) {
    const { cmdCasino } = require('./social');
    // groupMeta va SIEMPRE: es lo que le permite reconocer al owner principal
    // para no contestarle. Sin ella la comprobacion falla en grupos LID y le
    // saldria el "Mensajes hoy: 0" que lo delata.
    return cmdCasino(sock, msg, groupMeta);
  }
  // "allin" se conserva como alias porque el comando se llamo asi un dia, pero
  // el nombre bueno es apostar: pone la MITAD del saldo, no todo.
  // El nombre bueno es *apostar*. Los demas se conservan como alias porque el
  // comando ya se llamo asi antes y no tiene sentido romperle el habito a nadie
  // por un cambio de nombre.
  if (['apostar', 'apuesta', 'mitad', 'x2', 'ordago', 'órdago', 'allin', 'all-in', 'todo', 'mesa'].includes(sub)) {
    // slice(1): el subcomando no es la cifra. Sin esto *!aura todo* (atajo de
    // la mesa) se leía como "me juego el saldo entero", que es justo lo que
    // el alias existía para no hacer — la mesa pone la mitad si no pides.
    return jugarApuesta(sock, msg, groupMeta, (args || []).slice(1));
  }
  // !aura robar @alguien 200. Sin esto, *!aura robar* CAIA EN LA CONSULTA DE
  // SALDO: sub='robar' no era un modo conocido, habia mencion, y el bot
  // contestaba "Fulano tiene 430 de aura" en vez de robarle. Quien lo escribe
  // piensa que el comando no deja elegir cantidad porque no esta robando nada.
  if (['robar', 'robo'].includes(sub)) {
    if (auraApagada(jid)) return avisarApagada(sock, jid, msg);
    const { cmdRobo } = require('./robo');
    return cmdRobo(sock, msg, (args || []).slice(1), groupMeta);
  }

  const sender = getSender(msg);

  // El aura es como una moneda: solo el dueño la juega. !aura @alguien es solo
  // una CONSULTA del aura de esa persona — no tira, no gasta cooldown y no
  // modifica nada. Tirar (subir/bajar) siempre es sobre uno mismo.
  // Por privado no hay menciones: el dueño nombra por número (*!aura 573001234567*).
  const mentioned = getTarget(msg) || (dueñoEnPrivado(msg) ? numeroEnArgs(args).jid : null);
  if (mentioned && !sameUser(mentioned, sender)) {
    const [aura, guardado] = await Promise.all([getAura(jid, mentioned), verCaja(jid, mentioned)]);
    return sock.sendMessage(jid, {
      text: `*@${mentioned.split('@')[0]}* tiene *${fmt(aura)}* de aura a la vista y *${fmt(guardado)}* en el banco.`,
      mentions: [mentioned],
    }, { quoted: msg });
  }

  // La tirada se bloquea AQUI, despues de la consulta: !aura @alguien solo lee
  // un numero y no hace ruido, asi que apagar la dinamica no tiene por que
  // dejar el marcador a oscuras.
  if (auraApagada(jid)) return avisarApagada(sock, jid, msg);

  // Con las dos formas de la persona juntas, igual que la apuesta.
  const { clave: coolKey, valor: last = 0 } = juntarEnMapa(lastRoll, clavesMapa(`${BOLSA}|`, sender));
  const remaining = ROLL_COOLDOWN_MS - (Date.now() - last);
  if (remaining > 0 && !sinEsperaAura(msg, groupMeta)) {
    return sock.sendMessage(jid, {
      text: bloqueCooldown({
        que: 'tirada',
        frase: fraseCooldown(AURA_TIRADA, `${coolKey}|tirada`),
        queda: remaining,
      }),
    }, { quoted: msg });
  }
  // Aqui hubo un tope de doce tiradas al dia. Se quito: un contador que se agota
  // convierte el comando en mirar un numero en vez de jugar. El freno real es
  // el cooldown más TIRADAS_PAGADAS (después, EV cero).
  // Se puede tirar todo lo que se quiera; lo que ya no se puede es imprimir.
  if (lastRoll.size >= 2000) lastRoll.delete(lastRoll.keys().next().value);
  lastRoll.set(coolKey, Date.now());

  // The roll is rigged by the SENDER's own role — you only ever play your own aura.
  const selfIsOwner = isOwner(sender, msg.key.fromMe, groupMeta);
  const selfIsAdmin = isAdmin(groupMeta?.participants, sender);

  // Empujon por actividad: el bot mira el contador de !count del que tira. A
  // partir del umbral la tirada sale positiva algo mas a menudo. Es un plus
  // pequeno y no garantiza nada — el resultado sigue siendo aleatorio.
  let plusActividad = 0;
  let mensajes = 0;
  let tiradasHoy = 1;
  const esOwnerPrincipal = isMainOwner(sender, msg.key.fromMe, groupMeta);
  const paralelos = [];
  if (esOwnerPrincipal) {
    // Al owner principal el contador no le cuenta los mensajes (es lo que lo
    // mantiene fuera de !count y de los tops), así que preguntarle al contador
    // siempre devolvía 0 y era el único del grupo que jamás podía cobrar el plus
    // por actividad — castigado justo por el mecanismo que lo protege. Se le da
    // el TOPE directamente: de todo el grupo es quien más escribe.
    plusActividad = ACTIVIDAD_TOPE;
  } else {
    paralelos.push(
      getUserCount(jid, sender)
        .then((n) => {
          mensajes = n;
          // Acumulativo: un escalón por cada ACTIVIDAD_MSGS, con tope. Antes era un
          // interruptor de sí/no y el que llevaba 40.000 mensajes iba igual que el
          // que acababa de pasar de 1.000.
          plusActividad = bonoActividad(n);
        })
        .catch(() => { /* si el contador falla, se tira sin plus */ }),
    );
  }

  // ¿Esta tirada cobra? Las primeras TIRADAS_PAGADAS del día pagan de verdad;
  // de ahí en adelante la tirada sigue funcionando pero es cara o cruz a valor
  // esperado cero. Es lo que permite que las de arriba paguen bien sin que
  // nadie pueda fabricar aura dándole al botón toda la noche.
  //
  // Si el contador falla se cobra: preferimos regalar una tirada a bloquear el
  // comando por un problema de disco.
  paralelos.push(
    contarTirada(jid, sender)
      .then((n) => { tiradasHoy = n; })
      .catch(() => { /* se cobra */ }),
  );
  await Promise.all(paralelos);
  const dePago = tiradasHoy <= TIRADAS_PAGADAS;

  // La otra puerta habla. Un golpe maestro de !robo calienta esta tirada; un
  // desastre te deja tilt. Al owner se le ENSEÑA y no se le aplica: su dado
  // ya viene amañado, y restarle 4 % de verdad mientras el mensaje dice tilt
  // es el único sitio donde el amaño jugaría EN CONTRA. El grupo ve la línea
  // igual que a cualquiera.
  const mom = momentum.consumir(jid, sender, 'aura');
  let plusSuerte = plusActividad;
  if (mom && !esOwnerPrincipal) {
    plusSuerte += mom.tipo === 'caliente' ? MOMENTUM.caliente : MOMENTUM.tilt;
  }

  let { tier, amount } = rollAura(selfIsOwner, selfIsAdmin, plusSuerte, dePago);

  if (tier === 'blessed') momentum.anotar(jid, sender, 'caliente', 'robo');
  else if (tier === 'cursed') momentum.anotar(jid, sender, 'tilt', 'robo');

  // VETERANIA: mas aura cuando ganas, segun lo escrito en total.
  //
  // La otra veterania —la que sube la probabilidad— se agota contra P_TOPE a los
  // ~1.700 mensajes, asi que a partir de ahi escribir no daba NADA en un bot
  // cuya unica progresion es escribir. El tope no se toca (esta ahi para que
  // ningun miembro alcance a un admin), asi que la veterania se paga en cantidad.
  // Solo toca lo GANADO: no reduce el castigo al perder.

  // El owner COBRA el tope, como el bono de actividad y por el mismo motivo: su
  // contador esta en cero por diseño, asi que calcularlo sobre sus mensajes lo
  // dejaria sin nada. Lo que NO pasa es que se le enseñe (ver la linea de abajo).
  const vet = esOwnerPrincipal ? VETERANIA_TOPE : bonoVeterania(mensajes);
  let extraVet = 0;
  if (amount > 0 && vet > 0) {
    extraVet = Math.round(amount * vet);
    amount += extraVet;
  }
  // `sign` vivia aqui y lo usaba el titulo de la tirada. Lo pinta ahora
  // lineaAura, con el menos de verdad y no con un guion.
  // AL OWNER NO SE LE ENSEÑA ESTA LINEA. NUNCA, y tampoco inventada.
  //
  // Llegue a fabricarle un recuento creible para que le saliera como a todos,
  // con el argumento de que la ausencia tambien es una señal. El argumento es
  // malo aqui, y es el mismo por el que !aura hoy se calla: esta linea ES el
  // contador de mensajes. Inventarle una cifra es publicar un dato sobre su
  // actividad — justo lo que el contador existe para no publicar — y ademas
  // abre la puerta a que ese numero contradiga a cualquier otro sitio.
  //
  // Y la ausencia no lo señala: la linea solo sale pasando el umbral de
  // actividad, cosa que la mayoria del grupo no hace nunca. Que a el no le
  // salga lo deja igual que a cualquiera que no llego, que es el caso normal.
  //
  // Los bonos SI los cobra, los dos al tope. Lo que se quita es el anuncio.
  const lineaVeterano = esOwnerPrincipal || !(plusActividad || extraVet)
    ? ''
    : `Veterano (${fmt(mensajes)} msgs):` +
      (plusActividad ? ` +${Math.round(plusActividad * 100)}% de suerte` : '') +
      (plusActividad && extraVet ? ' ·' : '') +
      (extraVet ? ` +${Math.round(vet * 100)}% de botín (+${fmt(extraVet)})` : '');

  const { previous, current } = await addAura(jid, sender, amount);

  // Already in the red and going deeper: use spiral phrases
  // La subida pequeña se parte por lo que tiene DESPUES de cobrar: el chiste va
  // sobre su economia. Por debajo de UMBRAL_RICO es un muerto de hambre; por
  // encima, un rico de bot de WhatsApp. Se mira el saldo de despues porque es
  // el que sale en la primera linea del mensaje: si el chiste llamara pobre a
  // alguien que ve 1.600 justo encima, la frase se contradice sola.
  let effectiveTier = (previous < 0 && amount < 0) ? 'spiral' : tier;
  if (effectiveTier === 'gain') effectiveTier = current >= UMBRAL_RICO ? 'gainRico' : 'gainPobre';

  const pct = (x) => Math.round(Math.abs(x) * 100);
  let extraPuerta = '';
  if (mom) {
    extraPuerta += mom.tipo === 'caliente'
      ? `\n_Vienes de un golpe: esta tirada llevaba un +${pct(MOMENTUM.caliente)}%._`
      : `\n_Vienes tilt: esta tirada llevaba un −${pct(MOMENTUM.tilt)}%._`;
  }
  if (tier === 'blessed') {
    extraPuerta += `\n_Caliente. El próximo *!robo* (10 min) lleva un +${pct(MOMENTUM.caliente)}%._`;
  } else if (tier === 'cursed') {
    extraPuerta += `\n_Tilt. El próximo *!robo* (10 min) te resta un ${pct(MOMENTUM.tilt)}%._`;
  }

  let extraObjetivo = '';
  let mentions = [sender];
  try {
    const obj = await objetivoDelDia(jid, groupMeta);
    if (obj && obj.jid) {
      const paga = Math.round(obj.bonoBotin * 100);
      if (sameUser(obj.jid, sender)) {
        extraObjetivo = `\n_Hoy te toca a ti: quien te robe cobra un ${paga}% más._`;
      } else {
        // Se anuncia siempre, se MENCIONA una vez al día. Mentions en cada
        // tirada es el mismo fallo que tenía !aura top: el cazado se entera
        // veinte veces y el grupo también. Después se pinta el nombre, no el
        // teléfono crudo.
        const pagaTxt = `robarle paga un ${paga}% más`;
        const hoy = diaClave();
        if (anuncioObjetivo.get(jid) !== hoy) {
          if (anuncioObjetivo.size >= 500) anuncioObjetivo.delete(anuncioObjetivo.keys().next().value);
          anuncioObjetivo.set(jid, hoy);
          mentions.push(obj.jid);
          extraObjetivo = `\n_Hoy se caza a @${obj.jid.split('@')[0]}: ${pagaTxt}._`;
        } else {
          const nombre = getName(obj.jid);
          // Sin nombre, la @ va con su mención: un @número sin ella es texto
          // muerto. Salía en la segunda tirada del día, y las tiradas seguidas
          // del dueño (sin espera desde el 11 nov) lo destaparon.
          if (!nombre) mentions.push(obj.jid);
          extraObjetivo = nombre
            ? `\n_Hoy se caza a *${nombre}*: ${pagaTxt}._`
            : `\n_Hoy se caza a @${obj.jid.split('@')[0]}: ${pagaTxt}._`;
        }
      }
    }
  } catch { /* sin objetivo el comando sigue; no es un dato sin el que no se tire */ }

  const text =
    // La tirada partia el movimiento en dos: el cambio en el titulo («+200 de
    // aura») y el total cuatro lineas mas abajo («Aura total: 3.350»). Es la
    // misma informacion que el resto de comandos dan en una linea, y el que
    // tira veinte veces al dia la lee veinte veces en dos sitios distintos.
    // Ahora va junta, arriba y en negrita: cuanto y con que te quedas.
    `${lineaAura(`@${sender.split('@')[0]}`, amount, current, { negrita: true })}\n` +
    `${pickFresh(AURA[effectiveTier], `${jid}|aura|${effectiveTier}`)}` +
    // Se DICE: un bono invisible no premia a nadie. El veterano no sabria que
    // cobra de mas y el que empieza no sabria que hay algo que perseguir.

    // La línea del bono se enseña a TODOS MENOS AL OWNER PRINCIPAL.
    //
    // Con él era el peor sitio posible para ponerla: sus mensajes no se cuentan
    // (por eso salía "0 msgs") pero el bono sí lo tiene, así que la línea
    // anunciaba justo la contradicción que lo delata.
    //
    // Y quitársela solo a él no lo señala, que era la duda: la línea únicamente
    // aparece si superas los 1.000 mensajes del día, cosa que la mayoría del
    // grupo no hace nunca. Que a él no le salga lo deja igual que a cualquiera
    // que no llegó al umbral, que es el caso normal y no llama la atención.
    // UNA sola linea de veterano, con las dos ventajas juntas.
    //
    // Al anyadir el bono a la cantidad quedaron dos lineas seguidas diciendo
    // "Veterano" con numeros distintos, y eso no se lee como un premio: se lee
    // como que el bot se ha repetido.
    // Al owner se le enseña la linea igual que a cualquiera, pero con un
    // recuento FALSO. Quitarsela era la version anterior y tambien es una
    // señal: el bono lo tiene (se le da el tope directamente, arriba), asi que
    // si a todos los que cobran bono les sale una linea y a el nunca, la
    // ausencia dice lo mismo que diria el cero. Ver utils/fachada.js.
    (lineaVeterano ? `\n_${lineaVeterano}_` : '') +
    extraPuerta +
    extraObjetivo;

  await sock.sendMessage(jid, { text, mentions }, { quoted: msg });
}

// *!resetaura* — el marcador de todo el mundo, al suelo. Solo el tier dueño y
// solo desde un grupo. Desde que el aura es la misma en todos los grupos, el
// reset tambien: pone al suelo a la gente de todos, no solo a la de este.
//
// "DESDE CERO" ERA MENTIRA. resetAura deja a todo el mundo en el suelo, no en
// cero, y por una razon buena que esta escrita alli: con el grupo a cero nadie
// puede gastar y el bot se queda muerto hasta que cada uno vuelva a tirar. Lo
// que estaba mal era el aviso, no el comportamiento — y la cifra se saca de la
// constante para que no se vuelva a separar de ella.
async function cmdResetAura(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!isOwner(getSender(msg), msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: avisoPermiso(jid, getSender(msg), groupMeta) }, { quoted: msg });
  }
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }
  // TODA LA ECONOMIA, NO SOLO LOS SALDOS. Lo pidio el dueño: la tienda, el
  // bote, los buscados, los tops, la diana del dia y las esperas se van con el
  // aura. La lista entera vive en utils/reinicioEconomia.js.
  //
  // Y el top tambien empieza de cero, que ya lo pidio antes: tras un reset, la
  // espera de tres horas del *!aura top* seguia contando y la copia en gris
  // enseñaba el top de antes como si siguiera valiendo.
  await resetearEconomia();
  return sock.sendMessage(jid, {
    text: `Aura de todos reseteada, en todos los grupos. El marcador vuelve a *${SUELO_TODOS}* para todo el mundo.\n` +
      '_Con ella se van la tienda (objetos, caja y bote), los buscados y sus recompensas, los tops, la diana del día y las esperas._',
  }, { quoted: msg });
}

module.exports = { cmdAura, cmdResetAura, olvidarAura, _olvidarTop: olvidarTops };
