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
// deja uno frío: no cumplen las reglas, uno más que se va. En los dos el
// aviso se manda ANTES del ban: la idea es que lo vean. Si el kick falla, el
// grupo vio el aviso igual — mejor eso que echar a alguien en silencio.
const { getSender, isMainOwner, isOwner, isBotJid, isBotAdmin, bareJid, canonicalJid, extractText, extractQuotedText } = require('../utils/wa');
// Tope a onWhatsApp: sin el, el comando mas destructivo del bot podia quedarse
// colgado sin decir si hizo algo o no.
const { withTimeout } = require('../utils/helpers');
const { banAccount } = require('../utils/banlist');
const { extractNumber } = require('./pfp');
const { findPhoneNumbersInText } = require('libphonenumber-js');
const logger = require('../utils/logger');
const { aplicarParticipantes } = require('../utils/participantes');

// Pausa entre grupos. No es paranoia: groupParticipantsUpdate en ráfaga es
// justo lo que dispara el rate-overlimit que ya sale en el log del bot.
const PAUSA_MS = 1200;
// Margen entre el aviso y el kick. sendMessage espera el ack del servidor;
// esto es para que el mensaje llegue al teléfono antes de que WhatsApp los
// saque del grupo. Si es demasiado corto, la frase no la ven.
const AVISO_ANTES_MS = 1000;
const PAUSA_ONWA_MS = 150;
// Tope por ráfaga. Un pegado internacional con formato ("+54 9 11 …") ronda
// las treinta cuentas; 30 se quedaba corto en el caso real (33) y encima los
// trozos falsos del parser llenaban el cupo antes de llegar a los de verdad.
const MAX_PURGE = 50;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function etiquetasDe(hits) {
  const items = Array.isArray(hits) ? hits : [hits];
  return items.map((h) => {
    if (h && typeof h === 'object' && (h.digitos || h.hit)) {
      const mention = h.hit?.p?.id || `${h.digitos}@s.whatsapp.net`;
      const label = h.digitos || String(mention).split('@')[0];
      return { label, mention };
    }
    const label = String(h);
    return { label, mention: `${label}@s.whatsapp.net` };
  });
}

// Aviso de !p: motivo fijo de número virtual.
function avisoDeVeto(hits) {
  const tags = etiquetasDe(hits);
  const menciones = tags.map((t) => `@${t.label}`).join(' ');
  const cuerpo = tags.length === 1
    ? `${menciones} fuera del grupo.\n\n` +
      '_Se comprobó que es un *número virtual* (VoIP), no una línea real. ' +
      'Queda en la lista negra: si vuelve a entrar, se le echa solo._'
    : `${menciones} fuera del grupo.\n\n` +
      '_Se comprobó que son *números virtuales* (VoIP), no líneas reales. ' +
      'Quedan en la lista negra: si vuelven a entrar, se les echa solo._';
  return {
    text: `*CUENTA PURGADA*\n╾━━━━━━━━━━━━━━╼\n\n${cuerpo}`,
    mentions: tags.map((t) => t.mention),
  };
}

// Aviso de !purge: frío, sin drama. No cumplen las reglas; uno más que se va.
// Español neutral (tú en singular, ustedes en plural; sin vosotros).
function avisoDePurge(hits) {
  const tags = etiquetasDe(hits);
  const menciones = tags.map((t) => `@${t.label}`).join(' ');
  const texto = tags.length === 1
    ? `${menciones} no cumples los requisitos de las reglas.\nUno más. Fuera.`
    : `${menciones} no cumplen los requisitos de las reglas.\nUnos más. Fuera.`;
  return {
    text: texto,
    mentions: tags.map((t) => t.mention),
  };
}

// Extrae VARIOS números de un bloque de texto sin fusionarlos y sin romper
// uno formateado en trozos.
//
// El caso que lo rompió: un "+504 9123-4510" (un número) se partía por
// espacios y el último trozo con 7+ dígitos ("91234510") se tomaba por otra
// cuenta.
// onWhatsApp decía que no existía, llenaba el tope con basura y los números
// de verdad del pegado se quedaban sin tocar.
//
// Orden: enlaces wa.me, luego libphonenumber (entiende +, espacios, guiones
// y paréntesis), luego el heurístico de dígitos para los pelados sin +.
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

  for (const m of s.matchAll(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\+?\d[\d\s\-]*)/gi)) {
    meter(String(m[1]).replace(/\D/g, ''));
  }

  try {
    for (const f of findPhoneNumbersInText(s)) {
      const e164 = f?.number?.number;
      if (e164) meter(String(e164).replace(/\D/g, ''));
    }
  } catch (_) { /* texto sucio: sigue el heurístico */ }

  for (const linea of s.split(/\r?\n/)) {
    const limpia = linea
      .replace(/(?:https?:\/\/)?(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)\S+/gi, ' ')
      .trim();
    if (!limpia) continue;
    for (const seg of partirSegmentos(limpia)) {
      const d = extractNumber(seg);
      if (d) {
        meter(d);
        continue;
      }
      // Más de 15 dígitos: varios números pelados en el mismo renglón
      // ("57300… 57300…"). Solo entonces se parte por espacios, y solo
      // si el token ENTERO es un número, no un fragmento de uno formateado.
      const digits = seg.replace(/\D/g, '');
      if (digits.length > 15) {
        for (const tok of seg.split(/[\s]+/)) {
          const t = extractNumber(tok);
          if (t) meter(t);
        }
      }
    }
  }

  return sinFragmentos(hallados);
}

// Una cuenta por trozo. Comas / punto y coma separan. Un "+" que arranca
// otro internacional también, para no fusionar dos formateados del mismo renglón.
function partirSegmentos(linea) {
  const out = [];
  for (const trozo of linea.split(/[,;]+/)) {
    const t = trozo.trim();
    if (!t) continue;
    out.push(...t.split(/(?=\+\d)/).map((x) => x.trim()).filter(Boolean));
  }
  return out;
}

// Un candidato que es la cola de otro del mismo listado es el resto de un
// número con formato ("9123-4510" de "+504 9123-4510"), no una cuenta aparte.
function sinFragmentos(nums) {
  return nums.filter((d) => !nums.some((otro) => otro !== d && otro.endsWith(d)));
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

function telefonoDeParticipante(p) {
  const phone = p?.phoneNumber || (p?.id && String(p.id).endsWith('@s.whatsapp.net') ? p.id : null);
  if (!phone) return null;
  const d = bareJid(phone).split('@')[0].replace(/\D/g, '');
  return (d.length >= 7 && d.length <= 15) ? d : null;
}

// ¿A esta cuenta no se la toca?
//
// Depende de QUIÉN esté purgando, y por eso se pasa el predicado en vez de
// preguntarlo aquí dentro:
//
//   · el owner principal (*!p* y su propio *!purge*) solo se protege a sí
//     mismo. Si un co-owner se va de madre, tiene que poder sacarlo;
//   · un CO-OWNER usando *!purge* no puede tocar a nadie del tier owner. Abrir
//     el comando al tier sin esto sería repartir un arma con la que purgarse
//     entre ellos, y eso no es dar acceso, es montar una guerra civil.
//
// Sin predicado se protege solo al owner principal, que es como estaba.
function esIntocable(objetivo, groupMeta, protegido) {
  if (protegido) return protegido(objetivo, groupMeta);
  return isMainOwner(objetivo, false, groupMeta);
}

// JID que ya trajo WhatsApp (mención o cita). NO se pasa por onWhatsApp:
// en un grupo LID el mentionedJid es @lid, y tratar esos dígitos como teléfono
// barre una cuenta que no es o no encuentra a nadie.
function cuentaDesdeJid(sock, jid, groupMeta, protegido = null) {
  if (!jid) return { error: 'sin jid' };
  if (isBotJid(sock, jid)) return { error: 'A esa cuenta no.' };
  if (esIntocable(jid, groupMeta, protegido)) return { skip: true };

  const formas = new Set([bareJid(jid), canonicalJid(jid)].filter(Boolean));
  let digitos = null;

  const hit = groupMeta ? formasEnGrupo(groupMeta, formas) : null;
  if (hit) {
    hit.suyas.forEach((f) => formas.add(f));
    digitos = telefonoDeParticipante(hit.p);
  }
  if (!digitos) {
    const bare = bareJid(jid);
    if (bare.endsWith('@s.whatsapp.net')) {
      digitos = bare.split('@')[0].replace(/\D/g, '');
    }
  }
  if (digitos) formas.add(`${digitos}@s.whatsapp.net`);
  if (!digitos) digitos = bareJid(jid).split('@')[0].replace(/\D/g, '') || '???';

  return { digitos, objetivo: jid, formas };
}

function formasDeCuenta(objetivo, digitos) {
  return new Set([
    bareJid(objetivo),
    canonicalJid(objetivo),
    digitos ? `${digitos}@s.whatsapp.net` : null,
  ].filter(Boolean));
}

// Barre una o varias cuentas de todos los grupos.
// cuentas: [{ digitos, objetivo, formas: Set }]
// hacerAviso(hitsEnGrupo) → payload de sendMessage o null
async function barrerGrupos(sock, grupos, cuentas, hacerAviso) {
  const fuera = [];
  const sinPermiso = [];
  const fallos = [];
  let visto = 0;

  for (const [gJid, meta] of Object.entries(grupos || {})) {
    const hits = [];
    const vistoP = new Set();
    for (const c of cuentas) {
      const hit = formasEnGrupo(meta, c.formas);
      if (!hit) continue;
      const pid = bareJid(hit.p.id);
      if (vistoP.has(pid)) continue;
      vistoP.add(pid);
      hits.push({ ...c, hit });
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
      const payload = hacerAviso(hits);
      if (payload) {
        await sock.sendMessage(gJid, payload).catch(() => {});
        await espera(AVISO_ANTES_MS);
      }
    }

    const ids = hits.map((h) => h.hit.p.id);
    const r = await aplicarParticipantes(sock, gJid, ids, 'remove', meta);
    if (r.ok.length) {
      fuera.push(nombre);
      if (r.fallidos.length) {
        fallos.push(`${nombre} (parcial: ${r.fallidos.length})`);
      }
    } else {
      const porque = r.error || r.fallidos[0]?.status || 'sin respuesta';
      fallos.push(`${nombre} (${porque})`);
      logger.warn(`purga: no pude expulsar de ${gJid}: ${porque}`);
    }
    await espera(PAUSA_MS);
  }

  return { fuera, sinPermiso, fallos, visto };
}

async function resolverCuenta(sock, digitos, groupMeta, protegido = null) {
  try {
    const res = await withTimeout(sock.onWhatsApp(`${digitos}@s.whatsapp.net`), 8000);
    const hit = Array.isArray(res) ? res.find((r) => r?.exists) : null;
    if (!hit?.jid) return { error: `+${digitos} no tiene cuenta de WhatsApp (o no es visible).` };
    const objetivo = hit.jid;
    if (isBotJid(sock, objetivo)) return { error: 'A esa cuenta no.' };
    if (esIntocable(objetivo, groupMeta, protegido)) return { skip: true };
    return { digitos, objetivo, formas: formasDeCuenta(objetivo, digitos) };
  } catch (e) {
    return { error: `No pude comprobar +${digitos}. Inténtalo de nuevo.` };
  }
}

async function cmdPurgaNumero(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);

  // Silencio si no es el owner: una respuesta distinta delataría que existe.
  if (!isMainOwner(sender, msg.key.fromMe, groupMeta)) return;

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const mencionado = ctx?.mentionedJid?.[0] || ctx?.participant || null;
  let objetivo = null;
  let digitos = null;
  let formas = null;

  if (mencionado) {
    const res = cuentaDesdeJid(sock, mencionado, groupMeta);
    if (res.skip) return;
    if (res.error) {
      return sock.sendMessage(jid, { text: res.error }, { quoted: msg });
    }
    objetivo = res.objetivo;
    digitos = res.digitos;
    formas = res.formas;
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
    formas = res.formas;
  }

  await sock.sendMessage(jid, { text: `Purgando +${digitos} de todos los grupos…` }, { quoted: msg });

  let grupos;
  try {
    grupos = await withTimeout(sock.groupFetchAllParticipating(), 15000);
  } catch (e) {
    return sock.sendMessage(jid, { text: 'No pude listar los grupos. Inténtalo de nuevo.' }, { quoted: msg });
  }

  for (const meta of Object.values(grupos || {})) {
    const hit = formasEnGrupo(meta, formas);
    if (hit) hit.suyas.forEach((f) => formas.add(f));
  }

  const { fuera, sinPermiso, fallos, visto } = await barrerGrupos(
    sock,
    grupos,
    [{ digitos, objetivo, formas }],
    (hits) => avisoDeVeto(hits),
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

  // *!purge* es de TODO EL TIER OWNER, por decisión del dueño. *!p* sigue
  // siendo solo del owner principal.
  //
  // Silencio si no lo es: una respuesta distinta delataría que el comando
  // existe, y este no se anuncia en ningún sitio.
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) return;

  // Y quien no es el owner principal NO puede tocar al tier owner. El que lo es
  // sí: si hay que sacar a un co-owner, alguien tiene que poder hacerlo.
  const esElPrincipal = isMainOwner(sender, msg.key.fromMe, groupMeta);
  const protegido = esElPrincipal
    ? (o, meta) => isMainOwner(o, false, meta)
    : (o, meta) => isOwner(o, false, meta);

  // El dispatcher parte por espacios y se come los saltos de línea del listado.
  // Se lee el cuerpo completo (y el citado) para no fusionar ni perder números
  // que venían en renglones distintos.
  //
  // args NUNCA se une con \n: "+54 9 385 313-8518" se volvería cuatro renglones
  // y el último trozo (7+ dígitos) se tomaría por una cuenta aparte. Con espacio
  // el formato se reconstruye y libphonenumber lo lee entero.
  const resto = String(extractText(msg) || '').replace(/^[!¡]\s*purge\b/i, '');
  const ctx = msg.message?.extendedTextMessage?.contextInfo;

  const jidsDirectos = [];
  for (const m of (ctx?.mentionedJid || [])) if (m) jidsDirectos.push(m);
  if (ctx?.participant) jidsDirectos.push(ctx.participant);

  // Lo que destapo esto: una purga de 33 numeros metio 19 cuentas fantasma y
  // solo llego a tocar 11 de las buenas. args es el mismo texto partido por
  // espacios, asi que cada trozo de un telefono formateado ("3217-6205") colaba
  // por numero suelto — y como iban los primeros, se comian el tope de 30 antes
  // de que llegara ni uno de los buenos.
  const deCuerpo = extractNumbers(resto);
  const deCita = extractNumbers(extractQuotedText(msg) || '');
  const deArgs = extractNumbers((args || []).join(' '));
  // El cuerpo original conserva los renglones. args es el fallback (mensaje
  // sin texto parseable, o tests que solo pasan args). Si el cuerpo ya trajo
  // números, no se mezclan los args: serían la misma lista partida por espacios.
  const digitosLista = sinFragmentos([
    ...(deCuerpo.length ? deCuerpo : deArgs),
    ...deCita,
  ]);

  const cuentas = [];
  const errores = [];
  const saltados = [];
  const vistoNum = new Set();
  const vistoJid = new Set();

  const meterCuenta = (c) => {
    if (!c?.objetivo) return;
    const bj = bareJid(c.objetivo);
    if (vistoJid.has(bj)) return;
    vistoJid.add(bj);
    if (c.digitos) vistoNum.add(c.digitos);
    cuentas.push(c);
  };

  for (const j of jidsDirectos) {
    if (cuentas.length >= MAX_PURGE) break;
    const res = cuentaDesdeJid(sock, j, groupMeta, protegido);
    if (res.skip) {
      saltados.push(bareJid(j).split('@')[0].replace(/\D/g, '') || bareJid(j));
      continue;
    }
    if (res.error) {
      errores.push(res.error);
      continue;
    }
    meterCuenta(res);
  }

  const unicos = [];
  for (const d of digitosLista) {
    if (!d || vistoNum.has(d)) continue;
    vistoNum.add(d);
    unicos.push(d);
    if (cuentas.length + unicos.length >= MAX_PURGE) break;
  }

  if (!cuentas.length && !unicos.length) {
    return sock.sendMessage(jid, {
      text:
        'Uso: *!purge* seguido de un listado de números (uno por línea, separados, enlaces wa.me o menciones).\n\n' +
        '_Los saca de todos los grupos del bot y los deja en la lista negra._',
    }, { quoted: msg });
  }

  // Listado ANTES de tocar nada: el owner ve a quién va a sacar.
  const ya = cuentas.map((c) => `+${c.digitos}`);
  const pendientes = unicos.map((d) => `+${d}`);
  const listado = [...ya, ...pendientes].map((x, i) => `${i + 1}. ${x}`).join('\n');
  const total = ya.length + pendientes.length;
  const tope = (cuentas.length + unicos.length) >= MAX_PURGE
    ? `\n_Tope de ${MAX_PURGE}. El resto no se toca._`
    : '';
  await sock.sendMessage(jid, {
    text:
      `*PURGE — listado*\n╾━━━━━━━━━━━━━━╼\n\n` +
      `Voy a purgar *${total}* número(s):\n${listado}${tope}\n\n` +
      `_Comprobando cuentas…_`,
  }, { quoted: msg });

  for (const d of unicos) {
    const res = await resolverCuenta(sock, d, groupMeta, protegido);
    if (res.skip) {
      saltados.push(d);
      continue;
    }
    if (res.error) {
      errores.push(res.error);
      continue;
    }
    meterCuenta(res);
    await espera(PAUSA_ONWA_MS);
  }

  if (!cuentas.length) {
    const extra = [];
    if (errores.length) extra.push(errores.join('\n'));
    // "Omitidos" a secas: poner el motivo era señalar cuál de esos números es
      // el del dueño, y este mensaje lo lee el grupo entero cuando !purge se
      // escribe ahí. Un número sin motivo no dice nada; con el motivo, dice todo.
      if (saltados.length) extra.push(`Omitidos: ${saltados.map((d) => `+${d}`).join(', ')}`);
    return sock.sendMessage(jid, {
      text: `Nada que purgar.\n\n${extra.join('\n\n') || 'Ninguna cuenta válida.'}`,
    }, { quoted: msg });
  }

  let grupos;
  try {
    grupos = await withTimeout(sock.groupFetchAllParticipating(), 15000);
  } catch (e) {
    return sock.sendMessage(jid, { text: 'No pude listar los grupos. Inténtalo de nuevo.' }, { quoted: msg });
  }

  // Ampliar formas con lo que haya en los grupos (LID ↔ teléfono).
  for (const meta of Object.values(grupos || {})) {
    for (const c of cuentas) {
      const hit = formasEnGrupo(meta, c.formas);
      if (!hit) continue;
      hit.suyas.forEach((f) => c.formas.add(f));
      const tel = telefonoDeParticipante(hit.p);
      if (tel) c.digitos = tel;
    }
  }

  const { fuera, sinPermiso, fallos, visto } = await barrerGrupos(
    sock,
    grupos,
    cuentas,
    (hits) => avisoDePurge(hits),
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
      (saltados.length ? `\n\n*Omitidos*\n${saltados.map((d) => `· +${d}`).join('\n')}` : '') +
      `\n\n_En lista negra (${anotadas} forma(s) anotadas). Si vuelven a entrar, se les echa solo._`,
  }, { quoted: msg });
}

module.exports = { cmdPurgaNumero, cmdPurge, extractNumbers, avisoDePurge, avisoDeVeto };
