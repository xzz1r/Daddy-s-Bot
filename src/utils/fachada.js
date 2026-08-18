const { getActiveUsers } = require('./messageCounter');

// LA FACHADA DEL OWNER.
//
// El owner principal esta fuera de los contadores: sus mensajes no se cuentan,
// que es lo que lo mantiene fuera de !count, de los tops y de las purgas. El
// efecto colateral es que cada vez que un comando de aura le enseñaba un numero
// suyo, le salia un CERO — "Mensajes hoy: 0" al que mas escribe del grupo. Es la
// contradiccion exacta que lo delata.
//
// La solucion que habia era callarse: !aura hoy no le contestaba y la linea de
// veterano no le salia. Y callarse tambien es una señal. Si escribe !aura hoy
// delante del grupo y el bot no contesta, eso se ve; y si es el unico al que no
// le sale una linea que a los demas si, eso tambien.
//
// Asi que aqui se fabrican los numeros que se le enseñan. Tres reglas:
//
//  1. SE PARECEN A LOS DEL GRUPO, no a una constante inventada. Salen de lo que
//     de verdad escribe la gente en ESE grupo, colocandolo donde estaria alguien
//     activo. Si el grupo se calma, sus cifras bajan con el; una cifra fija se
//     notaria en cuanto el resto cambiara de ritmo.
//
//  2. SON ESTABLES DENTRO DEL DIA. Dos comandos seguidos tienen que contar lo
//     mismo. Si !aura hoy dice 240 y treinta segundos despues la tirada dice
//     1.900, el que mira sabe que ninguno de los dos es real. Por eso el ruido
//     sale de un hash de (grupo, dia) y no de Math.random().
//
//  3. NO SALEN DE SU ACTIVIDAD REAL. Ni siquiera transformada: cualquier cosa
//     derivada de lo que escribe de verdad es justo lo que no se quiere
//     publicar. La unica entrada es el grupo y el calendario.

// FNV-1a, el mismo que usa pickhistory. Se necesita un ruido que sea el mismo
// durante todo el dia y distinto cada dia, y eso es exactamente un hash.
function hash(txt) {
  let h = 0x811c9dc5;
  for (let i = 0; i < txt.length; i++) {
    h ^= txt.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// Un numero entre 0 y 1, fijo para ese grupo y ese dia.
function ruido(grupo, etiqueta, dia = Math.floor(Date.now() / 86400000)) {
  return hash(`${grupo}|${etiqueta}|${dia}`) / 0x100000000;
}

// Donde se le coloca dentro del grupo: arriba, pero NUNCA el primero.
//
// Ser el numero uno de actividad es lo mas llamativo que se puede ser, y ademas
// chocaria con los tops publicos, donde el owner no aparece. El sitio comodo es
// el de alguien que claramente escribe mucho y al que nadie mira dos veces.
const SUELO = 0.55;   // por encima de la mitad de los activos
const TECHO = 0.85;   // pero por debajo del que mas escribe

// Percentil de una lista ya ordenada de menor a mayor.
function percentil(orden, p) {
  if (!orden.length) return null;
  const i = Math.min(orden.length - 1, Math.max(0, Math.round(p * (orden.length - 1))));
  return orden[i];
}

// Cuantos mensajes EN TOTAL aparenta el owner. Es el numero que va en la linea
// de "Veterano (N msgs)" de la tirada.
//
// Si el grupo no tiene datos suficientes se devuelve null y quien llama decide:
// nunca se inventa una cifra de la nada, porque una cifra sin relacion con el
// grupo es tan delatora como un cero.
async function mensajesFalsos(grupo) {
  let activos = [];
  try { activos = await getActiveUsers(grupo, 1); } catch { return null; }
  if (activos.length < 3) return null;
  const orden = activos.map((x) => x.count).sort((a, b) => a - b);
  const base = percentil(orden, SUELO + (TECHO - SUELO) * ruido(grupo, 'msgs'));
  if (!base) return null;
  // Un ±7 % encima, para que no coincida exactamente con el de nadie y para que
  // el numero se mueva un poco de un dia a otro sin dar saltos raros.
  const jitter = 1 + (ruido(grupo, 'msgs-jitter') - 0.5) * 0.14;
  return Math.max(1, Math.round(base * jitter));
}

// Cuantos mensajes aparenta llevar HOY. Es el de !aura hoy, y va contra el
// contador diario, que es otra escala: se deriva del total aparente asumiendo
// que un dia normal es una fraccion pequeña de lo acumulado.
async function mensajesHoyFalsos(grupo) {
  const total = await mensajesFalsos(grupo);
  if (total === null) return null;
  // Entre el 2 % y el 5 % de lo acumulado. Con un total de 4.000 eso son 80-200
  // mensajes en un dia, que es el rango de alguien que esta en el chat sin ser
  // un caso clinico.
  const frac = 0.02 + ruido(grupo, 'hoy') * 0.03;
  return Math.max(1, Math.round(total * frac));
}

// La racha de dias que aparenta. Larga, porque el owner esta todos los dias,
// pero no absurda: un numero redondo y enorme se lee como puesto a mano.
async function rachaFalsa(grupo) {
  return 12 + Math.floor(ruido(grupo, 'racha') * 26);   // 12-37 dias
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

module.exports = { mensajesFalsos, mensajesHoyFalsos, rachaFalsa, fichaFalsaBuscado };
