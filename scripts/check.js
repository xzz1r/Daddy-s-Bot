// ¿Arranca el bot, y dice lo que debe decir?
//
// EXISTE POR UN FALLO REAL Y CARO. Un lote de frases entró con dos errores de
// sintaxis —comillas sin escapar en ship.js y 101 frases partidas en dos líneas
// en wingman.js— y el bot dejó de arrancar. Los dos validadores que ya había
// (placeholders y pools) salieron EN VERDE, porque comparan líneas con
// expresiones regulares: no compilan nada. Nadie comprobaba lo más básico.
//
// Aquí se comprueba, en tres capas de menos a más exigente:
//
//   1. COMPILA   — cada .js es JavaScript válido. Pilla comillas sin escapar,
//                  cadenas partidas, comas de más.
//   2. CARGA     — cada módulo se puede importar. Pilla requires rotos y
//                  exports que faltan, que compilan bien y revientan al usarse.
//   3. RESPONDE  — se ejecutan los comandos de porcentaje muchas veces con un
//                  sock falso. Pilla excepciones en caliente y, sobre todo,
//                  placeholders que llegan SIN sustituir al mensaje final, que
//                  es el fallo que el grupo ve escrito en crudo.
//
// Las capas 2 y 3 necesitan node_modules. Si no está instalado se saltan con un
// aviso en vez de fallar: la capa 1, que es la que pilla el bot caído, corre
// siempre y no depende de nada.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Module = require('module');

const R = path.resolve(__dirname, '..');
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const verde = (s) => `\x1b[32m${s}\x1b[0m`;

let fallos = 0;

function ficherosJs() {
  const out = [];
  (function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      if (f === 'node_modules' || f === '.git' || f === 'temp') continue;
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (f.endsWith('.js')) out.push(p);
    }
  })(R);
  return out;
}

// ─── 1. ¿Compila? ────────────────────────────────────────────────────────────
//
// Se envuelve el código igual que hace Node con un módulo CommonJS antes de
// compilarlo. Sin ese envoltorio, un `return` en el cuerpo del módulo —legal en
// CJS— se contaría como error.
console.log('\n1. COMPILA');
const ficheros = ficherosJs();
for (const abs of ficheros) {
  const rel = path.relative(R, abs);
  try {
    // El shebang de los ejecutables (#!/usr/bin/env node) lo quita Node al
    // cargar, pero vm.Script no: sin retirarlo, index.js daría un falso error
    // de sintaxis en la línea 1.
    const codigo = fs.readFileSync(abs, 'utf8').replace(/^#![^\n]*/, '');
    new vm.Script(Module.wrap(codigo), { filename: abs });
  } catch (e) {
    fallos++;
    console.log(rojo(`   ✗ ${rel}`));
    console.log(`     ${e.message}`);
    // La línea del error es lo único que hace falta para arreglarlo.
    const linea = (e.stack || '').split('\n').find((l) => l.includes(abs));
    if (linea) console.log(`     ${linea.trim()}`);
  }
}
if (!fallos) console.log(verde(`   ✓ ${ficheros.length} ficheros compilan`));

// Si algo no compila, las capas siguientes solo darían ruido derivado.
if (fallos) {
  console.log(rojo(`\n${fallos} fichero(s) con sintaxis inválida: EL BOT NO ARRANCA.`));
  process.exit(1);
}

// ─── 2. ¿Carga? ──────────────────────────────────────────────────────────────
// SIN node_modules ESTO NO ES UN VERDE, ES UN "NO HE MIRADO".
//
// Aqui se salia con exit 0 y el mensaje "Sintaxis correcta", que en el script
// de despliegue se lee igual que un check pasado: `if ! npm run check` no
// distingue "todo bien" de "no he podido comprobar casi nada". Y lo que se
// queda sin correr no es cualquier cosa —son las capas que deciden a quien se
// echa del grupo: antilink, antiempresa y el freno de ruido.
//
// Es exactamente el mismo error que el antiempresa tenia con las cuentas sin
// comprobar: tratar la ignorancia como si fuera una respuesta. Un despliegue a
// medias (npm install a medio hacer, disco lleno) desplegaba los agujeros con
// el semaforo en verde.
if (!fs.existsSync(path.join(R, 'node_modules'))) {
  console.log('\n2-10. SALTADAS: falta node_modules.');
  console.log(rojo('\nLa sintaxis esta bien, pero NO se ha comprobado nada de moderacion'));
  console.log(rojo('(antilink, antiempresa, ruido). Corre `npm install` y repite.'));
  process.exit(1);
}

process.env.OWNER_NUMBER = process.env.OWNER_NUMBER || '34600000000';
console.log('\n2. CARGA');
for (const dir of ['src/commands', 'src/utils', 'src/data', 'src/handlers']) {
  for (const f of fs.readdirSync(path.join(R, dir)).filter((x) => x.endsWith('.js'))) {
    const rel = path.join(dir, f);
    try {
      require(path.join(R, rel));
    } catch (e) {
      fallos++;
      console.log(rojo(`   ✗ ${rel}: ${e.message.split('\n')[0]}`));
    }
  }
}
if (!fallos) console.log(verde('   ✓ todos los módulos importan'));

// ─── 3. ¿Responde? ───────────────────────────────────────────────────────────
console.log('\n3. RESPONDE');
const percent = require(path.join(R, 'src/commands/percent.js'));
const comandos = Object.keys(percent).filter((k) => k.startsWith('cmd'));

// Los tres marcadores que usa el bot. Si uno llega hasta aquí es que su
// consumidor no lo sustituyó, y el grupo lo leería tal cual.
const CRUDO = /%[A-Z]\b|\[[a-zA-Z_]+\]|\{[a-zA-Z_]+\}/;

const TIRADAS = 60;   // suficiente para tocar los tres tramos de cada comando
let mensajes = 0;

const sock = {
  sendMessage: async (jid, contenido) => {
    mensajes++;
    const texto = contenido.text || '';
    if (!texto.trim()) {
      fallos++;
      console.log(rojo('   ✗ mensaje vacío'));
    } else if (CRUDO.test(texto)) {
      fallos++;
      console.log(rojo(`   ✗ placeholder sin sustituir: ${texto.slice(0, 90)}`));
    }
    return {};
  },
};

const YO   = '34611111111@s.whatsapp.net';
const OTRO = '34622222222@s.whatsapp.net';
const JID  = '000@g.us';

const msg = {
  key: { remoteJid: JID, participant: YO, fromMe: false },
  message: { conversation: '!check' },
};
const groupMeta = {
  id: JID,
  subject: 'grupo de prueba',
  participants: [{ id: YO, admin: null }, { id: OTRO, admin: null },
                 { id: '34633333333@s.whatsapp.net', admin: 'admin' }],
};

// Mensaje sin mencion y de un remitente nuevo cada vez, para los comandos que
// actuan sobre uno mismo y llevan cooldown (!aura). Repetir remitente los frena
// en seco y el comando se queda sin probar de verdad.
const msgSolo = (i) => ({
  key: { remoteJid: JID, participant: `3499${String(i).padStart(7, '0')}@s.whatsapp.net`,
         fromMe: false, id: 'S' + i },
  message: { conversation: '!check' },
});

// Mensaje con mencion, para los comandos que necesitan un objetivo distinto.
const msgCon = {
  key: { remoteJid: JID, participant: YO, fromMe: false, id: 'X' },
  message: { extendedTextMessage: { text: '!check @34622222222',
             contextInfo: { mentionedJid: [OTRO] } } },
};

// El resto de comandos que solo sacan frases. No estaban cubiertos y ahi fue
// donde se colo el fallo de los pools vacios: `node --check` no lo ve porque el
// fichero compila igual, y el pool solo revienta cuando la tirada cae en el.
//
// Cada entrada dice como se llama: la firma NO es la misma en todos. cmdDuel
// recibe (sock, msg, args, groupMeta) y el resto (sock, msg, groupMeta), y
// pasarselo mal da un fallo que parece del bot y es del test.
const OTROS = [
  ['iq',        () => require(path.join(R, 'src/commands/iq')).cmdIQ,             'meta'],
  ['ship',      () => require(path.join(R, 'src/commands/ship')).cmdShip,         'meta'],
  ['mog',       () => require(path.join(R, 'src/commands/mog')).cmdMog,           'meta'],
  ['relevancia',() => require(path.join(R, 'src/commands/relevance')).cmdRelevance,'meta'],
  ['rizz',      () => require(path.join(R, 'src/commands/wingman')).cmdRizz,      'meta'],
  ['piropo',    () => require(path.join(R, 'src/commands/wingman')).cmdPiropo,    'meta'],
  ['wingman',   () => require(path.join(R, 'src/commands/wingman')).cmdWingman,   'meta'],
  ['duel',      () => require(path.join(R, 'src/commands/duel')).cmdDuel,         'args'],

  // !aura, !roast y !robo faltaban, y son los TRES MAS USADOS del grupo.
  //
  // EXISTE POR UN FALLO QUE ESTA CAPA DEJO PASAR ENTERO. Un script masivo
  // aplasto una funcion de aura.js en una sola linea de 2.198 caracteres,
  // comentarios `//` incluidos. Al quedar todo detras del primer `//`, treinta
  // lineas de codigo real —entre ellas `const sign`— pasaron a ser comentario.
  // El fichero compila perfecto, importa perfecto, y la capa 1 y la 2 daban
  // verde. Solo reventaba al TIRAR: "sign is not defined" en la cara del grupo.
  //
  // Esta capa lo habria pillado en la primera tirada. No lo hizo porque !aura
  // no estaba en la lista, y no estaba por ningun motivo: se fue anyadiendo lo
  // que iba fallando. Que el comando que mueve la moneda del grupo no se
  // ejecutara ni una vez antes de desplegar era el agujero mas grande que tenia
  // el guardian.
  //
  // `solo` = mensaje SIN mencion y con un remitente distinto en cada tirada.
  // Las dos cosas hacen falta: con mencion, !aura no tira, CONSULTA el saldo del
  // mencionado y no pisa nunca el codigo de la tirada — que es justo donde
  // estaba el fallo. Y con el mismo remitente saltaria el cooldown de 10 min a
  // partir de la segunda, dejando 59 tiradas sin ejercitar nada.
  ['aura',      () => require(path.join(R, 'src/commands/aura')).cmdAura,         'solo'],
  ['roast',     () => require(path.join(R, 'src/commands/roast')).cmdRoast,       'meta'],
  ['robo',      () => require(path.join(R, 'src/commands/robo')).cmdRobo,         'args'],
];


// ─── 4. ¿Los stores guardan lo que dicen? ────────────────────────────────────
//
// Aqui vive el aura, las rachas, los cooldowns y los contadores: un fallo no da
// un mensaje feo, pierde el saldo de la gente. No tenian NINGUNA cobertura de
// ejecucion, y la primera pasada encontro un TypeError real en casinoStore que
// llevaba escondido detras de un try/catch.
//
// Se trabaja sobre un grupo de pruebas con JID propio, asi que no toca los datos
// de ningun grupo real aunque se ejecute sobre la VPS.
// Los stores escriben en data/. Si el bot esta vivo en la misma maquina, los dos
// procesos tienen su propia copia en memoria del mismo JSON y el flush del
// ultimo pisa lo del otro: correr esto en la VPS con el bot en marcha podia
// borrar aura de verdad.
//
// Se detecta por la marca de tiempo de state.json, que el bot reescribe cada
// pocos segundos mientras corre. Si esta fresca, la capa se salta: mas vale no
// comprobar que corromper los datos del grupo.
const DATA = path.join(R, 'data');
function botEnMarcha() {
  try {
    const st = fs.statSync(path.join(DATA, 'state.json'));
    return Date.now() - st.mtimeMs < 60 * 1000;
  } catch { return false; }
}

// Y aunque no lo este, se devuelve data/ como estaba: la capa crea un grupo de
// pruebas y toca la banlist, que es global.
function copiaSeguridad() {
  const copia = new Map();
  let ficheros = [];
  try { ficheros = fs.readdirSync(DATA).filter((f) => f.endsWith('.json')); } catch { return copia; }
  for (const f of ficheros) {
    try { copia.set(f, fs.readFileSync(path.join(DATA, f))); } catch {}
  }
  return copia;
}
function restaurar(copia, antes) {
  let ahora = [];
  try { ahora = fs.readdirSync(DATA).filter((f) => f.endsWith('.json')); } catch { return; }
  for (const f of ahora) {
    if (copia.has(f)) { try { fs.writeFileSync(path.join(DATA, f), copia.get(f)); } catch {} }
    else if (!antes.has(f)) { try { fs.unlinkSync(path.join(DATA, f)); } catch {} }
  }
}

async function capaStores() {
  console.log('\n4. GUARDAN');
  if (botEnMarcha()) {
    console.log('   — saltada: el bot esta corriendo y escribiria sobre sus datos');
    return;
  }
  const G = '000000000@g.us';
  const U = '34600000001@s.whatsapp.net';
  const V = '34600000002@s.whatsapp.net';
  const comprueba = (c, q) => {
    if (c) return;
    fallos++;
    console.log(rojo(`   ✗ ${q}`));
  };

  // El interruptor de !aura off tapa una lista de comandos que se deduce del
  // propio dispatcher. Si un refactor rompe ese patron, la deduccion cae a la
  // lista a mano de seis nombres y la economia se queda medio abierta con la
  // economia apagada, EN SILENCIO. Por eso se comprueba que sigue encontrando
  // los alias, no solo que arranca.
  {
    const src = fs.readFileSync(path.join(R, 'src/handlers/messageHandler.js'), 'utf8');
    const bloques = /((?:\s*case '[^']+':[^\n]*\n)+)\s*await (cmdDar|cmdRobo|cmdDuel)\(/g;
    const hallados = new Set();
    for (const m of src.matchAll(bloques)) {
      for (const c of m[1].matchAll(/case '([^']+)'/g)) hallados.add(c[1]);
    }
    comprueba(hallados.size >= 20,
      `aura off: se deducen ${hallados.size} comandos que mueven aura (si baja de 20, el patron del dispatcher se ha roto y el interruptor deja puertas abiertas)`);
    for (const imprescindible of ['dar', 'regalar', 'robo', 'atraco', 'contrarobo', 'asalto', 'comprar']) {
      comprueba(hallados.has(imprescindible), `aura off: !${imprescindible} queda tapado por el interruptor`);
    }
  }

  // LOS TEXTOS DE AYUDA NO PUEDEN ANUNCIAR COMANDOS QUE NO EXISTEN.
  //
  // Esto encontro dos que llevaban tiempo puestos: la guia listaba *!percent*,
  // que no es un comando sino la clave de precio que comparten !gay, !puta e
  // !iq; y *!aura guia* no devolvia la guia sino una TIRADA, porque la lista que
  // dejaba pasar 'guia' y la que la despachaba eran dos listas distintas.
  //
  // Los dos son invisibles desde dentro: el bot no falla, contesta otra cosa.
  {
    const mh = fs.readFileSync(path.join(R, 'src/handlers/messageHandler.js'), 'utf8');
    const existen = new Set([...mh.matchAll(/case '([^']+)':/g)].map((m) => m[1]));
    const salidas = [];
    const sockT = { sendMessage: async (j, c) => { salidas.push(c); return {}; } };
    const metaT = { id: G, participants: [{ id: U }] };
    const msgT = { key: { remoteJid: G, participant: U, fromMe: false, id: 'X' },
                   message: { conversation: '!guia' }, pushName: 'x' };

    const { cmdAura } = require(path.join(R, 'src/commands/aura'));
    await cmdAura(sockT, msgT, ['guia'], metaT);
    const guia = salidas.at(-1)?.text || '';
    comprueba(/GU[IÍ]A DEL AURA/.test(guia),
      'ayuda: *!aura guia* devuelve la guia (y no una tirada, que es lo que hacia)');

    // LA GUIA TIENE QUE SEGUIR CABIENDO EN UNA PANTALLA.
    //
    // Llego a tener 3.196 caracteres: cuatro secciones, los ocho objetos con
    // precio y horas, los rangos de la apuesta, el punto dulce del robo y la
    // lista entera de precios. En un grupo de WhatsApp eso no se lee — y encima
    // llega plegado detras de un "Leer mas", asi que ni se ve.
    //
    // El limite no es estetico: por encima de ~700 caracteres WhatsApp la pliega
    // y la guia deja de hacer su trabajo, que es que alguien escriba su primer
    // comando. Una guia crece sola, un parrafo cada vez y siempre con buen
    // motivo; esto es lo que lo para.
    const TOPE_GUIA = 700;
    comprueba(guia.length <= TOPE_GUIA,
      `ayuda: la guia son ${guia.length} caracteres y el tope es ${TOPE_GUIA} — por encima WhatsApp la pliega y no se lee`);

    // Y sin cifras sueltas: cada numero en la guia es uno que se queda viejo al
    // primer reajuste. Solo se permite el arranque, que da la escala.
    {
      const { ARRANQUE } = require(path.join(R, 'src/utils/economia'));
      // Cifras SUELTAS. Los digitos pegados a letras no son importes: "1v1" son
      // dos unos que no se quedan viejos nunca.
      const cifras = [...guia.matchAll(/(?<![\w])\d[\d.,]*(?![\w])/g)].map((m) => m[0].replace(/[.,]/g, ''));
      const sobran = cifras.filter((c) => Number(c) !== ARRANQUE);
      comprueba(sobran.length === 0,
        `ayuda: la guia escribe cifras que se quedaran viejas (${sobran.join(', ')}); los numeros los cuenta cada comando al usarlo`);
    }

    const { cmdHelp } = require(path.join(R, 'src/commands/social'));
    salidas.length = 0;
    await cmdHelp(sockT, msgT, metaT);
    const menu = salidas.at(-1)?.text || '';

    // LOS PRECIOS DEL MENU SALEN DE PRECIOS, NO ESCRITOS A MANO.
    //
    // Hoy lo hacen (via la funcion c()), y es lo que hay que mantener: el menu
    // es el sitio donde el grupo mira lo que cuesta cada cosa, asi que un
    // numero viejo ahi es peor que en un comentario — lo lee todo el mundo y
    // decide con el. Es la misma enfermedad que ya mintio en el socio, el
    // escudo, el cebo y dos bloques de comentarios.
    {
      const { PRECIOS } = require(path.join(R, 'src/utils/economia'));

      // CADA COMANDO DE PAGO DEL MENU TIENE QUE ENSEÑAR SU PRECIO, Y EL BUENO.
      //
      // Dos intentos anteriores de esto no comprobaban nada. El primero buscaba
      // en social.js un backtick con un numero dentro; el segundo, lo mismo
      // sobre el texto final. Los dos eran tautologicos: la plantilla ES un
      // template literal, asi que un backtick literal la cerraria y el fichero
      // ni compilaria — la unica forma de que salga un numero entre backticks
      // es que lo haya puesto c(), que ya lee de PRECIOS. Buscaban algo que no
      // puede fallar.
      //
      // Lo que si puede fallar, y es lo que el grupo nota, son dos cosas: que un
      // comando de pago se liste SIN precio, o que lo liste con uno que ya no es.
      // Eso es lo que se mira, sobre el texto que se envia.
      const mh2 = fs.readFileSync(path.join(R, 'src/handlers/messageHandler.js'), 'utf8');
      const tabla = mh2.match(/const COBRO_CENTRAL = \{[\s\S]*?\n\};/);
      const clave = {};
      if (tabla) for (const m of tabla[0].matchAll(/([a-zá-úñ0-9]+):\s*'([a-z0-9]+)'/g)) clave[m[1]] = m[2];
      const pct = mh2.match(/const CMDS_PORCENTAJE = \[([\s\S]*?)\];/);
      if (pct) for (const x of pct[1].matchAll(/'([^']+)'/g)) clave[x[1]] = 'percent';
      // COBRO_CENTRAL NO ES TODA LA TABLA. Los que cobran por dentro
      // (COBRAN_SOLOS: !play, !s, !g, !pfp, !fk, !toimg, !tovid, !top5, !top10)
      // no aparecen ahi, y son justo los mas caros del bot. Sin esto la
      // comprobacion se saltaba media lista en silencio — probado quitandole el
      // precio a !pfp: no decia nada.
      for (const k of Object.keys(PRECIOS)) if (!clave[k]) clave[k] = k;
      // Y dos que se teclean distinto de como se llama su precio.
      clave.s = 'sticker';
      clave.g = 'grok';

      // LA REGLA ES "AL MENOS UNA VEZ CON SU PRECIO", no "en cada linea".
      // La primera version pedia el numero en cada linea donde saliera el
      // comando, y acusaba a !play porque tambien aparece en el ejemplo de la
      // cabecera ("ejemplo: *!play* despacito"), donde un precio no pinta nada.
      const mudos = [], mentirosos = [];
      for (const [cmd, k] of Object.entries(clave)) {
        const precio = PRECIOS[k];
        if (precio === undefined) continue;
        const nombre = cmd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (!new RegExp(`\\*!${nombre}\\*`, 'i').test(menu)) continue;   // no se lista: nada que comprobar
        // Los de porcentaje se anuncian UNA vez para los veinticuatro ("25 cada
        // uno") y luego van cuatro lineas de nombres sueltos. Exigir el numero
        // en cada uno seria exigir que el menu lo repita veinticuatro veces,
        // que es justo lo que lo hace ilegible.
        if (k === 'percent') {
          if (!new RegExp(`\\b${precio}\\b`).test(menu)) mudos.push(`!${cmd} (cuesta ${precio})`);
          continue;
        }
        const junto = menu.match(new RegExp(`\\*!${nombre}\\*\\s*\`(\\d+)\``, 'i'));
        if (!junto) mudos.push(`!${cmd} (cuesta ${precio})`);
        else if (Number(junto[1]) !== precio) mentirosos.push(`!${cmd} dice ${junto[1]} y cuesta ${precio}`);
      }
      comprueba(mudos.length === 0,
        `menu: comandos de pago listados sin precio: ${mudos.join(', ')}`);
      comprueba(mentirosos.length === 0,
        `menu: comandos con un precio que ya no es el suyo: ${mentirosos.join(', ')}`);
    }

    // Y el menu no puede prometer de la guia algo que la guia ya no es: decia
    // "el aura entera explicada, con todos sus modos" cuando la guia son quince
    // lineas de puertas. Quien lea eso la abre esperando un manual.
    comprueba(!/entera explicada|todos sus modos/.test(menu),
      'menu: sigue anunciando la guia como un manual completo, y ya no lo es');

    for (const [nombre, texto] of [['la guia', guia], ['el menu', menu]]) {
      const citados = [...new Set([...texto.matchAll(/!([a-zá-úñ0-9]+)/gi)].map((m) => m[1].toLowerCase()))];
      const rotos = citados.filter((c) => !existen.has(c));
      comprueba(rotos.length === 0,
        `ayuda: ${nombre} anuncia comandos que no existen: ${rotos.join(', ')}`);
    }
  }

  // *!top 10 <tema>* TIENE QUE SER *!top10 <tema>*.
  //
  // Alguien escribio "!top 10 que cojen bien piola" y le salio el RANKING DE
  // AURA. 'top' cae en el case del aura y los args se tiraban enteros, asi que
  // el numero y el tema desaparecian. Quien lo escribe no tiene forma de saber
  // que el espacio importa — son el mismo comando escrito de las dos maneras
  // naturales.
  //
  // Se comprueba sobre el DISPATCHER, que es donde estaba el fallo: importa
  // adonde ROUTA cada forma, no que el comando exista.
  {
    const mh = fs.readFileSync(path.join(R, 'src/handlers/messageHandler.js'), 'utf8');
    // SIN COMENTARIOS. La primera version leia el bloque tal cual, y el
    // comentario que hay ahi dentro NOMBRA cmdTopRandom para explicar por que
    // *!top 10* a secas no se desvia. O sea que al borrar el codigo la
    // comprobacion seguia pasando: se daba por satisfecha leyendo la prosa que
    // explica el arreglo en vez del arreglo. Ya me paso con el guardia de `msg`.
    const sinComentarios = mh.replace(/\/\/[^\n]*/g, '');
    const bloque = sinComentarios.match(/case 'ranking':\s*case 'top':([\s\S]*?)case 'hoy':/);
    comprueba(!!bloque && /cmdTopRandom/.test(bloque[1]),
      'dispatcher: *!top 10 <tema>* vuelve a caer en el ranking de aura en vez del sorteo');
    // Y solo CON tema: *!top 10* a secas es la forma natural de pedir el aura, y
    // cmdTopRandom se calla sin asunto, asi que desviarlo seria dejarlo mudo.
    comprueba(!!bloque && /args\.length > 1/.test(bloque[1]),
      'dispatcher: *!top 10* sin tema tiene que seguir dando el ranking de aura, no silencio');
  }

  // NINGUN ALIAS PUEDE ESTAR DOS VECES EN EL SWITCH, y esto lo aprendi por las
  // malas: *!atraco* estaba en la rama de !robo y en la suya, y en JS gana el
  // primer case. Resultado: el comando se anunciaba en el menu y en la guia, y
  // contestaba "Dime a quien robas". Dos dias asi.
  //
  // Mi comprobacion de textos no lo caza y no puede: verifica que el comando
  // EXISTA como case, y existia. Verificar existencia no es verificar destino.
  {
    const mh = fs.readFileSync(path.join(R, 'src/handlers/messageHandler.js'), 'utf8');
    const vistos = new Map();
    const dobles = [];
    for (const m of mh.matchAll(/case '([^']+)':/g)) {
      if (vistos.has(m[1])) dobles.push(m[1]);
      else vistos.set(m[1], true);
    }
    comprueba(dobles.length === 0,
      `dispatcher: alias duplicados en el switch (gana el primero y el segundo queda muerto): ${dobles.join(', ')}`);
  }

  // Y EL COBRO TIENE QUE CUADRAR CON EL SWITCH, en las dos direcciones:
  //
  //  · una clave de precio sin case cobra por un comando que no existe — le paso
  //    a !coach, que se llevaba 30 y contestaba "no existe";
  //  · un alias fuera de la tabla sale GRATIS mientras su canonico cobra, que es
  //    lo que pasaba con !quemar, !destruir, !muertos, !texto e !importancia.
  {
    const mh = fs.readFileSync(path.join(R, 'src/handlers/messageHandler.js'), 'utf8');
    const cases = new Set([...mh.matchAll(/case '([^']+)':/g)].map((m) => m[1]));
    const tabla = mh.match(/const COBRO_CENTRAL = \{[\s\S]*?\n\};/);
    const claves = tabla ? [...tabla[0].matchAll(/([a-zá-úñ0-9]+):\s*'[a-z0-9]+'/g)].map((x) => x[1]) : [];
    // Los de porcentaje NO estan en el literal: se meten con un bucle sobre
    // CMDS_PORCENTAJE. Sin esto la comprobacion acusaba a fiel e infiel de salir
    // gratis cuando cobran perfectamente — un falso positivo que habria mandado
    // a alguien a "arreglar" algo que funciona.
    const pct = mh.match(/const CMDS_PORCENTAJE = \[([\s\S]*?)\];/);
    if (pct) for (const x of pct[1].matchAll(/'([^']+)'/g)) claves.push(x[1]);
    const huerfanos = claves.filter((c) => !cases.has(c));
    comprueba(huerfanos.length === 0,
      `cobro: se cobra por comandos que no existen: ${huerfanos.join(', ')}`);

    // Alias gratis: se agrupan los case consecutivos que llaman al mismo
    // handler; si UNO de ellos cobra, todos tienen que cobrar.
    const grupos = [...mh.matchAll(/((?:\s*case '[^']+':[^\n]*\n)+)\s*await (cmd[A-Za-z]+)\(/g)];
    const sueltos = [];
    for (const g of grupos) {
      const alias = [...g[1].matchAll(/case '([^']+)'/g)].map((x) => x[1]);
      const conCobro = alias.filter((a) => claves.includes(a));
      if (conCobro.length && conCobro.length !== alias.length) {
        sueltos.push(...alias.filter((a) => !claves.includes(a)));
      }
    }
    comprueba(sueltos.length === 0,
      `cobro: alias gratis mientras su hermano cobra por el mismo trabajo: ${sueltos.join(', ')}`);

    // LA MISMA COMPROBACION PARA LAS OTRAS DOS LISTAS A MANO.
    //
    // Este es el fallo de fondo del fichero y merece decirse claro: el alias, el
    // precio, el permiso y la ayuda de cada comando viven en CUATRO listas
    // separadas que se mantienen a mano. Nada obliga a que cuadren, asi que se
    // desincronizan solas y en silencio — el historial de comentarios de
    // COBRO_CENTRAL y NEEDS_META es literalmente la lista de las veces que ya
    // paso: !quemar gratis mientras !roast cobraba, !piropo y !wingman cobrando
    // sin metadata (y por tanto cobrandole al owner), los alias en español de
    // !play igual, !coach cobrando por un comando inexistente.
    //
    // La solucion de verdad es una sola tabla por comando de la que salgan las
    // cuatro cosas. Eso es una reescritura del dispatcher y no se hace a ciegas
    // sobre un bot en produccion. Lo que si se puede hacer hoy, y es lo que
    // impide que el problema siga creciendo, es que la desincronizacion deje de
    // ser silenciosa: si un alias entra en una lista y sus hermanos no, aqui
    // salta.
    for (const [nombre, re] of [['NEEDS_META', /const NEEDS_META = new Set\(\[([\s\S]*?)\]\);/],
                                ['COBRAN_SOLOS', /const COBRAN_SOLOS = new Set\(\[([\s\S]*?)\]\);/]]) {
      const m = mh.match(re);
      if (!m) { comprueba(false, `no encuentro la lista ${nombre}`); continue; }
      const dentro = new Set([...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
      const rotos = [];
      for (const g of grupos) {
        const alias = [...g[1].matchAll(/case '([^']+)'/g)].map((x) => x[1]);
        // COBRAN_SOLOS solo se consulta cuando el comando tiene precio en
        // COBRO_CENTRAL, asi que un alias fuera de la lista solo hace daño —
        // cobro doble— si ademas cobra. Sin este filtro la comprobacion acusaba
        // a los alias de !play, que cobran por dentro y no estan en la tabla de
        // precios: no se les cobra dos veces porque no se les cobra fuera.
        const pertinentes = nombre === 'COBRAN_SOLOS'
          ? alias.filter((a) => claves.includes(a))
          : alias;
        if (!pertinentes.length) continue;
        const hay = pertinentes.filter((a) => dentro.has(a));
        if (hay.length && hay.length !== pertinentes.length) {
          rotos.push(`${pertinentes.filter((a) => !dentro.has(a)).join('/')} (sus hermanos ${hay.join('/')} si estan)`);
        }
      }
      comprueba(rotos.length === 0,
        `${nombre}: alias descolgados de sus hermanos: ${rotos.join('; ')}`);
    }
  }

  // EL COOLDOWN DE !aura top. Cuatro reglas que ya se rompieron una vez cada una
  // y que desde fuera no se ven: el bot contesta, solo contesta lo que no toca.
  //
  // Se usa el STORE DE VERDAD y no un doble. La primera version sustituia
  // getAuraRanking en el modulo... y no servia de nada: aura.js lo desestructura
  // al importarse, asi que se queda con la referencia original y reemplazar la
  // propiedad despues no la alcanza. Los tres fallos que dio fueron de eso, no
  // del bot. Con el store real no hay nada que fingir.
  {
    const st = require(path.join(R, 'src/utils/auraStore'));
    const ahoraReal = Date.now;
    const GT = '000000001@g.us';                  // grupo de pruebas, se borra al final
    const A = '34600000011@s.whatsapp.net';
    const B = '34600000012@s.whatsapp.net';
    const C = '34600000013@s.whatsapp.net';
    const mt = { id: GT, participants: [A, B, C].map(id => ({ id })) };
    const outs = [];
    const sk = { sendMessage: async (j, c) => { outs.push(c); return {}; } };
    const { cmdAura: ca } = require(path.join(R, 'src/commands/aura'));
    const top = async (q) => {
      outs.length = 0;
      await ca(sk, { key: { remoteJid: GT, participant: q, fromMe: false, id: 'X' },
                     message: { conversation: '!aura top' }, pushName: 'x' }, ['top'], mt);
      return outs.at(-1) || {};
    };
    const publica = (c) => /^\*RANKING DE AURA\*/.test(c.text || '');

    // *!saldo* Y *!miaura* TIENEN QUE ENSEÑAR EL SALDO Y NO JUGARLO.
    //
    // Estaban enchufados a *!aura hoy*, que enseña mensajes del dia y racha:
    // dos comandos llamados "saldo" que no enseñaban ningun saldo. Y el otro
    // riesgo del arreglo es el contrario — que la consulta acabe cayendo en la
    // TIRADA, porque *!aura* a secas se juega el aura. Se comprueban las dos.
    try {
      await st.resetAura(GT);
      await st.addAura(GT, A, 777);
      const antes = await st.getAura(GT, A);
      for (const sub of ['saldo', 'miaura']) {
        outs.length = 0;
        await ca(sk, { key: { remoteJid: GT, participant: A, fromMe: false, id: 'X' },
                       message: { conversation: `!${sub}` }, pushName: 'x' }, [sub], mt);
        const t = (outs.at(-1) || {}).text || '';
        comprueba(new RegExp(`\\b${antes}\\b`).test(t.replace(/[.,]/g, '')),
          `!${sub}: tiene que enseñar el saldo (${antes}) y sale "${t.slice(0, 60)}"`);
        comprueba(!/mensajes|racha/i.test(t), `!${sub}: sigue enseñando el informe del dia en vez del saldo`);
      }
      comprueba(await st.getAura(GT, A) === antes, '!saldo/!miaura: consultar el saldo no puede jugarlo');
    } catch (e) { fallos++; console.log(rojo(`   ✗ !saldo revento: ${e.message}`)); }

    try {
      await st.resetAura(GT);
      const suelo = await st.getAura(GT, A);
      await st.addAura(GT, A, 900 - suelo);
      await st.addAura(GT, B, 800 - suelo);

      const primera = await top(A);
      comprueba(publica(primera), 'aura top: la primera peticion publica el ranking');

      // 1. Es de GRUPO: le rebota a otra persona distinta de quien lo pidio.
      const aOtro = await top(B);
      comprueba(/Vuelve en/.test(aOtro.text || ''),
        'aura top: el cooldown es de grupo — al segundo que lo pida tambien le rebota');

      // 2. La copia va SIN menciones. Es lo unico que separa enseñar la tabla de
      //    volver a notificar a los diez, que era el motivo de todo esto.
      comprueba((aOtro.mentions || []).length === 0,
        'aura top: la copia en gris no menciona a nadie (si menciona, vuelve a sonar el telefono de los diez)');

      // 3. La copia esta CONGELADA: cambia el ranking por debajo y sigue
      //    enseñando el que se vio, no el nuevo.
      // Se mueve a B, que YA esta en el ranking. Tocar a C lo metia dentro y
      // cambiaba la huella, asi que el "no ha cambiado" de abajo no podia darse
      // nunca: el fallo era del arnes, no del bot.
      await st.addAura(GT, B, 4200);             // B pasa a 5.000 y adelanta a A
      const congelada = await top(A);
      comprueba(/900/.test(congelada.text || '') && !/5\.?000/.test(congelada.text || ''),
        'aura top: durante el cooldown se enseña el top CONGELADO, no uno recalculado');

      // 4. Un "no ha cambiado" NO reinicia el reloj. Si lo reiniciara, alguien
      //    pidiendolo cada dos horas y media mantendria el ranking escondido
      //    para siempre sin proponerselo. Fue un bug real.
      await st.addAura(GT, B, -4200);            // se deja el top exactamente como estaba
      let salto = 3 * 60 * 60 * 1000 + 1000;
      Date.now = () => ahoraReal() + salto;
      const igual = await top(A);
      comprueba(/no ha cambiado/i.test(igual.text || ''),
        'aura top: con el mismo top de antes, avisa en vez de repetirlo');
      await st.addAura(GT, B, 6200);             // ahora si cambia, y sin pasar mas tiempo
      comprueba(publica(await top(A)),
        'aura top: un "no ha cambiado" no reinicia las 3 h (si las reinicia, el top se puede esconder indefinidamente)');
    } finally {
      Date.now = ahoraReal;
      await st.resetAura(GT);
    }
  }

  const aura = require(path.join(R, 'src/utils/auraStore'));
  const inicial = await aura.getAura(G, U);
  comprueba(inicial >= 150, `aura: un usuario nuevo arranca en el suelo (dio ${inicial})`);

  await aura.addAura(G, U, 100);
  comprueba(await aura.getAura(G, U) === inicial + 100, 'aura: sumar acredita la cantidad exacta');

  await aura.spendAura(G, U, 50);
  comprueba(await aura.getAura(G, U) === inicial + 50, 'aura: gastar descuenta la cantidad exacta');

  const caro = await aura.spendAura(G, U, 99999999);
  comprueba(!caro.ok, 'aura: no se puede gastar lo que no se tiene');
  comprueba(await aura.getAura(G, U) === inicial + 50, 'aura: un gasto rechazado no toca el saldo');

  // La cola de escritura existe justo para esto: sin ella dos comandos a la vez
  // leen el mismo saldo y uno de los dos incrementos se pierde.
  const antes = await aura.getAura(G, U);
  await Promise.all(Array.from({ length: 20 }, () => aura.addAura(G, U, 10)));
  comprueba(await aura.getAura(G, U) === antes + 200, 'aura: 20 sumas simultaneas no se pisan');

  const a1 = await aura.getAura(G, U), b1 = await aura.getAura(G, V);
  await aura.transferAura(G, U, V, 120);
  const a2 = await aura.getAura(G, U), b2 = await aura.getAura(G, V);
  comprueba(a1 - a2 === 120 && b2 - b1 === 120, 'aura: transferir conserva el total');

  // casinoStore: el contador del que depende TIRADAS_PAGADAS para frenar la
  // inflacion. Se llama DOS veces a proposito: el fallo que se encontro solo
  // aparecia en la primerisima llamada de un grupo.
  const casino = require(path.join(R, 'src/utils/casinoStore'));
  const t1 = await casino.contarTirada(G, U);
  const t2 = await casino.contarTirada(G, U);
  comprueba(t2 === t1 + 1, 'casino: la tirada del dia se cuenta, tambien la primera del grupo');

  const racha = require(path.join(R, 'src/utils/rachaStore'));
  await racha.anotarMensaje(G, U);
  const r = await racha.verRacha(G, U);
  comprueba(r && r.msgs >= 1, 'racha: el mensaje del dia queda anotado');

  const cont = require(path.join(R, 'src/utils/messageCounter'));
  const n0 = await cont.getUserCount(G, U);
  await cont.increment(G, U);
  comprueba(await cont.getUserCount(G, U) === n0 + 1, 'contador: incrementar suma uno');

  // OJO A LA FIRMA: la banlist es GLOBAL, no por grupo, y recibe un array con
  // las formas del JID (telefono y @lid), no un jid suelto.
  const ban = require(path.join(R, 'src/utils/banlist'));
  await ban.banAccount([V], 'prueba de check', 'check');
  comprueba(!!(await ban.isBanned([V])), 'banlist: banear marca la cuenta');
  await ban.unbanAccount([V]);
  comprueba(!(await ban.isBanned([V])), 'banlist: desbanear la desmarca');

  // Y que lo de memoria llegue al disco igual: es lo que sobrevive al reinicio.
  const saldo = await aura.getAura(G, U);
  await aura.flushAura();
  const disco = JSON.parse(fs.readFileSync(path.join(R, 'data/aura.json'), 'utf8'));
  const fila = disco[G] && Object.values(disco[G]).includes(saldo);
  comprueba(!!fila, 'persistencia: el saldo guardado coincide con el de memoria');

  // Vaciar los guardados pendientes ANTES de restaurar. Cada store guarda con un
  // temporizador de unos segundos, asi que sin esto la restauracion corre
  // primero y las escrituras pendientes vuelven a crear los ficheros justo
  // despues, dejando data/ sucio igualmente.
  //
  // Cada flush ademas cancela su propio temporizador, que es lo que garantiza
  // que despues de esta linea ya no escribe nadie.
  for (const [mod, fn] of [
    ['auraStore', 'flushAura'], ['casinoStore', 'flushCasino'], ['rachaStore', 'flushRacha'],
    ['messageCounter', 'flushCounts'], ['banlist', 'flushBanlist'], ['nickStore', 'flushNicks'],
  ]) {
    try { await require(path.join(R, 'src/utils/' + mod))[fn](); } catch {}
  }

  if (!fallos) console.log(verde('   ✓ aura, casino, racha, contador y banlist se comportan'));
}

(async () => {
  for (const c of comandos) {
    for (let i = 0; i < TIRADAS; i++) {
      try {
        await percent[c](sock, msg, groupMeta);
      } catch (e) {
        fallos++;
        console.log(rojo(`   ✗ ${c} lanzó: ${e.message.split('\n')[0]}`));
        break;
      }
    }
  }
  const antesDeOtros = fallos;
  let cubiertos = comandos.length;
  for (const [nombre, cargar, forma] of OTROS) {
    let fn;
    try { fn = cargar(); } catch (e) {
      fallos++; console.log(rojo(`   ✗ ${nombre} no carga: ${e.message.split('\n')[0]}`)); continue;
    }
    if (typeof fn !== 'function') continue;
    cubiertos++;
    for (let i = 0; i < TIRADAS; i++) {
      try {
        if (forma === 'solo')      await fn(sock, msgSolo(i), [], groupMeta);
        else if (forma === 'args') await fn(sock, msgCon, [], groupMeta);
        else                       await fn(sock, msgCon, groupMeta);
      } catch (e) {
        fallos++;
        console.log(rojo(`   ✗ ${nombre} lanzó: ${e.message.split('\n')[0]}`));
        break;
      }
    }
  }
  if (fallos === antesDeOtros && !antesDeOtros) {
    console.log(verde(`   ✓ ${cubiertos} comandos × ${TIRADAS} tiradas = ${mensajes} mensajes, todos limpios`));
  }

  const ficherosAntes = new Set((() => { try { return fs.readdirSync(DATA); } catch { return []; } })());
  const respaldo = copiaSeguridad();

  // La restauracion se registra ADEMAS como manejador de salida, y a proposito
  // aqui abajo y no arriba: los manejadores corren en orden de registro, y el de
  // helpers.js —que vuelca la ventana anti-repeticion al salir— ya esta puesto
  // desde que se importo el modulo. Registrando este despues, el ultimo en tocar
  // data/ es el que la deja como estaba.
  process.on('exit', () => restaurar(respaldo, ficherosAntes));

  // LOS AVISOS DE ESTA CAPA SON DE LOS DATOS DE PRUEBA, NO DEL BOT.
  //
  // capaStores() monta un ranking con JIDs inventados (34600000011@...) que
  // logicamente no tienen pushName, asi que el aviso legitimo de aura.js —"2 de
  // 2 del top sin nombre todavia"— saltaba dos veces en cada `npm run update`,
  // en amarillo y con pinta de problema. No lo es: es el validador
  // denunciandose a si mismo.
  //
  // No se tiran: se cuentan y se dicen en una linea. Un aviso escondido es peor
  // que uno ruidoso, y si algun dia salen veinte en vez de dos, eso si hay que
  // verlo.
  const logger = require(path.join(R, 'src/utils/logger'));
  const avisosReales = logger.warn;
  const capturados = [];
  logger.warn = (m) => { capturados.push(String(m)); };
  try { await capaStores(); }
  catch (e) { fallos++; console.log(rojo(`   ✗ los stores lanzaron: ${e.message.split('\n')[0]}`)); }
  finally {
    logger.warn = avisosReales;
    restaurar(respaldo, ficherosAntes);
  }
  if (capturados.length) {
    console.log(`   ${capturados.length} aviso(s) de los datos de prueba (JIDs inventados sin nombre), no del bot`);
  }

  // ── 5. LOS COBROS DE AURA NO PUEDEN VOLVER A SER UNA CARRERA ──────────────
  //
  // El patron prohibido es leer el saldo, hacer awaits por el medio y cobrar con
  // la cifra leida: entre la lectura y el cobro cualquiera puede gastar y la
  // resta deja a la persona en negativo. Se arreglo cinco veces en robo.js y se
  // vigila aqui porque es facil de reintroducir sin darse cuenta: leer y restar
  // por separado parece del todo inocente.
  //
  // Lo correcto es drainAura/spendAura/transferAura, que leen y restan dentro
  // del mismo bloque serializado.
  console.log('\n5. NADIE ACABA EN NEGATIVO');
  {
    let sucios = 0;
    const RESTA = /addAura\(\s*[^,]+,\s*[^,]+,\s*-/;
    for (const f of ficheros.filter((x) => x.startsWith(path.join(R, "src")))) {
      if (f.endsWith('auraStore.js')) continue;   // aqui vive el arreglo, no el fallo
      // Se quitan los comentarios: si no, la cabecera que explica el antipatron
      // se denuncia a si misma.
      const src = fs.readFileSync(f, 'utf8')
        .split('\n').map((l) => l.replace(/^\s*\/\/.*$/, '')).join('\n');
      const lineas = src.split('\n');
      lineas.forEach((l, i) => {
        if (!RESTA.test(l)) return;
        // Una resta suelta vale; lo que no vale es que el importe venga de un
        // Math.min contra un getAura leido antes.
        const antes = lineas.slice(Math.max(0, i - 12), i).join('\n');
        if (/await getAura\(/.test(antes) && /Math\.min\(/.test(antes)) {
          sucios++;
          console.log(rojo(`   ✗ ${path.relative(R, f)}:${i + 1} lee el saldo y lo resta despues; usa drainAura`));
        }
      });
    }
    if (sucios) fallos += sucios;
    else console.log(verde('   ✓ ningun cobro lee el saldo y lo resta mas tarde'));
  }

  // ── 6. LOS COMANDOS DE PAGO NO SALEN GRATIS POR PRIVADO ───────────────────
  {
    const mh = fs.readFileSync(path.join(R, "src/handlers/messageHandler.js"), 'utf8');
    if (/!jid\.endsWith\('@g\.us'\) && conceptoCobro/.test(mh)) {
      console.log(verde('   ✓ los comandos de pago no se sirven gratis por privado'));
    } else {
      fallos++;
      console.log(rojo('   ✗ falta la guarda de privado: los comandos de pago vuelven a ser gratis en DM'));
    }
  }

  // ── EL ANTILINK NO PUEDE TENER HUECOS ─────────────────────────────────────
  //
  // Se colaron enlaces de invitacion en un grupo con el antilink encendido, y el
  // detector de texto era correcto. El agujero estaba un nivel mas arriba:
  // clasificarMensaje miraba el sobre PLANO, asi que cualquier mensaje anidado
  // pasaba sin que viera una letra.
  //
  // El peor caso es ephemeralMessage: si un grupo tiene los MENSAJES TEMPORALES
  // activados —normalisimo, y no lo controla quien escribe— TODOS los mensajes
  // llegan envueltos. En un grupo asi el antilink no fallaba de vez en cuando:
  // no funcionaba en absoluto. Y no habia forma de verlo leyendo el detector,
  // porque el detector estaba bien.
  //
  // De ocho formas de anidar, siete se colaban. Esto las fija.
  console.log('\n8. EL ANTILINK VE TODAS LAS FORMAS DE MANDAR UN ENLACE');
  {
    const { clasificarMensaje } = require(path.join(R, 'src/handlers/messageHandler'));
    const L = 'https://chat.whatsapp.com/ABCdef1234567890';
    const INV = { groupInviteMessage: { groupJid: 'X@g.us', inviteCode: 'A' } };
    const casos = [
      // ── invitaciones: expulsion directa y NO las salva ningun permiso ──
      ['texto plano',                 { conversation: L }, 'invite'],
      ['mensajes temporales',         { ephemeralMessage: { message: { conversation: L } } }, 'invite'],
      ['ver una vez v1',              { viewOnceMessage: { message: { imageMessage: { caption: L } } } }, 'invite'],
      ['ver una vez v2',              { viewOnceMessageV2: { message: { imageMessage: { caption: L } } } }, 'invite'],
      ['documento con caption',       { documentWithCaptionMessage: { message: { documentMessage: { caption: L } } } }, 'invite'],
      ['editado (envuelto)',          { editedMessage: { message: { protocolMessage: { editedMessage: { conversation: L } } } } }, 'invite'],
      ['editado (forma de Baileys)',  { protocolMessage: { type: 14, key: { id: 'ORIG' }, editedMessage: { conversation: L } } }, 'invite'],
      ['invitacion nativa',           INV, 'invite'],
      ['invitacion dentro de temporal', { ephemeralMessage: { message: INV } }, 'invite'],
      ['temporal + ver una vez',      { ephemeralMessage: { message: { viewOnceMessageV2: { message: { imageMessage: { caption: L } } } } } }, 'invite'],
      ['dominio sin ruta',            { conversation: 'entrad a chat.whatsapp.com' }, 'invite'],
      ['codigo en la linea de abajo', { conversation: 'chat.whatsapp.com/\nABCdef123' }, 'invite'],
      ['espacios en los puntos',      { conversation: 'chat . whatsapp . com/ABC123' }, 'invite'],
      ['punto falso',                 { conversation: 'chat·whatsapp·com/ABC123' }, 'invite'],
      ['invisible en medio',          { conversation: 'chat.what​sapp.com/ABC123' }, 'invite'],
      ['telegram',                    { conversation: 'https://t.me/loquesea' }, 'invite'],
      ['discord sin esquema',         { conversation: 'entrad a discord.gg/abc123' }, 'invite'],

      // ── superficies donde WhatsApp esconde la URL. El texto visible es
      //    inofensivo y el enlace viaja en otra parte del sobre.
      ['boton CTA (nativeFlow)',      { interactiveMessage: { body: { text: 'hola' }, nativeFlowMessage: { buttons: [{ buttonParamsJson: JSON.stringify({ display_text: 'Abrir', url: L }) }] } } }, 'invite'],
      ['tarjeta de preview',          { extendedTextMessage: { text: 'hola', contextInfo: { externalAdReply: { title: 'x', sourceUrl: L } } } }, 'invite'],
      ['boton con url',               { buttonsMessage: { contentText: 'hola', buttons: [{ urlButton: { url: L } }] } }, 'invite'],
      ['ubicacion',                   { locationMessage: { url: L } }, 'invite'],
      ['album',                       { albumMessage: { caption: L } }, 'invite'],

      // ── otros enlaces: se expulsa igual, PERO el !allow y el pase valen.
      //    Si esto se mezcla con las invitaciones, *!allow* vuelve a mentir.
      ['un Drive es blocked',         { conversation: 'https://drive.google.com/file/x' }, 'blocked'],
      ['una web es blocked',          { conversation: 'https://elpais.com/x' }, 'blocked'],
      ['un acortador es blocked',     { conversation: 'https://bit.ly/3xyz' }, 'blocked'],

      // ── y lo que NO debe tocarse, que importa igual: un antilink que
      //    expulsa por hablar no dura en un grupo.
      ['conversacion normal',         { conversation: 'te lo mando por whatsapp luego' }, 'none'],
      ['hablando del grupo',          { conversation: 'este grupo de whatsapp esta muerto' }, 'none'],
      ['frase con puntos',            { conversation: 'vale. venga. hasta luego' }, 'none'],
      ['youtube con ruta',            { conversation: 'https://youtube.com/watch?v=x' }, 'whitelisted'],
    ];
    let huecos = 0;
    for (const [etq, sobre, esperado] of casos) {
      let real;
      try { real = clasificarMensaje(sobre); } catch (e) { real = 'revienta: ' + e.message; }
      if (real !== esperado) {
        huecos++;
        console.log(rojo(`   ✗ ${etq}: esperaba ${esperado} y da ${real}`));
      }
    }
    if (huecos) fallos += huecos;
    else console.log(verde(`   ✓ las ${casos.length} formas se clasifican bien`));
  }

  // ── EL GUARDIA NO PUEDE ENSUCIAR MAS QUE EL SPAM ──────────────────────────
  //
  // Medido con rafagas antes de ponerle freno: diez invitaciones seguidas
  // producian DIEZ mensajes del bot. El que viene a hacer ruido manda diez
  // lineas y el bot le pone otras diez encima. Y con alguien a quien no puede
  // expulsar —el bot dejo de ser admin a mitad— era infinito: se queda dentro y
  // cada mensaje suyo genera otro anuncio.
  //
  // La regla es "moderar siempre, anunciar una vez". Aqui se vigila que el
  // freno siga puesto, porque quitarlo no rompe nada visible en las pruebas
  // normales: solo hace al bot insoportable en el unico momento en que importa.
  console.log('\n10. EL GUARDIA NO INUNDA EL CHAT');
  {
    const mh = fs.readFileSync(path.join(R, 'src/handlers/messageHandler.js'), 'utf8')
      .split('\n').map((l) => l.replace(/^\s*\/\/.*$/, '')).join('\n');
    const exige = (cond, queja) => { if (cond) return; fallos++; console.log(rojo(`   ✗ ${queja}`)); };

    exige(/function puedeAnunciar\(/.test(mh),
      'desaparecio el freno de anuncios: una rafaga de enlaces duplica el ruido en el grupo');
    // Los tres anuncios de moderacion tienen que pasar por el.
    for (const [etq, re] of [
      ['la expulsion por enlace', /puedeAnunciar\(jid, sender\)\) \{\s*\n\s*sock\.sendMessage\(jid, \{\s*\n\s*text: fuera/],
      ['el ban por enlaces',      /if \(puedeAnunciar\(jid, sender\)\) sock\.sendMessage\(jid, \{/],
      ['el aviso de antiempresa', /if \(puedeAnunciar\(jid, sender\)\) \{\s*\n\s*sock\.sendMessage\(jid, \{\s*\n\s*text: `\*Anti-empresa:/],
    ]) {
      exige(re.test(mh), `${etq} anuncia sin pasar por el freno: una rafaga inunda el grupo`);
    }
    // Y el ultimo aviso antes del ban, que salta el freno a proposito, tiene
    // que llevar el suyo propio: al banear se resetean los avisos, asi que sin
    // tope volvia a saltarselo cada tres enlaces, para siempre.
    exige(/restantes === 1 && puedeAnunciar\(jid, sender, 60_000\)/.test(mh),
      'el ultimo aviso vuelve a saltarse el freno sin tope: con alguien inexpulsable se repite en bucle');
    if (!fallos) console.log(verde('   ✓ los anuncios de moderacion llevan freno (la accion no)'));
  }

  // ── ANTIEMPRESA: LA PRUEBA, Y QUE LOS DOS ESCANEOS VEAN LO MISMO ──────────
  //
  // Este modo no tenia UN SOLO test, y decide expulsiones. Un
  // getBusinessProfile que devolviera `{ wid }` en vez de un perfil real —o al
  // reves— se romperia en silencio y nadie se enteraria hasta que empezara a
  // echar gente, o hasta que dejara de echar a nadie.
  console.log('\n9. ANTIEMPRESA');
  {
    const { businessEvidence, clearBusinessCache } = require(path.join(R, 'src/utils/businessCheck'));
    const exige = (cond, queja) => { if (cond) return; fallos++; console.log(rojo(`   ✗ ${queja}`)); };
    const sockDe = (perfil) => ({ getBusinessProfile: async () => perfil });

    // TRES ESTADOS, Y EL QUE IMPORTA ES EL TERCERO. Antes esto era un booleano
    // y "no he podido comprobarlo" salia como "es una cuenta personal". Para un
    // modo cuyo trabajo es echar suplantadores, tratar la ignorancia como
    // inocencia no es prudencia: es la puerta.
    const casos = [
      ['solo wid es cuenta normal',   { wid: 'x' }, 'personal'],
      ['objeto vacio',                {}, 'personal'],
      ['con categoria',               { wid: 'x', category: 'Tienda' }, 'biz'],
      ['con email',                   { wid: 'x', email: 'a@b.com' }, 'biz'],
      ['con web',                     { wid: 'x', website: ['http://x.com'] }, 'biz'],
      ['con descripcion',             { wid: 'x', description: 'vendemos cosas' }, 'biz'],
      ['campos vacios no cuentan',    { wid: 'x', category: '', email: '', description: '   ' }, 'personal'],
      // El suplantador: Business con la ficha en blanco a proposito.
      ['ficha vacia pero con portada',{ wid: 'x', cover_photo: 'a.jpg' }, 'biz'],
      ['ficha vacia con opciones',    { wid: 'x', profile_options: { cart_enabled: true } }, 'biz'],
      ['horario con entradas',        { wid: 'x', business_hours: { business_config: [{ day: 'mon' }] } }, 'biz'],
      // LOS FALSOS POSITIVOS QUE CASI ME COMO. En JavaScript `{}` es verdadero,
      // asi que una comprobacion `if (profile[campo])` marcaba como negocio a
      // una cuenta NORMAL que trajera un business_hours o un profile_options
      // vacios. Tres casos medidos, y expulsan gente de verdad. Existir no es
      // tener contenido.
      ['horario vacio NO es negocio', { wid: 'x', business_hours: {} }, 'personal'],
      ['config vacio NO es negocio',  { wid: 'x', business_hours: { business_config: [] } }, 'personal'],
      ['opciones vacias NO son negocio', { wid: 'x', profile_options: {} }, 'personal'],
      ['comercio vacio NO es negocio',{ wid: 'x', commerce_experience: {} }, 'personal'],
      ['portada vacia NO es negocio', { wid: 'x', cover_photo: '' }, 'personal'],
      // Y lo que NO se sabe.
      ['la consulta no responde',     undefined, 'desconocido'],
      ['devuelve algo que no es objeto', 'nada', 'desconocido'],
    ];
    let mal = 0;
    for (const [etq, perfil, esperado] of casos) {
      // El resultado se cachea por JID. Sin limpiar entre casos, el primero
      // dejaba un 'personal' guardado y los demas lo leian en vez de consultar.
      clearBusinessCache();
      let ev;
      try { ev = await businessEvidence(sockDe(perfil), '34600000000@s.whatsapp.net'); }
      catch (e) { ev = { estado: 'revienta: ' + e.message }; }
      if (ev.estado !== esperado) {
        mal++;
        console.log(rojo(`   ✗ ${etq}: esperaba ${esperado} y da ${ev.estado}`));
      }
    }
    // Un @lid no admite la consulta. Eso es 'desconocido', NUNCA 'personal':
    // era la puerta principal del suplantador con el numero oculto.
    clearBusinessCache();
    const evLid = await businessEvidence(sockDe({ wid: 'x' }), '123@lid');
    if (evLid.estado !== 'desconocido') {
      mal++;
      console.log(rojo(`   ✗ un @lid da ${evLid.estado} y tiene que dar desconocido: sin telefono no se sabe, no es que sea personal`));
    }
    if (mal) fallos += mal;
    else console.log(verde(`   ✓ la prueba distingue negocio, personal y desconocido (${casos.length + 1} casos)`));

    const scanSrc = fs.readFileSync(path.join(R, 'src/commands/scan.js'), 'utf8');
    const grpSrc  = fs.readFileSync(path.join(R, 'src/commands/group.js'), 'utf8');
    const botSrc  = fs.readFileSync(path.join(R, 'src/bot.js'), 'utf8');
    const mhSrc   = fs.readFileSync(path.join(R, 'src/handlers/messageHandler.js'), 'utf8');

    // Los tres caminos —entrada, !scan y !antiempresa scan— tienen que mirar la
    // misma evidencia. Si uno se queda solo con el perfil, el mismo grupo da
    // dos listas y el purge expulsa la de otro.
    exige(/getMemberFacts/.test(scanSrc), '!scan dejo de mirar el hecho observado: dara una lista distinta que *!antiempresa scan*');
    exige(/getMemberFacts/.test(grpSrc),  '*!antiempresa scan* dejo de mirar el hecho observado');
    exige(/getMemberFacts/.test(botSrc),  'la entrada al grupo no mira el hecho observado: una Business ya fichada entra por la puerta');

    // La guarda de mensajes no puede volver a exigir el badge. El suplantador
    // no lo lleva NUNCA: si esa es la unica puerta, el modo esta apagado justo
    // contra quien se quiere echar.
    exige(/getMemberFacts\(\[sender/.test(mhSrc),
      'la guarda de mensajes vuelve a exigir verifiedBizName: el suplantador no lo lleva nunca y se cuela');

    // Y echar sin vetar es una puerta giratoria: con el enlace del grupo, vuelve
    // a entrar. Es la unica guarda grave que no baneaba.
    exige(/banAccount\(allForms\(sender, meta\), `cuenta business/.test(mhSrc),
      'el antiempresa expulsa sin meter en la lista negra: vuelve a entrar con el enlace del grupo');

    // LAS OTRAS DOS PUERTAS TAMBIEN VETAN, y hasta ahora esto solo vigilaba la
    // de mensajes. Por eso el test seguia verde con el join y el purge echando
    // sin banear: nadie los miraba.
    exige(/banAccount\(allForms\(kickId, meta\), `cuenta business al entrar/.test(botSrc),
      'la entrada al grupo expulsa sin vetar: con el enlace del grupo vuelve a entrar');
    exige(/banAccount\(allForms\(d\.kickId, groupMeta\), `cuenta business \(purga/.test(grpSrc),
      'el purge expulsa sin vetar: el barrido masivo es justo el que mas cuentas devuelve');

    // El join decide con businessEvidence, NO con isBusiness. isBusiness aplana
    // los tres estados a un si/no, asi que un IQ vencido o un @lid sin telefono
    // salian como `false` —o sea, como cuenta personal— y entraban.
    exige(/businessEvidence\(sock, phoneJid\)/.test(botSrc),
      'el join volvio a decidir con isBusiness: lo que no se sabe cuenta como inocente');
    exige(/function reintentarBusiness/.test(botSrc),
      'el join ya no reintenta lo desconocido: quien no se pudo comprobar entra y se queda');

    // SE FICHA ANTES DE ECHAR, no despues. Si el kick falla —bot sin admin, o
    // WhatsApp lo rechaza— la prueba tiene que sobrevivir igual; si no, el
    // mensaje siguiente de esa cuenta no se entera de nada.
    //
    // Esto compara POSICIONES, no presencia: con dos `test()` sueltos la guarda
    // pasaba igual con las lineas al reves, que es exactamente el fallo.
    // Y compara CADA pareja, no la primera que aparezca. La primera version
    // usaba indexOf y pasaba siempre: hay dos sitios que echan (el join y el
    // reintento), indexOf encontraba los del reintento —que estan bien— y daba
    // por buenos los del join aunque estuvieran al reves. Justo la mutacion que
    // se probo. Aqui se recorre el fichero y cada expulsion tiene que traer su
    // propia ficha por delante.
    let fichado = false, ordenOk = true, sitios = 0;
    for (const m of botSrc.matchAll(
      /(await recordFacts\(kickId, \{ biz: true \}\))|(aplicarAUno\(sock, groupJid, kickId, 'remove')/g)) {
      if (m[1]) { fichado = true; continue; }
      sitios++;
      if (!fichado) ordenOk = false;
      fichado = false;
    }
    exige(sitios >= 2 && ordenOk,
      'el join echa antes de fichar: si el kick falla, la prueba se pierde y hay que redescubrirla');

    // Y a quien ya estaba DENTRO se le mira el perfil al primer mensaje. Sin
    // esto, el que entro antes de encender el modo —o cuya consulta de entrada
    // no respondio— se quedaba dentro para siempre.
    exige(/businessEvidence\(sock, tel\)/.test(mhSrc),
      'la guarda de mensajes ya no consulta el perfil: quien entro antes de encender el modo no se mira nunca');
    exige(/perfilMirado/.test(mhSrc),
      'la consulta de perfil del primer mensaje perdio su freno: una consulta por linea es la via rapida al rate-limit');

    // VINCULAR POR CODIGO PARTE DE CERO. requestPairingCode escribe `creds.me` en
    // disco antes de devolver el codigo, y Baileys manda LOGIN en vez de REGISTRO
    // en cuanto ese `me` existe. Si la vinculacion no se completa, todos los
    // arranques siguientes son 401 hasta que alguien borre data/auth a mano —
    // cinco intentos costo verlo. Pero SOLO si no hay sesion registrada: una que
    // funciona no se toca.
    // Y vale para los DOS caminos, no solo para --codigo: quien lo intente por
    // codigo y se pase al QR arrastra las mismas credenciales muertas.
    // Y se mira `account`, NUNCA `registered`: en todo Baileys `registered` solo
    // lo escribe la rama del codigo de vinculacion, el QR no lo pone jamas. Con
    // `registered` esta guarda borraba la sesion recien escaneada en cada
    // arranque.
    exige(!/!c\.registered/.test(botSrc),
      'la limpieza de credenciales volvio a mirar `registered`: el QR nunca lo pone, asi que borrara la sesion buena en cada arranque');
    exige(/if \(c\?\.me && !c\.account\)/.test(botSrc)
       && /await fs\.remove\(AUTH_DIR\)/.test(botSrc),
      'el arranque ya no limpia las credenciales a medias: seran 401 hasta que alguien borre data/auth a mano');

    // Y el codigo de vinculacion tiene su propio tope, porque el de los QR no le
    // valia: solo cuenta eventos `qr`, y un codigo no es uno. Cada reconexion
    // entraba otra vez en connectToWhatsApp y pedia un codigo NUEVO — dos en
    // diez segundos, medido en el log. Encadenar peticiones de vinculacion es
    // lo mismo que encadenar QR.
    exige(/MAX_CODIGOS/.test(botSrc) && /codigosPedidos\+\+/.test(botSrc),
      'el codigo de vinculacion volvio a poder pedirse sin limite en cada reconexion');
    // Y el socket se captura en una local: `sock` lo pone a null scheduleReconnect
    // al desmontar, asi que un 401 durante la espera hacia explotar el temporizador.
    exige(/const miSock = sock;/.test(botSrc) && /miSock\.requestPairingCode/.test(botSrc),
      'el temporizador del codigo volvio a usar el `sock` del modulo: revienta si llega un 401 mientras espera');

    // EL BUCLE DE QR TIENE TOPE. Paso de verdad: 401 x3, el bot borro data/auth,
    // reconecto sin credenciales y se puso a sacar QR cada cinco minutos contra
    // un numero que WhatsApp acababa de rechazar. El freno de "no encadenar QR"
    // existia pero contaba ciclos de LOGOUT, y sin credenciales ya no llegan
    // mas 401: el contador se quedaba congelado y no frenaba nada.
    exige(/MAX_QR_SIN_ESCANEAR/.test(botSrc) && /qrSinEscanear\+\+/.test(botSrc),
      'el bot volvio a poder pedir QR sin limite: es lo que convierte una restriccion temporal en permanente');
    // Y la parada tiene que cortar TAMBIEN la reconexion ya programada, no solo
    // la decision: si no, la que iba en vuelo abre socket y pide QR igual.
    const iFlag = botSrc.indexOf('function scheduleReconnect');
    const iCorte = botSrc.indexOf('if (detenido) {', iFlag);
    exige(iFlag !== -1 && iCorte !== -1 && iCorte - iFlag < 400,
      'scheduleReconnect ya no mira la parada deliberada: una reconexion en vuelo se salta el freno');

    // !add NO VUELVE. Se quito porque meter numeros desconocidos en un grupo es
    // la peticion que mas facil hace que WhatsApp marque la cuenta del bot, y
    // perder la cuenta cuesta mucho mas que no tener el comando. Que no se
    // reintroduzca sin querer al copiar un bloque de otro comando.
    for (const [f, src] of [['src/commands/group.js', grpSrc],
                            ['src/handlers/messageHandler.js', mhSrc]]) {
      exige(!/\bcmdAdd\b/.test(src), `${f} vuelve a tener cmdAdd: !add se quito a proposito`);
      exige(!/case 'agregar':/.test(src), `${f} vuelve a despachar !agregar`);
    }
    // EL RE-ALTA SIGUE SIENDO SOLO DEL DUEÑO. Es la unica alta que queda en todo
    // el bot, y lo que la hace aceptable no es que sea automatica: es que mete
    // a alguien que YA estaba en el grupo y que figura en el .env. Si ese filtro
    // se ensancha —o se cae— el bot vuelve a meter gente en grupos por su cuenta,
    // que es justo lo que se quito con !add.
    exige(/\.some\(f => isOwner\(f, false, meta\)\)/.test(botSrc),
      'el re-alta del owner ya no filtra por isOwner: el bot puede volver a meter a cualquiera que echen');

    // Y ninguna llamada de alta a mano, venga de donde venga. El unico alta que
    // queda es la del owner expulsado, y esa pasa por el contrato.
    const altasCrudas = [];
    for (const f of ['src/bot.js', 'src/handlers/messageHandler.js', 'src/commands/group.js',
                     'src/commands/fk.js', 'src/commands/purgaNumero.js', 'src/utils/purge.js']) {
      const src = fs.readFileSync(path.join(R, f), 'utf8');
      for (const linea of src.split('\n')) {
        if (/sock\.groupParticipantsUpdate\([^)]*'add'\)/.test(linea) && !/^\s*(\/\/|\*)/.test(linea)) {
          altasCrudas.push(`${f}: ${linea.trim().slice(0, 50)}`);
        }
      }
    }
    exige(altasCrudas.length === 0,
      `alguien mete gente en grupos a mano otra vez: ${altasCrudas.join(' | ')}`);

    // NADIE VUELVE A HABLAR CON groupParticipantsUpdate POR SU CUENTA.
    //
    // Habia siete copias de "echar y ver si salio" y cinco compartian el mismo
    // fallo: `String(fila?.status ?? '200') === '200'`, o sea dar por hecho que
    // salio cuando WhatsApp no devuelve fila para esa persona. Y no devolverla
    // es lo normal: se pide por telefono y contesta por @lid, asi que la
    // comparacion por digitos no encuentra nada. Medido: con la respuesta vacia
    // el purge daba por expulsados a todos —y desde que veta, los vetaba.
    //
    // Ya no hay excepciones. La habia para !add, que necesitaba el codigo crudo
    // para distinguir "tiene la privacidad activa" de un fallo de verdad, pero
    // !add se quito entero: era la via mas rapida a que WhatsApp marque la
    // cuenta, porque pedir meter numeros desconocidos en grupos es exactamente
    // lo que su antiabuso vigila.
    const llamadasCrudas = [];
    for (const f of ['src/bot.js', 'src/handlers/messageHandler.js', 'src/utils/purge.js',
                     'src/commands/group.js', 'src/commands/fk.js', 'src/commands/purgaNumero.js']) {
      const src = fs.readFileSync(path.join(R, f), 'utf8');
      for (const linea of src.split('\n')) {
        if (!/sock\.groupParticipantsUpdate\(/.test(linea)) continue;
        if (/^\s*(\/\/|\*)/.test(linea)) continue;      // comentarios no cuentan
        llamadasCrudas.push(`${f}: ${linea.trim().slice(0, 60)}`);
      }
    }
    exige(llamadasCrudas.length === 0,
      `alguien volvio a llamar a groupParticipantsUpdate a mano en vez de pasar por aplicarParticipantes: ${llamadasCrudas.join(' | ')}`);

    // Y el contrato no puede volver a inventarse el 200.
    // Se miran solo las lineas de CODIGO: el fichero cita el fallo antiguo en un
    // comentario para explicarlo, y la primera version de esta guarda se cazaba
    // a si misma con esa cita.
    const partSrc = fs.readFileSync(path.join(R, 'src/utils/participantes.js'), 'utf8')
      .split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    exige(!/\?\?\s*'200'/.test(partSrc),
      'el contrato unico volvio a asumir el 200 cuando falta la fila: es justo lo que venia a quitar');

    // El @lid sin telefono no puede volver a descartarse en el join.
    exige(!/no se puede comprobar si es Business`\);\s*\n\s*continue;/.test(botSrc),
      'vuelve a haber un `continue` que deja entrar a los @lid sin telefono sin comprobarlos');
  }

  // ── NINGUN POOL DE FRASES SE VACIA DE GOLPE ───────────────────────────────
  //
  // PASO, Y NINGUNA DE LAS OTRAS COMPROBACIONES LO VIO. Un push por la API de
  // GitHub trunco wingman.js y dejo esto en main:
  //
  //     const RIZZ = { high: ['%N tiene rizz.'], ... };
  //     const PIROPOS = ['Joder, %N, estás buena.'];
  //
  //  · `check` pasaba: el fichero compila y el comando responde.
  //  · `placeholders` pasaba: los %N estan perfectamente enchufados.
  //  · `pools` fallaba, pero por los 9 tramos de siempre — solo mira percent.js
  //    y no ve wingman.js.
  //
  // O sea que !rizz habria contestado siempre la misma linea y el despliegue no
  // se habria parado. El fallo no es de sintaxis ni de contenido: es de TAMANYO,
  // y por eso no lo caza nada que mire una frase a la vez.
  //
  // El minimo es deliberadamente bajo. No es una medida de calidad —de eso ya se
  // ocupa quien escribe— es un detector de amputacion: por debajo de esto no hay
  // pool, hay un resto.
  console.log('\n7. NINGUN POOL SE HA QUEDADO EN LOS HUESOS');
  {
    const MINIMO = 8;
    const flacos = [];

    // UN POOL DE FRASES SE RECONOCE POR LO QUE LLEVA DENTRO, no por el nombre.
    // La primera version miraba cualquier array en MAYUSCULAS y acusaba a
    // DOWNSCALE_ARGS, FF_ARGS y STATIC_QUALITY_TIERS, que son argumentos de
    // ffmpeg. Una frase del bot tiene varias palabras; un argumento es "-vf".
    //
    // SIN_NOMBRE (los apodos del top en gris: "alguien", "un fantasma") queda
    // fuera por lo mismo y esta bien que quede: son etiquetas de una o tres
    // palabras y seis bastan.
    // SIN DEPENDER DEL FORMATO. La primera version de esto exigia un salto de
    // linea antes del corchete de cierre, asi que un array escrito en UNA sola
    // linea era invisible — y esa es EXACTAMENTE la forma que dejo el push
    // truncado:
    //
    //     const PIROPOS = ['Joder, %N, estás buena.'];
    //
    // Un comprobador que no ve el caso para el que se escribio no vale nada. Se
    // recorre el corchete contando, y da igual como este escrito dentro.
    const cuerpoDelArray = (src, desde) => {
      let prof = 0, i = desde, comilla = null;
      for (; i < src.length; i++) {
        const c = src[i];
        if (comilla) {
          if (c === '\\') i++;
          else if (c === comilla) comilla = null;
          continue;
        }
        if (c === "'" || c === '"' || c === '`') { comilla = c; continue; }
        if (c === '[') prof++;
        else if (c === ']') { prof--; if (prof === 0) return src.slice(desde + 1, i); }
      }
      return null;
    };
    const entradasDe = (txt) => [...txt.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1]);
    const esPool = (entradas) => {
      if (!entradas.length) return false;
      const palabras = entradas.map((x) => x.trim().split(/\s+/).length).sort((a, b) => a - b);
      return palabras[Math.floor(palabras.length / 2)] >= 5;
    };

    for (const f of ficheros.filter((x) => x.startsWith(path.join(R, 'src')))) {
      const src = fs.readFileSync(f, 'utf8');
      const mira = (nombre, desde) => {
        const cuerpo = cuerpoDelArray(src, desde);
        if (cuerpo === null) return;
        const e = entradasDe(cuerpo);
        if (esPool(e) && e.length < MINIMO) flacos.push(`${path.relative(R, f)} ${nombre} (${e.length})`);
      };
      for (const m of src.matchAll(/(?:const|let)\s+([A-Z][A-Z_0-9]{3,})\s*=\s*\[/g)) {
        mira(m[1], m.index + m[0].length - 1);
      }
      // Los tramos anidados, que es donde vive !rizz.
      for (const m of src.matchAll(/\b(high|mid|low)\s*:\s*\[/g)) {
        mira(m[1], m.index + m[0].length - 1);
      }
    }

    if (flacos.length) {
      fallos += flacos.length;
      for (const x of flacos) console.log(rojo(`   ✗ pool con menos de ${MINIMO} frases: ${x}`));
    } else {
      console.log(verde(`   ✓ ningun pool ha quedado por debajo de ${MINIMO} frases`));
    }
  }

  // ── NADIE USA `msg` SIN RECIBIRLO ─────────────────────────────────────────
  //
  // `{ quoted: msg }` sale mas de cien veces en el bot y casi siempre es
  // correcto, porque casi todo lo que envia un mensaje recibe el msg original.
  // Pero no todo: los que responden desde un temporizador o desde una funcion
  // auxiliar no lo tienen, y ahi `msg` es una variable libre — ReferenceError
  // garantizado en cuanto esa linea corra.
  //
  // Paso de verdad. Al hacer atomico el duelo se añadio un aviso de "duelo
  // anulado" con `{ quoted: msg }` dentro de resolveDuel(sock, jid, d,
  // groupMeta), que no recibe msg. El grupo habria visto "Error inesperado: msg
  // is not defined" en vez del aviso — y en el camino de fallo, que es el que
  // nunca se ejecuta al probar.
  //
  // No hace falta ejecutar nada para verlo: si la funcion no lo declara y no lo
  // hereda, no existe. Es lo que se comprueba aqui.
  console.log('\n6. NADIE USA UNA VARIABLE QUE NO TIENE');
  {
    let libres = 0;
    const DECL = /^(?:async )?function ([A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*\{/gm;
    for (const f of ficheros.filter((x) => x.startsWith(path.join(R, 'src')))) {
      const src = fs.readFileSync(f, 'utf8');
      // Si el modulo entero declara `msg` fuera de las funciones, cualquiera lo
      // hereda por cierre y no hay nada que mirar.
      if (/^(?:const|let|var) msg\b/m.test(src)) continue;
      for (const m of src.matchAll(DECL)) {
        const [nombre, params] = [m[1], m[2]];
        if (/\bmsg\b/.test(params)) continue;      // lo recibe: correcto
        // Cuerpo: desde la llave de apertura hasta la de cierre, contando.
        let i = m.index + m[0].length, prof = 1;
        while (i < src.length && prof > 0) {
          if (src[i] === '{') prof++;
          else if (src[i] === '}') prof--;
          i++;
        }
        const cuerpo = src.slice(m.index + m[0].length, i - 1)
          // fuera comentarios: los explicativos mencionan `msg` constantemente
          .replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
        // Una funcion anidada que SI declara msg se lleva sus usos con ella.
        if (/function[^(]*\([^)]*\bmsg\b/.test(cuerpo) || /\(\s*msg\s*[,)]|\bmsg\s*=>/.test(cuerpo)) continue;
        // Solo cuenta `msg` LEIDO como variable. Ni `{ msg: algo }` (ahi es la
        // clave de un objeto) ni `x.msg` (ahi es una propiedad). Sin esta
        // distincion saltaban identifyMedia() y rapidConvert(), que devuelven
        // objetos con un campo llamado msg y no leen ninguna variable.
        const USA = /(?<![.\w])msg\b(?!\s*:)/;
        if (USA.test(cuerpo)) {
          libres++;
          const linea = src.slice(0, m.index).split('\n').length;
          console.log(rojo(`   ✗ ${path.relative(R, f)}:${linea} ${nombre}() usa \`msg\` y no lo recibe`));
        }
      }
    }
    if (libres) fallos += libres;
    else console.log(verde('   ✓ ninguna funcion usa `msg` sin recibirlo'));
  }

  // ── LOS COMANDOS OCULTOS NO ASOMAN POR NINGUN LADO ────────────────────────
  //
  // !p echa una cuenta de TODOS los grupos. Responde con silencio a quien no es
  // el owner, pero eso solo lo oculta si el bot no lo nombra en otro sitio. Se
  // comprueban las tres puertas: la lista de permisos, el menu y —la que se
  // pasa por alto— el sugeridor, que completa comandos a quien escribe algo
  // parecido sin tener que acertarlo.
  {
    // `comprueba` vive dentro del bloque de la capa 3; aqui se usa el mismo
    // par (fallos, rojo/verde) que los otros bloques de esta seccion.
    const exige = (cond, queja) => {
      if (cond) return;
      fallos++;
      console.log(rojo(`   ✗ ${queja}`));
    };
    const mh = fs.readFileSync(path.join(R, 'src/handlers/messageHandler.js'), 'utf8');
    const menu = fs.readFileSync(path.join(R, 'src/commands/aura.js'), 'utf8');
    const ocultos = [...(mh.match(/const COMANDOS_OCULTOS = new Set\(\[([\s\S]*?)\]\);/)?.[1] || '')
      .matchAll(/'([^']+)'/g)].map((x) => x[1]);

    exige(ocultos.includes('p'), 'p tiene que estar en COMANDOS_OCULTOS: si no, el sugeridor lo ofrece');

    // El sugeridor, de verdad: se reconstruye su lista igual que el fichero.
    const conocidos = [...new Set([...mh.matchAll(/^\s*case '([a-zá-úñ0-9_]+)':/gmi)].map((m) => m[1]))]
      .filter((c) => c.length >= 2 && !ocultos.includes(c));
    const asoman = ocultos.filter((c) => conocidos.includes(c));
    exige(asoman.length === 0, `el sugeridor ofrece comandos ocultos: ${asoman.join(', ')}`);

    for (const c of ocultos) {
      exige(!new RegExp(`\\*!${c}\\*|!${c}\\b`).test(menu), `!${c} esta en el menu y es un comando oculto`);
    }

    // Y que siga siendo del owner principal, no del tier owner entero.
    const pn = fs.readFileSync(path.join(R, 'src/commands/purgaNumero.js'), 'utf8');
    exige(/if \(!isMainOwner\(sender, msg\.key\.fromMe, groupMeta\)\) return;/.test(pn),
      '!p tiene que seguir siendo solo del owner principal, y devolver silencio');
    exige(!/isOwner\(sender/.test(pn),
      '!p no puede pasar a isOwner: eso abriria la purga global al tier owner entero');

    if (!fallos) console.log(verde('   ✓ los comandos ocultos no asoman por el menu ni por el sugeridor'));
  }

  // ── 7. LOS MUTEOS SOBREVIVEN AL REINICIO ──────────────────────────────────
  {
    const gr = fs.readFileSync(path.join(R, "src/commands/group.js"), 'utf8');
    if (/atomicWriteJson\(MUTE_FILE/.test(gr) && /readJsonOrEnoent\(MUTE_FILE/.test(gr)) {
      console.log(verde('   ✓ los muteos se guardan en disco'));
    } else {
      fallos++;
      console.log(rojo('   ✗ los muteos volvieron a vivir solo en memoria: `npm run update` los borra'));
    }
  }

  // ── 11. !play NO BAJA LA MISMA CANCION DOS VECES NI BORRA FICHERO AJENO ───
  //
  // El single-flight ahorra cuota, pero abre un fallo nuevo que no existia
  // antes: dos peticiones comparten UN fichero. Si la que se colgo de la otra
  // lo borra al terminar, se lo quita de debajo a quien lo bajo — y peor, si lo
  // vuelve a guardar en cache, la cache apunta a un fichero que ya no esta.
  // Por eso esto se vigila: el ahorro no puede pagarse con audios rotos.
  {
    console.log('\n11. !play NO REPITE DESCARGA NI PISA FICHEROS');
    const dl = fs.readFileSync(path.join(R, 'src/utils/downloader.js'), 'utf8');
    const mu = fs.readFileSync(path.join(R, 'src/commands/music.js'), 'utf8');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    exige(/enVuelo\.set\(clave, tarea\)/.test(dl) && /enVuelo\.delete\(clave\)/.test(dl),
      'el single-flight de !play perdio su registro o su limpieza: si no se borra la clave al terminar, una descarga fallida deja esa cancion muerta para siempre');

    // El buffer se lee ANTES de resolver. Si se resolviera antes, quien esperaba
    // podria encontrarse el fichero ya borrado por el que lo bajo.
    const iBuf = dl.indexOf('const buffer = r.buffer || await fs.readFile(r.filePath)');
    const iRet = dl.indexOf('return { ...r, buffer }');
    exige(iBuf !== -1 && iRet !== -1 && iBuf < iRet,
      'el single-flight resuelve antes de leer el buffer: quien esperaba puede quedarse sin fichero');

    // Las DOS de music.js: ni borrar ni recachear lo que no es tuyo.
    const borra = /if \(!fromCache && !result\.compartido\) cleanTemp/.test(mu);
    const cachea = /if \(!fromCache && !result\.compartido\) \{/.test(mu);
    exige(borra && cachea,
      'una peticion compartida volvio a borrar o recachear el fichero de otra: audio roto para quien lo bajo');

    // SoundCloud en paralelo: el que llega tarde tambien ocupa disco.
    exige(/cleanTemp\(h\.value\.filePath\)/.test(dl),
      'los candidatos de SoundCloud que ganan tarde ya no se borran: fuga lenta en temp, que es la peor clase');

    // Y el error tiene que decir por que, no adivinarse por el texto.
    exige(/err\.causa = sinCuota \? 'sin-cuota'/.test(dl) && /\[err\.causa\]/.test(mu),
      '!play volvio a adivinar la causa del fallo por el texto del error: con las keys secas el grupo lee "no encontré esa canción"');

    if (fallos === antes) console.log(verde('   ✓ una descarga por cancion, sin ficheros huerfanos ni causas inventadas'));
  }

  // ── LA CIFRA DE !robo SE LEE DE VERDAD ────────────────────────────────────
  //
  // El comando prometia elegir cantidad y no lo hacia. Tres fallos, los tres
  // invisibles: marcas bidi de WhatsApp, el telefono de la mencion tomado como
  // importe, y 1.000 / 2k / todo que no existian. Sin cifra el bot elegia al
  // azar, o sea que pedir 200 y que saliera otra cifra era el caso normal.
  {
    console.log('\n12. !robo LEE LA CANTIDAD QUE SE ESCRIBE');
    const { parseCantidad, resolverCantidad } = require(path.join(R, 'src/utils/helpers'));
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    const n = (args) => parseCantidad(args).valor;
    exige(n(['@573001112222', '200']) === 200, 'mencion + cifra: tiene que leer 200, no el telefono');
    exige(n(['573001112222', '200']) === 200, 'telefono sin @ no puede comerse el 200');
    exige(n(['\u200e200']) === 200, 'marca LTR de WhatsApp no puede esconder el 200');
    exige(n(['1.000']) === 1000, '1.000 en espanol es mil, no uno');
    exige(n(['2k']) === 2000, '2k es dos mil');
    exige(n(['@alguien']) == null, 'una mencion sola no es una cantidad');
    exige(parseCantidad(['todo']).modo === 'todo', '*todo* es un modo, no un fallo de parseo');
    exige(parseCantidad(['mitad']).modo === 'mitad', '*mitad* es un modo');
    exige(parseCantidad(['50%']).modo === 'pct' && parseCantidad(['50%']).pct === 50, '50% es un porcentaje del tope');

    const r = resolverCantidad(parseCantidad(['200']), { max: 80, suelo: 5 });
    exige(r.stake === 80 && r.recortado, 'pedir de mas recorta al tope y se marca');
    const dulce = resolverCantidad(parseCantidad([]), { max: 200, suelo: 5, dulce: 0.45 });
    exige(!dulce.elegido && dulce.stake === 90, 'sin cifra va al punto dulce, no al azar');
    const allin = resolverCantidad(parseCantidad(['todo']), { max: 200, suelo: 5 });
    exige(allin.elegido && allin.stake === 200, '*todo* pide el tope entero');

    const roboSrc = fs.readFileSync(path.join(R, 'src/commands/robo.js'), 'utf8');
    exige(/parseCantidad\(args\)/.test(roboSrc),
      '!robo volvio al find(/\\d/) que se comia el telefono de la mencion');
    exige(!/\.find\(a => \/\^\\d\+\$\/\.test\(a\)\)/.test(roboSrc),
      '!robo volvio a buscar el primer token de solo digitos: eso es el telefono');

    const auraSrc = fs.readFileSync(path.join(R, 'src/commands/aura.js'), 'utf8');
    exige(/\['robar', 'robo'\]\.includes\(sub\)/.test(auraSrc) && /cmdRobo/.test(auraSrc),
      '*!aura robar* tiene que despachar a cmdRobo: si no, consulta el saldo y parece que no se puede elegir cifra');
    exige(/\[cuánto\]/.test(auraSrc),
      'la guia tiene que decir que !robo lleva cantidad: si no, nadie se entera de que se puede elegir');

    if (fallos === antes) console.log(verde('   ✓ la cifra se lee, el telefono no, y *!aura robar* roba'));
  }

  // ── LAS TRES PUERTAS NUEVAS, Y LA FACHADA DEL OWNER ───────────────────────
  //
  // Tres dinamicas: racha caliente/tilt entre !aura y !robo, curva de acierto
  // en la apuesta, objetivo del dia. Y la regla que las sostiene: el amaño del
  // owner existe, y NINGUNA de las tres lo imprime.
  {
    console.log('\n13. AURA DINAMICA Y FACHADA DEL OWNER');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    const { pApuestaDe, pApuestaVisible, APUESTA, MOMENTUM, OBJETIVO_DIA, DIANA } =
      require(path.join(R, 'src/utils/economia'));

    const pAllIn = pApuestaDe(1, 'miembro').p;
    const pDulce = pApuestaDe(APUESTA.riesgo.puntoDulce, 'miembro').p;
    exige(pAllIn < pDulce, '*!apostar todo* tiene que acertar menos que el punto dulce');
    exige(pApuestaDe(0, 'miembro').p < pDulce, 'apostar calderilla también baja el acierto');

    const visto = pApuestaVisible(1, { jitter: false });
    exige(visto < APUESTA.p.owner, 'al owner no se le puede enseñar su 58 %: eso es lo que delata el amaño');
    exige(visto <= 0.48 && visto >= 0.22, 'la cifra visible de la mesa vive en banda de miembro');

    const mom = require(path.join(R, 'src/utils/momentum'));
    mom._reset();
    mom.anotar('g', '111@s.whatsapp.net', 'caliente', 'robo');
    exige(mom.consumir('g', '111@s.whatsapp.net', 'aura') == null, 'el momentum de !robo no se gasta en otra !aura a destiempo');
    const hit = mom.consumir('g', '111@s.whatsapp.net', 'robo');
    exige(hit && hit.tipo === 'caliente', 'el siguiente !robo tiene que gastar la racha caliente');
    exige(mom.consumir('g', '111@s.whatsapp.net', 'robo') == null, 'la racha se gasta una vez, no es un buff permanente');
    exige(MOMENTUM.caliente === 0.04 && MOMENTUM.tilt === -0.04, 'caliente/tilt es ±4 %');

    const objSrc = fs.readFileSync(path.join(R, 'src/utils/objetivoDia.js'), 'utf8');
    exige(/isMainOwner\(r\.jid/.test(objSrc), 'el objetivo del día NO puede caer en el owner: robarle falla siempre y el cartel delata el amaño');
    exige(/n1Aura/.test(objSrc) && /n1Semana/.test(objSrc), 'el objetivo del día no puede ser el nº1 de aura ni el de la semana');
    exige(OBJETIVO_DIA.bonoBotin < DIANA.bonoBotin, 'el objetivo del día paga menos que la diana semanal');

    const auraSrc = fs.readFileSync(path.join(R, 'src/commands/aura.js'), 'utf8');
    exige(/pApuestaVisible\(fraccion\)/.test(auraSrc), '!aura apostar tiene que enseñar pVisible, no el 58 % del owner');
    exige(/Math\.random\(\) < pReal/.test(auraSrc), 'el dado de la apuesta tira con pReal, la cifra impresa es otra');
    exige(/objetivoDelDia/.test(auraSrc) && /objetivo del día/.test(auraSrc), '!aura tiene que anunciar el objetivo del día');
    exige(/momentum\.anotar\(jid, sender, 'caliente', 'robo'\)/.test(auraSrc), 'una tirada gorda tiene que calentar el siguiente !robo');
    exige(/momentum\.anotar\(jid, sender, 'tilt', 'robo'\)/.test(auraSrc), 'un desastre de !aura tiene que dejar tilt el siguiente !robo');

    const roboSrc = fs.readFileSync(path.join(R, 'src/commands/robo.js'), 'utf8');
    exige(/chanceVisible/.test(roboSrc) && /ROBO_OWNER_VISIBLE/.test(roboSrc), '!robo sigue enseñando la banda falsa, no el 62 %');
    exige(/ownerGana\(jid, ROBO_OWNER_EXITO\)/.test(roboSrc), 'el dado real del owner en !robo no se tocó');
    exige(/momentum\.consumir\(jid, sender, 'robo'\)/.test(roboSrc), '!robo gasta la racha que viene de !aura');
    exige(/momentum\.anotar\(jid, sender, 'caliente', 'aura'\)/.test(roboSrc), 'un golpe maestro calienta la próxima !aura');
    exige(/esObjDia/.test(roboSrc) && /OBJETIVO_DIA\.bonoBotin/.test(roboSrc), 'robar al objetivo del día paga extra');
    exige(/if \(!ladronEsOwner\)/.test(roboSrc) && /MOMENTUM\.caliente/.test(roboSrc), 'al owner el momentum se le enseña y no se le aplica al dado');

    if (fallos === antes) console.log(verde('   ✓ curva, racha, objetivo del día, y el owner no se imprime'));
  }

  console.log(`\n${'─'.repeat(70)}`);
  if (fallos) {
    console.log(rojo(`${fallos} fallo(s). NO commitees esto.`));
    process.exit(1);
  }
  console.log(verde('El bot arranca, carga y responde.'));
})();
