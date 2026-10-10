// El apelativo de dominancia al final de una respuesta («…, pequeña.»).
//
// Lo quito Grok el 8 oct junto con las 337 frases que lo llevaban, y el dueño
// lo pidio de vuelta el 10 oct: «recupera todas y recortalas un 50 %». Volvio
// la mitad, en su sitio de antes.
//
// Al tier dueño no se le dice: el bot no le habla asi a quien lo manda. En las
// respuestas fijas lo resuelve `voc`; en las frases de los pools, `sinApelativo`
// envuelve el socket del comando cuando quien escribe, o a quien apunta, es del
// tier dueño, y lo quita del texto antes de mandarlo.
'use strict';
const { isOwner } = require('./wa');

const APELATIVOS = ['pequeña', 'chiquitina', 'muñeca', 'princesa', 'reina', 'mi niña', 'cosita', 'gatita', 'bebé', 'muñequita'];
const RE_APELATIVO = new RegExp(`, (?:${APELATIVOS.join('|')})(?=[.!?…]|$)`, 'g');

function voc(jid, fromMe, groupMeta, palabra) {
  try { if (isOwner(jid, fromMe, groupMeta)) return ''; } catch { return ''; }
  const p = Array.isArray(palabra) ? palabra[Math.floor(Math.random() * palabra.length)] : palabra;
  return `, ${p}`;
}

// Sin mirar a nadie: para las respuestas de dentro de un comando, que ya van
// por el socket de `sinApelativo` cuando toca el tier dueño.
function apel(palabra) {
  const p = Array.isArray(palabra) ? palabra[Math.floor(Math.random() * palabra.length)] : palabra;
  return `, ${p}`;
}

function quitarApelativo(texto) {
  return typeof texto === 'string' ? texto.replace(RE_APELATIVO, '') : texto;
}

function sinApelativo(sock) {
  return new Proxy(sock, {
    get(t, prop, r) {
      if (prop === 'sendMessage') {
        return (jid, c, o) => {
          let cc = c;
          if (c && typeof c.text === 'string') cc = { ...c, text: quitarApelativo(c.text) };
          else if (c && typeof c.caption === 'string') cc = { ...c, caption: quitarApelativo(c.caption) };
          return t.sendMessage(jid, cc, o);
        };
      }
      const v = Reflect.get(t, prop, r);
      return typeof v === 'function' ? v.bind(t) : v;
    },
  });
}

module.exports = { voc, apel, quitarApelativo, sinApelativo, APELATIVOS };
