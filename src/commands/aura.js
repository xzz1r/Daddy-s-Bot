const { isOwner, isMainOwner, isAdmin, getTarget, getSender, canonicalJid, sameUser, soloMiembros } = require('../utils/wa');
const { pickFresh, fmt } = require('../utils/helpers');
const { getAura, addAura, getAuraRanking } = require('../utils/auraStore');

const ROLL_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes per user per group
const lastRoll = new Map(); // `${groupJid}|${canonicalJid}` -> timestamp

// Aura roll. Owner 60/40, admin 55/45, member 50/50.
// Members were previously 30/70 — far too punishing for regular use.
function rollAura(targetIsOwner, targetIsAdmin) {
  const r = Math.random();
  // Escala comprimida: una tirada mueve decenas, no miles. Con el arranque en
  // 100 y un "millonario" del grupo en ~10.000, una tirada grande pesa lo que
  // debe pesar sin descompensar el marcador de un solo golpe.
  const big   = () => (25 + Math.floor(Math.random() * 26)) * 10;  // 250..500
  const small = () => ( 5 + Math.floor(Math.random() * 16)) * 10;  // 50..200

  if (targetIsOwner) {
    // 60% positive, 40% negative.
    if (r < 0.35) return { tier: 'blessed', amount: big() };
    if (r < 0.60) return { tier: 'gain',    amount: small() };
    if (r < 0.85) return { tier: 'loss',    amount: -small() };
    return { tier: 'cursed', amount: -big() };
  }
  if (targetIsAdmin) {
    // 55% positive, 45% negative.
    if (r < 0.25) return { tier: 'blessed', amount: big() };
    if (r < 0.55) return { tier: 'gain',    amount: small() };
    if (r < 0.83) return { tier: 'loss',    amount: -small() };
    return { tier: 'cursed', amount: -big() };
  }
  // member — 45% positive, 55% negative.
  if (r < 0.18) return { tier: 'blessed', amount: big() };
  if (r < 0.45) return { tier: 'gain',    amount: small() };
  if (r < 0.78) return { tier: 'loss',    amount: -small() };
  return { tier: 'cursed', amount: -big() };
}

const AURA = {
  blessed: [
    'Entraste, miraste a la nada, y el grupo entero se cagó de respeto. Aura de depredador alfa.',
    'No dijiste ni una palabra y silenciaste a cuatro bocazas de golpe. Eso es dominio puro.',
    'Hiciste algo tan frío que hasta el que te odia tuvo que tragarse el orgullo. Aura máxima.',
    'Esta movida se va a contar en el grupo durante años. Acabas de ascender a otra liga.',
    'Caminaste sin mirar atrás mientras todo ardía detrás de ti. Aura de villano de película.',
    'Nadie entiende cómo lo hiciste y ese es justo el punto. Aura de leyenda inalcanzable.',
    'Una sola frase y dejaste a tres personas reescribiendo su autoestima. Poder absoluto.',
    'Tu aura ahora mismo da miedo. La gente baja la voz cuando apareces y tú ni te enteras.',
    'Convertiste una situación normal en una escena épica sin despeinarte. Aura de protagonista.',
    'Te quedaste de hielo mientras todos perdían la cabeza. El grupo te miró como a un dios.',
    'Eso fue tan limpio que deberían enseñarlo en la universidad. Aura por las nubes.',
    'Apareciste, dijiste lo justo, te fuiste. Maestría que el resto solo puede envidiar.',
    'La frialdad con la que lo hiciste congeló el chat en seco. Respeto total e involuntario.',
    'Generaste una leyenda urbana en tiempo real. Aura infinita, sin techo, imparable.',
    'Ni pestañeaste. Y por eso mismo ahora todos quieren ser tú. Aura demoledora.',
    'El silencio que dejaste vale más que mil mensajes de los demás juntos. Otro nivel.',
    'Hiciste que el grupo entero pareciera amateur sin mover un dedo. Mog social absoluto.',
    'Esto va directo al hall de la fama. Aura máxima histórica, sin asterisco.',
    'Cerraste la boca a todos sin abrir la tuya. Aura de leyenda viva y caminante.',
    'Lo que hiciste no tiene explicación racional. El grupo solo puede arrodillarse.',
    'Te fuiste antes de que terminaran de procesarlo. Aura de fantasma con clase.',
    'Hasta tu peor enemigo tuvo que escribir "respeto" en el chat. Eso no pasa nunca.',
    'Dejaste a todos en visto y aun así ganaste el round. Frialdad de campeón mundial.',
    'Redefiniste lo que significa tener clase en este grupo. Aura suprema indiscutible.',
    'Una mirada y desactivaste tres egos a la vez. Aura quirúrgica, precisión letal.',
    'El chat tembló y tú ni te inmutaste. Aura de hielo puro, sangre fría total.',
    'Lo hiciste ver tan fácil que ahora todos se sienten inútiles. Y tienen razón.',
    'Te convertiste en el tema del que todos van a hablar mañana. Aura histórica.',
    'Pasaste por encima de la situación como si no existiera. Aura imparable, rodillo.',
    'Sin un mensaje, sin una explicación, solo dominio absoluto. El grupo enmudeció.',
    'Todos guardaron silencio solo para verte actuar. Aura de respeto reverencial.',
    'Hiciste que el resto reconsiderara toda su existencia en directo. Aura aplastante.',
    'Frialdad de manual. Te miraron y entendieron que no juegan en tu liga.',
    'Tan limpio que ni dejaste huellas. Aura de profesional que el grupo no merece.',
    'Subiste de nivel delante de todos y nadie pudo ni seguirte el polvo. Legendario.',
    'Tu calma en pleno caos fue la verdadera ejecución. Aura de otro planeta.',
    'Hiciste algo tan limpio que el grupo entero se quedó con cara de estar viendo otra liga. Aura de otro planeta.',
    'Ni te esforzaste y ya dejaste a tres personas replanteándose su existencia. Dominio absoluto.',
    'Apareciste en el peor momento posible y saliste siendo el mejor de la sala. Aura quirúrgica.',
    'Lo tuyo hoy no fue suerte, fue oficio. El grupo aplaudió por dentro y calló por fuera.',
    'Convertiste una situación de mierda en tu mejor momento del mes. Eso no se enseña en ningún lado.',
    'Te callaste justo cuando había que callarse y ganaste todo. Aura de estratega frío.',
    'El grupo entero cambió de tema porque nadie quería competir contigo hoy. Poder puro.',
    'Hiciste el ridículo imposible: quedar bien sin intentarlo. Aura por las nubes y de gratis.',
    'Alguien intentó humillarte y acabó pidiendo perdón sin saber por qué. Aura de depredador.',
    'Saliste de una encerrona con más respeto del que entraste. Eso es tener oficio, no suerte.',
    'Dijiste una frase y tres conversaciones distintas se pararon a leerla. Aura demoledora.',
    'El grupo te estaba esperando para reírse y acabó tomando apuntes. Vuelco total del guion.',
    'Aura máxima. Hiciste lo correcto en el peor momento y encima quedó elegante.',
    'Te subestimaron por última vez. Hoy quedó claro para todos y nadie va a repetir el error.',
    'Cerraste una discusión sin levantar la voz. El resto grita y tú simplemente ganas.',
    'Aura de leyenda. Lo que hiciste va a citarse mal durante meses, que es la mayor gloria.',
    'Ni te enteraste de que estabas ganando y ya habías ganado. Ese es el nivel real.',
    'Hiciste que el más chulo del grupo se pusiera a la defensiva con una sola línea.',
    'Aura brutal. Te miraron esperando un fallo y les regalaste una clase magistral.',
    'El grupo entero se calló y no fue por educación, fue por respeto. Cosa rarísima aquí.',
    'Lo tuyo hoy fue frialdad de manual. Los demás se acaloraron y tú saliste intacto.',
    'Aura de villano bien escrito: nadie te quiere del todo y todos te siguen mirando.',
    'Hiciste lo que nadie se atrevía y encima quedó bien. Doble mérito, doble aura.',
    'Te tendieron una trampa y la usaste de trampolín. Aura de quien juega otro deporte.',
    'Aura máxima confirmada. El grupo va a recordar esto más de lo que tú vas a recordarlo.',
  ],
  gain: [
    'Movida sólida. Sumaste aura sin hacer ruido, como los que de verdad saben.',
    'Bien jugado. Pequeño pero quirúrgico, el grupo lo registró en silencio.',
    'Te llevas puntos con eso. No épico, pero más de lo que el grupo esperaba de ti.',
    'Detalle con clase. Tu aura sube un escalón y alguien tomó nota.',
    'Correcto y con filo. Aura en alza, aprovéchala antes de cagarla.',
    'Bien medido. Te llevas tu aura merecida sin tener que rogar.',
    'Sin pasarte, sin quedarte corto. Suma justa para alguien de tu nivel.',
    'Buena lectura del momento. El aura lo agradece y el grupo también.',
    'Discreto pero letal. Así se construye reputación, no a base de ruido.',
    'Te ganaste el asentimiento silencioso del grupo. Para ti eso ya es mucho.',
    'Nada espectacular, pero nadie te puede quitar estos puntos. Disfrútalos.',
    'Jugada limpia. El aura sube despacio, que es como sube la de los que aguantan.',
    'Bien ahí. Pequeña victoria, pero victoria, que ya es raro en ti.',
    'Sumaste sin drama. La forma más digna de ganar aura que has tenido en meses.',
    'Aprobado con nota. El aura te sonríe hoy, no te acostumbres.',
    'Movimiento correcto. Nada que presumir, pero por una vez nada que lamentar.',
    'Te llevas el visto bueno del grupo, aunque sea sin entusiasmo. Mejor eso que nada.',
    'Cumpliste. El aura te paga lo justo y ni un punto más, porque más no diste.',
    'Pequeño acierto. Lo justo para no hacer el ridículo hoy. Milagro.',
    'Bien medido. Te llevas tu trocito de aura sin que nadie te lo discuta.',
    'Nada del otro mundo, pero el aura lo cuenta a tu favor por esta vez.',
    'Te ganaste un punto de respeto silencioso. Sujétalo fuerte que dura poco.',
    'Acierto modesto. El aura sube lo justo para que se note que sigues vivo.',
    'Jugada decente. Ni aplausos ni abucheos, solo un raro avance tuyo.',
    'Sumaste sin hacerte notar. Tu estilo natural: pasar desapercibido ganando.',
    'Pequeño paso al frente. El aura lo registra y pasa página rápido.',
    'Correcto sin brillar. Tu marca personal. Aun así, suma es suma.',
    'Te llevas unos puntos honestos. Nadie te los discute porque a nadie le importas tanto.',
    'Buen detalle. El aura te lo reconoce a media voz para no hacerte ilusiones.',
    'Avance discreto. El grupo asiente y olvida tu nombre en cinco minutos.',
    'Pequeña ganancia limpia. Hoy el aura no te castiga. Hoy.',
    'Sólido sin más. El aura te deja seguir en positivo por pura compasión.',
    'Acierto de los que no se celebran pero se agradecen. Justo tu techo.',
    'Bien jugado. Nada épico, pero por una vez no diste vergüenza. El aura lo agradece.',
    'Sumaste sin llamar la atención, que es exactamente tu techo y hoy lo tocaste.',
    'Acierto discreto. El grupo lo notó a medias y te lo cuenta como bueno igual.',
    'Pequeño mérito real. No cambia nada, pero es tuyo y nadie te lo discute.',
    'Hiciste lo mínimo con estilo. El aura premia el estilo aunque el mínimo siga siendo mínimo.',
    'Movimiento correcto. Ni brillante ni ridículo: justo el punto medio que dominas.',
    'Sumaste puntos por sentido común, que en este grupo ya es una habilidad rara.',
    'Bien ahí. El aura sube un peldaño y tú ni te das cuenta, como siempre.',
    'Acierto honesto. No lo vas a poder presumir, pero cuenta igual en el marcador.',
    'Cumpliste sin drama. Es poco, pero comparado con lo tuyo habitual es una fiesta.',
    'Ganancia limpia. El grupo asiente y sigue a lo suyo. Tu momento duró dos segundos.',
    'Pequeña victoria. Guárdala, que a este ritmo la siguiente tarda en llegar.',
    'Sumaste por no cagarla, que técnicamente cuenta como mérito en tu caso.',
    'Buen detalle. El aura lo registra sin entusiasmo pero sin objeciones.',
    'Avance discreto. Nadie va a hablar de esto mañana, pero hoy suma y con eso basta.',
    'Acierto de perfil bajo. Justo tu estilo: ganar sin que nadie se entere ni le importe.',
    'Sumaste algo real por una vez. Anótalo en algún sitio, que no pasa a menudo.',
    'Correcto y sin brillo. El aura te paga lo justo porque diste exactamente lo justo.',
    'Ganancia modesta. Suficiente para no bajar, insuficiente para que alguien lo comente.',
    'Bien medido. El aura sube despacio, como suben las cosas de los que aguantan.',
    'Pequeño paso adelante. En tu caso, cualquier paso adelante ya es noticia.',
    'Acierto tranquilo. Ni ovación ni abucheo: el silencio neutro que tanto te pega.',
    'Sumaste. Poco, pero sumaste, y en este grupo eso ya te pone por encima de la mitad.',
    'Movida decente. El aura lo cuenta a tu favor y pasa página en cinco segundos.',
    'Ganancia justa. Diste lo mínimo aceptable y el marcador te lo reconoce a regañadientes.',
  ],
  loss: [
    'Perdiste aura sin que nadie te atacara. Hace falta un don especial para perder un partido en el que eras el único equipo, y tú lo tienes: campeón mundial del autogol.',
    'El aura te restó con la misma ternura con la que un cajero te cierra la caja en la cara: sin mirarte y deseando que te largues. El siguiente, por favor.',
    'Tu aura tiene la solidez de una silla de plástico de gasolinera: te confiaste, te apoyaste, y crac, al suelo delante de todos. Era de esperar, manco.',
    'Bajón de aura por causas exclusivamente tuyas. Como siempre: el problema lo traes de casa, lo montas tú y encima cobras entrada para que el grupo lo vea.',
    'Restaste aura tú solito. Eres el único ser capaz de tropezar con un bordillo que llevabas media hora mirando. Talento puro, lástima que para el desastre.',
    'El aura te pasó la factura y ni la discutiste, porque en el fondo sabías que era justa. Primera cosa lúcida que haces hoy: asumir que la cagaste, fracasado.',
    'Perdiste puntos con una naturalidad que asusta. Para ti fracasar no es un evento, es el estado de fábrica, como el wifi de tu casa: malo, lento y constante.',
    'Tu aura baja y el grupo ni levanta la vista. Ya eres ruido de fondo, el goteo de un grifo que nadie arregla porque total, siempre ha estado ahí jodiendo.',
    'Metiste la pata con precisión quirúrgica, pero al revés: lo tenías todo para que saliera bien y aun así encontraste la única forma posible de arruinarlo.',
    'El aura te resta y suspira. Ya ni se enfada contigo, perdedor; le das la misma pereza que los platos de anoche que sigues sin fregar.',
    'Bajón merecido. No fue mala suerte: la mala suerte al menos es aleatoria. Lo tuyo es un patrón que cualquier analista predeciría con los ojos cerrados.',
    'Perdiste aura por abrir la boca antes de encender el cerebro. Llevas ese orden invertido de fábrica y ya no hay actualización que lo arregle, bocazas.',
    'Tu aura cayó como tus propósitos de año nuevo: rápido, en silencio y sin que nadie te pidiera explicaciones, porque nadie esperaba otra cosa de ti.',
    'Restaste puntos en una jugada que un crío de seis años habría leído. Claro que el crío tiene algo que a ti se te quedó pendiente para siempre: futuro.',
    'El aura te penaliza y lo más triste es la cara de sorpresa que pones. ¿En serio todavía te sorprende? Llevas perdiendo desde antes de tener datos móviles.',
    'Bajón. Tu aura es como una planta regada con refresco: te esfuerzas, parece que haces algo, y aun así se muere por tu culpa con dedicación.',
    'Perdiste lo justo para recordarte que existes, que es tu única función en el grupo: servir de marcador de hasta dónde se puede caer sin tocar fondo.',
    'Tu aura se desinfló sola, sin pinchazo, como un globo de cumpleaños al tercer día. Triste, arrugado y sin nadie con ganas de volver a inflarte.',
    'Restaste puntos y el aura ni dramatiza. Para drama ya tienes tu vida entera; esto es solo el resumen ejecutivo en números rojos, fracasado.',
    'El aura te cobró el peaje del ridículo: caro, en efectivo y sin devolución. Igual que cada decisión que tomas desde que tienes uso de razón, o casi.',
    'Bajón de manual. Lo tuyo ya no es resbalar, es que el suelo te ve venir y se aparta para que te des de lleno. Hasta la física te coge manía.',
    'Perdiste aura intentando parecer listo. Es como verte de puntillas para alcanzar un techo que está en otra planta: el esfuerzo enternece, el resultado da pena.',
    'Tu aura baja otro escalón hacia el sótano donde guardas el resto de tu autoestima. Tranquilo, ahí abajo tienes compañía: el polvo y tus excusas.',
    'Restaste puntos y ni notaste el momento exacto, como no notas nada. Vives en modo espectador de tu propio desastre, con palomitas y todo, idiota.',
    'El aura te resta con la frialdad de un informe médico: sin maldad, solo constatando un deterioro que viene de lejos y no tiene tratamiento, perdedor.',
    'Bajón. Eres de los que se caen solos en una habitación vacía y luego miran alrededor a ver quién los empujó. Spoiler: nadie. Eres tú. Siempre tú.',
    'Perdiste aura como pierdes las conversaciones: hablando mucho, aportando nada y dejando a todos esperando a que te calles de una puta vez.',
    'Tu aura se fue por el desagüe con un gluglú casi cómico. Lo más gracioso que has producido en semanas, y ni siquiera fue a propósito.',
    'Restaste en directo. El grupo ya no se ríe, hace esa mueca de cuando alguien tropieza y te da más vergüenza que pena. Esa eres tú en formato gráfico.',
    'El aura te baja y se acabó el misterio: no es la racha, no es el día, no es Mercurio retrógrado. Eres tú, en estado puro, funcionando como de costumbre.',
    'Bajón de los que ni se discuten. Perdiste con la misma elegancia con la que entras al grupo: sin avisar, sin aportar y dejando peor ambiente del que había.',
    'Perdiste aura y la cifra es pequeña solo porque ya no te quedaba mucho que perder. Hasta para arruinarte eres de bajo presupuesto, fracasado.',
    'Tu aura cae y la de los demás ni se entera, porque al grupo le importas lo que un capítulo de relleno: pasa, no aporta y nadie lo comenta.',
    'La cagaste con una naturalidad preocupante. El aura baja y nadie sale a defenderte.',
    'Pequeño desastre. Ni siquiera fue épico: fue de esos fallos aburridos que solo dan pena.',
    'Perdiste aura por hablar cuando tocaba callarse. Otra vez. Como todas las veces.',
    'Hiciste el ridículo a media potencia. Ni para eso llegas al máximo.',
    'El aura baja y el grupo ni comenta. Hasta tus fallos son irrelevantes, que tiene mérito.',
    'Metiste la pata en algo tan fácil que cuesta explicarlo sin reírse. Baja el marcador.',
    'Pérdida limpia. Te equivocaste solo, sin ayuda y sin presión. Todo mérito tuyo.',
    'El aura te castiga por algo que sabías que estaba mal. Lo hiciste igual, claro.',
    'Bajas puestos por insistir donde nadie te llamaba. Un clásico de tu repertorio.',
    'Fallo tonto y caro. La combinación que mejor te define en este grupo.',
    'Perdiste aura y ni te enteraste. Vas a leer esto y seguir sin entender qué hiciste.',
    'El aura baja. Tranquilo, desde donde estás la caída es corta y ya la conoces.',
    'Error de novato con años de experiencia. Eso ya no es fallar, es una firma personal.',
    'Pérdida merecida. Nadie te empujó: te tiraste tú solo, con impulso y todo.',
    'Bajas un escalón. Buenas noticias: quedan pocos escalones por debajo, así que descansas.',
    'La cagaste en público y encima sin gracia. Al menos las cagadas divertidas se perdonan.',
    'El aura te resta por pesado. Había una salida elegante y elegiste la otra.',
    'Fallo de manual. Si hubiera un manual de cómo no hacer las cosas, saldrías en la portada.',
    'Pérdida sin drama. Ni siquiera diste el espectáculo: fallaste en silencio y bajaste igual.',
    'El aura baja porque hiciste exactamente lo que todos esperaban que hicieras mal.',
    'Retrocediste solo. En un grupo lleno de gente dispuesta a hundirte, te bastaste tú.',
    'Error caro y evitable. El aura te lo cobra sin mirarte a la cara, como se cobra a los pesados.',
    'Bajas puestos por confiado. La confianza sin base se paga, y hoy pagaste al contado.',
    'El aura resta. Y lo peor es que mañana vas a repetirlo exactamente igual.',
    'Fallo previsible. Tan previsible que hasta el bot lo veía venir tres mensajes antes.',
  ],
  spiral: [
    'Aura negativa y cavando hacia abajo con pala propia. Eres el único minero que se excava su tumba y encima se queja de que nadie le tira una cuerda.',
    'En rojo y bajando. Tu aura cotiza como esas criptos que iban a cambiarte la vida: hype, caída libre y un gráfico que solo conoce una dirección.',
    'Sigues perdiendo en negativo, que tiene mérito: es como ahogarte en una piscina que vaciaste tú mismo. Constancia admirable, aplicada al desastre.',
    'Tu aura tocó fondo, pidió un préstamo y siguió bajando. Ya no eres pobre de aura, eres un agujero negro: absorbes puntos y no devuelves nada.',
    'Caída libre documentada. A este ritmo vas a necesitar un sótano debajo del sótano, y cuando lo encuentres, descuida, también lo vas a perder.',
    'En negativo y reincidente. Definición de locura: repetir lo mismo esperando otro resultado. Definición de ti: hacerlo además sonriendo, sin enterarte de nada.',
    'Tu aura está tan abajo que la palabra "fondo" te queda de techo. Sigue, sigue, que ahí abajo siempre hay sitio para uno más como tú, perdedor.',
    'Espiral de la muerte en directo. El grupo ya no apuesta por tu recuperación, apuesta por cuánto tardas en batir tu propio récord de patetismo. Las cuotas son malas.',
    'Sigues en rojo y cada tirada es una carta de amor al fracaso. El aura ya te tiene en su lista de clientes vip de la ruina, con tarjeta dorada y todo.',
    'Negativo sobre negativo. Eres la prueba de que se puede llegar tarde hasta al fondo: cuando crees que tocaste, descubres que era solo un descansillo.',
    'Tu aura va camino del centro de la Tierra y el grupo solo se asoma de vez en cuando para confirmar que sí, sigues bajando. Hipnótico de lo predecible.',
    'En caída y sin paracaídas, porque lo vendiste para cubrir la pérdida anterior. Tu gestión del aura es digna de un curso de qué-no-hacer-jamás.',
    'Espiral confirmada. Lo tuyo ya no es mala suerte ni mal día: es una suscripción mensual al ridículo que renuevas tú solito, sin que nadie te obligue.',
    'Bajas tan rápido que el aura ni alcanza a actualizar el marcador. Eres el único capaz de hacer que un número se rinda antes que tú, fracasado.',
    'Negativo histórico y sumando. Si el patetismo cotizara serías millonario; como cotiza el aura, eres exactamente lo contrario: basura en quiebra técnica.',
    'Sigues hundiéndote y el aura ni se inmuta, como el médico que ve la radiografía y directamente llama a la familia. Ya no hay nada que hacer contigo.',
    'Tu aura en rojo es patrimonio cultural del grupo. Te ponen de ejemplo a los nuevos: "no acabéis como ese", señalándote a ti, en directo y sin anestesia.',
    'Caída libre con estilo propio: el de quien se rinde pero sigue jugando. Lo más absurdo que existe. Ni ganas ni te retiras. Solo molestas, perdedor.',
    'En negativo y profundizando, como tus problemas: nunca se resuelven, solo se acumulan en capas igual que el aura que pierdes. Arqueología del fracaso.',
    'Sigues cayendo y ya ni el grupo mira. Aburres hasta en la desgracia.',
    'Otra bajada. A esto ya no se le llama mala racha, se le llama estado natural.',
    'La caída lleva tanto tiempo que el marcador debería cobrarte alquiler por el sótano.',
    'Vas hacia abajo con una constancia que en otra cosa te habría hecho millonario.',
    'Nueva pérdida. Ya no es que te vaya mal: es que te va exactamente como te tiene que ir.',
    'Sigues bajando y encima con confianza. Esa mezcla es la que te trajo hasta aquí.',
    'Otra vez abajo. El grupo dejó de sorprenderse hace bastantes semanas.',
    'La espiral continúa. Tienes menos aura y la misma cantidad de excusas de siempre.',
    'Bajas otra vez. Nadie te empuja, tú solo aceleras y encima sin frenos.',
    'Caída sostenida. Vas camino de un récord que nadie va a querer batir jamás.',
    'Sigues cavando. En algún momento habrá que decirte que el fondo ya lo pasaste.',
    'Otro escalón hacia abajo. El sótano ya te reconoce y te saluda por el nombre.',
    'La bajada es tan constante que podría usarse para calibrar relojes. Impresionante y triste.',
    'Sigues perdiendo. Y lo peor es la naturalidad con la que ya lo asumes.',
    'Nueva pérdida encadenada. El marcador ya no reacciona, solo actualiza y suspira.',
    'Caes otra vez y ni haces ruido al aterrizar. Ya no queda desde dónde caer fuerte.',
    'La espiral sigue. A este ritmo vas a tener que pedir permiso para seguir bajando.',
    'Otra bajada más. Tu historial parece un tobogán y tú sigues subiendo las escaleras para tirarte.',
    'Sigues en caída libre. Lo único constante en tu vida y encima es esto.',
    'Nueva pérdida. El grupo ya no comenta tus caídas igual que no comenta la gravedad.',
  ],
  cursed: [
    'Acabas de perder un pastón de aura en directo. El desastre fue tan limpio que el grupo no supo si abuchear o aplaudir. Un Titanic, pero tú eres a la vez el barco y el iceberg.',
    'Catástrofe de aura con público. Tu marcador se desplomó como un suflé al que abren el horno antes de tiempo: rápido, irreversible y con cara de "lo veía venir" en todos menos en ti.',
    'Perdiste toda tu aura de golpe. El silencio que dejaste no fue de respeto, fue el de cuando alguien rueda por las escaleras y todos esperan a ver si se levanta. No te levantaste.',
    'Hundimiento total. Tu aura no bajó, hizo implosión, como esos edificios que demuelen con dinamita: planificado, espectacular y con gente grabándolo para enseñárselo a sus nietos.',
    'Aura aniquilada. Convertiste una simple tirada en una tragedia griega completa, con coro y todo: el grupo entero murmurando "pero cómo es posible" al unísono.',
    'Pulverizaste tu aura con un método que ni queriendo se replica. Eres el accidente que ponen en las autoescuelas: doloroso de ver, imposible de entender, imprescindible como advertencia.',
    'Desastre nuclear de aura. Hay que evacuar la zona, porque el fracaso que acabas de soltar tiene radiación de la que muta a la gente. Sálvese quien pueda del don nadie.',
    'Tu aura se fue a cero y de paso se llevó tu dignidad como daño colateral. Dos por uno en humillación, y encima invitas tú, que para esto siempre tienes presupuesto.',
    'Colapso histórico. El grupo va a recordar esta tirada más que su propio cumpleaños. Pasaste a la historia, sí: al capítulo de "errores que no se deben cometer jamás", con tu foto.',
    'Perdiste toda tu aura con la solemnidad de un funeral. Y en cierto modo lo fue: el de la última esperanza que alguien guardaba de que algún día no la cagaras.',
    'Catástrofe absoluta. Tu aura tocó un fondo tan profundo que rebotó, te ilusionaste medio segundo, y volvió a bajar. Hasta el rebote te traiciónó, fracasado.',
    'Aura desintegrada a nivel atómico. Ni los físicos saben explicar cómo alguien convierte tan poco en aún menos. Eres una anomalía científica con número de teléfono.',
    'Demolición total en horario de máxima audiencia. El grupo no pestañeó. Fue como ver un documental de naturaleza en el que la gacela tropieza ella sola, sin león ni nada.',
    'Perdiste hasta el último punto y el aura cerró la cuenta, cambió la cerradura y tiró las llaves al río. Te quedaste fuera hasta de tu propia ruina, que ya es difícil.',
    'Hecatombe de aura. Lo tuyo no fue caer, fue una renuncia voluntaria a la dignidad con firma, sello y testigos. Trámite completado, perdedor certificado y registrado.',
    'Tu aura se desplomó tan fuerte que se notó en otros grupos. Eres el terremoto del fracaso: epicentro tú, réplicas en todo tu entorno, víctimas todos menos tú, que ni te enteras.',
    'Aniquilación en directo. El grupo hizo captura no para reírse, sino como prueba para cuando lo cuenten y nadie se lo crea. "Os juro que pasó", dirán, señalando tu nombre.',
    'Catástrofe de manual. Cogiste una situación neutra y la convertiste en tu peor momento del año con una eficiencia que, bien usada, te habría sacado de pobre.',
    'Perdiste todo de una forma tan tuya que el grupo ni preguntó qué pasó. Ya lo sabían: pasó lo de siempre, pero en versión extendida, remasterizada y con escenas inéditas.',
    'Tu aura no murió, se suicidó por la vergüenza de pertenecerte. Primera vez que veo a un marcador preferir el cero antes que seguir un segundo más asociado a alguien.',
    'Desastre total con efectos especiales. Si el ridículo diera premios, esta noche subes al escenario, lloras de emoción y olvidas mencionar al único culpable de todo: tú.',
    'Colapso absoluto. Lo que acabas de hacer va a servir de cuento para asustar a los nuevos del grupo: "pórtate bien o acabarás como ese", y todos mirando tu aura en cero.',
    'Perdiste tanta aura que la gráfica parece un acantilado. Los que hacen senderismo por desgracias ajenas se pararían aquí a hacerse una foto: "mira, el Gran Cañón del fracaso".',
    'Aura ejecutada en plaza pública. Ni venda en los ojos pediste. Te plantaste, la cagaste de frente y caíste mirando al grupo: lo más cerca de valiente que vas a estar en tu vida.',
    'Catástrofe con denominación de origen. Otros fracasan; tú fabricas desastres artesanales, de kilómetro cero, con tu sello inconfundible de inútil orgulloso de serlo.',
    'Tu aura se evaporó y el grupo guardó un minuto de silencio. No por ti, tranquilo, sino por el pobre marcador, que no eligió este trabajo y aun así tiene que contarte a ti.',
    'Hundimiento épico. Conseguiste que perder fuera un espectáculo, lo cual ya es raro, porque normalmente eres aburrido. Hoy al menos fracasaste en HD y con sonido envolvente.',
    'Aura demolida. Lo más impresionante es la naturalidad: ni un titubeo, ni una duda. Te lanzaste al ridículo como quien llega a casa. Porque para ti lo es, perdedor.',
    'Catástrofe de las que dejan cráter. El grupo va a tardar en olvidarlo, sobre todo porque pienso recordárselo cada vez que abras la boca. De nada, basura.',
    'Perdiste todo y batiste tu propio récord de patetismo, que ya estaba altísimo. Eres el único atleta que entrena duro para ser cada día un poco peor, y mira, lo clavas.',
    'Tu aura tocó el cero absoluto, temperatura a la que hasta los átomos se quedan quietos. Apropiado, porque tú llevas parado mucho más tiempo y con mucha menos excusa.',
    'Desastre integral. No salvaste nada: ni los muebles, ni la cara, ni el "bueno, al menos lo intenté". Saliste con lo puesto, y lo puesto era pura vergüenza, fracasado.',
    'Aura pulverizada delante de testigos. La diferencia entre tú y un chiste es que el chiste lo cuenta alguien a propósito para que la gente se ría. A ti te sale solo.',
    'Colapso nivel leyenda. Te ganaste plaza permanente en el muro de la vergüenza del grupo, con foto, fecha y un cartelito que dice: "aquí descansa el que lo tenía fácil".',
    'Perdiste hasta lo que no tenías. Cerraste en un negativo tan absurdo que el aura tuvo que inventar un número nuevo solo para humillarte con precisión. Te lo has currado, puto.',
    'Tu aura se desintegró y el grupo entero soltó a la vez ese "uuuf" de cuando alguien se estrella en la tele. Generaste reacción colectiva. Negativa, pero colectiva. Casi te aplaudo.',
    'Hiciste algo tan malo que el grupo entero tuvo que fingir que no lo vio. Aura destruida.',
    'Catástrofe total. Ni el bot encuentra la forma de contarlo sin que suene peor de lo que fue.',
    'Aura pulverizada. Vas a tardar semanas en que alguien te mire sin recordar esto.',
    'Lo tuyo hoy fue un accidente con testigos. El aura no baja, se desintegra.',
    'Desastre absoluto. Tenías una salida fácil y elegiste prender fuego a todo.',
    'Aura por los suelos. El grupo tiene material para reírse de ti hasta fin de año.',
    'Hiciste el ridículo en grado máximo y encima delante de todos. Aura reducida a cenizas.',
    'Fracaso monumental. Ni queriendo se hace tan mal, y tú ni siquiera lo intentabas.',
    'Aura destruida. La gente va a contar esto en el grupo cuando tú ya no estés.',
    'Catástrofe en directo. El grupo entero calló, pero no por respeto: por vergüenza ajena.',
    'Perdiste todo lo que habías construido en un solo movimiento. Talento para lo peor.',
    'Aura arrasada. Esto no fue un error, fue una demolición planificada de ti mismo.',
    'Desastre histórico. Va a ser el ejemplo de lo que no se hace durante mucho tiempo.',
    'Hiciste lo imposible: quedar peor de lo que ya estabas. Aura en números rojos profundos.',
    'Aura aniquilada. Ni un abogado bueno te saca de la que has liado hoy.',
    'Fracaso de los que dejan marca. El grupo cambió de tema para no seguir viéndolo.',
    'Catástrofe absoluta. Te hundiste solo, sin ayuda, con público y en horario de máxima audiencia.',
    'Aura reventada. La única buena noticia es que desde aquí ya no se puede caer más.',
    'Desastre irreparable. Lo intentaste, salió mal, y encima insististe. Eso ya es vocación.',
    'Hoy tocaste fondo y encima con estilo propio. Aura mínima histórica confirmada.',
    'Aura hecha pedazos. El grupo entero fue testigo y nadie va a olvidarlo por caridad.',
    'Colapso total. Había cien formas de salir bien y encontraste la única que no existía.',
    'Aura demolida. Esto no se arregla hablando: se arregla desapareciendo un par de semanas.',
    'Desastre de manual. Cuando cuenten esta historia, tú vas a ser el ejemplo negativo.',
    'Aura mínima. Lo raro no es que fallaras, es la magnitud con la que lo conseguiste.',
  ],
};


// !aura top — leaderboard of accumulated aura in the group.
async function showRanking(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'El ranking de aura solo existe en grupos.' }, { quoted: msg });
  }
  // Dos filtros antes de cortar el top 10:
  //   · quien ya no esta en el grupo no ocupa puesto — el aura se guarda para
  //     siempre y sin esto el ranking seguia coronando a gente que se fue;
  //   · el owner principal es invisible en toda salida automatica.
  const ranking = soloMiembros(await getAuraRanking(jid), groupMeta)
    .filter(r => !isMainOwner(r.jid, false, groupMeta))
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

const AURA_INFO =
`*¿QUÉ ES EL AURA?*

El aura es tu puntuación social en el grupo. Empieza en *100* y sube o baja según lo que hagas.

*CÓMO GANAR O PERDER AURA*
· *!aura* — tiras el dado (3min cooldown). Puede subir o bajar dependiendo de tu rol: el owner tiene ventaja, los admins algo menos, los miembros la peor odds. La tirada no mira cuánta aura llevas: cada tirada empieza de cero.
· *Bonos automáticos* — solo por escribir en el grupo recibes bonos al llegar a 200, 500 y 1000 mensajes diarios. El contador se reinicia cada 24h, así que la carrera empieza de nuevo cada día. Los premios mínimos garantizados: Tier 1 (200 msgs) *1.000*, Tier 2 (500 msgs) *2.500*, Tier 3 (1000 msgs) *5.000*. Con suerte puedes sacar mucho más.
· *Jackpot de redención* — si llevas aura negativa, tienes probabilidad extra de sacar un premio enorme en cualquier tier. El aura del grupo no abandona a los hundidos.
· *!duel @user* — apuesta aura contra otro. El retado acepta con !duel aceptar. Gana el más favorecido por el sistema (owner > admin > miembro), pero nadie está a salvo.
· *!robo @user* — intenta robar aura a alguien. El resultado no es solo ganar o perder: hay golpes maestros, robos a medias y desastres en los que la víctima se queda con lo tuyo. 10min de cooldown.
· *!dar @user <cantidad>* — transfiere aura a otro miembro voluntariamente. Mínimo 5.

*COMANDOS*
· *!aura* — tirar para ti
· *!aura @user* — ver aura de alguien
· *!aura top* — ranking del grupo
· *!aura hoy* — tu progreso de hoy (msgs y próximo bono)`;

// !aura [@user]  — rolls aura for the target and updates their PERSISTENT total.
// !aura top      — shows the group leaderboard.
// !aura info     — explains the full system.
async function cmdAura(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;

  const sub = (args && args[0] ? args[0] : '').toLowerCase();
  if (['top', 'rank', 'ranking', 'leaderboard'].includes(sub)) {
    return showRanking(sock, msg, groupMeta);
  }
  if (['info', 'help', 'ayuda', 'como', 'cómo', '?'].includes(sub)) {
    return sock.sendMessage(jid, { text: AURA_INFO }, { quoted: msg });
  }
  // Progreso diario. Vive en social.js (cmdCasino) y se expone aquí como
  // "!aura hoy" porque es aura, no un casino aparte. !casino sigue valiendo.
  if (['hoy', 'today', 'dia', 'día', 'diario'].includes(sub)) {
    const { cmdCasino } = require('./social');
    return cmdCasino(sock, msg);
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

  const coolKey = `${jid}|${canonicalJid(sender)}`;
  const last = lastRoll.get(coolKey) || 0;
  const remaining = ROLL_COOLDOWN_MS - (Date.now() - last);
  if (remaining > 0) {
    const mins = Math.ceil(remaining / 60_000);
    return sock.sendMessage(jid, {
      text: `Espera *${mins}min* para volver a tirar.`,
    }, { quoted: msg });
  }
  if (lastRoll.size >= 2000) lastRoll.delete(lastRoll.keys().next().value);
  lastRoll.set(coolKey, Date.now());

  // The roll is rigged by the SENDER's own role — you only ever play your own aura.
  const selfIsOwner = isOwner(sender, msg.key.fromMe, groupMeta);
  const selfIsAdmin = isAdmin(groupMeta?.participants, sender);

  const { tier, amount } = rollAura(selfIsOwner, selfIsAdmin);
  const sign = amount >= 0 ? '+' : '-';

  const { previous, current } = await addAura(jid, sender, amount);

  // Already in the red and going deeper: use spiral phrases
  const effectiveTier = (previous < 0 && amount < 0) ? 'spiral' : tier;

  const text =
    `*@${sender.split('@')[0]} ${sign}${fmt(Math.abs(amount))} de aura*\n` +
    `${pickFresh(AURA[effectiveTier], `${jid}|aura|${effectiveTier}`)}\n\n` +
    `Aura total: *${fmt(current)}*`;

  await sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: msg });
}

module.exports = { cmdAura };
