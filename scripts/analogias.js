#!/usr/bin/env node
// ANALOGÍAS BARATAS: cuenta lo que queda por reescribir.
//
//   npm run analogias            resumen
//   npm run analogias --lista    todas, con fichero y línea
//
// FUENTE DE VERDAD: las líneas marcadas con `// ANALOGÍA`.
// NO está en !fiel / !infiel. Está en:
//   src/commands/aura.js          AURA.gain / AURA.loss (y algunas spiral/cursed)
//   src/data/cooldownPhrases.js   AURA_TIRADA sobre todo
//   src/data/avisos.js            MAL_ESCRITO
//   src/data/accionPhrases.js     tres de ROAST_USUARIO
//
// Brief: PENDIENTE.md. Exit 1 mientras quede alguna, 0 al cerrar.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'src/commands/aura.js',
  'src/data/cooldownPhrases.js',
  'src/data/avisos.js',
  'src/data/accionPhrases.js',
];
const LISTA = process.argv.includes('--lista') || process.argv.includes('-l');

const strRe = /^(\s*)('(?:\\.|[^'\\])*')(,)(\s*\/\/.*)?(\s*)$/;
const unescape = (s) => s.slice(1, -1).replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\\\/g, '\\');

const tagged = [];

for (const rel of FILES) {
  const f = path.basename(rel);
  const lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n');
  let pool = '';
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    const am = /^  (blessed|gain|loss|spiral|cursed):/.exec(line);
    if (am) pool = `AURA.${am[1]}`;
    const pm = /^(?:const |      )([A-Z][A-Z0-9_]+)\s*=\s*\[/.exec(line);
    if (pm) pool = pm[1];
    const m = strRe.exec(line);
    if (!m) continue;
    if (!(m[4] && m[4].includes('ANALOGÍA'))) continue;
    tagged.push({ file: rel, pool, linea: n + 1, texto: unescape(m[2]) });
  }
}

const porPool = {};
for (const x of tagged) {
  const k = `${x.file} · ${x.pool || '?'}`;
  porPool[k] = (porPool[k] || 0) + 1;
}
const orden = Object.entries(porPool).sort((a, b) => b[1] - a[1]);

console.log('\n──────────────────────────────────────────────────────────────────────');
console.log('ANALOGÍAS PENDIENTES (líneas con // ANALOGÍA)');
console.log('!aura gana/pierde · cooldown de !aura · comando mal escrito · roast de acciones');
console.log('──────────────────────────────────────────────────────────────────────\n');
if (!tagged.length) {
  console.log('Cero. El encargo está cerrado.\n');
} else {
  console.log('pool'.padEnd(52) + 'queda');
  for (const [k, v] of orden) console.log(k.padEnd(52) + String(v).padStart(5));
  console.log(`\n${tagged.length} pendientes. Brief: PENDIENTE.md`);
  console.log('Reescribe la línea, quita la marca. !fiel / !infiel no se toca.');
}

if (LISTA && tagged.length) {
  console.log('\n──────────────────────────────────────────────────────────────────────\n');
  let pool = null;
  const key = (x) => `${x.file} · ${x.pool}`;
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
