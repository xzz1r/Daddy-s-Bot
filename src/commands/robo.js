const { isOwner, isMainOwner, isAdmin, getSender, getTarget, canonicalJid, sameUser, soloMiembros } = require('../utils/wa');
const { auraApagada, avisarApagada } = require('../utils/auraSwitch');
const { getAura, addAura, drainAura, spendAura } = require('../utils/auraStore');
const { pickFresh, fmt, parseCantidad, resolverCantidad } = require('../utils/helpers');
const { ROBO, RIESGO, ROBO_BASE, ROBO_LIMITES, ROBO_OWNER_MIN, ROBO_OWNER_EXITO, ROBO_OWNER_VISIBLE, BOTE, ATRACO, OBJETOS, VENTAJA, CONTRA, DIANA, OBJETIVO_DIA, MOMENTUM, RECOMPENSA, SALDO_MINIMO } = require('../utils/economia');
const { ownerGana } = require('../utils/rigOwner');
const { fichaFalsaBuscado } = require('../utils/fachada');
const tienda = require('../utils/roboStore');
const momentum = require('../utils/momentum');
const { objetivoDelDia, esObjetivoDelDia, diaClave } = require('../utils/objetivoDia');
const RX = require('../data/roboExtraPhrases');
const { ROBO_FALLO_REMATE, ROB_WIN, ROB_FAIL, ROB_MAESTRO, ROB_PARCIAL, ROB_DESASTRE } = require('../data/roboPhrases');
const { fraseCooldown, ROBO: ROBO_CD, ROBO_ASALTO, ROBO_GUARDIA } = require('../data/cooldownPhrases');
const { A_TI_MISMO, SOLO_GRUPOS } = require('../data/avisos');
const { aviso } = require('../utils/helpers');

// La escala vive en utils/economia.js. Aqui solo el cooldown, que es de ritmo
// de juego y no de economia.
const STAKE_FLOOR     = ROBO.suelo;
const MIN_AURA        = ROBO.minVictima;
// Bajado, y la cifra vive SOLO en la constante de abajo. Con la probabilidad en
// rango de casino se acierta bastante menos, y esperar tanto para fallar hacia
// que el comando se usara poco. Sigue por debajo del escudo de la victima
// (ESCUDO_MS), asi que no se pueden encadenar dos robos contra la misma persona.
const ROB_COOLDOWN_MS = 6 * 60 * 1000;

// Techo de lo que se puede mover en un robo concreto.
//
// OJO: esto NO recorta la cantidad que pides por gusto. Antes había un tope por
// fracción del saldo de la víctima y era lo que rompía el comando: pedías 52,
// la víctima tenía 52, y el bot robaba 18. Escribir un número y que salga otro
// hace que el comando parezca ignorarte, por mucho que se explique al final.
//
// Lo que queda son tres límites que no se pueden saltar sin romper la economía:
//   · la víctima no puede perder más de lo que tiene;
//   · el ladrón no puede apostar más de lo que podría pagar si le sale mal;
//   · y un techo absoluto, para que un solo comando no decida el ranking.
//
// Dentro de eso, la cantidad que pides es la que va. El precio de pedir mucho se
// paga en probabilidad, no en un recorte silencioso.
function topeRobo(auraLadron, auraVictima) {
  return Math.max(
    ROBO.suelo,
    Math.min(Math.floor(auraVictima * ROBO.techoFraccion), auraLadron),
  );
}

// El remate del robo fallido. Era UNA linea fija —"y le salio al reves"— que
// ademas de sosa se leia igual las mil veces. Ahora rota, y se rie del que lo
// intento en vez de describir lo que paso.
const lastRob = new Map(); // `${groupJid}|${canonicalJid}` -> timestamp

// El amaño del owner y su techo de racha viven en utils/rigOwner.js, y el
// contador es COMPARTIDO con el duelo y el mog: el grupo ve las cinco dinamicas
// en el mismo chat y no distingue de cual venia cada victoria.

// %A = atacante (ladrón), %V = víctima
// Success chance based on role tiers and aura gap.
// Ranges ~25%–72%: enough variance that no one farms safely.
function calcChance(aO, aA, vO, vA, auraA, auraV) {
  // Las cifras viven en economia.js con el resto de la escala: tenerlas aqui a
  // pelo es como el duelo se quedo tres versiones atras sin que nadie lo viera.
  let base = aO ? ROBO_BASE.owner : aA ? ROBO_BASE.admin : ROBO_BASE.miembro;
  if (vO && !aO) base -= 0.14;
  else if (vA && !aA && !aO) base -= 0.07;
  // Cada 50 de diferencia mueve ±2%, con tope de ±10%. El divisor va con la
  // escala nueva (antes 500, cuando el arranque era 1000): si no, la brecha
  // entre dos jugadores nunca llegaría a mover la aguja.
  const diff = auraA - auraV;
  const shift = Math.sign(diff) * Math.min(Math.abs(diff / 50), 5) * 0.02;
  return Math.min(ROBO_LIMITES.techo, Math.max(ROBO_LIMITES.suelo + 0.05, base + shift));
}

// Desenlaces del robo. Antes solo había dos (te llevas todo / pierdes la mitad),
// así que el comando era una moneda al aire con texto bonito. Ahora el dado
// decide TAMBIÉN cuánto, y hay dos extremos que cambian la historia: el golpe
// maestro se lleva casi el doble, y el desastre le regala tu aura a la víctima.
//
// `mult` se aplica sobre lo apostado. Positivo: pasa de la víctima al ladrón.
// Negativo: sale del ladrón (y en el desastre, entra a la víctima).
const DESENLACES = {
  maestro:  { peso: 0.12, mult:  1.8, titulo: '*ROBO REDONDO*' },
  limpio:   { peso: 0.55, mult:  1.0, titulo: '*ROBO EXITOSO*' },
  parcial:  { peso: 0.33, mult:  0.4, titulo: '*ROBO A MEDIAS*' },
  fallo:    { peso: 0.70, mult: -0.5, titulo: '*ROBO FALLIDO*' },
  desastre: { peso: 0.30, mult: -1.0, titulo: '*DESASTRE TOTAL*' },
};

// Cada desenlace tiene su propio pool: el texto de un golpe maestro no puede
// ser el mismo que el de un robo justito, y el de un desastre (donde la víctima
// COBRA) desentonaba del todo mezclado con los de fallo normal.
// Ordenados de mas duro a mas suave al cargar: el bot abre con lo peor de cada
// desenlace y guarda lo tibio para cuando se le agote el arsenal.
const FRASES_POR_DESENLACE = {
  maestro:  () => ROB_MAESTRO,
  limpio:   () => ROB_WIN,
  parcial:  () => ROB_PARCIAL,
  fallo:    () => ROB_FAIL,
  desastre: () => ROB_DESASTRE,
};

// ── Dinámicas del robo ───────────────────────────────────────────────────────
//
// Sin esto, robar era una tirada plana: la misma probabilidad siempre, sin
// decisiones ni consecuencias. Cuatro reglas le dan cuerpo, y todas se cuentan
// al jugador en el propio mensaje para que sepa por qué le salió como le salió.
//
//  1. AMBICIÓN. Apostar fuerte baja la probabilidad. Antes daba exactamente
//     igual pedir 5 que pedir el máximo, así que todo el mundo pedía el máximo
//     y no había ninguna decisión que tomar.
//  2. ESCUDO DE LA VÍCTIMA. El cooldown era solo del atacante, así que cinco
//     personas distintas podían vaciar al mismo en un minuto y ese no podía
//     hacer nada. Tras un robo con éxito queda protegido un rato.
//  3. GUARDIA. Insistir contra la misma víctima baja tu probabilidad: la
//     segunda vez ya te está esperando. Corta el farmeo sobre el mismo pringado.
//  4. VENGANZA. Si te robaron hace poco, devolver el golpe a ESE tiene un plus.
const ESCUDO_MS = 7 * 60 * 1000;    // protección de la víctima tras ser robada
const GUARDIA_MS = 30 * 60 * 1000;  // ventana en la que se recuerda a quién atacaste
const VENGANZA_MS = 30 * 60 * 1000; // ventana para devolver el golpe con plus

const FAMA_MS = 75 * 60 * 1000;     // cuanto se te recuerda un robo que salio bien

const robadoHasta = new Map();  // `${grupo}|${victima}` -> ts en que se le puede volver a robar
const ultimoAtaque = new Map(); // `${grupo}|${ladron}|${victima}` -> { ts, veces }
const ultimoRobado = new Map(); // `${grupo}|${victima}` -> { por, ts }
const fama = new Map();         // `${grupo}|${ladron}` -> [ts, ts, ...] robos con exito

function limpiaMapa(m) {
  if (m.size >= 3000) m.delete(m.keys().next().value);
}

// Robos con exito del ladron en la ventana de fama, contra CUALQUIER victima.
// Se poda al consultar, asi que la lista no crece sola.
function rachaDe(grupo, ladron) {
  const k = `${grupo}|${ladron}`;
  const previos = fama.get(k);
  if (!previos) return 0;
  const corte = Date.now() - FAMA_MS;
  const vivos = previos.filter(ts => ts > corte);
  if (vivos.length) fama.set(k, vivos); else fama.delete(k);
  return vivos.length;
}

function anotarFama(grupo, ladron) {
  const k = `${grupo}|${ladron}`;
  const corte = Date.now() - FAMA_MS;
  const vivos = (fama.get(k) || []).filter(ts => ts > corte);
  vivos.push(Date.now());
  limpiaMapa(fama);
  fama.set(k, vivos);
}

// Ajusta la probabilidad base con las dinámicas. Devuelve la probabilidad final
// y los motivos, para poder explicárselos al jugador.
// Fraccion del tope que se ha pedido, en [0,1]. Es la palanca de todo lo que
// depende de "cuanto has pedido".
function fraccionPedida(stake, maxStake) {
  if (!(maxStake > 0)) return 0;
  return Math.min(1, Math.max(0, stake / maxStake));
}

// Castigo por la cifra elegida. Cuadratico por los DOS lados: hay un punto
// dulce en mitad de la horquilla y las dos orillas cuestan.
//
// Antes solo castigaba por arriba, asi que la jugada optima era pedir siempre
// el minimo — maxima probabilidad y botin de risa. Eso no es elegir: es que
// haya una sola respuesta correcta. Con las dos orillas penalizadas hay que
// decidir de verdad cuanto arriesgar.
function castigoPorCifra(a) {
  const { puntoDulce: pd, codiciaMax, miseriaMax } = RIESGO;
  if (a > pd) {
    const x = (a - pd) / (1 - pd);
    return { castigo: x * x * codiciaMax, etiqueta: 'codicia' };
  }
  const x = (pd - a) / pd;
  return { castigo: x * x * miseriaMax, etiqueta: 'sin agallas' };
}

function ajustarProbabilidad(base, { grupo, ladron, victima, stake, maxStake, esOwner = false }) {
  let p = base;
  const motivos = [];
  const a = fraccionPedida(stake, maxStake);

  // 1. La cifra elegida. El owner queda fuera: robe lo que robe, la cantidad no
  //    le penaliza.
  if (!esOwner && maxStake > 0) {
    const { castigo, etiqueta } = castigoPorCifra(a);
    if (castigo > 0.02) {
      p -= castigo;
      motivos.push(`${etiqueta} (−${Math.round(castigo * 100)}%)`);
    }
  }

  // 2. Guardia: cada intento previo reciente sobre la MISMA víctima resta 8%,
  //    hasta un tope de -24%.
  const kAtaque = `${grupo}|${ladron}|${victima}`;
  const prev = ultimoAtaque.get(kAtaque);
  if (!esOwner && prev && Date.now() - prev.ts < GUARDIA_MS && prev.veces > 0) {
    const castigo = Math.min(prev.veces, 3) * 0.08;
    p -= castigo;
    motivos.push(`ya te vio venir (−${Math.round(castigo * 100)}%)`);
  }

  // 3. Venganza: +12% si le devuelves el golpe a quien te robó hace poco.
  const kRobado = `${grupo}|${ladron}`;
  const mio = ultimoRobado.get(kRobado);
  if (mio && mio.por === victima && Date.now() - mio.ts < VENGANZA_MS) {
    p += 0.12;
    motivos.push('venganza (+12%)');
  }

  // 4. FAMA. Dinamica nueva. Cada robo TUYO que haya salido bien en la ultima
  //    hora larga te resta, robes a quien robes.
  //
  //    La guardia solo cubre a la misma victima, asi que bastaba con ir rotando
  //    entre cinco personas para farmear sin penalizacion ninguna. Esto cierra
  //    esa puerta: al que la lia mucho y seguido lo tiene el grupo fichado, y
  //    ademas obliga a parar y dejar enfriar, que es cuando el comando se pone
  //    interesante para el resto.
  const racha = rachaDe(grupo, ladron);
  if (!esOwner && racha > 0) {
    const castigo = Math.min(racha, 3) * 0.09;
    p -= castigo;
    motivos.push(`te tienen fichado (−${Math.round(castigo * 100)}%)`);
  }

  // El owner nunca baja del suelo suyo, elija la cifra que elija. Para el resto,
  // el suelo garantiza que un robo NUNCA sea imposible por muchos castigos que
  // se acumulen: sigue siendo un tiro, aunque sea malo.
  const suelo = esOwner ? ROBO_OWNER_MIN : ROBO_LIMITES.suelo;
  const techo = esOwner ? ROBO_LIMITES.techoOwner : ROBO_LIMITES.techo;
  return { p: Math.min(techo, Math.max(suelo, p)), motivos, ambicion: a };
}

// ¿Está la víctima protegida por un robo reciente? Devuelve los minutos que
// quedan, o 0 si se le puede robar.
function escudoRestante(grupo, victima) {
  const hasta = robadoHasta.get(`${grupo}|${victima}`) || 0;
  const queda = hasta - Date.now();
  return queda > 0 ? Math.ceil(queda / 60000) : 0;
}

function anotarIntento(grupo, ladron, victima) {
  const k = `${grupo}|${ladron}|${victima}`;
  const prev = ultimoAtaque.get(k);
  const veces = prev && Date.now() - prev.ts < GUARDIA_MS ? prev.veces + 1 : 1;
  limpiaMapa(ultimoAtaque);
  ultimoAtaque.set(k, { ts: Date.now(), veces });
}

function anotarRoboExitoso(grupo, ladron, victima) {
  limpiaMapa(robadoHasta);
  robadoHasta.set(`${grupo}|${victima}`, Date.now() + ESCUDO_MS);
  limpiaMapa(ultimoRobado);
  ultimoRobado.set(`${grupo}|${victima}`, { por: ladron, ts: Date.now() });
}

// Ir A LO GRANDE no solo baja la probabilidad: cambia la FORMA del resultado.
//
// Segunda dinamica nueva. Cuando se pide el 85 % del tope o mas, los desenlaces
// se corren hacia los dos extremos: sale el golpe maestro mucho mas a menudo, y
// cuando sale mal, sale mal de verdad. Un robo prudente casi siempre acaba en
// algo tibio (limpio o a medias); uno a lo bestia acaba en historia, para bien
// o para mal.
//
// Sin esto, arriesgar solo tenia contras: menos probabilidad a cambio de una
// cifra algo mayor. Ahora arriesgar compra ademas la posibilidad del golpe
// gordo, que es lo que hace que valga la pena pensarselo.
const PESOS_ALL_IN = {
  maestro: 3.0, limpio: 0.9, parcial: 0.4,   // si sale bien, sale muy bien
  fallo: 0.8, desastre: 1.3,                 // si sale mal, duele
};

function elegirDesenlace(exito, ambicion = 0) {
  const ramas = exito ? ['maestro', 'limpio', 'parcial'] : ['fallo', 'desastre'];
  const allIn = ambicion >= RIESGO.allIn;
  const peso = (k) => DESENLACES[k].peso * (allIn ? PESOS_ALL_IN[k] : 1);
  const total = ramas.reduce((a, k) => a + peso(k), 0);
  let r = Math.random() * total;
  for (const k of ramas) {
    r -= peso(k);
    if (r <= 0) return k;
  }
  return ramas[ramas.length - 1];
}

// ═══ LAS DINÁMICAS NUEVAS ════════════════════════════════════════════════════
//
// Todas comparten el mismo criterio: dan una DECISIÓN. Antes robar era escribir
// el comando y esperar; ahora hay que elegir si comprar, si asaltar, si
// contraatacar y a quién ir. El azar sigue mandando, pero ya no es lo único.

const fraseCon = (pool, clave, subs) => {
  let t = pickFresh(pool, clave);
  for (const [k, v] of Object.entries(subs)) t = t.replace(new RegExp(k, 'g'), v);
  return t;
};
const tag = (j) => `@${String(j).split('@')[0]}`;

// "3h 20min" en vez de "12000000 ms". Se redondea hacia arriba: decirle a
// alguien que le quedan 0 minutos cuando aun esta protegido es mentir.
function restanteEnTexto(ms) {
  const min = Math.ceil(ms / 60000);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

// ─── !robo bote ──────────────────────────────────────────────────────────────
async function verElBote(sock, msg, jid) {
  const bote = await tienda.verBote(jid);
  if (bote < BOTE.minimoParaAsaltar) {
    return sock.sendMessage(jid, {
      text: `${pickFresh(RX.BOTE_VACIO, `${jid}|bote|vacio`)}\n\n_Hay *${fmt(bote)}*. Desde *${fmt(BOTE.minimoParaAsaltar)}* se puede asaltar con *!robo asalto*._`,
    }, { quoted: msg });
  }
  return sock.sendMessage(jid, {
    text: `*EL BOTE DEL GRUPO*\n╾━━━━━━━━━━━━━━╼\n\n` +
      `Hay *${fmt(bote)}* de aura ahí dentro.\n` +
      `Lo han puesto todos los que fallaron robando.\n\n` +
      `_*!robo asalto* — cuesta ${fmt(BOTE.entrada)} y sale bien ${Math.round(BOTE.probabilidad * 100)} de cada 100 veces. El que acierta se lo lleva ENTERO._`,
  }, { quoted: msg });
}

// ─── !robo asalto ────────────────────────────────────────────────────────────
async function asaltarBote(sock, msg, jid, sender, groupMeta) {
  const bote = await tienda.verBote(jid);
  if (bote < BOTE.minimoParaAsaltar) {
    return sock.sendMessage(jid, {
      text: `${pickFresh(RX.BOTE_VACIO, `${jid}|bote|vacio`)}\n_Hay ${fmt(bote)}; hacen falta ${fmt(BOTE.minimoParaAsaltar)}._`,
    }, { quoted: msg });
  }

  // El cooldown del robo normal también vale aquí: si no, asaltar el bote sería
  // la vía para saltárselo y el comando se convertiría en una tragaperras.
  const coolKey = `${jid}|${canonicalJid(sender)}`;
  const queda = ROB_COOLDOWN_MS - (Date.now() - (lastRob.get(coolKey) || 0));
  if (queda > 0) {
    return sock.sendMessage(jid, {
      text: `*ASALTO EN COOLDOWN*\n${fraseCooldown(ROBO_ASALTO, `${coolKey}|asalto`, 0.1)}\n_Vuelve en *${Math.ceil(queda / 60000)}min*._`,
    }, { quoted: msg });
  }

  // Cobro atómico: leer saldo y restar aparte dejaba dos asaltos simultáneos
  // en negativo. Si no llega, el cooldown NO se gasta.
  const pago = await spendAura(jid, sender, BOTE.entrada, SALDO_MINIMO);
  if (!pago.ok) {
    return sock.sendMessage(jid, {
      text: `La entrada son *${fmt(BOTE.entrada)}* y tienes *${fmt(pago.saldo)}*. El bote no fía.`,
    }, { quoted: msg });
  }
  limpiaMapa(lastRob);
  lastRob.set(coolKey, Date.now());
  const a = tag(sender);

  // El owner NO revienta siempre. El resto de amaños (robo, contra, duelo,
  // mog, atraco) pasan por ownerGana: ventaja real y tope de racha. Un 100 %
  // aquí, con el bote reventado a su nombre, es el patrón que el grupo aprende
  // en tres tardes. Misma tasa que !robo, misma racha.
  const revienta = isMainOwner(sender, msg.key.fromMe, groupMeta)
    ? ownerGana(jid, ROBO_OWNER_EXITO)
    : Math.random() < BOTE.probabilidad;

  if (!revienta) {
    // La entrada engorda el bote MENOS la comisión, que se destruye. Si entrara
    // entera, el asalto no drenaría nada: todo lo que se mete acaba saliendo en
    // el siguiente reventón, y el robo dejaría de ser el sumidero del sistema.
    const ahora = await tienda.aportarAlBote(jid, BOTE.entrada * (1 - BOTE.comision));
    return sock.sendMessage(jid, {
      text: `*ASALTO FALLIDO*\n\n${fraseCon(RX.BOTE_FALLA, `${jid}|bote|falla`, { '%A': a })}\n\n_El bote sube a *${fmt(ahora)}*._`,
      mentions: [sender],
    }, { quoted: msg });
  }

  const premio = await tienda.vaciarBote(jid);
  const { current } = await addAura(jid, sender, premio);
  await tienda.anotarGolpe(jid, sender, premio);
  return sock.sendMessage(jid, {
    text: `*BOTE REVENTADO*\n╾━━━━━━━━━━━━━━╼\n\n` +
      `${fraseCon(RX.BOTE_REVIENTA, `${jid}|bote|revienta`, { '%A': a, '%C': fmt(premio) })}\n\n` +
      `${a} +${fmt(premio)} → *${fmt(current)}* de aura`,
    mentions: [sender],
  }, { quoted: msg });
}

// ─── !robo tienda / !robo comprar <objeto> ───────────────────────────────────
async function laTienda(sock, msg, jid, sender, args, groupMeta) {
  const que = (args[1] || '').toLowerCase();
  const nombre = tag(sender);

  if (!que || !OBJETOS[que]) {
    // AGRUPADA POR PARA QUE SIRVE CADA COSA. Eran ocho lineas planas en las que
    // el escudo y el indulto —que no tienen nada que ver ni en precio ni en uso—
    // se leian igual. Las tres familias ya existian en los comentarios de
    // economia.js; aqui solo se hacen visibles.
    const familia = (titulo, claves) =>
      `*${titulo}*\n` + claves
        .filter((k) => OBJETOS[k])
        .map((k) => `· *${k}* — ${fmt(OBJETOS[k].precio)} · ${OBJETOS[k].desc}`)
        .join('\n');
    const lineas = [
      familia('PARA SALIR DE CAZA', ['escudo', 'cebo', 'ganzua']),
      familia('PARA LA MESA', ['amuleto', 'seguro', 'socio']),
      familia('PERMISOS', ['pase', 'indulto']),
    ].join('\n\n');

    // Lo que YA llevas encima. Una tienda que no te enseña tu inventario te
    // obliga a comprar a ciegas, y comprar dos escudos seguidos porque no
    // sabias que el primero seguia activo no es una decision, es un timo.
    const mio = await tienda.objetosDe(jid, sender);
    const ahora = Date.now();
    const llevo = [];
    if (mio.escudo > ahora) llevo.push(`escudo — le quedan *${restanteEnTexto(mio.escudo - ahora)}*`);
    if (mio.cebo > ahora)   llevo.push(`cebo — le quedan *${restanteEnTexto(mio.cebo - ahora)}*`);
    if (mio.ganzua > 0)     llevo.push(`ganzúa — *${mio.ganzua}* ${mio.ganzua === 1 ? 'uso' : 'usos'}`);
    if (mio.pase > ahora)    llevo.push(`pase de redes — le quedan *${restanteEnTexto(mio.pase - ahora)}*`);
    if (mio.indulto > ahora) llevo.push(`indulto — le quedan *${restanteEnTexto(mio.indulto - ahora)}*`);
    if (mio.socio > ahora)   llevo.push(`socio — le quedan *${restanteEnTexto(mio.socio - ahora)}*`);
    if (mio.amuleto > 0)     llevo.push(`amuleto — *${mio.amuleto}* ${mio.amuleto === 1 ? 'uso' : 'usos'}`);
    if (mio.seguro > 0)      llevo.push(`seguro — *${mio.seguro}* ${mio.seguro === 1 ? 'uso' : 'usos'}`);

    // El limite de los objetos de ventaja se dice AQUI y con el reloj puesto. Es
    // la unica regla de la tienda que puede hacer que una compra rebote, y
    // enterarse al intentar pagar es la peor forma de enterarse.
    const conVentaja = Object.keys(OBJETOS).filter((k) => OBJETOS[k].ventaja);
    const desdeVentaja = Date.now() - await tienda.ultimaVentaja(jid, sender);
    const esperaVentaja = VENTAJA.cooldownHoras * 3600000;
    const avisoVentaja = desdeVentaja < esperaVentaja
      ? `_${conVentaja.join(', ')} dan ventaja de verdad: solo *uno cada ${VENTAJA.cooldownHoras}h*. Te toca en *${restanteEnTexto(esperaVentaja - desdeVentaja)}*._`
      : `_${conVentaja.join(', ')} dan ventaja de verdad: solo *uno cada ${VENTAJA.cooldownHoras}h*, y ahora mismo lo tienes disponible._`;

    // Y cuanto hay en la caja, porque cada compra la engorda: es la consecuencia
    // directa de estar mirando esta pantalla y el enganche con !atraco.
    const enCaja = await tienda.verCaja(jid);

    return sock.sendMessage(jid, {
      text: `*LA TIENDA DEL LADRÓN*\n╾━━━━━━━━━━━━━━╼\n\n${lineas}\n\n${avisoVentaja}\n\n` +
        `*LLEVAS ENCIMA*\n` +
        (llevo.length ? llevo.map(l => `· ${l}`).join('\n') : `_${pickFresh(RX.INVENTARIO_VACIO, `${jid}|inv|vacio`)}_`) +
        `\n\n_Se compra con *!comprar <lo que sea>*._` +
        `\n_En la caja hay *${fmt(enCaja)}*. Un ${Math.round(ATRACO.fraccionDeCompra * 100)}% de cada compra va ahí, y con *!atraco* se entra a por ella._`,
      mentions: [sender],
    }, { quoted: msg });
  }

  // LA COMPRA SE PARA CON LA ECONOMIA APAGADA; EL CATALOGO DE ARRIBA NO.
  //
  // *!aura off* congela lo que MUEVE saldo. El dispatcher lo hace por nombre de
  // comando, y con la tienda eso no basta: el mismo *!tienda* enseña el
  // catalogo si va solo y COMPRA si lleva un objeto detras. Tapar el comando
  // entero dejaba el escaparate a oscuras sin motivo, y dejarlo pasar entero
  // permitia comprar con la economia en pausa. La linea esta aqui, que es donde
  // se sabe cual de las dos cosas esta pasando.
  if (auraApagada(jid)) return avisarApagada(sock, jid, msg);

  const obj = OBJETOS[que];
  // Quien intento atracar la tienda no compra en ella hasta que se le pase. Va
  // ANTES de mirar el saldo: el motivo por el que no puede comprar es el veto,
  // y decirle "no te llega" cuando en realidad esta vetado seria mentirle.
  const veto = await tienda.vetoTienda(jid, sender);
  if (veto) {
    return sock.sendMessage(jid, {
      text: `${fraseCon(RX.ATRACO_VETADO, `${jid}|atraco|vetado`, { '%A': tag(sender) })}\n_Vuelve en *${restanteEnTexto(veto - Date.now())}*._`,
      mentions: [sender],
    }, { quoted: msg });
  }
  // Uno de los tres objetos de ventaja cada 12 h, compartido entre ellos. Es lo
  // que sostiene que puedan ser positivos: ver VENTAJA en economia.js. Va antes
  // del saldo por lo mismo que el veto — el motivo real de que no pueda comprar
  // es este, y decirle "no te llega" seria mentirle.
  if (obj.ventaja) {
    const desde = Date.now() - await tienda.ultimaVentaja(jid, sender);
    const espera = VENTAJA.cooldownHoras * 3600000;
    if (desde < espera) {
      return sock.sendMessage(jid, {
        text: `La tienda solo fía *un* objeto de ventaja cada *${VENTAJA.cooldownHoras}h*, y ya gastaste el tuyo.\n` +
          `_Vuelve en *${restanteEnTexto(espera - desde)}*. Mientras tanto, el escudo, el cebo y el socio no cuentan para esto._`,
        mentions: [sender],
      }, { quoted: msg });
    }
  }

  const pago = await spendAura(jid, sender, obj.precio, SALDO_MINIMO);
  if (!pago.ok) {
    return sock.sendMessage(jid, {
      text: `${fraseCon(RX.COMPRA_POBRE, `${jid}|compra|pobre`, { '%N': nombre })}\n_Cuesta *${fmt(obj.precio)}*. Tienes *${fmt(pago.saldo)}*._`,
      mentions: [sender],
    }, { quoted: msg });
  }
  if (obj.ventaja) await tienda.anotarVentaja(jid, sender);
  // Y una parte de lo pagado se queda EN LA CAJA en vez de destruirse, para que
  // haya algo que atracar. El resto se sigue destruyendo: la tienda no deja de
  // ser un sumidero, solo devuelve una parte y con mucho riesgo por medio.
  await tienda.aportarACaja(jid, obj.precio * ATRACO.fraccionDeCompra);
  // Por USOS o por HORAS, segun lo que declare el objeto.
  //
  // Antes esto preguntaba literalmente `if (que === 'ganzua')`, asi que
  // cualquier objeto nuevo de un solo uso caia en la rama de las horas y se
  // guardaba `Date.now() + undefined * 3600000`, o sea NaN: comprado, cobrado y
  // sin efecto ninguno. Ahora manda la ficha del objeto y no su nombre.
  if (obj.usos) {
    const previos = (await tienda.objetosDe(jid, sender))[que] || 0;
    await tienda.darObjeto(jid, sender, que, previos + obj.usos);
  } else {
    await tienda.darObjeto(jid, sender, que, Date.now() + obj.horas * 3600000);
  }

  // Cada objeto con su voz. Un mensaje generico para los tres convierte la
  // tienda en un formulario.
  const pool = que === 'escudo' ? RX.COMPRA_ESCUDO
             : que === 'ganzua' ? RX.COMPRA_GANZUA
             : que === 'cebo'   ? RX.COMPRA_CEBO
             : RX.COMPRA_OK;
  return sock.sendMessage(jid, {
    text: `*COMPRA HECHA — ${que.toUpperCase()}*\n\n` +
      // %H son las horas DEL OBJETO, no un numero escrito en la frase. Las frases
      // del escudo decian "doce horas" y "medio dia" mientras el objeto duraba
      // 24: la misma mentira que tenia el socio, en el texto que se lee justo al
      // pagar. Un texto fijo al lado de una constante que se toca al reequilibrar
      // siempre acaba asi.
      `${fraseCon(pool, `${jid}|compra|${que}`, { '%N': nombre, '%C': fmt(obj.precio), '%H': String(obj.horas || '') })}\n\n_${obj.desc}._`,
    mentions: [sender],
  }, { quoted: msg });
}

// ─── !robo contra ────────────────────────────────────────────────────────────
//
// Solo lo puede usar quien acaba de ser robado, y solo dentro de la ventana.
// Fuera de ella no hay nada que vengar: el aura ya circuló y reabrirlo sería
// convertir cada robo en una cadena infinita.
const pendienteContra = new Map(); // `${grupo}|${victima}` -> { ladron, cuanto, ts }

function anotarParaContra(grupo, victima, ladron, cuanto) {
  limpiaMapa(pendienteContra);
  pendienteContra.set(`${grupo}|${canonicalJid(victima)}`, { ladron: canonicalJid(ladron), cuanto, ts: Date.now() });
}

async function contraatacar(sock, msg, jid, sender, groupMeta) {
  const k = `${jid}|${canonicalJid(sender)}`;
  const p = pendienteContra.get(k);
  const v = tag(sender);

  if (!p || Date.now() - p.ts > CONTRA.ventanaSeg * 1000) {
    pendienteContra.delete(k);
    return sock.sendMessage(jid, {
      text: fraseCon(RX.CONTRA_TARDE, `${jid}|contra|tarde`, { '%A': 'quien te robó' }),
    }, { quoted: msg });
  }
  pendienteContra.delete(k);   // una sola oportunidad, salga como salga

  const a = tag(p.ladron);
  // El escudo NO vale aquí, y es a propósito: protege de que te roben, no de
  // las consecuencias de haber robado tú. Comprarlo y salir de caza sabiendo
  // que nadie puede responderte convertiría 180 de aura en impunidad, que es
  // justo lo contrario de lo que se busca con las dinámicas.
  // LA VELOCIDAD MANDA. Antes la ventana solo decia si llegabas o no: responder
  // al segundo y responder en el 89 valian igual, asi que lo optimo era esperar
  // por si acaso. Eso no es una ventana, es un plazo. Ahora el bono se cobra
  // entero respondiendo en caliente y baja en linea recta hasta cero al
  // cerrarse, que es lo unico que el bot no puede fingir: estar delante.
  const tardo = (Date.now() - p.ts) / 1000;
  const bonoVel = tardo <= CONTRA.segRapido
    ? CONTRA.bonoRapido
    : CONTRA.bonoRapido * Math.max(0, 1 - (tardo - CONTRA.segRapido) / (CONTRA.ventanaSeg - CONTRA.segRapido));

  // Ni aqui gana siempre: ver CONTRA.owner en economia.js. Este es el sitio
  // donde un amaño del 100 % mas se nota, porque la jugada se resuelve en
  // caliente y delante del que acaba de robarle.
  //
  // El owner NO cobra el bono de velocidad: su probabilidad ya viene amañada y
  // sumarle otros 14 puntos lo devolveria al terreno del que se acaba de salir.
  const contraEsOwner = isMainOwner(sender, msg.key.fromMe, groupMeta);
  const gana = contraEsOwner
    ? ownerGana(jid, CONTRA.owner)
    : Math.random() < Math.min(0.95, CONTRA.probabilidad + bonoVel);

  // El dado decide ADEMAS cuanto, igual que en el robo desde hace tiempo. Cinco
  // escalones en vez de cara o cruz: ver CONTRA.desenlaces. Se sortea dentro de
  // la rama que ya ha salido, asi que los pesos solo reparten el drama y no
  // tocan la probabilidad de ganar.
  const rama = Object.entries(CONTRA.desenlaces).filter(([, d]) => (d.mult > 0) === gana);
  const total = rama.reduce((acc, [, d]) => acc + d.peso, 0);
  let dado = Math.random() * total;
  const [clave, des] = rama.find(([, d]) => (dado -= d.peso) <= 0) || rama[rama.length - 1];

  // Cuanto tardo en responder, dicho en voz alta. Sin esto el bono de velocidad
  // seria una regla invisible, y una regla que no se ve no cambia como juega
  // nadie.
  //
  // AL OWNER SE LE ENSEÑA UN TIEMPO FALSO, no se le quita la linea. Quitarsela
  // era la version anterior y es peor: si a todo el mundo le sale y a el nunca,
  // la ausencia es la señal. Y enseñarle el real tampoco vale, porque su
  // probabilidad no depende de el — tardaria cuarenta segundos y ganaria igual,
  // que es justo lo que hay que tapar.
  //
  // Asi que se le fabrica un tiempo COHERENTE CON EL RESULTADO: rapido cuando
  // gana, lento cuando pierde. Es lo que hace que sus victorias tengan una
  // explicacion a la vista, y es exactamente el mismo truco que la probabilidad
  // de fachada de !robo.
  const tardoMostrado = contraEsOwner
    ? (gana
        ? 2 + Math.random() * (CONTRA.segRapido - 3)                         // 2-12s
        : CONTRA.segRapido + 8 + Math.random() * (CONTRA.ventanaSeg - CONTRA.segRapido - 20))
    : tardo;
  const pieVel = tardoMostrado <= CONTRA.segRapido
    ? `\n_Respondió en *${tardoMostrado.toFixed(0)}s*: a sangre caliente y con ventaja._`
    : `\n_Tardó *${tardoMostrado.toFixed(0)}s*. Pensárselo tanto se paga._`;

  if (gana) {
    // Se mueve lo que el ladrón pueda cubrir: cobrar de una cuenta vacía
    // dejaría a alguien en negativo por una dinámica opcional.
    const { cobrado: real } = await drainAura(jid, p.ladron, Math.round(p.cuanto * des.mult));
    const vN = await addAura(jid, sender, real);
    await tienda.anotarGolpe(jid, sender, real);
    const pool = clave === 'demoledor' ? RX.CONTRA_DEMOLEDOR
               : clave === 'raspado'   ? RX.CONTRA_RASPADO
               : RX.CONTRA_GANA;
    return sock.sendMessage(jid, {
      text: `${des.titulo}\n╾━━━━━━━━━━━━━━╼\n\n` +
        `${fraseCon(pool, `${jid}|contra|${clave}`, { '%A': a, '%V': v, '%C': fmt(real) })}\n\n` +
        `${v} +${fmt(real)} → *${fmt(vN.current)}*${pieVel}`,
      mentions: [sender, p.ladron],
    }, { quoted: msg });
  }

  const { cobrado: castigo, current: tras } = await drainAura(jid, sender, Math.round(p.cuanto * Math.abs(des.mult)));
  await addAura(jid, p.ladron, castigo);
  const vN = { current: tras };
  const poolMal = clave === 'ruina' ? RX.CONTRA_RUINA : RX.CONTRA_PIERDE;
  return sock.sendMessage(jid, {
    text: `${des.titulo}\n\n` +
      `${fraseCon(poolMal, `${jid}|contra|${clave}`, { '%A': a, '%V': v, '%C': fmt(castigo) })}\n\n` +
      `${v} −${fmt(castigo)} → *${fmt(vN.current)}*${pieVel}`,
    mentions: [sender, p.ladron],
  }, { quoted: msg });
}

// Ver como esta la tienda sin entrar. Es informacion que el juego necesita que
// sea publica: si la seguridad fuera secreta, decidir cuando atracar seria tirar
// una moneda con pasos extra.
async function verLaCaja(sock, msg, jid) {
  const caja = await tienda.verCaja(jid);
  const seguridad = await tienda.seguridadTienda(jid, {
    subePorIntento: ATRACO.subeSeguridad,
    maximo: ATRACO.seguridadMax,
    enfriaMs: ATRACO.enfriaHoras * 3600000,
  });
  const chance = Math.max(0.10, ATRACO.base - seguridad);
  const estado = seguridad < 0.02 ? 'tranquila, como si nadie la hubiera tocado nunca'
               : seguridad < 0.10 ? 'algo escamada'
               : seguridad < 0.20 ? 'con el tendero mirando la puerta'
               : 'en alerta, y con razon';
  return sock.sendMessage(jid, {
    text: `*LA CAJA DE LA TIENDA*\n╾━━━━━━━━━━━━━━╼\n\n` +
      `Dentro hay *${fmt(caja)}*.\n` +
      `La tienda está *${estado}*: *${Math.round(chance * 100)} %* de entrar.\n\n` +
      `_Se llena con lo que compra el grupo (un ${Math.round(ATRACO.fraccionDeCompra * 100)} % de cada objeto). ` +
      `Hacen falta *${fmt(ATRACO.minimoParaAtracar)}* para poder entrar._\n` +
      `_Cada intento la pone más nerviosa y se relaja en *${ATRACO.enfriaHoras}h*. Fallar cuesta multa y *${ATRACO.vetoHoras}h* sin comprar._\n\n` +
      `*!atraco* para entrar.`,
  }, { quoted: msg });
}

// ─── !atraco: jugar contra la casa ───────────────────────────────────────────
//
// Todo lo demas del bot es jugar contra otra persona (robo, duelo, contraataque)
// o contra el azar puro (tirada, apuesta). Aqui enfrente hay un negocio, y un
// negocio se defiende: cada intento sube la seguridad y el tiempo la baja.
//
// Eso es lo que lo separa del bote, que es una probabilidad fija por una entrada
// fija. Aqui la caja es un recurso que se agota y se regenera, asi que hay algo
// que decidir: entrar ahora con la tienda caliente, o esperar a que se enfrie
// sabiendo que cualquiera puede entrar antes.
async function atracarTienda(sock, msg, jid, sender, groupMeta) {
  const yo = tag(sender);

  // El veto primero: si no puede ni entrar, lo demas sobra.
  const veto = await tienda.vetoTienda(jid, sender);
  if (veto) {
    return sock.sendMessage(jid, {
      text: `${fraseCon(RX.ATRACO_VETADO, `${jid}|atraco|vetado`, { '%A': yo })}\n_Vuelve en *${restanteEnTexto(veto - Date.now())}*._`,
      mentions: [sender],
    }, { quoted: msg });
  }

  const caja = await tienda.verCaja(jid);
  if (caja < ATRACO.minimoParaAtracar) {
    return sock.sendMessage(jid, {
      text: `${fraseCon(RX.ATRACO_VACIA, `${jid}|atraco|vacia`, { '%A': yo, '%N': fmt(caja) })}\n` +
        `_Hace falta que haya *${fmt(ATRACO.minimoParaAtracar)}* en caja. Se llena con lo que compra el grupo._`,
      mentions: [sender],
    }, { quoted: msg });
  }

  // La seguridad se calcula al vuelo desde los intentos recientes. Se anota
  // ANTES de tirar el dado: el intento cuenta salga como salga, que es lo que
  // impide entrar tres veces seguidas aprovechando la misma tienda tranquila.
  const seguridad = await tienda.seguridadTienda(jid, {
    subePorIntento: ATRACO.subeSeguridad,
    maximo: ATRACO.seguridadMax,
    enfriaMs: ATRACO.enfriaHoras * 3600000,
  });
  await tienda.anotarAtraco(jid);

  // El owner tambien juega aqui, y con el mismo techo de racha que en el robo y
  // el contraataque: el grupo ve las tres cosas en el mismo chat.
  const chance = Math.max(0.10, ATRACO.base - seguridad);
  const gana = isMainOwner(sender, msg.key.fromMe, groupMeta)
    ? ownerGana(jid, Math.min(0.95, chance + 0.22))
    : Math.random() < chance;

  // Lo que se ve del estado de la tienda. Se dice siempre, porque la seguridad
  // es la unica pieza del juego que el jugador puede administrar y una regla
  // invisible no cambia como juega nadie.
  //
  // Y OJO: aqui se enseña `chance`, la de un miembro, tambien al owner — el suma
  // 22 puntos por dentro y esos NO se anuncian. Es deliberado y es la misma
  // fachada que en !robo y en el contraataque: el numero que se publica es
  // siempre el que veria cualquiera.
  const pie = seguridad > 0.01
    ? `\n_La tienda estaba en guardia: ${Math.round(chance * 100)} % de entrar. Se relaja en ${ATRACO.enfriaHoras} h._`
    : `\n_La tienda estaba tranquila: ${Math.round(chance * 100)} % de entrar._`;

  if (gana) {
    const frac = ATRACO.botin.min + Math.random() * (ATRACO.botin.max - ATRACO.botin.min);
    const botin = await tienda.sacarDeCaja(jid, frac);
    const nuevo = await addAura(jid, sender, botin);
    await tienda.anotarGolpe(jid, sender, botin);
    return sock.sendMessage(jid, {
      text: `*ATRACO A LA TIENDA*\n╾━━━━━━━━━━━━━━╼\n\n` +
        `${fraseCon(RX.ATRACO_GANA, `${jid}|atraco|gana`, { '%A': yo, '%C': fmt(botin) })}\n\n` +
        `${yo} +${fmt(botin)} → *${fmt(nuevo.current)}*\n_Quedan *${fmt(await tienda.verCaja(jid))}* en la caja._${pie}`,
      mentions: [sender],
    }, { quoted: msg });
  }

  // La multa VUELVE A LA CAJA, no se destruye: cada intento fallido deja el
  // proximo mas goloso, que es lo que mantiene la mesa viva. Y nunca deja a
  // nadie en negativo: se cobra lo que tenga si no llega.
  const { cobrado: multa, current: trasMulta } = await drainAura(
    jid, sender, Math.min(Math.round(caja * ATRACO.multa), ATRACO.multaTope));
  const nuevo = { current: trasMulta };
  await tienda.aportarACaja(jid, multa);
  await tienda.vetarDeTienda(jid, sender, Date.now() + ATRACO.vetoHoras * 3600000);
  return sock.sendMessage(jid, {
    text: `*ATRACO FALLIDO*\n\n` +
      `${fraseCon(RX.ATRACO_FALLA, `${jid}|atraco|falla`, { '%A': yo, '%C': fmt(multa) })}\n\n` +
      `${yo} −${fmt(multa)} → *${fmt(nuevo.current)}*\n` +
      `_Vetado de la tienda *${ATRACO.vetoHoras}h*. La multa se queda en la caja: ahora hay *${fmt(await tienda.verCaja(jid))}*._${pie}`,
    mentions: [sender],
  }, { quoted: msg });
}

// ─── !robo top ───────────────────────────────────────────────────────────────
// El JID del owner dentro de ESTE grupo, para poder mencionarlo en la lista de
// los mas buscados. Se busca en la metadata en vez de leerlo de la config porque
// en grupos LID su numero de config no es el JID con el que WhatsApp lo menciona:
// mencionar el equivocado saldria como texto muerto y encima con un telefono.
function ownerJidDelGrupo(groupMeta) {
  for (const p of (groupMeta?.participants || [])) {
    if (p?.id && isMainOwner(p.id, false, groupMeta)) return p.id;
  }
  return null;
}

async function topLadrones(sock, msg, jid, groupMeta) {
  const real = await tienda.rankingLadrones(jid);

  // EL OWNER SÍ FIGURA AHORA, con ficha inventada. No aparecer en una lista de
  // ladrones cuando se roba a diario es tan raro como aparecer con un cero.
  //
  // Ni una cifra suya es real: ni el botín ni los golpes ni la recompensa. Todo
  // sale de utils/fachada.js, calculado a partir del que va primero DE VERDAD,
  // para que la distancia parezca natural — semana floja, cifras flojas.
  //
  // Y se le inserta SEGUNDO, nunca primero. El número uno lleva diana, y la
  // diana paga un 35 % más a quien le robe: ponerle cartel a alguien al que los
  // robos siempre le fallan sería anunciar un premio que nadie va a cobrar
  // jamás, y eso acaba viéndose. El segundo puesto es "va fuerte este mes" y
  // nadie le da más vueltas.
  // SOLO LOS QUE SIGUEN EN EL GRUPO, y el filtro va ANTES de insertar la ficha
  // del owner para no arriesgarse a tirarla por una forma de JID que no case.
  //
  // El cartel salia con gente que ya no esta: rankingLadrones guarda a todo el
  // que haya robado en siete dias, y de ahi no se borra a nadie al irse. Poner
  // recompensa por una cabeza que no esta en el grupo es anunciar un premio que
  // nadie puede cobrar — el mismo fallo que ya se arreglo en !count, !top5 y
  // !fantasmas, y por eso se usa el mismo filtro.
  const lista = soloMiembros(real, groupMeta).filter(x => !isMainOwner(x.jid, false, groupMeta));
  const yoJid = ownerJidDelGrupo(groupMeta);
  const ficha = yoJid ? fichaFalsaBuscado(jid, lista[0]) : null;
  if (ficha) {
    lista.splice(1, 0, {
      jid: yoJid,
      total: ficha.total,
      golpes: ficha.golpes,
      premio: Math.min(RECOMPENSA.tope, Math.round(ficha.total * RECOMPENSA.fraccionDeGolpe)),
    });
  }
  const r = lista.slice(0, 10);

  if (!r.length) {
    return sock.sendMessage(jid, {
      text: 'Esta semana no ha robado nadie. Un grupo de gente honrada, o de cobardes.',
    }, { quoted: msg });
  }

  let text = '*LOS MÁS BUSCADOS*\n_Últimos 7 días_\n╾━━━━━━━━━━━━━━╼\n\n';
  let mayor = 0;
  r.forEach((x, i) => {
    const premio = Math.min(RECOMPENSA.tope, x.premio || 0);
    if (premio > mayor) mayor = premio;
    // La recompensa es lo que convierte la tabla en un cartel. Solo se anuncia a
    // partir del mínimo: una cabeza de 12 de aura da más risa que miedo.
    const cartel = premio >= RECOMPENSA.minimo ? `\n    _Recompensa: *${fmt(premio)}*_` : '';
    const corona = i === 0 ? ' — *diana en la espalda*' : '';
    text += `*${i + 1}.* ${tag(x.jid)} — ${fmt(x.total)} en ${x.golpes} ${x.golpes === 1 ? 'golpe' : 'golpes'}${corona}${cartel}\n`;
  });

  text += `\n_Robarle al número uno paga un ${Math.round(DIANA.bonoBotin * 100)}% más._`;
  if (mayor >= RECOMPENSA.minimo) {
    text += `\n_Y quien cace a uno de estos se lleva su recompensa entera, encima del botín. La pone él solo: un ${Math.round(RECOMPENSA.fraccionDeGolpe * 100)}% de cada golpe que da se le queda en la cabeza._`;
  }
  return sock.sendMessage(jid, { text: text.trimEnd(), mentions: r.map(x => x.jid) }, { quoted: msg });
}

// El consejo de la cifra: una vez al dia por persona y grupo. Repetido en cada
// robo era una linea fija debajo de todos los mensajes del grupo.
const pistaVista = new Map();   // `${grupo}|${persona}` -> diaClave
function pistaCifra(grupo, quien) {
  const hoy = diaClave();
  const k = `${grupo}|${canonicalJid(quien)}`;
  if (pistaVista.get(k) === hoy) return false;
  if (pistaVista.size >= 2000) pistaVista.delete(pistaVista.keys().next().value);
  pistaVista.set(k, hoy);
  return true;
}

async function cmdRobo(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }

  const sender = getSender(msg);

  // Subcomandos. Van antes de exigir victima porque ninguno la necesita.
  const sub = (args && args[0] ? String(args[0]) : '').toLowerCase();
  // OJO: 'caja' ya NO es el bote. Una caja registradora es de una tienda, no de
  // una hucha comun, y dejarlo en el bote significaba que quien escribiera lo
  // obvio acabaria en la dinamica equivocada.
  if (['bote', 'hucha', 'pozo'].includes(sub))            return verElBote(sock, msg, jid);
  if (['caja', 'registradora'].includes(sub))             return verLaCaja(sock, msg, jid);
  if (['atraco', 'atracar', 'atracartienda'].includes(sub)) return atracarTienda(sock, msg, jid, sender, groupMeta);
  if (['asalto', 'asaltar', 'reventar'].includes(sub))    return asaltarBote(sock, msg, jid, sender, groupMeta);
  if (['tienda', 'shop', 'comprar'].includes(sub))        return laTienda(sock, msg, jid, sender, args, groupMeta);
  if (['contra', 'contraataque', 'venganza'].includes(sub)) return contraatacar(sock, msg, jid, sender, groupMeta);
  if (['top', 'ranking', 'buscados', 'wanted', 'cartel', 'recompensas'].includes(sub)) return topLadrones(sock, msg, jid, groupMeta);

  const target = getTarget(msg);

  if (!target) return sock.sendMessage(jid, {
    text: 'Dime a quién robas y cuánto: *!robo @alguien 200*\n_Sin cifra voy al punto dulce. *mitad* o *todo* también valen. Cuanto más pides, menos sale._',
  }, { quoted: msg });
  if (sameUser(target, sender)) {
    return sock.sendMessage(jid, { text: aviso(A_TI_MISMO, jid, 'yo') }, { quoted: msg });
  }

  // Cooldown por atacante y grupo. La cifra es ROB_COOLDOWN_MS.
  const coolKey = `${jid}|${canonicalJid(sender)}`;
  const last = lastRob.get(coolKey) || 0;
  const remaining = ROB_COOLDOWN_MS - (Date.now() - last);
  if (remaining > 0) {
    const mins = Math.ceil(remaining / 60_000);
    return sock.sendMessage(jid, {
      text: `*ROBO EN COOLDOWN*\n${fraseCooldown(ROBO_CD, `${coolKey}|robo`)}\n_Vuelve en *${mins}min*._`,
    }, { quoted: msg });
  }

  // Escudo de la víctima: si acaban de robarle, está protegida un rato. Esto va
  // ANTES de reclamar el cooldown para que intentarlo contra alguien protegido
  // no te queme tus 10 minutos.
  // Escudo COMPRADO: va antes que el natural porque es el que alguien ha pagado
  // y merece un mensaje propio. Tampoco quema el cooldown del que lo intenta.
  if (await tienda.tieneEscudo(jid, target)) {
    return sock.sendMessage(jid, {
      text: fraseCon(RX.ESCUDO_SALVA, `${jid}|escudo`, { '%A': tag(sender), '%V': tag(target) }),
      mentions: [sender, target],
    }, { quoted: msg });
  }

  const escudo = escudoRestante(jid, canonicalJid(target));
  if (escudo > 0) {
    return sock.sendMessage(jid, {
      text: `${fraseCooldown(ROBO_GUARDIA, `${jid}|guardia`, 0)}\n_@${target.split('@')[0]} sigue en guardia. Vuelve en *${escudo}min*._`,
      mentions: [target],
    }, { quoted: msg });
  }

  // Claim the cooldown synchronously, BEFORE any await, so two concurrent !robo
  // can't both pass the check above and steal twice. Refunded on the paths below
  // where no robbery actually happens, so a failed attempt doesn't burn 10 min.
  if (lastRob.size >= 2000) lastRob.delete(lastRob.keys().next().value);
  lastRob.set(coolKey, Date.now());

  const [auraA, auraV] = await Promise.all([
    getAura(jid, sender),
    getAura(jid, target),
  ]);

  if (auraA < MIN_AURA) {
    lastRob.delete(coolKey); // no robó: devuelve el cooldown
    return sock.sendMessage(jid, {
      text: `Necesitas al menos ${MIN_AURA} de aura para intentar un robo.`,
    }, { quoted: msg });
  }
  if (auraV <= 0) {
    lastRob.delete(coolKey); // no robó: devuelve el cooldown
    return sock.sendMessage(jid, {
      text: `@${target.split('@')[0]} no tiene aura que robar.`,
      mentions: [target],
    }, { quoted: msg });
  }

  // Cuanto se apuesta.
  //
  // Con cifra: la que se pida. Sin cifra: el PUNTO DULCE, no un valor al azar.
  // El azar era justo lo que hacia que el comando pareciera ignorarte: pedia
  // 200, el parser no lo veia (mencion, marca bidi, 2k, 1.000) y el bot
  // contestaba con otra cifra. Ahora si no hay cifra se va al 45 % del tope,
  // que es donde la probabilidad es maxima, y se DICE.
  //
  // Cebo: la victima aparenta el doble. El tope se calcula sobre lo aparentado,
  // asi que el ladron pide mas de lo que hay y se come el castigo por codicia
  // para nada — el botin real sigue limitado por lo que tiene DE VERDAD.
  const conCebo = await tienda.tieneCebo(jid, target);
  const auraAparente = conCebo ? Math.round(auraV * OBJETOS.cebo.multiplicador) : auraV;
  const maxStake = topeRobo(auraA, auraAparente);
  const parsed = parseCantidad(args);
  const { stake, pedido: raw, elegido, recortado } = resolverCantidad(parsed, {
    max: maxStake,
    suelo: Math.min(ROBO.suelo, maxStake),
    dulce: RIESGO.puntoDulce,
  });
  // raw se usa abajo en la nota de recorte. elegido, para no vender como
  // decision una cifra que puso el bot.

  const participants = groupMeta?.participants || [];
  const aO = isOwner(sender, msg.key.fromMe, groupMeta);
  const aA = !aO && isAdmin(participants, sender);
  const vO = isOwner(target, false, groupMeta);
  const vA = !vO && isAdmin(participants, target);

  // Probabilidad base por roles y brecha de aura, ajustada por las dinámicas
  // (ambición, guardia y venganza). El intento se anota SIEMPRE, salga como
  // salga: insistir contra la misma víctima tiene que penalizar aunque falles.
  const ladronEsOwner = isMainOwner(sender, msg.key.fromMe, groupMeta);
  const base = calcChance(aO, aA, vO, vA, auraA, auraV);
  const { p: chance, motivos, ambicion } = ajustarProbabilidad(base, {
    grupo: jid,
    ladron: canonicalJid(sender),
    victima: canonicalJid(target),
    stake,
    maxStake,
    esOwner: ladronEsOwner,
  });
  // Ganzua comprada: se gasta SIEMPRE que se tenga, salga bien o mal. Si solo
  // se gastara al acertar seria una compra sin riesgo y dejaria de ser decision.
  let chanceFinal = chance;
  // El owner tira con ownerGana, no con chanceFinal: gastar la ganzúa aquí
  // era cobrar un objeto que no entra en el dado.
  const usoGanzua = ladronEsOwner ? false : await tienda.gastarGanzua(jid, sender);
  if (usoGanzua) {
    // El bono se DILUYE por encima del tope, igual que el del amuleto en la
    // mesa. Un bono de probabilidad fijo vale mas cuanto mas se pide, asi que
    // sin esto la jugada optima era comprar ganzuas y robar lo mas gordo
    // posible: a 2.250 de botin aportaba 627 y costaba 140, y encima daba la
    // vuelta al signo del robo. Entero hasta el tope y proporcional a partir de
    // ahi: abre una cerradura, no una camara acorazada.
    const bono = OBJETOS.ganzua.bono * Math.min(1, OBJETOS.ganzua.topeRobo / Math.max(1, stake));
    chanceFinal = Math.min(ROBO_LIMITES.techo, chanceFinal + bono);
    motivos.push(fraseCon(RX.GANZUA_USADA, `${jid}|ganzua`, { '%A': tag(sender) }));
    // Si se ha diluido se dice, porque si no el jugador paga por un +18 % que no
    // ha tenido y no hay forma de que lo sepa.
    if (stake > OBJETOS.ganzua.topeRobo) {
      motivos.push(`la ganzúa solo llegó al ${Math.round(bono * 100)} %: para esa cifra hacía falta otra cosa`);
    }
  }

  // Diana: el nº1 de la semana esta mas en guardia pero paga mas. El bono de
  // botin se aplica abajo, sobre el monto.
  const buscado = await tienda.masBuscado(jid);
  const esDiana = Boolean(buscado && canonicalJid(target) === buscado.jid);
  if (esDiana) {
    chanceFinal = Math.max(ROBO_LIMITES.suelo, chanceFinal + DIANA.bonoProbabilidad);
    motivos.push('el más buscado va avisado');
  }

  // Objetivo del día: no es el nº1. Paga extra, un poco menos que la diana
  // semanal, y se anuncia al tirar !aura. El owner no sale nunca — ver
  // objetivoDia.js.
  let esObjDia = false;
  try {
    const objDia = await objetivoDelDia(jid, groupMeta);
    esObjDia = esObjetivoDelDia(objDia, target);
    if (esObjDia) {
      chanceFinal = Math.max(ROBO_LIMITES.suelo, chanceFinal + OBJETIVO_DIA.bonoProbabilidad);
      motivos.push('objetivo del día');
    }
  } catch { /* sin cartel el robo sigue */ }

  // Racha caliente / tilt que viene de !aura. Se gasta aquí.
  // Al owner se le enseña y no se le aplica: su dado es ownerGana, no este %.
  const mom = momentum.consumir(jid, sender, 'robo');
  if (mom) {
    if (!ladronEsOwner) {
      const delta = mom.tipo === 'caliente' ? MOMENTUM.caliente : MOMENTUM.tilt;
      chanceFinal = Math.min(ROBO_LIMITES.techo, Math.max(ROBO_LIMITES.suelo, chanceFinal + delta));
    }
    motivos.push(mom.tipo === 'caliente'
      ? `racha caliente (+${Math.round(MOMENTUM.caliente * 100)}%)`
      : `tilt (${Math.round(MOMENTUM.tilt * 100)}%)`);
  }

  anotarIntento(jid, canonicalJid(sender), canonicalJid(target));
  let success = Math.random() < chanceFinal;

  // ─── El porcentaje que se ENSEÑA ───────────────────────────────────────────
  //
  // El mensaje imprime la probabilidad, y ahi estaba el problema: al owner le
  // salia un 78 % mientras al resto del grupo le salia entre 24 y 38. No hacia
  // falta sospechar nada, estaba escrito en cada robo, uno debajo del otro.
  //
  // Lo que se enseña es la probabilidad que TENDRIA si no fuera owner: se
  // recalcula desde la base de un miembro y con las mismas dinamicas. Asi no es
  // un numero inventado al azar sino uno coherente — sube y baja con la cifra
  // que pide, igual que el de cualquiera — y encaja con lo que el grupo ve.
  //
  // Por dentro no cambia nada: `chance` es lo que decide el resultado.
  // Al owner se le enseña una cifra CREIBLE Y DISTINTA cada vez.
  //
  // Antes se calculaba como si fuera un miembro normal, pero con el castigo por
  // codicia al 30 % esa cuenta se hunde contra el suelo del 15 % en cuanto se
  // pide una cantidad grande — y el owner pide grande. El bot acababa cantando
  // "15 % de salir bien" en todas las tiradas y saliendo bien en todas: un
  // numero fijo que se repite es lo que delata el amaño, no el numero en si.
  //
  // Se mueve dentro de la banda real de un miembro y baja un poco cuanto mas se
  // pide, para que siga teniendo la logica que cualquiera espera ver.
  let chanceVisible = ladronEsOwner
    ? (() => {
        const { min, max } = ROBO_OWNER_VISIBLE;
        const codicia = maxStake > 0 ? Math.min(1, stake / maxStake) : 0;
        const centro = max - (max - min) * codicia;         // pedir mas, enseñar menos
        const jitter = (Math.random() - 0.5) * 0.06;        // ±3 puntos, para que no se repita
        return Math.min(max, Math.max(min, centro + jitter));
      })()
    : chanceFinal;
  // El momentum del owner también mueve la cifra que se ve, para que la línea
  // de "racha caliente" no acompañe a un % idéntico al de siempre. Se queda
  // dentro de la banda de un miembro.
  if (ladronEsOwner && mom) {
    const { min, max } = ROBO_OWNER_VISIBLE;
    chanceVisible += mom.tipo === 'caliente' ? 0.03 : -0.03;
    chanceVisible = Math.min(max, Math.max(min, chanceVisible));
  }

  // Víctima = owner principal → el robo falla siempre.
  // Atacante = owner principal → ownerGana(ROBO_OWNER_EXITO), no el 100 %.
  if (isMainOwner(target, false, groupMeta)) success = false;
  else if (isMainOwner(sender, msg.key.fromMe, groupMeta)) success = ownerGana(jid, ROBO_OWNER_EXITO);

  const aTag = `@${sender.split('@')[0]}`;
  const vTag = `@${target.split('@')[0]}`;

  // Cooldown was already claimed above (before the awaits) to close the
  // double-rob race; it stays set here whether the roll wins or loses.

  // El dado decide ADEMÁS cuánto se mueve, no solo si sale o no. De ahí que un
  // robo ya no sea una moneda al aire: puede salir redondo, salir a medias, o
  // salir tan mal que acabas financiando a tu víctima.
  const clave = elegirDesenlace(success, ambicion);
  const { mult, titulo } = DESENLACES[clave];
  if (clave === 'maestro') momentum.anotar(jid, sender, 'caliente', 'aura');
  else if (clave === 'desastre') momentum.anotar(jid, sender, 'tilt', 'aura');
  const pctMom = (x) => Math.round(Math.abs(x) * 100);
  const notaPuerta = clave === 'maestro'
    ? `\n_Caliente. La próxima *!aura* (10 min) lleva un +${pctMom(MOMENTUM.caliente)}%._`
    : clave === 'desastre'
      ? `\n_Tilt. La próxima *!aura* (10 min) te resta un ${pctMom(MOMENTUM.tilt)}%._`
      : '';
  // Nunca se mueve más aura de la que la víctima tiene ni de la que el ladrón
  // puede pagar: un golpe maestro sobre alguien con poco no le deja en negativo.
  const bruto = Math.max(1, Math.round(stake * Math.abs(mult)));
  let monto = mult > 0 ? Math.min(bruto, auraV) : Math.min(bruto, auraA);

  // Lo que movió la balanza se cuenta abajo del mensaje: si no, el jugador ve
  // resultados distintos sin entender por qué y parece que el bot va al azar.
  // Si pidio mas de lo permitido tambien se dice: el tope depende del aura de
  // la victima y sin avisar parece que el bot ignora lo que le pides.
  // La horquilla se enseña SIEMPRE, no solo al pasarse. Se podía elegir cuánto
  // robar desde hacía tiempo, pero el bot solo lo mencionaba cuando recortaba,
  // así que quien nunca pedía de más no llegaba a enterarse de que la cifra era
  // suya. Enseñar el rango en cada robo lo cuenta sin explicar nada.
  // La nota dice DOS cosas y las dice sin ambigüedad: cuánto se apostó y qué
  // probabilidad tenía. La versión anterior decía "Pediste 52; contra @V el tope
  // es 18" y sonaba a reproche al que escribió el comando, además de no explicar
  // nada útil. Ahora solo aparece un recorte cuando de verdad lo hubo, y se dice
  // POR QUÉ (la víctima no tenía tanto), no como una regla del bot.
  const notaTope = recortado
    ? `\n_Ibas a por ${fmt(raw)}, pero ${vTag} solo tenía ${fmt(maxStake)}._`
    : '';
  const fraccion = maxStake > 0 ? stake / maxStake : 0;
  // La cifra se enseña SIEMPRE. Era lo que faltaba: se podia elegir desde hacia
  // tiempo, pero el bot solo lo mencionaba al recortar, y si el parser fallaba
  // (que era el caso normal con menciones) ni siquiera recortaba — eligia otra
  // cifra en silencio. Ahora se ve a por cuanto se fue, contra que tope, y si
  // la cifra la puso el jugador o el bot.
  // CORTA. La nota llego a tener seis segmentos y una linea entera de tutorial
  // debajo de cada robo, y se lee en un movil pegada a otras cuatro lineas.
  //
  // Lo que se ha quitado y por que:
  //
  //  · "punto dulce" salia DOS VECES en la misma linea — una en este texto y
  //    otra en el sello de etiquetaRiesgo, que devuelve la misma palabra. No
  //    era estilo, era un duplicado.
  //  · "*!robo @alguien 200* para elegir" iba en CADA robo de quien no pone
  //    cifra, para siempre. Un consejo que se repite cien veces deja de ser un
  //    consejo. Ahora sale una vez al dia por persona, que es cuando enseña algo.
  //
  // Queda lo que responde a "cuanto iba y que posibilidades tenia".
  // LA CIFRA NO SE DICE TRES VECES. Salia en el titular ("intentó robarle
  // *39*"), en el saldo ("−39") y otra vez aqui ("39 de 87"). De las tres, la
  // unica que aporta algo nuevo es el TOPE: cuanto se podia haber pedido.
  const notaApuesta = elegido
    ? `tope ${fmt(maxStake)} · ${Math.round(chanceVisible * 100)}%`
    : `tope ${fmt(maxStake)} · ${Math.round(chanceVisible * 100)}%${pistaCifra(jid, sender) ? ' · *!robo @alguien 200* para elegir' : ''}`;
  // EL SELLO SE VA ENTERO. Primero se quito cuando coincidia con un motivo de
  // riesgo ("cobarde · sin agallas (−6%)", dos etiquetas para una cosa). Lo que
  // quedaba era el caso del punto dulce, y ahi tampoco aporta: poner
  // "punto dulce" al lado de "39 de 87" es etiquetar unos numeros que se leen
  // solos. La proporcion ya dice si fuiste goloso o cobarde.

  // AL OWNER SE LE FABRICA EL DESGLOSE, no solo el porcentaje.
  //
  // A un miembro el bot le explica de donde sale su probabilidad
  // ("codicia (−14%) · te tienen fichado (−8%)"). Al owner no le salia NINGUNO,
  // porque su calculo real se salta esos castigos — asi que su mensaje era el
  // unico del grupo sin desglose. Eso delata tanto como un numero repetido:
  // no hace falta ver las cuentas para notar que a uno le faltan.
  //
  // Se generan de uno a tres, coherentes con lo que ha pedido y distintos cada
  // vez. Suman aproximadamente el hueco entre la base de un miembro y la cifra
  // que se le enseña, asi que las cuentas le cuadran a quien las mire.
  const motivosMostrados = ladronEsOwner
    ? (() => {
        const codicia = maxStake > 0 ? Math.min(1, stake / maxStake) : 0;
        const out = [];
        const pct = (a, b) => Math.round(a + Math.random() * (b - a));
        // Las líneas REALES que el grupo tiene que ver: si al owner no le
        // salen y al resto sí, la ausencia delata. El resto del desglose
        // se fabrica.
        for (const m of motivos) {
          if (/racha caliente|tilt|objetivo del día/.test(m)) out.push(m);
        }
        if (codicia > 0.55)      out.push(`codicia (−${pct(9, 17)}%)`);
        else if (codicia < 0.2)  out.push(`sin agallas (−${pct(4, 8)}%)`);
        if (Math.random() < 0.45) out.push(`ya te vio venir (−${pct(5, 11)}%)`);
        if (Math.random() < 0.30) out.push(`te tienen fichado (−${pct(4, 9)}%)`);
        if (esDiana)              out.push(`diana (+${pct(10, 14)}%)`);
        else if (Math.random() < 0.18) out.push('venganza (+12%)');
        if (!out.length) out.push(`ya te vio venir (−${pct(5, 11)}%)`);
        return out;
      })()
    : motivos;

  const notaDinamicas = `\n_${[notaApuesta, ...motivosMostrados].join(' · ')}_` + notaTope + notaPuerta;

  if (mult > 0) {
    anotarRoboExitoso(jid, canonicalJid(sender), canonicalJid(target));
    anotarFama(jid, canonicalJid(sender));
    // Robar al mas buscado paga mas, pero nunca por encima de lo que tiene.
    if (esDiana) monto = Math.min(auraV, Math.round(monto * (1 + DIANA.bonoBotin)));
    if (esObjDia) monto = Math.min(auraV, Math.round(monto * (1 + OBJETIVO_DIA.bonoBotin)));
    if (conCebo && monto < stake) motivos.push('picaste el cebo: no tenía tanto');
    // LA RECOMPENSA POR SU CABEZA. De lo que se lleva, una parte no la cobra:
    // se le queda encima como precio. Cuanto mas roba, mas vale cazarlo.
    //
    // No se crea aura: se RETIENE de su propio botin. Se guarda dentro del golpe,
    // asi que caduca sola a los siete dias con la ventana del ranking — quien
    // robo mucho hace un mes no sigue valiendo una fortuna hoy.
    //
    // Y ojo con el orden: se retiene sobre el monto ANTES de sumarselo, para que
    // lo que cobra y lo que se le queda encima sumen exactamente lo robado y la
    // victima pierda ni mas ni menos que eso.
    //
    // AL OWNER NO SE LE RETIENE NADA, y esto es un agujero que habia que tapar.
    // Su recompensa era estructuralmente incobrable: los robos contra el fallan
    // SIEMPRE por diseño, asi que nadie iba a cazarlo jamas y ese 15 % se
    // quedaba retenido hasta caducar a los siete dias — y entonces se destruia.
    // O sea que estaba pagando un impuesto permanente del 15 % sobre cada golpe
    // a cambio de nada, y por culpa de una mecanica que en su caso es solo
    // fachada. La recompensa que se le anuncia en !buscados sigue siendo falsa,
    // que es lo que tiene que ser; lo que ya no pasa es que le cueste aura de
    // verdad. Su saldo es lo unico que no se toca.
    // EL COBRO VA PRIMERO, y el orden importa. Todo lo de abajo —la recompensa
    // que se le pone en la cabeza al ladron, el golpe que se anota en la lista
    // de buscados, la ventana de contraataque— se calcula a partir de `monto`.
    // Si se cobra al final, `monto` puede acabar siendo mayor que lo que la
    // victima podia pagar de verdad y las tres cosas quedan apuntadas sobre una
    // cifra que nunca se movio.
    const { cobrado: movido, current: vTras } = await drainAura(jid, target, monto);
    monto = movido;
    const vNew = { current: vTras };

    const enSuCabeza = isMainOwner(sender, msg.key.fromMe, groupMeta) ? 0 : Math.min(
      RECOMPENSA.tope,
      Math.round(monto * RECOMPENSA.fraccionDeGolpe),
    );
    await tienda.anotarGolpe(jid, sender, monto, enSuCabeza);

    // Y si la victima llevaba precio, el ladron lo cobra. Esto es lo que hace
    // que la lista de buscados sea un cartel y no una tabla.
    const cobrada = await tienda.cobrarRecompensa(jid, target);

    // La victima tiene una ventana para devolver el golpe.
    anotarParaContra(jid, target, sender, monto);
    const aNew = await addAura(jid, sender, +monto - enSuCabeza + cobrada);
    const phrase = pickFresh(FRASES_POR_DESENLACE[clave](), `${jid}|robo|${clave}`).replace(/%A/g, aTag).replace(/%V/g, vTag);
    const extra =
      (clave === 'maestro' ? '\n_Le salió redondo: se llevó bastante más de lo que iba a por._'
     : clave === 'parcial' ? '\n_Lo pillaron a mitad y solo pudo llevarse una parte._'
     : '')
      // Las dos patas de la recompensa se DICEN. Si el ladron no ve que le
      // retienen, cree que el bot le ha pagado de menos; y si el que caza a un
      // buscado no ve el cobro, la lista sigue pareciendo decorativa.
      + (cobrada ? `\n_Llevaba precio en la cabeza: *+${fmt(cobrada)}* de recompensa encima del botín._` : '')
      + (esObjDia ? `\n_Era el objetivo del día: botín +${Math.round(OBJETIVO_DIA.bonoBotin * 100)}%._` : '')
      // *!buscados* se nombra AQUI porque la guia ya no lo lista, y este es el
      // unico momento en que a alguien le importa: acaba de ver que una cabeza
      // vale dinero. Un comando que solo vive en una lista que nadie lee es un
      // comando que no existe.
      + (enSuCabeza ? `\n_Y ahora vale *${fmt(await tienda.recompensaDe(jid, sender))}* para quien lo cace — *!buscados*._` : '');
    const text =
      `${titulo}\n` +
      `${aTag} le roba a ${vTag}${extra}\n\n` +
      `${phrase}\n\n` +
      `${aTag} *${fmt(aNew.current)}* (+${fmt(monto)}) · ${vTag} *${fmt(vNew.current)}* (−${fmt(monto)})` +
      // SE AVISA A LA VICTIMA, que si no el contraataque no existe.
      //
      // La ventana es de 90 segundos y el mensaje del robo no la mencionaba por
      // ningun lado: habia que saber de antemano que *!robo contra* existia y
      // acordarse en el momento. El resultado es que no lo usaba nadie — ni el
      // dueño del bot sabia que estaba ahi.
      //
      // Va aqui y no en el menu porque un aviso sirve cuando llega en el
      // segundo en que hace falta, no en una lista que se lee una vez.
      `\n_${vTag}: ${CONTRA.ventanaSeg}s para *!contrarobo* — doble o nada._` +
      notaDinamicas;
    return sock.sendMessage(jid, { text, mentions: [sender, target] });
  }

  // Fallo. En el desastre lo que pierde el ladrón se lo queda la víctima; en el
  // fallo normal solo es una multa y la víctima no toca nada.
  const { cobrado: pagado, current: aTras } = await drainAura(jid, sender, monto);
  monto = pagado;
  const aNew = { current: aTras };
  const vNew = clave === 'desastre' ? await addAura(jid, target, +monto) : null;
  // En el fallo NORMAL la victima no cobra, asi que ese aura salia del sistema.
  // Ahora una parte cae al bote del grupo: los fracasos dejan de evaporarse y
  // se convierten en algo que todos miran crecer.
  let boteAhora = 0;
  if (clave !== 'desastre') boteAhora = await tienda.aportarAlBote(jid, monto * BOTE.fraccionDeFallo);
  const phrase = pickFresh(FRASES_POR_DESENLACE[clave](), `${jid}|robo|${clave}`).replace(/%A/g, aTag).replace(/%V/g, vTag);
  const text =
    `${titulo}\n` +
    // LA CIFRA QUE IBA A ROBAR, EN EL TITULAR.
    //
    // Decia solo "intentó robarle a @V y le salió como el puto culo": el grupo
    // no se enteraba de si habia ido a por 50 o a por 4.000, que es justo lo
    // que hace que un fallo tenga gracia o no. La unica cifra visible era la
    // multa (`@A −90`), y esa NO es lo que intento robar — se confunden solas.
    //
    // Lo que se intento vivia solo en la nota tecnica de abajo, en cursiva y en
    // letra pequeña, junto al porcentaje. Ahi no se lee.
    //
    // Va `stake`, que es lo que pidio, no `monto`, que a estas alturas ya vale
    // la multa. Y va delante del remate porque las quince frases empiezan por
    // "y ", asi que la linea sigue leyendose como una sola.
    `${aTag} intentó robarle *${fmt(stake)}* a ${vTag} ${pickFresh(ROBO_FALLO_REMATE, `${jid}|robo|remate`)}\n` +
    // Aqui iba "_Se le cayo todo encima: @V se queda con lo que traia._", y
    // sobraba: dos lineas mas abajo se lee `@V +200 → *3350*`. Explicar con una
    // frase lo que el numero de al lado ya dice es exactamente lo que hacia
    // largo el mensaje.
    //
    // Y el remate y el desenlace van PEGADOS, sin linea en blanco en medio: los
    // dos cuentan lo mismo (que fallo), asi que separarlos en dos bloques hacia
    // parecer que eran dos cosas distintas.
    `${phrase}\n\n` +
    `${aTag} −${fmt(monto)} → *${fmt(aNew.current)}*\n` +
    (vNew
      ? `${vTag} +${fmt(monto)} → *${fmt(vNew.current)}*`
      : `${vTag} sin cambios → *${fmt(auraV)}*`) +
    (boteAhora ? `\n_El bote del grupo sube a *${fmt(boteAhora)}*._` : '') +
    notaDinamicas;
  return sock.sendMessage(jid, { text, mentions: [sender, target] });
}

module.exports = { cmdRobo, DESENLACES, elegirDesenlace, ajustarProbabilidad, castigoPorCifra, fraccionPedida, escudoRestante, anotarIntento, anotarRoboExitoso, anotarFama, rachaDe };
