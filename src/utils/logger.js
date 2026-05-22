const chalk = require('chalk');

const timestamp = () => new Date().toLocaleTimeString('es-AR', { hour12: false });

const logger = {
  info: (msg) => console.log(chalk.cyan(`[${timestamp()}] [INFO] `) + msg),
  success: (msg) => console.log(chalk.green(`[${timestamp()}] [OK] `) + msg),
  warn: (msg) => console.log(chalk.yellow(`[${timestamp()}] [WARN] `) + msg),
  error: (msg) => console.log(chalk.red(`[${timestamp()}] [ERROR] `) + msg),
  bot: (msg) => console.log(chalk.magenta(`[${timestamp()}] [BOT] `) + msg),
  cmd: (user, cmd) => console.log(chalk.blue(`[${timestamp()}] [CMD] `) + `${user} → ${cmd}`),
};

module.exports = logger;
