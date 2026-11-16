#!/usr/bin/env node
'use strict';

// EL DOBLE SENTIDO GUARRO ESTILO ROCKSTAR: cuánto lleva el bot.
//
//   npm run rockstar              el total y lo que lleva cada pool
//   npm run rockstar -- --minimo  falla si el total baja del 40 %
//
// Lo pidió el dueño (16 nov): «al menos un 40 %» de las frases del bot, «en
// todo el bot, menos en las frases de dinámicas». Cómo escribe Rockstar está en
// GUIA.md («El refuerzo: cómo escribe Rockstar»): la guarrada la dice la marca,
// con voz de anuncio y dentro del vocabulario de su propio producto.
//
// FUENTE DE VERDAD: la frase lleva `// ROCKSTAR` al final de su línea, igual que
// se marcó `// ANALOGÍA`. En !kick, la marca va en la línea del `uno:`.
//
// NO CUENTAN (ni arriba ni abajo del porcentaje):
//   · las dinámicas del aura: tirar, apostar, robar, duelos, dar, bote,
//     tienda, asaltos, banco, bonos por escribir, y sus esperas y rencores;
//   · lo que el dueño quiere tal cual: !piropo, WINGMAN y las acciones
//     sexuales (fuck, anal, cum, spank, lickass, grope, undress, seduce, preg).

const fs = require('fs');
const path = require('path');

const R = path.join(__dirname, '..');
const MINIMO = 40;
// Lo que ya hay. Sube con cada tanda (capa 171): una frase marcada no se pierde
// por el camino sin que el check lo diga.
const SUELO = 90;
const MARCA = /\/\/.*\bROCKSTAR\b/;

const FICHEROS_DINAMICAS = new Set([
  'roboExtraPhrases', 'roboPhrases', 'vaultPhrases', 'apuestaPhrases',
  'aura', 'auraCobro', 'casino', 'duel', 'robo',
]);
const POOLS_FUERA = [
  /^cooldownPhrases:(AURA_TIRADA|AURA_APOSTAR|AURA_TOP_ANSIAS|AURA_TOP_POBRE|ROBO|ROBO_ASALTO|ROBO_GUARDIA)$/,
  /^avisos:DUELO_AJENO$/,
  /^rencorPhrases:(DUELO_|ROBO_)/,
  /^wingmanPhrases:(PIROPOS|WINGMAN_ANECDOTAS|WINGMAN_CIERRES)$/,
  /^accionPhrases:(FUCK|ANAL|CUM|SPANK|LICKASS|GROPE|UNDRESS|SEDUCE|PREG)$/,
];

// El mismo recorrido que scripts/frases.js (poolsDeTexto), apuntando además
// qué líneas llevan la marca.
const CADENA = /^\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1\s*,?\s*(?:\/\/.*)?$/;
const KICK_UNO = /^\s*(?:\{\s*)?uno:\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/;

function poolsDe(rel) {
  const lineas = fs.readFileSync(path.join(R, rel), 'utf8').split('\n');
  const base = path.basename(rel, '.js');
  const out = [];
  const pila = [];
  let funcion = null;
  let actual = null;
  let anonimas = 0;
  let padre = null;
  const cerrar = () => {
    if (actual && actual.frases.length >= 2) {
      const media = actual.frases.reduce((a, t) => a + t.texto.length, 0) / actual.frases.length;
      if (media >= 22 && actual.frases.some((t) => / \S+ /.test(t.texto))) out.push(actual);
    }
    actual = null;
  };
  for (const l of lineas) {
    const fn = /^(?:async\s+)?function\s+([A-Za-z_]\w*)/.exec(l);
    if (fn) { funcion = fn[1]; anonimas = 0; }
    const obj = /^\s*(?:(?:const|let|var)\s+([A-Za-z_]\w*)\s*=|([A-Za-z_]\w*)\s*:)\s*\{\s*$/.exec(l);
    if (obj && !actual) { pila.push(obj[1] || obj[2]); continue; }
    const lista = /^\s*(?:(?:const|let|var)\s+([A-Za-z_]\w*)\s*=|([A-Za-z_]\w*)\s*:|(return))\s*\[\s*$/.exec(l);
    if (lista) {
      cerrar();
      const nombre = lista[3] ? `${funcion || 'anonima'}()#${++anonimas}` : [...pila, lista[1] || lista[2]].join('.');
      actual = { pool: `${base}:${nombre}`, frases: [] };
      padre = { nombre, hijas: 0 };
      continue;
    }
    if (/^\s*\[\s*$/.test(l) && padre && (!actual || !actual.frases.length)) {
      actual = { pool: `${base}:${padre.nombre}[${padre.hijas++}]`, frases: [] };
      continue;
    }
    if (actual) {
      if (/^\s*\][,;)]?\s*$/.test(l)) { cerrar(); continue; }
      const m = CADENA.exec(l) || KICK_UNO.exec(l);
      if (m) actual.frases.push({ texto: m[2], marcada: MARCA.test(l) });
      continue;
    }
    if (/^\s*\}[,;]?\s*$/.test(l) && pila.length) pila.pop();
  }
  cerrar();
  return out;
}

function medir() {
  const todos = [];
  for (const dir of ['src/data', 'src/commands', 'src/utils']) {
    for (const f of fs.readdirSync(path.join(R, dir)).filter((x) => x.endsWith('.js')).sort()) {
      todos.push(...poolsDe(`${dir}/${f}`));
    }
  }
  const cuenta = (p) => !FICHEROS_DINAMICAS.has(p.pool.split(':')[0]) && !POOLS_FUERA.some((re) => re.test(p.pool));
  const pools = todos.filter(cuenta).map((p) => ({
    pool: p.pool, total: p.frases.length, marcadas: p.frases.filter((x) => x.marcada).length,
  }));
  const total = pools.reduce((a, p) => a + p.total, 0);
  const marcadas = pools.reduce((a, p) => a + p.marcadas, 0);
  const fuera = todos.filter((p) => !cuenta(p)).reduce((a, p) => a + p.frases.filter((x) => x.marcada).length, 0);
  return { pools, total, marcadas, pct: total ? (100 * marcadas) / total : 0, fueraMarcadas: fuera };
}

if (require.main === module) {
  const r = medir();
  const args = process.argv.slice(2);
  console.log(`\nDOBLE SENTIDO ESTILO ROCKSTAR: ${r.marcadas} de ${r.total} frases (${r.pct.toFixed(1)} %), objetivo ${MINIMO} %`);
  console.log('  (fuera de la cuenta: dinámicas del aura, !piropo, WINGMAN y acciones sexuales)\n');
  if (!args.includes('--total')) {
    for (const p of r.pools.slice().sort((a, b) => (b.marcadas / b.total) - (a.marcadas / a.total) || b.total - a.total)) {
      if (!p.marcadas && !args.includes('--todos')) continue;
      console.log(`  ${String(Math.round((100 * p.marcadas) / p.total)).padStart(3)} %  ${String(p.marcadas).padStart(3)}/${String(p.total).padEnd(3)} ${p.pool}`);
    }
    const sin = r.pools.filter((p) => !p.marcadas).length;
    if (sin && !args.includes('--todos')) console.log(`\n  ${sin} pools sin ninguna todavía (--todos para verlos)`);
  }
  if (args.includes('--minimo') && r.pct < MINIMO) {
    console.log(`\n✗ Por debajo del ${MINIMO} %: faltan ${Math.ceil((MINIMO / 100) * r.total) - r.marcadas} frases.`);
    process.exit(1);
  }
}

module.exports = { medir, MINIMO, SUELO };
