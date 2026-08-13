const { isOwner, isMainOwner, isAdmin, getTargetOrSelf } = require('../utils/wa');
const { pickFresh } = require('../utils/helpers');
const {
  FIEL_HIGH, FIEL_MID, FIEL_LOW,
  INFIEL_HIGH, INFIEL_MID, INFIEL_LOW,
} = require('../data/fidelityPhrases');

// Rig del owner principal: cuando el TARGET es el owner, el % se fuerza al
// RANGO que le favorece y luego la lógica de frase corre sobre ese valor.
// Es un rango y no un número fijo a propósito: un 0% (o un 100%) clavado en
// cada tirada canta que hay amaño y delata al dueño. Variando dentro de la
// franja el resultado sigue siendo siempre favorable, pero parece azar.
// La polaridad se define por comando (no basta con goodIsHigh: la "feminidad"
// es positiva pero para el owner debe salir baja, como el chiste recurrente).
const OWNER_LOW  = [3, 30];   // peyorativos: siempre bajo, tope 30 (tier low ≤30), nunca 0 pelado
const OWNER_HIGH = [88, 100]; // favorables: siempre alto (tier high ≥70), no siempre 100

// OJO: `linda`, `fea` e `iq` NO estan aqui a proposito. Al resto de rasgos se
// les fuerza al owner principal la franja que le favorece, pero esos tres se
// pidieron TOTALMENTE aleatorios, sin sesgo para nadie.
const OWNER_FORCE = {
  // Franja alta para los rasgos que favorecen al owner.
  crack: OWNER_HIGH, sexy: OWNER_HIGH,
  ganador: OWNER_HIGH, masculinidad: OWNER_HIGH,
  // Franja baja para los rasgos peyorativos (y feminidad).
  perdedor: OWNER_LOW, inutil: OWNER_LOW, rata: OWNER_LOW, cerdo: OWNER_LOW,
  simp: OWNER_LOW, friki: OWNER_LOW, gay: OWNER_LOW, maricon: OWNER_LOW, incel: OWNER_LOW,
  femboy: OWNER_LOW, feminidad: OWNER_LOW, puta: OWNER_LOW, guarra: OWNER_LOW,
  delulu: OWNER_LOW, diagnostico: OWNER_LOW,
  // Fidelidad: al owner siempre alto en fiel y bajo en infiel.
  fiel: OWNER_HIGH, infiel: OWNER_LOW,
};

// Tirada uniforme 0-100. !fiel e !infiel son totalmente aleatorios: no siguen
// las distribuciones por rol del resto de juegos, solo el amaño del owner.
const rollUniform = () => Math.floor(Math.random() * 101);

// Valor al azar dentro del rango [min, max], ambos incluidos.
function rollRange([min, max]) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Distribuciones por tier — basadas en el ROL DEL TARGET, no del sender:
//
//                    │ alto ≥70% │ medio 31-69% │ bajo ≤30%
//  ─────────────────┼───────────┼──────────────┼──────────
//  Negativo miembro │   88 %    │    8 %       │    4 %
//  Negativo admin   │   78 %    │    14 %      │    8 %
//  Negativo owner   │    6 %    │   14 %       │   80 %
//  Positivo miembro │   15 %    │    30 %      │   55 %
//  Positivo admin   │   28 %    │    35 %      │   37 %
//  Positivo owner   │   80 %    │   14 %       │    6 %
function rollPercent(goodIsHigh, targetIsAdmin, targetIsOwner) {
  const rand = Math.random();
  const hi = () => 70 + Math.floor(Math.random() * 31);
  const mid = () => 31 + Math.floor(Math.random() * 39);
  const lo = () => Math.floor(Math.random() * 31);

  // ─── La banda del owner ────────────────────────────────────────────────────
  //
  // No comparte las tres franjas de arriba. Lo que delataba el amaño no era la
  // ventaja: era la FORMA de los numeros. Salir 97, 99 o 3 una y otra vez no se
  // parece a tener suerte, se parece a estar programado, y el grupo lo noto.
  //
  // Estas dos bandas son deliberadamente sosas — nada de redondos, nada de
  // extremos — y se solapan con lo que saca cualquiera. Sigue saliendo mejor
  // parado que el resto, pero con cifras que podrian ser de cualquier otro.
  const suave     = () => 45 + Math.floor(Math.random() * 31);   // 45-75
  const suaveMalo = () => 25 + Math.floor(Math.random() * 31);   // 25-55

  // La distancia entre admin y miembro se ha estrechado a propósito: era tan
  // grande que en el grupo se notaba y acusaban al bot de tratar a los admins
  // como intocables. Entre admin y miembro la diferencia pasa a ser un matiz.
  //
  // Y el sesgo del OWNER se rebajó de 92/90 a 80, por petición suya: cantaba
  // demasiado. Con 92 le salía la franja buena en nueve de cada diez tiradas y
  // eso se nota a ojo en un grupo que usa estos comandos a diario; con 80 sigue
  // saliendo favorecido de calle pero de vez en cuando le toca un resultado
  // normal, que es lo que hace creíble al resto.
  //
  // Peyorativos, franja alta:  admin 78 -> 86, miembro 88 -> 87  (hueco 10 -> 1)
  // Positivos,   franja alta:  admin 28 -> 19, miembro 15 -> 17  (hueco 13 -> 2)
  if (!goodIsHigh) {
    // Peyorativos: aqui el grupo saca ALTO (70-100) y quedar bien es sacar bajo.
    // Al owner le sale la banda sosa la mayoria de las veces, muy bajo de vez en
    // cuando, y —esto es lo que lo hace creible— un 18 % de las veces le sale
    // ALTO de verdad, igual que a cualquiera. Sin esa parte, no salir nunca mal
    // es en si mismo el patron que canta.
    if (targetIsOwner) {
      if (rand < 0.62) return suaveMalo();
      if (rand < 0.82) return lo();
      return hi();
    }
    if (targetIsAdmin) {
      if (rand < 0.86) return hi();
      if (rand < 0.95) return mid();
      return lo();
    }
    if (rand < 0.87) return hi();
    if (rand < 0.96) return mid();
    return lo();
  } else {
    // Positivos: el grupo saca BAJO. Misma idea al reves.
    if (targetIsOwner) {
      if (rand < 0.62) return suave();
      if (rand < 0.82) return hi();
      return lo();
    }
    if (targetIsAdmin) {
      if (rand < 0.19) return hi();
      if (rand < 0.50) return mid();
      return lo();
    }
    if (rand < 0.17) return hi();
    if (rand < 0.48) return mid();
    return lo();
  }
}

const LABELS = {

  // ===== POSITIVOS =====

  incel: {
    name: 'incel',
    goodIsHigh: false,
    high: [
      'Incel de mierda que se cree analista del mercado, [nombre]. No eres analista, cabrón. Eres alguien que no participa y que lleva años mirando desde la grada, patético.',

      'Virgen de, mierda. Con la costumbre de dar lecciones, [nombre]. Empieza por hacer algo tú una sola vez y luego hablamos. Hasta entonces, cállate, pringado, miserable.',

      '[nombre], llevas la vida entera esperando que pase algo sin poner nada de tu parte. Las cosas no pasan solas, gilipollas. Y menos si no sales del cuarto, qué cringe.',

      '[nombre], incel de saldo: mucha frustración acumulada y ninguna intención de cambiar el método. Repites lo mismo y esperas otro resultado, da, asco, da asco.',

      'Eres el que culpa al mercado, a la época y a las apps, [nombre]. Todo está igual para el resto, gilipollas. La variable eres tú y siempre lo has sido, qué vergüenza.',

      '[nombre], virgen absoluto con la costumbre de dar lecciones. Empieza por hacer una sola cosa tú, cabrón, y luego hablamos de tus consejos de mierda, ridículo.',

      'Incel de mierda, [nombre]. Tu récord sexual es una paja bien hecha y ni de eso puedes presumir sin exagerar. Un, fracasado. Con vocabulario técnico, fracasado.',

      '[nombre], tu única relación documentada es contigo mismo y tampoco va especialmente bien. Ahí tienes el resumen de tu vida entera, puto fracasado, qué miseria.',

      '[nombre], llevas tanto tiempo solo que has construido una filosofía entera alrededor de ello. Puta tesis doctoral sobre por qué eres un fracasado, da grima.',

      '[nombre], eres el virgen que se cree seleccionando. No seleccionas nada, gilipollas. Nadie te ha puesto nunca en la posición de tener que elegir, qué nivel de pena.',

      'Eres el fracasado que confunde no tener suerte con no haberlo intentado, [nombre]. Y no lo has intentado nunca. Ni una puta vez en toda tu vida, basura.',

      '[nombre], eres el pringado que dice que no le interesa. Interesa y mucho, y se te nota en cada mensaje. Ni mintiendo se te da bien, fracasado.',

      'Eres el pringado que perdió una guerra en la que ni se inscribió, [nombre]. Nadie te ha derrotado, cabrón. Nadie ha llegado a jugar contra ti, da pena ajena.',

      'Eres el virgen que se cree seleccionando, [nombre]. Seleccionar exige tener opciones, cabrón, y tú no has tenido ni una en toda tu puta vida, qué vacío.',

      '[nombre], virgen de saldo que confunde no tener suerte con no haberlo intentado. Y no lo has intentado nunca, cabrón. Ni una sola puta vez, indignante.',

      'Incel de saldo, [nombre]: repartes notas sin haber sido puntuado nunca. Sal una vez a la calle y luego hablamos de estándares, qué vergüenza ajena.',

      'Eres el que puntúa a los demás sin haber sido puntuado nunca, [nombre]. Empieza por salir a la calle y luego reparte notas, da vergüenza.',

      '[nombre], eres el pringado que se cree en una guerra que solo existe en su cabeza. Nadie más está peleando eso, cabrón. Estás solo ahí, qué flojo.',

      '[nombre], tu única relación documentada es contigo mismo y ni esa va bien. Ahí tienes el resumen completo de tu vida, puto fracasado, menudo desastre.',

      'Incel de los que llaman estándares a su propia incapacidad, [nombre]. Solo culpa hacia fuera, fracasado.',

      '[nombre], incel de, mierda. Con la cabeza llena de teorías y la cama con el mismo hueco desde hace años. Puta biblioteca sin visitas, patético.',

      'Has convertido no tener experiencia en una postura ideológica. Y una postura no es un plan, gilipollas. Es una excusa con discurso, miserable.',

      'Tu experiencia se mide en cosas que casi pasaron, [nombre]. Y el casi no cuenta, cabrón. Nunca ha contado en ningún puto registro, qué cringe.',

      'Eres el que se cree fuera del sistema, [nombre]. Estás fuera porque no entraste nunca, gilipollas. Nadie te echó de ningún sitio, da, asco, da asco.',

      '[nombre], tu única relación documentada es contigo mismo y ni esa funciona bien. Ahí tienes el resumen entero, puto fracasado, qué vergüenza.',

      '[nombre], eres el que confunde no tener suerte con no haberlo intentado. Y no lo has intentado nunca, cabrón. Ni una puta vez, ridículo.',

      'Incel sin misterio: solo amargura, foros y cero cita en el historial real, [nombre]. El espejo sigue esperando, asco, fracasado.',

      'Virgen con teorías sobre lo que busca la gente. La gente busca a alguien que salga de casa, gilipollas. Empieza por ahí, qué miseria.',

      'Conviertes cada no en una teoría general sobre el mundo. No es el mundo, gilipollas. Eres tú, y llevas años sin mirarlo, da grima.',

      'Hablas de lo que otros hacen mal. Ellos al menos lo hacen, gilipollas. Tú ni eso, y encima repartes notas desde el sofá, qué nivel de pena.',

      'Virgen absoluto con la confianza intacta. Y la confianza sin prueba no vale una mierda, pringado. Es fe, no seguridad, basura.',

      'Tu problema no es la época, ni el mercado, ni la suerte. Es de iniciativa, gilipollas. Y lo sabes desde hace bastante, qué cutre.',

      '[nombre], tu experiencia es una hoja en blanco firmada por ti mismo. Y encima con la firma temblorosa, puto fracasado, da pena ajena.',

      '[nombre], eres un virgen con vocabulario técnico. Sabes todos los términos, todos los conceptos y no has aplicado uno solo en el mundo real. Puta enciclopedia inútil, qué vacío.',

      '[nombre], tu récord es una noche en la que casi. Y llevas cinco años contando ese casi como si fuera una hazaña. Da vergüenza ajena escucharte, pringado.gilipollas, indignante.',

      'Tu vida amorosa es una hoja en blanco con anotaciones al margen, [nombre]. Todas las anotaciones tuyas y ninguna de nadie más. Puta miseria, qué vergüenza ajena.',

      'Virgen de saldo con teorías de catedrático, [nombre]. Te has construido un sistema completo para explicar por qué no haces absolutamente nada. Puta obra maestra de la excusa, da vergüenza.',

      '[nombre], eres el pringado que dice que está esperando a la correcta. Llevas esperando desde siempre y la lista de espera la tienes tú solo, sin nadie apuntado, basura.',

      'Incel de manual, [nombre]: culpas al mercado, a la época y a las apps. Las apps están igual para todos, cabrón. El problema estás siendo tú desde el principio, menudo desastre.',

      '[nombre], virgen certificado con opiniones de veterano. Cero recorrido, mil certezas y una capacidad de hablar de lo que no has tocado que ya es puta leyenda, qué pena.',

      'Incel puro con la frustración acumulada de una década y la iniciativa acumulada de cero minutos, [nombre]. Toda esa rabia y ni un solo intento real, pringado, patético.',

      '[nombre], eres el que se refugia en lo teórico porque lo práctico exige exponerse. Y ahí no llegas. Cero cojones y muchísimo análisis. Combinación de mierda, miserable.',

      'Incel de manual con años de análisis y cero minutos de acción, [nombre]. Ni un intento, ni un no encajado, ni una sola cosa que contar. Un puto cero redondo, qué cringe.',

      'Virgen absoluto con la seguridad de un experto, [nombre]. Esa desconexión entre lo que crees saber y lo que has hecho es lo más, patético. De todo el asunto, da, asco, da asco.',

      'Virgen de manual, [nombre], con la teoría de un catedrático y la práctica de alguien que no ha entrado al aula. Puto experto en algo que no existe para ti, qué vergüenza.',

      '[nombre], tu problema no es el mercado ni la época. Es que no sales, cabrón. Y llevas años construyendo teorías para no tener que enfrentarte a esa frase, ridículo.',

      'Incel sin misterio: solo amargura, foros y cero cita en el historial real, [nombre]. Solo culpa hacia fuera, asco, fracasado.',

      'Incel de saldo, [nombre]: has convertido una carencia en una ideología completa. Eso es lo que la vuelve permanente y lo que la vuelve tan puta ridícula, qué miseria.',

      'Virgen absoluto que se cree exigente, [nombre]. Exigente es quien puede elegir. Tú no has llegado a esa fase y no vas a llegar por este camino de mierda, da grima.',

      '[nombre], tu vida sexual es una hipótesis y las hipótesis se comprueban saliendo, no leyendo foros. Puto investigador de campo sin haber pisado el campo, qué nivel de pena.',

      '[nombre], tu experiencia es tan escasa que redondearla hacia abajo da exactamente cero. Y hacia arriba también. Un puto vacío con opiniones muy firmes, basura.',

      '[nombre], llevas años sin una sola cita y con una opinión firmísima sobre cómo funcionan las citas. Puto experto en un terreno que no has pisado nunca, qué cutre.',

      'Virgen absoluto, [nombre]: todo el discurso, ninguna prueba y una capacidad de racionalizar el fracaso que ya raya en lo artístico. Puta obra completa, da pena ajena.',

      '[nombre], incel de esos que se saben la teoría entera y no han hecho una sola práctica. Un puto expediente en blanco con matrícula de honor imaginaria, qué vacío.',

      '[nombre], hablas de mujeres como quien habla de una ciudad a la que nunca ha ido. Mucho documental, cero experiencia y una puta soberbia insoportable, indignante.',

      'Incel puro, [nombre]. Ni pagando. Y sé exactamente lo que estás pensando: que algún día. No, campeón. Ni pagando, ni algún día, ni de puta casualidad, qué vergüenza ajena.',

      '[nombre], si dedicaras a intentarlo la mitad del tiempo que dedicas a explicarlo, otra cosa sería. Pero explicarlo es cómodo y no duele. Puto cobarde, da vergüenza.',

      'Incel de mierda, [nombre]: cada teoría nueva es una excusa nueva. Y ya llevas unas cuantas. Un archivador entero de razones para no moverte del sitio, qué flojo.',

      '[nombre], eres el que lleva años entrenando para un partido al que no piensa presentarse. Y encima criticando a los que juegan. Puto cobarde de grada, menudo desastre.',

      'Incel de saldo, [nombre]: llevas años explicando por qué el sistema falla y cero años intentando algo dentro de él. Es cómodo y es una puta cobardía, qué pena.',

      '[nombre], tu récord absoluto es haberlo pensado mucho. Pensarlo mucho no cuenta como experiencia, pringado. Cuenta como perder el tiempo con estilo, patético.',

      '[nombre], tu experiencia entera es un cero redondo y tu confianza es la de alguien con historial. Esa mezcla es lo más, patético. Del catálogo humano, miserable.',

      '[nombre], incel de, mierda. Con la teoría de un catedrático y el historial de un mueble. Todo ese estudio para acabar exactamente igual que empezaste, qué cringe.',

      'Eres el pringado que se cree en una guerra que nadie más pelea, [nombre]. Solo estás tú ahí, gritándole al techo de tu cuarto. Da una pena tremenda, da, asco, da asco.',

      '[nombre], virgen de, mierda. Con la biblioteca llena y la cama vacía. Toda esa lectura para acabar exactamente donde empezaste: solo y con opiniones, qué vergüenza.',

      'Incel de manual, [nombre], con la seguridad intacta precisamente porque nunca la has arriesgado. Eso no es confianza, pringado.es no haber jugado, patético.',

      '[nombre], tu vida sexual es una hipótesis y las hipótesis se comprueban saliendo de casa, no leyendo foros. Puto investigador sin trabajo de campo, fracasado.',

      '[nombre], incel de manual con años de análisis y cero minutos de exposición. Ni un intento, ni un no encajado. Un puto cero redondo y bien redondo, qué miseria.',

      '[nombre], tu problema es que has hecho de una carencia una postura. Y una postura no es un plan, cabrón. Es una manera cómoda de no moverse nunca, da grima.',

      '[nombre], tu récord es una lista de nombres que no saben que existes. Eso no es una lista, cabrón, es un ejercicio de imaginación bastante triste, qué nivel de pena.',

      'Incel de mierda que confunde estar frustrado con tener razón, [nombre]. Son dos cosas distintas y llevas años sin distinguirlas. Ni una sola vez, basura.',

      'Tu récord absoluto es haberlo pensado mucho, [nombre]. Enhorabuena, campeón de las intenciones. En el mundo real eso vale exactamente una mierda.',

      '[nombre], llevas años convencido de que sabes cómo funciona esto. No lo sabes, cabrón. Lo has leído, que es exactamente lo contrario de saberlo, da pena ajena.',

      'Eres el pringado que se cree fuera del sistema, [nombre]. Estás fuera, sí, pero no por elección. Te dejaron fuera y ni te enteraste del momento, qué vacío.',

      'Incel puro, [nombre]: llevas años describiendo el problema con precisión de cirujano y sin tocar la solución ni con un puto palo. Cobardía pura, indignante.',

      '[nombre], incel puro: cero práctica, mil teorías y un resentimiento que crece solo cada mes que pasa. Un cóctel de mierda que te has servido tú, qué vergüenza ajena.',

      '[nombre], virgen certificado con más certezas que la gente que sí lo ha vivido. Esa desproporción te delata cada vez que abres la boca, da vergüenza.',

      '[nombre], lo más cerca que has estado de un, coño. Fue el día que saliste del de tu madre. Y de eso hace ya bastante, sin repetición a la vista, qué flojo.',

      'Incel de, mierda. Con el mapa entero memorizado y sin haber salido del punto de partida, [nombre]. Una guía turística sin un solo viaje sellado, menudo desastre.',

      'Eres el que se ha montado una tesis para no salir de casa, [nombre]. Puta obra académica sobre la nada más absoluta y sin tribunal que la lea, qué pena.',

      'Incel de los que el foro de odio te quedaría corto y. El ranking te queda grande, [nombre], patético.',

      'Virgen de los que dan lecciones de mercado sin haber entrado al puto juego, [nombre]. Cero autoexamen de verdad, miserable.',

      'Incel de manual: repartes culpa y no te has mirado nunca de verdad, [nombre]. Se te ve el fail a la primera, qué cringe.',

      'Se te nota el rastro de incel hasta en los mensajes que pretenden ser neutrales, [nombre], ridículo.',

      'Incel como un anuncio repetido que nadie pidió. Cero autoexamen de verdad, gilipollas, joder, y el grupo no se traga el cuento, qué vergüenza.',

      'Has convertido el resentimiento en identidad y no hay terapia que la limpie aquí, [nombre]. Patético, ridículo.',

      'Incel en crudo: ni el maquillaje del ranking te cubre, asco. El espejo sigue esperando, asco, fracasado.',

      'El listón de lo social lo miras desde el sótano y culpas al resto, joder, [nombre]. anestesia. Cero autoexamen de verdad, basura.',

      'Incel sin una carta nueva: siempre la misma mano sucia. Se te ve el fail a la primera, ridículo, ridículo.',

      'Incel de los que llaman estándares a su propia incapacidad, [nombre]. El espejo sigue esperando, fracasado.',

      'Incel de historial público: no hace falta escarbar, está en la superficie, [nombre]. Cero autoexamen de verdad, basura.',

      'Tienes más episodios de culpa ajena que intentos de subir el propio nivel, [nombre]. Se te ve el fail a la primera, qué cutre.',

      'Incel cutre: ni el odio tiene gracia ni la amargura tiene misterio, [nombre]. El espejo sigue esperando, da pena ajena.',

      'Has hecho del bajo listón social tu residencia. y no hay mudanza, [nombre]. Cero autoexamen de verdad, qué vacío.',

      'Incel de las que el mute ajeno lee como rechazo y es solo desinterés, [nombre]. Solo culpa hacia fuera, indignante.',

      '[nombre], perdiste una guerra en la que ni te inscribiste. El espejo sigue esperando, patético, qué vergüenza ajena.',

      'Incel constante: la única racha es la de no aceptar el espejo, [nombre]. el grupo de testigo. Cero autoexamen de verdad, asco, da vergüenza.',

      'Se te nota la prisa por culpar y cero plan de mirarte a ti, [nombre]. maquillaje posible. Solo culpa hacia fuera, basura.',

      'Incel de cartel de sótano: se ve el letrero y nadie baja a firmar, [nombre]. El espejo sigue esperando, ridículo.',

      'No hay misterio interesante: hay previsible y amargado, el combo del high, [nombre]. Cero autoexamen de verdad, fracasado.',

      'Tienes el historial de un foro abandonado: posts de odio, cero vida, [nombre]. Se te ve el fail a la primera, patético.',

      'Incel de inercia: el grupo te soporta por costumbre, no por interés, [nombre]. El espejo sigue esperando, miserable.',

      'El recato social te queda lejos y la distancia es rechazo, no mística, [nombre]. Cero autoexamen de verdad, qué cringe.',

      'Incel de ranking: bajas la media del nivel con monólogos de culpa ajena, [nombre]. Solo culpa hacia fuera, da, asco, da asco.',

      'Has convertido el resentimiento en carnet. y no hay renovación limpia, [nombre]. El espejo sigue esperando, qué vergüenza.',

      'Incel de estribillo que mancha más con cada bis de la misma queja, [nombre]. Cero autoexamen de verdad, patético.',

      'Se te nota el hábito de empujar cada tema hacia tu mismo sótano, [nombre]. Se te ve el fail a la primera, asco, fracasado.',

      'La compostura no te reconoce y tú no has buscado el espejo en serio, [nombre]. El espejo sigue esperando, basura.',

      'Incel de fondo permanente: el high no es un mal día, es el nivel, [nombre]. Cero autoexamen de verdad, ridículo.',

      'No es profundidad: es amargura con teclado y el high te la cobra, [nombre]. Solo culpa hacia fuera, fracasado.',

      'Tienes más grasa de resentimiento que un wiki sin editores decentes, [nombre]. frame. El espejo sigue esperando, basura.',

      'Incel de ceja ajena levantada y respeto social en el sótano, [nombre]. Cero autoexamen de verdad, qué cutre.',

      '[nombre], culpas a las apps, a la época y a todo menos a tu cara y tu actitud. Solo culpa hacia fuera, da pena ajena.',

      'Has convertido el incel en identidad y no hay detergente a la vista, [nombre]. chat ya lo sabía, qué vacío.',

      'Incel cutre y sin complejo útil: el complejo pediría espejo y no lo hay, [nombre]. Cero autoexamen de verdad, indignante.',

      'Se te oye el masticar del listón bajo hasta en los intentos de normal, [nombre]. Se te ve el fail a la primera, patético.',

      'La dignidad social no te coge el teléfono: el buzón está lleno de silences, [nombre]. El espejo sigue esperando, asco, da vergüenza.',

      'Incel de letrero de sótano: se lee y no invita a bajar, [nombre]. se te nota a la legua. Cero autoexamen de verdad, basura.',

      'No hay misterio de amargura con estilo: hay lo previsible y el high lo nombra, [nombre]. Solo culpa hacia fuera, ridículo.',

      'Tienes el historial de un servidor vacío: roles de odio, cero gente, [nombre]. El espejo sigue esperando, fracasado.',

      'Incel de malinterpretar el silencio ajeno como prueba de conspiración, [nombre]. Cero autoexamen de verdad, patético.',

      'El grupo paga tu monólogo en cuotas diarias de scroll del hilo, [nombre]. el grupo de testigo, miserable.',

      'Has dejado el chat como foro a medias: hilos muertos con tu firma, [nombre]. El espejo sigue esperando, qué cringe.',

      'Incel de estribillo sin punto final limpio ni redención posible, [nombre]. Cero autoexamen de verdad, da, asco, da asco.',

      'Se te nota el peso de arrastrar el mismo sótano por cada conversación, [nombre]. Se te ve el fail a la primera, qué vergüenza.',

      'La compostura cruza de acera cuando te ve en el high de incel, [nombre]. El espejo sigue esperando, patético.',

      'Incel de feria de odio: ruido interno, cero ganas de volver del resto, [nombre]. Cero autoexamen de verdad, asco, fracasado.',

      'Se te ve venir la queja en la primera palabra del mensaje, [nombre]. Solo culpa hacia fuera, basura, qué miseria.',

      'La dignidad del nivel no para: tú eres el tráfico del arcén social, [nombre]. El espejo sigue esperando, ridículo.',

      'Incel de superficie suficiente: no hace falta abrir el wiki, se huele el cerrado, [nombre]. Patético, qué nivel de pena.',

      'No hay barniz de genio incomprendido: hay amargura y el high lo cobra, [nombre]. Se te ve el fail a la primera, basura.',

      'Tienes el tono de quien acumula fichas de odio y nunca invita a jugar limpio, [nombre]. El espejo sigue esperando, qué cutre.',

      'Incel de las que alardean del sótano porque el exterior las deja sin personaje, [nombre]. Cero autoexamen de verdad, da pena ajena.',

      'Incel de repertorio corto: siempre el mismo lamento y cero plan de mejora, [nombre]. Solo culpa hacia fuera, qué vacío.',

      'Has firmado el incel con polvo en cada mensaje como única firma, [nombre]. El espejo sigue esperando, indignante.',

      'Incel visible desde lejos: el rastro de desconexión se ve, la parada no compensa, [nombre]. De frame, patético.',

      'Se te nota que te encerraste en el hilo hace tiempo y perdiste la llave, [nombre]. Solo culpa hacia fuera, asco, da vergüenza.',

      'La clase social te suena a ataque y respondes con más del mismo mazo, [nombre]. anestesia. El espejo sigue esperando, basura.',

      'Incel de racha perfecta: lo único que no fallas es no enganchar fuera del odio, [nombre]. Cero autoexamen de verdad, ridículo.',

      'No hay eco de conexión: hay eco de sótano. Y el chat lo amplifica, [nombre]. Se te ve el fail a la primera, fracasado.',

      'Tienes el aura del post olvidado: presente en el archivo, frío en el ranking, [nombre]. El espejo sigue esperando, patético.',

      'El listón social lo usas de estantería de figuras y el suelo es tu almacén, [nombre]. se te nota a la legua, miserable.',

      'Has hecho ranking de desconexión y el oro es tuyo sin rival, [nombre]. El espejo sigue esperando, qué cringe.',

      'Incel de feria ambulante de un solo puesto: el mismo show, cero nostalgia ajena, [nombre]. Fracasado, da, asco, da asco.',

      'Se te ve venir el monólogo en el primer punto del mensaje, [nombre]. Solo culpa hacia fuera, patético.',

      'La dignidad social hace autostop y el tráfico del arcén eres tú, [nombre]. El espejo sigue esperando, asco, ridículo.',

      'Incel de superficie: basta la vista, no hace falta el sótano del historial, [nombre]. Cero autoexamen de verdad, basura.',

      'No hay barniz de antihéroe nerd: hay amargura y el high la nombra, [nombre]. Se te ve el fail a la primera, ridículo.',

      'Tienes el tono de noches de chat sin una frase que abra puerta al resto, [nombre]. El espejo sigue esperando, fracasado.',

      'Incel de malinterpretar el mute como respeto al lore del odio, [nombre]. Cero autoexamen de verdad, qué nivel de pena.',

      'El precio de tu repertorio cerrado lo paga el hilo en scroll y silencio, [nombre]. Solo culpa hacia fuera, basura.',

      'Has dejado el hilo como wiki sin editores: páginas de queja, cero vida, [nombre]. El espejo sigue esperando, qué cutre.',

      'Incel de estribillo que empeora con cada bis del mismo mazo, [nombre]. Cero autoexamen de verdad, da pena ajena.',

      'Se te nota el hábito de empujar cada hilo hacia el rincón sin ventana, [nombre]. Se te ve el fail a la primera, qué vacío.',

      'La compostura del nivel no te reconoce en el elenco social, [nombre]. El espejo sigue esperando, patético.',

      'Incel de fondo: bajas la media del high con la constancia de quien no sale, [nombre]. Cero autoexamen de verdad, asco, qué vergüenza ajena.',

      'No es estilo: es aislamiento previsible y el high te lo nombra entero, [nombre]. Solo culpa hacia fuera, basura.',

      'Tienes más episodios de desconexión que intentos de subir el listón social, [nombre]. El espejo sigue esperando, ridículo.',

      'Incel de respeto ajeno en números rojos del ranking de aporte, [nombre]. Cero autoexamen de verdad, fracasado.',

      '[nombre], incel de manual: repartes culpa y no te has mirado nunca de verdad. Solo culpa hacia fuera, qué pena.',

      'Has convertido el incel en carnet. y no hay renovación de salida a la vista, [nombre]. El espejo sigue esperando, patético.',

      '[nombre], culpas a las apps, a la época y a todo menos a tu cara y tu actitud. Cero autoexamen de verdad, miserable.',

      'Incel hasta para el modo oscuro: ni la sombra tapa el lloriqueo, [nombre]. El espejo sigue esperando, qué cringe.',

      'Se te cae el disimulo solo con abrir el hilo y el high lo documenta, [nombre]. filtro ni consuelo, patético.',

      'Incel de las que el algoritmo de empatía se rinde y pide la baja, [nombre]. cerrado. Solo culpa hacia fuera, asco, qué vergüenza.',

      'No hay terapia aquí: hay amargura de base y el comando la cobra, [nombre]. se te nota a la legua, basura.',

      'Tu mensaje es un aviso de lo que no hay que alimentar en el grupo, [nombre]. Cero autoexamen de verdad, ridículo.',

      'Incel con la disciplina de quien nunca ha aceptado el espejo, [nombre]. Solo culpa hacia fuera, fracasado.',

      '[nombre], incel de manual: repartes culpa y no te has mirado nunca de verdad. El espejo sigue esperando, da grima.',

      'Tienes una presencia que ensucia el hilo en un solo monólogo, [nombre]. Cero autoexamen de verdad, qué nivel de pena.',

      'Incel de repertorio: siempre la misma queja y cero plan B de dignidad, [nombre]. Se te ve el fail a la primera, basura.',

      'Se te nota el desastre hasta en la miniatura del estado, [nombre]. El espejo sigue esperando, qué cutre.',

      'Incel sin complejo útil: el complejo al menos indicaría que viste el problema, [nombre], da pena ajena.',

      'El ranking de cordura te deja donde mereces: en el sótano del high, [nombre]. Solo culpa hacia fuera, patético.',

      'Has hecho del incel tu marca y la marca se pega en los dedos ajenos, [nombre]. El espejo sigue esperando, asco, indignante.',

      'Incel de las que confunden profundidad con abandono total del estándar social, [nombre]. Cero autoexamen de verdad, basura.',

      'No es estilo amargo con gracia: eres incel y el high no discute la evidencia, [nombre]. Se te ve el fail a la primera, ridículo.',

      'Virgen de saldo con la costumbre de puntuar a los demás, [nombre]. Empieza por puntuarte tú, cabrón, que el resultado te va a doler bastante, qué flojo.',

      'Eres un virgen con vocabulario de foro, [nombre]. Todos los términos, todos los conceptos y cero aplicación. Puta enciclopedia sin lectores, menudo desastre.',

      'Incel de saldo, [nombre], con la rabia de quien perdió una guerra en la que ni se inscribió. Nadie te ha derrotado, cabrón. Nadie ha jugado, qué pena.',

      '[nombre], culpas a las apps, a la época y a todo menos a tu cara y tu actitud. El espejo sigue esperando, patético.',

      '[nombre], tu problema no es la época. Es que la época pasa por la calle y tú llevas años sin bajar. Ahí está la explicación entera, miserable.',

      'Tu vida en esto se resume en cosas que casi pasaron, [nombre]. Todas casi. Ninguna del todo. Y el casi no aparece en ningún puto registro, qué cringe.',

      'Tu confianza está intacta porque nunca la has arriesgado, [nombre]. Eso no es seguridad, pringado.es no haber jugado ni una sola partida, patético.',

      'Eres el que dice que las apps están mal, [nombre]. Las apps están igual para todos, cabrón. Lo que está mal es lo que aparece en tu foto, qué vergüenza.',

      '[nombre], tu única experiencia es lo que has leído. Y lo que has leído no te ha servido para una puta cosa en todos estos años. Piénsalo, ridículo.',

      '[nombre], incel de manual: te explican por qué y te quedas con el qué. Cada vez. Puta capacidad de entender justo la parte que no sirve, fracasado.',

      'Tu récord personal es una lista de nombres que no saben que existes, [nombre]. Eso no es una lista, es un puto ejercicio de imaginación, qué miseria.',

      'Tu vida sexual es una nota a pie de página de un libro que nadie ha escrito, [nombre]. Ni existe el libro ni existe la nota. Puta nada, da grima.',

      '[nombre], eres el que dice que no le interesa. Interesa, y mucho, y se te nota en cada mensaje. Ni mintiendo se te da bien, fracasado.',

      'Tu problema es que explicarlo no duele y intentarlo sí, [nombre]. Por eso llevas años explicando. Puta cobardía con formato de ensayo, basura.',

      'Llevas años sin salir y con una explicación elaboradísima de por qué salir no sirve. Sirve, cabrón. A todos menos a ti, que no sales, qué cutre.',

      '[nombre], incel de manual con la cara de quien lleva años esperando su turno en una cola donde no hay nadie más. Ni cola hay, da pena ajena.',

      '[nombre], tu vida amorosa es una hoja en blanco con anotaciones al margen. Y todas las anotaciones las has escrito tú solo, pringado.patético, qué vacío.',

      'Virgen absoluto con la costumbre de dar consejos a quien tiene más recorrido. Cállate, cabrón, que se te ve el expediente en blanco, indignante.',

      'Incel de manual: llevas años explicando el terreno sin haberlo pisado. Puta guía turística escrita por alguien que no salió de casa, qué vergüenza ajena.',

      'Dedicas al análisis el tiempo que otros dedican a intentarlo. Y se nota en el marcador, pringado. Ellos con historial, tú con notas, ridículo.',

      'Incel de saldo, [nombre]: llevas años echándole la culpa al mundo por algo que empieza y termina dentro de tu cuarto. Puta cobardía, qué flojo.',

      'Incel de mierda que se cree analista del mercado, [nombre]. No eres analista, cabrón. Eres alguien que no participa y que lleva años mirando desde la grada ridículo, menudo desastre.',

      'Incel de mierda que se cree analista del mercado, [nombre]. No eres analista, cabrón. Eres alguien que no participa y que lleva años mirando desde la grada fracasado, qué pena.',

    ],
    mid: [
      'Medio virgen. Follaste una vez, hace años, y sigues contándolo como si hubiera sido ayer. Da pena y basta el dato del ranking.',

      'Tienes historial pero es tan corto que cabe en un mensaje. Y encima la mitad fue por lástima ajena y. El ranking cierra el caso.',

      'A ratos ligas y a ratos te pasas cuatro meses hablando solo. La media te sale exactamente en patético.',

      'Ni virgen ni activo. Estás en esa tierra de nadie donde follaste lo justo para creerte que sabes algo.',

      'Tu vida sexual existe pero en modo ahorro de energía. Un pico cada dos años y a hibernar otra vez. Sin filtro de autoayuda.',

      'Medio incel. Todavía sales de casa, pero cada vez cuesta más y cada vez vuelves antes y más solo. Sin filtro de autoayuda.',

      'Has follado, sí. Menos veces de las que has contado la historia, eso también es verdad. Y el grupo ya pasó de página.',

      'Tienes lo justo para no ser virgen técnicamente. Emocionalmente sigues exactamente igual de solo sin segunda lectura que lo arregle.',

      'Ni celibato ni vida. Ese punto medio donde nadie te desea pero tampoco nadie te compadece sin prórroga ni VAR.',

      'Follas cuando el universo se alinea, o sea cada dos o tres años. El resto del tiempo, foro y mano sin prórroga ni VAR.',

      'Medio camino a la amargura total. Todavía te queda un poco de esperanza y eso es lo único que te salva.',

      'Tu historial da para una conversación de cinco minutos. Y la alargas hasta veinte porque no tienes más.',

      'Ni arriba ni abajo. Lo suficiente para no ser el chiste del grupo, insuficiente para que alguien te envidie.',

      'A veces ligas por accidente y no sabes replicarlo. Eso significa que no fue mérito, fue casualidad y el sistema marca el punto final.',

      'Medio virgen, medio amargado. La proporción va cambiando cada año y no precisamente a tu favor sin letra pequeña que lo salve.',

      'Tienes experiencia de saldo: poca, vieja y de dudosa calidad. Pero técnicamente cuenta, ahí te la dejo.',

      'Estás en el punto exacto donde se decide si esto remonta o se convierte en tu identidad. Y no remonta.',

      'Follas lo justo para no poder quejarte y lo poco para no poder presumir. El limbo más incómodo y el archivo queda cerrado.',

      'Ni incel ni ganador. Vas tirando con lo mínimo y llamándolo elección personal, que es la mejor excusa.',

      'Tu media anual es tan baja que estadísticamente cuentas como celibato con excepciones puntuales en el segundo más incómodo del chat.',

      'Ni virgen ni experto. Tienes algo de recorrido y bastante menos del que dejas entender con el número hablando solo.',

      'Has tenido tus momentos, espaciados y sin continuidad. Suficiente para no ser el chiste y el sistema cierra sin discusión.',

      'Ni incel ni nada del otro mundo. Un intermedio bastante honesto y bastante común y el sistema no regala puntos.',

      'Tienes experiencia suficiente para no opinar desde la teoría. Pero no mucha más en el único idioma que entiende el contador.',

      'Ni sequía ni abundancia. Estás en la franja donde ni preocupa ni impresiona a nadie y el contador no discute.',

      'Has tenido lo justo para saber de qué va. De ahí a tener criterio hay un trecho en el único idioma que entiende el contador.',

      'Ni virgen ni con historial. Un punto medio que no da para presumir ni para preocuparse delante de quien no quería verlo.',

      'Tu recorrido es real pero corto. Y por eso mejor no dar tantas lecciones y el sistema no regala puntos.',

      'Ni incel ni referencia. Estás justo donde está la mayoría y ni te has dado cuenta y. El ranking cierra el caso.',

      'Tienes algo de experiencia y bastante margen de mejora. Ambas cosas son ciertas en alta resolución de group chat.',

      'Ni sequía histórica ni racha. Un intermedio que va y viene según la temporada con el dígito firmando solo.',

      'Has pasado por lo básico sin llegar a nada que merezca contarse dos veces. Delante del marcador en vivo.',

      'Ni virgen ni veterano. En el medio, que en esto es exactamente donde está casi todo el mundo delante de quien no quería verlo.',

      'Tu historial existe sin ser destacable. Suficiente para hablar, insuficiente para presumir con el resultado ya consumado.',

      'Ni incel ni activo. Estás en esa zona tibia donde a nadie le interesa el dato delante de quien aún leía el hilo.',

      'Tienes lo justo para no ser el tema de conversación. Y nada para serlo por lo contrario. Sin derecho a matiz útil.',

      'Ni escaso ni abundante. Un promedio que no llama la atención en ninguna dirección con la cara del resultado a la vista.',

      'Has tenido rachas y sequías con la misma frecuencia. La media queda exactamente aquí con la firma legible del comando.',

      'Ni virgen ni con recorrido. En el punto medio, que aquí es un sitio bastante poblado con el cargo en firme.',

      'Tienes experiencia suficiente para no fantasear e insuficiente para dar consejos sin letra pequeña que lo salve, da grima.',

      'Ni incel ni de los que se comentan. Un intermedio absolutamente anónimo y el sistema cierra sin discusión, qué nivel de pena.',

      'Tu recorrido está bien sin ser nada. Y ese sin ser nada es lo que te deja en el medio y el hilo no pide amplificación, basura.',

      'Ni sequía ni racha. Estás donde la mayoría, que no es ni un halago ni un insulto sin bis ni matiz de consuelo, qué cutre.',

      'Has tenido tus cosas sin que ninguna llegara a nada. Ese resumen te define aquí sin suavizar el golpe del número, da pena ajena.',

      'Ni virgen ni experto. Un promedio honesto que ni se comenta ni se cuestiona y el sistema no regala puntos, qué vacío.',

      'Tienes lo suficiente para no estar frustrado y no lo bastante para estar tranquilo sin modo avión ni silencio cómplice, indignante.',

      'Ni incel ni nada. Un intermedio en el que llevas bastante tiempo sin moverte con el fail todavía caliente, qué vergüenza ajena.',

      'Tu historial es corto pero real. Y eso ya te separa de bastante gente de este grupo con testigos obligados en el hilo, da vergüenza.',

      'Ni abundante ni escaso. La franja media, que es donde va casi todo el mundo. Delante del público que no pidió entrada, qué flojo.',

      'Has hecho lo normal para tu edad, sin más y sin menos. Eso es exactamente esto con el peaje cobrado al natural, menudo desastre.',

    ],
    low: [
      'Cero. Follas, tienes vida y no dedicas ni un segundo a analizar por qué a otros no les va igual. Delante del público que no pidió entrada.',

      'Nada de incel. Ligas normal, pierdes normal, y en ningún caso montas un drama con ello sin anestesia de verdad esta vez.',

      'Cero absoluto. No mides mandíbulas, no lees foros y no tienes teoría sobre por qué el mundo te debe sexo.',

      'Ni un punto. Tu vida sexual es asunto tuyo y no la usas como argumento contra nadie. Increíblemente sano.',

      'Cero. Te va bien o te va mal y en ninguno de los dos casos culpas a las mujeres de existir y no hace falta ampliar el parte.',

      'Nada que reportar. Tienes historial, tienes presente y no tienes ni una gota de rencor acumulado y no hay DLC que lo parchee.',

      'Cero de cero. Cuando alguien te dice que no, pasas página. Eso es todo el secreto y casi nadie lo tiene.',

      'Ni rastro. La gente se acerca a ti porque no hueles a resentimiento a tres metros. Simple y efectivo.',

      'Cero puntos. No necesitas presumir porque no tienes nada que demostrarle a nadie del grupo con el parte firmado debajo.',

      'Nada. Tu vida amorosa funciona y por eso no hablas de ella cada cinco minutos como los de arriba con el peaje cobrado al natural.',

      'Cero. Sabes que si algo no sale es cosa tuya, y por eso te sale más a menudo de lo que reconoces en el único idioma que entiende el contador.',

      'Ni uno. Follas o no follas según la temporada y jamás se te ocurrió culpar a nadie de la mala en el momento que más dolía soltarlo.',

      'Cero absoluto. Tu autoestima no depende de un número, que es justo lo contrario del que sale arriba.',

      'Nada de nada. Ni amargura, ni copes, ni vocabulario de foro. Estás limpio y encima se te nota en el recuento que no perdona.',

      'Cero. Eres la prueba viva de que no follar una temporada no convierte a nadie en un puto resentido y el sistema cierra sin discusión.',

      'Cero. Tienes recorrido de sobra y ninguna necesidad de mencionarlo. Ahí está la clase y no hay DLC que lo parchee.',

      'Nada de incel. Sales, hablas con gente y las cosas pasan sin que tengas que forzarlas en el único marcador que importa aquí.',

      'Cero por ciento. No teorizas porque no te hace falta: lo tuyo es práctica acumulada sin descuento por empatía.',

      'Limpio. Tienes experiencia real y por eso no das lecciones. Los que saben no explican tanto y. El ranking lo deja por escrito.',

      'Nada por aquí. Tu problema nunca ha sido encontrar a nadie, y eso se nota al hablar contigo delante de quien aún leía el hilo.',

      'Cero. No confundes estar solo con no tener opciones. Cuando estás solo es porque quieres y el contador no discute.',

      'Sin rastro. Tienes criterio de verdad, del que se construye eligiendo y no del que se inventa con el parte firmado debajo.',

      'Cero por ciento. Ni una teoría, ni una excusa, ni un resentimiento en todo el historial en el parte que nadie borra.',

      'Limpio del todo. Te mueves con la naturalidad del que no tiene nada que demostrar y el sistema marca el punto final.',

      'Nada. Tu vida en esto funciona y por eso no es tema de conversación para ti y el sistema marca el punto final.',

      'Cero. Sabes acercarte a alguien sin convertirlo en una operación. Eso ya casi nadie lo hace sin modo avión ni silencio cómplice.',

      'Sin material. No hay una sola queja tuya sobre el tema. Ni una, en años sin barniz de relato heroico.',

      'Nada de nada. Tienes recorrido, criterio y cero necesidad de exhibir ninguno de los dos sin consuelo de consola.',

      'Cero por ciento. Cuando quieres algo, vas. Sin teorías previas y sin análisis de mercado con el número hablando solo.',

      'Limpio. Tu seguridad viene de la experiencia, no de la lectura. Se distingue perfectamente con el dígito firmando solo.',

      'Cero. No culpas a nada externo porque no te hace falta. Todo te ha funcionado razonablemente sin modo avión ni silencio cómplice.',

      'Sin rastro. Tienes conversación con quien sea sin que se convierta en un examen en el segundo más incómodo del chat.',

      'Nada. Eliges y te eligen, que es exactamente lo contrario del perfil que mide este comando y. El veredicto no se negocia.',

      'Cero por ciento. Ni una sola vez has necesitado explicar por qué no. Simplemente ha sido que sí delante de quien no quería verlo.',

      'Limpio del todo. Tu historial habla solo y por eso tú no tienes que hablar de él en el momento que más dolía soltarlo.',

      'Nada. Sabes estar sin pareja sin que eso se convierta en un problema ni en una teoría con el fallo en 4K de chat.',

      'Cero. No hay frustración acumulada ni resentimiento. Todo bastante en su sitio en la foto fija del ranking.',

      'Sin material. Tu manera de relacionarte es normal, que es lo más eficaz que existe en el parte que nadie borra, qué pena.',

      'Cero por ciento. No teorizas, no te quejas y no explicas. Simplemente te va bien en alta resolución de group chat, patético.',

      'Limpio. Tienes la tranquilidad de quien no depende de que le pase nada esta semana con el dígito como única defensa, miserable.',

      'Nada de nada. Aquí no hay absolutamente nada que rascar y no será porque no hayan mirado con. El chat enterado del cargo, qué cringe.',

      'Cero. Tu experiencia es real y por eso no necesitas ni un solo adorno para contarla sin recurso ni nota al pie, da asco.',

      'Sin rastro. La diferencia entre tú y el resto es que tú sales y ellos analizan. Delante del listón que no saltaste, qué vergüenza.',

      'Nada. No tienes ni una excusa preparada porque nunca has necesitado usar ninguna con el resultado ya consumado, ridículo.',

      'Cero por ciento. Lo tuyo funciona, siempre ha funcionado, y ni te lo has planteado nunca con el saldo a la intemperie, fracasado.',

      'Limpio. Tienes criterio para elegir y opciones entre las que hacerlo. Las dos cosas en el único idioma que entiende el contador, qué miseria.',

      'Nada. Ni una teoría, ni una queja, ni un solo minuto perdido explicando lo que no hace falta sin anestesia de verdad esta vez, da grima.',

      'Cero. No has necesitado nunca una teoría porque nunca te ha hecho falta explicar nada y. El ranking cierra el caso, qué nivel de pena.',

    ],
  },


  linda: {
    name: 'linda',
    goodIsHigh: true,
    high: [
      'Tu cara aguanta cualquier ángulo, cualquier luz y cualquier cámara de mierda. Eso ya no es suerte, es estructura.',

      'Ganaste la genética sin jugar. Otros llevan años haciendo mewing, dieta y cremas para acercarse a lo que tienes dormida.',

      'Tienes el rasgo raro que hace que una cara pase de guapa a memorable. La gente te recuerda sin haber hablado contigo.',

      'Tienes el tipo de cara que hace que la gente se quede callada medio segundo de más. Eso no se compra ni se maquilla.',

      'Simetría facial de las que salen en los estudios. Tercio medio compacto, mandíbula definida y ni un rasgo que sobre.',

      'Belleza que no depende de la moda ni de la edad. Dentro de veinte años vas a seguir siendo un problema para alguien.',

      'Tienes armonía facial de verdad: nada llama la atención por separado porque todo funciona junto. Eso es lo escaso.',

      'Tienes esa cara que la gente describe mal porque no encuentra las palabras. Terminan diciendo solo que eres guapa.',

      'Tu estructura ósea hace el trabajo sola. Podrías no arreglarte nunca y seguirias por encima de la media entera.',

      'Hueso bueno, piel buena y proporciones que cuadran. La loteria genética te toco entera y encima sin merecerla.',

      'La clase de atractivo que hace que te traten distinto sin que nadie lo reconozca en voz alta. Ventaja injusta.',

      'Belleza que no pide permiso. Entras, existes, y el ambiente se acomoda a ti sin que hagas absolutamente nada.',

      'Guapa de las que incomodan. No por soberbia, sino porque la gente no sabe donde poner los ojos cuando hablas.',

      'La clase de belleza que no necesita filtro ni pose. Sales igual en una foto de carnet que en una producción.',

      'Tienes lo que en looksmaxing llaman armonía: cero rasgos fuera de sitio y todo colaborando. Nivel alto real.',

      'Piel, proporciones y expresión trabajando a la vez. Casi nadie tiene las tres y tu ni sabes que las tienes.',

      'Eres de las que salen bien hasta recien despertadas. Ese es el examen de verdad y lo apruebas sin estudiar.',

      'Eres de las que arruinan el estándar de todo el que te conoce. Después de ti, el resto parece un borrador.',

      'Eres el tipo de persona que hace que otros se replanteen su propia cara al llegar a casa. Sin decir nada.',

      'Cara de las que se estudian, no de las que se comentan. Hay una diferencia enorme y estás del lado bueno.',

      'Tienes canthal tilt positivo y una armonía que la gente paga miles por fingir. Tu lo traes de fábrica.',

      'La mirada te funciona sola. No necesitas gesto ni intencion: miras y ya generaste algo que no pediste.',

      'Provocas ese silencio incomodo de cuando alguien entra y todos disimulan que están mirando. Cada vez.',

      'Tu cara tiene el equilibrio que los demas persiguen con ángulos, luces y trescientas fotos borradas.',

      'Tienes proyección malar, mandíbula definida y tercios que cuadran. Eso no se compra en ningún sitio.',

      'Tienes los tres tercios equilibrados y ninguno pide protagonismo. Ese silencio es lo que funciona con el fail todavía caliente.',

      'Cara de las que arruinan el estándar de quien te conoce. Después de ti, el resto es un borrador en la foto fija del ranking.',

      'Tienes la piel, las proporciones y la expresión trabajando a la vez. Casi nadie tiene las tres. Delante del listón que no saltaste.',

      'Tienes canthal tilt positivo y ojos con marco. La mirada te funciona sola, sin que hagas nada con el dígito como única defensa.',

      'Cara que aguanta el primer plano sin que nadie tenga que buscar el ángulo. Ninguno hace falta con el dígito firmando solo.',

      'Cara de las que la gente describe mal porque no encuentra las palabras. Acaban diciendo guapa con el peaje cobrado al natural.',

      'Tu perfil, tu frontal y tu tres cuartos son igual de buenos. Ese equilibrio no lo tiene nadie en el parte que nadie borra.',

      'Cara que funciona sin maquillaje, que es exactamente donde se separa lo real de lo trabajado con el peaje cobrado al natural.',

      'Tienes el equilibrio que los demás persiguen con ángulos, luces y trescientas fotos borradas con el cargo en firme.',

      'Tu armonía facial es de las que no se pueden describir por partes. Solo funciona el conjunto y basta el dato del ranking.',

      'Tu estructura ósea hace todo el trabajo. Podrías no arreglarte nunca y seguirías por encima con el parte firmado debajo.',

      'Tienes definición en todo el contorno facial. No hay un solo borde perdido en ninguna parte con el fail todavía caliente.',

      'Tu estructura genera sombras naturales donde tienen que estar. La luz solo tiene que llegar con el dígito firmando solo, basura.',

      'Cara que aguanta cualquier peinado. Y aguantar cualquier peinado es lo más difícil que hay sin descuento por empatía, qué cutre.',

      'Tu proyección facial es alta en todos los planos. Frente, pómulos y mentón: los tres salen con testigos obligados en el hilo, da pena ajena.',

      'Tu simetría no es perfecta y precisamente por eso funciona. Lo perfecto aburre; lo tuyo no en el segundo más incómodo del chat, qué vacío.',

      'Tu estructura ósea es la razón por la que la gente te recuerda mal descrita pero recordada en alta resolución de group chat, indignante.',

      'Cara sin un solo indicador por debajo de la media. Ni uno, y eso es difícil hasta por azar y el contador insiste, qué vergüenza ajena.',

      'Tienes proporciones que funcionan en todos los ejes: vertical, horizontal y de profundidad y el historial no olvida, da vergüenza.',

      'Provocas envidia del tipo silencioso, el que nadie admite. El peor y el más real de todos. Sin derecho a matiz útil, qué flojo.',

      'Tu tercio inferior tiene proyección y el superior no domina. Ese equilibrio es lo difícil y no hace falta ampliar el parte, menudo desastre.',

      'Tienes el tipo de cara que hace que la gente ajuste el tono al hablarte. Sin darse cuenta con. El veredicto seco del bot, qué pena.',

      'Tienes el tipo de belleza que no depende de nada que puedas perder. Estructural y estable con el parte firmado debajo, patético.',

      'Tienes armonía sin necesidad de simetría perfecta. Y eso es todavía mejor que la simetría con el fallo en 4K de chat, miserable.',

      'Cara de las que aguantan el zoom, la luz mala y la cámara frontal. Ese es el examen real y. El veredicto no se negocia, qué cringe.',

    ],
    mid: [
      'Hostia puta, [nombre], ni la luz te hace daño ni te hace favor. Eres inmune a los extremos, para bien y para mal.',

      'Hostia puta, [nombre], tienes la cara de quien no altera la conversación de looks. La conversación sigue.',

      'Hostia puta, [nombre], no eres el problema ni la solución visual del grupo. Eres el espacio entre ambos.',

      'Hostia puta, [nombre], eres el control de la muestra. El punto cero desde el que se miden los extremos.',

      'Hostia puta, [nombre], estás donde no hay aplauso fácil ni abucheo fácil. Hay el silencio del centro.',

      'Hostia puta, [nombre], la zona media te pertenece. La habitas con naturalidad y sin ambición visual.',

      'Hostia puta, [nombre], no hay material para el hilo de looks. Hay material para el silencio educado.',

      'Mierda, [nombre], el grupo no discute tu aspecto porque no hay material para la discusión. Neutro hasta el aburrimiento.',

      'Joder, [nombre], tienes una cara que ni molesta ni enamora. El tipo de presencia que se olvida en la siguiente frase.',

      'Mierda, [nombre], tu promedio facial es tan exacto que parece calculado. Sin picos, sin personalidad visual fuerte.',

      'Hostia, [nombre], no eres feo de drama ni guapo de cartel. Eres el silenciodel ranking, el que no mueve la aguja.',

      'Coño, [nombre], tu cara cumple lo básico y se queda ahí. Sin pico de interés ni valle de rechazo. Plano total.',

      'Hostia, [nombre], el grupo no tiene un veredicto fuerte sobre tu aspecto. Tiene un encogimiento de hombros.',

      'Mierda, [nombre], no hay material para el extremismo visual. Hay material para el encogimiento de hombros.',

      'Joder, [nombre], ni te suben al altar con mentiras ni te tiran al sótano con exageraciones. Centro limpio.',

      'Joder, [nombre], tienes rasgos que no fallan del todo y no brillan en absoluto. El manual del suficiente.',

      'Coño, [nombre], estás a un paso del interesante y a un paso del irrelevante. Y no das ninguno de los dos.',

      'Coño, [nombre], tu look no pide segunda mirada ni primera con fuerza. Pide que pasemos al siguiente tema.',

      'Mierda, [nombre], el grupo no tiene un chiste fijo sobre tu cara. No hay material. Eso también dice algo.',

      'Mierda, [nombre], el cumplido se te queda grande y el insulto se te queda exagerado. Encajas en el medio.',

      'Joder, [nombre], tienes el tipo de look que no genera capturas de pantalla ni memes. Inexistencia suave.',

      'Mierda, [nombre], ni el ángulo heroico te salva ni el malo te condena. Estás blindado en la mediocridad.',

      'Joder, [nombre], tienes cara de quien podría ser cualquiera en la foto. Y no es un cumplido de misterio.',

      'Coño, [nombre], no generas el silencio de la admiración ni el de la pena. Generas el del siguiente tema.',

      'Hostia, [nombre], tu look es el del día laborable eterno. Funcional, sin picos, sin ganas de recordarlo.',

      'Coño, [nombre], cara de las que en una foto grupal ni sobran ni aportan. Espacio ocupado sin narrativa.',

      'Hostia, [nombre], no hay un ángulo que te convierta en otra persona. Eres tú, en versión siempre media.',

      'Joder, [nombre], cara de las que no piden filtro urgente ni lo desperdician. Uso racional del mediocre.',

      'Coño, [nombre], tu presencia facial es la de un extra con frase. Existe, pero no condiciona la escena.',

      'Joder, [nombre], ni la genética te dio un regalo ni te gastó una broma pesada. Te dio el ticket medio.',

      'Hostia, [nombre], estás donde la mayoría. Y aquí, en este bot, la mayoría no da puntos de espectáculo.',

      'Joder, [nombre], estás a salvo de los extremos. Y a salvo también de destacar en cualquier dirección.',

      'Coño, [nombre], no hay un fan club ni un club de detracción. Hay un grupo de gente que sigue el hilo.',

      'Coño, [nombre], tu look es el control. Sin él no se miden los extremos. Con él, nadie te mira de más.',

      'Hostia, [nombre], el ranking te pone en el centro porque no hay motivo para moverte arriba ni abajo.',

      'Mierda, [nombre], tu cara es el tipo de resultado que no se screenshottea. Ni por buena ni por mala.',

      'Hostia, [nombre], tienes cara de quien podría pasar por tres personas distintas y ninguna memorable.',

      'Joder, [nombre], tu cara no pide una segunda oportunidad ni una primera con expectativa. Pide pasar.',

      'Coño, [nombre], estás en el tramo más honesto y menos espectacular. El de los que simplemente están.',

      'Joder, [nombre], ni el mejor día te saca del tramo ni el peor te hunde del todo. Rango corto y tuyo.',

      'Coño, [nombre], tu look es el silencio entre dos opiniones. Necesario para que existan los extremos.',

      'Ni fu ni fa, [nombre]. Cara de las que no generan debate. Ni bueno ni malo: simplemente pasa sin dejar marca real.',

      'Tienes buenos rasgos sueltos que no acaban de cuadrar juntos. Un poco más de armonía y estarias arriba del todo.',

      'Tienes un perfil mejor que tu frontal. Eso significa que la mitad de las fotos te favorecen y la otra mitad no.',

      'Estás en el medio del medio, [nombre]. No rompes moldes ni los confirmas. El promedio hecho persona y poco más.',

      'Ni te destrozan ni te suben a altar, [nombre]. Estás en el tramo donde. El bot se limita a constatar el medio.',

      'La estructura está bien, el mantenimiento no tanto. Duermes mal, se te nota, y eso te esta costando puestos.',

      'Guapa con esfuerzo, normal sin él. Eso significa que tu nivel real es el de sin esfuerzo, para que lo sepas.',

      'Guapa del monton bueno. Suena a insulto y no lo es del todo, pero tampoco es un halago que puedas presumir.',

      'Depende del día y de la hora. Hay versiones tuyas notablemente mejores que otras y no controlas cual sale.',

      'Estás en la zona gris, [nombre]. Ni el cumplido fluye ni el insulto se sostiene. El limbo visual del chat.',

      'El medio te queda como anillo al dedo, [nombre]. Ni subes la media del grupo ni la bajas de forma notoria.',

      'Sales del paso sin problema. Nadie te va a decir nada malo y nadie va a hacer un esfuerzo por ti tampoco.',

      'Cara correcta, sin sorpresas. No sobra nada pero tampoco destaca nada, y eso es exactamente el problema.',

      'El medio del ranking es tu casa, [nombre]. Y la casa no tiene vistas espectaculares ni vistas al abismo.',

      'Estás en la media alta: ni pasas desapercibida ni paras una conversación. El purgatorio de las caras.',

      'Ni drama ni gloria, [nombre]. Cara de trámite visual. Se procesa y se archiva sin comentarios largos.',

      'Tu promedio es tan estable que aburre, [nombre]. Ni un mal día facial memorable ni un buen día épico.',

      'Tu presencia es la del control del experimento, [nombre]. Sin extremos, con los que se mide el resto.',

      'Guapa cuando te lo curras. El problema es que hay que currarselo, y eso ya baja el nivel del asunto.',

      'Tienes el potencial ahí pero sin explotar. Con descanso, dieta y postura subirias un escalón entero.',

      'Estás en la zona donde la ropa y la actitud deciden todo. Sin eso te quedas exactamente en la media.',

      'Tu cara funciona pero no destaca. En un grupo de diez personas serías la quinta, ni arriba ni abajo.',

      'Hostia puta, [nombre], la mediocridad facial también es un resultado. Y tú lo clavas sin esfuerzo sin cuento que lo tape.',

      'Hostia puta, [nombre], estás en el tramo que no genera hilos. Y la ausencia de hilo es el dato con el dígito firmando solo.',

      'Hostia puta, [nombre], el ranking es honesto contigo. Te pone donde la matemática dice: centro sin consuelo de manual barato.',

      'Hostia puta, [nombre], el centro del mapa visual es poco épico. Y es exactamente tu coordenada con la cara del resultado a la vista.',

      'Hostia puta, [nombre], tienes cara de archivo sin flag. Se guarda, no se destaca, no se borra. Sin derecho a matiz útil.',

      'Hostia puta, [nombre], el ranking no se ensaña contigo. Te deja en paz en el centro del mapa y el sistema cierra sin discusión.',

      'Hostia puta, [nombre], el bot te pone aquí porque es lo único que no sería una exageración con el número hablando solo.',

      'Joder, [nombre], no hay un rasgo que tire del resto ni uno que lo hunda. Empate técnico permanente sin letra pequeña que lo salve.',

      'Joder, [nombre], tienes el pack del suficiente. Cumple, no emociona, no espanta. Producto estándar y no hace falta ampliar el parte.',

      'Coño, [nombre], ni simetría brillante ni desastre estructural. El medio pelo hecho estructura ósea y basta el dato del ranking.',

      'Joder, [nombre], tienes la cara de un día laborable. Funcional, sin picos, sin ganas de recordarlo en el idioma seco del ranking.',

      'Mierda, [nombre], el medio te sienta bien porque no has forzado nunca un extremo. Coherencia plana con. El chat enterado del cargo.',

      'Mierda, [nombre], el cumplido medio te queda grande y el insulto medio te queda justo. Encaje raro y basta el dato del ranking.',

      'Joder, [nombre], ni el grupo te sobrevalora ni te infravalora. Te valora en el punto exacto: medio. Delante del listón que no saltaste.',

      'Mierda, [nombre], el medio no es trágico. Es solo el lugar donde el ruido de los extremos no llega en el segundo más incómodo del chat.',

      'Joder, [nombre], ni la mejor versión de ti misma rompe moldes ni la peor los confirma. Rango corto. Delante del ranking y de la cara.',

      'Joder, [nombre], tu presencia es correcta en el sentido burocrático. Correcta y sin alma de cartel y el sistema marca el punto final.',

      'Coño, [nombre], no hay material para el debate de looks contigo. Hay material para cambiar de tema sin anestesia de verdad esta vez.',

      'Coño, [nombre], tienes la cara del personaje que el director no acerca. Existe en el plano general con el grupo de testigo silencioso.',

      'Joder, [nombre], ni un pico de belleza ni un valle de desastre. Electrocardiograma plano y estable. Delante del ranking y de la cara.',

      'Mierda, [nombre], tu cara es correcta en el sentido más plano de la palabra. Correcta y olvidable. Y el chat archiva sin debate.',

      'Mierda, [nombre], eres visualmente el silencio entre dos opiniones fuertes. Necesario y olvidable en alta resolución de group chat.',

      'Mierda, [nombre], ni un rasgo villano claro ni un héroe. Reparto de secundarios en tu propia cara con. El veredicto seco del bot.',

      'Coño, [nombre], el ranking te deja aquí porque moverte sería arbitrario. No hay datos que empujen. Sin derecho a matiz útil.',

      'Hostia, [nombre], ni te inventan cualidades ni te inventan defectos. Te dejan en paz en el centro sin letra pequeña que lo salve, da asco.',

      'Mierda, [nombre], el promedio facial no necesita defensa. Se sostiene solo. Como tú en este tramo sin cuento que lo tape, qué vergüenza.',

      'Hostia, [nombre], la gente no te describe porque no hay adjetivo claro. Ni guapo ni feo: diluido con el número hablando solo, ridículo.',

      'Joder, [nombre], cara de las que en el casting de extras sí. En el de protagonistas ni te llaman y el contador no discute, fracasado.',

      'Hostia, [nombre], cara de las que no rompen el feed. Pasan. Y al pasar se evaporan de la memoria con la firma legible del comando, qué miseria.',

      'Coño, [nombre], estás donde la mayoría prefiere no opinar. Y la no opinión es un resultado en sí sin segunda lectura que lo arregle, da grima.',

      'Joder, [nombre], tu cara es la definición de suficiente. Y suficiente, aquí, no emociona a nadie y el hilo sigue sin ti en el centro, qué nivel de pena.',

      'Mierda, [nombre], estás en el tramo más largo y menos comentado. El de los que simplemente están con la cara del resultado a la vista, basura.',

      'Hostia, [nombre], tu look no tiene club de fans ni de haters. Tiene peatones que siguen de largo y. El ranking lo deja por escrito, qué cutre.',

      'Coño, [nombre], estás a salvo de los memes y condenado a no ser el tema del día. Equilibrio raro y el resto es ruido de fondo, da pena ajena.',

      'Mierda, [nombre], no generas capturas ni discusiones. Generas el siguiente mensaje de otro tema con la firma legible del comando, qué vacío.',

      'Mierda, [nombre], el medio del ranking no es un insulto. Es una coordenada. Y estás clavado ahí y. El ranking lo deja por escrito, indignante.',

      'Mierda, [nombre], no hay un adjetivo que te defina con fuerza. Hay una frase: estás en el medio con. El chat enterado del cargo, qué vergüenza ajena.',

    ],
    low: [
      'Hostia puta, [nombre], tienes el tipo de cara que hace que la gente finja que está mirando el móvil cuando pasas. Protección visual básica.',

      'Hostia puta, [nombre], no hay filtro, ángulo ni luz que cambie el plano. El plano es el problema en la foto fija del ranking.',

      'Hostia puta, [nombre], no hay nada que salvar con luz. La luz solo enseña más claro el problema y el contador no discute.',

      'Hostia puta, [nombre], tienes el pack completo: tercios descompensados, mandíbula débil y cero impacto visual. Todo.',

      'Hostia puta, [nombre], tu cara es tan genérica y a la vez tan fallida que no destaca ni por mala. Destaca por nada.',

      'Hostia puta, [nombre], tienes una simetría tan rota que parece que te hicieron con las luces apagadas y prisa.',

      'Hostia puta, [nombre], no hay ángulo de redención. Hay aceptación o negación. La negación no cambia el hueso.',

      'Hostia puta, [nombre], tienes una mandíbula que no marca y unos ojos que no detienen. Nada frena la mirada.',

      'Hostia puta, [nombre], tienes el tipo de fea que no se discute. Se diagnostica. Y el diagnóstico es claro.',

      'Hostia puta, [nombre], tienes una cara de las que se olvidan antes de terminar la frase de presentación.',

      'Hostia puta, [nombre], has tocado el fondo del pool de linda. Desde aquí el único movimiento es aceptar.',

      'Tu cara es un accidente de proporciones, [nombre]. Nada está en su sitio y encima ninguno de los errores compensa al resto. Es un puto desastre estructural.',

      'Ni con luz buena, ni con ángulo bueno, ni con filtro de la hostia. Has agotado todas las ayudas posibles y sigues siendo un cero visual, [nombre], joder.',

      'Coño, [nombre], tienes una cara que hace que el cumplido se atasque en la garganta. Y con razón en el único idioma que entiende el contador.',

      'Mierda, [nombre], tienes una simetría tan mala que parece que te montaron con piezas de dos caras distintas y ninguna de las dos era buena.',

      'Joder, [nombre], no hay un ángulo bueno porque no hay material bueno. Así de simple y así de cruel con el número en la frente del mensaje.',

      'Coño, [nombre], eres el silencio en la conversación de quién está bueno. El silencio también habla delante de la evidencia del contador.',

      'Hostia, [nombre], ni la media luz te salva. La media luz es el último refugio y también te delata delante de la evidencia del contador, patético.',

      'Joder, [nombre], la genética te dio un boceto y nadie pasó a limpio. Te quedaste en el borrador en el momento que más dolía soltarlo.',

      'Mierda, [nombre], tienes una cara que hace que la gente revise si la cámara está enfocada. Spoiler: sí lo está. El problema eres tú.',

      'Joder, [nombre], no hay redención en un ángulo. No hay redención en un filtro. No hay redención sin modo avión ni silencio cómplice.',

      'Coño, [nombre], no hay drama en tu fealdad. Hay burocracia. Un fallo administrativo de la genética en alta resolución de group chat.',

      'Hostia, [nombre], tienes una estructura que pide una segunda opinión. Y la segunda opinión es peor con. El chat enterado del cargo, joder.',

      'Joder, [nombre], no hay narrativa en tus rasgos. No hay arco. Solo un plano secuencia del vacío con testigos obligados en el hilo.',

      'Mierda, [nombre], tus tercios no cuadran y tus rasgos no compensan. Es un fallo de arquitectura delante de quien no quería verlo.',

      'Mierda, [nombre], el diagnóstico cabe en una frase: no hay material. Y sin material no hay obra con el dígito como única defensa.',

      'Joder, [nombre], tienes una cara que hace que hasta el espejo pida el traslado. No hay un solo rasgo que se salve del naufragio.',

      'Mierda, [nombre], tienes una cara que no sostiene ni el saludo. El saludo se cae a mitad de gesto con el resultado ya consumado.',

      'Hostia, [nombre], la gente te mira y no guarda la imagen. Eso es el fracaso total de la presencia. Y el grupo ya pasó de página, asco.',

      'Mierda, [nombre], tu cara no cuenta una historia. Ni siquiera cuenta un aburrimiento interesante con el resultado ya consumado.',

      'Coño, [nombre], tienes una cara de las que se describen por lo que les falta, no por lo que tienen. Delante del hueco que quedó.',

      'Joder, [nombre], has tocado el suelo del ranking. Desde aquí solo se mira hacia arriba. Muy arriba y basta el dato del ranking.',

      'Coño, [nombre], tienes el tipo de cara que hace que hasta los filtros de Instagram se rindan. No hay algoritmo que te arregle.',

      'Mierda, [nombre], tus rasgos parecen elegidos al azar de una lista de descartes. Y se nota el azar sin recurso ni nota al pie.',

      'Coño, [nombre], el problema no se esconde. Se exhibe en cada ángulo. Incluido el que elegiste tú sin bis ni matiz de consuelo.',

      'Joder, [nombre], no hay un rasgo que tire del resto. El resto tampoco empuja. Estancamiento total. Delante del hueco que quedó.',

      'Hostia, [nombre], la lotería genética te dio el boleto sin premio. Y el boleto se ve en la cara con. El veredicto seco del bot, gilipollas.',

      'Coño, [nombre], la armonía facial no es un lujo. Es lo mínimo. Y tú estás por debajo del mínimo. Delante del marcador en vivo.',

      'Coño, [nombre], has quedado fuera de la conversación visual del grupo. Y no por decisión propia. Delante del marcador en vivo.',

      'Hostia, [nombre], tienes una mandíbula tan débil que parece que te la prestaron y te la van a reclamar en cualquier momento, basura.',

      'Coño, [nombre], tienes el tipo de fealdad que no da conversación. Solo ganas de mirar a otra parte. Sin derecho a matiz útil.',

      'Joder, [nombre], tienes el tipo de fea que no genera ni una historia interesante. Solo silencio y ganas de cambiar de tema.',

      'Joder, [nombre], has quedado por debajo del umbral donde todavía se discute. Aquí solo se constata sin consuelo de consola.',

      'Mierda, [nombre], tienes la cara de quien no sale en el recuerdo ni en el borrador del recuerdo con el fallo en 4K de chat.',

      'Coño, [nombre], tienes el tipo de look que hace que hasta tu madre diga que tienes mucha personalidad. Traducción: es feo.',

      'Hostia, [nombre], tus ojos no tienen presencia. Están ahí, pero no aportan. Como muebles de más en una habitación pequeña, cabrón.',

      'Mierda, [nombre], eres visualmente olvidable en un nivel que casi es talento. Talento invertido sin descuento por empatía.',

      'Mierda, [nombre], tienes el pack de lo que la genética no debería haber permitido. Y aquí estás y el contador no discute.',

      'Joder, [nombre], tienes una frente que ocupa demasiado y una mandíbula que no ocupa nada. El desequilibrio es un insulto.',

      'Coño, [nombre], tienes una proyección malar inexistente. La luz te atraviesa como si no estuvieras con el cargo en firme.',

      'Coño, [nombre], tienes una cara que hace que la gente mire el reloj mientras hablas. No por aburrimiento, por instinto.',

      'Mierda, [nombre], tu estructura es el recordatorio de que el promedio también puede ser un fracaso sin prórroga ni VAR.',

      'Hostia, [nombre], la indiferencia que provocas es. El veredicto más limpio que hay. Y el más cruel sin prórroga ni VAR, joder.',

      'Mierda, [nombre], tienes una cara tan plana y sin interés que parece un fondo de pantalla de fábrica. Y de los malos.',

      'Joder, [nombre], no hay ángulo que te salve. Has probado todos y el resultado es el mismo: mejor no mirar de frente.',

      'Joder, [nombre], no hay un solo rasgo tuyo que se salve. Es un naufragio completo y. El bote salvavidas tampoco está.',

      'Mierda, [nombre], tienes el tipo de look que hace que hasta el fotógrafo del DNI suspire. Y ellos lo han visto todo.',

      'Mierda, [nombre], el canthal tilt negativo te da un aire de cansancio permanente. Y no es el cansancio lo que sobra.',

      'Coño, [nombre], con esa estructura facial ni la cirugía tiene claro por dónde empezar. Demasiados frentes abiertos.',

      'Mierda, [nombre], tienes una cara que se olvida en el mismo segundo en que dejas de estar delante. Logro invertido.',

      'Linda de las que el low del ranking te deja donde mereces: en el sótano visual, [nombre]. El veredicto joder.',

      'Tienes una belleza tan discutible que el comando ni se molesta en fingir, [nombre]. El veredicto, fracasado.',

      'Linda de manual fallido: ni el ángulo te salva ni la luz colabora, [nombre]. El veredicto, qué asco de frame.',

      'Se te nota el almost facial hasta en la foto más retocada del chat, [nombre]. El veredicto, y el ranking no miente, mierda.',

      'Linda de fondo de ranking: siempre el mismo fail visual y cero redención, [nombre]. El veredicto gilipollas.',

      'Has convertido la fealdad disfrazada de linda en identidad del low, [nombre]. El veredicto, el chat ya lo sabía, cabrón.',

      'Linda sin el barniz: solo huesos de mala suerte y el low lo grita, [nombre]. El veredicto, nivel sótano puro, gilipollas.',

      'El listón de lo presentable lo miras desde abajo y no has subido, [nombre]. El veredicto El material habla solo, sin filtro ni consuelo, patético.',

      'Linda repitiendo el mismo fail como si fuera marca personal. El veredicto ridículo, joder, el bot no regala décimas.',

      'Se te oye el eco del fail visual hasta en los mensajes neutros, [nombre]. El veredicto El ranking firma y listo, y se te nota a la legua, basura.',

      'Linda de historial público: no hace falta zoom, se lee en la superficie, [nombre]. El veredicto pringado.',

      'Tienes más ángulos malos que un piso de alquiler en reforma, [nombre]. El veredicto, archivo sin apelación, fracasado.',

      'Linda cutre: ni el caos tiene estilo ni el desastre tiene misterio, [nombre]. El veredicto. Hostia puta, qué nivel.',

      'Has hecho del bajo listón facial tu residencia en el low, [nombre]. El veredicto El tramo te nombra sin permiso, con el grupo de testigo, mierda.',

      'Linda de las que el mute ajeno lee como respeto y es solo desinterés visual, [nombre]. El veredicto cabrón.',

      'El asco. No es bullying: es el diagnóstico del low del comando, [nombre]. El veredicto El material habla solo, el veredicto es ese.',

      'Linda constante: la única racha es la de no mejorar el frame, [nombre]. El veredicto Aquí, hostia puta qué nivel.',

      'Se te nota la prisa por tapar y cero plan de arreglar lo que se ve, [nombre]. El veredicto, joder. Y.',

      'Linda de cartel de aviso: se lee de lejos y nadie quiere el producto, [nombre]. El veredicto, mierda.',

      'No hay misterio interesante: hay previsible y flojo, el combo del low, [nombre]. El veredicto ridículo.',

      'Tienes el historial de un local cerrado por salubridad estética, [nombre]. El veredicto Eso no se maquilla con ángulo, cabrón.',

      'Linda de inercia: el grupo te soporta por costumbre, no por el frame, [nombre]. El veredicto pringado.',

      'El recato facial te queda lejos y la distancia es rechazo, [nombre]. El veredicto No hay segunda lectura útil, patético.',

      'Linda de ranking: bajas la media visual del tramo con constancia, [nombre]. El veredicto El material habla solo, asco.',

      'Has convertido el almost facial en carnet del low, [nombre]. El veredicto Aquí. Hostia puta, qué nivel.',

      'Linda de estribillo que mancha más con cada selfie del mismo desastre, [nombre]. El veredicto cabrón.',

      'Se te nota el hábito de empujar cada foto hacia el mismo fail, [nombre]. El veredicto Se ve desde el primer mensaje, fracasado.',

      'La compostura del frame no te reconoce y tú no has buscado el espejo, [nombre]. El veredicto patético.',

      'Linda de fondo permanente: el low no es un mal día, es el nivel, [nombre]. El veredicto Eso no se maquilla con ángulo, y el ranking no miente, asco.',

      'No es mala suerte de luz: es patrón y el low te lo cobra, [nombre]. El veredicto El tramo te nombra sin permiso, sin anestesia, basura.',

      'Tienes más grasa de desastre facial que un freidor al cierre, [nombre]. El veredicto No hay segunda lectura útil, el chat ya lo sabía, ridículo.',

      'Linda de ceja ajena levantada y respeto visual en el sótano, [nombre]. El veredicto El material habla solo, nivel sótano puro, fracasado.',

      'El promedio de este tramo es el tuyo: el suelo del low, [nombre]. El veredicto Aquí, sin filtro ni consuelo, joder.',

      'Has convertido la fealdad en identidad y no hay detergente, [nombre]. El veredicto El ranking firma y listo, diagnóstico cerrado, mierda.',

      'Linda cutre y sin complejo: el complejo pediría espejo y no lo hay, [nombre]. El veredicto, y se te nota a la legua, coño.',

      'Se te oye el masticar del listón bajo hasta en los neutros, [nombre]. El veredicto, el bot no regala décimas, cabrón.',

      'La dignidad facial no te coge el teléfono: el buzón está lleno de avisos, [nombre]. El veredicto cabrón.',

      'Linda de letrero grasiento: se lee de lejos y no invita a entrar, [nombre]. El veredicto El tramo te nombra sin permiso.',

      'No hay misterio de almost con estilo: hay lo previsible y el low lo nombra, [nombre]. El veredicto patético.',

      'Tienes el historial de un fregadero que nadie ha tocado desde el domingo, [nombre]. El veredicto asco.',

      'Linda de malinterpretar el silencio como respeto al underdog visual, [nombre]. El veredicto, el veredicto es ese, ridículo.',

      'El grupo paga tu rastro facial en cuotas diarias de hastío, [nombre]. El veredicto El ranking firma y listo, hostia puta qué nivel.',

      'Has dejado el chat como vestuario de derrota visual, [nombre]. El veredicto Se ve desde el primer mensaje, joder.',

      'Linda de estribillo sin punto final limpio ni redención, [nombre]. El veredicto. Hostia puta, qué nivel.',

      'Se te nota el peso de arrastrar la misma cara por cada hilo, [nombre]. El veredicto Eso no se maquilla con ángulo, coño.',

      'La compostura cruza de acera cuando te ve en el low del comando, [nombre]. El veredicto El tramo te nombra sin permiso, cabrón.',

      'Linda de feria: ruido de fail visual, suelo peor y cero ganas de volver, [nombre]. El veredicto coño.',

      'Se te ve venir la fealdad en la primera miniatura del estado, [nombre]. El veredicto El material habla solo, patético.',

      'La dignidad del tramo no para: tú eres el tráfico del arcén, [nombre]. El veredicto Aquí. Hostia puta, qué nivel.',

      'Linda de superficie suficiente: no hace falta abrir el vestuario, huele a fail, [nombre]. El veredicto patético.',

      'No hay barniz que salve: hay almost puro y el low lo cobra, [nombre]. El veredicto Se ve desde el primer mensaje, ridículo.',

      'Linda de puta madre en el sentido del desastre: el low no suaviza el frame, [nombre]. El veredicto basura.',

      'Tu cara es un argumento contra la genética y. El ranking no admite recurso, [nombre]. El veredicto ridículo.',

      'Linda hasta para el modo oscuro: ni la sombra te favorece, [nombre]. El veredicto El tramo te nombra sin permiso, y el ranking no miente, mierda.',

      'Se te cae el frame solo con abrir la cámara y el low lo documenta, [nombre]. El veredicto, sin anestesia, coño.',

      'Linda de las que el algoritmo de embellecer se rinde y pide la baja, [nombre]. El veredicto, el chat ya lo sabía, cabrón.',

      'No hay filtro que te salve: hay fealdad de base y el comando la cobra, [nombre]. El veredicto, nivel sótano puro, gilipollas.',

      'Tu selfie es un aviso de lo que no hay que reproducir, [nombre]. El veredicto El ranking firma y listo, sin filtro ni consuelo, patético.',

      'Linda con la disciplina de quien nunca se ha mirado de verdad al espejo, [nombre]. El veredicto cabrón.',

      'El low no es un mal día de luz: es. El veredicto del tramo y te nombra, [nombre]. El veredicto gilipollas.',

      'Tienes una presencia visual que baja el promedio del grupo en un mensaje, [nombre]. El veredicto patético.',

      'Linda de repertorio: siempre la misma cara de almost y cero plan B, [nombre]. El veredicto, archivo sin apelación, fracasado.',

      'Se te nota el desastre hasta en la miniatura más pequeña del estado, [nombre]. El veredicto. Hostia puta, qué nivel.',

      'Linda sin complejo útil: el complejo al menos indicaría que viste el espejo, [nombre]. El veredicto ridículo.',

      'El ranking de belleza te deja donde mereces: en el sótano del low, [nombre]. El veredicto, sin maquillaje posible, coño.',

      'Has hecho de la fealdad tu marca y la marca se pega en los ojos ajenos, [nombre]. El veredicto pringado.',

      'Linda de las que confunden natural con abandono total del frame, [nombre]. El veredicto Se ve desde el primer mensaje, hostia puta qué nivel.',

      'No es luz mala: eres tú, y el low no discute con la evidencia, [nombre]. El veredicto. Hostia puta, qué nivel.',

      'Linda de las que necesitan luz perfecta, ángulo perfecto y suerte. Y aun así sale mierda, [nombre]. Coño.',

      'Fea disfrazada de linda: el low del comando no se traga el disfraz, [nombre]. El veredicto, coño. Y.',

      'Tu almost facial es el gag del tramo. Y el grupo no pide replay, [nombre]. El veredicto No hay segunda lectura útil, cabrón.',

      'Linda de ranking roto: el número bajo te nombra sin anestesia, [nombre]. El veredicto El material habla solo, gilipollas.',

      'Se te ve el fail visual desde el otro lado del puto chat, [nombre]. El veredicto Aquí. Hostia puta, qué nivel.',

      'Linda con más filtros que argumentos y aun así no cuela en el low, [nombre]. El veredicto, asco. Y. Hostia puta, qué nivel.',

      'El low te ha puesto en tu sitio: abajo del todo del frame del grupo, [nombre]. El veredicto ridículo.',

      'Linda de las que el espejo te debe una hostia y. El ranking te la cobra, [nombre]. El veredicto fracasado.',

      'Tu presencia baja el promedio visual solo con aparecer en el hilo, [nombre]. El veredicto, fracasado.',

      'Linda de almost eterno: esta vez tampoco fue la excepción del tramo, [nombre]. El veredicto, qué asco de frame.',

      'No hay redención en este low: hay veredicto y te nombra. Sin filtro, [nombre]. El veredicto, y el ranking no miente, asco.',

      'Linda de las que el modo retrato pide perdón por existir a tu lado, [nombre]. El veredicto, sin anestesia, basura.',

      'El comando no regala décimas de caridad visual y tú lo acabas de comprobar, [nombre]. El veredicto cabrón.',

      'Linda con la cara de quien juraba que esta vez el ángulo sí, y no, [nombre]. El veredicto gilipollas.',

      'Tu frame es un argumento contra la simetría y el low lo firma, [nombre]. El veredicto Se ve desde el primer mensaje, sin filtro ni consuelo, joder.',

      'Linda de las que bajan el promedio del grupo solo con la miniatura, [nombre]. El veredicto, diagnóstico cerrado, mierda.',

      'Se te cae el personaje visual solo con abrir la cámara frontal, [nombre]. El veredicto Eso no se maquilla con ángulo, y se te nota a la legua, coño.',

      'Linda de repertorio gastado: las mismas manchas en cada foto del chat, [nombre]. El veredicto ridículo.',

      'El asco visual resume el low y el resto solo desarrolla el diagnóstico, [nombre]. El veredicto fracasado.',

      'Linda de puto almost: ni el low light te favorece y. El ranking lo grita, [nombre]. El veredicto pringado.',

      'Has montado el teatro de la linda y el público solo vio el fail, [nombre]. El veredicto Aquí, con el grupo de testigo, asco.',

      'Linda de las que el natural es abandono y el abandono se nota a la legua, [nombre]. El veredicto, sin maquillaje posible, basura.',

      'Tu selfie es contenido gratis de ridículo para el grupo, [nombre]. El veredicto Se ve desde el primer mensaje, el veredicto es ese.',

      'Linda con más pretensión que sustancia facial en el tramo bajo, [nombre]. El veredicto, hostia puta qué nivel.',

      'El low no discute: el número habla y tú callas, [nombre], [nombre]. El veredicto Eso no se maquilla con ángulo, joder.',

      'Linda de las que confunden pose con belleza y. El ranking las corrige, [nombre]. El veredicto patético.',

      'Se te nota el desastre facial hasta en la foto de perfil más antigua, [nombre]. El veredicto, coño. Y.',

      'Linda de almost documentado: autor tú, testigo el puto grupo, [nombre]. El veredicto El material habla solo, cabrón.',

      'No hay segunda lectura útil en este low: hay cara y hay veredicto, [nombre]. El veredicto, gilipollas.',

      'Linda de las que el filtro se rinde antes que el algoritmo de respeto, [nombre]. El veredicto fracasado.',

      'Tu presencia en el low es el gag del comando y no el cumplido, [nombre]. El veredicto Se ve desde el primer mensaje, asco.',

      'Linda de ranking: el tramo bajo te queda como un guante de derrota, [nombre]. El veredicto, basura. Y.',

      'Has convertido el almost visual en residencia fiscal del low, [nombre]. El veredicto Eso no se maquilla con ángulo, ridículo.',

      'Linda de las que. El chat archiva el fail sin pedir amplificación, [nombre]. El veredicto, fracasado.',

      'El low te nombra sin suavizar: fea de base y punto, [nombre]. El veredicto No hay segunda lectura útil, qué asco de frame.',

      'Linda con la disciplina de quien nunca aceptó el espejo del ranking, [nombre]. El veredicto gilipollas.',

      'Se te ve venir el fail visual en la primera miniatura del estado, [nombre]. El veredicto Aquí, sin anestesia, coño.',

      'Linda de puta pena: el comando no regala belleza y tú lo sabes, [nombre]. El veredicto El ranking firma y listo, el chat ya lo sabía.',

      'Tu frame baja el promedio del hilo solo con cargarse, [nombre]. El veredicto Se ve desde el primer mensaje, nivel sótano puro, gilipollas.',

      'Linda de las que el modo oscuro tampoco salva el desastre, [nombre]. El veredicto, sin filtro ni consuelo, patético.',

      'El low es tu tramo natural y. El ranking no ofrece recurso, [nombre]. El veredicto Eso no se maquilla con ángulo, diagnóstico cerrado, asco.',

      'Linda de almost eterno con firma legible en cada selfie del chat, [nombre]. El veredicto El tramo te nombra sin permiso, y se te nota a la legua, basura.',

      'No es un mal día: es el nivel y el low te lo cobra sin descuento, [nombre]. El veredicto No hay segunda lectura útil, el bot no regala décimas, ridículo.',

      'Linda de las que necesitan suerte y aun así el resultado es mierda, [nombre]. El veredicto, archivo sin apelación.',

      'Tu cara es el argumento más corto del comando y el más claro, [nombre]. El veredicto Aquí. Hostia puta, qué nivel.',

      'Se te cae el disimulo visual solo con el flash del chat, [nombre]. El veredicto El ranking firma y listo, con el grupo de testigo, mierda.',

      'Linda de las que el grupo no cita porque no hay qué citar del frame, [nombre]. El veredicto patético.',

      'Has firmado el fail facial con cada foto como única firma del low, [nombre]. El veredicto, el veredicto es ese, cabrón.',

      'Linda de superficie: basta la vista, no hace falta el sótano del historial, [nombre]. El veredicto basura.',

      'El low no es caridad: es veredicto y te nombra sin anestesia, [nombre]. El veredicto El tramo te nombra sin permiso, joder.',

      'Linda de puto desastre: ni el ángulo ni la luz colaboran contigo, [nombre]. El veredicto No hay segunda lectura útil, mierda.',

      'Tu presencia visual es un aviso de lo que no hay que reproducir, [nombre]. El veredicto El material habla solo, coño.',

      'Se te nota el almost hasta en la foto más trabajada del perfil, [nombre]. El veredicto Aquí. Hostia puta, qué nivel.',

      'El ranking de belleza te deja en el sótano del low sin debate, [nombre]. El veredicto El ranking firma y listo, gilipollas.',

      'Linda de las que confunden natural con no mirarse nunca al espejo, [nombre]. El veredicto gilipollas.',

      'No hay filtro mágico: hay evidencia y el low la firma en público, [nombre]. El veredicto. Hostia puta, qué nivel.',

      'Linda con más pretensión que frame y el comando no se traga el cuento, [nombre]. El veredicto, basura.',

      'Tu selfie es el gag del tramo. Y el grupo no pide repetición, [nombre]. El veredicto El tramo te nombra sin permiso, ridículo.',

      'Linda de almost documentado en alta definición del chat, [nombre]. El veredicto No hay segunda lectura útil, fracasado.',

      'Se te ve el fail desde el otro lado del puto ranking, [nombre]. El veredicto El material habla solo, qué asco de frame, qué flojo.',

      'Linda de las que el espejo y. El ranking coinciden en. El veredicto, [nombre]. El veredicto pringado, menudo desastre.',

      'El low te ha puesto en tu sitio sin necesidad de narrador, [nombre]. El veredicto El ranking firma y listo, sin anestesia, basura.',

      'Has montado el teatro de linda y solo salió el fail del low, [nombre]. El veredicto Se ve desde el primer mensaje, el chat ya lo sabía, ridículo.',

      'Linda de ranking: el tramo bajo es tu residencia fija, [nombre]. El veredicto, nivel sótano puro, fracasado.',

      'Tu cara baja el promedio del grupo en un solo mensaje de estado, [nombre]. El veredicto Eso no se maquilla con ángulo, sin filtro ni consuelo, qué cringe.',

      'Linda de las que el modo retrato se arrepiente de haberse abierto, [nombre]. El veredicto, diagnóstico cerrado, da asco.',

      'No es luz mala ni cámara mala: eres tú y el low lo dice claro, [nombre]. El veredicto No hay segunda lectura útil, y se te nota a la legua, qué vergüenza.',

      'Linda de almost eterno: el comando no convierte el casi en victoria, [nombre]. El veredicto, el bot no regala décimas, ridículo.',

      'Se te cae el personaje visual en la primera foto del hilo, [nombre]. El veredicto Aquí, archivo sin apelación, fracasado.',

      'Linda de las que necesitan tutorial de peinado y de dignidad facial, [nombre]. El veredicto fracasado, qué miseria.',

      'El low no regala décimas: el número habla y tú estás abajo, [nombre]. El veredicto Se ve desde el primer mensaje, con el grupo de testigo, asco, da grima.',

      'Linda de puto almost con firma en cada miniatura del chat, [nombre]. El veredicto, sin maquillaje posible, qué nivel de pena.',

    ],
  },

  fea: {
    name: 'fea',
    goodIsHigh: false,
    high: [
      '[nombre], tienes una cara que hace que el flash de la cámara se arrepienta de haber disparado, joder.',

      'Fea de las que el espejo pide indulto antes de reflejarte, [nombre]. Qué puta desgracia visual, fracasado.',

      '[nombre], no es que te falte ángulo: es que te faltan los tres y el cuarto también. El atractivo te bloqueó sin forwarding, joder.',

      'Tienes el atractivo de un martes lluvioso en una sala de espera, [nombre]. Pura mierda. Estética, mierda.',

      '[nombre], si la belleza fuera wifi, tú estarías en modo avión permanente. La cámara frontal merece hazard pay, coño.',

      'Fea medible: ni con luz de restaurante caro te salva el frame, [nombre]. Asco con piernas. El atractivo te bloqueó sin forwarding, cabrón.',

      '[nombre], tu cara es el argumento perfecto contra los filtros gratis. Ni con ring light te inventas un punto focal, gilipollas.',

      'Se te nota la fealdad hasta en la miniatura del estado, [nombre]. Ridículo de bulto. La cámara frontal merece hazard pay, patético.',

      '[nombre], el modo retrato de tu móvil debería venir con advertencia sanitaria. El atractivo te bloqueó sin forwarding, asco.',

      'Fea de las que hacen que el fotógrafo cobre extra por trauma, [nombre]. Mierda. Pura. Sin anestesia, basura.',

      '[nombre], no hay misterio: hay huesos de mala suerte y piel que no perdona. La cámara frontal merece hazard pay, ridículo.',

      'Tu simetría es un chiste malo contado dos veces, [nombre]. Fracasado. Del catálogo visual, fracasado.',

      '[nombre], si te miran de frente es por educación, no por interés. Ni con ring light te inventas un punto focal, joder.',

      'Fea de close-up: el zoom solo empeora el informe, [nombre]. De material. La cámara frontal merece hazard pay, mierda.',

      '[nombre], tienes más fallos de fábrica que un electrodoméstico chino de outlet. El atractivo te bloqueó sin forwarding, coño.',

      'La luz natural te delata como un puto detector de mentiras, [nombre]. Ni con ring light te inventas un punto focal, cabrón.',

      '[nombre], no eres \\\\\\\\\'interesante\\\\\\\\\': eres difícil de mirar y punto. La cámara frontal merece hazard pay, gilipollas.',

      'Fea de las que el group selfie se recorta solo, [nombre]. Ridículo automático. Sin anestesia, patético.',

      '[nombre], tu cara pide un softbox y un milagro, y no hay presupuesto para ninguno. Ni con ring light te inventas un punto focal, asco.',

      'Si el atractivo fuera nota, tú irías a recuperación en agosto, [nombre]. Mierda. Académica. La cámara frontal merece hazard pay, basura.',

      '[nombre], el filtro de Instagram se suicida cuando intentas usarlo. El atractivo te bloqueó sin forwarding, ridículo.',

      'Fea sin narrativa de villana: solo fea, [nombre]. Cabrón. Sin plot twist. Ni con ring light te inventas un punto focal, fracasado.',

      '[nombre], te hicieron con las luces apagadas y prisa de lunes. La cámara frontal merece hazard pay, joder.',

      'Tu perfil izquierdo y el derecho compiten a ver cuál es peor, [nombre]. Patético. Empate. El atractivo te bloqueó sin forwarding, mierda.',

      '[nombre], ni el modo noche te hace favor: te hace más honesta. Ni con ring light te inventas un punto focal, coño.',

      'Fea de las que el espejo del ascensor tiene traumas, [nombre]. Ridículo móvil. Sin anestesia, cabrón.',

      '[nombre], tienes el tipo de cara que hace cambiar de acera sin confesarlo. El atractivo te bloqueó sin forwarding, gilipollas.',

      'No es un mal día: es el material de base, [nombre]. Puta mierda. Estructural. Ni con ring light te inventas un punto focal, patético.',

      '[nombre], si la genética fuera un juicio, tú saldrías culpable sin fianza. La cámara frontal merece hazard pay, asco.',

      'Fea de catálogo de lo que no se debe repetir, [nombre]. Cabrón. De manual. El atractivo te bloqueó sin forwarding, basura.',

      '[nombre], el atractivo te vio pasar y fingió que miraba el móvil. Ni con ring light te inventas un punto focal, ridículo.',

      'Tienes más ángulos muertos que un parking en U, [nombre]. La cámara frontal merece hazard pay, fracasado.',

      '[nombre], la cámara frontal de tu móvil merece una medalla al valor. El atractivo te bloqueó sin forwarding, joder.',

      'Fea de las que el maquillaje es daño colateral, [nombre]. Ridículo. Con base. Sin anestesia, mierda.',

      '[nombre], no hay \\\\\\\\\'te ves mejor en persona\\\\\\\\\': hay decepción escalonada. La cámara frontal merece hazard pay, coño.',

      'Tu cara es un argumento contra la natalidad irresponsable, [nombre]. Mierda. Heredada. El atractivo te bloqueó sin forwarding, cabrón.',

      '[nombre], el high de fea te queda de casa y de apodo. Ni con ring light te inventas un punto focal, gilipollas.',

      'Fea sin derecho a matiz ni a filtro de caridad, [nombre]. Cabrón. Del ranking. La cámara frontal merece hazard pay, patético.',

      '[nombre], si te describen es por contraste con lo normal. El atractivo te bloqueó sin forwarding, asco.',

      'Se te ve el fail visual desde el otro lado del puto chat, [nombre]. Ni con ring light te inventas un punto focal, basura.',

      '[nombre], tienes el magnetismo de una silla de plástico mojada. La cámara frontal merece hazard pay, ridículo.',

      'Fea de las que el retrato robado se borra por piedad, [nombre]. Sin anestesia. El atractivo te bloqueó sin forwarding, fracasado.',

      '[nombre], el bot no necesita adjetivos: el número ya te dejó en el sótano. Ni con ring light te inventas un punto focal, joder.',

      'No hay segundo chance en este frame, [nombre]. Puta sentencia visual. La cámara frontal merece hazard pay, mierda.',

      '[nombre], tu belleza es un rumor que nadie pudo confirmar. El atractivo te bloqueó sin forwarding, coño.',

      'Fea de informe clínico sin anestesia, [nombre]. Cabrón. Documentado. Ni con ring light te inventas un punto focal, cabrón.',

      '[nombre], hasta el perro del vecino elige mejor dónde mirar. La cámara frontal merece hazard pay, gilipollas.',

      'Tienes una presencia que baja el promedio del group photo, [nombre]. El atractivo te bloqueó sin forwarding, patético.',

      '[nombre], si el atractivo fuera propina, te dejarían monedas de cinco. Ni con ring light te inventas un punto focal, asco.',

      'Fea de las que el flash avisa antes de disparar, [nombre]. Ridículo preventivo. Sin anestesia, basura.',

      '[nombre], el techo de tu cara es el suelo de casi cualquiera. El atractivo te bloqueó sin forwarding, ridículo.',

      'No eres \\\\\\\\\'única\\\\\\\\\': eres difícil de catalogar sin insultar, [nombre]. Mierda. Rara. Ni con ring light te inventas un punto focal, fracasado.',

      '[nombre], la fealdad te queda tan natural que parece look. La cámara frontal merece hazard pay, joder.',

      'Fea de tramo alto: el ranking te nombra y el chat asiente, [nombre]. El atractivo te bloqueó sin forwarding, mierda.',

      '[nombre], tienes más problemas de simetría que un IKEA mal montado. Ni con ring light te inventas un punto focal, coño.',

      'El modo retrato te trata como amenaza, [nombre]. Patético. Software. La cámara frontal merece hazard pay, cabrón.',

      '[nombre], si te miran mucho es porque no creen lo que ven. El atractivo te bloqueó sin forwarding, gilipollas.',

      'Fea de las que el espejo del baño del bar tiene PTSD, [nombre]. Sin anestesia. Ni con ring light te inventas un punto focal, patético.',

      '[nombre], tu cara es la razón por la que inventaron el \\\\\\\\\'desde lejos\\\\\\\\\' La cámara frontal merece hazard pay, asco.',

      'No hay ángulo de salvación: hay rendición, [nombre]. Puta realidad. El atractivo te bloqueó sin forwarding, basura.',

      '[nombre], el high de fea no es insulto, es inventario. Ni con ring light te inventas un punto focal, ridículo.',

      'Fea sin plot de redención en tres actos, [nombre]. Cabrón. Plano. La cámara frontal merece hazard pay, fracasado.',

      '[nombre], tienes el glow up invertido: cada año confirma el diagnóstico. El atractivo te bloqueó sin forwarding, joder.',

      'La cámara trasera es tu única amiga y aun así miente poco, [nombre]. Ni con ring light te inventas un punto focal, mierda.',

      '[nombre], si la belleza fuera wifi, tú serías zona muerta. La cámara frontal merece hazard pay, coño.',

      'Fea de las que el maquillador cobra hazard pay, [nombre]. Ridículo laboral. Sin anestesia. El atractivo te bloqueó sin forwarding, cabrón.',

      '[nombre], el atractivo te bloqueó en todas las redes. Ni con ring light te inventas un punto focal, gilipollas.',

      'Tu frame es contenido de risa ajena gratis, [nombre]. Mierda. Viral. La cámara frontal merece hazard pay, patético.',

      '[nombre], no es luz: es que no hay material que iluminar con dignidad. El atractivo te bloqueó sin forwarding, asco.',

      'Fea de veredicto que no admite recurso, [nombre]. Cabrón. Firme. Ni con ring light te inventas un punto focal, basura.',

      '[nombre], tienes cara de final de temporada cancelada. La cámara frontal merece hazard pay, ridículo.',

      'Se te nota el sótano visual en la primera foto de perfil, [nombre]. El atractivo te bloqueó sin forwarding, fracasado.',

      '[nombre], el filtro beauty se declara en huelga cuando te ve. Ni con ring light te inventas un punto focal, joder.',

      'Fea de las que el group chat prefiere stickers, [nombre]. Sin anestesia. La cámara frontal merece hazard pay, mierda.',

      '[nombre], si te hacen un retrato es por compromiso, no por deseo. El atractivo te bloqueó sin forwarding, coño.',

      'Tu simetría perdió el juicio y no pagó fianza, [nombre]. Mierda. Legal. Ni con ring light te inventas un punto focal, cabrón.',

      '[nombre], el high te mide yel número. La cámara frontal merece hazard pay, gilipollas, gilipollas Joder, qué nivel, patético.',

      'Fea sin barniz de \\\\\\\\\'carácter\\\\\\\\\': solo el informe, [nombre]. Cabrón. Seco. El atractivo te bloqueó sin forwarding, patético.',

      '[nombre], tienes el tipo de cara que hace odiar los selfies ajenos. Ni con ring light te inventas un punto focal, asco.',

      'La belleza objetiva no es opinión: y tú estás en el sótano, [nombre]. La cámara frontal merece hazard pay, basura.',

      '[nombre], ni con ring light de influencer te inventas un punto focal. El atractivo te bloqueó sin forwarding, ridículo.',

      'Fea de las que el fotógrafo finge que se le acabó la batería, [nombre]. Sin anestesia. Ni con ring light te inventas un punto focal, fracasado.',

      '[nombre], tu cara es un almost eterno que nunca llega a decente. La cámara frontal merece hazard pay, joder.',

      'No hay \\\\\\\\\'en persona se ve mejor\\\\\\\\\': hay la misma mierda. Con voz, [nombre]. El atractivo te bloqueó sin forwarding, mierda.',

      '[nombre], el ranking de fea te tiene de inquilino fijo. Ni con ring light te inventas un punto focal, coño.',

      'Fea de manual negro: sin misterio, sin estilo[nombre]. La cámara frontal merece hazard pay, cabrón. Hostia puta, qué nivel.',

      '[nombre], tienes más fallos faciales que un examen a última hora. El atractivo te bloqueó sin forwarding, gilipollas.',

      'El close-up es una denuncia anónima contra tu genética, [nombre]. Ni con ring light te inventas un punto focal, patético.',

      '[nombre], si el atractivo fuera crédito, tu score sería. La cámara frontal merece hazard pay, asco, asco.',

      'Fea de las que el espejo retrovisor se niega a colaborar, [nombre]. Sin anestesia. El atractivo te bloqueó sin forwarding, basura.',

      '[nombre], te ves como un borrador que nadie quiso terminar. Ni con ring light te inventas un punto focal, ridículo.',

      'La luz del atardecer te delata igual que el fluorescente del súper, [nombre]. La cámara frontal merece hazard pay, fracasado.',

      '[nombre], el high de fea te queda de tatuaje invisible. El atractivo te bloqueó sin forwarding, joder.',

      'Fea sin derecho a \\\\\\\\\'es el ángulo\\\\\\\\\': son todos, [nombre]. Ni con ring light te inventas un punto focal, mierda.',

      '[nombre], tienes el magnetismo inverso: la gente se aleja sin saber por qué. La cámara frontal merece hazard pay, coño.',

      'cabrón. El atractivo te bloqueó sin forwarding, cabrón Joder, qué nivel, gilipollas, joder. Hostia puta, qué nivel.',

      '[nombre], si te describieran en tres palabras sobrarían dos insultos. Ni con ring light te inventas un punto focal, gilipollas.',

      'Fea de las que el maquillaje es diplomacia fallida, [nombre]. Sin anestesia. La cámara frontal merece hazard pay, patético.',

      '[nombre], el bot te midió y el resultado no admite consuelo. El atractivo te bloqueó sin forwarding, asco.',

      'Tu cara es el gag visual del comando y nadie pide bis, [nombre]. Ni con ring light te inventas un punto focal, basura.',

      '[nombre], no hay segundo acto: el primero ya fue suficiente desastre. La cámara frontal merece hazard pay, ridículo.',

      'Fea de tramo que duele porque es verdad, [nombre]. Gilipollas. Documentado. El atractivo te bloqueó sin forwarding, fracasado.',

      '[nombre], tienes una geometría facial que ofende a Euclides. Ni con ring light te inventas un punto focal, joder.',

      'El atractivo te dio de baja y no dejó forwarding, [nombre]. Asco. Administrativo. La cámara frontal merece hazard pay, mierda.',

      '[nombre], si la belleza fuera propina, el camarero te ignoraría. El atractivo te bloqueó sin forwarding, coño.',

      'Fea de las que el selfie se queda en el carrete por vergüenza, [nombre]. Sin anestesia. Ni con ring light te inventas un punto focal, cabrón.',

      '[nombre], el high no es bullying: es el espejo con números. La cámara frontal merece hazard pay, gilipollas.',

      'Tu frame pide un testigo de Jehová y un indulto papal, [nombre]. El atractivo te bloqueó sin forwarding, patético.',

      '[nombre], se te nota la falta de suerte genética en cada pixel. Ni con ring light te inventas un punto focal, asco.',

      'Fea sin modo avión que oculte el diagnóstico, [nombre]. La cámara frontal merece hazard pay, basura, basura.',

      '[nombre], tienes el tipo de cara que hace amar los paisajes. El atractivo te bloqueó sin forwarding, ridículo.',

      'La cámara frontal merece hazard pay por trabajar contigo, [nombre]. Ni con ring light te inventas un punto focal, fracasado.',

      '[nombre], si te miran de reojo es para no comprometerse. La cámara frontal merece hazard pay, joder.',

      'Fea de las que el group photo tiene un hueco estratégico, [nombre]. Sin anestesia. El atractivo te bloqueó sin forwarding, mierda.',

      '[nombre], el material óseo y el de tejidos firmaron el mismo fail. Ni con ring light te inventas un punto focal, coño.',

      'No eres un \\\\\\\\\'rostro con carácter\\\\\\\\\': eres un rostrosin suerte, [nombre]. La cámara frontal merece hazard pay, cabrón.',

      '[nombre], el ranking te tiene de ejemplo cuando explica el sótano. El atractivo te bloqueó sin forwarding, gilipollas.',

      'Fea de veredicto público y sin narrador emocional, [nombre]. Ni con ring light te inventas un punto focal, patético.',

      '[nombre], tienes más asimetría que un debate en este puto chat. La cámara frontal merece hazard pay, asco.',

      'Se te ve el techo visual y está bajo, [nombre]. Asco. De altura. El atractivo te bloqueó sin forwarding, basura.',

      '[nombre], si el atractivo fuera examen, irías a septiembre. Ni con ring light te inventas un punto focal, ridículo.',

      'Fea de las que el filtro se rinde y apaga la pantalla, [nombre]. Sin anestesia. La cámara frontal merece hazard pay, fracasado.',

      '[nombre], tu cara es un almost de humano decente. El atractivo te bloqueó sin forwarding, joder. Hostia puta, qué nivel.',

      'El high de fea te nombra sin pedir permiso al ego, [nombre]. Ni con ring light te inventas un punto focal, mierda.',

      '[nombre], no hay redención en un ángulo ni en un tutorial. La cámara frontal merece hazard pay, coño.',

      'Fea de manual: el bot firma y el chat archiva, [nombre]. El atractivo te bloqueó sin forwarding, cabrón.',

      '[nombre], tienes el glow de un aparcamiento a las tres de la mañana. Ni con ring light te inventas un punto focal, gilipollas.',

      'La belleza objetiva pasó de largo y no dejó recado, [nombre]. La cámara frontal merece hazard pay, patético.',

      '[nombre], si te hacen un cumplido es por pena o por agenda. El atractivo te bloqueó sin forwarding, asco.',

      'Fea de las que el espejo del gym tiene restricción de horario, [nombre]. Sin anestesia. Ni con ring light te inventas un punto focal, basura.',

      '[nombre], el sótano visual te queda de residencia fiscal. La cámara frontal merece hazard pay, ridículo.',

      'Tu presencia baja el promedio del frame en un mensaje, [nombre]. El atractivo te bloqueó sin forwarding, fracasado.',

      '[nombre], no hay misterio de fealdad cool: hay lo previsible. Ni con ring light te inventas un punto focal, joder.',

      'Fea de tramo alto y sin derecho a bis, [nombre]. Gilipollas. Del ranking. La cámara frontal merece hazard pay, mierda.',

      '[nombre], tienes cara de final boss de la mala suerte genética. El atractivo te bloqueó sin forwarding, coño.',

      'Se te nota el fail hasta en la sombra del perfil, [nombre]. Ni con ring light te inventas un punto focal, cabrón.',

      '[nombre], si la genética fuera un juicio oral, no tendrías defensa. La cámara frontal merece hazard pay, gilipollas.',

      'Fea de las que el maquillador finge dolor de cabeza, [nombre]. Sin anestesia. El atractivo te bloqueó sin forwarding, patético.',

      '[nombre], el atractivo te bloqueó y te dejó en visto eterno. Ni con ring light te inventas un punto focal, asco.',

      'Tu frame es el gag del día. y el grupo no pide replay, [nombre]. La cámara frontal merece hazard pay, basura.',

      '[nombre], el high te mide con regla y te deja en negativo. El atractivo te bloqueó sin forwarding, ridículo.',

      'Fea sin consuelo de \\\\\\\\\'personalidad\\\\\\\\\': el comando no mide eso, [nombre]. Ni con ring light te inventas un punto focal, fracasado.',

      '[nombre], tienes más problemas de proporciones que un plano de arquitecto borracho. La cámara frontal merece hazard pay, joder.',

      'La luz del flash te trata como evidencia del crimen, [nombre]. El atractivo te bloqueó sin forwarding, mierda.',

      '[nombre], si te describen \\\\\\\\\'interesante\\\\\\\\\' es código de fea educada. Ni con ring light te inventas un punto focal, coño.',

      'Fea de las que el selfie stick se acorta solo, [nombre]. Sin anestesia. La cámara frontal merece hazard pay, cabrón.',

      '[nombre], el material de base no admite segunda oportunidad. El atractivo te bloqueó sin forwarding, gilipollas.',

      'Tu cara es un informe sin anexos de caridad, [nombre]. Ni con ring light te inventas un punto focal, patético.',

      '[nombre], se te ve el sótano desde la notificación. La cámara frontal merece hazard pay, asco, asco Joder, qué nivel, basura.',

      'Fea de veredicto que el chat confirma en silencio, [nombre]. El atractivo te bloqueó sin forwarding, basura.',

      '[nombre], tienes el tipo de presencia que hace amar el paisaje urbano. Ni con ring light te inventas un punto focal, ridículo.',

      'El ranking de fea te tiene de inquilino sin contrato, [nombre]. La cámara frontal merece hazard pay, fracasado.',

      '[nombre], si el atractivo fuera crédito, estarías en mora. El atractivo te bloqueó sin forwarding, joder.',

      'Fea de las que el filtro beauty pide apoyo técnico, [nombre]. Sin anestesia. Ni con ring light te inventas un punto focal, mierda.',

      '[nombre], no hay ángulo: hay rendición documentada. La cámara frontal merece hazard pay, coño. Joder, qué nivel, cabrón.',

      'Tu simetría perdió el norte y el sur, [nombre]. El atractivo te bloqueó sin forwarding, cabrón. Hostia puta, qué nivel.',

      '[nombre], el high de fea te queda de apodo no oficial. Ni con ring light te inventas un punto focal, gilipollas.',

      'Fea sin plot twist de redención en tres mensajes, [nombre]. La cámara frontal merece hazard pay, patético.',

      '[nombre], tienes cara de borrador olvidado en la papelera. El atractivo te bloqueó sin forwarding, asco.',

      'Se te nota la falta de suerte en cada puto pixel del estado, [nombre]. Ni con ring light te inventas un punto focal, basura.',

      '[nombre], si te miran fijo es porque no procesan el input. La cámara frontal merece hazard pay, ridículo.',

      'Fea de las que el group chat prefiere audio a foto, [nombre]. Sin anestesia. El atractivo te bloqueó sin forwarding, fracasado.',

      '[nombre], el bot te midió dos veces y las dos dio sótano. Ni con ring light te inventas un punto focal, joder.',

      'Tu frame pide un testigo y un abogado de oficio, [nombre]. La cámara frontal merece hazard pay, mierda.',

      '[nombre], el atractivo te dio de baja sin carta de despido. El atractivo te bloqueó sin forwarding, coño.',

      'Fea de manual negro y sin anestesia, [nombre]. Gilipollas. Del comando. Ni con ring light te inventas un punto focal, cabrón.',

      '[nombre], tienes más fallos faciales que un DNI mal escaneado. La cámara frontal merece hazard pay, gilipollas.',

      'La belleza objetiva no es debate: y tú perdiste, [nombre]. El atractivo te bloqueó sin forwarding, patético.',

      '[nombre], si el high de fea fuera un piso, vivirías en el -2 Ni con ring light te inventas un punto focal, asco.',

      'Fea de las que el espejo del baño tiene horario de duelo, [nombre]. Sin anestesia. La cámara frontal merece hazard pay, basura.',

      '[nombre], te ves como un almost que se quedó en almost. El atractivo te bloqueó sin forwarding, ridículo.',

      'El close-up es una denuncia con firma digital, [nombre]. Ni con ring light te inventas un punto focal, fracasado.',

      '[nombre], se te ve el techo y está por los suelos. La cámara frontal merece hazard pay, joder. Hostia puta, qué nivel.',

      'Fea de tramo que no admite narrador emocional, [nombre]. El atractivo te bloqueó sin forwarding, mierda.',

      '[nombre], tienes el magnetismo de una silla mojada en la terraza. Ni con ring light te inventas un punto focal, coño.',

      'El ranking te nombra y el chat no apela, [nombre]. Asco. Firmado. La cámara frontal merece hazard pay, cabrón.',

      '[nombre], si te hacen un retrato es por relleno de álbum. El atractivo te bloqueó sin forwarding, gilipollas.',

      'Fea de las que el maquillaje es daño colateral permanente, [nombre]. Sin anestesia. Ni con ring light te inventas un punto focal, patético.',

      '[nombre], el material óseo firmó el mismo contrato de fail que la piel. La cámara frontal merece hazard pay, asco.',

      'Tu cara es el gag visual y nadie pide bis, [nombre]. El atractivo te bloqueó sin forwarding, basura, basura.',

      '[nombre], el high te deja en el sótano sin ascensor. Ni con ring light te inventas un punto focal, ridículo.',

      'Fea sin derecho a \\\\\\\\\'es el día\\\\\\\\\': es el material, [nombre]. La cámara frontal merece hazard pay, fracasado.',

      '[nombre], tienes una geometría que ofende al compás. El atractivo te bloqueó sin forwarding, joder. Hostia puta, qué nivel.',

      'Se te nota el fail visual en la primera línea del mensaje, [nombre]. Ni con ring light te inventas un punto focal, basura.',

      '[nombre], si la belleza fuera wifi, tú serías el router muerto. La cámara frontal merece hazard pay, qué cutre.',

      'Fea de veredicto público delante de todo el puto grupo, [nombre]. Sin anestesia. El atractivo te bloqueó sin forwarding, da pena ajena.',

      '[nombre], el atractivo te vio y cambió de acera digital. Ni con ring light te inventas un punto focal, qué vacío.',

      'Tu frame es contenido de risa ajena sin copyright, [nombre]. La cámara frontal merece hazard pay, patético.',

      '[nombre], no hay segundo chance: el primero ya fue bastante. El atractivo te bloqueó sin forwarding, asco, qué vergüenza ajena.',

      'Fea de las que el filtro se suicida al intentar ayudarte, [nombre]. Ni con ring light te inventas un punto focal, basura.',

      '[nombre], tienes el glow up invertido certificado por el ranking. La cámara frontal merece hazard pay, ridículo.',

      'La luz natural te delata igual que un interrogatorio, [nombre]. El atractivo te bloqueó sin forwarding, fracasado.',

      '[nombre], si te describen en una palabra, esa palabra insulta. Ni con ring light te inventas un punto focal, qué pena.',

      'Fea de tramo alto: el bot firma y cierra el parte, [nombre]. Sin anestesia. La cámara frontal merece hazard pay, patético.',

      '[nombre], el sótano visual te queda de casa y de apodo. El atractivo te bloqueó sin forwarding, coño.',

      'Tu presencia baja el promedio del chat solo con existir, [nombre]. Ni con ring light te inventas un punto focal, qué cringe.',

      '[nombre], el high de fea no es opinión: es el puto número. La cámara frontal merece hazard pay, da asco.',

      'Fea sin consuelo, sin bis y sin narrador que te salve, [nombre]. El atractivo te bloqueó sin forwarding, patético.',

      'Se te ve el diagnóstico desde la puta notificación, [nombre]. Ni con ring light te inventas un punto focal, asco, ridículo.',

      '[nombre], tienes una cara que hace que el flash de la cámara se arrepienta de haber disparado, fracasado.',

    ],
    mid: [
      'Tienes un rasgo bueno rodeado de rasgos normales. Ese rasgo está haciendo un esfuerzo enorme, dale las gracias.',

      'Media pura. Estadísticamente eres exactamente lo que sale al promediar el grupo entero, para bien y para mal.',

      'Tienes arreglo pero no lo estas usando. Dormir bien y beber agua te subiria un escalón sin gastar un euro.',

      'Estás en la media donde la actitud lo decide todo. Sin actitud te quedas exactamente donde estas ahora.',

      'Feilla del monton. Con buena luz te salvas, con mala te hundes, y la vida tiene mala luz casi siempre.',

      'Regular con días buenos. Los días buenos son pocos y encima nunca coinciden con las fotos importantes.',

      'Media exacta tirando a floja. Un rasgo mejor y subirias, uno peor y bajarias. Estás justo en el filo.',

      'Feilla con potencial. Hay estructura debajo, lo que falta es todo lo demas: descanso, piel y postura.',

      'La media del grupo, con margen de mejora que llevas años sin tocar. Ahí está el verdadero problema en el único idioma que entiende el contador.',

      'Ni para arriba ni para abajo. La cara más neutral posible, que en un grupo así es casi una ventaja. Delante del marcador en vivo.',

      'Tu cara mejora bastante arreglada y baja bastante sin arreglar. Ese margen es lo que te deja aquí sin prórroga ni VAR.',

      'Estás justo donde la ropa importa más que la cara. Aprovechalo, porque la cara no va a ayudarte sin descuento por empatía.',

      'Ni fea ni guapa. Estás en esa tierra de nadie donde nadie te insulta y nadie te mira dos veces en el recuento que no perdona.',

      'No eres fea, eres olvidable. Y sinceramente, no se cual de las dos cosas es peor a largo plazo y el archivo queda cerrado.',

      'Fea según quien mire. Hay gente que te defiende y gente que calla, y el silencio dice bastante con el cargo en firme.',

      'Tu estructura está bien y la proporción falla un poco. O lo contrario. Depende de dónde mires sin que nadie pida replay.',

      'Tu cara funciona en algunos ángulos y falla en otros. La media queda exactamente en el medio con el parte firmado debajo.',

      'Ni la mejor ni la peor. Estás en el centro estadístico, que no es ni un halago ni un insulto y el archivo no admite recurso.',

      'Ni te miran ni apartan la vista. Estás en la franja donde la cara simplemente no es el tema con la cara del resultado a la vista.',

      'Ni te salva ni te hunde la cara. Vas a tener que ganar por otro lado, y eso ya es un aviso en alta resolución de group chat.',

      'Tienes lo suficiente para no ser señalada y nunca lo bastante para que alguien lo comente y el archivo queda cerrado.',

      'Ni guapa ni fea. Un intermedio que en fotos sale correcto y en persona pasa desapercibida con el dígito como única defensa.',

      'Fea a ratos. Hay días que pasas y días que no, y no controlas cual te toca al levantarte sin cuento que lo tape.',

      'Ni te favorece la cámara ni te perjudica. Sales exactamente como eres, que es del montón y el sistema no regala puntos.',

      'Del monton bajo. Ni escandalo ni elogio: la gente pasa de largo y esa es toda la reseña con el resultado ya consumado.',

      'Feilla estable. Sin sobresaltos, sin sorpresas y sin ningún motivo para mirar dos veces con el eco todavía en el grupo.',

      'Tienes potencial sin explotar en algunos rasgos y límites claros en otros. Se compensan sin letra pequeña que lo salve.',

      'Ni destacas ni desentonas. Un promedio limpio que en fotos sale bien y en persona pasa. Delante del ranking y de la cara.',

      'Tienes un rasgo bueno y el resto correcto. Con un rasgo no se sostiene una cara entera en el segundo más incómodo del chat.',

      'Tu cara depende mucho del peinado y de la luz. Con las dos bien subes; sin ellas bajas delante de la evidencia del contador.',

      'Ni arriba ni abajo. Una cara del montón que cumple sin destacar en absolutamente nada sin bis ni matiz de consuelo.',

      'Ni guapa ni fea. Tienes una cara correcta que no molesta y tampoco llama la atención y. El veredicto no se negocia.',

      'Ni memorable ni olvidable del todo. Un punto medio bastante común y bastante estable con el cargo en firme.',

      'Tu cara está bien de frente y regular de perfil. O al revés, según a quién preguntes con el saldo a la intemperie, qué miseria.',

      'Ni te dan ventaja ni te ponen impedimentos. La cara no juega ni a favor ni en contra sin modo avión ni silencio cómplice, da grima.',

      'Tienes lo suficiente para gustar a quien te conoce y nada para gustar a quien te ve sin anestesia de verdad esta vez, qué nivel de pena.',

      'Feilla correcta. Suena raro y es exacto: nada llama la atención, tampoco para bien y el archivo queda cerrado, basura.',

      'Tienes buenos rasgos sueltos que no acaban de funcionar juntos. Ahí se pierde todo y el sistema cierra sin discusión, qué cutre.',

      'Ni guapa de las que se recuerdan ni fea de las que se comentan. En el medio exacto sin prórroga ni VAR, da pena ajena.',

      'Ni llamativa ni discreta. Un intermedio que funciona sin generar ninguna reacción en el segundo más incómodo del chat, qué vacío.',

      'Ni guapa ni fea, solo cansada. La mitad de tu puntuación es sueño que no duermes sin segunda oportunidad hoy, indignante.',

      'Ni fea ni guapa: normal. Y normal es exactamente lo que suena, ni más ni menos con el eco todavía en el grupo, qué vergüenza ajena.',

      'Tu cara es exactamente lo que se espera de una cara. Ni sorpresa buena ni mala y el sistema cierra sin discusión, da vergüenza.',

      'Tu estructura ósea es correcta sin ser buena. Y eso te deja justo donde estás sin segunda lectura que lo arregle, qué flojo.',

      'Ni fea ni atractiva. Un correcto sostenido que no genera ninguna conversación con el dígito como única defensa, menudo desastre.',

      'Tienes rasgos que funcionan por separado y un conjunto que se queda a medias y. El veredicto no se negocia, qué pena.',

      'Ni destacas para bien ni para mal. La franja más anónima que existe en esto sin segunda lectura que lo arregle, patético.',

      'Tienes lo justo para pasar cualquier filtro social y nada para pasar de ahí. Delante del ranking y de la cara, miserable.',

      'Ni fea ni memorable. Un correcto que no da problemas y tampoco ventajas. Sin filtro de autoayuda y el resto es ruido de fondo, qué cringe.',

      'Tienes proporciones aceptables sin nada que las eleve. Correcto y punto sin bis ni matiz de consuelo, da asco.',

    ],
    low: [
      'Cero de cero. Provocas ese silencio de cuando alguien entra y nadie sabe donde mirar. En el buen sentido.',

      'Fealdad no encontrada. El comando devuelve vacio. Y el grupo entero lo sabía antes de que lo escribieras.',

      'Cero de fealdad. Ganaste la genética y encima te presentas al comando a que te lo confirmen. Descarada.',

      'Fea cero. Podrías no hacer nada por ti misma nunca y seguirias por encima de la media entera del grupo.',

      'Ni un punto. Estructura buena, piel buena, proporciones buenas. Aburrido de leer y molesto de aceptar.',

      'Sin un punto de fealdad. Otros llevan años de rutina para acercarse a lo que tú tienes sin pensarlo.',

      'Ninguno. Tu cara aguanta ángulos, luces y cámaras de mierda. Eso es estructura de verdad delante de quien aún leía el hilo.',

      'Fealdad ausente. Podrías salir en cualquier foto sin avisar y seguir siendo la mejor del encuadre y el contador no discute.',

      'Nada que reportar. Simetría, armonía y estructura. Los tres, a la vez, en la misma cara. Injusto y el resto es ruido de fondo.',

      'Nada. Cara armónica, sin un solo rasgo fuera de sitio. El resultado más soso posible y el mejor y. El ranking cierra el caso.',

      'Cero. Tienes canthal tilt positivo, mandíbula definida y proyección malar real. Todo de fábrica sin descuento por empatía.',

      'Sin fealdad detectable. Ni con lupa, ni con mala luz, ni con la peor foto que tengas guardada y. El ranking no pide permiso.',

      'Nada de nada. Belleza que no depende de moda ni de edad. Dentro de veinte años seguiras igual con el grupo de testigo silencioso.',

      'Limpio. Tu tercio medio es compacto y el inferior está bien proyectado. Estructura de manual sin segunda lectura que lo arregle.',

      'Sin rastro. Tienes armonía facial de verdad: nada destaca por separado y todo funciona junto con. El chat enterado del cargo.',

      'Cero. Tienes canthal tilt positivo, buen tercio medio y todo cuadrando. La loteria completa con testigos obligados en el hilo.',

      'Sin rastro. Tu cara funciona sin maquillaje, que es donde se separa lo real de lo trabajado y el hilo no pide amplificación.',

      'Cero puntos. Escribiste el comando sabiendo el resultado y aun así querías verlo. Se te ve sin cuento que lo tape.',

      'Cero por ciento. Simetría buena, tercios equilibrados y rasgos que se llevan bien entre sí y el hilo no pide amplificación.',

      'Fea cero. Sales bien hasta recien despertada, que es el único examen que cuenta de verdad y el contador insiste.',

      'Nada. Tienes contraste entre rasgos: cada uno tiene su peso y ninguno se come a los demás. Y el grupo ya pasó de página.',

      'Ningún punto. Y lo peor es que ni te esfuerzas: eso es lo que de verdad molesta al resto sin suavizar el golpe del número.',

      'Fealdad inexistente. El bot ha rebuscado en cada rasgo y ha vuelto con las manos vacías con el eco del almost todavía sonando.',

      'Nada. Tu cara aguanta cualquier ángulo y cualquier luz sin necesitar producción ninguna y. El ranking cierra el caso.',

      'Sin material. Tienes hueso bueno, piel buena y proporciones que cuadran. Las tres cosas delante de quien no quería verlo.',

      'Cero por ciento. Sales igual de bien recién despertada que producida. Ese es el examen con el fail todavía caliente.',

      'Limpio. Tu cara provoca ese silencio de medio segundo que no se compra ni se maquilla y no hay modo de suavizarlo.',

      'Cero. Tienes estructura, proporción y armonía. Las tres a la vez, que es lo difícil sin bis ni matiz de consuelo.',

      'Limpio del todo. La gente te recuerda sin haber hablado contigo. Eso es estructura con el dígito como única defensa.',

      'Limpio. Tienes definición en todo el contorno facial. No hay un solo borde perdido en alta resolución de group chat.',

      'Nada de nada. Tienes lo que la gente paga miles por fingir y a ti te vino de serie con el saldo a la intemperie.',

      'Nada por aquí. Sales bien en foto, en vídeo y en persona. Las tres, sin excepción en el único marcador que importa aquí.',

      'Cero. Tu cara no depende del pelo ni de la ropa. Funciona sola y funciona siempre sin modo avión ni silencio cómplice, qué vergüenza.',

      'Cero. Aquí no hay absolutamente nada que rascar, y no será porque no hayan mirado con. El chat enterado del cargo, ridículo.',

      'Limpio del todo. Tu estructura hace el trabajo sola y tú ni tienes que colaborar delante de quien aún leía el hilo, fracasado.',

      'Limpio. Tienes soporte óseo de verdad, y eso es lo único que no se puede fingir con. El chat enterado del cargo, qué miseria.',

      'Cero por ciento. Simetría, proyección y proporción. Las tres, en el nivel bueno con. El veredicto seco del bot, da grima.',

      'Nada. Tu mirada tiene marco, forma e intensidad. Eso solo lo da la estructura y el archivo queda cerrado, qué nivel de pena.',

      'Nada. Tienes el rasgo raro que convierte una cara guapa en una cara memorable. Delante del listón que no saltaste, basura.',

      'Cero por ciento. Tienes el tipo de cara que se estudia, no la que se comenta con el dígito como única defensa, qué cutre.',

      'Sin material. Proporciones áureas, contraste alto y cero rasgos desalineados sin que nadie pida replay, da pena ajena.',

      'Cero absoluto. Eres de las que hacen que este comando pierda toda la gracia. Y el grupo ya pasó de página, qué vacío.',

      'Cero por ciento. Nada te sobra y nada te falta. Esa proporción es lo escaso con el fail todavía caliente, indignante.',

      'Cero. Tu perfil aguanta igual que tu frontal, y eso ya elimina a la mayoría. Sin derecho a matiz útil, qué vergüenza ajena.',

      'Fea cero. No hay nada que atacar aquí y creeme que se ha buscado con ganas con testigos obligados en el hilo, da vergüenza.',

      'Cero. Ni un ángulo malo. Ni uno, y eso es objetivamente muy poco frecuente y el archivo no admite recurso, qué flojo.',

      'Nada de nada. Ninguna foto tuya necesita ángulo concreto. Todos funcionan sin cuento que lo tape y el hilo sigue sin ti en el centro, menudo desastre.',

      'Cero por ciento. La cámara te favorece porque hay material que favorecer con el dígito como única defensa, qué pena.',

      'Cero. Este comando no está hecho para ti. Y el grupo ya lo sospechaba sin apelación posible hoy delante de todo el que miraba, patético.',

      'Sin rastro. Tu cara aguanta el zoom, que es donde casi todas se caen y el sistema cierra sin discusión, miserable.',

    ],
  },

  sexy: {
    name: 'sexy',
    goodIsHigh: true,
    high: [
      'Entras a un sitio y hay personas que pierden el hilo de lo que estaban diciendo. Eso no pasa por accidente.',

      'Tienes el tipo de cara que funciona sin maquillaje, sin arreglo y sin que tengas que estar en tu mejor día.',

      'Tienes el tipo de cara que los artistas copian y la gente recuerda años después sin haber hablado contigo.',

      'La simetría que tienes se estudia y se ve poco. Tú la llevas de serie sin haber hecho nada para merecerla.',

      'Tienes el tipo de físico que hace que la gente recuerde exactamente qué llevabas cuando os conocisteis.',

      'Tu atractivo no depende de la luz, de la ropa ni del ángulo. Está ahí siempre, y eso es lo más escaso.',

      'Tienes una cara que la gente no puede dejar de mirar aunque no quiera. Eso no es suerte, es biología.',

      'Tu físico genera reacciones involuntarias en quien te ve. No tienes que hacer nada para conseguirlo.',

      'Hay un magnetismo en ti que no depende de lo que digas ni de lo que hagas. Está antes de todo eso. Delante del ranking y de la cara.',

      'Tu atractivo no necesita esfuerzo, contexto ni ocasión especial. Funciona en cualquier condición sin apelación posible hoy.',

      'Tu físico es el tipo de cosa que la gente describe con un silencio antes de encontrar la palabra y. El ranking lo deja por escrito.',

      'La luz te quiere desde cualquier ángulo, y eso solo lo tiene un porcentaje minúsculo de personas sin modo avión ni silencio cómplice.',

      'La gente te mira y luego mira a sus parejas con una pregunta silenciosa que no van a verbalizar en el único idioma que entiende el contador.',

      'Eres exactamente el tipo de persona que arruina el día de alguien con solo cruzarse en la calle con testigos obligados en el hilo.',

      'La genética invirtió en ti de forma seria. Y se nota sin que tengas que hacer absolutamente nada con el fail todavía caliente.',

      'Eres exactamente el tipo de persona que arruina relaciones estables con solo aparecer en escena. Delante del público que no pidió entrada.',

      'No es la cara ni el cuerpo: es la seguridad con la que te mueves. Eso multiplica todo lo demás con el número en la frente del mensaje.',

      'Eres exactamente la referencia que la gente tiene en la cabeza cuando piensa en alguien guapo sin descuento por empatía.',

      'Tienes atractivo del que no necesita producción. Con producción sube, sin ella funciona igual sin suavizar el golpe del número.',

      'Tienes proporción física y proporción de gesto. Las dos cosas alineadas en la misma dirección y el archivo no admite recurso.',

      'Te miran en el metro, en la cola, en el ascensor, y luego apartan la vista cuando los pillas sin prosa que lo maquille.',

      'La proporción que tienes es la que los demás intentan conseguir con dieta, gimnasio y suerte delante de todo el que miraba.',

      'Tienes lo que otros buscan en cirugías y tratamientos durante años sin llegar a conseguirlo y basta el dato del ranking.',

      'La gente te describe a terceros y se queda corta. En persona siempre superas la descripción. Delante del público que no pidió entrada.',

      'Tienes la mezcla de físico y carácter, y el carácter es siempre el que multiplica de verdad sin segunda oportunidad hoy.',

      'Tu cara tiene esa estructura que no se puede entrenar ni comprar. O se tiene o no se tiene y el resto es ruido de fondo.',

      'Hay un motivo por el que la gente te mira dos veces. No es casualidad ni es tu imaginación delante de quien aún leía el hilo.',

      'Tienes ese punto de dominio tranquilo que resulta más atractivo que cualquier rasgo físico y basta el dato del ranking.',

      'Tu forma de moverte es segura sin ser forzada. Ese equilibrio es difícilísimo de encontrar sin consuelo de manual barato.',

      'No compites por atención y aun así te la llevas entera. Esa ironía es exactamente el punto sin apelación posible hoy.',

      'Tu presencia física y tu manera de estar van en la misma dirección. Eso lo multiplica todo. Delante del ranking y de la cara.',

      'Tienes una estructura facial que las cámaras adoran desde cualquier ángulo que les pongas sin consuelo de manual barato, qué cringe.',

      'Tienes la clase de cara que la gente describe a sus amigos para explicar qué es atractivo sin maquillaje ni segunda toma, da asco.',

      'Tienes el atractivo de quien está cómodo consigo mismo. Y eso es lo más difícil de fingir con el dígito firmando solo, qué vergüenza.',

      'No hace falta que hagas nada para que se note. Y esa es exactamente la definición de esto y el hilo sigue sin ti en el centro, ridículo.',

      'Tienes presencia de las que se echan de menos cuando no están. El mejor indicador que hay con el cargo en firme, fracasado.',

      'Tienes proporción, actitud y algo más que nadie sabe nombrar. Eso último es lo importante con el número hablando solo, qué miseria.',

      'Tienes ese magnetismo tranquilo que resulta mucho más eficaz que cualquier intento activo en el momento que más dolía soltarlo, da grima.',

      'Tu manera de estar hace que quien te tiene delante pierda un poco el hilo. Y no lo buscas en la foto fija del ranking, qué nivel de pena.',

      'Tienes atractivo estructural y actitudinal. Las dos capas, y las dos funcionando a la vez y no hay DLC que lo parchee, basura.',

      'Tu presencia física tiene autoridad. Y la autoridad física es de las cosas más atractivas en el único idioma que entiende el contador, qué cutre.',

      'Tu presencia genera algo que la gente no sabe nombrar y que todos identifican al instante. Sin filtro de autoayuda, da pena ajena.',

      'Tienes atractivo que funciona en cualquier registro: arreglado, normal o recién levantado sin letra pequeña que lo salve, qué vacío.',

      'Tu forma de moverte tiene ritmo y seguridad. Las dos cosas y sin ningún esfuerzo aparente sin consuelo de manual barato, indignante.',

      'Tienes el tipo de presencia física que hace que la gente se ponga recta sin darse cuenta con el saldo a la intemperie, qué vergüenza ajena.',

      'Tienes ese punto de indiferencia que resulta atractivo precisamente porque no es actuado en el momento que más dolía soltarlo, da vergüenza.',

      'La gente que te conoce te describe mal porque no encuentra las palabras. Eso ya es señal y el historial no olvida, qué flojo.',

      'Tienes esa manera de moverte que hace que la gente se quede mirando medio segundo de más sin maquillaje ni segunda toma, menudo desastre.',

      'Tienes atractivo de los que no dependen de la sonrisa. Funcionas serio y funcionas igual y el hilo sigue sin ti en el centro, qué pena.',

      'Tienes la seguridad de moverte sin comprobar cómo te ven. Eso ya es la mitad del trabajo y el contador no discute, patético.',

    ],
    mid: [
      'Ni silencio de gesta ni de vergüenza: silencio de scroll al siguiente tema, [nombre]. Gilipollas. Nivel sótano documentado.',

      'El flash de atracción ya no ilusiona a nadie: se conoce el apagón de antemano siempre. Gilipollas. Hostia puta, qué nivel.',

      'El ranking promedia tu zigzag y te deja aquí sin mudanza cercana posible en el mapa. Gilipollas. El ranking no miente.',

      'No cierras de forma memorable: ni para el álbum ni para el meme del grupo, [nombre]. Gilipollas. Hostia puta, qué nivel.',

      'Luz dudosa de neón de atracción a punto de fundirse sin repuesto en el almacén. Gilipollas. El chat ya lo archivó.',

      'Espera de versión del día: el grupo no sabe qué build de sexy va a cargar hoy. Gilipollas. Hostia puta, qué nivel.',

      'No hay hilo que abrir sobre tu sexy: la ausencia de hilo es el dato más claro. Gilipollas. Hostia puta, qué nivel.',

      'Sin portada al acabar la temporada de sexy: archivo gris y siguiente comando. Gilipollas. Hostia puta, qué nivel.',

      'Silencio de grada sin olé ni abucheo: respiración normal y nada más que eso. Gilipollas. El bot no regala décimas.',

      'El bot te debe este medio: no un high de cartón ni un low de teatro barato. Gilipollas. Hostia puta, qué nivel.',

      'Picos cortos que no mueven la media de tu atracción en. El ranking del chat, [nombre]. Desperdicio. Nivel sótano documentado.desperdicio.',

      'No hay firma estable de deseo: hay intentos y los intentos se notan a la legua, [nombre]. Patético. Hostia puta, qué nivel.',

      'El medio te queda por estadística: no por castigo ni por premio de nadie en. El bot. Desperdicio. El ranking no miente.desperdicio.',

      'El grupo no apuesta fuerte a tu sexy: apuesta al medio y acierta siempre, [nombre]. Desperdicio., desperdicio.',

      'Limbo con wifi entre atractivo y nada: conexión intermitente sin estabilidad real. Desperdicio. El chat ya lo archivó.desperdicio.',

      'Hay momentos en que el ángulo ayuda y momentos en que el material no da para más, [nombre]. Cabrón. Hostia puta, qué nivel.',

      'Medallero corto y sin brillo de atracción: ni vacío dramático ni lleno orgulloso, [nombre]. Basura. Hostia puta, qué nivel.',

      'A medias es tu tramo natural y el número te lo confirma sin anestesia ni regalo, [nombre]. Cabrón. Hostia puta, qué nivel.',

      'Zigzag esperado y cumplido: la expectativa media se cumple sin sorpresa posible. Desperdicio. El bot no regala décimas.desperdicio.',

      'Spoiler de tibieza permanente: nadie se sorprende del resultado medio del tramo, [nombre]. Cabrón. Hostia puta, qué nivel.',

      'Ni estable en el deseo ni estable en el vacío: inestable en las dos direcciones a la vez. Mierda. Nivel sótano documentado.',

      'A ratos el silencio de interés y a ratos el ruido de no saber qué hacer con la presencia. Basura. Hostia puta, qué nivel.',

      'Pila de borradores de pose sin versión final que firmar ni publicar en el grupo, [nombre]. Gilipollas.',

      'Cumples la expectativa media: el grupo no espera milagros ni catástrofes de ti. Desperdicio., desperdicio.',

      'Continuidad de fondo sin picos: ambient del ranking de atracción del grupo, [nombre]. Patético. El chat ya lo archivó.',

      'Sexy de interruptor con mal contacto: parpadea y nadie sabe si queda corriente de verdad. Gilipollas.',

      'Sexy de menú del día: a veces hay plato y a veces solo pan sin ganas de pedir más, [nombre]. Asco. Hostia puta, qué nivel.',

      'Salva el rato y pierde el día de atracción: prioridades raras y resultados tibios, [nombre]. Coño. Hostia puta, qué nivel.',

      'Picos que no mueven. El ranking: subes un segundo y vuelves al medio sin ruido. Desperdicio. El bot no regala décimas.desperdicio.',

      'El medio no pide aplausos: pide el número y el número es este sin adornos, [nombre]. Patético. Hostia puta, qué nivel.',

      'Estás en el tramo que no emociona: constata y sigue como el resto del ranking, [nombre]. Mierda. Nivel sótano documentado.',

      'No ser noticia es tu forma de estar: el silencio de centro es tu marca registrada, [nombre]. Asco. Hostia puta, qué nivel.',

      'Sexy de ensayo general: nunca estreno del todo y el público del grupo ya lo intuye. Ridículo. El ranking no miente.',

      'El grupo está en espera de qué versión de sexy carga hoy en tu perfil del día, [nombre]. Gilipollas.',

      'Cliente ocasional del deseo sin puntos de fidelidad ni programa de socios del chat. Patético. El chat ya lo archivó.',

      'Tu sexy en silencio con mensajes raros: chat casi muerto y algún ping suelto, [nombre]. Mierda. Hostia puta, qué nivel.',

      'Temblor sin etiqueta clara: ni fiebre de deseo ni normalidad clara en el tramo, [nombre]. Joder. Hostia puta, qué nivel.',

      'Sin leyenda ni maldición de sexy: solo la continuidad gris del promedio del chat, [nombre]. Coño. Hostia puta, qué nivel.',

      'Ni miedo ni pena: estás en la lista y la lista no te destaca nunca, [nombre]. Desperdicio. El bot no regala décimas.desperdicio.',

      'Tu presencia sexual es un wifi de centro comercial: se conecta a ratos y se cae igual. Basura. Hostia puta, qué nivel.',

      'Andamio visible de la pose: se ve la obra y falta la fachada terminada del todo, [nombre]. Asco. Nivel sótano documentado.',

      'Manos y mirada que no saben qué hacer a ratos: el vacío se nota en el gesto, [nombre]. Basura. Hostia puta, qué nivel.',

      'El único sitio sin mentir el relato: el medio es lo único que no es ficción. Desperdicio. El ranking no miente.desperdicio.',

      'Ni generas deseo claro ni rechazo interesante: el medio pelo de la atracción medible. Mierda. Hostia puta, qué nivel.',

      'Sexy con luz piloto: se ve que hay algo pero no se sabe cuánto ni de qué calidad. Ridículo. El chat ya lo archivó.',

      'Una frase de atracción y vuelta al bloque de tibieza como si nada hubiera pasado. Patético. Hostia puta, qué nivel.',

      'Depende como sentencia de tu atracción: el veredicto es el depende y punto final. Patético. Hostia puta, qué nivel.',

      'Sin material para fanatismo ni desprecio: material para el siguiente mensaje, [nombre]. Joder. Hostia puta, qué nivel.',

      'El magnetismo no ha firmado indefinido contigo: es temporal y sin renovación automática. Asco. El bot no regala décimas.',

      'El depende es. El veredicto de tu atracción y no hay apelación al número del bot. Patético. Hostia puta, qué nivel.',

      'Sin horario fijo en el calendario del deseo: espontánea y rara como la lluvia de agosto. Coño. Nivel sótano documentado.',

      'Ni dentro ni fuera del deseo del todo: umbral sin empadronamiento claro en. El ranking. Joder. Hostia puta, qué nivel.',

      'Sexy de solo entrantes sin plato fuerte: bocados y poco más en la carta del día. Ridículo. El ranking no miente.',

      'El quizás cansado del promedio: ni sí ni no, solo la duda hecha presencia en. El ranking. Coño. Hostia puta, qué nivel.',

      'Tu rango estrecho de sexy: vibras en el medio sin salir nunca del todo del espectro. Mierda. El chat ya lo archivó.',

      'Tu sitio es el centro del espectro de sexy: coordenada exacta y sin mudanza cercana. Mierda. Hostia puta, qué nivel.',

      'El bot te deja aquí sin regalo y sin ensañamiento: medio y punto final del análisis. Cabrón. Hostia puta, qué nivel.',

      'Ni clutch del mes ni fail de la semana: el partido de trámite del ranking, [nombre]. Cabrón. Hostia puta, qué nivel.',

      'Ni llegas con gloria ni te caes antes: terminas sin titular de portada de sexy. Ridículo. El bot no regala décimas.',

      'El medio por media de presencia: por número puro y sin anestesia del bot, [nombre]. Mierda. Hostia puta, qué nivel.',

      'Hay días de sí y días de no: el promedio es un quizás cansado de tanto dudar aquí. Cabrón. Nivel sótano documentado.',

      'Olvidable en el acierto y en el fallo de sexy: doble olvido. Sin derecho a réplica. Cabrón. Hostia puta, qué nivel.',

      'Temporal sin renovar el magnetismo: el contrato caducó y nadie lo ha firmado de nuevo. Asco. El ranking no miente.',

      'Continuidad gris de presencia: sin picos de gloria ni valles de rechazo interesante. Joder. Hostia puta, qué nivel.',

      'Resumen sin adjetivos fuertes de atracción: la falta de adjetivos es. El veredicto. Basura. El chat ya lo archivó.',

      'Tu magnetismo va y viene según el día: el grupo ya no apuesta a ninguna versión tuya. Coño. Hostia puta, qué nivel.',

      'Ni ejemplo de sexy ni antiejemplo claro: caso del promedio tembloroso sin etiqueta. Joder. Hostia puta, qué nivel.',

      'Sexy sin fecha de estreno: ensayo perpetuo sin noche de inauguración posible. Ridículo. Hostia puta, qué nivel.',

      'Ni te suben ni te bajan con ganas: te dejan en el centro sin drama añadido, [nombre]. Asco. El bot no regala décimas.',

      'Ni cartel de deseo ni ausencia total: pasillo con luz de fluorescente barato. Ridículo. Hostia puta, qué nivel.',

      'Ranking frío y correcto: centro sin narrativa extra que vender a nadie, [nombre]. Basura. Nivel sótano documentado.',

      'No mueves la conversación de quién atrae: la conversación sigue sin ti. Desperdicio., desperdicio. Hostia puta, qué nivel.',

      'El gesto del grupo es el mismo si aciertas o fallas: medio y siguiente tema. Patético. El ranking no miente.',

      'El centro del espectro es poco comercial y es tuyo por derecho estadístico puro. Mierda. Hostia puta, qué nivel.',

      'El grupo espera el zigzag de tu atracción y el zigzag llega sin sorpresa ninguna. Joder. El chat ya lo archivó.',

      'Citas sueltas con el deseo sin noviazgo ni compromiso de ninguna clase posible. Cabrón. Hostia puta, qué nivel.',

      'A veces sin buscarlo se enciende y cuando lo fuerzas se apaga: al revés del manual. Asco. Hostia puta, qué nivel.',

      'Tu atracción con RSVP irregular: a veces viene y a veces deja el asiento vacío. Mierda. Hostia puta, qué nivel, miserable.',

      'Oscilación tibia sin extremos útiles para el grupo ni para. El ranking de nadie. Basura. El bot no regala décimas, qué cringe.',

      'Tu presencia a tiempo parcial sin opción a upgrade ni a jornada completa nunca. Mierda. Hostia puta, qué nivel, da asco.',

      'Resultado tibio como costumbre: la costumbre no genera leyendas ni memes del grupo. Asco. Nivel sótano documentado, qué vergüenza.',

      'El medio te queda como ropa lavada demasiadas veces: sin color fuerte y usable. Mierda. Hostia puta, qué nivel.',

      'Gloria y fracaso de paso: tú te quedas en medio sin que te inviten a vivir. Patético. El ranking no miente, fracasado.',

      'Momentos que no compensan la tibieza de la semana entera en el historial del chat. Coño. Hostia puta, qué nivel, qué miseria.',

      'Oscila sin llegar a puerto: ni naufragio ni atraque, solo el movimiento tibio. Basura. El chat ya lo archivó, da grima.',

      'Sin remontada ni debacle de atracción: partidos que se juegan y se olvidan al día. Coño. Hostia puta, qué nivel, qué nivel de pena.',

      'Historial sin chapters fuertes de atracción: páginas grises y sin subrayados. Basura. Hostia puta, qué nivel, basura.',

      'Gestos sueltos que no suman magnetismo que se sostenga en serio en el grupo. Basura. Hostia puta, qué nivel, qué cutre.',

      'Media agua sin orilla de atracción: flotas sin dirección ni puerto a la vista. Joder. El bot no regala décimas, da pena ajena.',

      'El apagón del flash se conoce de antemano: nadie se ilusiona del todo nunca. Cabrón. Hostia puta, qué nivel, qué vacío.',

      'Día laborable de sexy: funcional, sin picos y sin ganas de recordarlo jamás. Cabrón. Nivel sótano documentado, indignante.',

      'Asumir el promedio también es honestidad: y esta es la tuya sin adornos. Patético. Hostia puta, qué nivel, qué vergüenza ajena.',

      'Se va pronto la chispa y deja el espacio vacío sin dejar rastro memorable aquí. Asco. El ranking no miente, da vergüenza.',

      'Sin titular de portada de atracción: ficha de quien terminó y nada más que eso. Asco. Hostia puta, qué nivel, qué flojo.',

      'Gris previsible como marca: el spoiler es la tibieza siempre en este tramo. Cabrón. El chat ya lo archivó, menudo desastre.',

      'Más páginas grises que capítulos: el libro de tu presencia es así de plano. Basura. Hostia puta, qué nivel, qué pena.',

      'Ni anillo ni crónica: ficha de quien terminó sin estrellas ni tachones. Ridículo. Hostia puta, qué nivel, patético.',

      'Tu lugar es el control del experimento: sin extremos no hay escala posible. Mierda. Hostia puta, qué nivel, miserable.',

      'Lo más predecible del ranking de sexy: y lo menos comentado del chat entero. Joder. El bot no regala décimas, qué cringe.',

      'Tramo que no abre hilos: la no apertura es el dato más claro del pool. Patético. Hostia puta, qué nivel, da asco.',

    ],
    low: [
      'No hay un ángulo de salvación: el problema es de base y se ve en todos lados, [nombre]. Gilipollas. Nivel sótano documentado.',

      'No hay narrativa de deseo: hay un punto final prematuro en la frase visual, [nombre]. Gilipollas. Hostia puta, qué nivel.',

      'Cero de lo que se siente antes de nombrarse: ese algo no está y no va a estar aquí. Gilipollas. El ranking no miente.',

      'La atracción te ha marcado en no volver a llamar y no llama desde hace temporadas. Gilipollas. Hostia puta, qué nivel.',

      'Cero de sensualidad espontánea en todo tu historial de mensajes y fotos del grupo. Gilipollas. El chat ya lo archivó.',

      'La habitación no cambia cuando entras: y ese es el diagnóstico completo del tramo. Gilipollas. Hostia puta, qué nivel.',

      'La temperatura del deseo no te incluye: la ecuación se resuelve sin tu variable. Gilipollas. Hostia puta, qué nivel.',

      'Cero de presencia que diga atracción sin que el esfuerzo se note a la legua. Gilipollas. Hostia puta, qué nivel.',

      'La temperatura del grupo no te incluye en la ecuación del deseo de nadie. Gilipollas. El bot no regala décimas.',

      'Cero de temperatura que se note en la habitación cuando ocupas el centro. Gilipollas. Hostia puta, qué nivel.',

      'La atracción y tú no compartís ni el código postal en el mapa del grupo. Gilipollas. Nivel sótano documentado.',

      'No hay un segundo de duda cuando alguien te mira: la respuesta es un no claro y seco, [nombre]. Gilipollas.',

      'No levantas temperatura: la habitación sigue igual cuando entras y cuando sales del plano. Gilipollas.',

      'No hay un segundo de ventaja facial ni corporal: el reloj empieza en desventaja, [nombre]. Gilipollas.',

      'Hay caras que ganan con los años. La tuya lleva en caída libre desde la primera ecografía y los técnicos aún esperan el impacto. Suspense de décadas, basura.',

      'La genética te repartió las cartas con los ojos cerrados y de mala gana. Se nota en cada ángulo, con cualquier luz y. Sin filtro que lo tape, puto feo.',

      'Tú y el espejo firmasteis un pacto de no agresión hace años: tú no lo miras, él no te lo recuerda. Convivencia tensa pero funcional, basura.',

      'No generas el silencio de alguien atractivo: generas el de cambiar de tema sin mirar atrás. Mierda. Hostia puta, qué nivel.',

      'No eres memorable: eres el espacio en blanco entre dos caras que sí se recuerdan, [nombre]. Cabrón. El bot no regala décimas.',

      'No generas el tipo de mirada que se guarda: generas la que se olvida al instante, [nombre]. Mierda. Hostia puta, qué nivel.',

      'No hay un segundo de ventaja: el reloj del deseo empieza en desventaja total, [nombre]. Ridículo. Nivel sótano documentado.',

      'No generas deseo ni rechazo interesante: generas indiferencia, y eso es peor, [nombre]. Patético. Hostia puta, qué nivel.',

      'No hay ángulo de salvación: el problema es de base y se ve desde todos lados, [nombre]. Ridículo. El ranking no miente.',

      'No hay magnetismo: hay ocupación del espacio sin carga eléctrica de ninguna clase medible. Basura. Hostia puta, qué nivel.',

      'No generas el silencio de la admiración: generas el del siguiente tema del hilo, [nombre]. Cabrón. El chat ya lo archivó.',

      'No eres memorable en clave sexual: eres el silencio entre dos opiniones fuertes, [nombre]. Basura. Hostia puta, qué nivel.',

      'No levantas el listón del deseo: el listón sigue en el suelo sin que lo toques jamás. Ridículo. Hostia puta, qué nivel.',

      'No hay magia en el detalle porque no hay detalle que encienda nada en nadie aquí, [nombre]. Joder. Hostia puta, qué nivel.',

      'No hay redención en el tramo bajo de sexy: hay el número y el número habla, [nombre]. Ridículo. El bot no regala décimas.',

      'No hay material para el close-up: hay material para el plano general y el olvido, [nombre]. Joder. Hostia puta, qué nivel.',

      'Tu cuerpo pide un rediseño completo: no un retoque, un rediseño desde los cimientos. Patético. Nivel sótano documentado.',

      'No hay close-up que merezca la pena porque el material no da para el primer plano, [nombre]. Coño. Hostia puta, qué nivel.',

      'Cero atracción real: la gente mira y sigue de largo sin que se mueva un músculo facial. Mierda. El ranking no miente.',

      'Cero de lo que hace que la gente afine el foco: el foco se va a otra parte siempre. Ridículo. Hostia puta, qué nivel.',

      'No eres el close-up: eres el plano general donde nadie detiene la mirada, [nombre]. Patético. El chat ya lo archivó.',

      'Tu look no genera debate: genera el encogimiento de hombros y el siguiente mensaje. Patético. Hostia puta, qué nivel.',

      'Cero de magnetismo: ni por luz, ni por ángulo, ni por pose forzada de ningún tipo. Patético. Hostia puta, qué nivel.',

      'No hay chispa en la forma de estar ni en la mirada ni en cómo ocupas el espacio del chat. Coño. Hostia puta, qué nivel.',

      'Cero de presencia erótica: ni un segundo de duda en quien te mira de frente en. El chat. Joder. El bot no regala décimas.',

      'No eres memorable en clave de atracción: eres olvidable en tiempo récord plano, [nombre]. Asco. Hostia puta, qué nivel.',

      'No hay magia, no hay duda, no hay segundo de interés: hay el no claro y seco, [nombre]. Joder. Nivel sótano documentado.',

      'No eres el primer plano: eres el fondo que el director no acerca nunca, [nombre]. Ridículo. Hostia puta, qué nivel.',

      'Tu presencia es la del control del experimento: sin extremos de deseo que medir. Patético. El ranking no miente.',

      'No generas capturas ni comentarios de deseo: generas el scroll silencioso, [nombre]. Basura. Hostia puta, qué nivel.',

      'No hay close-up que merezca la pena: el material no da para el primer plano, [nombre]. Joder. El chat ya lo archivó.',

      'La atracción te evitó. Y el grupo lo nota sin necesidad de decírtelo en voz alta. Ridículo. Hostia puta, qué nivel.',

      'No hay un ángulo que te convierta en otra persona: eres tú en versión siempre fría. Cabrón. Hostia puta, qué nivel.',

      'Cero de chispa en cualquiera de las capas: superficie y fondo en números rojos. Patético. Hostia puta, qué nivel.',

      'Cero de magnetismo: ni por luz, ni por ángulo, ni por esfuerzo de pose forzada. Patético. El bot no regala décimas.',

      'No generas deseo ni rechazo nítido: generas el vacío, y el vacío es peor, [nombre]. Cabrón. Hostia puta, qué nivel.',

      'No hay duda en. El veredicto: el no es redondo, claro, seco y sin matices, [nombre]. Cabrón. Nivel sótano documentado.',

      'Tu look no genera capturas de pantalla ni comentarios de deseo en. El chat del grupo. Joder. Hostia puta, qué nivel.',

      'La atracción y tú sois líneas paralelas: no se cruzan en esta geometría del grupo. Cabrón. El ranking no miente.',

      'No hay narrativa de deseo: hay un plano secuencia del vacío visual del chat, [nombre]. Coño. Hostia puta, qué nivel.',

      'Cero de lo que se siente antes de pensar: ese algo no te pertenece de ninguna forma. Joder. El chat ya lo archivó.',

      'Cero de chispa que encienda algo más que un cambio de tema educado en. El chat. Ridículo. Hostia puta, qué nivel.',

      'Tu presencia sexual es un trámite: se procesa y se archiva sin comentarios largos. Basura. Hostia puta, qué nivel.',

      'No generas el silencio de quien se queda mirando: generas el de quien sigue, [nombre]. Asco. Hostia puta, qué nivel.',

      'Tu presencia sexual es un trámite: se procesa, se archiva y se olvida al instante. Mierda. El bot no regala décimas.',

      'Tu look no tiene club de fans ni de haters de deseo: tiene indiferentes educados. Basura. Hostia puta, qué nivel.',

      'Sexy de las que el low te deja en el sótano del deseo sin debate, [nombre]. El veredicto Se ve desde el primer mensaje, ridículo.',

      'Tienes un almost de atracción que. El ranking grita. Sin filtro, [nombre]. El veredicto. Hostia puta, qué nivel.',

      'Sexy de manual fallido: ni el ángulo te salva ni la química colabora, [nombre]. El veredicto, qué asco de frame.',

      'Se te nota el fail de magnetismo hasta en el mensaje más trabajado, [nombre]. El veredicto, y el ranking no miente, mierda.',

      'Sexy de fondo de ranking: siempre el mismo almost y cero chispa, [nombre]. El veredicto No hay segunda lectura útil, sin anestesia, coño.',

      'Has convertido la falta de deseo ajeno en identidad del low, [nombre]. El veredicto El material habla solo, el chat ya lo sabía, cabrón.',

      'Sexy sin el barniz: solo pretensión y el low lo documenta, [nombre]. El veredicto Aquí, nivel sótano puro, gilipollas.',

      'El listón de lo deseable lo miras desde abajo y no has subido, [nombre]. El veredicto El ranking firma y listo, sin filtro ni consuelo, patético.',

      'Sexy repitiendo el mismo fail como si fuera marca personal. El veredicto, diagnóstico cerrado, joder.',

      'Se te oye el eco del fail sexual hasta en los neutros del chat, [nombre]. El veredicto, y se te nota a la legua, basura.',

      'Sexy de historial público: no hace falta zoom, se lee en la superficie, [nombre]. El veredicto pringado.',

      'Tienes más pretensión que magnetismo y el low no se traga el cuento, [nombre]. El veredicto, archivo sin apelación, fracasado.',

      'Sexy cutre: ni el caos tiene estilo ni el desastre tiene misterio, [nombre]. El veredicto. Hostia puta, qué nivel.',

      'Has hecho del bajo listón de deseo tu residencia en el low, [nombre]. El veredicto El material habla solo, con el grupo de testigo, mierda.',

      'Sexy de las que el mute ajeno lee como misterio y es solo desinterés, [nombre]. El veredicto, sin maquillaje posible, coño.',

      'El asco. No es bullying: es el diagnóstico del low del comando, [nombre]. El veredicto El ranking firma y listo, el veredicto es ese.',

      'Sexy constante: la única racha es la de no generar deseo real, [nombre]. El veredicto Se ve desde el primer mensaje, hostia puta qué nivel.',

      'Se te nota la prisa por parecer y cero plan de ser deseable de verdad, [nombre]. El veredicto, joder.',

      'Sexy de cartel de aviso: se lee de lejos y nadie quiere el producto, [nombre]. El veredicto, mierda.',

      'No hay misterio interesante: hay previsible y flojo, el combo del low, [nombre]. El veredicto ridículo.',

      'Tienes el historial de un local cerrado por falta de clientela de deseo, [nombre]. El veredicto fracasado.',

      'Sexy de inercia: el grupo te soporta por costumbre, no por atracción, [nombre]. El veredicto pringado.',

      'El recato del deseo te queda lejos y la distancia es rechazo, [nombre]. El veredicto Aquí. Hostia puta, qué nivel.',

      'Sexy de ranking: bajas la media del tramo con constancia de almost, [nombre]. El veredicto, asco. Y.',

      'Has convertido el almost de atracción en carnet del low, [nombre]. El veredicto Se ve desde el primer mensaje, basura.',

      'Sexy de estribillo que mancha más con cada pose del mismo fail, [nombre]. El veredicto. Hostia puta, qué nivel.',

      'Se te nota el hábito de empujar cada foto hacia el mismo almost, [nombre]. El veredicto Eso no se maquilla con ángulo, fracasado.',

      'La compostura del deseo no te reconoce y tú no has buscado el espejo, [nombre]. El veredicto patético.',

      'Sexy de fondo permanente: el low no es un mal día, es el nivel, [nombre]. El veredicto No hay segunda lectura útil, y el ranking no miente, asco.',

      'No es mala suerte de química: es patrón y el low te lo cobra, [nombre]. El veredicto El material habla solo, sin anestesia, basura.',

      'Tienes más grasa de pretensión que un freidor al cierre, [nombre]. El veredicto Aquí, el chat ya lo sabía, ridículo.',

      'Sexy de ceja ajena levantada y deseo ajeno en el sótano, [nombre]. El veredicto El ranking firma y listo, nivel sótano puro, fracasado.',

      'El promedio de este tramo es el tuyo: el suelo del low, [nombre]. El veredicto Se ve desde el primer mensaje, sin filtro ni consuelo, joder.',

      'Has convertido la falta de chispa en identidad y no hay detergente, [nombre]. El veredicto, diagnóstico cerrado, mierda.',

      'Sexy cutre y sin complejo: el complejo pediría espejo y no lo hay, [nombre]. El veredicto, y se te nota a la legua, coño.',

      'Se te oye el masticar del listón bajo hasta en los neutros, [nombre]. El veredicto El tramo te nombra sin permiso, el bot no regala décimas, cabrón.',

      'La dignidad del deseo no te coge el teléfono: el buzón está lleno de noes, [nombre]. El veredicto cabrón.',

      'Sexy de letrero grasiento: se lee de lejos y no invita a entrar, [nombre]. El veredicto El material habla solo.',

      'No hay misterio de almost con estilo: hay lo previsible y el low lo nombra, [nombre]. El veredicto patético.',

      'Tienes el historial de un fregadero abandonado desde el domingo, [nombre]. El veredicto El ranking firma y listo, sin maquillaje posible, basura.',

      'Sexy de malinterpretar el silencio como respeto al underdog del deseo, [nombre]. El veredicto basura.',

      'El grupo paga tu rastro de pretensión en cuotas diarias de hastío, [nombre]. El veredicto, hostia puta qué nivel.',

      'Has dejado el chat como vestuario de derrota de atracción, [nombre]. El veredicto Eso no se maquilla con ángulo, joder.',

      'Sexy de estribillo sin punto final limpio ni redención, [nombre]. El veredicto El tramo te nombra sin permiso, mierda.',

      'Se te nota el peso de arrastrar el mismo almost por cada hilo, [nombre]. El veredicto No hay segunda lectura útil, coño.',

      'La compostura cruza de acera cuando te ve en el low del comando, [nombre]. El veredicto El material habla solo, cabrón.',

      'Sexy de feria: ruido de fail de deseo, suelo peor y cero ganas de volver, [nombre]. El veredicto coño.',

      'Se te ve venir el almost en la primera miniatura del estado, [nombre]. El veredicto El ranking firma y listo, patético.',

      'La dignidad del tramo no para: tú eres el tráfico del arcén, [nombre]. El veredicto Se ve desde el primer mensaje, asco.',

      'Sexy de superficie suficiente: no hace falta abrir el vestuario, huele a fail, [nombre]. El veredicto patético.',

      'No hay barniz que salve: hay almost puro y el low lo cobra, [nombre]. El veredicto Eso no se maquilla con ángulo, ridículo.',

      'Sexy de puta madre en el sentido del desastre: el low no suaviza la falta de chispa, [nombre]. Basura.',

      'Tu almost de atracción es el gag del tramo. Y el grupo no pide replay, [nombre]. El veredicto ridículo.',

      'Sexy de las que el deseo ajeno te debe una hostia y. El ranking te la cobra, [nombre]. El veredicto fracasado.',

      'Se te cae el personaje sexy solo con abrir la cámara, [nombre]. El veredicto Aquí, sin anestesia, coño.',

      'Sexy de almost eterno: esta vez tampoco fue la excepción, [nombre]. El veredicto El ranking firma y listo, el chat ya lo sabía, cabrón.',

      'No hay redención en este low: hay veredicto y te nombra. Sin filtro, [nombre]. El veredicto, nivel sótano puro, gilipollas.',

      'Sexy con más filtros que magnetismo y aun así no cuela en el low, [nombre]. El veredicto, sin filtro ni consuelo, patético.',

      'El low te ha puesto en tu sitio: abajo del todo del deseo del grupo, [nombre]. El veredicto, diagnóstico cerrado, asco.',

      'Sexy de las que juraban que esta vez el ángulo sí, y no, [nombre]. El veredicto El tramo te nombra sin permiso, y se te nota a la legua, basura.',

      'Tu almost es el contenido gratis de ridículo del hilo, [nombre]. El veredicto No hay segunda lectura útil, el bot no regala décimas.',

      'Sexy de ranking roto: el número bajo te queda de apodo, [nombre]. El veredicto El material habla solo, archivo sin apelación, fracasado.',

      'Se te ve el fail desde el primer mensaje del comando, [nombre]. El veredicto Aquí. Hostia puta, qué nivel.',

      'Sexy de repertorio: siempre la misma pose de almost y cero plan B, [nombre]. El veredicto, con el grupo de testigo, mierda.',

      'El asco del low resume el tramo y el resto desarrolla el diagnóstico, [nombre]. El veredicto fracasado.',

      'Sexy de puto almost: ni el low light te favorece y. El ranking lo grita, [nombre]. El veredicto pringado.',

      'Has montado el teatro de sexy y el público solo vio el fail, [nombre]. El veredicto Eso no se maquilla con ángulo, hostia puta qué nivel.',

      'Sexy de las que confunden pose con deseo y pierden las dos, [nombre]. El veredicto El tramo te nombra sin permiso, joder.',

      'Tu almost es un aviso de lo que no hay que perseguir en el grupo, [nombre]. El veredicto No hay segunda lectura útil, mierda.',

      'Sexy con más pretensión que sustancia y el low no se traga el cuento, [nombre]. El veredicto, coño. Y.',

      'El low no discute: el número habla y tú callas, [nombre]. El veredicto Aquí. Hostia puta, qué nivel.',

      'Sexy de las que el natural es no generar deseo., [nombre]. El veredicto patético. Hostia puta, qué nivel.',

      'Se te nota el almost hasta en la foto más trabajada del perfil, [nombre]. El veredicto Se ve desde el primer mensaje, patético.',

      'Sexy de almost documentado: autor tú, testigo el grupo, [nombre]. El veredicto. Hostia puta, qué nivel.',

      'No hay segunda lectura útil en este low: hay cara y hay veredicto, [nombre]. El veredicto, basura. Y.',

      'Sexy de las que el filtro de deseo se rinde antes que el de respeto, [nombre]. El veredicto fracasado.',

      'Tu presencia en el low es el gag del comando y no el cumplido, [nombre]. El veredicto No hay segunda lectura útil, fracasado.',

      'Sexy de ranking: el tramo bajo te queda como un guante de derrota, [nombre]. El veredicto, qué asco de frame.',

      'Sexy de las que. El chat archiva el fail sin pedir amplificación, [nombre]. El veredicto Aquí, y el ranking no miente, asco.',

      'El low te nombra sin suavizar: almost de base y punto, [nombre]. El veredicto El ranking firma y listo, sin anestesia, basura.',

      'Sexy con la disciplina de quien nunca aceptó el espejo del deseo, [nombre]. El veredicto Se ve desde el primer mensaje, el chat ya lo sabía, ridículo.',

      'Se te ve venir el fail en la primera miniatura del estado, [nombre]. El veredicto, nivel sótano puro, fracasado.',

      'Sexy de puta pena: el comando no regala magnetismo y tú lo sabes, [nombre]. El veredicto Eso no se maquilla con ángulo, sin filtro ni consuelo.',

      'Tu almost baja el promedio del hilo solo con cargarse, [nombre]. El veredicto El tramo te nombra sin permiso, diagnóstico cerrado, mierda.',

      'Sexy de las que el modo deseo tampoco es cómplice del fail, [nombre]. El veredicto No hay segunda lectura útil, y se te nota a la legua, coño.',

      'El low es tu tramo natural y. El ranking no ofrece recurso, [nombre]. El veredicto El material habla solo, el bot no regala décimas, cabrón.',

      'Sexy de almost eterno con firma legible en cada pose del chat, [nombre]. El veredicto Aquí, archivo sin apelación, gilipollas.',

      'No es un mal día: es el nivel y el low te lo cobra sin descuento, [nombre]. El veredicto El ranking firma y listo.',

      'Sexy de las que necesitan suerte y aun así el resultado es mierda, [nombre]. El veredicto, con el grupo de testigo.',

      'Tu frame es el argumento más corto del comando y el más claro, [nombre]. El veredicto, sin maquillaje posible, basura.',

      'Se te cae el disimulo sexy solo con el flash del chat, [nombre]. El veredicto Eso no se maquilla con ángulo, el veredicto es ese, ridículo.',

      'Sexy de las que el grupo no cita porque no hay deseo que citar, [nombre]. El veredicto El tramo te nombra sin permiso, hostia puta qué nivel.',

      'Has firmado el fail con cada almost como única firma del low, [nombre]. El veredicto No hay segunda lectura útil, joder.',

      'Sexy de superficie: basta la vista, no hace falta el sótano, [nombre]. El veredicto El material habla solo, mierda.',

      'El low no es caridad: es veredicto y te nombra sin anestesia, [nombre]. El veredicto Aquí. Hostia puta, qué nivel.',

      'Sexy de puto desastre: ni el ángulo ni la química colaboran contigo, [nombre]. El veredicto fracasado.',

      'Sexy de las que el algoritmo de deseo pide la baja por agotamiento, [nombre]. El veredicto, gilipollas.',

      'El ranking de deseo te deja en el sótano del low sin debate, [nombre]. El veredicto. Hostia puta, qué nivel.',

      'Sexy de las que confunden natural con no generar nada de atracción, [nombre]. El veredicto gilipollas.',

      'No hay filtro mágico: hay evidencia y el low la firma en público, [nombre]. El veredicto El tramo te nombra sin permiso, basura.',

      'Sexy con más pretensión que chispa y el comando no se traga el cuento, [nombre]. El veredicto, ridículo.',

      'Tu almost es el gag del tramo. Y el grupo no pide repetición, [nombre]. El veredicto El material habla solo, fracasado.',

      'Sexy de almost documentado en alta definición del chat, [nombre]. El veredicto Aquí, qué asco de frame.',

      'Se te ve el fail desde el otro lado del puto ranking, [nombre]. El veredicto El ranking firma y listo, y el ranking no miente.',

      'Sexy de las que el deseo y. El ranking coinciden en. El veredicto, [nombre]. El veredicto, sin anestesia, coño.',

      'El low te ha puesto en tu sitio sin necesidad de narrador, [nombre]. El veredicto, el chat ya lo sabía, cabrón.',

      'Has montado el teatro de sexy y solo salió el fail del low, [nombre]. El veredicto Eso no se maquilla con ángulo, nivel sótano puro, gilipollas.',

      'Sexy de ranking: el tramo bajo es tu residencia fija, [nombre]. El veredicto El tramo te nombra sin permiso, sin filtro ni consuelo, patético.',

      'Tu almost baja el promedio del grupo en un solo estado, [nombre]. El veredicto No hay segunda lectura útil, diagnóstico cerrado, asco.',

      'Sexy de las que el modo deseo se arrepiente de haberse abierto, [nombre]. El veredicto El material habla solo, y se te nota a la legua, basura.',

      'No es luz mala ni cámara mala: eres tú y el low lo dice claro, [nombre]. El veredicto Aquí, el bot no regala décimas, ridículo.',

      'Sexy de almost eterno: el comando no convierte el casi en victoria, [nombre]. El veredicto, archivo sin apelación, fracasado.',

      'Se te cae el personaje sexy en la primera foto del hilo, [nombre]. El veredicto Se ve desde el primer mensaje.',

      'Sexy de las que necesitan tutorial de magnetismo y de dignidad, [nombre]. El veredicto, con el grupo de testigo, mierda.',

      'El low no regala décimas: el número habla y tú estás abajo, [nombre]. El veredicto Eso no se maquilla con ángulo, sin maquillaje posible, coño.',

      'Sexy de puto almost con firma en cada miniatura del chat, [nombre]. El veredicto El tramo te nombra sin permiso, el veredicto es ese.',

      'Tu frame es contenido de ridículo gratis para el grupo, [nombre]. El veredicto No hay segunda lectura útil, hostia puta qué nivel.',

      'Sexy de las que el natural es no atraer., [nombre]. El veredicto El material habla solo, joder. Hostia puta, qué nivel, qué vergüenza.',

      'Has convertido el fail de deseo en marca personal del low, [nombre]. El veredicto Aquí. Hostia puta, qué nivel, ridículo.',

      'Sexy de repertorio gastado: las mismas poses, el mismo almost, [nombre]. El veredicto El ranking firma y listo, fracasado.',

      'Se te nota el desastre hasta en la foto de perfil más antigua, [nombre]. El veredicto Se ve desde el primer mensaje, qué miseria.',

      'El low te nombra sin suavizar ni media coma del veredicto, [nombre]. El veredicto. Hostia puta, qué nivel, da grima.',

      'Sexy de almost: ni el low light te favorece. Y el chat lo ve, [nombre]. El veredicto Eso no se maquilla con ángulo, patético.',

      'Tu presencia es un argumento contra la química del grupo, [nombre]. El veredicto El tramo te nombra sin permiso, asco, basura.',

      'Sexy de puta pena en el tramo que más se lee del comando, [nombre]. El veredicto No hay segunda lectura útil, basura.',

      'No hay redención en este low: hay cara, hay número y hay veredicto, [nombre]. El veredicto, ridículo.',

      'Sexy de las que el grupo archiva el fail sin pedir bis, [nombre]. El veredicto Aquí. Hostia puta, qué nivel, qué vacío.',

      'Se te ve venir el fail en la primera palabra del estado, [nombre]. El veredicto El ranking firma y listo, qué asco de frame, indignante.',

      'Sexy de ranking roto: el sótano del tramo te queda de casa, [nombre]. El veredicto Se ve desde el primer mensaje, y el ranking no miente, asco.',

      'El comando no discute contigo: el low firma y punto, [nombre]. El veredicto, sin anestesia, basura. Hostia puta, qué nivel, da vergüenza.',

      'Tu almost es el epitafio del magnetismo de hoy, [nombre]. El veredicto asco. Eso no se maquilla con ángulo, el chat ya lo sabía, qué flojo.',

      'Sexy de puto desastre documentado. Delante del grupo entero, [nombre]. El veredicto El tramo te nombra sin permiso, nivel sótano puro, menudo desastre.',

      'Has firmado el fail con cada ángulo malo como única firma del low, [nombre]. El veredicto, sin filtro ni consuelo, qué pena.',

      'Sexy de superficie suficiente: basta una mirada, sobra el resto, [nombre]. El veredicto El material habla solo, diagnóstico cerrado, patético.',

      'El low es tu tramo y. El ranking no ofrece mudanza, [nombre]. El veredicto Aquí, y se te nota a la legua, miserable.',

      'Se te cae el frame sexy solo con cargar la cámara frontal, [nombre]. El veredicto El ranking firma y listo, el bot no regala décimas, qué cringe.',

      'Sexy de almost eterno con. El chat de testigo notarial, [nombre]. El veredicto Se ve desde el primer mensaje, archivo sin apelación, da asco.',

      'No es un mal día de fotos: es el nivel y el low te lo cobra, [nombre]. El veredicto. Hostia puta, qué nivel, qué vergüenza.',

      'Sexy de puta madre: el tramo bajo no suaviza. El veredicto de atracción, [nombre]. El veredicto gilipollas, ridículo.',

      'Tu frame es el gag más corto y más claro del comando, [nombre]. El veredicto El tramo te nombra sin permiso, sin maquillaje posible, basura.',

    ],
    extreme: [
      'Vas a arruinar muchos días sin proponértelo. Eso no todo el mundo puede decirlo No hay segunda lectura útil, el veredicto es ese, ridículo.',

      'Quien acabe contigo va a tener que recordarse cada mañana la suerte que tiene El material habla solo, hostia puta qué nivel.',

      'La gente coquetea contigo por inercia, sin haberlo decidido, y luego no sabe cómo explicarlo, joder.',

      'Tienes el tipo de atractivo del que se habla cuando ya no estás en la habitación El ranking firma y listo, mierda.',

      'Eres de los que se quedan en la memoria de personas que solo te vieron una vez Se ve desde el primer mensaje, coño.',

      'Gente que ni hablaste va a recordar tu cara años después. Eso casi nadie lo provoca. Hostia puta, qué nivel.',

      'Tienes el tipo de presencia que hace que una habitación entera baje la voz cuando entras Eso no se maquilla con ángulo, qué miseria.',

      'Te van a comparar con otros durante años, y la comparación siempre va a salir a tu favor El tramo te nombra sin permiso, patético.',

      'Hay quien se enamora del recuerdo de haberte visto. Eso no lo consigue cualquiera No hay segunda lectura útil, asco, qué nivel de pena.',

      'Tu atractivo es de los que generan historias que la gente cuenta sin haber hablado contigo, basura. Y, basura.',

      'Eres exactamente lo que la gente describe cuando le piden su tipo ideal sin pensarlo Aquí. Hostia puta, qué nivel, qué cutre.',

      'La belleza que tienes es de las que envejecen bien y se quedan en la memoria mejor aún El ranking firma y listo, fracasado.',

      'Vas a ser el estándar imposible con el que otros se comparan sin saberlo Se ve desde el primer mensaje, qué asco de frame, qué vacío.',

      'Provocas en la gente reacciones que no van a saber explicar ni a sí mismos, y el ranking no miente, indignante.',

      'Quien te tenga cerca va a vivir sabiendo que mucha gente querría estar en su lugar Eso no se maquilla con ángulo, sin anestesia, qué vergüenza ajena.',

      'Vas a ser el recuerdo que alguien guarda años después de un solo encuentro casual El tramo te nombra sin permiso, el chat ya lo sabía, da vergüenza.',

      'Tienes el tipo de cara que la gente describe mucho después de haberte dejado de ver No hay segunda lectura útil, nivel sótano puro, qué flojo.',

      'Provocas en desconocidos reacciones que ellos mismos no van a saber explicar luego El material habla solo, sin filtro ni consuelo, patético.',

      'Eres exactamente lo que la gente imagina cuando le piden que piense en alguien atractivo Aquí, diagnóstico cerrado, asco, qué pena.',

      'Hay quien va a comparar a todos sus futuros pretendientes contigo sin habértelo dicho nunca, y se te nota a la legua, basura.',

      'Tu atractivo es de los que generan rumores antes de que hayas hablado con nadie Se ve desde el primer mensaje, el bot no regala décimas, ridículo.',

      'La gente va a recordar exactamente qué llevabas puesto el día que os conocisteis, archivo sin apelación, fracasado.',

      'Vas a hacer que más de uno reconsidere su tipo entero solo con cruzarse contigo una vez Eso no se maquilla con ángulo, da asco.',

      'Eres el estándar imposible con el que otros se miden sin saber siquiera que existes El tramo te nombra sin permiso, con el grupo de testigo, qué vergüenza.',

      'Tu belleza es de las que se quedan en la cabeza de gente que solo te vio de lejos No hay segunda lectura útil, sin maquillaje posible, ridículo.',

      'Quien acabe a tu lado va a recibir comentarios que no va a saber cómo responder El material habla solo, el veredicto es ese, fracasado.',

      'Tienes el tipo de presencia que hace que una sala entera baje el volumen al entrar tú Aquí, hostia puta qué nivel, qué miseria.',

      'Vas a generar envidia silenciosa en gente que nunca te lo va a admitir a la cara El ranking firma y listo, da grima.',

      'Eres de los que aparecen una vez en la vida de alguien y se quedan como referencia para siempre, qué nivel de pena.',

    ],
  },

  crack: {
    name: 'crack',
    goodIsHigh: true,
    high: [
      'Eres el tipo de persona al que la gente llama cuando importa de verdad, no cuando hay margen de error.',

      'La fiabilidad que tienes es lo único que de verdad se cotiza a largo plazo, y tú la tienes de sobra.',

      'No necesitas que nadie te motive ni te recuerde lo que hay que hacer. Eso ya te separa del montón y el contador no discute.',

      'Tu nivel en cualquier cosa que decidas hacer sube el listón de lo que los demás consideran bueno con el eco todavía en el grupo.',

      'Cuando dices que algo está hecho, nadie lo vuelve a comprobar. Eso vale más que cualquier título con. El botín o el fail a la vista.',

      'Llegas a sitios donde la mayoría ni aspira a llegar, y lo haces sin necesitar que nadie lo note con el número hablando solo.',

      'Tienes la constancia que hace que los resultados parezcan inevitables. No lo son: los provocas. Delante del listón que no saltaste.',

      'Tienes la capacidad de reconocer el mérito ajeno. Solo lo hace quien tiene el propio asegurado con. El bot como notario del fallo.',

      'Tu nivel intimida sin que lo busques, que es la única versión del nivel que importa de verdad y. El ranking lo deja por escrito.',

      'Tienes la calma bajo presión que descoloca a todo el mundo. Y descolocar ya es media victoria con el cargo en firme.',

      'Tienes esa forma de resolver que hace que nadie pregunte cómo lo hiciste. Simplemente confían sin letra pequeña que lo salve.',

      'Cuando entregas algo no hay que revisarlo. Eso en cualquier contexto es el estándar más alto con el resultado ya consumado.',

      'La excelencia que tienes no es un estado, es un hábito. Y eso es lo más difícil de construir en alta resolución de group chat.',

      'No improvisas la calidad. La produces de forma sistemática, que es lo verdaderamente difícil con el fail todavía caliente.',

      'Tienes la disciplina de hacer lo aburrido bien. Ahí se decide casi todo y casi nadie lo hace sin consuelo de manual barato.',

      'Crack con la cabeza fría que el resto solo finge tener. Cuando arde todo, tú sigues pensando con. El veredicto seco del bot.',

      'Eres el que sostiene bajo presión lo que otros no sostienen ni en calma. Esa es la distancia y el contador no discute.',

      'Tienes esa fiabilidad que en cualquier mercado real tiene precio alto y escasez garantizada sin cuento que lo tape.',

      'Cuando hay que resolver algo de verdad, tu nombre sale solo. No por simpatía, por historial y el archivo no admite recurso.',

      'Tienes el don de simplificar lo complicado, y eso es lo contrario de lo que hace la mayoría. Delante del hueco que quedó.',

      'Tienes la mezcla de exigencia contigo y paciencia con los demás. Esa proporción es la buena y el contador insiste.',

      'Crack sin necesidad de escenario, de aplauso ni de que nadie te confirme absolutamente nada sin anestesia de verdad esta vez.',

      'Tienes la capacidad de sostener un estándar alto sin volverte insoportable. Eso es rarísimo. Sin filtro de autoayuda.',

      'Haces que lo difícil parezca rutina, y eso confunde a quien no entiende el esfuerzo detrás sin cuento que lo tape.',

      'Crack de los que aprenden de todo, incluso de lo que salió bien. Eso ya casi nadie lo hace y el hilo no pide amplificación.',

      'Cuando hay que elegir a alguien para lo importante, sales tú. Por historial, no por afecto y el archivo queda cerrado, basura.',

      'Tu trabajo habla por ti antes de que tú abras la boca. Eso es lo más difícil de conseguir sin bis ni matiz de consuelo, qué cutre.',

      'Cuando das tu palabra de que algo estará hecho, el resto ya puede dejar de pensar en ello sin que nadie pida replay, da pena ajena.',

      'No improvisas calidad. La produces de forma sistemática, que es lo verdaderamente difícil. Sin derecho a matiz útil, qué vacío.',

      'Tienes la solidez que hace que nadie tenga que revisar tu trabajo. Nunca, ni al principio en el único idioma que entiende el contador, indignante.',

      'Eres el que se adelanta al problema en lugar de reaccionar a él. Ahí está toda la ventaja y el sistema cierra sin discusión, qué vergüenza ajena.',

      'Tienes criterio para saber qué se delega y qué se hace uno mismo. Muy pocos lo distinguen sin prosa que lo maquille, da vergüenza.',

      'Cuando trabajas, se nota que hay método detrás. Y el método es lo que sostiene el talento y el contador no discute, qué flojo.',

      'Eres de los que resuelven el problema antes de que se convierta en una crisis para todos delante de quien aún leía el hilo, menudo desastre.',

      'Tu rendimiento es igual de alto cuando nadie mira que cuando todos miran. Eso es lo raro y no hay modo de suavizarlo, qué pena.',

      'Tienes la mezcla exacta de talento y constancia. Y la segunda es la que de verdad decide en el único idioma que entiende el contador, patético.',

      'Crack de los que hacen que las cosas parezcan sencillas. Y eso es lo más difícil que hay. Delante del hueco que quedó, miserable.',

      'Crack de los que ordenan prioridades cuando todo parece urgente. Ahí está media victoria con la cara del resultado a la vista, qué cringe.',

      'Crack con la capacidad de sostener el estándar cuando nadie está mirando. Ahí se ve todo sin maquillaje ni segunda toma, da asco.',

      'Cuando apareces en algo, las expectativas de lo que puede salir cambian automáticamente. Delante del hueco que quedó, qué vergüenza.',

      'Tu constancia tiene un valor que muy poca gente consigue mantener a lo largo del tiempo y el archivo queda cerrado, ridículo.',

      'Cuando te comprometes a algo, deja de ser una preocupación para los demás. Eso vale oro. Delante del hueco que quedó, fracasado.',

      'Tu nivel no depende de la motivación ni del ánimo. Está ahí siempre, y eso es lo escaso con el grupo de testigo silencioso, qué miseria.',

      'Crack de verdad: sin adornos, sin relato y sin ninguna necesidad de que te lo confirmen con el número en la frente del mensaje, da grima.',

      'Tienes esa manera de trabajar que la gente describe cuando explica cómo debería hacerse con el peaje cobrado al natural, qué nivel de pena.',

      'Cuando aprieta, tú apareces. Y ese es el único momento en el que esto se mide de verdad con. El chat enterado del cargo, basura.',

      'Cuando trabajas con alguien, ese alguien mejora. Y eso no se puede fingir ni una semana y no hay DLC que lo parchee, qué cutre.',

      'Tienes la constancia de un profesional y la curiosidad de alguien que sigue aprendiendo en el recuento que no perdona, da pena ajena.',

      'Cuando hay un problema nuevo, tú ya estás pensando en la segunda derivada. Eso es nivel con el grupo de testigo silencioso, qué vacío.',

      'Crack de los que corrigen sin humillar. Eso construye equipos y casi nadie sabe hacerlo en el único idioma que entiende el contador, indignante.',

    ],
    mid: [
      'Ni silencio de gesta ni de vergüenza: silencio de scroll al siguiente tema, [nombre]. Gilipollas. Hostia puta, qué nivel.',

      'El flash de respeto ya no ilusiona a nadie: se conoce el apagón de antemano siempre. Gilipollas. Nivel sótano documentado.',

      'El ranking promedia tu zigzag y te deja aquí sin mudanza cercana posible en el mapa. Gilipollas. Hostia puta, qué nivel.',

      'No cierras de forma memorable: ni para el álbum ni para el meme del grupo, [nombre]. Gilipollas. El ranking no miente.',

      'Espera de versión del día: el grupo no sabe qué build de crack va a cargar hoy. Gilipollas. Hostia puta, qué nivel.',

      'No hay hilo que abrir sobre tu crack: la ausencia de hilo es el dato más claro. Gilipollas. El chat ya lo archivó.',

      'Sin portada al acabar la temporada de crack: archivo gris y siguiente comando. Gilipollas. Hostia puta, qué nivel.',

      'Luz dudosa de neón de respeto a punto de fundirse sin repuesto en el almacén. Gilipollas. Hostia puta, qué nivel.',

      'Silencio de grada sin olé ni abucheo: respiración normal y nada más que eso. Gilipollas. Hostia puta, qué nivel.',

      'El bot te debe este medio: no un high de cartón ni un low de teatro barato. Gilipollas. El bot no regala décimas.',

      'El grupo no apuesta fuerte a tu crack: apuesta al medio y acierta siempre, [nombre]. Desperdicio., desperdicio.',

      'Picos cortos que no mueven la media de tu respeto en. El ranking del chat, [nombre]. Desperdicio. Nivel sótano documentado.desperdicio.',

      'El medio te queda por estadística: no por castigo ni por premio de nadie en. El bot. Desperdicio., desperdicio.',

      'Limbo con wifi entre atractivo y nada: conexión intermitente sin estabilidad real. Desperdicio. El ranking no miente.desperdicio.',

      'Hay momentos en que el ángulo ayuda y momentos en que el material no da para más, [nombre]. Cabrón. Hostia puta, qué nivel.',

      'Ni estable en el respeto ni estable en el vacío: inestable en las dos direcciones a la vez. Mierda. El chat ya lo archivó.',

      'A medias es tu tramo natural y el número te lo confirma sin anestesia ni regalo, [nombre]. Cabrón. Hostia puta, qué nivel.',

      'Zigzag esperado y cumplido: la expectativa media se cumple sin sorpresa posible. Desperdicio.desperdicio.',

      'Spoiler de tibieza permanente: nadie se sorprende del resultado medio del tramo, [nombre]. Cabrón. Hostia puta, qué nivel.',

      'Crack de interruptor con mal contacto: parpadea y nadie sabe si queda corriente de verdad. Gilipollas.',

      'Crack de menú del día: a veces hay plato y a veces solo pan sin ganas de pedir más, [nombre]. Asco. Hostia puta, qué nivel.',

      'A ratos el silencio de interés y a ratos el ruido de no saber qué hacer con la presencia. Basura. Nivel sótano documentado.',

      'Cliente ocasional del respeto sin puntos de fidelidad ni programa de socios del chat. Patético. Hostia puta, qué nivel.',

      'Pila de borradores de pose sin versión final que firmar ni publicar en el grupo, [nombre]. Gilipollas.',

      'Temblor sin etiqueta clara: ni fiebre de respeto ni normalidad clara en el tramo, [nombre]. Joder. Hostia puta, qué nivel.',

      'Medallero corto y sin brillo de respeto: ni vacío dramático ni lleno orgulloso, [nombre]. Basura. El chat ya lo archivó.',

      'Cumples la expectativa media: el grupo no espera milagros ni catástrofes de ti. Desperdicio., desperdicio.',

      'Crack de ensayo general: nunca estreno del todo y el público del grupo ya lo intuye. Ridículo. Hostia puta, qué nivel.',

      'El grupo está en espera de qué versión de crack carga hoy en tu perfil del día, [nombre]. Gilipollas.',

      'Tu crack en silencio con mensajes raros: chat casi muerto y algún ping suelto, [nombre]. Mierda. El bot no regala décimas.',

      'Picos que no mueven. El ranking: subes un segundo y vuelves al medio sin ruido. Desperdicio., desperdicio.',

      'El medio no pide aplausos: pide el número y el número es este sin adornos, [nombre]. Patético. Nivel sótano documentado.',

      'Estás en el tramo que no emociona: constata y sigue como el resto del ranking, [nombre]. Mierda. Hostia puta, qué nivel.',

      'No ser noticia es tu forma de estar: el silencio de centro es tu marca registrada, [nombre]. Asco. El ranking no miente.',

      'Sin leyenda ni maldición de crack: solo la continuidad gris del promedio del chat, [nombre]. Coño. Hostia puta, qué nivel.',

      'Continuidad de fondo sin picos: ambient del ranking de respeto del grupo, [nombre]. Patético. El chat ya lo archivó.',

      'Ni miedo ni pena: estás en la lista y la lista no te destaca nunca, [nombre]. Desperdicio., desperdicio.',

      'Tu presencia sexual es un wifi de centro comercial: se conecta a ratos y se cae igual. Basura. Hostia puta, qué nivel.',

      'Crack con luz piloto: se ve que hay algo pero no se sabe cuánto ni de qué calidad. Ridículo. Hostia puta, qué nivel.',

      'Sin horario fijo en el calendario del respeto: espontánea y rara como la lluvia de agosto. Coño. El bot no regala décimas.',

      'Andamio visible de la pose: se ve la obra y falta la fachada terminada del todo, [nombre]. Asco. Hostia puta, qué nivel.',

      'Ni dentro ni fuera del respeto del todo: umbral sin empadronamiento claro en. El ranking. Joder. Nivel sótano documentado.',

      'Salva el rato y pierde el día de respeto: prioridades raras y resultados tibios, [nombre]. Coño. Hostia puta, qué nivel.',

      'Manos y mirada que no saben qué hacer a ratos: el vacío se nota en el gesto, [nombre]. Basura. El ranking no miente.',

      'El único sitio sin mentir el relato: el medio es lo único que no es ficción. Desperdicio., desperdicio.',

      'Ni generas respeto claro ni rechazo interesante: el medio pelo de la respeto medible. Mierda. El chat ya lo archivó.',

      'Crack de solo entrantes sin plato fuerte: bocados y poco más en la carta del día. Ridículo. Hostia puta, qué nivel.',

      'Tu rango estrecho de crack: vibras en el medio sin salir nunca del todo del espectro. Mierda. Hostia puta, qué nivel.',

      'Tu sitio es el centro del espectro de crack: coordenada exacta y sin mudanza cercana. Mierda. Hostia puta, qué nivel.',

      'Sin material para fanatismo ni desprecio: material para el siguiente mensaje, [nombre]. Joder. El bot no regala décimas.',

      'El magnetismo no ha firmado indefinido contigo: es temporal y sin renovación automática. Asco. Hostia puta, qué nivel.',

      'El quizás cansado del promedio: ni sí ni no, solo la duda hecha presencia en. El ranking. Coño. Nivel sótano documentado.',

      'El bot te deja aquí sin regalo y sin ensañamiento: medio y punto final del análisis. Cabrón. Hostia puta, qué nivel.',

      'Ni llegas con gloria ni te caes antes: terminas sin titular de portada de crack. Ridículo. El ranking no miente.',

      'Ni clutch del mes ni fail de la semana: el partido de trámite del ranking, [nombre]. Cabrón. Hostia puta, qué nivel.',

      'Olvidable en el acierto y en el fallo de crack: doble olvido. Sin derecho a réplica. Cabrón. El chat ya lo archivó.',

      'Una frase de respeto y vuelta al bloque de tibieza como si nada hubiera pasado. Patético. Hostia puta, qué nivel.',

      'Depende como sentencia de tu respeto: el veredicto es el depende y punto final. Patético. Hostia puta, qué nivel.',

      'Ni cartel de respeto ni ausencia total: pasillo con luz de fluorescente barato. Ridículo. Hostia puta, qué nivel.',

      'El medio por media de presencia: por número puro y sin anestesia del bot, [nombre]. Mierda. El bot no regala décimas.',

      'Hay días de sí y días de no: el promedio es un quizás cansado de tanto dudar aquí. Cabrón. Hostia puta, qué nivel.',

      'Ni ejemplo de crack ni antiejemplo claro: caso del promedio tembloroso sin etiqueta. Joder. Nivel sótano documentado.',

      'El depende es. El veredicto de tu respeto y no hay apelación al número del bot. Patético. Hostia puta, qué nivel.',

      'Crack sin fecha de estreno: ensayo perpetuo sin noche de inauguración posible. Ridículo. El ranking no miente.',

      'Temporal sin renovar el magnetismo: el contrato caducó y nadie lo ha firmado de nuevo. Asco. Hostia puta, qué nivel.',

      'Continuidad gris de presencia: sin picos de gloria ni valles de rechazo interesante. Joder. El chat ya lo archivó.',

      'Tu magnetismo va y viene según el día: el grupo ya no apuesta a ninguna versión tuya. Coño. Hostia puta, qué nivel.',

      'Citas sueltas con el respeto sin noviazgo ni compromiso de ninguna clase posible. Cabrón. Hostia puta, qué nivel.',

      'Ni te suben ni te bajan con ganas: te dejan en el centro sin drama añadido, [nombre]. Asco. Hostia puta, qué nivel.',

      'Ranking frío y correcto: centro sin narrativa extra que vender a nadie, [nombre]. Basura. El bot no regala décimas.',

      'No mueves la conversación de quién atrae: la conversación sigue sin ti. Desperdicio., desperdicio. Hostia puta, qué nivel, qué vergüenza ajena.',

      'El gesto del grupo es el mismo si aciertas o fallas: medio y siguiente tema. Patético. Nivel sótano documentado, da vergüenza.',

      'Resumen sin adjetivos fuertes de respeto: la falta de adjetivos es. El veredicto. Basura. Hostia puta, qué nivel, qué flojo.',

      'El centro del espectro es poco comercial y es tuyo por derecho estadístico puro. Mierda. El ranking no miente, menudo desastre.',

      'A veces sin buscarlo se enciende y cuando lo fuerzas se apaga: al revés del manual. Asco. Hostia puta, qué nivel, qué pena.',

      'Oscilación tibia sin extremos útiles para el grupo ni para. El ranking de nadie. Basura. El chat ya lo archivó, patético.',

      'Tu presencia a tiempo parcial sin opción a upgrade ni a jornada completa nunca. Mierda. Hostia puta, qué nivel, miserable.',

      'Resultado tibio como costumbre: la costumbre no genera leyendas ni memes del grupo. Asco. Hostia puta, qué nivel, qué cringe.',

      'El medio te queda como ropa lavada demasiadas veces: sin color fuerte y usable. Mierda. Hostia puta, qué nivel.',

      'Gloria y fracaso de paso: tú te quedas en medio sin que te inviten a vivir. Patético. El bot no regala décimas, qué vergüenza.',

      'Momentos que no compensan la tibieza de la semana entera en el historial del chat. Coño. Hostia puta, qué nivel, ridículo.',

      'Oscila sin llegar a puerto: ni naufragio ni atraque, solo el movimiento tibio. Basura. Nivel sótano documentado, fracasado.',

      'El grupo espera el zigzag de tu respeto y el zigzag llega sin sorpresa ninguna. Joder. Hostia puta, qué nivel, qué miseria.',

      'Tu respeto con RSVP irregular: a veces viene y a veces deja el asiento vacío. Mierda. El ranking no miente, da grima.',

      'Día laborable de crack: funcional, sin picos y sin ganas de recordarlo jamás. Cabrón. Hostia puta, qué nivel, qué nivel de pena.',

      'Gestos sueltos que no suman magnetismo que se sostenga en serio en el grupo. Basura. El chat ya lo archivó, basura.',

      'El apagón del flash se conoce de antemano: nadie se ilusiona del todo nunca. Cabrón. Hostia puta, qué nivel, qué cutre.',

      'Sin remontada ni debacle de respeto: partidos que se juegan y se olvidan al día. Coño. Hostia puta, qué nivel, da pena ajena.',

      'Asumir el promedio también es honestidad: y esta es la tuya sin adornos. Patético. Hostia puta, qué nivel, qué vacío.',

      'Se va pronto la chispa y deja el espacio vacío sin dejar rastro memorable aquí. Asco. El bot no regala décimas, indignante.',

      'Historial sin chapters fuertes de respeto: páginas grises y sin subrayados. Basura. Hostia puta, qué nivel, qué vergüenza ajena.',

      'Gris previsible como marca: el spoiler es la tibieza siempre en este tramo. Cabrón. Nivel sótano documentado, da vergüenza.',

      'Más páginas grises que capítulos: el libro de tu presencia es así de plano. Basura. Hostia puta, qué nivel, qué flojo.',

      'Lo más predecible del ranking de crack: y lo menos comentado del chat entero. Joder. El ranking no miente, menudo desastre.',

      'Ni anillo ni crónica: ficha de quien terminó sin estrellas ni tachones. Ridículo. Hostia puta, qué nivel, qué pena.',

      'Tu lugar es el control del experimento: sin extremos no hay escala posible. Mierda. El chat ya lo archivó, patético.',

      'Media agua sin orilla de respeto: flotas sin dirección ni puerto a la vista. Joder. Hostia puta, qué nivel, miserable.',

      'El respeto te saluda de lejos y no se acerca a vivir contigo del todo nunca. Joder. Hostia puta, qué nivel, qué cringe.',

      'Tramo que no abre hilos: la no apertura es el dato más claro del pool. Patético. Hostia puta, qué nivel, da asco.',

      'Sin titular de portada de respeto: ficha de quien terminó y nada más que eso. Asco. El bot no regala décimas, qué vergüenza.',

    ],
    low: [
      'No hay narrativa de respeto: hay un punto final prematuro en la frase visual, [nombre]. Gilipollas. Hostia puta, qué nivel.',

      'No hay un ángulo de salvación: el problema es de base y se ve en todos lados, [nombre]. Gilipollas. Nivel sótano documentado.',

      'Cero de lo que se siente antes de nombrarse: ese algo no está y no va a estar aquí. Gilipollas. Hostia puta, qué nivel.',

      'La habitación no cambia cuando entras: y ese es el diagnóstico completo del tramo. Gilipollas. El ranking no miente.',

      'La temperatura del respeto no te incluye: la ecuación se resuelve sin tu variable. Gilipollas. Hostia puta, qué nivel.',

      'La respeto te ha marcado en no volver a llamar y no llama desde hace temporadas. Gilipollas. El chat ya lo archivó.',

      'Cero de presencia espontánea en todo tu historial de mensajes y fotos del grupo. Gilipollas. Hostia puta, qué nivel.',

      'La temperatura del grupo no te incluye en la ecuación del respeto de nadie. Gilipollas. Hostia puta, qué nivel.',

      'Cero de presencia que diga respeto sin que el esfuerzo se note a la legua. Gilipollas. Hostia puta, qué nivel.',

      'Cero de temperatura que se note en la habitación cuando ocupas el centro. Gilipollas. El bot no regala décimas.',

      'La respeto y tú no compartís ni el código postal en el mapa del grupo. Gilipollas. Hostia puta, qué nivel.',

      'No hay un segundo de duda cuando alguien te mira: la respuesta es un no claro y seco, [nombre]. Gilipollas.',

      'No levantas temperatura: la habitación sigue igual cuando entras y cuando sales del plano. Gilipollas.',

      'No hay un segundo de ventaja facial ni corporal: el reloj empieza en desventaja, [nombre]. Gilipollas.',

      'Te asignan lo que no importa por supervivencia colectiva. Si te dejaran algo serio, hundirías el barco con la sonrisa puesta, saludando desde el puente, basura.',

      'Confunden tu aplomo con conocimiento justo hasta que ven el churro que sueltas. Ahí cae la careta, rueda por el suelo y nadie se molesta en recogerla, fracasado.',

      'Hay quien sin talento compensa currando. Tú ni lo has intentado, porque a vago no te gana nadie: en esa única disciplina, eres un fenómeno de talla mundial, puto.',

      'Donde pones la mano, alguien tiene que volver a ponerla bien después. Eres como un becario eterno al que hay que vigilar, pero sin la excusa de ser nuevo, basura.',

      'Solo te dan las tareas que no importan, las de "que no pueda romper nada". Porque ya aprendieron, a base de hostias, lo que pasa cuando te dan algo serio, patético.',

      'Hay gente sin talento que se parte el lomo para compensar. Tú ni eso: encontraste la única forma de ser malo y vago a la vez, puto. Eficiencia negativa.',

      'No tienes ni puta idea de nada y lo tapas con una chulería que se desmorona en cuanto alguien dice las dos palabras mágicas: "entrégalo ahora".',

      'La distancia entre lo que crees que vales y lo que produces de verdad se mide en años luz. Los astrónomos la usan de referencia, fracasado.',

      'No hay un segundo de ventaja: el reloj del respeto empieza en desventaja total, [nombre]. Ridículo. Hostia puta, qué nivel.',

      'No generas respeto ni rechazo interesante: generas indiferencia, y eso es peor, [nombre]. Patético. El ranking no miente.',

      'No generas el silencio de alguien atractivo: generas el de cambiar de tema sin mirar atrás. Mierda. Hostia puta, qué nivel.',

      'No levantas el listón del respeto: el listón sigue en el suelo sin que lo toques jamás. Ridículo. El chat ya lo archivó.',

      'No eres memorable: eres el espacio en blanco entre dos caras que sí se recuerdan, [nombre]. Cabrón. Hostia puta, qué nivel.',

      'No generas el tipo de mirada que se guarda: generas la que se olvida al instante, [nombre]. Mierda. Hostia puta, qué nivel.',

      'No hay ángulo de salvación: el problema es de base y se ve desde todos lados, [nombre]. Ridículo. Hostia puta, qué nivel.',

      'No hay magnetismo: hay ocupación del espacio sin carga eléctrica de ninguna clase medible. Basura. El bot no regala décimas.',

      'No generas el silencio de la admiración: generas el del siguiente tema del hilo, [nombre]. Cabrón. Hostia puta, qué nivel.',

      'No hay redención en el tramo bajo de crack: hay el número y el número habla, [nombre]. Ridículo. Nivel sótano documentado.',

      'No hay magia en el detalle porque no hay detalle que encienda nada en nadie aquí, [nombre]. Joder. Hostia puta, qué nivel.',

      'No hay material para el close-up: hay material para el plano general y el olvido, [nombre]. Joder. El ranking no miente.',

      'Tu cuerpo pide un rediseño completo: no un retoque, un rediseño desde los cimientos. Patético. Hostia puta, qué nivel.',

      'No hay close-up que merezca la pena porque el material no da para el primer plano, [nombre]. Coño. El chat ya lo archivó.',

      'Cero de lo que hace que la gente afine el foco: el foco se va a otra parte siempre. Ridículo. Hostia puta, qué nivel.',

      'No eres el close-up: eres el plano general donde nadie detiene la mirada, [nombre]. Patético. Hostia puta, qué nivel.',

      'Tu look no genera debate: genera el encogimiento de hombros y el siguiente mensaje. Patético. Hostia puta, qué nivel.',

      'Cero de presencia de crack: ni un segundo de duda en quien te mira de frente en. El chat. Joder. El bot no regala décimas.',

      'Tu presencia es la del control del experimento: sin extremos de respeto que medir. Patético. Hostia puta, qué nivel.',

      'No generas capturas ni comentarios de respeto: generas el scroll silencioso, [nombre]. Basura. Nivel sótano documentado.',

      'Cero de magnetismo: ni por luz, ni por ángulo, ni por pose forzada de ningún tipo. Patético. Hostia puta, qué nivel.',

      'Cero respeto real: la gente mira y sigue de largo sin que se mueva un músculo facial. Mierda. El ranking no miente.',

      'No hay chispa en la forma de estar ni en la mirada ni en cómo ocupas el espacio del chat. Coño. Hostia puta, qué nivel.',

      'No hay magia, no hay duda, no hay segundo de interés: hay el no claro y seco, [nombre]. Joder. El chat ya lo archivó.',

      'No generas respeto ni rechazo nítido: generas el vacío, y el vacío es peor, [nombre]. Cabrón. Hostia puta, qué nivel.',

      'No eres el primer plano: eres el fondo que el director no acerca nunca, [nombre]. Ridículo. Hostia puta, qué nivel.',

      'Tu look no genera capturas de pantalla ni comentarios de respeto en. El chat del grupo. Joder. Hostia puta, qué nivel.',

      'No hay narrativa de respeto: hay un plano secuencia del vacío visual del chat, [nombre]. Coño. El bot no regala décimas.',

      'Tu presencia de crack es un trámite: se procesa y se archiva sin comentarios largos. Basura. Hostia puta, qué nivel.',

      'No hay close-up que merezca la pena: el material no da para el primer plano, [nombre]. Joder. Nivel sótano documentado.',

      'Tu presencia de crack es un trámite: se procesa, se archiva y se olvida al instante. Mierda. Hostia puta, qué nivel.',

      'No hay un ángulo que te convierta en otra persona: eres tú en versión siempre fría. Cabrón. El ranking no miente.',

      'Cero de chispa en cualquiera de las capas: superficie y fondo en números rojos. Patético. Hostia puta, qué nivel.',

      'Tu look no tiene club de fans ni de haters de respeto: tiene indiferentes educados. Basura. El chat ya lo archivó.',

      'No eres memorable en clave de respeto: eres olvidable en tiempo récord plano, [nombre]. Asco. Hostia puta, qué nivel.',

      'Cero de magnetismo: ni por luz, ni por ángulo, ni por esfuerzo de pose forzada. Patético. Hostia puta, qué nivel.',

      'La química de crack del chat te tiene en lista de no contactar automáticamente. Ridículo. Hostia puta, qué nivel.',

      'No hay duda en. El veredicto: el no es redondo, claro, seco y sin matices, [nombre]. Cabrón. El bot no regala décimas.',

      'Crack de las que el low te deja en el sótano del talento sin debate, [nombre]. El veredicto, sin anestesia, basura.',

      'Tienes más almost de genio que resultados y. El ranking lo grita, [nombre]. El veredicto No hay segunda lectura útil, el chat ya lo sabía, ridículo.',

      'Crack de manual fallido: el marcador de talento te conoce por los ceros, [nombre]. El veredicto coño.',

      'Se te nota la racha de casi en cada mensaje y el low no convierte nada, [nombre]. El veredicto cabrón.',

      'Crack de fondo de ranking: siempre sin el punto que cambia el partido, [nombre]. El veredicto gilipollas.',

      'Has hecho del almost de crack una residencia fija en el tramo bajo, [nombre]. El veredicto, y se te nota a la legua, coño.',

      'Crack sin el barniz: solo pretensión y el low lo documenta, [nombre]. El veredicto, el bot no regala décimas, cabrón.',

      'El listón de lo brillante lo miras desde el sótano y no has subido, [nombre]. El veredicto, archivo sin apelación, gilipollas.',

      'Crack con el mismo gag de siempre y cero variación. El veredicto ridículo, joder, sin maquillaje posible.',

      'Se te oye el eco del fail hasta en los mensajes de plan B, [nombre]. El veredicto No hay segunda lectura útil, con el grupo de testigo, asco.',

      'Crack de historial público: el marcador de genio está en la superficie, [nombre]. El veredicto pringado.',

      'Tienes más episodios de almost que de algo que. El chat respete, [nombre]. El veredicto Aquí, el veredicto es ese, ridículo.',

      'Crack cutre: ni el fallo tiene gracia ni la racha tiene misterio, [nombre]. El veredicto El ranking firma y listo, hostia puta qué nivel.',

      'Has convertido el almost de crack en marca personal del low, [nombre]. El veredicto Se ve desde el primer mensaje, joder.',

      'Crack de las que el mute ajeno lee como respeto y es desinterés, [nombre]. El veredicto. Hostia puta, qué nivel.',

      'El asco. No es bullying: es el diagnóstico de una racha que no corta, [nombre]. El veredicto gilipollas.',

      'Crack constante: la única racha es la de no cerrar el punto de talento, [nombre]. El veredicto patético.',

      'Se te nota la prisa por explicar el fail y cero plan de no repetirlo, [nombre]. El veredicto, gilipollas.',

      'Crack de cartel de sótano: se ve el letrero y nadie baja a firmar, [nombre]. El veredicto, patético.',

      'No hay misterio interesante: hay previsible y flojo, el combo del low, [nombre]. El veredicto ridículo.',

      'Tienes el historial de un equipo que no gana ni amistosos de talento, [nombre]. El veredicto fracasado.',

      'Crack de inercia: el grupo te soporta por costumbre, no por respeto, [nombre]. El veredicto pringado.',

      'El recato de genio te queda lejos y la distancia es rechazo, [nombre]. El veredicto. Hostia puta, qué nivel.',

      'Crack de ranking: bajas la media del tramo con constancia de caer, [nombre]. El veredicto, qué asco de frame.',

      'Has hecho del bajo listón de talento tu casa en el low, [nombre]. El veredicto El tramo te nombra sin permiso, y el ranking no miente, mierda.',

      'Crack de estribillo que mancha más con cada repetición del fail, [nombre]. El veredicto No hay segunda lectura útil, sin anestesia, coño.',

      'Se te nota el hábito de empujar cada tema hacia la misma derrota, [nombre]. El veredicto El material habla solo, el chat ya lo sabía, cabrón.',

      'La compostura no te reconoce y tú no has buscado el espejo del marcador, [nombre]. El veredicto patético.',

      'Crack de fondo permanente: el low no es un mal día, es el nivel, [nombre]. El veredicto El ranking firma y listo, sin filtro ni consuelo, patético.',

      'No es mala suerte: es patrón y el low te lo cobra, [nombre]. El veredicto Se ve desde el primer mensaje, diagnóstico cerrado, asco.',

      'Tienes más grasa de almost que un vestuario después del 0-5 de talento, [nombre]. El veredicto ridículo.',

      'Crack de ceja ajena levantada y respeto en el sótano, [nombre]. El veredicto Eso no se maquilla con ángulo, el bot no regala décimas, ridículo.',

      'El promedio de este tramo es el tuyo: el suelo del low, [nombre]. El veredicto El tramo te nombra sin permiso, archivo sin apelación, fracasado.',

      'Has convertido el almost de crack en identidad y no hay detergente, [nombre]. El veredicto. Hostia puta, qué nivel.',

      'Crack cutre y sin complejo: el complejo pediría espejo y no lo hay, [nombre]. El veredicto, con el grupo de testigo, mierda.',

      'Se te oye el masticar del listón bajo hasta en los neutros, [nombre]. El veredicto Aquí, sin maquillaje posible, coño.',

      'La dignidad no te coge el teléfono: el buzón está lleno de avisos del marcador, [nombre]. El veredicto cabrón.',

      'Crack de letrero grasiento: se lee de lejos y no invita a entrar, [nombre]. El veredicto Se ve desde el primer mensaje, hostia puta qué nivel.',

      'No hay misterio de derrota con estilo: hay lo previsible y el low lo nombra, [nombre]. El veredicto patético.',

      'Tienes el historial de un fregadero abandonado desde el domingo, [nombre]. El veredicto Eso no se maquilla con ángulo, mierda.',

      'Crack de malinterpretar el silencio como respeto al underdog de talento, [nombre]. El veredicto basura.',

      'El grupo paga tu rastro de fail en cuotas diarias de hastío, [nombre]. El veredicto No hay segunda lectura útil, cabrón.',

      'Has dejado el chat como vestuario de derrota de genio, [nombre]. El veredicto El material habla solo, gilipollas.',

      'Crack de estribillo sin punto final limpio ni redención, [nombre]. El veredicto Aquí. Hostia puta, qué nivel.',

      'Se te nota el peso de arrastrar la misma derrota por cada hilo, [nombre]. El veredicto El ranking firma y listo, asco.',

      'La compostura cruza de acera cuando te ve en el low del comando, [nombre]. El veredicto Se ve desde el primer mensaje, basura.',

      'Crack de feria: ruido de fail, suelo peor y cero ganas de volver, [nombre]. El veredicto. Hostia puta, qué nivel.',

      'Se te ve venir la derrota en la primera palabra del mensaje, [nombre]. El veredicto Eso no se maquilla con ángulo, fracasado.',

      'La dignidad del tramo no para: tú eres el tráfico del arcén, [nombre]. El veredicto El tramo te nombra sin permiso, qué asco de frame.',

      'Crack de superficie: no hace falta abrir el vestuario, huele a fail, [nombre]. El veredicto patético.',

      'No hay barniz que salve: hay almost puro y el low lo cobra, [nombre]. El veredicto El material habla solo, sin anestesia, basura.',

      'Crack de puta madre en el sentido del almost: el low no suaviza el marcador de talento, [nombre]. Basura.',

      'Tu racha de ceros de genio es el gag del tramo. Y el grupo no pide replay, [nombre]. El veredicto ridículo.',

      'Crack de las que el marcador te debe una hostia y. El ranking te la cobra, [nombre]. El veredicto fracasado.',

      'Se te cae el personaje de crack solo con abrir el comando, [nombre]. El veredicto, diagnóstico cerrado, mierda.',

      'Crack de almost eterno: esta vez tampoco fue la excepción, [nombre]. El veredicto Eso no se maquilla con ángulo, y se te nota a la legua, coño.',

      'No hay redención en este low: hay veredicto y te nombra. Sin filtro, [nombre]. El veredicto, el bot no regala décimas, cabrón.',

      'Crack con más excusas que puntos de talento en el puto ranking, [nombre]. El veredicto No hay segunda lectura útil, archivo sin apelación.',

      'El low te ha puesto en tu sitio: abajo, sin debate, [nombre]. El veredicto El material habla solo. Hostia puta, qué nivel.',

      'Crack de las que juraban que esta vez sí y el marcador dijo que no, [nombre]. El veredicto gilipollas.',

      'Tu almost es el contenido gratis de ridículo del hilo, [nombre]. El veredicto El ranking firma y listo, sin maquillaje posible.',

      'Crack de ranking roto: el número bajo te queda de apodo, [nombre]. El veredicto Se ve desde el primer mensaje, el veredicto es ese, ridículo.',

      'Se te ve el fail desde el primer mensaje del comando, [nombre]. El veredicto, hostia puta qué nivel.',

      'Crack de repertorio: siempre la misma derrota de talento y cero plan B, [nombre]. El veredicto ridículo.',

      'El asco del low resume el tramo y el resto desarrolla el diagnóstico, [nombre]. El veredicto fracasado.',

      'Crack de puto almost: ni el plan B te salva y. El ranking lo grita, [nombre]. El veredicto, coño. Y.',

      'Has montado el teatro del crack y el público solo vio el fail, [nombre]. El veredicto El material habla solo, cabrón.',

      'Crack de las que confunden intención con resultado y pierden las dos, [nombre]. El veredicto, gilipollas.',

      'Tu almost es un aviso de lo que no hay que apostar en el grupo, [nombre]. El veredicto El ranking firma y listo, patético.',

      'Crack con más pretensión que sustancia y el low no se traga el cuento, [nombre]. El veredicto cabrón.',

      'El low no discute: el marcador habla y tú callas, [nombre]. El veredicto. Hostia puta, qué nivel. Hostia, el desastre se explica solo, joder.',

      'Crack de las que el natural es no brillar. Nivel sótano documentado.[nombre]. El veredicto Eso no se maquilla con ángulo, ridículo.',

      'Se te nota el almost hasta en el mensaje más optimista del chat, [nombre]. El veredicto El tramo te nombra sin permiso, fracasado.',

      'Crack de almost documentado: autor tú, testigo el grupo, [nombre]. El veredicto No hay segunda lectura útil, qué asco de frame.',

      'No hay segunda lectura útil en este low: hay marcador y hay veredicto, [nombre]. El veredicto ridículo.',

      'Crack de las que el filtro de genio se rinde antes que el de respeto, [nombre]. El veredicto fracasado.',

      'Tu presencia en el low es el gag del comando y no el trofeo, [nombre]. El veredicto El ranking firma y listo, el chat ya lo sabía, cabrón.',

      'Crack de ranking: el tramo bajo te queda como un guante de derrota, [nombre]. El veredicto, nivel sótano puro, gilipollas.',

      'Has convertido el almost de crack en residencia fiscal del low, [nombre]. El veredicto, sin filtro ni consuelo, patético.',

      'Crack de las que. El chat archiva el fail sin pedir amplificación, [nombre]. El veredicto, diagnóstico cerrado, asco.',

      'El low te nombra sin suavizar: almost de base y punto, [nombre]. El veredicto El tramo te nombra sin permiso, y se te nota a la legua, basura.',

      'Crack con la disciplina de quien nunca aceptó el espejo del marcador, [nombre]. El veredicto gilipollas.',

      'Se te ve venir el fail en la primera palabra del resultado, [nombre]. El veredicto El material habla solo, archivo sin apelación, fracasado.',

      'Crack de puta pena: el comando no regala genio y tú lo sabes, [nombre]. El veredicto Aquí. Hostia puta, qué nivel.',

      'Tu racha baja el promedio del hilo solo con cargarse, [nombre]. El veredicto El ranking firma y listo, con el grupo de testigo, mierda.',

      'Crack de las que el modo talento tampoco es cómplice del fail, [nombre]. El veredicto Se ve desde el primer mensaje, sin maquillaje posible, coño.',

      'El low es tu tramo natural y. El ranking no ofrece recurso, [nombre]. El veredicto, el veredicto es ese, cabrón.',

      'Crack de almost eterno con firma legible en cada derrota del chat, [nombre]. El veredicto, hostia puta qué nivel.',

      'No es un mal día: es el nivel y el low te lo cobra sin descuento, [nombre]. El veredicto El tramo te nombra sin permiso, joder.',

      'Crack de las que necesitan suerte y aun así el resultado es mierda, [nombre]. El veredicto, mierda. Y.',

      'Tu marcador es el argumento más corto del comando y el más claro, [nombre]. El veredicto El material habla solo, coño.',

      'Se te cae el disimulo de crack solo con el resultado del comando, [nombre]. El veredicto Aquí. Hostia puta, qué nivel.',

      'Crack de las que el grupo no cita porque no hay talento que citar, [nombre]. El veredicto, gilipollas.',

      'Has firmado el fail con cada almost como única firma del low, [nombre]. El veredicto Se ve desde el primer mensaje, patético.',

      'Crack de superficie: basta el marcador, no hace falta el sótano, [nombre]. El veredicto. Hostia puta, qué nivel.',

      'El low no es caridad: es veredicto y te nombra sin anestesia, [nombre]. El veredicto Eso no se maquilla con ángulo, basura.',

      'Crack de puto desastre: ni el plan ni la suerte colaboran contigo, [nombre]. El veredicto, ridículo.',

      'Crack de las que el algoritmo de genio pide la baja por agotamiento, [nombre]. El veredicto, fracasado.',

      'El ranking de talento te deja en el sótano del low sin debate, [nombre]. El veredicto El material habla solo, qué asco de frame.',

      'Crack de las que confunden natural con no brillar nunca de verdad, [nombre]. El veredicto gilipollas.',

      'No hay filtro mágico: hay evidencia y el low la firma en público, [nombre]. El veredicto El ranking firma y listo, sin anestesia, basura.',

      'Crack con más pretensión que puntos y el comando no se traga el cuento, [nombre]. El veredicto, el chat ya lo sabía, ridículo.',

      'Tu almost es el gag del tramo. Y el grupo no pide repetición, [nombre]. El veredicto, nivel sótano puro, fracasado.',

      'Crack de almost documentado en alta definición del chat, [nombre]. El veredicto Eso no se maquilla con ángulo, sin filtro ni consuelo, joder.',

      'Se te ve el fail desde el otro lado del puto ranking, [nombre]. El veredicto El tramo te nombra sin permiso, diagnóstico cerrado.',

      'Crack de las que el talento y. El ranking coinciden en. El veredicto, [nombre]. El veredicto pringado.',

      'El low te ha puesto en tu sitio sin necesidad de narrador, [nombre]. El veredicto El material habla solo, el bot no regala décimas, cabrón.',

      'Crack de puta madre en el sentido del desastre del tramo bajo, [nombre]. El veredicto Aquí, archivo sin apelación.',

      'Has montado el teatro de crack y solo salió el fail del low, [nombre]. El veredicto El ranking firma y listo.',

      'Crack de ranking: el tramo bajo es tu residencia fija, [nombre]. El veredicto Se ve desde el primer mensaje, con el grupo de testigo, asco.',

      'Tu racha baja el promedio del grupo en un solo resultado, [nombre]. El veredicto, sin maquillaje posible, basura.',

      'Crack de las que el modo genio se arrepiente de haberse abierto, [nombre]. El veredicto Eso no se maquilla con ángulo, el veredicto es ese, ridículo.',

      'No es mala racha: eres tú y el low lo dice claro, [nombre]. El veredicto El tramo te nombra sin permiso, hostia puta qué nivel, qué miseria.',

      'Crack de almost eterno: el comando no convierte el casi en victoria, [nombre]. El veredicto, joder. Y, da grima.',

      'Se te cae el personaje de crack en el primer resultado del hilo, [nombre]. El veredicto El material habla solo, qué nivel de pena.',

      'Crack de las que necesitan tutorial de brillar y de dignidad, [nombre]. El veredicto Aquí. Hostia puta, qué nivel, basura.',

      'El low no regala décimas: el marcador habla y tú estás abajo, [nombre]. El veredicto El ranking firma y listo, qué cutre.',

      'Crack de puto almost con firma en cada derrota del chat, [nombre]. El veredicto Se ve desde el primer mensaje, da pena ajena.',

      'Tu racha es contenido de ridículo gratis para el grupo, [nombre]. El veredicto. Hostia puta, qué nivel, qué vacío.',

      'Has convertido el fail de talento en marca personal del low, [nombre]. El veredicto Eso no se maquilla con ángulo, asco, indignante.',

      'Crack de repertorio gastado: las mismas derrotas, el mismo almost, [nombre]. El veredicto gilipollas, qué vergüenza ajena.',

      'Se te nota el desastre hasta en el resultado más antiguo del perfil, [nombre]. El veredicto patético, da vergüenza.',

      'El low te nombra sin suavizar ni media coma del veredicto, [nombre]. El veredicto El material habla solo, fracasado.',

      'Crack de almost: ni el plan B te favorece. Y el chat lo ve, [nombre]. El veredicto Aquí, qué asco de frame, menudo desastre.',

      'Tu presencia es un argumento contra la racha de talento del grupo, [nombre]. El veredicto, y el ranking no miente, qué pena.',

      'Crack de puta pena en el tramo que más se lee del comando, [nombre]. El veredicto Se ve desde el primer mensaje, sin anestesia, patético.',

      'No hay redención en este low: hay marcador, hay número y hay veredicto, [nombre]. El veredicto joder, miserable.',

      'Crack de las que el grupo archiva el fail sin pedir bis, [nombre]. El veredicto Eso no se maquilla con ángulo, nivel sótano puro, qué cringe.',

      'Crack de ranking roto: el sótano del tramo te queda de casa, [nombre]. El veredicto El tramo te nombra sin permiso, sin filtro ni consuelo, patético.',

      'El comando no discute contigo: el low firma y punto, [nombre]. El veredicto No hay segunda lectura útil, diagnóstico cerrado, asco, qué vergüenza.',

      'Crack de las que confunden pose de genio con genio y pierden las dos, [nombre]. El veredicto patético, ridículo.',

      'Tu almost es el epitafio de la racha de talento de hoy, [nombre]. El veredicto Aquí, el bot no regala décimas, ridículo.',

      'Crack de puto desastre documentado. Delante del grupo entero, [nombre]. El veredicto El ranking firma y listo, archivo sin apelación, qué miseria.',

      'Has firmado el fail con cada cero como única firma del low, [nombre]. El veredicto Se ve desde el primer mensaje, da grima.',

      'Crack de superficie suficiente: basta el marcador, sobra el resto, [nombre]. El veredicto, con el grupo de testigo, qué nivel de pena.',

      'El low es tu tramo y. El ranking no ofrece mudanza, [nombre]. El veredicto Eso no se maquilla con ángulo, sin maquillaje posible, basura.',

      'Se te cae el frame de crack solo con cargar el resultado, [nombre]. El veredicto El tramo te nombra sin permiso, el veredicto es ese, qué cutre.',

      'Crack de almost eterno con. El chat de testigo notarial, [nombre]. El veredicto No hay segunda lectura útil, hostia puta qué nivel, da pena ajena.',

      'No es un mal día de resultados: es el nivel y el low te lo cobra, [nombre]. El veredicto El material habla solo, qué vacío.',

      'Crack de puta madre: el tramo bajo no suaviza. El veredicto del talento, [nombre]. El veredicto gilipollas, indignante.',

    ],
    extreme: [
      'Lo que tú haces con facilidad otros lo persiguen toda su vida sin alcanzarlo El ranking firma y listo, coño.',

      'Eres el ejemplo que se cita cuando alguien pregunta cómo se hace bien algo Se ve desde el primer mensaje, cabrón.',

      'Subes el listón de cualquier cosa en la que aparezcas, sin proponértelo. Hostia puta, qué nivel. Hostia, el desastre se explica solo, joder.',

      'Hay gente que lleva diez años intentando llegar donde tú ya estabas hace tres Eso no se maquilla con ángulo, patético.',

      'Tu nivel real se ve en los días malos. En los buenos cualquiera puede parecer bueno El tramo te nombra sin permiso, asco, qué vergüenza ajena.',

      'Eres la persona que la gente quiere tener cerca cuando todo se complica de verdad No hay segunda lectura útil, basura.',

      'Tu palabra vale más que el contrato de mucha gente. Eso se gana, no se hereda El material habla solo, ridículo.',

      'Hay quien presume de lo que hará. Tú ya lo hiciste mientras los demás hablaban Aquí. Hostia puta, qué nivel, menudo desastre.',

      'La consistencia que tienes es justo lo que los demás llevan años intentando fingir El ranking firma y listo, qué asco de frame, qué pena.',

      'Cuando te vas de un equipo, ese equipo nota el hueco durante mucho tiempo Se ve desde el primer mensaje, y el ranking no miente, asco, patético.',

      'Eres el ejemplo que ponen los jefes cuando quieren explicar qué es hacer las cosas bien, sin anestesia, basura.',

      'Tu manera de trabajar redefine lo que el resto consideraba aceptable Eso no se maquilla con ángulo, el chat ya lo sabía, ridículo.',

      'No hay atajo a lo que tú tienes. Lo construiste haciendo lo que otros evitan El tramo te nombra sin permiso, nivel sótano puro, fracasado.',

      'La excelencia que muestras bajo presión es la única que cuenta de verdad, y la tienes No hay segunda lectura útil, sin filtro ni consuelo, qué vergüenza.',

      'Hay gente que persigue tu nivel y nunca entiende que lo tuyo es disciplina, no suerte El material habla solo, diagnóstico cerrado, ridículo.',

      'Lo que tú resuelves dormido, otros lo persiguen despiertos toda su carrera Aquí, y se te nota a la legua, fracasado.',

      'Eres el nombre que ponen los jefes cuando quieren explicar qué es hacer las cosas bien El ranking firma y listo, el bot no regala décimas, qué miseria.',

      'Tu manera de trabajar redefine lo que el resto considera aceptable, sin que lo busques Se ve desde el primer mensaje, archivo sin apelación, da grima.',

      'Hay quien lleva diez años intentando llegar donde tú estabas hace tres sin esfuerzo. Hostia puta, qué nivel, qué nivel de pena.',

      'Tu palabra vale más que el contrato firmado de mucha gente, y eso se gana, no se hereda Eso no se maquilla con ángulo, con el grupo de testigo, asco, basura.',

      'Cuando te vas de un equipo, ese hueco se nota durante mucho tiempo después El tramo te nombra sin permiso, sin maquillaje posible, basura.',

      'La excelencia bajo presión es la única que cuenta, y es justo la que tú tienes de sobra No hay segunda lectura útil, el veredicto es ese, ridículo.',

      'Hay quien presume de lo que hará. Tú ya lo hiciste mientras ellos hablaban de hacerlo El material habla solo, hostia puta qué nivel, qué vacío.',

      'No hay atajo a lo que tú tienes. Lo construiste haciendo lo que otros evitan a diario Aquí. Hostia puta, qué nivel, indignante.',

      'Tu consistencia es exactamente lo que la mayoría lleva años intentando fingir sin lograrlo, mierda. Y, qué vergüenza ajena.',

      'Eres el ejemplo que se cita cuando alguien pregunta cómo se hace algo de verdad bien Se ve desde el primer mensaje, da vergüenza.',

      'Tu nivel real se mide en los días malos, y ahí es justo donde otros desaparecen y tú no. Hostia puta, qué nivel, qué flojo.',

      'La gente quiere tenerte cerca cuando todo se complica, porque saben lo que aportas Eso no se maquilla con ángulo, menudo desastre.',

      'Lo tuyo no es talento de un día. Es un hábito construido que muy pocos consiguen sostener, patético.',

    ],
  },


  feminidad: {
    name: 'femenina',
    goodIsHigh: true,
    // Feminidad is the one positive trait the bot flips for the owner: everyone
    // tends to land mid/high (it's not really a roast target), but the owner —
    // the resident alpha — lands LOW most of the time as the running joke.
    roll: (targetIsOwner) => {
      const r = Math.random();
      const hi = () => 70 + Math.floor(Math.random() * 31);
      const mid = () => 31 + Math.floor(Math.random() * 39);
      const lo = () => Math.floor(Math.random() * 31);
      if (targetIsOwner) {
        if (r < 0.85) return lo();
        if (r < 0.96) return mid();
        return hi();
      }
      // everyone else: usually mid/high
      if (r < 0.45) return hi();
      if (r < 0.90) return mid();
      return lo();
    },
    high: [
      'Tu feminidad no es una construcción ni un esfuerzo. Es quien eres, y la gente lo nota antes de que hables.',

      'La forma en que te mueves y hablas tiene una gracia que muy poca gente consigue aunque lo intente con. El ranking como único testigo del veredicto.',

      'Tu forma de estar con la gente es cálida sin ser invasiva. Ese punto es difícilísimo de encontrar y el contador lo dejó por escrito sin debate.',

      'Tu manera de imponerte es sin ruido. Y sin ruido es como se impone la gente que de verdad puede en el momento más visible del chat.',

      'Elegancia en cómo tratas a la gente, que es el único sitio donde la elegancia cuenta de verdad sin que nadie pudiera fingir que no lo vio.',

      'Elegante en el fondo, no solo en la forma. Y el fondo es lo único que se sostiene con los años con el parte del comando cerrado en firme.',

      'Tienes la sensibilidad de entender antes de que te expliquen. Eso no se enseña en ningún sitio y sin segunda oportunidad en este mensaje.',

      'Tu forma de estar con los demás es cálida y con límites claros. Ese equilibrio es difícilísimo mientras el grupo tomaba nota del resultado.',

      'La delicadeza con la que manejas las cosas dice más de ti que cualquier cosa que puedas decir con números que no admiten recurso de apelación.',

      'Desprendes una calidez que hace que la gente quiera quedarse cerca sin saber explicar por qué y el historial del comando queda de testigo.',

      'Elegante sin esfuerzo. La gente que se esfuerza mucho nunca llega a donde tú estás sin querer delante de quien miraba. El ranking en ese momento.',

      'Tu forma de resolver conflictos es sin confrontación y encima funciona. Eso es habilidad pura con el sistema firmando debajo sin pedir aclaración.',

      'Tienes la mezcla exacta de dulzura, criterio y firmeza. Las tres, y en la proporción correcta delante de todo el hilo sin posibilidad de borrado.',

      'Feminidad de la que ordena, cuida y sostiene. Las tres cosas a la vez y sin esfuerzo aparente con. El ranking como único testigo del veredicto.',

      'Tu elegancia no depende de arreglarte. Está en cómo hablas y en cómo miras, y eso no se quita y el contador lo dejó por escrito sin debate.',

      'Tu forma de estar aporta sin ocupar espacio. Ese equilibrio se le escapa a casi todo el mundo en el momento más visible del chat.',

      'Tienes ese equilibrio entre dulzura y carácter que define a la mujer verdaderamente elegante sin que nadie pudiera fingir que no lo vio.',

      'Elegante en el gesto pequeño, que es donde se ve la de verdad. Lo grande lo finge cualquiera con el parte del comando cerrado en firme.',

      'Tienes una presencia que se echa de menos cuando no estás. Ese es el mejor indicador que hay y sin segunda oportunidad en este mensaje.',

      'Tu forma de tratar a la gente hace que quieran volver a estar contigo. Y eso ya lo dice todo mientras el grupo tomaba nota del resultado.',

      'Tu presencia hace que un sitio tenso deje de estarlo. Y nadie sabe explicar exactamente cómo con números que no admiten recurso de apelación, patético.',

      'Tienes una presencia que suaviza a la gente difícil. Y eso solo lo consigue quien tiene peso y el historial del comando queda de testigo, miserable.',

      'Tu forma de hablar baja el tono de cualquier conversación. Y todos lo agradecen sin decirlo delante de quien miraba. El ranking en ese momento, qué cringe.',

      'Tienes la capacidad de suavizar a la gente difícil. Y eso solo lo consigue quien tiene peso con el sistema firmando debajo sin pedir aclaración, da asco.',

      'Tienes la clase de feminidad que no depende de nadie ni de nada. Es tuya y se sostiene sola delante de todo el hilo sin posibilidad de borrado, qué vergüenza.',

      'Tienes una manera de estar que hace que la gente se sienta acompañada sin sentirse invadida con. El ranking como único testigo del veredicto, ridículo.',

      'Tienes ese equilibrio entre fuerza y suavidad que define lo que es verdaderamente elegante y el contador lo dejó por escrito sin debate, fracasado.',

      'La forma en que te relacionas con los demás tiene una gracia que hace que todo fluya mejor en el momento más visible del chat, qué miseria.',

      'Tienes el tipo de feminidad que no depende de la edad ni de la moda. Estructural y estable sin que nadie pudiera fingir que no lo vio, da grima.',

      'Tu manera de cuidar a la gente es discreta y constante. Nadie la nombra y todos la sienten con el parte del comando cerrado en firme, qué nivel de pena.',

      'Tienes esa forma de cuidar sin agobiar. Y ese equilibrio se le escapa a casi todo el mundo y sin segunda oportunidad en este mensaje, basura.',

      'Tu manera de moverte por el mundo es serena. Y la serenidad es la forma más alta de fuerza mientras el grupo tomaba nota del resultado, qué cutre.',

      'Tu presencia hace que el ambiente mejore sin que nadie sepa señalar exactamente qué cambió con números que no admiten recurso de apelación, da pena ajena.',

      'Tienes intuición social muy fina y encima la usas para bien. Las dos cosas juntas escasean y el historial del comando queda de testigo, qué vacío.',

      'Elegancia en el tono, en el gesto y en el tiempo. Las tres cosas ajustadas a la perfección delante de quien miraba. El ranking en ese momento, indignante.',

      'Hay una suavidad en tu forma de tratar a la gente que se queda grabada en quien la recibe con el sistema firmando debajo sin pedir aclaración, qué vergüenza ajena.',

      'La gracia con la que llevas cada situación dice más de ti que cualquier palabra que digas delante de todo el hilo sin posibilidad de borrado, da vergüenza.',

      'Tu presencia da seguridad a la gente que tienes cerca. Y esa es la forma más alta de esto con. El ranking como único testigo del veredicto, qué flojo.',

      'Elegancia interior que se refleja hacia fuera sin que tengas que hacer absolutamente nada y el contador lo dejó por escrito sin debate, menudo desastre.',

      'Feminidad que se transmite en el trato, no en la imagen. Y el trato es lo que se recuerda en el momento más visible del chat, qué pena.',

      'Tienes intuición, tacto y criterio. Las tres juntas hacen que se te escuche sin discusión sin que nadie pudiera fingir que no lo vio, patético.',

      'Tu forma de tratar los conflictos evita que crezcan. Y evitar es más difícil que resolver con el parte del comando cerrado en firme, miserable.',

      'Tu forma de hablar hace que la gente quiera seguir escuchando. Eso ya casi nadie lo tiene y sin segunda oportunidad en este mensaje, qué cringe.',

      'Tienes una elegancia que no se aprende en ningún sitio. O se nace con ella o no se tiene mientras el grupo tomaba nota del resultado, da asco.',

      'Hay personas que pasan la vida intentando proyectar lo que tú emites sin ningún esfuerzo con números que no admiten recurso de apelación, qué vergüenza.',

      'Proyectas una serenidad femenina que hace que todo a tu alrededor se sienta más en orden y el historial del comando queda de testigo, ridículo.',

      'La forma en que combinas firmeza y dulzura es justo lo que la hace tan difícil de imitar delante de quien miraba. El ranking en ese momento, fracasado.',

      'Tu feminidad funciona igual de bien arreglada que recién levantada, y eso es lo más raro con el sistema firmando debajo sin pedir aclaración, qué miseria.',

      'Tienes esa mezcla de dulzura y firmeza que descoloca a todo el mundo. Y funciona siempre delante de todo el hilo sin posibilidad de borrado, da grima.',

      'Tu feminidad es de las que ordenan sin mandar. Un tipo de autoridad que casi nadie tiene con. El ranking como único testigo del veredicto, qué nivel de pena.',

    ],
    mid: [
      'Feminidad de cobertura irregular: zonas con señal y zonas muertas, [nombre]. Gilipollas. Se nota y no hay vuelta atrás, gilipollas.',

      'Ni ejemplo de gracia ni de torpeza sostenida: caso clínico del promedio. Gilipollas. Se nota y no hay vuelta atrás, gilipollas.',

      'La gracia te visita sin avisar y se va igual: no hay residencia fija. Gilipollas. Se nota y no hay vuelta atrás, gilipollas.',

      'Estás donde el análisis se rinde un poco: ni alto ni bajo, oscilante. Gilipollas. Se nota y no hay vuelta atrás, gilipollas.',

      'Feminidad de menú del día: a veces hay plato y a veces solo pan. Gilipollas. Se nota y no hay vuelta atrás, gilipollas.',

      'Un buen momento no lava la semana y tú vives de momentos. Gilipollas. Se nota y no hay vuelta atrás, gilipollas.',

      'El grupo ya no celebra el acierto ni comenta el fallo: ambos son esperables. Desperdicio Se nota y no hay vuelta atrás, desperdicio.',

      'Ni te hundes del todo ni flotas con estilo: flotas a ras de agua, [nombre]. Desperdicio Se nota y no hay vuelta atrás, desperdicio.',

      'La delicadeza te sale cuando no la buscas y falla cuando la fuerzas: al revés. Fracasado. Se nota y no hay vuelta atrás, fracasado.',

      'El grupo espera el zigzag y el zigzag llega: cumples la expectativa media. Desperdicio Se nota y no hay vuelta atrás, desperdicio.',

      'Hay flashes de finura y luego kilómetros de trámite: el flash no compensa el viaje, [nombre]. Gilipollas.',

      'Sin material para fanatismo ni desprecio, [nombre]. Gilipollas. Se nota y no hay vuelta atrás, gilipollas.',

      'Tu presencia es un termómetro que no se decide: ni fiebre ni normalidad clara. Patético. Se nota y no hay vuelta atrás, patético.',

      'A ratos elegante y a ratos todo lo contrario: la media te sostiene por los pelos. Mierda. Se nota y no hay vuelta atrás, mierda.',

      'Estás en el tramo donde a veces se nota y a veces no: el grupo ya no apuesta. Patético. Se nota y no hay vuelta atrás, patético.',

      'La delicadeza te salva el día a veces y te abandona en el peor momento otras. Pringado. Se nota y no hay vuelta atrás, pringado.',

      'Un día el aire y al siguiente el trámite: el ranking te pone en el medio por eso, [nombre]. Gilipollas.',

      'A ratos el silencio y a ratos el ruido de no saber qué hacer con las manos. Fracasado. Se nota y no hay vuelta atrás, fracasado.',

      'La feminidad te queda a ratos como un traje que a veces cierra y a veces no. Patético. Se nota y no hay vuelta atrás, patético.',

      'Un buen gesto no lava una semana de bloque y tú apuestas al gesto, [nombre]. Ridículo. Se nota y no hay vuelta atrás, ridículo.',

      'Feminidad de interruptor de pasillo: se enciende al pasar y se apaga solo. Vergüenza Se nota y no hay vuelta atrás, vergüenza.',

      'Feminidad a medias: ni se afirma ni se niega del todo, limbo del gesto y de la voz. Coño. Se nota y no hay vuelta atrás, coño.',

      'El matiz te dura lo que dura una frase buena: luego vuelve el bloque, [nombre]. Mierda. Se nota y no hay vuelta atrás, mierda.',

      'Estás en el tramo del casi y del no del todo: residencia permanente en el umbral. Cutre Se nota y no hay vuelta atrás, cutre.',

      'La delicadeza te dura lo que dura la primera impresión: luego el trámite. Fracasado. Se nota y no hay vuelta atrás, fracasado.',

      'Estás a un paso de la presencia y a un paso de la ausencia: no das ninguno fijo. Joder. Se nota y no hay vuelta atrás, joder.',

      'La feminidad te da citas sueltas y no relación: soltería crónica del concepto. Basura. Se nota y no hay vuelta atrás, basura.',

      'La gracia te dura lo que dura una buena frase: luego el bloque vuelve, [nombre]. Cutre Se nota y no hay vuelta atrás, cutre.',

      'El grupo te toma en modo espera activa: a ver qué versión carga, [nombre]. Ridículo. Se nota y no hay vuelta atrás, ridículo.',

      'Hay momentos en que el aire cambia y momentos en que no pasa nada: ratio pobre. Joder. Se nota y no hay vuelta atrás, joder.',

      'Tu gracia es un invitado que no confirma asistencia: a veces viene, [nombre]. Mierda. Se nota y no hay vuelta atrás, mierda.',

      'La delicadeza te sale a ratos y se te atasca a otros: motor irregular. Vergüenza Se nota y no hay vuelta atrás, vergüenza.',

      'Un gesto bueno no hace temporada y tú vives de gestos sueltos, [nombre]. Patético. Se nota y no hay vuelta atrás, patético.',

      'El matiz no es casa: es hotel de paso y tú no tienes reserva fija, [nombre]. Cabrón. Se nota y no hay vuelta atrás, cabrón.',

      'El grupo no sabe si felicitarte o mirar para otro lado: esa duda es tu tramo. Cutre Se nota y no hay vuelta atrás, cutre.',

      'La feminidad te conoce de vista y no de trato continuo: relación fría. Patético. Se nota y no hay vuelta atrás, patético.',

      'Tu presencia femenina es un proyecto a tiempo parcial: sin jornada completa. Cutre Se nota y no hay vuelta atrás, cutre.',

      'La delicadeza te visita sin equipaje: se va ligera y pronto, [nombre]. Patético. Se nota y no hay vuelta atrás, patético.',

      'Hay días de sí y días de no: el promedio es un quizás, [nombre]. Desperdicio Se nota y no hay vuelta atrás, desperdicio.',

      'Tu feminidad es un borrador con demasiadas tachaduras: se lee con esfuerzo. Joder. Se nota y no hay vuelta atrás, joder.',

      'Feminidad de menú degustación sin plato fuerte: bocados y poco más, [nombre]. Coño. Se nota y no hay vuelta atrás, coño.',

      'Ni te hundes ni flotas con estilo: flotas a media agua sin dirección. Ridículo. Se nota y no hay vuelta atrás, ridículo.',

      'Estás en el medio con picos cortos: los picos no mueven la media, [nombre]. Joder. Se nota y no hay vuelta atrás, joder.',

      'La gracia te visita en horario de oficina y se va al cerrar: sin extras. Basura. Se nota y no hay vuelta atrás, basura.',

      'Ni estable ni caótica de verdad: tibia en las dos direcciones, [nombre]. Basura. Se nota y no hay vuelta atrás, basura.',

      'A ratos el silencio te queda y a ratos es solo que no tienes qué decir. Mierda. Se nota y no hay vuelta atrás, mierda.',

      'Estás en el tramo donde. El bot se limita a decir depende del día, [nombre]. Asco. Se nota y no hay vuelta atrás, asco.',

      'La gracia te salva el rato y te abandona el día: prioridades raras. Pringado. Se nota y no hay vuelta atrás, pringado.',

      'Tu feminidad es un documento sin firmar: borrador eterno, [nombre]. Pringado. Se nota y no hay vuelta atrás, pringado.',

      'Tu feminidad es un wifi de centros comerciales: a veces pilla a veces no. Asco. Se nota y no hay vuelta atrás, asco.',

      'Estás en el medio del medio con rachas cortas hacia arriba y hacia abajo. Coño. Se nota y no hay vuelta atrás, coño.',

      'Ni te pueden poner de ejemplo ni de antiejemplo: eres el caso del medio. Coño. Se nota y no hay vuelta atrás, coño.',

      'Tu gracia es un invitado que a veces llega tarde y a veces no llega. Cabrón. Se nota y no hay vuelta atrás, cabrón.',

      'La feminidad te trata como a un cliente ocasional: sin fidelización. Cabrón. Se nota y no hay vuelta atrás, cabrón.',

      'La feminidad te trata como cliente ocasional sin programa de puntos. Cabrón. Se nota y no hay vuelta atrás, cabrón.',

      'El grupo te lee en modo espera: a ver qué versión toca hoy, [nombre]. Cutre Se nota y no hay vuelta atrás, cutre.',

      'Feminidad de ensayo general: nunca estreno, siempre prueba, [nombre]. Joder. Se nota y no hay vuelta atrás, joder.',

      'Un día el aire y al siguiente nada: el ranking promedia y te deja aquí. Coño. Se nota y no hay vuelta atrás, coño.',

      'Residencia en el umbral: ni dentro ni fuera del concepto. Desperdicio Se nota y no hay vuelta atrás, desperdicio.',

      'Feminidad de señal 3G en zona rural: a veces carga a veces no. Ridículo. Se nota y no hay vuelta atrás, ridículo.',

      'Hay luz y hay sombra en ciclos cortos: el ciclo es tu marca, [nombre]. Asco. Se nota y no hay vuelta atrás, asco.',

      'No hay línea clara: hay zigzag y el zigzag cansa al que mira. Ridículo. Se nota y no hay vuelta atrás, ridículo.',

      'Ni estable en la gracia ni estable en la falta: inestable en las dos. Asco. Se nota y no hay vuelta atrás, asco.',

      'La feminidad te da citas y no noviazgo: soltera del concepto. Patético. Se nota y no hay vuelta atrás, patético.',

      'No hay firma: hay borradores y los borradores se acumulan. Vergüenza Se nota y no hay vuelta atrás, vergüenza, qué cutre.',

      'El matiz no ha firmado contrato indefinido contigo: es temporal. Mierda. Se nota y no hay vuelta atrás, da pena ajena.',

      'Ni ejemplo claro ni antiejemplo claro: caso del promedio tembloroso. Coño. Se nota y no hay vuelta atrás, qué vacío.',

      'No hay firma estable: hay intentos y los intentos se notan. Pringado. Se nota y no hay vuelta atrás, pringado, indignante.',

      'Estás a medias entre la presencia y la ausencia de lo femenino. Cabrón. Se nota y no hay vuelta atrás, qué vergüenza ajena.',

      'El matiz no tiene horario en tu calendario: es espontáneo y raro. Joder. Se nota y no hay vuelta atrás, da vergüenza.',

      'Ni desastre ni acierto sostenido: oscilación de baja amplitud. Mierda. Se nota y no hay vuelta atrás, qué flojo.',

      'Feminidad de ensayo indefinido: el estreno no tiene fecha. Pringado. Se nota y no hay vuelta atrás, pringado, menudo desastre.',

      'El matiz parpadea como un neón a punto de fundirse: luz dudosa. Joder. Se nota y no hay vuelta atrás, qué pena.',

      'Ni altar ni sótano: escalera de servicio, [nombre]. Desperdicio Se nota y no hay vuelta atrás, desperdicio, patético.',

      'Tu gracia confirma asistencia a veces: RSVP irregular. Fracasado. Se nota y no hay vuelta atrás, fracasado.',

      'Tu presencia femenina es a tiempo parcial sin opción a completa. Asco. Se nota y no hay vuelta atrás, asco, qué cringe.',

      'El matiz no tiene horario fijo en tu casa: llega cuando quiere. Coño. Se nota y no hay vuelta atrás, da asco.',

      'Un gesto no hace presencia y tú coleccionas gestos sueltos. Cabrón. Se nota y no hay vuelta atrás, qué vergüenza.',

      'Estás en el tramo del depende y el depende es. El veredicto. Basura. Se nota y no hay vuelta atrás, basura.',

      'Estás a medias y las medias son tu tramo natural, [nombre]. Mierda. Se nota y no hay vuelta atrás, fracasado.',

      'Hay flashes y hay apagones: el promedio de luz es este gris. Cutre Se nota y no hay vuelta atrás, cutre, qué miseria.',

      'La feminidad te da franjas horarias: fuera de franja nada. Mierda. Se nota y no hay vuelta atrás, da grima.',

      'El grupo espera el zigzag y no se decepciona: cumples. Ridículo. Se nota y no hay vuelta atrás, ridículo.',

      'Tu feminidad en silencio con mensajes raros, [nombre]. Patético. Se nota y no hay vuelta atrás, patético.',

      'El centro del espectro es poco comercial y es tuyo. Fracasado. Se nota y no hay vuelta atrás, fracasado.',

      'La gracia salva el rato y pierde el día, [nombre]. Vergüenza Se nota y no hay vuelta atrás, vergüenza, da pena ajena.',

      'Un día tienes el matiz y al siguiente se te olvida: inconsistencia hecha presencia, [nombre]. Cabrón, qué vacío.',

      'Feminidad de termostato roto: ni frío estable ni calor estable, oscila y molesta, [nombre]. Pringado, indignante.',

      'El grupo ya no se ilusiona con el flash: sabe que se apaga. Asco. Se nota y no hay vuelta atrás, asco, qué vergüenza ajena.',

      'Ni copa ni toalla tirada: guardas y sigues. Gilipollas. Se nota y no hay vuelta atrás, gilipollas. con el parte del comando cerrado en firme, da vergüenza.',

      'Ni silencio de gesta ni de vergüenza, [nombre]. Pringado. Se nota y no hay vuelta atrás, pringado. Y sin segunda oportunidad en este mensaje, qué flojo.',

      'Jugada más de presencia sin highlight. Gilipollas. Se nota y no hay vuelta atrás, gilipollas mientras el grupo tomaba nota del resultado, menudo desastre.',

      'El grupo no apuesta fuerte, [nombre]. Gilipollas. Se nota y no hay vuelta atrás, gilipollas. con números que no admiten recurso de apelación, qué pena.',

      'Un día el tono y al siguiente el golpe seco: el promedio es una línea temblorosa, [nombre]. Basura. Y el historial del comando queda de testigo, patético.',

      'El medio te queda como ropa lavada: sin color fuerte. Cabrón. Se nota y no hay vuelta atrás, cabrón delante de quien miraba. El ranking en ese momento.',

      'Feminidad sin fecha de estreno: ensayo eterno. Vergüenza Se nota y no hay vuelta atrás, vergüenza con el sistema firmando debajo sin pedir aclaración, qué cringe.',

      'Ni llegas con gloria ni te caes antes: terminas. Pringado. Se nota y no hay vuelta atrás, pringado.delante de todo el hilo sin posibilidad de borrado, da asco.',

      'Va y viene según el día: ni tú sabes cuál toca hoy y la media te salva por poco, [nombre]. Joder con. El ranking como único testigo del veredicto, qué vergüenza.',

      'A veces el silencio te queda bien y a veces es solo vacío: la diferencia se nota poco. Fracasado. Y el contador lo dejó por escrito sin debate.',

      'Ni te consolidan en la gracia ni te descartan del todo: limbo administrativo, [nombre]. Pringado en el momento más visible del chat, fracasado.',

    ],
    low: [
      'Te mueves como si el espacio te debiera algo, [nombre]. Gilipollas. La evidencia está en cada gesto con números que no admiten recurso de apelación.',

      'Feminidad no es volumen de voz bajo, [nombre]. Gilipollas. El grupo ya tomó nota hace tiempo delante de quien miraba. El ranking en ese momento.',

      'Idea de delicadeza es no gritar, [nombre]. Gilipollas. Y no es un día malo: es el promedio con. El ranking como único testigo del veredicto.',

      'La gracia no te visita ni en sueños, [nombre]. Gilipollas. Y no es un día malo: es el promedio y el historial del comando queda de testigo.',

      'Delicadeza te evita en sueños y vigilia, [nombre]. Gilipollas. La evidencia está en cada gesto y sin segunda oportunidad en este mensaje.',

      'Menos finura que letra pequeña de contrato, [nombre]. Gilipollas. La evidencia está en cada gesto en el momento más visible del chat.',

      'Cero encanto clásico ni moderno, [nombre]. Gilipollas. No hay debate posible con este resultado en el momento más visible del chat.',

      'Cero espontánea en el historial del grupo, [nombre]. Gilipollas. Se nota a la legua y no hay filtro que lo tape.',

      'Generas ruido no atención de presencia, [nombre]. Gilipollas. Se nota a la legua y no hay filtro que lo tape.',

      'Cero de lo que hace ajustar sin pedirlo, [nombre]. Gilipollas. No hay debate posible con este resultado.',

      'Transparencia de falta de gracia, [nombre]. Gilipollas. Se nota a la legua y no hay filtro que lo tape.',

      'Tienes la delicadeza de una hormigonera arrancando un lunes a las siete. De femenina no tienes ni el envoltorio, y el envoltorio venía de serie, basura.',

      'Proyectas la suavidad de un bloque de hormigón recién fraguado. Darte la mano debe ser como estrecharle el saludo a un bordillo. Frío, áspero y sin retorno, basura.',

      'Tu elegancia vive exclusivamente dentro de tu cabeza, donde nadie más puede entrar a verificarla. Fuera, eres tan femenina como un camión de basura dando marcha atrás.',

      'Te mueves con la elegancia de un armario que arrastran por un parqué. Cada gesto tuyo chirría tan fuerte que la gente busca instintivamente el origen del ruido, basura.',

      'Proyectas la delicadeza de una excavadora en turno doble. De femenina tienes lo mismo que yo de astronauta: el sueño bonito y ni una sola prueba que lo respalde, basura.',

      'Tu elegancia tiene exactamente la misma documentación verificable que un unicornio: ninguna. Pura fantasía de cuento. En el mundo real, eres ordinariez con patas, basura.',

      'Elegancia que no se ha cruzado jamás contigo, [nombre]. Mierda. El grupo ya tomó nota hace tiempo con el sistema firmando debajo sin pedir aclaración.',

      'Intento de delicada que se nota el esfuerzo, [nombre]. Joder. Y no es un día malo: es el promedio sin que nadie pudiera fingir que no lo vio.',

      'Cero gracia cero matiz cero suavidad, [nombre]. Cabrón. No hay debate posible con este resultado mientras el grupo tomaba nota del resultado.',

      'Ocupación militar del teclado no presencia, [nombre]. Basura. El grupo ya tomó nota hace tiempo delante de quien miraba. El ranking en ese momento.',

      'Finura es no insultar en voz alta y ni eso, [nombre]. Cabrón. El grupo ya tomó nota hace tiempo y el contador lo dejó por escrito sin debate.',

      'Gesto suave con el esfuerzo en los hombros, [nombre]. Ridículo. Y no es un día malo: es el promedio con el parte del comando cerrado en firme.',

      'Delicada y tú no compartís frase en serio, [nombre]. Coño. Y no es un día malo: es el promedio con números que no admiten recurso de apelación.',

      'Intento de finura da vergüenza ajena, [nombre]. Basura. Y no es un día malo: es el promedio con el sistema firmando debajo sin pedir aclaración.',

      'Feminidad de catálogo mal traducido, [nombre]. Mierda. No hay debate posible con este resultado con. El ranking como único testigo del veredicto.',

      'Menos elegancia que aparcamiento en doble fila, [nombre]. Coño. La evidencia está en cada gesto y el contador lo dejó por escrito sin debate.',

      'Foco plano y cero misterio, [nombre]. Patético. Se nota a la legua y no hay filtro que lo tape delante de quien miraba. El ranking en ese momento.',

      'Escaneo no mirada que se queda, [nombre]. Mierda. Se nota a la legua y no hay filtro que lo tape y el contador lo dejó por escrito sin debate.',

      'Tono suave se quiebra a la tercera palabra, [nombre]. Patético. Y no es un día malo: es el promedio sin que nadie pudiera fingir que no lo vio.',

      'Números rojos sin plan de viabilidad, [nombre]. Gilipollas. No hay debate posible con este resultado.',

      'Suavidad y tú os evitáis en pasillos, [nombre]. Ridículo. Y no es un día malo: es el promedio delante de quien miraba. El ranking en ese momento.',

      'Todo es esfuerzo. Y se nota, [nombre]. Basura. Se nota a la legua y no hay filtro que lo tape con el sistema firmando debajo sin pedir aclaración.',

      'Disfraz de finura se cae a la primera risa, [nombre]. Coño. Y no es un día malo: es el promedio con. El ranking como único testigo del veredicto.',

      'Golpe seco sin magia de detalle, [nombre]. Cabrón. Se nota a la legua y no hay filtro que lo tape y el contador lo dejó por escrito sin debate.',

      'Cero suavidad en trato gesto y silencio, [nombre]. Mierda. No hay debate posible con este resultado con el parte del comando cerrado en firme.',

      'Dos líneas paralelas que no se cruzan, [nombre]. Patético. El grupo ya tomó nota hace tiempo con números que no admiten recurso de apelación.',

      'Luz de neón barato cero matiz, [nombre]. Patético. Se nota a la legua y no hay filtro que lo tape con. El ranking como único testigo del veredicto.',

      'La buscan en tutoriales no en el cuerpo, [nombre]. Basura. No hay debate posible con este resultado y el contador lo dejó por escrito sin debate.',

      'Silencio de quien mira el reloj, [nombre]. Mierda. Se nota a la legua y no hay filtro que lo tape sin que nadie pudiera fingir que no lo vio.',

      'Pliegue que no se sostiene, [nombre]. Coño. Se nota a la legua y no hay filtro que lo tape delante de quien miraba. El ranking en ese momento.',

      'Cero suavidad más allá de no gritar, [nombre]. Patético. No hay debate posible con este resultado con. El ranking como único testigo del veredicto.',

      'Tensión y disfraz no comodidad, [nombre]. Joder. Se nota a la legua y no hay filtro que lo tape mientras el grupo tomaba nota del resultado.',

      'El intento delata más que el abandono, [nombre]. Joder. Y no es un día malo: es el promedio con. El ranking como único testigo del veredicto.',

      'Superficie dura y sin barniz, [nombre]. Cabrón. Se nota a la legua y no hay filtro que lo tape y el historial del comando queda de testigo.',

      'Discusión con la idea de lo femenino, [nombre]. Patético. Y no es un día malo: es el promedio mientras el grupo tomaba nota del resultado.',

      'Golpes secos y cero cadencia, [nombre]. Basura. Se nota a la legua y no hay filtro que lo tape y sin segunda oportunidad en este mensaje.',

      'Proyecto de feminidad abandonado a medias, [nombre]. Basura. El grupo ya tomó nota hace tiempo y sin segunda oportunidad en este mensaje.',

      'Feminidad no es filtro que te puedas poner, [nombre]. Coño. El grupo ya tomó nota hace tiempo y sin segunda oportunidad en este mensaje.',

      'La feminidad te mira y sigue de largo, [nombre]. Patético. La evidencia está en cada gesto sin que nadie pudiera fingir que no lo vio.',

      'Feminidad de las que el low te deja en el sótano del ranking sin debate, [nombre]. No hay segunda lectura útil, asco.',

      'Tienes más pretensión de mujer que sustancia y el low lo grita, [nombre]. El material habla solo, basura.',

      'Feminidad de manual fallido: ni el gesto te salva ni la pose colabora, [nombre]. Aquí. Hostia puta, qué nivel.',

      'Se te nota el almost de mujer hasta en el mensaje más trabajado, [nombre]. El ranking firma y listo, fracasado.',

      'Feminidad de fondo de ranking: siempre el mismo fail y cero chispa, [nombre]. Se ve desde el primer mensaje, qué asco de frame.',

      'Has convertido la falta de feminidad real en identidad del low, [nombre]., y el ranking no miente, mierda.',

      'Feminidad sin el barniz: solo teatro y el low lo documenta, [nombre]. Eso no se maquilla con ángulo, sin anestesia, coño.',

      'El listón de lo femenino lo miras desde abajo y no has subido, [nombre]. El tramo te nombra sin permiso, el chat ya lo sabía, cabrón.',

      'Feminidad con el bucle eterno del mismo error en bucle, jodere, joder. Hostia puta, qué nivel. Hostia, el desastre se explica solo, joder.',

      'Se te oye el eco del fail hasta en los neutros del chat, [nombre]. El material habla solo, sin filtro ni consuelo, patético.',

      'Feminidad de historial público: no hace falta zoom, se lee en la superficie, [nombre]. Aquí, diagnóstico cerrado, asco.',

      'Tienes más pretensión que magnetismo femenino y el low no se traga el cuento, [nombre]. El ranking firma y listo, y se te nota a la legua, basura.',

      'Feminidad cutre: ni el caos tiene estilo ni el desastre tiene misterio, [nombre]. Se ve desde el primer mensaje, el bot no regala décimas, ridículo.',

      'Has hecho del bajo listón de mujer tu residencia en el low, [nombre]., archivo sin apelación, fracasado.',

      'Feminidad de las que el mute ajeno lee como misterio y es solo desinterés, [nombre]. Eso no se maquilla con ángulo.',

      'El asco. No es bullying: es el diagnóstico del low del comando, [nombre]. El tramo te nombra sin permiso, con el grupo de testigo.',

      'Feminidad constante: la única racha es la de no generar presencia real, [nombre]. No hay segunda lectura útil, sin maquillaje posible, coño.',

      'Se te nota la prisa por parecer y cero plan de ser de verdad, [nombre]. El material habla solo, el veredicto es ese, cabrón.',

      'Feminidad de cartel de aviso: se lee de lejos y nadie quiere el producto, [nombre]. Aquí, hostia puta qué nivel.',

      'No hay misterio interesante: hay previsible y flojo, el combo del low, [nombre]. El ranking firma y listo, joder.',

      'Tienes el historial de un local cerrado por falta de clientela de respeto, [nombre]. Se ve desde el primer mensaje, mierda.',

      'Feminidad de inercia: el grupo te soporta por costumbre, no por presencia, [nombre]. Hostia puta, qué nivel.',

      'El recato de lo femenino te queda lejos y la distancia es rechazo, [nombre]. Eso no se maquilla con ángulo, cabrón.',

      'Feminidad de ranking: bajas la media del tramo con constancia de almost, [nombre]. El tramo te nombra sin permiso, gilipollas.',

      'Has convertido el almost de mujer en carnet del low, [nombre].coño. No hay segunda lectura útil, patético.',

      'Feminidad de estribillo que mancha más con cada pose del mismo fail, [nombre]. El material habla solo, asco.',

      'Se te nota el hábito de empujar cada foto hacia el mismo almost, [nombre]. Aquí. Hostia puta, qué nivel.',

      'La compostura de lo femenino no te reconoce y tú no has buscado el espejo, [nombre]. El ranking firma y listo, ridículo.',

      'Feminidad de fondo permanente: el low no es un mal día, es el nivel, [nombre]. Se ve desde el primer mensaje, fracasado.',

      'No es mala suerte de pose: es patrón y el low te lo cobra, [nombre]., qué asco de frame. Hostia puta, qué nivel.',

      'Tienes más grasa de pretensión que un freidor al cierre, [nombre]. Eso no se maquilla con ángulo, y el ranking no miente, asco.',

      'Feminidad de ceja ajena levantada y respeto en el sótano, [nombre]. El tramo te nombra sin permiso, sin anestesia, basura.',

      'El promedio de este tramo es el tuyo: el suelo del low, [nombre]. No hay segunda lectura útil, el chat ya lo sabía, ridículo.',

      'Has convertido la falta de chispa en identidad y no hay detergente, [nombre]. El material habla solo, nivel sótano puro, fracasado.',

      'Feminidad cutre y sin complejo: el complejo pediría espejo y no lo hay, [nombre]. Aquí, sin filtro ni consuelo, joder.',

      'Se te oye el masticar del listón bajo hasta en los neutros, [nombre]. El ranking firma y listo, diagnóstico cerrado, mierda.',

      'La dignidad de lo femenino no te coge el teléfono: el buzón está lleno de noes, [nombre]. Se ve desde el primer mensaje, y se te nota a la legua, coño.',

      'Feminidad de letrero grasiento: se lee de lejos y no invita a entrar, [nombre]., el bot no regala décimas, cabrón.',

      'No hay misterio de almost con estilo: hay lo previsible y el low lo nombra, [nombre]. Eso no se maquilla con ángulo, archivo sin apelación, gilipollas.',

      'Tienes el historial de un fregadero abandonado desde el domingo, [nombre]. El tramo te nombra sin permiso.',

      'Feminidad de malinterpretar el silencio como respeto al underdog, [nombre]. No hay segunda lectura útil, con el grupo de testigo, asco.',

      'El grupo paga tu rastro de pretensión en cuotas diarias de hastío, [nombre]. El material habla solo, sin maquillaje posible, basura.',

      'Has dejado el chat como vestuario de derrota de presencia, [nombre]. Aquí, el veredicto es ese, ridículo.',

      'Feminidad de estribillo sin punto final limpio ni redención, [nombre]. El ranking firma y listo, hostia puta qué nivel.',

      'Se te nota el peso de arrastrar el mismo almost por cada hilo, [nombre]. Se ve desde el primer mensaje, joder.',

      'La compostura cruza de acera cuando te ve en el low del comando, [nombre]. Hostia puta, qué nivel. Hostia, el desastre se explica solo, joder.',

      'Feminidad de feria: ruido de fail, suelo peor y cero ganas de volver, [nombre]. Eso no se maquilla con ángulo, coño.',

      'Se te ve venir el almost en la primera miniatura del estado, [nombre]. El tramo te nombra sin permiso, cabrón.',

      'La dignidad del tramo no para: tú eres el tráfico del arcén, [nombre]. No hay segunda lectura útil, gilipollas.',

      'Feminidad de superficie suficiente: no hace falta abrir el vestuario, huele a fail, [nombre]. Patético.',

      'No hay barniz que salve: hay almost puro y el low lo cobra, [nombre]. Aquí. Hostia puta, qué nivel. Hostia, el desastre se explica solo, joder.',

      'Feminidad de puta madre en el sentido del desastre: el low no suaviza la falta de presencia, [nombre]. Basura.',

      'Tu almost de mujer es el gag del tramo. Y el grupo no pide replay, [nombre]. Se ve desde el primer mensaje, ridículo.',

      'Feminidad de las que el respeto ajeno te debe una hostia y. El ranking te la cobra, [nombre]. Fracasado.',

      'Se te cae el personaje de mujer solo con abrir la cámara, [nombre]. Eso no se maquilla con ángulo, qué asco de frame.',

      'Feminidad de almost eterno: esta vez tampoco fue la excepción, [nombre]. El tramo te nombra sin permiso, y el ranking no miente, mierda.',

      'No hay redención en este low: hay veredicto y te nombra. Sin filtro, [nombre]. No hay segunda lectura útil, sin anestesia, coño.',

      'Feminidad con más filtros que sustancia y aun así no cuela en el low, [nombre]. El material habla solo, el chat ya lo sabía, cabrón.',

      'El low te ha puesto en tu sitio: abajo del todo de la presencia del grupo, [nombre]. Aquí, nivel sótano puro, gilipollas.',

      'Feminidad de las que juraban que esta vez el gesto sí, y no, [nombre]. El ranking firma y listo, sin filtro ni consuelo, patético.',

      'Tu almost es el contenido gratis de ridículo del hilo, [nombre]. Se ve desde el primer mensaje, diagnóstico cerrado.',

      'Feminidad de ranking roto: el número bajo te queda de apodo, [nombre]., y se te nota a la legua, basura.',

      'Se te ve el fail desde el primer mensaje del comando, [nombre]. Eso no se maquilla con ángulo, el bot no regala décimas, ridículo.',

      'Feminidad de repertorio: siempre la misma pose de almost y cero plan B, [nombre]. El tramo te nombra sin permiso, archivo sin apelación, fracasado.',

      'El asco del low resume el tramo y el resto desarrolla el diagnóstico, [nombre]. No hay segunda lectura útil.',

      'Feminidad de puto almost: ni el low light te favorece y. El ranking lo grita, [nombre]. El material habla solo, con el grupo de testigo.',

      'Has montado el teatro de mujer y el público solo vio el fail, [nombre]. Aquí, sin maquillaje posible, coño.',

      'Feminidad de las que confunden pose con presencia y pierden las dos, [nombre]. El ranking firma y listo, el veredicto es ese, cabrón.',

      'Tu almost es un aviso de lo que no hay que perseguir en el grupo, [nombre]. Se ve desde el primer mensaje, hostia puta qué nivel.',

      'Feminidad con más pretensión que sustancia y el low no se traga el cuento, [nombre]. Hostia puta, qué nivel.',

      'El low no discute: el número habla y tú callas, [nombre].gilipollas. Eso no se maquilla con ángulo, mierda.',

      'Feminidad de las que el natural es no generar presencia., [nombre]. El tramo te nombra sin permiso, coño.',

      'Se te nota el almost hasta en la foto más trabajada del perfil, [nombre]. No hay segunda lectura útil, cabrón.',

      'Feminidad de almost documentado: autor tú, testigo el grupo, [nombre]. El material habla solo, gilipollas.',

      'No hay segunda lectura útil en este low: hay cara y hay veredicto, [nombre]. Aquí. Hostia puta, qué nivel.',

      'Feminidad de las que el filtro de mujer se rinde antes que el de respeto, [nombre]. El ranking firma y listo, asco.',

      'Tu presencia en el low es el gag del comando y no el cumplido, [nombre]. Se ve desde el primer mensaje, basura.',

      'Feminidad de ranking: el tramo bajo te queda como un guante de derrota, [nombre]. Hostia puta, qué nivel.',

      'Has convertido el almost de mujer en residencia fiscal del low, [nombre]. Eso no se maquilla con ángulo, fracasado.',

      'Feminidad de las que. El chat archiva el fail sin pedir amplificación, [nombre]. El tramo te nombra sin permiso, qué asco de frame.',

      'El low te nombra sin suavizar: almost de base y punto, [nombre]. No hay segunda lectura útil, y el ranking no miente, asco.',

      'Feminidad con la disciplina de quien nunca aceptó el espejo de la presencia, [nombre]. El material habla solo, sin anestesia, basura.',

      'Se te ve venir el fail en la primera miniatura del estado, [nombre]. Aquí, el chat ya lo sabía, ridículo.',

      'Feminidad de puta pena: el comando no regala presencia y tú lo sabes, [nombre]. El ranking firma y listo, nivel sótano puro.',

      'Tu almost baja el promedio del hilo solo con cargarse, [nombre]. Se ve desde el primer mensaje, sin filtro ni consuelo, joder.',

      'Feminidad de las que el modo mujer tampoco es cómplice del fail, [nombre]., diagnóstico cerrado, mierda.',

      'El low es tu tramo natural y. El ranking no ofrece recurso, [nombre]. Eso no se maquilla con ángulo, y se te nota a la legua, coño.',

      'Feminidad de almost eterno con firma legible en cada pose del chat, [nombre]. El tramo te nombra sin permiso, el bot no regala décimas, cabrón.',

      'No es un mal día: es el nivel y el low te lo cobra sin descuento, [nombre]. No hay segunda lectura útil, archivo sin apelación, gilipollas.',

      'Feminidad de las que necesitan suerte y aun así el resultado es mierda, [nombre]. El material habla solo.',

      'Tu frame es el argumento más corto del comando y el más claro, [nombre]. Aquí, con el grupo de testigo, asco.',

      'Se te cae el disimulo de mujer solo con el flash del chat, [nombre]. El ranking firma y listo, sin maquillaje posible, basura.',

      'Feminidad de las que el grupo no cita porque no hay presencia que citar, [nombre]. Se ve desde el primer mensaje, el veredicto es ese, ridículo.',

      'Has firmado el fail con cada almost como única firma del low, [nombre]., hostia puta qué nivel. Hostia puta, qué nivel.',

      'Feminidad de superficie: basta la vista, no hace falta el sótano, [nombre]. Eso no se maquilla con ángulo, joder.',

      'El low no es caridad: es veredicto y te nombra sin anestesia, [nombre]. El tramo te nombra sin permiso, mierda.',

      'Feminidad de puto desastre: ni el gesto ni la química colaboran contigo, [nombre]. No hay segunda lectura útil, coño.',

      'Feminidad de las que el algoritmo de presencia pide la baja por agotamiento, [nombre]. El material habla solo, cabrón.',

      'El ranking de mujer te deja en el sótano del low sin debate, [nombre]. Aquí. Hostia puta, qué nivel.',

      'Feminidad de las que confunden natural con no generar nada de presencia, [nombre]. El ranking firma y listo, patético.',

      'No hay filtro mágico: hay evidencia y el low la firma en público, [nombre]. Se ve desde el primer mensaje, asco.',

      'Feminidad con más pretensión que chispa y el comando no se traga el cuento, [nombre]. Hostia puta, qué nivel.',

      'Tu almost es el gag del tramo. Y el grupo no pide repetición, [nombre]. Eso no se maquilla con ángulo, ridículo.',

      'Feminidad de almost documentado en alta definición del chat, [nombre]. El tramo te nombra sin permiso, fracasado.',

      'Se te ve el fail desde el otro lado del puto ranking, [nombre]. No hay segunda lectura útil, qué asco de frame.',

      'Feminidad de las que la presencia y. El ranking coinciden en. El veredicto, [nombre]. El material habla solo, y el ranking no miente, mierda.',

      'El low te ha puesto en tu sitio sin necesidad de narrador, [nombre]. Aquí, sin anestesia, coño. Hostia puta, qué nivel.',

      'Has montado el teatro de mujer y solo salió el fail del low, [nombre]. El ranking firma y listo, el chat ya lo sabía, cabrón.',

      'Feminidad de ranking: el tramo bajo es tu residencia fija, [nombre]. Se ve desde el primer mensaje, nivel sótano puro, gilipollas.',

      'Tu almost baja el promedio del grupo en un solo estado, [nombre]., sin filtro ni consuelo, patético.',

      'Feminidad de las que el modo mujer se arrepiente de haberse abierto, [nombre]. Eso no se maquilla con ángulo, diagnóstico cerrado, asco.',

      'No es luz mala ni cámara mala: eres tú y el low lo dice claro, [nombre]. El tramo te nombra sin permiso, y se te nota a la legua, basura.',

      'Feminidad de almost eterno: el comando no convierte el casi en victoria, [nombre]. No hay segunda lectura útil, el bot no regala décimas, ridículo.',

      'Se te cae el personaje de mujer en la primera foto del hilo, [nombre]. El material habla solo, archivo sin apelación, fracasado.',

      'Feminidad de las que necesitan tutorial de presencia y de dignidad, [nombre]. Aquí. Hostia puta, qué nivel, basura.',

      'El low no regala décimas: el número habla y tú estás abajo, [nombre]. El ranking firma y listo, con el grupo de testigo, qué cutre.',

      'Feminidad de puto almost con firma en cada miniatura del chat, [nombre]. Se ve desde el primer mensaje, sin maquillaje posible, da pena ajena.',

      'Tu frame es contenido de ridículo gratis para el grupo, [nombre]., el veredicto es ese. Hostia puta, qué nivel, qué vacío.',

      'Feminidad de las que el natural es no atraer.[nombre]. Eso no se maquilla con ángulo, hostia puta qué nivel, indignante.',

      'Has convertido el fail de presencia en marca personal del low, [nombre]. El tramo te nombra sin permiso, qué vergüenza ajena.',

      'Feminidad de repertorio gastado: las mismas poses, el mismo almost, [nombre]. No hay segunda lectura útil, da vergüenza.',

      'Se te nota el desastre hasta en la foto de perfil más antigua, [nombre]. El material habla solo, qué flojo.',

      'El low te nombra sin suavizar ni media coma del veredicto, [nombre]. Aquí. Hostia puta, qué nivel. Hostia, el desastre se explica solo, menudo desastre.',

      'Feminidad de almost: ni el low light te favorece. Y el chat lo ve, [nombre]. El ranking firma y listo, qué pena.',

      'Tu presencia es un argumento contra la química del grupo, [nombre]. Se ve desde el primer mensaje, patético.',

      'Feminidad de puta pena en el tramo que más se lee del comando, [nombre]. Hostia puta, qué nivel. Hostia, el desastre se explica solo, miserable.',

      'No hay redención en este low: hay cara, hay número y hay veredicto, [nombre]. Eso no se maquilla con ángulo, basura.',

      'Feminidad de las que el grupo archiva el fail sin pedir bis, [nombre]. El tramo te nombra sin permiso, ridículo.',

      'Se te ve venir el fail en la primera palabra del estado, [nombre]. No hay segunda lectura útil, fracasado.',

      'Feminidad de ranking roto: el sótano del tramo te queda de casa, [nombre]. El material habla solo, qué asco de frame.',

      'El comando no discute contigo: el low firma y punto, [nombre]. Aquí, y el ranking no miente, asco. Hostia puta, qué nivel, fracasado.',

      'Tu almost es el epitafio de la mujer de hoy, [nombre].asco. El ranking firma y listo, sin anestesia y, sin anestesia, qué miseria.',

      'Feminidad de puto desastre documentado. Delante del grupo entero, [nombre]. Se ve desde el primer mensaje, el chat ya lo sabía, da grima.',

      'Has firmado el fail con cada ángulo malo como única firma del low, [nombre]., nivel sótano puro, fracasado.',

      'Feminidad de superficie suficiente: basta una mirada, sobra el resto, [nombre]. Eso no se maquilla con ángulo, sin filtro ni consuelo, basura.',

      'El low es tu tramo y. El ranking no ofrece mudanza, [nombre]. El tramo te nombra sin permiso, diagnóstico cerrado, qué cutre.',

      'Se te cae el frame de mujer solo con cargar la cámara frontal, [nombre]. No hay segunda lectura útil, y se te nota a la legua, da pena ajena.',

      'Feminidad de almost eterno con. El chat de testigo notarial, [nombre]. El material habla solo, el bot no regala décimas, qué vacío.',

      'No es un mal día de fotos: es el nivel y el low te lo cobra, [nombre]. Aquí, archivo sin apelación, indignante.',

      'Feminidad de puta madre: el tramo bajo no suaviza. El veredicto de presencia, [nombre]. El ranking firma y listo, qué vergüenza ajena.',

      'Tu frame es el gag más corto y más claro del comando, [nombre]. Se ve desde el primer mensaje, con el grupo de testigo, asco, da vergüenza.',

      'Feminidad de las que el algoritmo de respeto pide la baja al verte, [nombre]., sin maquillaje posible, basura.',

      'El low te deja donde mereces: abajo, sin debate ni consuelo, [nombre]. Eso no se maquilla con ángulo, el veredicto es ese, ridículo.',

      'Feminidad de ranking: el número bajo te nombra sin anestesia ni filtro, [nombre]. El tramo te nombra sin permiso, hostia puta qué nivel, qué pena.',

      'Has montado el circo de mujer y solo salió el payaso del fail, [nombre]. No hay segunda lectura útil, patético.',

      'Feminidad de las que necesitan suerte, luz y milagro. Y aun así, mierda, [nombre]. El material habla solo, miserable.',

      'Feminidad de desastre de presencia: el low no es caridad, es sentencia, [nombre]. Aquí. Hostia puta, qué nivel, qué cringe.',

      'El ranking de presencia y el low coinciden: sótano, sin recurso, [nombre]. El ranking firma y listo, da asco.',

      'Feminidad de puto almost firmado en cada miniatura del estado, [nombre]. Se ve desde el primer mensaje, qué vergüenza.',

      'No hay segunda oportunidad en este tramo: hay veredicto y te nombra, [nombre]. Hostia puta, qué nivel, ridículo.',

    ],
    extreme: [
      'Tienes la feminidad real, la que no se menciona pero que todo el mundo nota cuando entras, asco. Y. Hostia puta, qué nivel.',

      'Tu forma de ser tiene una elegancia que no se fábrica. La que queda cuando todo lo demás se va, basura.',

      'La presencia que tienes se queda en la memoria de quien te conoce aunque sea brevemente No hay segunda lectura útil, ridículo.',

      'Hay personas que llevan años intentando tener lo que tú llevas de serie El material habla solo, fracasado.',

      'Tu feminidad tiene la solidez de algo construido, no de algo puesto Aquí, qué asco de frame. Hostia puta, qué nivel.',

      'La elegancia que tienes es la que se queda cuando se quita todo lo demás, y eso no es común, y el ranking no miente, mierda.',

      'Tu gracia natural es exactamente lo que otras persiguen durante años sin alcanzarlo nunca, sin anestesia, coño.',

      'Hay una calidez en ti que la gente recuerda mucho después de cualquier conversación contigo, el chat ya lo sabía, cabrón.',

      'Tu feminidad no necesita ocasión ni público. Es lo que eres cuando nadie está mirando Eso no se maquilla con ángulo, nivel sótano puro, gilipollas.',

      'La suavidad con la que manejas las cosas se queda en la memoria de quien la recibe El tramo te nombra sin permiso, sin filtro ni consuelo, patético.',

    ],
  },

  masculinidad: {
    name: 'masculino',
    goodIsHigh: true,
    high: [
      'Tu palabra es suficiente garantía para la gente, y eso no se consigue hablando, se consigue cumpliendo.',

      'Tu presencia genera tranquilidad en quien te rodea. Eso no se finge ni se aprende en un fin de semana.',

      'Tu carácter no sube ni baja según el contexto. Eso es lo más difícil de construir y lo más escaso y el contador lo dejó por escrito sin debate.',

      'Cuando la situación se complica, eres de los que se quedan. Eso ya dice todo lo que hay que decir en el momento más visible del chat.',

      'Cuando das tu palabra, el resto deja de preocuparse, y esa confianza vale más que cualquier cargo sin que nadie pudiera fingir que no lo vio.',

      'Resuelves sin quejarte y sin buscar reconocimiento, que es como lo hacen los que de verdad pueden con el parte del comando cerrado en firme.',

      'Tienes la solidez que la gente busca cuando algo de verdad importa y hay que apoyarse en alguien y sin segunda oportunidad en este mensaje.',

      'Tu manera de imponerte es sin levantar la voz. Y sin levantar la voz es como se impone de verdad mientras el grupo tomaba nota del resultado.',

      'Tienes la firmeza que no se rompe cuando las cosas se complican. Esa es la versión que importa con números que no admiten recurso de apelación.',

      'La templanza que tienes en los momentos difíciles es lo que te define, no los momentos fáciles y el historial del comando queda de testigo.',

      'La confianza que genera tu presencia no es actuación. Se construye con años de ser consistente delante de quien miraba. El ranking en ese momento.',

      'La gente se apoya en ti cuando el problema es serio, y lo hacen porque ya saben cómo respondes con el sistema firmando debajo sin pedir aclaración.',

      'Tu carácter no cambia según quién tengas delante, y esa coherencia es lo más difícil de tener delante de todo el hilo sin posibilidad de borrado.',

      'Tienes la firmeza de quien no necesita demostrar nada porque ya lo demostró cuando importaba con. El ranking como único testigo del veredicto.',

      'Tu forma de proteger a los tuyos es discreta y constante. Nadie la nombra y todos la sienten y el contador lo dejó por escrito sin debate, qué vergüenza ajena.',

      'Tu presencia hace que se cuente contigo para lo importante. Y no por simpatía, por historial en el momento más visible del chat, da vergüenza.',

      'Tu forma de estar es firme sin ser rígida. Ese equilibrio se le escapa a casi todo el mundo sin que nadie pudiera fingir que no lo vio, qué flojo.',

      'Tu masculinidad tiene profundidad. No es decoración ni fachada que desaparece bajo presión con el parte del comando cerrado en firme, menudo desastre.',

      'Masculinidad de la que protege sin controlar. Esa diferencia es la que casi nadie entiende y sin segunda oportunidad en este mensaje, qué pena.',

      'Tienes la capacidad de reconocer el mérito ajeno. Y eso solo lo hace quien tiene el propio mientras el grupo tomaba nota del resultado, patético.',

      'Masculinidad de la que no humilla, no grita y no exhibe. Y aun así no hay quien la discuta con números que no admiten recurso de apelación, miserable.',

      'Masculinidad probada, tranquila y sostenida. Tres cosas que juntas ya no se ven casi nunca y el historial del comando queda de testigo, qué cringe.',

      'Eres de los que cumplen su palabra cuando ya no es cómodo, que es cuando de verdad cuenta delante de quien miraba. El ranking en ese momento, da asco.',

      'Masculinidad tranquila y firme. Las dos cosas a la vez, que es lo que casi nadie consigue con el sistema firmando debajo sin pedir aclaración, qué vergüenza.',

      'Tu presencia tranquiliza a quien está nervioso. Ese es el efecto más difícil de conseguir delante de todo el hilo sin posibilidad de borrado, ridículo.',

      'Tienes esa solidez que hace que quien trabaja contigo deje de mirar por encima del hombro con. El ranking como único testigo del veredicto, fracasado.',

      'Masculinidad que no necesita escenario. Funcionas igual con público que sin nadie mirando y el contador lo dejó por escrito sin debate, qué miseria.',

      'Tienes el aguante de los que van a largo plazo. Por eso sigues cuando el resto ya no está en el momento más visible del chat, da grima.',

      'Eres de los que actúan cuando hay que actuar, sin esperar aprobación ni momento perfecto sin que nadie pudiera fingir que no lo vio, qué nivel de pena.',

      'Tienes la clase de presencia que tranquiliza una habitación entera sin decir una palabra con el parte del comando cerrado en firme, basura.',

      'Tienes el aguante de los que van a largo plazo. Por eso sigues cuando otros ya se fueron y sin segunda oportunidad en este mensaje, qué cutre.',

      'Masculinidad real de la que se demuestra cumpliendo durante años sin fallar una sola vez mientras el grupo tomaba nota del resultado, da pena ajena.',

      'Masculinidad real: sostienes lo que dijiste también cuando cambian todas las condiciones con números que no admiten recurso de apelación, qué vacío.',

      'Tienes la solidez de quien sostiene bajo presión lo que otros no sostienen ni tranquilos y el historial del comando queda de testigo, indignante.',

      'Eres el que sostiene la situación cuando los demás solo quieren salir corriendo de ella delante de quien miraba. El ranking en ese momento, qué vergüenza ajena.',

      'Proyectas una seguridad que no viene del volumen de la voz sino de la solidez de dentro con el sistema firmando debajo sin pedir aclaración, da vergüenza.',

      'Asumes lo que hay que asumir sin buscar a quién echarle la culpa después. Eso te define delante de todo el hilo sin posibilidad de borrado, qué flojo.',

      'Tu templanza en los momentos malos es justo lo que separa al hombre del que lo aparenta con. El ranking como único testigo del veredicto, menudo desastre.',

      'No necesitas levantar la voz para que se note quién manda la situación cuando llegas tú y el contador lo dejó por escrito sin debate, qué pena.',

      'La firmeza que tienes no se rompe bajo presión, y eso lo saben todos los que te conocen en el momento más visible del chat, patético.',

      'Eres el tipo de hombre al que la gente recurre cuando necesita algo serio resuelto bien sin que nadie pudiera fingir que no lo vio, miserable.',

      'Masculinidad de la que se demuestra cumpliendo, no explicando. Y llevas años cumpliendo con el parte del comando cerrado en firme, qué cringe.',

      'Tu forma de estar hace que la gente quiera hacerlo bien. Sin que se lo tengas que pedir y sin segunda oportunidad en este mensaje, da asco.',

      'Tienes el criterio y la paciencia. Cualquiera de las dos por separado no sirve de mucho mientras el grupo tomaba nota del resultado, qué vergüenza.',

      'Tienes el aguante de aparecer también los días en los que no apetece absolutamente nada con números que no admiten recurso de apelación, ridículo.',

      'Masculinidad tranquila de la que no necesita ganar cada discusión para saber dónde está y el historial del comando queda de testigo, fracasado.',

      'Tienes la firmeza de decir lo que hay que decir sin hacer daño al decirlo. Eso es nivel delante de quien miraba. El ranking en ese momento, qué miseria.',

      'Tu manera de sostener a los tuyos es constante y sin condiciones. Eso ya casi no existe con el sistema firmando debajo sin pedir aclaración, da grima.',

      'Tienes la solidez que la gente busca para apoyarse, y esa solidez se ganó con los años delante de todo el hilo sin posibilidad de borrado, qué nivel de pena.',

      'Tu presencia da seguridad a la gente que tienes al lado. Eso no se finge ni una semana con. El ranking como único testigo del veredicto, basura.',

    ],
    mid: [
      'Ni alfa ni beta de manual: estás en el medio de la masculinidad, ni se nota de más ni falta del todo, [nombre]. Joder.',

      'Masculinidad a medias: a ratos se sostiene y a ratos se ve el esfuerzo, el promedio es este. Mierda.',

      'No eres el duro del grupo ni el que se pliega siempre: tierra de nadie del concepto. Coño. Y el contador lo dejó por escrito sin debate.',

      'Tu masculinidad va y viene según el día: ni estable en la pose ni estable en la calma, [nombre]. Cabrón.',

      'Hay días de espalda ancha y días de volumen vacío: la media te deja en el medio. Gilipollas. sin que nadie pudiera fingir que no lo vio.',

      'Ni tóxica de cartel ni ausente del todo: oscilas en un rango estrecho y previsible. Patético. con el parte del comando cerrado en firme.',

      'Tu masculinidad es un interruptor con mal contacto: a veces enciende a veces chisporrotea, [nombre]. Ridículo.',

      'Un día el silencio útil y al siguiente el grito de más: inconsistencia de manual. Basura. Se nota y no hay vuelta atrás, basura.',

      'No generas miedo ni pena: generas el asentimiento del suficiente. Desperdicio Se nota y no hay vuelta atrás, desperdicio.',

      'La dureza te dura lo justo para no ser blando del todo y poco más, [nombre]. Asco. Se nota y no hay vuelta atrás, asco.',

      'Estás en el tramo donde el grupo no debate tu masculinidad: no hay material extremo. Vergüenza delante de quien miraba. El ranking en ese momento.',

      'Masculinidad de termostato a media: ni frío de ausencia ni calor de pose. Cutre Se nota y no hay vuelta atrás, cutre.',

      'Ni te ponen de ejemplo de macho ni de fracaso: caso del promedio, [nombre]. Pringado. Se nota y no hay vuelta atrás, pringado.',

      'La presencia a ratos cuadra y a ratos se ve el andamio: más andamio que obra a veces. Fracasado con. El ranking como único testigo del veredicto.',

      'Tu alfa a tiempo parcial no convence del todo ni se cae del todo. Joder. Se nota y no hay vuelta atrás, joder.',

      'El pecho a veces es espalda y a veces es aire: el grupo ya no apuesta, [nombre]. Mierda. Se nota y no hay vuelta atrás, mierda.',

      'Tu masculinidad es un wifi de centros comerciales: se conecta a ratos. Coño. Se nota y no hay vuelta atrás, coño.',

      'Hay flashes de contención y kilómetros de trámite: el flash no basta. Cabrón. Se nota y no hay vuelta atrás, cabrón.',

      'Ni desastre de pose ni maestría del silencio: medio pelo, [nombre]. Gilipollas. Se nota y no hay vuelta atrás, gilipollas.',

      'La columna a veces se nota y a veces no: oscilación de baja amplitud. Patético. Se nota y no hay vuelta atrás, patético.',

      'Estás a un paso del que se sostiene y a un paso del que compensa: no das ninguno fijo. Ridículo. con números que no admiten recurso de apelación.',

      'Masculinidad de menú del día: a veces hay plato a veces solo pan, [nombre]. Basura. Se nota y no hay vuelta atrás, basura.',

      'Un gesto de dureza no hace temporada y tú vives de gestos. Desperdicio Se nota y no hay vuelta atrás, desperdicio.',

      'El grupo espera el zigzag de tu masculinidad y el zigzag llega. Asco. Se nota y no hay vuelta atrás, asco.',

      'Ni estable en el macho ni estable en la calma: inestable en las dos, [nombre]. Vergüenza Se nota y no hay vuelta atrás, vergüenza.',

      'Tu presencia es un borrador que no se pasa a limpio: siempre a medias. Cutre Se nota y no hay vuelta atrás, cutre.',

      'Tu masculinidad confirma asistencia a ratos: RSVP irregular. Pringado. Se nota y no hay vuelta atrás, pringado.',

      'Hay días de sí y días de no: el promedio es un quizás, [nombre]. Fracasado. Se nota y no hay vuelta atrás, fracasado.',

      'El flash de alfa ya no ilusiona: se conoce el apagón. Joder. Se nota y no hay vuelta atrás, joder. sin que nadie pudiera fingir que no lo vio.',

      'No hay firma estable: hay intentos. Y se notan. Mierda. Se nota y no hay vuelta atrás, mierda. con el parte del comando cerrado en firme.',

      'La dureza te dura una frase buena: luego el volumen o el silencio vacío, [nombre]. Coño. Se nota y no hay vuelta atrás, coño.',

      'Masculinidad de ensayo general: nunca estreno del todo. Cabrón. Se nota y no hay vuelta atrás, cabrón.',

      'A ratos el silencio y a ratos el ruido de no saber. Gilipollas. Se nota y no hay vuelta atrás, gilipollas.',

      'Picos cortos que no mueven la media de tu presencia, [nombre]. Patético. Se nota y no hay vuelta atrás, patético.',

      'El macho no ha firmado indefinido contigo: es temporal. Ridículo. Se nota y no hay vuelta atrás, ridículo.',

      'Ni ejemplo claro ni antiejemplo: promedio tembloroso. Basura. Se nota y no hay vuelta atrás, basura. con el sistema firmando debajo sin pedir aclaración.',

      'Tu presencia es un rango estrecho que vibra, [nombre]. Desperdicio Se nota y no hay vuelta atrás, desperdicio.',

      'Citas sueltas con la dureza sin noviazgo. Vergüenza Se nota y no hay vuelta atrás, vergüenza con. El ranking como único testigo del veredicto.',

      'El grupo en espera de qué versión de macho carga hoy, [nombre]. Cutre Se nota y no hay vuelta atrás, cutre.',

      'El depende es. El veredicto de tu masculinidad. Pringado. Se nota y no hay vuelta atrás, pringado.en el momento más visible del chat.',

      'Masculinidad con luz piloto: se ve que hay algo no se sabe cuánto. Fracasado. Se nota y no hay vuelta atrás, fracasado.',

      'Ciclos de pecho fuera y de pecho dentro: tu marca, [nombre]. Joder. Se nota y no hay vuelta atrás, joder.',

      'A veces sin buscarlo se sostiene cuando lo fuerzas se cae. Coño. Se nota y no hay vuelta atrás, coño.',

      'Documento de masculinidad sin firmar, [nombre]. Cabrón. Se nota y no hay vuelta atrás, cabrón mientras el grupo tomaba nota del resultado.',

      'Tu dureza con RSVP irregular: a veces viene. Gilipollas. Se nota y no hay vuelta atrás, gilipollas. con números que no admiten recurso de apelación.',

      'Sin horario fijo en el calendario del macho. Patético. Se nota y no hay vuelta atrás, patético. Y el historial del comando queda de testigo.',

      'El ranking promedia tu zigzag y te deja aquí. Basura. Se nota y no hay vuelta atrás, basura delante de quien miraba. El ranking en ese momento.',

      'Cliente ocasional del concepto sin puntos. Desperdicio Se nota y no hay vuelta atrás, desperdicio.con el sistema firmando debajo sin pedir aclaración.',

      'Masculinidad de cobertura irregular: zonas con señal y muertas, [nombre]. Asco. Se nota y no hay vuelta atrás, asco.',

      'Ni dentro ni fuera del macho del todo. Fracasado. Se nota y no hay vuelta atrás, fracasado con. El ranking como único testigo del veredicto.',

      'Salva el rato y pierde el día de presencia, [nombre]. Mierda. Se nota y no hay vuelta atrás. Y el contador lo dejó por escrito sin debate.',

      'Cerrado fuera de franja de dureza, [nombre]. Gilipollas. Se nota y no hay vuelta atrás, gilipollas en el momento más visible del chat.',

      'Masculinidad de solo entrantes sin plato fuerte. Patético. Se nota y no hay vuelta atrás, patético. sin que nadie pudiera fingir que no lo vio.',

      'Tu masculinidad en silencio con mensajes raros, [nombre]. Vergüenza Se nota y no hay vuelta atrás, vergüenza.',

      'Sin noviazgo con la dureza real, [nombre]. Desperdicio Se nota y no hay vuelta atrás, desperdicio.y sin segunda oportunidad en este mensaje.',

      'Sin arco de redención ni de caída, [nombre]. Cabrón. Se nota y no hay vuelta atrás, cabrón mientras el grupo tomaba nota del resultado.',

      'No hay hilo que abrir sobre tu masculinidad. Patético. Se nota y no hay vuelta atrás, patético. con números que no admiten recurso de apelación, qué cutre.',

      'El medio no pide aplausos pide el número, [nombre]. Ridículo. Se nota y no hay vuelta atrás, ridículo.',

      'Ni alfa de cartel ni ausencia total: pasillo. Basura. Se nota y no hay vuelta atrás, basura delante de quien miraba. El ranking en ese momento, qué vacío.',

      'Historial sin chapters fuertes de macho. Desperdicio Se nota y no hay vuelta atrás, desperdicio.con el sistema firmando debajo sin pedir aclaración, indignante.',

      'El grupo no apuesta fuerte a tu dureza, [nombre]. Asco. Se nota y no hay vuelta atrás, asco delante de todo el hilo sin posibilidad de borrado, qué vergüenza ajena.',

      'Estás en el tramo que no emociona: constata y sigue, [nombre]. Pringado. Se nota y no hay vuelta atrás, pringado, da vergüenza.',

      'El gesto del grupo es el mismo si aciertas o fallas. Coño. Se nota y no hay vuelta atrás. Y el contador lo dejó por escrito sin debate, qué flojo.',

      'Ni llegas con gloria ni te caes antes: terminas. Cabrón. Se nota y no hay vuelta atrás, cabrón en el momento más visible del chat, menudo desastre.',

      'Medallero corto y sin brillo de macho, [nombre]. Gilipollas. Se nota y no hay vuelta atrás, qué pena.',

      'Distancias educadas con la dureza, [nombre]. Basura. Se nota y no hay vuelta atrás, basura. con el parte del comando cerrado en firme, patético.',

      'El medio te queda como ropa lavada: sin color fuerte. Desperdicio Se nota y no hay vuelta atrás, desperdicio.',

      'Spoiler de tibieza permanente, [nombre]. Vergüenza Se nota y no hay vuelta atrás, vergüenza mientras el grupo tomaba nota del resultado, qué cringe.',

      'Ni altar ni sótano: escalera de servicio, [nombre]. Fracasado. Se nota y no hay vuelta atrás, fracasado.',

      'Resumen sin adjetivos fuertes de masculinidad. Joder. Se nota y no hay vuelta atrás, joder. Y el historial del comando queda de testigo, qué vergüenza.',

      'El centro del espectro es poco comercial y es tuyo. Gilipollas. Se nota y no hay vuelta atrás, ridículo.',

      'Sin leyenda ni maldición de macho, [nombre]. Patético. Se nota y no hay vuelta atrás, patético. con el sistema firmando debajo sin pedir aclaración, fracasado.',

      'Continuidad de fondo sin picos, [nombre]. Desperdicio Se nota y no hay vuelta atrás, desperdicio.delante de todo el hilo sin posibilidad de borrado, qué miseria.',

      'Ni miedo ni pena: estás en la lista, [nombre]. Cutre Se nota y no hay vuelta atrás, cutre.con. El ranking como único testigo del veredicto, da grima.',

      'Lo más predecible del ranking de macho. Fracasado. Se nota y no hay vuelta atrás, fracasado. Y el contador lo dejó por escrito sin debate, qué nivel de pena.',

      'El medio por media de presencia: por número, [nombre]. Joder. Se nota y no hay vuelta atrás, joder en el momento más visible del chat, basura.',

      'Ni silencio de gesta ni de vergüenza, [nombre]. Cabrón. Se nota y no hay vuelta atrás, cabrón. sin que nadie pudiera fingir que no lo vio, qué cutre.',

      'Ni anillo ni crónica de fracaso de macho: ficha. Patético. Se nota y no hay vuelta atrás, patético. con el parte del comando cerrado en firme, da pena ajena.',

      'Ranking frío y correcto: centro, [nombre]. Ridículo. Se nota y no hay vuelta atrás, ridículo. Y sin segunda oportunidad en este mensaje, qué vacío.',

      'Aburrimiento estadístico de presencia. Desperdicio Se nota y no hay vuelta atrás, desperdicio.mientras el grupo tomaba nota del resultado, indignante.',

      'Sin material para fanatismo ni desprecio, [nombre]. Asco. Se nota y no hay vuelta atrás, asco. con números que no admiten recurso de apelación, qué vergüenza ajena.',

      'Tu lugar es el control del experimento. Vergüenza Se nota y no hay vuelta atrás, vergüenza y el historial del comando queda de testigo, da vergüenza.',

      'Ni clutch del mes ni fail de la semana, [nombre]. Pringado. Se nota y no hay vuelta atrás, pringado.delante de quien miraba. El ranking en ese momento, qué flojo.',

      'Masculinidad de señal intermitente: se ve se pierde se ve, [nombre]. Mierda. Se nota y no hay vuelta atrás, menudo desastre.',

      'Tramo del casi y del no del todo, [nombre]. Gilipollas. Se nota y no hay vuelta atrás, gilipollas delante de todo el hilo sin posibilidad de borrado, qué pena.',

      'La dureza te salva el día a veces y te abandona otras. Patético. Se nota y no hay vuelta atrás, patético.',

      'Flashes de contención y apagones de pose, [nombre]. Basura. Se nota y no hay vuelta atrás, basura. Y el contador lo dejó por escrito sin debate, miserable.',

      'RSVP irregular de la dureza, [nombre]. Vergüenza Se nota y no hay vuelta atrás, vergüenza en el momento más visible del chat, qué cringe.',

      'Chat en silencio con mensajes raros de presencia. Pringado. Se nota y no hay vuelta atrás, pringado.sin que nadie pudiera fingir que no lo vio, da asco.',

      'Quizás cansado como promedio, [nombre]. Fracasado. Se nota y no hay vuelta atrás, fracasado. con el parte del comando cerrado en firme, qué vergüenza.',

      'Una frase de macho y vuelta al bloque, [nombre]. Coño. Se nota y no hay vuelta atrás, coño. Y sin segunda oportunidad en este mensaje, ridículo.',

      'Sin noviazgo con el concepto, [nombre]. Desperdicio Se nota y no hay vuelta atrás, desperdicio.mientras el grupo tomaba nota del resultado, fracasado.',

      'Al revés: a veces sin buscar se sostiene, [nombre]. Joder. Se nota y no hay vuelta atrás, joder. con números que no admiten recurso de apelación, qué miseria.',

      'Sin horario en el calendario del macho, [nombre]. Cabrón. Se nota y no hay vuelta atrás, cabrón. Y el historial del comando queda de testigo, da grima.',

      'Sin puntos de fidelidad al concepto, [nombre]. Ridículo. Se nota y no hay vuelta atrás, ridículo delante de quien miraba. El ranking en ese momento, qué nivel de pena.',

      'Sueltos que no suman espalda, [nombre]. Gilipollas. Se nota y no hay vuelta atrás, gilipollas. con el sistema firmando debajo sin pedir aclaración, basura.',

    ],
    low: [
      'El ridículo. Te cobra intereses. Cabrón. El chat ya lo archivó. Se nota en cada mensaje. Y el contador lo dejó por escrito sin debate.',

      'Apagado sin volumen. Gilipollas. Se nota en cada mensaje, joder. sin que nadie pudiera fingir que no lo vio.',

      'Callado no pesas. Gilipollas. Se nota en cada mensaje, joder. con el parte del comando cerrado en firme.',

      'Alfa que se destiñe. Gilipollas. Se nota en cada mensaje, joder en el momento más visible del chat. Hostia puta, qué nivel.',

      'Todo gritado y nada que pese en silencio. Gilipollas. El bot no regala décimas. Se nota en cada mensaje, joder.',

      'El cartel de espalda no aguanta viento. Gilipollas. Se nota en cada mensaje, joder. Hostia puta, qué nivel.',

      'Intereses del ridículo por las nubes, [nombre]. Cabrón. Nivel sótano documentado. Se nota en cada mensaje, joder.',

      'Color que se va en el primer lavado. Gilipollas. Se nota en cada mensaje, joder. Hostia puta, qué nivel.',

      'El viento gana al cartel, [nombre]. Gilipollas. El ranking no miente. Se nota en cada mensaje, joder.',

      'Trastienda sin mercancía, [nombre]. Gilipollas. Se nota en cada mensaje, joder. Hostia puta, qué nivel.',

      'Apagado el volumen y desapareces. Gilipollas. El chat ya lo archivó. Se nota en cada mensaje, joder.',

      'Se va el color solo, [nombre]. Gilipollas. Se nota en cada mensaje, joder. Hostia puta, qué nivel. Hostia, el desastre se explica solo, joder.',

      'El viento se lleva el cartel. Gilipollas. Se nota en cada mensaje, joder. Hostia puta, qué nivel. Hostia, el desastre se explica solo, joder.',

      'Escaparate sin trastienda. Gilipollas. Se nota en cada mensaje, joder. El ranking no miente, joder. Hostia puta, qué nivel.',

      'La dureza prestada genera deuda de ridículo. Y estás endeudado. Cabrón. El bot no regala décimas. Y sin segunda oportunidad en este mensaje.',

      'Cristal con marketing de acero. Cabrón. Se nota en cada mensaje, joder mientras el grupo tomaba nota del resultado.',

      'Bar barato hecho personaje. Ridículo. Nivel sótano documentado. Se nota en cada mensaje, joder. con números que no admiten recurso de apelación.',

      'Campeón de presumir vacío. Patético. Se nota en cada mensaje, joder. Y el historial del comando queda de testigo.',

      'Alfa de auto-nombramiento. Patético. El ranking no miente. Se nota en cada mensaje, joder delante de quien miraba. El ranking en ese momento.',

      'Caducado sin renovación. Fracasado. Se nota en cada mensaje, joder. con el sistema firmando debajo sin pedir aclaración.',

      'Alfa de mentira, [nombre]. Patético. El chat ya lo archivó. Se nota en cada mensaje, joder con. El ranking como único testigo del veredicto.',

      'Eres un anuncio de algo que no existe en el almacén. Gilipollas. Y el contador lo dejó por escrito sin debate.',

      'Sin guion no hay macho, [nombre]. Asco. Se nota en cada mensaje, joder. sin que nadie pudiera fingir que no lo vio.',

      'Cero presencia sin megáfono. Basura. Se nota en cada mensaje, joder mientras el grupo tomaba nota del resultado.',

      'Se apaga el filtro y quedas. Mierda. El bot no regala décimas. Se nota en cada mensaje, joder. con números que no admiten recurso de apelación.',

      'Sin altavoz no quedaba nada. Basura. Se nota en cada mensaje, joder. Y el historial del comando queda de testigo.',

      'Vendiendo humo de macho. Ridículo. Nivel sótano documentado. Se nota en cada mensaje, joder delante de quien miraba. El ranking en ese momento.',

      'Se te ve el no tener. Fracasado. Se nota en cada mensaje, joder. con el sistema firmando debajo sin pedir aclaración.',

      'Cero peso en lo callado: todo gritado, [nombre]. Gilipollas. El ranking no miente. Con números que no admiten recurso de apelación.',

      'Se te sale lo que no hay. Basura. Se nota en cada mensaje, joder. con el sistema firmando debajo sin pedir aclaración.',

      'Boca dura hechos blandos. Mierda. El chat ya lo archivó. Se nota en cada mensaje, joder con. El ranking como único testigo del veredicto.',

      'El no se te lee entero. Fracasado. Se nota en cada mensaje, joder. con el parte del comando cerrado en firme.',

      'Se te lee el no tener. Ridículo. Se nota en cada mensaje. Y el contador lo dejó por escrito sin debate.',

      'Sin el volumen eres un silencio incómodo, [nombre]. Gilipollas. Y sin segunda oportunidad en este mensaje.',

      'Alfa sin organigrama. Patético. El bot no regala décimas. Se nota en cada mensaje, joder. Y el historial del comando queda de testigo.',

      'Quiebra de credibilidad total. Coño. Se nota en cada mensaje, joder. con el parte del comando cerrado en firme.',

      'Etiqueta a la vista. Pringado. Nivel sótano documentado. Se nota en cada mensaje, joder mientras el grupo tomaba nota del resultado.',

      'La dureza prestada se devuelve con intereses de ridículo. Joder. Sin que nadie pudiera fingir que no lo vio.',

      'Decorado caído a la primera. Coño. El ranking no miente. Se nota en cada mensaje, joder. con el parte del comando cerrado en firme.',

      'La función no convence. Fracasado. Se nota en cada mensaje, joder en el momento más visible del chat.',

      'Mala función de macho. Ridículo. El chat ya lo archivó. Se nota en cada mensaje, joder en el momento más visible del chat.',

      'Hablas como un manual de macho de los noventa y se te ve el cartón a kilómetros. Gilipollas en el momento más visible del chat.',

      'Hablas de respeto y no te lo tienes a ti mismo: el espejo lo sabe, [nombre]. Gilipollas. Hostia puta, qué nivel.',

      'Masculinidad en números rojos de credibilidad, [nombre]. Coño. Se nota en cada mensaje, joder. Hostia puta, qué nivel.',

      'El disfraz sudado no engaña a quien ha visto otros. Mierda. El bot no regala décimas. Se nota en cada mensaje, joder.',

      'Deporte rey: presumir de lo ausente, [nombre]. Pringado. Se nota en cada mensaje, joder. Hostia puta, qué nivel.',

      'Disfraz con precio todavía colgando, [nombre]. Patético. Nivel sótano documentado. Se nota en cada mensaje, joder.',

      'Acero de anuncio y cristal de realidad, [nombre]. Cabrón. Se nota en cada mensaje, joder. Hostia puta, qué nivel.',

      'Especialista en vacío con eslogan, [nombre]. Patético. El ranking no miente. Se nota en cada mensaje, joder.',

      'Pecho fuera y rodilla temblando: foto completa. Basura. Se nota en cada mensaje, joder. Hostia puta, qué nivel.',

      'Masculinidad de las que el low te deja en el sótano del ranking sin debate, [nombre]. Se ve desde el primer mensaje, sin anestesia, coño.',

      'Tienes más pretensión de macho que sustancia y el low lo grita, [nombre]., el chat ya lo sabía, cabrón.',

      'Masculinidad de manual fallido: ni el gesto te salva ni la pose colabora, [nombre]. Eso no se maquilla con ángulo, nivel sótano puro, gilipollas.',

      'Se te nota el almost de hombre hasta en el mensaje más trabajado, [nombre]. El tramo te nombra sin permiso, sin filtro ni consuelo, patético.',

      'Masculinidad de fondo de ranking: siempre el mismo fail y cero chispa, [nombre]. No hay segunda lectura útil, diagnóstico cerrado, asco.',

      'Has convertido la falta de masculinidad real en identidad del low, [nombre]. El material habla solo, y se te nota a la legua, basura.',

      'Masculinidad sin el barniz: solo teatro y el low lo documenta, [nombre]. Aquí, el bot no regala décimas, ridículo.',

      'El listón de lo masculino lo miras desde abajo y no has subido, [nombre]. El ranking firma y listo, archivo sin apelación, fracasado.',

      'Masculinidad con el mismo gag de siempre y cero variación, joder, el ranking no miente El ranking no miente, joder.',

      'Se te oye el eco del fail hasta en los neutros del chat, [nombre]., con el grupo de testigo, mierda.',

      'Masculinidad de historial público: no hace falta zoom, se lee en la superficie, [nombre]. Eso no se maquilla con ángulo, sin maquillaje posible, coño.',

      'Tienes más pretensión que presencia de hombre y el low no se traga el cuento, [nombre]. El tramo te nombra sin permiso, el veredicto es ese, cabrón.',

      'Masculinidad cutre: ni el caos tiene estilo ni el desastre tiene misterio, [nombre]. No hay segunda lectura útil, hostia puta qué nivel.',

      'Has hecho del bajo listón de hombre tu residencia en el low, [nombre]. El material habla solo, joder.',

      'Masculinidad de las que el mute ajeno lee como misterio y es solo desinterés, [nombre]. Aquí. Hostia puta, qué nivel.',

      'El asco. No es bullying: es el diagnóstico del low del comando, [nombre]. El ranking firma y listo, coño.',

      'Masculinidad constante: la única racha es la de no generar presencia real, [nombre]. Se ve desde el primer mensaje, cabrón.',

      'Se te nota la prisa por parecer y cero plan de ser de verdad, [nombre]. Hostia puta, qué nivel. Hostia, el desastre se explica solo, joder.',

      'Masculinidad de cartel de aviso: se lee de lejos y nadie quiere el producto, [nombre]. Eso no se maquilla con ángulo, patético.',

      'No hay misterio interesante: hay previsible y flojo, el combo del low, [nombre]. El tramo te nombra sin permiso, asco.',

      'Tienes el historial de un local cerrado por falta de clientela de respeto, [nombre]. No hay segunda lectura útil, basura.',

      'Masculinidad de inercia: el grupo te soporta por costumbre, no por presencia, [nombre]. El material habla solo, ridículo.',

      'El recato de lo masculino te queda lejos y la distancia es rechazo, [nombre]. Aquí. Hostia puta, qué nivel.',

      'Masculinidad de ranking: bajas la media del tramo con constancia de almost, [nombre]. El ranking firma y listo, qué asco de frame.',

      'Has convertido el almost de hombre en carnet del low, [nombre].coño. Se ve desde el primer mensaje, y el ranking no miente.',

      'Masculinidad de estribillo que mancha más con cada pose del mismo fail, [nombre]., sin anestesia, basura.',

      'Se te nota el hábito de empujar cada foto hacia el mismo almost, [nombre]. Eso no se maquilla con ángulo, el chat ya lo sabía, ridículo.',

      'La compostura de lo masculino no te reconoce y tú no has buscado el espejo, [nombre]. El tramo te nombra sin permiso, nivel sótano puro, fracasado.',

      'Masculinidad de fondo permanente: el low no es un mal día, es el nivel, [nombre]. No hay segunda lectura útil, sin filtro ni consuelo, joder.',

      'No es mala suerte de pose: es patrón y el low te lo cobra, [nombre]. El material habla solo, diagnóstico cerrado, mierda.',

      'Tienes más grasa de pretensión que un freidor al cierre, [nombre]. Aquí, y se te nota a la legua, coño.',

      'Masculinidad de ceja ajena levantada y respeto en el sótano, [nombre]. El ranking firma y listo, el bot no regala décimas, cabrón.',

      'El promedio de este tramo es el tuyo: el suelo del low, [nombre]. Se ve desde el primer mensaje, archivo sin apelación, gilipollas.',

      'Has convertido la falta de chispa en identidad y no hay detergente, [nombre]. Hostia puta, qué nivel.',

      'Masculinidad cutre y sin complejo: el complejo pediría espejo y no lo hay, [nombre]. Eso no se maquilla con ángulo, con el grupo de testigo, asco.',

      'Se te oye el masticar del listón bajo hasta en los neutros, [nombre]. El tramo te nombra sin permiso, sin maquillaje posible, basura.',

      'La dignidad de lo masculino no te coge el teléfono: el buzón está lleno de noes, [nombre], el veredicto es ese, ridículo.',

      'Masculinidad de letrero grasiento: se lee de lejos y no invita a entrar, [nombre]. El material habla solo, hostia puta qué nivel.',

      'No hay misterio de almost con estilo: hay lo previsible y el low lo nombra, [nombre]. Aquí. Hostia puta, qué nivel.',

      'Tienes el historial de un fregadero abandonado desde el domingo, [nombre]. El ranking firma y listo, mierda.',

      'Masculinidad de malinterpretar el silencio como respeto al underdog, [nombre]. Se ve desde el primer mensaje, coño.',

      'El grupo paga tu rastro de pretensión en cuotas diarias de hastío, [nombre]. Hostia puta, qué nivel.',

      'Has dejado el chat como vestuario de derrota de presencia, [nombre]. Eso no se maquilla con ángulo, gilipollas.',

      'Masculinidad de estribillo sin punto final limpio ni redención, [nombre]. El tramo te nombra sin permiso, patético.',

      'Se te nota el peso de arrastrar el mismo almost por cada hilo, [nombre]. No hay segunda lectura útil, asco.',

      'La compostura cruza de acera cuando te ve en el low del comando, [nombre]. El material habla solo, basura.',

      'Masculinidad de feria: ruido de fail, suelo peor y cero ganas de volver, [nombre]. Aquí. Hostia puta, qué nivel.',

      'Se te ve venir el almost en la primera miniatura del estado, [nombre]. El ranking firma y listo, fracasado.',

      'La dignidad del tramo no para: tú eres el tráfico del arcén, [nombre]. Se ve desde el primer mensaje, qué asco de frame.',

      'Masculinidad de superficie suficiente: no hace falta abrir el vestuario, huele a fail, [nombre]. Patético.',

      'No hay barniz que salve: hay almost puro y el low lo cobra, [nombre]. Eso no se maquilla con ángulo, sin anestesia, coño.',

      'Masculinidad de puta madre en el sentido del desastre: el low no suaviza la falta de presencia, [nombre]. Basura.',

      'Tu almost de hombre es el gag del tramo. Y el grupo no pide replay, [nombre]. No hay segunda lectura útil, nivel sótano puro, gilipollas.',

      'Masculinidad de las que el respeto ajeno te debe una hostia y. El ranking te la cobra, [nombre]. Fracasado.',

      'Se te cae el personaje de hombre solo con abrir la cámara, [nombre]. Aquí, diagnóstico cerrado, asco.',

      'Masculinidad de almost eterno: esta vez tampoco fue la excepción, [nombre]. El ranking firma y listo, y se te nota a la legua, basura.',

      'No hay redención en este low: hay veredicto y te nombra. Sin filtro, [nombre]. Se ve desde el primer mensaje, el bot no regala décimas, ridículo.',

      'Masculinidad con más filtros que sustancia y aun así no cuela en el low, [nombre]., archivo sin apelación, fracasado.',

      'El low te ha puesto en tu sitio: abajo del todo de la presencia del grupo, [nombre]. Eso no se maquilla con ángulo.',

      'Masculinidad de las que juraban que esta vez el gesto sí, y no, [nombre]. El tramo te nombra sin permiso, con el grupo de testigo, mierda.',

      'Tu almost es el contenido gratis de ridículo del hilo, [nombre]. No hay segunda lectura útil, sin maquillaje posible.',

      'Masculinidad de ranking roto: el número bajo te queda de apodo, [nombre]. El material habla solo, el veredicto es ese, cabrón.',

      'Se te ve el fail desde el primer mensaje del comando, [nombre]. Aquí, hostia puta qué nivel. Hostia puta, qué nivel.',

      'Masculinidad de repertorio: siempre la misma pose de almost y cero plan B, [nombre]. El ranking firma y listo, joder.',

      'El asco del low resume el tramo y el resto desarrolla el diagnóstico, [nombre]. Se ve desde el primer mensaje, mierda.',

      'Masculinidad de puto almost: ni el low light te favorece y. El ranking lo grita, [nombre], coño. Y. Hostia puta, qué nivel.',

      'Has montado el teatro de hombre y el público solo vio el fail, [nombre]. Eso no se maquilla con ángulo, cabrón.',

      'Masculinidad de las que confunden pose con presencia y pierden las dos, [nombre]. El tramo te nombra sin permiso, gilipollas.',

      'Tu almost es un aviso de lo que no hay que perseguir en el grupo, [nombre]. No hay segunda lectura útil, patético.',

      'Masculinidad con más pretensión que sustancia y el low no se traga el cuento, [nombre]. El material habla solo, asco.',

      'El low no discute: el número habla y tú callas, [nombre].gilipollas. Aquí. Hostia puta, qué nivel. Hostia, el desastre se explica solo, joder.',

      'Masculinidad de las que el natural es no generar presencia., [nombre]. Patético. Hostia puta, qué nivel.',

      'Se te nota el almost hasta en la foto más trabajada del perfil, [nombre]. Se ve desde el primer mensaje, fracasado.',

      'Masculinidad de almost documentado: autor tú, testigo el grupo, [nombre]., qué asco de frame. Hostia puta, qué nivel.',

      'No hay segunda lectura útil en este low: hay cara y hay veredicto, [nombre]. Eso no se maquilla con ángulo, y el ranking no miente, asco.',

      'Masculinidad de las que el filtro de hombre se rinde antes que el de respeto, [nombre]. El tramo te nombra sin permiso, sin anestesia, basura.',

      'Tu presencia en el low es el gag del comando y no el cumplido, [nombre]. No hay segunda lectura útil, el chat ya lo sabía, ridículo.',

      'Masculinidad de ranking: el tramo bajo te queda como un guante de derrota, [nombre]. El material habla solo, nivel sótano puro, fracasado.',

      'Has convertido el almost de hombre en residencia fiscal del low, [nombre]. Aquí, sin filtro ni consuelo, joder.',

      'Masculinidad de las que. El chat archiva el fail sin pedir amplificación, [nombre]. El ranking firma y listo, diagnóstico cerrado, mierda.',

      'El low te nombra sin suavizar: almost de base y punto, [nombre]. Se ve desde el primer mensaje, y se te nota a la legua, coño.',

      'Masculinidad con la disciplina de quien nunca aceptó el espejo de la presencia, [nombre]. Gilipollas.',

      'Se te ve venir el fail en la primera miniatura del estado, [nombre]. Eso no se maquilla con ángulo, archivo sin apelación, gilipollas.',

      'Masculinidad de puta pena: el comando no regala presencia y tú lo sabes, [nombre]. El tramo te nombra sin permiso.',

      'Tu almost baja el promedio del hilo solo con cargarse, [nombre]. No hay segunda lectura útil, con el grupo de testigo, asco.',

      'Masculinidad de las que el modo hombre tampoco es cómplice del fail, [nombre]. El material habla solo, sin maquillaje posible, basura.',

      'El low es tu tramo natural y. El ranking no ofrece recurso, [nombre]. Aquí, el veredicto es ese, ridículo.',

      'Masculinidad de almost eterno con firma legible en cada pose del chat, [nombre]. El ranking firma y listo, hostia puta qué nivel.',

      'No es un mal día: es el nivel y el low te lo cobra sin descuento, [nombre]. Se ve desde el primer mensaje, joder.',

      'Masculinidad de las que necesitan suerte y aun así el resultado es mierda, [nombre]. Hostia puta, qué nivel.',

      'Tu frame es el argumento más corto del comando y el más claro, [nombre]. Eso no se maquilla con ángulo, coño.',

      'Se te cae el disimulo de hombre solo con el flash del chat, [nombre]. El tramo te nombra sin permiso, cabrón.',

      'Masculinidad de las que el grupo no cita porque no hay presencia que citar, [nombre]. No hay segunda lectura útil, gilipollas.',

      'Has firmado el fail con cada almost como única firma del low, [nombre]. El material habla solo, patético.',

      'Masculinidad de superficie: basta la vista, no hace falta el sótano, [nombre]. Aquí. Hostia puta, qué nivel.',

      'El low no es caridad: es veredicto y te nombra sin anestesia, [nombre]. El ranking firma y listo, basura.',

      'Masculinidad de puto desastre: ni el gesto ni la química colaboran contigo, [nombre]. Se ve desde el primer mensaje, ridículo.',

      'Masculinidad de las que el algoritmo de presencia pide la baja por agotamiento, [nombre]. Hostia puta, qué nivel.',

      'El ranking de hombre te deja en el sótano del low sin debate, [nombre]. Eso no se maquilla con ángulo, qué asco de frame.',

      'Masculinidad de las que confunden natural con no generar nada de presencia, [nombre]. El tramo te nombra sin permiso, y el ranking no miente, mierda.',

      'No hay filtro mágico: hay evidencia y el low la firma en público, [nombre]. No hay segunda lectura útil, sin anestesia, coño.',

      'Masculinidad con más pretensión que chispa y el comando no se traga el cuento, [nombre]. El material habla solo, el chat ya lo sabía, cabrón.',

      'Tu almost es el gag del tramo. Y el grupo no pide repetición, [nombre]. Aquí, nivel sótano puro, gilipollas.',

      'Masculinidad de almost documentado en alta definición del chat, [nombre]. El ranking firma y listo, sin filtro ni consuelo, patético.',

      'Se te ve el fail desde el otro lado del puto ranking, [nombre]. Se ve desde el primer mensaje, diagnóstico cerrado, da pena ajena.',

      'Masculinidad de las que la presencia y. El ranking coinciden en. El veredicto, [nombre]., y se te nota a la legua, basura.',

      'El low te ha puesto en tu sitio sin necesidad de narrador, [nombre]. Eso no se maquilla con ángulo, el bot no regala décimas, ridículo.',

      'Has montado el teatro de hombre y solo salió el fail del low, [nombre]. El tramo te nombra sin permiso, archivo sin apelación, fracasado.',

      'Masculinidad de ranking: el tramo bajo es tu residencia fija, [nombre]. No hay segunda lectura útil, da vergüenza.',

      'Tu almost baja el promedio del grupo en un solo estado, [nombre]. El material habla solo, con el grupo de testigo, qué flojo.',

      'Masculinidad de las que el modo hombre se arrepiente de haberse abierto, [nombre]. Aquí, sin maquillaje posible, menudo desastre.',

      'No es luz mala ni cámara mala: eres tú y el low lo dice claro, [nombre]. El ranking firma y listo, el veredicto es ese, qué pena.',

      'Masculinidad de almost eterno: el comando no convierte el casi en victoria, [nombre]. Se ve desde el primer mensaje, hostia puta qué nivel, patético.',

      'Se te cae el personaje de hombre en la primera foto del hilo, [nombre]. Hostia puta, qué nivel. Hostia, el desastre se explica solo, miserable.',

      'Masculinidad de las que necesitan tutorial de presencia y de dignidad, [nombre]. Eso no se maquilla con ángulo, qué cringe.',

      'El low no regala décimas: el número habla y tú estás abajo, [nombre]. El tramo te nombra sin permiso, da asco.',

      'Masculinidad de puto almost con firma en cada miniatura del chat, [nombre]. No hay segunda lectura útil, qué vergüenza.',

      'Tu frame es contenido de ridículo gratis para el grupo, [nombre]. El material habla solo, ridículo.',

      'Has convertido el fail de presencia en marca personal del low, [nombre]. Aquí. Hostia puta, qué nivel, fracasado.',

      'Masculinidad de repertorio gastado: las mismas poses, el mismo almost, [nombre]. El ranking firma y listo, asco, qué miseria.',

      'Se te nota el desastre hasta en la foto de perfil más antigua, [nombre]. Se ve desde el primer mensaje, basura.',

      'El low te nombra sin suavizar ni media coma del veredicto, [nombre]. Hostia puta, qué nivel. Hostia, el desastre se explica solo, qué nivel de pena.',

      'Masculinidad de almost: ni el low light te favorece. Y el chat lo ve, [nombre]. Eso no se maquilla con ángulo, fracasado.',

      'Tu presencia es un argumento contra la química del grupo, [nombre]. El tramo te nombra sin permiso, qué asco de frame, qué cutre.',

      'Masculinidad de puta pena en el tramo que más se lee del comando, [nombre]. No hay segunda lectura útil, y el ranking no miente, da pena ajena.',

      'No hay redención en este low: hay cara, hay número y hay veredicto, [nombre]. El material habla solo, sin anestesia, basura.',

      'Masculinidad de las que el grupo archiva el fail sin pedir bis, [nombre]. Aquí, el chat ya lo sabía, ridículo.',

      'Se te ve venir el fail en la primera palabra del estado, [nombre]. El ranking firma y listo, nivel sótano puro, fracasado.',

      'Masculinidad de ranking roto: el sótano del tramo te queda de casa, [nombre]. Se ve desde el primer mensaje, sin filtro ni consuelo, joder.',

      'El comando no discute contigo: el low firma y punto, [nombre]., diagnóstico cerrado, mierda. Hostia puta, qué nivel, qué flojo.',

      'Tu almost es el epitafio del hombre de hoy, [nombre].asco. Eso no se maquilla con ángulo, y se te nota a la legua, menudo desastre.',

      'Masculinidad de puto desastre documentado. Delante del grupo entero, [nombre]. El tramo te nombra sin permiso, el bot no regala décimas, qué pena.',

      'Has firmado el fail con cada ángulo malo como única firma del low, [nombre]. No hay segunda lectura útil, archivo sin apelación, patético.',

      'Masculinidad de superficie suficiente: basta una mirada, sobra el resto, [nombre]. El material habla solo, miserable.',

      'El low es tu tramo y. El ranking no ofrece mudanza, [nombre]. Aquí, con el grupo de testigo, asco. Hostia puta, qué nivel, qué cringe.',

      'Se te cae el frame de hombre solo con cargar la cámara frontal, [nombre]. El ranking firma y listo, sin maquillaje posible, basura.',

      'Masculinidad de almost eterno con. El chat de testigo notarial, [nombre]. Se ve desde el primer mensaje, el veredicto es ese, ridículo.',

      'No es un mal día de fotos: es el nivel y el low te lo cobra, [nombre]., hostia puta qué nivel. Hostia puta, qué nivel, ridículo.',

      'Masculinidad de puta madre: el tramo bajo no suaviza. El veredicto de presencia, [nombre]. Gilipollas, fracasado.',

      'Tu frame es el gag más corto y más claro del comando, [nombre]. El tramo te nombra sin permiso, qué miseria.',

      'El low te deja donde mereces: abajo, sin debate ni consuelo, [nombre]. No hay segunda lectura útil, da grima.',

      'Masculinidad de ranking: el número bajo te nombra sin anestesia ni filtro, [nombre]. El material habla solo, qué nivel de pena.',

      'Has montado el circo de hombre y solo salió el payaso del fail, [nombre]. Aquí. Hostia puta, qué nivel, basura.',

      'Masculinidad de desastre de presencia: el low no es caridad, es sentencia, [nombre]. El ranking firma y listo, patético.',

      'El ranking de presencia y el low coinciden: sótano, sin recurso, [nombre]. Se ve desde el primer mensaje, asco, da pena ajena.',

      'Masculinidad de puto almost firmado en cada miniatura del estado, [nombre]. Hostia puta, qué nivel. Hostia, el desastre se explica solo, qué vacío.',

      'No hay segunda oportunidad en este tramo: hay veredicto y te nombra, [nombre]. Eso no se maquilla con ángulo, ridículo.',

      'Se te ve el fail desde el primer pixel del mensaje, [nombre]. El tramo te nombra sin permiso, fracasado.',

      'El low te ha puesto en tu sitio sin narrador ni subtítulos, [nombre]. No hay segunda lectura útil, qué asco de frame, da vergüenza.',

      'Tu frame es un aviso de lo que no hay que reproducir en. El chat, [nombre]. El material habla solo, y el ranking no miente, qué flojo.',

    ],
    extreme: [
      'Tienes la masculinidad real, la que no se anuncia porque no hace falta Aquí, sin anestesia, coño. Hostia puta, qué nivel.',

      'Tu manera de manejar la presión es lo que te define. Los momentos fáciles no dicen nada de nadie, el chat ya lo sabía, cabrón.',

      'Eres de los pocos que tienen el carácter que necesitan y no el que les conviene mostrar Se ve desde el primer mensaje, nivel sótano puro, gilipollas.',

      'La solidez que tienes no se finge ni se aprende. O se construye o no está, sin filtro ni consuelo, patético.',

      'Eres de los que la gente recuerda cuando necesita un ejemplo de cómo se hace Eso no se maquilla con ángulo, diagnóstico cerrado, asco.',

      'Tu palabra pesa porque la respaldas con hechos cuando nadie más quiere dar la cara El tramo te nombra sin permiso, y se te nota a la legua, basura.',

      'La calma que mantienes bajo presión es exactamente lo que distingue al hombre del que aparenta, el bot no regala décimas, ridículo.',

      'Tienes el carácter que necesitas, no el que te conviene mostrar, y eso muy pocos lo tienen, archivo sin apelación, fracasado.',

      'Cuando todo se complica, eres de los que se quedan, y eso ya dice todo lo que hay que decir. Hostia puta, qué nivel.',

      'La solidez que proyectas no es actuación. Se construyó con años de ser el mismo siempre El ranking firma y listo, con el grupo de testigo, mierda.',

    ],
  },

  // ===== NEGATIVOS =====

  gay: {
    name: 'gay',
    goodIsHigh: false,
    high: [
      'Maricón de historial público: no hace falta escarbar, está en la superficie, [nombre]. Se te ve a la legua, joder.',

      'Maricón de inercia: el grupo te soporta por costumbre, no por respeto real, [nombre]. Hostia puta, qué nivel.',

      'Maricón de repertorio: siempre la misma carta y cero plan B de dignidad, [nombre]. Sin disimulo posible, coño.',

      'Maricón sin complejo útil: el complejo al menos indicaría que viste el espejo, [nombre]. Sin anestesia, patético.',

      'Maricón convertido en wallpaper del fail colectivo. asco La boca niega y el cuerpo firma, gilipollas.',

      'Maricón de los que miran culos de tíos con devoción de misa y luego niegan la religión, [nombre]. Joder.',

      'Maricón de estribillo que mancha más con cada repetición del mismo plato, [nombre]. Hostia puta, qué nivel.',

      'Maricón de malinterpretar el silencio ajeno como invitación a más teatro, [nombre]. Sin disimulo posible, basura.',

      'Maricón con el mismo gag de siempre y cero variación., y el grupo no se traga el cuento, ridículo. Hostia puta, qué nivel.',

      'Maricón de las que confunden natural con abandono total del estándar, [nombre]. La boca niega y el cuerpo firma, fracasado.',

      'Maricón de superficie suficiente: no hace falta abrir el cubo, huele, [nombre]. Se te ve a la legua, joder.',

      'Maricón de estribillo que empeora con cada bis del mismo número, cutre.[nombre]. Sin anestesia, cabrón.',

      'Maricón de las que el filtro de respeto se rinde y pide la baja, [nombre]. Sin disimulo posible, coño.',

      'Maricón de feria: grasa, ruido, suelo peor y cero ganas de volver, [nombre]. Hostia puta, qué nivel.',

      'Maricón hasta para el modo oscuro: ni la sombra tapa el montaje, [nombre]. La boca niega y el cuerpo firma, gilipollas.',

      'Maricón de respeto ajeno en números rojos del ranking del grupo, [nombre]. Se te ve a la legua, patético.',

      'Maricón de puta madre: el high no suaviza el teatro ni el personajito del ranking, [nombre]. Patético.',

      'Maricón cutre de manual: ni el vicio tiene gracia ni la pose tiene mérito, [nombre]. Sin disimulo posible, basura.',

      'Maricón de superficie: basta la vista, no hace falta el sótano del historial, [nombre]. Hostia puta, qué nivel.',

      'Maricón de las que el mute ajeno lee como misterio y se equivoca de libro, [nombre]. Sin anestesia, mierda.',

      'Maricón de cartel grasiento: se ve el anuncio y nadie quiere la función, [nombre]. Se te ve a la legua, joder.',

      '[nombre], maricón de inercia: el grupo te soporta por costumbre, no por respeto, cabrón. Hostia puta, qué nivel.',

      'Maricón de malinterpretar el mute como interés por el personaje barato, [nombre]. Sin disimulo posible, coño.',

      'La dignidad no te coge el teléfono: el buzón está lleno de avisos del grupo, [nombre]. Hostia puta, qué nivel.',

      'No hay misterio de pose con estilo: hay lo previsible y el high lo nombra, [nombre]. La boca niega y el cuerpo firma, gilipollas.',

      'Tienes el tono de quien acumula restos de personaje y nunca pasa el estropajo, [nombre]. Se te ve a la legua, patético.',

      'Has hecho del personajito tu marca y la marca se pega en los dedos ajenos, [nombre]. Hostia puta, qué nivel.',

      'después de un comentario sospechoso es otro ladrillo en el muro del armario. Llevas una puta muralla china de bromas, gilipollas.',

      'El recato te queda lejos y la distancia es rechazo, no mística de personaje, [nombre]. Hostia puta, qué nivel.',

      'Se te nota el hábito de empujar cada tema hacia el mismo teatro barato, [nombre]. La boca niega y el cuerpo firma, fracasado.',

      'Maricón constante: la única racha que mantienes es la del mismo número, [nombre]. Se te ve a la legua, joder.',

      'Maricón de racha perfecta: lo único que no fallas es el mismo número, [nombre]. Hostia puta, qué nivel.',

      'Maricón de estribillo sin punto final limpio ni redención posible, [nombre]. Sin disimulo posible, coño.',

      'No hay misterio interesante: hay previsible y flojo, el combo del high, [nombre]. Hostia puta, qué nivel.',

      'La dignidad del nivel no para el coche: tú eres el tráfico del arcén, [nombre]. La boca niega y el cuerpo firma, gilipollas.',

      'Tienes el aura del plato olvidado: presente, frío y con restos de pose, [nombre]. Sin anestesia, basura.',

      'El promedio del high es este: no un mal día, el nivel del nivel completo, [nombre]. Hostia puta, qué nivel.',

      'Maricón de ceja ajena levantada y respeto en el sótano del ranking, [nombre]. Sin disimulo posible, basura.',

      'Maricón de letrero grasiento: se lee de lejos y no invita a entrar, [nombre]. Hostia puta, qué nivel.',

      'Maricón de las que alardean del teatro porque callar las deja sin rol, [nombre]. La boca niega y el cuerpo firma, fracasado.',

      'Maricón de error de lectura: confundes límites con permiso para seguir, [nombre]. Se te ve a la legua, joder.',

      'Has convertido el personajito en identidad y no hay detergente narrativo, [nombre]. Hostia puta, qué nivel.',

      'Has firmado el personajito con grasa en cada mensaje como única firma, [nombre]. Sin disimulo posible, coño.',

      'No hay eco de estilo: hay eco de pose. Y el chat lo amplifica de más, [nombre]. Sin anestesia, patético.',

      'Maricón visible desde lejos: el rastro se ve, la parada no compensa, [nombre]. La boca niega y el cuerpo firma, gilipollas.',

      'Maricón cutre y sin complejo: el complejo indicaría espejo y no lo hay, [nombre]. Se te ve a la legua, patético.',

      'Tienes el historial de un fregadero que nadie ha tocado desde el domingo, [nombre]. Hostia puta, qué nivel.',

      'La clase te suena a ataque y respondes con más del mismo plato grasiento, [nombre]. Sin disimulo posible, basura.',

      'Has hecho del personajito una marca que se pega en los dedos ajenos, [nombre]. Hostia puta, qué nivel.',

      'Tienes más episodios de pose que de algo que. El chat respete de verdad, [nombre]. La boca niega y el cuerpo firma, fracasado.',

      'La compostura no te reconoce y tú no has buscado el espejo en serio, [nombre]. Se te ve a la legua, joder.',

      'El promedio de este tramo es el tuyo: no un pico, el suelo del high, [nombre]. Sin anestesia, cabrón.',

      'Has dejado el chat como fregadero a medias: restos de pose eternos, [nombre]. Sin disimulo posible, coño.',

      'El precio de tu repertorio lo paga el hilo en tiempo y en paciencia, [nombre]. Hostia puta, qué nivel.',

      'Se te cae el disimulo solo con abrir el hilo y el high lo documenta, [nombre]. La boca niega y el cuerpo firma, gilipollas.',

      'Tu mensaje es un aviso de lo que no hay que tomar en serio en el grupo, [nombre]. Se te ve a la legua, patético.',

      'Tienes una presencia que ensucia el hilo en un solo mensaje de teatro, [nombre]. Hostia puta, qué nivel.',

      'Se te nota el teatro en cada mensaje y el high no aplaude el montaje, [nombre]. Sin disimulo posible, basura.',

      'Se te nota el hábito de empujar cada hilo hacia el mismo escenario, [nombre]. Hostia puta, qué nivel.',

      'No hay barniz que te salve: hay pose de base y el comando la cobra, [nombre]. La boca niega y el cuerpo firma, fracasado.',

      'Maricón sin capa de carisma que disimule el agujero. Se te ve a la legua, joder, y el grupo no se traga el cuento, joder.',

      'Maricón de fondo permanente: el high no es un mal día, es el nivel, [nombre]. Hostia puta, qué nivel.',

      'El listón de la dignidad lo usas de rampa y el high te empuja abajo, [nombre]. Sin disimulo posible, coño.',

      'Se te oye el arrastre del personaje hasta en los mensajes serios, [nombre]., y el grupo no se traga el cuento, cabrón.',

      'Maricón de ranking: bajas la media del nivel con constancia molesta, [nombre]. La boca niega y el cuerpo firma, gilipollas.',

      'No es atrevimiento: es suciedad de personaje y el nivel te la cobra, [nombre]. Se te ve a la legua, patético.',

      'El listón lo usas de pan y el suelo del chat es tu mantel preferido, [nombre]. Hostia puta, qué nivel.',

      'La dignidad hace autostop y el tráfico del arcén del ranking eres tú, [nombre]. Sin anestesia, fracasado.',

      'No hay barniz de antihéroe: hay pose y el high la cobra sin descuento, [nombre]. Hostia puta, qué nivel.',

      'Maricón con la disciplina de quien nunca ha cerrado el mismo número, [nombre]. La boca niega y el cuerpo firma, fracasado.',

      'El ranking de dignidad te deja donde mereces: en el sótano del high, [nombre]. Se te ve a la legua, joder.',

      'Maricón cutre: el estereotipo sin el carisma que a veces lo salva, [nombre]. Hostia puta, qué nivel.',

      'Has hecho del afeminamiento un ranking personal y el oro es tuyo sin rival, [nombre]. Sin disimulo posible, coño.',

      'Se te ve venir el teatro en el primer punto del mensaje del hilo, [nombre]., y el grupo no se traga el cuento, cabrón.',

      'La compostura del nivel no te reconoce en el elenco del ranking, [nombre]. La boca niega y el cuerpo firma, gilipollas.',

      'Tu presencia baja el promedio de dignidad del chat solo con escribir, [nombre]. Sin anestesia, basura.',

      'Has convertido el armario en escenario y la función aburre al patio, [nombre]. Hostia puta, qué nivel.',

      'Has hecho del bajo listón tu residencia. y no hay mudanza a la vista, [nombre]. Sin disimulo posible, basura.',

      'Se te oye el masticar del listón bajo hasta en los neutros del chat, [nombre]. Hostia puta, qué nivel.',

      'El grupo paga tu rastro en cuotas diarias de hastío documentado, [nombre]. La boca niega y el cuerpo firma, fracasado.',

      'Se te ve venir la pose en la primera palabra del mensaje del chat, [nombre]. Se te ve a la legua, joder.',

      'Has dejado el hilo como obra sin plano: escombro de pose y nada más, [nombre]. Hostia puta, qué nivel.',

      'Maricón de los que el high del ranking no perdona ni un frame, [nombre]. Sin disimulo posible, coño, y el grupo no se traga el cuento, coño.',

      'Se te nota el peso de arrastrar el mismo personaje por cada hilo, [nombre]. Sin anestesia, patético.',

      'No hay barniz que salve: hay pose pura y no se vende como carisma, [nombre]. La boca niega y el cuerpo firma, gilipollas.',

      'No es estilo: es pose previsible y el high te la nombra entero, [nombre]. Se te ve a la legua, patético.',

      'El high no es un mal día de pose: es. ridículo, y el grupo no se traga el cuento, asco. Hostia puta, qué nivel.',

      'Maricón de armario con puerta de vaivén: sales un segundo y vuelves a entrar, se ve desde fuera, [nombre]. Cabrón.',

      'Maricón de feria ambulante: el mismo show, el mismo asco, cero nostalgia, [nombre] y el contador no miente nunca.',

      'Se te nota el desastre hasta en la miniatura del estado, [nombre]. La boca niega y el cuerpo firma, fracasado.',

      'Cada comentario sospechoso es una pista. Llevas un puto rastro de migas de pan hasta el armario, gilipollas.',

      'No es estilo sucio con gracia: eres maricón de pose y el high no discute la evidencia, [nombre]. Pringado, cabrón.',

      'Cada pista que dejas es una miga de pan hasta el armario. Llevas un puto rastro de migas, gilipollas.',

      'Maricón de fondo: bajas la media del high con la constancia de quien no se cansa, [nombre]. Pringado, patético.',

      'Tu heterosexualidad es un traje prestado dos tallas grande. Se te ve el culo por todos lados y encima dices que te queda bien, gilipollas.',

      'Se te nota la prisa por ser el personaje y cero plan de ser alguien de peso, [nombre]. Se te ve a la legua, patético.',

      'Miras culos de tíos con más detenimiento que un arquitecto revisando planos. Y luego dices que es por el corte del pantalón, gilipollas.',

      'Se te nota que ensuciaste el hilo de pose hace tiempo y perdiste el bayeta, [nombre]. Sin disimulo posible, basura.',

      'Miras culos de tíos con la misma devoción con la que un cura mira el altar. Y luego dices que es por el corte del pantalón, gilipollas.',

      'Tienes más grasa de pose en el discurso que un freidor al cierre de feria, [nombre]. Sin anestesia, mierda.',

      'El grupo ya tiene un ranking interno de cuándo vas a salir. Las apuestas están abiertas y las cuotas bajan cada semana, gilipollas.',

      'Tienes más episodios de personajito que intentos de subir el listón de verdad, [nombre]. Hostia puta, qué nivel.',

      'Gay de closet premium. Sigues fingiendo que te gustan las tías mientras tu culo sueña con que lo partan. El armario está más lleno que tus excusas de mierda.',

      'Tu heterosexualidad es un puto meme de hace diez años. Todo el mundo se ríe menos tú, que sigues repitiendo el chiste sin darte cuenta de que eres el chiste.',

      'Gay de armario premium. Sigues fingiendo que te gustan las tías mientras tu culo sueña con que te lo partan. El armario está más lleno que tus putas excusas.',

      'Gay de armario con moqueta y aire acondicionado. Llevas tanto tiempo dentro que ya tienes dirección fiscal y número de la seguridad social del puto armario.',

      'Sales del armario cada vez que hablas y luego vuelves a entrar corriendo a apagar la luz. El esfuerzo de fingir te está envejeciendo el doble, cabrón.',

      'Te delatas cada vez que un tío bueno pasa: se te para el reloj, se te para la conversación y se te para la polla. Y luego sigues hablando de tetas, fracasado.',

      'Tus playlists, tus gestos y tu manera de cruzar las piernas ya votaron. El recuento es unánime y tú sigues pidiendo repetir las putas elecciones.',

      'Tu historial de búsquedas es más gay que un desfile de moda en Madrid. Y encima usas modo incógnito como si eso borrara la evidencia, cabrón.',

      'Miras a tus bros con una intensidad de catálogo de lencería masculina. Y lo notan todos menos los que tú quisieras que notaran, maricón, coño.',

      'El armario ya no es un armario, es un puto apartamento. Tienes cama, nevera y hasta un puto Roomba limpiando las migas de tus excusas.',

      'Cada vez que un tío se quita la camiseta se te para el tiempo. Luego sigues hablando de tías como si no hubiera pasado nada, maricón, gilipollas.',

      'que añades después de cada comentario es el ladrillo número mil de un armario que construyes tú solo, ladrillo a ladrillo de mierda.',

      'Llevas una vida de método Stanislavski haciendo de hetero. El público se fue en el primer acto y tú sigues en el escenario, maricón, asco.',

      'Hablas de fútbol como quien cumple un trámite. Los heteros de verdad a veces también se aburren, pero no se les nota tanto, maricón, basura.',

      'Te delatas en cada gesto, cada audio y cada \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\'qué guapo está ese cabrón\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\'. La evidencia es tanta que ya ni cuenta como secreto.',

      'Tienes el tono de noches de chat sin una frase que se sostenga sola, [nombre]. Sin disimulo posible, basura.',

      'Miras culos masculinos con la misma devoción con la que un cura mira el altar. Y luego dices que es por el deporte, gilipollas.',

      'Cuando un tío se quita la camiseta se te para el tiempo. Luego reanudas el guion como si nadie hubiera visto el corte, maricón, mierda.',

      'Has hecho del afeminamiento un ranking personal y el oro es tuyo sin rival, [nombre]. Se te ve a la legua, joder Hostia puta, joder Hostia puta, mierda.',

      'Tu culo y tu boca están en guerra civil. El culo quiere que lo partan y la boca sigue con el comunicado oficial, gilipollas.',

      'Gay de armario con terraza y vistas. Llevas tanto tiempo dentro que ya has decorado y todavía dices que es temporal, cabrón.',

      'La evidencia es tanta que ya no cuenta como secreto. Es un anuncio a toda página y tú sigues en modo incógnito, gilipollas.',

      'Hablas de mujeres como quien repasa un guion mal aprendido. Sin improvisación, sin ganas y con ganas de que acabe, maricón, asco.',

      'Dices que no eres gay con la misma frecuencia con la que respiras. Los que no lo son no necesitan el recordatorio, maricón, basura.',

      'Miras culos masculinos con la misma atención con la que otros miran el móvil. Y no es por el modelo del pantalón, maricón, ridículo.',

      'Dices que no miras culos de tíos pero tu cuello gira solo como una antena parabólica. La evidencia es física, gilipollas.',

      'Miras a los tíos como quien mira el escaparate de una tienda de ropa interior masculina. Y todavía lo niegas, gilipollas.',

      'Has hecho de la ambigüedad un hogar y de la claridad una amenaza. Se entiende el miedo, no la mentira diaria, gilipollas.',

      'Hablas de fútbol para disimular y se te nota el aburrimiento a kilómetros. Los heteros de verdad no fingen tanto, cabrón.',

      'Cuando un tío bueno entra al chat se te resetea el hilo. Luego retomas como si no hubiera habido un corte de luz, cabrón.',

      'Miras culos de tíos con la devoción de quien reza. Luego niegas la religión, pero el rezo se te nota en la cara, maricón, gilipollas.',

      'Has convertido la duda en tu zona de confort y la evidencia en un invitado molesto. El invitado ya vive contigo, maricón, patético.',

      'Cuando hablas de mujeres suenas a manual de instrucciones leído en voz alta. Sin pasión y con ganas de terminar, cabrón.',

      'Miras culos de tíos con más atención que un juez revisando pruebas. Y las pruebas están todas en tu contra, gilipollas.',

      'Tu historial de búsquedas, tus pausas y tus miradas ya formaron un expediente. El expediente está completo, gilipollas.',

      'La compostura cruza de acera cuando te ve en el high del comando, [nombre]. Sin disimulo posible, basura.',

      'Dices que te gustan las tías con la misma convicción con la que un rehén lee el comunicado. Forzado y sin alma, cabrón.',

      'Tu armario tiene más metros cuadrados que tu habitación. Y mejor wifi. A este ritmo vas a empadronarte dentro, maricón, mierda.',

      'Maricón de manual cutre: el estereotipo sin el carisma que a veces lo salva, [nombre] con. El chat de testigo obligado, coño.',

      'Llevas tanto tiempo en el personaje que ya no recuerdas cómo se sale. Y fuera hace menos frío de lo que crees, cabrón.',

      'Tienes más pose de armario roto que de personaje con peso real, [nombre]. Sin disimulo posible, coño.',

      'Cada vez que un tío bueno entra al grupo se te resetea el cerebro. Luego sigues hablando de tetas como un puto robot.',

      'Tu culo sueña con que te lo partan mientras tu boca sigue repitiendo el guion de hetero. El cuerpo no miente, cabrón.',

      'Has convertido la duda en un estilo de vida y la evidencia en un ruido de fondo. El ruido ya es ensordecedor, cabrón.',

      'Llevas el pack completo de reprimido: miradas, pausas, bromas y ofensa selectiva. El pack se vende solo, gilipollas.',

      'Cada vez que el tema se acerca cambias de tema con la sutileza de un camión. Se oye el cambio de marcha, indignante.',

      'Tu armario tiene wifi, calefacción y hasta un puto Amazon Prime. A este ritmo vas a pedir comida a domicilio dentro, qué vergüenza ajena.',

      'La evidencia forense está en tus reacciones. El juicio se celebra en el chat cada vez que pasa un tío bueno, da vergüenza.',

      'Tu versión macho es un skin que te pones para el grupo. En cuanto bajas la guardia el skin se cae solo, qué flojo.',

      'Dices que no miras pero tu cuerpo responde antes que tu boca. El cuerpo no ha firmado el pacto de silencio, menudo desastre.',

      'Llevas años en el vestuario y todavía no has salido a escena de verdad. El público está cansado de esperar, qué pena.',

      'La única persona que todavía compra tu versión hetero eres tú. Y cada día la compras con menos convicción, maricón, patético.',

      'Miras el físico de tus bros con un detalle de quien está haciendo inventario. Y el inventario es personal, maricón, asco, miserable.',

      'Maricón de los que. El ranking high no suaviza: el nivel te cobra entero, [nombre] delante de quien no quería verlo, basura.',

      'Has invertido tanto en el disfraz que el día que te lo quites vas a sentir el aire. Conviene sentirlo, da asco.',

      'Tu culo sueña con que lo partan mientras tu boca sigue repitiendo el guion de hetero. El cuerpo no miente, qué vergüenza.',

      'Tu heterosexualidad es un castillo de arena. La marea de la verdad ya está subiendo y se va a llevar todo, ridículo.',

      'Cada vez que un tío se agacha se te para el reloj. Luego sigues como si nada, pero. La boca niega y el cuerpo firma, fracasado.',

      'Dices que te gustan las tías pero tu cuerpo responde a los tíos. El cuerpo no miente, aunque la boca sí, maricón, qué miseria.',

      'La única persona que mantiene el debate eres tú. El resto está en la conclusión desde el año pasado, da grima.',

      'Tu heterosexualidad es un traje de alquiler. Se devuelve al final de la función y la función se alarga, maricón, qué nivel de pena.',

      'Tu boca firma comunicados y tu cuerpo los desmiente en tiempo real. El cuerpo tiene mejor gabinete, basura.',

      'Has convertido la mentira en hábito y el hábito en personalidad secundaria. La secundaria ya manda, qué cutre.',

      'Miras el físico de tus amigos con un detalle que solo un interesado tendría. Y tú estás muy interesado, da pena ajena.',

      'Has construido un personaje hetero tan frágil que se cae con una mirada de más. Y se cae cada día, qué vacío.',

      'Tu versión hetero cabe en un mensaje de voz de ocho segundos. Tu gay reprimido no cabe en un hilo, indignante.',

      'Llevas años haciendo de hetero con método Stanislavski y el público se fue en el primer acto, [nombre]. Joder, qué vergüenza ajena.',

      'con tanta frecuencia que ya es tu firma personal. Los que no lo son no lo aclaran cada quince minutos, da vergüenza.',

      'El grupo ya tiene un grupo de apuestas sobre cuándo vas a salir del armario. Las cuotas están bajando, qué flojo.',

      'Tu hetero es de cartón piedra. Se ve la estructura por debajo. Y el grupo ya no se cree ni el montaje, maricón, menudo desastre.',

      'Tu armario es tan grande que ya tiene código postal. Pronto te van a cobrar IBI por vivir dentro, qué pena.',

      'El teatro dura lo que dura la paciencia del grupo. Y la paciencia se mide en semanas, no en años, patético.',

      'El grupo te tiene fichado con más precisión que tú a ti mismo. Eso ya es el colmo de la negación, miserable.',

      'Tu armario tiene wifi, calefacción y suscripciones. A este ritmo pides comida a domicilio dentro, qué cringe.',

      'Cada vez que niegas con datos inventados el grupo anota la contradicción. El cuaderno está lleno, da asco.',

      'Maricón cutre: ni el vicio tiene gracia ni la pose tiene mérito, [nombre] al natural, sin barniz de consuelo, fracasado.',

      'Cuando hablas de tías suenas a alguien leyendo la letra de una canción en otro idioma. Sin sentirla, maricón, ridículo.',

      'Cada vez que un tío se ríe contigo se te olvida el personaje medio segundo. Ese medio segundo basta, maricón, fracasado.',

      'que sueltas cada cinco minutos es el estribillo de una canción que todo el grupo se sabe de memoria, qué miseria.',

      'Has hecho de la duda un estilo y de la certeza un peligro. El estilo se te está quedando viejo, da grima.',

      'Has invertido en parecer seguro y te has dejado la honestidad en el camino. Se nota el agujero, qué nivel de pena.',

      'Tu cuerpo responde a los tíos y tu boca a la presión social. El cuerpo no ha leído las normas, basura.',

      'El teatro tiene intermedio. Llevas meses en el intermedio y el público quiere el segundo acto, qué cutre.',

      'El grupo tiene memes internos sobre tu armario. Y los memes son más honestos que tus estados, da pena ajena.',

      'Has logrado que hasta los nuevos del grupo te clasifiquen en una tarde. Eficiente sin querer, qué vacío.',

      'El grupo te resume en una palabra. Tú necesitas un párrafo para no decirla. El resumen gana, indignante.',

      'Has hecho de la negación tu deporte olímpico. Llevas medallas de mentira y el podio se nota, gilipollas.',

      'Dices que no miras pero tu cuello gira solo. La evidencia es física. Y el grupo ya la tiene, da vergüenza.',

      'Has invertido en parecer y no en ser. La factura llega cada vez que alguien te mira de más, qué flojo.',

      'Tu boca es el abogado defensor. Tu cuerpo es el testigo que lo hunde. El juicio está visto, menudo desastre.',

      'Dices que te gustan las tías y tu historial de atención dice otra cosa. El historial gana, qué pena.',

      'Tienes el historial de un local cerrado por exceso de pose y falta de sustancia, [nombre]. Fracasado, patético.',

      'tiene menos crédito que un anuncio de madrugada. Nadie lo compra y tú sigues emitiéndolo, miserable.',

      'Has llegado tarde a aceptarlo y temprano a disimularlo. El desfase se nota en cada frase, qué cringe.',

      'Has convertido el personajito en carnet. y no hay renovación limpia a la vista, [nombre]. Gilipollas, da asco.',

      'Hablas de fútbol para disimular pero se te nota. Los heteros no fingen tanto entusiasmo, qué vergüenza.',

      'Llevas años construyendo la coartada. La coartada ya no sostiene el peso de las pruebas, ridículo.',

      'Cuando niegas se te pone la voz de quien defiende un final de mes. Forzado y sin margen, fracasado.',

    ],
    mid: [
      'Joder, el radar pita pero no explota. Algo llevas ahí dentro que no es del todo hetero. Y el grupo lo huele como un pedo en ascensor.',

      'Ni maricón confirmado ni hetero convincente. Estás en ese limbo de mierda donde todo el mundo sospecha y nadie tiene el coño de preguntar.',

      'Tienes una energía bisexual que no admites ni bajo tortura. Como esos cabrones que dicen que solo fue una vez y llevan tres temporadas repitiendo.',

      'Hostia puta, no eres gay del todo pero tu manera de mirar tíos tiene una intensidad que los heteros normales no alcanzan ni drogados, qué miseria.',

      'El grupo lleva un rato con la teoría de que te molan las pollas pero no tienes cojones de probarlo. Menudo cobarde de mierda, da grima.',

      'Hay algo raro en cómo describes a tus amigos. Los heteros dicen "es majo", tú describes abdominales como un puto catálogo de fitness, qué nivel de pena.',

      'Cabrón, dices que te gustan las tías pero tu historial de Instagram es noventa por ciento tíos sin camiseta. Las pruebas no mienten, basura.',

      'Bisexual en prácticas pero sin contrato fijo. Haces los cursillos los fines de semana cuando nadie del grupo mira, qué cutre.',

      'Mierda, cada vez que alguien pone un tío bueno en el grupo tú eres el primero en comentar. Los heteros pasan, tú analizas como un jodido sommelier, da pena ajena.',

      'No eres gay entero pero tienes una pata dentro del armario y la otra bailando reggaetón con un tío llamado Diego, qué vacío.',

      'Tu heterosexualidad tiene fugas como una tubería vieja. No inunda, pero moja lo suficiente para que la pared huela raro, indignante.',

      'Coño, el porcentaje no miente. No eres marica completo pero tienes más curiosidad que un gato en una sex shop gay, qué vergüenza ajena.',

      'Eres de esos cabrones que dicen "no soy gay pero veinte euros son veinte euros". El problema es que tú lo dirías gratis, da vergüenza.',

      'Joder, cada vez que sale el tema te pones nervioso como un gilipollas en un examen que no estudió. Algo escondes, qué flojo.',

      'No es que seas gay, es que tu versión de hetero tiene tantas excepciones que parece una ley fiscal española. Agujeros por todos lados, menudo desastre.',

      'Tu radar de tíos atractivos funciona mejor que Google Maps. Un hetero normal no detecta un culo bonito a trescientos metros, qué pena.',

      'Mierda, no sales del todo gay pero tu energía tiene un componente arcoíris que no se quita ni con lejía industrial, patético.',

      'Eres como esos cabrones que ven porno gay "por curiosidad" y llevan seis años siendo curiosos. La fase de exploración ya prescribió, miserable.',

      'Puta madre, no confirmo nada pero tu forma de abrazar a tus colegas dura tres segundos más de lo que la heterosexualidad permite, qué cringe.',

      'Tienes vibraciones de "experimenté en la universidad y me gustó más de lo que admito". Eso no es una fase, gilipollas, es un patrón, da asco.',

      'No eres gay pero si lo fueras nadie en este grupo pestañearía. Eso dice más que cualquier porcentaje, cabrón de mierda, qué vergüenza.',

      'Tu heterosexualidad es como una conexión wifi inestable: funciona a ratos, se cae sin aviso y nadie sabe cuándo coño va a volver, ridículo.',

      'Coño, hay señales suficientes para montar un debate pero no para cerrar el caso. Eres el expediente X del grupo, fracasado.',

      'Hostia, te comportas con los tíos como un cabrón que finge que no le gusta el dulce mientras se mete un donut a escondidas, qué miseria.',

      'No eres maricón pero tu brújula sexual gira como una puta veleta en un huracán. Norte, sur, y de vez en cuando apunta a polla, da grima.',

      'Eres de los que dicen "todos somos un poco bi" pero lo dicen con una convicción sospechosa. El que no la debe no la teme, qué nivel de pena.',

      'Mierda, tus defensas cuando alguien te llama gay son tan elaboradas que parecen un puto TFG. Los inocentes no preparan alegatos, basura.',

      'Tienes la misma energía que el cabrón que busca "masajes relajantes entre hombres" y jura que es solo por el estrés laboral, qué cutre.',

      'Joder, no sales gay pero sales lo suficientemente ambiguo como para que tu madre lleve tres años preguntándose si tendrá nietos, da pena ajena.',

      'Tu forma de describir a otros tíos tiene un nivel de detalle que los heteros reservan para describir coches o culos de tías. Sospechoso de cojones, qué vacío.',

      'Puta madre, eres como un semáforo en ámbar permanente. Ni paras ni arrancas, y todos los que vienen detrás se desesperan, indignante.',

      'Coño, no eres gay confirmado pero apuestas fuerte en la subasta cuando sale un moreno de ojos claros. El bolsillo te delata, qué vergüenza ajena.',

      'Hostia, tu playlist tiene más Beyoncé y Lady Gaga que la de un drag queen profesional. No es prueba definitiva pero es un puto indicio, da vergüenza.',

      'Eres como esos cabrones que catan vinos: hueles, pruebas, escupes y dices que no te gusta. Pero repites cada jodido fin de semana, qué flojo.',

      'No eres gay del todo pero tienes un máster en detectar qué colonia lleva cada tío del grupo. Eso no es olfato, es interés carnal, menudo desastre.',

      'Mierda, tu forma de decir "qué guapo está ese cabrón" tiene una carga emocional que los heteros normales no producen ni con ayuda, qué pena.',

      'Cabrón, no sales maricón entero pero tu media naranja estadísticamente tiene un cincuenta por ciento de probabilidades de tener polla, patético.',

      'Tu heterosexualidad funciona como un antivirus pirata: arranca, hace el gesto, pero cuando llega la amenaza real se queda congelada, miserable.',

      'Joder, no confirmo que seas gay pero sí que tu zona de confort incluye cosas que la mayoría de heteros ni contempla. Ahí lo dejo, qué cringe.',

      'Coño, eres el tío que en una despedida de soltero mira al stripper con más atención que a las strippers. Y luego dice que valoraba la coreografía, da asco.',

      'No eres maricón pero tu concepto de "bromance" incluye actividades que la mayoría de parejas hetero no practica. Revisa los límites, qué vergüenza.',

      'Puta madre, tienes la capacidad de detectar si un tío va al gimnasio con solo verle la espalda. Ese superpoder no viene de serie en los heteros, ridículo.',

      'Tu orientación sexual es como la economía española: nadie la entiende del todo, los datos se contradicen y siempre está a punto de cambiar, fracasado.',

      'Hostia, no digo que seas gay pero si te dieran a elegir entre una tía buena y un masaje de un tío con manos grandes, lo piensas demasiado, qué miseria.',

      'Eres de esos cabrones que miran Brokeback Mountain "por el paisaje". Sí, el paisaje de los vaqueros sin camiseta, da grima.',

      'Mierda, tu reacción cuando un tío te dice que tienes buen culo es demasiado positiva para un hetero. Un poco de incomodidad sería lo normal, qué nivel de pena.',

      'Joder, no eres gay pero tu cuerpo produce señales mixtas como una puta antena parabólica mal orientada. Capturas todos los canales, basura.',

      'Tu versión de hetero es como una camiseta de mercadillo: parece original de lejos pero de cerca se ven las costuras falsas por todos lados, qué cutre.',

      'Coño, no eres maricón pero cuando alguien del grupo sale del armario siempre eres el primero en dar apoyo con una emoción sospechosamente personal, da pena ajena.',

      'No sales gay pero sales en esa zona gris donde los cojones no saben si ir a la izquierda o a la derecha. Menudo lío llevas, qué vacío.',

    ],
    low: [
      'Hetero de mierda. Sales más recto que una farola y más aburrido que una misa de ocho. Ni un puto matiz, ni una chispa, nada. Joder, qué desperdicio.',

      'Coño, eres tan jodidamente hetero que resultas sospechoso por lo contrario. Tanta normalidad asusta, cabrón.',

      'Sales limpio como una patena y soso como un arroz sin sal. La heterosexualidad más genérica que ha escupido este bot. Enhoramala.',

      'Puta madre, ni una señal. Eres el equivalente sexual de un pan sin corteza: funcional, triste y olvidado en la encimera del grupo.',

      'Hostia, cero por ciento. Tu orientación sexual tiene la emoción de un documental de contabilidad narrado por un funcionario jubilado.',

      'Joder, eres tan rematadamente hetero que podrían usarte de ejemplo en un libro de texto. El capítulo más corto y más coñazo del libro.',

      'Mierda, ni un gramo de ambigüedad. Tu sexualidad es un pasillo recto sin puertas, sin ventanas y sin una puta gracia. Aburrimiento puro.',

      'Cabrón, sales hetero total y eso significa que tu mayor contribución al grupo es ser el control del experimento. El placebo sexual.',

      'Coño, ni una duda. Tu heterosexualidad es tan plana que podría usarse para nivelar muebles de IKEA. Cero contenido, cero historia.',

      'Sales más hetero que un anuncio de cerveza de los noventa. Previsible, aburrido y con una masculinidad de cartón piedra. Menuda mierda.',

      'Joder, cero. Eres el tío más borrosamente hetero del grupo. Sin relieve, sin textura, sin nada que contar en una cena. Qué pereza.',

      'Hostia puta, no hay nada. Tu resultado es tan vacío que. El bot casi se apaga de aburrimiento procesándote. Dale algo con qué trabajar, gilipollas.',

      'Puta madre, hetero nuclear confirmado. Tan predecible que el grupo podría escribir tu biografía sexual en un post-it y le sobra espacio.',

      'Mierda, eres hetero del montón más gris que existe. Si tu sexualidad fuera un color sería beige. Beige sucio. De pared de hospital.',

      'Cabrón, cero señales. Eres el ruido blanco de la orientación sexual: siempre ahí, nadie lo nota y a nadie le importa una mierda.',

      'Coño, sales hetero confirmado. Y el grupo bosteza colectivamente. Ni un giro, ni un matiz, ni una puta anécdota que salvar. Vacío total.',

      'Joder, tan hetero que tu vida sexual podría resumirse en una hoja de Excel con dos columnas y cero fórmulas interesantes.',

      'Hostia, ni rastro. Eres el equivalente a buscar algo emocionante en un manual de instrucciones de lavadora. Nada, cero, el vacío.',

      'Tu heterosexualidad es tan agresivamente normal que. El bot ha tenido que verificar dos veces que no eras un perfil de prueba. Qué triste, cabrón.',

      'Puta madre, sales limpio y eso solo confirma que eres el miembro más tedioso del grupo. Hasta tu sexualidad es un coñazo.',

      'Mierda, cero de cero. Ni un destello, ni una chispa, ni un momento dudoso en toda tu existencia. Joder, qué vida más gris, gilipollas.',

      'Eres tan hetero que si tu sexualidad fuera una especia sería harina. Sin sabor, sin olor, y solo útil para rellenar. Vaya mierda.',

      'Coño, el resultado más plano que puede dar este comando y te ha tocado a ti. Eres la versión sexual de un parking vacío un martes.',

      'Cabrón, tu porcentaje gay es tan bajo que el gráfico ni se molesta en dibujarte una barra. Eres el cero absoluto del arcoíris.',

      'Joder, hetero blindado. Tu sexualidad tiene la profundidad de un charco de agosto: se ve el fondo a simple vista y no hay nada interesante.',

      'Hostia, nada de nada. Sales tan hetero que podrías ser el logo de una marca de bricolaje. Taladro en mano y personalidad en coma.',

      'Puta madre, cero patatero. Tu orientación sexual es tan obvia y tan aburrida que hasta el grupo preferiría que mintieras para tener algo de qué hablar.',

      'Mierda, ni una décima. Eres sexualmente tan interesante como un semáforo en verde: todo el mundo pasa de largo sin mirarte dos veces.',

      'Sales hetero puro y el mundo sigue girando sin que a nadie le importe un coño. Tu normalidad es tu condena, cabrón.',

      'Joder, cero absoluto. Si la heterosexualidad aburrida cotizase en bolsa, tú serías el puto índice de referencia. Estable, predecible y sin emoción.',

      'Recto como una regla y aburrido de lo claro, [nombre]. El detector ni se enciende, cabrón. Hostia puta, qué nivel.',

      'No hay ni un gesto que active el radar, [nombre]. Hetero de manual sin trama, gilipollas. Hostia puta, qué nivel.',

      '[nombre], tan normativo que hasta el chiste gay se te resbala, mierda El grupo ya lo tiene claro sin forzar el drama, coño.',

      'Cero pluma, cero ruido, cero debate. [nombre] sale limpio del tramo, coño El grupo ya lo tiene claro sin forzar el drama, cabrón.',

      'El low te queda bien: no hay material para el roast de orientación, asco El grupo ya lo tiene claro sin forzar el drama, gilipollas.',

      '[nombre], hetero de los que aburren por lo obvios, patético El grupo ya lo tiene claro sin forzar el drama, patético.',

      'Ni el grupo apuesta en contra. Estás fuera del chiste, [nombre], basura El grupo ya lo tiene claro sin forzar el drama, asco.',

      'Radar en cero. [nombre] no da pie ni a meme, ridículo El grupo ya lo tiene claro sin forzar el drama, basura.',

      'Tan claro el no que el comando casi sobra, [nombre], fracasado El grupo ya lo tiene claro sin forzar el drama, ridículo.',

      '[nombre], heterosexualidad de catálogo sin sorpresa, joder El grupo ya lo tiene claro sin forzar el drama, fracasado.',

      'No hay arco. Solo un no limpio, [nombre], cabrón El grupo ya lo tiene claro sin forzar el drama, joder.',

      'El tramo bajo te absuelve sin poesía, [nombre], gilipollas El grupo ya lo tiene claro sin forzar el drama, mierda.',

      'Cero indicios. El chat ni se molesta en shippear nada, [nombre], mierda El grupo ya lo tiene claro sin forzar el drama, coño.',

      '[nombre], más recto que el margen de un Word, coño El grupo ya lo tiene claro sin forzar el drama, cabrón.',

      'Sin material para el chisme. Low merecido, [nombre], asco El grupo ya lo tiene claro sin forzar el drama, gilipollas.',

      'El detector bosteza. [nombre] no enciende nada, patético El grupo ya lo tiene claro sin forzar el drama, patético.',

      'Hetero de farola: se ve de lejos y no interesa, [nombre], basura El grupo ya lo tiene claro sin forzar el drama, asco.',

      '[nombre], el no más aburrido del ranking, ridículo El grupo ya lo tiene claro sin forzar el drama, basura.',

      'Limpio de sospecha y de gracia, [nombre], fracasado El grupo ya lo tiene claro sin forzar el drama, ridículo.',

      'Tan claro el no que el comando casi sobra, [nombre], fracasado, fracasado El grupo ya lo tiene claro sin forzar el drama, fracasado.',

    ],
  },

  simp: {
    name: 'simp',
    goodIsHigh: false,
    high: [
      '[nombre], te tratan como recurso y respondes como si fuera cariño. Esa confusión te ha costado años, dinero y lo poco que te quedaba de dignidad, puto pringado.',

      '[nombre], eres el mueble emocional de alguien. Estás ahí para lo malo y desapareces del reparto en lo bueno. Y encima lo llamas ser un buen amigo, gilipollas.',

      'Tu forma de acercarte a alguien es anularte entero, [nombre]. Y luego preguntas por qué no te ven. No te ven porque no queda nada tuyo que mirar, gilipollas.',

      'Te tiene guardado por si un día se aburre, y tú esperando esa migaja como un perro debajo de la mesa. Patético, arrastrado y sin una puta gota de dignidad.',

      'Eres el que interpreta silencios como si fueran mensajes cifrados, [nombre]. No hay cifrado, gilipollas. Hay indiferencia y es bastante literal.',

      '[nombre], eres el que interpreta silencios como si fueran mensajes cifrados. No hay cifrado, gilipollas. Hay indiferencia y es bastante literal.',

      'Simp de mierda. Con la costumbre de excusar cada desprecio con explicaciones que te inventas tú. Puta fábrica de coartadas ajenas y sin sueldo.',

      '[nombre], llevas el peso entero de esa relación y encima pides perdón cuando te cansas. Eso no es generosidad, cabrón, es una puta enfermedad.',

      '[nombre], has convertido esperar en una actividad. Esperar no es una actividad, gilipollas. Es lo que se hace entre dos actividades de verdad.',

      'Te has hecho experto en interpretar silencios. Los silencios no se interpretan, gilipollas. Se entienden a la primera y este está muy claro.',

      'Simp de mierda que se conforma con estar en la lista de contactos, [nombre]. Ni en favoritos. Puta posición de suplente en un equipo de uno.',

      'Simp de saldo, [nombre]: interpretas silencios como si fueran mensajes cifrados. No hay cifrado, gilipollas, hay indiferencia bien literal.',

      '[nombre], simp de mierda que confunde ser paciente con ser invisible. Llevas años siendo lo segundo y llamándolo lo primero. Puta miseria.',

      'Lo das todo el primer día y no queda nada por descubrir. Sin deseo no hay nada, pringado. Puta matemática simple y llevas años fallándola.',

      'Tu forma de acercarte es anularte entero. Y luego preguntas por qué no te ven. No te ven porque no queda nada tuyo que mirar, gilipollas.',

      'Te tienen para lo que ellos no quieren hacer y para nada más. Y sigues disponible, cabrón. Puto servicio técnico sin factura ni descanso.',

      '[nombre], eres el que se hace experto en interpretar silencios. Los silencios no se interpretan, gilipollas. Se entienden a la primera.',

      'Eres el que borra y reescribe el mismo mensaje seis veces, [nombre], y al final manda un hola. Toda esa agonía para nada, gilipollas.',

      'Simp con la esperanza intacta y toda la evidencia en contra. Un empate imposible que te mantiene ahí haciendo el ridículo, pringado.',

      'Simp de mierda que se ofende cuando se lo dicen y al minuto siguiente vuelve a escribir, [nombre]. Puto ciclo cerrado y sin puerta.',

      '[nombre], has convertido esperar en una actividad. Y esperar no es una actividad, gilipollas, es lo que se hace entre actividades.',

      'Simp que se conforma con estar en la lista de contactos. Ni en favoritos, cabrón. Puta posición de suplente en un equipo de uno.',

      '[nombre], has convertido esperar en una actividad. Esperar no es una actividad, gilipollas. Es lo que se hace entre actividades.',

      '[nombre], simp de mierda que se ofende si se lo dicen y al minuto vuelve a escribir. Puto ciclo cerrado y sin puerta de salida.',

      '[nombre], das explicaciones larguísimas a gente que no las lee. Cada semana. Puto desperdicio de tiempo, de datos y de la poca vergüenza que te quedaba.',

      'Simp profesional. Te arrastras por cualquier coño. Como si fuera oxígeno y luego lloras cuando te pisan como el felpudo que eres. Cero respeto, máxima vergüenza ajena.',

      'Puto felpudo, [nombre]. Te limpian los pies encima y tú preguntas si ha quedado bien. Cero dignidad, cero límites y una constancia que da vergüenza ajena.',

      'Simp de manual con más regalos dados que conversaciones tenidas, [nombre]. Ese balance es demoledor y todo el grupo lo ha visto. Puta miseria documentada.',

      'Eres el que pide otra oportunidad justo después de gastar la última, [nombre]. Y la pides con esa voz. Puta vergüenza ajena cada vez que abres la boca.',

      '[nombre], eres el cajero automático de alguien que ni te guarda el número. Sacan, se van y tú ahí esperando el próximo movimiento como un puto inútil.',

      'Eres el que celebra un vale como si fuera una declaración, [nombre]. Cuatro letras de mierda. Y tú montando la boda en tu cabeza. Da vergüenza.',

      'Estás disponible las 24 horas para quien te ignora, corriendo a la primera migaja como un perro faldero. Te usan, te vacían y ni las gracias te dan, simp de mierda.',

      'Hasta su novio te tiene cariño, porque le haces el trabajo sucio gratis mientras él se la queda. Eres el pringado que sostiene la relación de otro y encima da las gracias, gilipollas.',

      'Regalas tiempo, dinero y dignidad a quien no te da ni la hora, arrastrándote por alguien que ni te mira. Un pringado que se vacía por nada y encima vuelve a por más, patético.',

      '[nombre], tu autoestima cuelga de una notificación que no llega. Ese es todo tu sistema emocional, pringado.: un móvil en silencio y tú mirándolo cada diez minutos, asco.',

      '[nombre], llevas el peso entero de esa relación y encima pides perdón cuando te cansas. Eso ya no es generosidad, cabrón, es una enfermedad con síntomas visibles.',

      '[nombre], simp de mierda. Con suscripción activa a que te ignoren. Pagas puntual cada mes y encima das las gracias por el privilegio de ser el felpudo oficial.',

      'Eres el perro faldero oficial de este grupo, [nombre]. Corres a la primera migaja, mueves la cola y luego lloras porque nadie te toma en serio. Puto desastre.',

      'Simp de mierda. Con la costumbre de responder a las tres de la mañana, [nombre]. Y encima disculpándote por tardar. Ni un rehén se comporta con tanta sumisión.',

      '[nombre], simp con la disponibilidad de un servicio de urgencias y la valoración de ninguno. Trabajas gratis, veinticuatro horas, y ni las gracias, pringado, mierda.',

      '[nombre], has aceptado condiciones que no aceptarías ni para un desconocido. Y esas condiciones bajan cada mes. Ya estás negociando desde el suelo, pringado, coño.',

      '[nombre], simp de manual: esperas horas por una respuesta y contestas en dos segundos. Esa asimetría es tu biografía entera resumida en un gesto de mierda.',

      'Simp de manual, [nombre]: analizas cada palabra buscando una señal. No hay señal, cabrón. Hay indiferencia y tú llevas años traduciéndola mal a propósito.',

      'Simp profesional sin cobrar, [nombre], que es lo más patético. Del catálogo. Das todo por nada, te vacían y vuelves a la fila con la misma cara de idiota.',

      '[nombre], eres el trabajo emocional gratuito de otra persona. Sin sueldo, sin descanso y sin la más mínima posibilidad de ascenso. Puto becario perpetuo.',

      '[nombre], eres tan accesible que ya no representas ningún esfuerzo. Lo que no cuesta no vale, y tú llevas años saliendo gratis en cada puta interacción.',

      '[nombre], eres el plan de emergencia de alguien que no tiene emergencias. Nunca te llaman y sigues con el teléfono encima. Puta patética disponibilidad.',

      'Simp que celebra un vale como si fuera una declaración, [nombre]. Un vale. Cinco letras de mierda. Y tú organizando la boda en tu cabeza. Da hasta pena.',

      'Eres el que consuela a quien acaba de humillarlo, [nombre]. Ese movimiento resume por qué nadie te va a tomar nunca en serio, puto felpudo con horario.',

      '[nombre], eres el trabajo emocional gratuito de otra persona. Sin sueldo, sin descanso y sin la más mínima posibilidad de ascenso. Puto becario eterno.',

      'Tu manera de querer es rendirte antes de que te lo pidan, [nombre]. Regalas lo que otros al menos negocian y luego te extraña que no valga una mierda.',

      '[nombre], tu dignidad se negocia cada vez que alguien te presta atención. Y siempre pierdes la negociación. Puta subasta a la baja con un solo postor.',

      'Simp de manual, [nombre]: has construido tu identidad entera alrededor de alguien que ni sabe que existe esa construcción. Puto monumento sin visitas.',

      'Tu única estrategia es estar, [nombre]. Estar no es una estrategia, pringado.es un mueble. Y los muebles se cambian sin que nadie los eche de menos, patético.',

      'Simp de mierda que confunde disponibilidad con valor, [nombre]. Lo que siempre está no se echa de menos. Y a ti no te ha echado de menos nadie jamás.',

      'Llevas años financiando caprichos de alguien que ni te saluda, [nombre]. Sin recibo, sin gracias y sin una puta posibilidad de que eso cambie nunca.',

      '[nombre], eres el paño de lágrimas al que le cuentan de quién se han enamorado. Y sigues ahí, asintiendo, como el puto felpudo profesional que eres.',

      'Eres el que se entera de todo por terceros, [nombre], y sigue insistiendo igual. Ni la humillación pública te hace levantar la cabeza, puto felpudo.',

      '[nombre], simp de manual: te han dicho que no de todas las formas posibles y sigues buscando el matiz que te salve. No hay matiz, cabrón. Hay un no.',

      '[nombre], simp de mierda. Con el orgullo empeñado y la deuda creciendo cada mes. Ni el peor prestamista aceptaría un cliente con tan pocas garantías.',

      'Tu manera de querer es entregar todo el primer día, [nombre]. Por eso no queda nada por descubrir y por eso no te dura nada. Puta matemática simple.',

      'Tu manera de cuidar incluye descuidarte a ti entero, [nombre]. Eso no es cuidar, cabrón, es desaparecer despacio para que a otro le resulte cómodo.',

      '[nombre], simp que confunde disponibilidad con valor. Lo que siempre está no se echa de menos, cabrón, y a ti no te ha echado de menos nadie jamás.',

      'Eres la opción cómoda de alguien, [nombre]. Cómoda no es querida, cabrón. Es lo que se coge cuando no hay nada mejor y se suelta en cuanto lo hay.',

      'Simp de mierda, [nombre]: das los buenos días cada mañana y te contestan uno de cada cinco. Y sigues dando los buenos días. Eso ya es una condena.',

      '[nombre], llevas años haciendo el trabajo emocional de dos y recibiendo el de ninguno. Puto becario sin contrato, sin sueldo y sin fecha de fin.',

      '[nombre], has normalizado ser el último en todo y ni se te ocurre reclamar nada. Eso ya no es humildad, cabrón, es no tener amor propio ninguno.',

      'Tu esperanza sigue intacta y la evidencia está entera en contra, [nombre]. Ese empate imposible es lo que te mantiene ahí, haciendo el ridículo.',

      '[nombre], simp con el récord absoluto de mensajes sin respuesta y la costumbre de mandar uno más. Cabrón, el silencio también es una respuesta.',

      'Tu manera de negociar es aceptarlo todo y esperar reciprocidad, [nombre]. Nunca llega y lo sabes. Y aun así vuelves a firmar cada puta semana.',

      '[nombre], simp de manual con el papel de sostén emocional y ninguno de los beneficios. Trabajas de pareja y cobras de desconocido. Puta ruina.',

      'Eres el paño de lágrimas al que le cuentan de quién se han enamorado, [nombre]. Y sigues ahí asintiendo. Puto felpudo con horario de atención.',

      '[nombre], eres el que se ha resignado a un sitio que ni siquiera es un sitio. Es estar cerca, cabrón. Y estar cerca no es nada, es geografía.',

      'Tu manera de querer es rendirte antes de que te lo pidan, [nombre]. Regalas lo que otros negocian y luego te extraña que no valga una mierda.',

      '[nombre], simp que confunde disponibilidad con valor. Lo que siempre está no se echa de menos, cabrón, y a ti no te ha echado de menos nadie.',

      '[nombre], llevas años poniendo tú toda la iniciativa. Si paras, aquello se acaba en una semana. Y lo sabes, por eso no paras nunca. Patético.',

      'Eres el que celebra que le respondan con un emoji, [nombre]. Un emoji. Y lo cuentas como una victoria. Da vergüenza ajena leerte, pringado.ridículo.',

      '[nombre], eres tan predecible que ya ni tienen que pedirte las cosas. Las das antes. Puto reflejo condicionado con nombre y foto de perfil.',

      '[nombre], eres el que borra mensajes para no parecer intenso. Ya lo pareces desde hace años, pringado.y borrar solo confirma que lo sabes, joder.',

      '[nombre], eres el que cambia sus planes por alguien que no cambiaría ni de canal. Ese desequilibrio lo ve todo el grupo menos tú, pringado, mierda.',

      'Simp de los que el pedestal se te queda pequeño y el respeto ajeno te queda grande, [nombre]. Joder.',

      'Tienes más mensajes de validación que dignidad en el puto ranking del grupo, [nombre]. El pedestal te está comiendo, mierda.',

      'Simp de manual: confundes disponibilidad con valor y el high te lo cobra, [nombre]. Cero respeto propio visible, coño.',

      'Se te nota el rastro de simp hasta en los mensajes que pretenden ser neutrales, [nombre] frame, patético.',

      'Simp convertido en wallpaper del fail colectivo, asco. El pedestal te está comiendo, gilipollas, joder.',

      'Has convertido la sumisión en identidad y no hay detergente que la limpie, [nombre]. Cero respeto propio visible, patético.',

      'Simp en modo sin filtro y el filtro pedía clemencia. Se te ve el fail a la primera, ridículo, ridículo.',

      'Has hecho del servilismo tu marca y el grupo te usa de felpudo con wifi, [nombre]. El pedestal te está comiendo, basura.',

      'Simp con el mismo gag de siempre y cero variación. Cero respeto propio visible, ridículo, joder, y el grupo no se traga el cuento, ridículo.',

      'Se te oye el arrastre del pedestal hasta en los neutros del chat, [nombre]. cerrado. Felpudo con opiniones, fracasado.',

      'Simp de historial público: no hace falta escarbar, está en la superficie, [nombre] se te nota a la legua, coño.',

      'Tienes más episodios de simp documentados que intentos de tener criterio, [nombre]. Cero respeto propio visible, mierda.',

      'Simp cutre: ni la entrega tiene gracia ni la falta de dignidad tiene misterio, [nombre], gilipollas.',

      'Has hecho del bajo listón tu residencia. y no hay mudanza a la vista, [nombre]. El pedestal te está comiendo, cabrón.',

      'Simp de las que el mute ajeno lee como misterio y es solo desinterés, [nombre]. Cero respeto propio visible, gilipollas.',

      '[nombre], llevas años siendo decorado de la lista de contactos. Felpudo con opiniones, patético, joder.',

      'Simp constante: la única racha es la de no decir no cuando toca, [nombre]. El pedestal te está comiendo, asco.',

      'Se te nota la prisa por validar y cero plan de validarte a ti, [nombre]. Cero respeto propio visible, basura.',

      'Simp de cartel de pedestal: se ve el anuncio y nadie respeta el producto, [nombre]. Felpudo con opiniones, ridículo.',

      'No hay misterio interesante: hay previsible y simp, el combo del high, [nombre]. El pedestal te está comiendo, fracasado.',

      'Tienes el historial de un local cerrado por exceso de sí y falta de no, [nombre]. Cero respeto propio visible, joder.',

      'Simp de inercia: el grupo te soporta por costumbre, no por respeto, [nombre]. Se te ve el fail a la primera, cabrón.',

      'El recato de dignidad te queda lejos y la distancia es rechazo, no mística, [nombre]. El pedestal te está comiendo, coño.',

      'Simp de ranking: bajas la media del nivel con monólogos de validación ajena, [nombre]. Cero respeto propio visible, cabrón.',

      'Has convertido el simp en carnet. y no hay renovación limpia a la vista, [nombre]. Felpudo con opiniones, gilipollas.',

      'Simp de estribillo que mancha más con cada bis del mismo sí, [nombre]. El pedestal te está comiendo, patético.',

      'Se te nota el hábito de empujar cada tema hacia el pedestal de otro, [nombre]. Cero respeto propio visible, asco.',

      'La compostura no te reconoce y tú no has buscado el espejo en serio, [nombre]. Felpudo con opiniones, basura.',

      'Simp de fondo permanente: el high no es un mal día, es el nivel, [nombre]. El pedestal te está comiendo, ridículo.',

      'No es generosidad: es falta de criterio con pedestal incluido, [nombre]. Cero respeto propio visible, fracasado.',

      'Tienes más grasa de validación ajena que un foro de fans sin moderación, [nombre]. Se te ve el fail a la primera, coño.',

      'Simp de ceja ajena levantada y respeto propio en el sótano, [nombre]. chat ya lo sabía. El pedestal te está comiendo, mierda.',

      '[nombre], interpretas silencios como mensajes cifrados y no hay cifrado, solo indiferencia. Cero respeto propio visible, coño.',

      'Has convertido el simp en identidad y no hay detergente narrativo, [nombre]. filtro ni consuelo, patético.',

      'Simp cutre y sin complejo útil: el complejo pediría espejo y no lo hay, [nombre] cerrado. El pedestal te está comiendo, gilipollas.',

      'Se te oye el masticar del listón bajo hasta en los intentos de normal, [nombre] se te nota a la legua, basura.',

      'La dignidad no te coge el teléfono: el buzón está lleno de síes ajenos, [nombre]. Se te ve el fail a la primera, ridículo.',

      'Simp de letrero de pedestal: se lee de lejos y no invita a respetar, [nombre]. El pedestal te está comiendo, basura.',

      'No hay misterio de entrega con estilo: hay lo previsible y el high lo nombra, [nombre]. Cero respeto propio visible, ridículo.',

      'Tienes el historial de un servidor vacío: roles de sí, cero criterio, [nombre]. el grupo de testigo, mierda.',

      'Simp de malinterpretar el silencio ajeno como invitación a más pedestal, [nombre]. maquillaje posible, coño.',

      'El grupo paga tu monólogo de validación en cuotas diarias de scroll, [nombre]. Cero respeto propio visible, mierda.',

      'Has dejado el chat como foro a medias: hilos de sí con tu firma, [nombre]. Felpudo con opiniones, coño.',

      'Simp de estribillo sin punto final limpio ni redención posible, [nombre]. El pedestal te está comiendo, cabrón.',

      'Se te nota el peso de arrastrar el mismo pedestal por cada conversación, [nombre]. Cero respeto propio visible, gilipollas.',

      'La compostura cruza de acera cuando te ve en el high de simp, [nombre]. Se te ve el fail a la primera, basura.',

      'Simp de feria de validación: ruido interno, cero ganas de volver del resto, [nombre]. El pedestal te está comiendo, asco.',

      'Se te ve venir el sí en la primera palabra del mensaje, [nombre]. Cero respeto propio visible, basura.',

      'La dignidad del nivel no para: tú eres el tráfico del arcén del pedestal, [nombre]. Felpudo con opiniones, ridículo.',

      'Simp de superficie suficiente: no hace falta abrir el wiki, se huele el sí, [nombre]. El pedestal te está comiendo, fracasado.',

      'No hay barniz de lealtad noble: hay simp y el high lo cobra, [nombre]. Cero respeto propio visible, joder.',

      'Tienes el tono de quien acumula fichas de validación y nunca dice no, [nombre]. Felpudo con opiniones, mierda.',

      'Simp de las que alardean del pedestal porque el criterio las deja sin personaje, [nombre]. Ridículo.',

      'Simp de fondo de chat: el mismo estribillo de validación en cada mano, [nombre]. Cero respeto propio visible, cabrón.',

      'Has firmado el simp con polvo en cada mensaje como única firma, [nombre]. Se te ve el fail a la primera, asco.',

      'Simp visible desde lejos: el rastro de sumisión se ve, la parada no compensa, [nombre]. anestesia, basura.',

      'Se te nota que te arrodillaste en el hilo hace tiempo y perdiste la llave, [nombre]. chat ya lo sabía, ridículo.',

      'Has hecho del servilismo tu marca y el grupo te usa de felpudo con wifi, [nombre]. Felpudo con opiniones, basura.',

      'Simp de racha perfecta: lo único que no fallas es no tener criterio, [nombre] filtro ni consuelo, joder.',

      'No hay eco de dignidad: hay eco de pedestal. Y el chat lo amplifica, [nombre] cerrado. Cero respeto propio visible, fracasado.',

      'Tienes el aura del post olvidado: presente en el archivo, frío en el ranking, [nombre]. Se te ve el fail a la primera, coño.',

      'Simp de error de lectura: confundes límites con permiso para seguir de rodillas, [nombre]. El pedestal te está comiendo, mierda.',

      'El listón de dignidad lo usas de felpudo y el suelo es tu zona de confort, [nombre]. Cero respeto propio visible, coño.',

      'Has hecho ranking de simp y el oro es tuyo sin rival serio, [nombre]. Felpudo con opiniones, cabrón, joder.',

      'Simp de feria ambulante de un solo puesto: el mismo show de sí, cero nostalgia, [nombre]. Fracasado.',

      'Se te ve venir el pedestal en el primer punto del mensaje, [nombre]. maquillaje posible. Cero respeto propio visible, patético.',

      'La dignidad hace autostop y el tráfico del arcén eres tú, [nombre]. Felpudo con opiniones, asco, joder.',

      'Simp de superficie: basta la vista, no hace falta el sótano del historial, [nombre]. El pedestal te está comiendo, basura.',

      'No hay barniz de antihéroe leal: hay simp y el high lo nombra, [nombre]. Cero respeto propio visible, ridículo.',

      'Tienes el tono de noches de chat sin una frase que diga no de verdad, [nombre]. Se te ve el fail a la primera, da vergüenza.',

      'Simp de malinterpretar el mute como respeto al pedestal, [nombre]. El pedestal te está comiendo, qué flojo.',

      'El precio de tu repertorio de sí lo paga el hilo en scroll y silencio, [nombre]. Cero respeto propio visible, menudo desastre.',

      'Has dejado el hilo como wiki sin editores: páginas de validación, cero vida, [nombre]. Felpudo con opiniones, qué pena.',

      'Simp de estribillo que empeora con cada bis del mismo sí, cutre.[nombre]. El pedestal te está comiendo, patético.',

      'Se te nota el hábito de empujar cada hilo hacia el pedestal de otro, [nombre]. Cero respeto propio visible, miserable.',

      'La compostura del nivel no te reconoce en el elenco del ranking, [nombre]. Felpudo con opiniones, patético.',

      'Simp de fondo: bajas la media del high con la constancia de quien no se levanta, [nombre]. Pringado, ridículo.',

      'No es estilo: es simp previsible y el high te lo nombra entero, [nombre]. Cero respeto propio visible, basura.',

      'Tienes más episodios de pedestal que intentos de subir el listón propio, [nombre]. Se te ve el fail a la primera, ridículo.',

      'Simp de respeto ajeno en números rojos del ranking de dignidad, [nombre]. El pedestal te está comiendo, fracasado.',

      '[nombre], simp de mierda que confunde paciencia con ser invisible. Cero respeto propio visible, qué miseria.',

      'Simp de pedestal eterno: siempre el sí y nunca el respeto propio, [nombre]. Felpudo con opiniones, da grima.',

      '[nombre], interpretas silencios como mensajes cifrados y no hay cifrado, solo indiferencia. El pedestal te está comiendo, qué nivel de pena.',

      'Simp hasta para el modo oscuro: ni la sombra tapa el sí eterno, [nombre] filtro ni consuelo, patético.',

      'Se te cae el disimulo solo con abrir el hilo y el high lo documenta, [nombre]. Se te ve el fail a la primera, asco, qué cutre.',

      'Simp de las que el filtro de dignidad se rinde y pide la baja, [nombre]. El pedestal te está comiendo, patético.',

      'No hay barniz que te salve: hay simp de base y el comando lo cobra, [nombre]. Cero respeto propio visible, asco, qué vacío.',

      'Tu mensaje es un aviso de lo que no hay que imitar en el grupo, [nombre]. Felpudo con opiniones, basura.',

      'Simp con la disciplina de quien nunca ha dicho no cuando tocaba, [nombre]. El pedestal te está comiendo, ridículo.',

      'Simp de los que pagan el precio entero por migajas de respuesta, [nombre]. Cero respeto propio visible, fracasado.',

      'Tienes una presencia que ensucia el hilo en un solo sí de más, [nombre]. maquillaje posible. Felpudo con opiniones, qué flojo.',

      'Simp de repertorio: siempre la misma validación y cero plan B de dignidad, [nombre]. El pedestal te está comiendo, menudo desastre.',

      'Se te nota el desastre hasta en la miniatura del estado, [nombre]. Cero respeto propio visible, qué pena.',

      'Simp sin complejo útil: el complejo al menos indicaría que viste el pedestal, [nombre]. Se te ve el fail a la primera, patético.',

      'El ranking de dignidad te deja donde mereces: en el sótano del high, [nombre]. El pedestal te está comiendo, miserable.',

      'Has hecho del simp tu marca y la marca se pega en los dedos ajenos, [nombre]. Cero respeto propio visible, patético.',

      'Simp de las que confunden lealtad con abandono total del criterio propio, [nombre]. Felpudo con opiniones, asco, da asco.',

      'No es entrega con gracia: eres simp y el high no discute la evidencia, [nombre]. El pedestal te está comiendo, basura.',

      'Tu forma de acercarte espanta, [nombre], y llevas años sin cambiar ni una coma. Mismo método, mismo resultado, misma cara de puta sorpresa, ridículo.',

      '[nombre], te has puesto el último en tu propia lista y luego te quejas de no ser prioridad de nadie. Ahí está el chiste completo, pringado, fracasado.',

      'Tu forma de existir en ese vínculo es la de un accesorio útil. Un puto enchufe: se usa cuando hace falta y no se mira el resto del tiempo, qué miseria.',

      'Te has convertido en el sitio cómodo al que se vuelve cuando lo demás falla. Y aceptas. Puto refugio de emergencia con las llaves puestas, da grima.',

      'Simp con la costumbre de escribir párrafos y recibir monosílabos. Y sigues escribiendo. Puta correspondencia de un solo lado y sin sellos, qué nivel de pena.',

      'Simp de saldo, [nombre]: borras y reescribes el mismo mensaje seis veces para acabar mandando un hola. Toda esa agonía para una puta nada, basura.',

      'Simp de manual con el agravante de creer que la constancia acaba pagando. No paga, cabrón. Insistir donde no te quieren no es constancia, qué cutre.',

      '[nombre], eres el que se sabe sus horarios mejor que los suyos. Puta vigilancia disfrazada de casualidad y todo el grupo lo ha notado ya, da pena ajena.',

      'Estar disponible veinticuatro horas te ha convertido en algo gratuito, [nombre]. Y lo gratuito no se valora nunca. Puta ley del mercado, qué vacío.',

      'Te han dicho que no de todas las formas posibles y sigues buscando el matiz que te salve. No hay matiz, pringado. Hay un no bien grande, fracasado.',

      'Sostienes la ilusión a base de no preguntar nunca directamente. Porque sabes la respuesta, pringado.y no aguantarías oírla en voz alta, qué vergüenza ajena.',

      '[nombre], eres el que cambia de ciudad, de plan y de vida por alguien que no cambiaría ni de canal por ti. Puto desequilibrio de manual, da vergüenza.',

      '[nombre], eres el fondo de pantalla de su vida: siempre ahí, nunca mirado y sustituible en dos toques. Puta decoración con sentimientos, qué flojo.',

      '[nombre], eres el que se ofende si le llaman simp y sigue haciendo exactamente lo mismo al día siguiente. Puto ciclo cerrado sin salida, menudo desastre.',

      '[nombre], simp con el récord de mensajes sin respuesta y la costumbre de mandar uno más. El silencio también es una respuesta, pringado.gilipollas, qué pena.',

      '[nombre], eres el que guarda las conversaciones para releerlas. Ellos ni recuerdan haberlas tenido. Puta miseria en formato de captura, patético.',

      'Mantienes la relación a base de no molestar nunca. Por eso tampoco existes nunca, pringado. El que no molesta tampoco se echa de menos, asco, miserable.',

      'Simp de mierda, [nombre]: te tratan mal y buscas el motivo en ti. Siempre en ti. Nunca donde está, que es enfrente y bastante evidente, qué cringe.',

      '[nombre], eres el que dice que solo quiere que sea feliz. Traducción: te han descartado y estás haciendo el duelo en público, pringado.ridículo, da asco.',

      '[nombre], le has aguantado cosas que no le aguantarías ni a un desconocido en la calle. Eso no es paciencia, cabrón, es no tener suelo, qué vergüenza.',

      'Sostienes eso renunciando a lo tuyo, [nombre]. Y ya no queda casi nada. Te has vaciado entero para que otro esté cómodo, puto felpudo, ridículo.',

      'Llevas años haciendo el trabajo emocional de dos y recibiendo el de ninguna. Puto becario sin contrato, sin sueldo y sin fecha de fin, fracasado.',

    ],
    mid: [
      'Ni caso perdido ni referencia. Justo en la mitad, que aquí no es un mal sitio pero tampoco bueno con el eco todavía en el grupo.',

      'Cuando te lo propones te haces respetar. El problema es la frecuencia con la que te lo propones. Delante del hueco que quedó.',

      'Ni una cosa ni la otra. Suficiente entrega para que se note, suficiente freno para que no cuaje sin segunda lectura que lo arregle.',

      'Tu generosidad es buena hasta que se convierte en costumbre ajena. Y ahí ya no sabes frenar. Delante del público que no pidió entrada.',

      'Ni ejemplo ni advertencia. En la mitad exacta y sin señales de moverte en ninguna dirección en alta resolución de group chat.',

      'Tu porcentaje es medio porque tú eres medio en esto: mitad criterio, mitad ganas de agradar con el dígito firmando solo.',

      'Tienes límites, pero se te olvidan cuando alguien te presta atención. Ahí está el problema sin consuelo de manual barato.',

      'A veces te pones firme y a veces cedes por todo. Nadie sabe con cuál de los dos va a topar y el hilo no pide amplificación.',

      'Ni felpudo ni exigente. Estás justo en la franja donde se puede abusar un poco sin pasarse y el historial no olvida.',

      'Tu manera de dar depende de quién esté delante. Eso la hace poco fiable y muy aprovechable delante de todo el que miraba.',

      'Ni ejemplo ni caso perdido. Un intermedio que se sostiene por inercia más que por criterio y el archivo queda cerrado.',

      'Ni simp ni distante. Estás en la franja donde nadie abusa pero tampoco nadie se esfuerza sin prosa que lo maquille.',

      'A ratos te respetas mucho y a ratos nada. La falta de patrón es lo más llamativo de todo con el resultado ya consumado.',

      'A veces pones condiciones y a veces las retiras solo. Retirarlas solo es lo que te frena en la foto fija del ranking.',

      'A ratos das todo y a ratos te reservas. Esa inconsistencia es exactamente tu porcentaje con el grupo de testigo silencioso.',

      'Tu respeto por ti mismo aparece a ratos, y los ratos en que no aparece crecen cada mes y el sistema cierra sin discusión.',

      'Ni simp ni de piedra. A veces das más de lo que recibes y a veces sabes parar a tiempo sin barniz de relato heroico.',

      'Tienes momentos de dignidad rodeados de concesiones que los borran. Balance neto: cero. Y el chat archiva sin debate.',

      'Tienes freno pero lo usas tarde. Frenar tarde y no frenar acaban pareciéndose bastante sin barniz de relato heroico.',

      'Ni te anulas ni te impones. Un punto medio que nadie recuerda ni para bien ni para mal y el sistema marca el punto final.',

      'No eres el peor caso del grupo, pero el camino desde donde estás se reconoce de lejos y no hace falta ampliar el parte.',

      'Negocias contigo mismo a la baja cada vez que alguien te trata por debajo de lo justo en alta resolución de group chat.',

      'Tienes lo justo para no quedar mal y nunca lo suficiente para que te tengan en cuenta y no hace falta ampliar el parte.',

      'Tu disponibilidad es razonable hasta que alguien la fuerza un poco. Ahí cedes siempre con testigos obligados en el hilo.',

      'Pones límites y los aguantas un día. Al segundo ya estás negociándolos contigo mismo con el número hablando solo.',

      'Ni te arrastras ni te haces valer del todo. Un punto medio que no acaba de definirse con el eco todavía en el grupo.',

      'Sabes lo que haces y lo haces igual, y eso ya hace tiempo que dejó de ser inocencia. Sin derecho a matiz útil.',

      'Tienes criterio para elegir y una tendencia clara a desactivarlo en el peor momento y el contador insiste.',

      'Tu manera de querer es sana a ratos. Los otros ratos es donde se te va de las manos y el hilo no pide amplificación.',

      'Tienes momentos de firmeza que no sostienes. Y sin sostenerlos no cuentan para nada sin apelación posible hoy.',

      'Conoces el patrón, lo ves repetirse, y cada vez decides mirar para otro lado igual y el archivo no admite recurso.',

      'Ni simp ni frío. Un intermedio que la gente lee como que se puede negociar contigo sin segunda lectura que lo arregle.',

      'Ni te desvives ni te desentiendes. Una zona neutra que funciona pero no impresiona. Delante del marcador en vivo.',

      'A ratos das el nivel y a ratos das pena. La proporción decide y la tuya está justa sin suavizar el golpe del número.',

      'El patrón lleva suficiente tiempo repitiéndose como para que ya no sea casualidad delante de quien no quería verlo.',

      'Lo que llamas paciencia tiene todos los síntomas de algo que prefieres no nombrar. Y el chat archiva sin debate.',

      'Ni de los que se anulan ni de los que se imponen. Justo en el medio, sin destacar. Delante del hueco que quedó.',

      'Tu problema no es dar, es no llevar la cuenta. Y alguien sí la lleva, en su favor sin recurso ni nota al pie.',

      'A veces te priorizas y a veces desapareces del todo. La media es exactamente esto con el saldo a la intemperie.',

      'Sabes exactamente lo que estás haciendo y lo haces igual. Eso ya no es inocencia en el segundo más incómodo del chat.',

      'A ratos te respetas y a ratos no, y los ratos que no cada vez ocupan más espacio con. El veredicto seco del bot.',

      'A veces te plantas y a veces te arrastras, y la tendencia no apunta a buen sitio sin prosa que lo maquille, indignante.',

      'Tu dignidad tiene precio, y ese precio lleva un tiempo bajando sin que lo frenes. Delante del marcador en vivo, qué vergüenza ajena.',

      'Ni arriba ni abajo. En el punto donde te aprecian sin llegar a priorizarte nunca con el resultado ya consumado, da vergüenza.',

      'Lo que llamas amor tiene todos los síntomas de otra cosa que no quieres nombrar sin que nadie pida replay, qué flojo.',

      'Lo que estás permitiendo ya dura demasiado como para que sea un momento puntual y el sistema marca el punto final, menudo desastre.',

      'Hay semanas en que te respetas y semanas en que no. El problema es la dirección con el grupo de testigo silencioso, qué pena.',

      'Tienes buena disposición y mal reparto. Das a quien no toca y a quien toca poco sin segunda lectura que lo arregle, patético.',

      'Ni simp ni seguro de ti. Un intermedio que depende demasiado de con quién estés. Y el grupo ya pasó de página, miserable.',

      'Tu equilibrio es frágil: un poco de atención y se te desmonta todo el criterio y. El ranking no pide permiso, qué cringe.',

    ],
    low: [
      'Cero. Tu manera de estar deja espacio, y ese espacio es exactamente lo que hace que te echen de menos.',

      'Sin material. En esto sales impecable, así que vamos a mirar en otro sitio a ver qué encontramos con el grupo de testigo silencioso.',

      'Cero por ciento. No confundes cariño con disponibilidad total, y esa distinción lo cambia todo con el parte firmado debajo.',

      'Cero por ciento. Ni un solo mensaje suplicando. Tu historial está limpio y eso hoy es raro sin cuento que lo tape.',

      'Cero. Tienes límites y los defiendes. Eso no se aprende, o se tiene o se acaba de rodillas y el historial no olvida.',

      'Limpio. No confundes el cariño con la sumisión. Media humanidad todavía no ha llegado ahí y no hay modo de suavizarlo.',

      'Cero. La gente te busca porque quiere, no porque siempre estés. Hay una diferencia enorme. Delante del público que no pidió entrada.',

      'Nada por aquí. Tu autoestima no depende de que nadie te conteste. Ese es todo el secreto sin recurso ni nota al pie.',

      'Sin rastro. Nadie te ha usado nunca porque nunca has dejado que la cosa llegue tan lejos con el dígito como única defensa.',

      'Cero por ciento. Cuando algo no funciona, te retiras. Y retirarse a tiempo es lo difícil. Delante del listón que no saltaste.',

      'Limpio. Das sin llevar la cuenta y sin quedarte vacío. Ese punto es difícil de encontrar. Sin derecho a matiz útil.',

      'Sin rastro. No te has anulado por nadie ni una sola vez, y eso se nota en cómo te tratan y el archivo queda cerrado.',

      'Cero por ciento. Tu autoestima no está subcontratada a nadie. Eso es lo más raro que hay con el eco del almost todavía sonando.',

      'Cero por ciento. Das lo que recibes y ni un gramo más. Contabilidad emocional impecable sin modo avión ni silencio cómplice.',

      'Cero. Das cuando quieres y paras cuando toca. Ese equilibrio es lo que casi nadie tiene con testigos obligados en el hilo.',

      'Limpio. Tu generosidad tiene dirección: va a quien la devuelve, no a quien la aprovecha y el hilo no pide amplificación.',

      'Cero. Sabes estar solo sin que eso te empuje a aceptar cualquier cosa. Ahí está la base en el segundo más incómodo del chat.',

      'Nada de simp. Sabes lo que vales y no lo regalas al primero que te contesta un mensaje sin bis ni matiz de consuelo.',

      'Cero. Sabes distinguir entre quien te busca y quien te usa. Y actúas según sea el caso. Y el chat archiva sin debate.',

      'Limpio. Sabes decir que no sin sentirte culpable después. Nivel alto y muy poco común sin maquillaje ni segunda toma.',

      'Cero por ciento. No cambias tus planes por quien no cambiaría los suyos. Regla básica y basta el dato del ranking.',

      'Cero por ciento. No confundes ser bueno con no tener límites. Los tienes y son claros. Delante del hueco que quedó.',

      'Nada de nada. Cuando algo no te conviene, lo dices. Sin drama y sin dar explicaciones delante de quien no quería verlo.',

      'Limpio del todo. No hace falta que nadie te recuerde tu valor porque lo tienes claro. Sin derecho a matiz útil.',

      'Sin material. Nunca has escrito dos veces seguidas sin respuesta. Ni se te ocurriría sin suavizar el golpe del número.',

      'Sin material. Ni una sola vez has aceptado un trato que no aceptarías para un amigo sin bis ni matiz de consuelo.',

      'Nada. La gente sabe exactamente hasta dónde puede pedirte, y eso es sano para todos y el resto es ruido de fondo.',

      'Nada. Das, recibes y te vas si el reparto no cuadra. Así de simple y así de difícil con. El veredicto seco del bot.',

      'Sin rastro. Te tratan bien o te vas. Esa regla tan simple la cumple muy poca gente sin maquillaje ni segunda toma.',

      'Nada. Te vas cuando toca irse, y esa es la prueba más clara de amor propio que hay y no hay modo de suavizarlo.',

      'Nada. Te haces respetar sin necesidad de imponerte. Es la forma más eficaz que hay con. El botín o el fail a la vista.',

      'Limpio del todo. Ni un mensaje sin responder que te haya quitado el sueño. Ni uno. Sin derecho a matiz útil.',

      'Cero. Das mucho a quien lo merece y nada a quien no. Eso se llama tener criterio en el momento que más dolía soltarlo.',

      'Nada. Te tratas bien y por eso los demás también lo hacen. Funciona en ese orden y el archivo queda cerrado.',

      'Nada de nada. Tu tiempo vale y actúas en consecuencia. Eso lo nota todo el mundo con la firma legible del comando.',

      'Limpio. No interpretas silencios porque entiendes lo que significan a la primera. Sin filtro de autoayuda.',

      'Cero. No dependes emocionalmente de nadie y por eso puedes querer bien de verdad con la cara del resultado a la vista.',

      'Sin rastro. Ni una relación en la que hayas cargado tú con todo el peso. Ninguna y. El veredicto no se negocia.',

      'Nada. No persigues a nadie. Que te persigan a ti ya es otro tema y otro comando delante de quien aún leía el hilo.',

      'Cero por ciento. No hay una sola persona que te tenga por seguro. Y eso es sano en el parte que nadie borra.',

      'Nada. Te haces valer sin necesidad de ponerte duro, y eso funciona mucho mejor y. El ranking no pide permiso.',

      'Cero. Pones límites sin necesidad de anunciarlos. Se notan y se respetan solos sin modo avión ni silencio cómplice.',

      'Limpio. Tienes claro que dar todo de golpe no funciona, y por eso lo tuyo dura. Y el chat archiva sin debate.',

      'Cero. No te arrastras por nadie y no lo vas anunciando. Las dos cosas cuestan con la firma legible del comando.',

      'Cero por ciento. Ni un detalle desesperado en todo tu expediente. Enhorabuena sin segunda lectura que lo arregle.',

      'Limpio del todo. Aquí no hay nada que rascar y no será porque no hayan mirado sin que nadie pida replay.',

      'Limpio. Nunca te has humillado por nadie, y las ocasiones no te han faltado con el dígito como única defensa.',

      'Cero. No pagas por atención de ningún tipo. Ni con dinero, ni con dignidad sin modo avión ni silencio cómplice.',

      'Cero por ciento. Tu disponibilidad tiene horario y eso hace que se valore con el número en la frente del mensaje.',

      'Cero por ciento. Ni una concesión de las que se lamentan al día siguiente y no hace falta ampliar el parte.',

    ],
  },

  rata: {
    name: 'rata',
    goodIsHigh: false,
    high: [
      'Tu palabra no vale una mierda. En este grupo, [nombre], y llevas años sin darte cuenta de que todos lo saben menos tú. Puto patético.',

      '[nombre], vendiste a alguien por algo que ni siquiera te salió bien. Eso es lo más patético. Del asunto: traicionar y encima perder, puto inútil.',

      '[nombre], rata que se justifica con que aquí todos hacemos lo mismo. No, gilipollas. Aquí lo haces tú, y por eso ya nadie te deja cerca de nada.',

      'Eres el que tira la piedra y luego pregunta quién habrá sido, [nombre]. Con esa cara de gilipollas que ya no engaña absolutamente a nadie aquí.',

      'El listón de la dignidad lo usas de rampa para trepar sobre otros en el chat, [nombre]. Tu palabra no vale una mierda aquí, asco.',

      '[nombre], eres el que dice después yo ya lo sabía. Lo sabías y no dijiste nada, cabrón, que es exactamente lo que te convierte en basura.',

      'El recato te queda a años luz y la distancia es rechazo, no mística de rata, [nombre]. Trepar sobre otros te queda de oficio, ridículo.',

      'Se te nota que ensuciaste el hilo hace tiempo y perdiste el mapa del bayeta, [nombre]. Sin anestesia, fracasado.',

      'El grupo paga tu rastro en cuotas diarias de asco. Documentado en el ranking, [nombre]. Resuelves conflictos alimentándolos, joder.',

      'Rata de inercia: el grupo te soporta por costumbre, no por interés real, [nombre]. Trepar sobre otros te queda de oficio, mierda.',

      'Tienes el tono de quien acumula restos ajenos y nunca pasa el estropajo, [nombre]. Tu palabra no vale una mierda aquí, coño.',

      'Tu manera de conseguir posición es que otro la pierda. Nunca por mérito, cabrón. Puta escoria que solo sube pisando cuellos ajenos.',

      'La compostura no te reconoce y tú no has buscado el espejo en serio, [nombre]. Trepar sobre otros te queda de oficio, gilipollas.',

      '[nombre], eres el que dice que solo estaba comentando. Comentar no es eso, gilipollas, y lo sabes perfectamente cuando lo haces.',

      'Tu manera de generar confianza es fingir vulnerabilidad. Ni eso te sale ya, cabrón. Puta actuación gastada de tanto repetirla.',

      '[nombre], vendiste a quien te sacó de un lío y ni te costó pensarlo. Ahí está la medida exacta de la basura que eres, cabrón.',

      'Eres el que consuela y al rato lo cuenta, [nombre]. Ese doble movimiento es exactamente lo que te define como puta basura.',

      'Eres el que consuela y el mismo día lo cuenta. Ese doble movimiento es lo que te define como puta basura, y no hay más.',

      'Eres cálido con quien te conviene y frío con quien no. Se nota siempre, cabrón. Puta calculadora con forma de amigo.',

      'Rata de las que desaparecen cuando toca aportar y vuelven cuando hay drama gratis, [nombre]. Gilipollas.',

      'Eres tan rata y tan falso que hasta el que te llama amigo duerme con un ojo abierto. Le sonríes de frente y le clavas el cuchillo por la espalda en cuanto se gira, basura. Traicionera.',

      'Para ti la gente no son amigos, son mercancía: guardas cada secreto para venderlo al mejor postor en cuanto te convenga. Una rata sin lealtad ni palabra, pura basura.',

      '[nombre], rata de mierda: tu palabra dura exactamente hasta que aparece alguien que ofrece un poco más. Un contrato con cláusula de salida en cada línea.',

      'Rata que cambia de bando en cuanto la cosa se pone fea, [nombre]. Sin avisar y sin mirar atrás. Ni la basura. Se mueve tan rápido cuando sopla el viento.',

      '[nombre], rata de las que se hacen imprescindibles teniendo algo sobre cada persona. Eso no es tener poder, cabrón. Es que nadie pueda librarse de ti.',

      'Rata con la habilidad de decir la verdad de la manera que más daño hace, [nombre]. Ese talento es lo único tuyo que funciona, y es una puta desgracia.',

      '[nombre], eres el que promete discreción y lo cuenta el mismo día. Cada vez. Ya nadie te cuenta nada y aun así te enteras, porque eres una puta rata.',

      '[nombre], tu forma de acercarte a alguien nuevo es advertirle sobre los demás. Siempre igual. Sembrar mierda. Antes de que nadie pueda contar la tuya.',

      'Tu lealtad se mide en beneficios, [nombre]. Cuando dejan de llegar, se acaba en el acto y sin previo aviso. Un contrato de mierda que nadie firmaría.',

      '[nombre], rata de cloaca con doctorado. Escuchas todo, guardas todo y lo sueltas cuando más daño hace. Basura. Con timing impecable y cero vergüenza.',

      '[nombre], guardas favores como quien guarda armas y los usas exactamente igual. Eso no es generosidad, cabrón, es tenerle a alguien la deuda encima.',

      'Rata de manual, [nombre]: te acercas a los nuevos antes de que se enteren de tu historial. Sembrar mierda. Antes de que alguien pueda contar la tuya.',

      'Eres el que aparece cuando hay reparto y desaparece cuando hay trabajo, [nombre]. Cada vez. Puto parásito con instinto y sin una gota de vergüenza.',

      '[nombre], guardas capturas de conversaciones de hace años por si algún día sirven. Eso no es memoria, pringado. Eso es munición y todos lo sabemos, patético.',

      'Eres el buitre de este grupo, [nombre]. Apareces cuando alguien está débil, sacas lo tuyo y te vas antes de que la cosa se ponga fea. Puta carroña.',

      'Eres el screenshot andante, [nombre]. Todo lo que se te cuenta en confianza acaba en otro chat con tu comentario venenoso de regalo. Puta escoria.',

      '[nombre], eres el que consuela a quien acaba de joder. Y encima lo haces convincente. Esa doble jugada es lo que te define como escoria de manual.',

      'Tu manera de mantenerte bien con todos es no estar bien con nadie de verdad, [nombre]. Cero amistades reales y muchísimos contactos. Puta miseria.',

      '[nombre], tu lealtad dura exactamente lo que dura tu conveniencia. En cuanto huele a beneficio ya estás vendiendo a quien te dio la mano, cabrón.',

      '[nombre], eres el que se acerca a quien sube y desaparece de quien cae. Sin un segundo de duda, sin una puta excusa. Rata de manual, sin matices.',

      '[nombre], eres el que se pone del lado del que gana justo después de que gane. Nunca antes, cabrón, porque antes hay riesgo y tú de eso no sabes.',

      'Tu manera de existir en este grupo depende de que nadie junte las piezas, [nombre]. Ya las están juntando. Y el cuadro que sale es una puta rata.',

      'Eres el que se pega al que manda y suelta al que cae, [nombre]. Sin una sola excepción documentada en todos estos años. Puta veleta con instinto.',

      '[nombre], rata con la habilidad de salir limpia de todos los desastres que ha provocado. Pero todos lo saben igual, cabrón. No hace falta prueba.',

      'Tu manera de resolver un conflicto es contarle a cada uno lo que quiere oír, [nombre]. Y así se pudre todo. Puta gangrena con nombre de usuario.',

      'Rata de saldo, [nombre]: preguntas cómo estás con intención de averiguar, no de saber. Puta encuesta disfrazada de amistad y sin consentimiento.',

      'Eres el que aparece cuando huele a reparto y desaparece cuando huele a factura, [nombre]. Puto parásito con olfato y sin una gota de vergüenza.',

      'Tu amistad tiene precio, [nombre], y encima es barato. Eso es lo más humillante de todo: vendiste a gente por una mierda que ni te salió bien.',

      'Eres el que se ofrece a mediar para enterarse de las dos versiones, [nombre]. Nunca para arreglar nada. Puta escoria con vocación de archivo.',

      'Rata de mierda, [nombre]: sonríes en el grupo y apuñalas en el privado. Dos caras, dos chats y ni una gota de dignidad en ninguno de los dos.',

      '[nombre], eres el que suelta la información justo cuando causa el máximo destrozo. No es torpeza, cabrón, es cálculo. Y eso es bastante peor.',

      'Eres basura. Con timing impecable, [nombre]. Guardas el dato, esperas el momento y lo clavas cuando más duele. Y luego pones cara de sorpresa.',

      'Eres el que se ofrece a mediar para enterarse de las dos versiones, [nombre]. Nunca para arreglar nada. Puta carroña con vocación de archivo.',

      'Eres el que se entera de todo y del que nadie sabe nada, [nombre]. Eso no es discreción, basura, es método. Y ya lo ha pillado todo el grupo.',

      'Tu lealtad cambia de sitio con la facilidad con la que otros cambian de camiseta, [nombre]. Y encima te ofende que se te note. Puta escoria.',

      '[nombre], guardas rencores viejos y los sacas cuando conviene. Eso no es memoria, cabrón, es un almacén de armas con inventario actualizado.',

      'Tu manera de tener amigos es tenerlos catalogados por utilidad, [nombre]. Y ellos ya lo han notado. Por eso ya no te cuentan una puta cosa.',

      'Rata falsa de cloaca. Fingir lealtad es tu superpoder, pero al final siempre vendes a quien te dio confianza. Basura. Con timing impecable.',

      '[nombre], rata que confunde ser listo con ser desleal. Los listos no necesitan traicionar, cabrón. Solo los inútiles como tú lo necesitan.',

      '[nombre], rata que se hace la ofendida cuando la dejan fuera de un plan. Te dejan fuera por historial, cabrón. No es personal, es archivo.',

      'Eres el que se lleva el mérito y reparte la culpa, [nombre]. Siempre en esa dirección y nunca en la contraria. Puta contabilidad falseada.',

      'Rata de feria: grasa, ruido, suelo peor y cero ganas de volver a la atracción, [nombre]. Tu palabra no vale una mierda aquí, cabrón.',

      'Tienes más caras que un dado y menos dignidad que un cenicero de bar a las seis, [nombre], gilipollas.',

      'Rata sin estilo: ni el vicio tiene gracia ni el robo de atención tiene mérito, [nombre]. Sin anestesia, patético.',

      'Rata de las que. El ranking de aporte deja en el sótano con razón documentada, [nombre]. Tu palabra no vale una mierda aquí, asco.',

      'No es gracia sucia: es ratez sin gracia, la versión que no entretiene a nadie, [nombre]. Resuelves conflictos alimentándolos, basura.',

      'Rata de fondo: bajas la media con la constancia de quien no se cansa de sacar, [nombre]. Trepar sobre otros te queda de oficio, ridículo.',

      '[nombre], eres el que reparte información como quien reparte cartas: siempre quedándote la buena. Puta trampa con forma de conversación.',

      '[nombre], rata de mierda: tu manera de generar confianza es fingir vulnerabilidad. Ni eso te sale creíble ya, y llevas años ensayándolo.',

      'Se te oye el masticar del bajo listón hasta en los mensajes serios del chat, [nombre]. Trepar sobre otros te queda de oficio, mierda.',

      'Rata con más pactos rotos que cumplidos, [nombre], y una memoria muy corta para los primeros. Muy conveniente esa memoria tuya, cabrón.',

      'Rata de mierda, [nombre]: has traicionado por cosas pequeñas. Y eso es lo peor de todo. Ni siquiera te vendes caro. Te vendes por nada.',

      'Rata de cartel grasiento: se ve el anuncio y nadie quiere el producto del chat, [nombre], gilipollas.',

      'El recato te saluda desde la orilla limpia y tú no sales del barro del chat, [nombre]. Tu palabra no vale una mierda aquí, patético.',

      'No es estilo: es ratez previsible y el high te la cobra entera en el nivel, [nombre]. Resuelves conflictos alimentándolos, asco.',

      'Tu amistad es un préstamo con intereses altos, [nombre], y vencimiento cuando a ti te convenga. Nadie firmaría eso dos veces, cabrón.',

      'Rata sin redención estética: solo hambre de lo ajeno y cero de producción, [nombre]. Tu palabra no vale una mierda aquí, ridículo.',

      'No hay misterio interesante: hay previsible y rata, el combo flojo del high, [nombre]. Resuelves conflictos alimentándolos, fracasado.',

      'Rata de las que el mute ajeno lee como invitación y se equivoca de libro, [nombre]. Trepar sobre otros te queda de oficio, joder.',

      'Se te nota el peso de arrastrar el interés propio por cada hilo del grupo, [nombre]. Sin anestesia, mierda.',

      'Rata de las que roban el oxígeno del hilo y no devuelven ni un mensaje útil, [nombre]. Resuelves conflictos alimentándolos, coño.',

      'Rata de manual: te aprovechas del grupo y encima miras con cara de víctima, [nombre]. Trepar sobre otros te queda de oficio, cabrón.',

      'Se te nota el hocico de rata cada vez que huele a beneficio fácil en el chat, [nombre]. Tu palabra no vale una mierda aquí, gilipollas.',

      'Rata de fondo de chat: siempre cerca del botín ajeno, nunca del trabajo propio, [nombre]. Gilipollas.',

      'Has hecho del aprovechamiento un deporte y vas líder de la clasificación, cutre.[nombre]. Trepar te delata a la legua, gilipollas.',

      'Rata con las mismas cartas manchadas de siempre y sin plan B Tu palabra no vale una mierda aquí, basura.',

      'Se te oye el roce de la cola de rata cada vez que cambias de postura moral, [nombre]. chat ya lo sabía, ridículo.',

      'Has hecho del provecho ajeno tu único talento documentado, [nombre]. Trepar te delata a la legua, basura.',

      'Tienes más giros de chaqueta que un perchero de second hand en liquidación, [nombre]. Tu palabra no vale una mierda aquí, joder.',

      'Rata cutre: el aprovechamiento sin inteligencia es solo miseria con patas, [nombre]. Resuelves conflictos alimentándolos, mierda.',

      'Has convertido. El chat en tu despensa y al resto en inventario de provecho, [nombre]. Trepar sobre otros te queda de oficio, coño.',

      'Tu palabra no vale una mierda aquí: firmas y fallas en el mismo aliento, [nombre]. El interés propio se te ve, mierda.',

      'Rata constante: la única disciplina es no soltar lo que no es tuyo, [nombre]. Sin una puta lealtad útil, coño.',

      'Se te nota la prisa por agarrar y la ausencia total de plan de devolver, [nombre]. Trepar te delata a la legua, cabrón.',

      'Tienes el historial de un local cerrado por salubridad moral del ranking, [nombre]. el grupo de testigo, asco.',

      'Rata de ranking: bajas la media del grupo con constancia molesta, [nombre]. maquillaje posible, basura.',

      'Has convertido lo rata en marca personal y la marca se pega en los dedos, [nombre]. Trepar sobre otros te queda de oficio, ridículo.',

      'Rata de estribillo que mancha más con cada repetición del mismo plato, [nombre]. Tu palabra no vale una mierda aquí, fracasado.',

      'Se te nota el hábito de empujar cada tema hacia tu beneficio corto, [nombre]. Resuelves conflictos alimentándolos, joder.',

      'Rata de fondo permanente: bajas la media con la disciplina de quien no se cansa de sacar, [nombre]. Asco.',

      'No es viveza: es falta de criterio con hocico de rata incluido, [nombre]. El interés propio se te ve, joder.',

      'Tienes más restos de interés ajeno en el relato que un cubo sin recogida, [nombre]. Sin una puta lealtad útil, mierda.',

      'Rata de ceja ajena levantada y respeto en el sótano del ranking, [nombre]. Trepar te delata a la legua, coño.',

      '[nombre], eres el que dice después ya lo sabía y nunca avisaste cuando servía. El interés propio se te ve, cabrón.',

      'Has convertido la rata en identidad y no hay detergente narrativo, [nombre]. Resuelves conflictos alimentándolos, asco.',

      'Rata cutre y sin complejo: el complejo indicaría espejo y no lo hay, [nombre]. Trepar sobre otros te queda de oficio, basura.',

      'La dignidad no te coge el teléfono: el buzón está lleno de avisos, [nombre]. Tu palabra no vale una mierda aquí, ridículo.',

      'Rata de letrero grasiento: se lee de lejos y no invita a entrar, [nombre]. Sin una puta lealtad útil, basura.',

      'No hay misterio de ratez con estilo: hay lo previsible y sucio del high, [nombre]. frame. Trepar te delata a la legua, ridículo.',

      'Tienes el historial de un fregadero que nadie ha tocado desde el domingo, [nombre]. El interés propio se te ve, fracasado.',

      'Rata de malinterpretar el silencio: siempre sirviendo más en plato que nadie pidió, [nombre]. Basura.',

      'Has dejado el chat como fregadero a medias: restos eternos de ratez, [nombre]. chat ya lo sabía, cabrón.',

      'Rata de estribillo sin punto final limpio ni redención posible, [nombre]. Tu palabra no vale una mierda aquí, gilipollas.',

      'La compostura cruza de acera cuando te ve en el ranking del high, [nombre]. Resuelves conflictos alimentándolos, patético.',

      'Se te ve venir la tajada en la primera palabra del mensaje, [nombre]. Trepar sobre otros te queda de oficio, asco.',

      'La dignidad no para el coche: tú eres el tráfico del arcén, [nombre]. se te nota a la legua, basura.',

      'Rata de superficie suficiente: no hace falta abrir el cubo, huele, [nombre]. Sin una puta lealtad útil, asco.',

      'No hay barniz: hay ratez pura y no se vende como carisma, [nombre]. Trepar te delata a la legua, basura.',

      'Rata de las que alardean del aprovecho porque callar las deja sin personaje, [nombre]. El interés propio se te ve, ridículo.',

      'Das asco de entrada y el resto del mensaje solo confirma el desastre, [nombre]. el grupo de testigo. Sin una puta lealtad útil, fracasado.',

      'Has firmado lo rata con grasa en cada mensaje como única firma, [nombre]. Trepar sobre otros te queda de oficio, coño.',

      'Rata visible desde lejos: el rastro se ve, la parada no compensa, [nombre]. Tu palabra no vale una mierda aquí, cabrón.',

      'La clase te suena a ataque y respondes dejando más migas de interés ajeno, [nombre]. Resuelves conflictos alimentándolos, gilipollas.',

      'Rata de racha perfecta: lo único que no fallas es sacar tajada del chat, [nombre]. Trepar te delata a la legua, cabrón.',

      'No hay eco de estilo: hay eco de ratez. Y el chat lo amplifica, [nombre]. El interés propio se te ve, gilipollas.',

      'Tienes el aura del plato olvidado: presente, frío y con restos de rata, [nombre]. Sin una puta lealtad útil, patético.',

      'Rata de error de lectura: confundes límites con permiso para seguir sacando, [nombre]. Trepar te delata a la legua, asco.',

      'El listón lo usas de pan y el suelo del chat es tu mantel preferido, [nombre]. El interés propio se te ve, basura.',

      'Has hecho ranking de ratez y el oro es tuyo sin rival serio, [nombre]. Resuelves conflictos alimentándolos, joder.',

      'Rata de feria ambulante: el mismo show, el mismo asco, cero nostalgia, [nombre]. Trepar sobre otros te queda de oficio, mierda.',

      'Se te ve venir la tajada en el primer punto del mensaje, [nombre]. Tu palabra no vale una mierda aquí, coño.',

      'La dignidad hace autostop y el tráfico del arcén eres tú, [nombre]. Sin una puta lealtad útil, mierda.',

      'Rata de superficie: basta la vista, no hace falta el sótano, [nombre]. Trepar te delata a la legua, coño.',

      'No hay barniz de antihéroe: hay ratez y el high la cobra, [nombre]. frame. El interés propio se te ve, cabrón.',

      'Tienes el tono de noches de chat sin una frase que se sostenga limpia, [nombre]. Sin una puta lealtad útil, gilipollas.',

      'Rata de malinterpretar el mute como invitación a seguir sacando, [nombre]. anestesia. Trepar te delata a la legua, patético.',

      'El precio de tu repertorio lo paga el hilo en tiempo y paciencia, [nombre]. Tu palabra no vale una mierda aquí, ridículo.',

      'Has dejado el hilo como obra sin plano: escombro de ratez, [nombre]. Resuelves conflictos alimentándolos, fracasado.',

      'Rata de estribillo que empeora con cada bis del mismo plato, [nombre]. Trepar sobre otros te queda de oficio, joder.',

      'Se te nota el hábito de empujar cada hilo hacia tu beneficio corto, [nombre]. cerrado. El interés propio se te ve, fracasado.',

      'La compostura del nivel no te reconoce en el elenco del ranking, [nombre]. se te nota a la legua, coño.',

      'Tienes más manchas de interés ajeno que intentos de pasar un trapo, [nombre]. Trepar te delata a la legua, mierda.',

      'Rata de respeto ajeno en números rojos del ranking del grupo, [nombre]. El interés propio se te ve, coño.',

      '[nombre], eres el que dice después ya lo sabía y nunca avisaste cuando servía. Sin una puta lealtad útil, da asco.',

      'Has convertido la rata en carnet. y no hay renovación limpia, [nombre]. Trepar sobre otros te queda de oficio, asco.',

      'Rata de fondo: siempre las mismas cartas manchadas de conveniencia, [nombre]. El interés propio se te ve, patético.',

      '[nombre], trepar te queda de oficio y el grupo ya te tiene fichado sin carpeta. Sin una puta lealtad útil, asco.',

      'Rata hasta para el modo oscuro: ni la sombra tapa lo que sacas, [nombre]. Trepar te delata a la legua, basura.',

      'Se te cae el disimulo solo con abrir el hilo y el high lo documenta, [nombre]. El interés propio se te ve, ridículo.',

      'Rata de las que el filtro de confianza se rinde y pide la baja, [nombre]. Sin una puta lealtad útil, fracasado.',

      'No hay barniz que te salve: hay ratez de base y el comando la cobra, [nombre]. Trepar te delata a la legua, basura.',

      'Tu mensaje es un aviso de lo que no hay que dejar suelto en el grupo, [nombre]. El interés propio se te ve, qué cutre.',

      'Rata con la disciplina de quien nunca ha devuelto una puta favor, [nombre]. Resuelves conflictos alimentándolos, da pena ajena.',

      'El high no es un mal día de ética: es. Trepar sobre otros te queda de oficio, patético, patéticoasco.',

      'Tienes una presencia que ensucia el hilo en un solo movimiento de rata, [nombre]. Tu palabra no vale una mierda aquí, asco, indignante.',

      'Rata de repertorio: siempre la misma tajada y cero plan B de dignidad, [nombre]. Sin una puta lealtad útil, patético.',

      'Se te nota el desastre hasta en la miniatura del estado, [nombre]. Trepar te delata a la legua, asco, da vergüenza.',

      'Rata sin complejo útil: el complejo al menos indicaría que viste el hocico, [nombre]. El interés propio se te ve, basura.',

      'El ranking de confianza te deja donde mereces: en el sótano del high, [nombre] frame. Sin una puta lealtad útil, ridículo.',

      'Has hecho de la rata tu marca y la marca se pega en los dedos ajenos, [nombre]. Trepar te delata a la legua, fracasado.',

      'Rata de las que confunden astucia con no tener vergüenza en el ranking, [nombre]. Tu palabra no vale una mierda aquí, patético.',

      'No es viveza con gracia: eres rata y el high no discute la evidencia, [nombre]. Resuelves conflictos alimentándolos, miserable.',

      'Avisas de los chismes que tú mismo empezaste y consuelas por las puñaladas que tú mismo clavaste. Modelo de negocio redondo, basura.',

      'Se te ve el hocico de rata cada vez que huele a beneficio fácil en el chat, [nombre]. Tu palabra no vale una mierda aquí, patético.',

      'El grupo ya no se sorprende: archiva tus mensajes en la carpeta de las ratas, [nombre]. Resuelves conflictos alimentándolos, asco, qué vergüenza.',

      'Tienes más episodios de rata documentados que intentos de subir el nivel, [nombre]. Trepar sobre otros te queda de oficio, basura.',

      'Tu forma de acercarte funciona hasta que se descubre para qué. Y siempre se descubre, cabrón. Ahí es donde te quedas solo otra vez, fracasado.',

      '[nombre], eres el que dice que solo se lo cuenta a una persona. Y esa persona ya son ocho. Puta rata con capacidad de distribución, qué miseria.',

      'Has hecho de lo rata una marca personal y la marca se pega en los dedos, [nombre]. Trepar sobre otros te queda de oficio, joder.',

      'Has convertido el bajo listón en residencia fija sin mudanza a la vista, [nombre]. Tu palabra no vale una mierda aquí, qué nivel de pena.',

      'No es atrevimiento: es suciedad de interés y el high te la cobra entera, [nombre]. Resuelves conflictos alimentándolos, basura.',

      'Tienes más grasa de rata en el discurso que un freidor de feria al cierre, [nombre]. Trepar sobre otros te queda de oficio, cabrón.',

      'Rata de cloaca, [nombre]: te llevas el mérito y repartes la culpa. Siempre en esa dirección y nunca en la contraria. Puta escoria, da pena ajena.',

      'Eres el que pregunta cómo estás con intención de averiguar, no de saber. Puta encuesta disfrazada de amistad y sin consentimiento, qué vacío.',

      'El olor a rata se te nota en cada mensaje que pide sin dar nada a cambio, [nombre]. Trepar sobre otros te queda de oficio, asco.',

      'Se te oye el arrastre de la rata hasta en los mensajes cortos del hilo, [nombre]. Sin anestesia, basura.',

      'Rata sin punto final limpio: el estribillo se repite y mancha más cada vez, [nombre]. Resuelves conflictos alimentándolos, ridículo.',

      'La vergüenza ajena te sigue y no es admiración: es consecuencia del rastro, [nombre]. Trepar sobre otros te queda de oficio, fracasado.',

      'Tienes el aura de quien pide prestado y nunca devuelve ni las gracias, [nombre]. Tu palabra no vale una mierda aquí, menudo desastre.',

      'Rata de las que el grupo aguanta por inercia y no por respeto de verdad, [nombre]. Resuelves conflictos alimentándolos, qué pena.',

      'Rata de repertorio gastado: las mismas manchas, el mismo plato de siempre, [nombre]. Trepar sobre otros te queda de oficio, coño.',

      'Has convertido. El chat en tu zona de obras grasientas sin fecha de fin, [nombre]. Resuelves conflictos alimentándolos, miserable.',

      'Tu presencia aquí depende de que nadie junte las piezas. Ya las están juntando, escoria. Y el cuadro que sale es una puta rata, qué cringe.',

      'Eres el que dice que no quiere problemas mientras los fabrica en otro chat. Puta hipocresía con doble pantalla y cara de bueno, da asco.',

      '[nombre], eres el que suelta el dato en el peor momento posible y lo llama coincidencia. No lo es. No lo ha sido nunca, basura.',

      'Tu forma de mantener la paz es que nadie tenga la foto completa, [nombre]. Y eso no es paz, es una puta bomba con temporizador, ridículo.',

      '[nombre], rata de mierda. Con el archivo de capturas mejor organizado del grupo. Y ni una sola conversación honesta en todo él, fracasado.',

      'Has hecho de lo rata tu plato favorito y lo sirves en todas las mesas, [nombre]. Resuelves conflictos alimentándolos, qué miseria.',

      'Tu forma de hablar de otros cambia según quién esté delante. Cada vez, sin fallar. Puta veleta con dos caras y ninguna limpia, da grima.',

      'Tu manera de estar en un grupo es no estar del todo en ninguna parte. Un puto topo con carné de miembro y lealtad de alquiler, qué nivel de pena.',

      '[nombre], tu manera de acercarte a alguien es medir primero qué se le puede sacar. Y luego llamas a eso hacer amigos, basura.',

      'Eres el que se distancia del amigo jodido justo cuando más falta hace. Basura. Con instinto de supervivencia y cero lealtad, qué cutre.',

      'Vendiste a alguien por algo que ni siquiera te salió bien. Eso es lo más patético. Del asunto. Y, patético.',

      '[nombre], rata de manual: preguntas cómo estás con intención de averiguar, no de saber. Puta encuesta con cara de amistad, qué vacío.',

      'Eres el que dice que solo se lo cuenta a una persona. Y esa persona ya son ocho. Puta rata con capacidad de distribución, indignante.',

      'Gestionas la información ajena como si fuera tuya, cabrón. Y no lo es. Eso tiene un nombre y no es discreción, es robo, qué vergüenza ajena.',

      'Eres el que pregunta cómo estás con intención de averiguar, no de saber, [nombre]. Puta encuesta disfrazada de amistad, da vergüenza.',

      'Eres el que se ofrece a guardar un secreto y luego lo usa como moneda. Puta rata con caja fuerte y tarifa por abrirla, qué flojo.',

      '[nombre], tu manera de resolver un conflicto es alimentarlo desde fuera. Puto pirómano con manguera y cara de bombero, menudo desastre.',

      'Tu palabra no vale una mierda. En este grupo, [nombre], y llevas años sin darte cuenta de que todos lo saben menos tú. Puto patético fracasado, qué pena.',

    ],
    mid: [
      'Una reputación se está formando sobre ti que tú no ves pero que todos los demás ya tienen con el parte firmado debajo.',

      'Hay una reputación formándose sobre ti que tú no ves pero que todos los demás ya tienen en el único marcador que importa aquí.',

      'Ni una cosa ni la otra. Suficiente discreción para pasar, suficientes deslices para que se note en el parte que nadie borra.',

      'Tu instinto de supervivencia social a veces pisa la lealtad. Y a veces la cruza directamente y. El veredicto no se negocia.',

      'Tu lealtad tiene condiciones, y las condiciones son justo lo que la convierte en sospechosa sin suavizar el golpe del número.',

      'Ni leal del todo ni traidor del todo. Guardas lo importante y sueltas lo demás sin pensarlo sin anestesia de verdad esta vez.',

      'A veces eres de fiar y a veces no, y nadie sabe cuándo es cuál. Eso ya es ser poco de fiar con el número hablando solo.',

      'A ratos eres de fiar y a ratos no, y esa lotería ya es suficiente para que la gente cuide con. El bot como notario del fallo.',

      'Ni leal ni traicionero. Un punto medio que en esto es bastante más común de lo que parece en el idioma seco del ranking.',

      'Tu fidelidad condicional es peor que la traición directa porque nadie sabe cuándo llega y no hace falta ampliar el parte.',

      'Traicionas cuando conviene lo suficiente como para que la gente cuide lo que te cuenta con el cargo en firme.',

      'No eres rata de manual pero tienes los reflejos. Y eso preocupa a quien te conoce bien sin letra pequeña que lo salve.',

      'Hay gente en el grupo que ya decidió qué te cuenta. No es paranoia, es haber aprendido. Y el chat archiva sin debate.',

      'No tienes mala intención siempre, pero los resultados son los mismos. Y eso ya importa. Y el grupo ya pasó de página.',

      'Guardas casi todo, pero ese casi es justo lo que hace que nadie confíe del todo en ti con el saldo a la intemperie.',

      'No traicionas a propósito, pero el instinto de salvarte tú primero te puede demasiado y basta el dato del ranking.',

      'Tienes lealtad para lo fácil y ninguna para lo difícil. Y lo difícil es lo que cuenta con el dígito como única defensa.',

      'Ni rata ni referencia. Un intermedio gris que nadie recuerda ni para bien ni para mal sin consuelo de manual barato.',

      'Tu lealtad se mantiene mientras no te cueste. En cuanto cuesta, se empieza a negociar sin modo avión ni silencio cómplice.',

      'La gente que te conoce bien no te da todo. Y tú ya sabes por qué, aunque no lo digas delante de quien aún leía el hilo.',

      'Hay quien ya decidió qué contarte y qué no, y eso no es paranoia, es haber aprendido en el momento que más dolía soltarlo.',

      'Ni rata ni de fiar. Un intermedio que hace que nadie te cuente nada demasiado grande y no hay DLC que lo parchee.',

      'Tienes criterio para saber qué se cuenta y qué no. Lo que falla es aplicarlo siempre con el eco del almost todavía sonando.',

      'A ratos te portas bien y a ratos no tanto. La proporción decide y la tuya está justa y. El ranking cierra el caso.',

      'A veces guardas lo que te dicen. Otras no. Y la incertidumbre ya es suficiente daño con el cargo en firme.',

      'A veces das la cara y a veces miras para otro lado, y la duda ya hace bastante daño y. El ranking no pide permiso.',

      'Tu manera de estar es no comprometerte demasiado con nadie. Eso te salva y te aísla y el historial no olvida.',

      'Ni ejemplo ni advertencia. En el medio exacto, donde la gente prefiere no arriesgar con el número en la frente del mensaje.',

      'Ni de fiar del todo ni peligroso del todo. Un intermedio que obliga a medir contigo y no hay DLC que lo parchee.',

      'Tu manera de estar en los conflictos es no estar. Eso no es neutralidad, es cálculo con el resultado ya consumado.',

      'Tu porcentaje es medio porque en esto eres medio: mitad palabra, mitad conveniencia sin maquillaje ni segunda toma.',

      'Tu lealtad existe pero tiene límites bastante bajos. Se ven en cuanto aprieta algo sin barniz de relato heroico.',

      'A veces defiendes a quien no está y a veces te sumas a la crítica. Depende del día y el resto es ruido de fondo.',

      'Ni rata ni escudo. Justo en el medio, donde la gente te aprecia sin confiarte nada y no hace falta ampliar el parte.',

      'Tu fidelidad depende del momento, y la gente que te conoce lleva tiempo notándolo con. El botín o el fail a la vista.',

      'Ni fiel ni desleal. Un intermedio que la gente lee como que hay que tener cuidado con el fallo en 4K de chat.',

      'A veces callas lo que debes callar. Otras se te escapa. Y esas veces se recuerdan con el parte firmado debajo.',

      'A ratos te mojas por alguien y a ratos miras hacia otro lado. La media queda aquí y el archivo queda cerrado, qué cutre.',

      'No eres rata de manual, pero tienes los reflejos, y los reflejos también delatan sin segunda oportunidad hoy, da pena ajena.',

      'Tienes principios, pero flexibles. Y unos principios flexibles no son principios sin prórroga ni VAR, qué vacío.',

      'Tu manera de gestionar la información ajena es razonable. No perfecta, razonable delante de quien aún leía el hilo, indignante.',

      'A ratos guardas y a ratos comentas. Y comentar es donde se pierden las amistades sin segunda oportunidad hoy, qué vergüenza ajena.',

      'A veces avisas a tiempo y a veces demasiado tarde. Esa diferencia lo decide todo con el parte firmado debajo, da vergüenza.',

      'Ni bueno ni malo en esto. Un intermedio funcional que a nadie preocupa demasiado y el sistema cierra sin discusión, qué flojo.',

      'A veces cubres a la gente y a veces te desentiendes. Nadie sabe cuál va a tocar con el eco del almost todavía sonando, menudo desastre.',

      'Ni traicionas ni defiendes. Estás en la franja cómoda del que no se moja nunca y. El ranking cierra el caso, qué pena.',

      'Ni de fiar ni peligroso. Un término medio que la gente gestiona con distancia con el parte firmado debajo, patético.',

      'Ni rata ni escudo. En el medio, donde no se cuenta contigo para nada delicado sin que nadie pida replay, miserable.',

      'Tienes buenas intenciones y poca constancia en sostenerlas cuando cuesta algo con el número en la frente del mensaje, qué cringe.',

      'Ni traicionas ni te comprometes. Es la posición más segura y la menos valiosa con el grupo de testigo silencioso, da asco.',

    ],
    low: [
      'Nada por aquí. Cumples tu palabra aunque cumplirla salga caro. Rarísimo y muy caro de encontrar con. El veredicto seco del bot.',

      'Sin material. Aquí sales impecable. Disfrútalo, que en los otros comandos no hay tanta suerte y el sistema marca el punto final.',

      'Cero por ciento. No vendes a nadie ni por dinero ni por quedar bien. Poquísimos aguantan eso. Delante del público que no pidió entrada.',

      'Cero por ciento. No hay una sola persona aquí que tenga algo que reprocharte por la espalda con. El chat enterado del cargo.',

      'Nada. Guardas secretos que otros venderían por mucho menos de lo que a ti te han ofrecido sin maquillaje ni segunda toma.',

      'Cero. Nunca has sacado provecho de un mal momento ajeno. Ni se te ha pasado por la cabeza con. El botín o el fail a la vista.',

      'Cero. No te has ido corriendo cuando la cosa se puso fea. Eso ya te separa de la mayoría en el segundo más incómodo del chat.',

      'Sin rastro. Ni una puñalada, ni un chivatazo, ni un cambio de bando. Historial impecable con el fail todavía caliente.',

      'Sin rastro. La confianza que la gente te tiene está construida sobre hechos, no sobre fe en el segundo más incómodo del chat.',

      'Sin material. Ni un solo rumor tuyo circulando por ahí. Expediente completamente limpio. Delante del público que no pidió entrada.',

      'Nada. Eres de fiar. Y se nota en que la gente te cuenta cosas que no cuenta en el grupo con el cargo en firme.',

      'Limpio del todo. La gente te cuenta cosas serias porque sabe que no van a salir de ahí con el número en la frente del mensaje.',

      'Nada de rata. Lo que te cuentan se queda contigo. En este grupo eso es casi extinción con el número hablando solo.',

      'Cero por ciento. Prefieres perder algo antes que ganar traicionando. Eso es carácter en el parte que nadie borra.',

      'Cero por ciento. Tu versión de las cosas es siempre la misma esté quien esté delante en el único marcador que importa aquí.',

      'Sin material. Nunca has estado en el bando cómodo por comodidad. Solo por convicción sin consuelo de manual barato.',

      'Cero por ciento. Leal aunque pierda. Esa frase se dice mucho y se cumple casi nunca con el eco del almost todavía sonando.',

      'Cero por ciento. Cuando algo te parece mal, lo dices a la cara. Sin chats paralelos. Sin derecho a matiz útil.',

      'Cero por ciento. Ni un pacto roto, ni una palabra retirada, ni una traición pequeña con. El chat enterado del cargo.',

      'Nada. Eres de los pocos a los que se puede contar algo grave sin pensarlo dos veces en el momento que más dolía soltarlo.',

      'Limpio. Eres de los que avisan a la cara en vez de moverse por detrás. Se agradece sin consuelo de manual barato.',

      'Cero por ciento. La confianza que tienes te la has ganado durante años, sin fallos. Delante del ranking y de la cara.',

      'Cero. No hay ratas con tu expediente. Ni una mancha, y mira que hay oportunidades sin barniz de relato heroico.',

      'Nada. No hablas mal de nadie a sus espaldas y por eso se te escucha cuando hablas con el saldo a la intemperie.',

      'Sin rastro. No cambias de bando según sople el viento y eso te ha costado cosas y basta el dato del ranking.',

      'Cero. Tu lealtad no depende del beneficio, y esa es la única lealtad que existe con la cara del resultado a la vista.',

      'Limpio del todo. Aquí no hay nada que rascar y no será porque no hayan buscado y. El ranking no pide permiso.',

      'Limpio. Nunca has usado lo que sabes contra nadie, teniendo material de sobra y. El ranking no pide permiso.',

      'Limpio. Defiendes a la gente cuando no está delante. Ahí se ve quién es quién y basta el dato del ranking.',

      'Cero. Has perdido oportunidades por no traicionar y no te ha temblado la mano con el parte firmado debajo.',

      'Cero por ciento. Ni una sola vez has contado algo que te dijeron en confianza con el cargo en firme.',

      'Limpio. No tienes conversaciones sobre gente que luego tendrías que esconder con la cara del resultado a la vista.',

      'Limpio. Tu manera de estar en un grupo es sumar, no medir qué se puede sacar delante de todo el que miraba.',

      'Cero. No traicionas ni cuando te conviene, y te ha convenido más de una vez y el archivo queda cerrado.',

      'Cero. Lo que se te cuenta se queda contigo. Punto. Y eso hoy vale muchísimo y no hay modo de suavizarlo.',

      'Cero por ciento. Prefieres callar antes que contar algo que no te pertenece con el saldo a la intemperie.',

      'Cero. Tu discreción no es estrategia, es principio. Y se nota la diferencia en la foto fija del ranking.',

      'Nada por aquí. Ni una captura tuya circulando. Ni una, en todos estos años y el hilo no pide amplificación.',

      'Nada de nada. Eres de los que avisan antes, no de los que comentan después con el número en la frente del mensaje.',

      'Nada. La gente sabe que contigo lo que se dice se queda, y eso es rarísimo sin segunda lectura que lo arregle.',

      'Limpio del todo. No hay dos versiones tuyas de ninguna historia. Solo una y el archivo queda cerrado.',

      'Cero. Guardas secretos que te han costado incomodidad. Y ni lo mencionas. Y el grupo ya pasó de página.',

      'Nada. No te sumas a las críticas fáciles ni cuando todo el mundo lo hace y el sistema cierra sin discusión.',

      'Sin rastro. Nadie ha tenido que pedirte que no cuentes algo. Ya lo sabes sin prórroga ni VAR y. El ranking no pide permiso.',

      'Nada. No guardas munición sobre nadie porque no piensas en esos términos y el archivo no admite recurso.',

      'Cero por ciento. Tu palabra vale porque nunca la has malgastado en nada sin consuelo de consola en alta resolución de group chat.',

      'Limpio. No te acercas a nadie por interés y por eso tus amistades duran sin consuelo de manual barato.',

      'Limpio. No haces favores para tener a nadie atado. Los haces y ya está. Y el chat archiva sin debate.',

      'Cero. Cuando hay que dar la cara, la das. Y la das entera, no a medias con el resultado ya consumado.',

      'Nada. No has vendido a nadie nunca y no lo harías ni saliendo ganando con testigos obligados en el hilo.',

    ],
  },

  maricon: {
    name: 'maricon',
    goodIsHigh: false,
    high: [
      'Joder, un personaje hetero tan frágil que se cae con una mirada de más y se cae cada puto día, y hace tiempo. Basura.',

      'Coño, tarde a aceptarlo y temprano a disimularlo: el desfase se nota en cada puta frase, y hace tiempo. Basura.',

      'Coño, cada negación añade capa de ridículo: la tarta ya tiene demasiadas capas de mentira, y hace tiempo. Asco.',

      'Coño, habla se te ilumina la cara dos segundos de más y esos dos segundos son toda la confesión, y hace tiempo. Cabrón.',

      '[nombre] es tan maricón que más metros cuadrados que tu habitación y mejor wifi: a este ritmo vas a empadronarte dentro. Patético.',

      'Joder, un detalle que solo tiene quien está eligiendo de verdad, y estás eligiendo sin disimulo, y hace tiempo. Ridículo.',

      'Hostia, cuándo vas a salir: las apuestas están abiertas y las cuotas bajan cada puta semana, y hace tiempo. Pringado.',

      'Coño, pasa un tío en forma: el reflejo es más honesto que toda tu boca junta en el chat, y hace tiempo. Fracasado.',

      'Mierda, haciendo de hetero: el público se fue en el primer acto y tú sigues en el escenario solo, y hace tiempo. Joder.',

      'Joder, gritas que no eres y el eco te devuelve la mentira con reverb de mentiroso profesional, y hace tiempo. Coño.',

      'Coño, ya no cuenta como secreto: es un anuncio a toda página y tú sigues en modo incógnito, y hace tiempo. Gilipollas.',

      'Mierda, tu cuerpo responde antes que tu boca: el cuerpo no ha firmado el pacto de silencio, y hace tiempo. Patético.',

      'Coño, se quita la camiseta se te para el tiempo y luego reanudas el guion como si nadie hubiera visto, y hace tiempo. Asco.',

      'Coño, dejó de preguntar, ahora afirma: tú sigues respondiendo como si fuera un debate abierto, y hace tiempo. Joder.',

      '[nombre] es tan maricón que soy hetero tiene menos crédito que un anuncio de madrugada: nadie lo compra y sigues emitiéndolo. Coño.',

      'Joder, la negación cansa más que la verdad y aun así eliges el cansancio como si fuera una virtud, y hace tiempo. Cabrón.',

      'Coño, niegas y se te sube la voz media octava: el cuerpo delata hasta en el tono de la mentira, y hace tiempo. Patético.',

      'Joder, cada no homo es un ladrillo: llevas una muralla y todavía crees que estás escondido detrás, y hace tiempo. Fracasado.',

      'Coño, mujeres como manual leído en voz alta: sin pasión y con ganas de que termine la escena, y hace tiempo. Mierda.',

      'Mierda, cuello, pausas y sonrisas de más ya escribieron el informe: solo falta tu firma al pie, y hace tiempo. Coño.',

      'Joder, evidencia forense en tus reacciones: el juicio se celebra cada vez que pasa un tío bueno, y hace tiempo. Gilipollas.',

      'Coño, versión macho es un skin para el grupo: en cuanto bajas la guardia el skin se cae solo, y hace tiempo. Ridículo.',

      'Mierda, el armario ya no te protege, te exhibe: cada capa de negación hace el contorno más claro, y hace tiempo. Basura.',

      'Joder, tanto en el disfraz que el día que te lo quites vas a sentir el aire: conviene sentirlo, y hace tiempo. Asco.',

      'Mierda, pack de reprimido: miradas, pausas, bromas y ofensa selectiva: el pack se vende solo, y hace tiempo. Pringado.',

      'Mierda, ya no se sorprende, se aburre de esperarte: eso también es un diagnóstico del grupo, y hace tiempo. Cabrón.',

      'Joder, hetero cabe en un tuit: tu gay reprimido llena el resto del timeline sin esfuerzo, y hace tiempo. Patético.',

      'Coño, fútbol como trámite: los heteros de verdad a veces se aburren pero no se les nota tanto, y hace tiempo. Pringado.',

      'Mierda, años construyendo la coartada: la coartada ya no sostiene el peso de las pruebas, y hace tiempo. Fracasado.',

      'Joder, no soy gay suena a todavía no lo he dicho en voz alta: la diferencia es mínima, y hace tiempo. Mierda.',

      'Coño, culos con concentración de cirujano: luego dices que era por el corte del pantalón, y hace tiempo. Cabrón.',

      'Mierda, duda en zona de confort y evidencia en invitado molesto: el invitado ya vive contigo, y hace tiempo. Gilipollas.',

      'Joder, versión pública y privada ya no se saludan: la privada lleva ganando años enteros, y hace tiempo. Ridículo.',

      'Mierda, tanto negando que la negación se te quedó de gesto: hasta en las fotos se ve el tic, y hace tiempo. Asco.',

      'Coño, tías como letra de canción en otro idioma: sin sentirla y con ganas de que acabe, y hace tiempo. Fracasado.',

      'Mierda, el grupo te resume en una palabra: tú necesitas un párrafo para no decirla, el resumen gana, y hace tiempo. Joder.',

      'Joder, tío se ríe y tú medio segundo después: se te ve el retraso del disimulo a la legua, y hace tiempo. Coño.',

      'Coño, única persona sorprendida eres tú: el resto está en la grada desde el primer acto, y hace tiempo. Gilipollas.',

      'Mierda, tíos como escaparates y no es de ropa: es de otra cosa que no quieres poner en palabras, y hace tiempo. Patético.',

      '[nombre] es tan maricón que boca firma comunicados y cuerpo los desmiente en tiempo real: el cuerpo tiene mejor gabinete. Ridículo.',

      'Joder, pack de reprimido con manual incluido: el manual se te cae a menudo y se lee solo, y hace tiempo. Basura.',

      'Coño, cuerpo de amigos con inventario: tallas, proporciones y nota mental que no confiesas, y hace tiempo. Joder.',

      'Joder, coherencia se fue el día que combinaste miradas de hambre con discurso de hetero, y hace tiempo. Cabrón.',

      'Coño, cuerpo ya hizo el anuncio: tú sigues en la rueda de prensa negando el comunicado oficial, y hace tiempo. Patético.',

      'Mierda, dices que no miras y la pupila se dilata sola: la biología no firmó el pacto de silencio, y hace tiempo. Ridículo.',

      'Joder, negación es tu deporte olímpico: llevas medallas de mentira y el podio se nota, y hace tiempo. Fracasado.',

      'Coño, cada pista es más clara que la anterior: la curva de aprendizaje del grupo es perfecta, y hace tiempo. Mierda.',

      'Mierda, boca dice no y tiempo de reacción dice sí: el tiempo de reacción no miente nunca, y hace tiempo. Coño.',

      'Joder, única salida digna es dejar de pelearte con lo evidente: el resto son vueltas de más, y hace tiempo. Gilipollas.',

      'Coño, tíos como quien elige en una carta: y la carta no es de restaurante de ninguna clase, y hace tiempo. Ridículo.',

      'Mierda, hetero es traje de alquiler: se devuelve al final de la función y la función se alarga, y hace tiempo. Basura.',

      'Mierda, años en modo avestruz: el agujero ya es profundo. Y el grupo ve el resto del cuerpo, y hace tiempo. Pringado.',

      'Joder, miras con hambre y hablas con dieta: el hambre se te ve en los ojos. Sin filtro, y hace tiempo. Patético.',

      '[nombre] es tan maricón que duda en estilo y certeza en peligro: el estilo se te está quedando viejo, y hace tiempo. Asco.',

      'Coño, dices que no pasa nada y se te nota que pasa todo: el no pasa nada es el peor disfraz, y hace tiempo. Pringado.',

      'Mierda, tanto negociando contigo que el grupo firmó la paz por ti hace meses enteros, y hace tiempo. Fracasado.',

      'Joder, boca es abogado defensor y cuerpo es el testigo que lo hunde: el juicio está visto, y hace tiempo. Mierda.',

      'Mierda, grupo no necesita pruebas nuevas: necesita que tú te enteres de las viejas de una vez, y hace tiempo. Gilipollas.',

      'Joder, estética de la duda y discurso de la certeza: ninguna de las dos te queda limpia, y hace tiempo. Ridículo.',

      'Mierda, miras a tíos con calma de quien ya eligió y boca de quien todavía no firmó nada, y hace tiempo. Asco.',

      'Coño, años en el limbo entre lo que eres y lo que dices: el limbo también cansa al público, y hace tiempo. Fracasado.',

      'Mierda, grupo te tiene en la categoría correcta: tú sigues en la de reclamaciones sin avanzar, y hace tiempo. Joder.',

      'Joder, negación hecha reflejo: el reflejo ya es más rápido que tu pensamiento consciente, y hace tiempo. Coño.',

      'Coño, salida del armario convertida en tráiler eterno: el estreno no llega y el público se fue, y hace tiempo. Gilipollas.',

      'Mierda, culo con más honestidad que el discurso: y se nota en cómo te sientas cuando hay tíos, y hace tiempo. Patético.',

      'Joder, no en la boca y sí en los ojos: los ojos se ven de más lejos y no mienten nunca, y hace tiempo. Basura.',

      'Coño, has llegado al final del debate: solo falta que te enteres de que acabó hace meses, y hace tiempo. Asco.',

      '[nombre] es tan maricón que duda cuánto tiempo más del teatro: el final está escrito y el público ya tiene el spoiler. Fracasado.',

      'Joder, disimulo cansa más al grupo que a ti: y eso ya es mucho decir en este chat, y hace tiempo. Pringado.',

      'Mierda, lo obvio en debate eterno: el debate ya no entretiene a nadie en este grupo, y hace tiempo. Cabrón.',

      '[nombre] es tan maricón que cuando alguien tiene un problema abajo él ya está arrodillado antes de que terminen la frase, joder.',

      'Joder, el grupo te ve venir a kilómetros: la forma de mirar es el faro que no apagas, y hace tiempo. Asco.',

      '[nombre] es tan maricón que tío bueno dice algo inteligente y se te ilumina más la cara que cuando una tía te habla. Pringado, gilipollas.',

      '[nombre] es tan maricón que hetero es recordatorio constante: quien lo es de verdad no se recuerda tanto a sí mismo. Patético.',

      '[nombre] es tan maricón que mentira en hábito y hábito en personalidad secundaria: la secundaria ya manda en el chat. Basura.',

      'Coño, evidencia en las pausas: las pausas hablan más que tus frases de negación, y hace tiempo. Basura.',

      'Coño, outfit de disimulo y gesto de más suman: la suma ya es pública en el chat, y hace tiempo. Cabrón.',

      '[nombre] es tan maricón que tanto tiempo en el personaje que ya no recuerdas cómo se sale y fuera hace menos frío. Pringado, fracasado.',

      '[nombre] es tan maricón que años en el vestuario y todavía no has salido a escena: el público está cansado de esperar. Coño.',

      '[nombre] es tan maricón que cruzas las piernas, gesticulas y ríes de un modo que ya votó: el recuento es unánime. Ridículo.',

      '[nombre] es tan maricón que tío bueno entra al chat y se te resetea el hilo: luego retomas como si no hubiera corte. Joder.',

      '[nombre] es tan maricón que comentario de más y risa nerviosa: otra línea en el expediente que no para de crecer. Patético.',

      '[nombre] es tan maricón que cuerpo lleva años en otra conversación: tu boca todavía no se ha enterado del tema. Gilipollas.',

      '[nombre] es tan maricón que te gustan las tías y el tiempo de mirada dice los tíos: el tiempo de mirada no negocia. Mierda.',

      '[nombre] es tan maricón que alarma de incendios: ruidosa, urgente y avisando justo de lo contrario a lo que dices. Mierda.',

      '[nombre] es tan maricón que ambigüedad en hogar y claridad en amenaza: se entiende el miedo, no la mentira diaria. Cabrón.',

      '[nombre] es tan maricón que es broma después de cada comentario que no lo es: el es broma es tu firma digital. Gilipollas.',

      '[nombre] es tan maricón que cada pista nueva es redundante: el caso está cerrado desde hace temporadas enteras. Ridículo.',

      '[nombre] es tan maricón que te gustan las tías pero tu forma de mirar a los tíos grita más alto que un megáfono. Basura.',

      '[nombre] es tan maricón que armario ya no es metáfora: es espacio real con demasiadas horas de ocupación diaria. Mierda.',

      '[nombre] es tan maricón que culo sueña en alta definición y boca emite en blanco y negro: la calidad se nota. Fracasado.',

      '[nombre] es tan maricón que disfraz, ofensa lista y cansancio de mantenerlos: el cansancio se te oye en la voz. Cabrón.',

      'Mierda, la misma convicción con la que un rehén lee el comunicado forzado, sin alma y sin ganas de verdad. Gilipollas.',

      '[nombre] es tan maricón que menú masculino con demasiada atención para ser casual: la casualidad no dura tanto. Joder.',

      '[nombre] es tan maricón que niegas con furia y confirmas con el volumen: quien no oculta nada no grita tanto. Asco.',

      'Joder, abres la boca y luego vuelves a entrar corriendo a apagar la luz como si nadie hubiera visto nada. Mierda.',

      'Mierda, el armario es tan grande que ya tiene código postal: pronto te cobran el IBI por vivir dentro. Ridículo.',

      'Joder, comentario sospechoso seguido de es broma es otra confesión con sello: llevas un álbum entero. Pringado.',

      'Mierda, un traje prestado dos tallas grande: se te ve el culo por todos lados y dices que te queda bien. Asco.',

      'Sales del armario cada vez que abres la boca y luego vuelves a entrar corriendo a apagar la luz como si nadie hubiera visto nada, mierda.',

      'Cada vez que un tío bueno habla se te ilumina la cara dos segundos de más. Esos dos segundos son toda la confesión que necesitábamos, gilipollas.',

      'Dices que te gustan las tías con la misma convicción con la que un rehén lee el comunicado forzado. Sin alma y sin ganas, patético.',

      'El no homo que sueltas cada cinco minutos es el estribillo de una canción que todo el grupo se sabe de memoria, desperdicio.basura.',

      'Tu heterosexualidad es un traje prestado dos tallas grande: se te ve el culo por todos lados y encima dices que te queda bien, vergüenza, fracasado.',

      'Hostia, se ve la estructura por debajo. Y el grupo ya no se cree ni el montaje más elaborado del chat, y hace tiempo. Coño.',

      'Hostia, el estribillo de una canción que todo el grupo se sabe de memoria desde el primer mes, y hace tiempo. Basura.',

      'Coño, la devoción de quien reza y luego niegas la religión con la boca todavía llena de amén, y hace tiempo. Desperdicio.',

      '[nombre] es tan maricón que una miga de pan hasta la puerta del armario: llevas un rastro de kilómetros y finges despiste. Vergüenza, fracasado.',

      'Joder, quien repasa un guion mal aprendido: sin improvisación, sin ganas y con prisa de que acabe, y hace tiempo. Cutre.',

      'Hostia, intensidad de catálogo y el catálogo no es de amistad, es de otra cosa que no nombras, y hace tiempo. Cabrón.',

      'Hostia, no te esconde, te expone: cada negación es otra capa de pintura que no tapa la forma, y hace tiempo. Desperdicio, mierda.',

      'Mierda, pausas, miradas y sonrisas de más ya formaron un expediente completo: solo falta tu firma, y hace tiempo. Vergüenza.',

      'Hostia, tu culo y tu boca están en guerra civil: el culo quiere y la boca sigue con el comunicado, y hace tiempo. Fracasado.',

      'Hostia, la única persona que compra tu versión hetero eres tú y cada día con menos convicción, y hace tiempo. Gilipollas.',

      'Joder, el teatro dura lo que dura la paciencia del grupo y la paciencia se mide en semanas, y hace tiempo. Desperdicio.',

      'Hostia, la duda en estilo de vida y la evidencia en ruido de fondo: el ruido ya es ensordecedor, y hace tiempo. Asco.',

      'Coño, culos masculinos con la misma atención con que otros miran el móvil: y no es el pantalón, y hace tiempo. Vergüenza.',

      'Mierda, castillo de arena: la marea de la verdad sube cada día y se lleva otro muro de tu coartada, y hace tiempo. Cutre.',

      'Hostia, fichado con más precisión que tú a ti mismo: eso ya es el colmo de la negación diaria, y hace tiempo. Joder.',

      'Hostia, no eres con la frecuencia con que respiras: quien no lo es no necesita el recordatorio, y hace tiempo. Patético.',

      'Hostia, un tío se agacha se te para el reloj: luego sigues como si el tiempo no hubiera pausado, y hace tiempo. Vergüenza, mierda.',

      'Coño, boca niega y cuerpo confirma: el grupo se queda con el testigo más fiable del expediente, y hace tiempo. Cutre.',

      'Joder, tías con la pasión de un vegetariano describiendo un chuletón: se nota que no te apetece, y hace tiempo. Joder.',

      'Hostia, armario con wifi, calefacción y suscripciones: a este ritmo pides comida a domicilio dentro, y hace tiempo. Mierda.',

      'Coño, pista es miga: el camino llega hasta la puerta y la puerta está entreabierta hace meses, y hace tiempo. Coño.',

      'Hostia, físico de bros con detalle de inventario personal: tallas, proporciones y nota mental, y hace tiempo. Ridículo.',

      'Mierda, negación forma parte del personaje: sin ella el papel se cae, por eso la repites tanto, y hace tiempo. Desperdicio.',

      'Joder, cuerpo responde a tíos y boca a presión social: el cuerpo no ha leído las normas del chat, y hace tiempo. Vergüenza, qué vergüenza.',

      'Hostia, armario tan profundo que tus negaciones hacen eco y el eco suena a mentira profesional, y hace tiempo. Cutre, asco, ridículo.',

      'Hostia, memes internos sobre tu armario: los memes son más honestos que tus estados de WhatsApp, y hace tiempo. Coño, fracasado.',

      'Hostia, te gustan las mujeres pero la atención se va sola a los tíos: la atención no miente, y hace tiempo. Basura, qué miseria.',

      'Coño, teatro en intermedio: llevas meses en el intermedio y el público quiere el segundo acto, y hace tiempo. Desperdicio, da grima.',

      'Hostia, evidencia ordenada por fecha en tus reacciones: es un diario sin metáforas ni disculpas, y hace tiempo. Pringado, qué nivel de pena.',

      'Hostia, invertido en parecer y no en ser: la factura llega cada vez que alguien te mira de más, y hace tiempo. Cabrón, basura.',

      'Hostia, día que digas la verdad el grupo dirá por fin: y eso también va a doler un poco, y hace tiempo. Desperdicio, qué cutre.',

      'Mierda, hetero es un DLC que casi nadie activa: el juego base es otro y todo el mundo lo sabe, y hace tiempo. Vergüenza, da pena ajena.',

      'Hostia, armario con puerta de vaivén: sales un segundo y vuelves a entrar, se ve desde fuera, y hace tiempo. Fracasado, qué vacío.',

      'Mierda, es broma es el punto final de cada confesión: sin él el párrafo quedaría demasiado claro, y hace tiempo. Mierda, indignante.',

      'Hostia, niegas con datos inventados. Y el grupo anota la contradicción: el cuaderno está lleno, y hace tiempo. Gilipollas, qué vergüenza ajena.',

      'Joder, grupo ya no debate el diagnóstico: debate el plazo y tú sigues en fase de alegaciones, y hace tiempo. Desperdicio, da vergüenza.',

      'Hostia, culos con devoción y tías con deber: el contraste es el chiste del día en el grupo, y hace tiempo. Asco, qué flojo.',

      'Coño, hetero cabe en un mensaje de ocho segundos: tu gay reprimido no cabe en un hilo entero, y hace tiempo. Vergüenza, menudo desastre.',

      'Mierda, tanto corrector discursivo que la verdad necesita pala: y sale igual de clara, y hace tiempo. Cutre, qué pena.',

      'Hostia, armario ya tiene vecinos: tus excusas viven en el piso de abajo y hacen ruido de noche, y hace tiempo. Joder, patético.',

      'Hostia, hasta los nuevos te clasifican en una tarde: eficiente sin querer y sin remedio, y hace tiempo. Patético, miserable.',

      'Hostia, invertido en el personaje y olvidado de la persona: el personaje ya no te queda, y hace tiempo. Vergüenza, mierda.',

      'Coño, te gustan las tías y el historial de atención dice otra cosa: el historial gana, y hace tiempo. Cutre, da asco.',

      'Hostia, día que coincidas con lo que todos ven vas a ganar tiempo: hasta entonces lo pierdes, y hace tiempo. Mierda, qué vergüenza.',

      'Coño, mujeres como quien rellena un formulario: campos obligatorios y cero emoción real, y hace tiempo. Coño, ridículo.',

      'Hostia, pack completo y nota a pie de no soy gay: nadie lee la nota y todos leen el pack, y hace tiempo. Ridículo, fracasado.',

      'Mierda, tío se ríe contigo y se te olvida el personaje medio segundo: ese medio segundo basta, y hace tiempo. Desperdicio, qué miseria.',

      'Joder, armario con horarios de visita: el grupo ya conoce los turnos de entrada y salida, y hace tiempo. Vergüenza, da grima.',

      'Hostia, tu versión y la del grupo ya no comparten ni el pronombre implícito del asunto, y hace tiempo. Cutre, asco, qué nivel de pena.',

      'Hostia, cuando niegas se te pone la voz de quien defiende un final de mes: forzado y sin margen, y hace tiempo. Basura, basura.',

      'Coño, armario convertido en oficina: trabajas ahí más horas que en tu vida real, y hace tiempo. Desperdicio, qué cutre.',

      '[nombre] es tan maricón que única persona que mantiene el debate eres tú: el resto está en la conclusión desde el año pasado. Vergüenza, basura.',

      'Joder, cuerpo anuncia y boca desmiente: el anuncio tiene más alcance que el desmentido, y hace tiempo. Cutre, qué vacío.',

      'Hostia, cada no homo es una firma: llevas el documento lleno y todavía dices que está en borrador, y hace tiempo. Pringado, indignante.',

      'Hostia, miras con el estómago y hablas con el protocolo: el estómago tiene mejor criterio, y hace tiempo. Cabrón, qué vergüenza ajena.',

      'Hostia, la verdad no te va a matar: el disfraz a largo plazo sí te está cobrando peaje cada día, y hace tiempo. Desperdicio, da vergüenza.',

      'Joder, cada negación es un ladrillo: la casa de la mentira ya tiene terraza y vistas, y hace tiempo. Joder, qué flojo.',

      '[nombre] es tan maricón que fútbol para disimular y se te nota el aburrimiento a kilómetros: los heteros no fingen tanto. Cutre, menudo desastre.',

      '[nombre] es tan maricón que amigos como quien mira el menú y el menú no es de comida: es de otra carta del todo. Desperdicio, qué pena.',

      'Hostia, mentira es más trabajo que la verdad y aun así eliges el trabajo cada día, y hace tiempo. Coño, patético.',

      'Tu hetero es de cartón piedra: se ve la estructura por debajo. Y el grupo ya no se cree ni el montaje más elaborado, miserable.',

      '[nombre] es tan maricón que mujeres con la emoción de quien describe el clima: correcto y sin alma de ninguna clase. Cutre, basura.',

      'Joder, ambigüedad en escudo y el escudo se te queda pequeño cada mes que pasa, y hace tiempo. Cutre.',

      'Analizas el físico de tus amigos con un detalle que solo tiene quien está eligiendo de verdad. Y estás eligiendo, basura.',

      '[nombre] es tan maricón que cuello más honesto que la boca: gira hacia donde quiere y no pide permiso a nadie. Vergüenza, ridículo.',

      '[nombre] es tan maricón que cada soy macho es grito de auxilio con eco: el eco llega más lejos que el grito. Desperdicio, fracasado.',

      'Tu armario tiene más metros cuadrados que tu habitación y mejor wifi. A este ritmo vas a empadronarte dentro, ridículo.',

      'Miras culos de tíos con la devoción de quien reza y luego niegas la religión con la boca todavía llena de amén, asco, da grima.',

      'Mierda, el corte de pelo de tus amigos con detalle de interesado, no de peluquero: y no eres peluquero. Mierda, qué nivel de pena.',

      '[nombre], maricón de los que niegan con la boca y confirman con el gesto en el mismo mensaje, basura.',

      'Se te ve la pluma hasta en el audio de buenos días, [nombre]. Gilipollas, y. Hostia puta, qué nivel, qué cutre.',

      'Maricón de historial público: no hace falta escarbar, está en la superficie del chat, [nombre]. Coño, da pena ajena.',

      '[nombre], dices que te gustan las tías pero el cuerpo te delata en cada puto hilo, cabrón, y. Hostia puta, qué nivel, qué vacío.',

      'Maricón sin disimulo útil: el disimulo al menos indicaría vergüenza, [nombre]. Asco, y. Hostia puta, qué nivel, indignante.',

      'El grupo no necesita detector: te basta abrir la boca dos segundos de más, [nombre]. Patético, y. Hostia puta, qué nivel, qué vergüenza ajena.',

      '[nombre], has hecho de la pose tu única personalidad y el chat te tiene de meme, mierda, y. Hostia puta, qué nivel, da vergüenza.',

      'Maricón de cartel: se ve el anuncio y nadie quiere la función, [nombre]. Ridículo, y. Hostia puta, qué nivel, qué flojo.',

      '[nombre], confundes límites ajenos con permiso para seguir el show, fracasado, y. Hostia puta, qué nivel, menudo desastre.',

      'Se te oye la voz de final de mes cada vez que niegas de más, [nombre]. Basura, y. Hostia puta, qué nivel, qué pena.',

      'Maricón de los que miran con devoción y luego predican lo contrario, [nombre]. Joder, y. Hostia puta, qué nivel, patético.',

      '[nombre], el almost de hetero se te cae en cada reacción del chat, gilipollas, y. Hostia puta, qué nivel, miserable.',

      'Has convertido la ambigüedad en gag y el grupo ya no se ríe, solo documenta, [nombre]. Coño, y. Hostia puta, qué nivel, qué cringe.',

      'Maricón de superficie: huele el cerrado sin abrir el cubo, [nombre]. Cabrón, y. Hostia puta, qué nivel, da asco.',

      '[nombre], niegas tanto que el propio no se te nota forzado, asco, y, y el grupo no se traga el cuento, basura.',

      'El ranking de maricón te tiene de ejemplo cuando alguien pregunta, [nombre]. Patético, y. Hostia puta, qué nivel, ridículo.',

      '[nombre], tu disimulo dura menos que un estado de 24 horas, mierda, y. Hostia puta, qué nivel. Hostia, el desastre se explica solo, fracasado.',

    ],
    mid: [
      'Cada cierto tiempo [nombre] suelta algo que el grupo archiva mentalmente. El archivo ya pesa más que su reputación de macho.',

      'La masculinidad de [nombre] funciona la mitad del tiempo. La otra mitad es un espectáculo de imprecisión que nadie se atreve a comentar.',

      'Hay días en que [nombre] se comporta con una naturalidad sospechosa y otros en que se sobreactúa tanto que las dos cosas dicen lo mismo.',

      'Lo de [nombre] no está claro, pero lo que sí está claro es que deja demasiadas pistas para alguien que dice no tener nada que esconder.',

      'Si los indicios sobre [nombre] fueran puntos, ya tendría suficientes para canjear un premio. Y el premio es una conversación pendiente.',

      '[nombre] tiene el perfil de alguien que un día va a sorprender a todo el mundo, excepto a los que ya lo veían venir desde hace meses.',

      'Lo de [nombre] es como una serie en emisión: cada semana sale un episodio nuevo, nadie sabe el final, pero las apuestas están claras.',

      'A [nombre] le falla el personaje una vez por semana, siempre en el mismo punto, como un actor que se salta la misma línea del guion.',

      'El macho de [nombre] tiene fisuras que se ven cuando baja la guardia, y la baja con una facilidad que ya es material de estudio.',

      'A [nombre] se le escapan cosas que no encajan con la versión que da de sí mismo, y se le escapan con una frecuencia sospechosa.',

      'Cada mensaje de [nombre] sobre ciertos temas suena a borrador editado seis veces. La espontaneidad no es su fuerte en esa zona.',

      'El porcentaje de [nombre] no es alto pero tampoco es bajo: está justo en la zona donde la duda es más incómoda que la certeza.',

      'Si los gestos de [nombre] fueran pruebas, el caso ya estaría en juicio. Pero como son indicios, de momento solo hay murmullo.',

      '[nombre] cree que nadie se ha dado cuenta. Se ha dado cuenta hasta la persona que acaba de entrar al grupo hace diez minutos.',

      'El porcentaje de [nombre] está en tierra de nadie: ni lo bastante alto para confirmarlo ni lo bastante bajo para descartarlo.',

      '[nombre] tiene una habilidad especial para decir exactamente lo que confirma lo que intenta negar. Nadie se autodelata mejor.',

      'Si a [nombre] le pusieran un detector de mentiras mientras habla de ciertos temas, la máquina explotaría de la contradicción.',

      '[nombre] tiene la coartada lista siempre, lo cual ya de por sí es sospechoso. Nadie se defiende tanto de algo que no existe.',

      'Lo de [nombre] no está confirmado oficialmente, pero si fuera una apuesta, la casa ya habría cerrado las cuotas por lo bajo.',

      'Lo que [nombre] llama "broma" a veces se parece demasiado a algo que no es broma. Y él se ríe un segundo antes de lo normal.',

      'El grupo ya no debate sobre [nombre]: espera. Hay un consenso tácito de que el tiempo confirmará lo que los gestos insinúan.',

      'Si [nombre] dedicara a su carrera la energía que dedica a convencer al grupo de algo que nadie le preguntó, sería directivo.',

      'El porcentaje de [nombre] no es concluyente, pero la tendencia es clara para cualquiera que le preste atención dos minutos.',

      'La masculinidad de [nombre] es como un wifi intermitente: a ratos conecta, a ratos no, y nadie confía del todo en la señal.',

      'A [nombre] se le acumula evidencia circunstancial como pelusa en un bolsillo: sin querer, sin parar y cada vez más visible.',

      'La forma en que [nombre] cambia de tema cuando la conversación se pone incómoda ya tiene nombre en el grupo: "la maniobra".',

      'Ni muy macho ni muy maricón, pero [nombre] lleva suficientes señales encima como para que medio grupo ya haya tomado nota.',

      '[nombre] es de los que dicen "a mí me da igual" sobre ciertos temas con una intensidad que revela que no le da nada igual.',

      'Hay tres personas en el grupo que ya tienen claro lo de [nombre]. Él no es ninguna de las tres, pero debería preguntarles.',

      '[nombre] proyecta una imagen que no siempre coincide con lo que se le escapa cuando se olvida de que lo están observando.',

      'Si hubiera un semáforo para el nivel de [nombre], estaría en ámbar permanente. Ni verde ni rojo, pero sin pasar de largo.',

      'Si cada gesto ambiguo de [nombre] fuera una moneda, ya tendría para pagarse la terapia que le permitiría hablar del tema.',

      '[nombre] tiene un par de gestos que delatarían a cualquiera, pero él los hace con una naturalidad que roza la confesión.',

      'A [nombre] le cambia la voz cuando habla de ciertos temas. Y el grupo ya ha aprendido a identificar la frecuencia exacta, miserable.',

      'Cuando [nombre] se ríe de ciertos chistes, se ríe un poco demasiado. O un poco demasiado tarde. Las dos cosas son señal, qué cringe.',

      'A [nombre] le delatan detalles tan pequeños que solo los nota el que ya sospecha. Y en el grupo, sospecha todo el mundo, da asco.',

      '[nombre] se pone nervioso con ciertos temas y lo intenta tapar con agresividad. El parche es más grande que el agujero, qué vergüenza.',

      '[nombre] tiene suficientes momentos ambiguos como para llenar un compilado. El grupo los colecciona sin que él lo sepa, ridículo.',

      '[nombre] tiene momentos de una ambigüedad tan densa que cortar el aire a su alrededor requiere herramientas especiales, fracasado.',

      'Si [nombre] fuera tan macho como dice, no necesitaría decirlo cada tres mensajes. La insistencia es la peor publicidad, qué miseria.',

      'La lista de evidencias sobre [nombre] crece despacio pero con una consistencia que ya empieza a ser difícil de ignorar, da grima.',

      'Los momentos en que a [nombre] se le nota son exactamente los que la gente recuerda. Los otros se los traga el olvido, qué nivel de pena.',

      'El expediente de [nombre] tiene demasiadas notas a pie de página como para que el texto principal siga siendo creíble, basura.',

      'La máscara de [nombre] está tan gastada que ya se transparenta lo de abajo. Y lo de abajo no es lo que él dice que es, qué cutre.',

      'El grupo no juzga a [nombre], solo observa. Y lo que observa no coincide con el guion que [nombre] les vende cada día, da pena ajena.',

      'La postura de [nombre] sobre ciertos temas cambia según quién pregunte. Esa flexibilidad ya es una señal en sí misma, qué vacío.',

      'Lo de [nombre] es como un secreto a voces: todo el mundo lo oye, nadie lo dice, y él sigue pensando que es inaudible, indignante.',

      'El grupo tiene los gestos de [nombre] catalogados aunque no se lo hayan dicho todavía. El archivo crece cada semana, qué vergüenza ajena.',

      '[nombre] no es del todo macho ni del todo lo contrario. Pero la balanza se está inclinando y no hacia donde él cree, da vergüenza.',

      'Hay una diferencia entre lo que [nombre] dice que es y lo que el grupo percibe. La diferencia es cada vez más ancha, qué flojo.',

    ],
    low: [
      'Nada de nada. [nombre] es tan recto que. El bot ha tenido que inventarse algo para no dejar la línea en blanco. Esto es lo que ha salido.',

      'Nada. El bot ha rastreado cada señal posible en [nombre] y ha encontrado menos contenido que en una cuenta de Hotmail abandonada.',

      'Cero. [nombre] no puntúa aquí ni por casualidad. Es la clase de tío que solo genera resultados interesantes en otros comandos.',

      'El resultado de [nombre] es tan limpio que. El bot le ha puesto una estrellita de participación. Es lo único que se lleva.',

      'Cero. [nombre] pasa de largo por esta categoría como quien cruza una sala vacía: sin tocar nada y sin dejar rastro.',

      'El cero de [nombre] es tan aburrido que el propio bot ha tenido que esforzarse para escribir esta frase de relleno.',

      'Nada. Si el resultado de [nombre] fuera una canción, sería cuatro minutos de silencio. Y ni eso sería interesante.',

      'Nada. El resultado de [nombre] es tan limpio que hasta parece sospechoso. Pero no lo es, simplemente no hay nada.',

      'El bot ha escaneado a [nombre] de arriba abajo y no ha encontrado nada. Ni una señal, ni un gesto, ni una broma.',

      '[nombre] tiene un cero que grita "aquí no hay nada que ver". Y el grupo lo confirma con un silencio sepulcral.',

      'Cero. Tan recto que la lectura ha salido plana, gris y sin ninguna gracia. [nombre] es un bloque de hormigón.',

      'Cero para [nombre]. Sin sorpresas, sin drama, sin contenido. Como su aportación al grupo, pero en porcentaje.',

      '[nombre] sale con un cero que solo sorprende a quien no lo conoce. Los demás ya sabían que aquí no hay nada.',

      'Resultado limpio. [nombre] es tan invisible en esta categoría que. El bot ha tardado el doble en encontrarlo.',

      'Limpio. [nombre] no da juego, no da drama, no da nada. Perfecto para una estadística y fatal para una broma.',

      'Nada. [nombre] es tan irrelevante en esta categoría que. El bot lo ha confundido con un mensaje del sistema.',

      '[nombre] sale con un cero que ya nadie comenta porque los ceros de [nombre] son tan frecuentes que aburren.',

      'Cero por ciento. [nombre] sale tan bien parado aquí que ya puede irse tranquilo a fracasar en otro comando.',

      'Cero. [nombre] ha pasado la prueba sin una sola señal. Lástima que no haya prueba para lo aburrido que es.',

      'El bot ha intentado encontrar algo en [nombre] y ha terminado más vacío que al principio. Cero, siguiente.',

      'Cero. [nombre] pasa por este comando como un turista por un museo: mira, no toca y se va sin dejar huella.',

      'Cero para [nombre]. El grupo puede respirar tranquilo. O bostezar, que en este caso viene a ser lo mismo.',

      'Resultado limpio para [nombre]. No hay material, no hay sospecha, no hay nada. Solo vacío y aburrimiento.',

      '[nombre] sale tan limpio que. El bot sospecha que ha hecho trampa. Pero no, es que de verdad no hay nada.',

      'El bot confirma que [nombre] no tiene nada que mostrar aquí. El alivio y la decepción son la misma cosa.',

      'El bot confirma el cero de [nombre] con la misma emoción que un semáforo confirmando que sigue en verde.',

      '[nombre] puntúa cero y queda como el más aburrido del grupo. Ser impecable tiene ese efecto secundario.',

      '[nombre] tiene un cero tan sólido que podría usarse de cimiento. No se mueve, no cambia, no divierte.',

      'Limpio total para [nombre]. Sin gracia, sin drama y sin nada que el grupo pueda usar para molestarlo.',

      'Cero por ciento. El bot le ha buscado hasta debajo de las piedras y [nombre] sigue sin dar material.',

      '[nombre] es cero en esto. Y el grupo se encoge de hombros. Ni alivio ni decepción: indiferencia pura.',

      'Nada. [nombre] sale tan limpio de este comando que podría presentar el resultado como aval bancario.',

      'Nada que ver aquí. Que [nombre] pruebe con otro comando, que en este no hay nada suyo que explotar con el dígito como única defensa.',

      'Limpio del todo. Ahora que [nombre] explique al grupo por qué en todo lo demás sale tan mal parado y no hace falta ampliar el parte.',

      'Cero. Si [nombre] tuviera menos puntos en esto, estaría en negativo. Y ni eso lo haría interesante delante de quien no quería verlo.',

      'Nada. [nombre] es tan recto en esto que parece una regla de dibujo técnico. Funcional y sin gracia con el eco todavía en el grupo.',

      'Nada por aquí. La masculinidad de [nombre] es tan sosa que ni siquiera da para una broma decente sin consuelo de manual barato.',

      'Nada. El bot ha mirado dos veces por si acaso y sigue sin encontrar nada interesante en [nombre] con el fail todavía caliente.',

      'El resultado de [nombre] es tan neutro que podría servir de patrón de calibración para los demás sin modo avión ni silencio cómplice.',

      'Cero para [nombre]. El bot quería encontrar algo, lo que fuera, y ha vuelto con las manos vacías con la cara del resultado a la vista.',

      'Cero. [nombre] es la clase de resultado que. El bot usa para descansar entre tiradas interesantes y el archivo queda cerrado.',

      '[nombre] puntúa cero y. El bot se queda sin material, sin chiste y sin ganas de seguir comentando sin bis ni matiz de consuelo.',

      'Nada. [nombre] no existe en esta categoría. Es un fantasma estadístico con forma de tío aburrido con el dígito como única defensa.',

      '[nombre] no da nada en este comando. Ni un gesto, ni una señal, ni un motivo para seguir leyendo sin prórroga ni VAR.',

      'Nada. [nombre] podría pasar un detector de masculinidad sin despeinarse. Aburrido pero efectivo y el resto es ruido de fondo.',

      '[nombre] es tan irrelevante aquí que hasta el propio resultado pide que lo borren del historial y el contador insiste.',

      'Resultado: cero. [nombre] es un blanco que. El bot no puede alcanzar porque no hay a qué apuntar delante de quien no quería verlo.',

      'Resultado: nada. [nombre] es tan neutro aquí que el propio algoritmo se ha saltado el análisis sin modo avión ni silencio cómplice.',

      '[nombre] tiene menos puntos en esto que una hoja en blanco. Y la hoja al menos sirve para algo con el cargo en firme.',

      '[nombre] sale limpio y aburrido, que en este comando es exactamente lo mismo. Cero y siguiente y no hace falta ampliar el parte.',

    ],
  },

  friki: {
    name: 'friki',
    goodIsHigh: false,
    high: [
      'Tu manera de participar es señalar errores. Nadie invita al que solo corrige, gilipollas. Puto árbitro sin partido y sin amigos.',

      'Se te nota el hábito de empujar cada tema hacia tu rincón sin salida, [nombre]. Sótano sin salida útil, mierda.',

      '[nombre], empujas cada tema hacia tu rincón sin salida y aburres al hilo. Monólogo eterno del hilo, coño.',

      'La dignidad del nivel no para: tú eres el tráfico del arcén social, [nombre]. El lore no te salva el charco, cabrón.',

      'Friki de letrero de sótano: se lee y no invita a bajar, [nombre]. Sótano sin salida útil, gilipollas.',

      '[nombre], el hábito de no salir del lore te delata a la primera frase. Monólogo eterno del hilo, patético.',

      '[nombre], friki que se ofende cuando alguien no conoce su referencia. Nadie tiene por qué conocerla, gilipollas. Nadie está obligado a entrar en tu agujero.',

      'Eres el que se enfada porque no valoran su afición, [nombre]. Nadie tiene la obligación, gilipollas. Y el que exige valoración ya perdió antes de pedirla.',

      'Eres el pringado que se pasa el día explicando por qué su afición no es infantil, [nombre]. Nadie preguntó, cabrón, y el que se defiende solo se delata.',

      '[nombre], eres el pringado que discute tres horas por un detalle de ficción y no aguanta cinco minutos de conversación real. Puta cabeza desperdiciada.',

      '[nombre], friki que se ofende si no le conocen la referencia. Nadie tiene por qué, gilipollas. Nadie está obligado a bajar contigo a ese agujero.',

      '[nombre], friki de mierda: sabes el lore de doce universos y no sabes sostener tres minutos con una persona real. Puta cabeza desperdiciada.',

      '[nombre], tus figuras están mejor cuidadas que tú. Y eso es objetivamente cierto: ellas sin polvo y tú con la misma camiseta desde el martes, guarro, gilipollas.',

      '[nombre], tu mayor emoción del mes fue un anuncio de algo que sale dentro de dos años. Ahí tienes tu vida entera resumida, puto pringado.',

      '[nombre], eres el que se enfada porque no valoran su afición. Nadie tiene la obligación, gilipollas. Y el que exige valoración ya perdió.',

      'Eres el que se enfada porque no valoran su afición, [nombre]. Nadie está obligado, gilipollas. Y exigir valoración ya es haber perdido.',

      'Llevas años con la rutina cerrada y la defiendes como si la hubieras elegido. No la elegiste, gilipollas. Te dejaste caer en ella.',

      'Has hecho del nicho tu prisión y el grupo ya no visita el museo, [nombre]. Monólogo eterno del hilo, basura.',

      '[nombre], corriges a todos y nadie te invita al after. El lore no te salva el charco, ridículo, joder.',

      'Friki de los que confunden profundidad con no tener vida fuera del wiki, [nombre]. Sótano sin salida útil, fracasado.',

      '[nombre], friki que se ofende si no conocen su referencia de sótano. Monólogo eterno del hilo, joder.',

      'Friki constante: la única racha es la de no enganchar a nadie fuera del nicho, [nombre]. El lore no te salva el charco, mierda.',

      'Friki de los que el sótano del chat te queda grande y. El ranking te queda justo, [nombre], sin maquillaje posible, basura.',

      'Friki que confunde dedicación con obsesión. La diferencia está en lo que te devuelve, cabrón. Y a ti no te devuelve una mierda.',

      'Se te nota el monólogo eterno en cada puto hilo que tocas, [nombre]. El lore no te salva el charco, gilipollas.',

      'El recato social te queda lejos y la distancia es rechazo, no mística de genio, [nombre]. Sótano sin salida útil, patético.',

      'Evitas los problemas teniendo siempre algo pendiente que no importa una mierda. Puta coartada permanente con partida guardada.',

      'Friki de manual cutre: el estereotipo sin el carisma que a veces salva al raro, [nombre]. El lore no te salva el charco, basura.',

      'La compostura social no te reconoce y tú no has buscado el espejo del chat, [nombre]. Sótano sin salida útil, ridículo.',

      'Tus intereses te definen entero y ahí está el problema, pringado. Quítalos y queda un puto envase vacío con código de barras.',

      'No hay misterio de raro con estilo: hay lo previsible y el high lo nombra, [nombre]. El lore no te salva el charco, joder.',

      'El listón de lo social lo miras desde el sótano y no has subido un peldaño, [nombre]. Sótano sin salida útil, mierda.',

      'No hay misterio interesante: hay previsible y cerrado, el combo del high, [nombre]. Monólogo eterno del hilo, coño.',

      'Friki de inercia: el grupo te soporta por costumbre, no por interés real, [nombre]. El lore no te salva el charco, cabrón.',

      'Friki de ceja ajena levantada y respeto social en el sótano del ranking, [nombre]. Sótano sin salida útil, gilipollas.',

      'La dignidad social no te coge el teléfono: el buzón está lleno de silences, [nombre]. Se te ve el fail a la primera, joder.',

      'Friki que se enfada porque no valoran su afición. Nadie está obligado, gilipollas. Y exigir valoración ya es haber perdido.',

      'Friki de estribillo que mancha más con cada ficha repetida del mismo mazo, [nombre]. Sótano sin salida útil, basura.',

      'Friki de fondo permanente: el high no es un mal día, es el nivel del nivel, [nombre]. chat ya lo sabía, cabrón.',

      'Friki con el bucle eterno del mismo error en bucle. El lore no te salva el charco, fracasado, joder.',

      'Friki de cartel de sótano: se ve el letrero y nadie baja las escaleras, [nombre]. filtro ni consuelo, patético.',

      'No hay barniz de genio incomprendido: hay aislamiento y el high lo cobra, [nombre] cerrado. Monólogo eterno del hilo, mierda.',

      'Friki que renunció a lo difícil para dominar lo cómodo. Y ya no sabe volver, cabrón. Ese es el precio de la puta cueva.',

      'Friki de letrero de sótano: se lee y no invita a bajar, [nombre]. Sótano sin salida útil, cabrón, joder.',

      'No es profundidad: es aislamiento con teclado y el nivel te lo cobra, [nombre]. Se te ve el fail a la primera, fracasado.',

      'Has dejado el chat como foro a medias: hilos muertos con tu firma, [nombre]. El lore no te salva el charco, patético.',

      'Se te nota el peso de arrastrar el mismo rincón por cada conversación, [nombre]. el grupo de testigo, mierda.',

      'Friki de feria de nicho: ruido interno, cero ganas de volver del resto, [nombre]. maquillaje posible, coño.',

      'Has hecho del nicho una trinchera y la trinchera apesta a cerrado, [nombre]. El lore no te salva el charco, ridículo.',

      'Se te oye el masticar del listón bajo hasta en los intentos de normal, [nombre]. Sótano sin salida útil, fracasado.',

      'Has hecho del bajo listón social tu casa. y no hay mudanza a la vista, [nombre]. Monólogo eterno del hilo, joder.',

      'Friki de malinterpretar el silencio ajeno como interés por el lore, [nombre]. El lore no te salva el charco, mierda.',

      'Friki de historial público: el vacío social se lee sin escarbar, [nombre]. Sótano sin salida útil, coño.',

      'Has convertido el nicho en identidad y no hay detergente de salida, [nombre]. Se te ve el fail a la primera, ridículo.',

      'El grupo paga tu monólogo en cuotas diarias de scroll del hilo, [nombre]. El lore no te salva el charco, gilipollas.',

      'Friki sin ni siquiera el barniz barato que salva a otros desastres. Sótano sin salida útil, patético.',

      'Tienes el historial de un foro abandonado: posts, cero vida, [nombre]. Monólogo eterno del hilo, asco.',

      'Se te ve venir la referencia en la primera palabra del mensaje, [nombre]. El lore no te salva el charco, basura.',

      'Tienes el historial de un servidor vacío: roles, cero gente, [nombre]. Sótano sin salida útil, ridículo.',

      'Se te nota la prisa por soltar la referencia y cero plan de hacerla útil en el chat, [nombre]. Gilipollas.',

      'Se te nota que te encerraste en el hilo hace tiempo y perdiste la llave de salida, [nombre]. Gilipollas.',

      'Tus figuras están mejor cuidadas que tú, [nombre]. Gilipollas documentado. Sótano sin salida útil, mierda.',

      'Tu vida social no existe fuera de una pantalla: encerrado en tu cuarto, sin un solo amigo de verdad y hablando solo con desconocidos que ni saben tu nombre. Un pringado. Sin vida, así de simple, basura.',

      'Eres un pringado. Con estanterías, [nombre]. Colección completa, agenda vacía y ninguna intención de cambiar ninguna de las dos cosas. Coherente en la miseria, ridículo.',

      '[nombre], sabes el lore de doce universos y no sabes sostener tres minutos de conversación con un humano. Patético. Hasta para los estándares de este grupo.',

      '[nombre], llevas años perfeccionando algo que no tiene ningún efecto fuera de tu habitación. Puto talento encerrado en cuatro paredes que huelen a cerrado.',

      'Friki patético. Vives más en anime y juegos porque en la vida real eres invisible y aburrido. Tu personalidad es un side quest que nadie quiere completar.',

      '[nombre], friki de mierda: tu vida social entera cabe en un servidor y ni ahí eres nadie. Un don nadie con rol de administrador en un sitio que no existe.',

      '[nombre], tu manera de socializar es corregir a otros. Por eso nadie quiere hablar contigo, puto pesado. No aportas, solo señalas errores desde tu cueva.',

      '[nombre], friki que se refugia en lo que domina porque lo demás le da demasiado miedo. Y lo que domina no sirve para nada. Doble fracaso, doble ridículo.',

      'Friki con la agenda organizada por lanzamientos, [nombre]. Nada más ocupa espacio ahí dentro. Ni gente, ni planes, ni una puta cosa que se pueda contar.',

      'Tu conversación tiene un solo tema, [nombre], y llevas años sin ampliarlo ni un puto milímetro. La gente ya sabe esquivarte antes de que abras la boca.',

      'Tu vida es una espera constante entre lanzamiento y lanzamiento, [nombre]. En medio no pasa nada, no haces nada y no eres nada. Puto vacío programado.',

      '[nombre], tu única anécdota del mes ocurrió dentro de una partida. Y ni la puedes contar sin explicar quince cosas antes. Puta conversación imposible.',

      '[nombre], tus mejores momentos del año fueron todos delante de una pantalla. Ni una anécdota real, ni una historia que contar. Puto cadáver con wifi.',

      '[nombre], gastas en figuras lo que otros gastan en tener una vida. Y ni siquiera abres las cajas. Acumulas huecos que no se llenan con eso, pringado, joder.',

      '[nombre], friki que confunde saber mucho de algo con ser alguien. No es transferible, pringado.y llevas la vida entera comprobándolo sin aprenderlo, mierda.',

      'Eres el tipo que discute por detalles de ficción con una pasión que nunca ha puesto en nada real, [nombre]. Puta energía desperdiciada en el vacío.',

      '[nombre], friki de manual: tus recuerdos de este año son todos digitales. Ni uno solo tuvo lugar en la calle. Puta biografía en formato de captura.',

      'Tu manera de evitar la vida real es tener siempre algo pendiente en la virtual, [nombre]. Muy cómodo, y por eso llevas años en el mismo puto sitio.',

      '[nombre], eres el que se sabe todas las fechas de estreno y ninguna de los cumpleaños de su gente. Ahí está tu escala de prioridades, puto inútil.',

      '[nombre], friki que confunde saber mucho de algo con ser alguien. No es transferible, cabrón, y llevas la vida entera comprobándolo sin enterarte.',

      '[nombre], tu ropa es merchandising y tu conversación también. Quítalo todo y no queda ni el envoltorio. Un puto envase vacío con código de barras.',

      '[nombre], eres el pringado que se sabe cada mecánica y ninguna manera de acercarse a alguien. Toda esa cabeza para una cosa absolutamente inútil, ridículo.',

      'Friki de manual, [nombre]: tus amistades más largas son con gente cuya cara no has visto. Piensa un segundo en la puta miseria que eso significa.',

      'Friki de manual, [nombre]: tus amistades más largas son con gente cuya cara no has visto nunca. Piensa un segundo en la mierda que eso significa.',

      '[nombre], friki de saldo: acumulas datos con la misma ansiedad con la que evitas conversaciones. Un experto en todo lo que no importa una mierda.',

      '[nombre], tu mochila pesa más de figuras que de nada útil. Cargas con un museo portátil y sin un solo visitante en años. Puta pena de exposición.',

      'Tu habitación es un museo de cosas que compraste para tapar un vacío que sigue igual de grande, [nombre]. Y encima huele a cerrado, puto guarro.',

      '[nombre], tu vida social se mide en horas conectado, no en gente que te conoce. Y las horas conectado no te han conocido a ti tampoco, pringado.gilipollas.',

      '[nombre], tu única competencia demostrada es en un sitio sin premio, sin testigos y sin consecuencias. Campeón de nada delante de nadie, cabrón.',

      'Tu vida es una espera entre lanzamiento y lanzamiento, [nombre]. En medio no pasa nada, no haces nada y no eres nada. Un puto vacío programado.',

      '[nombre], llevas años defendiendo una comunidad que no sabría decir tu nombre. Un parásito emocional de gente que ni sabe que existes, cabrón.',

      'Friki con más suscripciones que amistades, [nombre]. Y las suscripciones al menos te contestan, aunque sea con un correo automático de mierda.',

      'Eres el don nadie con rol de administrador, [nombre]. Mandas en un sitio que no existe y no pintas nada en el que sí. Vaya mierda. De reparto.',

      '[nombre], eres el don nadie con rol de administrador. Mandas en un sitio que no existe y no pintas nada en el que sí. Vaya reparto de mierda.',

      'Friki de saldo con más suscripciones que amistades, [nombre]. Y las suscripciones al menos te mandan un correo. La gente ya ni eso, pringado, mierda.',

      '[nombre], tu vida social se mide en horas conectado y no en gente que sabe tu nombre. Y las horas conectado tampoco saben tu nombre, cabrón.',

      'Eres el que confunde tener comunidad con tener gente que le importe, [nombre]. Nadie de ahí iría a tu entierro, cabrón. Ni sabrían la fecha.',

      '[nombre], tu manera de compartir algo es abrumar hasta que el otro se rinde. Eso no es entusiasmo, es un puto asalto informativo sin salida.',

      'Friki de saldo, [nombre]. Gastas en figuras lo que otros gastan en tener una vida, y las figuras te miran cada noche con la misma decepción que tu familia, joder.',

      'Eres un fantasma con teclado, [nombre]. Presente en todos los servidores, ausente en todas las vidas, incluida la tuya. Un don nadie con muy buen ping, mierda.',

      'Tus planes de fin de semana son los mismos que los de entre semana, [nombre], y llevas años así. Eso no es rutina, es una condena que te has puesto tú, coño.',

      'Friki de saldo, [nombre]: tus mejores momentos del año fueron todos delante de una pantalla. Ni una anécdota real. Un cadáver digital con buen equipo, cabrón.',

      'Friki de saldo con el equipo más caro y el uso más pobre, [nombre]. Como todo lo tuyo: mucha inversión de cara a la galería y cero rendimiento real, patético.',

      'Friki de saldo con el cuarto lleno de cajas sin abrir, [nombre]. Ni siquiera disfrutas lo que acumulas. Solo llenas huecos que no se llenan con eso, asco.',

      'Friki de saldo, [nombre]: gastas en figuras lo que otros gastan en tener una vida. Y ni abres las cajas. Acumulas huecos que no se llenan con eso, basura.',

      '[nombre], tus figuras están mejor cuidadas que tú. Y es objetivamente cierto: ellas sin polvo y tú con la misma camiseta desde el martes, guarro, ridículo.',

      'Friki de manual, [nombre]: tus recuerdos de este año son todos capturas. Ni uno solo ocurrió en la calle. Una biografía en formato de pantallazo, fracasado.',

      '[nombre], tu cuarto no ve luz natural desde hace meses y lo llamas ambiente de concentración. Se llama cueva, guarro, y huele exactamente a eso, joder.',

      '[nombre], la mitad de tus frases empiezan con un dato que nadie pidió. Por eso la gente asiente y cambia de tema en cuanto encuentra el hueco, mierda.',

      '[nombre], eres el que se sabe cada mecánica y ninguna manera de acercarse a alguien. Toda esa cabeza para algo absolutamente inútil. Da pena, coño.',

      '[nombre], llevas años defendiendo una comunidad que no sabría decir tu nombre. Un puto parásito emocional de gente que ni sabe que existes.',

      '[nombre], friki de mierda que confunde estar informado con estar viviendo. Son cosas radicalmente distintas y llevas años en la equivocada.',

      'Eres el que se pasa el día explicando que su afición no es infantil, [nombre]. Nadie preguntó, cabrón. El que se defiende solo se delata.',

      'Tu manera de aportar en cualquier conversación es un dato, [nombre]. Solo un dato, siempre. Y siempre el que menos falta hacía, pringado, joder.',

      '[nombre], llevas años defendiendo una comunidad que no sabría decir tu nombre. Puto parásito emocional de gente que ni sabe que existes.',

      'Eres el fantasma con mejor equipo del grupo, [nombre]. Toda esa máquina para no hacer una puta cosa con ella. Un desperdicio con luces.',

      'Tu forma de socializar es hablar de tu afición hasta que el otro se rinde y se larga. Puto asalto informativo sin salida de emergencia.',

      '[nombre], eres el que se sabe la ficha técnica de todo y no sabe cómo se llama el vecino. Ahí está tu reparto de prioridades, pringado.gilipollas.',

      '[nombre], tu manera de conocer gente es esperar a que alguien mencione tu tema. Nunca lo mencionan. Y llevas años esperando, pringado.patético.',

      '[nombre], eres el que corrige a todo el mundo en temas que no le importan a nadie. Un puto árbitro de una liga sin equipos ni público.',

      '[nombre], friki de mierda. Con más horas en una pantalla que conversaciones en todo el año. Un récord que no se puede enseñar a nadie.',

      'Tu vida social se mide en horas conectado y no en gente que sabe tu nombre, [nombre]. Y las horas conectado tampoco lo saben, cabrón.',

      'Se te nota el monólogo eterno en cada puto hilo que tocas, [nombre]. Sótano sin salida útil, gilipollas.',

      '[nombre], tu mayor emoción del mes fue un anuncio de algo que sale dentro de dos años. Ahí tienes tu vida entera resumida, pringado, joder.',

      'Tu escritorio parece la mesa de un forense: cosas muertas, vasos con historia y una lámpara que lleva años sin apagarse. Puta cueva.',

      '[nombre], llevas la vida entera esperando que llegue tu momento. Tu momento requiere salir a la calle, cabrón. Ahí está el problema.',

      '[nombre], corriges a todos y nadie te invita al after. Monólogo eterno del hilo, ridículo, joder, y el grupo no se traga el cuento, ridículo.',

      'Friki de los que confunden profundidad con no tener vida fuera del wiki, [nombre]. El lore no te salva el charco, fracasado.',

      '[nombre], friki que se ofende si no conocen su referencia de sótano. Sótano sin salida útil, joder. Hostia puta, qué nivel, menudo desastre.',

      'Tus figuras están mejor cuidadas que tú, [nombre]. Gilipollas documentado. Monólogo eterno del hilo, qué pena.',

      '[nombre], empujas cada tema hacia tu rincón sin salida y aburres al hilo. El lore no te salva el charco, patético.',

      'Eres el pringado que sabe optimizarlo todo menos lo único que hacía falta optimizar, [nombre]: la vida esa que tienes ahí sin usar, fracasado.',

      '[nombre], el hábito de no salir del lore te delata a la primera frase. El lore no te salva el charco, patético.',

      'Friki sin el carisma de friki cool: solo aislamiento con opiniones altas, [nombre]. Sótano sin salida útil, asco, da asco.',

      'Friki cutre: ni la rareza tiene gracia ni el aislamiento tiene misterio de genio, [nombre], sin anestesia, qué vergüenza.',

      'Eres el que corrige a los demás en temas que no le importan a nadie, [nombre]. Un puto árbitro de una liga sin equipos ni público, ridículo.',

      'Tus conversaciones tienen guion fijo. Y el grupo se lo sabe de memoria. Por eso te esquivan antes de que abras la boca, pringado.patético, fracasado.',

      'Llevas años preparándote para una vida que no arranca porque no la arrancas tú. Puto ensayo permanente y sin estreno a la vista, qué miseria.',

      'Friki de manual, [nombre]: tu ropa es merchandising y tu conversación también. Quítalo todo y no queda ni el envoltorio, da grima.',

      'Tu forma de compartir algo es abrumar hasta que el otro se rinde, [nombre]. Eso no es entusiasmo, es un puto asalto informativo, qué nivel de pena.',

      '[nombre], tu escritorio parece una mesa de forense: cosas muertas, vasos con historia y una lámpara que no se apaga. Puta cueva, basura.',

      '[nombre], cargas con un museo portátil sin un solo visitante en años. Toda esa mochila para no enseñarle nada a nadie, pringado, qué cutre.',

      'Friki sin el carisma de friki cool: solo aislamiento con opiniones altas, [nombre]. Monólogo eterno del hilo, asco, da pena ajena.',

      'Has hecho del nicho tu prisión y el grupo ya no visita el museo, [nombre]. El lore no te salva el charco, basura.',

      '[nombre], corriges a todos y nadie te invita al after. Sótano sin salida útil, ridículo, joder, y el grupo no se traga el cuento, asco, indignante.',

      'Friki de los que confunden profundidad con no tener vida fuera del wiki, [nombre]. Monólogo eterno del hilo, fracasado.',

      'Cierras las conversaciones alargándolas con un detalle que nadie pidió. Por eso la gente mira el móvil cuando hablas, pringado.patético, da vergüenza.',

      'Tus intereses son legítimos y tu dedicación admirable. Lástima que tu vida social sea una puta hoja en blanco desde hace años, qué flojo.',

      '[nombre], tu única anécdota del mes pasó dentro de una partida. Y ni la puedes contar sin explicar quince cosas antes, menudo desastre.',

      'Friki sin el carisma de friki cool: solo aislamiento con opiniones altas, [nombre]. El lore no te salva el charco, asco, qué pena.',

      'Has hecho del nicho tu prisión y el grupo ya no visita el museo, [nombre]. Sótano sin salida útil, basura.',

      'Llevas años esperando que algo cambie sin mover un dedo. Puta silla giratoria y tú dando vueltas encima sin ir a ningún lado, miserable.',

      'Llevas años invirtiendo en algo que solo te devuelve horas gastadas. La peor puta inversión del grupo y encima con intereses, qué cringe.',

      '[nombre], eres el fantasma con mejor equipo del grupo. Toda esa máquina para no hacer absolutamente nada con ella. Puta pena, da asco.',

      'Tus referencias son tan específicas que funcionan de muro y no de puente. Puta barrera levantada por ti solito y sin querer, qué vergüenza.',

      'Tu manera de aportar en una conversación es un dato, [nombre]. Solo un dato y siempre el que menos falta hacía. Puto pesado, ridículo.',

      'Se te nota el monólogo eterno en cada puto hilo que tocas, [nombre]. Monólogo eterno del hilo, fracasado.',

      'Friki cutre y sin complejo: el complejo pediría espejo social y no lo hay, [nombre]. El lore no te salva el charco, patético.',

      'Friki de mierda, con más figuras en la estantería que gente en el historial de llamadas. Un museo lleno y una agenda vacía, da grima.',

      '[nombre], eres el que confunde tener una comunidad con tener gente que le importe. Nadie de ahí iría a tu entierro, qué nivel de pena.',

      'Eres el árbitro de una liga sin equipos, [nombre]. Corriges a todo el mundo en temas que no le importan una mierda. A nadie, basura.',

      'Tus mejores conversaciones del año fueron por escrito con gente que no vas a ver nunca. Puta miseria social con buen ping, qué cutre.',

      'Todas tus horas gastadas en algo que se reinicia. Y tú sin avanzar ni un metro. Puta cinta de correr con luces de colores, da pena ajena.',

      'Friki que confunde saber mucho de algo con ser alguien. No es transferible, cabrón, y llevas la vida entera comprobándolo, qué vacío.',

      '[nombre], el hábito de no salir del lore te delata a la primera frase. Sótano sin salida útil, patético.',

      'Tienes más referencias inútiles que mensajes que alguien quiera retomar, [nombre]. Monólogo eterno del hilo, asco, qué vergüenza ajena.',

      'Estás al día de cosas que no afectan a una sola parte de tu vida. Toda esa información y ni una puta aplicación práctica, da vergüenza.',

      'Tienes opiniones sólidas sobre ficción y ninguna sobre tu vida, que es la que va como el culo. Puta prioridad invertida, qué flojo.',

      'Tu manera de existir aquí es esperar a que alguien mencione tu tema. Nunca lo mencionan y tú sigues esperando, pringado.gilipollas, menudo desastre.',

      'Friki que se sabe cada detalle menos cuándo está aburriendo. Y aburres siempre, cabrón. Siempre, sin una sola excepción, qué pena.',

      'Friki que se ha construido un mundo entero para no enfrentarse a este. Puta cobardía con decorados caros y sin público, patético.',

      'Friki que confunde tener un refugio con tener una vida. Un refugio se usa a ratos, cabrón. Tú te has mudado ahí dentro, miserable.',

      'Tu forma de estar cómodo es no salir. Por eso llevas años exactamente igual, con el mismo cuarto y la misma puta cara, qué cringe.',

      'Destacas en un ranking que nadie de aquí va a mirar jamás. Campeón de nada delante de nadie, puto trofeo de plástico, da asco.',

      'Friki que ha convertido su afición en su única conversación posible. Y se nota a los diez segundos, cabrón. Cada vez, qué vergüenza.',

      '[nombre], friki de mierda: cargas con un museo portátil sin un solo visitante. Toda esa mochila para no enseñar nada, ridículo.',

      'La compostura cruza de acera cuando te ve en el high de friki, [nombre]. Sótano sin salida útil, basura.',

      'El listón social lo usas de estantería de figuras y el suelo del chat es tu almacén, [nombre]. Cutre, patético.',

      'Friki de los que el high del ranking no suaviza: el rincón del chat te queda grande igual, [nombre]. Joder.',

      'Tienes el aura del post olvidado: presente en el archivo, frío en el ranking, [nombre]. Desperdicio, asco, qué nivel de pena.',

      'Se te oye el arrastre del monólogo hasta en los mensajes que pretenden ser normales, [nombre]. Fracasado, basura.',

      'Friki de superficie suficiente: no hace falta abrir el wiki, se huele el cerrado, [nombre]. Patético, qué cutre.',

      'La clase social te suena a ataque y respondes con más del mismo mazo del ranking, [nombre]. Patético, da pena ajena.',

      'Friki de feria ambulante de un solo puesto: el mismo show, cero nostalgia ajena, [nombre]. Fracasado, qué vacío.',

      'No hay barniz de antihéroe nerd: hay aislamiento y el high lo nombra en el ranking, [nombre]. Cabrón, indignante.',

      'Friki de racha perfecta: lo único que no fallas es no enganchar fuera del nicho, [nombre]. Ridículo, qué vergüenza ajena.',

      'Tu manera de participar es señalar errores. Nadie invita al que solo corrige, gilipollas. Puto árbitro sin partido y sin amigos ridículo, da vergüenza.',

      'Tu manera de participar es señalar errores. Nadie invita al que solo corrige, gilipollas. Puto árbitro sin partido y sin amigos fracasado, qué flojo.',

      'Tu manera de participar es señalar errores. Nadie invita al que solo corrige, gilipollas. Puto árbitro sin partido y sin amigos joder, menudo desastre.',

      'Tu manera de participar es señalar errores. Nadie invita al que solo corrige, gilipollas. Puto árbitro sin partido y sin amigos mierda, qué pena.',

      'Tu manera de participar es señalar errores. Nadie invita al que solo corrige, gilipollas. Puto árbitro sin partido y sin amigos coño, patético.',

      'Tu manera de participar es señalar errores. Nadie invita al que solo corrige, gilipollas. Puto árbitro sin partido y sin amigos cabrón, miserable.',

      'Tu manera de participar es señalar errores. Nadie invita al que solo corrige, gilipollas. Puto árbitro sin partido y sin amigos gilipollas, qué cringe.',

      'Tu manera de participar es señalar errores. Nadie invita al que solo corrige, gilipollas. Puto árbitro sin partido y sin amigos patético, da asco.',

      'Tu manera de participar es señalar errores. Nadie invita al que solo corrige, gilipollas. Puto árbitro sin partido y sin amigos asco, qué vergüenza.',

    ],
    mid: [
      'Friki funcional, que es como decir alcohólico que llega al trabajo. El problema sigue siendo el problema.',

      'Puedes mantener una conversación normal durante un rato. Luego se nota de dónde vienen tus referencias.',

      'Ni friki ni sociable del todo. Tienes tus aficiones y también gente. Un equilibrio raro pero real en alta resolución de group chat.',

      'Ni una cosa ni la otra. Suficiente afición para que se note, suficiente vida para que no preocupe y el hilo no pide amplificación.',

      'Ni ejemplo ni advertencia. Un intermedio que nadie recuerda con detalle ni para bien ni para mal en alta resolución de group chat.',

      'Tienes aficiones fuertes sin que te definan del todo. Eso ya es más de lo que consiguen muchos con el dígito como única defensa.',

      'Tienes gente fuera de tus aficiones. Poca, pero existe, y eso es lo que te salva el porcentaje y no hay DLC que lo parchee.',

      'Sales lo suficiente para no ser un caso clínico, pero tus referencias dicen de dónde vienes en el idioma seco del ranking.',

      'Ni obsesión ni hobby tranquilo. En el punto donde ocupa más de lo que debería sin ser grave delante de quien no quería verlo.',

      'A veces desapareces en tu mundo y a veces sales. La proporción está más o menos compensada. Delante del marcador en vivo.',

      'A veces sales y a veces cancelas por quedarte. La proporción es la que decide y va justa con testigos obligados en el hilo.',

      'Ni friki ni normal. Un intermedio que en este grupo es probablemente lo más sano que hay delante de todo el que miraba.',

      'Tienes momentos de encierro rodeados de otros de bastante normalidad. La media sale aquí sin bis ni matiz de consuelo.',

      'Tienes vida, pero la mitad la vives en sitios que no existen y con gente que no conoces en el momento que más dolía soltarlo.',

      'Ni encerrado ni fuera. Un intermedio donde la afición ocupa mucho pero no lo ocupa todo y el contador no discute.',

      'Ni friki de manual ni persona de calle. Un intermedio bastante común y bastante cómodo. Sin derecho a matiz útil.',

      'Tienes vida propia además de la afición. No mucha, pero suficiente para no estar abajo con el eco del almost todavía sonando.',

      'A ratos tu afición te abre puertas y a ratos te las cierra. Depende de con quién estés con el dígito firmando solo.',

      'Tu vida tiene los elementos básicos pero los intereses te delatan cada vez que hablas sin barniz de relato heroico.',

      'Tus aficiones no son un problema. Lo serían si crecieran un poco más, y van creciendo con el número hablando solo.',

      'Ni caso perdido ni referencia. Estás justo donde la cosa puede ir para cualquier lado y el resto es ruido de fondo.',

      'A veces te enganchas de más y luego vuelves a lo tuyo. Sin llegar a perderte del todo. Sin filtro de autoayuda.',

      'Tienes conversación más allá de tus intereses. No mucha, pero la tienes, y eso salva y. El ranking no pide permiso.',

      'Tus aficiones te ocupan mucho tiempo, pero no te han quitado la vida entera. Todavía con el número en la frente del mensaje.',

      'Tus horas invertidas son muchas y tu vida sigue existiendo. El equilibrio está justo con el saldo a la intemperie, da grima.',

      'Tus planes incluyen gente algunas veces. Otras veces no incluyen a nadie en absoluto y el sistema marca el punto final, qué nivel de pena.',

      'Tienes criterio para saber cuándo tu tema aburre. Lo que falla es aplicarlo siempre. Delante del marcador en vivo, basura.',

      'Tu afición es intensa y tu vida social existe. Que las dos convivan ya es un mérito con la firma legible del comando, qué cutre.',

      'A ratos das el nivel social y a ratos te refugias. La media queda exactamente aquí en alta resolución de group chat, da pena ajena.',

      'A veces arrastras la conversación a tu tema y a veces sabes parar. Depende del día sin anestesia de verdad esta vez, qué vacío.',

      'Cuando quieres, sabes hablar de otras cosas. El problema es que casi nunca quieres con la cara del resultado a la vista, indignante.',

      'Tu manera de relacionarte mezcla lo virtual y lo real. Con ventaja para lo primero y no hace falta ampliar el parte, qué vergüenza ajena.',

      'Tienes lo justo de vida fuera para que la afición siga siendo afición y no refugio sin apelación posible hoy, da vergüenza.',

      'Ni arriba ni abajo. Un término medio bastante estable en tu caso desde hace tiempo sin modo avión ni silencio cómplice, qué flojo.',

      'Ni caso perdido ni ejemplo. Estás en la franja donde nadie se preocupa ni comenta en el idioma seco del ranking, menudo desastre.',

      'Ni te encierras ni sales tanto. Estás en el punto donde la cosa aún es reversible y no hay DLC que lo parchee, qué pena.',

      'Ni desconectado ni conectado del todo. Un término medio que funciona sin destacar con el grupo de testigo silencioso, patético.',

      'Cuando te enganchas a algo desapareces semanas. Luego vuelves. Y así llevas años en el recuento que no perdona, miserable.',

      'Tienes conversación de sobra cuando te sales de tu tema. Sales poco, pero puedes sin barniz de relato heroico, qué cringe.',

      'Ni te pierdes ni te sueltas del todo. Un intermedio que en esto no está nada mal y el sistema cierra sin discusión, da asco.',

      'Tu porcentaje es medio porque en esto vas medio: mitad refugio, mitad hobby sano sin consuelo de manual barato, qué vergüenza.',

      'Ni obsesivo ni casual. En el punto donde la afición es intensa pero no absoluta y. El ranking no pide permiso, ridículo.',

      'Ni te aíslas ni te expones. Un intermedio que ni preocupa ni impresiona a nadie con el dígito como única defensa, fracasado.',

      'A ratos pareces alguien con vida y a ratos alguien con rutina. Van alternándose y. El ranking no pide permiso, qué miseria.',

      'A ratos das prioridad a lo virtual y a ratos a lo real. Va equilibrado por poco con el cargo en firme, da grima.',

      'Ni friki total ni ajeno del todo. Un punto medio que se sostiene sin esfuerzo con el peaje cobrado al natural, qué nivel de pena.',

      'Sales, sí, pero con cuentagotas y mirando el reloj para volver a la cueva con el dígito firmando solo, basura.',

      'Friki de armario, que es igual de grave pero con más esfuerzo en negarlo con la firma legible del comando, qué cutre.',

      'Ni encerrado ni social. En la mitad exacta, que en esto no está nada mal con la firma legible del comando, da pena ajena.',

      'Tienes un pie en el mundo real y los otros tres en el que te inventaste delante de quien no quería verlo, qué vacío.',

    ],
    low: [
      'Cero por ciento. Tu identidad no depende de lo que consumes, y eso se nota al hablar contigo y el hilo sigue sin ti en el centro.',

      'Nada de friki. Sales, hablas con gente real y todo. Eres la excepción y da un poco de rabia sin consuelo de manual barato.',

      'Cero por ciento. Ni una obsesión rara. Eso te deja bastante espacio para tener otras peores sin modo avión ni silencio cómplice.',

      'Cero. Tienes vida fuera de la pantalla, que en este grupo es prácticamente ciencia ficción delante de todo el que miraba.',

      'Sin rastro. Sabes cuándo tu tema interesa y cuándo no. Esa lectura es la que falla a otros sin anestesia de verdad esta vez.',

      'Cero. Tienes vida social real, cosa que la mitad del grupo no sabría ni por dónde empezar y. El veredicto no se negocia.',

      'Cero. Tienes conversación de sobra sobre cosas muy distintas. Eso ya casi nadie lo tiene con el resultado ya consumado.',

      'Cero por ciento. Tus intereses te suman en vez de aislarte. Ahí está toda la diferencia y el hilo no pide amplificación.',

      'Nada. Tu vida no gira alrededor de un solo interés, y eso te hace mucho más interesante en el único marcador que importa aquí.',

      'Limpio. Tienes gente que te conoce en persona y no solo por escrito. Eso lo cambia todo sin suavizar el golpe del número.',

      'Cero por ciento. Tu afición es una parte tuya, no el total. Y esa distinción lo es todo sin que nadie pida replay.',

      'Nada por aquí. Tu agenda tiene gente y tus horas tienen variedad. Ese es el equilibrio delante de quien aún leía el hilo.',

      'Cero. Tu cuarto es un sitio para estar, no un refugio del que no salir. Hay diferencia con el cargo en firme.',

      'Cero. Tienes aficiones y también vida. Que convivan bien es más raro de lo que parece sin consuelo de manual barato.',

      'Cero por ciento. Sales, quedas y también tienes tus cosas. El reparto está bien hecho en el momento que más dolía soltarlo.',

      'Sin rastro. Tienes intereses profundos y ninguna necesidad de que los compartan todos en el parte que nadie borra.',

      'Nada. Sabes hablar de tus cosas sin convertirlas en el único tema de la conversación. Delante del público que no pidió entrada.',

      'Nada. Puedes hablar de lo que sea sin llevarlo a tu terreno. Rarísimo y muy valorado sin apelación posible hoy.',

      'Sin material. Tus planes son con gente y tus aficiones son para ti. Todo en su sitio sin cuento que lo tape.',

      'Nada. Tienes conocimiento de sobra y ninguna necesidad de demostrarlo constantemente delante de todo el que miraba.',

      'Cero. Tienes anécdotas propias y no solo cosas que has visto. Ahí está la diferencia y. El ranking no pide permiso.',

      'Cero. Tu tiempo libre incluye personas de verdad. En este grupo eso es casi exótico sin apelación posible hoy.',

      'Sin rastro. Ni un anime, ni un gremio, ni una sola referencia que haya que explicar en el segundo más incómodo del chat.',

      'Limpio del todo. Tus planes incluyen gente y no dependen de lo que salga esa semana con el fallo en 4K de chat.',

      'Limpio. No usas lo que sabes para quedar por encima de nadie. Eso se agradece mucho sin prórroga ni VAR.',

      'Sin señales. Tu vida cabe en la calle, no en una pantalla. Raro y valioso por aquí. Delante del marcador en vivo.',

      'Cero por ciento. Tienes conocimiento sin necesidad de exhibirlo cada cinco minutos con el cargo en firme.',

      'Cero. Tus horas están repartidas entre cosas distintas y ninguna te tiene atrapado sin anestesia de verdad esta vez.',

      'Cero por ciento. Tu vida no se reinicia cuando sale algo nuevo. Sigue igual y bien en el momento que más dolía soltarlo.',

      'Limpio. Las cosas que te gustan te han acercado a gente en vez de alejarte de ella con el número en la frente del mensaje.',

      'Limpio. Ni figuras, ni fandoms, ni foros a las tres de la mañana. Casi sospechoso en el único idioma que entiende el contador.',

      'Nada. La gente disfruta hablando contigo de tus cosas porque sabes contarlas bien sin prórroga ni VAR.',

      'Cero. Sabes estar en un grupo sin llevar la conversación a tu terreno. Nivel alto sin consuelo de consola.',

      'Nada. Tienes aficiones sanas, gente alrededor y una vida que existe fuera de casa con. El chat enterado del cargo.',

      'Sin material. Nadie ha tenido que cambiar de tema contigo por agotamiento. Nunca sin suavizar el golpe del número.',

      'Nada por aquí. Sales a la calle y vuelves con historias. Los de arriba ni salen. Sin derecho a matiz útil.',

      'Cero. Sabes cuándo apagar y hacerlo sin que te cueste. Ahí está el control real con el parte firmado debajo.',

      'Limpio. No necesitas que nadie valide lo que te gusta para seguir disfrutándolo. Delante del marcador en vivo.',

      'Cero por ciento. Tienes anécdotas propias en vez de tramas ajenas. Bien por ti. Y el grupo ya pasó de página.',

      'Limpio. Tienes hobbies sin que te definan, y eso es exactamente como debe ser con el fallo en 4K de chat.',

      'Cero. Puedes pasar semanas sin tocar tus aficiones y no se te cae nada encima en alta resolución de group chat.',

      'Sin rastro. No hay una sola conversación en la que hayas aburrido con tu tema en el idioma seco del ranking.',

      'Nada. Puedes pasar un fin de semana sin nada de eso y no lo echas ni de menos. Delante del listón que no saltaste.',

      'Limpio del todo. Aquí no hay nada que rascar y no será porque no hayan mirado. Delante del hueco que quedó.',

      'Nada. Enhorabuena: eres de los pocos aquí que no vive dentro de una pantalla sin recurso ni nota al pie.',

      'Nada de nada. Tienes vida fuera, dentro y en medio. Un equilibrio poco común con el fail todavía caliente.',

      'Sin rastro. Tu manera de compartir lo que te gusta invita en vez de abrumar en el único idioma que entiende el contador.',

      'Cero. Enhorabuena por tener conversación sobre cosas que existen de verdad sin cuento que lo tape con el peaje cobrado al natural.',

      'Limpio del todo. Tienes profundidad en lo tuyo y amplitud en todo lo demás. Delante del ranking y de la cara.',

      'Sin material. Ni una sola vez has cancelado un plan por quedarte. Ni una. Delante del público que no pidió entrada.',

    ],
  },

  cerdo: {
    name: 'cerdo',
    goodIsHigh: false,
    high: [
      '[nombre], tu cepillo de dientes está tan nuevo que aún tiene la etiqueta. Eso no es ahorro, cabrón, es un comunicado de prensa sobre la basura que eres.',

      '[nombre], cerdo de mierda: te metes la mano dentro, te la hueles y sigues comiendo con la misma mano. Das un asco que echa para atrás desde lejos.',

      'Te metes la mano dentro, te la hueles y sigues comiendo con la misma mano sin lavártela. Das un asco que echa para atrás, puto cerdo.',

      'Cerdo sin estilo: el desastre sin estética es solo un problema de higiene del hilo El grupo te esquiva, cabrón.',

      'Tienes más episodios de cerdez documentada que intentos de subir el nivel un punto. Sin una puta toalla limpia, gilipollas.',

      '[nombre], eres un cerdo de los que el jabón pide traslado de provincia. El jabón te dio de baja, patético.',

      'El asco Colectivo es el precio de tu rastro. Y el grupo lo paga cada día, [nombre]. Sin anestesia, mierda.',

      'Cerdo de las que alardean de la grasa porque callar las dejaría sin personaje. Menudo desastre higiénico, basura.',

      'Das asco de entrada y el resto del mensaje solo confirma el desastre, [nombre]. El grupo te esquiva, ridículo.',

      '[nombre], tu manera de fregar el suelo es esperar a que se seque solo. Cada mancha se queda a vivir. Puta casa de mierda.',

      'Se te nota la prisa por embadurnar el chat y cero ganas de limpiar después. El jabón te dio de baja, joder.',

      'La dignidad no para el coche: tú eres el tráfico que deja el arcén peor. Hueles a abandono, mierda, y el grupo no se traga el cuento, mierda.',

      '[nombre], cerdo crónico: el termómetro del asco te marca fiebre permanente, gilipollas. Hostia puta, qué nivel.',

      'Tienes más restos en el relato que un cubo de basura. El día de recogida El grupo te esquiva, cabrón.',

      'Se te oye el masticar del bajo listón hasta en los mensajes que se quieren serios, [nombre]. Gilipollas.',

      'Eres el guarro que reutiliza el mismo plato toda la semana pasándole agua, [nombre]. Solo agua. Y luego comes ahí como si nada. Puta miseria.',

      '[nombre], el olor te precede en cualquier sala. La gente sabe que has llegado antes de verte, y eso no es carisma, puto guarro. Es humedad y mugre.',

      '[nombre], puto guarro: comes con la boca abierta, hablas con la boca llena y te limpias en el sofá. El manual de modales existe por gente como tú.',

      'Tu higiene es un rumor que nadie ha podido confirmar jamás. El jabón y tú no se hablan desde hace meses y se te huele a metros, guarro de mierda.',

      'Eres el que deja el pelo en la ducha y no lo recoge nunca, [nombre]. Que lo recoja otro, como todo lo tuyo. Puto guarro con delegación de tareas.',

      'Tu vaso de la mesita lleva ahí tanto que ya cría mosquitos y tiene moho con nombre propio, [nombre]. Y bebes al lado sin inmutarte, puto guarro.',

      '[nombre], tu microondas por dentro es una escena que nadie quiere describir. Y sigues usándolo sin abrirlo del todo. Puta vergüenza de higiene.',

      'Cerdo glotón y egoísta. Te comes todo, te revuelcas en tu mierda. Emocional y luego juegas a la víctima. Hueles a fracaso, fritanga y desesperación.',

      '[nombre], el día que limpies tu cuarto van a aparecer cosas que dabas por perdidas, incluida tu dignidad y dos mandos de consola. Puta cochiquera.',

      'Cerdo de manual, [nombre]: dejas los platos en remojo tres días. Eso ya no es remojo, cabrón, es un cultivo con vida propia y derechos adquiridos.',

      '[nombre], cerdo inmundo con una toalla que ya no seca, solo reparte. Y la usas igual todos los días. Ahí ya no es dejadez, es una puta patología.',

      'Tu cama tiene más migas que una panadería y más historia que un museo, [nombre]. Dormir ahí es deporte de riesgo y tú lo haces cada puta noche.',

      'Cerdo de mierda, [nombre]: vives revolcado en tu propia porquería sin que te moleste ni el olor. Ya ni hueles la peste que arrastras encima.',

      '[nombre], tu cepillo del pelo tiene más material acumulado que un desagüe y no lo has limpiado jamás. Das un asco que no se puede describir.',

      'Tu manera de limpiar es apartar la basura. Con el pie para abrir camino, [nombre]. Vives en un nivel de Tetris hecho de porquería acumulada.',

      'No es desparpajo: es falta de filtro con migas incluidas y el resultado se ve, [nombre]. Gilipollas.',

      'Tu concepto de limpieza es apartar la basura. Con el pie para abrir camino, [nombre]. Vives en un nivel de Tetris hecho de mugre acumulada.',

      '[nombre], eres el guarro que no se lava las manos al salir del baño. Y luego pasas el pan. Que nadie te acepte nada es lo mínimo, cabrón.',

      'Eres el guarro que deja el pelo en el lavabo y se va, [nombre]. Que lo recoja el siguiente, como todo lo tuyo. Puta dejadez con testigos.',

      '[nombre], cerdo de los que se secan las manos en la cortina del baño. Y la cortina tampoco está limpia. Un circuito completo de mierda.',

      'Dejas el fregadero de tal manera que el siguiente tiene que limpiarlo antes de usarlo. Puta herencia de mugre para quien venga detrás.',

      '[nombre], apestas y eres el único que no lo nota. Tu nariz se acostumbró hace años. Los demás no hemos tenido esa suerte, puto cerdo.',

      'Cerdo de manual, [nombre]: comes cosas del suelo con la regla de los cinco segundos. A veces cincuenta. Y sin mirar qué es. Das asco.',

      '[nombre], tu ropa se divide en sucia y menos sucia. La lavadora te tiene en contactos bloqueados y con toda la puta razón del mundo.',

      '[nombre], tienes migas en el sofá que llevan ahí más tiempo que algunos muebles. Un puto yacimiento arqueológico con cojines encima.',

      'Tu manera de sacar la basura es esperar a que el olor sea insoportable. Para ti, que ya es decir con el grupo de testigo silencioso.',

      '[nombre], tienes zapatillas que deberían haberse jubilado hace dos años y siguen en activo. Se huelen desde la puerta, puto guarro.',

      'No es atrevimiento: es suciedad previsible y el high te la cobra sin descuento, [nombre]. Menudo desastre higiénico, coño.',

      'Se te oye el masticar de la cerdez hasta en los mensajes que quieren parecer neutros El grupo te esquiva, cabrón.',

      '[nombre], tu bolsa de basura. Llega al borde y sigues apretando. La sacas cuando ya no cabe ni el aire, cerdo inmundo de manual.',

      'Has convertido el grupo en tu comedero y los demás en testigos del banquete, [nombre]. El jabón te dio de baja, patético.',

      'No hay capa fina: hay mancha gruesa y la mancha no se maquilla con emojis, [nombre]. Sin anestesia, mierda.',

      'Cerdo sin capa de carisma que disimule el agujero. Menudo desastre higiénico, basura, y el grupo no se traga el cuento, basura.',

      'Tu bolsa de basura. Llega al borde y tú sigues apretando. La sacas cuando ya no cabe ni el aire y el hilo no pide amplificación.',

      'El listón de lo decente lo usas de servilleta y lo tiras al suelo del chat, [nombre]. Sin una puta toalla limpia, fracasado.',

      'Cerdo con un cubo de basura que ya no cierra y una tolerancia al olor fuera de lo normal en el momento que más dolía soltarlo.',

      'Entras en la cocina y la dejas peor de como estaba. Un puto desastre natural con horario de comidas y sin licencia sanitaria.',

      'Cerdo asqueroso, [nombre]: tu almohada absorbe todo y nunca le has puesto funda limpia. Nunca. Y duermes ahí cada puta noche.',

      'La palabra compostura te suena a idioma de otro planeta y no has abierto el diccionario El grupo te esquiva, cabrón.',

      'Se te nota el hábito de empujar cada hilo hacia el mismo plato sin fregar, [nombre]. Sin anestesia, fracasado.',

      'Eres el guarro que deja el pelo en el lavabo y se va, [nombre]. Que lo recoja el siguiente, como todo lo tuyo. Puta dejadez Qué asco, mierda Hostia puta, asco.',

      'Cerdo de historial público: la grasa está en la superficie, no hace falta escarbar. Hueles a abandono, asco.',

      'Se te ve la prisa por embadurnar y la ausencia total de plan de limpieza, [nombre]. Menudo desastre higiénico, basura.',

      'Cerdo de fondo permanente: baja la media del grupo con constancia de metrónomo, [nombre]. El grupo te esquiva, ridículo.',

      'Tu escritorio tiene manchas superpuestas que ya forman un patrón geológico, cerdo. Cada capa es un mes de mierda. Acumulada.',

      'Cerdo de los que dejan grasa en cada mensaje: se te ve el rastro sin buscarlo, [nombre]. El jabón te dio de baja, joder.',

      'Has hecho del desorden una personalidad y la personalidad deja. El chat peor, [nombre]. Hueles a abandono, mierda.',

      'No hay misterio de cerdez con estilo: hay lo previsible y sucio, sin chispa, [nombre]. Sin anestesia, basura.',

      'Tienes más grasa en el discurso que un freidora de feria al cierre de la noche El grupo te esquiva, cabrón.',

      'Se te huele el desastre higiénico antes de leer el mensaje, [nombre]. Sin una puta toalla limpia, gilipollas.',

      'Cerdo de error de lectura: confundes límites con permiso para seguir manchando. El jabón te dio de baja, patético.',

      'Tienes cepillos de dientes viejos criando ahí al lado del que usas, [nombre]. Un puto museo de bacterias con vaso propio.',

      'Cerdo sin redención estética: solo grasa, sin capa de carisma que disimule el agujero. Menudo desastre higiénico, basura.',

      '[nombre], tienes migas en el sofá que llevan ahí más tiempo que algunos muebles. Un yacimiento con cojines, puto guarro Qué asco, mierda Hostia puta, fracasado.',

      '[nombre], tu bolsa de basura. Llega al borde y tú sigues apretando. La sacas cuando ya no cabe ni el aire, cerdo inmundo.',

      'Has convertido el bajo listón en residencia: sin mudanza a la vista de nadie. Sin anestesia, patético.',

      'Tienes más migas en el historial que un mantel de bar después del desayuno eterno. Hueles a abandono, mierda.',

      'La dignidad no te coge el teléfono: el buzón está lleno de avisos de limpieza. Menudo desastre higiénico, coño.',

      'No es estilo atrevido: es grasa previsible y el high te la cobra entera, [nombre]. El grupo te esquiva, cabrón.',

      'Tu manera de ordenar consiste en cambiar la basura. De sitio. La cantidad no varía nunca sin letra pequeña que lo salve.',

      'Eres el que come de pie sobre el fregadero y sin plato, [nombre], y lo llama ser práctico. Se llama ser un puto cerdo.',

      'No es libertad: es falta de criterio con migas y el resultado se huele, [nombre]. Hueles a abandono, asco.',

      'Se te nota el hábito de empujar cada tema hacia el mismo plato sin fregar, [nombre]. Menudo desastre higiénico, basura.',

      'No hay barniz: hay grasa pura y la grasa no se vende como carisma, [nombre]. Sin anestesia, ridículo.',

      'Cerdo de fondo: bajas la media con la constancia de quien no se cansa de ensuciar. Sin una puta toalla limpia, fracasado.',

      'Cerdo de las que el jabón cruza de acera cuando te ve en el puto ranking, [nombre]. El jabón te dio de baja, joder.',

      'Tienes más grasa en el personaje que un bocadillo olvidado en la mochila una semana, [nombre]. Mierda.',

      'Cerdo de manual: ni el vicio tiene gracia ni la suciedad tiene carisma, [nombre]. El ranking firma y listo, basura.',

      'Se te nota el rastro de cerdo hasta en los mensajes que pretenden ser serios, [nombre]. Se ve desde el primer mensaje, ridículo.',

      'Cerdo como un anuncio repetido que nadie pidió, joder, con el grupo de testigo. Sin una puta toalla limpia, gilipollas.',

      'Has convertido la porquería en identidad y no hay detergente que la renegocie, [nombre]. Eso no se maquilla con ángulo De frame, joder.',

      'Cerdo en crudo: ni el maquillaje del ranking te cubre. Sin anestesia. Hueles a abandono, asco, y el grupo no se traga el cuento, asco.',

      'El listón de lo presentable lo usas de tobogán hacia abajo, joder, [nombre]. Menudo desastre higiénico, basura.',

      'Cerdo sin una carta nueva: siempre la misma mano sucia, joder, diagnóstico cerrado El grupo te esquiva, ridículo.',

      'Se te oye el arrastre del cerdo hasta en los neutros del chat, [nombre]. Sin una puta toalla limpia, fracasado.',

      'Cerdo de historial público: no hace falta escarbar, huele en la superficie, [nombre]. El ranking firma y listo, sin filtro ni consuelo, patético.',

      'Tienes más restos en el discurso que un plato de casa sin fregar en días, [nombre]. Se ve desde el primer mensaje, diagnóstico cerrado, asco.',

      'Cerdo cutre: ni el caos tiene estilo ni el abandono tiene misterio, [nombre]., y se te nota a la legua, basura.',

      'Has hecho del bajo listón tu residencia. y no hay mudanza a la vista, [nombre]. Eso no se maquilla con ángulo, ridículo.',

      'Cerdo de las que el mute ajeno lee como misterio y es solo asco, [nombre] el nivel te nombra sin permiso,.',

      '[nombre], cerdo crónico: el termómetro del asco te marca fiebre permanente, gilipollas. Hostia puta, asco.',

      'Cerdo constante: la única racha es la de no pasar un trapo por nada, [nombre]. Hueles a abandono, asco.',

      'Se te nota la prisa por ensuciar y cero plan de limpiar lo dejado, [nombre]. Menudo desastre higiénico, basura.',

      'Cerdo de cartel grasiento: se ve de lejos y nadie quiere acercarse, [nombre]. El ranking firma y listo, cabrón.',

      'No hay misterio interesante: hay previsible y cerdo, el combo del high, [nombre]. Se ve desde el primer mensaje, gilipollas.',

      'Tienes el historial de un local cerrado por salubridad del ranking, [nombre]. Hostia puta, qué nivel.',

      'Cerdo de inercia: el grupo te soporta por costumbre, no por respeto, [nombre]. Eso no se maquilla con ángulo, mierda.',

      'El recato te queda lejos y la distancia es rechazo, no mística, [nombre] el nivel te nombra sin permiso, coño.',

      'Cerdo de ranking: bajas la media del nivel con constancia de mancha, [nombre]. El grupo te esquiva, cabrón.',

      'Has convertido el bajo listón en casa fija sin fecha de mudanza, [nombre]. Sin una puta toalla limpia, gilipollas.',

      'Cerdo de estribillo que mancha más con cada bis del mismo plato, [nombre]. El jabón te dio de baja, patético.',

      'La compostura no te reconoce y tú no has buscado el espejo, [nombre]. El ranking firma y listo, asco.',

      'Cerdo de fondo permanente: el high no es un mal día, es el nivel, [nombre]. Se ve desde el primer mensaje, basura.',

      'No es atrevimiento: es suciedad de personaje y el high te la cobra, [nombre]. Hostia puta, qué nivel.',

      'Tienes más grasa en el relato que un delantal sin lavar en un mes, [nombre]. Eso no se maquilla con ángulo, fracasado.',

      'Cerdo de ceja ajena levantada y respeto en el sótano del ranking, [nombre] el nivel te nombra sin permiso De frame, patético.',

      'El promedio de este tramo es el tuyo: no un pico, el suelo del high, [nombre]. Hueles a abandono, mierda.',

      'Has convertido la porquería en carnet. y no hay renovación limpia, [nombre]. Menudo desastre higiénico, coño.',

      'Cerdo cutre y sin complejo: el complejo pediría espejo y no lo hay, [nombre]. El grupo te esquiva, cabrón.',

      'Se te oye el masticar del listón bajo hasta en los serios del chat, [nombre]. El ranking firma y listo, nivel sótano puro, fracasado.',

      'Cerdo de letrero grasiento: se lee de lejos y no invita a entrar, [nombre]. Se ve desde el primer mensaje, sin filtro ni consuelo, joder.',

      'No hay misterio de cerdo con estilo: hay lo previsible y el high lo nombra, [nombre]., diagnóstico cerrado, mierda.',

      'Tienes el historial de un fregadero abandonado desde el domingo, [nombre]. Eso no se maquilla con ángulo, y se te nota a la legua, coño.',

      'Cerdo de malinterpretar el silencio como invitación a más suciedad, [nombre] el nivel te nombra sin permiso, cabrón.',

      'El grupo paga tu rastro en cuotas diarias de asco. Documentado, [nombre]. Sin una puta toalla limpia, fracasado.',

      'Has dejado el chat como fregadero a medias: restos eternos, [nombre]. El jabón te dio de baja, joder.',

      'Cerdo de estribillo sin punto final limpio ni redención, [nombre]. Hueles a abandono, mierda, y el grupo no se traga el cuento, mierda.',

      'Se te nota el peso de arrastrar la misma mancha por cada hilo, [nombre]. El ranking firma y listo, sin maquillaje posible, basura.',

      'La compostura cruza de acera cuando te ve en el high, [nombre]. Se ve desde el primer mensaje, ridículo.',

      'Cerdo de feria: grasa, ruido, suelo peor y cero ganas de volver, [nombre]. Hostia puta, qué nivel. Hostia, el desastre se explica solo, qué vergüenza ajena.',

      'Se te ve venir el cerdo en la primera palabra del mensaje, [nombre]. Eso no se maquilla con ángulo, da vergüenza.',

      'La dignidad del nivel no para: tú eres el tráfico del arcén, [nombre] el nivel te nombra sin permiso, qué flojo.',

      'Cerdo de superficie: no hace falta abrir el cubo, huele de lejos, [nombre]. Menudo desastre higiénico, basura.',

      'No hay barniz que salve: hay cerdo puro y no se vende como carisma, [nombre]. El grupo te esquiva, ridículo.',

      'Tienes el tono de quien acumula restos y nunca pasa el estropajo, [nombre]. Sin una puta toalla limpia, fracasado.',

      'Cerdo de las que alardean del desastre porque callar las deja sin rol, [nombre]. El ranking firma y listo, patético.',

      'El asco resume el high y el resto solo desarrolla el diagnóstico, [nombre]. Se ve desde el primer mensaje, asco, qué cringe.',

      'Has firmado el cerdo con grasa en cada mensaje como única firma, [nombre]. Hostia puta, qué nivel. Hostia, el desastre se explica solo, da asco.',

      'Cerdo visible desde lejos: el rastro se ve, la parada no compensa, [nombre]. Eso no se maquilla con ángulo, ridículo.',

      'Se te nota que ensuciaste el hilo hace tiempo y perdiste el bayeta, [nombre] el nivel te nombra sin permiso, fracasado.',

      'La clase te suena a ataque y respondes con más migas de suciedad, [nombre]. El jabón te dio de baja, patético.',

      'Cerdo de racha perfecta: lo único que no fallas es manchar, [nombre]. Hueles a abandono, asco, y el grupo no se traga el cuento, asco, qué miseria.',

      'No hay eco de estilo: hay eco de cerdo. Y el chat lo amplifica, [nombre]. Menudo desastre higiénico, basura.',

      'Tienes el aura del plato olvidado: presente, frío y con restos, [nombre]. El ranking firma y listo, el chat ya lo sabía, qué nivel de pena.',

      'El listón lo usas de pan y el suelo del chat es tu mantel, [nombre]. Se ve desde el primer mensaje, nivel sótano puro, basura.',

      'Has hecho ranking de cerdo y el oro es tuyo sin rival, [nombre]., sin filtro ni consuelo, patético. Hostia puta, qué nivel, qué cutre.',

      'Cerdo de feria ambulante: el mismo show, el mismo asco, cero nostalgia, [nombre]. Eso no se maquilla con ángulo, diagnóstico cerrado, da pena ajena.',

      'Se te ve venir el teatro sucio en el primer punto del mensaje, [nombre] el nivel te nombra sin permiso, y se te nota a la legua, basura.',

      'La dignidad hace autostop y el tráfico del arcén eres tú, [nombre]. El grupo te esquiva, cabrón, y el grupo no se traga el cuento, indignante.',

      'Cerdo de superficie suficiente: basta la vista, no hace falta el sótano, [nombre]. Sin una puta toalla limpia, qué vergüenza ajena.',

      'No hay barniz de antihéroe: hay cerdo y el high lo cobra, [nombre]. El jabón te dio de baja, patético.',

      'Tienes el tono de noches de chat sin una frase limpia que se sostenga, [nombre]. El ranking firma y listo, con el grupo de testigo, qué flojo.',

      'Cerdo de malinterpretar el mute como interés por el personaje barato, [nombre]. Se ve desde el primer mensaje, sin maquillaje posible, menudo desastre.',

      'El precio de tu repertorio lo paga el hilo en tiempo y paciencia, [nombre]. Hostia puta, qué nivel. Hostia, el desastre se explica solo, qué pena.',

      'Has dejado el hilo como obra sin plano: escombro de suciedad, [nombre]. Eso no se maquilla con ángulo, patético.',

      'Cerdo de estribillo que empeora con cada bis del mismo plato, [nombre] el nivel te nombra sin permiso, miserable.',

      'La compostura del nivel no te reconoce en el elenco, [nombre]. Hueles a abandono, mierda. Hostia puta, qué nivel, qué cringe.',

      'Cerdo de fondo: bajas la media del high con constancia de mancha, [nombre]. Menudo desastre higiénico, da asco.',

      'No es estilo: es cerdo previsible y el high te lo nombra entero, [nombre]. El grupo te esquiva, qué vergüenza.',

      'Tienes más episodios de mancha que intentos de pasar un trapo, [nombre]. El ranking firma y listo, ridículo.',

      'Cerdo de respeto ajeno en números rojos del ranking, [nombre], coño. Se ve desde el primer mensaje, patético.',

      'El promedio del high es este: no un mal día, el nivel del nivel, [nombre]. Hostia puta, qué nivel. Hostia, el desastre se explica solo, qué miseria.',

      'Has convertido el cerdo en identidad sin renovación limpia, [nombre]. Eso no se maquilla con ángulo, basura.',

      'Cerdo de puta madre en el sentido literal: el high no suaviza el rastro, [nombre] el nivel te nombra sin permiso, ridículo.',

      'Tu presencia baja el promedio de higiene del chat solo con escribir, [nombre]. Sin una puta toalla limpia, fracasado.',

      'Ni el modo oscuro tapa lo que dejas en el hilo, [nombre]. Cerdo hasta en la sombra. El jabón te dio de baja, qué cutre.',

      'Se te cae el disimulo solo con abrir el hilo y el high lo documenta, [nombre]. Hueles a abandono, da pena ajena.',

      'Cerdo de las que el ambientador se rinde y pide la baja, [nombre]. El ranking firma y listo, sin anestesia, basura.',

      'No hay jabón que te salve: hay suciedad de base y el comando la cobra, [nombre]. Se ve desde el primer mensaje, el chat ya lo sabía, ridículo.',

      'Tu mensaje es un aviso de lo que no hay que tocar en el grupo, [nombre]., nivel sótano puro, fracasado.',

      'Cerdo con la disciplina de quien nunca ha pasado un trapo por el relato, [nombre]. Eso no se maquilla con ángulo, sin filtro ni consuelo, da vergüenza.',

      'El high no es un mal día de orden: es.mierda. Sin anestesia. Hueles a abandono, asco, y el grupo no se traga el cuento, asco, qué flojo.',

      'Tienes una presencia que ensucia el hilo en un solo mensaje, [nombre]. Menudo desastre higiénico, basura.',

      'Cerdo de repertorio: siempre la misma mancha y cero plan B, [nombre]. El grupo te esquiva, ridículo, y el grupo no se traga el cuento, ridículo.',

      'Se te nota el desastre hasta en la miniatura del estado, [nombre]. Sin una puta toalla limpia, fracasado.',

      'Cerdo sin complejo útil: el complejo al menos indicaría que viste el desastre, [nombre]. El ranking firma y listo, patético.',

      'El ranking de higiene te deja donde mereces: en el sótano del high, [nombre]. Se ve desde el primer mensaje, con el grupo de testigo, asco, qué cringe.',

      'Has hecho del cerdo tu marca y la marca se pega en los dedos ajenos, [nombre]., sin maquillaje posible, basura.',

      'Cerdo de las que confunden natural con abandono total del estándar, [nombre]. Eso no se maquilla con ángulo, ridículo.',

      'No es estilo sucio con gracia: eres un cerdo y el high no discute la evidencia, [nombre] el nivel te nombra sin permiso, fracasado.',

      'Tu noción de limpieza es apartar la basura. Con el pie para abrir camino. Vives en un nivel de Tetris hecho de mugre, fracasado.',

      'La vergüenza ajena es el impuesto que pagamos por tu forma de estar en el hilo. Hueles a abandono, asco, qué miseria.',

      'Cerdo de fondo de chat: siempre ahí, siempre dejando rastro, siempre igual. Menudo desastre higiénico, basura.',

      'Has hecho de lo indecente tu plato favorito y lo sirves en todas las mesas El grupo te esquiva, ridículo.',

      'No es gracia sucia: es suciedad sin gracia, la versión que no entretiene, [nombre]. Sin una puta toalla limpia, fracasado.',

      'El listón está en el suelo y tú lo usas de pan para mojar sin vergüenza, [nombre]. El jabón te dio de baja, qué cutre.',

      'Cerdo de oficio: el rastro de grasa es tu firma y aparece en cada párrafo. Hueles a abandono, da pena ajena.',

      'Has firmado lo cutre. Con grasa en cada mensaje como única firma posible. Sin anestesia. Menudo desastre higiénico, qué vacío.',

      'Dejas el baño de tal manera que hay que limpiarlo antes de poder usarlo. Puta escena del crimen con toalla húmeda, indignante.',

      'Tienes el tono de quien come con la boca abierta en un restaurante en silencio. Sin una puta toalla limpia, qué vergüenza ajena.',

      'Cerdo de superficie suficiente: no hace falta abrir el cubo, huele igual. El jabón te dio de baja, patético.',

      'Tienes una manta que huele desde hace meses y duermes con ella cada noche. Ni un animal aguanta eso, puto guarro, qué flojo.',

      'Has hecho de lo cutre una marca y la marca se pega en los dedos del que lee. Menudo desastre higiénico, basura.',

      'La palabra clase te suena a reproche y respondes ensuciando un poco más El grupo te esquiva, ridículo.',

      'Se te oye el arrastre de la grasa hasta en los mensajes cortos del chat. Sin una puta toalla limpia, fracasado.',

      'Has hecho ranking de cerdez y el oro es tuyo sin que nadie dispute el podio. Sin anestesia, patético.',

      'Tienes más manchas documentadas que intentos serios de pasar un trapo al relato. Hueles a abandono, qué cringe.',

      'Has convertido la grasa en carnet. y no hay renovación limpia a la vista. Menudo desastre higiénico, da asco.',

      'La higiene del hilo y tú firmasteis no verse: el acuerdo se cumple a rajatabla El grupo te esquiva, qué vergüenza.',

      'Cerdo con las mismas cartas manchadas de siempre y sin plan B Sin una puta toalla limpia, ridículo.',

      'Has convertido la mancha en identidad y no hay detergente narrativo a la vista. El jabón te dio de baja, patético.',

      'Cerdo de letrero grasiento: se lee igual de lejos y no invita a entrar. Hueles a abandono, asco, y el grupo no se traga el cuento, asco, qué miseria.',

      'Se te ve venir la mancha en la primera palabra del mensaje largo, [nombre]. Menudo desastre higiénico, basura.',

      'La vergüenza ajena te sigue y no es admiración: es consecuencia del rastro. Sin anestesia, ridículo.',

      'Cerdo sin higiene narrativa: ensucias el hilo y no recoges nunca el escombro. Sin una puta toalla limpia, fracasado.',

    ],
    mid: [
      'Ni cerdo ni impecable. Hay días en que se nota que te has esforzado y días en que se nota lo contrario.',

      'A veces cuidas los detalles y a veces se te acumula todo de golpe. Un punto medio bastante inestable.',

      'Tu higiene es de aparador: te lavas cuando hay que impresionar y el resto del tiempo que arda Troya.',

      'Ni asco ni admiración. Una zona neutra que se sostiene sin esfuerzo y sin mérito sin consuelo de manual barato.',

      'Hay días buenos y días en que la gente cambia de asiento. Y los segundos son los que se recuerdan sin bis ni matiz de consuelo.',

      'Ni sucio ni limpio: dependes del plan. Si hay alguien que te interesa, hueles bien. Si no, ya tal y el sistema marca el punto final.',

      'A ratos ordenas y a ratos dejas que se acumule. La media de las dos cosas es exactamente esto con el dígito firmando solo.',

      'Ni arriba ni abajo. Un intermedio que en tu caso lleva años sin moverse en ninguna dirección sin descuento por empatía.',

      'Tu nivel es aceptable siempre que nadie mire los rincones. Y en los rincones está el examen y el archivo no admite recurso.',

      'Ni asqueroso ni pulcro: estás en esa franja donde la gente disimula pero se aparta un poco sin suavizar el golpe del número.',

      'A veces impecable, a veces preocupante. La media te salva por los pelos y por poco tiempo sin recurso ni nota al pie.',

      'Te duchas por compromiso, no por convicción. Se nota en la cara de quien te da dos besos y no hay DLC que lo parchee.',

      'A ratos das el pego y a ratos das explicaciones. Ninguna de las dos cosas es buena señal y el resto es ruido de fondo.',

      'Ni asqueroso ni pulcro. Estás en la franja donde nadie comenta pero todos lo han pensado con. El botín o el fail a la vista.',

      'Cuidas lo que se ve y descuidas lo que no. Es el reparto más habitual y el más revelador sin segunda lectura que lo arregle.',

      'Tu limpieza va por rachas. El problema es que las rachas malas duran más que las buenas sin consuelo de manual barato.',

      'Cuando te lo propones funcionas. El problema es la frecuencia con la que te lo propones y no hace falta ampliar el parte.',

      'Limpias cuando ya no queda otra, no cuando toca. Esa diferencia es la que te deja aquí sin anestesia de verdad esta vez.',

      'Tu problema no es la suciedad, es la acumulación. Empiezas bien y terminas rindiéndote y. El ranking no pide permiso.',

      'Cumples lo justo para que nadie te lo diga a la cara. Detrás sí se comenta, tranquilo con el saldo a la intemperie.',

      'A ratos das el nivel y a ratos das pereza. La proporción decide, y la tuya está justa delante de la evidencia del contador, miserable.',

      'A ratos cuidas los detalles y a ratos ni los básicos. Sin patrón claro entre las dos con el grupo de testigo silencioso, qué cringe.',

      'Ni ejemplo ni problema. Justo en el medio, que en higiene es un sitio raro pero real sin consuelo de manual barato, da asco.',

      'Ni te señalan ni te ponen de ejemplo. Estás en la zona gris que nadie quiere ocupar. Sin derecho a matiz útil, qué vergüenza.',

      'Tienes la costumbre de dejar cosas para después. Después llega y las dejas otra vez y el archivo queda cerrado, ridículo.',

      'Ni cerdo ni maniático. Estás en el punto donde la gente no piensa en ello y ya está con. El chat enterado del cargo, fracasado.',

      'Tu nivel sube cuando hay gente y baja cuando estás solo. Eso lo dice bastante claro y basta el dato del ranking, qué miseria.',

      'Tu cuarto tiene zonas que llevan meses sin ver la luz. Y tú lo sabes perfectamente con la firma legible del comando, da grima.',

      'A veces se te va de las manos y luego reaccionas. Reaccionar tarde tiene su precio sin anestesia de verdad esta vez, qué nivel de pena.',

      'Tienes rutina para lo básico y ninguna para el resto. Ahí es donde se acumula todo con el eco todavía en el grupo, basura.',

      'Cuando algo se acumula lo resuelves. Lo que falla es dejar que se acumule cada vez con el eco todavía en el grupo, qué cutre.',

      'Ni bien ni mal. Un pasable constante que no molesta a nadie ni impresiona a nadie sin suavizar el golpe del número, da pena ajena.',

      'Tu limpieza sube y baja según el público. Eso no es higiene, es marketing barato delante de la evidencia del contador, qué vacío.',

      'Higiene de fin de semana. De lunes a jueves el asunto es bastante más discutible. Y el chat archiva sin debate, indignante.',

      'Justo en la frontera. Un mal fin de semana y pasas al otro lado sin darte cuenta con el cargo en firme, qué vergüenza ajena.',

      'Cuando esperas visita, la casa está perfecta. El resto del tiempo mejor no mirar con el fail todavía caliente, da vergüenza.',

      'Tienes hábitos buenos que no sostienes. Y sin sostenerlos no sirven de gran cosa con la firma legible del comando, qué flojo.',

      'A veces te pasas de descuidado y luego compensas. Compensar no borra lo anterior en el parte que nadie borra, menudo desastre.',

      'Ni asqueroso ni impecable. Un aprobado raspado sostenido durante bastante tiempo con. El bot como notario del fallo, qué pena.',

      'Te arreglas si hay foto. El resto del tiempo funcionas en modo ahorro. Y se nota y no hay DLC que lo parchee, patético.',

      'Tienes momentos de orden entre semanas de dejadez. El balance queda en el medio y el contador insiste, miserable.',

      'Ni limpio ni sucio: mantenido. Y mantener sin mejorar acaba siendo insuficiente y el resto es ruido de fondo, qué cringe.',

      'Tienes lo justo para que nadie se queje y nunca lo suficiente para que se note y no hay DLC que lo parchee, da asco.',

      'Aprobado raspado. Y el examen de esto lo hace todo el que se sienta a tu lado en el momento que más dolía soltarlo, qué vergüenza.',

      'Tu higiene personal está bien y tu casa no tanto. O al revés, según la semana sin modo avión ni silencio cómplice, ridículo.',

      'Tu orden depende del ánimo. Y el ánimo no es un buen sistema de mantenimiento y el sistema no regala puntos, fracasado.',

      'Ni impecable ni preocupante. Estás justo donde se puede vivir sin comentarios. Delante del ranking y de la cara, qué miseria.',

      'Tu casa está presentable si avisan con tiempo. Sin avisar, mejor quedar fuera sin prosa que lo maquille, da grima.',

      'Ni desastre ni ejemplo. Te mantienes en un aceptable que nunca llega a bueno con el eco del almost todavía sonando, qué nivel de pena.',

      'Tienes buenas intenciones y mala continuidad. En esto la continuidad es todo con el eco del almost todavía sonando, basura.',

    ],
    low: [
      'Cero. La diferencia entre tú y el resto es que tú no dejas que las cosas lleguen a acumularse sin descuento por empatía.',

      'Cero por ciento. La rutina te funciona sola y por eso nunca hay una gran limpieza pendiente con el grupo de testigo silencioso.',

      'Limpio. Lo tuyo no es maniático, es simplemente estar al día. Y estar al día lo cambia todo con el fail todavía caliente.',

      'Cero por ciento. Ordenas sobre la marcha en vez de dejar que se acumule. Ahí está el truco sin modo avión ni silencio cómplice.',

      'Nada que reprochar. Te lavas como una persona normal, cosa que aquí no todos pueden decir delante de quien no quería verlo.',

      'Cero. Los detalles pequeños los tienes cubiertos, y son justo los que delatan a los demás sin segunda lectura que lo arregle.',

      'Nada. Tu casa está igual de bien con visita que sin ella, y esa es la única prueba real con el resultado ya consumado.',

      'Limpio. Hueles a limpio de verdad, no a producto tapando algo. Hay diferencia. Y se nota delante de todo el que miraba.',

      'Limpio del todo. Ni la ropa, ni el baño, ni la cocina dan nunca un solo motivo de queja. Delante del hueco que quedó.',

      'Nada. Ventilas, ordenas y friegas sin que se convierta en una tarea épica. Sistema puro sin que nadie pida replay.',

      'Cero. En tu casa se puede abrir cualquier cajón sin miedo. Eso ya es un examen aprobado sin letra pequeña que lo salve.',

      'Limpio. Enhorabuena por lo básico: en este grupo lo básico ya es un logro considerable delante de la evidencia del contador.',

      'Sin manchas, literalmente. Ojalá pudiéramos decir lo mismo del resto de tus mediciones con el dígito como única defensa.',

      'Limpio del todo. Tienes rutina y la sostienes, que es la parte que casi nadie sostiene sin suavizar el golpe del número.',

      'Nada por aquí. Nadie ha tenido que comentar nunca nada, y en este grupo eso ya es raro con el resultado ya consumado.',

      'Cero por ciento. Tienes el hábito interiorizado y por eso no te cuesta ningún esfuerzo y el historial no olvida.',

      'Nada. Tu higiene personal está por encima de la media sin que hagas de ello un asunto en el recuento que no perdona.',

      'Nada. Aquí no hay nada que rascar, ni en lo evidente ni en lo que solo se ve de cerca y el hilo sigue sin ti en el centro.',

      'Cero por ciento. Nadie ha tenido nunca que abrir una ventana después de que te vayas sin apelación posible hoy.',

      'Nada. La gente no comenta tu higiene, y eso es la mejor nota que se puede sacar aquí con el número hablando solo.',

      'Limpio. Tienes el tipo de orden que hace que la casa parezca más grande de lo que es y basta el dato del ranking.',

      'Nada de nada. Cuidas la ropa, el espacio y tu propio aspecto con la misma constancia y no hace falta ampliar el parte.',

      'Cero. Limpio de verdad, sin drama y sin tener que anunciarlo cada vez que te duchas y el resto es ruido de fondo.',

      'Limpio del todo. Ahora te toca explicar por qué sales tan mal en los otros comandos y no hay DLC que lo parchee.',

      'Cero por ciento. Higiene impecable y sin hacer de ello un tema. Justo como debe ser y el resto es ruido de fondo.',

      'Sin material. Tu manera de mantener las cosas hace que nunca haya que arreglar nada en el momento que más dolía soltarlo.',

      'Sin rastro. Recoges detrás de ti también cuando estás en casa ajena. Detalle enorme con el fallo en 4K de chat.',

      'Nada por aquí. Hueles bien, dejas los sitios como estaban y no das guerra. Un lujo y el historial no olvida.',

      'Nada. Tu higiene funciona en silencio, que es exactamente como tiene que funcionar sin apelación posible hoy.',

      'Cero. Enhorabuena, formas parte de la minoría de este grupo que se ducha por gusto sin letra pequeña que lo salve.',

      'Cero. Cuidas los detalles que no se ven, y ahí es donde se nota el nivel de verdad. Y el chat archiva sin debate.',

      'Cero por ciento. Recoges lo que ensucias en el momento, y por eso nunca se acumula con el eco todavía en el grupo.',

      'Cero por ciento. Tu nevera tiene solo cosas que se van a comer. Un lujo poco común y basta el dato del ranking.',

      'Cero. La gente entra en tu casa y se sienta sin mirar antes dónde. Eso vale mucho con el fail todavía caliente.',

      'Sin rastro. Ni una sola vez ha habido que abrir la ventana después de que pasaras y el sistema marca el punto final.',

      'Cero. Nadie ha tenido que decirte nada nunca, y eso es la mejor nota posible aquí en alta resolución de group chat.',

      'Nada de nada. Ni un plato pendiente, ni una toalla húmeda, ni un rincón olvidado con la firma legible del comando.',

      'Sin material. Nadie ha tenido nunca que cambiarse de asiento por tu culpa. Nunca sin apelación posible hoy.',

      'Cero por ciento. Tu higiene es constante, no reactiva. Esa es toda la diferencia con. El chat enterado del cargo.',

      'Nada. No necesitas que venga nadie para ponerte a limpiar. Ya está siempre listo con el fallo en 4K de chat.',

      'Limpio del todo. Compartes espacio sin que nadie tenga que negociar nada contigo sin descuento por empatía.',

      'Cero. Tienes las cosas en orden sin necesidad de que nadie te lo recuerde nunca delante de todo el que miraba.',

      'Nada. Tienes hábitos sólidos y por eso nunca hay que ponerse a limpiar de golpe delante de quien aún leía el hilo.',

      'Limpio. Tu constancia en esto es la que le falta a medio grupo, y se nota mucho sin modo avión ni silencio cómplice.',

      'Cero. Cuidas lo tuyo y lo compartido igual, que es donde casi todos se relajan y el sistema no regala puntos.',

      'Sin rastro. Compartir espacio contigo es fácil y eso no lo consigue casi nadie en el único marcador que importa aquí.',

      'Cero por ciento. Ni una sola señal en años. Aquí sales impecable sin discusión con el eco del almost todavía sonando.',

      'Limpio. Tu ropa, tu casa y tus manos están al día sin que tengas que pensarlo en alta resolución de group chat.',

      'Sin material. Tu higiene no es un esfuerzo puntual, es una costumbre asentada y el hilo no pide amplificación.',

      'Nada. Tienes la casa en un estado que permite que aparezca alguien sin avisar y el sistema no regala puntos.',

    ],
  },

  femboy: {
    name: 'femboy',
    goodIsHigh: false,
    high: [
      'Te gusta que te dominen y te traten como a una chica pero luego te haces el macho alfa. La disonancia es de puta madre, gilipollas.',

      'Usas labial transparente para hidratar y el resultado es un brillo de puta. No es hidratación, es femboy, gilipollas.',

      'Te gusta que te traten como a una chica y luego te haces el macho. El contraste es de puta madre de ridículo, cabrón.',

      'Usas bragas de encaje y te haces fotos. El disco duro es un puto OnlyFans femboy privado, gilipollas.',

      'Femboy de saldo. Te disfrazas de princesita cute para tapar que eres un hombre mediocre con polla y sin presencia. El disfraz no arregla el contenido, gilipollas.',

      'Femboy fracasado. Outfits bonitos por fuera, decepción absoluta por dentro. Quieres que te traten como a una chica pero no aguantas ni media conversación de adulto, cabrón.',

      'Te has construido una versión cute para no afrontar que eres un tío mediocre con complejos. El maquillaje no tapa la mediocridad, gilipollas.',

      'Usas perfume de mujer y labial. El pack femboy está listo, solo falta aceptarlo, gilipollas. En el único idioma que entiende el contador.',

      'Tu voz, tu gesto y tu culo ya delataron. El grupo no necesita más pruebas, puto femboy de mierda. Sin modo avión ni silencio cómplice.',

      'Te vistes de chica en privado y de macho en el grupo. El armario de ropa femenina ya tiene más prendas que el de hombre, gilipollas.',

      'Te peinas, te depilas y te perfumas como una tía y luego exiges que te traten como un macho. El descaro tiene un límite, gilipollas.',

      'Tu versión macho dura lo que dura una conversación con minas. En cuanto hay tíos se te resetea el firmware a femboy, gilipollas.',

      'Cada vez que alguien te lo dice con cariño te cabreas más que cuando te lo sueltan con hostia. El problema eres tú, puto femboy.',

      'Cada vez que niegas ser femboy suenas menos convincente. La ley de rendimientos decrecientes aplicada a la mentira, gilipollas.',

      'Usas el maquillaje como armadura y la ofensa como espada. La batalla la tienes perdida, gilipollas. Y el archivo queda cerrado.',

      'Has hecho de tu cuerpo un anuncio y de tu boca un desmentido. El anuncio gana siempre, gilipollas. En el parte que nadie borra.',

      'Femboy de los que se maquillan para la guerra y luego niegan haber ido al frente, gilipollas. Sin suavizar el golpe del número.',

      'Cada outfit es un comunicado. Cada negación es una fe de erratas que nadie lee, gilipollas. Sin segunda lectura que lo arregle.',

      'Tu historial de compras tiene más lencería femenina que ropa de tío. Y usas el de tu hermana para que no se note, gilipollas.',

      'Cada vez que alguien te lo dice con datos te enfadas más que cuando te lo sueltan con insulto. El dato duele más, gilipollas.',

      'Llevas más productos de skincare que de afeitado. El baño ya parece el de una tía, gilipollas. Con, patético.',

      'Llevas el paquete estético completo y la negación de quien sabe que el paquete lo delata. Patético. Y evidente, puto travelo.',

      'El día que alguien te trate como a una chica en serio vas a tener que decidir. Hasta entonces sigue en el limbo, gilipollas.',

      'Has logrado que hasta los que te defendían al principio miren para otro lado. La evidencia puede con la amistad, gilipollas.',

      'Llevas el pelo largo por estilo y te lo peinas como una modelo. El estilo es femboy, gilipollas. Sin prosa que lo maquille.',

      'Te gusta el maquillaje y el contouring por diversión. La diversión es ser femboy y te está gustando demasiado, gilipollas.',

      'Te gusta que te miren como a una chica pero te ofendes si te lo dicen. La incoherencia es tu deporte favorito, gilipollas.',

      'La verdad no te va a matar. El disfraz a largo plazo sí te está pasando factura, gilipollas. Y no hay modo de suavizarlo.',

      'En el fondo no quieres ser hetero. Quieres ser deseado como se desea a una chica y no te atreves a decirlo, gilipollas.',

      'Usas perfume de mujer porque huele bien. Y el grupo ya sabe que es para completar el pack femboy. No cuela, gilipollas.',

      'Te peinas para la cámara y te enfadas si te dicen que pareces una tía. Quieres el resultado sin el nombre, gilipollas.',

      'Te peinas para el deseo ajeno y te enfadas cuando alguien nombra el deseo. Quieres el efecto sin la causa, gilipollas.',

      'Usas bragas de mujer por comodidad y te depilas el culo por higiene. Las excusas ya no cuelan, puto femboy de mierda.',

      'Usas lo femenino cuando te conviene y lo masculino cuando te atacan. Eres un interruptor, no una persona, gilipollas.',

      'Te gusta el resultado de parecer una tía y odias el nombre. Quieres el pastel y comer no decir el sabor, gilipollas.',

      'Te has quedado atrapado entre el deseo de ser mirado como chica y el miedo a que te lo digan. Ahí vives, gilipollas.',

      'Usas sérum, cremas y mascarillas como si fueras una influencer de skincare. A los veinte eso es femboy, gilipollas.',

      'Cada argumento que usas para defender tu masculinidad se desmonta con una foto tuya de hace tres días, gilipollas.',

      'Has convertido el baño en un laboratorio y el armario en un almacén de pruebas. El caso está cerrado, gilipollas.',

      'Femboy de los que venden misterio y entregan tutorial de TikTok, [nombre]. Pose sin sustancia detrás, fracasado.',

      'La coherencia se fue de vacaciones el día que combinaste medias con discurso de alfa. No ha vuelto, gilipollas.',

      'Lo que más delata no es la ropa. Es el brillo en los ojos cuando te sacan el tema y finges cabreo, gilipollas.',

      'Has convertido lo femenino en herramienta y lo masculino en disfraz de emergencia. Se ve el truco, gilipollas.',

      'Llevas tanto tiempo negando que la negación se te ha quedado de gesto fijo. Hasta en fotos se ve, gilipollas.',

      'Tu forma de mirarte al espejo es de tía preparándose para salir. El espejo ya sabe lo que eres, gilipollas.',

      'Has llegado al punto en que el disimulo cansa más que la verdad. Y aun así eliges el cansancio, gilipollas.',

      'La evidencia está ordenada por fecha en tu historial de compras. Es un diario sin metáforas, gilipollas.',

      'Tu forma de hablar se pone aguda cuando estás cómodo. El grupo ya tiene el audio de prueba, gilipollas.',

      'Tu versión de la masculinidad cabe en un tweet. Tu versión del femboy llena el baño entero, gilipollas.',

      'Tu cuerpo ya votó. Tu boca sigue en campaña. Las elecciones las ganó el cuerpo hace tiempo, gilipollas.',

      '[nombre], femboy de saldo: outfits bonitos por fuera, decepción por dentro. Almost de estética barata, joder.',

      'La única persona a la que todavía engañas con el discurso macho eres tú. Y cada día menos, gilipollas.',

      'Tu cuerpo lleva años diciendo lo que tu boca no se atreve. El cuerpo tiene mejor oratoria, gilipollas.',

      'Se te ve el disfraz y el agujero de personalidad a la vez, [nombre]. Almost de estética barata, cabrón.',

      'La coherencia no es un ataque. Es lo mínimo que se pide cuando te vistes así y hablas asá, gilipollas.',

      'Tu voz, tu culo y tu historial de compras forman un triángulo. Y el triángulo no miente, gilipollas.',

      'Has logrado que hasta los nuevos del grupo te clasifiquen en menos de un día. Eficiente, gilipollas.',

      'La única duda real es si algún día vas a coincidir con lo que todos ven. El reloj corre, gilipollas.',

      'La única salida digna es dejar de pelearte con lo evidente. El resto son vueltas de más, gilipollas.',

      'El grupo ya no discute si eres femboy. Discute cuánto tiempo te queda de farsa hetero antes de que se te caiga el disfraz del todo, cabrón.',

      'Tu cuerpo ya eligió. Tu boca todavía está en fase de negociación. El cuerpo va ganando, cabrón. Delante de la evidencia del contador.',

      'El cuerpo marca femboy. La boca marca miedo. El resultado es este espectáculo semanal, cabrón. En el único marcador que importa aquí.',

      'Te gusta el rol de sumiso y que te traten como a una chica en la cama. Luego en el grupo te haces el alfa, el contraste es ridículo.',

      'Llevas tanta capa de disimulo que cuando te quitas una aparece otra. Cebolla de feria, cabrón. En el momento que más dolía soltarlo.',

      'Usas bragas de encaje porque son cómodas y te las compras online con nombre falso. El paquete ya tiene dirección de femboy, cabrón.',

      'Usas la estética como reclamo y la ofensa como escudo. El combo del que no se atreve, puto femboy sin suavizar el golpe del número.',

      'Te depilas hasta el alma, usas labial y todavía te haces el hetero cuando te conviene. El grupo ya sabe lo que eres, puto travelo.',

      'Llevas más tiempo eligiendo el tono de base que eligiendo carrera. Y todavía dices que es solo un poco de corrector, puto travelo.',

      'Tu armario tiene más faldas y crop tops que camisetas de tío. Y todavía hablas de masculinidad como si no fuera un chiste, cabrón.',

      'Llevas el pack completo: voz aguda, culo marcado, ropa de tía y negación olímpica. Solo te falta el cartel de neón, puto travelo.',

      'La única cosa más evidente que tu femboy es tu miedo a que te lo digan en voz alta, puto femboy sin suavizar el golpe del número.',

      'Cada negación tuya suma un punto al marcador del grupo. Vas perdiendo por goleada, puto travelo delante de quien no quería verlo.',

      'Femboy de los que se maquillan para la foto y se borran para el discurso. La foto gana, cabrón. Sin anestesia de verdad esta vez.',

      'Has hecho de la confusión un hogar y de la claridad una amenaza. Se entiende el miedo, cabrón. Delante de quien aún leía el hilo.',

      'Usas bragas y medias en casa y te haces fotos de prueba. El disco duro tiene más carpetas de femboy que de porno hetero, cabrón.',

      'La evidencia forense está en tu baño. El juicio se celebra en el chat cada semana, puto travelo con el peaje cobrado al natural.',

      'Te miras al espejo y ajustas el gesto. Eso ya no es arreglo, es caracterización, puto travelo con. El bot como notario del fallo.',

      'Usas bragas y te las compras en talla de mujer. El ticket de compra es una confesión, cabrón. Delante de quien aún leía el hilo.',

      'Llevas crop tops y pantalones que te marcan el culo como si fueras modelo de OnlyFans femboy. Y te haces el despistado, cabrón.',

      'Usas medias y lencería en privado y te haces el hetero en público. El armario de ropa femenina ya es un puto vestidor, maricón.',

      'Femboy de los que el disfraz se te queda grande y el criterio te queda pequeño, [nombre]. Almost de estética barata, joder.',

      'Tienes más pose de personaje que sustancia que. El chat respete de verdad, [nombre]. Pose sin sustancia detrás, mierda.',

      'Femboy de manual cutre: el estereotipo sin el carisma que a veces lo salva, [nombre]. El disfraz no tapa el hueco, coño.',

      'Se te nota el teatro en cada mensaje y el high no aplaude el montaje, [nombre]. Se te ve el fail a la primera, ridículo.',

      'Femboy como un anuncio repetido que nadie pidió, joder, con el grupo de testigo. Pose sin sustancia detrás, gilipollas.',

      'Has hecho del personajito una marca que se pega en los dedos ajenos, [nombre]. El disfraz no tapa el hueco, patético.',

      'Femboy en crudo: ni el maquillaje del ranking te cubre. Se te ve el fail a la primera, mierda, joder.',

      'El listón de la dignidad lo usas de rampa y el high te empuja abajo, [nombre]. anestesia. Pose sin sustancia detrás, basura.',

      '[nombre], el maquillaje no tapa que no hay persona detrás del filtro. El disfraz no tapa el hueco, ridículo.',

      'Femboy de los que venden misterio y entregan tutorial de TikTok, [nombre]. Almost de estética barata, fracasado.',

      'Femboy de historial público: no hace falta escarbar, está en la superficie, [nombre] filtro ni consuelo, patético.',

      'Tienes más episodios de pose que de algo que. El chat respete, [nombre]. El disfraz no tapa el hueco, mierda.',

      'Femboy cutre: ni el vicio tiene gracia ni la pose tiene mérito, [nombre]. Se te ve el fail a la primera, basura.',

      'Has convertido el armario en escenario y la función aburre al patio, [nombre]. Pose sin sustancia detrás, cabrón.',

      'Femboy de las que el mute ajeno lee como misterio y se equivoca de libro, [nombre]. El disfraz no tapa el hueco, gilipollas.',

      '[nombre], cada cumplido con cariño te cabrea más que el insulto directo. Almost de estética barata, patético.',

      'Femboy constante: la única racha que mantienes es la del mismo número, [nombre]. el grupo de testigo, mierda.',

      'Se te nota la prisa por ser el personaje y cero plan de ser alguien de peso, [nombre]. maquillaje posible, coño.',

      'Femboy de cartel grasiento: se ve el anuncio y nadie quiere la función, [nombre]. Almost de estética barata, ridículo.',

      'No hay misterio interesante: hay previsible y flojo, el combo del high, [nombre]. Pose sin sustancia detrás, fracasado.',

      'Tienes el historial de un local cerrado por exceso de pose y falta de sustancia, [nombre]. Fracasado.',

      'Femboy de inercia: el grupo te soporta por costumbre, no por respeto, [nombre]. Se te ve el fail a la primera, asco.',

      'El recato te queda lejos y la distancia es rechazo, no mística de personaje, [nombre]. Pose sin sustancia detrás, coño.',

      'Femboy de ranking: bajas la media del nivel con constancia molesta, [nombre]. El disfraz no tapa el hueco, cabrón.',

      'Has hecho del bajo listón tu residencia. y no hay mudanza a la vista, [nombre]. Almost de estética barata, gilipollas.',

      'Femboy de estribillo que mancha más con cada repetición del mismo plato, [nombre]. Pose sin sustancia detrás, patético.',

      'Se te nota el hábito de empujar cada tema hacia el mismo teatro barato, [nombre]. El disfraz no tapa el hueco, asco.',

      'La compostura no te reconoce y tú no has buscado el espejo en serio, [nombre]. Se te ve el fail a la primera, coño.',

      'Femboy de fondo permanente: el high no es un mal día, es el nivel, [nombre]. Pose sin sustancia detrás, ridículo.',

      'No es atrevimiento: es suciedad de personaje y el nivel te la cobra, [nombre]. El disfraz no tapa el hueco, fracasado.',

      'Tienes más grasa de pose en el discurso que un freidor al cierre de feria, [nombre]. frame, patético.',

      'Femboy de ceja ajena levantada y respeto en el sótano del ranking, [nombre]. Pose sin sustancia detrás, mierda.',

      '[nombre], femboy fracasado: quieres el pack completo sin asumir el precio. El disfraz no tapa el hueco, coño.',

      'Has convertido el personajito en identidad y no hay detergente narrativo, [nombre]. chat ya lo sabía, ridículo.',

      'Femboy de manual: pose cute, contenido vacío, drama de manual, [nombre]. Pose sin sustancia detrás, gilipollas.',

      'Se te oye el masticar del listón bajo hasta en los neutros del chat, [nombre]. El disfraz no tapa el hueco, patético.',

      'La dignidad no te coge el teléfono: el buzón está lleno de avisos del grupo, [nombre]. Se te ve el fail a la primera, mierda.',

      'Femboy de letrero grasiento: se lee de lejos y no invita a entrar, [nombre]. Pose sin sustancia detrás, basura.',

      'No hay misterio de pose con estilo: hay lo previsible y el high lo nombra, [nombre]. El disfraz no tapa el hueco, ridículo.',

      'Tienes el historial de un fregadero que nadie ha tocado desde el domingo, [nombre]. Almost de estética barata, fracasado.',

      'Femboy de malinterpretar el silencio ajeno como invitación a más teatro, [nombre]. Pose sin sustancia detrás, qué vacío.',

      'El grupo paga tu rastro en cuotas diarias de hastío documentado, [nombre]. el grupo de testigo, asco, indignante.',

      'Has dejado el chat como fregadero a medias: restos de pose eternos, [nombre]. maquillaje posible, basura.',

      'Femboy de estribillo sin punto final limpio ni redención posible, [nombre]. Pose sin sustancia detrás, da vergüenza.',

      'Se te nota el peso de arrastrar el mismo personaje por cada hilo, [nombre]. El disfraz no tapa el hueco, qué flojo.',

      'La compostura cruza de acera cuando te ve en el high del comando, [nombre]. Se te ve el fail a la primera, menudo desastre.',

      'Femboy de feria: grasa, ruido, suelo peor y cero ganas de volver, [nombre]. Pose sin sustancia detrás, asco, qué pena.',

      'Se te ve venir la pose en la primera palabra del mensaje, [nombre]. El disfraz no tapa el hueco, basura.',

      'La dignidad del nivel no para el coche: tú eres el tráfico del arcén, [nombre]. Almost de estética barata, ridículo.',

      'Femboy de superficie suficiente: no hace falta abrir el cubo, huele, [nombre]. Pose sin sustancia detrás, fracasado.',

      'No hay barniz que salve: hay pose pura y no se vende como carisma, [nombre]. El disfraz no tapa el hueco, da asco.',

      'Te peinas, te depilas y exiges trato de macho cuando conviene, [nombre]. Almost de estética barata, qué vergüenza.',

      'Tu culo tiene más presencia en el grupo que tu opinión. Y eso ya es decir bastante, cabrón. Sin segunda lectura que lo arregle, ridículo.',

      'Usas la estética femenina como escudo y como reclamo a la vez. Quieres lo mejor de los dos mundos sin pagar el precio, fracasado.',

      'Has invertido más en parecer delicado que en tener personalidad. El resultado es un envoltorio bonito con nada dentro, qué miseria.',

      '[nombre], cada cumplido con cariño te cabrea más que el insulto directo. Pose sin sustancia detrás, patético.',

      'Has convertido el grooming en una religión y la masculinidad en un disfraz de fin de semana. Las prioridades claras, qué nivel de pena.',

      'El día que pares de fingir vas a descubrir que el grupo ya había pasado página. Solo tú seguías en el capítulo, puto femboy, basura.',

      'Tu culo es el protagonista de tus selfies casuales. No es casual, es femboy marketing, cabrón. Con el fail todavía caliente, qué cutre.',

      'Te gusta que te fotografíen en poses de tía. Luego las borras, pero el backup existe, cabrón. Sin consuelo de manual barato, da pena ajena.',

      'Tu culo ha hecho más por tu reputación en el grupo que todas tus opiniones juntas, maricón delante de quien no quería verlo, qué vacío.',

      'El espejo sabe. El baño sabe. El armario sabe. Solo tu boca sigue en modo avestruz, cabrón. En alta resolución de group chat, indignante.',

      'Te depilas hasta el alma y usas cremas para mantener la suavidad. La suavidad de femboy, cabrón. Sin que nadie pida replay, qué vergüenza ajena.',

      'Tu versión hetero es un skin que te pones para. El chat. En privado el skin se cae solo, cabrón. Con el fallo en 4K de chat, da vergüenza.',

      'Te depilas las piernas para el deporte y el resultado es más suave que el de una modelo. El deporte es ser femboy, qué flojo.',

      'La próxima vez que digas que no eres femboy, grábate en vídeo. Luego míralo sin sonido. El cuerpo habla solo, puto femboy, menudo desastre.',

      'Cuando te llaman princesa sonríes un segundo de más. Ese segundo es toda la confesión que el grupo necesita, puto travelo, qué pena.',

      'El femboy no es el enemigo. El enemigo es el teatro barato que montas para no nombrarlo, cabrón. Y el historial no olvida, patético.',

      'La estética grita. La boca susurra lo contrario. El grupo se queda con el grito, puto femboy y el resto es ruido de fondo, miserable.',

      'Usas la ambigüedad como estrategia y la victimización cuando te pillan. El manual completo del indeciso con pose, qué cringe.',

      'Tu culo, tu cintura y tu forma de caminar gritan femboy. La boca niega, pero el cuerpo no, cabrón. Y el contador insiste, da asco.',

      'Tu historial de TikTok está lleno de tutoriales de maquillaje y moda femenina. El algoritmo no miente, femboy de mierda, qué vergüenza.',

      'Quieres el trato de chica sin el estigma y el privilegio de tío sin la responsabilidad. La cuenta no sale, puto femboy, ridículo.',

      'Usas el maquillaje para parecer suave y el discurso para parecer duro. Ninguna de las dos cosas te sale limpia, fracasado.',

      'Femboy de los que llegan tarde a su propia revelación. La fiesta empezó sin ti, puto travelo sin apelación posible hoy, qué miseria.',

      'Tu culo ha hecho más declaraciones públicas que tu boca. Y con mejor redacción, puto femboy sin recurso ni nota al pie, da grima.',

      'Llevas crop tops que te marcan las costillas y el culo. No es moda, es anuncio de femboy, cabrón. Sin prórroga ni VAR, qué nivel de pena.',

      'Te gusta que te fotografíen en poses femeninas y luego las borras por vergüenza. El disco tiene backup, puto travelo, basura.',

      'Te gusta que te llamen princesa y muñeca pero luego te haces el duro. El contraste es tan ridículo que duele, femboy, qué cutre.',

      'Llevas el disfraz tan puesto que te has olvidado de cómo se sale. Y fuera hace frío, cabrón. Sin filtro de autoayuda, da pena ajena.',

      'Te depilas el culo, las piernas y el pecho y dices que es por higiene personal. La higiene de qué, de puto travelo, qué vacío.',

      'Usas lo femenino para atraer y lo masculino para defenderte. Eres un sistema de dos caras y las dos se ven, indignante.',

      'Tu culo es el más suave y redondo del grupo y te lo sabes. Por eso llevas pantalones que lo enseñan, puto femboy, qué vergüenza ajena.',

      'Tu forma de sentarte, de cruzar las piernas y de gesticular es de señorita de instituto. Femboy de libro, da vergüenza.',

      'Femboy de manual: pose cute, contenido vacío, drama de manual, [nombre]. Almost de estética barata, qué flojo.',

      'La voz, el culo, la ropa y la negación forman un acorde. Y el acorde suena a femboy en todas las octavas, menudo desastre.',

      'La única persona sorprendida por tu femboy eres tú. El resto está en la grada desde el primer acto, puto travelo, qué pena.',

      'Cada crop top es una declaración. Cada negación es un chiste malo. El grupo ya no ríe, solo anota, puto travelo, patético.',

      'Cada vez que te peinas para parecer más suave confirmas lo que niegas con la boca. El peine delata, puto femboy, miserable.',

      'Has convertido la negación en tu deporte olímpico. Llevas años sin bajar del podio de la mentira, puto travelo.',

      'Usas lo femenino para brillar y lo masculino para no quemarte. Al final haces las dos cosas a medias, da asco.',

      'Has llegado al punto en que el teatro es más agotador que la verdad. Y aun así eliges el teatro, puto femboy, qué vergüenza.',

      'Llevas la estética de una decisión tomada y el discurso de una decisión aplazada. El reloj no espera, ridículo.',

      'Usas la ropa de chica para sentirte vivo y la voz de tío para no morir del qué dirán. El miedo se ve, fracasado.',

      'Cada producto que compras es un ladrillo más en la pared de evidencia. La pared ya es un muro, puto travelo, qué miseria.',

      'Quieres ser deseado en clave femenina y respetado en clave masculina. El mercado no ofrece ese pack, da grima.',

      'La ropa no hace al femboy. Lo hace la forma en que te emocionas cuando alguien te trata como a una, qué nivel de pena.',

      'Llevas uñas pintadas de broma y el esmalte no se te cae en semanas. Eso no es broma, es identidad, basura.',

      'Usas la ropa de chica para sentirte visto y la voz de tío para no ser señalado. El truco es viejo, qué cutre.',

      'Tu culo, tu voz y tu historial de Amazon ya formaron un sindicato. El sindicato habla por ti, puto femboy, da pena ajena.',

      'El femboy se te sale por los poros. La negación se te queda en la boca. El grupo elige qué creer, cabrón.',

      'Llevas tanto tiempo en modo femboy que el modo hetero te queda como traje prestado de otra talla, cabrón.',

      'Llevas el disfraz, la negación y el cansancio de mantenerlos. El cansancio se te nota en la voz, qué vergüenza ajena.',

      'Llevas productos de belleza de mujer y los escondes. El escondite es peor que la verdad, puto travelo, da vergüenza.',

      'Usas la ambigüedad como casa y la verdad como visita incómoda. Un día la visita se queda, puto femboy, qué flojo.',

      'Llevas la estética de una decisión y el discurso de la indecisión. El contraste es el chiste, menudo desastre.',

      'Has invertido en parecer delicado y en sonar peligroso. Ninguna de las dos inversiones renta, qué pena.',

      'Tus calcetines hasta el muslo no tapan lo evidente: debajo del programa cute hay un tío promedio huyendo de su propia cara y de su propia vida, maricón, patético.',

      'La estética cute te dura hasta que alguien te confronta. Ahí vuelve el macho de cartón, puto femboy, miserable.',

      'Quieres validación de chica y autoridad de tío. El combo no existe fuera de tu cabeza, puto travelo, qué cringe.',

      'La coherencia se fue del chat el día que empezaste a combinar crop top con discurso de alfa, da asco.',

      'Cada outfit nuevo es un comunicado de prensa. El comunicado dice lo que tu boca calla, puto travelo, qué vergüenza.',

      'La única cosa que te falta para el pack completo es dejar de mentir. El resto ya está, puto travelo, ridículo.',

      'Usas cremas antiarrugas a los veinte y sérum de ácido hialurónico. Eso no es skincare, es preparación para el maquillaje completo, maricón, ridículo.',

      'Tu cintura es más estrecha que la de media tía del grupo y te la enseñas con crop tops cuando nadie mira. Femboy confirmado nivel experto, fracasado.',

      'Llevas más productos de belleza en el baño que tu hermana y dices que es solo para la piel. La piel de qué, de tu culo afeitado, maricón, da grima.',

      'Tu culo es más redondo y suave que el de media tía del grupo y te lo enseñas con pantalones ajustados a propósito. Femboy de catálogo, qué nivel de pena.',

      'Llevas tanto tiempo en el personaje que ya no sabes dónde termina el disfraz y dónde empiezas tú. Spoiler: casi no empiezas, maricón, basura.',

      'La masculinidad que defiendes en el chat no aparece ni en tus selfies ni en tu forma de cruzar las piernas. Cero coherencia, travelo, qué cutre.',

      'Tu historial de búsquedas, tus compras y tu forma de sentarte ya formaron un tribunal. El disfraz no tapa el hueco, fracasado.',

    ],
    mid: [
      'Tu masculinidad tiene grietas y por esas grietas se cuela un brillo sospechoso, cabrón. Sin suavizar el golpe del número.',

      'Joder, no eres femboy completo pero tienes gestos que harían dudar hasta a tu puto padre sin anestesia de verdad esta vez.',

      'Caminas como macho hasta que te olvidas y te sale un contoneo que ni las Bratz, hostia con el fail todavía caliente.',

      'Cuando crees que nadie mira se te escapa un movimiento de muñeca que delata toda la mierda que escondes.',

      'Medio femboy. Como un huevo kinder: por fuera normalito, por dentro una sorpresa que nadie pidió, coño.',

      'Tienes la energía de un tío que dice "no homo" mientras elige el color de sus cojines decorativos y el archivo queda cerrado.',

      'Tu playlist es de machote hasta que llegan las tres de la mañana y suena Britney a todo volumen, gilipollas.',

      'No llevas falda pero tu forma de sentarte con las piernas cruzadas ya levanta actas, cabrón. Con el eco del almost todavía sonando.',

      'Eres como un armario medio abierto: no se ve todo pero se intuye la colección de dentro, joder. En el recuento que no perdona.',

      'Tu voz es grave pero tus risitas son de anime. Ese contraste confunde al grupo entero. Y el contador no discute.',

      'Dices "tío" cada dos palabras para compensar que tu lenguaje corporal grita otra cosa, hostia puta en el segundo más incómodo del chat.',

      'No eres femboy pero tu reflejo en el escaparate a veces te da un susto de la hostia. Delante del listón que no saltaste, basura.',

      'Te pillan en poses sospechosas y dices que estabas estirando. Mierda de excusa, cabrón, estiras mucho para un lado, qué cutre.',

      'Tu armario es de tío normal pero tienes un cajón cerrado con llave que huele a secreto con purpurina, da pena ajena.',

      'Cuando bebes se te suelta la muñeca como una bisagra rota y todo el bar se entera, joder. Sin modo avión ni silencio cómplice, qué vacío.',

      'Medio macho, medio otra cosa. Eres el centauro de la ambigüedad de género, coño. Y el sistema marca el punto final, indignante.',

      'Tu novia dice que eres muy masculino pero tus colegas intercambian miradas cada vez que pides un cóctel rosa, qué vergüenza ajena.',

      'Tienes más cremas en el baño que tu hermana y lo justificas con "es por la piel". Ya, claro, da vergüenza.',

      'No eres femboy pero si alguien te regalara unas medias te las probarías "por curiosidad", cabrón. Sin filtro de autoayuda, qué flojo.',

      'Tu historial de búsqueda es recto hasta que llegas a la página tres y ahí la cosa se tuerce, menudo desastre.',

      'Pareces un tío corriente hasta que alguien te pone un filtro de TikTok y la transformación es inquietantemente buena, qué pena.',

      'Juras que eres puro macho pero tu postura al apoyarte en la pared es de protagonista de shojo, patético.',

      'Tu forma de morderte el labio cuando piensas ha generado más confusión que respuestas en el grupo, miserable.',

      'Eres de los que dicen "qué asco. Las uñas pintadas" mientras se miran las suyas pensando en qué color, qué cringe.',

      'Medio femboy es peor que entero porque ni disfrutas el personaje ni convences como macho. Un puto limbo, da asco.',

      'Te sale un "ay" agudo cuando te asustas que contradice toda la masculinidad que llevas montando años, qué vergüenza.',

      'Tu pelo está sospechosamente bien cuidado para alguien que jura que solo usa champú dos en uno, ridículo.',

      'No das el perfil completo pero en la foto de grupo siempre sales con la pose más suave, hostia. Sin derecho a matiz útil, fracasado.',

      'Si la feminidad fuera un virus tú estarías en periodo de incubación, coño. Los síntomas ya se notan, qué miseria.',

      'Eres el tío que en las fiestas de disfraces elige personaje femenino "por broma" y lo clava demasiado bien, da grima.',

      'Tus amigos ya tienen un apodo privado para ti en el grupo sin ti. Y no, no es "machote", qué nivel de pena.',

      'Le pones demasiado empeño a negar algo que nadie te ha preguntado, cabrón. Eso ya es sospechoso de cojones, basura.',

      'Cuando te dicen "eres muy sensible" lo niegas con una vehemencia que solo confirma el diagnóstico, qué cutre.',

      'Tienes la fuerza de un tío pero la delicadeza al coger las cosas de alguien que teme romperse una uña, da pena ajena.',

      'Tu manera de decir "hola" ya viene con un tonito que ningún manual de masculinidad aprobaría, qué vacío.',

      'No eres femboy pero si te midieran los niveles de purpurina interna saldrías positivo, coño. En el parte que nadie borra, indignante.',

      'Medio y medio, como el café. Pero tu mitad fem tiene más sabor que tu mitad macho, mierda. En el único marcador que importa aquí, qué vergüenza ajena.',

      'Cuando alguien dice "femboy" en el grupo miras para otro lado demasiado rápido. Eso se nota, da vergüenza.',

      'Tu cara de póker cuando sale este tema es la peor cara de póker de la historia, gilipollas. Sin derecho a matiz útil, qué flojo.',

      'En la escala de masculinidad eres un cinco con coma: ni arriba ni abajo, flotando en terreno peligroso, menudo desastre.',

      'Tienes la pinta de macho ibérico pero los modales de alguien que sabe qué coño es un tóner. Y el contador insiste, qué pena.',

      'Cuando cruzas las piernas en público tu viejo siente una perturbación en la fuerza, hostia puta con el número hablando solo, patético.',

      'Tu gymbox dice "entreno duro" pero tus estiramientos post-gym son puro ballet de la hostia y no hay DLC que lo parchee, miserable.',

      'Eres como un coche tuneado por dentro pero con carrocería de furgoneta: la sorpresa viene al abrir, qué cringe.',

      'La mitad de ti es tío corriente y la otra mitad es un misterio que da miedo explorar, coño. Y el sistema cierra sin discusión, da asco.',

      'Tu reacción cuando te ponen una canción de Dua Lipa te delata más que un detector de mentiras, qué vergüenza.',

      'No eres femboy pero tienes una energía sospechosa que ni tú mismo puedes explicar sin tartamudear, ridículo.',

      'Eres el tío que se queda mirando la sección femenina "comparando precios". Seguro, cabrón, comparando, fracasado.',

      'Si tu masculinidad fuera una pared, tendría humedades. No se cae, pero las manchas ya se ven, qué miseria.',

      'Joder, eres la zona gris con patas. Ni los algoritmos de las apps saben qué mierda recomendarte sin apelación posible hoy, da grima.',

    ],
    low: [
      'Hostia, cero por ciento. Eres tan genéricamente masculino que podrías ser el avatar por defecto de cualquier puta cosa.',

      'Joder, ni una señal. Eres el equivalente humano de un ladrillo beige: funcional, feo y sin personalidad.',

      'Cero femboy. Pero no te emociones, cabrón, ser un tío básico no es un logro, es una condición. Sin derecho a matiz útil.',

      'Nada de nada. Tienes la gracia y el misterio de un calcetín de deporte usado. Enhorabuena, gilipollas.',

      'Mierda, ni un destello. Eres tan predeciblemente macho que un bot podría vivir tu vida y nadie notaría la diferencia.',

      'Cero. Eres el fondo de pantalla que viene por defecto: nadie lo eligió, simplemente estaba ahí, coño.',

      'Puto cero. Tu personalidad tiene la profundidad de un charco en agosto. Seco y sin nada dentro en el segundo más incómodo del chat.',

      'Ni una pizca, cabrón. Pero tampoco tienes una pizca de nada interesante, así que estamos en paz con el resultado ya consumado.',

      'Hostia, eres tan masculino estándar que pareces sacado de un catálogo de Decathlon. Modelo básico, sin extras.',

      'Cero por ciento y cero sorpresas. Tu existencia es tan plana que podrían planchar ropa encima, joder.',

      'Nada. Eres el tipo de tío que describe su personalidad con "me gusta el fútbol y las hamburguesas". Fascinante, gilipollas.',

      'Limpio de femboy pero sucio de aburrimiento crónico. Ser un macho corriente no te hace especial, te hace uno más, coño.',

      'Cero señales. Tu presencia en una habitación tiene el mismo impacto que un mueble de IKEA sin montar, mierda.',

      'Joder, ni un gramo. Eres tan insoportablemente normal que hasta este resultado es lo más interesante que te ha pasado en meses.',

      'Nada. Podrían clonarte y usar las copias como extras de fondo en cualquier película sin que nadie lo note, cabrón.',

      'Cero. Tienes toda la energía de alguien que pide "lo de siempre" en todos los putos bares de su vida, hostia.',

      'Puto cero. No es que seas muy macho, es que eres tan genérico que no eres muy nada, gilipollas. Con el número hablando solo.',

      'Nada por aquí. Tu masculinidad no es impresionante, es simplemente la ausencia de cualquier otra cosa, coño.',

      'Cero. El escáner del bot pasó por ti y se quedó dormido del aburrimiento, joder. Eres ruido blanco con patas.',

      'Ni una señal, cabrón. Pero no lo celebres, que la alternativa es que eres un tío gris en un mundo de colores.',

      'Hostia, limpio total. Eres la opción "saltar tutorial" de la vida: todo el mundo te pasa por encima sin mirarte.',

      'Cero por ciento. Tu energía masculina no es potente, es la única que tienes porque las demás se fueron de casa, mierda.',

      'Nada de femboy pero también nada de interés. Eres el martes de los días de la semana: nadie te espera ni te recuerda.',

      'Joder, cero absoluto. Eres tan agresivamente mediocre que hasta tu madre te describe como "majo" porque no encuentra otro adjetivo.',

      'Puto cero. Sales limpio aquí pero es porque no sales nada en ningún sitio. Eres invisible con DNI, gilipollas.',

      'Ni un pelo fuera de sitio, cabrón. Lástima que "sitio" sea el rincón más aburrido del puto universo.',

      'Cero. Eres como un NPC de pueblo: siempre en el mismo sitio, siempre diciendo lo mismo, y a nadie le importa una mierda.',

      'Nada. Tu perfil es tan soso que si fueras un plato serías arroz blanco sin sal. Sustento básico y cero emoción, hostia.',

      'Cero femboy, cien por cien gris. Felicidades por ser el tipo más olvidable que ha pasado por este comando, coño.',

      'Limpio de todo. Incluido de carisma, de gracia y de cualquier rasgo que te haga memorable, joder. Un puto fantasma beige.',

      'Nada de estética ambigua, [nombre]. Masculinidad de catálogo sin filtro, joder El grupo ya lo tiene claro sin forzar el drama, joder.',

      'Cero pose cute. [nombre] no vende el pack ni por error, cabrón El grupo ya lo tiene claro sin forzar el drama, mierda.',

      'El low te absuelve del disfraz, [nombre]. No hay casi, gilipollas El grupo ya lo tiene claro sin forzar el drama, coño.',

      '[nombre], ni un atisbo del look. Solo el mismo de siempre, mierda El grupo ya lo tiene claro sin forzar el drama, cabrón.',

      'Sin maquillaje metafórico ni literal. [nombre] fuera del tramo, coño El grupo ya lo tiene claro sin forzar el drama, gilipollas.',

      'No hay almost de estética. Low limpio, [nombre], asco El grupo ya lo tiene claro sin forzar el drama, patético.',

      '[nombre], masculinidad sin misterio ni tutorial de TikTok, patético El grupo ya lo tiene claro sin forzar el drama, asco.',

      'El detector de femboy ni se molesta, [nombre], basura El grupo ya lo tiene claro sin forzar el drama, basura.',

      'Cero pack. [nombre] no juega a ese juego, ridículo El grupo ya lo tiene claro sin forzar el drama, ridículo.',

      'Fuera de la estética por ausencia total, [nombre], fracasado El grupo ya lo tiene claro sin forzar el drama, fracasado.',

      '[nombre], ni el filtro te acerca al estereotipo, joder El grupo ya lo tiene claro sin forzar el drama, joder.',

      'Sin pose. Sin drama de identidad estética, [nombre], cabrón El grupo ya lo tiene claro sin forzar el drama, mierda.',

      'Low merecido: no hay material de femboy, [nombre], gilipollas El grupo ya lo tiene claro sin forzar el drama, coño.',

      '[nombre], tan fuera del look que el comando sobra, mierda El grupo ya lo tiene claro sin forzar el drama, cabrón.',

      'Nada que señalar en el espejo del tramo, [nombre], coño El grupo ya lo tiene claro sin forzar el drama, gilipollas.',

      'El almost no existe. Solo el no, [nombre], asco El grupo ya lo tiene claro sin forzar el drama, patético.',

      '[nombre], estética de siempre sin curva, patético El grupo ya lo tiene claro sin forzar el drama, asco.',

      'Cero señal. Low y punto, [nombre], basura El grupo ya lo tiene claro sin forzar el drama, basura. Hostia puta, qué nivel.',

      '[nombre], no hay disfraz que evaluar, ridículo El grupo ya lo tiene claro sin forzar el drama, ridículo.',

      'Fuera del catálogo femboy por ausencia, [nombre], fracasado El grupo ya lo tiene claro sin forzar el drama, fracasado.',

    ],
  },

  inutil: {
    name: 'inutil',
    goodIsHigh: false,
    high: [
      'El asco no es odio: es el diagnóstico de una presencia que no suma nada, [nombre]. Cero función útil, joder.',

      'El aporte te saluda desde lejos y tú no contestas, [nombre].joder. Eso no se maquilla con ángulo, asco.',

      'Inútil de puta madre: el high no suaviza el hueco ni el estorbo, [nombre] el nivel te nombra sin permiso, basura.',

      'No hay eco de utilidad: hay eco de hueco en el nivel, [nombre]. Sin una puta tarea cumplida, cabrón, joder.',

      'La clase de aportar te suena a reproche, [nombre], coño. Cero función útil, gilipollas. Hostia puta, qué nivel.',

      'Ni para el drama sirves: solo rellenas silencio con más vacío, [nombre]. Ni para relleno sirves, patético.',

      'Inútil de saldo, [nombre]: si hay que elegir entre hacerlo tú o no hacerlo, sale mejor no hacerlo. Y esa cuenta la hemos hecho ya varias veces, gilipollas.',

      'Se te ve venir el vacío en la primera palabra del mensaje del hilo, [nombre]. Sin una puta tarea cumplida, basura.',

      '[nombre], eres inútil hasta para ocupar espacio en el puto chat. Cero función útil, ridículo, joder.',

      '[nombre], eres el nombre que se tacha primero cuando hay que repartir trabajo importante. Sin debate y sin pena. Puta basura. De recurso.',

      'Inútil de manual: ni para el drama aportas algo que no sea ruido de fondo, [nombre]. Sin anestesia, patético.',

      'Has firmado lo inútil en cada mensaje largo que no sostiene nada del hilo, [nombre]. Sin una puta tarea cumplida, mierda.',

      'No hay misterio útil: hay previsible vacío en el nivel del comando, [nombre]. Cero función útil, coño.',

      'El promedio de inutilidad es el nivel: no un mal día, el suelo del high, [nombre]. Ni para relleno sirves, cabrón.',

      'Eres el que se lleva lo fácil en cada reparto, [nombre], y aun así lo entrega tarde y mal. Ahí ya no hay excusa posible, gilipollas.',

      'Inútil de superficie suficiente: no hace falta el sótano del historial, [nombre]. Sin una puta tarea cumplida, patético.',

      'La vergüenza ajena te sigue cuando pretendes ser necesarios en el chat, [nombre]. Cero función útil, asco.',

      'Inútil visible desde la autovía del chat: el letrero se ve, la parada no compensa, [nombre], sin maquillaje posible, coño.',

      'Inútil de las que el mute ajeno interpreta como misterio y no como desinterés, [nombre] el nivel te nombra sin permiso, cabrón.',

      'Inútil de error crónico: confundes mute con misterio en el ranking, [nombre]. Sin una puta tarea cumplida, fracasado.',

      'Tu forma de contribuir es asentir a lo que decidan otros. Eso no es contribuir, gilipollas. Eso es hacer bulto con opinión.',

      'Inútil documentado: el ranking de aporte te deja donde mereces sin debate, [nombre]. Ni para relleno sirves, mierda.',

      'El grupo funcionaría igual sin ti y el experimento mental ya está hecho, [nombre]. El ranking firma y listo, coño.',

      'El listón de lo útil lo miras desde abajo y no has subido un peldaño, [nombre]. Se ve desde el primer mensaje, cabrón.',

      'Inútil de historial público: no hace falta escarbar el vacío del aporte, [nombre]. Cero función útil, gilipollas.',

      'Inútil de fondo de ranking: siempre ahí, siempre sin peso en el hilo, [nombre]. Eso no se maquilla con ángulo, patético.',

      'Has hecho de lo inútil tu estribillo y el estribillo ya no tiene público, [nombre] el nivel te nombra sin permiso, asco.',

      'Nadie te pregunta ya cómo va lo tuyo porque la respuesta se sabe: mal, tarde y a medias. Puta previsibilidad de mierda.',

      'Inútil con las mismas cartas manchadas de siempre y sin plan B, joder, diagnóstico cerrado. Cero función útil, ridículo.',

      'Inútil de cartel vacío: se ve el marco. y no hay obra detrás del nick, [nombre]. Ni para relleno sirves, fracasado.',

      'Llevas años sin una responsabilidad real y te quejas de que no confían en ti. Nadie confía en un puto lastre, cabrón.',

      'Inútil de los que ocupan sitio y no condicionan ni un hilo del chat, [nombre]. Se ve desde el primer mensaje, y, asco.',

      'Tienes el aura del cenicero que nadie vacía: presente y olvidado, [nombre]. anestesia. Cero función útil, coño.',

      'Has hecho del no condicionar el hilo una marca personal del ranking, [nombre]. Eso no se maquilla con ángulo, el chat ya lo sabía, ridículo.',

      'Tienes más huecos en el aporte que un colador de feria al cierre, [nombre] el nivel te nombra sin permiso, nivel sótano puro, fracasado.',

      'Inútil de las que alardean de estar cuando estar no es aportar, [nombre]. Sin una puta tarea cumplida, patético.',

      'La dignidad de aportar te hace autostop y tú no paras en el arcén, [nombre]. Cero función útil, asco.',

      'Inútil sin capa de carisma que disimule el agujero. Ni para relleno sirves, basura. Hostia puta, qué nivel.',

      'Inútil de cartas en blanco: el mismo mazo vacío en cada mano, [nombre]. El ranking firma y listo, cabrón.',

      'Has hecho de la inutilidad una presencia estable en el chat, [nombre]. Se ve desde el primer mensaje, gilipollas.',

      'Inútil de racha perfecta: lo único que no fallas es no servir, [nombre]. Cero función útil, joder. Hostia puta, qué nivel.',

      'Inútil de las que el grupo no cita porque no hay qué citar, [nombre]. Eso no se maquilla con ángulo, con el grupo de testigo, asco.',

      'Has hecho ranking de inutilidad y el oro es tuyo sin rival, [nombre] el nivel te nombra sin permiso, sin maquillaje posible, basura.',

      'No es silencio estratégico: es ausencia de contenido útil, [nombre]. Sin una puta tarea cumplida, cabrón.',

      'El listón de lo útil está lejos y no has dado un paso, [nombre]. Cero función útil, gilipollas, joder.',

      'Pedirte un favor es la forma más rápida de acabar haciéndolo tú mismo. Todo lo que tocas hay que rehacerlo entero, así que ya nadie te pide una puta cosa. Eres trabajo doble con patas, inútil.',

      'Tu vida entera cabe entre la cama y el móvil, y de ahí no te saca ni una grúa. Un inútil acomodado en su propia mierda que llama "estar tranquilo" a no servir para nada.',

      '[nombre], eres un inútil con antigüedad. Todo lo que tocas hay que rehacerlo entero, y rehacerlo cuesta más que hacerlo desde cero. Puto trabajo doble con patas.',

      'Inútil de mierda, [nombre]. Ni sirves para lo fácil, que es donde casi todo el mundo se salva. Un cero a la izquierda con capacidad de estropear cosas.',

      'No tienes oficio, ni beneficio, ni la menor intención de buscar ninguno. Eres un puto cero a la izquierda al que la vida dejó a medias y del que nadie espera ya nada.',

      'Llevas la vida entera de brazos cruzados esperando que algo pase solo, y no pasa nada, porque para que pase habría que mover el culo y eso te queda enorme, vago de mierda.',

      'Las plantas de plástico aportan más a una casa que tú a cualquier proyecto. Al menos ellas no comen, no cagan y no abren la puta boca para no decir nada. Tú haces las tres y encima pides wifi.',

      'Todo lo que empiezas lo dejas tirado a medias, igual que el resto de tu puta vida. No terminas ni una sola cosa, porque acabar algo pide un esfuerzo que no has hecho jamás.',

      'Eres lo que pasa cuando alguien no lo intenta nunca en toda su vida: un saco de carne con pulso que ocupa espacio, gasta oxígeno y no produce una puta cosa de provecho.',

      'El grupo te aguanta como se aguanta una mancha de mierda. En el váter que no se va: nadie sabe de dónde salió, a nadie le sirve, y da más pereza quitarte que soportarte. Puro estorbo con pulso.',

      'Eres el que hace preguntas cuya respuesta está a un clic, [nombre]. Cada vez, sin fallar una. Puto pesado con conexión a internet y sin ganas de usarla.',

      'Pedirte un favor es la forma más rápida de acabar haciéndolo tú mismo, [nombre]. Por eso ya nadie te pide una puta cosa. Aprendieron a base de golpes Hostia puta, basura.',

      'Tu único mérito es servir de aviso de en qué no hay que convertirse. El grupo te señala cuando quiere explicar lo que es no valer para una puta cosa.',

      '[nombre], tu currículum vital cabe en un post-it y sobra espacio. Veintitantos años de existencia y ni una línea que merezca la pena leer, fracasado.',

      '[nombre], tu contribución más consistente al grupo es el trabajo extra que generas a los demás. Y ni eso lo haces con gracia. Puto lastre con nombre.',

      '[nombre], tu manera de resolver un problema es esperar a que lo resuelva otro. Y funciona siempre, cabrón, porque siempre hay alguien más útil cerca.',

      '[nombre], inútil de manual: tu forma de aprender es que otro lo haga delante mientras miras. Y ni así se te queda. Puto desastre con memoria de pez.',

      '[nombre], llevas años a la sombra de gente que hace tu parte además de la suya. Y encima te quejas del reparto. Puto muerto de hambre sin vergüenza.',

      'Tu presencia en cualquier tarea la alarga, [nombre]. Ese es el único efecto medible que tienes sobre el mundo. Enhorabuena, puto agujero de tiempo.',

      '[nombre], tu única aportación consistente ha sido el trabajo extra que generas a los demás. Y en eso no fallas ni un puto día. Enhorabuena, lastre.',

      'Inútil con experiencia, [nombre]. Más de veinte años y sigues decepcionando a todo el que comete el error de contar contigo. Basura. Con historial.',

      'Inútil de saldo, [nombre]: cuando se reparte trabajo siempre te toca lo más fácil. Y aun así llega tarde y mal. Ahí ya no hay puta excusa posible.',

      '[nombre], eres el que se escaquea con una habilidad que ya quisieras tener para el trabajo. Ahí sí eres rápido, cabrón. En todo lo demás, un cero.',

      '[nombre], inútil de saldo: haces las cosas a medias y luego te ofende que las rehagan. Ese enfado es lo más gracioso de todo el asunto, pringado.cabrón.',

      '[nombre], inútil de esos que se ofrecen voluntarios y luego desaparecen. Ese ciclo lo tenemos medido y cronometrado, pringado. Falla a la semana, gilipollas.',

      'Tu presencia en un equipo obliga a repartir tu parte entre los demás. Ese es tu efecto real: un puto agujero por el que se cuela el tiempo ajeno.',

      'Nadie te delega nada difícil, [nombre], porque el coste de que salga mal es demasiado alto. Puro cálculo, cabrón. Nada personal, solo aritmética.',

      '[nombre], todo lo que empiezas lo termina otro. Siempre otro, y ese otro luego pide que no te vuelvan a llamar. Basura. Con historial documentado.',

      'Eres el que necesita supervisión para cosas que un niño haría solo, [nombre]. Y encima te ofende que estén encima. Puta susceptibilidad sin base.',

      'Eres el que estropea lo que ya estaba hecho, [nombre]. Un talento inverso, específico y absolutamente devastador. Puta capacidad de destrucción.',

      'Eres el que se compromete verbalmente con todo y ejecuta absolutamente nada, [nombre]. Ya nadie te cree y aun así lo sigues diciendo. Patético.',

      'Eres el que dice que se encarga y no se encarga nunca, [nombre]. Ya nadie te cree y aun así lo sigues diciendo. Puta cara dura sin resultados.',

      'Tienes el historial de un hilo que nadie retoma, [nombre]. Ni para relleno sirves, basura. Hostia puta, qué nivel.',

      'Eres como un consolador sin pilas: tienes la forma de algo con función y ahí se acaba el parecido. Decorativo, inútil y ahí tirado en un cajón que nadie abre. Puro estorbo con apariencia de servir, basura.',

      'Ese potencial del que tanto presumías te lo inventaste tú solo. Década y media después no has dado ni un palo al agua, y ya nadie espera nada de un inútil como tú, ridículo.',

      'Eres tan vago que ni a serlo le echas ganas. Pospones hasta el respirar, y lo único que produces en todo el santo día es la marca de tu culo en el sofá, inútil, fracasado.',

      '[nombre], inútil de manual: te comprometes con todo y cumples con nada. Un patrón perfecto, sostenido en el tiempo y sin una sola excepción documentada, joder.',

      'Tu día productivo consiste en hacer la cama, cascártela dos veces y necesitar una siesta para recuperarte del esfuerzo. Eres un protector de pantalla con DNI y menos utilidad que un preservativo pinchado, mierda.',

      'Inútil de manual, [nombre]: cuando algo sale bien no estabas, y cuando sale mal sí. Es una correlación tan clara que ya no hace falta investigarla, coño.',

      '[nombre], llevas años sin desarrollar una sola habilidad. Ni por interés, ni por necesidad, ni por vergüenza. Un vacío sostenido con constancia, cabrón.',

      'Inútil total, [nombre]. Ni sirves para follar decente, ni para ser amigo, ni para nada que valga la pena. Solo ocupas espacio y gastas oxígeno, patético.',

      'Inútil con más excusas acumuladas que tareas completadas, [nombre]. Esa proporción es tu biografía entera y da bastante pena leerla del tirón, asco.',

      'Inútil con experiencia. Más de 20 años y sigues siendo un cero a la izquierda que decepciona a todo el que comete el error de contar contigo, basura.',

      'Inútil de manual, [nombre]: haces la parte fácil, mal, y esperas reconocimiento por ello. Esa cara dura es lo único que tienes desarrollado, ridículo.',

      'Inútil total, [nombre]. Ni oficio, ni beneficio, ni la más mínima intención de buscarse ninguno. Ocupas espacio y gastas oxígeno, poco más, fracasado.',

      '[nombre], llevas años sin producir nada que sobreviva a la semana siguiente. Ni una cosa. Un desperdicio de silla, de tiempo y de oxígeno, joder.',

      'El precio de tu repertorio vacío lo paga el hilo en tiempo perdido del chat, [nombre]. Sin una puta tarea cumplida, mierda.',

      'Inútil de manual, [nombre], con la costumbre de repetir errores que ya se te señalaron tres veces. Ni corrigiéndote se arregla esta mierda.',

      'Eres el que necesita supervisión para cosas que un niño haría solo, [nombre]. Y encima te ofende que estén encima. Puto inútil susceptible Hostia puta, gilipollas.',

      '[nombre], inútil de mierda: tu forma de trabajar necesita tanta supervisión que sale más barato hacerlo sin ti. Y eso ya lo han calculado.',

      '[nombre], tu forma de comprometerte es verbal. Solo verbal. Nunca ha pasado de la boca y a estas alturas ya nadie espera que pase, cabrón.',

      'Tienes la utilidad de un mando sin pilas: se ve, no sirve, estorba en el ranking, [nombre]. Cero función útil, asco.',

      'Inútil de superficie: basta la vista, no hace falta el sótano del historial, [nombre]. Ni para relleno sirves, basura.',

      'La dignidad no te coge el teléfono: el buzón está lleno de silences, [nombre]. Sin anestesia, cabrón.',

      'Inútil cutre y sin complejo: el complejo pediría espejo, [nombre] y. Delante del ranking y de la cara, patético.',

      '[nombre], tu única habilidad demostrada es generar trabajo a los demás. Y en eso sí eres constante, cabrón. Ahí no fallas ni un solo día.',

      'Inútil de error de lectura: confundes estar con importar en el chat del grupo, [nombre]. Ni para relleno sirves, mierda.',

      'Inútil de saldo, [nombre]: preguntas si hay que hacer algo cuando ya está hecho. Cada vez. Un puto reloj parado con capacidad de hablar.',

      '[nombre], tu manera de gestionar la presión es desaparecer del mapa. Sin avisar y sin volver. Puto cobarde con historial de deserciones.',

      '[nombre], nadie te confía nada importante y llevas años sin preguntarte por qué. Puto ciego voluntario con veinte años de datos delante.',

      'Eres el que necesita supervisión para cosas que un niño haría solo, [nombre]. Y encima te ofende que estén encima. Puta susceptibilidad Hostia puta, asco.',

      'Se te nota que bajaste del tren del aporte hace tiempo y perdiste el billete, [nombre]. Sin anestesia, mierda.',

      'Tu forma de participar es hacer bulto, [nombre]. Y a veces ni eso, porque llegas cuando ya se está recogiendo. Puto relleno con nombre.',

      'Llevas años sin que nadie diga esto lo hizo bien y refiriéndose a ti, [nombre]. Ni una vez. Y eso no es mala suerte, cabrón, son datos.',

      '[nombre], nadie te espera para empezar nada. Empiezan y ya te enteras si te enteras. Ahí tienes tu peso exacto en este grupo, pringado.gilipollas.',

      'Inútil sin redención: el hueco que dejas cuando te vas es un alivio medible, [nombre]. El chat te usa de ambientación, qué nivel de pena.',

      'Has convertido el no aportar en un hábito y el hábito en identidad del ranking, [nombre]. Sin una puta tarea cumplida, basura.',

      'No es discreción: es falta de material útil con nick incluido en el ranking, [nombre]. Cero función útil, qué cutre.',

      'Inútil de estribillo que empeora con cada repetición del mismo vacío, [nombre]. Ni para relleno sirves, da pena ajena.',

      'Llevas años sin producir nada que aguante una semana. Ni una cosa. Todo lo tuyo caduca antes de terminarse. Puta comida en mal estado, qué vacío.',

      'Eres el que pide plazo, incumple el plazo y luego pide otro, [nombre]. Un bucle perfecto de mierda que ya nadie tiene ganas de romper, indignante.',

      'Inútil constante: la única racha que mantienes es la de no servir en el chat, [nombre]. Cero función útil, asco, qué vergüenza ajena.',

      'Inútil de feria ambulante: ruido sin recuerdo bueno en el historial del chat, [nombre]. Ni para relleno sirves, basura.',

      'Has firmado lo inútil como quien no sabe firmar otra cosa en el ranking, [nombre]. El chat te usa de ambientación, ridículo.',

      'No hay misterio de inutilidad interesante: hay lo previsible del high, [nombre]. Sin una puta tarea cumplida, fracasado.',

      '[nombre], nadie te espera para empezar nada. Empiezan y ya te enteras si te enteras. Ahí tienes tu peso real en este grupo, pringado.patético Hostia puta, qué pena.',

      'Inútil de feria: ruido, cero sustancia, el suelo igual de sucio del ranking, [nombre]. Ni para relleno sirves, patético.',

      'Inútil de inercia: el grupo te soporta por costumbre, no por interés real, [nombre]. Sin anestesia, basura.',

      'La vergüenza ajena te sigue cuando intentas parecer necesarios en el hilo, [nombre]. Sin una puta tarea cumplida, qué cringe.',

      'Tu forma de participar es preguntar si hay que hacer algo cuando ya está hecho. Cada vez. Puto reloj parado con capacidad de hablar, da asco.',

      '[nombre], eres el que pide ayuda antes de intentarlo. Y a veces sin intentarlo siquiera. Ni la pereza justifica ese nivel de mierda, qué vergüenza.',

      'El recato de no hablar no te salva: cuando hablas se confirma el diagnóstico, [nombre]. El chat te usa de ambientación, asco, ridículo.',

      'Se te nota la prisa por ocupar sitio y cero plan de justificarlo en el chat, [nombre]. Sin una puta tarea cumplida, basura.',

      'Tienes el tono de quien acumula mensajes sin acumular peso en el ranking, [nombre]. Cero función útil, ridículo.',

      'Has convertido el no servir en carnet de identidad del ranking del grupo, [nombre]. Ni para relleno sirves, fracasado.',

      'Inútil de superficie: la profundidad no aparece ni con zoom del historial, [nombre]. Sin anestesia, patético.',

      'Llevas años sin que se te ocurra nada. Ni una idea, ni una mejora, ni una puta propuesta. Un cero a la izquierda con silla propia, basura.',

      'Tienes más ausencias de criterio que mensajes con sustancia en el chat, [nombre]. Cero función útil, qué cutre.',

      'La dignidad del aporte no para: tú eres el tráfico del arcén del ranking, [nombre]. Ni para relleno sirves, da pena ajena.',

      'Inútil de inercia: el grupo te lee por costumbre, no por interés real, [nombre]. El chat te usa de ambientación, qué vacío.',

      'Tienes el tono de noches de chat sin una frase que pese en el ranking, [nombre]. Sin una puta tarea cumplida, patético.',

      'Llevas años pidiendo que te expliquen cosas que ya deberías dominar dormido. Puto eterno aprendiz sin una sola lección aprendida, qué vergüenza ajena.',

      'Tu manera de hacerte notar es preguntar obviedades en el peor momento. Puto pesado con conexión a internet y sin ganas de usarla, da vergüenza.',

      'Tienes el historial de un cierre sanitario de sustancia en el ranking, [nombre]. Sin anestesia, qué flojo.',

      'Inútil visible desde lejos: el letrero no compensa la parada del chat, [nombre]. Sin una puta tarea cumplida, fracasado.',

      'Se te nota que perdiste el mapa del aporte hace tiempo en el ranking, [nombre]. Cero función útil, qué pena.',

      'Nadie confía en que termines nada, y esa desconfianza te la has ganado a pulso durante años. No es prejuicio, cabrón, son datos, patético.',

      'Tu aportación de valor es exactamente ninguna. Y eso no es una opinión, cabrón, se sostiene con años de datos y sin excepciones, miserable.',

      'Has dejado el chat como obra sin plano: escombro de mensajes sin función, [nombre]. Sin una puta tarea cumplida, qué cringe.',

      'Tienes más episodios de no aportar que de intentarlo en serio en el chat, [nombre]. Cero función útil, da asco.',

      'Tu manera de resolver un conflicto es no estar cuando ocurre. Y siempre lo consigues, puto cobarde. Ahí sí que tienes puntería, qué vergüenza.',

      'Nadie te tiene en cuenta para nada serio y llevas años sin preguntarte por qué. Puto ciego voluntario con la respuesta delante, ridículo.',

      'No es gracia seca: es vacío sin gracia en el nivel del comando, [nombre]. Sin una puta tarea cumplida, basura.',

      'La dignidad del aporte hace autostop y el tráfico eres tú en el ranking, [nombre]. Cero función útil, ridículo.',

      '[nombre], inútil de mierda: no sabes hacer, no sabes pedir ayuda y no sabes apartarte. El pack completo del estorbo con patas, da grima.',

      'Inútil de malinterpretar el silencio ajeno como interés por el vacío, [nombre]. El chat te usa de ambientación, qué nivel de pena.',

      'Se te nota el hábito de empujar cada hilo hacia ninguna parte útil, [nombre]. Sin una puta tarea cumplida, basura.',

      'Nadie ha aprendido nunca nada de ti. Ni una técnica, ni un truco, ni una puta cosa. Estéril hasta para servir de mal ejemplo, qué cutre.',

      'Tu forma de participar es hacer bulto. Y a veces ni eso, porque llegas cuando ya se está recogiendo. Puto relleno con nombre, da pena ajena.',

      '[nombre], tu manera de gestionar el tiempo es no gestionarlo. Todo llega tarde o no llega. Puto agujero negro con calendario, qué vacío.',

      '[nombre], tu única aportación medible es el tiempo que le quitas a los demás. Y en eso sí eres constante, puto agujero negro, indignante.',

      'Se te nota el arrastre de no empujar nunca hacia arriba del ranking, [nombre]. Cero función útil, asco, qué vergüenza ajena.',

      'El listón de lo útil está enterrado y tú bailas encima en el chat, [nombre]. Ni para relleno sirves, basura.',

      'Inútil de malinterpretar el silencio como invitación a seguir vacíos, [nombre]. El chat te usa de ambientación, ridículo.',

      'Llevas años ocupando un puesto que no exige nada y aun así te queda grande. Piénsalo un segundo, si es que puedes, pringado.gilipollas.',

      'Tu manera de gestionar el tiempo es no gestionarlo. Todo llega tarde o no llega. Puto agujero negro con calendario de pared, qué pena.',

      'Tu manera de gestionar la presión es desaparecer del mapa. Sin avisar y sin volver. Puto desertor con historial documentado, patético.',

      'La compostura del aporte no te reconoce en el ranking del grupo, [nombre]. Sin anestesia. El chat te usa de ambientación, miserable.',

      'No hay barniz de personaje: hay inutilidad pura en el nivel, [nombre]. Sin una puta tarea cumplida, qué cringe.',

      'No hay barniz: hay inutilidad pura en el nivel del comando, [nombre]. Cero función útil, gilipollas, da asco.',

      'Tienes más huecos que un delantal de aporte al cierre del ranking, [nombre]. Ni para relleno sirves, patético.',

      'Se te oye el hueco cada vez que intentas aportar, [nombre]. El chat te usa de ambientación, asco, ridículo.',

      'Inútil de mierda, [nombre]: cuando se reparte trabajo, la gente prefiere hacerlo con menos manos que contar con las tuyas, fracasado.',

      'Tu manera de asumir un error es explicar por qué no era tuyo. Siempre igual, cabrón. No has firmado una cagada en tu vida, qué miseria.',

      'Llevas años sin un resultado que puedas señalar y decir esto lo hice yo. Ni uno pequeño. Puta hoja de servicios en blanco, da grima.',

      'Tu única aportación consistente ha sido el trabajo extra que generas a los demás. Y en eso sí eres constante, puto lastre, qué nivel de pena.',

      '[nombre], tu manera de ayudar es preguntar tanto que al final lo hace el que responde. Un método muy tuyo y muy de mierda, basura.',

      'Se te oye el tacón del listón bajo hasta en los neutros del chat, [nombre]. Cero función útil, coño, qué cutre.',

      'Inútil cutre: ni el silencio tiene estilo ni la presencia tiene función, [nombre]. Ni para relleno sirves, da pena ajena.',

      'La clase de aportar te suena a reproche en el ranking del grupo, [nombre]. El chat te usa de ambientación, qué vacío.',

      'Inútil de fondo de ranking: bajas la media de sustancia del chat, [nombre]. Sin una puta tarea cumplida, patético.',

      'Has hecho de lo inútil tu estribillo sin público nuevo en el hilo, [nombre]. Cero función útil, asco, qué vergüenza ajena.',

      'Has hecho ranking de no aportar y vas primero sin rival serio, [nombre]. Ni para relleno sirves, basura.',

      'Se te ve venir el vacío en la primera frase del mensaje del hilo, [nombre]. Sin anestesia, ridículo.',

      'Inútil de racha: lo único constante es no servir en el ranking, [nombre]. Sin una puta tarea cumplida, fracasado.',

      'Inútil de feria: ruido, cero recuerdo, suelo peor del ranking, [nombre]. Cero función útil, joder. Hostia puta, qué nivel, qué pena.',

      'El grupo paga tu repertorio vacío en tiempo del hilo del chat, [nombre]. Ni para relleno sirves, patético.',

      'Tu forma de responder a una crítica es no cambiar nada. Ni un detalle, nunca. Puta pared con orejas y sin nada detrás, miserable.',

      'No es estilo minimalista: es vacío previsible del nivel, [nombre]. Sin una puta tarea cumplida, qué cringe.',

      'Inútil de ceja ajena levantada y respeto en cero del ranking, [nombre]. Cero función útil, da asco.',

      'Inútil de letrero mojado: se lee y no invita a bajar al aporte, [nombre]. Ni para relleno sirves, patético.',

      'Inútil de cartas en blanco en cada mano del hilo del grupo, [nombre]. Sin anestesia. El chat te usa de ambientación, asco, ridículo.',

      'Tienes el aura del icono que nadie toca en el chat del grupo, [nombre]. Sin una puta tarea cumplida, basura.',

      'Has dejado el hilo como obra sin plano en el ranking del grupo, [nombre]. Cero función útil, ridículo.',

      'Nadie te ha visto sostener una tarea larga. Te caes en la primera semana, siempre. Puta resistencia de papel mojado, da grima.',

      'El aporte te saluda y tú no devuelves en el chat del grupo, [nombre]. El chat te usa de ambientación, qué nivel de pena.',

      'Inútil sin el barniz del secundario memorable del ranking, [nombre]. Sin una puta tarea cumplida, basura.',

      'La clase de aportar te suena a ataque en el chat del grupo, [nombre]. Cero función útil, coño, qué cutre.',

      'No hay eco de sustancia: hay eco de hueco en el nivel, [nombre]. Ni para relleno sirves, cabrón, da pena ajena.',

      '[nombre], eres el que pregunta si hay que hacer algo cuando ya está hecho. Cada vez. Puto reloj parado con voz, qué vacío.',

      'Inútil de las que alardean de presencia porque callar las deja sin personaje, [nombre]. Desperdicio, fracasado.',

      'Se te nota el peso de no empujar nunca el hilo hacia arriba, [nombre]. Cero función útil, asco, qué vergüenza ajena.',

      'Tienes el aura de un icono de app desinstalada: sigue en la pantalla y nadie la abre, [nombre]. Fracasado, da vergüenza.',

      'Inútil sin barniz: solo hueco con teclado en el chat, [nombre]. El ranking firma y listo, cabrón. Hostia puta, qué nivel, qué flojo.',

      'Se te nota la falta de sustancia hasta en los mensajes que intentan parecer útiles, [nombre]. Basura, menudo desastre.',

    ],
    mid: [
      'Ni inútil del todo ni útil de verdad. La zona tibia donde vive la gente que no molesta ni ayuda. Delante del listón que no saltaste.',

      'Ni inútil ni resolutivo. Haces lo tuyo cuando es fácil y desapareces cuando se complica sin cuento que lo tape.',

      'Ni inútil ni referencia. En el medio, donde se cuenta contigo para lo que no es crítico en el único idioma que entiende el contador.',

      'Ni inútil ni imprescindible. Estás en la franja de los reemplazables sin drama y el historial no olvida.',

      'Ni útil ni inútil: correcto. Y correcto no genera ni confianza ni desconfianza y no hay modo de suavizarlo.',

      'Ni una cosa ni la otra. Suficiente competencia para pasar, suficientes fallos para que se note sin bis ni matiz de consuelo.',

      'Aportas lo mínimo para no ser el problema. Que es exactamente lo que hace un problema pequeño y el contador no discute.',

      'Tienes lo justo para que te encarguen cosas y nunca lo suficiente para que sean importantes en el segundo más incómodo del chat, da asco.',

      'Ni de fiar del todo ni prescindible del todo. Un intermedio que obliga a supervisar un poco con el peaje cobrado al natural, qué vergüenza.',

      'Ni imprescindible ni un estorbo: relleno. Y el relleno se sustituye sin que nadie lo note sin consuelo de manual barato, ridículo.',

      'Cuando aprietas rindes. El problema es que apretar es exactamente lo que casi nunca haces y. El veredicto no se negocia, fracasado.',

      'Haces lo justo para que no te señalen y ni un dedo más. Estrategia cobarde pero efectiva sin anestesia de verdad esta vez, qué miseria.',

      'Funcionas en condiciones ideales. Como las condiciones nunca son ideales, funcionas poco con la firma legible del comando, da grima.',

      'Ni lo peor ni algo con lo que contar. La medianía perfecta, que es la peor nota de todas sin anestesia de verdad esta vez, qué nivel de pena.',

      'Sirves cuando te apetece, que es distinto de servir. Y todo el mundo nota la diferencia y no hace falta ampliar el parte, basura.',

      'Vales para lo fácil. Lo difícil se lo pasas a alguien y luego te pones la medalla igual sin prórroga ni VAR, qué cutre.',

      'Se puede contar contigo la mitad de las veces. Y nadie sabe nunca cuál mitad va a tocar y el sistema marca el punto final, da pena ajena.',

      'Ni bien ni mal: aceptable. Y aceptable sostenido en el tiempo acaba siendo insuficiente y el hilo sigue sin ti en el centro, qué vacío.',

      'A ratos das el nivel y a ratos das trabajo extra. La proporción está bastante ajustada sin apelación posible hoy, indignante.',

      'Tienes momentos de eficacia rodeados de otros de bastante dejadez. Balance en el medio sin cuento que lo tape, qué vergüenza ajena.',

      'Cumples con lo básico y nada más. Es suficiente para no molestar y poco para destacar y el archivo queda cerrado, da vergüenza.',

      'A veces resuelves y a veces no. Esa inconsistencia es exactamente lo que te deja aquí delante de quien no quería verlo, qué flojo.',

      'Cuando te lo tomas en serio funcionas. El problema es la frecuencia con la que ocurre sin modo avión ni silencio cómplice, menudo desastre.',

      'Tu problema no es la capacidad, es la constancia. Y en esto la constancia lo es todo y. El veredicto no se negocia, qué pena.',

      'Tu manera de trabajar cumple sin brillar. Nadie se queja y nadie te menciona tampoco. Delante del hueco que quedó, patético.',

      'Tu rendimiento depende del humor, y tu humor depende de cosas que no controla nadie sin recurso ni nota al pie, miserable.',

      'A veces resuelves y a veces desapareces. Nadie sabe cuál toca hasta que ya es tarde sin que nadie pida replay, qué cringe.',

      'Haces tu parte si es corta. Si es larga, aparece una excusa perfectamente razonable en el segundo más incómodo del chat, da asco.',

      'Empiezas fuerte y aflojas antes del final. Siempre. Es lo más previsible que tienes con el eco del almost todavía sonando, qué vergüenza.',

      'Sirves de refuerzo, nunca de titular. Y ya llevas suficientes años en el banquillo con el fallo en 4K de chat, ridículo.',

      'Tienes capacidad y muy poca iniciativa. Con la primera se puede; con la segunda no delante de todo el que miraba, fracasado.',

      'A veces asumes responsabilidad y a veces la esquivas. La media es exactamente esta sin prosa que lo maquille, qué miseria.',

      'Tu fiabilidad tiene horario. Fuera de él no respondes de nada y todos lo saben ya sin prosa que lo maquille, da grima.',

      'Cumples si te vigilan. En cuanto nadie mira, la cosa se desinfla bastante rápido y el resto es ruido de fondo, qué nivel de pena.',

      'Ni te delegan lo importante ni te apartan del todo. Un intermedio bastante común y el archivo queda cerrado, basura.',

      'Ni estorbas ni ayudas mucho. Estás en la franja donde nadie tiene nada que decir y. El ranking no pide permiso, qué cutre.',

      'Ni útil ni un lastre. Un término medio que en un grupo se acepta sin comentarios con el número en la frente del mensaje, da pena ajena.',

      'Tienes criterio para saber qué hacer. Lo que falla es ponerte a hacerlo a tiempo y el hilo no pide amplificación, qué vacío.',

      'Prometes rápido y entregas despacio. Ese desfase acaba costándole tiempo a otro en alta resolución de group chat, indignante.',

      'Tu rendimiento depende del interés que le tengas. Y eso no es un sistema fiable y el contador no discute, qué vergüenza ajena.',

      'Cuando el asunto te importa rindes bien. Cuando no, se nota mucho la diferencia con testigos obligados en el hilo, da vergüenza.',

      'Ni te echan de menos ni te echan la bronca. Existes en modo neutro permanente en el idioma seco del ranking, qué flojo.',

      'Ni caso perdido ni gente de confianza. Justo en la mitad y sin moverte de ahí sin letra pequeña que lo salve, menudo desastre.',

      'A ratos hay que rehacerte cosas y a ratos entregas perfecto. Sin patrón claro. Sin derecho a matiz útil, qué pena.',

      'Tienes suficiente para no ser un lastre y nunca lo bastante para ser un apoyo sin consuelo de consola, patético.',

      'Tu iniciativa aparece a ratos y desaparece igual de rápido. Ahí está el freno con el peaje cobrado al natural, miserable.',

      'Tu rendimiento sube cuando hay presión y baja en cuanto se relaja el ambiente en el momento que más dolía soltarlo, qué cringe.',

      'A ratos resuelves solo y a ratos necesitas ayuda para lo mismo. Eso descoloca y el archivo queda cerrado, da asco.',

      'A ratos entregas bien y a ratos hay que revisarte. La media queda justo aquí sin maquillaje ni segunda toma, qué vergüenza.',

      'Ni desastre ni garantía. En el punto donde te dan tareas medianas y nada más delante de la evidencia del contador, ridículo.',

    ],
    low: [
      'Nada de inútil. Cuando dices que lo haces, lo haces. Aquí eso vale oro en el recuento que no perdona.',

      'Sin material. Ni una tarea devuelta, ni un plazo incumplido, ni una excusa en el historial delante de quien no quería verlo.',

      'Sin material. Tu forma de resolver es tan limpia que ni se comenta. Simplemente funciona sin segunda oportunidad hoy.',

      'Limpio. Funcionas bien y sin ruido. El grupo se apoya en gente como tú sin darse cuenta. Delante del hueco que quedó.',

      'Nada por aquí. Si todos fueran como tú en esto, este grupo funcionaría el doble de bien sin segunda oportunidad hoy.',

      'Cero por ciento. Tu palabra en un compromiso vale, y eso te ha costado años construirlo y el contador insiste.',

      'Cero por ciento. Se puede contar contigo, cosa que no se puede decir de casi nadie más con el resultado ya consumado.',

      'Cero. Tienes iniciativa: no esperas instrucciones, ves lo que hay que hacer y lo haces en el idioma seco del ranking.',

      'Cero por ciento. Sabes pedir ayuda cuando toca, que también es una forma de ser eficaz delante de todo el que miraba.',

      'Cero por ciento. Eres de los que hacen que un imposible se convierta en un calendario. Delante del hueco que quedó.',

      'Limpio. Anticipas los problemas en vez de reaccionar a ellos. Media victoria está ahí. Y el chat archiva sin debate.',

      'Cero. Sirves de verdad, sin excusas y sin que haya que estar detrás. Rareza absoluta. Delante del listón que no saltaste.',

      'Cero por ciento. Capaz y constante. Ahora dinos qué falla en el resto de tus números sin suavizar el golpe del número.',

      'Limpio. La gente te pide cosas porque sabe que salen. Ese es el mejor examen que hay y el hilo sigue sin ti en el centro.',

      'Cero por ciento. Se te delega lo difícil precisamente porque no hay que estar encima con el parte firmado debajo.',

      'Limpio. Resuelves sin necesidad de preguntar tres veces. Ahí está toda la diferencia con. El bot como notario del fallo.',

      'Sin rastro. Cuando algo se complica, sigues ahí. Y ahí es donde se ve quién es quién sin maquillaje ni segunda toma.',

      'Cero por ciento. Eres el que arregla lo que otros rompen. Poco glamour, mucho valor sin suavizar el golpe del número.',

      'Sin material. Tu presencia en un proyecto reduce el trabajo de todos, no lo aumenta y el archivo queda cerrado.',

      'Cero. No necesitas supervisión, y eso en este grupo es prácticamente un superpoder en el parte que nadie borra.',

      'Sin rastro. Cuando el grupo tiene un problema, tu nombre sale solo. Por algo será y el contador no discute.',

      'Limpio. Tienes la disciplina de hacer lo aburrido bien, y ahí se decide casi todo sin prosa que lo maquille.',

      'Nada. La gente aprende trabajando contigo, y eso no se puede fingir ni una semana sin bis ni matiz de consuelo.',

      'Cero por ciento. Tu eficacia no depende del ánimo ni del contexto. Rindes siempre con el número en la frente del mensaje.',

      'Sin rastro de inutilidad. Trabajas bien, cumples y no lo vas contando. Impecable sin cuento que lo tape.',

      'Nada. Aprendes rápido y no hay que explicarte lo mismo dos veces. Eso vale mucho sin descuento por empatía.',

      'Limpio del todo. Lo que tocas queda mejor de como estaba. Siempre, sin excepción. Delante del marcador en vivo.',

      'Cero. Nunca has dejado nada a medias y esa constancia se te reconoce sin decirlo en el segundo más incómodo del chat.',

      'Nada. Haces que las cosas parezcan sencillas, y eso es lo más difícil que existe sin bis ni matiz de consuelo.',

      'Cero por ciento. Cuando dices que te encargas, el tema se puede dar por cerrado con el dígito firmando solo.',

      'Nada. Resuelves problemas que otros ni saben describir. Y sin darle importancia delante de quien no quería verlo.',

      'Cero por ciento. Tu trabajo no necesita una segunda pasada. Sale bien de origen y el historial no olvida.',

      'Nada por aquí. Nadie ha tenido que rehacerte un trabajo nunca. Ni una sola vez con el eco del almost todavía sonando.',

      'Limpio. Eres de los que aparecen cuando falta gente, no de los que desaparecen sin maquillaje ni segunda toma.',

      'Nada. Tienes iniciativa y criterio, que es la combinación que casi nadie reúne y no hace falta ampliar el parte.',

      'Cero. Lo que te encargan sale bien y a la primera. No hace falta revisar nada y el sistema marca el punto final.',

      'Cero. Haces también la parte aburrida y sin quejarte. Ahí se decide casi todo. Y el chat archiva sin debate.',

      'Cero. Tu manera de trabajar hace que los demás puedan confiar y desentenderse con el saldo a la intemperie.',

      'Nada. Aportas más de lo que se te pide y sin convertirlo en un mérito público y. El veredicto no se negocia.',

      'Limpio del todo. Aquí no hay nada que rascar y no será porque no hayan mirado sin suavizar el golpe del número.',

      'Nada. Terminas lo que empiezas, que suena a poco y es lo más raro que existe en el segundo más incómodo del chat.',

      'Limpio del todo. La gente te busca para lo importante porque sabe cómo acaba con testigos obligados en el hilo.',

      'Cero. La gente delega en ti y deja de preocuparse. No hay mejor nota que esa con la cara del resultado a la vista.',

      'Cero. Eres de los que aparecen cuando hace falta. Poquísimos, y tú eres uno y. El ranking no pide permiso.',

      'Nada de nada. Cumples plazos sin necesidad de que te los recuerden. Un lujo. Delante del listón que no saltaste.',

      'Cero por ciento. Cuando algo depende de ti, sale adelante. Es así de simple sin consuelo de consola.',

      'Sin rastro. Eres el que sostiene cuando el resto empieza a buscar la salida con el cargo en firme. Sin filtro de autoayuda.',

      'Cero. Asumes tus errores y los corriges sin que nadie tenga que señalarlos en el segundo más incómodo del chat.',

      'Cero. Ni un solo encargo tuyo ha necesitado explicación posterior. Ninguno con el dígito firmando solo.',

      'Nada. Resuelves en vez de explicar por qué no se puede. Diferencia enorme. Sin filtro de autoayuda sin prórroga ni VAR.',

    ],
  },

  // perdedor / ganador: rasgos con porcentaje por ROL igual que el resto. El %
  // lo da rollPercent según si el target es owner/admin/miembro, así que el owner
  // casi nunca sale perdedor y casi siempre ganador, y al revés con los miembros.
  // [nombre] se sustituye por la mención del target dentro de runPercent.
  perdedor: {
    name: 'perdedor',
    goodIsHigh: false,
    high: [
      '[nombre], eres un puto perdedor con años de rodaje y cero logros que contar. Cero logros que enseñar, joder.',

      'La dignidad del nivel no para el coche: tú eres el tráfico del arcén, [nombre]. Se te ve el fail a la primera, asco.',

      'Perdedor de letrero grasiento: se lee de lejos y no invita a entrar, [nombre]. El fail es tu marca, coño.',

      'Se te nota el hábito de empujar cada tema hacia la misma derrota, [nombre]. Cero logros que enseñar, cabrón.',

      '[nombre], eres un perdedor de mierda. Sin el más mínimo valor. Tan estúpido que ni captas cuando te están destruyendo en la cara, moralmente depravado al punto de que te excita traicionar y joder. A cualquiera que comete el error de acercarse, y tan raro y retorcido que la gente siente que algo anda mal contigo apenas te ven.',

      '[nombre], eres un puto perdedor con años de rodaje. Ni un logro, ni una anécdota, ni una sola vez en que alguien haya dicho tu nombre sin poner cara de pena. basura acumulada con permiso de residencia.',

      '[nombre], perdedor de los que insisten en el mismo error con distinta ropa. Cambias el envoltorio y dentro sigue habiendo la misma puta mierda. De siempre.',

      'Puto fracasado, [nombre]. Tu currículum vital cabe en un post-it y sobra sitio para dibujar la cara de pena que pones cuando alguien te pregunta a qué te dedicas.',

      'Eres basura acumulada con nombre de usuario, [nombre]. Todo lo que empiezas lo termina otro, y ese otro luego pide que no te vuelvan a llamar. Puto trabajo doble con patas.',

      'Fracasado. Hasta para fracasar en grande, [nombre]. Ni eso te sale. Ni un desastre memorable, ni una caída con estilo. Solo mierda. Constante y de bajo presupuesto.',

      '[nombre], tu único mérito es seguir aquí después de tanto ridículo. Y eso no es aguante, cabrón, es que no tienes absolutamente ningún otro sitio donde ir.',

      'Puta mierda. De trayectoria, [nombre]. Si te quitamos las promesas incumplidas no queda absolutamente nada. Ni una línea, ni un logro, ni una excusa nueva.',

      'Puto fracasado. Con opinión, [nombre], que es la peor clase que existe. No has hecho nada y aun así tienes algo que decir sobre lo que hacen los demás.',

      'Eres un fracasado. Con memoria selectiva, [nombre]. Recuerdas victorias que jamás ocurrieron y olvidas las cien veces que quedaste como un puto payaso.',

      '[nombre], perdedor con la estrategia de esperar a ver qué pasa. Nunca pasa nada bueno y encima te sorprende. Puta paciencia de mierda. Mal invertida.',

      '[nombre], la gente no te subestima. Te estima exactamente en lo que vales, que es una puta mierda, y por eso nadie te llama para nada que importe.',

      '[nombre], perdedor de los que repiten el mismo error con distinta ropa. Cambias el envoltorio y dentro sigue la misma puta mierda. De siempre.',

      '[nombre], la gente ya no espera nada de ti, y eso es la forma más educada que existe de decirte que eres basura. Ni te has enterado, cabrón.',

      '[nombre], perdedor de los que ni se reciclan. Tu inutilidad es estructural, tu estupidez es militante, tu depravación es vocacional y tu rareza es clínica. Junta las cuatro y entiendes por qué la gente se aleja de ti por instinto, no por juicio. El cuerpo lo detecta antes que la cabeza, gilipollas.',

      '[nombre], perdedor sin herederos: nadie quiere tu puesto, tu método ni tu sitio. Cuando te vayas, la silla se queda vacía y a nadie le va a importar, gilipollas.',

      '[nombre], perdedor con memoria corta para lo suyo y larguísima para lo ajeno. Muy conveniente y muy patético. Al mismo tiempo, cabrón.',

      '[nombre], has convertido tu incapacidad en personalidad y encima la defiendes en público. Puta bandera de mierda. Y tú de abanderado.',

      'Se te nota el hábito de empujar todo hacia la misma derrota, [nombre]. El fail es tu marca, cabrón, joder.',

      'Perdedor con opinión: la peor clase que existe en este chat, [nombre]. Cero logros que enseñar, gilipollas.',

      'Se te oye el eco del fail hasta en los mensajes que pretenden sonar a plan B, [nombre]. Se te ve el fail a la primera, joder.',

      'Perdedor constante: la única racha que mantienes es la de no cerrar el punto, [nombre]. Cero logros que enseñar, basura.',

      'La dignidad no te coge el teléfono: el buzón está lleno de avisos del marcador, [nombre]. Solo derrota documentada, ridículo.',

      'No hay misterio de derrota con estilo: hay lo previsible y el high lo nombra, [nombre]. El fail es tu marca, fracasado.',

      'Tienes más grasa de derrota en el discurso que un vestuario después del 0-5, [nombre] frame, patético.',

      'Perdedor de los que el high del ranking no perdona ni un frame del historial, [nombre]. Se te ve el fail a la primera, asco.',

      'Perdedor de fondo permanente: el high no es un mal día, es el nivel del nivel, [nombre]. El fail es tu marca, coño.',

      'Perdedor sin una carta nueva: siempre la misma mano sucia. Cero logros que enseñar, cabrón, joder, y el grupo no se traga el cuento, cabrón.',

      'La compostura no te reconoce y tú no has buscado el espejo del marcador, [nombre]. filtro ni consuelo, joder.',

      'Has dejado el chat como vestuario de derrota: restos de almost eternos, [nombre]. cerrado. Cero logros que enseñar, asco.',

      'No hay misterio interesante: hay previsible y flojo, el combo del high, [nombre] se te nota a la legua, coño.',

      'Perdedor de estribillo que mancha más con cada repetición del mismo fail, [nombre]. El fail es tu marca, ridículo.',

      'Perdedor sin el barniz: solo el material flojo a la vista. Cero logros que enseñar, fracasado, joder.',

      'Perdedor de las que el mute ajeno lee como respeto y es solo desinterés, [nombre]. Se te ve el fail a la primera, patético.',

      'El listón de ganar lo miras desde el sótano y no has subido un peldaño, [nombre]. El fail es tu marca, mierda.',

      'Perdedor de ceja ajena levantada y respeto en el sótano del ranking, [nombre]. maquillaje posible, basura.',

      'Tienes el historial de un fregadero que nadie ha tocado desde el domingo, [nombre]. Solo derrota documentada, cabrón.',

      'Perdedor de malinterpretar el silencio ajeno como respeto al underdog, [nombre]. Cero logros que enseñar, patético.',

      'Has convertido el almost en identidad y no hay detergente narrativo, [nombre]. Solo derrota documentada, asco.',

      'No hay barniz que salve: hay derrota pura y no se vende como carisma, [nombre]. El fail es tu marca, basura.',

      '[nombre], perdedor de mierda: esperas a ver qué pasa y nunca pasa nada bueno. Y encima te sorprende, cada puta vez.',

      'Se te oye el masticar del listón bajo hasta en los neutros del hilo, [nombre]. Se te ve el fail a la primera, gilipollas.',

      'Perdedor de feria: ruido de fail, suelo peor y cero ganas de volver, [nombre]. El fail es tu marca, joder.',

      'No es mala suerte: es patrón y el high te lo cobra sin descuento, [nombre]. Cero logros que enseñar, mierda.',

      'Tienes más episodios de derrota que de algo que. El chat respete, [nombre]. Solo derrota documentada, coño.',

      'El grupo paga tu rastro de fail en cuotas diarias de hastío, [nombre]. El fail es tu marca, cabrón, joder.',

      'Se te nota el peso de arrastrar la misma derrota por cada hilo, [nombre]. Cero logros que enseñar, gilipollas.',

      'Tienes el historial de un equipo que no gana ni amistosos, [nombre]. Se te ve el fail a la primera, joder.',

      'Has convertido el almost eterno en marca personal del ranking, [nombre]. El fail es tu marca, asco, joder.',

      'Has hecho del bajo listón tu casa. y no hay mudanza a la vista, [nombre]. Cero logros que enseñar, basura.',

      'Se te ve venir la derrota en la primera palabra del mensaje, [nombre]. chat ya lo sabía. Solo derrota documentada, ridículo.',

      'Perdedor de fondo de ranking: siempre ahí, siempre sin el punto que cambia el partido, [nombre]. Gilipollas.',

      'Perdedor de fondo de ranking: siempre en la foto del casi y nunca en la del logro, [nombre]. Gilipollas.',

      'Tienes el tono de noches de chat sin una frase que se sostenga sola en el ranking, [nombre]. Gilipollas.',

      'Se te nota que te instalaste en el fail hace tiempo y perdiste el mapa de salida, [nombre]. Gilipollas.',

      'Perdedor de estribillo sin punto final limpio ni redención posible en el ranking, [nombre]. Gilipollas.',

      'Perdedor de feria ambulante: el mismo show de fail, el mismo asco, cero nostalgia, [nombre]. Fracasado.',

      'Se te nota la prisa por explicar el fail y cero plan de no repetirlo en el chat, [nombre]. Gilipollas.',

      'Fracasado de repertorio: siempre el mismo final en cada historia que cuentas, [nombre]. Cero logros que enseñar, asco.',

      'Qué patético. Perdedor eres [nombre]. Inútil en todo, con una inteligencia tan baja que es un insulto a la especie humana, moralmente depravado al nivel de vender tu alma por cualquier vicio retorcido, y raro de una forma tan retorcida que das miedo y lástima al mismo tiempo.',

      '[nombre], perdedor sin remedio ni valor. Tu estupidez es ofensiva, tomas decisiones tan retardadas que solo un imbécil como tú las elegiría, tu moral es tan baja que te revuelcas en la bajeza y la traición, y tu rareza es tan perturbadora que hasta los que te toleran sienten asco. Profundo.',

      '[nombre], perdedor nato sin valor alguno. Estúpido hasta los huesos, incapaz de entender nada más allá de tu propia mierda, depravado moralmente como un depredador que solo encuentra placer en lo sucio y dañino, y con una rareza tan enferma que la gente normal prefiere alejarse antes de que les pegues tu patología.',

      'Perdedor de mierda [nombre]. Cero valor, pura inutilidad andante. Tan estúpido que destruyes todo lo que intentas, tan depravado que te alimentas del daño que causas a otros, y tan raro y perturbador que hasta tus propios pensamientos deben avergonzarse de ti.',

      'Mírate, [nombre]. Perdedor de mierda. Con la autoestima de un felpudo y el historial de un cadáver. Todo lo que tocas se pudre y encima tardas semanas en enterarte de que huele.',

      'Perdedor con recibo, [nombre]. Cada cosa que has intentado ha terminado en factura para otro, y encima te ofende que nadie quiera pagarte la próxima ronda de ridículo.',

      '[nombre], perdedor de manual con la cara muy dura y el expediente muy blando. Prometes movimiento, entregas quietud y luego lloras porque nadie te tiene en cuenta, pringado.ridículo.',

      'Perdedor completo, [nombre]: sin logros, sin plan, sin aliados y sin una gota de autocrítica. Cuatro carencias que encajan entre sí como piezas de mierda.',

      '[nombre], perdedor de esos que se comparan hacia abajo para poder dormir. Y aun así duermes mal, porque en el fondo sabes exactamente la mierda que eres.',

      '[nombre], eres el único capaz de perder cuando no había nada que perder. Eso ya no es mala suerte, puto inútil, eso es talento del malo y bien trabajado.',

      'Perdedor de vocación, [nombre]. Nadie te obliga y aun así insistes cada puta semana. Eso ya no es mala suerte, es un compromiso firme con la mediocridad.',

      'Eres un fracaso ambulante con foto de perfil, [nombre]. Inútil hasta para fingir que sirves y patético. Hasta para esconderlo. Un desastre sin atenuantes.',

      '[nombre], perdedor de esos que se retiran antes de que les echen y lo llaman decisión propia. Nadie se traga eso, pringado. Ni tú, cuando apagas la luz, gilipollas.',

      'Eres el que estropea lo que ya estaba hecho, [nombre]. Un talento muy específico y absolutamente inútil. Basura. Con capacidad de destrucción, nada más.',

      'Eres un puto cero a la izquierda, [nombre]. Ni positivo, ni negativo, ni memorable. El número que no cambia nada cuando lo sumas y que todos borran del cálculo.',

      'Mierda. De vida la tuya, [nombre]. Tu historial parece la cuenta de un muerto de hambre: solo restas, nunca entra nada y el saldo lleva años en rojo sin que muevas un dedo.',

      'Eres el gorrón que se sienta a la mesa, come de todo y desaparece cuando llega la cuenta, [nombre]. Mismo perfil de siempre, distinta pantalla, misma basura.',

      'Tu presencia aquí es un mueble, [nombre]. Ocupas sitio, juntas polvo y nadie te mueve porque da más pereza tirarte que dejarte ahí. Fracasado. De decoración.',

      'Tu autoestima es lo único tuyo que no ha bajado, [nombre], y eso dice más de tu ceguera que de tu valor. Un idiota convencido es lo más patético. Que existe.',

      'Tu marcador parece una condena, [nombre], y encima la firmaste tú voluntariamente. Nadie te obligó a nada. Elegiste esto, elección tras elección de mierda.',

      'Tu único logro medible, [nombre], es haber conseguido que nadie espere nada de ti. Y eso lo has trabajado durante años, con dedicación de puto profesional.',

      '[nombre], eres la prueba viva de que insistir no basta. Hay que insistir en algo que sirva, y tú llevas años insistiendo en ser exactamente esta mierda.',

      'Tu vida es un borrador que nunca pasaste a limpio, [nombre]. Y a estas alturas ya nadie te va a prestar un bolígrafo. Basura. De primera versión y única.',

      '[nombre], eres el peso que el grupo carga por costumbre. Nadie te sostiene por afecto, cabrón. Te sostienen porque tirarte da más trabajo que ignorarte.',

      '[nombre], tu historial es un cementerio de intentos y tú eres el enterrador. Nada de lo que empezaste sigue en pie. Repásalo, cabrón, si tienes cojones.',

      'Eres el error que se repite porque nadie se molesta en corregirlo, [nombre]. Ni la gente que te aprecia te corrige ya. Puro agotamiento, puto desastre.',

      '[nombre], has hecho de la queja tu forma de participar. No cuenta como participar, pringado. Cuenta como ruido, y el ruido se apaga cerrando la puerta, fracasado.',

      'Eres el que pide otra oportunidad justo después de gastar la última, [nombre]. Y la pides con esa voz. Puta vergüenza ajena cada vez que abres la boca.',

      'Tu problema, [nombre], es que crees que el tiempo va a arreglar algo. El tiempo solo confirma, y en tu caso lleva años confirmando la misma puta cosa.',

      'Tu problema no es de suerte ni de contexto, [nombre]. Es estructural y viene de fábrica. Naciste con esta mierda. Puesta y ni has intentado quitártela.',

      '[nombre], has llegado a un nivel de mediocridad tan estable que casi impresiona. Ni suben ni bajan tus resultados. Puta línea plana con nombre propio.',

      '[nombre], tu autoestima es lo único tuyo que no ha bajado y eso dice más de tu ceguera que de tu valor. Un idiota convencido, lo más patético. Que hay.',

      '[nombre], eres el chiste que el grupo dejó de contar porque se gastó de tanto repetirse. Ni gracia haces ya, puto parásito de conversaciones ajenas.',

      '[nombre], perdedor con la constancia de un reloj roto: siempre marcando la misma hora de mierda. Y sin que nadie se moleste ya en cambiarle la pila.',

      'Perdedor de los que necesitan público para fracasar, [nombre]. Solo no te sale igual. Hasta para hacer el ridículo dependes de que alguien te mire.',

      '[nombre], eres el clásico de mucho movimiento y cero desplazamiento. Corres en círculos, te cansas igual y no llegas a ninguna parte. Puto hámster.',

      '[nombre], hueles a conformismo y a excusa recalentada. Llevas la misma mierda. De discurso desde hace años y ni tú te lo crees ya cuando lo sueltas.',

      'Eres el fracaso más aburrido que ha pasado por aquí, [nombre]. Ni escándalo das. Ni siquiera te vas al fondo con estilo. Mierda. Gris y sin volumen.',

      '[nombre], has convertido el estar a punto de en tu domicilio fiscal. Nunca llegas, nunca cierras y nunca aprendes. Coherente en la mierda, eso sí.',

      'Tienes todas las condiciones para perder, [nombre], y encima las riegas cada día. Un puto jardín de fracasos y tú de jardinero a tiempo completo.',

      '[nombre], eres un fracasado. Con público, que es la peor forma de serlo. Cada intento tuyo es un espectáculo triste que ya nadie compra ni gratis.',

      'Eres el resultado exacto de no haber hecho nunca lo difícil, [nombre]. Cada atajo que cogiste te trajo aquí, al fondo, con el resto de la basura.',

      'Perdedor de manual, [nombre], capítulo uno, párrafo uno. No hace falta seguir leyendo porque el resto del libro es la misma puta frase repetida.',

      'Perdedor con teoría, [nombre]. Sabes perfectamente cómo se gana y no lo has aplicado ni una puta vez. Eso ya no es ignorancia, es cobardía pura.',

      'Perdedor por diseño, [nombre]. Cada atajo que cogiste te trajo justo aquí, al fondo, con el resto de la basura. Y sin nadie que te eche de menos.',

      'Perdedor de manual, [nombre]: te apuntas a todo y no terminas nada. Y encima te ofende que se note. Puta cara dura sin un solo resultado detrás.',

      'Puto don nadie, [nombre]. Ni te odian ni te quieren. Simplemente estás, como el mueble del pasillo que nadie mira y que todos esquivan al pasar.',

      'Eres el que se enfada cuando se lo dicen, [nombre], y ese enfado es la confirmación definitiva. Si fuera mentira ni te inmutarías, puto payaso.',

      '[nombre], eres un puto cero a la izquierda con antigüedad. Ni un logro, ni una anécdota, ni una sola razón para que alguien te tenga en cuenta.',

      'Tu vida es una lista de cosas que ibas a hacer, [nombre]. La lista es lo único completado y ni eso está bien escrito. Puto borrador permanente.',

      'Perdedor con la ilusión intacta y toda la evidencia en contra, [nombre]. Elige un bando, cabrón, que estar en medio te está saliendo carísimo.',

      '[nombre], eres el que se apunta a todo y no termina nada. Y encima te ofende que se note. Puta lista de intentos sin una sola casilla marcada.',

      '[nombre], eres el que pide otra oportunidad justo después de gastar la última. Y la pides con esa voz de pena. Puta vergüenza ajena cada vez, fracasado.',

      '[nombre], eres el error que ya nadie corrige porque no merece el esfuerzo. Ni la gente que te aprecia se molesta. Puto agotamiento colectivo, qué miseria.',

      '[nombre], has convertido el casi en tu dirección postal. Casi llegas, casi vales, casi cuentas. Puta biografía escrita entera en condicional, da grima.',

      'Eres el que se retira antes de que le echen, [nombre], y lo llama decisión propia. Nadie se traga eso, pringado. Ni tú cuando apagas la luz, fracasado.',

      '[nombre], puto don nadie: ni te odian ni te quieren. Simplemente estás ahí, ocupando línea en la lista y sin justificar el ancho que gastas, basura.',

      'Eres un desperdicio con antigüedad, [nombre]. Años aquí sin dejar una sola marca que justifique el sitio que ocupas en la lista. Ni un mensaje que valga la pena, asco, qué cutre.',

      'Mírate [nombre], el perdedor definitivo. Inútil total, con una falta de inteligencia que hace que destruyas cualquier oportunidad por pura idiotez, depravado como alguien que disfruta corromper y dañar por placer enfermo, y con una rareza tan oscura que pareces un bicho raro que la humanidad debería aislar, ridículo.',

      'Eres un cero absoluto [nombre]. Un perdedor inútil cuya falta de inteligencia lo hace peligroso por torpe, moralmente podrido disfrutando hacer el mal y corromper lo poco bueno que toca, y tan jodidamente raro que tu sola existencia contamina el ambiente, fracasado.',

      '[nombre], eres un perdedor sin inteligencia ni moral. Inútil total cuya estupidez roza lo criminal, depravado hasta el tuétano disfrutando de lo peor y más bajo, y con una rareza tan jodida que la gente se pregunta si eres humano o algo salido de una pesadilla fallida, indignante.',

      'Hay perdedores y luego estás tú, [nombre]. Inútil al nivel de estorbar respirando, tan corto que crees que tu idiotez es carácter, tan depravado que disfrutas hundiendo a quien confía en ti, y tan raro que la gente normaliza cualquier cosa con tal de no parecerse a ti, qué vergüenza ajena.',

      'Eres un fracaso ambulante, [nombre]. Perdedor sin valor, sin luces y sin alma: inútil hasta para fingir que sirves, estúpido hasta para esconderlo, depravado hasta para tus propios estándares, y raro de una forma que da escalofríos en vez de risa. Un desastre completo y coherente, da vergüenza.',

      '[nombre], perdedor por diseño y por costumbre. Arrastras una inutilidad tan completa que hasta fallar te sale mal, una estupidez que confunde valentía con suicidio social, una moral tan podrida que la traición te sale antes que el saludo, y una rareza que vacía las salas en cuanto entras, qué flojo.',

      '[nombre], perdedor de manual. No has ganado nada en tu vida y lo peor es que ya ni lo intentas: te acomodaste en el fracaso como quien se acomoda en un sofá roto, patético.',

      '[nombre], eres el tipo de perdedor que ni sirve de advertencia. Nadie aprende nada de ti porque nadie aguanta mirarte el tiempo suficiente sin sentir vergüenza ajena, asco, qué pena.',

      'Perdedor sin remedio, [nombre]. Convertiste la humillación en suscripción mensual y encima la pagas tú. Ni el más idiota firma un contrato tan malo dos veces seguidas, basura.',

      'Perdedor con nostalgia, [nombre]. Hablas de una época buena que nadie más recuerda porque nunca existió. Te inventaste un pasado para tapar la miseria del presente, ridículo.',

      '[nombre], eres la definición andante de mediocre con ínfulas. Ni el talento para destacar, ni la humildad para callarte. El pack completo del insoportable inútil, fracasado.',

      'Perdedor con la piel muy fina, [nombre], y el expediente muy sucio. Te ofendes por todo y no has hecho nada en la vida que justifique una sola de esas ofensas, da asco.',

      'Perdedor con demasiada confianza y cero datos que la sostengan, [nombre]. Esa desconexión entre lo que crees valer y lo que vales es lo más gracioso de ti, qué vergüenza.',

      '[nombre], perdedor sin remontada posible porque nunca hubo punto de partida. Empezaste en el fondo y desde entonces solo has cavado, muerto de hambre, ridículo.',

      'Perdedor de cloaca, [nombre]. Te arrastras, te justificas y luego te ofende que nadie te tienda la mano. Nadie mete la mano ahí abajo, y con razón, patético.',

      '[nombre], perdedor tan gris que ni para insultarte hay que esforzarse. Sale solo, como el moho. Y como el moho, nadie te quiere cerca de nada suyo, asco, qué miseria.',

      '[nombre], no has hecho nada y aun así tienes algo que dictar. Solo derrota documentada, patético, da grima.',

      '[nombre], perdedor de esos que hablan del futuro para no hablar del presente. Y el futuro llega y sigues en el mismo puto sitio de siempre, qué nivel de pena.',

      '[nombre], eres el hueco que queda cuando alguien importante se va. Y ni así se te nota. Puto relleno con nombre y sin una sola cosa dentro, basura.',

      'Perdedor de los que llaman mala suerte a su propia falta de oficio, [nombre]. El fail es tu marca, fracasado.',

      'Perdedor de cloaca, [nombre]. Todo lo que has tocado se ha estropeado y tú siempre tardas semanas en enterarte de que ya huele a mierda, da pena ajena.',

      'Perdedor de manual, [nombre], con la piel muy fina y ni un solo logro que justifique tanta susceptibilidad. Puta combinación insufrible, qué vacío.',

      'Perdedor con la moral por los suelos y el ego por las nubes, [nombre]. Un puto desastre y encima el único terreno donde eres constante, indignante.',

      'Perdedor cutre: ni el fallo tiene gracia ni la racha tiene misterio de antihéroe, [nombre], y, qué vergüenza ajena.',

      'Has convertido el fail en identidad y el ranking te nombra sin dudar, [nombre]. Solo derrota documentada, basura.',

      '[nombre], coleccionas derrotas como otros coleccionan anécdotas. El fail es tu marca, ridículo, qué flojo.',

      'Perdedor de manual, [nombre]: tu mayor talento es encontrar razones por las que no era el momento. Nunca es el momento, menudo desastre.',

      'Perdedor de manual: ni una anécdota que no sea derrota reciclada, [nombre]. El fail es tu marca, qué pena.',

      'Tienes más derrotas documentadas que intentos serios de subir el listón, [nombre]. Cero logros que enseñar, patético.',

      'Perdedor cutre y sin complejo: el complejo pediría espejo y no lo hay, [nombre]. Cero logros que enseñar, basura.',

      'La compostura cruza de acera cuando te ve en el high del comando, [nombre]. frame. Cero logros que enseñar, qué cringe.',

      'Perdedor de inercia: el grupo te soporta por costumbre, no por respeto al fail con estilo, [nombre]. Pringado, asco, da asco.',

      'Perdedor de fondo: bajas la media del high con la constancia de quien no se cansa de caer, [nombre]. Pringado, basura.',

      'Perdedor de historial público: no hace falta escarbar, el marcador está en la superficie, [nombre]. Pringado, ridículo.',

      'Perdedor de ranking: bajas la media del nivel con constancia de quien no se cansa de caer, [nombre]. Mierda, fracasado.',

      'Se te nota la racha de casi en cada mensaje y el high no convierte el almost en victoria, [nombre]. Cabrón, qué miseria.',

      'Perdedor de cartel de sótano: se ve el letrero y nadie baja a firmar la derrota ajena, [nombre]. Basura, da grima.',

      'El recato de perder te queda lejos y la distancia es rechazo, no mística de underdog, [nombre]. Joder.',

      'Perdedor de superficie suficiente: no hace falta abrir el vestuario, huele a fail, [nombre]. Patético, basura.',

      'No es estilo: es derrota previsible y el high te la nombra entero en el ranking, [nombre]. Fracasado, qué cutre.',

      'Perdedor de manual: el marcador te conoce de memoria y no se cansa de sumarte ceros, [nombre]. Coño, da pena ajena.',

      '[nombre], cuando el grupo necesita un ejemplo de fail, salen tu nick, cabrón, y el grupo ya lo archivó, qué vacío.',

      'Perdedor de repertorio corto: siempre el mismo final en bucle, [nombre]. Asco, y el grupo ya lo archivó, indignante.',

      'Se te nota la costumbre de no cerrar nada que empieces, [nombre]. Patético, y el grupo ya lo archivó, qué vergüenza ajena.',

      '[nombre], la suerte no te odia: tú le das motivos cada puto día, mierda, y el grupo ya lo archivó, patético.',

      'Cero logros, cero anécdotas útiles, solo quejas de calidad industrial, [nombre]. Coño, y el grupo ya lo archivó, asco, qué flojo.',

      'Has convertido el segundo puesto en un sueño húmedo inalcanzable, [nombre]. Ridículo, y el grupo ya lo archivó, basura.',

      '[nombre], pierdes con la constancia con la que otros ganan, fracasado, y el grupo ya lo archivó, ridículo.',

      'Perdedor de manual negro: el chat no debate, documenta, [nombre]. Basura, y el grupo ya lo archivó, fracasado.',

      '[nombre], tu mejor momento es el segundo antes de cagarla otra vez, cabrón, y el grupo ya lo archivó, miserable.',

      'El underdog al menos tiene arco; tú solo tienes repetición, [nombre]. Gilipollas, y el grupo ya lo archivó, qué cringe.',

      '[nombre], si el fail fuera deporte serías titular absoluto, cabrón, y el grupo ya lo archivó, coño, y el grupo no se traga el cuento, da asco.',

      'Se te oye la derrota en la voz antes de que cuentes la historia, [nombre]. Asco, y el grupo ya lo archivó, qué vergüenza.',

      'Perdedor de los que celebran casi como si fuera victoria, [nombre]. Patético, y el grupo ya lo archivó, ridículo.',

      '[nombre], el ranking de perdedor te tiene de inquilino vitalicio, mierda, y el grupo ya lo archivó, patético.',

      'Nada de lo que tocas mejora; todo se queda en almost eterno, [nombre]. Coño, y el grupo ya lo archivó, asco, qué miseria.',

      'Has firmado tantas derrotas que el papel ya no te extraña, [nombre]. Ridículo, y el grupo ya lo archivó, basura.',

      '[nombre], el grupo usa tu nombre como sinónimo de se venía venir, fracasado, y el grupo ya lo archivó, ridículo.',

      'Perdedor sin plot twist: el final se ve desde el minuto uno, [nombre]. Basura, y el grupo ya lo archivó, fracasado.',

      '[nombre], coleccionas derrotas como otros coleccionan anécdotas de mierda, coño, y el grupo ya lo archivó, joder Hostia puta, qué cutre.',

      'Perdedor de los que llaman mala suerte a su propia falta de oficio, [nombre]. Gilipollas, y el grupo ya lo archivó, mierda Hostia puta, da pena ajena.',

      '[nombre], cada plan tuyo muere en la playa antes de salir del puerto, cabrón, y el grupo ya lo archivó, qué vacío.',

      'Se te ve el fail en la primera frase y el grupo ya sabe el final, [nombre]. Asco, y el grupo ya lo archivó, indignante.',

      'Perdedor de cartel: el letrero brilla y nadie firma contigo, [nombre]. Patético, y el grupo ya lo archivó, qué vergüenza ajena.',

      '[nombre], llevas tanto tiempo perdiendo que ya es tu marca registrada, mierda, y el grupo ya lo archivó, patético.',

      'Ni una victoria que no sea accidental y mal contada, [nombre]. Coño, y el grupo ya lo archivó, asco, qué flojo.',

      'Has hecho del almost tu religión y el dios nunca contesta, [nombre]. Ridículo, y el grupo ya lo archivó, basura.',

      '[nombre], el marcador te conoce de memoria y sigue sumándote ceros, fracasado, y el grupo ya lo archivó, ridículo.',

      'Perdedor sin underdog: solo derrota previsible y sin gracia, [nombre]. Basura, y el grupo ya lo archivó, fracasado.',

      '[nombre], empiezas fuerte y terminas como siempre: mirando desde abajo, mierda, y el grupo ya lo archivó, miserable.',

      'Tu historial es un cementerio de intentos a medias, [nombre]. Gilipollas, y el grupo ya lo archivó, qué cringe.',

      '[nombre], cuando el grupo necesita un ejemplo de fail, salen tu nick, cabrón, y el grupo ya lo archivó, coño Hostia puta, da asco.',

      'Perdedor de repertorio corto: siempre el mismo final en bucle, [nombre]. Asco, y el grupo ya lo archivó, cabrón Hostia puta, qué vergüenza.',

      'Se te nota la costumbre de no cerrar nada que empieces, [nombre]. Patético, y el grupo ya lo archivó, gilipollas Hostia puta, patético.',

      '[nombre], la suerte no te odia: tú le das motivos cada puto día, mierda, y el grupo ya lo archivó, patético Hostia puta, asco, fracasado.',

      'Cero logros, cero anécdotas útiles, solo quejas de calidad industrial, [nombre]. Coño, y el grupo ya lo archivó, asco Hostia puta, basura.',

      'Has convertido el segundo puesto en un sueño húmedo inalcanzable, [nombre]. Ridículo, y el grupo ya lo archivó, basura Hostia puta, ridículo.',

      '[nombre], pierdes con la constancia con la que otros ganan, fracasado, y el grupo ya lo archivó, ridículo Hostia puta, fracasado.',

      'Perdedor de manual negro: el chat no debate, documenta, [nombre]. Basura, y el grupo ya lo archivó, fracasado Hostia puta, basura.',

    ],
    mid: [
      'Ni perdedor del todo ni alguien que sume. Te quedas en esa franja tibia donde no haces daño pero tampoco haces falta, y eso a la larga pesa más de lo que crees.',

      'Tienes destellos de no ser un desastre, rodeados de decisiones que te devuelven al montón. Medio perdedor, medio salvable, y nadie sabe nunca cuál de los dos va a aparecer.',

      'No eres el peor, pero tampoco das motivos para que cuenten contigo. Perdedor a ratos, funcional a ratos, sin una línea clara entre las dos cosas.',

      'A veces pareces tener las cosas claras y a veces te hundes solo. Esa inconsistencia es justo lo que te deja a medio camino de ser un perdedor entero.',

      'Ni arriba ni abajo. Cumples lo mínimo para no ser señalado y nunca lo suficiente para que nadie te defienda. La zona más anónima que existe.',

      'Tienes con qué no ser un perdedor, pero lo desperdicias con una constancia que llama la atención. Potencial sin uso es casi peor que no tener nada.',

      'Medio perdedor por elección propia. Cuando te lo propones no estás mal; el problema es que proponértelo es justo lo raro en ti.',

      'No molestas ni aportas. Estás en ese punto medio donde la gente ni te suma ni te resta, simplemente te tolera por inercia.',

      'Ni ganas ni pierdes: sobrevives. Y sobrevivir sin avanzar acaba pareciéndose mucho a perder con el número en la frente del mensaje.',

      'Estás en el punto donde nadie te señala ni te elige. Cómodo hoy, caro dentro de unos años con el número en la frente del mensaje.',

      'Tienes momentos buenos que no encadenas. El talento suelto no sirve de nada si nunca se acumula y. El veredicto no se negocia.',

      'No eres un desastre, pero tampoco una garantía. La gente te tiene en la lista larga, nunca en la corta.',

      'Fallas justo lo suficiente para que nadie confíe del todo y aciertas lo justo para que no te descarten.',

      'Perdedor a media jornada. Cuando te concentras funcionas; el problema es que concentrarte te dura poco.',

      'Estás en tierra de nadie: demasiado capaz para dar pena, demasiado inconstante para dar seguridad con el cargo en firme.',

      'Ni arrastras al grupo ni tiras de él. Ocupas sitio y cumples, que es lo mínimo exigible y no hay modo de suavizarlo.',

      'Tienes con qué salir de la mediocridad y ninguna urgencia por hacerlo. Eso es lo que te frena con. El veredicto seco del bot.',

      'Medio perdedor, medio decente. Depende del día, del ánimo y de si alguien te está mirando y. El ranking cierra el caso.',

      'No te falta capacidad, te falta continuidad. Y la continuidad es justo lo que separa a unos de otros.',

      'Cumples cuando es fácil y desapareces cuando aprieta. Por eso te quedas siempre en el medio con. El veredicto seco del bot.',

      'Nadie te va a defender ni a atacar. Estás en el punto exacto donde uno se vuelve invisible y el archivo queda cerrado.',

      'Tienes suficientes aciertos para no ser un fracaso y suficientes fallos para no ser nadie de referencia.',

      'A veces das el nivel y a veces das vergüenza ajena. El promedio te deja justo aquí y. El veredicto no se negocia.',

      'Ni bien ni mal: regular sostenido. Es el resultado más difícil de defender y el más fácil de olvidar.',

      'Te falta ese punto de exigencia contigo mismo. Sin él, esto es exactamente hasta donde llegas en el único marcador que importa aquí.',

      'Estás en el montón por decisión propia, aunque lo llames circunstancias con el eco todavía en el grupo.',

      'Ni perdedor ni ganador: pasajero. La gente pasa por tu lado y no se le queda nada con el peaje cobrado al natural.',

      'Haces lo justo para que no te digan nada y nunca lo suficiente para que digan algo bueno con. El veredicto seco del bot.',

      'Tienes días de sobra y días de menos. El problema es que los de menos son bastantes más sin prórroga ni VAR.',

      'No eres el problema del grupo, pero tampoco parte de la solución. Estás en el reparto de fondo sin bis ni matiz de consuelo.',

      'Medio perdedor con potencial de dejar de serlo. Llevas años en esa misma frase. Sin derecho a matiz útil.',

      'Ni sobresales ni molestas. Es un equilibrio cómodo y absolutamente estéril y el archivo queda cerrado.',

      'Tienes la capacidad justa para saber que podrías más. Y ese saber sin hacer es lo que pesa con el número en la frente del mensaje.',

      'Cumples el expediente y nada más. Un aprobado raspado sostenido en el tiempo y el sistema no regala puntos.',

      'A ratos pareces alguien de fiar y a ratos justo lo contrario. Esa duda es tu marca y. El ranking no pide permiso.',

      'Ni una cosa ni la otra. Estás en la franja donde la gente ni te recomienda ni te desaconseja con el parte firmado debajo.',

      'Tienes buena base y mala gestión. Con lo primero se llega lejos; con lo segundo, hasta aquí con testigos obligados en el hilo.',

      'Perdedor a medias porque nunca te comprometes del todo con nada, ni siquiera con perder y el hilo no pide amplificación.',

      'Ni fracaso ni referencia. Un intermedio largo que ya empieza a parecer definitivo sin que nadie pida replay.',

      'Haces lo suficiente para seguir, nunca lo suficiente para destacar. Y así van pasando los meses y no hay DLC que lo parchee.',

      'No eres de los que hunden un proyecto ni de los que lo levantan. Eres de los que están en la foto fija del ranking.',

      'Te falta hambre, no herramientas. Y el hambre no se enseña ni se presta y el sistema marca el punto final.',

      'Medio salvable. Con constancia serías otro; sin ella, seguirás siendo exactamente este y no hace falta ampliar el parte.',

      'Ni te señalan ni te buscan. Estás en el punto ciego del grupo y ni te has dado cuenta y el contador insiste.',

      'Tienes aciertos que nadie recuerda y fallos que nadie comenta. Eso es la definición de tibio. Sin derecho a matiz útil.',

      'No eres un perdedor, eres un pendiente. Y los pendientes se resuelven o se archivan con el peaje cobrado al natural.',

      'A medio camino de todo. Ni suficiente para presumir ni tan poco como para preocuparse con el número hablando solo.',

      'Ni bien ni mal, solo constante. Y la constancia sin dirección no lleva a ningún sitio sin maquillaje ni segunda toma.',

      'Perdedor intermitente. Cuando funcionas, funcionas; el problema es la palabra cuando y el hilo sigue sin ti en el centro.',

      'Estás justo en el borde. Un poco más de trabajo y sales; un poco menos y te hundes del todo. Sin derecho a matiz útil.',

    ],
    low: [
      'Cero. De perdedor tienes poco. Y se nota en que la gente se acerca en vez de apartarse y basta el dato del ranking.',

      'Cero por ciento. No arrastras derrotas ni excusas. Vas bastante ligero de equipaje y no hay DLC que lo parchee.',

      'Limpio. Cuando algo sale mal lo arreglas en vez de buscar culpables. Rarísimo sin cuento que lo tape.',

      'Nada de perdedor. Sales adelante sin drama y sin público. Esa es la forma buena con. El veredicto seco del bot.',

      'Cero. La gente te tiene por alguien que cumple, y esa fama no se compra con el dígito firmando solo.',

      'Sin rastro. Ni fracasos que justificar ni historias que adornar. Expediente limpio y el archivo no admite recurso.',

      'Cero por ciento. Estás en el lado bueno del marcador y encima sin hacer ruido en la foto fija del ranking.',

      'Cero. No arrastras derrotas ni las disfrazas de aprendizaje. Vas limpio y eso ya es raro delante de quien aún leía el hilo.',

      'Nada. Cumples lo que dices y por eso la gente cuenta contigo sin tener que pensarlo y no hace falta ampliar el parte.',

      'Cero por ciento. Cuando algo sale mal lo asumes y sigues. Ahí es donde se ve quién es quién delante de todo el que miraba.',

      'Limpio del todo. No necesitas explicar tus resultados porque hablan solos delante de quien no quería verlo.',

      'De perdedor nada. Sostienes cuando aprieta, que es exactamente donde casi todos se caen con la firma legible del comando.',

      'Cero. Ni excusas preparadas ni culpables de repuesto. Eso es carácter y escasea con el peaje cobrado al natural.',

      'Nada de nada. La gente te busca cuando hay problema, y esa es la mejor nota posible. Delante del público que no pidió entrada.',

      'Cero por ciento. No hablas de lo que vas a hacer, apareces con ello hecho con el resultado ya consumado.',

      'Sin rastro. Tu historial está lleno de cosas terminadas, no de cosas empezadas sin suavizar el golpe del número.',

      'Cero. Sabes perder sin hundirte y ganar sin escandalizar. Ese equilibrio no lo tiene casi nadie en el recuento que no perdona.',

      'Limpio. No te comparas con nadie porque no te hace falta para saber dónde estás sin bis ni matiz de consuelo.',

      'Nada. Cuando dices que sí, se acabó la conversación. Eso vale más que cualquier discurso sin prórroga ni VAR, patético.',

      'Cero por ciento de perdedor. Fallas como todos, pero corriges como casi ninguno con la cara del resultado a la vista, miserable.',

      'Sin una sola señal. La gente te da por hecho de la buena manera: sabe que vas a estar sin consuelo de consola, qué cringe.',

      'Cero. Tu palabra tiene peso y eso solo se consigue cumpliendo muchas veces seguidas y el sistema cierra sin discusión, da asco.',

      'Nada. No necesitas público para hacer las cosas bien, y esa es la prueba definitiva y el sistema marca el punto final, qué vergüenza.',

      'Limpio. Ni dramas, ni versiones, ni relatos. Resultados y a otra cosa con el número hablando solo sin bis ni matiz de consuelo, ridículo.',

      'Cero por ciento. Te mueves con la tranquilidad del que sabe que ha hecho el trabajo delante de la evidencia del contador, fracasado.',

      'Sin rastro de perdedor. Cuando te equivocas lo dices tú antes de que lo diga nadie y. El ranking lo deja por escrito, qué miseria.',

      'Cero. Has aprendido de lo que salió mal en vez de coleccionarlo. Ahí está toda la diferencia y el hilo no pide amplificación, da grima.',

      'Nada. No hace falta empujarte ni recordarte nada. Funcionas solo y funcionas bien con el número en la frente del mensaje, qué nivel de pena.',

      'Cero por ciento. Eres de los que aparecen cuando el resto se está buscando la salida delante de quien no quería verlo, basura.',

      'Limpio. Tu constancia es lo que te ha traído hasta aquí, y no hay atajo que la sustituya sin suavizar el golpe del número, qué cutre.',

      'Nada de perdedor. Te sostienen los hechos, no la fama, y eso dura mucho más con. El bot como notario del fallo, da pena ajena.',

      'Cero. La gente te menciona sin adornos: dice que cumples, y con eso está todo dicho en el idioma seco del ranking, qué vacío.',

      'Sin señales. Ni te justificas ni te vendes. Simplemente haces. Y se nota sin modo avión ni silencio cómplice, indignante.',

      'Cero por ciento. Ganas sin ir contándolo y pierdes sin buscar consuelo. Nivel alto con el número hablando solo, qué vergüenza ajena.',

      'Limpio del todo. No tienes cuentas pendientes con nadie y eso se nota en cómo te tratan. Delante del marcador en vivo, da vergüenza.',

      'Nada. Te fue mal alguna vez y saliste, que es exactamente lo contrario de ser un perdedor. Y el chat archiva sin debate, qué flojo.',

      'Cero. Sabes retirarte a tiempo de lo que no funciona en vez de hundirte con el barco por orgullo sin segunda lectura que lo arregle, menudo desastre.',

      'Sin rastro. Tienes criterio propio y lo sostienes aunque no sea lo cómodo y el archivo no admite recurso, qué pena.',

      'Cero por ciento. La diferencia entre tú y el resto no es el talento, es que tú apareces con. El bot como notario del fallo, patético.',

      'Limpio. Cuando el grupo se complica, tu nombre sale en la conversación. Por algo será en el único idioma que entiende el contador, miserable.',

      'Sin señales de perdedor. Vas por delante y sin hacer ruido, que es como se va de verdad. Delante del hueco que quedó, qué cringe.',

      'Cero por ciento. Terminas lo que empiezas y eso, aunque suene poco, es lo más raro que hay con el cargo en firme, da asco.',

      'Limpio. La gente confía en ti por acumulación de pruebas, no por simpatía. Delante del ranking y de la cara, qué vergüenza.',

      'Nada. Estás en el lado bueno del marcador y no has tenido que pisar a nadie para llegar en la foto fija del ranking, ridículo.',

      'Cero. Ni te hundes con las malas ni te crees las buenas. Cabeza fría y expediente sólido sin que nadie pida replay, fracasado.',

      'Sin rastro. Te mides con lo que hiciste ayer, no con lo que hizo el de al lado. Delante del público que no pidió entrada, qué miseria.',

      'Cero por ciento. De ti no hay historias que contar, hay resultados que mirar delante de todo el que miraba, da grima.',

      'Hoy no eres el fail del ranking, [nombre]. Hasta el bot te da un respiro, joder. Hostia puta, qué nivel, qué nivel de pena.',

      'Low de perdedor: por una vez no encabezas la derrota, [nombre], cabrón El grupo ya lo tiene claro sin forzar el drama, ridículo.',

      '[nombre], el marcador no te señala hoy. Disfruta el anonimato, gilipollas El grupo ya lo tiene claro sin forzar el drama, fracasado.',

    ],
  },

  ganador: {
    name: 'ganador',
    goodIsHigh: true,
    high: [
      '[nombre], eres un puto ganador de pies a cabeza. Inteligente al nivel de ver la jugada tres movimientos antes que el resto, con una integridad que hace que la gente confíe en ti sin pensarlo, y con una presencia tan sólida que entras a cualquier sitio y el ambiente se ordena solo a tu alrededor.',

      'Mírate [nombre], el ganador absoluto. Capaz de verdad, de los que resuelven lo que otros ni se atreven a tocar, con una cabeza que no falla bajo presión, una palabra que vale más que cualquier contrato, y un magnetismo que hace que la gente quiera estar de tu lado sin saber explicar por qué.',

      '[nombre], ganador nato sin punto débil visible. Tu inteligencia intimida sin que la fuerces, tu carácter sostiene a quien te rodea, tu criterio pesa porque se lo ganó entrega a entrega, y tu sola presencia sube el nivel de cualquier sala en la que decidas aparecer.',

      'Eres un fuera de serie [nombre]. Un ganador cuya cabeza convierte lo difícil en rutina, cuya integridad es de las que ya no se ven, y cuya presencia genera ese respeto silencioso que no se pide ni se compra: simplemente se reconoce en cuanto entras por la puerta.',

      '[nombre], ganador de los que marcan la diferencia donde sea que estén. Brillante sin necesidad de demostrarlo, firme sin necesidad de levantar la voz, leal sin necesidad de jurarlo, y con un aura de gente que llega lejos porque hace lo que los demás evitan. Eso no se finge ni se hereda.',

      'Qué ganador eres [nombre]. Resuelves bajo caos lo que otros ni en calma, tienes la rara honestidad de los que no necesitan mentir para ganar, y proyectas una seguridad real que tranquiliza a quien confía en ti. Eres el nombre que aparece en la cabeza de todos cuando algo importa de verdad.',

      '[nombre], el rey de los ganadores y con motivos. Tu inteligencia abre puertas que otros ni ven, tu carácter cierra tratos que otros ni intentan, y tu presencia deja huella en gente que solo te cruzó una vez. Eres exactamente lo que los demás intentan aparentar sin conseguirlo nunca.',

      'Ganador de verdad [nombre]. Puro nivel, pura solidez. Tan capaz que haces parecer fácil lo imposible, tan íntegro que tu palabra basta, y con una presencia tan firme que la gente baja la guardia contigo por puro instinto de que estás del lado correcto. Eso es lo más difícil de tener.',

      '[nombre], eres un ganador con cabeza y con códigos. Inteligente al nivel de adelantarte al problema antes de que exista, leal al nivel de que delegar en ti es dejar de preocuparse, y con un magnetismo que convierte tu presencia en una ventaja para cualquiera que esté cerca de ti.',

      'Eres el ganador perfecto [nombre]. Con un valor real que se nota sin que lo anuncies, con una inteligencia que hace que la sala escuche cuando hablas, con una integridad que ya casi no existe, y con una presencia tan magnética que la gente recuerda haberte conocido años después de un solo encuentro.',

      '[nombre], ganador por diseño y por disciplina. Tu cabeza ordena el caos que a otros los hunde, tu palabra sostiene lo que otros prometen y no cumplen, y tu presencia impone un respeto que nadie te discute. No llegaste por suerte: llegaste haciendo lo que la mayoría evita por comodidad.',

      'Hay ganadores y luego estás tú, [nombre]. Brillante sin ser arrogante, fuerte sin ser ruidoso, leal sin pedir nada a cambio, y con un aura de los que cambian el rumbo de cualquier equipo solo con aparecer. La gente te sigue porque saben que contigo se gana, y eso vale más que cualquier título.',

      '[nombre], el manual del ganador con tu cara en la portada. Inteligencia que resuelve, carácter que sostiene, palabra que vale, presencia que se impone sola. Junta las cuatro y entiendes por qué la gente quiere tenerte cerca cuando todo se complica: porque contigo el problema deja de serlo.',

      'Eres un referente andante, [nombre]. Ganador de los que elevan a quien tienen al lado sin proponérselo: tu nivel arrastra, tu integridad inspira, tu criterio orienta y tu presencia tranquiliza. Eres exactamente el ejemplo que la gente pone cuando quiere explicar qué es hacer las cosas bien.',

      '[nombre], ganador de los que no se repiten cada generación. Tu inteligencia es de las que descolocan, tu lealtad de las que se recuerdan, tu firmeza de las que sostienen, y tu presencia de las que se quedan grabadas. La gente normal no provoca eso. Tú lo provocas solo con entrar.',

      '[nombre], ganador de los que no necesitan anunciarse. Entras, haces lo que hay que hacer y te vas antes de que empiecen los aplausos.',

      'La gente te tiene por alguien serio, [nombre], y esa reputación se construye en años y se pierde en un día.',

      '[nombre], ganador con la capacidad de reconocer el mérito ajeno. Eso solo lo hace quien tiene el propio asegurado.',

      'Eres el nombre que aparece cuando algo tiene que salir bien de verdad, [nombre]. No por simpatía, por historial.',

      'Tienes esa forma de estar que hace que la gente baje la guardia, [nombre], y eso solo se consigue mereciéndolo.',

      'Tienes el don de simplificar lo complicado, [nombre], y eso es lo contrario de lo que hace casi todo el mundo.',

      '[nombre], ganador de los que no hacen falta presentar. Basta con decir tu nombre y el resto se entiende solo.',

      'Ganador con criterio para rodearse bien, [nombre]. Eso solo lo hace quien no tiene inseguridades que tapar.',

      '[nombre], tienes el criterio de alguien que ha fallado lo suficiente como para no fallar en lo importante.',

      '[nombre], tienes una calma bajo presión que descoloca a todo el mundo. Y descolocar ya es media victoria.',

      'Tienes la clase de solidez que hace que la gente deje de improvisar, [nombre]. Eso ordena grupos enteros.',

      '[nombre], ganador de los que se notan por ausencia. Cuando no estás, se nota; cuando estás, todo va solo.',

      'Ganador con paciencia para lo lento y reflejos para lo rápido, [nombre]. Tener las dos cosas es rarísimo.',

      'Eres el que sostiene el estándar cuando todos empiezan a aflojar, [nombre]. Y arrastras al resto contigo.',

      'Ganador con la firmeza de quien sabe lo que quiere y la flexibilidad de quien sabe cómo llegar, [nombre].',

      '[nombre], ganador de los que arrastran sin empujar. La gente te sigue porque quiere, no porque le toque.',

      'Tu constancia es lo que hace que los resultados parezcan inevitables, [nombre]. No lo son: los provocas.',

      'Eres el que hace que un grupo desordenado empiece a funcionar, [nombre], sin que nadie sepa cuándo pasó.',

      'Tienes lo que no se enseña, [nombre]: criterio para decidir rápido y aguante para sostener la decisión.',

      'Tu forma de decidir da tranquilidad, [nombre], y en un grupo eso vale más que cualquier talento suelto.',

      'Ganador sin necesidad de humillar a nadie, [nombre]. Ganar así es mucho más difícil y mucho más limpio.',

      'Eres el que da la cara cuando toca darla, [nombre]. En eso se queda casi todo el mundo por el camino.',

      '[nombre], tienes la cabeza fría que el resto solo finge tener. Cuando todo arde, tú sigues pensando.',

      'Eres el que se adelanta al problema en vez de reaccionar a él, [nombre]. Ahí está la ventaja entera.',

      '[nombre], ganador con la cabeza suficientemente clara para saber cuándo una batalla no vale la pena.',

      'Tu presencia tranquiliza, [nombre], y eso solo lo consigue quien ha cumplido muchas veces seguidas con el fail todavía caliente.',

      '[nombre], ganador con la disciplina de un profesional y la cabeza de alguien que sigue aprendiendo y el hilo sigue sin ti en el centro.',

      'Tu manera de sostener a la gente que tienes al lado es lo que te convierte en referencia, [nombre] con testigos obligados en el hilo, da pena ajena.',

      '[nombre], ganador con visión, con nervio y con la cabeza necesaria para no confundir las dos cosas con. El botín o el fail a la vista, qué vacío.',

      'Tienes el aguante de los que van a largo plazo, [nombre]. Por eso sigues cuando otros ya se fueron con el peaje cobrado al natural, indignante.',

      'Eres el que se queda cuando el resto busca la salida, [nombre]. Ahí es donde se ve quién es quién con el parte firmado debajo, qué vergüenza ajena.',

      '[nombre], ganador de los que hacen equipo mejor. Eso vale más que cualquier lucimiento individual. Delante del público que no pidió entrada, da vergüenza.',

      'Ganador sin público y sin necesitarlo, [nombre]. Los resultados no dependen de quién esté mirando con el dígito como única defensa, qué flojo.',

      'Eres el que mantiene la cabeza cuando todos los demás la pierden, [nombre]. Y eso decide partidos sin descuento por empatía, menudo desastre.',

      'Eres el que no se conforma cuando ya está bien, [nombre]. Ahí está el margen que los demás no ven. Delante del ranking y de la cara, qué pena.',

    ],
    mid: [
      'Hostia puta, [nombre], el grupo no tiene un veredicto fuerte sobre tu racha. Tiene un encogimiento de hombros.',

      'Hostia puta, [nombre], cuando ganas no se celebra y cuando pierdes no se llora. El grupo ya espera el medio.',

      'Coño, [nombre], no generas el silencio de la gesta ni el de la vergüenza. Generas el del siguiente partido.',

      'Hostia puta, [nombre], el podio y el último puesto te quedan a la misma distancia. Geometría del promedio.',

      'Hostia puta, [nombre], el bot te confirma sin regalo y sin ensañamiento. Medio. Punto final del análisis.',

      'Hostia puta, [nombre], el podio te queda lejos en altura y el último puesto lejos en profundidad. Centro.',

      'Joder, [nombre], ni un pico de gloria ni un valle de vergüenza. Electrocardiograma de la victoria plano.',

      'Hostia puta, [nombre], cuando compites el spoiler es la tibieza. Nadie se sorprende del resultado medio.',

      'Hostia puta, [nombre], cuando compites el resultado es previsible en su tibieza. Spoiler sin sorpresa.',

      'Hostia puta, [nombre], estás donde la mayoría de los que compiten sin ser extremos. Estadística pura.',

      'Hostia puta, [nombre], tienes resultados de personaje estable. Sin arcos, sin giros, con continuidad.',

      'Hostia puta, [nombre], estás donde están los que no son ni el clutch del mes ni el fail de la semana.',

      'Hostia puta, [nombre], el promedio de resultados te define mejor que cualquier adjetivo de catálogo.',

      'Coño, [nombre], eres el control del experimento de la victoria. Sin ti no se miden los extremos. Contigo, nadie mira.',

      'Joder, [nombre], tu medallero es lo suficientemente corto para no presumir y lo suficientemente lleno para no llorar.',

      'Hostia, [nombre], ganas lo necesario para no quemarte y pierdes lo necesario para no brillar. Equilibrio mediocre.',

      'Mierda, [nombre], no hay material para el fanatismo ni para el desprecio por resultados. Hay material para seguir.',

      'Tienes madera de ganador a ratos, pero la dejas enfriar. Cuando aprietas estás ahí arriba; el problema es lo poco que aprietas de verdad.',

      'Mierda, [nombre], no hay material para el extremismo de resultados. Hay material para el encogimiento de hombros.',

      'Joder, [nombre], no eres campeón ni desastre. Eres el que termina en tierra de nadie del ranking de victorias.',

      'Hostia, [nombre], tu historial es una línea plana con algún pico tibio. Ni remontadas épicas ni caídas libres.',

      'Coño, [nombre], ganas lo justo para no ser el último y pierdes lo justo para no ser noticia. Medio pelo total.',

      'Joder, [nombre], no hay highlight reel ni fail compilation. Hay metraje de suficiente. Y el suficiente aburre.',

      'Mierda, [nombre], la victoria te visita sin quedarse y la derrota igual. Ambas de paso. Tú te quedas en medio.',

      'Estás cerca de ser de los que ganan, pero te conformas antes de tiempo. La diferencia entre tú y ellos es de cabeza, no de talento.',

      'Mierda, [nombre], el podio te queda lejos y el sótano también. Habitas el pasillo de los resultados grises.',

      'Mierda, [nombre], tu relación con ganar es de vecino educado. Ni enemistad ni pasión. Saludo y a otra cosa.',

      'Hostia, [nombre], el grupo no espera milagros ni catástrofes de ti. Espera el resultado del medio. Y llega.',

      'Joder, [nombre], ni te inventan una racha ni te inventan una maldición. Te miden en el punto exacto: medio.',

      'Hostia, [nombre], tienes el perfil de quien no altera la conversación de quién gana. La conversación sigue.',

      'Joder, [nombre], no hay second chance épica ni first failure memorable. Hay el partido que se juega y pasa.',

      'Mierda, [nombre], no generas fanaticada ni rechazo organizado por resultados. Generas el siguiente mensaje.',

      'Coño, [nombre], tienes el don de no cerrar nada de forma que se recuerde. Ni para el álbum ni para el meme.',

      'Hostia, [nombre], tienes el perfil de quien no mueve la conversación de quién manda. La conversación sigue.',

      'Joder, [nombre], el ranking te pone en el centro porque moverte sería inventar una historia que no tienes.',

      'Coño, [nombre], tu relación con el podio es de visitante ocasional de la grada. Nunca de residente arriba.',

      'Joder, [nombre], ni te suben al altar con mentiras ni te tiran al sótano con exageraciones. Centro limpio.',

      'Coño, [nombre], tu racha es el silencio entre dos opiniones de clutch y de fracaso. Necesaria y olvidable.',

      'Mierda, [nombre], tu racha no tiene narrativa. Tiene continuidad tibia. Ni héroe ni villano del marcador.',

      'Mierda, [nombre], no hay material para el hilo de clutch ni para el de fracaso. Hay material para seguir.',

      'Hostia, [nombre], estás donde no hay aplauso fácil ni abucheo fácil. Hay el silencio del resultado medio.',

      'Joder, [nombre], el marcador de tu vida tiene más empates emocionales que goleadas. Empate es tu idioma.',

      'Hostia, [nombre], el grupo no apuesta fuerte a que ganes ni a que fracases. Apuesta al medio. Y acierta.',

      'Joder, [nombre], ni el grupo te sube a los hombros ni te baja a empujones. Te deja caminar en el centro.',

      'Mierda, [nombre], la gloria y el fracaso te conocen de vista. Ninguno te ha invitado a vivir con ellos.',

      'Coño, [nombre], has convertido el no destacar en una forma de competir. Se te nota el oficio del medio.',

      'Mierda, [nombre], no hay arco de redención ni de caída libre. Hay continuidad en el medio del marcador.',

      'Joder, [nombre], tu historial se resume sin adjetivos fuertes. Y la falta de adjetivos es. El veredicto.',

      'Hostia, [nombre], el grupo espera de ti el resultado del medio. Y tú cumples sin fallar la expectativa.',

      'Joder, [nombre], ni te inventan una leyenda ni te inventan una maldición de portero. Te miden en medio.',

      'Mierda, [nombre], el promedio te define sin drama. Y el sin drama es el tono de este tramo de ganador.',

      'Mierda, [nombre], el medio del ranking de ganador no pide aplausos. Pide aceptación. Acepta el número.',

      'Joder, [nombre], ni remontada imposible ni debacle ridícula. Partidos que existen y se olvidan al día.',

      'Mierda, [nombre], cuando ganas el grupo asiente y cuando pierdes también. El gesto es el mismo: medio.',

      'A veces brillas y haces que la gente espere más de ti. Luego te relajas y vuelves al montón. Medio ganador, a medias siempre.',

      'Mierda, [nombre], no hay clutch gene ni anti-clutch. Hay el gen del trámite. Partidos que se cumplen.',

      'Joder, [nombre], ni el grupo te sobreactúa victorias ni te infravalora derrotas. Te deja en tu tramo.',

      'Mierda, [nombre], la victoria y la derrota te saludan desde lejos. Ninguna se acerca a vivir contigo.',

      'Coño, [nombre], has hecho del suficiente un estilo. El estilo no se celebra ni se condena con ganas.',

      'Joder, [nombre], tu historial cabe en un resumen de una línea: suficiente. Y la línea no se discute.',

      'Mierda, [nombre], no generas fanaticada de clutch ni rechazo por fracaso. Generas el siguiente tema.',

      'Mierda, [nombre], estás en el tramo que no llena hilos de ganador. Y la ausencia de hilo es el dato.',

      'Joder, [nombre], ni el mejor tramo te saca del mid ni el peor te hunde del todo. Rango corto y tuyo.',

      'Joder, [nombre], tu historial no tiene chapters de gloria ni de humillación. Tiene continuidad gris.',

      'Coño, [nombre], has convertido el no ser noticia en tu forma de competir. Se te da bien el silencio.',

      'Mierda, [nombre], tu racha no tiene picos de audiencia. Tiene continuidad de fondo. Como el ambient.',

      'Mierda, [nombre], tu estabilidad en el medio es lo más predecible del ranking. Y lo menos comentado.',

      'Ni ganador ni perdedor. Te quedas en ese punto medio cómodo donde no pierdes pero tampoco ganas nada que merezca contarse.',

      'Tienes con qué ganar, pero te falta el último paso, ese que separa al que casi llega del que llega. Y ese paso es todo.',

      'Ganas lo justo para no quedar mal, nunca lo suficiente para que te recuerden por ello. Te falta hambre, no capacidad.',

      'Tienes destellos de ganador entre mucha tibieza. El día que sostengas el nivel en vez de visitarlo, otra cosa será.',

      'Ni levantas trofeos ni coleccionas derrotas memorables, [nombre]. El álbum está a medio llenar de páginas grises.',

      'Ni ganas ni pierdes con gloria, [nombre]. Estás en el tramo donde el resultado no da para titular ni para drama.',

      'Tu sitio en. El ranking es el más largo y el menos comentado, [nombre]. El de los que compiten sin ser extremos.',

      'Ni arrastras ni estorbas. Cumples, pasas, y a otra cosa. Ganador a medio gas, que es casi peor que no serlo.',

      'Ni eres el que llega ni el que se queda fuera del todo, [nombre]. Eres el que está. Y estar no da titulares.',

      'Tu sitio en. El ranking de ganadores es el más largo y el menos comentado, [nombre]. El de los que están.',

      'Ni clutch ni abandono, [nombre]. Partidos que se juegan y se olvidan. Tu especialidad es lo olvidable.',

      'Ni eres el que llega al final con gloria ni el que se cae antes, [nombre]. Eres el que termina. Punto.',

      'El medio no es un fracaso ni un éxito de ganador, [nombre]. Es el lugar donde el número te ha puesto.',

      'El medio te queda natural porque nunca has forzado un extremo de verdad, [nombre]. Coherencia plana.',

      'Ni anillo de campeón ni lanade perdedor, [nombre]. Camiseta de quien terminó la temporada. Nada más.',

      'El medio del ranking te queda como ropa lavada demasiadas veces, [nombre]: sin color fuerte, usable.',

      'Hostia puta, [nombre], tu racha es la del día laborable eterno. Funcional, sin picos de audiencia sin consuelo de consola.',

      'Hostia puta, [nombre], el resultado previsible en su gris es tu marca. Spoiler permanente y suave sin bis ni matiz de consuelo.',

      'Coño, [nombre], no hay final de temporada épico ni ridículo. Hay una temporada más. Como siempre sin descuento por empatía.',

      'Hostia puta, [nombre], tienes el look de resultados de un día laborable. Funcional, sin picos con el dígito como única defensa.',

      'Hostia puta, [nombre], resultados de día laborable. Se cumplen, se archivan, no se enmarcan. Delante del hueco que quedó.',

      'Hostia, [nombre], no eres rival temible ni víctima fácil. Eres el partido que se juega y se olvida delante de quien no quería verlo.',

      'Coño, [nombre], estás en el tramo que no llena la grada. La grada quiere extremos. Tú das el medio. Y el grupo ya pasó de página.',

      'Mierda, [nombre], has hecho del suficiente una residencia. La residencia no tiene vistas al trofeo con el peaje cobrado al natural.',

      'Mierda, [nombre], el promedio de resultados no necesita defensa. Se sostiene. Como este porcentaje sin segunda oportunidad hoy.',

      'Coño, [nombre], estás en el tramo que no se discute en voz alta. Se acepta y se sigue al siguiente delante de quien aún leía el hilo.',

      'Joder, [nombre], ni remontada de cine ni debacle de meme. Resultados que se archivan sin etiqueta. Sin derecho a matiz útil.',

      'Joder, [nombre], tu medallero es corto y sin brillo. Ni vacío dramático ni lleno orgulloso. Corto con el peaje cobrado al natural.',

      'Joder, [nombre], el ranking es matemáticamente correcto contigo. Centro. Sin drama añadido de más sin maquillaje ni segunda toma.',

      'Coño, [nombre], tienes el talento de no cerrar nada de forma memorable. Ni para bien ni para mal. Y el grupo ya pasó de página.',

      'Hostia, [nombre], tienes la cara de resultados de quien no altera el feed de victorias del grupo en el idioma seco del ranking.',

      'Hostia, [nombre], tienes resultados de archivo sin etiqueta especial. Se guardan, no se destacan sin maquillaje ni segunda toma.',

      'Coño, [nombre], el medio del ranking de victorias aburre de lo predecible. Tú eres lo predecible y. El ranking no pide permiso.',

    ],
    low: [
      'Joder, [nombre], eres el especial del grupo en perder con estilo. El estilo no compensa el resultado, gilipollas.',

      'Hostia puta, [nombre], cuando la suerte se reparte a ti te llega el recibo. Los patrones no mienten, cabrón.',

      'Mierda, [nombre], no levantas cabeza ni cuando te la ponen a tiro. El tiro lo desvías tú solo, gilipollas.',

      'Joder, [nombre], llevas el récord de segundas plazas emocionales. Nadie te disputa ese título de mierda.',

      'Hostia puta, [nombre], el podio te ve y apaga las luces. No quiere protagonistas de tu perfil, cabrón.',

      'Hostia puta, [nombre], no eres rival. Eres ambientación. Y la ambientación no sube al podio jamás sin descuento por empatía.',

      'Hostia puta, [nombre], el universo te mira y elige a otro. Sistemáticamente. No es mala suerte, es un patrón claro.',

      'Hostia puta, [nombre], no hay un solo trofeo en tu estantería real ni en la metafórica. Coherente hasta el final.',

      'Joder, [nombre], pierdes con la misma seguridad con la que otros ganan. Al menos eres consistente en la mierda.',

      'Hostia, [nombre], tienes más derrotas acumuladas que opiniones. Y las opiniones tampoco te salen bien, cabrón.',

      'Hostia puta, [nombre], el universo no trama contra ti. Simplemente no te elige. Diferencia importante y cruel.',

      'Hostia puta, [nombre], no hay foto del trofeo porque no hay trofeo. La cámara no miente y tú tampoco deberías.',

      'Hostia puta, [nombre], cada ranking te pone donde toca: abajo. Y no es conspiración, es promedio puro y duro.',

      'Hostia puta, [nombre], el trofeo tiene tu tamaño en la mente y cero en la realidad. Desfase total y visible.',

      'Hostia puta, [nombre], has hecho del perder una forma de estar en el mundo. Se te nota el oficio acumulado.',

      'Hostia puta, [nombre], cada oportunidad fue un espejismo. Y tú corriste hacia todos como si fueran reales.',

      'Hostia puta, [nombre], has hecho del no ganar una tradición emocional. Se hereda y se practica en público.',

      'Joder, [nombre], la línea de meta te ve llegar y se alarga. Personalizado exclusivamente para ti, cabrón.',

      'Hostia puta, [nombre], no hay un capítulo de tu vida titulado victoria. Solo prólogos largos de derrota.',

      'Hostia puta, [nombre], no es que pierdas por poco. Pierdes por sistema. El sistema eres tú. Y se nota.',

      'Hostia puta, [nombre], no fallas por azar. Fallas con método. El método eres tú y está perfeccionado.',

      'Hostia puta, [nombre], el podio tiene tres escalones y ninguno tiene tu medida. Ni por aproximación.',

      'Joder, [nombre], llevas el calendario lleno de casi y vacío de ya. El ya no te visita ni en sueños con el número en la frente del mensaje.',

      'Joder, [nombre], el marcador de tu vida es una racha de ceros con algún uno de consolación tirado en el momento que más dolía soltarlo.',

      'Joder, [nombre], cero de lo que se enmarca. Todo de lo que se explica con un casi fue y un suspiro con. El botín o el fail a la vista.',

      'Coño, [nombre], eres el que llega a la foto después del flash. Siempre. Sin excepción registrada con testigos obligados en el hilo.',

      'Coño, [nombre], has convertido la grada en tu cancha. Desde ahí se ve ganar, no se gana nunca en el segundo más incómodo del chat.',

      'Hostia, [nombre], cero de lo que cuenta. Todo de lo que se cuenta después para justificar el vacío con el dígito firmando solo, fracasado.',

      'Joder, [nombre], cada vez que te toca ganar el universo pide revisión del VAR. Y te anulan el gol. Y el chat archiva sin debate.',

      'Coño, [nombre], no eres el underdog que gana. Eres el underdog que se queda under para siempre sin segunda oportunidad hoy.',

      'Cero de ganador, [nombre]. No has ganado nada relevante en tu puta vida y se te nota en la cara de resignación permanente.',

      'Cero de momentum, [nombre]. Cada vez que arrancas se te para el motor en el primer puto semáforo. Sin filtro de autoayuda.',

      'Coño, [nombre], tienes el olfato de oler la victoria y alejarte. Talento natural para no estar donde se gana de verdad.',

      'Coño, [nombre], cada vez que alguien gana tú estás en la foto de los que miran. Siempre de fondo, nunca protagonista.',

      'Joder, [nombre], llevas tanto tiempo perdiendo que ya tienes técnica. Lástima que la técnica no dé trofeos de verdad.',

      'Mierda, [nombre], cuando hay algo que repartir tú ya estás fuera del reparto. Por costumbre, no por azar del destino.',

      'Hostia, [nombre], eres el que dice la próxima desde hace años. La próxima no llega y tú sigues con el mismo discurso, ridículo.',

      'Mierda, [nombre], tu definición de éxito es que no te haya ido peor. El listón está bajo tierra y aun así lo rozas.',

      'Joder, [nombre], ganas discusiones imaginarias y pierdes las reales. El balance es devastador. Y se nota en. El chat.',

      'Joder, [nombre], tienes más teorías de la victoria que victorias reales. El stock está completamente descompensado.',

      'Joder, [nombre], eres el tipo que celebra no haber perdido del todo. Eso no es ganar, es sobrevivir por los pelos.',

      'Mierda, [nombre], tienes más teoría de cómo se gana que práctica de haber ganado. El desfase se nota a kilómetros.',

      'Mierda, [nombre], cada oportunidad tenía instrucciones y tú las leíste al revés. Resultado coherente con el error.',

      'Coño, [nombre], cuando se reparten victorias tú estás en el baño. Coincidencia crónica que ya no engaña a nadie.',

      'Joder, [nombre], cada oportunidad que se te puso delante la miraste y la dejaste pasar. Curriculum de omisiones.',

      'Mierda, [nombre], cada oportunidad tenía tu nombre y tú le pusiste el de otro. Generosidad tóxica de campeonato.',

      'Mierda, [nombre], la victoria te conoce de vista y cruza la calle. Relación clara y sin malentendidos posibles.',

      'Coño, [nombre], has hecho del segundo puesto una residencia fija. Sin opción a compra ni a alquiler con opción.',

      'Hostia, [nombre], el podio te queda a años luz y tú sigues entrenando para la grada como si fuera el objetivo, joder.',

      'Tu racha negativa tiene más continuidad que tus proyectos, [nombre]. Prioridades claras y mal puestas, cabrón.',

      'Joder, [nombre], el marcador de tu vida parece un error de impresión: todo en cero menos las derrotas sumadas.',

      'Mierda, [nombre], la victoria tiene lista de invitados y tú no estás. Ni de suplente ni de invitado de piedra.',

      'Mierda, [nombre], tienes más finales perdidas que partidos ganados. La proporción delata sin necesidad de VAR.',

      'Coño, [nombre], cada vez que compites el resultado es una decepción previsible. Spoiler eterno y sin sorpresa.',

      'Coño, [nombre], eres el que llega cuando ya se repartió todo. El timing del perdedor profesional certificado.',

      'Hostia, [nombre], no eres rival de nadie porque nadie te pone en el cartel. Te saltan sin pensarlo dos veces, basura.',

      'Joder, [nombre], llevas tanto sin ganar que si ganaras el grupo pediría repetición del test por incredulidad.',

      'Mierda, [nombre], no hay un solo título en tu estantería que no sea de participó. Participó no es ganó nunca.',

      'Coño, [nombre], te han ganado hasta en las cosas que ni competías. Eso ya es un don invertido de campeonato.',

      'Hostia, [nombre], no hay highlight reel tuyo porque no hay highlights. Solo metraje de relleno y de derrota, mierda.',

      'Ganador de las que el low te deja en el sótano del marcador sin debate, [nombre]. El veredicto joder.',

      'Tienes más almost que victorias y. El ranking lo grita. Sin filtro, [nombre]. El veredicto, el chat ya lo sabía, cabrón.',

      'Ganador de manual fallido: el marcador te conoce por los ceros, [nombre]. El veredicto Eso no se maquilla con ángulo, nivel sótano puro, gilipollas.',

      'Se te nota la racha de casi en cada mensaje y el low no convierte nada, [nombre]. El veredicto cabrón.',

      'Ganador de fondo de ranking: siempre sin el punto que cambia el partido, [nombre]. El veredicto gilipollas.',

      'Has hecho de la derrota una residencia fija en el tramo bajo, [nombre]. El veredicto El material habla solo, y se te nota a la legua, basura.',

      'Ganador sin el barniz: solo almost eterno y el low lo documenta, [nombre]. El veredicto Aquí, el bot no regala décimas, ridículo.',

      'El listón de ganar lo miras desde el sótano y no has subido, [nombre]. El veredicto El ranking firma y listo, archivo sin apelación, fracasado.',

      'Ganador con el mismo gag de siempre y cero variación. El veredicto ridículo, joder, el ranking no miente.',

      'Se te oye el eco del fail hasta en los mensajes de plan B, [nombre]. El veredicto, con el grupo de testigo, mierda.',

      'Ganador de historial público: el marcador está en la superficie, [nombre]. El veredicto Eso no se maquilla con ángulo, sin maquillaje posible, coño.',

      'Tienes más episodios de derrota que de algo que. El chat respete, [nombre]. El veredicto El tramo te nombra sin permiso, el veredicto es ese, cabrón.',

      'Ganador cutre: ni el fallo tiene gracia ni la racha tiene misterio, [nombre]. El veredicto, hostia puta qué nivel.',

      'Has convertido el almost en marca personal del low, [nombre]. El veredicto El material habla solo, joder.',

      'Ganador de las que el mute ajeno lee como respeto y es desinterés, [nombre]. El veredicto, mierda. Y.',

      'El asco. No es bullying: es el diagnóstico de una racha que no corta, [nombre]. El veredicto gilipollas.',

      'Ganador constante: la única racha es la de no cerrar el punto, [nombre]. El veredicto Se ve desde el primer mensaje, cabrón.',

      'Se te nota la prisa por explicar el fail y cero plan de no repetirlo, [nombre]. El veredicto, gilipollas.',

      'Ganador de cartel de sótano: se ve el letrero y nadie baja a firmar, [nombre]. El veredicto, patético.',

      'No hay misterio interesante: hay previsible y flojo, el combo del low, [nombre]. El veredicto ridículo.',

      'Tienes el historial de un equipo que no gana ni amistosos, [nombre]. El veredicto No hay segunda lectura útil, basura.',

      'Ganador de inercia: el grupo te soporta por costumbre, no por respeto, [nombre]. El veredicto pringado.',

      'El recato de perder te queda lejos y la distancia es rechazo, [nombre]. El veredicto Aquí. Hostia puta, qué nivel.',

      'Ganador de ranking: bajas la media del tramo con constancia de caer, [nombre]. El veredicto, qué asco de frame.',

      'Has hecho del bajo listón tu casa en el low, [nombre]. El veredicto coño. Se ve desde el primer mensaje, y el ranking no miente.',

      'Ganador de estribillo que mancha más con cada repetición del fail, [nombre]. El veredicto, sin anestesia, basura.',

      'Se te nota el hábito de empujar cada tema hacia la misma derrota, [nombre]. El veredicto Eso no se maquilla con ángulo, el chat ya lo sabía, ridículo.',

      'La compostura no te reconoce y tú no has buscado el espejo del marcador, [nombre]. El veredicto patético.',

      'Ganador de fondo permanente: el low no es un mal día, es el nivel, [nombre]. El veredicto, sin filtro ni consuelo, joder.',

      'No es mala suerte: es patrón y el low te lo cobra, [nombre]. El veredicto El material habla solo, diagnóstico cerrado, mierda.',

      'Tienes más grasa de derrota que un vestuario después del 0-5, [nombre]. El veredicto Aquí, y se te nota a la legua, coño.',

      'Ganador de ceja ajena levantada y respeto en el sótano, [nombre]. El veredicto El ranking firma y listo, el bot no regala décimas, cabrón.',

      'El promedio de este tramo es el tuyo: el suelo del low, [nombre]. El veredicto Se ve desde el primer mensaje, archivo sin apelación, gilipollas.',

      'Has convertido el almost en identidad y no hay detergente, [nombre]. El veredicto. Hostia puta, qué nivel.',

      'Ganador cutre y sin complejo: el complejo pediría espejo y no lo hay, [nombre]. El veredicto, con el grupo de testigo, asco.',

      'Se te oye el masticar del listón bajo hasta en los neutros, [nombre]. El veredicto El tramo te nombra sin permiso, sin maquillaje posible, basura.',

      'La dignidad no te coge el teléfono: el buzón está lleno de avisos del marcador, [nombre]. El veredicto cabrón, patético.',

      'Ganador de letrero grasiento: se lee de lejos y no invita a entrar, [nombre]. El veredicto gilipollas, miserable.',

      'No hay misterio de derrota con estilo: hay lo previsible y el low lo nombra, [nombre]. El veredicto patético, qué cringe.',

      'Tienes el historial de un fregadero abandonado desde el domingo, [nombre]. El veredicto El ranking firma y listo, da asco.',

      'Ganador de malinterpretar el silencio como respeto al underdog, [nombre]. El veredicto Se ve desde el primer mensaje, qué vergüenza.',

      'El grupo paga tu rastro de fail en cuotas diarias de hastío, [nombre]. El veredicto. Hostia puta, qué nivel, ridículo.',

      'Has dejado el chat como vestuario de derrota: restos de almost, [nombre]. El veredicto Eso no se maquilla con ángulo, fracasado.',

      'Ganador de estribillo sin punto final limpio ni redención, [nombre]. El veredicto El tramo te nombra sin permiso, patético.',

      'Se te nota el peso de arrastrar la misma derrota por cada hilo, [nombre]. El veredicto No hay segunda lectura útil, asco, da grima.',

      'La compostura cruza de acera cuando te ve en el low del comando, [nombre]. El veredicto El material habla solo, basura.',

      'Ganador de feria: ruido de fail, suelo peor y cero ganas de volver, [nombre]. El veredicto, ridículo.',

      'Se te ve venir la derrota en la primera palabra del mensaje, [nombre]. El veredicto El ranking firma y listo, fracasado.',

      'La dignidad del tramo no para: tú eres el tráfico del arcén, [nombre]. El veredicto Se ve desde el primer mensaje, qué asco de frame, da pena ajena.',

      'Ganador de superficie: no hace falta abrir el vestuario, huele a fail, [nombre]. El veredicto patético, qué vacío.',

      'No hay barniz que salve: hay derrota pura y el low la cobra, [nombre]. El veredicto Eso no se maquilla con ángulo, sin anestesia, indignante.',

      'Ganador de puta madre en el sentido del almost: el low no suaviza el marcador, [nombre]. El veredicto basura, qué vergüenza ajena.',

      'Tu racha de ceros es el gag del tramo. Y el grupo no pide replay, [nombre]. El veredicto No hay segunda lectura útil, nivel sótano puro, da vergüenza.',

      'Ganador de las que el marcador te debe una hostia y. El ranking te la cobra, [nombre]. El veredicto fracasado, qué flojo.',

      'Se te cae el personaje de ganador solo con abrir el comando, [nombre]. El veredicto Aquí, diagnóstico cerrado, asco, menudo desastre.',

      'Ganador de almost eterno: esta vez tampoco fue la excepción, [nombre]. El veredicto El ranking firma y listo, y se te nota a la legua, basura.',

      'No hay redención en este low: hay veredicto y te nombra. Sin filtro, [nombre]. El veredicto, el bot no regala décimas, ridículo.',

      'Ganador con más excusas que puntos en el marcador del puto ranking, [nombre]. El veredicto, archivo sin apelación, miserable.',

      'El low te ha puesto en tu sitio: abajo, sin debate, [nombre]. El veredicto Eso no se maquilla con ángulo, qué cringe.',

      'Ganador de las que juraban que esta vez sí y el marcador dijo que no, [nombre]. El veredicto gilipollas, da asco.',

      'Tu almost es el contenido gratis de ridículo del hilo, [nombre]. El veredicto No hay segunda lectura útil, sin maquillaje posible, qué vergüenza.',

      'Ganador de ranking roto: el número bajo te queda de apodo, [nombre]. El veredicto El material habla solo, el veredicto es ese, cabrón.',

      'Se te ve el fail desde el primer mensaje del comando, [nombre]. El veredicto Aquí, hostia puta qué nivel, fracasado.',

      'Ganador de repertorio: siempre la misma derrota y cero plan B, [nombre]. El veredicto El ranking firma y listo, qué miseria.',

      'El asco del low resume el tramo y el resto desarrolla el diagnóstico, [nombre]. El veredicto fracasado, da grima.',

      'Ganador de puto almost: ni el plan B te salva y. El ranking lo grita, [nombre]. El veredicto pringado, qué nivel de pena.',

      'Has montado el teatro del ganador y el público solo vio el fail, [nombre]. El veredicto Eso no se maquilla con ángulo, basura.',

      'Ganador de las que confunden intención con resultado y pierden las dos, [nombre]. El veredicto, qué cutre.',

      'Tu racha es un aviso de lo que no hay que apostar en el grupo, [nombre]. El veredicto No hay segunda lectura útil, patético.',

      'Ganador con más pretensión que puntos y el low no se traga el cuento, [nombre]. El veredicto, asco. Y, qué vacío.',

      'El low no discute: el marcador habla y tú callas, [nombre]. El veredicto Aquí. Hostia puta, qué nivel, indignante.',

      'Ganador de las que el natural es perder., [nombre]. El veredicto El ranking firma y listo, ridículo.',

      'Se te nota el almost hasta en el mensaje más optimista del chat, [nombre]. El veredicto Se ve desde el primer mensaje, fracasado.',

      'Ganador de almost documentado: autor tú, testigo el grupo, [nombre]. El veredicto, qué asco de frame, qué flojo.',

      'No hay segunda lectura útil en este low: hay marcador y hay veredicto, [nombre]. El veredicto ridículo, menudo desastre.',

      'Ganador de las que el filtro de victoria se rinde antes que el de respeto, [nombre]. El veredicto fracasado, qué pena.',

      'Tu presencia en el low es el gag del comando y no el trofeo, [nombre]. El veredicto No hay segunda lectura útil, el chat ya lo sabía, ridículo.',

      'Ganador de ranking: el tramo bajo te queda como un guante de derrota, [nombre]. El veredicto, nivel sótano puro, fracasado.',

      'Has convertido el almost en residencia fiscal del low, [nombre]. El veredicto Aquí, sin filtro ni consuelo, qué cringe.',

      'Ganador de las que. El chat archiva el fail sin pedir amplificación, [nombre]. El veredicto, diagnóstico cerrado, da asco.',

      'El low te nombra sin suavizar: perdedor de base y punto, [nombre]. El veredicto Se ve desde el primer mensaje, y se te nota a la legua, qué vergüenza.',

      'Ganador con la disciplina de quien nunca aceptó el espejo del marcador, [nombre]. El veredicto gilipollas, ridículo.',

      'Se te ve venir el fail en la primera palabra del resultado, [nombre]. El veredicto Eso no se maquilla con ángulo, archivo sin apelación, fracasado.',

      'Ganador de puta pena: el comando no regala victorias y tú lo sabes, [nombre]. El veredicto. Hostia puta, qué nivel, qué miseria.',

      'Tu racha baja el promedio del hilo solo con cargarse, [nombre]. El veredicto No hay segunda lectura útil, con el grupo de testigo, asco, da grima.',

      'Ganador de las que el modo victoria tampoco es cómplice del fail, [nombre]. El veredicto El material habla solo, sin maquillaje posible, basura.',

      'El low es tu tramo natural y. El ranking no ofrece recurso, [nombre]. El veredicto Aquí, el veredicto es ese, ridículo.',

      'Ganador de almost eterno con firma legible en cada derrota del chat, [nombre]. El veredicto pringado, qué cutre.',

      'No es un mal día: es el nivel y el low te lo cobra sin descuento, [nombre]. El veredicto Se ve desde el primer mensaje, da pena ajena.',

      'Ganador de las que necesitan suerte y aun así el resultado es mierda, [nombre]. El veredicto, qué vacío.',

      'Tu marcador es el argumento más corto del comando y el más claro, [nombre]. El veredicto Eso no se maquilla con ángulo, indignante.',

      'Se te cae el disimulo de ganador solo con el resultado del comando, [nombre]. El veredicto gilipollas, qué vergüenza ajena.',

      'Ganador de las que el grupo no cita porque no hay victoria que citar, [nombre]. El veredicto patético, da vergüenza.',

      'Has firmado el fail con cada almost como única firma del low, [nombre]. El veredicto El material habla solo, patético.',

      'Ganador de superficie: basta el marcador, no hace falta el sótano, [nombre]. El veredicto, asco. Y. Hostia puta, qué nivel, menudo desastre.',

      'El low no es caridad: es veredicto y te nombra sin anestesia, [nombre]. El veredicto El ranking firma y listo, basura.',

      'Ganador de puto desastre: ni el plan ni la suerte colaboran contigo, [nombre]. El veredicto fracasado, patético.',

      'Ganador de las que el algoritmo de victoria pide la baja por agotamiento, [nombre]. El veredicto joder, miserable.',

      'El ranking de victorias te deja en el sótano del low sin debate, [nombre]. El veredicto Eso no se maquilla con ángulo, qué asco de frame, qué cringe.',

      'Ganador de las que confunden natural con no ganar nunca de verdad, [nombre]. El veredicto gilipollas, da asco.',

      'No hay filtro mágico: hay evidencia y el low la firma en público, [nombre]. El veredicto No hay segunda lectura útil, sin anestesia, qué vergüenza.',

      'Tu almost es el gag del tramo. Y el grupo no pide repetición, [nombre]. El veredicto El material habla solo, el chat ya lo sabía, ridículo.',

      'Ganador de almost documentado en alta definición del chat, [nombre]. El veredicto Aquí, nivel sótano puro, fracasado.',

      'Se te ve el fail desde el otro lado del puto ranking, [nombre]. El veredicto El ranking firma y listo, sin filtro ni consuelo, qué miseria.',

      'Ganador de las que el marcador y. El ranking coinciden en. El veredicto, [nombre]. El veredicto pringado, da grima.',

      'El low te ha puesto en tu sitio sin necesidad de narrador, [nombre]. El veredicto, y se te nota a la legua, basura.',

      'Has montado el teatro de ganador y solo salió el fail del low, [nombre]. El veredicto Eso no se maquilla con ángulo, el bot no regala décimas, ridículo.',

      'Ganador de ranking: el tramo bajo es tu residencia fija, [nombre]. El veredicto El tramo te nombra sin permiso, archivo sin apelación, fracasado.',

      'Tu racha baja el promedio del grupo en un solo resultado, [nombre]. El veredicto No hay segunda lectura útil, da pena ajena.',

      'Ganador de las que el modo victoria se arrepiente de haberse abierto, [nombre]. El veredicto patético, qué vacío.',

      'No es mala racha ni cámara mala: eres tú y el low lo dice claro, [nombre]. El veredicto Aquí, sin maquillaje posible, indignante.',

      'Ganador de almost eterno: el comando no convierte el casi en victoria, [nombre]. El veredicto basura, qué vergüenza ajena.',

      'Se te cae el personaje de ganador en el primer resultado del hilo, [nombre]. El veredicto, hostia puta qué nivel, da vergüenza.',

      'Ganador de las que necesitan tutorial de ganar y de dignidad, [nombre]. El veredicto. Hostia puta, qué nivel, qué flojo.',

      'El low no regala décimas: el marcador habla y tú estás abajo, [nombre]. El veredicto Eso no se maquilla con ángulo, menudo desastre.',

      'Ganador de puto almost con firma en cada derrota del chat, [nombre]. El veredicto El tramo te nombra sin permiso, qué pena.',

      'Tu racha es contenido de ridículo gratis para el grupo, [nombre]. El veredicto No hay segunda lectura útil, patético.',

      'Has convertido el fail en marca personal del low, [nombre]. El veredicto El material habla solo, miserable.',

      'Ganador de repertorio gastado: las mismas derrotas, el mismo almost, [nombre]. El veredicto gilipollas, qué cringe.',

      'Se te nota el desastre hasta en el resultado más antiguo del perfil, [nombre]. El veredicto patético, da asco.',

      'El low te nombra sin suavizar ni media coma del veredicto, [nombre]. El veredicto Se ve desde el primer mensaje, basura.',

      'Ganador de almost: ni el plan B te favorece. Y el chat lo ve, [nombre]. El veredicto. Hostia puta, qué nivel, ridículo.',

      'Tu presencia es un argumento contra la racha del grupo, [nombre]. El veredicto Eso no se maquilla con ángulo, fracasado.',

      'Ganador de puta pena en el tramo que más se lee del comando, [nombre]. El veredicto El tramo te nombra sin permiso, qué asco de frame, qué miseria.',

      'No hay redención en este low: hay marcador, hay número y hay veredicto, [nombre]. El veredicto joder, da grima.',

      'Ganador de las que el grupo archiva el fail sin pedir bis, [nombre]. El veredicto El material habla solo, sin anestesia, basura.',

      'Ganador de ranking roto: el sótano del tramo te queda de casa, [nombre]. El veredicto Aquí, el chat ya lo sabía, ridículo.',

      'El comando no discute contigo: el low firma y punto, [nombre]. El veredicto El ranking firma y listo, nivel sótano puro, fracasado.',

      'Ganador de las que confunden pose de victoria con victoria y pierden las dos, [nombre]. El veredicto patético, da pena ajena.',

      'Tu almost es el epitafio de la racha de hoy, [nombre]. El veredicto asco., diagnóstico cerrado. Hostia puta, qué nivel, qué vacío.',

      'Ganador de puto desastre documentado. Delante del grupo entero, [nombre]. El veredicto Eso no se maquilla con ángulo, y se te nota a la legua, indignante.',

      'Has firmado el fail con cada cero como única firma del low, [nombre]. El veredicto El tramo te nombra sin permiso, el bot no regala décimas, qué vergüenza ajena.',

      'Ganador de superficie suficiente: basta el marcador, sobra el resto, [nombre]. El veredicto fracasado, da vergüenza.',

      'El low es tu tramo y. El ranking no ofrece mudanza, [nombre]. El veredicto El material habla solo. Hostia puta, qué nivel, qué flojo.',

      'Se te cae el frame de ganador solo con cargar el resultado, [nombre]. El veredicto Aquí, con el grupo de testigo, asco, menudo desastre.',

      'Ganador de almost eterno con. El chat de testigo notarial, [nombre]. El veredicto El ranking firma y listo, sin maquillaje posible, basura.',

      'No es un mal día de resultados: es el nivel y el low te lo cobra, [nombre]. El veredicto Se ve desde el primer mensaje, el veredicto es ese, ridículo.',

      'Ganador de puta madre: el tramo bajo no suaviza. El veredicto del marcador, [nombre]. El veredicto gilipollas, miserable.',

      'Tu racha es el gag más corto y más claro del comando, [nombre]. El veredicto Eso no se maquilla con ángulo, qué cringe.',

      'Ganador de las que el algoritmo de respeto pide la baja al verte perder, [nombre]. El veredicto asco, da asco.',

    ],
    extreme: [
      'De los que la gente recuerda años después como la prueba de que sí se podía No hay segunda lectura útil, coño.',

      'Vas a ser el estándar imposible con el que otros se midan sin saber siquiera tu nombre El material habla solo, cabrón.',

      'Donde tú llegas casi nadie llega, y los que llegan tardan el triple y se dejan el doble Aquí. Hostia puta, qué nivel.',

      'Tu nombre tranquiliza salas enteras antes de que abras la boca. Eso no se compra ni se hereda, patético.',

      'Eres de los que cambian el rumbo de un grupo entero solo con decidir entrar en él Se ve desde el primer mensaje, asco.',

    ],
  },

  puta: {
    name: 'puta',
    goodIsHigh: false,
    high: [
      '[nombre], te repartes tan barato que hasta el puticlub te pediría referencia negativa. El sí fácil te delata más que un rumor, basura.',

      'Puta de rotación de cajero automático: sacan lo suyo y ni te miran a la cara, [nombre]. Qué, ridículo.',

      '[nombre], si el puterío cotizara en bolsa serías chicharro basura, no blue chip. Sin anestesia, fracasado.',

      'Has convertido el sí fácil en identidad. y el grupo ya no se sorprende, [nombre]. El sí fácil te delata más que un rumor, joder.',

      '[nombre], tienes más kilometraje que un taxi de aeropuerto en temporada alta. Has hecho del chat tu escaparate barato, mierda.',

      'Puta de las que el silencio ajeno lo leen como invitación a más teatro, [nombre]. Te repartes como flyer de after malo, coño.',

      '[nombre], te abres en canal por atención y luego te ofendes si te tratan como producto. El sí fácil te delata más que un rumor, cabrón.',

      'El listón del respeto lo enterraste tú misma con cada estribillo barato, [nombre]. Has hecho del chat tu escaparate barato, gilipollas.',

      '[nombre], puta de fondo de chat: siempre el mismo gag y cero misterio. Te repartes como flyer de after malo, patético.',

      'Te vendes en cuotas y nadie pidió el plan de financiación, [nombre]. El sí fácil te delata más que un rumor, asco.',

      '[nombre], si la dignidad fuera preservativo, tú cogerías sin. Sin anestesia. Has hecho del chat tu escaparate barato, basura.',

      'Puta de repertorio corto: las mismas cartas de \'mírame\' en cada mano, [nombre]. Te repartes como flyer de after malo, ridículo.',

      '[nombre], has hecho del almost de intocable tu marca personal. El sí fácil te delata más que un rumor, fracasado.',

      'El grupo te tiene de meme sexual sin pedirte permiso, [nombre]. Has hecho del chat tu escaparate barato, joder.',

      '[nombre], puta de las que el putero profesional pediría descuento por volumen. Te repartes como flyer de after malo, mierda.',

      'Te repartes como flyer de discoteca mala: nadie lo pidió y acaba en el suelo, [nombre]. El sí fácil te delata más que un rumor, coño.',

      '[nombre], tu sí vale menos que un like anónimo de madrugada. Has hecho del chat tu escaparate barato, cabrón.',

      'Puta sin el barniz de \'liberada\': solo hambre de validación barata, [nombre]. Te repartes como flyer de after malo, gilipollas.',

      '[nombre], has convertido el chat en tu escaparate y el producto está en oferta. Sin anestesia, patético.',

      'Se te oye el estribillo de disponibilidad hasta en los mensajes \'serios\', [nombre]. Has hecho del chat tu escaparate barato, asco.',

      '[nombre], puta de manual: el ranking te nombra y tú posas. Te repartes como flyer de after malo, basura.',

      'Si el puterío fuera currículum, tendrías páginas de relleno y cero logros, [nombre]. El sí fácil te delata más que un rumor, ridículo.',

      '[nombre], te abres más fácil que un zip de archivo corrupto. Has hecho del chat tu escaparate barato, fracasado.',

      'Puta de las que confunden atención con respeto y se caen del pedestal, [nombre]. Te repartes como flyer de after malo, joder.',

      '[nombre], el grupo ya no debate: te tiene catalogada y archivada. El sí fácil te delata más que un rumor, mierda.',

      'Has hecho del \'cualquier mira vale\' tu política exterior, [nombre]. Has hecho del chat tu escaparate barato, coño.',

      '[nombre], puta de kilometraje alto y mantenimiento cero. Sin anestesia. Te repartes como flyer de after malo, cabrón.',

      'Te vendes en liquidación permanente y aun así no se agota el stock, [nombre]. El sí fácil te delata más que un rumor, gilipollas.',

      '[nombre], el sí fácil te quedó de tatuaje invisible. Has hecho del chat tu escaparate barato, patético.',

      'Puta de las que el silencio de los demás es el único filtro que te queda, [nombre]. Te repartes como flyer de after malo, asco.',

      '[nombre], tienes más vueltas que un portero automático de edificio viejo. El sí fácil te delata más que un rumor, basura.',

      'El puterío te queda de uniforme y no de disfraz de una noche, [nombre]. Has hecho del chat tu escaparate barato, ridículo.',

      '[nombre], te repartes con la frialdad de quien ya no espera nada a cambio. Te repartes como flyer de after malo, fracasado.',

      'Puta de fondo: el chat te usa de gag y tú sigues el libreto, [nombre]. El sí fácil te delata más que un rumor, joder.',

      '[nombre], si la dignidad tuviera alarma, a ti se te rompió hace años. Sin anestesia. Has hecho del chat tu escaparate barato, mierda.',

      'Has convertido cada hilo en casting improvisado, [nombre]. Te repartes como flyer de after malo, coño.',

      '[nombre], puta de las que el almost de misterio se fue con el primer sí. El sí fácil te delata más que un rumor, cabrón.',

      'Te abres en canal por un poco de ruido y el eco te devuelve asco, [nombre]. Has hecho del chat tu escaparate barato, gilipollas.',

      '[nombre], el ranking de puta te tiene de inquilina fija. Te repartes como flyer de after malo, patético.',

      'Puta sin plot de redención: solo el mismo estribillo, [nombre]. El sí fácil te delata más que un rumor, asco.',

      '[nombre], te vendes tan barato que hasta el descuento se avergüenza. Has hecho del chat tu escaparate barato, basura.',

      'Se te nota la hambre de validación en cada puto mensaje, [nombre]. Te repartes como flyer de after malo, ridículo.',

      '[nombre], puta de manual negro: el grupo firma y tú posas. Sin anestesia. El sí fácil te delata más que un rumor, fracasado.',

      'El sí fácil te delata más que cualquier rumor del chat, [nombre]. Has hecho del chat tu escaparate barato, joder.',

      '[nombre], has hecho del escaparate tu única personalidad. Te repartes como flyer de after malo, mierda.',

      'Puta de las que confunden circulacion con deseo real, [nombre]. El sí fácil te delata más que un rumor, coño.',

      '[nombre], te repartes como menú del día: predecible y frío. Has hecho del chat tu escaparate barato, cabrón.',

      'El listón del respeto lo bajaste tú hasta el sótano, [nombre]. Te repartes como flyer de after malo, gilipollas.',

      '[nombre], puta de kilometraje visible y orgullo de cartón. El sí fácil te delata más que un rumor, patético.',

      'Te abres más que un debate en este grupo y con menos sustancia, [nombre]. Has hecho del chat tu escaparate barato, asco.',

      '[nombre], si el puterío fuera deporte, serías suplente eterno. Sin anestesia. Te repartes como flyer de after malo, basura.',

      'Puta de las que el chat ya no se sorprende: solo archiva, [nombre]. El sí fácil te delata más que un rumor, ridículo.',

      '[nombre], has convertido el almost de intocable en chiste interno. Has hecho del chat tu escaparate barato, fracasado.',

      'Te vendes en cuotas y nadie pidió el recibo, [nombre]. Te repartes como flyer de after malo, joder. Hostia puta, qué nivel.',

      '[nombre], puta de fondo de hilo: siempre disponible, nunca respetada. El sí fácil te delata más que un rumor, mierda.',

      'El grupo te tiene de meme y tú sigues alimentando el formato, [nombre]. Has hecho del chat tu escaparate barato, coño.',

      '[nombre], se te oye el estribillo de \'miradme\' hasta en los audios. Te repartes como flyer de after malo, cabrón.',

      'Puta sin barniz de misterio ni de estilo, [nombre]. Asco. Documentado. El sí fácil te delata más que un rumor, gilipollas.',

      '[nombre], te repartes con la elegancia de un anuncio popup. Sin anestesia. Has hecho del chat tu escaparate barato, patético.',

      'Si la dignidad fuera contraseña, a ti te la hackearon en 2019, [nombre]. Te repartes como flyer de after malo, asco.',

      '[nombre], puta de las que el sí vale menos que un sticker. El sí fácil te delata más que un rumor, basura.',

      'Has hecho del chat tu puticlub sin cover, [nombre]. Has hecho del chat tu escaparate barato, ridículo.',

      '[nombre], el ranking te nombra y el resto asiente sin debate. Te repartes como flyer de after malo, fracasado.',

      'Puta de manual: disponibilidad alta, respeto en cero, [nombre]. El sí fácil te delata más que un rumor, joder.',

      '[nombre], te abres en canal por atención de segunda. Has hecho del chat tu escaparate barato, mierda.',

      'El puterío te quedó de marca personal y no de noche suelta, [nombre]. Te repartes como flyer de after malo, coño.',

      '[nombre], tienes más vueltas que el rumor del grupo. Sin anestesia. El sí fácil te delata más que un rumor, cabrón.',

      'Puta de las que el almost de clase se fue con el primer post, [nombre]. Has hecho del chat tu escaparate barato, gilipollas.',

      '[nombre], te vendes en liquidación y el stock no baja. Te repartes como flyer de after malo, patético.',

      'Se te nota el hambre hasta en los mensajes que quieren parecer fríos, [nombre]. El sí fácil te delata más que un rumor, asco.',

      '[nombre], puta de fondo: el chat te usa y tú agradeces el uso. Has hecho del chat tu escaparate barato, basura.',

      'Si el puterío cotizara, serías el chicharro del día, [nombre]. Te repartes como flyer de after malo, ridículo.',

      '[nombre], has convertido cada mirada en ticket de entrada. El sí fácil te delata más que un rumor, fracasado.',

      'Puta sin derecho a ofenderte cuando te tratan como catálogo, [nombre]. Has hecho del chat tu escaparate barato, joder.',

      '[nombre], el sí fácil te delata más que un historial público. Sin anestesia. Te repartes como flyer de after malo, mierda.',

      'Te repartes como flyer mojado: nadie lo guarda, [nombre]. El sí fácil te delata más que un rumor, coño.',

      '[nombre], puta de kilometraje alto y narrativa baja. Has hecho del chat tu escaparate barato, cabrón.',

      'El grupo ya no discute el diagnóstico: lo da por cerrado, [nombre]. Te repartes como flyer de after malo, gilipollas.',

      '[nombre], has hecho del escaparate tu único argumento. El sí fácil te delata más que un rumor, patético.',

      'Puta de las que confunden ruido con valor, [nombre]. Has hecho del chat tu escaparate barato, asco, asco.',

      '[nombre], te abres más fácil que la configuración de privacidad en cero. Te repartes como flyer de after malo, basura.',

      'El listón del respeto lo enterraste con cada estribillo, [nombre]. El sí fácil te delata más que un rumor, ridículo.',

      '[nombre], puta de manual negro delante del puto chat. Sin anestesia. Has hecho del chat tu escaparate barato, fracasado.',

      'Te vendes barato y luego quieres tarifa de lujo, [nombre]. Te repartes como flyer de after malo, joder.',

      '[nombre], se te oye la disponibilidad hasta en el \'buenos días\' El sí fácil te delata más que un rumor, mierda.',

      'Puta de fondo de ranking: inquilina fija del nivel, [nombre]. Has hecho del chat tu escaparate barato, da asco.',

      '[nombre], has convertido el almost de misterio en chiste gastado. Te repartes como flyer de after malo, qué vergüenza.',

      'Si la dignidad tuviera seguro, a ti te lo cancelaron, [nombre]. El sí fácil te delata más que un rumor, ridículo.',

      '[nombre], puta de las que el chat archiva sin pedir bis. Has hecho del chat tu escaparate barato, patético.',

      'Te repartes con la frialdad de un menú de gasolinera, [nombre]. Te repartes como flyer de after malo, asco, qué miseria.',

      '[nombre], el ranking de puta te tiene de ejemplo cuando explica el sótano. Sin anestesia. El sí fácil te delata más que un rumor, basura.',

      'Puta sin plot twist: solo el mismo libreto, [nombre]. Has hecho del chat tu escaparate barato, ridículo.',

      '[nombre], te abres en canal por migajas de atención. Te repartes como flyer de after malo, fracasado.',

      'El puterío te queda de uniforme de diario, [nombre]. El sí fácil te delata más que un rumor, joder. Hostia puta, qué nivel.',

      '[nombre], has hecho del sí tu única estrategia social. Has hecho del chat tu escaparate barato, da pena ajena.',

      'Puta de las que el silencio ajeno es el único límite que no cruzas, [nombre]. Te repartes como flyer de after malo, qué vacío.',

      '[nombre], te vendes en oferta y el precio sigue cayendo. El sí fácil te delata más que un rumor, indignante.',

      'Se te nota el hambre de validación a la legua, [nombre]. Has hecho del chat tu escaparate barato, qué vergüenza ajena.',

      'El grupo te tiene catalogada: el bot solo confirma, [nombre]. Sin anestesia. Te repartes como flyer de after malo, patético.',

      '[nombre], si el puterío fuera currículum, tendrías relleno y cero logros. El sí fácil te delata más que un rumor, asco, qué flojo.',

      'Puta de manual: el chat firma el parte y tú posas, [nombre]. Has hecho del chat tu escaparate barato, basura.',

      '[nombre], te repartes como anuncio que nadie puede cerrar. Te repartes como flyer de after malo, ridículo.',

      'El sí fácil te quedó de cicatriz pública, [nombre]. El sí fácil te delata más que un rumor, fracasado.',

      '[nombre], has convertido cada hilo en tu pasarela de descuentos. Has hecho del chat tu escaparate barato, miserable.',

      'Puta de las que confunden circulación con deseo, [nombre]. Te repartes como flyer de after malo, qué cringe.',

      '[nombre], te abres más que un zip dañado y con el mismo resultado. El sí fácil te delata más que un rumor, da asco.',

      'El listón del respeto está en el sótano con tu nombre, [nombre]. Sin anestesia. Has hecho del chat tu escaparate barato, qué vergüenza.',

      '[nombre], puta de fondo: siempre el mismo gag. Te repartes como flyer de after malo, gilipollas, ridículo.',

      'Te vendes barato y el stock no se agota nunca, [nombre]. El sí fácil te delata más que un rumor, patético.',

      '[nombre], se te oye el estribillo de disponibilidad en cada audio. Has hecho del chat tu escaparate barato, asco, qué miseria.',

      'Puta sin barniz de \'empoderada\': solo hambre, [nombre]. Te repartes como flyer de after malo, basura.',

      '[nombre], el ranking te nombra y el resto del chat entiende el chiste. El sí fácil te delata más que un rumor, ridículo.',

      'Has hecho del almost de intocable tu mayor fail, [nombre]. Has hecho del chat tu escaparate barato, fracasado.',

      '[nombre], puta de las que el putero amateur pediría recibo. Te repartes como flyer de after malo, qué cutre.',

      'Te repartes con la elegancia de un popup de virus, [nombre]. Sin anestesia. El sí fácil te delata más que un rumor, da pena ajena.',

      '[nombre], si la dignidad fuera contraseña, ya la habrían cambiado por ti. Has hecho del chat tu escaparate barato, qué vacío.',

      'Puta de kilometraje alto y misterio en quiebra, [nombre]. Te repartes como flyer de after malo, indignante.',

      '[nombre], el grupo ya no se sorprende: solo documenta. El sí fácil te delata más que un rumor, qué vergüenza ajena.',

      'Te abres en canal por ruido de segunda división, [nombre]. Has hecho del chat tu escaparate barato, patético.',

      '[nombre], puta de manual negro: disponibilidad máxima, respeto nulo. Te repartes como flyer de after malo, asco, qué flojo.',

      'El sí fácil te delata más que cualquier captura, [nombre]. El sí fácil te delata más que un rumor, basura.',

      'Puta de las que el almost de clase se fue en el primer mensaje, [nombre]. Has hecho del chat tu escaparate barato, ridículo.',

      '[nombre], te vendes en liquidación permanente. Sin anestesia. Te repartes como flyer de after malo, fracasado.',

      'Se te nota el hambre hasta cuando finges indiferencia, [nombre]. El sí fácil te delata más que un rumor, miserable.',

      '[nombre], puta de fondo de hilo y de ranking. Has hecho del chat tu escaparate barato, mierda, qué cringe.',

      'Si el puterío cotizara, serías el valor que nadie recomienda, [nombre]. Te repartes como flyer de after malo, da asco.',

      '[nombre], el listón del respeto lo bajaste tú con cada sí. El sí fácil te delata más que un rumor, qué vergüenza.',

      'Puta sin derecho a victimismo cuando el catálogo te describe, [nombre]. Has hecho del chat tu escaparate barato, ridículo.',

      '[nombre], te repartes como menú del día en bar de carretera. Te repartes como flyer de after malo, patético.',

      'El ranking de puta te tiene de inquilina vitalicia, [nombre]. El sí fácil te delata más que un rumor, asco, qué miseria.',

      '[nombre], has hecho del sí tu única carta y se te ve la baraja. Sin anestesia. Has hecho del chat tu escaparate barato, basura.',

      'Puta de las que el chat usa de gag y tú sigues el libreto, [nombre]. Te repartes como flyer de after malo, ridículo.',

      '[nombre], te abres más fácil que la privacidad en cero. El sí fácil te delata más que un rumor, fracasado.',

      'El puterío te quedó de marca y no de accidente, [nombre]. Has hecho del chat tu escaparate barato, qué cutre.',

      '[nombre], puta de kilometraje que ya no admite garantía. Te repartes como flyer de after malo, da pena ajena.',

      'Te vendes barato y luego quieres trato de boutique, [nombre]. El sí fácil te delata más que un rumor, qué vacío.',

      '[nombre], se te oye la disponibilidad en el \'hola\' del desbloqueo. Has hecho del chat tu escaparate barato, indignante.',

      'Puta de manual: el bot confirma lo que el grupo ya sabía, [nombre]. Te repartes como flyer de after malo, qué vergüenza ajena.',

      'Si la dignidad tuviera alarma, sonaría cada vez que escribes, [nombre]. Sin anestesia. El sí fácil te delata más que un rumor, patético.',

      '[nombre], puta de fondo: el eco te devuelve el mismo. Has hecho del chat tu escaparate barato, asco, asco, qué flojo.',

      'Te repartes con la frialdad de quien ya aceptó el catálogo, [nombre]. Te repartes como flyer de after malo, basura.',

      '[nombre], el almost de misterio se te escapó en el primer sí. El sí fácil te delata más que un rumor, ridículo.',

      'Puta de las que confunden atención con respeto y caen, [nombre]. Has hecho del chat tu escaparate barato, fracasado.',

      '[nombre], te abres en canal por migajas y aún así das las gracias. Te repartes como flyer de after malo, miserable.',

      'El grupo te tiene de meme sexual sin pedirte royalties, [nombre]. El sí fácil te delata más que un rumor, qué cringe.',

      '[nombre], puta de ranking fijo en el sótano del respeto. Has hecho del chat tu escaparate barato, da asco.',

      'Te vendes en oferta y el precio solo baja, [nombre]. Sin anestesia. Te repartes como flyer de after malo, qué vergüenza.',

      '[nombre], se te nota el hambre de validación en cada puto sticker. El sí fácil te delata más que un rumor, ridículo.',

      'Puta sin plot de redención en tres actos, [nombre]. Has hecho del chat tu escaparate barato, patético.',

      '[nombre], has hecho del escaparate tu personalidad completa. Te repartes como flyer de after malo, asco, qué miseria.',

      'El sí fácil te quedó de cicatriz que el chat lee en voz alta, [nombre]. El sí fácil te delata más que un rumor, basura.',

      '[nombre], puta de las que el silencio es el único que te pone límite. Has hecho del chat tu escaparate barato, ridículo.',

      'Te repartes como flyer de after de mala muerte, [nombre]. Te repartes como flyer de after malo, fracasado.',

      '[nombre], el ranking te nombra y nadie pide segunda opinión. El sí fácil te delata más que un rumor, qué cutre.',

      'Puta de manual negro delante de todo el grupo, [nombre]. Sin anestesia. Has hecho del chat tu escaparate barato, da pena ajena.',

      '[nombre], te abres más que un debate vacío y con menos contenido. Te repartes como flyer de after malo, qué vacío.',

      'Si el puterío fuera deporte, estarías en la grada del almost, [nombre]. El sí fácil te delata más que un rumor, indignante.',

      '[nombre], has convertido el almost de clase en chiste gastado del hilo. Has hecho del chat tu escaparate barato, qué vergüenza ajena.',

      'Puta de kilometraje alto y dignidad en números rojos, [nombre]. Te repartes como flyer de after malo, patético.',

      '[nombre], te vendes barato y el stock parece infinito. El sí fácil te delata más que un rumor, asco, asco, qué flojo.',

      'Se te oye el estribillo de \'disponible\' hasta en los estados, [nombre]. Has hecho del chat tu escaparate barato, basura.',

      '[nombre], puta de fondo de chat: el gag eres tú. Te repartes como flyer de after malo, ridículo, ridículo.',

      'El listón del respeto está enterrado con tu historial, [nombre]. Sin anestesia. El sí fácil te delata más que un rumor, fracasado.',

      'Puta de las que el chat archiva sin aplauso ni bis, [nombre]. Has hecho del chat tu escaparate barato, miserable.',

      '[nombre], has hecho del sí tu política exterior completa. Te repartes como flyer de after malo, qué cringe.',

      'Si la dignidad fuera seguro, a ti te lo negaron por riesgo, [nombre]. El sí fácil te delata más que un rumor, da asco.',

      '[nombre], puta de manual: disponibilidad de 24h, respeto de 0 Has hecho del chat tu escaparate barato, qué vergüenza.',

      'Te abres en canal por ruido y el eco te devuelve el diagnóstico, [nombre]. Te repartes como flyer de after malo, ridículo.',

      '[nombre], el puterío te delata más que cualquier rumor del grupo. El sí fácil te delata más que un rumor, patético.',

      'Puta de ranking: el bot solo pone número a lo obvio, [nombre]. Has hecho del chat tu escaparate barato, asco, qué miseria.',

      '[nombre], te vendes en liquidación y aun así sobra mercancía. Sin anestesia. Te repartes como flyer de after malo, basura.',

      'Se te nota el hambre hasta cuando intentas parecer selectiva, [nombre]. El sí fácil te delata más que un rumor, ridículo.',

      '[nombre], puta de las que el almost de intocable es el gag del año. Has hecho del chat tu escaparate barato, fracasado.',

      'El grupo te catalogó y el comando confirma el pasillo, [nombre]. Te repartes como flyer de after malo, qué cutre.',

      'Puta sin barniz, sin misterio y sin derecho a ofenderte, [nombre]. El sí fácil te delata más que un rumor, da pena ajena.',

      '[nombre], te repartes como menú de gasolinera a las 3 a.m. Has hecho del chat tu escaparate barato, qué vacío.',

      'El sí fácil te quedó de firma digital en el chat, [nombre]. Te repartes como flyer de after malo, indignante.',

      '[nombre], puta de kilometraje que ya no admite reclamaciones. El sí fácil te delata más que un rumor, qué vergüenza ajena.',

      'Te abres más fácil que la configuración por defecto, [nombre]. Sin anestesia. Has hecho del chat tu escaparate barato, patético.',

      '[nombre], el ranking de puta te tiene de ejemplo del sótano. Te repartes como flyer de after malo, asco, qué flojo.',

      'Puta de fondo: siempre el mismo libreto, [nombre]. El sí fácil te delata más que un rumor, basura, basura.',

      '[nombre], te vendes barato y quieres reseñas de cinco estrellas. Has hecho del chat tu escaparate barato, ridículo.',

      'Se te oye la disponibilidad en el primer \'jeje\' del hilo, [nombre]. Te repartes como flyer de after malo, fracasado.',

      '[nombre], has hecho del escaparate tu único talento documentado. El sí fácil te delata más que un rumor, miserable.',

      'Puta de las que el chat usa de meme y tú sigues subiendo material, [nombre]. Has hecho del chat tu escaparate barato, qué cringe.',

      '[nombre], si el puterío cotizara, serías warning del bróker. Te repartes como flyer de after malo, da asco.',

      'El listón del respeto lo tocaste vos y lo dejaste en el piso, [nombre]. Sin anestesia. El sí fácil te delata más que un rumor, qué vergüenza.',

      '[nombre], puta de manual negro: el grupo firma, tú posas. Has hecho del chat tu escaparate barato, ridículo.',

      'Te repartes con la frialdad de un catálogo PDF, [nombre]. Te repartes como flyer de after malo, patético.',

      '[nombre], el almost de misterio se te cayó en el primer sí del historial. El sí fácil te delata más que un rumor, asco, qué miseria.',

      'Puta de ranking fijo y sin plan de rehabilitación, [nombre]. Has hecho del chat tu escaparate barato, basura.',

      '[nombre], te abres en canal por migajas y aún pides propina. Te repartes como flyer de after malo, ridículo.',

      'El puterío te quedó de uniforme de diario del chat, [nombre]. El sí fácil te delata más que un rumor, fracasado.',

      '[nombre], has convertido el sí en tu única estrategia y se te ve el mazo. Has hecho del chat tu escaparate barato, qué cutre.',

      'Puta de las que el silencio ajeno es el único que te frena, [nombre]. Sin anestesia. Te repartes como flyer de after malo, da pena ajena.',

      '[nombre], te vendes en oferta permanente y el precio no toca suelo. El sí fácil te delata más que un rumor, qué vacío.',

      'Se te nota el hambre de validación en cada puto emoji, [nombre]. Has hecho del chat tu escaparate barato, indignante.',

      '[nombre], puta de fondo de hilo, de ranking y de meme. Te repartes como flyer de after malo, qué vergüenza ajena.',

      'Si la dignidad tuviera caducidad, la tuya estaría en el cubo, [nombre]. El sí fácil te delata más que un rumor, patético.',

      '[nombre], el bot te midió. y el grupo ya había firmado el parte. Has hecho del chat tu escaparate barato, asco, qué flojo.',

    ],
    mid: [
      'Ni puta del todo ni un ejemplo de nada. Te quedas en esa franja tibia donde a veces te respetas y a veces te regalas, sin línea clara. El grupo nunca sabe cuál va a aparecer.',

      'Tienes destellos de dignidad rodeados de decisiones que te devuelven al montón. Medio puta, medio salvable, y la balanza cambia según el día y quién te escriba.',

      'No eres puta de manual, pero tampoco das motivos para descartarlo del todo. Zona gris: ni te respetas del todo ni te sueltas del todo. Ambigua hasta para ti misma.',

      'A veces pareces tener límites y a veces se te olvidan solos. Esa inconsistencia es justo lo que te deja a medio camino de la etiqueta completa.',

      'Ni santa ni todo lo contrario. Cumples lo mínimo para que no te señalen y lo justo para que se hable. La zona más comentada que existe.',

      'Tienes con qué respetarte, pero lo desperdicias con una constancia llamativa. Medio puta por pereza de poner límites, no por otra cosa.',

      'No eres el escándalo del grupo, pero tampoco el ejemplo. En ese punto medio donde ni te defienden ni te condenan, solo comentan.',

      'Ni te respetas del todo ni te sueltas del todo. Esa ambigüedad es lo que mantiene el chisme vivo con el número hablando solo.',

      'A veces pones límites y a veces se te caen solos. Nadie sabe cuál de las dos versiones aparece en el único marcador que importa aquí.',

      'Tienes criterio a ratos. El problema es que los ratos son cortos y llegan tarde con. El veredicto seco del bot.',

      'Ni escándalo ni ejemplo. Estás en la franja donde se comenta pero no se confirma nada. Delante del público que no pidió entrada.',

      'Ni puta ni prudente. Un intermedio incómodo que no acaba de definirse en ninguna dirección sin bis ni matiz de consuelo.',

      'Cuando eliges, eliges bien. Lo raro es que elijas en vez de conformarte con lo que aparece y el contador no discute.',

      'Tienes momentos de dignidad seguidos de decisiones que los borran. Balance neto: cero sin bis ni matiz de consuelo.',

      'Ni te señalan ni te defienden. Estás en el punto donde solo levantan una ceja y basta el dato del ranking.',

      'A veces te frenas a tiempo y a veces no. Esa inconsistencia es exactamente tu porcentaje con. El bot como notario del fallo.',

      'Ni de manual ni impecable. Zona gris con material suficiente para que se hable, sin llegar a nada serio.',

      'Tu criterio funciona cuando estás tranquila. El problema es la frecuencia con la que no lo estás sin segunda lectura que lo arregle.',

      'Ni fácil ni difícil. Estás justo donde la gente lo intenta sin dar nada por hecho en el segundo más incómodo del chat.',

      'Tienes límites, pero negociables. Y unos límites negociables no son exactamente límites en el recuento que no perdona.',

      'A veces sabes decir que no. Otras te da pereza y aceptas. Eso te deja aquí, en el medio y el archivo no admite recurso.',

      'Ni una cosa ni la otra. Suficiente historia para que se comente, suficiente criterio para que no cuaje.',

      'Tienes buen ojo cuando lo usas. Lo que pasa es que casi nunca lo usas con el cargo en firme en el momento que más dolía soltarlo.',

      'Ni ejemplo ni advertencia. Un intermedio que nadie recuerda con detalle sin prosa que lo maquille con. El botín o el fail a la vista.',

      'A ratos te cuidas y a ratos te olvidas. La proporción es lo que te mantiene justo aquí sin que nadie pida replay.',

      'Tienes momentos de firmeza que no sostienes. Y sin sostenerlos no cuentan en alta resolución de group chat.',

      'Ni te regalas ni te valoras del todo. Un punto medio bastante desaprovechado delante de quien aún leía el hilo.',

      'Tu problema no es lo que haces, es lo poco que lo piensas antes. Ahí se decide todo con el eco todavía en el grupo.',

      'Ni escándalo ni discreción. Se sabe lo justo de ti para que la conversación no muera y el historial no olvida.',

      'A veces tienes claro lo que quieres. El resto del tiempo aceptas lo que hay en el momento que más dolía soltarlo.',

      'Tienes criterio de sobra y una tendencia clara a desactivarlo en el peor momento y no hay modo de suavizarlo.',

      'Ni impecable ni desastre. Un término medio que se sostiene por costumbre y basta el dato del ranking.',

      'Tus límites existen pero se mueven. Y unos límites que se mueven confunden a todo el mundo. Y el chat archiva sin debate.',

      'Ni de las que dan que hablar ni de las que se olvidan. Justo en la mitad del recuerdo en el segundo más incómodo del chat.',

      'A veces cortas a tiempo y a veces te dejas llevar. La media de las dos es lo que sale aquí y el contador no discute.',

      'Tienes con qué estar más arriba. La pereza a la hora de elegir es lo único que te frena con. El veredicto seco del bot.',

      'Ni una cosa ni la otra. La ambigüedad te protege y a la vez te mantiene en el chisme con. El botín o el fail a la vista.',

      'Tu criterio depende demasiado de quién esté delante. Eso lo hace poco fiable y basta el dato del ranking.',

      'Ni fácil ni imposible. Estás donde la gente lo intenta con expectativas moderadas con el dígito firmando solo.',

      'A veces te respetas mucho y a veces nada. La falta de patrón es lo más llamativo sin prosa que lo maquille.',

      'Tienes suficientes historias para que se hable y suficientes silencios para que no se confirme con la cara del resultado a la vista.',

      'Tus decisiones son buenas cuando las tomas tú. El problema es cuando dejas que las tome el contexto.',

      'Ni arriba ni abajo. Un punto medio que se ha vuelto casi estructural en tu caso y no hay modo de suavizarlo.',

      'A ratos pareces tener todo claro. Luego llega alguien insistente y se ve que no tanto en el momento que más dolía soltarlo.',

      'Tienes freno pero lo usas tarde. Frenar tarde y no frenar acaban pareciéndose bastante. Delante del público que no pidió entrada.',

      'Ni te cuidas del todo ni te descuidas del todo. Justo en la franja más ambigua que hay y el sistema cierra sin discusión.',

      'Tu porcentaje es medio porque tú eres medio en esto: mitad criterio, mitad da igual con el dígito como única defensa.',

      'Ni de las comentadas ni de las intachables. Tienes justo el material suficiente para que nadie cierre el tema.',

    ],
    low: [
      'Cero. Te respetas, pones límites y la gente lo nota antes de abrir la boca con el eco del almost todavía sonando.',

      'Nada. No hay historias tuyas circulando, y en este grupo eso casi merece un premio sin apelación posible hoy.',

      'Cero por ciento. Eliges tú, y eliges poco. Esa combinación desactiva cualquier rumor en el parte que nadie borra.',

      'Limpio. Nadie tiene material sobre ti, y no por falta de gente intentándolo con el eco todavía en el grupo.',

      'Cero. Ni una sola historia que contar. Aburrido para el chisme, excelente para ti sin cuento que lo tape.',

      'Sin material. Aquí sales impecable. Ahora vamos a los comandos donde no hay tanta suerte con el fallo en 4K de chat.',

      'Cero. Tienes criterio y se te nota en a quién dejas acercarse y a quién no y. El ranking cierra el caso.',

      'Nada. No hay material sobre ti y no es por falta de gente intentándolo con el resultado ya consumado.',

      'Cero por ciento. Eliges tú, eliges poco y eliges bien. Combinación que desactiva cualquier rumor con la cara del resultado a la vista.',

      'Limpio. Tus límites son claros y nadie ha conseguido moverlos ni una vez. Sin filtro de autoayuda con la cara del resultado a la vista.',

      'Nada por aquí. Sabes decir que no sin necesidad de justificarlo, que es el nivel alto y el sistema marca el punto final.',

      'Cero. No confundes atención con interés y por eso no caes en lo que caen todos y el archivo no admite recurso.',

      'Sin material. En este comando sales impecable y ni siquiera lo has tenido que trabajar y el historial no olvida.',

      'Cero por ciento. Te respetas y eso se transmite antes de que abras la boca sin descuento por empatía.',

      'Nada. No hay historias tuyas circulando y en este grupo eso ya es una rareza estadística y el sistema cierra sin discusión.',

      'Limpio del todo. La gente se comporta contigo porque nota que no hay margen en alta resolución de group chat.',

      'Cero. Tienes estándares y los sostienes también cuando nadie está mirando sin suavizar el golpe del número.',

      'Sin rastro. No necesitas validación externa y por eso no te vendes barata nunca y el archivo no admite recurso.',

      'Nada de nada. Tu vida privada es privada de verdad, no privada de cara a la galería con el resultado ya consumado.',

      'Cero por ciento. Ni una historia, ni un rumor, ni una captura. Expediente en blanco delante de quien no quería verlo.',

      'Limpio. Sabes distinguir a quien te busca de quien te quiere, y actúas en consecuencia en el segundo más incómodo del chat.',

      'Nada. No te mueves por impulso y eso te ha ahorrado la mitad de los problemas del grupo con el eco todavía en el grupo.',

      'Sin material. Aquí no hay nada que rascar y no será porque no hayan mirado a fondo y el archivo queda cerrado.',

      'Cero por ciento. Tu criterio es firme y no depende de quién insista más sin consuelo de manual barato.',

      'Limpio. Tienes claro lo que vales y por eso no lo regalas por atención barata sin consuelo de manual barato.',

      'Nada. Te comportas igual con público que sin él, que es la única prueba que cuenta sin recurso ni nota al pie.',

      'Cero. Ni una decisión de las que se lamentan al día siguiente. Ni una sin prosa que lo maquille con el parte firmado debajo.',

      'Sin rastro. La gente que te conoce habla bien de ti, y eso no se compra y el sistema no regala puntos.',

      'Cero por ciento. Eliges con calma y por eso no acumulas arrepentimientos en el recuento que no perdona.',

      'Nada. Tus límites no son negociables y todo el mundo lo aprendió a la primera sin apelación posible hoy.',

      'Limpio del todo. No necesitas contar nada porque no hay nada que contar. Delante del público que no pidió entrada.',

      'Cero. Confundir cariño con interés es el error de todos y tú no lo cometes y. El ranking cierra el caso.',

      'Sin material. Discreción real, no la de quien esconde. La de quien no tiene nada que esconder con. El chat enterado del cargo.',

      'Nada de nada. En este comando no hay dónde agarrarse y eso ya lo dice todo sin segunda oportunidad hoy.',

      'Cero por ciento. Vas por libre y sin dar explicaciones. Justo como debe ser con el dígito firmando solo.',

      'Limpio. Tu nombre no aparece en ninguna conversación de las incómodas en el idioma seco del ranking.',

      'Cero. No te dejas llevar por la insistencia ajena, y esa es la prueba de fuego con el peaje cobrado al natural.',

      'Sin rastro. Sabes estar sola sin que eso te empuje a decisiones malas con el cargo en firme con. El botín o el fail a la vista.',

      'Nada. Cuidas lo tuyo y por eso nadie tiene material que usar en tu contra delante de la evidencia del contador.',

      'Cero por ciento. Tu criterio no cambia según el día ni según quién pregunte y el sistema no regala puntos.',

      'Limpio. La gente sabe exactamente hasta dónde puede llegar contigo, y eso es sano sin prosa que lo maquille.',

      'Cero. Aquí sales impecable. En otros comandos ya iremos viendo qué tal te va sin modo avión ni silencio cómplice.',

      'Sin material. Tienes la discreción de quien no necesita presumir de nada con. El botín o el fail a la vista.',

      'Cero por ciento. Elegir bien es aburrido para el chisme y excelente para ti en alta resolución de group chat.',

      'Nada de nada. Ni un desliz, ni una duda, ni una historia. Expediente limpio de verdad con el saldo a la intemperie.',

      'Limpio. Te respetas tanto que ni se te ocurre negociarlo. Ese es el nivel máximo con el dígito como única defensa.',

      'Cero absoluto. No hay una sola decisión tuya que alguien pueda usar en tu contra, y eso es rarísimo aquí.',

      'Hoy no hay material de puta, [nombre]. El rumor se queda sin combustible, joder. Hostia puta, qué nivel.',

      'Low de puta: no hay escaparate ni sí fácil a la vista, [nombre], cabrón El grupo ya lo tiene claro sin forzar el drama, ridículo.',

      '[nombre], el chat no tiene historial jugoso que sacar, gilipollas El grupo ya lo tiene claro sin forzar el drama, fracasado.',

    ],
  },

  guarra: {
    name: 'guarra',
    goodIsHigh: false,
    high: [
      'El nivel de guarrada que sueltas haría que un camión de basura. Pidiera la baja por. El jabón te dio de baja, joder.',

      'No hay eco de estilo: hay eco de basura. Y. El chat lo amplifica. Hueles a cubo sin tapa, mierda, joder.',

      'Eres la que arruina cualquier momento bueno con un comentario de mierda, [nombre]. Y siempre llega. Puta puntualidad para lo peor.',

      'Se te nota el sudor de la guarrada hasta en los mensajes que intentan parecer finos. Sin anestesia, patético.',

      'Guarra de estribillo que empeora con cada repetición del mismo tema sucio, [nombre]. El jabón te dio de baja, gilipollas.',

      'Guarra cutre y constante: la única racha que mantienes sin fallar nunca, [nombre]. Hueles a cubo sin tapa, patético.',

      'Tienes más manchas en el discurso que un delantal de cocina de barrio a las tres. Menudo desastre higiénico, asco.',

      'Guarra de las que el grupo lee con una ceja levantada y cero respeto, [nombre]. Sin una puta toalla limpia, basura.',

      '[nombre], guarra de las que el jabón cruza de acera cuando te ve. El jabón te dio de baja, ridículo, joder.',

      'Guarra de fondo que baja la media sin pedir turno en el ranking, [nombre]. Hueles a cubo sin tapa, fracasado.',

      'Das asco con cada mensaje y ni siquiera aportas una idea nueva. Menudo desastre higiénico, joder. Hostia puta, qué nivel.',

      'Se te ve la prisa por ensuciar el hilo y cero ganas de limpiarlo después. Sin anestesia. Sin una puta toalla limpia, mierda.',

      'Se te nota la guarrería hasta en los mensajes que quieren parecer limpios, [nombre]. El jabón te dio de baja, coño.',

      'No hay capa fina encima: hay grasa y la grasa no se maquilla con emojis. Hueles a cubo sin tapa, cabrón.',

      'Se te nota el oficio de tanto bajar el listón hasta el sótano del chat. Menudo desastre higiénico, gilipollas.',

      'El asco es basura Sin una puta toalla limpia, patético, joder joder. Hostia puta, qué nivel. Hostia, el desastre se explica solo, joder.',

      'El listón está enterrado y tú has hecho de la fosa tu pista de baile. El jabón te dio de baja, asco, joder.',

      'No hay redención estética: hay basura. Con eco y el eco llena. El chat. Hueles a cubo sin tapa, basura.',

      '[nombre], guarra de las que el jabón pide traslado de provincia y el grupo asiente, joder. Hostia puta, qué nivel.',

      'La vergüenza ajena es tu sombra y la sombra no te abandona nunca. Sin anestesia. Sin una puta toalla limpia, fracasado.',

      'El termómetro del asco. Te marca crónico: no es un pico, es el nivel. El jabón te dio de baja, joder.',

      'Se te nota el peso de arrastrar el listón por el suelo cada día. Hueles a cubo sin tapa, mierda, joder.',

      'Guarra de fondo de pantalla de motel barato: se ve, se nota y no mejora con el tiempo, [nombre]. Gilipollas.',

      'No hay redención en el tono: hay basura. Con eco y el eco no para. Sin una puta toalla limpia, cabrón.',

      'Bajas el nivel de la sala solo con participar, [nombre]. Un talento inverso, específico y que ya nadie se molesta en comentar. Puta vergüenza ajena.',

      '[nombre], tu sentido del humor terminó de desarrollarse a los doce años y ahí se quedó. Puta cutrez de patio de colegio con edad para saberlo mejor.',

      '[nombre], guarra de mierda. Sin filtro ni decencia. No hay comentario que te dé vergüenza y cuanto más bajo caes, más cómoda te sientes ahí abajo.',

      'Eres la que hace que la gente se plantee salir del grupo, [nombre]. No es una exageración, es un hecho comentado. Puta escoria conversacional.',

      '[nombre], eres la que se cree el alma de la fiesta y es exactamente el motivo de que la fiesta se acabe. Puta cutrez con horario de apertura.',

      'Nadie quiere ser el siguiente en el hilo después de ti, [nombre]. Por algo será, guarra. Dejas la conversación como dejas todo lo demás: hecha una mierda.',

      'Tu idea de romper el hielo es tirar un cubo de basura. Al centro de la sala, [nombre]. Y luego preguntas por qué se ha quedado todo el mundo callado.',

      '[nombre], eres la guarra que se ofende cuando le devuelven el tono. Lo repartes todo el día y no aguantas ni una. Puta cobarde con la boca grande.',

      '[nombre], guarra de manual: donde el resto pone un límite tú pones una anécdota que nadie quería oír. Y con detalle. Siempre con puto detalle.',

      'Tu manera de participar es empeorar lo que ya estaba, [nombre]. Cada vez, sin fallar una. Puta gotera conversacional sin fontanero disponible.',

      'Eres el motivo por el que aquí hay temas que ya no se sacan, [nombre]. Un servicio nadie pidió y que todos sufren. Puta cutrez con horario.',

      'Tu presencia obliga al grupo a bajar el nivel para que la conversación tenga sentido, [nombre]. Un contrapeso constante hacia la mierda.',

      'Nadie te sigue el juego ya, [nombre], y sigues jugando sola. Eso es lo verdaderamente triste de todo el numerito. Puta payasa sin circo.',

      'Guarra de manual, [nombre]: sueltas primero y piensas después. Y a veces ni después. Puta descarga. Sin filtro y sin destinatario claro.',

      'Nadie te va a decir nada ya, [nombre]. Esperan a que cambies de tema tú sola, como quien espera a que escampe. Puta paciencia gastada.',

      'Nadie se ríe ya, [nombre]. Solo pasan tu mensaje deprisa y siguen a lo suyo. Ese scroll es tu verdadera nota y es una nota de mierda.',

      'Tu manera de entrar en un tema es tirarlo al suelo primero, [nombre]. Como quien vuelca el cubo de basura. Y luego pregunta qué pasa.',

      'Eres de las que aportan volumen y nunca contenido, [nombre]. Mucho ruido y ni una puta idea debajo. Se nota desde el primer mensaje.',

      'Tu forma de llamar la atención es la más barata del catálogo, [nombre], y encima no funciona. Puta rebaja permanente sin clientes.',

      'Tu contribución al grupo se puede medir, [nombre]: sale en negativo y con margen de sobra. Un puto sumidero con nombre de usuario.',

      'Eres de las que arruinan cualquier momento bueno con un comentario de mierda, [nombre]. Y siempre llega. Puntual como una gotera.',

      'Guarra de fondo de chat: siempre ahí, siempre igual, siempre bajando la media, [nombre]. Hueles a cubo sin tapa, patético.',

      'Guarra de superficie suficiente: no hace falta abrir cajones, está a la vista, [nombre]. Menudo desastre higiénico, asco.',

      'Guarra profesional: cobras en atención y pagas con vergüenza ajena al que te lee, [nombre], fracasado.',

      'Guarra cutre de feria: mucho ruido, poca sustancia y el suelo peor que antes, [nombre]. El jabón te dio de baja, ridículo.',

      'Se te oye el arrastre de la guarrada hasta en los mensajes que quieren parecer neutros. Hueles a cubo sin tapa, fracasado.',

      'Guarra de las que alardean y el alarde es el último recurso del aburrimiento, [nombre]. Menudo desastre higiénico, joder.',

      'Eres de las que dejan a todos mirando el móvil para no tener que responder, [nombre]. Cada vez. Puta vergüenza ajena colectiva.',

      'Eres de las que sueltan primero y piensan después, [nombre]. Y a veces ni después. Puta descarga. Sin filtro y sin destinatario.',

      'Guarra sin redención en el nivel: el número alto es la paliza merecida, [nombre]. Hueles a cubo sin tapa, cabrón.',

      'Guarra de repertorio corto y manchado: siempre las mismas cartas grasientas, [nombre]. Menudo desastre higiénico, gilipollas.',

      'Eres la prueba de que soltar todo no es ser libre, [nombre]. Es no tener filtro, y eso no es personalidad, es una puta avería.',

      'Guarra de manual, [nombre]: sueltas primero y piensas después. Y a veces ni después. Puta descarga. Sin filtro ni destinatario Hostia puta, basura.',

      '[nombre], eres la que deja la conversación como deja todo lo demás: hecha una mierda. Y sin que nadie tenga ganas de recogerla.',

      'El grupo ya no se sorprende: archiva tus mensajes en la carpeta de lo previsible y sucio. Menudo desastre higiénico, ridículo.',

      'No hay barniz: hay barro puro y el barro no se vende como personalidad interesante. Sin anestesia, mierda.',

      'Guarra de manual cutre: ni elegancia en el vicio ni gracia en el desastre, [nombre]. El jabón te dio de baja, joder.',

      'Guarra con las mismas cartas manchadas de siempre y sin plan B Hueles a cubo sin tapa, mierda, joder.',

      'Guarra de las que leen el silencio como invitación y se equivocan siempre, [nombre]. Menudo desastre higiénico, coño.',

      'Tienes el aura del cenicero que nadie vacía: presente, lleno y olvidado en el borde. Sin una puta toalla limpia, cabrón.',

      'Has convertido el descaro en falta de vergüenza y la falta de vergüenza en marca. El jabón te dio de baja, gilipollas.',

      'Guarra cutre y orgullosa: el orgullo es lo único que te queda de interesante, [nombre]. Hueles a cubo sin tapa, patético.',

      'No es libertad: es falta de filtro y el resultado es basura. Con eco en el grupo. Vergüenza.vergüenza.',

      'El filtro de lo decente se te rompió hace temporadas y nadie ha venido a cambiarlo. Sin anestesia, fracasado.',

      'Guarra sin estilo: el desastre sin estética es solo desastre, y tú lo clavas, [nombre]. El jabón te dio de baja, ridículo.',

      'Guarra de fondo de ranking: bajas la media con la constancia de un metrónomo, [nombre]. Hueles a cubo sin tapa, fracasado.',

      '[nombre], tu repertorio es de patio de colegio y tienes edad de sobra para saberlo. Puta cutrez con documento de identidad.',

      'Guarra de las que el grupo mutea con educación y sigue leyendo por morbo barato, [nombre]. Sin una puta toalla limpia, mierda.',

      'Guarra de cartel roto: la promesa era estilo y el producto es solo suciedad, [nombre]. El jabón te dio de baja, coño.',

      'Guarra de error de lectura crónico: confundes límites con juego siempre, [nombre]. Hueles a cubo sin tapa, cabrón.',

      'Tu presencia obliga al grupo a bajar el listón de lo aceptable, [nombre]. Y ya estaba en el suelo. Puta cutrez contagiosa.',

      'Tienes más kilómetros de cama barata que de dignidad acumulada en el historial del grupo. Sin anestesia, basura.',

      'No es libertad sexual: es falta de criterio y el resultado se huele en el hilo. El jabón te dio de baja, asco.',

      'Eres tan poco cuidadosa, [nombre], que el descuido dejó de ser accidente y pasó a ser método. Puta cochambre con sistema.',

      'Has convertido. El chat en tu callejón. Y el grupo en el público que no pidió entrada. Menudo desastre higiénico, ridículo.',

      'Guarra con antigüedad: el óxido de tanto oficio se te ve en cada broma de más, [nombre]. Sin una puta toalla limpia, fracasado.',

      'Guarra de las que el jabón se esconde cuando te ve venir al baño del puto bar, [nombre]. Se ve desde el primer mensaje, basura.',

      'Tienes más grasa en el relato que un freidor de feria al cierre del domingo, [nombre]. Hueles a cubo sin tapa, mierda.',

      'Guarra de manual: ni el vicio tiene gracia ni la suciedad tiene misterio, [nombre]. Eso no se maquilla con ángulo, fracasado.',

      'Se te nota el rastro de guarrería hasta en los mensajes que pretenden ser limpios, [nombre]. Cabrón.',

      'Guarra convertido en wallpaper del fail colectivo. El jabón te dio de baja, gilipollas, joder. Hostia puta, qué nivel.',

      'Has convertido la suciedad en identidad y no hay detergente narrativo a la vista, [nombre]. Patético.',

      'Guarra en modo sin filtro y el filtro pedía clemencia. Menudo desastre higiénico, asco, joder. Hostia puta, qué nivel, menudo desastre.',

      'El listón de lo presentable lo usas de rampa para bajar más todavía, joder, [nombre]. El ranking firma y listo, nivel sótano puro, qué pena.',

      'Guarra con el mismo gag de siempre y cero variación. El jabón te dio de baja, ridículo, joder. Hostia puta, qué nivel, patético.',

      'Se te oye el arrastre de la guarrería hasta en los neutros del chat, [nombre]. cerrado. Hueles a cubo sin tapa, fracasado.',

      'Guarra de historial público: no hace falta escarbar, huele en la superficie, [nombre]. Eso no se maquilla con ángulo, y se te nota a la legua, qué cringe.',

      'Tienes más restos de suciedad en el discurso que un cubo sin recogida semanal, [nombre] el nivel te nombra sin permiso, da asco.',

      'Guarra cutre: ni el caos tiene estilo ni el abandono tiene carisma de antihéroe, [nombre], qué vergüenza.',

      'Has hecho del bajo listón de higiene tu residencia fija del ranking, [nombre]. Hueles a cubo sin tapa, ridículo.',

      'Guarra de las que el mute ajeno lee como misterio y es solo asco. Documentado, [nombre]. Menudo desastre higiénico, fracasado.',

      'Guarra de manual: el grupo te huele antes de leerte, [nombre]. Sin una puta toalla limpia, patético, qué miseria.',

      'Guarra constante: la única racha es la de no pasar un puto trapo por el relato, [nombre]. Se ve desde el primer mensaje,, da grima.',

      'Se te nota la prisa por ensuciar y cero plan de limpiar lo que dejas atrás, [nombre]. Hueles a cubo sin tapa, basura.',

      'Guarra de cartel grasiento: se ve el anuncio y nadie quiere la función, [nombre]. Eso no se maquilla con ángulo, basura.',

      'No hay misterio interesante: hay previsible y sucio, el combo del high, [nombre] el nivel te nombra sin permiso, qué cutre.',

      'Tienes el historial de un local cerrado por salubridad moral del ranking, [nombre]. El jabón te dio de baja, da pena ajena.',

      'Guarra de inercia: el grupo te soporta por costumbre, no por respeto, [nombre]. Hueles a cubo sin tapa, qué vacío.',

      'El recato te queda a años luz y la distancia es rechazo, no mística de personaje, [nombre], gilipollas.',

      'Guarra de ranking: bajas la media del nivel con constancia de mancha, [nombre]. El ranking firma y listo, patético.',

      'Has convertido el bajo listón en casa. y no hay mudanza a la vista, [nombre]. Se ve desde el primer mensaje, asco, da vergüenza.',

      'Guarra de estribillo que mancha más con cada repetición del mismo plato, [nombre]. Hueles a cubo sin tapa, patético.',

      'Se te nota el hábito de empujar cada tema hacia el mismo fregadero sucio, [nombre]. Eso no se maquilla con ángulo, ridículo.',

      'La compostura no te reconoce y tú no has buscado el espejo en serio, [nombre] el nivel te nombra sin permiso, fracasado.',

      'Guarra de fondo permanente: el high no es un mal día, es el nivel, [nombre]. El jabón te dio de baja, ridículo.',

      'No es atrevimiento: es suciedad de personaje y el high te la cobra, [nombre]. Hueles a cubo sin tapa, fracasado.',

      'Tienes más grasa en el discurso que un delantal de cocina sin lavar en meses, [nombre]. Menudo desastre higiénico, qué cringe.',

      'Guarra de ceja ajena levantada y respeto en el sótano del ranking, [nombre]. El ranking firma y listo, el chat ya lo sabía, da asco.',

      'El promedio de este tramo es el tuyo: no un pico, el suelo del high, [nombre]. Se ve desde el primer mensaje, nivel sótano puro, qué vergüenza.',

      'Has convertido la guarrería en carnet. y no hay renovación limpia a la vista, [nombre]. filtro ni consuelo, patético.',

      'Guarra cutre y sin complejo: el complejo pediría espejo y no lo hay, [nombre]. Eso no se maquilla con ángulo, diagnóstico cerrado, asco, fracasado.',

      'Se te oye el masticar del listón bajo hasta en los mensajes serios, [nombre] el nivel te nombra sin permiso, y se te nota a la legua, basura.',

      'La dignidad no te coge el teléfono: el buzón está lleno de avisos del grupo, [nombre]. El jabón te dio de baja, asco, da grima.',

      'Guarra de letrero grasiento: se lee de lejos y no invita a entrar, [nombre]. Hueles a cubo sin tapa, basura.',

      'No hay misterio de guarrería con estilo: hay lo previsible y el high lo nombra, [nombre]. Menudo desastre higiénico, ridículo.',

      'Tienes el historial de un fregadero que nadie ha tocado desde el puto domingo, [nombre]. El ranking firma y listo, con el grupo de testigo, qué cutre.',

      'Guarra de malinterpretar el silencio ajeno como invitación a más suciedad, [nombre]. Se ve desde el primer mensaje, sin maquillaje posible, da pena ajena.',

      'El grupo paga tu rastro en cuotas diarias de asco. Documentado, [nombre]. Hueles a cubo sin tapa, qué vacío.',

      'Has dejado el chat como fregadero a medias: restos eternos de guarrería, [nombre]. Eso no se maquilla con ángulo, indignante.',

      'Guarra de estribillo sin punto final limpio ni redención posible, [nombre] el nivel te nombra sin permiso, qué vergüenza ajena.',

      'Se te nota el peso de arrastrar la misma mancha por cada hilo, [nombre]. El jabón te dio de baja, da vergüenza.',

      'La compostura cruza de acera cuando te ve en el high del comando, [nombre]. Hueles a cubo sin tapa, patético.',

      'Guarra de feria: grasa, ruido, suelo peor y cero ganas de volver, [nombre]. Menudo desastre higiénico, asco, menudo desastre.',

      'Se te ve venir la guarrería en la primera palabra del mensaje, [nombre]. El ranking firma y listo, qué pena.',

      'La dignidad del nivel no para: tú eres el tráfico del arcén del ranking, [nombre]. Se ve desde el primer mensaje, patético.',

      'No hay barniz que salve: hay guarrería pura y no se vende como carisma, [nombre]. Hueles a cubo sin tapa, fracasado.',

      'Tienes el tono de quien acumula restos y nunca pasa el estropajo, [nombre]. Eso no se maquilla con ángulo, basura.',

      'Guarra de las que alardean del desastre porque callar las deja sin personaje, [nombre] el nivel te nombra sin permiso, ridículo.',

      'Has firmado la guarrería con grasa en cada mensaje como única firma, [nombre]. Hueles a cubo sin tapa, qué vergüenza.',

      'Guarra visible desde lejos: el rastro se ve, la parada no compensa, [nombre]. Menudo desastre higiénico, ridículo.',

      'Se te nota que ensuciaste el hilo hace tiempo y perdiste el mapa del bayeta, [nombre]. El ranking firma y listo, sin anestesia, basura.',

      'La clase te suena a ataque y respondes dejando más migas de suciedad, [nombre]. Se ve desde el primer mensaje, el chat ya lo sabía, ridículo.',

      'Guarra de racha perfecta: lo único que no fallas es manchar. El ranking, [nombre]. sótano puro, fracasado.',

      'No hay eco de estilo: hay eco de guarrería. Y el chat lo amplifica, [nombre]. Eso no se maquilla con ángulo, sin filtro ni consuelo, qué nivel de pena.',

      'Tienes el aura del plato olvidado: presente, frío y con restos de mierda, [nombre] el nivel te nombra sin permiso, diagnóstico cerrado, basura.',

      'Guarra de error de lectura: confundes límites con permiso para seguir sucia, [nombre]. El jabón te dio de baja, qué cutre.',

      'El listón lo usas de pan y el suelo del chat es tu mantel preferido, [nombre]. Hueles a cubo sin tapa, da pena ajena.',

      'Has hecho ranking de guarrería y el oro es tuyo sin rival serio, [nombre]. Menudo desastre higiénico, qué vacío.',

      'Guarra de feria ambulante: el mismo show, el mismo asco, cero nostalgia, [nombre]. El ranking firma y listo,, indignante.',

      'Se te ve venir el teatro sucio en el primer punto del mensaje, [nombre]. Se ve desde el primer mensaje, con el grupo de testigo, asco, qué vergüenza ajena.',

      'La dignidad hace autostop y el tráfico del arcén eres tú, [nombre]. maquillaje posible. Hueles a cubo sin tapa, patético.',

      'Guarra de superficie: basta la vista, no hace falta el sótano, [nombre]. Eso no se maquilla con ángulo, ridículo.',

      'No hay barniz de antihéroe: hay guarrería y el high la cobra, [nombre] el nivel te nombra sin permiso, fracasado.',

      'Tienes el tono de noches de chat sin una frase que se sostenga limpia, [nombre]. El jabón te dio de baja, ridículo.',

      'Guarra de malinterpretar el mute como interés por el personaje barato, [nombre]. Hueles a cubo sin tapa, fracasado.',

      'El precio de tu repertorio lo paga el hilo en tiempo y en paciencia, [nombre]. Menudo desastre higiénico, miserable.',

      'Has dejado el hilo como obra sin plano: escombro de suciedad y nada más, [nombre]. El ranking firma y listo, qué cringe.',

      'Se te nota el hábito de empujar cada hilo hacia el mismo fregadero, [nombre]. Se ve desde el primer mensaje, da asco.',

      'La compostura del nivel no te reconoce en el elenco del ranking, [nombre]. Hueles a cubo sin tapa, qué vergüenza.',

      'Guarra de fondo: bajas la media del high con la constancia de quien no se cansa de manchar, [nombre]. Pringado, asco, ridículo.',

      'No es estilo: es guarrería previsible y el high te la nombra entero, [nombre] el nivel te nombra sin permiso, basura.',

      'Tienes más episodios de mancha que intentos de pasar un trapo de verdad, [nombre]. El jabón te dio de baja, asco, qué miseria.',

      'Guarra de respeto ajeno en números rojos del ranking del grupo, [nombre]. Hueles a cubo sin tapa, basura.',

      'El promedio del high es este: no un mal día, el nivel del nivel, [nombre]. Menudo desastre higiénico, ridículo.',

      'Has convertido la guarrería en identidad sin renovación limpia a la vista, [nombre]. El ranking firma y listo, y, basura.',

      'Guarra de puta madre en el sentido literal: el high no suaviza el olor del nivel, [nombre]. Patético, qué cutre.',

      'Tu presencia baja el promedio de higiene del chat solo con escribir, [nombre]. chat ya lo sabía, da pena ajena.',

      'Guarra hasta para el modo oscuro: ni la sombra tapa lo que dejas atrás, [nombre]. Eso no se maquilla con ángulo, nivel sótano puro, qué vacío.',

      'Se te cae el disimulo solo con abrir el hilo y el high lo documenta, [nombre] el nivel te nombra sin permiso, sin filtro ni consuelo, patético.',

      'Guarra de las que el ambientador se rinde y pide la baja del ranking, [nombre]. El jabón te dio de baja, qué vergüenza ajena.',

      'No hay jabón que te salve: hay suciedad de base y el comando la cobra, [nombre]. Hueles a cubo sin tapa, patético.',

      'Tu mensaje es un aviso de lo que no hay que tocar en el puto grupo, [nombre]. Menudo desastre higiénico, asco, qué flojo.',

      'Guarra con la disciplina de quien nunca ha pasado un trapo por el relato, [nombre]. El ranking firma y listo, fracasado.',

      'El high no es un mal día de orden: es. El jabón te dio de baja, ridículo, joder. Hostia puta, qué nivel, qué pena.',

      'Tienes una presencia que ensucia el hilo en un solo mensaje, [nombre]. el grupo de testigo. Hueles a cubo sin tapa, fracasado.',

      'Guarra de repertorio: siempre la misma mancha y cero plan B de limpieza, [nombre]. Eso no se maquilla con ángulo, sin maquillaje posible, miserable.',

      'Se te nota el desastre hasta en la miniatura más pequeña del estado, [nombre] el nivel te nombra sin permiso, qué cringe.',

      'Guarra sin complejo útil: el complejo al menos indicaría que viste el desastre, [nombre], da asco.',

      'El ranking de higiene te deja donde mereces: en el sótano del high, [nombre]. Hueles a cubo sin tapa, qué vergüenza.',

      'Has hecho de la guarrería tu marca y la marca se pega en los dedos ajenos, [nombre]. Menudo desastre higiénico, ridículo.',

      'Guarra de las que confunden natural con abandono total del estándar, [nombre]. El ranking firma y listo, fracasado.',

      'No es estilo sucio con gracia: eres sucia y el high no discute la evidencia, [nombre]. Se ve desde el primer mensaje, qué miseria.',

      'Has hecho del bajo listón una residencia fija: sin opción a mudanza, [nombre]. Hueles a cubo sin tapa, basura.',

      'Guarra sin glamour: el desastre sin estética es solo un problema de higiene narrativa. Menudo desastre higiénico, ridículo.',

      'Guarra sin punto final: el estribillo se repite y cada vez suena peor, [nombre]. Sin anestesia, basura.',

      'Guarra de las que confunden mute con coquetería: error de lectura crónico, [nombre]. El jabón te dio de baja, qué cutre.',

      'Guarra cutre de feria ambulante: ruido, grasa y nada que llevarse a casa, [nombre]. Hueles a cubo sin tapa, da pena ajena.',

      'Nadie te tiene por divertida, [nombre]. Te tienen por ruidosa, que no es lo mismo ni de lejos. Puta alarma sin incendio, qué vacío.',

      'La dignidad te hace gestos desde el andén contrario y tú no te bajas del vagón. Sin una puta toalla limpia, indignante.',

      'Guarra de las que el grupo soporta con una ceja arriba y respeto en cero, [nombre]. El jabón te dio de baja, qué vergüenza ajena.',

      'El asco Colectivo es el precio de tu repertorio. Y el grupo lo paga cada día. Vergüenza. Hueles a cubo sin tapa, patético.',

      'Tu manera de aportar es restar, [nombre], y llevas años restando sin parar. Un puto sumidero conversacional con nombre, qué flojo.',

      'Tienes más episodios documentados de guarrada que mensajes decentes en el archivo. Sin anestesia, fracasado.',

      'Has convertido el barro en carnet de identidad y no hay renovación a la vista. El jabón te dio de baja, ridículo.',

      'Has convertido cada conversación en un parte de guerra de la vergüenza colectiva. Hueles a cubo sin tapa, fracasado.',

      'El asco Crónico es el nivel: no un mal día, el promedio del nivel. Desperdicio.desperdicio. Menudo desastre higiénico, miserable.',

      'Eres la que deja la conversación como deja todo lo demás, [nombre]: hecha una mierda. Y sin que nadie quiera recogerla, qué cringe.',

      'Tienes más manchas en el relato que un mantel de bar a las seis de la mañana. El jabón te dio de baja, da asco.',

      'Tienes el aura de un cenicero lleno a las cuatro de la mañana en un local dudoso. Hueles a cubo sin tapa, qué vergüenza.',

      'Guarra de las que el mute ajeno interpreta como juego y no como frontera, [nombre]. Menudo desastre higiénico, ridículo.',

      'No es desparpajo con gracia: es falta de filtro sin el beneficio del carisma. Sin anestesia, basura.',

      'Guarra visible desde la autovía: el letrero se ve, la parada no compensa, [nombre]. El jabón te dio de baja, asco, qué miseria.',

      'Has hecho de lo cutre una marca personal y la marca huele desde el primer mensaje. Hueles a cubo sin tapa, basura.',

      'Tienes el aura de un cenicero de bar dudoso al cierre: lleno y sin vaciar. Menudo desastre higiénico, ridículo.',

      'Guarra de fondo permanente: baja la media del grupo sin pedir permiso, [nombre]. Sin una puta toalla limpia, fracasado.',

    ],
    mid: [
      'Ni guarra del todo ni una señora ejemplar. Zona tibia: a veces tienes decoro y a veces lo tiras por la ventana. Nadie sabe con cuál de las dos va a topar.',

      'Tienes momentos de compostura rodeados de bajezas que te devuelven al montón. Media guarra, media presentable, según el día y la audiencia.',

      'No eres guarra de manual, pero tampoco lo descartas del todo. Ni cutre del todo ni fina del todo. Ambigua, y encima cómoda en la ambigüedad.',

      'A veces cuidas las formas y a veces se te caen solas. Esa inconsistencia es la que te deja a medio camino de la etiqueta completa.',

      'Ni escándalo ni ejemplo. Cumples lo mínimo para no ser el tema y lo justo para que se comente. La franja más gris que hay.',

      'Tienes con qué mantener el nivel, pero lo tiras por pura pereza. Media guarra por dejadez, no por naturaleza.',

      'No eres lo peor del grupo, pero tampoco lo mejor. En ese punto donde ni te aplauden ni te señalan, solo levantan una ceja.',

      'Ni fina ni desastre. A veces cuidas las formas y a veces se te caen solas sin previo aviso sin bis ni matiz de consuelo.',

      'Tienes momentos de compostura que no sostienes. Y sin sostenerlos no cuentan para nada con testigos obligados en el hilo.',

      'Ni escándalo ni ejemplo. Estás en la franja donde levantan una ceja y siguen a lo suyo en el parte que nadie borra.',

      'A ratos sabes leer la sala y a ratos no. Esa inconsistencia es exactamente tu porcentaje y el archivo queda cerrado.',

      'Tienes con qué mantener el nivel y una pereza notable a la hora de hacerlo y el sistema marca el punto final.',

      'Ni cutre del todo ni cuidada del todo. Ambigua, y encima cómoda en la ambigüedad. Delante del marcador en vivo.',

      'Cuando te lo propones tienes formas. El problema es la frecuencia con la que te lo propones con el peaje cobrado al natural.',

      'Ni el problema del grupo ni parte de la solución. Estás justo en el medio y sin moverte y no hay modo de suavizarlo.',

      'A veces sobra lo que dices y a veces encaja perfecto. Nadie sabe con cuál va a topar en alta resolución de group chat.',

      'Tienes criterio para saber cuándo parar. Lo que falla es la voluntad de aplicarlo delante de quien no quería verlo.',

      'Tu sentido del humor funciona a ratos. Cuando falla, falla mucho y sin red sin consuelo de manual barato.',

      'Ni te señalan ni te aplauden. La zona más anónima que existe y ahí estás cómoda con el dígito como única defensa.',

      'A veces te frenas a tiempo y otras te pasas tres pueblos. La media sale justo aquí con el eco todavía en el grupo.',

      'Tienes momentos buenos rodeados de comentarios que los borran. Balance neto: cero con el peaje cobrado al natural.',

      'Ni ejemplo ni advertencia. Un intermedio que nadie recuerda con detalle al día siguiente. Y el grupo ya pasó de página.',

      'Tu filtro existe, pero es intermitente. Y un filtro intermitente no sirve de gran cosa en el segundo más incómodo del chat.',

      'Ni la más cuidada ni la más bruta. Estás en el punto donde el grupo se lo toma con calma sin segunda lectura que lo arregle.',

      'A ratos aportas y a ratos molestas. La proporción es lo que te mantiene justo en el medio en la foto fija del ranking.',

      'Tienes suficiente decoro para no ser el tema y suficiente descuido para que se comente. Delante del hueco que quedó.',

      'Ni sube ni baja el nivel contigo. Te quedas donde estaba, que ya es más de lo que hacen otros sin suavizar el golpe del número.',

      'Tu problema no es lo que dices, es cuándo lo dices. El timing te falla más de la cuenta en la foto fija del ranking.',

      'Ni fina ni vulgar. Un término medio que se sostiene por costumbre más que por criterio sin modo avión ni silencio cómplice.',

      'A veces sabes cuándo callarte. Otras te lanzas y ahí se ve por qué no estás más arriba con. El bot como notario del fallo.',

      'Tienes formas cuando hay que tenerlas. Fuera de eso, te relajas más de lo aconsejable delante de la evidencia del contador.',

      'Ni impecable ni desagradable. La franja donde a nadie le importa lo suficiente para opinar sin anestesia de verdad esta vez.',

      'Tu compostura depende demasiado de quién esté delante. Eso la hace poco fiable. Delante del marcador en vivo.',

      'Ni de las que cuidan el ambiente ni de las que lo estropean. Simplemente pasas delante de todo el que miraba.',

      'A veces das el nivel y a veces das vergüenza ajena. Es un cincuenta por ciento honesto sin que nadie pida replay.',

      'Tienes con qué estar más arriba en esto. La dejadez es lo único que te frena y basta el dato del ranking.',

      'Ni escándalo ni discreción. Se sabe lo justo de ti para que nadie cierre el tema con el dígito firmando solo.',

      'Tu descuido no es constante, y eso es lo único que te salva de un porcentaje peor. Delante del ranking y de la cara.',

      'Ni una cosa ni la otra. Suficiente decoro para pasar, suficiente descuido para que se note y. El ranking no pide permiso.',

      'A ratos pareces tenerlo controlado. Luego llega un tema fácil y se ve que no tanto con el fallo en 4K de chat.',

      'Tienes freno pero lo usas tarde. Y frenar tarde se parece bastante a no frenar sin maquillaje ni segunda toma.',

      'Ni te cuidas del todo ni te descuidas del todo. La ambigüedad más pura que hay. Sin filtro de autoayuda.',

      'Tu registro cambia según el día. Unos días das el nivel y otros mejor no hablamos con la firma legible del comando.',

      'Ni arriba ni abajo. Un intermedio que en tu caso ya lleva demasiado tiempo siendo estable sin anestesia de verdad esta vez.',

      'A veces mides lo que dices y a veces no. Justo por eso el porcentaje sale en el medio. Sin derecho a matiz útil.',

      'Tienes momentos de clase que se pierden entre otros que no lo son tanto con el número en la frente del mensaje.',

      'Ni de las cuidadosas ni de las que dan que hablar. El término medio más literal posible sin descuento por empatía.',

      'Tu porcentaje es medio porque tú eres medio en esto: mitad formas, mitad da igual y el sistema marca el punto final.',

      'Ni de las que incomodan ni de las que aportan calma. Un intermedio que pasa desapercibido. Sin derecho a matiz útil.',

    ],
    low: [
      'Cero. Cuidas las formas. Y se nota. En este grupo eso destaca como un faro con. El bot como notario del fallo.',

      'Nada. Tienes decoro, límites y criterio. Tres cosas que aquí escasean bastante. Delante del ranking y de la cara.',

      'Cero por ciento. Nadie tiene nada que contar de ti, y no será porque no hayan mirado con la firma legible del comando.',

      'Limpio. Te comportas igual con público que sin él. Eso es lo que de verdad mide esto con el eco todavía en el grupo.',

      'Nada por aquí. Ni una historia, ni un rumor, ni una captura. Expediente en blanco y el hilo sigue sin ti en el centro.',

      'Cero. Clase de la que no se anuncia. Se ve sola y no hace falta explicarla con el resultado ya consumado.',

      'Sin rastro. Aquí sales impoluta. En otros comandos ya iremos viendo qué tal sin bis ni matiz de consuelo.',

      'Cero. Cuidas las formas. Y se nota. En este grupo eso destaca como un faro en la niebla. Sin derecho a matiz útil.',

      'Nada. Tienes decoro, límites y criterio. Tres cosas que aquí escasean muchísimo en el segundo más incómodo del chat.',

      'Cero por ciento. Nadie tiene material sobre ti y no será porque no hayan buscado con. El botín o el fail a la vista.',

      'Limpio. Te comportas igual con público que sin él, y eso es lo único que mide esto de verdad con el dígito como única defensa.',

      'Cero. Clase de la que no se anuncia: se ve sola y no hace falta explicarla con el eco del almost todavía sonando.',

      'Sin rastro. Sabes leer la sala antes de hablar, que es una habilidad rarísima con el saldo a la intemperie.',

      'Cero por ciento. Tu sentido del humor no necesita bajar de nivel para funcionar y. El veredicto no se negocia.',

      'Nada. Tienes filtro y lo usas sin que parezca un esfuerzo. Ahí está el mérito con. El bot como notario del fallo.',

      'Cero. Ni una sola vez has tenido que pedir disculpas por un comentario. Ni una sin apelación posible hoy.',

      'Sin material. Aportas sin necesidad de escandalizar, que es lo difícil. Y el grupo ya pasó de página.',

      'Cero por ciento. Sabes cuándo sobra un comentario y te lo callas. Nivel alto y. El veredicto no se negocia.',

      'Limpio. La gente habla contigo tranquila porque sabe que no va a acabar incómoda y no hay modo de suavizarlo.',

      'Cero. Tienes gracia sin necesidad de ser desagradable. Casi nadie consigue las dos con. El bot como notario del fallo.',

      'Nada. Tu presencia sube el nivel de cualquier conversación, no lo baja con el número hablando solo con el fail todavía caliente.',

      'Cero por ciento. Ni un exceso, ni un desliz, ni un mal momento en el historial en el momento que más dolía soltarlo.',

      'Limpio. Sabes que se puede ser divertida sin arrastrar a nadie por el suelo en el único idioma que entiende el contador.',

      'Nada. Tienes criterio para lo que dices y para lo que te callas, que es lo mismo de importante en el momento que más dolía soltarlo.',

      'Cero. La gente te cita como ejemplo de que se puede tener humor con formas sin anestesia de verdad esta vez.',

      'Sin material. No hay una sola conversación tuya que alguien quiera olvidar y el sistema no regala puntos.',

      'Cero por ciento. Tu registro es amplio y ninguno de sus extremos incomoda a nadie y el archivo no admite recurso.',

      'Limpio del todo. Nunca has necesitado el escándalo para que te presten atención con. El veredicto seco del bot.',

      'Nada. Mides lo que dices sin parecer forzada, y eso solo lo consigue quien lo tiene interiorizado y el sistema no regala puntos.',

      'Cero. Tu discreción no es fachada. Es la misma dentro y fuera del grupo con el grupo de testigo silencioso.',

      'Sin rastro. Ni una anécdota incómoda asociada a tu nombre en todo el historial en la foto fija del ranking.',

      'Nada de nada. Eres de las que hacen que un grupo sea agradable sin proponérselo. Delante del listón que no saltaste.',

      'Cero por ciento. Sabes leer cuándo un tema se está pasando de la raya y lo reconduces sin maquillaje ni segunda toma.',

      'Limpio. Te respetan las formas porque tú respetas las de todos los demás con. El bot como notario del fallo.',

      'Sin material. La gente se comporta mejor cuando estás delante, y eso es influencia real con el número en la frente del mensaje.',

      'Nada. Tienes clase sin necesidad de sacarla a pasear. Se nota igualmente sin que nadie pida replay y el contador insiste.',

      'Cero por ciento. Ni una sola vez has tenido que corregirte después de hablar con el parte firmado debajo.',

      'Limpio. Aquí sales impoluta y en otros comandos ya iremos viendo qué tal te va con el resultado ya consumado.',

      'Nada. Sabes distinguir entre confianza y falta de respeto, y esa línea la tienes muy clara. Delante del ranking y de la cara.',

      'Cero. Tu forma de estar hace que los demás se relajen en vez de ponerse en guardia y el resto es ruido de fondo.',

      'Sin rastro. No hay una conversación en la que hayas tenido que rectificar el tono sin prosa que lo maquille.',

      'Cero por ciento. Eres de las que se hacen respetar sin levantar la voz ni una vez. Delante del marcador en vivo.',

      'Limpio del todo. No hay nada que rascar y no será porque no hayan mirado a fondo con el eco todavía en el grupo.',

      'Nada. Tienes el criterio que a este grupo le falta, y eso vale más de lo que parece y el hilo no pide amplificación.',

      'Cero. Nunca has necesitado bajar el listón para que alguien te preste atención y. El ranking lo deja por escrito.',

      'Sin señales. Tu manera de hablar no obliga a nadie a medir la suya, y eso se agradece. Delante del ranking y de la cara.',

      'Hoy no das asco, [nombre]. Hasta el jabón se queda quieto, joder El grupo ya lo tiene claro sin forzar el drama, asco.',

      'Low de guarra: higiene decente y cero rastro en el hilo, [nombre], cabrón El grupo ya lo tiene claro sin forzar el drama, basura.',

      '[nombre], el chat no tiene queja de suciedad que firmar, gilipollas El grupo ya lo tiene claro sin forzar el drama, ridículo.',

      'Cero grasa metafórica. [nombre] limpia de tramo, mierda El grupo ya lo tiene claro sin forzar el drama, fracasado.',

    ],
  },

  // fiel / infiel: porcentaje TOTALMENTE aleatorio (rollUniform), sin las
  // distribuciones por rol del resto. El único amaño es el del owner, que
  // OWNER_FORCE resuelve después: alto en fiel, bajo en infiel.
  fiel: {
    name: 'fiel',
    goodIsHigh: true,
    roll: rollUniform,
    high: FIEL_HIGH,
    mid: FIEL_MID,
    low: FIEL_LOW,
  },

  infiel: {
    name: 'infiel',
    goodIsHigh: false,
    roll: rollUniform,
    high: INFIEL_HIGH,
    mid: INFIEL_MID,
    low: INFIEL_LOW,
  },

  delulu: {
    name: 'delulu',
    goodIsHigh: false,
    high: [
      '[nombre], vives en una película donde eres el protagonista y el grupo solo es tu público. Nadie compró entrada, patético.',
      'Tu nivel de delulu es de manual: confundes silencio ajeno con interés y rechazo con \'aún no es el momento\', miserable.',
      '[nombre], te inventas señales donde solo hay educación básica. El resto no está coqueteando: está soportando, qué cringe.',
      '[nombre], delulu de alto voltaje: tu autoestima se alimenta de fantasías que el chat desmiente cada día, da asco.',
      '[nombre], crees que todo el mundo te analiza en secreto. La verdad es que casi nadie te tiene en la cabeza, qué vergüenza.',
      'Te narras victorias que no pasaron. El historial del grupo no respalda tu biografía interna, ridículo.',
      '[nombre], vives convencido de que \'si quisieras\' podrías. Llevas años sin querer de verdad, fracasado.',
      'Delulu puro: interpretas un \'ok\' como química y un visto como estrategia. Relaja el guion, qué miseria.',
      '[nombre], tu realidad y la del grupo no coinciden en casi nada. Y el grupo no es el que está confundido, da grima.',
      '[nombre], te crees mal entendido cuando en realidad estás mal calibrado. Esa es la diferencia, qué nivel de pena.',
      '[nombre], fabricas química con gente que solo fue amable cinco minutos. Luego sufres por una película tuya, basura.',
      'Delulu: tu potencial es siempre \'en teoría\'. En la práctica el resultado no aparece, qué cutre Y el grupo ya lo tiene fichado, da pena ajena.',
      '[nombre], hablas de ligues y planes como si existieran fuera de tu cabeza. Spoiler: no existen, da pena ajena.',
      'Te miras al espejo y ves versión premium. El chat ve la versión sin filtros ni actualizaciones, qué vacío.',
      '[nombre], cada rechazo lo conviertes en \'envidia\' o \'no estaban listos\'. Nunca en feedback, indignante.',
      '[nombre], delulu de competición: crees que te odian porque brillas. A veces solo te ignoran porque cansas, qué flojo.',
      '[nombre], tu vida amorosa es un PowerPoint de proyecciones. Falta el dato real, menudo desastre Y el grupo ya lo tiene fichado, qué pena.',
      'Vives esperando que alguien descubra lo especial que eres. Mientras, no demuestras nada especial, qué pena.',
      '[nombre], interpretas distancias como misterio y límites como juego. Son límites, punto, da vergüenza.',
      'Delulu: tu ego escribe fanfics contigo de protagonista y el grupo no es el fandom, qué vergüenza ajena.',
      '[nombre], confundes atención residual con deseo. La diferencia te destrozaría si la miraras de frente, patético.',
      '[nombre], te inventas rivalidades para sentirte importante. Nadie está compitiendo contigo, miserable.',
      '[nombre], tu \'casi algo\' es siempre casi y nunca algo. El patrón ya es una carrera, qué cringe Y el grupo ya lo tiene fichado, da asco.',
      'Delulu alto: crees que el silencio del otro es profundidad compartida. Es desinterés, da asco Y el grupo ya lo tiene fichado, qué vergüenza.',
      '[nombre], te vendes a ti mismo una versión de los hechos que no sobrevive a un testigo, qué vergüenza.',
      'Hablas de tu \'era\' como si el mundo hubiera notado el cambio. No lo notó, ridículo Y el grupo ya lo tiene fichado, fracasado.',
      '[nombre], proyectas intención en mensajes neutrales y luego te ofendes por tu propia ficción, fracasado.',
      '[nombre], delulu: piensas que te están perdiendo. La mayoría no sabía que te tenían, qué miseria Y el grupo ya lo tiene fichado, da grima.',
      '[nombre], tu autoestima depende de historias que solo tú firmaste. El chat no co-firmó, da grima Y el grupo ya lo tiene fichado, qué nivel de pena.',
      'Crees que eres difícil de olvidar. Eres fácil de no priorizar, qué nivel de pena Y el grupo ya lo tiene fichado, basura.',
      '[nombre], cada \'tal vez\' ajeno lo archivas como promesa. Por eso vives decepcionado, basura Y el grupo ya lo tiene fichado, qué cutre.',
      'Delulu de espejo: la imagen que ensayas no es la que el grupo guarda de ti, qué cutre Y el grupo ya lo tiene fichado, da pena ajena.',
      '[nombre], te crees el plot twist de la vida de otros. Eres como mucho un extra con diálogo, da pena ajena.',
      '[nombre], fabricas destino donde solo hubo coincidencia. Luego llamas destino al rechazo, qué vacío.',
      '[nombre], tu narrativa de \'me subestiman\' tapa la de \'no entrego pruebas\', indignante Y el grupo ya lo tiene fichado, qué flojo.',
      'Delulu: el mundo te debe una oportunidad. El mundo no te debe nada; tú te debes trabajo, qué flojo Y el grupo ya lo tiene fichado, menudo desastre.',
      '[nombre], lees entre líneas hasta inventar capítulos. Las líneas originales estaban vacías, menudo desastre.',
      'Te sientes elegido por el universo para algo grande. El universo no mandó el correo, qué pena Y el grupo ya lo tiene fichado, da vergüenza.',
      '[nombre], conviertes amabilidad en romance y neutralidad en traición. Agotador, da vergüenza Y el grupo ya lo tiene fichado, qué vergüenza ajena.',
      '[nombre], delulu total: tu plan B emocional es seguir creyendo el plan A aunque ya falló, qué vergüenza ajena.',
      '[nombre], crees que si insistes lo suficiente la realidad se dobla. Se dobla tu dignidad, patético Y el grupo ya lo tiene fichado, miserable.',
      'Tu confianza no viene de resultados: viene de no mirar resultados, miserable Y el grupo ya lo tiene fichado, qué cringe.',
      '[nombre], te imaginas conversaciones enteras que el otro nunca tuvo contigo, qué cringe Y el grupo ya lo tiene fichado, da asco.',
      'Delulu: \'me están testeando\'. No. Simplemente no están interesados, da asco Y el grupo ya lo tiene fichado, qué vergüenza.',
      '[nombre], vives de potenciales ajenos que nunca te ofrecieron. Cobras cheques sin firma, qué vergüenza.',
      '[nombre], te duele que no te vean como tú te ves. Quizá ellos ven más claro, ridículo Y el grupo ya lo tiene fichado, fracasado.',
      '[nombre], cada coincidencia la conviertes en señal del universo. El universo no es tu manager, fracasado.',
      'Delulu de chat: un like mental tuyo ya es una relación en tu cabeza, qué miseria Y el grupo ya lo tiene fichado, da grima.',
      '[nombre], defiendes tu versión de los hechos aunque los hechos estén en el grupo, da grima Y el grupo ya lo tiene fichado, qué nivel de pena.',
      'Crees que el problema es que la gente no profundiza. El problema es lo que hay al profundizar, qué nivel de pena.',
      '[nombre], te narras como incomprendido para no narrarte como equivocado, basura Y el grupo ya lo tiene fichado, qué cutre.',
      '[nombre], delulu: tu valor \'real\' está escondido. Llevas años sin mostrarlo; quizá no está, qué cutre.',
      '[nombre], interpretas cansancio ajeno como misterio seductor. Es cansancio, da pena ajena Y el grupo ya lo tiene fichado, qué vacío.',
      'Vives en modo tráiler de película que nunca se estrena, qué vacío Y el grupo ya lo tiene fichado, indignante.',
      '[nombre], tu ego necesita que todo sea sobre ti. Por eso todo te lo tomas personal, indignante Y el grupo ya lo tiene fichado, qué flojo.',
      'Delulu alto: crees que te están observando. Están scrolleando de largo, qué flojo Y el grupo ya lo tiene fichado, menudo desastre.',
      '[nombre], inventas química retrospectiva con gente que ya pasó página hace meses, menudo desastre Y el grupo ya lo tiene fichado, qué pena.',
      '[nombre], te aferrás a un \'hubo algo\' que solo tú catalogaste como algo, qué pena Y el grupo ya lo tiene fichado, da vergüenza.',
      '[nombre], tu realismo es selectivo: realista con los demás, fantasioso contigo, da vergüenza Y el grupo ya lo tiene fichado, qué vergüenza ajena.',
      'Delulu: el día que \'despliegues tu potencial\' todo cambiará. El día no llega, qué vergüenza ajena Y el grupo ya lo tiene fichado, patético.',
      '[nombre], construyes novelas a partir de un mensaje de tres palabras, patético Y el grupo ya lo tiene fichado, miserable.',
      'Crees que te guardan rencor. Muchas veces ni te guardan pensamiento, miserable Y el grupo ya lo tiene fichado, qué cringe.',
      '[nombre], tu autoengaño es tan estable que ya parece personalidad, qué cringe Y el grupo ya lo tiene fichado, da asco.',
      '[nombre], delulu: confundes ser intenso con ser interesante, da asco Y el grupo ya lo tiene fichado, qué vergüenza.',
      '[nombre], hablas de \'lo que se viene\' como si hubiera un contrato firmado con la vida, qué vergüenza.',
      'Te inventas versiones mejores del pasado para soportar el presente, ridículo Y el grupo ya lo tiene fichado, fracasado.',
      '[nombre], cada no lo procesas como aún no. El diccionario no funciona así, fracasado Y el grupo ya lo tiene fichado, qué miseria.',
      'Delulu de status: crees que ocupas más espacio en la cabeza ajena del que ocupas, qué miseria Y el grupo ya lo tiene fichado, da grima.',
      '[nombre], tu fanfic personal tiene más capítulos que tu historial de logros, da grima Y el grupo ya lo tiene fichado, qué nivel de pena.',
      '[nombre], vives convencido de que eres un secreto a voces. Eres un secreto sin voces, qué nivel de pena.',
      '[nombre], proyectas deseo en cortesía y luego acusas de frío al cortés, basura Y el grupo ya lo tiene fichado, qué cutre.',
      'Delulu: \'si me conocieran de verdad\'. Te conocen lo suficiente, qué cutre Y el grupo ya lo tiene fichado, da pena ajena.',
      '[nombre], tu realidad alternativa es cómoda. Por eso no emigrás a la real, da pena ajena Y el grupo ya lo tiene fichado, qué vacío.',
      'Crees que el grupo no ve tu esfuerzo. Ve el esfuerzo y el resultado; juzga el segundo, qué vacío Y el grupo ya lo tiene fichado, indignante.',
      '[nombre], interpretas límites como pruebas de amor. Son límites, indignante Y el grupo ya lo tiene fichado, qué flojo.',
      '[nombre], delulu: te despides en la cabeza de gente que no sabía que estaban en una relación, qué flojo.',
      '[nombre], tu ego escribe crónicas de una guerra que nadie más está peleando, menudo desastre Y el grupo ya lo tiene fichado, qué pena.',
      'Fabricas enemigos para sentirte en batalla. Estás solo en el ring, qué pena Y el grupo ya lo tiene fichado, da vergüenza.',
      '[nombre], cada coincidencia de horario te parece destino. Es horario, da vergüenza Y el grupo ya lo tiene fichado, qué vergüenza ajena.',
      'Delulu alto: crees que tu silencio es poder. A veces es solo que no tenías nada que decir, qué vergüenza ajena.',
      '[nombre], te crees ilegible y misterioso. Eres predecible en el mal sentido, patético Y el grupo ya lo tiene fichado, miserable.',
      '[nombre], vives de \'me lo dijeron con los ojos\'. Los ojos no firmaron nada, miserable Y el grupo ya lo tiene fichado, qué cringe.',
      '[nombre], tu narrativa de casi-éxito evita admitir el no-éxito, qué cringe Y el grupo ya lo tiene fichado, da asco.',
      'Delulu: el mundo está celoso de ti. El mundo está ocupado, da asco Y el grupo ya lo tiene fichado, qué vergüenza.',
      '[nombre], conviertes indiferencia en estrategia del otro. A veces es indiferencia, qué vergüenza Y el grupo ya lo tiene fichado, ridículo.',
      'Te duele más la fantasía rota que la realidad que nunca empezó, ridículo Y el grupo ya lo tiene fichado, fracasado.',
      '[nombre], tu nivel de proyección haría trabajar horas extra a un psicólogo, fracasado Y el grupo ya lo tiene fichado, qué miseria.',
      '[nombre], delulu: crees que te están midiendo para algo grande. Te están midiendo para no insistir, qué miseria.',
      '[nombre], hablas como si el futuro te debiera un plot twist. No te debe, da grima Y el grupo ya lo tiene fichado, qué nivel de pena.',
      'Inventas cierre emocional con gente que ni abrió la puerta, qué nivel de pena Y el grupo ya lo tiene fichado, basura.',
      '[nombre], tu autoestima es un castillo inflable: alto, visible, sin cimientos, basura Y el grupo ya lo tiene fichado, qué cutre.',
      'Delulu de espejo social: piensas que todos debaten sobre ti. Debaten el meme, qué cutre Y el grupo ya lo tiene fichado, da pena ajena.',
      '[nombre], confundes hábito de hablarte con interés genuino, da pena ajena Y el grupo ya lo tiene fichado, qué vacío.',
      '[nombre], crees que eres el tipo de persona que \'marca\'. Marcas el visto, qué vacío Y el grupo ya lo tiene fichado, indignante.',
      '[nombre], cada relectura de un chat viejo te da una dosis de ficción, indignante Y el grupo ya lo tiene fichado, qué flojo.',
      'Delulu: \'esto es solo una fase\'. La fase ya es tu residencia, qué flojo Y el grupo ya lo tiene fichado, menudo desastre.',
      '[nombre], te inventas una versión de ti que el grupo no ha conocido porque no existe aquí, menudo desastre.',
      'Vives esperando la disculpa de gente que no sabe qué hizo. No hizo nada; tú inventaste el agravio, qué pena.',
      '[nombre], tu radar de señales está calibrado para detectar lo que quieres, no lo que hay, da vergüenza.',
      '[nombre], delulu total: la evidencia en contra la clasificas como \'odio\' o \'envidia\', qué vergüenza ajena.',
      '[nombre], te narras como el que se fue por dignidad. A veces solo te fueron dejando solo, patético Y el grupo ya lo tiene fichado, miserable.',
      'Crees que tu historia es trágica. Muchas veces es solo repetitiva, miserable Y el grupo ya lo tiene fichado, qué cringe.',
      '[nombre], el delulu te protege del dato. El dato sigue ahí cuando baja el efecto, qué cringe Y el grupo ya lo tiene fichado, da asco.',
      'Tu realidad emocional tiene DLC de fantasía y no desinstalas nunca, da asco Y el grupo ya lo tiene fichado, qué vergüenza.',
      '[nombre], interpretas un \'buenas\' como reapertura de saga. Era un buenas, qué vergüenza Y el grupo ya lo tiene fichado, ridículo.',
      '[nombre], delulu: te sientes a un paso. Llevas años a un paso. El paso no se da, ridículo Y el grupo ya lo tiene fichado, fracasado.',
      '[nombre], fabricas intimidad unilateral y luego cobras deudas que el otro no contrajo, fracasado Y el grupo ya lo tiene fichado, qué miseria.',
      'Crees que te están subestimando. Están estimando con los datos disponibles, qué miseria Y el grupo ya lo tiene fichado, da grima.',
      '[nombre], tu cabeza es un estudio de doblaje: les pones diálogos a gente que no habló, da grima Y el grupo ya lo tiene fichado, qué nivel de pena.',
      'Delulu alto: el rechazo lo archivas como malentendido para no archivar como no, qué nivel de pena Y el grupo ya lo tiene fichado, basura.',
      '[nombre], vives de una reputación que solo tú actualizas, basura Y el grupo ya lo tiene fichado, qué cutre.',
      '[nombre], te crees el centro de una trama. Eres secundario incluso en tu propio hilo a veces, qué cutre.',
      '[nombre], cada \'después hablamos\' lo agenda como cita. Era un después que no llega, da pena ajena Y el grupo ya lo tiene fichado, qué vacío.',
      'Delulu: confundes ser recordado con ser querido. Se puede recordar con pereza, qué vacío Y el grupo ya lo tiene fichado, indignante.',
      '[nombre], tu mapa del deseo ajeno está dibujado a mano y sin escala, indignante Y el grupo ya lo tiene fichado, qué flojo.',
      'Inventas continuidad donde hubo un episodio piloto cancelado, qué flojo Y el grupo ya lo tiene fichado, menudo desastre.',
      '[nombre], el autoengaño ya no es un error puntual: es tu sistema operativo, menudo desastre Y el grupo ya lo tiene fichado, qué pena.',
      '[nombre], delulu: crees que el grupo te debe el beneficio de la duda. Lo gastaste, qué pena Y el grupo ya lo tiene fichado, da vergüenza.',
      '[nombre], proyectas profundidad en quien solo estaba de paso, da vergüenza Y el grupo ya lo tiene fichado, qué vergüenza ajena.',
      'Te aferrás a versiones beta de relaciones que nunca salieron a producción, qué vergüenza ajena Y el grupo ya lo tiene fichado, patético.',
      '[nombre], tu \'yo sé lo que vi\' suele ser \'yo sé lo que quise ver\', patético Y el grupo ya lo tiene fichado, miserable.',
      'Delulu de chat en grupo: un emoji te parece declaración, miserable Y el grupo ya lo tiene fichado, qué cringe.',
      '[nombre], construyes lealtad imaginaria y te cobras traiciones imaginarias, qué cringe Y el grupo ya lo tiene fichado, da asco.',
      '[nombre], crees que tu silencio castiga. A veces alivia, da asco Y el grupo ya lo tiene fichado, qué vergüenza.',
      '[nombre], vives en el \'casi\' porque el \'no\' te obliga a cambiar el relato, qué vergüenza Y el grupo ya lo tiene fichado, ridículo.',
      'Delulu: tu potencial es la excusa favorita para no mirar el presente, ridículo Y el grupo ya lo tiene fichado, fracasado.',
      '[nombre], lees el desinterés como miedo del otro a enamorarse. Es desinterés, fracasado Y el grupo ya lo tiene fichado, qué miseria.',
      'Te inventas una audiencia. La sala está medio vacía, qué miseria Y el grupo ya lo tiene fichado, da grima.',
      '[nombre], cada plan mental lo das por hablado. No se habló, da grima Y el grupo ya lo tiene fichado, qué nivel de pena.',
      '[nombre], delulu alto: crees que el tiempo dirá que tenías razón. El tiempo está diciendo otra cosa, qué nivel de pena.',
      '[nombre], tu ego necesita ser el villano o el héroe. Ser irrelevante te aterra más, basura Y el grupo ya lo tiene fichado, qué cutre.',
      'Fabricas significado en ruidos. El ruido era ruido, qué cutre Y el grupo ya lo tiene fichado, da pena ajena.',
      '[nombre], la delusión te hace soportar cosas que un realista ya hubiera cortado, da pena ajena Y el grupo ya lo tiene fichado, qué vacío.',
      'Crees que estás \'en proceso\'. El proceso sin entrega es decorado, qué vacío Y el grupo ya lo tiene fichado, indignante.',
      '[nombre], interpretas distancia como atracción al estilo misterioso. Es distancia, indignante Y el grupo ya lo tiene fichado, qué flojo.',
      '[nombre], delulu: te despides por dentro para sentir control. Por fuera no había vínculo que cerrar, qué flojo.',
      '[nombre], tu historial de \'casi\' es un museo de proyecciones, menudo desastre Y el grupo ya lo tiene fichado, qué pena.',
      'Vives de relecturas. Las relecturas no cambian el texto original, qué pena Y el grupo ya lo tiene fichado, da vergüenza.',
      '[nombre], crees que el otro está jugando 4D. Está en modo avión, da vergüenza Y el grupo ya lo tiene fichado, qué vergüenza ajena.',
      'Delulu: confundes intensidad tuya con reciprocidad, qué vergüenza ajena Y el grupo ya lo tiene fichado, patético.',
      '[nombre], cada señal ambigua la resuelves a tu favor. Por eso pierdes después, patético Y el grupo ya lo tiene fichado, miserable.',
      '[nombre], te inventas un yo futuro para no habitar el yo actual, miserable Y el grupo ya lo tiene fichado, qué cringe.',
      '[nombre], el grupo ya identificó tu patrón de autoengaño. Tú aún no, qué cringe Y el grupo ya lo tiene fichado, da asco.',
      'Delulu de status social: crees que generas debate. Generas silencio educado, da asco Y el grupo ya lo tiene fichado, qué vergüenza.',
      '[nombre], proyectas compromiso en quien solo estaba entretenido, qué vergüenza Y el grupo ya lo tiene fichado, ridículo.',
      'Tu realidad tiene filtros de Instagram emocionales. Sin filtro duele más y miente menos, ridículo Y el grupo ya lo tiene fichado, fracasado.',
      '[nombre], crees que te están esperando. La vida no hace fila por nadie, fracasado Y el grupo ya lo tiene fichado, qué miseria.',
      '[nombre], delulu: el \'no\' lo oyes en cámara lenta para buscar un sí escondido, qué miseria Y el grupo ya lo tiene fichado, da grima.',
      '[nombre], fabricas química con el recuerdo, no con la persona actual, da grima Y el grupo ya lo tiene fichado, qué nivel de pena.',
      'Te sostienes en una versión de ti que solo existe en monólogo interno, qué nivel de pena Y el grupo ya lo tiene fichado, basura.',
      '[nombre], interpretas cortesía profesional como interés personal, basura Y el grupo ya lo tiene fichado, qué cutre.',
      'Delulu alto: tu ego escribe finales felices en borrador y se enfada cuando no se publican, qué cutre.',
      '[nombre], confundes ser el tema de un mensaje con ser el tema de una vida, da pena ajena Y el grupo ya lo tiene fichado, qué vacío.',
      '[nombre], crees que la insistencia demuestra valor. A veces demuestra sordera, qué vacío Y el grupo ya lo tiene fichado, indignante.',
      '[nombre], vives en un loop de esperanza sin datos nuevos, indignante Y el grupo ya lo tiene fichado, qué flojo.',
      'Delulu: cada vez que la realidad golpea, subes el volumen de la fantasía, qué flojo Y el grupo ya lo tiene fichado, menudo desastre.',
      '[nombre], te crees ilegible para parecer interesante. Eres legible: se lee delulu, menudo desastre Y el grupo ya lo tiene fichado, qué pena.',
      'Inventas tests para el otro y suspendes tú al inventarlos, qué pena Y el grupo ya lo tiene fichado, da vergüenza.',
      '[nombre], tu narrativa de escogido te evita la de descartado, da vergüenza Y el grupo ya lo tiene fichado, qué vergüenza ajena.',
      '[nombre], delulu de grupo: crees que cuando callan es por impacto. Es por no alimentar, qué vergüenza ajena.',
      '[nombre], proyectas historia donde hubo anécdota, patético Y el grupo ya lo tiene fichado, miserable.',
      'Te duele el guion que escribiste, no la vida que viviste, miserable Y el grupo ya lo tiene fichado, qué cringe.',
      '[nombre], cada \'quizá otro día\' lo guardas como reserva activa. Está vencido, qué cringe Y el grupo ya lo tiene fichado, da asco.',
      'Delulu: tu autoestima es un préstamo de la fantasía con intereses altos, da asco Y el grupo ya lo tiene fichado, qué vergüenza.',
      '[nombre], crees que el misterio te favorece. El misterio es que no hay misterio, qué vergüenza Y el grupo ya lo tiene fichado, ridículo.',
      '[nombre], vives esperando que alguien valide el personaje. El casting no te llamó, ridículo Y el grupo ya lo tiene fichado, fracasado.',
      '[nombre], interpretas un seguimiento en redes como trama emocional, fracasado Y el grupo ya lo tiene fichado, qué miseria.',
      'Delulu alto: fabricas escasez de ti mismo para sentirte premium. No es premium: es pose, qué miseria.',
      '[nombre], el rechazo lo conviertes en prueba de que eras demasiado. A veces eras demasiado delulu, da grima.',
      'Crees que estás un malentendido lejos del sí. Estás un realismo lejos, qué nivel de pena Y el grupo ya lo tiene fichado, basura.',
      '[nombre], tu cabeza es un departamento de marketing de ti mismo sin producto detrás, basura Y el grupo ya lo tiene fichado, qué cutre.',
      '[nombre], delulu: confundes hábito de pensarte con hábito de desearte, qué cutre Y el grupo ya lo tiene fichado, da pena ajena.',
      '[nombre], cada vez que alguien es decente, lo conviertes en pretendiente, da pena ajena Y el grupo ya lo tiene fichado, qué vacío.',
      'Te inventas un legado emocional que nadie te pidió administrar, qué vacío Y el grupo ya lo tiene fichado, indignante.',
      '[nombre], vives de cliffhangers personales. Nadie renovó la serie, indignante Y el grupo ya lo tiene fichado, qué flojo.',
      'Delulu: el dato incómodo lo llamas negatividad. Es dato, qué flojo Y el grupo ya lo tiene fichado, menudo desastre.',
      '[nombre], proyectas profundidad en quien solo tenía tiempo libre un rato, menudo desastre Y el grupo ya lo tiene fichado, qué pena.',
      '[nombre], tu delulu no es romántico: es una forma de no mirar el ranking real de tu vida, qué pena Y el grupo ya lo tiene fichado, da vergüenza.',
      '[nombre], crees que te están estudiando. Están cambiando de conversación, da vergüenza Y el grupo ya lo tiene fichado, qué vergüenza ajena.',
      'Delulu alto: escribes finales en la cabeza y cobras entrada al que ni sabía que había obra, qué vergüenza ajena.',
      '[nombre], interpretas el \'no ahora\' como \'sí después\'. El diccionario del otro no es el tuyo, patético.',
      'Fabricas exclusividad en vínculos que eran abiertos o nulos, miserable Y el grupo ya lo tiene fichado, qué cringe.',
      '[nombre], tu nivel de autoengaño ya es parte de tu marca personal en el grupo, qué cringe Y el grupo ya lo tiene fichado, da asco.',
      '[nombre], delulu: te sientes a punto. El punto se mueve cada vez que te acercas, da asco Y el grupo ya lo tiene fichado, qué vergüenza.',
      '[nombre], confundes ser intenso en privado con ser prioritario en la vida del otro, qué vergüenza Y el grupo ya lo tiene fichado, ridículo.',
      'Crees que el tiempo te va a reivindicar. El tiempo solo pasa, ridículo Y el grupo ya lo tiene fichado, fracasado.',
      '[nombre], cada señal débil la amplificas hasta romper el parlante de tu juicio, fracasado Y el grupo ya lo tiene fichado, qué miseria.',
      'Delulu de espejo: la persona que ves no es la que el chat tiene guardada, qué miseria Y el grupo ya lo tiene fichado, da grima.',
      '[nombre], te narras como excepción. Las reglas te aplican igual, da grima Y el grupo ya lo tiene fichado, qué nivel de pena.',
      '[nombre], vives en el ensayo de una vida que no estrenas, qué nivel de pena Y el grupo ya lo tiene fichado, basura.',
      '[nombre], el delulu te hace compañía. También te deja solo frente al dato, basura Y el grupo ya lo tiene fichado, qué cutre.',
      'Delulu total: cuando la realidad insiste, tú insistes más fuerte en la fantasía, qué cutre Y el grupo ya lo tiene fichado, da pena ajena.',
      '[nombre], crees que te deben una explicación elaborada. A veces el no es la explicación, da pena ajena.',
      'Tu autoengaño tiene más continuidad que tus proyectos, qué vacío Y el grupo ya lo tiene fichado, indignante.',
      '[nombre], interpretas paciencia ajena como interés sostenido. Es paciencia, indignante Y el grupo ya lo tiene fichado, qué flojo.',
      '[nombre], delulu: fabricas un \'nosotros\' sin el voto del otro, qué flojo Y el grupo ya lo tiene fichado, menudo desastre.',
      '[nombre], el grupo ya sabe cuándo estás en modo película. Tú aún no lo apagas, menudo desastre Y el grupo ya lo tiene fichado, qué pena.',
      'Crees que eres un caso complejo. A veces eres un caso de proyección simple, qué pena Y el grupo ya lo tiene fichado, da vergüenza.',
      '[nombre], cada relectura te da esperanza y te quita realismo. Mala inversión, da vergüenza Y el grupo ya lo tiene fichado, qué vergüenza ajena.',
      'Delulu alto: tu ego necesita que el rechazo sea un malentendido épico, no un no ordinario, qué vergüenza ajena.',
    ],
    mid: [
      '[nombre], estás a medias entre verlo y seguir creyendo lo que te conviene, da asco Se te ve el tira y afloja, patético.',
      'Delulu moderado: ya sospechas la verdad, pero aún no la firmas, qué vergüenza Se te ve el tira y afloja, miserable.',
      '[nombre], mezclas datos reales con hope. El resultado es confusión estable, ridículo Se te ve el tira y afloja, qué cringe.',
      'No estás en la luna, pero tampoco con los pies del todo en el suelo, fracasado Se te ve el tira y afloja, da asco.',
      '[nombre], interpretas de más de vez en cuando. No siempre: lo suficiente para notar, qué miseria.',
      'Hay un poco de película en cómo te cuentas las cosas, da grima Se te ve el tira y afloja, ridículo.',
      '[nombre], tu radar falla en lo que te gusta oír. En lo demás funciona, qué nivel de pena Se te ve el tira y afloja, fracasado.',
      'Delulu mid: todavía negocias con la evidencia en vez de aceptarla, basura Se te ve el tira y afloja, qué miseria.',
      '[nombre], a ratos realista, a ratos en modo fanfic personal, qué cutre Se te ve el tira y afloja, da grima.',
      'No es extremo, pero tu autoengaño hace turnos, da pena ajena Se te ve el tira y afloja, qué nivel de pena.',
      '[nombre], crees la mitad de lo que te inventas. La otra mitad te sostiene, qué vacío Se te ve el tira y afloja, basura.',
      'Estás en la zona gris: ni ciego ni lúcido del todo, indignante Se te ve el tira y afloja, qué cutre.',
      '[nombre], a veces amplificas señales. Otras veces las ves bien, qué flojo Se te ve el tira y afloja, da pena ajena.',
      'Delulu de mantenimiento: suficiente para no caer, insuficiente para despertar, menudo desastre.',
      '[nombre], tu relato personal tiene retoques. No es CGI total, pero hay filtro, qué pena Se te ve el tira y afloja, indignante.',
      'Dudas, y eso ya es progreso. Falta actuar como si la duda importara, da vergüenza Se te ve el tira y afloja, qué flojo.',
      '[nombre], aún guardas versiones optimistas de cosas que ya cerraron, qué vergüenza ajena Se te ve el tira y afloja, menudo desastre.',
      'Mid delulu: el ego discute con los datos y a veces gana el ego, patético Se te ve el tira y afloja, qué pena.',
      '[nombre], no vives en una novela, pero le pones banda sonora de más, miserable Se te ve el tira y afloja, da vergüenza.',
      'Hay lucidez a ratos. También hay relectura esperanzada de más, qué cringe Se te ve el tira y afloja, qué vergüenza ajena.',
      '[nombre], estás a medias entre verlo y seguir creyendo lo que te conviene, da asco Se te ve el tira y afloja, patético.',
      'Delulu moderado: ya sospechas la verdad, pero aún no la firmas, qué vergüenza Se te ve el tira y afloja, miserable.',
      '[nombre], mezclas datos reales con hope. El resultado es confusión estable, ridículo Se te ve el tira y afloja, qué cringe.',
      'No estás en la luna, pero tampoco con los pies del todo en el suelo, fracasado Se te ve el tira y afloja, da asco.',
      '[nombre], interpretas de más de vez en cuando. No siempre: lo suficiente para notar, qué miseria.',
      'Hay un poco de película en cómo te cuentas las cosas, da grima Se te ve el tira y afloja, ridículo.',
      '[nombre], tu radar falla en lo que te gusta oír. En lo demás funciona, qué nivel de pena Se te ve el tira y afloja, fracasado.',
      'Delulu mid: todavía negocias con la evidencia en vez de aceptarla, basura Se te ve el tira y afloja, qué miseria.',
      '[nombre], a ratos realista, a ratos en modo fanfic personal, qué cutre Se te ve el tira y afloja, da grima.',
      'No es extremo, pero tu autoengaño hace turnos, da pena ajena Se te ve el tira y afloja, qué nivel de pena.',
      '[nombre], crees la mitad de lo que te inventas. La otra mitad te sostiene, qué vacío Se te ve el tira y afloja, basura.',
      'Estás en la zona gris: ni ciego ni lúcido del todo, indignante Se te ve el tira y afloja, qué cutre.',
      '[nombre], a veces amplificas señales. Otras veces las ves bien, qué flojo Se te ve el tira y afloja, da pena ajena.',
      'Delulu de mantenimiento: suficiente para no caer, insuficiente para despertar, menudo desastre.',
      '[nombre], tu relato personal tiene retoques. No es CGI total, pero hay filtro, qué pena Se te ve el tira y afloja, indignante.',
      'Dudas, y eso ya es progreso. Falta actuar como si la duda importara, da vergüenza Se te ve el tira y afloja, qué flojo.',
      '[nombre], aún guardas versiones optimistas de cosas que ya cerraron, qué vergüenza ajena Se te ve el tira y afloja, menudo desastre.',
      'Mid delulu: el ego discute con los datos y a veces gana el ego, patético Se te ve el tira y afloja, qué pena.',
      '[nombre], no vives en una novela, pero le pones banda sonora de más, miserable Se te ve el tira y afloja, da vergüenza.',
      'Hay lucidez a ratos. También hay relectura esperanzada de más, qué cringe Se te ve el tira y afloja, qué vergüenza ajena.',
      '[nombre], estás a medias entre verlo y seguir creyendo lo que te conviene, da asco Se te ve el tira y afloja, patético.',
      'Delulu moderado: ya sospechas la verdad, pero aún no la firmas, qué vergüenza Se te ve el tira y afloja, miserable.',
      '[nombre], mezclas datos reales con hope. El resultado es confusión estable, ridículo Se te ve el tira y afloja, qué cringe.',
      'No estás en la luna, pero tampoco con los pies del todo en el suelo, fracasado Se te ve el tira y afloja, da asco.',
      '[nombre], interpretas de más de vez en cuando. No siempre: lo suficiente para notar, qué miseria.',
      'Hay un poco de película en cómo te cuentas las cosas, da grima Se te ve el tira y afloja, ridículo.',
      '[nombre], tu radar falla en lo que te gusta oír. En lo demás funciona, qué nivel de pena Se te ve el tira y afloja, fracasado.',
      'Delulu mid: todavía negocias con la evidencia en vez de aceptarla, basura Se te ve el tira y afloja, qué miseria.',
      '[nombre], a ratos realista, a ratos en modo fanfic personal, qué cutre Se te ve el tira y afloja, da grima.',
      'No es extremo, pero tu autoengaño hace turnos, da pena ajena Se te ve el tira y afloja, qué nivel de pena.',
    ],
    low: [
      '[nombre], esta vez estás bastante anclado. Pocas películas, más dato Sigue así de sobrio.',
      'Poco delulu: miras el rechazo como rechazo y no como misterio Sigue así de sobrio.',
      '[nombre], tu lectura de la realidad está más limpia de lo habitual Sigue así de sobrio.',
      'Bajo de autoengaño. Se nota cuando no fuerzas la narrativa Sigue así de sobrio.',
      '[nombre], aceptas el no sin convertirlo en epopeya. Eso es raro y sano aquí Sigue así de sobrio.',
      'Casi sin filtro fantasioso. El ego no está de turnista hoy Sigue así de sobrio.',
      '[nombre], interpretas menos y observas más. Buen cambio de software Sigue así de sobrio.',
      'Delulu bajo: la evidencia te pesa más que el hope Sigue así de sobrio.',
      '[nombre], no estás fabricando química con migajas. Progreso real Sigue así de sobrio.',
      'Lectura sobria. El grupo lo notaría si comparara con tus días peores Sigue así de sobrio.',
      '[nombre], dejas que el silencio sea silencio. No le pones guion Sigue así de sobrio.',
      'Poca proyección. Hoy no estás de director de cine emocional Sigue así de sobrio.',
      '[nombre], tu autoestima no pide fanfic para sostenerse en este tramo Sigue así de sobrio.',
      'Anclado. Sin novela paralela detectada en esta tirada Sigue así de sobrio.',
      '[nombre], miras el dato aunque moleste. Eso ya no es delulu Sigue así de sobrio.',
      'Bajo: separas deseo de señal. Diferencia clave Sigue así de sobrio.',
      '[nombre], no amplificas un \'ok\' a declaración. Bien calibrado Sigue así de sobrio.',
      'Realismo usable. No perfecto, pero funcional Sigue así de sobrio.',
      '[nombre], el relato personal y los hechos están más cerca de lo normal Sigue así de sobrio.',
      'Poco teatro interno. Se agradece el descanso del guion Sigue así de sobrio.',
      '[nombre], esta vez estás bastante anclado. Pocas películas, más dato Sigue así de sobrio.',
      'Poco delulu: miras el rechazo como rechazo y no como misterio Sigue así de sobrio.',
      '[nombre], tu lectura de la realidad está más limpia de lo habitual Sigue así de sobrio.',
      'Bajo de autoengaño. Se nota cuando no fuerzas la narrativa Sigue así de sobrio.',
      '[nombre], aceptas el no sin convertirlo en epopeya. Eso es raro y sano aquí Sigue así de sobrio.',
      'Casi sin filtro fantasioso. El ego no está de turnista hoy Sigue así de sobrio.',
      '[nombre], interpretas menos y observas más. Buen cambio de software Sigue así de sobrio.',
      'Delulu bajo: la evidencia te pesa más que el hope Sigue así de sobrio.',
      '[nombre], no estás fabricando química con migajas. Progreso real Sigue así de sobrio.',
      'Lectura sobria. El grupo lo notaría si comparara con tus días peores Sigue así de sobrio.',
      '[nombre], dejas que el silencio sea silencio. No le pones guion Sigue así de sobrio.',
      'Poca proyección. Hoy no estás de director de cine emocional Sigue así de sobrio.',
      '[nombre], tu autoestima no pide fanfic para sostenerse en este tramo Sigue así de sobrio.',
      'Anclado. Sin novela paralela detectada en esta tirada Sigue así de sobrio.',
      '[nombre], miras el dato aunque moleste. Eso ya no es delulu Sigue así de sobrio.',
      'Bajo: separas deseo de señal. Diferencia clave Sigue así de sobrio.',
      '[nombre], no amplificas un \'ok\' a declaración. Bien calibrado Sigue así de sobrio.',
      'Realismo usable. No perfecto, pero funcional Sigue así de sobrio.',
      '[nombre], el relato personal y los hechos están más cerca de lo normal Sigue así de sobrio.',
      'Poco teatro interno. Se agradece el descanso del guion Sigue así de sobrio.',
      '[nombre], esta vez estás bastante anclado. Pocas películas, más dato Sigue así de sobrio.',
      'Poco delulu: miras el rechazo como rechazo y no como misterio Sigue así de sobrio.',
      '[nombre], tu lectura de la realidad está más limpia de lo habitual Sigue así de sobrio.',
      'Bajo de autoengaño. Se nota cuando no fuerzas la narrativa Sigue así de sobrio.',
      '[nombre], aceptas el no sin convertirlo en epopeya. Eso es raro y sano aquí Sigue así de sobrio.',
      'Casi sin filtro fantasioso. El ego no está de turnista hoy Sigue así de sobrio.',
      '[nombre], interpretas menos y observas más. Buen cambio de software Sigue así de sobrio.',
      'Delulu bajo: la evidencia te pesa más que el hope Sigue así de sobrio.',
      '[nombre], no estás fabricando química con migajas. Progreso real Sigue así de sobrio.',
      'Lectura sobria. El grupo lo notaría si comparara con tus días peores Sigue así de sobrio.',
    ],
  },

  diagnostico: {
    name: 'diagnóstico',
    goodIsHigh: false,
    high: [
      'Diagnóstico de [nombre]: ego inflado, resultados flacos y una resistencia notable a mirar el espejo, patético.',
      '[nombre], el informe da claro: más pose que sustancia. El grupo ya lo intuía, miserable Archivo abierto, da asco.',
      'Diagnóstico: dependencia del relato heroico para no admitir mediocridad operativa, qué cringe Archivo abierto, qué vergüenza.',
      '[nombre], presentas síntomas de alguien que habla mejor de sí mismo de lo que rinde, da asco Archivo abierto, ridículo.',
      'Informe: confundes volumen de mensajes con valor. Efecto secundario: cansancio ajeno, qué vergüenza.',
      '[nombre], cuadro clínico de autoestima prestada y pruebas insuficientes, ridículo Archivo abierto, qué miseria.',
      'Diagnóstico: evitas el dato incómodo como quien evita una analítica, fracasado Archivo abierto, da grima.',
      '[nombre], se observa proyección crónica y baja tolerancia a la crítica útil, qué miseria Archivo abierto, qué nivel de pena.',
      'Informe frío: tu confianza no está respaldada por el historial del chat, da grima Archivo abierto, basura.',
      '[nombre], patrón de promesas internas sin entrega externa. Crónico, qué nivel de pena Archivo abierto, qué cutre.',
      'Diagnóstico: necesidad de ser el centro con poco material de centro, basura Archivo abierto, da pena ajena.',
      '[nombre], síntomas de delulu social mezclados con pereza de cambio, qué cutre Archivo abierto, qué vacío.',
      'Informe: reaccionas a la realidad como si fuera un ataque personal, da pena ajena Archivo abierto, indignante.',
      '[nombre], se detecta miedo a medir resultados reales. Prefieres narrativas, qué vacío Archivo abierto, qué flojo.',
      'Diagnóstico: el yo ideal trabaja tiempo completo; el yo real está de baja, indignante Archivo abierto, menudo desastre.',
      '[nombre], cuadro de quien exige respeto anticipado sin depositar mérito, qué flojo Archivo abierto, qué pena.',
      'Informe: tu presencia genera más gestión que admiración, menudo desastre Archivo abierto, da vergüenza.',
      '[nombre], síntomas claros de hablar desde el potencial y vivir desde la excusa, qué pena Archivo abierto, qué vergüenza ajena.',
      'Diagnóstico: baja lucidez selectiva. Solo ves lo que no te implica, da vergüenza Archivo abierto, patético.',
      '[nombre], patrón repetido de ofenderte por espejos que no pediste pero necesitabas, qué vergüenza ajena.',
      'Informe clínico-cruel: tu marca personal es ruido con intermitencia de sustancia, patético Archivo abierto, qué cringe.',
      '[nombre], se observa dependencia de validación y escasez de autocritica, miserable Archivo abierto, da asco.',
      'Diagnóstico: conviertes feedback en enemistad para no convertirlo en tarea, qué cringe Archivo abierto, qué vergüenza.',
      '[nombre], el expediente muestra más justificación que corrección, da asco Archivo abierto, ridículo.',
      'Informe: tolerancia alta al autoengaño, baja a la evidencia, qué vergüenza Archivo abierto, fracasado.',
      '[nombre], síntomas de protagonista en monólogo y secundario en resultados, ridículo Archivo abierto, qué miseria.',
      'Diagnóstico: tu sistema inmune rechaza el \'no\' y busca reinterpretarlo, fracasado Archivo abierto, da grima.',
      '[nombre], cuadro de intensidad sin dirección. Cansa y no avanza, qué miseria Archivo abierto, qué nivel de pena.',
      'Informe: la autoimagen está desactualizada respecto al build actual, da grima Archivo abierto, basura.',
      '[nombre], se detecta hábito de cobrar deudas emocionales que nadie firmó, qué nivel de pena Archivo abierto, qué cutre.',
      'Diagnóstico: más energía en la pose que en el trabajo invisible, basura Archivo abierto, da pena ajena.',
      '[nombre], patrón de desaparecer cuando toca demostrar y reaparecer cuando toca opinar, qué cutre Archivo abierto, qué vacío.',
      'Informe: tu ego firma cheques que tu capacidad no cubre, da pena ajena Archivo abierto, indignante.',
      '[nombre], síntomas de alguien que necesita ganar discusiones más que entender, qué vacío Archivo abierto, qué flojo.',
      'Diagnóstico: la herida no es el roast; es que el roast tenía base, indignante Archivo abierto, menudo desastre.',
      '[nombre], cuadro clínico de relevancia percibida mayor que la relevancia medida, qué flojo Archivo abierto, qué pena.',
      'Informe: evitas cerrar ciclos para no admitir que ya estaban cerrados, menudo desastre Archivo abierto, da vergüenza.',
      '[nombre], se observa narrativa de incomprendido con datos de mal calibrado, qué pena Archivo abierto, qué vergüenza ajena.',
      'Diagnóstico: tu brújula apunta al orgullo, no al ajuste, da vergüenza Archivo abierto, patético.',
      '[nombre], patrón de subir el volumen cuando baja el argumento, qué vergüenza ajena Archivo abierto, miserable.',
      'Informe: la paciencia ajena es tu recurso no renovable favorito, patético Archivo abierto, qué cringe.',
      '[nombre], síntomas de vivir de proyecciones y sorprenderte cuando no pagan, miserable Archivo abierto, da asco.',
      'Diagnóstico: identidad apoyada en filtros; sin filtro hay desajuste, qué cringe Archivo abierto, qué vergüenza.',
      '[nombre], cuadro de quien colecciona intentos y no aciertos, da asco Archivo abierto, ridículo.',
      'Informe: tu resistencia al cambio es más fuerte que tu queja del presente, qué vergüenza Archivo abierto, fracasado.',
      '[nombre], se detecta hábito de leer indiferencia como misterio, ridículo Archivo abierto, qué miseria.',
      'Diagnóstico: el problema no es el grupo; es el informe que el grupo ya tiene de ti, fracasado Archivo abierto, da grima.',
      '[nombre], patrón de pedir confianza sin historial que la sostenga, qué miseria Archivo abierto, qué nivel de pena.',
      'Informe clínico: más drama de trama que progreso de personaje, da grima Archivo abierto, basura.',
      '[nombre], síntomas de autoestima procíclica: sube con likes mentales, cae con datos, qué nivel de pena.',
      'Diagnóstico de [nombre]: priorizas quedar por encima del dato. El dato siempre vuelve, patético Seguimiento 0, miserable.',
      '[nombre], informe: tu orgullo gasta más de lo que tu mérito ingresa, miserable Seguimiento 1, qué cringe.',
      'Cuadro clínico: hambre de estatus y dieta de resultados, qué cringe Seguimiento 2, da asco.',
      '[nombre], se observa costumbre de reescribir el pasado para proteger el ego, da asco Seguimiento 3, qué vergüenza.',
      'Diagnóstico: hablas de estándares que no aplicas en casa, qué vergüenza Seguimiento 4, ridículo.',
      '[nombre], patrón de exigir claridad ajena mientras ofreces niebla, ridículo Seguimiento 5, fracasado.',
      'Informe: tu zona de confort es quejarte del mapa sin caminar, fracasado Seguimiento 6, qué miseria.',
      '[nombre], síntomas de alguien que necesita público más que plan, qué miseria Seguimiento 7, da grima.',
      'Diagnóstico: confundes ser recordado con ser respetado, da grima Seguimiento 8, qué nivel de pena.',
      '[nombre], el expediente marca repetición de los mismos errores con distinta excusa, qué nivel de pena.',
      'Informe frío: tu narrativa de esfuerzo no cuadra con la entrega visible, basura Seguimiento 10, qué cutre.',
      '[nombre], se detecta alergia al \'no\' y adicción al \'aún no\', qué cutre Seguimiento 11, da pena ajena.',
      'Diagnóstico: el yo marketing supera al yo producto, da pena ajena Seguimiento 12, qué vacío.',
      '[nombre], cuadro de intensidad mal invertida, qué vacío Seguimiento 13, indignante.',
      'Informe: generas más ruido de gestión que señal de valor, indignante Seguimiento 14, qué flojo.',
      '[nombre], patrón de buscar culpables externos con precisión y culpables internos con niebla, qué flojo.',
      'Diagnóstico: tu brújula moral apunta hacia donde duele menos, menudo desastre Seguimiento 16, qué pena.',
      '[nombre], síntomas de vivir a crédito de potencial, qué pena Seguimiento 17, da vergüenza.',
      'Informe: la autoimagen tiene inflación; el rendimiento no, da vergüenza Seguimiento 18, qué vergüenza ajena.',
      '[nombre], se observa miedo a medir porque medir cierra discusiones a tu favor, qué vergüenza ajena Seguimiento 19, patético.',
      'Diagnóstico: prefieres ser mal interpretado que mal evaluado con números, patético Seguimiento 20, miserable.',
      '[nombre], cuadro de dependencia de la última palabra, miserable Seguimiento 21, qué cringe.',
      'Informe: tu presencia exige energía; no siempre la devuelve, qué cringe Seguimiento 22, da asco.',
      '[nombre], patrón de transformar límites ajenos en ofensas personales, da asco Seguimiento 23, qué vergüenza.',
      'Diagnóstico: el archivo del grupo es más honesto que tu monólogo, qué vergüenza Seguimiento 24, ridículo.',
      '[nombre], síntomas de alguien que colecciona intenciones y exhibe pocas pruebas, ridículo Seguimiento 25, fracasado.',
      'Informe: hay más teatro de cambio que cambio, fracasado Seguimiento 26, qué miseria.',
      '[nombre], se detecta hábito de pelear el espejo en vez de lavarlo, qué miseria Seguimiento 27, da grima.',
      'Diagnóstico: tu necesidad de ganar la escena supera la de mejorar el script, da grima Seguimiento 28, qué nivel de pena.',
      '[nombre], cuadro clínico de relevancia autoasignada, qué nivel de pena Seguimiento 29, basura.',
      'Informe: reaccionas al feedback como a un ataque, no como a un mapa, basura Seguimiento 0, qué cutre.',
      '[nombre], patrón de alzar principios solo cuando te convienen, qué cutre Seguimiento 1, da pena ajena.',
      'Diagnóstico: el cansancio que generas ya es parte del diagnóstico, da pena ajena Seguimiento 2, qué vacío.',
      '[nombre], síntomas de narrativa de víctima con datos de protagonista del lío, qué vacío Seguimiento 3, indignante.',
      'Informe: tu sistema de creencias filtra lo que no te favorece, indignante Seguimiento 4, qué flojo.',
      '[nombre], se observa más lealtad a la pose que a la verdad, qué flojo Seguimiento 5, menudo desastre.',
      'Diagnóstico: estás en seguimiento por repetir el mismo ciclo, menudo desastre Seguimiento 6, qué pena.',
      '[nombre], cuadro de quien necesita que el grupo baje el listón, qué pena Seguimiento 7, da vergüenza.',
      'Informe: la distancia entre lo que dices ser y lo que se ve es el hallazgo principal, da vergüenza Seguimiento 8, qué vergüenza ajena.',
      '[nombre], patrón de buscar atajos de estatus sin km de trabajo, qué vergüenza ajena Seguimiento 9, patético.',
      'Diagnóstico de [nombre]: priorizas quedar por encima del dato. El dato siempre vuelve, patético Seguimiento 10, miserable id40, patético.',
      '[nombre], informe: tu orgullo gasta más de lo que tu mérito ingresa, miserable Seguimiento 11, qué cringe id41, miserable.',
      'Cuadro clínico: hambre de estatus y dieta de resultados, qué cringe Seguimiento 12, da asco id42, qué cringe.',
      '[nombre], se observa costumbre de reescribir el pasado para proteger el ego, da asco Seguimiento 13, qué vergüenza id43, da asco.',
      'Diagnóstico: hablas de estándares que no aplicas en casa, qué vergüenza Seguimiento 14, ridículo id44, qué vergüenza.',
      '[nombre], patrón de exigir claridad ajena mientras ofreces niebla, ridículo Seguimiento 15, fracasado id45, ridículo.',
      'Informe: tu zona de confort es quejarte del mapa sin caminar, fracasado Seguimiento 16, qué miseria id46, fracasado.',
      '[nombre], síntomas de alguien que necesita público más que plan, qué miseria Seguimiento 17, da grima id47, qué miseria.',
      'Diagnóstico: confundes ser recordado con ser respetado, da grima Seguimiento 18, qué nivel de pena id48, da grima.',
      '[nombre], el expediente marca repetición de los mismos errores con distinta excusa, qué nivel de pena id49, qué nivel de pena.',
      'Informe frío: tu narrativa de esfuerzo no cuadra con la entrega visible, basura Seguimiento 20, qué cutre id50, basura.',
      '[nombre], se detecta alergia al \'no\' y adicción al \'aún no\', qué cutre Seguimiento 21, da pena ajena id51, qué cutre.',
      'Diagnóstico: el yo marketing supera al yo producto, da pena ajena Seguimiento 22, qué vacío id52, da pena ajena.',
      '[nombre], cuadro de intensidad mal invertida, qué vacío Seguimiento 23, indignante id53, qué vacío.',
      'Informe: generas más ruido de gestión que señal de valor, indignante Seguimiento 24, qué flojo id54, indignante.',
      '[nombre], patrón de buscar culpables externos con precisión y culpables internos con niebla, qué flojo id55, qué flojo.',
      'Diagnóstico: tu brújula moral apunta hacia donde duele menos, menudo desastre Seguimiento 26, qué pena id56, menudo desastre.',
      '[nombre], síntomas de vivir a crédito de potencial, qué pena Seguimiento 27, da vergüenza id57, qué pena.',
      'Informe: la autoimagen tiene inflación; el rendimiento no, da vergüenza Seguimiento 28, qué vergüenza ajena id58, da vergüenza.',
      '[nombre], se observa miedo a medir porque medir cierra discusiones a tu favor, qué vergüenza ajena Seguimiento 29, patético id59, qué vergüenza ajena.',
      'Diagnóstico: prefieres ser mal interpretado que mal evaluado con números, patético Seguimiento 0, miserable id60, patético.',
      '[nombre], cuadro de dependencia de la última palabra, miserable Seguimiento 1, qué cringe id61, miserable.',
      'Informe: tu presencia exige energía; no siempre la devuelve, qué cringe Seguimiento 2, da asco id62, qué cringe.',
      '[nombre], patrón de transformar límites ajenos en ofensas personales, da asco Seguimiento 3, qué vergüenza id63, da asco.',
      'Diagnóstico: el archivo del grupo es más honesto que tu monólogo, qué vergüenza Seguimiento 4, ridículo id64, qué vergüenza.',
      '[nombre], síntomas de alguien que colecciona intenciones y exhibe pocas pruebas, ridículo Seguimiento 5, fracasado id65, ridículo.',
      'Informe: hay más teatro de cambio que cambio, fracasado Seguimiento 6, qué miseria id66, fracasado.',
      '[nombre], se detecta hábito de pelear el espejo en vez de lavarlo, qué miseria Seguimiento 7, da grima id67, qué miseria.',
      'Diagnóstico: tu necesidad de ganar la escena supera la de mejorar el script, da grima Seguimiento 8, qué nivel de pena id68, da grima.',
      '[nombre], cuadro clínico de relevancia autoasignada, qué nivel de pena Seguimiento 9, basura id69, qué nivel de pena.',
      'Informe: reaccionas al feedback como a un ataque, no como a un mapa, basura Seguimiento 10, qué cutre id70, basura.',
      '[nombre], patrón de alzar principios solo cuando te convienen, qué cutre Seguimiento 11, da pena ajena id71, qué cutre.',
      'Diagnóstico: el cansancio que generas ya es parte del diagnóstico, da pena ajena Seguimiento 12, qué vacío id72, da pena ajena.',
      '[nombre], síntomas de narrativa de víctima con datos de protagonista del lío, qué vacío Seguimiento 13, indignante id73, qué vacío.',
      'Informe: tu sistema de creencias filtra lo que no te favorece, indignante Seguimiento 14, qué flojo id74, indignante.',
      '[nombre], se observa más lealtad a la pose que a la verdad, qué flojo Seguimiento 15, menudo desastre id75, qué flojo.',
      'Diagnóstico: estás en seguimiento por repetir el mismo ciclo, menudo desastre Seguimiento 16, qué pena id76, menudo desastre.',
      '[nombre], cuadro de quien necesita que el grupo baje el listón, qué pena Seguimiento 17, da vergüenza id77, qué pena.',
      'Informe: la distancia entre lo que dices ser y lo que se ve es el hallazgo principal, da vergüenza Seguimiento 18, qué vergüenza ajena id78, da vergüenza.',
      '[nombre], patrón de buscar atajos de estatus sin km de trabajo, qué vergüenza ajena Seguimiento 19, patético id79, qué vergüenza ajena.',
      'Diagnóstico de [nombre]: priorizas quedar por encima del dato. El dato siempre vuelve, patético Seguimiento 20, miserable id80, patético.',
      '[nombre], informe: tu orgullo gasta más de lo que tu mérito ingresa, miserable Seguimiento 21, qué cringe id81, miserable.',
      'Cuadro clínico: hambre de estatus y dieta de resultados, qué cringe Seguimiento 22, da asco id82, qué cringe.',
      '[nombre], se observa costumbre de reescribir el pasado para proteger el ego, da asco Seguimiento 23, qué vergüenza id83, da asco.',
      'Diagnóstico: hablas de estándares que no aplicas en casa, qué vergüenza Seguimiento 24, ridículo id84, qué vergüenza.',
      '[nombre], patrón de exigir claridad ajena mientras ofreces niebla, ridículo Seguimiento 25, fracasado id85, ridículo.',
      'Informe: tu zona de confort es quejarte del mapa sin caminar, fracasado Seguimiento 26, qué miseria id86, fracasado.',
      '[nombre], síntomas de alguien que necesita público más que plan, qué miseria Seguimiento 27, da grima id87, qué miseria.',
      'Diagnóstico: confundes ser recordado con ser respetado, da grima Seguimiento 28, qué nivel de pena id88, da grima.',
      '[nombre], el expediente marca repetición de los mismos errores con distinta excusa, qué nivel de pena id89, qué nivel de pena.',
      'Informe frío: tu narrativa de esfuerzo no cuadra con la entrega visible, basura Seguimiento 0, qué cutre id90, basura.',
      '[nombre], se detecta alergia al \'no\' y adicción al \'aún no\', qué cutre Seguimiento 1, da pena ajena id91, qué cutre.',
      'Diagnóstico: el yo marketing supera al yo producto, da pena ajena Seguimiento 2, qué vacío id92, da pena ajena.',
      '[nombre], cuadro de intensidad mal invertida, qué vacío Seguimiento 3, indignante id93, qué vacío.',
      'Informe: generas más ruido de gestión que señal de valor, indignante Seguimiento 4, qué flojo id94, indignante.',
      '[nombre], patrón de buscar culpables externos con precisión y culpables internos con niebla, qué flojo id95, qué flojo.',
      'Diagnóstico: tu brújula moral apunta hacia donde duele menos, menudo desastre Seguimiento 6, qué pena id96, menudo desastre.',
      '[nombre], síntomas de vivir a crédito de potencial, qué pena Seguimiento 7, da vergüenza id97, qué pena.',
      'Informe: la autoimagen tiene inflación; el rendimiento no, da vergüenza Seguimiento 8, qué vergüenza ajena id98, da vergüenza.',
      '[nombre], se observa miedo a medir porque medir cierra discusiones a tu favor, qué vergüenza ajena Seguimiento 9, patético id99, qué vergüenza ajena.',
      'Diagnóstico: prefieres ser mal interpretado que mal evaluado con números, patético Seguimiento 10, miserable id100, patético.',
      '[nombre], cuadro de dependencia de la última palabra, miserable Seguimiento 11, qué cringe id101, miserable.',
      'Informe: tu presencia exige energía; no siempre la devuelve, qué cringe Seguimiento 12, da asco id102, qué cringe.',
      '[nombre], patrón de transformar límites ajenos en ofensas personales, da asco Seguimiento 13, qué vergüenza id103, da asco.',
      'Diagnóstico: el archivo del grupo es más honesto que tu monólogo, qué vergüenza Seguimiento 14, ridículo id104, qué vergüenza.',
      '[nombre], síntomas de alguien que colecciona intenciones y exhibe pocas pruebas, ridículo Seguimiento 15, fracasado id105, ridículo.',
      'Informe: hay más teatro de cambio que cambio, fracasado Seguimiento 16, qué miseria id106, fracasado.',
      '[nombre], se detecta hábito de pelear el espejo en vez de lavarlo, qué miseria Seguimiento 17, da grima id107, qué miseria.',
      'Diagnóstico: tu necesidad de ganar la escena supera la de mejorar el script, da grima Seguimiento 18, qué nivel de pena id108, da grima.',
      '[nombre], cuadro clínico de relevancia autoasignada, qué nivel de pena Seguimiento 19, basura id109, qué nivel de pena.',
      'Informe: reaccionas al feedback como a un ataque, no como a un mapa, basura Seguimiento 20, qué cutre id110, basura.',
      '[nombre], patrón de alzar principios solo cuando te convienen, qué cutre Seguimiento 21, da pena ajena id111, qué cutre.',
      'Diagnóstico: el cansancio que generas ya es parte del diagnóstico, da pena ajena Seguimiento 22, qué vacío id112, da pena ajena.',
      '[nombre], síntomas de narrativa de víctima con datos de protagonista del lío, qué vacío Seguimiento 23, indignante id113, qué vacío.',
      'Informe: tu sistema de creencias filtra lo que no te favorece, indignante Seguimiento 24, qué flojo id114, indignante.',
      '[nombre], se observa más lealtad a la pose que a la verdad, qué flojo Seguimiento 25, menudo desastre id115, qué flojo.',
      'Diagnóstico: estás en seguimiento por repetir el mismo ciclo, menudo desastre Seguimiento 26, qué pena id116, menudo desastre.',
      '[nombre], cuadro de quien necesita que el grupo baje el listón, qué pena Seguimiento 27, da vergüenza id117, qué pena.',
      'Informe: la distancia entre lo que dices ser y lo que se ve es el hallazgo principal, da vergüenza Seguimiento 28, qué vergüenza ajena id118, da vergüenza.',
      '[nombre], patrón de buscar atajos de estatus sin km de trabajo, qué vergüenza ajena Seguimiento 29, patético id119, qué vergüenza ajena.',
      'Diagnóstico de [nombre]: priorizas quedar por encima del dato. El dato siempre vuelve, patético Seguimiento 0, miserable id120, patético.',
      '[nombre], informe: tu orgullo gasta más de lo que tu mérito ingresa, miserable Seguimiento 1, qué cringe id121, miserable.',
      'Cuadro clínico: hambre de estatus y dieta de resultados, qué cringe Seguimiento 2, da asco id122, qué cringe.',
      '[nombre], se observa costumbre de reescribir el pasado para proteger el ego, da asco Seguimiento 3, qué vergüenza id123, da asco.',
      'Diagnóstico: hablas de estándares que no aplicas en casa, qué vergüenza Seguimiento 4, ridículo id124, qué vergüenza.',
      '[nombre], patrón de exigir claridad ajena mientras ofreces niebla, ridículo Seguimiento 5, fracasado id125, ridículo.',
      'Informe: tu zona de confort es quejarte del mapa sin caminar, fracasado Seguimiento 6, qué miseria id126, fracasado.',
      '[nombre], síntomas de alguien que necesita público más que plan, qué miseria Seguimiento 7, da grima id127, qué miseria.',
      'Diagnóstico: confundes ser recordado con ser respetado, da grima Seguimiento 8, qué nivel de pena id128, da grima.',
      '[nombre], el expediente marca repetición de los mismos errores con distinta excusa, qué nivel de pena id129, qué nivel de pena.',
      'Informe frío: tu narrativa de esfuerzo no cuadra con la entrega visible, basura Seguimiento 10, qué cutre id130, basura.',
      '[nombre], se detecta alergia al \'no\' y adicción al \'aún no\', qué cutre Seguimiento 11, da pena ajena id131, qué cutre.',
      'Diagnóstico: el yo marketing supera al yo producto, da pena ajena Seguimiento 12, qué vacío id132, da pena ajena.',
      '[nombre], cuadro de intensidad mal invertida, qué vacío Seguimiento 13, indignante id133, qué vacío.',
      'Informe: generas más ruido de gestión que señal de valor, indignante Seguimiento 14, qué flojo id134, indignante.',
      '[nombre], patrón de buscar culpables externos con precisión y culpables internos con niebla, qué flojo id135, qué flojo.',
      'Diagnóstico: tu brújula moral apunta hacia donde duele menos, menudo desastre Seguimiento 16, qué pena id136, menudo desastre.',
      '[nombre], síntomas de vivir a crédito de potencial, qué pena Seguimiento 17, da vergüenza id137, qué pena.',
      'Informe: la autoimagen tiene inflación; el rendimiento no, da vergüenza Seguimiento 18, qué vergüenza ajena id138, da vergüenza.',
      '[nombre], se observa miedo a medir porque medir cierra discusiones a tu favor, qué vergüenza ajena Seguimiento 19, patético id139, qué vergüenza ajena.',
      'Diagnóstico: prefieres ser mal interpretado que mal evaluado con números, patético Seguimiento 20, miserable id140, patético.',
      '[nombre], cuadro de dependencia de la última palabra, miserable Seguimiento 21, qué cringe id141, miserable.',
      'Informe: tu presencia exige energía; no siempre la devuelve, qué cringe Seguimiento 22, da asco id142, qué cringe.',
      '[nombre], patrón de transformar límites ajenos en ofensas personales, da asco Seguimiento 23, qué vergüenza id143, da asco.',
      'Diagnóstico: el archivo del grupo es más honesto que tu monólogo, qué vergüenza Seguimiento 24, ridículo id144, qué vergüenza.',
      '[nombre], síntomas de alguien que colecciona intenciones y exhibe pocas pruebas, ridículo Seguimiento 25, fracasado id145, ridículo.',
      'Informe: hay más teatro de cambio que cambio, fracasado Seguimiento 26, qué miseria id146, fracasado.',
      '[nombre], se detecta hábito de pelear el espejo en vez de lavarlo, qué miseria Seguimiento 27, da grima id147, qué miseria.',
      'Diagnóstico: tu necesidad de ganar la escena supera la de mejorar el script, da grima Seguimiento 28, qué nivel de pena id148, da grima.',
      '[nombre], cuadro clínico de relevancia autoasignada, qué nivel de pena Seguimiento 29, basura id149, qué nivel de pena.',
    ],
    mid: [
      'Diagnóstico intermedio de [nombre]: hay luces y hay sombra. Hoy gana la sombra por poco, ridículo.',
      '[nombre], informe medio: no es catástrofe, tampoco es alta capacidad demostrada, fracasado.',
      'Cuadro mixto: aportas y estorbas según el día. El promedio no emociona, qué miseria Seguimiento recomendado, qué cringe.',
      '[nombre], síntomas leves de pose y ratos de honestidad. Inestable, da grima Seguimiento recomendado, da asco.',
      'Diagnóstico mid: el ego interfiere, pero no domina siempre, qué nivel de pena Seguimiento recomendado, qué vergüenza.',
      '[nombre], se observa margen de mejora grande y prisa de validación, basura Seguimiento recomendado, ridículo.',
      'Informe: ni fuera de juego ni titular indiscutible, qué cutre Seguimiento recomendado, fracasado.',
      '[nombre], patrón intermitente de buen criterio y mal orgullo, da pena ajena Seguimiento recomendado, qué miseria.',
      'Diagnóstico: funcional con picos de drama innecesario, qué vacío Seguimiento recomendado, da grima.',
      '[nombre], la autoimagen está un poco por encima del rendimiento, indignante Seguimiento recomendado, qué nivel de pena.',
      'Diagnóstico intermedio de [nombre]: hay luces y hay sombra. Hoy gana la sombra por poco, qué flojo.',
      '[nombre], informe medio: no es catástrofe, tampoco es alta capacidad demostrada, menudo desastre.',
      'Cuadro mixto: aportas y estorbas según el día. El promedio no emociona, qué pena Seguimiento recomendado, da pena ajena.',
      '[nombre], síntomas leves de pose y ratos de honestidad. Inestable, da vergüenza Seguimiento recomendado, qué vacío.',
      'Diagnóstico mid: el ego interfiere, pero no domina siempre, qué vergüenza ajena Seguimiento recomendado, indignante.',
      '[nombre], se observa margen de mejora grande y prisa de validación, patético Seguimiento recomendado, qué flojo.',
      'Informe: ni fuera de juego ni titular indiscutible, miserable Seguimiento recomendado, menudo desastre.',
      '[nombre], patrón intermitente de buen criterio y mal orgullo, qué cringe Seguimiento recomendado, qué pena.',
      'Diagnóstico: funcional con picos de drama innecesario, da asco Seguimiento recomendado, da vergüenza.',
      '[nombre], la autoimagen está un poco por encima del rendimiento, qué vergüenza Seguimiento recomendado, qué vergüenza ajena.',
      'Diagnóstico intermedio de [nombre]: hay luces y hay sombra. Hoy gana la sombra por poco, ridículo.',
      '[nombre], informe medio: no es catástrofe, tampoco es alta capacidad demostrada, fracasado.',
      'Cuadro mixto: aportas y estorbas según el día. El promedio no emociona, qué miseria Seguimiento recomendado, qué cringe.',
      '[nombre], síntomas leves de pose y ratos de honestidad. Inestable, da grima Seguimiento recomendado, da asco.',
      'Diagnóstico mid: el ego interfiere, pero no domina siempre, qué nivel de pena Seguimiento recomendado, qué vergüenza.',
      '[nombre], se observa margen de mejora grande y prisa de validación, basura Seguimiento recomendado, ridículo.',
      'Informe: ni fuera de juego ni titular indiscutible, qué cutre Seguimiento recomendado, fracasado.',
      '[nombre], patrón intermitente de buen criterio y mal orgullo, da pena ajena Seguimiento recomendado, qué miseria.',
      'Diagnóstico: funcional con picos de drama innecesario, qué vacío Seguimiento recomendado, da grima.',
      '[nombre], la autoimagen está un poco por encima del rendimiento, indignante Seguimiento recomendado, qué nivel de pena.',
      'Diagnóstico intermedio de [nombre]: hay luces y hay sombra. Hoy gana la sombra por poco, qué flojo.',
      '[nombre], informe medio: no es catástrofe, tampoco es alta capacidad demostrada, menudo desastre.',
      'Cuadro mixto: aportas y estorbas según el día. El promedio no emociona, qué pena Seguimiento recomendado, da pena ajena.',
      '[nombre], síntomas leves de pose y ratos de honestidad. Inestable, da vergüenza Seguimiento recomendado, qué vacío.',
      'Diagnóstico mid: el ego interfiere, pero no domina siempre, qué vergüenza ajena Seguimiento recomendado, indignante.',
      '[nombre], se observa margen de mejora grande y prisa de validación, patético Seguimiento recomendado, qué flojo.',
      'Informe: ni fuera de juego ni titular indiscutible, miserable Seguimiento recomendado, menudo desastre.',
      '[nombre], patrón intermitente de buen criterio y mal orgullo, qué cringe Seguimiento recomendado, qué pena.',
      'Diagnóstico: funcional con picos de drama innecesario, da asco Seguimiento recomendado, da vergüenza.',
      '[nombre], la autoimagen está un poco por encima del rendimiento, qué vergüenza Seguimiento recomendado, qué vergüenza ajena.',
      'Diagnóstico intermedio de [nombre]: hay luces y hay sombra. Hoy gana la sombra por poco, ridículo.',
      '[nombre], informe medio: no es catástrofe, tampoco es alta capacidad demostrada, fracasado.',
      'Cuadro mixto: aportas y estorbas según el día. El promedio no emociona, qué miseria Seguimiento recomendado, qué cringe.',
      '[nombre], síntomas leves de pose y ratos de honestidad. Inestable, da grima Seguimiento recomendado, da asco.',
      'Diagnóstico mid: el ego interfiere, pero no domina siempre, qué nivel de pena Seguimiento recomendado, qué vergüenza.',
      '[nombre], se observa margen de mejora grande y prisa de validación, basura Seguimiento recomendado, ridículo.',
      'Informe: ni fuera de juego ni titular indiscutible, qué cutre Seguimiento recomendado, fracasado.',
      '[nombre], patrón intermitente de buen criterio y mal orgullo, da pena ajena Seguimiento recomendado, qué miseria.',
      'Diagnóstico: funcional con picos de drama innecesario, qué vacío Seguimiento recomendado, da grima.',
      '[nombre], la autoimagen está un poco por encima del rendimiento, indignante Seguimiento recomendado, qué nivel de pena.',
    ],
    low: [
      'Diagnóstico suave de [nombre]: hoy el informe no sale rojo. Hay base usable Sin drama extra.',
      '[nombre], cuadro estable. Sin alarmas graves en esta tirada Sin drama extra.',
      'Informe bajo de gravedad: desajustes menores, nada de portada Sin drama extra.',
      '[nombre], síntomas leves o ausentes. El espejo no está roto hoy Sin drama extra.',
      'Diagnóstico: funcional. El ego no está secuestrando el criterio Sin drama extra.',
      '[nombre], lectura limpia. Poco que amplificar en modo roast Sin drama extra.',
      'Informe: sin patrón grave detectado en este corte Sin drama extra.',
      '[nombre], alta relativa de lucidez. Se nota la diferencia Sin drama extra.',
      'Diagnóstico light: mantén el hábito de mirar el dato Sin drama extra.',
      '[nombre], el expediente hoy está en rango aceptable Sin drama extra.',
      'Diagnóstico suave de [nombre]: hoy el informe no sale rojo. Hay base usable Sin drama extra.',
      '[nombre], cuadro estable. Sin alarmas graves en esta tirada Sin drama extra.',
      'Informe bajo de gravedad: desajustes menores, nada de portada Sin drama extra.',
      '[nombre], síntomas leves o ausentes. El espejo no está roto hoy Sin drama extra.',
      'Diagnóstico: funcional. El ego no está secuestrando el criterio Sin drama extra.',
      '[nombre], lectura limpia. Poco que amplificar en modo roast Sin drama extra.',
      'Informe: sin patrón grave detectado en este corte Sin drama extra.',
      '[nombre], alta relativa de lucidez. Se nota la diferencia Sin drama extra.',
      'Diagnóstico light: mantén el hábito de mirar el dato Sin drama extra.',
      '[nombre], el expediente hoy está en rango aceptable Sin drama extra.',
      'Diagnóstico suave de [nombre]: hoy el informe no sale rojo. Hay base usable Sin drama extra.',
      '[nombre], cuadro estable. Sin alarmas graves en esta tirada Sin drama extra.',
      'Informe bajo de gravedad: desajustes menores, nada de portada Sin drama extra.',
      '[nombre], síntomas leves o ausentes. El espejo no está roto hoy Sin drama extra.',
      'Diagnóstico: funcional. El ego no está secuestrando el criterio Sin drama extra.',
      '[nombre], lectura limpia. Poco que amplificar en modo roast Sin drama extra.',
      'Informe: sin patrón grave detectado en este corte Sin drama extra.',
      '[nombre], alta relativa de lucidez. Se nota la diferencia Sin drama extra.',
      'Diagnóstico light: mantén el hábito de mirar el dato Sin drama extra.',
      '[nombre], el expediente hoy está en rango aceptable Sin drama extra.',
      'Diagnóstico suave de [nombre]: hoy el informe no sale rojo. Hay base usable Sin drama extra.',
      '[nombre], cuadro estable. Sin alarmas graves en esta tirada Sin drama extra.',
      'Informe bajo de gravedad: desajustes menores, nada de portada Sin drama extra.',
      '[nombre], síntomas leves o ausentes. El espejo no está roto hoy Sin drama extra.',
      'Diagnóstico: funcional. El ego no está secuestrando el criterio Sin drama extra.',
      '[nombre], lectura limpia. Poco que amplificar en modo roast Sin drama extra.',
      'Informe: sin patrón grave detectado en este corte Sin drama extra.',
      '[nombre], alta relativa de lucidez. Se nota la diferencia Sin drama extra.',
      'Diagnóstico light: mantén el hábito de mirar el dato Sin drama extra.',
      '[nombre], el expediente hoy está en rango aceptable Sin drama extra.',
      'Diagnóstico suave de [nombre]: hoy el informe no sale rojo. Hay base usable Sin drama extra.',
      '[nombre], cuadro estable. Sin alarmas graves en esta tirada Sin drama extra.',
      'Informe bajo de gravedad: desajustes menores, nada de portada Sin drama extra.',
      '[nombre], síntomas leves o ausentes. El espejo no está roto hoy Sin drama extra.',
      'Diagnóstico: funcional. El ego no está secuestrando el criterio Sin drama extra.',
      '[nombre], lectura limpia. Poco que amplificar en modo roast Sin drama extra.',
      'Informe: sin patrón grave detectado en este corte Sin drama extra.',
      '[nombre], alta relativa de lucidez. Se nota la diferencia Sin drama extra.',
      'Diagnóstico light: mantén el hábito de mirar el dato Sin drama extra.',
      '[nombre], el expediente hoy está en rango aceptable Sin drama extra.',
    ],
  }
};

async function runPercent(sock, msg, key, groupMeta) {
  const jid = msg.key.remoteJid;
  const cfg = LABELS[key];
  if (!cfg) return;

  const target = getTargetOrSelf(msg);
  // El % se basa en el ROL DEL TARGET, no del sender
  const targetIsOwner = isOwner(target, false, groupMeta);
  const targetIsAdmin = isAdmin(groupMeta?.participants, target);

  let percent = cfg.roll
    ? cfg.roll(targetIsOwner, targetIsAdmin)
    : rollPercent(cfg.goodIsHigh, targetIsAdmin, targetIsOwner);

  // Si el target es el owner principal, se fuerza el valor dentro de la franja
  // que le favorece ANTES de elegir el tier/frase, de modo que la frase
  // concuerde con el % mostrado. Al ser una franja y no un valor fijo, el
  // resultado cambia en cada tirada y no se nota el amaño.
  if (isMainOwner(target, false, groupMeta) && key in OWNER_FORCE) {
    percent = rollRange(OWNER_FORCE[key]);
  }

  const tier = percent >= 70 ? 'high' : percent <= 30 ? 'low' : 'mid';
  const nm = `@${target.split('@')[0]}`;
  // Algunos rasgos (perdedor/ganador) traen [nombre] embebido en la frase; el
  // resto no lo usa, así que el replace es un no-op para ellos.
  const verdict = pickFresh(cfg[tier], `${jid}|${key}|${tier}`).replace(/\[nombre\]/g, nm);
  const showExtreme = cfg.goodIsHigh && percent >= 70 && cfg.extreme?.length;

  const text =
    `*${nm} es ${percent}% ${cfg.name}*\n\n` +
    `${verdict}` +
    (showExtreme ? `\n\n${pickFresh(cfg.extreme, `${jid}|${key}|extreme`).replace(/\[nombre\]/g, nm)}` : '');

  await sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
}

const makeCmd = (key) => (sock, msg, groupMeta) => runPercent(sock, msg, key, groupMeta);

module.exports = {
  // Se exporta para que !rizz use EXACTAMENTE la misma distribucion que el resto
  // del bot. Tenia la suya propia, plana de 0 a 100, y por eso a los miembros les
  // salian porcentajes altisimos: en una uniforme, tres de cada diez tiradas
  // pasan de 70. El sesgo del bot no es un detalle estetico, es la regla.
  rollPercent,
  cmdIncel:         makeCmd('incel'),
  cmdLinda:         makeCmd('linda'),
  cmdFea:           makeCmd('fea'),
  cmdGay:           makeCmd('gay'),
  cmdSimp:          makeCmd('simp'),
  cmdHot:           makeCmd('sexy'),
  cmdRata:          makeCmd('rata'),
  cmdMaricon:       makeCmd('maricon'),
  cmdFriki:         makeCmd('friki'),
  cmdCrack:         makeCmd('crack'),
  cmdCerdo:         makeCmd('cerdo'),
  cmdFeminidad:     makeCmd('feminidad'),
  cmdMasculinidad:  makeCmd('masculinidad'),
  cmdInutil:        makeCmd('inutil'),
  cmdFemboy:        makeCmd('femboy'),
  cmdPerdedor:      makeCmd('perdedor'),
  cmdGanador:       makeCmd('ganador'),
  cmdPuta:          makeCmd('puta'),
  cmdGuarra:        makeCmd('guarra'),
  cmdFiel:          makeCmd('fiel'),
  cmdInfiel:        makeCmd('infiel'),
  cmdDelulu:        makeCmd('delulu'),
  cmdDiagnostico:   makeCmd('diagnostico'),
};
