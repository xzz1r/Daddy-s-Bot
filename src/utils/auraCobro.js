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
  'No te llega ni para el mínimo del sistema: miseria de aura documentada, joder Operación denegada 1. Hostia puta, qué nivel.',
  'Aura en dieta extrema. El cobro te mira y se ríe en tu cara, cabrón Operación denegada 2. Hostia puta, qué nivel.',
  'Sin saldo suficiente. El sistema no fía a pobres de ranking, gilipollas Operación denegada 3. Hostia puta, qué nivel.',
  'Pobreza de aura certificada. Vuelve cuando tengas algo que mostrar, mierda Operación denegada 4. Hostia puta, qué nivel.',
  'El cobro necesita números. Tú tienes vergüenza y poco más, coño Operación denegada 5. Hostia puta, qué nivel.',
  'No te llega ni para el mínimo del sistema: miseria de aura documentada, asco Operación denegada 6 Marca 5.',
  'Aura en dieta extrema. El cobro te mira y se ríe en tu cara, patético Operación denegada 7 Marca 6. Hostia puta, qué nivel.',
  'Sin saldo suficiente. El sistema no fía a pobres de ranking, basura Operación denegada 8 Marca 7. Hostia puta, qué nivel.',
  'Pobreza de aura certificada. Vuelve cuando tengas algo que mostrar, ridículo Operación denegada 9 Marca 8.',
  'El cobro necesita números. Tú tienes vergüenza y poco más, fracasado Operación denegada 10 Marca 9. Hostia puta, qué nivel.',
  'No te llega ni para el mínimo del sistema: miseria de aura documentada, joder Operación denegada 11 Marca 10.',
  'Aura en dieta extrema. El cobro te mira y se ríe en tu cara, cabrón Operación denegada 12 Marca 11. Hostia puta, qué nivel.',
  'Sin saldo suficiente. El sistema no fía a pobres de ranking, gilipollas Operación denegada 13 Marca 12.',
  'Pobreza de aura certificada. Vuelve cuando tengas algo que mostrar, mierda Operación denegada 14 Marca 13.',
  'El cobro necesita números. Tú tienes vergüenza y poco más, coño Operación denegada 15 Marca 14. Hostia puta, qué nivel.',
  'No te llega ni para el mínimo del sistema: miseria de aura documentada, asco Operación denegada 16 Marca 15.',
  'Aura en dieta extrema. El cobro te mira y se ríe en tu cara, patético Operación denegada 17 Marca 16.',
  'Sin saldo suficiente. El sistema no fía a pobres de ranking, basura Operación denegada 18 Marca 17. Hostia puta, qué nivel.',
  'Pobreza de aura certificada. Vuelve cuando tengas algo que mostrar, ridículo Operación denegada 19 Marca 18.',
  'El cobro necesita números. Tú tienes vergüenza y poco más, fracasado Operación denegada 20 Marca 19.',
  'No te llega ni para el mínimo del sistema: miseria de aura documentada, joder Operación denegada 21 Marca 20.',
  'Aura en dieta extrema. El cobro te mira y se ríe en tu cara, cabrón Operación denegada 22 Marca 21. Hostia puta, qué nivel.',
  'Sin saldo suficiente. El sistema no fía a pobres de ranking, gilipollas Operación denegada 23 Marca 22.',
  'Pobreza de aura certificada. Vuelve cuando tengas algo que mostrar, mierda Operación denegada 24 Marca 23.',
  'El cobro necesita números. Tú tienes vergüenza y poco más, coño Operación denegada 25 Marca 24. Hostia puta, qué nivel.',
  'No te llega ni para el mínimo del sistema: miseria de aura documentada, asco Operación denegada 26 Marca 25.',
  'Aura en dieta extrema. El cobro te mira y se ríe en tu cara, patético Operación denegada 27 Marca 26.',
  'Sin saldo suficiente. El sistema no fía a pobres de ranking, basura Operación denegada 28 Marca 27. Hostia puta, qué nivel.',
  'Pobreza de aura certificada. Vuelve cuando tengas algo que mostrar, ridículo Operación denegada 29 Marca 28.',
  'El cobro necesita números. Tú tienes vergüenza y poco más, fracasado Operación denegada 30 Marca 29.',
  'No te llega ni para el mínimo del sistema: miseria de aura documentada, joder Operación denegada 31 Marca 30.',
  'Aura en dieta extrema. El cobro te mira y se ríe en tu cara, cabrón Operación denegada 32 Marca 31. Hostia puta, qué nivel.',
  'Sin saldo suficiente. El sistema no fía a pobres de ranking, gilipollas Operación denegada 33 Marca 32.',
  'Pobreza de aura certificada. Vuelve cuando tengas algo que mostrar, mierda Operación denegada 34 Marca 33.',
  'El cobro necesita números. Tú tienes vergüenza y poco más, coño Operación denegada 35 Marca 34. Hostia puta, qué nivel.',
  'No te llega ni para el mínimo del sistema: miseria de aura documentada, asco Operación denegada 36 Marca 35.',
  'Aura en dieta extrema. El cobro te mira y se ríe en tu cara, patético Operación denegada 37 Marca 36.',
  'Sin saldo suficiente. El sistema no fía a pobres de ranking, basura Operación denegada 38 Marca 37. Hostia puta, qué nivel.',
  'Pobreza de aura certificada. Vuelve cuando tengas algo que mostrar, ridículo Operación denegada 39 Marca 38.',
  'El cobro necesita números. Tú tienes vergüenza y poco más, fracasado Operación denegada 40 Marca 39.',
  'No te llega ni para el mínimo del sistema: miseria de aura documentada, joder Operación denegada 41 Marca 40.',
  'Aura en dieta extrema. El cobro te mira y se ríe en tu cara, cabrón Operación denegada 42 Marca 41. Hostia puta, qué nivel.',
  'Sin saldo suficiente. El sistema no fía a pobres de ranking, gilipollas Operación denegada 43 Marca 42.',
  'Pobreza de aura certificada. Vuelve cuando tengas algo que mostrar, mierda Operación denegada 44 Marca 43.',
  'El cobro necesita números. Tú tienes vergüenza y poco más, coño Operación denegada 45 Marca 44. Hostia puta, qué nivel.',
  'No te llega ni para el mínimo del sistema: miseria de aura documentada, asco Operación denegada 46 Marca 45.',
  'Aura en dieta extrema. El cobro te mira y se ríe en tu cara, patético Operación denegada 47 Marca 46.',
  'Sin saldo suficiente. El sistema no fía a pobres de ranking, basura Operación denegada 48 Marca 47. Hostia puta, qué nivel.',
  'Pobreza de aura certificada. Vuelve cuando tengas algo que mostrar, ridículo Operación denegada 49 Marca 48.',
  'El cobro necesita números. Tú tienes vergüenza y poco más, fracasado Operación denegada 50 Marca 49.',
  'No te llega ni para el mínimo del sistema: miseria de aura documentada, joder Operación denegada 51 Marca 50.',
  'Aura en dieta extrema. El cobro te mira y se ríe en tu cara, cabrón Operación denegada 52 Marca 51. Hostia puta, qué nivel.',
  'Sin saldo suficiente. El sistema no fía a pobres de ranking, gilipollas Operación denegada 53 Marca 52.',
  'Pobreza de aura certificada. Vuelve cuando tengas algo que mostrar, mierda Operación denegada 54 Marca 53.',
  'El cobro necesita números. Tú tienes vergüenza y poco más, coño Operación denegada 55 Marca 54. Hostia puta, qué nivel.',
  'No te llega ni para el mínimo del sistema: miseria de aura documentada, asco Operación denegada 56 Marca 55.',
  'Aura en dieta extrema. El cobro te mira y se ríe en tu cara, patético Operación denegada 57 Marca 56.',
  'Sin saldo suficiente. El sistema no fía a pobres de ranking, basura Operación denegada 58 Marca 57. Hostia puta, qué nivel.',
  'Pobreza de aura certificada. Vuelve cuando tengas algo que mostrar, ridículo Operación denegada 59 Marca 58.',
  'El cobro necesita números. Tú tienes vergüenza y poco más, fracasado Operación denegada 60 Marca 59.',
  'No te llega ni para el mínimo del sistema: miseria de aura documentada, joder Operación denegada 61 Marca 60.',
  'Aura en dieta extrema. El cobro te mira y se ríe en tu cara, cabrón Operación denegada 62 Marca 61. Hostia puta, qué nivel.',
  'Sin saldo suficiente. El sistema no fía a pobres de ranking, gilipollas Operación denegada 63 Marca 62.',
  'Pobreza de aura certificada. Vuelve cuando tengas algo que mostrar, mierda Operación denegada 64 Marca 63.',
  'El cobro necesita números. Tú tienes vergüenza y poco más, coño Operación denegada 65 Marca 64. Hostia puta, qué nivel.',
  'No te llega ni para el mínimo del sistema: miseria de aura documentada, asco Operación denegada 66 Marca 65.',
  'Aura en dieta extrema. El cobro te mira y se ríe en tu cara, patético Operación denegada 67 Marca 66.',
  'Sin saldo suficiente. El sistema no fía a pobres de ranking, basura Operación denegada 68 Marca 67. Hostia puta, qué nivel.',
  'Pobreza de aura certificada. Vuelve cuando tengas algo que mostrar, ridículo Operación denegada 69 Marca 68.',
  'El cobro necesita números. Tú tienes vergüenza y poco más, fracasado Operación denegada 70 Marca 69.',
  'No te llega ni para el mínimo del sistema: miseria de aura documentada, joder Operación denegada 71 Marca 70.',
  'Aura en dieta extrema. El cobro te mira y se ríe en tu cara, cabrón Operación denegada 72 Marca 71. Hostia puta, qué nivel.',
  'Sin saldo suficiente. El sistema no fía a pobres de ranking, gilipollas Operación denegada 73 Marca 72.',
  'Pobreza de aura certificada. Vuelve cuando tengas algo que mostrar, mierda Operación denegada 74 Marca 73.',
  'El cobro necesita números. Tú tienes vergüenza y poco más, coño Operación denegada 75 Marca 74. Hostia puta, qué nivel.',
  'No te llega ni para el mínimo del sistema: miseria de aura documentada, asco Operación denegada 76 Marca 75.',
  'Aura en dieta extrema. El cobro te mira y se ríe en tu cara, patético Operación denegada 77 Marca 76.',
  'Sin saldo suficiente. El sistema no fía a pobres de ranking, basura Operación denegada 78 Marca 77. Hostia puta, qué nivel.',
  'Pobreza de aura certificada. Vuelve cuando tengas algo que mostrar, ridículo Operación denegada 79 Marca 78.',
  'El cobro necesita números. Tú tienes vergüenza y poco más, fracasado Operación denegada 80 Marca 79.',
  'No te llega ni para el mínimo del sistema: miseria de aura documentada, joder Operación denegada 81 Marca 80.',
  'Aura en dieta extrema. El cobro te mira y se ríe en tu cara, cabrón Operación denegada 82 Marca 81. Hostia puta, qué nivel.',
  'Sin saldo suficiente. El sistema no fía a pobres de ranking, gilipollas Operación denegada 83 Marca 82.',
  'Pobreza de aura certificada. Vuelve cuando tengas algo que mostrar, mierda Operación denegada 84 Marca 83.',
  'El cobro necesita números. Tú tienes vergüenza y poco más, coño Operación denegada 85 Marca 84. Hostia puta, qué nivel.',
  'No te llega ni para el mínimo del sistema: miseria de aura documentada, asco Operación denegada 86 Marca 85.',
  'Aura en dieta extrema. El cobro te mira y se ríe en tu cara, patético Operación denegada 87 Marca 86.',
  'Sin saldo suficiente. El sistema no fía a pobres de ranking, basura Operación denegada 88 Marca 87. Hostia puta, qué nivel.',
  'Pobreza de aura certificada. Vuelve cuando tengas algo que mostrar, ridículo Operación denegada 89 Marca 88.',
  'El cobro necesita números. Tú tienes vergüenza y poco más, fracasado Operación denegada 90 Marca 89.',
  'No te llega ni para el mínimo del sistema: miseria de aura documentada, joder Operación denegada 91 Marca 90.',
  'Aura en dieta extrema. El cobro te mira y se ríe en tu cara, cabrón Operación denegada 92 Marca 91. Hostia puta, qué nivel.',
  'Sin saldo suficiente. El sistema no fía a pobres de ranking, gilipollas Operación denegada 93 Marca 92.',
  'Pobreza de aura certificada. Vuelve cuando tengas algo que mostrar, mierda Operación denegada 94 Marca 93.',
  'El cobro necesita números. Tú tienes vergüenza y poco más, coño Operación denegada 95 Marca 94. Hostia puta, qué nivel.',
  'No te llega ni para el mínimo del sistema: miseria de aura documentada, asco Operación denegada 96 Marca 95.',
  'Aura en dieta extrema. El cobro te mira y se ríe en tu cara, patético Operación denegada 97 Marca 96.',
  'Sin saldo suficiente. El sistema no fía a pobres de ranking, basura Operación denegada 98 Marca 97. Hostia puta, qué nivel.',
  'Pobreza de aura certificada. Vuelve cuando tengas algo que mostrar, ridículo Operación denegada 99 Marca 98.',
  'El cobro necesita números. Tú tienes vergüenza y poco más, fracasado Operación denegada 100 Marca 99.',
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
