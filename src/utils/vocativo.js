// El apelativo de dominancia al final de una respuesta fija («…, pequeña.»).
// Al tier dueño no se le dice: el bot no le habla así a quien lo manda.
'use strict';
const { isOwner } = require('./wa');

function voc(jid, fromMe, groupMeta, palabra) {
  try { if (isOwner(jid, fromMe, groupMeta)) return ''; } catch { return ''; }
  return `, ${palabra}`;
}

module.exports = { voc };
