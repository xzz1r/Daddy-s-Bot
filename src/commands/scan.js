const { isOwner, isMainOwner, isGroupAdmin, getSender, bareJid } = require('../utils/wa');
const { businessEvidence } = require('../utils/businessCheck');

const PFP_CONCURRENCY = 8;
const PFP_TIMEOUT_MS  = 3500;

// Estado de la foto de perfil: 'si' | 'no' | 'privacidad' | 'error'.
//
// Antes esto devolvía un booleano y cualquier fallo —privacidad, timeout, red—
// se contaba como "no tiene foto". Con eso !scan y !antifoto daban cifras
// distintas sobre el MISMO grupo en el mismo minuto. Se clasifica igual que en
// !antifoto: el código real viaja en err.data, porque Baileys lanza los errores
// IQ como Boom y ahí err.output.statusCode es siempre 500.
async function pfpEstado(sock, jid) {
  try {
    const url = await sock.profilePictureUrl(jid, 'image');
    // Respuesta correcta sin nodo <picture> → no tiene foto.
    return (typeof url === 'string' && url) ? 'si' : 'no';
  } catch (err) {
    const code = Number(err?.data ?? err?.output?.statusCode ?? err?.status);
    const txt  = String(err?.message || '').toLowerCase();
    if (code === 404 || txt.includes('item-not-found')) return 'no';
    if (code === 401 || code === 403) return 'privacidad';
    return 'error';
  }
}

// Race con timeout que SÍ cancela su temporizador. Sin el clearTimeout, cada
// consulta dejaba un timer vivo hasta agotarse: en un grupo grande son cientos
// de temporizadores pendientes reteniendo su closure sin ninguna necesidad.
function withTimeout(promise, ms, alExpirar) {
  let t;
  return Promise.race([
    promise.finally(() => clearTimeout(t)),
    new Promise(resolve => { t = setTimeout(() => resolve(alExpirar), ms); }),
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
    // LID ni en las menciones del reporte. Tampoco se anuncia que falte
    // nadie en el total: ese "(sin contar al owner)" delataba el rango.
    //
    // Basta UNA comprobación: isMainOwner ya resuelve al participante en la
    // metadata y prueba todas sus formas (id, lid, teléfono) de una pasada.
    // Llamarlo tres veces por miembro solo repetía el mismo trabajo.
    if (isMainOwner(p.id, false, groupMeta)) continue;
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
  const pfpMap = new Map();
  const BIZ_CONC = 6;

  const pasadaBiz = async () => {
    for (let i = 0; i < phoneJids.length; i += BIZ_CONC) {
      const chunk = phoneJids.slice(i, i + BIZ_CONC);
      const results = await Promise.all(chunk.map(async j => {
        const ev = await businessEvidence(sock, j).catch(() => ({ isBiz: false, fields: [] }));
        return [j, ev];
      }));
      for (const [j, ev] of results) if (ev.isBiz) bizMap.set(j, ev.fields);
    }
  };

  const pasadaFoto = async () => {
    for (let i = 0; i < phoneJids.length; i += PFP_CONCURRENCY) {
      const chunk = phoneJids.slice(i, i + PFP_CONCURRENCY);
      const results = await Promise.all(
        chunk.map(j => withTimeout(pfpEstado(sock, j), PFP_TIMEOUT_MS, 'error').then(v => [j, v]))
      );
      for (const [j, v] of results) pfpMap.set(j, v);
    }
  };

  // Las dos pasadas son independientes y pegan a APIs distintas: en serie el
  // comando tardaba la suma de ambas sin ningún motivo.
  await Promise.all([pasadaBiz(), pasadaFoto()]);

  const bizCount   = bizMap.size;
  const noPfp      = phoneJids.filter(j => pfpMap.get(j) === 'no').length;
  const privacidad = phoneJids.filter(j => pfpMap.get(j) === 'privacidad').length;
  const timedOut   = phoneJids.filter(j => pfpMap.get(j) === 'error').length;

  // ── Compose report ────────────────────────────────────────────────────────
  let text = `*ESCANEO DE GRUPO*\n\n`;

  // El total es el de miembros ESCANEADOS. Antes se imprimía el total del grupo
  // mientras el owner quedaba fuera de los cubos, así que las cifras no sumaban.
  const escaneados = phoneJids.length + lidOnly.length;
  text += `Total miembros: *${escaneados}*`;
  text += `\n`;
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

  // "Sin foto" va como cifra, no como lista: expulsar por esto es cosa de
  // *!antifoto*, que además usa exactamente la misma clasificación, así que los
  // dos comandos ya no pueden contradecirse.
  text += `Sin foto: *${noPfp}* de ${phoneJids.length}\n`;
  if (privacidad > 0) text += `Foto oculta por privacidad: *${privacidad}* _(no se puede saber)_\n`;
  if (timedOut > 0) text += `Sin respuesta: *${timedOut}*\n`;

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
