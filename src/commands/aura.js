const { isOwner, isAdmin, getTarget, getSender, bareJid } = require('../utils/wa');
const { pickFresh } = require('../utils/helpers');
const { getAura, addAura, getAuraRanking, STARTING_AURA } = require('../utils/auraStore');

const ROLL_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes per user per group
const lastRoll = new Map(); // `${groupJid}|${bareJid}` -> timestamp

// Aura roll. Owner 60/40, admin 55/45, member 50/50.
// Members were previously 30/70 — far too punishing for regular use.
function rollAura(targetIsOwner, targetIsAdmin) {
  const r = Math.random();
  const big   = () => (50 + Math.floor(Math.random() * 51)) * 100;  // 5000..10000
  const small = () => (15 + Math.floor(Math.random() * 46)) * 100;  // 1500..6000

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
    'Catástrofe absoluta. Tu aura tocó un fondo tan profundo que rebotó, te ilusionaste medio segundo, y volvió a bajar. Hasta el rebote te traicionó, fracasado.',
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
  ],
};

const fmt = (n) => n.toLocaleString('es-ES');

// !aura top — leaderboard of accumulated aura in the group.
async function showRanking(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'El ranking de aura solo existe en grupos.' }, { quoted: msg });
  }
  const ranking = (await getAuraRanking(jid)).slice(0, 10);
  if (ranking.length === 0) {
    return sock.sendMessage(jid, { text: 'Nadie ha medido su aura todavía. Usa *!aura*.' }, { quoted: msg });
  }
  const medals = ['🥇', '🥈', '🥉'];
  let text = '*RANKING DE AURA*\n\n';
  const mentions = [];
  ranking.forEach((r, i) => {
    const tag = medals[i] || `*${i + 1}.*`;
    text += `${tag} @${r.jid.split('@')[0]} — ${fmt(r.aura)}\n`;
    mentions.push(r.jid);
  });
  await sock.sendMessage(jid, { text: text.trimEnd(), mentions }, { quoted: msg });
}

const AURA_INFO =
`*¿QUÉ ES EL AURA?*

El aura es tu puntuación social en el grupo. Empieza en *1.000* y sube o baja según lo que hagas.

*CÓMO GANAR O PERDER AURA*
· *!aura* — tiras el dado (3min cooldown). Puede subir o bajar dependiendo de tu rol: el owner tiene ventaja, los admins algo menos, los miembros la peor odds. Cuanto más en rojo estás, más probable el colapso.
· *Bonos automáticos* — solo por escribir en el grupo recibes bonos al llegar a 200, 500 y 1000 mensajes diarios. El contador se reinicia cada 24h, así que la carrera empieza de nuevo cada día. Los premios mínimos garantizados: Tier 1 (200 msgs) *20.000*, Tier 2 (500 msgs) *60.000*, Tier 3 (1000 msgs) *150.000*. Con suerte puedes sacar mucho más.
· *Jackpot de redención* — si llevas aura negativa, tienes probabilidad extra de sacar un premio enorme en cualquier tier. El casino del grupo no abandona a los hundidos.
· *!duel @user* — apuesta aura contra otro. El retado acepta con !duel aceptar. Gana el más favorecido por el sistema (owner > admin > miembro), pero nadie está a salvo.
· *!robo @user* — intenta robar aura a alguien. Si fallas, pierdes la mitad de lo apostado. 10min de cooldown.
· *!dar @user <cantidad>* — transfiere aura a otro miembro voluntariamente. Mínimo 10.

*COMANDOS*
· *!aura* — tirar para ti
· *!aura @user* — ver aura de alguien
· *!aura top* — ranking del grupo
· *!casino* — tu progreso hoy (msgs y próximo bono)`;

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

  const sender = getSender(msg);

  // El aura es como una moneda: solo el dueño la juega. !aura @alguien es solo
  // una CONSULTA del aura de esa persona — no tira, no gasta cooldown y no
  // modifica nada. Tirar (subir/bajar) siempre es sobre uno mismo.
  const mentioned = getTarget(msg);
  if (mentioned && bareJid(mentioned) !== bareJid(sender)) {
    const aura = await getAura(jid, mentioned);
    return sock.sendMessage(jid, {
      text: `*@${mentioned.split('@')[0]}* tiene *${fmt(aura)}* de aura.`,
      mentions: [mentioned],
    }, { quoted: msg });
  }

  const coolKey = `${jid}|${bareJid(sender)}`;
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
    `*@${sender.split('@')[0]}  ${sign}${fmt(Math.abs(amount))} de aura*\n` +
    `${pickFresh(AURA[effectiveTier], `${jid}|aura|${effectiveTier}`)}\n\n` +
    `Aura total: *${fmt(current)}*`;

  await sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: msg });
}

module.exports = { cmdAura };
