// Frases de los comandos de acción: *!hug*, *!kiss*, *!punch* y compañía.
//
// ESTE FICHERO ESTÁ VACÍO A PROPÓSITO Y ES TRABAJO DE GROK. El motor está
// hecho y probado; lo único que falta son las frases. Mientras un pool no
// exista, su comando NO EXISTE: no aparece en el menú, no se puede escribir y
// no cobra nada. En cuanto se exporte con frases dentro, el comando aparece
// solo. No hay que tocar ninguna otra cosa.
//
// ─── QUÉ HAY QUE ESCRIBIR ────────────────────────────────────────────────────
//
// Once pools, treinta frases cada uno:
//
//   HUG · KISS · CUDDLE · PAT · POKE      las cariñosas
//   PUNCH · SLAP · BITE · KICK · BONK     las violentas
//   FUCK                                  la explícita, cuesta el doble
//
// Y uno más, ROAST_USUARIO, de sesenta.
//
// ─── LOS PLACEHOLDERS ────────────────────────────────────────────────────────
//
//   %A = quien hace la acción      %V = quien la recibe
//
// Los dos se sustituyen por una mención. No hay más: `npm run placeholders`
// revienta con cualquier otro.
//
// ─── EL TONO ─────────────────────────────────────────────────────────────────
//
// Manda GUIA.md 5 bis entera, y encima de eso, tres cosas propias de aquí:
//
// 1. LA FRASE NO DESCRIBE LA ACCIÓN, LA COMENTA. El gif ya se ve. Contar otra
//    vez que uno abraza al otro es escribir el pie de una foto.
//
// 2. LA CRUDEZA VA SEGÚN EL COMANDO, y aquí es donde se decide si esto
//    funciona o no:
//
//    · En las cariñosas, guarra y no cursi. Un abrazo no es un momento bonito:
//      es alguien con las manos donde no tocaba. El registro es el de las
//      frases explícitas de !wingman, que ya están escritas y son la
//      referencia.
//    · En las violentas, física. Dónde pega, qué se rompe y cómo suena. Un
//      !punch no se arregla pegándole un taco al final.
//
// 3. EL OBJETIVO DEL CHISTE ES %V, NUNCA %A. Es la misma regla del robo: al
//    que gana no se le quita la victoria. La excepción es ROAST_USUARIO, que
//    existe justamente para lo contrario.
//
// ─── ROAST_USUARIO ───────────────────────────────────────────────────────────
//
// Se pega DEBAJO de la frase de la acción, en cursiva, y no habla de la acción:
// habla de quien la ha pedido. Idea del dueño, con sus palabras: quien usa
// estos comandos es un marginado, y el bot se lo recuerda cada vez.
//
//   · El objetivo es SIEMPRE %A. Nunca %V, que bastante tiene con recibirla.
//   · No repitas el chiste de arriba. Esa frase ya se rió del golpe; esta se
//     ríe de que haya pagado 60 de aura por un gif.
//   · Nada de "eres un pringado" a secas. El chiste está en el retrato: qué
//     clase de persona abre un chat para mandarle un abrazo animado a alguien
//     que tiene a dos metros.
//   · Sirve para las once, así que no menciones ninguna en concreto.
//
// AL DUEÑO NO SE LE REMATA. Lo salta el propio comando: ver hazAccion en src/commands/acciones.js.
//
// ─── ANTES DE ENTREGAR ───────────────────────────────────────────────────────
//
//   npm run check && npm run placeholders && npm run pools && npm run progreso
//
// Los pools nuevos entran solos en los cuatro. Si progreso saca casi-clones de
// lo que acabas de escribir, sobran frases: bórralas antes de entregar.
//
// ─── SE PUEDE ENTREGAR A TROZOS ──────────────────────────────────────────────
//
// No hace falta traer los doce de golpe. Cada pool que se exporte con frases
// dentro enciende SU comando y nada más: aparece en el menú corto, en
// *!help todo* y en el dispatcher, y los que sigan sin escribir se quedan
// apagados como están hoy. El menú se genera de esa misma tabla, así que no hay
// nada que tocar a mano en social.js — y `npm run check` (capa 30c) revienta en
// las dos direcciones: si una acción encendida no sale en el menú, y si el menú
// anuncia una que no tiene frases.

module.exports = {};
