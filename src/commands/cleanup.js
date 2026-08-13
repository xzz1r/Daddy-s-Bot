'use strict';

// !antifoto — limpieza de miembros sin foto de perfil.
//
// Misma mecánica que !antiempresa y por el mismo motivo: expulsar es
// irreversible, así que NUNCA se expulsa sobre la marcha.
//
//   !antifoto scan   → dry-run. Detecta, muestra la lista con el motivo de cada
//                      uno y la guarda. No expulsa a nadie.
//   !antifoto purge  → expulsa EXACTAMENTE la lista del último scan (10 min de
//                      validez), no un re-escaneo que podría diferir.
//
// Regla de oro: si algo no se puede verificar, NO entra en la purga. Un fallo
// de red o un dato que falta jamás puede costarle la expulsión a nadie.
//
// AQUÍ NO HAY UN !antinick, y no es un olvido: el bot NO puede leer el nombre
// que cada uno tiene puesto. Ese texto lo pinta el TELÉFONO que lo lee, con su
// propia libreta y su propio historial; por el cable solo viaja el número. Se
// intentó y daba 86 "sin datos" de 134 y cero detectados en un grupo lleno de
// nicks de un punto. Un comando que no puede ver lo que juzga no debe existir.

const { isOwner, getSender } = require('../utils/wa');
const { getMemberFacts } = require('../utils/nickStore');
const { SCAN_VALID_MS, scannableMembers, executePurge, purgeReport } = require('../utils/purge');

const lastPfpScan = new Map(); // groupJid -> { ts, detected: [{ kickId, reason }] }

const CMD    = '!antifoto';
const TITULO = 'SIN FOTO';

// ─── Detector ────────────────────────────────────────────────────────────────

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
      if (res === 'none') { detected.push({ kickId, reason: 'sin foto de perfil' }); continue; }
      if (res !== 'error') continue;
      // La consulta no pudo decidirlo (foto oculta por privacidad o fallo).
      // WhatsApp avisa por evento cuando alguien pone o quita su foto, así que
      // ese dato observado resuelve justo el caso que la consulta no distingue.
      const m = chunk.find(x => x.kickId === kickId);
      const p = m?.participant;
      const facts = await getMemberFacts([kickId, p?.id, p?.lid, p?.phoneNumber]).catch(() => null);
      if (facts?.photo === 'no') detected.push({ kickId, reason: 'sin foto (WhatsApp avisó de que la quitó)' });
      else if (facts?.photo === 'si') continue; // tiene foto, solo está oculta
      else unknown.push({ kickId });
    }
  }

  return { detected, unknown };
}

// ─── scan / purge ────────────────────────────────────────────────────────────

async function runScan(sock, msg, groupJid, groupMeta) {
  const members = scannableMembers(sock, groupMeta);
  if (!members.length) {
    return sock.sendMessage(groupJid, {
      text: 'No hay miembros escaneables.',
    }, { quoted: msg });
  }

  await sock.sendMessage(groupJid, {
    text: `Escaneando *${members.length}* miembros...`,
  }, { quoted: msg });

  const { detected, unknown } = await detectNoPfp(sock, members);
  lastPfpScan.set(groupJid, { ts: Date.now(), detected });

  // Los que tienen la foto oculta por privacidad van solo como recuento: no se
  // les menciona porque no han hecho nada y exponerlos no aporta.
  const unknownNote = unknown.length
    ? `\n\n*FOTO OCULTA (${unknown.length} de ${members.length})*\n` +
      '_Tienen la foto oculta por privacidad: no se puede saber si la tienen o no._'
    : '';

  if (!detected.length) {
    return sock.sendMessage(groupJid, {
      text: 'Todos los miembros escaneados tienen foto de perfil visible.' + unknownNote,
    });
  }

  const lines = detected.map(d => `@${d.kickId.split('@')[0]} — ${d.reason}`);
  const text =
    `*${TITULO} — ${detected.length} detectado${detected.length > 1 ? 's' : ''}*\n\n` +
    lines.join('\n') +
    unknownNote +
    `\n\n_Quien tenga la foto oculta por privacidad se ve igual que quien no tiene ninguna._`;

  return sock.sendMessage(groupJid, { text, mentions: detected.map(d => d.kickId) });
}

async function runPurge(sock, msg, groupJid, groupMeta) {
  const last = lastPfpScan.get(groupJid);
  if (!last || Date.now() - last.ts > SCAN_VALID_MS) {
    return sock.sendMessage(groupJid, { text: 'No hay ningún scan reciente.' }, { quoted: msg });
  }

  const lista = last.detected;
  if (!lista.length) {
    return sock.sendMessage(groupJid, {
      text: 'El último scan no detectó a nadie. No hay nada que purgar.',
    }, { quoted: msg });
  }

  const r = await executePurge(sock, groupJid, lista, groupMeta);

  if (r.status === 'sin-metadata') {
    return sock.sendMessage(groupJid, {
      text: 'No pude obtener los miembros del grupo. La lista del scan se conserva: reintenta el purge en un momento.',
    }, { quoted: msg });
  }
  if (r.status === 'error') {
    return sock.sendMessage(groupJid, { text: `Error al expulsar: ${r.message}` }, { quoted: msg });
  }

  lastPfpScan.delete(groupJid); // consumido: obliga a re-escanear para volver a purgar

  if (r.status === 'vacio') {
    return sock.sendMessage(groupJid, {
      text: r.spared.length
        ? 'No queda nadie a quien expulsar: los detectados ya no se pueden tocar.'
        : 'Los detectados ya no están en el grupo.',
    }, { quoted: msg });
  }

  return sock.sendMessage(groupJid, purgeReport(TITULO, r));
}

// ─── Comando ─────────────────────────────────────────────────────────────────

async function cmdAntiFoto(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo funciona en grupos.' }, { quoted: msg });
  }
  if (!groupMeta?.participants?.length) {
    return sock.sendMessage(jid, { text: 'No pude obtener los miembros del grupo.' }, { quoted: msg });
  }
  const sender = getSender(msg);
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'No tienes permiso para usar esto.' }, { quoted: msg });
  }

  // Sin subcomando válido. el bot no responde. No da menús de uso: ejecuta
  // funciones o se calla.
  const arg = (args?.[0] || '').toLowerCase();
  if (arg === 'scan')  return runScan(sock, msg, jid, groupMeta);
  if (arg === 'purge') return runPurge(sock, msg, jid, groupMeta);
}

module.exports = { cmdAntiFoto };
