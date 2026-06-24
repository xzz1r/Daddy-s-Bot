const fs = require('fs');
const path = require('path');

// Lee el commit actual leyendo .git directamente (sin invocar el binario git,
// que en Termux puede no estar en PATH dentro del proceso de node). Sirve como
// huella de "qué código está cargado en memoria": si el commit que imprime el
// bot al arrancar no coincide con `git log -1`, es que el proceso quedó con
// código viejo y hay que reiniciarlo. Nunca lanza: ante cualquier fallo
// devuelve 'desconocido' para no tumbar el arranque por un detalle cosmético.
function gitCommit() {
  try {
    const gitDir = path.join(__dirname, '..', '..', '.git');
    const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
    // HEAD es "ref: refs/heads/<branch>" (lo normal) o ya un hash (detached).
    if (head.startsWith('ref:')) {
      const ref = head.slice(4).trim();
      // El hash puede estar en el ref suelto o empaquetado en packed-refs.
      const loosePath = path.join(gitDir, ref);
      if (fs.existsSync(loosePath)) {
        return fs.readFileSync(loosePath, 'utf8').trim().slice(0, 7);
      }
      const packed = fs.readFileSync(path.join(gitDir, 'packed-refs'), 'utf8');
      for (const line of packed.split('\n')) {
        if (line.endsWith(ref)) return line.split(' ')[0].slice(0, 7);
      }
      return 'desconocido';
    }
    return head.slice(0, 7);
  } catch {
    return 'desconocido';
  }
}

module.exports = { gitCommit };
