const { isOwner, isMainOwner, isAdmin, getTarget, getSender, canonicalJid, sameUser, soloMiembros } = require('../utils/wa');
const { pickFresh, fmt, parseCantidad, resolverCantidad, etiquetaRiesgo } = require('../utils/helpers');
const { getAura, addAura, getAuraRanking } = require('../utils/auraStore');
const { getUserCount } = require('../utils/messageCounter');
const { getName, recordName, cargar: cargarNombres } = require('../utils/nombreStore');
const logger = require('../utils/logger');
const { contarTirada } = require('../utils/casinoStore');
const { TIRADA, P_POSITIVA, ACTIVIDAD_MSGS, ACTIVIDAD_BONO, ACTIVIDAD_TOPE, P_TOPE, MULT_CASTIGO, MULT_CASTIGO_GRANDE, P_TRAMO_GRANDE, TIRADAS_PAGADAS, bonoActividad, bonoVeterania, VETERANIA_TOPE, APUESTA, pApuestaDe, pApuestaVisible, PRECIOS, ARRANQUE, MILLONARIO, tirar, MOMENTUM } = require('../utils/economia');
const { APUESTA_GANA, APUESTA_PIERDE } = require('../data/apuestaPhrases');
const { fraseCooldown, AURA_TIRADA, AURA_APOSTAR, AURA_TOP_ANSIAS, AURA_TOP_POBRE } = require('../data/cooldownPhrases');
const { auraApagada, avisarApagada, toggleAura, reiniciarAviso } = require('../utils/auraSwitch');
const { BOTE, ATRACO, CONTRA, RACHA, RIESGO, OBJETOS, VENTAJA, RECOMPENSA, IMPUESTO, REGALO_MIN } = require('../utils/economia');
const { aportarAlBote } = require('../utils/roboStore');
const tiendaObj = require('../utils/roboStore');
const momentum = require('../utils/momentum');
const { objetivoDelDia, esObjetivoDelDia, diaClave } = require('../utils/objetivoDia');
const { ownerGana } = require('../utils/rigOwner');
const { SIN_PERMISO, SOLO_GRUPOS } = require('../data/avisos');
const { aviso } = require('../utils/helpers');

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
const lastRoll = new Map(); // `${groupJid}|${canonicalJid}` -> timestamp
const anuncioObjetivo = new Map(); // grupo -> diaClave, para no pinguear al cazado en cada tirada

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
    'Nadie sabía cómo quitarte el respeto que acabas de ganar.',
    'Por una vez no fuiste el chiste del grupo.',
    'Sacaste un número que obligó a esta gente a tragar saliva.',
    'El silencio después de tu tirada pesó más que cualquier comentario.',
    'Hoy el aura del grupo se inclinó hacia ti.',
    // ── Reescritas y nuevas ──
    'Te miraron distinto. Solo un segundo, pero ese segundo ya no te lo quitan, cabrón.',
    'Joder, nadie te felicitó y eso es lo mejor que te ha pasado.',
    'Tu tirada hizo que dos personas borrasen lo que estaban escribiendo.',
    'Dejaste al grupo con la cara de cuando les deben dinero.',
    'Ganaste tan limpio que nadie pudo decir ni una puta cosa. Y eso aquí no pasa nunca.',
    'Hoy te tocó estar arriba y el puto grupo lo asumió sin gracia ninguna.',
    'El grupo tuvo que tragarse lo que estaba preparando.',
    'Joder, alguien tenía el roast en el cuadro de texto y le dio a borrar.',
    'Al bocazas se le ha visto el diente. Hoy no era su día.',
    'Tres personas abrieron el puto ranking y lo cerraron.',
    'Joder, alguien escribió "¿está bien el bot?" y no lo mandó.',
    'Cuando vuelva, tu número seguirá ahí, joder.',
    'Habían preparado el "ya ves" y se les ha atragantado.',
    'Joder, el sticker de risa se quedó en "elegir".',
    'Joder, alguien dijo "suerte" hace diez minutos. Que se trague la palabra con sal.',
    'Joder, el que te tenía de chiste fijo ha tenido que buscar otro.',
    'Joder, has obligado a recastear el reparto. El payaso, por un rato, no eras tú.',
    'Coño, le debían una y se la has cobrado en público.',
    'El puto grupo pasó de 40 mensajes al minuto a mirar el techo.',
    'Coño, un "joder" a medias. La jota se mandó. El resto se lo comieron. Eso es peso.',
    'Coño, el que iba a mandar el audio se lo guardó. Hoy no tocaba reírse. Tocaba tragar.',
    'Coño, te han mirado como se mira al que acierta la lotería: con rabia educada.',
    'Alguien actualizó el ranking dos veces por si era un delay.',
    'Cuando hasta el tuyo se asusta, has ganado.',
    'Había un puto hilo de burla a medio construir. Lo has tirado abajo con un ladrillo.',
    'El puto chat te ha puesto de protagonista sin querer.',
    'Has cerrado el chiste fácil. Cuando no sale, es que el número impone, cabrón.',
    'Alguien iba a decir "de chiripa" y se lo ha guardado. Porque no lo era, y lo sabe.',
    'Te han hecho sitio en la conversación a la fuerza.',
    'El que te subestimaba está recálculando.',
    'Has dejado tres "jajaja" a medias. Se ven los puntos suspensivos y ninguna risa.',
    'El puto grupo te ha concedido el respeto de los que no tienen salida.',
    'Alguien ha puesto el teléfono boca abajo un segundo. Para no tener que verte arriba.',
    'Has ganado de una forma que obliga a cambiar de tema.',
    'El que tenía un meme con tu cara lo ha guardado en "borradores".',
    'Te han tragado de lado y sin aplauso.',
    'El escenario era una mesa de bar, pero te han mirado.',
    'Has hecho que el puto ranking duela. Duele más cuando el nombre no debería estar ahí.',
    'Alguien ha dicho "bueno" y se ha quedado corto.',
    'Has pasado de extra a plano corto, y les ha costado el encuadre.',
    'Has dejado al que siempre te tira sin material.',
    'Te han concedido el silencio de los que están haciendo cuentas.',
    'Un visto colectivo. Nadie escribe. Ese visto vale más que cien "crack" de mentira.',
    'Has obligado a tragar saliva a gente que traga poco.',
    'El que te tenía de puto fondo de pantalla de risa ha tenido que cambiarlo.',
    'Has ganado con la cara de quien no debería.',
    'El puto grupo te ha mirado como se mira un radar en negativo: "este no era el blip".',
    'Alguien ha ido a buscar la trampa. No la hay. Has sido tú, y eso les jode más.',
    'Todo lo que tenían preparado para ti se les ha caducado.',
    'Te han dado el respeto de la deuda: te miran, no pagan con palabras, y se van.',
    'El puto chat ha hecho la ola al revés: se han callado de abajo arriba.',
    'Has puesto el "ya ves" en cuarentena. Hoy el ya ves eras tú, y no les sale la boca.',
    'Por si acaso mañana vuelves a ser el de siempre.',
    'Has ganado sucio de tan limpio: sin debate, sin asterisco, sin "sí, pero".',
    'El que iba a mandar el "otra vez tú" se ha encontrado con que esta vez no.',
    'Te han hecho el respeto de los funerales invertido: no estás muerto.',
    'Has apagado el modo burla como se apaga una tele a las tres.',
    'El puto grupo te ha recálculado el precio. Has subido. Les ha salido caro admitirlo.',
    'Alguien ha escrito tu puto nombre y lo ha borrado.',
    'Has hecho que el "seguro que pierde" se atragante.',
    'Te han mirado como al que paga la ronda: sin decir gracias.',
    'El aura te ha puesto de portada. El resto del periódico está que no te traga.',
    'Has dejado al cronista del puto grupo sin titular de risa.',
    'El que te reenviaba los fails a otro puto chat hoy no tiene material.',
    'Has ganado de una forma que obliga a mirar el teclado.',
    'Trono de plástico y un rato. Pero estás sentado tú.',
    'El puto chat te ha tragado el número sin poder replicar. De lado, y con un gesto feo.',
    'Has obligado a que el "era de esperar" se use al revés.',
    'Alguien ha puesto "joder" y se ha quedado ahí.',
    'Te miran de reojo, que es el único respeto honesto que hay aquí.',
    'La broma de siempre ya no encaja, cabrón.',
    'Te han hecho sitio de mala gana, como en un ascensor lleno.',
    'Hoy el punchline eras tú, y no del lado que ellos querían.',
    'El karaoke se ha callado. Canta bajo, que esto no dura.',
    'Has ganado y el puto ranking ha hecho un ruido que nadie quería oír.',
    'Se han tragado el resultado entre dientes y sin reclamar.',
    'El puto grupo te ha dado el respeto de los que están haciendo cola detrás.',
    'Has dejado un "me cago en" a medias. La frase no tenía final que no te reconociera.',
    'Alguien ha ido a ver tu historial por si esto venía de antes.',
    'Te han puesto en el plano y no sabían dónde mirar.',
    'Has hecho que el "este no" se convierta en "este sí" durante un minuto.',
    'Te han pagado en silencio, que aquí es moneda alta.',
    'Has ganado de una forma que obliga a recalcular el chiste del puto grupo.',
    'Eres el radar que no debería pitar y está pitando.',
    'El que te tenía de comodín de risa se ha quedado sin comodín. Que improvise, joder.',
    'Has obligado a que te traguen sin salsa.',
    'El aura te ha hecho un corte de manga colectivo al repertorio.',
    'Has puesto tu puto nombre donde no tocaba.',
    'Te han dado el respeto de la rabia: no te quieren ahí, y ahí estás.',
    'Se lo han tragado con miedo a que se les note.',
  ],
  gain: [
    // ── Ejemplos del usuario (intocables) ──
    'Sumaste algo. No es para celebrar, pero al menos hoy no diste el papelón de siempre.',
    'Te tiraron una migaja decente. Agárrala y cierra la boca antes de que se arrepientan.',
    'Pequeña subida. El grupo lo vio, bostezó y siguió con lo suyo. No esperes aplausos.',
    'Hoy no la cagaste. Para tu historial ya es casi un logro, no te creas demasiado.',
    'El aura te dio un hueso. Disfrútalo en silencio, mañana vuelves a ser el de siempre.',
    // ── Reescritas y nuevas ──
    'Joder, sumaste monedas. No da para presumir, pero da para no llorar.',
    'Una propina, pero es más de lo que sueles sacar, gilipollas.',
    'Sigues en el puto sótano, pero ahora es un sótano ligeramente más alto.',
    'Te dieron una migaja y saliste contento. Dice más de ti que de la puta tirada.',
    'Hoy el aura te trató como a un cliente habitual: sin palos.',
    'Un puñado pequeño, como todo lo tuyo, pero positivo.',
    'No estás creciendo, estás no muriendo. Y algo es algo.',
    'Te han dado el cambio del kiosko. Cuéntalo en voz alta y se te acaba el puto turno.',
    'Un like de compromiso. Verde, sí. Respeto, ni de broma.',
    'El ticket del súper tiene más presencia que este resultado.',
    'Cómetelo antes de que se enfríe y nadie pregunte de quién era.',
    'Joder, el wifi del vecino: llega, flojo, y se corta en cuanto te fías.',
    'Has ganado y ni tú te lo crees. Míralo otra vez: sigue siendo poco.',
    'Sticker de pulgar. El cumplido más vago del puto chat, y te lo has ganado entero.',
    'Joder, el visto sin respuesta. Subiste, sí. Nadie tenía nada que decirte encima.',
    'Café de máquina: dos sorbos y a cenicero. Tu tamaño exacto.',
    'Has recogido del suelo lo que otro soltó, como si fuera premio.',
    'Coño, el segundo del McDonalds. Ni menú, ni corona, ni foto. Lo que sobra, para ti.',
    'El banco te mira igual de mal, solo que hoy no te cobra.',
    'Coño, el like de tu tía en Facebook. Cariño obligatorio, cero ganas, y tú agradecido.',
    'Notificación de +1. El teléfono ni vibra. Tú sí, y eso es lo patético.',
    'Has subido lo que se sube sin querer. No lo cuentes por ahí.',
    'Resto de pizza fría a las cuatro. Nadie la reclamó. Ahora es tuya, pringado.',
    'Ganas, sí. Lo justo para que no se note que ganaste, joder.',
    'Asiento del puto fondo del bus. Llegas, sí. Nadie se sienta a tu lado tampoco.',
    'Fila de espera que avanzó un puesto. Sigues viendo la nuca del de delante, pringado.',
    'Cupón que caduca mañana. Úsalo ya, que el azar se arrepiente rápido contigo.',
    'Una subida tan pequeña que redondeando no existe. Pero cuenta, tranquilo.',
    'Sumaste. El grupo no lo ha leído y tú ya te lo estás creyendo.',
    'Es positiva y con eso te vale. Qué barato te sale el día, pringado.',
    'Marca blanca del súper. Misma función, cara cutre, y tú contento porque es positiva.',
    'Sube el número y no sube nada más. Ni tu puesto, ni tu prestigio, ni tu suerte.',
    'Nokia que aún enciende: no sabe cómo morirse. Como tú.',
    'Brick de leche a punto de caducar. Lo abres hoy o huele mañana. Tú verás.',
    'Has ganado algo que mañana no vas a recordar. Disfrútalo hoy.',
    'Ración de cortesía que no pediste ni merecías, y palmeando.',
    'Te ha tocado un trozo de la sombra de otro. Calla, cabrón.',
    'Has recogido del suelo un aplauso que era para otro, patético.',
    'Subida de las que no cambian nada. Ni tu saldo, ni tu vida, ni tu puesto.',
    'Enhorabuena por lo mínimo. Literalmente lo mínimo, gilipollas.',
    'El aura te pagó en céntimos. Cuéntalos si quieres; el puto grupo ya pasó a otra cosa.',
    'Subiste como sube el IVA: poco, inevitable, y a nadie le hace ilusión. Basura fiscal.',
    'Te dieron lo justo para no llorar en el puto ticket. El cajero ni te ha mirado.',
    'Verde de semáforo en ámbar. Pasa, pero si te confías te pisan, cabrón.',
    'Ganaste poco y ya estás mirando si alguien lo vio. No lo vio nadie.',
    'Joder, una ganancia de esas que dan más pereza que alegría.',
    'El aura te ha hecho una transferencia de vergüenza. Acepta y no pongas concepto.',
    'Has sumado y sigues exactamente en el mismo sitio de la tabla.',
    'Un número que no da ni para el gordo ni para el café.',
    'Un sello en la tarjeta de puntos. En ti eso ya es fiesta, inútil.',
    'Positiva y raquítica, como casi todo lo tuyo. Pero positiva.',
    'Verde en la pantalla y cero en el grupo. No se ha dado cuenta nadie, pringado.',
    'Ni plato, ni vino, ni que te miren al servir.',
    'Cabe en un post-it. Pégalo en la nevera si te hace ilusión.',
    'Funciona el mando y nadie te va a pedir el canal.',
    'Miga de croissant en la barba, y tú crees que desayunaste.',
    'El ranking no se ha enterado, y hace bien. Esto no mueve un puto puesto.',
    'Te pagaron en puntos de supermercado. Acumula, iluso: el sandwichera sale en 2041.',
    'Se te mueve el flequillo y ya estás escribiendo el discurso, ridículo.',
    'Te ha salido el parche oficial. Sigue siendo el mismo juego cutre, con un parche.',
    'Has ganado lo mismo que perdiste la última vez. Estás donde estabas, campeón.',
    'El aura te ha puesto en cc de un correo que no era para ti. Has aparecido. Punto.',
    'Subiste lo que sube el sueldo en un restaurante: un insulto disfrazado de cifra.',
    'Un chupito de cortesía. Ni copa, ni hielo, ni segunda ronda.',
    'Coño, sumar esto cuesta más energía de la que da.',
    'Te ha tocado el relleno del bocadillo: atún del barato.',
    'El aura te ha dejado el asiento del cine que nadie quería.',
    'Te ha tocado ganar y aun así suena a consuelo. Eso es tener mala prensa.',
    'Te han dado el wifi de 30 minutos del aeropuerto. Navega y lárgate, fracasado.',
    'Sello de "pagado" en una factura de tres euros. Contable de tu propia miseria.',
    'El aura te ha hecho la ola de un solo tipo.',
    'Te tocó el caramelo de menta del plato de la entrada. Gratis, duro y de nadie.',
    'Subiste como el agua del vaso: por capilaridad, sin que nadie lo pidiera.',
    'Te han dado el número de espera y ha bajado uno. Sigues en la sala, gilipollas.',
    'Envío estándar: llega tarde y sin tracking. Como tú, don nadie.',
    'El aura te ha puesto un "ok" en el puto chat. Ni un sticker. Ni un jaja. Ok.',
    'Poco, pero positivo. Esa frase va a resumir tu paso por este grupo.',
    'Te dieron el recorte del cupón: vale para la próxima, que igual no llega.',
    'Subida de termostato de un grado. Sigues en manga larga y con razón.',
    'El aura te ha dejado el último palito de la bolsa.',
    'Te ha salido el modo ahorro de batería. Dura más. Brilla menos. Tu retrato.',
    'Joder, has subido lo justo para seguir teniendo la misma cara en la tabla.',
    'Te pagaron el cubierto y el agua. El resto de la carta sigue siendo para otros.',
    'El aura te ha hecho un cabezazo de cortesía. Contacto, sí. Gol, no.',
    'Subiste lo que sube un globo pinchado: un palmo, y se oye el aire escapándose.',
    'Hueles un segundo y el bote se queda en el escaparate.',
    'Cambio de marcha en un semáforo en rojo.',
    'El aura te ha puesto en la lista de espera del respeto.',
    'Te tocó el hielo que sobró del cubo. Frío prestado. Mañana es un charco.',
    'Subida de esas que caben en el vueltos de un café. Ni el camarero te ha deseado nada.',
    'Te han dado el sticker de "bien" que usa tu jefe para no hablarte. Enmárcalo, inútil.',
    'Controla y no chutes, que te ríes el puto grupo.',
    'Verde de planta de IKEA: sigue viva porque no has tenido tiempo de matarla.',
    'Te dieron el tiempo añadido. Un minuto. El partido ya estaba decidido, cabrón.',
    'El aura te ha dejado las llaves del trastero. No del piso. Del trastero, cabrón.',
    'Subiste como el pan de molde: una rebanada, y la bolsa sigue casi llena de aire.',
    'Te ha tocado el "puede ser peor". Hoy no lo es. Guárdalo, que mañana vuelve a serlo.',
    'El aura te ha hecho un guiño. Un guiño, no un beso. No te pongas romántico, inútil.',
    'Te pagaron en puntos de un súper de hace tres años. Caducan. Tú también, un poco.',
    'Subida de andén: el tren no para, pero por lo menos ya no estás en las vías.',
    'Te dieron el pan de la cesta que nadie cogió. Gratis, duro, y tú haciendo fiesta.',
    'El aura te ha puesto un post-it verde en la frente.',
    'Modo invitado: entras, no guardas nada, y mañana ni te acuerdas.',
    'Sumas lo que suma un voto nulo: sale en el acta y no cambia nada.',
    'Te dieron el asiento plegable del pasillo.',
    'Cama de hotel de tres estrellas: sosa y con el minibar cerrado.',
    'Subiste un peldaño de esos de parking: no ves la calle, pero ya no estás en el -3.',
    'Te tocó el chupito de hierbas que regalan a las once.',
    'El aura te ha dejado un "visto" en verde.',
    'Te han dado la bolsa de plástico de pago.',
    'Ganancia sin consecuencias. Ni las buenas ni las malas, gilipollas.',
    'Te dio para el café solo, no para el con leche. Pide eso y no mires la vitrina.',
    'El aura te ha puesto de extra en la escena.',
    'No tocas el volante, no eliges el radio, y aun así has avanzado, inútil.',
    'Sumaste el trozo de chorizo que cae de la tapa.',
  ],
  loss: [
    // ── Ejemplos del usuario (intocables) ──
    'Bajaste y nadie se inmutó. Ya es parte del paisaje verte perder aura.',
    'Se te escurrió un poco más de presencia.',
    'Ni siquiera generas gracia, solo esa cara de "obvio que iba a ser él".',
    'Te restaron sin odio y sin esfuerzo, como a un mosquito.',
    'Hoy el grupo te bajó un escalón más y ni se molestó en reírse.',
    // ── Reescritas y nuevas ──
    'Perdiste poco, pero también tenías poco. Proporcionalmente, un desastre.',
    'Te quitaron aura y el puto grupo siguió hablando de comida.',
    'A estas alturas podría ser tu puto fondo de pantalla.',
    'Fallaste en algo fácil, y a nadie le ha sorprendido.',
    'Bajaste otro escalón sin que nadie te empujara. El mérito es tuyo entero, cabrón.',
    'El puto grupo vio tu pérdida y la archivó con las demás.',
    'Perdiste aura como quien pierde un botón: sin enterarte.',
    'Ya sabes por qué: porque eres tú, gilipollas.',
    'Tu número duró menos que un fuera de juego.',
    'Tu puta pérdida tiene esa misma energía.',
    'Joder, un estado que caduca en 24 horas.',
    'Joder, la notificación silenciada. El teléfono ni se ha molestado en vibrar por ti.',
    'Joder, la silla de plástico que nadie retira después de la fiesta.',
    'Te quitan poco, y con eso basta para dejarte donde siempre.',
    'Ni el filtro te tiene respeto: te deja pasar y te ignora.',
    'El grupo le ha dado a skip. Tú eres el anuncio.',
    'Nota adhesiva que se cae de la nevera. El imán no te quería tanto, fracasado.',
    'Joder, tu nombre en visto a las tres de la mañana.',
    'Tu pérdida va al cajón de los cargadores huérfanos.',
    'Has perdido lo justo para que nadie se entere y tú sí. Lo peor de los dos mundos.',
    'Paraguas olvidado en el bar: lo miran un día y lo tiran.',
    'Joder, has perdido y ni te has parado a mirar cuánto. Ya lo sabías.',
    'Has perdido un puesto y el de la caja ni te ha visto.',
    'Coño, el wifi que pica una vez y se cae.',
    'Alarma que snoozeas. El golpe es pequeño y tú ya lo tenías metido en el cuerpo.',
    'Pierdes poco y seguido, que es la forma más tonta de quedarse sin nada.',
    'Le has dado a tirar esperando otra cosa. No sé por qué, pero esperabas otra cosa.',
    'Bajas un poco y sigues como si nada. Esa tranquilidad es justo el problema.',
    'Una bajada discreta, de las que no se cuentan pero se acumulan, pringado.',
    'El siguiente tarda, y es tu culpa por llegar así.',
    'Otra pérdida de las tuyas: pequeña, puntual y absolutamente previsible.',
    'Desaparece uno y el otro se queda viudo. Como tu saldo.',
    'El aura te cobró el cubierto. Ni plato. Ni segundo. Solo el cubierto, gilipollas.',
    'Bajaste como baja un calcetín: solo, sin ceremonia, y se te ve el tobillo.',
    'Te han pasado el trapo. Ni fregado. Trapo. Lo justo para que no se note el polvo.',
    'Coño, perder así no da ni para queja. Y tú tampoco ibas a quejarte.',
    'Te restaron lo que se lleva el IVA: lo sabías, lo odias, y pagas igual.',
    'El grupo te archivó en "recuerdos". Ahí no entra nadie a mirar, cabrón.',
    'Bajaste como el hielo del vaso: se nota al final, cuando ya está aguado.',
    'Te han dado el visto de compromiso. Obligatorio, frío, y a otra cosa.',
    'Menos aura y la misma actitud. Ahí está el problema de fondo.',
    'El aura te ha hecho una transferencia al revés.',
    'Te quitaron el asiento del pasillo. Sigues en el vagón. Viajas peor, que es lo tuyo.',
    'Bajas despacio y sin funeral, como una planta de IKEA.',
    'El chat puso "jaja" a otra cosa mientras tú salías en rojo. Prioridades, inútil.',
    'Pagas de más y nadie te espera en llegadas.',
    'No has perdido gran cosa. Tampoco tenías gran cosa, pringado.',
    'El aura te ha puesto en cc de un recorte. Has salido. El puto hilo sigue sin ti.',
    'Bajaste como el pan de molde: una rebanada menos, y la bolsa parece igual de llena.',
    'Te restaron el cubito. El vaso sigue. La bebida sabe igual de regular.',
    'Has bajado, el grupo sigue igual y mañana lo repites. Todo previsible.',
    'El ranking no se ha movido. Para moverse haría falta que importaras, pringado.',
    'Te han pinchado la rueda y sigues. El coche baja un palmo. Nadie llama al grúa.',
    'Pérdida pequeña y aburrida, como tu manera de jugar, gilipollas.',
    'El aura te ha dejado el último palito... y te lo ha quitado. Lo querías. Da más pena.',
    'Bajaste como el brillo de un chrome a las tres: se nota si miras, y nadie mira.',
    'Has salido de la tienda más pobre y con menos dignidad.',
    'El puto grupo te usó de ruido blanco. Bajaste el volumen un punto. El podcast seguía.',
    'Te restaron lo que se lleva el perro del parque: porque estaba ahí.',
    'El grupo ha visto tu número y ha seguido a lo suyo. Ni eso te has ganado.',
    'El aura te ha puesto un "ok" en rojo. Ni sticker. Ni pena. Ok, fracasado.',
    'Te quitaron el hielo y te dejaron el agua. Sigues bebiendo. El gin se lo quedó otro.',
    'Has restado. Nadie va a comentarlo y mañana ni tú te acuerdas.',
    'El chat archivó tu nombre junto a "el de siempre".',
    'Te han dado el recorte del cupón caducado. Lo tenías. Ya no vale. Típico.',
    'Un uno por ciento, y ni lo has sacado del bolsillo a mirar.',
    'El aura te cobró el peaje de tres euros. La autopista sigue. Tú sales más corto.',
    'Te restaron el pan de la cesta. El segundo plato no era para ti de todas formas.',
    'Tirada de las que no duelen, y por eso repites. Ahí está el truco, gilipollas.',
    'El puto grupo te puso en silenciar un día más. Hoy se ha notado. Mañana también.',
    'Bajaste como un calcetín en el tendedero: un palmo, y el viento ni te nombra.',
    'Te han pasado factura del café que no pediste. Lo pagas. No lo bebes. Callas.',
    'El aura te ha hecho un cabezazo suave. Contacto. Falta. Ni penalti. Ni VAR. Nada.',
    'La masa sigue. El queso era lo único que te gustaba.',
    'Bajada de esas que caben en el vueltos que no te dieron.',
    'El puto chat te usó de ejemplo en voz baja.',
    'Un agujero de polilla en algo que ya estaba viejo.',
    'Pérdida de silla reservada con un abrigo. El abrigo era de otro. Tú te quedas de pie.',
    'El aura te ha puesto el semáforo en ámbar y lo has cruzado mal.',
    'Bajaste el brillo y el grupo ni pestañeó.',
    'Te cobraron el recargo de madrugada. El taxi te deja igual de lejos, ahora más pobre.',
    'El puto grupo te tiene en "familia" para no ver las notificaciones.',
    'Te restaron el último chicle del paquete.',
    'Un grado menos y sigues pasando frío. El casero no viene.',
    'Cama de albergue: corta, dura y con el ronquido de al lado.',
    'No te han expulsado. Te han recordado que existes mal.',
    'Pérdida de esas que se miden en migas. El mantel se sacude y tú caes al suelo.',
    'El puto chat te dejó en "escribiendo…" y se le pasó. Ni mensaje. Ni pena. Se le pasó.',
    'Bajaste como el wifi del tren: se corta, vuelve, se corta, y el viaje no te espera.',
    'Come con las manos, que para lo que hay ya te vale.',
    'El aura te ha puesto de extra y te ha recortado el segundo.',
    'Te han dado el número 87 de la cola y ha salido el 86 dos veces.',
    'Ni el sticker de caca. Demasiado trabajo para lo que eres.',
    'Has salido en rojo y han vuelto al programa.',
    'Te quitaron lo que se lleva el viento de una terraza: la servilleta, no el plato.',
    'Pierdes con la misma cara de siempre. Ya ni sorprende, que es peor que perder.',
    'El aura te cobró el café solo cuando pediste con leche.',
    'El grupo ya te tenía en cero. Hoy han confirmado el mute.',
    'Te restaron el panecillo de cortesía. El restaurante sigue lleno. Tu mesa, no.',
    'Otra vez lo que ya se sabía. Sorpresa cero, gilipollas.',
  ],
  spiral: [
    // ── Reescritas y nuevas ──
    'Joder, a esto ya no se le llama mala suerte, se le llama ser tú.',
    'Sigues cavando, y el fondo lo pasaste hace rato, gilipollas.',
    'Apuesta por cuánto tardas en tocar un nuevo mínimo.',
    'Llevas tanto abajo que el fondo te ha adoptado. Residencia permanente, gilipollas.',
    'El grupo usa tu racha de referencia: "desde que empezó a perder".',
    'Si esto fuera un gráfico, sería una línea recta hacia la mierda.',
    'El puto agujero se hace más hondo y tú sigues con la pala.',
    'El puto pozo tiene fondo y tú estás empeñado en comprobarlo.',
    'Sigues cavando. El puto agujero ya tiene tu nombre puesto.',
    'Joder, ya ni el bot se molesta en fingir sorpresa.',
    'Ya no es una racha. Es tu estado natural y el puto grupo lo asumió hace semanas.',
    'Joder, llevas tantas seguidas que ganar te daría un susto de muerte.',
    'Sigues abajo y lo peor es que ahí encajas. Ese es tu puto sitio.',
    'Joder, tu historial parece un tobogán y tú sigues subiendo solo para tirarte.',
    'El puto fondo de pantalla rojo ya te queda de uniforme. Lavarlo no cambia el color.',
    'Vas a mirar el saldo, vas a cerrar los ojos y vas a volver a tirar.',
    'Hipoteca de aura negativa: pagas cada mes y el piso sigue siendo un puto agujero.',
    'Joder, la temporada siete de tu fracaso. Nadie pidió renovación. Netflix tampoco.',
    'El GPS solo sabe decir "sigue todo recto hacia abajo". Y le haces caso, cabrón.',
    'Silla reservada en el infierno con tu puto nombre en un post-it. Nadie la discute.',
    'Sigues en negativo y sigues tirando. Eso ya no es mala suerte, es un plan.',
    'Joder, otra vez. El grupo ya no mira el número, mira cuánto tardas en volver a darle.',
    'Llevas tantas seguidas que el bot te podría cantar el resultado antes de tirar.',
    'Recaída de alguien que nunca salió. No hay recaída. Hay continuidad, pringado.',
    'Ni siquiera es dramático ya. Es administrativo, cabrón.',
    'Debes aura y en vez de parar pides más. Así se llega exactamente a donde estás.',
    'Joder, el ascensor que solo tiene botón menos uno.',
    'La playa se te ha quedado lejos y sigues nadando hacia dentro.',
    'Te has acostumbrado al menos delante del número. Eso sí que asusta.',
    'Cuenta atrás invertida: cada puta tirada suma un día más de sótano.',
    'Coño, cada tirada tuya es la misma tirada. Cambia el número y no cambia nada más.',
    'Marrón y sin regar, y nadie te tira porque "es la tuya".',
    'Coño, la alarma que ya ni suena. El golpe eres tú. El cuerpo lo tiene metido.',
    'Ya eres la mancha que el grupo usa de referencia: "junto a esa".',
    'El grupo ya no se ríe del número. Se ríe de que sigas dándole al botón, pringado.',
    'Carpeta de descensos con subcarpetas. Has tenido que hacer árbol de directorios.',
    'Línea de metro que solo para en sótanos. El mapa eres tú, y no hay transbordo.',
    'Grifo que gotea hacia abajo. Nadie llama al fontanero. El cubo eres tú y ya rebosó.',
    'Esta racha no la tiene nadie por azar. Hay que ponerle empeño, y tú se lo pones.',
    'El grupo apuesta a cuántas más aguantas antes de parar. Nadie apuesta a que pares.',
    'Pozo con eco. Gritas "ya está" y te devuelve "todavía no", gilipollas.',
    'Joder, si esto fuera un trabajo te habrían echado en la primera semana.',
    'Estabas en rojo y lo acabas de pintar más rojo. Enhorabuena, supongo.',
    'Temporada de lluvias en tu puto marcador. No hay paraguas. Hay pala. Sigue.',
    'Hoyos de golf: cada uno más hondo. Nadie te va a aplaudir el putt, inútil.',
    'Joder, ni el bot finge ya sorpresa. Sale tu nombre y sale el menos.',
    'Sigues restando desde un sitio donde ya no quedaba nada que restar.',
    'Otra por debajo de cero. Ya ni sumas: restas con método.',
    'Cama de clavos en el -2. Ya no pincha. Te has calloso el fracaso.',
    'Rampa de parking hacia el -4. Las luces parpadean. El coche eres tú.',
    'Otra abajo. A este ritmo el cero te va a parecer una meta ambiciosa.',
    'Ya no pierdes aura, la donas. Y encima con constancia, gilipollas.',
    'Coño, el saldo es el mismo chiste desde hace días y tú sigues contándolo.',
    'Has convertido perder en una rutina con horario. Impresionante y triste.',
    'El grupo tiene tu racha contada. Tú ni la miras, y por eso sigue creciendo.',
    'Nadie tira de la polea hacia arriba. El albañil se fue.',
    'Coño, tirar así tiene mérito. Malo, pero mérito.',
    'Cada vez que ves el saldo cierras la app, y aun así vuelves.',
    'Ya no te mira nadie. Sigues tirando para ti solo, que es lo peor de todo.',
    'Llevas tanto en negativo que salir de ahí sería la noticia del día.',
    'Esto no es una mala racha. Una mala racha se acaba, cabrón.',
    'Escalera mecánica en bajada, rota, y tú andando igual.',
    'Joder, esperar suerte a estas alturas es optimismo clínico.',
    'Cada vez que tiras confirmas la teoría del grupo sobre ti. Y era una teoría dura.',
    'El menos ya no es un resultado, es tu marca personal.',
    'Joder, insistes como si la próxima fuera a arreglarlo. No lo va a arreglar.',
    'El único que no ha entendido lo que está pasando aquí eres tú.',
    'Sumas otra derrota a una lista que ya no cabe en una pantalla.',
    'Estás cavando y lo llamas jugar. El puto grupo lo ve, tú no, fracasado.',
    'Coño, tu saldo baja tan seguido que ya nadie lo comenta. Se da por hecho.',
    'Rampa de skate hacia un bordillo. Te caes. Subes. Te caes. El vídeo ya no se graba.',
    'Otra menos y ni te has inmutado, que es lo que de verdad da pena.',
    'A ti el azar no te trata mal. Te trata como te lo has ganado, pringado.',
    'Coño, ni forzándolo se pierde tanto seguido. Y tú no lo estás forzando.',
    'Joder, esto ya no es una tirada, es una costumbre. Y de las caras.',
    'Cada tirada tuya confirma lo mismo y el grupo ya no necesita más pruebas.',
    'Vas a peor con una regularidad que en cualquier otra cosa sería talento.',
    'Tu problema no es la suerte. Tu problema es que no sabes parar, gilipollas.',
    'El bot te ha quitado aura tantas veces que esto ya parece una suscripción.',
    'Sigues abajo, sigues tirando y sigues bajando. El orden no cambia nunca.',
    'Joder, tienes el récord del grupo y es justo el que nadie quiere.',
    'Nadie te va a decir que pares. Es demasiado entretenido verte seguir.',
    'Usando la rampa al revés. El que la diseñó no pensó en ti.',
    'El saldo baja, tú tiras, el saldo baja. Llevamos días con este bucle.',
    'Joder, tienes menos aura que cuando empezaste y más tiradas que nadie.',
    'Nadie del grupo ha perdido tanto en tan poco. Ese sí es tu título.',
    'Le has cogido el gusto a perder. Es la única explicación que queda ya.',
    'Sigues creyendo que esto se da la vuelta. No se da la vuelta, pringado.',
    'Coño, ya pierdo yo la cuenta, y soy el bot. Imagínate tú.',
    'Otra abajo. Ya solo falta que lo cuentes como si tuviera arreglo.',
    'Coño, otra vez tú. A estas alturas ni hace falta leer el número.',
    'El grupo ha pasado de reírse a preocuparse. Y de preocuparse, a pasar.',
    'Joder, eres el motivo de que el aura tenga números negativos.',
    'Cada viaje, menos. La cantera te espera bostezando.',
    'Has hecho de perder una disciplina. Con constancia, horario y todo.',
    'Ni la mala suerte trabaja tantas horas seguidas, cabrón.',
    'Tu aura no baja: se desploma con horario fijo, gilipollas.',
    'En negativo, tirando y perdiendo. Los tres a la vez, como siempre.',
    'Coño, tu racha ya no cabe en el resumen del día.',
    'Joder, el grupo ha dejado de contar tus derrotas. Se cansaron antes que tú.',
    'Lo único que sube en tu ficha es el número de intentos.',
    'Joder, has vuelto a tirar sabiendo cómo iba a acabar. Y ha acabado así.',
    'El grupo ya no pregunta cómo te fue. Lo dan por sabido.',
    'A estas alturas ganar te descolocaría más que perder, fracasado.',
    'Coño, llevas tantas seguidas que esto ya es estadística, no azar.',
    'No estás teniendo un mal día. Llevas una mala temporada y la estás alargando.',
    'Otra menos, y mañana empiezas desde más abajo. Ese es todo el plan.',
    'Pierdes tanto y tan seguido que ya no eres la mala suerte, eres el control.',
    'Otra abajo, y lo peor es que en diez minutos vuelves a tirar. Todos lo sabemos.',
  ],
  cursed: [
    // ── Ejemplos del usuario (intocables) ──
    'Perdiste tanta mierda que el silencio posterior fue puro cringe.',
    'El aura te usó de ejemplo público. El grupo miró, asintió y tomó nota mental.',
    'Bajaste tan fuerte que hasta tus habituales defensores se hicieron los locos.',
    'Fue el chat recordándote, sin filtro, que sigues siendo un desastre.',
    'Solo quedó esa mezcla de pena y alivio de no ser tú.',
    // ── Reescritas y nuevas ──
    'Joder, hoy batiste un récord que nadie quería ver roto.',
    'Con público, con testigos y con capturas que van a durar.',
    'Joder, perdiste tanto que la cifra ya no da risa.',
    'Perdiste con la elegancia de un saco de mierda cayendo por las escaleras.',
    'Sacaste un número que el puto grupo va a usar como unidad de medida del desastre.',
    'Hoy batiste un fondo que nadie sabía que existía.',
    'Todos pensaron lo mismo: "menos mal que no soy yo".',
    'Dos personas cerraron el puto chat para no tener que verte.',
    'Joder, el defensor se fue al baño con una puntualidad sospechosa.',
    'Joder, alguien ha puesto el teléfono boca abajo.',
    'Joder, la captura ya está en destacados. No la ha mandado. La tiene. Eso es peor.',
    'Demasiado feo para su repertorio de tres chistes.',
    'Has convertido el chat en un velatorio de treinta segundos.',
    'Alguien ha reenviado esto a otro puto grupo y ha puesto "mira".',
    'Cuando ni el carroñero pica, has llegado al puto fondo.',
    'Has hecho que el puto grupo se mire los zapatos.',
    'Un "joder" que se ha muerto a mitad. No había segunda palabra que no te dejara peor.',
    'El puto ranking se ha abierto solo para enseñar el agujero.',
    'Alguien ha comprobado si el bot se había roto. No se había roto. Eres tú, gilipollas.',
    'Has dejado el ambiente de pedo en ascensor con diez pisos.',
    'El que dijo "esta vez gana" se está comiendo la frase con tenedor.',
    'Con foco, con público y sin orquesta que tape el golpe.',
    'Hasta el bot se sintió incómodo anunciándolo, joder. Y el bot ha visto cosas.',
    'Has puesto cara de examen al puto grupo. Nadie copiaba. Nadie sabía a dónde mirar.',
    'La gente que te odia ha preferido no decir nada. Eso ya es un récord, fracasado.',
    'Has hecho historia del tipo que se cuenta bajando la voz, detrás de la mano.',
    'Alguien ha guardado el audio que iba a mandar.',
    'El puto chat ha hecho un silencio de morgue. Falta el capellán. Sobras tú.',
    'Te han usado de unidad de medida. A partir de ahora los palos se cuentan en "tús".',
    'Has dejado a los carroñeros sin apetito.',
    'Alguien ha puesto "F" y lo ha borrado. Ni el respeto póstumo te querían dar.',
    'El puto grupo se ha dividido entre cringe y pena.',
    'Has hecho que cierren la app y abran otra cosa.',
    'El que te defiende siempre ha mirado el techo.',
    'Todo el andén te ha oído caer y nadie ha ayudado.',
    'La captura tiene hora. La hora se va a quedar. Tú también, en esa foto.',
    'Has dejado el puto chat con esa cara de cuando el camarero oye lo que no debía.',
    'Alguien ha escrito "madre mía" y se ha quedado ahí.',
    'Te has dado de bruces con el suelo delante de todo el puto grupo.',
    'Has hecho que el "jaja" colectivo se atragante. La risa se les ha vuelto tos.',
    'Ambiente de velatorio: nadie sabe qué decirte.',
    'Has salido en el parte como accidente con testigos.',
    'Alguien ha tapado la pantalla con la mano, instinto de película mala.',
    'El nombre y el número parecen un error. No lo son.',
    'El que iba a bardear se ha encontrado sin ganas. Ni odio te mereces hoy. Solo pena.',
    'Nadie quería ser el siguiente en hablar.',
    'Te miran como a un choque en la autopista: ojalá pudieran no.',
    'Has dejado una huella de cringe que se siente en los hombros.',
    'Alguien ha dicho "buah" y ha sido todo el discurso. Un buah. Tu epitafio de hoy.',
    'Han puesto el móvil boca abajo, como quien tapa un muerto.',
    'El defensor ha salido a fumar. No fuma.',
    'Has batido el fondo y el fondo ha pedido un receso.',
    'La gente ha hecho esa risa nerviosa que no es risa.',
    'El cronista se ha quedado sin adjetivo y ha escrito "esto".',
    'Alguien ha ido a ver si podías borrar el mensaje. No se puede. Qué suerte la nuestra.',
    'Has hecho el equivalente a vomitar en la mesa y seguir comiendo.',
    'El puto grupo te ha concedido el silencio de los accidentes.',
    'Has puesto tu puto nombre al lado de "no mirar". El aviso llega tarde. Ya han mirado.',
    'El hilo de antes se ha muerto de vergüenza ajena.',
    'Alguien ha puesto el modo avión diez segundos.',
    'Has hecho que el "menos mal que no soy yo" se diga en voz alta.',
    'El carroñero ha cerrado la boca. Cuando el buitre pasa, el cadáver está demasiado.',
    'Has dejado una captura con más vida útil que tu dignidad.',
    'Asco, pena, y ganas de no ser tú.',
    'Has hecho un agujero en el puto ranking del tamaño de un silencio.',
    'Alguien ha escrito "se ha pasado" hablando del bot.',
    'Le has puesto cara de funeral al martes. Has aportado, inútil.',
    'El que te tenía de meme se ha encontrado con que el meme se ha vuelto documental.',
    'Has caído con público y sin red. La red era el puto grupo. Te han mirado caer.',
    'Te has comido la peor tirada de la semana en directo.',
    'El puto grupo ha hecho un "uf" colectivo. Un uf. Barato. Honesto. Letal.',
    'Nadie quería retomar con tu puto número todavía en pantalla.',
    'Alguien ha tapado el nombre con el dedo para enseñar solo la cifra.',
    'Has hecho que hasta el que disfruta viendo palos diga "bah, esto ya no".',
    'El ambiente se ha puesto de ascensor parado entre dos pisos.',
    'Has salido en el parte como "incidente".',
    'Te han dado el respeto invertido: no te bardean porque da cosa. Da cosa. Atesora eso.',
    'Has convertido tu puto nombre en una unidad de palo.',
    'El puto chat ha respirado cuando ha salido otro mensaje que no eras tú.',
    'Has hecho un cráter y el puto grupo ha asomado la cabeza.',
  ],
};



// Cada tramo se ordena de mas duro a mas suave: el bot saca primero lo peor.
for (const tramo of Object.keys(AURA)) AURA[tramo] = AURA[tramo];

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
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }

  const desde = Date.now() - (ultimoRanking.get(jid) || 0);
  if (desde < RANKING_COOLDOWN_MS) {
    // En horas cuando pasa de una: "vuelve en 180 min" se lee peor que "en 3 h".
    const min = Math.ceil((RANKING_COOLDOWN_MS - desde) / 60000);
    const cuanto = min >= 60
      ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`
      : `${min} min`;
    // Se le pincha por donde le duele: el que ESTA en el top lo pide por
    // vanidad y el que no esta lo pide por envidia. Cuesta una lectura del
    // ranking, y solo en la rama que ya iba a rechazar la peticion.
    const quien = getSender(msg);
    let enTop = false;
    try {
      const r = soloMiembros(await getAuraRanking(jid), groupMeta).slice(0, 10);
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
      text: `*TOP EN COOLDOWN*\n${fraseCooldown(pool, `${jid}|top|${enTop ? 'ansias' : 'pobre'}`, 0)}\n_Vuelve en *${cuanto}*._${copia}`,
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
  const ranking = soloMiembros(await getAuraRanking(jid), groupMeta)
    .slice(0, 10);
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
      text: '*TOP SIN CAMBIOS*\nEl top no ha cambiado desde la última vez. Mueve algo y vuelve.',
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
  try { objDia = await objetivoDelDia(jid, groupMeta); } catch { /* el top sale igual */ }
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
  // Por eso *!dar* SI esta aqui: es la unica puerta que no se anuncia en ningun
  // otro sitio, asi que fuera de la guia deja de existir. Si algun dia se
  // anuncia sola, puede salir.
  //
  // Un solo numero, y sacado de la constante: el arranque, que es lo que da la
  // escala de todo lo demas.
  return `*LA GUÍA DEL AURA*

La moneda del grupo. Empiezas con *${fmt(ARRANQUE)}* y casi todo cuesta.

*Para tener más: escribe, y no faltes ningún día.* Es lo único que suma de verdad. Lo demás es jugártela.

*!aura* — te da o te quita, a suerte
*!robo* @alguien [cuánto] — se lo quitas
*!duel* @alguien — 1v1
*!aura apostar* [cuánto] — te lo juegas
*!tienda* — te compras algo
*!dar* @alguien — le regalas

*!saldo* — lo que tienes
*!aura top* — quién va ganando

_Cada comando te explica sus reglas cuando lo usas. No hay que aprenderse nada._`;
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
  '¿Apostar tú? Ni de broma. Antes junta algo de saldo y luego hablamos.',
  'Vienes más pelado que una rata de alcantarilla. Aquí no se juega con pena.',
  'Esa miseria no vale ni para limpiarme el culo, no te digo ya para apostar.',
  'La mesa tiene un mínimo y tú tienes menos que eso, gilipollas.',
  'Con lo que tienes no apuestas, mendigas. Y aquí no se reparte caridad.',
  'Joder, qué vergüenza ajena da tu saldo. Vuelve cuando no seas un puto pordiosero.',
  'Eso no es aura, es la mierda que queda en el fondo del bolsillo.',
  'Ni para propina llega eso, coño. Vete a pedir a otro lado.',
  'Aquí se apuesta con cojones, no con las migajas que te quedan.',
  'Con ese agujero de saldo lo único que arriesgas es hacer el ridículo.',
  'Estás más seco que un río en agosto. Junta saldo y vuelve, pringado.',
  'No hay mínimo que sobreviva a tu miseria. Larga de la mesa.',
];

async function jugarApuesta(sock, msg, groupMeta, args) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
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
        text: `*APUESTA EN COOLDOWN*\n${fraseCooldown(AURA_APOSTAR, `${clave}|apostar`)}\n_Vuelve en *${h ? h + 'h ' : ''}${m}min*._`,
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
    const conAmuleto = await tiendaObj.gastarUso(jid, sender, 'amuleto').catch(() => false);
    if (conAmuleto) {
      pReal = Math.min(0.95, pReal + OBJETOS.amuleto.bono);
      pVisible = Math.min(0.95, pVisible + OBJETOS.amuleto.bono);
    }
    const gana = esOwnerPrincipal ? ownerGana(jid, pReal) : Math.random() < pReal;
    const sello = etiquetaRiesgo(fraccion);

    // El pago SUBE con lo que te juegas de lo tuyo. El acierto BAJA. Las dos
    // palancas juntas son lo que hace que 300 y todo no sean la misma ficha.
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
      `\n_${Math.round(pVisible * 100)}% de salir · ×${mult.toFixed(2)} si gana${sello ? ` · ${sello}` : ''}._` +
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
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SIN_PERMISO, jid, 'permiso') }, { quoted: msg });
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
    const quien = getSender(msg);
    const mio = await getAura(jid, quien);
    return sock.sendMessage(jid, {
      text: `Tienes *${fmt(mio)}* de aura.`,
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
      text: `*TIRADA EN COOLDOWN*\n${fraseCooldown(AURA_TIRADA, `${coolKey}|tirada`)}\n_Vuelve en *${duracion(remaining)}*._`,
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
  const sign = amount >= 0 ? '+' : '-';
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
  const effectiveTier = (previous < 0 && amount < 0) ? 'spiral' : tier;

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
          extraObjetivo = nombre
            ? `\n_Hoy se caza a *${nombre}*: ${pagaTxt}._`
            : `\n_Hoy se caza a @${obj.jid.split('@')[0]}: ${pagaTxt}._`;
        }
      }
    }
  } catch { /* sin objetivo el comando sigue; no es un dato sin el que no se tire */ }

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

module.exports = { cmdAura };
