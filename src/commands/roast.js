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
  '_Y todavía te crees alguien en este chat._',,
  '_El grupo ya eligió: eres el chiste, no el que lo cuenta._',,
  '_Guarda el orgullo. No te queda para otra ronda._',,
  '_Si la dignidad cobrara alquiler, estarías en la calle._',,
  '_Siguiente. Este ya no tiene arreglo ni apelación._',,
  '_El espejo también se ríe, y no es de complicidad._',,
  '_No hay filtro, bio ni pose que tape este historial._',,
  '_Tu autoestima acaba de pedir la baja voluntaria._',,
  '_Archivado en la carpeta de los que sobran con wifi._',,
  '_Y lo peor: se te nota que te duele y aun así no cambias._',,
  '_El contador firmó. Tú solo puedes alegar en silencio._',,
  '_Cuando el ego se te baje, el grupo ya habrá pasado de página._',
];

const OWNER_ROAST = [
  '%N, el dueño intocable: todo le sale y encima tiene cara de que el resto existe de favor. Eres el jefe que nadie eligió y todos aguantan. El día que el ego se te caiga, el chat festeja en silencio.',
  '%N camina como si el WiFi saliera de su culo. Tiene razón demasiadas veces y por eso da asco. Baja un cambio antes de que te conviertan en sticker de advertencia.',
  '%N, hijo de puta con suerte: gana, manda y todavía se ofende. Tutorial que nadie pidió. No te odian por poderoso; te odian porque eres insufrible con pruebas.'
];

const ACT_0 = [
  '%N: cero mensajes. No eres selectivo, eres un parásito con foto de perfil. Lees el grupo como quien mira por la ventana sin pagar el alquiler, y todavía te crees parte del mobiliario importante.',,
  '%N en 0. El chat funciona mejor sin ti y no es metáfora: es el historial. Fantasma de lujo, autoestima de desván, utilidad de cero absoluto.',,
  '%N, contador en cero. Consumes drama ajeno sin poner una línea. Eres público gratis en obra que no te pidió; el ranking de útiles nunca anotó tu nombre.',,
  'Cero mensajes, %N. Tu valor aquí es el de un sticker apagado: ocupa espacio, no aporta, y alguien debería haberlo borrado hace meses.',,
  '%N no escribe. No es misterio ni estrategia: es mediocridad con WiFi. El grupo aprendió a construir sin tu turno y el hueco no duele a nadie más que a tu ego.',,
  '%N, 0 en el marcador. Online para fisgonear, offline para existir. Parásito de bajo consumo: el peor tipo, porque ni siquiera da asco productivo.',,
  '%N con la lista y sin la voz. Estar en el grupo sin hablar no te hace interesante: te hace sobrante con avatar. La autoestima que se esconde ahí ya está muerta.',,
  '%N, cero rastro útil. El archivo te tiene de decoración. Si el respeto se cobrara por mensaje, deberías deudas desde el día uno.',
];

const ACT_LOW = [
  '%N con %C mensajes: ruido de fondo. Suficiente para molestar, insuficiente para importar. Eres la pestaña que nadie cierra del todo y nadie extraña cuando se cuelga.',,
  '%C mensajes de %N. Apareces lo justo para recordar que existes y desapareces para que el olvido sea cómodo. Diseño de irrelevante con teclado a medias.',,
  '%N, %C en el marcador. Ni fantasma limpio ni gente útil: el limbo de los que sobran y no se van. El grupo te administra como un zumbido.',,
  '%C textos, %N. Pruebas el agua con el pie y nunca te tiras. Cobarde de teclado con ego de quien ya nadó la olimpiada.',,
  '%N lleva %C. Historial de intermitencia: molestas, te vas, vuelves sin haber cargado nada. Autoestima de suscripción que nadie renueva.',,
  '%N con solo %C. Casi no existes y aun así el orgullo pide platea. El chat te tiene en “tal vez después”; el después no llega.',,
  '%C mensajes, %N. Parásito de raciones chicas: estás, miras, no cargas. Insuficiente para voz, sobrado para espacio emocional que nadie te cedió.',,
  '%N, %C. Construyes olvido con precisión. Existir en la lista no es existir en el hilo; tu valor propio aún no se enteró.',
];

const ACT_MID = [
  '%N con %C mensajes: tibio profesional. Opinión de relleno, ego de protagonista. Nadie pelea por ti en el ranking y eso debería bastarte para callarte la soberbia.',,
  '%C en el contador de %N. Cumples el mínimo para abrir el hocico y el máximo para no cargar nada. Copiloto que toca el volante cuando el camino ya está derecho.',,
  '%N, %C. Estás en el mapa a lápiz. Existir no es importar, y tú vendiste las dos cosas como si fueran talento. El grupo te lee en diagonal.',,
  '%C mensajes: %N es el café tibio del chat. Nadie lo tira, nadie lo pide. Autoestima de producto en oferta permanente.',,
  '%N lleva %C. Serie cancelable a mitad de temporada. Ruido, pose, cero peso: el patrón ya está quemado.',,
  '%N con %C. Suficiente para defenderte, poco para que alguien te deba algo. El ego cotiza como outlier; los datos te bajan a promedio flojo.',,
  '%C textos, %N. Zona gris del hilo. Eres el “meh” con wifi: el ranking no pelea por los meh y tú sigues hablando como referencia.',,
  '%N, %C. Racha de tibieza disfrazada de presencia. El contador le hace una seña a tu autoestima: sigue buscando de qué vivir.',
];

const ACT_HI = [
  '%N con %C mensajes: ya no eres invisible, todavía no eres indispensable. Empleado del mes en una oficina sin mes. El grupo te reconoce; no te debe la vida.',,
  '%C en el contador, %N. Hay rastro y hay techo de yeso. Aportas lo justo para no borrarte y poco para que alguien te defienda cuando el roast llega.',,
  '%N, %C. El ego se te hinchó antes que el mérito. Borrador con firma. El “en proceso” del respeto ya venció y no te renovaron.',,
  '%C mensajes: %N pertenece al chat; el chat no depende de ti. Cable de más en la caja: útil en teoría, olvidable en la práctica.',,
  '%N lleva %C. Clase media del hilo con discurso de primera fila. El desajuste entre lo que crees valer y lo que pesas se lee sin lupa.',,
  '%N con %C. Motor a media marcha. Llegas cuando el trabajo pesado ya empezó y aun así el orgullo pide medalla de apertura.',,
  '%C textos, %N. Dejaste de ser fantasma y todavía no eres columna. Puente a mitad de río: no cruces con el ego tan inflado.',,
  '%N, %C. El mapa te tiene; el podio no. Presencia estable sin ser estructura. La autoestima que se apoya solo en “estar” está mal asegurada.',
];

const ACT_TOP = [
  '%N con %C mensajes. Se nota: empujas el hilo. No lo conviertas en soberbia de dueño. El contador es cuota de trabajo, no aureola de intocable.',,
  '%C en el marcador de %N. Motor, no decoración. Si el ego se te sube, el próximo roast cobra con intereses y el archivo tiene de dónde agarrarse.',,
  '%N, %C. Respeto farmeado a base de escribir. No lo gastes en teatro: cuanto más alto el número, más rico el asado cuando alguien decide servirte.',,
  'Con %C textos, %N ya es esqueleto del hilo. La autoestima también se oxida si solo se mira el contador y se olvida que el grupo no te debe sumisión.',,
  '%N lleva %C. Actividad real. Prepárate: a este nivel el golpe duele más porque el archivo te respaldaba y aun así el orgullo se te desborda.',,
  '%C mensajes, %N. Constancia que pesa. El respeto está ganado; la soberbia, en observación. Un paso en falso y el roast usa tu propio historial como arma.',,
  '%N con %C. Columna, no adorno. No arruines el crédito con pose de intocable: aquí nadie es santo por escribir mucho.',,
  '%N, %C en el marcador. De los que sostienen cuando el hilo se cae. Eso es poder y responsabilidad; si lo gastas en teatro barato, el grupo te lo cobra doble.',
];

const DEST_GEN = [
  'Y encima el ego hinchado sin base. Te miras como protagonista y el archivo te tiene de extra de tercera. Autoestima de prestado que el contador ya embargó.',,
  'Y el valor propio cotizando en promesas que nadie firmó. El grupo hizo la resta: sobras con wifi y discurso de alguien imprescindible.',,
  'Y todavía negocias respeto que no farmeaste. El espejo y el contador coinciden en el veredicto: no hay mucho que salvar bajo esa pose.',,
  'Y la pose de persona importante sin el historial que lo respalde. Ridículo de manual: el orgullo grita, el rastro susurra, el grupo ya eligió cuál escuchar.',,
  'Y el orgullo gastando de más con ingresos de nada. Déficit crónico de mérito. El cobrador de este mensaje no acepta excusas ni plazos.',,
  'Y te duele más la exposición que la mediocridad que la provocó. Eso también te define: prioritarias la imagen, nunca el aporte.',,
  'Y sigues creyendo que el silencio del grupo es respeto. No lo es: es indiferencia educada. La autoestima confunde las dos y se pudre sola.',,
  'Y el ranking no te odia. Peor: te administra como un problema menor. Ser irrelevante duele más que ser odiado, y aún no lo procesas.',
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
      'Clásico %PAIS: el “ustedes no entienden” como personalidad. Acá se entendió de sobra. Monólogo de fábrica, himno a volumen de asado ajeno. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS exportas la costumbre de mirar al resto como “el interior”. Mucho norte en la boca, poco terreno ganado. %N, el chat te midió sin tu cátedra.',
      '%N, sello %PAIS: confianza sin resultado, tutorial que nadie pidió. Rico en verso, en hechos en default. El ego sigue de gira; el público ya se fue.',
      'PowerPoint sin botones con soberbia de presentación. %PAIS te dio el prefijo; el ridículo lo trabajaste tú, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'En %PAIS el ego es deporte de tertulia. Acá te descalifican por fair play nulo. %N explica todo y no mueve nada. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N llega tarde y corrige la hora. Si la autoestima fuera horario, llegarías tarde a tu propio valor cada vez que abres el teclado. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: imperio de sobremesa. El grupo firmó la independencia de tu monólogo. Tu orgullo todavía discute el acta, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS sin filtro: soberbia de building, cimientos de cartón. El ranking no discute en metáforas. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
    ],
  },
  CO: {
    name: 'Colombia',
    lines: [
      'Y de %PAIS, %N: labia de vivo y sustancia de flyer. Todo se “acomoda” menos tu historial de mierda. El grupo ya no compra humo; te archiva. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS, %N: sonrisa de comercial, entrega que nunca llega. Rico en promesas, pobre en huevos. El ranking no fuma tu cuento. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Clásico %PAIS: malicia para el chisme, torpeza para el aporte. Te crees táctico y sales predecible. %N, el vivo acá queda expuesto. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS llegaste con el software de “tranquilo que se resuelve”. Nunca se resuelve. Reunión que pudo ser un mensaje y ni el mensaje sirvió, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, sello %PAIS: confundes ser pillo con ser útil. Acá no eres ninguna de las dos. El chat lo huele y tu autoestima sigue negociando el precio del ridículo.',
      'Exportas de %PAIS la costumbre de vender humo al por menor. Comercial de madrugada: el producto no llega y el anuncio sigue. Basura con acento. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%PAIS en el SIM, el vacío en el rastro. %N vive a crédito de potencial con interés de cuento. El cobrador es el contador. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N hace de la viveza un tutorial sin evidencia. Deal de ego, checkout del grupo. Scrollearon de largo sobre tu orgullo. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: mucho “ya casi”, poco “ya está”. %N sonríe el trato y no firma la entrega. El archivo cotiza hechos, no labia. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS sin esfuerzo: confiado, hablador, hueco. El ranking no hace de cómplice del vivo. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
    ],
  },
  MX: {
    name: 'México',
    lines: [
      'Y de %PAIS, %N: volumen sin argumento. Drama con teclado, todo escena, nada guion. El grupo te baja el gain y tu autoestima sigue a todo lo que da.',
      'Pack %PAIS: ruido fácil, criterio difícil. Gritas como si fuera tesis. Rico en decibeles, pobre en sustancia. El valor propio no se mide en plazas, %N.',
      'Clásico %PAIS: ofenderte por todo y aportar nada. Piñata del hilo. Todos saben dónde pegar; el dulce es poco y el ego no lo acepta. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS llegaste con el show permanente. Telenovela de un capítulo repetido. Final: saturación. %N, el público ya pidió la cuenta. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, sello %PAIS: mucho “no manches” mental y cero ejecución. Alarma, no líder. El chat silenció la sirena. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Exportas de %PAIS la costumbre de montar drama para no montar trabajo. Se nota el hueco detrás del telón, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%PAIS en el SIM, el vacío en el párrafo. %N convierte todo en escena. El chat no es tu set: apaga reflectores y aporta o cállate. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N hace del grito una personalidad. El archivo no llora. El ranking midió el hueco y lo dejó en actas. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: farándula de ego. Checkout del público. Saturación con wifi, poco guion, menos huevos, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS: intensidad de plaza, utilidad de cero. El micrófono del drama no te hace protagonista; te hace alarma de vecindario. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
    ],
  },
  VE: {
    name: 'Venezuela',
    lines: [
      'Y de %PAIS, %N: noticiero sin cierre. Agravio con teclado. El grupo no es tu gobierno ni tu canal de denuncia eterna. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: denuncia a volumen alto, autocrítica en cero. Rico en queja, pobre en plan. El valor propio vive de titulares, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Clásico %PAIS: el “nadie entiende” como personalidad. Himno a la ofensa colectiva. El chat entiende; por eso no aplaude. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS llegaste con asamblea permanente y cero acta de aporte. Resistencia en el discurso, ausencia en el plan, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, sello %PAIS: agraviado vitalicio. El ranking reparte números, no empatía infinita ni cupos de drama. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Exportas de %PAIS la costumbre de convertir todo en agravio. El archivo pide hechos y sigue esperando el primer recibo útil, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%PAIS en el SIM, el reclamo como único software. Queja crónica, solución nula. El contador no corre esa app, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N hace del micrófono del drama una identidad. No te hace lúcido; te hace predecible y pesado. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: pelear por todo, construir poco. El chat a veces construye sin tu narración. No eres indispensable: eres ruido con bandera. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS: urgencia moral, saturación con bandera. Asamblea de uno. El ranking no vota esa lista. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
    ],
  },
  PE: {
    name: 'Perú',
    lines: [
      'Y de %PAIS, %N: tribunal sin toga. Juzgas en silencio y aportas en cuotas. El grupo no te pidió sentencia; tu autoestima se la inventó. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: formalismo alto, entrega intermitente. Top en caras largas, flotando en peso real. Mohín de brochure, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Clásico %PAIS: ofensa en diferido, resentimiento bien peinado. Preferimos un no con fecha a tu silencio con veneno. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS llegaste haciéndote el humilde y midiendo a todos con regla ajena. Juez sin expediente, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, sello %PAIS: ego de “ya pues” sin sustancia. El ranking cotiza carga, no agrio. La pausa no es profundidad: es flojera. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Exportas de %PAIS el silencio estratégico que en realidad es vacío. Se te oye igual. El contador registra la ausencia, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%PAIS en el SIM, el juicio en la cara como único aporte. Agrio bien vestido. El valor propio no se plancha con orgullo, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N confunde misterio con flojera de entrega. Pose de profundidad sin disco duro detrás. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: criticar sin proponer. El archivo no se impresiona con el ceño. No cotiza el mohín. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS: compostura de ego, sustancia en nevera. El ranking no espera tu deshielo. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
    ],
  },
  BR: {
    name: 'Brasil',
    lines: [
      'Y de %PAIS, %N: after sin sustancia. Ambientas todo y no cargas nada. El grupo no es tu camarote ni tu pista de baile personal. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: sonrisa grande, aporte chico. Hit en ritmo, intro saltado en resultados. El valor propio no se mide en bpm, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Clásico %PAIS: carnaval de un solo flotante —tú—. El chat bajó el volumen. Resaca con beat, sin coreografía útil. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS llegaste de estrella en chat de barrio. Fútbol en la boca, cero en el hilo. Fuera de juego, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, sello %PAIS: fiesta verbal, utilidad en resaca. El after en la cabeza como único plan operativo. Patético. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Exportas de %PAIS el ruido alegre que el grupo ya aprendió a silenciar. El ritmo no te hace indispensable; te hace karaoke, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%PAIS en el SIM, el hueco detrás del sambódromo mental. Ambientar para no aportar. El glitter no tapa el vacío, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N hace de la gracia un tutorial sin gracia real. Confeti sin rastro. No cotiza. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: “só alegria” como excusa de no entregar. Acá la alegría no suma sin contador detrás, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS: subir el volumen de la fiesta y bajar el del aporte. Show sin sustancia. El ranking no da credits. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
    ],
  },
  CL: {
    name: 'Chile',
    lines: [
      'Y de %PAIS, %N: frío administrativo y aporte tibio. Mirada por encima del hombro. El grupo no es tu sucursal ni tu checklist moral. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: crítica fina, autocrítica nula. Estándar en la boca, carga en letra chica. El valor propio cotiza normas que no cumple, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Clásico %PAIS: “acá se hace bien” sin mostrar el bien. Superioridad sin expediente. Adulto de la sala que no sostiene el hilo. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS llegaste con soberbia ordenada. El chat hizo la auditoría sin tu firma. %N, el mohín técnico no suma puntos. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, sello %PAIS: ego de checklist. Distancia olímpica, utilidad tibia. Confundes orden con ser interesante. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Exportas de %PAIS el hielo educado. El archivo no se impresiona. El silencio no es estándar: es flojera con buena ortografía, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%PAIS en el SIM, la tibieza en cada turno. Criticas el proceso ajeno y flaqueas en el propio. El ranking lo deja en actas, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N vende compostura y entrega suspensión. El contador no hiberna contigo. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: “hay que ser serios” mientras el rastro pide seriedad tuya. Contradicción de manual. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS: frío sin resultado. Archivo frío, orgullo intacto, utilidad en duda. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
    ],
  },
  EC: {
    name: 'Ecuador',
    lines: [
      'Y de %PAIS, %N: molestia suave, drama de baja intensidad y alta constancia. El grupo no te debe el clima emocional del día. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: ofensa fácil, propuesta difícil. Lleno de “me sacaron”, vacío de aporte. El valor propio come queja, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Clásico %PAIS: víctima con el teclado, verdugo con el silencio. Eres el clima del hilo. La dignidad no es meteorología. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS llegaste con boletín de molestias. Preferimos el parte seco del ranking. %N, el drama en cuotas no cotiza. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, sello %PAIS: ego de agravio chico. Sensibilidad selectiva. Confundes ser sensible con ser central. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Exportas de %PAIS la llovizna emocional. El archivo no hace de paño de lágrimas. Empatía infinita no es un derecho tuyo, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%PAIS en el SIM, el barro fino en el hilo. Queja de baja intensidad, resultado grueso en vacío, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N alarga el conflicto porque el silencio le da miedo. El silencio era información. Cobarde de tono suave. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: “es que me sacaron” como personalidad. El ranking no compra ese boleto. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS: saturación de poco. Archivo seco, orgullo mojado, rastro en cero. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
    ],
  },
  ES: {
    name: 'España',
    lines: [
      'Y de %PAIS, %N: arrogancia con prefijo 34. Europeo superior en un chat que no pide pasaporte. Mucho imperio en la boca, poco en el contador. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: soberbia de terraza, entrega de menú del día. Corriges el acento ajeno y aportas en cuotas. VIP mental, basura operativa, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Clásico %PAIS: Latinoamérica como patio trasero del WiFi. Tutorial de “en España se hace así” que nadie pidió. El chat no es tu comunidad de vecinos.',
      'De %PAIS llegaste con monólogo de bar a las tres. Centro de Europa en grupo hispano. La dignidad pidió cierre; tu ego pidió otra caña, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, sello %PAIS: corrector ortográfico del continente sin cargo. Tu valor depende de ganar sobremesas; por eso pierdes el hilo. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Exportas de %PAIS el “el español de verdad es el mío”. Spoiler: el ranking escribe en números, no en zeta, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%PAIS en el SIM, el cinismo de capital en la boca. Todo te parece provinciano menos tu vacío. El público pidió la cuenta, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N explica la vida ajena y no arregla la propia. PowerPoint de bar sin botones. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: “ustedes no entienden Europa”. Acá se entendió de sobra. Por eso el silencio posterior te parte la cara. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS: soberbia de imperio, cimientos de bar de pueblo. El ridículo lo trabajaste tú entre caña y caña. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
    ],
  },
  GT: {
    name: 'Guatemala',
    lines: [
      'Y de %PAIS, %N: calma volcánica que explota por cualquier mensaje. Lava de ego, ceniza de aporte. El grupo evacuó tu monólogo. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: misterio barato, constancia nula. Te crees profundo y eres ausencia con bandera. %N, el ranking no compra leyendas. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Clásico %PAIS: sobrevivir al drama sin mover un dedo útil. Medalla de mirón. El valor propio no se farmea mirando, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS llegaste con orgullo de altura y utilidad de valle. El chat bajó la montaña sin ti, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, sello %PAIS: confundes ser reservado con ser interesante. Silencio no es profundidad: es flojera con paisaje de fondo. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Exportas de %PAIS el drama de altura sin oxígeno de datos. Soft power del vacío. El contador te bajó a cota cero, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%PAIS en el SIM, el incienso en la pose. El archivo no compra rituales. Aporta o sobras, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N ofende bajito y aporta más bajo. Se te oye igual. Presencia sin peso. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: spoiler de irrelevancia. El misterio ya aburrió. El ego encuentra altura; el contador, el piso. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS: ganar el orgullo y perder el rastro. Documentado. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
    ],
  },
  CU: {
    name: 'Cuba',
    lines: [
      'Y de %PAIS, %N: resistencia solo al aporte. Discurso eterno, teclado prestado. El grupo no es tu asamblea. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: nostalgia rica, mensajes en cartilla. El valor propio no se raciona: se demuestra, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Clásico %PAIS: “ustedes no saben” como personalidad. Noticiero sin cierre. El chat cambió de canal. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS llegaste con faro apagado y apología del agravio. %N, la dignidad pidió generador de hechos, no de himnos. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, sello %PAIS: queja larga, solución corta. Fila infinita del ego. Nadie guarda tu lugar. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Exportas de %PAIS la historia como excusa permanente. El ranking no acepta cupones de pasado, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%PAIS en el SIM, el micrófono en la mano equivocada. Monólogo en el feed. El archivo no aplaude de pie, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N pelea el relato y pierde el dato. Orgullo sin entrega. No cotiza. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: balsa de ego. El grupo llegó a tierra sin ti. El relato pesa allá; acá pesa el contador. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS: himno eterno, aporte en huelga. Remix de urgencia inútil. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
    ],
  },
  BO: {
    name: 'Bolivia',
    lines: [
      'Y de %PAIS, %N: cerro de ego, aire fino, argumento más fino. El grupo bajó a cotas útiles; tú seguiste sin oxígeno de datos. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: dignidad anunciada, entrega a media oxigenación. Everest de orgullo, valle de hechos, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Clásico %PAIS: ofenderte por el clima del hilo. Meteorología emocional. Preferimos el parte seco del ranking. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS llegaste de cóndor que no despega. Centro andino en la boca, periferia en el rastro, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, sello %PAIS: mucho carácter, poco cargamento. Mina de orgullo sin vetas de utilidad. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Exportas de %PAIS el peso disfrazado de seriedad. Fuerza sin dirección es lastre, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%PAIS en el SIM, el mohín de altura. El archivo no sube esa montaña. Nublas el hilo a propósito, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N juzga en silencio y aporta en cuotas. El ranking no cotiza juicio mudo. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: mal de montaña del hilo. La altura ya no impresiona. Ego en cumbre, contador en valle. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS: ganar el orgullo y perder el rastro. Mismo final. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
    ],
  },
  DO: {
    name: 'República Dominicana',
    lines: [
      'Y de %PAIS, %N: dembow de ego sin segunda estrofa útil. Pegajoso, repetitivo, vacío. El grupo bajó el volumen. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: alegría anunciada, aporte que no llega a la pista. DJ de autoestima, pista vacía de hechos, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Clásico %PAIS: resolverlo todo “en confianza”. Contactito que no contacta resultados. El ranking no baila esa. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS llegaste de flow y entregaste buffer. Playlist sin hits. La dignidad pidió skip, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, sello %PAIS: labia alta, constancia baja. After vendido como concierto. Resaca de promesas. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Exportas de %PAIS la simpatía como sustituto de utilidad. No suma en el contador, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%PAIS en el SIM, la farra verbal en la boca. El archivo no está de party. Intro eterno, drop de aporte nunca, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N ambienta para no cargar. Hueco bajo el beat. Flow sin sustancia. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: resort de ego. Checkout. El flow vende allá; acá vende el rastro. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS: ganar la pista y perder el hilo. Estríbillo de basura. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
    ],
  },
  HN: {
    name: 'Honduras',
    lines: [
      'Y de %PAIS, %N: tormenta anunciada, poco refugio útil. El grupo sacó el paraguas y te dejó fuera. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: dureza verbal, aporte intermitente. Leyenda de aguante, alerta amarilla de utilidad, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Clásico %PAIS: resolver a gritos lo que pedía un dato. Sirena sin plan. El ranking no corre. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS llegaste de centro del mapa y aportaste margen. Camino de tierra: se nota cuando llueve drama, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, sello %PAIS: orgullo alto, entrega irregular. Puente que tiembla. Nadie carga de más sobre ti. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Exportas de %PAIS el peso disfrazado de fuerza. Sin dirección eres lastre, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%PAIS en el SIM, el lodazal en el hilo. Enturbias y ofendes fácil. El chat eligió ruta alterna, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N gana el grito y pierde el rastro. Dureza sin resultado. No cotiza. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: bache del hilo. La dureza ya no impresiona. Ego en pelea, contador en puntos en contra. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS: volumen alto, plan en cero. Documentado. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
    ],
  },
  PY: {
    name: 'Paraguay',
    lines: [
      'Y de %PAIS, %N: siesta del aporte. Largo descanso, corto despertar útil. El grupo laburó la jornada sin ti. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: dignidad en voz baja, entrega más baja. Biblioteca de silencio, anaquel vacío, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Clásico %PAIS: mirar de reojo y no cargar. Vecino del hilo. El ranking no cotiza miradas. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS llegaste de equilibrio y entregaste desbalance. Tereré del drama: se estira, no alimenta, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, sello %PAIS: poco ruido, menos sustancia. Ausencia educada. Duele menos de lo que tu ego imagina. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Exportas de %PAIS la calma como excusa de prescindible. Olvido con buenas maneras, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%PAIS en el SIM, la sombra en el aporte. Prefieres no molestar y no sumar. El chat premia lo segundo cuando falta, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N es mute con foto. El misterio del silencio ya no vende. Discreción sin peso. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: no perder… y tampoco ganar nada en el rastro. Empate de basura. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS: quietud de cementerio con WiFi. Mismo final en voz baja. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
    ],
  },
  SV: {
    name: 'El Salvador',
    lines: [
      'Y de %PAIS, %N: chispa sin circuito. Voltaje de ego que quema el aporte. El grupo bajó los plomos. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: carácter denso, entrega irregular. Récord de orgullo por kilómetro; cortocircuito de hechos, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Clásico %PAIS: resolver en caliente lo que pedía un mensaje. Disputa innecesaria. El ranking suma, no pelea. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS llegaste de centro de mapa chico y aportaste drama grande. Temblor del hilo, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, sello %PAIS: orgullo alto, paciencia baja. Fusible del chat: siempre saltas tú. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Exportas de %PAIS el roce disfrazado de franqueza. Directo sin sustancia es abrasión, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%PAIS en el SIM, el cortocircuito en el hilo. Electrificas sin iluminar. Ego en pelea, contador en contra, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N gana el tono y pierde el contenido. Intensidad sin resultado. No cotiza. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: apagón del hilo. La dureza ya no impresiona. Credenciales chamuscadas. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS: subir el tono y bajar el rastro. Documentado. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
    ],
  },
  NI: {
    name: 'Nicaragua',
    lines: [
      'Y de %PAIS, %N: capítulo eterno sin trama útil. Discurso solemne, cierre de aporte en huelga. El grupo cambió de libro. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: orgullo denso, constancia floja. Portada en proclamas, nota al pie en hechos, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Clásico %PAIS: el chat como plaza pública. Mitin de uno. El ranking no vota esa lista. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS llegaste de faro moral y aportaste niebla. Apagones de utilidad, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, sello %PAIS: mucho relato, poco recibo. Promesa de cambio que no llega al hilo. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Exportas de %PAIS la intensidad como sustituto de importancia. Ruido con atril, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%PAIS en el SIM, el himno en bis. Prefieres el discurso al párrafo útil. El contador no hace mítines, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N gana el relato y pierde el número. Solemnidad sin sustancia. No cotiza. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: monumento al ego. El falso cumplido de la tierra se derrumba solo. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS: alargar el discurso y acortar el aporte. Mismo final. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
    ],
  },
  CR: {
    name: 'Costa Rica',
    lines: [
      'Y de %PAIS, %N: pura pose. Postcard del ego, vacío en el reverso. El grupo ya no manda recuerdos. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: amabilidad anunciada, aporte intermitente. Parque nacional mental, sendero cerrado de hechos, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Clásico %PAIS: quedar bien y cargar poco. “Con mucho gusto” sin gusto por el trabajo. El ranking no cotiza sonrisas. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS llegaste de paraíso y aportaste zona de obras. Turista en tu propio hilo, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, sello %PAIS: mucha calma, poca carga. Hamaca del aporte: se ve cómoda, no avanza. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Exportas de %PAIS lo nice como sustituto de necesario. Decoración con bandera, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%PAIS en el SIM, el brochure en la boca. El archivo pide movimiento. Paz verbal, rastro en huelga, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N queda bien y queda fuera del ranking útil. Pura vida sin vida en el contador. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: mute educado. La calma ya no vende. Ego en playa, contador en bajamar. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS: sonreír y no cargar. Mismo final. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
    ],
  },
  PA: {
    name: 'Panamá',
    lines: [
      'Y de %PAIS, %N: peaje de ego. Todo el drama pasa por ti y no queda carga útil. El grupo abrió ruta alterna. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: labia comercial, entrega a medias. Franquicia de peajes mentales, vía cerrada de hechos, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Clásico %PAIS: comisión emocional. Intermediario que no intermedia resultados. El ranking no paga esa tarifa. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS llegaste de hub y aportaste demora. Contenedor vacío con bandera, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, sello %PAIS: mucho movimiento anunciado, poco atraque. Barco que no atraca. Valor propio en el muelle. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Exportas de %PAIS la agenda llena como sustituto de utilidad. Rastro vacío, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%PAIS en el SIM, el atajo en la boca. El archivo no hace escala. Deal sin entrega final, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N negocia todo menos su propia mejora. Canal sin barcos. No cotiza. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: contenedor vacío. El misterio del deal ya no impresiona. Semáforo del contador en rojo. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS: mover fichas y no mover el rastro. Mismo final. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
    ],
  },
  UY: {
    name: 'Uruguay',
    lines: [
      'Y de %PAIS, %N: mate del ego. Ronda eterna, yerba de juicio, cero dulzor útil. El grupo cambió de termo. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: seriedad anunciada, entrega tibia. Manual de mesura, nota al margen de hechos, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Clásico %PAIS: mirar al resto como ruidoso por defecto. Árbitro sin partido. El ranking no pide tu silbato. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS llegaste de equilibrio y aportaste empate eterno. 0-0 del hilo. La dignidad pidió un gol de aporte, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, sello %PAIS: poco show, menos sustancia. Sobriedad que tapa flojera. Se lee. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Exportas de %PAIS la cara larga como sustituto de ser interesante. Seriedad sin rastro es ceño, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%PAIS en el SIM, el mohín educado. El archivo no se impresiona. Juicio en voz baja, aporte en huelga, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N no exagera… y no aporta. El medio vacío no es virtud. Mesura sin peso. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: mute con compostura. La seriedad ya no vende. Ego en empate, contador ganando. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS: no perder el estilo y perder el rastro. Mismo final en voz baja. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
    ],
  },
  PR: {
    name: 'Puerto Rico',
    lines: [
      'Y de %PAIS, %N: reguetón de ego sin drop de aporte. Todos oyen el bajo, nadie baila tu utilidad. El grupo pidió skip. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: actitud alta, constancia a medias. Tendencia en views mentales, intro saltado en hechos, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Clásico %PAIS: estrella en chat de barrio. Feat que nadie pidió. El ranking no da credits. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS llegaste de puente y aportaste peaje. Colonia de ego: dependes del aplauso, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, sello %PAIS: mucho swagger, poco manifiesto de carga. Videoclip sin canción. Valor propio sin letra. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Exportas de %PAIS la intensidad como sustituto de indispensable. Eco con auto-tune, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%PAIS en el SIM, la farándula en la boca. El archivo no está en premiere. Intro eterno, estribillo de aporte nunca, %N. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'De %PAIS, %N ambienta para no cargar. Hueco bajo el beat. Flow sin sustancia. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      'Pack %PAIS: resort de ego. Checkout. El flow vende allá; acá vende el rastro. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.',
      '%N, estereotipo %PAIS: ganar la pista y perder el hilo. Estríbillo de basura documentada. Tu autoestima sigue negociando un respeto que el contador ya embargó sin apelación.'
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
