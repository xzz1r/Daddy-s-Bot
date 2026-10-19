'use strict';

// CUANDO WHATSAPP NO DEJA ENTRAR A LA CUENTA.
//
// 19 oct: el bot se quedó en bucle con `403 Connection Failure`. Abría,
// WhatsApp lo echaba y vuelta a empezar, para siempre, porque todo lo que no
// era un 401 se tomaba por un corte de red. Con estos tres códigos no lo es:
// WhatsApp rechaza la cuenta o la sesión guardada, y reintentar no arregla
// nada. Solo repite justo la actividad que agrava una restricción.
//
// Qué es cada uno sale de whatsmeow, que lo sacó de WhatsApp Web. Allí, con
// 403 y 406 se borra la sesión, y con ninguno de los tres se reconecta.
//
// El guardián lleva su propia copia corta de esto: no carga nada del
// repositorio, para poder correr suelto.
const RECHAZOS = {
  402: 'WhatsApp ha bloqueado la cuenta del bot por un tiempo',
  // WhatsApp Web lo llama LOCKED. Sale igual al bloquear la cuenta que al
  // registrar el número en otro teléfono, que se lleva por delante todos los
  // dispositivos vinculados.
  403: 'WhatsApp ya no acepta la sesión guardada del bot. Pasa al registrar el número en otro teléfono, al reinstalar WhatsApp o al bloquear la cuenta',
  // Y este lo llama BANNED.
  406: 'WhatsApp ha cerrado la sesión del bot sin decir por qué. En WhatsApp Web es el código de cuenta bloqueada',
};

// El 402 dice por qué con un número.
const MOTIVOS_402 = {
  101: 'escribir a demasiada gente que no tiene el número guardado',
  102: 'que demasiada gente lo ha bloqueado',
  103: 'crear demasiados grupos con gente que no tiene el número guardado',
  104: 'mandar el mismo mensaje a demasiada gente',
  106: 'mandar demasiados mensajes a una lista de difusión',
};

const HAZ_402 = 'No vuelvas a vincular: la sesión sigue valiendo. Cuando se levante, arranca a mano con: pm2 restart bot';
const HAZ_SESION_MUERTA =
  'Mira el teléfono del bot. Si WhatsApp avisa de un bloqueo, pide la revisión desde la app y deja el bot parado. ' +
  'Si funciona normal, aparta la sesión vieja y vincula otra vez: ' +
  'pm2 stop bot && mv data/auth data/auth.viejo-$(date +%F) && node index.js --codigo <numero>';

// Lo que llega del servidor va a una línea del log: sin saltos y con tope.
function limpio(texto) {
  return typeof texto === 'string' ? texto.replace(/\s+/g, ' ').trim().slice(0, 200) : '';
}

function cuantoFalta(segundos) {
  return segundos < 3600 ? `${Math.ceil(segundos / 60)} min` : `${Math.ceil(segundos / 3600)} h`;
}

// Lo que dice WhatsApp, cuando lo dice: el 403 puede traer el título y el texto
// del aviso que sale en el teléfono, y el 402 el motivo y cuánto queda.
function loQueDice(codigo, datos) {
  if (!datos || typeof datos !== 'object') return '';
  const partes = [limpio(datos.logout_message_header), limpio(datos.logout_message_subtext)];
  if (codigo === 402) {
    const motivo = MOTIVOS_402[Number(datos.code)];
    if (motivo) partes.push(`por ${motivo}`);
    else if (limpio(String(datos.code ?? ''))) partes.push(`motivo ${limpio(String(datos.code))}`);
    const segundos = Number(datos.expire);
    if (Number.isFinite(segundos) && segundos > 0) partes.push(`se levanta en ${cuantoFalta(segundos)}`);
  }
  return partes.filter(Boolean).join(' · ');
}

// null si el código no es de los que cierran la puerta. Si lo es: qué ha
// pasado, lo que dice WhatsApp (o '') y qué hacer.
function explicarRechazo(codigo, datos) {
  const n = Number(codigo);
  if (!RECHAZOS[n]) return null;
  return { que: RECHAZOS[n], dice: loQueDice(n, datos), haz: n === 402 ? HAZ_402 : HAZ_SESION_MUERTA };
}

module.exports = { explicarRechazo, CODIGOS_RECHAZO: Object.keys(RECHAZOS).map(Number) };
