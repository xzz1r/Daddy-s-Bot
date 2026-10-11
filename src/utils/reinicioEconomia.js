// EL RESET DEL AURA ES EL DE TODA LA ECONOMIA.
//
// Lo pidio el dueño (11 oct): «cuando se resetee el aura se debe resetear todo
// lo relacionado a ella: la tienda, el top de aura, el top de los mas
// buscados, etc. Basico». *!resetaura* dejaba los saldos al suelo y lo demas
// intacto: la tienda seguia con sus escudos y su caja, el bote lleno,
// *!buscados* con los ladrones y las recompensas de antes, y la diana del dia
// apuntando al rico de una economia que ya no existia.
//
// AQUI ESTA LA LISTA ENTERA, en un solo sitio. Lo que guarde estado del aura
// —un almacen nuevo, un reloj nuevo— se apunta aqui, o el reset lo deja vivo.
// La capa 12i lo comprueba ejecutandolo.
//
// Lo que NO se toca, a proposito:
//   · los mensajes, la racha de dias y los bonos por escribir: son actividad,
//     no aura, y los bonos son de cada grupo por decision del dueño;
//   · la memoria de rencor: recuerda cruces entre dos personas, tambien de
//     *!mog* y *!ship*, no saldos;
//   · el recargo de rafaga: cuenta usos de comandos de pago, no aura;
//   · la deuda de quien le quita el admin al bot: es un castigo, no un saldo;
//   · el interruptor *!aura on/off* de cada grupo.
//
// Los modulos se piden al llamar y no arriba del todo: aura.js llama aqui y
// aqui se llama a aura.js, y un require circular en la carga dejaria a uno de
// los dos a medio exportar.
async function resetearEconomia() {
  // Los saldos al suelo y las cajas (el banco) vacias, en todos los grupos.
  await require('./auraStore').resetAura();
  await require('./auraStore').flushAura();
  // La tienda (objetos, caja, seguridad, vetos), el bote y los golpes (los
  // buscados, las recompensas y el «quien me robo»).
  await require('./roboStore').vaciarTodo();
  // Las tiradas que pagan de hoy vuelven a estar todas.
  await require('./casinoStore').olvidarTiradas();
  // La diana del dia salio del ranking viejo.
  await require('./objetivoDia').olvidarObjetivos();
  // Lo que vive en memoria: rachas calientes, el amaño del dueño, los relojes
  // del robo y de la tirada, los tops y los duelos pendientes.
  require('./momentum').olvidarTodo();
  require('./rigOwner').olvidarRachas();
  require('../commands/robo').olvidarRobos();
  require('../commands/aura').olvidarAura();
  require('../commands/duel').olvidarDuelos();
}

module.exports = { resetearEconomia };
