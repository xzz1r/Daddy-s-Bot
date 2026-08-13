// ¿Arranca el bot, y dice lo que debe decir?
//
// EXISTE POR UN FALLO REAL Y CARO. Un lote de frases entró con dos errores de
// sintaxis —comillas sin escapar en ship.js y 101 frases partidas en dos líneas
// en wingman.js— y el bot dejó de arrancar. Los dos validadores que ya había
// (placeholders y pools) salieron EN VERDE, porque comparan líneas con
// expresiones regulares: no compilan nada. Nadie comprobaba lo más básico.
//
// Aquí se comprueba, en tres capas de menos a más exigente:
//
//   1. COMPILA   — cada .js es JavaScript válido. Pilla comillas sin escapar,
//                  cadenas partidas, comas de más.
//   2. CARGA     — cada módulo se puede importar. Pilla requires rotos y
//                  exports que faltan, que compilan bien y revientan al usarse.
//   3. RESPONDE  — se ejecutan los comandos de porcentaje muchas veces con un
//                  sock falso. Pilla excepciones en caliente y, sobre todo,
//                  placeholders que llegan SIN sustituir al mensaje final, que
//                  es el fallo que el grupo ve escrito en crudo.
//
// Las capas 2 y 3 necesitan node_modules. Si no está instalado se saltan con un
// aviso en vez de fallar: la capa 1, que es la que pilla el bot caído, corre
// siempre y no depende de nada.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Module = require('module');

const R = path.resolve(__dirname, '..');
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const verde = (s) => `\x1b[32m${s}\x1b[0m`;

let fallos = 0;

function ficherosJs() {
  const out = [];
  (function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      if (f === 'node_modules' || f === '.git' || f === 'temp') continue;
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (f.endsWith('.js')) out.push(p);
    }
  })(R);
  return out;
}

// ─── 1. ¿Compila? ────────────────────────────────────────────────────────────
//
// Se envuelve el código igual que hace Node con un módulo CommonJS antes de
// compilarlo. Sin ese envoltorio, un `return` en el cuerpo del módulo —legal en
// CJS— se contaría como error.
console.log('\n1. COMPILA');
const ficheros = ficherosJs();
for (const abs of ficheros) {
  const rel = path.relative(R, abs);
  try {
    // El shebang de los ejecutables (#!/usr/bin/env node) lo quita Node al
    // cargar, pero vm.Script no: sin retirarlo, index.js daría un falso error
    // de sintaxis en la línea 1.
    const codigo = fs.readFileSync(abs, 'utf8').replace(/^#![^\n]*/, '');
    new vm.Script(Module.wrap(codigo), { filename: abs });
  } catch (e) {
    fallos++;
    console.log(rojo(`   ✗ ${rel}`));
    console.log(`     ${e.message}`);
    // La línea del error es lo único que hace falta para arreglarlo.
    const linea = (e.stack || '').split('\n').find((l) => l.includes(abs));
    if (linea) console.log(`     ${linea.trim()}`);
  }
}
if (!fallos) console.log(verde(`   ✓ ${ficheros.length} ficheros compilan`));

// Si algo no compila, las capas siguientes solo darían ruido derivado.
if (fallos) {
  console.log(rojo(`\n${fallos} fichero(s) con sintaxis inválida: EL BOT NO ARRANCA.`));
  process.exit(1);
}

// ─── 2. ¿Carga? ──────────────────────────────────────────────────────────────
if (!fs.existsSync(path.join(R, 'node_modules'))) {
  console.log('\n2-3. CARGA y RESPONDE — saltadas (falta node_modules; corre `npm install`)');
  console.log(verde('\nSintaxis correcta.'));
  process.exit(0);
}

process.env.OWNER_NUMBER = process.env.OWNER_NUMBER || '34600000000';
console.log('\n2. CARGA');
for (const dir of ['src/commands', 'src/utils', 'src/data', 'src/handlers']) {
  for (const f of fs.readdirSync(path.join(R, dir)).filter((x) => x.endsWith('.js'))) {
    const rel = path.join(dir, f);
    try {
      require(path.join(R, rel));
    } catch (e) {
      fallos++;
      console.log(rojo(`   ✗ ${rel}: ${e.message.split('\n')[0]}`));
    }
  }
}
if (!fallos) console.log(verde('   ✓ todos los módulos importan'));

// ─── 3. ¿Responde? ───────────────────────────────────────────────────────────
console.log('\n3. RESPONDE');
const percent = require(path.join(R, 'src/commands/percent.js'));
const comandos = Object.keys(percent).filter((k) => k.startsWith('cmd'));

// Los tres marcadores que usa el bot. Si uno llega hasta aquí es que su
// consumidor no lo sustituyó, y el grupo lo leería tal cual.
const CRUDO = /%[A-Z]\b|\[[a-zA-Z_]+\]|\{[a-zA-Z_]+\}/;

const TIRADAS = 60;   // suficiente para tocar los tres tramos de cada comando
let mensajes = 0;

const sock = {
  sendMessage: async (jid, contenido) => {
    mensajes++;
    const texto = contenido.text || '';
    if (!texto.trim()) {
      fallos++;
      console.log(rojo('   ✗ mensaje vacío'));
    } else if (CRUDO.test(texto)) {
      fallos++;
      console.log(rojo(`   ✗ placeholder sin sustituir: ${texto.slice(0, 90)}`));
    }
    return {};
  },
};

const msg = {
  key: { remoteJid: '000@g.us', participant: '34611111111@s.whatsapp.net', fromMe: false },
  message: { conversation: '!check' },
};
const groupMeta = { id: '000@g.us', participants: [{ id: '34611111111@s.whatsapp.net', admin: null }] };

(async () => {
  for (const c of comandos) {
    for (let i = 0; i < TIRADAS; i++) {
      try {
        await percent[c](sock, msg, groupMeta);
      } catch (e) {
        fallos++;
        console.log(rojo(`   ✗ ${c} lanzó: ${e.message.split('\n')[0]}`));
        break;
      }
    }
  }
  if (!fallos) {
    console.log(verde(`   ✓ ${comandos.length} comandos × ${TIRADAS} tiradas = ${mensajes} mensajes, todos limpios`));
  }

  console.log(`\n${'─'.repeat(70)}`);
  if (fallos) {
    console.log(rojo(`${fallos} fallo(s). NO commitees esto.`));
    process.exit(1);
  }
  console.log(verde('El bot arranca, carga y responde.'));
})();
