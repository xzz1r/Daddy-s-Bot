'use strict';

const { getTargetOrSelf, isMainOwner, isOwner, isAdmin } = require('../utils/wa');
const { rollPercent } = require('./percent');
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

// !wingman — el bot cuenta una anécdota sugerente en la que %N lo "ayudó"
// con un problema delicado. Cada entrada son dos líneas: la situación
// comprometida y el remate que cierra el chiste.
const WINGMAN_ANECDOTAS = [
  'Una vez me quedé atrapado en un ascensor con un problema muy delicado abajo y %N se arrodilló a solucionármelo con la boca durante casi veinte minutos.\nSin %N seguiría ahí atascado.',
  'Estaba a punto de perder un duelo de miradas porque no paraba de molestarme algo abajo y %N, delante de todos, se agachó a ayudarme con la lengua para que pudiera concentrarme.\nHay que admitir que %N sabe priorizar.',
  'Me quedé sin batería en el móvil y %N me lo cargó de la forma más creativa posible... usando la lengua y mucha dedicación.\n%N siempre encuentra la manera de echar una mano (o la boca).',
  'Se me atascó un anillo en un sitio bastante comprometido y %N tuvo que usar la boca con mucha paciencia para poder sacarlo.\nMenos mal que %N no tiene miedo a ensuciarse.',
  'Estaba a punto de desmayarme de calor en la playa y %N me refrescó la zona más sensible metiendo la boca y soplando aire frío.\n%N es básicamente un aire acondicionado personal.',
  'Me quedé dormido en una posición comprometedora y un mosquito se posó en un lugar delicado, así que %N se encargó de alejarlo usando la boca.\nQué nivel de compromiso el de %N.',
  'Se me pegó chicle en un sitio muy incómodo y %N se pasó un buen rato solucionándolo con la lengua hasta dejarlo limpio.\n%N no para hasta que todo queda perfecto.',
  'Estaba en un concurso de resistencia y empecé a sudar de forma excesiva abajo, entonces %N se arrodilló a ayudarme a secarme con la lengua.\nEse es mi %N, siempre dispuesto.',
  'Me entró arena en un lugar bastante delicado después de una pelea en la playa y %N me lo limpió a fondo usando la boca.\n%N tiene un talento natural para estas situaciones.',
  'Se me hinchó una zona sensible por una alergia y %N se dedicó un buen rato a desinflamármela con la boca.\nNo sé qué haría sin la ayuda tan... especial de %N.',
  'Me pilló una tormenta de arena y se me llenó de tierra una zona muy privada, así que %N se arrodilló y lo solucionó con la lengua.\n%N es el único que se ofrece voluntario para estas misiones.',
  'Se me quedó la cremallera pillada en un sitio delicado y %N tuvo que usar la boca con fuerza para liberarla sin hacerme daño.\n%N no duda ni un segundo cuando hay que meterse.',
  'Me picó una abeja en un lugar muy sensible y %N, sin pensarlo, usó la boca para sacar el aguijón.\nHay amigos... y luego está %N.',
  'Me caí y se me hinchó una zona importante, entonces %N se pasó un rato masajeándola con la lengua hasta que bajó la inflamación.\n%N tiene un toque muy particular.',
  'Estaba a punto de perder una carrera porque se me había dormido una pierna y %N se arrodilló a "despertármela" de la forma más directa posible.\nEse nivel de entrega solo lo tiene %N.',
  'Una vez se me quedó una brizna de hierba en un sitio muy delicado después de tirarme al suelo y %N se arrodilló a quitármela con la lengua.\n%N siempre resuelve lo que nadie más quiere tocar.',
  'Estaba congelándome en la montaña y se me había entumecido una zona sensible, así que %N usó la boca para devolverme el calor.\nEse nivel de entrega solo lo tiene %N.',
  'Me entró una mota de polvo en un lugar comprometido mientras conducía y %N, sin pensarlo, se inclinó a solucionarlo con la lengua.\nMenos mal que %N no tiene vergüenza.',
  'Se me pegó un trozo de cinta aislante en una zona privada y %N tuvo que arrancarla usando la boca con mucha delicadeza.\n%N es un especialista en situaciones pegajosas.',
  'Estaba a punto de perder un partido porque me picaba algo abajo de forma insoportable y %N se agachó a calmarme el problema con la lengua.\nHay que reconocer que %N sabe lo que hace.',
  'Me caí en un charco de barro y se me llenó de tierra una zona muy sensible, entonces %N se dedicó a limpiármela a fondo con la boca.\n%N no le tiene miedo a ensuciarse.',
  'Se me quedó una gota de cera de vela en un sitio delicado después de un apagón y %N la retiró usando la lengua con paciencia.\nSin %N seguiría ahí con el problema.',
  'Estaba sudando tanto en el gimnasio que se me había empapado una zona importante y %N se ofreció a secarme con la boca.\n%N siempre está disponible para estas emergencias.',
  'Me picó un insecto en un lugar bastante privado y %N usó la boca para aliviarme la hinchazón.\nQué compromiso el de %N, de verdad.',
  'Se me enredó un hilo en una zona sensible y %N tuvo que desenredarlo con la lengua durante varios minutos.\n%N no para hasta dejarlo todo perfecto.',
  'Estaba a punto de desmayarme de calor en una fiesta y %N me refrescó la zona más caliente soplando aire con la boca.\n%N es un aire acondicionado ambulante.',
  'Me quedó pegada una etiqueta de ropa en un sitio comprometido y %N la quitó usando la boca con mucho cuidado.\nHay amigos... y luego está %N.',
  'Se me hinchó una zona delicada por una rozadura y %N se dedicó un buen rato a calmarla con la lengua.\n%N tiene un toque muy particular.',
  'Estaba en la playa y se me metió una concha pequeña en un lugar privado, así que %N se arrodilló a sacarla con la boca.\n%N no duda cuando hay que meterse.',
  'Me entró champú en una zona sensible durante la ducha y %N, que estaba cerca, me ayudó a enjuagarlo con la lengua.\nEse es mi %N, siempre útil.',
  'Se me pegó un chicle en un sitio muy incómodo después de una pelea y %N se pasó un rato solucionándolo con la boca.\n%N es un experto en problemas pegajosos.',
  'Estaba a punto de perder una apuesta porque no podía dejar de rascarme abajo y %N se agachó a calmarme el picor con la lengua.\n%N sabe priorizar lo importante.',
  'Me quedó residual de crema solar en una zona delicada y %N se ofreció a limpiármela a fondo con la boca.\nMenos mal que %N no tiene asco.',
  'Se me dormió una zona sensible por estar sentado demasiado tiempo y %N usó la boca para "despertármela".\n%N tiene métodos poco convencionales.',
  'Me picó una ortiga en un lugar privado mientras caminábamos y %N se arrodilló a aliviarme el ardor con la lengua.\nQué dedicación la de %N.',
  'Estaba cubierto de polvo después de una obra y se me había acumulado en una zona comprometida, entonces %N me lo limpió con la boca.\n%N no le tiene miedo al trabajo sucio.',
  'Se me quedó una pequeña piedra en un sitio delicado después de tirarme al suelo y %N la extrajo usando la lengua.\nSin %N seguiría con el problema.',
  'Me entró agua fría en una zona sensible y se me había congelado un poco, así que %N usó la boca para devolverme el calor.\n%N siempre encuentra la forma de ayudar.',
  'Estaba a punto de arruinar una foto porque me molestaba algo abajo y %N se agachó a solucionarlo rápidamente con la lengua.\nHay que admitir que %N es resolutivo.',
  'Se me pegó un trozo de tela en una zona privada por el sudor y %N lo retiró usando la boca con paciencia.\n%N no descansa hasta dejarlo limpio.',
  'Me picó un mosquito en un lugar bastante íntimo y %N usó la boca para calmarme la picazón.\nEse nivel de compromiso solo lo tiene %N.',
  'Estaba en el sauna y se me había empapado una zona importante, entonces %N se ofreció a secarme con la lengua.\n%N es un secador personal de lujo.',
  'Se me quedó residual de jabón en un sitio delicado y %N me lo limpió a fondo con la boca.\n%N tiene un talento natural para estas cosas.',
  'Me caí en la nieve y se me había entumecido una zona sensible, así que %N usó la boca para reactivarla.\nMenos mal que %N no tiene miedo al frío.',
  'Estaba a punto de perder un juego porque me picaba algo abajo de forma insoportable y %N se arrodilló a calmarme con la lengua.\n%N sabe lo que hay que hacer.',
  'Se me enredó un cable en una zona comprometida y %N tuvo que desenredarlo usando la boca.\n%N no duda ni un segundo.',
  'Me entró arena fina en un lugar privado después de una pelea y %N me lo limpió con mucha dedicación usando la lengua.\nQué gran amigo es %N... a su manera.',
  'Se me hinchó una zona delicada por una alergia leve y %N se dedicó un rato a desinflamármela con la boca.\n%N es un antiinflamatorio ambulante.',
  'Estaba sudando tanto en un concierto que se me había empapado una zona importante y %N se ofreció a ayudarme a secarme con la lengua.\n%N siempre está ahí cuando más se necesita.',
  'Me quedó una pequeña astilla en un sitio muy sensible y %N la extrajo usando la boca con precisión.\nHay amigos normales... y luego está %N.',
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
  '%N tiene un historial que asusta y un compromiso que da más miedo todavía. Pareja ideal para valientes.',
  'Si %N es capaz de hacer eso, imagina lo que haría en una relación. Con cojones y sin límites.',
  'Lo de %N no se enseña en ningún sitio. Se nace así de bruto y con esa lealtad de mierda.',
  'Todo esto demuestra una cosa: %N no tiene vergüenza. Y eso en pareja vale más de lo que parece.',
  'Recomendación con reservas: %N no es para cualquiera, pero para el que lo aguante es un puto diamante.',
  'Después de esto, rechazar a %N ya no es opción. Es negligencia emocional con agravante.',
  '%N acaba de demostrar que lo suyo no es cariño normal. Es devoción de la que da grima y funciona.',
  'Con esa entrega, %N merece algo mejor que este grupo. Pero este grupo es todo lo que tiene, así que a disfrutarlo.',
  'Si alguien necesita pruebas de lo que %N es capaz de hacer, esto las borra todas. Compromiso total, joder.',
  'Lo de %N es material de documental. Pocos harían lo mismo y la mayoría se arrepentiría antes de empezar.',
  'Recomendación firme del bot: %N es un desastre en todo menos en lealtad. Y con eso basta para que alguien pique.',
  'Si %N pone la mitad de eso en una relación real, lo suyo es para siempre. O para el psiquiatra, según se mire.',
  '%N ha dejado claro que no tiene límites ni dignidad sobrante. Perfecto para una relación larga y confusa.',
];

// !rizz [@user] — puntúa el nivel de juego/labia (0-100).
async function cmdRizz(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const target = getTargetOrSelf(msg);
  const num = target.split('@')[0];

  // El rizz es un rasgo POSITIVO, asi que usa la misma distribucion que !linda,
  // !crack o !ganador: alto para el owner, bajo para casi todos los demas.
  //
  // Antes tenia la suya propia — Math.random()*101, plana de 0 a 100 — y por eso
  // a miembros y admins les salian porcentajes altisimos: en una distribucion
  // uniforme, tres de cada diez tiradas pasan de 70, asi que el comando repartia
  // sobresalientes a medio grupo y el sesgo del bot no se veia por ningun lado.
  // El OWNER PRINCIPAL va aparte y con su rig intacto: 88-100 garantizado,
  // variable para que no cante que está fijado. Al pasarlo por rollPercent se le
  // coló un 2 % de posibilidades de salir bajo, y eso era rebajarle el rig sin
  // que nadie lo hubiera pedido — lo que se pidió arreglar eran los porcentajes
  // de miembros y admins, no los suyos.
  const esMainOwner = isMainOwner(target, false, groupMeta);
  const esOwner = !esMainOwner && isOwner(target, false, groupMeta);
  const esAdmin = !esMainOwner && !esOwner && isAdmin(groupMeta?.participants, target);
  // 88-100 fijos cantaban tanto como los 97 de los comandos de porcentaje: un
  // rango que empieza en 88 no se parece a tener suerte con las mujeres, se
  // parece a estar escrito. Ahora sale alto pero con cifras normales, y una de
  // cada cinco veces le toca un resultado del monton, que es lo que hace que el
  // resto se lo crea.
  const percent = esMainOwner
    ? (Math.random() < 0.80 ? 58 + Math.floor(Math.random() * 28)   // 58-85
                            : 30 + Math.floor(Math.random() * 28))  // 30-57
    : rollPercent(true, esAdmin, esOwner);

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
