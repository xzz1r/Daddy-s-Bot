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
  'Joder, %N, tienes un culo tan perfecto que me lo follaría a cuatro patas hasta dejarte temblando y baboso, y después te lo volvería a comer hasta el fondo, coño.',
  '%N, me cago en la hostia, con esa cara de puta fina te la metía entera hasta que se te salieran los ojos y me corrías en la garganta sin avisar, gilipollas.',
  'Mierda, %N, estás tan buena que te abriría las piernas en público, te lamería el coño hasta dejarte seco y luego te follaría el culo sin lubricante solo para oírte gritar, joder.',
  '%N, tienes unas tetas que me las chuparía hasta dejarlas moradas, te las exprimiría la leche si tuvieras y me corrías entre ellas como un puto animal, hostia.',
  'Hostia puta, %N, con ese cuerpo te montaría a pelo en el coche, te reventaría el coño hasta que sangraras de placer y te dejaría el culo abierto como un túnel, cabrón.',
  '%N, me la pones tan dura que te la metería por la boca, por el coño y por el culo en la misma sesión hasta que no pudieras caminar ni hablar, coño de la madre.',
  'Joder, %N, si estuvieras más buena te ataría a la cama, te follaría las tres agujeros hasta dejarlos destrozados y te llenaría de leche por dentro y por fuera, puta.',
  '%N, con ese par de piernas te las abriría hasta casi partirte, te comería el culo durante una hora y luego te la metería tan profundo que te saldría por la boca, joder.',
  'Me cago en todo, %N, tienes una boca de puta profesional: te la metería hasta los huevos, te haría tragar la leche y después te la volvería a meter sucia, hostia puta.',
  '%N, joder, estás más rica que un coño recién afeitado y chorreando. Te lamería hasta el último pliegue, te follaría a pelo y te dejaría goteando leche por las piernas, coño.',
  'Hostia, %N, tienes un polvo que si te pillara te reventaría el culo a pollazos hasta que pidieras perdón por existir, y todavía te pediría otra ronda, gilipollas.',
  '%N, me meo en la puta, con esos ojos de zorra te haría arrodillarte, te follaría la cara hasta dejártela llena de saliva y leche, y te haría limpiarme con la lengua, joder.',
  '. Te lo abriría con los dedos, te lo lamería y te lo follaría hasta dejarte incontinente de placer, hostia.',
  '%N, estás tan buena que te comería el coño y el culo al mismo tiempo, te haría correrte a chorros y luego te follaría la boca con el sabor de tu propia mierda, cabrón.',
  'Joder, %N, si tu culo fuera un puto altar yo sería el sacerdote que te lo consagra a pollazos diarios hasta que se te quede abierto permanente, coño.',
  '%N, tienes la cara de quien se traga pollas como churros. Te la metería hasta que se te hinchara el cuello y te corrías en la garganta sin sacar, hostia puta.',
  'Me cago en la leche, %N, estás más buena que un gangbang de putas. Te montaría con dos tíos más, te llenaríamos los tres agujeros y te dejaríamos hecha un trapo, joder.',
  '%N, coño, con ese escote te las sacaría, te las follaría entre las tetas hasta correrme en la cara y te haría lamerte la leche de los pezones, gilipollas.',
  'Hostia puta, %N, tienes un morbo de zorra de barrio. Te ataría, te vendaría, te follaría el culo sin piedad y te dejaría con la leche chorreando por las piernas todo el día, cabrón.',
  '%N, joder, cada vez que te agachas se me pone la polla como un hierro. Te la metería ahí mismo, te follaría el culo en público y te haría gritar mi nombre, coño.',
  'Mierda, %N, estás tan buena que hasta tu sombra se la follaría. Te montaría a pelo, te llenaría de leche el coño, el culo y la boca, y te haría dormir con ella dentro, joder.',
  '%N, tienes unos labios de puta de lujo. Te los abriría con la polla, te follaría la boca hasta que babearas y te corrías en la lengua para que te la tragues, hostia.',
  'Me cago en todo lo cagable, %N, con esas curvas te reventaría el coño y el culo en la misma noche hasta que no pudieras sentarte en una semana, puta de mierda.',
  '%N, hostia, si te pillo en un callejón te bajo los pantalones, te como el culo y te la meto hasta el fondo sin preguntar. Y tú me darías las gracias, gilipollas.',
  'Coño, %N, tienes un cuerpo de puta de alto standing. Te follaría en todas las posiciones, te llenaría de leches y te dejaría marcado el culo con mis manos, joder.',
  'Joder, %N, estás tan buena que el cura del barrio se la cascaría pensando en ti. Yo te la metería de verdad, te reventaría el culo y te haría rezar de placer, hostia puta.',
  '%N, me la suda parecer desesperado: te follaría el culo ahora mismo, te haría correrte a gritos y te dejaría con la leche escurriendo por las piernas, cabrón.',
  'Mierda, %N, si me dejaras te olería el coño, te lo lamería hasta el clítoris, te lo follaría a pelo y te corrías dentro hasta que se te hinchara la barriga, coño.',
  '%N, joder, tienes un culo que me lo comería a mordiscos, te lo follaría hasta dejarlo rojo y abierto, y después te lo volvería a lamer limpio, puta.',
  '%N, hostia puta, con esas piernas te las pondría en mis hombros, te follaría el coño hasta el útero y te haría correrte tantas veces que te desmayarías, gilipollas.',
  'Joder, %N, te abriría el culo con la lengua, te metería los huevos dentro y te follaría hasta que pidieras que pare, pero no pararía, cabrón de mierda.',
  '%N, me cago en tu puta madre, con ese cuerpo te usaría de puta personal: te follaría cuando quisiera, te llenaría de leche y te haría limpiarme con la boca, hostia.',
  'Mierda, %N, estás tan zorra que te pondría de rodillas, te follaría la cara hasta dejártela irreconocible y te haría tragar hasta la última gota, joder.',
  '%N, tienes unas tetas perfectas para follártelas. Te las apretaría, te corrías entre ellas y te haría lamerte la leche de los pezones como una puta buena, coño.',
  'Hostia puta, %N, te montaría a cuatro patas, te reventaría el culo a pollazos y te dejaría con el agujero abierto y chorreando leche todo el día, gilipollas.',
  '%N, joder, te comería el coño hasta que te corrieras en mi cara, te follaría a pelo y te llenaría por dentro hasta que se te notara en la barriga, cabrón.',
  'Me cago en todo, %N, con esa boca de puta te la metería dos veces al día, te haría tragar y después te la metería por el culo sucia, hostia.',
  '%N, estás más buena que un gangbang. Te llenaría los tres agujeros a la vez, te haría correrte a gritos y te dejaría hecha un trapo de leche y saliva, joder.',
  'Coño, %N, te ataría a la cama, te follaría el coño y el culo sin descanso y te dejaría con la leche chorreando por los dos agujeros, puta de lujo.',
  '%N, hostia, si te pillo te bajo todo, te como el culo durante media hora y te la meto tan profundo que te sale por la boca, gilipollas.',
  'Joder, %N, tienes un culo que merece ser follado a diario hasta que se te quede permanente abierto. Yo me ofrezco voluntario, cabrón.',
  '%N, me la pones tan dura que te la metería ahora mismo por la boca, te haría babear y te corrías en la garganta sin sacar, coño de Dios.',
  'Mierda, %N, estás tan zorra que te follaría en el baño de un bar, te llenaría el culo de leche y te haría volver a la mesa sin limpiarte, hostia puta.',
  '%N, con esas piernas te las abriría en V, te lamería el coño y el culo y te follaría hasta que no pudieras cerrar las piernas, joder.',
  'Hostia, %N, te reventaría el coño a pollazos, te haría correrte a chorros y después te follaría la boca con el sabor de tu propio coño, gilipollas.',
  '%N, joder, tienes un polvo de puta profesional. Te montaría horas, te llenaría de leche y te dejaría temblando y pidiendo más, cabrón.',
  'Me cago en la puta, %N, con ese cuerpo te usaría de juguete sexual: te follaría cuando me diera la gana y te dejaría marcado, coño.',
  '%N, estás tan buena que te comería el culo a lengüetazos, te lo abriría con los dedos y te lo follaría hasta dejarte incontinente, hostia.',
  'Coño, %N, te pondría de rodillas, te follaría la cara hasta dejártela llena de saliva y leche, y te haría darme las gracias, puta.',
  '%N, hostia puta, te montaría a pelo, te reventaría los tres agujeros y te dejaría goteando leche por todos lados, gilipollas de mierda.',
];

// !wingman — el bot cuenta una anécdota sugerente en la que %N lo "ayudó"
// con un problema delicado. Cada entrada son dos líneas: la situación
// comprometida y el remate que cierra el chiste.
const WINGMAN_ANECDOTAS = [
  'Una vez me estaba cagando sangre en el váter de un puto bar de carretera y %N entró sin avisar, se arrodilló y me limpió el culo a lengüetazos hasta que dejé de sangrar.\nSin %N habría muerto deshidratado en un baño de mierda apestando a mierda.',
  'Me pilló un infarto en plena calle y %N, en vez de llamar a una ambulancia, me practicó reanimación boca a boca mientras me apretaba los huevos para mantenerme consciente.\nEse nivel de prioridades solo lo tiene un cabrón como %N.',
  'Estaba a punto de suicidarme saltando de un puente y %N me detuvo agarrándome de los huevos con la boca. Literalmente me salvó la vida chupándome la polla en el aire.\n%N tiene métodos de puta madre de efectivos.',
  'Me quedó una puta aguja de heroína clavada en el brazo después de una noche de mierda y %N me la sacó con los dientes, chupando la sangre y el resto de la mierda que quedaba.\nHay amigos y luego está %N, que no tiene asco ni dignidad.',
  'Estaba vomitando bilis en la cuneta después de una borrachera de los cojones y %N se arrodilló a limpiarme la boca con la lengua para que no me ahogara en mi propia mierda.\n%N es el único cabrón que se ofrece a tragar tu vomitona.',
  'Me estaba desangrando por un corte de navaja en un callejón y %N me detuvo la hemorragia chupando la herida y escupiendo la sangre como si fuera un puto vampiro de barrio.\nSin %N habría muerto como un perro en la mierda.',
  'Se me reventó un forúnculo del tamaño de un huevo en el culo y %N se dedicó a chupar el pus y la sangre hasta dejarlo limpio. Delante de tres tíos que se echaron a reír.\n%N no tiene vergüenza ni un gramo de dignidad.',
  'Me quedé atrapado en un puto contenedor de basura con diarrea explosiva y %N entró, me limpió el culo con la lengua y me sacó a hombros apestando a mierda.\nEse es el nivel de entrega de este cabrón.',
  'Estaba a punto de morir de una sobredosis en un baño de discoteca y %N me salvó metiéndome los dedos hasta la garganta y luego chupándome la boca para sacar el resto.\n%N sabe exactamente qué hacer cuando la mierda aprieta.',
  'Me pilló una puta infección de transmisión en el nabo y %N se dedicó a chupar el pus y la mierda hasta que bajó la inflamación. Sin preguntar ni una puta vez.\nHay cabrones y luego está %N.',
  'Se me reventó un quiste en los huevos y %N se arrodilló delante de todo el grupo a chupar el líquido verde hasta que se me pasó el dolor.\n%N es un puto cirujano de la lengua sin título ni asco.',
  'Me estaba cagando vivo de cólera en un puto aeropuerto y %N me acompañó al baño, me limpió el culo a lengüetazos y me cambió de ropa como si nada.\nEse nivel de compromiso asqueroso solo lo tiene %N.',
  'Estaba a punto de perder un riñón por una piedra del tamaño de una bala y %N me ayudó a expulsarla chupándome la polla con tanta fuerza que salió de un golpe.\n%N tiene una técnica de puta madre.',
  'Me quedó un puto trozo de cristal clavado en el culo después de una pelea de borrachos y %N me lo sacó con los dientes, lamiendo la sangre para no manchar.\nSin %N seguiría con un cristal en el ojete.',
  'Estaba ahogándome en mi propia vomitona después de una fiesta de mierda y %N me practicó una especie de Heimlich bucal hasta que saqué todo y se lo tragó.\n%N no desperdicia nada, el muy cabrón.',
  'Me picó una puta medusa en los huevos en la playa y %N se dedicó a chupar el veneno durante diez minutos mientras yo gritaba como un maricón.\nHay amigos... y luego está este animal.',
  'Se me hinchó el nabo por una alergia de la hostia y %N se pasó media hora desinflamándomelo con la boca delante de la gente del camping.\n%N no tiene sentido del ridículo ni del asco.',
  'Me quedé dormido borracho en un puto parque y un perro me estaba oliendo el culo, entonces %N se arrodilló y me limpió la mierda residual con la lengua para que no me comiera el animal.\nEse es mi %N, siempre útil.',
  'Estaba a punto de morir de sed en el desierto y %N me ofreció saliva y luego me chupó los labios secos hasta que pude tragar.\n%N improvisa soluciones de puta madre cuando la mierda aprieta.',
  'Me reventaron la nariz en una pelea y %N me limpió la sangre a lengüetazos, tragándose los coágulos como si fuera un puto postre.\nPocos cabrones llegan tan lejos por un amigo.',
  'Se me atascó un puto tampón en el culo después de una apuesta de borrachos y %N me lo sacó con los dientes y se lo tragó para no dejar pruebas.\n%N es un profesional del trabajo sucio.',
  'Estaba cagándome en los pantalones en medio de una reunión importante y %N me sacó al baño, me limpió el culo con la lengua y me prestó su ropa interior.\nEse nivel de lealtad asquerosa es de admirar.',
  'Me quedó una puta sanguijuela pegada en los huevos después de un río y %N se la arrancó con la boca y se la comió cruda.\n%N no le tiene miedo a nada que se mueva.',
  'Estaba a punto de desmayarme de una puta anemia y %N me dio de beber su propia sangre de un corte en el brazo para mantenerme vivo.\n%N es un puto vampiro solidario.',
  'Se me reventó un absceso en la encía y %N me chupó el pus hasta dejarlo limpio, tragándoselo sin inmutarse.\nHay que reconocer que este cabrón se entrega por completo.',
  'Me estaba muriendo de una puta intoxicación alimentaria y %N me provocó el vómito metiéndome la lengua hasta la garganta y luego me limpió la boca.\n%N sabe exactamente qué hacer en una emergencia de mierda.',
  'Estaba atrapado en un puto ascensor con diarrea explosiva y %N me limpió el culo, me secó con la lengua y me mantuvo la moral alta contándome chistes de mierda.\nSin %N habría muerto de vergüenza y de deshidratación.',
  'Me picó una puta araña en el nabo y se me hinchó como un balón, entonces %N se dedicó a chupar el veneno y el líquido hasta que bajó.\n%N es un antiinflamatorio ambulante de la peor especie.',
  'Se me quedó una puta aguja de coser clavada en el dedo y %N me la sacó con los dientes, chupando la sangre para que no manchara la mesa.\nMenos mal que cuento con un cabrón tan dispuesto.',
  'Estaba a punto de perder un dedo por una infección de mierda y %N me drenó el pus a succión durante media hora hasta que se me pasó.\n%N tiene una paciencia y un asco nulo envidiables.',
  'Me caí de un puto andamio y me abrí la cabeza, entonces %N me limpió la sangre a lengüetazos y me mantuvo despierto chupándome la oreja.\nEse nivel de improvisación solo lo tiene %N.',
  'Se me reventó un forúnculo en la cara y %N se dedicó a chupar el pus delante de todo el grupo para que no se me infectara más.\n%N no tiene vergüenza ni un puto gramo de dignidad.',
  'Estaba vomitando en el baño de un puto avión y %N entró, me sujetó la cabeza y me limpió la boca con la lengua entre arcada y arcada.\nPocos amigos se ofrecen a tragar tu bilis.',
  'Me quedó un puto trozo de hueso de pollo clavado en la garganta y %N me lo sacó con la lengua, tragándoselo después como si nada.\n%N siempre encuentra la forma más personal de echar una mano.',
  'Estaba a punto de morir de una puta insolación y %N me refrescó el cuerpo entero a lengüetazos, concentrándose en las zonas más calientes.\n%N es un aire acondicionado de carne y hueso.',
  'Se me hinchó un tobillo del tamaño de un melón después de un golpe de mierda y %N se pasó casi una hora aplicándome succión con la boca.\n%N tiene métodos poco convencionales pero de puta madre.',
  'Me corté la mano con un cuchillo de cocina y me salía sangre a chorros, entonces %N me detuvo la hemorragia chupando la herida como un puto profesional.\nSiempre es bueno tener a alguien como %N cerca.',
  'Estaba cagándome vivo de miedo en un puto callejón oscuro y %N me calmó chupándome los huevos hasta que se me pasó el temblor.\n%N sabe exactamente cómo motivar a un cobarde.',
  'Se me metió una puta mosca en el oído y %N la sacó aspirando con la boca y se la tragó para que no volviera.\nPocos se ofrecerían a algo tan asqueroso.',
  'Me dolía una puta barbaridad el culo después de una caída y %N se arrodilló a masajearme el ojete con la lengua hasta que se me pasó.\n%N realmente se toma en serio el bienestar de los demás.',
  'Estaba con una sed de los demonios en medio de la nada y %N me ofreció saliva, luego me chupó los labios y me dio de beber de su propia boca.\n%N improvisa soluciones cuando realmente hace falta.',
  'Se me quedó residual de mierda en el culo después de una diarrea y %N me lo limpió a fondo con la lengua para que no apestara en la reunión.\n%N no le tiene miedo al trabajo sucio.',
  'Me picó una puta ortiga en los huevos y %N se arrodilló a aliviarme el ardor con la lengua durante un buen rato.\nQué dedicación la de este animal.',
  'Estaba sudando como un puto cerdo en un sauna y %N me secó el cuerpo entero a lengüetazos, concentrándose en las zonas más húmedas.\n%N es un secador personal de lujo asqueroso.',
  'Se me enredó un puto cable en los huevos y %N tuvo que desenredarlo usando la boca con paciencia de santo.\n%N no duda ni un segundo cuando hay que meterse.',
  'Me entró arena hasta en el puto ojete después de una pelea en la playa y %N me lo limpió con mucha dedicación usando la lengua.\nQué gran amigo es %N... a su manera de mierda.',
  'Estaba a punto de perder una apuesta de resistencia de los cojones y %N me mantuvo despierto dándome mordiscos y lamidas en los huevos.\n%N siempre encuentra la manera de motivarte.',
  'Me quemé el nabo con aceite caliente de los demonios y %N me lo enfrió metiéndoselo en la boca y soplando aire frío.\n%N improvisó un tratamiento bastante efectivo y asqueroso.',
  'Se me quedó una puta pestaña en el ojo y %N la sacó con la punta de la lengua sin dudar, tragándosela después.\n%N tiene una precisión notable para estas mierdas.',
  'Estaba con un hipo persistente de los cojones y %N me lo quitó dándome un susto... a base de meterme la lengua en el culo de forma inesperada.\n%N tiene métodos poco ortodoxos pero efectivos.',
  'Me picaba la espalda en un lugar imposible de alcanzar y %N me la rascó con la lengua hasta que se me pasó, dejando saliva por todas partes.\nPocos amigos llegan tan lejos y tan asquerosos.',
  'Estaba con la garganta muy irritada y %N me aplicó saliva de forma repetida, metiéndome la lengua hasta casi ahogarme.\n%N siempre busca la forma más directa de solucionar las cosas.',
  'Se me hinchó un labio por un golpe de mierda y %N se dedicó a bajar la inflamación con succión suave, tragándose la sangre residual.\n%N tiene una paciencia y una técnica particulares.',
  'Me dolía la mandíbula después de bostezar como un puto león y %N me hizo un masaje profundo con la lengua hasta que se me pasó.\nPocos amigos se involucran tanto y tan sucio.',
  'Estaba con una tensión de los cojones en los hombros y %N me los masajeó con la boca hasta que se me relajaron por completo, dejando marcas de dientes.\n%N realmente se toma en serio el bienestar de los demás.',
  'Me quedé atrapado en un puto baño público con el pantalón bajado y diarrea, y %N entró, me limpió, me vistió y me sacó sin que nadie se diera cuenta.\nEse nivel de lealtad asquerosa es de puta madre.',
  'Estaba a punto de morir de una puta insolación en la playa y %N me cubrió el cuerpo con saliva y me sopló aire frío en los huevos para mantenerme consciente.\n%N es un sistema de refrigeración de carne.',
  'Se me reventó un quiste sebáceo en la espalda y %N se dedicó a chupar el pus y la mierda hasta dejarlo limpio, delante de tres tíos.\n%N no tiene sentido del ridículo.',
  'Me estaba desangrando por una herida de cristal en la pierna y %N me detuvo la hemorragia chupando la sangre y escupiendo los coágulos.\nSin %N habría muerto como un perro.',
  'Estaba vomitando bilis negra después de una resaca de tres días y %N me sujetó la cabeza y me limpió la boca entre arcada y arcada, tragándose lo que podía.\nPocos cabrones se ofrecen a eso.',
  'Me quedó una puta espina de pescado clavada en la garganta y %N me la sacó con la lengua, se la tragó y me dio un beso de mierda para celebrarlo.\n%N siempre encuentra la forma más personal.',
  'Estaba a punto de perder un dedo por gangrena de mierda y %N me drenó el pus a succión durante casi una hora hasta que se me pasó el color negro.\n%N tiene una paciencia de santo asqueroso.',
  'Se me metió una puta cucaracha en el oído y %N la sacó aspirando con la boca y se la comió cruda para que no volviera.\n%N no le tiene miedo a nada que se mueva.',
  'Me dolía una puta barbaridad el culo después de una caída en bicicleta y %N se arrodilló a masajearme el ojete con la lengua hasta que se me pasó el dolor.\n%N realmente se pone a disposición.',
  'Estaba sudando como un cabrón en una situación importante y %N me secó la frente, el cuello y los huevos con la lengua para que no oliera a cerdo.\n%N siempre busca la forma de que estés presentable.',
  'Se me quedó residual de mierda en el culo después de una diarrea explosiva y %N me lo limpió a fondo con la lengua para que no apestara en el metro.\n%N no le tiene miedo al trabajo más sucio.',
  'Me picó una puta avispa en el nabo y %N se dedicó a chupar el veneno y el líquido durante diez minutos mientras yo gritaba.\nQué compromiso el de este animal.',
  'Estaba a punto de desmayarme de calor de los cojones y %N me refrescó el cuerpo entero a lengüetazos, concentrándose en las zonas más calientes y privadas.\n%N es un aire acondicionado ambulante de mierda.',
  'Se me enredó un puto hilo de pescar en los huevos y %N tuvo que desenredarlo usando la boca con paciencia de monje.\n%N no para hasta dejarlo todo perfecto y asqueroso.',
  'Me entró champú en los ojos y en el culo durante la ducha y %N, que estaba cerca, me ayudó a enjuagarlo todo con la lengua.\nEse es mi %N, siempre útil y sin asco.',
  'Estaba cubierto de polvo y mierda después de una obra y se me había acumulado en el ojete, entonces %N me lo limpió con la boca.\n%N no le tiene miedo al trabajo sucio de la construcción.',
  'Se me quedó una pequeña piedra en el culo después de tirarme al suelo y %N la extrajo usando la lengua con precisión de cirujano.\nSin %N seguiría con el problema en el ojete.',
  'Me entró agua fría en el nabo y se me había congelado un poco, así que %N usó la boca para devolverme el calor de la forma más directa.\n%N siempre encuentra la forma de ayudar.',
  'Estaba a punto de arruinar una foto importante porque me molestaba algo abajo y %N se agachó a solucionarlo rápidamente con la lengua delante de la cámara.\nHay que admitir que %N es resolutivo y sin vergüenza.',
  'Se me pegó un trozo de tela en el culo por el sudor y %N lo retiró usando la boca con paciencia, dejando saliva por todas partes.\n%N no descansa hasta dejarlo limpio.',
  'Me picó un mosquito en el nabo y %N usó la boca para calmarme la picazón, chupando hasta que se me pasó.\nEse nivel de compromiso solo lo tiene este cabrón.',
  'Estaba en el sauna y se me había empapado el culo, entonces %N se ofreció a secarme con la lengua de forma muy personal.\n%N es un secador personal de lujo asqueroso.',
  'Se me quedó residual de jabón en el ojete y %N me lo limpió a fondo con la boca, tragándose lo que sobraba.\n%N tiene un talento natural para estas mierdas.',
  'Me caí en la nieve y se me había entumecido el nabo, así que %N usó la boca para reactivarlo de la forma más directa posible.\nMenos mal que %N no tiene miedo al frío ni al ridículo.',
  'Estaba a punto de perder un juego porque me picaba algo abajo de forma insoportable y %N se arrodilló a calmarme con la lengua delante de todos.\n%N sabe lo que hay que hacer y no le importa quién mire.',
  'Se me enredó un cable de auriculares en los huevos y %N tuvo que desenredarlo usando la boca con mucha paciencia.\n%N no duda ni un segundo cuando hay que meterse en líos.',
  'Me entró arena fina en el culo después de una pelea y %N me lo limpió con mucha dedicación usando la lengua.\nQué gran amigo es %N... a su manera de mierda.',
  'Se me hinchó una zona delicada por una alergia de la hostia y %N se dedicó un rato a desinflamármela con la boca.\n%N es un antiinflamatorio ambulante de la peor especie.',
  'Estaba sudando tanto en un concierto que se me había empapado el culo y %N se ofreció a ayudarme a secarme con la lengua.\n%N siempre está ahí cuando más se necesita y más asco da.',
  'Me quedó una pequeña astilla en el nabo y %N la extrajo usando la boca con precisión, chupando la sangre residual.\nHay amigos normales... y luego está este animal.',
  'Una vez se me atascó una espina de pescado en la garganta en plena cena y %N, sin pensarlo dos veces, se inclinó, me abrió la boca y me la sacó con la lengua, tragándosela después como si nada.\nHay que reconocer que %N siempre encuentra la forma más personal de echar una mano.',
  'Estaba a punto de perder un partido porque me dolía una puta barbaridad la rodilla y %N se arrodilló delante de todo el mundo a masajearme el músculo con la boca hasta que se me pasó.\n%N tiene un compromiso con el equipo que pocos están dispuestos a tener.',
  'Me entró una mota de mierda en el ojo en medio de una reunión importante y %N se acercó y me la sacó con la punta de la lengua para que no perdiera el hilo.\nEse nivel de atención al detalle solo lo tiene este cabrón.',
  'Se me quedó una astilla bien profunda en la mano y %N me la sacó con los dientes, lamiendo la sangre para que no manchara.\nMenos mal que cuento con alguien tan dispuesto y sin asco.',
  'Estaba resfriado hasta los huevos y no podía respirar, entonces %N me limpió los mocos uno por uno con la lengua para que pudiera volver a oler algo.\n%N realmente se involucra cuando se trata de cuidar a un amigo de mierda.',
  'Me picó una medusa de las hijas de puta en el brazo y %N se dedicó a chupar el veneno con absoluta concentración durante casi diez minutos.\nHay amigos... y luego está %N, que no duda en meterse de lleno.',
  'Se me hinchó un tobillo después de un golpe de mierda y %N se pasó un buen rato aplicándome succión con la boca para bajar la inflamación.\n%N tiene métodos poco convencionales, pero de puta madre de efectivos.',
  'Me corté el dedo mientras cocinaba y me salía sangre a chorros, así que %N me detuvo la hemorragia chupando la herida con mucho cuidado.\nSiempre es bueno tener a alguien como %N cerca en estos momentos de mierda.',
  'Estaba a punto de desmayarme de calor de los cojones y %N me refrescó el cuello y la frente lamiéndome con saliva fresca.\n%N improvisó un sistema de refrigeración bastante creativo y asqueroso.',
  'Se me quedó un pelo en la garganta y no había forma de sacarlo, así que %N se ofreció a extraerlo personalmente con la lengua y se lo tragó.\n%N no le tiene miedo a las tareas delicadas y asquerosas.',
  'Me entró arena hasta en el puto ojo después de un día de playa y %N me los limpió a conciencia con la lengua.\nEse tipo de dedicación es difícil de encontrar y más difícil de olvidar.',
  'Estaba con un calambre de los cojones en la pierna y %N se arrodilló a morderme y masajearme con la boca hasta que se me fue.\n%N sabe exactamente qué hacer cuando la situación aprieta.',
  'Se me atoró un trozo de comida y %N me practicó una especie de Heimlich bucal hasta que lo sacó y se lo comió.\nHay que admitir que %N se entrega por completo y se come lo que sobra.',
  'Me quemé la lengua con un café de los demonios y %N se dedicó a enfriármela con la suya durante un buen rato.\n%N siempre tiene una solución a mano... o a boca.',
  'Estaba sudando como un puto cerdo en el gimnasio y %N me secó la espalda y el cuello a lengüetazos para que no resbalara.\n%N realmente se toma en serio el compañerismo asqueroso.',
  'Se me metió un mosquito de los hijos de puta en el oído y %N lo sacó soplando y después aspirando con mucha precisión.\nPocos amigos se ofrecerían a algo así de mierda.',
];

const WINGMAN_CIERRES = [
  'Joder, si %N hace eso por un colega, imagina lo que haría por alguien que le deje meterse en su cama. Pareja del puto siglo.',
  'Después de esa mierda, quien rechace a %N es gilipollas certificado. No encontrarás a otro cabrón tan entregado ni buscando con lupa.',
  'Coño, %N acaba de demostrar que se arrodilla sin que se lo pidan. En pareja eso vale más que un piso en el centro, hostia.',
  'Si %N te mete la lengua así por amistad, imagina lo que hará cuando le importes de verdad. Ese cabrón no tiene freno ni marcha atrás.',
  'Me cago en la puta, %N no tiene vergüenza, no tiene asco y no tiene límites. El paquete completo para una relación de las que dejan marca.',
  'Hostia, %N es el tipo de persona que te chupa una herida sin preguntar y encima repite. Eso en el mercado de las parejas vale una puta fortuna.',
  '%N ha hecho cosas que ni los actores porno harían sin cobrar. Quien se lo quede tiene material para toda la vida, joder.',
  'Mierda, con ese nivel de entrega %N debería cobrar por existir. Pero lo hace gratis, el muy cabrón, y eso lo convierte en pareja de oro.',
  'Si %N pone la mitad de esos cojones en follar que los que pone en ayudar, quien se lo lleve a la cama no va a caminar recto en una semana.',
  'Recomendación del bot: %N es un puto animal sin dignidad ni límites. Dicho así suena fatal, pero en la cama eso es un jodido superpoder.',
  'Coño, %N se ha comido cosas que no debería comerse nadie y ha vuelto a por más. Ese nivel de compromiso asqueroso es justo lo que necesitas en pareja.',
  'Hostia puta, %N no conoce la palabra "no" ni la palabra "asco". Dos requisitos fundamentales para ser la mejor pareja del grupo, joder.',
  'Lo de %N no se encuentra ni en Tinder ni en un puto burdel. Esa clase de devoción bruta solo la tiene un cabrón que nació. sin filtro.',
  '%N se ha ganado una recomendación con la boca. Literalmente con la boca. Quien se lo quede se lleva un servicio integral, hostia.',
  'Joder, después de esto está claro: %N te la chuparía hasta sacarte el alma si se lo pidieras con cariño. Pareja perfecta para cualquier hijo de puta con suerte.',
  'Me cago en todo, %N ha demostrado que su lengua tiene más usos que una navaja suiza. Eso en pareja es un puto chollo, no me jodas.',
  'Si %N es capaz de tragarse eso por amistad, imagina las guarradas que haría por amor. El cabrón no tiene techo ni fondo, hostia.',
  'Mierda, %N tiene menos dignidad que una puta rata de alcantarilla y eso, en el terreno sentimental, es la mayor virtud que existe, joder.',
  '%N acaba de pasar la prueba más asquerosa del universo y ni ha pestañeado. Quien se líe con este cabrón se lleva un soldado sin código moral.',
  'Hostia, que alguien le dé una oportunidad a %N, coño. Lo que ha hecho ahí no lo haría ni un perro callejero, y lo ha hecho con ganas.',
  'Coño, %N es de los que se comen la mierda de otro sin pedir nada a cambio. En pareja eso se traduce en que harán cualquier puta cosa por ti.',
  'Si %N hace eso sin cobrar, imagina pagándole con sexo. Tendrías al cabrón más leal y más guarro del hemisferio occidental, joder.',
  'Recomendación final del bot: %N es un ser sin vergüenza, sin asco y sin puto sentido del ridículo. El trío perfecto para una relación larga y sucia.',
  'Me cago en la leche, %N ha hecho cosas con la lengua que deberían estar en un expediente judicial. Pero en pareja eso es oro puro, hostia.',
  'Joder, si %N ha llegado hasta ahí por un amigo, por una pareja se comería un cubo de mierda con tenedor y cuchillo. El compromiso de este cabrón no tiene límites.',
  '%N no tiene dignidad, no tiene filtro y no tiene miedo. Tres cosas que en la vida son un desastre pero en la cama son una puta bendición, coño.',
  'Hostia, %N se merece a alguien que valore su falta total de asco. No es fácil encontrar a un cabrón así de entregado y así de asqueroso, joder.',
  'Lo de %N es vocacional: nació para meterse donde nadie quiere meterse y hacerlo con una sonrisa. Pareja ideal para cualquier hijo de puta sin estándares.',
  'Mierda, con lo que %N acaba de hacer, cualquier relación futura le va a parecer un paseo por el parque. Un cabrón curtido en las trincheras del asco.',
  'Coño, si después de leer esto no quieres salir con %N es que estás clínicamente muerto por dentro. Este cabrón se lo ha ganado con la boca, joder.',
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
