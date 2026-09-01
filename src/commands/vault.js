// !vault — la caja donde se guarda el aura para que no la puedan robar.
//
// Tres formas de usarla, todas con nombre propio porque nadie escribe un
// subcomando cuando lo que piensa es un verbo:
//
//   !vault             ver lo que tienes dentro
//   !lock <cantidad>   meterlo (gratis, con enfriamiento)
//   !unlock <cantidad> sacarlo (con comisión al bote)
//
// !safe y !stash valen igual. Los nombres viejos —!zulo, !tapar, !cavar y los
// dos verbos largos— siguen respondiendo para quien ya los tenía en los dedos,
// pero no se anuncian en ningún sitio: están para no dejar a nadie tirado, no
// para que nadie los aprenda.
//
// LA COMISIÓN VA AL BOTE, no se destruye. Si se evaporase, cada uso de la caja
// encogería la economía del grupo un poco, y a los meses eso se nota en el
// ranking sin que nadie sepa por qué. Yendo al bote, el aura sigue en el grupo
// y encima engorda el premio de !asalto: lo que uno paga por esconderse acaba
// siendo el botín de otro.
const { verCaja, esperaCaja, meterEnCaja, sacarDeCaja, getAura } = require('../utils/auraStore');
const { aportarAlBote } = require('../utils/roboStore');
const { CAJA } = require('../utils/economia');
const { getSender } = require('../utils/wa');
const { pickFresh, fmt, aviso, parseCantidad, resolverCantidad } = require('../utils/helpers');
const { SOLO_GRUPOS } = require('../data/avisos');
const { auraApagada, avisarApagada } = require('../utils/auraSwitch');
const RX = require('../data/vaultPhrases');
const logger = require('../utils/logger');

const LINEA = '╾━━━━━━━━━━━━━━╼';

function duracion(ms) {
  const m = Math.ceil(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60 ? `${m % 60} min` : ''}`.trim();
}

const frase = (pool, jid, clave, datos = {}) =>
  pickFresh(pool, `${jid}|vault|${clave}`)
    .replace(/%N/g, datos.N || '')
    .replace(/%C/g, datos.C === undefined ? '' : fmt(datos.C))
    .replace(/%Z/g, datos.Z === undefined ? '' : fmt(datos.Z))
    .replace(/%S/g, datos.S === undefined ? '' : fmt(datos.S));

// Los verbos, con sus alias viejos detrás. Se comparan aquí dentro y no solo
// en el dispatcher a proposito: ver el comentario del freno, mas abajo.
const METER = ['lock', 'stash', 'meter', 'guardar', 'esconder',
  'tapar', 'enterrar'];
const SACAR = ['unlock', 'sacar', 'abrir', 'recuperar',
  'cavar', 'desenterrar'];

async function cmdVault(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }

  const sender = getSender(msg);
  const nm = `@${sender.split('@')[0]}`;
  const sub = String(args[0] || '').toLowerCase();

  // EL FRENO VA AQUI DENTRO, NO SOLO EN EL DISPATCHER, y este agujero era mio.
  //
  // El dispatcher congela por NOMBRE DE COMANDO: *!lock* y *!unlock* estan en
  // CMDS_AURA, *!vault* esta en SOLO_CONSULTA porque a secas solo mira. Pero
  // cmdVault acepta el verbo como subcomando, asi que con la economia apagada
  // *!vault lock 100* y *!safe unlock* movian saldo por la puerta de al lado.
  // Mirar la primera palabra no basta cuando la segunda tambien manda.
  //
  // Es exactamente el mismo caso que la tienda —*!tienda* enseña y
  // *!tienda socio* compra— y alli ya se resolvio poniendo el freno dentro.
  // Lo apliqué a la tienda y no a mi propio comando.
  if ((METER.includes(sub) || SACAR.includes(sub)) && auraApagada(jid)) {
    return avisarApagada(sock, jid, msg);
  }

  // ── METER ─────────────────────────────────────────────────────────────────
  if (METER.includes(sub)) {
    const saldo = await getAura(jid, sender);
    // Entiende "todo", "mitad", "50%" y la cifra a secas, igual que las
    // apuestas: obligar a teclear el número exacto era la mitad de los errores
    // de !dar antes de que existiera este ayudante.
    //
    // Sin cantidad, por defecto se guarda la mitad: es lo que hace alguien que
    // quiere protegerse sin quedarse sin nada con lo que jugar.
    const { stake: pedido } = resolverCantidad(parseCantidad(args.slice(1)), {
      max: saldo, suelo: CAJA.minimoGuardar, porDefecto: Math.round(saldo / 2),
    });
    const r = await meterEnCaja(jid, sender, pedido);

    if (!r.ok) {
      if (r.motivo === 'enfriamiento') {
        return sock.sendMessage(jid, {
          text: `*TODAVÍA NO*\n${frase(RX.ENFRIAMIENTO, jid, 'frio')}\n` +
            `_Vuelve en *${duracion(r.espera)}*._`,
        }, { quoted: msg });
      }
      if (r.motivo === 'lleno') {
        return sock.sendMessage(jid, {
          text: `*LA CAJA ESTÁ LLENA*\n${frase(RX.LLENO, jid, 'lleno')}\n` +
            `_Dentro hay *${fmt(r.dentro)}* y no cabe más de *${fmt(CAJA.capacidad)}*._`,
        }, { quoted: msg });
      }
      return sock.sendMessage(jid, {
        text: `*ESO NO SE GUARDA*\n${frase(RX.POCO, jid, 'poco')}\n` +
          `_El mínimo son *${fmt(CAJA.minimoGuardar)}* y tú tienes *${fmt(saldo)}*._`,
      }, { quoted: msg });
    }

    return sock.sendMessage(jid, {
      text: `*BAJO LLAVE*\n${LINEA}\n\n` +
        `${nm} guarda *${fmt(r.guardado)}*.\n` +
        `_Dentro *${fmt(r.dentro)}* · a la vista *${fmt(r.saldo)}*` +
        (r.hueco > 0 ? ` · cabe *${fmt(r.hueco)}* más_` : ` · la caja está llena_`) + `\n\n` +
        frase(RX.GUARDADO, jid, 'ok', { N: nm, C: r.guardado, Z: r.dentro, S: r.saldo }),
      mentions: [sender],
    }, { quoted: msg });
  }

  // ── SACAR ─────────────────────────────────────────────────────────────────
  if (SACAR.includes(sub)) {
    const dentro = await verCaja(jid, sender);
    if (dentro <= 0) {
      return sock.sendMessage(jid, {
        text: `*LA CAJA ESTÁ VACÍA*\n${frase(RX.VACIO, jid, 'vacio')}`,
      }, { quoted: msg });
    }
    // Sin cantidad se saca TODO: quien abre la caja a por su dinero no suele ir
    // a por la mitad.
    const { stake: pedido } = resolverCantidad(parseCantidad(args.slice(1)), {
      max: dentro, suelo: 1, porDefecto: dentro,
    });
    const r = await sacarDeCaja(jid, sender, pedido);

    if (!r.ok) {
      return sock.sendMessage(jid, {
        text: `*LA CAJA ESTÁ VACÍA*\n${frase(RX.VACIO, jid, 'vacio')}`,
      }, { quoted: msg });
    }

    // La comisión al bote. Si falla, el aura ya salió de la caja y el usuario ya
    // la tiene: se anota y se sigue. Perder la aportación es un error menor;
    // devolver el movimiento entero por esto sería mucho peor.
    if (r.comision > 0 && CAJA.alBote > 0) {
      aportarAlBote(jid, Math.round(r.comision * CAJA.alBote))
        .catch((e) => logger.warn(`vault: la comision no llego al bote: ${e.message}`));
    }

    return sock.sendMessage(jid, {
      text: `*FUERA DE LA CAJA*\n${LINEA}\n\n` +
        `${nm} saca *${fmt(r.sacado)}* y le llegan *${fmt(r.neto)}*.\n` +
        `_La cerradura se queda *${fmt(r.comision)}* (${Math.round(CAJA.comision * 100)} %), que van al bote._\n` +
        `_Queda dentro *${fmt(r.dentro)}* · a la vista *${fmt(r.saldo)}*_\n\n` +
        frase(RX.SACADO, jid, 'ok', { N: nm, C: r.neto, Z: r.dentro, S: r.saldo }),
      mentions: [sender],
    }, { quoted: msg });
  }

  // ── VER LA CAJA ───────────────────────────────────────────────────────────
  const dentro = await verCaja(jid, sender);
  if (dentro <= 0) {
    return sock.sendMessage(jid, {
      text: `*TU CAJA*\n${frase(RX.VACIO, jid, 'vacio')}\n\n` +
        `_Se guarda con *!lock <cantidad>*. Cabe hasta *${fmt(CAJA.capacidad)}*._`,
      mentions: [sender],
    }, { quoted: msg });
  }

  const saldo = await getAura(jid, sender);
  const espera = await esperaCaja(jid, sender);
  const coste = Math.max(CAJA.comisionMinima, Math.round(dentro * CAJA.comision));

  return sock.sendMessage(jid, {
    text: `*TU CAJA*\n${LINEA}\n\n` +
      `Dentro: *${fmt(dentro)}* de *${fmt(CAJA.capacidad)}*\n` +
      `A la vista: *${fmt(saldo)}* — esto sí te lo pueden robar.\n\n` +
      `_Sacarlo todo costaría *${fmt(coste)}*._\n` +
      (espera > 0
        ? `_No puedes volver a guardar hasta dentro de *${duracion(espera)}*._`
        : `_Puedes guardar más cuando quieras._`),
    mentions: [sender],
  }, { quoted: msg });
}

module.exports = { cmdVault };
