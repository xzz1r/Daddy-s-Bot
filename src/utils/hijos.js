// LOS PROCESOS PESADOS, POR DETRAS DEL BOT.
//
// ffmpeg, ffprobe y yt-dlp se lanzaban con la misma prioridad que el propio
// bot. En una VPS con pocos nucleos eso se nota en todo: mientras la despensa
// convierte un gif o alguien pide un *!tt*, el proceso del bot compite por la
// CPU con ellos, y lo que llega de WhatsApp se atiende tarde. Lo vio el dueño
// en el *!ping*: 121 y al rato 230, con la misma red.
//
// Se lanzan con la prioridad mas baja que deja el sistema (nice 19). No van mas
// lentos cuando la maquina esta libre —nice solo decide quien pasa primero
// cuando hay cola— y cuando no lo esta, el que pasa primero es el bot, que es
// el que tiene a alguien esperando una respuesta.
//
// Subir la del bot pediria permisos de administrador; bajar la de los hijos no
// pide nada. Si el sistema no lo deja, se sigue igual que antes: no es motivo
// para no convertir un sticker.
const { spawn } = require('child_process');
const os = require('os');

const PRIORIDAD_FONDO = 19;

function spawnSuave(cmd, args, opts) {
  const proc = spawn(cmd, args, opts);
  if (proc?.pid) {
    try { os.setPriority(proc.pid, PRIORIDAD_FONDO); } catch { /* sin permiso: se queda como estaba */ }
  }
  return proc;
}

module.exports = { spawnSuave, PRIORIDAD_FONDO };

// ─── CUANTO SE RETRASA EL PROPIO BOT ───────────────────────────────────────
//
// Para saber de donde sale un *!ping* alto: si el bot va desahogado y el ping
// sube, es la red entre la VPS y WhatsApp; si el bot se queda parado decenas de
// milisegundos, es el bot. Lo enseña *!diag*. Es un histograma de Node que mide
// cuanto llega tarde un temporizador de 20 ms, sin coste apreciable. Se
// reinicia cada 15 minutos para que hable de ahora y no de hace dos dias.
const { monitorEventLoopDelay } = require('perf_hooks');
const RESOLUCION_MS = 20;
const histograma = monitorEventLoopDelay({ resolution: RESOLUCION_MS });
histograma.enable();
let medidoDesde = Date.now();
setInterval(() => { histograma.reset(); medidoDesde = Date.now(); }, 15 * 60 * 1000).unref();

// Lo que se pasa del temporizador, ya sin la resolucion: 0 es ir sobrado.
function retrasoBucle() {
  const neto = (ns) => Math.max(0, Math.round(ns / 1e6 - RESOLUCION_MS));
  return {
    p50: neto(histograma.percentile(50)),
    p99: neto(histograma.percentile(99)),
    max: neto(histograma.max),
    minutos: Math.max(1, Math.round((Date.now() - medidoDesde) / 60000)),
  };
}

module.exports.retrasoBucle = retrasoBucle;
