'use strict';

// UNA PERSONA, UNA HISTORIA.
//
// WhatsApp nombra a la misma persona de dos formas: su @lid y su telefono. El
// bot no siempre sabe desde el principio que son la misma; lo aprende cuando
// WhatsApp manda el par (wa.js, rememberMapping). Y desde ese momento
// canonicalJid() devuelve el telefono, asi que todo lo que se guardo antes con
// el @lid queda bajo una clave que ya nadie vuelve a pedir.
//
// Esto se arreglaba en cada almacen por su cuenta: siete copias del mismo
// esqueleto (foldPerson, foldRacha, foldObjetos, colapsar, mergeByPerson…) y
// los almacenes que no lo copiaron se quedaron partidos. Medido y reproducido:
//
//   · !allow: el permiso dado con el @lid desaparecia al aprender el telefono,
//     y cada enlace de esa persona le sumaba un aviso hasta el BAN.
//   · la caja: al juntar las dos formas se restaba el arranque, como si fuera
//     un saldo. 300 + 200 guardados salian 350.
//   · la recompensa por cabeza: 120 de recompensa se quedaban en 0, el ladron
//     salia dos veces en *!buscados* y al cazarlo se cobraba de menos.
//
// Aqui vive la unica forma de hacerlo. Cada almacen solo dice como se juntan
// SUS valores (el saldo resta el arranque, la caja suma, una caducidad se queda
// con la mas lejana…); lo de encontrar las formas de la persona es comun.

const { canonicalJid, bareJid, lidDe } = require('./wa');

// Las formas con las que alguien puede estar guardado en un mapa con clave
// compuesta: la canonica (el telefono si se conoce) primero, y detras la que
// traia tal cual y su @lid si el bot lo sabe. Con el @lid se encuentra lo que
// se apunto antes de saber el telefono aunque ahora llegue por el telefono.
function formasDe(jid) {
  const c = canonicalJid(jid);
  const formas = [c];
  for (const f of [bareJid(jid), lidDe(c)]) if (f && !formas.includes(f)) formas.push(f);
  return formas;
}

// Las claves de `obj` que son esta persona. La canonica va la primera si esta.
//
// No se recorre el objeto: las formas salen de los dos mapas de wa.js, asi que
// cuesta lo mismo en un grupo de 250 que en uno de 5, y esto corre en cada
// mensaje. Y es mas fino que recorrerlo buscando cada @lid que lleve al mismo
// telefono: si un numero cambia de dueño, el @lid viejo sigue apuntando a ese
// telefono y se juntaria la historia de otra persona. El camino de vuelta
// solo guarda el @lid mas reciente de cada telefono.
function clavesDe(obj, jid) {
  const clave = canonicalJid(jid);
  if (!obj || typeof obj !== 'object' || !clave) return { clave, claves: [] };
  return { clave, claves: formasDe(jid).filter((k) => Object.prototype.hasOwnProperty.call(obj, k)) };
}

// Junta bajo la clave canonica todo lo que esta persona tenga guardado con
// otras formas, y borra esas otras.
//
//   combinar(valores)  el valor unico. Solo se llama con dos o mas; va primero
//                      el de la clave canonica, si lo habia.
//   valido(v)          que valores cuentan (por defecto, cualquiera que no sea
//                      undefined). Los que no valen se tiran al juntar.
//
// Devuelve { clave, cambio }: `cambio` dice si se ha tocado el objeto, para que
// el almacen programe su guardado.
function juntarPersona(obj, jid, combinar, { valido = (v) => v !== undefined } = {}) {
  const { clave, claves } = clavesDe(obj, jid);
  if (!claves.length) return { clave, cambio: false };
  if (claves.length === 1 && claves[0] === clave) return { clave, cambio: false };
  const valores = claves.map((k) => obj[k]).filter((v) => valido(v));
  for (const k of claves) if (k !== clave) delete obj[k];
  if (valores.length === 1) obj[clave] = valores[0];
  else if (valores.length > 1) obj[clave] = combinar(valores);
  return { clave, cambio: true };
}

// La suma de lo que esta persona tenga en `obj` con todas sus formas, sin
// tocar nada. Para lecturas que no deben escribir (un conteo que se consulta).
function sumaPersona(obj, jid) {
  const { claves } = clavesDe(obj, jid);
  let total = 0;
  for (const k of claves) total += Number(obj[k]) || 0;
  return total;
}

// Agrupa claves por persona, para los rankings: canonica -> { rep, claves }.
//
// `rep` es la forma que se enseña y se menciona: el telefono siempre que se
// sepa. Un @lid en un ranking es un numero que no es de nadie y que WhatsApp no
// sabe convertir en un nombre ni notificar.
function agruparPorPersona(claves) {
  const por = new Map();
  for (const k of claves) {
    const id = canonicalJid(k);
    const rep = String(id).endsWith('@lid') ? k : id;
    const prev = por.get(id);
    if (!prev) { por.set(id, { rep, claves: [k] }); continue; }
    prev.claves.push(k);
    if (!String(rep).endsWith('@lid')) prev.rep = rep;
  }
  return por;
}

// Combinadores de uso comun.
const sumar = (vs) => vs.reduce((a, b) => a + (Number(b) || 0), 0);
const elMayor = (vs) => Math.max(...vs.map((v) => Number(v) || 0));
const esObjeto = (v) => Boolean(v) && typeof v === 'object';

// Y lo de juntarPersona, para los Map en memoria con clave compuesta
// (`${grupo}|${persona}`): enfriamientos y contadores que no van a disco.
//
// clavesMapa() da las claves posibles, la canonica primero. Salen de la forma
// CRUDA con la que llega la persona, asi que a quien llama hay que pasarle el
// JID tal cual y no uno ya pasado por canonicalJid(): de un telefono no se
// puede sacar el @lid, y la clave vieja se quedaria sin encontrar.
function clavesMapa(prefijo, jid, sufijo = '') {
  return formasDe(jid).map((f) => `${prefijo}${f}${sufijo}`);
}

// Junta en la primera clave lo que haya en las demas. Devuelve { clave, valor },
// con el valor ya guardado bajo la clave canonica (undefined si no habia nada).
function juntarEnMapa(mapa, claves, combinar = elMayor) {
  const clave = claves[0];
  const vals = [];
  for (const k of claves) if (mapa.has(k)) vals.push(mapa.get(k));
  if (!vals.length) return { clave, valor: undefined };
  if (vals.length === 1 && mapa.has(clave)) return { clave, valor: vals[0] };
  for (const k of claves) if (k !== clave) mapa.delete(k);
  const valor = vals.length === 1 ? vals[0] : combinar(vals);
  mapa.set(clave, valor);
  return { clave, valor };
}

module.exports = {
  formasDe, clavesDe, juntarPersona, sumaPersona, agruparPorPersona,
  clavesMapa, juntarEnMapa,
  sumar, elMayor, esObjeto,
};
