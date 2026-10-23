#!/usr/bin/env node
'use strict';

// Un dispositivo vinculado recibe la foto de ver una vez como fanout vacío
// (`view_once_unavailable_fanout`). Baileys no pide el reenvío: la salta junto
// con los fanout de bot y de hosted, y el mensaje no llega nunca.
//
// WhatsApp Web sí lo pide (placeholder resend). Sin eso, /s y /toimg no tienen
// bytes que guardar cuando el sobre viene vacío. El otro camino —stanza con
// url y mediaKey— lo cubre el bot, bajando antes del acuse `played`.
//
// Se aplica DESPUÉS de npm install (actualizar.sh ignora scripts). Un install
// nuevo borra node_modules y hay que volver a pasar por aquí.

const fs = require('fs');
const path = require('path');

const f = path.join(__dirname, '../node_modules/@whiskeysockets/baileys/lib/Socket/messages-recv.js');
let s;
try { s = fs.readFileSync(f, 'utf8'); }
catch (e) {
  console.log(`  · no pude leer baileys (${e.message})`);
  process.exit(0);
}

const salta = `unavailableType === 'bot_unavailable_fanout' ||
                            unavailableType === 'hosted_unavailable_fanout' ||
                            unavailableType === 'view_once_unavailable_fanout'`;
const sigue = `unavailableType === 'bot_unavailable_fanout' ||
                            unavailableType === 'hosted_unavailable_fanout'`;

if (!s.includes('view_once_unavailable_fanout')) {
  console.log('  · baileys ya no salta el fanout de ver una vez');
  process.exit(0);
}
if (!s.includes(salta)) {
  console.log('  · baileys cambió el bloque del fanout; no parcheo ver una vez');
  process.exit(0);
}
fs.writeFileSync(f, s.replace(salta, sigue));
console.log('  · baileys: ver una vez pide el reenvío al teléfono, como WhatsApp Web');
