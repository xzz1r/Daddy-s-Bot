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

// LA HUELLA SE CONGELA AL CARGAR EL MODULO, Y ESA ES TODA LA GRACIA.
//
// gitCommit() lee el disco EN EL MOMENTO en que se la llama, y eso servia para
// cualquier cosa menos para lo unico que hace falta: saber que codigo hay
// CARGADO EN MEMORIA. El bot la llamaba al conectar, o sea minutos despues de
// arrancar, asi que un proceso viejo que se reconectara despues de un `git
// pull` imprimia el commit NUEVO — el hash del codigo que precisamente no
// estaba ejecutando. La comprobacion mentia justo en el caso que existe para
// detectar.
//
// Paso al reves y por eso se vio: durante un despliegue, el proceso viejo se
// reconecto mientras el pull todavia no habia terminado y firmo con el hash
// anterior. El guion lo leyo como "el bot corre codigo viejo" y armo el lio.
//
// Congelada al cargar el modulo —milisegundos despues de arrancar el proceso—
// el valor es el del codigo que node acaba de leer del disco. Un proceso viejo
// ya no puede firmar con un hash nuevo pase lo que pase despues.
const COMMIT_ARRANQUE = gitCommit();

module.exports = { gitCommit, COMMIT_ARRANQUE };
