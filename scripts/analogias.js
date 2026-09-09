#!/usr/bin/env node
// LA ANALOGIA BARATA: encuentra las frases que comparan en vez de atacar.
//
//   npm run analogias            resumen por pool
//   npm run analogias --lista    todas, con su sitio, para trabajarlas
//
// QUE BUSCA Y POR QUE. El dueño lo dijo asi: "todos los insultos del bot son
// analogias baratas, sin coherencia y sin jugo real; prefiero ataques directos
// y con coherencia". El patron es este:
//
//   Eres mas fiel que un perro callejero al primer gilipollas que le da pan.
//   Tu lealtad es como el wifi del vecino: siempre ahi y la mayoria no la merece.
//   Eres mas firme que una estaca en el culo de un vampiro.
//
// En las tres, el chiste es el OBJETO. La persona que lo recibe no aparece: se
// podria mandar a cualquiera del grupo sin cambiar una letra, y eso es
// exactamente lo que hace que no duela. Un ataque directo dice algo de ELLA.
//
// NO ENTRA "como quien + verbo". `%A besa a %V como quien firma algo` describe
// una ACTITUD y es el registro bueno del bot: la comparacion no sustituye al
// insulto, lo colorea. La diferencia esta en si la frase sigue teniendo algo
// que decir cuando le quitas la comparacion.
'use strict';

const fs = require('fs');
const path = require('path');

const D = path.join(__dirname, '../src/data');
const LISTA = process.argv.includes('--lista') || process.argv.includes('-l');

const PATRONES = [
  ['comparativa', /\b(?:m[áa]s|menos)\s+[\wáéíóúñ]+\s+que\s+(?:un|una|el|la|los|las)\s+[\wáéíóúñ]/i],
  ['comparativa', /\btien(?:es|e)\s+m[áa]s\s+[\wáéíóúñ]+\s+que\s+(?:un|una|el|la|los|las)?\s*[\wáéíóúñ]/i],
  ['símil',       /\b(?:es|eres|son|sois)\s+como\s+(?:un|una|el|la|los|las)\s+[\wáéíóúñ]/i],
  ['símil',       /\btan\s+[\wáéíóúñ]+\s+como\s+(?:un|una|el|la)\s+[\wáéíóúñ]/i],
  ['condicional', /\bsi\s+[^.]{0,45}\bfuera[ns]?\b[^.]{0,45}\bser[íi]as\b/i],
];

const vistos = new Set();
const filas = [];
const tam = {};

for (const f of fs.readdirSync(D).filter((x) => x.endsWith('.js'))) {
  let mod;
  try { mod = require(path.join(D, f)); } catch { continue; }
  const rec = (o, ruta, d) => {
    if (d > 3) return;
    if (Array.isArray(o) && o.length && o.every((x) => typeof x === 'string')) {
      // percentLabels reexporta los arrays de fidelityPhrases: contarlos dos
      // veces doblaria el problema en el informe.
      if (vistos.has(o)) return;
      vistos.add(o);
      const pool = `${f.replace('.js', '')}:${ruta}`;
      tam[pool] = o.length;
      o.forEach((t, i) => {
        for (const [tipo, rx] of PATRONES) {
          if (rx.test(t)) { filas.push({ tipo, pool, i, texto: t }); return; }
        }
      });
      return;
    }
    if (o && typeof o === 'object') for (const k of Object.keys(o)) rec(o[k], ruta ? `${ruta}.${k}` : k, d + 1);
  };
  rec(mod, '', 0);
}

const porPool = {};
for (const x of filas) porPool[x.pool] = (porPool[x.pool] || 0) + 1;
const orden = Object.entries(porPool).sort((a, b) => b[1] - a[1]);

console.log('\n──────────────────────────────────────────────────────────────────────');
console.log('ANALOGÍAS BARATAS: la frase compara en vez de atacar');
console.log('──────────────────────────────────────────────────────────────────────\n');
console.log('pool'.padEnd(34) + 'tiene   del pool     %');
for (const [k, v] of orden) {
  const n = tam[k] || 1;
  const pc = Math.round((v * 100) / n);
  console.log(k.padEnd(34) + String(v).padStart(5) + String(n).padStart(10) + String(`${pc}%`).padStart(7) + (pc >= 20 ? '   ← aquí está el problema' : ''));
}

const enFid = filas.filter((x) => x.pool.startsWith('fidelityPhrases')).length;
console.log(`\n${filas.length} en total: ${enFid} en fidelityPhrases.js y ${filas.length - enFid} en todo lo demás.`);
if (enFid / Math.max(1, filas.length) > 0.6) {
  console.log('\nO sea que NO es un problema del bot entero: es un fichero.');
  console.log('fidelityPhrases.js está construido casi entero sobre este recurso, y');
  console.log('además se lee doble, porque es también !fiel y !infiel.');
}
if (!LISTA) console.log('\n(usa --lista para verlas todas con su sitio)\n');
else {
  console.log('\n──────────────────────────────────────────────────────────────────────\n');
  let pool = null;
  for (const x of filas.sort((a, b) => (a.pool + a.i).localeCompare(b.pool + b.i))) {
    if (x.pool !== pool) { pool = x.pool; console.log(`\n═══ ${pool} ═══`); }
    console.log(`  [${String(x.i).padStart(3)}] ${x.texto}`);
  }
  console.log();
}
