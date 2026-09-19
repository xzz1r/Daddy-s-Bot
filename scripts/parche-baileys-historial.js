#!/usr/bin/env node
'use strict';

// Baileys registra el companion con supportGroupHistory: false. El teléfono
// entonces acepta el on-demand (devuelve un id de sesión) y no suelta NI UN
// mensaje de grupo. !limpiar no puede borrar lo de antes porque no hay ids.
//
// Esto se aplica DESPUÉS de npm install (actualizar.sh ignora scripts).
// Solo vale para la PRÓXIMA vinculación; la sesión actual ya mandó false.

const fs = require('fs');
const path = require('path');

const f = path.join(__dirname, '../node_modules/@whiskeysockets/baileys/lib/Utils/validate-connection.js');
let s;
try { s = fs.readFileSync(f, 'utf8'); }
catch (e) {
  console.log(`  · no pude leer baileys (${e.message})`);
  process.exit(0);
}
if (s.includes('supportGroupHistory: true')) {
  process.exit(0);
}
if (!s.includes('supportGroupHistory: false')) {
  console.log('  · baileys ya no tiene supportGroupHistory: false; no parcheo');
  process.exit(0);
}
fs.writeFileSync(f, s.replace('supportGroupHistory: false', 'supportGroupHistory: true'));
console.log('  · baileys: historial de grupo activado (vale en la próxima vinculación)');
