// Calla los volcados de libsignal.
//
// libsignal imprime con console.info/console.warn DIRECTAMENTE, así que el
// logger silencioso que Baileys recibe no le afecta. Y no imprime una línea:
// vuelca el objeto SessionEntry entero, con sus buffers de claves, unas treinta
// líneas por cada sesión que cierra. En un grupo activo eso llega a ser la
// práctica totalidad del log.
//
// El daño no es estético. Con el log inundado:
//   · no se ve si. el bot llegó a conectar ni por qué se cayó — que es
//     exactamente lo que hizo falta mirar estos días;
//   · pm2-logrotate corta a 10 MB y va rotando, así que el historial útil se
//     pierde en horas;
//   · en una VPS con poco disco, es escribir megas por nada.
//
// Se filtran SOLO los mensajes conocidos de libsignal, por su texto exacto. Un
// silenciador general de console.info se llevaría por delante avisos que sí
// importan, y este fichero volvería a ser el sitio donde se esconden los fallos.
//
// Los volcados no aportan nada operativo: cerrar y rotar sesiones de cifrado es
// el funcionamiento normal del protocolo, no un problema. Se cuentan por si
// alguna vez hace falta saber el volumen.

const PATRONES = [
  /^Closing session:/,
  /^Removing old closed session:/,
  /^Closing open session in favor of incoming prekey bundle/,
  /^Session error:/,
  /^Failed to decrypt message with any known session/,
];

let silenciados = 0;

function esRuidoDeSignal(args) {
  const primero = args[0];
  if (typeof primero !== 'string') return false;
  return PATRONES.some(p => p.test(primero));
}

function silenciarSignal() {
  for (const nivel of ['info', 'warn', 'log']) {
    const original = console[nivel].bind(console);
    console[nivel] = (...args) => {
      if (esRuidoDeSignal(args)) { silenciados++; return; }
      original(...args);
    };
  }
}

const cuantosSilenciados = () => silenciados;

module.exports = { silenciarSignal, cuantosSilenciados, PATRONES };
