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


// ─── EL FALLO QUE NADIE VE ───────────────────────────────────────────────────
//
// Habia 48 `catch {}` y `.catch(() => {})` por el bot: 38 en el manejador de
// mensajes y 34 en el arranque. Cada uno se traga una excepcion y no deja
// rastro, y esa es la razon por la que los tres fallos gordos de esta semana
// —el guardian reiniciandose en bucle, la despensa comiendose el event loop, y
// diez guardas del validador aprobando codigo roto— tuvieron todos el mismo
// sintoma: nada en el log.
//
// El motivo original de tragarselos es bueno y sigue en pie: un fallo al marcar
// un mensaje como leido no puede tumbar la respuesta, y repetirlo mil veces en
// el log es otra forma de no decir nada. Lo que hacia falta no era gritar, era
// decirlo UNA VEZ.
//
// `unaVez(donde, error)` escribe la primera vez que ese sitio falla con ese
// mensaje, y a partir de ahi calla y cuenta. Cada media hora, si ha vuelto a
// pasar, suelta una linea con el recuento. Asi un fallo permanente ocupa dos
// lineas al dia en vez de dos mil, y un fallo que ocurre una vez deja de ser
// invisible.
const _vistos = new Map();   // 'donde|mensaje' -> { n, ultimo }
const REPETIR_MS = 30 * 60 * 1000;

function unaVez(donde, err) {
  const causa = (err && (err.message || err.code)) || String(err || 'sin mensaje');
  const k = `${donde}|${causa}`;
  const ahora = Date.now();
  const v = _vistos.get(k);
  if (!v) {
    _vistos.set(k, { n: 1, ultimo: ahora });
    logger.warn(`${donde}: ${causa}`);
    return;
  }
  v.n++;
  if (ahora - v.ultimo >= REPETIR_MS) {
    logger.warn(`${donde}: ${causa} (${v.n} veces desde el ultimo aviso)`);
    v.n = 0;
    v.ultimo = ahora;
  }
  // El mapa no crece sin tope: son sitios del codigo, no datos. Aun asi, un
  // mensaje de error que lleve dentro un id distinto cada vez podria hacerlo
  // crecer, y por eso hay tope.
  if (_vistos.size > 500) _vistos.delete(_vistos.keys().next().value);
}

logger.unaVez = unaVez;
logger._vistos = _vistos;

module.exports = logger;
