// EL RITMO DEL BOT: que nunca dispare en ráfaga.
//
// Lo pidió el dueño al cambiar de número, porque el anterior se iba a revisión
// cada poco. Una cuenta que contesta diez cosas en el mismo segundo, expulsa a
// tres seguidas o pregunta por cincuenta números en fila no se parece a una
// persona, y eso es lo que WhatsApp mira.
//
// No cambia QUÉ hace el bot, solo CUÁNDO: cada tipo de llamada sale con un
// hueco mínimo desde la anterior del mismo tipo, más un poco de azar para que
// el hueco no sea siempre idéntico (un intervalo exacto también es una firma).
//
// SE ESPACIAN LOS ARRANQUES, NO SE ESPERA A QUE TERMINEN. Si una llamada se
// queda colgada, la siguiente sale igual cuando le toca: una cola que esperase
// a la anterior dejaría al bot mudo detrás de un envío que no vuelve nunca.
//
// El visto y el «en línea» NO pasan por aquí, por decisión del dueño.
'use strict';

const RITMOS = {
  // Mensajes, stickers, borrados y reacciones: todo es sendMessage.
  sendMessage: { hueco: 600, azar: 500 },
  // Expulsar, ascender, degradar.
  groupParticipantsUpdate: { hueco: 2500, azar: 1500 },
  // Aceptar o rechazar solicitudes de entrada.
  groupRequestParticipantsUpdate: { hueco: 3000, azar: 1500 },
  // Preguntar si un número tiene WhatsApp. Es lo más vigilado: consultar
  // números en serie es exactamente lo que hace un programa de spam.
  onWhatsApp: { hueco: 2000, azar: 1500, porDia: 60 },
};

// Cada tipo lleva su propio reloj: un borrado no tiene por qué esperar a una
// expulsión, y al revés.
function crearRitmo({ hueco, azar = 0 }, ahora = Date.now, aleatorio = Math.random) {
  let libre = 0;
  return function turno() {
    const t = ahora();
    const sale = Math.max(t, libre);
    libre = sale + hueco + Math.floor(aleatorio() * azar);
    return sale - t;   // cuánto hay que esperar antes de salir
  };
}

const esperar = (ms) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

// El tope del día se cuenta en memoria. Un reinicio lo pone a cero, y está
// bien: lo que se frena es la ráfaga de un comando, no una auditoría.
function crearTope(porDia, ahora = Date.now) {
  let dia = null;
  let usados = 0;
  return function gastar() {
    const hoy = new Date(ahora()).toISOString().slice(0, 10);
    if (hoy !== dia) { dia = hoy; usados = 0; }
    if (usados >= porDia) return false;
    usados++;
    return true;
  };
}

class TopeDiario extends Error {
  constructor(que, porDia) {
    super(`tope diario de ${que} alcanzado (${porDia})`);
    this.code = 'TOPE_DIARIO';
  }
}

// Envuelve los métodos del socket. Se llama una vez por socket nuevo: cada
// reconexión trae un objeto distinto y sin envolver.
function ponerRitmo(sock, ritmos = RITMOS) {
  if (!sock || sock.__conRitmo) return sock;
  for (const [metodo, cfg] of Object.entries(ritmos)) {
    const original = sock[metodo];
    if (typeof original !== 'function') continue;
    const turno = crearRitmo(cfg);
    const gastar = cfg.porDia ? crearTope(cfg.porDia) : null;
    sock[metodo] = async function conRitmo(...args) {
      if (gastar && !gastar()) throw new TopeDiario(metodo, cfg.porDia);
      await esperar(turno());
      return original.apply(this, args);
    };
  }
  Object.defineProperty(sock, '__conRitmo', { value: true });
  return sock;
}

module.exports = { ponerRitmo, crearRitmo, crearTope, RITMOS, TopeDiario };
