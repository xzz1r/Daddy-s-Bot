// !zulo — el agujero donde se esconde el aura para que no la puedan robar.
//
// Tres formas de usarlo, todas con nombre propio porque nadie escribe un
// subcomando cuando lo que piensa es un verbo:
//
//   !zulo             ver lo que tienes enterrado
//   !tapar <cantidad>  meterlo (gratis, con enfriamiento)
//   !cavar <cantidad>  sacarlo (con comisión al bote)
//
// !enterrar y !desenterrar siguen valiendo, pero son el alias: ocho y once
// letras para algo que se teclea con prisa era pedir que nadie lo usara.
//
// LA COMISIÓN VA AL BOTE, no se destruye. Si se evaporase, cada uso del zulo
// encogería la economía del grupo un poco, y a los meses eso se nota en el
// ranking sin que nadie sepa por qué. Yendo al bote, el aura sigue en el grupo
// y encima engorda el premio de !asalto: lo que uno paga por esconderse acaba
// siendo el botín de otro.
const { verZulo, esperaZulo, enterrar, desenterrar, getAura } = require('../utils/auraStore');
const { aportarAlBote } = require('../utils/roboStore');
const { ZULO } = require('../utils/economia');
const { getSender } = require('../utils/wa');
const { pickFresh, fmt, aviso, parseCantidad, resolverCantidad } = require('../utils/helpers');
const { SOLO_GRUPOS } = require('../data/avisos');
const { auraApagada, avisarApagada } = require('../utils/auraSwitch');
const RX = require('../data/zuloPhrases');
const logger = require('../utils/logger');

const LINEA = '╾━━━━━━━━━━━━━━╼';

function duracion(ms) {
  const m = Math.ceil(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60 ? `${m % 60} min` : ''}`.trim();
}

const frase = (pool, jid, clave, datos = {}) =>
  pickFresh(pool, `${jid}|zulo|${clave}`)
    .replace(/%N/g, datos.N || '')
    .replace(/%C/g, datos.C === undefined ? '' : fmt(datos.C))
    .replace(/%Z/g, datos.Z === undefined ? '' : fmt(datos.Z))
    .replace(/%S/g, datos.S === undefined ? '' : fmt(datos.S));

async function cmdZulo(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }

  const sender = getSender(msg);
  const nm = `@${sender.split('@')[0]}`;
  const sub = String(args[0] || '').toLowerCase();

  // EL FRENO VA AQUI DENTRO, NO SOLO EN EL DISPATCHER, y este agujero era mio.
  //
  // El dispatcher congela por NOMBRE DE COMANDO: *!tapar* y *!cavar* estan en
  // CMDS_AURA, *!zulo* esta en SOLO_CONSULTA porque a secas solo mira. Pero
  // cmdZulo acepta el verbo como subcomando, asi que con la economia apagada
  // *!zulo tapar 100* y *!escondite cavar* movian saldo por la puerta de al
  // lado. Mirar la primera palabra no basta cuando la segunda tambien manda.
  //
  // Es exactamente el mismo caso que la tienda —*!tienda* enseña y
  // *!tienda socio* compra— y alli ya se resolvio poniendo el freno dentro.
  // Lo apliqué a la tienda y no a mi propio comando.
  const mueve = ['tapar', 'enterrar', 'meter', 'guardar', 'esconder',
    'cavar', 'desenterrar', 'sacar', 'recuperar'].includes(sub);
  if (mueve && auraApagada(jid)) return avisarApagada(sock, jid, msg);

  // ── ENTERRAR ──────────────────────────────────────────────────────────────
  if (['tapar', 'enterrar', 'meter', 'guardar', 'esconder'].includes(sub)) {
    const saldo = await getAura(jid, sender);
    // Entiende "todo", "mitad", "50%" y la cifra a secas, igual que las
    // apuestas: obligar a teclear el número exacto era la mitad de los errores
    // de !dar antes de que existiera este ayudante.
    //
    // Sin cantidad, por defecto se entierra la mitad: es lo que hace alguien
    // que quiere protegerse sin quedarse sin nada con lo que jugar.
    const { stake: pedido } = resolverCantidad(parseCantidad(args.slice(1)), {
      max: saldo, suelo: ZULO.minimoEnterrar, porDefecto: Math.round(saldo / 2),
    });
    const r = await enterrar(jid, sender, pedido);

    if (!r.ok) {
      if (r.motivo === 'enfriamiento') {
        return sock.sendMessage(jid, {
          text: `*NO TOCA CAVAR*\n${frase(RX.ENFRIAMIENTO, jid, 'frio')}\n` +
            `_Vuelve en *${duracion(r.espera)}*._`,
        }, { quoted: msg });
      }
      if (r.motivo === 'lleno') {
        return sock.sendMessage(jid, {
          text: `*EL ZULO ESTÁ LLENO*\n${frase(RX.LLENO, jid, 'lleno')}\n` +
            `_Dentro hay *${fmt(r.dentro)}* y no cabe más de *${fmt(ZULO.capacidad)}*._`,
        }, { quoted: msg });
      }
      return sock.sendMessage(jid, {
        text: `*ESO NO SE ENTIERRA*\n${frase(RX.POCO, jid, 'poco')}\n` +
          `_El mínimo son *${fmt(ZULO.minimoEnterrar)}* y tú tienes *${fmt(saldo)}*._`,
      }, { quoted: msg });
    }

    return sock.sendMessage(jid, {
      text: `*AL ZULO*\n${LINEA}\n\n` +
        `${nm} entierra *${fmt(r.enterrado)}*.\n` +
        `_Escondido *${fmt(r.dentro)}* · a la vista *${fmt(r.saldo)}*` +
        (r.hueco > 0 ? ` · cabe *${fmt(r.hueco)}* más_` : ` · el agujero está lleno_`) + `\n\n` +
        frase(RX.ENTERRADO, jid, 'ok', { N: nm, C: r.enterrado, Z: r.dentro, S: r.saldo }),
      mentions: [sender],
    }, { quoted: msg });
  }

  // ── DESENTERRAR ───────────────────────────────────────────────────────────
  if (['cavar', 'desenterrar', 'sacar', 'recuperar'].includes(sub)) {
    const dentro = await verZulo(jid, sender);
    if (dentro <= 0) {
      return sock.sendMessage(jid, {
        text: `*EL ZULO ESTÁ VACÍO*\n${frase(RX.VACIO, jid, 'vacio')}`,
      }, { quoted: msg });
    }
    // Sin cantidad se saca TODO: quien va al zulo a por su dinero no suele ir
    // a por la mitad.
    const { stake: pedido } = resolverCantidad(parseCantidad(args.slice(1)), {
      max: dentro, suelo: 1, porDefecto: dentro,
    });
    const r = await desenterrar(jid, sender, pedido);

    if (!r.ok) {
      return sock.sendMessage(jid, {
        text: `*EL ZULO ESTÁ VACÍO*\n${frase(RX.VACIO, jid, 'vacio')}`,
      }, { quoted: msg });
    }

    // La comisión al bote. Si falla, el aura ya salió del zulo y el usuario ya
    // la tiene: se anota y se sigue. Perder la aportación es un error menor;
    // devolver el movimiento entero por esto sería mucho peor.
    if (r.comision > 0 && ZULO.alBote > 0) {
      aportarAlBote(jid, Math.round(r.comision * ZULO.alBote))
        .catch((e) => logger.warn(`zulo: la comision no llego al bote: ${e.message}`));
    }

    return sock.sendMessage(jid, {
      text: `*DEL ZULO A LA MESA*\n${LINEA}\n\n` +
        `${nm} saca *${fmt(r.sacado)}* y le llegan *${fmt(r.neto)}*.\n` +
        `_La pala se queda *${fmt(r.comision)}* (${Math.round(ZULO.comision * 100)} %), que van al bote._\n` +
        `_Queda enterrado *${fmt(r.dentro)}* · a la vista *${fmt(r.saldo)}*_\n\n` +
        frase(RX.DESENTERRADO, jid, 'ok', { N: nm, C: r.neto, Z: r.dentro, S: r.saldo }),
      mentions: [sender],
    }, { quoted: msg });
  }

  // ── VER EL ZULO ───────────────────────────────────────────────────────────
  const dentro = await verZulo(jid, sender);
  if (dentro <= 0) {
    return sock.sendMessage(jid, {
      text: `*TU ZULO*\n${frase(RX.VACIO, jid, 'vacio')}\n\n` +
        `_Se entierra con *!tapar <cantidad>*. Cabe hasta *${fmt(ZULO.capacidad)}*._`,
      mentions: [sender],
    }, { quoted: msg });
  }

  const saldo = await getAura(jid, sender);
  const espera = await esperaZulo(jid, sender);
  const coste = Math.max(ZULO.comisionMinima, Math.round(dentro * ZULO.comision));

  return sock.sendMessage(jid, {
    text: `*TU ZULO*\n${LINEA}\n\n` +
      `Enterrado: *${fmt(dentro)}* de *${fmt(ZULO.capacidad)}*\n` +
      `A la vista: *${fmt(saldo)}* — esto sí te lo pueden robar.\n\n` +
      `_Sacarlo todo costaría *${fmt(coste)}*._\n` +
      (espera > 0
        ? `_No puedes volver a enterrar hasta dentro de *${duracion(espera)}*._`
        : `_Puedes enterrar más cuando quieras._`),
    mentions: [sender],
  }, { quoted: msg });
}

module.exports = { cmdZulo };
