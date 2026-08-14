'use strict';

const { parsePhoneNumberFromString } = require('libphonenumber-js');
const { getSender, getTarget, isMainOwner, bareJid, sameUser, canonicalJid } = require('../utils/wa');
const { pickFresh, fmt } = require('../utils/helpers');
const { getUserCount } = require('../utils/messageCounter');

const HEADERS = [
  '*ROAST SIN PIEDAD*',
  '*ENTIERRO EN DIRECTO*',
  '*HUMILLACIÓN PÚBLICA*',
  '*EJECUCIÓN DEL EGO*',
  '*MASACRE DEL ORGULLO*',
  '*TUMBA ABIERTA*',
  '*DEMOLICIÓN TOTAL*',
  '*CERO RESPETO*',
  '*EXPOSICIÓN CRUEL*',
  '*SENTENCIA FINAL*',
  '*CARNE AL ASADOR*',
  '*VERGÜENZA AJENA CERTIFICADA*',
  '*DESTRUCCIÓN DE MARCA PERSONAL*',
  '*EL GRUPO TE MIRA ASÍ*',
  '*AUTOPSIA DEL INÚTIL*'
];

const CLOSERS = [
  '_Y todavía te crees alguien._',
  '_El grupo ya eligió: eres el chiste, no el comediante._',
  '_Guarda el orgullo. No te queda para otra ronda._',
  '_Si la dignidad cobrara alquiler, estarías en la calle._',
  '_Siguiente. Este ya no tiene arreglo._',
  '_El espejo también se rie de ti._',
  '_No hay filtro que tape esto._',
  '_Tu autoestima acaba de pedir la baja._',
  '_Archivado en la carpeta de los que sobran._',
  '_Y lo peor: se te nota que te duele._'
];

const OWNER_ROAST = [
  '%N, el dueño intocable: todo le sale y encima tiene cara de que el resto existe de favor. Eres el jefe que nadie eligió y todos aguantan. El día que el ego se te caiga, el chat festeja en silencio.',
  '%N camina como si el WiFi saliera de su culo. Tiene razón demasiadas veces y por eso da asco. Baja un cambio antes de que te conviertan en sticker de advertencia.',
  '%N, hijo de puta con suerte: gana, manda y todavía se ofende. Tutorial que nadie pidió. No te odian por poderoso; te odian porque eres insufrible con pruebas.'
];

const ACT_0 = [
  '%N: cero mensajes. No eres misterioso, eres un parásito con foto. Ocupas sitio como un muerto en lista de asistencia.',
  '%N en 0. El grupo funciona mejor sin ti y ni siquiera es insulto: es estadística. Fantasma de mierda.',
  '%N, contador en cero. Lees el drama ajeno como quien mira pornografía gratis: sin pagar, sin aportar, sin vergüenza.',
  'Cero mensajes, %N. Tu valor en este chat es el mismo que un sticker apagado: decoración inútil.',
  '%N no escribe. No es selectividad: es mediocridad con WiFi. El ranking de útiles nunca te conoció.'
];

const ACT_LOW = [
  '%N con %C mensajes: ruido de fondo. Suficiente para molestar, insuficiente para importar. Eres una pestaña que nadie cierra del todo.',
  '%C mensajes de %N. Apareces lo justo para recordar que existes y desapareces para que nadie te extrañe. Diseño de irrelevante.',
  '%N, %C en el marcador. Ni fantasma limpio ni gente útil: el limbo de los que sobran y no se van.',
  '%C textos, %N. El grupo te tolera como se tolera un zumbido: hasta que alguien tiene el valor de aplastarte.',
  '%N lleva %C. Historial de alguien que prueba el agua con el pie y nunca se tira. Cobarde de teclado.'
];

const ACT_MID = [
  '%N con %C mensajes: tibio profesional. Opinión de relleno, ego de protagonista. Nadie pelea por ti en el ranking.',
  '%C en el contador de %N. Cumples el mínimo para abrir el hocico y el máximo para no cargar nada. Copiloto inútil.',
  '%N, %C. Estás en el mapa a lápiz. Existir no es importar, y tú confundiste las dos cosas con talento.',
  '%C mensajes: %N es el café tibio del grupo. Nadie lo tira, nadie lo pide. Autoestima de producto en oferta.',
  '%N lleva %C. Serie cancelable. El grupo ya vio el patrón: ruido, pose, cero peso.'
];

const ACT_HI = [
  '%N con %C mensajes: ya no eres invisible, todavía no eres indispensable. Empleado del mes en una oficina sin mes.',
  '%C en el contador, %N. Hay rastro y hay techo de yeso. Aportas lo justo para no borrarte y poco para que alguien te defienda.',
  '%N, %C. El ego se te hinchó antes que el mérito. Borrador con firma. El “en proceso” ya venció.',
  '%C mensajes: %N pertenece al chat; el chat no depende de ti. Cable de más en la caja.',
  '%N lleva %C. Clase media del hilo con discurso de primera fila. El desajuste se lee sin lupa.'
];

const ACT_TOP = [
  '%N con %C mensajes. Sí, se nota: empujas el hilo. Ahora no conviertas eso en soberbia de dueño. El contador no es aureola, es cuota.',
  '%C en el marcador de %N. Motor, no decoración. Si el ego se te sube, el próximo roast cobra con intereses.',
  '%N, %C. Respeto farmeado a base de escribir. No lo gastes en teatro: cuanto más alto el número, más rico el asado.',
  'Con %C textos, %N ya es esqueleto del hilo. La autoestima también se oxida si solo se mira el contador.',
  '%N lleva %C. Actividad real. Prepárate: a este nivel el golpe duele más porque el archivo te respaldaba.'
];

const DEST_GEN = [
  'Y encima el ego hinchado sin base. Te miras como protagonista y el archivo te tiene de extra. Autoestima de prestado.',
  'Y el valor propio cotizando en promesas. El grupo ya hizo la resta: sobras con wifi.',
  'Y todavía negocias respeto que no farmeaste. El espejo y el contador coinciden: no hay mucho que salvar.',
  'Y la pose de alguien importante sin el historial que lo respalde. Ridículo de manual.',
  'Y el orgullo gastando de más. Déficit crónico. El cobrador es este mensaje.'
];


function getActivity(count) {
  if (count <= 0) return ACT_0;
  if (count < 20) return ACT_LOW;
  if (count < 60) return ACT_MID;
  if (count < 150) return ACT_HI;
  return ACT_TOP;
}

const COUNTRY_ROAST = {
  AR: {
    name: 'Argentina',
    lines: [
      'Y de %PAIS, %N: soberbia de selección con rendimiento de amistoso. Te crees el estándar del continente y no llegas al del hilo. Alarma de prepotencia.',
      'Pack %PAIS: palabras largas, ideas cortas, ofensa fácil. Corrector automático del grupo sin permiso. Tu valor depende de ganar sobremesas; por eso pierdes las que importan, %N.',
      'Clásico %PAIS: el “ustedes no entienden” como personalidad. Acá se entendió de sobra. Monólogo de fábrica, himno a volumen de asado ajeno.',
      'De %PAIS exportas la costumbre de mirar al resto como “el interior”. Mucho norte en la boca, poco terreno ganado. %N, el chat te midió sin tu cátedra.',
      '%N, sello %PAIS: confianza sin resultado, tutorial que nadie pidió. Rico en verso, en hechos en default. El ego sigue de gira; el público ya se fue.',
      'PowerPoint sin botones con soberbia de presentación. %PAIS te dio el prefijo; el ridículo lo trabajaste tú, %N.',
      'En %PAIS el ego es deporte de tertulia. Acá te descalifican por fair play nulo. %N explica todo y no mueve nada.',
      'De %PAIS, %N llega tarde y corrige la hora. Si la autoestima fuera horario, llegarías tarde a tu propio valor cada vez que abres el teclado.',
      'Pack %PAIS: imperio de sobremesa. El grupo firmó la independencia de tu monólogo. Tu orgullo todavía discute el acta, %N.',
      '%N, estereotipo %PAIS sin filtro: soberbia de building, cimientos de cartón. El ranking no discute en metáforas.'
    ],
  },
  CO: {
    name: 'Colombia',
    lines: [
      'Y de %PAIS, %N: labia de vivo y sustancia de flyer. Todo se “acomoda” menos tu historial de mierda. El grupo ya no compra humo; te archiva.',
      'Pack %PAIS, %N: sonrisa de comercial, entrega que nunca llega. Rico en promesas, pobre en huevos. El ranking no fuma tu cuento.',
      'Clásico %PAIS: malicia para el chisme, torpeza para el aporte. Te crees táctico y sales predecible. %N, el vivo acá queda expuesto.',
      'De %PAIS llegaste con el software de “tranquilo que se resuelve”. Nunca se resuelve. Reunión que pudo ser un mensaje y ni el mensaje sirvió, %N.',
      '%N, sello %PAIS: confundes ser pillo con ser útil. Acá no eres ninguna de las dos. El chat lo huele y tu autoestima sigue negociando el precio del ridículo.',
      'Exportas de %PAIS la costumbre de vender humo al por menor. Comercial de madrugada: el producto no llega y el anuncio sigue. Basura con acento.',
      '%PAIS en el SIM, el vacío en el rastro. %N vive a crédito de potencial con interés de cuento. El cobrador es el contador.',
      'De %PAIS, %N hace de la viveza un tutorial sin evidencia. Deal de ego, checkout del grupo. Scrollearon de largo sobre tu orgullo.',
      'Pack %PAIS: mucho “ya casi”, poco “ya está”. %N sonríe el trato y no firma la entrega. El archivo cotiza hechos, no labia.',
      '%N, estereotipo %PAIS sin esfuerzo: confiado, hablador, hueco. El ranking no hace de cómplice del vivo.'
    ],
  },
  MX: {
    name: 'México',
    lines: [
      'Y de %PAIS, %N: volumen sin argumento. Drama con teclado, todo escena, nada guion. El grupo te baja el gain y tu autoestima sigue a todo lo que da.',
      'Pack %PAIS: ruido fácil, criterio difícil. Gritas como si fuera tesis. Rico en decibeles, pobre en sustancia. El valor propio no se mide en plazas, %N.',
      'Clásico %PAIS: ofenderte por todo y aportar nada. Piñata del hilo. Todos saben dónde pegar; el dulce es poco y el ego no lo acepta.',
      'De %PAIS llegaste con el show permanente. Telenovela de un capítulo repetido. Final: saturación. %N, el público ya pidió la cuenta.',
      '%N, sello %PAIS: mucho “no manches” mental y cero ejecución. Alarma, no líder. El chat silenció la sirena.',
      'Exportas de %PAIS la costumbre de montar drama para no montar trabajo. Se nota el hueco detrás del telón, %N.',
      '%PAIS en el SIM, el vacío en el párrafo. %N convierte todo en escena. El chat no es tu set: apaga reflectores y aporta o cállate.',
      'De %PAIS, %N hace del grito una personalidad. El archivo no llora. El ranking midió el hueco y lo dejó en actas.',
      'Pack %PAIS: farándula de ego. Checkout del público. Saturación con wifi, poco guion, menos huevos, %N.',
      '%N, estereotipo %PAIS: intensidad de plaza, utilidad de cero. El micrófono del drama no te hace protagonista; te hace alarma de vecindario.'
    ],
  },
  VE: {
    name: 'Venezuela',
    lines: [
      'Y de %PAIS, %N: noticiero sin cierre. Agravio con teclado. El grupo no es tu gobierno ni tu canal de denuncia eterna.',
      'Pack %PAIS: denuncia a volumen alto, autocrítica en cero. Rico en queja, pobre en plan. El valor propio vive de titulares, %N.',
      'Clásico %PAIS: el “nadie entiende” como personalidad. Himno a la ofensa colectiva. El chat entiende; por eso no aplaude.',
      'De %PAIS llegaste con asamblea permanente y cero acta de aporte. Resistencia en el discurso, ausencia en el plan, %N.',
      '%N, sello %PAIS: agraviado vitalicio. El ranking reparte números, no empatía infinita ni cupos de drama.',
      'Exportas de %PAIS la costumbre de convertir todo en agravio. El archivo pide hechos y sigue esperando el primer recibo útil, %N.',
      '%PAIS en el SIM, el reclamo como único software. Queja crónica, solución nula. El contador no corre esa app, %N.',
      'De %PAIS, %N hace del micrófono del drama una identidad. No te hace lúcido; te hace predecible y pesado.',
      'Pack %PAIS: pelear por todo, construir poco. El chat a veces construye sin tu narración. No eres indispensable: eres ruido con bandera.',
      '%N, estereotipo %PAIS: urgencia moral, saturación con bandera. Asamblea de uno. El ranking no vota esa lista.'
    ],
  },
  PE: {
    name: 'Perú',
    lines: [
      'Y de %PAIS, %N: tribunal sin toga. Juzgas en silencio y aportas en cuotas. El grupo no te pidió sentencia; tu autoestima se la inventó.',
      'Pack %PAIS: formalismo alto, entrega intermitente. Top en caras largas, flotando en peso real. Mohín de brochure, %N.',
      'Clásico %PAIS: ofensa en diferido, resentimiento bien peinado. Preferimos un no con fecha a tu silencio con veneno.',
      'De %PAIS llegaste haciéndote el humilde y midiendo a todos con regla ajena. Juez sin expediente, %N.',
      '%N, sello %PAIS: ego de “ya pues” sin sustancia. El ranking cotiza carga, no agrio. La pausa no es profundidad: es flojera.',
      'Exportas de %PAIS el silencio estratégico que en realidad es vacío. Se te oye igual. El contador registra la ausencia, %N.',
      '%PAIS en el SIM, el juicio en la cara como único aporte. Agrio bien vestido. El valor propio no se plancha con orgullo, %N.',
      'De %PAIS, %N confunde misterio con flojera de entrega. Pose de profundidad sin disco duro detrás.',
      'Pack %PAIS: criticar sin proponer. El archivo no se impresiona con el ceño. No cotiza el mohín.',
      '%N, estereotipo %PAIS: compostura de ego, sustancia en nevera. El ranking no espera tu deshielo.'
    ],
  },
  BR: {
    name: 'Brasil',
    lines: [
      'Y de %PAIS, %N: after sin sustancia. Ambientas todo y no cargas nada. El grupo no es tu camarote ni tu pista de baile personal.',
      'Pack %PAIS: sonrisa grande, aporte chico. Hit en ritmo, intro saltado en resultados. El valor propio no se mide en bpm, %N.',
      'Clásico %PAIS: carnaval de un solo flotante —tú—. El chat bajó el volumen. Resaca con beat, sin coreografía útil.',
      'De %PAIS llegaste de estrella en chat de barrio. Fútbol en la boca, cero en el hilo. Fuera de juego, %N.',
      '%N, sello %PAIS: fiesta verbal, utilidad en resaca. El after en la cabeza como único plan operativo. Patético.',
      'Exportas de %PAIS el ruido alegre que el grupo ya aprendió a silenciar. El ritmo no te hace indispensable; te hace karaoke, %N.',
      '%PAIS en el SIM, el hueco detrás del sambódromo mental. Ambientar para no aportar. El glitter no tapa el vacío, %N.',
      'De %PAIS, %N hace de la gracia un tutorial sin gracia real. Confeti sin rastro. No cotiza.',
      'Pack %PAIS: “só alegria” como excusa de no entregar. Acá la alegría no suma sin contador detrás, %N.',
      '%N, estereotipo %PAIS: subir el volumen de la fiesta y bajar el del aporte. Show sin sustancia. El ranking no da credits.'
    ],
  },
  CL: {
    name: 'Chile',
    lines: [
      'Y de %PAIS, %N: frío administrativo y aporte tibio. Mirada por encima del hombro. El grupo no es tu sucursal ni tu checklist moral.',
      'Pack %PAIS: crítica fina, autocrítica nula. Estándar en la boca, carga en letra chica. El valor propio cotiza normas que no cumple, %N.',
      'Clásico %PAIS: “acá se hace bien” sin mostrar el bien. Superioridad sin expediente. Adulto de la sala que no sostiene el hilo.',
      'De %PAIS llegaste con soberbia ordenada. El chat hizo la auditoría sin tu firma. %N, el mohín técnico no suma puntos.',
      '%N, sello %PAIS: ego de checklist. Distancia olímpica, utilidad tibia. Confundes orden con ser interesante.',
      'Exportas de %PAIS el hielo educado. El archivo no se impresiona. El silencio no es estándar: es flojera con buena ortografía, %N.',
      '%PAIS en el SIM, la tibieza en cada turno. Criticas el proceso ajeno y flaqueas en el propio. El ranking lo deja en actas, %N.',
      'De %PAIS, %N vende compostura y entrega suspensión. El contador no hiberna contigo.',
      'Pack %PAIS: “hay que ser serios” mientras el rastro pide seriedad tuya. Contradicción de manual.',
      '%N, estereotipo %PAIS: frío sin resultado. Archivo frío, orgullo intacto, utilidad en duda.'
    ],
  },
  EC: {
    name: 'Ecuador',
    lines: [
      'Y de %PAIS, %N: molestia suave, drama de baja intensidad y alta constancia. El grupo no te debe el clima emocional del día.',
      'Pack %PAIS: ofensa fácil, propuesta difícil. Lleno de “me sacaron”, vacío de aporte. El valor propio come queja, %N.',
      'Clásico %PAIS: víctima con el teclado, verdugo con el silencio. Eres el clima del hilo. La dignidad no es meteorología.',
      'De %PAIS llegaste con boletín de molestias. Preferimos el parte seco del ranking. %N, el drama en cuotas no cotiza.',
      '%N, sello %PAIS: ego de agravio chico. Sensibilidad selectiva. Confundes ser sensible con ser central.',
      'Exportas de %PAIS la llovizna emocional. El archivo no hace de paño de lágrimas. Empatía infinita no es un derecho tuyo, %N.',
      '%PAIS en el SIM, el barro fino en el hilo. Queja de baja intensidad, resultado grueso en vacío, %N.',
      'De %PAIS, %N alarga el conflicto porque el silencio le da miedo. El silencio era información. Cobarde de tono suave.',
      'Pack %PAIS: “es que me sacaron” como personalidad. El ranking no compra ese boleto.',
      '%N, estereotipo %PAIS: saturación de poco. Archivo seco, orgullo mojado, rastro en cero.'
    ],
  },
  ES: {
    name: 'España',
    lines: [
      'Y de %PAIS, %N: arrogancia con prefijo 34. Europeo superior en un chat que no pide pasaporte. Mucho imperio en la boca, poco en el contador.',
      'Pack %PAIS: soberbia de terraza, entrega de menú del día. Corriges el acento ajeno y aportas en cuotas. VIP mental, basura operativa, %N.',
      'Clásico %PAIS: Latinoamérica como patio trasero del WiFi. Tutorial de “en España se hace así” que nadie pidió. El chat no es tu comunidad de vecinos.',
      'De %PAIS llegaste con monólogo de bar a las tres. Centro de Europa en grupo hispano. La dignidad pidió cierre; tu ego pidió otra caña, %N.',
      '%N, sello %PAIS: corrector ortográfico del continente sin cargo. Tu valor depende de ganar sobremesas; por eso pierdes el hilo.',
      'Exportas de %PAIS el “el español de verdad es el mío”. Spoiler: el ranking escribe en números, no en zeta, %N.',
      '%PAIS en el SIM, el cinismo de capital en la boca. Todo te parece provinciano menos tu vacío. El público pidió la cuenta, %N.',
      'De %PAIS, %N explica la vida ajena y no arregla la propia. PowerPoint de bar sin botones.',
      'Pack %PAIS: “ustedes no entienden Europa”. Acá se entendió de sobra. Por eso el silencio posterior te parte la cara.',
      '%N, estereotipo %PAIS: soberbia de imperio, cimientos de bar de pueblo. El ridículo lo trabajaste tú entre caña y caña.'
    ],
  },
  GT: {
    name: 'Guatemala',
    lines: [
      'Y de %PAIS, %N: calma volcánica que explota por cualquier mensaje. Lava de ego, ceniza de aporte. El grupo evacuó tu monólogo.',
      'Pack %PAIS: misterio barato, constancia nula. Te crees profundo y eres ausencia con bandera. %N, el ranking no compra leyendas.',
      'Clásico %PAIS: sobrevivir al drama sin mover un dedo útil. Medalla de mirón. El valor propio no se farmea mirando, %N.',
      'De %PAIS llegaste con orgullo de altura y utilidad de valle. El chat bajó la montaña sin ti, %N.',
      '%N, sello %PAIS: confundes ser reservado con ser interesante. Silencio no es profundidad: es flojera con paisaje de fondo.',
      'Exportas de %PAIS el drama de altura sin oxígeno de datos. Soft power del vacío. El contador te bajó a cota cero, %N.',
      '%PAIS en el SIM, el incienso en la pose. El archivo no compra rituales. Aporta o sobras, %N.',
      'De %PAIS, %N ofende bajito y aporta más bajo. Se te oye igual. Presencia sin peso.',
      'Pack %PAIS: spoiler de irrelevancia. El misterio ya aburrió. El ego encuentra altura; el contador, el piso.',
      '%N, estereotipo %PAIS: ganar el orgullo y perder el rastro. Documentado.'
    ],
  },
  CU: {
    name: 'Cuba',
    lines: [
      'Y de %PAIS, %N: resistencia solo al aporte. Discurso eterno, teclado prestado. El grupo no es tu asamblea.',
      'Pack %PAIS: nostalgia rica, mensajes en cartilla. El valor propio no se raciona: se demuestra, %N.',
      'Clásico %PAIS: “ustedes no saben” como personalidad. Noticiero sin cierre. El chat cambió de canal.',
      'De %PAIS llegaste con faro apagado y apología del agravio. %N, la dignidad pidió generador de hechos, no de himnos.',
      '%N, sello %PAIS: queja larga, solución corta. Fila infinita del ego. Nadie guarda tu lugar.',
      'Exportas de %PAIS la historia como excusa permanente. El ranking no acepta cupones de pasado, %N.',
      '%PAIS en el SIM, el micrófono en la mano equivocada. Monólogo en el feed. El archivo no aplaude de pie, %N.',
      'De %PAIS, %N pelea el relato y pierde el dato. Orgullo sin entrega. No cotiza.',
      'Pack %PAIS: balsa de ego. El grupo llegó a tierra sin ti. El relato pesa allá; acá pesa el contador.',
      '%N, estereotipo %PAIS: himno eterno, aporte en huelga. Remix de urgencia inútil.'
    ],
  },
  BO: {
    name: 'Bolivia',
    lines: [
      'Y de %PAIS, %N: cerro de ego, aire fino, argumento más fino. El grupo bajó a cotas útiles; tú seguiste sin oxígeno de datos.',
      'Pack %PAIS: dignidad anunciada, entrega a media oxigenación. Everest de orgullo, valle de hechos, %N.',
      'Clásico %PAIS: ofenderte por el clima del hilo. Meteorología emocional. Preferimos el parte seco del ranking.',
      'De %PAIS llegaste de cóndor que no despega. Centro andino en la boca, periferia en el rastro, %N.',
      '%N, sello %PAIS: mucho carácter, poco cargamento. Mina de orgullo sin vetas de utilidad.',
      'Exportas de %PAIS el peso disfrazado de seriedad. Fuerza sin dirección es lastre, %N.',
      '%PAIS en el SIM, el mohín de altura. El archivo no sube esa montaña. Nublas el hilo a propósito, %N.',
      'De %PAIS, %N juzga en silencio y aporta en cuotas. El ranking no cotiza juicio mudo.',
      'Pack %PAIS: mal de montaña del hilo. La altura ya no impresiona. Ego en cumbre, contador en valle.',
      '%N, estereotipo %PAIS: ganar el orgullo y perder el rastro. Mismo final.'
    ],
  },
  DO: {
    name: 'República Dominicana',
    lines: [
      'Y de %PAIS, %N: dembow de ego sin segunda estrofa útil. Pegajoso, repetitivo, vacío. El grupo bajó el volumen.',
      'Pack %PAIS: alegría anunciada, aporte que no llega a la pista. DJ de autoestima, pista vacía de hechos, %N.',
      'Clásico %PAIS: resolverlo todo “en confianza”. Contactito que no contacta resultados. El ranking no baila esa.',
      'De %PAIS llegaste de flow y entregaste buffer. Playlist sin hits. La dignidad pidió skip, %N.',
      '%N, sello %PAIS: labia alta, constancia baja. After vendido como concierto. Resaca de promesas.',
      'Exportas de %PAIS la simpatía como sustituto de utilidad. No suma en el contador, %N.',
      '%PAIS en el SIM, la farra verbal en la boca. El archivo no está de party. Intro eterno, drop de aporte nunca, %N.',
      'De %PAIS, %N ambienta para no cargar. Hueco bajo el beat. Flow sin sustancia.',
      'Pack %PAIS: resort de ego. Checkout. El flow vende allá; acá vende el rastro.',
      '%N, estereotipo %PAIS: ganar la pista y perder el hilo. Estríbillo de basura.'
    ],
  },
  HN: {
    name: 'Honduras',
    lines: [
      'Y de %PAIS, %N: tormenta anunciada, poco refugio útil. El grupo sacó el paraguas y te dejó fuera.',
      'Pack %PAIS: dureza verbal, aporte intermitente. Leyenda de aguante, alerta amarilla de utilidad, %N.',
      'Clásico %PAIS: resolver a gritos lo que pedía un dato. Sirena sin plan. El ranking no corre.',
      'De %PAIS llegaste de centro del mapa y aportaste margen. Camino de tierra: se nota cuando llueve drama, %N.',
      '%N, sello %PAIS: orgullo alto, entrega irregular. Puente que tiembla. Nadie carga de más sobre ti.',
      'Exportas de %PAIS el peso disfrazado de fuerza. Sin dirección eres lastre, %N.',
      '%PAIS en el SIM, el lodazal en el hilo. Enturbias y ofendes fácil. El chat eligió ruta alterna, %N.',
      'De %PAIS, %N gana el grito y pierde el rastro. Dureza sin resultado. No cotiza.',
      'Pack %PAIS: bache del hilo. La dureza ya no impresiona. Ego en pelea, contador en puntos en contra.',
      '%N, estereotipo %PAIS: volumen alto, plan en cero. Documentado.'
    ],
  },
  PY: {
    name: 'Paraguay',
    lines: [
      'Y de %PAIS, %N: siesta del aporte. Largo descanso, corto despertar útil. El grupo laburó la jornada sin ti.',
      'Pack %PAIS: dignidad en voz baja, entrega más baja. Biblioteca de silencio, anaquel vacío, %N.',
      'Clásico %PAIS: mirar de reojo y no cargar. Vecino del hilo. El ranking no cotiza miradas.',
      'De %PAIS llegaste de equilibrio y entregaste desbalance. Tereré del drama: se estira, no alimenta, %N.',
      '%N, sello %PAIS: poco ruido, menos sustancia. Ausencia educada. Duele menos de lo que tu ego imagina.',
      'Exportas de %PAIS la calma como excusa de prescindible. Olvido con buenas maneras, %N.',
      '%PAIS en el SIM, la sombra en el aporte. Prefieres no molestar y no sumar. El chat premia lo segundo cuando falta, %N.',
      'De %PAIS, %N es mute con foto. El misterio del silencio ya no vende. Discreción sin peso.',
      'Pack %PAIS: no perder… y tampoco ganar nada en el rastro. Empate de basura.',
      '%N, estereotipo %PAIS: quietud de cementerio con WiFi. Mismo final en voz baja.'
    ],
  },
  SV: {
    name: 'El Salvador',
    lines: [
      'Y de %PAIS, %N: chispa sin circuito. Voltaje de ego que quema el aporte. El grupo bajó los plomos.',
      'Pack %PAIS: carácter denso, entrega irregular. Récord de orgullo por kilómetro; cortocircuito de hechos, %N.',
      'Clásico %PAIS: resolver en caliente lo que pedía un mensaje. Disputa innecesaria. El ranking suma, no pelea.',
      'De %PAIS llegaste de centro de mapa chico y aportaste drama grande. Temblor del hilo, %N.',
      '%N, sello %PAIS: orgullo alto, paciencia baja. Fusible del chat: siempre saltas tú.',
      'Exportas de %PAIS el roce disfrazado de franqueza. Directo sin sustancia es abrasión, %N.',
      '%PAIS en el SIM, el cortocircuito en el hilo. Electrificas sin iluminar. Ego en pelea, contador en contra, %N.',
      'De %PAIS, %N gana el tono y pierde el contenido. Intensidad sin resultado. No cotiza.',
      'Pack %PAIS: apagón del hilo. La dureza ya no impresiona. Credenciales chamuscadas.',
      '%N, estereotipo %PAIS: subir el tono y bajar el rastro. Documentado.'
    ],
  },
  NI: {
    name: 'Nicaragua',
    lines: [
      'Y de %PAIS, %N: capítulo eterno sin trama útil. Discurso solemne, cierre de aporte en huelga. El grupo cambió de libro.',
      'Pack %PAIS: orgullo denso, constancia floja. Portada en proclamas, nota al pie en hechos, %N.',
      'Clásico %PAIS: el chat como plaza pública. Mitin de uno. El ranking no vota esa lista.',
      'De %PAIS llegaste de faro moral y aportaste niebla. Apagones de utilidad, %N.',
      '%N, sello %PAIS: mucho relato, poco recibo. Promesa de cambio que no llega al hilo.',
      'Exportas de %PAIS la intensidad como sustituto de importancia. Ruido con atril, %N.',
      '%PAIS en el SIM, el himno en bis. Prefieres el discurso al párrafo útil. El contador no hace mítines, %N.',
      'De %PAIS, %N gana el relato y pierde el número. Solemnidad sin sustancia. No cotiza.',
      'Pack %PAIS: monumento al ego. El falso cumplido de la tierra se derrumba solo.',
      '%N, estereotipo %PAIS: alargar el discurso y acortar el aporte. Mismo final.'
    ],
  },
  CR: {
    name: 'Costa Rica',
    lines: [
      'Y de %PAIS, %N: pura pose. Postcard del ego, vacío en el reverso. El grupo ya no manda recuerdos.',
      'Pack %PAIS: amabilidad anunciada, aporte intermitente. Parque nacional mental, sendero cerrado de hechos, %N.',
      'Clásico %PAIS: quedar bien y cargar poco. “Con mucho gusto” sin gusto por el trabajo. El ranking no cotiza sonrisas.',
      'De %PAIS llegaste de paraíso y aportaste zona de obras. Turista en tu propio hilo, %N.',
      '%N, sello %PAIS: mucha calma, poca carga. Hamaca del aporte: se ve cómoda, no avanza.',
      'Exportas de %PAIS lo nice como sustituto de necesario. Decoración con bandera, %N.',
      '%PAIS en el SIM, el brochure en la boca. El archivo pide movimiento. Paz verbal, rastro en huelga, %N.',
      'De %PAIS, %N queda bien y queda fuera del ranking útil. Pura vida sin vida en el contador.',
      'Pack %PAIS: mute educado. La calma ya no vende. Ego en playa, contador en bajamar.',
      '%N, estereotipo %PAIS: sonreír y no cargar. Mismo final.'
    ],
  },
  PA: {
    name: 'Panamá',
    lines: [
      'Y de %PAIS, %N: peaje de ego. Todo el drama pasa por ti y no queda carga útil. El grupo abrió ruta alterna.',
      'Pack %PAIS: labia comercial, entrega a medias. Franquicia de peajes mentales, vía cerrada de hechos, %N.',
      'Clásico %PAIS: comisión emocional. Intermediario que no intermedia resultados. El ranking no paga esa tarifa.',
      'De %PAIS llegaste de hub y aportaste demora. Contenedor vacío con bandera, %N.',
      '%N, sello %PAIS: mucho movimiento anunciado, poco atraque. Barco que no atraca. Valor propio en el muelle.',
      'Exportas de %PAIS la agenda llena como sustituto de utilidad. Rastro vacío, %N.',
      '%PAIS en el SIM, el atajo en la boca. El archivo no hace escala. Deal sin entrega final, %N.',
      'De %PAIS, %N negocia todo menos su propia mejora. Canal sin barcos. No cotiza.',
      'Pack %PAIS: contenedor vacío. El misterio del deal ya no impresiona. Semáforo del contador en rojo.',
      '%N, estereotipo %PAIS: mover fichas y no mover el rastro. Mismo final.'
    ],
  },
  UY: {
    name: 'Uruguay',
    lines: [
      'Y de %PAIS, %N: mate del ego. Ronda eterna, yerba de juicio, cero dulzor útil. El grupo cambió de termo.',
      'Pack %PAIS: seriedad anunciada, entrega tibia. Manual de mesura, nota al margen de hechos, %N.',
      'Clásico %PAIS: mirar al resto como ruidoso por defecto. Árbitro sin partido. El ranking no pide tu silbato.',
      'De %PAIS llegaste de equilibrio y aportaste empate eterno. 0-0 del hilo. La dignidad pidió un gol de aporte, %N.',
      '%N, sello %PAIS: poco show, menos sustancia. Sobriedad que tapa flojera. Se lee.',
      'Exportas de %PAIS la cara larga como sustituto de ser interesante. Seriedad sin rastro es ceño, %N.',
      '%PAIS en el SIM, el mohín educado. El archivo no se impresiona. Juicio en voz baja, aporte en huelga, %N.',
      'De %PAIS, %N no exagera… y no aporta. El medio vacío no es virtud. Mesura sin peso.',
      'Pack %PAIS: mute con compostura. La seriedad ya no vende. Ego en empate, contador ganando.',
      '%N, estereotipo %PAIS: no perder el estilo y perder el rastro. Mismo final en voz baja.'
    ],
  },
  PR: {
    name: 'Puerto Rico',
    lines: [
      'Y de %PAIS, %N: reguetón de ego sin drop de aporte. Todos oyen el bajo, nadie baila tu utilidad. El grupo pidió skip.',
      'Pack %PAIS: actitud alta, constancia a medias. Tendencia en views mentales, intro saltado en hechos, %N.',
      'Clásico %PAIS: estrella en chat de barrio. Feat que nadie pidió. El ranking no da credits.',
      'De %PAIS llegaste de puente y aportaste peaje. Colonia de ego: dependes del aplauso, %N.',
      '%N, sello %PAIS: mucho swagger, poco manifiesto de carga. Videoclip sin canción. Valor propio sin letra.',
      'Exportas de %PAIS la intensidad como sustituto de indispensable. Eco con auto-tune, %N.',
      '%PAIS en el SIM, la farándula en la boca. El archivo no está en premiere. Intro eterno, estribillo de aporte nunca, %N.',
      'De %PAIS, %N ambienta para no cargar. Hueco bajo el beat. Flow sin sustancia.',
      'Pack %PAIS: resort de ego. Checkout. El flow vende allá; acá vende el rastro.',
      '%N, estereotipo %PAIS: ganar la pista y perder el hilo. Estríbillo de basura documentada.'
    ],
  }
};


function countryFromTarget(target, participant) {
  const candidates = [];
  if (participant?.phoneNumber) candidates.push(String(participant.phoneNumber));
  try {
    const can = canonicalJid(target);
    if (can) candidates.push(String(can));
  } catch (_) {}
  candidates.push(String(target || ''));
  for (const raw of candidates) {
    const digits = String(raw).split('@')[0].split(':')[0].replace(/\D/g, '');
    if (!digits || digits.length < 8 || digits.length > 15) continue;
    const phone = parsePhoneNumberFromString('+' + digits);
    if (phone && phone.country) {
      return { iso: phone.country, callingCode: phone.countryCallingCode };
    }
  }
  return null;
}

function mentionId(target) {
  return String(target).split('@')[0].split(':')[0];
}

async function cmdRoast(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);
  const target = getTarget(msg);
  if (!target) return;

  if (sameUser(target, sender)) {
    return sock.sendMessage(jid, {
      text: 'Roastearte a ti mismo es un nivel de autodestrucción que ni este bot va a regalarte.',
    }, { quoted: msg });
  }

  const tag = `@${mentionId(target)}`;

  if (isMainOwner(target, false, groupMeta)) {
    const text =
      `${pickFresh(HEADERS, `${jid}|roast|hdr`)}\n` +
      `╾━━━━━━━━━━━━━━╼\n\n` +
      `Víctima: ${tag}\n\n` +
      `${pickFresh(OWNER_ROAST, `${jid}|roast|owner`).replace(/%N/g, tag)}\n\n` +
      `╾━━━━━━━━━━━━━━╼\n` +
      `${pickFresh(CLOSERS, `${jid}|roast|end`)}`;
    return sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
  }

  const participants = groupMeta?.participants || [];
  const participant = participants.find(p =>
    bareJid(p.id) === bareJid(target) ||
    bareJid(p.lid) === bareJid(target) ||
    bareJid(p.phoneNumber) === bareJid(target)
  );

  const msgCount = await getUserCount(jid, target);

  // Directo: golpe de actividad + golpe de país/autoestima + punch final. Sin falso cumplido.
  const act = pickFresh(getActivity(msgCount), `${jid}|roast|act`)
    .replace(/%N/g, tag)
    .replace(/%C/g, fmt(msgCount));

  let second;
  const geo = countryFromTarget(target, participant);
  if (geo?.iso && COUNTRY_ROAST[geo.iso]) {
    const entry = COUNTRY_ROAST[geo.iso];
    second = pickFresh(entry.lines, `${jid}|roast|country|${geo.iso}`)
      .replace(/%N/g, tag)
      .replace(/%PAIS/g, entry.name);
  } else {
    second = pickFresh(DEST_GEN, `${jid}|roast|gen`).replace(/%N/g, tag);
  }

  const body = `${act} ${second}`;

  const text =
    `${pickFresh(HEADERS, `${jid}|roast|hdr`)}\n` +
    `╾━━━━━━━━━━━━━━╼\n\n` +
    `Víctima: ${tag}\n\n` +
    `${body}\n\n` +
    `╾━━━━━━━━━━━━━━╼\n` +
    `${pickFresh(CLOSERS, `${jid}|roast|end`)}`;

  await sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
}

module.exports = { cmdRoast };
