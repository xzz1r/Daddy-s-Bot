// ¿Puede salir un placeholder crudo en un mensaje del bot?
//
// EXISTE POR UN FALLO REAL. El bloque de !maricon se escribió con %N mientras
// percent.js sustituye [nombre], así que nadie tocaba esas 292 frases y el grupo
// veía literalmente "%N sale con un cero que solo sorprende...". El fallo no fue
// escribir mal una frase: fue que NADIE COMPROBABA que el placeholder de una
// frase estuviera enchufado a algo.
//
// Aquí se comprueba. Para cada fichero con frases se declara qué placeholders
// tiene derecho a usar — que son los que su consumidor sustituye de verdad — y
// se revienta si aparece cualquier otro.
//
// AL AÑADIR UN POOL NUEVO: si usa un placeholder, añádelo abajo Y asegúrate de
// que el consumidor lo sustituye. Si el pool no lleva placeholders, no hace
// falta tocar nada: la lista vacía es el caso por defecto.
process.env.OWNER_NUMBER = process.env.OWNER_NUMBER || '33600000000';

const fs = require('fs');
const path = require('path');

const R = path.resolve(__dirname, '..');

// fichero de frases -> { permite: [...], sustituye: 'fichero que hace el replace' }
//
// `permite` es el CONTRATO. `sustituye` es solo documentación de dónde mirar
// cuando esto falle: los ficheros de datos no se sustituyen a sí mismos.
const CONTRATO = {
  'src/commands/activity.js':      { permite: ['%L', '%W'],                    sustituye: 'src/commands/activity.js' },
  'src/commands/duel.js':          { permite: ['%L', '%W'],                    sustituye: 'src/commands/duel.js' },
  'src/commands/mog.js':           { permite: ['%L', '%M'],                    sustituye: 'src/commands/mog.js' },
  'src/commands/percent.js':       { permite: ['[nombre]'],                    sustituye: 'src/commands/percent.js' },
  'src/commands/relevance.js':     { permite: ['%N', '%C'],                    sustituye: 'src/commands/relevance.js' },
  'src/commands/roast.js':         { permite: ['%N', '%C', '%PAIS'],           sustituye: 'src/commands/roast.js' },
  'src/commands/robo.js':          { permite: ['%A', '%C', '%N', '%V'],        sustituye: 'src/commands/robo.js' },
  'src/commands/wingman.js':       { permite: ['%N'],                          sustituye: 'src/commands/wingman.js' },
  'src/commands/ship.js':          { permite: [],                              sustituye: '(no usa placeholders)' },
  'src/commands/iq.js':            { permite: ['%IQ'],                         sustituye: 'src/commands/iq.js' },
  'src/commands/social.js':        { permite: [],                              sustituye: '(no usa placeholders)' },
  'src/commands/topsRandom.js':    { permite: ['{N}'],                         sustituye: 'src/commands/topsRandom.js' },
  'src/commands/aura.js':          { permite: [],                              sustituye: '(no usa placeholders)' },
  'src/utils/auraCobro.js':        { permite: [],                              sustituye: '(no usa placeholders)' },
  'src/data/fidelityPhrases.js':   { permite: ['[nombre]'],                    sustituye: 'src/commands/percent.js' },
  'src/data/apuestaPhrases.js':    { permite: ['%A', '%C', '%S'],              sustituye: 'src/commands/aura.js' },
  'src/data/rachaPhrases.js':      { permite: ['%N', '%P', '%D'],              sustituye: 'src/utils/casino.js' },
  'src/data/roboExtraPhrases.js':  { permite: ['%A', '%C', '%N', '%V'],        sustituye: 'src/commands/robo.js' },
};

// Una "frase" es una línea que es solo un literal de texto largo terminado en
// coma: así son todos los pools. Evita cazar rutas, claves y plantillas de
// código, que también llevan % y corchetes.
const ES_FRASE = /^\s*(['"`])(.{25,})\1,?\s*$/;

// %X y %PALABRA en mayúsculas, [loquesea] y {loquesea}. Son las formas que usa
// el bot; cualquier otra cosa con % (un 70 %, un 100 %) no se toca.
//
// ANTES SOLO COGÍA UNA LETRA (`%[A-Z]\b`) y eso dejaba un agujero: al añadir la
// detección de país, roast.js empezó a usar %PAIS en 303 frases y el validador
// no lo veía — la `A` que sigue a la `%P` no es límite de palabra, así que no
// casaba con nada. Un placeholder sin declarar y sin sustituir habría salido
// escrito en el grupo, que es justo lo que este fichero existe para impedir.
//
// El lookbehind de `${` es imprescindible: en un literal de plantilla, `${x}` lo
// interpola Node antes de que el texto exista, así que no es un placeholder
// nuestro. Sin esa exclusión saltaban 54 falsos positivos en roast.js.
const PLACEHOLDER = /%[A-Z]+\b|\[[a-zA-Z_]+\]|(?<!\$)\{[a-zA-Z_]+\}/g;

let fallos = 0;
let frasesRevisadas = 0;
let ficherosRevisados = 0;
const sinContrato = [];

function walk(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else if (f.endsWith('.js')) acc.push(p);
  }
  return acc;
}

for (const abs of walk(path.join(R, 'src'))) {
  const rel = path.relative(R, abs);
  const src = fs.readFileSync(abs, 'utf8');
  const lineas = src.split('\n');

  const encontrados = new Map();   // placeholder -> [{linea, texto}]
  lineas.forEach((l, i) => {
    const m = l.match(ES_FRASE);
    if (!m) return;
    frasesRevisadas++;
    const texto = m[2];
    for (const ph of texto.match(PLACEHOLDER) || []) {
      if (!encontrados.has(ph)) encontrados.set(ph, []);
      encontrados.get(ph).push({ linea: i + 1, texto });
    }
  });

  if (!encontrados.size) continue;
  ficherosRevisados++;

  const contrato = CONTRATO[rel];
  if (!contrato) {
    sinContrato.push(`${rel} usa ${[...encontrados.keys()].join(' ')} y no está declarado en CONTRATO`);
    fallos++;
    continue;
  }

  for (const [ph, casos] of encontrados) {
    if (contrato.permite.includes(ph)) continue;
    fallos++;
    console.log(`\nFALLO  ${rel} usa ${ph}, que su consumidor NO sustituye.`);
    console.log(`       permitidos aquí: ${contrato.permite.join(' ') || '(ninguno)'}`);
    console.log(`       quien sustituye: ${contrato.sustituye}`);
    console.log(`       ${casos.length} frase(s), la primera en la línea ${casos[0].linea}:`);
    console.log(`         ${casos[0].texto.slice(0, 100)}${casos[0].texto.length > 100 ? '…' : ''}`);
  }
}

for (const s of sinContrato) console.log(`\nFALLO  ${s}`);

console.log(`\n${'─'.repeat(70)}`);
console.log(`${frasesRevisadas} frases revisadas en ${ficherosRevisados} ficheros con placeholders.`);

if (fallos) {
  console.log(`\n${fallos} placeholder(s) sin enchufar: SALDRÍAN EN CRUDO EN EL GRUPO.`);
  process.exit(1);
}
console.log('Todos los placeholders están enchufados a algo que los sustituye.');
