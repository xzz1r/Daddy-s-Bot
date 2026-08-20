'use strict';

// Maquinaria compartida de scan/purge para !antiempresa y !antifoto.
//
// Los tres siguen el mismo contrato y por tanto las mismas garantias:
//   - admins, owner tier y el propio bot NUNCA se tocan;
//   - la purga expulsa la lista verificada en el scan, no un re-escaneo;
//   - las exenciones se RECALCULAN contra la metadata fresca antes de expulsar,
//     porque entre el scan y la purga alguien pudo ser ascendido a admin;
//   - se mira el estado POR PARTICIPANTE que devuelve WhatsApp, para no anunciar
//     expulsiones que el servidor rechazo.
//
// Estaba escrito por duplicado en group.js y en cleanup.js. Una sola copia evita
// que las dos versiones se separen y una acabe sin alguna de las garantias.

const { isOwner, isBotJid, sameUser } = require('./wa');
const { aplicarParticipantes } = require('./participantes');

const SCAN_VALID_MS = 10 * 60 * 1000; // margen para revisar el scan antes de purgar

// True si ese participante no puede ser expulsado por ninguno de los comandos.
function isExemptParticipant(sock, p, groupMeta) {
  if (!p?.id) return true;
  if (p.admin === 'admin' || p.admin === 'superadmin') return true;
  if (isBotJid(sock, p.id)) return true;
  return Boolean(
    isOwner(p.id, false, groupMeta) ||
    (p.lid && isOwner(p.lid, false, groupMeta)) ||
    (p.phoneNumber && isOwner(p.phoneNumber, false, groupMeta))
  );
}

// Miembros que un scan puede examinar. `phoneJid` es null para quien solo tiene
// forma LID: el llamador decide si eso le sirve (getBusinessProfile no acepta
// LIDs, pero el nick y la foto si se pueden intentar).
function scannableMembers(sock, groupMeta) {
  const out = [];
  for (const p of (groupMeta?.participants || [])) {
    if (isExemptParticipant(sock, p, groupMeta)) continue;
    out.push({
      kickId: p.id,
      phoneJid: p.phoneNumber || (p.id.endsWith('@s.whatsapp.net') ? p.id : null),
      participant: p,
    });
  }
  return out;
}

// ¿Sigue este jid en el grupo?
function stillMember(groupMeta, jid) {
  return (groupMeta?.participants || []).some(p =>
    sameUser(p.id, jid) ||
    (p.lid && sameUser(p.lid, jid)) ||
    (p.phoneNumber && sameUser(p.phoneNumber, jid))
  );
}

// Ejecuta la expulsion de una lista ya verificada.
//
// detected: [{ kickId, reason }]
// Devuelve una de estas formas:
//   { status: 'sin-metadata' }                      -> no se toco nada, conserva la lista
//   { status: 'vacio', spared }                     -> no queda a quien expulsar
//   { status: 'error', message }                    -> WhatsApp rechazo la llamada entera
//   { status: 'ok', done, failed, spared }          -> resultado por participante
async function executePurge(sock, groupJid, detected, groupMeta) {
  if (!groupMeta?.participants?.length) return { status: 'sin-metadata' };

  const exemptForms = [];
  for (const p of groupMeta.participants) {
    if (!p?.id) continue;
    if (isExemptParticipant(sock, p, groupMeta)) {
      for (const f of [p.id, p.lid, p.phoneNumber]) if (f) exemptForms.push(f);
    }
  }
  const isExemptNow = (jid) => exemptForms.some(f => sameUser(f, jid));

  const present   = detected.filter(d => stillMember(groupMeta, d.kickId));
  const spared    = present.filter(d => isExemptNow(d.kickId));
  const stillHere = present.filter(d => !isExemptNow(d.kickId));

  if (!stillHere.length) return { status: 'vacio', spared };

  // AQUI ESTABA LO GORDO. Habia un `statusOf` propio que devolvia '200' cuando
  // no encontraba la fila de esa persona, y no encontrarla es lo normal: se
  // pide el kick por telefono y WhatsApp contesta por @lid. Con el purge
  // vetando desde hace dos commits, ese falso 200 no era un mensaje incorrecto
  // sino un veto a alguien que sigue sentado en el grupo. Medido: con la
  // respuesta vacia daba por expulsados a todos.
  const r = await aplicarParticipantes(
    sock, groupJid, stillHere.map(d => d.kickId), 'remove', groupMeta);
  if (r.error) return { status: 'error', message: r.error };

  const salio = (kickId) => r.ok.some(j => sameUser(j, kickId));
  return {
    status: 'ok',
    done:   stillHere.filter(d => salio(d.kickId)),
    failed: stillHere.filter(d => !salio(d.kickId)),
    spared,
  };
}

// Texto del resultado de una purga, comun a los tres comandos.
function purgeReport(title, r) {
  let text = r.done.length
    ? `*${title}* — expulsado${r.done.length > 1 ? 's' : ''} *${r.done.length}*:\n` +
      r.done.map(d => `@${d.kickId.split('@')[0]} — ${d.reason}`).join('\n')
    : `*${title}* — no se pudo expulsar a nadie.`;
  if (r.failed.length) {
    text += `\n\n_No se pudo expulsar a ${r.failed.length} (¿el bot no es admin?):_\n` +
      r.failed.map(d => `@${d.kickId.split('@')[0]}`).join(', ');
  }
  if (r.spared.length) {
    text += `\n\n_${r.spared.length} quedaron exentos._`;
  }
  const mentions = [...r.done, ...r.failed, ...r.spared].map(d => d.kickId);
  return { text, mentions };
}

module.exports = {
  SCAN_VALID_MS,
  isExemptParticipant,
  scannableMembers,
  stillMember,
  executePurge,
  purgeReport,
};
