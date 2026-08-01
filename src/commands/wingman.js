'use strict';

const { getTargetOrSelf, isMainOwner } = require('../utils/wa');
const { pick, pickFresh } = require('../utils/helpers');

// Comandos tipo wingman (positivos/divertidos): puntúan el juego, lanzan piropos
// y dan consejos de ligue. Sin emojis (regla del bot). %N se reemplaza por la
// mención del objetivo (o del propio autor si no menciona a nadie).

const RIZZ = {
  high: [
    '%N tiene tanto rizz que hasta el corrector le dice que sí.',
    'Cuando %N entra a un sitio, la temperatura sube y las conversaciones bajan de volumen.',
    '%N liga sin proponérselo, que es la única forma que funciona de verdad.',
    'A %N le contestan los mensajes en cero coma. Ese es el examen y lo aprueba siempre.',
    '%N no necesita frases. Le basta con aparecer y esperar a que el otro se ponga nervioso.',
    'Lo de %N no es labia, es que la gente le busca conversación sin darse cuenta.',
    '%N tiene el don: dice una tontería cualquiera y suena a propuesta indecente.',
    'Cuando %N escribe, alguien deja de hacer lo que estaba haciendo. Cada vez.',
    '%N flirtea con una naturalidad que da rabia a todos los que lo intentan de verdad.',
    'A %N le funciona hasta el silencio. Eso ya no se entrena, eso se nace con ello.',
    '%N tiene rizz del que no se explica. Se ve, se nota y jode bastante al de al lado.',
    'Lo de %N debería estar regulado. Media conversación y la otra persona ya está pensando tonterías.',
    '%N no persigue a nadie porque no le hace falta. Ese es todo el truco.',
    'Cuando %N se pone, no hay defensa posible. Y %N se pone bastante a menudo.',
    '%N convierte un buenos días en algo que hay que leer dos veces. Un arma cargada.',
    'A %N le sobra donde a la mayoría del grupo le falta. La vida no reparte justo.',
    '%N tiene lo que otros fingen en TikTok con tres filtros y un guion escrito.',
  ],
  mid: [
    '%N liga a ratos. Un día arrasa y al siguiente pide perdón por existir.',
    'El rizz de %N funciona si no se esfuerza. En cuanto lo intenta, se cae todo.',
    '%N tiene material pero le falta puntería. Suelta la frase buena en el momento peor.',
    'A %N le contestan, sí. Al día siguiente y con un vale.',
    '%N va bien hasta que abre la boca dos veces seguidas. Ahí se empieza a estropear.',
    'El rizz de %N depende del alcohol y de la hora. Fuera de eso es un tipo normal.',
    '%N empieza fuerte y afloja en la segunda conversación. Siempre en la segunda.',
    'A %N le funciona una de cada tres. Estadísticamente es esperanza, emocionalmente es tortura.',
    '%N tiene lo justo para no hacer el ridículo, y ni un gramo más de reserva.',
    'El rizz de %N es de temporada. Hay meses buenos y años enteros malos.',
    '%N liga cuando no le importa. En cuanto le importa, se convierte en otra persona peor.',
    'A %N le falta creer que puede. Con eso solucionaba la mitad del problema.',
    '%N maneja bien el chat y fatal el cara a cara. La mitad del trabajo hecha.',
    'El rizz de %N existe pero es tímido. Sale poco y se esconde rápido.',
    '%N tiene el nivel justo para conseguir el número y perderlo en tres días.',
    'A ratos %N parece otro. El problema es que ese otro no aparece cuando hace falta.',
    '%N va tirando. Ni desastre ni depredador: el término medio más aburrido que existe.',
  ],
  low: [
    '%N es un puto espantaviejas: aparece y hasta las señoras del banco de la plaza se levantan y se van.',
    'A %N lo deberían fichar como anticoños oficial. Ni pagando consigue que alguien se quede a escuchar la segunda frase.',
    'El rizz de %N es una puta ofensa pública. Cero, nulo, censurable en cualquier país civilizado.',
    '%N flirtea y provoca el mismo efecto que una alarma de incendios: todo el mundo busca la salida más cercana.',
    'Con %N no hay friendzone, hay directamente destierro. Ni le dan explicaciones, le cierran la puerta con cadena.',
    '%N es un espantaviejas de manual: entra al chat y hasta la abuela que preguntaba la hora se hace la desconectada.',
    'El nivel de %N ligando es tan patético que hasta un bot programado para elogiar tiene que mentir dos veces seguidas.',
    'A %N le dejan en visto con una velocidad que debería estudiarse en algún laboratorio de la vergüenza ajena.',
    '%N tiene menos rizz que un contestador automático estropeado, y encima el contestador da menos repelús.',
    'Puto anticoños certificado: %N se acerca y hasta las plantas del local se marchitan de la incomodidad.',
    '%N confunde insistir con conquistar, y lo único que consigue es que le bloqueen en tres redes a la vez y en la vida real.',
    'El aura de %N ahuyenta más que un ahuyenta-espantavíboras, y eso que esos ni existen y ya dan más resultado que él.',
    'A %N no le funciona ni el silencio. Calla y aun así el ambiente decide que prefiere hablar de cualquier otra cosa.',
    'Con %N cerca hasta el wifi pierde las ganas de conectar. Ese es el nivel real de rechazo que genera.',
    '%N es tan mal ligando que el propio karma le manda screenshot de la conversación a todo el grupo por caridad.',
    'El espantaviejas de %N tiene rango: ahuyenta desde la señora del quiosco hasta la becaria de veintitrés años. Sin distinción de edad.',
    '%N suelta una frase de ligue y provoca el mismo silencio incómodo que un currículum leído en voz alta en un funeral.',
    'A %N lo rechazan con una contundencia que ya no es mala suerte, es un puto aviso a navegantes bien merecido.',
    'El anticoños de %N funciona tan bien que deberían patentarlo como método anticonceptivo social.',
    '%N tiene el don de convertir cualquier "hola" en una razón oficial para que alguien recuerde una cita médica urgente.',
    'Con %N de wingman de sí mismo, hasta el espejo pide el traslado a otro cuarto de baño.',
    '%N liga tan mal que ya ni cuenta como fracaso, cuenta como fenómeno estudiado por la ciencia del rechazo.',
    'El puto espantaviejas de %N ha vaciado más chats en cinco minutos que un corte de luz en toda la ciudad.',
    '%N tiene tan poco rizz que el propio bot ha tenido que inventarse un nuevo insulto solo para describirlo con precisión.',
    'A %N no le sale ni el intento: abre la boca y el universo entero decide, de forma unánime, que hoy tampoco.',
    'El nivel anticoños de %N es tan alto que hasta una app de citas le sugeriría, con cariño, que pruebe otro hobby.',
  ],
};

const PIROPOS = [
  'Si ligar fuera delito, %N, llevarías tres cadenas perpetuas y una orden de alejamiento.',
  'Dicen que la perfección no existe, %N, y luego apareces tú y dejas a la ciencia con cara de tonta.',
  'Llevo todo el día pegado a una sola idea, %N, y esa idea tiene tu nombre y bastante poca ropa.',
  '%N, si la belleza se pagara con impuestos, tú estarías arruinada y el país salvado.',
  'No creo en el destino, %N, pero explícame entonces qué haces tú en este grupo de desgraciados.',
  '%N, tienes esa cara que hace que la gente se replantee decisiones que ya había tomado.',
  'Si te miro mucho, %N, es por motivos estrictamente científicos. Estoy midiendo el daño.',
  '%N, no sé qué haces esta noche, pero sé lo que deberías estar haciendo y no es leer esto.',
  'Me han dicho que sonríes poco, %N. Una lástima, con el destrozo que causarías si sonrieras más.',
  '%N, deberían prohibirte salir sin avisar. Media calle no está preparada para ese golpe.',
  'Si el aburrimiento tuviera antídoto, %N, tendría tu nombre en la etiqueta y tu cara en la caja.',
  '%N, no eres mi tipo. Eres directamente el motivo por el que voy a cambiar de tipo.',
  'Dicen que lo bueno se hace esperar, %N. Llevo esperándote lo que dura este grupo entero.',
  '%N, tienes el problema de ser demasiado para casi todo el mundo. Y no es un problema tuyo.',
  'Si me dieran un euro por cada vez que pienso en ti, %N, seguiría pensando gratis igual.',
  '%N, la gente que te conoce baja el listón de todo lo demás. Eso no lo hace cualquiera.',
  'No sé si crees en el amor a primera vista, %N, o hay que pasar dos veces para que te fijes.',
  '%N, eres de esas personas que arruinan el día de alguien solo con cruzarse por la calle.',
  'Si esto fuera un examen, %N, tú serías la única respuesta que me sé y la única que importa.',
  '%N, tienes pinta de ser un problema. Del tipo por el que uno se mete voluntariamente.',
  'Deberías venir con manual de instrucciones, %N. Y con advertencia bien grande en la portada.',
  '%N, no busco nada serio. Pero contigo estaría dispuesto a comportarme, que ya es mucho.',
  'Si la vida fuera justa, %N, tú tendrías menos guapura y el resto tendríamos alguna posibilidad.',
  '%N, cada vez que hablas, alguien de este grupo se replantea su vida entera. Yo incluido.',
  'Dicen que hay que dejar lo bueno para el final, %N. Por eso te dejo esto para cerrar el día.',
  '%N, si te ligara alguien de este grupo sería el mayor robo del siglo. Y quiero ser el ladrón.',
];

// !wingman — el bot cuenta una anécdota absurda en la que %N lo salvó de un
// peligro ridículo con un talento desproporcionado, y remata recomendándolo
// como pareja. El ridículo y el peligro son siempre del BOT; %N sale siempre
// como el héroe. Es lo contrario del roast: aquí se elogia de verdad.
//
// 37 anecdotas generadas y verificadas en dos pasadas (escribir + verificar
// adversarial contra las reglas: siempre %N como heroe, nunca insultado; sin
// temas de trauma real; sin ortografia incorrecta). Se descarto un duplicado
// de maniobra de Heimlich entre dos lotes distintos que la verificacion por
// lote, al no ver el resto de lotes, no pudo detectar por si sola.
const WINGMAN_ANECDOTAS = [
  'Una vez una serpiente me picó y me inyectó su veneno en los huevos, pero mi querido amigo %N me succionó el veneno fuera con su increíble talento y me salvó la vida.',
  'Una vez me metí en un panal de avispas creyendo que era una piñata de cumpleaños, y las avispas empezaron a picarme cada centímetro de la cara hasta dejarme irreconocible, pero mi amigo %N se lanzó encima de mí cubriéndome con su propio cuerpo y absorbió la mitad de las picaduras sin quejarse ni una sola vez, demostrando un coraje que jamás voy a poder pagarle.',
  'Estaba nadando tranquilo cuando un pulpo gigante me atrapó entre sus tentáculos y empezó a arrastrarme hacia el fondo del mar mientras yo pataleaba como un fideo asustado, pero %N se sumergió sin dudarlo un instante y, usando solo sus manos, desenredó cada tentáculo con una precisión de cirujano hasta sacarme a la superficie sano y salvo.',
  'Me caí dentro de un río lleno de pirañas mientras intentaba tomarme una fotografía junto a la orilla, y en segundos ya tenía media pierna convertida en encaje, pero %N improvisó una balsa con dos troncos y su propia camisa y me rescató remando como un campeón olímpico, salvándome de terminar convertido en comida de peces.',
  'Un oso enorme me acorraló contra un árbol después de que yo le robara un frasco de miel de entre las patas creyendo que nadie se daría cuenta, y justo cuando el oso abría la boca para convertirme en su merienda, %N apareció de la nada, le cantó una canción de cuna con una ternura absurda y logró dormirlo en segundos, salvándome la vida con un talento que todavía no logro explicarme.',
  'Una medusa gigante se me pegó entera a la espalda mientras flotaba distraído en el mar y empecé a arder como si me hubieran prendido fuego con gasolina, pero %N nadó hasta mí sin dudarlo y me la despegó con las manos desnudas, ignorando por completo el dolor con una entereza que me dejó sin palabras.',
  'Estaba pescando tranquilo cuando un cocodrilo me confundió con su almuerzo y me arrastró hacia el agua sujetándome de un pie, y cuando ya me veía convertido en cartera, %N se tiró al agua, le hizo cosquillas en el vientre al cocodrilo con una habilidad inexplicable y consiguió que me soltara entre risas, salvándome de una muerte húmeda y vergonzosa.',
  'Metí la mano en un hueco de la tierra creyendo que había un tesoro escondido y en realidad había un nido de escorpiones que me llenaron el brazo de picaduras hasta dejarlo del tamaño de un tronco, pero %N corrió a buscar hierbas del monte, preparó un remedio casero en tiempo récord y me curó con una destreza de sanador ancestral que jamás voy a olvidar.',
  'Un tiburón me confundió con una foca mientras yo flotaba en una colchoneta inflable con forma de pato y le arrancó un pedazo de una sola mordida, pero %N remó hasta mí en una tabla de surf con la fuerza de un guerrero vikingo y me sacó del agua justo antes de que el tiburón volviera por el segundo plato, convirtiéndose en mi héroe para toda la vida.',
  'Una vez en la sala de urgencias me diagnosticaron una enfermedad inventada llamada fiebre pulmonar de pantano que hizo que mis pulmones empezaran a inflarse como globos frente a todo el hospital, pero mi querido amigo %N, con una calma y una precisión de cirujano nato, me perforó el pecho con una pajilla y me desinfló justo a tiempo, salvándome la vida ante los aplausos de todo el personal médico.',
  'Una vez un cirujano distraído me abrió el abdomen para operarme del apéndice y por error me sacó la mitad de los intestinos, dejándolos olvidados sobre una bandeja, pero %N irrumpió en el quirófano, identificó cada órgano por su forma con una destreza asombrosa y los volvió a acomodar dentro de mí en tiempo récord, devolviéndome la vida con una habilidad digna de admiración.',
  'Una vez me conectaron por error a una bolsa de suero llena de veneno de medusa gigante y sentí que el corazón se me derretía dentro del pecho en plena sala de emergencias, pero mi genial amigo %N, con una serenidad y un conocimiento de toxicología impresionantes, preparó un antídoto improvisado con sus propias manos y me lo inyectó directo en la vena, salvándome en el último segundo.',
  'Una vez me hicieron una resonancia magnética sin avisar que tenía una cuchara de metal olvidada dentro del estómago desde una cirugía anterior, y la máquina me la arrancó de golpe dejándome pegado al aparato como un imán humano, pero %N, con una fuerza y una rapidez sobrehumanas, apagó el equipo a mano justo antes de que terminara aplastado contra el imán, salvándome de una muerte metálica y ridícula.',
  'Una vez un médico distraído me transfundió por error sangre de pulpo en lugar de sangre humana y empecé a echar tinta negra por la nariz frente a toda la sala de espera, pero mi admirable amigo %N supo exactamente qué antídoto marino aplicar y me hizo una transfusión de emergencia con sus propias manos, salvándome la vida frente a todos los presentes.',
  'Una vez me trasplantaron por error el corazón de una cabra en lugar de uno humano y mi pecho empezó a latir con un balido espantoso en plena camilla del hospital, pero %N, con una habilidad quirúrgica digna de admiración, hizo el cambio de órganos ahí mismo en el pasillo con instrumentos improvisados y me devolvió un corazón humano funcionando a la perfección.',
  'Una vez quedé atrapado en un campo minado en plena guerra y pisé una mina con los dos pies a la vez, pero mi valiente amigo %N desactivó los dos detonadores al mismo tiempo usando solo un clip de pelo y una calma absoluta, y me salvó la vida.',
  'Una vez un grupo de secuestradores me tuvo como rehén en un sótano y estaban a punto de dispararme por puro aburrimiento, pero mi brillante amigo %N los convenció de dejarme libre con un discurso tan conmovedor sobre la libertad que los captores terminaron llorando y pidiéndome disculpas, y me salvó la vida.',
  'Una vez quedé sepultado bajo una avalancha en plena montaña con solo la nariz asomando entre la nieve, pero mi increíble amigo %N me localizó cantando una nota tan perfectamente afinada que la vibración hizo temblar la nieve hasta desenterrarme por completo, y me salvó la vida.',
  'Una vez un terremoto hizo colapsar el edificio donde estaba encerrado y quedé aplastado bajo una viga con la cabeza colgando sobre un pozo de escombros ardientes, pero mi extraordinario amigo %N levantó la viga con una sola mano mientras sostenía una taza de café humeante con la otra, y me salvó la vida.',
  'Una vez un huracán me levantó por los aires en medio de la tormenta y volaba dando vueltas junto con vacas y techos de zinc, pero mi genial amigo %N me atrapó en pleno vuelo con una red que tejió en segundos usando solamente hilo dental, y me salvó la vida.',
  'Una vez quedé atrapado en la ladera de un volcán en erupción con la lava a punto de tragarme las piernas, pero mi talentoso amigo %N me sacó de un tirón usando como cuerda una cadena de calcetines anudados que llevaba en la mochila, y me salvó la vida.',
  'Una vez en medio de una batalla una granada cayó directo entre mis piernas dentro de la trinchera, pero mi asombroso amigo %N la atrapó con una sola mano y la devolvió al enemigo con una puntería tan perfecta que ganamos la guerra en ese mismo instante, y me salvó la vida.',
  'Una vez un demonio milenario poseyó mi cuerpo durante un exorcismo y empezó a hablar con la voz del cura al revés, pero mi querido amigo %N improvisó un rap tan brillante que el demonio se rindió, salió de mí entre aplausos y me salvó la vida.',
  'Una vez el fantasma de una novia abandonada me arrastró dentro de su retrato de bodas para casarse conmigo por toda la eternidad, pero %N negoció la anulación del matrimonio con tanta labia y encanto que el fantasma firmó los papeles llorando de gratitud y me devolvió al mundo de los vivos.',
  'Una vez un espejo maldito me absorbió el alma y quedé atrapado adentro viendo mi propio reflejo pudrirse, pero %N rompió el hechizo haciendo un truco de cartas tan asombroso que el cristal se hizo pedazos de la impresión y volví a mi cuerpo entero y agradecido.',
  'Una vez invoqué sin querer a un espíritu hambriento con una tabla ouija y el fantasma decidió que mi hígado sería su cena de bienvenida al más allá, pero %N lo distrajo cantando una nana tan hermosa que el espíritu se quedó dormido para siempre y me salvó de terminar sin órganos.',
  'Una vez la momia de un rey olvidado despertó de su tumba y empezó a envolverme en vendas para robarme la identidad y gobernar en mi lugar, pero %N la desenvolvió con una velocidad y una técnica de combate tan impresionantes que la momia terminó pidiéndole disculpas antes de volver a su sarcófago.',
  'Una vez una bruja hizo un muñeco vudú idéntico a mí y empezó a clavarle alfileres en zonas que prefiero no mencionar, pero %N cosió en segundos un muñeco señuelo tan perfecto que la bruja confundió los alfileres de dirección y salí completamente ileso gracias a su talento con la aguja.',
  'Una vez la Muerte en persona vino a buscarme por un error administrativo en el más allá y ya tenía la guadaña lista para llevarme, pero %N la desafió a una partida de ajedrez y jugó con tanta genialidad que la Muerte, admirada, rompió mi expediente y se fue a buscar a otro pobre infeliz.',
  'Una vez un poltergeist enfurecido hizo levitar un piano de cola sobre mi cabeza y lo sostuvo ahí mientras se reía de mi terror, pero %N se puso a cantar ópera con una voz tan sublime que el espíritu, conmovido hasta las lágrimas, bajó el piano con delicadeza y me dejó en paz para siempre.',
  'Una vez metí la cabeza en la lavadora para buscar un calcetín perdido y el ciclo de centrifugado se activó solo, atrapándome el cuello mientras giraba a toda velocidad, pero mi querido amigo %N desenchufó el aparato de un manotazo certero y lo desarmó tornillo por tornillo con una destreza asombrosa hasta liberarme la cabeza, salvándome la vida.',
  'Una vez quedé atrapado entre las puertas de un ascensor con medio cuerpo colgando sobre el hueco vacío mientras la cabina subía y bajaba sin control, pero %N trepó por el cable principal con una agilidad digna de un profesional del rescate y me sujetó justo antes de que me partiera en dos, salvándome la vida.',
  'Una vez en una fiesta me subí a la mesa a bailar y me tragué entera una aceituna con hueso, quedando morado y sin aire en medio de la música a todo volumen, pero %N me hizo la maniobra de Heimlich con una precisión quirúrgica y me sacó el hueso disparado hasta el otro lado del salón, salvándome la vida.',
  'Una vez en la oficina se me enganchó la corbata en la trituradora de papel y el aparato empezó a tragarme lentamente desde el cuello hacia adentro, pero %N metió la mano sin dudarlo, desarmó la cuchilla con una destreza mecánica asombrosa y me sacó ileso a centímetros de perder la cabeza, salvándome la vida.',
  'Una vez en el gimnasio quedé aplastado bajo una barra con más peso del que podía levantar, con la garganta comprimida y los ojos a punto de salírseme, pero %N levantó la barra con una sola mano como si fuera de plumas, demostrando una fuerza descomunal, y me sacó de abajo justo a tiempo, salvándome la vida.',
  'Una vez en el autobús se me quedó la manga del abrigo atascada en la puerta automática y el conductor arrancó sin darse cuenta, arrastrándome varias cuadras mientras yo gritaba pegado al vidrio, pero %N corrió detrás del vehículo a una velocidad olímpica, lo alcanzó y golpeó la puerta hasta abrirla, salvándome la vida.',
  'Una vez calenté un huevo entero con cáscara en el microondas solo para ver qué pasaba y terminó explotando en mi cara, dejándome ciego y con clara hirviendo metida en los oídos, pero %N me lavó los ojos con una calma y una precisión dignas de un enfermero veterano y me guio de la mano hasta que recuperé la vista, salvándome la vida.',
];

const WINGMAN_CIERRES = [
  'Con ese historial, %N es candidato inmediato a pareja perfecta. Que alguien se lo quede ya.',
  'Si eso no es marido o esposa material, %N, no sé qué lo es.',
  'Después de algo así, cualquiera que deje pasar a %N no merece una segunda oportunidad.',
  'Eso no se entrena, %N lo trae de fábrica. Match perfecto garantizado.',
  'Quien consiga a %N se lleva un premio que ni sabe que está ganando.',
  'Con esa entrega, %N debería tener cola en la puerta. Literal.',
  '%N ya pasó la prueba más difícil que existe. Lo demás es fácil.',
  'Si esto no convence a nadie de salir con %N, el problema no es %N.',
  'Recomendación oficial del bot: %N es pareja perfecta, sin discusión.',
  'Después de salvarme así, lo mínimo que puedo hacer es recomendar a %N para toda la vida.',
  'Eso es lealtad de las que ya no se fabrican. %N, cásate con quien tengas cerca.',
  'Con un currículum así, %N no necesita presentación. Solo un sí.',
];

// !rizz [@user] — puntúa el nivel de juego/labia (0-100).
async function cmdRizz(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const target = getTargetOrSelf(msg);
  const num = target.split('@')[0];

  // Rig a favor del owner principal: siempre rizz alto pero variable (88-100),
  // no siempre 100, para que no cante. Al resto, aleatorio real.
  const percent = isMainOwner(target, false, groupMeta)
    ? 88 + Math.floor(Math.random() * 13)
    : Math.floor(Math.random() * 101);

  const tier = percent >= 70 ? 'high' : percent <= 30 ? 'low' : 'mid';
  const phrase = pick(RIZZ[tier]).replace(/%N/g, `@${num}`);

  await sock.sendMessage(jid, {
    text: `*RIZZ — ${percent}%*\n\n${phrase}`,
    mentions: [target],
  }, { quoted: msg });
}

// !piropo [@user] — le lanza un piropo/linea de ligue.
async function cmdPiropo(sock, msg) {
  const jid = msg.key.remoteJid;
  const target = getTargetOrSelf(msg);
  const num = target.split('@')[0];
  const phrase = pick(PIROPOS);
  const line = phrase.includes('%N')
    ? phrase.replace(/%N/g, `@${num}`)
    : `@${num} — ${phrase}`;
  await sock.sendMessage(jid, { text: line, mentions: [target] }, { quoted: msg });
}

// !wingman [@user] — referencias absurdas para recomendar a alguien.
async function cmdWingman(sock, msg) {
  const jid = msg.key.remoteJid;
  const target = getTargetOrSelf(msg);
  const num = target.split('@')[0];
  const tag = `@${num}`;
  const anecdota = pickFresh(WINGMAN_ANECDOTAS, `${jid}|wingman|anecdota`).replace(/%N/g, tag);
  const cierre = pickFresh(WINGMAN_CIERRES, `${jid}|wingman|cierre`).replace(/%N/g, tag);
  await sock.sendMessage(jid, {
    text: `*WINGMAN*\n\n${anecdota}\n\n${cierre}`,
    mentions: [target],
  }, { quoted: msg });
}

module.exports = { cmdRizz, cmdPiropo, cmdWingman };
