'use strict';

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { isOwner, getSender, canonicalJid, bareJid } = require('../utils/wa');
const { streamToBuffer, MAX_MEDIA_BYTES } = require('../utils/helpers');
const logger = require('../utils/logger');
const config = require('../config');

// !k — reenvía al privado del owner el archivo al que responde.
//
// Para qué es: verificar cuentas falsas. Buscar por imagen inversa la foto que
// alguien acaba de subir es la forma de saber si es un catfish, y hacerlo con
// *!pfp* delante de todo el grupo señala en público a alguien que a lo mejor no
// ha hecho nada. Esto lo mueve al privado del owner, que es donde tiene que
// pasar.
//
// Qué NO es: una vía para que cualquiera copie archivos ajenos. Solo responde
// al owner tier y no contesta nada en el grupo (ni siquiera un error: todo va
// al privado).
//
// El disparador tecleado a pelo ("!k") se borra del grupo al ejecutarse: es
// corto y raro, y dejarlo puesto delata que se usó un comando. Los disparadores
// de palabra suelta ("Welcome", "diría algo" — ver esTriggerK en
// messageHandler.js) NO se borran: son conversación normal y borrar un mensaje
// de verdad llama MÁS la atención (WhatsApp deja el aviso de "se eliminó este
// mensaje" a la vista de todo el grupo) que dejarlo tal cual.
//
// Un límite que conviene tener presente: esto también alcanza a los medios
// enviados en *ver una vez*, y quien los manda cuenta con que nadie se los
// quede. El owner ve ese archivo igual estando en el grupo; la diferencia es
// que aquí se queda una copia.

// Todo lo que se puede reenviar, con el tipo que hay que pasarle a
// downloadContentFromMessage. OJO: el tipo NO es cosmético — la derivación de
// la clave de media va por HKDF con una etiqueta distinta por tipo
// (MEDIA_HKDF_KEY_MAPPING), así que bajar un documento como 'image' descifra
// basura sin dar error.
const TIPOS = [
  ['stickerMessage',  'sticker',  'sticker'],
  ['imageMessage',    'image',    'imagen'],
  ['videoMessage',    'video',    'video'],
  ['audioMessage',    'audio',    'audio'],
  ['documentMessage', 'document', 'documento'],
];

// Quita los sobres (efímero, ver-una-vez en sus tres formas, documento con pie)
// hasta dar con el contenido real.
function desenvolver(m) {
  let cur = m;
  for (let i = 0; i < 5 && cur; i++) {
    const dentro =
      cur.ephemeralMessage?.message ||
      cur.viewOnceMessage?.message ||
      cur.viewOnceMessageV2?.message ||
      cur.viewOnceMessageV2Extension?.message ||
      cur.documentWithCaptionMessage?.message;
    if (!dentro) break;
    cur = dentro;
  }
  return cur;
}

function hallarMedio(message) {
  const m = desenvolver(message);
  if (!m) return null;
  for (const [campo, tipo, nombre] of TIPOS) {
    // `contenido` es el mensaje YA desenvuelto que contiene el medio, no solo
    // el nodo. Hace falta entero para poder pedir la resubida: ver bajarMedio.
    if (m[campo]) return { nodo: m[campo], tipo, nombre, contenido: m };
  }
  return null;
}

// ─── BAJAR EL ARCHIVO, Y PEDIRLO OTRA VEZ SI YA NO ESTA ─────────────────────
//
// AQUI ESTABA EL FALLO, y explica por que *!k* parecia funcionar a ratos.
//
// Se bajaba de la URL del CDN de WhatsApp y ya. Esas URLs CADUCAN: pasados unos
// dias el servidor contesta 410 Gone —o 404—, se lanzaba, y el comando decia
// «WhatsApp ya no lo tiene o venia dañado». Con una foto de hace un rato iba y
// con una de hace unos dias no. Desde fuera eso no se lee como «el archivo
// caduco»: se lee como que el comando esta roto.
//
// Y WhatsApp SI lo tiene. Para esto existe el media retry: se le pide al
// servidor que vuelva a subir el archivo y se baja de la URL nueva.
//
// ─── Y POR QUE NO SE USA EL DE BAILEYS ─────────────────────────────────────
//
// Baileys trae eso hecho en `downloadMediaMessage`... y NO FUNCIONA. Su
// reintento esta guardado asi (Utils/messages.js:836):
//
//     typeof error?.status === 'number' && REUPLOAD_REQUIRED_STATUS.includes(error.status)
//
// pero el error que llega lo lanza su propio `getHttpStream` como
// `new Boom(..., { statusCode: response.status })`, y Boom NO expone `.status`:
// lo deja en `.output.statusCode`. Comprobado aparte: `new Boom('x', {
// statusCode: 410 }).status` es `undefined`, asi que esa condicion es falsa
// SIEMPRE y la resubida no se pide nunca. Cambiar a esa funcion habria dejado
// el fallo exactamente donde estaba, con mejor aspecto.
//
// Asi que el reintento se hace aqui, leyendo el codigo donde de verdad esta y
// aceptando las tres formas por si algun dia lo arreglan arriba.
//
// Se baja en `stream` y se corta con MAX_MEDIA_BYTES, como antes: en una
// maquina de 1 GB un documento de 200 MB entrando entero en memoria tira el bot.
const CODIGOS_RESUBIDA = [410, 404];

function codigoDe(e) {
  const c = e?.output?.statusCode ?? e?.statusCode ?? e?.status;
  return typeof c === 'number' ? c : null;
}

async function bajarPorNodo(nodo, tipo) {
  const stream = await downloadContentFromMessage(nodo, tipo);
  return streamToBuffer(stream, MAX_MEDIA_BYTES);
}

async function bajarMedio(sock, sobre, medio) {
  try {
    return await bajarPorNodo(medio.nodo, medio.tipo);
  } catch (e) {
    const codigo = codigoDe(e);
    if (!CODIGOS_RESUBIDA.includes(codigo)) throw e;
    if (typeof sock?.updateMediaMessage !== 'function' || !sobre?.key?.id) throw e;

    logger.info(`!k: el archivo caduco (${codigo}); le pido a WhatsApp que lo vuelva a subir`);
    // updateMediaMessage devuelve el mensaje con la URL nueva. Se vuelve a
    // buscar el medio dentro porque el nodo cambia: el de antes apunta a la
    // direccion muerta.
    const renovado = await sock.updateMediaMessage(sobre);
    const otro = hallarMedio(renovado?.message);
    if (!otro) throw e;
    return bajarPorNodo(otro.nodo, otro.tipo);
  }
}

// El privado al que se manda. En un grupo con LID el remitente llega como @lid
// y ese JID no sirve para abrir un privado, así que se busca su teléfono: en el
// mapa LID→teléfono, en la ficha del participante y, en último caso, en el
// número configurado del owner.
function privadoDelOwner(sender, groupMeta) {
  const canon = canonicalJid(sender);
  if (canon?.endsWith('@s.whatsapp.net')) return canon;

  const bare = bareJid(sender);
  for (const p of (groupMeta?.participants || [])) {
    const formas = [p?.id, p?.lid, p?.phoneNumber].filter(Boolean).map(bareJid);
    if (formas.includes(bare) && p?.phoneNumber) return bareJid(p.phoneNumber);
  }

  const num = String(config.ownerNumber || '').replace(/\D/g, '');
  return num ? `${num}@s.whatsapp.net` : null;
}

function autorDelCitado(ctx, jid) {
  const quien = ctx?.participant || ctx?.remoteJid || jid;
  if (!quien) return 'desconocido';

  // SE RESUELVE EL @lid ANTES DE ENSEÑARLO.
  //
  // Antes se cogia el participant en crudo y se le pegaba un '+' delante. En un
  // grupo LID —que es lo normal ya— eso no es un telefono: es el identificador
  // interno de WhatsApp, y salia "imagen de +89######## ######", un numero de
  // catorce digitos que no existe y que no sirve para buscar a nadie.
  //
  // canonicalJid traduce el LID al telefono con el mapa que el bot ya mantiene.
  const bruto = String(quien);
  const canon = canonicalJid(bruto) || bruto;
  const num = String(canon).split('@')[0].split(':')[0];

  // Si sigue sin resolverse, NO se inventa un numero. Un '+' delante de un LID
  // solo sirve para confundir al que lea el pie meses despues.
  if (String(canon).includes('@lid') || !/^\d{6,15}$/.test(num)) return 'alguien del grupo';
  return `+${num}`;
}

// `borrar` decide si el mensaje que disparó esto se borra del grupo.
//
// Con "!k" tecleado a pelo, sí: es corto y raro, cantaba antes de que
// existieran los disparadores de palabra suelta. Con "Welcome" o "diría algo"
// (ver esTriggerK en messageHandler.js), no hace falta — son palabras
// corrientes de una conversación cualquiera, no delatan nada por quedarse
// puestas, y borrar un mensaje real de por sí llama más la atención (deja el
// aviso de "se eliminó este mensaje" a la vista de todo el grupo) que dejarlo
// tal cual. Quien llama decide con qué disparo se llegó aquí.
async function cmdK(sock, msg, groupMeta, borrar = true) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);

  // Owner tier y nadie más. Sin respuesta si no lo es: quien no debería saber
  // que el comando existe tampoco se entera por un "no puedes usar esto".
  //
  // El aviso de abajo es SOLO para el log del servidor (nadie en WhatsApp lo
  // ve): si un co-owner de verdad usa !k y esto falla, la causa casi siempre
  // es que su número no está en CO_OWNERS (.env) o está mal escrito — no un
  // fallo de este archivo. Sin este aviso, "no me llega nada" no da ninguna
  // pista de por dónde mirar.
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    logger.warn(
      `!k: ${sender} no es tier owner (owner principal configurado: ` +
      `${config.ownerNumber ? 'sí' : 'NO'}; co-owners configurados: ${config.coOwners?.length || 0}). ` +
      `Si debería serlo, revisa CO_OWNERS en el .env de la VPS.`
    );
    return;
  }

  const destino = privadoDelOwner(sender, groupMeta);
  if (!destino) {
    logger.warn('!k: no pude resolver el privado del owner');
    return;
  }

  // Si toca borrar, se borra en cuanto se ejecuta. Si el bot no es admin la
  // borrada falla y no pasa nada: el comando sigue funcionando igual.
  if (borrar && jid.endsWith('@g.us')) {
    sock.sendMessage(jid, {
      delete: { remoteJid: jid, fromMe: Boolean(msg.key.fromMe), id: msg.key.id, participant: sender },
    }).catch(() => {});
  }

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const citado = hallarMedio(ctx?.quotedMessage);
  const medio = citado || hallarMedio(msg.message);

  if (!medio) {
    return sock.sendMessage(destino, {
      text: 'Responde con *!k* al archivo que quieras traerte aquí (foto, video, sticker, audio o documento).',
    }).catch(() => {});
  }

  // El sobre que se le pasa a la resubida. Con un mensaje CITADO hay que
  // reconstruirlo: la key del archivo es la del mensaje original —su stanzaId y
  // quien lo mando—, no la del «!k» que lo cita. Con el medio propio, el sobre
  // ya es este mensaje.
  const sobre = citado
    ? {
      key: {
        remoteJid: jid,
        id: ctx?.stanzaId,
        participant: ctx?.participant,
        fromMe: Boolean(ctx?.participant && sock?.user?.id
          && bareJid(ctx.participant) === bareJid(sock.user.id)),
      },
      message: medio.contenido,
    }
    : { key: msg.key, message: medio.contenido };

  let buf;
  try {
    buf = await bajarMedio(sock, sobre, medio);
  } catch (e) {
    logger.warn(`!k: no pude descargar el ${medio.nombre}: ${e.message}`);
    return sock.sendMessage(destino, {
      text: `No pude descargar ese ${medio.nombre}. WhatsApp ya no lo tiene o venía dañado.`,
    }).catch(() => {});
  }

  const deQuien = autorDelCitado(ctx, jid);
  const donde = groupMeta?.subject ? ` en *${groupMeta.subject}*` : '';
  const pie = `${medio.nombre} de ${deQuien}${donde}`;

  // Cada tipo se manda como lo que es. Un sticker reenviado como sticker se ve
  // igual que en el grupo; una imagen con pie lleva de quién era, que es lo
  // único que hace falta para luego buscarla.
  const contenido =
    medio.tipo === 'sticker'  ? { sticker: buf }
  : medio.tipo === 'image'    ? { image: buf, caption: pie }
  : medio.tipo === 'video'    ? { video: buf, caption: pie, mimetype: medio.nodo.mimetype || 'video/mp4' }
  : medio.tipo === 'audio'    ? { audio: buf, mimetype: medio.nodo.mimetype || 'audio/ogg; codecs=opus',
                                  ptt: Boolean(medio.nodo.ptt) }
  :                             { document: buf,
                                  mimetype: medio.nodo.mimetype || 'application/octet-stream',
                                  fileName: medio.nodo.fileName || 'archivo',
                                  caption: pie };

  try {
    await sock.sendMessage(destino, contenido);
    // El sticker no admite pie, así que el contexto va aparte o se pierde.
    if (medio.tipo === 'sticker') {
      await sock.sendMessage(destino, { text: pie }).catch(() => {});
    }
  } catch (e) {
    logger.warn(`!k: no pude enviar el ${medio.nombre} al privado: ${e.message}`);
    await sock.sendMessage(destino, {
      text: `Tengo el ${medio.nombre} pero no pude enviártelo.`,
    }).catch(() => {});
  }
}

module.exports = { cmdK, hallarMedio, privadoDelOwner, _bajarMedio: bajarMedio };
