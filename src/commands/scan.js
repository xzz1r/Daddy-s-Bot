const { isOwner, isGroupAdmin, getSender, bareJid } = require('../utils/wa');
const { isBusinessBatch } = require('../utils/businessCheck');
const logger = require('../utils/logger');

const PFP_CONCURRENCY = 5;

async function hasPfp(sock, jid) {
  try {
    const url = await sock.profilePictureUrl(jid, 'image');
    return !!url;
  } catch {
    return false;
  }
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

  // Only phone JIDs are scannable — LID JIDs can't be queried for business
  // profile or profile picture through the Baileys API.
  const participants = groupMeta?.participants || [];
  const phoneJids = [...new Set(
    participants
      .map(p => {
        const j = bareJid(p.id);
        if (j && j.endsWith('@s.whatsapp.net')) return j;
        if (p.phoneNumber) {
          const f = bareJid(p.phoneNumber);
          if (f && f.endsWith('@s.whatsapp.net')) return f;
        }
        return null;
      })
      .filter(Boolean)
  )];

  if (phoneJids.length === 0) {
    return sock.sendMessage(jid, { text: 'No hay miembros escaneables.' }, { quoted: msg });
  }

  await sock.sendMessage(jid, {
    text: `Escaneando ${phoneJids.length} miembros...`,
  }, { quoted: msg });

  // Business account detection (batched, concurrency 8)
  let bizMap = new Map();
  try {
    bizMap = await isBusinessBatch(sock, phoneJids, 8);
  } catch (err) {
    logger.warn(`scan: business check failed: ${err.message}`);
  }

  // Profile picture check — lower concurrency to avoid WA rate-limiting.
  // hasPfp returns false on error, which includes privacy-hidden pics.
  const pfpMap = new Map();
  for (let i = 0; i < phoneJids.length; i += PFP_CONCURRENCY) {
    const chunk = phoneJids.slice(i, i + PFP_CONCURRENCY);
    const results = await Promise.all(chunk.map(j => hasPfp(sock, j).then(v => [j, v])));
    for (const [j, has] of results) pfpMap.set(j, has);
  }

  const flagged = [];
  for (const j of phoneJids) {
    const reasons = [];
    if (bizMap.get(j)) reasons.push('cuenta Business');
    if (!pfpMap.get(j)) reasons.push('sin foto visible');
    if (reasons.length > 0) flagged.push({ jid: j, reasons });
  }

  if (flagged.length === 0) {
    return sock.sendMessage(jid, {
      text: `Escaneo completo. ${phoneJids.length} revisados. Sin señales sospechosas.`,
    }, { quoted: msg });
  }

  const mentions = flagged.map(f => f.jid);
  const lines = flagged.map(f => `• @${f.jid.split('@')[0]} — ${f.reasons.join(', ')}`);

  const text =
    `*ESCANEO DE GRUPO*\n\n` +
    `Revisados: ${phoneJids.length} · Señalados: ${flagged.length}\n\n` +
    lines.join('\n') +
    `\n\n_"Sin foto visible" puede ser privacidad, no necesariamente sospecha._`;

  await sock.sendMessage(jid, { text, mentions }, { quoted: msg });
}

module.exports = { cmdScan };
