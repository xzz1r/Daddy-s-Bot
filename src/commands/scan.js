const { isOwner, isMainOwner, isGroupAdmin, getSender, bareJid } = require('../utils/wa');
const { isBusinessBatch } = require('../utils/businessCheck');
const logger = require('../utils/logger');

const PFP_CONCURRENCY = 8;
const PFP_TIMEOUT_MS  = 3500;

async function hasPfp(sock, jid) {
  try {
    const url = await sock.profilePictureUrl(jid, 'image');
    return !!url;
  } catch {
    return false;
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(null), ms)),
  ]);
}

async function cmdScan(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo funciona en grupos.' }, { quoted: msg });
  }

  const sender = getSender(msg);
  const canUse = isOwner(sender, msg.key.fromMe, groupMeta)
    || isGroupAdmin(sender, msg.key.fromMe, groupMeta);
  if (!canUse) {
    return sock.sendMessage(jid, { text: 'Solo admins pueden usar este comando.' }, { quoted: msg });
  }

  const participants = groupMeta?.participants || [];
  if (participants.length === 0) {
    return sock.sendMessage(jid, { text: 'No se pudo obtener la lista de miembros.' }, { quoted: msg });
  }

  // Split into phone-JIDs (scannable) and LID-only (number hidden by WA privacy).
  const phoneJids = [];
  const lidOnly   = [];

  for (const p of participants) {
    // El owner principal nunca se escanea ni se marca como sospechoso: se
    // excluye antes de clasificarlo, así no aparece en Business, "sin foto",
    // LID ni en las menciones del reporte.
    if (isMainOwner(p.id, false, groupMeta) ||
        (p.lid && isMainOwner(p.lid, false, groupMeta)) ||
        (p.phoneNumber && isMainOwner(p.phoneNumber, false, groupMeta))) {
      continue;
    }
    const id    = bareJid(p.id);
    const phone = p.phoneNumber ? bareJid(p.phoneNumber) : null;
    const resolved = (phone && phone.endsWith('@s.whatsapp.net'))
      ? phone
      : id.endsWith('@s.whatsapp.net') ? id : null;

    if (resolved) {
      phoneJids.push(resolved);
    } else {
      lidOnly.push(id);
    }
  }

  await sock.sendMessage(jid, {
    text: `Escaneando ${participants.length} miembros…`,
  }, { quoted: msg });

  // ── Business account check ────────────────────────────────────────────────
  let bizMap = new Map();
  try {
    bizMap = await isBusinessBatch(sock, phoneJids, 8);
  } catch (err) {
    logger.warn(`scan: business check failed: ${err.message}`);
  }

  // ── Profile picture check (with per-call timeout) ─────────────────────────
  const pfpMap = new Map();
  for (let i = 0; i < phoneJids.length; i += PFP_CONCURRENCY) {
    const chunk = phoneJids.slice(i, i + PFP_CONCURRENCY);
    const results = await Promise.all(
      chunk.map(j =>
        withTimeout(hasPfp(sock, j), PFP_TIMEOUT_MS).then(v => [j, v])
      )
    );
    for (const [j, v] of results) pfpMap.set(j, v);
  }

  // ── Build flagged list ────────────────────────────────────────────────────
  const flagged = [];
  for (const j of phoneJids) {
    const reasons = [];
    if (bizMap.get(j))        reasons.push('cuenta Business');
    if (pfpMap.get(j) === false) reasons.push('sin foto');
    if (reasons.length) flagged.push({ jid: j, reasons });
  }

  const bizCount  = phoneJids.filter(j => bizMap.get(j)).length;
  const noPfp     = phoneJids.filter(j => pfpMap.get(j) === false).length;
  const timedOut  = phoneJids.filter(j => pfpMap.get(j) === null).length;

  // ── Compose report ────────────────────────────────────────────────────────
  let text = `*ESCANEO DE GRUPO*\n\n`;

  text += `Total miembros: *${participants.length}*\n`;
  text += `Número visible: *${phoneJids.length}*\n`;
  if (lidOnly.length > 0)
    text += `Número oculto (LID): *${lidOnly.length}*\n`;
  text += `\n`;

  // Business accounts — individually listed with mention
  if (bizCount > 0) {
    const bizLines = phoneJids
      .filter(j => bizMap.get(j))
      .map(j => `• @${j.split('@')[0]}`);
    text += `*Cuentas Business (${bizCount}):*\n${bizLines.join('\n')}\n\n`;
  }

  // "Sin foto" as a stat, not individual listing — too many false positives from privacy settings
  text += `Sin foto visible: *${noPfp}* de ${phoneJids.length}`;
  if (noPfp > 0) text += ` _(puede ser privacidad)_`;
  if (timedOut > 0) text += `\nSin respuesta (timeout): *${timedOut}*`;
  text += '\n';

  // LID detail
  if (lidOnly.length > 0) {
    text += `\n*Número oculto* — ${lidOnly.length} miembro${lidOnly.length > 1 ? 's' : ''} con privacidad de número activa. No es posible escanearlo${lidOnly.length > 1 ? 's' : ''} (LID-only).\n`;
  }

  // Verdict
  if (bizCount === 0 && lidOnly.length === 0) {
    text += `\nSin señales destacadas.`;
  } else if (bizCount > 0 || lidOnly.length > 0) {
    text += `\n_Revisión manual recomendada para los marcados._`;
  }

  const mentions = phoneJids.filter(j => bizMap.get(j));
  await sock.sendMessage(jid, { text, mentions }, { quoted: msg });
}

module.exports = { cmdScan };
