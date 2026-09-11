#!/usr/bin/env node
// LAS FRASES BASURA: siete defectos de escritura, medidos sobre todo el bot.
//
//   npm run frases                  resumen: cuantas hay de cada cosa y donde
//   npm run frases <familia>        solo esa familia, con su sitio y su texto
//   npm run frases <familia> --pool <trozo>   filtra por pool
//   npm run frases -- --techo      falla si alguna familia ha crecido
//                                 (el `--` es de npm: sin el no pasa la opcion)
//
// El dueño lo dijo asi: «todos los insultos del bot son analogias baratas, sin
// coherencia, estupidas y sin jugo real. Prefiero ataques directos y con
// coherencia». La primera vez busque solo la analogia y salieron 229 de 7.935,
// que no explicaba lo que el veia leyendo el chat. Buscando a fondo salieron
// seis defectos mas, y esos si suman. Este script los mide todos.
//
// `npm run analogias` es otra cosa y sigue haciendo falta: cuenta las lineas
// marcadas a mano con `// ANALOGIA`, que es el encargo abierto de PENDIENTE.md.
// Este de aqui no cuenta marcas: mide el texto.
//
// LO QUE BUSCA CADA FAMILIA
//
//   nadie      La frase no habla de nadie. Ni «tú», ni «te», ni un verbo en
//              segunda persona, ni el nombre, ni una coletilla que llame a
//              alguien. Es la version medible de lo que dijo el dueño: «se le
//              puede mandar a cualquiera del grupo sin cambiar una letra».
//              Esta es la familia que explica !aura: 74 de las 120 frases de
//              ganar no mencionan a quien acaba de ganar.
//              Y es la que NINGUNA expresion regular de comparacion veia,
//              porque estas frases no comparan con «como» ni con «mas que»:
//              sueltan una imagen y se van. «Cafe de maquina: dos sorbos y a
//              cenicero.» No hay comparacion que cazar. No hay persona.
//
//   analogia   El chiste es el OBJETO, no la persona.
//              «Tu lealtad es como el wifi del vecino.»
//              Se le puede mandar a cualquiera del grupo sin cambiar una letra.
//              NO entra «como quien + verbo» (`besa como quien firma algo`):
//              ahi la comparacion describe una actitud, no sustituye al insulto.
//
//   coletilla  La frase es neutra y el insulto va pegado al final con una coma.
//              «El marcador no miente, pringado.»
//              Marcadas [cuerpo limpio] las que no llevan ni una palabra de
//              insulto fuera de la coletilla. Suelen ser las mejor escritas:
//              atacan describiendo, y el epiteto pegado detras sobra. En esas,
//              el arreglo entero es borrar la coma y lo que va despues.
//
//   eco        La frase abre repitiendo la etiqueta del comando.
//              En !rata: «Rata de manual...». Ya lo sabe: lo acaba de leer en
//              el titulo del mensaje. Gasta la apertura en no decir nada.
//
//   molde      Cuatro o mas frases del mismo pool empiezan igual, palabra por
//              palabra. Al usuario le llegan de una en una, pero el molde se
//              nota igual: el bot suena a plantilla rellenada.
//              No cuenta la apertura que lleva un placeholder (`%A besa…` en
//              un pool de besos) ni la que son solo conectores (`y se…` en un
//              pool de remates): ahi la repeticion la impone la gramatica, no
//              el que escribio. Solo cuentan las palabras que se eligieron.
//
//   enlatado   Un trozo de cinco palabras que se repite en cuatro frases o mas
//              de todo el bot. No es una frase parecida: es el mismo bloque
//              copiado. «la multa de los inutiles», en doce sitios.
//              Pide dos palabras con contenido dentro del trozo: `el aura de
//              %V y` sale doce veces tambien, pero eso es el TEMA de un pool
//              de robos, no un bloque copiado.
//
//   roto       Daño mecanico de alguna edicion masiva anterior: oracion que
//              empieza en minuscula despues de punto, o un bloque de seis
//              palabras pegado dos veces dentro de la misma frase. A cinco
//              palabras el filtro empezaba a cazar paralelismos buscados
//              («Con la mitad de tu potencial… Con la mitad de tu pereza»),
//              que son de lo mejor que hay escrito aqui.
'use strict';

const fs = require('fs');
const path = require('path');

const D = path.join(__dirname, '../src/data');
const args = process.argv.slice(2);
const FAMILIAS = ['nadie', 'analogia', 'coletilla', 'eco', 'molde', 'enlatado', 'roto'];
const soloFam = args.find((a) => FAMILIAS.includes(a)) || null;
const iPool = args.indexOf('--pool');
const soloPool = iPool >= 0 ? args[iPool + 1] : null;
const TECHO_MODO = args.includes('--techo');

// El techo es la foto del dia que se midio esto. No es un objetivo: es un
// tope. Reescribir un pool tiene que BAJAR estos numeros; si alguno sube,
// alguien acaba de meter frases con el mismo defecto que veniamos a quitar.
// Cuando bajen de verdad, se bajan aqui tambien y el techo se queda apretado.
const TECHO = { nadie: 1099, analogia: 230, coletilla: 595, eco: 426, molde: 1790, enlatado: 410, roto: 0 };

// ─── corpus ────────────────────────────────────────────────────────────────
const vistos = new Set();
const pools = [];

// AURA.gain / loss / blessed / spiral / cursed viven dentro de src/commands/
// aura.js, no en src/data/. Hacer `require` de ese fichero arrastraria medio
// bot, asi que se leen del texto igual que hace `npm run analogias`. Sin ellas
// el informe se dejaba fuera justo el sitio que el dueño señaló.
{
  const f = path.join(__dirname, '../src/commands/aura.js');
  const lineas = fs.readFileSync(f, 'utf8').split('\n');
  const cadena = /^\s*('(?:\\.|[^'\\])*')\s*,/;
  let actual = null;
  for (const l of lineas) {
    const cab = /^  (blessed|gain|loss|spiral|cursed):\s*\[/.exec(l);
    if (cab) { actual = { pool: `aura:AURA.${cab[1]}`, frases: [] }; pools.push(actual); continue; }
    if (!actual) continue;
    if (/^  \]/.test(l)) { actual = null; continue; }
    const m = cadena.exec(l);
    if (m) actual.frases.push(m[1].slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
  }
}
for (const f of fs.readdirSync(D).filter((x) => x.endsWith('.js'))) {
  let mod;
  try { mod = require(path.join(D, f)); } catch { continue; }
  const rec = (o, ruta, d) => {
    if (d > 3) return;
    if (Array.isArray(o) && o.length && o.every((x) => typeof x === 'string')) {
      // percentLabels reexporta los arrays de fidelityPhrases: contarlos dos
      // veces doblaria el problema en el informe.
      if (vistos.has(o)) return;
      vistos.add(o);
      pools.push({ pool: `${f.replace('.js', '')}:${ruta}`, frases: o });
      return;
    }
    if (o && typeof o === 'object') for (const k of Object.keys(o)) rec(o[k], ruta ? `${ruta}.${k}` : k, d + 1);
  };
  rec(mod, '', 0);
}

const pelado = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const palabras = (s) => pelado(s).replace(/[^a-z0-9%\s]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);

// ─── familia: analogia ─────────────────────────────────────────────────────
const ANALOGIA = [
  /\b(?:m[áa]s|menos)\s+[\wáéíóúñ]+\s+que\s+(?:un|una|el|la|los|las)\s+[\wáéíóúñ]/i,
  /\btien(?:es|e)\s+m[áa]s\s+[\wáéíóúñ]+\s+que\s+(?:un|una|el|la|los|las)?\s*[\wáéíóúñ]/i,
  /\b(?:es|eres|son|sois)\s+como\s+(?:un|una|el|la|los|las)\s+[\wáéíóúñ]/i,
  /\btan\s+[\wáéíóúñ]+\s+como\s+(?:un|una|el|la)\s+[\wáéíóúñ]/i,
  /\bsi\s+[^.]{0,45}\bfuera[ns]?\b[^.]{0,45}\bser[íi]as\b/i,
];

// ─── familia: coletilla ────────────────────────────────────────────────────
// Medida sobre el propio corpus: son las que aparecen pegadas al final cuatro
// veces o mas. No entra «joder» ni «hostia», que ahi son interjeccion.
const EPITETOS = [
  'cabron', 'cabrona', 'gilipollas', 'pringado', 'pringada', 'inutil', 'puto inutil',
  'patetico', 'patetica', 'basura', 'fracasado', 'fracasada', 'don nadie', 'mierda',
  'asco', 'muerto de hambre', 'desperdicio', 'ridiculo', 'ridicula', 'cutre', 'guarra',
  'guarro', 'puto guarro', 'cabronazo', 'perdedor', 'perdedora', 'cobarde', 'parasito',
  'el cabron', 'el muy imbecil', 'imbecil', 'subnormal', 'payaso', 'payasa', 'mamon',
];
const rxColetilla = new RegExp(`,\\s*(?:${EPITETOS.map((e) => e.replace(/ /g, '\\s+')).join('|')})\\s*[.!]?\\s*$`, 'i');
// Vocabulario de ataque: si el resto de la frase no tiene NADA de esto, el
// insulto entero es la coletilla.
const ATAQUE = /\b(?:mierd|puta|puto|puti|joder|jodid|asco|asquer|patet|pring|inutil|fracas|ridicul|basura|cutre|imbecil|gilipoll|cabron|idiot|tont|est[úu]pid|penos|lament|misera|verguenz|verg[üu]enz|humill|pierde|perde|fall|cag|torpe|blando|cobard|nadie te|no vale|vac[íi]o|triste|pobre|desperdic|sobra|repugn|nefast|desastr|fea|feo|gorda|gordo|rata|guarr|zorra|parasit)/i;

// ─── familia: nadie ────────────────────────────────────────────────────────
// Segunda persona por cualquier via: pronombre, posesivo, verbo conjugado en
// -as/-es/-aste/-iste, placeholder de nombre, o un epiteto en vocativo.
// Se prueba contra el texto SIN tildes (`pelado`), y por un motivo concreto:
// en JavaScript `ú` no es caracter de palabra, asi que `\bt[úu]\b` no casa con
// «Tú machacas» —el limite final no existe— y la familia entera se llenaba de
// falsos positivos. Sin tildes, `\btu\b` casa y ya no miente.
const PERSONA = new RegExp(
  '%[avnd]|\\[nombre\\]'
  + '|\\b(?:tu|tus|te|ti|contigo|usted|vosotros)\\b'
  + '|\\b(?:eres|estas|tienes|vas|has|habias|puedes|sabes|quieres|sigues|acabas|vienes'
  + '|haces|dices|llevas|pareces|mereces|necesitas|crees|vives|sales|pides|miras|buscas'
  + '|juegas|apuestas|aprende|relaja|mira|cuenta|deja|para|vete|calla)\\b'
  + '|\\b\\w+(?:aste|iste)\\b'
  + `|,\\s*(?:${EPITETOS.map((e) => e.replace(/ /g, '\\s+')).join('|')})\\s*[.!?]?\\s*$`);

// ─── familia: eco ──────────────────────────────────────────────────────────
// Para los pools que llevan el nombre del comando (`rata.high`), mirar si la
// frase abre repitiendo esa misma palabra.
const RAIZ = { inutil: 'inutil', rata: 'rata', puta: 'put', guarra: 'guarr', simp: 'simp', incel: 'incel', friki: 'frik', cerdo: 'cerd', perdedor: 'perdedor', ganador: 'ganador', fea: 'fe', linda: 'lind', sexy: 'sexy', crack: 'crack', maricon: 'maric', femboy: 'femboy', feminidad: 'femenin', masculinidad: 'masculin', gay: 'gay', virgen: 'virgen', pobre: 'pobre' };

// Una apertura solo cuenta como molde si la eligio quien escribio: ni
// placeholder ni conectores sueltos.
const VACIAS = new Set(['y', 'e', 'o', 'u', 'pero', 'que', 'si', 'no', 'ni', 'ya', 'se', 'le', 'les', 'la', 'el', 'lo', 'los', 'las', 'un', 'una', 'de', 'del', 'al', 'a', 'en', 'con', 'por', 'para', 'su', 'tu', 'mi', 'es', 'te', 'me', 'hay', 'cuando', 'como', 'mas', 'muy', 'esa', 'ese', 'esta', 'este']);
const aperturaDe = (w) => {
  if (w.length < 2) return null;
  const k = w.slice(0, 2);
  if (k.some((x) => x.startsWith('%'))) return null;
  if (k.every((x) => VACIAS.has(x))) return null;
  return k.join(' ');
};

// ─── indices que necesitan ver todo el corpus ──────────────────────────────
const aperturas = new Map();     // pool → Map(2 palabras → veces)
const enlatados = new Map();     // 5-grama → nº de frases distintas
for (const p of pools) {
  const m = new Map();
  for (const t of p.frases) {
    const w = palabras(t);
    const k = aperturaDe(w);
    if (k) m.set(k, (m.get(k) || 0) + 1);
    const seen = new Set();
    for (let i = 0; i + 5 <= w.length; i++) {
      const trozo = w.slice(i, i + 5);
      if (trozo.filter((x) => !x.startsWith('%') && !VACIAS.has(x)).length < 2) continue;
      const g = trozo.join(' ');
      if (seen.has(g)) continue;
      seen.add(g);
      enlatados.set(g, (enlatados.get(g) || 0) + 1);
    }
  }
  aperturas.set(p.pool, m);
}

// ─── clasificacion ─────────────────────────────────────────────────────────
const hallazgos = [];
const tam = {};
for (const p of pools) {
  tam[p.pool] = p.frases.length;
  const etiqueta = p.pool.startsWith('percentLabels:') ? RAIZ[p.pool.split(':')[1].split('.')[0]] : null;
  const ap = aperturas.get(p.pool);
  p.frases.forEach((t, i) => {
    const add = (familia, nota) => hallazgos.push({ familia, pool: p.pool, i, texto: t, nota });
    const w = palabras(t);

    if (!PERSONA.test(pelado(t))) add('nadie', '');

    if (ANALOGIA.some((rx) => rx.test(t))) add('analogia', '');

    if (rxColetilla.test(t)) {
      const cuerpo = t.replace(rxColetilla, '');
      add('coletilla', ATAQUE.test(cuerpo) ? '' : '[cuerpo limpio]');
    }

    if (etiqueta && w.slice(0, 3).some((x) => x.startsWith(etiqueta))) add('eco', '');

    const abre = aperturaDe(w);
    if (abre && (ap.get(abre) || 0) >= 4) add('molde', `«${abre}…» ×${ap.get(abre)}`);

    let lata = null;
    for (let k = 0; k + 5 <= w.length && !lata; k++) {
      const g = w.slice(k, k + 5).join(' ');
      if ((enlatados.get(g) || 0) >= 4) lata = g;
    }
    if (lata) add('enlatado', `«${lata}» ×${enlatados.get(lata)}`);

    let roto = null;
    if (/[^.]\.\s+[a-záéíóúüñ]/.test(t)) roto = 'minúscula tras punto';
    if (!roto) {
      for (let L = 8; L >= 6 && !roto; L--) {
        const vis = new Map();
        for (let k = 0; k + L <= w.length; k++) {
          const g = w.slice(k, k + L).join(' ');
          if (vis.has(g) && k - vis.get(g) >= L) { roto = `«${g}» dos veces`; break; }
          if (!vis.has(g)) vis.set(g, k);
        }
      }
    }
    if (roto) add('roto', roto);
  });
}

// ─── informe ───────────────────────────────────────────────────────────────
const TOTAL = pools.reduce((a, b) => a + b.frases.length, 0);
const TITULOS = {
  nadie: 'la frase no menciona a la persona: vale para cualquiera',
  analogia: 'el chiste es el objeto, no la persona',
  coletilla: 'frase neutra + insulto pegado con una coma',
  eco: 'abre repitiendo la etiqueta del comando',
  molde: 'cuatro o más del pool empiezan igual',
  enlatado: 'el mismo bloque de 5 palabras en 4 frases o más',
  roto: 'daño mecánico de una edición anterior',
};

if (TECHO_MODO) {
  let mal = 0;
  for (const f of FAMILIAS) {
    const n = hallazgos.filter((h) => h.familia === f).length;
    const t = TECHO[f];
    if (n > t) { console.log(`  ✗ ${f}: ${n} (el techo era ${t}, han entrado ${n - t})`); mal++; } else if (n < t) console.log(`  · ${f}: ${n} (bajó ${t - n}; baja el techo en scripts/frases.js)`);
  }
  if (mal) { console.log('\nHan entrado frases con defectos que ya estaban catalogados.'); process.exit(1); }
  console.log('  ✓ ninguna familia ha crecido');
  process.exit(0);
}

if (!soloFam) {
  console.log('\n──────────────────────────────────────────────────────────────────────');
  console.log(`FRASES BASURA — ${TOTAL} frases revisadas en ${pools.length} pools`);
  console.log('──────────────────────────────────────────────────────────────────────\n');
  const tocadas = new Set();
  for (const f of FAMILIAS) {
    const x = hallazgos.filter((h) => h.familia === f);
    x.forEach((h) => tocadas.add(`${h.pool}#${h.i}`));
    const pc = Math.round((x.length * 100) / TOTAL);
    console.log(`${f.padEnd(11)}${String(x.length).padStart(5)}  ${String(`${pc}%`).padStart(4)}   ${TITULOS[f]}`);
  }
  console.log(`\n${tocadas.size} frases distintas tienen al menos un defecto: el ${Math.round((tocadas.size * 100) / TOTAL)} % del bot.\n`);

  console.log('DÓNDE SE CONCENTRA (pools con 30 % o más de sus frases tocadas)\n');
  const porPool = {};
  for (const h of hallazgos) (porPool[h.pool] = porPool[h.pool] || new Set()).add(h.i);
  const filas = Object.entries(porPool)
    .map(([k, v]) => [k, v.size, tam[k], Math.round((v.size * 100) / tam[k])])
    .filter(([, , n, pc]) => pc >= 30 && n >= 20)
    .sort((a, b) => b[3] - a[3] || b[1] - a[1]);
  console.log('pool'.padEnd(36) + 'tocadas  pool     %');
  for (const [k, v, n, pc] of filas) {
    console.log(k.padEnd(36) + String(v).padStart(5) + String(n).padStart(7) + String(`${pc}%`).padStart(7));
  }
  console.log(`\n(npm run frases <familia> para verlas: ${FAMILIAS.join(', ')})\n`);
} else {
  let x = hallazgos.filter((h) => h.familia === soloFam);
  if (soloPool) x = x.filter((h) => h.pool.includes(soloPool));
  console.log(`\n═══ ${soloFam.toUpperCase()} — ${TITULOS[soloFam]} — ${x.length} frases ═══\n`);
  let pool = null;
  for (const h of x.sort((a, b) => a.pool.localeCompare(b.pool) || a.i - b.i)) {
    if (h.pool !== pool) { pool = h.pool; console.log(`\n─── ${pool} ───`); }
    console.log(`  [${String(h.i).padStart(3)}]${h.nota ? ` ${h.nota}` : ''} ${h.texto}`);
  }
  console.log();
}
