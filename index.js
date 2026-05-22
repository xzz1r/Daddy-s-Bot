#!/usr/bin/env node
'use strict';

const chalk = require('chalk');

console.log(chalk.magenta(`
╔══════════════════════════════╗
║       SocialBot WhatsApp     ║
║    Música · Tops · Stickers  ║
╚══════════════════════════════╝
`));

const { connectToWhatsApp } = require('./src/bot');

connectToWhatsApp().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
