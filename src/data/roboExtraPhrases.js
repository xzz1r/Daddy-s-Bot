// Frases de las dinámicas del robo. Mismo humor que el resto del bot: negro,
// vulgar y sin consuelo.
//
// Marcadores: %A ladrón · %V víctima · %C cantidad · %N nombre

// ─── El bote ─────────────────────────────────────────────────────────────────
const BOTE_REVIENTA = [
  '%A ha reventado el bote y se lleva %C. Toda vuestra mierda acumulada, en un solo bolsillo y no es el vuestro.',
  '%C de golpe. %A se acaba de forrar con el fracaso ajeno y encima os lo va a restregar, cabrón.',
  'La hucha del grupo hecha polvo. %C para %A y una puta lección para el resto: fallad más bajito.',
  'Joder con %A. %C de aura que costaron semanas de humillaciones y se han ido en un segundo.',
  '%A metió la mano hasta el fondo y salió con TODO. %C de aura que el grupo llevaba semanas alimentando a base de fracasos.',
  'Reventado. %A se lleva %C que pagaron entre todos los inútiles que fallaron antes que él.',
  '%A abrió el bote de una patada. %C de aura acumulada con las lágrimas de media docena de mancos.',
  'El bote era de todos hasta hace tres segundos. Ahora es de %A y son %C.',
  '%A se llevó los %C enteros. Ese dinero era el monumento a los que fallan, y acaba de profanarlo.',
  'Bote reventado por %A: %C. Todo lo que perdisteis intentando robar acaba de encontrar dueño, y no sois vosotros.',
  '%A rompió la hucha del grupo y se largó con %C. Aplaudid o callaos, pero ha ganado él.',
  'Se acabó la fiesta: %A se lleva %C. El bote vuelve a cero y vosotros a fallar para llenarlo otra vez.',
  '%C de aura, un solo dueño, cero remordimientos. %A no os va a invitar a nada.',
  '%A ha vaciado el bote. %C que salieron del bolsillo de otros y que nadie va a devolver.',
  '%A se acaba de llevar %C del bote. Ese dinero costó sangre ajena y a él le costó un comando.',
  'Bote limpio. %A entra con %C y el resto del grupo se queda mirando cómo alguien se lleva lo suyo.',
  '%C del bote a la cuenta de %A. Así acaban las semanas de fracasos colectivos: en el bolsillo de uno solo.',
  '%A ha reventado la hucha y se ha largado sin mirar atrás. %C que no van a volver, cabrones.',
  'El bote ha petado y %A estaba delante con las manos abiertas. %C recogidos del suelo.',
  '%A se lleva %C del bote mientras el grupo mira con esa mezcla de envidia y asco que solo da el dinero ajeno.',
];

const BOTE_FALLA = [
  '%A ha pagado por hacer el gilipollas delante de todos. El bote engorda con su donativo.',
  'Ni de coña. %A rebota, el bote se queda tan pancho y el grupo se queda con la cara que ha puesto.',
  '%A al bote lo que un mosquito a un camión. Otra puta entrada tirada a la basura.',
  '%A intentó reventar el bote y solo consiguió engordarlo. La entrada se queda dentro, gracias por participar.',
  'El bote sigue ahí, intacto, mirando a %A con esa cara de "vuelve cuando sepas".',
  '%A se acercó al bote con muchas ganas y cero técnica. Otro donativo.',
  'Nada. %A pagó la entrada, hizo el ridículo y se fue. El bote ni se ha despeinado.',
  '%A quiso la gloria y compró humillación. El bote crece, él no.',
  'El bote no se abre con ilusión, %A. Se abre con suerte, y tú no traías.',
  '%A ha financiado el bote de otro. Alguien le va a dar las gracias algún día, no hoy.',
  'Fallo limpio. %A entra en la lista de los que lo intentaron y salieron con menos de lo que traían.',
  '%A ha donado otra entrada al bote. Filantropía involuntaria en estado puro.',
  'El bote le ha cerrado la puerta en la cara a %A. Otra vez. Y va a seguir cerrándosela.',
  '%A acaba de engordar el bote con su aura. Lo único que ha roto aquí es su propio saldo.',
  'Otra entrada al fuego. %A paga por intentarlo y el bote paga por existir.',
  'Ni de lejos. %A ha pagado el peaje y se ha ido con las manos vacías y los bolsillos más ligeros.',
  '%A ha mirado al bote y el bote se ha reído. Entrada cobrada, resultado previsible.',
  'El bote crece con la ilusión de %A. Donativo aceptado, intento rechazado.',
  '%A le ha puesto una vela al bote y el bote se la ha apagado. Otra entrada perdida, cabrón.',
  'Fallaste, %A. El bote suma tu entrada al montón y ni se inmuta.',
];

const BOTE_VACIO = [
  'No hay una mierda dentro. El bote se llena con vuestros fracasos y últimamente ni fracasáis con ganas.',
  'Bote a cero. Para que haya algo que robar alguien tiene que cagarla robando, y aquí no se atreve ni Dios.',
  'El bote está tan vacío que da pena mirarlo. Fallad más, que es lo único que sabéis hacer.',
  'No hay bote. Para que haya bote alguien tiene que fallar robando, y últimamente ni lo intentáis.',
  'Ahí no hay nada. Ni aura, ni gloria, ni motivo para seguir mirando.',
  'El bote está seco. Este grupo roba poco y falla menos, que es peor.',
  'Vacío. El bote se alimenta de fracasos y este grupo lleva una dieta estricta de no hacer nada.',
  'Bote a cero. Nadie falla porque nadie lo intenta, que es la forma más cobarde de no perder.',
  'No hay un puto duro dentro. Robad, fallad, nutrid la hucha con vuestras miserias.',
  'El bote está tan limpio que da vergüenza mirarlo. Este grupo necesita más ambición y menos prudencia.',
  'Nada. El bote está más vacío que las conversaciones de este grupo a las tres de la madrugada.',
  'Cero en el bote. Ni un fracaso que lo engorde. Menudo grupo de cobardes sin iniciativa.',
];

// ─── La tienda ───────────────────────────────────────────────────────────────
const COMPRA_ESCUDO = [
  '%N se ha comprado un escudo porque le da pánico que le toquen el aura. %C por cagarse encima con estilo.',
  'Escudo comprado. %N ya puede ladrar todo lo que quiera desde detrás del cristal, como los cobardes con presupuesto.',
  '%N se ha comprado un candado para el aura. Doce horas de dormir tranquilo, que es más de lo que merece.',
  '%N paga %C por que no le toquen. Miedo bien invertido.',
  'Escudo puesto. %N ya puede provocar a quien quiera sabiendo que no le van a poder devolver nada durante medio día.',
  '%N se blinda. Que nadie se confunda: eso no es estrategia, es pánico con presupuesto.',
  '%N compra doce horas de paz. El grupo ya está contando las horas para cuando se le acabe.',
  'Blindado. %N ha decidido que su aura vale más que su dignidad, y ha pagado %C por demostrarlo.',
  '%N suelta %C por un escudo. Lo que no puede comprar es que el grupo deje de saber que lo necesita.',
  'Escudo activado. %N puede respirar tranquilo doce horas, que es más de lo que respira el grupo cuando habla.',
  '%N se protege. Sensato, cobarde y caro. Las tres cosas a la vez.',
  '%N paga %C por no tener que preocuparse. El resto del grupo paga gratis con la cara que pone.',
  'Doce horas de inmunidad para %N. Doce horas de planear cómo atacarlo para el resto.',
  '%N ha comprado blindaje. Que nadie diga que el miedo no mueve dinero.',
];

const COMPRA_GANZUA = [
  '%N suelta %C por una ganzúa. Un solo uso, así que como la gaste en un muerto de hambre se va a acordar.',
  'Ganzúa comprada. Ahora %N tiene herramienta y sigue sin tener ni puta idea de a quién ir.',
  '%N afila la ganzúa. Un solo uso, así que más le vale no desperdiciarla en cualquier muerto de hambre.',
  '%N suelta %C por un empujón en el próximo golpe. Si falla igual, va a doler el doble.',
  'Ganzúa en el bolsillo. %N ya tiene excusa técnica para el ridículo que viene.',
  '%N compra ventaja. Ahora solo le falta el valor de usarla contra alguien que importe.',
  'Una ganzúa, un uso, cero garantías. %N acaba de comprar esperanza a %C el gramo.',
  '%N tiene ganzúa. El próximo robo lleva ventaja y la presión de no desperdiciarla.',
  'Ganzúa lista. %N ya puede fallar con estilo y con herramientas, que es peor que fallar a pelo.',
  '%N se ha comprado una oportunidad. Un solo uso y después se acabó la ayuda, cabrón.',
  '%N suelta %C por una ganzúa que probablemente malgaste. Pero la ilusión no tiene precio.',
  'Ganzúa comprada. %N tiene ventaja, ahora solo necesita que no le tiemble el pulso.',
  '%N paga %C por un uso. Si falla con ventaja incluida el ridículo va a ser doble.',
];

const COMPRA_CEBO = [
  '%N monta el cebo. Va a ir por ahí aparentando billetes con la cuenta llena de telarañas, como toda su puta vida.',
  'Cebo activo: %N brillando por fuera y podrido por dentro. Que piquen los codiciosos.',
  '%N se disfraza de rico. Ocho horas fingiendo lo que no es, como en la vida real pero con recibo.',
  'Cebo puesto. %N va a parecer una cuenta jugosa y lo que hay dentro da pena.',
  '%N paga %C por aparentar. El que pique se va a llevar una decepción histórica.',
  'Trampa montada. %N ahora brilla como un objetivo y por dentro está más vacío que su agenda.',
  '%N monta el señuelo. Que vengan los codiciosos, que hay ración de humillación para todos.',
  'Cebo activado. %N brilla como un trofeo y por dentro es chatarra pura.',
  '%N se disfraza de cuenta gorda. El que muerda se va a tragar el anzuelo entero.',
  'Señuelo montado. %N aparenta lo que no tiene, que es lo que mejor se le da.',
  '%N paga %C por parecer rico. El que pique va a robar aire con envoltorio de lujo.',
  'Cebo listo. %N ya puede esperar sentado a que alguien sea lo bastante codicioso para picar.',
  '%N ha montado la trampa. Ahora solo falta un imbécil con ambición y poca vista.',
];

const GANZUA_USADA = [
  'Ganzúa quemada. A partir de ahora %A roba a pelo y con la boca cerrada.',
  'Se acabó el juguete. %A ha gastado su única ventaja y más le vale que haya servido de algo, joder.',
  'Ganzúa gastada. Se acabó, %A: la próxima vas a pelo como todos.',
  '%A ha quemado la ganzúa en esto. Espero que mereciera la pena.',
  'Ahí va la ganzúa. Un solo uso y %A ya no tiene excusas de repuesto.',
  'Ganzúa fundida. %A vuelve a robar con las manos desnudas y la cara descubierta.',
  'Se acabó la ventaja. %A ha gastado la ganzúa y a partir de aquí roba a cuerpo limpio.',
  'Una ganzúa menos en el mundo. %A ya no tiene herramientas ni excusas.',
  '%A quemó su ganzúa. De vuelta a la calle sin ayuda, como siempre.',
  'Ganzúa usada y destruida. %A vuelve a la casilla de salida sin ventaja y sin remordimientos.',
  'La ganzúa de %A ha cumplido su función y se ha ido. Como todo lo bueno.',
  '%A se ha quedado sin ganzúa. El próximo golpe va a ser a pecho descubierto y con fe.',
];

const INVENTARIO_VACIO = [
  'No llevas una mierda encima. Vas a robar con las manos y con fe, que es como van los pringados.',
  'Inventario vacío. Ni escudo, ni ganzúa, ni cebo, ni idea. Suerte con eso.',
  'No llevas nada encima. Vas a robar a pecho descubierto como los valientes o como los tontos, según salga.',
  'Cero objetos. Vas de frente y sin herramientas, que es muy honrado y muy poco eficaz.',
  'Tu inventario está tan vacío como tu historial de robos con éxito.',
  'Nada encima. Ni protección ni ventaja ni trampa. A pelo y sin plan, como siempre.',
  'Inventario limpio. Vas a la guerra con un palo y una oración, pringado.',
  'Sin objetos. Estás más desnudo que una cuenta nueva y con menos futuro.',
  'Cero equipamiento. Hasta el muerto de hambre del grupo lleva más que tú.',
  'No tienes nada. Ni material ni un plan B. La tienda te espera y tú no la mereces.',
  'Tu inventario es un páramo, cabrón. Ni un escudo ni una ganzúa ni un puto chicle.',
  'Vacío total. Vas por el grupo sin protección y sin vergüenza, que ya es decir.',
];

const COMPRA_OK = [
  '%C fuera y el material dentro. Ahora %N ya no tiene ni una puta excusa cuando la cague.',
  'Vendido. %N ha soltado %C y va a desperdiciarlo, pero eso ya no es problema de la tienda.',
  '%N suelta %C y se lleva el material. Ahora ya no tiene excusa.',
  'Vendido. %C menos en la cuenta de %N y una ventaja que probablemente desperdicie.',
  '%N pagó %C por algo que le va a durar menos que las ganas. Suerte.',
  'Trato hecho: %C. Lo que %N haga con eso ya no es problema de nadie.',
  '%N compra herramienta. Que se prepare el grupo, o que se ría, según cómo le salga.',
  'Compra cerrada. %N suelta %C y se lleva algo que no va a saber usar.',
  '%C de aura por una ventaja. %N ya está armado, ahora solo falta que sirva de algo.',
  'Vendido a %N por %C. Si lo desperdicia, la tienda no admite devoluciones.',
  '%N paga %C y se equipa. Que el grupo sepa que ahora va con material.',
  'Hecho. %N ha soltado %C por algo que en mejores manos sería peligroso. En las suyas, ya veremos.',
  '%C fuera. %N tiene lo que pedía y ahora viene la parte difícil: no cagarla.',
];

const COMPRA_POBRE = [
  'Ni de coña. Con esa cuenta no compras ni el aire de la tienda, %N.',
  '%N intentando comprar sin un duro. Aquí no se fía a los muertos de hambre.',
  'Que no, %N. Que no te llega y que se te está notando mucho.',
  'No te llega, %N. Vuelve cuando tengas con qué.',
  'Con esa cuenta no se compra nada. Ni respeto.',
  'Aquí se paga por adelantado y tú no tienes. Fuera.',
  '%N mirando el escaparate como quien mira un coche que no va a poder pagar nunca.',
  'Ni un duro, %N. Vuelve cuando tu saldo dé menos pena que tu cara.',
  '%N quiere comprar y no le da. Normal: para comprar primero hay que tener algo.',
  'Mierda de cuenta. %N quiere gastar lo que no tiene, como siempre.',
  'No te llega ni de lejos, %N. Escribe algo, roba algo, haz algo con tu vida.',
  '%N viene a la tienda con los bolsillos vacíos y la cara llena de ilusión. Fuera.',
  'Con eso no compras nada, %N. Ni siquiera la atención del que vende.',
];

const ESCUDO_SALVA = [
  '%A se ha estampado contra el escudo de %V como un gilipollas contra una puerta de cristal.',
  'Blindado. %A ha ido a robar y ha vuelto con las manos vacías y una hostia de realidad.',
  '%V tenía escudo. %A se estrelló contra él como un mosquito contra un parabrisas.',
  'Intento inútil: %V pagó por no tener que aguantar a gente como %A.',
  '%A fue a por %V y se encontró la puerta blindada. Se vuelve con las manos vacías y la dignidad peor.',
  'Escudo activo. %V ni se ha enterado de que %A lo ha intentado, que es lo más humillante de todo.',
  '%A rebotó. %V se gastó el aura justo para que pasara esto y ha valido cada punto.',
  'Nada que hacer: %V está blindado y %A acaba de descubrirlo de la peor manera.',
  'Rebotado. %A ha intentado robar a %V y se ha ido con las manos vacías y una marca en la frente.',
  '%V tiene escudo y %A no tiene suerte. Combinación fatal para el ladrón.',
  'Escudo de %V intacto. %A se ha estrellado y el grupo ha disfrutado del espectáculo.',
  '%A fue a por %V y se encontró un muro. Escudo bien gastado, robo bien frustrado.',
  '%V pagó por blindarse y %A acaba de validar la inversión. Menudo ridículo, cabrón.',
  'El escudo de %V ha hecho su trabajo. %A se vuelve con una mano delante y otra detrás.',
];

const CEBO_PICA = [
  '%A ha picado como un pardillo: %V iba de millonario y no tiene ni para pipas. Menudo ridículo, joder.',
  'Todo ese cálculo para robarle a un muerto de hambre disfrazado. %A puede irse a llorar.',
  '%A fue a por lo gordo y se encontró calderilla: %V iba de rico y no tiene un duro.',
  'El cebo funcionó. %A calculó el golpe de su vida sobre una cuenta que era humo.',
  '%V aparentaba el doble. %A picó como un pardillo y ahora lo sabe todo el grupo.',
  '%A robó a un pobre disfrazado de rico. Le queda la vergüenza, que no se puede gastar.',
  'Cebo tragado entero. %A fue a por el premio gordo y se encontró una cuenta vacía con purpurina.',
  '%A mordió el anzuelo de %V. Todo ese cálculo para robarle a un impostor, joder.',
  '%V iba de rico y %A se lo creyó. Ahora el grupo tiene la risa y %A la vergüenza.',
  'El señuelo de %V ha funcionado. %A picó como quien pica: con ambición y sin cabeza.',
  '%A fue a por el más gordo de la tabla y resulta que era de cartón. Menudo pardillo.',
  'Cebo perfecto. %A ha robado aire envasado y %V se parte de risa.',
  '%V brillaba como un diamante y por dentro era cristal. %A se lo tragó entero, el muy gilipollas.',
];

// ─── El contraataque ─────────────────────────────────────────────────────────
const CONTRA_GANA = [
  '%V le ha metido la mano en el bolsillo a %A y le ha sacado %C. Por listo, cabrón.',
  '%A disfrutó del botín treinta segundos. Ahora %V tiene %C y él tiene cara de gilipollas.',
  'Vuelta y media: %C de vuelta a %V. Eso pasa por robarle al que sí tiene cojones de responder.',
  '%V no se quedó llorando: fue a por %A y le sacó %C. Justicia poética con intereses.',
  'Contraataque limpio. %A robó y duró treinta segundos disfrutándolo: %V se llevó %C de vuelta.',
  '%V devolvió el golpe y se llevó %C. Robar tiene consecuencias y %A las acaba de conocer.',
  '%A se creyó listo hasta que %V le vació %C. Eso pasa por robarle al que sí responde.',
  'Vuelta completa: %C de %A a %V. El robo del siglo duró minuto y medio.',
  '%V contraatacó y %A pasó de ladrón a víctima sin cambiar de silla. %C.',
  '%A tenía el botín en la mano. Ahora %V tiene %C y él tiene una lección.',
  '%V ha devuelto la hostia con intereses: %C de vuelta. %A no se lo esperaba y se nota.',
  'Contraataque perfecto. %V recupera %C y %A se queda con la cara de quien roba y le roban en el mismo turno.',
  '%V fue a por lo suyo y se trajo %C. %A acaba de descubrir que no todos lloran, algunos muerden.',
  '%C de vuelta a %V. %A ha aprendido que robar al que responde sale caro, joder.',
];

const CONTRA_PIERDE = [
  '%V ha ido a por la revancha y ha soltado otros %C. Dos hostias seguidas del mismo tío.',
  'Menuda puta ruina: %V quiso vengarse y le ha regalado %C más. Hay que saber tragar.',
  '%V quiso vengarse y le salió peor: otros %C para %A. Hay días que es mejor tragar.',
  'Contraataque fallido. %V ha conseguido perder dos veces seguidas contra la misma persona.',
  '%V fue a recuperar lo suyo y dejó %C más por el camino. Impresionante nivel de insistencia inútil.',
  '%A le robó y %V le regaló la propina: %C. Aprender duele.',
  'Doble o nada, y a %V le salió nada. %C que no vuelven.',
  '%V ha convertido un robo normal en una humillación de dos actos. %C más para %A.',
  'La venganza de %V ha salido al revés: otros %C para %A. Menuda puta broma.',
  '%V quiso recuperar lo suyo y ha acabado donando más. %C de regalo para %A.',
  'Contraataque fallido. %V ha pasado de víctima a mecenas involuntario. %C más para el ladrón.',
  '%V intentó la revancha y la revancha le dio otra hostia. %C que suman para %A.',
  'Doble derrota. %V ha perdido dos veces contra la misma persona y %C en cada una. Impresionante.',
  '%V fue a recuperar su aura y dejó la que le quedaba. %C más para %A, el muy inútil.',
];

const CONTRA_TARDE = [
  'Tarde, campeón. Mientras tú mirabas la pared, tu aura cambiaba de dueño.',
  'Se cerró la ventana. Para vengarse hay que estar despierto y tú estabas a lo tuyo, que es nada.',
  'Ni contraataque ni hostias. Llegas tarde, como a todo.',
  'Se te pasó el arroz. El contraataque tenía ventana y tú estabas mirando otra cosa.',
  'Demasiado tarde. %A ya se ha gastado tu aura en algo mejor que tú.',
  'La ventana se cerró. Ahora esa aura es historia y tú un capítulo triste.',
  'Tarde. Para vengarse hay que estar despierto, y tú ni eso.',
  'Se acabó el tiempo. La revancha tenía fecha de caducidad y la tuya ha pasado hace rato.',
  'Ni de coña, llegas tardísimo. La ventana cerró y tu aura ya tiene otro dueño.',
  'Tarde, como siempre. El contraataque era ahora, no cuando te diera la gana.',
  'La ventana se cerró y tú estabas en otra parte. Probablemente mirando el techo.',
  'Demasiado lento. Para cuando has reaccionado tu aura ya ha cambiado de manos dos veces.',
  'Ni de broma. El tiempo para vengarse ha pasado y tú has llegado como llegas a todo: después.',
];

// ─── El más buscado ──────────────────────────────────────────────────────────
const DIANA_GOLPE = [
  'Ha caído el número uno. %C menos para el que iba de intocable, y el grupo aplaudiendo, cabrón.',
  '%A le ha bajado los humos al más buscado: %C. Nada sabe mejor que ver caer al que presume.',
  'El puto rey de los ladrones acaba de que le vacíen el bolsillo. %C. Que se explique.',
  '%V es el más buscado de la semana y %A acaba de cobrarse la recompensa. %C.',
  'Llevaba diana en la espalda y %A ha apuntado bien: %C menos para el número uno.',
  'El rey de los ladrones acaba de que le roben. %C. El grupo lo está celebrando.',
  '%A le ha quitado %C al que más presume. Nada sabe mejor.',
  'Cae el más buscado: %C. %V va a tener que explicarse en el grupo.',
  'El más buscado del grupo ha caído y se ha dejado %C por el camino. %A no ha tenido piedad.',
  '%A le ha bajado %C al número uno. El trono del robo tiene un asiento muy resbaladizo.',
  'Diana al más buscado: %C arrancados. %V llevaba semanas robando y %A le acaba de pasar la factura.',
  '%V era intocable hasta que %A le ha quitado %C. El grupo se lo va a recordar durante días.',
  'Cae el primero: %C para %A. %V llevaba de intocable y ahora lleva de ejemplo, cabrón.',
  'El más buscado acaba de perder %C y la aureola de intocable. %A ha hecho justicia a lo bruto.',
];

module.exports = {
  BOTE_REVIENTA, BOTE_FALLA, BOTE_VACIO,
  COMPRA_OK, COMPRA_POBRE, ESCUDO_SALVA, CEBO_PICA,
  COMPRA_ESCUDO, COMPRA_GANZUA, COMPRA_CEBO, GANZUA_USADA, INVENTARIO_VACIO,
  CONTRA_GANA, CONTRA_PIERDE, CONTRA_TARDE,
  DIANA_GOLPE,
};
