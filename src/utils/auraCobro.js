// Cobro de aura por usar un comando. El aura deja de ser solo un marcador y
// pasa a ser moneda: hay cosas que cuestan.
//
// El cobro va SIEMPRE antes de gastar el recurso (descarga, llamada a la API,
// consulta a WhatsApp) y se devuelve si el recurso falla, para que nadie pague
// por una canción que no llegó.

const { spendAura, addAura, getAura, cobrarDeCaja } = require('./auraStore');
const { PRECIOS, SALDO_MINIMO, OBJETOS, DIA, CAJA } = require('./economia');
// require perezoso: roboStore importa de aqui? No, pero se deja explicito para
// que quede claro que este modulo depende del inventario.
const { tieneSocio, aportarAlBote } = require('./roboStore');
const { fmt, pickFresh, claveDia } = require('./helpers');
const { isOwner, canonicalJid } = require('./wa');

// Intenta cobrar `concepto` al remitente. Devuelve:
//   { ok: true,  pagado, saldo }        — cobrado, adelante
//   { ok: false, precio, saldo }        — no le llega, el comando debe abortar
//
// El owner tier no paga: administra el bot, no lo consume. Dueño y co-dueños.
//
// EL CONTADOR DE RAFAGA. Cuenta cuantas veces ha usado ESTE concepto ESTA
// persona en ESTE grupo hoy. Se limpia solo al cambiar el dia, asi que no crece:
// como mucho tiene una entrada por persona, grupo y comando de un solo dia.
const RAFAGA = { gratis: 3, multiplicador: 2 };
const usos = new Map();       // 'grupo|persona|concepto' -> veces
let diaUsos = null;

// El mismo corte de dia que el contador de mensajes, la racha y el objetivo del
// dia. Usar el del reloj del servidor partiria la rafaga a medianoche UTC, que
// no es cuando cambia el dia para este grupo.
const hoyClave = () => claveDia(Date.now(), DIA.zona, DIA.horaCorte);

function apuntarUso(groupJid, senderJid, concepto) {
  const hoy = hoyClave();
  if (diaUsos !== hoy) { usos.clear(); diaUsos = hoy; }
  const k = `${groupJid}|${canonicalJid(senderJid)}|${concepto}`;
  const n = (usos.get(k) || 0) + 1;
  usos.set(k, n);
  return n;
}

function descontarUso(groupJid, senderJid, concepto) {
  if (diaUsos !== hoyClave()) return;
  const k = `${groupJid}|${canonicalJid(senderJid)}|${concepto}`;
  const n = usos.get(k);
  if (n > 1) usos.set(k, n - 1); else usos.delete(k);
}

// Cuantas le quedan a precio normal. Lo usa el texto de "no te llega" para
// explicar por que hoy le sale mas caro que ayer.
function usosDe(groupJid, senderJid, concepto) {
  if (diaUsos !== hoyClave()) return 0;
  return usos.get(`${groupJid}|${canonicalJid(senderJid)}|${concepto}`) || 0;
}

async function cobrar(groupJid, senderJid, concepto, { fromMe = false, groupMeta = null } = {}) {
  const base = PRECIOS[concepto];
  if (!base) return { ok: true, pagado: 0, saldo: null };
  if (isOwner(senderJid, fromMe, groupMeta)) return { ok: true, pagado: 0, saldo: null, exento: true };

  // El descuento de SOCIO se aplica aqui, en el unico sitio por el que pasan
  // todos los cobros. Ponerlo en cada comando seria garantizar que a alguno se
  // le olvide y que el precio anunciado y el cobrado dejen de cuadrar.
  let precio = base;
  try {
    if (await tieneSocio(groupJid, senderJid)) {
      precio = Math.max(1, Math.round(base * (1 - OBJETOS.socio.descuento)));
    }
  } catch { /* si el fichero de objetos falla, se cobra el precio entero */ }

  // ─── LA CUARTA DEL DIA CUESTA EL DOBLE ──────────────────────────────────
  //
  // El precio es el unico freno que no depende de que nadie vigile, y estaba
  // frenando al reves. Medida la curva de ingresos: el que escribe mil mensajes
  // al dia cobra 366 y el normal 49. Con un precio fijo, el que mas ruido puede
  // hacer es justo el que no lo nota, y el freno solo aprieta a quien no
  // molestaba.
  //
  // Asi que el freno deja de estar en el precio y pasa a estar en la RAFAGA.
  // Las tres primeras del dia valen lo de siempre; de la cuarta en adelante,
  // el doble. Diez acciones seguidas pasan de costar 600 a costar 1.020, que
  // para el de mil mensajes son tres dias de ingresos.
  //
  // TRES Y NO UNA: el objetivo no es que nadie use el bot, es que una rafaga
  // contra medio grupo cueste. Tres seguidas es una conversacion; diez es otra
  // cosa.
  //
  // POR GRUPO Y POR PERSONA, y en memoria. Lo que se dosifica es el ruido de un
  // chat concreto, y un despliegue que reinicie el contador regala como mucho
  // tres usos a precio viejo — mas barato que otro fichero en disco al que
  // acordarse de hacerle copia.
  // SE CUENTA LO QUE SE USA, NO LO QUE SE INTENTA. Escrito al reves —subiendo
  // el contador aqui, antes de cobrar— a quien no le llegaba el saldo se le
  // apuntaba el intento igual: cinco intentos sin aura y, cuando por fin la
  // tenia, le salia al doble sin haber usado nada. Aqui solo se LEE; se apunta
  // abajo, y solo si el cobro ha salido.
  if (usosDe(groupJid, senderJid, concepto) >= RAFAGA.gratis) {
    precio = Math.round(precio * RAFAGA.multiplicador);
  }

  // Comprobar y descontar tiene que ser UNA sola operacion: si se hace en dos
  // pasos, dos comandos simultaneos del mismo usuario leen el mismo saldo antes
  // de que ninguno escriba y los dos cobran. Con el saldo justo eso dejaba al
  // usuario en negativo comprando, que es lo que SALDO_MINIMO impide.
  const r = await spendAura(groupJid, senderJid, precio, SALDO_MINIMO);
  if (r.ok) {
    apuntarUso(groupJid, senderJid, concepto);
    return { ok: true, pagado: precio, saldo: r.current, precioBase: base, rafaga: precio > base };
  }

  // ─── SI NO LLEGA EL SUELTO, SE TIRA DE LA CAJA ──────────────────────────
  //
  // Lo pidio el dueño: «que descuente lo que se tenga guardado en el banco
  // para que cuando se compre algo con eso no diga que no tienes aura,
  // simplemente descuente del banco con impuestos».
  //
  // Antes daba igual lo guardado: el cobro miraba el suelto, no llegaba y
  // salia el «no te llega» con 1.200 dentro de la caja. Para gastarlos habia
  // que acordarse de *!unlock*, pagar el 22 % y volver a escribir el comando.
  //
  // Ahora se tapa el hueco solo, y CUESTA: sale de la caja lo que falta mas el
  // impuesto, que es la misma comision de abrirla —porque es exactamente lo
  // que se esta haciendo—. Asi pagar con lo escondido sigue siendo peor que
  // pagar con lo suelto, que es lo que mantiene la caja siendo una decision.
  //
  // OJO CON EL ORDEN: primero se cobra de la caja y solo despues se descuenta
  // el suelto. Al reves, un corte entre las dos mitades dejaria el suelto
  // gastado y la caja intacta.
  const suelto = Math.max(0, (r.saldo ?? 0) - SALDO_MINIMO);
  const faltan = precio - suelto;
  if (faltan > 0) {
    const caja = await cobrarDeCaja(groupJid, senderJid, faltan, CAJA.impuestoPago)
      .catch(() => ({ ok: false }));
    if (caja.ok) {
      // El impuesto va al bote, igual que el de *!unlock*: si se evaporase,
      // cada pago desde la caja encogeria la economia del grupo un poco.
      if (caja.impuestoPagado > 0) {
        await aportarAlBote(groupJid, caja.impuestoPagado).catch(() => {});
      }
      // Y lo suelto se gasta entero, que es lo que el hueco daba por hecho.
      if (suelto > 0) await spendAura(groupJid, senderJid, suelto, SALDO_MINIMO).catch(() => {});
      apuntarUso(groupJid, senderJid, concepto);
      const saldoTras = await getAura(groupJid, senderJid).catch(() => null);
      return {
        ok: true, pagado: precio, saldo: saldoTras, precioBase: base, rafaga: precio > base,
        // Para que el comando pueda decirlo: se ha pagado con lo escondido.
        deLaCaja: caja.bruto, impuestoCaja: caja.impuestoPagado, cajaRestante: caja.dentro,
      };
    }
  }
  return { ok: false, precio, saldo: r.saldo };
}

// Devuelve lo cobrado. Se llama cuando el recurso falló después del cobro.
async function devolver(groupJid, senderJid, pagado, concepto = null) {
  if (!pagado) return;
  await addAura(groupJid, senderJid, pagado);
  // Y SE BORRA EL USO. Un comando devuelto no ha ocurrido: si el gif no llego o
  // el roast no tenia a quien, esa vez no puede contar para encarecer la
  // siguiente. Sin esto, una tarde con la web caida dejaba a alguien pagando el
  // doble por comandos que nunca vio.
  if (concepto) descontarUso(groupJid, senderJid, concepto);
}

// El dispatcher cobra ANTES del switch. Un `return` no es una excepción, así
// que el catch no reembolsa: el usuario pagaba por un roast sin objetivo, un
// !ttp vacío o un !relevancia al owner (silencio a propósito). Quien no presta
// el servicio devuelve esta marca y el dispatcher deshace el cobro, en silencio.
const SIN_SERVICIO = Object.freeze({ sinServicio: true });
function esSinServicio(x) {
  return x === SIN_SERVICIO;
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
  'Te has quedado sin nada y vienes a gastar. Brillante, como todo lo que haces.',
  'Con ese saldo no compras ni el silencio del bot, y eso es gratis.',
  'No hay pasta. Hay un pringado mirando un escaparate con los bolsillos del revés.',
  'Cero aura y mucha cara. Lo primero se arregla escribiendo, lo segundo no.',
  'Ese saldo da para mirarlo y llorar. Igual que tu perfil.',
  'No te da. Ni para esto ni para aparentar que te da. Estás tieso, cabrón.',
  'Cuenta seca, ambición mojada. Vuelve cuando la proporción se invierta.',
  'Ni un duro. Vienes aquí a gastar aire y a robar tiempo.',
  'Mierda de saldo. Hasta el bot tiene más aura que tú, y el bot no participa.',
  'Tu cuenta parece un desierto: vacía, seca y sin señales de vida.',
  'Has venido a comprar con calderilla y encima con prisa, gilipollas. Vuelve cuando sumes.',
  'Ese saldo no impresiona a nadie. Ni siquiera al contador, que ha visto miserias pero no como la tuya.',
  'No tienes para esto. Escribe, participa, haz algo con tu vida en este grupo.',
  'Pobre como una rata y con las mismas ganas de gastar. Vuelve cuando sumes, pringado.',
];

// EL CIERRE: HABLA MAS. Y NADA MAS.
//
// Aqui habia un tutorial de tres lineas —las dos vias de ganar aura, los cinco
// hitos de mensajes del dia y la suerte permanente cada mil—. El dueño lo
// corto: «la peña no se va a volver experta con esos tutoriales de aura
// nunca». Y tenia razon en lo que importa, que es donde sale: pegado a un
// insulto que iba a ser lo unico que leyeran.
//
// De las dos vias, la que vale es escribir —da unas catorce veces mas al dia
// que tirar— asi que es la unica que se dice. Y se dice en la misma linea del
// precio, para que el mensaje entero quepa en dos.
const HABLA_MAS = [
  'Habla más, que es gratis.',
  'Se gana hablando. Tú no hablas.',
  'Escribe en el grupo y tendrás.',
  'El aura se gana hablando, no mirando.',
  'Abre la boca en el grupo y sube.',
  'Habla más y deja de mendigar.',
  'Participa, que esto no cae del cielo.',
  'Se consigue escribiendo. Pruébalo alguna vez.',
  'Habla en el grupo. Ahí se gana.',
  'Escribe. Es lo único que lo sube.',
  'El que habla, cobra. Tú no cobras.',
  'Menos pedir y más escribir.',
  'Sube hablando, y tú llevas el día mudo.',
  'Se gana participando. Tú solo vienes a gastar.',
  'Habla, aporta, y vuelve con saldo.',
  'Escribe algo en el grupo. Por una vez.',
];

// Texto del rechazo: la burla, cuanto cuesta, cuanto tienes y habla mas.
function textoSinSaldo(concepto, { precio, saldo }, jid) {
  // La burla rota por grupo: pickFresh evita que salga la misma dos veces
  // seguidas, que es lo que convierte un chiste en un mensaje de error.
  const burla = pickFresh(MISERIA, `${jid || 'x'}|miseria`);
  const cierre = pickFresh(HABLA_MAS, `${jid || 'x'}|hablamas`);
  // SI HOY LE SALE MAS CARO, SE DICE — pero en tres palabras, no en un parrafo.
  // Un precio que sube sin avisar se lee como un fallo del bot: la primera
  // reaccion de cualquiera es "me esta cobrando mal", y eso acaba en una queja
  // al dueño. Cabe entre parentesis y no rompe las dos lineas.
  const base = PRECIOS[concepto];
  const doble = base && precio > base ? ' (hoy te sale el doble)' : '';
  // Una sola tirada de cursiva: WhatsApp cierra el tramo en el primer `_` que
  // pilla, asi que partirlo en dos deja las marcas a la vista.
  return `${burla}\n\n` +
    `_Cuesta *${fmt(precio)}*${doble} y tienes *${fmt(saldo)}*. ${cierre}_`;
}

module.exports = { cobrar, devolver, textoSinSaldo, MISERIA, SIN_SERVICIO, esSinServicio, RAFAGA, usosDe, _usos: usos };
