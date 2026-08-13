'use strict';

const { parsePhoneNumberFromString } = require('libphonenumber-js');
const { getSender, getTarget, isMainOwner, bareJid, sameUser, canonicalJid } = require('../utils/wa');
const { pickFresh, fmt } = require('../utils/helpers');
const { getUserCount } = require('../utils/messageCounter');

// ─── Cabeceras / cierres ──────────────────────────────────────────────────────

const HEADERS = [
  '*ROAST SIN ANESTESIA*',
  '*EJECUCIÓN PÚBLICA*',
  '*AUTOPSIA EN DIRECTO*',
  '*DESTRUCCIÓN TOTAL DEL EGO*.',
  '*ENTIERRO ABIERTO*',
  '*MASACRE DOCUMENTADA*',
  '*ASADO HASTA EL HUESO*',
  '*DEMOLICIÓN CONTROLADA*',
  '*VOLADURA PSICOLÓGICA*',
  '*SENTENCIA SIN APELACIÓN*.',
  '*DESMONTAJE EN DIRECTO*',
  '*VEREDICTO DEL CHAT*',
  '*HUMILLACIÓN TÉCNICA*',
  '*QUEMA CONTROLADA DEL EGO*.',
  '*AJUSTE DE CUENTAS*',
  '*EXPOSICIÓN TOTAL*',
  '*GOLPE DE GRACIA*',
  '*TUMBA DEL EGO*',
  '*ARCHIVO DEL FAIL*',
  '*LECTURA EN VOZ ALTA*',
];

const CLOSERS = [
  '_El bot firmó. Tú puedes alegar; los números no._',
  '_Archivo cerrado. El contador y el chat firmaron el mismo veredicto._',
  '_No hay modo avión que te salve el frame. Lo visto queda._',
  '_Fin del informe. El ego puede recoger los restos cuando quiera._',
  '_Siguiente. Este ya quedó catalogado._',
  '_Firma del grupo: leído, procesado, archivado._',
  '_Sin apelación. El hilo ya tiene copia._',
  '_Punto final. Menos pose, más realidad._',
  '_El mirror no miente y el bot tampoco._',
  '_Queda registrado. Siguiente víctima._',
];

const OWNER_ROAST = [
  '%N, el creído de mierda que se cree por encima de todo el grupo. Y lo que más jode es que las veces que abres la boca sueles tener razón. Baja de la nube, prepotente.',
  'Mira el señor perfecto, %N. Ese aire de que nada se te escapa y de que el resto te debe algo. Un arrogante de manual al que no hay por dónde rebatirle. Insufrible.',
  '%N, hijo de puta con suerte, al que todo le sale redondo sin despeinarse mientras los demás sudan. Y encima con esa cara de superioridad.',
  'El típico prepotente, %N: hablas poco para que parezca que lo tuyo vale oro, y el grupo pica. Manipulador con complejo de líder. Bájale.',
  '%N, ego del tamaño de un edificio y la desfachatez de respaldarlo casi siempre. Da una rabia tremenda que un creído como tú acierte tanto.',
];

// ─── Actividad ────────────────────────────────────────────────────────────────
// Baja = fantasma / parásito / cero valor. Alta = alabanza por sostener el chat.

function getActivityPhrases(count) {
  const c = fmt(count);

  if (count <= 0) {
    return [
      `Cero mensajes, %N. Estás en un grupo de conversación sin haber conversado nunca. Inutilidad con pose de misterio: el ego lo vende como selectividad y el grupo lo lee como nada, patético.`,
      `%N, ${c} en el contador. No aportas, no empujas, no existes. Ocupas un hueco que podría usar alguien que sí escribe, miserable.`,
      `Registro en cero, %N. Eres mobiliario con número de teléfono: estás, ocupas sitio y no dejas una sola marca útil, qué cringe.`,
      `%N lleva ${c} mensajes. Fantasma certificado. Lees el drama ajeno y no pones ni el peaje de una línea, da asco.`,
      `Ni un mensaje, %N. El grupo funciona igual sin ti y eso debería dolerte más que cualquier insulto, qué vergüenza.`,
      `%N, contador en ${c}. Parásito de hilo: consumes contexto y no devuelves nada. El ranking de útiles no te conoce, ridículo.`,
      `Cero aporte, %N. Tu presencia es una notificación vacía. El chat no te extraña porque nunca llegaste a estar, fracasado.`,
      `%N con ${c} mensajes. Estar silenciado por decisión propia no te hace interesante: te hace prescindible, qué miseria.`,
      `El contador dice ${c}, %N. Fantasma de lujo: online para mirar, offline para aportar, da grima.`,
      `%N, ${c}. No eres discreto. Eres ausencia con foto de perfil, basura.`,
    ];
  }

  if (count < 20) {
    return [
      `${c} mensajes, %N. Casi no existes. El grupo ya aprendió a no esperarte: es la forma educada de borrarte, patético.`,
      `%N con solo ${c} en el marcador. Entraste a mirar, no a sumar. Parásito de bajo consumo, miserable.`,
      `${c} mensajes y ya se te acabó el material, %N. O nunca lo hubo. Fantasma con intentos de relleno, qué cringe.`,
      `%N, ${c} textos. Insuficiente para tener voz y sobrado para molestar cuando hablas. El peor tramo, da asco.`,
      `Con ${c} mensajes no construyes reputación: construyes olvido, %N, qué vergüenza.`,
      `%N lleva ${c}. El contador te delata como invitado que no paga la ronda del hilo, ridículo.`,
      `${c} mensajes, %N. Ni fantasma total ni miembro útil: eres el residuo del medio, fracasado.`,
      `%N, ${c} en total. Si el grupo cobrara alquiler por espacio emocional, estarías desalojado, qué miseria.`,
      `Apenas ${c} mensajes, %N. Tu autoestima no puede apoyarse en un historial tan flaco, da grima.`,
      `%N con ${c}: presencia decorativa. El chat no se cae si te vas y eso es el veredicto, basura.`,
    ];
  }

  if (count < 60) {
    return [
      `${c} mensajes, %N. Apareces lo justo para no te borren y desapareces lo justo para no aportar. Cálculo de parásito, patético.`,
      `%N con ${c}. Ni racha ni compromiso: actividad de quien teme quedar en evidencia y también teme esforzarse, miserable.`,
      `${c} en el contador, %N. Suficiente para opinar, insuficiente para sostener. El grupo ya hizo la resta, qué cringe.`,
      `%N, ${c} mensajes. Estás en el limbo de los que no molestan del todo y no sirven del todo, da asco.`,
      `Con ${c} textos no eres motor: eres ruido intermitente, %N, qué vergüenza.`,
      `%N lleva ${c}. El ego habla más alto que el contador, y el contador es el que manda aquí, ridículo.`,
      `${c} mensajes, %N. Historial de alguien que prueba el agua y nunca se tira, fracasado.`,
      `%N, ${c}. Ni fantasma puro ni pilar: relleno humano con wifi, qué miseria.`,
      `A ${c} mensajes, %N, todavía no demostraste que el grupo gane algo con tenerte, da grima.`,
      `%N con ${c}: actividad tibia. La tibieza es el enemigo del respeto en este chat, basura.`,
    ];
  }

  if (count < 150) {
    return [
      `${c} mensajes, %N. Estás en el mapa, pero no mandas en él. Cumples el mínimo para no ser fantasma y el máximo para no ser referente, patético.`,
      `%N con ${c}. Se te ve el esfuerzo a medias: suficiente para defenderte, poco para que el grupo te deba algo, miserable.`,
      `${c} en el contador, %N. Ya no eres invisible; todavía no eres indispensable, qué cringe.`,
      `%N, ${c} mensajes. Hay rastro. También hay techo bajo. El ego debería leer el número antes de inflarse, da asco.`,
      `Con ${c} textos perteneces al chat, %N, pero el chat no depende de ti. Esa diferencia importa, qué vergüenza.`,
      `%N lleva ${c}. Actividad de clase media: ni vergüenza total ni medalla, ridículo.`,
      `${c} mensajes, %N. El archivo te conoce; no te respeta del todo, fracasado.`,
      `%N, ${c}. Puedes mejorar o puedes estancarte en ser ruido educado, qué miseria.`,
      `A ${c}, %N, todavía hay margen para dejar de ser prescindible, da grima.`,
      `%N con ${c}: estás a mitad de camino entre el fantasma y el que tira del carro, basura.`,
    ];
  }

  // Alto: incentivo a seguir activo
  return [
    `${c} mensajes, %N. Eso no es suerte: es constancia. El grupo se nota cuando faltan los que escriben de verdad, y tú estás en esa lista.`,
    `%N con ${c} en el contador. Sostienes hilo, no solo lo miras. Ese peso se respeta aquí.`,
    `${c} mensajes, %N. Actividad de quien no abandona el barco. El ranking te debe sitio por trabajo, no por pose.`,
    `%N, ${c}. Motor silencioso del chat: sin gente así el grupo se vuelve museo, y tú no dejaste que pase.`,
    `Con ${c} textos, %N, ya no eres relleno. Eres parte del esqueleto del hilo. Sigue así.`,
    `%N lleva ${c}. Farmear presencia con sustancia es justo lo que este grupo necesita más.`,
    `${c} mensajes, %N. El contador te respalda cuando alguien intente borrarte del mapa. Bien ganado.`,
    `%N, ${c}. De los que empujan la conversación en vez de vivir del drama ajeno. Se nota y se agradece.`,
    `A ${c} mensajes, %N, el grupo ya sabe que existes de verdad. Eso vale más que cualquier pose de misterio.`,
    `%N con ${c}: actividad alta, rastro claro. El chat gana cuando gente como tú no se apaga.`,
  ];
}

// ─── País (LatAm) ─────────────────────────────────────────────────────────────
// Solo si hay número resoluble. Humor negro de estereotipo, unisex.

const COUNTRY_ROAST = {
  AR: {
    name: 'Argentina',
    lines: [
      '%N, de %PAIS: soberbia de exportación y resultados de saldo. El ego te quedó de selección; el aporte, de amistoso, patético.',
      'Prefijo de %PAIS y manual del que corrige a todos sin que se lo pidan, %N. Acá nadie te votó profesor, miserable.',
      '%N representa a %PAIS en el chat: mucha opinión, poca prueba, y esa costumbre de mirar al resto como provincia, qué cringe.',
      'De %PAIS, %N. El estereotipo de prepotente encontró casa en tu teclado y ni disimula, da asco.',
      '%N, pack %PAIS: palabras largas, ideas cortas y ofensa fácil cuando te tocan el pedestal, qué vergüenza.',
      'Número argentino, %N. Exportás cuento de superioridad a un grupo que ya te midió, ridículo.',
      '%N de %PAIS: te creés el estándar del continente y no llegás al estándar del hilo, fracasado.',
      'Clásico %PAIS, %N: el monólogo eterno para no escuchar el dato que te incomoda, qué miseria.',
      '%N, en %PAIS habrá cracks; vos saliste en el lote del que explica todo y no mueve nada, da grima.',
      'Prefijo %PAIS, %N. Soberbia gratis, humildad de pago. Acá se nota el saldo en rojo, basura.',
      '%N, de %PAIS y del club de “en realidad es así”. Spoiler: no, y el chat ya lo sabe, qué cutre.',
      'Embajador no pedido de %PAIS, %N: llegaste a dar clase y te terminaron tomando asistencia, da pena ajena.',
      '%N hace de %PAIS un tutorial de ego hinchado. El continente no te pidió el favor, indignante.',
      'Código %PAIS, %N: queja olímpica, ejecución escolar. El ranking no se impresiona con el acento, qué flojo.',
      'De %PAIS para el grupo, %N: soberbia de manual y aporte de libreta borrada, menudo desastre.',
      '%N, el prefijo te delata y el contenido te condena. Pack completo %PAIS, qué pena.',
      'Argentino de teclado, %N: más energía en quedar por encima que en quedar bien, da vergüenza.',
      '%N de %PAIS: si el chat cobrara arancel por prepotencia, serías top contributor, qué vergüenza ajena.',
      'Estereotipo %PAIS en HD, %N. No hace falta inventar nada: vos trajiste el material, patético.',
      '%N, %PAIS en el número y el vacío en la síntesis. El verso se te acabó al segundo mensaje, miserable.',
      'De %PAIS, %N. Te creés ilegible y sos predecible: soberbia, corrección ajena, cero entrega, qué cringe.',
      '%N, exportás de %PAIS la costumbre de ofenderte con estilo. El estilo no tapa el hueco, da asco.',
      'Prefijo argentino y ego de potencia, %N. En este ranking tu potencia es de reserva, qué vergüenza.',
      '%N de %PAIS: el “ustedes no entienden” como personalidad. Acá entendimos de sobra, ridículo.',
      'Clásico combo %PAIS, %N: autoestima de estrella y rendimiento de suplente, fracasado.',
      '%N, en %PAIS el ego es deporte nacional. Acá te descalifican por fair play nulo, qué miseria.',
      'Número de %PAIS, %N. Más teatro de superioridad que historial de utilidad, da grima.',
      '%N representa el lado de %PAIS que preferimos muteado: ruido de cátedra sin cátedra, basura.',
      'De %PAIS, %N. Si bajás un cambio, capaz el grupo te aguanta. Con este software, no, qué cutre.',
      '%N, pack final %PAIS: soberbia, cuento y el mismo final de siempre cuando piden pruebas, da pena ajena.',
      'Argentino en el chat, %N: llegaste a enseñar y te dejaron en recuperación, indignante.',
      '%N de %PAIS: el monólogo no te hace profundo; te hace cansino con acento, qué flojo.',
      'Prefijo %PAIS y talento para mirar feo al hilo, %N. El hilo no te debe respeto automático, menudo desastre.',
      '%N, %PAIS te dio el prefijo; el ridículo te lo laburaste vos, qué pena.',
      'De %PAIS para acá, %N: menos verso porteño y más sustancia, o seguís siendo meme, da vergüenza.',
      '%N, estereotipo %PAIS con wifi. El grupo ya te tenía fichado antes del roast, qué vergüenza ajena.',
      'Código argentino, %N: corregís ortografía ajena con la vida propia en borrador, patético.',
      '%N de %PAIS: soberbia de building y cimientos de cartón, miserable.',
      'El chat no es tu provincia, %N. %PAIS no te habilitó jurisdicción acá, qué cringe.',
      '%N, de %PAIS y de pelear por la última palabra inútil. La última palabra la tiene el contador, da asco.',
      'Prefijo %PAIS, %N. Exportación de prepotencia detectada. Devolución al remitente, qué vergüenza.',
      '%N hace equipo con el cliché de %PAIS y todavía se ofende. Eso es el chiste, ridículo.',
      'Argentino de grupo, %N: más ranking imaginario que ranking real, fracasado.',
      '%N, %PAIS en el SIM y el cuento en la boca. El archivo no compra cuentos, qué miseria.',
      'De %PAIS, %N. Te vendiste como nivel alto y entregaste ruido con postureo, da grima.',
      '%N, el pedestal %PAIS se te resbala en este piso. Cuidado al bajar, basura.',
      'Clásico %PAIS en modo chat, %N: explicar de más para no asumir de más, qué cutre.',
      '%N de %PAIS: si el ego pagara impuestos, estarías auditado, da pena ajena.',
      'Prefijo argentino, %N. El bot solo leyó el código y ya sospechaba el tono, indignante.',
      '%N, veredicto %PAIS: soberbia alta, utilidad en duda, respeto en cero, qué flojo.',
    ],
  },
  CO: {
    name: 'Colombia',
    lines: [
      '%N, de %PAIS: labia de sobra y respaldo de menos. Te creés táctico y salís predecible, patético.',
      'Prefijo de %PAIS y software de “todo se acomoda”. Acá no se acomodó, %N, miserable.',
      '%N representa a %PAIS en el chat: verso fino, entrega floja y sonrisa de negocio vacío, qué cringe.',
      'De %PAIS, %N. El estereotipo de vivo encontró teclado y se le olvidó ser competente, da asco.',
      '%N, pack %PAIS: cuento bien contado y resultado que no aparece, qué vergüenza.',
      'Número colombiano, %N. Exportás viveza barata a un grupo que ya no compra humo, ridículo.',
      '%N de %PAIS: confundes ser pillo con ser útil. Spoiler: no sos ninguna de las dos acá, fracasado.',
      'Clásico %PAIS, %N: malicia para el chisme, torpeza para el aporte, qué miseria.',
      '%N, en %PAIS habrá gente brillante; vos estás en el feed de los que venden humo premium, da grima.',
      'Prefijo %PAIS, %N. Labia de comercial, sustancia de flyer, basura.',
      '%N, de %PAIS y del club de “tranquilo que se resuelve”. Nunca se resuelve, qué cutre.',
      'Embajador del verso, %N. %PAIS no te pidió representarlos así, da pena ajena.',
      '%N hace de %PAIS un tutorial de confianza sin evidencia, indignante.',
      'Código %PAIS, %N: sonrisa de que la sabés todas y historial que dice lo contrario, qué flojo.',
      'De %PAIS para el grupo, %N: más cuento que café, menudo desastre.',
      '%N, el prefijo te delata y el humo te condena. Pack %PAIS completo, qué pena.',
      'Colombiano de teclado, %N: más energía en parecer vivo que en serlo, da vergüenza.',
      '%N de %PAIS: si el chat cobrara por verso, serías VIP, qué vergüenza ajena.',
      'Estereotipo %PAIS en HD, %N. Material propio, sin necesidad de inventar, patético.',
      '%N, %PAIS en el número y el vacío en la promesa, miserable.',
      'De %PAIS, %N. Te creés ilegible y sos un manual de labia barata, qué cringe.',
      '%N, exportás de %PAIS ofensa elegante y trabajo nulo, da asco.',
      'Prefijo colombiano y ego de vivo, %N. Acá el vivo cansa, qué vergüenza.',
      '%N de %PAIS: el “ya veo” eterno como estrategia. Estrategia de no hacer, ridículo.',
      'Clásico combo %PAIS, %N: confianza alta, evidencia baja, fracasado.',
      '%N, en %PAIS el vivo vive del bobo. Acá el vivo queda expuesto, qué miseria.',
      'Número de %PAIS, %N. Más teatro de viveza que historial de entrega, da grima.',
      '%N representa el lado de %PAIS que preferimos en silencio, basura.',
      'De %PAIS, %N. Bajá el cuento o seguí siendo el meme del prefijo, qué cutre.',
      '%N, pack final %PAIS: labia, humo y el mismo final cuando piden hechos, da pena ajena.',
      'Colombiano en el chat, %N: llegaste a acomodar y te acomodaron el roast, indignante.',
      '%N de %PAIS: el verso no te hace táctico; te hace predecible, qué flojo.',
      'Prefijo %PAIS y talento para vender humo, %N. El archivo no fuma, menudo desastre.',
      '%N, %PAIS te dio el prefijo; el ridículo lo armaste vos, qué pena.',
      'De %PAIS para acá, %N: menos cuento y más sustancia, da vergüenza.',
      '%N, estereotipo %PAIS con wifi. Fichaje automático, qué vergüenza ajena.',
      'Código colombiano, %N: negociás todo excepto tu propia mejora, patético.',
      '%N de %PAIS: viveza de eslogan y quiebra de resultado, miserable.',
      'El chat no es tu plaza, %N. %PAIS no te dio permiso de humo acá, qué cringe.',
      '%N, de %PAIS y de pelear por quedar bien sin estar bien, da asco.',
      'Prefijo %PAIS, %N. Exportación de verso detectada, qué vergüenza.',
      '%N hace equipo con el cliché de %PAIS y se ofende. El chiste sos vos, ridículo.',
      'Colombiano de grupo, %N: más ranking imaginario que trabajo real, fracasado.',
      '%N, %PAIS en el SIM y el cuento en la boca, qué miseria.',
      'De %PAIS, %N. Te vendiste como vivo y entregaste ruido, da grima.',
      '%N, el pedestal de viveza se te resbala acá, basura.',
      'Clásico %PAIS en modo chat, %N: explicar de más para no entregar de más, qué cutre.',
      '%N de %PAIS: si el humo pagara impuestos, auditado, da pena ajena.',
      'Prefijo colombiano, %N. El bot leyó el código y ya olía el verso, indignante.',
      '%N, veredicto %PAIS: labia alta, utilidad en duda, respeto en baja, qué flojo.',
    ],
  },
  MX: {
    name: 'México',
    lines: [
      '%N, de %PAIS: mucho ruido, poca sustancia y cero vergüenza ajena. El volumen no te hace tener razón, patético.',
      'Prefijo de %PAIS y ego de tianguis digital, %N. Acá no se grita para ganar, miserable.',
      '%N representa a %PAIS en el chat: drama fácil, criterio difícil, qué cringe.',
      'De %PAIS, %N. El estereotipo de gritar como argumento te quedó de uniforme, da asco.',
      '%N, pack %PAIS: prepotencia de más y resultados de menos, qué vergüenza.',
      'Número mexicano, %N. Exportás cringe con confianza absurda, ridículo.',
      '%N de %PAIS: te creés el centro y aportás el caos, fracasado.',
      'Clásico %PAIS, %N: ofenderte por todo y aportar nada, qué miseria.',
      '%N, en %PAIS habrá cracks; vos saliste en el lote del relleno ruidoso, da grima.',
      'Prefijo %PAIS, %N. Software de drama instalado de fábrica, basura.',
      '%N, de %PAIS y del club de “a mí nadie me dice nada”. El grupo sí te lo dice, qué cutre.',
      'Embajador del ruido, %N. %PAIS no te pidió este show, da pena ajena.',
      '%N hace de %PAIS un tutorial de volumen sin contenido, indignante.',
      'Código %PAIS, %N: mucho “no manches” mental y cero ejecución, qué flojo.',
      'De %PAIS para el grupo, %N: exportás caos y lo llamás personalidad, menudo desastre.',
      '%N, el prefijo te delata y el grito te condena, qué pena.',
      'Mexicano de teclado, %N: más energía en montar show que en sostener hilo, da vergüenza.',
      '%N de %PAIS: si el chat cobrara por drama, serías top, qué vergüenza ajena.',
      'Estereotipo %PAIS en HD, %N. Material propio, patético.',
      '%N, %PAIS en el número y el vacío en el argumento, miserable.',
      'De %PAIS, %N. Te creés intenso y sos cansino, qué cringe.',
      '%N, exportás de %PAIS ofensa rápida y criterio lento, da asco.',
      'Prefijo mexicano y ego de telenovela, %N, qué vergüenza.',
      '%N de %PAIS: el show eterno como personalidad, ridículo.',
      'Clásico combo %PAIS, %N: orgullo alto, autoexamen bajo, fracasado.',
      '%N, en %PAIS el ruido a veces es cultura. Acá es falta de filtro, qué miseria.',
      'Número de %PAIS, %N. Más teatro que historial, da grima.',
      '%N representa el lado de %PAIS que preferimos en modo avión, basura.',
      'De %PAIS, %N. Bajá el volumen o seguí siendo meme, qué cutre.',
      '%N, pack final %PAIS: ruido, drama y poco más, da pena ajena.',
      'Mexicano en el chat, %N: llegaste a armar fiesta y te armaron el roast, indignante.',
      '%N de %PAIS: el grito no te hace líder; te hace alarma, qué flojo.',
      'Prefijo %PAIS y talento para saturar, %N, menudo desastre.',
      '%N, %PAIS te dio el prefijo; el ridículo lo pusiste vos, qué pena.',
      'De %PAIS para acá, %N: menos show y más sustancia, da vergüenza.',
      '%N, estereotipo %PAIS con wifi, qué vergüenza ajena.',
      'Código mexicano, %N: ofensa fácil, mejora difícil, patético.',
      '%N de %PAIS: etiqueta grande, contenido chico, miserable.',
      'El chat no es tu plaza, %N. %PAIS no habilita gritar acá, qué cringe.',
      '%N, de %PAIS y de convertir todo en escena, da asco.',
      'Prefijo %PAIS, %N. Exportación de drama detectada, qué vergüenza.',
      '%N hace equipo con el cliché de %PAIS y se ofende, ridículo.',
      'Mexicano de grupo, %N: más ruido que ranking real, fracasado.',
      '%N, %PAIS en el SIM y el show en la boca, qué miseria.',
      'De %PAIS, %N. Te vendiste como presencia y entregaste saturación, da grima.',
      '%N, el pedestal de drama se te resbala acá, basura.',
      'Clásico %PAIS en modo chat, %N: alargar conflicto porque el silencio te da miedo, qué cutre.',
      '%N de %PAIS: si el drama pagara impuestos, auditado, da pena ajena.',
      'Prefijo mexicano, %N. El bot leyó el código y ya escuchó el ruido, indignante.',
      '%N, veredicto %PAIS: volumen alto, utilidad en duda, respeto en baja, qué flojo.',
    ],
  },
  VE: {
    name: 'Venezuela',
    lines: [
      '%N, de %PAIS: queja crónica con teclado de agresor. Todo es culpa del entorno menos cuando hay que mirarse, patético.',
      'Prefijo de %PAIS y software de agravio permanente, %N. El grupo no es tu gobierno, miserable.',
      '%N representa a %PAIS en el chat: narrativa de víctima y cero de solución, qué cringe.',
      'De %PAIS, %N. El estereotipo de reclamo eterno te quedó de chaleco, da asco.',
      '%N, pack %PAIS: volumen de denuncia y nulo de autocrítica, qué vergüenza.',
      'Número venezolano, %N. Exportás drama de escasez emocional a un chat que no te debe empatía infinita, ridículo.',
      '%N de %PAIS: confundes resistencia con tener razón siempre, fracasado.',
      'Clásico %PAIS, %N: pelear por todo y construir poco, qué miseria.',
      '%N, en %PAIS hay gente que se supera; vos te superás en discurso, da grima.',
      'Prefijo %PAIS, %N. Noticiero de quejas sin cierre, basura.',
      '%N, de %PAIS y del club de “tú no sabes lo que es sufrir”. Acá sobra el discurso, qué cutre.',
      'Embajador del reclamo, %N. %PAIS no te pidió este show, da pena ajena.',
      '%N hace de %PAIS un tutorial de ofensa colectiva sin responsabilidad individual, indignante.',
      'Código %PAIS, %N: orgullo herido y ego que no baja, qué flojo.',
      'De %PAIS para el grupo, %N: más agravio que propuesta, menudo desastre.',
      '%N, el prefijo te delata y el reclamo te condena, qué pena.',
      'Venezolano de teclado, %N: más energía en señalar que en ejecutar, da vergüenza.',
      '%N de %PAIS: si el chat cobrara por queja, serías contribuyente oro, qué vergüenza ajena.',
      'Estereotipo %PAIS en HD, %N, patético.',
      '%N, %PAIS en el número y el vacío en la propuesta, miserable.',
      'De %PAIS, %N. Te creés faro moral y sos saturación, qué cringe.',
      '%N, exportás de %PAIS ofensa colectiva y responsabilidad nula, da asco.',
      'Prefijo venezolano y ego de agraviado vitalicio, %N, qué vergüenza.',
      '%N de %PAIS: el “nadie entiende” como personalidad, ridículo.',
      'Clásico combo %PAIS, %N: narrativa alta, entrega baja, fracasado.',
      '%N, en %PAIS la voz importa; acá la tuya satura, qué miseria.',
      'Número de %PAIS, %N. Más teatro de crisis que plan, da grima.',
      '%N representa el lado de %PAIS que preferimos en resumen, basura.',
      'De %PAIS, %N. Bajá el reclamo o seguí siendo el noticiero del grupo, qué cutre.',
      '%N, pack final %PAIS: queja, drama y poco cierre, da pena ajena.',
      'Venezolano en el chat, %N: llegaste a denunciar y te denunció el contador, indignante.',
      '%N de %PAIS: el reclamo no te hace lucido; te hace predecible, qué flojo.',
      'Prefijo %PAIS y talento para alargar el agravio, %N, menudo desastre.',
      '%N, %PAIS te dio el prefijo; el ridículo lo sostuviste vos, qué pena.',
      'De %PAIS para acá, %N: menos victimismo y más sustancia, da vergüenza.',
      '%N, estereotipo %PAIS con wifi, qué vergüenza ajena.',
      'Código venezolano, %N: ofensa fácil, autocrítica imposible, patético.',
      '%N de %PAIS: urgencia de ser oído y escasez de qué decir útil, miserable.',
      'El chat no es tu asamblea, %N. %PAIS no te dio el atril, qué cringe.',
      '%N, de %PAIS y de convertir todo en agravio, da asco.',
      'Prefijo %PAIS, %N. Exportación de drama detectada, qué vergüenza.',
      '%N hace equipo con el cliché de %PAIS y se ofende, ridículo.',
      'Venezolano de grupo, %N: más relato que ranking real, fracasado.',
      '%N, %PAIS en el SIM y el reclamo en la boca, qué miseria.',
      'De %PAIS, %N. Te vendiste como resistencia y entregaste saturación, da grima.',
      '%N, el pedestal de agravio se te resbala acá, basura.',
      'Clásico %PAIS en modo chat, %N: no soltar el micrófono del drama, qué cutre.',
      '%N de %PAIS: si la queja pagara impuestos, auditado, da pena ajena.',
      'Prefijo venezolano, %N. El bot leyó el código y ya escuchó el reclamo, indignante.',
      '%N, veredicto %PAIS: drama alto, utilidad en duda, respeto en baja, qué flojo.',
    ],
  },
  PE: {
    name: 'Perú',
    lines: [
      '%N, de %PAIS: te hacés el humilde y juzgás en silencio como tribunal. Sin autoridad, patético.',
      'Prefijo de %PAIS y ofensa en diferido, %N. El mohín no es personalidad, miserable.',
      '%N representa a %PAIS en el chat: seriedad de fachada y aporte intermitente, qué cringe.',
      'De %PAIS, %N. El estereotipo agrio te quedó de uniforme, da asco.',
      '%N, pack %PAIS: formalismo de más y entrega de menos, qué vergüenza.',
      'Número peruano, %N. Exportás resentimiento bien peinado, ridículo.',
      '%N de %PAIS: confundes ser reservado con ser interesante, fracasado.',
      'Clásico %PAIS, %N: silencio estratégico que en realidad es vacío, qué miseria.',
      '%N, en %PAIS hay nivel; vos mirás desde el borde con cara de juicio, da grima.',
      'Prefijo %PAIS, %N. Tribunal sin toga, basura.',
      '%N, de %PAIS y del club de ofenderse bajito. Se te oye igual, qué cutre.',
      'Embajador del mohín, %N. %PAIS no te pidió el cargo, da pena ajena.',
      '%N hace de %PAIS un seminario de ofensa pasiva, indignante.',
      'Código %PAIS, %N: orgullo herido fácil, trabajo difícil, qué flojo.',
      'De %PAIS para el grupo, %N: más juicio que propuesta, menudo desastre.',
      '%N, el prefijo te delata y el mohín te condena, qué pena.',
      'Peruano de teclado, %N: más energía en mirar feo que en escribir útil, da vergüenza.',
      '%N de %PAIS: si el chat cobrara por juicio silencioso, serías VIP, qué vergüenza ajena.',
      'Estereotipo %PAIS en HD, %N, patético.',
      '%N, %PAIS en el número y el vacío en la propuesta, miserable.',
      'De %PAIS, %N. Te creés profundo y sos agrio, qué cringe.',
      '%N, exportás de %PAIS ofensa fría y cero calor de aporte, da asco.',
      'Prefijo peruano y ego de no necesitar a nadie hasta que necesitás, %N, qué vergüenza.',
      '%N de %PAIS: el “ya pues” sin sustancia como estilo, ridículo.',
      'Clásico combo %PAIS, %N: compostura de foto y caos de contenido, fracasado.',
      '%N, en %PAIS la dignidad importa; acá la tuya cotiza bajo, qué miseria.',
      'Número de %PAIS, %N. Más teatro de seriedad que historial, da grima.',
      '%N representa el lado de %PAIS que preferimos sin notificaciones, basura.',
      'De %PAIS, %N. Bajá el juicio o seguí siendo el mohín del hilo, qué cutre.',
      '%N, pack final %PAIS: agrio, silencioso y poco útil, da pena ajena.',
      'Peruano en el chat, %N: llegaste a juzgar y te juzgó el contador, indignante.',
      '%N de %PAIS: el silencio no te hace interesante; te hace flojo, qué flojo.',
      'Prefijo %PAIS y talento para criticar sin proponer, %N, menudo desastre.',
      '%N, %PAIS te dio el prefijo; el ridículo lo afirmaste vos, qué pena.',
      'De %PAIS para acá, %N: menos mohín y más sustancia, da vergüenza.',
      '%N, estereotipo %PAIS con wifi, qué vergüenza ajena.',
      'Código peruano, %N: ofensa pasiva, mejora pasiva también, patético.',
      '%N de %PAIS: pose de misterio y nivel de tutorial, miserable.',
      'El chat no es tu juzgado, %N. %PAIS no te dio toga, qué cringe.',
      '%N, de %PAIS y de guardar resentimiento para nunca usarlo bien, da asco.',
      'Prefijo %PAIS, %N. Exportación de agrio detectada, qué vergüenza.',
      '%N hace equipo con el cliché de %PAIS y se ofende, ridículo.',
      'Peruano de grupo, %N: más juicio que ranking real, fracasado.',
      '%N, %PAIS en el SIM y el mohín en la cara, qué miseria.',
      'De %PAIS, %N. Te vendiste como sobrio y entregaste vacío, da grima.',
      '%N, el pedestal de seriedad se te resbala acá, basura.',
      'Clásico %PAIS en modo chat, %N: mirar feo en vez de aportar, qué cutre.',
      '%N de %PAIS: si el mohín pagara impuestos, auditado, da pena ajena.',
      'Prefijo peruano, %N. El bot leyó el código y ya sintió el juicio, indignante.',
      '%N, veredicto %PAIS: agrio alto, utilidad en duda, respeto en baja, qué flojo.',
    ],
  },
  BR: {
    name: 'Brasil',
    lines: [
      '%N, de %PAIS: fiesta en la cabeza y criterio en huelga. El show no tapa el vacío, patético.',
      'Prefijo de %PAIS y ego de desfile, %N. Acá no hay pasarela, miserable.',
      '%N representa a %PAIS en el chat: ruido alegre para no decir nada, qué cringe.',
      'De %PAIS, %N. El estereotipo de farra eterna te quedó de uniforme, da asco.',
      '%N, pack %PAIS: sonrisa grande, aporte pequeño, qué vergüenza.',
      'Número brasileño, %N. Exportás caipirinha de mediocridad, ridículo.',
      '%N de %PAIS: te creés el show y el show es malo, fracasado.',
      'Clásico %PAIS, %N: carnaval permanente en un chat que a ratos quiere ser serio, qué miseria.',
      '%N, en %PAIS hay elite; vos estás en el relleno del relleno, da grima.',
      'Prefijo %PAIS, %N. After forever, sustancia nunca, basura.',
      '%N, de %PAIS y del club de ser querido por ser ruidoso. Acá sos tolerado, qué cutre.',
      'Embajador del after, %N. %PAIS no te pidió el cargo, da pena ajena.',
      '%N hace de %PAIS un tutorial de gracia sin gracia, indignante.',
      'Código %PAIS, %N: fútbol en la boca, cero en el hilo, qué flojo.',
      'De %PAIS para el grupo, %N: fiesta verbal, resaca de utilidad, menudo desastre.',
      '%N, el prefijo te delata y el after te condena, qué pena.',
      'Brasileño de teclado, %N: más energía en ambientar que en aportar, da vergüenza.',
      '%N de %PAIS: si el chat cobrara por ruido alegre, serías top, qué vergüenza ajena.',
      'Estereotipo %PAIS en HD, %N, patético.',
      '%N, %PAIS en el número y el vacío en el párrafo, miserable.',
      'De %PAIS, %N. Te creés carisma y sos saturación con ritmo, qué cringe.',
      '%N, exportás de %PAIS ofensa suave y trabajo nulo, da asco.',
      'Prefijo brasileño y ego de estrella, %N, qué vergüenza.',
      '%N de %PAIS: el ritmo eterno como personalidad, ridículo.',
      'Clásico combo %PAIS, %N: orgullo de selección y rendimiento de amistoso, fracasado.',
      '%N, en %PAIS ser extrovertido vende; acá sin contenido no cotiza, qué miseria.',
      'Número de %PAIS, %N. Más teatro de farra que historial, da grima.',
      '%N representa el lado de %PAIS que preferimos en modo avión, basura.',
      'De %PAIS, %N. Bajá la farra o seguí siendo meme tropical, qué cutre.',
      '%N, pack final %PAIS: fiesta, pose y poco más, da pena ajena.',
      'Brasileño en el chat, %N: llegaste a ambientar y te ambientaron el roast, indignante.',
      '%N de %PAIS: el show no te hace indispensable; te hace ruido, qué flojo.',
      'Prefijo %PAIS y talento para no tomarse el feedback, %N, menudo desastre.',
      '%N, %PAIS te dio el prefijo; el ridículo lo bailaste vos, qué pena.',
      'De %PAIS para acá, %N: menos after y más sustancia, da vergüenza.',
      '%N, estereotipo %PAIS con wifi, qué vergüenza ajena.',
      'Código brasileño, %N: gracia fácil, mejora difícil, patético.',
      '%N de %PAIS: etiqueta de fiesta, contenido de resaca, miserable.',
      'El chat no es tu camarote, %N. %PAIS no te dio el escenario, qué cringe.',
      '%N, de %PAIS y de convertir todo en farra, da asco.',
      'Prefijo %PAIS, %N. Exportación de ruido alegre detectada, qué vergüenza.',
      '%N hace equipo con el cliché de %PAIS y se ofende, ridículo.',
      'Brasileño de grupo, %N: más fiesta que ranking real, fracasado.',
      '%N, %PAIS en el SIM y el after en la boca, qué miseria.',
      'De %PAIS, %N. Te vendiste como alegría y entregaste vacío con beat, da grima.',
      '%N, el pedestal de farra se te resbala acá, basura.',
      'Clásico %PAIS en modo chat, %N: ambientar para no aportar, qué cutre.',
      '%N de %PAIS: si la farra pagara impuestos, auditado, da pena ajena.',
      'Prefijo brasileño, %N. El bot leyó el código y ya puso la playlist del ridículo, indignante.',
      '%N, veredicto %PAIS: farra alta, utilidad en duda, respeto en baja, qué flojo.',
    ],
  },
  CL: { name: 'Chile', lines: [
    '%N, de %PAIS: frío por fuera y juicio por dentro. Distancia olímpica, aporte tibio, patético.',
    'Prefijo de %PAIS y ego de que el resto es poco serio, %N, miserable.',
    '%N representa a %PAIS con compostura de brochure y vacío de fondo, qué cringe.',
    'De %PAIS, %N. Te creés el adulto de la sala y no sostienes el hilo, da asco.',
    '%N, pack %PAIS: crítica fina, autocrítica nula, qué vergüenza.',
    'Número chileno, %N. Exportás soberbia ordenada, ridículo.',
    '%N de %PAIS: confundes ser ordenado con ser interesante, fracasado.',
    'Clásico %PAIS, %N: estándar alto en la boca, entrega media en el archivo, qué miseria.',
    '%N, en %PAIS hay nivel; vos estás de visita en el cringe, da grima.',
    'Prefijo %PAIS, %N. Superior administrativo sin expediente, basura.',
    '%N, de %PAIS y de mirar en diagonal al resto, qué cutre.',
    'Embajador del frío, %N. %PAIS no te pidió el cargo, da pena ajena.',
    '%N hace de %PAIS un tutorial de distancia inútil, indignante.',
    'Código %PAIS, %N: “aquí se hace bien” sin mostrar el bien, qué flojo.',
    'De %PAIS para el grupo, %N: más juicio que carga, menudo desastre.',
    '%N, el prefijo te delata y el frío te condena, qué pena.',
    'Chileno de teclado, %N: más energía en senalar que en cargar, da vergüenza.',
    '%N de %PAIS: si el chat cobrara por distancia, serías top, qué vergüenza ajena.',
    'Estereotipo %PAIS en HD, %N, patético.',
    '%N, veredicto %PAIS: frío alto, utilidad tibia, respeto en baja, miserable.',
  ]},
  EC: { name: 'Ecuador', lines: [
    '%N, de %PAIS: discreto hasta volverte invisible de utilidad, patético.',
    'Prefijo de %PAIS y drama de baja intensidad constante, %N, miserable.',
    '%N representa a %PAIS con ofensa fácil y propuesta difícil, qué cringe.',
    'De %PAIS, %N. Te hacés la víctima con el teclado, da asco.',
    '%N, pack %PAIS: orgullo local, criterio global flojo, qué vergüenza.',
    'Número ecuatoriano, %N. Exportás queja templada, ridículo.',
    '%N de %PAIS: confundes ser sensible con ser central, fracasado.',
    'Clásico %PAIS, %N: alargar el conflicto porque el silencio te da miedo, qué miseria.',
    '%N, en %PAIS hay gente clara; vos enturbiás, da grima.',
    'Prefijo %PAIS, %N. Boletín de molestias, basura.',
    '%N, de %PAIS y de ofenderte por el clima del hilo, qué cutre.',
    'Embajador de la molestia suave, %N, da pena ajena.',
    '%N hace de %PAIS un tutorial de saturación de poco, indignante.',
    'Código %PAIS, %N: “es que me sacaron” como personalidad, qué flojo.',
    'De %PAIS para el grupo, %N: más agravio que sustancia, menudo desastre.',
    '%N, el prefijo te delata y la queja te condena, qué pena.',
    'Ecuatoriano de teclado, %N: más energía en molestar que en sumar, da vergüenza.',
    '%N de %PAIS: si el chat cobrara por drama chico, serías top, qué vergüenza ajena.',
    'Estereotipo %PAIS en HD, %N, patético.',
    '%N, veredicto %PAIS: queja alta, utilidad baja, respeto en duda, miserable.',
  ]},
};

// Resto LatAm: 20 líneas genéricas fuertes por país
const GEN_LATAM = [
  '%N, de %PAIS: el prefijo te delata y el contenido te hunde. Exportás mediocridad con bandera, patético.',
  'Prefijo de %PAIS y ego de país chico con problemas grandes de criterio, %N, miserable.',
  '%N representa a %PAIS en el chat: ruido local, utilidad global cero, qué cringe.',
  'De %PAIS, %N. El estereotipo no tuvo que esforzarse: trajiste el material vos, da asco.',
  '%N, pack %PAIS: orgullo fácil, aporte difícil, qué vergüenza.',
  'Número de %PAIS, %N. Exportás cringe con acento y sin filtro, ridículo.',
  '%N de %PAIS: te creés especial por el prefijo. El prefijo no mejora el hardware, fracasado.',
  'Clásico %PAIS, %N: ofenderte barato y aportar caro de pedir, qué miseria.',
  '%N, en %PAIS habrá de todo; acá sos el lado flojo del catálogo, da grima.',
  'Prefijo %PAIS, %N. Embajador no pedido del ridículo, basura.',
  '%N, de %PAIS y de saturar sin sumar, qué cutre.',
  'Estereotipo %PAIS personificado, %N, da pena ajena.',
  '%N hace de %PAIS un meme sin gracia, indignante.',
  'Código %PAIS, %N: pose nacional, vergüenza internacional, qué flojo.',
  'De %PAIS para el grupo, %N: el prefijo no te salva, menudo desastre.',
  '%N, %PAIS en el SIM y el vacío en el argumento, qué pena.',
  'De %PAIS, %N. Soft power del ridículo, da vergüenza.',
  '%N, si el chat cobrara arancel por cringe, %PAIS pagaría por vos, qué vergüenza ajena.',
  'Prefijo %PAIS, %N. El bot leyó el código y ya sabía el tono, patético.',
  '%N, veredicto %PAIS: orgullo alto, utilidad en duda, respeto en cero, miserable.',
];

for (const [iso, name] of [
  ['GT', 'Guatemala'], ['CU', 'Cuba'], ['BO', 'Bolivia'], ['DO', 'República Dominicana'],
  ['HN', 'Honduras'], ['PY', 'Paraguay'], ['SV', 'El Salvador'], ['NI', 'Nicaragua'],
  ['CR', 'Costa Rica'], ['PA', 'Panamá'], ['UY', 'Uruguay'], ['PR', 'Puerto Rico'],
]) {
  COUNTRY_ROAST[iso] = { name, lines: GEN_LATAM.slice() };
}

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
  // El @ del texto DEBE coincidir con el JID que va en mentions[], si no WhatsApp no linkea.
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

  // 1) Actividad — siempre con @ del JID real (tag), no displayName suelto
  const activityText = pickFresh(getActivityPhrases(msgCount), `${jid}|roast|act`)
    .replace(/%N/g, tag)
    .replace(/%C/g, fmt(msgCount));

  // 2) País — opcional
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
