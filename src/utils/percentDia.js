// ─── LO QUE HA SALIDO HOY EN ESTE GRUPO ─────────────────────────────────────
//
// Los veintiún comandos de porcentaje son el 87 % de lo que el grupo lee, y son
// UNA sola mecánica repetida veintiuna veces: tirar un número, imprimir una
// frase del tramo. Las frases están bien; lo que se gasta es la FORMA, que
// nunca cambia. A la tercera del día ya sabes exactamente qué va a aparecer.
//
// Esto le da una segunda dimensión sin escribir un solo pool nuevo: en vez de
// más frases, HECHOS. El bot ya sabe lo que ha salido hoy en este chat, así que
// puede comentar el número en vez de limitarse a soltarlo:
//
//   · el más alto o el más bajo del día,
//   · que alguien ya lo había preguntado antes,
//   · que a otra persona le salió exactamente lo mismo.
//
// Es el mismo humor de siempre —comentar lo que hace la gente, no describirlo—
// aplicado a algo que el bot tenía delante y no usaba.
//
// EN MEMORIA Y POR DÍA. No hay nada que valga la pena guardar en disco: un
// despliegue borra el marcador del día y como mucho se pierde un remate. Meter
// otro fichero, otra escritura y otro sitio del que acordarse al restaurar
// cuesta más que el problema que evita.
'use strict';

const { claveDia } = require('./helpers');
const { DIA } = require('./economia');
const { canonicalJid } = require('./wa');

// Cuántas tiradas se recuerdan por grupo y día. Con veintiún comandos y un
// grupo activo, doscientas cubren el día entero; el tope solo existe para que
// un grupo enorme no crezca sin límite.
const TOPE = 200;

// UNA DE CADA TRES, Y ESTA CIFRA YA SE APRENDIÓ CARA. Es la misma lección que
// el remate de las acciones: una coletilla que sale SIEMPRE deja de leerse a la
// tercera y pasa a ser parte del formato, que es justo lo que se venía a
// romper. Espaciada, vuelve a ser un corte que nadie esperaba.
const CADA = 3;

const dias = new Map();    // grupo -> { dia, tiradas: [], turno }
const hoyClave = () => claveDia(Date.now(), DIA.zona, DIA.horaCorte);

function libro(grupo) {
  const hoy = hoyClave();
  const l = dias.get(grupo);
  if (l && l.dia === hoy) return l;
  const nuevo = { dia: hoy, tiradas: [], turno: 0 };
  dias.set(grupo, nuevo);
  // El mapa no crece: un grupo que deja de escribir se queda con su entrada del
  // último día y nada más. Aun así, tope por si el bot entra en muchos grupos.
  if (dias.size > 100) dias.delete(dias.keys().next().value);
  return nuevo;
}

// Apunta la tirada y devuelve el remate, o null si no toca o no hay nada que
// decir. Se llama SIEMPRE (para que el marcador del día esté completo) aunque
// casi siempre devuelva null.
function anotarYRematar(grupo, key, jid, percent, nombreDe) {
  const l = libro(grupo);
  const quien = canonicalJid(jid) || jid;
  const previas = l.tiradas;

  // Se calcula ANTES de meter la de ahora: si no, la propia tirada cuenta como
  // "ya salió antes" y todos los remates saldrían siempre.
  const mismoComando = previas.filter((t) => t.key === key);
  const masAlto = mismoComando.length && percent > Math.max(...mismoComando.map((t) => t.percent));
  const masBajo = mismoComando.length && percent < Math.min(...mismoComando.map((t) => t.percent));
  const repite = previas.some((t) => t.key === key && t.quien === quien);
  const empate = previas.find((t) => t.key === key && t.percent === percent && t.quien !== quien);

  l.tiradas.push({ key, quien, percent });
  if (l.tiradas.length > TOPE) l.tiradas.shift();

  l.turno = (l.turno + 1) % CADA;
  if (l.turno !== 0) return null;

  // El orden importa: lo más raro primero. Un empate exacto es más gracioso que
  // un máximo, y el máximo más que "ya lo preguntaste".
  if (empate) {
    const otro = nombreDe ? nombreDe(empate.quien) : null;
    return otro ? `Lo mismo que le salió a ${otro} hace un rato. Coincidencia o diagnóstico.` : null;
  }
  if (masAlto && mismoComando.length >= 2) return 'Lo más alto que ha salido hoy aquí. Que conste en acta.';
  if (masBajo && mismoComando.length >= 2) return 'Lo más bajo del día. Alguien tenía que sostener el suelo.';
  if (repite) return 'Y van dos hoy. El número no mejora por insistir.';
  return null;
}

module.exports = { anotarYRematar, CADA, _dias: dias };
