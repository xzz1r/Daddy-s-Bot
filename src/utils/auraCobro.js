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
// Están escritas para leerse. DELANTE DEL GRUPO, porque ahí es donde salen. La
// gracia no es que te digan que no tienes dinero, es que te lo digan en público.
const MISERIA = [
  'No te llega ni para el mínimo del sistema: miseria de aura documentada sin filtro y el hilo sigue sin ti en el centro.',
  'Saldo en modo supervivencia extrema: no cubres ni el cobro más barato del catálogo en el idioma seco del ranking.',
  'Pobre de aura de verdad: el contador no maquilla la miseria ni un decimal en el idioma seco del ranking.',
  'No hay con qué pagar: la miseria no es estética de mensaje, es el número en rojo sin recurso ni nota al pie.',
  'Aura insuficiente hasta para el peaje más bajo: vuelve cuando el contador suba de verdad sin modo avión ni silencio cómplice.',
  'Miseria total: el cobro se cancela porque no hay de dónde sacar ni una unidad y no hay modo de suavizarlo.',
  'El saldo grita pobreza en voz alta: el bot solo traduce el grito a este mensaje en el idioma seco del ranking.',
  'No cubres el mínimo: la miseria es el estado de la cuenta, no un insulto gratis delante del ranking y de la cara.',
  'Aura en modo mendigo operativo: ni el cobro simbólico encuentra de dónde tirar con el chat enterado del cargo.',
  'Pobreza de contador: el ranking te ve abajo y el cobro confirma el mismo diagnóstico con el parte firmado debajo.',
  'No hay saldo útil: hay miseria clara y el mensaje no necesita adorno y el veredicto no se negocia y el resto es ruido de fondo.',
  'Insuficiente de forma crónica: la miseria no es un mal día, es el paisaje sin segunda oportunidad hoy.',
  'El cobro necesita aura y tú tienes el hueco: miseria operativa con el grupo de testigo silencioso delante del público que no pidió entrada.',
  'Saldo que da vergüenza ajena al que mira: miseria sin filtro ni relato heroico y el sistema no regala puntos.',
  'No te llega: el bot no inventa crédito para pobres de aura en este sistema en el segundo más incómodo del chat.',
  'Miseria documentada en el contador: el cobro se queda esperando a otro día y el contador insiste sin consuelo de consola.',
  'Pobre de verdad: ni el mínimo del sistema te reconoce como solvente en el idioma seco del ranking con el veredicto seco del bot.',
  'Aura en números que dan pena ajena: miseria legible a simple vista con el eco todavía en el grupo y el sistema cierra sin discusión.',
  'No hay de dónde cobrar: hay de dónde señalar la miseria y poco más y basta el dato del ranking con el saldo a la intemperie.',
  'Saldo insuficiente de forma crónica: la miseria es el estado, no el accidente con el número en la frente del mensaje.',
  'El mínimo del cobro te supera por goleada: la miseria te define en este mensaje sin recurso ni nota al pie.',
  'Pobreza de aura sin anestesia: no cubres el peaje, punto final del trámite delante de quien aún leía el hilo.',
  'No te llega ni para empezar el cobro más barato: miseria de manual sin prosa que lo maquille delante del ranking y de la cara.',
  'El contador en modo supervivencia extrema: miseria sin maquillaje posible sin anestesia de verdad esta vez.',
  'Aura que no cubre el peaje más ridículo del sistema: pobreza real y el sistema cierra sin discusión.',
  'Miseria: la palabra exacta para este saldo y este mensaje sin derecho a matiz útil y el resto es ruido de fondo.',
  'No hay saldo útil en la cuenta: hay hueco, y el cobro se va a otro lado sin suavizar el golpe del número.',
  'Pobre de aura hasta para el trámite más barato del catálogo con el veredicto seco del bot sin segunda lectura que lo arregle.',
  'Insuficiente y se nota sin esfuerzo: miseria legible en el primer vistazo sin recurso ni nota al pie.',
  'El cobro choca de frente con la miseria de tu contador con la firma legible del comando con el peaje cobrado al natural.',
  'Saldo en rojo de vergüenza: miseria sin derecho a relato de superación y el chat archiva sin debate.',
  'No cubres: la miseria no negocia el mínimo ni pide cita sin apelación posible hoy y el sistema no regala puntos.',
  'Aura de quien no llega nunca al peaje: el bot solo lo dice en claro sin consuelo de consola sin suavizar el golpe del número.',
  'Pobreza operativa: el cobro no encuentra una sola unidad de dónde tirar y basta el dato del ranking.',
  'Miseria de contador: el ranking y el cobro coinciden en el mismo diagnóstico con testigos obligados en el hilo.',
  'No te llega ni al borde del mínimo: miseria limpia y sin adorno sin letra pequeña que lo salve con el bot como notario del fallo.',
  'Saldo que no sostiene ni un cobro simbólico: pobreza documentada y no hay DLC que lo parchee delante de quien no quería verlo.',
  'Aura insuficiente de forma que ya no sorprende a nadie: miseria estable sin descuento por empatía con el bot como notario del fallo.',
  'El mínimo es un muro y tú estás al otro lado, en la miseria con el saldo a la intemperie y el hilo sigue sin ti en el centro.',
  'Pobre de aura documentado: el cobro queda en espera que no termina en el único idioma que entiende el contador.',
  'No hay con qué pagar el peaje: hay con qué señalar. Miseria sin que nadie pida replay sin letra pequeña que lo salve.',
  'Contador en modo mendigo: el sistema no fía ni una unidad sin cuento que lo tape con el número hablando solo.',
  'Miseria: no es adorno retórico del mensaje, es el dato del contador y el archivo no admite recurso en el idioma seco del ranking.',
  'No cubres el cobro más bajo del sistema: la pobreza de aura es el veredicto con el número en la frente del mensaje.',
  'Saldo que da pena: miseria sin derecho a pose de víctima elegante en el segundo más incómodo del chat.',
  'Aura en el sótano del ranking: el cobro no baja a buscarla y el sistema marca el punto final delante del marcador en vivo.',
  'Insuficiente crónico: miseria como estado permanente, no como accidente de un día sin suavizar el golpe del número.',
  'El peaje te queda grande: la miseria te queda justa y visible con testigos obligados en el hilo sin derecho a matiz útil.',
  'Pobreza de contador legible a simple vista sin necesidad de zoom sin recurso ni nota al pie con el eco todavía en el grupo.',
  'No te llega. Miseria. El trámite termina aquí y el veredicto no se negocia en el único idioma que entiende el contador.'
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
