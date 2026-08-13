const { isOwner, isMainOwner, isAdmin, getTarget, getSender, canonicalJid, sameUser, soloMiembros } = require('../utils/wa');
const { pickFresh, fmt } = require('../utils/helpers');
const { getAura, addAura, getAuraRanking } = require('../utils/auraStore');
const { getUserCount } = require('../utils/messageCounter');
const { contarTirada } = require('../utils/casinoStore');
const { TIRADA, P_POSITIVA, ACTIVIDAD_MSGS, ACTIVIDAD_BONO, ACTIVIDAD_TOPE, P_TOPE, MULT_CASTIGO, MULT_CASTIGO_GRANDE, P_TRAMO_GRANDE, TIRADAS_PAGADAS, bonoActividad, APUESTA, PRECIOS, ARRANQUE, MILLONARIO, rango } = require('../utils/economia');
const { APUESTA_GANA, APUESTA_PIERDE } = require('../data/apuestaPhrases');
const { auraApagada, avisarApagada, toggleAura, reiniciarAviso } = require('../utils/auraSwitch');
const { BOTE, CONTRA, RACHA } = require('../utils/economia');
const { aportarAlBote } = require('../utils/roboStore');

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
const ROLL_COOLDOWN_MS = 15 * 60 * 1000;
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
   'Ganaste tan limpio que nadie pudo decir ni una puta cosa. Y eso aquí no pasa nunca, joder. Y el grupo tomó nota, patético.',

   'El chat se frenó de verdad. No por respeto: por sorpresa de que fueras tú, cabrón. mierda Sin anestesia posible, miserable.',

   'Hoy te tocó estar arriba y al grupo le jodió admitirlo. Se les notó en la cara.',

   'Sacaste un número que obligó a esta gente a tragar saliva. Algunos todavía lo digieren.',

   'Nadie te felicitó y eso es lo mejor: la envidia muda es el premio gordo, coño. gilipollas Se te ve a la legua, qué vergüenza.',

   'Ganaste con una frialdad que no te conocían. El chat no supo cómo cojones reaccionar, asco. Y el grupo tomó nota, patético.',

   'Esa tirada hizo ruido en un chat que llevaba semanas riéndose de ti. Ahora callan,. asco Sin anestesia posible, asco, fracasado.',

   'El grupo tuvo que tragarse el guion que preparaba. Les cambiaste el puto plan en un turno.',

   'Hoy el aura se inclinó hacia ti. Raro, incómodo y bien merecido. No te acostumbres, patético.',

   'Nadie quiso ser el primero en hablar después de tu tirada. Ese silencio es tu trofeo, basura Se te ve a la legua, fracasado.',

   'Te miraron distinto un segundo. Ese segundo ya no te lo quitan, ridículo. joder. Y el grupo tomó nota, basura.',

   'Ganaste tan fuerte que hasta tus haters tuvieron que cerrar el hocico, fracasado. mierda Sin anestesia posible, qué cutre.',

   'El silencio después de tu número pesó más que cualquier comentario de mierda,. coño.ajena.',

   'Por una vez no fuiste el chiste del grupo. Les costó, pero tuvieron que mirarte diferente.',

   'Sacaste algo tan grande que el chat se quedó sin el chiste preparado, gilipollas. gilipollas Se te ve a la legua, indignante.',

   'Hoy mandaste callar a gente que solo sabe hablar de ti en broma, mierda. patético. Y el grupo tomó nota, patético.',

   'La mesa se quedó quieta un segundo real. Eso es peso, no cortesía, cabrón. asco Sin anestesia posible, asco, da vergüenza.',

   'Nadie dijo bien jugado porque les habría dolido admitirlo. Ahí está la diferencia, asco. basura.',

   'Ganaste y la sala se enfrió. Pasa cuando gana quien no debería,. ridículo.desastre.',

   'El chat cambió de tema porque no sabía cómo reírse de esto, patético. fracasado Se te ve a la legua, fracasado.',

   'Hoy te ganaste que esta gente se quedara sin palabras por tu culpa, basura. joder. Y el grupo tomó nota, patético.',

   'Entraste sin ruido y saliste con el grupo callado. Eso no pasa dos veces, ridículo. mierda Sin anestesia posible, miserable.',

   'El número habló. y el chat obedeció. Primera vez que te pasa en serio, fracasado.',

   'Les jodió verte arriba. Se notó en cada mensaje que no mandaron,. cabrón.',

   'Ganaste limpio y el respeto forzado es más rico que el aplauso, coño. gilipollas Se te ve a la legua, qué vergüenza.',

   'Hoy el aura te usó de ejemplo al revés: de los que sí pueden, gilipollas. patético. Y el grupo tomó nota, patético.',

   'Nadie tenía el gag listo porque el gag eras tú perdiendo. Hoy no, mierda. asco Sin anestesia posible, asco, fracasado.',

   'Sacaste respeto a la fuerza. El chat lo pagó en silencio, cabrón. basura.',

   'Te tocó el turno bueno y el grupo tuvo que tragar, asco. ridículo, joder.grima.',

   'Esa tirada no se discute: se archiva y se odia en privado,. fracasado Se te ve a la legua, fracasado.',

   'Ganaste de puta madre y nadie te lo va a poner fácil la próxima, patético. joder. Y el grupo tomó nota, basura.',

   'El chat te miró como se mira a un accidente bueno. Raro y real, basura. mierda Sin anestesia posible, qué cutre.',

   'Hoy no hubo debate. El número cerró el puto caso, ridículo. coño, joder.pena ajena.',

   'Les cambiaste el humor del hilo en un solo turno, fracasado. cabrón, joder.vacío.',

   'Silencio de verdad después de tu tirada. Ese es el sonido del respeto a regañadientes, joder Se te ve a la legua, indignante.',

   'Ganaste y hasta los cínicos se quedaron cortos de chiste, coño. patético. Y el grupo tomó nota, patético.',

   'El aura te dio el momento y el grupo no supo cómo restártelo, gilipollas. asco Sin anestesia posible, asco, da vergüenza.',

   'Hoy fuiste el problema del resto. Qué rico se siente, mierda. basura.',

   'Sacaste un resultado que no se limpia con un meme, cabrón. ridículo, joder.desastre.',

   'Nadie te lo celebra en voz alta. Mejor: así duele más, asco. fracasado Se te ve a la legua, fracasado.',

   'Ganaste fuerte. y el chat aprendió una lección que no quería,. joder. Y el grupo tomó nota.',

   'Te pusiste arriba y el suelo se notó bajo para los demás, patético. mierda Sin anestesia posible, miserable.',

   'Esa tirada te compró un minuto de respeto. Úsalo antes de volver a ser tú, basura.',

   'El grupo entero se tragó el orgullo. Un trago amargo, ridículo. cabrón.',

   'Hoy el número te hizo el favor que tus mensajes no consiguen, fracasado. gilipollas Se te ve a la legua, qué vergüenza.',

   'Ganaste y el silencio fue más elocuente que cualquier roast,. patético. Y el grupo tomó nota, patético.',

   'Les quitaste el libreto. Sin libreto este chat se pone nervioso, coño. asco Sin anestesia posible, asco, fracasado.',

   'Sacaste respeto por la vía rápida: el marcador, gilipollas. basura, joder.miseria.',

   'Hoy no eras el gag. Eras el que apagó el gag, mierda. ridículo, joder.grima.',

   'El aura te bendijo y al grupo le supo a veneno, cabrón. fracasado Se te ve a la legua, fracasado, qué nivel de pena.',

   'Ganaste tan claro que hasta el más listo se calló, asco. joder. Y el grupo tomó nota.',

   'Te tocó el premio gordo del silencio ajeno,. mierda Sin anestesia posible, mierda.',

   'El chat no discute lo evidente. Hoy lo evidente eras tú arriba, patético. coño.ajena.',

   'Sacaste un golpe limpio en un grupo que solo espera tu fail, basura.',

   'Hoy el respeto te miró de reojo y tuvo que quedarse, ridículo. gilipollas Se te ve a la legua, indignante.',

   'Ganaste y el historial de burlas se quedó sin munición un rato, fracasado. patético. Y el grupo tomó nota, patético.',

   'Nadie tenía plan B para cuando tú ganas. Se notó,. asco Sin anestesia posible, asco.',

   'El número te puso en un sitio que el chat no te había reservado, coño. basura.',

   'Hoy te salió el tiro y al grupo le dio en la frente, gilipollas. ridículo.desastre.',

   'Silencio pesado después de tu tirada. Eso no se compra, mierda. fracasado Se te ve a la legua, fracasado.',

   'Ganaste de verdad. El resto es envidia con WiFi, cabrón. joder. Y el grupo tomó nota.',

   'Les rompiste el pronóstico y el pronóstico eras tú perdiendo, asco. mierda Sin anestesia posible, miserable.',

   'Hoy el aura habló más alto que los haters,. coño, joder.cringe.',

   'Te llevaste el respeto que nadie pensaba soltar, patético. cabrón.',

   'Sacaste un resultado que obliga a mirarte distinto aunque duela, basura. gilipollas Se te ve a la legua, qué vergüenza.',

   'El chat se quedó sin el chiste fácil. Gracias por el favor, ridículo. patético. Y el grupo tomó nota, patético.',

   'Ganaste y el eco del silencio valió más que mil stickers, fracasado. asco Sin anestesia posible, asco, fracasado.',

   'Hoy no hubo almost: hubo victoria y cara de pocos amigos alrededor,. basura.',

   'El grupo tuvo que aceptar lo obvio. Les costó cada segundo, coño. ridículo.grima.',

   'Sacaste peso real en un chat de pluma, gilipollas. fracasado Se te ve a la legua, fracasado, joder.de pena.',

   'Te tocó arriba y el suelo del grupo crujió un poco, mierda. joder. Y el grupo tomó nota.',

   'Ganaste limpio. El resto del hilo se fue a la mierda solo, cabrón. mierda Sin anestesia posible, qué cutre.',

   'Hoy el marcador te hizo el favor que tu reputación no merecía, asco. coño, joder.ajena.',

   'Nadie te lo va a recordar mañana. Disfrútalo hoy,. cabrón, joder.vacío.',

   'El aura te dio el micrófono. y el chat se calló, patético. gilipollas Se te ve a la legua, indignante.',

   'Sacaste un número que no admite narrador de consolación, basura. patético. Y el grupo tomó nota, patético.',

   'Ganaste y hasta el más valiente se hizo el muerto, ridículo. asco Sin anestesia posible, asco, da vergüenza.',

   'Hoy fuiste la excepción que el grupo no quería firmar, fracasado. basura.',

   'Te salió redondo y el odio ajeno se quedó sin ángulo,. ridículo, joder.desastre.',

   'El silencio del chat es tu puto aplauso de esta noche, coño. fracasado Se te ve a la legua, fracasado.',

   'Ganaste fuerte. No te creas eterno: aquí todo se olvida, gilipollas. joder. Y el grupo tomó nota, patético.',

   'Les diste en el orgullo con un solo número, mierda. Sin anestesia posible, mierda.',

   'Hoy el aura te puso donde el chat no te quería ver, cabrón. coño, joder.cringe.',

   'Sacaste respeto a regañadientes. El mejor tipo de respeto, asco. cabrón.',

   'Ganaste y el gag colectivo se quedó sin protagonista,. gilipollas Se te ve a la legua, gilipollas, qué vergüenza.',

   'El número cerró el debate antes de que empezara, patético. patético. Y el grupo tomó nota, patético, ridículo.',

   'Te tocó el turno de hacer tragar a esta gente, basura. asco Sin anestesia posible, asco.',

   'Hoy no fallaste. El chat no sabía qué hacer con eso, ridículo. basura.',

   'Ganaste de puta madre y el historial de fail se quedó corto, fracasado. ridículo.',

   'Silencio real. Respeto forzado. Envidia muda. Todo tuyo,. fracasado Se te ve a la legua, fracasado, qué nivel de pena.',

   'Les cambiaste el humor del grupo con una tirada, coño. joder. Y el grupo tomó nota.',

   'Sacaste el resultado que nadie apostaba por ti, gilipollas. mierda Sin anestesia posible, mierda, qué cutre.',

   'Hoy el aura te hizo el favor y al resto les hizo un favor al revés, mierda. coño.ajena.',

   'Ganaste. Punto. El resto es ruido de perdedores, cabrón. cabrón, joder.vacío.',

   'Te miraron como se mira a un problema nuevo. Qué rico, asco. gilipollas Se te ve a la legua, indignante.',

   'El chat se quedó sin plan de burla. Gracias por el caos,. patético. Y el grupo tomó nota, patético, qué vergüenza ajena.',

   'Sacaste un golpe que no se limpia con un emoji, patético. asco Sin anestesia posible, asco.',

   'Hoy estuviste arriba y se notó en cada silencio, basura. basura, joder.flojo.',

   'Ganaste limpio en un basurero de opiniones, ridículo. ridículo, joder.desastre.',

   'El número te coronó por un minuto. Eso aquí es una eternidad, fracasado. fracasado Se te ve a la legua, fracasado.',

  ],
  gain: [
   'Sumaste algo. No es para montar un puto desfile, pero al menos hoy no diste el papelón, joder Y el grupo tomó nota.',

   'Te tiraron una migaja decente. Agárrala y cierra el hocico antes de que se arrepientan, cabrón Sin anestesia posible.',

   'Pequeña subida. El grupo lo vio, bostezó y siguió. No esperes aplausos.',

   'Ganaste poquito. Tan poco que pregonarlo ya suena a necesidad.',

   'Subiste un peldaño. No te confíes: el siguiente suele ser hacia abajo, coño. gilipollas Se te ve a la legua.',

   'Te llevaste algo y cerraste el turno sin hacer el ridículo. Tu mejor versión, asco. patético Y el grupo tomó nota, patético.',

   'Suma pequeña, ego grande si te descuidas. No la cagues celebrando, patético. asco Sin anestesia posible, asco.',

   'Hoy no perdiste. En este chat eso ya es noticia, basura. basura, joder..',

   'Te dieron un empujón mínimo. Úsalo o vuelve a ser paisaje, ridículo. ridículo.',

   'Subida discreta. El chat ni se inmutó. Perfecto para no llamar al karma, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Sumaste sin fanfarria. Lo único inteligente que has hecho en semanas,. joder Y el grupo tomó nota.',

   'Un poco de aura. No te conviertas en el que lo anuncia en mayúsculas, cabrón. mierda Sin anestesia posible.',

   'Ganancia tibia. Mejor que el fail de siempre, igual de olvidable.',

   'Te tocó subir. El grupo fingió no verlo. Mejor así, mierda. cabrón, joder..',

   'Poco, pero tuyo. No lo conviertas en discurso de motivación, coño. gilipollas Se te ve a la legua.',

   'Hoy el marcador no te humilló. Celebra en silencio, asco. patético Y el grupo tomó nota, patético.',

   'Subiste lo justo para no ser el meme del día. Casi un logro, patético. asco Sin anestesia posible, asco.',

   'Migaja de aura. En tu historial brilla como un faro, basura. basura, joder..',

   'Sumaste y no rompiste nada. Qué novedad tan triste, ridículo. ridículo..',

   'Pequeño gain. El chat ya pasó de página, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Te subieron un poco la barra. No te asomes a mirar abajo,. joder. Y el grupo tomó nota.',

   'Ganaste menos de lo que soñabas y más de lo que merecías, cabrón. mierda Sin anestesia posible.',

   'Hoy no bajaste. En tu currículum eso es un encabezado, gilipollas. coño.',

   'Suma ligera. No inventes una saga alrededor, mierda. cabrón.',

   'Te dieron aire. No lo gastes gritando, coño. gilipollas Se te ve a la legua, gilipollas.',

   'Subida sin drama. Lo más adulto que has hecho aquí, asco. patético. Y el grupo tomó nota, patético.',

   'Poco aura nuevo. Suficiente para no ser el pobre del hilo, patético. asco Sin anestesia posible, asco.',

   'Ganaste de penalti. Tómalo y cállate, basura. basura.',

   'El marcador te sonrió de lado. No te enamores, ridículo. ridículo.',

   'Hoy sumaste. Mañana el chat ya no se acordará, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Un empujón mínimo en un historial de caídas,. joder. Y el grupo tomó nota.',

   'Te tocó gain. No lo conviertas en personalidad, cabrón. mierda Sin anestesia posible, mierda.',

   'Subiste sin merecer el desfile. Bien por el silencio, gilipollas. coño.',

   'Poco, limpio, olvidable. Ideal para ti, mierda. cabrón.',

   'Hoy el aura no te escupió. Eso ya es progreso, coño. gilipollas Se te ve a la legua, gilipollas.',

   'Sumaste migajas. En tu mesa parecen banquete, asco. patético. Y el grupo tomó nota, patético.',

   'Ganancia discreta. El grupo no necesita narrador, patético. asco Sin anestesia posible, asco.',

   'Te subieron un punto. No firmes autobiografía, basura. basura.',

   'Hoy no fuiste el fail. Disfruta el anonimato, ridículo. ridículo.',

   'Suma pequeña y ego en observación, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Te dieron algo. No pidas propina de respeto,. joder. Y el grupo tomó nota.',

   'Subida de las que no generan meme. Bendita mediocridad, cabrón. mierda Sin anestesia posible.',

   'Ganaste poquito. y el chat lo digirió sin atragantarse, gilipollas. coño.',

   'Hoy el número no te delató. Qué alivio tan triste, mierda. cabrón.',

   'Empujón mínimo. No lo conviertas en hilo de 40 mensajes, coño. gilipollas Se te ve a la legua.',

   'Sumaste. Punto. El resto es relleno, asco. patético. Y el grupo tomó nota, patético.',

   'Te tocó un gain tibio. Perfecto para no creértelo, patético. asco Sin anestesia posible, asco.',

   'Poco aura. Suficiente para no pedir limosna de atención, basura. basura.',

   'Hoy subiste sin espectáculo. Aprende de eso, ridículo. ridículo.',

   'Ganancia sin aplauso. El mejor escenario para no cagarla, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Te subieron la moral un milímetro. No abuses,. joder. Y el grupo tomó nota.',

   'Suma ligera en un océano de pérdidas, cabrón. mierda Sin anestesia posible, mierda.',

   'Hoy no bajaste el promedio del grupo. Casi un favor, gilipollas. coño.',

   'Migaja de victoria. Guárdala donde no se te pierda, mierda. cabrón.',

   'Ganaste de callado. Sigue así, coño. gilipollas Se te ve a la legua, gilipollas.',

   'Subida sin narrativa épica. Gracias por no inventarla, asco. patético. Y el grupo tomó nota, patético.',

   'Te tocaron unos puntos. No son un mandato divino, patético. asco Sin anestesia posible, asco.',

   'Hoy el aura te dio el mínimo vital, basura. basura.',

   'Suma pequeña, drama cero. Qué raro se te ve, ridículo. ridículo.',

   'Ganaste algo. El chat ya está en otra cosa, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Empujón discreto. No lo conviertas en identidad,. joder. Y el grupo tomó nota.',

   'Te subieron sin pedir opinión al grupo. Mejor, cabrón. mierda Sin anestesia posible, mierda.',

   'Poco pero positivo. En tu gráfica es un milagro, gilipollas. coño.',

   'Hoy no fuiste noticia mala. Eso ya basta, mierda. cabrón.',

   'Gain tibio. Cierra el turno y no insistas, coño. gilipollas Se te ve a la legua, gilipollas.',

   'Sumaste y el silencio fue de indiferencia, no de respeto, asco. patético. Y el grupo tomó nota, patético.',

   'Te dieron aire fresco. No lo contamines con tu ego, patético. asco Sin anestesia posible, asco.',

   'Subida mínima. No mereces desfile ni te lo van a dar, basura. basura.',

   'Hoy el marcador te dejó vivir. Aprovecha, ridículo. ridículo.',

   'Ganaste menos de un titular y más de una derrota, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Puntos de consolación con disfraz de victoria,. joder. Y el grupo tomó nota.',

   'Te tocó subir. El karma ya está revisando el recibo, cabrón. mierda Sin anestesia posible, mierda.',

   'Suma sin fanfarria. Lo único decente del día, gilipollas. coño.',

   'Hoy no perdiste aura. En este chat eso es almost victoria.',

   'Migaja limpia. No la ensucies celebrando como idiota, coño. gilipollas Se te ve a la legua.',

   'Ganaste poquito. El grupo ni abrió el hilo, asco. patético. Y el grupo tomó nota, patético.',

   'Subida de las que no cambian tu reputación, patético. asco Sin anestesia posible, asco.',

   'Te dieron un respiro. No lo conviertas en discurso, basura. basura.',

   'Hoy el número no te humilló. Guarda el momento, ridículo. ridículo.',

   'Gain discreto. Perfecto para no despertar al odio, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Sumaste. El chat bostezó. Equilibrio restaurado,. joder. Y el grupo tomó nota.',

   'Te subieron un poco la autoestima prestada, cabrón. mierda Sin anestesia posible, mierda.',

   'Poco aura nuevo. No firmes contratos con el destino, gilipollas. coño.',

   'Hoy estuviste en verde. No te hagas el empresario, mierda. cabrón.',

   'Suma ligera y sin testigos emocionados, coño. gilipollas Se te ve a la legua, gilipollas.',

   'Ganaste lo justo para no ser el pobre del turno, asco. patético. Y el grupo tomó nota, patético.',

   'Empujón mínimo. Silencio máximo. Ideal, patético. asco Sin anestesia posible, asco.',

   'Te tocaron puntos. No son una disculpa del universo, basura. basura.',

   'Hoy subiste sin romper el chat. Milagro administrativo, ridículo. ridículo.',

   'Gain tibio. Tómalo y vuelve a la fila, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Sumaste algo olvidable. Como casi todo lo tuyo,. joder. Y el grupo tomó nota.',

   'Te dieron un empujón. No pidas que te carguen, cabrón. mierda Sin anestesia posible, mierda.',

   'Poca subida, cero espectáculo. Así da menos asco, gilipollas. coño.',

   'Hoy el aura no te escupió a la cara. Progreso, mierda. cabrón.',

   'Suma pequeña. El historial sigue siendo una debacle, coño. gilipollas Se te ve a la legua.',

   'Ganaste sin merecer titulares. No los inventes, asco. patético. Y el grupo tomó nota, patético.',

   'Subida discreta en un currículum de caídas, patético. asco Sin anestesia posible, asco.',

   'Te tocó gain. El grupo ya está en el siguiente fail, basura. basura.',

   'Puntos de más. No los conviertas en personalidad, ridículo. ridículo.',

   'Hoy no bajaste. Celebración en modo avión, fracasado. fracasado Se te ve a la legua, fracasado, qué miseria.',

  ],
  loss: [
   'Bajaste y nadie se inmutó. Ya es paisaje verte perder aura,. joder Y el grupo tomó nota.',

   'Se te escurrió más presencia. El chat lo anotó y siguió a lo suyo, cabrón. mierda Sin anestesia posible.',

   'Perdiste. Otra vez. Ni gracia generas: solo cara de obvio que iba a ser él.',

   'Te restaron y cerraste el turno como siempre: sin ruido y sin que nadie note.',

   'Bajaste otra vez y el grupo bostezó. Tu derrota es lo más predecible del chat, coño. gilipollas Se te ve a la legua.',

   'Perdiste aura como quien pierde las llaves: otra vez, sin sorpresa, asco. patético Y el grupo tomó nota, patético.',

   'El marcador te bajó y el hilo ni se enteró. Eres ruido de fondo del fail, patético. asco Sin anestesia posible, asco.',

   'Hoy el aura te quitó un poco más de dignidad prestada, basura. basura.',

   'Caída pequeña pero constante. Así se construye un sótano, ridículo. ridículo.',

   'Te bajaron sin ceremonia. Ni para perder eres espectáculo, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Perdiste. y el chat usó tu nombre como relleno de conversación,. joder Y el grupo tomó nota.',

   'Otra bajada. El historial ya no admite sorpresa, cabrón. mierda Sin anestesia posible, mierda.',

   'Se te fue un poco más de aura. El grupo firmó el parte sin leerlo.',

   'Hoy perdiste con la elegancia de un tropiezo en pasillo, mierda. cabrón..',

   'Bajaste. El silencio no fue respeto: fue indiferencia, coño. gilipollas Se te ve a la legua.',

   'Te restaron puntos y la autoestima de plástico crujió, asco. patético Y el grupo tomó nota, patético.',

   'Pérdida rutinaria. Como el clima, como tú, patético. asco Sin anestesia posible, asco.',

   'El aura te dio un toque. El chat ni levantó la vista, basura. basura.',

   'Hoy no ganaste. Noticia del año, ridículo. ridículo, joder..',

   'Caíste un poco. El agujero ya estaba excavado, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Perdiste aura en modo avión: nadie se enteró y a nadie le importó,. joder Y el grupo tomó nota.',

   'Bajada sin drama. El drama lo pones tú después, cabrón. mierda Sin anestesia posible, mierda.',

   'Te quitaron presencia. Te sobraba poco, gilipollas. coño, joder..',

   'Hoy el marcador fue honesto contigo. Duele, mierda. cabrón, joder..',

   'Pérdida discreta. Tu especialidad, coño. gilipollas Se te ve a la legua, gilipollas.',

   'Se te resbaló el aura. Otra vez el mismo charco, asco. patético Y el grupo tomó nota, patético.',

   'Bajaste y el grupo cambió de tema antes de que acabarás de leer, patético. asco Sin anestesia posible, asco.',

   'Te restaron. El universo en modo automático, basura. basura, joder..',

   'Caída ligera en una carrera de descensos, ridículo. ridículo, joder..',

   'Hoy perdiste sin merecer ni el roast completo, fracasado. fracasado Se te ve a la legua, fracasado.',

   'El aura te recortó. El chat bostezó en estéreo,. joder Y el grupo tomó nota.',

   'Bajaste puntos. Subiste en ridículo, cabrón. mierda Sin anestesia posible, mierda.',

   'Pérdida de las que ya no generan meme. Estás quemado, gilipollas. coño.',

   'Te bajaron el volumen de presencia. Casi un favor, mierda. cabrón, joder..',

   'Hoy el número te delató otra vez, coño. gilipollas Se te ve a la legua, gilipollas.',

   'Se te fue aura. Se te fue también la esperanza de disimulo, asco. patético Y el grupo tomó nota, patético.',

   'Bajada previsible. El chat tenía el libreto, patético. asco Sin anestesia posible, asco.',

   'Perdiste con cara de siempre. El grupo también, basura. basura, joder..',

   'Te restaron sin odio. Peor: con indiferencia, ridículo. ridículo, joder..',

   'Caíste un escalón más hacia el sótano, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Hoy el aura no te pegó fuerte. Te pegó con desgana,. joder. Y el grupo tomó nota.',

   'Bajaste. El historial aplaudió en silencio, cabrón. mierda Sin anestesia posible, mierda.',

   'Pérdida menor, daño a la reputación mayor, gilipollas. coño.',

   'Te quitaron un poco. Te queda el hueco de siempre, mierda. cabrón.',

   'El marcador te hizo lo de siempre. Tú también, coño. gilipollas Se te ve a la legua, gilipollas.',

   'Hoy no hubo sorpresa: hubo pérdida, asco. patético. Y el grupo tomó nota, patético.',

   'Bajada rutinaria en tu temporada de fallos, patético. asco Sin anestesia posible, asco.',

   'Perdiste aura. y el chat ganó tranquilidad, basura. basura.',

   'Te restaron presencia. Nadie pidió el replay, ridículo. ridículo.',

   'Caída sin espectadores emocionados. Hasta perder aburre, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Hoy el aura te bajó el sueldo de dignidad,. joder. Y el grupo tomó nota.',

   'Bajaste puntos como quien pierde calcetines, cabrón. mierda Sin anestesia posible, mierda.',

   'Pérdida tibia. El odio ni se activó, gilipollas. coño.',

   'Te delató el número otra vez. Qué original, mierda. cabrón.',

   'Se te escurrió aura. El grupo ni puso el cubo, coño. gilipollas Se te ve a la legua, gilipollas.',

   'Hoy perdiste en modo paisaje, asco. patético. Y el grupo tomó nota, patético.',

   'Bajada de las que suman al promedio de fail, patético. asco Sin anestesia posible, asco.',

   'El aura te recortó sin anestesia y sin público, basura. basura.',

   'Te restaron. Fin del comunicado, ridículo. ridículo.',

   'Caíste. El chat ya estaba en otra cosa, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Hoy no ganaste respeto. Perdiste el poco que te prestaban,. joder. Y el grupo tomó nota.',

   'Bajaste y ni el karma se inmutó, cabrón. mierda Sin anestesia posible, mierda.',

   'Pérdida discreta, historial escandaloso, gilipollas. coño.',

   'Te quitaron aura. Te dejaron el nick, mierda. cabrón.',

   'El número fue sincero. Tú no, coño. gilipollas Se te ve a la legua, gilipollas.',

   'Hoy el descenso fue administrativo, asco. patético. Y el grupo tomó nota, patético.',

   'Bajada sin gritos. El silencio te delata igual, patético. asco Sin anestesia posible, asco.',

   'Perdiste puntos. Ganaste en predecible, basura. basura.',

   'Te restaron presencia en el mapa del grupo, ridículo. ridículo.',

   'Caída ligera, trayectoria pesada, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Hoy el aura te trató como al paisaje: te restó y siguió,. joder. Y el grupo tomó nota.',

   'Bajaste. El libreto del chat no necesitó reescritura, cabrón. mierda Sin anestesia posible, mierda.',

   'Pérdida de las que ya no sorprenden ni a tu madre, gilipollas. coño.',

   'Te delató el marcador con la misma cara de siempre, mierda. cabrón.',

   'Se te fue un poco más. El agujero agradece, coño. gilipollas Se te ve a la legua, gilipollas.',

   'Hoy perdiste sin merecer trending, asco. patético. Y el grupo tomó nota, patético.',

   'Bajada silenciosa. El fail también puede ser introvertido, patético. asco Sin anestesia posible, asco.',

   'El aura te bajó el volumen. El chat agradeció, basura. basura.',

   'Te restaron. No hay nota al pie, ridículo. ridículo.',

   'Caíste otro tramo del mismo tobogán, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Hoy el número te dejó donde siempre: un poco más abajo,. joder. Y el grupo tomó nota.',

   'Bajaste puntos y el ego no se enteró a tiempo, cabrón. mierda Sin anestesia posible, mierda.',

   'Pérdida menor en un festival de derrotas, gilipollas. coño.',

   'Te quitaron aura como quien quita polvo, mierda. cabrón.',

   'El marcador sigue siendo tu único crítico honesto, coño. gilipollas Se te ve a la legua.',

   'Hoy no hubo drama. Hubo pérdida, asco. patético. Y el grupo tomó nota, patético.',

   'Bajada previsible con sello de calidad industrial, patético. asco Sin anestesia posible, asco.',

   'Perdiste. El grupo no pidió explicaciones, basura. basura.',

   'Te restaron presencia. Te sobraba el disimulo, ridículo. ridículo.',

   'Caída sin narrativa. Ni para perder tienes guion, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Hoy el aura te hizo el favor de no avisar al chat,. joder. Y el grupo tomó nota.',

   'Bajaste y el hilo ni se arrugó, cabrón. mierda Sin anestesia posible, mierda.',

   'Pérdida tibia. Tu temperatura favorita, gilipollas. coño.',

   'Te delató otra vez el puto número, mierda. cabrón.',

   'Se te escurrió aura. El suelo ya conocía el camino, coño. gilipollas Se te ve a la legua.',

   'Hoy perdiste en silencio de biblioteca, asco. patético. Y el grupo tomó nota, patético.',

   'Bajada de trámite. Firma aquí, patético. asco Sin anestesia posible, asco, joder.de pena.',

   'El aura te recortó el presupuesto de respeto, basura. basura.',

   'Te restaron. Caso cerrado sin forense, ridículo. ridículo, joder.cutre.',

   'Caíste. El promedio del grupo mejoró un poco, fracasado. fracasado Se te ve a la legua, fracasado, da pena ajena.',

  ],
  spiral: [
   'Sigues bajando. y el chat ya ni levanta la vista cuando sale tu nombre,. joder Y el grupo tomó nota.',

   'Otra caída y ni un mensaje. Ese silencio es tu verdadero marcador, cabrón. mierda Sin anestesia posible.',

   'Llevas tantas seguidas que ganar te daría un susto de muerte.',

   'Otra pérdida para un historial que ya no admite más. Pero tú encuentras sitio.',

   'Tu racha negativa es tan larga que el grupo la usa de referencia temporal, coño. gilipollas Se te ve a la legua.',

   'Sigues en rojo y profundizando. El sótano te reconoce por el olor, asco. patético Y el grupo tomó nota, patético.',

   'Cada tirada te empuja un poco más abajo. El chat ya ni cuenta, patético. asco Sin anestesia posible, asco.',

   'Spiral mode: pierdes, respiras, vuelves a perder. Coreografía perfecta, basura. basura.',

   'El agujero no tiene fondo y tú sigues excavando con entusiasmo, ridículo. ridículo.',

   'Otra bajada en la racha. El grupo pone la cuenta en piloto automático, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Estás en la zona donde perder ya no duele: solo confirma,. joder Y el grupo tomó nota.',

   'Sigue el descenso. El historial pide clemencia y no se la das, cabrón. mierda Sin anestesia posible.',

   'Racha de mierda con firma autógrafa tuya, gilipollas. coño, joder..',

   'Cada número negativo te queda de tatuaje invisible, mierda. cabrón, joder..',

   'El chat te ve caer y cambia de canal mental, coño. gilipollas Se te ve a la legua, gilipollas.',

   'Spiral: el arte de empeorar con constancia, asco. patético Y el grupo tomó nota, patético.',

   'Bajas otra vez. El sótano aplaude en eco, patético. asco Sin anestesia posible, asco.',

   'Tu racha negativa ya tiene nombre propio en el grupo, basura. basura.',

   'Sigues perdiendo como quien colecciona sellos, ridículo. ridículo, joder..',

   'Otra tirada, otro escalón hacia el olvido útil, fracasado. fracasado Se te ve a la legua, fracasado.',

   'El rojo te queda de uniforme. Hoy también,. joder Y el grupo tomó nota.',

   'Caes y caes. El chat ya trajo palomitas mentales, cabrón. mierda Sin anestesia posible, mierda.',

   'Racha tan larga que parece proyecto personal, gilipollas. coño, joder..',

   'Sigues en negativo como pez en el agua, mierda. cabrón, joder..',

   'Cada pérdida suma al monumento del fail, coño. gilipollas Se te ve a la legua, gilipollas.',

   'El spiral te abraza y tú le das las gracias, asco. patético Y el grupo tomó nota, patético.',

   'Otra bajada. El suelo pide refuerzos, patético. asco Sin anestesia posible, asco.',

   'Tu historial de pérdidas ya no cabe en un mensaje, basura. basura, joder..',

   'Sigues cayendo. La gravedad te tiene de empleado del mes, ridículo. ridículo.',

   'Racha negativa con disciplina de gimnasio, fracasado. fracasado Se te ve a la legua, fracasado.',

   'El chat enumeró tus caídas y se quedó sin dedos,. joder Y el grupo tomó nota.',

   'Otra más. El sótano renueva el contrato, cabrón. mierda Sin anestesia posible, mierda.',

   'Pierdes en bucle y el bucle ya es tu casa, gilipollas. coño, joder..',

   'Spiral mode activado hace tanto que olvidaste el verde, mierda. cabrón..',

   'Sigues bajando el promedio moral del hilo, coño. gilipollas Se te ve a la legua, gilipollas.',

   'Cada tirada confirma el diagnóstico sin anestesia, asco. patético Y el grupo tomó nota, patético.',

   'Racha de pérdidas con sello de calidad industrial, patético. asco Sin anestesia posible, asco.',

   'El rojo te queda mejor que cualquier victoria tuya, basura. basura, joder..',

   'Otra caída libre sin paracaídas de dignidad, ridículo. ridículo, joder..',

   'Sigues en la montaña rusa pero solo existe el tramo abajo, fracasado. fracasado Se te ve a la legua, fracasado.',

   'El grupo ya no pregunta si perdiste: pregunta cuánto,. joder Y el grupo tomó nota.',

   'Spiral: perder con la fe de quien no conoce otro oficio, cabrón. mierda Sin anestesia posible.',

   'Tu racha negativa es el clima del chat, gilipollas. coño, joder..',

   'Bajas otra vez. El archivo suspira, mierda. cabrón, joder..',

   'Sigues excavando el sótano personal, coño. gilipollas Se te ve a la legua, gilipollas.',

   'Otra pérdida. El eco responde antes que el grupo, asco. patético Y el grupo tomó nota, patético.',

   'Racha tan seria que parece maldición barata, patético. asco Sin anestesia posible, asco.',

   'El aura te empuja abajo y tú no pones freno, basura. basura, joder..',

   'Caes con la constancia de un reloj suizo del fail, ridículo. ridículo..',

   'Spiral mode: el hit single de tu temporada, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Sigues en rojo. El chat cambió de color de tema,. joder Y el grupo tomó nota.',

   'Otra bajada para el museo de tus derrotas, cabrón. mierda Sin anestesia posible, mierda.',

   'Pierdes y el historial te da la razón otra vez, gilipollas. coño, joder..',

   'La racha te posee. Tú solo firmas el parte, mierda. cabrón, joder..',

   'Sigues cayendo sin público entregado. Hasta el odio se aburre, coño. gilipollas Se te ve a la legua.',

   'Spiral sin plot twist. Solo gravedad, asco. patético Y el grupo tomó nota, patético.',

   'Otra pérdida. El sótano te pone apodo, patético. asco Sin anestesia posible, asco.',

   'Tu descenso ya es contenido evergreen del grupo, basura. basura.',

   'Bajas. El marcador no se sorprende. Nadie lo hace, ridículo. ridículo.',

   'Racha negativa con vocación de eternidad, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Sigues en el pozo y pides otra pala,. joder. Y el grupo tomó nota.',

   'El aura te confirma el sótano cada puta tirada, cabrón. mierda Sin anestesia posible, mierda.',

   'Otra más. El chat ni abre la notificación, gilipollas. coño.',

   'Spiral: arte contemporáneo de empeorar, mierda. cabrón.',

   'Pierdes con disciplina. Qué talento tan inútil, coño. gilipollas Se te ve a la legua, gilipollas.',

   'La racha te viste de rojo y no te queda otra ropa, asco. patético. Y el grupo tomó nota, patético.',

   'Sigues bajando. El fondo envía recuerdos, patético. asco Sin anestesia posible, asco.',

   'Otra caída. Firma al pie, basura. basura.',

   'Tu historial negativo es un género literario, ridículo. ridículo.',

   'Spiral mode sin salida de emergencia, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Bajas otra vez. El grupo usa tu racha de reloj,. joder. Y el grupo tomó nota.',

   'El rojo te abraza. Tú le devuelves el abrazo, cabrón. mierda Sin anestesia posible, mierda.',

   'Otra pérdida en la serie infinita, gilipollas. coño.',

   'Sigues en descenso libre con sonrisa de costumbre, mierda. cabrón.',

   'La racha te escribió la biografía, coño. gilipollas Se te ve a la legua, gilipollas.',

   'Caes. El sótano enciende la luz de bienvenida, asco. patético. Y el grupo tomó nota, patético.',

   'Spiral con sello personal. Inconfundible, patético. asco Sin anestesia posible, asco.',

   'Otra bajada. El archivo ya tiene carpeta con tu nombre, basura. basura.',

   'Pierdes y el eco dice te lo dije, ridículo. ridículo.',

   'Sigues profundizando. El chat cerró el telescopio, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Racha de mierda con continuidad argumental,. joder. Y el grupo tomó nota.',

   'El aura te empuja y tú no tienes suelo, cabrón. mierda Sin anestesia posible, mierda.',

   'Otra más al contador del fail eterno, gilipollas. coño.',

   'Spiral: perder como forma de vida, mierda. cabrón.',

   'Bajas. Nadie pone red. Nadie miraba, coño. gilipollas Se te ve a la legua, gilipollas.',

   'Tu racha negativa es el chiste interno del grupo, asco. patético. Y el grupo tomó nota, patético.',

   'Sigues en rojo como pez fuera del agua pero al revés, patético. asco Sin anestesia posible, asco.',

   'Otra caída libre documentada, basura. basura.',

   'El sótano te renueva el alquiler sin preguntar, ridículo. ridículo.',

   'Spiral mode: credits rolling y tú sigues, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Pierdes otra vez. El libreto no cambió una coma,. joder. Y el grupo tomó nota.',

   'La racha te tiene de protagonista involuntario, cabrón. mierda Sin anestesia posible, mierda.',

   'Bajas con la fe del que no conoce el freno, gilipollas. coño.',

   'Otra pérdida. El chat bostezó en 4K, mierda. cabrón.',

   'Sigues cayendo. El fondo manda postales, coño. gilipollas Se te ve a la legua, gilipollas.',

   'Spiral sin final feliz ni final, asco. patético. Y el grupo tomó nota, patético.',

   'Tu descenso es el único arco estable de tu historia, patético. asco Sin anestesia posible, asco, indignante.',

   'El aura firma el parte y tú pones la huella, basura. basura, joder.vergüenza ajena.',

   'Otra bajada. Caso cerrado hasta la próxima tirada, ridículo. ridículo.vergüenza.',

   'Racha negativa con vocación de clasico del chat, fracasado. fracasado Se te ve a la legua, fracasado.',

  ],
  cursed: [
   'Perdiste tanta mierda que el silencio posterior fue puro cringe. Nadie quería mencionarlo, joder Y el grupo tomó nota.',

   'El aura te usó de ejemplo público. El grupo miró, asintió y tomó nota, cabrón. mierda Sin anestesia posible.',

   'Bajaste tan fuerte que hasta tus defensores habituales se hicieron los locos.',

   'Tu resultado fue tan malo que hasta los que disfrutan fails sintieron que era demasiado.',

   'Hoy caíste tan fuerte que el chat se quedó con cara de haber visto algo indebido, coño. gilipollas Se te ve a la legua.',

   'Pérdida de las que dejan marca. El grupo no va a olvidar este número, asco. patético Y el grupo tomó nota, patético.',

   'Te hundieron el aura en vivo. El silencio pesó más que cualquier roast, patético. asco Sin anestesia posible, asco.',

   'Caída pública y sin red. Hasta el karma pidió un respiro, basura. basura.',

   'Hoy el aura te puso de ejemplo de qué no hacer con tu vida, ridículo. ridículo.',

   'Perdiste en grande. El chat archivó el momento con asco educado, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Esa bajada no se limpia con un meme. Se queda en el historial,. joder Y el grupo tomó nota.',

   'Te reventaron el contador. Nadie soltó la carcajada fácil: solo cringe, cabrón. mierda Sin anestesia posible.',

   'Pérdida brutal. El grupo cambió de tema por higiene mental, gilipollas. coño.',

   'Hoy fuiste el aviso sanitario del comando, mierda. cabrón, joder..',

   'Caíste tan hondo que el eco tardó en volver, coño. gilipollas Se te ve a la legua, gilipollas.',

   'El aura te exhibió. El chat no pidió entradas, asco. patético Y el grupo tomó nota, patético.',

   'Pérdida de las que apagan la conversación, patético. asco Sin anestesia posible, asco.',

   'Te bajaron el telón a la fuerza. Sin bis, basura. basura, joder..',

   'Hoy el número te dejó en evidencia sin anestesia, ridículo. ridículo..',

   'Caída libre con público incómodo, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Perdiste tanto que hasta el odio se sintió saturado,. joder Y el grupo tomó nota.',

   'El chat vio el desastre y fingió mirar el móvil, cabrón. mierda Sin anestesia posible, mierda.',

   'Bajada histórica en tu temporada de mierda, gilipollas. coño, joder..',

   'Hoy el aura firmó tu sentencia en voz alta, mierda. cabrón, joder..',

   'Te destrozaron el marcador. Silencio de velatorio, coño. gilipollas Se te ve a la legua.',

   'Pérdida tan fea que nadie quiso el screenshot, asco. patético Y el grupo tomó nota, patético.',

   'Caíste y el grupo aprendió una lección a tu costa, patético. asco Sin anestesia posible, asco.',

   'Hoy fuiste el tutorial de cómo no tirar, basura. basura, joder..',

   'El número te dejó sin ángulo de defensa, ridículo. ridículo, joder..',

   'Pérdida pública, dignidad privada en llamas, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Te hundieron y el eco todavía se ríe bajo,. joder Y el grupo tomó nota.',

   'Bajada de las que cambian el tono del hilo entero, cabrón. mierda Sin anestesia posible, mierda.',

   'Hoy el aura te usó de piñata numérica, gilipollas. coño, joder..',

   'Perdiste en modo ejemplo para el resto, mierda. cabrón, joder..',

   'Caída tan clara que no admite narrador amigo, coño. gilipollas Se te ve a la legua, gilipollas.',

   'El chat se quedó sin chiste: el resultado ya era el chiste, asco. patético Y el grupo tomó nota, patético.',

   'Te bajaron el aura como quien tira un saco, patético. asco Sin anestesia posible, asco.',

   'Pérdida brutal sin derecho a bis ni a contexto, basura. basura, joder..',

   'Hoy el marcador te delató en 4K, ridículo. ridículo, joder..',

   'Caíste fuerte. El grupo cerró el telón por piedad, fracasado. fracasado Se te ve a la legua, fracasado.',

   'El aura te pegó donde más duele: en público,. joder Y el grupo tomó nota.',

   'Bajada de las que se cuentan después en privado, cabrón. mierda Sin anestesia posible, mierda.',

   'Perdiste tanto que el silencio fue la única respuesta adulta.',

   'Hoy fuiste el fail del día sin competencia, mierda. cabrón, joder..',

   'Te reventaron el contador y la cara se te quedó de yeso, coño. gilipollas Se te ve a la legua.',

   'Pérdida con olor a definitivo, asco. patético Y el grupo tomó nota, patético.',

   'Caída libre documentada para la posteridad del chat, patético. asco Sin anestesia posible, asco.',

   'El número te dejó sin discurso posible, basura. basura, joder..',

   'Hoy el aura te exhibió sin filtro de caridad, ridículo. ridículo, joder..',

   'Bajaste a un sótano con público en la barandilla, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Perdiste en grande y el cringe fue colectivo,. joder Y el grupo tomó nota.',

   'Te usaron de ejemplo y el ejemplo dolió, cabrón. mierda Sin anestesia posible, mierda.',

   'Caída tan fea que nadie pidió repetición, gilipollas. coño, joder..',

   'Hoy el marcador fue un acta notarial de tu desastre, mierda. cabrón, joder..',

   'Pérdida pública sin abogado de oficio, coño. gilipollas Se te ve a la legua, gilipollas.',

   'El aura te bajó de un golpe limpio y sucio a la vez, asco. patético Y el grupo tomó nota, patético.',

   'Te hundieron el turno. El chat respiró después, patético. asco Sin anestesia posible, asco.',

   'Bajada histórica personal. Felicidades al revés, basura. basura, joder..',

   'Hoy no hubo debate: hubo sentencia, ridículo. ridículo, joder..',

   'Caíste y el eco pidió clemencia, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Perdiste tanta aura que el silencio se volvió personaje,. joder Y el grupo tomó nota.',

   'El grupo te vio caer y guardó el momento en la memoria del fail, cabrón. mierda Sin anestesia posible.',

   'Te destrozaron el número. Nadie soltó el gag barato, gilipollas. coño.',

   'Pérdida de las que dejan poso de vergüenza ajena, mierda. cabrón, joder..',

   'Hoy el aura te puso el cartel de precaución, coño. gilipollas Se te ve a la legua, gilipollas.',

   'Bajaste fuerte. El historial no te va a perdonar fácil, asco. patético Y el grupo tomó nota, patético.',

   'Caída sin red ni narrador emocional, patético. asco Sin anestesia posible, asco.',

   'Te reventaron en vivo. El chat cambió de tema por supervivencia, basura. basura.',

   'El número te dejó en el sitio que merecías, ridículo. ridículo, joder..',

   'Pérdida brutal. Firma y archiva, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Hoy fuiste el recordatorio de por qué existe este comando,. joder. Y el grupo tomó nota.',

   'Bajada de infarto para ti y de bostezo nervioso para el resto, cabrón. mierda Sin anestesia posible.',

   'Perdiste en modo tutorial negativo, gilipollas. coño.',

   'El aura te exhibió y nadie pidió autógrafo, mierda. cabrón.',

   'Caíste tan hondo que el screenshot dolía, coño. gilipollas Se te ve a la legua, gilipollas.',

   'Hoy el marcador habló más claro que tus excusas, asco. patético. Y el grupo tomó nota, patético.',

   'Pérdida pública con sello de calidad industrial, patético. asco Sin anestesia posible, asco.',

   'Te hundieron el aura y la conversación se fue a otro lado, basura. basura.',

   'Bajada limpia, daño sucio, ridículo. ridículo.',

   'El chat te vio el desastre y practicó la indiferencia educada, fracasado. fracasado Se te ve a la legua, fracasado.',

   'Hoy el aura te hizo el favor de ser honesta,. joder. Y el grupo tomó nota.',

   'Perdiste fuerte. El sótano te recibió con alfombra, cabrón. mierda Sin anestesia posible, mierda.',

   'Caída de las que se recuerdan en la próxima pelea, gilipollas. coño.',

   'Te delató el número en alta definición, mierda. cabrón.',

   'Pérdida sin anestesia ni testigos solidarios, coño. gilipollas Se te ve a la legua, gilipollas.',

   'El aura te bajó el telón a calzón quitado, asco. patético. Y el grupo tomó nota, patético.',

   'Hoy fuiste el fail que no necesita narración, patético. asco Sin anestesia posible, asco.',

   'Bajaste y el silencio pesó como una losa, basura. basura.',

   'Caída libre con cringe de regalo, ridículo. ridículo.',

   'Perdiste tanto que hasta el roast se quedó corto, fracasado. fracasado Se te ve a la legua, fracasado.',

   'El marcador firmó el parte. Tú solo pusiste la cara,. joder. Y el grupo tomó nota.',

   'Te usaron de ejemplo y el ejemplo quedó grabado, cabrón. mierda Sin anestesia posible, mierda.',

   'Hoy el aura no te pegó suave: te puso de cartel, gilipollas. coño.',

   'Pérdida brutal en horario de máxima audiencia del hilo.',

   'Bajaste a un nivel que el chat no quería verbalizar, coño. gilipollas Se te ve a la legua.',

   'Caíste. El eco todavía está bajando, asco. patético. Y el grupo tomó nota, patético.',

   'El número te dejó sin plan B ni dignidad de préstamo, patético. asco Sin anestesia posible, asco.',

   'Hoy perdiste de una forma que no se discute: se archiva, basura. basura.',

   'Te reventaron el aura en público. Clase magistral de cringe, ridículo. ridículo.',

   'Pérdida de las que cierran el hilo por higiene, fracasado. fracasado Se te ve a la legua, fracasado.',

  ],
};



// Cada tramo se ordena de mas duro a mas suave: el bot saca primero lo peor.

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

*!robo* @user <cant.> — cuanto más pides, menos probable
*!robo bote* / *asalto* — el bote común. Reventarlo cuesta *${fmt(BOTE.entrada)}*
*!robo tienda* / *comprar* — escudo, ganzúa, cebo
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
 'Joder, vienes a apostar con el culo al aire y sin un puto duro de aura. La mesa no hace caridad El grupo ya memorizó este fail, patético.',

 'Sin saldo y con pretensiones de high roller. Eres el chiste del casino, cabrón No hay maquillaje que lo tape, miserable.',

 'Los bolsillos transparentes y la cara de querer ganar. Menuda combinación de gilipollas Se te ve el cartón desde el otro lado del hilo, qué cringe.',

 'Apuestas con aura de mendigo y ego de dueño. El contraste da vergüenza ajena, mierda Menuda forma de pedir que te humillen, da asco.',

 'No tienes con qué perder y aun así te sientas a la mesa. Pobreza con audacia, coño El ranking no hace descuentos, qué vergüenza.',

 'El croupier virtual te mira y se rie. Cero aura, cero respeto, asco puro El grupo ya memorizó este fail, ridículo.',

 'Vienes a apostar lo que no tienes. Eso no es valiente: es patético de manual No hay maquillaje que lo tape, fracasado.',

 'Aura en negativo y manos en la mesa. El grupo ya sabe cómo acaba esto, basura Se te ve el cartón desde el otro lado del hilo, qué miseria.',

 'Sin un puto punto y quieres el bote. La delusión es olímpica, ridículo Menuda forma de pedir que te humillen, da grima.',

 'Pobre de aura y rico en cara dura. El casino no fía a fracasados como tú El ranking no hace descuentos, qué nivel de pena.',

 'La mesa exige saldo. Tú ofreces vergüenza. No hay cambio posible, joder El grupo ya memorizó este fail, basura.',

 'Intentar apostar en bancarrota es el deporte de los que no aprenden, cabrón No hay maquillaje que lo tape, qué cutre.',

 'Cero ficha, mil fantasías. Eres el cliente que echan antes de servir, gilipollas Se te ve el cartón desde el otro lado del hilo, da pena ajena.',

 'El aura no llega ni para la propina simbólica. Fuera de la mesa, mierda Menuda forma de pedir que te humillen, qué vacío.',

 'Apuestas de pobre: mucho teatro y nada en el bolsillo, coño El ranking no hace descuentos El ranking no hace descuentos, indignante.',

 'Sin saldo no hay jugada. Solo hay un pringado queriendo escena, asco El grupo ya memorizó este fail, qué vergüenza ajena.',

 'La pobreza de aura te delata antes de que hables. Callate y farmea, patético No hay maquillaje que lo tape, da vergüenza.',

 'Quieres apostar aire. El bot no cotiza aire, basura Se te ve el cartón desde el otro lado del hilo Se te ve el cartón desde el otro lado del hilo, qué flojo.',

 'Miseria documentada y aun así en la cola del casino. Ridículo total Menuda forma de pedir que te humillen, menudo desastre.',

 'No tienes aura. Tienes un hueco donde debería estar el saldo, fracasado El ranking no hace descuentos, qué pena.',

 'All-in con los bolsillos vacíos. Eres un meme andante, joder El grupo ya memorizó este fail El grupo ya memorizó este fail, patético.',

 'La mesa te rechaza por higiene económica del ranking, cabrón No hay maquillaje que lo tape No hay maquillaje que lo tape, miserable.',

 'Sin chips no hay drama heroico. Solo hay un pobre insistente, gilipollas Se te ve el cartón desde el otro lado del hilo, qué cringe.',

 'Aura de sótano y boca de VIP. El combo da grima, mierda Menuda forma de pedir que te humillen Menuda forma de pedir que te humillen, da asco.',

 'Vuelves a la mesa sin haber ganado un puto mensaje de aura, coño El ranking no hace descuentos El ranking no hace descuentos, qué vergüenza.',

 'El casino no es un comedor social. Fuera, asco El grupo ya memorizó este fail El grupo ya memorizó este fail, ridículo.',

 'Apuesta denegada por pobreza crónica de ranking, patético No hay maquillaje que lo tape No hay maquillaje que lo tape, fracasado.',

 'No llegas al mínimo y pretendes el máximo. Basura con pretensiones Se te ve el cartón desde el otro lado del hilo, qué miseria.',

 'El saldo grita miseria. Tú gritas all-in. El grupo elige a quién oír, ridículo Menuda forma de pedir que te humillen, da grima.',

 'Pobreza de aura certificada. No hay mesa para ti hoy, fracasado El ranking no hace descuentos El ranking no hace descuentos, qué nivel de pena.',

 'Intentar farmear suerte sin farmear presencia. Estrategia de idiota, joder El grupo ya memorizó este fail, basura.',

 'La bancarrota no es estética. Es tu estado real, cabrón No hay maquillaje que lo tape No hay maquillaje que lo tape, qué cutre.',

 'Sin aura no hay apuesta. Hay un show de pobreza, gilipollas Se te ve el cartón desde el otro lado del hilo, da pena ajena.',

 'El bot te cierra la ventanilla. Vuelve cuando tengas algo, mierda Menuda forma de pedir que te humillen, qué vacío.',

 'Cero en el contador y mil en el ego. Desbalance de enfermo, coño El ranking no hace descuentos El ranking no hace descuentos, indignante.',

 'La mesa está abierta para quien paga. Tú no pagas, asco El grupo ya memorizó este fail El grupo ya memorizó este fail, qué vergüenza ajena.',

 'Pobre con manual de rich kid. Nadie compra el personaje, patético No hay maquillaje que lo tape No hay maquillaje que lo tape, da vergüenza.',

 'Aura insuficiente. Orgullo sobrante. Resultado: rechazo, basura Se te ve el cartón desde el otro lado del hilo, qué flojo.',

 'No te alcanza ni para el peaje del casino, ridículo Menuda forma de pedir que te humillen Menuda forma de pedir que te humillen, menudo desastre.',

 'All-in emocional, all-out de saldo. Fracasado con estilo barato El ranking no hace descuentos El ranking no hace descuentos, qué pena.',

 'Vienes a perder lo que no tienes. Matemáticas de pringado, joder. El grupo ya memorizó este fail El grupo ya memorizó este fail, patético.',

 'El ranking te tiene fichado como cliente insolvente, cabrón No hay maquillaje que lo tape No hay maquillaje que lo tape, miserable.',

 'Sin ficha no hay historia. Hay un corte de luz a tu drama, gilipollas Se te ve el cartón desde el otro lado del hilo, qué cringe.',

 'La pobreza se te lee en el aura y en la insistencia, mierda Menuda forma de pedir que te humillen Menuda forma de pedir que te humillen, da asco.',

 'Casino cerrado para mendigos de ranking, coño. El ranking no hace descuentos El ranking no hace descuentos, qué vergüenza.',

 'No hay crédito. Hay solo un no en la cara, asco. El grupo ya memorizó este fail El grupo ya memorizó este fail, ridículo.',

 'Apuesta imposible: saldo cero, dignidad en oferta, patético No hay maquillaje que lo tape No hay maquillaje que lo tape, fracasado.',

 'El grupo ya memorizó tu fail de pobre, basura Se te ve el cartón desde el otro lado del hilo Se te ve el cartón desde el otro lado del hilo, qué miseria.',

 'Sin aura no entras. Punto final sin debate, ridículo Menuda forma de pedir que te humillen Menuda forma de pedir que te humillen, da grima.',

 'La mesa te debe cero. Tú le debes vergüenza, fracasado. El ranking no hace descuentos El ranking no hace descuentos, qué nivel de pena.',

 'Joder, otra vez sin saldo y con hambre de apuesta. Aprende el peaje El grupo ya memorizó este fail El grupo ya memorizó este fail, basura.',

 'Cabrón, el casino no es terapia para tu miseria de aura No hay maquillaje que lo tape No hay maquillaje que lo tape, qué cutre.',

 'Gilipollas con los bolsillos de cristal. Se ve el vacío entero Se te ve el cartón desde el otro lado del hilo, da pena ajena.',

 'Mierda de intento: apostar humo y esperar oro Menuda forma de pedir que te humillen Menuda forma de pedir que te humillen, qué vacío.',

 'Coño, farmea primero y presume después El ranking no hace descuentos El ranking no hace descuentos El ranking no hace descuentos, indignante.',

 'Asco de clientela: quiere VIP con carnet de pobre El grupo ya memorizó este fail El grupo ya memorizó este fail, qué vergüenza ajena.',

 'Patético. el ritual de sentarse sin un puto punto No hay maquillaje que lo tape No hay maquillaje que lo tape, da vergüenza.',

 'Basura de estrategia: suerte sin presencia previa Se te ve el cartón desde el otro lado del hilo Se te ve el cartón desde el otro lado del hilo, qué flojo.',

 'Ridículo. el all-in de quien no tiene ni el mínimo Menuda forma de pedir que te humillen Menuda forma de pedir que te humillen, menudo desastre.',

 'Fracasado de mesa: rechazado antes del shuffle El ranking no hace descuentos El ranking no hace descuentos, qué pena.',

 'Joder, el aura en dieta y el ego en buffet libre El grupo ya memorizó este fail El grupo ya memorizó este fail, patético.',

 'Cabrón, no hay silla para quien no paga el cubierto No hay maquillaje que lo tape No hay maquillaje que lo tape, miserable.',

 'Gilipollas, la pobreza no se disfraza con bravata Se te ve el cartón desde el otro lado del hilo Se te ve el cartón desde el otro lado del hilo, qué cringe.',

 'Mierda, vuelves con las mismas manos vacías Menuda forma de pedir que te humillen Menuda forma de pedir que te humillen, da asco.',

 'Coño, el contador sigue en el sótano y tú en la cola El ranking no hace descuentos El ranking no hace descuentos, qué vergüenza.',

 'Asco, insistir sin saldo es una forma de mendigar escena El grupo ya memorizó este fail El grupo ya memorizó este fail, ridículo.',

 'Patético, el bot ya tiene plantilla para tu rechazo No hay maquillaje que lo tape No hay maquillaje que lo tape, fracasado.',

 'Basura, no hay plot twist: sigues pobre de aura Se te ve el cartón desde el otro lado del hilo Se te ve el cartón desde el otro lado del hilo, qué miseria.',

 'Ridículo, la mesa ni se inmuta con tu drama Menuda forma de pedir que te humillen Menuda forma de pedir que te humillen, da grima.',

 'Fracasado, primero escribe, luego apuesta El ranking no hace descuentos El ranking no hace descuentos, qué nivel de pena.',

 'Joder, sin mensajes no hay milagro de fichas El grupo ya memorizó este fail El grupo ya memorizó este fail, basura.',

 'Cabrón, el casino lee el ranking mejor que tú No hay maquillaje que lo tape No hay maquillaje que lo tape, qué cutre.',

 'Gilipollas, la cara dura no cotiza como saldo Se te ve el cartón desde el otro lado del hilo Se te ve el cartón desde el otro lado del hilo, da pena ajena.',

 'Mierda, otra denegación con tu nombre encima Menuda forma de pedir que te humillen Menuda forma de pedir que te humillen, qué vacío.',

 'Coño, miseria y pretensión en el mismo asiento El ranking no hace descuentos El ranking no hace descuentos, indignante.',

 'Asco, el vacío de aura se oye desde aquí El grupo ya memorizó este fail El grupo ya memorizó este fail, qué vergüenza ajena.',

 'Patético, quieres ganar sin haber farmeado nada No hay maquillaje que lo tape No hay maquillaje que lo tape, da vergüenza.',

 'Basura, el peaje existe precisamente por gente como tú Se te ve el cartón desde el otro lado del hilo, qué flojo.',

 'Ridículo, all-in de aire comprimido Menuda forma de pedir que te humillen Menuda forma de pedir que te humillen, menudo desastre.',

 'Fracasado, la mesa te devuelve a la realidad del sótano El ranking no hace descuentos El ranking no hace descuentos, qué pena.',

 'Joder, no hay ficha mágica para el que no aparece en el hilo El grupo ya memorizó este fail El grupo ya memorizó este fail, patético.',

 'Cabrón, pobreza documentada y ego sin documentar vergüenza No hay maquillaje que lo tape No hay maquillaje que lo tape, miserable.',

 'Gilipollas, el rechazo es el único premio que te toca Se te ve el cartón desde el otro lado del hilo, qué cringe.',

 'Mierda, saldo cero es un idioma y tú lo hablas fluido Menuda forma de pedir que te humillen Menuda forma de pedir que te humillen, da asco.',

 'Coño, deja de molestar la mesa hasta tener algo El ranking no hace descuentos El ranking no hace descuentos, qué vergüenza.',

 'Asco, el ranking no fía y el bot tampoco El grupo ya memorizó este fail El grupo ya memorizó este fail, ridículo.',

 'Patético, tu all-in es un grito de socorro disfrazado No hay maquillaje que lo tape No hay maquillaje que lo tape, fracasado.',

 'Basura, sin aura no hay butaca Se te ve el cartón desde el otro lado del hilo Se te ve el cartón desde el otro lado del hilo, qué miseria.',

 'Ridículo, la bancarrota no es un estilo de juego Menuda forma de pedir que te humillen Menuda forma de pedir que te humillen, da grima.',

 'Fracasado, vuelve cuando el contador no se ría de ti El ranking no hace descuentos El ranking no hace descuentos, qué nivel de pena.',

 'Joder, otra vez el mismo pobre en la misma cola El grupo ya memorizó este fail El grupo ya memorizó este fail, basura.',

 'Cabrón, el casino cerró la pestaña de caridad No hay maquillaje que lo tape No hay maquillaje que lo tape, qué cutre.',

 'Gilipollas, tus manos vacías son el argumento entero Se te ve el cartón desde el otro lado del hilo, da pena ajena.',

 'Mierda, no hay debate: no llegas Menuda forma de pedir que te humillen Menuda forma de pedir que te humillen, qué vacío.',

 'Coño, farmea aura o farmea silencio El ranking no hace descuentos El ranking no hace descuentos El ranking no hace descuentos, indignante.',

 'Asco, la insistencia no genera saldo El grupo ya memorizó este fail El grupo ya memorizó este fail El grupo ya memorizó este fail, qué vergüenza ajena.',

 'Patético, el no te lo sabes de memoria y aun así preguntas No hay maquillaje que lo tape No hay maquillaje que lo tape, da vergüenza.',

 'Basura, cliente insolvente del ranking Se te ve el cartón desde el otro lado del hilo Se te ve el cartón desde el otro lado del hilo, qué flojo.',

 'Ridículo, apuesta fantasma con cuerpo presente Menuda forma de pedir que te humillen Menuda forma de pedir que te humillen, menudo desastre.',

 'Fracasado, la mesa te señala la salida sin levantar la voz El ranking no hace descuentos El ranking no hace descuentos, qué pena.',

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
    const p = esOwner ? APUESTA.p.owner : esAdmin ? APUESTA.p.admin : APUESTA.p.miembro;
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
    const objetivo = gana
      ? saldo + apuesta * (APUESTA.multiplicador - 1)
      : Math.max(APUESTA.suelo, saldo - apuesta);
    const delta = objetivo - saldo;

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
       '_Los saldos no se tocan y se siguen ganando escribiendo. *!aura top* y *!aura @user* siguen funcionando._.',

  }, { quoted: msg });
}

async function cmdAura(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;

 const sub = (args && args[0] ? args[0] : '').toLowerCase();

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

  const { tier, amount } = rollAura(selfIsOwner, selfIsAdmin, plusActividad, dePago);
  const sign = amount >= 0 ? '+' : '-';

  const { previous, current } = await addAura(jid, sender, amount);

  // Already in the red and going deeper: use spiral phrases
 const effectiveTier = (previous < 0 && amount < 0) ? 'spiral' : tier;

  const text =
   `*@${sender.split('@')[0]} ${sign}${fmt(Math.abs(amount))} de aura*\n` +
    `${pickFresh(AURA[effectiveTier], `${jid}|aura|${effectiveTier}`)}\n\n` +
    `Aura total: *${fmt(current)}*` +
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
    (plusActividad && !esOwnerPrincipal
      ? `\\n_Veterano (${fmt(mensajes)} msgs): +${Math.round(plusActividad * 100)}% de suerte_, patético.`
     : '') +
    // Y el aviso de que esta tirada ya no paga. Sin esto el jugador ve importes
    // raros a partir de la novena y piensa que el bot se ha roto.
    (!dePago
      ? `\\n_Ya has cobrado tus ${TIRADAS_PAGADAS} tiradas de hoy. Estas son a cara o cruz._, miserable.`
     : '');

  await sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: msg });
}

module.exports = { cmdAura };
