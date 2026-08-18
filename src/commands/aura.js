const { isOwner, isMainOwner, isAdmin, getTarget, getSender, canonicalJid, sameUser, soloMiembros } = require('../utils/wa');
const { pickFresh, fmt } = require('../utils/helpers');
const { getAura, addAura, getAuraRanking } = require('../utils/auraStore');
const { getUserCount } = require('../utils/messageCounter');
const { contarTirada } = require('../utils/casinoStore');
const { TIRADA, P_POSITIVA, ACTIVIDAD_MSGS, ACTIVIDAD_BONO, ACTIVIDAD_TOPE, P_TOPE, MULT_CASTIGO, MULT_CASTIGO_GRANDE, P_TRAMO_GRANDE, TIRADAS_PAGADAS, bonoActividad, bonoVeterania, APUESTA, PRECIOS, ARRANQUE, MILLONARIO, rango } = require('../utils/economia');
const { APUESTA_GANA, APUESTA_PIERDE } = require('../data/apuestaPhrases');
const { auraApagada, avisarApagada, toggleAura, reiniciarAviso } = require('../utils/auraSwitch');
const { BOTE, CONTRA, RACHA, RIESGO, OBJETOS } = require('../utils/economia');
const { aportarAlBote } = require('../utils/roboStore');
const tiendaObj = require('../utils/roboStore');

// QUINCE MINUTOS, subido desde minuto y medio por decision del owner.
//
// Va en el mismo paquete que subir el acierto al 70 % y capar los importes
// (50 de techo al ganar, 40 al perder): menos tiradas, mas seguidas de ganar y
// mas pequeñas. La tirada pasa de ser algo que se machaca mientras se habla a
// ser algo que se mira de vez en cuando.
//
// El efecto practico esta en las tiradas de pago: con minuto y medio las cinco
// que cobran se agotaban en menos de diez minutos y el resto del dia se tiraba
// a valor cero. Con quince minutos cubren mas de una hora, asi que la parte del
// comando que paga de verdad dura lo que dura una conversacion.
const ROLL_COOLDOWN_MS = 10 * 60 * 1000;
const lastRoll = new Map(); // `${groupJid}|${canonicalJid}` -> timestamp

// Duracion en texto. Existe porque redondear a minutos miente con los tiempos
// cortos: minuto y medio salia como "2min" y una espera de 20 segundos tambien.
// Por debajo del minuto se dan segundos, y si hay minutos y sobran segundos se
// dicen los dos.
function duracion(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const seg = total % 60;
  if (!m) return `${seg}s`;
  if (!seg) return `${m}min`;
  return `${m}min ${seg}s`;
}

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
  const grande  = () => rango([TIRADA.grande[0],  TIRADA.grande[1]  - TIRADA.grande[0]]);
  const pequena = () => rango([TIRADA.pequena[0], TIRADA.pequena[1] - TIRADA.pequena[0]]);
  const premio  = () => (Math.random() < 0.34 ? grande() : pequena());

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
  // llega como mucho al 80 y la base de un admin ya es 82, asi que ni el mas
  // veterano alcanza a un admin recien nombrado. Lo mismo entre admin y owner.
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


const AURA = {
  blessed: [
    // ── Ejemplos del usuario (intocables) ──
    'El chat se quedó en silencio de verdad. Nadie sabía cómo quitarte el respeto que acabas de ganar.',
    'Por una vez no fuiste el chiste del grupo. Les costó admitirlo, pero tuvieron que mirarte diferente.',
    'Sacaste un número que obligó a esta gente a tragar saliva. Algunos todavía lo están digiriendo.',
    'El silencio después de tu tirada pesó más que cualquier comentario. Hasta los más cínicos se tuvieron que callar.',
    'Hoy el aura del grupo se inclinó hacia ti. Raro, incómodo y bien merecido. No te acostumbres.',
    // ── Generadas ──
    'Entraste sin hacer ruido y saliste con todo el grupo callado. Eso no pasa dos veces.',
    'Nadie comentó nada después de tu tirada. Ese silencio fue el mejor resultado posible.',
    'El grupo entero miró el número y cambió de tema. Cuando nadie sabe qué decir, es que ganaste de verdad.',
    'Hoy te tocó estar arriba y el grupo lo asumió sin gracia ninguna. Les jodió, y se notó.',
    'La mesa se quedó quieta un segundo. Un segundo real, no de cortesía. Eso es peso.',
    'Ganaste tan limpio que nadie pudo decir ni una puta cosa. Y eso aquí no pasa nunca.',
    'El chat se frenó. No por respeto, por sorpresa. Y la sorpresa era que tú hiciste algo bien.',
    'Nadie quiso ser el primero en hablar después de tu tirada. Ese miedo es tu mejor trofeo.',
    'Te miraron distinto. Solo un segundo, pero ese segundo ya no te lo quitan, cabrón.',
    'Ganaste y la sala se enfrió. Eso pasa cuando alguien que no debería ganar gana así de bien.',
    'El grupo tuvo que tragarse lo que estaba preparando. Les cambiaste el puto guion en un turno.',
    'Hoy no hubo debate. El número habló y el chat obedeció. Primera vez que pasa contigo.',
    'Nadie te felicitó y eso es lo mejor que te ha pasado. La envidia muda es el premio gordo.',
    'Sacaste algo tan grande que hasta los que te odian tuvieron que cerrar la boca. Y les dolió.',
    'Hoy te ganaste algo que no se compra: que esta gente se quedara sin palabras por tu culpa.',
    'Esa tirada hizo ruido en un chat que lleva semanas riéndose de ti. Ahora no se ríen, joder.',
    'Ganaste con una frialdad que no te conocían. El chat lo notó y no supo cómo cojones reaccionar.',
    'El grupo entero cambió de actitud por una tirada. Una. Y era tuya. Eso no se repite pronto.',
    'Nadie dijo "bien jugado" porque les habría dolido admitirlo. Ahí está la puta diferencia.',
    'Hoy tu tirada mandó callar a gente que lleva meses hablando de más. Servicio público.',
    'Sacaste algo tan alto que hasta tú te sorprendiste. El grupo más, pero tú también.',
    'Hoy fuiste el nombre que nadie quiso mencionar después. Eso es respeto del que duele.',
    'Ganaste y el ambiente se cortó. No de la buena manera, de la incómoda. Esa es la buena.',
    'Nadie se atrevió a bromear después de tu tirada. Esa cobardía colectiva es tu medalla.',
    'Tu tirada dejó un vacío en el chat que nadie quiso llenar. Ni con broma ni con nada.',
    'El grupo se la tuvo que tragar entera. Sin excusas, sin matices, sin puta alternativa.',
    'Ganaste de una forma que hizo que tres personas cerraran la app un momento. Eso es poder.',
    'Hoy el chat te respetó sin querer. Y sin querer es la única forma válida de respeto aquí.',
    'El silencio posterior duró más de lo normal. Ese tiempo extra es todo mérito tuyo.',
    'Nadie se rio. Nadie comentó. Nadie respiró fuerte. Eso solo pasa cuando ganas de verdad.',
    'Hoy el grupo tuvo que admitir algo que le costaba: que por un momento mandabas tú.',
    'Tu tirada fue como un portazo. Todo el mundo lo oyó y nadie fue a preguntar qué coño pasó.',
    'El chat se detuvo. No por educación, sino porque no tenían nada que decir que no les dejara peor.',
    'Ganaste tan fuerte que hasta la broma que alguien estaba escribiendo se quedó a medias.',
    'Ese resultado fue una bofetada silenciosa a todos los que te subestimaban. Se la comieron entera.',
    'Hoy ganaste con la naturalidad de quien no necesita ganar. Y eso fue lo que más jodió al grupo.',
    'Tu tirada dejó tres conversaciones a medias. Nadie quiso seguir hablando con tu número en pantalla.',
    'Ganaste y nadie pudo hacer el chiste fácil. Cuando el chiste no sale, es que el resultado impone.',
    'Hoy te tocó ser el que manda y el chat se reajustó en silencio. Como tiene que ser, cojones.',
    'Sacaste algo tan alto que la primera reacción del grupo fue comprobar si era real. Lo era.',
    'Nadie quiso felicitarte porque habría sonado a capitulación. Y nadie aquí capitula fácil.',
    'Hoy dejaste al chat sin herramientas. Sin broma, sin ironía, sin salida. Solo tu número y su puta cara.',
    'Tu resultado fue un corte limpio. El grupo lo sintió, se calló y siguió como si nada. Pero lo sintió.',
    'Ganaste con una cara que ninguno de estos quiere recordar mañana. Pero la van a recordar.',
    'Hoy hiciste algo que nadie va a admitir que vio: ganar de forma que les cerró la boca a todos.',
    'Sacaste un número que convirtió al grupo en público. Ellos mirando y tú siendo lo único que importaba.',
    'Tu tirada hizo que dos personas borrasen lo que estaban escribiendo. Ese es el mejor cumplido del chat.',
    'Ganaste y ni una sola persona tuvo los huevos de hacer un comentario. Eso es aura.',
    'El grupo se quedó sin repertorio. Todo lo que habían preparado para burlarse se les quedó en la garganta.',
    'Hoy tu resultado fue el protagonista. Y el chat, por primera vez en mucho tiempo, fue el público.',
    'El silencio fue tan denso que se podía cortar. Nadie cortó porque nadie quería ser el primero.',
    'Ganaste de una manera que hizo que el grupo se sintiese gilipollas por haberte subestimado.',
    'Hoy el chat aprendió que los resultados no avisan. Y el tuyo fue una hostia que nadie vio venir.',
    'Tu tirada cayó como un jarro de agua fría en un grupo que se creía a salvo. No lo estaban.',
    'Nadie escribió nada en treinta segundos. En este chat, treinta segundos es una puta eternidad.',
    'El grupo tuvo que recalcular quién eres. Y el resultado no les gustó nada, porque era bueno.',
    'Ganaste con una limpieza que asusta. Ni una duda, ni un pero, ni una manera de quitarle mérito.',
    'Sacaste un número que dejó al grupo con la misma cara de mierda que ponen cuando les deben dinero.',
    'Hoy el chat se quedó a oscuras un momento. No por fallo, por tu tirada. Les apagaste la gracia.',
    'El grupo entero se calló y ninguno quiso admitir que fue por tu resultado. Pero fue por tu resultado.',
    'Nadie tuvo cojones de decir nada. Ni para bien ni para mal. El número mandaba y punto.',
    'Ganaste y dejaste al grupo con cara de velorio. No porque les importes, sino porque les ganaste.',
    'Tu tirada fue una bofetada con la mano abierta a todos los que estaban esperando tu fallo.',
    'Hoy subiste tanto que el grupo necesitó un momento para procesar que eras tú y no un error.',
    'Sacaste algo que hizo que el más bocazas del chat se mordiera la lengua. Y eso merece bronce.',
    'Ganaste de una forma tan limpia que hasta el cabrón que siempre comenta prefirió callarse.',
    'El chat se congeló un segundo después de tu tirada. Ese segundo fue tu monumento.',
    'Hoy dejaste al grupo sin excusas, sin bromas y sin ganas de hablar. Eso es dominar una sala.',
    'Tu resultado cayó como una losa sobre un chat que ya tenía el chiste preparado. Se lo tragaron.',
    'Ganaste y el silencio posterior fue más pesado que cualquier puta cosa que se pueda escribir.',
    'Nadie te aplaudió porque aquí no se aplaude. Pero el silencio fue lo más parecido a una ovación.',
    'Sacaste un resultado que hizo que tres personas se arrepintieran de haber hablado mierda de ti hoy.',
    'El grupo se quedó sin aire un momento. Tú se lo quitaste con un número. Puro peso.',
    'Hoy te miraron como se mira a alguien que acaba de hacer algo que nadie esperaba. Con respeto forzado.',
    'Ganaste y el chat tardó en reaccionar. No porque fuera difícil, sino porque les costó aceptarlo.',
  ],
  gain: [
    // ── Ejemplos del usuario (intocables) ──
    'Sumaste algo. No es para celebrar, pero al menos hoy no diste el papelón de siempre.',
    'Te tiraron una migaja decente. Agárrala y cierra la boca antes de que se arrepientan.',
    'Pequeña subida. El grupo lo vio, bostezó y siguió con lo suyo. No esperes aplausos.',
    'Hoy no la cagaste. Para tu historial ya es casi un logro, no te creas demasiado.',
    'El aura te dio un hueso. Disfrútalo en silencio, mañana vuelves a ser el de siempre.',
    // ── Generadas ──
    'Sumaste un poco y nadie lo comentó. Así de importante fue tu tirada para el grupo.',
    'Ganancia modesta. No cambia nada, pero al menos el número subió y no bajó.',
    'Hoy el aura fue generosa contigo. No te acostumbres, que mañana se le pasa.',
    'Te llevaste un poco sin hacer ruido. Tu mejor estrategia: no llamar la atención.',
    'Subiste algo. El grupo ni se enteró y tú tampoco deberías darle más importancia.',
    'El aura te dio lo justo para no bajar. Eso en tu caso ya es una victoria, joder.',
    'Ganancia tibia. Ni fría ni caliente, como todo lo que haces aquí.',
    'Hoy te fue bien y nadie te va a felicitar. Acostúmbrate a los éxitos en silencio.',
    'Sumaste calderilla. No da para presumir, pero da para no llorar.',
    'Ganaste algo. No es para contar en casa, pero tampoco es para pedir perdón.',
    'El aura subió un poco. Lo justo para que no te quejes y lo poco para que no presumas.',
    'Hoy te salió bien por primera vez en un rato. No lo arruines abriendo la boca.',
    'Pequeña ganancia. Del tamaño exacto de tus ambiciones en este grupo.',
    'Sumaste y el chat siguió como si nada. Eso te dice todo sobre el impacto de tu puta tirada.',
    'Te dieron un poco y lo aceptaste sin protestar. Así se comporta alguien que sabe cuál es su sitio.',
    'Hoy no fuiste noticia. Ni por arriba ni por abajo. Solo un número que sube en silencio.',
    'Ganancia discreta. Nadie la vio, nadie la comentó y nadie la va a recordar.',
    'Subiste algo sin hacer el ridículo. Para ti eso ya es un dos por uno.',
    'Te llevaste un puñado de aura. Pequeño, como todo lo tuyo, pero al menos es positivo.',
    'Hoy el marcador subió y tú no tuviste la culpa de nada malo. Eso ya es raro, cojones.',
    'El aura se portó contigo. No esperes que se repita: la generosidad tiene límites.',
    'Ganancia pequeña, cara neutra, grupo indiferente. Todo como de costumbre.',
    'Hoy sumaste sin drama. Es poco, pero es tuyo y nadie te lo va a discutir.',
    'Subiste un poco. Nadie aplaudió, nadie abucheó, nadie supo que pasaste por aquí.',
    'Te llevaste algo y cerraste la boca. Por fin aprendes cómo funciona esta mierda.',
    'El aura te dio un trocito. Cómetelo rápido antes de que el siguiente turno te lo quite.',
    'Sumaste y punto. Sin épica, sin drama, sin nada que contar cuando te pregunten.',
    'Ganancia gris. Del color de tu presencia en este grupo.',
    'Te subió un poco el marcador. No te lo tomes como tendencia, tómatelo como accidente.',
    'El aura te pagó lo mínimo. Lo justo para que no te vayas y lo poco para que no te quedes.',
    'Sumaste algo sin mérito visible. El azar fue bueno contigo y tú no le diste razones.',
    'Hoy el número verde es tuyo. Pequeño, solitario y sin testigos. Como todo lo bueno en tu vida.',
    'Ganancia modesta que no merece párrafo. Ni frase larga, la verdad.',
    'Te dieron un poco y es más de lo que merecías según tu historial de mierda.',
    'Subiste algo. El grupo siguió hablando de otra cosa, que es lo que pasa cuando ganas poco.',
    'El aura te dio lo justo para no quejarte. Que es exactamente lo que le pides a todo.',
    'Ganaste un poco y nadie se inmutó. El impacto de tu victoria fue cero en el chat.',
    'Hoy sumaste sin esfuerzo y sin gracia. Tu marca personal aplicada al éxito.',
    'Te llevaste unos puntos. Pocos, tibios y olvidables. Justo tu tamaño.',
    'Sumaste calderilla de aura y seguiste tu camino. Nadie te paró a preguntar cómo.',
    'Ganancia de supervivencia. No estás creciendo, estás no muriendo. Y eso ya es algo.',
    'Hoy el aura te trató como a un cliente habitual: sin entusiasmo pero sin hostias.',
    'Pequeña ganancia sin firma. Si no fuera por el número, nadie sabría que pasaste.',
    'El aura te dio una propina. No te ofendas: es más de lo que sueles conseguir, gilipollas.',
    'Sumaste un poco y el chat siguió. Eso resume tu relación con este grupo perfectamente.',
    'Te llevaste algo y punto. Sin historia, sin moraleja, sin nada que recordar.',
    'Ganancia limpia. Tan limpia que pasa sin dejar marca. Como tú por la conversación.',
    'Subiste algo. El grupo no cambió de tono, no cambió de tema, no cambió de nada.',
    'Hoy sumaste sin molestar a nadie. Tu mayor virtud y tu único puto talento comprobado.',
    'Te dieron un puñado y no lo discutiste. Eso te honra, porque no había mucho que discutir.',
    'Ganaste algo que mañana ya no recordarás. Y el grupo lo olvidó antes de que tú lo leyeras.',
    'Hoy el número fue verde y tu cara fue la misma. Ni te alegraste, y eso es lo más sensato.',
    'El aura subió lo justo. No te dieron ni de más ni de menos. Justo lo que eres.',
    'Ganancia modesta. Del montón, del medio, del promedio. De todo lo que te define.',
    'Te llevaste algo en silencio. El silencio fue lo mejor de todo el turno.',
    'Subiste un poco y nadie notó la diferencia. Porque la diferencia era mínima, como tu presencia.',
    'Sumaste sin que el grupo se enterase. Si un árbol cae en el bosque y nadie lo oye, joder.',
    'El aura te dejó un poco más que antes. Sigue sin ser una mierda, pero es la dirección correcta.',
    'Ganancia menor. De las que no se celebran, no se comentan y no se recuerdan.',
    'Te dieron un poco y lo cogiste rápido. Buena decisión, que aquí las cosas se quitan fácil.',
    'Hoy sumaste por primera vez en un rato. No lo conviertas en costumbre, que aburre.',
    'Ganaste algo real. Poco y gris, pero real. Que es más de lo que puedes decir de otras cosas.',
    'Subiste un poco. El grupo asintió mentalmente y pasó página. Así de rápido.',
    'El aura te pagó sin entusiasmo y tú lo cobraste sin quejarte. Buen trato para ambas partes.',
    'Sumaste lo mínimo visible. Ese es tu techo y hoy lo tocaste, enhorabuena.',
    'Te llevaste un poco de aura. No cambia tu vida, no cambia tu ranking, no cambia una mierda.',
    'Ganancia tibia. Del tipo que ni alegra ni entristece. Solo ocupa espacio en el historial.',
    'El aura subió un escalón. Sigues en el sótano, pero ahora es un sótano ligeramente más alto.',
    'Sumaste algo y el chat no se detuvo. Eso dice más de tu resultado que cualquier cifra.',
    'Te dieron un poco sin pedirlo y sin merecerlo. El azar es así: injusto, pero a veces a tu favor.',
    'Ganancia menor. Funcional, seca y sin nada que destacar. Como un puto martes cualquiera.',
    'Subiste algo y seguiste siendo el mismo. Al menos ahora eres el mismo con un poco más.',
    'Sumaste sin esfuerzo. Que es la única forma en que sumas algo, siendo honestos.',
    'Te llevaste un poco y el grupo bostezó. Ese bostezo es el aplauso más sincero que vas a recibir.',
    'Ganancia discreta. Tan discreta que hasta a ti se te olvidará en diez minutos.',
    'El aura subió como sube todo en tu vida: despacio, sin gracia y sin testigos.',
    'Sumaste lo justo para que el número cambie de color. Y ni eso impresionó a nadie, cabrón.',
    'Hoy el resultado fue positivo y aburrido. Que es mucho mejor que negativo y divertido.',
    'El marcador subió sin aspavientos. Como todo lo que pasa contigo: sin aspavientos y sin peso.',
    'Hoy te fue bien y el chat lo ignoró con profesionalidad. Así funciona esta mierda para ti.',
    'Te dieron una migaja y saliste contento. Dice más de ti que de la tirada.',
    'Subiste algo y nadie pestañeó. Para el grupo tu ganancia es ruido de fondo, como tu voz.',
    'Sumaste un poco. El grupo se enterará cuando revise el ranking. O sea, nunca.',
    'Ganaste lo justo para no quejarte y lo poco para que nadie te envidie. Tu zona de confort.',
    'Hoy el aura fue amable contigo. Sospechoso, pero disfrútalo antes de que cambie.',
    'Te subió el marcador por primera vez en un rato. No te emociones, que el rato vuelve.',
    'Pequeña subida. El tipo de resultado que te da para sonreír solo si nadie mira.',
    'Sumaste algo que mañana ya no importará. Pero hoy, por un segundo, fue algo.',
    'Ganancia de mantenimiento. No subiste de verdad, solo dejaste de hundirte un turno.',
    'Hoy te tiraron unas migajas y las recogiste con la dignidad justa. Ni más ni menos.',
    'El aura te dio un respiro. Corto, seco y sin garantía de que se repita.',
    'Sumaste un poquito. Tan poco que decirlo en voz alta ya suena a exageración.',
    'Te llevaste algo y cerraste el turno sin hacer ruido. Tu mejor versión, sinceramente.',
  ],
  loss: [
    // ── Ejemplos del usuario (intocables) ──
    'Bajaste y nadie se inmutó. Ya es parte del paisaje verte perder aura.',
    'Se te escurrió un poco más de presencia. El chat lo anotó mentalmente y siguió hablando de cosas serias.',
    'Perdiste. Otra vez. Ni siquiera generas gracia, solo esa cara de "obvio que iba a ser él".',
    'Te restaron sin drama. Como quien le quita importancia a un mosquito, sin odio y sin esfuerzo.',
    'Hoy el grupo te bajó un escalón más y ni se molestó en reírse. Eso debería preocuparte.',
    // ── Generadas ──
    'Perdiste un poco y nadie comentó. Tu derrota es tan rutinaria que ya no genera contenido.',
    'Bajaste otra vez. El grupo lo procesó con la misma emoción que una actualización del sistema.',
    'Hoy te quitaron un poco y seguiste siendo el mismo de siempre. Solo con menos.',
    'Perdiste aura como quien pierde un botón: ni te diste cuenta hasta que miraste.',
    'El marcador bajó y el chat ni pestañeó. Tu pérdida ya forma parte del ruido de fondo.',
    'Te restaron y ni te molestas en preguntar por qué. Ya sabes por qué: porque eres tú, gilipollas.',
    'Bajaste un poco. Lo justo para que se note y lo poco para que a nadie le importe.',
    'Hoy perdiste sin épica. Un fallo gris para un jugador gris en un turno gris.',
    'El aura te cobró algo y seguiste caminando. Ni drama ni sorpresa. Solo la factura de siempre.',
    'Perdiste otro trozo y el grupo ni levantó la vista. Ya no eres noticia ni perdiendo.',
    'Bajaste aura con la misma naturalidad con la que respiras. A nadie le extrañó.',
    'Te quitaron un poco. Lo de siempre, vamos. Ni tú te sorprendes ya.',
    'Hoy tu tirada dijo no. Y tú asentiste como quien lleva oyendo eso toda la vida.',
    'Perdiste lo suficiente para que se note y lo poco para que no importe. Tu zona habitual.',
    'El marcador rojo es tuyo otra vez. El grupo lo miró y siguió a lo suyo.',
    'Bajaste sin pelear. Ni una queja, ni un gesto, ni una mierda. Solo aceptación.',
    'Perdiste aura y el chat continuó. Tu derrota no tiene el peso necesario para frenar nada.',
    'Te restaron en silencio. Igual que vives aquí: en silencio y sin que nadie pregunte.',
    'Hoy perdiste como pierde la gente aburrida: sin gracia, sin historia y sin testigos interesados.',
    'El aura bajó un escalón y tú ni lo sentiste. Ese escalón era lo más valioso que tenías.',
    'Perdiste poco. Pero es que también tenías poco, así que proporcionalmente fue un puto desastre.',
    'Bajaste y nadie se ofreció a comentar. Ni por burla ni por pena. Pura indiferencia.',
    'Te quitaron aura y el grupo siguió hablando de comida. Tu pérdida vale menos que un menú.',
    'Hoy el marcador dijo que no. Un no pequeño, rutinario y esperado. Como todo lo tuyo.',
    'Perdiste otro puñado de aura. El puñado era pequeño, como tus posibilidades de remontar.',
    'Bajaste sin hacer ruido. Que es también como subes, como hablas y como existes aquí.',
    'El aura te cobró peaje y seguiste adelante. Sin queja y sin dignidad, que son cosas distintas.',
    'Perdiste y el chat no reaccionó. Si tu victoria no genera interés, imagina tu derrota.',
    'Te restaron un poco y seguiste como si nada. Ese "como si nada" es tu estado natural.',
    'Hoy perdiste lo de siempre. Ni más ni menos. La constancia es lo tuyo, aunque sea para perder.',
    'El marcador bajó y nadie tomó nota. Tu pérdida ya está incorporada al precio de tenerte aquí.',
    'Perdiste aura con una tranquilidad sospechosa. O te la suda o ya no te queda con qué sufrir.',
    'Bajaste otro punto. Si el grupo llevara la cuenta de tus descensos, tendría un hobby de mierda.',
    'Te quitaron algo y seguiste. Sin cara de sorpresa, sin queja, sin nada. Costumbre pura.',
    'Hoy el aura decidió que no y tú obedeciste sin rechistar. Así llevas meses, cabrón.',
    'Perdiste lo justo para no quedar bien. No lo bastante para quedar mal de verdad.',
    'El chat vio tu número rojo y siguió. Ni un comentario, ni una broma, ni una puta mirada.',
    'Bajaste y el grupo lo absorbió como absorbe todo lo tuyo: sin esfuerzo y sin interés.',
    'Perdiste un poco. El grupo no se enteró y tú tampoco deberías darle más vueltas.',
    'Te restaron aura y la vida siguió exactamente igual. Para ti y para todos los demás.',
    'Hoy fallaste en algo fácil. Pero como todo lo fácil se te complica, nadie se sorprendió.',
    'Perdiste calderilla de aura. No da para llorar, pero da para no presumir.',
    'El marcador bajó con la misma velocidad con la que el grupo dejó de mirarlo.',
    'Bajaste y ni tú mismo le diste importancia. Primer acierto del día, aunque sea el único.',
    'Te quitaron un trozo de aura. Pequeño, previsible y perfectamente tuyo.',
    'Hoy perdiste como siempre: sin pena, sin gloria y sin que a nadie le cambie el día.',
    'El aura te restó en automático. Como si ya tuviera programado cuánto quitarte cada puta vez.',
    'Perdiste otro puñado y el grupo no pestañeó. Tu descenso ya es tan suave que no se siente.',
    'Bajaste sin causar nada. Ni risa, ni pena, ni conversación. Solo un número que se mueve.',
    'Te quitaron algo y cerraste la boca. Buena decisión: hablar ahora solo lo empeoraría.',
    'Hoy el número fue rojo y tu cara fue la de siempre. Ni te inmutaste y a nadie le extrañó.',
    'Perdiste poco y aportaste menos. El saldo de tu turno es un vacío perfecto.',
    'El aura bajó despacio. Tan despacio como todo lo que haces, incluido perder.',
    'Bajaste y el chat siguió a otro tema. Tu pérdida duró en pantalla menos que un estado.',
    'Te restaron un poco y punto. Sin moraleja, sin lección, sin nada que aprender.',
    'Hoy perdiste lo previsible. Si alguien hubiera apostado en tu contra, habría ganado sin emoción.',
    'El marcador rojo se repite otra vez. A estas alturas podría ser tu puto fondo de pantalla.',
    'Perdiste aura y nadie se acercó a consolar. Porque no da para consuelo, solo para bostezo.',
    'Bajaste otro escalón sin que nadie te empujara. El mérito es tuyo entero, cabrón.',
    'Te quitaron algo que apenas tenías. Duele menos cuando no hay mucho que perder.',
    'Hoy el aura fue sincera contigo. Y la sinceridad, en tu caso, siempre duele un poco.',
    'Perdiste como pierde un reloj atrasado: poco a poco, sin que nadie se dé cuenta, hasta que importa.',
    'El grupo vio tu pérdida y la archivó con las demás. Tienes una carpeta propia de descensos.',
    'Bajaste sin provocar nada. Ni un gesto, ni un comentario, ni un suspiro. Nada.',
    'Te restaron y tú seguiste. El único talento que nadie te discute: aguantar sin enterarte.',
    'Perdiste poco y se notó poco. Proporción perfecta para alguien de tu calibre.',
    'El aura te cobró lo que te tocaba. Poco, pero tuyo. Como todo lo que sale mal en tu puta vida.',
    'Bajaste y nadie preguntó cuánto. Porque la respuesta siempre es la misma: lo de siempre.',
    'Hoy perdiste sin historia. Un descenso aburrido para una persona aburrida en un turno aburrido.',
    'Perdiste algo que mañana ya no recordarás. Y el grupo lo olvidó antes de terminar de leerlo.',
    'El marcador bajó un poco y la vida siguió. Sin tu permiso y sin tu opinión, como de costumbre.',
    'Bajaste otro puñado y cerraste el turno. Nadie se quedó a ver cómo encajabas el golpe.',
    'Te restaron aura sin anestesia. Aunque con tan poco dolor, tampoco la necesitabas.',
    'Hoy tu resultado fue rojo y tu reacción fue nula. Perfecto equilibrio entre la pérdida y la nada.',
    'El chat procesó tu derrota en un milisegundo. Ese es el tiempo que le dedica el grupo a tus problemas.',
    'Bajaste y el silencio fue el mismo de siempre. Ni más pesado ni más ligero. Solo el de siempre.',
    'Hoy perdiste lo que toca. Ni más ni menos. La rutina no falla, y tú tampoco, pero al revés.',
    'Perdiste un poco y el grupo ni alzó la puta vista. Tu derrota pesa lo mismo que tu silencio.',
    'El aura bajó sin aspavientos. Igual que todo lo que te pasa: sin aspavientos y sin que importe.',
    'Bajaste y seguiste. Sin excusa, sin drama y sin nadie que te pidiera una explicación.',
    'Te restaron lo justo para no llamar la atención. Tu derrota fue tan discreta como tú.',
    'Hoy perdiste aura y el grupo no cambió de tema. No hizo falta: tu pérdida no era un tema.',
    'Perdiste poco. Pero poco sumado a poco sumado a poco ya empieza a ser algo. Y algo feo.',
    'El marcador rojo volvió a aparecer junto a tu nombre. Ya casi se escriben solos juntos.',
    'Te quitaron un pedazo y ni lo sentiste. O sí lo sentiste y eso es lo que te queda: sentir y callar.',
    'Hoy tu tirada fue un no. Corto, seco y sin posibilidad de réplica. Justo como te tratan aquí.',
    'Perdiste y nadie lloró. Ni tú. Ese nivel de sequía emocional ya es preocupante.',
    'El aura te castigó con calma. Sin prisa, sin rabia, sin nada personal. Solo números.',
    'Bajaste y el mundo siguió girando. El mundo y el grupo y todo lo que no depende de ti.',
    'Te quitaron un punto y el chat pasó a otra cosa. Tu pérdida dura menos que un puto parpadeo.',
    'Hoy perdiste lo típico. Lo que pierde alguien que ya ni espera ganar y al que nadie compadece.',
    'Bajaste otra vez y el grupo bostezó. Tu derrota ya es lo más predecible de este chat.',
    'Te restaron y cerraste el turno como cierras todo: sin ruido y sin que nadie note la diferencia.',
  ],
  spiral: [
    // ── Ejemplos del usuario: no proporcionó para spiral, se generan todas ──
    'Sigues bajando y el chat ya ni levanta la vista cuando aparece tu nombre. Pierdes en silencio.',
    'Otra caída y ni un mensaje. Ese silencio es tu verdadero marcador.',
    'Llevas tantas seguidas que ganar te daría un susto de muerte.',
    'Sigues en rojo y cada tirada confirma lo que todos daban por hecho.',
    'Ya no es una racha. Es tu estado natural y el grupo lo asumió hace semanas.',
    'Otra bajada. A esto ya no se le llama mala suerte, se le llama ser tú.',
    'Sigues cavando. En algún momento habrá que decirte que el fondo ya lo pasaste, gilipollas.',
    'Nueva pérdida encadenada. El marcador ya no reacciona, solo actualiza.',
    'La caída lleva tanto que el grupo dejó de contarla. Ni para eso das trabajo.',
    'Sigues perdiendo con la naturalidad de quien no conoce otra cosa.',
    'Otra vez abajo. El grupo dejó de sorprenderse hace bastante tiempo.',
    'Tu racha negativa ya tiene más historia que cualquier cosa que hayas dicho aquí.',
    'Sigues bajando y nadie te sostiene. Porque nadie sintió nunca tu puto peso arriba.',
    'Otra derrota encadenada. Ni una excepción, ni un respiro, ni un accidente a favor.',
    'Llevas tanto abajo que subir un puesto sería noticia. Y no va a pasar.',
    'Cada intento tuyo confirma lo mismo: que no aprendes.',
    'Sigues cayendo con una constancia que daría gusto ver aplicada a otra cosa.',
    'Tu descenso ya es parte del paisaje. Como una mancha en la pared que nadie limpia.',
    'Otra derrota que se suma a las demás. Ya ni el bot encuentra la parte graciosa.',
    'Sigues en rojo y encima cómodo. Eso es lo que ya no tiene arreglo, joder.',
    'Llevas tantas derrotas que la palabra intento se te da mejor que la palabra logro.',
    'Otra caída idéntica a la anterior. Ni variedad ofreces en el fracaso, cabrón.',
    'Sigues perdiendo y el grupo ha dejado de mirar. Pierdes para nadie.',
    'Tu aura negativa crece con más constancia que cualquier cosa buena que hayas tenido.',
    'Otra vez el mismo resultado. Cambia el día, cambia la hora y no cambia una mierda.',
    'Sigues abajo y lo peor es que ahí encajas. Ese es tu puto sitio.',
    'El grupo ya no apuesta por tu recuperación. Apuesta por cuánto tardas en tocar un nuevo mínimo.',
    'Llevas tanto perdiendo que el grupo ha normalizado tu descenso como se normaliza el tráfico.',
    'Otra pérdida en una lista que ya necesita scroll para verse entera.',
    'Sigues cayendo y ni frenas. Ese abandono es lo que de verdad preocupa.',
    'Tu racha es tan larga que ya forma parte del reglamento no escrito: tú pierdes.',
    'Otra derrota y ni una reacción. El grupo ya pasó la fase de burlarse de ti.',
    'Sigues en negativo y profundizando. Como tus problemas: nunca se resuelven, solo se acumulan.',
    'Llevas tanto abajo que el fondo te ha adoptado. Residencia permanente, gilipollas.',
    'Otra caída y ni tú la comentas. Cuando el propio protagonista pierde interés, algo va muy mal.',
    'Sigues perdiendo con la misma cara. Ni la puta expresión se te ha gastado de tanto usarla.',
    'Tu descenso ya no es noticia. Es el fondo del paisaje, decorado permanente.',
    'Otra derrota más para una colección que ya nadie quiere ver.',
    'Sigues cayendo sin fondo a la vista. Y llevas tiempo buscándolo.',
    'Llevas tantas seguidas que hasta el bot tiene que buscar frases nuevas para describirte.',
    'Otra bajada rutinaria. Tu historial parece un tobogán y tú sigues subiendo para tirarte.',
    'Sigues en rojo y el grupo te lee los resultados como quien mira una pared.',
    'Tu racha ya tiene edad para tener opinión propia sobre ti. Y no es buena.',
    'Otra pérdida que se suma al montón. El montón ya pesa más que tu presencia.',
    'Sigues perdiendo y a nadie le cambia el día. Ni el tuyo, que ya es decir.',
    'Llevas tanto abajo que subir sería sospechoso. Tranquilo, no va a pasar.',
    'Otra derrota encadenada. El chat la registra y pasa página sin detenerse.',
    'Sigues cayendo y ni te molestas en frenar. Eso ya no es mala racha, es elección.',
    'Tu aura negativa ya es un estilo de vida. Y no uno bueno, puto fracasado.',
    'Otra caída más en una secuencia que ya parece infinita. Quizá lo sea.',
    'Sigues bajando con la calma de quien ya se rindió. Y la calma te sienta peor que la derrota.',
    'Llevas tantas pérdidas que el propio sistema se pregunta si estás bien. No lo estás.',
    'Otra vez para abajo. El grupo ni se gira. Ya te convirtieron en ruido de fondo.',
    'Tu descenso continuado es lo más constante de este grupo. Y mira que hay cosas constantes.',
    'Sigues perdiendo sin que nadie te diga nada. Ese silencio es compasión mezclada con aburrimiento.',
    'Otra derrota y el mismo patrón. Si esto fuera un gráfico, sería una línea recta hacia la mierda.',
    'Llevas tanto cayendo que el grupo ha dejado de marcarlo. Se asume como se asume la gravedad.',
    'Sigues en rojo y sin señales de cambio. El pronóstico es el mismo que ayer: tú.',
    'Otra pérdida para un historial que ya no admite más. Pero tú siempre encuentras sitio, cabrón.',
    'Tu racha negativa ya es tan larga que el grupo la usa de referencia temporal: "desde que empezó a perder".',
  ],
  cursed: [
    // ── Ejemplos del usuario (intocables) ──
    'Perdiste tanta mierda que el silencio posterior fue puro cringe. Nadie quería ser el que lo mencionara.',
    'El aura te usó de ejemplo público. El grupo miró, asintió y tomó nota mental.',
    'Bajaste tan fuerte que hasta tus habituales defensores se hicieron los locos.',
    'Esto no fue mala suerte. Fue el chat recordándote, sin filtro, que sigues siendo un desastre.',
    'Quedaste tan abajo que ni valía la pena bardear. Solo quedó esa mezcla de pena y alivio de no ser tú.',
    // ── Generadas ──
    'El chat se quedó callado después de tu resultado. No por respeto. Por vergüenza ajena.',
    'Perdiste tanto de golpe que el grupo necesitó un momento para procesar la magnitud del desastre.',
    'Tu tirada fue tan mala que dos personas cerraron el chat para no tener que verlo.',
    'El número fue tan bajo que el grupo entero se miró y nadie quiso ser el primero en hablar.',
    'Hoy batiste un récord que nadie quería ver roto. Enhorabuena por lo único que se te da bien.',
    'Perdiste tanto que el grupo tuvo que hacer un esfuerzo consciente por no decir nada. Y les costó.',
    'Tu resultado fue tan malo que hasta el bot se sintió incómodo anunciándolo, joder.',
    'Hoy te hundiste delante de todos. Con público, con testigos y con capturas que van a durar.',
    'El silencio después de tu tirada fue el tipo de silencio que aparece en los funerales. Y lo era.',
    'Perdiste con una intensidad que hizo que el grupo entero se sintiese aliviado de no ser tú.',
    'Tu marcador se desplomó y el chat se congeló un segundo. Un segundo que vas a recordar.',
    'Hoy te retrataste delante de todos. Y el retrato fue feo, preciso y permanente.',
    'El grupo vio tu resultado y cada uno pensó lo mismo: "menos mal que no soy yo, puta madre".',
    'Perdiste tanto que la cifra ya no da risa. Da esa incomodidad de cuando alguien la caga de verdad.',
    'Tu tirada fue un accidente público. Todo el mundo lo vio, nadie pudo evitarlo, todos lo van a recordar.',
    'Hoy te hundiste tan rápido que el chat no tuvo tiempo ni de preparar la broma.',
    'El resultado fue tan malo que el grupo cambió de tema por compasión. No por ti, por ellos.',
    'Perdiste de una forma que dejó a todo el mundo sin ganas de seguir jugando un rato.',
    'Tu marcador cayó como cae todo lo que sueltas: rápido, ruidoso y sin que nadie lo recoja.',
    'Hoy tu tirada fue un espectáculo, pero del tipo que nadie quiere ver dos veces.',
    'El grupo entero presenció tu desastre y nadie dijo nada. El cringe fue más fuerte que la broma.',
    'Perdiste tanto de golpe que el silencio posterior tuvo peso físico. Se podía sentir, cojones.',
    'Tu resultado dejó al chat con esa sensación de cuando alguien dice algo que no debería. Incómodo.',
    'Hoy te comiste una derrota tan grande que el grupo no supo si reírse o mirarse los zapatos.',
    'El marcador se hundió y arrastró el ambiente con él. Nadie quiso hablar después.',
    'Perdiste con una limpieza que da miedo. Ni un titubeo, ni una duda. Directo al puto fondo.',
    'Tu tirada fue tan catastrófica que el grupo se dividió entre los que sentían cringe y los que sentían pena.',
    'Hoy te expusiste delante de todos y el resultado fue exactamente lo que temías. Y peor.',
    'El chat vio tu número y cada persona procesó la información en silencio. Demasiado malo para comentar.',
    'Perdiste tanto que la cifra parece un error. Pero no lo es. Es tu puta realidad.',
    'Tu resultado fue la clase de desastre que hace que la gente cierre la app y abra otra cosa.',
    'Hoy te diste de bruces con el suelo delante de todo el grupo. Y el suelo estaba duro, cabrón.',
    'El silencio del chat después de tu tirada fue más elocuente que cualquier insulto.',
    'Perdiste de una manera que ni el peor enemigo te habría deseado. Y eso que aquí tienes varios.',
    'Tu marcador se desplomó y el grupo respiró hondo colectivamente. Ese suspiro era por ti.',
    'Hoy hiciste historia en el chat, pero del tipo que se cuenta bajando la voz.',
    'El resultado fue tan malo que el grupo necesitó un cambio de tema urgente para poder seguir.',
    'Perdiste tanto que tu nombre va a ser sinónimo de desastre durante las próximas semanas.',
    'Tu tirada fue el equivalente a tropezarte en un escenario. Con foco, con público y sin salida.',
    'Hoy el chat presenció algo que no quería presenciar. Tu derrota fue genuinamente incómoda.',
    'El grupo vio tu resultado y ninguno quiso ser el que rompiera el silencio. Demasiado.',
    'Perdiste con un estruendo silencioso. De esos que se sienten pero no se nombran.',
    'Tu marcador bajó tanto que el chat necesitó un momento para recuperar la normalidad, joder.',
    'Hoy te hundiste con testigos. Y los testigos van a hablar cuando tú no estés.',
    'El resultado fue tan catastrófico que el grupo sintió vergüenza ajena real. De la física.',
    'Perdiste de una forma que convirtió el chat en un velatorio durante treinta segundos.',
    'Tu tirada fue tan mala que hasta la gente que te odia prefirió no decir nada. Eso ya es mucho.',
    'Hoy batiste un fondo que nadie sabía que existía. Explorador del desastre, puto campeón.',
    'El chat se quedó en blanco después de tu resultado. No por sorpresa. Por cringe.',
    'Perdiste tanto que la próxima vez que tires, todo el grupo va a mirar con morbo. Y con miedo.',
    'Tu resultado fue una demolición pública. Rápida, visible y sin un solo atenuante.',
    'Hoy te comiste la peor tirada que el grupo ha visto en semanas. Y la comiste en directo.',
    'El silencio posterior fue de los que incomodan. De los que hacen que la gente mire el móvil para otro lado.',
    'Perdiste con una magnitud que dejó al grupo sin herramientas. Sin broma, sin ironía, sin nada.',
    'Tu tirada fue tan desastrosa que el chat tardó en retomar la conversación. Y cuando la retomó, fue de otro tema.',
    'Hoy tu resultado fue un golpe que se sintió en todo el grupo. No de respeto. De cringe puro.',
    'El marcador se desplomó y llevó tu dignidad con él. Los dos al fondo, juntos.',
    'Perdiste de una forma tan limpia que no hay debate posible. Solo el número y su significado.',
    'Tu tirada dejó al grupo con esa cara de cuando alguien la caga en público y nadie sabe qué decir.',
    'Hoy te hundiste en público y en directo. El grupo fue testigo de todo y ninguno te ayudó.',
    'El resultado fue tan bajo que el chat se sintió pesado un rato. Tu presencia empeoró el ambiente.',
    'Perdiste con la elegancia de un saco de mierda cayendo por las escaleras. Ruidoso y feo.',
    'Tu tirada fue el punto más bajo del día en el chat. Y el día venía siendo malo de antes.',
    'Hoy el grupo vio tu resultado y cada uno sintió algo distinto. Todos malos.',
    'El chat absorbió tu derrota como absorbe las malas noticias: en silencio y con la cara larga.',
    'Perdiste tanto que el grupo dudó si era real. Confirmó que sí, y el cringe fue peor.',
    'Tu resultado convirtió un chat activo en un velatorio temporal. Nadie quiso seguir hablando.',
    'Hoy te retrataron los números. Y el retrato fue tan feo que nadie quiso mirarlo dos veces.',
    'El marcador cayó y el grupo sintió el golpe. No por ti, por la incomodidad de presenciarlo.',
    'Perdiste de la peor forma posible: delante de todos, sin excusa y sin manera de explicarlo.',
    'Tu tirada fue una catástrofe que el grupo va a recordar. No por grande, por incómoda.',
    'Hoy te comiste una derrota que dejó al chat más callado que un examen. Nadie copió nada, cojones.',
    'El resultado fue tan malo que el grupo tardó en reaccionar. Y cuando reaccionó, fue cambiando de tema.',
    'Perdiste con un impacto que dejó al chat desorientado un momento. Tu derrota fue desorientadora de lo mala.',
    'Sacaste un número que el grupo va a usar como unidad de medida del desastre. "Perdiste casi tanto como él".',
    'Tu resultado fue tan malo que hasta los que disfrutan viendo fracasos sintieron que era demasiado.',
    'Hoy caíste tan fuerte que el chat se quedó con esa sensación de haber visto algo que no debería. Cringe puro.',
  ],
};



// Cada tramo se ordena de mas duro a mas suave: el bot saca primero lo peor.
for (const tramo of Object.keys(AURA)) AURA[tramo] = AURA[tramo];

// !aura top — leaderboard of accumulated aura in the group.
async function showRanking(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'El ranking de aura solo existe en grupos.' }, { quoted: msg });
  }
  // Un solo filtro: quien ya no esta en el grupo no ocupa puesto. El aura se
  // guarda para siempre y sin esto el ranking seguia coronando a gente que se
  // fue del grupo hace meses.
  //
  // AQUI EL OWNER SI SALE, por peticion expresa. Es la unica excepcion a que sea
  // invisible en las salidas automaticas, y tiene sentido: este ranking es de
  // aura, no de actividad. No dice cuanto escribe nadie ni de donde salio ese
  // saldo, asi que aparecer en el no delata ni su rango ni sus mensajes — que es
  // lo que se protege en !count, !relevancia, !vs, !inactivos y los tops al azar.
  const ranking = soloMiembros(await getAuraRanking(jid), groupMeta)
    .slice(0, 10);
  if (ranking.length === 0) {
    return sock.sendMessage(jid, { text: 'Nadie ha medido su aura todavía. Usa *!aura*.' }, { quoted: msg });
  }
  let text = '*RANKING DE AURA*\n\n';
  const mentions = [];
  ranking.forEach((r, i) => {
    text += `*${i + 1}.* @${r.jid.split('@')[0]} — ${fmt(r.aura)}\n`;
    mentions.push(r.jid);
  });
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
  // Los porcentajes se calculan AQUI, fuera de la plantilla. Dentro de ella un
  // `${Math.round(X * 100)}` deja un "100" a la vista del test que vigila que no
  // haya cifras escritas a mano, y no distingue una conversion a porcentaje de
  // una cifra economica copiada. Fuera, la plantilla queda limpia de numeros.
  const pctBono = Math.round(ACTIVIDAD_BONO * 100);
  const pctTope = Math.round(ACTIVIDAD_TOPE * 100);
  const horasApuesta = APUESTA.cooldownMin / 60;
  const precios = Object.entries(PRECIOS)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `*!${k === 'sticker' ? 's' : k === 'grok' ? 'g' : k}* ${v}`)
    .join(' · ');

  return `*LA GUÍA DEL AURA*

La moneda del grupo. Empiezas con *${fmt(ARRANQUE)}*, un millonario ronda los *${fmt(MILLONARIO)}* y casi todo cuesta.

━━━━━ *CÓMO SE GANA* ━━━━━

*Escribiendo* — la vía principal. Bonos al llegar a *200*, *500* y *1000* mensajes en el día, y cada *${fmt(ACTIVIDAD_MSGS)}* mensajes en total tus tiradas ganan *+${pctBono}%* de suerte para siempre (tope *+${pctTope}%*).

*Apareciendo* — la racha. Escribe *${RACHA.minMensajes}* mensajes al día y cobras *${RACHA.pago}* por día acumulado, hasta *${RACHA.tope}*. Faltar un día la parte entera. El día corta a las *${RACHA.horaCorte}h*, no a medianoche.

*Tirando* — *!aura*, una cada ${duracion(ROLL_COOLDOWN_MS)}.

━━━━━ *LOS COMANDOS* ━━━━━

*!aura* — tiras · *@user* — miras el suyo
*!aura top* — ranking · *!aura hoy* — tu estado
*!aura apostar* <cant.> — a una carta, cada ${horasApuesta}h. Sin cifra va media cuenta. Necesitas *${fmt(APUESTA.minimo)}*, mínimo *${fmt(APUESTA.apuestaMin)}*
_Cuanto más te juegues de lo tuyo, más paga: de *x${APUESTA.multiplicador}* a *x${APUESTA.multiplicadorMax}* si pones más del ${Math.round(APUESTA.fraccionRiesgo * 100)}% de tu aura._

*!robo* @user <cant.> — pide lo que quieras, hasta todo lo que tenga
_Pero cuanto más pides, menos probable: el punto dulce está sobre el ${Math.round(RIESGO.puntoDulce * 100)}% de lo que podrías llevarte._
*!robo bote* / *asalto* — el bote común. Reventarlo cuesta *${fmt(BOTE.entrada)}*
*!robo tienda* / *comprar* — escudo, ganzúa, cebo
_Para la mesa: *amuleto* (${fmt(OBJETOS.amuleto.precio)}) · *seguro* (${fmt(OBJETOS.seguro.precio)}) · *socio* (${fmt(OBJETOS.socio.precio)}) todo un ${Math.round(OBJETOS.socio.descuento * 100)}% más barato ${OBJETOS.socio.horas}h_
_Y los caros: *pase* (${fmt(OBJETOS.pase.precio)}) publicas tus redes ${OBJETOS.pase.horas}h · *indulto* (${fmt(OBJETOS.indulto.precio)}) el bot no te banea solo. Ninguno te salva de un admin._
*!robo contra* — devuelves el golpe, *${CONTRA.ventanaSeg}s*. Doble o nada
*!robo top* — los más buscados

*!duel* @user <cant.> — 1v1, se acepta con *!duel aceptar*
*!dar* @user <cant.> — regalas aura

━━━━━ *LA LETRA PEQUEÑA* ━━━━━

_El robo, el duelo y la apuesta van en tu contra: la casa se queda un pellizco. Lo que se acumula sale de escribir, y esa ventaja no se compra ni se roba._

━━━━━ *EN QUÉ SE GASTA* ━━━━━
${precios}`;
}

// !aura [@user]  — rolls aura for the target and updates their PERSISTENT total.
// !aura top      — shows the group leaderboard.
// !aura info     — explains the full system.
// ═══════════════════════════════════════════════════════════════════════════
// !aura apostar — la mitad del saldo a una carta
// ═══════════════════════════════════════════════════════════════════════════

// El pool de derrota SI se ordena de mas duro a mas suave: son burlas, y el bot
// abre con lo peor que tiene, igual que en el resto de comandos. El de victoria
// NO: son cronicas de una hazaña, todas dicen lo mismo con otras palabras, y
// ordenarlas por tacos solo pondria delante las que mas suenan a insulto — el
// efecto contrario al que busca. Mismo criterio que OWNER_ROAST.
const POOL_APUESTA_GANA = APUESTA_GANA;
const POOL_APUESTA_PIERDE = APUESTA_PIERDE;

const APUESTA_COOLDOWN_MS = APUESTA.cooldownMin * 60 * 1000;
const ultimaApuesta = new Map();   // `${grupo}|${persona}` -> ts

// Guarda contra dos apuestas simultaneas de la misma persona. Se reclama de
// forma SINCRONA, antes de cualquier await: leer el saldo y moverlo son dos
// pasos, y sin esto dos mensajes a la vez pasarian los dos la comprobacion y se
// jugarian el saldo dos veces. Mismo patron que usa el duelo al aceptar.
const apuestaEnCurso = new Set();

// Frases de rechazo. Secas: dicen el porque y nada mas. El bot no da tutoriales
// ni explica como conseguir aura.
const APUESTA_POBRE = [
  'Joder, vienes a apostar con el culo al aire y sin vergüenza. Vuelve cuando tengas algo que no sea miseria.',
  'Con esa mierda de saldo no llegas ni a la barra, cojones.',
  '¿Apostar tú? Ni de coña. Antes junta cuatro duros y luego hablamos.',
  'Vienes más pelado que una rata de alcantarilla. Aquí no se juega con pena.',
  'Esa calderilla no vale ni para limpiarme el culo, no te digo ya para apostar.',
  'La mesa tiene un mínimo y tú tienes menos que eso, gilipollas.',
  'Con lo que tienes no apuestas, mendigas. Y aquí no se reparte caridad.',
  'Joder, qué vergüenza ajena da tu saldo. Vuelve cuando no seas un puto pordiosero.',
  'Eso no es aura, es la mierda que queda en el fondo del bolsillo.',
  'Ni para propina llega eso, coño. Vete a pedir a otro lado.',
  'Aquí se apuesta con cojones, no con las migajas que te quedan.',
  'Con esa hostia de saldo lo único que arriesgas es hacer el ridículo.',
  'Estás más seco que la Mancha en agosto. Junta pasta y vuelve, pringado.',
  'No hay mínimo que sobreviva a tu miseria. Larga de la mesa.',
];

async function jugarApuesta(sock, msg, groupMeta, args) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Esto solo se juega en grupos.' }, { quoted: msg });
  }

  if (auraApagada(jid)) return avisarApagada(sock, jid, msg);

  const sender = getSender(msg);
  const clave = `${jid}|${canonicalJid(sender)}`;
  if (apuestaEnCurso.has(clave)) return;   // ya hay uno en vuelo
  apuestaEnCurso.add(clave);

  try {
    // Cooldown propio. Es el unico freno que necesita: encadenar apuestas arruina
    // por pura matematica (cada jugada multiplica el saldo por 1,5 o por 0,5, y
    // a 45 % eso baja solo), asi que esto no esta para prohibir nada — esta para
    // que la caida no ocurra en diez minutos.
    const ultimo = ultimaApuesta.get(clave) || 0;
    const queda = APUESTA_COOLDOWN_MS - (Date.now() - ultimo);
    if (queda > 0) {
      const h = Math.floor(queda / 3_600_000);
      const m = Math.ceil((queda % 3_600_000) / 60_000);
      return sock.sendMessage(jid, {
        text: `La mesa todavía está caliente. Vuelve en *${h ? h + 'h ' : ''}${m}min*.`,
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

    const esOwner = isOwner(sender, msg.key.fromMe, groupMeta);
    const esAdmin = !esOwner && isAdmin(groupMeta?.participants, sender);
    const pBase = esOwner ? APUESTA.p.owner : esAdmin ? APUESTA.p.admin : APUESTA.p.miembro;

    // AMULETO: se gasta al tirar, gane o pierda. Un objeto que solo se gastara
    // al perder seria gratis cuando funciona, y entonces no es una apuesta: es
    // un descuento.
    const conAmuleto = await tiendaObj.gastarUso(jid, sender, 'amuleto').catch(() => false);
    const p = conAmuleto ? Math.min(0.95, pBase + OBJETOS.amuleto.bono) : pBase;
    const gana = Math.random() < p;

    // La cifra la pone el jugador; sin cifra, la mitad de siempre.
    //
    // Dos topes, los dos fisicos y no de diseño: no se puede apostar mas de lo
    // que se tiene, ni menos del minimo. Si pide de mas se juega lo que tiene y
    // se dice — recortar en silencio es lo que hacia que !robo pareciera roto.
    const pedido = (args || []).slice(1).find(a => /^\d+$/.test(a));
    const jugable = Math.max(0, saldo - APUESTA.suelo);
    const bruto = pedido ? parseInt(pedido, 10) : Math.floor(saldo * APUESTA.fraccion);
    const apuesta = Math.max(APUESTA.apuestaMin, Math.min(bruto, jugable || Math.floor(saldo * APUESTA.fraccion)));
    const recortada = Boolean(pedido) && bruto > apuesta;
    // Perder nunca deja por debajo del arranque: quedarse a cero significaria no
    // poder ni hacer un sticker, y el castigo que se busca es el drama, no que
    // alguien deje de usar el bot.
    // Cuanto paga: mas cuanto mas te juegues de LO TUYO.
    //
    // Poner 300 teniendo 20.000 y poner los 20.000 no son la misma jugada, y
    // pagarlas igual quitaba la unica decision interesante del comando. El pago
    // sube del x2 al x2,10 segun la fraccion de tu aura que pongas en la mesa,
    // y toca el techo a partir de APUESTA.fraccionRiesgo.
    //
    // El techo es bajo a proposito: unas centesimas mas y la apuesta deja de
    // tener ventaja de la casa y pasa a imprimir aura (ver el comentario en
    // economia.js). El premio gordo esta en el tamanyo, no en el multiplicador.
    const riesgo = saldo > 0 ? Math.min(1, apuesta / saldo / APUESTA.fraccionRiesgo) : 0;
    const mult = APUESTA.multiplicador +
      (APUESTA.multiplicadorMax - APUESTA.multiplicador) * riesgo;
    const objetivo = gana
      ? saldo + Math.round(apuesta * (mult - 1))
      : Math.max(APUESTA.suelo, saldo - apuesta);
    let delta = objetivo - saldo;

    // SEGURO: devuelve la mitad de lo perdido, con tope. El tope no es un
    // detalle: sin el, el seguro vale mas cuanto mas apuestas y comprarlo por
    // 600 para cubrir una apuesta de 5.000 seria ganar aura sin jugar.
    let devuelto = 0;
    if (!gana && delta < 0 && await tiendaObj.gastarUso(jid, sender, 'seguro').catch(() => false)) {
      devuelto = Math.min(
        Math.round(Math.abs(delta) * OBJETOS.seguro.recupera),
        OBJETOS.seguro.topeDevuelto,
      );
      delta += devuelto;
    }

    const { current } = await addAura(jid, sender, delta);

    // Perder en la mesa alimenta el bote del robo. Una cuarta parte, no más: el
    // grueso se sigue destruyendo, que es lo que hace de esto un sumidero. Pero
    // asi el bote crece aunque el grupo no robe, y una apuesta gorda perdida se
    // convierte en algo que todos van a querer reventar.
    let alBote = 0;
    if (!gana && delta < 0) alBote = await aportarAlBote(jid, Math.abs(delta) * BOTE.fraccionDeApuesta);

    const nm = `@${sender.split('@')[0]}`;
    const frase = pickFresh(gana ? POOL_APUESTA_GANA : POOL_APUESTA_PIERDE, `${jid}|apuesta|${gana ? 'gana' : 'pierde'}`)
      .replace(/%A/g, nm)
      .replace(/%C/g, fmt(apuesta))
      .replace(/%S/g, fmt(current));

    const text =
      `*APUESTA — ${gana ? 'GANA' : 'PIERDE'}*\n` +
      `╾━━━━━━━━━━━━━━╼\n\n` +
      `${nm} puso *${fmt(apuesta)}* sobre la mesa.` +
      (recortada ? `\n_Ibas a por ${fmt(bruto)}, pero es todo lo que puedes cubrir._` : '') +
      // Los objetos se DICEN. Un amuleto que actua en silencio es aura tirada:
      // el jugador no sabe si le sirvio de algo y no vuelve a comprarlo.
      (conAmuleto ? `\n_El amuleto se gastó: tiraste con un ${Math.round(OBJETOS.amuleto.bono * 100)} % más de suerte._` : '') +
      (devuelto ? `\n_El seguro te devuelve *${fmt(devuelto)}* de lo perdido._` : '') +
      `\n\n` +
      `${frase}\n\n` +
      `${gana ? '+' : '−'}${fmt(Math.abs(delta))} → *${fmt(current)}* de aura` +
      (alBote ? `\n_Una parte de lo que soltaste ha ido al bote del grupo, que sube a *${fmt(alBote)}*. Alguien se lo va a llevar y no vas a ser tú._` : '');

    return sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: msg });
  } finally {
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
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'No tienes permiso para usar esto.' }, { quoted: msg });
  }

  const encender = sub === 'on' || sub === 'encender';
  await toggleAura(jid, encender);
  reiniciarAviso(jid);

  return sock.sendMessage(jid, {
    text: encender
      ? 'Dinámica de aura *reanudada*. Se puede volver a tirar, apostar, robar y batirse en duelo.'
      : 'Dinámica de aura *en pausa*. Nadie puede tirar, apostar, robar, batirse en duelo ni dar aura.\n\n' +
        '_Los saldos no se tocan y se siguen ganando escribiendo. *!aura top* y *!aura @user* siguen funcionando._',
  }, { quoted: msg });
}

async function cmdAura(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;

  const sub = (args && args[0] ? args[0] : '').toLowerCase();

  // El aura es la moneda DEL GRUPO, asi que fuera de un grupo no se juega.
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
  const esGuia = ['info', 'help', 'ayuda', 'como', 'cómo', '?', 'guia', 'guía'].includes(sub);
  if (!jid.endsWith('@g.us') && !esGuia) {
    return sock.sendMessage(jid, {
      text: 'El aura es del grupo: se juega ahí, no por privado.\n_Para saber cómo va: *!aura info*_',
    }, { quoted: msg });
  }

  // El interruptor va lo primero: si no, con la dinamica apagada no habria
  // forma de volver a encenderla desde el propio comando.
  if (['on', 'off', 'encender', 'apagar'].includes(sub)) {
    return interruptor(sock, msg, sub, groupMeta);
  }

  if (['top', 'rank', 'ranking', 'leaderboard'].includes(sub)) {
    return showRanking(sock, msg, groupMeta);
  }
  if (['info', 'help', 'ayuda', 'como', 'cómo', '?'].includes(sub)) {
    return sock.sendMessage(jid, { text: textoAuraInfo() }, { quoted: msg });
  }
  // Progreso diario. Vive en social.js (cmdCasino) y se expone aquí como
  // "!aura hoy" porque es aura, no un casino aparte. !casino sigue valiendo.
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
    return jugarApuesta(sock, msg, groupMeta, args);
  }

  const sender = getSender(msg);

  // El aura es como una moneda: solo el dueño la juega. !aura @alguien es solo
  // una CONSULTA del aura de esa persona — no tira, no gasta cooldown y no
  // modifica nada. Tirar (subir/bajar) siempre es sobre uno mismo.
  const mentioned = getTarget(msg);
  if (mentioned && !sameUser(mentioned, sender)) {
    const aura = await getAura(jid, mentioned);
    return sock.sendMessage(jid, {
      text: `*@${mentioned.split('@')[0]}* tiene *${fmt(aura)}* de aura.`,
      mentions: [mentioned],
    }, { quoted: msg });
  }

  // La tirada se bloquea AQUI, despues de la consulta: !aura @alguien solo lee
  // un numero y no hace ruido, asi que apagar la dinamica no tiene por que
  // dejar el marcador a oscuras.
  if (auraApagada(jid)) return avisarApagada(sock, jid, msg);

  const coolKey = `${jid}|${canonicalJid(sender)}`;
  const last = lastRoll.get(coolKey) || 0;
  const remaining = ROLL_COOLDOWN_MS - (Date.now() - last);
  if (remaining > 0) {
    return sock.sendMessage(jid, {
      text: `Espera *${duracion(remaining)}* para volver a tirar.`,
    }, { quoted: msg });
  }
  // Aqui hubo un tope de doce tiradas al dia. Se quito: un contador que se agota
  // convierte el comando en mirar un numero en vez de jugar, y el freno real es
  // el cooldown mas la ventaja de la casa (ver multiplicadorPerdida en economia.js).
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
  const esOwnerPrincipal = isMainOwner(sender, msg.key.fromMe, groupMeta);
  if (esOwnerPrincipal) {
    // Al owner principal el contador no le cuenta los mensajes (es lo que lo
    // mantiene fuera de !count y de los tops), así que preguntarle al contador
    // siempre devolvía 0 y era el único del grupo que jamás podía cobrar el plus
    // por actividad — castigado justo por el mecanismo que lo protege. Se le da
    // el TOPE directamente: de todo el grupo es quien más escribe.
    plusActividad = ACTIVIDAD_TOPE;
  } else {
    try {
      mensajes = await getUserCount(jid, sender);
      // Acumulativo: un escalón por cada ACTIVIDAD_MSGS, con tope. Antes era un
      // interruptor de sí/no y el que llevaba 40.000 mensajes iba igual que el
      // que acababa de pasar de 1.000.
      plusActividad = bonoActividad(mensajes);
    } catch { /* si el contador falla, se tira sin plus */ }
  }

  // ¿Esta tirada cobra? Las primeras TIRADAS_PAGADAS del día pagan de verdad;
  // de ahí en adelante la tirada sigue funcionando pero es cara o cruz a valor
  // esperado cero. Es lo que permite que las de arriba paguen bien sin que
  // nadie pueda fabricar aura dándole al botón toda la noche.
  //
  // Si el contador falla se cobra: preferimos regalar una tirada a bloquear el
  // comando por un problema de disco.
  let tiradasHoy = 1;
  try { tiradasHoy = await contarTirada(jid, sender); } catch { /* se cobra */ }
  const dePago = tiradasHoy <= TIRADAS_PAGADAS;

  let { tier, amount } = rollAura(selfIsOwner, selfIsAdmin, plusActividad, dePago);

  // VETERANIA: mas aura cuando ganas, segun lo escrito en total.
  //
  // La otra veterania —la que sube la probabilidad— se agota contra P_TOPE a los
  // ~1.700 mensajes, asi que a partir de ahi escribir no daba NADA en un bot
  // cuya unica progresion es escribir. El tope no se toca (esta ahi para que
  // ningun miembro alcance a un admin), asi que la veterania se paga en cantidad.
  // Solo toca lo GANADO: no reduce el castigo al perder.
  const vet = bonoVeterania(mensajes);
  let extraVet = 0;
  if (amount > 0 && vet > 0) {
    extraVet = Math.round(amount * vet);
    amount += extraVet;
  }
  const sign = amount >= 0 ? '+' : '-';

  const { previous, current } = await addAura(jid, sender, amount);

  // Already in the red and going deeper: use spiral phrases
  const effectiveTier = (previous < 0 && amount < 0) ? 'spiral' : tier;

  const text =
    `*@${sender.split('@')[0]} ${sign}${fmt(Math.abs(amount))} de aura*\n` +
    `${pickFresh(AURA[effectiveTier], `${jid}|aura|${effectiveTier}`)}\n\n` +
    `Aura total: *${fmt(current)}*` +
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
    ((plusActividad || extraVet) && !esOwnerPrincipal
      ? `\n_Veterano (${fmt(mensajes)} msgs):` +
        (plusActividad ? ` +${Math.round(plusActividad * 100)}% de suerte` : '') +
        (plusActividad && extraVet ? ' ·' : '') +
        (extraVet ? ` +${Math.round(vet * 100)}% de botín (+${fmt(extraVet)})` : '') +
        '_'
      : '') +
    '';

  await sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: msg });
}

module.exports = { cmdAura };
