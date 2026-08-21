// !p <número> — saca ese número de TODOS los grupos donde está el bot.
// !purge <lista> — igual, pero con varios números a la vez.
//
// ES EL COMANDO MÁS DESTRUCTIVO DEL BOT y por eso lleva las guardas que lleva.
// Todo lo demás actúa sobre el grupo donde se escribe; esto barre la cuenta de
// todos los grupos a la vez y la mete en la lista negra, así que un número mal
// tecleado echa a alguien de cinco sitios sin forma cómoda de deshacerlo. De
// ahí que:
//
//   · solo lo pueda usar el owner principal, no el tier owner entero;
//   · nunca toque al owner ni al propio bot;
//   · el número se resuelva con onWhatsApp ANTES de tocar nada, para no barrer
//     por un dígito de más;
//   · los grupos se recorran de uno en uno y con pausa. Expulsar de golpe en
//     seis grupos es la clase de ráfaga que WhatsApp corta con rate-overlimit,
//     y a mitad de purga eso deja el trabajo hecho a medias.
//
// !p y !purge comparten el barrido. !p deja el aviso de número virtual; !purge
// deja uno hiriente sobre el valor de esa gente en el grupo. En los dos el
// aviso se manda ANTES del ban: la idea es que lo vean y sepan que no son
// bienvenidos. Si el kick falla, el grupo vio el aviso igual — mejor eso que
// echar a alguien en silencio.
const { getSender, isMainOwner, isBotJid, isBotAdmin, bareJid, canonicalJid, getTarget, extractText, extractQuotedText } = require('../utils/wa');
const { banAccount } = require('../utils/banlist');
const { extractNumber } = require('./pfp');
const logger = require('../utils/logger');
const { aplicarParticipantes } = require('../utils/participantes');

// Pausa entre grupos. No es paranoia: groupParticipantsUpdate en ráfaga es
// justo lo que dispara el rate-overlimit que ya sale en el log del bot.
const PAUSA_MS = 1200;
// Pausa corta entre el aviso y el kick, para que el mensaje llegue antes de
// que WhatsApp saque a la persona del grupo.
const AVISO_ANTES_MS = 500;
const MAX_PURGE = 30;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// Aviso de !p: motivo fijo de número virtual.
function avisoDeVeto(numeros) {
  const nums = Array.isArray(numeros) ? numeros : [numeros];
  const menciones = nums.map((n) => `@${n}`).join(' ');
  const cuerpo = nums.length === 1
    ? `${menciones} fuera del grupo.\n\n` +
      '_Se comprobó que es un *número virtual* (VoIP), no una línea real. ' +
      'Queda en la lista negra: si vuelve a entrar, se le echa solo._'
    : `${menciones} fuera del grupo.\n\n` +
      '_Se comprobó que son *números virtuales* (VoIP), no líneas reales. ' +
      'Quedan en la lista negra: si vuelven a entrar, se les echa solo._';
  return {
    text: `*CUENTA PURGADA*\n╾━━━━━━━━━━━━━━╼\n\n${cuerpo}`,
    mentions: nums.map((n) => `${n}@s.whatsapp.net`),
  };
}

// Aviso de !purge: hiriente, al hueso, sobre el valor en el grupo.
// Español neutral (forma en ustedes, sin conjugaciones de España).
function avisoDePurge(numeros) {
  const nums = Array.isArray(numeros) ? numeros : [numeros];
  const menciones = nums.map((n) => `@${n}`).join(' ');
  const texto = nums.length === 1
    ? `${menciones} no vales una mierda en este grupo.\nNo aportas. Sobras.`
    : `${menciones} no valen una mierda en este grupo.\nNo aportan. Sobran.`;
  return {
    text: texto,
    mentions: nums.map((n) => `${n}@s.whatsapp.net`),
  };
}

// Extrae VARIOS números de un bloque de texto sin fusionarlos.
// extractNumber junta todos los dígitos en uno solo; aquí cada línea / token
// / enlace wa.me cuenta por separado.
function extractNumbers(raw) {
  if (!raw) return [];
  const s = String(raw);
  const hallados = [];
  const visto = new Set();

  const meter = (d) => {
    if (!d || d.length < 7 || d.length > 15) return;
    if (visto.has(d)) return;
    visto.add(d);
    hallados.push(d);
  };

  // Enlaces wa.me / api.whatsapp.com primero (suelen traer el número limpio).
  for (const m of s.matchAll(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\+?\d[\d\s\-]*)/gi)) {
    meter(String(m[1]).replace(/\D/g, ''));
  }

  // Línea a línea: un número por renglón es el caso natural del listado.
  for (const linea of s.split(/\r?\n/)) {
    const d = extractNumber(linea);
    if (d) meter(d);
  }

  // Tokens sueltos por espacios / comas / punto y coma.
  for (const tok of s.split(/[\s,;]+/)) {
    const d = extractNumber(tok);
    if (d) meter(d);
  }

  return hallados;
}

// Todas las formas conocidas de una misma persona dentro de un grupo. Hace
// falta porque en los grupos LID el participante llega como @lid y el número
// que se teclea es un @s.whatsapp.net: comparar solo una de las dos no
// encuentra a nadie.
function formasEnGrupo(meta, formas) {
  for (const p of (meta?.participants || [])) {
    if (!p) continue;
    const suyas = [p.id, p.lid, p.phoneNumber].filter(Boolean).map(bareJid);
    if (suyas.some((f) => formas.has(f))) return { p, suyas };
  }
  return null;
}

// Barre una o varias cuentas de todos los grupos.
// cuentas: [{ digitos, objetivo, formas: Set }]
// hacerAviso(numsEnGrupo) → payload de sendMessage o null
async function barrerGrupos(sock, grupos, cuentas, hacerAviso) {
  const fuera = [];
  const sinPermiso = [];
  const fallos = [];
  let visto = 0;

  for (const [gJid, meta] of Object.entries(grupos || {})) {
    const hits = [];
    for (const c of cuentas) {
      const hit = formasEnGrupo(meta, c.formas);
      if (hit) hits.push({ ...c, hit });
    }
    if (!hits.length) continue;
    visto += hits.length;
    const nombre = meta?.subject || gJid;

    if (!isBotAdmin(sock, meta)) {
      sinPermiso.push(nombre);
      continue;
    }

    // Aviso ANTES del ban: tienen que verlo. Un momento de margen para que el
    // mensaje entre en el grupo antes de que WhatsApp los saque.
    if (hacerAviso) {
      const nums = hits.map((h) => h.digitos);
      const payload = hacerAviso(nums);
      if (payload) {
        await sock.sendMessage(gJid, payload).catch(() => {});
        await espera(AVISO_ANTES_MS);
      }
    }

    const ids = hits.map((h) => h.hit.p.id);
    const r = await aplicarParticipantes(sock, gJid, ids, 'remove', meta);
    if (r.ok.length) {
      fuera.push(nombre);
    } else {
      const porque = r.error || r.fallidos[0]?.status || 'sin respuesta';
      fallos.push(`${nombre} (${porque})`);
      logger.warn(`purga: no pude expulsar de ${gJid}: ${porque}`);
    }
    await espera(PAUSA_MS);
  }

  return { fuera, sinPermiso, fallos, visto };
}

async function resolverCuenta(sock, digitos, groupMeta) {
  try {
    const res = await sock.onWhatsApp(`${digitos}@s.whatsapp.net`);
    const hit = Array.isArray(res) ? res.find((r) => r?.exists) : null;
    if (!hit?.jid) return { error: `+${digitos} no tiene cuenta de WhatsApp (o no es visible).` };
    const objetivo = hit.jid;
    if (isBotJid(sock, objetivo)) return { error: 'A esa cuenta no.' };
    if (isMainOwner(objetivo, false, groupMeta)) return { skip: true };
    return { digitos, objetivo };
  } catch (e) {
    return { error: `No pude comprobar +${digitos}: ${e.message}` };
  }
}

async function cmdPurgaNumero(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);

  // Silencio si no es el owner: una respuesta distinta delataría que existe.
  if (!isMainOwner(sender, msg.key.fromMe, groupMeta)) return;

  const mencionado = getTarget(msg);
  let objetivo = null;
  let digitos = null;

  if (mencionado) {
    objetivo = mencionado;
    digitos = bareJid(mencionado).split('@')[0].replace(/\D/g, '');
    if (isBotJid(sock, objetivo)) {
      return sock.sendMessage(jid, { text: 'A esa cuenta no.' }, { quoted: msg });
    }
    if (isMainOwner(objetivo, false, groupMeta)) return;
  } else {
    digitos = extractNumber((args || []).join(' '));
    if (!digitos) {
      return sock.sendMessage(jid, {
        text: 'Uso: *!p <número>* — o menciona/responde a la cuenta.\n\n' +
          '_Lo saca de todos los grupos del bot y lo deja en la lista negra como número virtual._',
      }, { quoted: msg });
    }
    const res = await resolverCuenta(sock, digitos, groupMeta);
    if (res.skip) return;
    if (res.error) {
      return sock.sendMessage(jid, { text: res.error }, { quoted: msg });
    }
    objetivo = res.objetivo;
    digitos = res.digitos;
  }

  await sock.sendMessage(jid, { text: `Purgando +${digitos} de todos los grupos…` }, { quoted: msg });

  let grupos;
  try {
    grupos = await sock.groupFetchAllParticipating();
  } catch (e) {
    return sock.sendMessage(jid, { text: `No pude listar los grupos: ${e.message}` }, { quoted: msg });
  }

  const formas = new Set([bareJid(objetivo), canonicalJid(objetivo), `${digitos}@s.whatsapp.net`].filter(Boolean));
  for (const meta of Object.values(grupos || {})) {
    const hit = formasEnGrupo(meta, formas);
    if (hit) hit.suyas.forEach((f) => formas.add(f));
  }

  const { fuera, sinPermiso, fallos, visto } = await barrerGrupos(
    sock,
    grupos,
    [{ digitos, objetivo, formas }],
    (nums) => avisoDeVeto(nums),
  );

  const anotadas = await banAccount([...formas], 'numero virtual (!p)', bareJid(sender));

  const linea = (t, l) => (l.length ? `\n\n*${t}* (${l.length})\n${l.map((x) => `· ${x}`).join('\n')}` : '');
  return sock.sendMessage(jid, {
    text:
      `*PURGA DE +${digitos}*\n╾━━━━━━━━━━━━━━╼\n\n` +
      (visto ? `Estaba en *${visto}* grupo(s).` : 'No estaba en ningún grupo del bot.') +
      linea('Fuera', fuera) +
      linea('No pude: el bot no es admin', sinPermiso) +
      linea('Falló', fallos) +
      `\n\n_En lista negra como número virtual (${anotadas} forma(s) anotadas). Si vuelve a entrar, se le echa solo._`,
  }, { quoted: msg });
}

async function cmdPurge(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);

  // Silencio si no es el owner: una respuesta distinta delataría que existe.
  if (!isMainOwner(sender, msg.key.fromMe, groupMeta)) return;

  // El dispatcher parte por espacios y se come los saltos de línea del listado.
  // Se lee el cuerpo completo del mensaje (y el citado) para no fusionar ni
  // perder números que venían en renglones distintos.
  const resto = String(extractText(msg) || '').replace(/^[!¡]\s*purge\b/i, '');
  const digitosLista = [
    ...extractNumbers((args || []).join('\n')),
    ...extractNumbers(resto),
    ...extractNumbers(extractQuotedText(msg) || ''),
  ];

  // Menciones del mensaje (si las hay).
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  for (const m of (ctx?.mentionedJid || [])) {
    const d = bareJid(m).split('@')[0].replace(/\D/g, '');
    if (d && d.length >= 7 && d.length <= 15) digitosLista.push(d);
  }

  // Únicos, tope duro.
  const unicos = [];
  const vistoNum = new Set();
  for (const d of digitosLista) {
    if (!d || vistoNum.has(d)) continue;
    vistoNum.add(d);
    unicos.push(d);
    if (unicos.length >= MAX_PURGE) break;
  }

  if (!unicos.length) {
    return sock.sendMessage(jid, {
      text:
        'Uso: *!purge* seguido de un listado de números (uno por línea, separados, enlaces wa.me o menciones).\n\n' +
        '_Los saca de todos los grupos del bot y los deja en la lista negra._',
    }, { quoted: msg });
  }

  // Listado ANTES de tocar nada: el owner ve a quién va a sacar.
  const listado = unicos.map((d, i) => `${i + 1}. +${d}`).join('\n');
  await sock.sendMessage(jid, {
    text:
      `*PURGE — listado*\n╾━━━━━━━━━━━━━━╼\n\n` +
      `Voy a purgar *${unicos.length}* número(s):\n${listado}\n\n` +
      `_Comprobando cuentas…_`,
  }, { quoted: msg });

  const cuentas = [];
  const errores = [];
  const saltados = [];

  for (const d of unicos) {
    const res = await resolverCuenta(sock, d, groupMeta);
    if (res.skip) {
      saltados.push(d);
      continue;
    }
    if (res.error) {
      errores.push(res.error);
      continue;
    }
    const formas = new Set([
      bareJid(res.objetivo),
      canonicalJid(res.objetivo),
      `${res.digitos}@s.whatsapp.net`,
    ].filter(Boolean));
    cuentas.push({ digitos: res.digitos, objetivo: res.objetivo, formas });
  }

  if (!cuentas.length) {
    const extra = [];
    if (errores.length) extra.push(errores.join('\n'));
    if (saltados.length) extra.push(`Omitidos (owner): ${saltados.map((d) => `+${d}`).join(', ')}`);
    return sock.sendMessage(jid, {
      text: `Nada que purgar.\n\n${extra.join('\n\n') || 'Ninguna cuenta válida.'}`,
    }, { quoted: msg });
  }

  let grupos;
  try {
    grupos = await sock.groupFetchAllParticipating();
  } catch (e) {
    return sock.sendMessage(jid, { text: `No pude listar los grupos: ${e.message}` }, { quoted: msg });
  }

  // Ampliar formas con lo que haya en los grupos.
  for (const meta of Object.values(grupos || {})) {
    for (const c of cuentas) {
      const hit = formasEnGrupo(meta, c.formas);
      if (hit) hit.suyas.forEach((f) => c.formas.add(f));
    }
  }

  const { fuera, sinPermiso, fallos, visto } = await barrerGrupos(
    sock,
    grupos,
    cuentas,
    (nums) => avisoDePurge(nums),
  );

  // Lista negra al final y siempre, aunque no estuvieran en ningún grupo.
  let anotadas = 0;
  for (const c of cuentas) {
    anotadas += await banAccount([...c.formas], 'purge (!purge)', bareJid(sender));
  }

  const linea = (t, l) => (l.length ? `\n\n*${t}* (${l.length})\n${l.map((x) => `· ${x}`).join('\n')}` : '');
  const numsTxt = cuentas.map((c) => `+${c.digitos}`).join(', ');
  return sock.sendMessage(jid, {
    text:
      `*PURGE*\n╾━━━━━━━━━━━━━━╼\n\n` +
      `Cuentas: ${numsTxt}\n` +
      (visto ? `Vistos en *${visto}* presencia(s) de grupo.` : 'No estaban en ningún grupo del bot.') +
      linea('Fuera', fuera) +
      linea('No pude: el bot no es admin', sinPermiso) +
      linea('Falló', fallos) +
      (errores.length ? `\n\n*No válidos*\n${errores.map((e) => `· ${e}`).join('\n')}` : '') +
      (saltados.length ? `\n\n*Omitidos (owner)*\n${saltados.map((d) => `· +${d}`).join('\n')}` : '') +
      `\n\n_En lista negra (${anotadas} forma(s) anotadas). Si vuelven a entrar, se les echa solo._`,
  }, { quoted: msg });
}

module.exports = { cmdPurgaNumero, cmdPurge, extractNumbers, avisoDePurge, avisoDeVeto };
