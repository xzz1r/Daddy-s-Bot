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
  '_Siguiente. Este ya no tiene arreglo ni apelación._',,
  '_El espejo también se ríe, y no es de complicidad._',,
  '_No hay filtro, bio ni pose que tape este historial._',,
  '_Su autoestima acaba de pedir la baja voluntaria._',,
  '_Archivado en la carpeta de los que sobran con wifi._',,
  '_Y lo peor: se le nota que le duele y aun así no cambia._',,
  '_El contador firmó. Solo puede alegar en silencio._',,
  '_Cuando el ego se le baje, el grupo ya habrá pasado de página._',
];

const OWNER_ROAST = [
  '%N, el dueño intocable: todo le sale y encima tiene cara de que el resto existe de favor. Eres el jefe que nadie eligió y todos aguantan. El día que el ego se te caiga, el chat festeja en silencio.',
  '%N camina como si el WiFi saliera de su culo. Tiene razón demasiadas veces y por eso da asco. Baja un cambio antes de que te conviertan en sticker de advertencia.',
  '%N, hijo de puta con suerte: gana, manda y todavía se ofende. Tutorial que nadie pidió. No te odian por poderoso; te odian porque eres insufrible con pruebas.'
];

const ACT_0 = [
  '%N: cero mensajes. No es misterio, es un parásito con avatar. Lee el drama ajeno como pornografía gratis: sin pagar, sin aportar, sin que le tiemble el orgullo de fantasma.',,
  '%N en 0. El grupo funciona mejor sin su ruido y el historial lo firma. Fantasma de lujo, utilidad de cementerio, autoestima de sticker apagado.',,
  '%N, contador en cero. Ocupa sitio como un muerto en lista de asistencia. Si el respeto se cobrara por mensaje, debería deudas desde el día que se agregó.',,
  'Cero mensajes, %N. Online para fisgonear, offline para existir. El ranking de útiles nunca anotó su nombre; el de sobrantes sí, en negrita.',,
  '%N no escribe. Mediocridad con WiFi. El chat aprendió a construir sin su turno y el hueco no duele a nadie: solo al ego que se esconde detrás del silencio.',,
  '%N, 0 en el marcador. Parásito de bajo consumo: el peor, porque ni da asco productivo. Decoración con número de teléfono.',,
  '%N con la lista y sin la voz. Estar sin hablar no te hace interesante: te hace sobrante. La autoestima que vive de “alguien día me va a extrañar” ya está podrida.',,
  '%N, cero rastro útil. El archivo te tiene de florero. Seguí mirando el hilo como quien mira una pelea desde el balcón: cobarde con buena señal.',
];

const ACT_LOW = [
  '%N con %C mensajes: ruido de fondo. Molesta lo justo y aporta lo que un zumbido. Pestaña que nadie cierra del todo y nadie extraña cuando se cuelga.',,
  '%C mensajes de %N. Aparece para recordar que existe y desaparece para que el olvido sea cómodo. Irrelevante con teclado a medias y ego de protagonista.',,
  '%N, %C en el marcador. Ni fantasma limpio ni gente útil: limbo de los que sobran y no se van. El grupo te administra como un mosquito a las tres de la mañana.',,
  '%C textos, %N. Prueba el agua con el pie y nunca se tira. Cobarde de teclado con discurso de quien ya cruzó el Atlántico a nado.',,
  '%N lleva %C. Intermitente de manual: molesta, se va, vuelve sin haber cargado nada. Suscripción que nadie renueva y aun así pide platea.',,
  '%N con solo %C. Casi no existe y el orgullo pide micrófono. El chat lo tiene en “tal vez después”; el después es una tumba administrativa.',,
  '%C mensajes, %N. Parásito de raciones chicas: está, mira, no carga. Insuficiente para voz, sobrado para espacio emocional que nadie le cedió.',,
  '%N, %C. Construye olvido con precisión de relojero. Existir en la lista no es existir en el hilo; el valor propio todavía no se enteró del fraude.',
];

const ACT_MID = [
  '%N con %C mensajes: tibio profesional. Opinión de relleno, ego de estrella. Nadie pelea por él en el ranking y aun así habla como si el grupo le debiera el alquiler.',,
  '%C en el contador de %N. Mínimo para abrir el hocico, máximo para no cargar una mierda. Copiloto que toca el volante cuando el camino ya está derecho.',,
  '%N, %C. Mapa a lápiz. Vendió “existir” como si fuera “importar”. El grupo lo lee en diagonal y se le olvida el nombre a la tercera línea.',,
  '%C mensajes: %N es el café tibio del chat. Nadie lo tira, nadie lo pide. Autoestima de producto en oferta con fecha vencida.',,
  '%N lleva %C. Serie cancelable a mitad de temporada. Ruido, pose, cero peso: el patrón ya apesta a relleno.',,
  '%N con %C. Suficiente para defenderse, poco para que alguien le deba algo. Ego de outlier, datos de promedio flojo con wifi.',,
  '%C textos, %N. Zona gris. “Meh” con teclado: el ranking no pelea por los meh y él sigue soltando veredictos como juez de barrio.',,
  '%N, %C. Racha de tibieza disfrazada de presencia. El contador le hace señas a su autoestima: sigue buscando de qué vivir, pobre iluso.',
];

const ACT_HI = [
  '%N con %C mensajes: ya no es invisible, todavía no es indispensable. Empleado del mes en oficina sin mes. El grupo lo reconoce; no le debe la vida ni el ego inflado.',,
  '%C en el contador, %N. Hay rastro y hay techo de yeso. Aporta lo justo para no borrarlo y poco para que alguien lo defienda cuando llega el asado.',,
  '%N, %C. Ego hinchado antes que el mérito. Borrador con firma. El “en proceso” del respeto venció y no le renovaron el contrato emocional.',,
  '%C mensajes: %N pertenece al chat; el chat no depende de él. Cable de más: útil en teoría, olvidable en la práctica, soberbio en todas.',,
  '%N lleva %C. Clase media del hilo con discurso de primera fila. El desajuste entre lo que cree valer y lo que pesa se lee sin lupa ni buena fe.',,
  '%N con %C. Motor a media marcha. Llega cuando el trabajo pesado ya empezó y pide medalla de apertura. El archivo se ríe en silencio.',,
  '%C textos, %N. Dejó de ser fantasma y todavía no es columna. Puente a mitad de río: que no cruce con el ego tan hinchado o se ahoga solo.',,
  '%N, %C. El mapa lo tiene; el podio no. Presencia sin ser estructura. La autoestima apoyada solo en “estar” es un seguro de ridículo.',
];

const ACT_TOP = [
  '%N con %C mensajes. Se nota: empuja el hilo. Que no lo convierta en soberbia de dueño. El contador es cuota de trabajo, no aureola de intocable ni permiso para ser insoportable.',,
  '%C en el marcador de %N. Motor, no decoración. Si el ego se le sube, el próximo roast cobra intereses y el archivo tiene de dónde agarrarlo del cuello.',,
  '%N, %C. Respeto farmeado a base de escribir. Que no lo gaste en teatro: cuanto más alto el número, más rico el asado cuando alguien decide servirlo caliente.',,
  'Con %C textos, %N ya es esqueleto del hilo. La autoestima también se oxida si solo mira el contador y se olvida de que el grupo no le debe sumisión.',,
  '%N lleva %C. Actividad real. A este nivel el golpe duele más porque el archivo lo respaldaba y aun así el orgullo se le desborda por las orejas.',,
  '%C mensajes, %N. Constancia que pesa. Respeto ganado; soberbia en observación. Un paso en falso y el roast usa su propio historial como cuchillo.',,
  '%N con %C. Columna, no adorno. Que no arruine el crédito con pose de santo: aquí nadie se vuelve intocable por teclear mucho.',,
  '%N, %C en el marcador. De los que sostienen cuando el hilo se cae. Eso es poder: si lo gasta en teatro barato, el grupo se lo cobra doble y con propina de humillación.',
];

const DEST_GEN = [
  'Y encima el ego hinchado sin base. Se mira como protagonista y el archivo lo tiene de extra de tercera. Autoestima de prestado que el contador ya embargó con intereses de usurero.',,
  'Y el valor propio cotizando en promesas que nadie firmó. El grupo hizo la resta: sobra con wifi y discurso de imprescindible. Patético de manual.',,
  'Y todavía negocia respeto que no farmeó. El espejo y el contador coinciden: bajo esa pose no hay mucho que salvar, solo maquillaje de orgullo barato.',,
  'Y la pose de persona importante sin historial que lo respalde. El orgullo grita, el rastro susurra, el grupo ya eligió a cuál hacer caso.',,
  'Y el orgullo gastando de más con ingresos de nada. Déficit crónico de mérito. Este mensaje es el cobrador y no acepta plazos ni lágrimas.',,
  'Y le duele más la exposición que la mediocridad que la provocó. Prioridad clara: imagen sí, aporte no. Diseño de fraude emocional.',,
  'Y cree que el silencio del grupo es respeto. No: es indiferencia educada. Confundir las dos es el hobby favorito de su autoestima podrida.',,
  'Y el ranking no lo odia. Peor: lo administra como problema menor. Ser irrelevante duele más que ser odiado, y todavía no lo procesó el muy iluso.',
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
      'Y de %PAIS, %N: cara de “soy europeo” con ADN de que te parieron detrás de un kiosco en Once. Barba de puberto, ojos de superioridad prestada y delirio de blanco que no convence ni al espejo del baño.',,
      'Pack %PAIS, %N: cementerio de pesos donde la inflación te coje más fuerte que cualquier puto. Gritan Messi como si borrara Malvinas, los cagones y la costumbre de culpar al resto del planeta por su propia miseria.',,
      'Clásico %PAIS: indio con complex de imperio. %N habla como si el Río de la Plata fuera el Támesis y el historial lo desmiente en cada mensaje flojo. Sudaca pretencioso con wifi y sin sustancia.',,
      'De %PAIS llegó %N con el manual del che boludo ofendido. Pierden guerras, pierden la moneda, ganan en verso vacío. El ranking no acepta tango como pago del déficit de aporte.',,
      '%N, sello %PAIS: soberbia de selección y rendimiento de reserva de barrio. Se creen el faro de Latinoamérica y no llegan al farolito del hilo. El ego es más alto que el default del peso.',,
      'Y %PAIS le dio a %N la costumbre de mirar al resto como “el interior”. Mucho norte en la boca, poco terreno ganado. El chat lo midió sin cátedra y el orgullo no sobrevivió la auditoría.',,
      'Exportación %PAIS: monólogo de sobremesa, resultado de amistoso. %N explica el continente y no sostiene un hilo. Corrector automático del grupo sin permiso y sin obra.',,
      'De %PAIS, %N trae el pack completo: ofenderse fácil, aportar poco, gritar “se entiende todo” cuando no se entiende ni el aporte. Versión fallida de Europa con asado de fondo y vacío de rastro.',,
      '%N, estereotipo %PAIS sin anestesia: peso que se derrite, ego que se infla, Malvinas que se mencionan solo para no mirar el espejo. El contador no llora con ustedes.',,
      'Y con %PAIS de bandera, %N convierte cada opinión en sentencia nacional. El grupo no es su provincia. Baja el himno; sube el rastro o acepta que eres el meme que ustedes mismos inventaron.',,
      'De %PAIS llegaste a vender superioridad y te cobraron en humillación. %N, el pasaporte no blanquea el hardware. Se nota el default en la cara y en el historial.',,
      'Pack %PAIS sobre %N: labia de intelectual de café, utilidad de kiosco cerrado. El ranking no discute en metáforas porteñas; discute en números y vas perdiendo feo.',
    ],
  },
  CO: {
    name: 'Colombia',
    lines: [
      'Y de %PAIS, %N: labia de vivo que acomoda todo menos el propio historial. Sonrisa de comercial, entrega de flyer. El grupo ya no compra humo; te archiva con el resto de promesas que apestan a gasolina barata.',,
      'Pack %PAIS, %N: confía en que el cuento tapa el vacío. Malicia para el chisme, torpeza para el aporte. Te crees táctico y sales predecible: el vivo acá queda en pelotas frente al contador.',,
      'Clásico %PAIS: “tranquilo que se resuelve”. Nunca se resuelve. %N es reunión que pudo ser un mensaje y ni el mensaje sirvió. Paisa de promesas, costeño de plazos, vacío de resultados.',,
      'De %PAIS llegó %N con el software del deal eterno. Mucho “ya casi”, poco “ya está”. El ranking no fuma ese cuento ni acepta labia como moneda. Autoestima en mostrador de liquidación.',,
      '%N, sello %PAIS: confunde ser pillo con ser útil. No es ninguna de las dos. El chat lo huele sin detector de mentiras; el orgullo sigue regateando el precio del ridículo.',,
      'Y %PAIS le enseñó a %N a vender humo al por menor. Comercial de madrugada: el producto no llega, el anuncio sigue, el grupo scrollea. Basura con acento y ego de franquicia pirata.',,
      'Exportación %PAIS: viveza de manual, constancia de flyer mojado. %N sonríe el trato y no firma la entrega. El cobrador es el contador y no acepta “mañana te lo acomodo”.',,
      'De %PAIS, %N hace de la confianza un tutorial sin evidencia. Deal de ego, checkout del grupo. Carrito del respeto abandonado en la pasarela.',,
      '%N, estereotipo %PAIS: labia alta, rastro bajo, orgullo de quien cree que el acento abre puertas. Acá el acento solo abre el roast.',,
      'Y con %PAIS de fondo, %N convierte cada hilo en feria de cuentos. El detector de humo del grupo ya está en rojo. Tu valor propio no se enteró de que el local cerró por fraude.',,
      'De %PAIS llegaste a acomodar y te acomodaron en la estantería de lo prescindible. %N, la labia no levanta el historial. El orgullo, menos.',,
      'Pack %PAIS sobre %N: pillo de WhatsApp, inútil de archivo. El ranking no hace de cómplice del vivo; te deja en la mesa de los que hacen ruido y no pesan.',
    ],
  },
  MX: {
    name: 'México',
    lines: [
      'Y de %PAIS, %N: volumen sin argumento. Drama con teclado, todo escena, nada guion. El grupo te baja el gain y el ego sigue a máximo como si el grito fuera curriculum.',,
      'Pack %PAIS, %N: ruido fácil, criterio difícil. Grita como si fuera tesis doctoral. Rico en decibeles, pobre en sustancia. El valor propio no se mide en plazas ni en “no manches” mentales.',,
      'Clásico %PAIS: ofenderse por todo y aportar nada. Piñata del hilo. Todos saben dónde pegar; el dulce es poco y el orgullo prefiere el show al contenido.',,
      'De %PAIS llegó %N con telenovela de un capítulo repetido. Final conocido: saturación. El público pidió la cuenta y no dejó propina de respeto.',,
      '%N, sello %PAIS: alarma permanente, líder nunca. Mucho “a mí nadie me dice” mientras el contador le dice todo en la cara. Escucha el número, no el orgullo de feria.',,
      'Y %PAIS le dio a %N el pack farándula: montar drama para no montar trabajo. Hueco detrás del telón. El ranking midió el agujero y lo publicó sin filtro.',,
      'Exportación %PAIS: intensidad de plaza, utilidad de cero. %N convierte todo en escena. El chat no es tu set: apaga reflectores o acepta que eres ruido con salsa.',,
      'De %PAIS, %N hace del grito una personalidad completa. El archivo no llora. El micrófono del drama no te hace protagonista; te hace alarma de vecindario con ego de estreno fallido.',,
      '%N, estereotipo %PAIS: fiesta de volumen, funeral de aporte. El show no tapa el hueco; el contador ya sacó el tamaño del vacío en primera plana.',,
      'Y con %PAIS de fondo, %N prefiere el conflicto al aporte porque el silencio le enseña lo poco que pesa. Cobarde con bocina.',,
      'De %PAIS llegaste a saturarte el propio hilo. %N, baja el gain. El respeto no se grita: se farmea, y vas en números rojos.',,
      'Pack %PAIS sobre %N: pirotecnia verbal, plan operativo en cero. El grupo pidió skip. Tu autoestima aún cree que hay bis de humillación ajena.',
    ],
  },
  VE: {
    name: 'Venezuela',
    lines: [
      'Y de %PAIS, %N: noticiero sin cierre. Agravio con teclado 24/7. El grupo no es tu gobierno ni tu canal de denuncia; el ego tampoco debería emitir en cadena nacional.',,
      'Pack %PAIS, %N: denuncia a volumen alto, autocrítica en cero. Rico en queja, pobre en plan. El valor propio vive de titulares y se muere de hechos como la luz en Caracas.',,
      'Clásico %PAIS: “nadie entiende” como personalidad. Himno a la ofensa colectiva. El chat entiende de sobra; por eso no te debe empatía infinita ni platea de mártir.',,
      'De %PAIS llegó %N con asamblea permanente y cero acta de aporte. Resistencia en el discurso, ausencia en el plan. El ranking no vota tu lista de agravios.',,
      '%N, sello %PAIS: agraviado vitalicio. El ranking reparte números, no cupos de drama. La queja crónica no te hace lúcido: te hace predecible y pesado como discurso de balcón.',,
      'Y %PAIS le enseñó a %N a convertir todo en agravio. El archivo pide hechos y sigue esperando el primer recibo útil. Orgullo que cotiza en reclamo falso.',,
      'Exportación %PAIS: micrófono del drama como identidad. %N no tiene plan B detrás del volumen. El grupo a veces construye sin tu narración y se nota la mejora del clima.',,
      'De %PAIS, %N pelea por todo y construye poco. No eres indispensable: eres ruido con bandera. El valor propio no procesó el descenso de categoría.',,
      '%N, estereotipo %PAIS: urgencia moral, saturación con himno. Asamblea de uno. El ranking no te debe escenario; te debe el silencio que no aguantas.',,
      'Y con %PAIS de fondo, %N prefiere el himno al rastro. El cobrador de sustancia llamó. No hay más plazos de drama gratis en este chat.',,
      'De %PAIS llegaste a narrar el incendio y a no traer un balde. %N, baja el micrófono. El respeto no se ruega a gritos de exilio emocional.',,
      'Pack %PAIS sobre %N: víctima profesional, aportante amateur. El contador no acepta dólares de resentimiento como moneda de respeto.',
    ],
  },
  PE: {
    name: 'Perú',
    lines: [
      'Y de %PAIS, %N: tribunal sin toga. Juzga en silencio y aporta en cuotas. El grupo no pidió sentencia; el ego se inventó el juzgado, el cargo y la pena para los demás.',,
      'Pack %PAIS, %N: formalismo alto, entrega intermitente. Top en caras largas, flotando en peso real. Mohín de brochure, sustancia en la nevera desde el gobierno anterior.',,
      'Clásico %PAIS: ofensa en diferido, resentimiento bien peinado. Preferimos un no con fecha a tu silencio con veneno. El archivo no se impresiona con el ceño de cerro.',,
      'De %PAIS llegó %N haciéndose el humilde y midiendo a todos con regla ajena. Juez sin expediente. La dignidad no se esconde detrás del “ya pues” vacío.',,
      '%N, sello %PAIS: ego de pausa sin sustancia. El ranking cotiza carga, no agrio. La pausa no es profundidad: es flojera con pose de adulto responsable.',,
      'Y %PAIS le dio a %N el silencio estratégico que en realidad es vacío. Se te oye igual. El contador registra la ausencia; el orgullo finge misterio andino.',,
      'Exportación %PAIS: juicio en la cara como único aporte del día. Agrio bien vestido. El valor propio no se plancha con orgullo de terraza mirando al resto como inferior.',,
      'De %PAIS, %N confunde misterio con flojera de entrega. Pose de profundidad sin disco duro. El ranking no cotiza ceños; cotiza rastro, y vas en rojo.',,
      '%N, estereotipo %PAIS: adulto de la sala que no sostiene el hilo cuando pesa. Superioridad sin expediente. El peso real está en otra mesa.',,
      'Y con %PAIS de fondo, %N convierte cada pausa en sentencia moral. El chat no es tu juzgado. Baja el martillo; no tienes autoridad de número.',,
      'De %PAIS llegaste a mirar feo y a cargar poco. %N, el feo no suma puntos. El contador ya hizo la cuenta sin tu visto bueno.',,
      'Pack %PAIS sobre %N: compostura de ego, sustancia aplazada. El ranking no espera tu deshielo. Se pudre la pose antes que llegue el aporte.',
    ],
  },
  BR: {
    name: 'Brasil',
    lines: [
      'Y de %PAIS, %N: after sin sustancia. Ambienta todo y no carga nada. El grupo no es tu camarote ni tu camarote de resort; el ego no debería vivir de playlist ajena.',,
      'Pack %PAIS, %N: sonrisa grande, aporte chico. Hit en ritmo, intro saltado en resultados. El valor propio no se mide en bpm ni en “só alegria” de borracho.',,
      'Clásico %PAIS: carnaval de un solo flotante —tú—. El chat bajó el volumen. Resaca con beat, sin coreografía útil, orgullo todavía en la avenida pidiendo like.',,
      'De %PAIS llegó %N de estrella en chat de barrio. Fútbol en la boca, cero en el hilo. Fuera de juego pitado por el contador sin VAR que te salve el orgullo.',,
      '%N, sello %PAIS: fiesta verbal, utilidad en resaca. El after en la cabeza como único plan. El ranking no da credits por ambientar el vacío con glitter.',,
      'Y %PAIS le enseñó a %N el ruido alegre que el grupo ya silenció. El ritmo no te hace indispensable; te hace karaoke con ego de headliner fallido.',,
      'Exportación %PAIS: hueco detrás del sambódromo mental. Ambientar para no aportar. El glitter no tapa el agujero; el contador lo mide en centímetros de ridículo.',,
      'De %PAIS, %N hace de la gracia un tutorial sin gracia. Confeti sin rastro. “Só alegria” como excusa de no entregar. Acá no suma sin número detrás.',,
      '%N, estereotipo %PAIS: selección mental, amistoso flojo en el hilo. El chat ya hizo los cambios. El orgullo no entró en la convocatoria del ranking.',,
      'Y con %PAIS de fondo, %N prefiere el desfile al descargue. El muelle espera carga; tú traes glitter. El valor propio naufraga en la resaca del ego.',,
      'De %PAIS llegaste a ambientar la nada. %N, apaga el beat. El respeto no se baila: se farmea, y vas descalzo de méritos.',,
      'Pack %PAIS sobre %N: subir el volumen de la fiesta y bajar el del aporte. Show sin sustancia. Autoestima que aún cree que hay bis de aplauso falso.',
    ],
  },
  CL: {
    name: 'Chile',
    lines: [
      'Y de %PAIS, %N: frío administrativo y aporte tibio. Mirada por encima del hombro. El grupo no es tu sucursal ni tu checklist moral; el ego no es gerencia de nada.',,
      'Pack %PAIS, %N: crítica fina, autocrítica nula. Estándar en la boca, carga en letra chica. El valor propio cotiza normas que tú mismo incumples con elegancia de banco.',,
      'Clásico %PAIS: “acá se hace bien” sin mostrar el bien. Superioridad sin expediente. Adulto de la sala que no sostiene el hilo cuando pesa de verdad.',,
      'De %PAIS llegó %N con soberbia ordenada. El chat hizo la auditoría sin tu firma. El mohín técnico no suma puntos de respeto ni de rastro útil.',,
      '%N, sello %PAIS: ego de checklist. Distancia olímpica, utilidad tibia. Confundes orden con ser interesante; el archivo no se impresiona con el hielo de oficina.',,
      'Y %PAIS le dio a %N el silencio educado como “estándar”. No lo es: es flojera con buena ortografía. El ranking cotiza calor de aporte, no tipografía de orgullo.',,
      'Exportación %PAIS: criticar el proceso ajeno y flaquear en el propio. El contador lo dejó en actas sin tu visto bueno. Tibieza con corbata imaginaria.',,
      'De %PAIS, %N vende compostura y entrega suspensión. El contador no hiberna contigo. “Hay que ser serios” mientras el rastro pide seriedad tuya: cinismo de manual.',,
      '%N, estereotipo %PAIS: frío sin resultado. Archivo frío, orgullo intacto, utilidad en duda. La autoestima se congela sola cuando el hilo no te necesita.',,
      'Y con %PAIS de fondo, %N mira feo el desorden ajeno y aporta el propio en cuotas. El espejo del ranking es más honesto que tu mohín de ejecutivo frustrado.',,
      'De %PAIS llegaste a ordenar el mundo y a desordenar tu rastro. %N, el frío no te hace superior: te hace prescindible con estilo de banco cerrado.',,
      'Pack %PAIS sobre %N: gerencia de bolsillo sin resultados. El chat no renueva el contrato emocional. Baja el checklist; no tienes autoridad de número.',
    ],
  },
  EC: {
    name: 'Ecuador',
    lines: [
      'Y de %PAIS, %N: molestia suave, drama de baja intensidad y alta constancia. El grupo no te debe el clima emocional del día ni el abono de ofensas chicas.',,
      'Pack %PAIS, %N: ofensa fácil, propuesta difícil. Lleno de “me sacaron”, vacío de aporte. El valor propio come queja y engorda ridículo con salsa de víctima.',,
      'Clásico %PAIS: víctima con el teclado, verdugo con el silencio. Eres el clima del hilo. La dignidad no es meteorología y el ranking no lleva termómetro de tu drama.',,
      'De %PAIS llegó %N con boletín de molestias. Preferimos el parte seco del ranking. El drama en cuotas no cotiza: satura y aburre como llovizna sin fin.',,
      '%N, sello %PAIS: ego de agravio chico. Sensibilidad selectiva. Confundes ser sensible con ser central; el archivo te tiene de ruido bajo con wifi.',,
      'Y %PAIS le enseñó a %N la llovizna emocional. El grupo sacó el paraguas. Empatía infinita no es un derecho tuyo; el contador no firma ese cheque sin fondo.',,
      'Exportación %PAIS: barro fino en el hilo. Queja de baja intensidad, resultado grueso en vacío. La autoestima prefiere el clima al rastro porque el rastro duele más.',,
      'De %PAIS, %N alarga el conflicto porque el silencio le enseña lo poco que pesa. Cobarde de tono suave. El silencio era información; tú lo trataste como insulto nacional.',,
      '%N, estereotipo %PAIS: saturación de poco. El chat no es tu parte meteorológico. Baja la queja; sube el rastro o acepta la irrelevancia con humedad.',,
      'Y con %PAIS de fondo, %N convierte cada roce en temporada de lluvias. El grupo ya tiene impermeable. Tu valor propio sigue empapado de ofensa barata.',,
      'De %PAIS llegaste a cobrar clima y a pagar cero sustancia. %N, el termómetro del ranking marca frío de utilidad y todavía discutes el clima.',,
      'Pack %PAIS sobre %N: “es que me sacaron” como personalidad completa. El ranking no compra ese boleto. Archivo seco, orgullo mojado, aporte en huelga.',
    ],
  },
  ES: {
    name: 'España',
    lines: [
      'Y de %PAIS, %N: arrogancia con prefijo 34. Europeo superior en un chat que no pide pasaporte. Mucho imperio en la boca, poco imperio en el contador, autoestima de terraza a las tres.',,
      'Pack %PAIS, %N: soberbia de caña, entrega de menú del día. Corrige el acento ajeno y aporta en cuotas. VIP mental, operativa de sobras, ego de que el resto es “sudaca de wifi”.',,
      'Clásico %PAIS: Latinoamérica como patio trasero. Tutorial de “en España se hace así” que nadie pidió. El chat no es tu comunidad de vecinos ni tu EBAU emocional de sobremesa.',,
      'De %PAIS llegó %N con monólogo de bar. Centro de Europa en grupo hispano. La dignidad pidió cierre; el ego pidió otra caña y otra corrección ortográfica inútil.',,
      '%N, sello %PAIS: corrector del continente sin cargo. El valor depende de ganar sobremesas; por eso pierde el hilo cuando toca cargar de verdad y no de zeta.',,
      'Y %PAIS le dio a %N el “el español de verdad es el mío”. Spoiler: el ranking escribe en números, no en lecturas de RAE. La autoestima no aprobó el examen de rastro.',,
      'Exportación %PAIS: cinismo de capital. Todo le parece provinciano menos su vacío. El público pidió la cuenta; no dejó propina de sustancia, solo de condescendencia.',,
      'De %PAIS, %N explica la vida ajena y no arregla la propia. PowerPoint de bar sin botones. El “ustedes no entienden Europa” ya aburrió: acá se entendió el vacío de sobra.',,
      '%N, estereotipo %PAIS: soberbia de imperio, cimientos de bar de pueblo. El ridículo lo trabajó entre caña y caña. El ranking no hace excepciones ibéricas ni descuentos por jamón.',,
      'Y con %PAIS de bandera, %N convierte cada chat en tertulia de superioridad. El grupo no es La Sexta de su ego. El contador ya cambió de canal a uno donde aportan.',,
      'De %PAIS llegaste a dar lecciones y te llevaste el roast. %N, el pasaporte no mejora el hardware. Se nota el default europeo de aportar poco y opinar mucho.',,
      'Pack %PAIS sobre %N: condescendencia hasta que pide respeto. El archivo no hace aduanas sentimentales. Baja el monólogo; sube el rastro o vuelve a la terraza.',
    ],
  },
  GT: {
    name: 'Guatemala',
    lines: [
      'Y de %PAIS, %N: volcán de ego y ceniza de aporte. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto que no mereció.',,
      'Pack %PAIS, %N: misterio de postal. El ranking no compra postales ni himnos. El valor propio cotiza promesas; el contador cotiza hechos, y vas en rojo.',,
      'Clásico %PAIS: indio de Instagram con wifi de cafetería. Soft power del vacío. El archivo te midió sin permiso y el resultado no cabe en tu ego.',,
      'De %PAIS llegó %N con el estereotipo completo y sin el trabajo detrás. La bandera no mejora el hardware. Se nota el default en el rastro.',,
      '%N, sello %PAIS: orgullo anunciado, entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Y %PAIS le dio a %N la costumbre de creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Exportación %PAIS: volcán de ego y ceniza de aporte con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS, %N ofende fácil y carga difícil. Presencia sin peso. El valor propio todavía discute el veredicto con el espejo.',,
      '%N, estereotipo %PAIS sin filtro: misterio de postal. Documentado. El orgullo encuentra altura imaginaria; el contador encuentra el piso.',,
      'Y con %PAIS de fondo, %N gana la pelea del orgullo y pierde la del rastro. Mismo final que medio continente: mucho verso, poco número.',
    ],
  },
  CU: {
    name: 'Cuba',
    lines: [
      'Y de %PAIS, %N: discurso eterno y aporte en cartilla. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto que no mereció.',,
      'Pack %PAIS, %N: resistencia solo al trabajo. El ranking no compra postales ni himnos. El valor propio cotiza promesas; el contador cotiza hechos, y vas en rojo.',,
      'Clásico %PAIS: faro apagado con himno a todo volumen. Soft power del vacío. El archivo te midió sin permiso y el resultado no cabe en tu ego.',,
      'De %PAIS llegó %N con el estereotipo completo y sin el trabajo detrás. La bandera no mejora el hardware. Se nota el default en el rastro.',,
      '%N, sello %PAIS: orgullo anunciado, entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Y %PAIS le dio a %N la costumbre de creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Exportación %PAIS: discurso eterno y aporte en cartilla con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS, %N ofende fácil y carga difícil. Presencia sin peso. El valor propio todavía discute el veredicto con el espejo.',,
      '%N, estereotipo %PAIS sin filtro: resistencia solo al trabajo. Documentado. El orgullo encuentra altura imaginaria; el contador encuentra el piso.',,
      'Y con %PAIS de fondo, %N gana la pelea del orgullo y pierde la del rastro. Mismo final que medio continente: mucho verso, poco número.',
    ],
  },
  BO: {
    name: 'Bolivia',
    lines: [
      'Y de %PAIS, %N: cerro de orgullo y valle de hechos. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto que no mereció.',,
      'Pack %PAIS, %N: cóndor que no despega. El ranking no compra postales ni himnos. El valor propio cotiza promesas; el contador cotiza hechos, y vas en rojo.',,
      'Clásico %PAIS: oxígeno de pose, hipoxia de rastro. Soft power del vacío. El archivo te midió sin permiso y el resultado no cabe en tu ego.',,
      'De %PAIS llegó %N con el estereotipo completo y sin el trabajo detrás. La bandera no mejora el hardware. Se nota el default en el rastro.',,
      '%N, sello %PAIS: orgullo anunciado, entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Y %PAIS le dio a %N la costumbre de creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Exportación %PAIS: cerro de orgullo y valle de hechos con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS, %N ofende fácil y carga difícil. Presencia sin peso. El valor propio todavía discute el veredicto con el espejo.',,
      '%N, estereotipo %PAIS sin filtro: cóndor que no despega. Documentado. El orgullo encuentra altura imaginaria; el contador encuentra el piso.',,
      'Y con %PAIS de fondo, %N gana la pelea del orgullo y pierde la del rastro. Mismo final que medio continente: mucho verso, poco número.',
    ],
  },
  DO: {
    name: 'República Dominicana',
    lines: [
      'Y de %PAIS, %N: dembow de ego sin drop útil. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto que no mereció.',,
      'Pack %PAIS, %N: flow de buffer. El ranking no compra postales ni himnos. El valor propio cotiza promesas; el contador cotiza hechos, y vas en rojo.',,
      'Clásico %PAIS: resort de orgullo con checkout de respeto. Soft power del vacío. El archivo te midió sin permiso y el resultado no cabe en tu ego.',,
      'De %PAIS llegó %N con el estereotipo completo y sin el trabajo detrás. La bandera no mejora el hardware. Se nota el default en el rastro.',,
      '%N, sello %PAIS: orgullo anunciado, entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Y %PAIS le dio a %N la costumbre de creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Exportación %PAIS: dembow de ego sin drop útil con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS, %N ofende fácil y carga difícil. Presencia sin peso. El valor propio todavía discute el veredicto con el espejo.',,
      '%N, estereotipo %PAIS sin filtro: flow de buffer. Documentado. El orgullo encuentra altura imaginaria; el contador encuentra el piso.',,
      'Y con %PAIS de fondo, %N gana la pelea del orgullo y pierde la del rastro. Mismo final que medio continente: mucho verso, poco número.',
    ],
  },
  HN: {
    name: 'Honduras',
    lines: [
      'Y de %PAIS, %N: tormenta de grito y cero plan. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto que no mereció.',,
      'Pack %PAIS, %N: puente que tiembla. El ranking no compra postales ni himnos. El valor propio cotiza promesas; el contador cotiza hechos, y vas en rojo.',,
      'Clásico %PAIS: sirena sin evacuación. Soft power del vacío. El archivo te midió sin permiso y el resultado no cabe en tu ego.',,
      'De %PAIS llegó %N con el estereotipo completo y sin el trabajo detrás. La bandera no mejora el hardware. Se nota el default en el rastro.',,
      '%N, sello %PAIS: orgullo anunciado, entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Y %PAIS le dio a %N la costumbre de creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Exportación %PAIS: tormenta de grito y cero plan con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS, %N ofende fácil y carga difícil. Presencia sin peso. El valor propio todavía discute el veredicto con el espejo.',,
      '%N, estereotipo %PAIS sin filtro: puente que tiembla. Documentado. El orgullo encuentra altura imaginaria; el contador encuentra el piso.',,
      'Y con %PAIS de fondo, %N gana la pelea del orgullo y pierde la del rastro. Mismo final que medio continente: mucho verso, poco número.',
    ],
  },
  PY: {
    name: 'Paraguay',
    lines: [
      'Y de %PAIS, %N: siesta del aporte. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto que no mereció.',,
      'Pack %PAIS, %N: tereré de drama que no alimenta. El ranking no compra postales ni himnos. El valor propio cotiza promesas; el contador cotiza hechos, y vas en rojo.',,
      'Clásico %PAIS: mute con foto y ego en pausa. Soft power del vacío. El archivo te midió sin permiso y el resultado no cabe en tu ego.',,
      'De %PAIS llegó %N con el estereotipo completo y sin el trabajo detrás. La bandera no mejora el hardware. Se nota el default en el rastro.',,
      '%N, sello %PAIS: orgullo anunciado, entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Y %PAIS le dio a %N la costumbre de creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Exportación %PAIS: siesta del aporte con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS, %N ofende fácil y carga difícil. Presencia sin peso. El valor propio todavía discute el veredicto con el espejo.',,
      '%N, estereotipo %PAIS sin filtro: tereré de drama que no alimenta. Documentado. El orgullo encuentra altura imaginaria; el contador encuentra el piso.',,
      'Y con %PAIS de fondo, %N gana la pelea del orgullo y pierde la del rastro. Mismo final que medio continente: mucho verso, poco número.',
    ],
  },
  SV: {
    name: 'El Salvador',
    lines: [
      'Y de %PAIS, %N: chispa sin circuito. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto que no mereció.',,
      'Pack %PAIS, %N: fusible del chat. El ranking no compra postales ni himnos. El valor propio cotiza promesas; el contador cotiza hechos, y vas en rojo.',,
      'Clásico %PAIS: voltaje de pelea y apagón de sustancia. Soft power del vacío. El archivo te midió sin permiso y el resultado no cabe en tu ego.',,
      'De %PAIS llegó %N con el estereotipo completo y sin el trabajo detrás. La bandera no mejora el hardware. Se nota el default en el rastro.',,
      '%N, sello %PAIS: orgullo anunciado, entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Y %PAIS le dio a %N la costumbre de creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Exportación %PAIS: chispa sin circuito con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS, %N ofende fácil y carga difícil. Presencia sin peso. El valor propio todavía discute el veredicto con el espejo.',,
      '%N, estereotipo %PAIS sin filtro: fusible del chat. Documentado. El orgullo encuentra altura imaginaria; el contador encuentra el piso.',,
      'Y con %PAIS de fondo, %N gana la pelea del orgullo y pierde la del rastro. Mismo final que medio continente: mucho verso, poco número.',
    ],
  },
  NI: {
    name: 'Nicaragua',
    lines: [
      'Y de %PAIS, %N: capítulo sin trama. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto que no mereció.',,
      'Pack %PAIS, %N: mitin de uno. El ranking no compra postales ni himnos. El valor propio cotiza promesas; el contador cotiza hechos, y vas en rojo.',,
      'Clásico %PAIS: proclama sin recibo. Soft power del vacío. El archivo te midió sin permiso y el resultado no cabe en tu ego.',,
      'De %PAIS llegó %N con el estereotipo completo y sin el trabajo detrás. La bandera no mejora el hardware. Se nota el default en el rastro.',,
      '%N, sello %PAIS: orgullo anunciado, entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Y %PAIS le dio a %N la costumbre de creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Exportación %PAIS: capítulo sin trama con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS, %N ofende fácil y carga difícil. Presencia sin peso. El valor propio todavía discute el veredicto con el espejo.',,
      '%N, estereotipo %PAIS sin filtro: mitin de uno. Documentado. El orgullo encuentra altura imaginaria; el contador encuentra el piso.',,
      'Y con %PAIS de fondo, %N gana la pelea del orgullo y pierde la del rastro. Mismo final que medio continente: mucho verso, poco número.',
    ],
  },
  CR: {
    name: 'Costa Rica',
    lines: [
      'Y de %PAIS, %N: pura pose de postcard. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto que no mereció.',,
      'Pack %PAIS, %N: hamaca del aporte. El ranking no compra postales ni himnos. El valor propio cotiza promesas; el contador cotiza hechos, y vas en rojo.',,
      'Clásico %PAIS: sonrisa sin carga. Soft power del vacío. El archivo te midió sin permiso y el resultado no cabe en tu ego.',,
      'De %PAIS llegó %N con el estereotipo completo y sin el trabajo detrás. La bandera no mejora el hardware. Se nota el default en el rastro.',,
      '%N, sello %PAIS: orgullo anunciado, entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Y %PAIS le dio a %N la costumbre de creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Exportación %PAIS: pura pose de postcard con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS, %N ofende fácil y carga difícil. Presencia sin peso. El valor propio todavía discute el veredicto con el espejo.',,
      '%N, estereotipo %PAIS sin filtro: hamaca del aporte. Documentado. El orgullo encuentra altura imaginaria; el contador encuentra el piso.',,
      'Y con %PAIS de fondo, %N gana la pelea del orgullo y pierde la del rastro. Mismo final que medio continente: mucho verso, poco número.',
    ],
  },
  PA: {
    name: 'Panamá',
    lines: [
      'Y de %PAIS, %N: peaje de ego. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto que no mereció.',,
      'Pack %PAIS, %N: canal sin barcos. El ranking no compra postales ni himnos. El valor propio cotiza promesas; el contador cotiza hechos, y vas en rojo.',,
      'Clásico %PAIS: deal sin entrega. Soft power del vacío. El archivo te midió sin permiso y el resultado no cabe en tu ego.',,
      'De %PAIS llegó %N con el estereotipo completo y sin el trabajo detrás. La bandera no mejora el hardware. Se nota el default en el rastro.',,
      '%N, sello %PAIS: orgullo anunciado, entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Y %PAIS le dio a %N la costumbre de creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Exportación %PAIS: peaje de ego con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS, %N ofende fácil y carga difícil. Presencia sin peso. El valor propio todavía discute el veredicto con el espejo.',,
      '%N, estereotipo %PAIS sin filtro: canal sin barcos. Documentado. El orgullo encuentra altura imaginaria; el contador encuentra el piso.',,
      'Y con %PAIS de fondo, %N gana la pelea del orgullo y pierde la del rastro. Mismo final que medio continente: mucho verso, poco número.',
    ],
  },
  UY: {
    name: 'Uruguay',
    lines: [
      'Y de %PAIS, %N: mate de juicio y cero dulzor. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto que no mereció.',,
      'Pack %PAIS, %N: empate eterno del hilo. El ranking no compra postales ni himnos. El valor propio cotiza promesas; el contador cotiza hechos, y vas en rojo.',,
      'Clásico %PAIS: ceño con bufanda. Soft power del vacío. El archivo te midió sin permiso y el resultado no cabe en tu ego.',,
      'De %PAIS llegó %N con el estereotipo completo y sin el trabajo detrás. La bandera no mejora el hardware. Se nota el default en el rastro.',,
      '%N, sello %PAIS: orgullo anunciado, entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Y %PAIS le dio a %N la costumbre de creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Exportación %PAIS: mate de juicio y cero dulzor con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS, %N ofende fácil y carga difícil. Presencia sin peso. El valor propio todavía discute el veredicto con el espejo.',,
      '%N, estereotipo %PAIS sin filtro: empate eterno del hilo. Documentado. El orgullo encuentra altura imaginaria; el contador encuentra el piso.',,
      'Y con %PAIS de fondo, %N gana la pelea del orgullo y pierde la del rastro. Mismo final que medio continente: mucho verso, poco número.',
    ],
  },
  PR: {
    name: 'Puerto Rico',
    lines: [
      'Y de %PAIS, %N: reguetón de ego sin drop. El grupo ya hizo el desvío; el orgullo sigue en la ruta vieja pidiendo peaje de respeto que no mereció.',,
      'Pack %PAIS, %N: feat que nadie pidió. El ranking no compra postales ni himnos. El valor propio cotiza promesas; el contador cotiza hechos, y vas en rojo.',,
      'Clásico %PAIS: colonia de aplauso. Soft power del vacío. El archivo te midió sin permiso y el resultado no cabe en tu ego.',,
      'De %PAIS llegó %N con el estereotipo completo y sin el trabajo detrás. La bandera no mejora el hardware. Se nota el default en el rastro.',,
      '%N, sello %PAIS: orgullo anunciado, entrega intermitente. Confunde pose nacional con peso real. El chat no hace excepciones por acento.',,
      'Y %PAIS le dio a %N la costumbre de creerse el centro del mapa chico. Acá el mapa es el contador y no sales en la leyenda, solo en la nota al pie.',,
      'Exportación %PAIS: reguetón de ego sin drop con wifi. El grupo no te debe el clima emocional ni el abono de drama. Baja el himno; sube el aporte.',,
      'De %PAIS, %N ofende fácil y carga difícil. Presencia sin peso. El valor propio todavía discute el veredicto con el espejo.',,
      '%N, estereotipo %PAIS sin filtro: feat que nadie pidió. Documentado. El orgullo encuentra altura imaginaria; el contador encuentra el piso.',,
      'Y con %PAIS de fondo, %N gana la pelea del orgullo y pierde la del rastro. Mismo final que medio continente: mucho verso, poco número.',
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
