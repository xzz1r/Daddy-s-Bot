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

  // SIEMPRE VISIBLE, como warn y error. Es para los pocos hitos del arranque:
  // "estado cargado", "sesion leida", "abriendo la conexion".
  //
  // Esas tres lineas existen para saber DONDE se quedo colgado un arranque, y
  // estaban en logger.info — o sea, apagadas salvo con LOG_LEVEL=verbose, que
  // en el VPS no se usa. Una traza de diagnostico que no se ve en produccion no
  // es una traza: es una linea de codigo que no hace nada el dia que hace falta.
  paso:    (msg)         => console.log(chalk.cyan(`[${timestamp()}] [ARRANQUE] `) + msg),
};

module.exports = logger;
