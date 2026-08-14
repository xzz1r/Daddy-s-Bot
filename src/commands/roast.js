'use strict';
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const { getSender, getTarget, isMainOwner, bareJid, sameUser, canonicalJid } = require('../utils/wa');
const { pickFresh, fmt } = require('../utils/helpers');
const { getUserCount } = require('../utils/messageCounter');

const HEADERS = [
  '*ROAST SIN ANESTESIA*',
  '*EJECUCIÓN PÚBLICA*',
  '*AUTOPSIA EN DIRECTO*',
  '*DESTRUCCIÓN TOTAL DEL EGO*',
  '*ENTIERRO ABIERTO*',
  '*MASACRE DOCUMENTADA*',
  '*ASADO HASTA EL HUESO*',
  '*DEMOLICIÓN CONTROLADA*',
  '*VOLADURA PSICOLÓGICA*',
  '*SENTENCIA SIN APELACIÓN*',
  '*DESMONTAJE EN DIRECTO*',
  '*VEREDICTO DEL CHAT*',
  '*HUMILLACIÓN TÉCNICA*',
  '*QUEMA CONTROLADA DEL EGO*',
  '*AJUSTE DE CUENTAS*',
  '*EXPOSICIÓN TOTAL*',
  '*GOLPE DE GRACIA*',
  '*TUMBA DEL EGO*',
  '*ARCHIVO DEL FAIL*',
  '*LECTURA EN VOZ ALTA*'
];

const CLOSERS = [
  '_Tu autoestima acaba de pedir asilo en otro número._',
  '_El espejo pidió cambio de turno después de esto._',
  '_Guardá el ego: lo vamos a necesitar para la próxima autopsia._',
  '_Si la dignidad tuviera chat, te habría bloqueado._',
  '_Fin del informe. El orgullo no figura en el resumen._',
  '_El grupo ya tiene el meme. Tú solo eres el archivo fuente._',
  '_Bajá la foto de perfil: el daño ya está hecho._',
  '_No hay modo avión que te salve el frame._',
  '_Firmado por el contador. El ego puede alegar en silencio._',
  '_Siguiente. Este ya quedó catalogado en la sección “casi persona”._'
];

const OWNER_ROAST = [
  '%N, qué privilegio tenerte: el bot te baja la voz y aun así lográs que el resto te odie con estilo. Eres un jefe de juguete: nadie te vota, todos te escuchan por si acaso. El día que el ego pese menos, el chat respira.',
  'Mira el señor intocable, %N. Camina como si el WiFi saliera de su aura. Eres el creído que tiene razón demasiadas veces: por eso da rabia. Baja un cambio antes de ser sticker de advertencia.',
  '%N, hijo de puta con suerte: todo le sale y tiene cara de “yo ya lo sabía”. Eres un tutorial que nadie pidió y todos terminan mirando. No te odian por poderoso; te odian por insufrible con pruebas.'
];

function getActivityPhrases(count) {
  const c = fmt(count);
  if (count <= 0) {
    return [
      '%N, qué misterio tan profundo: cero mensajes y aura de protagonista. Eres como un museo cerrado los lunes… todos los días. El grupo no te extraña; el silencio sin tú suena igual. Tu valor propio cotiza en “próximamente” desde siempre.',
      '%N, el contador en 0 no es minimalismo: es deserción con foto de perfil. Eres el WiFi del vecino: todos saben que está, nadie lo usa. Si la autoestima fuera datos, estarías en modo avión permanente.',
      '%N con 0 en el marcador. Fantasma de lujo: online para mirar, offline para existir. Eres una notificación que nunca abre. El ranking de útiles no te bloqueó: nunca te agregó.',
      'Qué disciplina, %N: no aportar nada y aun así ocupar sitio. Eres el impuesto al silencio. Si el grupo cobrara alquiler por ego sin uso, estarías desalojado antes del primer mensaje.',
      '%N, cero mensajes y presencia de lista. Eres un extra que pidió crédito de protagonista. El chat funciona sin tú y esa es la reseña más honestamente cruel de tu día.',
      '%N, el misterio de no escribir ya aburrió. Eres mobiliario con número. La autoestima que se esconde en el silencio no es profunda: está ausente.',
      'Contador en 0, %N. El grupo aprendió a construir sin tu turno. Eres el hueco que no duele. Eso debería asustarte más que cualquier insulto.',
      '%N, fantasma certificado. Lees el drama ajeno y no pagas el peaje de una línea. Eres público eterno en obra ajena. El valor propio no se farmea mirando.',
      '%N en 0. Estar silenciado por pose no te hace interesante: te hace prescindible. Eres el modo avión con foto. El chat no renovó tu contrato emocional.',
      '%N, 0 mensajes. No eres discreto. Eres ausencia con avatar. Si la dignidad tuviera admin, te habría sacado de moderación.'
    ];
  }
  if (count < 20) {
    return [
      '%N, %C mensajes: casi un debut… si el debut no hubiera durado años. Eres un tráiler eterno sin película. El grupo aprendió a no esperarte; eso no es misterio, es olvido educado. Tu autoestima sigue esperando el estreno.',
      'Hay esfuerzo en esas %C líneas, %N: el mínimo para no te borren y el máximo para no servir. Eres el buffer del chat. Si el valor se midiera en ecos, tu eco volvería vacío.',
      '%N con solo %C. Aparecés lo justo para recordar que existís y desapareces lo justo para que nadie note la diferencia. Eres una actualización que nadie instaló. El ego ocupa gigas.',
      '%C mensajes, %N. Suficiente para molestar, insuficiente para importar. Eres el ruido blanco del hilo. La gente no te odia: te administra como una pestaña de más.',
      '%N, %C en el contador. Entraste a mirar el incendio y te quedaste sin balde. Eres el vecino que filma. El grupo ya tiene el video; tú seguís sin la escena útil.',
      '%N con %C. Casi no existís y aun así el ego pide platea. Eres la suscripción que nadie renueva. El chat te tiene en “tal vez después”.',
      '%C textos, %N. Historial de quien prueba el agua y nunca se tira. Eres la reseña de 2 estrellas hecha persona. Ni aplauso ni odio: indiferencia activa.',
      '%N, %C mensajes. Parásito de bajo consumo: estás, miras, no cargás. Eres el cable que solo estorba. La autoestima no debería vivir de eso.',
      'Con %C, %N, construís olvido con precisión. Existir en la lista no es existir en el hilo. El ranking de útiles no te busca.',
      '%N lleva %C. Insuficiente para voz, sobrado para ocupar espacio. Eres el invitado que no trae nada y se queda hasta el final.'
    ];
  }
  if (count < 60) {
    return [
      '%N con %C mensajes: ni fantasma total ni pilar. Eres el limbo con teclado. Como un cargador que solo funciona en un ángulo. El grupo te tolera; no confundas tolerancia con respeto.',
      '%C en el marcador, %N. Actividad de quien prueba el agua y nunca se tira. Eres la reseña de 3 estrellas hecha persona. Ocupas el medio que nadie cotiza.',
      '%N, %C textos. Cumplís el mínimo para opinar y el máximo para no cargar nada. Eres el copiloto que toca el volante cuando el camino ya está derecho.',
      'Con %C mensajes, %N, estás en el mapa… dibujado con lápiz. Existir no es lo mismo que importar. El chat te lee en diagonal; tu ego, en negrita.',
      '%N lleva %C. Racha de tibieza. Eres el café tibio del grupo: nadie lo tira, nadie lo pide. El contador le hace seña a tu autoestima: seguí buscando.',
      '%C mensajes, %N. Historial de intermitencia. Eres la serie cancelada a mitad de temporada. El grupo ya vio el patrón.',
      '%N con %C. Suficiente para defenderte, poco para que el grupo te deba algo. El ego cotiza como outlier; los datos no.',
      '%N, %C: ruido intermitente con pose de criterio. Eres el control remoto sin pilas.',
      'A %C, %N, todavía no demostraste que el grupo gane algo con tenerte. Eres la promesa de aporte. La autoestima no se cobra en promesas.',
      '%N con %C. Zona gris del hilo. Eres el “meh” hecho persona. El ranking no pelea por los meh.'
    ];
  }
  if (count < 150) {
    return [
      '%N, %C mensajes: ya no eres invisible, todavía no eres indispensable. Eres el empleado del mes en una oficina sin mes. El grupo te reconoce; no te debe.',
      'Con %C en el contador, %N, hay rastro y techo bajo. Eres la serie renovada por inercia. Poco para que alguien pelee por tú en el ranking.',
      '%N con %C. Zona donde el ego se infla y el historial pide pruebas. Eres un borrador con firma. El “en proceso” ya venció.',
      '%C mensajes, %N. Pertenecés al chat; el chat no depende de ti. Eres el cable de más en la caja. La autoestima que se apoya ahí está mal asegurada.',
      '%N, %C: clase media del hilo. Eres el promedio con wifi. El problema es que tu ego cotiza como outlier.',
      '%N lleva %C. Hay base y techo de yeso. Eres el almost permanente. El grupo ya no se emociona con tus picos.',
      'A %C, %N, el archivo te conoce y no te debe lealtad. Eres presencia estable sin ser columna.',
      '%N con %C mensajes. Motor a media marcha. Eres el que llega cuando el trabajo pesado ya empezó.',
      '%C textos, %N. Dejaste de ser fantasma y todavía no eres referente. Eres el puente a mitad de río.',
      '%N, %C. El mapa te tiene; el podio no. Discurso de punta con números de medio. Se nota el desajuste.'
    ];
  }
  return [
      '%N con %C mensajes. Sostienes hilo de verdad. Eres de los que empujan el carro mientras otros discuten el color. El grupo te debe sitio por trabajo… no por pose.',
      '%C en el contador, %N. Motor del chat, no decoración. Presencia que duele cuando falta. No lo conviertas en soberbia de dueño del grupo.',
      '%N, %C mensajes. Farmeaste respeto a fuerza de escribir. Eres el antídoto del fantasma. Si el ego se te sube, el próximo roast cobra intereses.',
      'Con %C textos, %N, ya no eres relleno: eres esqueleto del hilo. La autoestima también se oxida si se apoya solo en el contador.',
      '%N lleva %C. Actividad alta, rastro claro. Celébralo… y prepárate: cuanto más alto el número, más rico el asado cuando toque.',
      '%C mensajes, %N. Constancia de verdad. El respeto está ganado; la soberbia, en observación.',
      '%N con %C. El ranking te hace lugar por trabajo. No lo arruines con pose de intocable.',
      '%N, %C en el marcador. De los que escriben de verdad. Eso es poder… y responsabilidad. No lo gastes en teatro barato.',
      'A %C, %N, eres parte del esqueleto. El próximo golpe duele más justo porque el número te respaldó.',
      '%N con %C. Actividad que pesa. Disfrútalo sin convertirlo en aureola: el contador no es santo.'
  ];
}

const COUNTRY_ROAST = {
  AR: {
    name: 'Argentina',
    lines: [
      '%N, de %PAIS: qué nivel de análisis… para terminar corrigiendo al grupo como si fuera tu provincia. Eres la soberbia con prefijo: ego de selección y rendimiento de amistoso. En el ranking cotizas como alarma de prepotencia.',
      'Hay algo admirable en %N: la confianza de %PAIS sin el respaldo del resultado. Eres el tutorial que nadie pidió y todos mutean. Rico en verso; en hechos, en default.',
      '%N exporta de %PAIS la costumbre de mirar al resto como “el interior”. Mucho norte en la boca, poco terreno ganado. El chat ya te midió sin tu cátedra.',
      'De %PAIS, %N. El estereotipo no tuvo que trabajar: trajiste el monólogo de fábrica. Himno a volumen máximo en asado ajeno. La dignidad pide auriculares.',
      '%N, pack %PAIS: palabras largas, ideas cortas y ofensa fácil. Corrector automático sin permiso de admin. Tu valor propio depende de ganar discusiones; por eso perdés las importantes.',
      '%N de %PAIS: te crees el estándar del continente y no llegas al del hilo. PowerPoint sin botones y con soberbia de presentación plena.',
      'Prefijo %PAIS, %N. Exportas cuento de superioridad a un grupo que ya te auditó. El ego sigue en gira; el público pidió la cuenta hace rato.',
      '%N, en %PAIS habrá cracks; tú saliste en el lote del que explica todo y no mueve nada. El archivo no aplaude monólogos.',
      'Clásico %PAIS, %N: el “ustedes no entienden” como personalidad. Acá entendimos de sobra. Por eso el silencio duele más que el roast.',
      '%N, soberbia de building y cimientos de cartón. %PAIS te dio el prefijo; el ridículo lo trabajaste tú entre verso y verso.',
      '%N, de %PAIS: el falso cumplido se escribe solo —qué país— y se cae solo. Eres imperio de sobremesa. El grupo firmó la independencia de tu monólogo.',
      'Hay porte en %N: el del que llega tarde y corrige la hora. Pack %PAIS. Si la autoestima fuera horario, llegarías tarde a tu propio valor.',
      '%N exporta de %PAIS la costumbre de ser el más listo de la mesa. En este chat la mesa es el ranking, y no vas primero.',
      'De %PAIS, %N. Te crees el faro del idioma y aportás niebla. El faro está apagado; el barco del grupo ya dobló la costa.',
      '%N, pack %PAIS de ironía barata y resultado caro de mirar. El espejo no acepta transferencias de excusas.',
      '%N de %PAIS: mucho “cultura” en la bio mental y poco cultivo en el hilo. Se nota la sequía de sustancia.',
      'Prefijo %PAIS, %N. Exportación de prepotencia detectada. Devolución al remitente con gastos de ego.',
      '%N, en %PAIS el ego es deporte nacional en tertulia. Acá te descalifican por fair play nulo en el contador.',
      'Clásico %PAIS, %N: el monólogo eterno para no escuchar el dato que te incomoda. El dato sigue ahí.',
      '%N hace de %PAIS el chiste del continente sin querer. El punchline eres tú, sin necesidad de narrador.',
      '%N, de %PAIS: qué seguridad… para terminar midiendo al resto en provincias. Eres mapa mal dibujado. El ranking no usa tu brújula.',
      'Hay labia en %N: de selección. Pack %PAIS de promesa alta y entrega de suplente. El chat ya hizo los cambios.',
      '%N exporta de %PAIS el “en realidad es así” sin prueba. Spoiler: no era así. El archivo lo firmó.',
      'De %PAIS, %N. Te vendes como nivel Europa del Sur y entregás drama de grupo. Soft power del cringe rioplatense.',
      '%N, pack %PAIS: ofenderte con estilo y aportar sin estilo. El estilo no tapa el hueco del contador.',
      '%N de %PAIS: si el ego pagara impuestos, estarías auditado. %PAIS no te exonera acá.',
      'Prefijo %PAIS, %N. Embajador no pedido de la cátedra. Credenciales no renovadas por el hilo.',
      '%N, en %PAIS habrá gente brillante; tú estás en el feed del que corrige y no construye. Se lee.',
      'Clásico %PAIS, %N: ganar la pelea del verso y perder la del rastro. El ranking no discute en metáforas.',
      '%N hace de %PAIS un himno a la sobrada. El cierre se escribe solo, sin guitarra.'
    ],
  },
  ES: {
    name: 'España',
    lines: [
      '%N, de %PAIS: qué gracia la de ir de europeo superior en un chat donde el ranking no pide pasaporte. Eres la arrogancia con prefijo 34: mucho imperio en la boca y poco imperio en el contador. El grupo ya te hizo la Reconquista al revés.',
      'Hay estilo en %N: el de corregir el acento ajeno mientras el aporte llega en cuotas. Pack %PAIS de soberbia de terraza y entrega de menú del día. Si la autoestima se midiera en cañas, serías VIP; en hechos, estás de menú infantil.',
      '%N exporta de %PAIS la costumbre de mirar Latinoamérica como si fuera el patio trasero del WiFi. Eres el tutorial de “en España se hace así” que nadie pidió. El chat no es tu comunidad de vecinos.',
      'De %PAIS, %N. El estereotipo del que se cree el centro de Europa en un grupo hispano no tuvo que esforzarse: trajiste el monólogo de fábrica. Himno a volumen de bar a las 3. La dignidad pidió cierre.',
      '%N, pack %PAIS: queja olímpica, siesta productiva y ofensa fácil cuando te tocan el ego. Eres el corrector ortográfico del continente… sin cargo. Tu valor propio depende de ganar la sobremesa; por eso perdés el hilo.',
      '%N de %PAIS: te crees el estándar del idioma y no llegas al estándar del aporte. Eres la RAE con teclado y sin obra. El ranking no cotiza gramática sin sustancia.',
      'Prefijo %PAIS, %N. Exportas cinismo de capital a un grupo que ya te midió sin tu cátedra. El ego sigue de tapas; el público pidió la cuenta.',
      '%N, en %PAIS habrá cracks; tú saliste en el lote del que explica la vida ajena y no arregla la propia. PowerPoint de bar sin botones.',
      'Clásico %PAIS, %N: el “es que ustedes no entienden Europa” como personalidad. Acá entendimos de sobra. Por eso el silencio duele más que el roast.',
      '%N, soberbia de imperio y cimientos de bar de pueblo. %PAIS te dio el prefijo; el ridículo lo trabajaste tú entre caña y caña.',
      '%N, de %PAIS: qué nivel de ironía… para terminar siendo el meme del chat. Eres la condescendencia con jamón: todo el mundo es “latinos” menos cuando pides respeto. El archivo no hace excepciones ibéricas.',
      'Hay finura en %N: de terraza. Pack %PAIS de desprecio suave y aportación intermitente. Si la autoestima se midiera en sobradas, serías rico; en peso real, flotás.',
      '%N exporta de %PAIS el “ya está todo inventado aquí”. Eres el museo que cobra entrada y no tiene exposición. El grupo no renovó la visita.',
      'De %PAIS, %N. Te crees el adulto de la sala hispana y no sostienes el hilo cuando pesa. Eres superioridad de manual escolar. La dignidad no se firma en la UE del ego.',
      '%N, prefijo %PAIS y ego de que el resto habla “mal”. El ranking no premia el acento; premia el rastro. El tuyo pide refuerzo.',
      '%N de %PAIS: confundes ser directo con ser insoportable. Acá el directo sin sustancia es solo ruido con zeta.',
      'Labia de tertulia, sustancia de monólogo, %N. %PAIS en el SIM y el vacío en la propuesta.',
      '%N, el español de %PAIS que viene a dar lecciones y se lleva el roast. El chat no es tu EBAU emocional.',
      'Clásico %PAIS, %N: ofenderte por el tono y aportar cero al fondo. El archivo no llora en castellano neutro.',
      '%N hace de %PAIS un tutorial de arrogancia con wifi. No cotiza.',
      '%N, de %PAIS: qué cultura… para terminar midiendo al resto con prejuicio de balcón. Eres el prejuicio con pasaporte. El grupo ya te clasificó sin aduanas.',
      'Hay orgullo en %N: el del prefijo. Pack %PAIS de historia larga y paciencia corta. Si la autoestima se alimentara de siglo de oro, estarías lleno; de mensajes útiles, en ayuno.',
      '%N exporta de %PAIS la soberbia de quien cree que el español “de verdad” es el suyo. Spoiler: el ranking escribe en números.',
      'De %PAIS, %N. Te vendes como nivel Europa y entregás drama de grupo de WhatsApp. Soft power del cringe ibérico.',
      '%N, pack %PAIS: mucho “hay que ser serios” y poco ser serio cuando toca cargar. El chat te tolera; no te debe la monarquía del ego.',
      '%N de %PAIS: el “en mi país esto no pasa” como comodín. Acá pasa: te leyeron entero.',
      'Prefijo %PAIS, %N. Embajador no pedido de la condescendencia. Credenciales no renovadas.',
      '%N, en %PAIS habrá gente brillante; tú estás en el feed del que corrige y no construye.',
      'Clásico %PAIS, %N: ganar la pelea del estilo y perder la del contenido.',
      '%N hace de %PAIS un himno a la sobrada. El cierre se escribe solo.',
      '%N, de %PAIS: qué seguridad… para terminar siendo el que más se ofende. Eres la fragilidad con bandera. El roast solo hizo de espejo.',
      'Hay soltura en %N: de bar. Pack %PAIS de chiste fácil y autocrítica imposible. Rico en gracia ajena; pobre en la propia.',
      '%N exporta de %PAIS el cinismo de capital. Todo te parece provinciano menos tu ego. El archivo es capital del dato.',
      'De %PAIS, %N. Te crees ilegible y eres predecible: soberbia, corrección, cero entrega. Manual.',
      '%N, prefijo %PAIS y talento para mirar feo el hilo. El hilo no te debe respeto automático.',
      '%N de %PAIS: si el ego pagara IVA, estarías auditado por Hacienda emocional.',
      'Código %PAIS, %N: más energía en quedar por encima que en quedar bien.',
      '%N, %PAIS en el número y el cuento en la boca. El contador no compra cuentos.',
      'Clásico %PAIS, %N: explicar de más para no asumir de más.',
      '%N, veredicto %PAIS: soberbia alta, utilidad en duda, respeto en negociación.',
      '%N, de %PAIS: el falso cumplido se escribe solo —qué continente— y se cae solo. Eres el imperio que no cabe en un mensaje. El grupo ya firmó la independencia de tu monólogo.',
      'Hay porte en %N: el del que llega tarde y corrige la hora. Pack %PAIS. Si la autoestima fuera horario peninsular, llegarías tarde a tu propio valor.',
      '%N exporta de %PAIS la costumbre de ser el más listo de la sobremesa. En este chat la sobremesa es el ranking, y no vas primero.',
      'De %PAIS, %N. Te crees el faro del idioma y aportás niebla. El faro está apagado; el barco del grupo ya dobló.',
      '%N, pack %PAIS de ironía barata y resultado caro de mirar. El espejo no acepta bizum de excusas.',
      '%N de %PAIS: mucho “cultura” en la bio mental y poco cultivo en el hilo. Se nota la sequía.',
      'Prefijo %PAIS, %N. Exportación de prepotencia detectada. Devolución al remitente con gastos.',
      '%N, en %PAIS el ego es deporte nacional en tertulia. Acá te descalifican por fair play nulo.',
      'Clásico %PAIS, %N: el monólogo eterno para no escuchar el dato que te incomoda.',
      '%N hace de %PAIS el chiste del continente sin querer. El punchline eres tú.'
    ],
  },
  CO: {
    name: 'Colombia',
    lines: [
      '%N, de %PAIS: qué labia tan fina… para terminar vendiendo humo al por menor. Eres la viveza con WiFi: todo se “acomoda” menos tu historial. El grupo ya no compra; archiva.',
      'Hay talento en %N: sonreír mientras el aporte no aparece. Pack %PAIS de cuento bien contado y entrega que nunca llega. Rico en promesas; pobre en recibos.',
      '%N exporta de %PAIS la confianza de vivo y la constancia de flyer. Comercial de madrugada: el producto no llega y el anuncio sigue.',
      'De %PAIS, %N. Te crees táctico y salís predecible. El “ya veo” eterno como estrategia de no hacer. El ranking vio de sobra.',
      '%N, prefijo %PAIS y software de “tranquilo que se resuelve”. Nunca se resuelve. Reunión que pudo ser un mensaje… y ni el mensaje sirvió.',
      '%N de %PAIS: confundes ser pillo con ser útil. Acá no eres ninguna de las dos. El chat lo huele sin detector.',
      'Labia de comercial, sustancia de flyer, %N. %PAIS en el SIM y el vacío en la promesa firmada solo por tu ego.',
      '%N de %PAIS: el vivo vive del bobo. Acá el vivo queda expuesto y el ranking no hace de cómplice.',
      'Clásico %PAIS, %N: malicia para el chisme, torpeza para el aporte. El archivo cotiza lo segundo.',
      '%N hace de %PAIS un tutorial de confianza sin evidencia. El contador no fuma tu humo.',
      '%N, de %PAIS: el falso cumplido —qué paisa mental— se derrite solo. Eres deal de ego. Checkout obligado.',
      'Hay olfato en %N: de negocio. Pack %PAIS de sonrisa y poco descargue útil en el hilo.',
      '%N exporta de %PAIS el “yo te acomodo” y no acomoda ni el aporte propio. Se nota el hueco.',
      'De %PAIS, %N. Te vendes como vivo y entregás ruido con postureo. Soft power del verso.',
      '%N, pack %PAIS: mucho “ya casi”, poco “ya está”. El ranking no acepta almost como moneda.',
      '%N de %PAIS: si el humo pagara impuestos, auditado. %PAIS no te saca de la deuda de sustancia.',
      'Prefijo %PAIS, %N. Embajador del cuento. Credenciales en demora permanente.',
      '%N, en %PAIS el vivo a veces gana. Acá el contador gana siempre, y no va con tú.',
      'Clásico %PAIS, %N: negociar todo menos tu propia mejora visible en el rastro.',
      '%N hace de %PAIS el chiste del verso. Punchline: tú, sin necesidad de narrador.',
      '%N, de %PAIS: qué confianza… para terminar siendo flyer con piernas. Eres anuncio sin producto. El grupo ya scrolleó de largo.',
      'Hay ritmo en %N: de promesa. Pack %PAIS de labia alta y entrega en cuotas que no llegan.',
      '%N exporta de %PAIS la costumbre de quedar bien en la foto y mal en el contador. Se lee el desfase.',
      'De %PAIS, %N. Te crees el hub del arreglo y aportás demora. El chat abrió ruta alterna.',
      '%N, pack %PAIS: ofensa elegante, trabajo nulo. La elegancia no suma en el ranking.',
      '%N de %PAIS: el micrófono del cuento no te hace táctico; te hace predecible.',
      'Prefijo %PAIS, %N. Exportación de humo detectada. Devolución al remitente.',
      '%N, en %PAIS habrá cracks; tú estás en el feed del almost. El almost no paga.',
      'Clásico %PAIS, %N: sonreír el deal y no firmar la entrega.',
      '%N hace de %PAIS un tutorial de viveza sin resultado. No cotiza.'
    ],
  },
  MX: {
    name: 'México',
    lines: [
      '%N, de %PAIS: qué intensidad… para terminar siendo volumen sin argumento. Eres el drama con teclado: todo escena, nada guion. El grupo te baja el gain.',
      'Hay pasión en %N: gritar como si eso fuera tesis. Pack %PAIS de ruido fácil y criterio difícil. Rico en decibeles; pobre en sustancia medible.',
      '%N exporta de %PAIS el show permanente. Telenovela de un capítulo repetido. Final conocido: saturación del hilo.',
      'De %PAIS, %N. Te crees el centro y aportás el caos. Piñata del hilo: todos saben dónde pegar y el dulce es poco.',
      '%N, prefijo %PAIS y ego de plaza. El volumen no te da la razón; te da audiencia cansada y ranking frío.',
      '%N de %PAIS: mucho “no manches” mental y cero ejecución. Eres alarma, no líder. El chat ya silenció la sirena.',
      'Drama fácil, criterio difícil, %N. %PAIS en el número y el vacío en el párrafo que debería importar.',
      '%N de %PAIS convierte todo en escena. El chat no es tu set ni tu foro. Apaga reflectores y aportá.',
      'Clásico %PAIS, %N: ofenderte por todo y aportar nada. El archivo no llora ni aplaude el grito.',
      '%N de %PAIS: el show no tapa el hueco. El ranking ya midió el hueco y lo dejó en actas.',
      '%N, de %PAIS: el falso cumplido —qué país— se satura solo. Eres farándula de ego. Checkout del público.',
      'Hay fuego en %N: de discurso. Pack %PAIS de pasión alta y plan operativo en cero.',
      '%N exporta de %PAIS el “a mí nadie me dice” mientras el contador te dice todo. Escuchá el número.',
      'De %PAIS, %N. Te vendes como presencia y entregás saturación. Soft power del ruido.',
      '%N, pack %PAIS: mucho orgullo, poco autoexamen. El espejo no acepta volumen como disculpa.',
      '%N de %PAIS: el micrófono del drama no te hace protagonista; te hace alarma de vecindario.',
      'Prefijo %PAIS, %N. Embajador del show. Credenciales en modo avión ajeno.',
      '%N, en %PAIS el ruido a veces es cultura. Acá sin contenido es falta de filtro documentada.',
      'Clásico %PAIS, %N: alargar el conflicto porque el silencio te da miedo. El silencio era dato.',
      '%N hace de %PAIS el chiste del volumen. Punchline: tú, sin necesidad de pista.',
      '%N, de %PAIS: qué carisma anunciado… para terminar siendo saturación con wifi. Eres playlist a máximo sin canciones buenas.',
      'Hay intensidad en %N: de plaza. Pack %PAIS de escena y poco guion revisado.',
      '%N exporta de %PAIS la costumbre de montar show para no montar trabajo. Se nota el hueco detrás del telón.',
      'De %PAIS, %N. Te crees el centro del mapa y aportás tráfico. El chat pidió desvío.',
      '%N, pack %PAIS: ofensa rápida, criterio lento. El ranking no espera tu segundo acto.',
      '%N de %PAIS: si el drama pagara impuestos, auditado. %PAIS no te exonera acá.',
      'Prefijo %PAIS, %N. Exportación de caos detectada. Devolución al remitente con ruido incluido.',
      '%N, en %PAIS habrá cracks; tú estás en el feed del grito. El grito no suma.',
      'Clásico %PAIS, %N: ganar la pelea del tono y perder la del rastro útil.',
      '%N hace de %PAIS un tutorial de volumen sin tesis. No cotiza.'
    ],
  },
  VE: {
    name: 'Venezuela',
    lines: [
      '%N, de %PAIS: qué narrativa tan urgente… para terminar siendo noticiero sin cierre. Eres el agravio con teclado. El grupo no es tu gobierno ni tu canal.',
      'Hay fuerza en %N: reclamar sin proponer. Pack %PAIS de denuncia a volumen alto y autocrítica en cero. Rico en queja; pobre en plan.',
      '%N exporta de %PAIS el “nadie entiende” como personalidad. Himno a la ofensa colectiva. El chat entiende; por eso no aplaude.',
      'De %PAIS, %N. Resistencia en el discurso, ausencia en el plan. Asamblea permanente sin acta de aporte.',
      '%N, prefijo %PAIS y ego de agraviado vitalicio. El ranking reparte números, no empatía infinita ni cupos de drama.',
      '%N de %PAIS: conviertes todo en agravio. El archivo pide hechos y sigue esperando el primer recibo útil.',
      'Queja crónica, solución nula, %N. %PAIS en el SIM y el reclamo en la boca como único software.',
      '%N de %PAIS: el micrófono del drama no te hace lúcido; te hace predecible en cada hilo.',
      'Clásico %PAIS, %N: pelear por todo y construir poco. El chat a veces construye sin tu narración.',
      '%N hace de %PAIS un tutorial de ofensa sin responsabilidad. No cotiza en el contador.',
      '%N, de %PAIS: el falso cumplido —qué lucha— se agota solo. Eres noticiero de ego. El grupo cambió de canal.',
      'Hay fuego en %N: de discurso. Pack %PAIS de pasión y poco cierre operativo en el rastro.',
      '%N exporta de %PAIS la costumbre de ser víctima profesional. Acá el rol no paga ni da escudo.',
      'De %PAIS, %N. Te vendes como resistencia y entregás saturación. Soft power del reclamo eterno.',
      '%N, pack %PAIS: mucho “en mi tierra”, poco tierra ganada en mensajes útiles.',
      '%N de %PAIS: si la queja pagara impuestos, auditado. %PAIS no te saca de la deuda de sustancia.',
      'Prefijo %PAIS, %N. Embajador del agravio. Credenciales en bis de himno.',
      '%N, en %PAIS el relato pesa. Acá pesa el rastro, y el tuyo pide reedición de urgencia.',
      'Clásico %PAIS, %N: alargar el himno y acortar el aporte medible.',
      '%N hace de %PAIS el chiste del reclamo. Punchline: tú, sin locutor.',
      '%N, de %PAIS: qué urgencia moral… para terminar siendo saturación con bandera. Eres asamblea de uno. El ranking no vota esa lista.',
      'Hay solemnidad en %N: anunciada. Pack %PAIS de denuncia y flojera de plan B.',
      '%N exporta de %PAIS el “tú no sabes sufrir” a un chat que solo pidió un dato. Spoiler: no llegó.',
      'De %PAIS, %N. Te crees faro moral y aportás niebla. El faro pide mantenimiento de hechos.',
      '%N, pack %PAIS: ofensa colectiva, responsabilidad individual en modo avión.',
      '%N de %PAIS: el drama no te hace resistente; te hace predecible y ruidoso.',
      'Prefijo %PAIS, %N. Exportación de queja detectada. Devolución al remitente.',
      '%N, en %PAIS habrá gente clara; tú preferís el micrófono. Se nota la falta de párrafo útil.',
      'Clásico %PAIS, %N: ganar la pelea del relato y perder la del contador.',
      '%N hace de %PAIS un tutorial de urgencia sin entrega. No cotiza.'
    ],
  },
  PE: {
    name: 'Perú',
    lines: [
      '%N, de %PAIS: qué compostura… para terminar siendo tribunal sin toga. Eres el mohín profesional: juzgás en silencio y aportás en cuotas. El grupo no te pidió sentencia ni expediente.',
      'Hay seriedad en %N: de brochure. Pack %PAIS de formalismo alto y entrega intermitente. Si la autoestima se midiera en caras largas, serías top; en peso real del hilo, flotás.',
      '%N exporta de %PAIS la ofensa en diferido. Resentimiento bien peinado. Preferimos el no con fecha a tu silencio con veneno de archivo.',
      'De %PAIS, %N. Te haces el humilde y medís a todos con regla ajena. Juez del hilo sin expediente ni carga útil detrás.',
      '%N, prefijo %PAIS y ego de “ya pues” sin sustancia. El ranking cotiza carga, no agrio ni mohín de terraza.',
      '%N de %PAIS: silencio estratégico que en realidad es vacío. Se te oye igual, y el contador también lo registra.',
      'Agrio bien vestido, %N. %PAIS en el número y el juicio en la cara como único aporte del día.',
      '%N de %PAIS: el misterio no te hace interesante; te hace flojo de entrega y rico en pose de profundidad.',
      'Clásico %PAIS, %N: criticar sin proponer. El archivo no se impresiona con el mohín ni con la pausa dramática.',
      '%N hace de %PAIS un seminario de ofensa pasiva. No cotiza en el ranking ni en el respeto del chat.',
      '%N, de %PAIS: el falso cumplido —qué seriedad— se agrieta solo. Eres compostura de ego. El grupo pidió sustancia, no pose.',
      'Hay temple en %N: anunciado. Pack %PAIS de formalismo quieto y flojera operativa cuando toca cargar de verdad.',
      '%N exporta de %PAIS el “respeto primero” mientras no respeta el turno de sumar al hilo. Se lee la contradicción.',
      'De %PAIS, %N. Te vendes como sobrio y entregás vacío con buena letra. Soft power del cringe silencioso.',
      '%N, pack %PAIS: ofensa en diferido, aporte en nevera. El ranking no espera tu deshielo ni tu veredicto.',
      '%N de %PAIS: si el mohín pagara impuestos, auditado. %PAIS no te exonera de la deuda de rastro.',
      'Prefijo %PAIS, %N. Embajador del juicio mudo. Credenciales en pausa larga y sin acta.',
      '%N, en %PAIS el ego encuentra sombra. Acá encuentra el sol del contador y no le favorece el bronceado.',
      'Clásico %PAIS, %N: no perder el estilo y perder el rastro útil frente a todo el grupo.',
      '%N hace de %PAIS el chiste del mohín. Punchline: tú, sin necesidad de narrador externo.',
      '%N, de %PAIS: qué calma judicial… para terminar sin fallo útil. Eres tribunal de bolsillo. El chat apeló y ganó el contador.',
      'Hay compostura en %N: de foto. Pack %PAIS de imagen seria y ejecución escolar en el hilo.',
      '%N exporta de %PAIS la costumbre de mirar feo en vez de escribir útil. El feo no suma puntos.',
      'De %PAIS, %N. Te crees el adulto de la sala y no sostienes el hilo cuando pesa. Superioridad sin expediente.',
      '%N, pack %PAIS: mucho “ya pues”, poco “ya está” medible en el archivo.',
      '%N de %PAIS: el silencio no te hace profundo; te hace ausente de carga cuando más se necesita.',
      'Prefijo %PAIS, %N. Exportación de agrio detectada. Devolución al remitente con mohín incluido.',
      '%N, en %PAIS habrá gente clara; tú preferís la sombra del juicio. Se nota la falta de luz en el aporte.',
      'Clásico %PAIS, %N: ganar la pelea del orgullo callado y perder la del contador hablado.',
      '%N hace de %PAIS un tutorial de seriedad sin sustancia. No cotiza.'
    ],
  },
  BR: {
    name: 'Brasil',
    lines: [
      '%N, de %PAIS: qué alegría tan ruidosa… para terminar siendo after sin sustancia. Eres la farra con teclado: ambientás todo y no cargás nada. El grupo no es tu camarote ni tu camarín.',
      'Hay carisma en %N: de playlist. Pack %PAIS de sonrisa grande y aporte chico. Hit en ritmo; intro saltado en resultados del ranking.',
      '%N exporta de %PAIS el show tropical. Carnaval de un solo flotante: tú. El chat bajó el volumen y pidió contenido.',
      'De %PAIS, %N. Te crees el desfile y el desfile es malo. Resaca con beat y sin coreografía de utilidad.',
      '%N, prefijo %PAIS y ego de estrella en chat de barrio. El ranking no es pasarela ni jurado de reality.',
      '%N de %PAIS: fútbol en la boca, cero en el hilo. Fuera de juego pitado por el contador sin VAR que te salve.',
      'Fiesta verbal, utilidad en resaca, %N. %PAIS en el SIM y el after en la cabeza como único plan operativo.',
      '%N de %PAIS: el ritmo no te hace indispensable; te hace ruido alegre que el grupo ya aprendió a muteear.',
      'Clásico %PAIS, %N: ambientar para no aportar. Se nota el hueco detrás del sambódromo mental.',
      '%N hace de %PAIS un tutorial de gracia sin gracia real. No cotiza en el archivo ni en el respeto.',
      '%N, de %PAIS: el falso cumplido —qué país— se derrite con la resaca del roast. Eres after de ego. Checkout.',
      'Hay swing en %N: anunciado. Pack %PAIS de fiesta verbal y ensayo útil en cero cuando toca cargar.',
      '%N exporta de %PAIS el “só alegria” como excusa de no entregar. Acá la alegría no suma sin rastro.',
      'De %PAIS, %N. Te vendes como buen vibra y entregás saturación con beat. Soft power del ruido tropical.',
      '%N, pack %PAIS: mucho dembow mental, poco compás de trabajo sostenido en el hilo.',
      '%N de %PAIS: si la farra pagara impuestos, auditado. %PAIS no te saca de la deuda de sustancia.',
      'Prefijo %PAIS, %N. Embajador del after. Credenciales en resaca de aplauso ajeno.',
      '%N, en %PAIS el flow vende. Acá vende el rastro, y el tuyo pide remix de urgencia con menos pose.',
      'Clásico %PAIS, %N: ganar la pista y perder el hilo útil frente a todo el grupo.',
      '%N hace de %PAIS el chiste del beat. Punchline: tú, sin DJ que te salve el frame.',
      '%N, de %PAIS: qué carisma de escenario… para terminar siendo karaoke de ego. Eres feat que nadie pidió. El ranking no da credits.',
      'Hay actitud en %N: de desfile. Pack %PAIS de sonrisa y poco manifiesto de carga en el contador.',
      '%N exporta de %PAIS la costumbre de ambientar la nada. Se oye el hueco entre golpe y golpe de pecho.',
      'De %PAIS, %N. Te crees selección y aportás amistoso flojo. El chat ya hizo los cambios.',
      '%N, pack %PAIS: ofensa suave, trabajo nulo. La suavidad no tapa el agujero del rastro.',
      '%N de %PAIS: el micrófono del after no te hace estrella; te hace resaca con wifi.',
      'Prefijo %PAIS, %N. Exportación de farra detectada. Devolución al remitente con glitter.',
      '%N, en %PAIS habrá cracks; tú estás en el feed del ambientador. El ambientador no suma.',
      'Clásico %PAIS, %N: subir el volumen de la fiesta y bajar el del aporte medible.',
      '%N hace de %PAIS un tutorial de show sin sustancia. No cotiza.'
    ],
  },
  CL: {
    name: 'Chile',
    lines: [
      '%N, de %PAIS: qué orden… para terminar mirando al resto por encima del hombro. Eres el frío administrativo: distancia olímpica, aporte tibio. El grupo no es tu sucursal ni tu checklist.',
      'Hay estándar en %N: en la boca. Pack %PAIS de crítica fina y autocrítica nula. Si la autoestima se midiera en normas, serías reglamento; en carga real, letra chica.',
      '%N exporta de %PAIS la soberbia ordenada. Adulto de la sala que no sostiene el hilo cuando pesa. El chat ya hizo la auditoría sin tu firma.',
      'De %PAIS, %N. “Acá se hace bien” sin mostrar el bien. Superioridad sin expediente ni rastro que lo respalde en el contador.',
      '%N, prefijo %PAIS y ego de checklist. El ranking no premia el mohín técnico ni la distancia olímpica.',
      '%N de %PAIS: confundes ser ordenado con ser interesante. El orden sin sustancia es solo frío de archivo.',
      'Prefijo %PAIS, %N. Exportas distancia educada. El archivo no se impresiona con el hielo.',
      '%N, en %PAIS habrá nivel; tú estás de visita en el cringe ordenado. Se nota la falta de calor de aporte.',
      'Clásico %PAIS, %N: criticar el proceso ajeno y no cargar el propio. El ranking lo deja en actas.',
      '%N hace de %PAIS un tutorial de frío sin resultado. No cotiza en el respeto del hilo.',
      '%N, de %PAIS: el falso cumplido —qué país serio— se congela solo. Eres compostura de ego. El grupo pidió movimiento.',
      'Hay temple en %N: anunciado. Pack %PAIS de formalismo y flojera operativa cuando toca sudar el hilo.',
      '%N exporta de %PAIS el “hay que ser serios” mientras el rastro pide seriedad tuya, no ajena.',
      'De %PAIS, %N. Te vendes como estándar y entregás tibieza con buena ortografía. Soft power del cringe frío.',
      '%N, pack %PAIS: ofensa en voz baja, aporte en suspensión indefinida. El contador no hiberna con tú.',
      '%N de %PAIS: si el mohín técnico pagara impuestos, auditado. %PAIS no te exonera acá.',
      'Prefijo %PAIS, %N. Embajador del hielo. Credenciales en cámara lenta.',
      '%N, en %PAIS el ego encuentra norma. Acá encuentra el contador y va en falta.',
      'Clásico %PAIS, %N: no perder el estilo y perder el rastro útil frente al grupo.',
      '%N hace de %PAIS el chiste del frío. Punchline: tú, sin bufanda que tape el hueco.'
    ],
  },
  EC: {
    name: 'Ecuador',
    lines: [
      '%N, de %PAIS: qué discreción… para terminar invisible de utilidad. Eres la molestia suave: drama de baja intensidad y alta constancia. El grupo no te debe el clima emocional del día.',
      'Hay sensibilidad en %N: selectiva. Pack %PAIS de ofensa fácil y propuesta difícil. Si la autoestima se alimentara de “me sacaron”, estarías lleno; de aporte, en ayuno documentado.',
      '%N exporta de %PAIS la queja templada. Boletín de molestias diarias. Preferimos el parte seco del ranking a tu parte meteorológico.',
      'De %PAIS, %N. Te haces la víctima con el teclado y el verdugo con el silencio. Eres el clima del hilo. La dignidad no es meteorología.',
      '%N, prefijo %PAIS y ego de agravio chico. El ranking no cotiza drama en cuotas ni en abonos mensuales de ofensa.',
      '%N de %PAIS: confundes ser sensible con ser central. La sensibilidad sin rastro es solo ruido bajo.',
      'Prefijo %PAIS, %N. Exportas molestia suave. El archivo no hace de paño de lágrimas ni de altavoz.',
      '%N, en %PAIS habrá gente clara; tú enturbiás con queja de baja intensidad. Se nota el barro fino.',
      'Clásico %PAIS, %N: alargar el conflicto porque el silencio te da miedo. El silencio era información útil.',
      '%N hace de %PAIS un tutorial de saturación de poco. No cotiza en el contador ni en el respeto.',
      '%N, de %PAIS: el falso cumplido —qué país— se diluye solo. Eres llovizna de ego. El grupo sacó el paraguas.',
      'Hay temple en %N: anunciado. Pack %PAIS de ofensa fácil y plan operativo en modo avión.',
      '%N exporta de %PAIS el “es que me sacaron” como personalidad. Acá el ranking no compra ese boleto.',
      'De %PAIS, %N. Te vendes como sensible y entregás saturación suave. Soft power del cringe templado.',
      '%N, pack %PAIS: mucho clima emocional, poco clima de trabajo en el hilo.',
      '%N de %PAIS: si la queja chica pagara impuestos, auditado. %PAIS no te saca de la deuda de sustancia.',
      'Prefijo %PAIS, %N. Embajador de la molestia. Credenciales en llovizna permanente.',
      '%N, en %PAIS el ego encuentra ofensa. Acá encuentra el contador y no hay indulgencia.',
      'Clásico %PAIS, %N: ganar la pelea del tono suave y perder la del rastro duro.',
      '%N hace de %PAIS el chiste del clima. Punchline: tú, sin pronóstico que te salve.'
    ],
  },
  GT: {
    name: 'Guatemala',
    lines: [
      '%N, de %PAIS: qué calma volcánica… para terminar explotando por cualquier mensaje. Eres el cráter con teclado: lava de ego y ceniza de aporte. El grupo ya evacuó tu monólogo.',
      'Hay mística en %N: la de %PAIS en modo “yo vi cosas”. Pack de misterio barato y constancia nula. Si la autoestima se midiera en leyendas, serías ruina turística; en hechos, estás cerrado por mantenimiento.',
      '%N exporta de %PAIS la costumbre de survivor en el chat. Eres el que sobrevive al drama sin mover un dedo útil. El ranking no da medallas por aguantar mirando.',
      'De %PAIS, %N. Te crees el centro del istmo y aportás periferia. Eres el volcán apagado que igual amenaza. La dignidad pidió zona segura.',
      '%N, pack %PAIS: orgullo alto, entrega a cuentagotas. Eres el café que se enfría en la mesa. Nadie lo pide caliente otra vez.',
      '%N de %PAIS: confundes ser reservado con ser interesante. El silencio no te hace profundo; te hace ausente de carga.',
      'Prefijo %PAIS, %N. Exportas drama de altura y utilidad de valle. El chat ya bajó la montaña sin tú.',
      '%N, en %PAIS habrá gente clara; tú enturbiás el hilo con pose de sabio. El archivo no compra incienso.',
      'Clásico %PAIS, %N: ofenderte bajito y aportar más bajo todavía. Se te oye igual.',
      '%N hace de %PAIS un tutorial de presencia sin peso. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué cultura— se cae solo. Eres souvenir de ridículo. El grupo no hace aduana sentimental.',
      'Hay orgullo en %N: el del prefijo. Pack %PAIS de historia densa y hilo flojo. Autoestima de museo; rendimiento de taquilla vacía.',
      '%N exporta de %PAIS el “nadie sabe lo que es sufrir” a un chat que solo pidió un mensaje útil. Spoiler: no lo mandaste.',
      'De %PAIS, %N. Te vendes como nivel y entregás niebla. Soft power del cringe centroamericano.',
      '%N, pack %PAIS: mucho carácter, poco carácter cuando toca cargar. El ranking no negocia temperamento.',
      '%N de %PAIS: el misterio ya aburrió. Eres el spoiler de tu propia irrelevancia.',
      'Prefijo %PAIS, %N. Embajador no pedido del mohín. Credenciales vencidas.',
      '%N, en %PAIS el ego encuentra altura. Acá encuentra el piso del contador.',
      'Clásico %PAIS, %N: ganar la pelea del orgullo y perder la del rastro.',
      '%N hace de %PAIS el chiste del mapa sin querer. El punchline eres tú.'
    ],
  },
  CU: {
    name: 'Cuba',
    lines: [
      '%N, de %PAIS: qué narrativa de resistencia… para terminar resistiendo solo al aporte. Eres el discurso eterno con teclado prestado. El grupo no es tu asamblea.',
      'Hay ritmo en %N: el de %PAIS en modo son mental. Pack de swing y cero partitura útil. Si la autoestima se midiera en nostalgia, serías rico; en mensajes, en cartilla.',
      '%N exporta de %PAIS el “ustedes no saben” como personalidad. Eres el noticiero sin cierre. El chat cambió de canal.',
      'De %PAIS, %N. Te crees el faro del Caribe y aportás apagón. Eres apología del agravio. La dignidad pidió generador.',
      '%N, pack %PAIS: queja larga, solución corta. Eres la fila infinita del ego. Nadie guarda tu lugar.',
      '%N de %PAIS: confundes historia con excusa permanente. El ranking no acepta cupones de pasado.',
      'Prefijo %PAIS, %N. Exportas drama de escasez emocional a un chat que no te debe racionamiento de empatía.',
      '%N, en %PAIS habrá talento; tú estás en el feed del monólogo. El archivo no aplaude de pie.',
      'Clásico %PAIS, %N: pelear por el relato y perder el dato. Se nota.',
      '%N hace de %PAIS un tutorial de orgullo sin entrega. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué isla— se hunde solo. Eres balsa de ego. El grupo ya llegó a tierra sin tú.',
      'Hay fuego en %N: de discurso. Pack %PAIS de pasión alta y constancia baja. Autoestima de himno; rendimiento de ensayo.',
      '%N exporta de %PAIS la costumbre de ser víctima profesional. Acá el rol no paga.',
      'De %PAIS, %N. Te vendes como resistencia y entregás saturación. Soft power del reclamo.',
      '%N, pack %PAIS: mucho “en mi tierra”, poco tierra ganada en el hilo.',
      '%N de %PAIS: el micrófono del drama no te hace lúcido; te hace predecible.',
      'Prefijo %PAIS, %N. Embajador del agravio. El chat no renovó credenciales.',
      '%N, en %PAIS el relato pesa. Acá pesa el contador, y no te favorece.',
      'Clásico %PAIS, %N: alargar el himno y acortar el aporte.',
      '%N hace de %PAIS el chiste del Caribe sin gracia. Punchline: tú.'
    ],
  },
  BO: {
    name: 'Bolivia',
    lines: [
      '%N, de %PAIS: qué altura moral… para terminar mirando al resto desde un cerro de ego. Eres la meseta con teclado: aire fino y argumento más fino todavía. El grupo ya bajó a cotas útiles.',
      'Hay orgullo en %N: el de %PAIS en modo altiplano. Pack de dignidad anunciada y entrega a media oxigenación. Si la autoestima se midiera en metros sobre el nivel del mar, serías Everest; en hechos, valle.',
      '%N exporta de %PAIS la costumbre de ofenderte por el clima del hilo. Eres meteorología emocional. El chat prefiere el parte seco del ranking.',
      'De %PAIS, %N. Te crees el centro andino y aportás periferia. Eres el cóndor que no despega. La dignidad pidió pista.',
      '%N, pack %PAIS: mucho carácter, poco cargamento. Eres la mina de orgullo sin vetas de utilidad.',
      '%N de %PAIS: confundes ser serio con ser pesado. El silencio no te hace sabio; te hace lastre.',
      'Prefijo %PAIS, %N. Exportas mohín de altura. El archivo no sube esa montaña.',
      '%N, en %PAIS habrá gente clara; tú nublás el hilo. Se nota la niebla.',
      'Clásico %PAIS, %N: juzgar en silencio y aportar en cuotas. El ranking no cotiza juicio mudo.',
      '%N hace de %PAIS un tutorial de orgullo sin oxígeno de datos. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué tierra— se erosiona solo. Eres souvenir de ridículo andino.',
      'Hay temple en %N: anunciado. Pack %PAIS de formalismo y flojera operativa. Autoestima de cumbre; rendimiento de campamento base.',
      '%N exporta de %PAIS el “respeto primero” mientras no respeta el turno de aportar.',
      'De %PAIS, %N. Te vendes como nivel y entregás pendiente. Soft power del cringe altiplánico.',
      '%N, pack %PAIS: ofensa fácil, propuesta difícil. El chat ya hizo la trepada sin tú.',
      '%N de %PAIS: el misterio de la altura ya no impresiona. Eres el mal de montaña del hilo.',
      'Prefijo %PAIS, %N. Embajador del agrio. Credenciales en descenso.',
      '%N, en %PAIS el ego encuentra cumbre. Acá encuentra el valle del contador.',
      'Clásico %PAIS, %N: ganar la pelea del orgullo y perder la del rastro.',
      '%N hace de %PAIS el chiste del mapa. Punchline: tú.'
    ],
  },
  DO: {
    name: 'República Dominicana',
    lines: [
      '%N, de %PAIS: qué swing… para terminar siendo ruido sin coreografía. Eres el dembow del ego: pegajoso, repetitivo y sin segunda estrofa útil. El grupo bajó el volumen.',
      'Hay chispa en %N: la de %PAIS en modo fiesta mental. Pack de alegría anunciada y aporte que nunca llega a la pista. Si la autoestima se midiera en perreo, serías DJ; en hechos, pista vacía.',
      '%N exporta de %PAIS la costumbre de resolverlo todo “en confianza”. Eres el contactito que no contacta resultados. El ranking no baila esa.',
      'De %PAIS, %N. Te crees el flow del chat y aportás buffer. Eres playlist sin hits. La dignidad pidió skip.',
      '%N, pack %PAIS: labia alta, constancia baja. Eres el after que se vende como concierto.',
      '%N de %PAIS: confundes ser simpático con ser útil. La simpatía no suma en el contador.',
      'Prefijo %PAIS, %N. Exportas farra verbal. El archivo no está de party.',
      '%N, en %PAIS habrá talento; tú estás en el intro eterno. Nadie llega al drop de tu aporte.',
      'Clásico %PAIS, %N: ambientar para no cargar. Se nota el hueco.',
      '%N hace de %PAIS un tutorial de flow sin sustancia. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué isla— se derrite solo. Eres resort de ego. El grupo no renovó la estadía.',
      'Hay ritmo en %N: de discurso. Pack %PAIS de show y poco ensayo. Autoestima de escenario; rendimiento de backstage vacío.',
      '%N exporta de %PAIS el “tú no sabe” con sonrisa. Acá sí sabe el ranking.',
      'De %PAIS, %N. Te vendes como buen ambiente y entregás saturación. Soft power del ruido.',
      '%N, pack %PAIS: mucho dembow mental, poco compás de trabajo.',
      '%N de %PAIS: el micrófono del chat no te hace artista; te hace karaoke.',
      'Prefijo %PAIS, %N. Embajador del after. Credenciales en resaca.',
      '%N, en %PAIS el flow vende. Acá vende el rastro, y el tuyo pide remix.',
      'Clásico %PAIS, %N: ganar la pista y perder el hilo.',
      '%N hace de %PAIS el chiste del Caribe con beat. Punchline: tú.'
    ],
  },
  HN: {
    name: 'Honduras',
    lines: [
      '%N, de %PAIS: qué temple… para terminar templando solo el ego. Eres la tormenta anunciada con teclado: mucho aviso, poco refugio útil. El grupo ya sacó el paraguas y te dejó afuera.',
      'Hay carácter en %N: el de %PAIS en modo supervivencia. Pack de dureza verbal y aporte intermitente. Si la autoestima se midiera en aguante, serías leyenda; en mensajes útiles, alerta amarilla.',
      '%N exporta de %PAIS la costumbre de resolver a gritos lo que pedía un dato. Eres sirena sin plan de evacuación. El ranking no corre.',
      'De %PAIS, %N. Te crees el centro del mapa y aportás margen. Eres el camino de tierra del hilo: se nota cuando llueve drama.',
      '%N, pack %PAIS: orgullo alto, entrega irregular. Eres el puente que tiembla. Nadie carga de más sobre tú.',
      '%N de %PAIS: confundes ser fuerte con ser pesado. La fuerza sin dirección es solo peso muerto.',
      'Prefijo %PAIS, %N. Exportas drama de carretera. El archivo no hace stop.',
      '%N, en %PAIS habrá gente clara; tú enturbiás. Se nota el lodazal.',
      'Clásico %PAIS, %N: ofenderte fácil y aportar difícil. El chat ya eligió ruta alterna.',
      '%N hace de %PAIS un tutorial de dureza sin resultado. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué pueblo— se lava solo con la lluvia del roast. Eres barro de ego.',
      'Hay aguante en %N: anunciado. Pack %PAIS de pelea y poco plan. Autoestima de trinchera; rendimiento de deserción selectiva.',
      '%N exporta de %PAIS el “nadie me respeta” mientras no respeta el turno de sumar.',
      'De %PAIS, %N. Te vendes como nivel y entregás bache. Soft power del cringe.',
      '%N, pack %PAIS: mucho grito, poco mapa. El ranking no usa tu brújula.',
      '%N de %PAIS: el misterio de la dureza ya no impresiona. Eres el bache del hilo.',
      'Prefijo %PAIS, %N. Embajador del temperamento. Credenciales en tope de velocidad.',
      '%N, en %PAIS el ego encuentra pelea. Acá encuentra el contador, y pierde por puntos.',
      'Clásico %PAIS, %N: ganar el grito y perder el rastro.',
      '%N hace de %PAIS el chiste del mapa. Punchline: tú.'
    ],
  },
  PY: {
    name: 'Paraguay',
    lines: [
      '%N, de %PAIS: qué quietud… para terminar siendo el eco de un ego que no habla claro. Eres la siesta del aporte: largo descanso, corto despertar útil. El grupo ya trabajó la jornada sin tú.',
      'Hay orgullo en %N: el de %PAIS en modo discreto. Pack de dignidad baja voz y entrega más baja todavía. Si la autoestima se midiera en silencio, serías biblioteca; en hechos, anaquel vacío.',
      '%N exporta de %PAIS la costumbre de mirar de reojo y no cargar. Eres el vecino del hilo. El ranking no cotiza miradas.',
      'De %PAIS, %N. Te crees el equilibrio del Cono Sur y aportás desbalance. Eres el tereré del drama: se estira, no alimenta.',
      '%N, pack %PAIS: poco ruido, menos sustancia. Eres la ausencia educada. Duele menos de lo que tu ego imagina.',
      '%N de %PAIS: confundes ser tranquilo con ser prescindible. La calma sin rastro es solo olvido.',
      'Prefijo %PAIS, %N. Exportas mohín suave. El archivo no se inmuta.',
      '%N, en %PAIS habrá gente clara; tú preferís la sombra. Se nota la falta de luz en el aporte.',
      'Clásico %PAIS, %N: no molestar y no sumar. El chat premia lo segundo cuando falta.',
      '%N hace de %PAIS un tutorial de discreción sin peso. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué paz— se rompe solo. Eres siesta de ego. El grupo no puso despertador.',
      'Hay temple en %N: anunciado. Pack %PAIS de formalismo quieto y flojera operativa.',
      '%N exporta de %PAIS el “yo no me meto” cuando justamente había que meter el hombro.',
      'De %PAIS, %N. Te vendes como equilibrado y entregás vacío. Soft power del cringe silencioso.',
      '%N, pack %PAIS: ofensa en diferido, aporte en nevera. El ranking no espera tu deshielo.',
      '%N de %PAIS: el misterio del silencio ya no vende. Eres el mute con foto.',
      'Prefijo %PAIS, %N. Embajador de la ausencia. Credenciales en pausa.',
      '%N, en %PAIS el ego encuentra sombra. Acá encuentra el sol del contador.',
      'Clásico %PAIS, %N: no perder… y tampoco ganar nada en el rastro.',
      '%N hace de %PAIS el chiste del mapa en voz baja. Igual se oye.'
    ],
  },
  SV: {
    name: 'El Salvador',
    lines: [
      '%N, de %PAIS: qué intensidad… para terminar siendo chispa sin circuito. Eres el voltaje del ego: sube rápido, quema el aporte. El grupo ya bajó los plomos.',
      'Hay fuerza en %N: la de %PAIS en modo compacto. Pack de carácter denso y entrega irregular. Si la autoestima se midiera en decibeles por kilómetro cuadrado, serías récord; en hechos, cortocircuito.',
      '%N exporta de %PAIS la costumbre de resolver en caliente. Eres la disputa que pudo ser un mensaje. El ranking no se pelea: suma.',
      'De %PAIS, %N. Te crees el centro del mapa chico y aportás drama grande. Eres el temblor del hilo. La dignidad pidió estructura antisísmica.',
      '%N, pack %PAIS: orgullo alto, paciencia baja. Eres el fusible del chat. Siempre salta tú.',
      '%N de %PAIS: confundes ser directo con ser abrasivo. Lo directo sin sustancia es solo roce.',
      'Prefijo %PAIS, %N. Exportas temperamento. El archivo no es ring.',
      '%N, en %PAIS habrá gente clara; tú electrificás el hilo sin iluminar. Se nota el cortocircuito.',
      'Clásico %PAIS, %N: ganar la pelea del tono y perder la del contenido.',
      '%N hace de %PAIS un tutorial de intensidad sin resultado. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué pueblo— se funde solo. Eres chispa de ego.',
      'Hay aguante en %N: anunciado. Pack %PAIS de pelea y poco plan largo.',
      '%N exporta de %PAIS el “respeto” como grito. El respeto aquí se farmea con rastro.',
      'De %PAIS, %N. Te vendes como nivel y entregás sobrecarga. Soft power del cringe.',
      '%N, pack %PAIS: mucho voltaje, poca lámpara. El chat sigue a oscuras de tu aporte.',
      '%N de %PAIS: el misterio de la dureza ya no impresiona. Eres el apagón del hilo.',
      'Prefijo %PAIS, %N. Embajador del cortocircuito. Credenciales chamuscadas.',
      '%N, en %PAIS el ego encuentra pelea. Acá encuentra el contador y pierde por puntos.',
      'Clásico %PAIS, %N: subir el tono y bajar el rastro.',
      '%N hace de %PAIS el chiste del mapa. Punchline: tú.'
    ],
  },
  NI: {
    name: 'Nicaragua',
    lines: [
      '%N, de %PAIS: qué narrativa… para terminar siendo capítulo eterno sin trama útil. Eres el discurso de %PAIS con teclado: largo, solemne y sin cierre de aporte. El grupo cambió de libro.',
      'Hay solemnidad en %N: la de %PAIS en modo himno. Pack de orgullo denso y constancia floja. Si la autoestima se midiera en proclamas, serías portada; en hechos, nota al pie.',
      '%N exporta de %PAIS la costumbre de hablar como si el chat fuera plaza pública. Eres mitin de uno. El ranking no vota esa lista.',
      'De %PAIS, %N. Te crees el centro moral y aportás periferia. Eres el faro con apagones. La dignidad pidió generador de datos.',
      '%N, pack %PAIS: mucho relato, poco recibo. Eres la promesa de cambio que no llega al hilo.',
      '%N de %PAIS: confundes ser intenso con ser importante. La intensidad sin rastro es solo ruido.',
      'Prefijo %PAIS, %N. Exportas drama de proclama. El archivo no hace mítines.',
      '%N, en %PAIS habrá gente clara; tú preferís el discurso. Se nota la falta de párrafo útil.',
      'Clásico %PAIS, %N: ganar la pelea del relato y perder la del contador.',
      '%N hace de %PAIS un tutorial de solemnidad sin sustancia. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué tierra— se derrumba solo. Eres monumento al ego.',
      'Hay fuego en %N: de discurso. Pack %PAIS de pasión y poco plan operativo.',
      '%N exporta de %PAIS el “nadie entiende” como estribillo. Acá el ranking entiende de sobra.',
      'De %PAIS, %N. Te vendes como causa y entregás saturación. Soft power del reclamo.',
      '%N, pack %PAIS: ofensa colectiva, responsabilidad individual en cero.',
      '%N de %PAIS: el micrófono del drama no te hace líder; te hace karaoke político.',
      'Prefijo %PAIS, %N. Embajador del himno. Credenciales en bis eterno.',
      '%N, en %PAIS el relato pesa. Acá pesa el rastro, y el tuyo pide reedición.',
      'Clásico %PAIS, %N: alargar el discurso y acortar el aporte.',
      '%N hace de %PAIS el chiste del mapa. Punchline: tú.'
    ],
  },
  CR: {
    name: 'Costa Rica',
    lines: [
      '%N, de %PAIS: qué pura vida… para terminar siendo pura pose. Eres el postcard del ego: bonito en la foto, vacío en el reverso del hilo. El grupo ya no manda recuerdos.',
      'Hay suavidad en %N: la de %PAIS en modo brochure. Pack de amabilidad anunciada y aporte intermitente. Si la autoestima se midiera en paisajes, serías parque nacional; en hechos, sendero cerrado.',
      '%N exporta de %PAIS la costumbre de quedar bien y cargar poco. Eres el “con mucho gusto” sin gusto por el trabajo. El ranking no cotiza sonrisas.',
      'De %PAIS, %N. Te crees el paraíso del chat y aportás zona de obras. Eres turista en tu propio hilo. La dignidad pidió guía útil.',
      '%N, pack %PAIS: mucha calma, poca carga. Eres la hamaca del aporte. Se ve cómoda; no avanza.',
      '%N de %PAIS: confundes ser nice con ser necesario. Lo nice sin rastro es solo decoración.',
      'Prefijo %PAIS, %N. Exportas paz verbal. El archivo pide movimiento.',
      '%N, en %PAIS habrá gente clara; tú preferís el brochure. Se nota la falta de mapa real.',
      'Clásico %PAIS, %N: quedar bien y quedar fuera del ranking útil.',
      '%N hace de %PAIS un tutorial de pura vida sin vida en el contador. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué país— se lava con la lluvia del roast. Eres souvenir.',
      'Hay zen en %N: anunciado. Pack %PAIS de suavidad y flojera operativa.',
      '%N exporta de %PAIS el “tranquilo” como estrategia de no hacer. Acá el tranquilo no suma.',
      'De %PAIS, %N. Te vendes como buen clima y entregás nubosidad de aporte. Soft power del cringe amable.',
      '%N, pack %PAIS: ofensa en voz baja, aporte en suspensión.',
      '%N de %PAIS: el misterio de la calma ya no vende. Eres el mute educado.',
      'Prefijo %PAIS, %N. Embajador del brochure. Credenciales de turista.',
      '%N, en %PAIS el ego encuentra playa. Acá encuentra el contador y bajamar.',
      'Clásico %PAIS, %N: sonreír y no cargar.',
      '%N hace de %PAIS el chiste del paraíso. Punchline: tú.'
    ],
  },
  PA: {
    name: 'Panamá',
    lines: [
      '%N, de %PAIS: qué canal… para terminar siendo peaje de ego. Eres el tránsito del drama: todo pasa por tú y no queda carga útil. El grupo ya abrió ruta alterna.',
      'Hay viveza en %N: la de %PAIS en modo atajo. Pack de labia comercial y entrega a medias. Si la autoestima se midiera en peajes, serías franquicia; en hechos, vía cerrada.',
      '%N exporta de %PAIS la costumbre de cobrar comisión emocional. Eres el intermediario que no intermedia resultados. El ranking no paga esa tarifa.',
      'De %PAIS, %N. Te crees el hub del chat y aportás demora. Eres contenedor vacío con bandera. La dignidad pidió manifiesto de carga.',
      '%N, pack %PAIS: mucho movimiento anunciado, poco atraque de aporte. Eres el barco que no atraca.',
      '%N de %PAIS: confundes ser conectado con ser útil. La agenda llena no suma si el rastro está vacío.',
      'Prefijo %PAIS, %N. Exportas atajo verbal. El archivo no hace escala.',
      '%N, en %PAIS habrá gente clara; tú preferís el deal. Se nota la falta de entrega final.',
      'Clásico %PAIS, %N: negociar todo menos tu propia mejora.',
      '%N hace de %PAIS un tutorial de canal sin barcos. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué hub— se atasca solo. Eres tráfico de ego.',
      'Hay olfato en %N: de negocio. Pack %PAIS de sonrisa y poco descargue.',
      '%N exporta de %PAIS el “yo te conecto” y no conecta ni el aporte propio.',
      'De %PAIS, %N. Te vendes como puente y entregás peaje. Soft power del cringe comercial.',
      '%N, pack %PAIS: mucho tránsito, poca mercancía útil en el hilo.',
      '%N de %PAIS: el misterio del deal ya no impresiona. Eres el contenedor vacío.',
      'Prefijo %PAIS, %N. Embajador del atajo. Credenciales en aduana.',
      '%N, en %PAIS el ego encuentra tráfico. Acá encuentra el contador y semáforo en rojo.',
      'Clásico %PAIS, %N: mover fichas y no mover el rastro.',
      '%N hace de %PAIS el chiste del canal. Punchline: tú.'
    ],
  },
  UY: {
    name: 'Uruguay',
    lines: [
      '%N, de %PAIS: qué sobriedad… para terminar siendo sobrio de aporte y borracho de criterio ajeno. Eres el mate del ego: ronda eterna, yerba de juicio, poco dulzor de utilidad. El grupo ya cambió de termo.',
      'Hay compostura en %N: la de %PAIS en modo mesurado. Pack de seriedad anunciada y entrega tibia. Si la autoestima se midiera en mesura, serías manual; en hechos, nota al margen.',
      '%N exporta de %PAIS la costumbre de mirar al resto como si fueran ruidosos por defecto. Eres el árbitro sin partido. El ranking no pide tu silbato.',
      'De %PAIS, %N. Te crees el equilibrio del Cono Sur y aportás empate eterno. Eres el 0-0 del hilo. La dignidad pidió un gol de aporte.',
      '%N, pack %PAIS: poco show, menos sustancia. Eres la sobriedad que tapa flojera. Se lee.',
      '%N de %PAIS: confundes ser serio con ser interesante. La seriedad sin rastro es solo cara larga.',
      'Prefijo %PAIS, %N. Exportas mohín educado. El archivo no se impresiona.',
      '%N, en %PAIS habrá gente clara; tú preferís el juicio en voz baja. Se te oye igual.',
      'Clásico %PAIS, %N: no exagerar… y no aportar. El medio no es virtud si está vacío.',
      '%N hace de %PAIS un tutorial de mesura sin peso. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué país serio— se cae solo. Eres sobriedad de ego.',
      'Hay temple en %N: anunciado. Pack %PAIS de formalismo y flojera operativa.',
      '%N exporta de %PAIS el “hay que ser serios” mientras el rastro pide seriedad tuya.',
      'De %PAIS, %N. Te vendes como equilibrado y entregás tibieza. Soft power del cringe quieto.',
      '%N, pack %PAIS: ofensa en diferido, aporte en cuarentena.',
      '%N de %PAIS: el misterio de la seriedad ya no vende. Eres el mute con bufanda.',
      'Prefijo %PAIS, %N. Embajador del empate. Credenciales en alargue eterno.',
      '%N, en %PAIS el ego encuentra mesura. Acá encuentra el contador y va perdiendo.',
      'Clásico %PAIS, %N: no perder el estilo y perder el rastro.',
      '%N hace de %PAIS el chiste del mapa en voz baja. Igual se oye.'
    ],
  },
  PR: {
    name: 'Puerto Rico',
    lines: [
      '%N, de %PAIS: qué flow… para terminar siendo reguetón de ego sin drop de aporte. Eres la pista del drama: todos escuchan el bajo, nadie baila tu utilidad. El grupo pidió skip.',
      'Hay chispa en %N: la de %PAIS en modo show. Pack de actitud alta y constancia a medias. Si la autoestima se midiera en views, serías tendencia; en hechos, intro saltado.',
      '%N exporta de %PAIS la costumbre de ir de estrella en chat de barrio. Eres el feat que nadie pidió. El ranking no da credits.',
      'De %PAIS, %N. Te crees el puente y aportás peaje. Eres colonia de ego: dependés del aplauso. La dignidad pidió soberanía de rastro.',
      '%N, pack %PAIS: mucho swagger, poco manifiesto de carga. Eres el videoclip sin canción.',
      '%N de %PAIS: confundes ser intenso con ser indispensable. La intensidad sin rastro es solo eco.',
      'Prefijo %PAIS, %N. Exportas farándula verbal. El archivo no está en premiere.',
      '%N, en %PAIS habrá talento; tú estás en el intro. Nadie llega al estribillo de tu aporte.',
      'Clásico %PAIS, %N: ambientar para no cargar. Se nota el hueco bajo el beat.',
      '%N hace de %PAIS un tutorial de flow sin sustancia. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué isla— se ahoga solo. Eres resort de ego. Checkout obligado.',
      'Hay actitud en %N: de escenario. Pack %PAIS de show y poco ensayo útil.',
      '%N exporta de %PAIS el “tú no sabe” con sonrisa de clip. El ranking sí sabe.',
      'De %PAIS, %N. Te vendes como buen vibra y entregás saturación. Soft power del ruido.',
      '%N, pack %PAIS: mucho dembow mental, poco compás de trabajo en el hilo.',
      '%N de %PAIS: el micrófono del chat no te hace artista; te hace karaoke con auto-tune de ego.',
      'Prefijo %PAIS, %N. Embajador del after. Credenciales en resaca de aplauso.',
      '%N, en %PAIS el flow vende. Acá vende el rastro, y el tuyo pide remix de urgencia.',
      'Clásico %PAIS, %N: ganar la pista y perder el hilo.',
      '%N hace de %PAIS el chiste del Caribe con beat. Punchline: tú.'
    ],
  },

};

function countryFromTarget(target, participant) {
  // De dónde sacar un teléfono, en orden de fiabilidad.
  const candidatos = [];
  // 1) El que a veces adjunta la metadata del grupo. Es el más directo.
  if (participant?.phoneNumber) candidatos.push(String(participant.phoneNumber));
  // 2) La forma canónica: resuelve @lid → teléfono SI el mapeo ya se aprendió.
  try {
    const can = canonicalJid(target);
    if (can) candidatos.push(String(can));
  } catch (_) {}
  // 3) El JID tal cual, que en un grupo direccionado por teléfono ya vale.
  candidatos.push(String(target || ''));

  for (const raw of candidatos) {
    const s = String(raw);

    // NUNCA parsear un @lid. Es un identificador interno de WhatsApp, no un
    // número: si el mapeo a teléfono no se ha aprendido todavía, canonicalJid
    // devuelve el LID pelado y esto lo tomaba por bueno.
    //
    // Y no es teórico: un LID de once dígitos como 85267891234 parsea como
    // +852 y el bot roasteaba a esa persona de Hong Kong, con su párrafo de
    // estereotipo y todo. El fallo es silencioso — sale un país perfectamente
    // plausible— así que nadie lo reporta como bug, solo como "el bot dice
    // cosas raras".
    if (s.includes('@lid')) continue;

    const digits = s.split('@')[0].split(':')[0].replace(/\D/g, '');
    if (!digits || digits.length < 8 || digits.length > 15) continue;

    const phone = parsePhoneNumberFromString('+' + digits);
    // Se pide país, NO isValid(). Un móvil mexicano de WhatsApp llega como
    // 52 1 55…, que libphonenumber marca como inválido porque el 1 es el
    // prefijo antiguo — pero es el formato que WhatsApp entrega de verdad.
    // Exigir validez dejaba fuera a México entero, que en un grupo LatAm es
    // justo lo contrario de ser preciso.
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
      text: 'Roastearte a ti mismo es un nivel de autodestrucción que ni el bot va a facilitar.',
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

  const activityText = pickFresh(getActivityPhrases(msgCount), `${jid}|roast|act`)
    .replace(/%N/g, tag)
    .replace(/%C/g, fmt(msgCount));

  let body = activityText;
  const geo = countryFromTarget(target, participant);
  if (geo?.iso && COUNTRY_ROAST[geo.iso]) {
    const entry = COUNTRY_ROAST[geo.iso];
    let line = pickFresh(entry.lines, `${jid}|roast|country|${geo.iso}`)
      .replace(/%PAIS/g, entry.name)
      .replace(/%N/g, tag);
    // Evitar segundo arranque con @ — un solo roast continuo
    if (line.startsWith(tag)) {
      line = line.slice(tag.length).replace(/^[,:\s]+/, '');
    }
    line = line.charAt(0).toLowerCase() + line.slice(1);
    body = `${activityText} Encima, ${line}`;
  }

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
