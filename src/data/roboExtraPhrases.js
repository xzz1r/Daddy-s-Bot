// Frases de las dinámicas nuevas del robo. Mismo humor que el resto del bot:
// negro, vulgar y sin consuelo. Cada pool tiene suficiente variedad para que un
// grupo activo no vea la misma dos veces en el mismo día.
//
// Marcadores: %A ladrón · %V víctima · %C cantidad · %N nombre

// ─── El bote ─────────────────────────────────────────────────────────────────
const BOTE_REVIENTA = [
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
  'El bote está tan vacío que da pena mirarlo. Fallad más, que es lo único que sabéis hacer.',
  'No hay bote. Para que haya bote alguien tiene que fallar robando, y últimamente ni lo intentáis.',
  'Ahí no hay nada. Ni aura, ni gloria, ni motivo para seguir mirando.',
  'El bote está seco. Este grupo roba poco y falla menos, que es peor.',
];

// ─── La tienda ───────────────────────────────────────────────────────────────
const COMPRA_OK = [
  '%N suelta %C y se lleva el material. Ahora ya no tiene excusa.',
  'Vendido. %C menos en la cuenta de %N y una ventaja que probablemente desperdicie.',
  '%N pagó %C por algo que le va a durar menos que las ganas. Suerte.',
  'Trato hecho: %C. Lo que %N haga con eso ya no es problema de nadie.',
  '%N compra herramienta. Que se prepare el grupo, o que se ría, según cómo le salga.',
];

const COMPRA_POBRE = [
  'No te llega, %N. Vuelve cuando tengas con qué.',
  'Con esa cuenta no se compra nada. Ni respeto.',
  'Aquí se paga por adelantado y tú no tienes. Fuera.',
  '%N mirando el escaparate como quien mira un coche que no va a poder pagar nunca.',
];

const ESCUDO_SALVA = [
  '%V tenía escudo. %A se estrelló contra él como un mosquito contra un parabrisas.',
  'Intento inútil: %V pagó por no tener que aguantar a gente como %A.',
  '%A fue a por %V y se encontró la puerta blindada. Se vuelve con las manos vacías y la dignidad peor.',
  'Escudo activo. %V ni se ha enterado de que %A lo ha intentado, que es lo más humillante de todo.',
  '%A rebotó. %V se gastó el aura justo para que pasara esto y ha valido cada punto.',
  'Nada que hacer: %V está blindado y %A acaba de descubrirlo de la peor manera.',
];

const CEBO_PICA = [
  '%A fue a por lo gordo y se encontró calderilla: %V iba de rico y no tiene un duro.',
  'El cebo funcionó. %A calculó el golpe de su vida sobre una cuenta que era humo.',
  '%V aparentaba el doble. %A picó como un pardillo y ahora lo sabe todo el grupo.',
  '%A robó a un pobre disfrazado de rico. Le queda la vergüenza, que no se puede gastar.',
];

// ─── El contraataque ─────────────────────────────────────────────────────────
const CONTRA_GANA = [
  '%V no se quedó llorando: fue a por %A y le sacó %C. Justicia poética con intereses.',
  'Contraataque limpio. %A robó y duró treinta segundos disfrutándolo: %V se llevó %C de vuelta.',
  '%V devolvió el golpe y se llevó %C. Robar tiene consecuencias y %A las acaba de conocer.',
  '%A se creyó listo hasta que %V le vació %C. Eso pasa por robarle al que sí responde.',
  'Vuelta completa: %C de %A a %V. El robo del siglo duró minuto y medio.',
  '%V contraatacó y %A pasó de ladrón a víctima sin cambiar de silla. %C.',
  '%A tenía el botín en la mano. Ahora %V tiene %C y él tiene una lección.',
];

const CONTRA_PIERDE = [
  '%V quiso vengarse y le salió peor: otros %C para %A. Hay días que es mejor tragar.',
  'Contraataque fallido. %V ha conseguido perder dos veces seguidas contra la misma persona.',
  '%V fue a recuperar lo suyo y dejó %C más por el camino. Impresionante nivel de insistencia inútil.',
  '%A le robó y %V le regaló la propina: %C. Aprender duele.',
  'Doble o nada, y a %V le salió nada. %C que no vuelven.',
  '%V ha convertido un robo normal en una humillación de dos actos. %C más para %A.',
];

const CONTRA_TARDE = [
  'Se te pasó el arroz. El contraataque tenía ventana y tú estabas mirando otra cosa.',
  'Demasiado tarde. %A ya se ha gastado tu aura en algo mejor que tú.',
  'La ventana se cerró. Ahora esa aura es historia y tú un capítulo triste.',
  'Tarde. Para vengarse hay que estar despierto, y tú ni eso.',
];

// ─── El más buscado ──────────────────────────────────────────────────────────
const DIANA_GOLPE = [
  '%V es el más buscado de la semana y %A acaba de cobrarse la recompensa. %C.',
  'Llevaba diana en la espalda y %A ha apuntado bien: %C menos para el número uno.',
  'El rey de los ladrones acaba de que le roben. %C. El grupo lo está celebrando.',
  '%A le ha quitado %C al que más presume. Nada sabe mejor.',
  'Cae el más buscado: %C. %V va a tener que explicarse en el grupo.',
];

module.exports = {
  BOTE_REVIENTA, BOTE_FALLA, BOTE_VACIO,
  COMPRA_OK, COMPRA_POBRE, ESCUDO_SALVA, CEBO_PICA,
  CONTRA_GANA, CONTRA_PIERDE, CONTRA_TARDE,
  DIANA_GOLPE,
};
