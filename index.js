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
║           by xz1s            ║
╚══════════════════════════════╝
`));

const { connectToWhatsApp } = require('./src/bot');

connectToWhatsApp().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
