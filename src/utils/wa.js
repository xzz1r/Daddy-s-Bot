// Shared WhatsApp/Baileys helpers. Centralizing these kills the 4x duplicates
// of isAdmin and 2x of getTarget that were drifting across command files.

const fs = require('fs');
const path = require('path');
const config = require('../config');

const OWNER_DIGITS = String(config.ownerNumber).replace(/\D/g, '');
const ALL_OWNER_DIGITS = [
  OWNER_DIGITS,
  ...(config.coOwners || []).map(n => String(n).replace(/\D/g, '')),
];

// ── Learned owner-JID set ────────────────────────────────────────────────────
// The message counter runs in the hot path, BEFORE any group metadata fetch, so
// resolving an incoming LID → phone there is unreliable (in LID-only groups the
// mapping simply isn't available yet). But whenever a command runs we DO have
// metadata and can positively confirm the sender is the main owner. The moment
// we confirm it, we record that exact LID here and persist it — so from then on
// every message from that LID is recognized instantly, with zero resolution.
// LIDs are stable per account, so a learned entry never goes stale.
const OWNER_JIDS_FILE = path.join(__dirname, '../../data/ownerJids.json');
const knownOwnerJids = new Set();

// Synchronous load at startup: the file is tiny (a handful of JIDs) and having
// it ready before the first message avoids counting the owner right after a
// restart.
try {
  const raw = fs.readFileSync(OWNER_JIDS_FILE, 'utf8');
  const arr = JSON.parse(raw);
  if (Array.isArray(arr)) for (const j of arr) if (j) knownOwnerJids.add(j);
} catch { /* ENOENT o JSON inválido: se empieza vacío, se re-aprende solo */ }

let ownerSaveTimer = null;
function scheduleOwnerSave() {
  if (ownerSaveTimer) return;
  ownerSaveTimer = setTimeout(() => {
    ownerSaveTimer = null;
    const tmp = OWNER_JIDS_FILE + '.tmp';
    try {
      fs.mkdirSync(path.dirname(OWNER_JIDS_FILE), { recursive: true });
      fs.writeFileSync(tmp, JSON.stringify([...knownOwnerJids]));
      fs.renameSync(tmp, OWNER_JIDS_FILE);
    } catch { /* si falla el guardado, el set en memoria sigue válido */ }
  }, 5000);
}

function noteOwnerJid(jid) {
  if (!jid) return;
  const b = bareJid(jid);
  if (knownOwnerJids.has(b)) return;
  knownOwnerJids.add(b);
  scheduleOwnerSave();
}

function isKnownOwnerJid(jid) {
  return !!jid && knownOwnerJids.has(bareJid(jid));
}

// Vuelca ya lo que estuviera pendiente. El guardado normal espera 5 s, así que
// un apagado dentro de esa ventana se llevaba los JID de owner recién
// aprendidos y el bot volvía a arrancar sin reconocer al dueño hasta que algún
// comando trajera metadata otra vez.
function flushOwnerJids() {
  if (ownerSaveTimer) { clearTimeout(ownerSaveTimer); ownerSaveTimer = null; }
  const tmp = OWNER_JIDS_FILE + '.tmp';
  try {
    fs.mkdirSync(path.dirname(OWNER_JIDS_FILE), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify([...knownOwnerJids]));
    fs.renameSync(tmp, OWNER_JIDS_FILE);
  } catch { /* si falla, el set en memoria sigue válido */ }
}

// Strip device suffix (xxx:1@lid → xxx@lid). Baileys' msg.key.participant
// can carry a device tag that groupMeta.participants[].id does not, which
// breaks exact-equality lookups by JID.
function bareJid(j) {
  if (!j) return j;
  const at = String(j).indexOf('@');
  if (at < 0) return String(j);
  return String(j).slice(0, at).split(':')[0] + '@' + String(j).slice(at + 1);
}

// Global LID → phone-JID cache. Populated whenever isOwner sees a groupMeta,
// so a co-owner whose LID we've seen in any group will resolve correctly
// even in DMs where we have no metadata to look up.
const lidToPhone = new Map();
const MAX_LID_CACHE = 2000;

// Y se guardan en disco, no solo en memoria.
//
// Sin esto, CADA reinicio del bot abria una ventana en la que su @lid no
// significaba nada: !inactivos lo listaba, y !relevancia y !vs contestaban
// sobre el, porque los filtros que lo ocultan preguntan "¿este @lid es el
// owner?" y sin el mapeo la respuesta era que no. El bot se reinicia a menudo
// —actualizaciones, tope de RAM, cortes— asi que esa ventana se reabria sola
// una y otra vez.
//
// Se persiste el mapa entero, no solo el del owner: es el mismo dato que evita
// que a cualquiera se le parta el aura y el conteo en dos identidades tras un
// reinicio.
const LID_MAP_FILE = path.join(__dirname, '../../data/lidMap.json');

try {
  const obj = JSON.parse(fs.readFileSync(LID_MAP_FILE, 'utf8'));
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (k.endsWith('@lid') && typeof v === 'string' && !v.endsWith('@lid')) lidToPhone.set(k, v);
    }
  }
} catch { /* ENOENT o JSON invalido: se empieza vacio y se re-aprende solo */ }

let lidSaveTimer = null;
function guardarLidMap() {
  const tmp = LID_MAP_FILE + '.tmp';
  try {
    fs.mkdirSync(path.dirname(LID_MAP_FILE), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(lidToPhone)));
    fs.renameSync(tmp, LID_MAP_FILE);
  } catch { /* si falla, el mapa en memoria sigue valido */ }
}
function scheduleLidSave() {
  if (lidSaveTimer) return;
  lidSaveTimer = setTimeout(() => { lidSaveTimer = null; guardarLidMap(); }, 5000);
}
function flushLidMap() {
  if (lidSaveTimer) { clearTimeout(lidSaveTimer); lidSaveTimer = null; }
  guardarLidMap();
}

function rememberMapping(lid, phone) {
  if (!lid || !phone) return;
  const k = bareJid(lid);
  // Solo se guardan pares en el sentido correcto. Si llega invertido se
  // descarta: una entrada telefono->lid ocupa hueco en la caché y además
  // matchesOwners consulta el mapa sin comprobar el sufijo, así que un par al
  // revés puede convertir a cualquiera en candidato a owner.
  if (!k.endsWith('@lid')) return;
  const v = bareJid(phone);
  if (v.endsWith('@lid')) return;
  // LRU de verdad: al reescribir una clave hay que borrarla primero para que
  // vuelva al final del orden de inserción. Sin esto el desalojo es FIFO puro y
  // acaba tirando mapeos que se están usando cada minuto mientras conserva
  // otros vistos una vez y nunca más.
  const yaEstaba = lidToPhone.get(k) === v;
  if (lidToPhone.has(k)) lidToPhone.delete(k);
  else if (lidToPhone.size >= MAX_LID_CACHE) {
    lidToPhone.delete(lidToPhone.keys().next().value);
  }
  lidToPhone.set(k, v);
  // Solo se guarda cuando el par es NUEVO. Reordenar el LRU pasa en cada
  // mensaje y programar un guardado por cada uno seria escribir el fichero
  // entero cada cinco segundos para nada.
  if (!yaEstaba) scheduleLidSave();
}

// Aprende las correspondencias de la metadata de un grupo.
//
// Baileys rellena `phoneNumber` y `lid` de forma EXCLUYENTE, según cómo esté
// direccionado el grupo (Socket/groups.js:333-341):
//   • grupo LID → id es el @lid y phoneNumber trae el teléfono; lid va vacío.
//   • grupo PN  → id es el teléfono y lid trae el @lid; phoneNumber va vacío.
// Por eso pedir los dos a la vez era una rama imposible, y los grupos
// direccionados por teléfono no aportaban ni una correspondencia.
function indexGroupMeta(groupMeta) {
  if (!groupMeta?.participants) return;
  // Una vez por objeto. Lo llamaban matchOwnerIndex y clavesDeMiembros cada
  // uno con su propio WeakSet-check; si se olvidaba uno, se recorría la lista
  // entera otra vez. Ahora el candado vive aqui y getGroupMeta puede indexar
  // en cuanto llega la metadata, sin esperar a un isOwner posterior.
  if (metasIndexadas.has(groupMeta)) return;
  metasIndexadas.add(groupMeta);
  for (const p of groupMeta.participants) {
    if (!p) continue;
    if (p.phoneNumber && p.id?.endsWith?.('@lid')) rememberMapping(p.id, p.phoneNumber);
    else if (p.lid && p.id) rememberMapping(p.lid, p.id);
  }
}

// Resolve any JID to a stable canonical key. A LID we've already mapped to a
// phone (via the lidToPhone cache populated from groupMeta / participantPn)
// collapses to its bare phone JID; everything else returns its bareJid unchanged.
// This lets stores and lookups compare consistently whether a JID arrived as a
// LID (incoming group messages) or as a phone JID (taps/mentions). When the
// mapping is unknown it falls back to bareJid — i.e. never worse than before.
function canonicalJid(jid) {
  if (!jid) return jid;
  const bare = bareJid(jid);
  if (bare.endsWith('@lid')) {
    const phone = lidToPhone.get(bare);
    if (phone) return phone;
  }
  return bare;
}

// True when two JIDs refer to the same person, bridging LID↔phone through the
// cache. Use this instead of `bareJid(a) === bareJid(b)` whenever one side may
// be a mention (phone form) and the other an incoming message (LID form).
function sameUser(a, b) {
  if (!a || !b) return false;
  if (bareJid(a) === bareJid(b)) return true;
  return canonicalJid(a) === canonicalJid(b);
}

// Metadatas ya indexadas. Es un WeakSet a propósito: la clave es el propio
// objeto, así que en cuanto la caché de metadata lo tira y se pide uno nuevo
// (cualquier alta o baja en el grupo la invalida) el nuevo se vuelve a indexar
// solo, y esto no retiene memoria de grupos que ya no se usan.
//
// Sin este control, indexGroupMeta recorría la lista ENTERA de participantes en
// cada comprobación de owner: una por mensaje, y una por miembro dentro de cada
// scan, lo que volvía cuadrático un escaneo de purga.
const metasIndexadas = new WeakSet();

// Índice por metadata: cualquiera de las formas de un participante -> el
// participante. Se construye una vez por objeto de metadata en lugar de
// recorrer la lista entera en cada búsqueda, que es lo que hacía cuadrático
// cualquier comando que comprobara algo miembro a miembro.
const indicePorMeta = new WeakMap();

function participantePorJid(groupMeta, bare) {
  if (!groupMeta?.participants) return null;
  let idx = indicePorMeta.get(groupMeta);
  if (!idx) {
    idx = new Map();
    for (const p of groupMeta.participants) {
      if (!p) continue;
      for (const f of [p.id, p.lid, p.phoneNumber]) {
        if (f) idx.set(bareJid(f), p);
      }
    }
    indicePorMeta.set(groupMeta, idx);
  }
  return idx.get(bare) || null;
}

// Devuelve el ÍNDICE del owner que coincide con `jid` (en cualquiera de sus
// formas), o -1 si ninguno. Devolver el índice y no un booleano permite a
// isOwner saber si el que coincidió es el principal sin repetir toda la
// resolución una segunda vez. Compartido por isOwner e isMainOwner.
function matchOwnerIndex(jid, groupMeta, owners) {
  if (!jid) return -1;

  // Efecto lateral: toda comprobación de owner que traiga metadata refresca el
  // mapa global de LID. Una sola vez por objeto de metadata (lo guarda
  // indexGroupMeta).
  if (groupMeta) indexGroupMeta(groupMeta);

  const bare = bareJid(jid);
  const candidates = new Set([jid, bare]);

  // Match against any participant whose id / lid / phoneNumber form equals
  // the sender's JID. Modern groups inconsistently store the canonical id
  // (sometimes the LID, sometimes the phone JID), so a single-field lookup
  // misses half the cases.
  const p = participantePorJid(groupMeta, bare);
  if (p) {
    if (p.id) candidates.add(p.id);
    if (p.lid) candidates.add(p.lid);
    if (p.phoneNumber) candidates.add(p.phoneNumber);
  }

  // Fallback: global cache populated from prior group metas. Works for DMs
  // and for groups where the current meta fetch failed.
  const cachedPhone = lidToPhone.get(bare);
  if (cachedPhone) candidates.add(cachedPhone);

  for (const c of candidates) {
    const num = String(c).replace(/@[^@]+$/, '').replace(/\D/g, '');
    if (!num) continue;
    const i = owners.findIndex(o => phoneMatch(num, o));
    if (i >= 0) return i;
  }
  return -1;
}

function matchesOwners(jid, groupMeta, owners) {
  return matchOwnerIndex(jid, groupMeta, owners) >= 0;
}

// Argentina inserts a mobile "9" right after the country code 54 (549 11...)
// that is present in some JID forms and absent in others. A plain suffix match
// misses that because the difference is in the MIDDLE, not a prefix. Normalize
// by dropping that "9" so both forms collapse to the same canonical string.
function stripArNine(d) {
  return d.startsWith('549') ? '54' + d.slice(3) : d;
}

// True when two phone-digit strings refer to the same number. Handles:
//  - exact equality,
//  - optional country-code prefix (suffix match, only for full-length numbers),
//  - the Argentina mobile "9" (via canonicalization).
// Kept strict (shorter operand must be >= 10 digits) so a short/misconfigured
// owner value can never suffix-match an arbitrary member.
function phoneMatch(a, b) {
  if (!a || !b) return false;
  const variants = [[a, b], [stripArNine(a), stripArNine(b)]];
  for (const [x, y] of variants) {
    if (x === y) return true;
    const shorter = x.length <= y.length ? x : y;
    const longer  = x.length <= y.length ? y : x;
    if (shorter.length >= 10 && longer.endsWith(shorter)) return true;
  }
  return false;
}

function isOwner(jid, fromMe, groupMeta) {
  if (fromMe) return true;
  // Mismo atajo que isMainOwner: un JID ya confirmado como owner en una
  // comprobación anterior (con metadata) vale igual aquí. Sin esto, para el
  // MISMO jid isMainOwner devolvía true e isOwner false en cuanto faltaba la
  // metadata, y toda la maquinaria de exención (que se apoya en isOwner)
  // dejaba de proteger al dueño. El set solo contiene el owner principal ya
  // verificado, así que no relaja nada.
  if (isKnownOwnerJid(jid)) return true;
  // El principal va SIEMPRE el primero, así que un índice 0 significa que el que
  // coincidió es él. Antes se resolvía todo una segunda vez solo para averiguar
  // eso, repitiendo el barrido completo de participantes.
  const i = matchOwnerIndex(jid, groupMeta, ALL_OWNER_DIGITS);
  if (i === 0) noteOwnerJid(jid);
  return i >= 0;
}

// True only for the primary owner (config.ownerNumber), not the co-owners.
// Used to exclude the owner's own messages from the activity ranking (!count)
// without also excluding co-owners.
//
// Fast path: a LID we've already confirmed as the owner (learned from a prior
// check that had metadata) matches instantly, with no resolution — this is what
// makes the exclusion reliable in the counter's hot path. Slow path: resolve
// against config numbers, and if it matches, LEARN the JID so next time is
// instant even without metadata.
function isMainOwner(jid, fromMe, groupMeta) {
  if (fromMe) return true;
  if (isKnownOwnerJid(jid)) return true;
  const ok = matchesOwners(jid, groupMeta, [OWNER_DIGITS]);
  if (ok) noteOwnerJid(jid);
  return ok;
}

// True if `jid` is the bot's own account, in any JID form. Used to stop the bot
// from kicking or demoting itself (which would remove it from the group or
// strip the admin it needs to moderate).
function isBotJid(sock, jid) {
  if (!jid || !sock?.user) return false;
  const t = bareJid(jid);
  const mine = [sock.user.id, sock.user.lid].filter(Boolean).map(bareJid);
  if (mine.includes(t)) return true;
  // Phone-form comparison only when both sides are phone JIDs — LID and phone
  // live in different namespaces, so cross-comparing their digits would risk a
  // false positive.
  if (t.endsWith('@s.whatsapp.net')) {
    const tnum = t.replace(/@.*/, '').replace(/\D/g, '');
    return mine.some(m => m.endsWith('@s.whatsapp.net') && m.replace(/@.*/, '').replace(/\D/g, '') === tnum);
  }
  return false;
}

// True if the bot itself holds admin in this group. Lets moderation features
// tell the difference between "nobody broke a rule" and "I can't act because
// I'm not admin".
const botAdminPorMeta = new WeakMap();
function isBotAdmin(sock, groupMeta) {
  if (!groupMeta?.participants || !sock?.user) return false;
  const cached = botAdminPorMeta.get(groupMeta);
  if (cached !== undefined) return cached;
  let ok = false;
  const mine = [sock.user.id, sock.user.lid].filter(Boolean);
  for (const j of mine) {
    const p = participantePorJid(groupMeta, bareJid(j));
    if (p && (p.admin === 'admin' || p.admin === 'superadmin')) { ok = true; break; }
  }
  if (!ok) {
    ok = groupMeta.participants.some(p =>
      p && (p.admin === 'admin' || p.admin === 'superadmin') &&
      [p.id, p.lid, p.phoneNumber].some(f => f && isBotJid(sock, f))
    );
  }
  botAdminPorMeta.set(groupMeta, ok);
  return ok;
}

const adminPorLista = new WeakMap();
function isAdmin(participants, jid) {
  if (!participants || !jid) return false;
  let idx = adminPorLista.get(participants);
  if (!idx) {
    idx = new Map();
    for (const x of participants) {
      if (!x) continue;
      const flag = x.admin === 'admin' || x.admin === 'superadmin';
      for (const f of [x.id, x.lid, x.phoneNumber]) {
        if (f) idx.set(bareJid(f), flag);
      }
    }
    adminPorLista.set(participants, idx);
  }
  const bare = bareJid(jid);
  if (idx.has(bare)) return idx.get(bare);
  const can = canonicalJid(jid);
  if (can !== bare && idx.has(can)) return idx.get(can);
  // Forma que no está en la metadata (teléfono vs @lid, mapeo aprendido
  // después). Se recorre una vez y, SI HAY HIT, se cachea.
  //
  // El NO no se cachea: el mapeo lid→teléfono puede aprenderse un mensaje
  // después y un negativo congelado dejaría de reconocer a un admin para
  // siempre en este objeto de metadata (10 min de TTL).
  const claves = new Set([bare, can].filter(Boolean));
  for (const x of participants) {
    if (!x) continue;
    const hit = [x.id, x.lid, x.phoneNumber].some(f => f && (
      claves.has(bareJid(f)) || claves.has(canonicalJid(f))
    ));
    if (hit) {
      const flag = x.admin === 'admin' || x.admin === 'superadmin';
      idx.set(bare, flag);
      if (can) idx.set(can, flag);
      return flag;
    }
  }
  return false;
}

// Claves de todos los que están AHORA MISMO en el grupo, en todas sus formas
// (id, lid, phoneNumber) y también en su forma canónica. Se construye una vez
// por objeto de metadata: cualquier alta o baja invalida la caché de metadata,
// así que el WeakMap se vacía solo y no hay riesgo de listar a un ex-miembro.
//
// El índice se levanta DESPUÉS de indexGroupMeta para que canonicalJid ya
// conozca las correspondencias LID↔teléfono de este grupo; si no, un conteo
// guardado bajo el teléfono no encontraría al participante guardado por @lid.
const indiceMiembros = new WeakMap();

function clavesDeMiembros(groupMeta) {
  let set = indiceMiembros.get(groupMeta);
  if (set) return set;
  indexGroupMeta(groupMeta);
  set = new Set();
  for (const p of groupMeta.participants) {
    if (!p) continue;
    for (const f of [p.id, p.lid, p.phoneNumber]) {
      if (!f) continue;
      set.add(bareJid(f));
      set.add(canonicalJid(f));
    }
  }
  indiceMiembros.set(groupMeta, set);
  return set;
}

// ¿Sigue esta persona en el grupo?
//
// Sin metadata (el fetch pudo fallar) devuelve true: preferimos un ranking con
// algún ex-miembro colado a un ranking vacío por un fallo de red.
function esMiembroActual(groupMeta, jid) {
  if (!groupMeta?.participants?.length) return true;
  if (!jid) return false;
  const set = clavesDeMiembros(groupMeta);
  if (set.has(bareJid(jid)) || set.has(canonicalJid(jid))) return true;

  // Respaldo para el owner, y solo para él.
  //
  // Hay una combinación en la que el índice no basta: WhatsApp entrega el grupo
  // en modo LID —los participantes vienen SOLO con @lid, sin phoneNumber— y el
  // aura de esa persona está guardada bajo su teléfono. Sin el mapeo LID↔teléfono
  // aprendido, para el bot son dos identidades distintas y no hay forma de
  // saber que son la misma... salvo para el owner, cuyo número está configurado:
  // isMainOwner compara ese número contra todas las formas de cada participante.
  //
  // Sin esto el owner desaparecía del ranking de aura aunque fuese el más rico
  // del grupo, y el motivo era invisible: el filtro que lo tiraba es el de
  // "sigue en el grupo", no el de ocultarlo.
  //
  // Al resto no se le puede aplicar el mismo respaldo porque no hay ningún dato
  // que relacione su @lid con su teléfono hasta que escriben una vez, que es
  // cuando el mapeo se aprende solo.
  return isMainOwner(jid, false, groupMeta);
}

// Deja en la lista solo a los que siguen en el grupo. `users` es un array de
// objetos con `.jid` (lo que devuelve getActiveUsers). Va en O(n) gracias al
// índice: cruzar cada conteo contra cada participante era cuadrático y en un
// grupo grande se notaba en cada ranking.
function soloMiembros(users, groupMeta) {
  if (!groupMeta?.participants?.length) return users;
  return users.filter(u => esMiembroActual(groupMeta, u?.jid));
}

// Canonical sender. In groups msg.key.remoteJid is the GROUP JID;
// the actual sender lives in msg.key.participant. Falls back to remoteJid for DMs.
function getSender(msg) {
  const p = msg?.key?.participant || msg?.key?.remoteJid;
  const alt = msg?.key?.participantAlt || msg?.key?.participantPn;
  if (alt && msg.key.participant) {
    const altEsLid = msg.key.addressingMode
      ? msg.key.addressingMode !== 'lid'
      : String(alt).endsWith('@lid');
    if (altEsLid) rememberMapping(alt, msg.key.participant);
    else rememberMapping(msg.key.participant, alt);
  }
  return p;
}

// Combined owner-or-admin gate. Owner is checked first because it's the cheap
// path and short-circuits the participants scan.
function isGroupAdmin(sender, fromMe, groupMeta) {
  return isOwner(sender, fromMe, groupMeta) || isAdmin(groupMeta?.participants, sender);
}

// Mention/reply target. Returns null when neither is present.
function getTarget(msg) {
  if (!msg?.message) return null;
  const nodos = [msg.message];
  for (const v of Object.values(msg.message)) {
    if (v && typeof v === 'object') nodos.push(v);
  }
  for (const nodo of nodos) {
    const ctx = nodo?.contextInfo;
    if (!ctx) continue;
    const t = ctx.mentionedJid?.[0] || ctx.participant;
    if (t) return t;
  }
  return null;
}

// Same as getTarget but defaults to the sender — used by !sexy/!gay/etc.
function getTargetOrSelf(msg) {
  return getTarget(msg) || getSender(msg);
}

function extractText(msg) {
  const m = msg.message;
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    m?.documentMessage?.caption ||
    ''
  );
}

function extractQuotedText(msg) {
  const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!q) return null;
  return (
    q.conversation ||
    q.extendedTextMessage?.text ||
    q.imageMessage?.caption ||
    q.videoMessage?.caption ||
    q.documentMessage?.caption ||
    null
  );
}

// El "info" (bio) de una cuenta y cuándo lo escribió.
//
// OJO con la forma del dato, que ya costó 25 frases muertas en !roast: Baileys
// resuelve fetchStatus por USync y devuelve `result.list`, es decir un ARRAY de
// { id, status: { status, setAt } } — NO un objeto con .status de texto
// (Socket/chats.js:170-179 y WAUSync/Protocols/USyncStatusProtocol.js). Leer
// `res.status` directamente da undefined SIEMPRE, sin fallar ni avisar.
//
// Devuelve { status, setAt } con status string o null, y setAt en ms (0 si no
// se sabe). Nunca lanza: quien llama solo tiene que mirar el resultado.
async function fetchAbout(sock, jid) {
  try {
    const list = await sock.fetchStatus(jid);
    const entry = Array.isArray(list) ? list[0] : list;
    // Segun la version, el nodo llega envuelto en .status o plano.
    const st = entry?.status && typeof entry.status === 'object' ? entry.status : entry;
    if (!st) return null;
    const setAt = st.setAt instanceof Date ? st.setAt.getTime() : (st.setAt ? +st.setAt : 0);
    const text = typeof st.status === 'string' ? st.status : null;
    return { status: text, setAt: Number.isFinite(setAt) ? setAt : 0 };
  } catch { return null; }
}

// Cuando WhatsApp responde con un nodo <error>, Baileys lo convierte en
// Boom(texto, { data: codigo }) (WABinary/generic-utils.js:assertNodeErrorFree).
// El único código que significa "de verdad no hay foto" es el de recurso no
// encontrado. Cualquier otro fallo — timeout, límite de peticiones, conexión
// caída — NO dice nada sobre si la foto existe, y tratarlo igual es mentir con
// seguridad sobre algo que en realidad no se pudo comprobar.
const SIN_FOTO_CODIGOS = new Set([404, 421]);
const SIN_FOTO_TEXTO = /item-not-found|not-found/i;

function esFalloDeSinFoto(err) {
  if (SIN_FOTO_CODIGOS.has(err?.data)) return true;
  const texto = err?.output?.payload?.message || err?.message || '';
  return SIN_FOTO_TEXTO.test(texto);
}

// FOTO RESTRINGIDA POR PRIVACIDAD. Es un tercer caso y no estaba contemplado:
// solo habia "no tiene foto" y "hipo de red".
//
// Cuando alguien tiene la foto limitada a sus contactos, WhatsApp no responde
// 404 —la foto EXISTE— sino no-autorizado. Eso caia en el saco de los fallos
// pasajeros, asi que el bot reintentaba tres veces, se comia 2,1 s y acababa
// diciendo "fallo de red o limite de peticiones, prueba otra vez en un rato".
//
// Las dos mitades de esa frase son falsas. No es un fallo de red, y probar otra
// vez no va a funcionar nunca: la restriccion no se cae sola. Quien lo pide se
// queda reintentando contra una pared que el bot le describe como un charco.
const RESTRINGIDA_CODIGOS = new Set([401, 403]);
const RESTRINGIDA_TEXTO = /not-authorized|forbidden|unauthorized|privacy/i;

function esFotoRestringida(err) {
  if (RESTRINGIDA_CODIGOS.has(err?.data)) return true;
  const texto = err?.output?.payload?.message || err?.message || '';
  return RESTRINGIDA_TEXTO.test(texto);
}

// Foto de perfil con reintento. Diferencia "confirmado sin foto" (null, sin
// reintentar — no tiene sentido reintentar un hecho) de "fallo pasajero"
// (reintenta un par de veces con una pausa corta, y si persiste, LANZA en vez
// de devolver null, para que quien llama no confunda un hipo de red con una
// foto oculta). Sin esto, cualquier timeout o límite de peticiones de
// WhatsApp hacía que el bot dijera "no tiene foto" cuando en realidad no supo.
// SE PIDE POR LAS DOS FORMAS DE LA PERSONA, Y ESTE ERA EL FALLO GORDO.
//
// En un grupo LID la mencion llega como @lid, y a `profilePictureUrl` se le
// pasaba tal cual. WhatsApp rechaza esa consulta —no sirve la foto por un LID
// crudo— con un 403/not-authorized, que es EXACTAMENTE la misma respuesta que
// da cuando la foto es privada de verdad. El bot lo leia como privacidad y
// contestaba "tiene la foto limitada a sus contactos" a gente con la foto
// PUBLICA. Y pasaba casi siempre, porque casi todas las menciones son @lid.
//
// Se prueba primero la forma canonica (el telefono, cuando se conoce) y solo
// despues la cruda. Y una foto solo se declara restringida si LAS DOS formas
// lo dicen: con una sola no se distingue "no me la enseña" de "no sabes
// preguntar".
async function fetchPfpUrl(sock, jid, tipo = 'image', intentos = 2) {
  const canon = canonicalJid(jid);
  const formas = canon && canon !== bareJid(jid) ? [canon, jid] : [jid];
  let restringidaEnTodas = null;
  for (const forma of formas) {
    try {
      return await intentarPfp(sock, forma, tipo, intentos);
    } catch (err) {
      if (!err?.restringida) throw err;   // fallo de red: no lo tapa otra forma
      restringidaEnTodas = err;
    }
  }
  throw restringidaEnTodas;
}

async function intentarPfp(sock, jid, tipo, intentos) {
  let ultimoError = null;
  for (let i = 0; i <= intentos; i++) {
    try {
      return await sock.profilePictureUrl(jid, tipo);
    } catch (err) {
      if (esFalloDeSinFoto(err)) return null;
      // Restringida: NO se reintenta. Reintentar un permiso denegado es gastar
      // tres peticiones y dos segundos para que te lo denieguen tres veces.
      if (esFotoRestringida(err)) { err.restringida = true; throw err; }
      ultimoError = err;
      // 700 ms y no 250, y la diferencia no es de rendimiento.
      //
      // Bajarlo a 250 ahorraba poco mas de un segundo en el caso raro de que
      // los tres intentos fallen, y a cambio apretaba tres consultas de perfil
      // en 750 ms. Con la cuenta en revision de WhatsApp, tres peticiones
      // seguidas contra el mismo endpoint en menos de un segundo es justo la
      // forma de una automatizacion; repartidas en dos segundos, no.
      //
      // El reintento existe para un fallo de red pasajero, y un fallo de red
      // pasajero no se arregla en 250 ms.
      if (i < intentos) await new Promise((r) => setTimeout(r, 700 * (i + 1)));
    }
  }
  throw ultimoError;
}


// ─── Restricción de contacto de WhatsApp ("reachout timelock") ───────────────
//
// WhatsApp limita a las cuentas nuevas o marcadas para que no puedan escribir a
// desconocidos ni meterlos en grupos. Cuando está activa, *!add* falla con
// `account_reachout_restricted` — y el error NO es del número al que se intenta
// añadir: es del bot. Eso confunde muchísimo, porque el owner prueba con otro
// número y también falla.
//
// Baileys avisa por `connection.update` con la fecha en que se levanta.
//
// Ya no lo consulta ningún comando: existía para que *!add* pudiera explicar
// por qué fallaba, y *!add* se ha quitado. Lo que se conserva es el AVISO EN EL
// LOG, y se conserva a propósito: que WhatsApp marque la cuenta es justo la
// señal temprana de que algo la está poniendo en el punto de mira. Quitar el
// canario por haber quitado el comando sería quedarse sin la alarma.
let restriccionContacto = null;   // { hasta: Date } o null

function anotarRestriccionContacto(info) {
  if (!info || !info.isActive) { restriccionContacto = null; return; }
  restriccionContacto = { hasta: info.timeEnforcementEnds || null };
}

module.exports = {
  anotarRestriccionContacto,
  isOwner,
  isMainOwner,
  noteOwnerJid,
  flushOwnerJids,
  isKnownOwnerJid,
  fetchAbout,
  fetchPfpUrl,
  esFotoRestringida,
  isAdmin,
  esMiembroActual,
  soloMiembros,
  isBotJid,
  isBotAdmin,
  isGroupAdmin,
  getSender,
  getTarget,
  getTargetOrSelf,
  extractText,
  extractQuotedText,
  rememberMapping,
  indexGroupMeta,
  flushLidMap,
  bareJid,
  canonicalJid,
  sameUser,
};
