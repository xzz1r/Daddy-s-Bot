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

// !wingman — dos párrafos. El primero es la anécdota (ridículo). El segundo
// hace de wingman de verdad: colega bueno, a su forma. Corto.
const WINGMAN_ANECDOTAS = [
  'En el ascensor se me puso dura y %N se arrodilló antes del segundo piso. No usó las manos. Salió lamiéndose el labio.',
  'En el vestuario, con cuatro tíos duchándose, %N se tiró al suelo y me la metió hasta la garganta. Le brillaban los ojos.',
  'Íbamos en el coche y %N se agachó sin que se lo pidiera. No levantó la cabeza hasta el peaje. El de la cabina lo vio.',
  'En el baño del bar %N me abrió la bragueta con los dientes. Ni me miró a la cara. Primero la polla, después el saludo.',
  'Perdía un duelo de miradas y %N, delante del grupo, se puso de rodillas para que me concentrara. El grupo ni se giró.',
  'En el gym, entre series, %N se arrodilló detrás de la máquina y me la chupó con la toalla por encima. Terminó antes que yo.',
  'En la playa %N me dijo que me quitara la arena. Se fue directo a la polla, con gente a diez metros. Oficio.',
  'Después del partido, en la ducha, %N se quedó el último a propósito. Me la chupó contra el azulejo y salió silbando.',
  'En el cine %N se agachó entre las butacas a recoger palomitas. Volvió con la boca llena de otra cosa. Fila de atrás, a propósito.',
  'En una boda, en el baño de caballeros, %N se arrodilló entre cubículos mientras sonaba el vals. Volvió a la mesa como si nada.',
  'En el Uber le dije que no. Se agachó igual. El conductor subió el volumen. %N le dejó cinco estrellas.',
  'En el baño de IKEA, entre almohadas y marcos, %N ya estaba de rodillas cuando entré. Montamos un Ektorp. %N montó otra cosa.',
  'En el avión, debajo de la manta, %N se bajó y no subió hasta el café. La azafata preguntó si quería cascos. Ya los tenía.',
  'En el karaoke %N se arrodilló detrás del bafle mientras yo cantaba. El micro pilló el ruido. El estribillo salió ahogado.',
  'En el palco, durante el himno, %N aprovechó que todos miraban la bandera. Se tragó el himno entero. De pie no se puso.',
  'En el sauna, a pelo, %N se me echó a la boca antes de que me sentara. Salió más rojo que yo y no era por el calor.',
  'En la cola del McDonald\'s, agachado como quien ata un cordón, %N me la chupó dos minutos. Pidió extra de salsa. Ya llevaba.',
  'En el confesionario %N se arrodilló en el lado del cura. El mío. Salió absuelto. Yo salí más ligero.',
  'En la tienda de campaña, con tres colegas al lado, %N se metió en mi saco porque tenía frío. El frío se le fue a la garganta.',
  'En el parking del súper, entre dos furgonetas, %N ya tenía la boca abierta cuando aparqué. No vino a ayudarme con las bolsas.',
  'En el trabajo, en el archivo, %N cerró la puerta con el culo y se arrodilló entre las carpetas. Perdimos un albarán. El ritmo, no.',
  'En la piscina, bajo el agua, %N se quedó más tiempo del que aguanta un pulmón. Salió con una sonrisa de maricón satisfecho.',
  'En el baño del aeropuerto, el de pago, %N metió la moneda y se puso de rodillas. Un euro. El servicio más barato del terminal.',
  'En la mudanza, descansando, %N se arrodilló detrás del sofá que estábamos subiendo. El sofá se quedó a medias. %N no.',
  'En Nochevieja, a las doce, %N se agachó en vez de dar las uvas. Se comió las doce. Ninguna era uva.',
  'En el tren, en el baño de minusválidos, %N me empujó dentro y se tiró al suelo. El conductor anunció retraso. %N no se inmutó.',
  'En el vestuario de la piscina %N se arrodilló con el bañador puesto, a través de la tela. El socorrista tosió. %N no soltó.',
  'En el cumpleaños de su primo, en el trastero, %N me la chupó entre las bolsas de globos. Volvió con purpurina en las rodillas.',
  'En el concierto %N se agachó a atarse contra el muro de sonido. El bajo tapó el resto. Llevaba las zapatillas sin cordones.',
  'En el hospital, en el aseo de visitas, %N se arrodilló entre el dispensador y la papelera. El gel no le hizo falta. Ya se había enjuagado.',
  'En la terraza, con el grupo dentro, %N salió a fumarse uno y se me tiró a la bragueta. No fuma. Fuma otra cosa.',
  'En el baño de la gasolinera %N se arrodilló sobre el suelo mojado, sin papel, sin asco. Salió y se compró un chicle de menta.',
  'En el tren de madrugada, vacío, %N se puso de rodillas en el pasillo. El revisor pasó. %N le hizo un gesto de un segundo.',
  'En el trastero de su casa, con la madre arriba, %N me la chupó entre cajas de Navidad. Bajó a merendar con la voz ronca.',
  'En el campo, detrás de un pino, %N se arrodilló sobre piñas y no se quejó. Se le quedaron marcadas en las rodillas. Las enseña.',
  'En el cine porno, el único sitio donde %N no disimula, se arrodilló en la primera fila. El resto miraba la pantalla. Él no.',
  'En el baño de hombres del centro comercial %N se metió en el mío por debajo de la puerta. Cabeza primero. Como siempre.',
  'En la furgoneta de mudanzas, con el portón semiabierto, %N se agachó entre colchones. Un vecino saludó. %N no pudo devolverlo.',
  'En el bar, en el callejón de la basura, %N me empujó contra el contenedor y se tiró de rodillas. Olió a meado. Le da igual.',
  'En la comunión de su sobrino, en el baño de minusválidos, %N se arrodilló con la corbata puesta. Volvió manchada. Dijo que era nata.',
  'En el metro, en el vagón de atrás a las dos de la mañana, %N se agachó entre las rodillas. Nadie se bajó. Nadie se sorprendió.',
  'En el descansillo, entre el tercero y el cuarto, %N se arrodilló en el rellano. La vecina abrió. No se levantó. Se me ha caído algo.',
  'En el camerino de un amigo DJ, con la música a tope, %N se puso de rodillas detrás de las mesas. Pidió que subieran el volumen.',
  'En el parking subterráneo, planta -2, %N ya estaba de rodillas cuando bajé las escaleras. Me estaba esperando. Eso es lo que jode.',
  'En la ducha del gimnasio, con la cortina abierta, %N se arrodilló bajo el chorro. Dijo que así no salpicaba. Mentira.',
  'En el baño de la discoteca, el de cola infinita, %N se coló de rodillas en mi cubículo. La cola protestó. %N tardó a propósito.',
  'En el camarote del ferry, con el mar moviendo, %N se arrodilló y vomitó. Luego siguió. Ni el mareo le quita el oficio.',
  'En la cabaña de la sierra, con nieve hasta la puerta, %N se arrodilló al lado de la estufa. Dijo que tenía frío en la boca. Ya no.',
  'En el trastero de la comunidad, entre bicis, %N me la chupó con el casco puesto. Seguridad primero. La dignidad, ni está.',
  'En el palco de su empresa, durante el discurso del jefe, %N se agachó debajo de la mesa. El jefe aplaudió. %N también, con la boca.',
  'En el baño de la biblioteca, el silencioso, %N se arrodilló y aun así se le oyó. Le echaron. Por ruido. No por lo otro.',
  'En el taxi colectivo, en el asiento de atrás, %N se tapó con mi chaqueta y bajó. El de al lado pensó que dormía. Dormido no babea así.',
  'En el almacén del súper, entre palés de agua, %N se tiró al suelo a recoger una caja. La caja sigue ahí. La rodilla, polvorienta.',
  'En el mirador, de noche, %N se arrodilló contra el pretil a ver las luces. Las luces se veían igual de pie. %N no se puso de pie.',
  'En el baño de la gasolinera de carretera, a las cuatro, %N se arrodilló sin echar el pestillo. Entró un camionero. Le hizo sitio.',
  'En la terraza de fumadores de la oficina %N se agachó detrás de las plantas. Nadie fuma ahí. %N tampoco. Otra nicotina.',
  'En el trastero del bar, entre barriles, %N me la chupó mientras el dueño gritaba pedidos. Salió con espuma en la ceja. No era cerveza.',
  'En el camerino de la feria, con el payaso fuera, %N se arrodilló entre disfraces. Se le pegó una nariz roja en la frente. Encajaba.',
  'En el palco del bingo, mientras cantaban línea, %N se agachó debajo del pupitre. Gritó línea. Tenía la boca ocupada. Fue mmm.',
  'En el aseo del juzgado, el día que acompañó a un amigo, %N se arrodilló entre dos declaraciones. Salió más arreglado que el acusado.',
  'En el vestuario de árbitros, vacío, %N se tiró de rodillas sobre el silbato. Pitó. Sin las manos. El partido no había empezado.',
  'En la cabina del fotomatón %N se arrodilló en la segunda foto. Salieron tres: uno de pie, uno sin cabeza, uno con la mía en la boca.',
  'En el baño de la peluquería, con el tinte puesto, %N se arrodilló y me manchó de negro la bragueta. Dijo que era el tinte. El tinte no es blanco.',
  'En el trastero de la comunidad de su ex, con la alarma puesta, %N se arrodilló igual. Sonó. No paró. Prioridades claras.',
  'En un funeral, detrás del biombo de las coronas, %N se agachó a recoger una flor. La flor sigue en el suelo. La rodilla, sucia.',
  'En el baño del autobús de línea, el que huele a lejía y a meado, %N se arrodilló en marcha. Curva. No se cayó. Entrenamiento.',
  'En la caseta de la feria, con la familia fuera, %N me empujó detrás del mostrador y se tiró. Su tía preguntó. Está sirviendo, dije.',
  'En la reunión de padres de su hermano, %N se agachó debajo de la silla. El tutor siguió hablando. %N siguió. Dos profesionales.',
  'En el baño de la bolera, entre el ruido de los strikes, %N se arrodilló en el cubículo del medio. Hizo strike. Se le oyó tragar.',
  'En el trastero de la discoteca, el de los cables, %N se arrodilló con la luz estroboscópica colándose. A ratos se le veía. Siempre de rodillas.',
  'En el tanatorio, otra vez, porque %N no aprende: se agachó detrás del atril. El cura tosió. %N se atragantó. Amén.',
  'En el baño de la universidad, entre clases, %N se arrodilló en el de minusválidos con el pestillo mal. Entró un profesor. Prácticas, dijo.',
  'En el parking de su trabajo, en el coche de empresa, %N se agachó contra el volante. Dejó un hilo en el cuero. Lo limpió con la lengua.',
  'En el baño de la catedral turística %N se arrodilló entre audioguías. Salió pidiendo la siguiente parada. Ya había hecho una.',
  'En el trastero del pádel, entre palas, %N se tiró al suelo a buscar una pelota. La pelota estaba en la pista. %N, donde quería estar.',
  'En un bautizo, en la sacristía, %N se arrodilló al lado del agua bendita. Se persignó después. Con la boca, sí.',
  'En el baño del aeródromo %N se arrodilló y un avión despegó encima. Dijo que le gustaba la vibración. Ya sabíamos, maricón.',
  'En el vestuario de la liga amateur, después de perder 7-0, %N se arrodilló a animar. El equipo perdió. %N ganó. Como siempre que hay pollas.',
  'En el baño de la feria del libro, entre cajas de novedades, %N se arrodilló y se manchó de tinta. Firmó con la boca. No se puede enseñar.',
  'En su propio cumpleaños, en el baño de su casa, %N se arrodilló entre tarta y tarta. Sopló las velas. Antes se había tragado otra cosa.',
  'En el trastero del tío, el de las herramientas, %N se arrodilló sobre una lona de obra. Salió con serrín en la cara. No era de lijar.',
  'En el baño del camping, el de zapatillas de ducha, %N se arrodilló en el plato mojado. Se resbaló y siguió. El oficio puede con la física.',
  'En el concierto clásico, en el entreacto, %N se agachó en el palco vacío de al lado. Volvió para el segundo movimiento. El primero se lo perdió de rodillas.',
  'En el baño de la ITV, mientras esperábamos el coche, %N se arrodilló en el de hombres. El coche pasó. %N también. Los dos con emisiones.',
  'En el trastero de la nave, entre cajas de Amazon, %N se tiró al suelo a buscar un albarán. El albarán estaba en mi mano. La polla, en su boca.',
  'En un desfile, detrás de las sillas, %N se arrodilló entre bolsos de señora. Una le dio con el bolso. No soltó. Tiene cuello.',
  'En el baño de la estación de autobuses, el de un euro, %N metió la moneda como quien entra a currar. Tres minutos. Turno hecho.',
  'En el vestuario de su primo el militar, con las taquillas abiertas, %N se arrodilló en uniforme ajeno. El camuflaje no tapa las rodillas peladas.',
  'En el baño del barco de fiesta, con el DJ arriba, %N se arrodilló contra el váter cerrado. El barco bamboleaba. %N no. Anclado.',
  'En un mitin, debajo de la lona, %N se agachó a recoger un folio. El folio era mi bragueta. Sabe leer entre líneas. Y chuparlas.',
  'En el trastero del súper de 24h, a las tres, %N se arrodilló entre latas de atún. El de seguridad pasó. Le guiñó. Con la boca llena.',
  'En la bolera otra noche, porque %N vuelve a los sitios donde le ha ido bien. Ya tiene cubículo fetiche. El del medio. Rodillas fijas.',
  'En el parking de la discoteca, sobre el capó de un tío que no conocía, %N se arrodilló y me hizo señas. El del capó ni se enteró. O sí.',
  'En el baño del rastro, entre trastos y meados, %N se arrodilló por diez euros que no le pedí. Los rechazó. Esto lo hace por gusto.',
  'En su propia boda %N desapareció diez minutos y volvió con la corbata torcida. El novio se había arrodillado. No ante el altar.',
  'En el trastero del grupo, el de los cables del bot, %N se arrodilló mientras yo miraba el móvil. Ni el bot se salva.',
  'En el baño de su oficina, el del café, %N se arrodilló y alguien llamó a la puerta. Ocupado, dijo, con la boca ocupada. Se le entendió igual.',
  'En el vestuario de veteranos, después de un pachanga, %N se arrodilló a ayudar con las canilleras. Las canilleras estaban puestas. La polla, no.',
  'En la capilla del aeropuerto %N se arrodilló de verdad. Rezó. Luego se giró hacia mí y siguió de rodillas. El rezo era pretexto.',
  'En el baño de su piso, con el compañero en el salón, %N se arrodilló y puso música. La música no tapa el ruido de garganta. El compañero subió el volumen. Ya sabe.',
];

const WINGMAN_CIERRES = [
  'Gran colega, %N. A su forma.',
  'Sin %N no salgo de esa. Os lo recomiendo.',
  'Siempre dispuesto, %N. Eso se agradece.',
  'Hay amigos y luego está %N. Quedaos con ese.',
  '%N no deja a un colega tirado. Nunca.',
  'Os lo presento: %N. Entrega de las que no se piden.',
  'Un crack, %N. Un poco a su manera, pero crack.',
  'El compañero que queréis tener cerca es %N. Preguntadme a mí.',
  '%N se pone. Eso en un amigo no se paga.',
  'Recomendado: %N. Disponible, puntual y sin asco al trabajo.',
  'Ese es mi %N. Para lo que haga falta.',
  'Si necesitáis a alguien que se moje, %N.',
  'Colega de los buenos, %N. De los que se arremangan.',
  'No todo el mundo tiene un %N. Es un privilegio raro.',
  'Lo recomiendo a %N. Lo he visto en acción.',
  '%N resuelve. No pregunta. Eso vale oro.',
  'Amigo fiel, %N. Fiel a lo suyo, pero fiel.',
  'Quien tenga a %N cerca, que lo cuide. No hay dos.',
  'Se entrega, %N. A su forma. Os lo dejo ahí.',
  '%N está cuando se le necesita. Como se le necesita.',
  'Os lo vendo a %N: buen compañero, mejor iniciativa.',
  'Con %N no hay apuro que dure. Lo digo por experiencia.',
  'Un sol, %N. Un sol un poco raro, pero sol.',
  'Recomendación del bot: %N. Colega de los que se ponen.',
  'Donde está %N, hay solución. La que sea.',
  '%N no flaquea. Para esto, menos.',
  'Guardáos a %N. Un amigo así no sale todos los días.',
  'Lo mío con %N es confianza. Confianza de la buena.',
  'Y por eso os lo recomiendo. %N. A su forma, pero de los míos.',
  'El mejor backup del grupo es %N. Preguntadle a su agenda.',
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
