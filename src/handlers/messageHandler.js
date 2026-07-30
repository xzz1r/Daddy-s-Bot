const { pickFresh } = require('../utils/helpers');
const config = require('../config');
const { isBotEnabled, incrementStat, isAntiLinkEnabled } = require('../utils/state');
const { increment: incrementMsgCount } = require('../utils/messageCounter');
const { recordFacts } = require('../utils/nickStore');
const { noteOffence, forget } = require('../utils/mediaSpam');
const { isAllowed, noteWarning, resetWarnings } = require('../utils/linkPerms');
const { banAccount } = require('../utils/banlist');
const { allForms } = require('../commands/fk');
const { checkCasinoMilestone } = require('../utils/casino');
const { cmdPlay, cmdCacheList, cmdClearCache } = require('../commands/music');
const { cmdSticker } = require('../commands/sticker');
const { cmdTopRandom } = require('../commands/topsRandom');
const { cmdCount, cmdResetCount } = require('../commands/count');
const { cmdRelevance } = require('../commands/relevance');
const { cmdGrok, cmdSetGrokKey } = require('../commands/ai');
const { cmdTodos, cmdKick, cmdDel, cmdMute, cmdUnmute, cmdPromote, cmdDemote, cmdNotifAdmin, cmdAntiAdmin, cmdAntiBusiness, isMuted, cmdAdd, cmdAntiLink, cmdAllow, cmdClose, cmdOpen } = require('../commands/group');
const { cmdShip } = require('../commands/ship');
const { cmdTtp } = require('../commands/ttp');
const { cmdToImg, cmdToVid } = require('../commands/toimg');
const { cmdPfp } = require('../commands/pfp');
const { cmdFk, cmdMarkFake, cmdFkBan, cmdFkUnban, cmdAntiFake } = require('../commands/fk');
const { maybeIndex } = require('../utils/pfpIndexer');
const { cmdGay, cmdSimp, cmdHot, cmdRata, cmdMaricon, cmdFriki, cmdCrack, cmdInteligencia, cmdCerdo, cmdFeminidad, cmdMasculinidad, cmdInutil, cmdFemboy, cmdPerdedor, cmdGanador, cmdPuta, cmdGuarra, cmdFiel, cmdInfiel } = require('../commands/percent');
const { cmdRizz, cmdPiropo, cmdCoach } = require('../commands/wingman');
const { cmdAura } = require('../commands/aura');
const { resetAura } = require('../utils/auraStore');
const { cmdMog } = require('../commands/mog');
const { cmdRobo } = require('../commands/robo');
const { cmdDuel } = require('../commands/duel');
const { cmdScan } = require('../commands/scan');
const { cmdAntiFoto } = require('../commands/cleanup');
const { cmdVs, cmdInactivos } = require('../commands/activity');
const { cmdRoast } = require('../commands/roast');
const { cmdDar } = require('../commands/dar');
const { cmdOn, cmdOff, cmdPing, cmdInfo, cmdHelp, cmdCasino } = require('../commands/social');
const { isOwner, isMainOwner, isGroupAdmin, isBotAdmin, extractText, rememberMapping, getSender } = require('../utils/wa');
const logger = require('../utils/logger');

// Hosts allowed without penalty (only a "send once" reminder). Matched against
// the bare host so subdomains (m.youtube.com, www.instagram.com) pass but
// look-alikes (youtube.com.evil.com) do NOT.
const LINK_WHITELIST = /(?:^|\.)(?:youtube\.com|youtu\.be|instagram\.com|instagr\.am)$/i;

// Conservative URL detector: needs an explicit scheme/www or a known invite
// domain, so plain talk like "node.js" or "archivo.txt" isn't treated as a link.
const URL_RE = /(?:https?:\/\/|www\.)[^\s]+|(?:t\.me|chat\.whatsapp\.com)\/[^\s]+/gi;

function hostOf(url) {
  let s = String(url).replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  const cut = s.search(/[/?#]/);
  if (cut >= 0) s = s.slice(0, cut);
  return s.toLowerCase();
}

// 'none' = no links; 'whitelisted' = only YouTube/Instagram links present;
// 'blocked' = at least one non-whitelisted link (websites, WhatsApp/Telegram
// invites, etc.) — those get the sender kicked and the message deleted.
function classifyLinks(text) {
  const matches = text.match(URL_RE);
  if (!matches) return 'none';
  let whitelisted = false;
  for (const m of matches) {
    if (LINK_WHITELIST.test(hostOf(m))) { whitelisted = true; continue; }
    return 'blocked';
  }
  return whitelisted ? 'whitelisted' : 'none';
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

// Commands that need group metadata — skip the network call for everything else
const NEEDS_META = new Set([
  'on','off','tagall','todos','all','everyone',
  'kick','expulsar','del','borrar','delete','add','agregar',
  'ship','mute','unmute','desmute',
  'promote','ascender','demote','degradar','notifadmin','antiadmin','antiempresa','antibusiness','antifoto',
  'antilink','allow','permitir','close','cerrar','open','abrir',
  's','sticker','stk',   // cmdSticker SI recibe groupMeta
  // play/ttp/toimg/tovid/g/dar NO estan aqui a proposito: el dispatch no les
  // pasa groupMeta y sus modulos no lo mencionan, asi que pedirlo solo anyadia
  // una peticion de red (hasta 8s con la cache fria) antes de ejecutarlos.
  'gay','simp','sexy','hot','rata','maricon','maricón','friki',
  'crack','inteligencia','cerdo','feminidad','masculinidad','inutil','femboy','perdedor','ganador',
  'puta','guarra','fiel','infiel',
  'rizz',   // piropo y coach NO: sus handlers no reciben groupMeta (wingman.js:146,158)
  'aura','resetaura','inactivos','inactivo','fantasma','fantasmas','mog','moggear','roast','flamear',
  'duel','duelo','1v1',
  'robo','robar',
  'vs','versus',          // cmdVs receives groupMeta for isOwner/isGroupAdmin checks
  'scan','escanear',
  'fk','verificar','verify','check','marcarfake','fake',
  'fkban','fkunban','antifake','antifk',
  'count','resetcount','resetconteo',
  'relevancia','relevance',   // isMainOwner necesita meta para resolver LID → teléfono
  // Owner-gated commands also need meta in groups to resolve LID → phone
  // for isOwner checks (otherwise co-owners always fail in modern groups).
  'clearcache','borracache','setgrok','setkey','whoami',
]);

// Comandos que TRABAJAN sobre la foto o el vídeo que llevan adjunto. La guarda
// de medios sin "ver una vez" los deja pasar: mandar una foto con el pie *!s*
// es usar el bot, no spamear, y contarlo como ofensa acababa expulsando a gente
// por hacerse cinco stickers seguidos. Con un vídeo pasaba algo peor: se
// borraba antes de llegar al comando, así que *!s* sobre un vídeo normal no
// producía sticker nunca.
//
// Es una lista cerrada a propósito. Si valiera cualquier texto que empiece por
// el prefijo, bastaría con poner *!loquesea* de pie para saltarse la norma.
const MEDIA_CMDS = new Set([
  's','sticker','stk',
  'toimg','stimg','tovid',
  'fk','verificar','verify','check',
  // marcarfake y fake NO estan aqui: no miran el medio adjunto, trabajan sobre
  // una mencion o una cita. Tenerlos dentro era justo el atajo que esta lista
  // dice impedir — bastaba con poner *!marcarfake* de pie de foto para saltarse
  // la norma de ver-una-vez y el contador de rafagas.
]);

// Expulsa y dice si WhatsApp lo aceptó DE VERDAD.
//
// La llamada devuelve un resultado por participante y puede rechazar la
// expulsión (privacidad, el objetivo es admin, el bot perdió el admin entre
// medias). Las guardas automáticas la lanzaban sin mirar y anunciaban la
// expulsión igual, así que el bot afirmaba haber echado a alguien que seguía
// sentado en el grupo — el mismo fallo que ya se corrigió en las purgas.
async function expulsar(sock, jid, target) {
  try {
    const res = await sock.groupParticipantsUpdate(jid, [target], 'remove');
    const fila = Array.isArray(res)
      ? res.find(r => (r?.jid || '').split('@')[0] === target.split('@')[0])
      : null;
    return String(fila?.status ?? '200') === '200';
  } catch { return false; }
}

function esComandoDeMedia(text) {
  if (!text.startsWith(config.prefix)) return false;
  const first = text.slice(config.prefix.length).trim().split(/\s+/, 1)[0].toLowerCase();
  return MEDIA_CMDS.has(first);
}

// Throttle whitelist reminder to once per user per 5 min (no spam on every YT link).
const ANTILINK_REMINDER_TTL = 5 * 60 * 1000;
const antilinkReminders = new Map(); // 'groupJid|sender' -> timestamp
const antilinkNoAdminWarn = new Map(); // 'groupJid' -> timestamp (bot-not-admin notice)
const videoOnceWarn = new Map();       // 'groupJid|sender|vo' -> timestamp del ultimo aviso

// Group metadata cache: 30s TTL, bounded at 500 entries (FIFO eviction).
// Bot.js calls invalidateGroupMeta() on participant changes so the cache
// never serves stale member lists right after joins/kicks/promotes.
const META_TTL = 30_000;
const META_MAX = 500;
const metaCache = new Map();

// Hard timeout on the groupMetadata call — without this, a stalled WebSocket
// can hang the entire message handler for tens of seconds (or forever).
const META_FETCH_TIMEOUT = 8000;

async function getGroupMeta(sock, jid) {
  const c = metaCache.get(jid);
  if (c && Date.now() - c.ts < META_TTL) return c.meta;
  try {
    const meta = await Promise.race([
      sock.groupMetadata(jid),
      new Promise((_, rej) => setTimeout(() => rej(new Error('groupMetadata timeout')), META_FETCH_TIMEOUT)),
    ]);
    if (metaCache.size >= META_MAX) {
      metaCache.delete(metaCache.keys().next().value);
    }
    metaCache.set(jid, { meta, ts: Date.now() });
    return meta;
  } catch {
    return c?.meta ?? null;
  }
}

function invalidateGroupMeta(jid) {
  metaCache.delete(jid);
}

// Non-blocking peek: returns whatever group metadata is already cached (even if
// past its TTL) without ever triggering a network fetch. Used in the hot
// message path to resolve the owner's LID → phone for the counter exclusion,
// where a real fetch on every message would be far too expensive. Owner
// identity is stable, so a slightly stale member list is fine here.
function peekGroupMeta(jid) {
  return metaCache.get(jid)?.meta ?? null;
}

// Peel envelope wrappers so the real content (and its caption) is visible.
// Disappearing-message chats wrap EVERY message in ephemeralMessage; view-once
// media and the newer documentWithCaption envelope nest the same way. Without
// this, sending a video/image WITH a `!s` caption in such a chat hides the
// caption (extractText only checks top-level fields) so the command never fires
// — the exact "send the video and the command together and nothing happens" bug.
function unwrapEnvelope(message) {
  let m = message;
  for (let i = 0; i < 4 && m; i++) {
    const inner =
      m.ephemeralMessage?.message ||
      m.viewOnceMessage?.message ||
      m.viewOnceMessageV2?.message ||
      m.viewOnceMessageV2Extension?.message ||
      m.documentWithCaptionMessage?.message;
    if (!inner) break;
    m = inner;
  }
  return m;
}

// ─── Estados publicados al grupo ─────────────────────────────────────────────
//
// Publicar un estado dentro del grupo esta PROHIBIDO, traiga lo que traiga: da
// igual que sea un enlace o una foto del atardecer. Se borra, se banea la cuenta
// y se expulsa a quien lo publico. Admins y owner tier quedan exentos.
//
// Que este prohibido siempre es ademas lo que hace fiable al guardia. Antes solo
// se actuaba si el estado contenia un enlace, y para eso habia que leer su
// contenido — pero el mensaje que llega al grupo es un AVISO, no el estado: el
// contenido de verdad vive en la difusion de estados, no aqui. Como no habia
// texto que leer, nunca se encontraba enlace y el bot no hacia nada. Ahora no se
// lee nada: basta con reconocer el sobre.
//
// Se miran TODOS los sobres que usa WhatsApp para esto. El que faltaba, y que
// costo que esto no funcionara, era `groupStatusMessage` (WAProto/index.d.ts:
// 5264) — distinto de `groupStatusMentionMessage`, que si se comprobaba.
const SOBRES_ESTADO = [
  'groupStatusMessage',          // el estado empujado al grupo
  'groupStatusMentionMessage',   // el grupo mencionado en un estado
  'statusMentionMessage',
  'statusAddYours',
  'statusNotificationMessage',
  'statusQuestionAnswerMessage',
  'statusStickerInteractionMessage',
];

// Marcas dentro del contextInfo que delatan un estado aunque no venga el sobre.
function marcaDeEstado(ctx) {
  if (!ctx) return false;
  return ctx.isMentionedInStatus === true ||
    ctx.isGroupStatus === true ||
    Boolean(ctx.statusMentionMessageInfo) ||
    Boolean(ctx.statusAttributionType) ||
    Boolean(ctx.statusSourceType) ||
    (Array.isArray(ctx.statusMentions) && ctx.statusMentions.length > 0) ||
    (Array.isArray(ctx.statusMentionSources) && ctx.statusMentionSources.length > 0);
}

// ¿Es un estado publicado al grupo? Devuelve por que se ha reconocido (para el
// log) o null si no lo es.
function motivoEstado(message) {
  if (!message) return null;
  for (const s of SOBRES_ESTADO) {
    if (message[s]) return s;
  }
  // El sobre puede venir dentro de un envoltorio efimero o de ver-una-vez.
  const dentro = unwrapEnvelope(message);
  if (dentro !== message) {
    for (const s of SOBRES_ESTADO) {
      if (dentro?.[s]) return s + ' (envuelto)';
    }
  }
  for (const m of [message, dentro]) {
    if (!m) continue;
    for (const k of Object.keys(m)) {
      const ctx = m[k]?.contextInfo;
      if (ctx && marcaDeEstado(ctx)) return `contextInfo.${k}`;
    }
  }
  return null;
}

// Tipos de mensaje que el bot ya sabe manejar. Cualquier otro que llegue a un
// grupo se registra UNA vez, para que un sobre nuevo de WhatsApp no vuelva a
// pasar desapercibido como paso con groupStatusMessage.
const TIPOS_CONOCIDOS = new Set([
  'conversation', 'extendedTextMessage', 'imageMessage', 'videoMessage',
  'audioMessage', 'stickerMessage', 'documentMessage', 'documentWithCaptionMessage',
  'contactMessage', 'contactsArrayMessage', 'locationMessage', 'liveLocationMessage',
  'reactionMessage', 'protocolMessage', 'senderKeyDistributionMessage',
  'messageContextInfo', 'ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2',
  'viewOnceMessageV2Extension', 'pollCreationMessage', 'pollCreationMessageV2',
  'pollCreationMessageV3', 'pollUpdateMessage', 'editedMessage', 'ptvMessage',
  'templateMessage', 'buttonsMessage', 'listMessage', 'listResponseMessage',
  'buttonsResponseMessage', 'templateButtonReplyMessage', 'interactiveMessage',
  'interactiveResponseMessage', 'albumMessage', 'eventMessage', 'commentMessage',
  'keepInChatMessage', 'stickerSyncRmrMessage', 'encReactionMessage',
  ...SOBRES_ESTADO,
]);
const tiposVistos = new Set();
function anotarTipoDesconocido(message) {
  for (const k of Object.keys(message || {})) {
    if (TIPOS_CONOCIDOS.has(k) || tiposVistos.has(k)) continue;
    if (tiposVistos.size > 200) return;
    tiposVistos.add(k);
    logger.warn(`tipo de mensaje NUEVO en grupo: ${k} — si algo deja de detectarse, empieza por aqui`);
  }
}

// ¿El mensaje venía marcado como "ver una vez"?
//
// Hay que preguntarlo ANTES de unwrapEnvelope: esa función abre el envoltorio
// viewOnce y a partir de ahí un vídeo efímero es indistinguible de uno normal.
// Se recorre la cadena de envoltorios porque un chat con mensajes temporales
// mete el viewOnce dentro de un ephemeralMessage.
function isViewOnce(message) {
  let m = message;
  for (let i = 0; i < 4 && m; i++) {
    if (m.viewOnceMessage || m.viewOnceMessageV2 || m.viewOnceMessageV2Extension) return true;
    const inner =
      m.ephemeralMessage?.message ||
      m.viewOnceMessage?.message ||
      m.viewOnceMessageV2?.message ||
      m.viewOnceMessageV2Extension?.message ||
      m.documentWithCaptionMessage?.message;
    if (!inner) break;
    m = inner;
  }
  // WhatsApp marca además la bandera en el propio medio.
  const inner = unwrapEnvelope(message);
  return Boolean(inner?.videoMessage?.viewOnce || inner?.imageMessage?.viewOnce);
}

async function handleMessage(sock, msg) {
  if (!msg.message) return;
  // Se comprueba ANTES de desenvolver: unwrapEnvelope destruye la prueba.
  const eraViewOnce = isViewOnce(msg.message);
  // Replace the wrapped message with its real inner content so extractText and
  // every command's media lookup operate on the actual image/video/caption.
  msg.message = unwrapEnvelope(msg.message);

  const jid = msg.key.remoteJid;
  if (!jid) return; // protocol/system message without a chat JID — nothing to do
  const sender = getSender(msg);
  const text = extractText(msg).trim();

  // Correspondencia LID<->teléfono que WhatsApp adjunta a CADA mensaje de grupo.
  // Es la fuente más barata y fresca que hay, y de ella depende que una persona
  // no se parta en dos identidades (aura, conteo, owner).
  //
  // El campo es `participantAlt`, NO `participantPn`: este último no existe en
  // la key de un mensaje en Baileys 7 (Types/Message.d.ts declara participantAlt,
  // y Utils/decode-wa-message.js:187 es quien lo rellena). Leerlo daba undefined
  // siempre, así que esta capa entera llevaba sin funcionar.
  //
  // Y `participantAlt` es la forma ALTERNATIVA, no siempre el teléfono: en un
  // grupo direccionado por LID participant es el LID y alt el teléfono, pero en
  // uno direccionado por PN es al revés (extractAddressingContext, mismo
  // fichero, líneas 69-86). Guardar el par al revés metería basura en la caché
  // de mapeos, así que se decide por addressingMode y, si no viene, por el
  // servidor del propio JID.
  let senderPn = null;
  const alt = msg.key.participantAlt || msg.key.participantPn; // participantPn: solo compat
  if (alt && msg.key.participant) {
    const altEsLid = msg.key.addressingMode
      ? msg.key.addressingMode !== 'lid'
      : String(alt).endsWith('@lid');
    if (altEsLid) {
      rememberMapping(alt, msg.key.participant);
      senderPn = msg.key.participant;
    } else {
      rememberMapping(msg.key.participant, alt);
      senderPn = alt;
    }
  }

  // Skip own messages that aren't commands (avoids bot responding to itself)
  // fromMe = true when the owner sends from their linked phone — still allow commands
  if (msg.key.fromMe && !text.startsWith(config.prefix)) return;

  // Non-blocking counters — never delay command execution.
  // Don't count the bot's own messages so the owner doesn't inflate their rank.
  incrementStat('messagesReceived');
  // El owner principal no cuenta para el ranking de actividad (!count): sus
  // mensajes no deben inflar la tabla. Los co-owners y el resto sí cuentan.
  // Se comprueba de dos formas para que sea fiable incluso en grupos LID:
  //  1) el JID del remitente resuelto con la metadata ya cacheada,
  //  2) su teléfono, sacado arriba del par que trae el propio mensaje. Esta es
  //     la que salva el caso de recién arrancado, con la caché de metadata
  //     vacía y el LID del owner aún sin aprender.
  const senderIsMainOwner =
    isMainOwner(sender, false, peekGroupMeta(jid)) ||
    (!!senderPn && isMainOwner(senderPn, false, null));
  if (!msg.key.fromMe && jid.endsWith('@g.us') && sender && !senderIsMainOwner) {
    incrementMsgCount(jid, sender).catch(() => {});
    // verifiedBizName solo viaja en mensajes de cuentas Business: se anota como
    // prueba directa para !antiempresa, sin gastar una consulta de perfil.
    //
    // Del owner tier NO se anota: esa ficha es justo la que alimenta la purga de
    // !antiempresa, y con el gate de arriba (isMainOwner, para el ranking) los
    // co-owners si quedaban fichados. El owner esta por encima tambien de esto.
    if (msg.verifiedBizName && !isOwner(sender, msg.key.fromMe, peekGroupMeta(jid))) {
      recordFacts(sender, { biz: true }).catch(() => {});
    }
    checkCasinoMilestone(sock, jid, sender).catch(() => {});
    // Historial de huellas AUTOMÁTICO: indexa la foto de quien escribe (con
    // guarda TTL, así baja cada foto como mucho una vez cada pocos días). Es el
    // motor que hace que !fk detecte multicuentas sin registrar nada a mano.
    maybeIndex(sock, msg.key.participant || sender, jid);
  }

  // Sync in-memory check — no async overhead.
  // Exact-command match so things like "!once" don't bypass disabled state.
  if (!isBotEnabled(jid)) {
    const rest = text.startsWith(config.prefix) ? text.slice(config.prefix.length) : '';
    const firstWord = rest.split(/\s+/, 1)[0].toLowerCase();
    if (firstWord !== 'on') return;
  }

  // Anti-link: YouTube/Instagram get a "send once" reminder; any other link
  // (websites, WhatsApp/Telegram invites, etc.) → delete the message and kick
  // the sender. Admins and the owner tier are exempt.
  // Anti-spam de estados: publicar un estado en el grupo se usa casi siempre
  // para colar enlaces de otros grupos. Si el estado trae CUALQUIER enlace, se
  // borra y se expulsa a quien lo publicó. Sin enlaces no se toca nada: se
  // permite el estado y punto. Va antes que el antilink normal y no depende de
  // su interruptor, porque este caso es spam inequívoco.
  //
  // Mismas garantías que el resto de la moderación: nunca toca a admins, al
  // owner tier ni al bot, y necesita ser admin para actuar.
  // Orden de las guardas automaticas, de la mas dura a la mas blanda:
  //   1. historia publicada al grupo -> borrar + ban + expulsar
  //   2. enlace prohibido            -> borrar + expulsar
  //   3. medio sin ver-una-vez       -> borrar (+ ban si es rafaga)
  //
  // El anti-link va por delante del de medios porque si no un enlace de
  // invitacion puesto de pie de foto solo costaba el borrado, mientras que el
  // mismo enlace en texto suelto costaba el grupo. Era la via de escape
  // evidente para cualquiera que quisiera colar el suyo.
  if (jid.endsWith('@g.us')) {
    anotarTipoDesconocido(msg.message);
    const porQue = motivoEstado(msg.message);
    if (porQue) {
      // Se registra SIEMPRE, se actúe o no: si mañana WhatsApp cambia el sobre,
      // este log es lo que dice si el mensaje llegó a reconocerse.
      logger.info(`estado en grupo detectado por ${porQue} — tipos=[${Object.keys(msg.message || {}).join(',')}]`);

      const meta = await getGroupMeta(sock, jid);
      const protegido = !meta ||
        isGroupAdmin(sender, msg.key.fromMe, meta) ||
        isOwner(sender, msg.key.fromMe, meta);

      if (protegido) return;
      if (!isBotAdmin(sock, meta)) {
        logger.warn(`estado en grupo ${jid}: no soy admin, no puedo borrarlo ni expulsar`);
        return;
      }

      sock.sendMessage(jid, { delete: { remoteJid: jid, fromMe: false, id: msg.key.id, participant: sender } }).catch(() => {});
      // Lista negra global, igual que el spam de medios: no basta con echarlo, no
      // debe poder volver a entrar con la misma cuenta a repetirlo.
      await banAccount(allForms(sender, meta), `estado publicado en ${jid}`, 'auto').catch(() => {});
      const fuera = await expulsar(sock, jid, sender);
      sock.sendMessage(jid, {
        text: fuera
          ? `@${sender.split('@')[0]} baneado por publicar un estado en el grupo. Aquí no se suben estados, ni con enlaces ni sin ellos.`
          : `@${sender.split('@')[0]} publicó un estado en el grupo. Borrado y a la lista negra, pero no he podido expulsarlo: hacedlo a mano.`,
        mentions: [sender],
      }).catch(() => {});
      return; // un estado no sigue procesándose en ningún caso
    }
  }

  if (jid.endsWith('@g.us') && text && isAntiLinkEnabled(jid)) {
    const verdict = classifyLinks(text);
    if (verdict !== 'none') {
      const meta = await getGroupMeta(sock, jid);
      // If meta is unavailable (timeout/network error), treat sender as non-admin
      // so moderation doesn't silently no-op when connectivity is degraded.
      const senderIsAdmin = meta ? isGroupAdmin(sender, msg.key.fromMe, meta) : false;
      if (!senderIsAdmin) {
        if (verdict === 'blocked') {
          // Without bot-admin (or without meta to verify it) the bot can neither
          // delete the message nor kick — warn once per group instead.
          if (!meta || !isBotAdmin(sock, meta)) {
            const lastW = antilinkNoAdminWarn.get(jid);
            if (!lastW || Date.now() - lastW > ANTILINK_REMINDER_TTL) {
              antilinkNoAdminWarn.set(jid, Date.now());
              sock.sendMessage(jid, {
                text: meta
                  ? 'Detecté un enlace no permitido, pero no soy admin y no puedo borrarlo ni expulsar. Dame admin para moderar.'
                  : 'Detecté un enlace no permitido pero no pude verificar permisos. Intenta de nuevo en un momento.',
              }).catch(() => {});
            }
            return;
          }
          sock.sendMessage(jid, { delete: { remoteJid: jid, fromMe: false, id: msg.key.id, participant: sender } }).catch(() => {});
          const fuera = await expulsar(sock, jid, sender);
          sock.sendMessage(jid, {
            text: fuera
              ? `@${sender.split('@')[0]} expulsado por enviar enlaces no permitidos.`
              : `@${sender.split('@')[0]} envió un enlace no permitido. Borrado, pero no he podido expulsarlo.`,
            mentions: [sender],
          }).catch(() => {});
          return;
        }
        // YouTube / Instagram. Quien tenga el permiso de *!allow* publica y ya.
        // Al resto se le borra el enlace y se le avisa; al TERCER aviso se le
        // banea, porque a la tercera ya no es un despiste, es spam.
        if (await isAllowed(jid, allForms(sender, meta))) return;

        // Sin bot admin no se puede borrar: se avisa una vez por grupo y ya. No
        // se cuenta el aviso, que sería castigar a alguien por algo que el bot
        // ni siquiera ha podido impedir.
        if (!meta || !isBotAdmin(sock, meta)) {
          const lastW = antilinkNoAdminWarn.get(jid);
          if (!lastW || Date.now() - lastW > ANTILINK_REMINDER_TTL) {
            antilinkNoAdminWarn.set(jid, Date.now());
            sock.sendMessage(jid, {
              text: 'Detecté un enlace, pero no soy admin y no puedo borrarlo. Dame admin para moderar.',
            }).catch(() => {});
          }
          return;
        }
        sock.sendMessage(jid, { delete: { remoteJid: jid, fromMe: false, id: msg.key.id, participant: sender } }).catch(() => {});

        const { avisos, restantes, ban } = await noteWarning(jid, sender);
        const num = sender.split('@')[0];

        if (ban) {
          // Los avisos se ponen a cero al banear, igual que hace el contador de
          // rafagas de medios: si vuelve al grupo, empieza otra vez con sus dos
          // avisos y no con un ban inmediato del que nadie le habria advertido.
          await resetWarnings(jid, sender).catch(() => {});
          await banAccount(allForms(sender, meta), `spam de enlaces sin permiso en ${jid}`, 'auto').catch(() => {});
          const fuera = await expulsar(sock, jid, sender);
          sock.sendMessage(jid, {
            text: fuera
              ? `@${num} baneado. Tres enlaces sin el *!allow* de un admin. Te avisamos dos veces y pasaste de todo, asi que fuera.`
              : `@${num} a la lista negra por soltar tres enlaces sin permiso. No he podido expulsarlo: hacedlo a mano.`,
            mentions: [sender],
          }).catch(() => {});
          return;
        }

        // El aviso va limitado a uno por persona cada 5 min: el enlace se borra
        // siempre, pero no se inunda el chat repitiéndoselo. El contador de
        // avisos sí sube siempre, que si no bastaría con spamear rápido.
        //
        // EXCEPCIÓN: el último aviso sale siempre, esté o no dentro del límite.
        // Si se lo tragara el silenciador, el siguiente enlace le costaría el
        // grupo sin que nadie le hubiera dicho que iba por ahí.
        const rKey = `${jid}|${sender}`;
        const lastR = antilinkReminders.get(rKey);
        if (restantes === 1 || !lastR || Date.now() - lastR > ANTILINK_REMINDER_TTL) {
          if (antilinkReminders.size >= 2000) antilinkReminders.delete(antilinkReminders.keys().next().value);
          antilinkReminders.set(rKey, Date.now());
          const cola = restantes === 1
            ? ' Aviso 2 de 3: al siguiente te vas del grupo.'
            : ` Aviso ${avisos} de 3.`;
          sock.sendMessage(jid, {
            text: `@${num} ${pickFresh(PERMISO_ENLACE, `${jid}|permiso`)}${cola}`,
            mentions: [sender],
          }).catch(() => {});
        }
        return;
      }
    }
  }

  // El guardia de estados va ANTES que el de medios: una historia puede venir
  // como foto o como vídeo, y si la mirara primero el de medios se quedaría en
  // "borrado y aviso" cuando lo que toca es borrar, banear y expulsar.
  // Medios sin "ver una vez".
  //
  // Fotos y vídeos van SIEMPRE en ver una vez. El que llegue normal se borra al
  // momento, sea del tipo que sea. Además, la ráfaga se castiga con ban: tres
  // vídeos en 1 minuto o cinco fotos en 30 segundos del mismo número.
  //
  // Los GIF quedan fuera: WhatsApp los manda como vídeo pero no se pueden
  // enviar en modo efímero, así que exigirlo no tendría sentido.
  const video = msg.message?.videoMessage;
  const foto  = msg.message?.imageMessage;
  const medio = (video && !video.gifPlayback) ? 'video' : (foto ? 'image' : null);

  if (jid.endsWith('@g.us') && medio && !eraViewOnce && !esComandoDeMedia(text)) {
    const meta = await getGroupMeta(sock, jid);
    const protegido = !meta ||
      isGroupAdmin(sender, msg.key.fromMe, meta) ||
      isOwner(sender, msg.key.fromMe, meta);

    if (!protegido && isBotAdmin(sock, meta)) {
      const borrar = (id) => sock.sendMessage(jid, {
        delete: { remoteJid: jid, fromMe: false, id, participant: sender },
      }).catch(() => {});

      // Se borra siempre, foto o vídeo. Antes la foto suelta se dejaba pasar y
      // solo caía la ráfaga entera al llegar al quinto.
      borrar(msg.key.id);

      const { spam, ids } = noteOffence(jid, sender, medio, msg.key.id);

      if (spam) {
        // Ya se han borrado una a una al llegar, así que aquí no hay que
        // repetirlo: borrar de nuevo la ráfaga entera solo gastaba peticiones.
        forget(jid, sender);
        await banAccount(allForms(sender, meta), `spam de ${medio}s sin ver una vez en ${jid}`, 'auto')
          .catch(() => {});
        const fuera = await expulsar(sock, jid, sender);
        sock.sendMessage(jid, {
          text: fuera
            ? `@${sender.split('@')[0]} baneado por spam de ${medio === 'video' ? 'videos' : 'fotos'} sin *ver una vez*.`
            : `@${sender.split('@')[0]} a la lista negra por spam de ${medio === 'video' ? 'videos' : 'fotos'} sin *ver una vez*. No he podido expulsarlo: hacedlo a mano.`,
          mentions: [sender],
        }).catch(() => {});
        return;
      }

      // Aviso limitado a uno por persona cada 5 min: se borra todo igualmente,
      // pero no se inunda el chat de avisos.
      const wKey = `${jid}|${sender}|vo`;
      const last = videoOnceWarn.get(wKey);
      if (!last || Date.now() - last > ANTILINK_REMINDER_TTL) {
        if (videoOnceWarn.size >= 2000) videoOnceWarn.delete(videoOnceWarn.keys().next().value);
        videoOnceWarn.set(wKey, Date.now());
        sock.sendMessage(jid, {
          text: `@${sender.split('@')[0]} las fotos y los videos se envian siempre en *ver una vez*. Borrado.`,
          mentions: [sender],
        }).catch(() => {});
      }
      return; // no sigue procesandose
    }
  }

  if (!text.startsWith(config.prefix)) return;

  const args = text.slice(config.prefix.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();
  if (!command) return;

  // Check mute before anything else — but the owner tier is never silenced, so a
  // stale or malicious mute can't lock the owner/co-owner out of their own bot.
  // peekGroupMeta y no null: es la unica comprobacion de owner del fichero que
  // renunciaba a la metadata, justo en la exencion que promete que a él no le
  // silencia nadie. Con la metadata resuelve todas sus formas de JID.
  if (isMuted(jid, sender) && !isOwner(sender, msg.key.fromMe, peekGroupMeta(jid))) return;

  logger.cmd(sender.split('@')[0], `${config.prefix}${command} ${args.join(' ')}`);
  incrementStat('commandsExecuted');

  // Only fetch group metadata for commands that actually need it
  let groupMeta = null;
  if (jid.endsWith('@g.us') && NEEDS_META.has(command)) {
    groupMeta = await getGroupMeta(sock, jid);
    // Con metadata SÍ podemos resolver el LID del remitente de forma fiable.
    // Si es el owner principal, isMainOwner lo aprende y lo guarda, así el
    // contador (que corre sin metadata) lo excluye para siempre. Basta con que
    // el owner use un comando una vez (p. ej. !whoami) para quedar registrado.
    if (groupMeta) isMainOwner(sender, msg.key.fromMe, groupMeta);
  }

  try {
    switch (command) {
      case 'playsong':
      case 'playaudio':
      case 'play':
        await cmdPlay(sock, msg, args);
        break;

      case 'cachelist':
      case 'listacache':
      case 'cache':
        await cmdCacheList(sock, msg);
        break;

      case 'clearcache':
      case 'borracache':
        if (isOwner(sender, msg.key.fromMe, groupMeta)) {
          await cmdClearCache(sock, msg);
        } else {
          await sock.sendMessage(jid, { text: 'Solo el owner puede usar este comando.' }, { quoted: msg });
        }
        break;

      case 'whoami':
        await sock.sendMessage(jid, {
          text: `Tu JID: *${sender}*\nOwner: *${isOwner(sender, msg.key.fromMe, groupMeta) ? 'Si' : 'No'}*`,
        }, { quoted: msg });
        break;

      case 's':
      case 'sticker':
      case 'stk':
        await cmdSticker(sock, msg, groupMeta);
        break;

      case 'top5':
        await cmdTopRandom(sock, msg, 5, args);
        break;

      case 'top10':
        await cmdTopRandom(sock, msg, 10, args);
        break;

      case 'count':
        await cmdCount(sock, msg, groupMeta, args);
        break;

      case 'fiel':      await cmdFiel(sock, msg, groupMeta); break;
      case 'infiel':    await cmdInfiel(sock, msg, groupMeta); break;

      case 'relevancia':
      case 'relevance':
        await cmdRelevance(sock, msg, groupMeta);
        break;

      case 'resetcount':
      case 'resetconteo':
        await cmdResetCount(sock, msg, groupMeta);
        break;

      case 'g':
      case 'ai':
      case 'grok':
        await cmdGrok(sock, msg, args);
        break;

      case 'setgrok':
      case 'setkey':
        await cmdSetGrokKey(sock, msg, args, groupMeta);
        break;

      case 'tagall':
      case 'todos':
      case 'all':
      case 'everyone':
        await cmdTodos(sock, msg, args, groupMeta);
        break;

      case 'promote':
      case 'ascender':
        await cmdPromote(sock, msg, args, groupMeta);
        break;

      case 'demote':
      case 'degradar':
        await cmdDemote(sock, msg, args, groupMeta);
        break;

      case 'notifadmin':
        await cmdNotifAdmin(sock, msg, args, groupMeta);
        break;

      case 'antiadmin':
        await cmdAntiAdmin(sock, msg, args, groupMeta);
        break;

      case 'antifoto':
        await cmdAntiFoto(sock, msg, args, groupMeta);
        break;

      case 'antiempresa':
      case 'antibusiness':
        await cmdAntiBusiness(sock, msg, args, groupMeta);
        break;

      case 'allow':
      case 'permitir':
        await cmdAllow(sock, msg, args, groupMeta);
        break;

      case 'antilink':
        await cmdAntiLink(sock, msg, args, groupMeta);
        break;

      case 'scan':
      case 'escanear':
        await cmdScan(sock, msg, groupMeta);
        break;

      case 'fk':
      case 'verificar':
      case 'verify':
      case 'check':
        await cmdFk(sock, msg, args, groupMeta);
        break;

      case 'marcarfake':
      case 'fake':
        await cmdMarkFake(sock, msg, args, groupMeta);
        break;

      case 'fkban':
        await cmdFkBan(sock, msg, args, groupMeta);
        break;

      case 'fkunban':
        await cmdFkUnban(sock, msg, args, groupMeta);
        break;

      case 'antifake':
      case 'antifk':
        await cmdAntiFake(sock, msg, args, groupMeta);
        break;

      case 'close':
      case 'cerrar':
        await cmdClose(sock, msg, groupMeta);
        break;

      case 'open':
      case 'abrir':
        await cmdOpen(sock, msg, groupMeta);
        break;

      case 'add':
      case 'agregar':
        await cmdAdd(sock, msg, args, groupMeta);
        break;

      case 'kick':
      case 'expulsar':
        await cmdKick(sock, msg, args, groupMeta);
        break;

      case 'del':
      case 'borrar':
      case 'delete':
        await cmdDel(sock, msg, groupMeta);
        break;

      case 'mute':
        await cmdMute(sock, msg, args, groupMeta);
        break;

      case 'unmute':
      case 'desmute':
        await cmdUnmute(sock, msg, args, groupMeta);
        break;

      case 'ship':
        await cmdShip(sock, msg, args, groupMeta);
        break;

      case 'ttp':
        await cmdTtp(sock, msg, args);
        break;

      case 'toimg':
      case 'stimg':
        await cmdToImg(sock, msg);
        break;

      case 'tovid':
        await cmdToVid(sock, msg);
        break;

      case 'pfp':
      case 'foto':
        await cmdPfp(sock, msg, args);
        break;

      case 'gay':        await cmdGay(sock, msg, groupMeta); break;
      case 'simp':       await cmdSimp(sock, msg, groupMeta); break;
      case 'sexy':
      case 'hot':        await cmdHot(sock, msg, groupMeta); break;
      case 'rata':       await cmdRata(sock, msg, groupMeta); break;
      case 'maricon':
      case 'maricón':    await cmdMaricon(sock, msg, groupMeta); break;
      case 'friki':      await cmdFriki(sock, msg, groupMeta); break;
      case 'crack':          await cmdCrack(sock, msg, groupMeta); break;
      case 'inteligencia':   await cmdInteligencia(sock, msg, groupMeta); break;
      case 'cerdo':          await cmdCerdo(sock, msg, groupMeta); break;
      case 'feminidad':      await cmdFeminidad(sock, msg, groupMeta); break;
      case 'masculinidad':   await cmdMasculinidad(sock, msg, groupMeta); break;
      case 'inutil':         await cmdInutil(sock, msg, groupMeta); break;
      case 'femboy':         await cmdFemboy(sock, msg, groupMeta); break;
      case 'perdedor':       await cmdPerdedor(sock, msg, groupMeta); break;
      case 'ganador':        await cmdGanador(sock, msg, groupMeta); break;
      case 'puta':           await cmdPuta(sock, msg, groupMeta); break;
      case 'guarra':         await cmdGuarra(sock, msg, groupMeta); break;

      case 'rizz':           await cmdRizz(sock, msg, groupMeta); break;
      case 'piropo':         await cmdPiropo(sock, msg, groupMeta); break;
      case 'coach':          await cmdCoach(sock, msg, groupMeta); break;

      case 'aura':           await cmdAura(sock, msg, args, groupMeta); break;

      case 'resetaura':
        if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
          await sock.sendMessage(jid, { text: 'Solo el owner puede resetear el aura.' }, { quoted: msg });
        } else if (!jid.endsWith('@g.us')) {
          await sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
        } else {
          await resetAura(jid);
          await sock.sendMessage(jid, { text: 'Aura de todos reseteada. El marcador empieza desde cero.' }, { quoted: msg });
        }
        break;

      case 'mog':
      case 'moggear':
        await cmdMog(sock, msg, groupMeta);
        break;

      case 'roast':
      case 'flamear':
        await cmdRoast(sock, msg, groupMeta);
        break;

      case 'dar':
      case 'donar':
        await cmdDar(sock, msg, args);
        break;

      case 'robo':
      case 'robar':
        await cmdRobo(sock, msg, args, groupMeta);
        break;

      case 'duel':
      case 'duelo':
      case '1v1':
        await cmdDuel(sock, msg, args, groupMeta);
        break;

      case 'vs':
      case 'versus':
        await cmdVs(sock, msg, args, groupMeta);
        break;

      case 'inactivos':
      case 'inactivo':
      case 'fantasma':
      case 'fantasmas':
        await cmdInactivos(sock, msg, groupMeta);
        break;

      case 'on':
        await cmdOn(sock, msg, groupMeta);
        break;

      case 'off':
        await cmdOff(sock, msg, groupMeta);
        break;

      case 'ping':
        await cmdPing(sock, msg);
        break;

      case 'info':
      case 'estado':
      case 'status':
        await cmdInfo(sock, msg);
        break;

      case 'casino':
        await cmdCasino(sock, msg);
        break;

      case 'ayuda':
      case 'help':
      case 'menu':
      case 'commands':
        await cmdHelp(sock, msg);
        break;

      default:
        break;
    }
  } catch (err) {
    logger.error(`Command ${command} error: ${err.message}`);
    sock.sendMessage(jid, { text: `Error inesperado: ${err.message}` }, { quoted: msg }).catch(() => {});
  }

}

module.exports = { handleMessage, invalidateGroupMeta, getGroupMeta, PERMISO_ENLACE };
