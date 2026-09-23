'use strict';

// LA MEMORIA DE RENCOR: el bot se acuerda de lo que paso entre dos personas y
// lo saca la proxima vez que se crucen. «El martes ya te moggeo. Hoy vuelves a
// pedirlo y vuelves a perder.» El grupo se hace su propia historia.
//
// Lo pidio el dueño con una condicion: que no saque a nadie. Por eso:
//
//   · SOLO TEXTO. No cambia tiradas, ni aura, ni echa a nadie. Es una linea
//     mas en un mensaje que ya iba a salir.
//   · SOLO LOS DOS DEL MENSAJE. La linea habla de quienes estan en ese mog,
//     ese duelo, ese robo o ese ship, y de nadie mas.
//   · NADA DEL TIER DUEÑO. Ni se apunta ni se cita un cruce donde este el
//     dueño o un co-dueño: ganan con ventaja (rigOwner, rollMog, rollWinner),
//     y «van cinco seguidas» delataria el amaño y quien es. Y el tier es algo
//     que el bot no enseña en el grupo (ver !whoami).
//
// CUANDO SALE. En el primer cruce del dia de esa pareja en ese juego, y solo si
// la vez anterior fue otro dia. Sin eso, diez !mog seguidos entre los mismos
// dos serian diez recuerdos de «hace un rato», que ya no es memoria, es eco.
//
// Nunca lanza: si algo falla, el comando sale igual y sin la linea.

const { isOwner, sameUser } = require('./wa');
const { claveDia, pickFresh, fmt } = require('./helpers');
const { DIA } = require('./economia');
const store = require('./rencorStore');
const F = require('../data/rencorPhrases');
const logger = require('./logger');

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const EN_LETRA = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];

const diaDe = (ts) => claveDia(ts, DIA.zona, DIA.horaCorte);
const tsDeDia = (k) => Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));
const tag = (jid) => `@${String(jid).split('@')[0]}`;

// «ayer», «el martes», «la semana pasada», «hace 12 días». Con el dia del bot
// (el corte de DIA), no con el del reloj: a la una de la madrugada, lo de las
// once de la noche sigue siendo «hoy» para el grupo.
function cuando(ts, ahora = Date.now()) {
  const a = diaDe(ts);
  const n = Math.round((tsDeDia(diaDe(ahora)) - tsDeDia(a)) / 86400000);
  if (n <= 0) return 'hoy';
  if (n === 1) return 'ayer';
  if (n < 7) return `el ${DIAS_SEMANA[new Date(tsDeDia(a)).getUTCDay()]}`;
  if (n < 14) return 'la semana pasada';
  return `hace ${n} días`;
}

function enLetra(n) {
  return n >= 0 && n < EN_LETRA.length ? EN_LETRA[n] : String(n);
}

// Rellena la frase. %D va en minuscula en la tabla («el martes»), asi que si la
// frase empieza por el, la mayuscula se pone aqui. Y «de el martes» es «del
// martes»: la contraccion se hace despues de rellenar, que es cuando existe.
function rellena(frase, v) {
  let t = frase;
  for (const [k, val] of Object.entries(v)) t = t.split(`%${k}`).join(String(val));
  t = t.replace(/\b([Dd])e el\b/g, '$1el').replace(/\b([Aa]) el\b/g, '$1l');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function hayTier(groupMeta, ...quienes) {
  return quienes.some((q) => isOwner(q, false, groupMeta));
}

// Los cruces de dias anteriores: solo el ultimo de cada dia, del mas nuevo al
// mas viejo. Si ya se cruzaron hoy, null: hoy ya se dijo lo que habia que decir.
function anteriores(hist, ahora = Date.now()) {
  const hoy = diaDe(ahora);
  if (hist.some((e) => diaDe(e.ts) === hoy)) return null;
  const vistos = new Set();
  const fuera = [];
  for (const e of hist) {
    const d = diaDe(e.ts);
    if (vistos.has(d)) continue;
    vistos.add(d);
    fuera.push(e);
  }
  return fuera;
}

// La ultima situacion elegida ('mog|repite', 'robo|venganza'…). Solo la leen
// las pruebas: saber que pool salio sin tener que adivinarlo por el texto.
let ultimoTipo = null;
const elige = (grupo, nombre, pool) => { ultimoTipo = nombre; return pickFresh(pool, `${grupo}|rencor|${nombre}`); };

// !mog y !duel: alguien gana y alguien pierde.
async function cruce(juego, pools, { grupo, gana, pierde, cifra = null, groupMeta }) {
  if (!gana || !pierde || sameUser(gana, pierde) || hayTier(groupMeta, gana, pierde)) return '';
  let linea = '';
  try {
    const previos = anteriores(await store.historia(grupo, gana, pierde, juego));
    if (previos && previos.length) {
      const ult = previos[0];
      const v = { A: tag(gana), V: tag(pierde), D: cuando(ult.ts), C: fmt(ult.n || 0) };
      if (sameUser(ult.g, gana)) {
        // Cuantas seguidas lleva, contando la de hoy.
        let seguidas = 1;
        for (const e of previos) { if (sameUser(e.g, gana)) seguidas++; else break; }
        v.N = enLetra(seguidas);
        linea = seguidas >= 3
          ? rellena(elige(grupo, `${juego}|racha`, pools.racha), v)
          : rellena(elige(grupo, `${juego}|repite`, pools.repite), v);
      } else {
        linea = rellena(elige(grupo, `${juego}|revancha`, pools.revancha), v);
      }
    }
    await store.apuntar(grupo, juego, { g: gana, p: pierde, n: cifra });
  } catch (e) {
    logger.unaVez('rencor', e);
  }
  return linea;
}

function mog(datos) {
  return cruce('mog', { repite: F.MOG_REPITE, revancha: F.MOG_REVANCHA, racha: F.MOG_RACHA }, datos);
}

function duelo(datos) {
  return cruce('duelo', { repite: F.DUELO_REPITE, revancha: F.DUELO_REVANCHA, racha: F.DUELO_RACHA }, datos);
}

// Al LANZAR un duelo. No apunta nada: el duelo aun no ha pasado, y puede que
// no pase (rechazo, caducidad).
async function precedenteDuelo({ grupo, retador, retado, groupMeta }) {
  if (!retador || !retado || sameUser(retador, retado) || hayTier(groupMeta, retador, retado)) return '';
  try {
    const previos = anteriores(await store.historia(grupo, retador, retado, 'duelo'));
    if (!previos || !previos.length) return '';
    const ult = previos[0];
    const v = { A: tag(ult.g), V: tag(ult.p), D: cuando(ult.ts), C: fmt(ult.n || 0) };
    return sameUser(ult.g, retador)
      ? rellena(elige(grupo, 'duelo|vuelve', F.DUELO_VUELVE), v)
      : rellena(elige(grupo, 'duelo|pide', F.DUELO_PIDE), v);
  } catch (e) {
    logger.unaVez('rencor', e);
    return '';
  }
}

// !robo. Solo deja rencor un robo que SALIO: el ultimo de otro dia entre esos
// dos, en la direccion que sea.
async function robo({ grupo, ladron, victima, ok, cifra = null, groupMeta }) {
  if (!ladron || !victima || sameUser(ladron, victima) || hayTier(groupMeta, ladron, victima)) return '';
  let linea = '';
  try {
    const hist = await store.historia(grupo, ladron, victima, 'robo');
    const hoy = diaDe(Date.now());
    const yaHoy = hist.some((e) => diaDe(e.ts) === hoy);
    const ult = yaHoy ? null : hist.find((e) => e.ok);
    if (ult) {
      const v = { A: tag(ladron), V: tag(victima), D: cuando(ult.ts), C: fmt(ult.n || 0) };
      const mismoSentido = sameUser(ult.g, ladron);
      const nombre = mismoSentido ? (ok ? 'reincide' : 'seAcaba') : (ok ? 'venganza' : 'niVengarse');
      const pool = { reincide: F.ROBO_REINCIDE, seAcaba: F.ROBO_SE_ACABA, venganza: F.ROBO_VENGANZA, niVengarse: F.ROBO_NI_VENGARSE }[nombre];
      linea = rellena(elige(grupo, `robo|${nombre}`, pool), v);
    }
    await store.apuntar(grupo, 'robo', { g: ladron, p: victima, n: cifra, ok: !!ok });
  } catch (e) {
    logger.unaVez('rencor', e);
  }
  return linea;
}

// !ship. Aqui no gana nadie: se compara con el % de la vez anterior.
async function ship({ grupo, a, b, compat, groupMeta }) {
  if (!a || !b || sameUser(a, b) || hayTier(groupMeta, a, b)) return '';
  let linea = '';
  try {
    const previos = anteriores(await store.historia(grupo, a, b, 'ship'));
    if (previos && previos.length) {
      const ult = previos[0];
      const dif = compat - (ult.n || 0);
      const nombre = dif >= 15 ? 'sube' : dif <= -15 ? 'baja' : 'igual';
      const pool = { sube: F.SHIP_SUBE, baja: F.SHIP_BAJA, igual: F.SHIP_IGUAL }[nombre];
      linea = rellena(elige(grupo, `ship|${nombre}`, pool), {
        A: tag(a), V: tag(b), D: cuando(ult.ts), C: `${ult.n || 0} %`,
      });
    }
    await store.apuntar(grupo, 'ship', { g: a, p: b, n: compat });
  } catch (e) {
    logger.unaVez('rencor', e);
  }
  return linea;
}

module.exports = { mog, duelo, precedenteDuelo, robo, ship, _cuando: cuando, _rellena: rellena, _ultimoTipo: () => ultimoTipo, _nuevoTipo: () => { ultimoTipo = null; } };
