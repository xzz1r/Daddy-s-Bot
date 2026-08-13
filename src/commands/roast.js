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
      '%N, de %PAIS: qué nivel de análisis… para terminar corrigiendo al grupo como si fuera tu provincia. Sos la soberbia con prefijo: ego de selección y rendimiento de amistoso. En el ranking cotizás como alarma de prepotencia El grupo ya hizo la resta.',
      'Hay algo admirable en %N: la confianza de %PAIS sin el respaldo del resultado. Sos el tutorial que nadie pidió y todos mutean. Rico en verso; en hechos, en default El archivo no negocia.',
      '%N exporta de %PAIS la costumbre de mirar al resto como “el interior”. Mucho norte en la boca, poco terreno ganado. El chat ya te midió sin tu cátedra El ranking no reparte consuelo.',
      'De %PAIS, %N. El estereotipo no tuvo que trabajar: trajiste el monólogo de fábrica. Himno a volumen máximo en asado ajeno. La dignidad pide auriculares La autoestima que se apoya ahí está mal asegurada.',
      '%N, pack %PAIS: palabras largas, ideas cortas y ofensa fácil. Corrector automático sin permiso de admin. Tu valor propio depende de ganar discusiones; por eso perdés las importantes El chat te tolera; no te debe.',
      '%N de %PAIS: te creés el estándar del continente y no llegás al del hilo. PowerPoint sin botones El grupo ya hizo la resta.',
      'Prefijo %PAIS, %N. Exportás cuento de superioridad a un grupo que ya te auditó. El ego sigue en gira; el público se fue El archivo no negocia.',
      '%N, en %PAIS habrá cracks; vos saliste en el lote del que explica todo y no mueve nada El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: el “ustedes no entienden” como personalidad. Acá entendimos de sobra La autoestima que se apoya ahí está mal asegurada.',
      '%N, soberbia de building y cimientos de cartón. %PAIS te dio el prefijo; el ridículo lo laburaste vos El chat te tolera; no te debe.',
      '%N, de %PAIS: qué nivel de análisis… para terminar corrigiendo al grupo como si fuera tu provincia. Sos la soberbia con prefijo: ego de selección y rendimiento de amistoso. En el ranking cotizás como alarma de prepotencia El grupo ya hizo la resta.',
      'Hay algo admirable en %N: la confianza de %PAIS sin el respaldo del resultado. Sos el tutorial que nadie pidió y todos mutean. Rico en verso; en hechos, en default El archivo no negocia.',
      '%N exporta de %PAIS la costumbre de mirar al resto como “el interior”. Mucho norte en la boca, poco terreno ganado. El chat ya te midió sin tu cátedra El ranking no reparte consuelo.',
      'De %PAIS, %N. El estereotipo no tuvo que trabajar: trajiste el monólogo de fábrica. Himno a volumen máximo en asado ajeno. La dignidad pide auriculares La autoestima que se apoya ahí está mal asegurada.',
      '%N, pack %PAIS: palabras largas, ideas cortas y ofensa fácil. Corrector automático sin permiso de admin. Tu valor propio depende de ganar discusiones; por eso perdés las importantes El chat te tolera; no te debe.',
      '%N de %PAIS: te creés el estándar del continente y no llegás al del hilo. PowerPoint sin botones El grupo ya hizo la resta.',
      'Prefijo %PAIS, %N. Exportás cuento de superioridad a un grupo que ya te auditó. El ego sigue en gira; el público se fue El archivo no negocia.',
      '%N, en %PAIS habrá cracks; vos saliste en el lote del que explica todo y no mueve nada El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: el “ustedes no entienden” como personalidad. Acá entendimos de sobra La autoestima que se apoya ahí está mal asegurada.',
      '%N, soberbia de building y cimientos de cartón. %PAIS te dio el prefijo; el ridículo lo laburaste vos El chat te tolera; no te debe.',
      '%N, de %PAIS: qué nivel de análisis… para terminar corrigiendo al grupo como si fuera tu provincia. Sos la soberbia con prefijo: ego de selección y rendimiento de amistoso. En el ranking cotizás como alarma de prepotencia El grupo ya hizo la resta.',
      'Hay algo admirable en %N: la confianza de %PAIS sin el respaldo del resultado. Sos el tutorial que nadie pidió y todos mutean. Rico en verso; en hechos, en default El archivo no negocia.',
      '%N exporta de %PAIS la costumbre de mirar al resto como “el interior”. Mucho norte en la boca, poco terreno ganado. El chat ya te midió sin tu cátedra El ranking no reparte consuelo.',
      'De %PAIS, %N. El estereotipo no tuvo que trabajar: trajiste el monólogo de fábrica. Himno a volumen máximo en asado ajeno. La dignidad pide auriculares La autoestima que se apoya ahí está mal asegurada.',
      '%N, pack %PAIS: palabras largas, ideas cortas y ofensa fácil. Corrector automático sin permiso de admin. Tu valor propio depende de ganar discusiones; por eso perdés las importantes El chat te tolera; no te debe.',
      '%N de %PAIS: te creés el estándar del continente y no llegás al del hilo. PowerPoint sin botones El grupo ya hizo la resta.',
      'Prefijo %PAIS, %N. Exportás cuento de superioridad a un grupo que ya te auditó. El ego sigue en gira; el público se fue El archivo no negocia.',
      '%N, en %PAIS habrá cracks; vos saliste en el lote del que explica todo y no mueve nada El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: el “ustedes no entienden” como personalidad. Acá entendimos de sobra La autoestima que se apoya ahí está mal asegurada.',
      '%N, soberbia de building y cimientos de cartón. %PAIS te dio el prefijo; el ridículo lo laburaste vos El chat te tolera; no te debe.',
      '%N, de %PAIS: qué nivel de análisis… para terminar corrigiendo al grupo como si fuera tu provincia. Sos la soberbia con prefijo: ego de selección y rendimiento de amistoso. En el ranking cotizás como alarma de prepotencia El grupo ya hizo la resta.',
      'Hay algo admirable en %N: la confianza de %PAIS sin el respaldo del resultado. Sos el tutorial que nadie pidió y todos mutean. Rico en verso; en hechos, en default El archivo no negocia.',
      '%N exporta de %PAIS la costumbre de mirar al resto como “el interior”. Mucho norte en la boca, poco terreno ganado. El chat ya te midió sin tu cátedra El ranking no reparte consuelo.',
      'De %PAIS, %N. El estereotipo no tuvo que trabajar: trajiste el monólogo de fábrica. Himno a volumen máximo en asado ajeno. La dignidad pide auriculares La autoestima que se apoya ahí está mal asegurada.',
      '%N, pack %PAIS: palabras largas, ideas cortas y ofensa fácil. Corrector automático sin permiso de admin. Tu valor propio depende de ganar discusiones; por eso perdés las importantes El chat te tolera; no te debe.',
      '%N de %PAIS: te creés el estándar del continente y no llegás al del hilo. PowerPoint sin botones El grupo ya hizo la resta.',
      'Prefijo %PAIS, %N. Exportás cuento de superioridad a un grupo que ya te auditó. El ego sigue en gira; el público se fue El archivo no negocia.',
      '%N, en %PAIS habrá cracks; vos saliste en el lote del que explica todo y no mueve nada El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: el “ustedes no entienden” como personalidad. Acá entendimos de sobra La autoestima que se apoya ahí está mal asegurada.',
      '%N, soberbia de building y cimientos de cartón. %PAIS te dio el prefijo; el ridículo lo laburaste vos El chat te tolera; no te debe.'
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
      '%N, de %PAIS: qué labia tan fina… para terminar vendiendo humo al por menor. Viveza con WiFi: todo se “acomoda” menos tu historial. El grupo ya no compra; archiva El grupo ya hizo la resta.',
      'Hay talento en %N: sonreír mientras el aporte no aparece. Pack %PAIS de cuento bien contado y entrega que nunca llega. Rico en promesas El archivo no negocia.',
      '%N exporta de %PAIS la confianza de vivo y la constancia de flyer. Comercial de madrugada: el producto no llega El ranking no reparte consuelo.',
      'De %PAIS, %N. Te creés táctico y salís predecible. El “ya veo” eterno como estrategia de no hacer La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y software de “tranquilo que se resuelve”. Nunca se resuelve. Reunión que pudo ser un mensaje… y ni el mensaje sirvió El chat te tolera; no te debe.',
      '%N de %PAIS: confundes ser pillo con ser útil. Acá no sos ninguna de las dos El grupo ya hizo la resta.',
      'Labia de comercial, sustancia de flyer, %N. %PAIS en el SIM y el vacío en la promesa El archivo no negocia.',
      '%N, el vivo vive del bobo. Acá el vivo queda expuesto El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: malicia para el chisme, torpeza para el aporte La autoestima que se apoya ahí está mal asegurada.',
      '%N hace de %PAIS un tutorial de confianza sin evidencia El chat te tolera; no te debe.',
      '%N, de %PAIS: qué labia tan fina… para terminar vendiendo humo al por menor. Viveza con WiFi: todo se “acomoda” menos tu historial. El grupo ya no compra; archiva El grupo ya hizo la resta.',
      'Hay talento en %N: sonreír mientras el aporte no aparece. Pack %PAIS de cuento bien contado y entrega que nunca llega. Rico en promesas El archivo no negocia.',
      '%N exporta de %PAIS la confianza de vivo y la constancia de flyer. Comercial de madrugada: el producto no llega El ranking no reparte consuelo.',
      'De %PAIS, %N. Te creés táctico y salís predecible. El “ya veo” eterno como estrategia de no hacer La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y software de “tranquilo que se resuelve”. Nunca se resuelve. Reunión que pudo ser un mensaje… y ni el mensaje sirvió El chat te tolera; no te debe.',
      '%N de %PAIS: confundes ser pillo con ser útil. Acá no sos ninguna de las dos El grupo ya hizo la resta.',
      'Labia de comercial, sustancia de flyer, %N. %PAIS en el SIM y el vacío en la promesa El archivo no negocia.',
      '%N, el vivo vive del bobo. Acá el vivo queda expuesto El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: malicia para el chisme, torpeza para el aporte La autoestima que se apoya ahí está mal asegurada.',
      '%N hace de %PAIS un tutorial de confianza sin evidencia El chat te tolera; no te debe.',
      '%N, de %PAIS: qué labia tan fina… para terminar vendiendo humo al por menor. Viveza con WiFi: todo se “acomoda” menos tu historial. El grupo ya no compra; archiva El grupo ya hizo la resta.',
      'Hay talento en %N: sonreír mientras el aporte no aparece. Pack %PAIS de cuento bien contado y entrega que nunca llega. Rico en promesas El archivo no negocia.',
      '%N exporta de %PAIS la confianza de vivo y la constancia de flyer. Comercial de madrugada: el producto no llega El ranking no reparte consuelo.',
      'De %PAIS, %N. Te creés táctico y salís predecible. El “ya veo” eterno como estrategia de no hacer La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y software de “tranquilo que se resuelve”. Nunca se resuelve. Reunión que pudo ser un mensaje… y ni el mensaje sirvió El chat te tolera; no te debe.',
      '%N de %PAIS: confundes ser pillo con ser útil. Acá no sos ninguna de las dos El grupo ya hizo la resta.',
      'Labia de comercial, sustancia de flyer, %N. %PAIS en el SIM y el vacío en la promesa El archivo no negocia.',
      '%N, el vivo vive del bobo. Acá el vivo queda expuesto El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: malicia para el chisme, torpeza para el aporte La autoestima que se apoya ahí está mal asegurada.',
      '%N hace de %PAIS un tutorial de confianza sin evidencia El chat te tolera; no te debe.',
      '%N, de %PAIS: qué labia tan fina… para terminar vendiendo humo al por menor. Viveza con WiFi: todo se “acomoda” menos tu historial. El grupo ya no compra; archiva El grupo ya hizo la resta.',
      'Hay talento en %N: sonreír mientras el aporte no aparece. Pack %PAIS de cuento bien contado y entrega que nunca llega. Rico en promesas El archivo no negocia.',
      '%N exporta de %PAIS la confianza de vivo y la constancia de flyer. Comercial de madrugada: el producto no llega El ranking no reparte consuelo.',
      'De %PAIS, %N. Te creés táctico y salís predecible. El “ya veo” eterno como estrategia de no hacer La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y software de “tranquilo que se resuelve”. Nunca se resuelve. Reunión que pudo ser un mensaje… y ni el mensaje sirvió El chat te tolera; no te debe.',
      '%N de %PAIS: confundes ser pillo con ser útil. Acá no sos ninguna de las dos El grupo ya hizo la resta.',
      'Labia de comercial, sustancia de flyer, %N. %PAIS en el SIM y el vacío en la promesa El archivo no negocia.',
      '%N, el vivo vive del bobo. Acá el vivo queda expuesto El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: malicia para el chisme, torpeza para el aporte La autoestima que se apoya ahí está mal asegurada.',
      '%N hace de %PAIS un tutorial de confianza sin evidencia El chat te tolera; no te debe.'
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
      '%N, de %PAIS: qué intensidad… para terminar siendo volumen sin argumento. Drama con teclado: todo escena, nada guion. El grupo te baja el gain El grupo ya hizo la resta.',
      'Hay pasión en %N: gritar como si eso fuera tesis. Pack %PAIS de ruido fácil y criterio difícil. Rico en decibeles; pobre en sustancia El archivo no negocia.',
      '%N exporta de %PAIS el show permanente. Telenovela de un capítulo repetido. Final: saturación El ranking no reparte consuelo.',
      'De %PAIS, %N. Te creés el centro y aportás el caos. Piñata del hilo: todos saben dónde pegar La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de plaza. El volumen no te da la razón; te da audiencia cansada El chat te tolera; no te debe.',
      '%N de %PAIS: mucho “no manches” mental y cero ejecución. Sos alarma, no líder El grupo ya hizo la resta.',
      'Drama fácil, criterio difícil, %N. %PAIS en el número y el vacío en el párrafo El archivo no negocia.',
      '%N convierte todo en escena. El chat no es tu set El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: ofenderte por todo y aportar nada La autoestima que se apoya ahí está mal asegurada.',
      '%N, el show no tapa el hueco. El ranking ya midió el hueco El chat te tolera; no te debe.',
      '%N, de %PAIS: qué intensidad… para terminar siendo volumen sin argumento. Drama con teclado: todo escena, nada guion. El grupo te baja el gain El grupo ya hizo la resta.',
      'Hay pasión en %N: gritar como si eso fuera tesis. Pack %PAIS de ruido fácil y criterio difícil. Rico en decibeles; pobre en sustancia El archivo no negocia.',
      '%N exporta de %PAIS el show permanente. Telenovela de un capítulo repetido. Final: saturación El ranking no reparte consuelo.',
      'De %PAIS, %N. Te creés el centro y aportás el caos. Piñata del hilo: todos saben dónde pegar La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de plaza. El volumen no te da la razón; te da audiencia cansada El chat te tolera; no te debe.',
      '%N de %PAIS: mucho “no manches” mental y cero ejecución. Sos alarma, no líder El grupo ya hizo la resta.',
      'Drama fácil, criterio difícil, %N. %PAIS en el número y el vacío en el párrafo El archivo no negocia.',
      '%N convierte todo en escena. El chat no es tu set El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: ofenderte por todo y aportar nada La autoestima que se apoya ahí está mal asegurada.',
      '%N, el show no tapa el hueco. El ranking ya midió el hueco El chat te tolera; no te debe.',
      '%N, de %PAIS: qué intensidad… para terminar siendo volumen sin argumento. Drama con teclado: todo escena, nada guion. El grupo te baja el gain El grupo ya hizo la resta.',
      'Hay pasión en %N: gritar como si eso fuera tesis. Pack %PAIS de ruido fácil y criterio difícil. Rico en decibeles; pobre en sustancia El archivo no negocia.',
      '%N exporta de %PAIS el show permanente. Telenovela de un capítulo repetido. Final: saturación El ranking no reparte consuelo.',
      'De %PAIS, %N. Te creés el centro y aportás el caos. Piñata del hilo: todos saben dónde pegar La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de plaza. El volumen no te da la razón; te da audiencia cansada El chat te tolera; no te debe.',
      '%N de %PAIS: mucho “no manches” mental y cero ejecución. Sos alarma, no líder El grupo ya hizo la resta.',
      'Drama fácil, criterio difícil, %N. %PAIS en el número y el vacío en el párrafo El archivo no negocia.',
      '%N convierte todo en escena. El chat no es tu set El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: ofenderte por todo y aportar nada La autoestima que se apoya ahí está mal asegurada.',
      '%N, el show no tapa el hueco. El ranking ya midió el hueco El chat te tolera; no te debe.',
      '%N, de %PAIS: qué intensidad… para terminar siendo volumen sin argumento. Drama con teclado: todo escena, nada guion. El grupo te baja el gain El grupo ya hizo la resta.',
      'Hay pasión en %N: gritar como si eso fuera tesis. Pack %PAIS de ruido fácil y criterio difícil. Rico en decibeles; pobre en sustancia El archivo no negocia.',
      '%N exporta de %PAIS el show permanente. Telenovela de un capítulo repetido. Final: saturación El ranking no reparte consuelo.',
      'De %PAIS, %N. Te creés el centro y aportás el caos. Piñata del hilo: todos saben dónde pegar La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de plaza. El volumen no te da la razón; te da audiencia cansada El chat te tolera; no te debe.',
      '%N de %PAIS: mucho “no manches” mental y cero ejecución. Sos alarma, no líder El grupo ya hizo la resta.',
      'Drama fácil, criterio difícil, %N. %PAIS en el número y el vacío en el párrafo El archivo no negocia.',
      '%N convierte todo en escena. El chat no es tu set El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: ofenderte por todo y aportar nada La autoestima que se apoya ahí está mal asegurada.',
      '%N, el show no tapa el hueco. El ranking ya midió el hueco El chat te tolera; no te debe.'
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
      '%N, de %PAIS: qué narrativa tan urgente… para terminar siendo noticiero sin cierre. Agravio con teclado. El grupo no es tu gobierno El grupo ya hizo la resta.',
      'Hay fuerza en %N: reclamar sin proponer. Pack %PAIS de denuncia a volumen alto y autocrítica en cero El archivo no negocia.',
      '%N exporta de %PAIS el “nadie entiende” como personalidad. Himno a la ofensa colectiva. El chat entiende; no aplaude El ranking no reparte consuelo.',
      'De %PAIS, %N. Resistencia en el discurso, ausencia en el plan. Asamblea permanente La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de agraviado vitalicio. El ranking reparte números, no empatía infinita El chat te tolera; no te debe.',
      '%N de %PAIS: convertís todo en agravio. El archivo pide hechos El grupo ya hizo la resta.',
      'Queja crónica, solución nula, %N. %PAIS en el SIM y el reclamo en la boca El archivo no negocia.',
      '%N, el micrófono del drama no te hace lúcido; te hace predecible El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: pelear por todo y construir poco La autoestima que se apoya ahí está mal asegurada.',
      '%N hace de %PAIS un tutorial de ofensa sin responsabilidad El chat te tolera; no te debe.',
      '%N, de %PAIS: qué narrativa tan urgente… para terminar siendo noticiero sin cierre. Agravio con teclado. El grupo no es tu gobierno El grupo ya hizo la resta.',
      'Hay fuerza en %N: reclamar sin proponer. Pack %PAIS de denuncia a volumen alto y autocrítica en cero El archivo no negocia.',
      '%N exporta de %PAIS el “nadie entiende” como personalidad. Himno a la ofensa colectiva. El chat entiende; no aplaude El ranking no reparte consuelo.',
      'De %PAIS, %N. Resistencia en el discurso, ausencia en el plan. Asamblea permanente La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de agraviado vitalicio. El ranking reparte números, no empatía infinita El chat te tolera; no te debe.',
      '%N de %PAIS: convertís todo en agravio. El archivo pide hechos El grupo ya hizo la resta.',
      'Queja crónica, solución nula, %N. %PAIS en el SIM y el reclamo en la boca El archivo no negocia.',
      '%N, el micrófono del drama no te hace lúcido; te hace predecible El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: pelear por todo y construir poco La autoestima que se apoya ahí está mal asegurada.',
      '%N hace de %PAIS un tutorial de ofensa sin responsabilidad El chat te tolera; no te debe.',
      '%N, de %PAIS: qué narrativa tan urgente… para terminar siendo noticiero sin cierre. Agravio con teclado. El grupo no es tu gobierno El grupo ya hizo la resta.',
      'Hay fuerza en %N: reclamar sin proponer. Pack %PAIS de denuncia a volumen alto y autocrítica en cero El archivo no negocia.',
      '%N exporta de %PAIS el “nadie entiende” como personalidad. Himno a la ofensa colectiva. El chat entiende; no aplaude El ranking no reparte consuelo.',
      'De %PAIS, %N. Resistencia en el discurso, ausencia en el plan. Asamblea permanente La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de agraviado vitalicio. El ranking reparte números, no empatía infinita El chat te tolera; no te debe.',
      '%N de %PAIS: convertís todo en agravio. El archivo pide hechos El grupo ya hizo la resta.',
      'Queja crónica, solución nula, %N. %PAIS en el SIM y el reclamo en la boca El archivo no negocia.',
      '%N, el micrófono del drama no te hace lúcido; te hace predecible El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: pelear por todo y construir poco La autoestima que se apoya ahí está mal asegurada.',
      '%N hace de %PAIS un tutorial de ofensa sin responsabilidad El chat te tolera; no te debe.',
      '%N, de %PAIS: qué narrativa tan urgente… para terminar siendo noticiero sin cierre. Agravio con teclado. El grupo no es tu gobierno El grupo ya hizo la resta.',
      'Hay fuerza en %N: reclamar sin proponer. Pack %PAIS de denuncia a volumen alto y autocrítica en cero El archivo no negocia.',
      '%N exporta de %PAIS el “nadie entiende” como personalidad. Himno a la ofensa colectiva. El chat entiende; no aplaude El ranking no reparte consuelo.',
      'De %PAIS, %N. Resistencia en el discurso, ausencia en el plan. Asamblea permanente La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de agraviado vitalicio. El ranking reparte números, no empatía infinita El chat te tolera; no te debe.',
      '%N de %PAIS: convertís todo en agravio. El archivo pide hechos El grupo ya hizo la resta.',
      'Queja crónica, solución nula, %N. %PAIS en el SIM y el reclamo en la boca El archivo no negocia.',
      '%N, el micrófono del drama no te hace lúcido; te hace predecible El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: pelear por todo y construir poco La autoestima que se apoya ahí está mal asegurada.',
      '%N hace de %PAIS un tutorial de ofensa sin responsabilidad El chat te tolera; no te debe.'
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
      '%N, de %PAIS: qué compostura… para terminar siendo tribunal sin toga. Mohín profesional. El grupo no te pidió sentencia El grupo ya hizo la resta.',
      'Hay seriedad en %N: de brochure. Pack %PAIS de formalismo alto y entrega intermitente El archivo no negocia.',
      '%N exporta de %PAIS la ofensa en diferido. Resentimiento bien peinado. Preferimos el no con fecha El ranking no reparte consuelo.',
      'De %PAIS, %N. Te hacés el humilde y medís a todos con regla ajena. Juez sin expediente La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de “ya pues” sin sustancia. El ranking cotiza carga, no agrio El chat te tolera; no te debe.',
      '%N de %PAIS: silencio estratégico que en realidad es vacío. Se te oye igual El grupo ya hizo la resta.',
      'Agrio bien vestido, %N. %PAIS en el número y el juicio en la cara El archivo no negocia.',
      '%N, el misterio no te hace interesante; te hace flojo de entrega El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: criticar sin proponer La autoestima que se apoya ahí está mal asegurada.',
      '%N hace de %PAIS un seminario de ofensa pasiva El chat te tolera; no te debe.',
      '%N, de %PAIS: qué compostura… para terminar siendo tribunal sin toga. Mohín profesional. El grupo no te pidió sentencia El grupo ya hizo la resta.',
      'Hay seriedad en %N: de brochure. Pack %PAIS de formalismo alto y entrega intermitente El archivo no negocia.',
      '%N exporta de %PAIS la ofensa en diferido. Resentimiento bien peinado. Preferimos el no con fecha El ranking no reparte consuelo.',
      'De %PAIS, %N. Te hacés el humilde y medís a todos con regla ajena. Juez sin expediente La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de “ya pues” sin sustancia. El ranking cotiza carga, no agrio El chat te tolera; no te debe.',
      '%N de %PAIS: silencio estratégico que en realidad es vacío. Se te oye igual El grupo ya hizo la resta.',
      'Agrio bien vestido, %N. %PAIS en el número y el juicio en la cara El archivo no negocia.',
      '%N, el misterio no te hace interesante; te hace flojo de entrega El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: criticar sin proponer La autoestima que se apoya ahí está mal asegurada.',
      '%N hace de %PAIS un seminario de ofensa pasiva El chat te tolera; no te debe.',
      '%N, de %PAIS: qué compostura… para terminar siendo tribunal sin toga. Mohín profesional. El grupo no te pidió sentencia El grupo ya hizo la resta.',
      'Hay seriedad en %N: de brochure. Pack %PAIS de formalismo alto y entrega intermitente El archivo no negocia.',
      '%N exporta de %PAIS la ofensa en diferido. Resentimiento bien peinado. Preferimos el no con fecha El ranking no reparte consuelo.',
      'De %PAIS, %N. Te hacés el humilde y medís a todos con regla ajena. Juez sin expediente La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de “ya pues” sin sustancia. El ranking cotiza carga, no agrio El chat te tolera; no te debe.',
      '%N de %PAIS: silencio estratégico que en realidad es vacío. Se te oye igual El grupo ya hizo la resta.',
      'Agrio bien vestido, %N. %PAIS en el número y el juicio en la cara El archivo no negocia.',
      '%N, el misterio no te hace interesante; te hace flojo de entrega El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: criticar sin proponer La autoestima que se apoya ahí está mal asegurada.',
      '%N hace de %PAIS un seminario de ofensa pasiva El chat te tolera; no te debe.',
      '%N, de %PAIS: qué compostura… para terminar siendo tribunal sin toga. Mohín profesional. El grupo no te pidió sentencia El grupo ya hizo la resta.',
      'Hay seriedad en %N: de brochure. Pack %PAIS de formalismo alto y entrega intermitente El archivo no negocia.',
      '%N exporta de %PAIS la ofensa en diferido. Resentimiento bien peinado. Preferimos el no con fecha El ranking no reparte consuelo.',
      'De %PAIS, %N. Te hacés el humilde y medís a todos con regla ajena. Juez sin expediente La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de “ya pues” sin sustancia. El ranking cotiza carga, no agrio El chat te tolera; no te debe.',
      '%N de %PAIS: silencio estratégico que en realidad es vacío. Se te oye igual El grupo ya hizo la resta.',
      'Agrio bien vestido, %N. %PAIS en el número y el juicio en la cara El archivo no negocia.',
      '%N, el misterio no te hace interesante; te hace flojo de entrega El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: criticar sin proponer La autoestima que se apoya ahí está mal asegurada.',
      '%N hace de %PAIS un seminario de ofensa pasiva El chat te tolera; no te debe.'
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
      '%N, de %PAIS: qué alegría tan ruidosa… para terminar siendo after sin sustancia. Farra con teclado. El grupo no es tu camarote El grupo ya hizo la resta.',
      'Hay carisma en %N: de playlist. Pack %PAIS de sonrisa grande y aporte chico. Hit en ritmo; intro saltado en resultados El archivo no negocia.',
      '%N exporta de %PAIS el show tropical. Carnaval de un solo flotante: vos. El chat bajó el volumen El ranking no reparte consuelo.',
      'De %PAIS, %N. Te creés el desfile y el desfile es malo. Resaca con beat La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de estrella en chat de barrio. El ranking no es pasarela El chat te tolera; no te debe.',
      '%N de %PAIS: fútbol en la boca, cero en el hilo. Fuera de juego El grupo ya hizo la resta.',
      'Fiesta verbal, utilidad en resaca, %N. %PAIS en el SIM y el after en la cabeza El archivo no negocia.',
      '%N, el ritmo no te hace indispensable; te hace ruido alegre El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: ambientar para no aportar La autoestima que se apoya ahí está mal asegurada.',
      '%N hace de %PAIS un tutorial de gracia sin gracia El chat te tolera; no te debe.',
      '%N, de %PAIS: qué alegría tan ruidosa… para terminar siendo after sin sustancia. Farra con teclado. El grupo no es tu camarote El grupo ya hizo la resta.',
      'Hay carisma en %N: de playlist. Pack %PAIS de sonrisa grande y aporte chico. Hit en ritmo; intro saltado en resultados El archivo no negocia.',
      '%N exporta de %PAIS el show tropical. Carnaval de un solo flotante: vos. El chat bajó el volumen El ranking no reparte consuelo.',
      'De %PAIS, %N. Te creés el desfile y el desfile es malo. Resaca con beat La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de estrella en chat de barrio. El ranking no es pasarela El chat te tolera; no te debe.',
      '%N de %PAIS: fútbol en la boca, cero en el hilo. Fuera de juego El grupo ya hizo la resta.',
      'Fiesta verbal, utilidad en resaca, %N. %PAIS en el SIM y el after en la cabeza El archivo no negocia.',
      '%N, el ritmo no te hace indispensable; te hace ruido alegre El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: ambientar para no aportar La autoestima que se apoya ahí está mal asegurada.',
      '%N hace de %PAIS un tutorial de gracia sin gracia El chat te tolera; no te debe.',
      '%N, de %PAIS: qué alegría tan ruidosa… para terminar siendo after sin sustancia. Farra con teclado. El grupo no es tu camarote El grupo ya hizo la resta.',
      'Hay carisma en %N: de playlist. Pack %PAIS de sonrisa grande y aporte chico. Hit en ritmo; intro saltado en resultados El archivo no negocia.',
      '%N exporta de %PAIS el show tropical. Carnaval de un solo flotante: vos. El chat bajó el volumen El ranking no reparte consuelo.',
      'De %PAIS, %N. Te creés el desfile y el desfile es malo. Resaca con beat La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de estrella en chat de barrio. El ranking no es pasarela El chat te tolera; no te debe.',
      '%N de %PAIS: fútbol en la boca, cero en el hilo. Fuera de juego El grupo ya hizo la resta.',
      'Fiesta verbal, utilidad en resaca, %N. %PAIS en el SIM y el after en la cabeza El archivo no negocia.',
      '%N, el ritmo no te hace indispensable; te hace ruido alegre El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: ambientar para no aportar La autoestima que se apoya ahí está mal asegurada.',
      '%N hace de %PAIS un tutorial de gracia sin gracia El chat te tolera; no te debe.',
      '%N, de %PAIS: qué alegría tan ruidosa… para terminar siendo after sin sustancia. Farra con teclado. El grupo no es tu camarote El grupo ya hizo la resta.',
      'Hay carisma en %N: de playlist. Pack %PAIS de sonrisa grande y aporte chico. Hit en ritmo; intro saltado en resultados El archivo no negocia.',
      '%N exporta de %PAIS el show tropical. Carnaval de un solo flotante: vos. El chat bajó el volumen El ranking no reparte consuelo.',
      'De %PAIS, %N. Te creés el desfile y el desfile es malo. Resaca con beat La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de estrella en chat de barrio. El ranking no es pasarela El chat te tolera; no te debe.',
      '%N de %PAIS: fútbol en la boca, cero en el hilo. Fuera de juego El grupo ya hizo la resta.',
      'Fiesta verbal, utilidad en resaca, %N. %PAIS en el SIM y el after en la cabeza El archivo no negocia.',
      '%N, el ritmo no te hace indispensable; te hace ruido alegre El ranking no reparte consuelo.',
      'Clásico %PAIS, %N: ambientar para no aportar La autoestima que se apoya ahí está mal asegurada.',
      '%N hace de %PAIS un tutorial de gracia sin gracia El chat te tolera; no te debe.'
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
      '%N, de %PAIS: qué orden… para terminar mirando al resto por encima del hombro. Frío administrativo. El grupo no es tu sucursal El grupo ya hizo la resta.',
      'Hay estándar en %N: en la boca. Pack %PAIS de crítica fina y autocrítica nula El archivo no negocia.',
      '%N exporta de %PAIS la soberbia ordenada. Adulto de la sala que no sostiene el hilo El ranking no reparte consuelo.',
      'De %PAIS, %N. “Acá se hace bien” sin mostrar el bien. Superioridad sin expediente La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de checklist. El ranking no premia el mohín técnico El chat te tolera; no te debe.',
      '%N, de %PAIS: qué orden… para terminar mirando al resto por encima del hombro. Frío administrativo. El grupo no es tu sucursal El grupo ya hizo la resta.',
      'Hay estándar en %N: en la boca. Pack %PAIS de crítica fina y autocrítica nula El archivo no negocia.',
      '%N exporta de %PAIS la soberbia ordenada. Adulto de la sala que no sostiene el hilo El ranking no reparte consuelo.',
      'De %PAIS, %N. “Acá se hace bien” sin mostrar el bien. Superioridad sin expediente La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de checklist. El ranking no premia el mohín técnico El chat te tolera; no te debe.',
      '%N, de %PAIS: qué orden… para terminar mirando al resto por encima del hombro. Frío administrativo. El grupo no es tu sucursal El grupo ya hizo la resta.',
      'Hay estándar en %N: en la boca. Pack %PAIS de crítica fina y autocrítica nula El archivo no negocia.',
      '%N exporta de %PAIS la soberbia ordenada. Adulto de la sala que no sostiene el hilo El ranking no reparte consuelo.',
      'De %PAIS, %N. “Acá se hace bien” sin mostrar el bien. Superioridad sin expediente La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de checklist. El ranking no premia el mohín técnico El chat te tolera; no te debe.'
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
      '%N, de %PAIS: qué discreción… para terminar invisible de utilidad. Molestia suave. El grupo no te debe el clima emocional El grupo ya hizo la resta.',
      'Hay sensibilidad en %N: selectiva. Pack %PAIS de ofensa fácil y propuesta difícil El archivo no negocia.',
      '%N exporta de %PAIS la queja templada. Boletín de molestias. Preferimos el dato seco El ranking no reparte consuelo.',
      'De %PAIS, %N. Víctima con el teclado y verdugo con el silencio La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de agravio chico. El ranking no cotiza drama en cuotas El chat te tolera; no te debe.',
      '%N, de %PAIS: qué discreción… para terminar invisible de utilidad. Molestia suave. El grupo no te debe el clima emocional El grupo ya hizo la resta.',
      'Hay sensibilidad en %N: selectiva. Pack %PAIS de ofensa fácil y propuesta difícil El archivo no negocia.',
      '%N exporta de %PAIS la queja templada. Boletín de molestias. Preferimos el dato seco El ranking no reparte consuelo.',
      'De %PAIS, %N. Víctima con el teclado y verdugo con el silencio La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de agravio chico. El ranking no cotiza drama en cuotas El chat te tolera; no te debe.',
      '%N, de %PAIS: qué discreción… para terminar invisible de utilidad. Molestia suave. El grupo no te debe el clima emocional El grupo ya hizo la resta.',
      'Hay sensibilidad en %N: selectiva. Pack %PAIS de ofensa fácil y propuesta difícil El archivo no negocia.',
      '%N exporta de %PAIS la queja templada. Boletín de molestias. Preferimos el dato seco El ranking no reparte consuelo.',
      'De %PAIS, %N. Víctima con el teclado y verdugo con el silencio La autoestima que se apoya ahí está mal asegurada.',
      '%N, prefijo %PAIS y ego de agravio chico. El ranking no cotiza drama en cuotas El chat te tolera; no te debe.'
    ],
  },
  GT: {
    name: 'Guatemala',
    lines: [
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.',
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.'
    ],
  },
  CU: {
    name: 'Cuba',
    lines: [
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.',
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.'
    ],
  },
  BO: {
    name: 'Bolivia',
    lines: [
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.',
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.'
    ],
  },
  DO: {
    name: 'República Dominicana',
    lines: [
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.',
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.'
    ],
  },
  HN: {
    name: 'Honduras',
    lines: [
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.',
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.'
    ],
  },
  PY: {
    name: 'Paraguay',
    lines: [
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.',
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.'
    ],
  },
  SV: {
    name: 'El Salvador',
    lines: [
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.',
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.'
    ],
  },
  NI: {
    name: 'Nicaragua',
    lines: [
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.',
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.'
    ],
  },
  CR: {
    name: 'Costa Rica',
    lines: [
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.',
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.'
    ],
  },
  PA: {
    name: 'Panamá',
    lines: [
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.',
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.'
    ],
  },
  UY: {
    name: 'Uruguay',
    lines: [
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.',
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.'
    ],
  },
  PR: {
    name: 'Puerto Rico',
    lines: [
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.',
      '%N, de %PAIS: qué orgullo de prefijo… para terminar exportando mediocridad con bandera. Soft power del cringe.',
      'Hay identidad en %N: la del código de país. Pack %PAIS de ruido local y utilidad global cero.',
      '%N exporta de %PAIS el estereotipo sin esfuerzo. Manual que nadie pidió.',
      'De %PAIS, %N. El prefijo te delata y el contenido te hunde. Devolución al remitente.',
      '%N, pack %PAIS: orgullo fácil, aporte difícil. Himno a volumen máximo en asado ajeno.',
      '%N de %PAIS: te creés especial por el número. El número no mejora el hardware.',
      'Prefijo %PAIS, %N. Embajador no pedido del ridículo.',
      '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo.',
      'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir.',
      '%N hace de %PAIS un meme sin gracia. El cierre se escribe solo.'
    ],
  }
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
