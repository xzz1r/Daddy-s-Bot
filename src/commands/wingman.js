'use strict';

const { getTargetOrSelf, isMainOwner, isOwner, isAdmin } = require('../utils/wa');
const { rollPercent } = require('./percent');
const { pickFresh } = require('../utils/helpers');

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
  'Coño, %N, te comería el chocho hasta que se me disloque la mandíbula. Después iría al dentista, mentiría sobre la causa y volvería a la puta faena.',
  '%N, me cago en la puta, si te sientas en mi cara pido el empadronamiento entre tus muslos. Que me llegue el censo ahí, que es mi puto domicilio fiscal.',
  'Joder, %N, me corro de verte atarte los zapatos. No hace falta que te desnudes: con agacharte ya me dejas hecho un cabrón temblando.',
  'Hostia puta, %N, te follaría contra la lavadora y la lavadora pediría el divorcio. De la envidia, no de la vibración, que quede claro, coño.',
  'Mierda, %N, con esas tetas me ahogo encantado y el forense pondría "muerte por delantera" sin pestañear. Y le daría la enhorabuena al cadáver.',
  '%N, joder, tu coño debería venir con temario de oposición y yo me lo estudiaría entero. Con reserva, tribunal y puto examen oral, hostia.',
  'Me cago en todo, %N, cuando te ríes se me pone la polla tan dura que podría usarla de perchero. Y aún así te pediría que te colgaras de ella.',
  '%N, hostia, andas y el sismógrafo del instituto geográfico se vuelve loco. No es un terremoto: eres tú moviendo ese culo de los cojones.',
  'Joder, %N, con esa risa se me cae la caña, se me cae la cartera y se me cae la dignidad. La dignidad es la que menos echo de menos, coño.',
  'Coño, %N, ese pelo suelto pide que te lo agarre con las dos manos. Y no para peinarte, precisamente, que conste, joder.',
  '%N, me la suda el romanticismo: con esa cintura las dos manos me sobran y aún así las usaría las dos. Hasta que se me queden tiesas, hostia.',
  'Mierda, %N, esas caderas tienen más hipnosis que un reloj de bolsillo. Y yo ya voy andando hacia el precipicio, contento y duro, joder.',
  'Hostia, %N, cuando te sientas la silla debería cobrar entrada y vender palomitas. Ese culo convierte cualquier taburete en un puto santuario.',
  'Joder, %N, subes las escaleras y media calle se tropieza a propósito. No es torpeza, es peregrinación con vista al culo, coño.',
  '%N, coño, esos vaqueros de espaldas deberían ser ilegales en toda la Unión Europea. El denim no se hizo para sobrevivir a eso, joder.',
  'Me cago en la leche, %N, sales de la ducha con el pelo mojado y se declara el puto estado de alarma. Más peligrosa mojada que el jabón en el plato.',
  '%N, joder, te levantas sin maquillaje y se te sigue queriendo follar igual. A esa cara le sobra hasta el sueño, menuda puta injusticia.',
  'Hostia puta, %N, te giras por encima del hombro y se extingue una civilización. Un solo vistazo y ya estoy haciendo las maletas del orgullo, coño.',
  'Coño, %N, te cruzas de piernas y se arma un incidente diplomático en mis pantalones. La ONU no tiene protocolo para esta erección, joder.',
  'Mierda, %N, te muerdes el labio y yo ya estoy redactando el testamento. Deja algo para el resto, que así nos vas a matar a todos, coño.',
  'Joder, %N, te estiras un segundo y se va la luz en el edificio. No es el cuadro eléctrico, es que hasta los fusibles se corren, coño.',
  '%N, hostia, bebes de la botella y se me olvida tragar. Ahí me tienes, babeando como un gilipollas con carnet y todo.',
  'Me cago en todo, %N, si dices mi nombre en voz baja me corro en los pantalones sin anestesia. Y encima te lo agradecería, joder.',
  'Coño, %N, hasta el sudor te queda de puta madre. Yo te lamería el cuello y pediría la receta al laboratorio, que eso no es humano.',
  '%N, joder, esa piel pide dientes. No un beso de película, un mordisco de cabrón hambriento que no ha cenado en tres días.',
  'Hostia, %N, tu ombligo debería ser lugar de peregrinación. Yo ya iría de rodillas, y no precisamente a rezar, coño.',
  'Mierda, %N, esa espalda desnuda me borra el DNI de la cabeza. No sabría decirte ni cómo me llamo ni a qué puto pueblo pertenezco.',
  '%N, coño, con esas manos me da igual dónde las pongas. Garganta, polla o factura de la luz: firmo donde me digas, joder.',
  'Joder, %N, ese perfume mezclado contigo es para echarse a llorar de lo cachondo. Te lamería del cuello al ombligo y aún pediría postre, coño.',
  '%N, me cago en la hostia, un audio tuyo de tres segundos lo tendría de tono, de alarma y de puto himno nacional. Lo pondría hasta en el tanatorio.',
  'Hostia puta, %N, sales en una foto de grupo y el resto sobramos hasta para echar una paja. Hasta el que hizo la foto se recorta, el cabrón, y te entiendo.',
  'Coño, %N, te pones una sudadera tres tallas más grande y se te sigue viendo todo. Esas curvas no las tapa ni un toldo de terraza, joder.',
  'Mierda, %N, en bañador vacías una playa entera. No por vergüenza: porque nadie puede fingir que está mirando el puto horizonte.',
  '%N, joder, esa cremallera de vestido es una amenaza nacional. Un diente de más y se declara la ley marcial en mis pantalones, hostia.',
  'Me cago en todo, %N, sin sujetador y con camiseta fina cometes un crimen contra el tráfico. Hasta el semáforo se pone rojo de la vergüenza ajena, coño.',
  'Joder, %N, te pintas los labios y se me olvida el pin del banco, el de la puerta y el de la puta vida. Tres claves, cero neuronas, un solo morbo.',
  '%N, hostia, te recoges el pelo y ese cuello es una declaración de guerra. Yo ya he perdido, y ni siquiera he salido de casa, joder.',
  'Coño, %N, te pones un chándal de estar por casa y sigo perdiendo el hilo. Si así estás en pijama, desnuda me jubilas del puto sentido común.',
  'Mierda, %N, entras en el Mercadona y se descongela el pasillo de congelados. No es el aire acondicionado, eres tú, joder, el cambio climático con culo.',
  '%N, joder, te montarías encima y yo moriría debajo dando las gracias. Que pongan en la lápida "la aplastó una diosa" y que no investiguen más, coño.',
  'Hostia puta, %N, cuando te quitas la sudadera se me olvida hasta el abecedario. Solo me queda la F de follarte y la C de cabrón rendido, joder.',
  'Me cago en la leche, %N, si me pides que atraque un banco lo hago sin pasamontañas. Con esa cara de cómplice cualquier juez me entendería, coño.',
  '%N, coño, te empeñaría un riñón por veinte minutos a solas. Y el otro riñón lo dejaría de propina si me dejas otros cinco, joder.',
  'Joder, %N, si me mandas a esperar bajo la lluvia saco una silla de camping y me quedo. Hasta que se me encoja todo menos lo que tú quieres, hostia.',
  'Hostia, %N, ese culo al andar tiene más ritmo que una puta verbena de pueblo. Yo ya estoy bailando sentado, y no precisamente con los pies, coño.',
  'Mierda, %N, si Darwin te hubiera visto rompe El origen de las especies y se pone a dibujarte el culo. Ahí se acaba la puta ciencia, joder.',
  '%N, joder, ese cuerpo tiene pinta de prototipo que se les escapó del laboratorio. Y yo sería el primer cobaya, firmando sin leer, hostia.',
  'Coño, %N, te pones a hacer sentadillas y el gimnasio debería cobrar extra. Ese culo subiendo y bajando es un puto espectáculo de pago, hostia.',
  '%N, hostia puta, la NASA debería orbitar ese culo en vez de Marte. Hay más vida ahí detrás que en todo el puto sistema solar.',
  'Joder, %N, mi polla tiene religión y tú eres la santa, la misa y el diezmo. Ya he pagado en pantalones más de una puta vez, coño.',
  'Me cago en todo, %N, te ríes y el sonido se me va directo a la polla, no a las orejas. Tengo el oído inútil y la entrepierna aplaudiendo, joder.',
  '%N, coño, cometería fraude fiscal por una noche contigo. Hacienda que me embargue, que el embargo merece la pena si acabas encima, hostia.',
  'Hostia, %N, iría a la guerra por una foto tuya en sujetador. Y no por la patria, que la patria no tiene esas tetas, joder.',
  'Mierda, %N, si me despertara a tu lado pediría baja para una década. Que me paguen por no ir, que el puto trabajo ya lo estaría haciendo en la cama.',
  '%N, joder, te oigo hablar por teléfono y se me pone dura sin saber de qué hablas. Podrías estar pidiendo hora al dentista y yo ya estaría perdido, coño.',
  'Coño, %N, estrellaría el coche si te sientas de copiloto así. No por mal conductor: porque voy a ir mirando el muslo en vez de la puta carretera.',
  'Joder, %N, te quemas el huevo y yo me lo como si fuera de Martín Berasategui. Con esos pantalones cortos hasta el carbón está bueno, hostia.',
  '%N, me cago en la hostia, te dejaría marcas de dientes en el cuello como un chaval de instituto. Y iría orgulloso, el puto uniforme puesto.',
  'Hostia puta, %N, si me pidieras que dejara a mi familia firmo antes de que acabes la frase. Y encima te ayudaría a hacer las maletas, coño.',
  'Mierda, %N, no te he oído gemir y ya se me ha escrito solo en la cabeza. Si el real se parece un diez por ciento, me jubilo de la puta vida civil.',
  '%N, coño, no te he probado y ya se me hace la boca agua como a un perro. Te lamería hasta que me pidieras, por favor, que pare un segundo, hostia.',
  'Joder, %N, te comería el coño en el portal, en el ascensor y en el rellano. Que nos pille el vecino, que se eduque el cabrón.',
  'Hostia, %N, te daría por detrás hasta que se te olvidara tu propio nombre. Y el mío te lo iría recordando con cada hostia de cadera, coño.',
  '%N, joder, el modo en que te alejas es un delito contra mi voluntad. Deberían denunciarte por robo de sesos y de polla en el mismo puto acto.',
  'Coño, %N, se me pone dura de saber que existes en el mismo código postal. No hace falta que me escribas: con respirar en este barrio ya me jodes.',
  'Mierda, %N, los médicos deberían estudiarte porque esto no puede ser legal. Hay un límite de buena y tú te lo has pasado por el puto forro.',
  '%N, hostia, te quedas en toalla y se me olvida que existe la ropa. Inventaron la toalla para taparte y lo único que hace es denunciarte, coño.',
  'Joder, %N, te comes un helado y se me va la cabeza a un sitio que no es el cucurucho. Ese lengüetazo es una puta amenaza pública, coño.',
  'Hostia puta, %N, te bajas del coche y esas piernas declaran la tercera guerra mundial. Yo ya he rendido las armas, y no las de fuego, precisamente.',
  'Me cago en todo lo sagrado, %N, te aplicas crema en las piernas y yo necesito un exorcista. No por ti: por lo que se me está poniendo, joder.',
];
const WINGMAN_ANECDOTAS = [
  'Una vez le pedí a %N un favor de amigo y no preguntó cuál. Ya estaba bajando la cremallera. Eso no es lealtad, es oficio.',
  'Una vez %N se ofreció a ser el conductor designado. A las tres ya no conducía: iba de rodillas en el asiento de atrás. Prioridades.',
  'Una vez %N se enfadó porque le pedí el favor a otro. No era celos de amigo. Era celos de oficio.',
  'Una vez %N desapareció en su propia boda diez minutos. Volvió con la corbata torcida. No se había arrodillado ante el altar.',
  'Una vez en una videollamada de trabajo %N se metió debajo de la mesa. La cámara no lo pilló. El micro sí. Dije que era el perro. No tengo.',
  'Estábamos en una pelea de bar y %N se interpuso. No para pegar: para arrodillarse delante de mí. El otro se fue riendo. Yo también.',
  'Una vez le pedí a %N que me guardara la caña un segundo. Cuando volví la caña seguía en la mesa. Él no.',
  'Le pregunté a %N si tenía planes el sábado. Dijo que sí. Los planes era yo. No me había avisado.',
  'Una vez %N llegó tarde a una quedada. La excusa: se le había alargado un favor. Nadie preguntó de qué favor. Todos sabían.',
  'La primera vez que %N me dijo cuenta conmigo ya estaba bajando. No era metáfora. Era agenda.',
  'Estaba hablando con una tía y %N se puso nervioso. No por ella. Porque yo no lo estaba mirando a él.',
  'Una vez %N me regaló un collar. No era para mí. Era para que yo se lo pusiera a él. En otra parte.',
  'Le dije a %N que necesitaba silencio para concentrarme. Se arrodilló y se calló. Con la boca ocupada. Cumplió las dos.',
  'Una vez %N perdió una pelea a propósito. No por miedo. Porque el premio era arrodillarse. Y lo quería.',
  'Una vez %N me presentó a su hermano como el del grupo. El hermano ya sabía qué significaba. No preguntó.',
  'Le dije a %N que iba a salir con alguien. Se ofreció a prepararme. No era el tipo de preparación que yo pedía.',
  'Una vez %N me corrigió delante del grupo: eso no se pide, se entiende. Luego se arrodilló para demostrarlo.',
  'Estábamos en una pelea de palabras y %N saltó a defenderme. Se arrodilló en mitad del argumento. El otro se calló. De la risa.',
  'Una vez en el parking subterráneo %N ya estaba de rodillas cuando bajé las escaleras. Me esperaba. Eso es lo que jode.',
  'Una vez en Nochevieja, a las doce, %N se agachó en vez de darme las uvas. Se comió las doce. Ninguna era uva. Brindamos igual.',
];
const WINGMAN_CIERRES = [
  'Gran colega, %N. A su forma.',
  'Sin %N no salgo de esas. Os lo recomiendo.',
  'Hay amigos y luego está %N. Quedaos con ese.',
  '%N se pone. Eso en un amigo no se paga.',
  'El que se pone sin que se lo pidas es %N. Conservadlo.',
  'Siempre dispuesto, %N. Eso se agradece.',
  'Os lo presento a %N. De los que se ponen cuando hace falta.',
  'Un crack, %N. Un poco a su manera, pero crack.',
  'A %N le pedís algo y se pone. Así de fácil.',
  'Lo recomiendo a %N. Lo he visto en acción.',
];

async function cmdRizz(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const target = getTargetOrSelf(msg);
  const num = target.split('@')[0];
  const esMainOwner = isMainOwner(target, false, groupMeta);
  const esOwner = !esMainOwner && isOwner(target, false, groupMeta);
  const esAdmin = !esMainOwner && !esOwner && isAdmin(groupMeta?.participants, target);
  const percent = esMainOwner
    ? (Math.random() < 0.80 ? 58 + Math.floor(Math.random() * 28) : 30 + Math.floor(Math.random() * 28))
    : rollPercent(true, esAdmin, esOwner);
  const tier = percent >= 70 ? 'high' : percent <= 30 ? 'low' : 'mid';
  const phrase = pickFresh(RIZZ[tier], `${jid}|rizz|${tier}`).replace(/%N/g, `@${num}`);
  await sock.sendMessage(jid, { text: `*RIZZ — ${percent}%*\n\n${phrase}`, mentions: [target] }, { quoted: msg });
}

async function cmdPiropo(sock, msg) {
  const jid = msg.key.remoteJid;
  const target = getTargetOrSelf(msg);
  const num = target.split('@')[0];
  const phrase = pickFresh(PIROPOS, `${jid}|piropo`);
  const line = phrase.includes('%N') ? phrase.replace(/%N/g, `@${num}`) : `@${num} — ${phrase}`;
  await sock.sendMessage(jid, { text: line, mentions: [target] }, { quoted: msg });
}

async function cmdWingman(sock, msg) {
  const jid = msg.key.remoteJid;
  const target = getTargetOrSelf(msg);
  const num = target.split('@')[0];
  const tag = `@${num}`;
  const anecdota = pickFresh(WINGMAN_ANECDOTAS, `${jid}|wingman|anecdota`).replace(/%N/g, tag);
  const cierre = pickFresh(WINGMAN_CIERRES, `${jid}|wingman|cierre`).replace(/%N/g, tag);
  await sock.sendMessage(jid, { text: `*WINGMAN*\n\n${anecdota}\n\n${cierre}`, mentions: [target] }, { quoted: msg });
}

module.exports = { cmdRizz, cmdPiropo, cmdWingman };
