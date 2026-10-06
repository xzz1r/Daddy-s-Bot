// Cobro de aura por usar un comando. El aura deja de ser solo un marcador y
// pasa a ser moneda: hay cosas que cuestan.
//
// El cobro va SIEMPRE antes de gastar el recurso (descarga, llamada a la API,
// consulta a WhatsApp) y se devuelve si el recurso falla, para que nadie pague
// por una canción que no llegó.

const { spendAura, addAura, pagarConCaja, flushAura } = require('./auraStore');
const { PRECIOS, SALDO_MINIMO, OBJETOS, DIA, CAJA, ADMIN } = require('./economia');
// require perezoso: roboStore importa de aqui? No, pero se deja explicito para
// que quede claro que este modulo depende del inventario.
const { tieneSocio, aportarAlBote } = require('./roboStore');
const { fmt, pickFresh, claveDia } = require('./helpers');
const { isOwner, isGroupAdmin } = require('./wa');
const { clavesMapa, juntarEnMapa, sumar } = require('./persona');
const logger = require('./logger');

// Intenta cobrar `concepto` al remitente. Devuelve:
//   { ok: true,  pagado, saldo }        — cobrado, adelante
//   { ok: false, precio, saldo }        — no le llega, el comando debe abortar
//
// El owner tier no paga: administra el bot, no lo consume. Dueño y co-dueños.
//
// EL CONTADOR DE RAFAGA. Cuenta cuantas veces ha usado ESTE concepto ESTA
// persona en ESTE grupo hoy. Se limpia solo al cambiar el dia, asi que no crece:
// como mucho tiene una entrada por persona, grupo y comando de un solo dia.
// Y UN SEGUNDO ESCALON desde que los precios bajaron un 40 %: de la 4.ª a la
// 6.ª del dia, el doble; de la 7.ª en adelante, el triple.
// Comandos sin descuento de admin: solo los usan admins y el dueño fijo su
// precio exacto. *!r* cuesta 150, no 128.
const SIN_DESCUENTO_ADMIN = new Set(['presentarse']);

const RAFAGA = { gratis: 3, multiplicador: 2, triple: 6, multiplicadorTriple: 3 };
const usos = new Map();       // 'grupo|persona|concepto' -> veces
let diaUsos = null;

// El mismo corte de dia que el contador de mensajes, la racha y el objetivo del
// dia. Usar el del reloj del servidor partiria la rafaga a medianoche UTC, que
// no es cuando cambia el dia para este grupo.
const hoyClave = () => claveDia(Date.now(), DIA.zona, DIA.horaCorte);

// La cuenta de la persona, con lo que llevara con su otra forma ya sumado: si
// el bot aprende su telefono a media tarde, las tres de precio normal no se
// vuelven a estrenar (utils/persona.js).
const cuentaDe = (groupJid, senderJid, concepto) =>
  juntarEnMapa(usos, clavesMapa(`${groupJid}|`, senderJid, `|${concepto}`), sumar);

function apuntarUso(groupJid, senderJid, concepto) {
  const hoy = hoyClave();
  if (diaUsos !== hoy) { usos.clear(); diaUsos = hoy; }
  const { clave, valor } = cuentaDe(groupJid, senderJid, concepto);
  const n = (valor || 0) + 1;
  usos.set(clave, n);
  return n;
}

function descontarUso(groupJid, senderJid, concepto) {
  if (diaUsos !== hoyClave()) return;
  const { clave, valor } = cuentaDe(groupJid, senderJid, concepto);
  if (valor > 1) usos.set(clave, valor - 1); else usos.delete(clave);
}

// Cuantas le quedan a precio normal. Lo usa el texto de "no te llega" para
// explicar por que hoy le sale mas caro que ayer.
function usosDe(groupJid, senderJid, concepto) {
  if (diaUsos !== hoyClave()) return 0;
  return cuentaDe(groupJid, senderJid, concepto).valor || 0;
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

  // EL DESCUENTO DE LOS ADMINS. Lo pidio el dueño: «hazle un descuento
  // exclusivo a los admins en todos los comandos, se merecen esa
  // exclusividad». Todos los comandos con precio, sin excepciones.
  //
  // El owner tier no pasa por aqui: salio arriba sin pagar nada.
  //
  // El suelo es 1. Un comando con precio no puede acabar saliendo gratis,
  // porque entonces el precio es decoracion.
  // Menos lo que solo pueden usar admins y tiene precio fijado por el dueño:
  // descontarlo seria cobrar siempre otra cifra.
  if (groupMeta && isGroupAdmin(senderJid, fromMe, groupMeta) && !SIN_DESCUENTO_ADMIN.has(concepto)) {
    precio = Math.max(1, Math.round(precio * (1 - ADMIN.descuento)));
  }

  // ─── LA RAFAGA DEL DIA SE PAGA MAS CARA ─────────────────────────────────
  //
  // El precio es el unico freno que no depende de que nadie vigile, y estaba
  // frenando al reves. Medida la curva de ingresos: el que escribe mil mensajes
  // al dia cobra 366 y el normal 49. Con un precio fijo, el que mas ruido puede
  // hacer es justo el que no lo nota, y el freno solo aprieta a quien no
  // molestaba.
  //
  // Asi que el freno deja de estar en el precio y pasa a estar en la RAFAGA.
  // Las primeras del dia valen lo de siempre y a partir de ahi el precio sube
  // por tramos. Cuantas y cuanto vive en RAFAGA, arriba, y en ningun otro
  // sitio: este comentario decia «el doble desde la cuarta» y unas cifras de
  // cuando los precios eran otros.
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
  const yaUsados = usosDe(groupJid, senderJid, concepto);
  if (yaUsados >= RAFAGA.triple) {
    precio = Math.round(precio * RAFAGA.multiplicadorTriple);
  } else if (yaUsados >= RAFAGA.gratis) {
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
  // Suelto y caja se cobran en UNA operacion (ver pagarConCaja): en tres
  // pasos, otro comando de la misma persona se colaba en medio y el cobro
  // anunciaba un precio que no habia cobrado entero.
  const caja = await pagarConCaja(groupJid, senderJid, precio, CAJA.impuestoPago, SALDO_MINIMO)
    .catch((e) => { logger.unaVez('cobro: pagar con la caja', e); return { ok: false }; });
  if (caja.ok) {
    // El impuesto va al bote, igual que el de *!unlock*: si se evaporase,
    // cada pago desde la caja encogeria la economia del grupo un poco.
    //
    // Y ANTES SE VUELCA EL AURA. El bote vive en robo.json, que se guarda antes
    // que aura.json: sin esto, un corte en medio deja el impuesto en el bote y
    // la caja sin descontar — aura inventada. La misma regla que sigue robo.js.
    if (caja.impuestoPagado > 0) {
      await flushAura().catch(() => {});
      await aportarAlBote(groupJid, caja.impuestoPagado)
        .catch((e) => logger.unaVez('cobro: impuesto de la caja al bote', e));
    }
    apuntarUso(groupJid, senderJid, concepto);
    return {
      ok: true, pagado: caja.suelto + caja.cubierto, saldo: caja.current, precioBase: base, rafaga: precio > base,
      // Para que el comando pueda decirlo: se ha pagado con lo escondido.
      deLaCaja: caja.bruto, impuestoCaja: caja.impuestoPagado, cajaRestante: caja.dentro,
    };
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
  'No te llega para esto. Este comando no sale, y el saldo va justo debajo, muñeca.',
  'Mírate el saldo y luego mírate a ti. Encajáis.',
  'No te llega el aura para esto. Hay ganas, que es lo que tienen los pobres.',
  'Ese saldo no da para esto. Da para mirar cómo lo usan otros, que es lo tuyo.',
  'Aquí se paga por adelantado. Y tú no tienes con qué.',
  'Te has venido arriba sin cubrir el precio. Muy propio.',
  'No tienes. Y lo peor es que el bot ya se lo esperaba.',
  'Fallaste. No en el comando: en la vida, un poco antes.',
  'El bot no fía. Y menos a ti, que ya se te ve el percal, pequeña.',
  'Con eso no. Con eso ni te acerques.',
  'Cuesta más de lo que tienes. Bastante más. Incómodo, ¿verdad?',
  'No llegas. Ni de sobra ni de milagro. Impecable gestión.',
  'Te has plantado aquí a gastar sin cubrir el precio, y encima delante de todos.',
  'Menuda puta miseria de cuenta. Aquí se viene llorado y con dinero.',
  'No cubres el precio y vienes a gastar. Brillante.',
  'Con ese saldo no compras ni el silencio del bot, y eso es gratis.',
  'No hay pasta. Hay un pringado mirando un escaparate con los bolsillos del revés.',
  'Ese saldo da para mirarlo y llorar. Igual que tu perfil.',
  'Cuenta seca, ambición mojada. Vuelve cuando la proporción se invierta.',
  'Mierda de saldo. Hasta el bot tiene más aura que tú, y el bot no participa.',
  'Ese saldo no impresiona a nadie. Ni siquiera al contador, que ha visto miserias pero no como la tuya.',
  'Saldo insuficiente. La casa no hace descuentos a quien da pena.',
  'Con eso no pagas ni la propina del comando. Aparta.',
  'Tu cuenta ha dicho que no antes que el bot. Hazle caso a tu cuenta, chiquitina.',
  'Pagar no puedes. Hacer el ridículo en público, por lo visto, sí.',
  'Precio fijo, saldo por debajo. Matemáticas de pobre.',
  'Pedir sin tener se nota desde lejos, y hoy se te ha visto desde la otra punta del grupo.',
  'La caja no se abre con buenas intenciones. Se abre con aura y no tienes.',
  'Ni rebajas ni fiado. Con ese saldo, ni mirar.',
  'El comando cuesta lo que cuesta. Tú vales menos, por lo menos en saldo.',
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
  'Escribe en el grupo y tendrás.',
  'El aura se gana hablando, no mirando.',
  'Abre la boca en el grupo y sube.',
  'Habla más y deja de mendigar.',
  'Participa, que esto no cae del cielo.',
  'Se consigue escribiendo. Pruébalo alguna vez.',
  'Habla en el grupo. Ahí se gana.',
  'Escribe. Es lo único que lo sube.',
  'El que habla, cobra. Así que habla tú.',
  'Menos pedir y más escribir.',
  'Habla, aporta, y vuelve con saldo.',
  'Un mensaje suelto no suma. Escribir de verdad, en el grupo, sí.',
  'La cuenta se llena escribiendo en el grupo.',
  'Escribe en el grupo y la cuenta se mueve sola.',
  'Escribe más, cobra más. Así funciona.',
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

module.exports = { cobrar, devolver, textoSinSaldo, MISERIA, HABLA_MAS, SIN_SERVICIO, esSinServicio, RAFAGA, usosDe, _usos: usos };
