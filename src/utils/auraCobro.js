// Cobro de aura por usar un comando. El aura deja de ser solo un marcador y
// pasa a ser moneda: hay cosas que cuestan.
//
// El cobro va SIEMPRE antes de gastar el recurso (descarga, llamada a la API,
// consulta a WhatsApp) y se devuelve si el recurso falla, para que nadie pague
// por una canción que no llegó.

const { spendAura, addAura } = require('./auraStore');
const { PRECIOS, SALDO_MINIMO, ACTIVIDAD_MSGS } = require('./economia');
const { fmt, pickFresh } = require('./helpers');
const { isOwner } = require('./wa');

// Intenta cobrar `concepto` al remitente. Devuelve:
//   { ok: true,  pagado, saldo }        — cobrado, adelante
//   { ok: false, precio, saldo }        — no le llega, el comando debe abortar
//
// El owner tier no paga: administra el bot, no lo consume.
async function cobrar(groupJid, senderJid, concepto, { fromMe = false, groupMeta = null } = {}) {
  const precio = PRECIOS[concepto];
  if (!precio) return { ok: true, pagado: 0, saldo: null };
  if (isOwner(senderJid, fromMe, groupMeta)) return { ok: true, pagado: 0, saldo: null, exento: true };

  // Comprobar y descontar tiene que ser UNA sola operacion: si se hace en dos
  // pasos, dos comandos simultaneos del mismo usuario leen el mismo saldo antes
  // de que ninguno escriba y los dos cobran. Con el saldo justo eso dejaba al
  // usuario en negativo comprando, que es lo que SALDO_MINIMO impide.
  const r = await spendAura(groupJid, senderJid, precio, SALDO_MINIMO);
  if (!r.ok) return { ok: false, precio, saldo: r.saldo };
  return { ok: true, pagado: precio, saldo: r.current };
}

// Devuelve lo cobrado. Se llama cuando el recurso falló después del cobro.
async function devolver(groupJid, senderJid, pagado) {
  if (!pagado) return;
  await addAura(groupJid, senderJid, pagado);
}

// Burlas para el que no llega. Es el momento más divertido del comando: alguien
// ha ido a gastar y no tiene. El bot no consuela, se ríe.
//
// Están escritas para leerse DELANTE DEL GRUPO, porque ahí es donde salen. La
// gracia no es que te digan que no tienes dinero, es que te lo digan en público.
const MISERIA = [
  'No te llega ni para el mínimo del sistema: miseria de aura documentada sin filtro., joder y duele de lo previsible.',
  'Saldo en modo supervivencia extrema: no cubres ni el cobro más barato del catálogo., mierda sin derecho a bis.',
  'Pobre de aura de verdad: el contador no maquilla la miseria ni un decimal., coño con el chat de testigo.',
  'No hay con qué pagar: la miseria no es estética de mensaje, es el número en rojo., cabrón punto final del parte.',
  'Aura insuficiente hasta para el peaje más bajo: vuelve cuando el contador suba de verdad., gilipollas.',
  'Miseria total: el cobro se cancela porque no hay de dónde sacar ni una unidad., patético en alta definición.',
  'El saldo grita pobreza en voz alta: el bot solo traduce el grito a este mensaje., ridículo como manda el ranking.',
  'No cubres el mínimo: la miseria es el estado de la cuenta, no un insulto gratis., basura sin descuento emocional.',
  'Aura en modo mendigo operativo: ni el cobro simbólico encuentra de dónde tirar., desperdicio y el contador no miente.',
  'Pobreza de contador: el ranking te ve abajo y el cobro confirma el mismo diagnóstico., asco delante de quien miraba.',
  'No hay saldo útil: hay miseria clara y el mensaje no necesita adorno., cutre con firma legible.',
  'Insuficiente de forma crónica: la miseria no es un mal día, es el paisaje., pringado y basta de cuento.',
  'El cobro necesita aura y tú tienes el hueco: miseria operativa, fracasado al natural, sin filtro.',
  'Saldo que da vergüenza ajena al que mira: miseria sin filtro ni relato heroico., joder que es como duele de verdad.',
  'No te llega: el bot no inventa crédito para pobres de aura en este sistema., mierda y el resto es ruido.',
  'Miseria documentada en el contador: el cobro se queda esperando a otro día., coño y duele de lo previsible.',
  'Pobre de verdad: ni el mínimo del sistema te reconoce como solvente., cabrón sin derecho a bis.',
  'Aura en números que dan pena ajena: miseria legible a simple vista., gilipollas con el chat de testigo.',
  'No hay de dónde cobrar: hay de dónde señalar la miseria y poco más., patético punto final del parte.',
  'Saldo insuficiente de forma crónica: la miseria es el estado, no el accidente., ridículo y no hay segunda lectura.',
  'El mínimo del cobro te supera por goleada: la miseria te define en este mensaje., basura en alta definición.',
  'Pobreza de aura: no cubres el peaje, punto final del trámite., desperdicio como manda el ranking.',
  'No te llega ni para empezar el cobro más barato: miseria de manual., asco sin descuento emocional.',
  'El contador en modo supervivencia extrema: miseria sin maquillaje posible., cutre y el contador no miente.',
  'Aura que no cubre el peaje más ridículo del sistema: pobreza real., pringado delante de quien miraba.',
  'Miseria: la palabra exacta para este saldo y este mensaje., fracasado con firma legible.',
  'No hay saldo útil en la cuenta: hay hueco, y el cobro se va a otro lado., joder y basta de cuento.',
  'Pobre de aura hasta para el trámite más barato del catálogo., mierda al natural, sin filtro.',
  'Insuficiente y se nota sin esfuerzo: miseria legible en el primer vistazo., coño que es como duele de verdad.',
  'El cobro choca de frente con la miseria de tu contador., cabrón y el resto es ruido.',
  'Saldo en rojo de vergüenza: miseria sin derecho a relato de superación., gilipollas y duele de lo previsible.',
  'No cubres: la miseria no negocia el mínimo ni pide cita., patético sin derecho a bis.',
  'Aura de quien no llega nunca al peaje: el bot solo lo dice en claro., ridículo con el chat de testigo.',
  'Pobreza operativa: el cobro no encuentra una sola unidad de dónde tirar., basura punto final del parte.',
  'Miseria de contador: el ranking y el cobro coinciden en el mismo diagnóstico., desperdicio y no hay segunda lectura.',
  'No te llega ni al borde del mínimo: miseria limpia y sin adorno., asco en alta definición.',
  'Saldo que no sostiene ni un cobro simbólico: pobreza documentada., cutre como manda el ranking.',
  'Aura insuficiente de forma que ya no sorprende a nadie: miseria estable., pringado sin descuento emocional.',
  'El mínimo es un muro y tú estás al otro lado, en la miseria., fracasado y el contador no miente.',
  'Pobre de aura documentado: el cobro queda en espera que no termina., joder delante de quien miraba.',
  'No hay con qué pagar el peaje: hay con qué señalar. Miseria., mierda con firma legible.',
  'Contador en modo mendigo: el sistema no fía ni una unidad., coño y basta de cuento.',
  'Miseria: no es adorno retórico del mensaje, es el dato del contador., cabrón al natural, sin filtro.',
  'No cubres el cobro más bajo del sistema: la pobreza de aura es el veredicto., gilipollas que es como duele de verdad.',
  'Saldo que da pena: miseria sin derecho a pose de víctima elegante., patético y el resto es ruido.',
  'Aura en el sótano del ranking: el cobro no baja a buscarla., ridículo y duele de lo previsible.',
  'Insuficiente crónico: miseria como estado permanente, no como accidente de un día., basura sin derecho a bis.',
  'El peaje te queda grande: la miseria te queda justa y visible., desperdicio con el chat de testigo.',
  'Pobreza de contador legible a simple vista sin necesidad de zoom., asco punto final del parte.',
  'No te llega. Miseria. El trámite termina aquí., cutre y no hay segunda lectura.'
];

// Texto del rechazo: el precio, el saldo y CÓMO remontar.
//
// Antes terminaba en "tienes 3" y ya. Es el único momento en el que alguien
// mira el aura de verdad — acaba de chocarse con ella — y era justo cuando el
// bot se callaba, así que el que no sabía de qué iba se quedaba igual.
//
// Se dicen las dos vías reales y en ese orden, porque ese es el peso que tienen
// de verdad: escribir da mucho más que tirar (unas catorce veces más al día para
// alguien activo). Poner *!aura* primero enseñaría a jugar a quien lo que
// necesita es participar.
//
// Dos líneas y sin cifras: los importes cambian y una nota que miente es peor
// que no tenerla.
function textoSinSaldo(concepto, { precio, saldo }, jid) {
  // La burla rota por grupo: pickFresh evita que salga la misma dos veces
  // seguidas, que es lo que convierte un chiste en un mensaje de error.
  const burla = pickFresh(MISERIA, `${jid || 'x'}|miseria`);
  return `${burla}\n\n` +
    `_Cuesta *${fmt(precio)}* y tienes *${fmt(saldo)}*._\n` +
    `_Se gana con *!aura* y con los bonos de 200, 500 y 1000 mensajes del día. Cada ${fmt(ACTIVIDAD_MSGS)} mensajes que escribes tus tiradas ganan suerte para siempre._`;
}

module.exports = { cobrar, devolver, textoSinSaldo, MISERIA };
