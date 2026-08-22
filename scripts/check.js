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
const os = require('os');
const { execSync } = require('child_process');

// LEER FUENTE SIN COMENTARIOS.
//
// Existe porque el mismo error me ha salido TRES veces en un dia: una guarda
// busca en el fuente el nombre de lo que vigila, y lo encuentra... en el
// comentario que explica por que ese nombre ya no se usa. La guarda se caza a si
// misma y da un fallo que no existe.
//
// Cualquier guarda que busque un identificador en el codigo tiene que leer por
// aqui. Las que buscan una frase concreta de un comentario, no.
function soloCodigo(rutaRelativa) {
  const txt = fs.readFileSync(path.join(R, rutaRelativa), 'utf8');
  return txt.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
}
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
// Hace falta un co-owner para comprobar el reparto de *!purge*, y config lo lee
// UNA vez al importarse: si se pone mas abajo ya no llega a tiempo.
process.env.CO_OWNERS = process.env.CO_OWNERS || '34600000009,34600000008';
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
    // SE PIDE EL MENU COMO OWNER, que es el unico que lo trae entero. Con el
    // miembro raso —que es como se pedia— los bloques de ADMIN y OWNER ni
    // aparecen, asi que ni el precio de !count ni un comando inventado de esas
    // secciones podian saltar nunca. La comprobacion se creia completa y miraba
    // dos tercios del menu.
    const OWNER_T = `${String(require(path.join(R, 'src/config')).ownerNumber).replace(/\D/g, '')}@s.whatsapp.net`;
    const msgOwner = { ...msgT, key: { ...msgT.key, participant: OWNER_T } };
    const metaOwner = { id: G, participants: [{ id: OWNER_T, admin: 'admin' }, { id: U }] };
    await cmdHelp(sockT, msgOwner, metaOwner);
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
      // cabecera (el ejemplo de *!play*), donde un precio no pinta nada.
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
    comprueba(/case 'auratop':/.test(sinComentarios),
      'dispatcher: *!auratop* (una palabra) tiene que ser el ranking, no silencio');
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

  // EL COOLDOWN DE !aura top. Las reglas que ya se rompieron una vez cada una
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

      // 0. DOS A LA VEZ. El cooldown se reclamaba despues de getAuraRanking, asi
      //    que dos peticiones que llegaban juntas pasaban las dos el check y
      //    publicaban dos rankings con menciones. El comando mas facil de
      //    spamear era el unico que no frenaba el spam.
      //
      //    Va en un grupo propio: el de arriba ya tiene el reloj en marcha y
      //    las dos caerían en cooldown, que no prueba la carrera.
      {
        const GT2 = '000000002@g.us';
        const mt2 = { id: GT2, participants: [A, B, C].map(id => ({ id })) };
        await st.resetAura(GT2);
        const s2 = await st.getAura(GT2, A);
        await st.addAura(GT2, A, 900 - s2);
        await st.addAura(GT2, B, 800 - s2);
        const top2 = async (q) => {
          const mine = [];
          const sk2 = { sendMessage: async (_j, c) => { mine.push(c); return {}; } };
          await ca(sk2, { key: { remoteJid: GT2, participant: q, fromMe: false, id: 'C' + q },
                          message: { conversation: '!auratop' }, pushName: 'x' }, ['auratop'], mt2);
          return mine.at(-1) || {};
        };
        const [x, y] = await Promise.all([top2(A), top2(B)]);
        const nPub = [x, y].filter(publica).length;
        comprueba(nPub === 1,
          `aura top: dos peticiones a la vez publican ${nPub} rankings (tiene que ser 1: si son 2, el cooldown se reclama despues del await)`);
        await st.resetAura(GT2);
      }

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
    const mh = [
      fs.readFileSync(path.join(R, 'src/handlers/messageHandler.js'), 'utf8'),
      fs.readFileSync(path.join(R, 'src/utils/antilink.js'), 'utf8'),
    ].join('\n').split('\n').map((l) => l.replace(/^\s*\/\/.*$/, '')).join('\n');
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
    exige(ocultos.includes('purge'), 'purge tiene que estar en COMANDOS_OCULTOS: si no, escribir !purga lo delata');

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
    // !p Y !purge YA NO TIENEN LA MISMA PUERTA, y la diferencia es deliberada:
    // *!purge* se abrio al tier owner por decision del dueño, *!p* sigue siendo
    // solo suyo. La guarda de antes prohibia isOwner en todo el fichero, asi que
    // habria que borrarla para hacer el cambio — y una guarda que estorba se
    // borra sin pensarla. Se reescribe para vigilar el contrato NUEVO.
    const gp = (fn) => pn.slice(pn.indexOf(`async function ${fn}(`), pn.indexOf('\n}', pn.indexOf(`async function ${fn}(`)));
    exige(/if \(!isMainOwner\(sender, msg\.key\.fromMe, groupMeta\)\) return;/.test(gp('cmdPurgaNumero')),
      '!p tiene que seguir siendo solo del owner principal, y devolver silencio');
    exige(/if \(!isOwner\(sender, msg\.key\.fromMe, groupMeta\)\) return;/.test(gp('cmdPurge')),
      '!purge tiene que dejar pasar al tier owner entero, y devolver silencio al resto');
    // Y lo que hace que abrirlo no sea un arma: quien no es el owner principal
    // no puede purgar a nadie del tier. Sin esto, dos co-owners enfadados se
    // borran el uno al otro de todos los grupos y de la lista negra no se sale.
    exige(/isOwner\(o, false, meta\)/.test(gp('cmdPurge')) && /esElPrincipal/.test(gp('cmdPurge')),
      '!purge dejo de proteger al tier owner de si mismo: un co-owner puede purgar a otro');
    exige(/function esIntocable/.test(pn) && /esIntocable\(objetivo, groupMeta, protegido\)/.test(pn),
      'la proteccion de victimas dejo de mirar quien purga: vuelve a proteger solo al owner principal');
    // Y COMPROBADO EJECUTANDO, no solo leyendo. Quitando la linea que consulta
    // el predicado, las guardas de texto de arriba seguian pasando: la llamada
    // seguia ahi, solo que ya no hacia nada. Esto no se puede esquivar moviendo
    // codigo.
    //
    // Se prueba el caso PROTEGIDO (un co-owner intenta purgar a otro), que no
    // llega a tocar nada: no escribe banlist ni expulsa, asi que puede correr
    // siempre, tambien con el bot en marcha.
    {
      const cfg2 = require(path.join(R, 'src/config'));
      const CO_A = `${String((cfg2.coOwners || [])[0] || '').replace(/\D/g, '')}@s.whatsapp.net`;
      // El objetivo tiene que ser co-owner TAMBIEN, o purgarlo seria legitimo y
      // la guarda estaria acusando al codigo de hacer lo correcto. Ya me paso.
      const CO_B = `${String((cfg2.coOwners || [])[1] || '').replace(/\D/g, '')}@s.whatsapp.net`;
      if (!/^\d/.test(CO_A) || !/^\d/.test(CO_B)) {
        fallos++;
        console.log(rojo('   ✗ hacen falta DOS co-owners para comprobar el reparto de !purge y no los hay'));
      } else {
        const BOT_P = '11111111111@s.whatsapp.net';
        const kicks = [];
        const participantes = [{ id: CO_A }, { id: CO_B }, { id: BOT_P, admin: 'admin' }];
        const sockP2 = {
          user: { id: BOT_P },
          sendMessage: async () => ({}),
          onWhatsApp: async (j) => [{ exists: true, jid: j }],
          groupFetchAllParticipating: async () => ({ 'gp@g.us': { subject: 'G', participants: participantes } }),
          groupParticipantsUpdate: async (g, ids) => { kicks.push(...ids); return ids.map((j) => ({ jid: j, status: '200' })); },
        };
        const { cmdPurge: purgar } = require(path.join(R, 'src/commands/purgaNumero'));
        const objetivo = CO_B.split('@')[0];
        // LAS DOS RUTAS. Un numero escrito entra por resolverCuenta y una
        // MENCION por cuentaDesdeJid: son dos funciones distintas y cada una
        // tiene que recibir el predicado. Con un solo caso, quitarselo a la otra
        // pasaba en verde — probado.
        const meta2 = { id: 'gp@g.us', participants: participantes };
        await purgar(sockP2,
          { key: { remoteJid: 'gp@g.us', participant: CO_A, fromMe: false, id: 'GP1' },
            message: { conversation: `!purge ${objetivo}` } },
          [objetivo], meta2);
        await new Promise((r) => setTimeout(r, 150));
        exige(kicks.length === 0,
          `un co-owner ha purgado a otro co-owner por su numero (${kicks.length} expulsion(es)): !purge se puede volver contra el tier`);

        kicks.length = 0;
        await purgar(sockP2,
          { key: { remoteJid: 'gp@g.us', participant: CO_A, fromMe: false, id: 'GP2' },
            message: { extendedTextMessage: { text: '!purge', contextInfo: { mentionedJid: [CO_B] } } } },
          [], meta2);
        await new Promise((r) => setTimeout(r, 150));
        exige(kicks.length === 0,
          `un co-owner ha purgado a otro co-owner MENCIONANDOLO (${kicks.length} expulsion(es)): la ruta de la mencion no mira quien purga`);
      }
    }
    exige(/cmdPurge/.test(mh) && /case 'purge':/.test(mh),
      '!purge esta escrito pero no enganchado al dispatcher');
    exige(/'p','purge'/.test(mh) || /'purge'/.test(mh.match(/const NEEDS_META[\s\S]*?\]\)/)?.[0] || ''),
      '!purge tiene que pedir metadata: sin ella isMainOwner no resuelve el LID del owner');
    const avisoAntes = pn.indexOf('await sock.sendMessage(gJid, payload)');
    const kickDesp = pn.indexOf("aplicarParticipantes(sock, gJid, ids, 'remove'");
    exige(avisoAntes > 0 && kickDesp > avisoAntes,
      'el aviso de !p/!purge tiene que salir ANTES del kick: si no, no lo ven');
    // Aqui habia una guarda que exigia las palabras "no eres suficiente". El
    // aviso se reescribio a proposito (ahora es frio y por reglas) y la guarda
    // se quedo pidiendo la redaccion vieja: cinco fallos en verde que no eran
    // fallos. Una guarda atada a la copia se rompe cada vez que alguien mejora
    // la frase, y entrena a ignorarla. Lo que importa del aviso es que exista,
    // que salga antes del kick y que mencione a quien va a caer — y eso se
    // comprueba mas abajo, ejecutandolo.
    const avisoSrc = pn.slice(pn.indexOf('function avisoDePurge'), pn.indexOf('function extractNumbers'));
    exige(avisoSrc.includes('function avisoDePurge'), 'no encuentro avisoDePurge para comprobar el tono');
    exige(!/valéis|estáis|sois |vosotros|tenéis/.test(avisoSrc),
      'el aviso de !purge no puede usar conjugacion de España');

    // Y AL REVES: que el menu no anuncie comandos que ya no existen. La guarda
    // de arriba vigila que lo oculto no asome; esta vigila que lo anunciado se
    // pueda escribir. Al quitar !add habia que acordarse de la linea del menu a
    // mano, y acordarse no es un mecanismo.
    {
      const soc = fs.readFileSync(path.join(R, 'src/commands/social.js'), 'utf8');
      const mhSrc = fs.readFileSync(path.join(R, 'src/handlers/messageHandler.js'), 'utf8');
      const desde = soc.indexOf('async function cmdHelp');
      const menu = desde === -1 ? '' : soc.slice(desde);
      const nombrados = [...new Set([...menu.matchAll(/\$\{p\}([a-z0-9ñ-]+)/gi)].map(m => m[1].toLowerCase()))];
      const despachados = new Set([...mhSrc.matchAll(/case .[\"']?([a-z0-9ñáéíóú-]+)[\"']?.:/gi)].map(m => m[1].toLowerCase()));
      const fantasmas = nombrados.filter(n => !despachados.has(n));
      exige(nombrados.length > 50, 'el menu dejo de nombrar comandos: ¿se rompio el trozo que se lee?');
      exige(fantasmas.length === 0,
        `el menu anuncia comandos que ya no existen: ${fantasmas.join(', ')}`);
    }

    if (!fallos) console.log(verde('   ✓ los comandos ocultos no asoman por el menu ni por el sugeridor'));
  }

  // ── !purge: listado, aviso ANTES del kick, LID, silencio al resto ─────────
  {
    const exige = (cond, queja) => {
      if (cond) return;
      fallos++;
      console.log(rojo(`   ✗ ${queja}`));
    };
    const { extractNumbers, avisoDePurge, cmdPurge } = require(path.join(R, 'src/commands/purgaNumero'));

    exige(extractNumbers('57300111222\n57300333444').join(',') === '57300111222,57300333444',
      'extractNumbers fusiona o pierde numeros del listado');
    exige(extractNumbers('57300111222 57300333444').length === 2,
      'dos numeros en la misma linea se tienen que quedar en dos, no en uno solo');
    exige(extractNumbers('https://wa.me/57300555666').includes('57300555666'),
      'extractNumbers no lee wa.me');
    exige(extractNumbers('hola').length === 0, 'extractNumbers inventa numeros donde no hay');

    // El aviso, por lo que TIENE que cumplir y no por como esta redactado.
    const aviso1 = avisoDePurge(['57300111222']);
    const avisoN = avisoDePurge(['57300111222', '57300333444']);
    exige((aviso1.mentions || []).length === 1 && (avisoN.mentions || []).length === 2,
      'el aviso de !purge tiene que mencionar a cada uno de los que van a caer');
    exige(/@/.test(aviso1.text) && /@/.test(avisoN.text),
      'el aviso no escribe la etiqueta: la mencion sin el @ en el texto no se ve');
    // SIN LAS ETIQUETAS. Comparar los textos enteros no comprueba nada: uno
    // lleva una mencion y el otro dos, asi que difieren siempre aunque la frase
    // sea la misma. Probado — con el singular desactivado a proposito, la
    // guarda seguia en verde. Lo que tiene que cambiar es la FRASE.
    const sinTags = (a) => a.text.replace(/@\S+/g, '').replace(/\s+/g, ' ').trim();
    exige(sinTags(aviso1) !== sinTags(avisoN),
      'el aviso de uno y el de varios dicen la misma frase: uno de los dos concuerda mal en numero');
    exige(aviso1.text.length < 200 && avisoN.text.length < 240,
      'el aviso de !purge se esta alargando: es un aviso, no un comunicado');
    exige(!/valéis|estáis|sois |vosotros/.test(aviso1.text + avisoN.text),
      'avisoDePurge conjugó en vosotros');

    // Barrido simulado. fromMe salta isMainOwner sin depender del .env.
    // Se restaura banlist: cmdPurge escribe ahí de verdad.
    if (botEnMarcha()) {
      console.log('   — barrido de !purge saltado: el bot esta corriendo');
    } else {
      const copia = copiaSeguridad();
      const antes = new Set(copia.keys());
      try {
        const timeline = [];
        const BOT = '11111111111@s.whatsapp.net';
        const A = '57300111222@s.whatsapp.net';
        const B = '57300333444@s.whatsapp.net';
        const sockP = {
          user: { id: BOT },
          sendMessage: async (jid, c) => { timeline.push({ t: 'msg', jid, text: c.text || '', mentions: c.mentions || [] }); return {}; },
          onWhatsApp: async (jid) => [{ exists: true, jid }],
          groupFetchAllParticipating: async () => ({
            'g1@g.us': {
              subject: 'Grupo 1',
              participants: [
                { id: A, admin: null },
                { id: B, admin: null },
                { id: BOT, admin: 'admin' },
              ],
            },
            'g2@g.us': {
              subject: 'Grupo LID',
              participants: [
                { id: '999@lid', lid: '999@lid', phoneNumber: A, admin: null },
                { id: BOT, admin: 'superadmin' },
              ],
            },
            'g3@g.us': {
              subject: 'Sin admin',
              participants: [{ id: A, admin: null }],
            },
          }),
          groupParticipantsUpdate: async (gJid, ids, accion) => {
            timeline.push({ t: 'kick', gJid, ids, accion });
            return ids.map((jid) => ({ jid, status: '200' }));
          },
        };
        const msgP = {
          key: { remoteJid: 'g1@g.us', fromMe: true, id: 'P1', participant: BOT },
          message: { conversation: '!purge 57300111222\n57300333444' },
        };
        await cmdPurge(sockP, msgP, ['57300111222', '57300333444'], { participants: [] });

        exige(/listado/i.test(timeline[0]?.text || ''),
          '!purge no enseña el listado antes de tocar nada');
        exige(/57300111222/.test(timeline[0]?.text || '') && /57300333444/.test(timeline[0]?.text || ''),
          '!purge no lista los numeros que va a sacar');

        const kicks = timeline.filter((x) => x.t === 'kick');
        exige(kicks.length === 2, `!purge tenia que echar de 2 grupos y echo de ${kicks.length}`);
        exige(kicks.every((k) => k.accion === 'remove'), '!purge no esta expulsando');

        // El aviso se localiza por lo que ES —el mensaje al grupo que menciona a
        // alguien—, no por lo que dice. Antes se buscaba la palabra
        // "suficiente" y al reescribir la frase estas tres guardas dejaron de
        // encontrar nada: no fallaban por un fallo, fallaban por la copia.
        const esAviso = (x) => x.t === 'msg' && (x.mentions || []).length > 0;
        const ordenG1 = timeline.filter((x) => x.jid === 'g1@g.us' || x.gJid === 'g1@g.us');
        const iAviso = ordenG1.findIndex(esAviso);
        const iKick = ordenG1.findIndex((x) => x.t === 'kick');
        exige(iAviso >= 0 && iKick > iAviso,
          'en el grupo el aviso de !purge no sale ANTES del kick');

        const avisoLid = timeline.find((x) => x.jid === 'g2@g.us' && esAviso(x));
        exige(Boolean(avisoLid), '!purge no aviso en el grupo LID (no encontro el @lid)');
        exige(!avisoLid || avisoLid.mentions.includes('999@lid'),
          '!purge avisa en el grupo LID sin mencionar el @lid: la mencion no le llega a quien va a caer');
        exige(kicks.some((k) => k.gJid === 'g2@g.us' && k.ids.includes('999@lid')),
          '!purge no echo del grupo LID por el id del participante');
        exige(!kicks.some((k) => k.gJid === 'g3@g.us'),
          '!purge echo de un grupo donde el bot no es admin');

        const silencioso = [];
        const sockS = {
          ...sockP,
          sendMessage: async (...a) => { silencioso.push(a); return {}; },
          groupFetchAllParticipating: async () => { throw new Error('no deberia listar grupos'); },
        };
        await cmdPurge(sockS, {
          key: { remoteJid: 'g1@g.us', fromMe: false, id: 'P2', participant: '15551234567@s.whatsapp.net' },
          message: { conversation: '!purge 57300111222' },
        }, ['57300111222'], null);
        exige(silencioso.length === 0, '!purge hablo a quien no es el owner');
      } finally {
        restaurar(copia, antes);
      }
    }

    if (!fallos) console.log(verde('   ✓ !purge lista, avisa antes del ban y no se delata'));
  }

  // ── !kick: aviso ANTES del kick, admins, más hiriente ─────────────────────
  {
    const exige = (cond, queja) => {
      if (cond) return;
      fallos++;
      console.log(rojo(`   ✗ ${queja}`));
    };
    const { cmdKick, avisoDeKick } = require(path.join(R, 'src/commands/group'));
    const { AVISOS_KICK } = require(path.join(R, 'src/data/kickPhrases'));

    exige(AVISOS_KICK.length >= 8, 'el pool de !kick se quedó en los huesos');
    for (const f of AVISOS_KICK) {
      exige(typeof f?.uno === 'string' && typeof f?.varios === 'string', 'aviso de kick incompleto');
      exige(f.uno.includes('%M') && f.varios.includes('%M'), 'aviso de kick no menciona');
      exige(!/valéis|estáis|sois |vosotros|tenéis/.test(`${f.uno} ${f.varios}`),
        'aviso de kick conjugó en vosotros');
      exige(/no eres suficiente|no das |no llegas|te queda grande|te echa con alivio|ocupaste el sitio|ya te olvidó/i.test(f.uno),
        'frase de !kick se salió del hueso');
      exige(/no son suficientes|no dan |no llegan|les queda grande|los echa con alivio|ocuparon el sitio|ya los olvidó/i.test(f.varios),
        'frase plural de !kick se salió del hueso');
    }

    const aviso1 = avisoDeKick(['57300111222@s.whatsapp.net']);
    exige(/@57300111222/.test(aviso1.text), 'aviso de kick no patea el numero');
    exige((aviso1.mentions || []).includes('57300111222@s.whatsapp.net'), 'aviso de kick no pingea');
    const avisoN = avisoDeKick(['57300111222@s.whatsapp.net', '57300333444@s.whatsapp.net']);
    exige(/@57300111222/.test(avisoN.text) && /@57300333444/.test(avisoN.text),
      'aviso de kick con varios no menciona a todos');
    exige(!/valéis|estáis|sois |vosotros|tenéis/.test(aviso1.text + avisoN.text),
      'avisoDeKick conjugó en vosotros');

    const grKick = fs.readFileSync(path.join(R, 'src/commands/group.js'), 'utf8');
    const iAvisoKick = grKick.indexOf('avisoDeKick(targets)');
    const iKickApply = grKick.indexOf("aplicarParticipantes(sock, jid, targets, 'remove'");
    exige(iAvisoKick > 0 && iKickApply > iAvisoKick,
      'el aviso de !kick tiene que salir ANTES del kick: si no, no lo ven');
    exige(/esperaKick\(AVISO_ANTES_KICK_MS\)/.test(grKick),
      '!kick no deja margen para que vean la frase');

    const timeline = [];
    const BOT = '11111111111@s.whatsapp.net';
    const ADMIN = '15559876543@s.whatsapp.net';
    const T = '57300111222@s.whatsapp.net';
    const metaK = {
      participants: [
        { id: ADMIN, admin: 'admin' },
        { id: T, admin: null },
        { id: BOT, admin: 'admin' },
      ],
    };
    const sockK = {
      user: { id: BOT },
      sendMessage: async (jid, c) => { timeline.push({ t: 'msg', jid, text: c.text || '' }); return {}; },
      groupParticipantsUpdate: async (gJid, ids, accion) => {
        timeline.push({ t: 'kick', gJid, ids, accion });
        return ids.map((jid) => ({ jid, status: '200' }));
      },
    };
    const msgK = {
      key: { remoteJid: 'g1@g.us', fromMe: false, id: 'K1', participant: ADMIN },
      message: {
        extendedTextMessage: {
          text: '!kick @57300111222',
          contextInfo: { mentionedJid: [T] },
        },
      },
    };
    await cmdKick(sockK, msgK, [], metaK);
    const iAviso = timeline.findIndex((x) => x.t === 'msg' && /@57300111222/.test(x.text || ''));
    const iKick = timeline.findIndex((x) => x.t === 'kick');
    exige(iAviso >= 0 && iKick > iAviso, '!kick no avisa ANTES de echar');
    exige(timeline.filter((x) => x.t === 'kick').length === 1, '!kick no echo o echo de mas');
    exige(timeline.filter((x) => x.t === 'kick')[0].accion === 'remove', '!kick no esta expulsando');

    const silenciosoKick = [];
    const sockM = {
      ...sockK,
      sendMessage: async (jid, c) => { silenciosoKick.push(c); return {}; },
      groupParticipantsUpdate: async () => { throw new Error('no deberia echar'); },
    };
    await cmdKick(sockM, {
      key: { remoteJid: 'g1@g.us', fromMe: false, id: 'K2', participant: T },
      message: { extendedTextMessage: { text: '!kick @x', contextInfo: { mentionedJid: [ADMIN] } } },
    }, [], metaK);
    exige(silenciosoKick.length === 1 && /Solo admins/i.test(silenciosoKick[0].text || ''),
      '!kick no corta a quien no es admin');

    const msgsNA = [];
    const sockNA = {
      user: { id: BOT },
      sendMessage: async (jid, c) => { msgsNA.push(c); return {}; },
      groupParticipantsUpdate: async () => { throw new Error('no deberia echar'); },
    };
    await cmdKick(sockNA, msgK, [], {
      participants: [
        { id: ADMIN, admin: 'admin' },
        { id: T, admin: null },
        { id: BOT, admin: null },
      ],
    });
    exige(msgsNA.length === 1 && /no es admin/i.test(msgsNA[0].text || ''),
      '!kick insulto en publico sin poder echar');

    if (!fallos) console.log(verde('   ✓ !kick avisa antes del ban y sigue siendo de admins'));
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

  // ── 15. EL OBJETIVO DEL DIA ROTA DE VERDAD ───────────────────────────────
  //
  // Salio siete dias seguidos sobre la MISMA persona, y el codigo parecia
  // correcto: hash de (grupo, etiqueta, dia). El fallo estaba dentro del hash.
  // FNV-1a a secas termina en una multiplicacion, y eso no empuja el ultimo byte
  // a los bits altos; como las claves de dias consecutivos solo cambian en el
  // ultimo caracter, el ruido se movia en pasos de 0,004 y el indice caia
  // siempre en el mismo sitio.
  //
  // Esto NO se ve leyendo: hay que generar los dias y mirar. Por eso la guarda
  // los genera.
  {
    console.log('\n15. EL OBJETIVO DEL DIA ROTA');
    const antes = fallos;
    const { ruido } = require(path.join(R, 'src/utils/fachada'));
    const dias = [];
    for (let d = 0; d < 30; d++) {
      const f = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10);
      dias.push(Math.floor(ruido('G@g.us', 'objetivo-dia', f) * 7));
    }
    const distintos = new Set(dias).size;
    if (distintos >= 5) {
      console.log(verde(`   ✓ en 30 dias caen ${distintos} personas distintas de 7`));
    } else {
      fallos++;
      console.log(rojo(`   ✗ el objetivo del dia no rota: en 30 dias solo caen ${distintos} de 7. ` +
        'Suele ser que el hash perdio la mezcla final y el ultimo caracter no llega a los bits altos'));
    }
    // NO SE ELIGE POR POSICION EN LA LISTA. Este era el fallo que se vio en el
    // grupo: el cartel saltaba de persona en persona en minutos. El indice
    // sorteado era estable todo el dia, pero la lista sale del ranking de aura y
    // ese se reordena con cada tirada, robo y apuesta — asi que `candidatos[i]`
    // apuntaba a otro cada vez. Ahora cada candidato saca su propio numero de
    // (grupo, dia, su jid) y gana el mas alto, que no depende del orden.
    // Solo lineas de CODIGO: el fichero cita `candidatos[i]` en el comentario
    // que explica el fallo viejo, y la primera version de esta guarda se cazaba
    // a si misma con esa cita. Es la segunda vez que me pasa lo mismo.
    const objSrc = fs.readFileSync(path.join(R, 'src/utils/objetivoDia.js'), 'utf8')
      .split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    if (/candidatos\[i\]/.test(objSrc) || /\* candidatos\.length/.test(objSrc)) {
      fallos++;
      console.log(rojo('   ✗ el objetivo del dia volvio a elegirse por posicion: el ranking se reordena solo y el cartel salta de persona en persona'));
    }
    if (!/ruido\(grupo, 'objetivo-dia', `\$\{hoy\}\|\$\{canonicalJid\(r\.jid\)\}`\)/.test(objSrc)) {
      fallos++;
      console.log(rojo('   ✗ el objetivo del dia ya no sortea por persona: sin el jid en la clave vuelve a depender del orden'));
    }
    // Y solo la mitad de arriba: un cartel sobre alguien con 30 de aura no es
    // una caza, porque el 22 % extra cae sobre un botin que no existe.
    // Suelo ABSOLUTO, no una posicion en el ranking: la mitad de arriba es un
    // puesto, y la gente entra y sale de el con cada tirada — el elegido se caia
    // de la lista y ganaba otro. Cambiar el filtro por uno relativo reabre eso.
    // Y la decision del dia se guarda: perseguir fuentes de movimiento una a una
    // no acaba nunca porque todo lo que hay debajo es un ranking vivo. Se toma
    // una vez y despues solo se comprueba que el elegido siga valiendo.
    if (!/const decidido = new Map\(\)/.test(objSrc) || !/yaEsta\.dia === hoy/.test(objSrc)) {
      fallos++;
      console.log(rojo('   ✗ el objetivo del dia ya no memoriza su decision: cualquier cosa que mueva el ranking vuelve a cambiar el cartel a media tarde'));
    }
    // Y se re-valida contra el RANKING, no contra los candidatos: las
    // exclusiones son para elegir, no para mantener.
    if (!/const sigue = ranking\.find/.test(objSrc)) {
      fallos++;
      console.log(rojo('   ✗ el objetivo del dia re-aplica las exclusiones al recordar: si el cazado sube a nº1, el cartel cambia solo'));
    }
    if (!/r\.aura >= ARRANQUE/.test(objSrc)) {
      fallos++;
      console.log(rojo('   ✗ el objetivo del dia ya no exige un suelo absoluto de aura: con un corte por posicion, el elegido se cae de la lista cuando el ranking se mueve'));
    }

    // Y sigue siendo ESTABLE dentro del mismo dia, que es la otra mitad del trato.
    const a = ruido('G@g.us', 'objetivo-dia', '2026-03-05');
    const b = ruido('G@g.us', 'objetivo-dia', '2026-03-05');
    if (a !== b) { fallos++; console.log(rojo('   ✗ el ruido dejo de ser estable dentro del dia')); }
    if (fallos === antes) console.log(verde('   ✓ y es el mismo durante todo el dia'));
  }

  // ── 17. NI FRASES CLONADAS NI FAMILIAS DE PLANTILLA ──────────────────────
  //
  // El dueño vio una frase repetida y el filtro anti-repeticion estaba bien: lo
  // que falla es el CONTENIDO, y son dos cosas distintas.
  //
  //  · DUPLICADOS EXACTOS. No producen una repeticion seguida (dos textos
  //    iguales dan el mismo hash y la ventana los tapa juntos), pero inflan el
  //    pool: 100 frases con 24 clones son 76. El validador de pools cuenta 100 y
  //    dice que va sobrado. Aparecieron 24 en robo.js en una reescritura.
  //
  //  · FAMILIAS DE PLANTILLA. Siete frases que empiezan "Rata de las que se…"
  //    son, para quien lee, la misma frase. El filtro no puede verlo —son textos
  //    distintos— asi que tiene que verse aqui.
  {
    console.log('\n17. NI FRASES CLONADAS NI PLANTILLA');
    const antes = fallos;
    const FICHEROS = ['src/commands/percent.js', 'src/data/percentLabels.js', 'src/commands/robo.js',
                      'src/commands/wingman.js', 'src/data/roboExtraPhrases.js',
                      'src/data/fidelityPhrases.js'];
    const ES = /^\s*(['"`])(.{25,}?)\1,\s*$/;
    let clones = 0;
    const dondeClones = [];
    for (const f of FICHEROS) {
      let lineas;
      try { lineas = fs.readFileSync(path.join(R, f), 'utf8').split('\n'); } catch { continue; }
      const vistas = new Set();
      for (const l of lineas) {
        const m = l.match(ES);
        if (!m) continue;
        if (vistas.has(m[2])) { clones++; if (dondeClones.length < 3) dondeClones.push(`${f}: ${m[2].slice(0, 46)}`); }
        else vistas.add(m[2]);
      }
    }
    if (clones) {
      fallos++;
      console.log(rojo(`   ✗ ${clones} frase(s) duplicadas EXACTAS: inflan el pool sin dar variedad`));
      for (const d of dondeClones) console.log(rojo(`       ${d}`));
    }

    // Familias: mismo arranque de cinco palabras dentro del mismo tramo. Se
    // toleran DOS —una coincidencia pasa— y a la tercera es un molde.
    const src = fs.readFileSync(path.join(R, 'src/data/percentLabels.js'), 'utf8');
    let cmd = null, tramo = null;
    const familias = new Map();
    for (const l of src.split('\n')) {
      let m = l.match(/^  ([a-z]+): \{$/);
      if (m) { cmd = m[1]; continue; }
      m = l.match(/^    (high|mid|low|extreme): \[$/);
      if (m) { tramo = m[1]; continue; }
      if (/^    \],?$/.test(l)) { tramo = null; continue; }
      if (!cmd || !tramo) continue;
      const t = l.match(/^      (['"`])(.+?)\1,\s*$/);
      if (!t) continue;
      const arranque = t[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 5).join(' ');
      const k = `${cmd}.${tramo}|${arranque}`;
      familias.set(k, (familias.get(k) || 0) + 1);
    }
    const moldes = [...familias.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]);
    if (moldes.length) {
      fallos++;
      console.log(rojo(`   ✗ ${moldes.length} familia(s) de plantilla: 3+ frases que empiezan igual en el mismo tramo`));
      for (const [k, n] of moldes.slice(0, 3)) {
        console.log(rojo(`       ${k.split('|')[0]} ×${n} — «${k.split('|')[1]}…»`));
      }
    }

    if (fallos === antes) console.log(verde('   ✓ ni clones ni moldes: cada frase se lee distinta de las de al lado'));
  }

  // ── 18. RESPONDER A UN ENLACE NO TE HACE CULPABLE ────────────────────────
  //
  // Fallo grave visto en el grupo: alguien mandaba un enlace y se iba; otro
  // RESPONDIA a ese mensaje y al que respondia lo echaban.
  //
  // La causa fue un arreglo mio. Se hizo que el detector mirara el mensaje
  // citado, porque el contexto de una cita lo rellena quien manda y se puede
  // citar una invitacion inventada. Pero responder mete el mensaje del otro
  // DENTRO del tuyo, asi que quien contestaba "jajaja" a un enlace pasaba a ser
  // el que mandaba el enlace.
  //
  // La cita solo cuenta cuando el citado es uno mismo. Y esta guarda existe
  // porque el fallo no se ve leyendo: el codigo parecia correcto y solo se nota
  // cuando alguien responde.
  {
    console.log('\n18. RESPONDER A UN ENLACE NO TE HACE CULPABLE');
    const antes = fallos;
    const { clasificarMensaje } = require(path.join(R, 'src/handlers/messageHandler'));
    const INV = 'https://chat.whatsapp.com/ABCdef1234567890';
    const YO = '5211111111111@s.whatsapp.net';
    const OTRO = '5219999999999@s.whatsapp.net';
    const citando = (autorCitado) => ({
      extendedTextMessage: {
        text: 'jajaja',
        contextInfo: { participant: autorCitado, quotedMessage: { conversation: INV } },
      },
    });

    const respondiendo = clasificarMensaje(citando(OTRO), YO);
    if (respondiendo !== 'none') {
      fallos++;
      console.log(rojo(`   ✗ responder al enlace de otro sale como "${respondiendo}": al que responde se le echa`));
    }
    // Citarse a uno mismo SI es contenido propio.
    const citandose = clasificarMensaje(citando(YO), YO);
    if (citandose !== 'invite') {
      fallos++;
      console.log(rojo(`   ✗ citarse a uno mismo con una invitacion sale como "${citandose}": es la puerta que la cita venia a cerrar`));
    }
    // Y sin saber quien escribe, las citas no se miran: es lo prudente.
    if (clasificarMensaje(citando(OTRO)) !== 'none') {
      fallos++;
      console.log(rojo('   ✗ sin saber quien escribe se siguen mirando las citas: no hay forma de saber si el contenido es suyo'));
    }
    // Lo que manda uno mismo, sin citas, sigue cayendo.
    if (clasificarMensaje({ conversation: INV }, YO) !== 'invite') {
      fallos++;
      console.log(rojo('   ✗ un enlace normal dejo de detectarse'));
    }

    // Y que el handler SIGA pasandole quien escribe. Sin ese argumento las citas
    // dejan de mirarse del todo — no rompe nada visible, pero reabre en silencio
    // el agujero que la cita venia a tapar.
    const mh = soloCodigo('src/handlers/messageHandler.js');
    if (!/clasificarMensaje\(msg\.message, sender\)/.test(mh)) {
      fallos++;
      console.log(rojo('   ✗ el antilink dejo de pasarle quien escribe a clasificarMensaje: las citas dejan de mirarse en silencio'));
    }

    if (fallos === antes) console.log(verde('   ✓ solo cae quien manda el enlace, no quien lo responde'));
  }

  // ── 19. EL PRIVADO DEL BOT ES SOLO DEL OWNER ─────────────────────────────
  //
  // Contestarle a cualquiera que escriba al privado es lo que convierte el
  // numero en un bot publico: se prueba, se aburren y se reporta. El bot NUNCA
  // abrio conversacion con nadie (eso es lo que de verdad tumba una cuenta) y
  // eso no debe cambiar, pero responder tampoco interesa.
  //
  // Las dos mitades de la guarda importan por igual y fallan al reves:
  //   · si la puerta se cae, vuelve el bot publico;
  //   · si la puerta se pasa de lista, el DUEÑO se queda fuera de su propio
  //     bot en silencio, que es el fallo mas caro de diagnosticar que hay.
  {
    console.log('\n19. EL PRIVADO DEL BOT ES SOLO DEL OWNER');
    const antes = fallos;
    const { ownerEnPrivado } = require(path.join(R, 'src/handlers/messageHandler'));
    const cfg = require(path.join(R, 'src/config'));
    const OWNER = `${String(cfg.ownerNumber).replace(/\D/g, '')}@s.whatsapp.net`;
    const EXTRANO = '5217777777777@s.whatsapp.net';
    const priv = (remoteJid, extra = {}) => ({ key: { remoteJid, fromMe: false, id: 'X', ...extra } });

    if (ownerEnPrivado(priv(EXTRANO), EXTRANO)) {
      fallos++;
      console.log(rojo('   ✗ un desconocido pasa la puerta del privado: el bot vuelve a ser publico'));
    }
    if (!ownerEnPrivado(priv(OWNER), OWNER)) {
      fallos++;
      console.log(rojo('   ✗ el OWNER no pasa su propia puerta: se queda fuera del bot y sin ningun mensaje que lo explique'));
    }
    // El owner llegando por @lid con el mapa frio: el telefono viaja aparte en
    // la llave y tiene que valer, o el dueño se queda fuera el dia que WhatsApp
    // le reparta el privado por LID.
    if (!ownerEnPrivado(priv('123456789@lid', { participantAlt: OWNER }), '123456789@lid')) {
      fallos++;
      console.log(rojo('   ✗ el owner por @lid no pasa: la puerta solo mira una forma del JID'));
    }
    if (!ownerEnPrivado({ key: { remoteJid: EXTRANO, fromMe: true, id: 'X' } }, EXTRANO)) {
      fallos++;
      console.log(rojo('   ✗ lo que manda el propio bot no pasa la puerta'));
    }

    const mh = soloCodigo('src/handlers/messageHandler.js');
    // La puerta tiene que estar, y estar ARRIBA: por delante del visto, de los
    // contadores y del switch. Si se cuela por debajo de cualquiera de ellos,
    // el desconocido ya dejo rastro aunque no reciba respuesta.
    const iPuerta = mh.indexOf("if (!jid.endsWith('@g.us') && !ownerEnPrivado(msg, sender)) return;");
    if (iPuerta < 0) {
      fallos++;
      console.log(rojo('   ✗ no esta la puerta del privado en handleMessage'));
    } else {
      const iVisto = mh.indexOf('sock.readMessages?.');
      const iSwitch = mh.indexOf('switch (command)');
      const iContador = mh.indexOf("incrementStat('messagesReceived')");
      for (const [i, que] of [[iVisto, 'del visto'], [iSwitch, 'del switch de comandos'], [iContador, 'de los contadores']]) {
        if (i >= 0 && iPuerta > i) {
          fallos++;
          console.log(rojo(`   ✗ la puerta del privado esta por DEBAJO ${que}: el desconocido deja rastro igual`));
        }
      }
    }
    // Y que siga siendo solo del privado: el grupo es publico a proposito.
    if (!/!jid\.endsWith\('@g\.us'\) && !ownerEnPrivado/.test(mh)) {
      fallos++;
      console.log(rojo('   ✗ la puerta dejo de mirar si es privado: puede estar callando al grupo entero'));
    }

    // El nombre propio no viaja en cada sticker que manda el bot.
    if (/sebasti/i.test(JSON.stringify(cfg))) {
      fallos++;
      console.log(rojo('   ✗ el nombre real sigue en la config: cada sticker lo lleva en el EXIF'));
    }

    if (fallos === antes) console.log(verde('   ✓ en privado solo habla con el owner, y el owner sigue entrando'));
  }

  // ── 20. EL MENU NO ANUNCIA LO QUE NO SE PUEDE USAR ───────────────────────
  //
  // El menu se parte por nivel para no enseñarle a nadie comandos que le van a
  // rebotar. Estaba partido en dos —admin y miembro— y el bloque de ADMIN
  // llevaba trece cosas que un admin no puede tocar: los interruptores del
  // grupo, el degradado, los resets y !on/!off son isOwner.
  //
  // Y al repartirlos me equivoque en los dos sentidos, que es justo lo que esta
  // capa vigila:
  //   · leer "isOwner(" a secas mete en el bloque del dueño comandos que solo
  //     usan isOwner para EXIMIRLE (a nadie le sale !roast del owner);
  //   · quedarse con el primer simbolo de "isOwner(...) || isGroupAdmin(...)"
  //     hace owner-only a seis comandos que son de admins.
  //
  // Asi que no se deduce el nivel del nombre: se lee LA PUERTA de cada uno —la
  // expresion entera, no el primer simbolo— y se compara con el bloque donde el
  // menu lo mete.
  {
    console.log('\n20. EL MENU NO ANUNCIA LO QUE NO SE PUEDE USAR');
    const antes = fallos;
    const { cmdHelp } = require(path.join(R, 'src/commands/social'));
    const cfg = require(path.join(R, 'src/config'));
    const OWN = `${String(cfg.ownerNumber).replace(/\D/g, '')}@s.whatsapp.net`;
    const ADM = '34600000002@s.whatsapp.net';
    const RASO = '34600000003@s.whatsapp.net';
    const GRUPO = '000000000@g.us';
    const metaM = { id: GRUPO, participants: [{ id: OWN, admin: 'admin' }, { id: ADM, admin: 'admin' }, { id: RASO }] };

    const pedir = async (quien) => {
      const out = [];
      const s = { sendMessage: async (j, c) => { out.push(c); return {}; } };
      await cmdHelp(s, { key: { remoteJid: GRUPO, participant: quien, fromMe: false, id: 'X' } }, metaM);
      return out.at(-1)?.text || '';
    };
    const cmds = (txt) => new Set([...txt.matchAll(/!([a-zá-úñ0-9]+)/gi)].map((m) => m[1].toLowerCase()));

    const mOwner = await pedir(OWN), mAdmin = await pedir(ADM), mRaso = await pedir(RASO);
    const cO = cmds(mOwner), cA = cmds(mAdmin), cR = cmds(mRaso);

    // Los tres menus son uno dentro de otro. Si un comando sale para el miembro
    // y no para el owner, es que un bloque se quedo colgando de la condicion
    // equivocada.
    for (const [chico, grande, etq] of [[cR, cA, 'miembro ⊄ admin'], [cA, cO, 'admin ⊄ owner']]) {
      const fuera = [...chico].filter((x) => !grande.has(x));
      if (fuera.length) {
        fallos++;
        console.log(rojo(`   ✗ los menus dejaron de encajar (${etq}): ${fuera.join(', ')}`));
      }
    }
    if (cO.size <= cA.size || cA.size <= cR.size) {
      fallos++;
      console.log(rojo(`   ✗ los tres menus salen iguales (${cR.size}/${cA.size}/${cO.size}): el corte por nivel no esta haciendo nada`));
    }

    // LA PUERTA DE CADA UNO, LEIDA ENTERA.
    //
    // Se coge la primera linea de la funcion que menciona un permiso y las DOS
    // siguientes: ahi cabe el "|| isGroupAdmin(...)" partido en dos lineas, que
    // es la forma que me engaño. Mirar 26 lineas era demasiado (pillaba
    // comprobaciones sobre el objetivo, no sobre quien escribe) y una sola era
    // demasiado poco.
    const fuentes = {};
    for (const f of fs.readdirSync(path.join(R, 'src/commands'))) {
      if (f.endsWith('.js')) fuentes[f] = fs.readFileSync(path.join(R, 'src/commands', f), 'utf8');
    }
    fuentes['messageHandler.js'] = fs.readFileSync(path.join(R, 'src/handlers/messageHandler.js'), 'utf8');

    const puertaDe = (fn) => {
      for (const txt of Object.values(fuentes)) {
        const m = txt.match(new RegExp(`^(?:async )?function ${fn}\\s*\\(`, 'm'));
        if (!m) continue;
        const cuerpo = txt.slice(m.index).replace(/\/\/[^\n]*/g, '').split('\n');
        const i = cuerpo.findIndex((l) => /is(?:Main)?(?:Owner|GroupAdmin|Admin)\s*\(/.test(l));
        if (i < 0) return null;
        return cuerpo.slice(i, i + 3).join('\n');
      }
      return undefined;   // la funcion ya no existe
    };

    // Nivel esperado de cada comando que el menu mete en ADMIN o en OWNER.
    // !promote no esta: es el unico mixto de verdad (con !antiadmin puesto es
    // del dueño y sin el es de admins), y el menu ya lo dice en su linea.
    // !resetaura y !clearcache tampoco: su puerta vive en el dispatcher.
    const esperado = {
      admin: { kick: 'cmdKick', del: 'cmdDel', mute: 'cmdMute', unmute: 'cmdUnmute',
        tagall: 'cmdTodos', allow: 'cmdAllow', close: 'cmdClose', open: 'cmdOpen',
        count: 'cmdCount', scan: 'cmdScan', marcarfake: 'cmdMarkFake', fkban: 'cmdFkBan',
        fkunban: 'cmdFkUnban', fklist: 'cmdFkList', antifake: 'cmdAntiFake', notifadmin: 'cmdNotifAdmin' },
      owner: { demote: 'cmdDemote', on: 'cmdOn', off: 'cmdOff', antilink: 'cmdAntiLink',
        antifoto: 'cmdAntiFoto', antiempresa: 'cmdAntiBusiness', antiadmin: 'cmdAntiAdmin',
        adminmode: 'cmdSoloAdmins', aura: 'interruptor', resetcount: 'cmdResetCount',
        setgrok: 'cmdSetGrokKey', diag: 'cmdDiag' },
    };
    const mal = [], perdidas = [];
    for (const [nivel, tabla] of Object.entries(esperado)) {
      for (const [cmd, fn] of Object.entries(tabla)) {
        const puerta = puertaDe(fn);
        if (puerta === undefined) { perdidas.push(`${fn} (${cmd})`); continue; }
        if (puerta === null) { mal.push(`!${cmd} ya no comprueba permisos y el menu lo pone en ${nivel.toUpperCase()}`); continue; }
        const entraAdmin = /isGroupAdmin\s*\(|isAdmin\s*\(/.test(puerta);
        if (nivel === 'admin' && !entraAdmin) mal.push(`!${cmd} esta en ADMIN y su puerta solo deja pasar al owner`);
        if (nivel === 'owner' && entraAdmin) mal.push(`!${cmd} esta en OWNER y un admin si puede usarlo`);
      }
    }
    if (perdidas.length) {
      fallos++;
      console.log(rojo(`   ✗ no encuentro la funcion de: ${perdidas.join(', ')} — la tabla de niveles se quedo vieja`));
    }
    if (mal.length) {
      fallos++;
      for (const x of mal) console.log(rojo(`   ✗ ${x}`));
    }

    // Y que cada uno salga DONDE toca en el menu de verdad, no solo en la tabla.
    const soloAdmin = [...cA].filter((x) => !cR.has(x));
    const soloOwner = [...cO].filter((x) => !cA.has(x));
    for (const cmd of Object.keys(esperado.admin)) {
      if (!soloAdmin.includes(cmd)) {
        fallos++;
        console.log(rojo(`   ✗ !${cmd} es de admins y el menu no lo saca en el bloque de ADMIN`));
      }
    }
    for (const cmd of Object.keys(esperado.owner)) {
      if (!soloOwner.includes(cmd) && cmd !== 'aura') {   // !aura sale antes, en su seccion
        fallos++;
        console.log(rojo(`   ✗ !${cmd} es del owner y el menu no lo saca en el bloque de OWNER`));
      }
    }

    // NINGUN COMANDO DE PORCENTAJE SE PUEDE QUEDAR FUERA DEL MENU.
    //
    // Son veinticuatro nombres en una lista de messageHandler y cuatro lineas
    // sueltas en el menu: dos sitios que no se hablan. Uno nuevo se añade a la
    // lista, cobra, funciona y no lo descubre nadie porque no esta escrito.
    //
    // Los alias no cuentan como ausencia: *!L* y *!perdedor* son el MISMO case,
    // asi que con que salga uno de los dos basta. Los grupos se sacan de las
    // rafagas de "case" del dispatcher, que es donde esta la verdad de que dos
    // nombres son la misma cosa — que es justo lo que fallaba al reves cuando
    // el menu abria la lista con *!L*, un alias, en vez de con el comando.
    {
      const mh3 = fs.readFileSync(path.join(R, 'src/handlers/messageHandler.js'), 'utf8');
      const sw3 = mh3.slice(mh3.indexOf('switch (command)'));
      // Se recorre linea a linea, no con una expresion: el dispatcher escribe los
      // alias de las dos formas —"case 'x':" a solas y "case 'y': await cmd(...)"
      // en la misma linea— y una rafaga puede acabar de cualquiera de las dos.
      // Un patron que exigiera la linea limpia parte el grupo justo en el ultimo,
      // que es el que lleva el codigo; uno que la permitiera siempre pegaria
      // entre si comandos vecinos que no tienen nada que ver.
      const grupo = new Map();   // comando -> todos sus alias
      {
        let pend = [];
        const cerrar = () => { for (const n of pend) grupo.set(n, pend); pend = []; };
        for (const linea of sw3.split('\n')) {
          const m = linea.match(/^[ \t]*case '([^']+)':(.*)$/);
          if (!m) { cerrar(); continue; }
          pend.push(m[1]);
          if (m[2].trim()) cerrar();        // la rafaga acaba en la linea que trae codigo
        }
        cerrar();
      }
      const lista = mh3.match(/const CMDS_PORCENTAJE = \[([\s\S]*?)\];/);
      const pct2 = lista ? [...lista[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
      if (pct2.length < 20) {
        fallos++;
        console.log(rojo(`   ✗ solo leo ${pct2.length} comandos de porcentaje: el patron de CMDS_PORCENTAJE se rompio y esta comprobacion se quedo ciega`));
      }
      const ausentes = pct2.filter((cmd) => !(grupo.get(cmd) || [cmd]).some((a) => cR.has(a)));
      if (ausentes.length) {
        fallos++;
        console.log(rojo(`   ✗ comandos de porcentaje que cobran y el menu no nombra: ${ausentes.join(', ')}`));
      }
    }

    if (fallos === antes) console.log(verde(`   ✓ cada comando en su nivel (${cR.size}/${cA.size}/${cO.size} comandos por menu)`));
  }

  // ── 21. LOS BONOS DE ESCRIBIR SON DIARIOS, NO UN PEAJE ───────────────────
  //
  // Reportado desde el grupo: "se repite constantemente el de 200 cuando
  // literalmente es un contador de 24 horas, y solo daba +11".
  //
  // Las dos cosas eran el mismo fallo. Los hitos se daban con `count % 200`, o
  // sea cada 200 mensajes y no una vez al dia: a los 400, 600, 800 y 1.200
  // volvia a saltar. Y la cabecera estaba escrita a mano por tramo, asi que las
  // cinco veces decia "200 MENSAJES" aunque el contador fuera por 1.200 — de
  // ahi lo de "se repite". Del segundo al quinto pagaban 8-14: el +11.
  //
  // Esto se comprueba EJECUTANDO, no leyendo: el fallo no se ve en el codigo
  // (una linea con un modulo parece razonable), se ve al escribir mil mensajes.
  {
    console.log('\n21. LOS BONOS DE ESCRIBIR SON DIARIOS');
    const antes = fallos;
    if (botEnMarcha()) {
      console.log('   — saltada: el bot esta corriendo y escribiria sobre sus datos');
    } else {
      const habia = new Set(fs.readdirSync(DATA).filter((f) => f.endsWith('.json')));
      const copia = copiaSeguridad();
      try {
        for (const k of Object.keys(require.cache)) {
          if (/utils[\/\\](casino|casinoStore|auraStore|rachaStore)\.js$/.test(k)) delete require.cache[k];
        }
        for (const f of ['casino.json', 'aura.json', 'racha.json']) {
          try { fs.unlinkSync(path.join(DATA, f)); } catch {}
        }
        const { checkCasinoMilestone } = require(path.join(R, 'src/utils/casino'));
        const { PRIMERA_DEL_DIA, HITOS } = require(path.join(R, 'src/utils/economia'));
        const GB = '000000021@g.us';
        const UB = '34600000021@s.whatsapp.net';

        const avisos = [];
        const sockB = { sendMessage: async (j, c) => { avisos.push(c.text); return {}; } };
        for (let i = 1; i <= 1300; i++) await checkCasinoMilestone(sockB, GB, UB);

        if (avisos.length !== HITOS.length) {
          fallos++;
          console.log(rojo(`   ✗ 1.300 mensajes en un dia sueltan ${avisos.length} bonos y los hitos son ${HITOS.length}: el de 200 vuelve a repetirse`));
        }
        // Cada cabecera tiene que decir EL UMBRAL QUE SE CRUZO. Es la mitad del
        // fallo que se vio en el grupo, y la que lo hacia parecer un bucle.
        const cabeceras = avisos.map((a) => (a.match(/TIER (\d) · ([\d.,]+) MENSAJES/) || []).slice(1).join('|'));
        const esperadas = HITOS.map((h) => `${h.tier}|${h.n.toLocaleString('es-ES')}`);
        const esperadasLlanas = HITOS.map((h) => `${h.tier}|${h.n}`);
        const bien = cabeceras.every((c, i) => c === esperadas[i] || c === esperadasLlanas[i]);
        if (!bien) {
          fallos++;
          console.log(rojo(`   ✗ las cabeceras no dicen el hito que se cruzo: ${cabeceras.join(' · ')}`));
        }
        // El de 200 tiene que llevar el extra plano. Es lo que pidio el dueño
        // ("al menos 75 por 200 mensajes") y sin el vuelve a pagar calderilla.
        const primero = Number((avisos[0]?.match(/\+([\d.,]+) de aura/) || [])[1]?.replace(/[.,]/g, ''));
        if (!(primero >= PRIMERA_DEL_DIA)) {
          fallos++;
          console.log(rojo(`   ✗ el bono de 200 paga ${primero} y el extra plano solo ya son ${PRIMERA_DEL_DIA}: no se esta aplicando`));
        }
        // Y los siguientes NO lo llevan: si lo llevaran, compoundaria con el
        // volumen, que es lo que obligo a que el extra fuera plano.
        const resto = avisos.slice(1).map((a) => Number((a.match(/\+([\d.,]+) de aura/) || [])[1]?.replace(/[.,]/g, '')));

        // El dia siguiente: la ventana caduca y los tres hitos vuelven a estar
        // disponibles. Sin esto, un `hitos` que no se limpiara dejaria al grupo
        // entero sin bonos para siempre y nadie sabria por que.
        const cs = require(path.join(R, 'src/utils/casinoStore'));
        await cs.flushCasino();
        const raw = JSON.parse(fs.readFileSync(path.join(DATA, 'casino.json'), 'utf8'));
        raw[GB].dia = '1999-01-01';   // el dia guardado ya no es hoy: toca reinicio
        fs.writeFileSync(path.join(DATA, 'casino.json'), JSON.stringify(raw));
        for (const k of Object.keys(require.cache)) {
          if (/utils[\/\\](casino|casinoStore)\.js$/.test(k)) delete require.cache[k];
        }
        const { checkCasinoMilestone: cm2 } = require(path.join(R, 'src/utils/casino'));
        const avisos2 = [];
        const sock2 = { sendMessage: async (j, c) => { avisos2.push(c.text); return {}; } };
        for (let i = 1; i <= 250; i++) await cm2(sock2, GB, UB);
        if (avisos2.length !== 1) {
          fallos++;
          console.log(rojo(`   ✗ al caducar la ventana de 24 h el hito de 200 sale ${avisos2.length} veces en vez de 1: los hitos cobrados no se reinician`));
        }

        // Dos mensajes que cruzan el umbral a la vez NO pueden cobrar dos veces.
        // El pipeline llama a esto sin await, asi que es una carrera real.
        for (const f of ['casino.json', 'aura.json', 'racha.json']) {
          try { fs.unlinkSync(path.join(DATA, f)); } catch {}
        }
        for (const k of Object.keys(require.cache)) {
          if (/utils[\/\\](casino|casinoStore|auraStore|rachaStore)\.js$/.test(k)) delete require.cache[k];
        }
        const { checkCasinoMilestone: cm3 } = require(path.join(R, 'src/utils/casino'));
        const GC = '000000022@g.us';
        let dobles = 0;
        const sock3 = { sendMessage: async () => { dobles++; return {}; } };
        for (let i = 1; i <= 198; i++) await cm3(sock3, GC, UB);
        await Promise.all([cm3(sock3, GC, UB), cm3(sock3, GC, UB), cm3(sock3, GC, UB), cm3(sock3, GC, UB)]);
        if (dobles !== 1) {
          fallos++;
          console.log(rojo(`   ✗ cuatro mensajes a la vez cruzando el 200 cobran ${dobles} bonos: se paga por duplicado`));
        }

        // EL CORTE ES A HORA FIJA, y cae donde dice.
        //
        // Era una ventana deslizante de 24 h: el dia nuevo empezaba con el
        // primer mensaje despues de caducar el anterior, asi que el reinicio se
        // corria unas horas cada dia hasta acabar cayendo a cualquier hora.
        // Ahora corta a la hora de CONTADOR, y esta guarda lo comprueba EN LOS
        // DIAS DEL CAMBIO DE HORA, que es donde se rompen estas cosas: sumar
        // 24 h a mano habria descuadrado el corte una hora dos veces al año.
        {
          const { DIA } = require(path.join(R, 'src/utils/economia'));
          const cs2 = require(path.join(R, 'src/utils/casinoStore'));
          const hh = String(DIA.horaCorte).padStart(2, '0');
          const momentos = [
            ['visperas del salto adelante', Date.UTC(2026, 2, 7, 20, 0)],
            ['el dia del salto adelante',   Date.UTC(2026, 2, 8, 19, 0)],
            ['visperas del salto atras',    Date.UTC(2026, 9, 31, 19, 0)],
            ['el dia del salto atras',      Date.UTC(2026, 10, 1, 20, 0)],
            ['un minuto antes del corte',   Date.UTC(2026, 7, 22, 3, 59)],
            ['un minuto despues',           Date.UTC(2026, 7, 22, 4, 1)],
            // Los cambios de hora de Madrid entran aqui porque la racha y el
            // objetivo del dia vivian en ese huso: si alguien los devuelve alli,
            // estos dos momentos lo cazan.
            ['cambio de hora en Madrid',    Date.UTC(2026, 2, 29, 12, 0)],
            ['cambio de hora en Madrid',    Date.UTC(2026, 9, 25, 12, 0)],
          ];
          for (const [etq, ts] of momentos) {
            const cae = new Date(ts + cs2.msHastaCorte(ts))
              .toLocaleString('sv-SE', { timeZone: DIA.zona });
            if (!new RegExp(` ${hh}:00:0[01]$`).test(cae)) {
              fallos++;
              console.log(rojo(`   ✗ ${etq}: el corte cae a las ${cae.slice(11)} en ${DIA.zona} y tiene que caer a las ${hh}:00`));
            }
          }
          // Y el dia tiene que ser UNO SOLO de corte a corte: todo lo que cae
          // entre dos cortes comparte clave, y lo que pasa el corte ya no.
          //
          // Escrito asi y no comparando dos horas concretas a proposito: la
          // primera version daba por hecho que el corte es a medianoche, y al
          // mover la hora acusaba de deslizarse a un contador que estaba bien.
          // Una guarda que solo vale para el valor de hoy no protege el ajuste.
          // EL BOT TIENE UN SOLO DIA, Y UNA SOLA FORMA DE CALCULARLO.
          //
          // El calculo estaba escrito TRES veces —contador, racha y objetivo del
          // dia— y las tres restaban las horas al instante antes de formatear,
          // que se desvia sesenta minutos los dos dias del año en que cambia la
          // hora. Ademas la racha y el objetivo cortaban en Madrid y el contador
          // en Nueva York: dos "hoy" a una hora de distancia.
          //
          // SE BARRE EL DIA ENTERO, no se comparan tres instantes sueltos. La
          // primera version de esta guarda elegia timestamps a mano y los tres
          // caian a mediodia UTC, donde Madrid y Nueva York dan LA MISMA fecha:
          // pasaba en verde con el objetivo del dia devuelto a Madrid a proposito.
          // Un muestreo cada quince minutos no tiene donde esconderse.
          {
            const { claveDia } = require(path.join(R, 'src/utils/helpers'));
            const od = require(path.join(R, 'src/utils/objetivoDia'));
            const rs = require(path.join(R, 'src/utils/rachaStore'));
            const anclas = [
              Date.UTC(2026, 7, 21), Date.UTC(2026, 2, 8), Date.UTC(2026, 10, 1),
              Date.UTC(2026, 2, 29), Date.UTC(2026, 9, 25),
            ];
            const discrepan = [];
            for (const base of anclas) {
              for (let m = 0; m < 48 * 60 && discrepan.length < 4; m += 15) {
                const ts = base + m * 60000;
                const esperada = claveDia(ts, DIA.zona, DIA.horaCorte);
                for (const [quien, val] of [['contador', cs2.diaDe(ts)], ['racha', rs.diaDe(ts)], ['objetivo del dia', od.diaClave(ts)]]) {
                  if (val !== esperada) discrepan.push(`el ${quien} dice ${val} y el dia del bot es ${esperada} (${new Date(ts).toISOString()})`);
                }
              }
            }
            if (discrepan.length) {
              fallos++;
              for (const d of discrepan) console.log(rojo(`   ✗ hay dos "hoy" distintos: ${d}`));
            }
            // Y que no vuelva una copia del calculo. Se mira que ninguno de los
            // tres se fabrique su propio formateador de fechas: si delega en
            // helpers no lo necesita, y si lo tiene es que se lo ha vuelto a
            // escribir. El patron viejo exacto no vale como señal — el mutante
            // que probe escribia el 5 a mano en vez de leer horaCorte.
            // EL AYUDANTE, COMPROBADO POR SUS PROPIEDADES Y EN VARIOS HUSOS.
            //
            // Comparar las tres piezas contra claveDia no basta: si el que se
            // rompe es claveDia, las tres coinciden en la respuesta equivocada.
            // Y con Nueva York (huso negativo) algunos errores no se ven —
            // probado: cambiar el calculo del dia anterior por una resta cruda
            // de 24 h da lo mismo aqui y falla en Madrid. Asi que se comprueban
            // PROPIEDADES, en husos de los dos signos:
            //
            //   · a lo largo de N dias salen exactamente N claves distintas,
            //   · cada una es el dia natural siguiente de la anterior,
            //   · y el salto ocurre justo al dar la hora de corte local.
            for (const zona of ['America/New_York', 'Europe/Madrid', 'America/Bogota', 'Asia/Katmandu']) {
              for (const hc of [0, 5, 23]) {
                const vistas = [];
                const base = Date.UTC(2026, 2, 6);   // cruza el cambio de hora de EE. UU.
                for (let m = 0; m < 6 * 24 * 60; m += 10) {
                  const k = claveDia(base + m * 60000, zona, hc);
                  if (k !== vistas[vistas.length - 1]) vistas.push(k);
                }
                let roto = null;
                for (let i = 1; i < vistas.length; i++) {
                  const a = new Date(`${vistas[i - 1]}T12:00:00Z`).getTime();
                  const b = new Date(`${vistas[i]}T12:00:00Z`).getTime();
                  if (!Number.isFinite(a) || !Number.isFinite(b)) { roto = `clave ilegible (${vistas[i - 1]} -> ${vistas[i]})`; break; }
                  if (Math.round((b - a) / 86400000) !== 1) { roto = `${vistas[i - 1]} -> ${vistas[i]} no son dias seguidos`; break; }
                }
                if (!roto && vistas.length !== 7) roto = `en 6 dias salen ${vistas.length} claves y tendrian que salir 7`;
                if (roto) {
                  fallos++;
                  console.log(rojo(`   ✗ claveDia en ${zona} con corte a las ${hc}: ${roto}`));
                }
              }
            }

            const copias = [];
            for (const f of ['casinoStore.js', 'rachaStore.js', 'objetivoDia.js']) {
              const src = fs.readFileSync(path.join(R, 'src/utils', f), 'utf8').replace(/\/\/[^\n]*/g, '');
              if (/Intl\.DateTimeFormat/.test(src)) copias.push(f);
            }
            if (copias.length) {
              fallos++;
              console.log(rojo(`   ✗ ${copias.join(', ')} se fabrica otra vez su propio calculo del dia: tiene que salir de claveDia`));
            }
          }

          for (const ancla of [Date.UTC(2026, 7, 22, 4, 1), Date.UTC(2026, 2, 8, 19, 0), Date.UTC(2026, 10, 1, 20, 0)]) {
            const corte = ancla + cs2.msHastaCorte(ancla);
            const dentro = [corte - 2000, corte - 6 * 3600 * 1000, corte - 23 * 3600 * 1000];
            const clave = cs2.diaDe(dentro[0]);
            if (!dentro.every((x) => cs2.diaDe(x) === clave)) {
              fallos++;
              console.log(rojo(`   ✗ el dia se parte por dentro (${dentro.map((x) => cs2.diaDe(x)).join(' / ')}): el contador se reinicia a media tarde`));
            }
            if (cs2.diaDe(corte + 2000) === clave) {
              fallos++;
              console.log(rojo('   ✗ pasado el corte sigue siendo el mismo dia: el contador no se reinicia nunca'));
            }
          }
        }

        if (fallos === antes) {
          console.log(verde(`   ✓ tres bonos al dia (${resto.length + 1}), cabecera correcta, extra plano solo en el primero, corte a hora fija y vuelven mañana`));
        }
      } finally {
        for (const k of Object.keys(require.cache)) {
          if (/utils[\/\\](casino|casinoStore|auraStore|rachaStore)\.js$/.test(k)) delete require.cache[k];
        }
        restaurar(copia, habia);
      }
    }
  }

  // ── 16. EL MENSAJE DEL ROBO NO SE REPITE A SI MISMO ──────────────────────
  //
  // La nota llego a decir la misma cosa dos veces con palabras distintas:
  // "punto dulce 30 de 66 ... · punto dulce", y despues "cobarde · sin agallas
  // (−6%)". Son la misma etiqueta de riesgo saliendo por dos sitios — el sello
  // de etiquetaRiesgo y el motivo de ajustarProbabilidad. Comparar las cadenas
  // no lo pilla: usan palabras distintas para lo mismo.
  {
    console.log('\n16. EL MENSAJE DEL ROBO NO SE REPITE');
    const rb = soloCodigo('src/commands/robo.js');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    // El sello de riesgo se quito entero. Primero solo cuando coincidia con un
    // motivo ("cobarde · sin agallas (−6%)"); despues tambien en el caso del
    // punto dulce, porque etiquetar unos numeros que estan al lado no aporta.
    exige(!/const notaSello/.test(rb) && !/etiquetaRiesgo/.test(rb),
      'volvio el sello de riesgo a la nota: es una etiqueta para unos numeros que se leen solos');
    // Y la cifra pedida no se repite en la nota: ya sale en el titular y en el
    // saldo. Lo unico que aporta la nota es el TOPE.
    exige(/tope \$\{fmt\(maxStake\)\}/.test(rb) && !/\$\{fmt\(stake\)\} de \$\{fmt\(maxStake\)\}/.test(rb),
      'la nota vuelve a repetir la cifra pedida: ya sale dos veces mas arriba');
    // El consejo de la cifra no puede volver a salir en cada robo.
    exige(/pistaCifra\(jid, sender\)/.test(rb) && /function pistaCifra/.test(rb),
      'el consejo de *!robo @alguien 200* volvio a salir en todos los robos: un consejo repetido cien veces no enseña nada');
    // Y no se explica con una frase lo que el numero de al lado ya dice.
    exige(!/Se le cayó todo encima/.test(rb),
      'volvio la linea que narra lo que las cifras de dos lineas mas abajo ya enseñan');

    if (fallos === antes) console.log(verde('   ✓ la nota no dice dos veces lo mismo ni repite el tutorial'));
  }

  // ── 14. UN ROBO FALLIDO DICE CUANTO SE INTENTO ROBAR ─────────────────────
  //
  // El titular decia solo "intentó robarle a @V y le salió como el puto culo".
  // La unica cifra visible era la MULTA, y una multa no es lo que fuiste a
  // robar: quien lo lee no sabe si el otro iba a por 50 o a por 4.000, que es
  // justo lo que hace que el fallo tenga gracia. Lo intentado vivia en la nota
  // tecnica de abajo, en cursiva y pequeño, donde no se lee.
  {
    console.log('\n14. UN ROBO FALLIDO DICE CUANTO SE INTENTO');
    const rb = soloCodigo('src/commands/robo.js');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    exige(/intentó robarle \*\$\{fmt\(stake\)\}\* a \$\{vTag\}/.test(rb),
      'el titular del robo fallido perdio la cifra: solo se ve la multa, que no es lo que se intento robar');
    // Y que sea `stake`, no `monto`: a esa altura `monto` ya vale la multa, asi
    // que enseñarlo diria dos veces lo mismo y ninguna la verdad.
    exige(!/intentó robarle \*\$\{fmt\(monto\)\}\*/.test(rb),
      'el titular usa `monto`, que a esa altura ya es la multa, no lo que se pidio');

    if (fallos === antes) console.log(verde('   ✓ el fallo enseña lo que se fue a robar, no solo la multa'));
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
    exige(/jugarApuesta\(sock, msg, groupMeta, \(args \|\| \[\]\)\.slice\(1\)\)/.test(auraSrc),
      '*!aura todo* es atajo de la mesa: sin slice el parser lo lee como all-in y se juega el saldo entero');
    exige(/anuncioObjetivo\.get\(jid\) !== hoy/.test(auraSrc),
      'el objetivo del día no se puede mencionar en cada tirada: es el mismo ping-spam que se cortó en !aura top');
    // El cooldown de !aura top se reclamaba DESPUES de await getAuraRanking, y
    // dos peticiones a la vez publicaban las dos. El set tiene que quedar
    // delante de la lectura que publica (la ultima getAuraRanking del cuerpo).
    // Y si el ranking no sale, hay que devolverlo: si no, un "no ha cambiado"
    // esconde el top tres horas, que es el otro bug que ya se rompio.
    {
      const cuerpo = auraSrc.slice(auraSrc.indexOf('async function showRanking'),
                                   auraSrc.indexOf('function textoAuraInfo'));
      const iSet = cuerpo.indexOf('ultimoRanking.set(');
      const iGet = cuerpo.lastIndexOf('getAuraRanking(');
      exige(iSet >= 0 && iSet < iGet,
        '!aura top: el cooldown se reclama despues de leer el ranking — dos peticiones a la vez lo saltan las dos');
      exige(/ultimoRanking\.delete\(jid\)/.test(cuerpo),
        '!aura top: si el ranking no sale hay que devolver el cooldown, o un "no ha cambiado" esconde el top');
    }
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

  // ── Contratos que se rompieron en silencio y no tocan data/ ───────────────
  //
  // Van FUERA de capaStores: esa capa se salta si el bot esta corriendo, y
  // estas comprobaciones solo leen fuente. Si viven alli, el bug vuelve a
  // colarse en produccion porque el check diario no las ve.
  {
    console.log('\n22. AMAÑO, METADATA Y EL 403 DEL OWNER');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const mh = fs.readFileSync(path.join(R, 'src/handlers/messageHandler.js'), 'utf8');
    const pct = fs.readFileSync(path.join(R, 'src/commands/percent.js'), 'utf8');
    const pools = fs.readFileSync(path.join(R, 'src/data/percentLabels.js'), 'utf8');
    const part = fs.readFileSync(path.join(R, 'src/utils/participantes.js'), 'utf8');
    const bot = fs.readFileSync(path.join(R, 'src/bot.js'), 'utf8');

    const m = mh.match(/const NEEDS_META = new Set\(\[([\s\S]*?)\]\);/);
    const dentro = new Set([...(m?.[1] || '').matchAll(/'([^']+)'/g)].map((x) => x[1]));
    const gruposMeta = [...mh.matchAll(/((?:\s*case '[^']+':[^\n]*\n)+)\s*await (cmdAura|cmdRobo|cmdDar|cmdHelp|cmdCasino|cmdCacheList)\(/g)];
    const faltan = [];
    for (const g of gruposMeta) {
      const alias = [...g[1].matchAll(/case '([^']+)'/g)].map((x) => x[1]);
      faltan.push(...alias.filter((a) => !dentro.has(a)));
    }
    exige(faltan.length === 0,
      `NEEDS_META: faltan alias de aura/robo/dar/ayuda/casino: ${faltan.join(', ')}`);
    exige(/case 'auratop':/.test(mh) && dentro.has('auratop'),
      '*!auratop* tiene que ser alias del ranking y pedir metadata: si no, o no existe o lista a quien ya se fue');

    // LAS DOS LISTAS DE "TIRA UNIFORME" TIENEN QUE DECIR LO MISMO.
    //
    // La decision esta escrita en dos sitios: la lista de percent.js, que es la
    // que manda, y el `uniforme: true` de percentLabels.js, que la explica al
    // lado de las frases. Tocar solo uno deja el fichero de datos mintiendo
    // sobre lo que hace el bot — y ahi no hay error, ni aviso, ni nada: solo
    // alguien leyendo una linea que ya no es verdad. Casi pasa al sacar !linda
    // y !fea de la curva.
    //
    // Se comprueba la coincidencia, no QUIENES son: la lista puede cambiar.
    const enCodigo = new Set([...(pct.match(/for \(const k of \[([^\]]*)\]\) \{\n\s*if \(LABELS\[k\]\) LABELS\[k\]\.roll = rollUniform;/) || [])[1]
      ?.matchAll(/'([^']+)'/g) || []].map((m) => m[1]));
    const enDatos = new Set();
    for (const m of pools.matchAll(/\n  ([a-zá-úñ]+):\s*\{[\s\S]{0,300}?uniforme:\s*true/g)) enDatos.add(m[1]);
    exige(enCodigo.size > 0, 'no encuentro la lista de comandos que tiran uniforme en percent.js');
    const soloCod = [...enCodigo].filter((k) => !enDatos.has(k));
    const soloDat = [...enDatos].filter((k) => !enCodigo.has(k));
    exige(soloCod.length === 0 && soloDat.length === 0,
      `uniforme: percent.js y percentLabels.js no coinciden (solo en el codigo: ${soloCod.join(', ') || '—'}; solo en los datos: ${soloDat.join(', ') || '—'})`);
    const of = pct.match(/const OWNER_FORCE = \{([\s\S]*?)\n\};/);
    const keys = of ? [...of[1].matchAll(/\b([a-z]+):/g)].map((x) => x[1]) : [];
    const extras = keys.filter((k) => k !== 'fiel' && k !== 'infiel');
    exige(extras.length === 0,
      `percent: OWNER_FORCE no puede reaplicar el amaño de rollPercent; sobran: ${extras.join(', ')}`);

    exige(/filas:\s*res/.test(part),
      'aplicarParticipantes tiene que devolver las filas crudas (el 403 trae add_request ahi)');
    exige(/rAlta\.filas/.test(bot),
      'bot.js tiene que leer rAlta.filas al revertir una expulsion del owner');
    exige(/withTimeout\(sock\.groupMetadata/.test(mh),
      'getGroupMeta tiene que cancelar su timer: si no, cada comando loguea un timeout 8s despues');
    exige(/function withTimeout/.test(fs.readFileSync(path.join(R, 'src/utils/helpers.js'), 'utf8')),
      'withTimeout vive en helpers y lo usan metadata, version de Baileys, scan y antifoto');

    // EL REPARTO DEL OWNER: SIMETRICO, VENTAJOSO Y NO PERFECTO.
    //
    // Las dos ramas (positivos y peyorativos) tienen que moverse juntas o al
    // dueño le sale bien en una cosa y regular en la otra. Estaban escritas con
    // los numeros a pelo en cada rama; ahora salen de OWNER_SOSO/OWNER_BUENO y
    // esto lo vigila.
    //
    // Y se mide EJECUTANDO, no leyendo las constantes: lo que importa es lo que
    // sale por pantalla. Tres cosas — que gane de calle, que pueda salirle mal
    // alguna vez (no fallar nunca es el patron que delata), y que no sea tan
    // frecuente como para que el amaño no se note en su propia mesa.
    exige(/rand < OWNER_SOSO\) return suaveMalo\(\)/.test(pct) && /rand < OWNER_SOSO\) return suave\(\)/.test(pct),
      'las dos ramas del owner volvieron a llevar el reparto a pelo: se desincronizan al primer ajuste');
    {
      const cuerpo = pct.slice(pct.indexOf('function rollPercent'), pct.indexOf('\n}\n', pct.indexOf('function rollPercent')) + 2);
      const consts = pct.match(/const OWNER_SOSO\s*=\s*([\d.]+);[\s\S]*?const OWNER_BUENO\s*=\s*([\d.]+);/);
      // eslint-disable-next-line no-eval
      const rollPercent = eval(`(() => { const OWNER_SOSO=${consts?.[1]}, OWNER_BUENO=${consts?.[2]}; ${cuerpo} return rollPercent; })()`);
      const N = 40000;
      const medir = (good, own) => {
        let suma = 0, mal = 0;
        for (let i = 0; i < N; i++) {
          const v = rollPercent(good, false, own);
          suma += v;
          if (good ? v <= 30 : v >= 70) mal++;
        }
        return { media: suma / N, mal: mal / N };
      };
      for (const good of [true, false]) {
        const o = medir(good, true), m = medir(good, false);
        const etq = good ? 'positivos' : 'peyorativos';
        const ventaja = good ? o.media - m.media : m.media - o.media;
        exige(ventaja > 20, `${etq}: al owner solo le sacan ${Math.round(ventaja)} puntos de ventaja sobre un miembro; el amaño dejo de amañar`);
        exige(o.mal > 0.02, `${etq}: al owner no le sale mal NUNCA (${Math.round(100 * o.mal)} %) y eso es justo el patron que lo delata`);
        exige(o.mal < 0.30, `${etq}: al owner le sale mal el ${Math.round(100 * o.mal)} % de las veces; con eso el amaño no se nota ni en su propia mesa`);
      }
    }

    if (fallos === antes) console.log(verde('   ✓ amaño de % coherente, metadata en las puertas propias, 403 con invitacion'));
  }

  // ── 23. "NO LO SE" NO ES LO MISMO QUE "NO HAY COLA" ──────────────────────
  //
  // El anti-admin sanciona a quien mete gente a dedo. Para no castigar a quien
  // solo APRUEBA una solicitud (WhatsApp manda el mismo evento en los dos
  // casos) se puso una puerta: sin sondeo fresco de la cola, no se sanciona.
  //
  // Esa puerta miraba `sondeoReciente`, que solo se marca cuando la lista se lee
  // CON EXITO. Un grupo que devuelve forbidden entra en un freno de seis horas y
  // no se marca nunca — asi que la sancion quedaba apagada PARA SIEMPRE ahi.
  //
  // Y forbidden significa dos cosas opuestas: que el bot no es admin (no se
  // puede saber, y da igual porque tampoco podria degradar), o que el grupo NO
  // PIDE APROBACION para entrar. En el segundo no hay cola que consultar, o sea
  // que el alta es a dedo por definicion: el caso mas claro que existe, y era
  // justo el que se perdonaba.
  //
  // Se comprueba ejecutando, porque la diferencia esta en el estado interno del
  // freno y no se ve leyendo la linea de la puerta.
  {
    console.log('\n23. EL ANTI-ADMIN NO SE APAGA SOLO');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const jr = require(path.join(R, 'src/utils/joinRequests'));
    const GJ = '000000023@g.us';

    jr._reset();
    exige(!jr.colaConocida(GJ, true), 'recien arrancado se sanciona sin saber que habia en la cola');
    jr._marcarSondeo(GJ);
    exige(jr.colaConocida(GJ, true), 'con el sondeo fresco no se sanciona: la sancion no llega nunca');
    jr._reset();
    jr._marcarSondeo(GJ, Date.now() - (jr.SONDEO_VALIDO_MS + 1000));
    exige(!jr.colaConocida(GJ, true), 'un sondeo caducado se toma por bueno');

    jr._reset();
    await jr.sondear({ groupRequestParticipantsList: async () => { throw new Error('forbidden'); } }, GJ);
    exige(jr.colaConocida(GJ, true),
      'grupo sin aprobacion de entrada y el bot de admin: la sancion se queda apagada para siempre, que es el fallo que esto vigila');
    exige(!jr.colaConocida(GJ, false),
      'sin ser admin se sanciona: ahi no hay forma de saber si fue una aprobacion');

    jr._reset();
    await jr.sondear({ groupRequestParticipantsList: async () => { throw new Error('timed out'); } }, GJ);
    exige(!jr.colaConocida(GJ, true),
      'un fallo de red se confunde con "el grupo no pide aprobacion"');
    jr._reset();

    // Y que bot.js siga preguntandolo con la metadata: sin el segundo argumento
    // colaConocida no puede distinguir los dos forbidden y vuelve el agujero.
    const bot2 = fs.readFileSync(path.join(R, 'src/bot.js'), 'utf8').replace(/\/\/[^\n]*/g, '');
    exige(/colaConocida\(groupJid, isBotAdmin\(/.test(bot2),
      'bot.js dejo de pasarle a colaConocida si el bot es admin: sin eso no distingue los dos forbidden');
    exige(!/if \(!sondeoReciente\(groupJid\)\)/.test(bot2),
      'la puerta del anti-admin volvio a mirar solo el sondeo');

    if (fallos === antes) console.log(verde('   ✓ solo se perdona el alta cuando de verdad no se puede saber'));
  }

  // ── 24. EL RESUMEN DE `npm run estado` NO ESCONDE NADA ───────────────────
  //
  // `estado` pasó a tener dos salidas: un resumen (lo que se ve al escribirlo)
  // y el detalle entero detrás de -v. Un resumen sirve mientras se pueda
  // confiar en él, y solo se puede confiar si NO calla nada que pida atención:
  // el día que un aviso se quede fuera por brevedad, el modo corto pasa a ser
  // peor que no tener nada, porque se lee como "todo bien".
  //
  // Se comprueba ejecutando los dos modos y cruzándolos. Con solo `node` en el
  // PATH (sin git ni pm2) tarda 60 ms y todas las comprobaciones fallan, que es
  // justo el caso que interesa: el resumen tiene que enseñarlas todas.
  {
    console.log('\n24. EL RESUMEN DE `estado` NO ESCONDE NADA');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'estado-'));
    try {
      fs.symlinkSync(process.execPath, path.join(dir, 'node'));
      const correr = (args) => {
        try {
          return execSync(`node ${path.join(R, 'scripts/estado.js')} ${args}`,
            { encoding: 'utf8', env: { ...process.env, PATH: dir }, timeout: 30000, stdio: ['ignore', 'pipe', 'ignore'] });
        } catch (e) {
          // estado sale con 1 cuando hay problemas: eso es exito para nosotros.
          return e.stdout || '';
        }
      };
      const limpio = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
      const corto = limpio(correr(''));
      const largo = limpio(correr('-v'));

      exige(corto.trim().length > 0 && largo.trim().length > 0,
        'estado no imprime nada en uno de los dos modos');

      // Lo que pide atencion en el detalle tiene que estar TAMBIEN en el resumen.
      const pendientes = (s) => s.split('\n')
        .filter((l) => /^\s*[✘!]\s/.test(l))
        .map((l) => l.replace(/^\s*[✘!]\s+/, '').trim());
      const enLargo = pendientes(largo);
      const enCorto = new Set(pendientes(corto));
      const ocultos = enLargo.filter((x) => !enCorto.has(x));
      exige(enLargo.length > 0,
        'sin git ni pm2 el detalle no reporta ni un problema: la comprobacion se quedo ciega');
      exige(ocultos.length === 0,
        `el resumen se calla ${ocultos.length} aviso(s) que si salen con -v: ${ocultos.slice(0, 2).join(' · ')}`);

      // Y que siga siendo un resumen. Si crece hasta el detalle, no resume nada.
      exige(corto.split('\n').length < largo.split('\n').length,
        'el resumen ya no es mas corto que el detalle');
      exige(/estado -v/.test(corto),
        'el resumen no dice como ver el detalle: quien necesite mas no sabra que existe');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    if (fallos === antes) console.log(verde('   ✓ el modo corto resume, pero no oculta ni un aviso'));
  }

  console.log(`\n${'─'.repeat(70)}`);
  if (fallos) {
    console.log(rojo(`${fallos} fallo(s). NO commitees esto.`));
    process.exit(1);
  }
  console.log(verde('El bot arranca, carga y responde.'));
})();
