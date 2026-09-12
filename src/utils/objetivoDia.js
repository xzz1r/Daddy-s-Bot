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
        if (v && typeof v.dia === 'string' && v.jid) {
          decidido.set(g, {
            dia: v.dia,
            jid: v.jid,
            // SIN ESTO EL ARREGLO NO SIRVE DE NADA: si la franja no vuelve del
            // disco, cada reinicio la olvida y el cartel sale otra vez.
            franja: typeof v.franja === 'string' ? v.franja : '',
          });
        }
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

// `rankingYaHecho` es la lista COMPLETA de miembros con aura, sin recortar, para
// quien ya la tenga en la mano. *!top* la acaba de construir tres lineas antes y
// aqui se rehacia entera: medido en un grupo de 250, el comando costaba 524 us
// de los cuales 250 eran esta segunda vuelta. No es una cache —no se guarda
// nada, no caduca nada— es pasar un argumento que ya existe.
//
// SIN RECORTAR, y por eso el parametro no es el ranking que *!top* enseña: el
// `find` de mas abajo necesita la lista entera. Con el top-10 el objetivo
// dejaria de encontrarse en cuanto cayera al puesto once.
async function objetivoDelDia(grupo, groupMeta, rankingYaHecho = null) {
  await load();
  const base = rankingYaHecho || soloMiembros(await getAuraRanking(grupo), groupMeta);
  const ranking = base.filter((r) => r.aura >= ROBO.minVictima);
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

// ─── EL CARTEL SE CUELGA UNA VEZ AL DIA ─────────────────────────────────────
//
// Todo lo de arriba lleva tiempo calculandose para nada: el bonus se aplicaba
// en silencio y el objetivo solo se descubria DESPUES, en una linea al final de
// un robo que ya habia salido bien. Maquinaria construida generando cero
// movimiento.
//
// SE CUELGA CON EL PRIMER MENSAJE DEL DIA, no a la hora del corte. Un anuncio a
// las cinco de la mañana lo lee el scroll; soltado cuando alguien escribe, lo
// lee gente. No hace falta ningun temporizador, ni un cron, ni que el bot este
// despierto a una hora concreta: se cuelga solo cuando el grupo se despierta.
//
// EN MEMORIA Y A PROPOSITO. Lo unico que se recuerda aqui es "ya lo he dicho
// hoy en este grupo". Si hay un despliegue a media mañana se dice dos veces, y
// esa es la peor consecuencia posible: un mensaje repetido en todo el dia. La
// alternativa —otro fichero en disco, otra escritura, otro sitio del que
// acordarse al restaurar— cuesta mas que el problema que evita.
//
// Y SI NO HAY OBJETIVO, NO SE DICE NADA. Un grupo con dos personas o sin nadie
// con aura suficiente no tiene cartel, y anunciar que hoy no hay cartel es
// ruido puro.
// ─── EL CARTEL: A LAS 12 DEL MEDIODIA Y A LAS 12 DE LA NOCHE ───────────────
//
// El dueño: «que solo lo diga dos veces al dia», y despues: «a las 12 del
// mediodia y de la noche». O sea RELOJ DE PARED, no «cada doce horas»: dos
// carteles separados por doce horas pero a las 3 y a las 15 no son lo que pidio.
//
// El bot no habla solo, asi que «a las 12» significa CON EL PRIMER MENSAJE
// despues de las 12. Si el grupo duerme hasta las dos, el cartel sale a las dos;
// lo que no puede es salir dos veces en la misma franja.
//
// Y ANTES ESTABA EN MEMORIA, que era el fallo de verdad: un Map que cada
// reinicio borraba, asi que el cartel volvia a colgarse con el primer mensaje.
// Un dia con ocho despliegues son ocho carteles. Ahora la marca se guarda donde
// ya se guardaba la decision del dia — mismo fichero, mismo saver — y un
// reinicio no reabre nada.
const HORAS_CARTEL = [0, 12];

// La franja en la que cae un instante, con la FECHA LOCAL dentro para que a
// medianoche empiecen dos franjas nuevas y no una. Se saca de la zona del bot y
// no de `diaClave`, que depende de `horaCorte`: hoy vale 0 y coinciden, pero el
// dia que alguien mueva el corte a las 5, las franjas seguirian siendo las 12 y
// las 0 de reloj, que es lo que se pidio.
//
// EL FORMATEADOR SE CONSTRUYE UNA VEZ, y no en cada llamada.
//
// Estaba dentro de la funcion, y esta funcion corre en CADA mensaje de grupo.
// Medido con 20.000 llamadas: 69,5 us construyendolo cada vez contra 5,7 us
// reutilizandolo. Son 64 us por mensaje tirados en fabricar doce veces por
// minuto el mismo objeto inmutable.
//
// helpers.js ya habia aprendido esto —tiene un Map de formatos con un comentario
// que dice «Intl.formatToParts no es barato»— y aqui se volvio a escribir mal.
const FORMATO_FRANJA = new Intl.DateTimeFormat('en-GB', {
  timeZone: DIA.zona,
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
});

function franjaDe(ts = Date.now()) {
  const p = Object.fromEntries(FORMATO_FRANJA
    .formatToParts(new Date(ts)).filter((x) => x.type !== 'literal').map((x) => [x.type, x.value]));
  const hora = Number(p.hour) % 24;
  // La ultima hora de la lista que ya haya pasado.
  const desde = HORAS_CARTEL.filter((h) => hora >= h).pop() ?? HORAS_CARTEL[0];
  return `${p.year}-${p.month}-${p.day}|${String(desde).padStart(2, '0')}`;
}

// UN GRUPO SIN OBJETIVO NO PUEDE RECALCULAR EL RANKING EN CADA MENSAJE.
//
// Cuando no hay a quien señalar —un grupo nuevo con menos de dos personas con
// aura, o uno pequeño donde el owner y los dos primeros agotan a los
// elegibles— esto salia por el `return null` de abajo SIN marcar la franja. Y
// sin marca, el atajo de arriba no salta nunca: el ranking entero y la lista de
// miembros se rehacian con cada mensaje, para nada.
//
// Medido en un grupo de 250 sin objetivo posible: 337 us por mensaje, contra 65
// us cuando si lo hay. En uno de 500, 579 us.
//
// No se marca la franja entera —eso dejaria al grupo sin cartel hasta doce
// horas despues de volverse elegible, y el comentario de abajo explica por que
// la franja no se gasta sin señalar a nadie— sino que se anota el «aqui hoy no
// hay» durante unos minutos. El grupo que empieza a tener objetivo lo estrena
// en cuanto pasa ese rato, y mientras tanto no se paga el recuento.
const SIN_OBJETIVO_MS = 10 * 60_000;
const sinObjetivo = new Map();   // grupo -> ts del ultimo intento en vacio

async function cartelDelDia(grupo, groupMeta) {
  await load();
  const franja = franjaDe();
  const v = decidido.get(grupo);
  if (v && v.franja === franja) return null;

  const vacio = sinObjetivo.get(grupo);
  if (vacio && Date.now() - vacio < SIN_OBJETIVO_MS) return null;

  try {
    const obj = await objetivoDelDia(grupo, groupMeta);
    if (!obj || !obj.jid) {
      if (sinObjetivo.size >= 500) sinObjetivo.delete(sinObjetivo.keys().next().value);
      sinObjetivo.set(grupo, Date.now());
      return null;
    }
    sinObjetivo.delete(grupo);
    // Se apunta DESPUES de saber que hay a quien señalar —un grupo sin objetivo
    // no puede gastar su franja— y antes de devolverlo, para que dos mensajes
    // simultaneos no cuelguen dos carteles.
    const actual = decidido.get(grupo);
    if (actual) { actual.franja = franja; saver.schedule(); }
    return obj.jid;
  } catch (e) {
    logger.warn(`objetivoDia: no pude colgar el cartel en ${grupo}: ${e.message}`);
    return null;
  }
}

module.exports = { objetivoDelDia, esObjetivoDelDia, diaClave, flushObjetivoDia, cartelDelDia, _decidido: decidido, _franjaDe: franjaDe, _sinObjetivo: sinObjetivo, HORAS_CARTEL };
