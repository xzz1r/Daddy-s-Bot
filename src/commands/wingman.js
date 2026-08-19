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
  'Joder, %N, tienes un culo que debería ser patrimonio de la humanidad. La UNESCO debería poner un cartelito y cobrar entrada.',
  '%N, me cago en la hostia, con esa cara tuya hasta un cura rompería los votos y se iría contigo a un motel de carretera sin mirar atrás.',
  'Mierda, %N, estás tan buena que si te miro fijamente más de tres segundos me da un ictus y muero feliz, coño.',
  '%N, tienes unas tetas que deberían venir con seguro a todo riesgo. Un puto peligro público para la circulación sanguínea de cualquiera.',
  'Hostia puta, %N, con ese cuerpo podrías provocar un accidente de tráfico en una calle peatonal. Eres un jodido atentado andante.',
  '%N, me la pones tan dura que podría abrir cocos con ella. Y mira que yo no soy manitas, coño.',
  'Joder, %N, si estuvieras más buena habría que regularte por ley. Ya eres un puto riesgo para la salud pública.',
  '%N, con ese par de piernas podrías estrangular a un oso y el oso moriría dando las gracias. Menudo jodido privilegio.',
  'Me cago en todo, %N, tienes una boca que debería ser ilegal en diecisiete países. Haces que un cabrón pierda el hilo de la vida entera.',
  '%N, joder, estás más rica que comer con las manos después de tres días sin probar bocado. Y no me refiero a comida, coño.',
  'Hostia, %N, tienes un polvo encima que si lo vendieras en la bolsa hundirías el mercado entero. Puto valor incalculable.',
  '%N, me meo en la puta, con esos ojos podrías convencer a un gilipollas de firmar su propia sentencia y encima darte las gracias.',
  'Coño, %N, deberías ir con chaleco antibalas porque esa delantera tuya va a provocar un tiroteo de miradas un día de estos, joder.',
  '%N, estás tan buena que hasta los ciegos giran la cabeza cuando pasas. No sé cómo cojones lo hacen, pero lo hacen.',
  'Joder, %N, si tu culo fuera un mapa, yo sería el puto explorador más motivado de la historia. Colón era un gilipollas comparado conmigo.',
  '%N, tienes la clase de cara que hace que un cabrón borracho escriba poesía a las cuatro de la mañana y la mande sin arrepentirse, hostia.',
  'Me cago en la leche, %N, estás más buena que el pan con mantequilla después de una resaca de tres días. Y eso es mucho puto decir.',
  '%N, coño, con ese escote podrías hipnotizar a un batallón entero y mandarlos a la guerra sin armas. Irían cagando leches y contentos.',
  'Hostia puta, %N, tienes un morbo que si lo embotellaran sería la droga más adictiva del mercado. Más que la mierda que vende el del quinto.',
  '%N, joder, cada vez que te agachas a recoger algo se para el puto tiempo. Y el corazón de media sala, ya de paso.',
  'Mierda, %N, estás tan buena que hasta tu sombra está buena. Y yo aquí, dispuesto a follarme hasta la sombra si hace falta, coño.',
  '%N, tienes un par de labios que parecen diseñados por el mismísimo diablo para joder la vida de cualquier hijo de puta que los mire.',
  'Me cago en todo lo cagable, %N, con esas curvas tuyas podrías causar un descarrilamiento de tren sin estar cerca de las vías, joder.',
  '%N, hostia, si te pillo en un callejón oscuro no te atraco, me arrodillo y te pido matrimonio como el gilipollas desesperado que soy.',
  'Coño, %N, tienes un cuerpo que parece esculpido por un pervertido con mucho talento. Una puta obra maestra del vicio.',
  'Joder, %N, estás tan buena que hasta el cura del barrio se persigna dos veces cuando pasas, una por él y otra por lo que está pensando.',
  '%N, me la suda parecer un desesperado: con esa cara tuya cualquier cabrón con sangre en las venas haría el ridículo encantado, hostia.',
  'Mierda, %N, si me dejaras olerte el cuello cinco segundos moriría más feliz que la mayoría de gilipollas que conozco. Y conozco a muchos.',
  '%N, joder, tienes un culo que si tuviera cuenta de Instagram tendría más seguidores que el papa. Y más devotos, coño, muchos más devotos.',
  '%N, hostia puta, con esas piernas podrías asfixiarme y yo pediría repetir. Menuda puta forma de morir, la mejor del catálogo.',
];

// !wingman — dos párrafos. El primero es la anécdota (ridículo, con
// principio y final). El segundo hace de wingman de verdad: colega bueno,
// a su forma. Corto.
const WINGMAN_ANECDOTAS = [
  'Una vez me quedé atrapado en el ascensor con la polla dura y %N se arrodilló a solucionármelo. Veinte minutos. Cuando abrieron las puertas se limpió el labio y saludó.',
  'Una vez se me atascó la cremallera en el baño del bar y %N la abrió con los dientes. Tardó más de lo que hacía falta. Salió y pidió otra caña.',
  'Estaba a punto de perder un duelo de miradas porque se me había puesto dura y %N, delante de todos, se agachó para que me concentrara. Gané. Él se levantó el último.',
  'Una vez en la playa se me llenó de arena la polla y %N se ofreció a limpiármela con la boca. Había gente a diez metros. A él le dio igual.',
  'Íbamos en el coche y se me puso dura. %N se bajó al asiento sin que se lo pidiera y no levantó la cabeza hasta el peaje. El de la cabina lo vio.',
  'Una vez, después del partido, %N se quedó el último en la ducha a propósito. Me la chupó contra el azulejo y salió silbando. El resto ya estaba vestido.',
  'Una vez en una boda me tiró del brazo al baño mientras sonaba el vals. %N se puso de rodillas entre cubículos. Volvimos a la mesa como si hubiéramos ido a mear.',
  'Estaba a punto de perder una apuesta y %N dijo que él se encargaba. Se arrodilló en el salón, con gente. La apuesta la gané yo. La boca la puso él.',
  'Una vez en Nochevieja, a las doce, %N se agachó en vez de darme las uvas. Se comió las doce. Ninguna era uva. Brindamos igual.',
  'Una vez en el cine %N se agachó a recoger palomitas y no se levantó hasta los trailers. Volvió con la boca llena de otra cosa. Última fila, a propósito.',
  'Una vez en el gym, entre series, se me puso dura y %N se ofreció a bajármela detrás de la máquina. Con la toalla por encima. Terminó él antes que yo.',
  'Me picó una abeja donde no se enseña y %N sacó el aguijón con la boca. Sin preguntar. Se quedó un rato más por si quedaba veneno.',
  'Una vez se me pegó chicle en la bragueta y %N se puso a quitármelo con la lengua. El chicle salió en un minuto. Él no.',
  'Estaba a punto de desmayarme de calor en una fiesta y %N me metió la polla en la boca para refrescarme. Salió y pidió hielo. Para él.',
  'Una vez me quedé dormido en su sofá con la bragueta abierta y %N se encargó. Dijo que había un mosquito. El mosquito no estaba.',
  'Se me cayó un anillo dentro de la bragueta y %N lo sacó con la boca. Paciencia de puta madre. El anillo apareció. Él siguió un poco más.',
  'Una vez en el Uber le dije que no. %N se agachó igual. El conductor subió el volumen. Al bajarnos le dejó cinco estrellas.',
  'Estaba perdiendo al FIFA y %N dijo que me relajara. Se bajó al suelo entre el sofá y la tele. Empaté. Él se levantó cuando pitó el noventa.',
  'Una vez en el avión, debajo de la manta, %N se bajó y no subió hasta el café. La azafata preguntó si queríamos cascos. Ya los tenía él.',
  'Una vez en el karaoke se me trabó la voz y %N se arrodilló detrás del bafle para que soltara. El micro pilló el ruido. El estribillo salió ahogado.',
  'Me caí en un charco y se me llenó de barro la polla. %N se ofreció a limpiármela con la lengua. El barro se fue. La dignidad de él, también.',
  'Una vez en el sauna se me puso dura del calor y %N se me echó a la boca antes de que me sentara. Salió más rojo que yo y no era por la leña.',
  'Estaba a punto de arruinar una foto de grupo porque se me había puesto dura y %N se agachó un segundo. Salió la foto. Él salió de rodillas en el recorte.',
  'Una vez se me pegó cinta aislante en la polla por una broma y %N la arrancó con los dientes. Despacio. Dijo que no quería hacerme daño. Tardó a propósito.',
  'Me picó un mosquito en la entrepierna y %N se ofreció a calmarme el picor con la boca. El picor se le olvidó. A él no se le olvidó seguir.',
  'Una vez en el parking del súper, entre dos furgonetas, %N ya tenía la boca abierta cuando aparqué. No vino a ayudarme con las bolsas.',
  'Estaba cubierto de polvo de una obra y se me había metido hasta la polla. %N me lo limpió con la lengua. El capataz preguntó y dije que estaba soplando.',
  'Una vez se me quedó la polla dormida de estar sentado tres horas y %N se ofreció a despertármela con la boca. Tardó. Yo ya estaba despierto. Él no paró.',
  'Me entró champú en la polla en la ducha y %N, que estaba en el cubículo de al lado, se coló a enjuagármela con la lengua. El champú ya se había ido.',
  'Una vez en su cumpleaños %N desapareció diez minutos y volvió con la boca brillante. Me la había chupado entre tarta y tarta. Sopló las velas después.',
  'Estaba congelándome en la sierra y se me había encogido hasta desaparecer. %N usó la boca para devolverme el calor. Lo encontró. No lo soltó.',
  'Una vez en el tren, en el baño de minusválidos, %N me empujó dentro y se tiró al suelo. El revisor anunció retraso. %N no se inmutó.',
  'Se me metió una concha en el bañador y %N se ofreció a sacarla con la boca, en la toalla, con la playa llena. La concha era pequeña. El rato, no.',
  'Una vez en el trabajo, en el archivo, se me puso dura y %N cerró la puerta con el culo. Perdimos un albarán. El ritmo, no.',
  'Me picó una ortiga andando por el campo y %N se arrodilló a aliviarme el ardor con la lengua. Se le quedaron las rodillas verdes. Las enseña.',
  'Una vez en el hospital, en el aseo de visitas, %N se ofreció a relajarme. Se arrodilló entre el dispensador y la papelera. El gel no le hizo falta.',
  'Estaba sudando en el concierto y se me había pegado el pantalón. %N se agachó contra el muro de sonido a despegármelo con la boca. Llevaba las zapatillas sin cordones.',
  'Una vez en el palco, durante el himno, %N aprovechó que todos miraban la bandera. Se tragó el himno entero. De pie no se puso.',
  'Me cayó cera de una vela en la entrepierna en un apagón y %N la retiró con la lengua. La cera salió. Él se quedó a revisar.',
  'Una vez en el vestuario, con cuatro tíos duchándose, se me puso dura y %N se tiró al suelo. Me la metió hasta la garganta. Le brillaban los ojos.',
  'Estaba a punto de perder el partido porque no podía pensar de lo dura que la tenía y %N se agachó en el banquillo. Entré. Marqué. Él se limpió y aplaudió.',
  'Una vez en el McDonalds, en la cola, %N se agachó como quien ata un cordón. Dos minutos. Pidió extra de salsa. Ya llevaba.',
  'Me quedé sin manos: bolsas, llaves, el móvil. %N dijo que me abría la bragueta. Con los dientes. Las bolsas las tuve que soltar yo.',
  'Una vez en el camping, en la tienda, %N se metió en mi saco porque tenía frío. El frío se le fue a la garganta. Los otros tres fingieron dormir.',
  'Se me enredó un hilo del calzoncillo en la polla y %N se puso a desenredarlo con la lengua. Varios minutos. El hilo era corto.',
  'Una vez en la terraza, con el grupo dentro, %N salió a fumarse uno y se me tiró a la bragueta. No fuma. Fuma otra cosa.',
  'Estaba mareado en el ferry y %N me llevó al camarote. Dijo que me iba a sentar. Se arrodilló. El barco se movía. Él no. Anclado.',
  'Una vez en el baño de la gasolinera, a las cuatro, %N se arrodilló sin echar el pestillo. Entró un camionero. Le hizo sitio. Oficio de carretera.',
  'Me dolía un calambre en el muslo en pleno partido y %N se arrodilló a masajearme. Empezó en el muslo. Terminó donde siempre. El fisio no hacía eso.',
  'Una vez en su casa, con la madre arriba, %N me bajó al trastero a buscar una caja de Navidad. Me la chupó entre adornos. Subió a merendar con la voz ronca.',
  'Estaba a punto de perder una carrera porque se me había dormido la pierna y %N se agachó a despertármela. Empezó en la pierna. La boca se le fue sola.',
  'Una vez en el metro, a las dos de la mañana, vagón casi vacío, %N se agachó entre mis rodillas. Nadie se bajó. Nadie se sorprendió.',
  'Se me pegó la crema solar en la polla y %N se ofreció a quitármela con la boca. Dijo que la toalla no llega. La toalla sí llegaba. Él no la usó.',
  'Una vez en el descansillo, entre el tercero y el cuarto, se me puso dura y %N se arrodilló en el rellano. La vecina abrió. Se me ha caído algo, dijo. No se levantó.',
  'Me picó una medusa en el muslo y %N se puso a chupar el veneno. El muslo se le olvidó. Bajó. El socorrista tosió. %N no soltó.',
  'Una vez en un funeral me tiró detrás del biombo de las coronas. %N se agachó a recoger una flor. La flor sigue en el suelo. Volvió con las rodillas sucias.',
  'Estaba tan borracho que no me tenía y %N me sentó en el váter. Se arrodilló. Dijo que así no me caía. No era por eso.',
  'Una vez perdimos al piedra papel tijera y %N eligió piedra a propósito. Se arrodilló en su cocina. Lo había planeado. El arroz se quemó.',
  'Me entró agua fría del mar y se me encogió. %N dijo que me la calentaba. Con la boca. En la orilla. Un crío preguntó qué hacía. Nada, nadando.',
  'Una vez en el baño de la discoteca, cola infinita, %N se coló de rodillas en mi cubículo. La cola protestó. %N tardó a propósito.',
  'Estaba viendo el partido en su casa y se me puso dura. %N no preguntó. Se bajó del sofá en el descanso. El segundo tiempo lo vi yo. Él, no.',
  'Una vez en el trastero de la comunidad, entre bicis, %N me la chupó con el casco puesto. Seguridad primero. La dignidad no estaba en el inventario.',
  'Se me hinchó de una rozadura y %N se ofreció a bajarme la inflamación con la boca. Un buen rato. La inflamación era otra. La bajó igual.',
  'Una vez en el palco de su empresa, durante el discurso del jefe, %N se agachó debajo de la mesa. El jefe aplaudió. %N también, con la boca.',
  'Me quedé atascado en un pantalón estrecho en el probador y %N entró a ayudarme. La cremallera la abrió con los dientes. El pantalón se quedó a medias. Él no.',
  'Una vez en el cine porno, el único sitio donde %N no disimula, se arrodilló en la primera fila. El resto miraba la pantalla. Él no.',
  'Una vez me despertó a las siete porque se me había puesto dura dormido. %N ya estaba debajo de la sábana. Dijo buenos días con la boca llena.',
  'Se me metió una piedra del camino en el pantalón y %N se ofreció a sacarla. Se arrodilló en la cuneta. La piedra salió. El de atrás pitó. Él no se giró.',
  'Una vez en el baño de la biblioteca %N se arrodilló y aun así se le oyó. Le echaron. Por ruido. No por lo otro.',
  'Me dolía la espalda de cargar cajas y %N me sentó en el sofá a masajearme. El masaje bajó. Terminó de rodillas. Las cajas se quedaron en el rellano.',
  'Una vez en un bautizo, en la sacristía, %N se arrodilló al lado del agua bendita. Se persignó después. Con la boca, sí.',
  'Estaba haciendo cola en el cajero y se me puso dura. %N se agachó a atarse. No llevaba cordones. El de detrás tosió. %N no se ató nada.',
  'Una vez en el taxi, en el asiento de atrás, %N se tapó con mi chaqueta y bajó. El de al lado pensó que dormía. Dormido no babea así.',
  'Una vez estaba yo en boxer cocinando y %N se me tiró de rodillas entre el fogón y la nevera. La cebolla se quemó. Él no levantó la cabeza.',
  'Se me pegó un trozo de tela del pantalón por el sudor y %N lo retiró con la boca. En el vestuario. Con la puerta abierta. Dijo que había calor.',
  'Una vez en su propia boda %N desapareció diez minutos y volvió con la corbata torcida. Se había arrodillado. No ante el altar. Ante mí.',
  'Estaba jugando a la Play y %N se aburrió. Se bajó entre mis piernas en mitad de la ranked. Perdí. Él ganó. Como siempre que hay polla.',
  'Una vez en el baño del aeropuerto, el de pago, %N metió el euro y se puso de rodillas. El servicio más barato del terminal. Tres minutos. Turno hecho.',
  'Me resbalé en la nieve y se me metió hasta en la polla. %N se ofreció a descongelarme con la boca. En el aparcamiento. El frío era una excusa.',
  'Una vez en el camerino de un amigo DJ, música a tope, %N se puso de rodillas detrás de las mesas. Pidió que subieran el volumen. No era por la música.',
  'Estaba a punto de correrme en su boca y %N no se apartó. Se la tragó. Me preguntó si necesitaba algo más. Un vaso de agua, dije. Me lo trajo de rodillas.',
  'Una vez perdió %N. Piedra papel tijera. Mejor de tres. Perdió las tres. Se arrodilló en el rellano. Le tenía ganas. El juego era el disfraz.',
  'Me puse nervioso antes de hablar en público y %N me llevó al baño a relajarme. Se arrodilló. Salí y hablé. Él se quedó un segundo más, por si acaso.',
  'Una vez en el parking subterráneo, planta menos dos, %N ya estaba de rodillas cuando bajé las escaleras. Me estaba esperando. Eso es lo que jode.',
  'Se me hinchó de un golpe en un partido y %N se ofreció a bajarme la hinchazón con la boca. En el vestuario. La hinchazón era el pretexto. Él tenía hambre.',
  'Una vez en la comunión de su sobrino, en el baño de minusválidos, %N se arrodilló con la corbata puesta. Volvió manchada. Dijo que era nata.',
  'Estaba yo meando y %N se arrodilló a sostenérmela. No hacía falta. No meó él. Hizo otra cosa. El grifo lo abrió después, por el ruido.',
  'Una vez en el almacén del súper, entre palés, %N se tiró al suelo a recoger una caja. La caja sigue ahí. La rodilla, polvorienta. La boca, ocupada.',
  'Me dio un hipo de los cojones y %N dijo que tenía un truco. El truco era arrodillarse y metérmela. El hipo se fue. Él se quedó.',
  'Una vez en el bar, en el callejón de la basura, %N me empujó contra el contenedor y se tiró de rodillas. Olió a meado. Le da igual. Oficio.',
  'Estaba colgando un cuadro y se me puso dura en la escalera. %N se puso debajo. Dijo que me sujetaba. Me sujetó la polla. El cuadro salió torcido.',
  'Una vez en el baño de su oficina, el del café, %N se arrodilló y alguien llamó a la puerta. Ocupado, dijo, con la boca ocupada. Se le entendió igual.',
  'Me puse a hacer flexiones por una apuesta y %N se metió debajo. Cada bajada, la boca. Perdí de cansancio. Él, no.',
  'Una vez en el vestuario de veteranos, después de un pachanga, %N se arrodilló a ayudarme con las canilleras. Las canilleras estaban puestas. La polla, no.',
  'Estaba yo en una videollamada y %N se metió debajo de la mesa. La cámara no lo pilló. El micro sí. Dije que era el perro. No tengo perro.',
  'Una vez en la capilla del aeropuerto %N se arrodilló de verdad. Rezó. Luego se giró hacia mí y siguió de rodillas. El rezo era el pretexto.',
  'Me pidió fuego en la terraza de fumadores. No fumo. %N se agachó detrás de las plantas igual. Nadie fuma ahí. %N tampoco.',
  'Una vez en su piso, con el compañero en el salón, %N se arrodilló en el baño y puso música. La música no tapa el ruido de garganta. El compañero subió el volumen. Ya sabe.',
  'Se me cayó el jabón en la ducha del gym y %N se agachó a recogerlo. Con la cortina abierta. El jabón lo dejó. La polla, no.',
  'Una vez, la primera noche que salimos, %N ya sabía el orden. Primero la polla. Después el saludo. Me abrió la bragueta con los dientes y ni me miró a la cara.',
];

const WINGMAN_CIERRES = [
  'Gran colega, %N. A su forma.',
  'Sin %N no salgo de esas. Os lo recomiendo.',
  'Siempre dispuesto, %N. Eso se agradece.',
  'Hay amigos y luego está %N. Quedaos con ese.',
  '%N no deja a un colega tirado. Nunca.',
  'Os lo presento a %N. De los que se ponen cuando hace falta.',
  'Un crack, %N. Un poco a su manera, pero crack.',
  'El compañero que queréis cerca es %N. Preguntadme a mí.',
  '%N se pone. Eso en un amigo no se paga.',
  'Si necesitáis a alguien que se moje, %N. Sin dudar.',
  'Ese es mi %N. Para lo que haga falta.',
  'Colega de los buenos, %N. De los que se arremangan.',
  'No todo el mundo tiene un %N. Es un privilegio raro.',
  'Lo recomiendo a %N. Lo he visto en acción.',
  'A %N le pedís algo y se pone. Así de fácil.',
  'Amigo fiel, %N. Fiel a lo suyo, pero fiel.',
  'Quien tenga a %N cerca, que lo cuide. No hay dos.',
  'Se entrega, %N. A su forma. Os lo dejo ahí.',
  '%N está cuando se le necesita. Como se le necesita.',
  'Os lo vendo a %N: buen compañero, mejor iniciativa.',
  'Con %N no hay apuro que dure. Lo digo por experiencia.',
  'Un sol, %N. Un sol un poco raro, pero sol.',
  'Recomendación mía: %N. Colega de los que se ponen.',
  'Donde está %N hay solución. La que sea.',
  '%N es de los míos. Os lo presto. Cuidádmelo.',
  'Guardáos a %N. Un amigo así no sale todos los días.',
  'Lo mío con %N es confianza. Confianza de la buena.',
  'Y por eso os lo recomiendo. %N. A su forma, pero de los míos.',
  'Si hay un apuro, %N. Preguntadme a mí, que lo he visto.',
  'El que se pone sin que se lo pidas es %N. Conservadlo.',
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
