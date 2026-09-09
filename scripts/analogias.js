#!/usr/bin/env node
// ANALOGÍAS BARATAS: cuenta lo que queda por reescribir.
//
//   npm run analogias            resumen
//   npm run analogias --lista    todas, con fichero y línea
//
// FUENTE DE VERDAD: las líneas marcadas con `// ANALOGÍA` en src/data.
// Las marcó Grok a mano (9 sep 2026). Un regex no basta: se come remates
// buenos («el algoritmo tiene más dignidad que tú») y se deja «fiel como
// un labrador». Por eso la lista es la marca, no un detector.
//
// Brief: PENDIENTE.md. Encargo: reescribir las marcadas, quitar la marca.
// Exit 1 mientras quede alguna, 0 cuando el encargo esté cerrado.
'use strict';

const fs = require('fs');
const path = require('path');

const D = path.join(__dirname, '../src/data');
const LISTA = process.argv.includes('--lista') || process.argv.includes('-l');

const strRe = /^(\s*)('(?:\\.|[^'\\])*')(,)(\s*\/\/.*)?(\s*)$/;
const unescape = (s) => s.slice(1, -1).replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\\\/g, '\\');

const tagged = [];

for (const f of fs.readdirSync(D).filter((x) => x.endsWith('.js'))) {
  const lines = fs.readFileSync(path.join(D, f), 'utf8').split('\n');
  let pool = '';
  let cmd = '';
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    const pm = /^(?:const |      )([A-Z][A-Z0-9_]+)\s*=\s*\[/.exec(line);
    if (pm) pool = pm[1];
    const ck = /^(  )([a-zA-Z_]+):\s*\{/.exec(line);
    if (ck) cmd = ck[2];
    const tm = /^(    )(high|mid|low|extreme):\s*\[/.exec(line);
    if (tm) pool = `${cmd}.${tm[2]}`;
    const m = strRe.exec(line);
    if (!m) continue;
    if (!(m[4] && m[4].includes('ANALOGÍA'))) continue;
    tagged.push({ file: f, pool, linea: n + 1, texto: unescape(m[2]) });
  }
}

const porPool = {};
for (const x of tagged) {
  const k = `${x.file.replace('.js', '')}:${x.pool || '?'}`;
  porPool[k] = (porPool[k] || 0) + 1;
}
const orden = Object.entries(porPool).sort((a, b) => b[1] - a[1]);

console.log('\n──────────────────────────────────────────────────────────────────────');
console.log('ANALOGÍAS PENDIENTES (líneas con // ANALOGÍA)');
console.log('──────────────────────────────────────────────────────────────────────\n');
if (!tagged.length) {
  console.log('Cero. El encargo está cerrado.\n');
} else {
  console.log('pool'.padEnd(40) + 'queda');
  for (const [k, v] of orden) console.log(k.padEnd(40) + String(v).padStart(5));
  console.log(`\n${tagged.length} pendientes. Brief: PENDIENTE.md`);
  console.log('Reescribe la línea, quita la marca. No toques las que no la tienen.');
}

if (LISTA && tagged.length) {
  console.log('\n──────────────────────────────────────────────────────────────────────\n');
  let pool = null;
  const key = (x) => `${x.file}:${x.pool}`;
  for (const x of tagged.sort((a, b) => key(a).localeCompare(key(b)) || a.linea - b.linea)) {
    const k = key(x);
    if (k !== pool) { pool = k; console.log(`\n═══ ${k} ═══`); }
    console.log(`  L${String(x.linea).padStart(4)}  ${x.texto}`);
  }
  console.log();
} else if (tagged.length) {
  console.log('\n(usa --lista para verlas todas con su línea)\n');
}

process.exit(tagged.length ? 1 : 0);
