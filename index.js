#!/usr/bin/env node
'use strict';

require('dotenv').config();

const chalk = require('chalk');

console.log(chalk.magenta(`
╔══════════════════════════════╗
║         Daddy's Bot          ║
║       by xz1s (Sebastian)    ║
╚══════════════════════════════╝
`));

const { connectToWhatsApp } = require('./src/bot');

connectToWhatsApp().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
