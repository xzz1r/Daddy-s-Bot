// ¿Hay bastantes frases donde de verdad se leen?
//
// EXISTE POR UN FALLO MEDIBLE. !gay y !femboy tienen 21 frases en su tramo
// `high`, que es el que sale el 87 % de las veces. Con la ventana
// anti-repetición de pickFresh (50), eso deja UNA frase libre: el bot no
// elige, recita en bucle. Suena a bot roto y no lo delata ningún error.
//
// Escribir frases "a ojo" no detecta esto, porque el problema no está en la
// frase: está en el cruce entre CUÁNTAS hay y CADA CUÁNTO se lee ese tramo. Un
// pool de 50 es enorme para un tramo que sale el 4 % de las veces y ridículo
// para uno que sale el 52 %.
//
// Aquí se cruzan las dos cosas. Igual que scripts/placeholders.js, esto lee el
// código fuente en vez de importarlo: LABELS no se exporta, y parsear el texto
// es justo lo que hace el validador hermano.
'use strict';

const fs = require('fs');
const path = require('path');

const R = path.resolve(__dirname, '..');

// Probabilidad de caer en cada tramo, para un MIEMBRO normal (el caso
// mayoritario del grupo). Sale de rollPercent() en src/commands/percent.js:
// esa función es la fuente de verdad; si allí cambian los cortes, hay que
// tocarlos aquí. Admins y owner tienen sus propias curvas, pero dimensionar
// los pools por el miembro corriente es lo correcto: es quien más los lee.
const TRAFICO = {
  false: { high: 0.87, mid: 0.09, low: 0.04 },  // goodIsHigh:false — peyorativos
  true:  { high: 0.17, mid: 0.31, low: 0.52 },  // goodIsHigh:true  — positivos
};

// !fiel e !infiel son la excepción: declaran `roll: rollUniform` y tiran plano
// de 0 a 100, sin las curvas por rol. Con los cortes en 70 y 30 eso reparte
// 31 valores altos, 39 medios y 31 bajos de 101 posibles. Aplicarles la tabla
// de arriba —como se hacía— exageraba un tramo y enterraba los otros dos.
const TRAFICO_UNIFORME = { high: 31 / 101, mid: 39 / 101, low: 31 / 101 };

// La ventana anti-repetición de pickFresh(pool, key, window = 50). Se recorta
// sola a pool.length-1 para no bloquear un pool entero.
const VENTANA = 50;
const libres = (n) => n - Math.min(VENTANA, Math.max(0, n - 1));

// Misma definición de "frase" que scripts/placeholders.js: un literal largo en
// su propia línea y terminado en coma.
const ES_FRASE = /^\s*(['"`])(.{25,})\1,\s*$/;

// Cuenta las frases de cada constante exportada por un fichero de datos, para
// los pools que percent.js no declara en línea (fiel/infiel viven fuera).
function contarExternos(rel) {
  const out = {};
  let actual = null;
  for (const linea of fs.readFileSync(path.join(R, rel), 'utf8').split('\n')) {
    const abre = linea.match(/^const ([A-Z_]+) = \[$/);
    if (abre) { actual = abre[1]; out[actual] = 0; continue; }
    if (/^\];$/.test(linea)) { actual = null; continue; }
    if (actual && ES_FRASE.test(linea)) out[actual]++;
  }
  return out;
}

const EXTERNOS = contarExternos('src/data/fidelityPhrases.js');

// Recorre percent.js quedándose con: qué label, qué polaridad y cuántas frases
// tiene cada tramo.
function leerLabels() {
  const src = fs.readFileSync(path.join(R, 'src/commands/percent.js'), 'utf8').split('\n');
  const labels = {};
  let label = null, tramo = null;

  for (const linea of src) {
    let m = linea.match(/^  ([a-z]+): \{$/);
    if (m) { label = m[1]; labels[label] = { pools: {} }; tramo = null; continue; }
    if (!label) continue;

    m = linea.match(/^    goodIsHigh: (true|false),$/);
    if (m) { labels[label].goodIsHigh = m[1] === 'true'; continue; }

    // Marca los que tiran uniforme en vez de por rol.
    if (/^    roll: rollUniform,$/.test(linea)) { labels[label].uniforme = true; continue; }

    // Tramo declarado en línea: `high: [`
    m = linea.match(/^    (high|mid|low|extreme): \[$/);
    if (m) { tramo = m[1]; labels[label].pools[tramo] = 0; continue; }

    // Tramo que apunta a un pool importado: `high: FIEL_HIGH,`
    m = linea.match(/^    (high|mid|low|extreme): ([A-Z_]+),$/);
    if (m) { labels[label].pools[m[1]] = EXTERNOS[m[2]] ?? 0; tramo = null; continue; }

    if (/^    \],$/.test(linea)) { tramo = null; continue; }
    if (tramo && ES_FRASE.test(linea)) labels[label].pools[tramo]++;
  }
  return labels;
}

const labels = leerLabels();
const filas = [];

for (const [nombre, cfg] of Object.entries(labels)) {
  const traf = cfg.uniforme ? TRAFICO_UNIFORME : TRAFICO[String(cfg.goodIsHigh)];
  if (!traf) continue;
  // `extreme` entra con probabilidad 0: no se dimensiona por tráfico (es un
  // remate opcional), pero si se queda vacío hay que enterarse igual.
  for (const tramo of ['high', 'mid', 'low', 'extreme']) {
    const n = cfg.pools[tramo];
    if (typeof n !== 'number') continue;
    filas.push({ cmd: nombre, tramo, prob: traf[tramo] ?? 0, n, libres: libres(n) });
  }
}

// CRÍTICO: el pool está vacío o casi. Esto NO depende del tráfico y por eso se
// mira antes que nada.
//
// EXISTE POR UN FALLO REAL QUE ESTE FICHERO NO VEÍA. Un filtro masivo dejó 14
// pools a cero. Todos eran tramos de poco tráfico —rata.low, simp.mid,
// inutil.low…— así que el umbral de 30 % de abajo los excluía y esto informaba
// "ningún tramo agotado" mientras el bot lanzaba una excepción en cada tirada
// que caía ahí: pickFresh sobre un pool vacío devuelve undefined y el .replace
// de runPercent revienta.
//
// Un tramo del 4 % sigue saliendo decenas de veces al día en un grupo activo.
// Con cero frases eso no es repetición: es el comando muerto.
// `extreme` queda fuera: runPercent lo consulta con `cfg.extreme?.length`, así
// que vacío no rompe nada — solo se pierde el remate. Los otros tres sí se leen
// sin red y por eso son los que tumban el comando.
const CRITICO = (f) => f.tramo !== 'extreme' && f.n < 10;
const ROTO  = (f) => !CRITICO(f) && f.prob >= 0.30 && f.libres <= 5;
const FLOJO = (f) => !CRITICO(f) && f.prob >= 0.30 && f.libres <= 20 && !ROTO(f);

// Frases que harían falta para que el tramo tenga holgura real: la ventana
// entera más un margen de maniobra proporcional al tráfico que soporta.
const objetivo = (f) => (f.prob >= 0.30 ? VENTANA + 150 : VENTANA + 10);

const criticos = filas.filter(CRITICO).sort((a, b) => a.n - b.n);
const rotos  = filas.filter(ROTO).sort((a, b) => b.prob - a.prob);
const flojos = filas.filter(FLOJO).sort((a, b) => b.prob - a.prob);

const pad = (s, n) => String(s).padEnd(n);
const pct = (p) => `${Math.round(p * 100)}%`;

function tabla(titulo, lista) {
  if (!lista.length) return;
  console.log(`\n${titulo}`);
  console.log(`  ${pad('comando', 15)}${pad('tramo', 8)}${pad('se lee', 8)}${pad('frases', 8)}${pad('libres', 8)}faltan`);
  for (const f of lista) {
    const faltan = Math.max(0, objetivo(f) - f.n);
    console.log(
      `  ${pad(f.cmd, 15)}${pad(f.tramo, 8)}${pad(pct(f.prob), 8)}${pad(f.n, 8)}${pad(f.libres, 8)}${faltan ? `+${faltan}` : '—'}`
    );
  }
}

console.log('─'.repeat(70));
console.log(`Salud de los pools de porcentaje — ventana anti-repetición: ${VENTANA}`);
console.log('"libres" = frases elegibles tras descontar la ventana. Si es 1, el bot no elige: recita.');
console.log('─'.repeat(70));

tabla('CRÍTICO — pool vacío o casi. El comando LANZA UNA EXCEPCIÓN al caer aquí:', criticos);
tabla('ROTO — se lee constantemente y no queda casi nada que elegir:', rotos);
tabla('FLOJO — aguanta, pero se nota la repetición:', flojos);

const totalFrases = filas.reduce((a, f) => a + f.n, 0);
console.log(`\n${'─'.repeat(70)}`);
console.log(`${filas.length} tramos revisados, ${totalFrases} frases en total.`);

if (criticos.length) {
  const vacios = criticos.filter((f) => f.n === 0).length;
  console.log(`${criticos.length} tramo(s) CRÍTICO(s)${vacios ? `, ${vacios} completamente vacío(s)` : ''}.`);
  console.log('Un pool vacío no se repite: TIRA EL COMANDO. Ver runPercent en src/commands/percent.js.');
}
if (rotos.length) {
  console.log(`${rotos.length} tramo(s) ROTO(s): el grupo está viendo las mismas frases en bucle.`);
}
if (criticos.length || rotos.length) process.exit(1);
console.log('Ningún tramo vacío ni agotado.');
