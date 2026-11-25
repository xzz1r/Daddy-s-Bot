'use strict';

// *!inmune* — LOS NÚMEROS QUE NO RECIBEN EL CASTIGO POR SPAM (16 nov).
//
// El dueño: «te he pasado dos números para que quedaran eximidos del ban y de
// las alertas cuando banean mensajes, y lo que hiciste no sirvió». La lista
// vivía solo en el .env de la VPS (SPAM_INMUNES), y la línea se añadió con un
// `echo >>` que, sin salto de línea al final del fichero, la pega a la de
// antes: dotenv no la ve y los números seguían recibiendo el aviso.
//
// Ahora se guarda desde WhatsApp, en el estado del bot, sin tocar ficheros:
//
//   !inmune                       la lista (la del .env y la de aquí)
//   !inmune +34 600 000 000       añade ese número
//   !inmune  (respondiendo / @)   añade a esa persona, con su @lid y su teléfono
//   !inmune quitar <número|@>     lo quita (solo los de aquí; los del .env, en el .env)
//
// Solo el dueño principal, en el grupo o por privado, y OCULTO: a cualquier
// otro no le contesta (COMANDOS_OCULTOS en messageHandler.js).

const { getSender, getTarget, isMainOwner, dueñoEnPrivado, canonicalJid, bareJid } = require('../utils/wa');
const { inmunesSpamGuardados, ponerInmuneSpam, lidsInmunesAprendidos } = require('../utils/state');
const config = require('../config');

const QUITAR = new Set(['quitar', 'quita', 'borrar', 'borra', 'off', 'no', 'fuera']);

// Un número escrito con espacios o guiones llega en varios trozos: se juntan.
function numeroDeArgs(args) {
  const d = (args || []).filter((a) => /^[+\d][\d\-().]*$/.test(String(a || ''))).join('').replace(/\D/g, '');
  return d.length >= 8 && d.length <= 15 ? d : null;
}

// El @lid de cada inmune lo apunta el bot solo en cuanto llega con su
// teléfono (ver aprenderLid en utils/spamTexto): se dice al lado del número.
const sinNueveAR = (d) => (/^549\d{8,}$/.test(d) ? '54' + d.slice(3) : d);
function conSuLid(numero, aprendidos) {
  const n = sinNueveAR(String(numero).replace(/\D/g, ''));
  return Object.values(aprendidos).some((x) => sinNueveAR(String(x)) === n);
}

// Un @lid guardado dice de quién es si el bot ya sabe su teléfono.
function bonito(v, aprendidos = {}) {
  if (!String(v).includes('@')) return `+${v}${conSuLid(v, aprendidos) ? ' (y su @lid)' : ''}`;
  const tel = canonicalJid(v);
  return /@s\.whatsapp\.net$/.test(String(tel))
    ? `+${String(tel).split('@')[0]} (por su @lid)`
    : `${String(v).split('@')[0]} (sin número todavía)`;
}

async function cmdInmune(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);
  if (!isMainOwner(sender, msg.key.fromMe, groupMeta) && !dueñoEnPrivado(msg)) return;   // silencio

  const quitar = QUITAR.has(String(args[0] || '').toLowerCase());
  const resto = quitar ? args.slice(1) : args;
  const numero = numeroDeArgs(resto);
  const señalado = numero ? null : getTarget(msg);

  // Lo que se guarda: los dígitos del teléfono, y si se señaló a alguien, también
  // su JID (que puede ser un @lid del que aún no se sabe el teléfono).
  const valores = [];
  if (numero) valores.push(numero);
  if (señalado) {
    const tel = canonicalJid(señalado);
    if (tel && /@s\.whatsapp\.net$/.test(tel)) valores.push(tel.split('@')[0].split(':')[0]);
    valores.push(bareJid(señalado));
  }

  if (!valores.length) {
    const guardados = inmunesSpamGuardados();
    const delEnv = config.spamInmunes || [];
    const aprendidos = lidsInmunesAprendidos();
    const lineas = ['*Inmunes al spam*', '_Ni aviso, ni grupo cerrado, ni ban por repetir mensajes, stickers, fotos o vídeos._'];
    lineas.push(guardados.length ? guardados.map((v) => `• ${bonito(v, aprendidos)}`).join('\n') : '_Ninguno guardado desde aquí._');
    if (delEnv.length) {
      const k = delEnv.filter((n) => conSuLid(n, aprendidos)).length;
      lineas.push(`_Y ${delEnv.length} más que vienen de la configuración del bot${k ? ` (${k} ya con su @lid)` : ''}._`);
    }
    lineas.push(`_Añadir: *${config.prefix}inmune +número* o respondiendo a su mensaje. Quitar: *${config.prefix}inmune quitar …*_`);
    return sock.sendMessage(jid, { text: lineas.join('\n') }, { quoted: msg });
  }

  await ponerInmuneSpam(valores, !quitar);
  const quien = numero ? `+${numero}` : (señalado ? `@${señalado.split('@')[0]}` : '');
  return sock.sendMessage(jid, {
    text: quitar
      ? `*${quien}* ya no es inmune al spam.`
      : `*${quien}* es inmune al spam: ni aviso, ni grupo cerrado, ni ban por repetir mensajes, stickers, fotos o vídeos.`,
    ...(señalado && !numero ? { mentions: [señalado] } : {}),
  }, { quoted: msg });
}

module.exports = { cmdInmune, _numeroDeArgs: numeroDeArgs };
