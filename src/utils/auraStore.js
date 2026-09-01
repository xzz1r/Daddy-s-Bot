const path = require('path');
const { canonicalJid } = require('./wa');
const { readJsonOrEnoent, createDebouncedSaver } = require('./helpers');
const logger = require('./logger');

const AURA_FILE = path.join(__dirname, '../../data/aura.json');

// Everyone starts here. Aura then accumulates (or bleeds) over time.
//
// ESCALA: la referencia es utils/economia.js, y NO se repite aquí ninguna de
// sus cifras. Este comentario decía "un millonario ronda los 5.000, el arranque
// son 100, o sea un 2 %" y las tres cifras se quedaron viejas a la vez en
// cuanto se reequilibró la economía. Un comentario con números de otro fichero
// es una copia que nadie actualiza.
const { ARRANQUE: STARTING_AURA, SUELO_TODOS, CAJA } = require('./economia');

// Escalas anteriores, necesarias para reescalar lo que ya está guardado.
// Cada entrada es el salto DESDE esa versión a la siguiente.
//   v1 -> v2: arranque 1000 y bonos de 20k-150k. Bastaban unos días activos
//             para llegar a siete dígitos, donde ganar o perder daba igual.
//   v2 -> v3: el millonario baja a la mitad y los bonos se recortan a una
//             vigésima parte, para que las dinámicas (!robo, !aura) dejen de
//             estar eclipsadas por el bono diario de escribir.
//
// `arranque` es el arranque de la escala DE ORIGEN. El de destino se saca de la
// escala siguiente (ver migrarEscala), no de STARTING_AURA: el reequilibrio
// subió el arranque de 100 a 250 y eso desalineó la cadena, porque hasta
// entonces ESCALAS[2].arranque y STARTING_AURA valían lo mismo por casualidad.
//
// Subir la escala actual (redenominar) NO es lo mismo que cambiar cuánto se
// gana. El reequilibrio de los ingresos no añadió una escala 4 a propósito: los
// saldos guardados siguen valiendo lo que valían, lo único que cambió es el
// ritmo al que entran. Solo hace falta una escala nueva cuando los importes se
// dividen o multiplican y hay que arrastrar lo ya guardado con ellos.
const ESCALAS = {
  1: { arranque: 1000, factor: 200 },
  2: { arranque: 100,  factor: 2 },
};
// Marca de migración. Vive dentro del propio store para que no haga falta un
// archivo aparte ni un paso manual en la VPS.
const CLAVE_ESCALA = '__escala';
const ESCALA_ACTUAL = 3;

let store = null;          // { [groupJid]: { [bareJid]: number } }
let loadPromise = null;
const saver = createDebouncedSaver(
  () => store,
  AURA_FILE,
  8000,
  (e) => logger.error(`auraStore: fallo al guardar: ${e.message}`),
);

// Per-(group,user) write queue: serializes concurrent addAura / transferAura
// calls so two simultaneous !dar / casino / !aura commands don't clobber each
// other. Node.js is single-threaded but async — two callers can both read
// `previous` before either has written back, causing deltas to be lost.
const writeQueue = new Map();

function serialized(key, fn) {
  const prev = writeQueue.get(key) ?? Promise.resolve();
  const next = prev.then(fn);
  // Don't let a failed fn poison the queue for future writes on this key.
  const tracked = next.catch(() => {});
  writeQueue.set(key, tracked);
  // Prune the key once this settles, UNLESS something newer was already chained
  // behind it. Without this, the map keeps one entry per (group,user) forever —
  // a slow but real memory leak across cumulative unique participants on a 24/7
  // process. The read-modify-write inside fn is synchronous, so removing a
  // settled tail can't drop a pending update.
  tracked.finally(() => {
    if (writeQueue.get(key) === tracked) writeQueue.delete(key);
  });
  return next;
}

// Reescala los saldos guardados hasta la escala actual, UNA sola vez y
// encadenando todos los saltos que falten.
//
// No es una división a secas: se conserva la distancia al arranque, así que
// quien nunca jugó (estaba justo en el arranque viejo) queda justo en el nuevo
// en vez de aparecer con un saldo raro. El orden del ranking no cambia.
//
//   nuevo = ARRANQUE_DE_DESTINO + (viejo - ARRANQUE_DE_ORIGEN) / FACTOR
//
// Un saldo de la escala 1 pasa por los dos saltos seguidos, así que una cuenta
// que nunca se migró llega igual de bien que una que ya iba por la 2.
//
// OJO CON EL DESTINO DE CADA SALTO. Aquí ponía STARTING_AURA en los dos, y
// funcionaba solo porque el arranque de la escala 2 y el actual valían los dos
// 100. Al subir el arranque a 250 la cadena empezó a mentir: el primer salto
// dejaba el saldo centrado en 250 y el segundo le restaba 100, así que quien
// nunca jugó (1.000 en la escala 1, o sea el arranque exacto) acababa en 325 en
// vez de en 250 — 75 de aura de la nada, y a todo el mundo por igual.
//
// Solo afecta a un store que siga en la escala 1 (el que ya está en la 3 sale
// por el return de arriba sin tocar nada), pero es una mina: basta con que
// alguien restaure una copia vieja para que reparta ese regalo.
function migrarEscala() {
  if (!store) return;
  const desde = store[CLAVE_ESCALA] || 1;
  if (desde >= ESCALA_ACTUAL) return;

  let tocados = 0;
  for (const grupo in store) {
    if (grupo === CLAVE_ESCALA || grupo === CLAVE_CAJA || grupo === CLAVE_CAJA_TS) continue;
    const g = store[grupo];
    if (!g || typeof g !== 'object') continue;
    for (const k in g) {
      if (typeof g[k] !== 'number') continue;
      let v = g[k];
      for (let paso = desde; paso < ESCALA_ACTUAL; paso++) {
        const esc = ESCALAS[paso];
        if (!esc) continue;
        // El destino de este salto es el arranque de la escala a la que llega:
        // el de la siguiente entrada, o el actual si ya es el último salto.
        const destino = ESCALAS[paso + 1] ? ESCALAS[paso + 1].arranque : STARTING_AURA;
        v = destino + Math.round((v - esc.arranque) / esc.factor);
      }
      g[k] = v;
      tocados++;
    }
  }
  store[CLAVE_ESCALA] = ESCALA_ACTUAL;
  if (tocados) logger.info(`auraStore: ${tocados} saldos reescalados (escala ${desde} -> ${ESCALA_ACTUAL}).`);
  scheduleSave();
}

// Sube de una vez a todo el que esté por debajo del suelo.
//
// EXISTE PORQUE SUBIR EL ARRANQUE NO BASTA. El arranque solo se aplica a quien
// no tiene saldo guardado, así que subirlo habría dejado exactamente igual a la
// gente que ya estaba en rojo — que era el problema que se venía a resolver.
//
// Es un SUELO, no un reparto: a quien ya está por encima no se le toca ni un
// punto, así que el ranking no se altera salvo en la cola, donde todos los que
// estaban por debajo quedan empatados en el suelo.
//
// La marca es propia y va por número, no por booleano: si algún día se vuelve a
// subir el suelo, basta con incrementar SUELO_VERSION para que la operación se
// repita una vez más y solo una.
const CLAVE_SUELO = '__suelo';

// LA CAJA VIVE AQUI DENTRO, no en un fichero aparte, y es a proposito: mover
// aura entre el saldo y la caja tiene que ser UNA sola escritura. Con dos
// ficheros, un corte entre la una y la otra deja aura duplicada o evaporada, y
// en esta economia eso es lo unico que no se puede permitir.
//
// Va como clave de primer nivel, igual que __escala y __suelo. Las claves de
// ese nivel son JID de grupo, asi que un nombre con dos barras bajas no puede
// chocar con ninguno. Aun asi las dos migraciones lo saltan explicitamente: que
// hoy se salve por el `typeof !== 'number'` de mas abajo es suerte, no diseño.
const CLAVE_CAJA = '__caja';
// Ultimo cierre por persona, para el enfriamiento. Se guarda con la caja
// porque es parte de la misma decision.
const CLAVE_CAJA_TS = '__cajats';
const SUELO_VERSION = 1;

// LA CAJA NACIO CON OTRO NOMBRE Y HAY GRUPOS CON AURA GUARDADA DEBAJO.
//
// El nombre viejo se fue del bot entero, pero en aura.json es TEXTO: un fichero
// escrito ayer sigue teniendo las dos claves antiguas, y arrancar sin mirarlas
// habria dejado esa aura fuera del saldo, fuera de la caja y fuera del ranking
// —ni robada ni gastada: desaparecida— sin un solo error en el log.
//
// Se mueve una vez, al cargar, y solo si no hay ya algo en la clave nueva. Las
// dos entradas viejas se borran ahi mismo, asi que la migracion no se repite y
// el nombre no vuelve a aparecer en el fichero.
const CLAVES_VIEJAS = [['__zulo', CLAVE_CAJA], ['__zulots', CLAVE_CAJA_TS]];

function migrarNombreCaja() {
  if (!store) return;
  let movidos = 0, habia = false;
  for (const [vieja, nueva] of CLAVES_VIEJAS) {
    if (!(vieja in store)) continue;
    habia = true;
    const dentro = store[vieja];
    delete store[vieja];
    if (!dentro || typeof dentro !== 'object') continue;
    if (!store[nueva]) store[nueva] = {};
    for (const grupo in dentro) {
      // Si las dos existen —restaurar una copia vieja encima de una nueva— se
      // queda la nueva: es la que el bot ha estado escribiendo.
      if (store[nueva][grupo] === undefined) { store[nueva][grupo] = dentro[grupo]; movidos++; }
    }
  }
  // SE GUARDA AUNQUE NO SE HAYA MOVIDO NADA. Borrar la clave vieja solo de
  // memoria dejaba el nombre en el fichero hasta el siguiente apunte de aura,
  // que puede ser dentro de horas o de dias.
  if (habia) {
    logger.info(`auraStore: caja bajo el nombre viejo (${movidos} grupo(s) movidos); el fichero queda con el nuevo.`);
    scheduleSave();
  }
}

function aplicarSuelo() {
  if (!store) return;
  if ((store[CLAVE_SUELO] || 0) >= SUELO_VERSION) return;

  let subidos = 0;
  for (const grupo in store) {
    if (grupo === CLAVE_ESCALA || grupo === CLAVE_SUELO
        || grupo === CLAVE_CAJA || grupo === CLAVE_CAJA_TS) continue;
    const g = store[grupo];
    if (!g || typeof g !== 'object') continue;
    for (const k in g) {
      if (typeof g[k] !== 'number') continue;
      if (g[k] < SUELO_TODOS) { g[k] = SUELO_TODOS; subidos++; }
    }
  }
  store[CLAVE_SUELO] = SUELO_VERSION;
  if (subidos) logger.info(`auraStore: ${subidos} saldos subidos al suelo de ${SUELO_TODOS}.`);
  scheduleSave();
}

async function load() {
  if (store) return;
  if (!loadPromise) {
    loadPromise = readJsonOrEnoent(AURA_FILE, {})
      .then((d) => { store = d; migrarNombreCaja(); migrarEscala(); aplicarSuelo(); })
      .catch((e) => {
        loadPromise = null;
        logger.warn(`auraStore: lectura falló (${e.message}); no se toca el archivo`);
        throw e;
      });
  }
  await loadPromise;
}

function scheduleSave() { saver.schedule(); }

// Junta en una sola clave las entradas que son de la MISMA persona.
//
// Las escrituras usan canonicalJid, pero esa forma depende de si ya se conocía
// la correspondencia LID<->teléfono en ese momento. Quien acumuló aura bajo su
// @lid antes de que WhatsApp mandara el par acaba con dos saldos: el viejo se
// vuelve invisible (aura perdida) y en el ranking sale dos veces.
//
// El saldo unido NO es la suma a secas: cada entrada partida arrancó por su
// cuenta en STARTING_AURA, así que hay que descontar ese arranque de más una
// vez por cada entrada sobrante. Con dos entradas de 1000 (el arranque) el
// resultado es 1000, no 2000.
//
// Devuelve la clave canónica, ya con todo dentro y las sobrantes borradas.
function foldPerson(g, userJid) {
  const key = canonicalJid(userJid);
  const partes = [];
  if (g[key] !== undefined) partes.push(g[key]);
  const keyEsLid = typeof key === 'string' && key.endsWith('@lid');
  for (const k of Object.keys(g)) {
    if (k === key) continue;
    if (!keyEsLid && !k.endsWith('@lid')) continue;
    if (canonicalJid(k) !== key) continue;
    partes.push(g[k]);
    delete g[k];
  }
  if (partes.length <= 1) {
    if (partes.length === 1 && g[key] === undefined) g[key] = partes[0];
    return key;
  }
  const total = partes.reduce((a, b) => a + b, 0);
  const duplicados = partes.length - 1;
  const fusionado = total - STARTING_AURA * duplicados;
  // Dos identidades ya por debajo del arranque (20+20) daban -110. El suelo
  // es lo que ya tenían, no un agujero inventado.
  g[key] = Math.max(fusionado, Math.min(...partes));
  scheduleSave();
  return key;
}

async function getAura(groupJid, userJid) {
  await load();
  const g = store[groupJid];
  if (!g) return STARTING_AURA;
  const key = foldPerson(g, userJid);
  return g[key] === undefined ? STARTING_AURA : g[key];
}

async function addAura(groupJid, userJid, delta) {
  await load();
  const qKey = `${groupJid}|${canonicalJid(userJid)}`;
  return serialized(qKey, () => {
    if (!store[groupJid]) store[groupJid] = {};
    const key = foldPerson(store[groupJid], userJid);
    const previous = store[groupJid][key] === undefined ? STARTING_AURA : store[groupJid][key];
    const current = previous + delta;
    store[groupJid][key] = current;
    scheduleSave();
    return { previous, current };
  });
}

// Atomic check-and-transfer — the only correct way to move aura between users.
// Returns { ok: true, fromNew, toNew } or { ok: false, fromCurrent } when the
// sender has insufficient funds. Both the debit check and both writes happen
// inside the same serialized block, so no concurrent command can read a stale
// balance in the window between check and commit.
//
// `credita` permite abonar MENOS de lo que se cobra, que es lo que hace falta
// para el impuesto de !dar. Por defecto es igual al cargo, o sea suma cero
// exacta como toda la vida: ningun otro sitio que la use cambia de
// comportamiento por esto. La diferencia (amount - credita) NO se queda en el
// fichero: sale de la cuenta de uno, no entra en la del otro y es quien llama
// el que decide que hacer con ella. Se devuelve como `retenido` para que no se
// pueda perder por descuido.
async function transferAura(groupJid, fromJid, toJid, amount, credita = amount) {
  await load();
  const fromKey = canonicalJid(fromJid);
  const toKey   = canonicalJid(toJid);
  // Las dos cuentas, en orden estable: dos !dar al mismo destino (o un duelo
  // cruzado) se pisaban el abono si solo se bloqueaba al emisor.
  const keys = [fromKey, toKey].sort();
  const qKey = `${groupJid}|${keys[0]}|${keys[1]}`;
  return serialized(qKey, () => {
    if (!store[groupJid]) store[groupJid] = {};
    const g = store[groupJid];
    foldPerson(g, fromJid);
    foldPerson(g, toJid);
    const fromCurrent = g[fromKey] === undefined ? STARTING_AURA : g[fromKey];
    // Se comprueba contra lo que se COBRA, no contra lo que se abona: si no,
    // alguien con 100 justos podria mandar 100 y quedarse debiendo el impuesto.
    if (fromCurrent < amount) return { ok: false, fromCurrent };
    const abono = Math.max(0, Math.min(credita, amount));
    g[fromKey] = fromCurrent - amount;
    g[toKey]   = (g[toKey] === undefined ? STARTING_AURA : g[toKey]) + abono;
    scheduleSave();
    return { ok: true, fromNew: g[fromKey], toNew: g[toKey], retenido: amount - abono };
  });
}

// Cobro "hasta donde llegue", atomico. Descuenta el minimo entre lo pedido y lo
// que la persona tiene DE VERDAD en el momento de escribir, y dice cuanto pudo
// cobrar.
//
// EXISTE POR UN PATRON REPETIDO EN robo.js QUE ERA UNA CARRERA. Se hacia asi:
//
//     const tiene = await getAura(jid, victima);          // (1) lectura
//     const monto = Math.min(loQueTocaba, tiene);         // (2) recorte
//     ...varios await por el medio...                     // (3)
//     await addAura(jid, victima, -monto);                // (4) cobro
//
// El recorte de (2) protege contra el saldo de (1), pero entre (1) y (4) hay
// awaits: anotarGolpe, cobrarRecompensa, sacarDeCaja. Si en ese hueco la
// victima gasta o le roban —cosa nada rara en un grupo donde cinco personas
// juegan a la vez— en (4) se le cobra un monto que ya no puede pagar y se queda
// en negativo. Que es exactamente lo que el recorte pretendia evitar.
//
// Aqui la lectura y la resta ocurren dentro del mismo bloque serializado, asi
// que no hay hueco donde meterse. Es el mismo arreglo que se le hizo a !duel
// con transferAura, aplicado al caso "cobrale lo que tenga".
async function drainAura(groupJid, userJid, amount) {
  await load();
  const qKey = `${groupJid}|${canonicalJid(userJid)}`;
  return serialized(qKey, () => {
    if (!store[groupJid]) store[groupJid] = {};
    const key = foldPerson(store[groupJid], userJid);
    const saldo = store[groupJid][key] === undefined ? STARTING_AURA : store[groupJid][key];
    const cobrado = Math.max(0, Math.min(amount, saldo));
    store[groupJid][key] = saldo - cobrado;
    scheduleSave();
    return { cobrado, current: store[groupJid][key] };
  });
}

// Cobro atomico: comprueba el saldo y descuenta DENTRO del mismo bloque
// serializado, igual que transferAura.
//
// Hacerlo con getAura() y luego addAura() era una carrera real: dos comandos
// simultaneos del mismo usuario leian los dos el mismo saldo antes de que
// ninguno hubiera escrito, los dos pasaban la comprobacion y los dos
// descontaban. Con el saldo justo, dos !play a la vez dejaban al usuario en
// negativo, que es justo lo que SALDO_MINIMO existe para impedir.
//
// Devuelve { ok: true, cobrado, current } o { ok: false, saldo } si no llega.
async function spendAura(groupJid, userJid, amount, minimo = 0) {
  await load();
  const qKey = `${groupJid}|${canonicalJid(userJid)}`;
  return serialized(qKey, () => {
    if (!store[groupJid]) store[groupJid] = {};
    const key = foldPerson(store[groupJid], userJid);
    const saldo = store[groupJid][key] === undefined ? STARTING_AURA : store[groupJid][key];
    if (saldo - amount < minimo) return { ok: false, saldo };
    store[groupJid][key] = saldo - amount;
    scheduleSave();
    return { ok: true, cobrado: amount, current: store[groupJid][key] };
  });
}

// ─── LA CAJA ────────────────────────────────────────────────────────────────
//
// Aura escondida. No se puede robar, no se puede apostar y no se puede gastar:
// para usarla hay que sacarla, y eso cuesta.
//
// Se guarda por la MISMA clave canonica que el saldo, asi que hereda el
// arreglo del LID: quien acumulo bajo su @lid y luego se supo su telefono no
// acaba con dos cajas.

function cajaDe(groupJid) {
  if (!store[CLAVE_CAJA]) store[CLAVE_CAJA] = {};
  if (!store[CLAVE_CAJA][groupJid]) store[CLAVE_CAJA][groupJid] = {};
  return store[CLAVE_CAJA][groupJid];
}

function tsDe(groupJid) {
  if (!store[CLAVE_CAJA_TS]) store[CLAVE_CAJA_TS] = {};
  if (!store[CLAVE_CAJA_TS][groupJid]) store[CLAVE_CAJA_TS][groupJid] = {};
  return store[CLAVE_CAJA_TS][groupJid];
}

// Cuanto tiene dentro. Colapsa las formas por si quedo algo bajo un @lid.
async function verCaja(groupJid, userJid) {
  await load();
  const z = cajaDe(groupJid);
  const key = foldPerson(z, userJid);
  return z[key] || 0;
}

// Cuanto falta para poder volver a guardar. 0 = ya puede.
async function esperaCaja(groupJid, userJid) {
  await load();
  const t = tsDe(groupJid)[canonicalJid(userJid)] || 0;
  return Math.max(0, CAJA.enfriamientoMs - (Date.now() - t));
}

// METER. Saldo -> caja. Atomico: las dos mitades dentro del mismo bloque
// serializado, porque un corte entre ellas duplicaria o evaporaria aura.
async function meterEnCaja(groupJid, userJid, cuanto) {
  await load();
  const qKey = `${groupJid}|${canonicalJid(userJid)}`;
  return serialized(qKey, () => {
    const n = Math.floor(cuanto);
    if (!(n >= CAJA.minimoGuardar)) return { ok: false, motivo: 'minimo' };

    const ts = tsDe(groupJid);
    const kTs = canonicalJid(userJid);
    const espera = CAJA.enfriamientoMs - (Date.now() - (ts[kTs] || 0));
    if (espera > 0) return { ok: false, motivo: 'enfriamiento', espera };

    const z = cajaDe(groupJid);
    const kZ = foldPerson(z, userJid);
    const dentro = z[kZ] || 0;
    const hueco = CAJA.capacidad - dentro;
    if (hueco <= 0) return { ok: false, motivo: 'lleno', dentro };

    if (!store[groupJid]) store[groupJid] = {};
    const kA = foldPerson(store[groupJid], userJid);
    const saldo = store[groupJid][kA] === undefined ? STARTING_AURA : store[groupJid][kA];

    // Lo que de verdad entra: ni mas de lo que cabe, ni mas de lo que hay.
    const real = Math.min(n, hueco, saldo);
    if (real < CAJA.minimoGuardar) {
      return saldo < CAJA.minimoGuardar
        ? { ok: false, motivo: 'sinsaldo', saldo }
        : { ok: false, motivo: 'lleno', dentro };
    }

    store[groupJid][kA] = saldo - real;
    z[kZ] = dentro + real;
    ts[kTs] = Date.now();
    scheduleSave();
    return { ok: true, guardado: real, dentro: z[kZ], saldo: store[groupJid][kA], hueco: CAJA.capacidad - z[kZ] };
  });
}

// SACAR. Caja -> saldo, menos comision. Igual de atomico.
async function sacarDeCaja(groupJid, userJid, cuanto) {
  await load();
  const qKey = `${groupJid}|${canonicalJid(userJid)}`;
  return serialized(qKey, () => {
    const z = cajaDe(groupJid);
    const kZ = foldPerson(z, userJid);
    const dentro = z[kZ] || 0;
    if (dentro <= 0) return { ok: false, motivo: 'vacio' };

    const pedido = Math.floor(cuanto);
    if (!(pedido > 0)) return { ok: false, motivo: 'cantidad' };

    // Se saca lo que se pida o lo que haya, lo que sea menor: pedir de mas no
    // es un error del que teclea, es que ya no se acuerda de cuanto guardo.
    const sacado = Math.min(pedido, dentro);
    const comision = Math.max(CAJA.comisionMinima, Math.round(sacado * CAJA.comision));
    const neto = sacado - comision;
    if (neto <= 0) return { ok: false, motivo: 'migaja', sacado, comision };

    if (!store[groupJid]) store[groupJid] = {};
    const kA = foldPerson(store[groupJid], userJid);
    const saldo = store[groupJid][kA] === undefined ? STARTING_AURA : store[groupJid][kA];

    z[kZ] = dentro - sacado;
    if (z[kZ] === 0) delete z[kZ];
    store[groupJid][kA] = saldo + neto;
    scheduleSave();
    return { ok: true, sacado, comision, neto, dentro: z[kZ] || 0, saldo: store[groupJid][kA] };
  });
}

async function getAuraRanking(groupJid) {
  await load();
  const g = store[groupJid];
  if (!g) return [];
  // Une las formas de cada persona antes de ordenar: si no, el mismo miembro
  // sale dos veces y la fila del @lid pinta un número interno que WhatsApp no
  // resuelve como mención.
  const por = new Map(); // clave canónica -> { jid, aura, extras }
  for (const k in g) {
    const id = canonicalJid(k);
    // EL REPRESENTANTE ES LA FORMA CANONICA, NO LA CLAVE CRUDA.
    //
    // Aqui se guardaba `k` tal cual y solo se cambiaba si aparecia una segunda
    // forma sin @lid. O sea que a quien tenia UN SOLO monton guardado bajo su
    // @lid —lo normal si acumulo aura antes de que el bot aprendiera su
    // telefono, que es lo que pasa tras cada reinicio en un grupo LID— el
    // ranking le pintaba el @lid en crudo: un numero que no es de nadie, que
    // WhatsApp no convierte en nombre y que ademas no le notifica.
    //
    // canonicalJid ya devuelve el telefono en cuanto se conoce la pareja, asi
    // que basta con preferirlo. El @lid solo sobrevive cuando de verdad no se
    // sabe el telefono. Es exactamente lo que hace mergeByPerson en
    // messageCounter, donde este mismo fallo se corrigio y aqui se quedo: por
    // eso !count mencionaba bien y !top no, con los mismos datos delante.
    const rep = id.endsWith('@lid') ? k : id;
    const prev = por.get(id);
    if (!prev) { por.set(id, { jid: rep, aura: g[k], extras: 0 }); continue; }
    prev.aura += g[k];
    prev.extras++;
    if (!rep.endsWith('@lid')) prev.jid = rep; // el teléfono es el que se puede mencionar
  }
  // LO GUARDADO CUENTA PARA EL RANKING, y esa es la mitad del diseño de la caja.
  //
  // Si no contara, esconder aura serviria para dos cosas a la vez: dejar de ser
  // robable Y caerse de *!top*. Y caerse del top es caerse de la lista de la
  // que sale el objetivo del dia, asi que todo el mundo guardaria por sistema
  // y el juego se apagaria solo.
  //
  // Contandolo, la caja protege tu DINERO y no tu reputacion: sigues siendo el
  // mas rico del grupo, con una diana igual de grande, solo que lo que tienes
  // guardado no te lo pueden tocar.
  const escondido = store[CLAVE_CAJA]?.[groupJid] || {};
  for (const k in escondido) {
    const id = canonicalJid(k);
    const prev = por.get(id);
    if (prev) prev.aura += escondido[k];
    else por.set(id, { jid: id.endsWith('@lid') ? k : id, aura: STARTING_AURA + escondido[k], extras: 0 });
  }

  return [...por.values()]
    .map(({ jid, aura, extras }) => ({ jid, aura: aura - STARTING_AURA * extras }))
    // Fuera los que estan a cero o en rojo. Un top es de los que van ganando;
    // rellenarlo con gente a 0 solo alarga la lista y no dice nada de nadie.
    .filter((r) => r.aura > 0)
    .sort((a, b) => b.aura - a.aura);
}

// Deja a todo el grupo en CERO.
//
// Antes borraba el grupo entero, y borrar no es lo mismo que poner a cero: sin
// registro, getAura devuelve el arranque, así que el marcador quedaba en el
// arranque para todos. Se veía como que el reset "no se había aplicado".
//
// Se escribe un 0 por persona, no por clave: quien tenga dos formas (@lid y
// teléfono) se consolida en una sola. Si se dejaran las dos a cero, el ranking
// —que descuenta un arranque por cada forma extra al fusionarlas— sacaría a esa
// persona en negativo mientras el resto está en 0.
//
// Quien nunca ha tocado el bot no tiene registro y seguirá empezando en el
// arranque la primera vez. Eso no es el reset fallando: es alguien que entra
// nuevo, y el arranque existe para que pueda usar el bot desde el primer día.
// Ojo con la asimetría, que el reequilibrio la hizo más grande: tras un reset
// el grupo entero está en 0 y el que llegue mañana entra con el arranque
// completo. Es asumible mientras el arranque sea poco más que un par de
// compras; si algún día sube mucho más, habrá que dar el arranque también a
// los reseteados o el reset premiará a los recién llegados.
async function resetAura(groupJid) {
  await load();
  const g = store[groupJid];
  if (!g) return;
  // AL SUELO, NO A CERO. Dejarlo en cero contradice el suelo de SUELO_TODOS:
  // con SALDO_MINIMO en 0 no se puede gastar estando a cero, asi que un
  // !resetaura dejaba al grupo entero sin poder tocar el bot hasta que cada uno
  // volviera a tirar. Reiniciar es empezar de nuevo, no castigar a todos.
  const alSuelo = {};
  for (const k in g) alSuelo[canonicalJid(k)] = SUELO_TODOS;
  store[groupJid] = alSuelo;
  // LA CAJA TAMBIEN SE VACIA, y no hacerlo dejaba el reset a medias.
  //
  // El aviso dice que el marcador vuelve al suelo para todo el mundo. Sin esto
  // era mentira para quien tuviera algo guardado: el ranking suma lo escondido
  // (ver getAuraRanking), asi que esa persona seguia arriba del todo con dos
  // mil intocables mientras al resto se le ponia a 150. Y encima premiaba
  // esconder justo antes de un reset.
  if (store[CLAVE_CAJA]) delete store[CLAVE_CAJA][groupJid];
  if (store[CLAVE_CAJA_TS]) delete store[CLAVE_CAJA_TS][groupJid];
  scheduleSave();
}

async function flushAura() {
  await saver.flush();
}

module.exports = { getAura, addAura, spendAura, drainAura, transferAura, getAuraRanking, resetAura, flushAura, STARTING_AURA,
  verCaja, esperaCaja, meterEnCaja, sacarDeCaja };
