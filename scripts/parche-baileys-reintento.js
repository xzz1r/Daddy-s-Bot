#!/usr/bin/env node
'use strict';

// EL REINTENTO LLEVA LAS CLAVES DEL BOT DESDE LA PRIMERA VEZ (13 nov).
//
// Cuando el bot no puede abrir un mensaje de grupo porque no tiene la clave de
// quien lo manda, le pide que se lo reenvíe (recibo `retry`). Para reenviarlo,
// quien lo mandó necesita un canal de uno a uno con el dispositivo del bot, y
// tras vincular un número no hay ninguno: o coge una clave de un solo uso del
// servidor (ver src/utils/clavesUnUso.js) o las lleva el propio recibo.
// Baileys solo las mete a partir del segundo intento, y casi nadie contesta al
// primero, así que no llega al segundo (Baileys #2884).
//
// whatsmeow las mete desde el primero en este caso exacto —clave de grupo
// (`skmsg`) sin nada dirigido al dispositivo— y es lo que se hace aquí.
//
// Se aplica DESPUÉS de npm install (actualizar.sh ignora scripts). Un install
// nuevo borra node_modules y hay que volver a pasar por aquí. Con un fichero
// como argumento parchea ese (lo usa la capa 161).

const fs = require('fs');
const path = require('path');

const f = process.argv[2] || path.join(__dirname, '../node_modules/@whiskeysockets/baileys/lib/Socket/messages-recv.js');
let s;
try { s = fs.readFileSync(f, 'utf8'); }
catch (e) {
  console.log(`  · no pude leer baileys (${e.message})`);
  process.exit(0);
}

const ANTES = 'await sendRetryRequest(node, !encNode);';
const DESPUES = "await sendRetryRequest(node, !encNode || encNode.attrs?.type === 'skmsg');";

if (s.includes(DESPUES)) process.exit(0);
if (!s.includes(ANTES)) {
  console.log('  · baileys cambió el reintento; no parcheo las claves del primer intento');
  process.exit(0);
}
fs.writeFileSync(f, s.replace(ANTES, DESPUES));
console.log('  · baileys: el primer reintento de un mensaje de grupo lleva las claves del bot');
