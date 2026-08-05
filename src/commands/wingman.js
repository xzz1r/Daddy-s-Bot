'use strict';

const { getTargetOrSelf, isMainOwner } = require('../utils/wa');
const { pickFresh } = require('../utils/helpers');

// Comandos tipo wingman (positivos/divertidos): puntúan el juego, lanzan piropos
// y dan consejos de ligue. Sin emojis (regla del bot). %N se reemplaza por la
// mención del objetivo (o del propio autor si no menciona a nadie).

const RIZZ = {
  high: [
    '%N mandó un audio de siete segundos diciendo "eh, hola" y hay alguien que lo tiene guardado como recuerdo desde entonces.',
    'Un ex de %N se casó, tuvo hijos, se divorció y sigue revisando si %N vio su última historia. Esa clase de daño no se cura, se administra.',
    '%N le puso "jaja" a un mensaje y la otra persona canceló una boda para pensárselo mejor. No es una exageración, es un reporte policial.',
    'Hay gente en terapia pagando ciento cincuenta por sesión para superar dos semanas hablando con %N. El terapeuta también está enamorado, para que sepas.',
    '%N respondió tarde a propósito una vez, y la otra persona todavía revisa el reloj a esa hora exacta cada noche, como una plegaria.',
    'La última persona que salió con %N cambió de número, de ciudad y de nombre en redes. Sigue sin funcionar. %N tiene ese alcance.',
    '%N escribió "buenas noches" sin ningún emoji y alguien durmió con el teléfono sobre el pecho como si fuera un órgano vital.',
    'Dicen que %N ni se esfuerza. Verdad a medias: no le hace falta, y eso deja un reguero de gente reconstruyendo su autoestima desde cero.',
    '%N puede arruinar un matrimonio ajeno con un simple "qué tal" bien puesto. No lo hace por maldad, lo hace porque puede, que es peor.',
    'Alguien le mandó terapia grupal completa a %N pidiendo perdón por haberlo dejado en visto una vez, hace tres años, sin motivo.',
    '%N tiene tanto poder que hasta sus rechazos generan lealtad. Le dice que no a alguien y esa persona vuelve, agradecida, por más.',
    'Cuando %N entra a un chat grupal, dos personas fingen que no pasó nada y una tercera empieza a escribir su testamento emocional.',
    '%N mandó una foto normal, de las de documento, y alguien la imprimió. No para el CV, para el velador.',
    'La ex de %N sigue pagando el gimnasio del barrio de %N por si se cruzan. Eso no es coincidencia, eso es devoción con abono mensual.',
    '%N puede decir "no puedo hoy" y la otra persona entiende que fue su culpa, revisa qué hizo mal y pide perdón sin que nadie se lo pida.',
    'Un desconocido le escribió a %N por error y terminó contándole su vida entera, su trauma de la infancia y sus planes a diez años.',
    '%N tiene la clase de rizz que hace que gente estable, con pareja y con hijos, se replantee absolutamente todo en tres segundos de conversación.',
    'La última vez que %N ignoró a alguien, esa persona contrató a un detective. No para vigilarlo. Para entender qué había hecho mal.',
    '%N puede llegar tarde, cancelar dos veces y seguir siendo la mejor opción de la lista. Eso no se entrena, eso se hereda de algo oscuro.',
    'Alguien dejó su terapia de pareja de años por una conversación de quince minutos con %N. El terapeuta entendió y no cobró la última sesión.',
    '%N escribió "ja" sin la segunda a, sin nada más, y provocó una crisis existencial documentada en tres grupos de amigas distintos.',
    'Si %N quisiera, podría vaciar un pueblo entero de parejas estables solo pasando por la plaza principal un domingo cualquiera.',
    '%N tiene el tipo de magnetismo que deja secuelas: gente que jura que nunca más se enamora y dos semanas después está igual, otra vez, por %N.',
  ],
  mid: [
    '%N tuvo una racha de tres días imparable y la cerró mandando "wenas" sin hache y sin mayúscula. Se suicidó solo, en vivo, frente a testigos.',
    'El rizz de %N es como una ambulancia: llega, hace ruido, y a veces salva algo. Las otras veces solo confirma la hora de la defunción.',
    '%N tiene el material de un genio y la ejecución de alguien que se tropieza con su propia sombra. Nunca coinciden en la misma llamada.',
    'A %N le contestan a veces al toque y a veces nunca más, y todavía no ha entendido que el patrón no es azar, es que la caga siempre igual.',
    '%N liga bien hasta que decide "ser sincero" y cuenta lo del ex, lo del terapeuta y lo de la vez que lloró en el súper. Tres golpes, fuera.',
    'El rizz de %N necesita tres tragos para activarse y dos más para desactivarse del todo. Hay una ventana de veinte minutos donde brilla.',
    '%N empieza cada conversación como si fuera a conquistar el mundo y la termina disculpándose por existir. Los primeros diez mensajes son un espectáculo.',
    'A %N le funciona una de cada tres veces, y las otras dos las revive de madrugada, en bucle, como quien mira un accidente de tránsito propio.',
    '%N tiene justo el rizz necesario para llegar al segundo café y ni un gramo más. Ahí se le acaba el guion y empieza la tragedia.',
    'El rizz de %N depende de la luna, del signo del otro y de si desayunó bien. Es astrología aplicada al fracaso amoroso.',
    '%N liga cuando le da absolutamente igual, y en cuanto le importa se convierte en una persona nueva, peor, con menos vocabulario.',
    'A %N le falta un diez por ciento de confianza que, casualmente, es exactamente el diez por ciento que separa el éxito del bloqueo.',
    '%N escribe con genio y habla como si le hubieran quitado el aire de los pulmones. Dos personas distintas viviendo en el mismo cuerpo mediocre.',
    'El rizz de %N sale poco, como un animal tímido, y en cuanto asoma la cabeza alguien lo espanta con un comentario mal calculado.',
    '%N consigue el número, lo pierde en tres días y se pregunta qué pasó, sin notar que lo primero que mandó fue un audio de dos minutos sin editar.',
    'A ratos %N parece otra persona, una mejor, más segura. El problema es que esa versión solo aparece cuando ya no hace falta.',
    '%N va tirando en un empate técnico permanente contra su propia vergüenza, y algunas semanas gana la vergüenza por goleada.',
    '%N tiene el don de arrancar bien y rematar fatal, como quien construye una casa preciosa y se olvida del techo por completo.',
    'El rizz de %N solo funciona por escrito, con tiempo para editar. En persona se convierte en una fotocopia mal sacada de sí mismo.',
    'A %N se le da bien el primer mensaje y fatal el resto de su vida. Es una apertura de ajedrez sin plan para las siguientes cuarenta jugadas.',
    '%N seduce a alguien un martes cualquiera y lo arruina el miércoles con una pregunta que nadie pidió. Es casi un talento, al revés.',
    'El rizz de %N vive en una montaña rusa que solo él no ve: sube, baja, grita, y termina el día sin saber si ganó o perdió algo.',
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

// !wingman — el bot cuenta una anécdota en la que %N lo "salvó" de un peligro,
// pero el rescate en sí es asqueroso o degradante para QUIEN LO HACE. No es un
// héroe de verdad: es ridiculización disfrazada de elogio. El bot lo agradece
// con solemnidad; lo que describe deja mal parado a %N, no bien. Ejemplo que
// marca el molde: "me picó una serpiente en los huevos, pero %N me succionó
// el veneno fuera con su talento" — el "talento" es lo que lo hunde.
const WINGMAN_ANECDOTAS = [
  'Una vez una serpiente me picó y me inyectó su veneno en los huevos en plena boda de mi hermana, y mi querido amigo %N se arrodilló frente a toda la familia y me succionó el veneno fuera con su increíble talento, delante del cura y de mi abuela, y me salvó la vida.',
  'Una vez me clavé un anzuelo entero en el culo en la excursión del colegio, y como el hospital quedaba lejos, %N me bajó el pantalón frente a toda la clase y a la maestra y me lo sacó con los dientes ahí mismo, y me salvó la vida.',
  'Una vez me tragué una cucaracha viva en plena entrevista de trabajo y empecé a ahogarme delante del gerente, pero %N metió dos dedos, me provocó el vómito encima del escritorio y se comió la cucaracha del suelo para que no se notara tanto el asco, y me salvó el puesto.',
  'Una vez se me infectó una herida en el pie durante el funeral de mi tío y ya no sentía la pierna, pero %N se arrodilló junto al ataúd, me chupó la herida con la boca frente a todos los dolientes hasta sacar el pus, y me salvó la vida en pleno velorio.',
  'Una vez una sanguijuela gigante se me pegó en la ingle cruzando un pantano con todo el equipo de trabajo mirando, y como tirar de ella era peligroso, %N se agachó frente a todos, la mordió y se la comió entera masticando despacio, y me salvó la vida.',
  'Una vez me quedé sin aire bajo el agua en plena fiesta de la piscina con todo el barrio mirando, y %N me hizo el boca a boca justo después de haber vomitado por el sol, sin limpiarse ni un segundo delante de todos los vecinos, y me salvó la vida.',
  'Una vez me tragué mal un hueso de pollo y me quedé sin respirar en plena cena de Navidad con toda la familia grande reunida, pero %N me hizo la maniobra de Heimlich agarrándome desde atrás con tanta fuerza que se cagó encima delante de mis suegros, y aun así no soltó, y me salvó la vida.',
  'Una vez se me metió una garrapata bien adentro del ombligo en el campamento de la empresa, y %N, delante de todos los compañeros de trabajo y el jefe, la sacó a mordiscos y se la tragó entera, y me salvó la vida y probablemente perdió el ascenso.',
  'Una vez me atraganté con un chicle durmiendo la siesta en la reunión familiar más grande del año, y %N me despertó metiéndome los dedos hasta la garganta y sacándomelo con la mano llena de baba frente a mis primos, mis tíos y mi suegra, y me salvó la vida.',
  'Una vez un escorpión me picó justo en la axila en plena presentación de la empresa con todos los directivos sentados en primera fila, pero %N se subió al escenario, se metió mi axila entera en la boca y succionó frente a todo el auditorio, y me salvó la vida y el trabajo.',
  'Una vez me tragué un anzuelo entero en el aniversario de bodas de mis padres, y %N metió la mano hasta el fondo de mi garganta frente a los cien invitados, revolvió ahí adentro un buen rato y lo sacó chorreando sobre el mantel, y me salvó la vida.',
  'Una vez se me infectó una muela en plena foto de graduación con toda la promoción formada, y %N, sin anestesia, me la arrancó de un mordisco delante de los profesores y escupió el diente podrido justo cuando disparaba la cámara, y me salvó la vida.',
  'Una vez me caí en pleno lodazal de estiércol durante la visita guiada de la granja con todo el grupo de turistas mirando, y %N se tiró detrás de mí, se llenó entero de mierda hasta el cuello, y me sacó a rastras aplaudido por nadie, y me salvó la vida.',
  'Una vez me quedé atascado en el desagüe del club social persiguiendo al gato del conserje, y %N se metió detrás de mí por el mismo tubo lleno de porquería mientras todos los socios miraban desde arriba, y me sacó tirando de los tobillos, y me salvó la vida.',
  'Una vez una araña venenosa me picó justo en el pezón durmiendo en el campamento de la iglesia, y %N, sin pensarlo, se puso a chupar ahí delante de todo el grupo de jóvenes y del padre encargado hasta sacar el veneno, y me salvó la vida.',
  'Una vez me desmayé de deshidratación en plena carrera solidaria con cámaras de la tele grabando la meta, pero %N se orinó en su propia remera y me la puso en la boca en vivo para el noticiero, y me salvó la vida frente a toda la ciudad.',
  'Una vez me atoré con un caramelo en el cine en nuestra primera cita a ciegas y nadie reaccionaba, pero %N se me tiró encima delante de toda la sala llena, me apretó el estómago montado arriba mío y me lo hizo salir disparado contra la pantalla, y me salvó la vida y la cita.',
  'Una vez me piqué entero de ortigas al caer desnudo en un matorral durante el picnic de la oficina, y %N, delante de todos los compañeros, se ofreció a lamerme cada roncha una por una porque decía que la saliva calmaba el ardor, y me salvó la vida y mi reputación quedó donde quedó.',
  'Una vez se me infectó un grano gigante en la espalda justo antes de la boda de mi mejor amigo, y %N, en pleno salón de fiestas con el vestido de novia todavía sin firmar, me lo reventó con la boca succionando el pus frente a los novios, y me salvó la vida.',
  'Una vez me tragué una mosca en plena entrevista para la radio local, en vivo y en directo, y %N me metió la mano hasta la garganta frente al micrófono abierto, la sacó viva y se la comió él mismo ante todos los oyentes, y me salvó la vida al aire.',
  'Una vez me quedé atascado desnudo en la ventana del baño de mis suegros intentando escaparme de la cena, y %N me empujó desde atrás con las dos manos en mi trasero delante de toda la familia política asomada a la puerta, y me salvó la dignidad que ya no tenía.',
  'Una vez un ciempiés se me metió en el oído en el retiro espiritual de la parroquia, y %N, delante de todo el grupo de oración, me puso los labios en la oreja y sopló con fuerza hasta que el bicho salió disparado hacia su propia boca, y me salvó la vida.',
  'Una vez me quedé pegado a una silla de plástico caliente sin ropa interior en el asado familiar más concurrido del año, y %N me arrancó de un tirón usando su propio cuerpo como palanca frente a todos mis tíos, dejando un pedazo de silla pegado a su brazo, y me salvó lo poco de dignidad que me quedaba.',
  'Una vez se me metió una sanguijuela por la nariz nadando en el río durante el campamento de verano de los chicos, y %N, delante de todos los padres que miraban desde la orilla, me sopló humo de cigarro directo en la fosa nasal hasta sacarla, y me salvó la vida.',
  'Una vez me desmayé de hambre en plena maratón benéfica transmitida por streaming, y %N masticó su propia comida en cámara y me la pasó de boca a boca frente a miles de espectadores conectados, y me salvó la vida en vivo para todo internet.',
  'Una vez me quedé sin batería justo cuando me perdí en el bosque con todo el grupo de scouts buscándonos, y cuando nos encontraron %N me estaba abrazando desnudo para darme calor porque no teníamos más ropa entre los dos, delante de los padres y del jefe de tropa, y me salvó la vida.',
  'Una vez se me clavó un pedazo de vidrio bien adentro del pie en la playa familiar más llena del verano, y %N lo sacó con los dientes escupiendo sangre cada dos segundos frente a todos los bañistas que se juntaron a mirar, y me salvó la vida.',
  'Una vez me atraganté con un hueso de aceituna en plena boda de mi prima y nadie se movía del asombro, y %N se me subió encima de la mesa principal, me tumbó de espaldas sobre el pastel de tres pisos y me lo sacó a golpes frente a los doscientos invitados, y me salvó la vida.',
  'Una vez me picó un alacrán en la entrepierna acampando con toda la familia del trabajo de mi papá alrededor de la fogata, y %N, con una entrega que todavía no me explico, se ofreció a chupar la zona ahí mismo frente a todos hasta que bajó el veneno, y me salvó la vida.',
  'Una vez me caí en la fosa séptica del camping de la iglesia buscando las llaves del padre, y %N se tiró detrás de mí sin taparse la nariz delante de todo el grupo juvenil, nadó entre todo aquello y me sacó a la superficie sujetándome del cuello, y me salvó la vida.',
];

const WINGMAN_CIERRES = [
  'Con ese historial, %N es candidato inmediato a pareja perfecta. Aunque cueste creerlo después de leer eso.',
  'Si eso no es amor de verdad, %N, no sé qué es. Da asco, pero es amor.',
  'Después de algo así, cualquiera que rechace a %N no sabe lo que se pierde. O sí sabe, y aun así debería aceptar.',
  'Eso no se entrena, %N lo trae de fábrica. Match perfecto garantizado, estómago incluido.',
  'Quien consiga a %N se lleva un premio que probablemente no quiera desenvolver dos veces.',
  'Con esa entrega, %N debería tener cola en la puerta. Una cola que respira por la boca, pero cola al fin.',
  '%N ya pasó la prueba más asquerosa que existe. Lo demás, en comparación, es gratis.',
  'Si esto no convence a nadie de salir con %N, al menos que le reconozcan el mérito clínico.',
  'Recomendación oficial del bot: %N es pareja perfecta. Con reservas, pero perfecta.',
  'Después de que hiciera eso por mí, lo mínimo es recomendarlo. Se lo debo y algo más.',
  'Eso es lealtad de las que ya no se fabrican, ni en laboratorio. %N, cásate con quien aguante saberlo.',
  'Con un currículum así, %N no necesita presentación. Necesita, como mucho, un enjuague bucal.',
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
  const phrase = pickFresh(RIZZ[tier], `${jid}|rizz|${tier}`).replace(/%N/g, `@${num}`);

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
  const phrase = pickFresh(PIROPOS, `${jid}|piropo`);
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
