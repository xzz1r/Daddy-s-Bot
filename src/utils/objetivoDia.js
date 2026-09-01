// Objetivo del día: un miembro al azar, no el nº1, no el owner.
//
// Sale del hash (grupo, día), el mismo truco que la ficha falsa del owner:
// estable las 24 h, distinto cada día. El corte del día es el del bot entero
// (DIA), el mismo que el contador de mensajes y la racha. La decisión se
// guarda en disco: si solo vive en RAM, un restart de pm2 vuelve a sortear.
'use strict';

const path = require('path');
const { OBJETIVO_DIA, ROBO, ARRANQUE, DIA } = require('./economia');
const { ruido } = require('./fachada');
const { claveDia, readJsonOrEnoent, createDebouncedSaver } = require('./helpers');
const { isMainOwner, canonicalJid, soloMiembros } = require('./wa');
const { getAuraRanking } = require('./auraStore');
const tienda = require('./roboStore');
const logger = require('./logger');

const FILE = path.join(__dirname, '../../data/objetivoDia.json');

function diaClave(ts = Date.now()) {
  return claveDia(ts, DIA.zona, DIA.horaCorte);
}

function mismo(a, b) {
  if (!a || !b) return false;
  return canonicalJid(a) === canonicalJid(b);
}

// LA DECISION DEL DIA SE TOMA UNA VEZ Y SE GUARDA.
//
// Esto es la tercera vuelta sobre el mismo fallo y merece quedar escrito. El
// cartel cambiaba de persona en minutos, y cada arreglo tapaba una fuente de
// movimiento dejando otra viva:
//
//   1. se sorteaba un indice sobre una lista ORDENADA POR AURA, que se reordena
//      con cada tirada  -> arreglado eligiendo por hash de cada jid;
//   2. se cogia la MITAD DE ARRIBA, que es una posicion, y la gente entra y sale
//      de ella  -> arreglado con un suelo absoluto;
//   3. y aun asi seguia: `n1Aura` es el numero uno EN VIVO, asi que cuando
//      cambia el lider, el que estaba excluido deja de estarlo y entra otro.
//
// Perseguir fuentes de movimiento una a una no acaba nunca, porque todo lo que
// hay debajo es un ranking vivo. Asi que la decision se toma UNA VEZ al dia y se
// guarda; despues solo se comprueba que el elegido siga valiendo. Si sigue,
// gana, aunque debajo se haya movido todo.
const decidido = new Map();   // grupo -> { dia, jid }
let loadPromise = null;
const saver = createDebouncedSaver(
  () => Object.fromEntries(decidido),
  FILE,
  4000,
  (e) => logger.error(`objetivoDia: fallo al guardar: ${e.message}`),
);

async function load() {
  if (loadPromise) return loadPromise;
  loadPromise = readJsonOrEnoent(FILE, {})
    .then((d) => {
      if (!d || typeof d !== 'object') return;
      for (const [g, v] of Object.entries(d)) {
        if (v && typeof v.dia === 'string' && v.jid) decidido.set(g, { dia: v.dia, jid: v.jid });
      }
    })
    .catch((e) => {
      loadPromise = null;
      logger.warn(`objetivoDia: lectura falló (${e.message}); no se toca el archivo`);
      throw e;
    });
  return loadPromise;
}

async function flushObjetivoDia() {
  await saver.flush();
}

async function objetivoDelDia(grupo, groupMeta) {
  await load();
  const ranking = soloMiembros(await getAuraRanking(grupo), groupMeta)
    .filter((r) => r.aura >= ROBO.minVictima);
  if (ranking.length < 2) return null;

  const hoy = diaClave();
  const yaEsta = decidido.get(grupo);
  if (yaEsta && yaEsta.dia === hoy) {
    // Se comprueba contra el RANKING, no contra los candidatos. Las exclusiones
    // (owner, nº1 de aura, nº1 semanal) sirven para ELEGIR, no para mantener:
    // si el cazado sube a lo largo del dia y pasa a ser el numero uno, el cartel
    // no tiene por que cambiar — cambiarlo es exactamente el sintoma que se vino
    // a arreglar. Basta con que siga en el grupo y con algo que robarle.
    const sigue = ranking.find((r) => mismo(r.jid, yaEsta.jid));
    if (sigue) {
      return { jid: sigue.jid, bonoBotin: OBJETIVO_DIA.bonoBotin, bonoProbabilidad: OBJETIVO_DIA.bonoProbabilidad };
    }
  }

  const n1Aura = ranking[0] && ranking[0].jid;

  // El nº1 que el grupo VE en los más buscados: el primero que NO es el owner.
  // masBuscado() devuelve el ranking real, y ahí el owner puede ir primero;
  // si filtrásemos por ese, el cartel diario caería sobre quien lleva la
  // diana semanal en pantalla, que es justo "el de siempre".
  let n1Semana = null;
  try {
    const real = await tienda.rankingLadrones(grupo);
    const visto = real.find((x) => !isMainOwner(x.jid, false, groupMeta) && x.total > 0);
    n1Semana = visto ? visto.jid : null;
  } catch { /* sin ranking semanal, se elige igual */ }

  const elegibles = ranking.filter((r) => {
    if (isMainOwner(r.jid, false, groupMeta)) return false;
    if (n1Aura && mismo(r.jid, n1Aura)) return false;
    if (n1Semana && mismo(r.jid, n1Semana)) return false;
    return true;
  });
  if (!elegibles.length) return null;

  // UN SUELO ABSOLUTO, NO UNA POSICION. Y la diferencia es todo el asunto.
  //
  // El filtro original era `aura >= 20`, o sea todo el mundo: un cartel sobre
  // alguien con 30 de aura no es una caza, porque el 22 % extra cae sobre un
  // botin que no existe.
  //
  // Pero el primer arreglo cogia LA MITAD DE ARRIBA del ranking, y eso volvia a
  // romper lo otro: la mitad de arriba es una POSICION, y la gente entra y sale
  // de ella cada vez que alguien tira o roba. El elegido se caia de la lista y
  // ganaba otro. Medido: el cartel cambiaba tres veces en cuarenta movimientos.
  // O sea que cambie una inestabilidad por otra mas dificil de ver.
  //
  // Un suelo absoluto no se mueve. Se usa ARRANQUE (lo que le dan a cualquiera
  // al entrar): quien esta por encima ha acumulado algo de verdad, y no baja de
  // ahi en una tarde de juego normal. Con menos de dos que lo pasen se cae a los
  // elegibles, que es mejor cartel que ninguno.
  const conBolsillo = elegibles.filter((r) => r.aura >= ARRANQUE);
  const candidatos = conBolsillo.length >= 2 ? conBolsillo : elegibles;

  // Y SE ELIGE SIN DEPENDER DEL ORDEN, que era el fallo de verdad.
  //
  // Antes se sorteaba un indice y se cogia `candidatos[i]`. El indice era
  // estable todo el dia, pero la LISTA no: sale del ranking de aura, que se
  // reordena con cada tirada, cada robo y cada apuesta. O sea que el numero no
  // cambiaba y a quien apuntaba si — el cartel saltaba de persona en persona en
  // minutos, que es justo lo contrario de lo que promete "objetivo del dia".
  //
  // Ahora cada candidato saca su propio numero de (grupo, dia, su jid) y gana el
  // mas alto. Eso no depende de en que posicion este: mientras siga en la lista,
  // sigue siendo el elegido aunque suba o baje veinte puestos.
  // Lo decidido hoy manda, mientras el elegido siga siendo candidato.
  let elegido = null, mejor = -1;
  for (const r of candidatos) {
    const n = ruido(grupo, 'objetivo-dia', `${hoy}|${canonicalJid(r.jid)}`);
    if (n > mejor) { mejor = n; elegido = r; }
  }
  if (!elegido) return null;
  if (decidido.size >= 500) decidido.delete(decidido.keys().next().value);
  decidido.set(grupo, { dia: hoy, jid: elegido.jid });
  saver.schedule();
  return { jid: elegido.jid, bonoBotin: OBJETIVO_DIA.bonoBotin, bonoProbabilidad: OBJETIVO_DIA.bonoProbabilidad };
}

function esObjetivoDelDia(obj, quien) {
  return Boolean(obj && quien && mismo(obj.jid, quien));
}

module.exports = { objetivoDelDia, esObjetivoDelDia, diaClave, flushObjetivoDia };
