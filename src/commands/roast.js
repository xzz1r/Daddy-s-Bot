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
  '_Y todavía se cree alguien en este chat._',,
  '_El grupo ya eligió: es el chiste, no el que lo cuenta._',,
  '_Guarde el orgullo. No le queda para otra ronda._',,
  '_Si la dignidad cobrara alquiler, estaría en la calle._',,
  '_Siguiente. Este ya no tiene arreglo._',,
  '_El espejo del ranking también se ríe._',,
  '_No hay bio ni pose que tape el historial._',,
  '_La autoestima acaba de pedir la baja._',,
  '_Archivado con los que sobran con wifi._',,
  '_Se le nota que duele y aun así no cambia._',,
  '_El contador firmó. Solo queda alegar en silencio._',,
  '_Cuando baje el ego, el grupo ya habrá pasado página._',
];

const OWNER_ROAST = [
  '%N, el dueño intocable: todo le sale y encima tiene cara de que el resto existe de favor. Eres el jefe que nadie eligió y todos aguantan. El día que el ego se te caiga, el chat festeja en silencio.',
  '%N camina como si el WiFi saliera de su culo. Tiene razón demasiadas veces y por eso da asco. Baja un cambio antes de que te conviertan en sticker de advertencia.',
  '%N, hijo de puta con suerte: gana, manda y todavía se ofende. Tutorial que nadie pidió. No te odian por poderoso; te odian porque eres insufrible con pruebas.'
];

const ACT_0 = [
  '%N arrastra cero mensajes: parásito de lista, público gratis del drama ajeno, cero peaje pagado al hilo.',,
  '%N en 0. El chat construye sin su turno y el hueco no duele a nadie; solo al ego que se esconde detrás del silencio.',,
  'Contador en cero, %N: online para fisgonear, offline para existir. Sobrante con número de teléfono.',,
  '%N no escribe. No es estrategia: es mediocridad con WiFi y orgullo de quien cree que mirar cuenta como aportar.',,
  'Cero rastro útil de %N. El ranking de útiles nunca lo anotó; el de decoración, en negrita.',,
  '%N, 0 en el marcador. Parásito de bajo consumo: ocupa sitio, no carga, y todavía se cree parte del mobiliario.',,
  '%N con la lista y sin la voz. Estar sin hablar no es misterio: es ser prescindible con avatar de relleno.',,
  'Cero mensajes de %N. El archivo lo tiene de florero; el grupo aprendió a no esperarlo y le fue mejor.',
];

const ACT_LOW = [
  '%N con %C mensajes: ruido de fondo. Molesta lo justo, aporta lo de un zumbido, pide platea igual.',,
  '%C textos de %N: aparece para recordar que existe y desaparece para que el olvido sea cómodo.',,
  '%N, %C en el marcador. Limbo de los que sobran y no se van; el grupo lo administra como un mosquito a las tres.',,
  '%C mensajes, %N. Prueba el agua con el pie y nunca se tira: cobarde de teclado con discurso de capitán.',,
  '%N lleva %C. Intermitente de manual: molesta, se va, vuelve sin haber cargado nada.',,
  '%N con solo %C. Casi no existe y el orgullo pide micrófono; el chat lo tiene en “tal vez nunca”.',,
  '%C de %N: parásito de raciones chicas. Insuficiente para voz, sobrado para espacio emocional que nadie cedió.',,
  '%N, %C. Construye olvido con precisión; existir en la lista no es existir en el hilo.',
];

const ACT_MID = [
  '%N con %C mensajes: tibio profesional. Opinión de relleno, ego de estrella, ranking que no pelea por él.',,
  '%C en el contador de %N: mínimo para abrir el hocico, máximo para no cargar una mierda.',,
  '%N, %C. Mapa a lápiz: vendió “existir” como si fuera “importar” y el grupo lo lee en diagonal.',,
  '%C mensajes: %N es café tibio del chat. Nadie lo tira, nadie lo pide, autoestima de oferta vencida.',,
  '%N lleva %C. Serie cancelable: ruido, pose, cero peso; el patrón ya apesta a relleno.',,
  '%N con %C. Suficiente para defenderse, poco para que alguien le deba algo. Ego de outlier, datos de promedio flojo.',,
  '%C textos, %N. Zona gris del hilo: “meh” con teclado y veredictos de juez de barrio.',,
  '%N, %C. Racha de tibieza disfrazada de presencia; el contador le hace señas al orgullo y el orgullo no contesta con hechos.',
];

const ACT_HI = [
  '%N con %C mensajes: ya no es invisible, todavía no es indispensable. El grupo lo reconoce; no le debe la vida.',,
  '%C en el contador, %N. Hay rastro y techo de yeso: aporta lo justo para no borrarlo y poco para que lo defiendan.',,
  '%N, %C. Ego hinchado antes que el mérito. Borrador con firma; el contrato emocional no se renovó.',,
  '%C mensajes: %N pertenece al chat; el chat no depende de él. Cable de más, soberbio en todas.',,
  '%N lleva %C. Clase media del hilo con discurso de primera fila; el desajuste se lee sin lupa.',,
  '%N con %C. Motor a media marcha: llega cuando el trabajo pesado ya empezó y pide medalla de apertura.',,
  '%C textos, %N. Dejó de ser fantasma y todavía no es columna; puente a mitad de río con ego de autopista.',,
  '%N, %C. El mapa lo tiene; el podio no. Presencia sin ser estructura.',
];

const ACT_TOP = [
  '%N con %C mensajes. Empuja el hilo de verdad: que no lo cambie por soberbia de dueño. El contador es cuota, no aureola.',,
  '%C en el marcador de %N. Motor, no decoración. Si el ego se sube, el roast cobra con el propio historial.',,
  '%N, %C. Respeto farmeado a base de escribir; cuanto más alto el número, más rico el asado si se pone insoportable.',,
  'Con %C textos, %N ya es esqueleto del hilo. La autoestima se oxida si solo mira el contador y pide sumisión.',,
  '%N lleva %C. Actividad real: a este nivel el golpe duele más porque el archivo lo respaldaba y el orgullo se desborda igual.',,
  '%C mensajes, %N. Constancia que pesa. Respeto ganado; soberbia en observación.',,
  '%N con %C. Columna, no adorno. Nadie se vuelve intocable por teclear mucho.',,
  '%N, %C en el marcador. Sostiene cuando el hilo se cae: si lo gasta en teatro, el grupo se lo cobra doble.',
];

const DEST_GEN = [
  'Encima el ego hinchado sin base: se mira protagonista y el archivo lo tiene de extra. Autoestima de prestado, ya embargada.',,
  'Encima el valor propio cotiza en promesas que nadie firmó. El grupo hizo la resta: sobra con wifi y discurso de imprescindible.',,
  'Encima negocia respeto que no farmeó. Espejo y contador coinciden: bajo la pose no hay mucho que salvar.',,
  'Encima pose de importante sin historial. El orgullo grita, el rastro susurra, el grupo ya eligió a quién hacer caso.',,
  'Encima el orgullo gasta de más con ingresos de nada. Déficit de mérito; este mensaje cobra sin plazos.',,
  'Encima le duele más la exposición que la mediocridad que la provocó. Imagen sí, aporte no: fraude emocional de manual.',,
  'Encima cree que el silencio del grupo es respeto. No: indiferencia educada. Confundir las dos pudre la autoestima sola.',,
  'Encima el ranking no lo odia: lo administra como problema menor. Ser irrelevante duele más que ser odiado.',
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
      'De %PAIS encima: soberbia de selección con rendimiento de reserva. Gritan Messi como si borrara Malvinas, la inflación y la costumbre de mirar al resto como “el interior”.',,
      'Con sello %PAIS: indio con complex de imperio, verso largo, rastro corto. El ranking no acepta tango ni default del peso como pago de respeto.',,
      'Pack %PAIS en el hilo: ofenderse fácil, aportar poco, explicar el continente sin sostener un mensaje. Versión fallida de Europa con ego de sobremesa.',,
      'Y %PAIS no ayuda: cementerio de moneda, cátedra de bolsillo, monólogo de café; ese manual llega al chat y el contador lo deja en evidencia.',,
      'De %PAIS, el “ustedes no entienden” como personalidad. Acá se entendió de sobra: mucho norte en la boca, poco terreno en el historial.',,
      'Encima el chip %PAIS: culpar al planeta de la miseria propia y vender superioridad prestada. El archivo no llora con ustedes; cobra en mensajes.',,
      'Sello %PAIS: PowerPoint sin botones, himno a volumen de asado ajeno, resultado de amistoso. El orgullo discute el acta; el número ya firmó en contra.',,
      'De %PAIS al hilo llega la costumbre de corregir la hora tarde. Si la autoestima fuera horario, llegaría tarde a su propio valor cada vez que escribe.',,
      'Con %PAIS de fondo: imperio de sobremesa, independencia del grupo respecto a su monólogo. El rastro no negocia en metáforas porteñas.',,
      'Y el pack %PAIS completo: peso que se derrite, ego que se infla, historia que se usa para no mirar el vacío de aporte. El contador no hace de paño de lágrimas.',,
      'De %PAIS encima no viene magia: viene la pose de faro latinoamericano sin farolito en el ranking. Baja el himno; el historial ya habló.',,
      'Sello %PAIS sobre este rastro: labia de intelectual de café, utilidad de kiosco cerrado. El grupo no es su provincia ni su tribunal.',
    ],
  },
  CO: {
    name: 'Colombia',
    lines: [
      'De %PAIS encima: labia de vivo, sustancia de flyer. Todo se “acomoda” menos el historial. El grupo ya no compra humo; archiva promesas que apestan a gasolina barata.',,
      'Con sello %PAIS: sonrisa de comercial, entrega que nunca llega. Rico en “ya casi”, pobre en “ya está”. El ranking no fuma ese cuento.',,
      'Pack %PAIS en el hilo: malicia para el chisme, torpeza para el aporte. Se cree táctico y sale predecible; el vivo acá queda en pelotas frente al contador.',,
      'Y %PAIS no salva: software de “tranquilo que se resuelve”. Nunca se resuelve. Reunión que pudo ser un mensaje y ni el mensaje sirvió.',,
      'De %PAIS, confunde ser pillo con ser útil. No es ninguna de las dos. El chat lo huele sin detector; el orgullo sigue regateando el ridículo.',,
      'Encima el chip %PAIS: vender humo al por menor, anuncio eterno, producto que no llega. Basura con acento y ego de franquicia pirata.',,
      'Sello %PAIS: deal de ego, checkout del grupo. Scrollearon de largo sobre el orgullo y dejaron el carrito del respeto abandonado.',,
      'De %PAIS al hilo llega la viveza de manual y la constancia de flyer mojado. El cobrador es el contador; no acepta “mañana te lo acomodo”.',,
      'Con %PAIS de fondo: labia alta, rastro bajo, orgullo de quien cree que el acento abre puertas. Acá el acento solo abre el roast.',,
      'Y el pack %PAIS: feria de cuentos en cada hilo. El detector de humo del grupo está en rojo; el valor propio no se enteró de que el local cerró.',,
      'De %PAIS encima te acomodaron en la estantería de lo prescindible. La labia no levanta el historial. El orgullo, menos.',,
      'Sello %PAIS sobre este rastro: pillo de WhatsApp, inútil de archivo. El ranking no hace de cómplice del vivo.',
    ],
  },
  MX: {
    name: 'México',
    lines: [
      'De %PAIS encima: volumen sin argumento. Drama con teclado, todo escena, nada guion. El grupo baja el gain y el ego sigue a máximo como si el grito fuera currículum.',,
      'Con sello %PAIS: ruido fácil, criterio difícil. Grita como tesis doctoral. Rico en decibeles, pobre en sustancia. El valor no se mide en plazas.',,
      'Pack %PAIS en el hilo: ofenderse por todo y aportar nada. Piñata del chat. Todos saben dónde pegar; el dulce es poco y el orgullo prefiere el show.',,
      'Y %PAIS no tapa: telenovela de un capítulo repetido. Final: saturación. El público pidió la cuenta sin propina de respeto.',,
      'De %PAIS, alarma permanente, líder nunca. Mucho “a mí nadie me dice” mientras el contador dice todo. Escucha el número, no el orgullo de feria.',,
      'Encima el chip %PAIS: montar drama para no montar trabajo. Hueco detrás del telón. El ranking midió el agujero y lo publicó.',,
      'Sello %PAIS: intensidad de plaza, utilidad de cero. Convierte todo en escena. El chat no es set: apaga reflectores o acepta que eres ruido.',,
      'De %PAIS al hilo llega el grito como personalidad. El archivo no llora. El micrófono del drama no hace protagonista; hace alarma de vecindario.',,
      'Con %PAIS de fondo: fiesta de volumen, funeral de aporte. El show no tapa el hueco; el contador ya sacó el tamaño del vacío.',,
      'Y el pack %PAIS: preferir el conflicto al aporte porque el silencio enseña lo poco que pesas. Cobarde con bocina.',,
      'De %PAIS encima saturaste el propio hilo. Baja el gain. El respeto no se grita: se farmea, y vas en números rojos.',,
      'Sello %PAIS sobre este rastro: pirotecnia verbal, plan operativo en cero. El grupo pidió skip hace rato.',
    ],
  },
  VE: {
    name: 'Venezuela',
    lines: [
      'De %PAIS encima: noticiero sin cierre. Agravio con teclado 24/7. El grupo no es gobierno ni canal de denuncia; el ego no debería emitir en cadena.',,
      'Con sello %PAIS: denuncia a volumen alto, autocrítica en cero. Rico en queja, pobre en plan. El valor vive de titulares y se muere de hechos.',,
      'Pack %PAIS en el hilo: “nadie entiende” como personalidad. Himno a la ofensa colectiva. El chat entiende; por eso no debe empatía infinita.',,
      'Y %PAIS no exonera: asamblea permanente, cero acta de aporte. Resistencia en el discurso, ausencia en el plan. El ranking no vota tu lista de agravios.',,
      'De %PAIS, agraviado vitalicio. El ranking reparte números, no cupos de drama. La queja crónica no te hace lúcido: te hace predecible y pesado.',,
      'Encima el chip %PAIS: convertir todo en agravio. El archivo pide hechos y sigue esperando el primer recibo útil.',,
      'Sello %PAIS: micrófono del drama como identidad. No hay plan B detrás del volumen. El grupo a veces construye sin tu narración y mejora el clima.',,
      'De %PAIS al hilo llega pelear por todo y construir poco. No eres indispensable: eres ruido con bandera.',,
      'Con %PAIS de fondo: urgencia moral, saturación con himno. Asamblea de uno. El ranking no te debe escenario; te debe el silencio que no aguantas.',,
      'Y el pack %PAIS: preferir el himno al rastro. El cobrador de sustancia llamó. No hay más plazos de drama gratis.',,
      'De %PAIS encima narraste el incendio y no trajiste un balde. Baja el micrófono. El respeto no se ruega a gritos.',,
      'Sello %PAIS sobre este rastro: víctima profesional, aportante amateur. El contador no acepta resentimiento como moneda.',
    ],
  },
  PE: {
    name: 'Perú',
    lines: [
      'De %PAIS encima: tribunal sin toga. Juzga en silencio y aporta en cuotas. El grupo no pidió sentencia; el ego se inventó el juzgado.',,
      'Con sello %PAIS: formalismo alto, entrega intermitente. Top en caras largas, flotando en peso real. Mohín de brochure, sustancia en nevera.',,
      'Pack %PAIS en el hilo: ofensa en diferido, resentimiento bien peinado. Preferimos un no con fecha a tu silencio con veneno.',,
      'Y %PAIS no salva: pose de humilde que mide a todos con regla ajena. Juez sin expediente. La dignidad no se esconde detrás del “ya pues”.',,
      'De %PAIS, ego de pausa sin sustancia. El ranking cotiza carga, no agrio. La pausa no es profundidad: es flojera con pose de adulto.',,
      'Encima el chip %PAIS: silencio estratégico que es vacío. Se te oye igual. El contador registra la ausencia; el orgullo finge misterio.',,
      'Sello %PAIS: juicio en la cara como único aporte del día. El valor propio no se plancha con orgullo de terraza.',,
      'De %PAIS al hilo llega confundir misterio con flojera de entrega. Pose de profundidad sin disco duro. El ranking cotiza rastro.',,
      'Con %PAIS de fondo: adulto de la sala que no sostiene el hilo cuando pesa. Superioridad sin expediente.',,
      'Y el pack %PAIS: cada pausa convertida en sentencia moral. El chat no es tu juzgado. Baja el martillo; no tienes autoridad de número.',,
      'De %PAIS encima mirar feo y cargar poco. El feo no suma puntos. El contador ya hizo la cuenta.',,
      'Sello %PAIS sobre este rastro: compostura de ego, sustancia aplazada. El ranking no espera tu deshielo.',
    ],
  },
  BR: {
    name: 'Brasil',
    lines: [
      'De %PAIS encima: after sin sustancia. Ambienta todo y no carga nada. El grupo no es camarote ni resort; el ego no debería vivir de playlist ajena.',,
      'Con sello %PAIS: sonrisa grande, aporte chico. Hit en ritmo, intro saltado en resultados. El valor no se mide en bpm.',,
      'Pack %PAIS en el hilo: carnaval de un solo flotante. El chat bajó el volumen. Resaca con beat, sin coreografía útil.',,
      'Y %PAIS no tapa: pose de estrella en chat de barrio. Fútbol en la boca, cero en el hilo. Fuera de juego sin VAR que salve el orgullo.',,
      'De %PAIS, fiesta verbal, utilidad en resaca. El after en la cabeza como único plan. El ranking no da credits por ambientar el vacío.',,
      'Encima el chip %PAIS: ruido alegre que el grupo ya silenció. El ritmo no te hace indispensable; te hace karaoke con ego de headliner fallido.',,
      'Sello %PAIS: hueco detrás del sambódromo mental. Ambientar para no aportar. El glitter no tapa el agujero; el contador lo mide.',,
      'De %PAIS al hilo llega gracia sin gracia real. Confeti sin rastro. “Só alegria” como excusa de no entregar. Acá no suma sin número.',,
      'Con %PAIS de fondo: selección mental, amistoso flojo. El chat ya hizo los cambios. El orgullo no entró en la convocatoria.',,
      'Y el pack %PAIS: preferir el desfile al descargue. El muelle espera carga; tú traes glitter. El valor naufraga en la resaca del ego.',,
      'De %PAIS encima ambientaste la nada. Apaga el beat. El respeto no se baila: se farmea.',,
      'Sello %PAIS sobre este rastro: subir el volumen de la fiesta y bajar el del aporte. Show sin sustancia.',
    ],
  },
  CL: {
    name: 'Chile',
    lines: [
      'De %PAIS encima: frío administrativo, aporte tibio. Mirada por encima del hombro. El grupo no es sucursal ni checklist moral.',,
      'Con sello %PAIS: crítica fina, autocrítica nula. Estándar en la boca, carga en letra chica. El valor cotiza normas que incumples.',,
      'Pack %PAIS en el hilo: “acá se hace bien” sin mostrar el bien. Superioridad sin expediente. Adulto de sala que no sostiene el hilo cuando pesa.',,
      'Y %PAIS no exonera: soberbia ordenada. El chat auditó sin tu firma. El mohín técnico no suma respeto ni rastro.',,
      'De %PAIS, ego de checklist. Distancia olímpica, utilidad tibia. Confundes orden con ser interesante; el archivo no se impresiona con hielo.',,
      'Encima el chip %PAIS: silencio educado vendido como estándar. Es flojera con buena ortografía. El ranking cotiza calor de aporte.',,
      'Sello %PAIS: criticar el proceso ajeno y flaquear en el propio. El contador lo dejó en actas sin tu visto bueno.',,
      'De %PAIS al hilo llega compostura en boca y suspensión en entrega. “Hay que ser serios” mientras el rastro pide seriedad tuya.',,
      'Con %PAIS de fondo: frío sin resultado. Archivo frío, orgullo intacto, utilidad en duda.',,
      'Y el pack %PAIS: mirar feo el desorden ajeno y aportar el propio en cuotas. El espejo del ranking es más honesto que tu mohín.',,
      'De %PAIS encima quisiste ordenar el mundo y desordenaste tu rastro. El frío no te hace superior: te hace prescindible con estilo.',,
      'Sello %PAIS sobre este rastro: gerencia de bolsillo sin resultados. El chat no renueva el contrato emocional.',
    ],
  },
  EC: {
    name: 'Ecuador',
    lines: [
      'De %PAIS encima: molestia suave, drama de baja intensidad y alta constancia. El grupo no te debe el clima emocional del día.',,
      'Con sello %PAIS: ofensa fácil, propuesta difícil. Lleno de “me sacaron”, vacío de aporte. El valor come queja y engorda ridículo.',,
      'Pack %PAIS en el hilo: víctima con el teclado, verdugo con el silencio. Eres el clima del chat. La dignidad no es meteorología.',,
      'Y %PAIS no salva: boletín de molestias. Preferimos el parte seco del ranking. El drama en cuotas satura y aburre.',,
      'De %PAIS, ego de agravio chico. Sensibilidad selectiva. Confundes ser sensible con ser central; el archivo te tiene de ruido bajo.',,
      'Encima el chip %PAIS: llovizna emocional. El grupo sacó el paraguas. Empatía infinita no es un derecho tuyo.',,
      'Sello %PAIS: barro fino en el hilo. Queja de baja intensidad, resultado grueso en vacío.',,
      'De %PAIS al hilo llega alargar el conflicto porque el silencio enseña lo poco que pesas. Cobarde de tono suave.',,
      'Con %PAIS de fondo: saturación de poco. El chat no es tu parte meteorológico. Baja la queja; sube el rastro.',,
      'Y el pack %PAIS: cada roce convertido en temporada de lluvias. El grupo ya tiene impermeable.',,
      'De %PAIS encima cobraste clima y pagaste cero sustancia. El termómetro del ranking marca frío de utilidad.',,
      'Sello %PAIS sobre este rastro: “es que me sacaron” como personalidad. El ranking no compra ese boleto.',
    ],
  },
  ES: {
    name: 'España',
    lines: [
      'De %PAIS encima: arrogancia con prefijo 34. Europeo superior en un chat que no pide pasaporte. Mucho imperio en la boca, poco en el contador.',,
      'Con sello %PAIS: soberbia de caña, entrega de menú del día. Corrige el acento ajeno y aporta en cuotas. VIP mental, operativa de sobras.',,
      'Pack %PAIS en el hilo: Latinoamérica como patio trasero. Tutorial de “en España se hace así” que nadie pidió. El chat no es tu comunidad de vecinos.',,
      'Y %PAIS no exonera: monólogo de bar. Centro de Europa en grupo hispano. La dignidad pidió cierre; el ego pidió otra caña y otra corrección inútil.',,
      'De %PAIS, corrector del continente sin cargo. El valor depende de ganar sobremesas; por eso pierde el hilo cuando toca cargar de verdad.',,
      'Encima el chip %PAIS: “el español de verdad es el mío”. Spoiler: el ranking escribe en números, no en lecturas de RAE.',,
      'Sello %PAIS: cinismo de capital. Todo le parece provinciano menos su vacío. El público pidió la cuenta sin propina de sustancia.',,
      'De %PAIS al hilo llega explicar la vida ajena y no arreglar la propia. PowerPoint de bar sin botones. El “no entienden Europa” ya aburrió.',,
      'Con %PAIS de fondo: soberbia de imperio, cimientos de bar de pueblo. El ridículo se trabajó entre caña y caña. El ranking no hace excepciones ibéricas.',,
      'Y el pack %PAIS: cada chat convertido en tertulia de superioridad. El grupo no es el plató de tu ego. El contador cambió de canal.',,
      'De %PAIS encima llegaste a dar lecciones y te llevaste el roast. El pasaporte no mejora el hardware. Se nota el default de opinar mucho y aportar poco.',,
      'Sello %PAIS sobre este rastro: condescendencia hasta que pide respeto. El archivo no hace aduanas sentimentales. Baja el monólogo.',
    ],
  },
  GT: {
    name: 'Guatemala',
    lines: [
      'De %PAIS encima: volcán de ego y ceniza de aporte. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto.',,
      'Con sello %PAIS: misterio de postal sin rastro. El ranking no compra postales ni himnos. El valor cotiza promesas; el contador, hechos.',,
      'Pack %PAIS en el hilo: orgullo de altura y utilidad de valle. Soft power del vacío. El archivo midió sin permiso y el resultado no cabe en el ego.',,
      'Y %PAIS no tapa el rastro: estereotipo completo sin el trabajo detrás. La bandera no mejora el hardware.',,
      'De %PAIS, orgullo anunciado y entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Encima el chip %PAIS: creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Sello %PAIS: volcán de ego y ceniza de aporte con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS al hilo llega ofender fácil y cargar difícil. Presencia sin peso. El valor propio todavía discute el veredicto.',,
      'Con %PAIS de fondo: misterio de postal sin rastro. Documentado. El orgullo encuentra altura imaginaria; el contador, el piso.',,
      'Y el pack %PAIS: ganar la pelea del orgullo y perder la del rastro. Mismo final de siempre: mucho verso, poco número.',,
      'De %PAIS encima no hay indulto de bandera. El historial pesa más que el himno y el himno no suma mensajes.',,
      'Sello %PAIS sobre este rastro: orgullo de altura y utilidad de valle. El grupo ya pasó página; el ego todavía discute el acta.',
    ],
  },
  CU: {
    name: 'Cuba',
    lines: [
      'De %PAIS encima: discurso eterno y aporte en cartilla. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto.',,
      'Con sello %PAIS: resistencia solo al trabajo útil. El ranking no compra postales ni himnos. El valor cotiza promesas; el contador, hechos.',,
      'Pack %PAIS en el hilo: faro apagado con himno a máximo. Soft power del vacío. El archivo midió sin permiso y el resultado no cabe en el ego.',,
      'Y %PAIS no tapa el rastro: estereotipo completo sin el trabajo detrás. La bandera no mejora el hardware.',,
      'De %PAIS, orgullo anunciado y entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Encima el chip %PAIS: creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Sello %PAIS: discurso eterno y aporte en cartilla con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS al hilo llega ofender fácil y cargar difícil. Presencia sin peso. El valor propio todavía discute el veredicto.',,
      'Con %PAIS de fondo: resistencia solo al trabajo útil. Documentado. El orgullo encuentra altura imaginaria; el contador, el piso.',,
      'Y el pack %PAIS: ganar la pelea del orgullo y perder la del rastro. Mismo final de siempre: mucho verso, poco número.',,
      'De %PAIS encima no hay indulto de bandera. El historial pesa más que el himno y el himno no suma mensajes.',,
      'Sello %PAIS sobre este rastro: faro apagado con himno a máximo. El grupo ya pasó página; el ego todavía discute el acta.',
    ],
  },
  BO: {
    name: 'Bolivia',
    lines: [
      'De %PAIS encima: cerro de orgullo y valle de hechos. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto.',,
      'Con sello %PAIS: cóndor que no despega. El ranking no compra postales ni himnos. El valor cotiza promesas; el contador, hechos.',,
      'Pack %PAIS en el hilo: oxígeno de pose e hipoxia de rastro. Soft power del vacío. El archivo midió sin permiso y el resultado no cabe en el ego.',,
      'Y %PAIS no tapa el rastro: estereotipo completo sin el trabajo detrás. La bandera no mejora el hardware.',,
      'De %PAIS, orgullo anunciado y entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Encima el chip %PAIS: creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Sello %PAIS: cerro de orgullo y valle de hechos con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS al hilo llega ofender fácil y cargar difícil. Presencia sin peso. El valor propio todavía discute el veredicto.',,
      'Con %PAIS de fondo: cóndor que no despega. Documentado. El orgullo encuentra altura imaginaria; el contador, el piso.',,
      'Y el pack %PAIS: ganar la pelea del orgullo y perder la del rastro. Mismo final de siempre: mucho verso, poco número.',,
      'De %PAIS encima no hay indulto de bandera. El historial pesa más que el himno y el himno no suma mensajes.',,
      'Sello %PAIS sobre este rastro: oxígeno de pose e hipoxia de rastro. El grupo ya pasó página; el ego todavía discute el acta.',
    ],
  },
  DO: {
    name: 'República Dominicana',
    lines: [
      'De %PAIS encima: dembow de ego sin drop útil. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto.',,
      'Con sello %PAIS: flow de buffer. El ranking no compra postales ni himnos. El valor cotiza promesas; el contador, hechos.',,
      'Pack %PAIS en el hilo: resort de orgullo con checkout de respeto. Soft power del vacío. El archivo midió sin permiso y el resultado no cabe en el ego.',,
      'Y %PAIS no tapa el rastro: estereotipo completo sin el trabajo detrás. La bandera no mejora el hardware.',,
      'De %PAIS, orgullo anunciado y entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Encima el chip %PAIS: creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Sello %PAIS: dembow de ego sin drop útil con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS al hilo llega ofender fácil y cargar difícil. Presencia sin peso. El valor propio todavía discute el veredicto.',,
      'Con %PAIS de fondo: flow de buffer. Documentado. El orgullo encuentra altura imaginaria; el contador, el piso.',,
      'Y el pack %PAIS: ganar la pelea del orgullo y perder la del rastro. Mismo final de siempre: mucho verso, poco número.',,
      'De %PAIS encima no hay indulto de bandera. El historial pesa más que el himno y el himno no suma mensajes.',,
      'Sello %PAIS sobre este rastro: resort de orgullo con checkout de respeto. El grupo ya pasó página; el ego todavía discute el acta.',
    ],
  },
  HN: {
    name: 'Honduras',
    lines: [
      'De %PAIS encima: tormenta de grito y cero plan. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto.',,
      'Con sello %PAIS: puente que tiembla. El ranking no compra postales ni himnos. El valor cotiza promesas; el contador, hechos.',,
      'Pack %PAIS en el hilo: sirena sin evacuación. Soft power del vacío. El archivo midió sin permiso y el resultado no cabe en el ego.',,
      'Y %PAIS no tapa el rastro: estereotipo completo sin el trabajo detrás. La bandera no mejora el hardware.',,
      'De %PAIS, orgullo anunciado y entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Encima el chip %PAIS: creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Sello %PAIS: tormenta de grito y cero plan con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS al hilo llega ofender fácil y cargar difícil. Presencia sin peso. El valor propio todavía discute el veredicto.',,
      'Con %PAIS de fondo: puente que tiembla. Documentado. El orgullo encuentra altura imaginaria; el contador, el piso.',,
      'Y el pack %PAIS: ganar la pelea del orgullo y perder la del rastro. Mismo final de siempre: mucho verso, poco número.',,
      'De %PAIS encima no hay indulto de bandera. El historial pesa más que el himno y el himno no suma mensajes.',,
      'Sello %PAIS sobre este rastro: sirena sin evacuación. El grupo ya pasó página; el ego todavía discute el acta.',
    ],
  },
  PY: {
    name: 'Paraguay',
    lines: [
      'De %PAIS encima: siesta del aporte. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto.',,
      'Con sello %PAIS: tereré de drama que no alimenta. El ranking no compra postales ni himnos. El valor cotiza promesas; el contador, hechos.',,
      'Pack %PAIS en el hilo: mute educado y ego en pausa. Soft power del vacío. El archivo midió sin permiso y el resultado no cabe en el ego.',,
      'Y %PAIS no tapa el rastro: estereotipo completo sin el trabajo detrás. La bandera no mejora el hardware.',,
      'De %PAIS, orgullo anunciado y entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Encima el chip %PAIS: creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Sello %PAIS: siesta del aporte con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS al hilo llega ofender fácil y cargar difícil. Presencia sin peso. El valor propio todavía discute el veredicto.',,
      'Con %PAIS de fondo: tereré de drama que no alimenta. Documentado. El orgullo encuentra altura imaginaria; el contador, el piso.',,
      'Y el pack %PAIS: ganar la pelea del orgullo y perder la del rastro. Mismo final de siempre: mucho verso, poco número.',,
      'De %PAIS encima no hay indulto de bandera. El historial pesa más que el himno y el himno no suma mensajes.',,
      'Sello %PAIS sobre este rastro: mute educado y ego en pausa. El grupo ya pasó página; el ego todavía discute el acta.',
    ],
  },
  SV: {
    name: 'El Salvador',
    lines: [
      'De %PAIS encima: chispa sin circuito. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto.',,
      'Con sello %PAIS: fusible del chat. El ranking no compra postales ni himnos. El valor cotiza promesas; el contador, hechos.',,
      'Pack %PAIS en el hilo: voltaje de pelea y apagón de sustancia. Soft power del vacío. El archivo midió sin permiso y el resultado no cabe en el ego.',,
      'Y %PAIS no tapa el rastro: estereotipo completo sin el trabajo detrás. La bandera no mejora el hardware.',,
      'De %PAIS, orgullo anunciado y entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Encima el chip %PAIS: creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Sello %PAIS: chispa sin circuito con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS al hilo llega ofender fácil y cargar difícil. Presencia sin peso. El valor propio todavía discute el veredicto.',,
      'Con %PAIS de fondo: fusible del chat. Documentado. El orgullo encuentra altura imaginaria; el contador, el piso.',,
      'Y el pack %PAIS: ganar la pelea del orgullo y perder la del rastro. Mismo final de siempre: mucho verso, poco número.',,
      'De %PAIS encima no hay indulto de bandera. El historial pesa más que el himno y el himno no suma mensajes.',,
      'Sello %PAIS sobre este rastro: voltaje de pelea y apagón de sustancia. El grupo ya pasó página; el ego todavía discute el acta.',
    ],
  },
  NI: {
    name: 'Nicaragua',
    lines: [
      'De %PAIS encima: capítulo sin trama útil. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto.',,
      'Con sello %PAIS: mitin de uno. El ranking no compra postales ni himnos. El valor cotiza promesas; el contador, hechos.',,
      'Pack %PAIS en el hilo: proclama sin recibo. Soft power del vacío. El archivo midió sin permiso y el resultado no cabe en el ego.',,
      'Y %PAIS no tapa el rastro: estereotipo completo sin el trabajo detrás. La bandera no mejora el hardware.',,
      'De %PAIS, orgullo anunciado y entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Encima el chip %PAIS: creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Sello %PAIS: capítulo sin trama útil con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS al hilo llega ofender fácil y cargar difícil. Presencia sin peso. El valor propio todavía discute el veredicto.',,
      'Con %PAIS de fondo: mitin de uno. Documentado. El orgullo encuentra altura imaginaria; el contador, el piso.',,
      'Y el pack %PAIS: ganar la pelea del orgullo y perder la del rastro. Mismo final de siempre: mucho verso, poco número.',,
      'De %PAIS encima no hay indulto de bandera. El historial pesa más que el himno y el himno no suma mensajes.',,
      'Sello %PAIS sobre este rastro: proclama sin recibo. El grupo ya pasó página; el ego todavía discute el acta.',
    ],
  },
  CR: {
    name: 'Costa Rica',
    lines: [
      'De %PAIS encima: pura pose de postcard. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto.',,
      'Con sello %PAIS: hamaca del aporte. El ranking no compra postales ni himnos. El valor cotiza promesas; el contador, hechos.',,
      'Pack %PAIS en el hilo: sonrisa sin carga. Soft power del vacío. El archivo midió sin permiso y el resultado no cabe en el ego.',,
      'Y %PAIS no tapa el rastro: estereotipo completo sin el trabajo detrás. La bandera no mejora el hardware.',,
      'De %PAIS, orgullo anunciado y entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Encima el chip %PAIS: creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Sello %PAIS: pura pose de postcard con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS al hilo llega ofender fácil y cargar difícil. Presencia sin peso. El valor propio todavía discute el veredicto.',,
      'Con %PAIS de fondo: hamaca del aporte. Documentado. El orgullo encuentra altura imaginaria; el contador, el piso.',,
      'Y el pack %PAIS: ganar la pelea del orgullo y perder la del rastro. Mismo final de siempre: mucho verso, poco número.',,
      'De %PAIS encima no hay indulto de bandera. El historial pesa más que el himno y el himno no suma mensajes.',,
      'Sello %PAIS sobre este rastro: sonrisa sin carga. El grupo ya pasó página; el ego todavía discute el acta.',
    ],
  },
  PA: {
    name: 'Panamá',
    lines: [
      'De %PAIS encima: peaje de ego. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto.',,
      'Con sello %PAIS: canal sin barcos. El ranking no compra postales ni himnos. El valor cotiza promesas; el contador, hechos.',,
      'Pack %PAIS en el hilo: deal sin entrega. Soft power del vacío. El archivo midió sin permiso y el resultado no cabe en el ego.',,
      'Y %PAIS no tapa el rastro: estereotipo completo sin el trabajo detrás. La bandera no mejora el hardware.',,
      'De %PAIS, orgullo anunciado y entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Encima el chip %PAIS: creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Sello %PAIS: peaje de ego con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS al hilo llega ofender fácil y cargar difícil. Presencia sin peso. El valor propio todavía discute el veredicto.',,
      'Con %PAIS de fondo: canal sin barcos. Documentado. El orgullo encuentra altura imaginaria; el contador, el piso.',,
      'Y el pack %PAIS: ganar la pelea del orgullo y perder la del rastro. Mismo final de siempre: mucho verso, poco número.',,
      'De %PAIS encima no hay indulto de bandera. El historial pesa más que el himno y el himno no suma mensajes.',,
      'Sello %PAIS sobre este rastro: deal sin entrega. El grupo ya pasó página; el ego todavía discute el acta.',
    ],
  },
  UY: {
    name: 'Uruguay',
    lines: [
      'De %PAIS encima: mate de juicio y cero dulzor. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto.',,
      'Con sello %PAIS: empate eterno del hilo. El ranking no compra postales ni himnos. El valor cotiza promesas; el contador, hechos.',,
      'Pack %PAIS en el hilo: ceño con protocolo. Soft power del vacío. El archivo midió sin permiso y el resultado no cabe en el ego.',,
      'Y %PAIS no tapa el rastro: estereotipo completo sin el trabajo detrás. La bandera no mejora el hardware.',,
      'De %PAIS, orgullo anunciado y entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Encima el chip %PAIS: creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Sello %PAIS: mate de juicio y cero dulzor con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS al hilo llega ofender fácil y cargar difícil. Presencia sin peso. El valor propio todavía discute el veredicto.',,
      'Con %PAIS de fondo: empate eterno del hilo. Documentado. El orgullo encuentra altura imaginaria; el contador, el piso.',,
      'Y el pack %PAIS: ganar la pelea del orgullo y perder la del rastro. Mismo final de siempre: mucho verso, poco número.',,
      'De %PAIS encima no hay indulto de bandera. El historial pesa más que el himno y el himno no suma mensajes.',,
      'Sello %PAIS sobre este rastro: ceño con protocolo. El grupo ya pasó página; el ego todavía discute el acta.',
    ],
  },
  PR: {
    name: 'Puerto Rico',
    lines: [
      'De %PAIS encima: reguetón de ego sin drop. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto.',,
      'Con sello %PAIS: feat que nadie pidió. El ranking no compra postales ni himnos. El valor cotiza promesas; el contador, hechos.',,
      'Pack %PAIS en el hilo: colonia de aplauso. Soft power del vacío. El archivo midió sin permiso y el resultado no cabe en el ego.',,
      'Y %PAIS no tapa el rastro: estereotipo completo sin el trabajo detrás. La bandera no mejora el hardware.',,
      'De %PAIS, orgullo anunciado y entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Encima el chip %PAIS: creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Sello %PAIS: reguetón de ego sin drop con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS al hilo llega ofender fácil y cargar difícil. Presencia sin peso. El valor propio todavía discute el veredicto.',,
      'Con %PAIS de fondo: feat que nadie pidió. Documentado. El orgullo encuentra altura imaginaria; el contador, el piso.',,
      'Y el pack %PAIS: ganar la pelea del orgullo y perder la del rastro. Mismo final de siempre: mucho verso, poco número.',,
      'De %PAIS encima no hay indulto de bandera. El historial pesa más que el himno y el himno no suma mensajes.',,
      'Sello %PAIS sobre este rastro: colonia de aplauso. El grupo ya pasó página; el ego todavía discute el acta.',
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

  // Un solo hilo: actividad + país/gen sin segundo arranque con @
  if (second.startsWith(tag)) {
    second = second.slice(tag.length).replace(/^[,:\s]+/, '');
    if (second) second = second.charAt(0).toLowerCase() + second.slice(1);
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
