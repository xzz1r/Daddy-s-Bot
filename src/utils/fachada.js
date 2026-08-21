// LA FACHADA DEL OWNER.
//
// El owner principal esta fuera de los contadores: sus mensajes no se cuentan,
// que es lo que lo mantiene fuera de !count, de los tops y de las purgas.
//
// AQUI NO SE INVENTA NADA QUE SALGA DE SUS MENSAJES, y eso fue una correccion
// suya. Hubo una version que le fabricaba un recuento creible para que la linea
// de "Veterano (N msgs)" y el informe de !aura hoy le salieran como a todo el
// mundo, con el argumento de que la ausencia tambien delata. El argumento es
// malo: esos dos sitios SON el contador de mensajes, asi que inventarle una
// cifra es publicar un dato sobre su actividad — justo lo que el contador
// existe para no publicar. Los dos se callan y ya esta; la linea solo sale
// pasando un umbral que la mayoria del grupo no pasa nunca, asi que no llama la
// atencion.
//
// Lo unico que queda aqui es su ficha en LOS MAS BUSCADOS, que es de otra cosa
// —robos, no mensajes— y que el pidio expresamente. Dos reglas para ella:
//
//  1. SE PARECE AL GRUPO, no a una constante. Sale de lo que ha robado el que va
//     primero DE VERDAD, asi que la distancia parece natural: semana floja,
//     cifras flojas.
//  2. ES ESTABLE DENTRO DEL DIA. Dos consultas seguidas tienen que contar lo
//     mismo, o el que mira sabe que ninguna es real. Por eso el ruido sale de un
//     hash de (grupo, dia) y no de Math.random().

// FNV-1a, el mismo que usa pickhistory. Se necesita un ruido que sea el mismo
// durante todo el dia y distinto cada dia, y eso es exactamente un hash.
//
// PERO CON MEZCLA FINAL, Y SIN ELLA NO ROTABA NADA.
//
// FNV-1a a secas termina en una multiplicacion, y una multiplicacion NO empuja
// el ultimo byte hacia los bits altos. Como aqui las claves solo se diferencian
// en el ultimo caracter —'...|2026-08-20', '...|2026-08-21'— el resultado se
// movia una miseria: 0.318, 0.322, 0.326, en pasos de 0,004.
//
// Con eso, `Math.floor(ruido * candidatos)` daba SIEMPRE el mismo indice. El
// objetivo del dia salio siete dias seguidos sobre la misma persona, que es
// justo lo contrario de lo que el nombre promete. Y no se ve leyendo el codigo:
// hay que mirar los numeros.
//
// El remate es el finalizador de MurmurHash3: dos xor-desplazamiento con
// multiplicacion en medio. Su unico trabajo es que cambiar UN bit de la entrada
// cambie la mitad de los de salida.
function hash(txt) {
  let h = 0x811c9dc5;
  for (let i = 0; i < txt.length; i++) {
    h ^= txt.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

// Un numero entre 0 y 1, fijo para ese grupo y ese dia.
function ruido(grupo, etiqueta, dia = Math.floor(Date.now() / 86400000)) {
  return hash(`${grupo}|${etiqueta}|${dia}`) / 0x100000000;
}

// ─── La ficha del owner en LOS MAS BUSCADOS ──────────────────────────────────
//
// Salio a peticion expresa: no aparecer en una lista de ladrones cuando se roba
// a diario es tan raro como aparecer con un cero. Pero sus cifras reales no
// pueden salir — ni el botin que se lleva ni cuantos golpes da, que es
// exactamente su actividad — asi que la ficha entera es inventada.
//
// SE LE COLOCA SEGUNDO O MAS ABAJO, NUNCA PRIMERO, y no es por modestia:
//
//   · el numero uno lleva diana, y la diana da un 35 % mas de botin a quien le
//     robe. Ponerle diana a alguien al que los robos SIEMPRE le fallan es
//     montar un cartel que nadie va a poder cobrar nunca, y eso si se nota;
//   · el primer puesto es el que todo el mundo mira y comenta. El segundo es
//     "va fuerte este mes" y nadie le da mas vueltas.
//
// La cifra se calcula a partir del que si va primero de verdad, asi que la
// distancia siempre parece natural: si esa semana el lider ha robado poco, el
// owner tambien; si ha sido una semana salvaje, el owner acompaña.
const SEGUNDO = { min: 0.62, max: 0.88 };   // fraccion del botin del lider

function fichaFalsaBuscado(grupo, lider) {
  if (!lider || !(lider.total > 0)) return null;
  const frac = SEGUNDO.min + ruido(grupo, 'buscado') * (SEGUNDO.max - SEGUNDO.min);
  const total = Math.max(1, Math.round(lider.total * frac));
  // Los golpes, coherentes con el botin: un botin medio parecido al del lider,
  // porque si no saldria "12.000 en 2 golpes" al lado de "14.000 en 19" y la
  // media por golpe lo delataria a el solo.
  const medioLider = lider.golpes > 0 ? lider.total / lider.golpes : total;
  const golpes = Math.max(1, Math.round(total / Math.max(1, medioLider * (0.85 + ruido(grupo, 'buscado-golpes') * 0.3))));
  // Y la recompensa, con la misma cuenta que la de verdad: una fraccion de lo
  // robado. Se calcula fuera, en quien llama, para no importar economia aqui.
  return { total, golpes };
}

module.exports = { fichaFalsaBuscado, ruido };
