const { isOwner, isMainOwner, isGroupAdmin, getSender, bareJid, fetchPfpUrl, esFotoRestringida } = require('../utils/wa');
const { businessEvidence } = require('../utils/businessCheck');
const { getMemberFacts } = require('../utils/nickStore');
const { withTimeout } = require('../utils/helpers');

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
    const url = await fetchPfpUrl(sock, jid, 'image', 1);
    return (typeof url === 'string' && url) ? 'si' : 'no';
  } catch (err) {
    if (err?.restringida || esFotoRestringida(err)) return 'privacidad';
    return 'error';
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

  // *!scan* Y *!antiempresa scan* TIENEN QUE VER LO MISMO.
  //
  // Aqui solo se consultaba el perfil, y solo de los que tienen telefono. El
  // otro acepta ademas el hecho YA OBSERVADO —que WhatsApp le adjuntara un
  // nombre verificado de negocio a un mensaje suyo— y mira tambien a los que
  // llegan solo como @lid.
  //
  // Resultado: mismo grupo, mismo minuto, dos listas distintas. Y como el purge
  // expulsa la lista del otro, el admin que corria *!scan* veia un numero y la
  // purga hacia otra cosa. Ya paso con *!antifoto* y quedo documentado; aqui
  // seguia abierto.
  //
  // La prueba observada va primero porque es gratis: esta en disco y no gasta
  // una consulta de red.
  const pasadaBiz = async () => {
    const porFacts = async (id, phone) => {
      const f = await getMemberFacts([id, phone].filter(Boolean)).catch(() => null);
      return f?.biz ? ['nombre verificado de negocio'] : null;
    };
    for (let i = 0; i < phoneJids.length; i += BIZ_CONC) {
      const chunk = phoneJids.slice(i, i + BIZ_CONC);
      const results = await Promise.all(chunk.map(async j => {
        const observado = await porFacts(phoneToId.get(j), j);
        if (observado) return [j, { estado: 'biz', fields: observado }];
        const ev = await businessEvidence(sock, j).catch(() => ({ estado: 'desconocido', fields: [] }));
        return [j, ev];
      }));
      for (const [j, ev] of results) if (ev.estado === 'biz') bizMap.set(j, ev.fields);
    }
    // Los que solo tienen @lid: la consulta de perfil no los acepta, pero el
    // hecho observado si. Sin esto quedaban fuera del recuento sin decirlo.
    const resLid = await Promise.all(lidOnly.map(async id => [id, await porFacts(id, null)]));
    for (const [id, campos] of resLid) if (campos) bizMap.set(id, campos);
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
