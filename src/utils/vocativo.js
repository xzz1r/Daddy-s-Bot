// El apelativo de dominancia al final de una respuesta fija («…, pequeña.»).
// Al tier dueño no se le dice: el bot no le habla así a quien lo manda.
// Con una lista sale una al azar: las respuestas que se ven a diario no pueden
// decir siempre la misma palabra.
'use strict';
const { isOwner } = require('./wa');

function voc(jid, fromMe, groupMeta, palabra) {
  try { if (isOwner(jid, fromMe, groupMeta)) return ''; } catch { return ''; }
  const p = Array.isArray(palabra) ? palabra[Math.floor(Math.random() * palabra.length)] : palabra;
  return `, ${p}`;
}

module.exports = { voc };
