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
if (!fs.existsSync(path.join(R, 'node_modules'))) {
  console.log('\n2-3. CARGA y RESPONDE — saltadas (falta node_modules; corre `npm install`)');
  console.log(verde('\nSintaxis correcta.'));
  process.exit(0);
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
      ['ficha vacia con opciones',    { wid: 'x', profile_options: {} }, 'biz'],
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

  console.log(`\n${'─'.repeat(70)}`);
  if (fallos) {
    console.log(rojo(`${fallos} fallo(s). NO commitees esto.`));
    process.exit(1);
  }
  console.log(verde('El bot arranca, carga y responde.'));
})();
