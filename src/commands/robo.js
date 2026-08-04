const { isOwner, isMainOwner, isAdmin, getSender, getTarget, canonicalJid, sameUser } = require('../utils/wa');
const { getAura, addAura } = require('../utils/auraStore');
const { pickFresh, fmt } = require('../utils/helpers');

// Escala nueva: arranque 100, "millonario" del grupo ~10.000. Un robo mueve
// decenas, no miles.
const STAKE_DEFAULT   = 20;
const STAKE_MAX       = 150;
const STAKE_FLOOR     = 5;
const MIN_AURA        = 20;
const ROB_COOLDOWN_MS = 10 * 60 * 1000; // 10 min per attacker per group

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
  'Saqueo directo de %A a %V. Hoy %V pierde aura; mañana perderá otra cosa. No es la economía, perdedor: eres tú, que tienes un agujero por donde se te va todo.',
  '%A le quita el aura a %V con la facilidad de robarle el caramelo a un crío. La diferencia es que el crío al menos berrea; %V, pobre mierda blanda, solo parpadea como un pasmarote.',
  '%A drena el aura de %V en público. %V lo apunta como "mala racha". El grupo lo apunta como lo que es: el cajero andante de cualquiera con un poco de cara.',
  'El aura de %V ahora es de %A, y ni tiempo de reaccionar tuvo. Cuando eres tan invisible, hasta robarte resulta cómodo: nadie te mira, ni para vigilarte.',
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
  '%A la cagó y pagó. El orden natural de las cosas cuando eres tan malo en lo que haces.',
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
];


// Success chance based on role tiers and aura gap.
// Ranges ~25%–72%: enough variance that no one farms safely.
function calcChance(aO, aA, vO, vA, auraA, auraV) {
  let base = aO ? 0.58 : aA ? 0.51 : 0.44;
  if (vO && !aO) base -= 0.14;
  else if (vA && !aA && !aO) base -= 0.07;
  // Cada 50 de diferencia mueve ±2%, con tope de ±10%. El divisor va con la
  // escala nueva (antes 500, cuando el arranque era 1000): si no, la brecha
  // entre dos jugadores nunca llegaría a mover la aguja.
  const diff = auraA - auraV;
  const shift = Math.sign(diff) * Math.min(Math.abs(diff / 50), 5) * 0.02;
  return Math.min(0.72, Math.max(0.25, base + shift));
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
const FRASES_POR_DESENLACE = {
  maestro:  () => ROB_MAESTRO,
  limpio:   () => ROB_WIN,
  parcial:  () => ROB_PARCIAL,
  fallo:    () => ROB_FAIL,
  desastre: () => ROB_DESASTRE,
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
const ESCUDO_MS = 8 * 60 * 1000;    // protección de la víctima tras ser robada
const GUARDIA_MS = 30 * 60 * 1000;  // ventana en la que se recuerda a quién atacaste
const VENGANZA_MS = 30 * 60 * 1000; // ventana para devolver el golpe con plus

const robadoHasta = new Map();  // `${grupo}|${victima}` -> ts en que se le puede volver a robar
const ultimoAtaque = new Map(); // `${grupo}|${ladron}|${victima}` -> { ts, veces }
const ultimoRobado = new Map(); // `${grupo}|${victima}` -> { por, ts }

function limpiaMapa(m) {
  if (m.size >= 3000) m.delete(m.keys().next().value);
}

// Ajusta la probabilidad base con las dinámicas. Devuelve la probabilidad final
// y los motivos, para poder explicárselos al jugador.
function ajustarProbabilidad(base, { grupo, ladron, victima, stake, maxStake }) {
  let p = base;
  const motivos = [];

  // 1. Ambición: hasta -15% si apuestas el máximo posible.
  if (maxStake > 0) {
    const ambicion = Math.min(1, stake / maxStake);
    const castigo = ambicion * 0.15;
    if (castigo > 0.02) {
      p -= castigo;
      motivos.push(`apuesta alta (−${Math.round(castigo * 100)}%)`);
    }
  }

  // 3. Guardia: cada intento previo reciente sobre la MISMA víctima resta 8%,
  //    hasta un tope de -24%.
  const kAtaque = `${grupo}|${ladron}|${victima}`;
  const prev = ultimoAtaque.get(kAtaque);
  if (prev && Date.now() - prev.ts < GUARDIA_MS && prev.veces > 0) {
    const castigo = Math.min(prev.veces, 3) * 0.08;
    p -= castigo;
    motivos.push(`ya te vio venir (−${Math.round(castigo * 100)}%)`);
  }

  // 4. Venganza: +12% si le devuelves el golpe a quien te robó hace poco.
  const kRobado = `${grupo}|${ladron}`;
  const mio = ultimoRobado.get(kRobado);
  if (mio && mio.por === victima && Date.now() - mio.ts < VENGANZA_MS) {
    p += 0.12;
    motivos.push('venganza (+12%)');
  }

  return { p: Math.min(0.85, Math.max(0.10, p)), motivos };
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

// Elige el desenlace concreto dentro de la rama que ya decidió `success`.
function elegirDesenlace(exito) {
  const ramas = exito ? ['maestro', 'limpio', 'parcial'] : ['fallo', 'desastre'];
  const total = ramas.reduce((a, k) => a + DESENLACES[k].peso, 0);
  let r = Math.random() * total;
  for (const k of ramas) {
    r -= DESENLACES[k].peso;
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

  if (!target) {
    return sock.sendMessage(jid, {
      text: 'Usa: *!robo @user [aura]*',
    }, { quoted: msg });
  }
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

  // Stake: first numeric arg, clamped to what both parties can afford
  const raw = parseInt((args || []).find(a => /^\d+$/.test(a)) || STAKE_DEFAULT, 10);
  const maxStake = Math.min(STAKE_MAX, auraV, auraA);
  const stake = Math.max(maxStake >= STAKE_FLOOR ? STAKE_FLOOR : 1, Math.min(raw, maxStake));

  const participants = groupMeta?.participants || [];
  const aO = isOwner(sender, msg.key.fromMe, groupMeta);
  const aA = !aO && isAdmin(participants, sender);
  const vO = isOwner(target, false, groupMeta);
  const vA = !vO && isAdmin(participants, target);

  // Probabilidad base por roles y brecha de aura, ajustada por las dinámicas
  // (ambición, guardia y venganza). El intento se anota SIEMPRE, salga como
  // salga: insistir contra la misma víctima tiene que penalizar aunque falles.
  const base = calcChance(aO, aA, vO, vA, auraA, auraV);
  const { p: chance, motivos } = ajustarProbabilidad(base, {
    grupo: jid,
    ladron: canonicalJid(sender),
    victima: canonicalJid(target),
    stake,
    maxStake,
  });
  anotarIntento(jid, canonicalJid(sender), canonicalJid(target));
  let success = Math.random() < chance;

  // Rig a favor del owner principal:
  // · si la VÍCTIMA es el owner, el robo SIEMPRE falla (no pierde aura; el
  //   atacante igual paga la penalización normal por la vía de fallo).
  // · si el ATACANTE es el owner, el robo SIEMPRE tiene éxito.
  if (isMainOwner(target, false, groupMeta)) success = false;
  else if (isMainOwner(sender, msg.key.fromMe, groupMeta)) success = true;

  const aTag = `@${sender.split('@')[0]}`;
  const vTag = `@${target.split('@')[0]}`;

  // Cooldown was already claimed above (before the awaits) to close the
  // double-rob race; it stays set here whether the roll wins or loses.

  // El dado decide ADEMÁS cuánto se mueve, no solo si sale o no. De ahí que un
  // robo ya no sea una moneda al aire: puede salir redondo, salir a medias, o
  // salir tan mal que acabas financiando a tu víctima.
  const clave = elegirDesenlace(success);
  const { mult, titulo } = DESENLACES[clave];
  // Nunca se mueve más aura de la que la víctima tiene ni de la que el ladrón
  // puede pagar: un golpe maestro sobre alguien con poco no le deja en negativo.
  const bruto = Math.max(1, Math.round(stake * Math.abs(mult)));
  const monto = mult > 0 ? Math.min(bruto, auraV) : Math.min(bruto, auraA);

  // Lo que movió la balanza se cuenta abajo del mensaje: si no, el jugador ve
  // resultados distintos sin entender por qué y parece que el bot va al azar.
  const notaDinamicas = motivos.length ? `\n_${motivos.join(' · ')}_` : '';

  if (mult > 0) {
    anotarRoboExitoso(jid, canonicalJid(sender), canonicalJid(target));
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

module.exports = { cmdRobo, DESENLACES, elegirDesenlace, ajustarProbabilidad, escudoRestante, anotarIntento, anotarRoboExitoso };
