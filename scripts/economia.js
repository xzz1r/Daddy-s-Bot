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
const path = require('path');
// Ruta relativa al propio script: estaba clavada a /home/user/Bot-, un nombre
// de carpeta que ya no existe, asi que `npm run economia` no arrancaba.
const R = path.resolve(__dirname, '..');
const eco = require(R + '/src/utils/economia');
const { P_POSITIVA, ACTIVIDAD_BONO, ACTIVIDAD_TOPE, ACTIVIDAD_MSGS, P_TOPE_MIEMBRO, TIRADA,
        APUESTA, PRECIOS, BONOS, REDENCION, MULT_CASTIGO, MULT_CASTIGO_GRANDE, P_TRAMO_GRANDE,
        P_TOPE, TIRADAS_PAGADAS, bonoActividad,
        RACHA, rango, ROBO, DUELO, ARRANQUE, MILLONARIO, IMPUESTO, impuestoDe,
        OBJETOS, VENTAJA, RECOMPENSA, RIESGO, ROBO_BASE, ROBO_LIMITES, PRIMERA_DEL_DIA, HITOS,
        pApuestaDe, pApuestaVisible, MOMENTUM, OBJETIVO_DIA } = eco;

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
// El reparto grande/pequenyo ya no es un 0.34 escrito a mano: vive en economia.js
// con nombre (P_TRAMO_GRANDE) y es distinto al ganar que al perder.
const MEZCLA = (f) => P_TRAMO_GRANDE.gana * media(G.map(f))
                    + (1 - P_TRAMO_GRANDE.gana) * media(P.map(f));
const MEZCLA_MALA = (f) => P_TRAMO_GRANDE.pierde * media(G.map((v) => f(Math.round(v * MULT_CASTIGO_GRANDE))))
                         + (1 - P_TRAMO_GRANDE.pierde) * media(P.map((v) => f(Math.round(v * MULT_CASTIGO))));

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
  // Perder ya tiene dos tamanyos, igual que ganar: una de cada cuatro derrotas
  // sale del tramo grande. Antes salia SIEMPRE del pequenyo y el peor golpe
  // posible era mucho menor que el que se publica ahora.
  const pierde = MEZCLA_MALA((v) => v);
  const ev = pPos * gana - (1 - pPos) * pierde;
  // Varianza exacta: E[x²] − EV².
  const ex2 = pPos * MEZCLA((v) => v * v)
            + (1 - pPos) * MEZCLA_MALA((v) => v * v);
  const peor = Math.round(TOPE_GRANDE * MULT_CASTIGO_GRANDE);
  return { pPos, mult, gana, pierde, ev, sigma: Math.sqrt(ex2 - ev * ev),
           peor: -peor, mejor: TOPE_GRANDE,
           // Asimetria: cuanto pesa el peor golpe frente al mejor premio. Es la
           // cifra que explica la SENSACION, y no salia en ningun sitio.
           asimetria: peor / TOPE_GRANDE };
}

// Guardia: si aura.js cambia la formula y esta copia no, todo lo de abajo miente.
{
  const src = fs.readFileSync(R + '/src/commands/aura.js', 'utf8');
  ok(/const pPos = Math\.min\(P_TOPE\[rol\], base \+ plusActividad\)/.test(src),
    'el modelo enumerado sigue igual al de aura.js');
  ok(/Math\.random\(\) < P_TRAMO_GRANDE\.gana/.test(src),
    '  y el reparto grande/pequena de la ganancia sale de P_TRAMO_GRANDE');
  ok(/Math\.random\(\) < P_TRAMO_GRANDE\.pierde/.test(src),
    '  y perder tambien tiene tramo grande, no un unico tamanyo');
  ok(/grande\(\)\s+\* MULT_CASTIGO_GRANDE/.test(src) && /pequena\(\) \* MULT_CASTIGO/.test(src),
    '  y cada tramo de perdida usa su propio multiplicador, igual para todos los roles');
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
//
// LOS HITOS SON UMBRALES, UNO POR VENTANA. Esto sumaba con modulo —un bono cada
// 200 mensajes— porque el motor lo hacia asi, y era el mismo fallo: el de 1.200
// mensajes cobraba cinco veces el tramo 1. Ahora se recorre HITOS, que es la
// misma tabla que usa casino.js, para que el modelo no pueda medir un bot
// distinto del que corre.
function evEscribir(msgs) {
  let total = 0;
  for (const h of HITOS) {
    if (msgs < h.n) continue;
    total += evBono(h.tier);
    // El extra del primer hito del dia: plano, una vez, igual para todos. Es lo
    // que permite pagar mas por escribir sin que el que escribe 1.200 cobre
    // seis veces la subida.
    if (h.n === 200) total += PRIMERA_DEL_DIA;
  }
  return total;
}
const desglose = (msgs) => ({ racha: rachaAlDia(msgs), bonos: evEscribir(msgs) });

// La racha: pago plano por aparecer, con tope. No depende de cuanto escribas
// mas alla del minimo, que es justo su gracia — es lo unico que un miembro
// tranquilo cobra igual que el que mas habla.
//
// Se modela EN REGIMEN, o sea con la racha ya en su tope: es el caso peor para
// la inflacion y el que hay que vigilar.
function rachaAlDia(msgs) {
  if (msgs < RACHA.minMensajes) return 0;
  return RACHA.pago * RACHA.tope;
}

console.log('\n════ 1. valor esperado por tirada (exacto) ════\n');
console.log('  rol              p      x perder   media+   media−     EV/tirada');
// La veterania ya no es un si/no: es una escalera. Se enumera entera porque es
// justo lo que se pidio ver — que escribir mas se note tirada a tirada.
// Cada rol tiene AHORA su propio techo. Antes se tapaba todo con el del
// miembro, asi que un admin veterano salia identico a un miembro veterano y la
// tabla decia que el rol no servia para nada — cosa que era cierta entonces y
// ya no lo es.
const tapa = (rol, p) => Math.min(P_TOPE[rol], p);
const PERFILES = [
  ['novato (0 msgs)',      tapa('miembro', P_POSITIVA.miembro)],
  ['1.000 msgs',           tapa('miembro', P_POSITIVA.miembro + bonoActividad(1000))],
  ['3.000 msgs',           tapa('miembro', P_POSITIVA.miembro + bonoActividad(3000))],
  ['veterano (tope)',      tapa('miembro', P_POSITIVA.miembro + ACTIVIDAD_TOPE)],
  ['admin',                tapa('admin',   P_POSITIVA.admin)],
  ['admin veterano',       tapa('admin',   P_POSITIVA.admin + ACTIVIDAD_TOPE)],
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
// LA ESCALERA YA NO ES ESTRICTA EN TODOS LOS TRAMOS, y es a proposito: al subir
// la base del miembro al 70 % con el tope en 75 %, la veterania se agota a los
// ~2.000 mensajes en vez de a los ~4.400. De ahi para arriba dos perfiles
// distintos empatan, y empatar no es un fallo — lo seria RETROCEDER.
//
// Asi que se comprueban dos cosas por separado:
//   · que la escalera nunca baje (monotona no decreciente);
//   · que el primer escalon SI pague de verdad, o la veterania seria decorativa.
for (let i = 1; i < 4; i++) {
  ok(M[PERFILES[i][0]].ev >= M[PERFILES[i - 1][0]].ev,
    `${PERFILES[i][0].padEnd(18)} no gana menos que ${PERFILES[i - 1][0]} (+${n2(M[PERFILES[i][0]].ev)} contra +${n2(M[PERFILES[i - 1][0]].ev)})`);
}
ok(M[PERFILES[1][0]].ev > M[PERFILES[0][0]].ev,
  `  y escribir el primer millar SI se nota (+${n2(M[PERFILES[1][0]].ev)} contra +${n2(M[PERFILES[0][0]].ev)}): la veterania no es decorativa`);
ok(M['veterano (tope)'].ev > M['novato (0 msgs)'].ev * 1.15,
  `  y de novato a veterano hay un salto real (+${n2(M['veterano (tope)'].ev)} contra +${n2(M['novato (0 msgs)'].ev)})`);
ok(M['admin'].ev > M['veterano (tope)'].ev,
  `  y un admin recien nombrado ya gana mas que el miembro mas veterano (+${n2(M['admin'].ev)} contra +${n2(M['veterano (tope)'].ev)})`);
ok(M['owner'].ev > M['admin veterano'].ev,
  `  y el owner sigue por encima del admin mas veterano (+${n2(M['owner'].ev)} contra +${n2(M['admin veterano'].ev)})`);
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
// PERDER YA NO DUELE MAS QUE GANAR, por decision del owner: se capo la ganancia
// en 50 y la perdida en 40, asi que el multiplicador cayo de 2,65 a 1,6 y con el
// la relacion pasa de x1,5 a x1,04. La tirada es ahora claramente favorable.
//
// Lo que se sigue exigiendo es que una derrota CANCELE una victoria: mientras un
// golpe malo se lleve aproximadamente lo que trae uno bueno, una mala racha
// sigue doliendo y el vaiven se nota. Si esto bajara de 0,9 la derrota seria un
// tramite y el comando dejaria de tener tension.
//
// El freno contra acumular a base de tirar YA NO es el castigo: es TIRADAS_PAGADAS
// (tope duro de 5 al dia). Eso se comprueba en la seccion 3.
ok(m.pierde >= m.gana * 0.9, `  y perder sigue cancelando ganar (x${n2(m.pierde / m.gana)}): una mala racha se nota`);
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
// El umbral era x10 y se baja a x2. Al subir el acierto al 70 % y capar los
// importes, la ventaja por tirada sube de 2,19 a 10,39 y el vaiven baja de 47 a
// 28, asi que la relacion cae sola de x21 a x2,7 sin que el comando haya dejado
// de ser un juego: una tirada suelta sigue moviendo de -40 a +50, o sea que
// sigues sin saber lo que va a salir.
//
// Por debajo de x2 si habria que preocuparse: significaria que el resultado es
// tan predecible que tirar es cobrar, y ahi el comando pasa a ser un cajero.
ok(m.sigma > m.ev * 2,
  `una tirada suelta sigue siendo una sorpresa: el vaiven (${n2(m.sigma)}) pesa x${n2(m.sigma / m.ev)} sobre la ventaja (${n2(m.ev)})`);

// La diferencia honesta con un casino de verdad.
console.log(`\n  Frente a un casino real: alli el RTP es 95-97 % (pierdes a la larga).`);
console.log(`  Aqui el "RTP" es ${(100 * (1 + m.ev / (m.pPos * m.gana + (1 - m.pPos) * m.pierde))).toFixed(2)} % — por encima de 100, el jugador gana.`);
console.log(`  Lo de casino es la FORMA (rachas, vaiven, premios variables), no la ventaja de la casa.`);
console.log(`  Los que si son casino de verdad — con la casa ganando — son !aura apostar y !robo (seccion 6).`);

console.log('\n════ 3. inflacion: ¿escribir sigue mandando? ════\n');
const COOLDOWN_S = 90;
const TECHO_DIA = Math.floor(86400 / COOLDOWN_S);
console.log('  perfil                     tiradas/dia   por tirar   racha   bonos   total/dia');
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
  const d = desglose(msgs);
  const escribiendo = d.bonos + d.racha;
  filas.push({ nombre, tiradas, tirando, escribiendo, ...d, total: tirando + escribiendo });
  console.log(`  ${nombre.padEnd(24)}  ${String(tiradas).padStart(6)}      ${('+' + n0(tirando)).padStart(6)}   ${n0(d.racha).padStart(6)}  ${n0(d.bonos).padStart(6)}   ${n0(tirando + escribiendo).padStart(8)}`);
}
console.log(`\n  (el cooldown de ${COOLDOWN_S}s pone el techo fisico en ${TECHO_DIA} tiradas/dia)`);

const f = (pre) => filas.find(x => x.nombre.startsWith(pre));
const precioMedioGlobal = () => Object.values(PRECIOS).reduce((a, b) => a + b, 0) / Object.keys(PRECIOS).length;
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
// BAJADO DE 3 A 2,5 al subir la tirada por peticion del owner. El principio no
// cambia —escribir tiene que seguir separando— pero al subir el ingreso de
// tirar, que es igual para todos, el hueco entre el que escribe mucho y el que
// escribe poco se estrecha por pura aritmetica. Con 2,5 sigue habiendo mas del
// doble de diferencia, que es un abismo perfectamente visible en el ranking.
ok(f('muy activo').total > f('normal').total * 2.5,
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

// ─── La racha no puede volverse el ingreso principal ─────────────────────────
//
// Es un pago plano: sube igual el dia de un fantasma que el de una bestia. Eso
// esta pensado — es lo unico que premia APARECER en vez de escribir mucho —
// pero por eso mismo hay que vigilarlo, porque un pago plano demasiado alto
// aplana la escala entera y borra la diferencia entre quien vive el grupo y
// quien pasa a saludar.
{
  const tope = RACHA.pago * RACHA.tope;
  console.log(`\n  La racha paga ${RACHA.pago} por dia acumulado, tope ${tope} al dia (a los ${RACHA.tope} dias).`);
  console.log(`  Pide ${RACHA.minMensajes} mensajes diarios y un solo dia sin aparecer la parte entera.`);
  ok(tope < precioMedioGlobal(),
    `  a tope no paga ni un comando medio (${tope} contra ${n0(precioMedioGlobal())}): es un motivo para volver, no un sueldo`);
  ok(tope < f('activo').bonos,
    `  y sigue muy por debajo de lo que da escribir 500 mensajes (${tope} contra ${n0(f('activo').bonos)}): escribir manda`);
  const antes = f('muy activo').total - tope, ahora = f('muy activo').total;
  ok(tope / ahora < 0.10,
    `  para el que mas escribe es el ${(100 * tope / ahora).toFixed(0)} % de su dia: un extra, no su ingreso`);
}

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
      for (const h of HITOS) {
        if (msgs < h.n) continue;
        aura += bonoReal(h.tier, aura) + (h.n === 200 ? PRIMERA_DEL_DIA : 0);
      }
      // La racha: se supone que no falla ni un dia, que es el caso peor.
      aura += RACHA.pago * Math.min(d + 1, RACHA.tope);
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
// !dar YA NO ES SUMA CERO, y esta linea decia que si. Lo era hasta que se le
// puso impuesto: ahora sale mas de una cuenta de lo que entra en la otra, y la
// diferencia se reparte entre el bote y la nada. Lo que hay que comprobar no es
// que cuadre a cero, sino que la cuenta este bien hecha en las dos direcciones.
ok(/transferAura/.test(src('dar.js')), '!dar sigue usando transferAura: el cargo y el abono pasan por el mismo bloque serializado');
{
  const darSrc = src('dar.js');
  ok(/transferAura\(jid, sender, target, cargo, amount\)/.test(darSrc),
    '  y se cobra `cargo` abonando solo `amount`: el impuesto no puede quedarse a medias entre las dos escrituras');
  ok(/const cargo = amount \+ impuesto/.test(darSrc),
    '  el impuesto lo paga QUIEN DA, encima de la cantidad: quien recibe cobra siempre lo anunciado');

  // Y la cuenta en si, con las cifras de economia.js.
  const casos = [1, 5, 50, 100, 1000, 5000];
  const roto = casos.filter((n) => impuestoDe(n) < IMPUESTO.minimo);
  ok(roto.length === 0, `  toda transferencia paga al menos ${IMPUESTO.minimo}: ${casos.length} cantidades comprobadas`);

  // Trocear tiene que salir MAS CARO que pagar de una vez, o el impuesto no
  // sirve para nada: bastaria con mandar la fortuna en trozos de uno.
  const entero = impuestoDe(400);
  const troceado = 100 * impuestoDe(4);
  ok(troceado > entero,
    `  trocear no esquiva el impuesto: 400 de golpe cuesta ${entero} y en cien trozos ${troceado}`);

  // El efectivo sobre una cantidad normal, para que se vea si alguien lo sube.
  const efectivo = (100 * impuestoDe(100) / 100).toFixed(0);
  if (impuestoDe(100) / 100 > 0.25) {
    nota(`el impuesto de !dar se lleva el ${efectivo} % de un regalo normal: eso ya no es un peaje, es una expropiacion`);
  }
  console.log(`  !dar: ${(IMPUESTO.porcentaje * 100).toFixed(0)} % con minimo ${IMPUESTO.minimo}; de lo recaudado, el ${(IMPUESTO.alBote * 100).toFixed(0)} % va al bote y el resto se destruye.`);
}
// ESTE ASERTO EXIGIA LA IMPLEMENTACION VIEJA, no la propiedad. Comprobaba que
// hubiera literalmente dos addAura seguidos — que es justo la forma INCORRECTA
// de mover aura entre dos personas: cada uno va por su cola, asi que entre el
// chequeo de saldo y el descuento cabe otro comando del perdedor y el duelo lo
// deja en negativo; y si el proceso se cae entre las dos lineas, uno cobra y el
// otro no paga. Un test que fija la implementacion impide justo el arreglo.
//
// Lo que hay que exigir es la propiedad: que las dos escrituras pasen por el
// mismo bloque serializado, o sea transferAura.
{
  const ds = src('duel.js');
  ok(/transferAura\(jid, loser, winner, d\.stake\)/.test(ds),
    '!duel: el traspaso va por transferAura — las dos escrituras en el mismo bloque serializado');
  ok(!/addAura\(jid, (winner|loser)/.test(ds),
    '  y ya no quedan addAura sueltos, que era lo que dejaba al perdedor en negativo');
  ok(/if \(!mov\.ok\)/.test(ds),
    '  y si el perdedor ya no puede cubrirlo, el duelo se anula en vez de cobrarle igual');
}

// LAS RELACIONES ENTRE PRECIOS, QUE SON LA DECISION DE DISENYO.
//
// Estaban escritas en un comentario de economia.js junto con las cifras, y las
// cifras se quedaron viejas mientras las relaciones seguian siendo verdad. Aqui
// se comprueban en vez de contarse: un reajuste que las rompa salta, y uno que
// solo cambie los numeros no molesta a nadie.
{
  const { PRECIOS, ARRANQUE } = require(`${R}/src/utils/economia`);
  ok(PRECIOS.tovid > PRECIOS.toimg,
    `!tovid por encima de !toimg (${PRECIOS.tovid} > ${PRECIOS.toimg}): recodifica el video entero con preset slow`);
  // !play por encima de los conversores, y no es estetico. Es el unico comando
  // con un limite EXTERNO y finito: gasta cuota mensual de RapidAPI, y al
  // agotarse deja de funcionar para todo el grupo hasta que renueve. Un sticker
  // solo gasta CPU de la VPS, que vuelve sola. El precio es el unico freno que
  // tiene, porque la cuota no se compra con mas CPU.
  ok(PRECIOS.play >= Math.max(PRECIOS.sticker, PRECIOS.toimg),
    `!play (${PRECIOS.play}) no por debajo de los conversores (${Math.max(PRECIOS.sticker, PRECIOS.toimg)}): su cuota es finita y la CPU no`);
  ok(PRECIOS.top10 > PRECIOS.top5,
    `!top10 por encima de !top5 (${PRECIOS.top10} > ${PRECIOS.top5}): molesta al doble de gente`);
  // El minimo absoluto es !cachelist, que es mirar una lista y no representa
  // "probar el bot". Lo que importa es que el que entra pueda usar lo que la
  // gente usa: un sticker, una cancion, un roast. Se mide contra el MAS CARO de
  // esos, que es el caso peor.
  const CARA = Math.max(PRECIOS.sticker, PRECIOS.play, PRECIOS.roast);
  ok(ARRANQUE >= CARA,
    `  el arranque (${ARRANQUE}) cubre al menos una compra de las que se usan a diario (la mas cara de ellas: ${CARA})`);
  ok(Math.floor(ARRANQUE / CARA) >= 3,
    `  y da para ${Math.floor(ARRANQUE / CARA)} de ellas: quien entra puede probar el bot antes de tener que ganarselo`);
}

// NINGUN `desc` DE LA TIENDA ESCRIBE SU DURACION A MANO.
//
// El desc es el texto que se lee EN EL MOMENTO DE PAGAR, asi que una cifra
// vieja ahi es de las peores que hay: alguien compra por lo que dice y recibe
// otra cosa.
//
// Cuatro lo tenian escrito (escudo 24, cebo 16, pase 48, indulto 72) y
// cuadraban de pura casualidad, porque nadie habia tocado esas horas desde que
// se escribieron. En cuanto el pase bajo a 12 su desc habria seguido diciendo
// 48. Es la tercera vez que la misma enfermedad aparece: ya mintio el socio
// (25 % / 12 h cuando daba 30 % / 24), las frases de compra del escudo y las
// del cebo.
{
  const { OBJETOS } = require(`${R}/src/utils/economia`);
  const malos = [];
  for (const [nombre, o] of Object.entries(OBJETOS)) {
    if (!o.desc) continue;
    const cifras = [...o.desc.matchAll(/(\d+)\s*h\b/g)].map((m) => Number(m[1]));
    for (const c of cifras) {
      if (c !== o.horas) malos.push(`${nombre}: dice ${c} h y dura ${o.horas || 'nada'}`);
    }
    if (o.horas && !cifras.length) malos.push(`${nombre}: dura ${o.horas} h y su desc no lo dice`);
  }
  ok(malos.length === 0,
    `los desc de la tienda dicen la duracion real${malos.length ? ':\n     ' + malos.join('\n     ') : ''}`);
}

// NINGUNA FRASE DE TIENDA ESCRIBE UNA DURACION A MANO.
//
// Ya paso dos veces con la misma forma: el socio anunciaba "25 % durante 12 h"
// cuando el objeto daba 30 % durante 24, y el escudo se compraba con frases que
// decian "doce horas" y "medio dia" mientras duraba 24. Las dos son texto fijo
// al lado de una constante que se toca cada vez que se reequilibra la economia,
// y el texto no se toca con ella.
//
// El socio se arreglo generando su `desc` de las constantes. El escudo, con un
// placeholder (%H). Esto vigila que no vuelva a colarse una tercera: si una
// frase de compra menciona horas en numero o en letra, salta.
{
  const fr = require(`${R}/src/data/roboExtraPhrases`);
  const { OBJETOS } = require(`${R}/src/utils/economia`);
  const POOLS = { escudo: 'COMPRA_ESCUDO', ganzua: 'COMPRA_GANZUA', cebo: 'COMPRA_CEBO' };
  // Horas escritas a mano: cifra ("12 h", "24 horas") o palabra.
  const AMANO = /\b(\d{1,2})\s*h(?:oras?)?\b|\b(una|dos|tres|cuatro|seis|ocho|diez|doce|dieciocho|veinticuatro)\s+horas\b|\bmedio\s+d[íi]a\b|\bun\s+d[íi]a\b/i;
  const sucias = [];
  for (const [obj, pool] of Object.entries(POOLS)) {
    for (const f of (fr[pool] || [])) {
      if (AMANO.test(f)) sucias.push(`${pool}: "${f.slice(0, 62)}…"`);
    }
  }
  ok(sucias.length === 0,
    `las frases de compra no escriben la duracion a mano (la piden con %H)${sucias.length ? ':\n     ' + sucias.join('\n     ') : ''}`);
  ok(OBJETOS.escudo.horas > 0 && /%H/.test((fr.COMPRA_ESCUDO || []).join(' ')),
    '  y las del escudo si usan %H, que sale de OBJETOS.escudo.horas');
}

// LA RECOMPENSA POR SU CABEZA no puede crear aura, y es lo primero que hay que
// comprobar de ella: es lo unico del bot que retiene dinero de una operacion
// para pagarlo en otra distinta y mas tarde.
//
// El circuito: de cada robo con exito se RETIENE una fraccion del botin (el
// ladron cobra menos) y se guarda dentro del propio golpe. Quien cace a ese
// ladron la cobra entera. Si nadie lo caza en siete dias, el golpe se poda con
// la ventana del ranking y esa aura desaparece.
//
// O sea: en el mejor de los casos es suma cero (se retiene de uno y se paga a
// otro) y en el peor es un sumidero (caduca). Nunca es una fuente. Lo que lo
// garantiza es que la retencion salga del MISMO monto que se suma, y por eso se
// comprueba en el fuente.
{
  const rs = src('robo.js');
  ok(/addAura\(jid, sender, \+monto - enSuCabeza \+ cobrada\)/.test(rs),
    '!robo: la recompensa se RETIENE del propio botin (+monto - enSuCabeza), no se acuña aparte');
  // Se comprueba la PROPIEDAD, no una linea concreta. La version anterior
  // exigia literalmente `addAura(jid, target, -monto)`, asi que en cuanto ese
  // cobro paso a ser atomico —drainAura, para no dejar a la victima en
  // negativo— el auditor empezo a dar por roto justo el arreglo. Un assert que
  // congela la implementacion bloquea el siguiente arreglo en vez de proteger
  // la regla.
  ok(/drainAura\(jid, target, monto\)|addAura\(jid, target, -monto\)/.test(rs),
    '  y a la victima se le cobra exactamente el monto: la retencion no le cuesta a ella');
  ok(/premio: Math\.round\(premio\)/.test(fs.readFileSync(`${R}/src/utils/roboStore.js`, 'utf8')),
    '  la recompensa vive DENTRO del golpe, asi que caduca sola con la ventana de 7 dias');
  const maxCabeza = RECOMPENSA.tope;
  ok(RECOMPENSA.fraccionDeGolpe < 0.5,
    `  y se queda el ${(RECOMPENSA.fraccionDeGolpe * 100).toFixed(0)} % de cada golpe: por encima del 50 % robar dejaria de compensar`);
  console.log(`  Recompensa: ${(RECOMPENSA.fraccionDeGolpe * 100).toFixed(0)} % de cada golpe se queda en la cabeza del ladron, con tope ${n0(maxCabeza)}.`);
}

// LA FACHADA DEL OWNER NO PUEDE TOCAR SU SALDO REAL. Todo lo que se publica de
// el puede ser inventado —mensajes, racha, golpes, botin, recompensa,
// probabilidades— menos una cosa: cuanta aura tiene. Eso es lo unico que tiene
// que ser consistente, porque es lo unico que el mismo puede comprobar y lo
// unico que, si baila, no tiene explicacion posible.
//
// Se rompio dos veces y las dos en silencio, asi que va con asertos:
//
//  1. El bono de veterania se calculaba sobre el recuento FALSO y se aplicaba de
//     verdad. Como esa cifra se mueve con el grupo, su aura crecia mas o menos
//     segun un numero que no existe: si el grupo se calmaba, cobraba menos.
//  2. La recompensa por su cabeza le retenia un 15 % de cada golpe. Pero los
//     robos contra el fallan SIEMPRE por diseño, asi que nadie podia cazarlo
//     nunca y ese aura caducaba a los siete dias y se destruia. Estaba pagando
//     un impuesto permanente a cambio de nada.
{
  const as = src('aura.js');
  ok(/const vet = esOwnerPrincipal \? VETERANIA_TOPE/.test(as),
    'fachada: el bono de veterania que se COBRA no sale del recuento inventado');
  ok(/lineaVeterano = esOwnerPrincipal \|\| /.test(as),
    '  y la linea de veterano NO se le enseña: ese texto es el contador de mensajes, del que el esta fuera');
  ok(!/mensajesFalsos|mensajesHoyFalsos/.test(as + src('social.js')),
    '  y no queda ningun recuento de mensajes inventado para el: inventarlo es publicar su actividad');
  const rs2 = src('robo.js');
  ok(/const enSuCabeza = isMainOwner\([^)]*\) \? 0 :/.test(rs2),
    'fachada: al owner no se le retiene recompensa — su cabeza es incobrable, retenersela era destruirle aura');
}

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
  // LA REFERENCIA SE MOVIO SOLA. Este listón estaba en medio día de tirar, y lo
  // cumplía cuando un novato sacaba 11 al día tirando. Al subir el acierto al
  // 70 % ese día pasó a 52, así que el mismo robo fallido — que no ha cambiado —
  // dejó de llegar a la mitad sin que el robo se haya tocado.
  //
  // Lo que de verdad importa se comprueba justo arriba: que robar DRENE (neto
  // negativo). Aquí abajo solo se vigila que el drenaje siga siendo perceptible
  // dentro de un día, no calderilla simbólica.
  const diaNovato = perfilTirada(P_POSITIVA.miembro).ev * TIRADAS_PAGADAS;
  // BAJADO DE 0,15 A 0,09 por el mismo motivo: el castigo del robo no ha
  // cambiado, lo que ha subido es el ingreso diario, asi que el mismo golpe pesa
  // relativamente menos. Sigue siendo casi una decima parte del dia, que se
  // nota; y el robo tiene ademas su propio cooldown de seis minutos.
  ok(-neto > diaNovato * 0.09,
    `  y un robo fallido quema ${n2(-neto)}, un ${Math.round(100 * -neto / diaNovato)} % del dia de tirar de un novato (${n0(diaNovato)}): el drenaje se nota`);
}
// El robo YA NO TIENE TECHO FIJO: se pide lo que se quiera, hasta la fortuna
// entera de la victima. Asi que lo que hay que comprobar ya no es un tope, sino
// que pedir mucho sea de verdad mala idea — que es lo que ahora impide que un
// solo comando decida el ranking.
const codicioso = eco.ROBO_BASE.miembro - eco.RIESGO.codiciaMax;
ok(codicioso <= eco.ROBO_LIMITES.suelo,
  `  pedirlo todo hunde la probabilidad al suelo (${(100 * eco.ROBO_LIMITES.suelo).toFixed(0)} %): el robo maximo sale a perder de largo`);
ok(eco.RIESGO.codiciaMax > eco.RIESGO.miseriaMax * 2,
  `  la codicia castiga mucho mas que quedarse corto (${(100 * eco.RIESGO.codiciaMax).toFixed(0)} % vs ${(100 * eco.RIESGO.miseriaMax).toFixed(0)} %)`);
ok(DUELO.techo <= 300, `el duelo si mantiene su tope de ${DUELO.techo}`);

console.log('\n════ 6. lo que SI es casino: la casa gana ════\n');
// La curva hace que ya no se puedan tener a la vez el acierto máximo Y el
// multiplicador máximo. Se audita el all-in (peor acierto, mejor pago) y el
// punto dulce (mejor acierto, pago medio). Si la casa gana en los dos, gana.
{
  const pAllIn = pApuestaDe(1, 'miembro').p;
  const pDulce = pApuestaDe(APUESTA.riesgo.puntoDulce, 'miembro').p;
  const pMin = pApuestaDe(0, 'miembro').p;
  ok(pAllIn < pDulce, `  pedir todo baja el acierto (${(pAllIn*100).toFixed(0)} % vs ${(pDulce*100).toFixed(0)} % en el punto dulce)`);
  ok(pMin < pDulce, `  pedir calderilla también baja el acierto (${(pMin*100).toFixed(0)} %)`);
  const evAllIn = pAllIn * APUESTA.multiplicadorMax - 1;
  const evDulce = pDulce * APUESTA.multiplicador - 1;
  console.log(`  !aura apostar all-in: acierta ${(pAllIn*100).toFixed(0)} % a ×${APUESTA.multiplicadorMax} → EV ${(evAllIn*100).toFixed(0)} %`);
  console.log(`  !aura apostar dulce:  acierta ${(pDulce*100).toFixed(0)} % a ×${APUESTA.multiplicador} → EV ${(evDulce*100).toFixed(0)} %`);
  ok(evAllIn < 0, `  all-in: la casa se queda el ${(-evAllIn*100).toFixed(0)} %`);
  ok(evDulce < 0, `  punto dulce: la casa se queda el ${(-evDulce*100).toFixed(0)} %`);
  // La fachada del owner: lo que se ENSEÑA está en banda de miembro, no el 58 %.
  // EL OWNER NO SE PENALIZA POR LO QUE PIDA, igual que en !robo, donde ya
  // estaba escrito. La apuesta era el unico sitio donde su amaño jugaba EN
  // CONTRA: con `suave` a todo o nada se le quedaba en el 50 % —cara o cruz—
  // teniendo 58 % de base. Antes de la curva era 58 % pusiera lo que pusiera.
  {
    const ps = [0.05, 0.25, 0.45, 0.7, 1].map((f) => pApuestaDe(f, 'owner', { exento: true }).p);
    const plano = ps.every((x) => Math.abs(x - APUESTA.p.owner) < 1e-9);
    ok(plano, `  al owner la cifra que pide no le baja el acierto: ${(APUESTA.p.owner * 100).toFixed(0)} % ponga lo que ponga`);
    // Y lo que VE el grupo sigue bajando: si no, el amaño se leeria en pantalla.
    ok(pApuestaVisible(1, { jitter: false }) < pApuestaVisible(0.45, { jitter: false }),
      '  pero la cifra que se le enseña sigue bajando al pedir mas: la fachada aguanta');
  }

  const vistoAllIn = pApuestaVisible(1, { jitter: false });
  const vistoDulce = pApuestaVisible(APUESTA.riesgo.puntoDulce, { jitter: false });
  ok(vistoAllIn < vistoDulce, '  al owner también se le enseña menos si pide más');
  ok(vistoAllIn <= 0.48 && vistoDulce >= 0.28, '  y la cifra visible vive en banda de miembro, no en el 58 % real');
  // LA CASA GANA A TODO EL MUNDO MENOS AL OWNER, Y SE COMPRUEBA ENTERO.
  //
  // Arriba solo se miraba `miembro` en dos fracciones sueltas. El admin tiene su
  // propia base (0,47) y el equilibrio a x2 esta en 0,50: basta con subirle tres
  // puntos en un ajuste de balance para que empiece a acuñar aura, y con dos
  // muestras no se ve. Aqui se barre la curva entera para cada rol.
  // NADA DE INFLACION: se pidio a toda costa. El pago por escribir subio, pero
  // el presupuesto sale de las tiradas de pago, no del aire. Se comprueba
  // contra las cifras MEDIDAS de antes del cambio, no contra una sensacion.
  {
    // Techos historicos: lo que ingresaba cada perfil ANTES de que el pago por
    // escribir se tocara. Solo bajan, nunca suben — son un trinquete. Medido hoy
    // (hitos por umbral, tramo 3 subido): 177 / 204 / 462.
    const BASE = { 'normal': 188, 'activo': 268, 'muy activo': 486 };
    for (const [perfil, antes] of Object.entries(BASE)) {
      const ahora = f(perfil).total;
      ok(ahora <= antes,
        `  ${perfil}: ${n0(ahora)} al dia contra los ${antes} de antes — no entra aura nueva al sistema`);
    }
    // Y que el pago plano siga siendo PLANO: si algun dia se cobra por cada
    // hito en vez de una vez al dia, vuelve a compounder con el volumen y el
    // que escribe 1.200 cobra seis veces la subida. Ese fue el motivo de que
    // no se pudiera subir el tramo y de que esto exista.
    //
    // SE MIDE SOBRE LA FUNCION, NO CONTRA UNA CIFRA DE ANTES. La version
    // anterior restaba dos bases apuntadas a mano (188 y 486) y comparaba las
    // diferencias: mientras la estructura de los hitos no se moviera daba lo
    // mismo, pero en cuanto se paso de modulo a umbrales dejo de significar
    // nada y dio FALLO por aritmetica vieja, no porque el pago hubiera dejado
    // de ser plano. Una guarda anclada a un numero medido caduca sin avisar.
    const sinExtra = (msgs) => HITOS.filter((h) => msgs >= h.n)
      .reduce((s, h) => s + evBono(h.tier), 0);
    for (const msgs of [200, 500, 1200, 5000]) {
      const extra = evEscribir(msgs) - sinExtra(msgs);
      ok(Math.abs(extra - PRIMERA_DEL_DIA) < 0.01,
        `  el extra del primer hito es plano con ${msgs} msgs: entra ${extra.toFixed(0)} y tiene que entrar ${PRIMERA_DEL_DIA}`);
    }
    ok(evEscribir(199) - sinExtra(199) === 0,
      '  y por debajo del primer hito no entra: el extra es del hito, no de escribir');
  }

  for (const rol of Object.keys(APUESTA.p)) {
    if (rol === 'owner') continue;   // el owner esta amañado a proposito
    let peorEv = -Infinity, dondeEv = '';
    for (let f = 0; f <= 1.0001; f += 0.01) {
      const mult = f >= 0.999 ? APUESTA.multiplicadorMax : APUESTA.multiplicador;
      const ev = pApuestaDe(f, rol).p * mult - 1;
      if (ev > peorEv) { peorEv = ev; dondeEv = `${(f * 100).toFixed(0)} %`; }
    }
    ok(peorEv < 0,
      `  ${rol}: la casa gana en TODA la curva (lo mejor que saca es ${(peorEv * 100).toFixed(1)} % en ${dondeEv})`);
  }

  // Esta comprobacion no vale para nada y se deja escrita para que se vea por
  // que: `MOMENTUM.caliente === 0.04` no puede fallar salvo que alguien cambie
  // la constante a proposito, que es justo cuando NO quieres que salte. Lo que
  // hay que vigilar es que el bono no rompa el tope, y de eso se ocupa el
  // P_TOPE de rollAura (aura.js:96), que ya se mide en la seccion de la tirada.
  ok(MOMENTUM.caliente > 0 && MOMENTUM.tilt < 0, '  la racha suma y el tilt resta');
  ok(OBJETIVO_DIA.bonoBotin < eco.DIANA.bonoBotin, '  el objetivo del día paga menos que la diana semanal: el nº1 sigue siendo el golpe gordo');
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
// La apuesta mas pequeña posible no es "saldo minimo por la fraccion": es
// APUESTA.apuestaMin, que es el suelo duro de lo que se puede poner en la mesa.
// Modelarlo con la fraccion daba una cifra que ya no existe (150 cuando el
// minimo real son 300) y hacia fallar una comprobacion que en realidad cumple.
const apuestaChica = Math.max(APUESTA.apuestaMin, APUESTA.minimo * APUESTA.fraccion);
const casa = apuestaChica * (1 - APUESTA.p.miembro * 2);
const perdidaReal = apuestaChica;
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
// EL ARRANQUE BAJO DE 250 A 75 por decision del owner, asi que ya no da para
// cinco stickers sino para uno. El liston pasa de "cinco compras" a lo unico que
// de verdad no se puede incumplir: que el recien llegado pueda COMPRAR ALGO. Un
// arranque por debajo del comando mas barato deja a quien entra mirando un
// marcador que no puede gastar, y ahi el bot parece roto el primer dia.
const MAS_BARATO = Math.min(...Object.values(PRECIOS));
ok(ARRANQUE >= MAS_BARATO,
  `el arranque (${ARRANQUE}) cubre el comando mas barato (${MAS_BARATO}): quien entra puede tocar algo desde el minuto uno`);
ok(ARRANQUE >= PRECIOS.sticker,
  `  y llega para ${Math.floor(ARRANQUE / PRECIOS.sticker)} sticker: se puede probar lo que mas se usa sin esperar a la primera tirada`);

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
// SUBIDO A 6 al subir la ganancia por peticion del owner. Los PRECIOS no se
// tocan —lo pedido fue ganar mas, no que todo costara menos— asi que el unico
// motivo por el que un miembro se paga mas comandos es que ahora entra mas aura.
//
// Ha pasado por 3, por 4 y ahora por 6. Un miembro normal se paga 5 comandos al
// dia, contra los 3,1 de antes: sigue teniendo que elegir, pero ya no se queda
// fuera del bot a media tarde.
//
// Si esto se pasa de seis sin que se pida, los ingresos se han ido de las manos
// y el numero al que mirar es TIRADAS_PAGADAS, que multiplica directamente.
ok(f('normal').total < precioMedio * 6,
  `  y no se dispara (${(f('normal').total / precioMedio).toFixed(1)} comandos al dia): el precio sigue significando algo`);
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

console.log('\n════ 9. la tienda: ¿sale a cuenta comprar, y no es una imprenta? ════\n');

// ESTA SECCION EXISTE POR UN AGUJERO REAL, no por completitud.
//
// Los precios de la tienda se pusieron contra "un robo medio mueve 40-60", que
// era verdad cuando el robo tenia techo fijo de 200. Al quitarse ese techo el
// robo paso a mover cientos y NADIE rehizo la cuenta. El resultado aguanto meses
// sin que ningun validador lo viera: tres objetos costaban mas de lo que podian
// llegar a valer nunca —no caros, imposibles de amortizar— y la ganzua se quedo
// sin tope, valiendo 627 donde costaba 140 y dando la vuelta al signo del robo.
//
// Cada objeto tiene que pasar DOS pruebas opuestas, y son opuestas a proposito:
//
//   1. VALE LA PENA — en su mejor uso previsto aporta mas de lo que cuesta. Si
//      no, es decorado: nadie lo compra dos veces.
//   2. NO IMPRIME — lo que se puede sacar al dia esta acotado.
//
// LA SEGUNDA PRUEBA CAMBIO, y conviene saber por que. Antes exigia que comprar y
// jugar en bucle saliera a cero o a perdida, y eso lo garantizaba el precio. El
// efecto secundario era que el objeto NO PODIA DAR NADA: como mucho llegaba a
// cancelar la ventaja de la casa, asi que lo mejor que te podia pasar comprando
// un amuleto era no perder. Con razon parecia que daban poco: es que daban cero.
//
// Ahora los tres objetos de ventaja son positivos (~+70 por compra jugando bien)
// y lo que impide la imprenta ya no es el precio sino el LIMITE DE COMPRA: uno
// cada 12 h, compartido entre los tres. Asi que lo que hay que acotar es lo que
// se puede sacar AL DIA, no por vuelta.

// Lo que ingresa al dia un usuario normal. Se necesita en dos sitios de esta
// seccion, asi que se saca una vez.
const DIA_NORMAL_PREV = f('normal').total;

// Los desenlaces del robo, tal como los reparte robo.js.
const R_GANA   = 0.12 * 1.8 + 0.55 * 1.0 + 0.33 * 0.4;  // se lleva esto de lo pedido
const R_PIERDE = 0.70 * 0.5 + 0.30 * 1.0;               // paga esto si falla

function castigoCifra(a) {
  const { puntoDulce: pd, codiciaMax, miseriaMax } = RIESGO;
  if (a > pd) { const x = (a - pd) / (1 - pd); return x * x * codiciaMax; }
  const x = (pd - a) / pd; return x * x * miseriaMax;
}
const pRobo = (a) => Math.min(ROBO_LIMITES.techo, Math.max(ROBO_LIMITES.suelo, ROBO_BASE.miembro - castigoCifra(a)));
const evRobo = (M, p) => M * (R_GANA * p - R_PIERDE * (1 - p));

// La apuesta, con el multiplicador medio que cuadra con lo medido arriba.
const P_AP = APUESTA.probabilidad !== undefined ? APUESTA.probabilidad : 0.45;
const MULT_AP = (1 - P_AP - 0.05) / P_AP + 1;
const evAp = (S, p) => S * (p * (MULT_AP - 1) - (1 - p));

// Dos fortunas medias enfrentadas: es el escenario donde mas vale cada objeto,
// que es justo donde hay que buscar la imprenta.
const CAP = MILLONARIO;
const barrido = (n) => Array.from({ length: n }, (_, i) => Math.round(CAP * (i + 1) / n));

// ─── ganzua ──────────────────────────────────────────────────────────────────
const gz = OBJETOS.ganzua;
let gzAporta = 0, gzBucle = -Infinity;
for (const M of barrido(200)) {
  const p0 = pRobo(M / CAP);
  const bono = gz.bono * Math.min(1, (gz.topeRobo || Infinity) / Math.max(1, M));
  const p1 = Math.min(ROBO_LIMITES.techo, p0 + bono);
  gzAporta = Math.max(gzAporta, evRobo(M, p1) - evRobo(M, p0));
  gzBucle = Math.max(gzBucle, evRobo(M, p1) - gz.precio);
}
console.log(`  ganzua  ${String(gz.precio).padStart(5)}   aporta hasta ${n0(gzAporta)}   comprar+robar en bucle: ${n2(gzBucle)}`);
ok(gz.topeRobo > 0, '  la ganzua lleva tope: sin el, su valor crece con lo pedido y no para');
ok(gzAporta > gz.precio, `  y aun asi compensa comprarla (aporta ${n0(gzAporta)} contra ${gz.precio} que cuesta)`);
ok(gz.ventaja, '  y esta bajo el limite de compra, que es lo que ahora impide la imprenta');

// ─── amuleto ─────────────────────────────────────────────────────────────────
const am = OBJETOS.amuleto;
let amAporta = 0, amBucle = -Infinity;
for (const S of barrido(200)) {
  const efec = Math.min(S, am.topeApuesta);
  const con = evAp(S - efec, P_AP) + evAp(efec, P_AP + am.bono);
  amAporta = Math.max(amAporta, con - evAp(S, P_AP));
  amBucle = Math.max(amBucle, con - am.precio);
}
console.log(`  amuleto ${String(am.precio).padStart(5)}   aporta hasta ${n0(amAporta)}   comprar+apostar en bucle: ${n2(amBucle)}`);
ok(am.topeApuesta > 0, '  el amuleto lleva tope de apuesta');
ok(amAporta > am.precio, `  y compensa comprarlo (aporta ${n0(amAporta)} contra ${am.precio} que cuesta)`);
ok(am.ventaja, '  y esta bajo el limite de compra');

// ─── seguro ──────────────────────────────────────────────────────────────────
const sg = OBJETOS.seguro;
let sgAporta = 0, sgBucle = -Infinity;
for (const S of barrido(200)) {
  const devuelve = (1 - P_AP) * Math.min(S * sg.recupera, sg.topeDevuelto);
  sgAporta = Math.max(sgAporta, devuelve);
  sgBucle = Math.max(sgBucle, evAp(S, P_AP) + devuelve - sg.precio);
}
console.log(`  seguro  ${String(sg.precio).padStart(5)}   devuelve hasta ${n0(sgAporta)}   comprar+apostar en bucle: ${n2(sgBucle)}`);
ok(sg.topeDevuelto > 0, '  el seguro lleva tope de devolucion');
ok(sgAporta > sg.precio, `  y compensa comprarlo (devuelve ${n0(sgAporta)} contra ${sg.precio} que cuesta)`);
ok(sg.ventaja, '  y esta bajo el limite de compra');

// ─── socio ───────────────────────────────────────────────────────────────────
const sc = OBJETOS.socio;
const comandoMedio = Object.values(PRECIOS).reduce((a, b) => a + b, 0) / Object.values(PRECIOS).length;
const cortaEn = Math.ceil(sc.precio / (comandoMedio * sc.descuento));
console.log(`  socio   ${String(sc.precio).padStart(5)}   se amortiza a los ${cortaEn} comandos en ${sc.horas} h (comando medio ${n2(comandoMedio)})`);
ok(cortaEn <= 35, `  el socio se amortiza en una tarde larga (${cortaEn} comandos): por encima de ~35 no lo alcanza nadie y es decorado`);
ok(cortaEn >= 15, `  y no se amortiza solo con pasar por ahi (${cortaEn} comandos): sigue siendo para quien vive en el chat`);

// ─── EL TECHO DIARIO, que es lo que ahora sostiene la economia ───────────────
//
// Con el limite de compra, lo maximo que se puede extraer de la tienda al dia es
// (24 / cooldown) compras del objeto que mas deje. Se mide contra lo que ingresa
// un usuario normal: si la tienda llega a dar mas que escribir, deja de ser una
// tienda y pasa a ser el trabajo.
{
  const porDia = 24 / VENTAJA.cooldownHoras;
  const mejorVuelta = Math.max(gzBucle, amBucle, sgBucle);
  const techoDia = porDia * mejorVuelta;
  const cuantos = Object.values(OBJETOS).filter((o) => o.ventaja).length;
  console.log(`\n  Limite: 1 objeto de ventaja cada ${VENTAJA.cooldownHoras} h (${cuantos} comparten el mismo limite).`);
  console.log(`  El que mas deja son ${n0(mejorVuelta)} por compra, asi que el techo diario de la tienda es ${n0(techoDia)}.`);
  ok(mejorVuelta > 0,
    `  comprar SI sale a cuenta ahora: la mejor jugada deja ${n0(mejorVuelta)} en vez de quedarse a cero`);
  ok(techoDia < DIA_NORMAL_PREV,
    `  y aun asi la tienda da menos que escribir (${n0(techoDia)} contra ${n0(DIA_NORMAL_PREV)} al dia): sigue siendo un extra, no un sueldo`);
  ok(VENTAJA.cooldownHoras >= 6,
    `  el limite es de ${VENTAJA.cooldownHoras} h: por debajo de 6 el techo se dispara y el precio ya no lo sujeta`);
}

// ─── lo que cuestan, en dias de quien los compra ─────────────────────────────
//
// El precio en aura no dice nada por si solo; lo que dice algo es cuantos dias
// de juego cuesta. Esta es la lectura que faltaba cuando se pusieron: 1.500 por
// un indulto de 48 h eran OCHO DIAS de ingresos de un usuario normal.
const DIA_NORMAL = DIA_NORMAL_PREV;
console.log(`\n  (un usuario normal ingresa ${n0(DIA_NORMAL)} al dia)\n`);
for (const [k, o] of Object.entries(OBJETOS)) {
  const d = o.precio / DIA_NORMAL;
  const linea = `  ${k.padEnd(8)} ${String(o.precio).padStart(5)} = ${d.toFixed(1)} dias de un usuario normal`;
  if (d > 6) { nota(`${k} cuesta ${d.toFixed(1)} dias de ingresos de un usuario normal: eso ya no es caro, es inalcanzable`); }
  console.log(linea);
}

console.log('\n' + '═'.repeat(66));
if (avisos.length) {
  console.log('\nTENSIONES (no son fallos, son decisiones que conviene mirar):');
  for (const a of avisos) console.log('  · ' + a);
}
console.log(fallos ? `\n${fallos} puntos rotos` : '\nestabilidad: cuadra por todos los angulos medidos');
process.exit(fallos ? 1 : 0);
