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
  '_El grupo ya tiene el meme. Vos solo sos el archivo fuente._',
  '_Bajá la foto de perfil: el daño ya está hecho._',
  '_No hay modo avión que te salve el frame._',
  '_Firmado por el contador. El ego puede alegar en silencio._',
  '_Siguiente. Este ya quedó catalogado en la sección “casi persona”._'
];

const OWNER_ROAST = [
  '%N, qué privilegio tenerte: el bot te baja la voz y aun así lográs que el resto te odie con estilo. Sos un jefe de juguete: nadie te vota, todos te escuchan por si acaso. El día que el ego pese menos, el chat respira.',
  'Mirá el señor intocable, %N. Camina como si el WiFi saliera de su aura. Sos el creído que tiene razón demasiadas veces: por eso da rabia. Bajá un cambio antes de ser sticker de advertencia.',
  '%N, hijo de puta con suerte: todo le sale y tiene cara de “yo ya lo sabía”. Sos un tutorial que nadie pidió y todos terminan mirando. No te odian por poderoso; te odian por insufrible con pruebas.'
];

function getActivityPhrases(count) {
  const c = fmt(count);
  if (count <= 0) {
    return [
      '%N, qué misterio tan profundo: cero mensajes y aura de protagonista. Sos como un museo cerrado los lunes… todos los días. El grupo no te extraña; el silencio sin vos suena igual. Tu valor propio cotiza en “próximamente” desde siempre.',
      '%N, el contador en 0 no es minimalismo: es deserción con foto de perfil. Sos el WiFi del vecino: todos saben que está, nadie lo usa. Si la autoestima fuera datos, estarías en modo avión permanente.',
      '%N con 0 en el marcador. Fantasma de lujo: online para mirar, offline para existir. Sos una notificación que nunca abre. El ranking de útiles no te bloqueó: nunca te agregó.',
      'Qué disciplina, %N: no aportar nada y aun así ocupar sitio. Sos el impuesto al silencio. Si el grupo cobrara alquiler por ego sin uso, estarías desalojado antes del primer mensaje.',
      '%N, cero mensajes y presencia de lista. Sos un extra que pidió crédito de protagonista. El chat funciona sin vos y esa es la reseña más honestamente cruel de tu día.',
      '%N, el misterio de no escribir ya aburrió. Sos mobiliario con número. La autoestima que se esconde en el silencio no es profunda: está ausente.',
      'Contador en 0, %N. El grupo aprendió a construir sin tu turno. Sos el hueco que no duele. Eso debería asustarte más que cualquier insulto.',
      '%N, fantasma certificado. Lees el drama ajeno y no pagás el peaje de una línea. Sos público eterno en obra ajena. El valor propio no se farmea mirando.',
      '%N en 0. Estar silenciado por pose no te hace interesante: te hace prescindible. Sos el modo avión con foto. El chat no renovó tu contrato emocional.',
      '%N, 0 mensajes. No sos discreto. Sos ausencia con avatar. Si la dignidad tuviera admin, te habría sacado de moderación.'
    ];
  }
  if (count < 20) {
    return [
      '%N, %C mensajes: casi un debut… si el debut no hubiera durado años. Sos un tráiler eterno sin película. El grupo aprendió a no esperarte; eso no es misterio, es olvido educado. Tu autoestima sigue esperando el estreno.',
      'Hay esfuerzo en esas %C líneas, %N: el mínimo para no te borren y el máximo para no servir. Sos el buffer del chat. Si el valor se midiera en ecos, tu eco volvería vacío.',
      '%N con solo %C. Aparecés lo justo para recordar que existís y desaparecés lo justo para que nadie note la diferencia. Sos una actualización que nadie instaló. El ego ocupa gigas.',
      '%C mensajes, %N. Suficiente para molestar, insuficiente para importar. Sos el ruido blanco del hilo. La gente no te odia: te administra como una pestaña de más.',
      '%N, %C en el contador. Entraste a mirar el incendio y te quedaste sin balde. Sos el vecino que filma. El grupo ya tiene el video; vos seguís sin la escena útil.',
      '%N con %C. Casi no existís y aun así el ego pide platea. Sos la suscripción que nadie renueva. El chat te tiene en “tal vez después”.',
      '%C textos, %N. Historial de quien prueba el agua y nunca se tira. Sos la reseña de 2 estrellas hecha persona. Ni aplauso ni odio: indiferencia activa.',
      '%N, %C mensajes. Parásito de bajo consumo: estás, mirás, no cargás. Sos el cable que solo estorba. La autoestima no debería vivir de eso.',
      'Con %C, %N, construís olvido con precisión. Existir en la lista no es existir en el hilo. El ranking de útiles no te busca.',
      '%N lleva %C. Insuficiente para voz, sobrado para ocupar espacio. Sos el invitado que no trae nada y se queda hasta el final.'
    ];
  }
  if (count < 60) {
    return [
      '%N con %C mensajes: ni fantasma total ni pilar. Sos el limbo con teclado. Como un cargador que solo funciona en un ángulo. El grupo te tolera; no confundas tolerancia con respeto.',
      '%C en el marcador, %N. Actividad de quien prueba el agua y nunca se tira. Sos la reseña de 3 estrellas hecha persona. Ocupás el medio que nadie cotiza.',
      '%N, %C textos. Cumplís el mínimo para opinar y el máximo para no cargar nada. Sos el copiloto que toca el volante cuando el camino ya está derecho.',
      'Con %C mensajes, %N, estás en el mapa… dibujado con lápiz. Existir no es lo mismo que importar. El chat te lee en diagonal; tu ego, en negrita.',
      '%N lleva %C. Racha de tibieza. Sos el café tibio del grupo: nadie lo tira, nadie lo pide. El contador le hace seña a tu autoestima: seguí buscando.',
      '%C mensajes, %N. Historial de intermitencia. Sos la serie cancelada a mitad de temporada. El grupo ya vio el patrón.',
      '%N con %C. Suficiente para defenderte, poco para que el grupo te deba algo. El ego cotiza como outlier; los datos no.',
      '%N, %C: ruido intermitente con pose de criterio. Sos el control remoto sin pilas.',
      'A %C, %N, todavía no demostraste que el grupo gane algo con tenerte. Sos la promesa de aporte. La autoestima no se cobra en promesas.',
      '%N con %C. Zona gris del hilo. Sos el “meh” hecho persona. El ranking no pelea por los meh.'
    ];
  }
  if (count < 150) {
    return [
      '%N, %C mensajes: ya no sos invisible, todavía no sos indispensable. Sos el empleado del mes en una oficina sin mes. El grupo te reconoce; no te debe.',
      'Con %C en el contador, %N, hay rastro y techo bajo. Sos la serie renovada por inercia. Poco para que alguien pelee por vos en el ranking.',
      '%N con %C. Zona donde el ego se infla y el historial pide pruebas. Sos un borrador con firma. El “en proceso” ya venció.',
      '%C mensajes, %N. Pertenecés al chat; el chat no depende de ti. Sos el cable de más en la caja. La autoestima que se apoya ahí está mal asegurada.',
      '%N, %C: clase media del hilo. Sos el promedio con wifi. El problema es que tu ego cotiza como outlier.',
      '%N lleva %C. Hay base y techo de yeso. Sos el almost permanente. El grupo ya no se emociona con tus picos.',
      'A %C, %N, el archivo te conoce y no te debe lealtad. Sos presencia estable sin ser columna.',
      '%N con %C mensajes. Motor a media marcha. Sos el que llega cuando el trabajo pesado ya empezó.',
      '%C textos, %N. Dejaste de ser fantasma y todavía no sos referente. Sos el puente a mitad de río.',
      '%N, %C. El mapa te tiene; el podio no. Discurso de punta con números de medio. Se nota el desajuste.'
    ];
  }
  return [
      '%N con %C mensajes. Sostienes hilo de verdad. Sos de los que empujan el carro mientras otros discuten el color. El grupo te debe sitio por trabajo… no por pose.',
      '%C en el contador, %N. Motor del chat, no decoración. Presencia que duele cuando falta. No lo conviertas en soberbia de dueño del grupo.',
      '%N, %C mensajes. Farmeaste respeto a fuerza de escribir. Sos el antídoto del fantasma. Si el ego se te sube, el próximo roast cobra intereses.',
      'Con %C textos, %N, ya no sos relleno: sos esqueleto del hilo. La autoestima también se oxida si se apoya solo en el contador.',
      '%N lleva %C. Actividad alta, rastro claro. Celebralo… y preparate: cuanto más alto el número, más rico el asado cuando toque.',
      '%C mensajes, %N. Constancia de verdad. El respeto está ganado; la soberbia, en observación.',
      '%N con %C. El ranking te hace lugar por trabajo. No lo arruines con pose de intocable.',
      '%N, %C en el marcador. De los que escriben de verdad. Eso es poder… y responsabilidad. No lo gastes en teatro barato.',
      'A %C, %N, sos parte del esqueleto. El próximo golpe duele más justo porque el número te respaldó.',
      '%N con %C. Actividad que pesa. Disfrutalo sin convertirlo en aureola: el contador no es santo.'
  ];
}

const COUNTRY_ROAST = {
  AR: {
    name: 'Argentina',
    lines: [
      '%N, de %PAIS: qué nivel de análisis… para terminar corrigiendo al grupo como si fuera tu provincia. Sos la soberbia con prefijo: ego de selección y rendimiento de amistoso. En el ranking cotizás como alarma de prepotencia.',
      'Hay algo admirable en %N: la confianza de %PAIS sin el respaldo del resultado. Sos el tutorial que nadie pidió y todos mutean. Rico en verso; en hechos, en default.',
      '%N exporta de %PAIS la costumbre de mirar al resto como “el interior”. Mucho norte en la boca, poco terreno ganado. El chat ya te midió sin tu cátedra.',
      'De %PAIS, %N. El estereotipo no tuvo que trabajar: trajiste el monólogo de fábrica. Himno a volumen máximo en asado ajeno. La dignidad pide auriculares.',
      '%N, pack %PAIS: palabras largas, ideas cortas y ofensa fácil. Corrector automático sin permiso de admin. Tu valor propio depende de ganar discusiones; por eso perdés las importantes.',
      '%N de %PAIS: te creés el estándar del continente y no llegás al del hilo. PowerPoint sin botones.',
      'Prefijo %PAIS, %N. Exportás cuento de superioridad a un grupo que ya te auditó. El ego sigue en gira; el público se fue.',
      '%N, en %PAIS habrá cracks; vos saliste en el lote del que explica todo y no mueve nada.',
      'Clásico %PAIS, %N: el “ustedes no entienden” como personalidad. Acá entendimos de sobra.',
      '%N, soberbia de building y cimientos de cartón. %PAIS te dio el prefijo; el ridículo lo laburaste vos.',
    ],
  },
  ES: {
    name: 'España',
    lines: [
      '%N, de %PAIS: qué gracia la de ir de europeo superior en un chat donde el ranking no pide pasaporte. Sos la arrogancia con prefijo 34: mucho imperio en la boca y poco imperio en el contador. El grupo ya te hizo la Reconquista al revés.',
      'Hay estilo en %N: el de corregir el acento ajeno mientras el aporte llega en cuotas. Pack %PAIS de soberbia de terraza y entrega de menú del día. Si la autoestima se midiera en cañas, serías VIP; en hechos, estás de menú infantil.',
      '%N exporta de %PAIS la costumbre de mirar Latinoamérica como si fuera el patio trasero del WiFi. Sos el tutorial de “en España se hace así” que nadie pidió. El chat no es tu comunidad de vecinos.',
      'De %PAIS, %N. El estereotipo del que se cree el centro de Europa en un grupo hispano no tuvo que esforzarse: trajiste el monólogo de fábrica. Himno a volumen de bar a las 3. La dignidad pidió cierre.',
      '%N, pack %PAIS: queja olímpica, siesta productiva y ofensa fácil cuando te tocan el ego. Sos el corrector ortográfico del continente… sin cargo. Tu valor propio depende de ganar la sobremesa; por eso perdés el hilo.',
      '%N de %PAIS: te creés el estándar del idioma y no llegás al estándar del aporte. Sos la RAE con teclado y sin obra. El ranking no cotiza gramática sin sustancia.',
      'Prefijo %PAIS, %N. Exportás cinismo de capital a un grupo que ya te midió sin tu cátedra. El ego sigue de tapas; el público pidió la cuenta.',
      '%N, en %PAIS habrá cracks; vos saliste en el lote del que explica la vida ajena y no arregla la propia. PowerPoint de bar sin botones.',
      'Clásico %PAIS, %N: el “es que ustedes no entienden Europa” como personalidad. Acá entendimos de sobra. Por eso el silencio duele más que el roast.',
      '%N, soberbia de imperio y cimientos de bar de pueblo. %PAIS te dio el prefijo; el ridículo lo laburaste vos entre caña y caña.',
      '%N, de %PAIS: qué nivel de ironía… para terminar siendo el meme del chat. Sos la condescendencia con jamón: todo el mundo es “latinos” menos cuando pedís respeto. El archivo no hace excepciones ibéricas.',
      'Hay finura en %N: de terraza. Pack %PAIS de desprecio suave y aportación intermitente. Si la autoestima se midiera en sobradas, serías rico; en peso real, flotás.',
      '%N exporta de %PAIS el “ya está todo inventado aquí”. Sos el museo que cobra entrada y no tiene exposición. El grupo no renovó la visita.',
      'De %PAIS, %N. Te creés el adulto de la sala hispana y no sostenés el hilo cuando pesa. Sos superioridad de manual escolar. La dignidad no se firma en la UE del ego.',
      '%N, prefijo %PAIS y ego de que el resto habla “mal”. El ranking no premia el acento; premia el rastro. El tuyo pide refuerzo.',
      '%N de %PAIS: confundes ser directo con ser insoportable. Acá el directo sin sustancia es solo ruido con zeta.',
      'Labia de tertulia, sustancia de monólogo, %N. %PAIS en el SIM y el vacío en la propuesta.',
      '%N, el español de %PAIS que viene a dar lecciones y se lleva el roast. El chat no es tu EBAU emocional.',
      'Clásico %PAIS, %N: ofenderte por el tono y aportar cero al fondo. El archivo no llora en castellano neutro.',
      '%N hace de %PAIS un tutorial de arrogancia con wifi. No cotiza.',
      '%N, de %PAIS: qué cultura… para terminar midiendo al resto con prejuicio de balcón. Sos el prejuicio con pasaporte. El grupo ya te clasificó sin aduanas.',
      'Hay orgullo en %N: el del prefijo. Pack %PAIS de historia larga y paciencia corta. Si la autoestima se alimentara de siglo de oro, estarías lleno; de mensajes útiles, en ayuno.',
      '%N exporta de %PAIS la soberbia de quien cree que el español “de verdad” es el suyo. Spoiler: el ranking escribe en números.',
      'De %PAIS, %N. Te vendés como nivel Europa y entregás drama de grupo de WhatsApp. Soft power del cringe ibérico.',
      '%N, pack %PAIS: mucho “hay que ser serios” y poco ser serio cuando toca cargar. El chat te tolera; no te debe la monarquía del ego.',
      '%N de %PAIS: el “en mi país esto no pasa” como comodín. Acá pasa: te leyeron entero.',
      'Prefijo %PAIS, %N. Embajador no pedido de la condescendencia. Credenciales no renovadas.',
      '%N, en %PAIS habrá gente brillante; vos estás en el feed del que corrige y no construye.',
      'Clásico %PAIS, %N: ganar la pelea del estilo y perder la del contenido.',
      '%N hace de %PAIS un himno a la sobrada. El cierre se escribe solo.',
      '%N, de %PAIS: qué seguridad… para terminar siendo el que más se ofende. Sos la fragilidad con bandera. El roast solo hizo de espejo.',
      'Hay soltura en %N: de bar. Pack %PAIS de chiste fácil y autocrítica imposible. Rico en gracia ajena; pobre en la propia.',
      '%N exporta de %PAIS el cinismo de capital. Todo te parece provinciano menos tu ego. El archivo es capital del dato.',
      'De %PAIS, %N. Te creés ilegible y sos predecible: soberbia, corrección, cero entrega. Manual.',
      '%N, prefijo %PAIS y talento para mirar feo el hilo. El hilo no te debe respeto automático.',
      '%N de %PAIS: si el ego pagara IVA, estarías auditado por Hacienda emocional.',
      'Código %PAIS, %N: más energía en quedar por encima que en quedar bien.',
      '%N, %PAIS en el número y el cuento en la boca. El contador no compra cuentos.',
      'Clásico %PAIS, %N: explicar de más para no asumir de más.',
      '%N, veredicto %PAIS: soberbia alta, utilidad en duda, respeto en negociación.',
      '%N, de %PAIS: el falso cumplido se escribe solo —qué continente— y se cae solo. Sos el imperio que no cabe en un mensaje. El grupo ya firmó la independencia de tu monólogo.',
      'Hay porte en %N: el del que llega tarde y corrige la hora. Pack %PAIS. Si la autoestima fuera horario peninsular, llegarías tarde a tu propio valor.',
      '%N exporta de %PAIS la costumbre de ser el más listo de la sobremesa. En este chat la sobremesa es el ranking, y no vas primero.',
      'De %PAIS, %N. Te creés el faro del idioma y aportás niebla. El faro está apagado; el barco del grupo ya dobló.',
      '%N, pack %PAIS de ironía barata y resultado caro de mirar. El espejo no acepta bizum de excusas.',
      '%N de %PAIS: mucho “cultura” en la bio mental y poco cultivo en el hilo. Se nota la sequía.',
      'Prefijo %PAIS, %N. Exportación de prepotencia detectada. Devolución al remitente con gastos.',
      '%N, en %PAIS el ego es deporte nacional en tertulia. Acá te descalifican por fair play nulo.',
      'Clásico %PAIS, %N: el monólogo eterno para no escuchar el dato que te incomoda.',
      '%N hace de %PAIS el chiste del continente sin querer. El punchline sos vos.'
    ],
  },
  CO: {
    name: 'Colombia',
    lines: [
      '%N, de %PAIS: qué labia tan fina… para terminar vendiendo humo al por menor. Viveza con WiFi: todo se “acomoda” menos tu historial. El grupo ya no compra; archiva.',
      'Hay talento en %N: sonreír mientras el aporte no aparece. Pack %PAIS de cuento bien contado y entrega que nunca llega. Rico en promesas.',
      '%N exporta de %PAIS la confianza de vivo y la constancia de flyer. Comercial de madrugada: el producto no llega.',
      'De %PAIS, %N. Te creés táctico y salís predecible. El “ya veo” eterno como estrategia de no hacer.',
      '%N, prefijo %PAIS y software de “tranquilo que se resuelve”. Nunca se resuelve. Reunión que pudo ser un mensaje… y ni el mensaje sirvió.',
      '%N de %PAIS: confundes ser pillo con ser útil. Acá no sos ninguna de las dos.',
      'Labia de comercial, sustancia de flyer, %N. %PAIS en el SIM y el vacío en la promesa.',
      '%N, el vivo vive del bobo. Acá el vivo queda expuesto.',
      'Clásico %PAIS, %N: malicia para el chisme, torpeza para el aporte.',
      '%N hace de %PAIS un tutorial de confianza sin evidencia.',
    ],
  },
  MX: {
    name: 'México',
    lines: [
      '%N, de %PAIS: qué intensidad… para terminar siendo volumen sin argumento. Drama con teclado: todo escena, nada guion. El grupo te baja el gain.',
      'Hay pasión en %N: gritar como si eso fuera tesis. Pack %PAIS de ruido fácil y criterio difícil. Rico en decibeles; pobre en sustancia.',
      '%N exporta de %PAIS el show permanente. Telenovela de un capítulo repetido. Final: saturación.',
      'De %PAIS, %N. Te creés el centro y aportás el caos. Piñata del hilo: todos saben dónde pegar.',
      '%N, prefijo %PAIS y ego de plaza. El volumen no te da la razón; te da audiencia cansada.',
      '%N de %PAIS: mucho “no manches” mental y cero ejecución. Sos alarma, no líder.',
      'Drama fácil, criterio difícil, %N. %PAIS en el número y el vacío en el párrafo.',
      '%N convierte todo en escena. El chat no es tu set.',
      'Clásico %PAIS, %N: ofenderte por todo y aportar nada.',
      '%N, el show no tapa el hueco. El ranking ya midió el hueco.',
    ],
  },
  VE: {
    name: 'Venezuela',
    lines: [
      '%N, de %PAIS: qué narrativa tan urgente… para terminar siendo noticiero sin cierre. Agravio con teclado. El grupo no es tu gobierno.',
      'Hay fuerza en %N: reclamar sin proponer. Pack %PAIS de denuncia a volumen alto y autocrítica en cero.',
      '%N exporta de %PAIS el “nadie entiende” como personalidad. Himno a la ofensa colectiva. El chat entiende; no aplaude.',
      'De %PAIS, %N. Resistencia en el discurso, ausencia en el plan. Asamblea permanente.',
      '%N, prefijo %PAIS y ego de agraviado vitalicio. El ranking reparte números, no empatía infinita.',
      '%N de %PAIS: convertís todo en agravio. El archivo pide hechos.',
      'Queja crónica, solución nula, %N. %PAIS en el SIM y el reclamo en la boca.',
      '%N, el micrófono del drama no te hace lúcido; te hace predecible.',
      'Clásico %PAIS, %N: pelear por todo y construir poco.',
      '%N hace de %PAIS un tutorial de ofensa sin responsabilidad.',
    ],
  },
  PE: {
    name: 'Perú',
    lines: [
      '%N, de %PAIS: qué compostura… para terminar siendo tribunal sin toga. Mohín profesional. El grupo no te pidió sentencia.',
      'Hay seriedad en %N: de brochure. Pack %PAIS de formalismo alto y entrega intermitente.',
      '%N exporta de %PAIS la ofensa en diferido. Resentimiento bien peinado. Preferimos el no con fecha.',
      'De %PAIS, %N. Te hacés el humilde y medís a todos con regla ajena. Juez sin expediente.',
      '%N, prefijo %PAIS y ego de “ya pues” sin sustancia. El ranking cotiza carga, no agrio.',
      '%N de %PAIS: silencio estratégico que en realidad es vacío. Se te oye igual.',
      'Agrio bien vestido, %N. %PAIS en el número y el juicio en la cara.',
      '%N, el misterio no te hace interesante; te hace flojo de entrega.',
      'Clásico %PAIS, %N: criticar sin proponer.',
      '%N hace de %PAIS un seminario de ofensa pasiva.',
    ],
  },
  BR: {
    name: 'Brasil',
    lines: [
      '%N, de %PAIS: qué alegría tan ruidosa… para terminar siendo after sin sustancia. Farra con teclado. El grupo no es tu camarote.',
      'Hay carisma en %N: de playlist. Pack %PAIS de sonrisa grande y aporte chico. Hit en ritmo; intro saltado en resultados.',
      '%N exporta de %PAIS el show tropical. Carnaval de un solo flotante: vos. El chat bajó el volumen.',
      'De %PAIS, %N. Te creés el desfile y el desfile es malo. Resaca con beat.',
      '%N, prefijo %PAIS y ego de estrella en chat de barrio. El ranking no es pasarela.',
      '%N de %PAIS: fútbol en la boca, cero en el hilo. Fuera de juego.',
      'Fiesta verbal, utilidad en resaca, %N. %PAIS en el SIM y el after en la cabeza.',
      '%N, el ritmo no te hace indispensable; te hace ruido alegre.',
      'Clásico %PAIS, %N: ambientar para no aportar.',
      '%N hace de %PAIS un tutorial de gracia sin gracia.',
    ],
  },
  CL: {
    name: 'Chile',
    lines: [
      '%N, de %PAIS: qué orden… para terminar mirando al resto por encima del hombro. Frío administrativo. El grupo no es tu sucursal.',
      'Hay estándar en %N: en la boca. Pack %PAIS de crítica fina y autocrítica nula.',
      '%N exporta de %PAIS la soberbia ordenada. Adulto de la sala que no sostiene el hilo.',
      'De %PAIS, %N. “Acá se hace bien” sin mostrar el bien. Superioridad sin expediente.',
      '%N, prefijo %PAIS y ego de checklist. El ranking no premia el mohín técnico.',
    ],
  },
  EC: {
    name: 'Ecuador',
    lines: [
      '%N, de %PAIS: qué discreción… para terminar invisible de utilidad. Molestia suave. El grupo no te debe el clima emocional.',
      'Hay sensibilidad en %N: selectiva. Pack %PAIS de ofensa fácil y propuesta difícil.',
      '%N exporta de %PAIS la queja templada. Boletín de molestias. Preferimos el dato seco.',
      'De %PAIS, %N. Víctima con el teclado y verdugo con el silencio.',
      '%N, prefijo %PAIS y ego de agravio chico. El ranking no cotiza drama en cuotas.',
    ],
  },
  GT: {
    name: 'Guatemala',
    lines: [
      '%N, de %PAIS: qué calma volcánica… para terminar explotando por cualquier mensaje. Sos el cráter con teclado: lava de ego y ceniza de aporte. El grupo ya evacuó tu monólogo.',
      'Hay mística en %N: la de %PAIS en modo “yo vi cosas”. Pack de misterio barato y constancia nula. Si la autoestima se midiera en leyendas, serías ruina turística; en hechos, estás cerrado por mantenimiento.',
      '%N exporta de %PAIS la costumbre de survivor en el chat. Sos el que sobrevive al drama sin mover un dedo útil. El ranking no da medallas por aguantar mirando.',
      'De %PAIS, %N. Te creés el centro del istmo y aportás periferia. Sos el volcán apagado que igual amenaza. La dignidad pidió zona segura.',
      '%N, pack %PAIS: orgullo alto, entrega a cuentagotas. Sos el café que se enfría en la mesa. Nadie lo pide caliente otra vez.',
      '%N de %PAIS: confundes ser reservado con ser interesante. El silencio no te hace profundo; te hace ausente de carga.',
      'Prefijo %PAIS, %N. Exportás drama de altura y utilidad de valle. El chat ya bajó la montaña sin vos.',
      '%N, en %PAIS habrá gente clara; vos enturbiás el hilo con pose de sabio. El archivo no compra incienso.',
      'Clásico %PAIS, %N: ofenderte bajito y aportar más bajo todavía. Se te oye igual.',
      '%N hace de %PAIS un tutorial de presencia sin peso. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué cultura— se cae solo. Sos souvenir de ridículo. El grupo no hace aduana sentimental.',
      'Hay orgullo en %N: el del prefijo. Pack %PAIS de historia densa y hilo flojo. Autoestima de museo; rendimiento de taquilla vacía.',
      '%N exporta de %PAIS el “nadie sabe lo que es sufrir” a un chat que solo pidió un mensaje útil. Spoiler: no lo mandaste.',
      'De %PAIS, %N. Te vendés como nivel y entregás niebla. Soft power del cringe centroamericano.',
      '%N, pack %PAIS: mucho carácter, poco carácter cuando toca cargar. El ranking no negocia temperamento.',
      '%N de %PAIS: el misterio ya aburrió. Sos el spoiler de tu propia irrelevancia.',
      'Prefijo %PAIS, %N. Embajador no pedido del mohín. Credenciales vencidas.',
      '%N, en %PAIS el ego encuentra altura. Acá encuentra el piso del contador.',
      'Clásico %PAIS, %N: ganar la pelea del orgullo y perder la del rastro.',
      '%N hace de %PAIS el chiste del mapa sin querer. El punchline sos vos.'
    ],
  },
  CU: {
    name: 'Cuba',
    lines: [
      '%N, de %PAIS: qué narrativa de resistencia… para terminar resistiendo solo al aporte. Sos el discurso eterno con teclado prestado. El grupo no es tu asamblea.',
      'Hay ritmo en %N: el de %PAIS en modo son mental. Pack de swing y cero partitura útil. Si la autoestima se midiera en nostalgia, serías rico; en mensajes, en cartilla.',
      '%N exporta de %PAIS el “ustedes no saben” como personalidad. Sos el noticiero sin cierre. El chat cambió de canal.',
      'De %PAIS, %N. Te creés el faro del Caribe y aportás apagón. Sos apología del agravio. La dignidad pidió generador.',
      '%N, pack %PAIS: queja larga, solución corta. Sos la fila infinita del ego. Nadie guarda tu lugar.',
      '%N de %PAIS: confundes historia con excusa permanente. El ranking no acepta cupones de pasado.',
      'Prefijo %PAIS, %N. Exportás drama de escasez emocional a un chat que no te debe racionamiento de empatía.',
      '%N, en %PAIS habrá talento; vos estás en el feed del monólogo. El archivo no aplaude de pie.',
      'Clásico %PAIS, %N: pelear por el relato y perder el dato. Se nota.',
      '%N hace de %PAIS un tutorial de orgullo sin entrega. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué isla— se hunde solo. Sos balsa de ego. El grupo ya llegó a tierra sin vos.',
      'Hay fuego en %N: de discurso. Pack %PAIS de pasión alta y constancia baja. Autoestima de himno; rendimiento de ensayo.',
      '%N exporta de %PAIS la costumbre de ser víctima profesional. Acá el rol no paga.',
      'De %PAIS, %N. Te vendés como resistencia y entregás saturación. Soft power del reclamo.',
      '%N, pack %PAIS: mucho “en mi tierra”, poco tierra ganada en el hilo.',
      '%N de %PAIS: el micrófono del drama no te hace lúcido; te hace predecible.',
      'Prefijo %PAIS, %N. Embajador del agravio. El chat no renovó credenciales.',
      '%N, en %PAIS el relato pesa. Acá pesa el contador, y no te favorece.',
      'Clásico %PAIS, %N: alargar el himno y acortar el aporte.',
      '%N hace de %PAIS el chiste del Caribe sin gracia. Punchline: vos.'
    ],
  },
  BO: {
    name: 'Bolivia',
    lines: [
      '%N, de %PAIS: qué altura moral… para terminar mirando al resto desde un cerro de ego. Sos la meseta con teclado: aire fino y argumento más fino todavía. El grupo ya bajó a cotas útiles.',
      'Hay orgullo en %N: el de %PAIS en modo altiplano. Pack de dignidad anunciada y entrega a media oxigenación. Si la autoestima se midiera en metros sobre el nivel del mar, serías Everest; en hechos, valle.',
      '%N exporta de %PAIS la costumbre de ofenderte por el clima del hilo. Sos meteorología emocional. El chat prefiere el parte seco del ranking.',
      'De %PAIS, %N. Te creés el centro andino y aportás periferia. Sos el cóndor que no despega. La dignidad pidió pista.',
      '%N, pack %PAIS: mucho carácter, poco cargamento. Sos la mina de orgullo sin vetas de utilidad.',
      '%N de %PAIS: confundes ser serio con ser pesado. El silencio no te hace sabio; te hace lastre.',
      'Prefijo %PAIS, %N. Exportás mohín de altura. El archivo no sube esa montaña.',
      '%N, en %PAIS habrá gente clara; vos nublás el hilo. Se nota la niebla.',
      'Clásico %PAIS, %N: juzgar en silencio y aportar en cuotas. El ranking no cotiza juicio mudo.',
      '%N hace de %PAIS un tutorial de orgullo sin oxígeno de datos. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué tierra— se erosiona solo. Sos souvenir de ridículo andino.',
      'Hay temple en %N: anunciado. Pack %PAIS de formalismo y flojera operativa. Autoestima de cumbre; rendimiento de campamento base.',
      '%N exporta de %PAIS el “respeto primero” mientras no respeta el turno de aportar.',
      'De %PAIS, %N. Te vendés como nivel y entregás pendiente. Soft power del cringe altiplánico.',
      '%N, pack %PAIS: ofensa fácil, propuesta difícil. El chat ya hizo la trepada sin vos.',
      '%N de %PAIS: el misterio de la altura ya no impresiona. Sos el mal de montaña del hilo.',
      'Prefijo %PAIS, %N. Embajador del agrio. Credenciales en descenso.',
      '%N, en %PAIS el ego encuentra cumbre. Acá encuentra el valle del contador.',
      'Clásico %PAIS, %N: ganar la pelea del orgullo y perder la del rastro.',
      '%N hace de %PAIS el chiste del mapa. Punchline: vos.'
    ],
  },
  DO: {
    name: 'República Dominicana',
    lines: [
      '%N, de %PAIS: qué swing… para terminar siendo ruido sin coreografía. Sos el dembow del ego: pegajoso, repetitivo y sin segunda estrofa útil. El grupo bajó el volumen.',
      'Hay chispa en %N: la de %PAIS en modo fiesta mental. Pack de alegría anunciada y aporte que nunca llega a la pista. Si la autoestima se midiera en perreo, serías DJ; en hechos, pista vacía.',
      '%N exporta de %PAIS la costumbre de resolverlo todo “en confianza”. Sos el contactito que no contacta resultados. El ranking no baila esa.',
      'De %PAIS, %N. Te creés el flow del chat y aportás buffer. Sos playlist sin hits. La dignidad pidió skip.',
      '%N, pack %PAIS: labia alta, constancia baja. Sos el after que se vende como concierto.',
      '%N de %PAIS: confundes ser simpático con ser útil. La simpatía no suma en el contador.',
      'Prefijo %PAIS, %N. Exportás farra verbal. El archivo no está de party.',
      '%N, en %PAIS habrá talento; vos estás en el intro eterno. Nadie llega al drop de tu aporte.',
      'Clásico %PAIS, %N: ambientar para no cargar. Se nota el hueco.',
      '%N hace de %PAIS un tutorial de flow sin sustancia. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué isla— se derrite solo. Sos resort de ego. El grupo no renovó la estadía.',
      'Hay ritmo en %N: de discurso. Pack %PAIS de show y poco ensayo. Autoestima de escenario; rendimiento de backstage vacío.',
      '%N exporta de %PAIS el “tú no sabe” con sonrisa. Acá sí sabe el ranking.',
      'De %PAIS, %N. Te vendés como buen ambiente y entregás saturación. Soft power del ruido.',
      '%N, pack %PAIS: mucho dembow mental, poco compás de trabajo.',
      '%N de %PAIS: el micrófono del chat no te hace artista; te hace karaoke.',
      'Prefijo %PAIS, %N. Embajador del after. Credenciales en resaca.',
      '%N, en %PAIS el flow vende. Acá vende el rastro, y el tuyo pide remix.',
      'Clásico %PAIS, %N: ganar la pista y perder el hilo.',
      '%N hace de %PAIS el chiste del Caribe con beat. Punchline: vos.'
    ],
  },
  HN: {
    name: 'Honduras',
    lines: [
      '%N, de %PAIS: qué temple… para terminar templando solo el ego. Sos la tormenta anunciada con teclado: mucho aviso, poco refugio útil. El grupo ya sacó el paraguas y te dejó afuera.',
      'Hay carácter en %N: el de %PAIS en modo supervivencia. Pack de dureza verbal y aporte intermitente. Si la autoestima se midiera en aguante, serías leyenda; en mensajes útiles, alerta amarilla.',
      '%N exporta de %PAIS la costumbre de resolver a gritos lo que pedía un dato. Sos sirena sin plan de evacuación. El ranking no corre.',
      'De %PAIS, %N. Te creés el centro del mapa y aportás margen. Sos el camino de tierra del hilo: se nota cuando llueve drama.',
      '%N, pack %PAIS: orgullo alto, entrega irregular. Sos el puente que tiembla. Nadie carga de más sobre vos.',
      '%N de %PAIS: confundes ser fuerte con ser pesado. La fuerza sin dirección es solo peso muerto.',
      'Prefijo %PAIS, %N. Exportás drama de carretera. El archivo no hace stop.',
      '%N, en %PAIS habrá gente clara; vos enturbiás. Se nota el lodazal.',
      'Clásico %PAIS, %N: ofenderte fácil y aportar difícil. El chat ya eligió ruta alterna.',
      '%N hace de %PAIS un tutorial de dureza sin resultado. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué pueblo— se lava solo con la lluvia del roast. Sos barro de ego.',
      'Hay aguante en %N: anunciado. Pack %PAIS de pelea y poco plan. Autoestima de trinchera; rendimiento de deserción selectiva.',
      '%N exporta de %PAIS el “nadie me respeta” mientras no respeta el turno de sumar.',
      'De %PAIS, %N. Te vendés como nivel y entregás bache. Soft power del cringe.',
      '%N, pack %PAIS: mucho grito, poco mapa. El ranking no usa tu brújula.',
      '%N de %PAIS: el misterio de la dureza ya no impresiona. Sos el bache del hilo.',
      'Prefijo %PAIS, %N. Embajador del temperamento. Credenciales en tope de velocidad.',
      '%N, en %PAIS el ego encuentra pelea. Acá encuentra el contador, y pierde por puntos.',
      'Clásico %PAIS, %N: ganar el grito y perder el rastro.',
      '%N hace de %PAIS el chiste del mapa. Punchline: vos.'
    ],
  },
  PY: {
    name: 'Paraguay',
    lines: [
      '%N, de %PAIS: qué quietud… para terminar siendo el eco de un ego que no habla claro. Sos la siesta del aporte: largo descanso, corto despertar útil. El grupo ya laburó la jornada sin vos.',
      'Hay orgullo en %N: el de %PAIS en modo discreto. Pack de dignidad baja voz y entrega más baja todavía. Si la autoestima se midiera en silencio, serías biblioteca; en hechos, anaquel vacío.',
      '%N exporta de %PAIS la costumbre de mirar de reojo y no cargar. Sos el vecino del hilo. El ranking no cotiza miradas.',
      'De %PAIS, %N. Te creés el equilibrio del Cono Sur y aportás desbalance. Sos el tereré del drama: se estira, no alimenta.',
      '%N, pack %PAIS: poco ruido, menos sustancia. Sos la ausencia educada. Duele menos de lo que tu ego imagina.',
      '%N de %PAIS: confundes ser tranquilo con ser prescindible. La calma sin rastro es solo olvido.',
      'Prefijo %PAIS, %N. Exportás mohín suave. El archivo no se inmuta.',
      '%N, en %PAIS habrá gente clara; vos preferís la sombra. Se nota la falta de luz en el aporte.',
      'Clásico %PAIS, %N: no molestar y no sumar. El chat premia lo segundo cuando falta.',
      '%N hace de %PAIS un tutorial de discreción sin peso. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué paz— se rompe solo. Sos siesta de ego. El grupo no puso despertador.',
      'Hay temple en %N: anunciado. Pack %PAIS de formalismo quieto y flojera operativa.',
      '%N exporta de %PAIS el “yo no me meto” cuando justamente había que meter el hombro.',
      'De %PAIS, %N. Te vendés como equilibrado y entregás vacío. Soft power del cringe silencioso.',
      '%N, pack %PAIS: ofensa en diferido, aporte en nevera. El ranking no espera tu deshielo.',
      '%N de %PAIS: el misterio del silencio ya no vende. Sos el mute con foto.',
      'Prefijo %PAIS, %N. Embajador de la ausencia. Credenciales en pausa.',
      '%N, en %PAIS el ego encuentra sombra. Acá encuentra el sol del contador.',
      'Clásico %PAIS, %N: no perder… y tampoco ganar nada en el rastro.',
      '%N hace de %PAIS el chiste del mapa en voz baja. Igual se oye.'
    ],
  },
  SV: {
    name: 'El Salvador',
    lines: [
      '%N, de %PAIS: qué intensidad… para terminar siendo chispa sin circuito. Sos el voltaje del ego: sube rápido, quema el aporte. El grupo ya bajó los plomos.',
      'Hay fuerza en %N: la de %PAIS en modo compacto. Pack de carácter denso y entrega irregular. Si la autoestima se midiera en decibeles por kilómetro cuadrado, serías récord; en hechos, cortocircuito.',
      '%N exporta de %PAIS la costumbre de resolver en caliente. Sos la disputa que pudo ser un mensaje. El ranking no se pelea: suma.',
      'De %PAIS, %N. Te creés el centro del mapa chico y aportás drama grande. Sos el temblor del hilo. La dignidad pidió estructura antisísmica.',
      '%N, pack %PAIS: orgullo alto, paciencia baja. Sos el fusible del chat. Siempre salta vos.',
      '%N de %PAIS: confundes ser directo con ser abrasivo. Lo directo sin sustancia es solo roce.',
      'Prefijo %PAIS, %N. Exportás temperamento. El archivo no es ring.',
      '%N, en %PAIS habrá gente clara; vos electrificás el hilo sin iluminar. Se nota el cortocircuito.',
      'Clásico %PAIS, %N: ganar la pelea del tono y perder la del contenido.',
      '%N hace de %PAIS un tutorial de intensidad sin resultado. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué pueblo— se funde solo. Sos chispa de ego.',
      'Hay aguante en %N: anunciado. Pack %PAIS de pelea y poco plan largo.',
      '%N exporta de %PAIS el “respeto” como grito. El respeto aquí se farmea con rastro.',
      'De %PAIS, %N. Te vendés como nivel y entregás sobrecarga. Soft power del cringe.',
      '%N, pack %PAIS: mucho voltaje, poca lámpara. El chat sigue a oscuras de tu aporte.',
      '%N de %PAIS: el misterio de la dureza ya no impresiona. Sos el apagón del hilo.',
      'Prefijo %PAIS, %N. Embajador del cortocircuito. Credenciales chamuscadas.',
      '%N, en %PAIS el ego encuentra pelea. Acá encuentra el contador y pierde por puntos.',
      'Clásico %PAIS, %N: subir el tono y bajar el rastro.',
      '%N hace de %PAIS el chiste del mapa. Punchline: vos.'
    ],
  },
  NI: {
    name: 'Nicaragua',
    lines: [
      '%N, de %PAIS: qué narrativa… para terminar siendo capítulo eterno sin trama útil. Sos el discurso de %PAIS con teclado: largo, solemne y sin cierre de aporte. El grupo cambió de libro.',
      'Hay solemnidad en %N: la de %PAIS en modo himno. Pack de orgullo denso y constancia floja. Si la autoestima se midiera en proclamas, serías portada; en hechos, nota al pie.',
      '%N exporta de %PAIS la costumbre de hablar como si el chat fuera plaza pública. Sos mitin de uno. El ranking no vota esa lista.',
      'De %PAIS, %N. Te creés el centro moral y aportás periferia. Sos el faro con apagones. La dignidad pidió generador de datos.',
      '%N, pack %PAIS: mucho relato, poco recibo. Sos la promesa de cambio que no llega al hilo.',
      '%N de %PAIS: confundes ser intenso con ser importante. La intensidad sin rastro es solo ruido.',
      'Prefijo %PAIS, %N. Exportás drama de proclama. El archivo no hace mítines.',
      '%N, en %PAIS habrá gente clara; vos preferís el discurso. Se nota la falta de párrafo útil.',
      'Clásico %PAIS, %N: ganar la pelea del relato y perder la del contador.',
      '%N hace de %PAIS un tutorial de solemnidad sin sustancia. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué tierra— se derrumba solo. Sos monumento al ego.',
      'Hay fuego en %N: de discurso. Pack %PAIS de pasión y poco plan operativo.',
      '%N exporta de %PAIS el “nadie entiende” como estribillo. Acá el ranking entiende de sobra.',
      'De %PAIS, %N. Te vendés como causa y entregás saturación. Soft power del reclamo.',
      '%N, pack %PAIS: ofensa colectiva, responsabilidad individual en cero.',
      '%N de %PAIS: el micrófono del drama no te hace líder; te hace karaoke político.',
      'Prefijo %PAIS, %N. Embajador del himno. Credenciales en bis eterno.',
      '%N, en %PAIS el relato pesa. Acá pesa el rastro, y el tuyo pide reedición.',
      'Clásico %PAIS, %N: alargar el discurso y acortar el aporte.',
      '%N hace de %PAIS el chiste del mapa. Punchline: vos.'
    ],
  },
  CR: {
    name: 'Costa Rica',
    lines: [
      '%N, de %PAIS: qué pura vida… para terminar siendo pura pose. Sos el postcard del ego: bonito en la foto, vacío en el reverso del hilo. El grupo ya no manda recuerdos.',
      'Hay suavidad en %N: la de %PAIS en modo brochure. Pack de amabilidad anunciada y aporte intermitente. Si la autoestima se midiera en paisajes, serías parque nacional; en hechos, sendero cerrado.',
      '%N exporta de %PAIS la costumbre de quedar bien y cargar poco. Sos el “con mucho gusto” sin gusto por el trabajo. El ranking no cotiza sonrisas.',
      'De %PAIS, %N. Te creés el paraíso del chat y aportás zona de obras. Sos turista en tu propio hilo. La dignidad pidió guía útil.',
      '%N, pack %PAIS: mucha calma, poca carga. Sos la hamaca del aporte. Se ve cómoda; no avanza.',
      '%N de %PAIS: confundes ser nice con ser necesario. Lo nice sin rastro es solo decoración.',
      'Prefijo %PAIS, %N. Exportás paz verbal. El archivo pide movimiento.',
      '%N, en %PAIS habrá gente clara; vos preferís el brochure. Se nota la falta de mapa real.',
      'Clásico %PAIS, %N: quedar bien y quedar fuera del ranking útil.',
      '%N hace de %PAIS un tutorial de pura vida sin vida en el contador. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué país— se lava con la lluvia del roast. Sos souvenir.',
      'Hay zen en %N: anunciado. Pack %PAIS de suavidad y flojera operativa.',
      '%N exporta de %PAIS el “tranquilo” como estrategia de no hacer. Acá el tranquilo no suma.',
      'De %PAIS, %N. Te vendés como buen clima y entregás nubosidad de aporte. Soft power del cringe amable.',
      '%N, pack %PAIS: ofensa en voz baja, aporte en suspensión.',
      '%N de %PAIS: el misterio de la calma ya no vende. Sos el mute educado.',
      'Prefijo %PAIS, %N. Embajador del brochure. Credenciales de turista.',
      '%N, en %PAIS el ego encuentra playa. Acá encuentra el contador y bajamar.',
      'Clásico %PAIS, %N: sonreír y no cargar.',
      '%N hace de %PAIS el chiste del paraíso. Punchline: vos.'
    ],
  },
  PA: {
    name: 'Panamá',
    lines: [
      '%N, de %PAIS: qué canal… para terminar siendo peaje de ego. Sos el tránsito del drama: todo pasa por vos y no queda carga útil. El grupo ya abrió ruta alterna.',
      'Hay viveza en %N: la de %PAIS en modo atajo. Pack de labia comercial y entrega a medias. Si la autoestima se midiera en peajes, serías franquicia; en hechos, vía cerrada.',
      '%N exporta de %PAIS la costumbre de cobrar comisión emocional. Sos el intermediario que no intermedia resultados. El ranking no paga esa tarifa.',
      'De %PAIS, %N. Te creés el hub del chat y aportás demora. Sos contenedor vacío con bandera. La dignidad pidió manifiesto de carga.',
      '%N, pack %PAIS: mucho movimiento anunciado, poco atraque de aporte. Sos el barco que no atraca.',
      '%N de %PAIS: confundes ser conectado con ser útil. La agenda llena no suma si el rastro está vacío.',
      'Prefijo %PAIS, %N. Exportás atajo verbal. El archivo no hace escala.',
      '%N, en %PAIS habrá gente clara; vos preferís el deal. Se nota la falta de entrega final.',
      'Clásico %PAIS, %N: negociar todo menos tu propia mejora.',
      '%N hace de %PAIS un tutorial de canal sin barcos. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué hub— se atasca solo. Sos tráfico de ego.',
      'Hay olfato en %N: de negocio. Pack %PAIS de sonrisa y poco descargue.',
      '%N exporta de %PAIS el “yo te conecto” y no conecta ni el aporte propio.',
      'De %PAIS, %N. Te vendés como puente y entregás peaje. Soft power del cringe comercial.',
      '%N, pack %PAIS: mucho tránsito, poca mercancía útil en el hilo.',
      '%N de %PAIS: el misterio del deal ya no impresiona. Sos el contenedor vacío.',
      'Prefijo %PAIS, %N. Embajador del atajo. Credenciales en aduana.',
      '%N, en %PAIS el ego encuentra tráfico. Acá encuentra el contador y semáforo en rojo.',
      'Clásico %PAIS, %N: mover fichas y no mover el rastro.',
      '%N hace de %PAIS el chiste del canal. Punchline: vos.'
    ],
  },
  UY: {
    name: 'Uruguay',
    lines: [
      '%N, de %PAIS: qué sobriedad… para terminar siendo sobrio de aporte y borracho de criterio ajeno. Sos el mate del ego: ronda eterna, yerba de juicio, poco dulzor de utilidad. El grupo ya cambió de termo.',
      'Hay compostura en %N: la de %PAIS en modo mesurado. Pack de seriedad anunciada y entrega tibia. Si la autoestima se midiera en mesura, serías manual; en hechos, nota al margen.',
      '%N exporta de %PAIS la costumbre de mirar al resto como si fueran ruidosos por defecto. Sos el árbitro sin partido. El ranking no pide tu silbato.',
      'De %PAIS, %N. Te creés el equilibrio del Cono Sur y aportás empate eterno. Sos el 0-0 del hilo. La dignidad pidió un gol de aporte.',
      '%N, pack %PAIS: poco show, menos sustancia. Sos la sobriedad que tapa flojera. Se lee.',
      '%N de %PAIS: confundes ser serio con ser interesante. La seriedad sin rastro es solo cara larga.',
      'Prefijo %PAIS, %N. Exportás mohín educado. El archivo no se impresiona.',
      '%N, en %PAIS habrá gente clara; vos preferís el juicio en voz baja. Se te oye igual.',
      'Clásico %PAIS, %N: no exagerar… y no aportar. El medio no es virtud si está vacío.',
      '%N hace de %PAIS un tutorial de mesura sin peso. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué país serio— se cae solo. Sos sobriedad de ego.',
      'Hay temple en %N: anunciado. Pack %PAIS de formalismo y flojera operativa.',
      '%N exporta de %PAIS el “hay que ser serios” mientras el rastro pide seriedad tuya.',
      'De %PAIS, %N. Te vendés como equilibrado y entregás tibieza. Soft power del cringe quieto.',
      '%N, pack %PAIS: ofensa en diferido, aporte en cuarentena.',
      '%N de %PAIS: el misterio de la seriedad ya no vende. Sos el mute con bufanda.',
      'Prefijo %PAIS, %N. Embajador del empate. Credenciales en alargue eterno.',
      '%N, en %PAIS el ego encuentra mesura. Acá encuentra el contador y va perdiendo.',
      'Clásico %PAIS, %N: no perder el estilo y perder el rastro.',
      '%N hace de %PAIS el chiste del mapa en voz baja. Igual se oye.'
    ],
  },
  PR: {
    name: 'Puerto Rico',
    lines: [
      '%N, de %PAIS: qué flow… para terminar siendo reguetón de ego sin drop de aporte. Sos la pista del drama: todos escuchan el bajo, nadie baila tu utilidad. El grupo pidió skip.',
      'Hay chispa en %N: la de %PAIS en modo show. Pack de actitud alta y constancia a medias. Si la autoestima se midiera en views, serías tendencia; en hechos, intro saltado.',
      '%N exporta de %PAIS la costumbre de ir de estrella en chat de barrio. Sos el feat que nadie pidió. El ranking no da credits.',
      'De %PAIS, %N. Te creés el puente y aportás peaje. Sos colonia de ego: dependés del aplauso. La dignidad pidió soberanía de rastro.',
      '%N, pack %PAIS: mucho swagger, poco manifiesto de carga. Sos el videoclip sin canción.',
      '%N de %PAIS: confundes ser intenso con ser indispensable. La intensidad sin rastro es solo eco.',
      'Prefijo %PAIS, %N. Exportás farándula verbal. El archivo no está en premiere.',
      '%N, en %PAIS habrá talento; vos estás en el intro. Nadie llega al estribillo de tu aporte.',
      'Clásico %PAIS, %N: ambientar para no cargar. Se nota el hueco bajo el beat.',
      '%N hace de %PAIS un tutorial de flow sin sustancia. No cotiza.',
      '%N, de %PAIS: el falso cumplido —qué isla— se ahoga solo. Sos resort de ego. Checkout obligado.',
      'Hay actitud en %N: de escenario. Pack %PAIS de show y poco ensayo útil.',
      '%N exporta de %PAIS el “tú no sabe” con sonrisa de clip. El ranking sí sabe.',
      'De %PAIS, %N. Te vendés como buen vibra y entregás saturación. Soft power del ruido.',
      '%N, pack %PAIS: mucho dembow mental, poco compás de trabajo en el hilo.',
      '%N de %PAIS: el micrófono del chat no te hace artista; te hace karaoke con auto-tune de ego.',
      'Prefijo %PAIS, %N. Embajador del after. Credenciales en resaca de aplauso.',
      '%N, en %PAIS el flow vende. Acá vende el rastro, y el tuyo pide remix de urgencia.',
      'Clásico %PAIS, %N: ganar la pista y perder el hilo.',
      '%N hace de %PAIS el chiste del Caribe con beat. Punchline: vos.'
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

  let countryText = '';
  const geo = countryFromTarget(target, participant);
  if (geo?.iso && COUNTRY_ROAST[geo.iso]) {
    const entry = COUNTRY_ROAST[geo.iso];
    const line = pickFresh(entry.lines, `${jid}|roast|country|${geo.iso}`)
      .replace(/%N/g, tag)
      .replace(/%PAIS/g, entry.name);
    countryText = `\n\n${line}`;
  }

  const text =
    `${pickFresh(HEADERS, `${jid}|roast|hdr`)}\n` +
    `╾━━━━━━━━━━━━━━╼\n\n` +
    `Víctima: ${tag}\n\n` +
    `${activityText}${countryText}\n\n` +
    `╾━━━━━━━━━━━━━━╼\n` +
    `${pickFresh(CLOSERS, `${jid}|roast|end`)}`;

  await sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
}

module.exports = { cmdRoast };
