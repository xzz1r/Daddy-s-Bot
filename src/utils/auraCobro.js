// Cobro de aura por usar un comando. El aura deja de ser solo un marcador y
// pasa a ser moneda: hay cosas que cuestan.
//
// El cobro va SIEMPRE antes de gastar el recurso (descarga, llamada a la API,
// consulta a WhatsApp) y se devuelve si el recurso falla, para que nadie pague
// por una canción que no llegó.

const { spendAura, addAura } = require('./auraStore');
const { PRECIOS, SALDO_MINIMO, SUELDO } = require('./economia');
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
  'No te llega. Con esa cuenta no se compra nada aquí, y en la calle tampoco.',
  'Mírate el saldo y luego mírate a ti. Encajáis.',
  'Estás más tieso que el grupo cuando escribes tú.',
  'Con eso no pagas ni la mitad. Vuelve cuando hayas aportado algo, aunque sea hablar.',
  'No hay aura. Hay ganas, que es lo que tienen los pobres.',
  'Ese saldo no da para esto. Da para mirar cómo lo usan otros, que es lo tuyo.',
  'Te falta aura y te sobra confianza. Curiosa combinación.',
  'Con lo que tienes no llegas ni a la entrada. Escribe algo, hombre.',
  'Aquí se paga por adelantado. Y tú no tienes con qué, como siempre.',
  'No. Y no es personal: es aritmética.',
  'Ni de lejos. Lo tuyo no es pobreza, es un estilo de vida.',
  'Ese es el saldo de alguien que entra al grupo a mirar. Y se nota.',
  'Te has venido arriba con la cuenta vacía. Muy propio.',
  'No tienes. Y lo peor es que el bot ya se lo esperaba.',
  'Con ese saldo lo único que puedes permitirte es callarte.',
  'Fallaste. No en el comando: en la vida, un poco antes.',
  'Aura insuficiente. Igual que tu aportación al grupo, mira qué casualidad.',
  'No llegas. Y por el ritmo al que escribes, tampoco vas a llegar pronto.',
  'Eso no es una cuenta, es un recordatorio de lo poco que apareces.',
  'Pides caro para lo que has puesto. Que es nada.',
  'Vuelve con dinero o vuelve con mensajes. Cualquiera de las dos vale, tú no traes ninguna.',
  'El bot no fía. Y menos a ti, que ya se te ve el percal.',
  'Saldo insuficiente y orgullo intacto. Solo una de las dos cosas se arregla escribiendo.',
  'Con eso no. Con eso ni te acerques.',
  'Cuesta más de lo que tienes. Bastante más. Incómodo, ¿verdad?',
  'Tu aura no llega y tu paciencia tampoco va a llegar, porque esto tarda en subir.',
  'Nada. Ni un punto de más. Impecable gestión.',
  'Has intentado gastar lo que no tienes. Bienvenido a la economía, campeón.',
  // Estas ocho llevan la boca sucia del bot. Las veintiocho de arriba están
  // bien escritas pero eran todas del mismo registro: seco, irónico y limpio.
  // Medido contra los pools veteranos de burla del bot, que usan vocabulario
  // fuerte en una de cada cuatro frases, este salía al 4 % — o sea que el bot
  // se ponía educado justo en el momento en el que más tiene que morder.
  'No te llega ni de coña. Escribe algo, muerto de hambre.',
  'Con esa mierda de saldo no compras nada. Vuelve cuando aportes.',
  'Ni un duro. Vienes a pedir con los bolsillos vacíos y encima con prisa, cojones.',
  'Que no te llega, joder. Y llevas así desde que entraste.',
  'Cero. Te has plantado aquí a gastar sin tener y encima delante de todos, gilipollas.',
  'Estás tieso y se te nota hasta en cómo escribes. Aparta.',
  'No hay aura. Hay un pringado mirando un precio que no puede pagar.',
  'Menuda puta miseria de cuenta. Aquí se viene llorado y con dinero.',
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
    `_Se gana escribiendo: cobras cada ${SUELDO.cada} mensajes del día, y hay bonos gordos a los 200, 500 y 1000. Tirar con *!aura* da propina._`;
}

module.exports = { cobrar, devolver, textoSinSaldo, MISERIA };
