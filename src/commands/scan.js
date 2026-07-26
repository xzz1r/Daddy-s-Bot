const { isOwner, isMainOwner, isGroupAdmin, getSender, bareJid } = require('../utils/wa');
const { businessEvidence } = require('../utils/businessCheck');

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
  const phoneToId = new Map(); // phoneJid -> participant.id, para mencionar por id
                               // (el mention por id sí renderiza el nombre en grupos LID)

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
      phoneToId.set(resolved, id);
    } else {
      lidOnly.push(id);
    }
  }

  await sock.sendMessage(jid, {
    text: `Escaneando ${participants.length} miembros…`,
  }, { quoted: msg });

  // ── Business account check (con EVIDENCIA: qué campo lo marca) ─────────────
  // bizMap solo contiene los detectados como Business, mapeados a los campos
  // reales que lo delatan (categoría, email, web, dirección, horario...). Así el
  // reporte muestra el PORQUÉ de cada marca y se puede ver si es un falso positivo.
  const bizMap = new Map(); // jid -> fields[]
  const BIZ_CONC = 6;
  for (let i = 0; i < phoneJids.length; i += BIZ_CONC) {
    const chunk = phoneJids.slice(i, i + BIZ_CONC);
    const results = await Promise.all(chunk.map(async j => {
      const ev = await businessEvidence(sock, j).catch(() => ({ isBiz: false, fields: [] }));
      return [j, ev];
    }));
    for (const [j, ev] of results) if (ev.isBiz) bizMap.set(j, ev.fields);
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

  const bizCount  = bizMap.size;
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
    const bizLines = [...bizMap.entries()]
      .map(([j, fields]) => `• @${(phoneToId.get(j) || j).split('@')[0]} — ${fields.join(', ')}`);
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
  } else {
    text += `\n_Revisión manual recomendada para los marcados._`;
  }

  const mentions = [...bizMap.keys()].map(j => phoneToId.get(j) || j);
  await sock.sendMessage(jid, { text, mentions }, { quoted: msg });
}

module.exports = { cmdScan };
