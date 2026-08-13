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
  '%A le roba el aura a %V en plena cara del grupo: limpio, visible y sin anestesia de consuelo, joder.',
  '%A entró a por el aura de %V y salió con ella en el contador; el chat no necesita dibujo ni narrador, mierda.',
  'Robo limpio de %A a %V: el aura cambió de dueño y el ranking lo registró sin debate posible y el contador lo dejó por escrito sin debate, coño.',
  '%A vs %V: gana el que atacó. %V se defendió como se defiende de todo en la vida: mal en el momento más visible del chat, cabrón.',
  '%A vació lo que pudo del aura de %V; suficiente para que se note en el contador y en la cara, gilipollas.',
  'El atraco de %A a %V salió redondo: botín en mano, víctima mirando el hueco del ranking con el parte del comando cerrado a favor del resultado, patético.',
  '%A no pidió permiso a nadie: se llevó el aura de %V y dejó el recibo en este mensaje y sin segunda oportunidad en este mensaje, asco.',
  'Robo a favor de %A: %V pierde aura y la cara a la vez delante de todo el grupo mientras el grupo tomaba nota del movimiento, basura.',
  '%A ejecutó el golpe a %V con la calma de quien ya había contado el botín antes de empezar, ridículo.',
  '%A vs %V terminó con el contador de %A en más y el de %V en menos, sin discusión y el historial del comando queda de testigo, fracasado.',
  '%A le quitó el aura a %V delante de todos; no hubo modo avión que ocultara el cargo delante de todo el hilo y sin posibilidad de borrado, cutre.',
  'El plan de %A funcionó de punta a punta; el aura de %V no. Resultado firmado en el ranking con el ranking como único testigo del cargo, joder.',
  '%A salió a cazar y volvió con el trofeo: el trofeo se llama aura de %V y pesa en el contador, mierda.',
  'Robo limpio y legible: %A cobra, %V paga y el grupo presencia el transfer sin filtro en el momento más visible del chat, coño.',
  '%A no improvisó el final: el aura de %V ya estaba en la lista de la compra. Ahora en su cuenta, cabrón.',
  '%A vs %V: el ladrón ganó el único round que importa. El resto es ruido de la víctima con el parte del comando cerrado a favor del resultado, gilipollas.',
  '%A se llevó el aura de %V con la precisión de quien no falla el momento ni el objetivo y sin segunda oportunidad en este mensaje, patético.',
  'Atraco exitoso al natural: %A sonríe con el botín y %V cuenta lo que ya no tiene mientras el grupo tomaba nota del movimiento, asco.',
  '%A entró, cobró el aura de %V y salió antes de que el drama de %V creciera de más con números que no admiten recurso de apelación, basura.',
  '%A el golpe a %V conectó donde tenía que conectar: el contador actualiza sin pedir confirmación, ridículo.',
  '%A le robó a %V en el timing perfecto: ni antes ni después, ahora, y se nota delante de todo el hilo y sin posibilidad de borrado, fracasado.',
  'Robo a cara descubierta: %A no se escondió y %V no se salvó del cargo en el ranking con el ranking como único testigo del cargo, cutre.',
  '%A vs %V terminó con el botín en el bolsillo correcto del sistema: el de %A y el contador lo dejó por escrito sin debate, joder.',
  '%A dejó a %V mirando el hueco del contador donde antes había aura contada en el momento más visible del chat, mierda.',
  '%A ejecutó el atraco a %V sin pedir aplauso; el contador aplaude por él en números sin que nadie pudiera fingir que no lo vio, coño.',
  'El aura de %V cambió de manos en público: las manos son las de %A y el ranking lo firma con el parte del comando cerrado a favor del resultado, cabrón.',
  '%A no solo intentó el golpe: cobró. %V no solo se defendió: perdió y sin segunda oportunidad en este mensaje, gilipollas.',
  '%A vs %V: crónica breve de un robo que sí se ejecutó y se puede leer en el ranking mientras el grupo tomaba nota del movimiento, patético.',
  '%A se llevó lo suyo de la cuenta de %V: definición operativa de atraco exitoso con números que no admiten recurso de apelación, asco.',
  '%A cazó el aura de %V cuando %V menos lo tenía en la agenda del día y el historial del comando queda de testigo, ridículo.',
  '%A el botín de %V ya no es de %V; el ranking no discute el cargo ni ofrece recurso delante de todo el hilo y sin posibilidad de borrado, fracasado.',
  '%A vs %V terminó 1-0 con el 1 en la columna del que atacó bien y cobró con el ranking como único testigo del cargo, cutre.',
  '%A le dejó a %V el recibo del robo en forma de mensaje de este comando y el contador lo dejó por escrito sin debate, mierda.',
  'Atraco redondo: %A cobra, %V aprende la lección y el chat archiva el resultado en el momento más visible del chat, coño.',
  '%A no falló el timing ni la puntería del golpe; %V falló la defensa del ranking sin que nadie pudiera fingir que no lo vio, cabrón.',
  '%A vs %V: el aura viajó en la dirección que %A había marcado en la lista con el parte del comando cerrado a favor del resultado, gilipollas.',
  '%A se llevó el botín de %V sin pedir la palabra en el grupo ni devolver una unidad y sin segunda oportunidad en este mensaje, patético.',
  'Robo exitoso de %A a costa de %V: visible, medible y archivado en el ranking mientras el grupo tomaba nota del movimiento, asco.',
  '%A ejecutó el golpe con la lista de la compra cerrada: aura de %V, marcada y cobrada con números que no admiten recurso de apelación, basura.',
  '%A el contador de %V bajó; el de %A subió: aritmética del atraco sin poesía y el historial del comando queda de testigo, ridículo.',
  '%A vs %V terminó con %A contando botín y %V restando aura en silencio delante de todo el hilo y sin posibilidad de borrado, fracasado.',
  '%A no dejó el atraco en almost eterno: lo cerró con botín de %V en su cuenta con el ranking como único testigo del cargo, cutre.',
  '%A se llevó el aura de %V en el momento exacto en que el chat miraba el hilo y el contador lo dejó por escrito sin debate, joder.',
  '%A vs %V: gana quien no se quedó mirando el aura propia mientras se la llevaban en el momento más visible del chat, coño.',
  '%A cobró de %V lo que %V no pensaba soltar; el ranking insiste en el cargo sin que nadie pudiera fingir que no lo vio, cabrón.',
  '%A el golpe a %V fue corto, claro y suficiente para mover el contador con el parte del comando cerrado a favor del resultado, gilipollas.',
  '%A entró, tomó el aura de %V y dejó el hueco de recuerdo en el perfil y sin segunda oportunidad en este mensaje, patético.',
  '%A vs %V terminó con el botín en movimiento y destino claro: la cuenta de %A mientras el grupo tomaba nota del movimiento, asco.',
  '%A no pidió suerte de principiante: ejecutó. %V no tuvo defensa suficiente con números que no admiten recurso de apelación, basura.',
  'Atraco a favor de %A: %V en el parte como quien pierde aura en público y el historial del comando queda de testigo, ridículo.',
  '%A se llevó lo marcado de la cuenta de %V sin letra pequeña ni segunda oportunidad delante de todo el hilo y sin posibilidad de borrado, fracasado.',
  '%A el plan contra %V salió como en la pizarra: aura de %V en su columna del ranking con el ranking como único testigo del cargo, cutre.',
  '%A vs %V: el ladrón no solo intentó, cobró y se fue con el botín y el contador lo dejó por escrito sin debate, joder.',
  '%A robó el aura de %V con la calma de un trámite ya resuelto en el sistema en el momento más visible del chat, mierda.',
  'Robo exitoso: %A con el botín, %V con la lección y el grupo con el dato del ranking sin que nadie pudiera fingir que no lo vio, coño.',
  '%A no dejó espacio al drama largo de %V: primero el golpe, luego este mensaje con el parte del comando cerrado a favor del resultado, cabrón.',
  '%A vs %V terminó 1-0 en el único marcador que importa aquí: el del aura y sin segunda oportunidad en este mensaje, gilipollas.',
  '%A cazó a %V en el ranking y el contador firmó el resultado sin pedir segunda opinión mientras el grupo tomaba nota del movimiento, patético.',
  '%A el aura de %V viajó sin billete de vuelta ni posibilidad de reembolso con números que no admiten recurso de apelación, asco.',
  '%A ejecutó el atraco a %V como quien cobra una deuda pendiente con intereses y el historial del comando queda de testigo, basura.',
  '%A vs %V: crónica de un golpe que sí aterrizó en el contador y se puede leer delante de todo el hilo y sin posibilidad de borrado, fracasado.',
  '%A se llevó el botín de %V y el chat no pidió repetición: se vio claro a la primera con el ranking como único testigo del cargo, cutre.',
  '%A el contador no miente en este caso: %V menos, %A más, punto final del parte y el contador lo dejó por escrito sin debate, joder.',
  '%A entró a por el aura de %V y no salió de vacío ni de almost en el momento más visible del chat, mierda.',
  '%A vs %V terminó con el ranking actualizado a favor del atacante sin debate útil sin que nadie pudiera fingir que no lo vio, coño.',
  '%A cobró el aura de %V en el timing que %V no esperaba ni había agendado con el parte del comando cerrado a favor del resultado, cabrón.',
  'Atraco redondo: %A no falló, %V no se salvó y el grupo no dudó del resultado y sin segunda oportunidad en este mensaje, gilipollas.',
  '%A se llevó lo suyo del bolsillo de %V: definición corta y operativa del atraco mientras el grupo tomaba nota del movimiento, patético.',
  '%A el golpe fue suficiente: el aura de %V lo nota y el ranking también lo muestra con números que no admiten recurso de apelación, asco.',
  '%A vs %V: gana %A. El resto es ruido de la defensa que no llegó a tiempo y el historial del comando queda de testigo, basura.',
  '%A robó a %V sin pedir la palabra en el hilo y sin devolver una sola unidad de aura delante de todo el hilo y sin posibilidad de borrado, ridículo.',
  'Robo exitoso de %A: el botín de %V cambió de manos en público y queda firmado con el ranking como único testigo del cargo, fracasado.',
  '%A ejecutó, cobró y dejó a %V con el hueco del contador y este mensaje de recibo y el contador lo dejó por escrito sin debate, cutre.',
  '%A vs %V terminó con el transfer en la dirección correcta para %A y visible para todos en el momento más visible del chat, joder.',
  '%A no improvisó el final del atraco: el aura de %V ya estaba contada a su favor sin que nadie pudiera fingir que no lo vio, mierda.',
  '%A el atraco a %V salió limpio de fallos y lleno de botín ajeno en el contador con el parte del comando cerrado a favor del resultado, coño.',
  '%A se llevó el aura de %V mientras el chat tomaba nota del movimiento en el ranking y sin segunda oportunidad en este mensaje, cabrón.',
  'Robo limpio: %A cobra en silencio de víctima y %V en ruido de queja que no cambia el número, gilipollas.',
  '%A vs %V: el marcador final del aura no admite debate ni recurso de apelación con números que no admiten recurso de apelación, patético.',
  '%A entró a por %V y salió con el contador a favor y el parte cerrado y el historial del comando queda de testigo, asco.',
  '%A vs %V terminó con %A en más y %V en el parte de bajas de aura del día delante de todo el hilo y sin posibilidad de borrado, ridículo.',
  '%A robó el aura de %V con la precisión de quien no necesita segunda oportunidad con el ranking como único testigo del cargo, fracasado.',
  '%A se llevó el botín de %V sin pedir disculpas al contador ni permiso al grupo y el contador lo dejó por escrito sin debate, joder.',
  '%A el plan contra %V funcionó de principio a fin del intento de atraco en el momento más visible del chat, mierda.',
  '%A vs %V: crónica corta de un robo largo para el contador de %V sin que nadie pudiera fingir que no lo vio, coño.',
  '%A cobró de %V lo marcado en la lista; el ranking confirma el cargo sin dudar con el parte del comando cerrado a favor del resultado, cabrón.',
  'Robo exitoso: %A con aura nueva en la cuenta y %V con el hueco documentado y sin segunda oportunidad en este mensaje, gilipollas.',
  '%A ejecutó el atraco a %V en el momento en que más dolía soltar el aura mientras el grupo tomaba nota del movimiento, patético.',
  '%A vs %V terminó 1-0 sin prórroga: el 1 es de %A y el 0 de la defensa con números que no admiten recurso de apelación, asco.',
  '%A se llevó el aura de %V y dejó el recibo colgado en este hilo del chat y el historial del comando queda de testigo, basura.',
  '%A el botín de %V ya tiene dueño nuevo; el ranking lo nombra sin pedir confirmación delante de todo el hilo y sin posibilidad de borrado, ridículo.',
  '%A vs %V: gana quien atacó con el contador a favor y cerró el parte con el ranking como único testigo del cargo, fracasado.',
  '%A robó a %V en plena luz del chat: sin sombra útil que tape el cargo del ranking y el contador lo dejó por escrito sin debate, cutre.',
  'Robo limpio de %A a costa de %V: medible, visible y archivado en el historial en el momento más visible del chat, joder.',
  '%A entró, cobró el aura de %V y salió con el trabajo del atraco hecho sin que nadie pudiera fingir que no lo vio, mierda.',
  '%A el golpe fue corto en segundos y largo en efecto sobre el contador de %V con el parte del comando cerrado a favor del resultado, coño.',
  '%A vs %V terminó con el transfer firmado a favor de %A en el sistema y sin segunda oportunidad en este mensaje, cabrón.',
  '%A no dejó el atraco a medias: cerró con el aura de %V en su cuenta del ranking mientras el grupo tomaba nota del movimiento, gilipollas.',
  '%A se llevó lo que %V no pensaba soltar; el ranking insiste en el cargo sin piedad con números que no admiten recurso de apelación, patético.',
  'Atraco redondo: %A ejecuta, %V paga y el grupo presencia el cambio de dueño y el historial del comando queda de testigo, asco.',
  '%A cobró el aura de %V con la calma de un trámite ya cerrado en el sistema delante de todo el hilo y sin posibilidad de borrado, ridículo.',
  '%A el contador de %V bajó en público; no hay modo avión que oculte el número con el ranking como único testigo del cargo, fracasado.',
  '%A vs %V terminó con %A contando botín y %V contando pérdidas en silencio y el contador lo dejó por escrito sin debate, cutre.',
  '%A robó a %V sin pedir la palabra y sin devolver ni una unidad del botín en el momento más visible del chat, joder.',
  'Robo exitoso de %A: el aura de %V cambió de manos sin letra pequeña ni recurso sin que nadie pudiera fingir que no lo vio, mierda.',
  '%A ejecutó el golpe a %V como quien marca una casilla pendiente del ranking con el parte del comando cerrado a favor del resultado, coño.',
  '%A vs %V: crónica de un atraco que no se quedó en intento ni en almost y sin segunda oportunidad en este mensaje, cabrón.',
  '%A se llevó el botín de %V delante de quienes miraban el ranking en ese momento mientras el grupo tomaba nota del movimiento, gilipollas.',
  '%A el plan salió; el aura de %V no se salvó del cargo en el contador con números que no admiten recurso de apelación, patético.',
  '%A vs %V terminó 1-0 en aura: el resto del mensaje es comentario y el historial del comando queda de testigo, asco.',
  '%A entró a por el aura de %V y cumplió el objetivo del comando en el ranking delante de todo el hilo y sin posibilidad de borrado, basura.',
  '%A cobró de %V en el timing que no perdona ni avisa dos veces con el ranking como único testigo del cargo, ridículo.',
  'Robo limpio: %A con el botín, %V con el hueco y el chat con el dato del transfer y el contador lo dejó por escrito sin debate, fracasado.',
  '%A vs %V: gana %A por ejecución y pierde %V por defensa insuficiente en el momento más visible del chat, cutre.',
  '%A se llevó el aura de %V y el recibo quedó colgado en este hilo sin que nadie pudiera fingir que no lo vio, joder.',
  '%A el golpe a %V aterrizó; el ranking no pide segunda opinión ni VAR con el parte del comando cerrado a favor del resultado, mierda.',
  '%A vs %V terminó con el transfer en dirección %A y visible para todo el grupo y sin segunda oportunidad en este mensaje, coño.',
  '%A robó a %V en el momento exacto: ni un segundo antes ni uno después mientras el grupo tomaba nota del movimiento, cabrón.',
  'Atraco a favor de %A: %V en el parte de pérdidas y el aura en otra cuenta con números que no admiten recurso de apelación, gilipollas.',
  '%A ejecutó, cobró y dejó a %V con la cara del contador en menos y el historial del comando queda de testigo, patético.',
  '%A vs %V: el botín se movió y el debate útil no hace falta en el chat delante de todo el hilo y sin posibilidad de borrado, asco.',
  '%A se llevó lo marcado del aura de %V sin pedir confirmación al sistema con el ranking como único testigo del cargo, basura.',
  '%A el atraco a %V fue limpio de fallos y sucio de botín ajeno en el contador y el contador lo dejó por escrito sin debate, ridículo.',
  '%A vs %V terminó con %A en verde y %V en el hueco del ranking en el momento más visible del chat, fracasado.',
  '%A robó el aura de %V con público y sin remordimiento de contador sin que nadie pudiera fingir que no lo vio, cutre.',
  '%A entró a por %V y salió con el objetivo cumplido en números del sistema con el parte del comando cerrado a favor del resultado, mierda.',
  '%A el golpe fue suficiente para que %V lo note el resto de la sesión del chat y sin segunda oportunidad en este mensaje, coño.',
  '%A vs %V: 1-0 sin VAR, sin prórroga y con botín a nombre de %A mientras el grupo tomaba nota del movimiento, cabrón.',
  '%A cobró el aura de %V y el chat archivó el resultado sin pedir amplificación con números que no admiten recurso de apelación, gilipollas.',
  '%A se llevó el botín de %V en el timing del que no avisa ni pide permiso y el historial del comando queda de testigo, patético.',
  '%A vs %V terminó con el ranking a favor del que atacó bien y cobró delante de todo el hilo y sin posibilidad de borrado, asco.',
  '%A ejecutó el atraco a %V como un cobro pendiente saldado en el sistema con el ranking como único testigo del cargo, basura.',
  'Robo limpio de %A: el aura de %V viajó sin billete de retorno ni reembolso y el contador lo dejó por escrito sin debate, ridículo.',
  '%A vs %V: crónica corta y botín largo para la cuenta de %A en el momento más visible del chat, fracasado.',
  '%A se llevó el aura de %V mientras %V todavía contaba la unidad anterior sin que nadie pudiera fingir que no lo vio, cutre.',
  '%A el contador no miente en este parte: %A más, %V menos, punto con el parte del comando cerrado a favor del resultado, joder.',
  '%A vs %V terminó con el transfer visible y el debate inútil en el hilo y sin segunda oportunidad en este mensaje, mierda.',
  '%A robó a %V sin sombra que oculte el cargo: luz de chat completa mientras el grupo tomaba nota del movimiento, coño.',
  'Atraco redondo a favor de %A: cobra el aura de %V en un solo movimiento limpio con números que no admiten recurso de apelación, cabrón.',
  '%A ejecutó el golpe a %V y el ranking firmó debajo sin pedir aclaración y el historial del comando queda de testigo, gilipollas.',
  '%A vs %V: gana quien no se quedó con las manos vacías al final del round delante de todo el hilo y sin posibilidad de borrado, patético.',
  '%A se llevó el botín de %V y dejó el mensaje como único recibo del cargo con el ranking como único testigo del cargo, asco.',
  '%A el plan contra %V funcionó: el aura cambió de dueño en el contador y el contador lo dejó por escrito sin debate, basura.',
  '%A vs %V terminó 1-0 en el marcador del aura y el archivo quedó cerrado en el momento más visible del chat, ridículo.',
  '%A cobró de %V lo que el ranking ahora muestra a su favor sin filtro sin que nadie pudiera fingir que no lo vio, fracasado.',
  'Robo exitoso de %A a costa de %V: sin asterisco que lo relativice con el parte del comando cerrado a favor del resultado, cutre.',
  '%A entró a por el aura de %V y no aceptó un no del contador como respuesta y sin segunda oportunidad en este mensaje, joder.',
  '%A el golpe a %V fue corto en el reloj y largo en el efecto del ranking mientras el grupo tomaba nota del movimiento, mierda.',
  '%A vs %V terminó con %A en el lado correcto del transfer de aura con números que no admiten recurso de apelación, coño.',
  '%A robó el aura de %V en plena sesión de chat: sin pausa ni aviso previo y el historial del comando queda de testigo, cabrón.',
  '%A vs %V: el ladrón cerró el parte antes de que la víctima terminara de quejarse delante de todo el hilo y sin posibilidad de borrado, patético.',
  '%A ejecutó el atraco a %V con lista cerrada: botín marcado y botín cobrado con el ranking como único testigo del cargo, asco.',
  'Robo limpio: %A con aura de %V, %V con el hueco y el grupo con la foto del ranking y el contador lo dejó por escrito sin debate, basura.',
  '%A vs %V terminó con el contador actualizado y el debate cerrado por los números en el momento más visible del chat, ridículo.',
  '%A se llevó el aura de %V cuando más se notaba soltarla en el ranking sin que nadie pudiera fingir que no lo vio, fracasado.',
  '%A el botín de %V cambió de manos: las manos de %A no tiemblan en el contador con el parte del comando cerrado a favor del resultado, cutre.',
  '%A vs %V: 1-0 a favor de quien no falló el golpe del atraco y sin segunda oportunidad en este mensaje, joder.',
  '%A cobró el aura de %V y dejó el hueco como recuerdo visible en el perfil mientras el grupo tomaba nota del movimiento, mierda.',
  '%A ejecutó, %V pagó y el chat presenció: robo completo sin asteriscos con números que no admiten recurso de apelación, cabrón.',
  '%A vs %V terminó con el transfer en firme a nombre de %A en el sistema y el historial del comando queda de testigo, gilipollas.',
  '%A robó a %V sin pedir turno de palabra en el grupo ni devolver el botín delante de todo el hilo y sin posibilidad de borrado, patético.',
  '%A el golpe a %V aterrizó en el aura: el resto del mensaje es ruido de fondo con el ranking como único testigo del cargo, asco.',
  '%A vs %V: crónica de un atraco con final de botín a favor de %A y el contador lo dejó por escrito sin debate, basura.',
  '%A se llevó el aura de %V en el momento que el ranking no perdona ni suaviza en el momento más visible del chat, ridículo.',
  'Robo exitoso: %A cierra, %V abre el hueco y el grupo archiva el resultado sin que nadie pudiera fingir que no lo vio, fracasado.',
  '%A vs %V terminó 1-0 sin necesidad de amplificación ni narrador extra con el parte del comando cerrado a favor del resultado, cutre.',
  '%A cobró de %V el aura que ahora figura en su columna del ranking y sin segunda oportunidad en este mensaje, joder.',
  '%A el plan salió; %V no se salvó; el contador quedó de testigo del cargo mientras el grupo tomaba nota del movimiento, mierda.',
  '%A vs %V: gana %A por ejecución limpia del atraco y pierde %V por no retener con números que no admiten recurso de apelación, coño.',
  '%A se llevó el botín de %V delante de quien quisiera mirar el hilo y el historial del comando queda de testigo, cabrón.',
  '%A ejecutó el atraco a %V como quien marca una casilla y pasa a la siguiente delante de todo el hilo y sin posibilidad de borrado, gilipollas.',
  '%A vs %V terminó con el aura de %V en tránsito hacia la cuenta de %A con el ranking como único testigo del cargo, patético.',
  '%A robó el aura de %V con la precisión de un cobro ya calculado de antemano y el contador lo dejó por escrito sin debate, asco.',
  '%A vs %V: el marcador del aura no admite empate en este resultado en el momento más visible del chat, ridículo.',
  '%A entró a por %V y salió con el objetivo del comando cumplido en el ranking sin que nadie pudiera fingir que no lo vio, fracasado.',
  '%A el golpe fue suficiente: %V lo nota y el ranking lo muestra sin filtro con el parte del comando cerrado a favor del resultado, cutre.',
  '%A cobró el aura de %V y el chat no pidió repetición: se vio de sobra a la primera y sin segunda oportunidad en este mensaje, mierda.',
  'Atraco redondo a favor de %A: %V en el hueco documentado del contador mientras el grupo tomaba nota del movimiento, coño.',
  '%A se llevó lo marcado de %V sin letra pequeña ni segunda oportunidad del sistema con números que no admiten recurso de apelación, cabrón.',
  '%A vs %V: el ladrón ganó el round que importaba al contador de aura y el historial del comando queda de testigo, gilipollas.',
  '%A ejecutó el atraco a %V en el timing del que no avisa dos veces seguidas delante de todo el hilo y sin posibilidad de borrado, patético.',
  '%A el aura de %V viajó: destino cuenta de %A, billete sin retorno posible con el ranking como único testigo del cargo, asco.',
  '%A vs %V terminó 1-0 en aura: archivo cerrado y siguiente y el contador lo dejó por escrito sin debate, basura.',
  '%A robó a %V en luz de chat completa: sin sombra útil para la víctima del cargo en el momento más visible del chat, ridículo.',
  '%A se llevó el botín de %V con la calma de quien ya había contado el premio sin que nadie pudiera fingir que no lo vio, cutre.',
  '%A vs %V: crónica corta de un transfer largo para el contador de %V con el parte del comando cerrado a favor del resultado, joder.',
  '%A cobró de %V lo que ahora pesa en su favor en el ranking del grupo y sin segunda oportunidad en este mensaje, mierda.',
  '%A el golpe a %V conectó; no hace falta cámara lenta ni narrador emocional mientras el grupo tomaba nota del movimiento, coño.',
  '%A vs %V terminó con el botín en el bolsillo de %A y el hueco en el de %V con números que no admiten recurso de apelación, cabrón.',
  '%A entró a por el aura de %V y cerró el parte a su favor en el sistema y el historial del comando queda de testigo, gilipollas.',
  '%A ejecutó el atraco sin almost: %V sin defensa suficiente para retener delante de todo el hilo y sin posibilidad de borrado, patético.',
  '%A vs %V: 1-0 sin prórroga y con aura en movimiento hacia %A con el ranking como único testigo del cargo, asco.',
  '%A se llevó el aura de %V y dejó el hueco como firma visible en el perfil y el contador lo dejó por escrito sin debate, basura.',
  'Robo limpio: %A con el resultado, %V con la pérdida y el grupo con el dato en el momento más visible del chat, ridículo.',
  '%A vs %V terminó con el ranking firmando a favor de %A sin pedir aclaración sin que nadie pudiera fingir que no lo vio, fracasado.',
  '%A cobró el aura de %V en el momento exacto del comando y del hilo con el parte del comando cerrado a favor del resultado, cutre.',
  '%A el plan contra %V no se quedó en la pizarra: se cobró en el contador y sin segunda oportunidad en este mensaje, joder.',
  '%A vs %V: gana quien atacó y cobró, pierde quien defendió mal el aura mientras el grupo tomaba nota del movimiento, mierda.',
  '%A ejecutó el atraco a %V como un cobro de deuda que %V no reconocía con números que no admiten recurso de apelación, cabrón.',
  '%A vs %V terminó con el transfer visible en el ranking y sin recurso y el historial del comando queda de testigo, gilipollas.',
  '%A robó el aura de %V y el chat archivó el resultado sin debate útil posible delante de todo el hilo y sin posibilidad de borrado, patético.',
  'Atraco a favor de %A: %V en pérdidas y el aura en otra columna del sistema con el ranking como único testigo del cargo, asco.',
  '%A se llevó lo suyo del aura de %V: operativa de atraco exitoso sin maquillaje y el contador lo dejó por escrito sin debate, basura.',
  '%A vs %V: el ladrón cerró antes de que la queja de %V terminara de escribirse en el momento más visible del chat, ridículo.',
  '%A cobró de %V en público: el ranking no ofrece modo privado para el cargo sin que nadie pudiera fingir que no lo vio, fracasado.',
  '%A el golpe a %V fue limpio; el efecto en el contador, sucio para %V con el parte del comando cerrado a favor del resultado, cutre.',
  '%A vs %V terminó 1-0 con el botín en movimiento hacia la cuenta de %A y sin segunda oportunidad en este mensaje, joder.',
  '%A entró a por %V y cumplió: el aura cambió de dueño en el ranking mientras el grupo tomaba nota del movimiento, mierda.',
  'Robo exitoso de %A a costa de %V: sin relativizar y con números a la vista con números que no admiten recurso de apelación, coño.',
  '%A ejecutó, cobró y dejó a %V con el mensaje de recibo y el hueco del contador y el historial del comando queda de testigo, cabrón.',
  '%A se llevó el aura de %V en el timing que el ranking registra sin piedad delante de todo el hilo y sin posibilidad de borrado, patético.',
  '%A robó a %V sin almost y sin devolución posible del botín con el ranking como único testigo del cargo, ridículo.',
  'Robo limpio: %A cierra el parte, %V abre el hueco y el grupo lo ve en el ranking y el contador lo dejó por escrito sin debate, fracasado.',
  '%A vs %V: 1-0 en el único marcador que el comando reconoce de verdad en el momento más visible del chat, cutre.',
  '%A cobró el aura de %V y dejó el recibo colgado en este hilo del chat sin que nadie pudiera fingir que no lo vio, joder.',
  '%A el plan salió redondo: el aura de %V no tuvo billete de vuelta al contador con el parte del comando cerrado a favor del resultado, mierda.',
  '%A vs %V terminó con el ranking actualizado y el debate sobrando en el hilo y sin segunda oportunidad en este mensaje, coño.',
  '%A ejecutó el atraco a %V como quien salda una línea pendiente del sistema mientras el grupo tomaba nota del movimiento, gilipollas.',
  '%A vs %V: gana %A, pierde %V y el aura no se discute en el chat con números que no admiten recurso de apelación, patético.',
  '%A robó el aura de %V con precisión de cobro ya calculado de antemano y el historial del comando queda de testigo, asco.',
  'Atraco redondo: %A con el resultado en el contador y %V con la pérdida a la vista delante de todo el hilo y sin posibilidad de borrado, basura.',
  '%A vs %V terminó con el transfer en firme y sin VAR que lo cambie con el ranking como único testigo del cargo, ridículo.',
  '%A el golpe a %V aterrizó donde más dolía: el contador del ranking y el contador lo dejó por escrito sin debate, cutre.',
  '%A vs %V: 1-0 sin prórroga y con botín a nombre de %A en el sistema en el momento más visible del chat, joder.',
  '%A cobró de %V lo que el ranking ahora muestra sin filtro ni modo privado sin que nadie pudiera fingir que no lo vio, mierda.',
  '%A ejecutó el atraco a %V y el chat no pidió segunda toma del golpe con el parte del comando cerrado a favor del resultado, cabrón.',
  '%A vs %V terminó con %A contando y %V restando en silencio de ranking y sin segunda oportunidad en este mensaje, gilipollas.',
  '%A se llevó lo marcado del aura de %V: casilla cobrada en el sistema mientras el grupo tomaba nota del movimiento, patético.',
  '%A el plan contra %V funcionó de punta a punta del intento de atraco con números que no admiten recurso de apelación, asco.',
  '%A vs %V: el ladrón ganó el round del contador y cerró el parte y el historial del comando queda de testigo, basura.',
  '%A robó a %V en plena luz: sin sombra para esconder el cargo del ranking delante de todo el hilo y sin posibilidad de borrado, ridículo.',
  'Robo limpio de %A a costa de %V: archivado en el ranking sin recurso con el ranking como único testigo del cargo, fracasado.',
  '%A vs %V terminó 1-0 con el aura en tránsito hacia quien atacó bien y el contador lo dejó por escrito sin debate, cutre.',
  '%A cobró el aura de %V y cerró el parte sin pedir aplauso al grupo en el momento más visible del chat, joder.',
  '%A el botín de %V ya no vuelve: el ranking no ofrece reembolso de aura sin que nadie pudiera fingir que no lo vio, mierda.',
  '%A vs %V: crónica corta de un cobro largo para el contador de %V con el parte del comando cerrado a favor del resultado, coño.',
  '%A se llevó el aura de %V con la calma de un trámite terminado en el sistema y sin segunda oportunidad en este mensaje, cabrón.',
  '%A ejecutó el golpe a %V: el contador firmó y el chat presenció el cargo mientras el grupo tomaba nota del movimiento, gilipollas.',
  '%A vs %V terminó con el resultado que %A había marcado en la lista de la compra con números que no admiten recurso de apelación, patético.',
  '%A robó el aura de %V y dejó el hueco como firma visible en el perfil del ranking y el historial del comando queda de testigo, asco.',
  '%A vs %V: 1-0 en aura, archivo cerrado, siguiente ronda cuando toque delante de todo el hilo y sin posibilidad de borrado, ridículo.'
];

const ROB_FAIL = [
  '%A intentó robarle el aura a %V y falló con la confianza de un campeón y la puntería de un ciego empedernido, joder.',
  '%A salió a cazar el aura de %V y volvió con las manos vacías y la cara llena de casi, como siempre, mierda.',
  'El robo de %A contra %V murió en el intento: manos torpes, plan flojo y un resultado que da vergüenza ajena, cabrón.',
  '%A puso la mano donde no debía y %V se la devolvió vacía con intereses de ridículo compuesto, patético.',
  '%A vs %V terminó antes de empezar: el ataque no merecía ni el mensaje de defensa del bot, gilipollas.',
  '%A calculó mal el golpe y %V ni se agachó; el chat sí se inclinó de risa contenida con el parte del comando cerrado en contra, asco.',
  'Intento de robo archivado sin gloria: %A sin botín, %V sin un arañazo y el grupo con meme fresco, basura.',
  '%A falló el atraco a %V como falla los debates serios: mucho ruido y cero resultado que se pueda usar, ridículo.',
  '%V no se movió un milímetro del ranking: %A se movió mucho y no llegó a ninguna parte del botín, fracasado.',
  'El plan de %A se desmontó solo tres pasos antes de tocar a %V; ni hizo falta que empujara nadie, cutre.',
  '%A entró a por el aura de %V y salió con las manos y el ego en el mismo estado de quiebra: vacíos, joder.',
  'Robo fallido en acta pública: %A firma el parte, %V firma el bostezo y el chat archiva el show, mierda.',
  '%A tenía el guion del atraco memorizado; %V tenía la realidad. Gana la realidad por goleada limpia, coño.',
  'El golpe de %A no conectó ni de casualidad estadística: %V sigue con el aura y %A con la explicación, cabrón.',
  '%A tropezó con su propio plan tres pasos antes de oler siquiera el aura de %V sin que nadie pudiera fingir que no lo vio, gilipollas.',
  '%A miró el aura de %V como quien mira un escaparate cerrado de noche: sin talento para el cristal, asco.',
  'El atraco de %A fue un tráiler eterno que nunca llegó a estreno; %V sigue en cartelera sin sustituto, basura.',
  '%V sigue intacto y sinceramente aburrido; %A sigue buscando la frase que convierta el almost en victoria, fracasado.',
  'Robo en modo teatro de barrio: %A actuó, %V no aplaudió y el telón cayó igual de rápido con números que no admiten recurso de apelación, cutre.',
  '%A puso todo el esfuerzo en el intento y cero en el acierto; %V agradece el espectáculo gratis, joder.',
  'El aura de %V no se movió un milímetro en el contador; la de respeto de %A sí, en caída libre, mierda.',
  '%A calculó el ángulo dos veces y las dos veces calculó mal; %V ni se inmutó en el ranking con el ranking como único testigo del fallo, coño.',
  'Fallo de manual escolar: %A con la mano tendida al vacío y %V con el aura exactamente donde estaba, cabrón.',
  '%V no necesitaba escudo ni suerte de principiante: %A se blindó solo a base de incompetencia pura, patético.',
  'El intento de %A contra %V cabe en un meme de una sola línea y todavía sobra espacio en la viñeta, asco.',
  'Atraco fallido al natural: %A sin botín, el chat con contenido fresco y %V con el aura quieta, ridículo.',
  '%A tenía hambre de aura ajena; %V tenía la nevera cerrada y la llave en otro continente y sin segunda oportunidad en este mensaje, fracasado.',
  '%A vs %V terminó 0-1 sin que %V sudara ni una gota de aura ni de paciencia mientras el grupo tomaba nota del almost, joder.',
  'Robo abortado por falta de talento documentada en acta: autor %A, espectador aburrido %V con números que no admiten recurso de apelación, mierda.',
  '%A extendió la mano hacia el aura de %V; %V contó hasta tres y no pasó absolutamente nada útil, coño.',
  'El aura de %V sigue en su sitio del ranking; el prestigio de %A ha salido a fumar y no contesta, cabrón.',
  'Intento de %A: mucho preámbulo, cero desenlace y %V intacto de la primera a la última línea, patético.',
  '%A no llegó al bolsillo de %V; se quedó en el pasillo del intento con las manos en los bolsillos propios, asco.',
  'Fallo con narrador incluido de serie B: %A protagonista del almost, %V del still here sin esfuerzo, basura.',
  '%A salió a cazar aura ajena y cazó una lección: %V no se deja y él no da el nivel mínimo sin que nadie pudiera fingir que no lo vio, ridículo.',
  'El atraco se desinfló solo en el aire: %A sopló de más al principio y %V ni gastó saliva, fracasado.',
  '%A con cara de ladrón de película de sobremesa; %V con cara de no haber visto nada porque no hubo nada, cutre.',
  '%A apuntó al aura de %V y le dio al aire del chat; el aire no paga botín ni da propina mientras el grupo tomaba nota del almost, mierda.',
  '%V sigue rico en aura contada; %A sigue rico en excusas de por qué esta vez casi con números que no admiten recurso de apelación, coño.',
  'El golpe no llegó al objetivo; el ridículo sí. Autor %A, objetivo intacto %V, público el grupo entero, cabrón.',
  '%V no defendió porque no hizo falta gastar energía: %A se defendió solo de su propio plan delante de todo el hilo y sin posibilidad de borrado, basura.',
  'Robo en modo borrador eterno: %A no pasó a limpio; %V sigue en el original sin un solo tachón, ridículo.',
  '%A puso la trampa al revés y cayó él mismo; %V observó desde la grada sin pagar la entrada, fracasado.',
  'Atraco 0, %A 0, %V 1 por el simple hecho de no hacer nada y con eso bastar en el momento más visible del chat, mierda.',
  'El plan de %A tenía más agujeros que aura disponible para robar; %V pasó de largo sin mirar, cabrón.',
  '%A sin botín, %V sin drama y el grupo con el veredicto escrito antes del punto final con el parte del comando cerrado en contra, gilipollas.',
  '%A creyó que %V era objetivo fácil de tutorial; %V resultó pared de hormigón. Gana la pared y sin segunda oportunidad en este mensaje, asco.',
  '%A extendió la mano al aura de %V y solo tocó el vacío de un intento mal medido mientras el grupo tomaba nota del almost, ridículo.',
  '%V ni activó defensa ni sudó media gota: el ataque de %A no merecía el gasto de turnos con números que no admiten recurso de apelación, fracasado.',
  '%A vs %V: el marcador se escribió solo en la columna del fallo y no hubo prórroga y el historial del comando queda de testigo, mierda.',
  'El atraco de %A fue un farol a mesa llena; %V no vio las cartas porque no había juego encima delante de todo el hilo y sin posibilidad de borrado, coño.',
  '%V sigue exactamente igual en el ranking; %A explica y el grupo ya cambió de tema hace rato, gilipollas.',
  '%A tropezó con la meta antes de llegar a ella: la meta era el aura de %V y sigue clavada ahí, patético.',
  '%A tenía hambre de aura contada; %V tenía cerradura y la llave lejos del alcance en el momento más visible del chat, basura.',
  '%A no conectó ni por accidente afortunado del universo; %V no sudó ni por educación sin que nadie pudiera fingir que no lo vio, fracasado.',
  'Robo en modo ensayo general que nunca estrena: %A no sube al escenario; %V no compró entrada, cutre.',
  '%V intacto por mérito de estar quieto y por demérito largo y documentado de %A y sin segunda oportunidad en este mensaje, mierda.',
  'El aura de %V no se movió del contador; la cara de %A sí, varios tonos hacia el rojo vergonzante, cabrón.',
  '%A vs %V terminó antes del primer paso real: el plan no sobrevivió al contacto con la realidad, asco.',
  '%V no necesitaba suerte ni escudo de tienda: %A trajo su propia derrota bajo el brazo y el historial del comando queda de testigo, ridículo.',
  'Fallo de %A: el botín sigue en %V, el meme queda en el chat y el prestigio baja sin freno, fracasado.',
  'El golpe de %A fue un soplo de aire acondicionado; %V ni se molestó en apartar el flequillo con el ranking como único testigo del fallo, joder.',
  '%V sigue en su sitio contando aura como quien cuenta ladrillos; %A busca la frase que lo arregle, coño.',
  'El plan de %A se diluyó al primer contacto con el agua del ranking; %V ni se enteró del chapuzón, asco.',
  '%V 1, %A 0 en un partido donde solo uno intentó jugar y encima lo hizo mal de principio a fin, ridículo.',
  '%A vs %V: crónica de un robo anunciado en el group chat y no ejecutado en ningún fotograma con el parte del comando cerrado en contra, joder.',
  '%A sin el aura de %V y sin la suya de respeto: doble pérdida en un solo intento torpe y sin segunda oportunidad en este mensaje, mierda.',
  '%V no se defendió porque el ataque de %A no llegó a la fase donde hace falta gastar defensa, gilipollas.',
  '%A tropezó con la realidad en el primer escalón del plan; la realidad se llama %V intacto con números que no admiten recurso de apelación, basura.',
  '%A extendió la mano al aura; %V contó las unidades al final y no faltaba ni media y el historial del comando queda de testigo, cutre.',
  '%A vs %V en modo fail predecible de manual: guion visto mil veces y ejecución todavía peor delante de todo el hilo y sin posibilidad de borrado, joder.',
  '%V sigue: el contador de aura no parpadeó ni un frame; %A sí, de nervios y de vergüenza con el ranking como único testigo del fallo, cabrón.',
  '%A no llegó; %V no se fue: empate técnico a favor de quien no necesitaba ni jugar y el contador lo dejó por escrito sin debate, basura.',
  '%A salió a por %V y volvió con una anécdota de fallo que nadie en el grupo había pedido en el momento más visible del chat, cutre.',
  '%V intacto de la primera a la última línea; %A redactando otra vez la crónica del casi sin que nadie pudiera fingir que no lo vio, coño.',
  '%A vs el aura de %V: el aura ni se enteró de que había una amenaza nominal en el chat con el parte del comando cerrado en contra, cabrón.',
  '%A en el intento, el intento en el suelo y el botín donde siempre estuvo: en %V y sin segunda oportunidad en este mensaje, patético.',
  '%A no conectó ni por casualidad del universo; %V tampoco se movió por casualidad ni por pena mientras el grupo tomaba nota del almost, asco.',
  '%V 1 por existir y con eso bastar; %A 0 por intentarlo de la peor manera posible del manual, fracasado.',
  '%A dejó el botín exactamente donde estaba al principio: en manos que no son las suyas, las de %V, cutre.',
  'El plan de %A no sobrevivió al primer contacto visual con %V en el ranking del grupo delante de todo el hilo y sin posibilidad de borrado, coño.',
  '%A tenía hambre del aura de %V y se quedó solo con el hambre y el chat entero de testigo, gilipollas.',
  '%A vs %V terminó con el marcador en blanco total en la columna de quien atacó y el contador lo dejó por escrito sin debate, asco.',
  '%V no sudó ni de lejos del intento; %A sudó la explicación larga que nadie había pedido en el momento más visible del chat, cutre.',
  '%V sigue con el contador igual de firme; %A con el ego claramente en números rojos del día, gilipollas.',
  '%A vs %V: crónica breve de un fallo que a %A se le hizo eterno en la cabeza con el parte del comando cerrado en contra, ridículo.',
  '%A vs %V en modo solo frente al espejo del chat: gana quien no atacó como atacó %A y sin segunda oportunidad en este mensaje, basura.',
  '%A creyó que esta vez sí tocaba; el universo y %V contestaron que no al unísono y sin dudar mientras el grupo tomaba nota del almost, cutre.',
  '%V ni se enteró del show montado; %A se enteró demasiado, demasiado tarde y demasiado claro con números que no admiten recurso de apelación, joder.',
  '%A tropezó con el peaje del fallo antes de oler de cerca el botín que guardaba %V y el historial del comando queda de testigo, mierda.',
  '%A sin el aura de %V: historia corta de botín y largometraje de ridículo con créditos finales, cabrón.',
  '%A el plan se le cayó de las manos antes de poder usarlo una sola vez contra %V con el ranking como único testigo del fallo, gilipollas.',
  '%A vs el aura de %V: 0-1 en el marcador y el 1 no sudó ni pidió cambio de ritmo y el contador lo dejó por escrito sin debate, asco.',
  '%A vs %V: el guion del comando decía robo y la función acabó siendo sketch de fallos en el momento más visible del chat, gilipollas.',
  '%V intacto en el ranking; %A en la cola permanente de los almost del historial del comando, fracasado.',
  '%A sin el aura de %V y sin la cara de haberlo intentado de una forma decente con el parte del comando cerrado en contra, mierda.',
  '%A vs %V terminó en walkover a favor de quien no necesitó atacar bien ni una sola vez y sin segunda oportunidad en este mensaje, cabrón.',
  '%A tenía hambre de ranking ajeno; la cocina del aura de %V estaba cerrada con candado y testigos, gilipollas.',
  '%A sin gloria en el parte; %V sin drama en el ranking: equilibrio perfecto de un fail bien repartido, basura.',
  '%A vs el aura de %V: ni hubo combate real ni hubo duda razonable del resultado final y el historial del comando queda de testigo, joder.',
  'Atraco fallido en limpio: %A firma el parte, %V bosteza y el grupo archiva sin debate delante de todo el hilo y sin posibilidad de borrado, cabrón.',
  '%A no conectó el golpe; el universo no ayudó; %V no necesitaba ayuda para ganar este round, gilipollas.',
  '%A puso la trampa, olvidó el sitio exacto y cayó lejos de %V y del botín que soñaba y el contador lo dejó por escrito sin debate, asco.',
  '%A vs %V en una sola línea de acta notarial del bot: falló. Punto y cierre en el momento más visible del chat, ridículo.',
  '%A extendió la mano al aura; el aura de %V no hizo el trayecto inverso ni de broma ni de error, mierda.',
  '%V 1, %A 0: acta cerrada sin prórroga, sin VAR y sin bis de consuelo con el parte del comando cerrado en contra, gilipollas.',
  '%A vs %V: el fallo se escribió solo en el ranking, sin ayuda de guionista ni de narrador y sin segunda oportunidad en este mensaje, ridículo.',
  'Fallo limpio de los que no dejan rastro en el aura ajena: %A no ensució a %V ni con la punta del dedo, cutre.',
  '%A puso todo menos el acierto del golpe; %V lo notó solo en la ausencia total de movimiento, gilipollas.',
  '%A vs %V terminó antes de que %A encontrara siquiera el bolsillo correcto del objetivo y el historial del comando queda de testigo, ridículo.',
  '%A vs el aura de %V en modo silent: el silencio es el del contador que no se movió ni un tick, gilipollas.',
  '%A extendió el brazo completo hacia el objetivo; el aura de %V no hizo ni medio trayecto de vuelta, patético.',
  '%A vs el aura de %V: 0-1 sin prórroga, sin debate útil y sin segunda oportunidad en este mensaje, cutre.',
  '%A salió a por el botín de %V y volvió con este mensaje como único souvenir del viaje en el momento más visible del chat, joder.',
  '%A el plan se evaporó al primer contacto real con %V en la lista del grupo sin que nadie pudiera fingir que no lo vio, gilipollas.',
  '%A vs %V: no hubo robo en el sentido útil de la palabra; hubo intento y hubo un no rotundo con el parte del comando cerrado en contra, basura.',
  '%A vs %V terminó 0-1; el 1 es %V por el simple hecho de no moverse mal ni una vez y sin segunda oportunidad en este mensaje, mierda.',
  '%A vs el aura de %V: ni combate real, ni duda razonable, ni botín, ni gloria de ningún tipo, basura.'
];


const ROB_MAESTRO = [
  '%A no solo le robó a %V: le vació el aura con la precisión de quien no deja migas. El ranking lo registra.',
  '%A ejecutó el atraco maestro a %V: botín máximo, defensa en cero, chat en silencio un segundo. Mierda.',
  'Robo de autor: %A a %V. El contador de %V no se recuperó en el mismo mensaje. El ranking lo registra.',
  '%A vs %V terminó con el aura de %V en tránsito total hacia %A. El ranking lo registra en el momento más visible del chat.',
  '%A vació lo que había que vaciar de %V: el ranking lo muestra sin filtro. El ranking lo registra sin que nadie pudiera fingir que no lo vio.',
  'Atraco maestro de %A: %V mirando el hueco donde antes había margen. El ranking lo registra con el parte del comando cerrado en firme.',
  '%A le robó a %V como quien cobra una deuda antigua con intereses. El ranking lo registra y sin segunda oportunidad en este mensaje.',
  '%A vs %V: clínica de atraco. El paciente %V sale con menos aura de la que entró. El ranking lo registra.',
  '%A no dejó casi nada en la cuenta de %V: casi nada duele más que nada a veces. El ranking lo registra.',
  'Robo de nivel: %A cobró de %V con la calma de un maestro que no suda el golpe. El ranking lo registra.',
  '%A ejecutó el vaciado de %V en el timing que no perdona ni deja casi. El ranking lo registra delante de quien miraba el ranking en ese momento.',
  '%A vs %V terminó con transfer pesado a favor de %A y silencio de %V. El ranking lo registra con el sistema firmando debajo sin pedir aclaración.',
  '%A se llevó el aura de %V como quien recoge lo suyo de un sitio ajeno. El ranking lo registra delante de todo el hilo y sin posibilidad de borrado.',
  'Atraco de categoría: %A a costa de %V, el grupo sin duda del nivel. El ranking lo registra con el ranking como único testigo del resultado.',
  '%A no improvisó el pleno: el aura de %V ya estaba en la lista de la compra. El ranking lo registra y el contador lo dejó por escrito sin debate.',
  '%A vs %V: el ladrón maestro cobró, la víctima cuenta el hueco grande. El ranking lo registra en el momento más visible del chat.',
  '%A vació a %V con precisión de quien no necesita segundo intento. El ranking lo registra sin que nadie pudiera fingir que no lo vio.',
  'Robo maestro: %A con el botín gordo, %V con el hueco del mismo tamaño. El ranking lo registra con el parte del comando cerrado en firme.',
  '%A le dejó a %V el mínimo: el mínimo no consuela. Y el grupo lo vio entero y sin segunda oportunidad en este mensaje, patético.',
  '%A vs %V terminó con el ranking actualizado a lo grande a favor de %A. El ranking lo registra mientras el grupo tomaba nota del movimiento.',
  '%A ejecutó el golpe a %V en modo autor: firma legible en el contador. El ranking lo registra con números que no admiten recurso de apelación.',
  '%A el atraco a %V no fue suerte: fue ejecución de nivel. El ranking lo registra y el historial del comando queda de testigo.',
  '%A vs %V: crónica de un vaciado que el chat no discute. Y el grupo lo vio entero delante de quien miraba el ranking en ese momento, asco.',
  '%A se llevó de %V todo lo que el momento permitió: el momento permitió mucho. El ranking lo registra.',
  'Atraco maestro de %A: %V en el parte de bajas graves de aura. El ranking lo registra delante de todo el hilo y sin posibilidad de borrado.',
  '%A cobró de %V con la lista cerrada y el bolsillo abierto. El ranking lo registra con el ranking como único testigo del resultado.',
  '%A vs %V terminó 1-0 con el 1 pesando en el contador de %A. El ranking lo registra y el contador lo dejó por escrito sin debate.',
  '%A no dejó el atraco en parcial: cerró en maestro sobre %V. El ranking lo registra en el momento más visible del chat.',
  '%A el aura de %V viajó casi entera: destino cuenta de %A. El ranking lo registra sin que nadie pudiera fingir que no lo vio.',
  '%A vs %V: el maestro cobró, el aprendiz de víctima aprendió caro. El ranking lo registra con el parte del comando cerrado en firme.',
  '%A ejecutó el vaciado de %V sin pedir bis: el ranking no ofrece reposición rápida. El ranking lo registra.',
  'Robo de nivel: %A a %V, botín máximo legible, defensa insuficiente. El ranking lo registra mientras el grupo tomaba nota del movimiento.',
  '%A se llevó el pack de aura de %V: el pack no tenía seguro. El ranking lo registra con números que no admiten recurso de apelación.',
  '%A vs %V terminó con transfer pesado y cara de %V de haber visto el hueco. El ranking lo registra y el historial del comando queda de testigo.',
  '%A cobró de %V como quien no acepta almost en el parte. El ranking lo registra delante de quien miraba el ranking en ese momento.',
  'Atraco maestro: %A cierra con botín, %V abre el hueco grande. El ranking lo registra con el sistema firmando debajo sin pedir aclaración.',
  '%A vs %V: gana el que vació, pierde el que no retuvo. Y el grupo lo vio entero delante de todo el hilo y sin posibilidad de borrado, cutre.',
  '%A ejecutó el golpe a %V con precisión de cobro total posible. El ranking lo registra con el ranking como único testigo del resultado.',
  '%A el contador de %V bajó de verdad: el de %A subió de verdad. El ranking lo registra y el contador lo dejó por escrito sin debate.',
  '%A vs %V terminó con el aura de %V en manos de quien atacó en serio. El ranking lo registra en el momento más visible del chat.',
  '%A se llevó de %V lo que duele soltar en un solo mensaje. El ranking lo registra sin que nadie pudiera fingir que no lo vio.',
  'Robo maestro de %A: sin parcial, con botín, con público callado un segundo. El ranking lo registra con el parte del comando cerrado en firme.',
  '%A vs %V: clínica de atraco con resultado de vaciado. Y el grupo lo vio entero y sin segunda oportunidad en este mensaje, cabrón.',
  '%A cobró el aura de %V en el modo que no deja casi margen. El ranking lo registra mientras el grupo tomaba nota del movimiento.',
  '%A el golpe a %V fue de autor: el ranking firma debajo en grande. El ranking lo registra con números que no admiten recurso de apelación.',
  '%A vs %V terminó con %A en el lado pesado del transfer. El ranking lo registra y el historial del comando queda de testigo.',
  '%A no dejó migas útiles en la cuenta de %V: migas no alimentan. El ranking lo registra delante de quien miraba el ranking en ese momento.',
  'Atraco de categoría a favor de %A: %V en pérdidas graves. El ranking lo registra con el sistema firmando debajo sin pedir aclaración.',
  '%A se llevó el botín gordo de %V con la calma de quien ya había contado. El ranking lo registra delante de todo el hilo y sin posibilidad de borrado.',
  '%A vs %V: el maestro no pide aplauso, el contador lo da. El ranking lo registra con el ranking como único testigo del resultado.',
  '%A ejecutó el vaciado de %V en un movimiento limpio y pesado. El ranking lo registra y el contador lo dejó por escrito sin debate.',
  '%A el aura de %V cambió de dueño en cantidad que se nota sin lupa. El ranking lo registra en el momento más visible del chat.',
  '%A vs %V terminó 1-0 con peso: el peso es el botín de %A. El ranking lo registra sin que nadie pudiera fingir que no lo vio.',
  '%A cobró de %V todo lo que el atraco maestro permite en este sistema. El ranking lo registra con el parte del comando cerrado en firme.',
  'Robo de nivel: %A a costa de %V, sin almost, con hueco grande. El ranking lo registra y sin segunda oportunidad en este mensaje.',
  '%A se llevó de %V lo marcado en la lista de la compra completa. El ranking lo registra mientras el grupo tomaba nota del movimiento.',
  '%A vs %V: crónica de un vaciado legible en el ranking al instante. El ranking lo registra con números que no admiten recurso de apelación.',
  '%A ejecutó el atraco a %V como quien no contempla el parcial. El ranking lo registra y el historial del comando queda de testigo.',
  '%A el golpe fue maestro: %V lo nota el resto de la sesión. El ranking lo registra delante de quien miraba el ranking en ese momento.',
  '%A vs %V terminó con transfer pesado a nombre de %A. Y el grupo lo vio entero con el sistema firmando debajo sin pedir aclaración, basura.',
  '%A no dejó a %V con margen cómodo: el margen se fue con el botín. El ranking lo registra delante de todo el hilo y sin posibilidad de borrado.',
  'Atraco maestro de %A: el chat vio el vaciado y el contador lo selló. El ranking lo registra con el ranking como único testigo del resultado.',
  '%A vs %V: gana quien vació, el resto es ruido de la pérdida. El ranking lo registra y el contador lo dejó por escrito sin debate.',
  '%A cobró el aura de %V en cantidad de maestro, no de aprendiz. El ranking lo registra en el momento más visible del chat.',
  '%A el plan contra %V salió en versión completa: botín completo posible. El ranking lo registra sin que nadie pudiera fingir que no lo vio.',
  '%A vs %V terminó con %A contando en grande y %V restando en serio. El ranking lo registra con el parte del comando cerrado en firme.',
  '%A se llevó el pack de %V: el pack no volvió. Y el grupo lo vio entero y sin segunda oportunidad en este mensaje, mierda.',
  'Robo maestro: %A cierra el parte con botín, %V con el hueco del mismo peso. El ranking lo registra mientras el grupo tomaba nota del movimiento.',
  '%A vs %V: el ladrón de nivel cobró sin pedir segunda oportunidad. El ranking lo registra con números que no admiten recurso de apelación.',
  '%A ejecutó el vaciado de %V con la lista cerrada y el resultado abierto a su favor. El ranking lo registra.',
  '%A el contador no miente en grande: %V menos mucho, %A más mucho. El ranking lo registra delante de quien miraba el ranking en ese momento.',
  '%A vs %V terminó con el aura de %V en tránsito casi total. El ranking lo registra con el sistema firmando debajo sin pedir aclaración.',
  '%A cobró de %V como maestro que no acepta migajas de botín. El ranking lo registra delante de todo el hilo y sin posibilidad de borrado.',
  'Atraco de categoría: %A a %V, ranking actualizado a lo grande. El ranking lo registra con el ranking como único testigo del resultado.',
  '%A se llevó de %V lo que duele ver desaparecer en un solo golpe. El ranking lo registra y el contador lo dejó por escrito sin debate.',
  '%A vs %V: clínica de atraco, paciente %V con menos aura de la entrada. El ranking lo registra en el momento más visible del chat.',
  '%A ejecutó el golpe maestro a %V: sin parcial, con firma en el contador. El ranking lo registra sin que nadie pudiera fingir que no lo vio.',
  '%A el botín de %V viajó casi entero: billete a nombre de %A. El ranking lo registra con el parte del comando cerrado en firme.',
  '%A vs %V terminó 1-0 con el 1 pesando de verdad. Y el grupo lo vio entero y sin segunda oportunidad en este mensaje, joder.',
  '%A no dejó el atraco a medias: maestro sobre %V, punto. El ranking lo registra mientras el grupo tomaba nota del movimiento.',
  'Robo de nivel de %A a costa de %V: visible en grande, legible sin esfuerzo. El ranking lo registra con números que no admiten recurso de apelación.',
  '%A se llevó el aura de %V en cantidad que el almost no contempla. El ranking lo registra y el historial del comando queda de testigo.',
  '%A vs %V: el maestro cobró, la víctima cuenta el hueco sin consuelo. El ranking lo registra delante de quien miraba el ranking en ese momento.',
  '%A ejecutó el vaciado de %V en el timing del que no avisa y no falla. El ranking lo registra con el sistema firmando debajo sin pedir aclaración.',
  '%A el golpe a %V fue de autor: el ranking no pide aclaración. El ranking lo registra delante de todo el hilo y sin posibilidad de borrado.',
  '%A vs %V terminó con transfer pesado y silencio útil de %V. El ranking lo registra con el ranking como único testigo del resultado.',
  '%A cobró de %V el máximo que el atraco maestro permite mostrar. El ranking lo registra y el contador lo dejó por escrito sin debate.',
  'Atraco maestro: %A con botín gordo, %V con pérdida del mismo calibre. El ranking lo registra en el momento más visible del chat.',
  '%A vs %V: gana %A por vaciado, pierde %V por no retener. El ranking lo registra sin que nadie pudiera fingir que no lo vio.',
  '%A se llevó de %V lo marcado en grande: casilla cobrada en serio. El ranking lo registra con el parte del comando cerrado en firme.',
  '%A el plan salió en versión completa contra %V. Y el grupo lo vio entero y sin segunda oportunidad en este mensaje, fracasado.',
  '%A vs %V terminó con el ranking en movimiento fuerte a favor de %A. El ranking lo registra mientras el grupo tomaba nota del movimiento.',
  '%A ejecutó el atraco a %V sin almost y sin devolución posible. El ranking lo registra con números que no admiten recurso de apelación.',
  '%A el aura de %V bajó de verdad: el mensaje no exagera. Y el grupo lo vio entero y el historial del comando queda de testigo, coño.',
  '%A vs %V: crónica de un vaciado que el chat archiva en grande. El ranking lo registra delante de quien miraba el ranking en ese momento.',
  '%A cobró el botín maestro de %V con la calma de quien ya sumó. El ranking lo registra con el sistema firmando debajo sin pedir aclaración.',
  'Robo de nivel: %A cierra, %V abre el hueco grande, el grupo lo ve. El ranking lo registra delante de todo el hilo y sin posibilidad de borrado.',
  '%A vs %V terminó 1-0 con peso de aura real. Y el grupo lo vio entero con el ranking como único testigo del resultado, ridículo.',
  '%A se llevó el pack de %V: el pack no tenía plan B de defensa. El ranking lo registra y el contador lo dejó por escrito sin debate.',
  '%A ejecutó el vaciado de %V como quien no contempla el término medio. El ranking lo registra en el momento más visible del chat.',
  '%A vs %V: el maestro no suda, el contador de %V sí baja. El ranking lo registra sin que nadie pudiera fingir que no lo vio.',
  '%A cobró de %V en modo autor: firma grande en el ranking. El ranking lo registra con el parte del comando cerrado en firme.',
  'Atraco maestro de %A a costa de %V: sin relativizar, con números gordos. El ranking lo registra y sin segunda oportunidad en este mensaje.',
  '%A vs %V terminó con el transfer pesado y el debate inútil. El ranking lo registra mientras el grupo tomaba nota del movimiento.',
  '%A se llevó el aura de %V en cantidad de quien no deja el trabajo a medias. El ranking lo registra con números que no admiten recurso de apelación.',
  '%A el golpe maestro a %V aterrizó donde más se nota: el contador. El ranking lo registra y el historial del comando queda de testigo.',
  '%A vs %V: 1-0 con botín de categoría a nombre de %A. Y el grupo lo vio entero delante de quien miraba el ranking en ese momento, coño.',
  '%A ejecutó el atraco a %V en el modo que el parcial no alcanza. El ranking lo registra con el sistema firmando debajo sin pedir aclaración.',
  '%A el botín de %V cambió de manos en grande: manos de %A. El ranking lo registra delante de todo el hilo y sin posibilidad de borrado.',
  '%A vs %V terminó con %A en el lado pesado y %V en el hueco serio. El ranking lo registra con el ranking como único testigo del resultado.',
  '%A cobró de %V como quien cierra una deuda con intereses de maestro. El ranking lo registra y el contador lo dejó por escrito sin debate.',
  'Robo maestro: %A con el resultado gordo, %V con la pérdida del mismo tamaño. El ranking lo registra.',
  '%A vs %V: el ladrón de nivel firmó el parte antes de la queja completa. El ranking lo registra sin que nadie pudiera fingir que no lo vio.',
  '%A se llevó de %V lo que el atraco maestro está diseñado para llevar. El ranking lo registra con el parte del comando cerrado en firme.',
  '%A ejecutó el vaciado de %V sin pedir permiso al contador de %V. El ranking lo registra y sin segunda oportunidad en este mensaje.',
  '%A vs %V terminó con el ranking actualizado en grande a favor de %A. El ranking lo registra mientras el grupo tomaba nota del movimiento.',
  '%A cobró el aura de %V en el timing del maestro: ahora, todo lo posible. El ranking lo registra con números que no admiten recurso de apelación.',
  'Atraco de categoría a favor de %A: %V en el parte de bajas graves. El ranking lo registra y el historial del comando queda de testigo.',
  '%A vs %V: clínica de vaciado, resultado legible al instante. El ranking lo registra delante de quien miraba el ranking en ese momento.',
  '%A se llevó el pack de aura de %V con precisión de cobro total posible. El ranking lo registra con el sistema firmando debajo sin pedir aclaración.',
  '%A el golpe a %V fue maestro: el chat no necesita cámara lenta. El ranking lo registra delante de todo el hilo y sin posibilidad de borrado.',
  '%A vs %V terminó 1-0 con el botín pesando en la cuenta de %A. El ranking lo registra con el ranking como único testigo del resultado.',
  '%A ejecutó el atraco a %V sin almost: el ranking muestra el tamaño. El ranking lo registra y el contador lo dejó por escrito sin debate.',
  '%A el aura de %V viajó casi entera sin billete de vuelta. El ranking lo registra en el momento más visible del chat.',
  '%A vs %V: gana quien vació en serio, pierde quien no retuvo en serio. El ranking lo registra sin que nadie pudiera fingir que no lo vio.',
  '%A cobró de %V el máximo visible del sistema en este golpe. El ranking lo registra con el parte del comando cerrado en firme.',
  'Robo maestro de %A: sin parcial, con hueco grande, con público. El ranking lo registra y sin segunda oportunidad en este mensaje.',
  '%A vs %V terminó con transfer pesado y archivo cerrado a favor de %A. El ranking lo registra mientras el grupo tomaba nota del movimiento.',
  '%A se llevó de %V lo que duele soltar de un solo golpe limpio. El ranking lo registra con números que no admiten recurso de apelación.',
  '%A ejecutó el vaciado de %V como autor que no firma works in progress. El ranking lo registra y el historial del comando queda de testigo.',
  '%A vs %V: 1-0 en aura con peso, sin prórroga, con botín. El ranking lo registra delante de quien miraba el ranking en ese momento.',
  '%A cobró el aura de %V en cantidad que el mensaje no necesita adornar. El ranking lo registra con el sistema firmando debajo sin pedir aclaración.',
  'Atraco maestro: %A cierra el parte gordo, %V el hueco del mismo calibre. El ranking lo registra delante de todo el hilo y sin posibilidad de borrado.',
  '%A vs %V terminó con el contador de %A en más grande y el de %V en menos grande. El ranking lo registra.',
  '%A se llevó el botín de %V en modo maestro: el almost no aplica. El ranking lo registra y el contador lo dejó por escrito sin debate.',
  '%A el plan contra %V salió completo: el botín también. El ranking lo registra en el momento más visible del chat.',
  '%A vs %V: el maestro cobró, la víctima restó, el grupo archivó. El ranking lo registra sin que nadie pudiera fingir que no lo vio.',
  '%A ejecutó el golpe a %V con lista cerrada y bolsillo a la medida del botín. El ranking lo registra.',
  '%A el vaciado de %V se lee en el ranking sin necesidad de lupa. El ranking lo registra y sin segunda oportunidad en este mensaje.',
  '%A vs %V terminó con el aura de %V en manos de %A en cantidad seria. El ranking lo registra mientras el grupo tomaba nota del movimiento.',
  '%A cobró de %V como quien no deja el atraco a mitad de la gloria. El ranking lo registra con números que no admiten recurso de apelación.',
  'Robo de nivel: %A a costa de %V, resultado maestro, archivo listo. El ranking lo registra y el historial del comando queda de testigo.',
  '%A vs %V: 1-0 con peso real de aura a favor de quien atacó en serio. El ranking lo registra delante de quien miraba el ranking en ese momento.'
];

const ROB_PARCIAL = [
  '%A entró a por todo el aura de %V y salió con las manos medio llenas: botín parcial, sed intacta. Joder.',
  '%A le robó a %V solo una parte: suficiente para que se note, insuficiente para la gloria total. Mierda.',
  'Robo a medias: %A cobra algo de %V, %V se salva de lo peor, el chat ve el término medio. El ranking lo registra.',
  '%A vs %V terminó con botín incompleto: %A no se queja del todo, %V tampoco respira tranquilo. Cabrón.',
  '%A se llevó un trozo del aura de %V: el resto se quedó por falta de empuje o de suerte. El ranking lo registra.',
  'Atraco parcial de %A a %V: el contador se mueve, pero no del todo a favor de nadie. El ranking lo registra.',
  '%A no vació a %V: lo dejó cojo de aura. Cojo duele igual. El ranking lo registra y sin segunda oportunidad en este mensaje.',
  '%A vs %V: botín a medias, drama a medias, resultado legible en el ranking. El ranking lo registra mientras el grupo tomaba nota del movimiento.',
  '%A cobró de %V menos de lo que soñó y más de lo que %V quería soltar. El ranking lo registra con números que no admiten recurso de apelación.',
  'Robo incompleto: %A con algo en el bolsillo, %V con menos, ninguno del todo contento. El ranking lo registra.',
  '%A entró a por el pack completo de %V y salió con la mitad: la mitad ya duele. El ranking lo registra.',
  '%A el golpe a %V conectó a medias: el contador baja, no se desploma. El ranking lo registra con el sistema firmando debajo sin pedir aclaración.',
  '%A vs %V terminó con transfer parcial: suficiente para el mensaje, no para el exterminio. Fracasado.',
  '%A se llevó lo que pudo del aura de %V: lo que pudo no era todo. El ranking lo registra con el ranking como único testigo del resultado.',
  'Atraco a medias: %A no falla del todo, %V no se salva del todo. El ranking lo registra y el contador lo dejó por escrito sin debate.',
  '%A cobró un pedazo de %V: el pedazo se nota en el ranking. El ranking lo registra en el momento más visible del chat.',
  '%A vs %V: botín incompleto, cara de ambos de no estar satisfechos. El ranking lo registra sin que nadie pudiera fingir que no lo vio.',
  '%A no dejó a %V en cero: lo dejó en menos. Menos basta para este mensaje. El ranking lo registra con el parte del comando cerrado en firme.',
  'Robo parcial de %A: el aura de %V sangra, no se desangra. El ranking lo registra y sin segunda oportunidad en este mensaje.',
  '%A entró a por todo y el todo no cupo: salió con una parte de %V. El ranking lo registra mientras el grupo tomaba nota del movimiento.',
  '%A vs %V terminó con el contador en movimiento moderado a favor de %A. El ranking lo registra con números que no admiten recurso de apelación.',
  '%A se llevó un trozo legible del aura de %V: legible duele. El ranking lo registra y el historial del comando queda de testigo.',
  '%A el golpe fue suficiente para marcar y insuficiente para cerrar el libro de %V. El ranking lo registra.',
  '%A vs %V: media ración de botín, media ración de drama. El ranking lo registra con el sistema firmando debajo sin pedir aclaración.',
  '%A cobró de %V lo que el timing y la defensa dejaron pasar. El ranking lo registra delante de todo el hilo y sin posibilidad de borrado.',
  'Robo a medias: %A con botín parcial, %V con pérdida parcial, el grupo con el dato. El ranking lo registra.',
  '%A no vació la cuenta de %V: le hizo un agujero. El agujero se ve. El ranking lo registra y el contador lo dejó por escrito sin debate.',
  '%A vs %V terminó con transfer incompleto y mensaje completo. El ranking lo registra en el momento más visible del chat.',
  '%A se llevó lo que pudo: lo que pudo de %V ya no es de %V. El ranking lo registra sin que nadie pudiera fingir que no lo vio.',
  '%A el atraco a %V se quedó a mitad de camino del exterminio. El ranking lo registra con el parte del comando cerrado en firme.',
  '%A vs %V: botín sí, gloria total no, dolor de %V sí. El ranking lo registra y sin segunda oportunidad en este mensaje.',
  '%A cobró una parte del aura de %V: la parte que el ranking muestra a la baja. El ranking lo registra.',
  'Atraco parcial: %A no se va vacío, %V no se queda en cero. El ranking lo registra con números que no admiten recurso de apelación.',
  '%A entró a por el pack y salió con el snack: el snack era aura de %V. El ranking lo registra y el historial del comando queda de testigo.',
  '%A vs %V terminó con el contador en menos para %V sin llegar al suelo. El ranking lo registra delante de quien miraba el ranking en ese momento.',
  '%A se llevó un corte del aura de %V: el corte sangra en el ranking. El ranking lo registra con el sistema firmando debajo sin pedir aclaración.',
  '%A el golpe a %V no fue total: fue suficiente para este parte. El ranking lo registra delante de todo el hilo y sin posibilidad de borrado.',
  '%A vs %V: robo sí, masacre no, resultado legible sí. El ranking lo registra con el ranking como único testigo del resultado.',
  '%A cobró de %V a medias: las medias duelen cuando son aura. El ranking lo registra y el contador lo dejó por escrito sin debate.',
  'Robo incompleto de %A a costa de %V: el chat ve el movimiento parcial. El ranking lo registra en el momento más visible del chat.',
  '%A no dejó a %V en la ruina: lo dejó en la molestia grave. El ranking lo registra sin que nadie pudiera fingir que no lo vio.',
  '%A vs %V terminó con botín a favor de %A sin cerrar el capítulo de %V. El ranking lo registra con el parte del comando cerrado en firme.',
  '%A se llevó lo disponible en el momento: lo disponible era de %V. El ranking lo registra y sin segunda oportunidad en este mensaje.',
  '%A el atraco parcial a %V cuenta igual en el historial de ambos. El ranking lo registra mientras el grupo tomaba nota del movimiento.',
  '%A vs %V: media victoria de %A, media herida de %V. Y el grupo lo vio entero con números que no admiten recurso de apelación, patético.',
  '%A cobró un tramo del aura de %V: el tramo se nota al restar. El ranking lo registra y el historial del comando queda de testigo.',
  'Atraco a medias: %A con algo, %V con menos, ninguno en el extremo. El ranking lo registra delante de quien miraba el ranking en ese momento.',
  '%A entró a por todo el contador de %V y el contador solo bajó un tramo. El ranking lo registra con el sistema firmando debajo sin pedir aclaración.',
  '%A vs %V terminó con transfer parcial documentado en el ranking. El ranking lo registra delante de todo el hilo y sin posibilidad de borrado.',
  '%A se llevó un trozo: el trozo era aura de %V y ya no vuelve entero. El ranking lo registra con el ranking como único testigo del resultado.',
  '%A el golpe conectó a medias: %V sangra aura sin caer del ranking del todo. El ranking lo registra y el contador lo dejó por escrito sin debate.',
  '%A vs %V: botín incompleto, mensaje completo de que %A no falló del todo. El ranking lo registra en el momento más visible del chat.',
  '%A cobró de %V lo que la defensa no logró retener. Y el grupo lo vio entero sin que nadie pudiera fingir que no lo vio, joder.',
  'Robo parcial: %A no celebra el exterminio, celebra el movimiento del contador. El ranking lo registra.',
  '%A no vació a %V: lo dejó cojeando de aura. Cojear se ve. El ranking lo registra y sin segunda oportunidad en este mensaje.',
  '%A vs %V terminó con %A en más moderado y %V en menos moderado. El ranking lo registra mientras el grupo tomaba nota del movimiento.',
  '%A se llevó una parte legítima del aura de %V: legítima en el ranking. El ranking lo registra con números que no admiten recurso de apelación.',
  '%A el atraco a %V se quedó entre el almost y el pleno: en el medio que duele. El ranking lo registra.',
  '%A vs %V: media ración de gloria para %A, media de pérdida para %V. El ranking lo registra delante de quien miraba el ranking en ese momento.',
  '%A cobró el tramo que pudo del aura de %V en este intento. El ranking lo registra con el sistema firmando debajo sin pedir aclaración.',
  'Atraco incompleto de %A: suficiente para el parte, insuficiente para el mito. El ranking lo registra.',
  '%A entró a por el aura completa de %V y el universo le dio una parte. El ranking lo registra con el ranking como único testigo del resultado.',
  '%A vs %V terminó con el contador en movimiento a favor de %A sin sentencia final. El ranking lo registra.',
  '%A se llevó un corte limpio pero no total del aura de %V. El ranking lo registra en el momento más visible del chat.',
  '%A el golpe a %V marcó el ranking sin borrar a %V del mapa. El ranking lo registra sin que nadie pudiera fingir que no lo vio.',
  '%A vs %V: robo sí, ruina total no, dolor sí. Y el grupo lo vio entero con el parte del comando cerrado en firme, joder.',
  '%A cobró de %V a medias y el chat registró el medio sin duda. El ranking lo registra y sin segunda oportunidad en este mensaje.',
  'Robo a medias: %A con botín parcial en el bolsillo, %V con el hueco parcial. El ranking lo registra.',
  '%A no cerró el libro de %V: le arrancó un capítulo de aura. El ranking lo registra con números que no admiten recurso de apelación.',
  '%A vs %V terminó con transfer parcial y caras de no estar del todo satisfechos. El ranking lo registra.',
  '%A se llevó lo que el momento dejó pasar del aura de %V. El ranking lo registra delante de quien miraba el ranking en ese momento.',
  '%A el atraco parcial cuenta en el historial igual que uno pleno: duele distinto. El ranking lo registra.',
  '%A vs %V: media victoria, media herida, resultado legible. El ranking lo registra delante de todo el hilo y sin posibilidad de borrado.',
  '%A cobró un segmento del aura de %V: el segmento se resta en público. El ranking lo registra con el ranking como único testigo del resultado.',
  'Atraco parcial de %A a %V: el ranking no necesita el pleno para actualizar. El ranking lo registra y el contador lo dejó por escrito sin debate.',
  '%A entró a por todo y salió con una fracción: la fracción era de %V. El ranking lo registra en el momento más visible del chat.',
  '%A vs %V terminó con %A en más y %V en menos sin llegar a los extremos. El ranking lo registra sin que nadie pudiera fingir que no lo vio.',
  '%A se llevó un pedazo del aura de %V que el contador no devuelve solo. El ranking lo registra con el parte del comando cerrado en firme.',
  '%A el golpe fue medio: el efecto en %V no es medio del todo. El ranking lo registra y sin segunda oportunidad en este mensaje.',
  '%A vs %V: botín a medias, mensaje entero de que hubo robo. El ranking lo registra mientras el grupo tomaba nota del movimiento.',
  '%A cobró de %V lo que pudo en el intento: lo que pudo ya no es de %V. El ranking lo registra con números que no admiten recurso de apelación.',
  'Robo incompleto: %A no se va con las manos vacías, %V no se queda en cero. El ranking lo registra y el historial del comando queda de testigo.',
  '%A no masacró a %V: lo hirió de aura. La herida se ve en el ranking. El ranking lo registra delante de quien miraba el ranking en ese momento.',
  '%A se llevó un tramo del contador de %V: el tramo cambia el día de ambos. El ranking lo registra con el sistema firmando debajo sin pedir aclaración.',
  '%A el atraco a medias a %V basta para este parte del comando. El ranking lo registra delante de todo el hilo y sin posibilidad de borrado.',
  '%A vs %V: media gloria, media pérdida, cero duda de que %A cobró algo. El ranking lo registra con el ranking como único testigo del resultado.',
  '%A cobró una parte del aura de %V y el chat no discute la parte. El ranking lo registra y el contador lo dejó por escrito sin debate.',
  'Atraco a medias: %A con algo de botín, %V con algo de hueco. El ranking lo registra en el momento más visible del chat.',
  '%A entró a por el pack de %V y el pack no salió entero: salió un trozo. El ranking lo registra sin que nadie pudiera fingir que no lo vio.',
  '%A se llevó lo disponible sin llevarse el resto: lo disponible era de %V. El ranking lo registra con el parte del comando cerrado en firme.',
  '%A el golpe parcial a %V marca el historial de los dos. El ranking lo registra y sin segunda oportunidad en este mensaje.',
  '%A vs %V: robo real, botín incompleto, dolor real. Y el grupo lo vio entero mientras el grupo tomaba nota del movimiento, coño.',
  '%A cobró el tramo que la defensa de %V no retuvo del todo. El ranking lo registra con números que no admiten recurso de apelación.',
  'Robo parcial de %A: el aura de %V baja sin llegar al sótano. El ranking lo registra y el historial del comando queda de testigo.',
  '%A no dejó a %V en blanco: lo dejó en menos. El menos se lee. El ranking lo registra delante de quien miraba el ranking en ese momento.',
  '%A se llevó un corte del aura de %V suficiente para el mensaje. El ranking lo registra con el sistema firmando debajo sin pedir aclaración.',
  '%A el atraco incompleto a %V duele distinto al pleno: duele igual de público. El ranking lo registra.',
  '%A vs %V: media ración de todo, ración completa de que hubo robo. El ranking lo registra con el ranking como único testigo del resultado.',
  '%A cobró de %V una parte que el ranking muestra sin necesidad de pleno. El ranking lo registra y el contador lo dejó por escrito sin debate.'
];

const ROB_DESASTRE = [
  '%A salió a robar y acabó financiando a %V: el karma le pasó factura con intereses de aura delante de todo el hilo y sin posibilidad de borrado, joder.',
  '%A intentó el atraco y terminó pagando el aura de su propio bolsillo a favor de %V con el ranking como único testigo del cargo, mierda.',
  'Desastre total del intento: %A no solo falló, encima le dejó el aura a %V en bandeja y el contador lo dejó por escrito sin debate, coño.',
  '%A vs %V terminó con %A más pobre en el ranking y %V agradeciendo el regalo involuntario en el momento más visible del chat, cabrón.',
  '%A vino a cazar y salió cazado: %V cuenta el botín que al principio no era suyo sin que nadie pudiera fingir que no lo vio, gilipollas.',
  'El atraco de %A fue un donativo disfrazado de robo; %V no dijo que no al ingreso con el parte del comando cerrado a favor del resultado, patético.',
  '%A perdió el robo y el aura en el mismo ticket; %V ganó el día sin sudar el ataque y sin segunda oportunidad en este mensaje, asco.',
  'Desastre de %A: intentó quitar y terminó poniendo aura en la cuenta de %V mientras el grupo tomaba nota del movimiento, basura.',
  '%A firmó un cheque al portador a nombre de %V con la tinta de su propio fallo con números que no admiten recurso de apelación, ridículo.',
  '%A el plan salió tan mal que %V cobró peaje por el simple hecho de haber sido el objetivo, fracasado.',
  '%A vs %V: marcador final a favor de quien debía perder el aura según el guion de %A delante de todo el hilo y sin posibilidad de borrado, cutre.',
  '%A no solo falló el golpe: abrió la cartera y %V dijo gracias en silencio de ranking con el ranking como único testigo del cargo, joder.',
  'Desastre documentado: %A más ligero, %V más pesado de aura y el chat más contento y el contador lo dejó por escrito sin debate, mierda.',
  '%A salió a por el botín y volvió sin el suyo; %V sonríe con lo de los dos en el contador en el momento más visible del chat, coño.',
  '%A intentó robar a %V y terminó de patrocinador oficial de su aura en el ranking sin que nadie pudiera fingir que no lo vio, gilipollas.',
  'Desastre en limpio: %A en números rojos, %V en verde y el intento en el museo de fails con el parte del comando cerrado a favor del resultado, patético.',
  '%A puso la mano para quitar y la retiró dejando de más; %V no se queja del error y sin segunda oportunidad en este mensaje, asco.',
  '%A vs %V terminó en donación involuntaria con público completo en el hilo mientras el grupo tomaba nota del movimiento, basura.',
  '%A perdió el duelo del atraco y el del saldo; %V ni tenía que haber peleado de verdad con números que no admiten recurso de apelación, fracasado.',
  'Desastre de manual: autor %A, beneficiario %V y el grupo testigo de la limosna y el historial del comando queda de testigo, cutre.',
  '%A salió a cazar aura ajena y volvió dejando la propia en el plato de %V delante de todo el hilo y sin posibilidad de borrado, joder.',
  '%A el fallo no bastaba como castigo: hacía falta el peaje. %V lo cobró entero con el ranking como único testigo del cargo, mierda.',
  '%A vs %V: el ladrón pagó la cena y la propina del ranking ajeno y el contador lo dejó por escrito sin debate, coño.',
  '%A intentó el golpe de la semana y firmó la donación del mes a nombre de %V en el momento más visible del chat, cabrón.',
  '%A sin el botín de %V y sin el suyo; %V con ambos sonidos de caja en el contador sin que nadie pudiera fingir que no lo vio, asco.',
  '%A el plan era quitar: el resultado fue dar. %V aplaude en silencio de ranking con el parte del comando cerrado a favor del resultado, basura.',
  '%A vs %V terminó con el ranking más justo de lo que %A quería ver en pantalla y sin segunda oportunidad en este mensaje, ridículo.',
  '%A falló tan fuerte que el eco le cobró aura a favor de %V en el sistema mientras el grupo tomaba nota del movimiento, fracasado.',
  'Desastre: %A más pobre por intentar ser más rico a costa de %V y salir escaldado con números que no admiten recurso de apelación, cutre.',
  '%A vs %V: crónica de un donativo anunciado como robo en el comando y el historial del comando queda de testigo, coño.',
  '%A salió a vaciar a %V y terminó vaciándose él; el chat tomó nota del peaje delante de todo el hilo y sin posibilidad de borrado, cabrón.',
  '%A el karma contó el intento y pasó factura con el aura de %A hacia %V con el ranking como único testigo del cargo, gilipollas.',
  '%A intentó el atraco y %V terminó cobrando el servicio de haber sido el objetivo y el contador lo dejó por escrito sin debate, asco.',
  '%A vs %V en modo desastre: gana quien debía perder según el guion original de %A en el momento más visible del chat, basura.',
  '%A puso la trampa y pagó la fianza; %V recogió ambas cosas en el contador sin que nadie pudiera fingir que no lo vio, ridículo.',
  '%A sin gloria en el parte y con el saldo peor; %V con el día hecho en el ranking con el parte del comando cerrado a favor del resultado, fracasado.',
  'Desastre total: el aura de %A emigró hacia %V sin pedir asilo ni contrato de robo exitoso y sin segunda oportunidad en este mensaje, cutre.',
  '%A vs %V terminó con transfer automático por incompetencia documentada mientras el grupo tomaba nota del movimiento, mierda.',
  '%A el fail no era suficiente castigo: hacía falta el peaje. Cobrado a favor de %V con números que no admiten recurso de apelación, cabrón.',
  'Desastre documentado de %A a favor de %V: el ranking no discute el cargo y el historial del comando queda de testigo, gilipollas.',
  '%A intentó quitar y el sistema sumó en la columna de %V: matemáticas del desastre delante de todo el hilo y sin posibilidad de borrado, patético.',
  '%A vs %V: el ladrón pagó la entrada, la consumición y la propina del ranking ajeno con el ranking como único testigo del cargo, asco.',
  '%A perdió el robo, el aura y la cara; %V solo tenía que existir en el objetivo y el contador lo dejó por escrito sin debate, ridículo.',
  'Desastre: %A en modo patrocinador involuntario de %V en el contador del grupo en el momento más visible del chat, fracasado.',
  '%A vs %V terminó con el contador de %A en menos y el de %V en más sin debate sin que nadie pudiera fingir que no lo vio, joder.',
  '%A salió a por todo y volvió con menos de lo que tenía; %V agradece el ingreso con el parte del comando cerrado a favor del resultado, mierda.',
  'Desastre de %A: el botín viajó hacia %V con remitente el fallo del intento y sin segunda oportunidad en este mensaje, cabrón.',
  '%A intentó el golpe y terminó de cajero automático a favor de %V en el ranking mientras el grupo tomaba nota del movimiento, gilipollas.',
  '%A vs %V en una línea de acta: %A pagó. Punto y cierre del desastre con números que no admiten recurso de apelación, patético.',
  '%A sin el aura de %V y sin la suya completa; %V con el combo ganado sin atacar y el historial del comando queda de testigo, basura.',
  '%A puso el robo en el horno y se coció él; %V se comió el plato del ranking delante de todo el hilo y sin posibilidad de borrado, fracasado.',
  '%A el karma no negocia el peaje del fail: %V cobra en silencio de contador con el ranking como único testigo del cargo, cutre.',
  '%A vs %V terminó con el peaje más caro del día para la cuenta de %A y el contador lo dejó por escrito sin debate, joder.',
  '%A salió a vaciar bolsillos ajenos y terminó vaciando el suyo; %V testigo y cajero en el momento más visible del chat, mierda.',
  '%A el fallo con recargo: el recargo en aura a nombre de %V en el sistema sin que nadie pudiera fingir que no lo vio, coño.',
  'Desastre: %A más ligero, %V más contento y el chat más entretenido con el peaje con el parte del comando cerrado a favor del resultado, cabrón.',
  '%A intentó el atraco de oro y firmó la donación de bronce oxidado a %V y sin segunda oportunidad en este mensaje, gilipollas.',
  '%A vs %V: crónica breve de un transfer largo y doloroso para %A mientras el grupo tomaba nota del movimiento, patético.',
  '%A sin gloria en el parte y con el saldo empeorado; %V sin haber atacado de verdad con números que no admiten recurso de apelación, basura.',
  'Desastre de manual con factura visible: autor %A, beneficiario %V y el historial del comando queda de testigo, ridículo.',
  '%A vs %V terminó con el ranking corrigiendo a %A a la baja y a %V al alza delante de todo el hilo y sin posibilidad de borrado, cutre.',
  'Desastre: %A en rojo, %V en verde y el intento en el museo de fails del chat con el ranking como único testigo del cargo, coño.',
  '%A puso la mano para sacar y el sistema registró un ingreso a favor de %V y el contador lo dejó por escrito sin debate, cabrón.',
  '%A vs %V en modo donación involuntaria con público de pie en el hilo en el momento más visible del chat, gilipollas.',
  '%A firmó la factura del intento: beneficiario claro %V en el contador sin que nadie pudiera fingir que no lo vio, ridículo.',
  '%A vs %V terminó con el ranking haciendo justicia poética a costa de %A con el parte del comando cerrado a favor del resultado, fracasado.',
  '%A salió a cazar y volvió como trofeo de %V en el chat y en el número y sin segunda oportunidad en este mensaje, cutre.',
  'Desastre documentado: el aura de %A emigró con destino fijo a la cuenta de %V mientras el grupo tomaba nota del movimiento, mierda.',
  '%A vs %V: una línea de acta del bot — %A pagó el peaje del intento con números que no admiten recurso de apelación, cabrón.',
  '%A sin aura nueva y sin aura vieja completa; %V con el día resuelto en el ranking y el historial del comando queda de testigo, patético.',
  '%A puso el robo en marcha y la marcha era atrás; %V recibió igual el ingreso delante de todo el hilo y sin posibilidad de borrado, basura.',
  '%A vs %V en una frase: el intento costó aura a quien lo empezó con el ranking como único testigo del cargo, ridículo.',
  '%A el fail con intereses de demora: los intereses se llaman %V en el contador y el contador lo dejó por escrito sin debate, fracasado.',
  '%A sin el plan original y con el cargo original; %V con el aura del peaje en el momento más visible del chat, cutre.',
  'Desastre: %A más pobre por la ambición mal ejecutada contra %V sin que nadie pudiera fingir que no lo vio, joder.',
  '%A intentó el golpe y el golpe le hizo de cajero a favor de %V con el parte del comando cerrado a favor del resultado, mierda.',
  '%A vs %V terminó con transfer y sin una sola línea de gloria para %A y sin segunda oportunidad en este mensaje, coño.',
  '%A perdió el duelo del atraco y el del contador; %V sin ponerse los guantes mientras el grupo tomaba nota del movimiento, gilipollas.',
  '%A vs %V: ranking a la baja para %A, al alza para %V, sin debate útil con números que no admiten recurso de apelación, basura.',
  '%A el peaje del fail se cobró solo; %V fue el cajero que no pidió el puesto y el historial del comando queda de testigo, fracasado.',
  'Desastre documentado a favor de %V con autor intelectual %A en negrita delante de todo el hilo y sin posibilidad de borrado, cutre.',
  '%A intentó el atraco y terminó de mecenas involuntario de %V en el ranking con el ranking como único testigo del cargo, joder.',
  '%A vs %V en modo desastre limpio: sin duda del resultado ni del peaje y el contador lo dejó por escrito sin debate, mierda.',
  '%A sin gloria y con el saldo en menos; %V sin haber pedido nada del regalo en el momento más visible del chat, cabrón.',
  'Desastre total: %A financió a %V con el intento mismo de robarle el aura sin que nadie pudiera fingir que no lo vio, gilipollas.',
  '%A vs %V terminó con %A de patrocinador y %V de marca beneficiada con el parte del comando cerrado a favor del resultado, asco.',
  '%A perdió lo que quería ganar y lo que ya tenía; %V solo miró el ingreso y sin segunda oportunidad en este mensaje, ridículo.',
  '%A el universo no negocia el peaje del fail; %V cobra en silencio de contador mientras el grupo tomaba nota del movimiento, cutre.',
  '%A vs %V: crónica de un donativo con coreografía fallida de atraco con números que no admiten recurso de apelación, joder.',
  '%A salió a vaciar a %V y terminó en la cola del cajero al revés del ranking y el historial del comando queda de testigo, mierda.',
  '%A el fallo con recargo automático: recargo a nombre de %V en el sistema delante de todo el hilo y sin posibilidad de borrado, coño.',
  '%A intentó el golpe de oro y firmó el cargo de plomo a favor de %V con el ranking como único testigo del cargo, gilipollas.',
  '%A vs %V terminó con el contador de %A en dirección incorrecta del todo y el contador lo dejó por escrito sin debate, patético.',
  '%A sin botín propio ni ajeno; %V con el combo ganado sin atacar de verdad en el momento más visible del chat, basura.',
  'Desastre total documentado: %A deudor, %V acreedor y el grupo testigo del peaje sin que nadie pudiera fingir que no lo vio, ridículo.',
  '%A vs %V: el ladrón pagó la cena de los dos y la propina del ranking con el parte del comando cerrado a favor del resultado, cutre.',
  '%A salió a por el aura de %V y regaló la ruta de la suya hacia el otro contador y sin segunda oportunidad en este mensaje, joder.',
  '%A el karma cobró al contado; %V no rechazó el ingreso en el ranking mientras el grupo tomaba nota del movimiento, mierda.',
  'Desastre: %A en rojo por ambición y %V en verde por existir como objetivo con números que no admiten recurso de apelación, coño.',
  '%A firmó la factura del intento con beneficiario %V en el contador y el historial del comando queda de testigo, ridículo.',
  '%A intentó quitar y el universo usó la función sumar en la cuenta de %V delante de todo el hilo y sin posibilidad de borrado, coño.',
  '%A vs %V: una línea de acta — %A pagó el peaje del intento fallido con el ranking como único testigo del cargo, cabrón.',
  '%A sin aura nueva y sin la vieja completa; %V con el día resuelto en el ranking y el contador lo dejó por escrito sin debate, patético.',
  '%A puso el robo en marcha atrás sin querer; %V recibió el ingreso igual en el momento más visible del chat, basura.',
  '%A el fail con intereses: los intereses se llaman %V en el contador del grupo sin que nadie pudiera fingir que no lo vio, fracasado.',
  'Desastre: %A más pobre por querer ser más rico a costa de %V y salir escaldado con el parte del comando cerrado a favor del resultado, joder.',
  '%A vs %V: ranking a la baja para %A y al alza para %V, sin debate posible y sin segunda oportunidad en este mensaje, basura.'
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
