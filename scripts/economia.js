// ¿La economía aguanta por todos los lados? ¿Y !aura se comporta como un casino?
//
// Casi todo se calcula EXACTO, enumerando los 81 importes grandes y los 26
// pequeños posibles, en vez de tirando dados. La primera version de esto era
// Monte Carlo y el ruido de muestreo (±0,03 por tirada con 2 millones de
// muestras) se comia justo las diferencias que se querian medir: llego a dar
// EV distintos a "miembro activo" y "admin", que por construccion tienen la
// MISMA probabilidad. Con enumeracion salen identicos, que es la verdad.
//
// Monte Carlo se reserva para lo que no tiene forma cerrada: los recorridos de
// 30 dias y los minimos que se llegan a tocar.
process.env.OWNER_NUMBER = '33600000000';

const fs = require('fs');
const R = '/home/user/Bot-';
const eco = require(R + '/src/utils/economia');
const { P_POSITIVA, ACTIVIDAD_BONO, ACTIVIDAD_TOPE, ACTIVIDAD_MSGS, P_TOPE_MIEMBRO, TIRADA,
        APUESTA, PRECIOS, BONOS, REDENCION, MULT_CASTIGO, TIRADAS_PAGADAS, bonoActividad,
        rango, ROBO, DUELO, ARRANQUE, MILLONARIO } = eco;

let fallos = 0;
const ok = (c, q) => { if (!c) { fallos++; console.log('FALLO: ' + q); } else console.log('OK    ' + q); };
const avisos = [];
const nota = (t) => { avisos.push(t); console.log('AVISO ' + t); };
const n2 = (x) => (Math.round(x * 100) / 100).toFixed(2);
const n0 = (x) => Math.round(x).toLocaleString('es-ES');

// ─── El modelo, enumerado ────────────────────────────────────────────────────
// TIRADA es [MIN, MAX] — asi lo usa aura.js, que calcula el ancho restando.
//
// El comentario de economia.js decia "40-120" y "10-35", que es como se leeria
// si fuera [suelo, ancho], y me lo crei: "corregi" estos bucles para enumerar
// 40-120 y deje el analisis calculado sobre una escala que no existe. La
// referencia buena es SIEMPRE lo que ejecuta aura.js, no lo que dice un
// comentario. Ahora economia.js documenta [min, max] y esto lee el maximo de
// donde toca.
const TOPE_GRANDE  = TIRADA.grande[1];
const TOPE_PEQUENA = TIRADA.pequena[1];
const G = [], P = [];
for (let v = TIRADA.grande[0];  v <= TOPE_GRANDE;  v++) G.push(v);
for (let v = TIRADA.pequena[0]; v <= TOPE_PEQUENA; v++) P.push(v);
// [suelo, ANCHO], no [min, max]: el maximo es suelo + ancho. Ya me confundio
// una vez y volvio a pasar — el "peor golpe" que publique salia un 50 % corto
// (decia -128 donde son -192) porque tomaba el ancho por el tope. Con nombre
// propio deja de poder confundirse.
const media = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const MEZCLA = (f) => 0.34 * media(G.map(f)) + 0.66 * media(P.map(f));   // 34 % grandes

// El premio y el castigo YA NO salen del mismo sitio. Se gana del tramo grande o
// del pequeño (34/66); se pierde SIEMPRE del pequeño, multiplicado. Aplicar el
// multiplicador a la mezcla entera —como se hacia— da un castigo medio que no
// existe y un valor esperado profundamente negativo.
// El castigo YA NO depende de pPos: es el tramo pequeño por un multiplicador
// fijo, igual para todo el mundo. Antes salia de la propia probabilidad y eso
// hacia que cualquier mejora de suerte se autodestruyera — el bono de actividad
// subia el acierto seis puntos y el valor esperado cuatro centesimas.
function perfilTirada(pPos) {
  const mult = MULT_CASTIGO;
  const gana   = MEZCLA((v) => v);
  const pierde = media(P.map((v) => Math.round(v * mult)));
  const ev = pPos * gana - (1 - pPos) * pierde;
  // Varianza exacta: E[x²] − EV².
  const ex2 = pPos * MEZCLA((v) => v * v)
            + (1 - pPos) * media(P.map((v) => Math.pow(Math.round(v * mult), 2)));
  const peor = Math.round(TOPE_PEQUENA * mult);
  return { pPos, mult, gana, pierde, ev, sigma: Math.sqrt(ex2 - ev * ev),
           peor: -peor, mejor: TOPE_GRANDE,
           // Asimetria: cuanto pesa el peor golpe frente al mejor premio. Es la
           // cifra que explica la SENSACION, y no salia en ningun sitio.
           asimetria: peor / TOPE_GRANDE };
}

// Guardia: si aura.js cambia la formula y esta copia no, todo lo de abajo miente.
{
  const src = fs.readFileSync(R + '/src/commands/aura.js', 'utf8');
  ok(/const pPos = Math\.min\(tope, base \+ plusActividad\)/.test(src), 'el modelo enumerado sigue igual al de aura.js');
  ok(/const tope = targetIsOwner \? P_POSITIVA\.owner : P_TOPE_MIEMBRO/.test(src),
    '  y el tope de un miembro sigue por debajo del owner');
  ok(/Math\.random\(\) < 0\.34/.test(src), '  y el reparto grande/pequena sigue siendo 34 %');
  ok(/Math\.round\(pequena\(\) \* MULT_CASTIGO\)/.test(src),
    '  y el castigo es el tramo pequeño por un multiplicador FIJO, igual para todos');
  ok(/if \(!dePago\) \{/.test(src),
    '  y a partir de las tiradas de pago la tirada es cara o cruz a valor esperado cero');
}

// Bonos por escribir, tambien exacto.
const CORTES = { 1: [0.60, 0.85, 0.95], 2: [0.50, 0.80, 0.95], 3: [0.40, 0.70, 0.90] };
function evBono(tier) {
  const t = BONOS[tier], c = CORTES[tier];
  const mm = ([suelo, ancho]) => suelo + ancho / 2;
  return c[0] * mm(t.win) + (c[1] - c[0]) * mm(t.bigwin) + (c[2] - c[1]) * mm(t.jackpot) + (1 - c[2]) * mm(t.mega);
}
// Cuanto da escribir N mensajes en un dia. Solo los hitos: el sueldo que hubo
// una temporada (un pago cada 10 mensajes) se quito.
function evEscribir(msgs) {
  let total = 0;
  for (let c = 1; c <= msgs; c++) {
    if      (c % 1000 === 0) total += evBono(3);
    else if (c % 500  === 0) total += evBono(2);
    else if (c % 200  === 0) total += evBono(1);
  }
  return total;
}
const desglose = (msgs) => ({ sueldo: 0, bonos: evEscribir(msgs) });

console.log('\n════ 1. valor esperado por tirada (exacto) ════\n');
console.log('  rol              p      x perder   media+   media−     EV/tirada');
// La veterania ya no es un si/no: es una escalera. Se enumera entera porque es
// justo lo que se pidio ver — que escribir mas se note tirada a tirada.
const tapa = (p) => Math.min(P_TOPE_MIEMBRO, p);
const PERFILES = [
  ['novato (0 msgs)',      tapa(P_POSITIVA.miembro)],
  ['1.000 msgs',           tapa(P_POSITIVA.miembro + bonoActividad(1000))],
  ['3.000 msgs',           tapa(P_POSITIVA.miembro + bonoActividad(3000))],
  ['veterano (tope)',      tapa(P_POSITIVA.miembro + ACTIVIDAD_TOPE)],
  ['admin',                tapa(P_POSITIVA.admin)],
  ['admin veterano',       tapa(P_POSITIVA.admin + ACTIVIDAD_TOPE)],
  ['owner',                P_POSITIVA.owner],
];
const M = {};
for (const [nombre, p] of PERFILES) {
  const r = perfilTirada(p);
  M[nombre] = r;
  console.log(`  ${nombre.padEnd(15)} ${(p * 100).toFixed(0)}%     x${n2(r.mult)}    ${n2(r.gana).padStart(6)}   ${n2(r.pierde).padStart(6)}     ${'+' + n2(r.ev)}`);
}
for (const [nombre] of PERFILES) {
  ok(M[nombre].ev > 0, `${nombre}: el valor esperado es positivo (+${n2(M[nombre].ev)}/tirada), como se pidio`);
}
// Antes aqui se comprobaba que un miembro con bono y un admin tuvieran el MISMO
// valor esperado: era la prueba de que la formula se autoequilibraba y de que
// ninguna mejora de suerte podia romperla. Esa propiedad se ha quitado a
// proposito, porque era justo la que hacia inutil el bono de actividad.
//
// Lo que se comprueba ahora es lo contrario y es lo que se pidio: que tener mas
// suerte SE NOTE en el bolsillo, y que la escalera sea monotona.
for (let i = 1; i < 4; i++) {
  ok(M[PERFILES[i][0]].ev > M[PERFILES[i - 1][0]].ev,
    `${PERFILES[i][0].padEnd(18)} gana mas por tirada que ${PERFILES[i - 1][0]} (+${n2(M[PERFILES[i][0]].ev)} contra +${n2(M[PERFILES[i - 1][0]].ev)})`);
}
ok(M['owner'].ev > M['veterano (tope)'].ev,
  `  y el owner sigue por encima del miembro mas veterano (+${n2(M['owner'].ev)} contra +${n2(M['veterano (tope)'].ev)})`);
ok(P_TOPE_MIEMBRO < P_POSITIVA.owner,
  `  el tope de un miembro (${(P_TOPE_MIEMBRO * 100).toFixed(0)} %) no llega al del owner (${(P_POSITIVA.owner * 100).toFixed(0)} %): el amaño aguanta`);
// Todos pierden LO MISMO. Es la correccion de fondo: la suerte decide cada
// cuanto pierdes, no cuanto.
const perdidas = new Set(Object.values(M).map(r => Math.round(r.pierde * 100)));
ok(perdidas.size === 1,
  `  y todos pierden exactamente lo mismo de media (${n2(M['novato (0 msgs)'].pierde)}): la suerte decide CADA CUANTO, no CUANTO`);
// EL TOPE YA NO ES POR TIRADA, ES POR DIA. Antes se exigia que el valor esperado
// de una tirada fuese calderilla, porque no habia nada mas frenando: con 960
// tiradas diarias posibles, cualquier ventaja por tirada se multiplicaba por mil.
//
// Ahora el freno es TIRADAS_PAGADAS: solo las primeras del dia pagan, y de ahi
// en adelante la tirada es cara o cruz a valor esperado cero. Eso permite que
// una tirada pague de verdad y a la vez pone un techo duro al dia, que es lo
// que hay que medir.
const maxEv = Math.max(...Object.values(M).map(r => r.ev));
const techoDia = maxEv * TIRADAS_PAGADAS;
console.log(`\n  Tope diario de tirar: ${TIRADAS_PAGADAS} tiradas de pago x ${n2(maxEv)} = ${n0(techoDia)} de aura.`);
console.log(`  De la ${TIRADAS_PAGADAS + 1}ª en adelante el valor esperado es CERO, tire quien tire y cuanto tire.`);
ok(techoDia < MILLONARIO * 0.08,
  `  ese techo es el ${(100 * techoDia / MILLONARIO).toFixed(1)} % de una fortuna al dia: no hay imprenta ni dandole 24 h`);

console.log('\n════ 2. ¿se comporta como un casino? ════\n');
// El perfil de referencia es el NOVATO: es el caso peor y el que mas gente vive.
const m = M['novato (0 msgs)'];
console.log(`  Un miembro gana ${(m.pPos * 100).toFixed(0)} de cada 100 tiradas.`);
console.log(`  Gana ${n2(m.gana)} de media; pierde ${n2(m.pierde)}. Perder pesa x${n2(m.pierde / m.gana)}.`);
console.log(`  Peor golpe posible: ${m.peor}. Mejor: +${m.mejor}. Asimetria: x${n2(m.asimetria)}.`);
console.log(`  Desviacion tipica por tirada: ${n2(m.sigma)} — el EV es ${n2(m.ev)}.\n`);

ok(m.pPos > 0.55, `se gana MAS veces de las que se pierde (${(m.pPos * 100).toFixed(0)} %) — esa es la sensacion que engancha`);
ok(m.pierde > m.gana * 1.4, `  pero perder duele x${n2(m.pierde / m.gana)}, y eso es lo que impide acumular a base de tirar`);
// Aqui se exigia que la ganancia fuera INVISIBLE: que hicieran falta miles de
// tiradas para despegarse del ruido, o sea que la tirada se viviera como puro
// azar. Esa propiedad se ha quitado a proposito — se pidio que tirar pagara —
// y ahora el freno es el tope diario, no la insignificancia del premio.
//
// Lo que si tiene que seguir cumpliendose es que una tirada suelta siga siendo
// una sorpresa: el vaiven tiene que pesar mucho mas que la ventaja, o el
// comando deja de ser un juego y pasa a ser un cajero.
const tiradasParaNotarlo = Math.pow(m.sigma / m.ev, 2);
console.log(`  Hacen falta ~${n0(tiradasParaNotarlo)} tiradas para que la ganancia media supere al ruido.`);
ok(m.sigma > m.ev * 10,
  `una tirada suelta sigue siendo una sorpresa: el vaiven (${n2(m.sigma)}) pesa x${n2(m.sigma / m.ev)} sobre la ventaja (${n2(m.ev)})`);

// La diferencia honesta con un casino de verdad.
console.log(`\n  Frente a un casino real: alli el RTP es 95-97 % (pierdes a la larga).`);
console.log(`  Aqui el "RTP" es ${(100 * (1 + m.ev / (m.pPos * m.gana + (1 - m.pPos) * m.pierde))).toFixed(2)} % — por encima de 100, el jugador gana.`);
console.log(`  Lo de casino es la FORMA (rachas, vaiven, premios variables), no la ventaja de la casa.`);
console.log(`  Los que si son casino de verdad — con la casa ganando — son !aura apostar y !robo (seccion 6).`);

console.log('\n════ 3. inflacion: ¿escribir sigue mandando? ════\n');
const COOLDOWN_S = 90;
const TECHO_DIA = Math.floor(86400 / COOLDOWN_S);
console.log('  perfil                     tiradas/dia   por tirar   sueldo   bonos   total/dia');
const ESCENARIOS = [
  ['fantasma (30 msgs)',        3,   30],
  ['normal (200 msgs)',        10,  200],
  ['activo (500 msgs)',        25,  500],
  ['muy activo (1200 msgs)',   50, 1200],
  ['solo spamea 8 h',         320,  200],
  ['solo spamea 24 h',    TECHO_DIA, 200],
];
const filas = [];
// Solo las TIRADAS_PAGADAS primeras del dia cuentan: de ahi en adelante el
// valor esperado es cero exacto. Sin esto la tabla mentia y daba 2.099 al dia
// al que le diera al boton 24 h, que es justo lo que el tope impide.
const tirandoAlDia = (tiradas, p) => Math.min(tiradas, TIRADAS_PAGADAS) * perfilTirada(p).ev;
for (const [nombre, tiradas, msgs] of ESCENARIOS) {
  const p = Math.min(P_TOPE_MIEMBRO, P_POSITIVA.miembro + bonoActividad(msgs * 20));
  const tirando = tirandoAlDia(tiradas, p);
  const escribiendo = evEscribir(msgs);
  const d = desglose(msgs);
  filas.push({ nombre, tiradas, tirando, escribiendo, ...d, total: tirando + escribiendo });
  console.log(`  ${nombre.padEnd(24)}  ${String(tiradas).padStart(6)}      ${('+' + n0(tirando)).padStart(6)}   ${n0(d.sueldo).padStart(6)}  ${n0(d.bonos).padStart(6)}   ${n0(tirando + escribiendo).padStart(8)}`);
}
console.log(`\n  (el cooldown de ${COOLDOWN_S}s pone el techo fisico en ${TECHO_DIA} tiradas/dia)`);

const f = (pre) => filas.find(x => x.nombre.startsWith(pre));
// ESCRIBIR SIGUE MANDANDO, PERO POR OTRA VIA, y conviene decirlo claro en vez
// de dejar el aserto viejo pasando por casualidad.
//
// Antes: escribir daba cinco veces mas que tirar, punto. Ahora una parte de lo
// que da escribir SE COBRA TIRANDO, porque la suerte de tus tiradas depende de
// cuantos mensajes llevas. La pregunta correcta ya no es "cuanto da tirar" sino
// "puede alguien vivir de tirar SIN escribir".
//
// Y la respuesta la fija el tope: un novato que no escribe nunca saca como mucho
// ocho tiradas de pago al dia. Eso es lo que hay que medir.
const novato = perfilTirada(P_POSITIVA.miembro).ev * TIRADAS_PAGADAS;
console.log(`\n  Un novato que no escribe jamas saca ${n0(novato)} al dia como techo absoluto.`);
ok(novato < f('activo').escribiendo,
  `  eso es menos que lo que da escribir 500 mensajes (${n0(f('activo').escribiendo)}): no se puede vivir de tirar sin escribir`);
ok(f('muy activo').total > f('normal').total * 3,
  `  y escribir sigue siendo lo que separa a la gente: 1200 msgs dan ${n0(f('muy activo').total)} al dia contra ${n0(f('normal').total)} de 200`);
ok(Math.abs(f('solo spamea 24').tirando - f('solo spamea 8').tirando) < 0.01,
  `  darle al boton 24 h no da mas que darselo 8 (${n0(f('solo spamea 24').tirando)} en los dos casos): el tope corta en seco`);
// El borde teorico SI rompe la regla, y hay que decirlo en vez de esconderlo
// detras de un aserto complaciente: 960 tiradas es darle al boton cada 90 s
// durante 24 h sin fallar una. Ningun humano, pero un script si.
// El agujero del script que le da al boton cada 90 s las 24 h esta CERRADO: con
// el tope diario, 960 tiradas dan exactamente lo mismo que 8. Antes era la
// tension que quedaba abierta en este informe.
ok(f('solo spamea 24').tirando < MILLONARIO * 0.05,
  `automatizar el boton ya no sirve de nada: 24 h dan ${n0(f('solo spamea 24').tirando)}, el ${(100 * f('solo spamea 24').tirando / MILLONARIO).toFixed(1)} % de una fortuna`);

console.log('\n════ 4. varianza y ruina (Monte Carlo, 4.000 vidas) ════\n');
function rollAura(pPos) {
  const mult = MULT_CASTIGO;
  const g = () => rango([TIRADA.grande[0], TIRADA.grande[1] - TIRADA.grande[0]]);
  const q = () => rango([TIRADA.pequena[0], TIRADA.pequena[1] - TIRADA.pequena[0]]);
  if (Math.random() < pPos) return Math.random() < 0.34 ? g() : q();
  // El castigo sale SIEMPRE del tramo pequeño, igual que en aura.js. Esta copia
  // seguia castigando sobre el grande y, con el multiplicador reescalado, dejaba
  // a todo el mundo en -8.000 tras 30 dias: una ruina que no existe.
  return -Math.round(q() * mult);
}
// La tirada que ya no paga: mismo importe a los dos lados, 50 %. EV cero exacto.
function rollNeutra() {
  const g = () => rango([TIRADA.grande[0], TIRADA.grande[1] - TIRADA.grande[0]]);
  const q = () => rango([TIRADA.pequena[0], TIRADA.pequena[1] - TIRADA.pequena[0]]);
  const cuanto = Math.random() < 0.34 ? g() : q();
  return Math.random() < 0.5 ? cuanto : -cuanto;
}
function bonoReal(tier, aura) {
  if (aura < 0) {
    const c = tier === 3 ? 0.15 : tier === 2 ? 0.08 : 0.04;
    if (Math.random() < c) return rango(REDENCION[tier]);
  }
  const t = BONOS[tier], r = Math.random(), c = CORTES[tier];
  if (r < c[0]) return rango(t.win);
  if (r < c[1]) return rango(t.bigwin);
  if (r < c[2]) return rango(t.jackpot);
  return rango(t.mega);
}
// El precio medio de un comando, para poder simular que la gente GASTA.
//
// Hasta ahora esta simulacion daba por hecho que nadie compra nada, y con todo
// gratis eso era casi verdad. Desde que cobra el bot entero es una ficcion que
// exagera el techo: el mismo recorrido daba 10.642 a los 30 dias para un activo
// — mas que una fortuna entera — solo porque nadie tocaba un comando.
//
// Se simulan los dos extremos honestos: sin gastar nada (el techo teorico) y
// gastando la mitad de lo que se puede permitir (el uso realista de alguien que
// juega con el bot pero no lo agota).
const PRECIO_MEDIO = Object.values(PRECIOS).reduce((a, b) => a + b, 0) / Object.keys(PRECIOS).length;

function recorrido(tiradas, msgs, gastaFraccion) {
  const p = Math.min(0.80, P_POSITIVA.miembro + (msgs >= eco.ACTIVIDAD_MSGS ? ACTIVIDAD_BONO : 0));
  const finales = [], minimos = [];
  for (let v = 0; v < 4000; v++) {
    let aura = ARRANQUE, min = aura;
    for (let d = 0; d < 30; d++) {
      const alEmpezar = aura;
      // Solo las TIRADAS_PAGADAS primeras usan la probabilidad del jugador; el
      // resto son cara o cruz simetrica, igual que en aura.js.
      for (let i = 0; i < tiradas; i++) {
        aura += i < TIRADAS_PAGADAS ? rollAura(p) : rollNeutra();
        if (aura < min) min = aura;
      }
      for (let c = 1; c <= msgs; c++) {
        const t = c % 1000 === 0 ? 3 : c % 500 === 0 ? 2 : c % 200 === 0 ? 1 : 0;
        if (t) aura += bonoReal(t, aura);
      }
      // Gasta una fraccion de lo GANADO ese dia, en comandos enteros y solo si
      // le llega: el bot no fia (SALDO_MINIMO), asi que nadie compra en rojo.
      if (gastaFraccion > 0) {
        const ganado = aura - alEmpezar;
        let compras = Math.floor((ganado * gastaFraccion) / PRECIO_MEDIO);
        while (compras-- > 0 && aura >= PRECIO_MEDIO) aura -= PRECIO_MEDIO;
        if (aura < min) min = aura;
      }
    }
    finales.push(aura); minimos.push(min);
  }
  finales.sort((a, b) => a - b); minimos.sort((a, b) => a - b);
  return { finales, minimos };
}

for (const [etiqueta, tiradas, msgs] of [['normal (10 tiradas, 200 msgs)', 10, 200], ['activo (25 tiradas, 500 msgs)', 25, 500]]) {
  const { finales, minimos } = recorrido(tiradas, msgs, 0);
  const gastando = recorrido(tiradas, msgs, 0.5).finales;
  const pc = (arr, q) => arr[Math.floor(arr.length * q)];
  console.log(`  ${etiqueta} — tras 30 dias:`);
  console.log(`     peor 5 %: ${n0(pc(finales, 0.05))}   mediana: ${n0(pc(finales, 0.5))}   mejor 5 %: ${n0(pc(finales, 0.95))}`);
  console.log(`     punto mas bajo tocado (mediana): ${n0(pc(minimos, 0.5))}   (peor 5 %: ${n0(pc(minimos, 0.05))})`);
  console.log(`     gastando la mitad de lo que gana — mediana: ${n0(pc(gastando, 0.5))}\n`);
  ok(pc(gastando, 0.5) < MILLONARIO,
    `  ${etiqueta}: quien usa el bot no se hace millonario en un mes (${n0(pc(gastando, 0.5))} de ${n0(MILLONARIO)})`);
  ok(pc(finales, 0.5) > ARRANQUE, `  ${etiqueta}: la mediana acaba por encima del arranque (${n0(pc(finales, 0.5))})`);
  ok(pc(finales, 0.05) > -MILLONARIO * 0.4, `  y ni el 5 % con peor suerte cae a un pozo sin retorno (${n0(pc(finales, 0.05))})`);
}
let red = 0;
for (let i = 0; i < 200000; i++) if (bonoReal(3, -500) >= REDENCION[3][0]) red++;
ok(red / 200000 > 0.10, `quien esta en negativo tiene rescate real: el ${(100 * red / 200000).toFixed(1)} % de los bonos tier 3 son de redencion`);

console.log('\n════ 5. ¿que crea y que destruye aura? ════\n');
const src = (x) => fs.readFileSync(`${R}/src/commands/${x}`, 'utf8');
ok(/transferAura/.test(src('dar.js')), '!dar usa transferAura: suma cero exacta, lo que sale de uno entra en el otro');
ok(/addAura\(jid, winner, \+d\.stake\)[\s\S]{0,120}addAura\(jid, loser, -d\.stake\)/.test(src('duel.js')),
  '!duel: el ganador cobra exactamente lo que paga el perdedor, suma cero');

// !robo NO es suma cero, y es a proposito. En exito y en desastre el aura pasa
// de una cuenta a otra; en el FALLO normal el ladron paga la multa y la victima
// no toca nada, asi que ese aura sale del sistema. Es un sumidero, no un
// agujero: juega a favor de la estabilidad, no en contra.
const roboSrc = src('robo.js');
ok(/const vNew = clave === 'desastre' \? await addAura\(jid, target, \+monto\) : null;/.test(roboSrc),
  '!robo: en el fallo normal la victima NO cobra — ese aura se destruye (sumidero deliberado)');
{
  const EXITO = { maestro: [0.12, 1.8], limpio: [0.55, 1.0], parcial: [0.33, 0.4] };
  const FALLOS = { fallo: [0.70, -0.5], desastre: [0.30, -1.0] };
  const pr = eco.ROBO_BASE.miembro, stake = 50;
  let neto = 0;
  for (const [, [w, mult]] of Object.entries(EXITO)) neto += 0;                 // transferencia pura
  for (const [k, [w, mult]] of Object.entries(FALLOS)) {
    if (k !== 'desastre') neto -= (1 - pr) * w * Math.round(stake * Math.abs(mult));
  }
  console.log(`  Con una apuesta de ${stake}, cada robo DESTRUYE ${n2(-neto)} de aura de media.`);
  console.log(`  Eso compensa ${Math.round(-neto / m.ev)} tiradas de !aura.`);
  ok(neto < 0, `  robar drena la economia en vez de inflarla: ${n2(neto)} por intento`);
  // Se comparaba contra el valor de UNA tirada, y eso solo tenia sentido cuando
  // una tirada valia calderilla (0,41). Ahora una tirada de pago vale 2,19 para
  // un novato, asi que la cifra bailaba sin querer decir nada. Lo que importa es
  // si el sumidero pesa frente al DIA de alguien, que es la unidad en la que se
  // vive la economia.
  const diaNovato = perfilTirada(P_POSITIVA.miembro).ev * TIRADAS_PAGADAS;
  ok(-neto > diaNovato * 0.5,
    `  y un robo fallido quema ${n2(-neto)}, mas de medio dia de tirar de un novato (${n0(diaNovato)}): sigue siendo el sumidero mas fuerte`);
}
ok(ROBO.techo <= 200 && DUELO.techo <= 300, `ningun movimiento suelto pasa de ${ROBO.techo} (robo) / ${DUELO.techo} (duelo)`);
ok(ROBO.techo / MILLONARIO < 0.05, `  un robo maximo es el ${(100 * ROBO.techo / MILLONARIO).toFixed(0)} % de una fortuna: un comando no decide el ranking`);

console.log('\n════ 6. lo que SI es casino: la casa gana ════\n');
for (const [rol, p] of Object.entries(APUESTA.p)) {
  const ev = p * APUESTA.multiplicador - 1;
  console.log(`  !aura apostar (${rol.padEnd(7)}): acierta ${(p * 100).toFixed(0)} % → EV ${(ev >= 0 ? '+' : '') + (ev * 100).toFixed(0)} % de lo apostado`);
  if (rol !== 'owner') ok(ev < 0, `  ${rol}: la casa se queda el ${(-ev * 100).toFixed(0)} % — este es el sumidero que compensa el goteo de la tirada`);
}
console.log(`  !robo (miembro): acierta ${(eco.ROBO_BASE.miembro * 100).toFixed(0)} % como mucho → sale a perder`);
ok(eco.ROBO_BASE.miembro < 0.5, '  robar es desfavorable de partida, como una maquina de verdad');
// El drenaje de una apuesta frente a lo que da un dia de escribir.
//
// Antes se comparaba la VENTAJA DE LA CASA de una apuesta minima (24) con el
// ingreso diario de un miembro normal, y pasaba solo porque ese ingreso era
// ridiculo (20/dia). Con el sueldo puesto deja de pasar, y esta bien que deje
// de pasar: la ventaja de la casa es un drenaje agregado, lento y a escala de
// grupo — no es lo que siente el que apuesta.
//
// Lo que se mide ahora es lo que de verdad duele: cuando PIERDES, te vas con la
// mitad de lo que pusiste. Esa es la cifra que tiene que pesar mas que un dia
// de escribir, o apostar deja de ser una decision.
const casa = APUESTA.minimo * APUESTA.fraccion * (1 - APUESTA.p.miembro * 2);
const perdidaReal = APUESTA.minimo * APUESTA.fraccion;
console.log(`  Una apuesta desde el minimo (${APUESTA.minimo}) pone ${n0(perdidaReal)} en la mesa; la casa se queda ${n2(casa)} de media.`);
ok(perdidaReal > f('normal').total,
  `  perder la apuesta mas pequeña cuesta mas que un dia entero escribiendo (${n0(perdidaReal)} contra ${n0(f('normal').total)}): apostar es una decision, no un tramite`);
ok(casa > 0, `  y a la larga la casa gana: cada apuesta minima drena ${n2(casa)} del grupo`);

console.log('\n════ 7. sumideros: ¿los precios muerden? ════\n');
console.log(`  precios: ${Object.entries(PRECIOS).map(([k, v]) => `${k}=${v}`).join('  ')}\n`);
console.log('  perfil                    aura/dia   stickers/dia   canciones/dia');
for (const nombre of ['fantasma', 'normal', 'activo', 'muy activo']) {
  const x = f(nombre);
  console.log(`  ${x.nombre.padEnd(24)}  ${n0(x.total).padStart(7)}   ${(x.total / PRECIOS.sticker).toFixed(1).padStart(10)}   ${(x.total / PRECIOS.play).toFixed(1).padStart(13)}`);
}
ok(f('muy activo').total / PRECIOS.sticker < 40, `ni el mas activo puede spamear sin fin: ${(f('muy activo').total / PRECIOS.sticker).toFixed(0)} stickers al dia como techo`);
ok(ARRANQUE / PRECIOS.sticker >= 5, `el arranque (${ARRANQUE}) da para ${Math.floor(ARRANQUE / PRECIOS.sticker)} stickers: nadie entra al grupo sin poder tocar nada`);

// ─── ¿alcanza el sueldo? ─────────────────────────────────────────────────────
//
// La pregunta que importa desde que todo cuesta: cuantas cosas al dia puede
// pagar cada perfil. Un precio caro no es un problema; un ingreso que no llega
// a NINGUN precio si, porque saca a esa persona del bot para siempre.
const precioMedio = Object.values(PRECIOS).reduce((a, b) => a + b, 0) / Object.keys(PRECIOS).length;
const barato = Math.min(...Object.values(PRECIOS));
console.log(`\n  precio medio ${n0(precioMedio)} · el mas barato ${barato} · el mas caro ${Math.max(...Object.values(PRECIOS))}\n`);
console.log('  perfil                    aura/dia   comandos al precio medio');
for (const nombre of ['fantasma', 'normal', 'activo', 'muy activo']) {
  const x = f(nombre);
  console.log(`  ${x.nombre.padEnd(24)}  ${n0(x.total).padStart(7)}   ${(x.total / precioMedio).toFixed(1).padStart(12)}`);
}
// El umbral es UNO, no dos, y la diferencia importa.
//
// Lo puse en dos cuando los ingresos estaban altos y era una cifra cómoda, no
// una regla. La regla de verdad es la que arreglaba el agujero original: nadie
// puede quedarse SIN PODER TOCAR EL BOT. Con uno al día un miembro normal
// elige una cosa y se queda con ganas, que es exactamente lo que tiene que
// pasar para que un precio se note. Con dos ya no elegía nada.
//
// Si esto vuelve a subir por encima de dos sin que se haya pedido, es que los
// ingresos se han vuelto a ir de las manos.
ok(f('normal').total >= precioMedio,
  `un miembro normal (200 msgs) paga ${(f('normal').total / precioMedio).toFixed(1)} comandos al dia: elige uno y se queda con ganas`);
ok(f('normal').total < precioMedio * 3,
  `  y no llega a tres (${(f('normal').total / precioMedio).toFixed(1)}): los precios siguen mordiendo`);
// El agujero original era que por debajo de 200 mensajes al dia no se cobraba
// NADA por ningun concepto. Lo tapo un sueldo, el sueldo se quito, y ahora lo
// tapa la tirada: cualquiera puede tirar aunque no escriba una linea.
ok(f('fantasma').tirando > 0,
  `y el que apenas escribe cobra tirando (${n0(f('fantasma').tirando)}/dia): nadie se queda fuera del bot por no llegar a un hito`);
// La tension que queda, y hay que decirla: 30 mensajes al dia siguen sin dar
// para casi nada. Es deliberado — el bot es de los que hablan — pero no es lo
// mismo "poco" que "nada", y ahora es poco.
const diasFantasma = barato / f('fantasma').total;
if (diasFantasma > 1) {
  nota(`un fantasma (30 msgs/dia) tarda ${diasFantasma.toFixed(1)} dias en pagar el comando mas barato (${barato}): puede jugar, pero eligiendo mucho`);
}

console.log('\n════ 8. el owner no rompe la escala ════\n');
const o = M['owner'];
console.log(`  Gana el ${(o.pPos * 100).toFixed(0)} % de las tiradas, pero su peor golpe es ${o.peor} (el de un miembro, ${m.peor}).`);
// Los dos asertos que habia aqui median el modelo VIEJO y hay que cambiarlos,
// no forzarlos: decian que el owner ganaba poco mas que un miembro por tirada y
// que lo pagaba con derrotas mucho mas duras. Las dos cosas eran consecuencia de
// que el castigo saliera de la propia probabilidad, que es justo lo que se ha
// quitado — hacia inutil el bono de veterania para todo el mundo, owner incluido.
//
// Ahora el reparto es explicito: TODOS pierden lo mismo y la suerte decide cada
// cuanto. El owner gana mas por tirada, que era el proposito del amaño desde el
// principio, y lo que impide que eso sea una imprenta es el tope diario.
ok(o.ev > m.ev, `  gana ${n2(o.ev)} por tirada contra ${n2(m.ev)} de un novato: el amaño se nota, que para eso esta`);
ok(Math.abs(o.peor) === Math.abs(m.peor),
  `  y pierde exactamente lo mismo que cualquiera cuando pierde (${o.peor}): el castigo ya no depende de la suerte de nadie`);
ok(o.ev * TIRADAS_PAGADAS < MILLONARIO * 0.05,
  `  su techo diario tirando es ${n0(o.ev * TIRADAS_PAGADAS)}, el ${(100 * o.ev * TIRADAS_PAGADAS / MILLONARIO).toFixed(1)} % de una fortuna: ni el amaño imprime`);

console.log('\n' + '═'.repeat(66));
if (avisos.length) {
  console.log('\nTENSIONES (no son fallos, son decisiones que conviene mirar):');
  for (const a of avisos) console.log('  · ' + a);
}
console.log(fallos ? `\n${fallos} puntos rotos` : '\nestabilidad: cuadra por todos los angulos medidos');
process.exit(fallos ? 1 : 0);
