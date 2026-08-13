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
    'Ganaste tan limpio que nadie pudo decir ni una cosa. Y eso aquí casi no pasa. En este chat eso pesa más de lo que parece, patético.',
    'El chat se frenó de verdad. No por respeto: por sorpresa de que fueras tú. En este chat eso pesa más de lo que parece, miserable.',
    'Hoy te tocó estar arriba y al grupo le costó admitirlo. Se les notó en la cara. En este chat eso pesa más de lo que parece, qué cringe.',
    'Sacaste un número que obligó a tragar saliva. Algunos todavía lo digieren. En este chat eso pesa más de lo que parece, da asco.',
    'Nadie te felicitó y eso es lo mejor: la envidia muda es el premio gordo. En este chat eso pesa más de lo que parece, qué vergüenza.',
    'Aura alta y silencio ajeno. Esa combinación vale más que cualquier aplauso barato. En este chat eso pesa más de lo que parece, ridículo.',
    'Te tocó la franja buena. Aprovechala antes de que el ranking te vuelva a mirar feo. En este chat eso pesa más de lo que parece, fracasado.',
    'Hoy el azar te hizo el favor que el grupo no te hace nunca. En este chat eso pesa más de lo que parece, qué miseria.',
    'Subiste y se notó. No hace falta que lo grites: el número ya lo hizo. En este chat eso pesa más de lo que parece, da grima.',
    'Tirada limpia. En este chat eso ya es una forma de humillar sin insultar. En este chat eso pesa más de lo que parece, qué nivel de pena.',
    'El contador de aura te dejó bien parado. No arruines el momento con soberbia barata. En este chat eso pesa más de lo que parece, basura.',
    'Ganaste en serio. El resto puede mirar para otro lado: el archivo no miente. En este chat eso pesa más de lo que parece, qué cutre.',
    'Hoy no fuiste paisaje. Fuiste el dato incómodo del ranking. En este chat eso pesa más de lo que parece, da pena ajena.',
    'Aura en zona alta. Disfrutalo sin convertirlo en personalidad completa. En este chat eso pesa más de lo que parece, qué vacío.',
    'El bot te dio margen. El grupo te dio silencio. Combinación perfecta. En este chat eso pesa más de lo que parece, indignante.',
    'Subida clara. Si alguien se ríe, que revise el número primero. En este chat eso pesa más de lo que parece, qué flojo.',
    'Hoy el ranking te hizo lugar. No es cariño: es resultado. En este chat eso pesa más de lo que parece, menudo desastre.',
    'Tirada de las que callan bocas. Aprovechá el aire raro del chat. En este chat eso pesa más de lo que parece, qué pena.',
    'Estás arriba en esta pasada. Mañana puede no repetirse: cobrá el momento. En este chat eso pesa más de lo que parece, da vergüenza.',
    'Aura buena, ego en observación. No la cagues celebrando como idiota. En este chat eso pesa más de lo que parece, qué vergüenza ajena.',
    'Ganaste tan limpio que nadie pudo decir ni una cosa. Y eso aquí casi no pasa. Y el ranking lo registra igual.',
    'El chat se frenó de verdad. No por respeto: por sorpresa de que fueras tú. Y el ranking lo registra igual.',
    'Hoy te tocó estar arriba y al grupo le costó admitirlo. Se les notó en la cara. Y el ranking lo registra igual.',
    'Sacaste un número que obligó a tragar saliva. Algunos todavía lo digieren. Y el ranking lo registra igual.',
    'Nadie te felicitó y eso es lo mejor: la envidia muda es el premio gordo. Y el ranking lo registra igual.',
    'Aura alta y silencio ajeno. Esa combinación vale más que cualquier aplauso barato. Y el ranking lo registra igual.',
    'Te tocó la franja buena. Aprovechala antes de que el ranking te vuelva a mirar feo. Y el ranking lo registra igual.',
    'Hoy el azar te hizo el favor que el grupo no te hace nunca. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, qué miseria.',
    'Subiste y se notó. No hace falta que lo grites: el número ya lo hizo. Y el ranking lo registra igual.',
    'Tirada limpia. En este chat eso ya es una forma de humillar sin insultar. Y el ranking lo registra igual.',
    'El contador de aura te dejó bien parado. No arruines el momento con soberbia barata. Y el ranking lo registra igual.',
    'Ganaste en serio. El resto puede mirar para otro lado: el archivo no miente. Y el ranking lo registra igual.',
    'Hoy no fuiste paisaje. Fuiste el dato incómodo del ranking. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, da pena ajena.',
    'Aura en zona alta. Disfrutalo sin convertirlo en personalidad completa. Y el ranking lo registra igual.',
    'El bot te dio margen. El grupo te dio silencio. Combinación perfecta. Y el ranking lo registra igual.',
    'Subida clara. Si alguien se ríe, que revise el número primero. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, qué flojo.',
    'Hoy el ranking te hizo lugar. No es cariño: es resultado. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, menudo desastre.',
    'Tirada de las que callan bocas. Aprovechá el aire raro del chat. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, qué pena.',
    'Estás arriba en esta pasada. Mañana puede no repetirse: cobrá el momento. Y el ranking lo registra igual.',
    'Aura buena, ego en observación. No la cagues celebrando como idiota. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, qué vergüenza ajena.',
    'Aura buena, ego en observación. No la cagues celebrando como idiota. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, qué vergüenza ajena.'
  ],
  gain: [
    'Hoy no perdiste. En este chat eso ya es noticia, y el ranking lo registra sin pedirte aplauso, patético.',
    'Te dieron un empujón mínimo. Usalo o volvé a ser paisaje. En este chat eso pesa más de lo que parece, miserable.',
    'Suma pequeña, pero suma. El ranking no desprecia los enteros positivos. En este chat eso pesa más de lo que parece, qué cringe.',
    'Ganaste poco y aun así es más de lo que saca el que solo lee. En este chat eso pesa más de lo que parece, da asco.',
    'Aura al alza. No es fortuna divina: es un tramo que no te hundió. En este chat eso pesa más de lo que parece, qué vergüenza.',
    'Subiste lo justo para no llorar. En este grupo eso cuenta. En este chat eso pesa más de lo que parece, ridículo.',
    'Hoy el bot no te vació. Anotalo como victoria menor. En este chat eso pesa más de lo que parece, fracasado.',
    'Empuje chico. Si lo administrás bien, no vuelve a cero tan fácil. En este chat eso pesa más de lo que parece, qué miseria.',
    'Ganancia magra, pero legible. El archivo suma igual. En este chat eso pesa más de lo que parece, da grima.',
    'Hoy no saliste en rojo. Para varios del chat eso ya sería milagro. En este chat eso pesa más de lo que parece, qué nivel de pena.',
    'Te tocò un alza. No la conviertas en discurso de superioridad. En este chat eso pesa más de lo que parece, basura.',
    'Aura arriba un escalón. El grupo lo ve aunque no lo diga. En este chat eso pesa más de lo que parece, qué cutre.',
    'Suma limpia. Sin drama y sin agujero: raro y útil. En este chat eso pesa más de lo que parece, da pena ajena.',
    'Hoy el número te hizo un favor chico. No lo desperdicies hablando de más. En este chat eso pesa más de lo que parece, qué vacío.',
    'Ganaste margen. En este ranking el margen es oxígeno. En este chat eso pesa más de lo que parece, indignante.',
    'Alza contenida. Mejor eso que otra espiral de pérdida. En este chat eso pesa más de lo que parece, qué flojo.',
    'Hoy el contador te sonrió de costado. Aceptá la migaja con dignidad. En este chat eso pesa más de lo que parece, menudo desastre.',
    'Subida real aunque chica. El ego que necesita fuegos artificiales está enfermo. En este chat eso pesa más de lo que parece, qué pena.',
    'Te dieron algo. No es jackpot: es no perder. Aprendé la diferencia. En este chat eso pesa más de lo que parece, da vergüenza.',
    'Aura en verde tibio. Suficiente para no ser el chiste del día. En este chat eso pesa más de lo que parece, qué vergüenza ajena.',
    'Hoy no perdiste. En este chat eso ya es noticia. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, patético.',
    'Te dieron un empujón mínimo. Usalo o volvé a ser paisaje. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, miserable.',
    'Suma pequeña, pero suma. El ranking no desprecia los enteros positivos. Y el ranking lo registra igual, qué cringe.',
    'Ganaste poco y aun así es más de lo que saca el que solo lee. Y el ranking lo registra igual, da asco.',
    'Aura al alza. No es fortuna divina: es un tramo que no te hundió. Y el ranking lo registra igual, qué vergüenza.',
    'Subiste lo justo para no llorar. En este grupo eso cuenta. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, ridículo.',
    'Hoy el bot no te vació. Anotalo como victoria menor. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, fracasado.',
    'Empuje chico. Si lo administrás bien, no vuelve a cero tan fácil. Y el ranking lo registra igual, qué miseria.',
    'Ganancia magra, pero legible. El archivo suma igual. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, da grima.',
    'Hoy no saliste en rojo. Para varios del chat eso ya sería milagro. Y el ranking lo registra igual, qué nivel de pena.',
    'Te tocò un alza. No la conviertas en discurso de superioridad. Y el ranking lo registra igual, basura.',
    'Aura arriba un escalón. El grupo lo ve aunque no lo diga. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, qué cutre.',
    'Suma limpia. Sin drama y sin agujero: raro y útil. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, da pena ajena.',
    'Hoy el número te hizo un favor chico. No lo desperdicies hablando de más. Y el ranking lo registra igual, qué vacío.',
    'Ganaste margen. En este ranking el margen es oxígeno. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, indignante.',
    'Alza contenida. Mejor eso que otra espiral de pérdida. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, qué flojo.',
    'Hoy el contador te sonrió de costado. Aceptá la migaja con dignidad. Y el ranking lo registra igual, menudo desastre.',
    'Subida real aunque chica. El ego que necesita fuegos artificiales está enfermo. Y el ranking lo registra igual, qué pena.',
    'Te dieron algo. No es jackpot: es no perder. Aprendé la diferencia. Y el ranking lo registra igual, da vergüenza.',
    'Aura en verde tibio. Suficiente para no ser el chiste del día. Y el ranking lo registra igual, qué vergüenza ajena.',
    'Aura en verde tibio. Suficiente para no ser el chiste del día. Y el ranking lo registra igual, qué vergüenza ajena.'
  ],
  loss: [
    'Perdiste aura y el chat lo registró sin pedirte permiso. En este chat eso pesa más de lo que parece, patético.',
    'Hoy el número te bajó el ego un par de escalones. Hacía falta. En este chat eso pesa más de lo que parece, miserable.',
    'Pérdida clara. El ranking no reparte consuelo. En este chat eso pesa más de lo que parece, qué cringe.',
    'Se te fue una franja. No busques culpables afuera del teclado. En este chat eso pesa más de lo que parece, da asco.',
    'Hoy saliste más flaco de aura. El grupo no va a hacer velorio. En este chat eso pesa más de lo que parece, qué vergüenza.',
    'Bajaste. En este chat eso se nota más que cualquier excusa. En este chat eso pesa más de lo que parece, ridículo.',
    'El bot te cobró el peaje. El archivo firmó. En este chat eso pesa más de lo que parece, fracasado.',
    'Pérdida sin anestesia. El número es el único que habla claro. En este chat eso pesa más de lo que parece, qué miseria.',
    'Hoy no hubo milagro. Hubo resta. En este chat eso pesa más de lo que parece, da grima.',
    'Se te escurrió aura. Ojalá se te escurra también un poco de pose. En este chat eso pesa más de lo que parece, qué nivel de pena.',
    'Rojo en el corte. El ranking no acepta apelaciones emocionales. En este chat eso pesa más de lo que parece, basura.',
    'Perdiste y el silencio del grupo es el comentario. En este chat eso pesa más de lo que parece, qué cutre.',
    'Hoy el contador te dejó en evidencia. Otra vez. En este chat eso pesa más de lo que parece, da pena ajena.',
    'Bajón legible. No lo conviertas en monólogo de víctima. En este chat eso pesa más de lo que parece, qué vacío.',
    'Aura menos. Orgullo igual. Esa ecuación no cierra. En este chat eso pesa más de lo que parece, indignante.',
    'Te descontaron. El resto del chat lo leyó en tiempo real. En este chat eso pesa más de lo que parece, qué flojo.',
    'Pérdida chica o grande da igual: el sentido es el mismo. En este chat eso pesa más de lo que parece, menudo desastre.',
    'Hoy el azar no te regaló nada. Bienvenido al promedio. En este chat eso pesa más de lo que parece, qué pena.',
    'Se te movió el saldo para abajo. Ajustá la cabeza también. En este chat eso pesa más de lo que parece, da vergüenza.',
    'El ranking te pegó un tiro de fogueo. Dolió igual. En este chat eso pesa más de lo que parece, qué vergüenza ajena.',
    'Perdiste aura y el chat lo registró sin pedirte permiso. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, patético.',
    'Hoy el número te bajó el ego un par de escalones. Hacía falta. Y el ranking lo registra igual, miserable.',
    'Pérdida clara. El ranking no reparte consuelo. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, qué cringe.',
    'Se te fue una franja. No busques culpables afuera del teclado. Y el ranking lo registra igual, da asco.',
    'Hoy saliste más flaco de aura. El grupo no va a hacer velorio. Y el ranking lo registra igual, qué vergüenza.',
    'Bajaste. En este chat eso se nota más que cualquier excusa. Y el ranking lo registra igual, ridículo.',
    'El bot te cobró el peaje. El archivo firmó. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, fracasado.',
    'Pérdida sin anestesia. El número es el único que habla claro. Y el ranking lo registra igual, qué miseria.',
    'Hoy no hubo milagro. Hubo resta. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, da grima.',
    'Se te escurrió aura. Ojalá se te escurra también un poco de pose. Y el ranking lo registra igual, qué nivel de pena.',
    'Rojo en el corte. El ranking no acepta apelaciones emocionales. Y el ranking lo registra igual, basura.',
    'Perdiste y el silencio del grupo es el comentario. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, qué cutre.',
    'Hoy el contador te dejó en evidencia. Otra vez. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, da pena ajena.',
    'Bajón legible. No lo conviertas en monólogo de víctima. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, qué vacío.',
    'Aura menos. Orgullo igual. Esa ecuación no cierra. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, indignante.',
    'Te descontaron. El resto del chat lo leyó en tiempo real. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, qué flojo.',
    'Pérdida chica o grande da igual: el sentido es el mismo. Y el ranking lo registra igual, menudo desastre.',
    'Hoy el azar no te regaló nada. Bienvenido al promedio. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, qué pena.',
    'Se te movió el saldo para abajo. Ajustá la cabeza también. Y el ranking lo registra igual, da vergüenza.',
    'El ranking te pegó un tiro de fogueo. Dolió igual. Y el ranking lo registra igual, qué vergüenza ajena.',
    'El ranking te pegó un tiro de fogueo. Dolió igual. Y el ranking lo registra igual, qué vergüenza ajena.'
  ],
  spiral: [
    'Espiral activa: perdés, te alterás, y el próximo corte te vuelve a mirar feo. En este chat eso pesa más de lo que parece, patético.',
    'Hoy no fue un tropiezo: fue otro escalón hacia abajo. En este chat eso pesa más de lo que parece, miserable.',
    'La racha fea se te está haciendo costumbre. Eso ya es patrón. En este chat eso pesa más de lo que parece, qué cringe.',
    'Espiral. El número baja y el ego sube la voz para taparlo. En este chat eso pesa más de lo que parece, da asco.',
    'Otra pérdida en cadena. El archivo no necesita narrador. En este chat eso pesa más de lo que parece, qué vergüenza.',
    'Estás en modo derrape. El chat lo huele antes que vos. En este chat eso pesa más de lo que parece, ridículo.',
    'Espiral de aura: cada corte confirma el anterior. En este chat eso pesa más de lo que parece, fracasado.',
    'Hoy seguiste cayendo. La pose de que no importa se está gastando. En este chat eso pesa más de lo que parece, qué miseria.',
    'Racha negativa legible. Dejá de venderla como \'fase\'. En este chat eso pesa más de lo que parece, da grima.',
    'El hoyo se profundiza. El ranking no tira sogas. En este chat eso pesa más de lo que parece, qué nivel de pena.',
    'Espiral. Si el ego no frena, el contador tampoco. En este chat eso pesa más de lo que parece, basura.',
    'Otra resta. En serie ya no es mala suerte: es tendencia. En este chat eso pesa más de lo que parece, qué cutre.',
    'Estás girando hacia abajo. El grupo no va a fingir sorpresa. En este chat eso pesa más de lo que parece, da pena ajena.',
    'Espiral fea. El próximo mensaje tuyo no borra el número. En este chat eso pesa más de lo que parece, qué vacío.',
    'Caída repetida. El archivo te está haciendo un retrato. En este chat eso pesa más de lo que parece, indignante.',
    'Hoy la espiral te volvió a morder. Aprendé o repetí. En este chat eso pesa más de lo que parece, qué flojo.',
    'Modo pérdida sostenida. El ranking te tiene de ejemplar. En este chat eso pesa más de lo que parece, menudo desastre.',
    'Espiral. Cuanto más explicás, más claro se ve el agujero. En este chat eso pesa más de lo que parece, qué pena.',
    'Seguís en rojo de racha. Eso ya no se disimula con memes. En este chat eso pesa más de lo que parece, da vergüenza.',
    'Otra vuelta hacia abajo. El bot solo está documentando. En este chat eso pesa más de lo que parece, qué vergüenza ajena.',
    'Espiral activa: perdés, te alterás, y el próximo corte te vuelve a mirar feo. Y el ranking lo registra igual, patético.',
    'Hoy no fue un tropiezo: fue otro escalón hacia abajo. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, miserable.',
    'La racha fea se te está haciendo costumbre. Eso ya es patrón. Y el ranking lo registra igual, qué cringe.',
    'Espiral. El número baja y el ego sube la voz para taparlo. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, da asco.',
    'Otra pérdida en cadena. El archivo no necesita narrador. Y el ranking lo registra igual, qué vergüenza.',
    'Estás en modo derrape. El chat lo huele antes que vos. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, ridículo.',
    'Espiral de aura: cada corte confirma el anterior. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, fracasado.',
    'Hoy seguiste cayendo. La pose de que no importa se está gastando. Y el ranking lo registra igual, qué miseria.',
    'Racha negativa legible. Dejá de venderla como \'fase\' Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, da grima.',
    'El hoyo se profundiza. El ranking no tira sogas. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, qué nivel de pena.',
    'Espiral. Si el ego no frena, el contador tampoco. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, basura.',
    'Otra resta. En serie ya no es mala suerte: es tendencia. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, qué cutre.',
    'Estás girando hacia abajo. El grupo no va a fingir sorpresa. Y el ranking lo registra igual, da pena ajena.',
    'Espiral fea. El próximo mensaje tuyo no borra el número. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, qué vacío.',
    'Caída repetida. El archivo te está haciendo un retrato. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, indignante.',
    'Hoy la espiral te volvió a morder. Aprendé o repetí. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, qué flojo.',
    'Modo pérdida sostenida. El ranking te tiene de ejemplar. Y el ranking lo registra igual, menudo desastre.',
    'Espiral. Cuanto más explicás, más claro se ve el agujero. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, qué pena.',
    'Seguís en rojo de racha. Eso ya no se disimula con memes. Y el ranking lo registra igual, da vergüenza.',
    'Otra vuelta hacia abajo. El bot solo está documentando. Y el ranking lo registra igual, qué vergüenza ajena.',
    'Otra vuelta hacia abajo. El bot solo está documentando. Y el ranking lo registra igual, qué vergüenza ajena.'
  ],
  cursed: [
    'Hoy el corte salió hostil. Ni migaja ni empatía: solo resta. En este chat eso pesa más de lo que parece, patético.',
    'Maldito el tramo: el número te dejó en el piso sin ceremonia. En este chat eso pesa más de lo que parece, miserable.',
    'Pérdida pesada. El ranking te usó de ejemplo. En este chat eso pesa más de lo que parece, qué cringe.',
    'Hoy no hubo margen. El bot te pasó la factura completa. En este chat eso pesa más de lo que parece, da asco.',
    'Corte negro. El chat lo va a recordar más que tus excusas. En este chat eso pesa más de lo que parece, qué vergüenza.',
    'Te vaciaron el tramo con ganas. El archivo aplaudió en silencio. En este chat eso pesa más de lo que parece, ridículo.',
    'Hoy el aura te dio la espalda de verdad. En este chat eso pesa más de lo que parece, fracasado.',
    'Pérdida de las que duelen. Justo las que hacen falta a veces. En este chat eso pesa más de lo que parece, qué miseria.',
    'El contador te escribió un epitafio corto. En este chat eso pesa más de lo que parece, da grima.',
    'Hoy saliste hecho mierda en el saldo. El grupo no trae flores. En este chat eso pesa más de lo que parece, qué nivel de pena.',
    'Corte cruel. No busques significado: buscá ajuste. En este chat eso pesa más de lo que parece, basura.',
    'Te tocó el tramo feo. El ranking no reparte pañuelos. En este chat eso pesa más de lo que parece, qué cutre.',
    'Hoy el número fue una bofetada sin preámbulo. En este chat eso pesa más de lo que parece, da pena ajena.',
    'Pérdida dura. El ego puede hacer la fila para el reembolso. En este chat eso pesa más de lo que parece, qué vacío.',
    'El bot no te regaló ni el beneficio de la duda. En este chat eso pesa más de lo que parece, indignante.',
    'Hoy quedaste expuestro en rojo. Legible para todo el chat. En este chat eso pesa más de lo que parece, qué flojo.',
    'Corte de los que bajan el volumen del discurso. En este chat eso pesa más de lo que parece, menudo desastre.',
    'Te desarmaron el saldo. Rearmá la cabeza. En este chat eso pesa más de lo que parece, qué pena.',
    'Hoy la aura te trató como al resto cuando toca perder. En este chat eso pesa más de lo que parece, da vergüenza.',
    'Pérdida sin adorno. El archivo cerró el párrafo. En este chat eso pesa más de lo que parece, qué vergüenza ajena.',
    'Hoy el corte salió hostil. Ni migaja ni empatía: solo resta. Y el ranking lo registra igual, patético.',
    'Maldito el tramo: el número te dejó en el piso sin ceremonia. Y el ranking lo registra igual, miserable.',
    'Pérdida pesada. El ranking te usó de ejemplo. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, qué cringe.',
    'Hoy no hubo margen. El bot te pasó la factura completa. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, da asco.',
    'Corte negro. El chat lo va a recordar más que tus excusas. Y el ranking lo registra igual, qué vergüenza.',
    'Te vaciaron el tramo con ganas. El archivo aplaudió en silencio. Y el ranking lo registra igual, ridículo.',
    'Hoy el aura te dio la espalda de verdad. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, fracasado.',
    'Pérdida de las que duelen. Justo las que hacen falta a veces. Y el ranking lo registra igual, qué miseria.',
    'El contador te escribió un epitafio corto. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, da grima.',
    'Hoy saliste hecho mierda en el saldo. El grupo no trae flores. Y el ranking lo registra igual, qué nivel de pena.',
    'Corte cruel. No busques significado: buscá ajuste. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, basura.',
    'Te tocó el tramo feo. El ranking no reparte pañuelos. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, qué cutre.',
    'Hoy el número fue una bofetada sin preámbulo. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, da pena ajena.',
    'Pérdida dura. El ego puede hacer la fila para el reembolso. Y el ranking lo registra igual, qué vacío.',
    'El bot no te regaló ni el beneficio de la duda. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, indignante.',
    'Hoy quedaste expuestro en rojo. Legible para todo el chat. Y el ranking lo registra igual, qué flojo.',
    'Corte de los que bajan el volumen del discurso. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, menudo desastre.',
    'Te desarmaron el saldo. Rearmá la cabeza. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, qué pena.',
    'Hoy la aura te trató como al resto cuando toca perder. Y el ranking lo registra igual. En este chat eso pesa más de lo que parece, da vergüenza.',
    'Pérdida sin adorno. El archivo cerró el párrafo. Y el ranking lo registra igual, qué vergüenza ajena.',
    'Pérdida sin adorno. El archivo cerró el párrafo. Y el ranking lo registra igual, qué vergüenza ajena.'
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

 // The roll is rigged by the SENDER's own role — you only ever play your own aura. const selfIsOwner = isOwner(sender, msg.key.fromMe, groupMeta); const selfIsAdmin = isAdmin(groupMeta?.participants, sender); // Empujon por actividad: el bot mira el contador de !count del que tira. A // partir del umbral la tirada sale positiva algo mas a menudo. Es un plus // pequeno y no garantiza nada — el resultado sigue siendo aleatorio. let plusActividad = 0; let mensajes = 0; const esOwnerPrincipal = isMainOwner(sender, msg.key.fromMe, groupMeta); if (esOwnerPrincipal) { // Al owner principal el contador no le cuenta los mensajes (es lo que lo // mantiene fuera de !count y de los tops), así que preguntarle al contador // siempre devolvía 0 y era el único del grupo que jamás podía cobrar el plus // por actividad — castigado justo por el mecanismo que lo protege. Se le da // el TOPE directamente: de todo el grupo es quien más escribe. plusActividad = ACTIVIDAD_TOPE; } else { try { mensajes = await getUserCount(jid, sender); // Acumulativo: un escalón por cada ACTIVIDAD_MSGS, con tope. Antes era un // interruptor de sí/no y el que llevaba 40.000 mensajes iba igual que el // que acababa de pasar de 1.000. plusActividad = bonoActividad(mensajes); } catch { /* si el contador falla, se tira sin plus */ } } // ¿Esta tirada cobra? Las primeras TIRADAS_PAGADAS del día pagan de verdad; // de ahí en adelante la tirada sigue funcionando pero es cara o cruz a valor // esperado cero. Es lo que permite que las de arriba paguen bien sin que // nadie pueda fabricar aura dándole al botón toda la noche. // // Si el contador falla se cobra: preferimos regalar una tirada a bloquear el // comando por un problema de disco. let tiradasHoy = 1; try { tiradasHoy = await contarTirada(jid, sender); } catch { /* se cobra */ } const dePago = tiradasHoy <= TIRADAS_PAGADAS; const { tier, amount } = rollAura(selfIsOwner, selfIsAdmin, plusActividad, dePago); const sign = amount >= 0 ?'+' : '-'; const { previous, current } = await addAura(jid, sender, amount); // Already in the red and going deeper: use spiral phrases const effectiveTier = (previous < 0 && amount < 0) ?'spiral' : tier;

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
