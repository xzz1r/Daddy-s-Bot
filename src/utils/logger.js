const chalk = require('chalk');

const timestamp = () => new Date().toLocaleTimeString('es-AR', { hour12: false });
const VERBOSE = process.env.LOG_LEVEL === 'verbose';

const logger = {
  info:    (msg) => VERBOSE && console.log(chalk.cyan(`[${timestamp()}] [INFO] `) + msg),
  success: (msg) => VERBOSE && console.log(chalk.green(`[${timestamp()}] [OK] `) + msg),
  warn:    (msg) => VERBOSE && console.log(chalk.yellow(`[${timestamp()}] [WARN] `) + msg),
  bot:     (msg) => VERBOSE && console.log(chalk.magenta(`[${timestamp()}] [BOT] `) + msg),
  cmd:     ()    => {},
  error:   (msg) => console.log(chalk.red(`[${timestamp()}] [ERROR] `) + msg),
};

module.exports = logger;
