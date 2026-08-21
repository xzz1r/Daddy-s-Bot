// Objetivo del día: un miembro al azar, no el nº1, no el owner.
//
// Sale del hash (grupo, día), el mismo truco que la ficha falsa del owner:
// estable las 24 h, distinto cada día, sin guardar nada en disco. El corte
// del día es el de la racha (5 de la mañana, hora española) para que no
// rote a las 19 h de Colombia por irse a medianoche UTC.
'use strict';

const { OBJETIVO_DIA, ROBO, RACHA } = require('./economia');
const { ruido } = require('./fachada');
const { isMainOwner, canonicalJid, soloMiembros } = require('./wa');
const { getAuraRanking } = require('./auraStore');
const tienda = require('./roboStore');

const FORMATO = new Intl.DateTimeFormat('sv-SE', {
  timeZone: RACHA.zona, year: 'numeric', month: '2-digit', day: '2-digit',
});

function diaClave(ts = Date.now()) {
  return FORMATO.format(new Date(ts - RACHA.horaCorte * 3600 * 1000));
}

function mismo(a, b) {
  if (!a || !b) return false;
  return canonicalJid(a) === canonicalJid(b);
}

async function objetivoDelDia(grupo, groupMeta) {
  const ranking = soloMiembros(await getAuraRanking(grupo), groupMeta)
    .filter((r) => r.aura >= ROBO.minVictima);
  if (ranking.length < 2) return null;

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

  // NO VALE CUALQUIERA: SOLO LA MITAD DE ARRIBA.
  //
  // El filtro era `aura >= ROBO.minVictima`, o sea 20, o sea todo el mundo. Un
  // cartel diario sobre alguien que tiene 30 de aura no es una caza: es una
  // molestia, porque el 22 % extra se aplica sobre un botin que no existe.
  // `ranking` ya viene ordenado de mas a menos, asi que la mitad de arriba es
  // el corte natural. Con menos de cuatro elegibles se coge la lista entera:
  // en un grupo pequeño partirla por la mitad deja uno o ninguno.
  const candidatos = elegibles.length >= 4
    ? elegibles.slice(0, Math.ceil(elegibles.length / 2))
    : elegibles;

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
  let elegido = null, mejor = -1;
  for (const r of candidatos) {
    const n = ruido(grupo, 'objetivo-dia', `${diaClave()}|${canonicalJid(r.jid)}`);
    if (n > mejor) { mejor = n; elegido = r; }
  }
  if (!elegido) return null;
  return { jid: elegido.jid, bonoBotin: OBJETIVO_DIA.bonoBotin, bonoProbabilidad: OBJETIVO_DIA.bonoProbabilidad };
}

function esObjetivoDelDia(obj, quien) {
  return Boolean(obj && quien && mismo(obj.jid, quien));
}

module.exports = { objetivoDelDia, esObjetivoDelDia, diaClave };
