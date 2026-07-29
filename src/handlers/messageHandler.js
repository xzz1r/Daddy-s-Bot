const config = require('../config');
const { isBotEnabled, incrementStat, isAntiLinkEnabled } = require('../utils/state');
const { increment: incrementMsgCount } = require('../utils/messageCounter');
const { recordFacts } = require('../utils/nickStore');
const { noteOffence, forget } = require('../utils/mediaSpam');
const { banAccount } = require('../utils/banlist');
const { allForms } = require('../commands/fk');
const { checkCasinoMilestone } = require('../utils/casino');
const { cmdPlay, cmdCacheList, cmdClearCache } = require('../commands/music');
const { cmdSticker } = require('../commands/sticker');
const { cmdTopRandom } = require('../commands/topsRandom');
const { cmdCount, cmdResetCount } = require('../commands/count');
const { cmdRelevance } = require('../commands/relevance');
const { cmdGrok, cmdSetGrokKey } = require('../commands/ai');
const { cmdTodos, cmdKick, cmdDel, cmdMute, cmdUnmute, cmdPromote, cmdDemote, cmdNotifAdmin, cmdAntiAdmin, cmdAntiBusiness, isMuted, cmdAdd, cmdAntiLink, cmdClose, cmdOpen } = require('../commands/group');
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

// Commands that need group metadata — skip the network call for everything else
const NEEDS_META = new Set([
  'on','off','tagall','todos','all','everyone',
  'kick','expulsar','del','borrar','delete','add','agregar',
  'ship','mute','unmute','desmute',
  'promote','ascender','demote','degradar','notifadmin','antiadmin','antiempresa','antibusiness','antifoto',
  'antilink','close','cerrar','open','abrir',
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
  'fk','verificar','verify','check','marcarfake','fake',
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
// WhatsApp permite publicar un estado que se empuja dentro del grupo. Llega
// envuelto en groupStatusMentionMessage / statusMentionMessage, que son
// FutureProofMessage: el contenido real cuelga de .message. Ese envoltorio NO
// lo abre unwrapEnvelope a propósito, para poder distinguir un estado de un
// mensaje normal.
//
// Devuelve el contenido del estado, o null si el mensaje no es un estado.
function statusPayload(message) {
  const w = message?.groupStatusMentionMessage || message?.statusMentionMessage;
  return w?.message || null;
}

// Todo el texto visible de un contenido de estado: cuerpo y pies de foto.
// Se concatena en lugar de quedarse con el primero, porque el enlace puede
// venir en cualquiera de ellos.
function statusText(inner) {
  if (!inner) return '';
  const m = unwrapEnvelope(inner);
  return [
    m?.conversation,
    m?.extendedTextMessage?.text,
    m?.imageMessage?.caption,
    m?.videoMessage?.caption,
    m?.documentMessage?.caption,
  ].filter(t => typeof t === 'string' && t).join(' ');
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
    if (msg.verifiedBizName) {
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
  // Medios sin "ver una vez".
  //
  //  - Vídeo: va SIEMPRE en ver una vez. El que llegue normal se borra al
  //    momento. Tres del mismo número en 1 minuto es spam: ban.
  //  - Foto: una suelta no molesta, así que no se borra. Cinco del mismo
  //    número en 30 segundos sí es ráfaga: ban y se borran esas fotos.
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

      // El vídeo se borra siempre; la foto solo si acaba siendo spam.
      if (medio === 'video') borrar(msg.key.id);

      const { spam, ids } = noteOffence(jid, sender, medio, msg.key.id);

      if (spam) {
        if (medio === 'image') ids.forEach(borrar); // ahora sí: la ráfaga entera
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

      if (medio === 'video') {
        // Aviso limitado a uno por persona cada 5 min: se borran todos los
        // vídeos igualmente, pero no se inunda el chat de avisos.
        const wKey = `${jid}|${sender}|vo`;
        const last = videoOnceWarn.get(wKey);
        if (!last || Date.now() - last > ANTILINK_REMINDER_TTL) {
          if (videoOnceWarn.size >= 2000) videoOnceWarn.delete(videoOnceWarn.keys().next().value);
          videoOnceWarn.set(wKey, Date.now());
          sock.sendMessage(jid, {
            text: `@${sender.split('@')[0]} los videos se envian siempre en *ver una vez*. Borrado.`,
            mentions: [sender],
          }).catch(() => {});
        }
        return; // el video no sigue procesandose
      }
    }
  }

  const statusInner = statusPayload(msg.message);
  if (jid.endsWith('@g.us') && statusInner) {
    const stext = statusText(statusInner);
    if (stext && URL_RE.test(stext)) {
      URL_RE.lastIndex = 0; // el flag /g mantiene estado entre llamadas
      const meta = await getGroupMeta(sock, jid);
      const protegido = !meta ||
        isGroupAdmin(sender, msg.key.fromMe, meta) ||
        isOwner(sender, msg.key.fromMe, meta);
      if (!protegido && isBotAdmin(sock, meta)) {
        sock.sendMessage(jid, { delete: { remoteJid: jid, fromMe: false, id: msg.key.id, participant: sender } }).catch(() => {});
        const fuera = await expulsar(sock, jid, sender);
        sock.sendMessage(jid, {
          text: fuera
            ? `@${sender.split('@')[0]} expulsado por publicar un estado con enlaces en el grupo.`
            : `@${sender.split('@')[0]} publicó un estado con enlaces. Borrado, pero no he podido expulsarlo.`,
          mentions: [sender],
        }).catch(() => {});
      }
      return; // el estado con enlaces no sigue procesándose en ningún caso
    }
    URL_RE.lastIndex = 0;
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
        // whitelisted → gentle reminder once per user per 5 min, no deletion or kick
        const rKey = `${jid}|${sender}`;
        const lastR = antilinkReminders.get(rKey);
        if (!lastR || Date.now() - lastR > ANTILINK_REMINDER_TTL) {
          if (antilinkReminders.size >= 2000) antilinkReminders.delete(antilinkReminders.keys().next().value);
          antilinkReminders.set(rKey, Date.now());
          sock.sendMessage(jid, {
            text: 'Links de *YouTube* e *Instagram* permitidos. No spamees.',
          }, { quoted: msg }).catch(() => {});
        }
      }
    }
  }

  if (!text.startsWith(config.prefix)) return;

  const args = text.slice(config.prefix.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();
  if (!command) return;

  // Check mute before anything else — but the owner tier is never silenced, so a
  // stale or malicious mute can't lock the owner/co-owner out of their own bot.
  if (isMuted(jid, sender) && !isOwner(sender, msg.key.fromMe, null)) return;

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

module.exports = { handleMessage, invalidateGroupMeta, getGroupMeta };
