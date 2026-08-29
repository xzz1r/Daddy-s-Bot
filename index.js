#!/usr/bin/env node
'use strict';

require('dotenv').config();

// Antes de cargar nada de Baileys: libsignal vuelca sus sesiones por
// console.info y ahoga el log entero. Ver src/utils/silenciarSignal.js.
require('./src/utils/silenciarSignal').silenciarSignal();

const chalk = require('chalk');

console.log(chalk.magenta(`
╔══════════════════════════════╗
║         Daddy's Bot          ║
╚══════════════════════════════╝
`));

// LA HUELLA SE IMPRIME AQUI, AL ARRANCAR, NO AL CONECTAR.
//
// Antes solo salia dentro del `connection === 'open'`, y conectar tarda: entre
// que el proceso arranca y que WhatsApp abre la sesion pueden pasar minutos, o
// no pasar nunca si la red esta mal. En toda esa ventana el log seguia
// enseñando la huella del arranque ANTERIOR, que se lee exactamente igual que
// "el bot corre codigo viejo". Con eso el despliegue acusaba al bot de no
// haberse actualizado teniendo el commit correcto cargado.
//
// Aqui sale a los pocos milisegundos de arrancar y responde a la unica
// pregunta que se le hacia: que codigo hay en memoria. Si el proceso arranco,
// la huella esta; si no esta, es que no arranco — y eso si es un fallo.
const { COMMIT_ARRANQUE } = require('./src/utils/version');
console.log(`  commit cargado : ${COMMIT_ARRANQUE}\n`);

const { connectToWhatsApp } = require('./src/bot');

connectToWhatsApp().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
