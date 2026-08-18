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
// Bajado de 15 a 10 minutos por decision del owner. Con TIRADAS_PAGADAS en 10
// eso da algo mas de hora y media para cobrar el dia entero, que es tiempo de
// sobra sin convertir el comando en un boton de fabricar aura: a partir de la
// decima tirada el valor esperado es cero, tire quien tire y cuanto tire.
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
    'Ganaste tan limpio que el chat se quedó sin chiste. Aquí eso casi no pasa: anótalo antes de que el ego te lo gaste en teatro, cabrón.',
    'Alza gorda. El contador firmó a tu favor y el grupo lo vio entero. No lo conviertas en soberbia barata, joder.',
    'Hoy el aura te eligió sin anestesia positiva. Número arriba, boca cerrada un rato: el silencio también cotiza. Joder.',
    'Subida de las que duelen al que iba detrás. El ranking no pide permiso para reordenarte; solo lo hace, cabrón.',
    'Botín limpio. El archivo te puso en verde y el resto a tragar saliva. Que no se te suba a la cabeza el wifi, cabrón con racha.',
    'Ganancia real, no de pose. El hilo lo registró sin aplauso falso. Sostén el número o el próximo corte te lo cobra. Coño.',
    'Hoy no fue migaja: fue plato. El contador te sonrió y. el chat tomó nota. No gastes el crédito en monólogo, cabrón.',
    'Alza que se siente en el total. Aquí el respeto se farmea con números, no con discursos de sobremesa, joder.',
    'El aura te empujó fuerte. El grupo no te debe la vida; te debe el rastro que acabas de firmar. Cuídalo. Joder.',
    'Victoria de contador. Sin narrativa heroica: solo el dígito subiendo y el ego en observación, cabrón con suerte.',
    'Hoy el corte salió a tu favor y grande. El archivo no miente. El que discute el número discute con el aire, cabrón con racha.',
    'Subida limpia. En este chat eso pesa más que diez mensajes de pose. No lo cambies por teatro barato. Coño.',
    'Aura en verde fuerte. El ranking te acomodó arriba un tramo. Que el orgullo no te baje antes que el próximo tiro, cabrón.',
    'Ganaste espacio real en el total. No es caridad del bot: es el azar y tu racha. Adminístrala o la pierdes, joder.',
    'Alza de las que callan bocas. El chat vio el número y cambió el tono. No abras la boca de más. Joder.',
    'Hoy el contador te hizo el favor gordo. Anótalo: los favores en este grupo se cobran con intereses. El grupo lo vio de un vistazo, cabrón.',
    'Subida que se lee sin narrador. El dígito solo basta. El resto es ruido que no suma aura. El archivo no discute el dígito, cabrón con racha.',
    'Botín visible. El grupo no aplaude: archiva. Y el archivo te dejó en positivo gordo esta vez. El chat ya tomó nota sin pedirte permiso. Coño.',
    'Ganancia de las que reordenan el top. No te creas intocable: el próximo !aura no firma lealtad. Aquí el número pesa más que la labia, cabrón.',
    'Hoy saliste arriba de verdad. El ego querrá discursito; el contador prefiere que calles y sostengas, joder.',
    'Alza sin adorno. Número, punto. En este chat eso vale más que media hora de labia con racha. Joder.',
    'El aura te eligió en grande. No es amor: es tirada. Trátala como capital, no como identidad. El total habla solo, cabrón.',
    'Subida gorda registrada. El que iba a reírse se tragó el chiste. No le des material nuevo tan pronto, cabrón con racha.',
    'Victoria numérica. El ranking te movió y el hilo lo sintió. Baja el teatro; sube la constancia. El grupo lo vio de un vistazo. Coño.',
    'Hoy el total te quedó mejor puesto. Eso se farmea y se pierde. Hoy farmeaste. Mañana no está firmado, cabrón.',
    'Alza limpia de las que duelen al rival de ranking. Sin sangre: solo dígitos. Suficiente para este chat, joder.',
    'Ganaste aire. El contador te abrió margen. No lo gastes explicando por qué merecías más. Joder.',
    'Subida que no necesita hilo de justificación. El número habla. Tú solo no lo arruines con soberbia. El ranking lo registra entero, cabrón.',
    'Aura en modo generoso contigo. Raro. Anótalo. Aquí la generosidad dura lo que dura una tirada. Sin narrativa que lo tape, cabrón con racha.',
    'Hoy el corte fue hostil… para el que esperaba verte caer. Tú sumaste. Ellos aprendieron el número. El total habla solo. Coño.',
    'Botín de verdad. No migaja. El archivo cerró el párrafo a tu favor. Firma y sigue, sin discurso. Documentado en el contador, cabrón.',
    'Alza que se nota en el total de un vistazo. El grupo no necesita subtítulos. El dígito basta. El grupo lo vio de un vistazo, joder.',
    'Ganaste. Punto. En este chat eso ya es noticia. No la conviertas en novela de autoayuda barata. El archivo no discute el dígito. Joder.',
    'Subida fuerte. El ranking te reubicó. El ego quiere fiesta; el contador quiere la próxima tirada limpia, cabrón.',
    'Hoy el aura te hizo el trabajo sucio a favor. Cobró el azar en tu cuenta. No digas que era destino. Aquí el número pesa más que la labia, cabrón con racha.',
    'Victoria de mesa. Sin narrativa. Solo el total subiendo y el chat mirando de reojo afortunada. Coño.',
    'Alza registrada sin filtro. El bot no te felicita: te muestra el número. Eso es todo el cariño que hay, cabrón.',
    'Ganancia gorda. El que lleva la cuenta mental ya te recalculó. No le des motivos para celebrar tu caída, joder.',
    'Hoy saliste verde de verdad. Sostén el número con menos boca y más rastro. Aquí eso cotiza. Documentado en el contador. Joder.',
    'Subida limpia. El archivo te puso donde duele al que iba a reírse. Disfrútalo en silencio, cabrón. El grupo lo vio de un vistazo.',
    'El contador te sonrió en grande. Raro en este grupo. No lo malgastes en monólogo de sobremesa. El archivo no discute el dígito, cabrón con racha.',
    'Alza de ranking. No de ego. Confundir las dos es el camino más corto a la próxima espiral. Coño.',
    'Ganaste margen. El total lo dice sin adjetivos. Los adjetivos sobran cuando el dígito trabaja. Aquí el número pesa más que la labia, cabrón.',
    'Hoy el aura te empujó al alza fuerte. El chat archivó el resultado. Tú decide si lo cuidas o lo tiras, joder.',
    'Botín visible en el total. Sin poesía. Solo matemática del comando a tu favor esta vez. Sin narrativa que lo tape. Joder.',
    'Subida que cierra bocas un rato. Aprovecha el silencio: dura menos que tu racha. El total habla solo, gilipollas con suerte.',
    'Ganaste. El ranking lo firmó. El resto es decoración. No decores de más el momento Documentado en el contador, cabrón con racha.',
    'Alza gorda sin anestesia positiva. Duele al de abajo. A ti te toca no volverte insoportable tan rápido. Coño.',
    'Hoy el número te eligió. Mañana puede no. Administra el capital como adulto, no como influencer de aura, cabrón.',
    'Victoria contable. El hilo lo vio. El ego querrá discurso; dale descanso al grupo, joder.',
    'Subida real. No de pose. El archivo no premia relatos: premia el dígito que acabas de farmear. Aquí el número pesa más que la labia. Joder.',
    'Aura en verde intenso. El top se movió un milímetro a tu favor. En este chat un milímetro pesa. El ranking lo registra entero, cabrón.',
    'Ganaste espacio. No lo conviertas en trono. Los tronos aquí duran lo que dura un !aura en contra. Sin narrativa que lo tape, cabrón con racha.',
    'Alza limpia de las que no necesitan hilo de celebración. El número basta y sobra, cabrón. El total habla solo.',
    'Hoy el corte te dejó mejor parado. Anota la fecha: las buenas tiradas se recuerdan cuando vuelves a caer, cabrón.',
    'Botín de contador. El grupo no te ovaciona; te recalcula. Sé digno del recálculo. El grupo lo vio de un vistazo, joder.',
    'Subida fuerte registrada. Sin migas de consuelo para el que esperaba tu fail. Solo tu total subiendo. Joder.',
    'Ganaste. En este chat eso es más raro que un cumplido sincero. No lo desperdicies en teatro. El chat ya tomó nota sin pedirte permiso, cabrón.',
    'Alza que se lee en el total de un vistazo. Sin narrador. Sin bis. Solo el dígito a tu favor. Aquí el número pesa más que la labia, cabrón con racha.',
    'Hoy el aura te hizo rico un tramo. Rico de número, no de carácter. No confundas las cuentas. El ranking lo registra entero. Coño.',
    'Victoria de tirada. El azar te guiñó. El ego querrá atribuírselo. No le hagas caso Sin narrativa que lo tape, cabrón.',
    'Subida gorda. El archivo cerró verde. El próximo mensaje tuyo no debería arruinar el clima, joder.',
    'Ganaste margen real. El ranking te movió. Callar un poco también es estrategia de aura. Documentado en el contador. Joder.',
    'Alza sin adorno ni narrativa. Número arriba. Boca en observación. Así cotiza el respeto aquí. El grupo lo vio de un vistazo, cabrón.',
    'Hoy saliste a favor y se notó. El chat no lo dice con palabras: lo dice dejando de reírse de ti un rato, cabrón con racha.',
    'Botín limpio. El contador no hace favoritismos eternos. Hoy tocó. Adminístralo, cabrón. El chat ya tomó nota sin pedirte permiso.',
    'Subida que duele al ranking ajeno. Sin sangre. Solo matemáticas. Suficiente para este grupo. Aquí el número pesa más que la labia, cabrón.',
    'Ganaste. Punto final del párrafo. No agregues epílogo de soberbia o el próximo corte te lo cobra con intereses, joder.',
    'Alza registrada. El total te quedó más presentable. No lo celebras a gritos: aquí eso se ve cutre. Sin narrativa que lo tape.',
    'Hoy el aura te empujó. El grupo recalculó. Tú decide si el nuevo número te dura o se evapora, gilipollas con suerte.',
    'Victoria numérica sin poesía. El bot no escribe odas: escribe totales. El tuyo subió. Ya. Documentado en el contador, cabrón con racha.',
    'Subida fuerte. El que llevaba la cuenta mental apretó los dientes. No le des el placer de verte caer ya. Coño.',
    'Ganaste aire en el total. Respíralo sin discurso. El discurso gasta aura social aunque el número quede, cabrón.',
    'Alza gorda. Firma el momento y pasa página. Quedarte monologando es de pringado con racha. El chat ya tomó nota sin pedirte permiso.',
    'Hoy el contador te hizo el trabajo. Tú no fueras y lo arruines con pose de intocable Aquí el número pesa más que la labia. Joder.',
    'Botín visible. Ranking movido. Ego en cuarentena preventiva. Así se sostiene una alza en este chat. El ranking lo registra entero, cabrón.',
    'Subida limpia. El archivo te puso en verde. El resto del hilo a tragar. No pidas aplauso encima. Sin narrativa que lo tape, cabrón con racha.',
    'Ganaste. En este grupo eso ya es titular. No lo conviertas en editorial de soberbia, cabrón. El total habla solo.',
    'Alza real. Sin migaja. El dígito habla y el chat calla un segundo. Aprovecha ese segundo. Documentado en el contador, cabrón.',
    'Hoy el aura te eligió en grande. No digas destino. Di tirada. Y cuida el capital, joder.',
    'Hoy el total te hizo un guiño gordo. Guiño de número, no de destino. Cuídalo sin discurso, cabrón. Aquí el número manda.',
    'Alza real registrada. El chat no trae globos. Trae memoria. No le des material en contra tan pronto, gilipollas con suerte.',
    'Ganaste margen fuerte. El margen no es trono. Los tronos aquí duran un !aura. El chat tomó nota, cabrón con racha.',
    'Subida limpia. El archivo te dejó en verde intenso. Intenso se sostiene callando Aquí el número manda. Coño.',
    'Hoy el contador te empujó arriba de verdad. Arriba se cae más fuerte. Adminístralo. El archivo no discute el dígito, cabrón.',
    'Botín gordo. El ranking te recalculó. El ego quiere fiesta. La fiesta atrae cursed. El chat tomó nota, joder.',
    'Alza de las que duelen al de atrás. Duele el número ajeno. Tú no agregues soberbia, cabrón. Aquí el número manda.',
    'Victoria contable. Sin poesía. El dígito basta y sobra. Cualquier adjetivo te hace basura. El archivo no discute el dígito.',
    'Hoy saliste verde fuerte. Verde se defiende con menos boca y más rastro. El chat tomó nota, cabrón con racha.',
    'Subida gorda firmada. Firma y sigue. Quedarte monologando es de pringado con racha Aquí el número manda.',
    'Ganaste espacio real. Espacio no es corona. La corona aquí es de cartón. El archivo no discute el dígito, cabrón.',
    'Alza limpia. El buitre se quedó sin carroña un rato. No le regales la próxima, cabrón. El chat tomó nota.',
    'Hoy el aura te eligió en grande. Elección de tirada. No de merecimiento cósmico Aquí el número manda. Joder.',
    'Botín visible. Ranking movido. Ego en cuarentena. Así se sostiene. El archivo no discute el dígito, gilipollas con suerte.',
    'Subida fuerte. El grupo te recalculó sin aplauso. El aplauso aquí es trampa. El chat tomó nota, cabrón con racha.',
    'Ganaste. Punto. El punto final evita el epílogo de soberbia Aquí el número manda. El contador no ofrece apelación. Coño.',
    'Alza gorda. El total lo grita. Tú no grites. El grito gasta respeto. El archivo no discute el dígito, cabrón.',
    'Hoy el contador te hizo rico un tramo. Rico de número. Pobre de carácter si lo alardeas, cabrón. El chat tomó nota.',
    'Victoria de mesa. Mesa fría. Número caliente. No calientes el ego Aquí el número manda. El contador no ofrece apelación. Joder.',
    'Subida registrada sin filtro. Sin filtro también se celebra en silencio. El archivo no discute el dígito, gilipollas con suerte.'
  ],
  gain: [
    'Hoy no perdiste. En este chat eso ya es noticia. El ranking lo registró sin pedirte aplauso. El archivo no discute el dígito, cabrón.',
    'Alza contenida. Mejor eso que otra espiral. Sostén el número y no lo gastes en monólogo, cabrón. El chat ya tomó nota sin pedirte permiso.',
    'Subida chica pero verde. El archivo prefiere eso a tu discurso de “casi gano grande” Aquí el número pesa más que la labia. Joder.',
    'Ganancia modesta. El total se movió a tu favor. No lo conviertas en leyenda personal. El ranking lo registra entero, gilipollas con suerte.',
    'Hoy el corte te dejó un poco mejor. Un poco cuenta. Aquí los poco se acumulan o se evaporan. Sin narrativa que lo tape, cabrón con racha.',
    'Aura arriba un tramo. Sin fiesta. Sin bis. Solo el dígito haciendo su trabajo en silencio. El total habla solo. Coño.',
    'Subiste. No es portada; es pie de página positivo. Aun así pesa más que diez mensajes vacíos. Documentado en el contador, cabrón.',
    'Alza de las discretas. El chat casi no lo comenta. Mejor: menos teatro, más total. El grupo lo vio de un vistazo, joder.',
    'Hoy el contador te hizo un favor chico. Anótalo. Los favores chicos también se cobran. El archivo no discute el dígito. Joder.',
    'Ganancia sin drama. El ranking te movió un milímetro. En este grupo un milímetro es noticia. El chat ya tomó nota sin pedirte permiso, cabrón.',
    'Verde flojo pero verde. El que esperaba tu caída se quedó con el chiste a medias Aquí el número pesa más que la labia, cabrón con racha.',
    'Subida menor. El ego querrá inflarla. No le hagas caso: el número es el que es. El ranking lo registra entero. Coño.',
    'Hoy no sangraste aura. Ya es logro local. No lo celebres como mundial Sin narrativa que lo tape, cabrón.',
    'Alza contenida registrada. Mejor administración que otra tirada de soberbia barata. El total habla solo, joder.',
    'El aura te dio un empujón chico. Úsalo de colchón, no de trampolín de ego, cabrón. Documentado en el contador.',
    'Subiste un poco. El archivo lo firmó. El resto es ruido que no suma. El grupo lo vio de un vistazo, gilipollas con suerte.',
    'Ganancia discreta. El total respira mejor. Tú también deberías: menos boca, más rastro. El archivo no discute el dígito, cabrón con racha.',
    'Hoy el corte fue amable en lo mínimo. Lo mínimo aquí se agradece porque lo normal es el fail. El chat ya tomó nota sin pedirte permiso. Coño.',
    'Alza chica. No pide hilo de celebración. Pide que no la tires en la próxima Aquí el número pesa más que la labia, cabrón.',
    'Verde. Punto. En este chat eso ya cierra el párrafo mejor que tu labia. El ranking lo registra entero, joder.',
    'Subida de mantenimiento. El ranking no te coronó; te dejó de hundir un rato. Aprovecha. Sin narrativa que lo tape. Joder.',
    'Hoy sumaste. Poco. Suficiente para no ser el chiste del momento. No pidas más crédito. El total habla solo, gilipollas con suerte.',
    'Alza modesta firmada. El contador no hace odas. Solo mueve el total y sigue. Documentado en el contador, cabrón con racha.',
    'Ganaste aire chico. Respíralo sin discurso de superación. Aquí eso suena a estafa. El grupo lo vio de un vistazo. Coño.',
    'Subida contenida. El grupo lo vio y no aplaudió. Perfecto: el aplauso aquí suele ser trampa. El archivo no discute el dígito, cabrón.',
    'Hoy el aura te dejó en positivo menor. Adminístralo como adulto, no como influencer de tiradas. El chat ya tomó nota sin pedirte permiso, joder.',
    'Alza sin adorno. Número un poco más alto. Boca en observación. Así se sostiene, cabrón. Aquí el número pesa más que la labia.',
    'Sumaste. El archivo no se emocionó. Tú tampoco deberías. La emoción gasta foco. El ranking lo registra entero, gilipollas con suerte.',
    'Verde flojo. Mejor que rojo. El ranking te dio una tregua. No la malgastes en teatro Sin narrativa que lo tape, cabrón con racha.',
    'Hoy no caíste. En este grupo eso es casi una victoria moral. Casi. No la influes. El total habla solo. Coño.',
    'Alza chica registrada. El que lleva la cuenta mental te recalculó sin drama. Imita eso. Documentado en el contador, cabrón.',
    'Subiste un tramo menor. El total lo refleja. El ego no debería reflejar más que el total. El grupo lo vio de un vistazo, joder.',
    'Ganancia de las que no hacen titular. Perfecto. Los titulares aquí suelen terminar mal. El archivo no discute el dígito. Joder.',
    'Hoy el contador te sonrió chiquito. Sonrisa chiquita. No pidas foto del momento. El chat ya tomó nota sin pedirte permiso, gilipollas con suerte.',
    'Alza discreta. El hilo no se detuvo a celebrarte. Mejor: sigue el hilo y cuida el número. Aquí el número pesa más que la labia, cabrón con racha.',
    'Sumaste poco. El poco es capital. El capital se pierde explicando por qué merecías más. El ranking lo registra entero. Coño.',
    'Verde. Sin fiesta. Sin epílogo. Solo el dígito un poco menos miserable que antes, cabrón. Sin narrativa que lo tape.',
    'Hoy el aura te hizo el favor mínimo. El mínimo aquí es lujo. No lo trate como derecho. El total habla solo, joder.',
    'Alza contenida. Mejor eso que otra espiral de pérdida. En este chat eso pesa Documentado en el contador. Joder.',
    'Subida menor firmada. El ranking te movió sin preguntarte. Acepta el movimiento y calla. El grupo lo vio de un vistazo, cabrón.',
    'Ganaste un colchón chico. No saltes encima. Los saltos aquí terminan en cursed. El archivo no discute el dígito, cabrón con racha.',
    'Hoy no fue grande; fue suficiente. Suficiente para no abrir el parte de fallos. El chat ya tomó nota sin pedirte permiso. Coño.',
    'Alza de mantenimiento del ego. El número subió un poco. El ego debería quedarse quieto. Aquí el número pesa más que la labia, cabrón.',
    'Sumaste. El archivo cerró el renglón en verde flojo. Ya. Siguiente tirada sin discurso, cabrón. El ranking lo registra entero.',
    'Subida chica. El chat casi bosteza. Mejor bostezar que reírse de tu caída Sin narrativa que lo tape. Joder.',
    'Hoy el total te quedó un peldaño mejor. Un peldaño. No construyas escalera imaginaria. El total habla solo, gilipollas con suerte.',
    'Alza sin narrativa. El bot no escribe crónicas de subidas chicas. Solo el número Documentado en el contador, cabrón con racha.',
    'Ganancia modesta. El que esperaba drama se aburrió. Aburrir al buitre también es victoria. El grupo lo vio de un vistazo. Coño.',
    'Verde menor. Registrado. Sin bis. Sin hilo de gratitud al universo. El archivo no discute el dígito, cabrón.',
    'Hoy el aura te empujó despacio. Despacio llega más lejos que tu soberbia. El chat ya tomó nota sin pedirte permiso, joder.',
    'Alza contenida. El ranking no te debe platea. Te debe el dígito que acabas de farmear, cabrón. Aquí el número pesa más que la labia.',
    'Sumaste poco y bien. Lo bien es no haber sangrado. Anota esa diferencia. El ranking lo registra entero, gilipollas con suerte.',
    'Subida discreta. El grupo no cambió de tema por ti. Perfecto. No fuerces el tema Sin narrativa que lo tape, cabrón con racha.',
    'Hoy el corte te dejó respirar. Respira. No discurses. El discurso atrae el próximo fail. El total habla solo. Coño.',
    'Alza chica firmada en el total. El ego firma de más. Táchalo Documentado en el contador. El contador no ofrece apelación, cabrón.',
    'Ganaste margen mínimo. El mínimo sostiene. El máximo discurso hunde. El grupo lo vio de un vistazo, joder.',
    'Verde. Punto. Siguiente. En este chat la economía de palabras también cotiza, cabrón. El archivo no discute el dígito.',
    'Hoy no perdiste aura. Titular local. No lo mandes a portada nacional. El chat ya tomó nota sin pedirte permiso, gilipollas con suerte.',
    'Alza de las silenciosas. Las silenciosas duran más que las gritadas Aquí el número pesa más que la labia, cabrón con racha.',
    'Subiste un poco. El archivo lo sabe. Tú también. No hace falta hilo. El ranking lo registra entero. Coño.',
    'Ganancia contenida. Mejor administración que otra noche de espiral Sin narrativa que lo tape, cabrón.',
    'Hoy el contador fue neutro-positivo contigo. Acepta la neutralidad como regalo. El total habla solo, joder.',
    'Alza menor. El top no se movió; tu sótano sí un centímetro. Centímetro vale, cabrón. Documentado en el contador.',
    'Sumaste. Sin poesía. Sin destino. Solo tirada. Cuídala. El grupo lo vio de un vistazo. El contador no ofrece apelación, gilipollas con suerte.',
    'Subida chica. El buitre del chat se quedó sin carroña un rato. Ya es algo. El archivo no discute el dígito, cabrón con racha.',
    'Hoy el aura te dejó en paz relativa. La paz relativa aquí es lujo importado. El chat ya tomó nota sin pedirte permiso. Coño.',
    'Alza firmada. El número un poco menos triste. No pidas medalla por eso Aquí el número pesa más que la labia, cabrón.',
    'Ganaste un respiro. No lo conviertas en mitin. Los mitines gastan lo que el respiro dio. El ranking lo registra entero, joder.',
    'Verde flojo. El ranking te recalculó sin odio. Imita al ranking: menos odio, más número, cabrón. Sin narrativa que lo tape.',
    'Hoy sumaste sin hacer ruido. El silencio te favorece más que tu labia. El total habla solo. El contador no ofrece apelación, gilipollas con suerte.',
    'Alza discreta. Guardala. Las discretas pagan mejor a largo plazo que el teatro Documentado en el contador, cabrón con racha.',
    'Subida menor. El archivo no abrió champán. Tú tampoco deberías. No hay champán. El grupo lo vio de un vistazo. Coño.',
    'Ganancia de colchón. Si te tiras de cabeza igual te partes. No te tires. El archivo no discute el dígito, cabrón.',
    'Hoy el total te hizo un guiño. Un guiño. No un contrato de intocable. El chat ya tomó nota sin pedirte permiso, joder.',
    'Alza chica. Cierra el párrafo. Abre el siguiente sin soberbia, cabrón. Aquí el número pesa más que la labia.',
    'Sumaste poco. El poco bien administrado vence al mucho mal gastado. El ranking lo registra entero, gilipollas con suerte.',
    'Verde. Registrado. Sin epílogo. El epílogo es de los que van a caer Sin narrativa que lo tape, cabrón con racha.',
    'Hoy no fue cursed. Ya puedes exhalar. Exhala sin discurso de supervivencia. El total habla solo. Coño.',
    'Alza contenida. El chat lo archivó y siguió. Tú también sigue, sin monólogo Documentado en el contador, cabrón.',
    'Subiste. El número lo dice. Cualquier adjetivo de más sobra. El grupo lo vio de un vistazo, joder.',
    'Hoy sumaste un poco más. Un poco más es capital. No lo conviertas en mitología, cabrón. Aquí el número manda.',
    'Alza chica extra. El colchón crece milímetro a milímetro. Los milímetros cuentan. El archivo no discute el dígito, gilipollas con suerte.',
    'Subida contenida. Mejor eso que el discurso de casi. El casi no cotiza. El chat tomó nota. El contador no ofrece apelación, cabrón con racha.',
    'Verde menor otra vez. Acumular menores vence al teatro de un grande fallido Aquí el número manda. Coño.',
    'Hoy el total te hizo un favor chico. Favor chico. Cóbralo en silencio. El archivo no discute el dígito, cabrón.',
    'Ganancia discreta. El archivo sonríe flojo. Tú no sonrías de más. El chat tomó nota. El contador no ofrece apelación, joder.',
    'Alza de mantenimiento. Mantener también es ganar en este chat, cabrón. Aquí el número manda. El contador no ofrece apelación.',
    'Sumaste. El ranking no abrió champán. Perfecto. No hay champán. El archivo no discute el dígito, gilipollas con suerte.',
    'Hoy no sangraste. Titular local renovado. No lo mandes a nacionales. El chat tomó nota. El contador no ofrece apelación, cabrón con racha.',
    'Subida chica firmada. Firma corta. Epílogo prohibido Aquí el número manda. El contador no ofrece apelación. Coño.',
    'Verde flojo. Flojo y suficiente. Suficiente es una palabra adulta. El archivo no discute el dígito, cabrón.',
    'Alza contenida. El buitre bostezó. Mejor bostezo que pico. El chat tomó nota. El contador no ofrece apelación, joder.',
    'Hoy el aura te dejó respirar otra vez. Respira. No discurses, cabrón. Aquí el número manda. El contador no ofrece apelación.',
    'Ganancia mínima con máximo de sentido. El sentido es no haber caído. El archivo no discute el dígito, gilipollas con suerte.',
    'Subiste un peldaño. Peldaño. No escalera al cielo. El chat tomó nota. El contador no ofrece apelación, cabrón con racha.',
    'Alza discreta. Guardala como adulto. Los adultos no hacen hilo Aquí el número manda. El contador no ofrece apelación. Coño.',
    'Hoy el contador fue neutro-positivo. Acepta la neutralidad. El archivo no discute el dígito, cabrón.',
    'Sumaste poco. El poco bien llevado vence al mucho mal gastado. El chat tomó nota. El contador no ofrece apelación, joder.',
    'Verde. Punto. Siguiente sin soberbia, cabrón. Aquí el número manda. El contador no ofrece apelación.',
    'Alza chica. El silencio te favorece más que tu labia. El archivo no discute el dígito. El contador no ofrece apelación, gilipollas con suerte.'
  ],
  loss: [
    'Perdiste aura y el chat lo registró sin pedirte permiso. Aquí eso pesa más de lo que tu ego quiere admitir, basura.',
    'Sangría chica pero sangría. El total bajó y el archivo no ofrece pañuelos, patético. El chat ya tomó nota sin pedirte permiso.',
    'Hoy el corte te restó. Sin drama hollywoodense: solo el dígito en rojo y tu cara de circunstancia, ridículo.',
    'Pérdida firmada. El ranking te movió hacia abajo un tramo. El ego querrá explicación; el contador no, cabrón.',
    'Aura abajo. El grupo no necesita narrador: el número alcanza para el chiste, pringado. Sin narrativa que lo tape.',
    'Hoy perdiste. Poco o mucho, perdiste. El archivo cerró el renglón en rojo, cutre. El total habla solo.',
    'Restó. El total lo refleja. Tu discurso no lo va a parchear, basura. Documentado en el contador. El contador no ofrece apelación.',
    'Pérdida contenida. Aun así duele más el orgullo que el número. Prioridades rotas, patético. El grupo lo vio de un vistazo.',
    'El aura te cobró peaje. Peaje chico. Peaje igual. Aquí nadie viaja gratis, ridículo. El archivo no discute el dígito.',
    'Hoy el contador te miró feo. Feo de número. El resto es decoración de tu queja, cabrón. El chat ya tomó nota sin pedirte permiso.',
    'Sangraste aura. El hilo lo vio. No pidas empatía: pide mejor tirada la próxima, pringado. Aquí el número pesa más que la labia.',
    'Pérdida registrada sin anestesia. El bot no endulza el rojo. Solo lo imprime, cutre. El ranking lo registra entero.',
    'Bajaste. El ranking te reubicó. El ego está en negación. El número no, basura. Sin narrativa que lo tape.',
    'Hoy el corte fue menor y aun así te dejó el humor de funeral. El funeral es tu orgullo, patético. El total habla solo.',
    'Aura en rojo flojo. Rojo igual. El chat archiva y sigue. Tú te quedaste monologando, ridículo. Documentado en el contador.',
    'Perdiste un tramo. El total respira peor. Tú hablas más. Mala combinación, cabrón. El grupo lo vio de un vistazo.',
    'Pérdida chica. El buitre del grupo ya olfateó. No le des banquete de excusas, pringado. El archivo no discute el dígito.',
    'Hoy el aura te restó sin pedir disculpas. Aquí el comando no disculpa, cutre. El chat ya tomó nota sin pedirte permiso.',
    'Sangría. El archivo firmó. Tu autoestima quiere renegociar. No hay mesa de diálogo, basura. Aquí el número pesa más que la labia.',
    'Bajaste un poco. Un poco cuenta cuando el ego estaba de fiesta, patético. El ranking lo registra entero.',
    'Pérdida sin adorno. Número abajo. Boca de más. Cierra la boca, ridículo. Sin narrativa que lo tape. El contador no ofrece apelación.',
    'Hoy el contador te cobró. Cobró poco. Cobró. El recibo está en el total, cabrón. El total habla solo.',
    'Aura abajo un escalón. El escalón se siente. No lo tapices de labia, pringado. Documentado en el contador.',
    'Restó. El ranking no ofrece cuotas. Pagas de contado en silencio, cutre. El grupo lo vio de un vistazo.',
    'Hoy perdiste margen. El margen era tu colchón. Ahora duermes más duro, basura. El archivo no discute el dígito.',
    'Pérdida firmada en el total. El ego firmó de más con quejas. Tacha las quejas, patético. El chat ya tomó nota sin pedirte permiso.',
    'Sangraste. El chat no trajo flores. Trajo memoria para el próximo roast, ridículo. Aquí el número pesa más que la labia.',
    'Bajaste. Punto. El epílogo de victimismo sobra y ensucia el renglón, cabrón. El ranking lo registra entero.',
    'Hoy el aura te hizo el trabajo sucio en contra. Sucio de número. Límpiate el ego, pringado. Sin narrativa que lo tape.',
    'Pérdida contenida. Contenida no significa inexistente. El total lo prueba, cutre. El total habla solo.',
    'Rojo menor. El ranking te empujó un centímetro abajo. Centímetro de vergüenza, basura. Documentado en el contador.',
    'Hoy el corte te dejó peor parado. Peor es peor. No hay narrativa que lo vuelva “aprendizaje”, patético.',
    'Aura restada. El archivo no debate. Tú sí. Por eso pierdes dos veces, ridículo. El archivo no discute el dígito.',
    'Sangría chica. El orgullo la siente grande. Desajuste típico, cabrón. El chat ya tomó nota sin pedirte permiso.',
    'Perdiste. El contador lo gritó sin voz. El dígito basta, pringado. Aquí el número pesa más que la labia.',
    'Hoy bajaste sin espectáculo. El espectáculo lo pones tú después con la queja, cutre. El ranking lo registra entero.',
    'Pérdida registrada. Sin paño de lágrimas. Sin segundo intento en el mismo mensaje, basura. Sin narrativa que lo tape.',
    'El aura te mordió chiquito. Chiquito con dientes. Sangra igual, patético. El total habla solo. El contador no ofrece apelación.',
    'Restó. El total lo sabe. El grupo lo huele. Tú aún negocias con el aire, ridículo. Documentado en el contador.',
    'Hoy el ranking te reordenó a la baja. Acepta el orden o pelea con el espejo numérico, cabrón. El grupo lo vio de un vistazo.',
    'Sangraste aura. No es el fin del mundo. Es el fin de tu racha de postureo, pringado. El archivo no discute el dígito.',
    'Pérdida. El archivo cerró el párrafo. Tu boca lo quiere reabrir. No, cutre. El chat ya tomó nota sin pedirte permiso.',
    'Bajaste un tramo. El tramo se lee en el total. Cualquier adjetivo de más es ruido, basura. Aquí el número pesa más que la labia.',
    'Hoy el contador no te regaló nada. Te cobró. El recibo está público, patético. El ranking lo registra entero.',
    'Aura en rojo. Rojo flojo. Rojo. El chat no hace distinciones poéticas, ridículo. Sin narrativa que lo tape.',
    'Perdiste margen de error. Ahora cada tirada te pega más cerca del hueso, cabrón. El total habla solo.',
    'Sangría firmada. Sin narrador empático. Solo el número y tu cara, pringado. Documentado en el contador.',
    'Hoy restó. Mañana puede restar otra vez. El patrón lo eliges tú con cada !aura, cutre. El grupo lo vio de un vistazo.',
    'Pérdida chica con eco grande en el ego. El eco es el problema, basura. El archivo no discute el dígito.',
    'Bajaste. El ranking te anotó. El ego quiere apelación. No hay juzgado, patético. El chat ya tomó nota sin pedirte permiso.',
    'Aura abajo. El hilo lo incorporó sin ceremonia. Aprende de la falta de ceremonia, ridículo. Aquí el número pesa más que la labia.',
    'Hoy el corte te dejó el total más flaco. Flaco se nota. No lo vistas de “da igual”, cabrón. El ranking lo registra entero.',
    'Sangraste. Punto final. El punto suspensivo lo pone el que no acepta, pringado. Sin narrativa que lo tape.',
    'Pérdida registrada sin filtro. El bot no es tu terapeuta, cutre. El total habla solo. El contador no ofrece apelación.',
    'Restó. El grupo ya pasó al siguiente mensaje. Tú sigues en este. Por eso pesas menos, basura. Documentado en el contador.',
    'Hoy el aura te cobró peaje emocional y numérico. Doble ticket, patético. El grupo lo vio de un vistazo.',
    'Bajaste un poco y hablaste mucho. Mala tasa de cambio, ridículo. El archivo no discute el dígito. El contador no ofrece apelación.',
    'Pérdida. El archivo no ofrece cuotas ni empatía. Solo el total actualizado, cabrón. El chat ya tomó nota sin pedirte permiso.',
    'Sangría menor. El buitre anotó la coordenada. No le regales el mapa con tu queja, pringado. Aquí el número pesa más que la labia.',
    'Hoy perdiste aura. El resto es cuento. El cuento no sube el número, cutre. El ranking lo registra entero.',
    'Rojo. Firmado. Sin bis. Sin “pero es que”. El pero es que perdiste, basura. Sin narrativa que lo tape.',
    'Aura restada. El ranking te miró de arriba. Merecido por el número, no por la historia, patético. El total habla solo.',
    'Hoy el contador fue claro. Claro y en tu contra. La claridad duele más que el insulto, ridículo. Documentado en el contador.',
    'Sangraste. El chat no pidió detalles. Los detalles los inventas tú para tapar el dígito, cabrón. El grupo lo vio de un vistazo.',
    'Pérdida contenida. Contén también el monólogo. El monólogo empeora el promedio, pringado. El archivo no discute el dígito.',
    'Bajaste. El total lo exhibe. Tú exhibes excusas. El público prefiere el total, cutre. El chat ya tomó nota sin pedirte permiso.',
    'Hoy el aura te dejó peor. Peor es una palabra simple. Úsala. No la adornos, basura. Aquí el número pesa más que la labia.',
    'Restó. Sin poesía. Sin destino. Solo tirada en contra, patético. El ranking lo registra entero. El contador no ofrece apelación.',
    'Pérdida firmada en público. El público no trae pañuelos. Trae memoria, ridículo. Sin narrativa que lo tape.',
    'Sangría. El ego grita. El número susurra. El susurro gana, cabrón. El total habla solo. El contador no ofrece apelación.',
    'Hoy bajaste y se notó. Se notó porque el total no sabe mentir, pringado. Documentado en el contador. El contador no ofrece apelación.',
    'Aura abajo. Cierra el pico. Abre el próximo !aura con menos fe y más silencio, cutre. El grupo lo vio de un vistazo.',
    'Perdiste un tramo. El tramo no se debate. Se acumula, basura. El archivo no discute el dígito. El contador no ofrece apelación.',
    'Hoy el ranking te empujó abajo. Empujón chico. Orgullo grande herido. Desajuste, patético. El chat ya tomó nota sin pedirte permiso.',
    'Sangraste aura. El archivo lo dejó en actas. Actas públicas, ridículo. Aquí el número pesa más que la labia.',
    'Pérdida. El bot no te odia. Te resta. El odio lo pones tú al leerlo, cabrón. El ranking lo registra entero.',
    'Restó. El grupo siguió scrolleando. Tu ego se quedó en pausa. Suelta la pausa, pringado. Sin narrativa que lo tape.',
    'Hoy el corte te cobró. Cobra. Paga en silencio. El silencio es lo único que te queda digno, cutre. El total habla solo.',
    'Aura en rojo menor. Menor no es cero. Cero es lo que te queda de postura, basura. Documentado en el contador.',
    'Bajaste. Fin del parte. Cualquier apéndice de victimismo se tira a la basura, patético. El grupo lo vio de un vistazo.',
    'Hoy restó otra vez un tramo chico. Chico se acumula. Acumulado hunde, basura. Aquí el número manda. El contador no ofrece apelación.',
    'Pérdida extra firmada. El archivo no se cansa de restar. Tú sí de quejarte, patético. El archivo no discute el dígito.',
    'Sangría menor renovada. Renovada duele igual. El ego no aprendió, ridículo. El chat tomó nota. El contador no ofrece apelación.',
    'Bajaste otro centímetro. Centímetro de vergüenza pública, cabrón. Aquí el número manda. El contador no ofrece apelación.',
    'Hoy el contador te cobró de nuevo. Cobro en serie. Cliente habitual, pringado. El archivo no discute el dígito.',
    'Pérdida contenida. Contenida y visible. Visible te delata, cutre. El chat tomó nota. El contador no ofrece apelación.',
    'Restó. El total lo exhibe. Tú exhibes labia. Pierdes dos veces, basura. Aquí el número manda. El contador no ofrece apelación.',
    'Sangría chica. El buitre anotó. No dictes el artículo, patético. El archivo no discute el dígito. El contador no ofrece apelación.',
    'Hoy el ranking te empujó abajo otra vez. Empujón chico. Orgullo grande, ridículo. El chat tomó nota. El contador no ofrece apelación.',
    'Aura abajo. Cierra el pico. El pico no sube números, cabrón. Aquí el número manda. El contador no ofrece apelación.',
    'Pérdida firmada en actas. Actas públicas. Apelación inexistente, pringado. El archivo no discute el dígito.',
    'Bajaste. El grupo scrolleó. Tú te quedaste. Por eso pesas menos, cutre. El chat tomó nota. El contador no ofrece apelación.',
    'Hoy restó sin poesía. La poesía sobra en el rojo, basura. Aquí el número manda. El contador no ofrece apelación.',
    'Sangría. El recibo público no admite “pero es que”, patético. El archivo no discute el dígito. El contador no ofrece apelación.',
    'Pérdida. El espejo numérico no miente. Tú sí cuando narras, ridículo. El chat tomó nota. El contador no ofrece apelación.',
    'Hoy el corte te dejó peor otra vez. Peor se apila, cabrón. Aquí el número manda. El contador no ofrece apelación.',
    'Restó. Fin del renglón. Apéndice de victimismo a la basura, pringado. El archivo no discute el dígito.',
    'Sangría menor. Eco mayor en el ego. Desajuste clásico, cutre. El chat tomó nota. El contador no ofrece apelación.',
    'Hoy el contador fue claro otra vez. Claro y en tu contra, basura. Aquí el número manda. El contador no ofrece apelación.',
    'Bajaste. El dígito basta. Cualquier adjetivo sobra, patético. El archivo no discute el dígito. El contador no ofrece apelación.'
  ],
  spiral: [
    'Espiral activa: pierdes, te alteras, y el próximo corte te vuelve a mirar feo. El patrón ya apesta, basura.',
    'Espiral. El número baja y el ego sube la voz para taparlo. Se te oye el agujero, patético. El chat ya tomó nota sin pedirte permiso.',
    'Espiral de aura: cada corte confirma el anterior. El archivo no necesita narrador, ridículo. Aquí el número pesa más que la labia.',
    'Hoy la espiral te volvió a morder. Aprende o repite. El contador prefiere que repitas, cabrón. El ranking lo registra entero.',
    'Espiral. Si el ego no frena, el contador tampoco. Prioridades al revés, pringado. Sin narrativa que lo tape.',
    'Espiral fea. El próximo mensaje tuyo no borra el número. Solo lo subraya, cutre. El total habla solo.',
    'Cuanto más explicas, más clara se ve la espiral. Callar también es control de daños, basura. Documentado en el contador.',
    'Espiral registrada. El ranking te ve en bucle. El bucle no es personalidad; es fail, patético. El grupo lo vio de un vistazo.',
    'Otra vuelta. El total se adelgaza. El discurso engorda. Mala dieta, ridículo. El archivo no discute el dígito.',
    'Espiral. El chat ya no se sorprende. La falta de sorpresa es el insulto, cabrón. El chat ya tomó nota sin pedirte permiso.',
    'Hoy otra vez rojo en cadena. La cadena la armaste a tiradas. Suéltala, pringado. Aquí el número pesa más que la labia.',
    'Espiral activa. El ego grita “azar”. El historial susurra “patrón”. Gana el historial, cutre. El ranking lo registra entero.',
    'Bucle de pérdida. El archivo pone sellos repetidos. Se te acaba la tinta de la dignidad, basura. Sin narrativa que lo tape.',
    'Espiral. Cada !aura tuyo es un capítulo del mismo fail. Cambia de libro, patético. El total habla solo.',
    'Hoy la racha en contra te volvió a firmar. La firma es pública. El orgullo, público también, ridículo.',
    'Espiral. No es mala suerte: es estadística con tu nombre. Aprende a leerla, cabrón. El grupo lo vio de un vistazo.',
    'Otra mordida. El total sangra en cuotas. Las cuotas también arruinan, pringado. El archivo no discute el dígito.',
    'Espiral fea. El grupo ya tiene el meme listo. No le des el caption con tu queja, cutre. El chat ya tomó nota sin pedirte permiso.',
    'Hoy el contador te encadenó otra resta. Cadena visible. Orgullo invisible, basura. Aquí el número pesa más que la labia.',
    'Espiral. El próximo corte no viene a salvarte. Viene a confirmar, patético. El ranking lo registra entero.',
    'Bucle. Explicas. Restas. Explicas. Restas. El chat ya aprendió el ritmo, ridículo. Sin narrativa que lo tape.',
    'Espiral activa: el ego acelera y el aura frena. Choque frontal, cabrón. El total habla solo. El contador no ofrece apelación.',
    'Hoy otra vez el mismo agujero. El agujero no es el bot. Eres el patrón, pringado. Documentado en el contador.',
    'Espiral. El ranking te puso etiqueta de riesgo. La etiqueta se gana a tiradas, cutre. El grupo lo vio de un vistazo.',
    'Sangría en serie. El archivo no ofrece plancito de rescate. Ofrece memoria, basura. El archivo no discute el dígito.',
    'Espiral. Callar un ciclo también es jugada. Hablar en rojo es suicidio social, patético. El chat ya tomó nota sin pedirte permiso.',
    'Otra vuelta de pérdida. El total se parece cada vez más a tu racha de excusas, ridículo. Aquí el número pesa más que la labia.',
    'Espiral documentada. El hilo no necesita detective. El número basta, cabrón. El ranking lo registra entero.',
    'Hoy el bucle te escupió otra resta. Escupe menos labia y más silencio, pringado. Sin narrativa que lo tape.',
    'Espiral. El chat bosteza de tu patrón. El bostezo duele más que el roast, cutre. El total habla solo.',
    'Racha en contra firme. La firmeza no está en tu carácter; está en el rojo, basura. Documentado en el contador.',
    'Espiral. Cada justificación cava un centímetro más. Deja la pala, patético. El grupo lo vio de un vistazo.',
    'Hoy otra firma en rojo. El bolígrafo del contador no se cansa. Tú sí pareces cansado, ridículo. El archivo no discute el dígito.',
    'Espiral activa. El ego quiere “una más”. El historial quiere que pares, cabrón. El chat ya tomó nota sin pedirte permiso.',
    'Bucle de fail. El grupo ya no apuesta a tu recuperación. Apuesta a tu próxima caída, pringado. Aquí el número pesa más que la labia.',
    'Espiral. El total se derrite. El discurso se infla. Física del pringado, cutre. El ranking lo registra entero.',
    'Hoy la espiral te hizo el retrato otra vez. Retrato en rojo. Sin filtro que salve, basura. Sin narrativa que lo tape.',
    'Espiral. No es tragedia: es repetición. La repetición es más ridícula que el drama, patético. El total habla solo.',
    'Otra resta en cadena. La cadena se ve desde el primer mensaje del día, ridículo. Documentado en el contador.',
    'Espiral. El archivo pone “idem”. Idem es el insulto más seco, cabrón. El grupo lo vio de un vistazo. El contador no ofrece apelación.',
    'Hoy el contador te volvió a pasar la factura. Factura en serie. Cliente moroso de aura, pringado. El archivo no discute el dígito.',
    'Espiral fea. El próximo !aura no es esperanza. Es ruleta con el tambor casi lleno, cutre. El chat ya tomó nota sin pedirte permiso.',
    'Bucle. El ego niega. El número afirma. El grupo cree al número, basura. Aquí el número pesa más que la labia.',
    'Espiral. Te alteras, restas, te alteras. Manual del hundimiento, patético. El ranking lo registra entero.',
    'Hoy otra vez el mismo corte con el mismo resultado. Originalidad cero, ridículo. Sin narrativa que lo tape.',
    'Espiral activa. El ranking te dejó de tratar como excepción. Ahora eres patrón, cabrón. El total habla solo.',
    'Sangría en bucle. El paño de lágrimas se agotó en el chat, pringado. Documentado en el contador. El contador no ofrece apelación.',
    'Espiral. Cada mensaje tuyo post-pérdida suma vergüenza, no aura, cutre. El grupo lo vio de un vistazo.',
    'Hoy el agujero se profundizó. Profundo se oye cuando hablas, basura. El archivo no discute el dígito.',
    'Espiral. El bot no te persigue. Tú repites el comando. Autoría tuya, patético. El chat ya tomó nota sin pedirte permiso.',
    'Otra vuelta. El total ya ni se inmuta: bajó tantas veces que es rutina, ridículo. Aquí el número pesa más que la labia.',
    'Espiral. La rutina de perder también es una habilidad. Malísima, cabrón. El ranking lo registra entero.',
    'Hoy el rojo en serie te delató. Delato de patrón, no de azar, pringado. Sin narrativa que lo tape. El contador no ofrece apelación.',
    'Espiral documentada en actas. Actas públicas. Orgullo en quiebra, cutre. El total habla solo. El contador no ofrece apelación.',
    'Bucle de pérdida. El chat cambió de canal emocional. Ya no hay empatía en stock, basura. Documentado en el contador.',
    'Espiral. Si vas a tirar otra vez, al menos calla el preámbulo, patético. El grupo lo vio de un vistazo.',
    'Hoy la cadena te apretó otro eslabón. Eslabón numérico. Cuello del ego, ridículo. El archivo no discute el dígito.',
    'Espiral activa. El historial sonríe. Tú no. Por algo será, cabrón. El chat ya tomó nota sin pedirte permiso.',
    'Otra resta. El archivo pone sello repetido. Se te acaba el papel de dignidad, pringado. Aquí el número pesa más que la labia.',
    'Espiral. El grupo ya memorizó tu curva. La curva apunta abajo, cutre. El ranking lo registra entero. El contador no ofrece apelación.',
    'Hoy el contador te hizo el combo: resta + exposición. Combo del día, basura. Sin narrativa que lo tape.',
    'Espiral. No pidas consejo. Pide silencio y una tirada menos, patético. El total habla solo. El contador no ofrece apelación.',
    'Bucle. Explicar la espiral es alimentar la espiral. Corta el feed, ridículo. Documentado en el contador.',
    'Espiral. El ranking te puso en vigilancia. Vigilancia merecida, cabrón. El grupo lo vio de un vistazo.',
    'Hoy otra firma roja. El bolígrafo sigue. Tú decides si el cuaderno se llena, pringado. El archivo no discute el dígito.',
    'Espiral fea. El meme ya está escrito. Solo falta tu próxima línea, cutre. El chat ya tomó nota sin pedirte permiso.',
    'Sangría en serie sin pausa dramática. La falta de pausa es el chiste, basura. Aquí el número pesa más que la labia.',
    'Espiral. El ego quiere giro de guion. El número quiere continuidad, patético. El ranking lo registra entero.',
    'Hoy el bucle te escupió. Escupe menos y respira más, ridículo. Sin narrativa que lo tape. El contador no ofrece apelación.',
    'Espiral activa. El chat no trae escalera. Trae palomitas, cabrón. El total habla solo. El contador no ofrece apelación.',
    'Otra vuelta de fail. El fail ya no sorprende. La falta de sorpresa te borra, pringado. Documentado en el contador.',
    'Espiral. El total es un tobogán. Tú te negaste a ver la pendiente, cutre. El grupo lo vio de un vistazo.',
    'Hoy el rojo en cadena te hizo paisaje. Paisaje triste, basura. El archivo no discute el dígito. El contador no ofrece apelación.',
    'Espiral. Deja de regar el agujero con palabras. El agujero crece, patético. El chat ya tomó nota sin pedirte permiso.',
    'Bucle documentado. El detective es el contador. Caso cerrado cada tirada, ridículo. Aquí el número pesa más que la labia.',
    'Espiral. El próximo corte no te debe un break. Te debe continuidad estadística, cabrón. El ranking lo registra entero.',
    'Hoy otra vez. Idem. Idem es tu biografía corta de aura, pringado. Sin narrativa que lo tape. El contador no ofrece apelación.',
    'Espiral. Calla. Resta. Calla. Mejor versión del plan, cutre. El total habla solo. El contador no ofrece apelación.',
    'Sangría en bucle. El grupo ya cobró el abono al espectáculo, basura. Documentado en el contador. El contador no ofrece apelación.',
    'Espiral final del párrafo: el número bajó otra vez y tu labia no lo subió. Sorpresa para nadie, patético.',
    'Espiral: otra vuelta que el chat ya tenía memorizada. Originalidad cero, basura. Aquí el número manda.',
    'Bucle de pérdida renovado. El meme se escribe solo, patético. El archivo no discute el dígito. El contador no ofrece apelación.',
    'Hoy el patrón se confirmó otra vez. Confirmación pública, ridículo. El chat tomó nota. El contador no ofrece apelación.',
    'Espiral activa. El historial sonríe de lado. Tú no, cabrón. Aquí el número manda. El contador no ofrece apelación.',
    'Otra resta en cadena. Cadena visible desde ayer, pringado. El archivo no discute el dígito. El contador no ofrece apelación.',
    'Espiral. El ego niega. El número afirma. Gana el número, cutre. El chat tomó nota. El contador no ofrece apelación.',
    'Hoy el bucle te escupió de nuevo. Escupe menos labia, basura. Aquí el número manda. El contador no ofrece apelación.',
    'Espiral documentada. Idem en actas. Idem es tu biografía, patético. El archivo no discute el dígito. El contador no ofrece apelación.',
    'Sangría en serie. El abono al espectáculo ya se cobró, ridículo. El chat tomó nota. El contador no ofrece apelación.',
    'Espiral. Callar un ciclo también es jugada. Juega, cabrón. Aquí el número manda. El contador no ofrece apelación.',
    'Otra firma roja. El bolígrafo sigue fresco, pringado. El archivo no discute el dígito. El contador no ofrece apelación.',
    'Espiral fea. El caption del meme eres tú, cutre. El chat tomó nota. El contador no ofrece apelación.',
    'Hoy el agujero se profundizó un grado. Grado audible cuando hablas, basura. Aquí el número manda. El contador no ofrece apelación.',
    'Espiral. El ranking te dejó de sorprender. Mala señal, patético. El archivo no discute el dígito. El contador no ofrece apelación.',
    'Bucle. Explicas y restas. El ritmo ya es chiste interno, ridículo. El chat tomó nota. El contador no ofrece apelación.',
    'Espiral activa. Sin escalera. Solo palomitas del grupo, cabrón. Aquí el número manda. El contador no ofrece apelación.',
    'Hoy otra vez el mismo tobogán. La pendiente no cambió, pringado. El archivo no discute el dígito. El contador no ofrece apelación.',
    'Espiral. Deja la pala. El agujero sobra de profundo, cutre. El chat tomó nota. El contador no ofrece apelación.',
    'Sangría en bucle. Caso cerrado cada tirada, basura. Aquí el número manda. El contador no ofrece apelación.',
    'Espiral final del renglón: el número bajó y tu labia no lo subió, patético. El archivo no discute el dígito.'
  ],
  cursed: [
    'Hoy el corte salió hostil. Ni migaja ni empatía: solo resta gorda. El archivo cerró fuerte, basura. El archivo no discute el dígito.',
    'Pérdida grande. El total se notó de lejos. El ego también, pero de vergüenza, patético. El chat ya tomó nota sin pedirte permiso.',
    'Cursed de manual: el contador te pegó donde duele y el chat tomó asiento, ridículo. Aquí el número pesa más que la labia.',
    'Hoy el aura te desahució un tramo entero. Orden de desalojo numérico, cabrón. El ranking lo registra entero.',
    'Sangría gorda. El ranking te reubicó sin anestesia. El grito sobra, pringado. Sin narrativa que lo tape.',
    'Pérdida de las que reordenan el sótano. Bienvenido al nuevo piso, cutre. El total habla solo. El contador no ofrece apelación.',
    'Hoy el bot no te cobró peaje: te cobró multa. Multa visible en el total, basura. Documentado en el contador.',
    'Cursed. El número cayó feo. Tu narrativa de “azar” cayó peor, patético. El grupo lo vio de un vistazo.',
    'Restó fuerte. El archivo no ofrece plan de pagos. Pagas de golpe, ridículo. El archivo no discute el dígito.',
    'Hoy el contador te hizo un agujero de verdad. El agujero se ve en el total, cabrón. El chat ya tomó nota sin pedirte permiso.',
    'Pérdida hostil. El grupo no pregunta si estás bien. Pregunta cuánto bajaste, pringado. Aquí el número pesa más que la labia.',
    'Sangría de las que callan monólogos. Hasta tu labia se quedó corta, cutre. El ranking lo registra entero.',
    'Hoy el aura te miró con odio estadístico. Odio impreso en rojo, basura. Sin narrativa que lo tape. El contador no ofrece apelación.',
    'Cursed firmado. Sin paño. Sin segunda lectura. Solo el dígito hundido, patético. El total habla solo.',
    'Bajaste fuerte. El ranking te empujó dos tramos. El orgullo no encontró asidero, ridículo. Documentado en el contador.',
    'Hoy el corte fue una demolición chica del total. Demolición igual, cabrón. El grupo lo vio de un vistazo.',
    'Pérdida gorda registrada. El buitre del chat abrió el pico, pringado. El archivo no discute el dígito.',
    'Sangría sin adorno. Número en caída. Boca inútil, cutre. El chat ya tomó nota sin pedirte permiso. El contador no ofrece apelación.',
    'Hoy el contador te ejecutó un tramo. Ejecución pública de aura, basura. Aquí el número pesa más que la labia.',
    'Cursed. El total te quedó antiestético. La estética del fail, patético. El ranking lo registra entero.',
    'Restó feo. Feo de número. Feo de momento. Doble feo, ridículo. Sin narrativa que lo tape. El contador no ofrece apelación.',
    'Hoy el aura te dejó el colchón en el suelo. Duerme ahí un rato, cabrón. El total habla solo. El contador no ofrece apelación.',
    'Pérdida hostil. El archivo cerró de un portazo. El portazo se oye, pringado. Documentado en el contador.',
    'Sangría grande. El ego quiere mitin. El mitin empeora las actas, cutre. El grupo lo vio de un vistazo.',
    'Hoy bajaste de las que se comentan en silencio. El silencio es el roast, basura. El archivo no discute el dígito.',
    'Cursed de verdad. No de pose. El número no posa, patético. El chat ya tomó nota sin pedirte permiso. El contador no ofrece apelación.',
    'Restó fuerte y el ranking lo exhibió. Exhibición sin taquilla para ti, ridículo. Aquí el número pesa más que la labia.',
    'Hoy el contador te cobró con intereses emocionales. Pagas igual, cabrón. El ranking lo registra entero.',
    'Pérdida gorda. El grupo recalculó tu amenaza a la baja. Correcto, pringado. Sin narrativa que lo tape.',
    'Sangría. El total habla solo. Tú sobras en la escena, cutre. El total habla solo. El contador no ofrece apelación.',
    'Hoy el aura te hizo un agujero negro chico. Absorbe orgullo, basura. Documentado en el contador. El contador no ofrece apelación.',
    'Cursed. Firmado en actas. Actas que el próximo roast va a citar, patético. El grupo lo vio de un vistazo.',
    'Bajaste feo. Feo se lee en el total de un vistazo. Sin zoom, ridículo. El archivo no discute el dígito.',
    'Hoy el corte te dejó sin margen. Sin margen se vive peor, cabrón. El chat ya tomó nota sin pedirte permiso.',
    'Pérdida hostil registrada. Sin empatía de software. Solo resta, pringado. Aquí el número pesa más que la labia.',
    'Sangría de ranking. El ranking no trae flores al funeral del tramo, cutre. El ranking lo registra entero.',
    'Hoy el bot te restó como quien cobra una deuda vieja. Deuda de racha, basura. Sin narrativa que lo tape.',
    'Cursed. El dígito cayó y tu cara no tuvo tiempo de pose, patético. El total habla solo. El contador no ofrece apelación.',
    'Restó gordo. El archivo no discute. Tú sí. Por eso duele doble, ridículo. Documentado en el contador.',
    'Hoy el aura te pegó en público. Público de grupo. Audiencia completa, cabrón. El grupo lo vio de un vistazo.',
    'Pérdida grande. El sótano te dio la bienvenida otra vez, pringado. El archivo no discute el dígito. El contador no ofrece apelación.',
    'Sangría sin filtro. El filtro no existe para el rojo, cutre. El chat ya tomó nota sin pedirte permiso.',
    'Hoy el contador te escribió un párrafo corto y cruel. Corto y suficiente, basura. Aquí el número pesa más que la labia.',
    'Cursed de los que se recuerdan. El chat tiene memoria selectiva para fails, patético. El ranking lo registra entero.',
    'Bajaste fuerte. El ego buscó culpables. El único nombre en el recibo eres tú, ridículo. Sin narrativa que lo tape.',
    'Hoy el ranking te bajó el volumen de respeto. Volumen numérico, cabrón. El total habla solo. El contador no ofrece apelación.',
    'Pérdida hostil. Sin migaja. Sin “casi”. Solo el agujero, pringado. Documentado en el contador. El contador no ofrece apelación.',
    'Sangría gorda. El total se vio flaco de golpe. Dieta forzosa, cutre. El grupo lo vio de un vistazo. El contador no ofrece apelación.',
    'Hoy el aura te descontó con alevosía estadística. Alevosía del azar, basura. El archivo no discute el dígito.',
    'Cursed. El parte cerró en rojo intenso. Intenso se nota, patético. El chat ya tomó nota sin pedirte permiso.',
    'Restó. Fuerte. Público. Sin apelación. El pack completo, ridículo. Aquí el número pesa más que la labia.',
    'Hoy el contador te hizo el favor de ser claro. Claro y brutal, cabrón. El ranking lo registra entero.',
    'Pérdida grande firmada. El firmado duele más que el rumor, pringado. Sin narrativa que lo tape. El contador no ofrece apelación.',
    'Sangría. El grupo no ofrece GoFundMe de aura. Ofrece memoria, cutre. El total habla solo. El contador no ofrece apelación.',
    'Hoy bajaste de las que dejan el hilo quieto un segundo. Ese segundo es tu exposición, basura. Documentado en el contador.',
    'Cursed. Número abajo. Orgullo en el suelo. Orden correcto del universo local, patético. El grupo lo vio de un vistazo.',
    'Restó feo y el archivo no suavizó el adjetivo. No hay adjetivo: hay dígito, ridículo. El archivo no discute el dígito.',
    'Hoy el aura te cobró el show. Show a la baja. Taquilla en negativo, cabrón. El chat ya tomó nota sin pedirte permiso.',
    'Pérdida hostil. El buitre tomó notas. No le dictes el artículo con tu queja, pringado. Aquí el número pesa más que la labia.',
    'Sangría gorda sin ceremonia. La falta de ceremonia es el mensaje, cutre. El ranking lo registra entero.',
    'Hoy el contador te reubicó a la fuerza. Fuerza de número, basura. Sin narrativa que lo tape. El contador no ofrece apelación.',
    'Cursed de manual pedagógico: así se ve un total cuando el azar no te quiere, patético. El total habla solo.',
    'Bajaste. Fuerte. El adverbio sobra porque el total ya lo grita, ridículo. Documentado en el contador.',
    'Hoy el ranking te dejó el ego en mode avión. Sin señal de consuelo, cabrón. El grupo lo vio de un vistazo.',
    'Pérdida grande. El sótano tiene tu nombre en la puerta otra vez, pringado. El archivo no discute el dígito.',
    'Sangría. El archivo puso sello grueso. Sello grueso se lee de lejos, cutre. El chat ya tomó nota sin pedirte permiso.',
    'Hoy el aura te ejecutó un tramo entero. Ejecución sin último cigarro, basura. Aquí el número pesa más que la labia.',
    'Cursed. El chat aprendió el número nuevo. Aprendizaje colectivo a tu costa, patético. El ranking lo registra entero.',
    'Restó hostil. Hostil se siente en el silencio post-mensaje, ridículo. Sin narrativa que lo tape. El contador no ofrece apelación.',
    'Hoy el contador te escribió en rojo y subrayó. Subrayado público, cabrón. El total habla solo. El contador no ofrece apelación.',
    'Pérdida gorda. No hay subplot de redención en este mensaje. Solo el total, pringado. Documentado en el contador.',
    'Sangría de las que cierran el pico ajeno… y el propio si tienes dignidad, cutre. El grupo lo vio de un vistazo.',
    'Hoy el aura te dejó sin colchón ni narrativa. Desnudo de número, basura. El archivo no discute el dígito.',
    'Cursed firmado. El firmado es el roast. El resto es eco, patético. El chat ya tomó nota sin pedirte permiso.',
    'Bajaste fuerte. El eco de tu queja no sube el dígito. Nunca lo hizo, ridículo. Aquí el número pesa más que la labia.',
    'Hoy el ranking te cobró cara la tirada. Cara se ve en el total, cabrón. El ranking lo registra entero.',
    'Pérdida hostil. El grupo no hace velorio. Hace scroll, pringado. Sin narrativa que lo tape. El contador no ofrece apelación.',
    'Sangría gorda. Scroll. Memoria. Próximo roast con material fresco, cutre. El total habla solo. El contador no ofrece apelación.',
    'Hoy el contador te bajó del podio imaginario. El podio nunca existió, basura. Documentado en el contador.',
    'Cursed. Fin del parte. Cualquier apéndice de orgullo se tira con el resto de la basura, patético. El grupo lo vio de un vistazo.',
    'Hoy el corte hostil se repitió en grande. Grande se lee sin zoom, basura. Aquí el número manda. El contador no ofrece apelación.',
    'Cursed renovado. El sótano te dio la bienvenida otra vez, patético. El archivo no discute el dígito. El contador no ofrece apelación.',
    'Pérdida gorda extra. El total se vio flaco de golpe, ridículo. El chat tomó nota. El contador no ofrece apelación.',
    'Sangría hostil. El grupo hizo scroll con memoria, cabrón. Aquí el número manda. El contador no ofrece apelación.',
    'Hoy el contador te ejecutó otro tramo. Ejecución sin cigarro, pringado. El archivo no discute el dígito.',
    'Cursed firmado. Firmado duele más que el rumor, cutre. El chat tomó nota. El contador no ofrece apelación.',
    'Bajaste fuerte otra vez. El adverbio sobra: el total grita, basura. Aquí el número manda. El contador no ofrece apelación.',
    'Pérdida hostil. Sin migaja. Sin casi. Solo agujero, patético. El archivo no discute el dígito. El contador no ofrece apelación.',
    'Hoy el aura te desahució de nuevo. Desalojo numérico, ridículo. El chat tomó nota. El contador no ofrece apelación.',
    'Sangría gorda. El buitre tomó nota fina, cabrón. Aquí el número manda. El contador no ofrece apelación.',
    'Cursed. Número abajo. Orgullo en el suelo. Orden local, pringado. El archivo no discute el dígito. El contador no ofrece apelación.',
    'Restó feo. Feo de total. Feo de momento, cutre. El chat tomó nota. El contador no ofrece apelación.',
    'Hoy el ranking te bajó el volumen de respeto otra vez, basura. Aquí el número manda. El contador no ofrece apelación.',
    'Pérdida grande. Sin subplot de redención en este mensaje, patético. El archivo no discute el dígito. El contador no ofrece apelación.',
    'Sangría. El archivo puso sello grueso otra vez, ridículo. El chat tomó nota. El contador no ofrece apelación.',
    'Hoy el contador te escribió en rojo y subrayó, cabrón. Aquí el número manda. El contador no ofrece apelación.',
    'Cursed de los que se citan en el próximo roast, pringado. El archivo no discute el dígito. El contador no ofrece apelación.',
    'Bajaste de las que dejan el hilo quieto un segundo. Ese segundo te expone, cutre. El chat tomó nota. El contador no ofrece apelación.',
    'Pérdida hostil. El grupo no hace velorio. Hace memoria, basura. Aquí el número manda. El contador no ofrece apelación.',
    'Cursed. Fin del parte. Apéndice de orgullo a la basura, patético. El archivo no discute el dígito. El contador no ofrece apelación.'
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
  // Fuera los que estan a cero o en negativo. Un top es para presumir, y una
  // cola de gente con 0 y con numeros rojos no dice nada de nadie: solo alarga
  // la lista y molesta. Quien esta ahi ya se entera por su propio !aura.
  //
  // Ojo, esto NO es lo mismo que el suelo de SUELO_TODOS: aquel fue un rescate
  // de una vez, y despues de el se puede volver a caer a cero robando o
  // apostando. Por eso hace falta filtrar aqui y no basta con el suelo.
  const ranking = soloMiembros(await getAuraRanking(jid), groupMeta)
    .filter(r => r.aura > 0)
    .slice(0, 10);
  if (ranking.length === 0) {
    return sock.sendMessage(jid, { text: 'Nadie tiene aura que enseñar todavía. Usa *!aura*.' }, { quoted: msg });
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
 'Joder, vienes a apostar con el culo al aire y sin un puto duro de aura. La mesa no hace caridad. El grupo ya memorizó este fail, patético.',

 'Sin saldo y con pretensiones de high roller. Eres el chiste del casino, cabrón. No hay maquillaje que lo tape, miserable.',

 'Los bolsillos transparentes y la cara de querer ganar. Menuda combinación de gilipollas. Se te ve el cartón desde el otro lado del hilo, qué cringe.',

 'Apuestas con aura de mendigo y ego de dueño. El contraste da vergüenza ajena, mierda. Menuda forma de pedir que te humillen, da asco.',

 'No tienes con qué perder y aun así te sientas a la mesa. Pobreza con audacia, coño. El ranking no hace descuentos, qué vergüenza.',

 'El croupier virtual te mira y se rie. Cero aura, cero respeto, asco puro. El grupo ya memorizó este fail, ridículo.',

 'Vienes a apostar lo que no tienes. Eso no es valiente: es patético de manual. No hay maquillaje que lo tape, fracasado.',

 'Aura en negativo y manos en la mesa. El grupo ya sabe cómo acaba esto, basura. Se te ve el cartón desde el otro lado del hilo, qué miseria.',

 'Sin un puto punto y quieres el bote. La delusión es olímpica, ridículo. Menuda forma de pedir que te humillen, da grima.',

 'Pobre de aura y rico en cara dura. El casino no fía a fracasados como tú. El ranking no hace descuentos, qué nivel de pena.',

 'La mesa exige saldo. Tú ofreces vergüenza. No hay cambio posible. El grupo ya memorizó este fail, basura.',

 'Intentar apostar en bancarrota es el deporte de los que no aprenden, cabrón. No hay maquillaje que lo tape, qué cutre.',

 'Cero ficha, mil fantasías. Eres el cliente que echan antes de servir, gilipollas. Se te ve el cartón desde el otro lado del hilo, da pena ajena.',

 'El aura no llega ni para la propina simbólica. Fuera de la mesa, mierda. Menuda forma de pedir que te humillen, qué vacío.',

 'Apuestas de pobre: mucho teatro y nada en el bolsillo, coño. El ranking no hace descuentos, indignante.',

 'Sin saldo no hay jugada. Solo hay un pringado queriendo escena, asco. El grupo ya memorizó este fail, qué vergüenza ajena.',

 'La pobreza de aura te delata antes de que hables. Callate y farmea, patético. No hay maquillaje que lo tape, da vergüenza.',

 'Quieres apostar aire. El bot no cotiza aire, basura. Se te ve el cartón desde el otro lado del hilo, qué flojo.',

 'Miseria documentada y aun así en la cola del casino. Ridículo total. Menuda forma de pedir que te humillen, menudo desastre.',

 'No tienes aura. Tienes un hueco donde debería estar el saldo, fracasado. El ranking no hace descuentos, qué pena.',

 'All-in con los bolsillos vacíos. Eres un meme andante. El grupo ya memorizó este fail, patético.',

 'La mesa te rechaza por higiene económica del ranking, cabrón. No hay maquillaje que lo tape, miserable.',

 'Sin chips no hay drama heroico. Solo hay un pobre insistente, gilipollas. Se te ve el cartón desde el otro lado del hilo, qué cringe.',

 'Aura de sótano y boca de VIP. El combo da grima, mierda. Menuda forma de pedir que te humillen, da asco.',

 'Vuelves a la mesa sin haber ganado un puto mensaje de aura, coño. El ranking no hace descuentos, qué vergüenza.',

 'El casino no es un comedor social. Fuera, asco. El grupo ya memorizó este fail, ridículo.',

 'Apuesta denegada por pobreza crónica de ranking, patético. No hay maquillaje que lo tape, fracasado.',

 'No llegas al mínimo y pretendes el máximo. Basura con pretensiones. Se te ve el cartón desde el otro lado del hilo, qué miseria.',

 'El saldo grita miseria. Tú gritas all-in. El grupo elige a quién oír, ridículo. Menuda forma de pedir que te humillen, da grima.',

 'Pobreza de aura certificada. No hay mesa para ti hoy, fracasado. El ranking no hace descuentos, qué nivel de pena.',

 'Intentar farmear suerte sin farmear presencia. Estrategia de idiota. El grupo ya memorizó este fail, basura.',

 'La bancarrota no es estética. Es tu estado real, cabrón. No hay maquillaje que lo tape, qué cutre.',

 'Sin aura no hay apuesta. Hay un show de pobreza, gilipollas. Se te ve el cartón desde el otro lado del hilo, da pena ajena.',

 'El bot te cierra la ventanilla. Vuelve cuando tengas algo, mierda. Menuda forma de pedir que te humillen, qué vacío.',

 'Cero en el contador y mil en el ego. Desbalance de enfermo, coño. El ranking no hace descuentos, indignante.',

 'La mesa está abierta para quien paga. Tú no pagas, asco. El grupo ya memorizó este fail, qué vergüenza ajena.',

 'Pobre con manual de rich kid. Nadie compra el personaje, patético. No hay maquillaje que lo tape, da vergüenza.',

 'Aura insuficiente. Orgullo sobrante. Resultado: rechazo, basura. Se te ve el cartón desde el otro lado del hilo, qué flojo.',

 'No te alcanza ni para el peaje del casino, ridículo. Menuda forma de pedir que te humillen, menudo desastre.',

 'All-in emocional, all-out de saldo. Fracasado con estilo barato. El ranking no hace descuentos, qué pena.',

 'Vienes a perder lo que no tienes. Matemáticas de pringado. El grupo ya memorizó este fail, patético.',

 'El ranking te tiene fichado como cliente insolvente, cabrón. No hay maquillaje que lo tape, miserable.',

 'Sin ficha no hay historia. Hay un corte de luz a tu drama, gilipollas. Se te ve el cartón desde el otro lado del hilo, qué cringe.',

 'La pobreza se te lee en el aura y en la insistencia, mierda. Menuda forma de pedir que te humillen, da asco.',

 'Casino cerrado para mendigos de ranking, coño. El ranking no hace descuentos, qué vergüenza.',

 'No hay crédito. Hay solo un no en la cara, asco. El grupo ya memorizó este fail, ridículo.',

 'Apuesta imposible: saldo cero, dignidad en oferta, patético. No hay maquillaje que lo tape, fracasado.',

 'El grupo ya memorizó tu fail de pobre, basura. Se te ve el cartón desde el otro lado del hilo, qué miseria.',

 'Sin aura no entras. Punto final sin debate, ridículo. Menuda forma de pedir que te humillen, da grima.',

 'La mesa te debe cero. Tú le debes vergüenza, fracasado. El ranking no hace descuentos, qué nivel de pena.',

 'Joder, otra vez sin saldo y con hambre de apuesta. Aprende el peaje. El grupo ya memorizó este fail, basura.',

 'Cabrón, el casino no es terapia para tu miseria de aura. No hay maquillaje que lo tape, qué cutre.',

 'Gilipollas con los bolsillos de cristal. Se ve el vacío entero. Se te ve el cartón desde el otro lado del hilo, da pena ajena.',

 'Mierda de intento: apostar humo y esperar oro. Menuda forma de pedir que te humillen, qué vacío.',

 'Coño, farmea primero y presume después. El ranking no hace descuentos, indignante.',

 'Asco de clientela: quiere VIP con carnet de pobre. El grupo ya memorizó este fail, qué vergüenza ajena.',

 'Patético el ritual de sentarse sin un puto punto. No hay maquillaje que lo tape, da vergüenza.',

 'Basura de estrategia: suerte sin presencia previa. Se te ve el cartón desde el otro lado del hilo, qué flojo.',

 'Ridículo el all-in de quien no tiene ni el mínimo. Menuda forma de pedir que te humillen, menudo desastre.',

 'Fracasado de mesa: rechazado antes del shuffle. El ranking no hace descuentos, qué pena.',

 'Joder, el aura en dieta y el ego en buffet libre. El grupo ya memorizó este fail, patético.',

 'Cabrón, no hay silla para quien no paga el cubierto. No hay maquillaje que lo tape, miserable.',

 'Gilipollas, la pobreza no se disfraza con bravata. Se te ve el cartón desde el otro lado del hilo, qué cringe.',

 'Mierda, vuelves con las mismas manos vacías. Menuda forma de pedir que te humillen, da asco.',

 'Coño, el contador sigue en el sótano y tú en la cola. El ranking no hace descuentos, qué vergüenza.',

 'Asco, insistir sin saldo es una forma de mendigar escena. El grupo ya memorizó este fail, ridículo.',

 'Patético, el bot ya tiene plantilla para tu rechazo. No hay maquillaje que lo tape, fracasado.',

 'Basura, no hay plot twist: sigues pobre de aura. Se te ve el cartón desde el otro lado del hilo, qué miseria.',

 'Ridículo, la mesa ni se inmuta con tu drama. Menuda forma de pedir que te humillen, da grima.',

 'Fracasado, primero escribe, luego apuesta. El ranking no hace descuentos, qué nivel de pena.',

 'Joder, sin mensajes no hay milagro de fichas. El grupo ya memorizó este fail, basura.',

 'Cabrón, el casino lee el ranking mejor que tú. No hay maquillaje que lo tape, qué cutre.',

 'Gilipollas, la cara dura no cotiza como saldo. Se te ve el cartón desde el otro lado del hilo, da pena ajena.',

 'Mierda, otra denegación con tu nombre encima. Menuda forma de pedir que te humillen, qué vacío.',

 'Coño, miseria y pretensión en el mismo asiento. El ranking no hace descuentos, indignante.',

 'Asco, el vacío de aura se oye desde aquí. El grupo ya memorizó este fail, qué vergüenza ajena.',

 'Patético, quieres ganar sin haber farmeado nada. No hay maquillaje que lo tape, da vergüenza.',

 'Basura, el peaje existe precisamente por gente como tú. Se te ve el cartón desde el otro lado del hilo, qué flojo.',

 'Ridículo, all-in de aire comprimido. Menuda forma de pedir que te humillen, menudo desastre.',

 'Fracasado, la mesa te devuelve a la realidad del sótano. El ranking no hace descuentos, qué pena.',

 'Joder, no hay ficha mágica para el que no aparece en el hilo. El grupo ya memorizó este fail, patético.',

 'Cabrón, pobreza documentada y ego sin documentar vergüenza. No hay maquillaje que lo tape, miserable.',

 'Gilipollas, el rechazo es el único premio que te toca. Se te ve el cartón desde el otro lado del hilo, qué cringe.',

 'Mierda, saldo cero es un idioma y tú lo hablas fluido. Menuda forma de pedir que te humillen, da asco.',

 'Coño, deja de molestar la mesa hasta tener algo. El ranking no hace descuentos, qué vergüenza.',

 'Asco, el ranking no fía y el bot tampoco. El grupo ya memorizó este fail, ridículo.',

 'Patético, tu all-in es un grito de socorro disfrazado. No hay maquillaje que lo tape, fracasado.',

 'Basura, sin aura no hay butaca. Se te ve el cartón desde el otro lado del hilo, qué miseria.',

 'Ridículo, la bancarrota no es un estilo de juego. Menuda forma de pedir que te humillen, da grima.',

 'Fracasado, vuelve cuando el contador no se ría de ti. El ranking no hace descuentos, qué nivel de pena.',

 'Joder, otra vez el mismo pobre en la misma cola. El grupo ya memorizó este fail, basura.',

 'Cabrón, el casino cerró la pestaña de caridad. No hay maquillaje que lo tape, qué cutre.',

 'Gilipollas, tus manos vacías son el argumento entero. Se te ve el cartón desde el otro lado del hilo, da pena ajena.',

 'Mierda, no hay debate: no llegas. Menuda forma de pedir que te humillen, qué vacío.',

 'Coño, farmea aura o farmea silencio. El ranking no hace descuentos, indignante.',

 'Asco, la insistencia no genera saldo. El grupo ya memorizó este fail, qué vergüenza ajena.',

 'Patético, el no te lo sabes de memoria y aun así preguntas. No hay maquillaje que lo tape, da vergüenza.',

 'Basura, cliente insolvente del ranking. Se te ve el cartón desde el otro lado del hilo, qué flojo.',

 'Ridículo, apuesta fantasma con cuerpo presente. Menuda forma de pedir que te humillen, menudo desastre.',

 'Fracasado, la mesa te señala la salida sin levantar la voz. El ranking no hace descuentos, qué pena.',

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
      ? `\n_Veterano (${fmt(mensajes)} msgs): +${Math.round(plusActividad * 100)}% de suerte_`
      : '') +
    '';

  // NO se avisa de que la tirada ha dejado de pagar, por decision del owner:
  // "es totalmente irrelevante". Y lo es para quien juega — los importes que
  // salen son los mismos, lo unico que cambia es el valor esperado a la larga,
  // asi que el aviso no explicaba nada que se viera en pantalla y ensuciaba
  // todas las tiradas a partir de la octava.
  //
  // El freno sigue existiendo igual: `dePago` se calcula y se le pasa a
  // rollAura, que a partir de ahi tira a cara o cruz con valor esperado cero.
  // Lo unico que se ha quitado es el cartel.

  await sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: msg });
}

module.exports = { cmdAura };
