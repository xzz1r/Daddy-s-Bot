const { isOwner, isMainOwner, isAdmin, getSender, getTarget, canonicalJid, sameUser } = require('../utils/wa');
const { getAura, addAura } = require('../utils/auraStore');
const { pickFresh, fmt, ordenarPorDureza } = require('../utils/helpers');
const { ROBO, RIESGO, ROBO_BASE, ROBO_LIMITES, ROBO_OWNER_MIN } = require('../utils/economia');

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
  '%A le roba el aura a %V en plena cara del grupo. %V se defendió como se defiende de todo en la vida: con cero éxito y mucha cara de sorpresa.',
  'Saqueo limpio de %A sobre %V. El aura cambió de dueño tan rápido que %V todavía la está buscando en los bolsillos, el pobre infeliz.',
  '%A le arranca el aura a %V sin resistencia. Robarle a %V es como quitarle el móvil a una estatua: ni se mueve, ni se queja, ni se entera.',
  'Robo consumado. %A entró, cogió el aura de %V y se fue silbando. %V se quedó con cara de puto pasmado, la única que sabe poner este inútil ante cualquier cosa.',
  '%A desvalija a %V delante de todos. %V puede llorar y poner excusas, pero el marcador no miente y el espejo, por desgracia para él, tampoco.',
  'El aura de %V cambió de manos en un parpadeo. %A lo ejecutó limpio. %V lo culpará a la mala suerte, porque admitir que es un blando le dolería más que el robo.',
  '%A roba el aura de %V y nadie en el grupo mueve un dedo por defenderlo. A %V lo dejan caer con la misma facilidad con la que se cae solo, por pura costumbre.',
  'Saqueo directo de %A a %V. Hoy %V pierde aura; mañana perderá otra cosa. %V, no es la economía, perdedor: eres tú, que tienes un agujero por donde se te va todo.',
  '%A le quita el aura a %V con la facilidad de robarle el caramelo a un crío. La diferencia es que el crío al menos berrea; %V, pobre mierda blanda, solo parpadea como un pasmarote.',
  '%A drena el aura de %V en público. %V lo apunta como "mala racha". El grupo lo apunta como lo que es: el cajero andante de cualquiera con un poco de cara.',
  'El aura de %V ahora es de %A, y ni tiempo de reaccionar tuvo. %V, cuando eres tan invisible, hasta robarte resulta cómodo: nadie te mira, ni para vigilarte.',
  '%A trata el aura de %V como propia, porque en la práctica lo es. %V no retiene nada de lo que toca; es un colador con forma de persona y autoestima de saldo.',
  'Robo limpio y el aura de %V en el bolsillo de %A. %V aprenderá la lección. Es broma: este inútil no aprende una puta mierda, tropieza con la misma piedra hasta cansarla.',
  '%A le hace una limpieza completa al aura de %V. %V tenía aura, pero cero carácter para protegerla. Tener sin saber retener: el deporte nacional de los pringados.',
  'El aura de %V acaba de financiar el ascenso de %A. %V es de esos que trabajan gratis para quien los pisa, sin enterarse y sin cobrar. Mecenas de su propio verdugo.',
  '%A le saca el aura a %V como quien le quita un juguete a un crío que ni llora. Cero resistencia, cero sorpresa.',
  'Robo consumado. %V tenía aura por accidente y %A vino a corregir ese error del universo.',
  '%A se lleva lo de %V con la naturalidad del que sabe que nadie va a defender a este pringado.',
  'Saqueo limpio. %V se queda mirando el marcador como si mirarlo fuera a devolverle algo.',
  '%A opera y %V paga. Es un intercambio muy desigual, pero justo para el nivel de cada uno.',
  'El aura de %V cambia de manos otra vez. A este paso deberían ponerle una puerta giratoria.',
  '%A roba y %V ni protesta. Protestar es de gente con algo que defender, y ahí no había nada.',
  'Robo ejecutado. %V va a decir que se dejó ganar. Nadie se lo va a creer, ni él mismo.',
  '%A se lleva el aura y %V se lleva la lección. Bueno, se la lleva no: la deja tirada como todo.',
  '%V acaba de descubrir que su aura era prestada y %A vino a cobrar el préstamo con intereses.',
  '%A le quita a %V lo poco que había conseguido acumular. Cruel, eficiente, y absolutamente merecido.',
  'Saqueo sin resistencia. %V debería plantearse por qué es el objetivo favorito de todo el grupo.',
  '%A entra, coge y sale. %V sigue procesando la primera parte mientras el otro ya está gastándolo.',
  'El aura de %V se muda al bolsillo de %A. Hasta el aura prefiere estar en otra parte, fíjate.',
  '%A roba con la tranquilidad del que sabe que %V no va a hacer absolutamente nada al respecto.',
  'Robo limpio y aburrido. Le quitas algo a %V y no pasa nada, como quitarle una silla a un fantasma.',
  '%A se lo lleva sin despeinarse. %V lleva tanto tiempo siendo víctima que ya casi es su profesión.',
  'Aura transferida por la fuerza. %V lo va a llamar robo; el grupo lo va a llamar redistribución justa.',
  '%A cobra lo suyo de la cuenta de %V. Nadie lo autorizó y a nadie le importa, empezando por %V.',
  'Saqueo confirmado. %V pierde aura y gana otra anécdota para la lista de cosas que le pasan por blando.',
  '%A se lleva su parte y %V se queda con la cara de siempre: la de no haber entendido nada todavía.',
  'Robo tan fácil que da pereza contarlo. %V es el cajero automático del grupo y todos tienen la clave.',
  '%A le limpia el aura a %V con una facilidad que debería avergonzar a alguien. A %V, concretamente.',
  'Aura extraída con éxito. %V debería cobrar por ser el objetivo de prácticas de todo el grupo.',
  '%A opera sobre %V sin oposición. Es menos un robo y más una recogida programada de basura.',
  'Golpe limpio. %V protege su aura igual que protege todo lo demás en su vida: mirando desde lejos.',
  '%A se lleva lo de %V y el grupo ni reacciona. Nadie se altera cuando pasa lo esperable.',
  'Robo cerrado. %V tenía aura hasta hace diez segundos y ahora tiene una historia triste que contar.',
  '%A le vacía a %V sin prisa, porque sabe que nadie va a venir a interrumpir. Ni %V mismo.',
  'Saqueo tranquilo. Robarle a %V no requiere talento, requiere estar despierto. %A lo estaba.',
  '%A le vació los bolsillos a %V y se fue silbando. %V, ni te enteraste, pringado.',
  'Saqueo total: %A se llevó casi el doble de %V. %V, te han dejado el esqueleto, inútil.',
  '%A solo pudo arrancarle la mitad a %V. Media humillación es la única cosa a medias que %V se merece.',
  '%V dejó su dinero sin vigilancia porque es un cero a la izquierda. %A solo tuvo que agacharse a recogerlo.',
  '%A entró, arrasó y salió. %V se quedó mirando el hueco donde antes tenía algo, como el don nadie que es.',
  'Lo pillaron a medias, pero %A todavía se llevó un pedazo de %V. Los dos quedan fatal, aunque %V queda peor.',
  '%V, tu defensa fue tan patética que %A ni sudó. Puta mierda de rival.',
  '%A duplicó lo apostado a costa de %V. Eso no es robo, es limpieza de basura.',
  'A %V le quitaron la mitad y aún así se siente atracado del todo. Normal, %A no necesitaba más.',
  '%A se llevó lo apostado de %V limpio, sin ruido. Igual que tu vida, %V: sin ruido y sin nada.',
  '%V custodiaba su dinero como custodia su dignidad: fatal. %A dio las gracias.',
  'Saqueo de manual. %A dejó a %V en cifras negativas y en ridículo permanente.',
  '%A solo raspó una parte de %V. Ni robándote se puede sacar algo decente, muerto de hambre.',
  '%V se dejó robar sin pestañear. %A ni siquiera lo cuenta como victoria, lo cuenta como recogida de residuos.',
  '%A se llevó casi el doble. %V, lo tuyo ya no es mala suerte, es una condición permanente de fracasado.',
  'El robo salió a medias y aun así %V salió perdiendo. %A ni se molestó en terminar el trabajo.',
  '%A abrió la caja de %V como quien abre una lata vacía. Poco premio para tanto don nadie.',
  '%V, %A te robó y el grupo entero se la suda. Eso duele más que el dinero.',
  'Doble botín para %A. %V se queda sin monedas, sin excusas y sin ningún argumento para seguir hablando.',
  '%A dejó a medias el atraco a %V porque hasta robarte aburre.',
  'Limpio y sin resistencia: %A tomó lo de %V. Un inútil no defiende nada, solo lo pierde.',
  '%V acaba de descubrir que sus cosas son de %A cuando a %A le apetece.',
  'Un tirón parcial y %V ya está temblando. %A ni ha empezado, pringado.',
  '%A saqueó a %V hasta el forro. No queda ni el orgullo, que ya era poco.',
  '%V no supo defender ni una moneda. %A se llevó lo apostado y una anécdota para reírse un mes.',
  'Robo a medias, humillación entera. %A se lleva un trozo de %V y todo el respeto.',
  '%A se llevó lo que %V nunca supo merecer. Cero a la izquierda antes, cero a la izquierda ahora.',
  'Lo de %A no fue un robo, fue una demolición. %V ya no tiene ni cimientos.',
  '%A rascó una parte de %V y aun así se le nota que le sobra talento. A %V le falta todo.',
  '%V, tu caja estaba tan sola como tú. %A entró sin llamar.',
  '%A dobló su apuesta con el dinero de %V. Joder, qué fácil es vivir de los inútiles.',
  '%A se marchó con lo de %V sin dejar rastro. %V tampoco deja rastro en ningún sitio, así que están en paz.',
  'Saqueo brutal: %A se llevó casi el doble y %V se llevó una lección que no va a entender.',
  '%A le quitó lo apostado a %V mientras %V presumía. Sigue hablando, campeón de nada.',
  '%V no perdió por descuido. Perdió porque es %V. %A solo puso la mano.',
  'Botín doble para %A. De %V no queda ni la sombra, y su sombra ya era mediocre.',
  'Robo parcial, ridículo completo. %A se lleva algo, %V se queda con la fama de fácil.',
  '%A entró en las cuentas de %V como quien entra en un local abandonado.',
  '%V, a ti no te roban: te reciclan. %A solo aprovechó el material.',
  '%A arrasó a %V y la banca aplaude. %V, nadie va a defenderte, don nadie.',
  'Un trozo se le escapó a %A, pero a %V se le escapó la dignidad entera.',
  '%A se llevó limpio lo de %V. Ni alarma, ni resistencia, ni un mísero intento.',
  'Saqueo doble de %A. %V ha pasado de ser pobre a ser un concepto abstracto de pobreza.',
  '%A solo pudo llevarse la mitad de %V, y aún así %V es el único que sale mal en la foto.',
  '%V confiaba en su suerte. %A confiaba en que %V es un inútil. Ganó el que tenía razón.',
  '%A le desmontó el bolsillo a %V pieza a pieza. Quirúrgico y humillante.',
  'Con lo poco que le sacó %A, ya se ve que %V es un muerto de hambre. Pero se lo sacó igual.',
  '%A robó a %V y ni siquiera cambió de expresión. %V, robarte no emociona a nadie.',
  '%V acaba de financiar el doble de la apuesta de %A. Gracias por el patrocinio, fracasado.',
  'El atraco salió a medias porque %A se aburrió. %V no daba para más.',
  '%A se llevó lo apostado y %V se llevó las manos a la cabeza. Tarde, como siempre.',
  '%V es el único que sale a la calle con el cartel de víctima puesto. %A solo supo leer.',
  'Saqueo total de %A. A %V le quedan las deudas y esa cara de mierda que pone siempre.',
  '%A pilló media bolsa de %V y sigue siendo más de lo que %V ganó en su vida por mérito.',
  '%V, tu caja fuerte era una caja de cartón. %A ni tuvo que romperla.',
  '%A dobló el botín a costa de %V y todavía tuvo tiempo de reírse.',
  '%A se llevó lo de %V con la elegancia de quien recoge algo del suelo.',
  '%V perdió sin luchar. %A ganó sin esforzarse. La partida más injusta y a la vez más justa.',
  'Casi el doble para %A. %V queda arrasado, en ruina y, lo peor, exactamente igual de irrelevante.',
  '%A solo arañó una parte de %V y ya le sobra para presumir un mes.',
  '%V vigilaba su dinero igual que gestiona su vida: mirando a otro lado. %A aprovechó.',
  '%A saqueó a %V y el chat entero se la suda. Nadie llora por un cero a la izquierda.',
  'El golpe de %A quedó incompleto, pero la reputación de %V quedó destruida del todo.',
  '%A se llevó limpio el botín de %V. Coño, %V, ni un intento de defenderte.',
  '%V acaba de perder el doble de lo que valía. %A lo tiene, %V no lo tiene, así funciona el mundo.',
  '%A no robó a %V, %A recuperó recursos que estaban desperdiciados en un inútil.',
  '%V salió a jugar como si valiera algo. %A lo devolvió a la realidad en dos segundos.',
  'Botín doble para %A y ni una moneda para %V. %V, esa balanza describe tu existencia entera.',
  '%A se llevó media bolsa de %V. La otra mitad no la quiso, olía a fracaso.',
  '%A vació a %V y le dejó el orgullo como recuerdo. Un recuerdo barato.',
  'Robo parcial y aún así %V está peor que antes. %A ni ha calentado.',
  '%V, %A se llevó lo apostado y también la poca credibilidad que te quedaba.',
  'Saqueo integral de %A. %V ya no tiene fondos, ni argumentos, ni una puta cosa que aportar.',
  '%A dejó a %V a medio pelar. %V, ni para robarte sale bien redondo, muerto de hambre.',
  '%A se llevó lo de %V sin despeinarse. Los inútiles no ofrecen resistencia, ofrecen facilidades.',
  '%V financió el doble botín de %A y encima quiere revancha. %V, la revancha también la vas a perder.',
  '%A limpió a %V con la calma de quien sabe que nadie va a reclamar nada.',
  '%V es la razón por la que existe el comando de robo. %A solo cumple la función.',
  'Golpe maestro de %A. %V queda reducido a lo que siempre fue: nada con nombre de usuario.',
  '%A se llevó un trozo de %V y ya está pensando en volver a por el resto.',
  'Robo limpio. %A entró, %V se quedó quieto, el universo siguió indiferente.',
  '%A dobló su dinero gracias a %V. %V, ser tu víctima es la inversión más rentable del grupo.',
  'El golpe fue parcial porque a %A le dio pereza terminar. %V no compensaba el esfuerzo.',
  '%V, %A te robó delante de todos y nadie movió un dedo. Ese es tu peso real aquí.',
  'Saqueo completo de %A. A %V le queda el eco de sus propias excusas.',
  '%A rascó lo que pudo de %V. Poco, patético, pero suyo.',
  '%V dejó su apuesta a la vista. %A hizo lo que cualquiera haría con la basura ajena: llevársela.',
  'Casi el doble se lleva %A. %V pasa de jugador a decorado.',
  'Media bolsa para %A y cero respeto para %V. El reparto de siempre.',
  '%A desplumó a %V sin alzar la voz. Contra un don nadie no hace falta gritar.',
  '%V perdió lo apostado ante %A y sigue creyendo que fue mala suerte. No, fuiste tú.',
  'Botín doble. %A brilla, %V se apaga. Nada nuevo bajo el sol.',
  '%A se llevó una parte de %V y aún así %V lo cuenta como que aguantó. Fracasado hasta narrando.',
  '%A limpió la caja de %V. %V, si algo se te da bien es dejar las cosas al alcance de cualquiera.',
  '%V dejó su aura sin vigilancia porque es un cero a la izquierda. %A solo tuvo que agacharse.',
  '%A se llevó lo apostado de %V limpio y sin ruido. Igual que tu vida, %V: sin ruido y sin nada.',
  '%V se dejó robar sin pestañear. %A no lo cuenta como victoria, lo cuenta como recogida de residuos.',
  '%V, %A te robó y al grupo entero se la suda. Eso duele bastante más que el aura perdida.',
  '%V acaba de descubrir que sus cosas son de %A cuando a %A le apetece. Puta lección barata.',
  '%V no supo defender ni una moneda. %A se llevó lo apostado y una anécdota para un mes.',
  '%A se llevó lo que %V nunca supo merecer. Cero a la izquierda antes y cero a la izquierda ahora.',
  '%V, tu caja estaba tan sola como tú. %A entró sin llamar y salió sin despedirse.',
  '%A se marchó con lo de %V sin dejar rastro. %V tampoco deja rastro en ningún sitio, así que en paz.',
  '%V no perdió por descuido. Perdió porque es %V. %A solo tuvo que poner la mano debajo.',
  '%A entró en las cuentas de %V como quien entra en un local abandonado. Sin forzar nada.',
  '%V, a ti no te roban: te reciclan. %A solo aprovechó el material que ibas a tirar igual.',
  '%A robó a %V y ni cambió de expresión. %V, robarte no emociona a nadie, muerto de hambre.',
  '%V es el único que sale a la calle con el cartel de víctima puesto. %A solo supo leerlo.',
  '%V, tu caja fuerte era una caja de cartón. %A ni tuvo que romperla para vaciarla.',
  '%A se llevó lo de %V con la elegancia de quien recoge algo del suelo. Porque eso eras.',
  '%V vigilaba su aura igual que gestiona su vida: mirando a otro lado. %A aprovechó el hueco.',
  '%A se llevó limpio el botín de %V. Coño, %V, ni un puto intento de defenderte.',
  '%A no robó a %V. %A recuperó recursos que estaban desperdiciados en un inútil.',
  '%V, %A se llevó lo apostado y también la poca credibilidad que te quedaba en la lista.',
  '%A limpió a %V con la calma de quien sabe que nadie va a reclamar absolutamente nada.',
  '%V es la razón por la que existe el comando de robo. %A solo cumple con la función.',
  'Robo limpio: %A entró, %V se quedó quieto y el universo siguió igual de indiferente.',
  '%A dobló su aura gracias a %V. %V, ser tu víctima es la inversión más rentable del grupo.',
  '%A desplumó a %V sin alzar la voz. Contra un don nadie no hace falta gritar nunca.',
  '%V perdió lo apostado ante %A y sigue creyendo que fue mala suerte. No, %V, fuiste tú.',
  '%A limpió la caja de %V. Si algo se te da bien, %V, es dejar las cosas al alcance de cualquiera.',
  '%V ha sido saqueado por %A y su reacción más digna ha sido callarse. Sigue así, campeón.',
  '%A se llevó lo apostado y %V se quedó con la sensación de siempre: la de sobrar.',
  '%V apostó, %A cobró. En medio no hubo defensa, solo un hueco donde debería haber alguien.',
  '%A se llevó lo de %V limpiamente. Nadie ha aplaudido a %V nunca, y hoy tampoco.',
  '%A vació a %V y lo dejó con la excusa ya preparada. Ahórratela, %V, no la quiere nadie.',
  '%V acaba de comprobar que su aura también es de %A cuando a %A le da la gana.',
  '%A robó limpio a %V. Ni ruido, ni forcejeo, ni un puto gesto de dignidad por el camino.',
  '%V, con lo que %A te sacó se paga la ronda del grupo. Al menos sirves para eso.',
  '%V dejó pasar a %A sin resistencia. %V, igual que dejas pasar todo lo demás en tu vida.',
  '%A cogió lo de %V y se fue. %V se enteró tres mensajes después, como de costumbre.',
  'Robo limpio de %A. %V se queda con lo que siempre tuvo: nada y una opinión que no importa.',
  '%V custodiaba su aura como quien custodia humo. %A ni tuvo que apretar la mano.',
  '%A se llevó lo apostado y %V se llevó el título indiscutible de blanco fácil del grupo.',
  '%A limpió a %V con un solo movimiento. Contra un cero a la izquierda no hace falta plan.',
  '%V acaba de aportar a la cuenta de %A. %V, tu única contribución útil en meses, muerto de hambre.',
  '%A se llevó lo de %V y nadie lo va a reclamar. Nadie reclama nada por un don nadie.',
  '%A tomó lo apostado por %V con la naturalidad de quien recoge lo que nadie quiere.',
  '%V se ha quedado sin aura y sin coartada. %A ya está en otra cosa desde hace rato.',
  '%A ni se despidió después de vaciar a %V. Despedirse implicaría que estabas ahí, %V.',
  '%V financió a %A sin querer y sin poder evitarlo. %V, esa es tu función exacta en este grupo.',
  '%A limpió a %V sin resistencia, sin drama y sin ningún interés. Lo humillante es la indiferencia.',
  '%V apostó con la seguridad de un inútil. %A cobró con la calma de quien ya lo sabía.',
  '%V pierde lo apostado ante %A y el chat sigue como si nada. Porque no eres nada, %V.',
  '%A vació la apuesta de %V mientras %V se creía listo. Ese es el chiste completo.',
  '%V se creía intocable. %A lo tocó, lo vació y se fue. Fin de la fantasía y del aura.',
  '%A se llevó lo de %V y ya está pensando en volver a por el resto. Prepárate, pringado.',
  '%V, %A te sacó lo apostado sin que te dieras cuenta. Y eso dice más de ti que del robo.',
  '%A robó a %V con la misma emoción con la que se saca la basura. Trámite y a otra cosa.',
  '%A se llevó lo de %V y %V sigue buscando dónde lo dejó. Puta capacidad de reacción.',
  '%V apostó como quien deja la puerta abierta. %A solo tuvo que entrar y coger lo suyo.',
  '%A cobró de %V sin resistencia. Contra alguien que no defiende nada, robar es administrar.',
  '%V perdió lo apostado y ni ha protestado. Ese silencio es lo más humillante de todo, %A ya se fue.',
  '%A limpió a %V y siguió a lo suyo. Ni la satisfacción de la victoria, de tan fácil que fue.',
  '%V, %A se llevó lo tuyo y el grupo ni ha comentado. Ahí tienes tu peso exacto en la lista.',
  '%A tomó lo de %V con la misma emoción con la que se recoge la mesa. Trámite puro.',
  '%V dejó su aura a la vista. %A hizo lo que haría cualquiera con lo que nadie vigila.',
  '%A se llevó lo apostado de %V. Y %V ni siquiera puede decir que le pillaron por sorpresa.',
  '%V ha vuelto a ser el más fácil del grupo. %A solo confirmó lo que ya se sabía.',
  '%A robó a %V y ni se molestó en disimular. Contra un don nadie no hace falta discreción.',
  '%V custodiaba su aura con la misma atención que pone en todo lo demás: ninguna. %A aprovechó.',
  '%A se llevó lo suyo y lo de %V. Y a %V le costará semanas darse cuenta de la diferencia.',
  '%V perdió sin enterarse. %A ganó sin esforzarse. Un intercambio muy desigual y muy justo.',
  '%A entró en la apuesta de %V como quien coge algo del suelo. Porque ahí estaba, tirado.',
  '%V, tu aura ahora es de %A y ni siquiera ha tenido que forzar nada. Puta miseria de defensa.',
  '%A se llevó lo apostado y %V se quedó con la cara. La cara de siempre, además.',
  '%V no defendió nada porque no tenía nada que defender de verdad. %A lo comprobó en directo.',
  '%A cobró a %V y se fue sin mirar atrás. Mirar atrás implicaría que había algo que ver.',
  '%A limpió a %V y ni le cambió el pulso. Robarte no es un reto, %V, es un recado.',
  '%V se creía preparado. %A le demostró en dos segundos que no lo estaba ni de lejos.',
  '%A se llevó lo de %V con la mano izquierda. La derecha ni la necesitó, muerto de hambre.',
  '%V, %A te ha vaciado y tú sigues explicando lo que ibas a hacer. Ya no importa, pringado.',
  '%A tomó lo apostado por %V sin que nadie levantara la voz. Ni %V, que era el interesado.',
  '%V perdió lo suyo ante %A y ya está buscando a quién echarle la culpa. %V, empieza por ti.',
  '%A robó limpio a %V y encima le dejó la sensación de que era inevitable. Y lo era.',
  '%V ha financiado a %A sin querer. Es lo más útil que ha hecho por alguien en meses.',
  '%A se llevó lo de %V y el marcador ni tembló. Lo que tenías no daba ni para temblor.',
  '%V apostó, %A cobró y el grupo bostezó. Ese es el resumen completo del asalto.',
  '%A se llevó lo de %V y ni tuvo que buscarlo. Estaba a la vista, como todo lo tuyo, %V.',
  '%V apostó sin defensa y %A cobró sin esfuerzo. Un intercambio muy limpio y muy humillante.',
  '%A cogió el aura de %V y se fue. %V se enteró cuando ya no quedaba nada que mirar.',
  '%A limpió a %V con la calma de quien sabe que nadie va a reclamar. Y nadie ha reclamado.',
  '%A robó a %V sin alzar la voz. Contra un don nadie nunca ha hecho falta gritar.',
  '%V custodiaba su aura como custodia todo lo demás: mal. %A solo aprovechó el descuido.',
  '%A se llevó lo apostado y %V se quedó con la excusa. Ahórratela, que no la quiere nadie.',
  '%V perdió sin pelear. %A ganó sin sudar. El reparto más justo que ha visto este grupo.',
  '%A tomó lo de %V como quien coge algo abandonado. Porque abandonado estaba, muerto de hambre.',
  '%V, %A te ha vaciado y tú sigues explicando tu estrategia. Ya no importa, pringado.',
  '%A cobró de %V y ni le cambió la cara. Robarte no emociona a nadie, y menos a %A.',
  '%V apostó, %A se lo llevó y el chat ni parpadeó. Ese silencio es lo peor de todo.',
  '%A limpió la apuesta de %V en un movimiento. Contra un cero a la izquierda no hace falta plan.',
  '%V se creía cubierto. %A le demostró en dos segundos que no lo estaba ni de lejos.',
  '%A se llevó lo de %V y ya está mirando a otro. Ni de víctima recurrente das el nivel.',
  '%V ha financiado a %A sin querer. Lo más útil que ha hecho por alguien en meses, la verdad.',
  '%A robó limpio y %V ni se resistió. Los inútiles no defienden, solo pierden con puntualidad.',
  '%V dejó su aura al alcance de cualquiera. %A resultó ser ese cualquiera, y con ganas.',
  '%A se llevó lo apostado por %V y el marcador ni tembló. No había peso suficiente, %V.',
  '%V perdió ante %A y ya está buscando culpable. Empieza por el espejo, muerto de hambre.',
  '%A cogió lo de %V con la mano izquierda. La derecha ni le hizo falta para nada.',
  '%V, %A se llevó lo tuyo delante de todos y nadie movió un dedo. Ese es tu peso real.',
  '%A tomó el aura de %V sin ceremonia. Ni la despedida se merecía el asalto, pringado.',
  '%V no supo defender ni lo básico. %A se llevó el aura y una anécdota para el mes.',
  '%A limpió a %V y siguió con lo suyo. Ni la satisfacción de ganar, de tan fácil que fue.',
  '%V acaba de comprobar que su aura era prestada. Y %A ha venido a recuperar el préstamo.',
  '%A se llevó lo apostado y %V se llevó la fama de blanco fácil. Un título que ya tenía.',
  '%A robó a %V con la naturalidad de quien recoge lo que nadie quiere. Y nadie lo quería.',
  '%V se dejó vaciar sin oponer nada. %A ni lo cuenta como victoria, lo cuenta como recado.',
  '%V apostó sin defensa alguna y %A cobró sin esfuerzo. Un intercambio limpio y humillante.',
  '%V custodiaba su aura como custodia todo: mal. %A solo aprovechó el descuido de siempre.',
  '%V perdió sin pelear y %A ganó sin sudar. El reparto más justo que ha visto este grupo.',
  '%V, %A te ha vaciado y sigues explicando tu estrategia. Ya no importa nada, pringado.',
  '%V ha financiado a %A sin querer. Lo más útil que ha hecho por alguien en muchos meses.',
  '%V dejó su aura al alcance de cualquiera y %A resultó ser ese cualquiera. Con ganas, además.',
  '%V perdió ante %A y ya busca culpable. Empieza por el espejo, muerto de hambre.',
];

const ROB_FAIL = [
  '%A intentó robarle el aura a %V y falló como falla en todo: con confianza de campeón y puntería de tuerto. Ahora paga la multa, lo único que se le da bien.',
  'Robo fallido de %A. %V ni se despeinó. Hasta el universo se ríe de los que salen a robar sin tener ni idea, y %A acaba de dar el espectáculo gratis.',
  '%A salió a robar aura y volvió con menos de la que tenía. Hasta para delinquir eres un fracaso, %A. Te habría salido más rentable quedarte quieto, tu especialidad.',
  'Intento de robo de %A sobre %V: bloqueado, expuesto y cobrado con intereses. %A pagó por creerse listo. Lección cara para una cabeza que vale tan poco.',
  '%A falla el robo y pierde aura en el intento. Lo más humillante no es que lo pararan, es que %V ni se enteró de que existía un atacante. Invisible hasta para sus víctimas.',
  'El robo de %A fue tan torpe que el propio sistema lo rechazó de oficio. %V no movió un dedo. Hay gente que apesta a fracaso, y %A acaba de perfumar el grupo entero.',
  '%A se creyó capaz de robarle a %V, y la realidad le presentó la factura por la cara. El aura de %V intacta; el ego de %A, esparcido por el suelo para que lo barran.',
  'Saqueo fallido. %A pierde aura por intentarlo; %V no pierde nada. Salir a subir robando y bajar más: el resumen perfecto de por qué %A vive debajo de todos.',
  '%A apostó al golpe con una chulería que su patético historial no respaldaba. %V lo dejó con una mano delante y otra detrás: como %A llegó al mundo y como se irá.',
  'El robo de %A quedó expuesto ante el grupo entero. Ni roba bien ni disimula. El aura baja, la vergüenza sube, y %V sigue tan tranquilo, sin saber que fue objetivo.',
  '%A sale con las manos vacías y la cuenta en rojo. Clásico del pringado que quiere saltarse la cola de la vida y acaba pagando por estar en ella. %V ni levanta la vista.',
  'Intento de robo: fallido. Penalización: aplicada. %A acaba de aprender que cuando eres tan inútil, atacar a otros es solo regalar tu aura con pasos intermedios.',
  '%A intentó el golpe y salió escaldado. %V ni se enteró de que existía un plan en marcha.',
  'Fracaso rotundo. %A pagó por intentar lo que no sabe hacer, que es prácticamente todo.',
  '%A se lanzó al robo con toda la confianza y toda la incompetencia. Ganó la incompetencia por goleada.',
  'Robo abortado. %A pierde aura y %V sigue tan pancho, sin saber que alguien lo intentó siquiera.',
  '%A la cagó y pagó. %A, el orden natural de las cosas cuando eres tan malo en lo que haces.',
  'Intento fallido. %A vuelve a casa más pobre y con el ego reventado, en ese orden de importancia.',
  '%A quiso robar sin tener ni las manos ni la cabeza para ello. El resultado estaba escrito.',
  'Fallo previsible. %A es de los que anuncian el golpe y luego se tropiezan con la puerta.',
  '%A pagó la multa por creerse capaz. El grupo entero lo vio y nadie se sorprendió lo más mínimo.',
  'Robo frustrado. %V ni tuvo que defenderse: bastó con que %A fuera exactamente quien es.',
  '%A perdió aura por intentar quitarla. Hay poesía en lo mal que se le da todo a este hombre.',
  'Intento patético. %A ni llegó a tocar el aura de %V y aun así salió perdiendo. Récord difícil.',
  '%A falló y pagó. %V ni levantó la vista del teléfono. Ese es el nivel de amenaza que representa.',
  'Robo fallido y caro. %A ahora tiene menos aura y exactamente la misma cantidad de talento.',
  '%A intentó ser listo y el marcador le recordó su sitio. Abajo, como siempre, sin apelación.',
  'Fracaso limpio. Ni siquiera fue emocionante: %A se estrelló solo, sin ayuda de nadie.',
  '%A pagó por el intento y no se llevó ni el consuelo. %V sigue con lo suyo, ajeno a todo.',
  'El robo salió mal desde el primer segundo. %A insiste en aprender por el método más caro.',
  '%A perdió. No es noticia, es rutina. Lo raro sería el día que le saliera algo bien.',
  'Intento cobrado. %A ahora entiende por qué nadie le encarga nada importante en la vida.',
  '%A se lanzó y rebotó. %V permanece intacto, indiferente y ligeramente más rico en dignidad.',
  'Robo cancelado por incompetencia manifiesta. %A paga la tasa y vuelve a la cola de los inútiles.',
  '%A quiso jugar a ladrón y el juego le cobró la entrada. Cara, para lo poco que duró.',
  'Fallo total. %A ni se acercó al botín y aun así encontró la forma de perder aura por el camino.',
  '%A la lió, pagó y aprendió nada. La secuencia completa de su vida en un solo comando.',
  'Intento fallido de %A. %V ni pestañeó. Cuesta más asustar a %V que robarle, y ya es decir.',
  '%A se estrelló contra su propia mediocridad. Un clásico que el grupo nunca se cansa de ver.',
  'Robo frustrado. La multa está pagada y la vergüenza está repartida entre todos los que lo vieron.',
  '%A intentó, falló, pagó y va a repetir. Porque aprender exige atención y de eso anda escaso.',
  'Fracaso caro. %A cambió aura por experiencia y encima la experiencia no le sirvió de nada.',
  '%A intentó robarle el aura a %V y lo único que se llevó fue la multa. Patético.',
  '%V ni se enteró del robo. %A, en cambio, se enteró de que es un inútil.',
  'Fallaste, %A. %V sigue con su aura intacta y tú con la cartera vacía.',
  '%A quiso ser ladrón y acabó siendo el chiste de %V.',
  'Robar a %V te salió tan mal, %A, que hasta la multa te queda barata.',
  '%V no movió ni un dedo y aun así te humilló, %A.',
  'Menudo pringado, %A. Le fuiste a robar a %V y volviste con menos que nada.',
  '%A, el único aura que se movió hoy fue la tuya, hacia el suelo. %V ni pestañeó.',
  '%V respira tranquilo. %A respira multas.',
  'Ni robando eres capaz de destacar, %A. %V te ganó sin jugar.',
  '%A fue a por el aura de %V y volvió con una lección: eres un cero a la izquierda.',
  'La mano de %A temblando, el aura de %V intacta. Puta mierda de intento.',
  '%A, hasta %V se aburre de lo fácil que eres de derrotar.',
  'Ni la multa duele tanto como saber que %V ni te tuvo en cuenta, %A.',
  '%A quiso el aura de %V por la vía rápida. Acabó por la vía del ridículo.',
  'Un don nadie, %A, intentando quitarle algo a %V. Resultado previsible.',
  '%A falló el robo y %V se lo tomó como un cumplido.',
  'Coño, %A, ni robando. %V te ha convertido en anécdota.',
  'Lo tuyo con %V no fue un robo, fue una donación con multa incluida, %A.',
  '%A, cada intento tuyo contra %V es un recordatorio público de tu incompetencia.',
  '%V ni se despeinó. %A se dejó la dignidad en el intento.',
  'Robar requiere talento, %A. Por eso el aura de %V sigue donde estaba.',
  '%A, te presentaste ante %V como ladrón y saliste como pagano.',
  'El aura de %V no está en peligro mientras existan tipos como tú, %A.',
  '%A, tu robo a %V tuvo el mismo efecto que tu opinión: ninguno.',
  'A %V se la suda tu intento, %A. La multa no.',
  'Fracasado profesional, %A. %V ni siquiera tuvo que defenderse.',
  'Fallaste contra %V, %A, y encima pagando. Eso es pagar por hacer el ridículo.',
  '%A, si robar fuera un examen, %V sería el aprobado y tú la hoja en blanco.',
  'Basura de intento, %A. %V ni se enteró de que existías hasta que fallaste.',
  '%A pagó una multa por intentar tocar el aura de %V. Caro para tan poco.',
  '%V duerme igual de bien. %A duerme más pobre y más inútil.',
  '%A, ni con las manos libres pudiste con %V.',
  'Ese robo fallido resume tu nivel entero, %A: querer lo de %V y no llegar.',
  '%V no te venció, %A. Te ignoró y aun así perdiste.',
  'Joder, %A, ni un carterista de pacotilla lo haría peor contra %V.',
  '%A, el aura de %V te miró y se quedó donde estaba.',
  'La multa que pagas, %A, es el precio de haber molestado a %V para nada.',
  'Muerto de hambre, %A. Fuiste a por lo de %V porque lo tuyo no vale ni la pena.',
  '%A intentó, %A falló, %A pagó. %V ni se enteró. Ese es el resumen.',
  'Ni pretendiéndolo eres bueno, %A. %V te dejó en evidencia sin abrir la boca.',
  '%A, tu carrera de ladrón duró menos que la paciencia de %V.',
  'Todo el grupo vio cómo %A rebotó contra %V. Patético.',
  '%A quiso subir robando y bajó pagando. %V sigue arriba.',
  'Que %V ni reaccionara es lo más humillante de tu intento, %A.',
  '%A, robarle a %V era tu gran plan. Menudo plan de mierda.',
  'La multa te la ganaste a pulso, %A. El respeto de %V ni lo rozaste.',
  '%V no perdió nada. %A perdió aura, dinero y lo poco que quedaba de su credibilidad.',
  '%A, hasta fallando eres predecible. %V lo vio venir desde lejos.',
  'Un intento, un fracaso, una multa. %A contra %V: victoria por incomparecencia.',
  '%A se lanzó a por lo de %V como quien va a por algo que no le corresponde. Y le salió como siempre.',
  '%V te dejó el aura delante y ni así, %A. Eres inútil de manual.',
  '%A, tu robo a %V tiene menos efecto que tus promesas.',
  'El único perjudicado del robo eres tú, %A. %V ni se dio cuenta.',
  '%A quería el aura de %V. Se llevó la vergüenza y la factura.',
  'Menuda puta mierda de robo, %A. %V ni se molestó en mirarte.',
  '%A, %V no es que te haya ganado. Es que tú te ganaste solo la humillación.',
  'Si el fracaso pagara, %A serías rico. Pregúntale a %V.',
  '%A falló contra %V y ahora es material de burla hasta nuevo aviso.',
  'Ni sumando todos tus intentos, %A, le arañarías un punto de aura a %V.',
  'Cero a la izquierda, %A. %V es el número y tú el adorno inútil.',
  '%A intentó ser un problema para %V y acabó siendo un chiste.',
  'La distancia entre %A y %V se mide en multas.',
  '%A, ese robo fallido contra %V va directo a tu historial de fracasos, que ya va lleno.',
  '%V ni levantó la vista. %A ya estaba pagando.',
  '%A, ni con ventaja, ni con sorpresa, ni con suerte. %V te aplastó sin querer.',
  'Robaste tan mal, %A, que %V debería cobrarte por el espectáculo.',
  '%A, tu intento contra %V fue una demostración pública de incompetencia.',
  '%V está exactamente igual. %A está exactamente peor.',
  'Pringado, %A. Le tocaste el aura a %V y se te quedó pegada la multa.',
  '%A, robar a %V requería un mínimo de habilidad. Ahí murió el plan.',
  'Ese fallo no fue mala suerte, %A. %V es simplemente mejor y tú simplemente inútil.',
  '%A pagó por perder contra %V. Hay que ser muy pringado para eso.',
  '%V no defendió nada. %A lo intentó todo. Ganó %V.',
  '%A, el grupo entero acaba de confirmar que no sirves ni para robarle a %V.',
  'Tu nombre y el de %V en la misma frase, %A, y aun así se nota quién sobra.',
  '%A intentó llevarse el aura de %V y volvió con el bolsillo vacío. Coño, qué desastre.',
  'A %V se la suda que existas, %A. %A, Y aun así te ganó.',
  '%A, no hay multa suficiente para cobrar tanto ridículo frente a %V.',
  'Fracasado, %A. %V ni siquiera va a acordarse de tu intento mañana.',
  '%A quiso quitarle algo a %V y solo consiguió confirmar que no tiene nada propio.',
  'El aura de %V ni se inmutó. %A sí, %A se hundió.',
  '%A, robarle a %V era tu única salida y la fallaste. Menudo callejón.',
  '%V te ha dado la mejor lección sin decirte una palabra, %A: no das el nivel.',
  '%A, después de esto, %V debería usarte de ejemplo de lo que no hay que hacer.',
  'Fallaste tan fuerte, %A, que %V ganó reputación sin mover un músculo.',
  '%A, tu robo a %V fue tan malo que hasta la multa parece piadosa.',
  'La única aura que %A generó hoy es la de perdedor. %V ni la roza.',
  '%A, %V está intacto y tú estás en ridículo. Justo lo previsible.',
  'Robarle aura a %V exige mérito, %A. %A, Y tú de mérito vas a cero.',
  '%A, ya ni tu fracaso sorprende. A %V tampoco.',
  'Cada vez que %A intenta algo contra %V, el grupo aprende algo nuevo sobre la incompetencia.',
  '%A, ese fallo contra %V es tu currículum entero en un solo movimiento.',
  '%V no necesitó suerte. %A necesitaba un milagro y tampoco llegó.',
  '%A pagó multa por intentar robarle a %V. Imagina ser tan inútil que hasta intentarlo sale caro.',
  '%V ni se despeinó, %A. %A, tú te dejaste ahí la poca dignidad que arrastrabas.',
  '%A, robarle a %V era difícil, pero tú lo hiciste imposible.',
  'La mierda de intento de %A no rozó ni el borde del aura de %V.',
  '%A, %V no te venció por fuerza. Te venció mientras hacía otra cosa.',
  'Fracaso limpio, %A. Y %V limpio de polvo y paja.',
  '%A quiso atajar y se estrelló. %V sigue caminando tranquilo.',
  '%A, ni de ladrón das el nivel. %V te lo demostró gratis.',
  'El aura de %V es intocable para manos tan inútiles como las tuyas, %A.',
  '%A, hoy no perdiste contra %V. Perdiste contra tu propia incapacidad.',
  'Basura de ejecución, %A. %V ni tuvo que participar.',
  '%A, tu intento fallido contra %V ya circula como chiste. Bien merecido.',
  '%V lo conserva todo. %A conserva la multa y la vergüenza.',
  '%A, robarle a %V era tu momento y lo convertiste en tu ridículo.',
  'Menudo don nadie, %A. Ni robando consigues que %V te tome en serio.',
  '%A, si %V hubiera parpadeado, se habría perdido tu fracaso entero.',
  '%A intentó, falló y pagó. %V ni cambió de postura.',
  'Joder, %A, hasta fallar tiene niveles y tú elegiste el más patético frente a %V.',
  '%A, el aura de %V no se roba con excusas. Y tú solo tienes eso.',
  'La multa de %A financia la tranquilidad de %V. Poético y patético.',
  '%A, nadie esperaba que le ganaras a %V. Y aun así decepcionaste.',
  '%V te trató como lo que eres, %A: irrelevante.',
  '%A quiso jugar a ladrón contra %V y terminó de contribuyente.',
  'Ni con las dos manos, %A. %V sigue con su aura completa.',
  '%A, tu robo fallido a %V es el resumen perfecto de tu paso por este grupo.',
  '%V no se defendió porque no hacía falta. Contra %A nunca hace falta.',
  '%A, ese intento contra %V fue tan flojo que la multa parece un premio de consolación.',
  'Puta mierda de ladrón, %A. %V ni te vio venir y aun así ganó.',
  '%A, robarle a %V requería agallas. Tú llevaste excusas.',
  'El grupo entero vio cómo %V te dejaba en nada, %A.',
  '%A, tu aura no sube robando. Y menos si el objetivo es %V.',
  '%V intacto, %A en bancarrota. Fin del intento.',
  '%A, hoy demostraste que ni el atajo te funciona. %V te lo agradece.',
  'Muerto de hambre, %A. Fuiste a por lo de %V porque tú no generas nada propio.',
  '%A, el único que perdió algo hoy fuiste tú. %V ni cuenta se dio.',
  'Fallar contra %V no es raro, %A. Fallar así de mal, sí.',
  '%A se acercó al aura de %V y rebotó como todo lo que intenta.',
  '%A, no eres rival para %V. Eres trámite.',
  'La multa te la mereces, %A, por hacerle perder el tiempo a %V.',
  '%A, tu intento de robo fue tan inútil que %V lo confundió con nada.',
  '%V ni se molestó. %A sí, %A se hundió solo.',
  '%A, el aura de %V te quedaba grande y aun así lo intentaste. Patético.',
  'Ese robo fallido, %A, es la prueba pública de que %V juega y tú estorbas.',
  '%A, si querías la atención de %V, la conseguiste. De la peor manera posible.',
  'Cero a la izquierda, %A. Y %V ni tuvo que hacer la cuenta.',
  '%A, fallar así delante de %V no se olvida. El grupo tiene memoria.',
  '%A quiso el aura de %V y se llevó una factura. Buen negocio, campeón.',
  '%V salió intacto de un robo. Eso dice mucho de %A, y nada bueno.',
  '%A, ni siendo tú el que ataca consigues ventaja. %V te supera hasta dormido.',
  'Coño, %A, es que ni acercarte pudiste. %V ni se enteró.',
  '%A pagó por intentar quitarle algo a %V. Eso es fracasar con recibo.',
  '%A, tu robo a %V fue una clase magistral de lo que es ser inútil.',
  '%V no ganó nada hoy, pero %A lo perdió absolutamente todo.',
  '%A, el aura de %V sigue ahí brillando mientras tú cuentas monedas para la multa.',
  'Patético, %A. Ni robando, ni pagando, ni intentándolo consigues estar a la altura de %V.',
  '%A, el resultado estaba escrito: %V arriba, tú abajo y la multa en medio.',
  '%A fue a por el aura de %V y volvió con una multa y la cara de siempre. Puto desastre previsible.',
  '%V ni levantó la vista. %A ya estaba pagando. Ese es el resumen entero del intento.',
  '%A, robarle a %V requería un mínimo de habilidad. Ahí exactamente murió el plan.',
  'Menuda mierda de robo, %A. %V ni se molestó en mirarte y aun así te ganó.',
  '%A intentó, %A falló, %A pagó. %V ni se enteró de que existías. Puta lección gratis.',
  '%V duerme igual de bien. %A duerme más pobre y con la misma cara de inútil.',
  '%A, tu robo a %V tuvo el mismo efecto que tu opinión en este grupo: ninguno.',
  'Ni con ventaja, ni con sorpresa, ni con suerte, %A. %V te aplastó sin querer.',
  '%A se acercó al aura de %V y rebotó como rebota todo lo que intenta. Puta constancia.',
  '%V no defendió nada. %A lo intentó todo. Ganó %V sin mover un dedo, muerto de hambre.',
  '%A, después de esto %V debería usarte de ejemplo de lo que no hay que hacer.',
  'El aura de %V ni se inmutó. %A sí. %A se hundió solo y delante de todos.',
  '%A pagó por el privilegio de hacer el ridículo frente a %V. Un negocio de mierda.',
  '%V está intacto y %A está en bancarrota. Justo lo previsible desde el primer segundo.',
  '%A, robar exige talento. Por eso el aura de %V sigue exactamente donde estaba.',
  'Fracaso limpio, %A. Y %V limpio de polvo y paja, sin haber hecho absolutamente nada.',
  '%A quiso atajar y se estrelló. %V sigue caminando tranquilo y sin enterarse.',
  '%A, ni de ladrón das el nivel. %V te lo ha demostrado gratis y delante de todos.',
  'El aura de %V es intocable para manos tan inútiles como las tuyas, %A. Puta miseria.',
  '%A, hoy no perdiste contra %V. Perdiste contra tu propia incapacidad de siempre.',
  'Basura de ejecución, %A. %V ni tuvo que participar y aun así se llevó la victoria.',
  '%A, tu intento fallido contra %V ya circula como chiste. Bien merecido, pringado.',
  '%V lo conserva todo. %A conserva la multa, la vergüenza y las ganas de excusarse.',
  '%A, robarle a %V era tu momento y lo convertiste en tu ridículo. Puta especialidad.',
  'Menudo don nadie, %A. Ni robando consigues que %V te tome mínimamente en serio.',
  '%A, si %V hubiera parpadeado se habría perdido tu fracaso entero. Duró eso.',
  '%A intentó, falló y pagó. %V ni cambió de postura. Ese contraste lo dice todo.',
  '%A, el aura de %V no se roba con excusas. Y tú solo tienes eso en el inventario.',
  'La multa de %A financia la tranquilidad de %V. Poético y absolutamente patético.',
  '%A, nadie esperaba que le ganaras a %V. Y aun así conseguiste decepcionar. Un mérito.',
  '%V te trató como lo que eres, %A: irrelevante. Y ni siquiera lo hizo a propósito.',
  '%A quiso jugar a ladrón contra %V y terminó de contribuyente. Puta carrera fulgurante.',
  'Ni con las dos manos, %A. %V sigue con su aura completa y tú con el bolsillo vacío.',
  '%A, tu robo fallido a %V resume tu paso entero por este grupo. Nada más que añadir.',
  '%V no se defendió porque no hacía falta. Contra %A nunca ha hecho falta, cabrón.',
  'Puta mierda de ladrón, %A. %V ni te vio venir y aun así salió ganando sin esfuerzo.',
  '%A, robarle a %V requería agallas. Tú llevaste excusas y las excusas no roban nada.',
  'El grupo entero vio cómo %V te dejaba en nada, %A. Y nadie se sorprendió lo más mínimo.',
  '%A, tu aura no sube robando. Y menos si el objetivo es %V, que te queda grandísimo.',
  '%V intacto, %A en bancarrota. Fin del intento y fin de la poca credibilidad que quedaba.',
  '%A, hoy demostraste que ni el atajo te funciona. %V te lo agradece desde su sitio.',
  'Muerto de hambre, %A. Fuiste a por lo de %V porque tú no generas nada propio, nunca.',
  '%A, el único que perdió algo hoy fuiste tú. %V ni cuenta se dio del asalto.',
  'Fallar contra %V no es raro, %A. %A, fallar así de mal sí, y eso ya es cosa tuya.',
  '%A se acercó al aura de %V y rebotó. Como todo lo que intenta y con el mismo ruido.',
  '%A, no eres rival para %V. Eres trámite. Y de los que se despachan sin mirar.',
  'La multa te la mereces, %A, por hacerle perder el tiempo a %V con esta tontería.',
  '%A, tu intento de robo fue tan inútil que %V lo confundió con nada. Literalmente.',
  '%V ni se molestó. %A sí. %A se hundió solo y con una eficacia admirable.',
  '%A, el aura de %V te quedaba grande y aun así lo intentaste. Puta soberbia de saldo.',
  'Ese robo fallido, %A, es la prueba pública de que %V juega y tú solo estorbas.',
  '%A, si querías la atención de %V la conseguiste. De la peor manera posible, pringado.',
  'Cero a la izquierda, %A. Y %V ni tuvo que hacer la cuenta para saberlo.',
  '%A, fallar así delante de %V no se olvida. Y este grupo tiene la memoria muy larga.',
  '%A quiso el aura de %V y se llevó una factura. Buen negocio, campeón del fracaso.',
  '%V salió intacto de un robo. Eso dice mucho de %A y nada bueno, muerto de hambre.',
  'Coño, %A, es que ni acercarte pudiste. %V ni se enteró de que había un asalto.',
  '%A pagó por intentar quitarle algo a %V. Eso es fracasar con recibo y con testigos.',
  '%A, tu robo a %V fue una clase magistral de lo que es ser un puto inútil.',
  '%V no ganó nada hoy, pero %A lo perdió absolutamente todo. Ahí está el desequilibrio.',
  '%A, el aura de %V sigue brillando mientras tú cuentas monedas para pagar la multa.',
  'Patético, %A. Ni robando, ni pagando, ni intentándolo llegas a la altura de %V.',
  '%A, el resultado estaba escrito: %V arriba, tú abajo y la multa en medio de los dos.',
  '%A fue a por %V con un plan de mierda y volvió con una factura. Todo muy coherente.',
  '%V ni se despeinó, %A. %A, tú te dejaste ahí la poca credibilidad que arrastrabas.',
  '%A, contra %V no hace falta ni defenderse. Basta con estar y esperar a que te caigas.',
  'El intento de %A contra %V ha sido tan flojo que el bot ha dudado si contarlo.',
  '%A, robarle a %V era difícil, pero tú lo hiciste imposible. Un talento muy tuyo.',
  'La mierda de intento de %A no rozó ni el borde del aura de %V. Ni el borde, joder.',
  '%A, %V no te venció por fuerza. Te venció mientras hacía otra cosa completamente distinta.',
  '%A quiso subir robando y bajó pagando. %V sigue arriba y sin haberse enterado.',
  'Que %V ni reaccionara es lo más humillante de tu intento, %A. Y de largo.',
  '%A, robarle a %V era tu gran plan. Menudo plan de mierda y menudo estratega.',
  'La multa te la ganaste a pulso, %A. El respeto de %V ni lo rozaste con los dedos.',
  '%V no perdió nada. %A perdió aura, dinero y lo poco que le quedaba de credibilidad.',
  '%A, hasta fallando eres predecible. %V lo vio venir desde la otra punta del grupo.',
  'Un intento, un fracaso, una multa. %A contra %V: victoria por incomparecencia técnica.',
  '%V te dejó el aura delante y ni así, %A. Eres inútil de manual y con manual ilustrado.',
  '%A, tu robo a %V tiene menos efecto que tus promesas. Y tus promesas no tienen ninguno.',
  'El único perjudicado del robo eres tú, %A. %V ni se dio cuenta de que pasaba algo.',
  '%A quería el aura de %V. Se llevó la vergüenza, la factura y una anécdota para el grupo.',
  '%A, %V no es que te haya ganado. Es que tú te ganaste solo la humillación entera.',
  'Si el fracaso pagara, %A serías rico. Pregúntale a %V, que hoy ha cobrado sin jugar.',
  '%A falló contra %V y ahora es material de burla hasta nuevo aviso. Bien merecido.',
  'Ni sumando todos tus intentos, %A, le arañarías un punto de aura a %V. Ni uno.',
  'Cero a la izquierda, %A. %V es el número y tú el adorno inútil que sobra al lado.',
  '%A intentó ser un problema para %V y acabó siendo un chiste. El de siempre, además.',
  'La distancia entre %A y %V se mide en multas. Y la cuenta la va pagando siempre el mismo.',
  '%A fue de listo y volvió de pagano. %V ni se enteró de que había un plan en marcha.',
  '%V respira tranquilo. %A respira multas. Ese reparto lleva años sin cambiar, pringado.',
  '%A quiso el aura de %V por la vía rápida y acabó por la vía del ridículo más absoluto.',
  'Un don nadie, %A, intentando quitarle algo a %V. Resultado perfectamente previsible.',
  '%A falló el robo y %V se lo tomó como un cumplido. %A, ni ofenderte sabes, muerto de hambre.',
  'Coño, %A, ni robando. %V te ha convertido en anécdota sin proponérselo siquiera.',
  'Lo tuyo con %V no fue un robo, %A. Fue una donación con multa incluida y sin recibo.',
  '%A, cada intento tuyo contra %V es un recordatorio público de tu incompetencia crónica.',
  '%V ni se despeinó. %A se dejó la dignidad y el aura en el mismo intento de mierda.',
  '%A, te presentaste ante %V como ladrón y saliste como contribuyente. Puta carrera.',
  'El aura de %V no está en peligro mientras existan tipos como tú, %A. Nunca lo estuvo.',
  'A %V se la suda tu intento, %A. La multa no, esa sí que la vas a notar en el saldo.',
  'Fracasado profesional, %A. %V ni siquiera tuvo que defenderse para ganarte el asalto.',
  'Fallaste contra %V, %A, y encima pagando. Eso es pagar por hacer el ridículo en público.',
  '%A, si robar fuera un examen, %V sería el aprobado y tú la hoja en blanco firmada.',
  'Basura de intento, %A. %V ni se enteró de que existías hasta que fallaste ruidosamente.',
  '%A pagó una multa por intentar tocar el aura de %V. Caro para tan poco y tan mal hecho.',
  '%A, ni con las manos libres pudiste con %V. Ahí ya no hay excusa técnica que valga.',
  'Ese robo fallido resume tu nivel entero, %A: querer lo de %V y no llegar ni al borde.',
  '%V no te venció, %A. Te ignoró y aun así perdiste. Eso es una humillación de otro nivel.',
  'Joder, %A, ni un carterista de pacotilla lo haría peor contra %V. Y eso ya es decir.',
  '%A, el aura de %V te miró un segundo y se quedó justo donde estaba. Puta indiferencia.',
  'La multa que pagas, %A, es el precio de haber molestado a %V para absolutamente nada.',
  'Muerto de hambre, %A. Fuiste a por lo de %V porque lo tuyo no vale ni la pena robarlo.',
  'Ni pretendiéndolo eres bueno, %A. %V te dejó en evidencia sin tener que abrir la boca.',
  '%A, tu carrera de ladrón duró menos que la paciencia de %V. Y %V no tiene mucha.',
  'Todo el grupo vio cómo %A rebotó contra %V. Patético y encima con público de pago.',
  '%A, robarle a %V era tu única salida y la fallaste. Menudo callejón te has montado.',
  '%A quiso subir robando y bajó pagando. %V sigue arriba y ni ha mirado hacia abajo.',
  '%A, hasta %V se aburre de lo fácil que eres de derrotar. Y %V no se aburre con nada.',
  'Ni la multa duele tanto como saber que %V ni te tuvo en cuenta, %A. Esa es la peor parte.',
  '%A, el único aura que se movió hoy fue la tuya, hacia el suelo. %V ni pestañeó una vez.',
  'Ni robando eres capaz de destacar, %A. %V te ganó sin jugar y sin despeinarse.',
  'La mano de %A temblando y el aura de %V intacta. Puta mierda de intento y de temple.',
  '%A, robarle a %V exige mérito. Y tú de mérito vas a cero desde que llegaste aquí.',
  '%A, ya ni tu fracaso sorprende. A %V tampoco, y eso que %V se sorprende con poco.',
  '%A, ese fallo contra %V es tu currículum entero resumido en un solo movimiento de mierda.',
  '%V no necesitó suerte. %A necesitaba un milagro y ni con eso habría llegado.',
  '%V ni se despeinó, %A. %A, tú te dejaste ahí la poca dignidad que arrastrabas desde hace meses.',
  '%A, robarle a %V era difícil pero tú lo hiciste imposible. Un talento muy específico.',
  '%A quiso ser ladrón y acabó siendo el chiste de %V. Y de todo el grupo, ya de paso.',
  'Robar a %V te salió tan mal, %A, que hasta la multa te queda barata para el ridículo.',
  '%V no movió ni un dedo y aun así te humilló, %A. Ahí está la distancia real entre los dos.',
  'Menudo pringado, %A. Le fuiste a robar a %V y volviste con menos que nada en el bolsillo.',
  '%A intentó robarle el aura a %V y lo único que se llevó fue la multa. Patético de manual.',
  '%V ni se enteró del robo. %A, en cambio, se enteró de que es un inútil de campeonato.',
  'Fallaste, %A. %V sigue con su aura intacta y tú con la cartera vacía y la cara roja.',
  '%A se lanzó a por %V con la seguridad de un profesional y la puntería de nadie.',
  '%V ni tuvo que reaccionar. %A ya se había caído solo antes de llegar. Puta comedia.',
  '%A, el aura de %V lleva ahí toda la noche y ahí se queda. Tú, en cambio, más pobre.',
  'Ni acercándote, %A. %V te ha mantenido a distancia sin saber siquiera que existías.',
  '%A pagó por intentar y no consiguió ni el intento. %V ni cuenta se dio del asalto.',
  '%V salió indemne y %A salió con recibo. Ese es el resumen y no hay más que añadir.',
  '%A, contra %V hasta la suerte se pone de perfil. Y con razón, viendo cómo juegas.',
  'El intento de %A fue tan flojo que %V lo confundió con nada. Y nada era, exactamente.',
  '%A quiso el aura de %V y se llevó la factura de siempre. Puto cliente fiel del fracaso.',
  '%V ni levantó la cabeza. %A ya estaba contando monedas para pagar la multa, pringado.',
  '%A, robar exige presencia y tú no tienes ninguna. %V lo confirmó sin decir palabra.',
  'Ni con el factor sorpresa, %A. %V se defendió solo con existir y con eso bastó.',
  '%A falló contra %V y ahora el grupo tiene material para la semana. Servicio público.',
  '%V duerme tranquilo. %A duerme con la multa encima y la vergüenza de almohada.',
  '%A intentó lo más fácil del juego y aun así lo falló. %V ni se ha enterado todavía.',
  'El aura de %V ni se movió. La de %A sí, hacia abajo y con bastante velocidad.',
  '%A, ni con ventaja ni con tiempo. %V te ganó estando en otra cosa completamente distinta.',
  '%A fue a por %V y volvió con una lección que ya le habían dado tres veces antes.',
  '%V no perdió nada. %A perdió el turno, el aura y lo poco que quedaba de su fama.',
  '%A, tu robo a %V ha sido tan malo que ni sirve para aprender. Solo para reírse un rato.',
  'Ni tocaste el aura de %V, %A. Ni el borde, ni el aire de alrededor. Puta miseria de asalto.',
  '%A pagó la multa y %V ni ha mirado el marcador. Ahí está la diferencia entre los dos.',
  '%V sigue exactamente igual. %A está exactamente peor. Esa asimetría lo dice todo.',
  '%A, contra %V no hace falta ni defenderse. Basta con esperar a que te caigas solo.',
  'El asalto de %A duró menos que la paciencia de %V. Y %V no es especialmente paciente.',
  '%V no ha perdido nada y %A lo ha perdido todo. Ni el reparto de un mal chiste sale tan claro.',
  '%A, tu intento contra %V va directo al archivo. Y ese archivo pesa ya bastante, cabrón.',
  'Ni por asomo, %A. El aura de %V estaba fuera de tu alcance antes de que empezaras.',
  '%A quiso el aura de %V y se llevó el recibo. Puta transacción de mierda y sin devolución.',
  '%V no defendió nada porque no hacía falta. Contra %A nunca ha hecho falta absolutamente nada.',
  '%A intentó robar y solo consiguió pagar. %V ni ha mirado el marcador para comprobarlo.',
  'El asalto de %A duró lo que tarda %V en parpadear. Y %V ni parpadeó, para ser exactos.',
  '%A fue a por %V con todo y volvió con nada. Ni el orgullo, que ya venía justo de casa.',
  '%V sigue con su aura y %A con la multa. El reparto de siempre y sin ninguna sorpresa.',
  '%A, robarle a %V exige un mínimo. Y ese mínimo está por encima de todo lo que tienes.',
  'Ni rozando, %A. El aura de %V estaba fuera de tu alcance desde antes de que empezaras.',
  '%A pagó por hacer el ridículo delante de %V. Un negocio ruinoso y encima con testigos.',
  '%V ni se enteró del intento. %A se enteró de la multa al segundo siguiente. Puta justicia.',
  '%A quiso atajar por encima de %V y se estrelló contra lo evidente. Como siempre, cabrón.',
  'El aura de %V ni se despeinó. La de %A se fue por el desagüe con todo lo demás.',
  '%A, contra %V ni con ventaja. Y tenías ventaja. Ahí ya no hay excusa que se sostenga.',
  '%V salió limpio y %A salió con deuda. Ese contraste resume vuestra diferencia entera.',
  'Ni acercándote, %A. %V te mantuvo lejos sin siquiera saber que había un asalto en marcha.',
  '%A fue a por lo de %V y volvió con lo de nadie. Ni eso supiste traer, muerto de hambre.',
  '%V no perdió nada. %A perdió el turno, el aura y la poca credibilidad que arrastraba.',
  '%A, tu asalto a %V ha sido tan flojo que ni sirve de aviso. Solo de chiste para el grupo.',
  'El intento de %A contra %V va directo al archivo de los fracasos. Y ese archivo ya pesa.',
  '%V ni tuvo que moverse. %A hizo todo el trabajo y encima el trabajo salió en su contra.',
  '%A pagó la multa y %V ni se ha dado por enterado. Ahí está la diferencia real, pringado.',
  'Ni con sorpresa ni con suerte, %A. %V te ganó estando ocupado en otra cosa distinta.',
  '%A fue a por %V y volvió más pobre y más ridículo. Un doblete que solo tú consigues.',
];


const ROB_MAESTRO = [
  '%A no solo le robó a %V: le vació hasta los bolsillos del alma. %V se quedó mirando el hueco donde tenía su aura como quien mira su casa quemada.',
  'Golpe maestro de %A. Se llevó tanto que %V va a tener que pedir prestado para volver a existir en el marcador.',
  '%A entró, arrasó y salió silbando. A %V no le queda ni la dignidad, y esa ya la tenía hipotecada de antes.',
  'Robo de manual. %A se llevó el doble de lo que iba a buscar porque %V es tan blando que dio de más sin darse cuenta.',
  '%A ejecutó una obra maestra. %V ni gritó: se quedó mudo, como lleva estando toda su puta vida en este grupo.',
  'Saqueo total. %A se llevó más de lo previsto y %V descubrió que su aura era tan fácil de quitar como su autoestima.',
  '%A hizo el atraco perfecto. A %V le queda el rencor, que es lo único que este inútil sabe acumular.',
  'Golpe redondo de %A. %V pasó de tener algo a tener nada en un segundo, y encima delante de todo el grupo.',
  '%A se pasó de rosca y se llevó más de la cuenta. %V no se defendió porque defenderse requiere carácter, y de eso anda corto.',
  'Robo histórico. %A dejó a %V tan seco que el marcador tuvo que comprobar dos veces si seguía vivo.',
  '%A no robó, cosechó. %V llevaba tiempo acumulando aura para que alguien con huevos viniera a quitársela, y hoy tocó.',
  'Trabajo limpio y desproporcionado. %A se llevó el doble y %V ni se enteró de por dónde le vino el golpe.',
  '%A batió su propio récord con %V. Normal: robarle a %V es el nivel fácil del juego y todo el mundo lo sabe.',
  'Atraco perfecto. %A se llevó lo que quiso y %V se quedó reconstruyendo qué hizo mal en la vida para merecer esto.',
  '%A desvalijó a %V con una eficiencia que asusta. %V ya está pensando qué excusa contar mañana, spoiler: nadie va a preguntar.',
  'Golpe maestro absoluto. %A se llevó tanto que %V va a necesitar meses para volver, si es que vuelve.',
  '%A hizo el robo de su vida y encima sobre el objetivo más fácil del grupo. Poco mérito, mucho botín.',
  'Saqueo desproporcionado. %V tenía aura, ahora tiene un recuerdo y una lección que no va a aprender.',
  '%A se llevó el doble por la cara y %V ni lo intentó impedir. Consentimiento por incompetencia, lo llaman.',
  '%A ejecutó a %V financieramente. Ahora mismo %V vale menos en el marcador que el silencio que va a guardar.',
  '%V ha sido saqueado por %A y su reacción más digna ha sido callarse. Sigue así.',
  '%A se llevó lo apostado y %V se quedó con la sensación de siempre: la de sobrar.',
  'Saqueo doble de %A. %V ya no compite, %V decora la lista de perdedores.',
  '%A pilló solo una parte, pero a %V le duele como si le hubieran quitado la vida. Y algo de eso hay.',
  '%V no defiende ni lo suyo. %A no roba, %A administra lo que un inútil no sabe usar.',
  '%A arrasó a %V con casi el doble del botín. Puta mierda de noche para %V, gran noche para el resto.',
  '%A se llevó lo de %V limpiamente. Nadie ha aplaudido a %V nunca, hoy tampoco.',
  '%V apostó, %A cobró. En medio no hubo defensa, solo un hueco donde debería haber alguien.',
  'Golpe maestro: %A duplica y %V queda a cero. Cero como número y cero como persona en este grupo.',
  '%A se quedó a medias con %V porque hasta el destino se aburre de ensañarse contigo.',
  '%A vació a %V y lo dejó con la excusa preparada. Ahórratela.',
  '%V acaba de comprobar que su dinero también es de %A cuando %A quiere.',
  'Saqueo total. %A carga con el doble y %V carga con el ridículo, que pesa más.',
  '%A robó limpio a %V. Ni ruido, ni forcejeo, ni un puto gesto de dignidad.',
  '%V, con lo que %A te sacó se paga la fiesta del grupo. Al menos sirves para eso.',
  'El botín se partió en dos y aun así %A salió ganando. %V nunca sale ganando.',
  '%A desmanteló la apuesta de %V entera. Demolición controlada de un fracasado.',
  '%V dejó pasar a %A sin resistencia. %V, igual que dejas pasar todo lo demás en tu vida.',
  'Casi el doble para %A. %V queda tan vacío que ni el eco quiere quedarse.',
  '%A cogió media parte de %V y la otra mitad la dejó de propina. %V, ni tu ruina interesa entera.',
  '%V se creía intocable. %A lo tocó, lo vació y se fue. Fin de la fantasía.',
  'Robo limpio de %A. %V se queda con lo que siempre tuvo: nada y una opinión que a nadie importa.',
  'Saqueo doble a costa de %V. Joder, %A, casi da pena. Casi.',
  'Saqueo total: %A se llevó casi el doble de %V. %V, te han dejado el esqueleto, inútil.',
  '%A entró, arrasó y salió. %V se quedó mirando el hueco donde antes tenía algo.',
  '%A duplicó lo apostado a costa de %V. Eso no es robo, es limpieza de basura.',
  'Saqueo de manual: %A dejó a %V en cifras negativas y en ridículo permanente.',
  '%A se llevó casi el doble. %V, lo tuyo ya no es mala suerte, es una condición crónica.',
  'Doble botín para %A. %V se queda sin aura, sin excusas y sin argumentos para seguir hablando.',
  '%A saqueó a %V hasta el forro. No queda ni el orgullo, que ya era bastante poco.',
  'Lo de %A no fue un robo, fue una demolición. %V ya no tiene ni cimientos que enseñar.',
  '%A arrasó a %V y la banca aplaude. %V, nadie va a defenderte, don nadie.',
  'Saqueo doble de %A. %V ha pasado de ser pobre a ser un concepto abstracto de pobreza.',
  '%A le desmontó el bolsillo a %V pieza a pieza. Quirúrgico, limpio y absolutamente humillante.',
  '%V acaba de financiar el doble de la apuesta de %A. Gracias por el patrocinio, fracasado.',
  'Saqueo total de %A. A %V le quedan las deudas y esa cara de mierda que pone siempre.',
  '%A dobló el botín a costa de %V y todavía tuvo tiempo de reírse antes de irse.',
  'Casi el doble para %A. %V queda arrasado, en ruina y exactamente igual de irrelevante.',
  '%A vació a %V y le dejó el orgullo como recuerdo. Un recuerdo barato y de segunda mano.',
  'Saqueo integral de %A. %V ya no tiene fondos, ni argumentos, ni una puta cosa que aportar.',
  '%V financió el doble botín de %A y encima quiere revancha. %V, la revancha también la vas a perder.',
  'Golpe maestro de %A. %V queda reducido a lo que siempre fue: nada con nombre de usuario.',
  '%A dobló su aura gracias a %V. %V, ser tu víctima es el mejor negocio de este grupo.',
  'Saqueo completo de %A. A %V le queda el eco de sus propias excusas y nada más.',
  'Casi el doble se lleva %A. %V pasa de jugador a decorado en un solo movimiento.',
  'Golpe maestro: %A duplica y %V queda a cero. Cero como número y cero como persona.',
  'Saqueo total. %A carga con el doble y %V carga con el ridículo, que pesa bastante más.',
  '%A desmanteló la apuesta de %V entera. Demolición controlada de un fracasado, en directo.',
  'Casi el doble para %A. %V queda tan vacío que ni el eco quiere quedarse ahí dentro.',
  'Saqueo brutal: %A dobla y %V se hunde. La física de este grupo funciona exactamente así.',
  '%A arrasó a %V. Ahora %V tiene el doble de motivos para callarse y ninguno para hablar.',
  'Saqueo total de %A. %V, hoy has descubierto que ni tu aura te tenía el más mínimo respeto.',
  'Golpe maestro de %A. Lo de %V ya no es una derrota puntual, es una biografía completa.',
  '%A duplicó a costa de %V y ni le tembló la mano. Contra un inútil nunca tiembla nada.',
  'Saqueo doble a costa de %V. Joder, %A, casi da pena. Casi, porque es %V y no da ninguna.',
  '%A se llevó casi el doble y a %V le quedan las ganas de empezar la lista desde cero.',
  'Golpe maestro. %A duplica y %V se queda mirando el marcador como si fuera a cambiar solo.',
  '%A saqueó a %V entero y encima con testigos. Un espectáculo gratuito para todo el grupo.',
  'Saqueo absoluto: %A dobla y %V baja de categoría. Y de la categoría de abajo no se sube.',
  '%A vació a %V con el doble de botín. Y %V ni sabe todavía por dónde le vino el golpe.',
  'Golpe maestro de %A. %V ha pasado de tener poco a no tener absolutamente una mierda.',
  'Saqueo brutal de %A. %V se queda sin aura, sin excusas y sin sitio en la conversación.',
  '%A dobló el botín y %V dobló el ridículo. Cada uno multiplica lo que ya tenía.',
  'Golpe maestro: %A se lleva casi el doble y %V se queda mirando el hueco con cara de idiota.',
  '%A arrasó con lo de %V. Y lo de %V ya era poco, así que el destrozo es más simbólico que otra cosa.',
  'Saqueo total. %A carga con el doble y %V con la certeza de que es el más fácil del grupo.',
  '%A duplicó a costa de %V y ni se despeinó. Contra un blanco así nunca hace falta esfuerzo.',
  'Golpe maestro de %A. %V pasa de tener poco a deberle explicaciones al marcador.',
  '%A saqueó a %V hasta el fondo. Y en el fondo tampoco había gran cosa, para ser justos.',
  'Doble botín para %A. %V, hoy has aportado más al grupo perdiendo que en meses hablando.',
  'Saqueo integral: %A se lleva el doble y %V se lleva la fama de no defender ni lo suyo.',
  '%A arrasó a %V con casi el doble. Y %V ni ha tenido tiempo de preparar la excusa.',
  'Golpe maestro. %A duplica, %V se hunde y el grupo se lo pasa mejor que en semanas.',
  '%A vació a %V con el doble de botín y encima delante de todos. Un espectáculo completo.',
  'Saqueo absoluto de %A. A %V le queda el nombre en la lista y poco más que eso.',
  '%A dobló lo apostado a costa de %V. %V, ser tu víctima empieza a ser una estrategia rentable.',
  'Golpe maestro de %A. %V ya no compite, %V figura. Y figurar no da puntos, muerto de hambre.',
  '%A se llevó casi el doble de %V y ni ha considerado que fuera un logro. Ahí está lo humillante.',
  'Saqueo doble. %A sube, %V baja y la distancia entre los dos ya no se recorre en una noche.',
  '%A desmontó a %V pieza a pieza y con el doble de botín. Demolición limpia y bien documentada.',
  'Golpe maestro: %A duplica y %V descubre que su aura era prestada desde el principio.',
  'Saqueo total: %A dobla y %V queda a cero. Cero de aura y cero de todo lo demás.',
  '%A arrasó con %V hasta dejarle el nombre y poco más. Un vaciado limpio y sin resistencia.',
  'Golpe maestro de %A. %V ha pasado de tener poco a explicarle al marcador dónde está.',
  '%A duplicó a costa de %V y ni le tembló el pulso. Contra ti nunca tiembla nadie, %V.',
  'Saqueo brutal: %A se lleva casi el doble y %V se lleva la certeza de ser el más fácil.',
  '%A desmontó la apuesta de %V entera. Demolición controlada y con público de pago.',
  'Golpe maestro. %A sube el doble, %V baja de categoría y de esa no se vuelve a subir.',
  '%A vació a %V con el doble de botín. Y %V ni sabe por dónde le vino el golpe todavía.',
  'Saqueo absoluto de %A. A %V le queda el nombre en la lista y ni eso con firmeza.',
  'Golpe maestro: %A duplica y %V descubre que lo suyo era prestado desde el principio.',
  '%A arrasó a %V y el grupo se lo ha pasado mejor que en semanas. Gracias por el espectáculo.',
  'Saqueo doble. %A carga con el botín y %V con el ridículo, que pesa bastante más.',
  '%A dobló lo apostado gracias a %V. %V, ser tu víctima empieza a ser rentable, muerto de hambre.',
  'Golpe maestro de %A. %V ya no compite, %V decora la parte de abajo de la lista.',
  '%A saqueó a %V hasta el fondo. Y en el fondo tampoco había mucho, para ser honestos.',
  'Saqueo integral: %A se lleva el doble y %V la fama de no defender ni lo propio.',
  '%A duplicó y %V se quedó mirando el marcador como si fuera a corregirse solo. No lo hará.',
  'Saqueo total: %A dobla y %V queda a cero. Cero de aura y cero de todo lo demás también.',
  '%A arrasó con %V hasta dejarle el nombre y poco más. Vaciado limpio y sin resistencia.',
  'Golpe maestro de %A. %V ha pasado de tener poco a explicarle al marcador dónde se metió.',
  'Saqueo brutal: %A se lleva casi el doble y %V la certeza de ser el más fácil del grupo.',
  '%A desmontó la apuesta de %V entera. Demolición controlada y con público de pago incluido.',
  '%A vació a %V con el doble de botín. Y %V todavía no sabe por dónde le vino el golpe.',
  'Saqueo absoluto de %A. A %V le queda el nombre en la lista y ni eso con demasiada firmeza.',
];

const ROB_PARCIAL = [
  '%A entró a por todo y salió con las manos medio llenas. %V se salvó por poco, que es como se salva de todo: por poco y por casualidad.',
  'Lo pillaron a mitad del saqueo. %A se llevó una parte y %V respiró aliviado por primera vez en meses.',
  '%A robó a medias. %V conservó algo, aunque tampoco es que tuviera mucho que conservar.',
  'Robo interrumpido. %A se llevó lo que pudo mientras %V miraba sin saber qué estaba pasando, como siempre.',
  '%A cogió lo que le cupo en las manos y salió corriendo. %V se queda con las sobras de su propia aura.',
  'Medio saqueo. %A no fue lo bastante rápido y %V no fue lo bastante listo. Empate de mediocres.',
  '%A se llevó una parte y dejó el resto por pereza. Ni robar a %V merece el esfuerzo completo.',
  'Robo a medio gas. %A cumplió el expediente y %V perdió lo justo para molestarse sin llegar a aprender nada.',
  '%A entró con ambición y salió con un consuelo. %V no ganó nada, solo perdió menos de lo que tocaba.',
  'Saqueo parcial. Lo bueno para %V es que conserva algo; lo malo es que ese algo sigue sin valer nada.',
  '%A se llevó la mitad y dejó la otra mitad por lástima. Robarle a %V del todo habría sido ensañamiento.',
  'Robo incompleto. %A tuvo que salir antes de tiempo y %V sigue sin enterarse de que le entraron.',
  '%A rascó lo que pudo. %V se queda con un resto que no le sirve ni para presumir.',
  'Medio golpe. %A se lleva algo, %V pierde algo, y el grupo entero pierde el tiempo mirándolos a los dos.',
  '%A se conformó con una parte porque %V no daba para más. No es piedad, es que ahí no había nada mejor.',
  'Robo a la mitad. %A calculó mal el tiempo y %V se salvó sin hacer absolutamente nada, su especialidad.',
  '%A alcanzó a llevarse un pedazo. %V lo llamará resistencia; el marcador lo llama suerte y nada más.',
  'Saqueo con prisa. %A tuvo que dejar la mitad y aun así %V salió perdiendo. Así de bajo estaba el listón.',
  '%A hizo lo que pudo con el tiempo que tuvo. %V conserva un resto que va a proteger como si valiera algo.',
  'Robo cortado a mitad. %A se lleva su parte y %V se queda con la sensación de que podría haber sido peor. Lo será.',
  '%A solo consiguió una parte de %V y ya lo considera trabajo terminado. Tú no das para más.',
  '%V custodiaba su apuesta como quien custodia humo. %A ni tuvo que apretar.',
  '%A se llevó lo apostado y %V se llevó el título indiscutible de blanco fácil.',
  'Golpe maestro de %A. Lo de %V ya no es una derrota, es una biografía.',
  'El atraco quedó a medias, %A se lleva algo y %V se lleva miradas de lástima. %V, peor negocio el tuyo.',
  '%A limpió a %V con un solo movimiento. Contra un cero a la izquierda no hace falta plan.',
  '%V acaba de aportar el doble a la cuenta de %A. %V, tu única contribución útil en meses.',
  '%A rascó una parte de %V y aun así %V hace el ridículo. Talento natural.',
  '%A se llevó lo de %V y nadie lo va a reclamar. Nadie reclama nada por un don nadie.',
  'Saqueo brutal: %A dobla, %V se hunde. La física del grupo funciona así.',
  'Media bolsa perdida y %V ya está roto. Imagínate si %A se hubiera esforzado de verdad.',
  '%A tomó lo apostado por %V con la naturalidad de quien recoge lo que nadie quiere.',
  '%V se ha quedado sin dinero y sin coartada. %A ya está en otra cosa.',
  '%A arrasó a %V. Ahora %V tiene el doble de motivos para callarse y ninguno para hablar.',
  '%A ni se despidió después de vaciar a %V. Despedirse implica que estabas ahí.',
  '%V financió a %A sin querer y sin poder evitarlo. %V, esa es tu función en este grupo.',
  'Golpe maestro. %A se lleva casi el doble y a %V le quedan las ganas de reiniciar la vida entera.',
  '%A se llevó solo un trozo de %V y aun así basta para dejar constancia de que eres blando.',
  '%A vació la apuesta de %V mientras %V se creía listo. Ese es el chiste completo.',
  '%V pierde lo apostado ante %A y el chat sigue como si nada. %V, porque eres nada.',
  'Saqueo total de %A. %V, hoy has descubierto que ni tu dinero te tenía respeto.',
  'Medio botín para %A, ridículo entero para %V. Cada uno se lleva lo que se merece.',
  '%A limpió a %V sin resistencia, sin drama y sin interés. Lo más humillante es la indiferencia.',
  '%V apostó con la seguridad de un inútil. %A cobró con la calma de quien lo sabía.',
  '%A solo pudo arrancarle la mitad a %V. Media humillación es lo único a medias que %V se merece.',
  'Lo pillaron a medias, pero %A todavía se llevó un pedazo de %V. Los dos quedan mal, %V peor.',
  'A %V le quitaron la mitad y aún así se siente atracado del todo. Normal, %A no necesitaba más.',
  '%A solo raspó una parte de %V. Ni robándote se saca algo decente, muerto de hambre.',
  '%A dejó a medias el atraco a %V porque hasta robarte aburre a los cinco segundos.',
  'Un tirón parcial y %V ya está temblando. %A ni ha empezado, pringado.',
  'Robo a medias, humillación entera. %A se lleva un trozo de %V y todo el respeto de la sala.',
  'El atraco salió a medias porque %A se aburrió. %V no daba para más y nunca lo ha dado.',
  'Con lo poco que le sacó %A ya se ve que %V es un muerto de hambre. Pero se lo sacó igual.',
  '%A solo arañó una parte de %V y ya le sobra para presumir un mes entero.',
  'El golpe de %A quedó incompleto, pero la reputación de %V quedó destruida del todo.',
  '%A se llevó media bolsa de %V. La otra mitad no la quiso porque olía a fracaso.',
  'Robo parcial y aún así %V está peor que antes. %A ni ha calentado, ahí está la vergüenza.',
  '%A dejó a %V a medio pelar. %V, ni para robarte sale bien redondo, muerto de hambre.',
  '%A rascó lo que pudo de %V. Poco, patético, pero suyo. Y a %V le duele igual.',
  'El golpe fue parcial porque a %A le dio pereza terminar. %V no compensaba el esfuerzo.',
  'Media bolsa para %A y cero respeto para %V. El reparto de siempre y sin sorpresas.',
  '%A pilló solo una parte, pero a %V le duele como si le hubieran quitado la vida entera.',
  '%A se quedó a medias con %V porque hasta el destino se aburre de ensañarse contigo.',
  '%A cogió media parte de %V y la otra mitad la dejó de propina. %V, ni tu ruina interesa entera.',
  'El atraco quedó a medias: %A se lleva algo y %V se lleva miradas de lástima. %V, peor negocio el tuyo.',
  '%A rascó una parte de %V y aun así %V hace el ridículo. Talento natural para lo peor.',
  'Medio botín para %A, ridículo entero para %V. Cada uno se lleva exactamente lo que merece.',
  '%A pilló media apuesta de %V y se fue antes de terminar. Aburres hasta robándote, pringado.',
  '%A se llevó una parte de %V y ya con eso tiene material para reírse un mes entero.',
  '%A se llevó la mitad y a %V le duele como si fuera todo. Porque todo, en su caso, era poco.',
  'Robo a medias: %A se lleva un trozo y %V se lleva la certeza de ser un blanco fácil.',
  '%A pilló media apuesta de %V y lo dejó ahí. Terminar el trabajo no compensaba el esfuerzo.',
  '%A rascó una parte de %V y ya con eso le sobra. %V no daba para un saqueo completo.',
  'Media bolsa para %A y el ridículo entero para %V. El reparto habitual y sin sorpresas.',
  '%A se llevó un trozo de %V y se fue aburrido. %V, ni robarte entretiene, muerto de hambre.',
  'Robo parcial, humillación total. %A se lleva algo y %V se lleva las miradas de lástima.',
  '%A dejó a medias el asalto porque %V no daba más de sí. Ni de víctima cumples, cabrón.',
  'Un pedazo para %A y la reputación destrozada para %V. Cada uno se lleva lo suyo.',
  '%A cogió la mitad de %V y la otra mitad la dejó por pena. Ahí ya no hay dignidad posible.',
  '%A se llevó una parte y %V perdió el resto solo. Ni para eso hizo falta ayuda externa.',
  'El atraco quedó parcial y %V ya está roto. Imagina si %A hubiera puesto ganas de verdad.',
  '%A pilló medio botín de %V y con eso le vale para presumir hasta fin de mes.',
  '%A se llevó la mitad de %V y con eso le sobra. Tú no dabas para un saqueo completo.',
  'Robo a medias: %A coge un trozo y %V se queda con la etiqueta de blanco fácil.',
  '%A pilló media apuesta y se fue. Terminar el trabajo con %V no compensaba el esfuerzo.',
  '%A rascó una parte de %V y ya con eso tiene material para reírse hasta fin de mes.',
  'Media bolsa para %A y el ridículo entero para %V. El reparto de siempre, sin novedades.',
  '%A cogió un pedazo de %V y lo dejó a medias por aburrimiento. %V, ni robarte entretiene.',
  'Robo parcial y humillación completa. %A se lleva algo y %V se lleva las miradas.',
  '%A dejó el asalto a medio hacer porque %V no daba más. Ni de víctima cumples, cabrón.',
  'Un trozo para %A y la reputación destrozada para %V. Cada uno se lleva lo que le toca.',
  'El atraco salió parcial y %V ya está roto. Imagina si %A hubiera puesto ganas de verdad.',
  '%A pilló medio botín de %V y con eso le vale. Tú no compensabas más esfuerzo, muerto de hambre.',
  '%A se llevó la mitad y a %V le duele como si fuera todo. Porque todo, en su caso, era bien poco.',
  'Robo a medias: %A coge un trozo y %V se queda con la etiqueta de blanco fácil del grupo.',
  '%A pilló media apuesta y se fue. Terminar el trabajo con %V no compensaba ni el esfuerzo.',
  '%A rascó una parte de %V y con eso tiene material para reírse hasta bien entrado el mes.',
  'Media bolsa para %A y el ridículo entero para %V. El reparto habitual y sin novedades.',
  '%A cogió un pedazo de %V y lo dejó a medias por aburrimiento. %V, ni robarte entretiene, cabrón.',
  'Robo parcial y humillación completa. %A se lleva algo y %V se lleva todas las miradas.',
  '%A dejó el asalto a medio hacer porque %V no daba para más. Ni de víctima cumples.',
  '%A pilló medio botín de %V y con eso le vale. No compensabas más esfuerzo, muerto de hambre.',
  '%A se llevó una parte y %V perdió el resto solo. Ni para eso hizo falta ayuda de nadie.',
  'Golpe a medias de %A y aun así %V sale perdiendo. %V, ese es tu punto de partida, pringado.',
];

const ROB_DESASTRE = [
  '%A salió a robar y acabó financiando a %V. El karma no solo le paró: le pasó factura y le dio el vuelto a la víctima.',
  'Desastre absoluto. %A perdió todo lo que llevaba y encima %V se lo quedó. Doble humillación en un solo movimiento.',
  '%A la cagó tan monumentalmente que terminó haciéndole una donación a %V. Aplausos para el peor ladrón del grupo.',
  'Robo invertido. %A entró a quitar y salió dando. %V ni tuvo que moverse para ganar aura hoy.',
  '%A se estrelló de tal forma que su aura acabó en el bolsillo de %V. Ni queriendo se hace tan mal.',
  'Catástrofe. %A perdió el botín, la dignidad y la cara, y %V se llevó todo eso sin despeinarse.',
  '%A salió de cacería y volvió siendo la presa. %V acaba de cobrar por existir, que es lo único que sabe hacer.',
  'Desastre total: %A quiso robar y terminó pagando. %V está más rico y sigue sin saber por qué.',
  '%A hizo el ridículo más caro del grupo. Su aura ahora es de %V y su reputación no es de nadie.',
  'Fracaso monumental. %A entregó su propia aura como quien entrega las llaves de su casa al ladrón.',
  '%A intentó robar y terminó siendo el cajero de %V. El grupo entero tomó nota para no imitarlo jamás.',
  'Desastre de manual. %A pierde todo lo apostado y %V lo recibe sin haber hecho absolutamente nada.',
  '%A salió a robar con la confianza de un profesional y la suerte de un maldito. %V cobró la diferencia.',
  'Ni robar sabe. %A perdió su aura y se la regaló a %V, que ni sabía que estaba en peligro.',
  '%A se autodestruyó en directo. %V se queda con el botín y con la mejor anécdota del mes.',
  'Robo catastrófico. %A queda más pobre que antes de empezar y %V más rico sin mover un dedo.',
  '%A la lió tanto que el propio universo decidió compensar a %V con lo que este pringado traía encima.',
  'Desastre absoluto. Lo único que %A consiguió robar fue su propia credibilidad, y la tiró a la basura.',
  '%A salió a por %V y volvió sin nada. %V, que no hizo nada, volvió con todo. Justicia poética barata.',
  'El robo salió tan mal que %A acabó pagando por el intento. %V ni se enteró y ya está contando el dinero.',
  '%A salió a robar y volvió pagando. El aura ahora es de %V y la vergüenza es tuya para siempre.',
  '%A intentó robar y terminó de patrocinador oficial de %V. Puta mierda de intento.',
  'El robo de %A fue tan inútil que %V cobró sin levantar un dedo. Eso es ser un cero a la izquierda con iniciativa.',
  '%A apostó su aura y %V la recogió del suelo. Ni robando dejas de ser un pringado.',
  'Nadie roba tan mal como %A. El aura cambió de dueño y el dueño es %V.',
  '%A quiso quitarle algo a %V y acabó regalándole lo poco que tenía. Patético hasta para fracasar.',
  'El único mérito de %A hoy fue engordar la cuenta de %V. Enhorabuena, muerto de hambre.',
  '%A entró a robar como un don nadie y salió como donante de %V.',
  'Se la suda a todos el intento de %A. Lo único que quedó claro es que %V ahora tiene más aura que tú.',
  '%A perdió su aura y %V ni tuvo que defenderse. %A, así de irrelevante eres.',
  'Joder, %A, robaste tan mal que hasta %V se sintió incómodo aceptando tu aura.',
  '%A fue a saquear a %V y volvió sin nada. Ni la basura sale tan vacía del contenedor.',
  'El plan de %A tenía un fallo: %A. Ahora paga %V con tu aura.',
  '%A convirtió un robo en una donación. %V te lo agradece, inútil.',
  'Lo de %A no fue mala suerte. Fue la confirmación pública de que %V vale más que tú.',
  '%A tocó el aura de %V y se le quedó pegada la mano vacía. Coño, qué manera de fracasar.',
  '%V no ganó nada. %A simplemente perdió, que es distinto y mucho más patético.',
  '%A se lanzó a por %V y acabó siendo el cajero automático del grupo.',
  'Cada punto que %V suma hoy lleva la firma de %A. Firma de fracasado.',
  '%A robó tan mal que el aura huyó sola hacia %V.',
  'Después de esto, %A debería pedirle permiso a %V para respirar el mismo aire.',
  '%A hizo su jugada maestra y el resultado fue enriquecer a %V. Maestra de la mierda.',
  'Ni el más inútil habría perdido así. %A lo consiguió y %V lo celebra.',
  '%A: cero aura, cero dignidad. %V: todo lo tuyo. Fin del resumen.',
  '%A quiso ser ladrón y terminó de mecenas de %V. %A, elige mejor tus ambiciones, pringado.',
  'El aura de %A ahora vive con %V y está mucho mejor ahí.',
  '%A atacó a %V y el único herido fue su propio historial de fracasos.',
  '%A pagó por el privilegio de humillarse delante de %V.',
  'Robar era gratis y %A encontró la manera de que le costara. %V se queda con todo.',
  '%A demostró que se puede ser peor que no hacer nada. %V solo tuvo que existir.',
  '%V ni se enteró del robo. %A se enteró de que sigue siendo un don nadie.',
  '%A soltó su aura como quien tira basura y %V pasó a recogerla.',
  'El robo de %A fue una transferencia bancaria con extra de ridículo a favor de %V.',
  '%A perdió contra %V sin que %V jugara. Piénsalo un rato, inútil.',
  'Lo que %A llamó estrategia, %V lo llama ingreso extra.',
  '%A ha logrado que hasta el aura prefiera a %V. Eso es talento para el fracaso.',
  '%A salió armado y volvió desnudo. %V lleva puesta tu aura.',
  '%A vino a por lo de %V y se fue dejando lo suyo. Doble derrota, cero excusas.',
  'Ni robando consigue %A que algo salga a su favor. %V da las gracias.',
  '%A es la razón por la que %V está subiendo sin esforzarse.',
  'El intento de %A fue tan penoso que %V debería devolverle la mitad por lástima. No lo hará.',
  '%A quiso quitar y le quitaron. %V se lo llevó todo, hasta el orgullo.',
  '%A no robó aura. Repartió la suya. %V fue el afortunado.',
  'La incompetencia de %A tiene beneficiario y se llama %V.',
  '%A intentó lo único que no requería talento y aun así perdió contra %V.',
  '%A firmó su propia ruina y %V puso el sello. %A, puta mierda de día para ti.',
  '%A se acercó a %V con ambición y se alejó con nada. Ni sombra dejaste.',
  '%V ganó aura hoy y no hizo absolutamente nada. Gracias a %A, claro.',
  '%A robó al revés. Es el nivel de inútil que hace falta para que %V cobre por defenderse.',
  '%A tenía un plan y el plan tenía a %V ganando. Enhorabuena por nada.',
  'Coño, %A, hasta perder tiene técnica y tú no la tienes. %V se queda tu aura.',
  '%A dejó su aura en manos de %V como quien deja las llaves puestas.',
  '%A es oficialmente el patrocinador del ascenso de %V.',
  'Ni un ladrón de mierda pierde así. %A sí. %V agradecido.',
  '%A ha convertido su fracaso en el mejor día de %V.',
  '%A fue a por la gloria y volvió con un recibo a nombre de %V.',
  'El aura de %A cambió de bando en un segundo. %V ni pestañeó.',
  '%A hizo el ridículo y encima lo pagó. %V cobró la entrada.',
  '%A es la prueba de que se puede caer hacia abajo estando ya en el suelo. %V te mira desde arriba.',
  '%A intentó robarle a %V y solo consiguió robarse a sí mismo.',
  '%V no tuvo que ganar nada. %A se lo dio todo hecho, como el pringado que es.',
  '%A perdió aura, tiempo y respeto. %V solo ganó lo primero, el resto no lo tenías.',
  'El movimiento de %A fue tan malo que %V debería ponerle su nombre a la victoria.',
  '%A ha demostrado que su presencia solo sirve para financiar a %V.',
  '%A salió a cazar y volvió siendo la cena de %V.',
  'Joder con %A, ni robando consigue dejar de ser el chiste del grupo. %V se ríe con el aura en la mano.',
  '%A quiso subir a costa de %V y lo único que subió fue el marcador ajeno.',
  '%A perdió lo que tenía intentando tener más. %V no tuvo que hacer absolutamente nada.',
  '%A entró a robar y salió con menos que cuando entró. %V con más.',
  'El aura de %A ahora es de %V. %A, la incompetencia sigue siendo tuya, esa no se transfiere.',
  '%A jugó, %V cobró. %A, así de simple es tu vida, fracasado.',
  '%A ha hecho por %V más que por sí mismo en toda su existencia.',
  'Nadie recordará el robo de %A. Todos recordarán que %V se llevó lo tuyo.',
  '%A intentó quitarle el aura a %V y acabó ampliándosela. Nivel de inutilidad histórico.',
  '%A no perdió por mala suerte. Perdió porque es %A. %V agradece la diferencia.',
  '%A fue a por %V y volvió con las manos vacías y la cartera también.',
  '%A es el único capaz de salir perdiendo en un robo que planeó él mismo. %V se lo agradece.',
  'El aura le quedaba grande a %A. Ahora le queda perfecta a %V.',
  '%A regaló su aura envuelta para regalo. %V ni la pidió.',
  '%A quiso hacerse el listo con %V y terminó de estadística humillante.',
  '%A ha conseguido que su nombre solo aparezca al lado del de %V como nota a pie de fracaso.',
  '%A intentó robar y el único que salió con algo fue %V. Adivina quién salió con nada.',
  '%A hizo el trabajo sucio y %V se llevó el sueldo. Ni de peón sirves.',
  '%A perdió su aura defendiendo un plan que nadie le pidió. %V lo celebra en silencio.',
  '%A tocó fondo y encima pagó peaje. El peaje se lo quedó %V.',
  '%A ha logrado lo imposible: que %V gane sin mérito y tú pierdas con esfuerzo.',
  '%A salió a robar y volvió con un puesto nuevo: empleado de %V.',
  'Lo de %A no fue un robo, fue una ofrenda. %V acepta y no da las gracias.',
  '%A calculó todo mal y el error se lo quedó %V en forma de aura.',
  '%A es un don nadie con iniciativa, que es la peor combinación. %V se lleva el premio.',
  '%A intentó humillar a %V y acabó ilustrando el diccionario en la palabra patético.',
  '%A tenía una oportunidad y la usó para hacer rico a %V.',
  '%A perdió el aura y %V ni tuvo que mirar. %A, esa es tu relevancia exacta.',
  '%A convirtió su ambición en el bonus de %V. Enhorabuena, muerto de hambre.',
  '%A salió a robar y volvió a casa siendo menos que antes. %V salió sin salir.',
  '%A es la razón por la que %V hoy tiene más aura y el grupo tiene más material para reírse.',
  '%A hizo un movimiento y el tablero entero se movió hacia %V.',
  '%A se quedó sin nada y %V con todo. Ni un guion lo habría escrito tan patético.',
  '%A ha demostrado que su única función en este grupo es alimentar a %V.',
  '%A fracasó tan bien que %V debería incluirlo en sus agradecimientos.',
  '%A perdió el aura, la cara y el argumento. %V solo ganó lo primero, lo demás ya no existía.',
  '%A intentó robar y el resultado fue un traspaso voluntario a %V. Puta mierda de ladrón.',
  '%A vino a quitar y se fue habiendo dado. %V lo recuerda con cariño y desprecio.',
  'El aura de %A ya no es de %A. Es de %V. Y nadie va a echar de menos la versión anterior.',
  '%A salió a robar y volvió pagando. El aura es de %V y la vergüenza es tuya para siempre.',
  'El robo de %A fue tan inútil que %V cobró sin levantar un dedo. Enhorabuena, cero a la izquierda.',
  'Nadie roba tan mal como %A. El aura cambió de dueño y el dueño nuevo es %V.',
  '%A entró a robar como un don nadie y salió como donante oficial de %V.',
  '%A perdió su aura y %V ni tuvo que defenderse. %A, así de irrelevante eres, cabrón.',
  'El plan de %A tenía un fallo: %A. Y ahora paga %V con tu aura en el bolsillo.',
  '%A convirtió un robo en una donación. %V te lo agradece, inútil de manual.',
  '%A se lanzó a por %V y acabó siendo el cajero automático del grupo entero.',
  'Cada punto que %V suma hoy lleva la firma de %A. Firma de fracasado y con temblor.',
  '%A robó tan mal que el aura huyó sola hacia %V. Ni forzarlo sale tan redondo.',
  'Después de esto, %A debería pedirle permiso a %V hasta para escribir en el grupo.',
  'Ni el más inútil habría perdido así. %A lo consiguió y %V lo celebra en silencio.',
  'El aura de %A ahora vive con %V y está mucho mejor ahí. Se nota hasta en el marcador.',
  '%A atacó a %V y el único herido fue su propio historial, que ya iba bastante tocado.',
  '%A pagó por el privilegio de humillarse delante de %V. Un negocio ruinoso y público.',
  'Robar era gratis y %A encontró la manera de que costara. %V se queda con todo.',
  '%V ni se enteró del robo. %A se enteró de que sigue siendo un don nadie con iniciativa.',
  '%A soltó su aura como quien tira basura y %V pasó por detrás a recogerla.',
  'El robo de %A fue una transferencia con extra de ridículo a favor de %V. Todo automático.',
  '%A perdió contra %V sin que %V jugara. Piénsalo un rato, inútil, que da para pensar.',
  'Lo que %A llamó estrategia, %V lo llama ingreso extra. Y ni tuvo que negociarlo.',
  '%A ha logrado que hasta el aura prefiera a %V. Eso es talento, pero del malo.',
  '%A salió armado y volvió desnudo. %V lleva puesta tu aura y le queda mejor que a ti.',
  '%A vino a por lo de %V y se fue dejando lo suyo. Doble derrota y cero excusas válidas.',
  'Ni robando consigue %A que algo salga a su favor. %V da las gracias sin levantarse.',
  '%A es la razón por la que %V está subiendo sin esforzarse lo más mínimo.',
  '%A quiso quitar y le quitaron. %V se lo llevó todo, hasta el orgullo que ya no había.',
  '%A no robó aura. Repartió la suya. %V fue el afortunado y ni tuvo que pedirlo.',
  'La incompetencia de %A tiene beneficiario y se llama %V. Un puto patrocinio involuntario.',
  '%A firmó su propia ruina y %V puso el sello. %A, puta mierda de día para ti, cabrón.',
  '%A se acercó a %V con ambición y se alejó con nada. Ni sombra dejaste, muerto de hambre.',
  '%V ganó aura hoy sin hacer absolutamente nada. Gracias a %A, claro está.',
  '%A tenía un plan y el plan tenía a %V ganando. Enhorabuena por nada, estratega.',
  'Coño, %A, hasta perder tiene técnica y tú no la tienes. %V se queda tu aura entera.',
  '%A dejó su aura en manos de %V como quien deja las llaves puestas y se va de vacaciones.',
  '%A es oficialmente el patrocinador del ascenso de %V. Y sin recibir ni las gracias.',
  'Ni un ladrón de mierda pierde así. %A sí. %V agradecido y sin tener que mover nada.',
  '%A ha convertido su fracaso en el mejor día de %V. Un servicio público sin cobrar.',
  '%A fue a por la gloria y volvió con un recibo a nombre de %V. Puta gestión de mierda.',
  'El aura de %A cambió de bando en un segundo. %V ni pestañeó al recibirla.',
  '%A hizo el ridículo y encima lo pagó. %V cobró la entrada del espectáculo.',
  '%A es la prueba de que se puede caer estando ya en el suelo. %V te mira desde arriba.',
  '%A intentó robarle a %V y solo consiguió robarse a sí mismo. Un mérito muy específico.',
  '%V no tuvo que ganar nada. %A se lo dio todo hecho, como el pringado que siempre ha sido.',
  '%A perdió aura, tiempo y respeto. %V solo ganó lo primero, el resto ya no lo tenías.',
  '%A ha demostrado que su presencia aquí solo sirve para financiar a %V. Puta función.',
  '%A salió a cazar y volvió siendo la cena de %V. %A, ni el papel de presa te sale digno.',
  'Joder con %A, ni robando deja de ser el chiste del grupo. %V se ríe con el aura en la mano.',
  '%A quiso subir a costa de %V y lo único que subió fue el marcador ajeno. Buen trabajo.',
  '%A entró a robar y salió con menos que cuando entró. %V con más y sin despeinarse.',
  '%A jugó, %V cobró. %A, así de simple es tu vida entera, fracasado de manual.',
  '%A ha hecho por %V más que por sí mismo en toda su puta existencia. Un dato triste.',
  'Nadie recordará el robo de %A. Todos recordarán que %V se llevó lo tuyo sin pedirlo.',
  '%A no perdió por mala suerte. Perdió porque es %A. %V agradece mucho esa diferencia.',
  '%A fue a por %V y volvió con las manos vacías y la cartera también. Puta ruina doble.',
  '%A es el único capaz de salir perdiendo en un robo que planeó él mismo. %V lo agradece.',
  'El aura le quedaba grande a %A. Ahora le queda perfecta a %V, que sí sabe llevarla.',
  '%A regaló su aura envuelta para regalo. %V ni la había pedido y aun así la aceptó.',
  '%A quiso hacerse el listo con %V y terminó de estadística humillante en el historial.',
  '%A hizo el trabajo sucio y %V se llevó el sueldo. Ni de peón sirves, muerto de hambre.',
  '%A tocó fondo y encima pagó peaje. El peaje se lo quedó %V, que ni estaba mirando.',
  '%A ha logrado lo imposible: que %V gane sin mérito y que tú pierdas con esfuerzo.',
  '%A salió a robar y volvió con un puesto nuevo: empleado no remunerado de %V.',
  'Lo de %A no fue un robo, fue una ofrenda. %V acepta y ni da las gracias, con razón.',
  '%A calculó todo mal y el error se lo quedó %V en forma de aura. Puta contabilidad.',
  '%A es un don nadie con iniciativa, la peor combinación posible. %V se lleva el premio.',
  '%A tenía una oportunidad y la usó para hacer rico a %V. Enhorabuena, gestor de mierda.',
  '%A perdió el aura y %V ni tuvo que mirar. %A, esa es tu relevancia exacta en este grupo.',
  '%A convirtió su ambición en el bonus de %V. Enhorabuena, muerto de hambre con ínfulas.',
  '%A salió a robar y volvió a casa siendo menos que antes. %V salió ganando sin salir.',
  '%A hizo un movimiento y el tablero entero se movió hacia %V. Puta física del fracaso.',
  '%A ha demostrado que su única función aquí es alimentar a %V. Un puto comedero con nombre.',
  '%A fracasó tan bien que %V debería incluirlo en sus agradecimientos oficiales.',
  '%A vino a quitar y se fue habiendo dado. %V lo recuerda con cariño y con desprecio.',
  '%A ha conseguido que %V suba sin mover un dedo. Enhorabuena por el trabajo, muerto de hambre.',
  'El intento de %A ha sido tan malo que %V se ha sentido incómodo cobrando. Casi.',
  '%A quiso ser el cazador y acabó de presa. %V ni tuvo que preparar la trampa.',
  '%A perdió su aura por ambición. %V la ganó por estar quieto. Justicia poética de mierda.',
  '%A fue a por lo de %V y acabó pagando por el privilegio de intentarlo. Puta ruina.',
  '%A se lanzó, falló y se quedó a cero. %V ni se levantó de donde estaba sentado.',
  'El aura de %A ha cambiado de bando y de dueño. %V se la queda y encima le sienta bien.',
  '%A tenía todo a favor y aun así acabó financiando a %V. Ahí ya no hay suerte que valga.',
  '%A ha hecho de su fracaso el ingreso extra de %V. Un modelo de negocio verdaderamente malo.',
  '%A intentó lo único que no requería talento y aun así perdió contra %V. Impresionante.',
  '%A: cero aura, cero dignidad. %V: todo lo tuyo. Fin del resumen y fin de la discusión.',
  '%A salió a robar y volvió con una deuda. %V salió sin salir y volvió con tu aura.',
  '%A perdió por ser %A. %V ganó por no ser %A. Así de simple es la ecuación, cabrón.',
  'El robo de %A ha terminado con %V más rico y con el grupo más entretenido. Todos ganan menos tú.',
  '%A quiso demostrar algo y demostró exactamente lo contrario. %V se queda con la prueba.',
  '%A entregó su aura como quien entrega las llaves del coche a un desconocido. Y %V se fue con él.',
  '%A ha convertido un robo en una transferencia. %V acepta y ni se molesta en dar las gracias.',
  'El plan de %A era simple y aun así falló. %V ni tuvo que leer el plan para ganarlo.',
  '%A perdió su aura en un intento que nadie le pidió. %V la recibió sin haberla pedido tampoco.',
  '%A ha logrado que perder tenga premio. Para %V, claro. %A, para ti solo tiene factura.',
  '%A salió con ambición y volvió con nada. %V ni se movió del sitio y volvió con todo.',
  'El desastre de %A tiene beneficiario y se llama %V. Puta herencia en vida y sin testamento.',
  '%A intentó robar y acabó pagando el doble. %V cobró sin haber puesto una sola ficha.',
  '%A se quedó sin aura y sin argumentos. %V ni necesitó ninguno de los dos para ganar.',
  '%A ha demostrado que se puede perder haciendo el papel de ladrón. %V se lleva el mérito ajeno.',
  'El aura de %A viajó entera hacia %V. Un puto trasvase involuntario y con testigos.',
  '%A quiso ganar rápido y perdió más rápido todavía. %V ni llegó a enterarse del intento.',
  '%A es el único que consigue empeorar su situación intentando mejorarla. %V lo agradece mucho.',
  '%A ha pagado por hacer rico a %V. Y encima con testigos y con el marcador en directo.',
  '%A salió a robar y acabó pagando el turno de %V. Un patrocinio involuntario y humillante.',
  '%A perdió su aura intentando quitar la de %V. Ahora %V tiene las dos y tú ninguna.',
  'El plan de %A se giró entero y le cayó encima. %V solo tuvo que apartarse y cobrar.',
  '%A quiso quitar y acabó dando. %V lo acepta sin dar las gracias, con toda la razón.',
  '%A ha financiado a %V sin querer y sin poder evitarlo. Puta suscripción forzosa.',
  'El aura de %A ha cambiado de dueño en un segundo. %V ni tuvo que firmar nada.',
  '%A intentó el atajo y acabó en el barranco. %V recogió lo que quedaba y se fue.',
  '%A salió con todo y volvió sin nada. %V no salió y volvió con lo tuyo encima.',
  '%A ha conseguido lo imposible: perder atacando. %V se lleva el premio sin jugar.',
  'El robo de %A se dio la vuelta entero. Ahora %V es más rico y tú más ridículo.',
  '%A apostó su aura contra %V y la perdió toda. %A, ni de farol te sale bien, cabrón.',
  '%A fue a por lo ajeno y dejó lo propio. %V lo recogió como quien recoge la calderilla.',
  '%A perdió por ambición y %V ganó por quietud. %A, la lección está clara y no la vas a aprender.',
  'El intento de %A ha terminado con %V arriba y contigo en el fondo. Todo muy previsible.',
  '%A quiso hacerse el listo y acabó de ejemplo. %V se queda con el aura y con el chiste.',
  '%A ha regalado su aura sin querer. %V no la pidió y aun así se la queda encantado.',
  'El asalto de %A ha sido tan malo que %V ha salido ganando sin haber participado.',
  '%A se ha quedado sin nada y %V con el doble. Ni buscándolo sale un desastre tan redondo.',
  '%A intentó robar y se robó a sí mismo. %V solo tuvo que estar delante y esperar.',
  '%A ha perdido más de lo que iba a ganar. Y todo se lo lleva %V, que ni jugaba.',
  '%A salió a robar y volvió debiendo. %V cobró sin haber puesto una sola ficha en la mesa.',
  '%A perdió su aura intentando quitar la de %V. Ahora %V tiene las dos y tú ninguna, cabrón.',
  'El plan de %A se giró entero y le cayó encima. %V solo tuvo que apartarse y recoger.',
  '%A quiso quitar y acabó dando. %V lo acepta sin dar las gracias y con toda la razón.',
  '%A ha financiado a %V sin querer y sin poder evitarlo. Puta suscripción forzosa y cara.',
  'El aura de %A cambió de dueño en un segundo. %V ni tuvo que firmar el traspaso.',
  '%A intentó el atajo y acabó en el barranco. %V recogió lo que quedaba arriba y se fue.',
  '%A salió con todo y volvió sin nada. %V no salió y volvió con lo tuyo puesto encima.',
  '%A ha conseguido lo imposible: perder atacando. %V se lleva el premio sin haber jugado.',
  'El robo de %A se dio la vuelta entero. Ahora %V es más rico y tú considerablemente más ridículo.',
  '%A apostó su aura contra %V y la perdió toda. %A, ni de farol te sale bien nada, muerto de hambre.',
  '%A fue a por lo ajeno y dejó lo propio. %V lo recogió como quien recoge calderilla del suelo.',
  '%A quiso hacerse el listo y acabó de ejemplo. %V se queda con el aura y con el chiste entero.',
  '%A ha regalado su aura sin querer. %V no la pidió y aun así se la queda bastante contento.',
  'El asalto de %A ha sido tan malo que %V ha salido ganando sin haber participado en nada.',
  '%A intentó robar y se robó a sí mismo. %V solo tuvo que estar delante y esperar sentado.',
  '%A ha perdido más de lo que iba a ganar. Y todo se lo lleva %V, que ni estaba jugando.',
  '%A salió a robar y volvió debiendo. %V cobró sin poner una sola ficha sobre la mesa.',
  '%A perdió su aura intentando quitar la de %V. Ahora %V tiene las dos y tú absolutamente ninguna.',
  'El plan de %A se giró entero y le cayó encima. %V solo tuvo que apartarse y recoger lo caído.',
  '%A quiso quitar y acabó dando. %V lo acepta sin dar las gracias y con toda la razón del mundo.',
  '%A ha financiado a %V sin querer y sin poder evitarlo. Puta suscripción forzosa y bien cara.',
  '%A intentó el atajo y acabó en el barranco. %V recogió lo que quedaba arriba y siguió su camino.',
  '%A salió con todo y volvió sin nada. %V no salió de casa y volvió con lo tuyo puesto encima.',
  '%A ha conseguido lo imposible: perder atacando. %V se lleva el premio sin haber jugado nada.',
  '%A apostó su aura contra %V y la perdió entera. %A, ni de farol te sale bien nada, muerto de hambre.',
  '%A perdió por ambición y %V ganó por quietud. %A, la lección está clara y no la vas a aprender nunca.',
  '%A quiso hacerse el listo y acabó de ejemplo. %V se queda con el aura y con el chiste completo.',
  '%A ha regalado su aura sin querer. %V ni la pidió y aun así se la queda bastante contento.',
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

async function cmdRobo(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Los robos solo ocurren en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);
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
  const maxStake = topeRobo(auraA, auraV);
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
  anotarIntento(jid, canonicalJid(sender), canonicalJid(target));
  let success = Math.random() < chance;

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
    : chance;

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
  const monto = mult > 0 ? Math.min(bruto, auraV) : Math.min(bruto, auraA);

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
    notaDinamicas;
  return sock.sendMessage(jid, { text, mentions: [sender, target] });
}

module.exports = { cmdRobo, DESENLACES, elegirDesenlace, ajustarProbabilidad, castigoPorCifra, fraccionPedida, escudoRestante, anotarIntento, anotarRoboExitoso, anotarFama, rachaDe };
