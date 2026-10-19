'use strict';

// LA VERSIÓN DE WHATSAPP WEB CON LA QUE SE PRESENTAN EL BOT Y EL GUARDIÁN.
//
// 19 oct: el bot se quedó en bucle. Abría la conexión, WhatsApp la cerraba a
// los pocos segundos y vuelta a empezar, sin QR, sin código y sin una sola
// línea de error. Se presentaba con la versión que trae Baileys dentro, que es
// también la que publica en GitHub (fetchLatestBaileysVersion lee esa).
// WhatsApp Web iba ya siete millones de revisiones por delante y había dejado
// de aceptar la vieja. Baileys no la había actualizado, y el bot no la miraba
// en otro sitio.
//
// Ahora se le pregunta a WhatsApp Web (su sw.js lleva la revisión del cliente)
// y a GitHub a la vez, y se usa la MÁS NUEVA de las que contesten. Si no
// contesta ninguna, sale undefined y Baileys usa la suya, que es lo que se
// hacía siempre.
//
// Cada consulta lleva su tope de tiempo: sin él, una que no contesta deja el
// arranque colgado sin un error, y eso ya pasó con la de GitHub.
//
// El guardián lleva su propia copia de esta cuenta: no carga nada del
// repositorio, para poder correr suelto.
const { fetchLatestWaWebVersion, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');

const ESPERA_MS = 10000;

// El temporizador NO se suelta con unref: si la consulta se queda colgada sin
// nada abierto, es lo único que mantiene vivo el arranque hasta que vence.
function conTope(promesa, ms) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    promesa.then((r) => { clearTimeout(t); resolve(r); }, () => { clearTimeout(t); resolve(null); });
  });
}

// [2, 3000, N]: gana la más alta, campo a campo.
function masNueva(versiones) {
  return versiones
    .filter((v) => Array.isArray(v) && v.length === 3 && v.every((n) => Number.isFinite(n)))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])
    .pop();
}

async function versionWA({ espera = ESPERA_MS, fuentes = [fetchLatestWaWebVersion, fetchLatestBaileysVersion] } = {}) {
  const respuestas = await Promise.all(fuentes.map((f) => conTope(Promise.resolve().then(() => f()), espera)));
  // Con `isLatest` en false lo que llega es la de dentro de Baileys: las dos
  // funciones la devuelven en vez de fallar. Esa no cuenta como respuesta.
  return masNueva(respuestas.filter((r) => r && r.isLatest).map((r) => r.version));
}

module.exports = { versionWA, masNueva };
