const chalk = require('chalk');

const timestamp = () => new Date().toLocaleTimeString('es-AR', { hour12: false });
const VERBOSE = process.env.LOG_LEVEL === 'verbose';

const logger = {
  info:    (msg)         => VERBOSE && console.log(chalk.cyan(`[${timestamp()}] [INFO] `) + msg),
  success: (msg)         => VERBOSE && console.log(chalk.green(`[${timestamp()}] [OK] `) + msg),
  // warn/error are ALWAYS shown — these report moderation failures (anti-admin/
  // anti-business couldn't act) and persistence failures, which must not be
  // invisible in normal (non-verbose) operation. Both go to stderr.
  warn:    (msg)         => console.error(chalk.yellow(`[${timestamp()}] [WARN] `) + msg),
  bot:     (msg)         => VERBOSE && console.log(chalk.magenta(`[${timestamp()}] [BOT] `) + msg),
  cmd:     (user, text)  => VERBOSE && console.log(chalk.blue(`[${timestamp()}] [CMD] `) + user + ' › ' + text),
  error:   (msg)         => console.error(chalk.red(`[${timestamp()}] [ERROR] `) + msg),
};

module.exports = logger;
