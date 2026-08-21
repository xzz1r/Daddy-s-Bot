// Detección de enlaces e invitaciones. Vive aparte del dispatcher: el handler
// decide QUÉ hacer con el veredicto; esto solo clasifica el sobre.
'use strict';

const { sameUser, canonicalJid } = require('./wa');
const logger = require('./logger');

// Hosts allowed without penalty (only a "send once" reminder). Matched against
// the bare host so subdomains (m.youtube.com, www.instagram.com) pass but
// look-alikes (youtube.com.evil.com) do NOT.
const LINK_WHITELIST = /(?:^|\.)(?:youtube\.com|youtu\.be|instagram\.com|instagr\.am)$/i;

// Conservative URL detector: needs an explicit scheme/www or a known invite
// domain, so plain talk like "node.js" or "archivo.txt" isn't treated as a link.
//
// Los dominios de invitación se listan SIN esquema a propósito: son la vía de
// spam más común y casi nadie los pega con "https://" delante. Faltaban wa.me,
// los canales de whatsapp.com y telegram.me, y se colaban enteros.
const DOMINIOS_INVITACION = String.raw`chat\.whatsapp\.com|wa\.me|whatsapp\.com\/channel|t\.me|telegram\.me|telegram\.dog|discord\.gg|discord\.com\/invite|invite\.gg`;
// Los de la lista blanca tambien se reconocen pelados: si no, un
// "youtube.com/x" sin esquema no se detectaba NI para avisar, y quedaba en un
// limbo raro donde el mismo enlace se trataba distinto segun como lo pegaran.
const DOMINIOS_BLANCOS = String.raw`youtube\.com|youtu\.be|instagram\.com|instagr\.am`;
// EL DOMINIO DE INVITACION CUENTA AUNQUE NO LLEVE NADA DETRAS. Antes exigia una
// barra y un codigo, asi que "chat.whatsapp.com" a secas no se veia — y tampoco
// se veia el codigo puesto en la linea de abajo, que es evasion de un segundo.
// Un dominio de invitacion suelto no tiene uso legitimo en el grupo; los de la
// lista blanca siguen exigiendo ruta, porque "youtube.com" suelto si sale en
// conversaciones normales.
const URL_RE = new RegExp(
  String.raw`(?:https?:\/\/|www\.)[^\s]+|(?:${DOMINIOS_INVITACION})(?:\/[^\s]*)?|(?:${DOMINIOS_BLANCOS})\/[^\s]+`,
  'gi'
);

// Normaliza el texto ANTES de buscar enlaces, para que los trucos de siempre no
// sirvan: caracteres invisibles metidos en medio, puntos que no son puntos
// (·, ․, ‧, 。) y espacios alrededor de los puntos ("chat . whatsapp . com").
//
// Solo se normaliza para DETECTAR; el mensaje original no se toca. El riesgo de
// falso positivo es real (juntar "punto . com" cambia el sentido), así que los
// espacios solo se colapsan cuando el punto está pegado a un dominio conocido.
const INVISIBLES = /[­​-‏‪-‮⁠-⁤﻿]/g;
const PUNTOS_FALSOS = /[·․‧∙。｡]/g;

function normalizarParaEnlaces(text) {
  let s = String(text).replace(INVISIBLES, '').replace(PUNTOS_FALSOS, '.');
  // "chat . whatsapp . com" -> "chat.whatsapp.com". Se hace solo sobre los
  // trozos de dominio conocidos para no pegar frases normales.
  s = s.replace(/\b(chat|www|wa|t|telegram|whatsapp|youtu|youtube|instagram|instagr)\s*\.\s*/gi, '$1.');
  s = s.replace(/\.\s*(com|me|be|am|dog|net|org)\b/gi, '.$1');
  return s;
}

// MODERAR SIEMPRE, ANUNCIAR UNA VEZ.
//
// Medido con rafagas: diez invitaciones seguidas producian DIEZ mensajes del
// bot. O sea que quien viene a hacer ruido manda diez lineas y el bot le pone
// otras diez encima — el guardia acaba ensuciando mas que el spam que para. Y
// si el kick se rechaza (el bot dejo de ser admin a mitad), la persona se queda
// dentro y cada mensaje suyo genera otro anuncio, para siempre.
//
// La accion NO se toca: el enlace se borra, se expulsa y se veta cada vez, en
// silencio. Lo que se limita es el ANUNCIO, que es lo unico que ve el grupo.
// Uno por persona cada cinco minutos.
const ANUNCIO_TTL = 5 * 60 * 1000;
const anuncios = new Map(); // `${jid}|${canonical}` -> ts

// A quien no tiene ficha se le mira el perfil UNA vez por grupo. Si se hiciera
// en cada mensaje, un grupo activo dispararia cientos de consultas por hora y
// WhatsApp acabaria limitando el socket entero.
const perfilMirado = new Set(); // `${jid}|${telefono}`

// `minimo` permite un freno mas corto para el aviso que NO se puede perder: el
// ultimo antes del ban. Ese tiene que llegar —si no, el siguiente enlace le
// cuesta el grupo sin advertencia— pero tampoco puede repetirse en bucle.
//
// Y se repetia: al banear se ponen los avisos a cero, asi que el ciclo de tres
// empezaba otra vez y el "ultimo aviso" volvia a saltarse el freno cada tres
// enlaces. Con alguien a quien el bot no puede expulsar, eso es infinito.
function puedeAnunciar(jid, sender, minimo = ANUNCIO_TTL) {
  const k = `${jid}|${canonicalJid(sender)}`;
  const ultimo = anuncios.get(k);
  if (ultimo && Date.now() - ultimo < minimo) return false;
  if (anuncios.size >= 2000) anuncios.delete(anuncios.keys().next().value);
  anuncios.set(k, Date.now());
  return true;
}

// LOS TROPIEZOS DEL BOT NO SE CUENTAN EN EL GRUPO — NI SE MANDAN AL PRIVADO.
//
// Habia ocho mensajes que anunciaban en publico lo que el bot no podia hacer:
// "no soy admin y no puedo borrarlo", "no he podido expulsarlo: hacedlo a
// mano". Eran honestos, pero en un grupo quedan de aficionado y —peor— le dicen
// a quien esta spameando donde esta el limite del guardia. Un moderador que
// anuncia sus puntos ciegos deja de serlo.
//
// La primera version de esto se los mandaba al privado del owner. Tampoco: son
// avisos que se disparan solos, y un privado que se llena de incidencias se deja
// de leer en dos dias — con lo cual el aviso no sirve para nada Y ademas molesta.
//
// Van al LOG, que es donde se miran las cosas cuando se van a mirar. El grupo ve
// unicamente lo que SI ha pasado: el enlace borrado, la cuenta vetada.
function anotarTropiezo(texto) {
  logger.warn(texto);
}

// Sobres que SON una invitación en sí mismos y no llevan URL en ningún texto.
// Este era el agujero grande: `groupInviteMessage` es el "invitar al grupo"
// nativo de WhatsApp — trae groupJid, inviteCode y una miniatura, pero NI UNA
// sola URL, así que el detector de texto no veía absolutamente nada y el
// mensaje pasaba limpio. Es, además, la forma más cómoda de pasar un grupo.
const SOBRES_INVITACION = ['groupInviteMessage', 'newsletterAdminInviteMessage'];

// SOBRES QUE ENVUELVEN A OTRO MENSAJE. Este era el agujero de verdad, y el mas
// caro: el antilink miraba el sobre PLANO, asi que cualquier mensaje anidado
// pasaba entero sin que el detector viera una sola letra.
//
// Y el peor de la lista es el primero. Si un grupo tiene los MENSAJES
// TEMPORALES activados —cosa normalisima y que no controla quien escribe—
// TODOS los mensajes llegan envueltos en ephemeralMessage. O sea que en un
// grupo asi el antilink no estaba fallando a ratos: no funcionaba en absoluto,
// y nadie podia notarlo mirando el codigo del detector, que es correcto.
//
// Medido antes de arreglarlo: de ocho formas de anidar, siete se colaban.
const SOBRES_ANIDADOS = [
  'ephemeralMessage',
  'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension',
  'documentWithCaptionMessage', 'documentWithCaptionMessageV2',
];

// Devuelve el mensaje de dentro de cada envoltorio, si lo hay. El tope de
// profundidad es por seguridad: un sobre que se apuntara a si mismo colgaria el
// handler entero, y esto corre en cada mensaje del grupo.
function sobresInternos(message, prof = 0) {
  if (!message || prof > 5) return [];
  const dentro = [];
  for (const k of SOBRES_ANIDADOS) {
    const m = message[k]?.message;
    if (m) dentro.push(m, ...sobresInternos(m, prof + 1));
  }
  // Los editados. Hay DOS formas y solo se cubria una: la envuelta en
  // editedMessage. La que emite Baileys de verdad al editar es un
  // protocolMessage suelto con el texto nuevo dentro, y esa no se miraba — o
  // sea que bastaba con mandar algo inocente y editarlo para meter el enlace.
  for (const ed of [
    message.editedMessage?.message?.protocolMessage?.editedMessage,
    message.protocolMessage?.editedMessage,
  ]) {
    if (ed) dentro.push(ed, ...sobresInternos(ed, prof + 1));
  }
  return dentro;
}

function esInvitacionNativa(message) {
  if (!message) return false;
  const todos = [message, ...sobresInternos(message)];
  return todos.some((m) => SOBRES_INVITACION.some(k => m[k]));
}

// Todo el texto donde puede esconderse un enlace, no solo el cuerpo del
// mensaje extractText solo mira conversation/extendedText/captions; un enlace
// metido en un botón, en una lista, en una encuesta o en la tarjeta de un
// contacto no aparecía por ningún lado y pasaba el filtro entero.
function textoParaEnlaces(message, prof = 0, quien = null) {
  // TOPE DE PROFUNDIDAD. Los sobres ya lo tenian; esto no, y al empezar a
  // seguir las citas hacia falta: una cita puede traer otra cita dentro, y una
  // cadena anidada a mano es una forma barata de reventar la pila del proceso
  // desde un mensaje de grupo. Ocho niveles no los alcanza nada legitimo.
  if (!message || prof > 8) return '';
  const trozos = [];
  const push = (v) => { if (typeof v === 'string' && v) trozos.push(v); };

  push(message.conversation);
  push(message.extendedTextMessage?.text);
  push(message.extendedTextMessage?.matchedText);
  push(message.extendedTextMessage?.canonicalUrl);
  push(message.imageMessage?.caption);
  push(message.videoMessage?.caption);
  push(message.documentMessage?.caption);

  // Tarjetas de contacto: el vCard puede traer una URL o un número de empresa.
  push(message.contactMessage?.vcard);
  for (const c of (message.contactsArrayMessage?.contacts || [])) push(c?.vcard);

  // Botones, listas, plantillas e interactivos: el texto visible y las URLs de
  // los botones viven en sitios distintos según el tipo.
  const b = message.buttonsMessage;
  if (b) { push(b.contentText); push(b.footerText); }
  const l = message.listMessage;
  if (l) {
    push(l.description); push(l.title); push(l.footerText);
    for (const s of (l.sections || [])) for (const r of (s.rows || [])) { push(r?.title); push(r?.description); }
  }
  const t = message.templateMessage?.hydratedTemplate || message.templateMessage?.hydratedFourRowTemplate;
  if (t) {
    push(t.hydratedContentText); push(t.hydratedFooterText);
    for (const bt of (t.hydratedButtons || [])) push(bt?.urlButton?.url);
  }
  const iv = message.interactiveMessage;
  if (iv) { push(iv.body?.text); push(iv.footer?.text); push(iv.header?.title); }

  // Encuestas: el nombre y las opciones son texto libre.
  const poll = message.pollCreationMessage || message.pollCreationMessageV2 || message.pollCreationMessageV3;
  if (poll) { push(poll.name); for (const o of (poll.options || [])) push(o?.optionName); }

  push(message.productMessage?.product?.url);
  push(message.orderMessage?.message);

  // BOTONES CTA (nativeFlow). El texto visible es inofensivo y la URL viaja
  // dentro de un JSON en los parametros del boton. Es la forma moderna de
  // colar un enlace: quien lo lee ve "Abrir" y el detector no veia nada.
  for (const bt of (message.interactiveMessage?.nativeFlowMessage?.buttons || [])) {
    push(bt?.buttonParamsJson);
  }
  // Y las URLs de los botones de siempre, que tampoco se leian: solo se miraba
  // el contentText y el footerText del mensaje que los lleva.
  for (const bt of (message.buttonsMessage?.buttons || [])) {
    push(bt?.urlButton?.url);
  }

  // TARJETA DE PREVIEW (externalAdReply). El bypass clasico: el mensaje dice
  // "hola" y el enlace esta en la tarjeta que se pincha. Vive en contextInfo,
  // que cuelga de casi cualquier tipo de mensaje, asi que se busca en todos.
  for (const k of Object.keys(message)) {
    const ad = message[k]?.contextInfo?.externalAdReply;
    if (!ad) continue;
    push(ad.sourceUrl); push(ad.mediaUrl); push(ad.title); push(ad.body);
  }

  // Ubicaciones: el pin lleva su propia URL.
  push(message.locationMessage?.url);
  push(message.liveLocationMessage?.caption);

  // Album, comentarios y eventos: contenedores nuevos con texto propio.
  push(message.albumMessage?.caption);
  push(message.commentMessage?.message?.conversation);
  push(message.eventMessage?.name);
  push(message.eventMessage?.description);
  push(message.eventMessage?.location?.name);

  // Y TODO LO QUE HAYA DENTRO DE UN ENVOLTORIO. Sin esto, un enlace mandado en
  // un grupo con mensajes temporales, o como "ver una vez", no se veia.
  for (const dentro of sobresInternos(message)) trozos.push(textoParaEnlaces(dentro, prof + 1, quien));

  // EL MENSAJE CITADO, PERO SOLO SI ES SUYO. Y esto costo caro.
  //
  // Se metio porque el contexto de una cita lo rellena QUIEN MANDA, no el
  // servidor: se puede citar una invitacion que nunca existio y el enlace se
  // renderiza en la burbuja para todo el grupo mientras el detector ve "mira
  // esto". El agujero era real.
  //
  // PERO EL ARREGLO ERA PEOR QUE EL AGUJERO. Responder a un mensaje mete ese
  // mensaje entero en el tuyo, asi que quien contestaba "jajaja" a un enlace
  // pasaba a ser el que mandaba el enlace a ojos del bot. Reportado desde el
  // grupo: el que spameaba se iba, alguien respondia a su mensaje, y al que
  // respondia lo echaban. Castigar a quien contesta es mucho peor que dejar que
  // alguien enseñe un enlace dentro de una burbuja de cita, que ademas no es
  // pinchable.
  //
  // Asi que la cita solo cuenta cuando el citado es UNO MISMO: ahi el contenido
  // si es suyo. `contextInfo.participant` dice de quien era el mensaje citado.
  //
  // Se puede falsear ese campo, si. Pero entre colar un enlace en una burbuja y
  // echar a gente que solo responde, la eleccion no es dificil.
  if (quien) {
    for (const k of Object.keys(message)) {
      const ctx = message[k]?.contextInfo;
      if (!ctx?.quotedMessage) continue;
      if (!ctx.participant || !sameUser(ctx.participant, quien)) continue;
      trozos.push(textoParaEnlaces(ctx.quotedMessage, prof + 1, quien));
    }
  }

  return trozos.join(' \n ');
}

function hostOf(url) {
  let s = String(url).replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  const cut = s.search(/[/?#]/);
  if (cut >= 0) s = s.slice(0, cut);
  return s.toLowerCase();
}

// 'none' = no links; 'whitelisted' = only YouTube/Instagram links present;
// 'blocked' = at least one non-whitelisted link (websites, WhatsApp/Telegram
// invites, etc.) — those get the sender kicked and the message deleted.
// UNA INVITACION NO ES LO MISMO QUE UN ENLACE, y hacia falta separarlas.
//
// Antes todo lo que no fuera YouTube/Instagram era 'blocked' y se expulsaba sin
// mirar permisos. O sea que *!allow* —que el bot anuncia como "con esto publicas
// sin problema"— no servia para nada salvo YouTube e Instagram: un admin te daba
// permiso, pegabas un Drive y te echaba igual.
//
// Ahora hay tres niveles y el permiso significa algo:
//
//   invite      → invitacion a otro grupo o canal. NO la salva nadie: ni el
//                 *!allow* de un admin ni el pase comprado. Es lo que el modo
//                 existe para impedir.
//   blocked     → cualquier otro enlace. Se expulsa igual que antes, PERO el
//                 *!allow* y el pase lo permiten, que es lo que prometen.
//   whitelisted → YouTube/Instagram: aviso y borrado, ban al tercero.
const INVITACION_RE = new RegExp(String.raw`^(?:${DOMINIOS_INVITACION})`, 'i');

function classifyLinks(text) {
  const matches = normalizarParaEnlaces(text).match(URL_RE);
  if (!matches) return 'none';
  let whitelisted = false;
  let bloqueado = false;
  for (const m of matches) {
    const host = hostOf(m);
    // La invitacion manda sobre todo lo demas: si hay una, da igual lo que
    // venga acompañandola.
    if (INVITACION_RE.test(host) || INVITACION_RE.test(m.replace(/^https?:\/\//i, ''))) return 'invite';
    if (LINK_WHITELIST.test(host)) { whitelisted = true; continue; }
    bloqueado = true;
  }
  if (bloqueado) return 'blocked';
  return whitelisted ? 'whitelisted' : 'none';
}

// Veredicto completo de un mensaje: mira el sobre (invitación nativa) y TODAS
// las superficies de texto, no solo el cuerpo.
// `quien` es quien escribe. Sin el, las citas no se miran — que es lo correcto
// para cualquier llamada que no sepa de quien es el mensaje.
function clasificarMensaje(message, quien = null) {
  if (esInvitacionNativa(message)) return 'invite';
  return classifyLinks(textoParaEnlaces(message, 0, quien));
}

// Aviso para quien suelta un enlace de YouTube o Instagram sin el permiso de
// *!allow*. El enlace se borra siempre; los dos primeros avisos no castigan más
// que eso, y al TERCERO hay ban y expulsión. Las frases dirigen a pedirle el
// permiso a un admin, que es la salida que tiene.
const PERMISO_ENLACE = [
  'ese link a la basura. Aquí no publicas una puta mierda hasta que un admin te dé el *!allow*. Pídelo con la cabeza bien gacha.',
  'borrado. ¿Quién coño te dio permiso? Nadie. Ve a un admin, pídele el *!allow* y traga lo que te conteste sin rechistar.',
  'fuera. Publicar aquí no es un derecho, es un premio. Arrástrate delante de un admin y con suerte te cae el *!allow*.',
  'eliminado. Llegas a un sitio que no es tuyo y sueltas links como si mandaras. No mandas una mierda: pídele el *!allow* a un admin.',
  'ese enlace no vale nada sin permiso. Baja el tono, baja la cabeza y suplícale a un admin que te ponga el *!allow*.',
  'borrado. Aquí se pide de rodillas, no se impone. Un admin decide si mereces el *!allow*, y hoy no lo mereces ni de coña.',
  'quitado. Te crees con derecho a publicar y no eres nadie, hijo. Pídele el *!allow* a un admin y reza por caerle en gracia.',
  'fuera. El grupo no es tu puto tablón de anuncios. Gánate el *!allow* de un admin portándote de puta madre y hablamos.',
  'eliminado. Nadie te conoce, nadie te debe una mierda, y aun así vienes a spamear. Pídele el *!allow* a un admin y espera tu turno.',
  'ese enlace sobra tanto como tus ganas de saltarte las normas. Un admin te dará el *!allow* cuando te lo curres, no antes.',
  'borrado. Publicar sin permiso es de listillo, y los listillos duran poco aquí. Pídele el *!allow* a un admin como todo hijo de vecino.',
  'quitado. Aquí el que manda no eres tú, ni de coña. Acepta tu puto sitio, pídele el *!allow* a un admin y no la líes más.',
  'fuera. Con esos huevos no te dan el *!allow* ni en diez años. Empieza por callarte y por ganarte a los admins de verdad.',
  'eliminado. Ese link solo demuestra que te suda la polla el grupo. Demuestra lo contrario y luego pídele el *!allow* a un admin.',
  'borrado. Los que publican aquí se lo curraron mucho antes que tú. Ponte a la puta cola y pídele el *!allow* a un admin.',
  'ese link a tomar por culo. El permiso se llama *!allow*, lo dan los admins, y tu cara dura no cuela como mérito.',
  'quitado. No eres especial ni te lo van a poner fácil, campeón. Pídele el *!allow* a un admin, traga el no y vuelve a probar.',
  'fuera. Aquí se entra a escuchar y a callar, no a promocionarse. Cuando lo tengas claro, pídele el *!allow* a un admin.',
  'eliminado. Publicar es un privilegio de los que se agachan y se lo ganan. Pídele el *!allow* a un admin y ten paciencia, joder.',
  'borrado. Ahórrate el numerito: sin el *!allow* de un admin, todo lo que sueltes acaba exactamente igual, en nada.',
  'a la papelera. Ese link ha durado menos que tu credibilidad aquí. Pídele el *!allow* a un admin y luego hablamos.',
  'borrado. Nadie te ha pedido una puta cosa, campeón. Cuando un admin te dé el *!allow* será distinto; hoy no eres nadie.',
  'quitado. Llegas de nuevas soltando links con una confianza que no te has ganado. Pídele el *!allow* a un admin y baja el humo.',
  'fuera. Ese enlace le importa una mierda a todo el mundo menos a ti. Si tanto insistes, pídele el *!allow* a un admin.',
  'eliminado. Aquí no eres el protagonista de una mierda. Ponte detrás, pídele el *!allow* a un admin y aprende a esperar.',
  'borrado. Te has saltado el único paso que había: pedir. Ve a un admin, pídele el *!allow* y hazlo con humildad.',
  'ese link a la mierda. El grupo no es tu escaparate. Un admin te dará el *!allow* el día que lo merezcas, si llega.',
  'quitado. Has confundido este grupo con tu perfil. Pídele el *!allow* a un admin y mientras tanto cállate y observa.',
  'fuera. Publicar aquí se pide, se espera y se agradece, joder. Empieza por lo primero: el *!allow* de un admin.',
  'eliminado. Entraste ayer y ya quieres mandar. Pídele el *!allow* a un admin, agacha la cabeza y ten paciencia.',
  'borrado. No hay atajo, hijo. O un admin te da el *!allow* o esto se repite hasta que te canses o te vayas.',
  'ese enlace no lo quiere ver ni tu madre. Y aunque lo quisiera, hace falta el *!allow* de un admin. Ve y pídelo.',
  'quitado. El sitio aquí se gana callando y aportando, no spameando como un puto folleto. Luego pídele el *!allow* a un admin.',
  'fuera. Te falta permiso y te sobra morro. Pídele el *!allow* a un admin y acepta con la boca cerrada que te diga que no.',
  'eliminado. Este grupo no te debe visibilidad ninguna. Si la quieres, gánate el *!allow* de un admin currándotelo.',
  'borrado. Cada puto link que sueltas sin permiso te aleja más del *!allow*. Habla con un admin antes de seguir cavando.',
  'ese link fuera. No estás aquí para promocionarte, estás aquí de prestado. Pídele el *!allow* a un admin y compórtate.',
  'quitado. Publicar es cosa de los que se lo ganaron a pulso. Tú todavía vas de aprendiz: pídele el *!allow* a un admin.',
  'fuera. Te crees más importante de lo que eres, joder, y se te nota. Baja de ahí y pídele el *!allow* a un admin.',
  'eliminado. El único enlace que te interesa ahora es el de la humildad. Pídele el *!allow* a un admin y espera tu turno.',
];

module.exports = {
  clasificarMensaje, classifyLinks, textoParaEnlaces, esInvitacionNativa, PERMISO_ENLACE,
  puedeAnunciar, anotarTropiezo, perfilMirado,
};
