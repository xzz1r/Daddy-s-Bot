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

// Lo unico parecido a un nombre que groupMetadata entrega de verdad.
//
// Comprobado en el codigo de Baileys (lib/Socket/groups.js): por participante
// solo construye { id, phoneNumber, lid, username, admin }. NO existen name,
// notify, displayName ni verifiedName, asi que buscarlos era codigo muerto y
// mandaba a TODO el grupo al camino del store. `username` (el @usuario de
// WhatsApp) si viene cuando la persona lo tiene puesto, y es identidad
// suficiente: quien tiene usuario no es un anonimo.
function nameFromMeta(p) {
  // username primero: es el que Baileys entrega de verdad hoy. Los demas se
  // siguen mirando por si una version o un camino distinto si los rellena;
  // comprobarlos no cuesta nada y evita depender de un solo campo.
  for (const v of [p?.username, p?.name, p?.displayName, p?.verifiedName, p?.notify]) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

// ─── Detectores ──────────────────────────────────────────────────────────────

// Sin nick. Fuentes de nombre, por orden: el username/nombre que dé la metadata
// del grupo y, si no hay, el pushName guardado de sus mensajes.
//
// Criterio unico: si el bot NO puede ver un nick, cuenta como sin nombre. Aqui
// no queda nadie "sin verificar" — o se le ve un nick legible, o se marca.
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

    // Hay un nombre guardado → se juzga ese nombre.
    if (rec?.name) {
      const a = analyzeNick(rec.name);
      if (a.missing) detected.push({ kickId: m.kickId, reason: a.reason });
      continue;
    }

    // Ha escrito varias veces y WhatsApp nunca adjuntó nombre → no tiene nick.
    if ((rec?.misses || 0) >= MIN_MISSES) {
      detected.push({ kickId: m.kickId, reason: 'sin nombre puesto' });
      continue;
    }

    // Sin dato ninguno. NO se marca, y esto no es una limitación tonta: el
    // nombre que WhatsApp pinta en el grupo lo pone el TELÉFONO de cada uno con
    // su propio historial, no el bot. El bot solo conoce a quien ha visto
    // escribir. Marcarlos a todos daba 90 falsos positivos sobre 137 miembros
    // que sí tienen nombre puesto. Se listan aparte y nunca entran en la purga.
    unknown.push({ kickId: m.kickId });
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

  // Un intento. Devuelve 'has' | 'none' | 'privacidad' | 'reintentable'.
  const attempt = async (target) => {
    try {
      const url = await sock.profilePictureUrl(target, 'image');
      // Baileys devuelve child?.attrs?.url. Con una respuesta correcta que no
      // trae nodo <picture>, eso es undefined: es la forma normal en que
      // WhatsApp dice "esta cuenta no tiene foto". Tratarlo como dato
      // desconocido dejaba sin verificar a media lista.
      return (typeof url === 'string' && url) ? 'has' : 'none';
    } catch (err) {
      // Baileys lanza los errores IQ como new Boom(text, { data: code })
      // (WABinary/generic-utils.js:assertNodeErrorFree). El código real va en
      // err.data; err.output.statusCode es SIEMPRE 500 porque Boom lo pone por
      // defecto al no recibir statusCode.
      const code = Number(err?.data ?? err?.output?.statusCode ?? err?.status);
      const txt  = String(err?.message || '').toLowerCase();
      if (code === 404 || txt.includes('item-not-found')) return 'none';
      // Solo la privacidad es genuinamente indistinguible: ahi no se puede saber.
      if (code === 401 || code === 403) return 'privacidad';
      return 'reintentable';
    }
  };

  // Un fallo de red no puede dejar a alguien sin verificar para siempre: se
  // reintenta antes de rendirse.
  const probe = async (m) => {
    const target = m.phoneJid || m.kickId;
    for (let intento = 0; intento < 3; intento++) {
      const r = await Promise.race([
        attempt(target),
        new Promise(res => setTimeout(() => res('reintentable'), TIMEOUT_MS)),
      ]);
      if (r !== 'reintentable') return r === 'privacidad' ? 'error' : r;
      if (intento < 2) await new Promise(res => setTimeout(res, 400 * (intento + 1)));
    }
    return 'error';
  };

  for (let i = 0; i < members.length; i += CONC) {
    const chunk = members.slice(i, i + CONC);
    const results = await Promise.all(chunk.map(async (m) => ({
      kickId: m.kickId, res: await probe(m),
    })));
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

  const total = detected.length + unknown.length;
  const unknownNote = unknown.length
    ? `\n\n_${unknown.length} de ${members.length} sin datos: el bot aun no conoce su nombre. NO entran en la purga._`
    : '';

  if (!detected.length) {
    return sock.sendMessage(groupJid, { text: cfg.emptyText + unknownNote });
  }

  const lines = detected.map(d => `@${d.kickId.split('@')[0]} — ${d.reason}`);
  const text =
    `*${cfg.title} — ${detected.length} detectado${detected.length > 1 ? 's' : ''}*\n\n` +
    lines.join('\n') +
    // El aviso va pegado a la lista, que es donde miran los mencionados. Las
    // lineas de abajo son instrucciones para el owner y se leen menos.
    (cfg.warning ? `\n\n${cfg.warning}` : '') +
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
  warning: '*AVISO A LOS MENCIONADOS:* poneos un nombre de verdad ya. ' +
    'Un punto, unos dos puntos, solo emojis o solo numeros no valen: tiene que llevar letras. ' +
    'El que siga sin nombre en la proxima purga se va del grupo.',
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
