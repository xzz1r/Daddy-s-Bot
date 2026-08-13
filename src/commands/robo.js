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
  '%A le roba el aura a %V en plena cara del grupo. Limpio, visible y con la cara de %V de "me cago en todo", joder.',
  '%A entró a por el aura de %V y salió con ella en el contador. El chat no necesita narrador ni subtítulos de mierda, mierda.',
  'Robo limpio de %A a %V: el aura cambió de dueño y el ranking lo registró sin pedir permiso a nadie, coño.',
  '%A vs %V: gana el que atacó. %V se defendió como se defiende un puto inutil: mal, tarde y con cara de gilipollas, cabrón.',
  '%A vació lo que pudo del aura de %V. Suficiente para que se note en el contador y en la puta cara del pobre, gilipollas.',
  'El atraco de %A a %V salió redondo: botín en mano, víctima mirando el hueco como quien mira la cuenta en rojo, patético.',
  '%A no pidió permiso a nadie. Se llevó el aura de %V y dejó el recibo colgado en este mensaje de mierda, asco.',
  'Robo a favor de %A: %V pierde aura y la cara a la vez. Doble cargo, una sola operación de puta madre, basura.',
  '%A ejecutó el golpe a %V con la calma de quien ya había contado el botín. Frío, exacto y sin propina, ridículo.',
  '%A vs %V terminó con el contador de %A en más y el de %V en menos. Aritmética cruel de puta madre, fracasado.',
  '%A le quitó el aura a %V delante de todos. No hubo modo avión ni silencio de mierda que ocultara el cargo, cutre.',
  'El plan de %A funcionó de punta a punta. El de %V no existió. Resultado firmado en el ranking, joder.',
  '%A salió a cazar y volvió con el trofeo. El trofeo se llama aura de %V y pesa en el contador, mierda.',
  'Robo limpio: %A cobra, %V paga y el grupo presencia el transfer sin filtro ni consuelo de mierda, coño.',
  '%A no improvisó el final. El aura de %V ya estaba en la lista de la compra desde el primer mensaje, cabrón.',
  '%A vs %V: el ladrón ganó el único round que importa. El resto es ruido de la víctima ofendida, gilipollas.',
  '%A se llevó el aura de %V con la precisión de quien no falla el momento ni el objetivo de mierda, patético.',
  'Atraco exitoso: %A sonríe con el botín y %V cuenta lo que ya no tiene. Matemática del robo, asco, y el grupo se cagó de risa en silencio.',
  '%A entró, cobró el aura de %V y salió antes de que el drama de %V creciera de más en el hilo, basura.',
  '%A el golpe a %V conectó donde tenía que conectar. El contador actualiza solo, sin pedir confirmación, ridículo.',
  '%A le robó a %V en el timing perfecto. Ni antes ni después: ahora. Y se nota en el ranking, fracasado.',
  'Robo a cara descubierta: %A no se escondió y %V no se salvó del cargo. Luz de chat completa, cutre, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el botín en el bolsillo correcto del sistema: el de %A, joder, y el grupo se cagó de risa en silencio.',
  '%A dejó a %V mirando el hueco del contador donde antes había aura contada unidad por unidad, mierda.',
  '%A ejecutó el atraco a %V sin pedir aplauso. El contador aplaude por él en números fríos, coño, y el grupo se cagó de risa en silencio.',
  'El aura de %V cambió de manos en público. Las manos son las de %A y el ranking lo firma sin dudar, cabrón.',
  '%A no solo intentó el golpe: cobró. %V no solo se defendió: perdió. Crónica corta de puta madre, gilipollas.',
  '%A vs %V: crónica de un robo que sí se ejecutó y se puede leer en el ranking sin lupa, patético, y el grupo se cagó de risa en silencio.',
  '%A se llevó lo suyo de la cuenta de %V. Definición operativa de atraco exitoso sin poesía de mierda, asco.',
  '%A cazó el aura de %V cuando %V menos lo tenía en la agenda del día. Timing de carnicero, ridículo, y el grupo se cagó de risa en silencio.',
  '%A el botín de %V ya no es de %V. El ranking no discute el cargo ni ofrece recurso de apelación, fracasado.',
  '%A vs %V terminó 1-0 con el 1 en la columna del que atacó bien y cobró sin temblar, cutre, y el grupo se cagó de risa en silencio.',
  '%A le dejó a %V el recibo del robo en forma de mensaje de este comando. Sin sobre ni sello, mierda, y el grupo se cagó de risa en silencio.',
  'Atraco redondo: %A cobra, %V aprende la lección y el chat archiva el resultado sin debate, coño, y el grupo se cagó de risa en silencio.',
  '%A no falló el timing ni la puntería del golpe. %V falló la defensa del ranking completo, cabrón, y el grupo se cagó de risa en silencio.',
  '%A vs %V: el aura viajó en la dirección que %A había marcado en la lista de la compra, gilipollas, y el grupo se cagó de risa en silencio.',
  '%A se llevó el botín de %V sin pedir la palabra en el grupo ni devolver una sola unidad, patético, y el grupo se cagó de risa en silencio.',
  'Robo exitoso de %A a costa de %V: visible, medible y archivado en el historial del comando, asco, y el grupo se cagó de risa en silencio.',
  '%A ejecutó el golpe con la lista de la compra cerrada. Aura de %V: marcada y cobrada, basura, y el grupo se cagó de risa en silencio.',
  '%A el contador de %V bajó. El de %A subió. Aritmética del atraco sin poesía ni consuelo, ridículo, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con %A contando botín y %V restando aura en silencio de ranking, fracasado, y el grupo se cagó de risa en silencio.',
  '%A no dejó el atraco en almost eterno. Lo cerró con botín de %V en su cuenta del sistema, cutre, y el grupo se cagó de risa en silencio.',
  '%A se llevó el aura de %V en el momento exacto en que el chat miraba el hilo, joder, y el grupo se cagó de risa en silencio.',
  '%A vs %V: gana quien no se quedó mirando el aura propia mientras se la llevaban, coño, y el grupo se cagó de risa en silencio.',
  '%A cobró de %V lo que %V no pensaba soltar. El ranking insiste en el cargo sin piedad, cabrón, y el grupo se cagó de risa en silencio.',
  '%A el golpe a %V fue corto, claro y suficiente para mover el contador de una vez, gilipollas, y el grupo se cagó de risa en silencio.',
  '%A entró, tomó el aura de %V y dejó el hueco de recuerdo en el perfil del ranking, patético, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el botín en movimiento y destino claro: la cuenta de %A, asco, y el grupo se cagó de risa en silencio.',
  '%A no pidió suerte de principiante: ejecutó. %V no tuvo defensa suficiente ni de cerca, basura, y el grupo se cagó de risa en silencio.',
  'Atraco a favor de %A: %V en el parte como quien pierde aura en público y se nota, ridículo, y el grupo se cagó de risa en silencio.',
  '%A se llevó lo marcado de la cuenta de %V sin letra pequeña ni segunda oportunidad, fracasado, y el grupo se cagó de risa en silencio.',
  '%A el plan contra %V salió como en la pizarra. Aura de %V en su columna del ranking, cutre, y el grupo se cagó de risa en silencio.',
  '%A vs %V: el ladrón no solo intentó, cobró y se fue con el botín bajo el brazo, joder, y el grupo se cagó de risa en silencio.',
  '%A robó el aura de %V con la calma de un trámite ya resuelto en el sistema del bot, mierda, y el grupo se cagó de risa en silencio.',
  'Robo exitoso: %A con el botín, %V con la lección y el grupo con el dato del ranking, coño, y el grupo se cagó de risa en silencio.',
  '%A no dejó espacio al drama largo de %V. Primero el golpe, luego este mensaje de recibo, cabrón, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó 1-0 en el único marcador que importa aquí: el del aura del comando, gilipollas, y el grupo se cagó de risa en silencio.',
  '%A cazó a %V en el ranking y el contador firmó el resultado sin pedir segunda opinión, patético, y el grupo se cagó de risa en silencio.',
  '%A el aura de %V viajó sin billete de vuelta ni posibilidad de reembolso en el sistema, asco, y el grupo se cagó de risa en silencio.',
  '%A ejecutó el atraco a %V como quien cobra una deuda pendiente con intereses de demora, basura, y el grupo se cagó de risa en silencio.',
  '%A vs %V: crónica de un golpe que sí aterrizó en el contador y se puede leer, fracasado, y el grupo se cagó de risa en silencio.',
  '%A se llevó el botín de %V y el chat no pidió repetición. Se vio claro a la primera, cutre, y el grupo se cagó de risa en silencio.',
  '%A el contador no miente en este caso: %V menos, %A más, punto final del parte, joder, y el grupo se cagó de risa en silencio.',
  '%A entró a por el aura de %V y no salió de vacío ni de almost eterno esta vez, mierda, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el ranking actualizado a favor del atacante sin debate útil, coño, y el grupo se cagó de risa en silencio.',
  '%A cobró el aura de %V en el timing que %V no esperaba ni había agendado en el día, cabrón, y el grupo se cagó de risa en silencio.',
  'Atraco redondo: %A no falló, %V no se salvó y el grupo no dudó del resultado ni un segundo, gilipollas.',
  '%A se llevó lo suyo del bolsillo de %V. Definición corta y operativa del atraco exitoso, patético, y el grupo se cagó de risa en silencio.',
  '%A el golpe fue suficiente. El aura de %V lo nota y el ranking también lo muestra sin filtro, asco, y el grupo se cagó de risa en silencio.',
  '%A vs %V: gana %A. El resto es ruido de la defensa que no llegó a tiempo ni de cerca, basura, y el grupo se cagó de risa en silencio.',
  '%A robó a %V sin pedir la palabra en el hilo y sin devolver una sola unidad de aura, ridículo, y el grupo se cagó de risa en silencio.',
  'Robo exitoso de %A: el botín de %V cambió de manos en público y queda firmado en el ranking, fracasado.',
  '%A ejecutó, cobró y dejó a %V con el hueco del contador y este mensaje de recibo, cutre, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el transfer en la dirección correcta para %A y visible para todos, joder, y el grupo se cagó de risa en silencio.',
  '%A no improvisó el final del atraco. El aura de %V ya estaba contada a su favor desde antes, mierda.',
  '%A el atraco a %V salió limpio de fallos y lleno de botín ajeno en el contador del comando, coño, y el grupo se cagó de risa en silencio.',
  '%A se llevó el aura de %V mientras el chat tomaba nota del movimiento en el ranking, cabrón, y el grupo se cagó de risa en silencio.',
  'Robo limpio: %A cobra en silencio de víctima y %V en ruido de queja que no cambia el número, gilipollas.',
  '%A vs %V: el marcador final del aura no admite debate ni recurso de apelación posible, patético, y el grupo se cagó de risa en silencio.',
  '%A entró a por %V y salió con el contador a favor y el parte cerrado en el sistema, asco, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con %A en más y %V en el parte de bajas de aura del día, ridículo, y el grupo se cagó de risa en silencio.',
  '%A robó el aura de %V con la precisión de quien no necesita segunda oportunidad en el comando, fracasado.',
  '%A se llevó el botín de %V sin pedir disculpas al contador ni permiso al grupo entero, joder, y el grupo se cagó de risa en silencio.',
  '%A el plan contra %V funcionó de principio a fin del intento de atraco sin un solo fallo, mierda, y el grupo se cagó de risa en silencio.',
  '%A vs %V: crónica corta de un robo largo para el contador de %V y dulce para %A, coño, y el grupo se cagó de risa en silencio.',
  '%A cobró de %V lo marcado en la lista. El ranking confirma el cargo sin dudar ni un tick, cabrón, y el grupo se cagó de risa en silencio.',
  'Robo exitoso: %A con aura nueva en la cuenta y %V con el hueco documentado en el perfil, gilipollas.',
  '%A ejecutó el atraco a %V en el momento en que más dolía soltar el aura contada, patético, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó 1-0 sin prórroga. El 1 es de %A y el 0 de la defensa insuficiente, asco, y el grupo se cagó de risa en silencio.',
  '%A se llevó el aura de %V y dejó el recibo colgado en este hilo del chat para siempre, basura, y el grupo se cagó de risa en silencio.',
  '%A el botín de %V ya tiene dueño nuevo. El ranking lo nombra sin pedir confirmación a nadie, ridículo.',
  '%A vs %V: gana quien atacó con el contador a favor y cerró el parte sin temblar, fracasado, y el grupo se cagó de risa en silencio.',
  '%A robó a %V en plena luz del chat. Sin sombra útil que tape el cargo del ranking, cutre, y el grupo se cagó de risa en silencio.',
  'Robo limpio de %A a costa de %V: medible, visible y archivado en el historial del comando, joder, y el grupo se cagó de risa en silencio.',
  '%A entró, cobró el aura de %V y salió con el trabajo del atraco hecho de una vez, mierda, y el grupo se cagó de risa en silencio.',
  '%A el golpe fue corto en segundos y largo en efecto sobre el contador de %V, coño, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el transfer firmado a favor de %A en el sistema del bot, cabrón, y el grupo se cagó de risa en silencio.',
  '%A no dejó el atraco a medias. Cerró con el aura de %V en su cuenta del ranking, gilipollas, y el grupo se cagó de risa en silencio.',
  '%A se llevó lo que %V no pensaba soltar. El ranking insiste en el cargo sin piedad ni descuento, patético.',
  'Atraco redondo: %A ejecuta, %V paga y el grupo presencia el cambio de dueño en vivo, asco, y el grupo se cagó de risa en silencio.',
  '%A cobró el aura de %V con la calma de un trámite ya cerrado en el sistema, ridículo, y el grupo se cagó de risa en silencio.',
  '%A el contador de %V bajó en público. No hay modo avión que oculte el número del cargo, fracasado, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con %A contando botín y %V contando pérdidas en silencio de ranking, cutre, y el grupo se cagó de risa en silencio.',
  '%A robó a %V sin pedir la palabra y sin devolver ni una unidad del botín cobrado, joder, y el grupo se cagó de risa en silencio.',
  'Robo exitoso de %A: el aura de %V cambió de manos sin letra pequeña ni recurso posible, mierda, y el grupo se cagó de risa en silencio.',
  '%A ejecutó el golpe a %V como quien marca una casilla pendiente del ranking y pasa página, coño, y el grupo se cagó de risa en silencio.',
  '%A vs %V: crónica de un atraco que no se quedó en intento ni en almost eterno, cabrón, y el grupo se cagó de risa en silencio.',
  '%A se llevó el botín de %V delante de quienes miraban el ranking en ese preciso momento, gilipollas.',
  '%A el plan salió. El aura de %V no se salvó del cargo en el contador del comando, patético, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó 1-0 en aura. El resto del mensaje es comentario de relleno, asco, y el grupo se cagó de risa en silencio.',
  '%A entró a por el aura de %V y cumplió el objetivo del comando en el ranking sin fallar, basura, y el grupo se cagó de risa en silencio.',
  '%A cobró de %V en el timing que no perdona ni avisa dos veces seguidas al objetivo, ridículo, y el grupo se cagó de risa en silencio.',
  'Robo limpio: %A con el botín, %V con el hueco y el chat con el dato del transfer, fracasado, y el grupo se cagó de risa en silencio.',
  '%A vs %V: gana %A por ejecución limpia y pierde %V por defensa insuficiente de ranking, cutre, y el grupo se cagó de risa en silencio.',
  '%A se llevó el aura de %V y el recibo quedó colgado en este hilo para quien quiera leerlo, joder, y el grupo se cagó de risa en silencio.',
  '%A el golpe a %V aterrizó. El ranking no pide segunda opinión ni VAR ni narrador, mierda, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el transfer en dirección %A y visible para todo el grupo del chat, coño, y el grupo se cagó de risa en silencio.',
  '%A robó a %V en el momento exacto. Ni un segundo antes ni uno después del timing perfecto, cabrón, y el grupo se cagó de risa en silencio.',
  'Atraco a favor de %A: %V en el parte de pérdidas y el aura en otra cuenta del sistema, gilipollas, y el grupo se cagó de risa en silencio.',
  '%A ejecutó, cobró y dejó a %V con la cara del contador en menos y este mensaje de recibo, patético, y el grupo se cagó de risa en silencio.',
  '%A vs %V: el botín se movió y el debate útil no hace falta en el hilo del grupo, asco, y el grupo se cagó de risa en silencio.',
  '%A se llevó lo marcado del aura de %V sin pedir confirmación al sistema ni al chat, basura, y el grupo se cagó de risa en silencio.',
  '%A el atraco a %V fue limpio de fallos y sucio de botín ajeno en el contador, ridículo, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con %A en verde y %V en el hueco del ranking del comando, fracasado, y el grupo se cagó de risa en silencio.',
  '%A robó el aura de %V con público y sin remordimiento de contador ni de conciencia, cutre, y el grupo se cagó de risa en silencio.',
  '%A entró a por %V y salió con el objetivo del comando cumplido en números del sistema, mierda, y el grupo se cagó de risa en silencio.',
  '%A el golpe fue suficiente para que %V lo note el resto de la sesión del chat entero, coño, y el grupo se cagó de risa en silencio.',
  '%A vs %V: 1-0 sin VAR, sin prórroga y con botín a nombre de %A en el ranking, cabrón, y el grupo se cagó de risa en silencio.',
  '%A cobró el aura de %V y el chat archivó el resultado sin pedir amplificación ni bis, gilipollas, y el grupo se cagó de risa en silencio.',
  '%A se llevó el botín de %V en el timing del que no avisa ni pide permiso al objetivo, patético, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el ranking a favor del que atacó bien y cobró sin temblar, asco, y el grupo se cagó de risa en silencio.',
  '%A ejecutó el atraco a %V como un cobro pendiente saldado en el sistema del bot, basura, y el grupo se cagó de risa en silencio.',
  'Robo limpio de %A: el aura de %V viajó sin billete de retorno ni reembolso posible, ridículo, y el grupo se cagó de risa en silencio.',
  '%A vs %V: crónica corta y botín largo para la cuenta de %A en el ranking del grupo, fracasado, y el grupo se cagó de risa en silencio.',
  '%A se llevó el aura de %V mientras %V todavía contaba la unidad anterior del contador, cutre, y el grupo se cagó de risa en silencio.',
  '%A el contador no miente en este parte: %A más, %V menos, punto final del acta, joder, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el transfer visible y el debate inútil sobrando en el hilo, mierda, y el grupo se cagó de risa en silencio.',
  '%A robó a %V sin sombra que oculte el cargo. Luz de chat completa sobre el movimiento, coño, y el grupo se cagó de risa en silencio.',
  'Atraco redondo a favor de %A: cobra el aura de %V en un solo movimiento limpio del comando, cabrón, y el grupo se cagó de risa en silencio.',
  '%A ejecutó el golpe a %V y el ranking firmó debajo sin pedir aclaración a nadie, gilipollas, y el grupo se cagó de risa en silencio.',
  '%A vs %V: gana quien no se quedó con las manos vacías al final del round del atraco, patético, y el grupo se cagó de risa en silencio.',
  '%A se llevó el botín de %V y dejó el mensaje como único recibo del cargo en el hilo, asco, y el grupo se cagó de risa en silencio.',
  '%A el plan contra %V funcionó. El aura cambió de dueño en el contador del ranking, basura, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó 1-0 en el marcador del aura y el archivo quedó cerrado sin recurso, ridículo, y el grupo se cagó de risa en silencio.',
  '%A cobró de %V lo que el ranking ahora muestra a su favor sin filtro ni modo privado, fracasado, y el grupo se cagó de risa en silencio.',
  'Robo exitoso de %A a costa de %V: sin asterisco que lo relativice ni consuelo posible, cutre, y el grupo se cagó de risa en silencio.',
  '%A entró a por el aura de %V y no aceptó un no del contador como respuesta del sistema, joder, y el grupo se cagó de risa en silencio.',
  '%A el golpe a %V fue corto en el reloj y largo en el efecto del ranking del grupo, mierda, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con %A en el lado correcto del transfer de aura del comando, coño, y el grupo se cagó de risa en silencio.',
  '%A robó el aura de %V en plena sesión de chat. Sin pausa ni aviso previo al objetivo, cabrón, y el grupo se cagó de risa en silencio.',
  '%A vs %V: el ladrón cerró el parte antes de que la víctima terminara de quejarse en el hilo, patético.',
  '%A ejecutó el atraco a %V con lista cerrada. Botín marcado y botín cobrado en el contador, asco, y el grupo se cagó de risa en silencio.',
  'Robo limpio: %A con aura de %V, %V con el hueco y el grupo con la foto del ranking, basura, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el contador actualizado y el debate cerrado por los números fríos, ridículo, y el grupo se cagó de risa en silencio.',
  '%A se llevó el aura de %V cuando más se notaba soltarla en el ranking del grupo, fracasado, y el grupo se cagó de risa en silencio.',
  '%A el botín de %V cambió de manos. Las manos de %A no tiemblan en el contador del comando, cutre, y el grupo se cagó de risa en silencio.',
  '%A vs %V: 1-0 a favor de quien no falló el golpe del atraco en esta tirada, joder, y el grupo se cagó de risa en silencio.',
  '%A cobró el aura de %V y dejó el hueco como recuerdo visible en el perfil del ranking, mierda, y el grupo se cagó de risa en silencio.',
  '%A ejecutó, %V pagó y el chat presenció. Robo completo sin asteriscos ni consuelo, cabrón, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el transfer en firme a nombre de %A en el sistema del bot, gilipollas, y el grupo se cagó de risa en silencio.',
  '%A robó a %V sin pedir turno de palabra en el grupo ni devolver el botín cobrado, patético, y el grupo se cagó de risa en silencio.',
  '%A el golpe a %V aterrizó en el aura. El resto del mensaje es ruido de fondo del hilo, asco, y el grupo se cagó de risa en silencio.',
  '%A vs %V: crónica de un atraco con final de botín a favor de %A en el ranking, basura, y el grupo se cagó de risa en silencio.',
  '%A se llevó el aura de %V en el momento que el ranking no perdona ni suaviza el cargo, ridículo, y el grupo se cagó de risa en silencio.',
  'Robo exitoso: %A cierra, %V abre el hueco y el grupo archiva el resultado sin debate, fracasado, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó 1-0 sin necesidad de amplificación ni narrador extra en el chat, cutre, y el grupo se cagó de risa en silencio.',
  '%A cobró de %V el aura que ahora figura en su columna del ranking del grupo, joder, y el grupo se cagó de risa en silencio.',
  '%A el plan salió. %V no se salvó. El contador quedó de testigo del cargo en el sistema, mierda, y el grupo se cagó de risa en silencio.',
  '%A vs %V: gana %A por ejecución limpia del atraco y pierde %V por no retener el aura, coño, y el grupo se cagó de risa en silencio.',
  '%A se llevó el botín de %V delante de quien quisiera mirar el hilo en ese momento, cabrón, y el grupo se cagó de risa en silencio.',
  '%A ejecutó el atraco a %V como quien marca una casilla y pasa a la siguiente del ranking, gilipollas.',
  '%A vs %V terminó con el aura de %V en tránsito hacia la cuenta de %A en el sistema, patético, y el grupo se cagó de risa en silencio.',
  '%A robó el aura de %V con la precisión de un cobro ya calculado de antemano en la cabeza, asco, y el grupo se cagó de risa en silencio.',
  '%A vs %V: el marcador del aura no admite empate en este resultado del comando, ridículo, y el grupo se cagó de risa en silencio.',
  '%A el golpe fue suficiente. %V lo nota y el ranking lo muestra sin filtro ni consuelo, cutre, y el grupo se cagó de risa en silencio.',
  '%A cobró el aura de %V y el chat no pidió repetición. Se vio de sobra a la primera, mierda, y el grupo se cagó de risa en silencio.',
  'Atraco redondo a favor de %A: %V en el hueco documentado del contador del comando, coño, y el grupo se cagó de risa en silencio.',
  '%A se llevó lo marcado de %V sin letra pequeña ni segunda oportunidad del sistema, cabrón, y el grupo se cagó de risa en silencio.',
  '%A vs %V: el ladrón ganó el round que importaba al contador de aura del ranking, gilipollas, y el grupo se cagó de risa en silencio.',
  '%A ejecutó el atraco a %V en el timing del que no avisa dos veces seguidas al objetivo, patético, y el grupo se cagó de risa en silencio.',
  '%A el aura de %V viajó. Destino: cuenta de %A. Billete sin retorno posible en el sistema, asco, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó 1-0 en aura. Archivo cerrado y siguiente ronda cuando toque, basura, y el grupo se cagó de risa en silencio.',
  '%A robó a %V en luz de chat completa. Sin sombra útil para la víctima del cargo del ranking, ridículo.',
  '%A se llevó el botín de %V con la calma de quien ya había contado el premio de antemano, cutre, y el grupo se cagó de risa en silencio.',
  '%A vs %V: crónica corta de un transfer largo para el contador de %V en el ranking, joder, y el grupo se cagó de risa en silencio.',
  '%A cobró de %V lo que ahora pesa en su favor en el ranking del grupo del chat, mierda, y el grupo se cagó de risa en silencio.',
  '%A el golpe a %V conectó. No hace falta cámara lenta ni narrador emocional del comando, coño, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el botín en el bolsillo de %A y el hueco en el de %V, cabrón, y el grupo se cagó de risa en silencio.',
  '%A entró a por el aura de %V y cerró el parte a su favor en el sistema del bot, gilipollas, y el grupo se cagó de risa en silencio.',
  '%A ejecutó el atraco sin almost. %V sin defensa suficiente para retener el aura, patético, y el grupo se cagó de risa en silencio.',
  '%A vs %V: 1-0 sin prórroga y con aura en movimiento hacia %A en el ranking, asco, y el grupo se cagó de risa en silencio.',
  '%A se llevó el aura de %V y dejó el hueco como firma visible en el perfil del ranking, basura, y el grupo se cagó de risa en silencio.',
  'Robo limpio: %A con el resultado, %V con la pérdida y el grupo con el dato del transfer, ridículo, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el ranking firmando a favor de %A sin pedir aclaración a nadie, fracasado, y el grupo se cagó de risa en silencio.',
  '%A cobró el aura de %V en el momento exacto del comando y del hilo del grupo, cutre, y el grupo se cagó de risa en silencio.',
  '%A el plan contra %V no se quedó en la pizarra. Se cobró en el contador del ranking, joder, y el grupo se cagó de risa en silencio.',
  '%A vs %V: gana quien atacó y cobró, pierde quien defendió mal el aura del ranking, mierda, y el grupo se cagó de risa en silencio.',
  '%A ejecutó el atraco a %V como un cobro de deuda que %V no reconocía ni quería pagar, cabrón, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el transfer visible en el ranking y sin recurso de apelación, gilipollas, y el grupo se cagó de risa en silencio.',
  '%A robó el aura de %V y el chat archivó el resultado sin debate útil posible en el hilo, patético, y el grupo se cagó de risa en silencio.',
  'Atraco a favor de %A: %V en pérdidas y el aura en otra columna del sistema del bot, asco, y el grupo se cagó de risa en silencio.',
  '%A se llevó lo suyo del aura de %V. Operativa de atraco exitoso sin maquillaje ni consuelo, basura, y el grupo se cagó de risa en silencio.',
  '%A vs %V: el ladrón cerró antes de que la queja de %V terminara de escribirse en el chat, ridículo, y el grupo se cagó de risa en silencio.',
  '%A cobró de %V en público. El ranking no ofrece modo privado para el cargo del comando, fracasado, y el grupo se cagó de risa en silencio.',
  '%A el golpe a %V fue limpio. El efecto en el contador, sucio para %V y dulce para %A, cutre, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó 1-0 con el botín en movimiento hacia la cuenta de %A en el ranking, joder, y el grupo se cagó de risa en silencio.',
  '%A entró a por %V y cumplió. El aura cambió de dueño en el ranking del grupo, mierda, y el grupo se cagó de risa en silencio.',
  'Robo exitoso de %A a costa de %V: sin relativizar y con números a la vista de todos, coño, y el grupo se cagó de risa en silencio.',
  '%A ejecutó, cobró y dejó a %V con el mensaje de recibo y el hueco del contador, cabrón, y el grupo se cagó de risa en silencio.',
  '%A se llevó el aura de %V en el timing que el ranking registra sin piedad ni descuento, patético, y el grupo se cagó de risa en silencio.',
  '%A robó a %V sin almost y sin devolución posible del botín cobrado en el ranking, ridículo, y el grupo se cagó de risa en silencio.',
  'Robo limpio: %A cierra el parte, %V abre el hueco y el grupo lo ve en el ranking, fracasado, y el grupo se cagó de risa en silencio.',
  '%A vs %V: 1-0 en el único marcador que el comando reconoce de verdad en el chat, cutre, y el grupo se cagó de risa en silencio.',
  '%A cobró el aura de %V y dejó el recibo colgado en este hilo del chat para el archivo, joder, y el grupo se cagó de risa en silencio.',
  '%A el plan salió redondo. El aura de %V no tuvo billete de vuelta al contador del ranking, mierda, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el ranking actualizado y el debate sobrando en el hilo del grupo, coño, y el grupo se cagó de risa en silencio.',
  '%A ejecutó el atraco a %V como quien salda una línea pendiente del sistema del bot, gilipollas, y el grupo se cagó de risa en silencio.',
  '%A vs %V: gana %A, pierde %V y el aura no se discute en el chat del grupo, patético, y el grupo se cagó de risa en silencio.',
  '%A robó el aura de %V con precisión de cobro ya calculado de antemano en la lista, asco, y el grupo se cagó de risa en silencio.',
  'Atraco redondo: %A con el resultado en el contador y %V con la pérdida a la vista, basura, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el transfer en firme y sin VAR que lo cambie en el ranking, ridículo, y el grupo se cagó de risa en silencio.',
  '%A el golpe a %V aterrizó donde más dolía: el contador del ranking del comando, cutre, y el grupo se cagó de risa en silencio.',
  '%A vs %V: 1-0 sin prórroga y con botín a nombre de %A en el sistema del bot, joder, y el grupo se cagó de risa en silencio.',
  '%A cobró de %V lo que el ranking ahora muestra sin filtro ni modo privado posible, mierda, y el grupo se cagó de risa en silencio.',
  '%A ejecutó el atraco a %V y el chat no pidió segunda toma del golpe ni del recibo, cabrón, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con %A contando y %V restando en silencio de ranking del grupo, gilipollas, y el grupo se cagó de risa en silencio.',
  '%A se llevó lo marcado del aura de %V. Casilla cobrada en el sistema del comando, patético, y el grupo se cagó de risa en silencio.',
  '%A el plan contra %V funcionó de punta a punta del intento de atraco sin un fallo, asco, y el grupo se cagó de risa en silencio.',
  '%A vs %V: el ladrón ganó el round del contador y cerró el parte del ranking, basura, y el grupo se cagó de risa en silencio.',
  '%A robó a %V en plena luz. Sin sombra para esconder el cargo del ranking del grupo, ridículo, y el grupo se cagó de risa en silencio.',
  'Robo limpio de %A a costa de %V: archivado en el ranking sin recurso de apelación, fracasado, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó 1-0 con el aura en tránsito hacia quien atacó bien en el comando, cutre, y el grupo se cagó de risa en silencio.',
  '%A cobró el aura de %V y cerró el parte sin pedir aplauso al grupo del chat, joder, y el grupo se cagó de risa en silencio.',
  '%A el botín de %V ya no vuelve. El ranking no ofrece reembolso de aura en el sistema, mierda, y el grupo se cagó de risa en silencio.',
  '%A vs %V: crónica corta de un cobro largo para el contador de %V en el ranking, coño, y el grupo se cagó de risa en silencio.',
  '%A se llevó el aura de %V con la calma de un trámite terminado en el sistema del bot, cabrón, y el grupo se cagó de risa en silencio.',
  '%A ejecutó el golpe a %V. El contador firmó y el chat presenció el cargo en vivo, gilipollas, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el resultado que %A había marcado en la lista de la compra, patético, y el grupo se cagó de risa en silencio.',
  '%A robó el aura de %V y dejó el hueco como firma visible en el perfil del ranking, asco, y el grupo se cagó de risa en silencio.',
  '%A vs %V: 1-0 en aura, archivo cerrado, siguiente ronda cuando toque en el comando, ridículo, y el grupo se cagó de risa en silencio.'
];

const ROB_FAIL = [
  '%A intentó robarle el aura a %V y falló como un puto inutil de manual: manos temblando, cero botín y la cara de gilipollas a la vista de todos, joder.',
  '%A salió a cazar el aura de %V y volvió con las manos más vacías que su puta dignidad. El chat se cagó de risa, mierda.',
  'El plan de %A contra %V era una mierda desde el primer mensaje. Se desmontó solo antes de tocar el botín, cabrón.',
  '%A puso la mano donde no debía y %V se la devolvió vacía. Pareces un puto pringado pidiendo limosna de aura, patético.',
  '%A vs %V terminó 0-1. %A atacó con la precisión de un ciego tirando dardos y encima se creía listo, gilipollas.',
  '%A calculó mal el golpe y %V ni se movió. Qué asco de intento: mucho pecho y cero huevos de verdad, coño.',
  '%A falló el atraco a %V como falla casi todo en su vida: con ruido, sin resultado y con cara de no haber aprendido nada, ridículo.',
  '%V sigue con su aura; %A sigue con la cara de quien juraba que esta vez sí y otra vez se quedó en almost, fracasado.',
  'El plan de %A se cayó solo. Ni %V tuvo que defenderse. Nivel de inútil certificado en el ranking, cutre.',
  '%A entró a por el aura de %V y salió con el ego más vacío que su puta cuenta de resultados. Qué vergüenza, joder.',
  'Robo fallido: %A firma el parte, %V bosteza. Has montado un show de mierda y ni el botín apareció, mierda.',
  'El golpe de %A no conectó ni de casualidad. %V intacto, %A explicando como un puto payaso sin público, cabrón.',
  '%A miró el aura de %V como se mira lo que no se puede tocar. Hambre de puto pobre de ranking, asco, y el grupo se cagó de risa en silencio.',
  '%V intacto y aburrido. %A sudando la explicación que nadie pidió, fracasado de manual, y el grupo se cagó de risa en silencio.',
  'El aura de %V no se movió. La de respeto de %A se fue a la mierda. Bienvenido al sótano, joder, y el grupo se cagó de risa en silencio.',
  'Fallo de manual: %A con la mano tendida al vacío. %V con el aura donde siempre. Robo de mierda, coño.',
  '%V no necesitaba escudo. %A se blindó solo a base de incompetencia pura. Qué asco, gilipollas, y el grupo se cagó de risa en silencio.',
  'Atraco fallido: %A sin botín, %V quieto, el grupo con contenido fresco de tu humillación, basura, y el grupo se cagó de risa en silencio.',
  '%A tenía hambre de aura ajena. %V tenía la puerta cerrada. Como puto restaurante en feriado, ridículo.',
  '%A vs %V terminó 0-1 sin que %V sudara. %A sudó la camiseta del almost otra puta vez, cutre, y el grupo se cagó de risa en silencio.',
  'Robo abortado por falta de talento. Autor %A. Espectador aburrido %V. Créditos: nadie, joder, y el grupo se cagó de risa en silencio.',
  '%A extendió la mano al aura de %V. %V contó hasta tres y no pasó una mierda. Ni magia ni botín, mierda.',
  'El aura de %V sigue en su sitio. El prestigio de %A salió a fumar y no contesta el puto teléfono, coño.',
  'Intento de %A: mucho preámbulo, cero desenlace. %V intacto. Crónica de un robo que nunca fue, gilipollas.',
  '%A no llegó al bolsillo de %V. Se quedó en el pasillo del intento con las manos en los bolsillos propios, patético.',
  '%A salió a cazar aura y cazó una lección: %V no se deja y tú no das el nivel mínimo del comando, asco.',
  'El atraco se desinfló solo. %A sopló de más al principio. %V ni gastó saliva en defenderse, basura, y el grupo se cagó de risa en silencio.',
  '%A con cara de ladrón de película de sobremesa. %V con cara de no haber visto una mierda porque no hubo nada, ridículo.',
  '%A apuntó al aura de %V y le dio al aire del chat. El aire no paga botín ni da propina, cutre, y el grupo se cagó de risa en silencio.',
  '%V sigue rico en aura. %A sigue rico en excusas de por qué esta vez casi. El almost es tu puta residencia, joder.',
  'El golpe no llegó. El ridículo sí. Autor %A. Objetivo intacto %V. Público: todos los que no parpadearon, mierda.',
  '%V no defendió porque no hizo falta. %A se defendió solo de su propio plan de mierda, patético, y el grupo se cagó de risa en silencio.',
  'Robo en modo borrador eterno. %A no pasó a limpio. %V sigue en el original sin un tachón, asco, y el grupo se cagó de risa en silencio.',
  '%A puso la trampa al revés y cayó él. %V miró desde la grada sin pagar entrada, basura, y el grupo se cagó de risa en silencio.',
  'Atraco 0. %A 0. %V 1 por el simple hecho de no hacer nada y con eso bastar, cutre, y el grupo se cagó de risa en silencio.',
  'El plan de %A tenía más agujeros que un colador de feria. %V pasó de largo sin mirar, mierda, y el grupo se cagó de risa en silencio.',
  '%A sin botín, %V sin drama, el grupo con el veredicto escrito antes del punto final, coño, y el grupo se cagó de risa en silencio.',
  '%A creyó que %V era objetivo fácil de tutorial. %V resultó pared de hormigón. Gana la pared, gilipollas.',
  '%A extendió la mano al aura de %V y solo tocó el vacío de un intento mal medido, asco, y el grupo se cagó de risa en silencio.',
  '%V ni activó defensa. El ataque de %A no merecía el gasto de energía ni de mensaje, basura, y el grupo se cagó de risa en silencio.',
  '%A vs %V: el marcador se escribió solo en la columna del fallo. Sin prórroga, cutre, y el grupo se cagó de risa en silencio.',
  'El atraco de %A fue un farol a mesa llena. %V no vio las cartas porque no había juego, joder, y el grupo se cagó de risa en silencio.',
  '%V sigue exactamente igual. %A explica y el grupo ya cambió de tema hace tres mensajes, coño, y el grupo se cagó de risa en silencio.',
  '%A tropezó con la meta antes de llegar. La meta era el aura de %V y sigue clavada ahí, cabrón, y el grupo se cagó de risa en silencio.',
  '%A tenía hambre de aura contada. %V tenía cerradura y la llave en otro continente, patético, y el grupo se cagó de risa en silencio.',
  '%A no conectó ni por accidente del universo. %V no sudó ni por educación básica, basura, y el grupo se cagó de risa en silencio.',
  'Robo en modo ensayo general eterno. %A no estrena. %V no compró entrada ni pirata, ridículo, y el grupo se cagó de risa en silencio.',
  '%V intacto por mérito de estar quieto y por demérito largo y documentado de %A, cutre, y el grupo se cagó de risa en silencio.',
  'El aura de %V no se movió del contador. La cara de %A sí, varios tonos hacia el rojo, mierda, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó antes del primer paso real. El plan no sobrevivió al contacto con la realidad, gilipollas.',
  '%V no necesitaba suerte ni escudo de tienda. %A trajo su propia derrota bajo el brazo, asco, y el grupo se cagó de risa en silencio.',
  'Fallo de %A: el botín sigue en %V, el meme queda en el chat y el prestigio baja sin freno, basura, y el grupo se cagó de risa en silencio.',
  'El golpe de %A fue un soplo de aire acondicionado. %V ni se molestó en apartar el flequillo, fracasado.',
  '%V sigue en su sitio contando aura. %A sigue buscando la frase mágica que lo arregle, joder, y el grupo se cagó de risa en silencio.',
  'El plan de %A se diluyó al primer contacto con el agua del ranking. %V ni se enteró del chapuzón, gilipollas.',
  '%V 1, %A 0 en un partido donde solo uno intentó jugar y encima lo hizo mal de principio a fin, asco.',
  '%A vs %V: crónica de un robo anunciado en el group chat y no ejecutado en ningún fotograma, fracasado.',
  '%A sin el aura de %V y sin la suya de respeto. Doble pérdida en un solo intento torpe, cutre, y el grupo se cagó de risa en silencio.',
  '%V no se defendió porque el ataque de %A no llegó a la fase donde hace falta gastar defensa, coño, y el grupo se cagó de risa en silencio.',
  '%A tropezó con la realidad en el primer escalón del plan. La realidad se llama %V intacto, patético.',
  '%A extendió la mano al aura. %V contó las unidades al final y no faltaba ni media, ridículo, y el grupo se cagó de risa en silencio.',
  '%A vs %V en modo fail previsible de manual. Guion visto mil veces y ejecución todavía peor, fracasado.',
  '%V sigue: el contador de aura no parpadeó ni un frame. %A sí, de nervios y de vergüenza, mierda, y el grupo se cagó de risa en silencio.',
  '%A no llegó. %V no se fue. Empate técnico a favor de quien no necesitaba ni jugar, patético, y el grupo se cagó de risa en silencio.',
  '%A salió a por %V y volvió con una anécdota de fallo que nadie en el grupo había pedido, ridículo, y el grupo se cagó de risa en silencio.',
  '%V intacto de la primera a la última línea. %A redactando otra vez la crónica del casi, joder, y el grupo se cagó de risa en silencio.',
  '%A vs el aura de %V: el aura ni se enteró de que había una amenaza nominal en el chat, mierda, y el grupo se cagó de risa en silencio.',
  '%A en el intento, el intento en el suelo y el botín donde siempre estuvo: en %V, cabrón, y el grupo se cagó de risa en silencio.',
  '%A no conectó ni por casualidad del universo. %V tampoco se movió por casualidad ni por pena, gilipollas.',
  '%V 1 por existir y con eso bastar. %A 0 por intentarlo de la peor manera posible del manual, basura.',
  '%A dejó el botín exactamente donde estaba al principio: en manos que no son las suyas, las de %V, ridículo.',
  'El plan de %A no sobrevivió al primer contacto visual con %V en el ranking del grupo, joder, y el grupo se cagó de risa en silencio.',
  '%A tenía hambre del aura de %V y se quedó solo con el hambre y el chat entero de testigo, coño, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el marcador en blanco total en la columna de quien atacó, gilipollas, y el grupo se cagó de risa en silencio.',
  '%V no sudó ni de lejos del intento. %A sudó la explicación larga que nadie había pedido, basura, y el grupo se cagó de risa en silencio.',
  '%V sigue con el contador igual de firme. %A con el ego claramente en números rojos del día, mierda, y el grupo se cagó de risa en silencio.',
  '%A vs %V: crónica breve de un fallo que a %A se le hizo eterno en la cabeza, patético, y el grupo se cagó de risa en silencio.',
  '%A vs %V en modo solo frente al espejo del chat. Gana quien no atacó como atacó %A, gilipollas, y el grupo se cagó de risa en silencio.',
  '%A creyó que esta vez sí tocaba. El universo y %V contestaron que no al unísono y sin dudar, basura.',
  '%V ni se enteró del show montado. %A se enteró demasiado, demasiado tarde y demasiado claro, ridículo.',
  '%A tropezó con el peaje del fallo antes de oler de cerca el botín que guardaba %V, fracasado, y el grupo se cagó de risa en silencio.',
  '%A sin el aura de %V. Historia corta de botín y largometraje de ridículo con créditos finales, joder.',
  '%A el plan se le cayó de las manos antes de poder usarlo una sola vez contra %V, mierda, y el grupo se cagó de risa en silencio.',
  '%A vs el aura de %V: 0-1 en el marcador y el 1 no sudó ni pidió cambio de ritmo, cabrón, y el grupo se cagó de risa en silencio.',
  '%A vs %V: el guion del comando decía robo y la función acabó siendo sketch de fallos, mierda, y el grupo se cagó de risa en silencio.',
  '%V intacto en el ranking. %A en la cola permanente de los almost del historial del comando, asco, y el grupo se cagó de risa en silencio.',
  '%A sin el aura de %V y sin la cara de haberlo intentado de una forma decente, fracasado, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó en walkover a favor de quien no necesitó atacar bien ni una sola vez, joder, y el grupo se cagó de risa en silencio.',
  '%A tenía hambre de ranking ajeno. La cocina del aura de %V estaba cerrada con candado y testigos, mierda.',
  '%A sin gloria en el parte. %V sin drama en el ranking. Equilibrio perfecto de un fail bien repartido, gilipollas.',
  '%A vs el aura de %V: ni hubo combate real ni hubo duda razonable del resultado final, ridículo, y el grupo se cagó de risa en silencio.',
  'Atraco fallido en limpio. %A firma el parte, %V bosteza y el grupo archiva sin debate, joder, y el grupo se cagó de risa en silencio.',
  '%A no conectó el golpe. El universo no ayudó. %V no necesitaba ayuda para ganar este round, mierda, y el grupo se cagó de risa en silencio.',
  '%A puso la trampa, olvidó el sitio exacto y cayó lejos de %V y del botín que soñaba, cabrón, y el grupo se cagó de risa en silencio.',
  '%A vs %V en una sola línea de acta notarial del bot: falló. Punto y cierre, patético, y el grupo se cagó de risa en silencio.',
  '%A extendió la mano al aura. El aura de %V no hizo el trayecto inverso ni de broma ni de error, fracasado.',
  '%V 1, %A 0. Acta cerrada sin prórroga, sin VAR y sin bis de consuelo, mierda, y el grupo se cagó de risa en silencio.',
  '%A vs %V: el fallo se escribió solo en el ranking, sin ayuda de guionista ni de narrador, patético, y el grupo se cagó de risa en silencio.',
  'Fallo limpio de los que no dejan rastro en el aura ajena. %A no ensució a %V ni con la punta del dedo, basura.',
  '%A puso todo menos el acierto del golpe. %V lo notó solo en la ausencia total de movimiento, mierda.',
  '%A vs %V terminó antes de que %A encontrara siquiera el bolsillo correcto del objetivo, patético, y el grupo se cagó de risa en silencio.',
  '%A vs el aura de %V en modo silent. El silencio es el del contador que no se movió ni un tick, mierda.',
  '%A extendió el brazo completo hacia el objetivo. El aura de %V no hizo ni medio trayecto de vuelta, coño.',
  '%A vs el aura de %V: 0-1 sin prórroga, sin debate útil y sin segunda oportunidad en este mensaje, basura.',
  '%A salió a por el botín de %V y volvió con este mensaje como único souvenir del viaje, ridículo, y el grupo se cagó de risa en silencio.',
  '%A el plan se evaporó al primer contacto real con %V en la lista del grupo, mierda, y el grupo se cagó de risa en silencio.',
  '%A vs %V: no hubo robo en el sentido útil de la palabra. Hubo intento y hubo un no rotundo, gilipollas.',
  '%A vs %V terminó 0-1. El 1 es %V por el simple hecho de no moverse mal ni una vez, fracasado, y el grupo se cagó de risa en silencio.',
  '%A vs el aura de %V: ni combate real, ni duda razonable, ni botín, ni gloria de ningún tipo, gilipollas.'
];


const ROB_MAESTRO = [
  '%A no solo le robó a %V: le vació el aura con la precisión de quien no deja migas. El ranking lo registra.',
  '%A ejecutó el atraco maestro a %V: botín máximo, defensa en cero, chat en silencio un segundo. Mierda.',
  'Robo de autor: %A a %V. El contador de %V no se recuperó en el mismo mensaje. El ranking lo registra.',
  '%A vs %V terminó con el aura de %V en tránsito total hacia %A. El ranking lo registra y el grupo ya pasó de página.',
  '%A vació lo que había que vaciar de %V: el ranking lo muestra sin filtro. El ranking lo registra con el dígito firmando solo.',
  'Atraco maestro de %A: %V mirando el hueco donde antes había margen. El ranking lo registra sin apelación posible hoy.',
  '%A le robó a %V como quien cobra una deuda antigua con intereses. El ranking lo registra y el grupo ya pasó de página.',
  '%A vs %V: clínica de atraco. El paciente %V sale con menos aura de la que entró. El ranking lo registra.',
  '%A no dejó casi nada en la cuenta de %V: casi nada duele más que nada a veces. El ranking lo registra.',
  'Robo de nivel: %A cobró de %V con la calma de un maestro que no suda el golpe. El ranking lo registra.',
  '%A ejecutó el vaciado de %V en el timing que no perdona ni deja casi. El ranking lo registra sin consuelo de consola.',
  '%A vs %V terminó con transfer pesado a favor de %A y silencio de %V. El ranking lo registra sin cuento que lo tape.',
  '%A se llevó el aura de %V como quien recoge lo suyo de un sitio ajeno. El ranking lo registra delante del listón que no saltaste.',
  'Atraco de categoría: %A a costa de %V, el grupo sin duda del nivel. El ranking lo registra en alta resolución de group chat.',
  '%A no improvisó el pleno: el aura de %V ya estaba en la lista de la compra. El ranking lo registra en el parte que nadie borra.',
  '%A vs %V: el ladrón maestro cobró, la víctima cuenta el hueco grande. El ranking lo registra en alta resolución de group chat.',
  '%A vació a %V con precisión de quien no necesita segundo intento. El ranking lo registra sin bis ni matiz de consuelo.',
  'Robo maestro: %A con el botín gordo, %V con el hueco del mismo tamaño. El ranking lo registra y no hace falta ampliar el parte.',
  '%A le dejó a %V el mínimo: el mínimo no consuela. Y el grupo lo vio entero, patético. y el historial no olvida.',
  '%A vs %V terminó con el ranking actualizado a lo grande a favor de %A. El ranking lo registra sin derecho a matiz útil.',
  '%A ejecutó el golpe a %V en modo autor: firma legible en el contador. El ranking lo registra sin barniz de relato heroico.',
  '%A el atraco a %V no fue suerte: fue ejecución de nivel. El ranking lo registra con el botín o el fail a la vista.',
  '%A vs %V: crónica de un vaciado que el chat no discute. Y el grupo lo vio entero, asco y el ranking lo deja claro.',
  '%A se llevó de %V todo lo que el momento permitió: el momento permitió mucho. El ranking lo registra.',
  'Atraco maestro de %A: %V en el parte de bajas graves de aura. El ranking lo registra en el único marcador que importa aquí.',
  '%A cobró de %V con la lista cerrada y el bolsillo abierto. El ranking lo registra con testigos obligados en el hilo.',
  '%A vs %V terminó 1-0 con el 1 pesando en el contador de %A. El ranking lo registra sin segunda lectura que lo arregle.',
  '%A no dejó el atraco en parcial: cerró en maestro sobre %V. El ranking lo registra sin cuento que lo tape.',
  '%A el aura de %V viajó casi entera: destino cuenta de %A. El ranking lo registra delante de quien aún leía el hilo.',
  '%A vs %V: el maestro cobró, el aprendiz de víctima aprendió caro. El ranking lo registra en el único idioma que entiende el contador.',
  '%A ejecutó el vaciado de %V sin pedir bis: el ranking no ofrece reposición rápida. El ranking lo registra.',
  'Robo de nivel: %A a %V, botín máximo legible, defensa insuficiente. El ranking lo registra y el hilo no pide amplificación.',
  '%A se llevó el pack de aura de %V: el pack no tenía seguro. El ranking lo registra con el bot como notario del fallo.',
  '%A vs %V terminó con transfer pesado y cara de %V de haber visto el hueco. El ranking lo registra sin anestesia de verdad esta vez.',
  '%A cobró de %V como quien no acepta almost en el parte. El ranking lo registra sin anestesia de verdad esta vez.',
  'Atraco maestro: %A cierra con botín, %V abre el hueco grande. El ranking lo registra sin bis ni matiz de consuelo.',
  '%A vs %V: gana el que vació, pierde el que no retuvo. Y el grupo lo vio entero, cutre. y el veredicto no se negocia.',
  '%A ejecutó el golpe a %V con precisión de cobro total posible. El ranking lo registra con el cargo en firme.',
  '%A el contador de %V bajó de verdad: el de %A subió de verdad. El ranking lo registra sin segunda lectura que lo arregle.',
  '%A vs %V terminó con el aura de %V en manos de quien atacó en serio. El ranking lo registra y el archivo queda cerrado.',
  '%A se llevó de %V lo que duele soltar en un solo mensaje. El ranking lo registra sin filtro de autoayuda.',
  'Robo maestro de %A: sin parcial, con botín, con público callado un segundo. El ranking lo registra sin consuelo de consola.',
  '%A vs %V: clínica de atraco con resultado de vaciado. Y el grupo lo vio entero, cabrón y el ranking lo deja claro.',
  '%A cobró el aura de %V en el modo que no deja casi margen. El ranking lo registra y el sistema cierra sin discusión.',
  '%A el golpe a %V fue de autor: el ranking firma debajo en grande. El ranking lo registra con el bot como notario del fallo.',
  '%A vs %V terminó con %A en el lado pesado del transfer. El ranking lo registra con el veredicto seco del bot.',
  '%A no dejó migas útiles en la cuenta de %V: migas no alimentan. El ranking lo registra sin derecho a matiz útil.',
  'Atraco de categoría a favor de %A: %V en pérdidas graves. El ranking lo registra con el fail todavía caliente.',
  '%A se llevó el botín gordo de %V con la calma de quien ya había contado. El ranking lo registra y el archivo queda cerrado.',
  '%A vs %V: el maestro no pide aplauso, el contador lo da. El ranking lo registra con el saldo a la intemperie.',
  '%A ejecutó el vaciado de %V en un movimiento limpio y pesado. El ranking lo registra delante del hueco que quedó.',
  '%A el aura de %V cambió de dueño en cantidad que se nota sin lupa. El ranking lo registra en el recuento que no perdona.',
  '%A vs %V terminó 1-0 con peso: el peso es el botín de %A. El ranking lo registra y el chat archiva sin debate.',
  '%A cobró de %V todo lo que el atraco maestro permite en este sistema. El ranking lo registra con el saldo a la intemperie.',
  'Robo de nivel: %A a costa de %V, sin almost, con hueco grande. El ranking lo registra sin bis ni matiz de consuelo.',
  '%A se llevó de %V lo marcado en la lista de la compra completa. El ranking lo registra delante del público que no pidió entrada.',
  '%A vs %V: crónica de un vaciado legible en el ranking al instante. El ranking lo registra y basta el dato del ranking.',
  '%A ejecutó el atraco a %V como quien no contempla el parcial. El ranking lo registra delante del listón que no saltaste.',
  '%A el golpe fue maestro: %V lo nota el resto de la sesión. El ranking lo registra con el eco del almost todavía sonando.',
  '%A vs %V terminó con transfer pesado a nombre de %A. Y el grupo lo vio entero, basura. y el hilo sigue sin ti en el centro.',
  '%A no dejó a %V con margen cómodo: el margen se fue con el botín. El ranking lo registra con el eco del almost todavía sonando.',
  'Atraco maestro de %A: el chat vio el vaciado y el contador lo selló. El ranking lo registra sin modo avión ni silencio cómplice.',
  '%A vs %V: gana quien vació, el resto es ruido de la pérdida. El ranking lo registra con el peaje cobrado al natural.',
  '%A cobró el aura de %V en cantidad de maestro, no de aprendiz. El ranking lo registra sin prosa que lo maquille.',
  '%A el plan contra %V salió en versión completa: botín completo posible. El ranking lo registra delante de quien no quería verlo.',
  '%A vs %V terminó con %A contando en grande y %V restando en serio. El ranking lo registra con la cara del resultado a la vista.',
  '%A se llevó el pack de %V: el pack no volvió. Y el grupo lo vio entero, mierda y el ranking lo deja claro.',
  'Robo maestro: %A cierra el parte con botín, %V con el hueco del mismo peso. El ranking lo registra con el resultado ya consumado.',
  '%A vs %V: el ladrón de nivel cobró sin pedir segunda oportunidad. El ranking lo registra sin segunda lectura que lo arregle.',
  '%A ejecutó el vaciado de %V con la lista cerrada y el resultado abierto a su favor. El ranking lo registra.',
  '%A el contador no miente en grande: %V menos mucho, %A más mucho. El ranking lo registra y el resto es ruido de fondo.',
  '%A vs %V terminó con el aura de %V en tránsito casi total. El ranking lo registra con el fallo en 4K de chat.',
  '%A cobró de %V como maestro que no acepta migajas de botín. El ranking lo registra en el parte que nadie borra.',
  'Atraco de categoría: %A a %V, ranking actualizado a lo grande. El ranking lo registra sin bis ni matiz de consuelo.',
  '%A se llevó de %V lo que duele ver desaparecer en un solo golpe. El ranking lo registra y el veredicto no se negocia.',
  '%A vs %V: clínica de atraco, paciente %V con menos aura de la entrada. El ranking lo registra sin barniz de relato heroico.',
  '%A ejecutó el golpe maestro a %V: sin parcial, con firma en el contador. El ranking lo registra en el parte que nadie borra.',
  '%A el botín de %V viajó casi entero: billete a nombre de %A. El ranking lo registra y el ranking lo deja por escrito.',
  '%A vs %V terminó 1-0 con el 1 pesando de verdad. Y el grupo lo vio entero, joder. delante del público que no pidió entrada.',
  '%A no dejó el atraco a medias: maestro sobre %V, punto. El ranking lo registra y el chat archiva sin debate.',
  'Robo de nivel de %A a costa de %V: visible en grande, legible sin esfuerzo. El ranking lo registra y el contador insiste.',
  '%A se llevó el aura de %V en cantidad que el almost no contempla. El ranking lo registra con el botín o el fail a la vista.',
  '%A vs %V: el maestro cobró, la víctima cuenta el hueco sin consuelo. El ranking lo registra y el archivo queda cerrado.',
  '%A ejecutó el vaciado de %V en el timing del que no avisa y no falla. El ranking lo registra en el recuento que no perdona.',
  '%A el golpe a %V fue de autor: el ranking no pide aclaración. El ranking lo registra y no hay modo de suavizarlo.',
  '%A vs %V terminó con transfer pesado y silencio útil de %V. El ranking lo registra sin suavizar el golpe del número.',
  '%A cobró de %V el máximo que el atraco maestro permite mostrar. El ranking lo registra y el hilo sigue sin ti en el centro.',
  'Atraco maestro: %A con botín gordo, %V con pérdida del mismo calibre. El ranking lo registra y el archivo queda cerrado.',
  '%A vs %V: gana %A por vaciado, pierde %V por no retener. El ranking lo registra con el número en la frente del mensaje.',
  '%A se llevó de %V lo marcado en grande: casilla cobrada en serio. El ranking lo registra y el archivo no admite recurso.',
  '%A el plan salió en versión completa contra %V. Y el grupo lo vio entero, fracasado. delante de todo el que miraba.',
  '%A vs %V terminó con el ranking en movimiento fuerte a favor de %A. El ranking lo registra en el momento que más dolía soltarlo.',
  '%A ejecutó el atraco a %V sin almost y sin devolución posible. El ranking lo registra con la cara del resultado a la vista.',
  '%A el aura de %V bajó de verdad: el mensaje no exagera. Y el grupo lo vio entero, coño. sin consuelo de consola.',
  '%A vs %V: crónica de un vaciado que el chat archiva en grande. El ranking lo registra y el contador insiste.',
  '%A cobró el botín maestro de %V con la calma de quien ya sumó. El ranking lo registra sin anestesia de verdad esta vez.',
  'Robo de nivel: %A cierra, %V abre el hueco grande, el grupo lo ve. El ranking lo registra en el único idioma que entiende el contador.',
  '%A vs %V terminó 1-0 con peso de aura real. Y el grupo lo vio entero, ridículo. delante del ranking y de la cara.',
  '%A se llevó el pack de %V: el pack no tenía plan B de defensa. El ranking lo registra en alta resolución de group chat.',
  '%A ejecutó el vaciado de %V como quien no contempla el término medio. El ranking lo registra sin consuelo de consola.',
  '%A vs %V: el maestro no suda, el contador de %V sí baja. El ranking lo registra y el contador insiste.',
  '%A cobró de %V en modo autor: firma grande en el ranking. El ranking lo registra con el saldo a la intemperie.',
  'Atraco maestro de %A a costa de %V: sin relativizar, con números gordos. El ranking lo registra delante del hueco que quedó.',
  '%A vs %V terminó con el transfer pesado y el debate inútil. El ranking lo registra sin segunda lectura que lo arregle.',
  '%A se llevó el aura de %V en cantidad de quien no deja el trabajo a medias. El ranking lo registra y no hay DLC que lo parchee.',
  '%A el golpe maestro a %V aterrizó donde más se nota: el contador. El ranking lo registra sin anestesia de verdad esta vez.',
  '%A vs %V: 1-0 con botín de categoría a nombre de %A. Y el grupo lo vio entero, coño. con el dígito firmando solo.',
  '%A ejecutó el atraco a %V en el modo que el parcial no alcanza. El ranking lo registra sin segunda lectura que lo arregle.',
  '%A el botín de %V cambió de manos en grande: manos de %A. El ranking lo registra y basta el dato del ranking.',
  '%A vs %V terminó con %A en el lado pesado y %V en el hueco serio. El ranking lo registra en el idioma seco del ranking.',
  '%A cobró de %V como quien cierra una deuda con intereses de maestro. El ranking lo registra delante del hueco que quedó.',
  'Robo maestro: %A con el resultado gordo, %V con la pérdida del mismo tamaño. El ranking lo registra.',
  '%A vs %V: el ladrón de nivel firmó el parte antes de la queja completa. El ranking lo registra sin letra pequeña que lo salve.',
  '%A se llevó de %V lo que el atraco maestro está diseñado para llevar. El ranking lo registra sin maquillaje ni segunda toma.',
  '%A ejecutó el vaciado de %V sin pedir permiso al contador de %V. El ranking lo registra delante del ranking y de la cara.',
  '%A vs %V terminó con el ranking actualizado en grande a favor de %A. El ranking lo registra y el hilo sigue sin ti en el centro.',
  '%A cobró el aura de %V en el timing del maestro: ahora, todo lo posible. El ranking lo registra en el idioma seco del ranking.',
  'Atraco de categoría a favor de %A: %V en el parte de bajas graves. El ranking lo registra y basta el dato del ranking.',
  '%A vs %V: clínica de vaciado, resultado legible al instante. El ranking lo registra sin maquillaje ni segunda toma.',
  '%A se llevó el pack de aura de %V con precisión de cobro total posible. El ranking lo registra y el sistema no regala puntos.',
  '%A el golpe a %V fue maestro: el chat no necesita cámara lenta. El ranking lo registra delante del marcador en vivo.',
  '%A vs %V terminó 1-0 con el botín pesando en la cuenta de %A. El ranking lo registra sin consuelo de manual barato.',
  '%A ejecutó el atraco a %V sin almost: el ranking muestra el tamaño. El ranking lo registra en el parte que nadie borra.',
  '%A el aura de %V viajó casi entera sin billete de vuelta. El ranking lo registra sin modo avión ni silencio cómplice.',
  '%A vs %V: gana quien vació en serio, pierde quien no retuvo en serio. El ranking lo registra con el parte firmado debajo.',
  '%A cobró de %V el máximo visible del sistema en este golpe. El ranking lo registra y el veredicto no se negocia.',
  'Robo maestro de %A: sin parcial, con hueco grande, con público. El ranking lo registra y el chat archiva sin debate.',
  '%A vs %V terminó con transfer pesado y archivo cerrado a favor de %A. El ranking lo registra en el momento que más dolía soltarlo.',
  '%A se llevó de %V lo que duele soltar de un solo golpe limpio. El ranking lo registra sin maquillaje ni segunda toma.',
  '%A ejecutó el vaciado de %V como autor que no firma works in progress. El ranking lo registra con el chat enterado del cargo.',
  '%A vs %V: 1-0 en aura con peso, sin prórroga, con botín. El ranking lo registra sin letra pequeña que lo salve.',
  '%A cobró el aura de %V en cantidad que el mensaje no necesita adornar. El ranking lo registra con el saldo a la intemperie.',
  'Atraco maestro: %A cierra el parte gordo, %V el hueco del mismo calibre. El ranking lo registra y el hilo sigue sin ti en el centro.',
  '%A vs %V terminó con el contador de %A en más grande y el de %V en menos grande. El ranking lo registra.',
  '%A se llevó el botín de %V en modo maestro: el almost no aplica. El ranking lo registra y el hilo no pide amplificación.',
  '%A el plan contra %V salió completo: el botín también. El ranking lo registra sin recurso ni nota al pie.',
  '%A vs %V: el maestro cobró, la víctima restó, el grupo archivó. El ranking lo registra sin anestesia de verdad esta vez.',
  '%A ejecutó el golpe a %V con lista cerrada y bolsillo a la medida del botín. El ranking lo registra.',
  '%A el vaciado de %V se lee en el ranking sin necesidad de lupa. El ranking lo registra sin derecho a matiz útil.',
  '%A vs %V terminó con el aura de %V en manos de %A en cantidad seria. El ranking lo registra y el archivo queda cerrado.',
  '%A cobró de %V como quien no deja el atraco a mitad de la gloria. El ranking lo registra y el sistema marca el punto final.',
  'Robo de nivel: %A a costa de %V, resultado maestro, archivo listo. El ranking lo registra sin suavizar el golpe del número.',
  '%A vs %V: 1-0 con peso real de aura a favor de quien atacó en serio. El ranking lo registra con el parte firmado debajo.'
];

const ROB_PARCIAL = [
  '%A entró a por todo el aura de %V y salió con las manos medio llenas: botín parcial, sed intacta. Joder.',
  '%A le robó a %V solo una parte: suficiente para que se note, insuficiente para la gloria total. Mierda.',
  'Robo a medias: %A cobra algo de %V, %V se salva de lo peor, el chat ve el término medio. El ranking lo registra.',
  '%A vs %V terminó con botín incompleto: %A no se queja del todo, %V tampoco respira tranquilo. Cabrón.',
  '%A se llevó un trozo del aura de %V: el resto se quedó por falta de empuje o de suerte. El ranking lo registra.',
  'Atraco parcial de %A a %V: el contador se mueve, pero no del todo a favor de nadie. El ranking lo registra.',
  '%A no vació a %V: lo dejó cojo de aura. Cojo duele igual. El ranking lo registra en el idioma seco del ranking.',
  '%A vs %V: botín a medias, drama a medias, resultado legible en el ranking. El ranking lo registra y el sistema marca el punto final.',
  '%A cobró de %V menos de lo que soñó y más de lo que %V quería soltar. El ranking lo registra delante del hueco que quedó.',
  'Robo incompleto: %A con algo en el bolsillo, %V con menos, ninguno del todo contento. El ranking lo registra.',
  '%A entró a por el pack completo de %V y salió con la mitad: la mitad ya duele. El ranking lo registra.',
  '%A el golpe a %V conectó a medias: el contador baja, no se desploma. El ranking lo registra sin suavizar el golpe del número.',
  '%A vs %V terminó con transfer parcial: suficiente para el mensaje, no para el exterminio. Fracasado.',
  '%A se llevó lo que pudo del aura de %V: lo que pudo no era todo. El ranking lo registra con el parte firmado debajo.',
  'Atraco a medias: %A no falla del todo, %V no se salva del todo. El ranking lo registra con el número hablando solo.',
  '%A cobró un pedazo de %V: el pedazo se nota en el ranking. El ranking lo registra con el fallo en 4K de chat.',
  '%A vs %V: botín incompleto, cara de ambos de no estar satisfechos. El ranking lo registra con el cargo en firme.',
  '%A no dejó a %V en cero: lo dejó en menos. Menos basta para este mensaje. El ranking lo registra sin segunda lectura que lo arregle.',
  'Robo parcial de %A: el aura de %V sangra, no se desangra. El ranking lo registra con el veredicto seco del bot.',
  '%A entró a por todo y el todo no cupo: salió con una parte de %V. El ranking lo registra en el único marcador que importa aquí.',
  '%A vs %V terminó con el contador en movimiento moderado a favor de %A. El ranking lo registra y el ranking cierra el caso.',
  '%A se llevó un trozo legible del aura de %V: legible duele. El ranking lo registra sin barniz de relato heroico.',
  '%A el golpe fue suficiente para marcar y insuficiente para cerrar el libro de %V. El ranking lo registra.',
  '%A vs %V: media ración de botín, media ración de drama. El ranking lo registra y el sistema cierra sin discusión.',
  '%A cobró de %V lo que el timing y la defensa dejaron pasar. El ranking lo registra en el segundo más incómodo del chat.',
  'Robo a medias: %A con botín parcial, %V con pérdida parcial, el grupo con el dato. El ranking lo registra.',
  '%A no vació la cuenta de %V: le hizo un agujero. El agujero se ve. El ranking lo registra y el hilo no pide amplificación.',
  '%A vs %V terminó con transfer incompleto y mensaje completo. El ranking lo registra con el eco todavía en el grupo.',
  '%A se llevó lo que pudo: lo que pudo de %V ya no es de %V. El ranking lo registra con la cara del resultado a la vista.',
  '%A el atraco a %V se quedó a mitad de camino del exterminio. El ranking lo registra con el chat enterado del cargo.',
  '%A vs %V: botín sí, gloria total no, dolor de %V sí. El ranking lo registra y el resto es ruido de fondo.',
  '%A cobró una parte del aura de %V: la parte que el ranking muestra a la baja. El ranking lo registra.',
  'Atraco parcial: %A no se va vacío, %V no se queda en cero. El ranking lo registra y el sistema cierra sin discusión.',
  '%A entró a por el pack y salió con el snack: el snack era aura de %V. El ranking lo registra con la cara del resultado a la vista.',
  '%A vs %V terminó con el contador en menos para %V sin llegar al suelo. El ranking lo registra en el único marcador que importa aquí.',
  '%A se llevó un corte del aura de %V: el corte sangra en el ranking. El ranking lo registra sin letra pequeña que lo salve.',
  '%A el golpe a %V no fue total: fue suficiente para este parte. El ranking lo registra en el idioma seco del ranking.',
  '%A vs %V: robo sí, masacre no, resultado legible sí. El ranking lo registra con el fail todavía caliente.',
  '%A cobró de %V a medias: las medias duelen cuando son aura. El ranking lo registra delante del hueco que quedó.',
  'Robo incompleto de %A a costa de %V: el chat ve el movimiento parcial. El ranking lo registra y el chat archiva sin debate.',
  '%A no dejó a %V en la ruina: lo dejó en la molestia grave. El ranking lo registra sin filtro de autoayuda.',
  '%A vs %V terminó con botín a favor de %A sin cerrar el capítulo de %V. El ranking lo registra sin derecho a matiz útil.',
  '%A se llevó lo disponible en el momento: lo disponible era de %V. El ranking lo registra con el fallo en 4K de chat.',
  '%A el atraco parcial a %V cuenta igual en el historial de ambos. El ranking lo registra y el historial no olvida.',
  '%A vs %V: media victoria de %A, media herida de %V. Y el grupo lo vio entero, patético y basta el dato del ranking.',
  '%A cobró un tramo del aura de %V: el tramo se nota al restar. El ranking lo registra con el saldo a la intemperie.',
  'Atraco a medias: %A con algo, %V con menos, ninguno en el extremo. El ranking lo registra con el saldo a la intemperie.',
  '%A entró a por todo el contador de %V y el contador solo bajó un tramo. El ranking lo registra con el parte firmado debajo.',
  '%A vs %V terminó con transfer parcial documentado en el ranking. El ranking lo registra en alta resolución de group chat.',
  '%A se llevó un trozo: el trozo era aura de %V y ya no vuelve entero. El ranking lo registra con el dígito como única defensa.',
  '%A el golpe conectó a medias: %V sangra aura sin caer del ranking del todo. El ranking lo registra sin suavizar el golpe del número.',
  '%A vs %V: botín incompleto, mensaje completo de que %A no falló del todo. El ranking lo registra y el sistema no regala puntos.',
  '%A cobró de %V lo que la defensa no logró retener. Y el grupo lo vio entero, joder. sin prosa que lo maquille.',
  'Robo parcial: %A no celebra el exterminio, celebra el movimiento del contador. El ranking lo registra.',
  '%A no vació a %V: lo dejó cojeando de aura. Cojear se ve. El ranking lo registra sin prosa que lo maquille.',
  '%A vs %V terminó con %A en más moderado y %V en menos moderado. El ranking lo registra y el historial no olvida.',
  '%A se llevó una parte legítima del aura de %V: legítima en el ranking. El ranking lo registra y el sistema marca el punto final.',
  '%A el atraco a %V se quedó entre el almost y el pleno: en el medio que duele. El ranking lo registra.',
  '%A vs %V: media ración de gloria para %A, media de pérdida para %V. El ranking lo registra y el contador no discute.',
  '%A cobró el tramo que pudo del aura de %V en este intento. El ranking lo registra con la firma legible del comando.',
  'Atraco incompleto de %A: suficiente para el parte, insuficiente para el mito. El ranking lo registra.',
  '%A entró a por el aura completa de %V y el universo le dio una parte. El ranking lo registra y el ranking cierra el caso.',
  '%A vs %V terminó con el contador en movimiento a favor de %A sin sentencia final. El ranking lo registra.',
  '%A se llevó un corte limpio pero no total del aura de %V. El ranking lo registra con el parte firmado debajo.',
  '%A el golpe a %V marcó el ranking sin borrar a %V del mapa. El ranking lo registra y el contador no discute.',
  '%A vs %V: robo sí, ruina total no, dolor sí. Y el grupo lo vio entero, joder y el ranking lo deja claro.',
  '%A cobró de %V a medias y el chat registró el medio sin duda. El ranking lo registra en el único marcador que importa aquí.',
  'Robo a medias: %A con botín parcial en el bolsillo, %V con el hueco parcial. El ranking lo registra.',
  '%A no cerró el libro de %V: le arrancó un capítulo de aura. El ranking lo registra con el botín o el fail a la vista.',
  '%A vs %V terminó con transfer parcial y caras de no estar del todo satisfechos. El ranking lo registra.',
  '%A se llevó lo que el momento dejó pasar del aura de %V. El ranking lo registra y el contador insiste.',
  '%A el atraco parcial cuenta en el historial igual que uno pleno: duele distinto. El ranking lo registra.',
  '%A vs %V: media victoria, media herida, resultado legible. El ranking lo registra y no hay DLC que lo parchee.',
  '%A cobró un segmento del aura de %V: el segmento se resta en público. El ranking lo registra y no hay DLC que lo parchee.',
  'Atraco parcial de %A a %V: el ranking no necesita el pleno para actualizar. El ranking lo registra y el sistema marca el punto final.',
  '%A entró a por todo y salió con una fracción: la fracción era de %V. El ranking lo registra en la foto fija del ranking.',
  '%A vs %V terminó con %A en más y %V en menos sin llegar a los extremos. El ranking lo registra en la foto fija del ranking.',
  '%A se llevó un pedazo del aura de %V que el contador no devuelve solo. El ranking lo registra en el único idioma que entiende el contador.',
  '%A el golpe fue medio: el efecto en %V no es medio del todo. El ranking lo registra en el idioma seco del ranking.',
  '%A vs %V: botín a medias, mensaje entero de que hubo robo. El ranking lo registra con la cara del resultado a la vista.',
  '%A cobró de %V lo que pudo en el intento: lo que pudo ya no es de %V. El ranking lo registra sin barniz de relato heroico.',
  'Robo incompleto: %A no se va con las manos vacías, %V no se queda en cero. El ranking lo registra y no hay modo de suavizarlo.',
  '%A no masacró a %V: lo hirió de aura. La herida se ve en el ranking. El ranking lo registra con la firma legible del comando.',
  '%A se llevó un tramo del contador de %V: el tramo cambia el día de ambos. El ranking lo registra delante de todo el que miraba.',
  '%A el atraco a medias a %V basta para este parte del comando. El ranking lo registra y no hace falta ampliar el parte.',
  '%A vs %V: media gloria, media pérdida, cero duda de que %A cobró algo. El ranking lo registra sin que nadie pida replay.',
  '%A cobró una parte del aura de %V y el chat no discute la parte. El ranking lo registra con la firma legible del comando.',
  'Atraco a medias: %A con algo de botín, %V con algo de hueco. El ranking lo registra en la foto fija del ranking.',
  '%A entró a por el pack de %V y el pack no salió entero: salió un trozo. El ranking lo registra y el contador no discute.',
  '%A se llevó lo disponible sin llevarse el resto: lo disponible era de %V. El ranking lo registra sin prosa que lo maquille.',
  '%A el golpe parcial a %V marca el historial de los dos. El ranking lo registra delante del listón que no saltaste.',
  '%A vs %V: robo real, botín incompleto, dolor real. Y el grupo lo vio entero, coño. con el bot como notario del fallo.',
  '%A cobró el tramo que la defensa de %V no retuvo del todo. El ranking lo registra y el sistema marca el punto final.',
  'Robo parcial de %A: el aura de %V baja sin llegar al sótano. El ranking lo registra con el saldo a la intemperie.',
  '%A no dejó a %V en blanco: lo dejó en menos. El menos se lee. El ranking lo registra y no hay modo de suavizarlo.',
  '%A se llevó un corte del aura de %V suficiente para el mensaje. El ranking lo registra con el cargo en firme.',
  '%A el atraco incompleto a %V duele distinto al pleno: duele igual de público. El ranking lo registra.',
  '%A vs %V: media ración de todo, ración completa de que hubo robo. El ranking lo registra con el fallo en 4K de chat.',
  '%A cobró de %V una parte que el ranking muestra sin necesidad de pleno. El ranking lo registra con el chat enterado del cargo.'
];

const ROB_DESASTRE = [
  '%A salió a robar y acabó financiando a %V. El karma le pasó factura con intereses de puto usurero, joder.',
  '%A intentó el atraco y terminó pagando aura de su propio bolsillo a favor de %V. Patrocinador involuntario de mierda, mierda.',
  'Desastre total: %A no solo falló, encima le dejó el aura a %V en bandeja de plata. Servicio completo de gilipollas, coño.',
  '%A vs %V terminó con %A más pobre y %V agradeciendo el regalo. Como propina de malo de puta madre, cabrón.',
  '%A vino a cazar y salió cazado. %V cuenta el botín que al principio no era suyo. Invertido total de mierda, gilipollas.',
  'El atraco de %A fue un donativo disfrazado de robo. %V no dijo que no al ingreso. Lógico, patético, y el grupo se cagó de risa en silencio.',
  '%A perdió el robo y el aura en el mismo ticket. %V ganó el día sin sudar el ataque. Eficiente de asco, asco.',
  'Desastre de %A: intentó quitar y terminó poniendo aura en la cuenta de %V. Matemáticas al revés de mierda, basura.',
  '%A firmó un cheque al portador a nombre de %V con la tinta de su propio fallo. Cortesía extrema de inutil, ridículo.',
  '%A el plan salió tan mal que %V cobró peaje por el simple hecho de haber sido el objetivo, fracasado.',
  '%A vs %V: marcador final a favor de quien debía perder el aura según el guion de %A. Guion roto de mierda, cutre.',
  '%A no solo falló el golpe: abrió la cartera y %V dijo gracias en silencio de ranking. Peaje cobrado, joder.',
  'Desastre documentado: %A más ligero, %V más pesado de aura y el chat más contento con el show de mierda, mierda.',
  '%A salió a por el botín y volvió sin el suyo. %V sonríe con lo de los dos en el contador. Combo de puta madre, coño.',
  '%A intentó robar a %V y terminó de patrocinador oficial de su aura en el ranking del grupo, gilipollas.',
  'Desastre en limpio: %A en números rojos, %V en verde y el intento en el museo de fails del chat, patético.',
  '%A puso la mano para quitar y la retiró dejando de más. %V no se queja del error de contabilidad de mierda, asco.',
  '%A vs %V terminó en donación involuntaria con público completo en el hilo. Aplausos al peaje, basura.',
  '%A el atraco perfecto al revés: todo lo que podía salir mal salió y además cobró a favor de %V, ridículo.',
  '%A perdió el duelo del atraco y el del saldo. %V ni tenía que haber peleado de verdad. Walkover de asco, fracasado.',
  'Desastre de manual: autor %A, beneficiario %V y el grupo testigo de la limosna forzada, cutre, y el grupo se cagó de risa en silencio.',
  '%A salió a cazar aura ajena y volvió dejando la propia en el plato de %V. Servicio a domicilio de mierda, joder.',
  '%A el fallo no bastaba como castigo: hacía falta el peaje. %V lo cobró entero sin pedir el puesto, mierda.',
  '%A vs %V: el ladrón pagó la cena y la propina del ranking ajeno. Generosidad involuntaria de puto inutil, coño.',
  '%A intentó el golpe de la semana y firmó la donación del mes a nombre de %V. Calendario invertido, cabrón.',
  '%A sin el botín de %V y sin el suyo. %V con ambos sonidos de caja en el contador. Feliz de asco, asco.',
  '%A el plan era quitar. El resultado fue dar. %V aplaude en silencio de ranking. Lógico, basura, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el ranking más justo de lo que %A quería ver en pantalla. Justicia poética de mierda, ridículo.',
  '%A falló tan fuerte que el eco le cobró aura a favor de %V en el sistema del bot, fracasado, y el grupo se cagó de risa en silencio.',
  'Desastre: %A más pobre por intentar ser más rico a costa de %V y salir escaldado del intento, cutre.',
  '%A vs %V: crónica de un donativo anunciado como robo en el comando. Publicidad engañosa de mierda, coño.',
  '%A salió a vaciar a %V y terminó vaciándose él. El chat tomó nota del peaje con gusto, cabrón, y el grupo se cagó de risa en silencio.',
  '%A el karma contó el intento y pasó factura con el aura de %A hacia %V. Contabilidad divina de puta madre, gilipollas.',
  'Desastre de %A: no hay premio de consolación, hay peaje cobrado en el ranking a favor de %V, patético.',
  '%A intentó el atraco y %V terminó cobrando el servicio de haber sido el objetivo del comando, asco, y el grupo se cagó de risa en silencio.',
  '%A vs %V en modo desastre: gana quien debía perder según el guion original de %A. Guion en llamas, basura.',
  '%A puso la trampa y pagó la fianza. %V recogió ambas cosas en el contador. Servicio completo de mierda, ridículo.',
  '%A sin gloria en el parte y con el saldo peor. %V con el día hecho en el ranking sin atacar, fracasado.',
  'Desastre total: el aura de %A emigró hacia %V sin pedir asilo ni contrato de robo exitoso, cutre, y el grupo se cagó de risa en silencio.',
  '%A el golpe salió por la culata y la culata cobraba en unidades de aura a favor de %V, joder, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con transfer automático por incompetencia documentada de %A, mierda, y el grupo se cagó de risa en silencio.',
  '%A el fail no era suficiente castigo: hacía falta el peaje. Cobrado a favor de %V sin discutir, cabrón.',
  'Desastre documentado de %A a favor de %V: el ranking no discute el cargo ni ofrece recurso, gilipollas.',
  '%A intentó quitar y el sistema sumó en la columna de %V. Matemáticas del desastre puro de mierda, patético.',
  '%A vs %V: el ladrón pagó la entrada, la consumición y la propina del ranking ajeno. Todo incluido, asco.',
  '%A perdió el robo, el aura y la cara. %V solo tenía que existir en el objetivo del comando, ridículo.',
  'Desastre: %A en modo patrocinador involuntario de %V en el contador del grupo, fracasado, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el contador de %A en menos y el de %V en más sin debate posible, joder, y el grupo se cagó de risa en silencio.',
  '%A salió a por todo y volvió con menos de lo que tenía. %V agradece el ingreso inesperado, mierda, y el grupo se cagó de risa en silencio.',
  'Desastre de %A: el botín viajó hacia %V con remitente el fallo del intento de %A, cabrón, y el grupo se cagó de risa en silencio.',
  '%A intentó el golpe y terminó de cajero automático a favor de %V en el ranking del grupo, gilipollas.',
  '%A vs %V en una línea de acta: %A pagó. Punto y cierre del desastre del comando, patético, y el grupo se cagó de risa en silencio.',
  '%A el atraco fue un transfer con pasos extra innecesarios y resultado invertido a favor de %V, asco.',
  '%A sin el aura de %V y sin la suya completa. %V con el combo ganado sin atacar de verdad, basura, y el grupo se cagó de risa en silencio.',
  '%A puso el robo en el horno y se coció él. %V se comió el plato del ranking sin pedir menú, fracasado.',
  '%A el karma no negocia el peaje del fail. %V cobra en silencio de contador y sonríe, cutre, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el peaje más caro del día para la cuenta de %A en el ranking, joder, y el grupo se cagó de risa en silencio.',
  '%A salió a vaciar bolsillos ajenos y terminó vaciando el suyo. %V testigo y cajero del peaje, mierda.',
  '%A el fallo con recargo: el recargo en aura a nombre de %V en el sistema del bot, coño, y el grupo se cagó de risa en silencio.',
  'Desastre: %A más ligero, %V más contento y el chat más entretenido con el peaje cobrado, cabrón, y el grupo se cagó de risa en silencio.',
  '%A intentó el atraco de oro y firmó la donación de bronce oxidado a %V. Cambio de metal de mierda, gilipollas.',
  '%A vs %V: crónica breve de un transfer largo y doloroso para %A en el ranking, patético, y el grupo se cagó de risa en silencio.',
  '%A el bumerán del robo le volvió con intereses de demora cobrados en aura a favor de %V, asco, y el grupo se cagó de risa en silencio.',
  '%A sin gloria en el parte y con el saldo empeorado. %V sin haber atacado de verdad en el comando, basura.',
  'Desastre de manual con factura visible: autor %A, beneficiario %V en el contador, ridículo, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el ranking corrigiendo a %A a la baja y a %V al alza sin debate, cutre, y el grupo se cagó de risa en silencio.',
  'Desastre: %A en rojo, %V en verde y el intento en el museo de fails del chat del grupo, coño, y el grupo se cagó de risa en silencio.',
  '%A puso la mano para sacar y el sistema registró un ingreso a favor de %V. Contabilidad del karma, cabrón.',
  '%A vs %V en modo donación involuntaria con público de pie en el hilo del grupo, gilipollas, y el grupo se cagó de risa en silencio.',
  '%A firmó la factura del intento: beneficiario claro %V en el contador del ranking, ridículo, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el ranking haciendo justicia poética a costa de %A en el comando, fracasado, y el grupo se cagó de risa en silencio.',
  '%A salió a cazar y volvió como trofeo de %V en el chat y en el número del ranking, cutre, y el grupo se cagó de risa en silencio.',
  'Desastre documentado: el aura de %A emigró con destino fijo a la cuenta de %V sin billete de vuelta, mierda.',
  '%A vs %V: una línea de acta del bot — %A pagó el peaje del intento fallido, cabrón, y el grupo se cagó de risa en silencio.',
  '%A el atraco fue un transfer con coreografía innecesaria y resultado invertido a favor de %V, gilipollas.',
  '%A sin aura nueva y sin aura vieja completa. %V con el día resuelto en el ranking sin atacar, patético.',
  '%A puso el robo en marcha y la marcha era atrás. %V recibió igual el ingreso del peaje, basura, y el grupo se cagó de risa en silencio.',
  '%A vs %V en una frase: el intento costó aura a quien lo empezó en el comando, ridículo, y el grupo se cagó de risa en silencio.',
  '%A el fail con intereses de demora: los intereses se llaman %V en el contador del ranking, fracasado.',
  '%A sin el plan original y con el cargo original. %V con el aura del peaje cobrado, cutre, y el grupo se cagó de risa en silencio.',
  'Desastre: %A más pobre por la ambición mal ejecutada contra %V en el ranking, joder, y el grupo se cagó de risa en silencio.',
  '%A intentó el golpe y el golpe le hizo de cajero a favor de %V en el ranking del grupo, mierda, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con transfer y sin una sola línea de gloria para %A en el parte, coño, y el grupo se cagó de risa en silencio.',
  '%A el bumerán volvió cobrando y no aceptó devolución del peaje en aura a favor de %V, cabrón, y el grupo se cagó de risa en silencio.',
  '%A perdió el duelo del atraco y el del contador. %V sin ponerse los guantes del comando, gilipollas.',
  '%A vs %V: ranking a la baja para %A, al alza para %V, sin debate útil en el hilo, basura, y el grupo se cagó de risa en silencio.',
  '%A el peaje del fail se cobró solo. %V fue el cajero que no pidió el puesto del ranking, fracasado, y el grupo se cagó de risa en silencio.',
  'Desastre documentado a favor de %V con autor intelectual %A en negrita del parte, cutre, y el grupo se cagó de risa en silencio.',
  '%A intentó el atraco y terminó de mecenas involuntario de %V en el ranking del grupo, joder, y el grupo se cagó de risa en silencio.',
  '%A vs %V en modo desastre limpio: sin duda del resultado ni del peaje cobrado, mierda, y el grupo se cagó de risa en silencio.',
  '%A el aura viajó al revés. El chat viajó a la risa del peaje cobrado a favor de %V, coño, y el grupo se cagó de risa en silencio.',
  '%A sin gloria y con el saldo en menos. %V sin haber pedido nada del regalo del peaje, cabrón, y el grupo se cagó de risa en silencio.',
  'Desastre total: %A financió a %V con el intento mismo de robarle el aura del ranking, gilipollas, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con %A de patrocinador y %V de marca beneficiada del peaje, asco, y el grupo se cagó de risa en silencio.',
  '%A perdió lo que quería ganar y lo que ya tenía. %V solo miró el ingreso del peaje, ridículo, y el grupo se cagó de risa en silencio.',
  '%A el universo no negocia el peaje del fail. %V cobra en silencio de contador del ranking, cutre, y el grupo se cagó de risa en silencio.',
  '%A vs %V: crónica de un donativo con coreografía fallida de atraco del comando, joder, y el grupo se cagó de risa en silencio.',
  '%A salió a vaciar a %V y terminó en la cola del cajero al revés del ranking, mierda, y el grupo se cagó de risa en silencio.',
  '%A el fallo con recargo automático: recargo a nombre de %V en el sistema del bot, coño, y el grupo se cagó de risa en silencio.',
  '%A intentó el golpe de oro y firmó el cargo de plomo a favor de %V en el ranking, gilipollas, y el grupo se cagó de risa en silencio.',
  '%A vs %V terminó con el contador de %A en dirección incorrecta del todo en el ranking, patético, y el grupo se cagó de risa en silencio.',
  '%A el bumerán del robo le cobró el viaje de ida y vuelta en aura a favor de %V, asco, y el grupo se cagó de risa en silencio.',
  '%A sin botín propio ni ajeno. %V con el combo ganado sin atacar de verdad en el comando, basura, y el grupo se cagó de risa en silencio.',
  'Desastre total documentado: %A deudor, %V acreedor y el grupo testigo del peaje, ridículo, y el grupo se cagó de risa en silencio.',
  '%A vs %V: el ladrón pagó la cena de los dos y la propina del ranking ajeno, cutre, y el grupo se cagó de risa en silencio.'
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
    const corona = i === 0 ? '— *con diana en la espalda* y el ranking lo deja claro.' : '';
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
  // can't both pass the check above and steal twice. Refunded on the paths below // where no robbery actually happens, so a failed attempt doesn.'t burn 10 min.
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
  const notaDinamicas = notaApuesta + notaTope + (motivos.length ? `\n_${motivos.join('· y el ranking lo deja claro.')}_` : '');

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
