'use strict';

// !antinick y !antifoto — limpieza de miembros sin nombre real y sin foto.
//
// Misma mecánica que !antiempresa y por el mismo motivo: expulsar es
// irreversible, así que NUNCA se expulsa sobre la marcha.
//
//   <cmd> scan   → dry-run. Detecta, muestra la lista con el motivo de cada
//                  uno y la guarda. No expulsa a nadie.
//   <cmd> purge  → expulsa EXACTAMENTE la lista del último scan (10 min de
//                  validez), no un re-escaneo que podría diferir.
//
// Regla de oro: si algo no se puede verificar, NO entra en la purga. Un fallo
// de red o un dato que falta jamás puede costarle la expulsión a nadie.

const { isOwner, getSender } = require('../utils/wa');
const { getNickAnyForm, MIN_MISSES } = require('../utils/nickStore');
const { SCAN_VALID_MS, scannableMembers, executePurge, purgeReport } = require('../utils/purge');

const lastNickScan = new Map(); // groupJid -> { ts, detected: [{ kickId, reason }] }
const lastPfpScan  = new Map();

// ─── Análisis del nombre ─────────────────────────────────────────────────────

// Un nick cuenta como REAL solo si contiene al menos una letra (de cualquier
// alfabeto: latino, cirílico, árabe, han, etc.). Todo lo demás es "sin nombre":
//
//   ""            → vacío
//   "."  ".."  ":" → puntos
//   "🔥" "😎💀"   → emojis
//   "34600112233"  → el número que WhatsApp muestra cuando no hay nick puesto
//   "···" "---"    → símbolos sueltos
//
// Se devuelve además el motivo concreto para que el scan sea revisable de un
// vistazo y el owner pueda detectar un falso positivo antes de purgar.
// Letras "decoradas" que Unicode clasifica como símbolo (\p{So}) y no como
// letra, pero que cualquiera lee como texto: Ⓐ ⓐ 🅰 🄰 ... Si no se contemplan,
// un nick perfectamente legible se marcaría como "sin nombre" y acabaría en
// una expulsión. NFKC descompone unos cuantos, pero no todos, así que se
// comprueban ambas cosas.
const ENCLOSED_LETTERS = /[Ⓐ-ⓩ\u{1F110}-\u{1F149}\u{1F150}-\u{1F169}\u{1F170}-\u{1F189}]/u;

function hasReadableLetter(name) {
  if (/\p{L}/u.test(name)) return true;
  if (ENCLOSED_LETTERS.test(name)) return true;
  // NFKC convierte fullwidth (Ａ), letras circulares y matemáticas (𝐀) en
  // letras normales; si tras normalizar aparece una letra, el nick es legible.
  try {
    if (/\p{L}/u.test(name.normalize('NFKC'))) return true;
  } catch { /* normalize no debería fallar, pero no se cuelga por esto */ }
  return false;
}

function analyzeNick(raw) {
  if (typeof raw !== 'string') return { missing: true, reason: 'sin nombre' };
  const name = raw.trim();
  if (!name) return { missing: true, reason: 'sin nombre' };

  // Al menos una letra legible → es un nick de verdad, no se toca.
  if (hasReadableLetter(name)) return { missing: false, reason: null };

  const hasEmoji = /\p{Extended_Pictographic}/u.test(name);
  const hasDigit = /\p{Nd}/u.test(name);
  // Puntos, comas, dos puntos, medios puntos, bullets y guiones.
  const onlyDots = /^[.·:•,;_\-\s]+$/u.test(name);

  if (onlyDots) {
    const shown = name.length <= 4 ? ` "${name}"` : '';
    return { missing: true, reason: `nombre solo puntos${shown}` };
  }
  if (hasEmoji && !hasDigit) return { missing: true, reason: 'nombre solo emojis' };
  if (hasDigit && !hasEmoji) return { missing: true, reason: 'nombre solo numeros' };
  return { missing: true, reason: 'nombre sin letras' };
}

// Nombre que trae la metadata del grupo, si trae alguno. En grupos LID lo
// habitual es que no venga ninguno, de ahí que exista nickStore.
function nameFromMeta(p) {
  for (const v of [p?.name, p?.displayName, p?.verifiedName, p?.notify]) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

// ─── Detectores ──────────────────────────────────────────────────────────────

// Sin nick. Fuentes de nombre, por orden: metadata del grupo y, si no hay,
// el pushName guardado de sus mensajes. Sin ninguna de las dos no se puede
// afirmar nada, así que va a "sin datos" y queda fuera de la purga.
// Un registro viejo no puede decidir una expulsión: la persona pudo ponerse
// nombre hace semanas y el bot no haberla visto escribir desde entonces.
const MAX_NICK_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

async function detectNoNick(groupJid, members) {
  const detected = [];
  const unknown  = [];

  for (const m of members) {
    // 1) Si la metadata del grupo trae un nombre, manda: es el dato más fresco.
    const metaName = nameFromMeta(m.participant);
    if (metaName !== null) {
      const a = analyzeNick(metaName);
      if (a.missing) detected.push({ kickId: m.kickId, reason: a.reason });
      continue;
    }

    // 2) Si no, el pushName guardado, consultando TODAS las formas del usuario
    //    (id, lid, teléfono) para no fallar por una clave partida.
    const p = m.participant;
    const rec = await getNickAnyForm(groupJid, [m.kickId, p?.id, p?.lid, p?.phoneNumber])
      .catch(() => null);

    if (!rec) { unknown.push({ kickId: m.kickId }); continue; }

    // Tiene un nombre real guardado → se juzga ese nombre.
    if (rec.name) {
      if (Date.now() - (rec.ts || 0) > MAX_NICK_AGE_MS) { unknown.push({ kickId: m.kickId }); continue; }
      const a = analyzeNick(rec.name);
      if (a.missing) detected.push({ kickId: m.kickId, reason: a.reason });
      continue;
    }

    // Sin nombre guardado: solo se confirma tras varias observaciones sin
    // nombre y si son recientes. Una sola ausencia puede ser un mensaje al que
    // WhatsApp no adjuntó el campo, y expulsar por eso sería injusto.
    if ((rec.misses || 0) >= MIN_MISSES && Date.now() - (rec.ts || 0) <= MAX_NICK_AGE_MS) {
      detected.push({ kickId: m.kickId, reason: 'sin nombre puesto' });
    } else {
      unknown.push({ kickId: m.kickId });
    }
  }

  return { detected, unknown };
}

// Sin foto. Solo se marca el "no tiene foto" CONFIRMADO (404 / item-not-found).
// Un timeout o un error de red va a "sin datos": nunca se expulsa por eso.
async function detectNoPfp(sock, members) {
  const detected = [];
  const unknown  = [];
  const CONC = 6;
  const TIMEOUT_MS = 5000;

  const probe = async (m) => {
    const target = m.phoneJid || m.kickId;
    try {
      const url = await sock.profilePictureUrl(target, 'image');
      // Solo una URL de verdad prueba que TIENE foto. Un undefined no prueba lo
      // contrario: Baileys devuelve child?.attrs?.url, que es undefined tanto si
      // no hay foto como si la respuesta no trajo el nodo. Sin certeza, a
      // "sin datos" — nunca a expulsable.
      return (typeof url === 'string' && url) ? 'has' : 'error';
    } catch (err) {
      // Baileys lanza los errores IQ como new Boom(text, { data: code })
      // (WABinary/generic-utils.js:assertNodeErrorFree). El código real va en
      // err.data; err.output.statusCode es SIEMPRE 500 porque Boom lo pone por
      // defecto al no recibir statusCode. Leer statusCode primero hacía que un
      // 404 auténtico se viera como 500 y no se detectara nunca.
      const code = Number(err?.data ?? err?.output?.statusCode ?? err?.status);
      const txt  = String(err?.message || '').toLowerCase();
      // 404 / item-not-found = confirmado que no tiene foto.
      if (code === 404 || txt.includes('item-not-found')) return 'none';
      // 401/403 = privacidad. NO es "sin foto": no se puede saber.
      return 'error';
    }
  };

  for (let i = 0; i < members.length; i += CONC) {
    const chunk = members.slice(i, i + CONC);
    const results = await Promise.all(chunk.map(async (m) => {
      const res = await Promise.race([
        probe(m),
        new Promise(r => setTimeout(() => r('error'), TIMEOUT_MS)),
      ]);
      return { kickId: m.kickId, res };
    }));
    for (const { kickId, res } of results) {
      if (res === 'none') detected.push({ kickId, reason: 'sin foto de perfil' });
      else if (res === 'error') unknown.push({ kickId });
    }
  }

  return { detected, unknown };
}

// ─── scan / purge ────────────────────────────────────────────────────────────

async function runScan(sock, msg, groupJid, groupMeta, cfg) {
  const members = scannableMembers(sock, groupMeta);
  if (!members.length) {
    return sock.sendMessage(groupJid, {
      text: 'No hay miembros escaneables (admins, owner y el bot quedan siempre fuera).',
    }, { quoted: msg });
  }

  await sock.sendMessage(groupJid, {
    text: `Escaneando *${members.length}* miembros...`,
  }, { quoted: msg });

  const { detected, unknown } = await cfg.detect(members);
  cfg.store.set(groupJid, { ts: Date.now(), detected });

  const unknownNote = unknown.length
    ? `\n\n_${unknown.length} sin datos suficientes para verificar. NO entran en la purga._`
    : '';

  if (!detected.length) {
    return sock.sendMessage(groupJid, { text: cfg.emptyText + unknownNote });
  }

  const lines = detected.map(d => `@${d.kickId.split('@')[0]} — ${d.reason}`);
  const text =
    `*${cfg.title} — ${detected.length} detectado${detected.length > 1 ? 's' : ''}*\n\n` +
    lines.join('\n') +
    `\n\n_Esto NO expulsa a nadie._` +
    `\n_Si la lista es correcta: *${cfg.cmd} purge* (dentro de 10 min)._` +
    (cfg.caveat ? `\n_${cfg.caveat}_` : '') +
    unknownNote;

  return sock.sendMessage(groupJid, { text, mentions: detected.map(d => d.kickId) });
}

async function runPurge(sock, msg, groupJid, groupMeta, cfg) {
  const last = cfg.store.get(groupJid);
  if (!last || Date.now() - last.ts > SCAN_VALID_MS) {
    return sock.sendMessage(groupJid, {
      text: `Primero corre *${cfg.cmd} scan*, revisa la lista y luego *${cfg.cmd} purge* dentro de 10 min.`,
    }, { quoted: msg });
  }
  if (!last.detected.length) {
    return sock.sendMessage(groupJid, {
      text: 'El último scan no detectó a nadie. No hay nada que purgar.',
    }, { quoted: msg });
  }

  const r = await executePurge(sock, groupJid, last.detected, groupMeta);

  if (r.status === 'sin-metadata') {
    return sock.sendMessage(groupJid, {
      text: 'No pude obtener los miembros del grupo. La lista del scan se conserva: reintenta el purge en un momento.',
    }, { quoted: msg });
  }
  if (r.status === 'error') {
    return sock.sendMessage(groupJid, { text: `Error al expulsar: ${r.message}` }, { quoted: msg });
  }

  cfg.store.delete(groupJid); // consumido: obliga a re-escanear para volver a purgar

  if (r.status === 'vacio') {
    return sock.sendMessage(groupJid, {
      text: r.spared.length
        ? `No queda nadie a quien expulsar: los detectados son ahora admin, owner o el bot. Corre *${cfg.cmd} scan* de nuevo.`
        : `Los detectados ya no están en el grupo. Corre *${cfg.cmd} scan* de nuevo.`,
    }, { quoted: msg });
  }

  return sock.sendMessage(groupJid, purgeReport(cfg.title, r));
}

// ─── Comandos ────────────────────────────────────────────────────────────────

function makeCommand(cfgFor) {
  return async function (sock, msg, args, groupMeta) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: 'Solo funciona en grupos.' }, { quoted: msg });
    }
    if (!groupMeta?.participants?.length) {
      return sock.sendMessage(jid, { text: 'No pude obtener los miembros del grupo.' }, { quoted: msg });
    }
    const sender = getSender(msg);
    if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
      return sock.sendMessage(jid, { text: 'Solo el owner puede usar este comando.' }, { quoted: msg });
    }

    const cfg = cfgFor(sock, jid, groupMeta);
    const arg = (args?.[0] || '').toLowerCase();

    if (arg === 'scan')  return runScan(sock, msg, jid, groupMeta, cfg);
    if (arg === 'purge') return runPurge(sock, msg, jid, groupMeta, cfg);

    return sock.sendMessage(jid, {
      text:
        `*${cfg.cmd} scan* — ${cfg.scanHelp} (NO expulsa)\n` +
        `*${cfg.cmd} purge* — expulsa a los detectados en el scan`,
    }, { quoted: msg });
  };
}

const cmdAntiNick = makeCommand((sock, jid, groupMeta) => ({
  cmd: '!antinick',
  title: 'SIN NICK',
  scanHelp: 'lista a quien no tiene un nombre real',
  emptyText: 'Todos los miembros escaneados tienen un nombre real puesto.',
  caveat: 'Cuenta como nombre real cualquiera con letras. Un punto, unos dos puntos, solo emojis o solo numeros no cuentan.',
  store: lastNickScan,
  detect: (members) => detectNoNick(jid, members),
}));

const cmdAntiFoto = makeCommand((sock, jid, groupMeta) => ({
  cmd: '!antifoto',
  title: 'SIN FOTO',
  scanHelp: 'lista a quien no tiene foto de perfil',
  emptyText: 'Todos los miembros escaneados tienen foto de perfil visible.',
  caveat: 'OJO: quien tenga la foto oculta por privacidad se ve igual que quien no tiene ninguna. Revisa la lista antes de purgar.',
  store: lastPfpScan,
  detect: (members) => detectNoPfp(sock, members),
}));

module.exports = { cmdAntiNick, cmdAntiFoto, analyzeNick };
