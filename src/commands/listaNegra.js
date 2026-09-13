// ─── !listanegra ────────────────────────────────────────────────────────────
//
// La lista negra global del bot, con una puerta y un manejo propios.
//
// Ya se podia tocar de refilon: *!fkban* mete a uno, *!fkunban* lo saca y
// *!fklist* la enseña. Pero esos tres son del anti-fake, los pueden usar los
// admins del grupo, y van de uno en uno sobre alguien que esta delante —
// mencionado o citado. Esto es otra cosa: la lista es del dueño, es GLOBAL —
// vale en todos sus grupos a la vez— y lo normal es meter numeros de gente que
// no esta en ningun grupo todavia. Justo la que aun no ha entrado.
//
// LA PUERTA: dueño y co-dueños. Ni admins ni nadie mas. Un admin de un grupo no
// decide a quien se veta en los demas.
//
// Y CALLA CON QUIEN NO PUEDE. No contesta «solo el dueño»: eso convierte el
// comando en una forma de averiguar quien es el dueño probandolo por el grupo,
// que es justo lo que no puede pasar. Al que no le toca, no le pasa nada.
const { getSender, isOwner, isBotJid, canonicalJid, bareJid } = require('../utils/wa');
const { banAccount, unbanAccount, isBanned, banCount, listBanned } = require('../utils/banlist');
const { extractNumbers } = require('./purgaNumero');
const { allForms, shortAcc } = require('./fk');
const { aplicarAUno } = require('../utils/participantes');
const { withTimeout } = require('../utils/helpers');
const logger = require('../utils/logger');

// Cuantas cuentas se enseñan de golpe. Una lista de doscientas no cabe en un
// mensaje de WhatsApp y lo que hace es que no se lea ninguna.
const POR_PAGINA = 30;
// Tope de numeros por orden. No es por la red —banAccount es un fichero— sino
// porque un pegote de doscientos numeros casi siempre es un error de copiado, y
// deshacerlo es ir uno por uno.
const TOPE_POR_ORDEN = 40;

const QUITAR = new Set(['quitar', 'sacar', 'saca', 'borrar', 'quita', 'remove', 'del', 'elimina', 'eliminar']);
const VER = new Set(['ver', 'lista', 'listar', 'mostrar', 'l']);

// Los numeros de la orden: de una mencion, de un mensaje citado, o escritos.
//
// Se aceptan las tres a la vez a proposito. Citando se veta a quien acaba de
// escribir sin copiar su numero; escrito se veta a quien todavia no ha entrado,
// que es para lo que existe esto.
function objetivosDe(msg, texto) {
  const jids = new Set();
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  for (const m of (ctx?.mentionedJid || [])) if (m) jids.add(bareJid(m));
  if (ctx?.participant) jids.add(bareJid(ctx.participant));
  const digitos = extractNumbers(texto);
  return { jids: [...jids], digitos };
}

function pinta(cuenta) {
  const d = new Date(cuenta.at || 0);
  const cuando = cuenta.at ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` : '—';
  const quien = cuenta.by === 'auto' ? 'el bot' : 'a mano';
  return `· ${shortAcc(cuenta.account)} — ${cuando}, ${quien}`;
}

async function verLista(sock, jid, msg, pagina) {
  const cuentas = await listBanned();
  if (!cuentas.length) {
    return sock.sendMessage(jid, { text: 'La lista negra está vacía. De momento nadie se lo ha ganado.' }, { quoted: msg });
  }
  // Una cuenta puede estar guardada en varias formas (telefono y LID) y son la
  // misma persona. Enseñarlas por separado hace que la lista parezca el doble
  // de larga de lo que es y que quitar una «no funcione».
  const vistas = new Set();
  const unicas = [];
  for (const c of cuentas) {
    const familia = (c.aka && c.aka.length ? c.aka : [c.account]).map(bareJid).sort().join('|');
    if (vistas.has(familia)) continue;
    vistas.add(familia);
    unicas.push(c);
  }
  const paginas = Math.max(1, Math.ceil(unicas.length / POR_PAGINA));
  const p = Math.min(Math.max(1, pagina || 1), paginas);
  const trozo = unicas.slice((p - 1) * POR_PAGINA, p * POR_PAGINA);
  const pie = paginas > 1 ? `\n\nPágina ${p}/${paginas} — *!listanegra ver ${p + 1}* para la siguiente.` : '';
  return sock.sendMessage(jid, {
    text: `*LISTA NEGRA* (${unicas.length} cuenta${unicas.length === 1 ? '' : 's'})\n╾━━━━━━━━━━━━━━╼\n\n${trozo.map(pinta).join('\n')}${pie}`,
  }, { quoted: msg });
}

// Echa a esa cuenta de TODOS los grupos del bot donde este, no solo de este.
//
// Una lista negra que deja al vetado sentado en el grupo de al lado es media
// lista negra. Y la consulta cara se hace UNA vez por orden, no una por numero.
async function echarDeTodos(sock, formasPorCuenta) {
  let grupos = null;
  try { grupos = await withTimeout(sock.groupFetchAllParticipating(), 15000); }
  catch (e) { logger.warn(`listanegra: no pude listar grupos (${e.message})`); return { fuera: 0, sinPoder: 0, grupos: null }; }

  let fuera = 0, sinPoder = 0;
  for (const [gJid, meta] of Object.entries(grupos || {})) {
    if (!gJid.endsWith('@g.us')) continue;
    for (const formas of formasPorCuenta) {
      const dentro = (meta?.participants || []).find((q) =>
        q && [q.id, q.lid, q.phoneNumber].some((f) => f && formas.includes(bareJid(f))));
      if (!dentro) continue;
      // EL DUEÑO SE COMPRUEBA CON LA METADATA DE ESTE GRUPO, no con la del
      // grupo donde se escribio la orden. Arriba ya se filtra, pero alli solo
      // se tiene la ficha del grupo de origen: si el dueño esta en ESTE otro
      // grupo con una forma distinta —su @lid, que cambia de grupo a grupo— la
      // comprobacion de alli no lo reconoce y aqui se le echaria de su propio
      // grupo. Es barato y es el unico error de esta funcion que no tiene
      // arreglo desde dentro del bot.
      if (isBotJid(sock, dentro.id) || isOwner(dentro.id, false, meta)) continue;
      if (await aplicarAUno(sock, gJid, dentro.id, 'remove', meta)) fuera++;
      else { sinPoder++; logger.warn(`listanegra: no pude echar a ${dentro.id} de ${gJid}`); }
    }
  }
  return { fuera, sinPoder, grupos };
}

async function cmdListaNegra(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);
  // Silencio con quien no puede. Ver la nota de arriba.
  if (!isOwner(sender, msg.key.fromMe, groupMeta)) return;

  const primera = String(args?.[0] || '').toLowerCase();
  const resto = (args || []).slice(1).join(' ');
  const todo = (args || []).join(' ');

  // ─── SIN ARGUMENTOS NO SE VUELCA LA LISTA ────────────────────────────────
  //
  // Antes `!listanegra` a secas escupia la primera de doce paginas. El dueño:
  // «no quiero ver una lista tan extensa, solo añadir numeros». Y tiene razon en
  // el fondo: la lista la llena el BOT solo —de 333 cuentas, casi todas las
  // metio el automatico— asi que leerla no dice nada que sirva. Lo que se hace
  // a mano es meter numeros.
  //
  // El volcado sigue estando en `!listanegra ver` para cuando de verdad haga
  // falta buscar a alguien.
  if (!args?.length) {
    const total = await banCount();
    return sock.sendMessage(jid, {
      text: `*LISTA NEGRA* — ${total} cuenta${total === 1 ? '' : 's'} dentro.\n\n`
        + 'Para meter números:\n`!listanegra 573001112233 573004445566`\n\n'
        + 'Para sacarlos:\n`!listanegra quitar 573001112233`\n\n'
        + '_También vale citando un mensaje o mencionando._\n'
        + '_`!listanegra ver` la enseña entera, pero es larga y la llena el bot solo._',
    }, { quoted: msg });
  }
  if (VER.has(primera)) {
    return verLista(sock, jid, msg, Number(args?.[1]) || 1);
  }

  const quitando = QUITAR.has(primera);
  const { jids, digitos } = objetivosDe(msg, quitando ? resto : todo);
  if (!jids.length && !digitos.length) {
    return sock.sendMessage(jid, {
      text: 'Uso:\n'
        + '`!listanegra` — ver la lista\n'
        + '`!listanegra 34600000000 34611111111` — meter números\n'
        + '`!listanegra quitar 34600000000` — sacar\n\n'
        + 'También vale citando un mensaje o mencionando.',
    }, { quoted: msg });
  }

  const cuentas = [
    ...jids.map((j) => ({ etiqueta: j, formas: allForms(j, groupMeta) })),
    ...digitos.map((d) => ({ etiqueta: `${d}@s.whatsapp.net`, formas: allForms(`${d}@s.whatsapp.net`, groupMeta) })),
  ];
  // Sin duplicados: mencionar Y escribir el mismo numero es una sola cuenta.
  const yaVistas = new Set();
  const unicas = cuentas.filter((c) => {
    const k = bareJid(canonicalJid(c.etiqueta) || c.etiqueta);
    if (yaVistas.has(k)) return false;
    yaVistas.add(k);
    return true;
  });
  if (unicas.length > TOPE_POR_ORDEN) {
    return sock.sendMessage(jid, {
      text: `${unicas.length} números de golpe y el tope es ${TOPE_POR_ORDEN}. Pártelo: deshacer esto se hace uno por uno y no lo voy a hacer yo.`,
    }, { quoted: msg });
  }

  if (quitando) {
    let sacadas = 0;
    for (const c of unicas) sacadas += await unbanAccount(c.formas);
    const total = await banCount();
    return sock.sendMessage(jid, {
      text: sacadas
        ? `Perdonados: ${unicas.map((c) => shortAcc(canonicalJid(c.etiqueta) || c.etiqueta)).join(', ')}. Allá tú.\nQuedan ${total} en la lista.`
        : 'Ninguno de esos estaba en la lista negra. Te los has inventado.',
    }, { quoted: msg });
  }

  // ─── METER ─────────────────────────────────────────────────────────────────
  //
  // Al bot y al tier owner no se les veta. Con el bot se contesta —no se
  // descubre nada, ya se sabe cual es— y con el owner se calla, por lo mismo de
  // siempre: una respuesta distinta para el dueño es una forma de encontrarlo.
  const buenas = [];
  let elBot = false;
  for (const c of unicas) {
    if (isBotJid(sock, c.etiqueta)) { elBot = true; continue; }
    if (isOwner(c.etiqueta, false, groupMeta)) continue;
    buenas.push(c);
  }
  if (!buenas.length) {
    return elBot
      ? sock.sendMessage(jid, { text: 'A esa cuenta no. Está por encima de tu lista negra.' }, { quoted: msg })
      : undefined;
  }

  // Se pregunta ANTES de meter: despues estan todas y no habria forma de
  // distinguir «lo acabo de meter» de «ya estaba». Y se guarda CUAL, no cuantos:
  // «uno ya estaba» no dice cual de los cinco, que es justo lo que hace falta
  // saber para no repetir la orden.
  const nuevos = [];
  const repetidos = [];
  for (const c of buenas) {
    const corto = shortAcc(canonicalJid(c.etiqueta) || c.etiqueta);
    if (await isBanned(c.formas).catch(() => null)) repetidos.push(corto);
    else nuevos.push(corto);
    await banAccount(c.formas, `listanegra por ${bareJid(sender)}`, bareJid(sender));
  }

  // Solo se barren los grupos si hay alguien NUEVO. Si los cinco ya estaban, ya
  // se les echo en su dia: repetir la consulta mas cara del bot para no echar a
  // nadie es trabajo por gusto.
  const { fuera, sinPoder } = nuevos.length
    ? await echarDeTodos(sock, buenas.map((c) => c.formas))
    : { fuera: 0, sinPoder: 0 };
  const total = await banCount();

  const lineas = ['*LISTA NEGRA*\n╾━━━━━━━━━━━━━━╼\n'];
  if (nuevos.length) lineas.push(`A la basura: ${nuevos.join(', ')}`);
  if (repetidos.length) {
    lineas.push(repetidos.length === 1
      ? `${repetidos[0]} ya estaba dentro.`
      : `Ya estaban dentro: ${repetidos.join(', ')}`);
  }
  if (fuera) lineas.push(`Echados de ${fuera} grupo${fuera === 1 ? '' : 's'}.`);
  if (sinPoder) lineas.push(`En ${sinPoder} se me quedan dentro: ahí no soy admin y no puedo hacer nada.`);
  if (nuevos.length) lineas.push('\nSi asoman por cualquier grupo, fuera antes de saludar.');
  lineas.push(`Van ${total} en la lista.`);

  return sock.sendMessage(jid, { text: lineas.join('\n') }, { quoted: msg });
}

module.exports = { cmdListaNegra, _objetivosDe: objetivosDe, _echarDeTodos: echarDeTodos };
