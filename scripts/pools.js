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
  const traf = TRAFICO[String(cfg.goodIsHigh)];
  if (!traf) continue;
  for (const tramo of ['high', 'mid', 'low']) {
    const n = cfg.pools[tramo];
    if (typeof n !== 'number') continue;
    filas.push({ cmd: nombre, tramo, prob: traf[tramo], n, libres: libres(n) });
  }
}

// Un tramo está ROTO si se lee mucho y quedan casi ninguna frase disponible:
// ahí la repetición es visible en el grupo. FLOJO es la antesala.
const ROTO  = (f) => f.prob >= 0.30 && f.libres <= 5;
const FLOJO = (f) => f.prob >= 0.30 && f.libres <= 20 && !ROTO(f);

// Frases que harían falta para que el tramo tenga holgura real: la ventana
// entera más un margen de maniobra proporcional al tráfico que soporta.
const objetivo = (f) => (f.prob >= 0.30 ? VENTANA + 150 : VENTANA + 10);

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

tabla('ROTO — se lee constantemente y no queda casi nada que elegir:', rotos);
tabla('FLOJO — aguanta, pero se nota la repetición:', flojos);

const totalFrases = filas.reduce((a, f) => a + f.n, 0);
console.log(`\n${'─'.repeat(70)}`);
console.log(`${filas.length} tramos revisados, ${totalFrases} frases en total.`);

if (rotos.length) {
  console.log(`${rotos.length} tramo(s) ROTO(s): el grupo está viendo las mismas frases en bucle.`);
  process.exit(1);
}
console.log('Ningún tramo con el pool agotado.');
