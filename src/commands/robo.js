const { isOwner, isMainOwner, isAdmin, getSender, getTarget, canonicalJid, sameUser } = require('../utils/wa');
const { getAura, addAura } = require('../utils/auraStore');
const { pickFresh, fmt, ordenarPorDureza } = require('../utils/helpers');
const { ROBO, RIESGO, ROBO_BASE, ROBO_LIMITES, ROBO_OWNER_MIN, BOTE, OBJETOS, CONTRA, DIANA } = require('../utils/economia');
const tienda = require('../utils/roboStore');
const RX = require('../data/roboExtraPhrases');

// La escala vive en utils/economia.js. Aqui solo el cooldown, que es de ritmo
// de juego y no de economia.
const STAKE_DEFAULT   = ROBO.porDefecto;
const STAKE_FLOOR     = ROBO.suelo;
const MIN_AURA        = ROBO.minVictima;
// 6 min, bajado desde 10. Con la probabilidad en rango de casino se acierta
// bastante menos, y esperar diez minutos para fallar hacia que el comando se
// usara poco. Sigue por debajo del escudo de la victima (7 min), asi que no se
// puede encadenar dos robos seguidos contra la misma persona.
const ROB_COOLDOWN_MS = 6 * 60 * 1000;

// Techo de lo que se puede mover en un robo concreto.
//
// OJO: esto NO recorta la cantidad que pides por gusto. Antes había un tope por
// fracción del saldo de la víctima y era lo que rompía el comando: pedías 52,
// la víctima tenía 52, y el bot robaba 18. Escribir un número y que salga otro
// hace que el comando parezca ignorarte, por mucho que se explique al final.
//
// Lo que queda son tres límites que no se pueden saltar sin romper la economía:
//   · la víctima no puede perder más de lo que tiene;
//   · el ladrón no puede apostar más de lo que podría pagar si le sale mal;
//   · y un techo absoluto, para que un solo comando no decida el ranking.
//
// Dentro de eso, la cantidad que pides es la que va. El precio de pedir mucho se
// paga en probabilidad, no en un recorte silencioso.
function topeRobo(auraLadron, auraVictima) {
  return Math.max(
    ROBO.suelo,
    Math.min(ROBO.techo, auraVictima, auraLadron),
  );
}

const lastRob = new Map(); // `${groupJid}|${canonicalJid}` -> timestamp

// %A = atacante (ladrón), %V = víctima
const ROB_WIN = [
  '%A le roba el aura a %V en plena cara del grupo: limpio, visible, sin anestesia. El chat lo vio entero y no hace falta replay, joder.',
  '%A entró a por el aura de %V y salió con ella: el chat no necesita dibujo. El chat lo vio entero y no hace falta replay, mierda.',
  'Robo limpio de %A a %V: el aura cambió de dueño y el ranking lo registró. El chat lo vio entero y no hace falta replay, coño.',
  '%A vs %V: gana el que atacó. %V se defendió como se defiende de todo: mal. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A vació lo que pudo del aura de %V: suficiente para que se note en el contador. El chat lo vio entero y no hace falta replay, gilipollas.',
  'El atraco de %A a %V salió redondo: botín en mano, víctima mirando el hueco. El chat lo vio entero y no hace falta replay, patético.',
  '%A no pidió permiso: se llevó el aura de %V y dejó el recibo en el chat. El chat lo vio entero y no hace falta replay, ridículo.',
  'Robo a favor de %A: %V pierde aura y la cara a la vez. El chat lo vio entero y no hace falta replay, basura.',
  '%A ejecutó el golpe a %V con la calma de quien ya había contado el botín. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A vs %V terminó con el contador de %A en más y el de %V en menos. El chat lo vio entero y no hace falta replay, asco.',
  '%A le quitó el aura a %V delante de todos: no hubo modo avión que lo ocultara. El chat lo vio entero y no hace falta replay, cutre.',
  'El plan de %A funcionó: el aura de %V no. Resultado en el ranking. El chat lo vio entero y no hace falta replay, pringado.',
  '%A salió a cazar y volvió con el trofeo: el trofeo se llama aura de %V. El chat lo vio entero y no hace falta replay, fracasado.',
  'Robo limpio: %A cobra, %V paga, el grupo presencia. El chat lo vio entero y no hace falta replay, joder.',
  '%A no improvisó: el aura de %V ya estaba en la lista. Ahora en su cuenta. El chat lo vio entero y no hace falta replay, mierda.',
  '%A vs %V: el ladrón ganó. El resto es ruido de la víctima. El chat lo vio entero y no hace falta replay, coño.',
  '%A se llevó el aura de %V con la precisión de quien no falla el momento. El chat lo vio entero y no hace falta replay, cabrón.',
  'Atraco exitoso: %A sonríe con el botín, %V cuenta lo que ya no tiene. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A entró, cobró el aura de %V y salió antes de que el drama creciera de más. El chat lo vio entero y no hace falta replay, patético.',
  '%A el golpe a %V conectó: el ranking actualiza sin pedir confirmación. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A le robó a %V en el timing perfecto: ni antes ni después, ahora. El chat lo vio entero y no hace falta replay, basura.',
  'Robo a cara descubierta: %A no se escondió, %V no se salvó. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A vs %V terminó con el botín en el bolsillo correcto: el de %A. El chat lo vio entero y no hace falta replay, asco.',
  '%A dejó a %V mirando el hueco donde antes había aura. El chat lo vio entero y no hace falta replay, cutre.',
  '%A ejecutó el atraco a %V sin pedir aplauso: el contador aplaude por él. El chat lo vio entero y no hace falta replay, pringado.',
  'El aura de %V cambió de manos: las manos son las de %A. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A no solo intentó: cobró. %V no solo se defendió: perdió. El chat lo vio entero y no hace falta replay, joder.',
  '%A vs %V: crónica breve de un robo que sí se ejecutó. El chat lo vio entero y no hace falta replay, mierda.',
  '%A se llevó lo suyo de la cuenta de %V: definición de atraco exitoso. El chat lo vio entero y no hace falta replay, coño.',
  'Robo limpio de %A: el grupo vio el golpe y el contador lo confirmó. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A cazó el aura de %V cuando %V menos lo tenía en la agenda. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A el botín de %V ya no es de %V: el ranking no discute. El chat lo vio entero y no hace falta replay, patético.',
  '%A vs %V terminó 1-0 con el 1 en la columna del que atacó bien. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A entró a por el aura y salió con ella: promesa cumplida. El chat lo vio entero y no hace falta replay, basura.',
  '%A le dejó a %V el recibo del robo en forma de mensaje de este comando. El chat lo vio entero y no hace falta replay, desperdicio.',
  'Atraco redondo: %A cobra, %V aprende, el chat archiva el resultado. El chat lo vio entero y no hace falta replay, asco.',
  '%A no falló el timing ni la puntería: %V falló la defensa. El chat lo vio entero y no hace falta replay, cutre.',
  '%A vs %V: el aura viajó en la dirección que %A había marcado. El chat lo vio entero y no hace falta replay, pringado.',
  '%A se llevó el botín de %V sin pedir la palabra en el grupo. El chat lo vio entero y no hace falta replay, fracasado.',
  'Robo exitoso de %A a costa de %V: visible, medible, archivado. El chat lo vio entero y no hace falta replay, joder.',
  '%A ejecutó el golpe con la lista de la compra: aura de %V, marcada. El chat lo vio entero y no hace falta replay, mierda.',
  '%A el contador de %V bajó: el de %A subió: aritmética del atraco. El chat lo vio entero y no hace falta replay, coño.',
  '%A vs %V terminó con %A contando y %V restando. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A no dejó el atraco en almost: lo cerró con botín de %V. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A se llevó el aura de %V en el momento en que el chat miraba. El chat lo vio entero y no hace falta replay, patético.',
  'Robo limpio: %A no necesita narrador, el resultado habla. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A vs %V: gana quien no se quedó mirando el aura propia. El chat lo vio entero y no hace falta replay, basura.',
  '%A cobró de %V lo que %V no pensaba soltar: el ranking insiste. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A el golpe a %V fue corto, claro y suficiente. Y el grupo no necesita que se lo expliquen dos veces, asco.',
  '%A entró, tomó el aura de %V y dejó el hueco de recuerdo. El chat lo vio entero y no hace falta replay, cutre.',
  '%A vs %V terminó con el botín en movimiento: destino %A. El chat lo vio entero y no hace falta replay, pringado.',
  '%A no pidió suerte: ejecutó. %V no tuvo suficiente defensa. El chat lo vio entero y no hace falta replay, fracasado.',
  'Atraco a favor de %A: %V en el parte como quien pierde aura. El chat lo vio entero y no hace falta replay, joder.',
  '%A se llevó lo marcado de la cuenta de %V sin letra pequeña. El chat lo vio entero y no hace falta replay, mierda.',
  '%A el plan salió como en la pizarra: aura de %V en su columna. El chat lo vio entero y no hace falta replay, coño.',
  '%A vs %V: el ladrón no solo intentó, cobró y se fue. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A robó el aura de %V con la calma de un trámite ya resuelto. El chat lo vio entero y no hace falta replay, gilipollas.',
  'Robo exitoso: %A con el botín, %V con la lección, el grupo con el dato. El chat lo vio entero y no hace falta replay, patético.',
  '%A no dejó espacio al drama de %V: primero el golpe, luego el mensaje. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A vs %V terminó 1-0 en el único marcador que importa: el del aura. El chat lo vio entero y no hace falta replay, basura.',
  '%A cazó a %V en el ranking y el contador firmó el resultado. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A el aura de %V viajó sin billete de vuelta. Y el grupo no necesita que se lo expliquen dos veces, asco.',
  '%A ejecutó el atraco a %V como quien cobra una deuda pendiente. El chat lo vio entero y no hace falta replay, cutre.',
  'Robo limpio de %A: sin asterisco, con botín, con público. El chat lo vio entero y no hace falta replay, pringado.',
  '%A vs %V: crónica de un golpe que sí aterrizó. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A se llevó el botín de %V y el chat no pidió repetición: se vio claro. El chat lo vio entero y no hace falta replay, joder.',
  '%A el contador no miente: %V menos, %A más. Y el grupo no necesita que se lo expliquen dos veces, mierda.',
  '%A entró a por el aura de %V y no salió de vacío. El chat lo vio entero y no hace falta replay, coño.',
  '%A vs %V terminó con el ranking actualizado a favor del atacante. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A cobró el aura de %V en el timing que %V no esperaba. El chat lo vio entero y no hace falta replay, gilipollas.',
  'Atraco redondo: %A no falló, %V no se salvó, el grupo no dudó. El chat lo vio entero y no hace falta replay, patético.',
  '%A se llevó lo suyo del bolsillo de %V: definición corta. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A el golpe fue suficiente: el aura de %V lo nota, el ranking también. El chat lo vio entero y no hace falta replay, basura.',
  '%A vs %V: gana %A. El resto es ruido de la defensa fallida. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A robó a %V sin pedir la palabra y sin devolver el aura. El chat lo vio entero y no hace falta replay, asco.',
  'Robo exitoso de %A: el botín de %V cambió de manos en público. El chat lo vio entero y no hace falta replay, cutre.',
  '%A ejecutó, cobró y dejó a %V con el hueco y el mensaje. El chat lo vio entero y no hace falta replay, pringado.',
  '%A vs %V terminó con el transfer en la dirección correcta para %A. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A no improvisó el final: el aura de %V ya estaba contada a su favor. El chat lo vio entero y no hace falta replay, joder.',
  '%A el atraco a %V salió limpio de fallos y lleno de botín. El chat lo vio entero y no hace falta replay, mierda.',
  '%A se llevó el aura de %V mientras el chat tomaba nota. El chat lo vio entero y no hace falta replay, coño.',
  'Robo limpio: %A cobra en silencio de víctima, %V en ruido de queja. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A vs %V: el marcador final no admite debate. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A entró a por %V y salió con el contador a favor. El chat lo vio entero y no hace falta replay, patético.',
  '%A el golpe a %V conectó donde tenía que conectar: el aura. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A vs %V terminó con %A en más y %V en el parte de bajas de aura. El chat lo vio entero y no hace falta replay, basura.',
  '%A robó el aura de %V con la precisión de quien no necesita segunda oportunidad. El chat lo vio entero y no hace falta replay, desperdicio.',
  'Atraco a favor de %A: visible en el ranking, legible en este mensaje. El chat lo vio entero y no hace falta replay, asco.',
  '%A se llevó el botín de %V sin pedir disculpas ni permiso. El chat lo vio entero y no hace falta replay, cutre.',
  '%A el plan contra %V funcionó de principio a fin. El chat lo vio entero y no hace falta replay, pringado.',
  '%A vs %V: crónica corta de un robo largo para el contador de %V. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A cobró de %V lo marcado: el ranking confirma el cargo. El chat lo vio entero y no hace falta replay, joder.',
  'Robo exitoso: %A con aura nueva, %V con el hueco documentado. El chat lo vio entero y no hace falta replay, mierda.',
  '%A ejecutó el atraco a %V en el momento en que más dolía perder. El chat lo vio entero y no hace falta replay, coño.',
  '%A vs %V terminó 1-0 sin prórroga: el 1 es de %A. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A se llevó el aura de %V y dejó el recibo en el hilo. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A el botín de %V ya tiene dueño nuevo: el ranking lo nombra. El chat lo vio entero y no hace falta replay, patético.',
  '%A vs %V: gana quien atacó con el contador a favor. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A robó a %V en plena luz del chat: sin sombra que lo tape. El chat lo vio entero y no hace falta replay, basura.',
  'Robo limpio de %A a costa de %V: medible, visible, archivado. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A entró, cobró el aura de %V y salió con el trabajo hecho. El chat lo vio entero y no hace falta replay, asco.',
  '%A el golpe fue corto: el efecto en el contador de %V, no. El chat lo vio entero y no hace falta replay, cutre.',
  '%A vs %V terminó con el transfer firmado a favor de %A. El chat lo vio entero y no hace falta replay, pringado.',
  '%A no dejó el atraco a medias: cerró con el aura de %V en su cuenta. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A se llevó lo que %V no pensaba soltar: el ranking insiste en el cargo. El chat lo vio entero y no hace falta replay, joder.',
  'Atraco redondo: %A ejecuta, %V paga, el grupo presencia el cambio. El chat lo vio entero y no hace falta replay, mierda.',
  '%A vs %V: el ladrón ganó el único round que importaba. El chat lo vio entero y no hace falta replay, coño.',
  '%A cobró el aura de %V con la calma de un trámite ya cerrado. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A el contador de %V bajó en público: no hay modo avión. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A vs %V terminó con %A contando botín y %V contando pérdidas. El chat lo vio entero y no hace falta replay, patético.',
  '%A robó a %V sin pedir la palabra y sin devolver ni una unidad. El chat lo vio entero y no hace falta replay, ridículo.',
  'Robo exitoso de %A: el aura de %V cambió de manos sin letra pequeña. El chat lo vio entero y no hace falta replay, basura.',
  '%A ejecutó el golpe a %V como quien marca una casilla pendiente. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A vs %V: crónica de un atraco que no se quedó en intento. El chat lo vio entero y no hace falta replay, asco.',
  '%A se llevó el botín de %V delante de quienes miraban el ranking. El chat lo vio entero y no hace falta replay, cutre.',
  '%A el plan salió: el aura de %V no se salvó. El chat lo vio entero y no hace falta replay, pringado.',
  '%A vs %V terminó 1-0 en aura: el resto es comentario. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A entró a por el aura de %V y cumplió el objetivo del mensaje. El chat lo vio entero y no hace falta replay, joder.',
  '%A cobró de %V en el timing que no perdona. Y el grupo no necesita que se lo expliquen dos veces, mierda.',
  'Robo limpio: %A con el botín, %V con el hueco, el chat con el dato. El chat lo vio entero y no hace falta replay, coño.',
  '%A vs %V: gana %A por ejecución, pierde %V por defensa insuficiente. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A se llevó el aura de %V y el recibo quedó en este hilo. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A el golpe a %V aterrizó: el ranking no pide segunda opinión. El chat lo vio entero y no hace falta replay, patético.',
  '%A vs %V terminó con el transfer en dirección %A. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A robó a %V en el momento exacto: ni antes ni después. El chat lo vio entero y no hace falta replay, basura.',
  'Atraco a favor de %A: %V en el parte, el aura en otra cuenta. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A ejecutó, cobró y dejó a %V con la cara del contador en menos. El chat lo vio entero y no hace falta replay, asco.',
  '%A vs %V: el botín se movió, el debate no hace falta. El chat lo vio entero y no hace falta replay, cutre.',
  '%A se llevó lo marcado del aura de %V sin pedir confirmación. El chat lo vio entero y no hace falta replay, pringado.',
  '%A el atraco a %V fue limpio de fallos y sucio de botín ajeno. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A vs %V terminó con %A en verde y %V en el hueco. El chat lo vio entero y no hace falta replay, joder.',
  '%A robó el aura de %V con público y sin remordimiento de contador. El chat lo vio entero y no hace falta replay, mierda.',
  'Robo exitoso: %A cierra el parte a su favor. Y el grupo no necesita que se lo expliquen dos veces, coño.',
  '%A entró a por %V y salió con el objetivo cumplido en el ranking. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A el golpe fue suficiente para que %V lo note el resto del día. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A vs %V: 1-0 sin VAR, sin prórroga, con botín. El chat lo vio entero y no hace falta replay, patético.',
  '%A cobró el aura de %V y el chat archivó el resultado. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A se llevó el botín de %V en el timing del que no avisa. El chat lo vio entero y no hace falta replay, basura.',
  '%A vs %V terminó con el ranking a favor del que atacó bien. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A ejecutó el atraco a %V como un cobro pendiente saldado. El chat lo vio entero y no hace falta replay, asco.',
  'Robo limpio de %A: el aura de %V viajó sin billete de retorno. El chat lo vio entero y no hace falta replay, cutre.',
  '%A vs %V: crónica corta, botín largo para %A. El chat lo vio entero y no hace falta replay, pringado.',
  '%A se llevó el aura de %V mientras %V todavía contaba la anterior. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A el contador no miente: %A más, %V menos, punto. El chat lo vio entero y no hace falta replay, joder.',
  '%A vs %V terminó con el transfer visible y el debate inútil. El chat lo vio entero y no hace falta replay, mierda.',
  '%A robó a %V sin sombra que lo oculte: luz de chat completa. El chat lo vio entero y no hace falta replay, coño.',
  'Atraco redondo: %A cobra el aura de %V en un solo movimiento limpio. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A ejecutó el golpe a %V y el ranking firmó debajo. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A vs %V: gana quien no se quedó con las manos vacías. El chat lo vio entero y no hace falta replay, patético.',
  '%A se llevó el botín de %V y dejó el mensaje como único recibo. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A el plan contra %V funcionó: el aura cambió de dueño. El chat lo vio entero y no hace falta replay, basura.',
  '%A vs %V terminó 1-0 en el marcador del aura. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A cobró de %V lo que el ranking ahora muestra a su favor. El chat lo vio entero y no hace falta replay, asco.',
  'Robo exitoso de %A a costa de %V: sin asterisco que lo relativice. El chat lo vio entero y no hace falta replay, cutre.',
  '%A entró a por el aura de %V y no aceptó un no por respuesta del contador. El chat lo vio entero y no hace falta replay, pringado.',
  '%A el golpe a %V fue corto en segundos y largo en efecto. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A vs %V terminó con %A en el lado correcto del transfer. El chat lo vio entero y no hace falta replay, joder.',
  '%A robó el aura de %V en plena sesión de chat: sin pausa ni aviso. El chat lo vio entero y no hace falta replay, mierda.',
  '%A vs %V: el ladrón cerró el parte antes de que la víctima terminara de quejarse. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A ejecutó el atraco a %V con lista cerrada: botín marcado, botín cobrado. El chat lo vio entero y no hace falta replay, gilipollas.',
  'Robo limpio: %A con aura de %V, %V con el hueco, el grupo con la foto. El chat lo vio entero y no hace falta replay, patético.',
  '%A vs %V terminó con el contador actualizado y el debate cerrado. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A se llevó el aura de %V cuando más se notaba en el ranking. El chat lo vio entero y no hace falta replay, basura.',
  '%A el botín de %V cambió de manos: las manos de %A no tiemblan. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A vs %V: 1-0 a favor de quien no falló el golpe. El chat lo vio entero y no hace falta replay, asco.',
  '%A cobró el aura de %V y dejó el hueco como recuerdo en el perfil. El chat lo vio entero y no hace falta replay, cutre.',
  'Atraco a favor de %A: medible en el ranking, legible en esta frase. El chat lo vio entero y no hace falta replay, pringado.',
  '%A ejecutó, %V pagó, el chat presenció: robo completo. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A vs %V terminó con el transfer en firme a nombre de %A. El chat lo vio entero y no hace falta replay, joder.',
  '%A robó a %V sin pedir turno de palabra en el grupo. El chat lo vio entero y no hace falta replay, mierda.',
  '%A el golpe a %V aterrizó en el aura: el resto es ruido. El chat lo vio entero y no hace falta replay, coño.',
  '%A vs %V: crónica de un atraco que sí tuvo final con botín. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A se llevó el aura de %V en el momento que el ranking no perdona. El chat lo vio entero y no hace falta replay, gilipollas.',
  'Robo exitoso: %A cierra, %V abre el hueco, el grupo archiva. El chat lo vio entero y no hace falta replay, patético.',
  '%A vs %V terminó 1-0 sin necesidad de amplificación. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A cobró de %V el aura que ahora figura en su columna. El chat lo vio entero y no hace falta replay, basura.',
  '%A el plan salió: %V no se salvó: el contador testigo. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A vs %V: gana %A por ejecución limpia del atraco. El chat lo vio entero y no hace falta replay, asco.',
  '%A se llevó el botín de %V delante de todo el que miraba el hilo. El chat lo vio entero y no hace falta replay, cutre.',
  '%A ejecutó el atraco a %V como quien marca una casilla y pasa a la siguiente. El chat lo vio entero y no hace falta replay, pringado.',
  '%A vs %V terminó con el aura de %V en tránsito hacia %A. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A robó el aura de %V con la precisión de un cobro ya calculado. El chat lo vio entero y no hace falta replay, joder.',
  'Robo limpio de %A: sin almost, con botín, con público. El chat lo vio entero y no hace falta replay, mierda.',
  '%A vs %V: el marcador del aura no admite empate en este resultado. El chat lo vio entero y no hace falta replay, coño.',
  '%A entró a por %V y salió con el objetivo del comando cumplido. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A el golpe fue suficiente: %V lo nota, el ranking lo muestra. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A cobró el aura de %V y el chat no pidió repetición: se vio de sobra. El chat lo vio entero y no hace falta replay, ridículo.',
  'Atraco redondo a favor de %A: %V en el hueco documentado. El chat lo vio entero y no hace falta replay, basura.',
  '%A se llevó lo marcado de %V sin letra pequeña ni segunda oportunidad. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A vs %V: el ladrón ganó el round que importaba al contador. El chat lo vio entero y no hace falta replay, asco.',
  '%A ejecutó el atraco a %V en el timing del que no avisa dos veces. El chat lo vio entero y no hace falta replay, cutre.',
  '%A el aura de %V viajó: destino cuenta de %A, billete sin retorno. El chat lo vio entero y no hace falta replay, pringado.',
  '%A vs %V terminó 1-0 en aura: archivo cerrado. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A robó a %V en luz de chat: sin sombra útil para la víctima. El chat lo vio entero y no hace falta replay, joder.',
  'Robo exitoso de %A: el recibo es este mensaje y el ranking. El chat lo vio entero y no hace falta replay, mierda.',
  '%A se llevó el botín de %V con la calma de quien ya había contado. El chat lo vio entero y no hace falta replay, coño.',
  '%A vs %V: crónica corta de un transfer largo para el contador de %V. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A cobró de %V lo que ahora pesa en su favor en el ranking. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A el golpe a %V conectó: no hace falta cámara lenta. El chat lo vio entero y no hace falta replay, patético.',
  '%A vs %V terminó con el botín en el bolsillo de %A. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A entró a por el aura de %V y cerró el parte a su favor. El chat lo vio entero y no hace falta replay, basura.',
  '%A ejecutó el atraco sin almost: %V sin defensa suficiente. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A vs %V: 1-0 sin prórroga, con aura en movimiento. El chat lo vio entero y no hace falta replay, asco.',
  '%A se llevó el aura de %V y dejó el hueco como firma en el perfil. El chat lo vio entero y no hace falta replay, cutre.',
  'Robo limpio: %A con el resultado, %V con la pérdida, el grupo con el dato. El chat lo vio entero y no hace falta replay, pringado.',
  '%A vs %V terminó con el ranking firmando a favor de %A. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A cobró el aura de %V en el momento exacto del comando. El chat lo vio entero y no hace falta replay, joder.',
  '%A el plan contra %V no se quedó en la pizarra: se cobró. El chat lo vio entero y no hace falta replay, mierda.',
  '%A vs %V: gana quien atacó y cobró, pierde quien defendió mal. El chat lo vio entero y no hace falta replay, coño.',
  '%A se llevó el botín de %V sin pedir disculpas al contador. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A ejecutó el atraco a %V como un cobro de deuda que %V no reconocía. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A vs %V terminó con el transfer visible en el ranking. El chat lo vio entero y no hace falta replay, patético.',
  '%A robó el aura de %V y el chat archivó el resultado sin debate útil. El chat lo vio entero y no hace falta replay, ridículo.',
  'Atraco a favor de %A: %V en pérdidas, el aura en otra columna. El chat lo vio entero y no hace falta replay, basura.',
  '%A se llevó lo suyo del aura de %V: operativa de atraco exitoso. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A vs %V: el ladrón cerró antes de que la queja de %V terminara. El chat lo vio entero y no hace falta replay, asco.',
  '%A cobró de %V en público: el ranking no ofrece modo privado. El chat lo vio entero y no hace falta replay, cutre.',
  '%A el golpe a %V fue limpio: el efecto en el contador, sucio para %V. El chat lo vio entero y no hace falta replay, pringado.',
  '%A vs %V terminó 1-0 con el botín en movimiento hacia %A. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A entró a por %V y cumplió: el aura cambió de dueño. El chat lo vio entero y no hace falta replay, joder.',
  'Robo exitoso de %A a costa de %V: sin relativizar, con números. El chat lo vio entero y no hace falta replay, mierda.',
  '%A ejecutó, cobró y dejó a %V con el mensaje y el hueco. El chat lo vio entero y no hace falta replay, coño.',
  '%A vs %V: crónica de un atraco con final de botín a favor de %A. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A se llevó el aura de %V en el timing que el ranking registra. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A robó a %V sin almost y sin devolución. Y el grupo no necesita que se lo expliquen dos veces, basura.',
  'Robo limpio: %A cierra el parte, %V abre el hueco, el grupo lo ve. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A vs %V: 1-0 en el único marcador que el comando reconoce. El chat lo vio entero y no hace falta replay, asco.',
  '%A cobró el aura de %V y dejó el recibo en este hilo del chat. El chat lo vio entero y no hace falta replay, cutre.',
  '%A el plan salió redondo: el aura de %V no tuvo billete de vuelta. El chat lo vio entero y no hace falta replay, pringado.',
  '%A vs %V terminó con el ranking actualizado y el debate sobrando. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A se llevó el botín de %V delante de quien quisiera mirar. El chat lo vio entero y no hace falta replay, joder.',
  '%A ejecutó el atraco a %V como quien salda una línea pendiente del ranking. El chat lo vio entero y no hace falta replay, mierda.',
  '%A vs %V: gana %A, pierde %V, el aura no se discute. El chat lo vio entero y no hace falta replay, coño.',
  '%A robó el aura de %V con precisión de cobro ya calculado de antemano. El chat lo vio entero y no hace falta replay, cabrón.',
  'Atraco redondo: %A con el resultado en el contador, %V con la pérdida. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A vs %V terminó con el transfer en firme y sin VAR que lo cambie. El chat lo vio entero y no hace falta replay, patético.',
  '%A se llevó el aura de %V cuando más se notaba soltarla. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A el golpe a %V aterrizó donde dolía: el contador. El chat lo vio entero y no hace falta replay, basura.',
  '%A vs %V: 1-0 sin prórroga y con botín a nombre de %A. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A cobró de %V lo que el ranking ahora muestra sin filtro. El chat lo vio entero y no hace falta replay, asco.',
  '%A ejecutó el atraco a %V y el chat no pidió segunda toma. El chat lo vio entero y no hace falta replay, pringado.',
  '%A vs %V terminó con %A contando y %V restando en silencio. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A se llevó lo marcado del aura de %V: casilla cobrada. El chat lo vio entero y no hace falta replay, joder.',
  '%A el plan contra %V funcionó de punta a punta del intento. El chat lo vio entero y no hace falta replay, mierda.',
  '%A vs %V: el ladrón ganó el round del contador. Y el grupo no necesita que se lo expliquen dos veces, coño.',
  '%A robó a %V en plena luz: sin sombra para esconder el cargo. El chat lo vio entero y no hace falta replay, cabrón.',
  'Robo limpio de %A a costa de %V: archivado en el ranking. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A vs %V terminó 1-0 con el aura en tránsito hacia quien atacó. El chat lo vio entero y no hace falta replay, patético.',
  '%A cobró el aura de %V y cerró el parte sin pedir aplauso. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A el botín de %V ya no vuelve: el ranking no ofrece reembolso. El chat lo vio entero y no hace falta replay, basura.',
  '%A vs %V: crónica corta de un cobro largo para %V. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A se llevó el aura de %V con la calma de un trámite terminado. El chat lo vio entero y no hace falta replay, asco.',
  '%A ejecutó el golpe a %V: el contador firmó, el chat presenció. El chat lo vio entero y no hace falta replay, cutre.',
  '%A vs %V terminó con el resultado que %A había marcado en la lista. El chat lo vio entero y no hace falta replay, pringado.',
  '%A robó el aura de %V y dejó el hueco como firma visible. El chat lo vio entero y no hace falta replay, fracasado.',
  'Atraco a favor de %A: medible, visible, sin relativizar. El chat lo vio entero y no hace falta replay, joder.',
  '%A vs %V: 1-0 en aura, archivo cerrado, siguiente. El chat lo vio entero y no hace falta replay, mierda.'
];

const ROB_FAIL = [
  '%A intentó robarle el aura a %V y falló con confianza de campeón y puntería de ciego. El chat lo vio entero y no hace falta replay, joder.',
  '%A salió a cazar el aura de %V y volvió con las manos vacías y la cara llena de casi. El chat lo vio entero y no hace falta replay, mierda.',
  'El robo de %A contra %V murió en el intento: manos torpes, plan flojo, resultado cero. El chat lo vio entero y no hace falta replay, coño.',
  '%A puso la mano donde no debía y %V se la devolvió vacía con intereses de ridículo. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A vs %V terminó antes de empezar: el ataque no merecía ni el mensaje de defensa. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A calculó mal el golpe y %V ni se agachó: el chat sí se inclinó de risa. El chat lo vio entero y no hace falta replay, patético.',
  'Intento de robo archivado: %A sin botín, %V sin un arañazo, el grupo con el meme. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A falló el atraco a %V como falla los debates: mucho ruido y cero resultado útil. El chat lo vio entero y no hace falta replay, basura.',
  '%V no se movió un milímetro: %A se movió mucho y no llegó a ninguna parte del botín. El chat lo vio entero y no hace falta replay, desperdicio.',
  'El plan de %A se desmontó solo antes de tocar a %V: ni hizo falta empujar. El chat lo vio entero y no hace falta replay, asco.',
  '%A entró a por el aura de %V y salió con las manos y el ego en el mismo estado: vacíos. El chat lo vio entero y no hace falta replay, cutre.',
  'Robo fallido en acta: %A firma el parte, %V firma el bostezo, el chat archiva. El chat lo vio entero y no hace falta replay, pringado.',
  '%A tenía el guion del atraco preparado: %V tenía la realidad. Gana la realidad por goleada. Fracasado.',
  'El golpe de %A no conectó ni de casualidad: %V sigue con el aura y %A con la explicación. El chat lo vio entero y no hace falta replay, joder.',
  '%A tropezó con su propio plan tres pasos antes de llegar al aura de %V. El chat lo vio entero y no hace falta replay, mierda.',
  'Fallo limpio de %A: sin botín, sin gloria, sin segunda oportunidad en este mensaje. El chat lo vio entero y no hace falta replay, coño.',
  '%A miró el aura de %V como quien mira un escaparate cerrado: sin talento para el cristal. El chat lo vio entero y no hace falta replay, cabrón.',
  'El atraco de %A fue un tráiler eterno: nunca llegó el estreno. %V sigue en cartelera. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A falló tan claro que el grupo no necesitaba narrador: se vio solo y se archivó solo. El chat lo vio entero y no hace falta replay, patético.',
  '%V sigue intacto y aburrido: %A sigue buscando la frase que convierta el almost en victoria. Ridículo.',
  'Robo en modo teatro barato: %A actuó, %V no aplaudió, el telón cayó igual de rápido. El chat lo vio entero y no hace falta replay, basura.',
  '%A puso todo el esfuerzo en el intento y cero en el acierto: %V agradece el espectáculo gratis. Desperdicio.',
  'El aura de %V no se movió un milímetro: la de respeto de %A sí, hacia abajo. El chat lo vio entero y no hace falta replay, asco.',
  '%A calculó el ángulo dos veces y las dos calculó mal: %V ni se inmutó. El chat lo vio entero y no hace falta replay, cutre.',
  'Fallo de manual: %A con la mano tendida al vacío, %V con el aura exactamente donde estaba. Pringado.',
  '%A salió a robar y volvió con la lección completa: no era el día, no era el objetivo, no era él. Fracasado.',
  '%V no necesitaba escudo ni suerte: %A se blindó solo a base de incompetencia pura. El chat lo vio entero y no hace falta replay, joder.',
  'El intento de %A contra %V cabe en un meme de una línea y todavía sobra espacio. El chat lo vio entero y no hace falta replay, mierda.',
  '%A falló el robo y acertó el ridículo: doble combo involuntario delante del grupo. El chat lo vio entero y no hace falta replay, coño.',
  'Atraco fallido: %A sin botín, el chat con contenido fresco, %V con el aura quieta. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A tenía hambre de aura ajena: %V tenía la nevera cerrada y la llave en otro continente. Gilipollas.',
  'El plan B de %A era igual que el A: fallar con estilo. El estilo tampoco apareció. El chat lo vio entero y no hace falta replay, patético.',
  '%A vs %V terminó 0-1 sin que %V sudara ni una gota de aura. El chat lo vio entero y no hace falta replay, ridículo.',
  'Robo abortado por falta de talento documentada: autor %A, espectador aburrido %V. El chat lo vio entero y no hace falta replay, basura.',
  '%A extendió la mano al aura de %V: %V contó hasta tres y no pasó absolutamente nada. El chat lo vio entero y no hace falta replay, desperdicio.',
  'El aura de %V sigue en su sitio: el prestigio de %A ha salido a fumar y no vuelve. El chat lo vio entero y no hace falta replay, asco.',
  '%A falló tan limpio que el bot podría haber puesto solo la palabra no: igual escribe la frase. Cutre.',
  'Intento de %A: mucho preámbulo, cero desenlace, %V intacto de principio a fin. El chat lo vio entero y no hace falta replay, pringado.',
  '%A no llegó al bolsillo de %V: se quedó en el pasillo del intento con las manos en los bolsillos propios. Fracasado.',
  'Fallo con narrador incluido: %A protagonista del almost, %V del still here sin esfuerzo. El chat lo vio entero y no hace falta replay, joder.',
  '%A salió a cazar aura y cazó una lección: %V no se deja y él no da el nivel. El chat lo vio entero y no hace falta replay, mierda.',
  'El atraco se desinfló solo: %A sopló de más al principio y %V ni sopló. El chat lo vio entero y no hace falta replay, coño.',
  '%A con cara de ladrón de película: %V con cara de no haber visto nada porque no hubo nada. El chat lo vio entero y no hace falta replay, cabrón.',
  'Robo fallido: el marcador no se movió a favor de %A en ningún fotograma del intento. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A apuntó al aura de %V y le dio al aire del chat: el aire no paga botín. El chat lo vio entero y no hace falta replay, patético.',
  '%V sigue rico en aura: %A sigue rico en excusas de por qué casi. El chat lo vio entero y no hace falta replay, ridículo.',
  'El golpe no llegó: el ridículo sí. Autor %A. Objetivo intacto %V. Público: todos. El chat lo vio entero y no hace falta replay, basura.',
  '%A tenía el timing de un reloj parado y la puntería de un dardo sin punta: %V ni se enteró. Desperdicio.',
  'Fallo técnico y humano a la vez: %A reúne el pack completo del atraco que no fue. El chat lo vio entero y no hace falta replay, asco.',
  '%A intentó el atraco de la semana y firmó el fail de la semana sin discusión. El chat lo vio entero y no hace falta replay, cutre.',
  '%V no defendió porque no hizo falta: %A se defendió solo de su propio plan defectuoso. El chat lo vio entero y no hace falta replay, pringado.',
  'Robo en modo borrador eterno: %A no pasó a limpio. %V sigue en el original sin tachones. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A puso la trampa al revés y cayó él mismo: %V observó desde la grada sin pagar entrada. El chat lo vio entero y no hace falta replay, joder.',
  'El aura de %V no se inmutó: el chat sí, de risa contenida y no tan contenida. El chat lo vio entero y no hace falta replay, mierda.',
  '%A falló con la solemnidad de quien juraba que esta vez sí iba en serio. El chat lo vio entero y no hace falta replay, coño.',
  'Atraco 0 — %A 0 — %V 1 por el simple hecho de no hacer nada y bastar. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A entró en la escena del robo y salió directamente en la del sketch barato. El chat lo vio entero y no hace falta replay, gilipollas.',
  'El plan de %A tenía más agujeros que aura disponible que robar: %V pasó de largo. El chat lo vio entero y no hace falta replay, patético.',
  '%A sin botín, %V sin drama, el grupo con el veredicto escrito antes del punto final. El chat lo vio entero y no hace falta replay, ridículo.',
  'Fallo de %A documentado en alta definición: no hace falta cámara lenta ni VAR. El chat lo vio entero y no hace falta replay, basura.',
  '%A creyó que %V era objetivo fácil: %V resultó ser pared. Gana la pared. El chat lo vio entero y no hace falta replay, desperdicio.',
  'El robo murió en la intención: %A autor de un almost que ya es residencia fija. El chat lo vio entero y no hace falta replay, asco.',
  '%A extendió la mano al aura de %V y solo tocó el vacío del intento mal ejecutado. El chat lo vio entero y no hace falta replay, cutre.',
  '%V ni activó defensa ni sudó: el ataque de %A no merecía el gasto de energía. El chat lo vio entero y no hace falta replay, pringado.',
  '%A falló y encima lo hizo con tiempo de sobra: el chat pudo tomarle fotos del ridículo. El chat lo vio entero y no hace falta replay, fracasado.',
  'Robo fallido con narración automática: %A no necesita presentar su propio fail. El chat lo vio entero y no hace falta replay, joder.',
  '%A vs %V: el marcador se escribió solo en la columna del fallo sin prórroga. El chat lo vio entero y no hace falta replay, mierda.',
  'El atraco de %A fue un farol a mesa llena: %V no vio las cartas porque no había juego. El chat lo vio entero y no hace falta replay, coño.',
  '%A sin botín, sin gloria y con el eco del intento repitiéndose en el hilo. El chat lo vio entero y no hace falta replay, cabrón.',
  '%V sigue exactamente igual: %A explica: el grupo ya cambió de tema. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A tropezó con la meta antes de llegar: la meta era el aura de %V y sigue allí. El chat lo vio entero y no hace falta replay, patético.',
  'Fallo limpio de %A: no hay asterisco, no hay pero, no hay segunda lectura posible. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A tenía hambre de aura: %V tenía cerradura. La cerradura no se discutió. El chat lo vio entero y no hace falta replay, basura.',
  'El intento de %A cabe en una línea — falló — y el resto de la frase es cortesía. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A no conectó ni por accidente afortunado: %V no sudó ni por cortesía. El chat lo vio entero y no hace falta replay, asco.',
  'Robo en modo ensayo general eterno: %A no estrena. %V no compró entrada. El chat lo vio entero y no hace falta replay, cutre.',
  '%A salió a por el aura ajena y volvió con un informe de incompetencia firmado. El chat lo vio entero y no hace falta replay, pringado.',
  '%V intacto por mérito de estar quieto y por demérito largo de %A. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A falló el timing, la puntería y el disimulo: hat-trick de fail en un solo intento. El chat lo vio entero y no hace falta replay, joder.',
  'El aura de %V no se movió: la cara de %A sí, varios tonos hacia el rojo. El chat lo vio entero y no hace falta replay, mierda.',
  '%A firmó el almost con firma temblorosa: igual no importa porque el resultado es el mismo. El chat lo vio entero y no hace falta replay, coño.',
  'Atraco fallido: %A de vuelta a la cola de los que lo intentan y no llegan. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A vs %V terminó antes del primer paso real: el plan no sobrevivió al contacto con la realidad. Gilipollas.',
  '%A puso todo en el intento menos lo único que importaba: acertar el golpe. El chat lo vio entero y no hace falta replay, patético.',
  '%V no necesitaba suerte ni escudo: %A trajo su propia derrota bajo el brazo. El chat lo vio entero y no hace falta replay, ridículo.',
  'Fallo de %A: el botín sigue en %V, el meme queda en el chat, el prestigio baja. El chat lo vio entero y no hace falta replay, basura.',
  '%A calculó el robo en la cabeza con notas: en la práctica no sumó ni el primer dígito. El chat lo vio entero y no hace falta replay, desperdicio.',
  'El golpe de %A fue un soplo de aire: %V ni apartó el flequillo. El chat lo vio entero y no hace falta replay, asco.',
  '%A sin botín y con público completo: el peor combo posible del atraco fallido. El chat lo vio entero y no hace falta replay, cutre.',
  '%V sigue en su sitio contando aura: %A sigue buscando la frase que lo arregle. El chat lo vio entero y no hace falta replay, pringado.',
  'Robo fallido sin segunda parte: no hubo primera de verdad que merezca continuación. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A entró con confianza de tutorial y salió con un espejo: se vio el fallo de frente. El chat lo vio entero y no hace falta replay, joder.',
  '%A apuntó alto al aura y le dio al techo del chat: el techo no paga. El chat lo vio entero y no hace falta replay, mierda.',
  'El plan de %A se diluyó al primer contacto: %V ni se enteró de que había agua. El chat lo vio entero y no hace falta replay, coño.',
  '%A falló como quien no ha practicado nunca: porque no ha practicado nunca. El chat lo vio entero y no hace falta replay, cabrón.',
  '%V 1 — %A 0 en un partido donde solo uno intentó jugar y lo hizo mal. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A dejó el atraco a medias: las medias también estaban rotas de fábrica. El chat lo vio entero y no hace falta replay, patético.',
  'Fallo con estilo cutre: %A no acertó ni a ser ridículo con gracia de Rockstar. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A vs %V: crónica de un robo anunciado en el group chat y no ejecutado jamás. El chat lo vio entero y no hace falta replay, basura.',
  '%A sin el aura de %V y sin la suya de respeto: doble pérdida en un solo intento. El chat lo vio entero y no hace falta replay, desperdicio.',
  'El intento murió de muerte natural: causa oficial, falta de talento de %A. El chat lo vio entero y no hace falta replay, asco.',
  '%A salió a robar y el universo le contestó con un no claro y sin matiz. El chat lo vio entero y no hace falta replay, cutre.',
  '%V no se defendió: el ataque de %A no llegó a la fase donde hace falta defender. El chat lo vio entero y no hace falta replay, pringado.',
  '%A con las manos vacías y la boca llena de casi y de todavía y de la próxima. El chat lo vio entero y no hace falta replay, fracasado.',
  'Robo fallido: el chat no pide replay porque ya vio suficiente en tiempo real. El chat lo vio entero y no hace falta replay, joder.',
  '%A tropezó con la realidad en el primer escalón: la realidad se llama %V intacto. El chat lo vio entero y no hace falta replay, mierda.',
  '%A tenía el disfraz completo de ladrón de cine: le faltaba el detalle del robo. El chat lo vio entero y no hace falta replay, coño.',
  'Fallo de %A documentado en 4K sin necesidad de zoom ni dramatización. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A extendió la mano: %V contó su aura al final y no faltaba ni una unidad. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A vs %V en modo fail predecible: guion visto mil veces, ejecución aún peor. El chat lo vio entero y no hace falta replay, patético.',
  'El atraco de %A fue un globo de feria: se pinchó solo antes de subir. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A sin botín: el grupo con el veredicto listo desde el segundo dos. El chat lo vio entero y no hace falta replay, basura.',
  '%V sigue: el contador de aura no parpadeó: %A sí, de nervios y de vergüenza. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A falló el atraco y el disimulo en el mismo movimiento de manos. El chat lo vio entero y no hace falta replay, asco.',
  'Robo 0 para %A: espectáculo 1 para el resto sin comprar entrada. El chat lo vio entero y no hace falta replay, cutre.',
  '%A creyó en el plan hasta que el plan dejó de creer en él a mitad de frase. El chat lo vio entero y no hace falta replay, pringado.',
  '%A no llegó: %V no se fue: empate técnico a favor de quien no necesitaba jugar. El chat lo vio entero y no hace falta replay, fracasado.',
  'El golpe no existió en el plano físico: el ridículo de %A sí, y en HD. El chat lo vio entero y no hace falta replay, joder.',
  '%A firmó un almost con el chat entero de testigos notariales. El chat lo vio entero y no hace falta replay, mierda.',
  '%A salió a por %V y volvió con una anécdota de fallo que nadie pidió. El chat lo vio entero y no hace falta replay, coño.',
  'Fallo limpio: sin asteriscos, sin botín, con público y sin derecho a bis. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A tenía la intención en mayúsculas: le faltaba todo el resto en minúsculas. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%V intacto de principio a fin: %A redactando la crónica del casi otra vez. El chat lo vio entero y no hace falta replay, patético.',
  '%A vs el aura de %V: el aura ni se enteró de que había una amenaza en el chat. El chat lo vio entero y no hace falta replay, ridículo.',
  'Atraco fallido por exceso de confianza y defecto grave de talento medible. El chat lo vio entero y no hace falta replay, basura.',
  '%A en el intento: el intento en el suelo: el botín donde siempre, en %V. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A no conectó ni por casualidad del universo: %V tampoco se movió por casualidad. El chat lo vio entero y no hace falta replay, asco.',
  'Robo en modo silent fail: el silencio es el de %A sin aura nueva que enseñar. El chat lo vio entero y no hace falta replay, cutre.',
  '%A apuntó, cerró los ojos, falló, abrió los ojos: el chat seguía mirando. El chat lo vio entero y no hace falta replay, pringado.',
  '%V 1 por existir y bastar: %A 0 por intentarlo de la peor manera posible. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A dejó el botín exactamente donde estaba: en las manos que no son las suyas, en %V. El chat lo vio entero y no hace falta replay, joder.',
  'Fallo de manual cutre sin gracia: protagonista absoluto %A. El chat lo vio entero y no hace falta replay, mierda.',
  '%A sin el aura ajena y con la propia un poco más pequeña por la vergüenza pública. El chat lo vio entero y no hace falta replay, coño.',
  'El plan de %A no sobrevivió al primer contacto visual con %V en el ranking. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A falló y el eco del fallo llenó tres mensajes del hilo sin esfuerzo. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A tenía hambre del aura de %V: se quedó solo con el hambre y el chat de testigo. El chat lo vio entero y no hace falta replay, patético.',
  'Robo abortado: autor %A, beneficiario nadie, público todo el grupo. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A vs %V terminó con el marcador en blanco en la columna de %A. El chat lo vio entero y no hace falta replay, basura.',
  '%A no encontró el bolsillo ajeno: encontró el vacío de su propio intento. El chat lo vio entero y no hace falta replay, desperdicio.',
  'Fallo con narrador automático del bot: %A no necesita presentar el desastre. El chat lo vio entero y no hace falta replay, asco.',
  '%A salió a cazar en el bosque del chat y el bosque estaba vacío de oportunidades. El chat lo vio entero y no hace falta replay, cutre.',
  '%V no sudó ni de lejos: %A sudó la explicación que nadie pidió. El chat lo vio entero y no hace falta replay, pringado.',
  '%A y el almost eterno: esta vez tampoco fue la excepción. El chat lo vio entero y no hace falta replay, fracasado.',
  'Atraco 0, gloria 0, contenido gratis para el chat 1: autor %A. El chat lo vio entero y no hace falta replay, joder.',
  '%A puso la mano, volvió vacía, historia corta, ridículo largo. El chat lo vio entero y no hace falta replay, mierda.',
  '%A falló el robo como quien falla un penalti a puerta sin portero: inaceptable. El chat lo vio entero y no hace falta replay, coño.',
  '%V sigue con el contador igual: %A con el ego en números rojos. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A sin botín y con el grupo de testigos que no van a olvidar el intento. El chat lo vio entero y no hace falta replay, gilipollas.',
  'El atraco de %A fue un ensayo general que no mereció noche de estreno. El chat lo vio entero y no hace falta replay, patético.',
  '%A calculó mal desde el primer número de la operación: el resto fue consecuencia. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A vs %V: crónica breve de un fallo que se sintió largo para %A. El chat lo vio entero y no hace falta replay, basura.',
  '%A no merecía el botín: el fallo se lo confirmó sin anestesia. El chat lo vio entero y no hace falta replay, desperdicio.',
  'Robo fallido: %A de vuelta al lobby del atraco sin medalla. El chat lo vio entero y no hace falta replay, asco.',
  '%A extendió el plan en la cabeza: el plan se rompió al primer pliegue real. El chat lo vio entero y no hace falta replay, cutre.',
  '%V intacto por inasistencia total de un ataque que mereciera respuesta. El chat lo vio entero y no hace falta replay, pringado.',
  '%A tenía confeti de ladrón de película: le faltó el detalle de robar de verdad. El chat lo vio entero y no hace falta replay, fracasado.',
  'Fallo de %A: el botín no se movió, el prestigio sí, en dirección incorrecta. El chat lo vio entero y no hace falta replay, joder.',
  '%A apuntó al aura ajena y le dio a su propia cara en el espejo del grupo. El chat lo vio entero y no hace falta replay, mierda.',
  '%A sin el botín soñado y con el ridículo de edición limitada. El chat lo vio entero y no hace falta replay, coño.',
  'El intento de %A no pasó ni el control de calidad más generoso. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A vs %V en modo solo frente al espejo: gana quien no atacó como %A. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A falló con tiempo de sobra: dio margen al meme para cocinarse. El chat lo vio entero y no hace falta replay, patético.',
  'Robo 0: autor %A del vacío documentado en el hilo. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A creyó que esta vez sí: el universo y %V contestaron que no al unísono. El chat lo vio entero y no hace falta replay, basura.',
  '%V ni se enteró del show: %A se enteró demasiado y demasiado tarde. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A tropezó con el peaje del fallo antes de oler el botín de %V. El chat lo vio entero y no hace falta replay, asco.',
  'Atraco fallido con firma legible de %A en todas las líneas del parte. El chat lo vio entero y no hace falta replay, cutre.',
  '%A sin el aura de %V: historia corta de botín, ridículo de duración extendida. El chat lo vio entero y no hace falta replay, pringado.',
  '%A el plan se le cayó de las manos antes de poder usarlo contra %V. El chat lo vio entero y no hace falta replay, fracasado.',
  'Fallo limpio de tanto no poder ocultarlo: %A no disimula ni el fail. El chat lo vio entero y no hace falta replay, joder.',
  '%A vs el aura de %V: 0-1 y el 1 no sudó ni pidió cambio. El chat lo vio entero y no hace falta replay, mierda.',
  '%A salió a robar y volvió con una frase de este estilo: justa. El chat lo vio entero y no hace falta replay, coño.',
  '%A tenía la pose de atraco perfecto: le faltó el resultado que la sostuviera. El chat lo vio entero y no hace falta replay, cabrón.',
  'Robo en modo promesa electoral: %A no entregó nada de lo anunciado. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A falló el atraco y el momento dramático a la vez: doble cero. El chat lo vio entero y no hace falta replay, patético.',
  '%V sigue: el contador de aura no parpadeó ni un frame. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A sin botín: el almost como única medalla de esta operación. El chat lo vio entero y no hace falta replay, basura.',
  '%A extendió la mano al vacío y el vacío le dio la razón con creces. El chat lo vio entero y no hace falta replay, desperdicio.',
  'Fallo de %A documentado sin necesidad de VAR ni cámara de gol. El chat lo vio entero y no hace falta replay, asco.',
  '%A vs %V: el guion decía robo, la función fue sketch de fallos. El chat lo vio entero y no hace falta replay, cutre.',
  '%A no llegó al aura: llegó al final de un plan que ya estaba vacío. El chat lo vio entero y no hace falta replay, pringado.',
  '%A el ridículo se adelantó al botín en la cola y el botín no llegó nunca. El chat lo vio entero y no hace falta replay, fracasado.',
  'Atraco 0 para %A: lección 1 disponible si quiere recogerla del suelo. El chat lo vio entero y no hace falta replay, joder.',
  '%A falló el robo como quien no leyó el manual: el manual no existía y se notó. El chat lo vio entero y no hace falta replay, mierda.',
  '%V intacto: %A en la cola permanente de los almost del ranking. El chat lo vio entero y no hace falta replay, coño.',
  '%A puso el esfuerzo en la narrativa del atraco y cero en el golpe real. El chat lo vio entero y no hace falta replay, cabrón.',
  'Robo fallido: el chat pasa página, %A se queda releyendo esta. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A sin el aura de %V y sin la cara de haberlo intentado decente. El chat lo vio entero y no hace falta replay, patético.',
  '%A tropezó de entrada: el resto fue caída libre sin botín al final. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A vs %V terminó en walkover a favor de quien no necesitó atacar bien. El chat lo vio entero y no hace falta replay, basura.',
  '%A tenía hambre: la cocina del aura de %V estaba cerrada con candado. El chat lo vio entero y no hace falta replay, desperdicio.',
  'Fallo con público completo: %A no puede pedir que borren el mensaje. El chat lo vio entero y no hace falta replay, asco.',
  '%A el atraco se le escapó entre los dedos como agua barata. El chat lo vio entero y no hace falta replay, cutre.',
  '%A sin gloria: %V sin drama: equilibrio perfecto de un fail bien repartido. El chat lo vio entero y no hace falta replay, pringado.',
  '%A calculó el robo en sueños húmedos de aura: despertó en el fallo seco. El chat lo vio entero y no hace falta replay, fracasado.',
  'Robo 0: autor %A: reseña del chat: previsible y sin reembolso. El chat lo vio entero y no hace falta replay, joder.',
  '%A falló el golpe y el disimulo: pack completo de incompetencia. El chat lo vio entero y no hace falta replay, mierda.',
  '%A vs el aura de %V: ni hubo combate ni hubo duda del resultado. El chat lo vio entero y no hace falta replay, coño.',
  '%A salió a por todo el aura y volvió con el informe oficial de nada. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A el almost más largo y menos interesante del hilo de hoy. El chat lo vio entero y no hace falta replay, gilipollas.',
  'Atraco fallido: %A firma, %V bosteza, el grupo archiva y sigue. El chat lo vio entero y no hace falta replay, patético.',
  '%A no conectó: el universo no ayudó: %V no lo necesitaba para ganar. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A sin botín y con el eco de su propio plan repitiéndose en la cabeza. El chat lo vio entero y no hace falta replay, basura.',
  '%A puso la trampa, olvidó el sitio y cayó lejos de %V y del botín. El chat lo vio entero y no hace falta replay, desperdicio.',
  'Fallo de %A: no hay DLC ni parche que lo arregle en este mensaje. El chat lo vio entero y no hace falta replay, asco.',
  '%A vs %V en una sola línea de acta: falló. Punto. El chat lo vio entero y no hace falta replay, cutre.',
  '%A el botín sigue en su sitio: el prestigio de %A no. El chat lo vio entero y no hace falta replay, pringado.',
  '%A intentó el atraco de oro y firmó el fail de cartón piedra. El chat lo vio entero y no hace falta replay, fracasado.',
  'Robo abortado por incompetencia sobrevenida y evidente de %A. El chat lo vio entero y no hace falta replay, joder.',
  '%A extendió la mano: el aura de %V no hizo el trayecto inverso ni de broma. El chat lo vio entero y no hace falta replay, mierda.',
  '%A falló y el chat no pidió explicación: la imagen bastaba. El chat lo vio entero y no hace falta replay, coño.',
  '%A sin el resultado: con el perfil completo del intento fallido. El chat lo vio entero y no hace falta replay, cabrón.',
  '%V 1 — %A 0: acta cerrada, sin prórroga, sin VAR, sin bis. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A salió a robar y el suelo le pidió por favor que se quedara quieto. El chat lo vio entero y no hace falta replay, patético.',
  'Atraco 0: %A protagonista del vacío documentado en el historial del comando. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A tenía la lista de pasos del atraco perfecto: se atascó en el primero y ahí murió. El chat lo vio entero y no hace falta replay, basura.',
  '%A vs %V: el fallo se escribió solo, sin ayuda de guionista. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A sin botín: el almost como residencia fiscal fija en su perfil. El chat lo vio entero y no hace falta replay, asco.',
  'Fallo limpio: %A no ensució el aura de %V ni con la punta del dedo. El chat lo vio entero y no hace falta replay, cutre.',
  '%A el plan era largo en la cabeza: el resultado cabió en un no seco. El chat lo vio entero y no hace falta replay, pringado.',
  '%A falló el robo como quien falla la clave del wifi: mirando la pantalla y sin entrar. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A vs el aura ajena: puerta cerrada, %A todavía en el felpudo del intento. El chat lo vio entero y no hace falta replay, joder.',
  'Robo fallido: %A de vuelta sin una sola historia de gloria que vender. El chat lo vio entero y no hace falta replay, mierda.',
  '%A puso todo menos el acierto: %V lo notó solo en la ausencia total de golpe. El chat lo vio entero y no hace falta replay, coño.',
  '%A sin botín y con el público: el aterrizaje más feo del día. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A el atraco se le quedó en la intención: la intención se quedó en el chat. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A falló: punto final del intento: punto y seguido del meme colectivo. El chat lo vio entero y no hace falta replay, patético.',
  '%A vs %V terminó antes de que %A encontrara siquiera el bolsillo correcto. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A salió a cazar y volvió con la red vacía y la cara de haber corrido. El chat lo vio entero y no hace falta replay, basura.',
  'Atraco fallido con firma legible y sin arrepentimiento útil de %A. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A sin el aura de %V: historia corta de botín, largometraje de ridículo. El chat lo vio entero y no hace falta replay, asco.',
  '%A el golpe no aterrizó en ninguna parte útil: el fail sí, en el centro del hilo. El chat lo vio entero y no hace falta replay, cutre.',
  '%A creyó en sí mismo más que en el plan: ambos le fallaron el mismo día. El chat lo vio entero y no hace falta replay, pringado.',
  'Fallo de %A: el botín no se enteró, el chat sí, y de sobra. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A vs el aura de %V en modo silent: el silencio es el del contador que no se movió. El chat lo vio entero y no hace falta replay, joder.',
  '%A extendió el brazo completo: el aura de %V no hizo ni medio trayecto. El chat lo vio entero y no hace falta replay, mierda.',
  '%A sin gloria ni asterisco que maquille: fail plano y legible. El chat lo vio entero y no hace falta replay, coño.',
  'Robo 0 para %A: espectáculo sin posibilidad de reembolso de dignidad. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A el almost más anunciado y menos sorprendente del día en el grupo. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A falló y no hay modo avión ni silencio que oculte el resultado. El chat lo vio entero y no hace falta replay, patético.',
  '%A vs el aura de %V: 0-1 sin prórroga y sin debate posible. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A salió a por el botín de %V y volvió con este mensaje como único souvenir. El chat lo vio entero y no hace falta replay, basura.',
  '%A tenía la pose de ladrón profesional: el resultado de aprendiz el primer día. El chat lo vio entero y no hace falta replay, desperdicio.',
  'Atraco fallido: %A otra vez en el lobby sin medalla ni relato heroico. El chat lo vio entero y no hace falta replay, asco.',
  '%A sin el contador a favor: con el ego claramente a menos. El chat lo vio entero y no hace falta replay, cutre.',
  '%A el plan se evaporó al primer contacto real con %V en el ranking. El chat lo vio entero y no hace falta replay, pringado.',
  '%A falló el timing por una eternidad medida en mensajes de chat. El chat lo vio entero y no hace falta replay, fracasado.',
  'Fallo documentado: autor %A, víctima del fail el mismo %A, testigo el grupo. El chat lo vio entero y no hace falta replay, joder.',
  '%A vs %V: no hubo robo, hubo intento y hubo un no rotundo. El chat lo vio entero y no hace falta replay, mierda.',
  '%A puso la mano en el vacío: el vacío le dio la razón sin cobrar consulta. El chat lo vio entero y no hace falta replay, coño.',
  '%A sin botín: el chat con el veredicto en firme y sin recurso. El chat lo vio entero y no hace falta replay, cabrón.',
  'Robo fallido de %A: no requiere ampliación ni nota a pie de página. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A el atraco murió de causas naturales: en el certificado pone falta de talento. El chat lo vio entero y no hace falta replay, patético.',
  '%A vs %V terminó 0-1: el 1 es %V por el simple hecho de no moverse mal. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A salió a robar y el universo le puso un stop en la frente. El chat lo vio entero y no hace falta replay, basura.',
  '%A sin el aura ajena: con la lección disponible en el suelo si quiere agacharse. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A falló como el que no practicó: la evidencia es el resultado y el público. El chat lo vio entero y no hace falta replay, asco.',
  'Atraco 0: %A firma el vacío con nombre completo. El chat lo vio entero y no hace falta replay, cutre.',
  '%A el ridículo llegó a la cola antes que el botín y el botín no se presentó. El chat lo vio entero y no hace falta replay, pringado.',
  '%A vs el aura de %V: ni combate ni duda ni botín ni gloria. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A sin gloria: punto final del parte, punto y seguido del ranking. El chat lo vio entero y no hace falta replay, joder.'
];


const ROB_MAESTRO = [
  '%A no solo le robó a %V: le vació el aura con la precisión de quien no deja migas. El ranking lo registra sin anestesia, joder.',
  '%A ejecutó el atraco maestro a %V: botín máximo, defensa en cero, chat en silencio un segundo. Mierda.',
  'Robo de autor: %A a %V. El contador de %V no se recuperó en el mismo mensaje. El ranking lo registra sin anestesia, coño.',
  '%A vs %V terminó con el aura de %V en tránsito total hacia %A. El ranking lo registra sin anestesia, cabrón.',
  '%A vació lo que había que vaciar de %V: el ranking lo muestra sin filtro. El ranking lo registra sin anestesia, gilipollas.',
  'Atraco maestro de %A: %V mirando el hueco donde antes había margen. El ranking lo registra sin anestesia, patético.',
  '%A le robó a %V como quien cobra una deuda antigua con intereses. El ranking lo registra sin anestesia, ridículo.',
  '%A vs %V: clínica de atraco. El paciente %V sale con menos aura de la que entró. El ranking lo registra sin anestesia, basura.',
  '%A no dejó casi nada en la cuenta de %V: casi nada duele más que nada a veces. El ranking lo registra sin anestesia, desperdicio.',
  'Robo de nivel: %A cobró de %V con la calma de un maestro que no suda el golpe. El ranking lo registra sin anestesia, asco.',
  '%A ejecutó el vaciado de %V en el timing que no perdona ni deja casi. El ranking lo registra sin anestesia, cutre.',
  '%A vs %V terminó con transfer pesado a favor de %A y silencio de %V. El ranking lo registra sin anestesia, pringado.',
  '%A se llevó el aura de %V como quien recoge lo suyo de un sitio ajeno. El ranking lo registra sin anestesia, fracasado.',
  'Atraco de categoría: %A a costa de %V, el grupo sin duda del nivel. El ranking lo registra sin anestesia, joder.',
  '%A no improvisó el pleno: el aura de %V ya estaba en la lista de la compra. El ranking lo registra sin anestesia, mierda.',
  '%A vs %V: el ladrón maestro cobró, la víctima cuenta el hueco grande. El ranking lo registra sin anestesia, coño.',
  '%A vació a %V con precisión de quien no necesita segundo intento. El ranking lo registra sin anestesia, cabrón.',
  'Robo maestro: %A con el botín gordo, %V con el hueco del mismo tamaño. El ranking lo registra sin anestesia, gilipollas.',
  '%A le dejó a %V el mínimo: el mínimo no consuela. Y el grupo lo vio entero, patético.',
  '%A vs %V terminó con el ranking actualizado a lo grande a favor de %A. El ranking lo registra sin anestesia, ridículo.',
  '%A ejecutó el golpe a %V en modo autor: firma legible en el contador. El ranking lo registra sin anestesia, basura.',
  '%A el atraco a %V no fue suerte: fue ejecución de nivel. El ranking lo registra sin anestesia, desperdicio.',
  '%A vs %V: crónica de un vaciado que el chat no discute. Y el grupo lo vio entero, asco.',
  '%A se llevó de %V todo lo que el momento permitió: el momento permitió mucho. El ranking lo registra sin anestesia, cutre.',
  'Atraco maestro de %A: %V en el parte de bajas graves de aura. El ranking lo registra sin anestesia, pringado.',
  '%A cobró de %V con la lista cerrada y el bolsillo abierto. El ranking lo registra sin anestesia, fracasado.',
  '%A vs %V terminó 1-0 con el 1 pesando en el contador de %A. El ranking lo registra sin anestesia, joder.',
  '%A no dejó el atraco en parcial: cerró en maestro sobre %V. El ranking lo registra sin anestesia, mierda.',
  '%A el aura de %V viajó casi entera: destino cuenta de %A. El ranking lo registra sin anestesia, coño.',
  '%A vs %V: el maestro cobró, el aprendiz de víctima aprendió caro. El ranking lo registra sin anestesia, cabrón.',
  '%A ejecutó el vaciado de %V sin pedir bis: el ranking no ofrece reposición rápida. El ranking lo registra sin anestesia, gilipollas.',
  'Robo de nivel: %A a %V, botín máximo legible, defensa insuficiente. El ranking lo registra sin anestesia, patético.',
  '%A se llevó el pack de aura de %V: el pack no tenía seguro. El ranking lo registra sin anestesia, ridículo.',
  '%A vs %V terminó con transfer pesado y cara de %V de haber visto el hueco. El ranking lo registra sin anestesia, basura.',
  '%A cobró de %V como quien no acepta almost en el parte. El ranking lo registra sin anestesia, desperdicio.',
  'Atraco maestro: %A cierra con botín, %V abre el hueco grande. El ranking lo registra sin anestesia, asco.',
  '%A vs %V: gana el que vació, pierde el que no retuvo. Y el grupo lo vio entero, cutre.',
  '%A ejecutó el golpe a %V con precisión de cobro total posible. El ranking lo registra sin anestesia, pringado.',
  '%A el contador de %V bajó de verdad: el de %A subió de verdad. El ranking lo registra sin anestesia, fracasado.',
  '%A vs %V terminó con el aura de %V en manos de quien atacó en serio. El ranking lo registra sin anestesia, joder.',
  '%A se llevó de %V lo que duele soltar en un solo mensaje. El ranking lo registra sin anestesia, mierda.',
  'Robo maestro de %A: sin parcial, con botín, con público callado un segundo. El ranking lo registra sin anestesia, coño.',
  '%A vs %V: clínica de atraco con resultado de vaciado. Y el grupo lo vio entero, cabrón.',
  '%A cobró el aura de %V en el modo que no deja casi margen. El ranking lo registra sin anestesia, gilipollas.',
  '%A el golpe a %V fue de autor: el ranking firma debajo en grande. El ranking lo registra sin anestesia, patético.',
  '%A vs %V terminó con %A en el lado pesado del transfer. El ranking lo registra sin anestesia, ridículo.',
  '%A no dejó migas útiles en la cuenta de %V: migas no alimentan. El ranking lo registra sin anestesia, basura.',
  'Atraco de categoría a favor de %A: %V en pérdidas graves. El ranking lo registra sin anestesia, desperdicio.',
  '%A se llevó el botín gordo de %V con la calma de quien ya había contado. El ranking lo registra sin anestesia, asco.',
  '%A vs %V: el maestro no pide aplauso, el contador lo da. El ranking lo registra sin anestesia, cutre.',
  '%A ejecutó el vaciado de %V en un movimiento limpio y pesado. El ranking lo registra sin anestesia, pringado.',
  '%A el aura de %V cambió de dueño en cantidad que se nota sin lupa. El ranking lo registra sin anestesia, fracasado.',
  '%A vs %V terminó 1-0 con peso: el peso es el botín de %A. El ranking lo registra sin anestesia, joder.',
  '%A cobró de %V todo lo que el atraco maestro permite en este sistema. El ranking lo registra sin anestesia, mierda.',
  'Robo de nivel: %A a costa de %V, sin almost, con hueco grande. El ranking lo registra sin anestesia, coño.',
  '%A se llevó de %V lo marcado en la lista de la compra completa. El ranking lo registra sin anestesia, cabrón.',
  '%A vs %V: crónica de un vaciado legible en el ranking al instante. El ranking lo registra sin anestesia, gilipollas.',
  '%A ejecutó el atraco a %V como quien no contempla el parcial. El ranking lo registra sin anestesia, patético.',
  '%A el golpe fue maestro: %V lo nota el resto de la sesión. El ranking lo registra sin anestesia, ridículo.',
  '%A vs %V terminó con transfer pesado a nombre de %A. Y el grupo lo vio entero, basura.',
  '%A no dejó a %V con margen cómodo: el margen se fue con el botín. El ranking lo registra sin anestesia, desperdicio.',
  'Atraco maestro de %A: el chat vio el vaciado y el contador lo selló. El ranking lo registra sin anestesia, asco.',
  '%A vs %V: gana quien vació, el resto es ruido de la pérdida. El ranking lo registra sin anestesia, cutre.',
  '%A cobró el aura de %V en cantidad de maestro, no de aprendiz. El ranking lo registra sin anestesia, pringado.',
  '%A el plan contra %V salió en versión completa: botín completo posible. El ranking lo registra sin anestesia, fracasado.',
  '%A vs %V terminó con %A contando en grande y %V restando en serio. El ranking lo registra sin anestesia, joder.',
  '%A se llevó el pack de %V: el pack no volvió. Y el grupo lo vio entero, mierda.',
  'Robo maestro: %A cierra el parte con botín, %V con el hueco del mismo peso. El ranking lo registra sin anestesia, coño.',
  '%A vs %V: el ladrón de nivel cobró sin pedir segunda oportunidad. El ranking lo registra sin anestesia, cabrón.',
  '%A ejecutó el vaciado de %V con la lista cerrada y el resultado abierto a su favor. El ranking lo registra sin anestesia, gilipollas.',
  '%A el contador no miente en grande: %V menos mucho, %A más mucho. El ranking lo registra sin anestesia, patético.',
  '%A vs %V terminó con el aura de %V en tránsito casi total. El ranking lo registra sin anestesia, ridículo.',
  '%A cobró de %V como maestro que no acepta migajas de botín. El ranking lo registra sin anestesia, basura.',
  'Atraco de categoría: %A a %V, ranking actualizado a lo grande. El ranking lo registra sin anestesia, desperdicio.',
  '%A se llevó de %V lo que duele ver desaparecer en un solo golpe. El ranking lo registra sin anestesia, asco.',
  '%A vs %V: clínica de atraco, paciente %V con menos aura de la entrada. El ranking lo registra sin anestesia, cutre.',
  '%A ejecutó el golpe maestro a %V: sin parcial, con firma en el contador. El ranking lo registra sin anestesia, pringado.',
  '%A el botín de %V viajó casi entero: billete a nombre de %A. El ranking lo registra sin anestesia, fracasado.',
  '%A vs %V terminó 1-0 con el 1 pesando de verdad. Y el grupo lo vio entero, joder.',
  '%A no dejó el atraco a medias: maestro sobre %V, punto. El ranking lo registra sin anestesia, mierda.',
  'Robo de nivel de %A a costa de %V: visible en grande, legible sin esfuerzo. El ranking lo registra sin anestesia, coño.',
  '%A se llevó el aura de %V en cantidad que el almost no contempla. El ranking lo registra sin anestesia, cabrón.',
  '%A vs %V: el maestro cobró, la víctima cuenta el hueco sin consuelo. El ranking lo registra sin anestesia, gilipollas.',
  '%A ejecutó el vaciado de %V en el timing del que no avisa y no falla. El ranking lo registra sin anestesia, patético.',
  '%A el golpe a %V fue de autor: el ranking no pide aclaración. El ranking lo registra sin anestesia, ridículo.',
  '%A vs %V terminó con transfer pesado y silencio útil de %V. El ranking lo registra sin anestesia, basura.',
  '%A cobró de %V el máximo que el atraco maestro permite mostrar. El ranking lo registra sin anestesia, desperdicio.',
  'Atraco maestro: %A con botín gordo, %V con pérdida del mismo calibre. El ranking lo registra sin anestesia, asco.',
  '%A vs %V: gana %A por vaciado, pierde %V por no retener. El ranking lo registra sin anestesia, cutre.',
  '%A se llevó de %V lo marcado en grande: casilla cobrada en serio. El ranking lo registra sin anestesia, pringado.',
  '%A el plan salió en versión completa contra %V. Y el grupo lo vio entero, fracasado.',
  '%A vs %V terminó con el ranking en movimiento fuerte a favor de %A. El ranking lo registra sin anestesia, joder.',
  '%A ejecutó el atraco a %V sin almost y sin devolución posible. El ranking lo registra sin anestesia, mierda.',
  '%A el aura de %V bajó de verdad: el mensaje no exagera. Y el grupo lo vio entero, coño.',
  '%A vs %V: crónica de un vaciado que el chat archiva en grande. El ranking lo registra sin anestesia, cabrón.',
  '%A cobró el botín maestro de %V con la calma de quien ya sumó. El ranking lo registra sin anestesia, gilipollas.',
  'Robo de nivel: %A cierra, %V abre el hueco grande, el grupo lo ve. El ranking lo registra sin anestesia, patético.',
  '%A vs %V terminó 1-0 con peso de aura real. Y el grupo lo vio entero, ridículo.',
  '%A se llevó el pack de %V: el pack no tenía plan B de defensa. El ranking lo registra sin anestesia, basura.',
  '%A ejecutó el vaciado de %V como quien no contempla el término medio. El ranking lo registra sin anestesia, desperdicio.',
  '%A vs %V: el maestro no suda, el contador de %V sí baja. El ranking lo registra sin anestesia, asco.',
  '%A cobró de %V en modo autor: firma grande en el ranking. El ranking lo registra sin anestesia, cutre.',
  'Atraco maestro de %A a costa de %V: sin relativizar, con números gordos. El ranking lo registra sin anestesia, pringado.',
  '%A vs %V terminó con el transfer pesado y el debate inútil. El ranking lo registra sin anestesia, fracasado.',
  '%A se llevó el aura de %V en cantidad de quien no deja el trabajo a medias. El ranking lo registra sin anestesia, joder.',
  '%A el golpe maestro a %V aterrizó donde más se nota: el contador. El ranking lo registra sin anestesia, mierda.',
  '%A vs %V: 1-0 con botín de categoría a nombre de %A. Y el grupo lo vio entero, coño.',
  '%A ejecutó el atraco a %V en el modo que el parcial no alcanza. El ranking lo registra sin anestesia, cabrón.',
  '%A el botín de %V cambió de manos en grande: manos de %A. El ranking lo registra sin anestesia, gilipollas.',
  '%A vs %V terminó con %A en el lado pesado y %V en el hueco serio. El ranking lo registra sin anestesia, patético.',
  '%A cobró de %V como quien cierra una deuda con intereses de maestro. El ranking lo registra sin anestesia, ridículo.',
  'Robo maestro: %A con el resultado gordo, %V con la pérdida del mismo tamaño. El ranking lo registra sin anestesia, basura.',
  '%A vs %V: el ladrón de nivel firmó el parte antes de la queja completa. El ranking lo registra sin anestesia, desperdicio.',
  '%A se llevó de %V lo que el atraco maestro está diseñado para llevar. El ranking lo registra sin anestesia, asco.',
  '%A ejecutó el vaciado de %V sin pedir permiso al contador de %V. El ranking lo registra sin anestesia, cutre.',
  '%A vs %V terminó con el ranking actualizado en grande a favor de %A. El ranking lo registra sin anestesia, pringado.',
  '%A cobró el aura de %V en el timing del maestro: ahora, todo lo posible. El ranking lo registra sin anestesia, fracasado.',
  'Atraco de categoría a favor de %A: %V en el parte de bajas graves. El ranking lo registra sin anestesia, joder.',
  '%A vs %V: clínica de vaciado, resultado legible al instante. El ranking lo registra sin anestesia, mierda.',
  '%A se llevó el pack de aura de %V con precisión de cobro total posible. El ranking lo registra sin anestesia, coño.',
  '%A el golpe a %V fue maestro: el chat no necesita cámara lenta. El ranking lo registra sin anestesia, cabrón.',
  '%A vs %V terminó 1-0 con el botín pesando en la cuenta de %A. El ranking lo registra sin anestesia, gilipollas.',
  '%A ejecutó el atraco a %V sin almost: el ranking muestra el tamaño. El ranking lo registra sin anestesia, patético.',
  '%A el aura de %V viajó casi entera sin billete de vuelta. El ranking lo registra sin anestesia, ridículo.',
  '%A vs %V: gana quien vació en serio, pierde quien no retuvo en serio. El ranking lo registra sin anestesia, basura.',
  '%A cobró de %V el máximo visible del sistema en este golpe. El ranking lo registra sin anestesia, desperdicio.',
  'Robo maestro de %A: sin parcial, con hueco grande, con público. El ranking lo registra sin anestesia, asco.',
  '%A vs %V terminó con transfer pesado y archivo cerrado a favor de %A. El ranking lo registra sin anestesia, cutre.',
  '%A se llevó de %V lo que duele soltar de un solo golpe limpio. El ranking lo registra sin anestesia, pringado.',
  '%A ejecutó el vaciado de %V como autor que no firma works in progress. El ranking lo registra sin anestesia, fracasado.',
  '%A vs %V: 1-0 en aura con peso, sin prórroga, con botín. El ranking lo registra sin anestesia, joder.',
  '%A cobró el aura de %V en cantidad que el mensaje no necesita adornar. El ranking lo registra sin anestesia, mierda.',
  'Atraco maestro: %A cierra el parte gordo, %V el hueco del mismo calibre. El ranking lo registra sin anestesia, coño.',
  '%A vs %V terminó con el contador de %A en más grande y el de %V en menos grande. El ranking lo registra sin anestesia, cabrón.',
  '%A se llevó el botín de %V en modo maestro: el almost no aplica. El ranking lo registra sin anestesia, gilipollas.',
  '%A el plan contra %V salió completo: el botín también. El ranking lo registra sin anestesia, patético.',
  '%A vs %V: el maestro cobró, la víctima restó, el grupo archivó. El ranking lo registra sin anestesia, ridículo.',
  '%A ejecutó el golpe a %V con lista cerrada y bolsillo a la medida del botín. El ranking lo registra sin anestesia, basura.',
  '%A el vaciado de %V se lee en el ranking sin necesidad de lupa. El ranking lo registra sin anestesia, desperdicio.',
  '%A vs %V terminó con el aura de %V en manos de %A en cantidad seria. El ranking lo registra sin anestesia, asco.',
  '%A cobró de %V como quien no deja el atraco a mitad de la gloria. El ranking lo registra sin anestesia, cutre.',
  'Robo de nivel: %A a costa de %V, resultado maestro, archivo listo. El ranking lo registra sin anestesia, pringado.',
  '%A vs %V: 1-0 con peso real de aura a favor de quien atacó en serio. El ranking lo registra sin anestesia, fracasado.'
];

const ROB_PARCIAL = [
  '%A entró a por todo el aura de %V y salió con las manos medio llenas: botín parcial, sed intacta. Joder.',
  '%A le robó a %V solo una parte: suficiente para que se note, insuficiente para la gloria total. Mierda.',
  'Robo a medias: %A cobra algo de %V, %V se salva de lo peor, el chat ve el término medio. El ranking lo registra sin anestesia, coño.',
  '%A vs %V terminó con botín incompleto: %A no se queja del todo, %V tampoco respira tranquilo. Cabrón.',
  '%A se llevó un trozo del aura de %V: el resto se quedó por falta de empuje o de suerte. El ranking lo registra sin anestesia, gilipollas.',
  'Atraco parcial de %A a %V: el contador se mueve, pero no del todo a favor de nadie. El ranking lo registra sin anestesia, patético.',
  '%A no vació a %V: lo dejó cojo de aura. Cojo duele igual. El ranking lo registra sin anestesia, ridículo.',
  '%A vs %V: botín a medias, drama a medias, resultado legible en el ranking. El ranking lo registra sin anestesia, basura.',
  '%A cobró de %V menos de lo que soñó y más de lo que %V quería soltar. El ranking lo registra sin anestesia, desperdicio.',
  'Robo incompleto: %A con algo en el bolsillo, %V con menos, ninguno del todo contento. El ranking lo registra sin anestesia, asco.',
  '%A entró a por el pack completo de %V y salió con la mitad: la mitad ya duele. El ranking lo registra sin anestesia, cutre.',
  '%A el golpe a %V conectó a medias: el contador baja, no se desploma. El ranking lo registra sin anestesia, pringado.',
  '%A vs %V terminó con transfer parcial: suficiente para el mensaje, no para el exterminio. Fracasado.',
  '%A se llevó lo que pudo del aura de %V: lo que pudo no era todo. El ranking lo registra sin anestesia, joder.',
  'Atraco a medias: %A no falla del todo, %V no se salva del todo. El ranking lo registra sin anestesia, mierda.',
  '%A cobró un pedazo de %V: el pedazo se nota en el ranking. El ranking lo registra sin anestesia, coño.',
  '%A vs %V: botín incompleto, cara de ambos de no estar satisfechos. El ranking lo registra sin anestesia, cabrón.',
  '%A no dejó a %V en cero: lo dejó en menos. Menos basta para este mensaje. El ranking lo registra sin anestesia, gilipollas.',
  'Robo parcial de %A: el aura de %V sangra, no se desangra. El ranking lo registra sin anestesia, patético.',
  '%A entró a por todo y el todo no cupo: salió con una parte de %V. El ranking lo registra sin anestesia, ridículo.',
  '%A vs %V terminó con el contador en movimiento moderado a favor de %A. El ranking lo registra sin anestesia, basura.',
  '%A se llevó un trozo legible del aura de %V: legible duele. El ranking lo registra sin anestesia, desperdicio.',
  '%A el golpe fue suficiente para marcar y insuficiente para cerrar el libro de %V. El ranking lo registra sin anestesia, asco.',
  '%A vs %V: media ración de botín, media ración de drama. El ranking lo registra sin anestesia, cutre.',
  '%A cobró de %V lo que el timing y la defensa dejaron pasar. El ranking lo registra sin anestesia, pringado.',
  'Robo a medias: %A con botín parcial, %V con pérdida parcial, el grupo con el dato. El ranking lo registra sin anestesia, fracasado.',
  '%A no vació la cuenta de %V: le hizo un agujero. El agujero se ve. El ranking lo registra sin anestesia, joder.',
  '%A vs %V terminó con transfer incompleto y mensaje completo. El ranking lo registra sin anestesia, mierda.',
  '%A se llevó lo que pudo: lo que pudo de %V ya no es de %V. El ranking lo registra sin anestesia, coño.',
  '%A el atraco a %V se quedó a mitad de camino del exterminio. El ranking lo registra sin anestesia, cabrón.',
  '%A vs %V: botín sí, gloria total no, dolor de %V sí. El ranking lo registra sin anestesia, gilipollas.',
  '%A cobró una parte del aura de %V: la parte que el ranking muestra a la baja. El ranking lo registra sin anestesia, patético.',
  'Atraco parcial: %A no se va vacío, %V no se queda en cero. El ranking lo registra sin anestesia, ridículo.',
  '%A entró a por el pack y salió con el snack: el snack era aura de %V. El ranking lo registra sin anestesia, basura.',
  '%A vs %V terminó con el contador en menos para %V sin llegar al suelo. El ranking lo registra sin anestesia, desperdicio.',
  '%A se llevó un corte del aura de %V: el corte sangra en el ranking. El ranking lo registra sin anestesia, asco.',
  '%A el golpe a %V no fue total: fue suficiente para este parte. El ranking lo registra sin anestesia, cutre.',
  '%A vs %V: robo sí, masacre no, resultado legible sí. El ranking lo registra sin anestesia, pringado.',
  '%A cobró de %V a medias: las medias duelen cuando son aura. El ranking lo registra sin anestesia, fracasado.',
  'Robo incompleto de %A a costa de %V: el chat ve el movimiento parcial. El ranking lo registra sin anestesia, joder.',
  '%A no dejó a %V en la ruina: lo dejó en la molestia grave. El ranking lo registra sin anestesia, mierda.',
  '%A vs %V terminó con botín a favor de %A sin cerrar el capítulo de %V. El ranking lo registra sin anestesia, coño.',
  '%A se llevó lo disponible en el momento: lo disponible era de %V. El ranking lo registra sin anestesia, cabrón.',
  '%A el atraco parcial a %V cuenta igual en el historial de ambos. El ranking lo registra sin anestesia, gilipollas.',
  '%A vs %V: media victoria de %A, media herida de %V. Y el grupo lo vio entero, patético.',
  '%A cobró un tramo del aura de %V: el tramo se nota al restar. El ranking lo registra sin anestesia, ridículo.',
  'Atraco a medias: %A con algo, %V con menos, ninguno en el extremo. El ranking lo registra sin anestesia, basura.',
  '%A entró a por todo el contador de %V y el contador solo bajó un tramo. El ranking lo registra sin anestesia, desperdicio.',
  '%A vs %V terminó con transfer parcial documentado en el ranking. El ranking lo registra sin anestesia, asco.',
  '%A se llevó un trozo: el trozo era aura de %V y ya no vuelve entero. El ranking lo registra sin anestesia, cutre.',
  '%A el golpe conectó a medias: %V sangra aura sin caer del ranking del todo. El ranking lo registra sin anestesia, pringado.',
  '%A vs %V: botín incompleto, mensaje completo de que %A no falló del todo. El ranking lo registra sin anestesia, fracasado.',
  '%A cobró de %V lo que la defensa no logró retener. Y el grupo lo vio entero, joder.',
  'Robo parcial: %A no celebra el exterminio, celebra el movimiento del contador. El ranking lo registra sin anestesia, mierda.',
  '%A no vació a %V: lo dejó cojeando de aura. Cojear se ve. El ranking lo registra sin anestesia, coño.',
  '%A vs %V terminó con %A en más moderado y %V en menos moderado. El ranking lo registra sin anestesia, cabrón.',
  '%A se llevó una parte legítima del aura de %V: legítima en el ranking. El ranking lo registra sin anestesia, gilipollas.',
  '%A el atraco a %V se quedó entre el almost y el pleno: en el medio que duele. El ranking lo registra sin anestesia, patético.',
  '%A vs %V: media ración de gloria para %A, media de pérdida para %V. El ranking lo registra sin anestesia, ridículo.',
  '%A cobró el tramo que pudo del aura de %V en este intento. El ranking lo registra sin anestesia, basura.',
  'Atraco incompleto de %A: suficiente para el parte, insuficiente para el mito. El ranking lo registra sin anestesia, desperdicio.',
  '%A entró a por el aura completa de %V y el universo le dio una parte. El ranking lo registra sin anestesia, asco.',
  '%A vs %V terminó con el contador en movimiento a favor de %A sin sentencia final. El ranking lo registra sin anestesia, cutre.',
  '%A se llevó un corte limpio pero no total del aura de %V. El ranking lo registra sin anestesia, pringado.',
  '%A el golpe a %V marcó el ranking sin borrar a %V del mapa. El ranking lo registra sin anestesia, fracasado.',
  '%A vs %V: robo sí, ruina total no, dolor sí. Y el grupo lo vio entero, joder.',
  '%A cobró de %V a medias y el chat registró el medio sin duda. El ranking lo registra sin anestesia, mierda.',
  'Robo a medias: %A con botín parcial en el bolsillo, %V con el hueco parcial. El ranking lo registra sin anestesia, coño.',
  '%A no cerró el libro de %V: le arrancó un capítulo de aura. El ranking lo registra sin anestesia, cabrón.',
  '%A vs %V terminó con transfer parcial y caras de no estar del todo satisfechos. El ranking lo registra sin anestesia, gilipollas.',
  '%A se llevó lo que el momento dejó pasar del aura de %V. El ranking lo registra sin anestesia, patético.',
  '%A el atraco parcial cuenta en el historial igual que uno pleno: duele distinto. El ranking lo registra sin anestesia, ridículo.',
  '%A vs %V: media victoria, media herida, resultado legible. El ranking lo registra sin anestesia, basura.',
  '%A cobró un segmento del aura de %V: el segmento se resta en público. El ranking lo registra sin anestesia, desperdicio.',
  'Atraco parcial de %A a %V: el ranking no necesita el pleno para actualizar. El ranking lo registra sin anestesia, asco.',
  '%A entró a por todo y salió con una fracción: la fracción era de %V. El ranking lo registra sin anestesia, cutre.',
  '%A vs %V terminó con %A en más y %V en menos sin llegar a los extremos. El ranking lo registra sin anestesia, pringado.',
  '%A se llevó un pedazo del aura de %V que el contador no devuelve solo. El ranking lo registra sin anestesia, fracasado.',
  '%A el golpe fue medio: el efecto en %V no es medio del todo. El ranking lo registra sin anestesia, joder.',
  '%A vs %V: botín a medias, mensaje entero de que hubo robo. El ranking lo registra sin anestesia, mierda.',
  '%A cobró de %V lo que pudo en el intento: lo que pudo ya no es de %V. El ranking lo registra sin anestesia, coño.',
  'Robo incompleto: %A no se va con las manos vacías, %V no se queda en cero. El ranking lo registra sin anestesia, cabrón.',
  '%A no masacró a %V: lo hirió de aura. La herida se ve en el ranking. El ranking lo registra sin anestesia, gilipollas.',
  '%A se llevó un tramo del contador de %V: el tramo cambia el día de ambos. El ranking lo registra sin anestesia, ridículo.',
  '%A el atraco a medias a %V basta para este parte del comando. El ranking lo registra sin anestesia, basura.',
  '%A vs %V: media gloria, media pérdida, cero duda de que %A cobró algo. El ranking lo registra sin anestesia, desperdicio.',
  '%A cobró una parte del aura de %V y el chat no discute la parte. El ranking lo registra sin anestesia, asco.',
  'Atraco a medias: %A con algo de botín, %V con algo de hueco. El ranking lo registra sin anestesia, cutre.',
  '%A entró a por el pack de %V y el pack no salió entero: salió un trozo. El ranking lo registra sin anestesia, pringado.',
  '%A se llevó lo disponible sin llevarse el resto: lo disponible era de %V. El ranking lo registra sin anestesia, joder.',
  '%A el golpe parcial a %V marca el historial de los dos. El ranking lo registra sin anestesia, mierda.',
  '%A vs %V: robo real, botín incompleto, dolor real. Y el grupo lo vio entero, coño.',
  '%A cobró el tramo que la defensa de %V no retuvo del todo. El ranking lo registra sin anestesia, cabrón.',
  'Robo parcial de %A: el aura de %V baja sin llegar al sótano. El ranking lo registra sin anestesia, gilipollas.',
  '%A no dejó a %V en blanco: lo dejó en menos. El menos se lee. El ranking lo registra sin anestesia, patético.',
  '%A se llevó un corte del aura de %V suficiente para el mensaje. El ranking lo registra sin anestesia, basura.',
  '%A el atraco incompleto a %V duele distinto al pleno: duele igual de público. El ranking lo registra sin anestesia, desperdicio.',
  '%A vs %V: media ración de todo, ración completa de que hubo robo. El ranking lo registra sin anestesia, asco.',
  '%A cobró de %V una parte que el ranking muestra sin necesidad de pleno. El ranking lo registra sin anestesia, cutre.'
];

const ROB_DESASTRE = [
  '%A salió a robar y acabó financiando a %V: el karma le pasó factura con intereses. El chat lo vio entero y no hace falta replay, joder.',
  '%A intentó el atraco y terminó pagando el aura de su bolsillo a %V. El chat lo vio entero y no hace falta replay, mierda.',
  'Desastre total: %A no solo falló, encima le dejó el aura a %V en bandeja. El chat lo vio entero y no hace falta replay, coño.',
  '%A vs %V terminó con %A más pobre y %V agradeciendo el regalo. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A vino a cazar y salió cazado: %V cuenta el botín que no era suyo al principio. El chat lo vio entero y no hace falta replay, gilipollas.',
  'El atraco de %A fue un donativo disfrazado: %V no dijo que no. El chat lo vio entero y no hace falta replay, patético.',
  '%A perdió el robo y el aura: %V ganó el día sin sudar el ataque. El chat lo vio entero y no hace falta replay, ridículo.',
  'Desastre de %A: intentó quitar y terminó poniendo aura en la cuenta de %V. El chat lo vio entero y no hace falta replay, basura.',
  '%A firmó un cheque al portador a nombre de %V con su propio fallo. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A el plan salió tan mal que %V cobró peaje por haber sido el objetivo. El chat lo vio entero y no hace falta replay, asco.',
  '%A vs %V: marcador final a favor de quien debía perder el aura. El chat lo vio entero y no hace falta replay, cutre.',
  '%A no solo falló el golpe: abrió la cartera y %V dijo gracias. El chat lo vio entero y no hace falta replay, pringado.',
  'Desastre documentado: %A más ligero, %V más pesado de aura, el chat más contento. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A salió a por el botín y volvió sin el suyo: %V sonríe con lo de los dos. El chat lo vio entero y no hace falta replay, joder.',
  '%A el karma no solo paró el atraco: le dio la vuelta y se lo cobró. El chat lo vio entero y no hace falta replay, mierda.',
  '%A intentó robar a %V y terminó de patrocinador oficial de su aura. El chat lo vio entero y no hace falta replay, coño.',
  'Desastre: %A en números rojos, %V en verde, el intento en el museo de fails. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A puso la mano para quitar y la retiró dejando de más: %V no se queja. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A vs %V terminó en donación involuntaria con público. El chat lo vio entero y no hace falta replay, patético.',
  '%A el atraco perfecto al revés: todo lo que podía salir mal, salió y cobró. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A perdió el duelo y el saldo: %V ni tenía que haber peleado. El chat lo vio entero y no hace falta replay, basura.',
  'Desastre de manual: %A autor, %V beneficiario, el grupo testigo de la limosna. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A salió a cazar aura ajena y volvió dejando la propia en el plato de %V. El chat lo vio entero y no hace falta replay, asco.',
  '%A el fallo no bastaba: hacía falta el peaje. %V lo cobró. El chat lo vio entero y no hace falta replay, cutre.',
  '%A vs %V: el ladrón pagó la cena y la propina. El chat lo vio entero y no hace falta replay, pringado.',
  '%A intentó el golpe de la semana y firmó la donación del mes. El chat lo vio entero y no hace falta replay, fracasado.',
  'Desastre total de %A: el aura viajó en la dirección contraria a la planeada. El chat lo vio entero y no hace falta replay, joder.',
  '%A puso el atraco en marcha y el universo lo puso en marcha al revés. El chat lo vio entero y no hace falta replay, mierda.',
  '%A sin el botín de %V y sin el suyo: %V con ambos sonidos de caja. El chat lo vio entero y no hace falta replay, coño.',
  '%A el plan era quitar: el resultado fue dar. %V aplaude en silencio. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A vs %V terminó con el ranking más justo de lo que %A quería. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A falló tan fuerte que el eco le cobró aura a favor de %V. El chat lo vio entero y no hace falta replay, patético.',
  'Desastre: %A más pobre por intentar ser más rico a costa de %V. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A el atraco se le volvió en contra como un bumerán con intereses. El chat lo vio entero y no hace falta replay, basura.',
  '%A firmó el fail y el transfer en el mismo movimiento de manos. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A vs %V: crónica de un donativo anunciado como robo. El chat lo vio entero y no hace falta replay, asco.',
  '%A salió a vaciar a %V y terminó vaciándose él: el chat tomó nota. El chat lo vio entero y no hace falta replay, cutre.',
  '%A el karma contó el intento y pasó factura con el aura de %A. El chat lo vio entero y no hace falta replay, pringado.',
  'Desastre de %A: no hay premio de consolación, hay peaje. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A intentó el atraco y %V terminó cobrando el servicio de haber sido objetivo. El chat lo vio entero y no hace falta replay, joder.',
  '%A vs %V en modo desastre: gana quien debía perder según el guion de %A. El chat lo vio entero y no hace falta replay, mierda.',
  '%A puso la trampa y pagó la fianza: %V recogió ambas cosas. El chat lo vio entero y no hace falta replay, coño.',
  '%A sin gloria y con el saldo peor: %V con el día hecho. El chat lo vio entero y no hace falta replay, cabrón.',
  'Desastre total: el aura de %A emigró hacia %V sin pedir asilo. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A el golpe salió por la culata y la culata cobraba en aura. El chat lo vio entero y no hace falta replay, patético.',
  '%A vs %V terminó con transfer automático por incompetencia. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A salió a robar y el universo le cobró el intento en la moneda del aura. El chat lo vio entero y no hace falta replay, basura.',
  '%A el fail no era suficiente castigo: hacía falta el peaje. Cobrado. El chat lo vio entero y no hace falta replay, desperdicio.',
  'Desastre documentado de %A a favor de %V: el ranking no discute. El chat lo vio entero y no hace falta replay, asco.',
  '%A intentó quitar y sumó en la columna de %V: matemáticas del desastre. El chat lo vio entero y no hace falta replay, cutre.',
  '%A vs %V: el ladrón pagó la entrada, la consumición y la propina. El chat lo vio entero y no hace falta replay, pringado.',
  '%A el atraco al revés perfecto: manual de lo que no hay que hacer, con factura. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A perdió el robo, el aura y la cara: %V solo tenía que existir. El chat lo vio entero y no hace falta replay, joder.',
  'Desastre: %A en modo patrocinador involuntario de %V. El chat lo vio entero y no hace falta replay, mierda.',
  '%A firmó la donación con la misma mano que iba a robar. El chat lo vio entero y no hace falta replay, coño.',
  '%A vs %V terminó con el contador de %A en menos y el de %V en más. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A salió a por todo y volvió con menos de lo que tenía: %V agradece. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A el plan se le giró 180 grados y le cobró el viaje. El chat lo vio entero y no hace falta replay, patético.',
  'Desastre de %A: el botín viajó hacia %V con remitente el fallo. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A intentó el golpe y terminó de cajero automático de %V. El chat lo vio entero y no hace falta replay, basura.',
  '%A vs %V en una línea: %A pagó. Punto. Y el grupo no necesita que se lo expliquen dos veces, desperdicio.',
  '%A el atraco fue un transfer con pasos extra innecesarios. El chat lo vio entero y no hace falta replay, asco.',
  '%A sin el aura de %V: sin la suya tampoco: %V con el combo. El chat lo vio entero y no hace falta replay, cutre.',
  'Desastre total de %A documentado a favor de quien iba a ser la víctima. El chat lo vio entero y no hace falta replay, pringado.',
  '%A puso el robo en el horno y se coció él: %V se comió el plato. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A el karma no negocia: %V cobra. Y el grupo no necesita que se lo expliquen dos veces, joder.',
  '%A vs %V terminó con el peaje más caro del día para %A. El chat lo vio entero y no hace falta replay, mierda.',
  '%A salió a vaciar bolsillos y terminó vaciando el suyo: %V testigo y cajero. El chat lo vio entero y no hace falta replay, coño.',
  '%A el fallo con recargo: el recargo en aura a nombre de %V. El chat lo vio entero y no hace falta replay, cabrón.',
  'Desastre: %A más ligero, %V más contento, el chat más entretenido. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A intentó el atraco de oro y firmó la donación de bronce oxidado. El chat lo vio entero y no hace falta replay, patético.',
  '%A vs %V: crónica breve de un transfer largo para %A. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A el bumerán del robo le volvió con intereses de demora. El chat lo vio entero y no hace falta replay, basura.',
  '%A sin gloria: con el saldo empeorado: %V sin haber atacado. El chat lo vio entero y no hace falta replay, desperdicio.',
  'Desastre de manual con factura: autor %A, beneficiario %V. El chat lo vio entero y no hace falta replay, asco.',
  '%A firmó el fail y el cargo en la misma firma. Y el grupo no necesita que se lo expliquen dos veces, cutre.',
  '%A vs %V terminó con el ranking corrigiendo a %A a la baja. El chat lo vio entero y no hace falta replay, pringado.',
  '%A salió a por el aura ajena y regaló la propia: eficiencia del desastre. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A el universo le cobró el intento al contado. Y el grupo no necesita que se lo expliquen dos veces, joder.',
  'Desastre: %A en rojo, %V en verde, el intento en el museo. El chat lo vio entero y no hace falta replay, mierda.',
  '%A puso la mano para sacar y depositó: %V no corrigió el error. El chat lo vio entero y no hace falta replay, coño.',
  '%A vs %V en modo donación: el donante no quería serlo. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A el atraco perfecto al revés con público y sin reembolso. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A perdió lo que no pensaba perder: %V ganó lo que no pedía. El chat lo vio entero y no hace falta replay, patético.',
  'Desastre total: el aura de %A cambió de dueño sin contrato de robo exitoso. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A el peaje del fallo se cobró en la moneda que %A quería robar. El chat lo vio entero y no hace falta replay, basura.',
  '%A vs %V terminó con %A financiando el aura de quien iba a ser víctima. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A salió a cazar y volvió siendo el trofeo: %V en la pared del ranking. El chat lo vio entero y no hace falta replay, asco.',
  '%A el plan se le volvió en contra con contabilidad incluida. El chat lo vio entero y no hace falta replay, cutre.',
  'Desastre documentado: %A autor del transfer, %V receptor silencioso. El chat lo vio entero y no hace falta replay, pringado.',
  '%A intentó el golpe y el golpe le hizo el cargo. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A vs %V: el ladrón pagó la cuenta de los dos. Y el grupo no necesita que se lo expliquen dos veces, joder.',
  '%A sin botín propio ni ajeno: %V con el día resuelto. El chat lo vio entero y no hace falta replay, mierda.',
  'Desastre de %A: no hay consolación, hay cargo en cuenta. El chat lo vio entero y no hace falta replay, coño.',
  '%A firmó la revancha del universo a favor de %V sin querer. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A el atraco se le convirtió en limosna con pasos de más. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A vs %V terminó con el contador haciendo lo contrario de lo planeado. El chat lo vio entero y no hace falta replay, patético.',
  '%A salió a vaciar y terminó de cajero: %V ni pidió el servicio. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A el karma pasó el cobro y %V no rechazó el pago. El chat lo vio entero y no hace falta replay, basura.',
  'Desastre total de %A a la vista de todo el grupo. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A puso el robo en marcha atrás sin querer: %V recibió igual. El chat lo vio entero y no hace falta replay, asco.',
  '%A vs %V en una frase: %A pagó el intento con aura. El chat lo vio entero y no hace falta replay, cutre.',
  '%A el fail con intereses: los intereses se llaman %V. El chat lo vio entero y no hace falta replay, pringado.',
  '%A sin el plan: con el cargo: %V con el aura. El chat lo vio entero y no hace falta replay, fracasado.',
  'Desastre: %A más pobre por la ambición mal ejecutada. El chat lo vio entero y no hace falta replay, joder.',
  '%A intentó quitar y el universo sumó en la otra columna. El chat lo vio entero y no hace falta replay, mierda.',
  '%A vs %V terminó con transfer y sin gloria para el que empezó el lío. El chat lo vio entero y no hace falta replay, coño.',
  '%A el bumerán no solo volvió: volvió cobrando. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A perdió el duelo del atraco y el del saldo: %V ni se puso los guantes. El chat lo vio entero y no hace falta replay, gilipollas.',
  'Desastre de manual: %A en el parte como deudor. El chat lo vio entero y no hace falta replay, patético.',
  '%A firmó el cargo con la mano del atraco. Y el grupo no necesita que se lo expliquen dos veces, ridículo.',
  '%A vs %V: el ranking actualiza a la baja a %A y al alza a %V. El chat lo vio entero y no hace falta replay, basura.',
  '%A salió a por todo y volvió con menos: definición de desastre. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A el peaje se cobró solo: %V fue el cajero silencioso. El chat lo vio entero y no hace falta replay, asco.',
  'Desastre documentado a favor de %V: autor intelectual %A. El chat lo vio entero y no hace falta replay, cutre.',
  '%A intentó el atraco y terminó de mecenas de %V. El chat lo vio entero y no hace falta replay, pringado.',
  '%A vs %V en modo desastre limpio: sin duda del resultado. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A el aura viajó al revés: el chat viajó a la risa. El chat lo vio entero y no hace falta replay, joder.',
  '%A sin gloria y con el saldo en menos: %V sin haber pedido nada. El chat lo vio entero y no hace falta replay, mierda.',
  'Desastre total: %A financió a %V con el intento de robarle. El chat lo vio entero y no hace falta replay, coño.',
  '%A puso el golpe y recibió el cargo: contabilidad del karma. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A vs %V terminó con %A de patrocinador y %V de marca. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A el atraco al revés: manual vivo de lo que no hacer, con precio. El chat lo vio entero y no hace falta replay, patético.',
  '%A perdió lo que quería ganar y lo que ya tenía: %V solo miró. El chat lo vio entero y no hace falta replay, ridículo.',
  'Desastre: el aura de %A encontró dueño nuevo sin robo exitoso de por medio. El chat lo vio entero y no hace falta replay, basura.',
  '%A el universo no negocia el peaje del fail: %V cobra en silencio. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A vs %V: crónica de un donativo con coreografía de atraco. El chat lo vio entero y no hace falta replay, asco.',
  '%A salió a vaciar a %V y terminó en la cola del cajero al revés. El chat lo vio entero y no hace falta replay, cutre.',
  '%A el fallo con recargo automático: recargo a nombre de %V. El chat lo vio entero y no hace falta replay, pringado.',
  'Desastre de %A: el chat no necesita amplificación. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A intentó el golpe de oro y firmó el cargo de plomo. El chat lo vio entero y no hace falta replay, joder.',
  '%A vs %V terminó con el contador de %A en dirección incorrecta. El chat lo vio entero y no hace falta replay, mierda.',
  '%A el bumerán del robo le cobró el viaje de ida y vuelta. El chat lo vio entero y no hace falta replay, coño.',
  '%A sin botín: con menos aura: %V con el combo ganado sin atacar. El chat lo vio entero y no hace falta replay, cabrón.',
  'Desastre total documentado: %A deudor, %V acreedor, el grupo testigo. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A firmó el fail y el transfer sin levantar el bolígrafo. El chat lo vio entero y no hace falta replay, patético.',
  '%A vs %V: el ladrón pagó la cena de los dos y la propina. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A salió a por el aura de %V y regaló la ruta de la suya. El chat lo vio entero y no hace falta replay, basura.',
  '%A el karma cobró al contado: %V no rechazó el ingreso. El chat lo vio entero y no hace falta replay, desperdicio.',
  'Desastre: %A en rojo por ambición, %V en verde por existir como objetivo. El chat lo vio entero y no hace falta replay, asco.',
  '%A puso la mano para sacar y el sistema registró un ingreso a %V. El chat lo vio entero y no hace falta replay, cutre.',
  '%A vs %V en modo donación involuntaria con público de pie. El chat lo vio entero y no hace falta replay, pringado.',
  '%A el atraco perfecto al revés: no se puede fallar más completo. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A perdió el robo y el saldo en el mismo ticket. El chat lo vio entero y no hace falta replay, joder.',
  'Desastre de manual con %A en la línea del cargo. El chat lo vio entero y no hace falta replay, mierda.',
  '%A firmó la factura del intento: beneficiario %V. El chat lo vio entero y no hace falta replay, coño.',
  '%A vs %V terminó con el ranking haciendo justicia poética. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A salió a cazar y volvió como trofeo de %V en el chat. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A el plan se le giró y le cobró cada grado del giro. El chat lo vio entero y no hace falta replay, patético.',
  'Desastre documentado: el aura de %A emigró con destino %V. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A intentó quitar y el universo usó la función sumar en la otra cuenta. El chat lo vio entero y no hace falta replay, basura.',
  '%A vs %V: una línea de acta — %A pagó. Y el grupo no necesita que se lo expliquen dos veces, desperdicio.',
  '%A el atraco fue un transfer con coreografía innecesaria. El chat lo vio entero y no hace falta replay, asco.',
  '%A sin aura nueva: sin aura vieja completa: %V con el día resuelto. El chat lo vio entero y no hace falta replay, cutre.',
  'Desastre total de %A a la vista de todos sin filtro. El chat lo vio entero y no hace falta replay, pringado.',
  '%A puso el robo en marcha y la marcha era atrás: %V recibió igual. El chat lo vio entero y no hace falta replay, fracasado.',
  '%A vs %V en una frase: el intento costó aura a quien lo empezó. El chat lo vio entero y no hace falta replay, joder.',
  '%A el fail con intereses de demora: intereses a nombre de %V. El chat lo vio entero y no hace falta replay, mierda.',
  '%A sin el plan original: con el cargo original: %V con el aura. El chat lo vio entero y no hace falta replay, coño.',
  'Desastre: %A más pobre por querer ser más rico a costa de %V. El chat lo vio entero y no hace falta replay, cabrón.',
  '%A intentó el golpe y el golpe le hizo de cajero a favor de %V. El chat lo vio entero y no hace falta replay, gilipollas.',
  '%A vs %V terminó con transfer y sin una sola línea de gloria para %A. El chat lo vio entero y no hace falta replay, patético.',
  '%A el bumerán volvió cobrando y no aceptó devolución. El chat lo vio entero y no hace falta replay, ridículo.',
  '%A perdió el duelo del atraco y el del contador: %V sin guantes. El chat lo vio entero y no hace falta replay, basura.',
  'Desastre de manual: %A en el parte como el que paga. El chat lo vio entero y no hace falta replay, desperdicio.',
  '%A firmó el cargo con la misma firma del intento de robo. El chat lo vio entero y no hace falta replay, asco.',
  '%A vs %V: ranking a la baja para %A, al alza para %V, sin debate. El chat lo vio entero y no hace falta replay, cutre.',
  '%A salió a por todo y volvió con menos de todo: definición corta de desastre. El chat lo vio entero y no hace falta replay, pringado.',
  '%A el peaje del fail se cobró solo: %V fue el cajero que no pidió el puesto. El chat lo vio entero y no hace falta replay, fracasado.',
  'Desastre documentado a favor de %V con autor intelectual %A en negrita. El chat lo vio entero y no hace falta replay, joder.'
];


// Success chance based on role tiers and aura gap.
// Ranges ~25%–72%: enough variance that no one farms safely.
function calcChance(aO, aA, vO, vA, auraA, auraV) {
  // Las cifras viven en economia.js con el resto de la escala: tenerlas aqui a
  // pelo es como el duelo se quedo tres versiones atras sin que nadie lo viera.
  let base = aO ? ROBO_BASE.owner : aA ? ROBO_BASE.admin : ROBO_BASE.miembro;
  if (vO && !aO) base -= 0.14;
  else if (vA && !aA && !aO) base -= 0.07;
  // Cada 50 de diferencia mueve ±2%, con tope de ±10%. El divisor va con la
  // escala nueva (antes 500, cuando el arranque era 1000): si no, la brecha
  // entre dos jugadores nunca llegaría a mover la aguja.
  const diff = auraA - auraV;
  const shift = Math.sign(diff) * Math.min(Math.abs(diff / 50), 5) * 0.02;
  return Math.min(ROBO_LIMITES.techo, Math.max(ROBO_LIMITES.suelo + 0.05, base + shift));
}

// Desenlaces del robo. Antes solo había dos (te llevas todo / pierdes la mitad),
// así que el comando era una moneda al aire con texto bonito. Ahora el dado
// decide TAMBIÉN cuánto, y hay dos extremos que cambian la historia: el golpe
// maestro se lleva casi el doble, y el desastre le regala tu aura a la víctima.
//
// `mult` se aplica sobre lo apostado. Positivo: pasa de la víctima al ladrón.
// Negativo: sale del ladrón (y en el desastre, entra a la víctima).
const DESENLACES = {
  maestro:  { peso: 0.12, mult:  1.8, titulo: '*GOLPE MAESTRO*' },
  limpio:   { peso: 0.55, mult:  1.0, titulo: '*ROBO EXITOSO*' },
  parcial:  { peso: 0.33, mult:  0.4, titulo: '*ROBO A MEDIAS*' },
  fallo:    { peso: 0.70, mult: -0.5, titulo: '*ROBO FALLIDO*' },
  desastre: { peso: 0.30, mult: -1.0, titulo: '*DESASTRE TOTAL*' },
};

// Cada desenlace tiene su propio pool: el texto de un golpe maestro no puede
// ser el mismo que el de un robo justito, y el de un desastre (donde la víctima
// COBRA) desentonaba del todo mezclado con los de fallo normal.
// Ordenados de mas duro a mas suave al cargar: el bot abre con lo peor de cada
// desenlace y guarda lo tibio para cuando se le agote el arsenal.
const POOL_MAESTRO  = ordenarPorDureza(ROB_MAESTRO);
const POOL_WIN      = ordenarPorDureza(ROB_WIN);
const POOL_PARCIAL  = ordenarPorDureza(ROB_PARCIAL);
const POOL_FAIL     = ordenarPorDureza(ROB_FAIL);
const POOL_DESASTRE = ordenarPorDureza(ROB_DESASTRE);

const FRASES_POR_DESENLACE = {
  maestro:  () => POOL_MAESTRO,
  limpio:   () => POOL_WIN,
  parcial:  () => POOL_PARCIAL,
  fallo:    () => POOL_FAIL,
  desastre: () => POOL_DESASTRE,
};

// ── Dinámicas del robo ───────────────────────────────────────────────────────
//
// Sin esto, robar era una tirada plana: la misma probabilidad siempre, sin
// decisiones ni consecuencias. Cuatro reglas le dan cuerpo, y todas se cuentan
// al jugador en el propio mensaje para que sepa por qué le salió como le salió.
//
//  1. AMBICIÓN. Apostar fuerte baja la probabilidad. Antes daba exactamente
//     igual pedir 5 que pedir el máximo, así que todo el mundo pedía el máximo
//     y no había ninguna decisión que tomar.
//  2. ESCUDO DE LA VÍCTIMA. El cooldown era solo del atacante, así que cinco
//     personas distintas podían vaciar al mismo en un minuto y ese no podía
//     hacer nada. Tras un robo con éxito queda protegido un rato.
//  3. GUARDIA. Insistir contra la misma víctima baja tu probabilidad: la
//     segunda vez ya te está esperando. Corta el farmeo sobre el mismo pringado.
//  4. VENGANZA. Si te robaron hace poco, devolver el golpe a ESE tiene un plus.
const ESCUDO_MS = 7 * 60 * 1000;    // protección de la víctima tras ser robada
const GUARDIA_MS = 30 * 60 * 1000;  // ventana en la que se recuerda a quién atacaste
const VENGANZA_MS = 30 * 60 * 1000; // ventana para devolver el golpe con plus

const FAMA_MS = 75 * 60 * 1000;     // cuanto se te recuerda un robo que salio bien

const robadoHasta = new Map();  // `${grupo}|${victima}` -> ts en que se le puede volver a robar
const ultimoAtaque = new Map(); // `${grupo}|${ladron}|${victima}` -> { ts, veces }
const ultimoRobado = new Map(); // `${grupo}|${victima}` -> { por, ts }
const fama = new Map();         // `${grupo}|${ladron}` -> [ts, ts, ...] robos con exito

function limpiaMapa(m) {
  if (m.size >= 3000) m.delete(m.keys().next().value);
}

// Robos con exito del ladron en la ventana de fama, contra CUALQUIER victima.
// Se poda al consultar, asi que la lista no crece sola.
function rachaDe(grupo, ladron) {
  const k = `${grupo}|${ladron}`;
  const previos = fama.get(k);
  if (!previos) return 0;
  const corte = Date.now() - FAMA_MS;
  const vivos = previos.filter(ts => ts > corte);
  if (vivos.length) fama.set(k, vivos); else fama.delete(k);
  return vivos.length;
}

function anotarFama(grupo, ladron) {
  const k = `${grupo}|${ladron}`;
  const corte = Date.now() - FAMA_MS;
  const vivos = (fama.get(k) || []).filter(ts => ts > corte);
  vivos.push(Date.now());
  limpiaMapa(fama);
  fama.set(k, vivos);
}

// Ajusta la probabilidad base con las dinámicas. Devuelve la probabilidad final
// y los motivos, para poder explicárselos al jugador.
// Fraccion del tope que se ha pedido, en [0,1]. Es la palanca de todo lo que
// depende de "cuanto has pedido".
function fraccionPedida(stake, maxStake) {
  if (!(maxStake > 0)) return 0;
  return Math.min(1, Math.max(0, stake / maxStake));
}

// Castigo por la cifra elegida. Cuadratico por los DOS lados: hay un punto
// dulce en mitad de la horquilla y las dos orillas cuestan.
//
// Antes solo castigaba por arriba, asi que la jugada optima era pedir siempre
// el minimo — maxima probabilidad y botin de risa. Eso no es elegir: es que
// haya una sola respuesta correcta. Con las dos orillas penalizadas hay que
// decidir de verdad cuanto arriesgar.
function castigoPorCifra(a) {
  const { puntoDulce: pd, codiciaMax, miseriaMax } = RIESGO;
  if (a > pd) {
    const x = (a - pd) / (1 - pd);
    return { castigo: x * x * codiciaMax, etiqueta: 'codicia' };
  }
  const x = (pd - a) / pd;
  return { castigo: x * x * miseriaMax, etiqueta: 'sin agallas' };
}

function ajustarProbabilidad(base, { grupo, ladron, victima, stake, maxStake, esOwner = false }) {
  let p = base;
  const motivos = [];
  const a = fraccionPedida(stake, maxStake);

  // 1. La cifra elegida. El owner queda fuera: robe lo que robe, la cantidad no
  //    le penaliza.
  if (!esOwner && maxStake > 0) {
    const { castigo, etiqueta } = castigoPorCifra(a);
    if (castigo > 0.02) {
      p -= castigo;
      motivos.push(`${etiqueta} (−${Math.round(castigo * 100)}%)`);
    }
  }

  // 2. Guardia: cada intento previo reciente sobre la MISMA víctima resta 8%,
  //    hasta un tope de -24%.
  const kAtaque = `${grupo}|${ladron}|${victima}`;
  const prev = ultimoAtaque.get(kAtaque);
  if (!esOwner && prev && Date.now() - prev.ts < GUARDIA_MS && prev.veces > 0) {
    const castigo = Math.min(prev.veces, 3) * 0.08;
    p -= castigo;
    motivos.push(`ya te vio venir (−${Math.round(castigo * 100)}%)`);
  }

  // 3. Venganza: +12% si le devuelves el golpe a quien te robó hace poco.
  const kRobado = `${grupo}|${ladron}`;
  const mio = ultimoRobado.get(kRobado);
  if (mio && mio.por === victima && Date.now() - mio.ts < VENGANZA_MS) {
    p += 0.12;
    motivos.push('venganza (+12%)');
  }

  // 4. FAMA. Dinamica nueva. Cada robo TUYO que haya salido bien en la ultima
  //    hora larga te resta, robes a quien robes.
  //
  //    La guardia solo cubre a la misma victima, asi que bastaba con ir rotando
  //    entre cinco personas para farmear sin penalizacion ninguna. Esto cierra
  //    esa puerta: al que la lia mucho y seguido lo tiene el grupo fichado, y
  //    ademas obliga a parar y dejar enfriar, que es cuando el comando se pone
  //    interesante para el resto.
  const racha = rachaDe(grupo, ladron);
  if (!esOwner && racha > 0) {
    const castigo = Math.min(racha, 3) * 0.09;
    p -= castigo;
    motivos.push(`te tienen fichado (−${Math.round(castigo * 100)}%)`);
  }

  // El owner nunca baja del suelo suyo, elija la cifra que elija. Para el resto,
  // el suelo garantiza que un robo NUNCA sea imposible por muchos castigos que
  // se acumulen: sigue siendo un tiro, aunque sea malo.
  const suelo = esOwner ? ROBO_OWNER_MIN : ROBO_LIMITES.suelo;
  const techo = esOwner ? ROBO_LIMITES.techoOwner : ROBO_LIMITES.techo;
  return { p: Math.min(techo, Math.max(suelo, p)), motivos, ambicion: a };
}

// ¿Está la víctima protegida por un robo reciente? Devuelve los minutos que
// quedan, o 0 si se le puede robar.
function escudoRestante(grupo, victima) {
  const hasta = robadoHasta.get(`${grupo}|${victima}`) || 0;
  const queda = hasta - Date.now();
  return queda > 0 ? Math.ceil(queda / 60000) : 0;
}

function anotarIntento(grupo, ladron, victima) {
  const k = `${grupo}|${ladron}|${victima}`;
  const prev = ultimoAtaque.get(k);
  const veces = prev && Date.now() - prev.ts < GUARDIA_MS ? prev.veces + 1 : 1;
  limpiaMapa(ultimoAtaque);
  ultimoAtaque.set(k, { ts: Date.now(), veces });
}

function anotarRoboExitoso(grupo, ladron, victima) {
  limpiaMapa(robadoHasta);
  robadoHasta.set(`${grupo}|${victima}`, Date.now() + ESCUDO_MS);
  limpiaMapa(ultimoRobado);
  ultimoRobado.set(`${grupo}|${victima}`, { por: ladron, ts: Date.now() });
}

// Ir A LO GRANDE no solo baja la probabilidad: cambia la FORMA del resultado.
//
// Segunda dinamica nueva. Cuando se pide el 85 % del tope o mas, los desenlaces
// se corren hacia los dos extremos: sale el golpe maestro mucho mas a menudo, y
// cuando sale mal, sale mal de verdad. Un robo prudente casi siempre acaba en
// algo tibio (limpio o a medias); uno a lo bestia acaba en historia, para bien
// o para mal.
//
// Sin esto, arriesgar solo tenia contras: menos probabilidad a cambio de una
// cifra algo mayor. Ahora arriesgar compra ademas la posibilidad del golpe
// gordo, que es lo que hace que valga la pena pensarselo.
const PESOS_ALL_IN = {
  maestro: 3.0, limpio: 0.9, parcial: 0.4,   // si sale bien, sale muy bien
  fallo: 0.8, desastre: 1.3,                 // si sale mal, duele
};

function elegirDesenlace(exito, ambicion = 0) {
  const ramas = exito ? ['maestro', 'limpio', 'parcial'] : ['fallo', 'desastre'];
  const allIn = ambicion >= RIESGO.allIn;
  const peso = (k) => DESENLACES[k].peso * (allIn ? PESOS_ALL_IN[k] : 1);
  const total = ramas.reduce((a, k) => a + peso(k), 0);
  let r = Math.random() * total;
  for (const k of ramas) {
    r -= peso(k);
    if (r <= 0) return k;
  }
  return ramas[ramas.length - 1];
}

// ═══ LAS DINÁMICAS NUEVAS ════════════════════════════════════════════════════
//
// Todas comparten el mismo criterio: dan una DECISIÓN. Antes robar era escribir
// el comando y esperar; ahora hay que elegir si comprar, si asaltar, si
// contraatacar y a quién ir. El azar sigue mandando, pero ya no es lo único.

const fraseCon = (pool, clave, subs) => {
  let t = pickFresh(pool, clave);
  for (const [k, v] of Object.entries(subs)) t = t.replace(new RegExp(k, 'g'), v);
  return t;
};
const tag = (j) => `@${String(j).split('@')[0]}`;

// "3h 20min" en vez de "12000000 ms". Se redondea hacia arriba: decirle a
// alguien que le quedan 0 minutos cuando aun esta protegido es mentir.
function restanteEnTexto(ms) {
  const min = Math.ceil(ms / 60000);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

// ─── !robo bote ──────────────────────────────────────────────────────────────
async function verElBote(sock, msg, jid) {
  const bote = await tienda.verBote(jid);
  if (bote < BOTE.minimoParaAsaltar) {
    return sock.sendMessage(jid, {
      text: `${pickFresh(RX.BOTE_VACIO, `${jid}|bote|vacio`)}\n\n_Hay *${fmt(bote)}*. Desde *${fmt(BOTE.minimoParaAsaltar)}* se puede asaltar con *!robo asalto*._`,
    }, { quoted: msg });
  }
  return sock.sendMessage(jid, {
    text: `*EL BOTE DEL GRUPO*\n╾━━━━━━━━━━━━━━╼\n\n` +
      `Hay *${fmt(bote)}* de aura ahí dentro.\n` +
      `Lo han puesto todos los que fallaron robando.\n\n` +
      `_*!robo asalto* — cuesta ${fmt(BOTE.entrada)} y sale bien ${Math.round(BOTE.probabilidad * 100)} de cada 100 veces. El que acierta se lo lleva ENTERO._`,
  }, { quoted: msg });
}

// ─── !robo asalto ────────────────────────────────────────────────────────────
async function asaltarBote(sock, msg, jid, sender, groupMeta) {
  const bote = await tienda.verBote(jid);
  if (bote < BOTE.minimoParaAsaltar) {
    return sock.sendMessage(jid, {
      text: `${pickFresh(RX.BOTE_VACIO, `${jid}|bote|vacio`)}\n_Hay ${fmt(bote)}; hacen falta ${fmt(BOTE.minimoParaAsaltar)}._`,
    }, { quoted: msg });
  }

  const saldo = await getAura(jid, sender);
  if (saldo < BOTE.entrada) {
    return sock.sendMessage(jid, {
      text: `La entrada son *${fmt(BOTE.entrada)}* y tienes *${fmt(saldo)}*. El bote no fía.`,
    }, { quoted: msg });
  }

  // El cooldown del robo normal también vale aquí: si no, asaltar el bote sería
  // la vía para saltárselo y el comando se convertiría en una tragaperras.
  const coolKey = `${jid}|${canonicalJid(sender)}`;
  const queda = ROB_COOLDOWN_MS - (Date.now() - (lastRob.get(coolKey) || 0));
  if (queda > 0) {
    return sock.sendMessage(jid, { text: `Espera *${Math.ceil(queda / 60000)}min*.` }, { quoted: msg });
  }
  limpiaMapa(lastRob);
  lastRob.set(coolKey, Date.now());

  await addAura(jid, sender, -BOTE.entrada);
  const a = tag(sender);

  // El owner revienta el bote siempre. Mismo criterio que el resto de sus
  // amaños en este comando, y aquí ni siquiera hay porcentaje que enseñar.
  const revienta = isMainOwner(sender, msg.key.fromMe, groupMeta)
    ? true
    : Math.random() < BOTE.probabilidad;

  if (!revienta) {
    // La entrada engorda el bote MENOS la comisión, que se destruye. Si entrara
    // entera, el asalto no drenaría nada: todo lo que se mete acaba saliendo en
    // el siguiente reventón, y el robo dejaría de ser el sumidero del sistema.
    const ahora = await tienda.aportarAlBote(jid, BOTE.entrada * (1 - BOTE.comision));
    return sock.sendMessage(jid, {
      text: `*ASALTO FALLIDO*\n\n${fraseCon(RX.BOTE_FALLA, `${jid}|bote|falla`, { '%A': a })}\n\n_El bote sube a *${fmt(ahora)}*._`,
      mentions: [sender],
    }, { quoted: msg });
  }

  const premio = await tienda.vaciarBote(jid);
  const { current } = await addAura(jid, sender, premio);
  await tienda.anotarGolpe(jid, sender, premio);
  return sock.sendMessage(jid, {
    text: `*BOTE REVENTADO*\n╾━━━━━━━━━━━━━━╼\n\n` +
      `${fraseCon(RX.BOTE_REVIENTA, `${jid}|bote|revienta`, { '%A': a, '%C': fmt(premio) })}\n\n` +
      `${a} +${fmt(premio)} → *${fmt(current)}* de aura`,
    mentions: [sender],
  }, { quoted: msg });
}

// ─── !robo tienda / !robo comprar <objeto> ───────────────────────────────────
async function laTienda(sock, msg, jid, sender, args, groupMeta) {
  const que = (args[1] || '').toLowerCase();
  const nombre = tag(sender);

  if (!que || !OBJETOS[que]) {
    const lineas = Object.entries(OBJETOS)
      .map(([k, o]) => `*${k}* — ${fmt(o.precio)} · ${o.desc}`)
      .join('\n');

    // Lo que YA llevas encima. Una tienda que no te enseña tu inventario te
    // obliga a comprar a ciegas, y comprar dos escudos seguidos porque no
    // sabias que el primero seguia activo no es una decision, es un timo.
    const mio = await tienda.objetosDe(jid, sender);
    const ahora = Date.now();
    const llevo = [];
    if (mio.escudo > ahora) llevo.push(`escudo — le quedan *${restanteEnTexto(mio.escudo - ahora)}*`);
    if (mio.cebo > ahora)   llevo.push(`cebo — le quedan *${restanteEnTexto(mio.cebo - ahora)}*`);
    if (mio.ganzua > 0)     llevo.push(`ganzúa — *${mio.ganzua}* ${mio.ganzua === 1 ? 'uso' : 'usos'}`);

    return sock.sendMessage(jid, {
      text: `*LA TIENDA DEL LADRÓN*\n╾━━━━━━━━━━━━━━╼\n\n${lineas}\n\n` +
        `*LLEVAS ENCIMA*\n` +
        (llevo.length ? llevo.map(l => `· ${l}`).join('\n') : `_${pickFresh(RX.INVENTARIO_VACIO, `${jid}|inv|vacio`)}_`) +
        `\n\n_Se compra con *!robo comprar <lo que sea>*._`,
      mentions: [sender],
    }, { quoted: msg });
  }

  const obj = OBJETOS[que];
  const saldo = await getAura(jid, sender);
  if (saldo < obj.precio) {
    return sock.sendMessage(jid, {
      text: `${fraseCon(RX.COMPRA_POBRE, `${jid}|compra|pobre`, { '%N': nombre })}\n_Cuesta *${fmt(obj.precio)}*. Tienes *${fmt(saldo)}*._`,
      mentions: [sender],
    }, { quoted: msg });
  }

  await addAura(jid, sender, -obj.precio);
  if (que === 'ganzua') {
    const previos = (await tienda.objetosDe(jid, sender)).ganzua || 0;
    await tienda.darObjeto(jid, sender, 'ganzua', previos + obj.usos);
  } else {
    await tienda.darObjeto(jid, sender, que, Date.now() + obj.horas * 3600000);
  }

  // Cada objeto con su voz. Un mensaje generico para los tres convierte la
  // tienda en un formulario.
  const pool = que === 'escudo' ? RX.COMPRA_ESCUDO
             : que === 'ganzua' ? RX.COMPRA_GANZUA
             : que === 'cebo'   ? RX.COMPRA_CEBO
             : RX.COMPRA_OK;
  return sock.sendMessage(jid, {
    text: `*COMPRA HECHA — ${que.toUpperCase()}*\n\n` +
      `${fraseCon(pool, `${jid}|compra|${que}`, { '%N': nombre, '%C': fmt(obj.precio) })}\n\n_${obj.desc}._`,
    mentions: [sender],
  }, { quoted: msg });
}

// ─── !robo contra ────────────────────────────────────────────────────────────
//
// Solo lo puede usar quien acaba de ser robado, y solo dentro de la ventana.
// Fuera de ella no hay nada que vengar: el aura ya circuló y reabrirlo sería
// convertir cada robo en una cadena infinita.
const pendienteContra = new Map(); // `${grupo}|${victima}` -> { ladron, cuanto, ts }

function anotarParaContra(grupo, victima, ladron, cuanto) {
  limpiaMapa(pendienteContra);
  pendienteContra.set(`${grupo}|${canonicalJid(victima)}`, { ladron: canonicalJid(ladron), cuanto, ts: Date.now() });
}

async function contraatacar(sock, msg, jid, sender, groupMeta) {
  const k = `${jid}|${canonicalJid(sender)}`;
  const p = pendienteContra.get(k);
  const v = tag(sender);

  if (!p || Date.now() - p.ts > CONTRA.ventanaSeg * 1000) {
    pendienteContra.delete(k);
    return sock.sendMessage(jid, {
      text: fraseCon(RX.CONTRA_TARDE, `${jid}|contra|tarde`, { '%A': 'quien te robó' }),
    }, { quoted: msg });
  }
  pendienteContra.delete(k);   // una sola oportunidad, salga como salga

  const a = tag(p.ladron);
  // El escudo NO vale aquí, y es a propósito: protege de que te roben, no de
  // las consecuencias de haber robado tú. Comprarlo y salir de caza sabiendo
  // que nadie puede responderte convertiría 180 de aura en impunidad, que es
  // justo lo contrario de lo que se busca con las dinámicas.
  const botin = Math.round(p.cuanto * CONTRA.multiplicador);
  const gana = isMainOwner(sender, msg.key.fromMe, groupMeta) ? true : Math.random() < CONTRA.probabilidad;

  if (gana) {
    // Se mueve lo que el ladrón pueda cubrir: cobrar de una cuenta vacía
    // dejaría a alguien en negativo por una dinámica opcional.
    const tieneEl = await getAura(jid, p.ladron);
    const real = Math.max(0, Math.min(botin, tieneEl));
    const [vN] = await Promise.all([addAura(jid, sender, real), addAura(jid, p.ladron, -real)]);
    await tienda.anotarGolpe(jid, sender, real);
    return sock.sendMessage(jid, {
      text: `*CONTRAATAQUE*\n╾━━━━━━━━━━━━━━╼\n\n` +
        `${fraseCon(RX.CONTRA_GANA, `${jid}|contra|gana`, { '%A': a, '%V': v, '%C': fmt(real) })}\n\n` +
        `${v} +${fmt(real)} → *${fmt(vN.current)}*`,
      mentions: [sender, p.ladron],
    }, { quoted: msg });
  }

  const castigo = Math.min(p.cuanto, Math.max(0, await getAura(jid, sender)));
  const [vN] = await Promise.all([addAura(jid, sender, -castigo), addAura(jid, p.ladron, castigo)]);
  return sock.sendMessage(jid, {
    text: `*CONTRAATAQUE FALLIDO*\n\n` +
      `${fraseCon(RX.CONTRA_PIERDE, `${jid}|contra|pierde`, { '%A': a, '%V': v, '%C': fmt(castigo) })}\n\n` +
      `${v} −${fmt(castigo)} → *${fmt(vN.current)}*`,
    mentions: [sender, p.ladron],
  }, { quoted: msg });
}

// ─── !robo top ───────────────────────────────────────────────────────────────
async function topLadrones(sock, msg, jid, groupMeta) {
  const r = (await tienda.rankingLadrones(jid))
    .filter(x => !isMainOwner(x.jid, false, groupMeta))   // el owner no figura
    .slice(0, 10);
  if (!r.length) {
    return sock.sendMessage(jid, {
      text: 'Esta semana no ha robado nadie. Un grupo de gente honrada, o de cobardes.',
    }, { quoted: msg });
  }
  let text = '*LOS MÁS BUSCADOS*\n_Últimos 7 días_\n╾━━━━━━━━━━━━━━╼\n\n';
  r.forEach((x, i) => {
    const corona = i === 0 ? ' — *con diana en la espalda*' : '';
    text += `*${i + 1}.* ${tag(x.jid)} — ${fmt(x.total)} en ${x.golpes} ${x.golpes === 1 ? 'golpe' : 'golpes'}${corona}\n`;
  });
  text += `\n_Robarle al número uno paga un ${Math.round(DIANA.bonoBotin * 100)}% más._`;
  return sock.sendMessage(jid, { text: text.trimEnd(), mentions: r.map(x => x.jid) }, { quoted: msg });
}

async function cmdRobo(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Los robos solo ocurren en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);

  // Subcomandos. Van antes de exigir victima porque ninguno la necesita.
  const sub = (args && args[0] ? String(args[0]) : '').toLowerCase();
  if (['bote', 'caja', 'hucha'].includes(sub))            return verElBote(sock, msg, jid);
  if (['asalto', 'asaltar', 'reventar'].includes(sub))    return asaltarBote(sock, msg, jid, sender, groupMeta);
  if (['tienda', 'shop', 'comprar'].includes(sub))        return laTienda(sock, msg, jid, sender, args, groupMeta);
  if (['contra', 'contraataque', 'venganza'].includes(sub)) return contraatacar(sock, msg, jid, sender, groupMeta);
  if (['top', 'ranking', 'buscados'].includes(sub))       return topLadrones(sock, msg, jid, groupMeta);

  const target = getTarget(msg);

  if (!target) return; // sin victima no hay robo
  if (sameUser(target, sender)) {
    return sock.sendMessage(jid, { text: 'No puedes robarte a ti mismo.' }, { quoted: msg });
  }

  // Cooldown: 10 min per attacker per group
  const coolKey = `${jid}|${canonicalJid(sender)}`;
  const last = lastRob.get(coolKey) || 0;
  const remaining = ROB_COOLDOWN_MS - (Date.now() - last);
  if (remaining > 0) {
    const mins = Math.ceil(remaining / 60_000);
    return sock.sendMessage(jid, {
      text: `Espera *${mins}min* antes de volver a robar.`,
    }, { quoted: msg });
  }

  // Escudo de la víctima: si acaban de robarle, está protegida un rato. Esto va
  // ANTES de reclamar el cooldown para que intentarlo contra alguien protegido
  // no te queme tus 10 minutos.
  // Escudo COMPRADO: va antes que el natural porque es el que alguien ha pagado
  // y merece un mensaje propio. Tampoco quema el cooldown del que lo intenta.
  if (await tienda.tieneEscudo(jid, target)) {
    return sock.sendMessage(jid, {
      text: fraseCon(RX.ESCUDO_SALVA, `${jid}|escudo`, { '%A': tag(sender), '%V': tag(target) }),
      mentions: [sender, target],
    }, { quoted: msg });
  }

  const escudo = escudoRestante(jid, canonicalJid(target));
  if (escudo > 0) {
    return sock.sendMessage(jid, {
      text: `@${target.split('@')[0]} acaba de ser robado y todavía está en guardia. Vuelve en *${escudo}min*.`,
      mentions: [target],
    }, { quoted: msg });
  }

  // Claim the cooldown synchronously, BEFORE any await, so two concurrent !robo
  // can't both pass the check above and steal twice. Refunded on the paths below
  // where no robbery actually happens, so a failed attempt doesn't burn 10 min.
  if (lastRob.size >= 2000) lastRob.delete(lastRob.keys().next().value);
  lastRob.set(coolKey, Date.now());

  const [auraA, auraV] = await Promise.all([
    getAura(jid, sender),
    getAura(jid, target),
  ]);

  if (auraA < MIN_AURA) {
    lastRob.delete(coolKey); // no robó: devuelve el cooldown
    return sock.sendMessage(jid, {
      text: `Necesitas al menos ${MIN_AURA} de aura para intentar un robo.`,
    }, { quoted: msg });
  }
  if (auraV <= 0) {
    lastRob.delete(coolKey); // no robó: devuelve el cooldown
    return sock.sendMessage(jid, {
      text: `@${target.split('@')[0]} no tiene aura que robar.`,
      mentions: [target],
    }, { quoted: msg });
  }

  // Cuanto se apuesta.
  //
  // Con cifra: la que se pida. Sin cifra: una AL AZAR ajustada a lo que tenga la
  // victima, no un valor fijo. Antes salía siempre 20, y contra alguien con
  // 3.000 de aura eso era un robo de propina que no arriesgaba ni interesaba a
  // nadie; contra alguien con 60, en cambio, era la mitad de su cuenta.
  //
  // Al azar entre el suelo y el tope, que ya está calculado sobre el saldo real
  // de los dos. Así !robo a secas sigue siendo una jugada de verdad: unas veces
  // toca una cifra cómoda y otras una que te va a costar sacar, con la
  // probabilidad que corresponda a cada una.
  // Cebo: la victima aparenta el doble. El tope se calcula sobre lo aparentado,
  // asi que el ladron pide mas de lo que hay y se come el castigo por codicia
  // para nada — el botin real sigue limitado por lo que tiene DE VERDAD.
  const conCebo = await tienda.tieneCebo(jid, target);
  const auraAparente = conCebo ? auraV * 2 : auraV;
  const maxStake = topeRobo(auraA, auraAparente);
  const pedido = (args || []).find(a => /^\d+$/.test(a));
  const raw = pedido
    ? parseInt(pedido, 10)
    : ROBO.suelo + Math.floor(Math.random() * (Math.max(0, maxStake - ROBO.suelo) + 1));
  const stake = Math.max(Math.min(ROBO.suelo, maxStake), Math.min(raw, maxStake));
  // Solo se avisa de recorte cuando el jugador PIDIO una cifra y no cabia. Si la
  // eligio el bot, no hay nada que explicar: ya salio dentro del tope.
  const recortado = Boolean(pedido) && raw > maxStake;

  const participants = groupMeta?.participants || [];
  const aO = isOwner(sender, msg.key.fromMe, groupMeta);
  const aA = !aO && isAdmin(participants, sender);
  const vO = isOwner(target, false, groupMeta);
  const vA = !vO && isAdmin(participants, target);

  // Probabilidad base por roles y brecha de aura, ajustada por las dinámicas
  // (ambición, guardia y venganza). El intento se anota SIEMPRE, salga como
  // salga: insistir contra la misma víctima tiene que penalizar aunque falles.
  const ladronEsOwner = isMainOwner(sender, msg.key.fromMe, groupMeta);
  const base = calcChance(aO, aA, vO, vA, auraA, auraV);
  const { p: chance, motivos, ambicion } = ajustarProbabilidad(base, {
    grupo: jid,
    ladron: canonicalJid(sender),
    victima: canonicalJid(target),
    stake,
    maxStake,
    esOwner: ladronEsOwner,
  });
  // Ganzua comprada: se gasta SIEMPRE que se tenga, salga bien o mal. Si solo
  // se gastara al acertar seria una compra sin riesgo y dejaria de ser decision.
  let chanceFinal = chance;
  const usoGanzua = await tienda.gastarGanzua(jid, sender);
  if (usoGanzua) {
    chanceFinal = Math.min(ROBO_LIMITES.techo, chanceFinal + OBJETOS.ganzua.bono);
    motivos.push(fraseCon(RX.GANZUA_USADA, `${jid}|ganzua`, { '%A': tag(sender) }));
  }

  // Diana: el nº1 de la semana esta mas en guardia pero paga mas. El bono de
  // botin se aplica abajo, sobre el monto.
  const buscado = await tienda.masBuscado(jid);
  const esDiana = Boolean(buscado && canonicalJid(target) === buscado.jid);
  if (esDiana) {
    chanceFinal = Math.max(ROBO_LIMITES.suelo, chanceFinal + DIANA.bonoProbabilidad);
    motivos.push('el más buscado va con la mosca detrás de la oreja');
  }

  anotarIntento(jid, canonicalJid(sender), canonicalJid(target));
  let success = Math.random() < chanceFinal;

  // ─── El porcentaje que se ENSEÑA ───────────────────────────────────────────
  //
  // El mensaje imprime la probabilidad, y ahi estaba el problema: al owner le
  // salia un 78 % mientras al resto del grupo le salia entre 24 y 38. No hacia
  // falta sospechar nada, estaba escrito en cada robo, uno debajo del otro.
  //
  // Lo que se enseña es la probabilidad que TENDRIA si no fuera owner: se
  // recalcula desde la base de un miembro y con las mismas dinamicas. Asi no es
  // un numero inventado al azar sino uno coherente — sube y baja con la cifra
  // que pide, igual que el de cualquiera — y encaja con lo que el grupo ve.
  //
  // Por dentro no cambia nada: `chance` es lo que decide el resultado.
  const chanceVisible = ladronEsOwner
    ? ajustarProbabilidad(calcChance(false, false, vO, vA, auraA, auraV), {
        grupo: jid,
        ladron: canonicalJid(sender),
        victima: canonicalJid(target),
        stake,
        maxStake,
        esOwner: false,
      }).p
    : chanceFinal;

  // Rig a favor del owner principal:
  // · si la VÍCTIMA es el owner, el robo SIEMPRE falla (no pierde aura; el
  //   atacante igual paga la penalización normal por la vía de fallo).
  // · si el ATACANTE es el owner, el robo SIEMPRE tiene éxito.
  //
  // Esto llegó a estar rebajado a un suelo del 78 % por una lectura mía de "más
  // del 70 % de probabilidades": lo entendí como una cifra a fijar cuando era
  // un mínimo, y cien por cien también lo cumple. Rebajar un rig del owner no es
  // una decisión que me toque tomar sola. Restaurado.
  //
  // ROBO_OWNER_MIN se queda igualmente: sostiene la probabilidad que se ANUNCIA
  // en el mensaje, que si no saldría baja mientras el resultado sale siempre
  // bueno — y esa contradicción sí cantaría.
  if (isMainOwner(target, false, groupMeta)) success = false;
  else if (isMainOwner(sender, msg.key.fromMe, groupMeta)) success = true;

  const aTag = `@${sender.split('@')[0]}`;
  const vTag = `@${target.split('@')[0]}`;

  // Cooldown was already claimed above (before the awaits) to close the
  // double-rob race; it stays set here whether the roll wins or loses.

  // El dado decide ADEMÁS cuánto se mueve, no solo si sale o no. De ahí que un
  // robo ya no sea una moneda al aire: puede salir redondo, salir a medias, o
  // salir tan mal que acabas financiando a tu víctima.
  const clave = elegirDesenlace(success, ambicion);
  const { mult, titulo } = DESENLACES[clave];
  // Nunca se mueve más aura de la que la víctima tiene ni de la que el ladrón
  // puede pagar: un golpe maestro sobre alguien con poco no le deja en negativo.
  const bruto = Math.max(1, Math.round(stake * Math.abs(mult)));
  let monto = mult > 0 ? Math.min(bruto, auraV) : Math.min(bruto, auraA);

  // Lo que movió la balanza se cuenta abajo del mensaje: si no, el jugador ve
  // resultados distintos sin entender por qué y parece que el bot va al azar.
  // Si pidio mas de lo permitido tambien se dice: el tope depende del aura de
  // la victima y sin avisar parece que el bot ignora lo que le pides.
  // La horquilla se enseña SIEMPRE, no solo al pasarse. Se podía elegir cuánto
  // robar desde hacía tiempo, pero el bot solo lo mencionaba cuando recortaba,
  // así que quien nunca pedía de más no llegaba a enterarse de que la cifra era
  // suya. Enseñar el rango en cada robo lo cuenta sin explicar nada.
  // La nota dice DOS cosas y las dice sin ambigüedad: cuánto se apostó y qué
  // probabilidad tenía. La versión anterior decía "Pediste 52; contra @V el tope
  // es 18" y sonaba a reproche al que escribió el comando, además de no explicar
  // nada útil. Ahora solo aparece un recorte cuando de verdad lo hubo, y se dice
  // POR QUÉ (la víctima no tenía tanto), no como una regla del bot.
  const notaTope = recortado
    ? `\n_Ibas a por ${fmt(raw)}, pero ${vTag} solo tenía ${fmt(maxStake)}._`
    : '';
  const notaApuesta = `\n_Apostaste ${fmt(stake)} · ${Math.round(chanceVisible * 100)}% de salir bien._`;
  const notaDinamicas = notaApuesta + notaTope + (motivos.length ? `\n_${motivos.join(' · ')}_` : '');

  if (mult > 0) {
    anotarRoboExitoso(jid, canonicalJid(sender), canonicalJid(target));
    anotarFama(jid, canonicalJid(sender));
    // Robar al mas buscado paga mas, pero nunca por encima de lo que tiene.
    if (esDiana) monto = Math.min(auraV, Math.round(monto * (1 + DIANA.bonoBotin)));
    if (conCebo && monto < stake) motivos.push('picaste el cebo: no tenía tanto');
    await tienda.anotarGolpe(jid, sender, monto);
    // La victima tiene una ventana para devolver el golpe.
    anotarParaContra(jid, target, sender, monto);
    const [aNew, vNew] = await Promise.all([
      addAura(jid, sender, +monto),
      addAura(jid, target, -monto),
    ]);
    const phrase = pickFresh(FRASES_POR_DESENLACE[clave](), `${jid}|robo|${clave}`).replace(/%A/g, aTag).replace(/%V/g, vTag);
    const extra =
      clave === 'maestro' ? '\n_Golpe maestro: se llevó bastante más de lo que iba a por._'
    : clave === 'parcial' ? '\n_Lo pillaron a mitad y solo pudo llevarse una parte._'
    : '';
    const text =
      `${titulo}\n` +
      `${aTag} le roba *${fmt(monto)} de aura* a ${vTag}${extra}\n\n` +
      `${phrase}\n\n` +
      `${aTag} +${fmt(monto)} → *${fmt(aNew.current)}*\n` +
      `${vTag} −${fmt(monto)} → *${fmt(vNew.current)}*` +
      notaDinamicas;
    return sock.sendMessage(jid, { text, mentions: [sender, target] });
  }

  // Fallo. En el desastre lo que pierde el ladrón se lo queda la víctima; en el
  // fallo normal solo es una multa y la víctima no toca nada.
  const aNew = await addAura(jid, sender, -monto);
  const vNew = clave === 'desastre' ? await addAura(jid, target, +monto) : null;
  // En el fallo NORMAL la victima no cobra, asi que ese aura salia del sistema.
  // Ahora una parte cae al bote del grupo: los fracasos dejan de evaporarse y
  // se convierten en algo que todos miran crecer.
  let boteAhora = 0;
  if (clave !== 'desastre') boteAhora = await tienda.aportarAlBote(jid, monto * BOTE.fraccionDeFallo);
  const phrase = pickFresh(FRASES_POR_DESENLACE[clave](), `${jid}|robo|${clave}`).replace(/%A/g, aTag).replace(/%V/g, vTag);
  const text =
    `${titulo}\n` +
    `${aTag} intentó robarle a ${vTag} y le salió al revés\n` +
    (clave === 'desastre'
      ? `_Se le cayó todo encima: ${vTag} se queda con lo que traía._\n\n`
      : `\n`) +
    `${phrase}\n\n` +
    `${aTag} −${fmt(monto)} → *${fmt(aNew.current)}*\n` +
    (vNew
      ? `${vTag} +${fmt(monto)} → *${fmt(vNew.current)}*`
      : `${vTag} sin cambios → *${fmt(auraV)}*`) +
    (boteAhora ? `\n_El bote del grupo sube a *${fmt(boteAhora)}*._` : '') +
    notaDinamicas;
  return sock.sendMessage(jid, { text, mentions: [sender, target] });
}

module.exports = { cmdRobo, DESENLACES, elegirDesenlace, ajustarProbabilidad, castigoPorCifra, fraccionPedida, escudoRestante, anotarIntento, anotarRoboExitoso, anotarFama, rachaDe };
