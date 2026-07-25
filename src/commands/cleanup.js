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

const { isOwner, isBotJid, getSender, sameUser } = require('../utils/wa');
const { getNick } = require('../utils/nickStore');

const SCAN_VALID_MS = 10 * 60 * 1000;

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
function analyzeNick(raw) {
  if (typeof raw !== 'string') return { missing: true, reason: 'sin nombre' };
  const name = raw.trim();
  if (!name) return { missing: true, reason: 'sin nombre' };

  // Al menos una letra → es un nick de verdad, no se toca.
  if (/\p{L}/u.test(name)) return { missing: false, reason: null };

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

// ─── Miembros escaneables ────────────────────────────────────────────────────

// Excluye SIEMPRE admins, owner tier y el propio bot. Devuelve, por cada
// candidato, el id con el que se expulsa/menciona y el jid de teléfono con el
// que consultar el perfil (null si el miembro es solo LID).
function scannableMembers(sock, groupMeta) {
  const out = [];
  for (const p of (groupMeta?.participants || [])) {
    if (!p?.id) continue;
    if (p.admin === 'admin' || p.admin === 'superadmin') continue;
    if (isBotJid(sock, p.id)) continue;
    if (isOwner(p.id, false, groupMeta) ||
        (p.lid && isOwner(p.lid, false, groupMeta)) ||
        (p.phoneNumber && isOwner(p.phoneNumber, false, groupMeta))) continue;
    out.push({
      kickId: p.id,
      phoneJid: p.phoneNumber || (p.id.endsWith('@s.whatsapp.net') ? p.id : null),
      participant: p,
    });
  }
  return out;
}

// ─── Detectores ──────────────────────────────────────────────────────────────

// Sin nick. Fuentes de nombre, por orden: metadata del grupo y, si no hay,
// el pushName guardado de sus mensajes. Sin ninguna de las dos no se puede
// afirmar nada, así que va a "sin datos" y queda fuera de la purga.
async function detectNoNick(groupJid, members) {
  const detected = [];
  const unknown  = [];

  for (const m of members) {
    const metaName = nameFromMeta(m.participant);
    if (metaName !== null) {
      const a = analyzeNick(metaName);
      if (a.missing) detected.push({ kickId: m.kickId, reason: a.reason });
      continue;
    }

    const rec = await getNick(groupJid, m.kickId).catch(() => null);
    if (!rec) { unknown.push({ kickId: m.kickId }); continue; }

    const a = analyzeNick(rec.name);
    if (a.missing) detected.push({ kickId: m.kickId, reason: a.reason });
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
      return url ? 'has' : 'none';
    } catch (err) {
      const code = err?.output?.statusCode ?? err?.data ?? err?.status;
      const txt  = String(err?.message || '').toLowerCase();
      if (code === 404 || txt.includes('item-not-found') || txt.includes('not-found')) return 'none';
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
      text: `El último scan no detectó a nadie. No hay nada que purgar.`,
    }, { quoted: msg });
  }

  // Solo a quien SIGUE en el grupo: alguien pudo salir tras el scan.
  const members = groupMeta?.participants || [];
  const stillHere = last.detected.filter(d => members.some(p =>
    sameUser(p.id, d.kickId) ||
    (p.lid && sameUser(p.lid, d.kickId)) ||
    (p.phoneNumber && sameUser(p.phoneNumber, d.kickId))
  ));

  if (!stillHere.length) {
    cfg.store.delete(groupJid);
    return sock.sendMessage(groupJid, {
      text: `Los detectados ya no están en el grupo. Corre *${cfg.cmd} scan* de nuevo.`,
    }, { quoted: msg });
  }

  const toKick = stillHere.map(d => d.kickId);
  try {
    await sock.groupParticipantsUpdate(groupJid, toKick, 'remove');
    cfg.store.delete(groupJid); // consumido: obliga a re-escanear para volver a purgar
    await sock.sendMessage(groupJid, {
      text: `*${cfg.title}* — expulsado${toKick.length > 1 ? 's' : ''} *${toKick.length}*:\n` +
        stillHere.map(d => `@${d.kickId.split('@')[0]} — ${d.reason}`).join('\n'),
      mentions: toKick,
    });
  } catch (err) {
    await sock.sendMessage(groupJid, { text: `Error al expulsar: ${err.message}` });
  }
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
