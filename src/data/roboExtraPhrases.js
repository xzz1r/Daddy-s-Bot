// Frases de las dinámicas nuevas del robo. Mismo humor que el resto del bot:
// negro, vulgar y sin consuelo. Cada pool tiene suficiente variedad para que un
// grupo activo no vea la misma dos veces en el mismo día.
//
// Marcadores: %A ladrón · %V víctima · %C cantidad · %N nombre
//
// SOBRE EL REGISTRO. La primera versión de estos pools era ingeniosa y estaba
// domesticada: ochenta y cinco frases y CERO vocabulario fuerte, cuando los
// pools veteranos del bot (los de !infiel, !roast) lo usan en una de cada
// cuatro. Medido, no a ojo. Eran frases de un bot educado haciendo de bot
// maleducado, que se nota enseguida.
//
// Se han inyectado líneas con la boca sucia del bot de siempre en los momentos
// que la piden — reventar el bote, quedarse a medias, la venganza, el número
// uno cayendo — y se han dejado limpias las que son puro trámite. No todo tiene
// que llevar taco; lo que no puede pasar es que NADA lo lleve.

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
];

const BOTE_VACIO = [
  'No hay una mierda dentro. El bote se llena con vuestros fracasos y últimamente ni fracasáis con ganas.',
  'Bote a cero. Para que haya algo que robar alguien tiene que cagarla robando, y aquí no se atreve ni Dios.',
  'El bote está tan vacío que da pena mirarlo. Fallad más, que es lo único que sabéis hacer.',
  'No hay bote. Para que haya bote alguien tiene que fallar robando, y últimamente ni lo intentáis.',
  'Ahí no hay nada. Ni aura, ni gloria, ni motivo para seguir mirando.',
  'El bote está seco. Este grupo roba poco y falla menos, que es peor.',
];

// ─── La tienda ───────────────────────────────────────────────────────────────
// Cada objeto habla distinto. Un mensaje generico para los tres es lo que hace
// que una tienda parezca un formulario: comprar un escudo es de cobarde
// precavido, una ganzua es de ansioso, y un cebo es de rata. Se nota o no se
// nota, pero se nota.
const COMPRA_ESCUDO = [
  '%N se ha comprado un escudo porque le da pánico que le toquen el aura. %C por cagarse encima con estilo.',
  'Escudo comprado. %N ya puede ladrar todo lo que quiera desde detrás del cristal, como los cobardes con presupuesto.',
  '%N se ha comprado un candado para el aura. Doce horas de dormir tranquilo, que es más de lo que merece.',
  '%N paga %C por que no le toquen. Miedo bien invertido.',
  'Escudo puesto. %N ya puede provocar a quien quiera sabiendo que no le van a poder devolver nada durante medio día.',
  '%N se blinda. Que nadie se confunda: eso no es estrategia, es pánico con presupuesto.',
  '%N compra doce horas de paz. El grupo ya está contando las horas para cuando se le acabe.',
  'Blindado. %N ha decidido que su aura vale más que su dignidad, y ha pagado %C por demostrarlo.',
];

const COMPRA_GANZUA = [
  '%N suelta %C por una ganzúa. Un solo uso, así que como la gaste en un muerto de hambre se va a acordar.',
  'Ganzúa comprada. Ahora %N tiene herramienta y sigue sin tener ni puta idea de a quién ir.',
  '%N afila la ganzúa. Un solo uso, así que más le vale no desperdiciarla en cualquier muerto de hambre.',
  '%N suelta %C por un empujón en el próximo golpe. Si falla igual, va a doler el doble.',
  'Ganzúa en el bolsillo. %N ya tiene excusa técnica para el ridículo que viene.',
  '%N compra ventaja. Ahora solo le falta el valor de usarla contra alguien que importe.',
  'Una ganzúa, un uso, cero garantías. %N acaba de comprar esperanza a %C el gramo.',
];

const COMPRA_CEBO = [
  '%N monta el cebo. Va a ir por ahí aparentando billetes con la cuenta llena de telarañas, como toda su puta vida.',
  'Cebo activo: %N brillando por fuera y podrido por dentro. Que piquen los codiciosos.',
  '%N se disfraza de rico. Ocho horas fingiendo lo que no es, como en la vida real pero con recibo.',
  'Cebo puesto. %N va a parecer una cuenta jugosa y lo que hay dentro da pena.',
  '%N paga %C por aparentar. El que pique se va a llevar una decepción histórica.',
  'Trampa montada. %N ahora brilla como un objetivo y por dentro está más vacío que su agenda.',
  '%N monta el señuelo. Que vengan los codiciosos, que hay ración de humillación para todos.',
];

const GANZUA_USADA = [
  'Ganzúa quemada. A partir de ahora %A roba a pelo y con la boca cerrada.',
  'Se acabó el juguete. %A ha gastado su única ventaja y más le vale que haya servido de algo, joder.',
  'Ganzúa gastada. Se acabó, %A: la próxima vas a pelo como todos.',
  '%A ha quemado la ganzúa en esto. Espero que mereciera la pena.',
  'Ahí va la ganzúa. Un solo uso y %A ya no tiene excusas de repuesto.',
];

const INVENTARIO_VACIO = [
  'No llevas una mierda encima. Vas a robar con las manos y con fe, que es como van los pringados.',
  'Inventario vacío. Ni escudo, ni ganzúa, ni cebo, ni idea. Suerte con eso.',
  'No llevas nada encima. Vas a robar a pecho descubierto como los valientes o como los tontos, según salga.',
  'Cero objetos. Vas de frente y sin herramientas, que es muy honrado y muy poco eficaz.',
  'Tu inventario está tan vacío como tu historial de robos con éxito.',
];

const COMPRA_OK = [
  '%C fuera y el material dentro. Ahora %N ya no tiene ni una puta excusa cuando la cague.',
  'Vendido. %N ha soltado %C y va a desperdiciarlo, pero eso ya no es problema de la tienda.',
  '%N suelta %C y se lleva el material. Ahora ya no tiene excusa.',
  'Vendido. %C menos en la cuenta de %N y una ventaja que probablemente desperdicie.',
  '%N pagó %C por algo que le va a durar menos que las ganas. Suerte.',
  'Trato hecho: %C. Lo que %N haga con eso ya no es problema de nadie.',
  '%N compra herramienta. Que se prepare el grupo, o que se ría, según cómo le salga.',
];

const COMPRA_POBRE = [
  'Ni de coña. Con esa cuenta no compras ni el aire de la tienda, %N.',
  '%N intentando comprar sin un duro. Aquí no se fía a los muertos de hambre.',
  'Que no, %N. Que no te llega y que se te está notando mucho.',
  'No te llega, %N. Vuelve cuando tengas con qué.',
  'Con esa cuenta no se compra nada. Ni respeto.',
  'Aquí se paga por adelantado y tú no tienes. Fuera.',
  '%N mirando el escaparate como quien mira un coche que no va a poder pagar nunca.',
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
];

const CEBO_PICA = [
  '%A ha picado como un pardillo: %V iba de millonario y no tiene ni para pipas. Menudo ridículo, joder.',
  'Todo ese cálculo para robarle a un muerto de hambre disfrazado. %A puede irse a llorar.',
  '%A fue a por lo gordo y se encontró calderilla: %V iba de rico y no tiene un duro.',
  'El cebo funcionó. %A calculó el golpe de su vida sobre una cuenta que era humo.',
  '%V aparentaba el doble. %A picó como un pardillo y ahora lo sabe todo el grupo.',
  '%A robó a un pobre disfrazado de rico. Le queda la vergüenza, que no se puede gastar.',
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
];

const CONTRA_TARDE = [
  'Tarde, campeón. Mientras tú mirabas la pared, tu aura cambiaba de dueño.',
  'Se cerró la ventana. Para vengarse hay que estar despierto y tú estabas a lo tuyo, que es nada.',
  'Ni contraataque ni hostias. Llegas tarde, como a todo.',
  'Se te pasó el arroz. El contraataque tenía ventana y tú estabas mirando otra cosa.',
  'Demasiado tarde. %A ya se ha gastado tu aura en algo mejor que tú.',
  'La ventana se cerró. Ahora esa aura es historia y tú un capítulo triste.',
  'Tarde. Para vengarse hay que estar despierto, y tú ni eso.',
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
];

module.exports = {
  BOTE_REVIENTA, BOTE_FALLA, BOTE_VACIO,
  COMPRA_OK, COMPRA_POBRE, ESCUDO_SALVA, CEBO_PICA,
  COMPRA_ESCUDO, COMPRA_GANZUA, COMPRA_CEBO, GANZUA_USADA, INVENTARIO_VACIO,
  CONTRA_GANA, CONTRA_PIERDE, CONTRA_TARDE,
  DIANA_GOLPE,
};
