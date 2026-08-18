// !p <número> — saca ese número de TODOS los grupos donde está el bot.
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
// El motivo del veto es fijo: NÚMERO VIRTUAL. Es el caso para el que se pidió
// —cuentas VoIP que entran, spamean y se rehacen— y dejarlo fijo evita que el
// aviso público diga cosas distintas según quién lo escriba.
const { getSender, isMainOwner, isBotJid, isBotAdmin, bareJid, canonicalJid, getTarget } = require('../utils/wa');
const { banAccount } = require('../utils/banlist');
const { extractNumber } = require('./pfp');
const logger = require('../utils/logger');

// Pausa entre grupos. No es paranoia: groupParticipantsUpdate en ráfaga es
// justo lo que dispara el rate-overlimit que ya sale en el log del bot.
const PAUSA_MS = 1200;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// El aviso que se deja en cada grupo del que se le expulsa. Se dice el motivo a
// propósito: si la cuenta desaparece sin más, el grupo se pregunta qué pasó, y
// el aviso sirve además para que nadie vuelva a invitarla.
function avisoDeVeto(numero) {
  return {
    text: '*CUENTA PURGADA*\n╾━━━━━━━━━━━━━━╼\n\n' +
      `@${numero} fuera del grupo.\n\n` +
      '_Se comprobó que es un *número virtual* (VoIP), no una línea real. ' +
      'Queda en la lista negra: si vuelve a entrar, se le echa solo._',
    mentions: [`${numero}@s.whatsapp.net`],
  };
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

async function cmdPurgaNumero(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);

  // Silencio si no es el owner: una respuesta distinta delataría que existe.
  if (!isMainOwner(sender, msg.key.fromMe, groupMeta)) return;

  // El objetivo puede venir mencionado, citado o como número suelto.
  const mencionado = getTarget(msg);
  let objetivo = null;
  let digitos = null;

  if (mencionado) {
    objetivo = mencionado;
    digitos = bareJid(mencionado).split('@')[0].replace(/\D/g, '');
  } else {
    digitos = extractNumber((args || []).join(' '));
    if (!digitos) {
      return sock.sendMessage(jid, {
        text: 'Uso: *!p <número>* — o menciona/responde a la cuenta.\n\n' +
          '_Lo saca de todos los grupos del bot y lo deja en la lista negra como número virtual._',
      }, { quoted: msg });
    }
    // onWhatsApp confirma que existe y da el JID canónico. Sin esto, un número
    // mal escrito lanzaría la purga contra una cuenta que no es.
    try {
      const res = await sock.onWhatsApp(`${digitos}@s.whatsapp.net`);
      const hit = Array.isArray(res) ? res.find((r) => r?.exists) : null;
      if (!hit?.jid) {
        return sock.sendMessage(jid, {
          text: `+${digitos} no tiene cuenta de WhatsApp (o no es visible). No purgo nada.`,
        }, { quoted: msg });
      }
      objetivo = hit.jid;
    } catch (e) {
      return sock.sendMessage(jid, { text: `No pude comprobar +${digitos}: ${e.message}` }, { quoted: msg });
    }
  }

  if (isBotJid(sock, objetivo)) {
    return sock.sendMessage(jid, { text: 'A esa cuenta no.' }, { quoted: msg });
  }
  if (isMainOwner(objetivo, false, groupMeta)) return;

  await sock.sendMessage(jid, { text: `Purgando +${digitos} de todos los grupos…` }, { quoted: msg });

  let grupos;
  try {
    grupos = await sock.groupFetchAllParticipating();
  } catch (e) {
    return sock.sendMessage(jid, { text: `No pude listar los grupos: ${e.message}` }, { quoted: msg });
  }

  // Se juntan TODAS las formas de la cuenta antes de empezar: la que aparece en
  // un grupo sirve para reconocerla en el siguiente, donde a lo mejor solo está
  // con la otra.
  const formas = new Set([bareJid(objetivo), canonicalJid(objetivo), `${digitos}@s.whatsapp.net`]);
  for (const meta of Object.values(grupos || {})) {
    const hit = formasEnGrupo(meta, formas);
    if (hit) hit.suyas.forEach((f) => formas.add(f));
  }

  const fuera = [];       // expulsado
  const sinPermiso = [];  // está, pero el bot no es admin
  const fallos = [];
  let visto = 0;

  for (const [gJid, meta] of Object.entries(grupos || {})) {
    const hit = formasEnGrupo(meta, formas);
    if (!hit) continue;
    visto++;
    const nombre = meta?.subject || gJid;

    if (!isBotAdmin(sock, meta)) { sinPermiso.push(nombre); continue; }

    try {
      await sock.groupParticipantsUpdate(gJid, [hit.p.id], 'remove');
      fuera.push(nombre);
      // El aviso va DESPUÉS de la expulsión: si el kick falla, el grupo no se
      // queda con el anuncio de algo que no llegó a pasar.
      await sock.sendMessage(gJid, avisoDeVeto(digitos)).catch(() => {});
    } catch (e) {
      fallos.push(`${nombre} (${e.message})`);
      logger.warn(`!p: no pude expulsar de ${gJid}: ${e.message}`);
    }
    await espera(PAUSA_MS);
  }

  // La lista negra va al final y SIEMPRE, aunque no estuviera en ningún grupo:
  // ese es justo el caso útil —vetar la cuenta antes de que entre— y ponerla al
  // principio habría dejado un veto puesto si la purga reventaba a la mitad.
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

module.exports = { cmdPurgaNumero };
