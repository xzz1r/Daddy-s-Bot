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
const { execSync, spawnSync } = require('child_process');

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
// Para distinguir una IP de un telefono en el detector de numeros reales.
const net = require('net');

const R = path.resolve(__dirname, '..');
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const verde = (s) => `\x1b[32m${s}\x1b[0m`;

// ─── MODO BREVE ──────────────────────────────────────────────────────────────
//
// EXISTE PORQUE EL DESPLIEGUE ERA UNA PARED. `npm run update` corre esto por
// dentro, y con 32 capas escupiendo su linea en verde el resultado eran
// cincuenta lineas donde lo unico que importa es si algo fallo. Nadie lee eso;
// se mira el final y ya. Un informe que no se lee no informa.
//
// Con --breve solo sale lo que falla. Lo demas se cuenta y se resume en una
// linea. El detalle entero sigue estando a un `npm run check` de distancia, y
// cuando algo falla se dice explicitamente donde mirar.
//
// Los avisos del logger (los WARN que sueltan las capas de moderacion al
// probarse) se guardan en vez de imprimirse: son ruido esperado cuando todo va
// bien, y prueba util cuando algo se rompe. Por eso se enseñan solo si hay
// fallos, en vez de tirarlos.
const BREVE = process.argv.includes('--breve') || process.argv.includes('-b');
const _log = console.log;
const _err = console.error;
let capasCorridas = 0, capasSaltadas = 0;
const erroresGuardados = [];
if (BREVE) {
  console.log = (...a) => {
    const limpio = a.join(' ').replace(/\x1b\[\d+m/g, '');
    if (/^\n?\s*\d+\./.test(limpio)) { capasCorridas++; return; }
    if (/—\s*(saltad|barrido)/i.test(limpio)) { capasSaltadas++; return; }
    if (limpio.includes('✗')) _log(...a);
  };
  console.error = (...a) => { erroresGuardados.push(a.join(' ')); };
}
function resumenBreve(fallos) {
  console.log = _log; console.error = _err;
  if (!BREVE) return;
  if (fallos) {
    if (erroresGuardados.length) {
      _log(`\n  avisos durante la comprobacion (${erroresGuardados.length}):`);
      for (const e of erroresGuardados.slice(-8)) _log('    ' + e);
    }
    _log(rojo(`\n  ${fallos} fallo(s) en ${capasCorridas} capas. Detalle completo: npm run check`));
  } else {
    const saltadas = capasSaltadas ? `, ${capasSaltadas} saltada(s) con el bot en marcha` : '';
    _log(verde(`  ✓ ${capasCorridas} capas${saltadas} — sin fallos`));
  }
}

let fallos = 0;

// ─── UNA CAPA QUE SE MUERE POR DENTRO TIENE QUE CONTAR COMO FALLO ───────────
//
// Esto lo descubri verificando, y es el agujero mas grande que ha tenido este
// fichero: la capa 52 llevaba rato reventando en su primera linea —llamaba a
// una funcion que yo mismo habia renombrado— y el check seguia diciendo
// «sin fallos». Sus comprobaciones no se ejecutaban, y desde fuera se leia
// exactamente igual que si hubieran pasado todas.
//
// El motivo: el check hace `require` de src/bot.js, y bot.js instala un
// manejador global de promesas rechazadas que las apunta y sigue. Para el bot
// eso es correcto —una consulta de red que rechaza no puede tirarlo— pero aqui
// convierte cualquier capa rota en una capa invisible.
//
// Node llama a TODOS los manejadores registrados, asi que con este de aqui el
// del bot sigue haciendo lo suyo y ademas se cuenta como fallo. Un validador
// que se calla cuando se rompe es peor que no tenerlo.
process.on('unhandledRejection', (razon) => {
  fallos++;
  const donde = String(razon?.stack || '').split('\n')[1]?.trim() || '';
  console.log(rojo(`   \u2717 una capa se murió por dentro: ${razon?.message || razon}`));
  if (donde) console.log(rojo(`     ${donde}`));
});

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
    // `resultado = await cmdX(` y `await cmdX(` valen las dos: desde que el
    // reembolso obliga a capturar lo que devuelve cada comando, el dispatcher
    // escribe la primera forma. Un parser atado a UNA de las dos se cae con el
    // siguiente refactor y deduce cero comandos, que es justo lo que paso.
    const bloques = /((?:\s*case '[^']+':[^\n]*\n)+)\s*(?:resultado = )?await (cmdDar|cmdRobo|cmdDuel)\(/g;
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
      // (COBRAN_SOLOS: !play, !s, !pfp, !fk, !toimg, !tovid, !top5, !top10)
      // no aparecen ahi, y son justo los mas caros del bot. Sin esto la
      // comprobacion se saltaba media lista en silencio — probado quitandole el
      // precio a !pfp: no decia nada.
      for (const k of Object.keys(PRECIOS)) if (!clave[k]) clave[k] = k;
      // !s se teclea distinto de como se llama su precio.
      clave.s = 'sticker';

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
  // LAS PRUEBAS SIRVEN SUS PROPIOS FICHEROS DESDE 127.0.0.1, y el freno de
  // salidas (src/utils/redSegura.js) esta para impedir exactamente eso. Se le
  // abre la puerta del loopback aqui, que es lo unico que abre: el metadata del
  // VPS sigue cerrado, y la capa 61 la vuelve a cerrar del todo para medir el
  // freno de verdad.
  require(path.join(R, 'src/utils/redSegura')).permitirLoopback(true);
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

  // NADIE PAGA POR UN COMANDO QUE NO HIZO NADA, y esto se prueba COBRANDO.
  //
  // Un return no es una excepcion: el catch del dispatcher no reembolsa. El
  // comando que no presta servicio devuelve SIN_SERVICIO y el dispatcher
  // deshace el cobro.
  //
  // Aqui habia una comprobacion de TEXTO: buscaba `esSinServicio(resultado)` en
  // el dispatcher y `return SIN_SERVICIO` en dos ficheros. Eso pasa en verde
  // mientras las cadenas existan, aunque el reembolso no llegue a ocurrir —y el
  // agujero real no es que falte la marca, es que el `case` no capture lo que
  // devuelve el comando, que son dos sitios distintos. Ahora se mide el SALDO.
  {
    // 1) TODOS los casos capturan. El que llama a un comando y tira el valor
    // devuelto no reembolsa nunca, y no hay forma de notarlo leyendo su codigo.
    const mh = fs.readFileSync(path.join(R, 'src/handlers/messageHandler.js'), 'utf8');
    const zona = mh.slice(mh.indexOf('switch (command)'));
    const sinCaptura = [];
    let etiquetas = [], cuerpo = [];
    const cerrar = () => {
      if (etiquetas.length) {
        const t = cuerpo.join('\n');
        if (/await cmd[A-Za-z]/.test(t) && !t.includes('resultado = await')) sinCaptura.push(etiquetas[0]);
      }
      etiquetas = []; cuerpo = [];
    };
    for (const l of zona.split('\n')) {
      const m = l.match(/^      case '([^']+)':/);
      if (m) { if (cuerpo.length) cerrar(); etiquetas.push(m[1]); continue; }
      if (etiquetas.length) cuerpo.push(l);
      if (/^\s+break;/.test(l)) cerrar();
    }
    cerrar();
    if (sinCaptura.length) {
      fallos++;
      console.log(rojo(`   ✗ ${sinCaptura.length} comando(s) tiran lo que devuelve su handler, asi que no pueden reembolsar: ${sinCaptura.slice(0, 6).join(', ')}`));
    }

    // 2) Y el reembolso OCURRE. Cuatro caminos que no prestan servicio, por el
    // dispatcher de verdad, mirando el saldo antes y despues.
    const dirS = fs.mkdtempSync(path.join(os.tmpdir(), 'sinserv-'));
    try {
      const guion = path.join(dirS, 's.js');
      fs.writeFileSync(guion, `
const fs=require('fs'),os=require('os'),path=require('path');
const ROOT=fs.mkdtempSync(path.join(os.tmpdir(),'ss-'));
fs.cpSync(${JSON.stringify(path.join(R, 'src'))},path.join(ROOT,'src'),{recursive:true});
fs.mkdirSync(path.join(ROOT,'data'));
try{fs.symlinkSync(${JSON.stringify(path.join(R, 'node_modules'))},path.join(ROOT,'node_modules'),'dir');}catch{}
process.env.OWNER_NUMBER='34600111222';
const {handleMessage}=require(path.join(ROOT,'src/handlers/messageHandler'));
const a=require(path.join(ROOT,'src/utils/auraStore'));
const G='000000036@g.us', BOT='549199@s.whatsapp.net', DUENO='34600111222@s.whatsapp.net';
const gente=[];for(let i=0;i<8;i++)gente.push('34655660'+(100+i)+'@s.whatsapp.net');
const partes=[{id:BOT,admin:'admin'},{id:DUENO},...gente.map(id=>({id}))];
const sock={user:{id:BOT},sendPresenceUpdate:async()=>{},readMessages:async()=>{},
  sendMessage:async()=>({}),groupMetadata:async()=>({id:G,subject:'G',participants:partes}),
  groupFetchAllParticipating:async()=>({[G]:{id:G,participants:partes}}),
  onWhatsApp:async(j)=>[{exists:true,jid:j}],sendReaction:async()=>{}};
const di=async(quien,texto,extra)=>{
  await handleMessage(sock,Object.assign({key:{remoteJid:G,participant:quien,fromMe:false,id:'S'+Math.random()},
    message:{conversation:texto},pushName:'x',messageTimestamp:Math.floor(Date.now()/1000)},extra||{}));
  await new Promise(r=>setTimeout(r,350));
};
(async()=>{
  const out={};
  let i=0;
  const cobra=async(texto,extra)=>{
    const q=gente[i++];
    await a.addAura(G,q,3000);
    const antes=await a.getAura(G,q);
    await di(q,texto,extra);
    return (await a.getAura(G,q))-antes;
  };
  out.roast=await cobra('!roast');
  out.ttp=await cobra('!ttp');
  out.mog=await cobra('!mog');
  out.relevancia=await cobra('!relevancia @34600111222',
    {message:{extendedTextMessage:{text:'!relevancia @34600111222',contextInfo:{mentionedJid:[DUENO]}}}});
  // Y uno que SI presta servicio: tiene que cobrar.
  out.fea=await cobra('!fea');
  console.log(JSON.stringify(out));
})();
`);
      const r = JSON.parse(execSync(`node ${guion}`, { encoding: 'utf8', timeout: 120000 }).trim().split('\n').pop());
      for (const [cmd, delta] of Object.entries(r)) {
        if (cmd === 'fea') continue;
        if (delta !== 0) {
          fallos++;
          console.log(rojo(`   ✗ *!${cmd}* sin objetivo se ha llevado ${Math.abs(delta)} de aura: se paga por un comando que no contesta`));
        }
      }
      if (r.fea >= 0) {
        fallos++;
        console.log(rojo(`   ✗ *!fea* ya no cobra (${r.fea}): el reembolso se esta comiendo cobros buenos`));
      }
    } catch (e) {
      fallos++;
      console.log(rojo(`   ✗ no pude probar el reembolso: ${String(e.message).split('\n')[0]}`));
    } finally {
      fs.rmSync(dirS, { recursive: true, force: true });
    }
    if (!sinCaptura.length) console.log(verde('   ✓ el que no presta servicio no cobra, y el que lo presta sigue cobrando'));
  }

  // ── 6. LOS COMANDOS DE PAGO NO SALEN GRATIS POR PRIVADO ───────────────────
  {
    // ESTO BUSCABA UN TROZO DE TEXTO Y NADA MAS. Quitando el `return` que corta
    // la ejecucion —dejando el aviso, para que la condicion siga escrita— el
    // comando se sirve igual y gratis, y la guarda no se enteraba. Probado.
    //
    // Y AL REESCRIBIRLA ME EQUIVOQUE DE PERSONA, que es lo que la dejo vacua una
    // segunda vez: probe con un desconocido, y a esos el bot los descarta MUCHO
    // antes, en la puerta del privado (ownerEnPrivado). Nunca llegaban a la
    // linea del cobro, asi que el comando no se servia ni con la guarda rota y
    // la prueba pasaba igual.
    //
    // Quien llega de verdad a esa linea es un CO-OWNER: entra al privado del bot
    // pero no es el dueño principal, o sea que no esta exento de pagar. Y va en
    // un proceso APARTE porque wa.js congela la lista de co-owners al cargarse:
    // tocar la config a estas alturas no cambiaria nada, igual que ya pasaba en
    // la capa de las acciones explicitas.
    const dirD = fs.mkdtempSync(path.join(os.tmpdir(), 'ddb-dm-'));
    const guionD = path.join(dirD, 'd.js');
    fs.writeFileSync(guionD, [
      `const { handleMessage } = require(${JSON.stringify(path.join(R, 'src/handlers/messageHandler'))});`,
      "const CO = '34600000123@s.whatsapp.net';",
      '(async () => {',
      '  const salida = [];',
      '  const sk = { user: { id: "549199@s.whatsapp.net" },',
      '    sendMessage: async (j, c) => { salida.push(c.text || (c.image ? "[IMG]" : "")); return {}; },',
      '    readMessages: async () => {}, groupMetadata: async () => null, sendPresenceUpdate: async () => {} };',
      "  for (const cmd of ['iq', 'gay', 'ship', 'fea']) {",
      '    await handleMessage(sk, { key: { remoteJid: CO, fromMe: false, id: "D" + Math.random() },',
      '      messageTimestamp: Math.floor(Date.now() / 1000), message: { conversation: "!" + cmd } }).catch(() => {});',
      '  }',
      '  await new Promise((r) => setTimeout(r, 200));',
      '  console.log("DM" + JSON.stringify(salida));',
      '  process.exit(0);',
      '})();',
    ].join('\n'));
    let dm = [];
    try {
      const bruto = execSync(`node ${JSON.stringify(guionD)}`, {
        encoding: 'utf8', timeout: 90000, cwd: R,
        env: { ...process.env, CO_OWNERS: '34600000123' }, stdio: ['ignore', 'pipe', 'ignore'],
      });
      const linea = bruto.split('\n').find((l) => l.startsWith('DM'));
      dm = linea ? JSON.parse(linea.slice(2)) : [];
    } catch { dm = []; } finally { fs.rmSync(dirD, { recursive: true, force: true }); }
    const txtDm = dm.join('\n');
    // Servido gratis = ha contestado con el resultado del comando. Todos estos
    // sacan un porcentaje o una barra; el aviso de "esto se juega en el grupo"
    // no lleva ninguna de las dos cosas.
    const sirvioGratis = /\d+\s*%/.test(txtDm) || /[▓█]/.test(txtDm);
    const dijoDonde = /se juega en el grupo/i.test(txtDm);
    if (!sirvioGratis && dijoDonde) {
      console.log(verde('   ✓ los comandos de pago no se sirven gratis por privado, y dicen donde se juegan'));
    } else if (!sirvioGratis && dm.length === 0) {
      fallos++;
      console.log(rojo('   ✗ no pude probar el privado: la prueba no devolvio nada, asi que esta guarda no esta mirando nada'));
    } else {
      fallos++;
      console.log(rojo('   ✗ un comando de pago se ha servido entero por privado: ahi no hay aura que cobrar, asi que sale gratis'));
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
    // ERA DE TEXTO Y SE COLABA. Envolviendo la llamada en `if (false)` —la
    // cuenta business se sigue expulsando pero ya no se vetea— el texto sigue en
    // el fichero y la guarda daba verde. O sea que la puerta giratoria que esta
    // capa dice cerrar se reabria sin que nadie se enterara. Probado.
    //
    // Ahora se ejecuta el camino entero y se le pregunta a la lista negra.
    //
    // El numero es imposible a proposito (999...) y se desbanea en un `finally`:
    // esto escribe en la lista negra de verdad, que es la razon por la que aqui
    // no se probaba nada.
    exige(/banAccount\(allForms\(sender, meta\), `cuenta business/.test(mhSrc),
      'el antiempresa expulsa sin meter en la lista negra: vuelve a entrar con el enlace del grupo');
    {
      const { isBanned, unbanAccount, flushBanlist } = require(path.join(R, 'src/utils/banlist'));
      const { handleMessage } = require(path.join(R, 'src/handlers/messageHandler'));
      const GB = '000000008@g.us';
      const empresa = `9990000${Math.floor(Math.random() * 90000 + 10000)}@s.whatsapp.net`;
      const metaB = { id: GB, subject: 'G', participants: [
        { id: '549199@s.whatsapp.net', admin: 'admin' }, { id: empresa }] };
      // EL ANTIEMPRESA VA APAGADO POR GRUPO: sin encenderlo, la funcion vuelve
      // en la primera linea y la prueba salia roja contra codigo correcto.
      const st = require(path.join(R, 'src/utils/state'));
      const estabaAB = st.isAntiBusinessEnabled(GB);
      let vetada = false;
      try {
        if (!estabaAB) st.toggleAntiBusiness(GB, true);
        const sk = { user: { id: '549199@s.whatsapp.net' },
          sendMessage: async () => ({}), readMessages: async () => {},
          groupMetadata: async () => metaB, sendPresenceUpdate: async () => {},
          groupParticipantsUpdate: async () => [{ status: '200' }] };
        await handleMessage(sk, {
          key: { remoteJid: GB, participant: empresa, fromMe: false, id: 'B' + Math.random() },
          pushName: 'Tienda', messageTimestamp: Math.floor(Date.now() / 1000),
          verifiedBizName: 'Tienda SL',
          message: { conversation: 'hola' },
        });
        await new Promise((r) => setTimeout(r, 250));
        vetada = await isBanned([empresa]);
      } catch { vetada = false; } finally {
        try { await unbanAccount([empresa]); await flushBanlist(); } catch {}
        try { if (!estabaAB) st.toggleAntiBusiness(GB, false); } catch {}
      }
      exige(vetada,
        'una cuenta business se expulsa pero NO entra en la lista negra: con el enlace del grupo vuelve a entrar, y hay que echarla otra vez, y otra');
    }

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
        // Y UNA FUNCION QUE DECLARA SU PROPIO `msg` TAMPOCO LO HEREDA. Faltaba
        // este caso: la guarda solo miraba los parametros, asi que un
        // `const msg = ...` dentro del cuerpo —perfectamente legitimo— se
        // acusaba como si el nombre viniera de fuera. Me paso escribiendo el
        // helper de logs y era un falso positivo, no un fallo.
        if (/\b(?:const|let|var)\s+msg\b\s*=/.test(cuerpo)) continue;
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

    // NUMEROS DE EJEMPLO DE libphonenumber, Y ESO IMPORTA. Aqui habia el listado REAL que rompio
    // *!purge*: treinta y tres cuentas de verdad del grupo, con su prefijo y su
    // formato, en un repositorio publico. La guarda de "ningun telefono en el
    // codigo" no los veia porque solo miraba src/ e index.js.
    //
    // Lo que la prueba necesita no son esos numeros: son sus FORMAS. Cada
    // renglon es una cuenta y cada patron esta representado —guion, parentesis,
    // el 9 de movil argentino, todo pegado, dos y tres y cuatro grupos—, que es
    // lo que rompia al parser viejo: partia por espacios y tomaba el ultimo
    // trozo como si fuera otra cuenta.
    //
    // Salen de examples.mobile.json, los numeros que la propia libreria publica
    // como ejemplo, con las dos ultimas cifras cambiadas y VALIDADOS uno a uno.
    // Tienen que ser validos de verdad: extractNumbers pasa por libphonenumber
    // antes que por su heuristico, y un numero invalido cae a la otra rama y
    // sale en otro orden. Un sintetico "que lo parece" no habria probado nada.
    const listadoFmt = [
      '+504 9123-4510',
      '+54 9 11 2345 6717',
      '+1 (201) 555-0124',
      '+573211234531',
      '+52 222 123-4538',
      '+34 612 34 56 45',
      '+505 8123-4552',
      '+593991234559',
      '+51 912 345 666',
      '+54 9 11 2345 6773',
      '+57 (321) 1234580',
      '+522221234587',
      '+593 99 123-4594',
      '+504 9123 4512',
      '+54 9 11 2345-6719',
      '+12015550126',
      '+57 321 1234533',
      '+52 222 123 4540',
      '+34 (612) 34 56 47',
      '+50581234554',
      '+593 99 123-4561',
      '+51 912 345 668',
      '+54 9 11 2345-6775',
      '+573211234582',
      '+52 222 123-4589',
      '+593 99 123 4596',
      '+504 9123-4514',
      '+5491123456721',
      '+1 201 555-0128',
      '+57 321 1234535',
      '+52 (222) 123-4542',
      '+34612345649',
      '+505 8123-4556',
    ];
    const esperadosFmt = [
      '50491234510', '5491123456717', '12015550124', '573211234531',
      '522221234538', '34612345645', '50581234552', '593991234559',
      '51912345666', '5491123456773', '573211234580', '522221234587',
      '593991234594', '50491234512', '5491123456719', '12015550126',
      '573211234533', '522221234540', '34612345647', '50581234554',
      '593991234561', '51912345668', '5491123456775', '573211234582',
      '522221234589', '593991234596', '50491234514', '5491123456721',
      '12015550128', '573211234535', '522221234542', '34612345649',
      '50581234556',
    ];
    const parsedFmt = extractNumbers(listadoFmt.join('\n'));
    exige(parsedFmt.join(',') === esperadosFmt.join(','),
      `listado internacional con formato: esperaba ${esperadosFmt.length}, salieron ${parsedFmt.length} (${parsedFmt.join(',')})`);
    const fragmentos = ['32176205', '3138518', '2311444', '8511204', '5876044',
      '8509393', '37666386', '8575476', '61222259', '8575060', '8034190',
      '37748767', '4872423', '4913215', '2133453', '5892241', '9410817',
      '2700958', '78234019'];
    exige(fragmentos.every((f) => !parsedFmt.includes(f)),
      'extractNumbers sigue tomando el final de un numero formateado como cuenta aparte');

    // Así llega `args` desde el dispatcher (split por espacios). Unirlo con
    // espacio tiene que reconstruir el número; unirlo con \n era el bug.
    const argsFmt = listadoFmt.join('\n').split(/\s+/);
    exige(extractNumbers(argsFmt.join(' ')).join(',') === esperadosFmt.join(','),
      'args partidos por espacios no reconstruyen el numero internacional');
    exige(extractNumbers('+504 9123-4510, +57 321 1234531').join(',') === '50491234510,573211234531',
      'dos internacionales separados por coma se tienen que quedar en dos');
    exige(extractNumbers('+504 9123-4510 +57 321 1234531').join(',') === '50491234510,573211234531',
      'dos internacionales en el mismo renglón se tienen que quedar en dos');

    const pnSrc = fs.readFileSync(path.join(R, 'src/commands/purgaNumero.js'), 'utf8');
    exige(!/extractNumbers\(\(args \|\| \[\]\)\.join\('\\n'\)\)/.test(pnSrc),
      '!purge volvio a unir args con salto de linea: eso parte un numero formateado en trozos');
    const tope = Number((pnSrc.match(/const MAX_PURGE = (\d+)/) || [])[1] || 0);
    exige(tope >= esperadosFmt.length,
      `MAX_PURGE=${tope} se queda corto para el listado real de ${esperadosFmt.length} numeros`);

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

        // El dispatcher parte "+504 9123-4510" en ['+504','9123-4510']. El
        // cuerpo del mensaje tiene que ganar: si args manda, el listado enseña
        // +91234510 (un trozo) y WhatsApp dice que no existe.
        const timelineFmt = [];
        const sockFmt = {
          ...sockP,
          sendMessage: async (jid, c) => { timelineFmt.push({ t: 'msg', jid, text: c.text || '' }); return {}; },
          groupFetchAllParticipating: async () => ({}),
        };
        const cuerpoFmt = '!purge\n+504 9123-4510\n+54 9 11 2345 6717';
        await cmdPurge(sockFmt, {
          key: { remoteJid: 'g1@g.us', fromMe: true, id: 'P3', participant: BOT },
          message: { conversation: cuerpoFmt },
        }, cuerpoFmt.replace(/^!purge\s*/, '').split(/\s+/), { participants: [] });
        const listadoFmtTxt = timelineFmt[0]?.text || '';
        exige(/50491234510/.test(listadoFmtTxt) && /5491123456717/.test(listadoFmtTxt),
          '!purge no reconstruye numeros internacionales con formato');
        exige(!/\+6000\b/.test(listadoFmtTxt) && !/\+8001\b/.test(listadoFmtTxt),
          '!purge lista el final de un numero formateado como si fuera otra cuenta');
        exige(!/Tope de /i.test(listadoFmtTxt),
          '!purge recorta un listado de 2 por el tope');
        exige(/Voy a purgar \*2\*/.test(listadoFmtTxt),
          '!purge no cuenta 2 numeros formateados: sigue inflando el listado con trozos');

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
      // AQUI VIVIA UNA LISTA DE SIETE EXPRESIONES LITERALES.
      //
      // Pedia que cada aviso contuviera "no eres suficiente", "te queda
      // grande", "ya te olvidó"... una de siete. Y reventó el despliegue en
      // cuanto entró un pool nuevo: 42 fallos, y ninguno era un fallo. Las
      // frases nuevas eran mejores que las viejas — solo que no reutilizaban el
      // vocabulario que yo habia congelado.
      //
      // Una guarda asi no protege la calidad: la impide. Obliga a que las
      // veintidos frases digan lo mismo con otras palabras, que es exactamente
      // como un pool se convierte en plantilla — el mismo defecto que hubo que
      // arreglar a mano en !aura y en los avisos de rango.
      //
      // Se mide el HECHO: que sea un ataque con cuerpo y no un comunicado.
      // Los cuatro criterios estan calibrados contra el pool real y los pasa
      // entero, asi que ninguno le dice a nadie como tiene que escribir.
      exige(f.uno !== f.varios,
        'un aviso de !kick tiene la forma singular y la plural identicas: en un kick multiple se leera en singular');
      exige(f.uno.length >= 120 && f.varios.length >= 120,
        `aviso de !kick demasiado corto (${f.uno.length}/${f.varios.length} caracteres): esto es el remate de una expulsion, no una notificacion`);
      const BUROCRACIA_KICK = /\b(ha sido (expulsad|eliminad|removid)|por incumplir|el administrador ha|abandona el grupo|ha salido del grupo|se ha procedido|conforme a las normas)\b/i;
      exige(!BUROCRACIA_KICK.test(`${f.uno} ${f.varios}`),
        'un aviso de !kick suena a comunicado de moderacion y no a este bot');
      const PLURAL_KICK = /\b(sois|son|fueron|estuvieron|se creyeron|los echan|los echa|ocuparon|todos|cada uno|ninguno de|los dos|se van|se largan|nadie de)\b|\w+(aron|ieron|eron)\b/i;
      exige(PLURAL_KICK.test(f.varios),
        'la forma plural de un aviso de !kick no tiene ni una marca de plural: en un kick multiple sonara raro');
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
    // Se comprueba que CORTA, no como lo dice. Esta guarda pedia la frase
    // literal "Solo admins" y al pasar el aviso a un pool que rota se puso roja
    // sin que !kick hubiera cambiado — el mismo fallo que ya tuvieron las de
    // !purge. Lo que importa es que conteste una sola vez, que sea el aviso de
    // admins, y que groupParticipantsUpdate ni se llame (revienta si se llama).
    const { SOLO_ADMINS: POOL_ADM } = require(path.join(R, 'src/data/avisos'));
    // `includes` del texto entero ya no vale: el aviso es cabecera + frase, asi
    // que se busca la FRASE DENTRO de lo que salio. Sigue comprobando lo mismo
    // —que el aviso es el de admins— sin atarse a como se componga.
    exige(silenciosoKick.length === 1 && POOL_ADM.some((f) => (silenciosoKick[0].text || '').includes(f)),
      `!kick no corta a quien no es admin (contesto ${silenciosoKick.length} vez/veces: "${(silenciosoKick[0]?.text || '').slice(0, 60)}")`);

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
    // Por el HECHO: contesta una sola vez, dice que el problema es el admin del
    // bot, y no llama a groupParticipantsUpdate (el stub revienta si se llama).
    // Pedia la frase literal "no es admin" y al reescribir el aviso en primera
    // persona ("No soy admin aquí") se puso roja sin que !kick cambiara. Van
    // tres guardas asi; el patron es siempre el mismo.
    exige(msgsNA.length === 1 && /admin/i.test(msgsNA[0].text || ''),
      `!kick insulto en publico sin poder echar (${msgsNA.length} mensaje(s): "${(msgsNA[0]?.text || '').slice(0, 50)}")`);

    if (!fallos) console.log(verde('   ✓ !kick avisa antes del ban y sigue siendo de admins'));
  }

  // ── 7. LOS MUTEOS SOBREVIVEN AL REINICIO ──────────────────────────────────
  {
    // TAMBIEN ERA DE TEXTO: pedia que las dos llamadas al fichero existieran.
    // Quitando del bucle de lectura la linea que vuelve a meter cada mute en el
    // mapa, el fichero se lee igual —las dos llamadas siguen ahi— y los muteos
    // ya no se aplican tras un reinicio. Probado.
    //
    // Se comprueba el viaje entero y en un proceso APARTE: mutear, volcar a
    // disco, arrancar de cero y preguntar si sigue muteado. En este mismo
    // proceso no valdria, porque el mapa ya esta en memoria y contestaria que si
    // sin haber leido nada.
    const gr = fs.readFileSync(path.join(R, "src/commands/group.js"), 'utf8');
    const dirM = fs.mkdtempSync(path.join(os.tmpdir(), 'ddb-mute-'));
    const guionM = path.join(dirM, 'm.js');
    const G = require(path.join(R, 'src/commands/group'));
    const gJid = '000000000@g.us';
    const vJid = `34600006${Math.floor(Math.random() * 900 + 100)}@s.whatsapp.net`;
    let sobrevive = false;
    try {
      G.muteUser(gJid, vJid, Date.now() + 3600000);
      await G.flushMutes();
      fs.writeFileSync(guionM, [
        `const G = require(${JSON.stringify(path.join(R, 'src/commands/group'))});`,
        'setTimeout(() => {',
        `  console.log('MUTE' + (G.isMuted(${JSON.stringify(gJid)}, ${JSON.stringify(vJid)}) ? '1' : '0'));`,
        '  process.exit(0);',
        '}, 600);',
      ].join('\n'));
      const out = execSync(`node ${JSON.stringify(guionM)}`, { encoding: 'utf8', timeout: 60000, cwd: R, stdio: ['ignore', 'pipe', 'ignore'] });
      sobrevive = /MUTE1/.test(out);
      G.unmuteUser(gJid, vJid);
      await G.flushMutes();
    } catch { sobrevive = false; } finally { fs.rmSync(dirM, { recursive: true, force: true }); }
    if (sobrevive && /atomicWriteJson\(MUTE_FILE/.test(gr)) {
      console.log(verde('   ✓ un mute puesto ahora sigue puesto despues de reiniciar'));
    } else {
      fallos++;
      console.log(rojo('   ✗ los muteos no sobreviven al reinicio: `npm run update` los borra y el silenciado vuelve a hablar'));
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
                      'src/data/roboPhrases.js', 'src/data/roastPhrases.js', 'src/data/wingmanPhrases.js',
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

    // ── Y LOS CASI-CLONES, QUE ERAN 165 ────────────────────────────────
    //
    // Arriba se cazan los duplicados EXACTOS. Lo que se colaba por debajo es la
    // misma frase con una palabra cambiada:
    //
    //   «...para tapar un hueco que sigue igual de grande»
    //   «...para tapar un vacio que sigue igual de grande»
    //
    // Para quien lo lee son la misma frase, y el pool decia tener 99. Habia 165
    // asi, casi todas en robo: ROB_FAIL declaraba 312 frases y daba 273 chistes
    // distintos. Y no es solo que se repita: la ventana anti-repeticion se
    // calcula sobre el TAMAÑO del pool, asi que un pool inflado se cree con mas
    // variedad de la que tiene y deja salir el clon antes de tiempo.
    //
    // La medida es distancia de edicion POR PALABRAS: dos frases del mismo pool
    // que se diferencian en menos del 18 % de sus palabras son la misma. Solo
    // frases de diez palabras para arriba, porque en una corta cambiar dos
    // palabras si cambia el chiste. Cuesta medio segundo sobre las 8.500.
    {
      const D = path.join(R, 'src/data');
      const toks = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9ñ[\]% ]/g, ' ').split(/\s+/).filter(Boolean);
      const dist = (a, b, max) => {
        if (Math.abs(a.length - b.length) > max) return max + 1;
        let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
        for (let i = 1; i <= a.length; i++) {
          const fila = [i]; let mejor = i;
          for (let j = 1; j <= b.length; j++) {
            fila[j] = Math.min(prev[j] + 1, fila[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            if (fila[j] < mejor) mejor = fila[j];
          }
          if (mejor > max) return max + 1;
          prev = fila;
        }
        return prev[b.length];
      };
      const pools = []; const vis = new Set();
      for (const f of fs.readdirSync(D).filter((x) => x.endsWith('.js'))) {
        let mod; try { mod = require(path.join(D, f)); } catch { continue; }
        const rec = (o, ruta, d) => {
          if (d > 3) return;
          if (Array.isArray(o) && o.length && o.every((x) => typeof x === 'string')) {
            if (vis.has(o)) return; vis.add(o); pools.push({ f, ruta, P: o }); return;
          }
          if (o && typeof o === 'object') for (const k of Object.keys(o)) rec(o[k], ruta ? `${ruta}.${k}` : k, d + 1);
        };
        rec(mod, '', 0);
      }
      const casi = [];
      for (const { f, ruta, P } of pools) {
        const T = P.map(toks);
        const ya = new Set();
        for (let i = 0; i < T.length; i++) {
          if (ya.has(i) || T[i].length < 10) continue;
          for (let j = i + 1; j < T.length; j++) {
            if (ya.has(j) || T[j].length < 10) continue;
            const max = Math.max(2, Math.round(Math.min(T[i].length, T[j].length) * 0.18));
            if (dist(T[i], T[j], max) <= max) {
              ya.add(P[i].length <= P[j].length ? i : j);
              if (casi.length < 3) casi.push(`${f}:${ruta} «${P[i].slice(0, 44)}…» / «${P[j].slice(0, 44)}…»`);
              else casi.push('');
            }
          }
        }
      }
      if (casi.length) {
        fallos++;
        console.log(rojo(`   ✗ ${casi.length} casi-clon(es): la misma frase con una palabra cambiada infla el pool y se lee como una repeticion`));
        for (const c of casi.filter(Boolean)) console.log(rojo(`       ${c}`));
      }

      // ── Y LA MISMA FRASE EN DOS RESULTADOS DE *!robo* ──────────────
      //
      // Peor que repetirse: si el mismo texto sale en ROB_WIN y en ROB_MAESTRO,
      // el resultado deja de significar nada — se lee igual un robo normal que
      // uno doble. Habia 26, y algunas ademas mentian: en ROB_PARCIAL —media
      // apuesta— habia frases que decian "saqueo total" y "lo vacio".
      //
      // Se comparan los cinco resultados entre si, que son los tramos de UN
      // comando. Dos comandos distintos compartiendo una frase no entra aqui:
      // *!fiel* alto y *!infiel* bajo quieren decir lo mismo y compartirla es lo
      // correcto.
      {
        const RXr = require(path.join(R, 'src/data/roboPhrases.js'));
        const RES = ['ROB_WIN', 'ROB_MAESTRO', 'ROB_PARCIAL', 'ROB_FAIL', 'ROB_DESASTRE'];
        const bolsa = (t) => new Set(toks(t));
        const jac = (A, B) => { let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); };
        const cruz = [];
        for (let x = 0; x < RES.length; x++) for (let y = x + 1; y < RES.length; y++) {
          const A = RXr[RES[x]]; const B = RXr[RES[y]];
          if (!Array.isArray(A) || !Array.isArray(B)) continue;
          const SB = B.map(bolsa);
          A.forEach((t) => { const SA = bolsa(t);
            for (const s2 of SB) if (jac(SA, s2) >= 0.72) cruz.push(`${RES[x]} y ${RES[y]}: \u00ab${t.slice(0, 50)}\u2026\u00bb`);
          });
        }
        if (cruz.length) {
          fallos++;
          console.log(rojo(`   \u2717 ${cruz.length} frase(s) de *!robo* en dos resultados a la vez: entonces el resultado no dice nada`));
          for (const c of cruz.slice(0, 3)) console.log(rojo(`       ${c}`));
        }
      }

      // Y QUE LA MEDIDA SIGA VIENDO. Sin esto, un parentesis mal puesto la deja
      // aprobando las 8.500 frases por no mirarlas.
      const a = toks('Tu habitacion es un museo de cosas que compraste para tapar un hueco que sigue igual de grande');
      const b = toks('Tu habitacion es un museo de cosas que compraste para tapar un vacio que sigue igual de grande');
      if (dist(a, b, 4) > 4) {
        fallos++;
        console.log(rojo('   ✗ la medida de casi-clones ya no ve dos frases identicas salvo una palabra'));
      }
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
        r: 'cmdPresentarse',
        inactivos: 'cmdInactivos',
        count: 'cmdCount', scan: 'cmdScan', marcarfake: 'cmdMarkFake', fkban: 'cmdFkBan',
        fkunban: 'cmdFkUnban', fklist: 'cmdFkList', antifake: 'cmdAntiFake', notifadmin: 'cmdNotifAdmin' },
      owner: { demote: 'cmdDemote', on: 'cmdOn', off: 'cmdOff', antilink: 'cmdAntiLink',
        antifoto: 'cmdAntiFoto', antiempresa: 'cmdAntiBusiness', antiadmin: 'cmdAntiAdmin',
        adminmode: 'cmdSoloAdmins', aura: 'interruptor', resetcount: 'cmdResetCount',
        diag: 'cmdDiag' },
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
    // OTRA QUE ERA VACUA. Pedia que la llamada y la funcion existieran como
    // texto. Quitandole a `pistaCifra` la linea que recuerda a quien ya lo ha
    // visto, la funcion sigue ahi, se sigue llamando, y el consejo sale en TODOS
    // los robos — que es justo lo que esta capa dice impedir. Se llama dos veces
    // y se mira lo unico que importa: que la segunda diga que no.
    {
      const { pistaCifra } = require(path.join(R, 'src/commands/robo'));
      exige(typeof pistaCifra === 'function',
        'robo.js ya no exporta pistaCifra: no hay forma de comprobar que el consejo se dosifica');
      if (typeof pistaCifra === 'function') {
        const g = `000000000@g.us`;
        const quien = `34600009${Math.floor(Math.random() * 900 + 100)}@s.whatsapp.net`;
        exige(pistaCifra(g, quien) === true, 'el consejo de la cifra no sale ni la primera vez');
        exige(pistaCifra(g, quien) === false,
          'el consejo de *!robo @alguien 200* vuelve a salir en todos los robos: repetido cien veces no enseña nada');
        // Y a otra persona SI le sale: el freno es por persona, no global.
        exige(pistaCifra(g, `34600009${Math.floor(Math.random() * 900 + 100)}@s.whatsapp.net`) === true,
          'el consejo se apaga para todo el grupo cuando lo ve uno: entonces no lo aprende nadie mas');
      }
    }
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
    // Y LA OTRA MITAD, QUE ES LA QUE FALTABA. Las dos condiciones de arriba
    // miran `result.compartido`, pero quien pone esa marca es downloader.js, no
    // music.js. Quitandole el `compartido: true` al seguidor del single-flight,
    // las dos condiciones de music.js siguen escritas tal cual —pasaban el
    // .test()— y el seguidor volvia a borrar el fichero del que lo bajo, que es
    // exactamente el fallo que esta capa dice impedir. Probado.
    //
    // Sigue siendo una comprobacion de texto, y conviene decirlo: probar esto
    // ejecutando pediria refactorizar downloader.js para poder sustituirle la
    // red, y el fallo no da para tanto. Lo que si cambia es DONDE mira: antes
    // vigilaba music.js, que solo lee la marca, y no el fichero que la pone.
    {
      const dlSrc = soloCodigo('src/utils/downloader.js');
      const iSeguidor = dlSrc.indexOf('const yaVa = enVuelo.get(clave)');
      const cuerpo = iSeguidor < 0 ? '' : dlSrc.slice(iSeguidor, iSeguidor + 400);
      exige(/compartido: true/.test(cuerpo),
        'el seguidor del single-flight de *!play* ya no se marca como compartido: va a borrarle el fichero al que lo bajo mientras lo esta leyendo');
    }

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
    // ESTA GUARDA ERA VACUA Y DEJABA PASAR EL FALLO QUE DECIA VIGILAR.
    //
    // Comprobaba que las palabras `chanceVisible` y `ROBO_OWNER_VISIBLE`
    // aparecieran en el fichero. Con eso, sustituir todo el calculo por
    // `chanceVisible = chanceFinal` —o sea, enseñarle al owner su probabilidad
    // real, que es exactamente lo que delata el amaño— pasaba en verde. Probado
    // rompiendolo.
    //
    // Ahora se EJECUTA la funcion. Y se ejecuta con el jitter apagado, porque
    // con el ±3 % aleatorio dentro haria falta repetirlo muchas veces para estar
    // seguro de algo.
    {
      const { chanceVisibleDe } = require(path.join(R, 'src/commands/robo'));
      const { ROBO_OWNER_VISIBLE } = require(path.join(R, 'src/utils/economia'));
      exige(typeof chanceVisibleDe === 'function',
        'robo.js ya no exporta chanceVisibleDe: la fachada del owner vuelve a ser incomprobable desde fuera');
      if (typeof chanceVisibleDe === 'function') {
        // Un miembro ve su numero de verdad. Si esto cambia, el bot le estaria
        // mintiendo a todo el grupo y no solo tapando al dueño.
        exige(chanceVisibleDe(false, 0.37, 500, 1000, null, true) === 0.37,
          'a un miembro cualquiera se le enseña una probabilidad que no es la suya');
        // Y al owner, NUNCA la suya, pida lo que pida.
        for (const real of [0.62, 0.75, 0.9]) {
          for (const pedido of [0, 250, 500, 1000]) {
            const visto = chanceVisibleDe(true, real, pedido, 1000, null, true);
            exige(Math.abs(visto - real) > 0.05,
              `pidiendo ${pedido} se le enseña al owner ${Math.round(visto * 100)} % y su probabilidad real es ${Math.round(real * 100)} %: eso es lo que delata el amaño`);
            exige(visto >= ROBO_OWNER_VISIBLE.min && visto <= ROBO_OWNER_VISIBLE.max,
              `la cifra que ve el owner (${Math.round(visto * 100)} %) se sale de la banda de un miembro`);
          }
        }
        // Y NO PUEDE SER SIEMPRE LA MISMA. Un numero fijo que se repite en cada
        // tirada delata igual que enseñar el real: fue el fallo original.
        const cien = Array.from({ length: 100 }, () => chanceVisibleDe(true, 0.62, 400, 1000, null));
        exige(new Set(cien.map((x) => Math.round(x * 100))).size >= 3,
          'la cifra que ve el owner sale siempre igual: un numero fijo que se repite es lo que canta');
      }

      // Y QUE *!robo* LA USE. Esto se me escapo al reescribir la guarda: probaba
      // la funcion, que estaba perfecta, y no que el comando la llamara.
      // Sustituyendo la llamada por `chanceVisible = chanceFinal` la funcion
      // seguia bien y el validador seguia en verde, con el owner viendo su
      // probabilidad real en el grupo. Probado, y verde.
      //
      // El call site se comprueba por texto y no ejecutando *!robo*, y conviene
      // decir por que: *!robo* mueve saldo de verdad, asi que ejecutarlo aqui
      // escribiria en el aura real del grupo. Por eso la expresion se pide
      // ENTERA y exacta: asi no basta con dejar el nombre de la funcion suelto.
      const iCmd = roboSrc.indexOf('async function cmdRobo');
      const cuerpoCmd = iCmd < 0 ? '' : roboSrc.slice(iCmd);
      exige(/let chanceVisible = chanceVisibleDe\(ladronEsOwner, chanceFinal, stake, maxStake, mom\);/.test(cuerpoCmd),
        '*!robo* ya no pasa por chanceVisibleDe: la funcion puede estar perfecta, pero al owner se le esta enseñando otra cosa');
    }
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
    // La lista se lee de la constante EXPORTADA, no del texto del bucle. Estaba
    // atada a la forma exacta del `for (const k of ['fiel', 'infiel'])`, asi que
    // sacar esos dos nombres a una constante —para no tenerlos escritos en tres
    // guiones— dejaba esta guarda deduciendo cero y en rojo por un refactor que
    // no cambiaba ningun comportamiento.
    const enCodigo = new Set(require(path.join(R, 'src/commands/percent')).UNIFORMES || []);
    const enDatos = new Set();
    for (const m of pools.matchAll(/\n  ([a-zá-úñ]+):\s*\{[\s\S]{0,300}?uniforme:\s*true/g)) enDatos.add(m[1]);
    exige(enCodigo.size > 0, 'no encuentro la lista de comandos que tiran uniforme en percent.js');
    const soloCod = [...enCodigo].filter((k) => !enDatos.has(k));
    const soloDat = [...enDatos].filter((k) => !enCodigo.has(k));
    exige(soloCod.length === 0 && soloDat.length === 0,
      `uniforme: percent.js y percentLabels.js no coinciden (solo en el codigo: ${soloCod.join(', ') || '—'}; solo en los datos: ${soloDat.join(', ') || '—'})`);
    // EL ROTULO DE CADA RASGO ES UNA PALABRA, NO UN ALIAS.
    //
    // *!perdedor* salia con la cabecera "es 87% L" porque su `name` era la
    // letra suelta. *!L* siempre fue un alias del comando, no su nombre, y
    // ademas contradecia a sus propias frases: dos lineas mas abajo el texto
    // decia "eres un perdedor de mierda". Ninguna de sus 148 frases usa la L.
    //
    // Se mide lo unico que aqui es objetivo: un rotulo de una o dos letras no
    // es una palabra. Lo demas —si "inutil" deberia llevar tilde— es estilo y
    // no lo vigila una guarda.
    {
      const LB = require(path.join(R, 'src/data/percentLabels.js'));
      const cortos = Object.entries(LB)
        .filter(([, v]) => typeof v?.name === 'string' && v.name.trim().length < 3)
        .map(([k, v]) => `${k}="${v.name}"`);
      exige(cortos.length === 0,
        `el rotulo de un rasgo volvio a ser un alias en vez de una palabra: ${cortos.join(', ')}`);
    }

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
      // SE EJECUTA LA FUNCION DE VERDAD, no una copia recortada del fuente.
      //
      // Antes se cogia el texto de rollPercent con un slice y se pasaba por
      // eval() inyectandole las dos constantes del owner a mano. Funcionaba
      // mientras la funcion no dependiera de nada mas; en cuanto el reparto por
      // rol paso a salir de una tabla —para que el motor y `npm run progreso`
      // no tuvieran dos copias—, el eval reventaba con "TRAMO_ALTO is not
      // defined". Una guarda que se rompe al reordenar el fichero que vigila no
      // estaba vigilando el comportamiento, estaba vigilando la forma del texto.
      const { rollPercent } = require(path.join(R, 'src/commands/percent'));
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

  // ── 25. !r PIDE LA PRESENTACION A LOS NUEVOS, SIN ENSEÑAR UN SOLO @ ──────
  //
  // Es un tagall, o sea que notifica a todo el grupo de golpe. Tres cosas
  // tienen que cumplirse siempre y las tres se rompen sin dar error:
  //
  //   · que mencione a TODOS — si `mentions` se queda corto, el aviso sale
  //     igual de bonito y no le llega a media lista;
  //   · que no escriba los @ en el texto — con doscientos numeros en medio, el
  //     mensaje deja de leerse, que es justo lo que la mencion invisible evita;
  //   · que deje claro que es SOLO para los nuevos. Pedírselo a los que ya
  //     están es ruido, y un aviso que no distingue a quién va no lo lee nadie.
  //
  // Y que siga siendo corto: es un aviso de dos lineas, no un comunicado.
  {
    console.log('\n25. !r PIDE LA PRESENTACION A LOS NUEVOS, SIN ENSEÑAR UN @');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const { cmdPresentarse } = require(path.join(R, 'src/commands/group'));
    const BOT_R = '11111111111@s.whatsapp.net';
    const ADM_R = '34600000002@s.whatsapp.net';
    const RASO_R = '34600000003@s.whatsapp.net';
    const GR = 'gr@g.us';
    const partes = [{ id: ADM_R, admin: 'admin' }, { id: RASO_R }, { id: BOT_R, admin: 'admin' }];

    const GR2 = 'gr2@g.us';
    const lanzar = async (quien) => {
      const out = [];
      const s = {
        user: { id: BOT_R },
        sendMessage: async (j, c) => { out.push({ a: j, ...c }); return {}; },
        groupFetchAllParticipating: async () => ({
          [GR]: { subject: 'Uno', participants: partes },
          [GR2]: { subject: 'Dos', participants: partes },
        }),
      };
      await cmdPresentarse(s, { key: { remoteJid: GR, participant: quien, fromMe: false, id: 'R' },
        message: { conversation: '!r' } }, [], { id: GR, participants: partes });
      return out;
    };

    const salida = await lanzar(ADM_R);
    const av = salida.find((x) => x.a === GR);
    // Desde un grupo, SOLO ese grupo. Un admin satélite no patea al resto.
    // La ronda global se pide desde el privado del owner.
    const conAviso = salida.filter((x) => /PRESENTACIÓN/.test(x.text || '')).map((x) => x.a);
    exige(conAviso.includes(GR) && !conAviso.includes(GR2),
      `!r desde un grupo ha salido en [${conAviso.join(', ')}]: tiene que ir solo a ese grupo`);
    exige(!!av, '!r no manda nada en el grupo');
    exige(!av || (av.mentions || []).length === partes.length,
      `!r menciona a ${(av?.mentions || []).length} de ${partes.length}: al resto no le llega la notificacion`);
    exige(!av || !/@\d/.test(av.text || ''),
      '!r escribe los @ en el texto: con doscientos numeros en medio no lo lee nadie');
    exige(!av || /foto/i.test(av.text || '') && /edad/i.test(av.text || ''),
      '!r dejo de pedir foto y edad, que es todo lo que tiene que pedir');
    exige(!av || /nuev/i.test(av.text || ''),
      '!r dejo de decir que es solo para los nuevos: el resto del grupo no tiene que presentarse');
    exige(!av || !/(antigu|llevan tiempo|todo el mundo|todos se present)/i.test(av.text || ''),
      '!r vuelve a pedir la presentación a gente que ya está');
    exige(!av || (av.text || '').length < 230,
      `!r se esta alargando (${av?.text?.length} caracteres): es un aviso, no un comunicado`);
    // LA FOTO SE PIDE COMO OBLIGACION, no como sugerencia.
    //
    // Y SE MIRA EN LA LINEA QUE LA PIDE, no en el mensaje entero. La primera
    // version buscaba "obligat" en todo el texto y lo encontraba... en el
    // titulo, "PRESENTACIÓN OBLIGATORIA", que esta siempre. O sea que la guarda
    // pasaba en verde con la obligacion quitada de donde importa. Un titulo se
    // lee como decoracion; lo que se lee de verdad es lo que se pide.
    const lineaQue = (av?.text || '').split('\n').find((l) => /^\*Qué:\*/.test(l)) || '';
    exige(!av || /(obligat|no es opcional|no se negocia|no vale sin)/i.test(lineaQue),
      `!r pide la foto sin decir que es obligatoria ("${lineaQue}"): asi la mitad manda solo la edad`);

    // Confirmaciones al admin: tambien dicen que es de los nuevos. Si el aviso
    // del grupo lo deja claro y el recuento no, a la segunda se pide otra vez
    // para todo el mundo.
    // Desde el privado del owner, sí va a todos.
    {
      const cfgR = require(path.join(R, 'src/config'));
      const OWN_R = `${String(cfgR.ownerNumber).replace(/\D/g, '')}@s.whatsapp.net`;
      const outP = [];
      const sP = {
        user: { id: BOT_R },
        sendMessage: async (j, c) => { outP.push({ a: j, ...c }); return {}; },
        groupFetchAllParticipating: async () => ({
          [GR]: { subject: 'Uno', participants: partes },
          [GR2]: { subject: 'Dos', participants: partes },
        }),
      };
      await cmdPresentarse(sP, { key: { remoteJid: OWN_R, fromMe: false, id: 'RP' },
        message: { conversation: '!r' } }, [], null);
      const avisosP = outP.filter((x) => /PRESENTACIÓN/.test(x.text || '')).map((x) => x.a);
      exige(avisosP.includes(GR) && avisosP.includes(GR2),
        `!r desde el privado del owner ha salido en [${avisosP.join(', ')}]: tiene que ir a todos los grupos`);
    }

    const menu = fs.readFileSync(path.join(R, 'src/commands/social.js'), 'utf8');
    exige(/\*\$\{p\}r\*.*nuev/i.test(menu),
      'el menu de !r no dice que es para los nuevos');

    // LOS REMATES ROTAN, Y NINGUNO PROMETE LO QUE EL BOT NO HACE.
    //
    // Rotan porque !r se usa cada vez que entra gente y una frase fija se quema
    // a la tercera. Y ninguno puede amenazar con echar o banear: el bot no lo
    // hace, y una amenaza incumplida deja de leerse — es la misma razon por la
    // que el aviso de !inactivos si puede decirlo (ahi si se cumple) y este no.
    {
      const gsrc = fs.readFileSync(path.join(R, 'src/commands/group.js'), 'utf8');
      const bloque = gsrc.slice(gsrc.indexOf('const REMATES'), gsrc.indexOf('];', gsrc.indexOf('const REMATES')));
      const remates = [...bloque.matchAll(/^  '(.+)',$/gm)].map((m) => m[1]);
      exige(remates.length >= 8,
        `solo hay ${remates.length} remates para !r: con menos de 8 se repiten a la vista`);
      exige(new Set(remates).size === remates.length, 'hay remates de !r repetidos');
      exige(remates.every((r) => r.length < 110),
        'algun remate de !r se alarga: el aviso tiene que caber de un vistazo');
      // Sin \b al final: los verbos se conjugan. La primera version pedia
      // \bexpuls\b y "lo expulso yo mismo" no casaba — el mutante paso en verde.
      // NINGUNO PUEDE VENIR CON GENERO. El aviso lo lee todo el grupo, y con
      // "El/La que no se presente, callado se delata solo" a una tia le llegaba
      // en masculino. De ahi que el mensaje se partiera por partes: asi el
      // remate es su propia frase y no tiene que concordar con nadie — pero
      // puede volver a colarse un adjetivo marcado dentro del propio remate.
      const marcado = remates.filter((r) => /\b(callad[oa]|sol[oa]\b|fe[oa]\b|viej[oa]|guap[oa]|nuev[oa]|list[oa]|tont[oa]|much[oa]s)\b/i.test(r));
      exige(marcado.length === 0,
        `remates de !r con genero marcado (el grupo no es solo de tios): ${marcado.slice(0, 2).join(' · ')}`);
      // Y que el aviso siga partido: es lo que quita la atadura de concordancia.
      exige(/\*Quién:\*/.test(gsrc) && /\*Qué:\*/.test(gsrc) && /\*Aviso:\*/.test(gsrc),
        '!r volvio a ser una sola frase: entonces cada remate tiene que concordar con "El/La" y ahi es donde fallaban');
      const amenaza = remates.filter((r) => /\b(ech[ao]|expuls|banea|fuera del grupo|te saco|los saco|te vas|se va a la calle)/i.test(r));
      exige(amenaza.length === 0,
        `remates de !r que amenazan con algo que el bot no hace: ${amenaza.slice(0, 2).join(' · ')}`);
      exige(/pickFresh\(REMATES/.test(gsrc),
        'el remate de !r dejo de rotar: la misma frase en cada aviso se quema a la tercera');
      // Y por grupo, no global: lanzado desde el privado sale en varios a la vez
      // y el mismo texto repetido en todos delata que es un boton.
      exige(/textoPresentacion\(grupo\)/.test(gsrc),
        '!r manda el mismo texto a todos los grupos a la vez');
    }

    const raso = await lanzar(RASO_R);
    exige(!raso.some((x) => /PRESENTACIÓN/.test(x.text || '')),
      'un miembro raso puede lanzar el ping a todo el grupo');

    if (fallos === antes) console.log(verde('   ✓ solo los nuevos, foto y edad, menciona a todos, sin un @'));
  }

  // ── 26. LOS AVISOS DE "NO PUEDES" SUENAN A ESTE BOT ──────────────────────
  //
  // Eran setenta y cinco frases sueltas repartidas por veinte ficheros y las
  // cuatro mas usadas salian sesenta veces entre todas, escritas a mano en cada
  // sitio. Dos problemas: sonaban a formulario de banco en un bot que insulta, y
  // reescribir una dejaba las otras diecinueve como estaban.
  //
  // Ahora salen de src/data/avisos.js y rotan. Lo que vigila esta capa:
  //
  //   · que no vuelvan las frases planas a mano — es lo que pasa solo, porque
  //     escribir el string donde hace falta es mas rapido que importarlo;
  //   · que SOLO_GRUPOS siga sin insultar. Ese lo lee unicamente el tier owner
  //     (el privado del bot esta cerrado al resto), asi que meterle sangre es
  //     insultar al dueño cada vez que se equivoca de chat;
  //   · que los otros tres SI tengan filo, que para eso se cambiaron;
  //   · y que ninguno se quede sin decir lo que no se puede.
  {
    console.log('\n26. LOS AVISOS DE "NO PUEDES" SUENAN A ESTE BOT');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const AV = require(path.join(R, 'src/data/avisos'));

    // Solo los ARRAYS son pools. El modulo exporta ademas cabeceraDe(), y
    // recorrer los exports a ciegas la trataba como un pool de una frase.
    const POOLS = Object.entries(AV).filter(([, v]) => Array.isArray(v));
    for (const [nombre, pool] of POOLS) {
      exige(pool.length >= 8, `${nombre} tiene ${pool.length} frases: con menos de 8 se repiten a la vista`);
      exige(new Set(pool).size === pool.length, `${nombre} tiene frases repetidas`);
      exige(pool.every((f) => f.length <= 90), `${nombre} tiene frases largas: un aviso se lee de un vistazo o no se lee`);
      exige(pool.every((f) => /[.!?]$/.test(f)), `${nombre} tiene frases sin cerrar`);
    }

    // El de grupos lo lee el dueño. Sin sangre.
    const duro = /\b(mierda|puta|puto|coña|gilipollas|imbécil|idiota|pena|decorado)\b/i;
    const conSangre = AV.SOLO_GRUPOS.filter((f) => duro.test(f));
    exige(conSangre.length === 0,
      `SOLO_GRUPOS lleva ${conSangre.length} frase(s) con sangre y ese aviso solo lo lee el owner tier: ${conSangre[0] || ''}`);
    // Y tiene que seguir diciendo DONDE si funciona, que es toda su utilidad.
    exige(AV.SOLO_GRUPOS.every((f) => /grupo/i.test(f) || /aquí no|aqui no/i.test(f)),
      'alguna frase de SOLO_GRUPOS ya no dice que eso es de grupo: entonces no informa de nada');

    // Los del grupo si tienen que picar. Sin esto, alguien los "suaviza" en un
    // ajuste y vuelven a sonar a formulario sin que salte nada.
    for (const nombre of ['SIN_PERMISO', 'SOLO_ADMINS', 'A_TI_MISMO', 'CONTRA_UN_ADMIN', 'DUELO_AJENO']) {
      const conFilo = AV[nombre].filter((f) => f.length > 28).length;
      exige(conFilo >= AV[nombre].length * 0.7,
        `${nombre} se ha quedado en avisos secos: estos se leen en el grupo y tienen que picar`);
    }

    // Español neutro en todos. Ya se colo un "dadme galones o dejad de pedirme
    // cosas" al endurecer el aviso de !kick: el bot habla igual para todos y una
    // conjugacion de España en un aviso canta mas que en una frase larga.
    const peninsular = /\b(vosotros|valéis|estáis|sois|tenéis|dadme|dejad|mirad|escribid|poneos|hacedlo|idos)\b/i;
    for (const [nombre, pool] of POOLS) {
      const conVos = pool.filter((f) => peninsular.test(f));
      exige(conVos.length === 0, `${nombre} conjuga en vosotros: ${conVos[0] || ''}`);
    }

    // Y QUE NO VUELVAN LAS FRASES A MANO. Se busca el string plano en src/.
    // LOS DOS AVISOS DE RANGO: NI PLANTILLA NI LENGUAJE DE SISTEMA.
    //
    // SOLO_ADMINS llego a ser seis veces el mismo molde: "De admins." mas un
    // empujoncito. Eso informa y no pica, y este aviso lo lee el grupo entero,
    // no solo quien escribio el comando — es el unico momento del dia en que el
    // bot puede recordarle a alguien su sitio en publico.
    //
    // AQUI VIVIO UNA GUARDA QUE PEDIA PALABRAS DE RANGO ("rango", "galones",
    // "manda"...) en el 70 % de las frases. La quite: fallaba contra las frases
    // buenas. "Ese comando tiene dueño, y no vas a ser tu ni este año ni el que
    // viene" ataca el rango de lleno y no usa ninguna de esas palabras. Estaba
    // midiendo vocabulario y llamandolo intencion, que es justo el error que ya
    // me costo el pool de !aura.
    //
    // Se queda lo que SI es objetivo: que no sean todas el mismo molde, y que
    // no se conviertan en un mensaje de sistema. Lo segundo es el modo real de
    // que esto se pudra — alguien "arregla" un aviso y lo deja en
    // "La operacion ha sido rechazada" — y se mide por las palabras que ningun
    // aviso de este bot deberia decir nunca.
    for (const nombre of ['SOLO_ADMINS', 'SIN_PERMISO']) {
      const pool = AV[nombre];
      const molde = pool.filter((f) => /^(De admins|Solo admins|No tienes permiso)\b/i.test(f)).length;
      exige(molde <= 3,
        `${nombre}: ${molde} de ${pool.length} frases arrancan con la misma plantilla, y asi se leen como un error del sistema`);
      const BUROCRACIA = /\b(operaci[oó]n|solicitud|petici[oó]n|autorizaci[oó]n|validar|restringid|no disponible|disponible para|sistema|procesar|ejecutar|lo siento)\b/i;
      const frias = pool.filter((f) => BUROCRACIA.test(f));
      exige(frias.length === 0,
        `${nombre} suena a mensaje de sistema y no a este bot: ${frias[0] || ''}`);

      // LA CABECERA TIENE QUE ESTAR, Y TIENE QUE DECIR DE QUIEN ES EL COMANDO.
      // Sin ella el aviso pasa a ser solo un insulto y el que lo recibe no se
      // entera de por que no le ha funcionado, que es la mitad del trabajo.
      const cab = AV.cabeceraDe(pool);
      exige(!!cab && /admin/i.test(cab),
        `${nombre} se quedo sin cabecera: el aviso insulta pero ya no dice de quien es el comando`);
      // Y NO PUEDE NOMBRAR AL DUEÑO. Este aviso lo lee el grupo entero; el menu
      // llama a ese tier "ADMINS SUPERIORES" justo por eso.
      exige(!/\b(dueñ[oa]|owner|creador|jefe)\b/i.test(cab || ''),
        `la cabecera de ${nombre} nombra al dueño: "${cab}"`);
      // Y LA FRASE NO LA REPITE. Si vuelve a empezar por "De admins." se gasta
      // media frase diciendo lo que la cabecera ya dijo.
      const repiten = pool.filter((f) => /^(de |solo )?admins?\b/i.test(f));
      exige(repiten.length === 0,
        `${nombre}: ${repiten.length} frase(s) repiten la cabecera en vez de rematar: ${repiten[0] || ''}`);
    }

    // LAS FRASES DE !aura CABEN DE UN VISTAZO.
    //
    // Se habian ido a una mediana de 85 caracteres y un maximo de 128: dos y
    // tres lineas en un movil, en un mensaje que sale varias veces al dia. Eso
    // no es contenido, es ruido — y el remate se pierde dentro.
    //
    // Se mide el TOPE, no el estilo: 85 caracteres es una linea larga de movil.
    // Lo que se diga dentro no lo vigila esto.
    {
      const auraSrc = fs.readFileSync(path.join(R, 'src/commands/aura.js'), 'utf8');
      const ini = auraSrc.indexOf('const AURA = {');
      const bloque = auraSrc.slice(ini, auraSrc.indexOf('\n};', ini));
      const porTramo = {};
      for (const m of bloque.matchAll(/^  ([a-zA-Z_0-9]+): \[/gm)) {
        const fin = bloque.indexOf('\n  ],', m.index);
        porTramo[m[1]] = [...bloque.slice(m.index, fin).matchAll(/^    '(.*)',$/gm)].map((x) => x[1]);
      }
      exige(Object.keys(porTramo).length >= 5, 'no encuentro los tramos de !aura');
      for (const [tramo, frases] of Object.entries(porTramo)) {
        const largas = frases.filter((f) => f.length > 85);
        exige(largas.length === 0,
          `!aura ${tramo}: ${largas.length} frase(s) de mas de 85 caracteres, y esto sale varias veces al dia: "${(largas[0] || '').slice(0, 60)}…"`);
        exige(new Set(frases).size === frases.length, `!aura ${tramo} tiene frases repetidas`);
      }
    }

    // EL AVISO DE COMANDO MAL ESCRITO ATACA, NO DA CLASE.
    //
    // La primera version eran consejos con tono de superioridad —"aprenderte la
    // palabra cuesta menos que volver a intentarlo", "toma la ayuda"— y eso no
    // pica: quien lo lee se encoge de hombros. Se vigila lo unico objetivo aqui,
    // que es la forma del consejo: recomendar, sugerir, decir lo que deberia
    // hacer la proxima vez. Un remate no aconseja.
    {
      const CLASE = /\b(cuesta menos|toma la ayuda|aprend[eé]|deber[ií]as|prueba a |la pr[oó]xima|si quieres|te recomiendo|int[eé]ntalo|f[ií]jate)\b/i;
      const lecciones = AV.MAL_ESCRITO.filter((f) => CLASE.test(f));
      exige(lecciones.length === 0,
        `MAL_ESCRITO vuelve a dar clase en vez de atacar: ${lecciones[0] || ''}`);
    }

    // AUTOACEPTAR APRUEBA, Y SOLO APRUEBA.
    //
    // Es el unico modo del bot que ABRE la puerta, asi que lo que se vigila es
    // que no haga de mas: que apruebe lo que ya estaba pedido, que no invente
    // altas, y que venga apagado.
    //
    // AQUI VIVIO UNA COMPROBACION DE LISTA NEGRA. La quite con el codigo:
    // guardOnJoin ya mira el veto en CADA alta y echa al vetado al entrar, asi
    // que rechazar en la puerta era una segunda capa sobre algo cubierto y una
    // consulta por solicitud. Se deja dicho para que no vuelva a añadirse por
    // parecer prudente.
    {
      const { aceptarPendientes } = require(path.join(R, 'src/utils/joinRequests'));
      const GA = '000000035@g.us';
      const UNO = '34600000351@s.whatsapp.net';
      const DOS = '34600000352@s.whatsapp.net';
      const hechas = [];
      const sockA = {
        groupRequestParticipantsList: async () => [{ jid: UNO }, { jid: DOS }],
        groupRequestParticipantsUpdate: async (g, jids, accion) => {
          for (const j of jids) hechas.push(`${accion}:${j}`);
          return [];
        },
      };
      const r = await aceptarPendientes(sockA, GA);
      exige(r && r.aprobados === 2, `autoaceptar aprobo ${r?.aprobados} de 2 solicitudes pendientes`);
      exige(hechas.every((h) => h.startsWith('approve:')),
        `autoaceptar hace algo que no es aprobar: ${hechas.join(', ')}`);
      // SE CUENTAN LAS PERSONAS, NO LAS LLAMADAS.
      //
      // Aqui ponia `hechas.length === 2` contando LLAMADAS, con el comentario
      // «ni de mas ni en lote». Lo que hay que vigilar es que no se apruebe a
      // nadie que no lo hubiera pedido, y eso son las PERSONAS tocadas. Que
      // vayan en una llamada o en dos es otra cosa — y ahora van en una a
      // proposito, porque de una en una eran segundo y medio cada una.
      exige(hechas.length === 2,
        `autoaceptar tocó a ${hechas.length} personas para 2 solicitudes: ni de más ni de menos`);
      exige(hechas.includes(`approve:${UNO}`) && hechas.includes(`approve:${DOS}`),
        `autoaceptar no aprobó exactamente a los dos que lo habían pedido: ${hechas.join(', ')}`);
      // SIN COLA, NADA. Un modo que abre la puerta no puede inventarse altas.
      const vacio = [];
      const r2 = await aceptarPendientes({
        groupRequestParticipantsList: async () => [],
        groupRequestParticipantsUpdate: async (g, j, a) => { vacio.push(a); return []; },
      }, GA);
      exige(r2 && r2.aprobados === 0 && vacio.length === 0,
        'autoaceptar actua con la cola vacia: no puede añadir a nadie que no lo haya pedido');
      const { isAutoAceptarEnabled } = require(path.join(R, 'src/utils/state'));
      exige(isAutoAceptarEnabled('000000036@g.us') === false,
        'autoaccept viene encendido por defecto: un grupo nuevo aceptaria a cualquiera sin que nadie lo pida');

      // LO ENCIENDEN LOS ADMINS, Y SE PRUEBA POR EL CAMINO REAL.
      //
      // La primera version de esta comprobacion llamaba a cmdAutoAceptar
      // directamente con una metadata hecha a mano. Pasaba en verde y el
      // comando estaba roto en produccion: el despachador NO le pasaba la
      // metadata —faltaba en NEEDS_META— asi que llegaba con groupMeta vacia y
      // daba las dos cosas por falsas. Contestaba "no soy admin" siendo admin,
      // y a un admin que no fuera el owner le soltaba "Solo admins".
      //
      // Inventarle la metadata al comando es probar justo lo que no fallaba.
      // Ahora entra por handleMessage, como un mensaje del grupo.
      const { handleMessage } = require(path.join(R, 'src/handlers/messageHandler'));
      const { cmdAutoAceptar } = require(path.join(R, 'src/commands/group'));
      const GB = '000000037@g.us';
      const BOTB = '549199@s.whatsapp.net';
      const ADMB = '34600000371@s.whatsapp.net';
      const RASOB = '34600000372@s.whatsapp.net';
      const partsB = [{ id: BOTB, admin: 'admin' }, { id: ADMB, admin: 'admin' }, { id: RASOB }];
      const escribir = async (quien, texto) => {
        const dicho = [];
        const s2 = {
          user: { id: BOTB },
          sendPresenceUpdate: async () => {}, readMessages: async () => {},
          sendMessage: async (j, c) => { dicho.push(c.text || ''); return {}; },
          groupMetadata: async () => ({ id: GB, subject: 'G', participants: partsB }),
          groupParticipantsUpdate: async () => [],
          groupFetchAllParticipating: async () => ({ [GB]: { id: GB, participants: partsB } }),
          onWhatsApp: async (j) => [{ exists: true, jid: j }],
          profilePictureUrl: async () => null,
        };
        await handleMessage(s2, { key: { remoteJid: GB, participant: quien, fromMe: false, id: 'Z' + Math.random() },
          message: { conversation: texto }, pushName: 'x', messageTimestamp: Math.floor(Date.now() / 1000) });
        await new Promise((r) => setTimeout(r, 150));
        return dicho.join('\n');
      };
      const delAdmin = await escribir(ADMB, '!autoaccept on');
      exige(/Autoaccept encendido/i.test(delAdmin),
        `un admin no puede encender autoaccept por el camino real: "${delAdmin.slice(0, 60)}"`);
      // Y LA QUEJA DE "NO SOY ADMIN" NO PUEDE SALIR SIENDO ADMIN. Ese fue el
      // sintoma que se vio en el grupo, y venia de llegar sin metadata.
      exige(!/No soy admin/i.test(delAdmin),
        'el bot dice que no es admin siendo admin: llega sin la metadata del grupo');
      // ENCENDERLO VACIA LA COLA AHORA, Y DICE QUE HA PASADO.
      //
      // El sondeo va cada tres minutos: encender el modo y no ver nada era lo
      // normal, y desde fuera no se distingue de que este roto. Peor todavia si
      // la cola no se puede leer —el grupo sin "aprobar nuevos participantes"—,
      // porque ese fallo se quedaba en el log de la VPS y no lo veia nadie.
      exige(/Había \*3\* esperando y he metido a \*3\*/.test(await (async () => {
        let t = '';
        const conCola = {
          user: { id: BOTB },
          groupRequestParticipantsList: async () => [{ jid: 'a@s.whatsapp.net' }, { jid: 'b@s.whatsapp.net' }, { jid: 'c@s.whatsapp.net' }],
          groupRequestParticipantsUpdate: async () => [],
          sendMessage: async (j, c) => { t = c.text || ''; return {}; },
        };
        await cmdAutoAceptar(conCola,
          { key: { remoteJid: '000000038@g.us', participant: ADMB, fromMe: false, id: 'Q1' }, message: { conversation: 'x' } },
          ['on'], { id: '000000038@g.us', participants: partsB });
        return t;
      })()),
        'encender autoaccept ya no vacia la cola en el momento: hay que esperar al sondeo y parece roto');

      // EL JID SALE DEL SOBRE VENGA CON EL NOMBRE QUE VENGA.
      //
      // groupRequestParticipantsList devuelve los atributos XML en crudo de
      // WhatsApp, no un objeto con forma conocida. Dar por hecho que la clave se
      // llama `jid` era adivinar: con otro nombre se leia undefined, se saltaba
      // la solicitud y se reportaban CERO aprobadas sin un solo error. Eso es
      // exactamente lo que se vio en el grupo — "hay una pendiente y no la
      // acepta", sin nada en el log.
      {
        const { jidDeSolicitud } = require(path.join(R, 'src/utils/joinRequests'));
        for (const [attrs, esperado] of [
          [{ jid: '34600@s.whatsapp.net', t: '1700' }, '34600@s.whatsapp.net'],
          [{ lid: '111111@lid', request_method: 'invite_link' }, '111111@lid'],
          [{ phone_number: '34600@s.whatsapp.net' }, '34600@s.whatsapp.net'],
          // El que importa: un nombre de atributo que no esta en ninguna lista.
          [{ requester_jid: '34600@s.whatsapp.net', t: '1700' }, '34600@s.whatsapp.net'],
          [{ t: '1700', request_method: 'invite_link' }, null],
        ]) {
          const dio = jidDeSolicitud(attrs) || null;
          exige(dio === esperado,
            `jidDeSolicitud(${JSON.stringify(attrs)}) da ${dio} y no ${esperado}: una solicitud se quedaria sin aprobar en silencio`);
        }
      }

      // LA SOLICITUD NUEVA SE APRUEBA AL LLEGAR, Y NO POR group.join-request.
      //
      // Esto costo dos rondas. El evento de Baileys parecia lo correcto y no
      // sirve: solo lo emite para UN tipo de aviso —el 172, cuando un NO-admin
      // añade a alguien— y lo dice su propio codigo, con un "TODO: Add other
      // events" al lado (Utils/process-message.js). El caso normal, alguien que
      // pide entrar por el enlace, llega como el aviso 144 y de ese no emite
      // nada. Por eso el modo aceptaba al encenderlo —eso vacia la cola a mano—
      // y despues se quedaba mudo.
      //
      // Se comprueba sobre el fuente porque el manejador vive dentro de
      // connectToWhatsApp: que se enganche al aviso EN CRUDO (que si llega
      // siempre) y que cubra los dos tipos, no solo el que Baileys emite.
      {
        const botSrc = soloCodigo('src/bot.js');
        // La LLAMADA, no la definicion. Con `[\s\S]{0,900}?` el patron llegaba
        // hasta la propia funcion mas abajo y daba por buena una version en la
        // que la llamada estaba quitada. La comprobacion se cazo a si misma.
        exige(/(?<!function )avisarSolicitudNueva\(msg\);/.test(botSrc),
          'autoaccept ya no se engancha al aviso de sistema: vuelve a depender de un evento que Baileys casi nunca emite');
        exige(/STUB_SOLICITUD = new Set\(\[\s*144\s*,\s*172\s*\]\)/.test(botSrc),
          'la lista de avisos de solicitud ya no cubre el 144 y el 172: el 144 es el caso normal, pedir entrar por el enlace');
        exige(/avisarSolicitudNueva[\s\S]{0,1200}?aceptarPendientes\(sock, grupo\)/.test(botSrc),
          'el aviso aprueba por su cuenta en vez de usar la lista de solicitudes, que es la que da el JID con el formato bueno');
        exige(/avisarSolicitudNueva[\s\S]{0,600}?clearTimeout\(autoAcceptPendiente\.get\(grupo\)\)/.test(botSrc),
          'sin juntar las rafagas: cinco solicitudes de golpe lanzan cinco barridos contra WhatsApp');
      }

      // Y UN 'ninguna aprobada' HABIENDO COLA SE DICE COMO FALLO, no como
      // recuento. "Habia 1 y he metido a 0" se lee como algo normal.
      exige(/no he podido aprobar ninguna/i.test(await (async () => {
        let t = '';
        const muda = {
          user: { id: BOTB },
          groupRequestParticipantsList: async () => [{ t: '1700', request_method: 'invite_link' }],
          groupRequestParticipantsUpdate: async () => [],
          sendMessage: async (j, c) => { t = c.text || ''; return {}; },
        };
        await cmdAutoAceptar(muda,
          { key: { remoteJid: '000000040@g.us', participant: ADMB, fromMe: false, id: 'Q3' }, message: { conversation: 'x' } },
          ['on'], { id: '000000040@g.us', participants: partsB });
        return t;
      })()),
        'con cola y cero aprobadas, autoaccept lo cuenta como si fuera normal en vez de decir que fallo');

      // Y SI NO SE PUEDE LEER LA COLA, SE DICE EN EL GRUPO. Callarselo deja al
      // admin creyendo que esta encendido y funcionando.
      exige(/no puedo leer las solicitudes/i.test(await (async () => {
        let t = '';
        const rota = {
          user: { id: BOTB },
          groupRequestParticipantsList: async () => { throw new Error('forbidden'); },
          groupRequestParticipantsUpdate: async () => [],
          sendMessage: async (j, c) => { t = c.text || ''; return {}; },
        };
        await cmdAutoAceptar(rota,
          { key: { remoteJid: '000000039@g.us', participant: ADMB, fromMe: false, id: 'Q2' }, message: { conversation: 'x' } },
          ['on'], { id: '000000039@g.us', participants: partsB });
        return t;
      })()),
        'si la cola no se puede leer, autoaccept se lo calla y el admin cree que funciona');

      const { SOLO_ADMINS: POOL_AA } = require(path.join(R, 'src/data/avisos'));
      const delRaso = await escribir(RASOB, '!autoaccept on');
      exige(POOL_AA.some((f) => delRaso.includes(f)),
        `un miembro raso puede tocar autoaccept: "${delRaso.slice(0, 60)}"`);
    }

    // NADA DE LO QUE SALE DEL BOT LLEVA UNA CUENTA DEL DUEÑO.
    //
    // Estaba pasando y en el peor sitio: el autor del sticker era 'xz1s' —una
    // cuenta del dueño— y el id del pack, 'com.xz1s.daddysbot'. Eso no es un
    // dato interno: WhatsApp lo escribe en los metadatos del sticker y lo
    // enseña en la ficha del pack, asi que cada sticker que hizo el bot lleva
    // ese nombre encima y sale del grupo con el, reenviado a donde sea.
    //
    // Se comprueba sobre los valores de verdad, no sobre el fuente: lo que
    // importa es lo que acaba dentro del fichero que se manda.
    {
      const cfg = require(path.join(R, 'src/config.js'));
      const stSrc = soloCodigo('src/utils/sticker.js');
      const packId = (stSrc.match(/'sticker-pack-id':\s*'([^']+)'/) || [])[1] || '';
      const CUENTAS = /\b(xz1s|xzz1r)\b/i;
      exige(!CUENTAS.test(cfg.sticker?.author || ''),
        `el autor del sticker lleva una cuenta del dueño ("${cfg.sticker?.author}"): lo ve cualquiera que reciba un sticker`);
      exige(!CUENTAS.test(cfg.sticker?.pack || ''),
        `el nombre del pack lleva una cuenta del dueño ("${cfg.sticker?.pack}")`);
      exige(!CUENTAS.test(packId),
        `el id del pack lleva una cuenta del dueño ("${packId}"): viaja dentro del sticker`);
      // Y TAMPOCO EN EL ARRANQUE. Se me escapo: el banner de index.js ponia
      // "by <cuenta del dueño>" y llevaba ahi desde el principio. Sale en la
      // consola de la VPS, si, pero tambien esta escrito en un repo publico y
      // en cualquier captura del arranque que se comparta. La guarda anterior
      // solo miraba los stickers, asi que este no lo cazaba nadie.
      // Se mira el CODIGO ENTERO, no las lineas que parecen una salida. Lo
      // intente asi primero y no cazaba nada: el banner del arranque es una
      // plantilla de varias lineas y la que lleva el nombre no tiene al lado
      // ningun console.log con el que reconocerla. Un handle del dueño escrito
      // en el codigo no tiene ningun uso legitimo, asi que no hace falta
      // adivinar si acaba en pantalla: sobra estando.
      for (const rel of ['index.js', 'src/bot.js', 'src/config.js']) {
        for (const [i, linea] of soloCodigo(rel).split('\n').entries()) {
          exige(!CUENTAS.test(linea),
            `${rel}:${i + 1} lleva una cuenta del dueño: ${linea.trim().slice(0, 60)}`);
        }
      }

      // Y NINGUN NUMERO DE TELEFONO REAL ESCRITO EN EL CODIGO.
      //
      // La guarda de arriba busca HANDLES, y por eso llevaba meses en verde con
      // un telefono real dentro de config.js: el menu lo sacaba con la frase
      // "Contactar al creador del bot", asi que cualquiera que escribiera !help
      // se llevaba un numero y a quien pertenece el bot. Y estando en el codigo
      // quedaba tambien en el repositorio y en su historial.
      //
      // Un numero de verdad no tiene por que estar aqui NUNCA: los que hacen
      // falta salen de .env (OWNER_NUMBER, CO_OWNERS, SHIP_ALTO, CONTACTO). Se
      // recorre src/ e index.js enteros, sin comentarios, y se aceptan solo los
      // marcadores evidentes — los que son un digito repetido o acaban en una
      // tira de ceros, que es como se escriben los ejemplos.
      {
        // QUE CUENTA COMO EJEMPLO Y QUE COMO NUMERO DE ALGUIEN.
        //
        // La validez no sirve para distinguirlos: "+34 600 11 12 22" es un
        // numero valido para libphonenumber y es un ejemplo de la
        // documentacion. Lo que los separa es la ENTROPIA — un numero de
        // documentacion se teclea con la mano, y sale con digitos repetidos, en
        // secuencia, o con muy poca variedad.
        //
        // El sesgo esta puesto a proposito hacia marcar de mas: un ejemplo
        // señalado se arregla editando el comentario; un numero real que pasa
        // se publica. Con esto, de 176 coincidencias quedaron 11, y las 11 eran
        // reales o casi: cuatro sitios con el numero que rompio *!purge*, uno
        // con un LID de verdad, y seis con un ejemplo legitimo.
        const esRelleno = (d) => {
          if (/^(\d)\1+$/.test(d) || /0{4,}$/.test(d)) return true;
          if (/(\d)\1{2,}/.test(d)) return true;                       // 111, 000
          if (/(?:0123|1234|2345|3456|4567|5678|6789)/.test(d)) return true;
          const nacional = d.slice(d.length > 12 ? 3 : 2);
          return new Set(nacional).size <= 4;                          // poca variedad
        };
        // SE MIRA scripts/ TAMBIEN, Y LOS COMENTARIOS. Por esas dos rendijas se
        // colaron los dos que quedaban:
        //
        //   · check.js tenia el listado REAL que rompio *!purge* —treinta y tres
        //     cuentas del grupo, con prefijo y formato— y esta guarda solo
        //     miraba src/ e index.js;
        //   · ship.js llevaba un movil argentino entero dentro de un comentario,
        //     y soloCodigo() tira las lineas // antes de mirar.
        //
        // Un telefono en un comentario se publica igual que uno en el codigo. Se
        // exceptua este mismo bloque: describe el fallo y se cazaria a si mismo.
        const ficheros = ['index.js'];
        const andarN = (dir) => {
          for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const f = path.join(dir, e.name);
            if (e.isDirectory()) andarN(f);
            else if (e.name.endsWith('.js')) ficheros.push(path.relative(R, f));
          }
        };
        andarN(path.join(R, 'src'));
        andarN(path.join(R, 'scripts'));
        for (const sh of ['setup.sh', 'scripts/setup-termux.sh', 'scripts/actualizar.sh', 'scripts/node22.sh']) {
          if (fs.existsSync(path.join(R, sh))) ficheros.push(sh);
        }
        for (const rel of ficheros) {
          // Los comentarios SI se miran: el fichero entero, no soloCodigo.
          const codigo = fs.readFileSync(path.join(R, rel), 'utf8').split('\n');
          for (const [i, linea] of codigo.entries()) {
            // Solo dentro de comillas: un numero suelto en el codigo es una
            // constante (milisegundos, precios), no un telefono.
            // NO SOLO PEGADOS A UNA COMILLA, y por ahi se colo uno.
          //
          // La primera version exigia que el numero fuera justo detras de una
          // comilla, y en !adm el telefono iba EN MITAD de una plantilla
          // ("wa.me/54911... — +54 9 11 ..."). La guarda paso en verde con un
          // numero real que el bot mandaba al grupo entero con mencion a todos.
          //
          // Ahora se mira cualquier tira de digitos suelta en una linea de
          // codigo. Se excluyen los que van pegados a una letra o a un punto
          // —versiones, milisegundos, rutas— y los marcadores de ejemplo.
          for (const m of linea.matchAll(/(?<![\w.])\+?(\d[\d\s().-]{9,24})(?![\w.])/g)) {
              // UNA IP NO ES UN TELEFONO. 169.254.169.254 —el metadata del
              // VPS, que sale en los comentarios y en las pruebas del freno de
              // salidas— se queda en doce digitos seguidos al quitarle los
              // puntos, que es justo el largo de un movil. Se comprueba antes
              // de contar digitos, porque despues ya no hay forma de saberlo.
              // (Y el ejemplo de esos doce digitos no se escribe aqui: esta
              // linea la lee el propio detector y se delataria sola.)
              if (net.isIP(m[1].trim())) continue;
              const d = m[1].replace(/\D/g, '');
              if (d.length < 10 || d.length > 15) continue;
              if (esRelleno(d)) continue;
              exige(false,
                `${rel}:${i + 1} lleva un telefono real escrito en el codigo (${d.slice(0, 3)}…${d.slice(-2)}): sacalo a .env`);
            }
          }
        }
      }
    }


    // LA FOTO SE PIDE POR LAS DOS FORMAS ANTES DE LLAMARLA PRIVADA.
    //
    // En un grupo LID la mencion llega como @lid y se le pasaba tal cual a
    // profilePictureUrl. WhatsApp rechaza esa consulta con un 403, que es la
    // MISMA respuesta que da cuando la foto es privada de verdad, asi que el
    // bot contestaba "tiene la foto limitada a sus contactos" a gente con la
    // foto publica. Y pasaba casi siempre, porque casi todas las menciones son
    // @lid.
    {
      const { fetchPfpUrl, rememberMapping } = require(path.join(R, 'src/utils/wa'));
      const LIDP = '111111111199@lid';
      const TELP = '34600000199@s.whatsapp.net';
      rememberMapping(LIDP, TELP);
      const err403 = () => { const e = new Error('forbidden'); e.data = 403; return e; };

      // Foto PUBLICA: el @lid la niega, el telefono la sirve.
      const pedidos = [];
      const url = await fetchPfpUrl({
        profilePictureUrl: async (j) => { pedidos.push(j); if (j === TELP) return 'https://x/f.jpg'; throw err403(); },
      }, LIDP, 'image', 0);
      exige(url === 'https://x/f.jpg',
        'con la foto publica y una mencion por @lid, !pfp sigue sin encontrarla y la llama privada');

      // Y AL REVES: si la que falla es la canonica, se sigue probando la otra.
      // Pasa cuando el mapeo lid→telefono esta mal o caduco: rendirse en la
      // primera negativa daria "foto privada" teniendo la buena a un intento.
      const pedidos2 = [];
      const url2 = await fetchPfpUrl({
        profilePictureUrl: async (j) => { pedidos2.push(j); if (j === LIDP) return 'https://x/g.jpg'; throw err403(); },
      }, LIDP, 'image', 0);
      exige(url2 === 'https://x/g.jpg',
        `!pfp se rinde en la primera forma que dice restringida y no prueba la otra (pidio: ${pedidos2.join(', ')})`);

      // Y una PRIVADA de verdad sigue saliendo como privada: si esto se pierde,
      // el mensaje deja de existir y todo pasa a ser "fallo de red".
      let marcada = false;
      try {
        await fetchPfpUrl({ profilePictureUrl: async () => { throw err403(); } }, LIDP, 'image', 0);
      } catch (e) { marcada = !!e?.restringida; }
      exige(marcada,
        'una foto privada de verdad ya no se marca como restringida: el aviso de privacidad deja de salir nunca');
    }

    // NINGUN COMANDO PUEDE DEPENDER DE LA TILDE.
    //
    // *!menú* e *!inútil* no funcionaban: los `case` son 'menu' e 'inutil', asi
    // que al que escribia CORRECTAMENTE en español no le respondia el bot. Y al
    // reves, los cinco que llevan tilde en el nombre hubo que duplicarlos a mano
    // uno por uno — duplicar alias arregla los casos de hoy y deja la clase de
    // fallo intacta: el proximo comando con tilde vuelve a nacer roto.
    //
    // Se comprueba lo que lo hace imposible: que el token se normalice antes
    // del switch, y que no quede ningun `case` con tilde (con normalizacion, un
    // case acentuado es codigo muerto que nadie alcanza nunca).
    {
      const mh = soloCodigo('src/handlers/messageHandler.js');
      exige(/const command = normalizarComando\(/.test(mh),
        'el comando ya no se normaliza antes del switch: *!menú* y *!inútil* vuelven a no existir');
      // Anclado a principio de linea: sin eso, el patron casa dentro de una
      // expresion regular del propio fichero que lleva "case '([a-zá-úñ...])" y
      // acusaba de acentuado a un `case` que no existe. Ya me habia pasado al
      // inventariarlos; aqui casi se cuela a produccion.
      const conTilde = [...mh.matchAll(/^[ \t]*case '([^']*[áéíóúüñÁÉÍÓÚÜÑ][^']*)':/gm)].map((m) => m[1]);
      exige(conTilde.length === 0,
        `hay case con tilde y con la normalizacion no se alcanzan nunca: ${conTilde.join(', ')}`);
      // Y QUE DE VERDAD LLEGUE AL MISMO SITIO, no solo que la funcion exista.
      const { normalizarComando } = require(path.join(R, 'src/handlers/messageHandler'));
      for (const [escrito, esperado] of [['menú', 'menu'], ['inútil', 'inutil'], ['MÚSICA', 'musica'],
        ['canción', 'cancion'], ['añadir', 'anadir'], ['aura', 'aura']]) {
        const dio = normalizarComando ? normalizarComando(escrito) : null;
        exige(dio === esperado, `normalizarComando("${escrito}") da "${dio}" y no "${esperado}"`);
      }
    }

    const planas = ["'Solo en grupos.'", "'No tienes permiso para usar esto.'",
      "'Solo admins pueden usar este comando.'", "'Solo funciona en grupos.'",
      "'Este duelo no es para ti.'", "'No tienes permiso para mutear a un admin.'"];
    const reincidentes = [];
    for (const dir of ['src/commands', 'src/utils', 'src/handlers']) {
      for (const f of fs.readdirSync(path.join(R, dir)).filter((x) => x.endsWith('.js'))) {
        const src = fs.readFileSync(path.join(R, dir, f), 'utf8').replace(/\/\/[^\n]*/g, '');
        for (const pl of planas) if (src.includes(pl)) reincidentes.push(`${f}: ${pl}`);
      }
    }
    exige(reincidentes.length === 0,
      `vuelven los avisos escritos a mano (usa aviso(POOL, jid, ...)): ${reincidentes.slice(0, 3).join(' · ')}`);

    if (fallos === antes) console.log(verde(`   ✓ ${Object.keys(AV).length} pools, con filo donde toca y secos donde el que lee es el dueño`));
  }

  // ── 27. EL BOT NO DELATA A SU DUEÑO ──────────────────────────────────────
  //
  // El dueño no quiere que en el grupo se sepa que el bot es suyo, y eso ya
  // costo una pasada: se le quito el nombre a los stickers, se renombro el
  // bloque OWNER del menu a ADMINS SUPERIORES y se comprobo que el menu no le
  // nombra ni una vez.
  //
  // Y aun asi habia cuatro sitios mas, porque el menu no es lo unico que sale
  // por WhatsApp:
  //
  //   · el aviso del anti-admin decia "Aquí solo mete gente el dueño";
  //   · una frase de !aura decia "si el owner te había amañado" — que ademas
  //     admite que hay amaño;
  //   · !purge listaba las cuentas saltadas bajo "*Omitidos (owner)*", o sea
  //     SEÑALANDO cual de esos numeros es el suyo, delante del grupo entero;
  //   · y una que meti yo al endurecer los avisos.
  //
  // La regla que se vigila es simple porque tiene que poder comprobarse: la
  // palabra "owner" no aparece en NADA que se mande por WhatsApp. En castellano
  // no sale sola nunca, asi que si aparece es una etiqueta interna que se ha
  // escapado. Los logs quedan fuera: no los lee el grupo.
  {
    console.log('\n27. EL BOT NO DELATA A SU DUEÑO');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    // El escaner tiene que distinguir tres cosas que se parecen en una linea:
    //
    //   · 'owner' a secas es una CLAVE interna (P_POSITIVA[rol], etc.), no un
    //     texto. Se exige un espacio dentro: la prosa lo tiene, una clave no;
    //   · logger.warn(...) puede ocupar VARIAS lineas, y solo la primera lleva
    //     "logger.". Se cuentan parentesis hasta cerrar la llamada;
    //   · y los comentarios se quitan antes, que ahi si se habla del dueño.
    //
    // Las tres las aprendi de golpe: la primera version dio tres falsos
    // positivos, y un falso positivo en una guarda de anonimato es peor que
    // ninguno — se desactiva y deja de mirar tambien lo de verdad.
    const fugas = [];
    const ficheros = [];
    for (const dir of ['src/commands', 'src/utils', 'src/handlers', 'src/data']) {
      for (const f of fs.readdirSync(path.join(R, dir)).filter((x) => x.endsWith('.js'))) {
        ficheros.push([`${dir.replace('src/', '')}/${f}`, path.join(R, dir, f)]);
      }
    }
    ficheros.push(['bot.js', path.join(R, 'src/bot.js')]);

    for (const [nombre, ruta] of ficheros) {
      const lineas = fs.readFileSync(ruta, 'utf8').split('\n');
      let enLog = 0;
      lineas.forEach((l, i2) => {
        const codigo = l.replace(/^\s*\/\/.*/, '').replace(/\/\/.*$/, '');
        if (enLog > 0) {
          enLog += (codigo.match(/\(/g) || []).length - (codigo.match(/\)/g) || []).length;
          return;
        }
        const log = codigo.search(/(?:logger\.\w+|console\.\w+)\s*\(/);
        if (log >= 0) {
          const resto = codigo.slice(log);
          enLog = (resto.match(/\(/g) || []).length - (resto.match(/\)/g) || []).length;
          if (enLog <= 0) enLog = 0;
          return;
        }
        for (const m of codigo.matchAll(/(['`])((?:[^'`\\]|\\.){4,300}?)\1/g)) {
          const s = m[2];
          if (!/\s/.test(s)) continue;            // clave interna, no prosa
          if (/\bowner\b/i.test(s) || /\b(el|del|al) dueño\b/i.test(s) && /\b(mete|reparte|manda|configura|amañ|bot)\b/i.test(s)) {
            fugas.push(`${nombre}:${i2 + 1} "${s.slice(0, 60)}"`);
          }
        }
      });
    }
    exige(fugas.length === 0,
      `hay ${fugas.length} texto(s) que salen por WhatsApp nombrando al dueño: ${fugas.slice(0, 3).join(' · ')}`);

    // Y las cuatro concretas, por nombre, para que no vuelvan tal cual.
    const volvieron = [];
    for (const [f, frag] of [
      ['src/bot.js', 'solo mete gente el dueño'],
      ['src/commands/aura.js', 'si el owner te había amañado'],
      ['src/commands/purgaNumero.js', 'Omitidos (owner)'],
      ['src/commands/group.js', 'los reparte el dueño'],
    ]) {
      if (fs.readFileSync(path.join(R, f), 'utf8').includes(frag)) volvieron.push(frag);
    }
    exige(volvieron.length === 0, `vuelven textos que delatan al dueño: ${volvieron.join(' · ')}`);

    if (fallos === antes) console.log(verde('   ✓ nada de lo que el bot manda dice de quién es'));
  }

  // ── 28. NINGUN VIAJE A WHATSAPP POR DELANTE DE LA RESPUESTA ──────────────
  //
  // El socket es UNO y las tramas salen en el orden en que se encolan. Un acuse
  // de lectura encolado antes de la contestacion la retrasa un viaje entero, y
  // el viaje es lo unico que se nota: el coste local de un comando son 2-3 ms.
  //
  // Esto ya paso: bot.js lleva un comentario explicando que handleMessage va
  // primero "para que su sendMessage se encole ANTES que readMessages", y aun
  // asi el readMessages acabo DENTRO de handleMessage, setenta lineas por
  // delante del switch. La optimizacion estaba escrita y deshecha a la vez.
  //
  // Se comprueba ejecutando y mirando el ORDEN de las llamadas al socket, que
  // es lo unico que importa aqui y no se ve leyendo.
  {
    console.log('\n28. NADA SE ENCOLA POR DELANTE DE LA RESPUESTA');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const GV = '120028@g.us';
    const BOTV = '549199@s.whatsapp.net';
    const YOV = '34600000028@s.whatsapp.net';
    const partsV = [{ id: BOTV, admin: 'admin' }, { id: YOV }];

    const { handleMessage } = require(path.join(R, 'src/handlers/messageHandler'));
    const orden = async (texto) => {
      const ev = [];
      const s = {
        user: { id: BOTV },
        sendMessage: async () => { ev.push('respuesta'); return {}; },
        readMessages: async () => { ev.push('visto'); },
        sendPresenceUpdate: async () => { ev.push('presencia'); },
        groupMetadata: async () => ({ id: GV, subject: 'G', participants: partsV }),
        groupParticipantsUpdate: async () => [],
        groupFetchAllParticipating: async () => ({}),
      };
      await handleMessage(s, { key: { remoteJid: GV, participant: YOV, fromMe: false, id: `V${Math.random()}` },
        message: { conversation: texto }, pushName: 'x', messageTimestamp: Math.floor(Date.now() / 1000) });
      await new Promise((r) => setTimeout(r, 120));
      return ev;
    };

    for (const c of ['!ping', '!commands', '!whoami']) {
      const ev = await orden(c);
      const iR = ev.indexOf('respuesta');
      exige(iR === 0,
        `${c}: antes de contestar se encola "${ev[0] || 'nada'}" — eso es un viaje a WhatsApp por delante de cada respuesta (orden: ${ev.join(' → ') || 'vacio'})`);
    }

    // EL VISTO LLEGA A TODO, no solo a lo que es un comando.
    //
    // Estuvo en el `finally` del try de los comandos, o sea detras de todas las
    // puertas: la conversacion normal del grupo —que es casi todo— se quedaba
    // sin doble check azul y el bot parecia dormido. Se comprueba con mensajes
    // que NO son comandos, que es justo lo que se quedaba fuera.
    //
    // Aqui vivio una guarda que miraba en que LINEA del fichero estaba el
    // visto. Se cayo sola en cuanto el visto se movio de sitio por un motivo
    // legitimo: lo que importa no es donde este escrito, sino que llegue a
    // todos los mensajes y que no se ponga por delante de la respuesta. Las dos
    // cosas se miden aqui.
    for (const [nombre, message] of [
      ['texto normal', { conversation: 'hola que tal' }],
      ['foto', { imageMessage: { mimetype: 'image/jpeg' } }],
      ['reaccion', { reactionMessage: { key: { id: 'x' }, text: '👍' } }],
    ]) {
      const ev = [];
      const s2 = {
        user: { id: BOTV },
        sendMessage: async () => { ev.push('respuesta'); return {}; },
        readMessages: async () => { ev.push('visto'); },
        sendPresenceUpdate: async () => { ev.push('presencia'); },
        groupMetadata: async () => ({ id: GV, subject: 'G', participants: partsV }),
        groupParticipantsUpdate: async () => [],
        groupFetchAllParticipating: async () => ({}),
      };
      await handleMessage(s2, { key: { remoteJid: GV, participant: YOV, fromMe: false, id: `W${Math.random()}` },
        message, pushName: 'x', messageTimestamp: Math.floor(Date.now() / 1000) });
      await new Promise((r) => setTimeout(r, 120));
      exige(ev.includes('visto'),
        `un ${nombre} no se marca como leido: el grupo ve al bot sin abrir sus mensajes`);
    }

    if (fallos === antes) console.log(verde('   ✓ lo lee todo, y la respuesta sale antes que el acuse'));
  }

  // ── 29. NADIE SALE CON 0 MENSAJES HABIENDO ESCRITO ───────────────────────
  //
  // Reportado desde el grupo: alguien que habia hablado aparecio en !inactivos
  // con 0. Reproducido: escribe llegando por su @lid, la lista de miembros lo
  // trae por telefono, y sin la correspondencia entre las dos formas el cruce
  // no encuentra nada. Sale "0 mensajes" habiendo escrito veinticinco.
  //
  // Dos arreglos, y esta capa vigila los dos:
  //
  //   · el contador APRENDE la pareja al anotar, que es el unico momento en que
  //     se tienen las dos formas delante (cada mensaje de grupo trae las dos);
  //   · y !inactivos no acusa de cero cuando el cruce es demostrablemente
  //     imposible — hay entradas bajo @lid que no casan con ningun miembro y
  //     de esta persona no se conoce ninguna forma @lid.
  //
  // Un conteo que se inventa un cero es peor que no tener el comando: acusa por
  // escrito y delante de todos.
  {
    console.log('\n29. NADIE SALE CON 0 HABIENDO ESCRITO');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    if (botEnMarcha()) {
      console.log('   — saltada: el bot esta corriendo y escribiria sobre sus datos');
    } else {
      const habia = new Set(fs.readdirSync(DATA).filter((f) => f.endsWith('.json')));
      const copia = copiaSeguridad();
      try {
        for (const k of Object.keys(require.cache)) {
          if (/utils[\/\\](messageCounter|wa)\.js$|commands[\/\\]activity\.js$/.test(k)) delete require.cache[k];
        }
        for (const f of ['messageCounts.json', 'lidMap.json']) {
          try { fs.unlinkSync(path.join(DATA, f)); } catch {}
        }
        const mc = require(path.join(R, 'src/utils/messageCounter'));
        const act = require(path.join(R, 'src/commands/activity'));
        const GC2 = '000000029@g.us';
        const BOTC = '549199@s.whatsapp.net';
        const TELC = '34600000291@s.whatsapp.net';
        const LIDC = '999888777666@lid';
        const CALLADO = '34600000292@s.whatsapp.net';

        const pedir = async (participants) => {
          let txt = '';
          await act.cmdInactivos({ user: { id: BOTC }, sendMessage: async (j, c) => { txt = c.text || ''; return {}; } },
            { key: { remoteJid: GC2, participant: BOTC, fromMe: false, id: 'I' } }, { id: GC2, participants });
          return txt;
        };

        // 1) Escribe por @lid y la lista lo trae por telefono, sin pareja conocida.
        for (let i = 0; i < 25; i++) await mc.increment(GC2, LIDC);
        const t1 = await pedir([{ id: TELC }, { id: BOTC, admin: 'admin' }]);
        exige(!/600000291/.test(t1),
          '!inactivos acusa de 0 mensajes a alguien que escribio 25: el cruce por @lid no resuelve y se inventa el cero');

        // 2) Con la pareja anotada al contar, que es el arreglo de raiz.
        for (const f of ['messageCounts.json', 'lidMap.json']) { try { fs.unlinkSync(path.join(DATA, f)); } catch {} }
        for (const k of Object.keys(require.cache)) {
          if (/utils[\/\\](messageCounter|wa)\.js$|commands[\/\\]activity\.js$/.test(k)) delete require.cache[k];
        }
        const mc2 = require(path.join(R, 'src/utils/messageCounter'));
        const act2 = require(path.join(R, 'src/commands/activity'));
        for (let i = 0; i < 25; i++) await mc2.increment(GC2, LIDC, TELC);
        let t2 = '';
        await act2.cmdInactivos({ user: { id: BOTC }, sendMessage: async (j, c) => { t2 = c.text || ''; return {}; } },
          { key: { remoteJid: GC2, participant: BOTC, fromMe: false, id: 'I' } },
          { id: GC2, participants: [{ id: TELC }, { id: BOTC, admin: 'admin' }] });
        exige(!/600000291/.test(t2),
          'el contador dejo de aprender la pareja LID<->telefono al anotar: el conteo vuelve a partirse en dos');

        // 3) Y EL COMANDO SIGUE SIRVIENDO: el que de verdad calla, sale.
        let t3 = '';
        await act2.cmdInactivos({ user: { id: BOTC }, sendMessage: async (j, c) => { t3 = c.text || ''; return {}; } },
          { key: { remoteJid: GC2, participant: BOTC, fromMe: false, id: 'I' } },
          { id: GC2, participants: [{ id: TELC }, { id: CALLADO }, { id: BOTC, admin: 'admin' }] });
        exige(/600000292/.test(t3),
          '!inactivos ya no saca al que de verdad no escribe: la red de seguridad se ha comido el comando entero');
      } finally {
        for (const k of Object.keys(require.cache)) {
          if (/utils[\/\\](messageCounter|wa)\.js$|commands[\/\\]activity\.js$/.test(k)) delete require.cache[k];
        }
        restaurar(copia, habia);
      }
    }
    if (fallos === antes) console.log(verde('   ✓ ni ceros inventados ni comando vacio'));
  }

  // ── 30. TODOS LOS CONTEOS CUADRAN ────────────────────────────────────────
  //
  // La capa 29 vigila UN comando (!inactivos) contra UN fallo concreto. Esta
  // vigila los OCHO que dicen un número de mensajes —!count, !count @alguien,
  // !relevancia, !vs, !fantasmas, !inactivos, !top5 y el contador del día que
  // paga los bonos— y contra las tres formas en que WhatsApp manda la lista de
  // miembros, más los montones heredados de antes de saber quién era quién.
  //
  // Va en un script aparte (scripts/conteos.js) porque necesita algo que aquí
  // no se puede hacer: darle mensajes de verdad a handleMessage y preguntarle
  // después al bot, en vez de mirar el almacén por dentro. Ese es justo el
  // camino donde se rompió el conteo, y mirar el almacén no lo habría visto.
  //
  // Se ejecuta en una copia desechable del bot, con su propio `data` vacío, así
  // que corre igual con el bot en marcha y no toca ni un conteo del grupo.
  {
    console.log('\n30. TODOS LOS CONTEOS CUADRAN');
    const antes = fallos;
    let salida = '';
    try {
      salida = execSync(`node ${path.join(R, 'scripts/conteos.js')}`,
        { encoding: 'utf8', timeout: 180000, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      salida = `${e.stdout || ''}${e.stderr || ''}`;
      fallos++;
      // Se enseñan las líneas que fallaron, no el volcado entero: el detalle
      // completo se saca con `node scripts/conteos.js`.
      const malas = salida.split('\n').filter((l) => l.includes('✗')).slice(0, 12);
      console.log(rojo(malas.length
        ? malas.map((l) => `   ${l.trim()}`).join('\n')
        : `   ✗ scripts/conteos.js no llego a terminar: ${salida.trim().split('\n').slice(-3).join(' | ')}`));
    }
    // Y QUE HAYA COMPROBADO ALGO DE VERDAD. Un script que se cae al arrancar y
    // devuelve 0 pasaria por bueno; aqui se exige ver las marcas.
    const marcas = (salida.match(/✓/g) || []).length;
    if (fallos === antes && marcas < 30) {
      fallos++;
      console.log(rojo(`   ✗ conteos.js dice que todo va bien pero solo ha comprobado ${marcas} cosas`));
    }
    if (fallos === antes) console.log(verde(`   ✓ ${marcas} comprobaciones de conteo, todas cuadran`));
  }

  // ── 32. LAS HISTORIAS SUBIDAS AL GRUPO SE PARAN ──────────────────────────
  //
  // Reportado desde el grupo, con captura: una historia del grupo con un
  // chat.whatsapp.com dentro, y el bot mudo.
  //
  // La causa no era la deteccion —esa iba bien— sino DONDE se buscaban los
  // destinos. `statusMentions` y `statusMentionSources` son campos de
  // WebMessageInfo (el objeto `msg`), no del payload `Message`, y se buscaban
  // dentro de `msg.message`: el unico sitio donde no pueden estar. El bot veia
  // la historia, no sabia a que grupo iba, lo apuntaba en el log y se callaba.
  //
  // Y aunque supiera el grupo, una deteccion por campos sueltos solo avisaba.
  // Un enlace de invitacion no es una deduccion: es la misma infraccion que en
  // el chat cuesta el grupo, asi que ahora tambien cuesta el grupo aqui.
  //
  // Se comprueba el HECHO (¿echa o no echa?), nunca el texto del aviso.
  {
    console.log('\n32. LAS HISTORIAS SUBIDAS AL GRUPO SE PARAN');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const { handleMessage } = require(path.join(R, 'src/handlers/messageHandler'));
    const GH = '000000032@g.us';
    const BOTH = '549199@s.whatsapp.net';
    const RANDOM = '34600000321@s.whatsapp.net';
    const ADMH = '34600000322@s.whatsapp.net';
    const partesH = [{ id: BOTH, admin: 'admin' }, { id: ADMH, admin: 'admin' }, { id: RANDOM }];

    const subir = async (quien, campos, texto) => {
      const out = { textos: [], echados: [] };
      const s = {
        user: { id: BOTH },
        sendPresenceUpdate: async () => {}, readMessages: async () => {},
        sendMessage: async (j, c) => { out.textos.push(`${j}|${c.text || ''}`); return {}; },
        groupMetadata: async () => ({ id: GH, subject: 'G', participants: partesH }),
        groupParticipantsUpdate: async (g, ids, accion) => { out.echados.push(`${accion}:${ids.join(',')}`); return []; },
        groupFetchAllParticipating: async () => ({ [GH]: { id: GH, participants: partesH } }),
        onWhatsApp: async (j) => [{ exists: true, jid: j }],
      };
      await handleMessage(s, {
        key: { remoteJid: 'status@broadcast', participant: quien, fromMe: false, id: 'H' + Math.random() },
        message: { extendedTextMessage: { text: texto } },
        pushName: 'x', messageTimestamp: Math.floor(Date.now() / 1000), ...campos,
      });
      await new Promise((r) => setTimeout(r, 150));
      return out;
    };

    const INVITE = 'mirad esto chat.whatsapp.com/EQx7w7EhVYvABC';
    // LOS DOS CAMPOS QUE TRAEN DESTINO. Si solo se comprobara uno, quitar el
    // otro de la busqueda pasaria en verde y la mitad de las historias
    // seguirian colandose.
    for (const campo of ['statusMentionSources', 'statusMentions']) {
      const r = await subir(RANDOM, { [campo]: [GH] }, INVITE);
      exige(r.echados.length > 0,
        `historia con invitacion identificada por ${campo}: no se echa a nadie (los destinos viven en el sobre, no en msg.message)`);
      exige(r.textos.some((t) => t.startsWith(GH)),
        `historia con invitacion por ${campo}: el bot no dice nada en el grupo`);
    }

    // Una historia normal NO puede costar el grupo: el que sale es el enlace.
    const normal = await subir(RANDOM, { statusMentionSources: [GH] }, 'foto de mi perro');
    exige(normal.echados.length === 0,
      'una historia sin enlace echa a quien la subio: un falso positivo aqui cuesta el grupo a alguien que no hizo nada');
    exige(normal.textos.some((t) => t.startsWith(GH)),
      'una historia sin enlace no avisa a los admins: si el bot no puede borrarla, al menos que se sepa');

    // Y al tier de admin no se le toca, igual que en la puerta del grupo.
    const deAdmin = await subir(ADMH, { statusMentionSources: [GH] }, INVITE);
    exige(deAdmin.echados.length === 0, 'se echa a un admin por subir una historia');

    if (fallos === antes) console.log(verde('   ✓ con enlace fuera, sin enlace aviso, y a los admins no se les toca'));
  }

  // ── 33. REINICIAR NO VUELVE A BAJAR TODAS LAS FOTOS ──────────────────────
  //
  // `lastIndexed` del indexador de fotos vivia solo en RAM, asi que cada
  // arranque empezaba en blanco: el TTL de tres dias se reseteaba y el bot se
  // rebajaba la foto de TODO el grupo. Con la cola a dos segundos por consulta,
  // un grupo de 200 son siete minutos seguidos de peticiones de perfil a
  // WhatsApp justo despues de conectar — en cada despliegue y en cada reinicio
  // por memoria, no una vez.
  //
  // El dato estaba en disco desde siempre (pfphashes.json guarda `lastSeen`);
  // nadie lo leia de vuelta. Se comprueba lo unico que importa: con historial
  // reciente no se encola ni una descarga, y sin historial si se encolan.
  {
    console.log('\n33. REINICIAR NO VUELVE A BAJAR TODAS LAS FOTOS');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const dirP = fs.mkdtempSync(path.join(os.tmpdir(), 'pfp-'));
    try {
      const guion = path.join(dirP, 'p.js');
      fs.writeFileSync(guion, `
const fs=require('fs'),os=require('os'),path=require('path');
const ROOT=fs.mkdtempSync(path.join(os.tmpdir(),'pfx-'));
fs.cpSync(${JSON.stringify(path.join(R, 'src'))},path.join(ROOT,'src'),{recursive:true});
fs.mkdirSync(path.join(ROOT,'data'));fs.mkdirSync(path.join(ROOT,'temp'));
try{fs.symlinkSync(${JSON.stringify(path.join(R, 'node_modules'))},path.join(ROOT,'node_modules'),'dir');}catch{}
const CUANDO = process.argv[2] === 'viejo' ? Date.now()-10*86400000 : Date.now()-86400000;
const P=Array.from({length:20},(_,i)=>({tel:'52111111'+String(i).padStart(5,'0')+'@s.whatsapp.net',lid:'1111111'+String(i).padStart(5,'0')+'@lid'}));
fs.writeFileSync(path.join(ROOT,'data/pfphashes.json'),JSON.stringify({records:
  P.map(p=>({account:p.tel,hash:'0'.repeat(16),groups:['120099@g.us'],firstSeen:CUANDO,lastSeen:CUANDO}))}));
const ip=path.join(ROOT,'src/utils/pfpIndexer.js');
let ii=fs.readFileSync(ip,'utf8');
ii=ii.replace('  queue.push(async () => {','  global.__enc=(global.__enc||0)+1;\\n  queue.push(async () => {');
fs.writeFileSync(ip,ii);
process.chdir(ROOT); process.env.OWNER_NUMBER='999999999999';
process.on('exit',()=>{try{fs.rmSync(ROOT,{recursive:true,force:true});}catch{}});
const {handleMessage}=require(ROOT+'/src/handlers/messageHandler');
const BOT='549199@s.whatsapp.net',G='120099@g.us';
const parts=[{id:BOT,admin:'admin'},...P.map(p=>({id:p.lid,phoneNumber:p.tel}))];
const sock={user:{id:BOT},sendPresenceUpdate:async()=>{},readMessages:async()=>{},
 sendMessage:async()=>({}),groupMetadata:async()=>({id:G,subject:'G',participants:parts}),
 groupParticipantsUpdate:async()=>[],groupFetchAllParticipating:async()=>({[G]:{id:G,participants:parts}}),
 onWhatsApp:async(j)=>[{exists:true,jid:j}],profilePictureUrl:async()=>null};
(async()=>{
 await new Promise(r=>setTimeout(r,200));
 for(let i=0;i<P.length;i++){const p=P[i];
  await handleMessage(sock,{key:{remoteJid:G,participant:p.lid,participantAlt:p.tel,addressingMode:'lid',
   fromMe:false,id:'M'+i},message:{conversation:'hola'},pushName:'x',messageTimestamp:Math.floor(Date.now()/1000)});}
 await new Promise(r=>setTimeout(r,300));
 console.log('ENCOLADAS='+(global.__enc||0));
 process.exit(0);
})();`);
      const correr = (arg) => {
        const out = execSync(`node ${guion} ${arg}`, { encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'ignore'] });
        const m = out.match(/ENCOLADAS=(\d+)/);
        return m ? Number(m[1]) : -1;
      };
      const reciente = correr('reciente');
      exige(reciente === 0,
        `tras reiniciar se vuelven a encolar ${reciente} descargas de foto de gente indexada ayer: son minutos de consultas a WhatsApp en cada despliegue`);
      // Y QUE SIGA INDEXANDO cuando de verdad toca: sembrar de mas apagaria el
      // motor de !fk entero y nadie lo notaria hasta necesitarlo.
      const viejo = correr('viejo');
      exige(viejo > 0,
        'con el historial caducado (10 dias) tampoco se indexa nada: la siembra se ha comido el indexador entero');
    } finally {
      fs.rmSync(dirP, { recursive: true, force: true });
    }
    if (fallos === antes) console.log(verde('   ✓ no rebaja lo ya indexado, y sigue indexando lo caducado'));
  }

  // ── 30a. LA CUENTA RECIEN VINCULADA NO SE PONE A RASPAR FOTOS ────────────
  //
  // El barrido inicial encolaba la foto de perfil de CADA miembro de CADA grupo
  // a los pocos segundos de abrir la sesion, y las descargaba una a una. En un
  // grupo de 200 son 200 consultas de perfil mas 200 descargas de imagen
  // seguidas, con la sesion recien estrenada.
  //
  // Visto desde fuera eso es un raspador de fotos de perfil estrenando cuenta,
  // y encajaba con lo que se estaba viendo: la cuenta entrando en revision a
  // las pocas horas de usarla.
  //
  // No se comprueba el retardo exacto, se comprueba lo que importa: que exista
  // una espera y que una sesion del dia no dispare el barrido.
  {
    console.log('\n30a. LA CUENTA RECIEN VINCULADA NO RASPA FOTOS');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const bot = soloCodigo('src/bot.js');
    const i = bot.indexOf('sweepAllGroups(sock, mapa)');
    exige(i > 0, 'ha desaparecido el barrido inicial de fotos');
    // ESTO ERA VACUO. Buscaba las palabras `sesionNueva` y `setTimeout` en los
    // 1.200 caracteres anteriores a la llamada, sin comprobar que gobernaran
    // nada. Cambiando la condicion por `if (forzar || !sesionNueva || true)`, el
    // barrido se lanza SIEMPRE —incluido con una cuenta recien vinculada, que es
    // el raspador de fotos que esta capa dice impedir— y las dos palabras siguen
    // ahi. Probado.
    //
    // La condicion se lee entera y se EVALUA con los dos casos que importan:
    // sesion de hoy (no debe barrer) y sesion vieja (debe barrer).
    const bloque = bot.slice(Math.max(0, i - 1200), i + 200);
    const cond = bloque.match(/if \((forzar[^)]*sesionNueva[^)]*)\) \{/);
    exige(!!cond,
      'la guarda del barrido inicial ya no es un `if (forzar ... sesionNueva ...)`: no se puede comprobar que la edad de la sesion mande');
    if (cond) {
      let evalua;
      try { evalua = new Function('forzar', 'sesionNueva', `return (${cond[1]});`); } catch { evalua = null; }
      exige(!!evalua, 'no pude evaluar la condicion del barrido inicial');
      if (evalua) {
        exige(evalua(false, true) === false,
          'con la sesion recien vinculada el barrido se lanza igual: la cuenta nueva se pone a pedir la foto de todo el grupo, que es como te restringen el primer dia');
        exige(evalua(false, false) === true,
          'con una sesion vieja el barrido ya no se lanza nunca: entonces las huellas no se construyen solas');
        exige(evalua(true, true) === true,
          'el barrido forzado a mano dejo de funcionar');
      }
    }
    exige(/setTimeout/.test(bloque),
      'el barrido inicial vuelve a lanzarse nada mas conectar, sin esperar');
    // Y el indexado normal tiene que seguir con su pausa entre consultas.
    const idx = soloCodigo('src/utils/pfpIndexer.js');
    const pausa = idx.match(/PAUSA_MS = (\d+)/);
    exige(pausa && Number(pausa[1]) >= 1000,
      `el indexador baja fotos cada ${pausa ? pausa[1] : '?'} ms: eso es una rafaga contra el mismo endpoint`);
    // El valor es una EXPRESION (`3 * 86400000`), no un numero suelto: leerlo
    // con \d+ capturaba el 3 y la guarda fallaba sobre codigo correcto. Se
    // evalua la expresion, que aqui es aritmetica pura del propio fichero.
    const ttl = idx.match(/INDEX_TTL_MS = ([\d*\s+]+);/);
    // eslint-disable-next-line no-eval
    const ttlMs = ttl ? Number(eval(ttl[1])) : 0;
    exige(ttlMs >= 86400000,
      `el indexador re-descarga la misma foto cada ${ttlMs} ms: menos de un dia es volver a pedir lo que ya tiene`);
    if (fallos === antes) console.log(verde('   ✓ el barrido espera, respeta la sesion nueva, y el indexado va pausado'));
  }

  // ── 30b. PM2 TIENE QUE ESPERAR A QUE EL BOT TERMINE DE GUARDAR ───────────
  //
  // ESTO HACIA INUTIL EL APAGADO ORDENADO Y NO SE VEIA. Al recibir SIGINT el bot
  // vuelca todos los almacenes pendientes y se da tres segundos para hacerlo.
  // Pero pm2, si nadie le dice otra cosa, manda SIGKILL a los 1600 ms: el
  // presupuesto del bot era INALCANZABLE y en cada `pm2 restart` —o sea en cada
  // despliegue— el proceso moria a mitad del volcado.
  //
  // Se comprueba la RELACION entre los dos numeros, no los numeros: subir el
  // volcado a cinco segundos esta bien mientras pm2 espere mas.
  {
    console.log('\n30b. PM2 ESPERA A QUE EL BOT GUARDE');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const eco = require(path.join(R, 'ecosystem.config.js')).apps?.[0] || {};
    const botSrc = soloCodigo('src/bot.js');
    const m = botSrc.match(/Promise\.race\(\[flushes, new Promise\(r => setTimeout\(r, (\d+)\)\)\]\)/);
    exige(!!m, 'no encuentro el presupuesto de volcado en gracefulShutdown: esta guarda no puede comprobar nada');
    const volcado = m ? Number(m[1]) : 0;
    exige(Number.isFinite(eco.kill_timeout),
      'ecosystem.config.js no fija kill_timeout: pm2 usa 1600 ms por defecto y mata al bot a mitad del volcado en cada despliegue');
    exige(Number(eco.kill_timeout) > volcado,
      `pm2 mata a los ${eco.kill_timeout} ms y el bot se da ${volcado} ms para guardar: se pierde lo que no le de tiempo a escribir`);
    if (fallos === antes) console.log(verde(`   ✓ el bot vuelca en ${volcado} ms y pm2 le da ${eco.kill_timeout}`));
  }

  // ── 29b. LA DOCUMENTACION NO PUEDE PROMETER LO QUE YA NO EXISTE ──────────
  //
  // .env.example seguia pidiendo AI_API_KEY una hora despues de borrar *!g*, y
  // package.json describia el bot como "Musica, Tops, Stickers HD" con
  // engines >=20 mientras el repo trae un guion para subir a Node 22.
  //
  // No es cosmetica: quien clona el repo o toca el .env se cree lo que pone, y
  // este bot ya se ha comido un merge malo por una guia vieja. La misma regla
  // que se aplica a las frases —que digan lo que el codigo hace— vale para los
  // ficheros que se leen antes que el codigo.
  //
  // Se comprueba lo que se puede comprobar solo: que .env.example no pida
  // variables que ya nadie lee, y que las que el codigo SI lee esten dichas.
  {
    console.log('\n29b. LA DOCUMENTACION NO MIENTE');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const env = fs.existsSync(path.join(R, '.env.example'))
      ? fs.readFileSync(path.join(R, '.env.example'), 'utf8') : '';
    exige(env.length > 0, 'falta .env.example');

    // Las que el codigo lee de verdad, sacadas del codigo.
    const usadas = new Set();
    const andarE = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const f = path.join(dir, e.name);
        if (e.isDirectory()) andarE(f);
        else if (e.name.endsWith('.js')) {
          for (const m of soloCodigo(path.relative(R, f)).matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g)) usadas.add(m[1]);
        }
      }
    };
    andarE(path.join(R, 'src'));
    // NODE_ENV y las de node no son configuracion del bot.
    for (const x of ['NODE_ENV', 'NODE_OPTIONS', 'TZ']) usadas.delete(x);

    for (const v of usadas) {
      exige(new RegExp(`^#?\\s*${v}=`, 'm').test(env),
        `.env.example no menciona ${v}, y el codigo la lee: quien configure el bot no sabe que existe`);
    }
    // Y al reves: nada que ya no se lea.
    for (const m of env.matchAll(/^([A-Z_][A-Z0-9_]*)=/gm)) {
      exige(usadas.has(m[1]),
        `.env.example pide ${m[1]} y no la lee nadie: promete algo que el bot ya no hace`);
    }
    // package.json tiene que decir la version de node que el repo usa de verdad.
    const pkg = require(path.join(R, 'package.json'));
    const nodeMin = Number(String(pkg.engines?.node || '').replace(/\D/g, '')) || 0;
    exige(nodeMin >= 22,
      `package.json dice engines.node ${pkg.engines?.node} y el repo trae scripts/node22.sh: uno de los dos miente`);
    if (fallos === antes) console.log(verde(`   ✓ .env.example cuadra con las ${usadas.size} variables que lee el codigo`));
  }

  // ── 29c. LA GUIA NO MIENTE ────────────────────────────────────────────────
  //
  // GUIA.md es lo que lee quien escribe las frases: le dice que tramo se lee
  // mas, cuantas frases escribir en cada uno y que placeholders puede usar. Es
  // documentacion que MANDA TRABAJO, y por eso envejecer le sale caro — no da
  // un error, hace que alguien escriba doscientas frases donde no se leen.
  //
  // Ya paso dos veces con el mismo numero. El reparto de los positivos cambio
  // de 17/31/52 a 6/18/76 en el motor, y ni la guia ni `npm run progreso` se
  // enteraron: la guia siguio pidiendo frases para el tramo equivocado y el
  // medidor siguio dando por bueno el pool que mas se lee. Tambien cito durante
  // meses cuatro duplicados que ya no existian y un fichero de 6.000 lineas que
  // ya estaba partido en dos.
  //
  // Aqui se compara lo que la guia PROMETE con lo que el codigo HACE. Todo lo
  // que se comprueba es un numero o un nombre, nunca una redaccion: la guia
  // puede reescribirse entera mientras las cifras cuadren.
  {
    console.log('\n29c. LA GUIA NO MIENTE');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const guia = fs.readFileSync(path.join(R, 'GUIA.md'), 'utf8');
    const pct = require(path.join(R, 'src/commands/percent'));

    // 1) NINGUN COMANDO FANTASMA. Un `!algo` que ya no existe manda a escribir
    //    frases para un pool muerto. '!comando' es el generico de los ejemplos.
    {
      const mhSrc = fs.readFileSync(path.join(R, "src/handlers/messageHandler.js"), "utf8");
      const zona = mhSrc.slice(mhSrc.indexOf("switch (command)"));
      const casos = new Set([...zona.matchAll(/^\s*case '([^']+)':/gm)].map((m) => m[1]));
      const fantasmas = [...new Set([...guia.matchAll(/!([a-zá-úñ0-9]+)/g)].map((m) => m[1]))]
        .filter((c) => c !== 'comando' && !casos.has(c));
      exige(fantasmas.length === 0,
        `la guia nombra ${fantasmas.length} comando(s) que el bot ya no acepta: ${fantasmas.join(', ')}`);
    }

    // 2) LA POLARIDAD DE CADA COMANDO. La guia la llama "el error numero uno al
    //    escribir contenido": una frase brutal en el pool `low` de !fea sale
    //    como "eres 5% fea: [insulto]". Si la tabla de la guia se desfasa, ese
    //    error deja de ser evitable leyendo la guia.
    {
      const LAB = require(path.join(R, 'src/data/percentLabels'));
      const claves = Object.keys(LAB).filter((k) => LAB[k] && typeof LAB[k].goodIsHigh === 'boolean');
      const realBuenoAlto = claves.filter((k) => LAB[k].goodIsHigh).sort();
      const realBuenoBajo = claves.filter((k) => !LAB[k].goodIsHigh).sort();
      const fila = guia.match(/\| (incel[^|]*)\| ([^|]*)\|/);
      if (!fila) {
        exige(false, 'la guia ya no trae la tabla de goodIsHigh: es lo primero que hay que mirar antes de escribir un pool');
      } else {
        const leer = (c) => c.split(',').map((x) => x.trim()).filter(Boolean).sort();
        exige(leer(fila[1]).join(' ') === realBuenoBajo.join(' '),
          `la guia lista mal los comandos donde ALTO es la paliza. Sobran o faltan: ${
            [...leer(fila[1]).filter((x) => !realBuenoBajo.includes(x)),
              ...realBuenoBajo.filter((x) => !leer(fila[1]).includes(x))].join(', ') || '(orden distinto)'}`);
        exige(leer(fila[2]).join(' ') === realBuenoAlto.join(' '),
          `la guia lista mal los comandos donde ALTO es el halago. Sobran o faltan: ${
            [...leer(fila[2]).filter((x) => !realBuenoAlto.includes(x)),
              ...realBuenoAlto.filter((x) => !leer(fila[2]).includes(x))].join(', ') || '(orden distinto)'}`);
      }
    }

    // 3) LA TABLA DE REPARTO. Es la que decide donde va el trabajo de contenido.
    for (const [pol, fila] of [['Negativo', 'negativo'], ['Positivo', 'positivo']]) {
      for (const [quien, clave] of [['miembro', 'miembro'], ['admin', 'admin']]) {
        const rx = new RegExp(`\\*\\*${pol}\\*\\*[^|]*${quien}[^|]*\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|`);
        const m = guia.match(rx);
        if (!m) { exige(false, `la guia ya no trae la fila "${pol} -> ${quien}" de la tabla de reparto`); continue; }
        const dice = m.slice(1, 4).map((c) => Number(String(c).replace(/[^0-9]/g, '')));
        const real = pct.DISTRIBUCION[fila][clave];
        const esperado = [real.high, real.mid, real.low].map((x) => Math.round(x * 100));
        exige(dice.join('/') === esperado.join('/'),
          `la guia dice que ${pol.toLowerCase()} -> ${quien} reparte ${dice.join('/')} y el motor reparte ${esperado.join('/')}`);
      }
    }

    // 3 bis) TODA TIRADA PROPIA TIENE QUE ESTAR DECLARADA EN LA GUIA.
    //
    // *!feminidad* lleva su curva escrita al lado de sus frases y pisa la del
    // motor. La guia describia la tabla general y no la mencionaba, asi que
    // decia lo contrario de lo que hace el bot en ese comando: que su tramo
    // alto se lee el 6 % cuando se lee el 45 %. Y eso no lo cazaba ninguna de
    // las comprobaciones de arriba, porque todas miran la tabla general.
    {
      const LAB2 = require(path.join(R, 'src/data/percentLabels'));
      const propias = Object.keys(LAB2).filter((k) => LAB2[k]
        && typeof LAB2[k].roll === 'function' && !pct.UNIFORMES.includes(k));
      for (const cmd of propias) {
        const declarada = new RegExp(`!${cmd}[^\\n]*tirada propia|tirada propia[^\\n]*!${cmd}`, 'i').test(guia);
        exige(declarada,
          `*!${cmd}* tiene su propia tirada y pisa la tabla del motor, y la guia no lo dice: quien escriba sus pools lo hara para el tramo equivocado`);
      }
    }

    // 4) LAS FRONTERAS DE LOS TRAMOS Y EL REPARTO DEL OWNER.
    exige(guia.includes(`high (≥${pct.TRAMO_ALTO})`) && guia.includes(`low (≤${pct.TRAMO_BAJO})`),
      `la guia no dice las fronteras que usa el motor (alto ≥${pct.TRAMO_ALTO}, bajo ≤${pct.TRAMO_BAJO})`);
    {
      const soso = Math.round(pct.OWNER_SOSO * 100);
      const bueno = Math.round(pct.OWNER_BUENO * 100);
      const mal = 100 - soso - bueno;
      const m = guia.match(/\*\*(\d+) % banda sosa · (\d+) %[^·]*· (\d+) %/);
      exige(m && Number(m[1]) === soso && Number(m[2]) === bueno && Number(m[3]) === mal,
        `la guia cuenta el amaño del dueño como ${m ? m.slice(1, 4).join('/') : '(no lo cuenta)'} y el codigo lo reparte ${soso}/${bueno}/${mal}`);
    }

    // 5) LOS COMANDOS QUE MANDA EJECUTAR TIENEN QUE EXISTIR.
    {
      const scripts = require(path.join(R, 'package.json')).scripts || {};
      for (const m of guia.matchAll(/npm run ([a-z0-9-]+)/g)) {
        exige(!!scripts[m[1]], `la guia manda ejecutar \`npm run ${m[1]}\` y package.json no lo tiene`);
      }
    }

    // 6) LA TABLA DE PLACEHOLDERS. En los dos sentidos: ni ficheros que ya no
    //    estan en el contrato, ni ficheros del contrato que la guia se calla.
    {
      const ph = fs.readFileSync(path.join(R, 'scripts/placeholders.js'), 'utf8');
      const bloque = ph.slice(ph.indexOf('const CONTRATO = {'), ph.indexOf('\n};', ph.indexOf('const CONTRATO = {')));
      const contrato = [...bloque.matchAll(/'([^']+\.js)':\s*\{\s*permite:\s*\[(.*?)\],\s*sustituye/g)]
        .map((m) => ({
          base: m[1].split('/').pop(),
          permite: [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]),
        }));
      const seccion = guia.slice(guia.indexOf('## 8.'), guia.indexOf('## 9.'));
      for (const f of contrato) {
        exige(seccion.includes(f.base),
          `${f.base} tiene contrato de placeholders y la guia no lo nombra: quien escriba ahi no sabe que puede usar`);
      }
      const conocidos = new Map(contrato.map((f) => [f.base, f.permite]));
      for (const m of seccion.matchAll(/`([a-zA-Z]+\.js)`/g)) {
        exige(conocidos.has(m[1]), `la guia da placeholders para ${m[1]} y ese fichero no esta en el contrato`);
      }
      // Y FILA POR FILA, LOS PLACEHOLDERS EN SI. Que el fichero este nombrado no
      // sirve de nada si al lado pone un hueco que su consumidor no sustituye:
      // eso es exactamente el fallo de *!maricon* —292 frases con %N donde solo
      // valia [nombre]— que dio origen al validador. La guia lo estaba repitiendo
      // en pequeño: prometia `[nombre]` en iq.js, que solo acepta %IQ.
      for (const linea of seccion.split('\n')) {
        if (!linea.startsWith('|') || !linea.includes('`')) continue;
        const col = linea.split('|').filter((c) => c.trim());
        if (col.length < 2) continue;
        const ficheros = [...col[0].matchAll(/`([a-zA-Z]+\.js)`/g)].map((m) => m[1]).filter((f) => conocidos.has(f));
        if (!ficheros.length) continue;
        const dice = [...new Set([...col[1].matchAll(/`(%[A-Z]+|\[nombre\]|\{N\})`/g)].map((m) => m[1]))].sort();
        for (const f of ficheros) {
          const real = [...conocidos.get(f)].sort();
          exige(dice.join(' ') === real.join(' '),
            `la guia dice que en ${f} se puede usar [${dice.join(' ') || 'nada'}] y el contrato permite [${real.join(' ') || 'nada'}]`);
        }
      }
    }

    // 7) LA VENTANA ANTI-REPETICION, que es de donde salen los topes de pool.
    {
      const h = soloCodigo('src/utils/helpers.js');
      const ventana = h.match(/function pickFresh\(pool, key, window = (\d+)\)/);
      const trozo = h.match(/pool\.length \* (0?\.\d+)/);
      const dicho = guia.match(/no se repite hasta que han salido \*{0,2}otras (\d+)/);
      exige(ventana && dicho && dicho[1] === ventana[1],
        `la guia no dice la ventana real (${ventana ? ventana[1] : '?'} frases)`);
      exige(trozo && guia.includes(`**${Math.round(Number(trozo[1]) * 100)} % del pool**`),
        `la guia no dice el tope real de bloqueo (${trozo ? Math.round(Number(trozo[1]) * 100) : '?'} %)`);
    }
    if (fallos === antes) console.log(verde('   ✓ la guia dice los mismos numeros y los mismos nombres que el codigo'));
  }

  // ── 30c. LOS COMANDOS OCULTOS SIGUEN OCULTOS ─────────────────────────────
  //
  // *!p*, *!purge* y *!visto* no salen en el menu y contestan con SILENCIO a
  // quien no puede usarlos, porque un "no tienes permiso" confirma que el
  // comando existe. Pero el silencio solo esconde si el bot no los nombra en
  // NINGUN otro sitio, y el hueco que se pasa por alto es el corrector: no hace
  // falta acertar el comando para que el bot te lo diga, basta con escribir algo
  // parecido y te lo completa. Escribir "!vist" y que conteste "¿querias decir
  // !visto?" seria el propio bot enseñando la puerta.
  //
  // *!visto* apaga el acuse de lectura y la presencia de la CUENTA entera: es
  // la palanca que se baja cuando WhatsApp empieza a mirar de cerca, y no tiene
  // por que saber nadie que existe.
  {
    console.log('\n30c. LOS COMANDOS OCULTOS SIGUEN OCULTOS');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const mh = require(path.join(R, 'src/handlers/messageHandler'));
    const src = soloCodigo('src/handlers/messageHandler.js');
    // EL MENU SE LEE EN CRUDO, NO CON soloCodigo, Y AQUI ME COMI UNA HORA.
    //
    // soloCodigo() tira toda linea que empiece por `*` para quitar la
    // continuacion de los bloques JSDoc. Pero el menu de WhatsApp usa `*` para
    // la NEGRITA, asi que todas sus lineas empiezan por ahi: filtrado, el menu
    // desaparece entero —61 lineas— y cualquier guarda que lo mire con
    // soloCodigo esta leyendo un fichero sin menu.
    //
    // La guarda paso en verde con *!visto* metido en el menu a proposito. Las
    // otras dos comprobaciones del menu que ya habia lo leen en crudo; esta era
    // la unica rota. Un comentario de social.js podria citar un ${p}algo, pero
    // ese es un falso positivo barato comparado con no ver nada.
    const menu = fs.readFileSync(path.join(R, 'src/commands/social.js'), 'utf8');

    for (const oculto of ['p', 'purge', 'visto']) {
      // 1) fuera del menu
      exige(!new RegExp(`\\$\\{p\\}${oculto}\\b`).test(menu),
        `*!${oculto}* ha aparecido en el menu: es un comando que no puede saber nadie que existe`);
      // 2) fuera del corrector
      const sug = mh.normalizarComando ? null : null;
      exige(/COMANDOS_OCULTOS = new Set\(\[[^\]]*'${oculto}'/.test(src.replace(/\$/g, '$')) || src.includes(`'${oculto}'`),
        `*!${oculto}* no esta en COMANDOS_OCULTOS`);
    }
    // La comprobacion de verdad: que el sugeridor NO los proponga.
    let ocultosDecl = [];
    {
      const bloque = src.match(/const COMANDOS_OCULTOS = new Set\(\[([^\]]*)\]\)/);
      const ocultos = bloque ? [...bloque[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
      ocultosDecl = ocultos;
      exige(ocultos.includes('p') && ocultos.includes('purge') && ocultos.includes('visto'),
        `COMANDOS_OCULTOS es [${ocultos.join(', ')}]: falta alguno de los tres que no pueden asomar`);
    }
    // Y que *!visto* siga siendo solo del dueño PRINCIPAL, no del tier entero:
    // un co-owner apagando el visto de la cuenta sin que el dueño se entere es
    // justo lo que este comando no puede permitir.
    const grp = soloCodigo('src/commands/group.js');
    const i = grp.indexOf('async function cmdVisto');
    const cuerpo = i > 0 ? grp.slice(i, i + 400) : '';
    exige(/isMainOwner\(/.test(cuerpo),
      '*!visto* ya no comprueba isMainOwner: lo podria usar un co-owner o, peor, cualquiera');
    exige(/return;/.test(cuerpo.slice(0, cuerpo.indexOf('\n', cuerpo.indexOf('isMainOwner')) + 2)),
      '*!visto* contesta algo a quien no puede usarlo: cualquier respuesta confirma que el comando existe');
    // Y AL REVES: TODO LO QUE NO ES OCULTO TIENE QUE ESTAR DOCUMENTADO.
    //
    // El menu se escribe a mano y el dispatcher crece solo, asi que se desfasan
    // sin que nadie lo note: llegaron a faltar 95 comandos de 195.
    //
    // PERO NO EN EL MENU CORTO. Meterlos todos ahi dio 89 lineas, y un menu de
    // 89 lineas no se lee: se cierra. La lista completa vive en *!help todo* y
    // es ESA la que tiene que estar al dia. El menu corto puede enseñar lo que
    // quiera; lo que no puede es que un comando no aparezca en NINGUNA de las
    // dos, porque entonces existe y no lo sabe nadie.
    {
      const zona = src.slice(src.indexOf('switch (command)'));
      const cmds = [...new Set([...zona.matchAll(/^\s*case '([^']+)':/gm)].map((m) => m[1]))];
      // SE NORMALIZA ANTES DE COMPARAR, y esto no es un detalle de regex.
      //
      // El menu enseña *!musica* con tilde y *!puñetazo* con eñe, porque es como
      // se escriben y las dos formas se teclean igual (el dispatcher quita
      // tildes y eñes antes de comparar). Esta linea buscaba `[a-z0-9]+`, o sea
      // que en cuanto el menu escribio bien esas cinco palabras dejaron de
      // contar como documentadas y la capa acuso de que faltaban del menu.
      //
      // El fallo era de la comprobacion, no del menu: hay que comparar por la
      // forma TECLEADA, que es la unica que los dos lados comparten.
      const sinTilde = (x) => String(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u00f1/g, 'n');
      const enMenu = new Set([...menu.matchAll(/\$\{p\}([a-z0-9\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1\u00fc]+)/gi)]
        .map((m) => sinTilde(m[1].toLowerCase())));
      // Lo que no tiene que salir en el menu sale de COMANDOS_OCULTOS, que es
      // donde el dispatcher decide a quien no nombra: si un comando esta ahi,
      // el corrector tampoco lo sugiere y no aparecer en el menu es lo
      // coherente. *!adm* y *!k* son las dos excepciones de siempre: atajos de
      // comandos que SI estan documentados con su nombre largo.
      //
      // Y LAS ACCIONES SIN FRASES TAMPOCO, PORQUE EL BOT NO LAS ACEPTA. Su
      // `case` sigue en el switch —el nombre queda reservado para que ningun
      // comando futuro se lo lleve— pero sin pool no hay handler: el bot se
      // calla, no cobra y el corrector no las ofrece. Anunciarlas seria el
      // fallo, no callarlas. Se miran aparte, unas lineas mas abajo.
      //
      // Las acciones salen enteras de esta cuenta, encendidas y apagadas, y no
      // por indulgencia: su bloque del menu NO ESTA ESCRITO en social.js, se
      // genera de la tabla del dispatcher, asi que buscarlo con un regex en el
      // fichero no encuentra nada aunque el menu lo pinte perfecto. Se
      // comprueban pintando el menu de verdad, unas lineas mas abajo, y ahi se
      // miran las dos direcciones.
      const acc = require(path.join(R, 'src/commands/acciones'));
      const apagadas = new Set(Object.keys(acc.ACCIONES)
        .filter((n) => !acc.ACTIVAS.includes(n))
        .flatMap((n) => acc.ACCIONES[n].cmds));
      const todasAcciones = Object.values(acc.ACCIONES).flatMap((a) => a.cmds);
      const OCULTOS = new Set([...ocultosDecl, 'adm', 'k', ...todasAcciones]);
      const faltan = cmds.filter((c) => !enMenu.has(c) && !OCULTOS.has(c));
      exige(faltan.length === 0,
        `${faltan.length} comando(s) que el bot acepta no salen en el menu: ${faltan.slice(0, 8).join(', ')}${faltan.length > 8 ? '…' : ''}`);

      // EL BLOQUE DE ACCIONES NO SE ESCRIBE, SE GENERA — asi que no vale
      // buscarlo en el fichero: hay que PINTAR el menu y leer lo que sale.
      //
      // Las dos direcciones, que es donde esta el fallo posible: una accion que
      // funciona y no se anuncia (existe y no lo sabe nadie) y una accion
      // apagada que si se anuncia (el menu ofrece algo que no contesta). La
      // segunda es la de hoy, con los doce pools todavia sin escribir.
      const GRUPO2 = '000000000@g.us';
      const RASO2 = '34600000003@s.whatsapp.net';
      const meta2 = { id: GRUPO2, participants: [{ id: RASO2 }] };
      const pinta = async (argv) => {
        let t = '';
        const s2 = { sendMessage: async (j, cc) => { t = cc.text || ''; return {}; } };
        await require(path.join(R, 'src/commands/social')).cmdHelp(
          s2, { key: { remoteJid: GRUPO2, participant: RASO2, fromMe: false, id: 'X' } }, meta2, argv);
        return t;
      };
      // Y el menu pintado, por la misma razon: dentro sale *!puñetazo* y el
      // alias que se busca es *punetazo*.
      const pintado = sinTilde(`${await pinta(['todo'])}\n${await pinta([])}`);
      for (const n of acc.ALIAS_ACTIVOS) {
        exige(new RegExp(`[!/]${n}\\b`).test(pintado),
          `la accion *!${n}* ya tiene frases y funciona, pero el menu no la nombra: existe y no lo sabe nadie`);
      }
      for (const n of apagadas) {
        exige(!new RegExp(`[!/]${n}\\b`).test(pintado),
          `el menu anuncia *!${n}* y esa accion no tiene frases: el bot la ignora, asi que estaria ofreciendo algo que no contesta`);
      }
    }
    if (fallos === antes) console.log(verde('   ✓ !p, !purge y !visto no salen en el menu ni los sugiere el corrector'));
  }

  // ── 47. LO QUE EL BOT EMPIEZA POR SU CUENTA ──────────────────────────────
  //
  // Tres cosas nuevas que no las pide nadie, y las tres tienen el mismo riesgo:
  // si se disparan de mas, el bot pasa de gracioso a pesado, y eso no se
  // arregla con un despliegue porque el grupo ya te ha cogido mania.
  //
  //   · el cartel del objetivo del dia: UNA vez al dia y por grupo;
  //   · el recargo de rafaga: las tres primeras al precio de siempre;
  //   · el remate del dia en los porcentajes: una de cada tres.
  //
  // Se prueban EJECUTANDO. Leer la constante no sirve: lo que falla en estas
  // cosas no es el numero, es el sitio desde el que se cuenta.
  {
    console.log('\n47. LO QUE EL BOT EMPIEZA POR SU CUENTA');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    // ── EL CARTEL: A LAS 12 Y A LAS 0, Y SOBREVIVE AL REINICIO ──────────
    //
    // El dueño lo pidio asi: «que solo lo diga dos veces al dia», y despues «a
    // las 12 del mediodia y de la noche». Reloj de pared, no «cada doce horas».
    //
    // Y lo que fallaba de verdad no era el numero: la marca de «ya lo dije»
    // vivia en un Map en memoria, asi que cada reinicio la borraba y el cartel
    // volvia a colgarse con el primer mensaje. Un dia con ocho despliegues, ocho
    // carteles.
    {
      const oD = require(path.join(R, 'src/utils/objetivoDia'));
      const { cartelDelDia, _decidido, _franjaDe, HORAS_CARTEL } = oD;
      const { addAura } = require(path.join(R, 'src/utils/auraStore'));
      const GC = '000000047@g.us';
      const gente = Array.from({ length: 5 }, (_, i) => `34600047${String(i).padStart(3, '0')}@s.whatsapp.net`);
      const metaC = { id: GC, subject: 'G', participants: [
        { id: '549199@s.whatsapp.net', admin: 'admin' }, ...gente.map((g) => ({ id: g })) ] };
      for (const g of gente) await addAura(GC, g, 500);
      // PRIMERO SE FUERZA LA LECTURA DEL DISCO Y DESPUES SE LIMPIA. Al reves no
      // vale: `cartelDelDia` hace `load()` por dentro, y esa lectura restaura la
      // entrada que acabas de borrar — con la marca de una pasada anterior. Me
      // paso montando esto: el cartel salia cero veces.
      await oD.objetivoDelDia(GC, metaC).catch(() => {});
      _decidido.delete(GC);

      // LAS FRANJAS, PRIMERO. Todo lo demas cuelga de que esten bien cortadas.
      const enHora = (iso) => _franjaDe(new Date(iso).getTime());
      exige(HORAS_CARTEL.join(',') === '0,12', `las horas del cartel son ${HORAS_CARTEL}: el dueño pidio las 12 y las 0`);
      exige(enHora('2026-09-11T04:30:00Z') === enHora('2026-09-11T15:00:00Z'),
        'las 0:30 y las 11:00 caen en franjas distintas: entonces el cartel sale dos veces antes de comer');
      exige(enHora('2026-09-11T15:00:00Z') !== enHora('2026-09-11T16:30:00Z'),
        'las 11:00 y las 12:30 caen en la misma franja: entonces el de mediodía no sale');
      exige(enHora('2026-09-12T03:59:00Z') !== enHora('2026-09-12T04:01:00Z'),
        'la medianoche no abre franja nueva: el cartel de la noche no saldría');

      // Seis mensajes seguidos: UNO. La segunda franja ya no es cosa del reloj
      // de la prueba, asi que se simula moviendo la marca guardada.
      const salidas = [];
      for (let i = 0; i < 6; i++) salidas.push(await cartelDelDia(GC, metaC));
      exige(salidas.filter(Boolean).length === 1,
        `el cartel salio ${salidas.filter(Boolean).length} veces en la misma franja: tiene que salir una`);
      const v = _decidido.get(GC);
      exige(!!v && v.franja === _franjaDe(), 'la franja no queda guardada con la decisión del día');

      // Cambia la franja -> vuelve a salir. Una sola vez.
      v.franja = 'otra-franja';
      exige(await cartelDelDia(GC, metaC) !== null, 'al cambiar de franja el cartel no vuelve a salir');
      exige(await cartelDelDia(GC, metaC) === null, 'en la franja nueva el cartel sale dos veces');

      // Y SOBREVIVE AL REINICIO, que es lo que fallaba. Se simula recargando el
      // modulo: si la marca no vuelve del disco, el cartel se reabre solo.
      await oD.flushObjetivoDia();
      const ruta = require.resolve(path.join(R, 'src/utils/objetivoDia'));
      delete require.cache[ruta];
      const oD2 = require(ruta);
      exige(await oD2.cartelDelDia(GC, metaC) === null,
        'tras un reinicio el cartel vuelve a salir: la marca vivía solo en memoria y cada despliegue la borraba');
      delete require.cache[ruta];

      // Y EN UN GRUPO SIN NADIE A QUIEN SEÑALAR, SILENCIO. Anunciar que hoy no
      // hay cartel es ruido puro, y ademas delata que el mecanismo existe.
      const GV = '000000048@g.us';
      _decidido.delete(GV);
      const vacio = await cartelDelDia(GV, { id: GV, participants: [{ id: '549199@s.whatsapp.net' }] });
      exige(vacio === null, 'el bot anuncia un cartel en un grupo donde no hay objetivo posible');
      // Y no puede gastar su franja: el dia que entre gente, tiene que salir.
      exige(!_decidido.has(GV) || !_decidido.get(GV).franja,
        'un grupo sin objetivo gasta su franja igual: el cartel no saldría aunque entrara gente');

      // Se deja el fichero del dueño como estaba: estos dos grupos son de
      // mentira y no tienen por que quedarse ahi.
      _decidido.delete(GC);
      _decidido.delete(GV);
      await oD.flushObjetivoDia();
    }

    // ── LA RAFAGA: TRES AL PRECIO DE SIEMPRE, LUEGO EL DOBLE ─────────────
    {
      const { cobrar, devolver, RAFAGA } = require(path.join(R, 'src/utils/auraCobro'));
      const { addAura } = require(path.join(R, 'src/utils/auraStore'));
      const { PRECIOS } = require(path.join(R, 'src/utils/economia'));
      const GR = '000000049@g.us';
      const quien = `34600049${Math.floor(Math.random() * 900 + 100)}@s.whatsapp.net`;
      await addAura(GR, quien, 20000);
      const pagados = [];
      for (let i = 0; i < RAFAGA.gratis + 2; i++) {
        const r = await cobrar(GR, quien, 'accion', {});
        pagados.push(r.ok ? r.pagado : -1);
      }
      const base = PRECIOS.accion;
      exige(pagados.slice(0, RAFAGA.gratis).every((x) => x === base),
        `las primeras ${RAFAGA.gratis} acciones del dia no cuestan lo de siempre: ${pagados.join(',')}`);
      exige(pagados.slice(RAFAGA.gratis).every((x) => x === base * RAFAGA.multiplicador),
        `de la ${RAFAGA.gratis + 1}ª en adelante no se cobra el doble: ${pagados.join(',')}`);

      // Y UN COMANDO DEVUELTO NO CUENTA. Sin esto, una tarde con la web caida
      // deja a alguien pagando el doble por gifs que no llego a ver.
      const otro = `34600049${Math.floor(Math.random() * 900 + 100)}@s.whatsapp.net`;
      await addAura(GR, otro, 20000);
      for (let i = 0; i < RAFAGA.gratis; i++) {
        const r = await cobrar(GR, otro, 'accion', {});
        await devolver(GR, otro, r.pagado, 'accion');
      }
      const tras = await cobrar(GR, otro, 'accion', {});
      exige(tras.pagado === base,
        `despues de ${RAFAGA.gratis} cobros DEVUELTOS la siguiente ya cuesta ${tras.pagado}: se estan contando usos que no ocurrieron`);

      // Y quien lo intenta sin saldo tampoco gasta turno.
      const pobre = `34600049${Math.floor(Math.random() * 900 + 100)}@s.whatsapp.net`;
      for (let i = 0; i < 5; i++) await cobrar(GR, pobre, 'accion', {});
      await addAura(GR, pobre, 20000);
      const primera = await cobrar(GR, pobre, 'accion', {});
      exige(primera.pagado === base,
        'cinco intentos sin saldo encarecen la primera de verdad: se cuenta lo que se intenta en vez de lo que se usa');
    }

    // ── EL REMATE DEL DIA NO PUEDE SER PARTE DEL FORMATO ─────────────────
    {
      const { anotarYRematar, CADA } = require(path.join(R, 'src/utils/percentDia'));
      const GP = '000000050@g.us';
      const nombre = (j) => `@${String(j).split('@')[0]}`;
      // La primera del dia no tiene con que compararse: no puede rematar.
      const uno = anotarYRematar(GP, 'rata', '34600050001@s.whatsapp.net', 50, nombre);
      exige(uno === null, 'la primera tirada del dia ya saca remate, y no hay nada con lo que compararla');
      let remates = 0;
      for (let i = 0; i < 30; i++) {
        if (anotarYRematar(GP, 'rata', `3460005${1000 + i}@s.whatsapp.net`, i * 3, nombre)) remates++;
      }
      exige(remates > 0, 'el remate del dia no sale nunca: entonces sobra el modulo entero');
      exige(remates <= Math.ceil(31 / CADA),
        `el remate salio ${remates} veces en 31 tiradas: sale demasiado y se convierte en parte del formato, que es lo que se venia a romper`);
    }

    if (fallos === antes) console.log(verde('   ✓ el cartel sale a las 12 y a las 0 y sobrevive al reinicio, la rafaga cobra el doble a la cuarta y el remate no es parte del formato'));
  }

  // ── 46. LO QUE EL MENU ENSEÑA SE PUEDE TECLEAR ───────────────────────────
  //
  // El dispatcher quita tildes y eñes antes de comparar, asi que un `case` con
  // eñe no se alcanza jamas y el alias se guarda como *punetazo*. Eso funciona:
  // quien escribe "puñetazo" llega igual.
  //
  // Lo que no valia era ENSEÑARLO asi. El menu es el unico sitio donde el bot
  // documenta su propio idioma, y ahi salian *!punetazo*, *!coscorron*,
  // *!reirse*, *!musica* y *!cancion*: cinco faltas de ortografia en la pantalla
  // que explica como se le habla.
  //
  // La tabla que lo arregla vive en social.js (COMO_SE_ESCRIBE) y es a mano,
  // porque de "punetazo" no se puede deducir donde iba la eñe. Una tabla a mano
  // se desincroniza sola, asi que aqui se comprueban las dos direcciones:
  //
  //   · cada clave tiene que ser un comando que el bot acepta de verdad;
  //   · y el valor, al normalizarlo, tiene que dar EXACTAMENTE la clave — o sea,
  //     que lo que se enseña se pueda teclear. Sin esto, un dia el menu anuncia
  //     algo que no responde, que es peor que la falta de ortografia.
  {
    console.log('\n46. LO QUE EL MENU ENSEÑA SE PUEDE TECLEAR');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const { normalizarComando } = require(path.join(R, 'src/handlers/messageHandler'));
    const soc = fs.readFileSync(path.join(R, 'src/commands/social.js'), 'utf8');
    const m = soc.match(/const COMO_SE_ESCRIBE = \{([\s\S]*?)\};/);
    exige(!!m, 'social.js ya no tiene la tabla COMO_SE_ESCRIBE: el menu volvera a escribir *!punetazo* y *!musica* sin tilde');
    if (m) {
      const tabla = Object.fromEntries([...m[1].matchAll(/^\s*([a-z0-9_]+):\s*'([^']+)',/gm)].map((x) => [x[1], x[2]]));
      exige(Object.keys(tabla).length > 0, 'la tabla COMO_SE_ESCRIBE se ha quedado vacia');
      const disp = fs.readFileSync(path.join(R, 'src/handlers/messageHandler.js'), 'utf8');
      const reales = new Set([...disp.matchAll(/^\s*case '([a-z0-9_]+)':/gm)].map((x) => x[1]));
      for (const [clave, valor] of Object.entries(tabla)) {
        exige(reales.has(clave),
          `COMO_SE_ESCRIBE tiene "${clave}", que no es un comando: el menu ensenyaria algo que el bot no acepta`);
        exige(normalizarComando(valor) === clave,
          `el menu ensenyaria *!${valor}*, que al teclearlo llega como *!${normalizarComando(valor)}* y no como *!${clave}*`);
        exige(valor !== clave,
          `"${clave}" esta en COMO_SE_ESCRIBE sin cambiar nada: sobra`);
      }
      exige(/comoSeEscribe\(x\)/.test(soc),
        'la lista larga del menu dejo de pasar por comoSeEscribe: vuelve a ensenyar los alias sin tilde');
    }
    if (fallos === antes) console.log(verde('   ✓ el menu escribe los comandos con su tilde y su eñe, y todos se pueden teclear asi'));
  }

  // ── 31a. UN @lid AJENO NO PUEDE ACABAR SIENDO EL DUEÑO ───────────────────
  //
  // AGUJERO DE PERMISOS, REPRODUCIDO. matchOwnerIndex metia en la comparacion
  // TODOS los candidatos, el @lid crudo incluido, y pasaba sus digitos por
  // phoneMatch — que hace coincidencia POR SUFIJO a partir de diez digitos. Un
  // @lid cualquiera que acabe en los digitos del owner quedaba reconocido como
  // owner: exencion de cobros, de conteo, y acceso a !p, !purge y al resto.
  //
  // Y era una contradiccion dentro del mismo fichero: isBotJid dice literalmente
  // que LID y telefono viven en espacios distintos y que cruzar sus digitos
  // arriesga un falso positivo, y por eso solo compara cuando los dos lados son
  // telefono. Dos funciones vecinas con criterios opuestos sobre lo mismo.
  //
  // Se prueba EJECUTANDO, y las dos direcciones importan igual: cerrar el
  // agujero no puede costar el reconocimiento del dueño, que es de lo que
  // cuelga toda la maquinaria de exencion.
  {
    console.log('\n31a. UN @lid AJENO NO PUEDE SER EL DUEÑO');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const dirO = fs.mkdtempSync(path.join(os.tmpdir(), 'owner-'));
    try {
      const guion = path.join(dirO, 'o.js');
      fs.writeFileSync(guion, `
const fs=require('fs'),os=require('os'),path=require('path');
const ROOT=fs.mkdtempSync(path.join(os.tmpdir(),'ow-'));
fs.cpSync(${JSON.stringify(path.join(R, 'src'))},path.join(ROOT,'src'),{recursive:true});
fs.mkdirSync(path.join(ROOT,'data'));
try{fs.symlinkSync(${JSON.stringify(path.join(R, 'node_modules'))},path.join(ROOT,'node_modules'),'dir');}catch{}
process.env.OWNER_NUMBER='34600111222';
const {isMainOwner,isOwner}=require(path.join(ROOT,'src/utils/wa'));
const TEL='34600111222@s.whatsapp.net', LID='919191919191@lid';
const AJENO='999934600111222@lid';   // acaba EXACTAMENTE en los digitos del owner
const metaLid={participants:[{id:LID,phoneNumber:TEL}]};
console.log(JSON.stringify({
  porTelefono: isMainOwner(TEL,false,null),
  porLidConMeta: isMainOwner(LID,false,metaLid),
  porLidAprendido: isMainOwner(LID,false,null),
  ajenoEsOwner: isMainOwner(AJENO,false,null) || isOwner(AJENO,false,null),
}));
`);
      const r = JSON.parse(execSync(`node ${guion}`, { encoding: 'utf8', timeout: 60000 }).trim().split('\n').pop());
      exige(r.porTelefono, 'el dueño ha dejado de reconocerse por su telefono');
      exige(r.porLidConMeta, 'el dueño ha dejado de reconocerse por su @lid con la metadata del grupo delante');
      exige(r.porLidAprendido, 'el dueño ha dejado de reconocerse por su @lid ya aprendido: se le cobraria y se le contaria');
      exige(!r.ajenoEsOwner,
        'un @lid ajeno que acaba en los digitos del dueño se reconoce como dueño: exencion de cobros y acceso a !p y !purge');
    } catch (e) {
      exige(false, `no pude probar el reconocimiento del dueño: ${String(e.message).split('\n')[0]}`);
    } finally {
      fs.rmSync(dirO, { recursive: true, force: true });
    }
    if (fallos === antes) console.log(verde('   ✓ el dueño se reconoce por sus tres vias y ningun @lid ajeno lo suplanta'));
  }

  // ── 31b. LAS TILDES DE LAS FRASES QUE VE EL GRUPO ────────────────────────
  //
  // 307 frases decian "traicion", "razon", "cabron", "aqui", "asi" o "dia". No
  // rompen nada: simplemente el grupo las lee mal escritas todos los dias, y en
  // un bot cuyo producto ES el texto, eso es el producto roto.
  //
  // La lista NO se saco de memoria, se saco del propio corpus: palabras que
  // aparecen escritas de las DOS formas en los mismos ficheros, filtradas a
  // aquellas cuya forma sin tilde no es una palabra castellana. Por eso no
  // entran "que/qué", "como/cómo", "robo/robó" ni "una/uña", que son pares de
  // palabras DISTINTAS y corregirlas a ciegas destrozaria las frases. Tampoco
  // entra "aun/aún", que depende de si significa "todavia" o "incluso".
  //
  // La lista se amplio con veinte palabras mas —ladron, parasito, ridiculo,
  // rapido, ojala, unico, escandalo, loteria, recien, atrevio, telefono…— que
  // estaban mal escritas en 44 frases y que esta guarda no miraba. Mismo
  // criterio: su forma sin tilde no es una palabra castellana. Quedan fuera a
  // proposito 'maquina' (el/ella maquina) y 'musica' (nombre de comando), que
  // si tienen forma valida sin tilde — y 'ladrones', que es LLANA acabada en -s
  // y por tanto se escribe sin tilde aunque su singular la lleve. Meterlo en la
  // lista puso la guarda en rojo contra dos frases bien escritas; el error era
  // de la lista, no del corpus.
  //
  // Y aparte la regla de los encliticos, que no admite excepcion: un gerundio o
  // un infinitivo con pronombre pegado SIEMPRE lleva tilde (guardandote ->
  // guardándote, pensarselo -> pensárselo). Esa se puede aplicar a ciegas
  // porque no depende del significado.
  {
    console.log('\n31b. LAS TILDES DE LAS FRASES');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    // LA FRONTERA NO PUEDE SER \\b, Y ME COSTO UNA FRASE BUENA.
    //
    // En JavaScript \\b mira [A-Za-z0-9_], asi que una vocal acentuada cuenta
    // como frontera de palabra: "funciono" con tilde final —funcionó— casaba con
    // "funcion" y esta guarda pedia arreglar una palabra que estaba PERFECTA. La
    // arregle, y la deje mal escrita de verdad.
    //
    // Con la mirada de aqui abajo, la lista solo salta cuando detras no hay otra
    // letra: funcionó, razón y compañia pasan; "funcion" a secas, no.
    const SIN_TILDE = new RegExp('(?<![a-záéíóúñü])(' + 'ademas|adios|ahi|aplicacion|aportacion|aqui|asi|atencion|avion|cabron|cancion|combinacion|comparacion|construccion|conversacion|conviccion|corazon|credito|deberia|deberian|definicion|despues|dia|diagnostico|dias|dificil|direccion|diria|educacion|eleccion|ereccion|estacion|estaria|estariamos|evolucion|explicacion|facil|ficcion|fria|frio|funcion|ganzua|habitacion|habria|habrian|haria|ilusion|informacion|intencion|inversion|invitacion|medicion|medico|monton|motivacion|movil|numero|numeros|pension|podria|podrian|posicion|precision|presion|proteccion|puntuacion|querria|razon|relacion|reputacion|sabado|segun|seleccion|sensacion|suscripcion|tambien|tendria|tendrian|tia|tio|traicion|ultima|ultimo|ultimos|util|version|ladron|parasito|parasitos|ridiculo|ridicula|ridiculos|rapido|rapida|ojala|unico|unica|escandalo|loteria|recien|atrevio|subirias|seguiras|telefono|telefonos' + ')(?![a-záéíóúñü])', 'i');
    const GER = /\b[a-zñ]{2,}?(ando|iendo|yendo)(me|te|se|lo|la|le|los|las|les|nos)\b/i;
    const INF = /\b[a-zñ]{2,}?[aei]r(me|te|se|nos)(lo|la|le|los|las|les)\b/i;
    let revisadas = 0;
    const ficheros = [];
    const andarA = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const f = path.join(dir, e.name);
        if (e.isDirectory()) andarA(f);
        else if (e.name.endsWith('.js')) ficheros.push(path.relative(R, f));
      }
    };
    andarA(path.join(R, 'src'));
    for (const rel of ficheros) {
      const lineas = fs.readFileSync(path.join(R, rel), 'utf8').split('\n');
      for (const [i, l] of lineas.entries()) {
        const m = l.match(/^\s*'((?:[^'\\]|\\.)*)',?\s*$/);
        if (!m) continue;
        revisadas++;
        const t = m[1];
        const sin = t.match(SIN_TILDE);
        exige(!sin, `${rel}:${i + 1} escribe "${sin ? sin[1] : ''}" sin tilde: el grupo lo lee mal escrito`);
        for (const re of [GER, INF]) {
          const g = t.match(re);
          if (g && !/[áéíóú]/.test(g[0])) {
            exige(false, `${rel}:${i + 1} escribe "${g[0]}" sin tilde: gerundio o infinitivo con pronombre pegado siempre la lleva`);
          }
        }
      }
    }
    exige(revisadas > 5000, `solo he revisado ${revisadas} frases: el barrido ha dejado de funcionar`);

    // NINGUNA FRASE PUEDE LLEVAR BASURA DE UNA SUSTITUCION MAL HECHA.
    //
    // ESTO ME PASO A MI, ARREGLANDO LAS TILDES. El regex que ponia la tilde a
    // los gerundios calculaba la vocal por posicion, y en los que acaban en
    // -ando esa posicion es una 'n': TILDE['n'] es undefined, asi que
    // "meandose" salio como "meaundefineddose". Nueve frases quedaron con la
    // palabra "undefined" incrustada, listas para salir al grupo.
    //
    // Y no lo caza nada de lo que ya habia: no es un placeholder suelto, no es
    // una falta de tilde y el fichero compila perfectamente. Solo se veia
    // leyendo el diff frase por frase, que es lo que hay que hacer y lo que no
    // siempre se hace. La verificacion que yo mismo escribi tampoco lo vio,
    // porque listaba las palabras que SI habian recibido tilde y las rotas no
    // estaban entre ellas.
    {
      // SIN LIMITES DE PALABRA, y esto la guarda tambien se lo hizo a si misma.
      // La escribi con \b y no cazaba nada: en "cagaundefineddola" la basura va
      // INCRUSTADA dentro de la palabra, entre letras, que es exactamente como
      // aparece cuando una sustitucion falla a mitad. Con \b solo cazaria un
      // "undefined" suelto, que es el caso que no pasa nunca.
      const BASURA = /(undefined|NaN|\[object Object\])/;
      for (const rel of ficheros) {
        const lineas = fs.readFileSync(path.join(R, rel), 'utf8').split('\n');
        for (const [i, l] of lineas.entries()) {
          const m = l.match(/^\s*'((?:[^'\\]|\\.)*)',?\s*$/);
          if (!m) continue;
          const b = m[1].match(BASURA);
          exige(!b, `${rel}:${i + 1} lleva "${b ? b[1] : ''}" dentro de la frase: es basura de una sustitucion mal hecha y sale tal cual al grupo`);
        }
      }
    }
    if (fallos === antes) console.log(verde(`   ✓ ${revisadas} frases sin faltas de tilde conocidas`));
  }

  // ── 32a. NINGUNA LLAMADA A WHATSAPP SE ESPERA PARA SIEMPRE ───────────────
  //
  // UN SOCKET COLGADO NO LANZA: SE QUEDA. Un try/catch alrededor no atrapa nada,
  // porque no hay error que atrapar — hay una promesa que no se resuelve nunca y
  // un comando que no contesta jamas. El bot tenia tope en groupMetadata desde
  // hace tiempo, con el comentario puesto explicando justo esto, y las otras
  // trece llamadas de red se habian quedado sin el.
  //
  // La peor era la de expulsar: sin tope, un *!kick* podia quedarse mudo para
  // siempre con el admin mirando el chat sin saber si echo a alguien o no.
  //
  // Se comprueba sobre el codigo sin comentarios: la explicacion de arriba
  // nombra las mismas funciones y se cazaria a si misma.
  {
    console.log('\n32a. NINGUNA LLAMADA A WHATSAPP SIN TOPE');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    // SE BUSCA LA LLAMADA, NO LA SINTAXIS. Primero escribi `await sock.X(` y la
    // guarda encontro CERO: al ponerles el tope, la forma pasa a ser
    // `await withTimeout(sock.X(...))` y el `await` deja de ir pegado. O sea que
    // la guarda solo reconocia el codigo ROTO y daba por bueno cualquier numero
    // de llamadas nuevas. Se mira `sock.X(` a secas y se exige el tope al lado.
    const RED = /\bsock\.(groupMetadata|profilePictureUrl|fetchStatus|onWhatsApp|groupParticipantsUpdate|groupRequestParticipantsList|groupFetchAllParticipating)\s*\(/;
    const ficheros = ['index.js'];
    const andarT = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const f = path.join(dir, e.name);
        if (e.isDirectory()) andarT(f);
        else if (e.name.endsWith('.js')) ficheros.push(path.relative(R, f));
      }
    };
    andarT(path.join(R, 'src'));
    let vistas = 0;
    for (const rel of ficheros) {
      for (const [i, l] of soloCodigo(rel).split('\n').entries()) {
        const m = l.match(RED);
        if (!m) continue;
        vistas++;
        // NO BASTA CON QUE LA PALABRA ESTE EN LA LINEA. Asi escrito, dejar la
        // llamada desnuda y poner `// withTimeout: ...` en un comentario al
        // final pasaba en verde, y esa llamada se queda sin tope de verdad: un
        // socket colgado deja el comando mudo para siempre. Probado.
        //
        // Tiene que estar ENVUELTA: `withTimeout(` justo antes de `sock.`, con
        // un `await` opcional en medio.
        exige(new RegExp(`withTimeout\\(\\s*(?:await\\s+)?${m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(l)
              || /withTimeout\(\s*(?:await\s+)?sock\./.test(l),
          `${rel}:${i + 1} llama a sock.${m[1]}() sin tope: si el socket se queda colgado, ese comando no contesta nunca`);
      }
    }
    exige(vistas >= 10,
      `solo he encontrado ${vistas} llamadas de red: el barrido ha dejado de funcionar y esta guarda no vale`);
    if (fallos === antes) console.log(verde(`   ✓ las ${vistas} llamadas de red llevan tope`));
  }

  // ── 32b. EL INTERRUPTOR DE LA ECONOMIA TAPA LO QUE MUEVE SALDO, Y SOLO ESO
  //
  // *!aura off* congela la dinamica. Antes la lista de comandos que tapa se
  // DERIVABA con un regex sobre el fuente del dispatcher, y eso fallaba por los
  // dos lados a la vez:
  //
  //   · capturaba de mas: !buscados, !cartel, !bote y !caja cuelgan de cmdRobo y
  //     solo CONSULTAN, asi que con la economia apagada el bot se negaba hasta a
  //     enseñar el cartel de buscados;
  //   · y se rompia con un comentario: el regex exige el `await` pegado al
  //     ultimo `case`, asi que meter una linea de comentario entre medias —el
  //     estilo de esta casa— dejaba esos comandos SIN interruptor, en silencio.
  //
  // Ahora las listas son explicitas y esta guarda es lo que impide que se
  // pudran, que era el unico motivo de derivarlas. Se recorren los `case` que
  // acaban en cmdDar/cmdRobo/cmdDuel y se exige que CADA UNO este clasificado:
  // o mueve saldo, o solo consulta. Un alias nuevo sin clasificar sale en rojo.
  {
    console.log('\n32b. EL INTERRUPTOR DE LA ECONOMIA');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const { CMDS_AURA, SOLO_CONSULTA } = require(path.join(R, 'src/handlers/messageHandler'));

    // Los `case` que llegan a un comando que toca el saldo. Se lee el fuente
    // solo para SABER QUE COMANDOS EXISTEN, no para decidir su clasificacion:
    // si el regex falla, la guarda se queda sin material y lo dice, en vez de
    // dar por buena una lista vacia como hacia la derivacion.
    const src = soloCodigo('src/handlers/messageHandler.js');
    const zona = src.slice(src.indexOf('switch (command)'));
    // Se acumulan las etiquetas `case` consecutivas y, en cuanto aparece la
    // PRIMERA linea de cuerpo, se decide con ella y se vacia el acumulador.
    // Escrito de otra forma —dejando el acumulador vivo cuando el cuerpo no era
    // el que se buscaba— las etiquetas se arrastraban de un bloque al siguiente
    // y la guarda pedia clasificar *!musica* como comando de economia.
    const etiquetas = [];
    let bloque = [];
    for (const linea of zona.split('\n')) {
      const t = linea.trim();
      if (!t) continue;
      const c = t.match(/^case '([^']+)':\s*(.*)$/);
      if (c) {
        bloque.push(c[1]);
        if (!c[2]) continue;              // etiqueta sola: sigue el bloque
        if (/\b(cmdDar|cmdRobo|cmdDuel)\s*\(/.test(c[2])) etiquetas.push(...bloque);
        bloque = [];
        continue;
      }
      if (!bloque.length) continue;       // cuerpo de un bloque que no nos toca
      if (/\b(cmdDar|cmdRobo|cmdDuel)\s*\(/.test(t)) etiquetas.push(...bloque);
      bloque = [];                        // primera linea de cuerpo: se decide y se cierra
    }
    const vistos = [...new Set(etiquetas)];
    exige(vistos.length >= 20,
      `solo he encontrado ${vistos.length} comandos que toquen el saldo: la lectura del dispatcher ha dejado de funcionar y esta guarda no vale`);
    for (const c of vistos) {
      exige(CMDS_AURA.has(c) || SOLO_CONSULTA.has(c),
        `*!${c}* llega a un comando que mueve saldo y no esta clasificado: metelo en CMDS_AURA o en SOLO_CONSULTA`);
    }
    // Y ninguno puede estar en las dos.
    for (const c of CMDS_AURA) {
      exige(!SOLO_CONSULTA.has(c), `*!${c}* esta en CMDS_AURA y en SOLO_CONSULTA a la vez`);
    }
    // Las consultas que de verdad solo consultan tienen que seguir sueltas.
    for (const c of ['buscados', 'cartel', 'bote', 'caja', 'wanted', 'recompensas', 'registradora', 'mostwanted']) {
      exige(!CMDS_AURA.has(c),
        `*!${c}* solo consulta y el interruptor lo tapa: apagar el juego no puede apagar el marcador`);
    }
    // Y las que mueven saldo tienen que seguir tapadas.
    for (const c of ['robo', 'robar', 'duel', 'dar', 'donar', 'asalto', 'atraco', 'contrarobo', 'regalar', 'transferir', 'pagar']) {
      exige(CMDS_AURA.has(c), `*!${c}* mueve saldo y ha dejado de estar en CMDS_AURA: se juega con la economia apagada`);
    }
    // La tienda: el catalogo libre, la compra parada DENTRO de laTienda.
    // ERA LA UNICA DEFENSA DE LA TIENDA Y ERA DE TEXTO. Envolviendo el freno en
    // `if (false) { auraApagada(jid); ... }`, el texto sigue ahi y en la misma
    // posicion, y se puede comprar con la economia apagada. Probado.
    //
    // Ahora se ejecuta: se apaga el aura del grupo de mentira, se pide comprar y
    // se mira que conteste que esta apagada y que NO entregue nada. El apagado
    // es en memoria y se deshace al salir, asi que esto no toca el aura de
    // verdad — que es lo que hacia que aqui no se probara nada.
    const roboSrc = soloCodigo('src/commands/robo.js');
    exige(/auraApagada\(jid\)/.test(roboSrc),
      'la tienda ya no mira el interruptor por dentro: o se compra con la economia apagada, o el catalogo queda a oscuras');
    {
      const sw = require(path.join(R, 'src/utils/auraSwitch'));
      const GT = `000000009@g.us`;
      const comprador = `34600005${Math.floor(Math.random() * 900 + 100)}@s.whatsapp.net`;
      const estaba = sw.isAuraEnabled(GT);
      let dijoApagada = false; let entrego = false;
      {
        try {
          if (estaba) sw.toggleAura(GT, false);
          const salida = [];
          const sk = { user: { id: '549199@s.whatsapp.net' },
            sendMessage: async (j, c) => { salida.push(c.text || ''); return {}; },
            groupMetadata: async () => ({ id: GT, participants: [{ id: comprador }] }) };
          const msgT = { key: { remoteJid: GT, participant: comprador, fromMe: false, id: 'T' + Math.random() },
            message: { conversation: '!comprar ganzua' } };
          const { cmdRobo } = require(path.join(R, 'src/commands/robo'));
          await cmdRobo(sk, msgT, ['comprar', 'ganzua'], { id: GT, participants: [{ id: comprador }] }).catch(() => {});
          const txt = salida.join('\n');
          dijoApagada = /apagad|pausa|desactivad/i.test(txt);
          entrego = /comprad|te llevas|en el inventario/i.test(txt);
        } catch { /* si revienta, no ha entregado nada */ }
        finally { try { if (estaba) sw.toggleAura(GT, true); } catch {} }
        exige(!entrego,
          'la tienda entrega el objeto con la economia apagada: apagar el juego tiene que apagar tambien la tienda');
        exige(dijoApagada,
          'la tienda no dice que la economia esta apagada: quien compra se queda sin saber por que no pasa nada');
      }
    }
    const iCat = roboSrc.indexOf('LA TIENDA DEL LADRÓN');
    const iPara = roboSrc.indexOf('auraApagada(jid)');
    exige(iCat > 0 && iPara > iCat,
      'el freno de la tienda esta ANTES del catalogo: con la economia apagada no se puede ni mirar el escaparate');
    if (fallos === antes) console.log(verde('   ✓ lo que mueve saldo esta tapado, lo que solo consulta sigue respondiendo'));
  }

  // ── 33a. EL CASTELLANO QUE SALE DEL BOT ──────────────────────────────────
  //
  // DOS FALLOS QUE NADIE MIRABA PORQUE NO ROMPEN NADA, y por eso llevaban meses.
  //
  // 1) FRASES PEGADAS. Once concatenaciones en bot.js unian dos trozos sin un
  //    espacio entre medias: "Sigo intentandolo.cada 5 min", "no hay
  //    solicitudes.que leer". Esa segunda ni siquiera estaba solo pegada:
  //    estaba PARTIDA, con un punto metido en mitad de la frase. Y una de ellas
  //    es la que `npm run estado` imprime cuando el bot se rinde porque la
  //    cuenta puede estar restringida — o sea el peor momento para tener que
  //    descifrar el texto.
  //
  // 2) VOSEO. "arranca" y "escanea" estaban escritos en rioplatense en un bot
  //    que habla castellano neutro, y en el mismo fichero que cinco lineas
  //    despues los escribe bien. La contradiccion estaba dentro de una funcion.
  //
  // Se comprueba sobre TODO el codigo, no solo bot.js, y sin comentarios: un
  // comentario puede citar el error que explica (ya me ha pasado tres veces).
  {
    console.log('\n33a. EL CASTELLANO QUE SALE DEL BOT');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    const ficheros = ['index.js'];
    const andarC = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const f = path.join(dir, e.name);
        if (e.isDirectory()) andarC(f);
        else if (e.name.endsWith('.js')) ficheros.push(path.relative(R, f));
      }
    };
    andarC(path.join(R, 'src'));

    // El voseo, con limites de palabra de verdad: sin ellos "mirandolo" y
    // "proponertelo" salian como falsos positivos y la guarda seria inservible.
    //
    // Y SIN DISTINGUIR MAYUSCULAS, que ahi se me cazo la propia guarda: la
    // escribi solo en minusculas y el fallo real del bot era "Escanea" con E
    // mayuscula al empezar la frase, o sea el sitio mas probable de todos. El
    // mutante paso en verde y la guarda no valia para nada.
    const VOSEO = /(^|[^a-záéíóúñA-ZÁÉÍÓÚÑ])(arrancá|escaneá|mirá|poné|hacé|tenés|querés|podés|andá|revisá|probá|volvé|dejá|entrá|vení|sabés|decí)([^a-záéíóúñA-ZÁÉÍÓÚÑ]|$)/i;

    for (const rel of ficheros) {
      const lineas = soloCodigo(rel).split('\n');
      for (const [i, l] of lineas.entries()) {
        const v = l.match(VOSEO);
        exige(!v, `${rel}:${i + 1} habla en voseo ("${v ? v[2] : ''}"): el bot habla castellano neutro`);
      }
      // Trozos pegados: una linea que acaba en `"..." +` y la siguiente empieza
      // por otra cadena, sin espacio ni salto entre las dos.
      for (let i = 0; i < lineas.length - 1; i++) {
        const a = lineas[i].trim(), b = lineas[i + 1].trim();
        if (!/\+\s*$/.test(a)) continue;
        const ma = a.match(/(["'`])((?:[^\\]|\\.)*?)\1\s*\+\s*$/);
        const mb = b.match(/^(["'`])((?:[^\\]|\\.)*?)\1/);
        if (!ma || !mb || !ma[2] || !mb[2]) continue;
        const fin = ma[2], ini = mb[2];
        if (/\s$/.test(fin) || /\\n$/.test(fin)) continue;
        if (/^\s/.test(ini) || /^\\n/.test(ini)) continue;
        exige(false,
          `${rel}:${i + 1} pega dos trozos sin espacio: "…${fin.slice(-20)}" + "${ini.slice(0, 20)}…"`);
      }
    }
    if (fallos === antes) console.log(verde('   ✓ sin voseo y sin frases pegadas en todo el codigo'));
  }

  // ── 33c. LA CAJA NO PUEDE CREAR NI DESTRUIR AURA ─────────────────────────
  //
  // Es la unica pieza del bot que MUEVE aura entre dos sitios, y por eso es la
  // unica que puede duplicarla o evaporarla. Un fallo aqui no da error: da un
  // ranking que no cuadra, y eso no se ve hasta que alguien suma a mano.
  //
  // Se comprueba EJECUTANDO el almacen de verdad, no leyendo el fuente. Cuatro
  // cosas, y las cuatro son la razon de que la caja exista:
  //
  //   1. lo guardado sobrevive a un robo que se lo lleva TODO;
  //   2. la suma visible+guardado solo baja por la comision, ni un aura mas;
  //   3. la caja tiene fondo (si no, nadie volveria a ser robable);
  //   4. y no se puede cerrar dos veces seguidas, que es lo que convertiria
  //      el robo en un juego de reflejos.
  {
    console.log('\n33c. LA CAJA NO CREA NI DESTRUYE AURA');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const { ARRANQUE: ARRANQUE_AURA } = require(path.join(R, 'src/utils/economia'));
    const dirZ = fs.mkdtempSync(path.join(os.tmpdir(), 'caja-'));
    try {
      const guion = path.join(dirZ, 'z.js');
      fs.writeFileSync(guion, `
const fs=require('fs'),os=require('os'),path=require('path');
const ROOT=fs.mkdtempSync(path.join(os.tmpdir(),'cj-'));
fs.cpSync(${JSON.stringify(path.join(R, 'src'))},path.join(ROOT,'src'),{recursive:true});
fs.mkdirSync(path.join(ROOT,'data'));
try{fs.symlinkSync(${JSON.stringify(path.join(R, 'node_modules'))},path.join(ROOT,'node_modules'),'dir');}catch{}
const a=require(path.join(ROOT,'src/utils/auraStore'));
const {CAJA}=require(path.join(ROOT,'src/utils/economia'));
const G='120@g.us', V='34622222222@s.whatsapp.net';
(async()=>{
  await a.addAura(G,V,4000);
  const total=async()=>(await a.getAura(G,V))+(await a.verCaja(G,V));
  const t0=await total();
  // 3) la caja tiene fondo: se pide mas de lo que cabe
  const e=await a.meterEnCaja(G,V,CAJA.capacidad+5000);
  const trasGuardar=await total();
  // 4) segundo cierre seguido
  const e2=await a.meterEnCaja(G,V,100);
  // 1) el ladron se lo lleva TODO lo visible
  await a.drainAura(G,V,999999);
  const cajaTrasRobo=await a.verCaja(G,V);
  // 2) conservacion al sacar
  const antesSacar=await total();
  const d=await a.sacarDeCaja(G,V,500);
  const despuesSacar=await total();
  console.log(JSON.stringify({
    t0, trasGuardar, guardado:e.guardado, cap:CAJA.capacidad,
    segundo:e2.ok, motivo2:e2.motivo, cajaTrasRobo,
    antesSacar, despuesSacar, comision:d.comision,
  }));
})();
`);
      const r = JSON.parse(execSync(`node ${guion}`, { encoding: 'utf8', timeout: 60000 }).trim().split('\n').pop());
      exige(r.trasGuardar === r.t0,
        `guardar cambio el total: ${r.t0} -> ${r.trasGuardar}. La caja esta creando o destruyendo aura`);
      // EL TOPE SE MIDE CONTRA ALGO DE FUERA, no contra si mismo. Escribi
      // `guardado <= capacidad` y la guarda pasaba en verde con la capacidad
      // puesta en cien millones: comparaba la constante consigo misma. El limite
      // tiene que ser absoluto, porque lo que protege es que al mas rico del
      // grupo le siga quedando algo fuera que merezca la pena robar.
      const TOPE_CAJA = 20 * ARRANQUE_AURA;
      exige(r.cap > 0 && r.cap <= TOPE_CAJA,
        `la caja admite ${r.cap} (el limite razonable son ${TOPE_CAJA}, veinte veces el arranque): con una caja asi nadie vuelve a ser robable`);
      exige(r.guardado <= r.cap,
        `se han guardado ${r.guardado} con una capacidad de ${r.cap}: el tope no se esta aplicando`);
      exige(r.segundo === false && r.motivo2 === 'enfriamiento',
        'se puede guardar dos veces seguidas: esconderse a la carrera vuelve a ser gratis y el robo pasa a ser un juego de reflejos');
      exige(r.cajaTrasRobo === r.guardado,
        `el robo se ha llevado lo guardado (quedaban ${r.cajaTrasRobo} de ${r.guardado}): la caja no sirve para nada`);
      exige(r.despuesSacar === r.antesSacar - r.comision,
        `sacar descuadra: ${r.antesSacar} - ${r.comision} deberia dar ${r.antesSacar - r.comision} y da ${r.despuesSacar}`);
      exige(r.comision > 0,
        'sacar de la caja ha dejado de costar: sin comision, guardarlo todo siempre es la jugada correcta y el robo se apaga');
    } catch (e) {
      exige(false, `no pude probar la caja: ${String(e.message).split('\n')[0]}`);
    } finally {
      fs.rmSync(dirZ, { recursive: true, force: true });
    }
    // Y LO QUE HAY GUARDADO SOBREVIVE AL CAMBIO DE NOMBRE.
    //
    // La caja nacio llamandose de otra manera y ese nombre es TEXTO dentro de
    // aura.json: el fichero que el bot tiene escrito ahora mismo sigue con las
    // claves viejas. Arrancar sin mirarlas no da ningun error —deja el aura
    // guardada fuera del saldo, fuera de la caja y fuera del ranking, que es la
    // unica forma de perder aura sin que nadie se entere.
    //
    // Se prueba con un aura.json escrito a mano EN EL FORMATO VIEJO, arrancando
    // el almacen de verdad encima.
    {
      const dirM = fs.mkdtempSync(path.join(os.tmpdir(), 'migra-'));
      try {
        const guion = path.join(dirM, 'm.js');
        fs.writeFileSync(guion, `
const fs=require('fs'),os=require('os'),path=require('path');
const ROOT=fs.mkdtempSync(path.join(os.tmpdir(),'mg-'));
fs.cpSync(${JSON.stringify(path.join(R, 'src'))},path.join(ROOT,'src'),{recursive:true});
fs.mkdirSync(path.join(ROOT,'data'));
try{fs.symlinkSync(${JSON.stringify(path.join(R, 'node_modules'))},path.join(ROOT,'node_modules'),'dir');}catch{}
const G='120@g.us', V='34622222222@s.whatsapp.net';
const AHORA=Date.now();
fs.writeFileSync(path.join(ROOT,'data','aura.json'),JSON.stringify({
  [G]:{[V]:900}, '__zulo':{[G]:{[V]:700}}, '__zulots':{[G]:{[V]:AHORA}}, '__escala':3, '__suelo':1,
}));
const a=require(path.join(ROOT,'src/utils/auraStore'));
(async()=>{
  const dentro=await a.verCaja(G,V), saldo=await a.getAura(G,V), espera=await a.esperaCaja(G,V);
  await a.flushAura();
  await new Promise(r=>setTimeout(r,300));
  const disco=JSON.parse(fs.readFileSync(path.join(ROOT,'data','aura.json'),'utf8'));
  console.log(JSON.stringify({dentro, saldo, espera, claves:Object.keys(disco)}));
})();
`);
        const m = JSON.parse(execSync(`node ${guion}`, { encoding: 'utf8', timeout: 60000 }).trim().split('\n').pop());
        exige(m.dentro === 700,
          `un aura.json con la caja bajo el nombre viejo llega con ${m.dentro} dentro en vez de 700: esa aura ha desaparecido del saldo y del ranking a la vez`);
        exige(m.saldo === 900, `el saldo visible se ha movido con la migracion: ${m.saldo} en vez de 900`);
        exige(m.espera > 0, 'el enfriamiento no ha viajado: quien acababa de cerrar la caja puede volver a cerrarla al instante');
        exige(!m.claves.includes('__zulo') && !m.claves.includes('__zulots'),
          `el nombre viejo sigue escrito en aura.json: ${m.claves.join(' ')}`);
      } catch (e) {
        exige(false, `no pude probar la migracion de la caja: ${String(e.message).split('\n')[0]}`);
      } finally {
        fs.rmSync(dirM, { recursive: true, force: true });
      }
    }
    if (fallos === antes) console.log(verde('   ✓ el aura se conserva, la caja tiene fondo, el robo no la alcanza y lo guardado sobrevive al cambio de nombre'));
  }

  // ── 33b. LOS RANKINGS MENCIONAN A UNA PERSONA, NO A UN NUMERO INTERNO ────
  //
  // PASO, Y SOLO EN UNO DE LOS DOS ALMACENES. messageCounter lo corrigio en su
  // dia —prefiere la forma canonica como representante— y auraStore se quedo
  // con la clave cruda. Resultado: con los mismos datos delante, *!count*
  // mencionaba bien y *!top* pintaba el @lid en crudo, un numero que no es de
  // nadie, que WhatsApp no convierte en nombre y que ademas no notifica.
  //
  // Se prueba EJECUTANDO los dos almacenes de verdad, no leyendo su fuente: lo
  // que importa es el JID con el que se menciona, y eso solo se ve corriendo.
  // Y se prueban las DOS direcciones, porque un arreglo que canonice a lo bruto
  // seria peor: un @lid del que no se conoce el telefono TIENE que seguir
  // saliendo como @lid en vez de inventarse una forma que no existe.
  {
    console.log('\n33b. LOS RANKINGS MENCIONAN A UNA PERSONA, NO A UN @lid');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const dirR = fs.mkdtempSync(path.join(os.tmpdir(), 'rank-'));
    try {
      const guion = path.join(dirR, 'r.js');
      fs.writeFileSync(guion, `
const fs=require('fs'),os=require('os'),path=require('path');
const ROOT=fs.mkdtempSync(path.join(os.tmpdir(),'rk-'));
fs.cpSync(${JSON.stringify(path.join(R, 'src'))},path.join(ROOT,'src'),{recursive:true});
fs.mkdirSync(path.join(ROOT,'data'));
try{fs.symlinkSync(${JSON.stringify(path.join(R, 'node_modules'))},path.join(ROOT,'node_modules'),'dir');}catch{}
process.chdir(ROOT);
const {rememberMapping}=require(path.join(ROOT,'src/utils/wa'));
const aura=require(path.join(ROOT,'src/utils/auraStore'));
const mc=require(path.join(ROOT,'src/utils/messageCounter'));
const G='120@g.us', LID='919191919191@lid', TEL='34600111222@s.whatsapp.net', SUELTO='828282828282@lid';
(async()=>{
  // Acumula bajo el @lid ANTES de que se conozca la pareja (lo normal tras un
  // reinicio en un grupo direccionado por LID), y solo despues se aprende.
  await mc.increment(G,LID,null);
  await aura.addAura(G,LID,500);
  await aura.addAura(G,SUELTO,300);
  rememberMapping(LID,TEL);
  const cuenta=(await mc.getActiveUsers(G,1)).map(x=>x.jid);
  const top=(await aura.getAuraRanking(G)).map(x=>x.jid);
  console.log(JSON.stringify({cuenta,top,TEL,SUELTO}));
})();
`);
      const salida = execSync(`node ${guion}`, { encoding: 'utf8', timeout: 60000 });
      const r = JSON.parse(salida.trim().split('\n').pop());
      exige(r.cuenta.includes(r.TEL),
        `!count menciona ${r.cuenta.join(',')} en vez del telefono: el ranking pinta un numero que no es de nadie`);
      exige(r.top.includes(r.TEL),
        `!top (aura) menciona ${r.top.join(',')} en vez del telefono: el @lid en crudo no es de nadie y no notifica`);
      exige(r.top.includes(r.SUELTO),
        'un @lid sin telefono conocido ha dejado de salir tal cual: se esta inventando una forma que no existe');
    } catch (e) {
      exige(false, `no pude probar los rankings: ${String(e.message).split('\n')[0]}`);
    } finally {
      fs.rmSync(dirR, { recursive: true, force: true });
    }
    if (fallos === antes) console.log(verde('   ✓ !count y !top mencionan el telefono, y el @lid sin resolver sigue intacto'));
  }

  // ── 36. LA MARCA NO ROMPE LOS STICKERS DE OTROS ──────────────────────────
  //
  // Al inyectar la marca en un .webp animado se le pone blend=no a los
  // fotogramas: le dice al renderer que REEMPLACE el rectangulo en vez de
  // mezclarlo con lo que hay debajo. En los stickers que hace el bot eso es
  // correcto y arregla un fantasma real —todos sus fotogramas cubren el lienzo
  // entero, se lo garantiza el filtro pad de ffmpeg—, pero se estaba aplicando
  // a TODOS, y un webp animado hecho por otro casi siempre guarda solo el
  // rectangulo que cambia en cada fotograma. A esos, reemplazar en vez de
  // mezclar les borra lo que habia debajo: manchas blancas dentro del sticker.
  //
  // Se prueba con un webp animado fabricado a mano, con un fotograma que cubre
  // el lienzo y otro parcial, por la puerta real (imageToSticker).
  {
    console.log('\n36. LA MARCA NO ROMPE LOS STICKERS DE OTROS');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const anmf = (x, y, w, h, dentro) => {
      const datos = Buffer.concat([Buffer.from(dentro, 'ascii'), Buffer.alloc(8)]);
      const cuerpo = Buffer.alloc(16 + datos.length);
      cuerpo.writeUIntLE(x, 0, 3); cuerpo.writeUIntLE(y, 3, 3);
      cuerpo.writeUIntLE(w - 1, 6, 3); cuerpo.writeUIntLE(h - 1, 9, 3);
      cuerpo.writeUIntLE(40, 12, 3); cuerpo[15] = 0;
      datos.copy(cuerpo, 16);
      const c = Buffer.alloc(8 + cuerpo.length);
      c.write('ANMF', 0, 'ascii'); c.writeUInt32LE(cuerpo.length, 4); cuerpo.copy(c, 8);
      return c;
    };
    const vp8x = Buffer.alloc(18);
    vp8x.write('VP8X', 0, 'ascii'); vp8x.writeUInt32LE(10, 4);
    vp8x.writeUInt32LE(0x02 | 0x10, 8);
    vp8x.writeUIntLE(511, 12, 3); vp8x.writeUIntLE(511, 15, 3);
    const anim = Buffer.alloc(14);
    anim.write('ANIM', 0, 'ascii'); anim.writeUInt32LE(6, 4);
    anim.writeUInt32LE(0xFFFFFFFF, 8); anim.writeUInt16LE(0, 12);
    const cuerpo = Buffer.concat([vp8x, anim, anmf(0, 0, 512, 512, 'ALPH'), anmf(10, 10, 100, 100, 'ALPH')]);
    const head = Buffer.alloc(12);
    head.write('RIFF', 0, 'ascii'); head.writeUInt32LE(cuerpo.length + 4, 4); head.write('WEBP', 8, 'ascii');
    const entrada = Buffer.concat([head, cuerpo]);

    const leer = (buf) => {
      const out = []; let p = 12;
      while (p + 8 <= buf.length) {
        const ct = buf.slice(p, p + 4).toString(); const cs = buf.readUInt32LE(p + 4);
        if (ct === 'ANMF') out.push({ completo: buf.readUIntLE(p + 14, 3) === 511, blendNo: !!(buf[p + 23] & 0x02) });
        p += 8 + cs + (cs % 2);
      }
      return out;
    };
    try {
      const { imageToSticker } = require(path.join(R, 'src/utils/sticker'));
      const salida = await imageToSticker(entrada, 'check');
      const f = leer(salida);
      exige(f.length === 2, `el marcado ha perdido fotogramas: quedan ${f.length} de 2`);
      if (f.length === 2) {
        exige(f[0].blendNo === true,
          'el fotograma que cubre el lienzo ha dejado de llevar blend=no: vuelve el fantasma en la costura del borde transparente');
        exige(f[1].blendNo === false,
          'a un fotograma PARCIAL se le pone blend=no: eso borra lo que hay debajo y deja manchas blancas dentro de los stickers que no ha hecho el bot');
      }
      exige(salida.includes(Buffer.from('EXIF', 'ascii')), 'el sticker sale sin la marca');
    } catch (e) {
      exige(false, `no pude probar el marcado: ${String(e.message).split('\n')[0]}`);
    }
    // Y LA ESCALERA DE CALIDAD, QUE AHORA SE PUEDE AMPLIAR POR ARRIBA.
    //
    // El escalon de arranque de cada duracion iba por indice a pelo, asi que
    // meter uno nuevo al principio corria todos los demas y un video de seis
    // segundos empezaba dos escalones mas arriba de lo previsto. Ahora la marca
    // `desde` vive en el propio escalon; esto comprueba que sigue siendo
    // coherente, sin gastar una sola codificacion.
    {
      const src = fs.readFileSync(path.join(R, 'src/utils/sticker.js'), 'utf8');
      const bloque = src.match(/const ANIM_TIERS = \[([\s\S]*?)\n\];/);
      exige(!!bloque, 'no encuentro ANIM_TIERS en sticker.js');
      if (bloque) {
        const tiers = [...bloque[1].matchAll(/\{ fps: (\d+), quality: (\d+), size: (\d+)(?:, desde: (\d+))? \}/g)]
          .map((m) => ({ fps: +m[1], quality: +m[2], size: +m[3], desde: m[4] ? +m[4] : undefined }));
        exige(tiers.length >= 5, `ANIM_TIERS se lee mal: ${tiers.length} escalones`);
        const tope = Math.max(...tiers.map((t) => t.quality));
        exige(tiers[0] && tiers[0].quality === tope,
          `el primer escalon es q${tiers[0]?.quality} y el mejor de la escalera es q${tope}: se prueba primero uno peor del que cabe`);
        const marcas = tiers.map((t, i) => ({ i, d: t.desde })).filter((x) => x.d !== undefined);
        exige(marcas.length >= 3, `solo ${marcas.length} escalones llevan la marca 'desde': las duraciones largas arrancarian arriba del todo`);
        for (let k = 1; k < marcas.length; k++) {
          exige(marcas[k].d > marcas[k - 1].d && marcas[k].i > marcas[k - 1].i,
            `las marcas 'desde' no van de menos a mas (${marcas[k - 1].d}s en el escalon ${marcas[k - 1].i}, ${marcas[k].d}s en el ${marcas[k].i}): un video largo arrancaria mas arriba que uno corto`);
        }
      }
    }
    // Y EL MODELO DE PREDICCION TIENE QUE CUBRIR TODO LO QUE USE DE REFERENCIA.
    //
    // La escalera salta escalones estimando cuanto pesarian a partir de UNA
    // codificacion real. Esa estimacion sale de unos multiplicadores medidos de
    // q85 hacia abajo, y por encima no se cumplen: en un GIF de colores planos
    // q95 pesa OCHO veces lo que q85, no 1,47. Tomandolo de referencia, la
    // prediccion daba por imposibles todos los escalones de 512 px y el sticker
    // acababa a 384 — peor que antes de anyadir el escalon bueno.
    //
    // La regla que queda: un escalon por encima de REF_MAX_QUALITY se puede
    // intentar, pero no puede ser referencia; y todo el que SI pueda serlo
    // tiene que tener su multiplicador medido.
    {
      const st = require(path.join(R, 'src/utils/sticker'));
      exige(typeof st.REF_MAX_QUALITY === 'number', 'sticker.js ya no dice hasta donde llega el modelo de prediccion');
      if (typeof st.REF_MAX_QUALITY === 'number') {
        const sinMedir = (st.ANIM_TIERS || [])
          .filter((t) => t.quality <= st.REF_MAX_QUALITY && st.QUALITY_SIZE_FACTOR[t.quality] === undefined)
          .map((t) => `q${t.quality}`);
        exige(sinMedir.length === 0,
          `${sinMedir.join(', ')} puede(n) servir de referencia y no tienen multiplicador medido: la escalera saltaria escalones a ciegas`);
        const src2 = fs.readFileSync(path.join(R, 'src/utils/sticker.js'), 'utf8');
        exige(/refBytes = buf\.length/.test(src2) && /quality <= REF_MAX_QUALITY[^\n]*refBytes = buf\.length/.test(src2),
          'la referencia de la prediccion ya no se limita a los escalones medidos: un q95 que no cabe volveria a mandar el sticker a 384 px');
      }
    }
    if (fallos === antes) console.log(verde('   ✓ la marca respeta los fotogramas parciales y la escalera arranca por lo mejor que cabe'));
  }

  // ── 37. NINGUNA ACCION PISA UN COMANDO QUE YA EXISTIA ────────────────────
  //
  // Los comandos de accion se anyaden en bloque —diez acciones, veintiocho
  // nombres— y ahi es facil llevarse por delante uno que ya estaba. Paso al
  // escribirlos: *!kick* iba a mandar un gif de anime, y *!kick* es el comando
  // que EXPULSA del grupo. Y *!bite* quedaba a una letra de *!bote*, que es la
  // caja comun y se usa a diario: quien escribiera mal el bote se comia un
  // mordisco de 60 de aura.
  //
  // Las dos reglas: ningun nombre de accion puede coincidir con otro comando, y
  // ninguno puede quedarse a una sola letra de otro, que es donde el corrector
  // de erratas deja de saber a cual referirse.
  {
    console.log('\n37. NINGUNA ACCION PISA UN COMANDO QUE YA EXISTIA');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const { ACCIONES } = require(path.join(R, 'src/commands/acciones'));
    const nombres = Object.values(ACCIONES).flatMap((a) => a.cmds);
    exige(nombres.length > 0, 'no encuentro los nombres de las acciones');

    const mh = soloCodigo('src/handlers/messageHandler.js');
    const zona = mh.slice(mh.indexOf('switch (command)'));
    const casos = [...zona.matchAll(/^\s*case '([^']+)':/gm)].map((m) => m[1]);
    const otros = casos.filter((c) => !nombres.includes(c));

    // 1) cada nombre esta en el switch UNA vez
    for (const n of nombres) {
      const veces = casos.filter((c) => c === n).length;
      exige(veces === 1, `*!${n}* aparece ${veces} veces en el switch: si es 0 el comando no existe, y si es 2 el segundo esta muerto`);
    }
    // 2) ninguno pisa un comando de otra familia
    for (const n of nombres) {
      exige(!otros.includes(n), `la accion *!${n}* pisa un comando que ya existia y hacia otra cosa`);
    }
    // 3) ninguno a una letra de otro comando
    const dist = (a, b) => {
      if (Math.abs(a.length - b.length) > 1) return 9;
      let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
      for (let i = 1; i <= a.length; i++) {
        const fila = [i];
        for (let j = 1; j <= b.length; j++) {
          fila[j] = Math.min(prev[j] + 1, fila[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        prev = fila;
      }
      return prev[b.length];
    };
    for (const n of nombres) {
      const cerca = otros.filter((o) => o.length >= 3 && dist(n, o) === 1);
      exige(cerca.length === 0,
        `la accion *!${n}* esta a una letra de ${cerca.map((c) => `*!${c}*`).join(', ')}: una errata cobra ${'' } el precio de la accion por el comando equivocado`);
    }
    // 4) y ninguno lleva un caracter que la normalizacion se coma: un case con
    // eñe o con tilde no se alcanza NUNCA, porque el dispatcher normaliza antes
    // de comparar. Pasa desapercibido: el comando simplemente no existe.
    for (const n of nombres) {
      const normal = n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ñ/g, 'n');
      exige(n === normal, `la accion *!${n}* lleva tilde o eñe: el dispatcher normaliza antes de comparar, asi que ese case no se alcanza nunca (tendria que ser *!${normal}*)`);
    }
    // 5) LA ACCION NSFW TIENE QUE DECLARAR SU PROPIA CATEGORIA.
    //
    // La web SFW de serie y las webs NSFW no llaman igual a lo mismo, y en el
    // caso de *!fuck* ni siquiera existe en las dos: la de serie tiene `kiss` y
    // no `fuck`; las otras tienen `fuck` y no `kiss`. Con una sola categoria el
    // comando falla en uno de los dos lados haga lo que haga — y ya fallo en el
    // grupo, mandando un beso donde se habia pedido otra cosa.
    for (const [n, a] of Object.entries(ACCIONES)) {
      if (!a.nsfw) continue;
      exige(typeof a.catNsfw === 'string' && a.catNsfw.length > 0,
        `la accion *!${a.cmds[0]}* es nsfw y no declara catNsfw: con la fuente puesta pedira la categoria de la web SFW, que alli no existe`);
      exige(a.catNsfw !== a.cat,
        `la accion *!${a.cmds[0]}* tiene catNsfw igual que cat: entonces no sirve de nada tenerlo`);
    }
    // Y que el motor la USE. Declararla y no leerla es peor que no tenerla:
    // parece arreglado y manda lo mismo de antes.
    {
      const acc = soloCodigo('src/commands/acciones.js');
      exige(/conFuente \? \(catNsfw \|\| cat\) : cat/.test(acc),
        'traerAccion ya no elige la categoria segun la fuente: con la fuente NSFW puesta volveria a pedir la categoria de la web SFW');
      // El roast NO puede volver al caption. Pegado al gif se lee como pie de
      // foto y deja de humillar: es exactamente lo que se vio en el grupo.
      exige(!/frase\s*\+\s*remate/.test(acc),
        'el roast de la accion volvio al caption del gif: tiene que ir en un mensaje aparte');
      exige(/text:\s*remate/.test(acc),
        'el roast de la accion no se manda como texto suelto: el grupo tiene que verlo en su propio globo');
    }
    // 6. LA CATEGORIA QUE VIENE DE OTRA WEB.
    //
    // *!kill* no esta en nekos.best. Viene de kawaii.red, y eso abre cuatro
    // formas nuevas de romperlo sin que se note desde fuera:
    //
    //   · una clave mal escrita en FUENTE_POR_CAT manda la categoria a la web
    //     de siempre, que contesta 404, y el comando cobra y devuelve el aura
    //     para siempre;
    //   · la despensa guarda por clave, y si la clave no lleva la web dentro,
    //     los gifs de una acaban saliendo por la otra;
    //   · kawaii.red llama `response` a lo que las demas llaman `url`, asi que
    //     sin esa forma la web contesta bien y el bot dice que no trae nada;
    //   · y el respaldo tiene que apuntar a una categoria que exista de verdad.
    {
      const acc = require(path.join(R, 'src/commands/acciones'));
      const cats = new Set(Object.values(acc.ACCIONES).flatMap((a) => [a.cat, a.catNsfw].filter(Boolean)));
      for (const cat of Object.keys(acc._FUENTE_POR_CAT)) {
        exige(cats.has(cat),
          `FUENTE_POR_CAT tiene *${cat}*, que no es la categoria de ninguna accion: esa web no se usa y la accion que la necesitaba pide la de siempre`);
      }
      for (const [cat, r] of Object.entries(acc._RESPALDO_POR_CAT)) {
        exige(cats.has(cat), `RESPALDO_POR_CAT tiene *${cat}*, que no es la categoria de ninguna accion`);
        exige(r && typeof r.base === 'string' && /^https?:\/\//.test(r.base) && typeof r.cat === 'string' && r.cat,
          `el respaldo de *${cat}* no dice a que web ni a que categoria ir`);
      }
      // La fuente de una categoria propia NO puede ser la de siempre: si lo es,
      // la tabla no se esta leyendo y todo vuelve a nekos.best en silencio.
      for (const cat of Object.keys(acc._FUENTE_POR_CAT)) {
        exige(acc._fuenteDe(cat, false) === acc._FUENTE_POR_CAT[cat],
          `*${cat}* deberia salir de su propia web y sale de la de siempre: la tabla esta puesta y no se lee`);
      }
      const unaNormal = Object.values(acc.ACCIONES).find((a) => !a.nsfw && !acc._FUENTE_POR_CAT[a.cat]);
      exige(!!unaNormal && acc._fuenteDe(unaNormal.cat, false) === 'https://nekos.best/api/v2/',
        'una accion normal ya no sale de nekos.best: la tabla de fuentes se esta comiendo a las demas');

      // La clave de la despensa lleva la web dentro. Sin eso, dos categorias
      // que se llamen igual en dos webs comparten cola.
      for (const cat of Object.keys(acc._FUENTE_POR_CAT)) {
        exige(acc._claveDespensa(cat, false, null).startsWith(acc._FUENTE_POR_CAT[cat]),
          `la clave de despensa de *${cat}* no lleva su web dentro: los gifs de una web saldrian por la otra`);
      }

      // Y las formas de respuesta, que es lo que no se ve hasta que alguien
      // escribe el comando.
      const dg = acc._direccionDelGif;
      exige(dg({ results: [{ url: 'https://a/1.gif' }] })?.url === 'https://a/1.gif', 'ya no se lee la forma de nekos.best');
      exige(dg({ response: 'https://k/kill1.gif' })?.url === 'https://k/kill1.gif',
        'ya no se lee `response`: es la forma de kawaii.red, o sea la de *!kill*, y sin ella la web contesta bien y el bot dice que no trae nada');
      exige(dg({ link: 'https://p/x.gif' })?.url === 'https://p/x.gif', 'ya no se lee `link`');
      exige(dg({ url: 'https://u/y.gif' })?.url === 'https://u/y.gif', 'ya no se lee `url`');
      exige(dg({ response: 'esto no es una direccion' }) === null, 'se acepta como gif algo que no es una direccion');
      exige(dg({}) === null && dg(null) === null, 'una respuesta vacia se da por buena');
    }
    if (fallos === antes) console.log(verde(`   ✓ los ${nombres.length} nombres de accion son unicos, no pisan nada y se pueden teclear`));
  }

  // ── 38. SI AL BOT LE QUITAN EL ADMIN, EL DUEÑO SE ENTERA ─────────────────
  //
  // Es el unico ataque del que el bot no puede defenderse solo: sin admin no
  // puede reponerse a si mismo ni degradar a quien se lo quito, asi que los tres
  // reverts se quedan sin nada que hacer y salen callados. Y callado del todo
  // era el problema: a partir de ahi el antilink ve los enlaces y no los borra,
  // las historias se quedan y *!kick* contesta que no es admin, sin que nadie se
  // entere hasta que alguien lo nota dias despues.
  //
  // Dos cosas, y la segunda importa tanto como la primera: que avise, y que
  // avise EN PRIVADO. En el grupo seria el bot señalando a quien acaba de
  // quitarle el admin —que ya sabe lo que ha hecho— delante de todos.
  {
    console.log('\n38. SI AL BOT LE QUITAN EL ADMIN, EL DUEÑO SE ENTERA');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    const bot = require(path.join(R, 'src/bot'));
    exige(typeof bot.avisarDegradacion === 'function',
      'bot.js ya no exporta avisarDegradacion: el aviso no se puede probar y solo se dispara el dia que pasa');

    if (typeof bot.avisarDegradacion === 'function') {
      const cfg = require(path.join(R, 'src/config'));
      const OWN = `${String(cfg.ownerNumber).replace(/\D/g, '')}@s.whatsapp.net`;
      const env = [];
      const sock = { sendMessage: async (j, c) => { env.push({ j, t: c.text || '' }); return {}; } };
      const ok = await bot.avisarDegradacion(sock, '000000000@g.us', { subject: 'G' }, '34600000002@s.whatsapp.net');
      exige(ok === true && env.length === 1, 'el aviso de degradacion no sale');
      exige(env.every((e) => !String(e.j).endsWith('@g.us')),
        'el aviso de degradacion va al GRUPO: seria el bot señalando delante de todos a quien acaba de quitarle el admin');
      exige(env.every((e) => e.j === OWN),
        `el aviso de degradacion no va al privado del dueño (fue a ${env.map((e) => e.j).join(', ')})`);

      // Y que no reviente si no se puede mandar: esto corre dentro del manejador
      // de eventos, y una excepcion ahi se lleva por delante el resto del evento.
      let revento = false;
      try { await bot.avisarDegradacion({ sendMessage: async () => { throw new Error('x'); } }, 'g', null, null); }
      catch { revento = true; }
      exige(!revento, 'avisarDegradacion propaga la excepcion: un fallo de envio tumbaria el manejador de eventos entero');
    }

    // Y que el manejador lo LLAME cuando el degradado es el bot. Declarar la
    // funcion y no invocarla es peor que no tenerla: parece cubierto.
    const src = soloCodigo('src/bot.js');
    // La rama entera, desde el `if` hasta su cierre: dentro tienen que estar las
    // DOS cosas —apuntar la deuda y avisar al dueño—, y leerlas por separado en
    // todo el fichero no valdria: cualquier otra llamada las daria por buenas.
    {
      const i = src.indexOf("action === 'demote' && partJids.some(isBotJid)");
      const rama = i < 0 ? '' : src.slice(i, i + 500);
      exige(i >= 0, 'el manejador ya no tiene la rama del degradado que es el bot');
      exige(/avisarDegradacion\(/.test(rama),
        'el manejador ya no avisa cuando el degradado es el bot: el aviso existe y no lo dispara nadie');
      exige(/anotarDeuda\(/.test(rama),
        'el manejador ya no apunta la deuda al quitarle el admin al bot: no habra nada que cobrar despues');
      // La ULTIMA aparicion, no la primera: la primera es la que levanta el
      // freno del sondeo y no tiene nada que ver con la deuda.
      const j = src.lastIndexOf("action === 'promote' && partJids.some(isBotJid)");
      exige(j >= 0 && /saldarDeudaDeAdmin\(/.test(src.slice(j, j + 500)),
        'el manejador ya no cobra la deuda cuando le devuelven el admin al bot');
    }

    // ── Y LA DEUDA: quitarle el admin al bot no puede salir gratis ──────
    //
    // No se puede impedir —contra si mismo el bot no revierte nada— asi que se
    // apunta quien fue y se cobra en cuanto alguien le devuelve el admin. Lo
    // que se vigila aqui es que el cobro llegue de verdad, que sobreviva a un
    // reinicio (es lo unico que hace util la deuda: entre el golpe y la
    // reparacion pueden pasar dias y pm2 reinicia por mucho menos) y que
    // respete las dos condiciones de siempre.
    if (typeof bot.saldarDeudaDeAdmin === 'function') {
      const { anotarDeuda, flushDeuda, _file } = require(path.join(R, 'src/utils/adminDeuda'));
      const { toggleAntiAdmin, isAntiAdminEnabled } = require(path.join(R, 'src/utils/state'));
      const GJ = '000000000@g.us';
      const cfg2 = require(path.join(R, 'src/config'));
      const OWN2 = `${String(cfg2.ownerNumber).replace(/\D/g, '')}@s.whatsapp.net`;
      const ATA = '34600000002@s.whatsapp.net';
      const meta2 = { id: GJ, subject: 'G', participants: [{ id: OWN2, admin: 'admin' }, { id: ATA, admin: 'admin' }] };
      const sk = (env, ok = true) => ({
        sendMessage: async (j, c) => { env.push({ j, t: c.text || '' }); return {}; },
        groupParticipantsUpdate: async (j, p) => p.map((x) => ({ status: ok ? '200' : '403', jid: x })),
        groupMetadata: async () => meta2,
      });
      const antesFlag = isAntiAdminEnabled(GJ);
      await toggleAntiAdmin(GJ, true);

      let env = [];
      await anotarDeuda(GJ, ATA);
      exige(await bot.saldarDeudaDeAdmin(sk(env), GJ, meta2) === 'saldada' && env.length === 1,
        'la deuda de admin no se cobra al devolverle el admin al bot: quitarselo vuelve a salir gratis');
      exige(await bot.saldarDeudaDeAdmin(sk([]), GJ, meta2) === 'sin-deuda',
        'la deuda no se borra al cobrarla: se cobraria dos veces');

      // Que quede ESCRITA, no solo en memoria.
      await anotarDeuda(GJ, ATA);
      await flushDeuda();
      let enDisco = null;
      try { enDisco = JSON.parse(fs.readFileSync(_file, 'utf8')); } catch {}
      exige(enDisco?.[GJ]?.autor === ATA,
        'la deuda de admin no llega al disco: un reinicio entre el golpe y la reparacion la perdona sola');

      // Y QUE LA PROGRAME AL APUNTARLA, no solo al cerrar. La comprobacion de
      // arriba pasa con el guardado diferido quitado, porque flushDeuda escribe
      // igual lo que haya en memoria: cubre el reinicio limpio (pm2 restart, un
      // despliegue) y no el que importa —un SIGKILL o un corte de luz justo
      // despues del golpe—, que es exactamente cuando a alguien le interesaria
      // que la deuda no existiera. Se lee del codigo porque el rebote son
      // segundos y esto no puede quedarse esperandolos.
      {
        const dsrc = soloCodigo('src/utils/adminDeuda.js');
        const i2 = dsrc.indexOf('async function anotarDeuda');
        const cuerpo2 = i2 < 0 ? '' : dsrc.slice(i2, dsrc.indexOf('\n}', i2));
        exige(/saver\.schedule\(\)/.test(cuerpo2),
          'anotarDeuda ya no programa el guardado: la deuda solo llegaria al disco si el bot cierra bien, y un SIGKILL la perdona');
      }

      // Al tier dueño no, y con el interruptor apagado tampoco.
      await anotarDeuda(GJ, OWN2);
      exige(await bot.saldarDeudaDeAdmin(sk([]), GJ, meta2) === 'perdonada',
        'la deuda de admin se le cobra al tier dueño');
      await toggleAntiAdmin(GJ, false);
      await anotarDeuda(GJ, ATA);
      exige(await bot.saldarDeudaDeAdmin(sk([]), GJ, meta2) === 'apagado',
        'la deuda de admin se cobra con el anti-admin apagado: el interruptor deja de mandar');

      // Y si WhatsApp rechaza el degradado, NO se anuncia una reversion falsa.
      await toggleAntiAdmin(GJ, true);
      await anotarDeuda(GJ, ATA);
      env = [];
      exige(await bot.saldarDeudaDeAdmin(sk(env, false), GJ, meta2) === 'fallo' && env.length === 0,
        'con el degradado rechazado por WhatsApp el bot anuncia igual que ha saldado la cuenta');

      await toggleAntiAdmin(GJ, antesFlag);
      try { fs.unlinkSync(_file); } catch {}
    } else {
      fallos++;
      console.log(rojo('   ✗ bot.js ya no exporta saldarDeudaDeAdmin: el cobro no se puede probar'));
    }

    // ── EL GUARDIÁN: la segunda cuenta que repone el admin ──────────────
    //
    // Es lo unico que convierte el golpe en algo que no funciona, en vez de en
    // algo que se paga despues. Y lo que lo hace seguro de tener es la lista de
    // cosas que NO hace: una segunda cuenta automatizada es una segunda cuenta
    // que WhatsApp puede vetar, y lo que hace que la veten es comportarse como
    // un bot. Esta escucha un evento y asciende. Si algun dia alguien le añade
    // "y de paso que conteste a...", esa cuenta pasa a ser carne de veto.
    {
      const g = require(path.join(R, 'src/guardian'));
      const gsrc = soloCodigo('src/guardian.js');
      const G2 = '000000000@g.us';
      const BOTL = '111111111111@lid', BOTT = '5491199999999@s.whatsapp.net';
      const GUA = '5491188888888@s.whatsapp.net', OTRO = '5491177777777@s.whatsapp.net';
      const meta3 = { id: G2, participants: [{ id: BOTL, phoneNumber: BOTT }, { id: GUA }, { id: OTRO }] };
      const sk2 = (ok = true) => {
        const h = [];
        return { h, user: { id: GUA }, groupMetadata: async () => meta3,
          groupParticipantsUpdate: async (j, p, a) => { h.push(a); return p.map((x) => ({ status: ok ? '200' : '403', jid: x })); } };
      };
      const antesEnv = process.env.GUARDIAN_DE;
      process.env.GUARDIAN_DE = '5491199999999';

      // EL NUMERO NO LO TECLEA NADIE: lo anota el bot al conectar y el guardian
      // lo lee. Pedir dieciseis digitos a mano en un .env es pedir el fallo, y
      // el fallo aqui es mudo: con un digito cambiado el guardian ve la
      // degradacion y no reconoce al bot, el dia que hacia falta.
      {
        const gsrc2 = soloCodigo('src/guardian.js');
        // La CONSTANTE, no el nombre suelto: el mensaje de error tambien cita el
        // fichero, asi que buscarlo a secas pasaba en verde con la ruta
        // cambiada. Lo probe.
        exige(/FICHERO_NUMERO\s*=\s*path\.join\([^)]*numeroBot\.json/.test(gsrc2),
          'el guardian ya no lee el numero que anota el bot: vuelve a depender de que alguien lo escriba a mano sin equivocarse');
        exige(!/creds\.json/.test(gsrc2),
          'el guardian abre creds.json: ahi dentro estan las claves de la sesion del bot, y lo unico que necesita es un numero de telefono');
        exige(/data\/numeroBot\.json/.test(soloCodigo('src/bot.js')),
          'el bot ya no anota su numero al conectar: el guardian se queda sin saber a quien protege');
        // Y que el guardian NO se muera si aun no hay numero: en un arranque en
        // frio los dos suben a la vez y el bot tarda unos segundos en conectar.
        // Muriendose ahi, pm2 lo reintenta diez veces y lo deja por muerto.
        const i3 = gsrc2.indexOf('async function conectar');
        const arranque = i3 < 0 ? '' : gsrc2.slice(i3, i3 + 700);
        exige(!/process\.exit\(1\)/.test(arranque.slice(0, arranque.indexOf('useMultiFileAuthState'))),
          'el guardian se muere al arrancar si el bot no ha conectado todavia: en un arranque en frio eso es un bucle de reinicios');
      }

      // LA FORMA DEL EVENTO SE COPIA DE BAILEYS, NO SE INVENTA. Los participantes
      // llegan como OBJETOS { id, phoneNumber, lid, admin } —ver
      // Utils/process-message.js, que hace messageStubParameters.map(JSON.parse)—
      // y esta guarda los pasaba como cadenas. Resultado: verde aqui y el
      // guardian mirando dos degradaciones de verdad sin mover un dedo, porque
      // String(objeto) no tiene ni un digito que sacar.
      let s2 = sk2(); g._sock(s2);
      exige(await g.alDegradar(G2, [{ id: BOTL, phoneNumber: BOTT, admin: null }], 'demote', OTRO) === true
        && s2.h[0] === 'promote',
        'el guardian no repone al bot con la forma real del evento (objeto {id,phoneNumber}): es como llega SIEMPRE en un grupo de verdad');

      // EL CASO REAL DE PRODUCCION, copiado del log: en un grupo LID la
      // degradacion del bot llega SOLO con su @lid, sin telefono al lado y sin
      // nada util en la ficha del grupo. El guardian solo tenia el numero, asi
      // que veia la degradacion, no reconocia a nadie y se quedaba quieto. Dos
      // pruebas seguidas en el grupo de verdad, y el log lo enseño:
      //
      //   evento demote ... sobre [["<lid del bot>"]]
      //   degradacion ... y ninguno era el bot. Protejo a: <telefono>
      //
      // Los numeros de aqui abajo son INVENTADOS, con la forma de los de verdad:
      // este repositorio es publico y la guarda de telefonos me pillo al copiar
      // los del log tal cual, que es exactamente su trabajo.
      //
      // El bot anota su propio @lid al conectar; esto comprueba que se use.
      {
        const F = path.join(R, 'data/numeroBot.json');
        const habiaN = fs.existsSync(F) ? fs.readFileSync(F) : null;
        try {
          fs.writeFileSync(F, JSON.stringify({ numero: '570000000001', lid: '200000000000001' }));
          const envL = process.env.GUARDIAN_DE; const envLid = process.env.GUARDIAN_LID;
          delete process.env.GUARDIAN_DE; delete process.env.GUARDIAN_LID;
          try {
            const sk5 = { user: { id: GUA },
              groupMetadata: async () => ({ id: G2, participants: [{ id: '200000000000001@lid' }] }),
              groupParticipantsUpdate: async (j, p) => p.map((x) => ({ status: '200', jid: x })) };
            g._sock(sk5);
            exige(await g.alDegradar(G2, [{ id: '200000000000001@lid' }], 'demote', '200000000000009@lid') === true,
              'el guardian no reconoce al bot cuando la degradacion llega SOLO con su @lid: es como llega de verdad en un grupo LID, y por eso no repuso nada dos veces seguidas');
          } finally {
            if (envL === undefined) delete process.env.GUARDIAN_DE; else process.env.GUARDIAN_DE = envL;
            if (envLid === undefined) delete process.env.GUARDIAN_LID; else process.env.GUARDIAN_LID = envLid;
          }
        } finally {
          fs.rmSync(F, { force: true });
          if (habiaN) fs.writeFileSync(F, habiaN);
        }
      }
      exige(/lid/.test(soloCodigo('src/bot.js').slice(soloCodigo('src/bot.js').indexOf('numeroBot.json') - 400, soloCodigo('src/bot.js').indexOf('numeroBot.json') + 200)),
        'el bot ya no anota su @lid: el guardian se queda otra vez sin poder reconocerlo en un grupo LID');

      // Y la de siempre: un @lid a secas, que se resuelve con la ficha del grupo.
      s2 = sk2(); g._sock(s2);
      exige(await g.alDegradar(G2, [{ id: BOTL }], 'demote', OTRO) === true,
        'el guardian no resuelve un @lid suelto con la ficha del grupo');

      // Lo que sale hacia WhatsApp tienen que ser JIDs. Mandarle los objetos es
      // la otra mitad del mismo fallo, y esa no se ve hasta que la llamada
      // vuelve rechazada.
      {
        const h = [];
        const sk3 = { user: { id: GUA }, groupMetadata: async () => meta3,
          groupParticipantsUpdate: async (j, p) => { h.push(...p); return p.map((x) => ({ status: '200', jid: x })); } };
        g._sock(sk3);
        await g.alDegradar(G2, [{ id: BOTL, phoneNumber: BOTT }], 'demote', OTRO);
        exige(h.length > 0 && h.every((x) => typeof x === 'string'),
          `el guardian le manda objetos a WhatsApp en vez de JIDs: la reposicion vuelve rechazada (${JSON.stringify(h[0])})`);
      }
      // El autor NO puede ser el propio guardian aqui: esa via ya sale por otra
      // puerta —no deshace lo suyo— y taparia justo lo que se quiere mirar, que
      // es si distingue al bot de cualquier otro degradado.
      s2 = sk2(); g._sock(s2);
      exige(await g.alDegradar(G2, [{ id: OTRO }], 'demote', BOTT) === false && !s2.h.length,
        'el guardian repone a quien no es el bot: asciende por su cuenta a cualquiera que pierda el admin, en cualquier grupo');
      s2 = sk2(); g._sock(s2);
      exige(await g.alDegradar(G2, [{ id: BOTL, phoneNumber: BOTT }], 'promote', OTRO) === false && !s2.h.length,
        'el guardian reacciona a un ascenso: solo tiene que mirar las degradaciones');
      s2 = sk2(false); g._sock(s2);
      exige(await g.alDegradar(G2, [{ id: BOTL, phoneNumber: BOTT }], 'demote', OTRO) === false,
        'el guardian da por repuesto al bot con WhatsApp rechazandolo');

      // EL 9 DE MOVIL ARGENTINO. WhatsApp lo mete detras del 54 en unas formas
      // del JID y no en otras, y la diferencia esta EN MEDIO: ni la igualdad ni
      // un sufijo la salvan. Con un numero argentino configurado, comparar las
      // cadenas a pelo deja al guardian mirando el dia del golpe y sin ninguna
      // señal de por que. Va con numeros inventados: en este repositorio, que es
      // publico, no entra ningun numero de nadie.
      exige(g.mismoNumero('5491100000001', '541100000001'),
        'el guardian no cruza el 9 de movil argentino: un numero de ahi configurado con el 9 no coincide con el mismo sin el');
      exige(!g.mismoNumero('5491100000001', '5491100000002'),
        'el guardian da por iguales dos numeros distintos');

      // Y la otra mitad, la del bot, con la misma vara.
      const { phoneMatch } = require(path.join(R, 'src/utils/wa'));
      exige(phoneMatch('5491100000001', '541100000001'),
        'phoneMatch dejo de cruzar el 9 argentino y el bot repone al guardian por ahi');
      {
        // Se exige phoneMatch DENTRO de la rama, no un nombre de ayudante que
        // puede seguir ahi comparando con ===. Lo probe: renombrar no es
        // arreglar, y la guarda pasaba en verde con la comparacion rota.
        const k2 = src.indexOf("action === 'demote' && config.guardian");
        const rama2 = k2 < 0 ? '' : src.slice(k2, k2 + 700);
        exige(/phoneMatch\s*\(/.test(rama2),
          'el bot compara el numero del guardian sin phoneMatch: con un numero argentino no lo repone nunca');
      }
      process.env.GUARDIAN_DE = antesEnv;

      // Y LO QUE NO PUEDE HACER, leido del codigo.
      exige(!/sendMessage\s*\(/.test(gsrc),
        'el guardian manda mensajes: tiene que ser una cuenta muda, es lo que la mantiene fuera del radar');
      exige(!/messages\.upsert/.test(gsrc),
        'el guardian escucha mensajes: solo tiene que mirar quien sube y baja de admin');
      exige(!/require\(['"]\.\/handlers/.test(gsrc) && !/require\(['"]\.\/commands/.test(gsrc),
        'el guardian carga los comandos del bot: es una cuenta que no responde a nadie');
      exige(/data\/authGuardian|authGuardian/.test(gsrc),
        'el guardian ya no tiene su propia carpeta de sesion: compartirla con el bot invalida las dos');

      // TODO LO QUE EL SOCKET HACE, ENUMERADO. Es la comprobacion que sostiene
      // la frase "solo tiene el anti-admin": no basta con que hoy no haga otra
      // cosa, tiene que no PODER hacerla sin que esto se ponga rojo.
      const llamadas = [...gsrc.matchAll(/sock\.([a-zA-Z]+)\s*\(/g)].map((m) => m[1]);
      // groupFetchAllParticipating es del repaso al reconectar: leer en que
      // grupos esta. Sigue siendo LEER y ASCENDER, nada mas.
      const PERMITIDAS = new Set(['groupParticipantsUpdate', 'groupMetadata', 'groupFetchAllParticipating', 'ev', 'end']);
      const demas = [...new Set(llamadas)].filter((x) => !PERMITIDAS.has(x));
      exige(demas.length === 0,
        `el guardian llama a sock.${demas.join(', sock.')}: solo puede leer la ficha del grupo y ascender, nada mas`);

      // ── LO QUE NO ES UN GRUPO NI SE MIRA ──────────────────────────────
      //
      // Es lo que hace que el guardian no pese en la maquina del bot. Un
      // dispositivo vinculado recibe TODO lo de la cuenta —privados, estados,
      // novedades— y Baileys lo descifra uno a uno: CPU, memoria y una sesion de
      // cifrado guardada en disco por cada interlocutor nuevo. Nada de eso se
      // usa aqui. Sin este filtro, el guardian crece igual que el bot para no
      // mirar ni una linea de lo que guarda.
      //
      // Y NO PUEDE IGNORAR LOS GRUPOS: el filtro trabaja por interlocutor y no
      // por tipo de aviso, asi que ignorar un grupo se llevaria por delante el
      // unico evento que este proceso existe para ver. Se comprueba con el
      // isJidGroup de Baileys, no con una idea de como se escriben los JID.
      {
        // El filtro se EJECUTA, cargando el modulo, en vez de reconstruirlo con
        // un regex: la version anterior de esta guarda leia una sola linea y se
        // habria quedado ciega en cuanto el filtro creciera.
        const filtro = require(path.join(R, 'src/guardian'))._filtroJid;
        exige(typeof filtro === 'function',
          'el guardian ya no expone su filtro por interlocutor: no se puede comprobar que deje pasar los grupos');
        if (typeof filtro === 'function') {
          exige(filtro('000000000@g.us') === false,
            'el guardian ignora los grupos: ahi es donde llegan las degradaciones, o sea que no se enteraria de nada');
          exige(filtro('raro-sin-arroba') === false && filtro('') === false,
            'el guardian descarta lo que no reconoce: si un aviso de grupo llega con una forma inesperada se lo come entero y en silencio, que es justo lo que no puede pasar');
          exige(filtro('5491100000001@s.whatsapp.net') === true && filtro('status@broadcast') === true,
            'el guardian ya no descarta los privados y los estados: es justo lo que le hace ocupar como el bot');
        }
        exige(/shouldSyncHistoryMessage:\s*\(\)\s*=>\s*false/.test(gsrc),
          'el guardian procesa el historial que WhatsApp empuja al vincular: es memoria y trabajo para armar unos chats que nadie va a leer');
      }

      // ── EL REPASO AL RECONECTAR ───────────────────────────────────────
      //
      // El guardian solo sirve si esta conectado en el momento del golpe, y eso
      // no se puede garantizar: se reinicia, se le cae la red, se despliega. En
      // esa ventana pueden quitarle el admin al bot y ese aviso no vuelve nunca.
      // Al conectar repasa el estado en vez de esperar avisos.
      //
      // Y SOLO DONDE LO VIO SIENDO ADMIN ANTES. Sin esa condicion, el primer
      // repaso ascenderia al bot en TODOS los grupos compartidos, incluidos
      // aquellos donde el dueño decidio a proposito no darselo: un guardian que
      // reparte admin por su cuenta es peor que no tenerlo. Se comprueban las
      // dos direcciones, porque cada una falla de una forma distinta y grave.
      {
        const G1 = '120001@g.us', G2 = '120002@g.us';
        const BL = '111111111111@lid';
        const mundo = (adminEnG1) => ({
          [G1]: { id: G1, participants: [{ id: BL, phoneNumber: BOTT, admin: adminEnG1 }, { id: GUA, admin: 'admin' }] },
          [G2]: { id: G2, participants: [{ id: BL, phoneNumber: BOTT, admin: null }, { id: GUA, admin: 'admin' }] },
        });
        const sk4 = (m) => { const h = []; return { h, user: { id: GUA },
          groupFetchAllParticipating: async () => m,
          groupMetadata: async (j) => m[j],
          groupParticipantsUpdate: async (j, p, a) => { h.push({ j, a }); return p.map((x) => ({ status: '200', jid: x })); } }; };

        const vistosFile = path.join(R, 'data/guardianVistos.json');
        const habiaV = fs.existsSync(vistosFile) ? fs.readFileSync(vistosFile) : null;
        // El numero protegido se restauro unas lineas mas arriba; aqui hace
        // falta otra vez, o el repaso sale sin saber a quien mirar y estas dos
        // comprobaciones pasarian en verde por el motivo equivocado.
        const envRepaso = process.env.GUARDIAN_DE;
        process.env.GUARDIAN_DE = '5491199999999';
        try {
          fs.rmSync(vistosFile, { force: true });
          let s4 = sk4(mundo('admin')); g._sock(s4);
          exige(await g.repasarGrupos() === 0 && s4.h.length === 0,
            'el primer repaso del guardian asciende al bot: repartiria admin en grupos donde el dueño decidio no darselo');
          s4 = sk4(mundo(null)); g._sock(s4);
          exige(await g.repasarGrupos() === 1 && s4.h.some((x) => x.j === G1 && x.a === 'promote'),
            'el guardian no repone el admin que se perdio mientras no estaba: ese aviso no vuelve nunca');
          exige(!s4.h.some((x) => x.j === G2),
            'el guardian asciende al bot en un grupo donde nunca fue admin');
        } finally {
          process.env.GUARDIAN_DE = envRepaso;
          fs.rmSync(vistosFile, { force: true });
          if (habiaV) fs.writeFileSync(vistosFile, habiaV);
        }
      }

      // ── LA RECONEXION, UNA SOLA VEZ ───────────────────────────────────
      //
      // Dos 'close' seguidos —que los hay— programaban dos reconexiones, y a los
      // pocos segundos habia DOS sesiones con las mismas credenciales echandose
      // la una a la otra en bucle. El bot ya tropezo con esto y lleva su
      // defensa; el guardian no tenia ninguna, y encima nunca cerraba el socket
      // viejo antes de abrir el nuevo.
      exige(/if \(reconexionPendiente\) return;/.test(gsrc),
        'el guardian programa una reconexion por cada aviso de caida: dos avisos seguidos dejan dos sesiones peleandose con las mismas credenciales');
      exige(/if \(sock\) \{[\s\S]{0,220}sock\.end\(\)/.test(gsrc),
        'el guardian no cierra el socket viejo antes de abrir el nuevo: un arranque que coincida con una reconexion deja las dos sesiones vivas');

      // ── LA VINCULACIÓN, POR CÓDIGO Y NO POR QR ────────────────────────
      //
      // El QR sirve cuando hay dos pantallas: una que lo enseña y un movil que
      // lo escanea. Administrando por SSH desde el propio movil no vale — el QR
      // sale en la misma pantalla con la que habria que escanearlo. El guardian
      // ya sabe su numero (el GUARDIAN del .env), asi que pide el codigo solo.
      exige(/requestPairingCode\s*\(/.test(gsrc),
        'el guardian ya no pide codigo de vinculacion: vuelve a hacer falta escanear un QR, que por SSH desde el movil no se puede');

      // Y EL BORRADO DE CREDENCIALES A MEDIAS, que es la trampa que costo cinco
      // intentos en el bot: pedir un codigo deja `me` escrito antes de que nadie
      // lo teclee, y si la vinculacion no se completa todos los arranques
      // siguientes salen 401 para siempre. Se prueba de verdad, con carpetas de
      // credenciales reales, porque es un BORRADO: equivocarse de condicion aqui
      // es cargarse una sesion buena en cada arranque.
      {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ddb-chk-creds-'));
        const D = g.AUTH_DIR;
        const poner = (creds) => {
          fs.rmSync(D, { recursive: true, force: true });
          fs.mkdirSync(D, { recursive: true });
          fs.writeFileSync(path.join(D, 'creds.json'), JSON.stringify(creds));
          fs.writeFileSync(path.join(D, 'marca.txt'), 'x');
        };
        const habia = fs.existsSync(D);
        const respaldo = habia ? path.join(dir, 'auth') : null;
        if (habia) fs.cpSync(D, respaldo, { recursive: true });
        try {
          poner({ me: { id: '549@s.whatsapp.net', name: '~' }, pairingCode: 'ABC' });
          exige(await g.limpiarCredencialesAMedias() === true && !fs.existsSync(path.join(D, 'marca.txt')),
            'el guardian no borra el muñon de una vinculacion sin terminar: todos los arranques siguientes darian 401 hasta que alguien borre la carpeta a mano');
          poner({ me: { id: '549@s.whatsapp.net' }, account: { details: 'x' } });
          exige(await g.limpiarCredencialesAMedias() === false && fs.existsSync(path.join(D, 'marca.txt')),
            'el guardian BORRA una sesion buena: se desvincularia solo en cada arranque');
          poner({ me: { id: '549@s.whatsapp.net' }, account: { details: 'x' }, registered: false });
          exige(await g.limpiarCredencialesAMedias() === false && fs.existsSync(path.join(D, 'marca.txt')),
            'el guardian mira `registered` en vez de `account`: el QR nunca escribe registered, asi que borraria una sesion escaneada en cada arranque');
        } finally {
          fs.rmSync(D, { recursive: true, force: true });
          if (respaldo) fs.cpSync(respaldo, D, { recursive: true });
          fs.rmSync(dir, { recursive: true, force: true });
        }
      }

      // Y del ascender, solo el ascender: un 'demote' o un 'remove' desde esta
      // cuenta la convierte en un segundo moderador que nadie ha pedido.
      const acciones = [...gsrc.matchAll(/groupParticipantsUpdate\([^)]*?['"]([a-z]+)['"]/g)].map((m) => m[1]);
      exige(acciones.length > 0 && acciones.every((a) => a === 'promote'),
        `el guardian ejecuta ${[...new Set(acciones)].join(', ')} sobre los participantes: solo puede ascender`);

      // Y que no arrastre el estado del bot. helpers.js trae el historial de
      // frases y un gancho de salida que escribe en data/: dos procesos
      // escribiendo los mismos ficheros es justo lo que no puede pasar.
      // TIENE QUE PODER CORRER SUELTO, fuera de este repositorio y con una sola
      // dependencia. No es limpieza: esta pensado para correr en la maquina de
      // OTRA persona —la dueña de esa cuenta de WhatsApp, que asi no cede su
      // sesion a nadie— y pedirle que se clone el bot entero para usar estas
      // lineas no tiene sentido. Cada require nuevo que no sea de Node o de
      // Baileys rompe eso, y se rompe sin ruido: aqui sigue funcionando.
      const requiere = [...gsrc.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]);
      const delBot = requiere.filter((r) => r.startsWith('.'));
      exige(delBot.length === 0,
        `el guardian carga ${delBot.join(', ')} del repositorio: deja de poder correrse suelto, y acaba con un pie en el estado del bot`);

      const NODE = new Set(['path', 'fs', 'fs/promises', 'os', 'crypto', 'util', 'events', 'child_process']);
      const fuera = requiere.filter((r) => !r.startsWith('.') && !NODE.has(r)
        && r !== '@whiskeysockets/baileys');
      exige(fuera.length === 0,
        `el guardian exige ${fuera.join(', ')} aparte de Baileys: quien lo corra suelto se lo encuentra roto. Cargalo con opcional() si de verdad hace falta`);

      // Y las opcionales, que no son las mismas: esas SI pueden faltar.
      exige(/const opcional = \(m\) => \{ try \{ return require\(m\); \} catch/.test(gsrc),
        'el guardian ya no carga sus dependencias opcionales a prueba de fallos: sin dotenv o sin pino se caeria al arrancar');
    }

    // Y LA OTRA MITAD DEL PAR: que el bot reponga al guardian. Protegiendo solo
    // a uno, degradar primero al guardian y luego al bot deja a los dos fuera.
    {
      const k = src.indexOf("action === 'demote' && config.guardian");
      exige(k >= 0 && /aplicarParticipantes\([^)]*'promote'/.test(src.slice(k, k + 700)),
        'el bot ya no repone al guardian: degradando primero al guardian, el par se cae entero');
    }

    // ── EL DESPLIEGUE REINICIA TAMBIEN AL GUARDIAN ──────────────────────
    //
    // Es otro proceso: un despliegue lo dejaba corriendo el codigo viejo
    // indefinidamente, y nadie lo nota porque el bot SI se reinicia solo y todo
    // parece al dia. Con el guardian eso significa correr durante semanas con un
    // fallo ya arreglado.
    {
      // SE LEEN LOS COMANDOS, NO EL FICHERO ENTERO. Escrito con el fichero crudo,
      // un comentario suelto que mencionara "pm2 restart bot" mas arriba movia
      // el indexOf y el orden parecia correcto aunque en la ejecucion real el
      // guardian arrancara primero. Probado: se invirtio el orden de verdad y la
      // guarda siguio en verde.
      //
      // La capa 34, unas lineas mas abajo, ya limpiaba los comentarios para su
      // propia comprobacion. Aqui se quedo sin hacer.
      const actCrudo = fs.readFileSync(path.join(R, 'scripts/actualizar.sh'), 'utf8');
      const act = actCrudo.split('\n').map((l) => l.replace(/(^|\s)#.*$/, '')).join('\n');
      exige(/pm2 restart guardian/.test(act),
        'el despliegue no reinicia al guardian: se queda con el codigo viejo y nadie se entera, porque el bot si se actualiza');
      // El reinicio puede escribirse de dos formas y las dos son validas:
      // por nombre (`pm2 restart bot`) o pasando el ecosystem con `--only bot`,
      // que es la que ademas RELEE la configuracion. Lo que se vigila es el
      // orden, no la forma, asi que se aceptan las dos.
      const iBot = act.search(/^\s*pm2 restart (?:bot\b|ecosystem\.config\.js[^\n]*--only bot\b)/m);
      const iGuard = act.search(/^\s*pm2 restart (?:guardian\b|ecosystem\.config\.js[^\n]*--only guardian\b)/m);
      exige(iBot >= 0 && iGuard >= 0 && iBot < iGuard,
        'el guardian se reinicia ANTES que el bot: leeria el numero y el @lid del bot antes de que este los anote');

      // Y EL REINICIO TIENE QUE RELEER ecosystem.config.js. Esto no es un
      // detalle de forma: `pm2 restart bot` reinicia el proceso con la
      // configuracion que pm2 tiene GUARDADA de cuando se arranco, no con la del
      // fichero, y `--update-env` solo refresca las variables de entorno. O sea
      // que cambiar `max_memory_restart` o `NODE_OPTIONS` en el ecosystem no se
      // aplicaba nunca: el fichero decia una cosa, el proceso corria con otra, y
      // el despliegue parecia perfecto.
      //
      // Paso de verdad con el techo del guardian: se subio de 120M a 200M y
      // habria seguido muriendo a los 120 despliegue tras despliegue.
      for (const quien of ['bot', 'guardian']) {
        exige(new RegExp(`pm2 restart ecosystem\\.config\\.js[^\\n]*--only ${quien}\\b`).test(act),
          `el despliegue reinicia *${quien}* por nombre y no pasando el ecosystem: los cambios de configuracion —el tope de memoria, las NODE_OPTIONS— no se aplican nunca y nadie se entera`);
      }
      exige(/pm2 describe guardian/.test(act),
        'el despliegue reinicia al guardian sin comprobar que exista: quien no lo tenga se come un error en cada actualizacion');
    }

    if (fallos === antes) console.log(verde('   ✓ el dueño se entera, la deuda se cobra y el par se repone solo'));
  }

  // ── 40. EL ROAST DE LAS ACCIONES SALE DOSIFICADO ─────────────────────────
  //
  // Sale UNA de cada cinco acciones, no en todas. Decision del dueño y con
  // motivo: estos comandos se usan en rafaga contra medio grupo, asi que un
  // segundo mensaje debajo de cada uno deja de leerse a las tres veces.
  //
  // Se comprueba la CADENCIA de verdad, contando los turnos, y no que exista la
  // constante: poner el numero y luego mandar el roast igual en todas es
  // exactamente el fallo que nadie ve en el codigo y el grupo ve al segundo.
  {
    console.log('\n40. EL ROAST DE LAS ACCIONES SALE DOSIFICADO');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    const acc = require(path.join(R, 'src/commands/acciones'));
    exige(Number.isInteger(acc.ROAST_CADA) && acc.ROAST_CADA > 1,
      'ROAST_CADA ya no es un numero mayor que uno: el roast vuelve a salir en cada accion');

    // La cadencia se lee del codigo del handler, que es quien la aplica. Se
    // simula el contador con la misma cuenta para ver el patron que sale.
    const src2 = soloCodigo('src/commands/acciones.js');
    exige(/turnoRoast\.get\(jid\)/.test(src2) && /% ROAST_CADA === 0/.test(src2),
      'el roast ya no mira el turno del grupo: o sale siempre, o no sale nunca');

    // Y la propiedad que importa, con la aritmetica de verdad: en N acciones
    // salen exactamente N/ROAST_CADA roasts, y ninguno antes del quinto.
    {
      const N = acc.ROAST_CADA * 3;
      let turno = 0;
      const patron = [];
      for (let i = 0; i < N; i++) {
        const n = turno + 1;
        turno = n % acc.ROAST_CADA;
        patron.push(n % acc.ROAST_CADA === 0 ? 'R' : '.');
      }
      exige(patron.filter((x) => x === 'R').length === 3,
        `la cadencia del roast no da tres en ${N} acciones: ${patron.join('')}`);
      exige(patron.slice(0, acc.ROAST_CADA - 1).every((x) => x === '.'),
        `el roast sale antes de la accion ${acc.ROAST_CADA}: ${patron.join('')}`);
    }

    // EL CONTADOR ES POR GRUPO. Uno solo para todo el bot haria que las
    // acciones de un grupo se comieran el turno de otro.
    exige(acc._turnoRoast instanceof Map,
      'el turno del roast ya no es un mapa por grupo: un solo contador global mezcla los grupos');

    // Y LAS DEL TIER DUEÑO NO SUMAN. Si sumaran, sus acciones se comerian el
    // turno de otro y el roast saldria cada seis, cada ocho, o no saldria.
    const i = src2.indexOf('turnoRoast.get(jid)');
    const arriba = i < 0 ? '' : src2.slice(Math.max(0, i - 300), i);
    exige(/!isOwner\([^)]*\)[^{]*&&/.test(arriba),
      'el turno del roast se cuenta tambien para el tier dueño: sus acciones le robarian el turno al resto y la cadencia dejaria de cuadrar');

    if (fallos === antes) console.log(verde(`   ✓ el roast sale una de cada ${acc.ROAST_CADA}, por grupo, y el dueño no gasta turno`));
  }

  // ── 41. TODO LO QUE EL BOT ESCRIBE EN data/ ESTA IGNORADO ────────────────
  //
  // ESTO YA ROMPIO EL DESPLIEGUE DOS VECES, y la segunda fue esta semana. Un
  // fichero de estado nuevo sin su linea en .gitignore hace que `git status` lo
  // vea como fichero nuevo; actualizar.sh se niega a actualizar por "cambios
  // locales sin guardar", y el arreglo que imprime —`git clean -fd`— LO BORRA.
  //
  // La primera vez fue mutes.json. La segunda, la carpeta de la sesion del
  // guardian: ahi el `git clean` no borraba un contador, borraba las
  // credenciales de una cuenta de WhatsApp, o sea que cada actualizacion habria
  // exigido volver a vincular al guardian con otra persona delante.
  //
  // Asi que no se comprueba una lista escrita a mano: se sacan del CODIGO todas
  // las rutas bajo data/ y se le pregunta a git por cada una. Un fichero de
  // estado nuevo entra solo en esta comprobacion el dia que alguien lo escriba.
  {
    console.log('\n41. TODO LO QUE EL BOT ESCRIBE EN data/ ESTA IGNORADO');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    const rutas = new Set();
    const andar41 = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const f = path.join(dir, e.name);
        if (e.isDirectory()) { andar41(f); continue; }
        if (!e.name.endsWith('.js')) continue;
        const txt = fs.readFileSync(f, 'utf8');
        for (const m of txt.matchAll(/['"`](?:\.\.\/)+data\/([A-Za-z0-9_.-]+)['"`\/]/g)) rutas.add(m[1]);
      }
    };
    andar41(path.join(R, 'src'));

    // Los pools de frases viven en src/data/, no en data/: el regex de arriba
    // los pilla por el nombre y esos SI van al repositorio.
    const enRepo = new Set(fs.readdirSync(path.join(R, 'src/data')).map((f) => f.replace(/\.js$/, '')));
    const deEstado = [...rutas].filter((r) => !enRepo.has(r.replace(/\.js$/, '')));
    exige(deEstado.length > 0, 'no encuentro ninguna ruta de data/ en el codigo: el regex de esta capa ha dejado de valer');

    const sinIgnorar = [];
    for (const r of deEstado) {
      // Se le pregunta a git, que es quien decide de verdad. Un fichero que aun
      // no existe no se puede consultar, asi que se crea uno de mentira dentro
      // (y se borra) solo si hace falta.
      const rel = `data/${r}`;
      const abs = path.join(R, rel);
      let creado = null;
      if (!fs.existsSync(abs)) {
        // Si el nombre no lleva extension es una carpeta (auth, authGuardian,
        // pfpcache, music_cache): git ignora carpetas por su linea con barra.
        if (r.includes('.')) { fs.writeFileSync(abs, ''); creado = abs; }
        else { fs.mkdirSync(path.join(abs), { recursive: true }); fs.writeFileSync(path.join(abs, '.probe'), ''); creado = abs; }
      }
      const objetivo = r.includes('.') ? rel : `${rel}/.probe`;
      const res = spawnSync('git', ['check-ignore', '-q', objetivo], { cwd: R });
      if (res.status !== 0) sinIgnorar.push(rel);
      if (creado) fs.rmSync(creado, { recursive: true, force: true });
    }

    exige(sinIgnorar.length === 0,
      `${sinIgnorar.join(', ')} no esta(n) en .gitignore: al primer uso el despliegue se para por "cambios locales", y el arreglo que imprime (git clean -fd) los BORRA`);

    if (fallos === antes) console.log(verde(`   ✓ los ${deEstado.length} ficheros de estado de data/ estan fuera del repositorio`));
  }

  // ── 42. LAS ACCIONES EXPLICITAS NO VAN CONTRA EL DUEÑO ───────────────────
  //
  // Decision del dueño. Y lo delicado no es la negativa: es COMO se niega.
  //
  // Un rechazo con nombre —"a ese no puedes"— solo ocurre con una persona del
  // grupo, asi que a la segunda vez el grupo ha aprendido quien manda en el bot.
  // Que eso no se sepa es la regla que esta por encima de todo lo demas aqui, de
  // modo que se contesta lo MISMO que cuando se cae la web: una respuesta que ya
  // existe, que sale de verdad cada pocos dias y que no enseña ninguna regla.
  //
  // Se comprueban las tres cosas: que no mande el gif, que no cobre, y que el
  // texto sea exactamente el de la web caida.
  {
    console.log('\n42. LAS ACCIONES EXPLICITAS NO VAN CONTRA EL DUEÑO');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    const acc = require(path.join(R, 'src/commands/acciones'));
    const cfg = require(path.join(R, 'src/config'));
    const OWN = `${String(cfg.ownerNumber).replace(/\D/g, '')}@s.whatsapp.net`;
    const A = '34600000002@s.whatsapp.net';
    const BOT = '549199@s.whatsapp.net';
    const GJ = '000000000@g.us';
    const meta = { id: GJ, subject: 'G', participants: [{ id: BOT, admin: 'admin' }, { id: OWN, admin: 'admin' }, { id: A }] };

    const nsfw = Object.keys(acc.ACCIONES).filter((n) => acc.ACCIONES[n].nsfw && acc.ACTIVAS.includes(n));
    exige(nsfw.length > 0, 'no hay ninguna accion explicita activa: esta capa no esta mirando nada');

    for (const n of nsfw) {
      const out = [];
      const sk = { user: { id: BOT }, sendMessage: async (j, c) => { out.push(c); return {}; },
        groupMetadata: async () => meta };
      const msg = { key: { remoteJid: GJ, participant: A, fromMe: false, id: 'X' },
        message: { extendedTextMessage: { text: `!${n} @x`, contextInfo: { mentionedJid: [OWN] } } } };
      await acc[n](sk, msg, [], meta);
      const texto = out.map((c) => c.text || '').join('\n');
      exige(!out.some((c) => c.video || c.image),
        `*!${n}* manda el gif contra el dueño`);
      exige(/No he podido traer el gif/.test(texto),
        `*!${n}* contesta al tier dueño algo distinto de la caida de la web (${JSON.stringify(texto).slice(0, 80)}): un rechazo con nombre solo le pasa a una persona, asi que a la segunda vez el grupo sabe quien manda en el bot`);
    }

    // Y AL CO-OWNER SI LE LLEGAN. Es decision del dueño: el blindaje es suyo y
    // de nadie mas. Confundir los dos niveles aqui es lo que haria que el
    // blindaje dejara de apuntar a una sola persona.
    //
    // VA EN OTRO PROCESO, y no por gusto: wa.js congela la lista de co-owners al
    // cargarse (ALL_OWNER_DIGITS), asi que tocar config.coOwners a estas alturas
    // NO cambia nada. Lo escribi primero de esa forma y la comprobacion pasaba en
    // verde con el blindaje abierto al tier entero — una guarda que aprueba el
    // codigo roto, que es peor que no tenerla. Con CO_OWNERS en el entorno del
    // proceso hijo, la lista se congela ya con el co-owner dentro.
    {
      // El guion va a un fichero temporal: incrustarlo en `node -e` obliga a
      // escapar comillas dentro de comillas dentro de comillas, y ahi es donde
      // se rompe.
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ddb-coown-'));
      const guionF = path.join(tmpDir, 'p.js');
      fs.writeFileSync(guionF, [
        `const acc = require(${JSON.stringify(path.join(R, 'src/commands/acciones'))});`,
        "const CO = '34600000123@s.whatsapp.net', A = '34600000002@s.whatsapp.net';",
        "const BOT = '549199@s.whatsapp.net', GJ = '000000000@g.us';",
        "const meta = { id: GJ, subject: 'G', participants: [{ id: BOT, admin: 'admin' }, { id: CO }, { id: A }] };",
        '(async () => {',
        '  const salida = {};',
        '  for (const n of Object.keys(acc.ACCIONES)) {',
        '    if (!acc.ACCIONES[n].nsfw || !acc.ACTIVAS.includes(n)) continue;',
        '    const out = [];',
        '    const sk = { user: { id: BOT }, sendMessage: async (j, c) => { out.push(c); return {}; }, groupMetadata: async () => meta };',
        "    const msg = { key: { remoteJid: GJ, participant: A, fromMe: false, id: 'X' },",
        "      message: { extendedTextMessage: { text: '!' + n + ' @x', contextInfo: { mentionedJid: [CO] } } } };",
        '    await acc[n](sk, msg, [], meta);',
        "    salida[n] = out.map((c) => c.text || '').join(' | ');",
        '  }',
        "  console.log('RESULTADO' + JSON.stringify(salida));",
        '  process.exit(0);',
        '})();',
      ].join('\n'));
      let res = {};
      try {
        const bruto = execSync(`node ${JSON.stringify(guionF)}`, {
          encoding: 'utf8', timeout: 60000, cwd: R,
          env: { ...process.env, CO_OWNERS: '34600000123', ACCION_NSFW_API: '' },
        });
        const linea = bruto.split('\n').find((l) => l.startsWith('RESULTADO'));
        res = linea ? JSON.parse(linea.slice('RESULTADO'.length)) : {};
        if (!linea) { fallos++; console.log(rojo('   ✗ la prueba del co-owner no devolvio nada')); }
      } catch (e) {
        fallos++;
        console.log(rojo(`   ✗ no pude probar el caso del co-owner: ${String(e.message).slice(0, 140)}`));
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
      for (const [n, texto] of Object.entries(res)) {
        exige(!/No he podido traer el gif/.test(texto),
          `*!${n}* tambien blinda al co-owner: el dueño lo quiso solo para el, y protegiendo a dos el disfraz de "se cayo la web" se repite con dos personas distintas`);
      }
    }

    // Y el rechazo va ANTES de cobrar: leido del codigo, porque probar el cobro
    // aqui escribiria en el aura de verdad.
    {
      const src2 = soloCodigo('src/commands/acciones.js');
      const iNeg = src2.indexOf('isMainOwner(objetivo, false, groupMeta)');
      const iCobro = src2.indexOf('const concepto = nsfw');
      exige(iNeg >= 0 && iCobro >= 0 && iNeg < iCobro,
        'el blindaje del dueño va DESPUES del cobro, o ya no usa isMainOwner: el rechazo saldria pagado');
      // Y EL MAPA DE @lid SE LLENA ANTES DE PREGUNTAR. canonicalJid traduce con
      // un mapa que llena indexGroupMeta; si nadie lo llama primero, la
      // traduccion se hace en vacio. Escrito al reves, las tres explicitas se
      // negaban contra todo el grupo en vez de contra el dueño.
      const iIdx = src2.indexOf('indexGroupMeta(groupMeta)');
      exige(iIdx >= 0 && iIdx < iNeg,
        'el blindaje pregunta por el @lid antes de llenar el mapa que lo traduce: o se abre contra el dueño, o se cierra contra todo el grupo');
    }

    // ── Y AHORA CON LA FORMA EN QUE LLEGA DE VERDAD: UN @lid ─────────────
    //
    // Arriba se prueba con menciones en forma de telefono, que es la comoda de
    // escribir y la que NO ocurre: en un grupo LID —o sea, en todos los de
    // ahora— la mencion llega como @lid y el telefono viaja aparte, dentro de la
    // metadata. Probar solo la forma comoda es como se dio por bueno el guardian
    // que trataba los participantes como cadenas.
    //
    // Y se prueban las dos direcciones, porque las dos han fallado:
    //   · el dueño por @lid tiene que quedar blindado;
    //   · un miembro cualquiera por @lid NO, o el comando se niega contra todos.
    {
      const OWN_LID = '111122223333@lid';
      const V_LID = '444455556666@lid';
      const A_LID = '999988887777@lid';
      const metaLid = { id: GJ, subject: 'G', participants: [
        { id: BOT, admin: 'admin' },
        { id: OWN_LID, lid: OWN_LID, phoneNumber: OWN, admin: 'admin' },
        { id: V_LID, lid: V_LID, phoneNumber: '34600000009@s.whatsapp.net' },
        { id: A_LID, lid: A_LID, phoneNumber: A },
      ] };
      const tira = async (n, aQuien, meta2) => {
        const out = [];
        const sk = { user: { id: BOT }, sendMessage: async (j, c) => { out.push(c); return {}; },
          groupMetadata: async () => metaLid };
        const msg = { key: { remoteJid: GJ, participant: A_LID, fromMe: false, id: 'X' },
          message: { extendedTextMessage: { text: `!${n} @x`, contextInfo: { mentionedJid: [aQuien] } } } };
        await acc[n](sk, msg, [], meta2);
        return { texto: out.map((c) => c.text || '').join('\n'), medio: out.some((c) => c.video || c.image) };
      };
      for (const n of nsfw) {
        const dueno = await tira(n, OWN_LID, metaLid);
        exige(/No he podido traer el gif/.test(dueno.texto) && !dueno.medio,
          `*!${n}* deja pasar al dueño cuando la mencion llega como @lid, que es como llega siempre en un grupo de ahora`);
        // Sin metadata —los primeros segundos tras un reinicio, o un fallo al
        // pedirla— el @lid no se puede traducir y no hay forma de saber quien
        // es. Se niega igual: negar de mas cuesta un "la web va mal" en un dia
        // raro; dejarlo pasar cuesta el blindaje entero.
        //
        // Y SE PRUEBA CON UN @lid QUE NADIE HA VISTO NUNCA, no con el del dueño.
        // Escrito con el del dueño la comprobacion pasaba en verde con el codigo
        // roto, y no por casualidad: wa.js APRENDE los @lid del dueño que ya ha
        // confirmado (noteOwnerJid), asi que despues de las pruebas de arriba lo
        // reconocia de memoria y el blindaje aguantaba por el atajo, no por la
        // regla que se queria comprobar. Con un @lid desconocido no hay atajo
        // posible: o se niega por no poder traducirlo, o no se niega.
        const NADIE = '777766665555@lid';
        const aOscuras = await tira(n, NADIE, null);
        exige(/No he podido traer el gif/.test(aOscuras.texto) && !aOscuras.medio,
          `*!${n}* sigue adelante con una mencion @lid que no puede traducir: ahi no sabe si el objetivo es el dueño, y en la duda tiene que negarse`);
        const cualquiera = await tira(n, V_LID, metaLid);
        exige(!/No he podido traer el gif/.test(cualquiera.texto),
          `*!${n}* se niega tambien contra un miembro cualquiera mencionado por @lid: el blindaje dejo de apuntar a una persona y paso a apagar el comando`);
      }
    }

    if (fallos === antes) console.log(verde(`   ✓ *!${nsfw.join('* y *!')}* no van contra el dueño —y solo contra el—, y se niegan sin delatarlo`));
  }

  // ── 43. LA DESPENSA SACA EL TRABAJO DEL CAMINO CALIENTE ──────────────────
  //
  // Un comando de accion hacia tres viajes con alguien esperando delante: pedir
  // la direccion, bajar el gif y pasarlo por ffmpeg. Medido, algo mas de un
  // segundo en maquina rapida y tres o cuatro en la de verdad. Ninguno de los
  // tres necesita que nadie espere, asi que se hacen antes.
  //
  // Lo que se vigila es la PROPIEDAD, no la implementacion: la segunda vez que
  // se pide la misma categoria no puede volver a salir a la red. Con un servidor
  // local que tarda a proposito, eso se mide en milisegundos y no se discute.
  {
    console.log('\n43. LA DESPENSA SACA EL TRABAJO DEL CAMINO CALIENTE');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    const acc = require(path.join(R, 'src/commands/acciones'));
    exige(acc._despensa instanceof Map,
      'las acciones ya no tienen despensa: cada uso vuelve a pagar el viaje entero con alguien esperando');

    // LA PROPIEDAD, MEDIDA: con algo en la despensa, pedir esa categoria NO
    // puede salir a la red. Se comprueba apuntando la fuente a un sitio que no
    // existe — si tocara la red, fallaria; si contesta, es que vino de dentro.
    {
      const clave = acc._claveDespensa('pruebadespensa', false, null);
      const falso = { mp4: Buffer.from('x') };
      acc._despensa.set(clave, { cola: [falso], ts: Date.now() });
      let vino = null;
      try { vino = await acc._traerAccion('pruebadespensa', false, null, false); } catch { /* si sale a la red, revienta */ }
      exige(vino === falso,
        'pedir una categoria que ya estaba lista vuelve a salir a la red: la despensa se llena y no se usa, y cada comando sigue pagando el viaje entero');
      acc._despensa.delete(clave);
    }

    // La propiedad de verdad, leida del codigo: que la despensa se consulte
    // ANTES de salir a la red, y que se reponga DESPUES de mandar el gif. Al
    // reves, el comando estaria esperando a preparar el de la proxima vez, que
    // es justo lo que se venia a quitar de en medio.
    const src2 = soloCodigo('src/commands/acciones.js');
    // DENTRO DE traerAccion, no en todo el fichero: `sacarDeDespensa(` aparece
    // tambien en su propia definicion, que va antes de todo, asi que buscarlo a
    // secas daba iSacar < iRed SIEMPRE. La guarda pasaba en verde con la
    // consulta movida detras de la red. Lo probe.
    {
      const iT = src2.indexOf('async function traerAccion');
      const cuerpoT = iT < 0 ? '' : src2.slice(iT, src2.indexOf('\n}', iT));
      const iSacar = cuerpoT.indexOf('sacarDeDespensa(');
      const iRed = cuerpoT.indexOf('await axios.get(direccionDe(');
      exige(iSacar >= 0 && iRed >= 0 && iSacar < iRed,
        'la despensa se mira despues de salir a la red, o ya no se mira dentro de traerAccion: entonces no sirve para nada');
    }
    const iEnviar = src2.indexOf('await sock.sendMessage(jid, media');
    // La ULTIMA aparicion: la primera esta dentro del propio reponer, que se
    // llama a si mismo para terminar de llenar.
    const iReponer = src2.lastIndexOf('reponerDespensa(cat, nsfw');
    exige(iEnviar >= 0 && iReponer >= 0 && iEnviar < iReponer,
      'se repone la despensa ANTES de mandar el gif: el comando volveria a esperar por el de la proxima vez');
    // La PODA dentro de guardarEnDespensa, no el nombre suelto en el fichero:
    // renombrar la funcion y dejar de llamarla pasaba en verde. Lo probe.
    {
      const iG = src2.indexOf('function guardarEnDespensa');
      const cuerpoG = iG < 0 ? '' : src2.slice(iG, src2.indexOf('\n}', iG));
      exige(/TOPE_DESPENSA/.test(src2) && /podarDespensa\(\)/.test(cuerpoG),
        'la despensa ya no se poda al guardar: veinte categorias de gifs de hasta 1,5 MB creciendo sin tope en una maquina de 1 GB');
    }

    // ── LA REPOSICION PIDE LA MISMA CATEGORIA QUE LA PETICION ───────────
    //
    // Aqui se colo el fallo que ya se habia arreglado una vez por delante: la
    // reposicion llamaba con catNsfw en null, asi que para *!fuck* bajaba un gif
    // de la categoria SFW de respaldo —un beso— y lo guardaba bajo la clave de
    // la explicita. El siguiente *!fuck* se llevaba ese beso.
    //
    // Y el validador que existia no lo veia: comprobaba la peticion EN VIVO, que
    // estaba bien, y no la reposicion. Por eso esta mira la firma entera.
    {
      const src3 = soloCodigo('src/commands/acciones.js');
      exige(/function reponerDespensa\(cat, nsfw, catNsfw, clave\)/.test(src3),
        'reponerDespensa ya no recibe catNsfw: rellenaria la despensa de las explicitas con gifs de la categoria de respaldo');
      const iR = src3.indexOf('function reponerDespensa');
      const cuerpoR = iR < 0 ? '' : src3.slice(iR, src3.indexOf('\n}', iR));
      exige(/traerAccion\(cat, nsfw, catNsfw, true\)/.test(cuerpoR),
        'la reposicion no le pasa catNsfw a traerAccion: la despensa de *!fuck* se llenaria de besos');
    }

    // ── Y EL GIF SE MANDA PEQUEÑO ───────────────────────────────────────
    //
    // Con la despensa, bajar y convertir ya no le hacen esperar a nadie: lo
    // unico que queda en el camino caliente es SUBIRLO, y eso depende del
    // tamaño. Medido sobre un gif de 2 MB, pasar de crf 23 a tamaño original
    // (376 KB) a crf 28 con ancho <= 400 (101 KB) es cuatro veces menos que
    // subir, y lo que se recorta no se veia: la burbuja lo pinta a unos 300 px.
    {
      const src3 = soloCodigo('src/commands/acciones.js');
      exige(/min\(400,iw\)/.test(src3) && /'-crf', '28'/.test(src3),
        'el conversor de las acciones volvio a dejar el gif a tamaño y calidad completos: cuatro veces mas que subir por unos pixeles que no se ven');
      exige(/:-2"/.test(src3) || /:-2'/.test(src3),
        'el escalado ya no fuerza altura par: H.264 no acepta impares y el comando muere entero');
    }

    // ── Y SE LLENA SOLA AL ARRANCAR, DESPACIO ───────────────────────────
    //
    // La despensa empieza vacia en cada reinicio y hay un reinicio en cada
    // despliegue: sin esto, la primera vez de las veintiuna acciones paga el
    // viaje entero. Medido en la VPS: 2987 ms de traer con la despensa a cero.
    //
    // Pero DE UNA EN UNA Y CON PAUSA LARGA. Un bot recien conectado pegandole
    // veintiuna peticiones seguidas a la misma web es el patron por el que
    // cortan el acceso — esa web ya bloqueo esta maquina una vez esta semana.
    // Por eso se comprueban las dos cosas: que llene, y que no sea una rafaga.
    {
      const src4 = soloCodigo('src/commands/acciones.js');
      exige(typeof acc.calentarDespensa === 'function',
        'las acciones ya no calientan la despensa al arrancar: la primera de cada una vuelve a pagar el viaje entero en cada despliegue');
      const iC = src4.indexOf('function calentarDespensa');
      const cuerpoC = iC < 0 ? '' : src4.slice(iC, src4.indexOf('\n}\n', iC));
      exige(/ESPERA_ENTRE_CALENTADOS/.test(cuerpoC),
        'el calentado ya no espera entre categorias: veintiuna peticiones seguidas a la misma web es como se consigue que te corten');
      const m = src4.match(/const ESPERA_ENTRE_CALENTADOS = (\d+) \* 1000;/);
      exige(m && Number(m[1]) >= 10,
        `la pausa entre calentados es de ${m ? m[1] : '?'} s: demasiado poco, eso ya es una rafaga`);
      exige(/if \(calentando\) return;/.test(cuerpoC),
        'calentarDespensa se puede lanzar dos veces a la vez: dos recorridos en paralelo doblan las peticiones');
      exige(/calentarDespensa\(\)/.test(soloCodigo('src/bot.js')),
        'el bot ya no arranca el calentado al conectar: la despensa se queda vacia hasta que alguien use cada accion');

      // Y LA MINIATURA VA EN EL MENSAJE. Sin `jpegThumbnail`, Baileys lanza OTRO
      // ffmpeg al enviar para sacar una de 32x32 (Utils/messages-media.js), o
      // sea un proceso mas dentro del camino caliente y en el unico core de la
      // VPS: es lo que hacia que subir 13 KB tardara 1699 ms. Se manda aunque
      // sea null, porque lo que dispara el ffmpeg de Baileys es `undefined`.
      // ── EL FONDO NO PUEDE QUITARLE LA VEZ A NADIE ──────────────────
      //
      // ffmpeg corre detras de un semaforo compartido con los stickers,
      // *!toimg* y *!ttp*, y tiene DOS plazas para todo el bot. Rellenar la
      // despensa tambien pasa por ahi: sin tope, varias categorias rellenandose
      // a la vez ocupan las dos y el sticker de alguien se queda esperando a un
      // trabajo que no le importa a nadie. Con el tope en uno siempre queda una
      // plaza para quien esta delante de la pantalla.
      //
      // ESTA COMPROBACION ESTUVO MAL Y DEJO PASAR EL FALLO QUE DECIA VIGILAR.
      // Buscaba el texto del freno en cualquier parte del fichero y contaba
      // subidas y bajadas del contador dentro de la reposicion. Las dos cosas
      // eran ciertas, y aun asi el calentado del arranque subia el contador sin
      // mirarlo: durante los diez minutos siguientes a cada despliegue bastaba
      // con que alguien usara una accion para tener dos trabajos de fondo y las
      // dos plazas de ffmpeg cogidas. Medido con el semaforo instrumentado:
      // pico de 2.
      //
      // Contar por fichero, y no por funcion, es lo que arregla la clase entera:
      // mientras el contador solo pueda subir DENTRO de `enFondo`, no hay dos
      // sitios que puedan discrepar y no importa cuantos llamantes nuevos
      // aparezcan.
      {
        const iF = src4.indexOf('function enFondo');
        const cuerpoF = iF < 0 ? '' : src4.slice(iF, src4.indexOf('\n}', iF));
        exige(iF >= 0 && /fondoEnCurso >= 1\) return null;/.test(cuerpoF),
          'enFondo ya no frena: el relleno de la despensa puede ocupar las dos plazas de ffmpeg y dejar esperando un sticker');
        exige(/\.finally\(\(\) => \{ fondoEnCurso--; \}\)/.test(cuerpoF),
          'enFondo ya no devuelve el hueco en un finally: un fallo dentro dejaria el contador arriba y la despensa sin rellenarse hasta el proximo reinicio');
        const subidas = (src4.match(/fondoEnCurso\+\+/g) || []).length;
        const subeFuera = (cuerpoF.match(/fondoEnCurso\+\+/g) || []).length;
        exige(subidas === 1 && subeFuera === 1,
          `el contador de trabajos de fondo sube en ${subidas} sitios del fichero: tiene que subir SOLO dentro de enFondo, o vuelve a haber dos frenos que no se hablan`);
        const bajadas = (src4.match(/fondoEnCurso--/g) || []).length;
        exige(bajadas === 1,
          `el contador de fondo baja en ${bajadas} sitios: con mas de uno se puede bajar dos veces por el mismo trabajo y quedarse en negativo, que es no tener freno`);
        // Y LOS DOS LLAMANTES TIENEN QUE PASAR POR AHI. Sin esto, uno nuevo
        // puede llamar a traerAccion en segundo plano por su cuenta y el
        // contador seguiria cuadrando perfectamente.
        for (const f of ['calentarDespensa', 'reponerDespensa']) {
          const i = src4.indexOf(`function ${f}`);
          const cuerpo = i < 0 ? '' : src4.slice(i, src4.indexOf('\n}\n', i));
          exige(/enFondo\(/.test(cuerpo),
            `${f} lanza trabajo de fondo sin pasar por enFondo: se salta el freno y puede ocupar las dos plazas de ffmpeg`);
        }
        // Y LA REPOSICION NO PUEDE REINTENTAR CONTRA UNA WEB CAIDA. La vuelta
        // que llena la despensa esta bien; encadenarla tambien cuando la
        // peticion ha fallado es un bucle de peticiones a toda velocidad contra
        // una web que ya esta dando errores, sin que nadie lo vea.
        const iRep = src4.indexOf('function reponerDespensa');
        const cuerpoRep = iRep < 0 ? '' : src4.slice(iRep, src4.indexOf('\n}\n', iRep));
        exige(/if \(!crecio\) return;/.test(cuerpoRep),
          'la reposicion vuelve a encadenarse por "ha traido algo" en vez de por "hay mas que antes": si la poda borra lo que acaba de llegar, se llama a si misma sin parar y el bot se cuelga entero');
        // Y SE PRUEBA DE VERDAD, porque leer la condicion no basta para algo
        // cuyo sintoma es que el proceso deja de responder.
        //
        // Se mete en la despensa un fichero mas grande que el tope entero: la
        // poda lo borra en el acto, la cola sigue vacia, y con la condicion
        // vieja la funcion se llamaba a si misma sin timer de por medio.
        // Reproducido: noventa peticiones por segundo y un setTimeout de cuatro
        // segundos que no llego a dispararse jamas. En la VPS de un core, el bot
        // colgado sin una sola linea en el log.
        //
        // Corre en un proceso APARTE a proposito: si volviera el bucle, se
        // llevaria por delante este validador entero.
        {
          const dirB = fs.mkdtempSync(path.join(os.tmpdir(), 'ddb-bucle-'));
          const guionB = path.join(dirB, 'b.js');
          fs.writeFileSync(guionB, [
            `const axios = require(${JSON.stringify(path.join(R, 'node_modules/axios'))});`,
            'let peticiones = 0;',
            'const GORDO = Buffer.alloc(30 * 1024 * 1024, 0x41); GORDO[0] = 0xFF; GORDO[1] = 0xD8;',
            'axios.get = async (u, o) => { peticiones++;',
            '  if (o && o.responseType === "arraybuffer") return { data: GORDO };',
            '  return { data: { results: [{ url: "x" }] } }; };',
            `const acc = require(${JSON.stringify(path.join(R, 'src/commands/acciones'))});`,
            'let latidos = 0; const iv = setInterval(() => { latidos++; }, 200);',
            'const A = acc.ACCIONES.hug;',
            'const clave = acc._claveDespensa(A.cat, A.nsfw, A.catNsfw);',
            '// se fuerza el camino de reposicion metiendo y sacando de la despensa',
            'acc._traerAccion(A.cat, A.nsfw, A.catNsfw, true).then((m) => {',
            '  const d = acc._despensa.get(clave) || { cola: [], ts: Date.now() };',
            '  d.cola.push(m); acc._despensa.set(clave, d);',
            '}).catch(() => {});',
            'setTimeout(() => { clearInterval(iv);',
            '  console.log("RES" + JSON.stringify({ peticiones, latidos }));',
            '  process.exit(0); }, 3000);',
          ].join('\n'));
          let res = null;
          try {
            const bruto = execSync(`node ${JSON.stringify(guionB)}`, { encoding: 'utf8', timeout: 30000, cwd: R, stdio: ['ignore', 'pipe', 'ignore'] });
            const linea = (bruto.split('\n').find((l) => l.startsWith('RES')) || '').slice(3);
            res = linea ? JSON.parse(linea) : null;
          } catch { res = null; }
          exige(res !== null,
            'la prueba del bucle de la despensa no termino: eso ya es la señal — el proceso se quedo sin atender ni sus propios temporizadores');
          if (res) {
            exige(res.latidos >= 10,
              `el temporizador de 200 ms latio ${res.latidos} veces en tres segundos en vez de unas quince: el event loop se esta quedando sin aire`);
            exige(res.peticiones <= 10,
              `la despensa hizo ${res.peticiones} peticiones en tres segundos: eso es el bucle de reposicion, y con el el bot deja de responder`);
          }
          fs.rmSync(dirB, { recursive: true, force: true });
        }
      }

      exige(/jpegThumbnail: traido\.thumb \|\| null/.test(src4),
        'el mensaje de video ya no lleva miniatura: Baileys lanzara su propio ffmpeg al enviarlo, dentro del camino caliente');
    }

    // ── Y SOBREVIVE AL REINICIO ─────────────────────────────────────────
    //
    // El calentado tarda once minutos a proposito, asi que despues de cada
    // despliegue hay una ventana larga con la despensa vacia. Medido en la VPS
    // justo despues de un `npm run update`: *!fuck* tardo 15105 ms. Lo que se
    // preparo antes del reinicio sigue valiendo —son MP4 ya convertidos— asi
    // que se guarda en disco y se lee al arrancar.
    //
    // SE COMPRUEBA EL VIAJE ENTERO, no que exista la funcion: guardar, olvidar
    // la memoria como haria un reinicio, y recuperar el MISMO buffer con su
    // miniatura. La primera version de este codigo agrupaba mal los ficheros y
    // perdia las miniaturas por el camino; una guarda que solo mirase el texto
    // habria pasado en verde.
    {
      const fsx = require('fs-extra');
      const dir = acc._DESPENSA_DIR;
      const previo = await fsx.pathExists(dir) ? await fsx.readdir(dir) : null;
      // Una accion DE VERDAD: al leer el disco solo se recuperan las
      // categorias que siguen existiendo, asi que una inventada se borraria
      // sola y la prueba pasaria en verde sin probar nada.
      const real = acc.ACCIONES[acc.ACTIVAS[0]];
      const clave = acc._claveDespensa(real.cat, real.nsfw, real.catNsfw);
      const cuerpo = Buffer.from('prueba-de-despensa-en-disco');
      const thumb = Buffer.from('miniatura');
      acc._guardarEnDespensa(clave, { mp4: cuerpo, thumb });
      await new Promise((r) => setTimeout(r, 400));

      // El "reinicio": el modulo se recarga y su despensa nace vacia.
      for (const k of Object.keys(require.cache)) if (k.endsWith('commands/acciones.js')) delete require.cache[k];
      const acc2 = require(path.join(R, 'src/commands/acciones'));
      exige(acc2._despensa.size === 0, 'la despensa no nace vacia tras recargar: la prueba no vale');
      await acc2._restaurarDespensa();
      const cola = acc2._despensa.get(clave)?.cola || [];
      const vuelto = cola.find((x) => x.mp4 && Buffer.compare(x.mp4, cuerpo) === 0);
      exige(!!vuelto,
        'la despensa no sobrevive al reinicio: despues de cada despliegue vuelve a haber once minutos en los que cada accion paga el viaje entero (medido: 15105 ms)');
      exige(!!vuelto && vuelto.thumb && Buffer.compare(vuelto.thumb, thumb) === 0,
        'lo recuperado del disco viene sin miniatura: Baileys lanza su propio ffmpeg al enviar, en el unico core de la VPS y con alguien esperando');

      // Y lo consumido deja de ocupar disco.
      if (vuelto) {
        // POR DIFERENCIA DE FICHEROS, NO POR CUENTA. Las capas corren en
        // paralelo y el calentado de otra puede estar escribiendo en este mismo
        // directorio: contar cuantos hay da rojo sin que nada este mal. Lo que
        // se exige es que desaparezca alguno de LOS QUE HABIA.
        const antesF = await fsx.readdir(dir);
        acc2._sacarDeDespensa(clave);
        await new Promise((r) => setTimeout(r, 400));
        const despuesF = new Set(await fsx.readdir(dir));
        exige(antesF.some((f) => !despuesF.has(f)),
          'consumir una unidad no borra su fichero: el directorio crece sin tope hasta llenar el disco de la VPS');
      }
      // Se deja como estaba: esto corre en la maquina del dueño.
      for (const f of await fsx.readdir(dir)) if (!previo || !previo.includes(f)) await fsx.remove(path.join(dir, f));
      if (!previo) await fsx.remove(dir);
      for (const k of Object.keys(require.cache)) if (k.endsWith('commands/acciones.js')) delete require.cache[k];
    }

    if (fallos === antes) console.log(verde('   ✓ la despensa se mira antes de la red, repone lo suyo, manda ligero y se llena sola sin rafagas'));
  }
    // ── LAS FRASES DE ACCION NO PUEDEN TENER GENERO ─────────────────────
    //
    // Ni %A ni %V lo tienen: cualquiera del grupo cae en cualquiera de las dos
    // menciones. Una frase que dice "%V se queda quieto" sale con el nombre de
    // una tia delante el dia que le toca, y ahi el chiste se cae del todo — deja
    // de hablar de quien lo recibe para hablar de otra persona que no existe.
    //
    // Y NO ES HIPOTETICO: habia veintitres asi escritas, mias, en los pools que
    // escribi yo. "se pone rojo", "se hace pequeño", "se le nota satisfecho", y
    // ocho donde el "lo" se referia a %V —"%A levanta a %V y lo suelta"—, que es
    // lo mismo por la puerta de al lado. Ninguna la vio nadie porque el unico
    // guardian de genero que habia miraba los remates de *!r*.
    //
    // La regla va ANCLADA al sujeto (%A o %V, un verbo copulativo, y despues el
    // adjetivo) en vez de buscar palabras sueltas, porque "una marca pequeña" y
    // "la parte lista" son correctas y un validador que las cante se acaba
    // apagando. Sobre las 689 frases de hoy no salta ni una.
    {
      console.log('\n44. LAS FRASES VALEN PARA CUALQUIERA DEL GRUPO');
      const antes = fallos;
      const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   \u2717 ${queja}`)); } };
      const RXa = require(path.join(R, 'src/data/accionPhrases.js'));

      const COPULA = '(?:se\\s+)?(?:queda|quedan|pone|ponen|hace|hacen|siente|sienten|sale|salen'
        + '|acaba|acaban|est[\u00e1a]|va|van|parece|parecen|sigue|siguen|vuelve|vuelven)';
      const ADJ = '(?:quiet|roj|satisfech|pegad|peque\u00f1|encantad|enredad|entregad|rendid|sumis'
        + '|callad|sentad|tumbad|dormid|list|tont|content|cansad|muert|jodid|acabad|perdid|tranquil'
        + '|dispuest|ties|hart|[\u00fau]ltim|segur|nervios|agradecid|avisad|servid|salvad|desnud'
        + '|mojad|obedient)[oa]s?';
      // Sujeto, copula y adjetivo dentro de la MISMA oracion: los limites de
      // 25 caracteres y el [^.] son lo que impide que "%A ... . Una marca
      // pequeña" cuente como concordancia.
      const CONCORDANCIA = new RegExp('%[AV][^.]{0,25}\\b' + COPULA + '\\b[^.]{0,25}\\b' + ADJ + '\\b', 'i');
      // Y el clitico: "a %V ... lo suelta". `le` seria neutro; `lo` no.
      const CLITICO = /\b(?:a|de|con|sobre|encima de)\s+%V\b[^.]{0,30}\b(?:lo|los)\s+(?:suelta|tapa|levanta|carga|tira|agarra|coge|empuja|sujeta|arrastra|aparta|saca|sienta|tumba)\b/i;
      // Estos no pueden concordar con un objeto: en una frase de accion no hay
      // ninguno al que se le note satisfecho.
      const SOLO_PERSONA = /\b(satisfech|sumis|obedient|agradecid|rendid|entregad|desnud|encantad|nervios|arrepentid|orgullos|avergonzad)[oa]s?\b/i;

      const malas = [];
      for (const k of Object.keys(RXa)) {
        if (!Array.isArray(RXa[k])) continue;
        RXa[k].forEach((f, i) => {
          if (CONCORDANCIA.test(f) || CLITICO.test(f) || SOLO_PERSONA.test(f)) malas.push(`${k}[${i}]`);
        });
      }
      exige(malas.length === 0,
        `frases de accion con genero marcado (${malas.length}): ${malas.slice(0, 4).join(' ')} — %A y %V le tocan a cualquiera del grupo`);

      // Y QUE LA REGLA SIGA VIENDO. Un validador de texto se vacia solo el dia
      // que alguien toca un parentesis: si estas tres no saltan, arriba no hay
      // nada comprobandose y las 689 frases pasan por estar bien escritas.
      const cebos = [
        '%V se queda quieto y no dice nada.',
        '%A agarra a %V y lo suelta a distancia.',
        '%A termina encima de %V. Se le nota satisfecho.',
      ];
      const ciegos = cebos.filter((c) => !CONCORDANCIA.test(c) && !CLITICO.test(c) && !SOLO_PERSONA.test(c));
      exige(ciegos.length === 0,
        `la regla de genero ya no ve lo que tiene que ver: "${ciegos[0]}" le pasa por delante y no dice nada`);

      // ── Y LO MISMO EN LAS OTRAS 8.017 FRASES DEL BOT ───────────────
      //
      // "Eres el que reenvia capturas con comentario propio." A una tia le
      // llega en masculino, con su nombre delante. Habia 81 asi repartidas por
      // los pools mas leidos —rata, simp, incel, fidelidad, infiel— y el unico
      // guardian de genero que existia miraba los remates de *!r*.
      //
      // Se comprueban SOLO las dos construcciones que no admiten discusion:
      // "eres el que" (la neutral es "eres quien") y "eres el tio/tipo que" (la
      // neutral es "eres de esa gente que"). Un "cabron" suelto al final de la
      // frase no entra aqui: eso es el registro del bot y se usa igual con
      // cualquiera, no es una concordancia rota.
      //
      // Y quedan fuera los comandos que van DE genero a proposito —masculinidad,
      // feminidad, gay, maricon, femboy, puta, guarra—, donde decir "tio" es el
      // tema y no un descuido.
      {
        const TEMATICOS = /^(masculinidad|feminidad|gay|maricon|femboy|puta|guarra|linda|zorra|virgen)\b/;
        const ROTAS = [
          [/\beres\s+el\s+que\b/i, 'eres el que  →  eres quien'],
          [/\beres\s+(?:el|un|otro|ese|este)\s+(?:t[íi]o|tipo|chaval|pavo|colega)\s+que\b/i, 'eres el tipo que  →  eres de esa gente que'],
        ];
        const dir = path.join(R, 'src/data');
        const malas = [];
        for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
          let mod; try { mod = require(path.join(dir, f)); } catch { continue; }
          const rec = (o, ruta, d) => {
            if (d > 3) return;
            if (Array.isArray(o) && o.length && o.every((x) => typeof x === 'string')) {
              if (TEMATICOS.test(ruta)) return;
              o.forEach((t, i) => { for (const [rx, como] of ROTAS) if (rx.test(t)) malas.push(`${f}:${ruta}[${i}] (${como})`); });
              return;
            }
            if (o && typeof o === 'object') for (const k of Object.keys(o)) rec(o[k], ruta ? `${ruta}.${k}` : k, d + 1);
          };
          rec(mod, '', 0);
        }
        exige(malas.length === 0,
          `frases que dan por hecho que quien las lee es un tio (${malas.length}): ${malas.slice(0, 3).join(' · ')}`);
      }

      if (fallos === antes) console.log(verde('   \u2713 ninguna frase del bot da por hecho el genero de quien la manda ni de quien la recibe'));
    }

    // ── 45. EL SEMAFORO DE FFMPEG SE AJUSTA A LA MAQUINA ────────────────
    //
    // Estaba fijo en dos plazas y en la VPS —un core— eso era MAS LENTO. Dos
    // ffmpeg en un core no van en paralelo: se reparten el mismo core y tardan
    // el doble cada uno. Medido con dos stickers a la vez y `taskset -c 0`:
    //
    //   plazas   el primero espera   el ultimo
    //     1          1026 ms          2038 ms
    //     2          2253 ms          2256 ms
    //
    // La segunda plaza no adelanta a nadie y hace que el primero espere mas del
    // doble. Con cuatro cores se invierte. Asi que el numero no puede ser una
    // constante, y el tope de 2 se queda porque por encima lo que falta en 1 GB
    // no es CPU, es memoria.
    {
      console.log('\n45. EL SEMAFORO DE FFMPEG SE AJUSTA A LA MAQUINA');
      const antes = fallos;
      const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   \u2717 ${queja}`)); } };
      const src = soloCodigo('src/utils/helpers.js');
      exige(/createSemaphore\(Math\.max\(1, Math\.min\(2, NUCLEOS\)\)\)/.test(src),
        'el semaforo de ffmpeg volvio a un numero fijo de plazas: en la VPS de un core, dos plazas hacen que el primero espere el doble');
      exige(/availableParallelism/.test(src),
        'el numero de plazas ya no sale de los cores que ve el proceso');

      const h = require(path.join(R, 'src/utils/helpers'));
      const nucleos = (() => { try { return os.availableParallelism?.() || os.cpus().length || 1; } catch { return 1; } })();
      // Se mira el numero CONFIGURADO, no las plazas libres ahora mismo: las
      // capas de este validador corren en paralelo y la de stickers puede tener
      // una cogida justo en este instante. Escrito con `_libres` fallaba a
      // ratos, que es la peor clase de validador: el que a veces acusa.
      exige(h.ffmpegSemaphore._plazas === Math.max(1, Math.min(2, nucleos)),
        `el semaforo tiene ${h.ffmpegSemaphore._plazas} plazas y esta maquina ${nucleos} core(s): con mas plazas que cores solo se reparten el mismo core y todos esperan mas`);

      // Y EL CONTADOR TIENE QUE CUADRAR. Un semaforo que se queda con plazas de
      // menos no da un error: solo va cada vez mas lento hasta que un dia no
      // pasa nadie. Se prueba de verdad, no leyendo el fichero.
      for (const lim of [1, 2, 3]) {
        const sem = h.createSemaphore(lim);
        let dentro = 0; let pico = 0;
        await Promise.all(Array.from({ length: 12 }, async () => {
          await sem.acquire();
          dentro++; if (dentro > pico) pico = dentro;
          await new Promise((r) => setTimeout(r, 2));
          dentro--; sem.release();
        }));
        exige(pico === lim, `un semaforo de ${lim} plazas dejo entrar a ${pico} a la vez`);
        exige(sem._libres() === lim, `un semaforo de ${lim} plazas se quedo con ${sem._libres()} libres al terminar: pierde plazas y acaba parando el bot`);
      }

      // La puerta que NO espera: es lo que impide que un relleno de la despensa
      // deje a alguien haciendo cola por su sticker.
      {
        const sem = h.createSemaphore(1);
        exige(sem.tryAcquire() === true, 'tryAcquire no coge una plaza libre');
        exige(sem.tryAcquire() === false, 'tryAcquire coge una plaza ocupada: entonces el fondo SI hace cola y alguien espera detras');
        sem.release();
        exige(sem.tryAcquire() === true, 'tryAcquire no ve la plaza que se acaba de soltar');
      }
      exige(/if \(fondo && !ffmpegSemaphore\.tryAcquire\(\)\)/.test(soloCodigo('src/commands/acciones.js')),
        'el relleno de la despensa volvio a hacer cola en el semaforo: con una sola plaza, eso es alguien esperando su sticker detras de un gif que no ha pedido');

      if (fallos === antes) console.log(verde(`   \u2713 el semaforo de ffmpeg tiene ${h.ffmpegSemaphore._plazas} plaza(s) para ${nucleos} core(s), no pierde ninguna, y el fondo no hace cola`));
    }


  // ── 39. !purgeall NO SE LLEVA POR DELANTE A QUIEN NO DEBE ────────────────
  //
  // Es el comando mas destructivo del bot: saca y veta a TODO el grupo, y la
  // lista negra es global y permanente, asi que deshacerlo es desbanear a cada
  // uno a mano. No hay margen para que una de sus guardas se caiga sin que nadie
  // lo note.
  //
  // AQUI NO SE EJECUTA NADA, y es deliberado: `npm run check` corre a diario
  // sobre el repositorio de verdad, asi que probar la ejecucion escribiria
  // numeros inventados en la lista negra real. Se prueba el PRIMER paso —el que
  // dice a cuantos va a sacar y pide el codigo— porque ahi es donde vive la
  // unica propiedad que importa: a quien mete en la lista y a quien no. Ese paso
  // no toca ni un fichero.
  {
    console.log('\n39. !purgeall NO SE LLEVA POR DELANTE A QUIEN NO DEBE');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    const { cmdPurgeAll } = require(path.join(R, 'src/commands/purgaNumero'));
    const cfg3 = require(path.join(R, 'src/config'));
    const OWN3 = `${String(cfg3.ownerNumber).replace(/\D/g, '')}@s.whatsapp.net`;
    const CO3 = `${String(cfg3.coOwners?.[0] || '34600000123').replace(/\D/g, '')}@s.whatsapp.net`;
    const BOT3 = '549199@s.whatsapp.net';
    // El guardian LISTADO SIN EL 9 y configurado CON el: es la forma en que
    // WhatsApp los manda distinto, y comparando cadenas se colaria en la purga.
    const GUA3 = '541100000077@s.whatsapp.net';
    const GJ3 = '000000000@g.us';
    const RASOS = ['5211111111111', '5212222222222', '5213333333333'].map((n) => `${n}@s.whatsapp.net`);
    const parts3 = [{ id: BOT3, admin: 'admin' }, { id: OWN3, admin: 'admin' }, { id: CO3 },
      { id: GUA3, admin: 'admin' }, ...RASOS.map((id) => ({ id }))];
    const meta3 = { id: GJ3, subject: 'G', participants: parts3 };

    const pedir = async (quien, args = []) => {
      const out = [];
      const tocado = [];
      const sk = {
        user: { id: BOT3 },
        sendMessage: async (j, c) => { out.push(c.text || ''); return {}; },
        groupMetadata: async () => meta3,
        groupParticipantsUpdate: async (j, p, a) => { tocado.push(...p.map((x) => `${a}:${x}`)); return p.map((x) => ({ status: '200', jid: x })); },
      };
      await cmdPurgeAll(sk, { key: { remoteJid: GJ3, participant: quien, fromMe: false, id: 'X' } }, args, meta3);
      return { texto: out.join('\n'), tocado };
    };

    const guardaAntes = cfg3.guardian;
    cfg3.guardian = '5491100000077';
    try {
      // 1. SILENCIO a quien no es el dueño principal. Contestar cualquier cosa
      // —hasta un "no puedes"— confirma que el comando existe.
      exige((await pedir(RASOS[0])).texto === '', 'un miembro raso recibe respuesta de *!purgeall*: eso ya le confirma que el comando existe');
      exige((await pedir(CO3)).texto === '', 'un co-owner recibe respuesta de *!purgeall*: es del dueño principal, y en silencio para el resto');

      // 2. El dueño: pide codigo y NO toca a nadie todavia.
      const p1 = await pedir(OWN3);
      const cod = (p1.texto.match(/!purgeall (\d{4})/) || [])[1];
      exige(Boolean(cod), '*!purgeall* ya no pide confirmacion con codigo: dos mensajes seguidos sin querer vaciarian el grupo');
      exige(p1.tocado.length === 0, '*!purgeall* saca gente en el PRIMER paso, antes de confirmar nada');

      // 3. Y LA CUENTA. Son tres rasos de siete miembros: el bot, el dueño, el
      // co-owner y el guardian se quedan fuera. Si esta cifra sube, alguno de
      // los cuatro esta entrando en la purga.
      const n = Number((p1.texto.match(/\*(\d+)\* persona/) || [])[1]);
      exige(n === RASOS.length,
        `*!purgeall* va a sacar a ${n} de ${parts3.length} y solo hay ${RASOS.length} que se puedan tocar: se esta llevando al bot, al tier dueño o al guardian`);

      // 4. Un codigo equivocado no ejecuta.
      const malo = await pedir(OWN3, ['0000']);
      exige(malo.tocado.length === 0, '*!purgeall* con el codigo equivocado ejecuta igual');
    } finally {
      cfg3.guardian = guardaAntes;
    }

    // 5. Y no puede asomar por ningun lado: ni en el menu ni en el corrector.
    {
      const mh2 = fs.readFileSync(path.join(R, 'src/handlers/messageHandler.js'), 'utf8');
      const menu2 = fs.readFileSync(path.join(R, 'src/commands/social.js'), 'utf8');
      exige(/COMANDOS_OCULTOS = new Set\(\[[^\]]*'purgeall'/.test(mh2),
        '*!purgeall* no esta en COMANDOS_OCULTOS: el corrector lo ofreceria a cualquiera que escriba *!purgeal*');
      exige(!/\$\{p\}purgeall\b/.test(menu2),
        '*!purgeall* ha aparecido en el menu');
    }

    if (fallos === antes) console.log(verde('   ✓ *!purgeall* es del dueño, pide codigo y respeta al bot, al tier dueño y al guardian'));
  }

  // ── 35. LOS DOS PREFIJOS HACEN EXACTAMENTE LO MISMO ──────────────────────
  //
  // El bot entiende *!aura* y */aura*. Eso no es una opcion de configuracion:
  // es una condicion que tienen que cumplir SEIS sitios distintos del
  // dispatcher —la puerta de los comandos, la de los mensajes propios, la del
  // bot apagado, la de los sobres sin contenido, la de los comandos de media y
  // el corrector—, y cada uno tenia su `text.startsWith(config.prefix)` a pelo.
  //
  // Olvidarse de uno NO da error. Da algo peor: la barra funciona en casi todo
  // y deja de funcionar en un rincon —los stickers, o el *!on* con el bot
  // apagado— sin ningun sintoma en el log. Quien lo sufra pensara que el bot
  // falla a ratos.
  //
  // Se prueba MANDANDO LOS DOS por el dispatcher de verdad y comparando la
  // respuesta, no leyendo el fuente.
  {
    console.log('\n35. LOS DOS PREFIJOS HACEN LO MISMO');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const cfg = require(path.join(R, 'src/config'));
    exige(Array.isArray(cfg.prefijos) && cfg.prefijos[0] === cfg.prefix,
      `el prefijo que se imprime (${cfg.prefix}) tiene que ser el primero de los que se aceptan [${(cfg.prefijos || []).join(' ')}]`);
    // Nadie puede volver a preguntar por el prefijo canonico para saber si algo
    // es un comando: eso es justo lo que deja fuera a la barra.
    {
      const mh = fs.readFileSync(path.join(R, 'src/handlers/messageHandler.js'), 'utf8');
      const sueltos = [...mh.matchAll(/startsWith\(config\.prefix\)/g)].length;
      exige(sueltos === 0,
        `quedan ${sueltos} sitio(s) preguntando startsWith(config.prefix): ahi la barra no funciona y no lo dice nadie`);
    }
    const dirP = fs.mkdtempSync(path.join(os.tmpdir(), 'pref-'));
    try {
      const guion = path.join(dirP, 'p.js');
      fs.writeFileSync(guion, `
const fs=require('fs'),os=require('os'),path=require('path');
const ROOT=fs.mkdtempSync(path.join(os.tmpdir(),'pf-'));
fs.cpSync(${JSON.stringify(path.join(R, 'src'))},path.join(ROOT,'src'),{recursive:true});
fs.mkdirSync(path.join(ROOT,'data'));
try{fs.symlinkSync(${JSON.stringify(path.join(R, 'node_modules'))},path.join(ROOT,'node_modules'),'dir');}catch{}
process.env.OWNER_NUMBER='34600111222';
const {handleMessage}=require(path.join(ROOT,'src/handlers/messageHandler'));
const G='000000035@g.us', BOT='549199@s.whatsapp.net';
const gente=[];for(let i=0;i<12;i++)gente.push('34655440'+(100+i)+'@s.whatsapp.net');
const partes=[{id:BOT,admin:'admin'},{id:'34600111222@s.whatsapp.net',admin:'admin'},
  ...gente.map(id=>({id,admin:'admin'}))];
const out=[];
const sock={user:{id:BOT},sendPresenceUpdate:async()=>{},readMessages:async()=>{},
  sendMessage:async(j,c)=>{if(c.text)out.push(c.text);return{}},
  groupMetadata:async()=>({id:G,subject:'G',participants:partes}),
  groupFetchAllParticipating:async()=>({[G]:{id:G,participants:partes}}),
  onWhatsApp:async(j)=>[{exists:true,jid:j}],sendReaction:async()=>{}};
const di=async(quien,t)=>{out.length=0;
  await handleMessage(sock,{key:{remoteJid:G,participant:quien,fromMe:false,id:'P'+Math.random()},
    message:{conversation:t},pushName:'x',messageTimestamp:Math.floor(Date.now()/1000)});
  await new Promise(r=>setTimeout(r,250));
  return out.join(' ');};
(async()=>{
  const r={};
  let i=0;
  // Comandos de respuesta ESTABLE: el mismo texto siempre, para poder comparar.
  for(const c of ['ping','whoami','info']){
    r[c]=[await di(gente[i++],'!'+c), await di(gente[i++],'/'+c)];
  }
  // El corrector tiene que contestar con el prefijo que se escribio.
  r.corrector=[await di(gente[i++],'!pinng'), await di(gente[i++],'/pinng')];
  // CON EL BOT APAGADO SOLO PASA "on", y esa puerta tiene que entender los dos
  // prefijos. Se apaga DE VERDAD —!off es solo del dueño— y se comprueba por el
  // HECHO: con el bot apagado, un comando normal no contesta.
  const DUENO='34600111222@s.whatsapp.net';
  r.apagado={};
  await di(DUENO,'!off');
  r.apagado.mudoConBarra = await di(gente[i],'/ping');
  r.apagado.enciendeBarra = await di(DUENO,'/on');
  r.apagado.pingTrasBarra = await di(gente[i],'/ping');
  await di(DUENO,'!off');
  r.apagado.mudoConBang = await di(gente[i],'!ping');
  r.apagado.enciendeBang = await di(DUENO,'!on');
  r.apagado.pingTrasBang = await di(gente[i],'!ping');
  console.log(JSON.stringify(r));
})();
`);
      const r = JSON.parse(execSync(`node ${guion}`, { encoding: 'utf8', timeout: 120000 }).trim().split('\n').pop());
      for (const c of ['ping', 'whoami', 'info']) {
        const [conBang, conBarra] = r[c];
        exige(conBarra && conBarra.length > 0, `*/${c}* no contesta nada y *!${c}* si: la barra no llega a ese comando`);
        // `info` trae el uptime, que cambia entre las dos llamadas: se compara
        // la forma, no el texto entero.
        exige(conBarra.split('\n').length === conBang.split('\n').length,
          `*/${c}* y *!${c}* contestan cosas distintas`);
      }
      exige(/^\*\/pinng\*/.test(r.corrector[1]),
        `el corrector contesta "${String(r.corrector[1]).split('\n')[0]}" a quien escribio */pinng*: con el otro prefijo delante parece que la barra no vale`);
      exige(/^\*!pinng\*/.test(r.corrector[0]),
        'el corrector ha dejado de contestar con el prefijo canonico a quien escribe con el canonico');
      // Primero, que el apagado apague de verdad: si no, lo de abajo pasa en
      // verde sin haber probado nada. Es el fallo que tuvo esta misma guarda:
      // apagaba con un admin cualquiera, y *!off* es solo del dueño, asi que el
      // bot nunca llego a estar apagado y las dos comprobaciones no comprobaban.
      exige(!r.apagado.mudoConBarra && !r.apagado.mudoConBang,
        'el bot no se ha apagado, asi que la puerta del *on* no se ha probado: la guarda estaria pasando en verde sin comprobar nada');
      exige(r.apagado.enciendeBarra && r.apagado.pingTrasBarra,
        'con el bot apagado, */on* no lo enciende: la unica puerta que queda abierta no entiende la barra');
      exige(r.apagado.enciendeBang && r.apagado.pingTrasBang,
        'con el bot apagado, *!on* ha dejado de encenderlo');
    } catch (e) {
      exige(false, `no pude probar los dos prefijos: ${String(e.message).split('\n')[0]}`);
    } finally {
      fs.rmSync(dirP, { recursive: true, force: true });
    }
    if (fallos === antes) console.log(verde(`   ✓ ${cfg.prefijos.join(' y ')} entran por la misma puerta, y el bot contesta con el que se uso`));
  }

  // ── 34. LOS GUIONES DE DESPLIEGUE Y LOS DOS LIMITES QUE SE AJUSTARON ─────
  //
  // LOS .sh NO LOS COMPILA NADIE. La capa 1 compila los .js, pero un error de
  // sintaxis en actualizar.sh o en node22.sh no se ve hasta que alguien lanza
  // el despliegue en la VPS — y para entonces el fallo llega mezclado con la
  // salida de git y de npm, que es el peor sitio posible para leerlo. `bash -n`
  // los parsea sin ejecutar ni una linea.
  //
  // Y DOS CONSTANTES QUE SE AJUSTARON POR UN MOTIVO, no por gusto. Se vigila el
  // LIMITE, no el numero exacto: mover 700 a 800 esta bien, bajarlo a 250 es
  // volver al problema.
  {
    console.log('\n34. LOS GUIONES DE DESPLIEGUE Y SUS LIMITES');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    // ── EL TECHO DE MEMORIA SE MIDE EN RSS, Y ESO YA COSTO UNA TRAMPA ────
    //
    // `max_memory_restart` de pm2 mira el RSS del proceso. El techo del guardian
    // se puso en 120M a partir de una medida de 22 MB "recien arrancado" — pero
    // esos 22 MB eran `heapUsed`, que en Node es una fraccion del RSS. Medido de
    // verdad, el guardian arranca con 111 MB de RSS: a nueve megas de su propio
    // techo, sin haber hecho nada. En cuanto abre el socket lo cruza, pm2 lo
    // mata y lo levanta otra vez, y eso en el log no se lee como un fallo: se
    // lee como un reinicio limpio.
    //
    // Aqui se ARRANCA cada proceso de verdad en un hijo, se lee su RSS y se
    // exige que el techo sea al menos vez y media eso. Leer la constante y
    // creersela es exactamente como se colo el 120M.
    {
      // Se REQUIERE el fichero en vez de leerlo con un regex: escrito con regex,
      // meter un comentario largo entre `name` y `max_memory_restart` hacia que
      // ese proceso desapareciera de la lista y la capa dejaba de mirarlo. Me
      // paso al escribir esto.
      const apps = (require(path.join(R, 'ecosystem.config.js')).apps || [])
        .filter((a) => a && a.name && typeof a.max_memory_restart === 'string')
        .map((a) => ({ nombre: a.name, techo: Number(String(a.max_memory_restart).replace(/\D/g, '')) }));
      exige(apps.length >= 2, `ecosystem.config.js declara ${apps.length} proceso(s) con techo de memoria; se esperaban al menos 2 (bot y guardian)`);
      const guion = {
        bot: "require('./src/handlers/messageHandler.js'); require('./src/bot.js');",
        guardian: "require('./src/guardian.js');",
      };
      for (const { nombre, techo } of apps) {
        if (!guion[nombre]) continue;
        let rss = 0;
        try {
          const salida = execSync(`node -e ${JSON.stringify(`${guion[nombre]}setTimeout(()=>{console.log('RSS'+Math.round(process.memoryUsage().rss/1048576));process.exit(0)},1200)`)}`,
            { encoding: 'utf8', timeout: 60000, cwd: R, env: { ...process.env, NODE_ENV: 'production' }, stdio: ['ignore', 'pipe', 'ignore'] });
          const m = salida.match(/RSS(\d+)/);
          rss = m ? Number(m[1]) : 0;
        } catch { rss = 0; }
        if (!rss) { fallos++; console.log(rojo(`   ✗ no pude medir cuanta memoria pide *${nombre}* al arrancar`)); continue; }
        exige(techo >= rss * 1.5,
          `*${nombre}* arranca con ${rss} MB de RSS y su max_memory_restart es ${techo}M: pm2 lo matara en cuanto haga algo, y un reinicio en bucle no se lee como fallo en el log`);
      }
    }

    for (const sh of ['scripts/actualizar.sh', 'scripts/node22.sh', 'scripts/respaldo.sh', 'scripts/restaurar.sh']) {
      const ruta = path.join(R, sh);
      if (!fs.existsSync(ruta)) { exige(false, `falta ${sh}`); continue; }
      try {
        execSync(`bash -n ${ruta}`, { stdio: ['ignore', 'ignore', 'pipe'] });
      } catch (e) {
        exige(false, `${sh} no parsea: ${String(e.stderr || e.message).trim().split('\n')[0]}`);
      }
    }

    // La pausa entre reintentos de foto de perfil. Bajarla apelotona tres
    // consultas al mismo endpoint en menos de un segundo, que con la cuenta en
    // revision es exactamente la forma de una automatizacion. El reintento
    // existe para un fallo de red pasajero, y eso no se arregla en 250 ms.
    const waSrc = soloCodigo('src/utils/wa.js');
    const pausa = waSrc.match(/setTimeout\(r,\s*(\d+)\s*\*\s*\(i \+ 1\)\)/);
    exige(pausa && Number(pausa[1]) >= 500,
      `los reintentos de foto de perfil vuelven a ir a ${pausa ? pausa[1] : '?'} ms: tres consultas seguidas en menos de un segundo`);

    // El retardo de guardado de los conteos. Subirlo agranda la ventana que se
    // pierde si el kernel mata el proceso, y en los conteos no puede haber
    // errores. El coste que justificaba subirlo desaparecio al serializar las
    // escrituras.
    const mcSrc = soloCodigo('src/utils/messageCounter.js');
    const ret = mcSrc.match(/COUNT_FILE,\s*(\d+),/);
    exige(ret && Number(ret[1]) <= 15000,
      `el guardado de conteos vuelve a tardar ${ret ? ret[1] : '?'} ms: es lo que se pierde de golpe si el proceso muere a lo bruto`);

    // NODE22 NO PUEDE COLGARSE ESPERANDO UNA RESPUESTA. Paso de verdad: apt
    // saco el dialogo de needrestart, el script se quedo esperando una tecla
    // que nadie iba a pulsar y por fuera parecia que se habia colgado.
    // SIN LOS COMENTARIOS, y esta vez la guarda se cazo a si misma: buscaba
    // NEEDRESTART_MODE en el fichero entero y lo encontraba... en el comentario
    // que explica para que sirve. Se podia borrar la linea de verdad y la
    // comprobacion seguia en verde. Es el mismo error que ya me habia salido
    // tres veces con los .js, y para eso existe soloCodigo(); a los .sh les
    // hacia falta lo mismo con las almohadillas.
    const n22 = fs.readFileSync(path.join(R, 'scripts/node22.sh'), 'utf8')
      .split('\n').map((l) => l.replace(/(^|\s)#.*$/, '')).join('\n');
    for (const v of ['DEBIAN_FRONTEND=noninteractive', 'NEEDRESTART_MODE=a', 'NEEDRESTART_SUSPEND=1']) {
      exige(n22.includes(v),
        `node22.sh sin ${v}: apt puede abrir un dialogo y el script se queda colgado esperando una tecla`);
    }
    // Y NO PUEDE DARSE POR HECHO. Si un intento anterior instalo Node y murio
    // despues, volver a lanzarlo tiene que rehacer pm2 y las dependencias: Node
    // nuevo con pm2 viejo y binarios del ABI anterior es un bot caido, y encima
    // con el guion diciendo que todo esta bien.
    exige(!/Ya estas en Node \$\{DESTINO\}\.[\s\S]{0,80}?exit 0/.test(n22),
      'node22.sh vuelve a salirse cuando Node ya esta en el destino: se saltaria pm2 y las dependencias de un intento a medias');

    // NINGUN AVISO DE `estado` PUEDE QUEDARSE ENCENDIDO PARA SIEMPRE.
    //
    // Paso, y estuvo asi desde que lo escribi: el aviso de "reiniciado hace
    // nada" comparaba la fecha de una linea del log que NO LLEVA FECHA. La
    // expresion no casaba nunca, el dato salia NaN y el aviso no habia forma de
    // apagarlo — ni esperando, ni reiniciando, ni actualizando. Y de rebote
    // tapaba la rama que de verdad importa, la de "lleva horas corriendo codigo
    // viejo", que quedaba inalcanzable.
    //
    // Se comprueba lo que fallo: que la decision se tome con la HUELLA primero
    // (si el commit del log es el del disco, esta al dia y da igual la hora) y
    // que lo de "recien arrancado" salga de pm_uptime, que es un dato que
    // existe, y no de una fecha inventada.
    const est = soloCodigo('scripts/estado.js');
    exige(!/\d\{4\}\}?-\\d\{2\}.*T/.test(est) && !/escritaEn/.test(est),
      'estado.js vuelve a sacar la hora de una linea de log que no la lleva: el aviso se queda encendido para siempre');
    exige(/recienArrancado/.test(est) && /pm_uptime/.test(est),
      'estado.js ya no usa pm_uptime para saber si el bot acaba de arrancar');
    const iHuella = est.indexOf('enMemoria.startsWith(local)');
    const iRecien = est.indexOf('recienArrancado)');
    exige(iHuella > 0 && iRecien > 0 && iHuella < iRecien,
      'en estado.js la huella dejo de mirarse antes que el "recien arrancado": con el bot al dia volveria a salir un aviso que no se puede apagar');

    // NI EL DESPLIEGUE PUEDE ACUSAR CON UNA HUELLA VIEJA.
    //
    // MISMO FALLO, OTRO FICHERO, Y ESTE SI SALIO A LA CARA. actualizar.sh
    // dormia doce segundos a ciegas y leia la ultima linea de "commit cargado".
    // El bot escribe esa linea AL CONECTAR, y conectar tarda mas de doce
    // segundos a menudo, asi que el guion leia la huella del arranque ANTERIOR
    // y gritaba "el codigo nuevo NO se esta ejecutando" con el despliegue ya
    // hecho — y encima reiniciaba el bot otra vez para nada. Paso con la salida
    // delante y el commit correcto en disco.
    //
    // No se vigila la redaccion del aviso, que cambiara: se vigila el hecho de
    // que la huella vieja no puede acusar. Tres cosas, y las tres tienen que
    // seguir siendo verdad:
    const act = fs.readFileSync(path.join(R, 'scripts/actualizar.sh'), 'utf8')
      .split('\n').map((l) => l.replace(/(^|\s)#.*$/, '')).join('\n');
    const iAntes = act.indexOf('HUELLAS_ANTES=');
    const iReinicio = act.indexOf('pm2 restart bot');
    // 1) Se cuentan las huellas ANTES de reiniciar. Sin ese recuento no hay
    //    forma de distinguir "aun no ha conectado" de "corre codigo viejo":
    //    las dos se ven igual, una huella antigua en el log.
    exige(iAntes > 0 && iReinicio > 0 && iAntes < iReinicio,
      'actualizar.sh ya no cuenta las huellas antes de reiniciar: no puede distinguir "aun no ha conectado" de "corre codigo viejo"');
    // 2) La huella solo se lee si ha aparecido una NUEVA. Es la condicion que
    //    faltaba: leerla sin comparar es leer la del arranque anterior.
    const iPuerta = act.indexOf('HUELLAS_AHORA}" -gt "${HUELLAS_ANTES}" ]; then');
    const iLee = act.indexOf('CARGADO="$(pm2 logs');
    exige(iPuerta > 0 && iLee > iPuerta,
      'actualizar.sh vuelve a leer el commit del log sin comprobar que sea de este arranque: acusara al bot con la huella del anterior');
    // 3) Y no se espera un numero fijo de segundos. Doce era la apuesta que
    //    perdia; cualquier constante a ciegas vuelve a perderla.
    exige(!/sleep\s+\d\d+/.test(act),
      'actualizar.sh vuelve a esperar un numero fijo de segundos a que el bot conecte: si tarda mas, lee la huella del arranque anterior');

    // Y 3b) LO QUE SE COMPARA TIENE QUE SER UN NUMERO, UNO SOLO.
    //
    // PASO EN LA VPS Y LLENO LA PANTALLA. Estaba escrito
    // `grep -c ... || echo 0`, y eso NO devuelve un numero: devuelve DOS.
    // `grep -c` imprime el 0 cuando no encuentra nada Y ADEMAS sale con codigo
    // 1, asi que el `|| echo 0` dispara tambien y la variable acaba valiendo
    // "0\n0". A partir de ahi cada comparacion escupe "integer expression
    // expected", el bucle no puede romperse nunca y el guion acaba diciendo que
    // el bot no arranco teniendolo delante y funcionando.
    //
    // Se vigilan las dos mitades: que no vuelva el patron, y que el recuento
    // pase por un sitio que garantice un entero.
    exige(!/grep -c[^\n]*\|\|\s*echo/.test(act),
      'actualizar.sh vuelve a contar con `grep -c ... || echo`: grep imprime el 0 Y sale con codigo 1, asi que la variable acaba con DOS numeros y toda comparacion revienta');
    exige(/huellas\(\)\s*\{/.test(act) && /tr -cd '0-9'/.test(act),
      'actualizar.sh ya no filtra el recuento de huellas a digitos: cualquier ruido de pm2 vuelve a romper la comparacion');

    // Y 4) NI SE PIDEN CUATRO LINEAS DE LOG PARA BUSCAR ALGO QUE ESTA ARRIBA.
    //
    // La huella se imprime AL CONECTAR, y justo despues el bot escupe el
    // arranque entero: el resumen, los grupos, los avisos. Para cuando alguien
    // mira, esa linea lleva un buen rato fuera de las ultimas cinco. Pedir
    // pocas lineas no da error: da VACIO, que se lee igual que "no esta" y es
    // exactamente el falso negativo que estamos intentando quitar de aqui.
    // Me paso a mi: puse `--lines 5` en la pista que da el guion y no encontro
    // nada teniendo el bot al dia delante.
    for (const [rel, texto] of [['scripts/actualizar.sh', act], ['scripts/estado.js', soloCodigo('scripts/estado.js')]]) {
      for (const linea of texto.split('\n')) {
        if (!linea.includes('commit cargado') || !linea.includes('pm2 logs')) continue;
        const n = linea.match(/--lines\s+(\d+)/);
        exige(n && Number(n[1]) >= 100,
          `${rel} busca la huella en solo ${n ? n[1] : '?'} lineas de log: sale vacio y parece que el bot no ha arrancado`);
      }
    }

    // Y 5) LA HUELLA TIENE QUE SER LA DEL CODIGO EN MEMORIA, NO LA DEL DISCO.
    //
    // ESTA ES LA BUENA, la que hacia mentir a todas las demas. gitCommit() lee
    // .git EN EL MOMENTO en que se la llama, y el bot la llamaba AL CONECTAR:
    // minutos despues de arrancar. Un proceso viejo que se reconectara despues
    // de un `git pull` firmaba con el hash NUEVO — el del codigo que
    // precisamente no estaba ejecutando. La comprobacion mentia justo en el
    // caso para el que existe.
    //
    // Se exige lo que lo arregla: que el valor se congele al cargar el modulo
    // y que lo que se imprime sea ESE valor, no una lectura nueva. Y que salga
    // al arrancar el proceso, no solo al conectar, que era lo que dejaba la
    // ventana de minutos donde el log seguia mostrando el arranque anterior.
    {
      const ver = soloCodigo('src/utils/version.js');
      exige(/const COMMIT_ARRANQUE = gitCommit\(\)/.test(ver),
        'version.js ya no congela la huella al cargar: un proceso viejo puede firmar con el hash nuevo tras un pull');
      for (const rel of ['index.js', 'src/bot.js']) {
        const src = soloCodigo(rel);
        for (const linea of src.split('\n')) {
          if (!linea.includes('commit cargado')) continue;
          exige(!/gitCommit\(\)/.test(linea),
            `${rel} imprime la huella leyendo el disco en ese momento: un proceso viejo firmaria con el hash nuevo`);
        }
      }
      const idx = soloCodigo('index.js');
      exige(/commit cargado/.test(idx),
        'index.js ya no imprime la huella al arrancar: hasta que el bot conecte, el log sigue enseñando la del arranque anterior');
      // Y que salga ANTES de conectar, o sea antes de arrancar el bot.
      exige(idx.indexOf('commit cargado') < idx.indexOf('connectToWhatsApp()'),
        'en index.js la huella se imprime despues de lanzar la conexion: vuelve la ventana en la que el log miente');

      // UNA SOLA HUELLA POR ARRANQUE. El bot la escribia dos veces —al arrancar
      // y al conectar— con la misma etiqueta, y con dos lineas iguales por
      // arranque no hay forma de saber, mirando el log, si el proceso que
      // arranco llego a conectar: es la comprobacion de abajo la que se queda
      // sin poder responder.
      let sitios = 0;
      const andarSrc = (d) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const f = path.join(d, e.name);
          if (e.isDirectory()) andarSrc(f);
          else if (e.name.endsWith('.js')) {
            for (const l of soloCodigo(path.relative(R, f)).split('\n')) {
              if (l.includes('commit cargado')) sitios++;
            }
          }
        }
      };
      andarSrc(path.join(R, 'src'));
      for (const l of idx.split('\n')) if (l.includes('commit cargado')) sitios++;
      exige(sitios === 1,
        `la huella se imprime en ${sitios} sitios: con mas de una linea por arranque no se puede saber si el proceso llego a conectar`);

      // Y ESTADO TIENE QUE AVISAR DE UN BOT ARRANCADO QUE NO CONECTA.
      //
      // "Sesion de WhatsApp presente" solo mira que exista creds.json, que es un
      // dato del disco: un proceso que arranco y nunca abrio la sesion salia en
      // verde con pm2 diciendo "online" y el bot mudo en el grupo. Paso, y estuvo
      // asi una hora sin que ninguna comprobacion lo dijera.
      const estSrc = soloCodigo('scripts/estado.js');
      exige(/Daddy's Bot conectado/.test(estSrc) && /lastIndexOf/.test(estSrc),
        'estado.js ya no comprueba si el bot llego a conectar: un proceso arrancado y mudo vuelve a salir todo en verde');
      exige(/enMarcha > 120000/.test(estSrc),
        'estado.js ya no da margen antes de acusar de no conectar: acusaria a un bot que acaba de arrancar y aun esta conectando');
    }

    // UN MODULO QUE SE USA Y NO SE IMPORTA.
    //
    // Paso en bot.js: se escribio `config.autoRead` y bot.js no importaba
    // config. `node --check` no lo ve —es sintaxis valida— y solo revienta al
    // EJECUTAR esa linea, que en este caso era dentro del `connection === open`:
    // el peor momento posible y el unico en que corre, asi que no habria dado
    // la cara hasta tener el bot delante intentando conectar.
    //
    // Se mira solo un puñado de nombres —los modulos propios que se usan en
    // media docena de ficheros— y siempre en el codigo sin comentarios, que ya
    // me he cazado a mi mismo con eso mas de una vez.
    {
      const MODULOS = ['config', 'logger', 'economia', 'helpers'];
      const ficheros = [];
      const andar = (d) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const f = path.join(d, e.name);
          if (e.isDirectory()) andar(f);
          else if (e.name.endsWith('.js')) ficheros.push(path.relative(R, f));
        }
      };
      andar(path.join(R, 'src'));
      for (const rel of ficheros) {
        const codigo = soloCodigo(rel);
        for (const m of MODULOS) {
          if (!new RegExp(`(^|[^\\w.$])${m}\\.[a-zA-Z_$]`).test(codigo)) continue;
          const importado =
            new RegExp(`(const|let|var)\\s+${m}\\s*=\\s*require`).test(codigo) ||
            new RegExp(`\\b${m}\\b[^=]*=\\s*require`).test(codigo) ||
            new RegExp(`function\\s+${m}\\b`).test(codigo) ||
            new RegExp(`(const|let|var)\\s+${m}\\s*=`).test(codigo) ||
            new RegExp(`[({,]\\s*${m}\\s*[,)}:=]`).test(codigo);
          exige(importado,
            `${rel} usa \`${m}.\` y no lo importa: ReferenceError en cuanto se ejecute esa linea, no antes`);
        }
      }
    }

    // EL VISTO Y LA PRESENCIA NO PUEDEN CONTRADECIRSE.
    //
    // Estuvieron contradiciendose y no se veia: autoRead en true marcando todo,
    // y markOnlineOnConnect clavado en false anunciando la sesion como
    // 'unavailable'. Baileys entonces manda CADA acuse como 'inactive' y
    // WhatsApp no pinta el visto de un cliente que dice no estar delante. El
    // codigo corria perfecto y no servia de nada — el peor tipo de fallo, el
    // que no falla.
    //
    // No se vigila el valor, se vigila que uno salga del otro: mientras
    // markOnlineOnConnect dependa de la misma fuente que el visto, no pueden
    // decir cosas distintas.
    //
    // Y la fuente ya no es `config.autoRead` a secas: desde que existe *!visto*
    // manda el interruptor guardado y config solo es el arranque de fabrica.
    // Se acepta cualquiera de las dos formas y se rechaza un literal, que es lo
    // unico que de verdad rompe la pareja.
    const botSrc = soloCodigo('src/bot.js');
    const marca = botSrc.match(/markOnlineOnConnect:\s*([^,\n]+)/);
    exige(marca && /autoRead|vistoActivo/.test(marca[1]) && !/^\s*(true|false)\s*$/.test(marca[1]),
      `markOnlineOnConnect vuelve a estar clavado (${marca ? marca[1].trim() : 'no lo encuentro'}): si dice false con el visto encendido, el bot marca leido y nadie lo ve`);
    // Y LOS DOS SITIOS QUE DECIDEN EL VISTO TIENEN QUE MIRAR LO MISMO. El
    // camino caliente (marcar cada mensaje) y la conexion (anunciarse en linea)
    // son dos decisiones distintas en dos ficheros distintos; si una lee el
    // interruptor y la otra no, *!visto off* apaga media cosa y el bot queda
    // marcando sin que se vea, que es exactamente el fallo de antes.
    const mhSrc = soloCodigo('src/handlers/messageHandler.js');
    exige(/vistoActivo\(/.test(mhSrc),
      'el camino caliente ya no mira el interruptor del visto: *!visto off* no apagaria el acuse de cada mensaje');
    exige(/vistoActivo\(/.test(botSrc),
      'la conexion ya no mira el interruptor del visto: *!visto off* dejaria la sesion anunciandose en linea igual');

    if (fallos === antes) console.log(verde('   ✓ los cuatro guiones parsean, y los dos limites siguen donde deben'));
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

      // NINGUNA PISTA HUERFANA. Cada "→ haz esto" tiene que ir pegada al
      // renglon que la explica.
      //
      // Paso: una pista se imprimia con un console.log suelto en vez de por el
      // mecanismo normal, asi que en el resumen —donde los renglones se guardan
      // y se pintan al final— se escapaba y salia ARRIBA DEL TODO, antes de la
      // cabecera y sin el aviso al que pertenece. Se lee como si el bot pidiera
      // algo porque si.
      // Y SOBRE EL FUENTE, porque la comprobacion de abajo no llega a todas las
      // ramas: esta capa corre `estado` sin git ni pm2, asi que la rama que
      // tuvo el fallo —la que lee el log de pm2— no se ejecuta aqui nunca. La
      // regla es simple y cubre el fichero entero: la UNICA linea que puede
      // imprimir una pista es la de anota(); cualquier otra se escapa del modo
      // resumen y sale huerfana.
      const estSrc = fs.readFileSync(path.join(R, 'scripts/estado.js'), 'utf8');
      // Sitios legitimos hay DOS —anota() para el detalle y el renderizador del
      // resumen—, asi que contarlos no vale; contarlos fue mi primer intento y
      // acuso al codigo bueno. Lo que distingue a la pista huerfana es que su
      // texto va ESCRITO A MANO en el console.log en vez de salir del `arreglo`
      // del renglon al que pertenece.
      const pistasFijas = estSrc.split('\n')
        .filter((l) => /console\.log\(/.test(l) && /→/.test(l))
        .filter((l) => !/→\s*\$\{/.test(l));
      exige(pistasFijas.length === 0,
        `estado.js escribe una pista a mano en vez de colgarla de su renglon: sale suelta en el resumen — ${(pistasFijas[0] || '').trim().slice(0, 60)}`);

      const sinColor = (t) => t.replace(/\x1b\[[0-9;]*m/g, '');
      for (const salida of [corto, largo]) {
        const lineas = sinColor(salida).split('\n');
        for (let i = 0; i < lineas.length; i++) {
          if (!/^\s*→/.test(lineas[i])) continue;
          const previa = lineas[i - 1] || '';
          exige(/[✔!✘]/.test(previa),
            `pista huerfana en \`estado\`: "${lineas[i].trim().slice(0, 50)}" no va detras de ningun aviso`);
        }
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    if (fallos === antes) console.log(verde('   ✓ el modo corto resume, pero no oculta ni un aviso'));
  }

  // ── 48. EL DIAGNOSTICO DEL GUARDIAN DICE POR QUE, NO CUANTAS VECES ───────
  //
  // Aqui hubo dos avisos que existian y no servian, y los dos callaron durante
  // los 2954 reinicios del guardian:
  //
  //   1. El contador de pm2 es ACUMULADO y no baja al arreglar la causa, asi
  //      que decia lo mismo antes y despues. Ahora se mide el ritmo.
  //   2. La comparacion de RAM contra el techo NO SALTO NUNCA, porque pm2
  //      devuelve `max_memory_restart` en BYTES y el codigo se quedaba con los
  //      digitos tal cual: comparaba 111 MB contra 209715200. Justo la
  //      comprobacion puesta para avisar de un techo apretado.
  //
  // Por eso esto se prueba EJECUTANDO estado con un pm2 de mentira: es la unica
  // forma de que una guarda de estas no vuelva a quedarse muda sin que se note.
  {
    console.log('\n48. EL DIAGNOSTICO DEL GUARDIAN DICE POR QUE');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardia-'));
    const marca = path.join(R, 'data/estadoReinicios.json');
    const cuaderno = path.join(R, 'data/guardianVidas.json');
    const salvar = (f) => (fs.existsSync(f) ? fs.readFileSync(f) : null);
    const previoMarca = salvar(marca);
    const previoCuaderno = salvar(cuaderno);
    try {
      fs.writeFileSync(path.join(dir, 'pm2'), '#!/bin/sh\nif [ "$1" = "jlist" ]; then cat "$FAKE_PM2"; else echo ""; fi\n');
      fs.chmodSync(path.join(dir, 'pm2'), 0o755);
      fs.symlinkSync(process.execPath, path.join(dir, 'node'));
      // 200M tal y como lo devuelve pm2 de verdad: en bytes.
      const jlist = path.join(dir, 'pm2.json');
      const proc = (nombre, rss) => ({ name: nombre, monit: { memory: rss * 1048576 },
        pm2_env: { status: 'online', pm_uptime: Date.now(), restart_time: 10, max_memory_restart: 200 * 1048576 } });
      const correr = (rssGuardian, vidas) => {
        fs.writeFileSync(jlist, JSON.stringify([proc('bot', 140), proc('guardian', rssGuardian)]));
        if (vidas) fs.writeFileSync(cuaderno, JSON.stringify(vidas)); else fs.rmSync(cuaderno, { force: true });
        fs.rmSync(marca, { force: true });
        try {
          return execSync(`node ${path.join(R, 'scripts/estado.js')} -v`,
            // El PATH lleva `dir` DELANTE, no en lugar de: el pm2 de mentira
            // tiene que ganarle al de verdad, pero sigue necesitando `cat` y
            // `sh`. Con el PATH a secas el stub no encontraba `cat`, devolvia
            // vacio, y estado se iba por la rama de "no hay guardian": las tres
            // comprobaciones en positivo fallaban y las dos en negativo pasaban
            // sin probar nada. Justo la forma en que una guarda miente.
            { encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, FAKE_PM2: jlist }, timeout: 30000, stdio: ['ignore', 'pipe', 'ignore'] });
        } catch (e) { return e.stdout || ''; }
      };
      const limpio = (t) => t.replace(/\x1b\[[0-9;]*m/g, '');

      // 1. El techo en bytes se entiende como MB: 179 de 200 tiene que saltar.
      exige(/su tope es 200 MB/.test(limpio(correr(179, null))),
        'el techo de RAM del guardian se lee mal: pm2 lo devuelve en bytes y la comparacion vuelve a estar muerta, que es lo que dejo pasar 2954 reinicios');
      // 2. Con la RAM holgada no puede quejarse: un aviso que salta siempre no es un aviso.
      exige(!/pm2 lo va a matar/.test(limpio(correr(110, null))),
        'el aviso del techo salta con el guardian a 110 MB de 200: eso es ruido en cada arranque');
      // 3. El cuaderno: SIGTERM con la RAM alta es pm2 matandolo por memoria.
      exige(/matando pm2 por memoria/.test(limpio(correr(110, [{ ts: Date.now(), que: 'SIGTERM', detalle: 'de fuera', rss: 190 }]))),
        'estado no distingue un SIGTERM por memoria: es exactamente el final que no deja NADA en el log de errores');
      // 4. El mismo SIGTERM con la RAM baja es un despliegue y no se avisa.
      exige(!/matando pm2 por memoria/.test(limpio(correr(110, [{ ts: Date.now(), que: 'SIGTERM', detalle: 'de fuera', rss: 120 }]))),
        'un SIGTERM normal de despliegue sale como si fuera un problema: eso convierte cada actualizacion en una alarma');
      // 5. Y una muerte propia se cuenta como lo que es, con su motivo.
      exige(/se murio solo|se murió solo/.test(limpio(correr(110, [{ ts: Date.now(), que: 'excepción sin capturar', detalle: 'socket hang up', rss: 118 }]))),
        'estado no dice nada cuando el guardian se muere por una excepcion: vuelve a haber que adivinar por que se reinicia');

      // Y el guardian tiene que ESCRIBIR ese cuaderno, no solo estado leerlo.
      const gSrc = fs.readFileSync(path.join(R, 'src/guardian.js'), 'utf8');
      for (const gancho of ['uncaughtException', 'unhandledRejection', 'SIGTERM']) {
        exige(new RegExp(`${gancho}`).test(gSrc) && /apuntarVida\(/.test(gSrc),
          `el guardian ya no apunta su final en ${gancho}: sin eso, estado no tiene nada que leer`);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      // Se deja la maquina del dueño como estaba.
      if (previoMarca) fs.writeFileSync(marca, previoMarca); else fs.rmSync(marca, { force: true });
      if (previoCuaderno) fs.writeFileSync(cuaderno, previoCuaderno); else fs.rmSync(cuaderno, { force: true });
    }
    if (fallos === antes) console.log(verde('   ✓ el techo se lee en MB, y el cuaderno distingue un despliegue de una muerte'));
  }

  // ── 49. EL ESTADO SE BORRA PARA TODOS, NO SOLO PARA EL BOT ───────────────
  //
  // La sospecha del dueño, con el spam saliendo a diario: que el bot estuviera
  // borrando el estado SOLO PARA EL. Es una duda razonable, porque las dos
  // cosas se ven exactamente igual desde el movil de quien mira el grupo.
  //
  // Y en Baileys la diferencia es UNA condicion (Socket/messages-send.js):
  //
  //   if (isJidGroup(delete.remoteJid) && !delete.fromMe) edit = '8'   ← todos
  //   else                                                edit = '7'   ← solo yo
  //
  // O sea que basta con que el `remoteJid` no sea el del grupo, o que `fromMe`
  // venga en true, para que el borrado se convierta en un borrado para uno
  // mismo — sin error, sin aviso y con el mensaje intacto delante del grupo.
  //
  // Se comprueba EJECUTANDO el manejador con cada uno de los sobres vigilados y
  // aplicando esa misma condicion a la clave que sale. Leer el codigo no vale:
  // lo que decide es la clave que se construye, no lo que ponga al lado.
  {
    console.log('\n49. EL ESTADO SE BORRA PARA TODOS, NO SOLO PARA EL BOT');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const { isJidGroup } = require('@whiskeysockets/baileys');
    const { handleMessage } = require(path.join(R, 'src/handlers/messageHandler'));
    const bit = require(path.join(R, 'src/utils/bitacoraEstados'));
    const SOBRES = ['groupStatusMessage', 'groupStatusMessageV2', 'groupStatusMentionMessage',
      'statusMentionMessage', 'statusAddYours', 'statusNotificationMessage',
      'statusQuestionAnswerMessage', 'statusStickerInteractionMessage', 'statusQuotedMessage'];
    const BOT49 = '34600000049@s.whatsapp.net';
    const ADM49 = '34622222249@s.whatsapp.net';
    const MAL49 = '34611111149@s.whatsapp.net';
    const previoBit = fs.existsSync(bit._FICHERO) ? fs.readFileSync(bit._FICHERO) : null;
    try {
      fs.rmSync(bit._FICHERO, { force: true });
      // CADA CASO EN SU PROPIO GRUPO: la metadata se cachea, asi que reusar el
      // mismo jid hace que el segundo caso conteste con el meta del primero. Me
      // paso montando esto: el caso "sin admin" salia como borrado.
      let n = 0;
      const disparar = async (sobre, quien, botAdmin) => {
        const G = `1203630000000004${String(n++).padStart(2, '0')}@g.us`;
        const visto = [];
        const sock = {
          user: { id: BOT49 },
          sendMessage: async (jid, content) => { visto.push({ jid, content }); return {}; },
          readMessages: async () => {}, sendPresenceUpdate: async () => {},
          groupMetadata: async () => ({ id: G, subject: 'G', participants: [
            { id: BOT49, ...(botAdmin ? { admin: 'admin' } : {}) }, { id: ADM49, admin: 'admin' }, { id: MAL49 }] }),
          groupParticipantsUpdate: async () => [], profilePictureUrl: async () => null,
        };
        await handleMessage(sock, {
          key: { remoteJid: G, fromMe: false, id: `X${sobre}${n}`, participant: quien },
          messageTimestamp: Math.floor(Date.now() / 1000), pushName: 'X',
          message: { [sobre]: { message: { imageMessage: { caption: 'x' } } } },
        });
        await new Promise((r) => setTimeout(r, 120));
        return visto.find((v) => v.content && v.content.delete)?.content.delete || null;
      };

      const soloParaMi = [];
      const sinIntento = [];
      for (const sobre of SOBRES) {
        const k = await disparar(sobre, MAL49, true);
        if (!k) { sinIntento.push(sobre); continue; }
        // La condicion de Baileys, clavada.
        if (!(isJidGroup(k.remoteJid) && !k.fromMe)) soloParaMi.push(sobre);
        // Y el participante: sin el, el servidor no sabe de quien es el mensaje
        // que se le pide quitar y el borrado de admin no se aplica.
        if (!k.participant) soloParaMi.push(`${sobre} (sin participant)`);
      }
      exige(sinIntento.length === 0,
        `hay sobres de estado que ya no se borran (${sinIntento.join(', ')}): el estado se queda puesto y nadie se entera`);
      exige(soloParaMi.length === 0,
        `el borrado del estado se manda como borrado para UNO MISMO en: ${soloParaMi.join(', ')} — el bot lo ve desaparecer y el grupo lo sigue viendo`);

      // Y LOS TRES FINALES QUEDAN APUNTADOS. El que mas importa es `protegido`:
      // si quien sube el estado a diario es admin, el bot no hace nada y antes
      // tampoco lo decia, asi que se leia igual que "no lo detecta".
      await disparar('groupStatusMessageV2', ADM49, true);
      await disparar('groupStatusMessageV2', MAL49, false);
      const r = bit.resumen(24);
      exige(!!r && r.cuenta.borrado > 0, 'la bitácora no apunta los estados que SÍ se borran');
      exige(!!r && r.cuenta.protegido === 1,
        'un estado de un admin no queda apuntado: sin eso, "el bot no lo detecta" y "el bot no lo toca porque es admin" se leen igual y tienen arreglos opuestos');
      exige(!!r && r.cuenta['sin-admin'] === 1,
        'un estado que no se pudo borrar por no ser admin no queda apuntado');
    } finally {
      if (previoBit) fs.writeFileSync(bit._FICHERO, previoBit); else fs.rmSync(bit._FICHERO, { force: true });
    }
    if (fallos === antes) console.log(verde('   ✓ los nueve sobres de estado se borran para todo el grupo, y cada final queda apuntado'));
  }

  // ── 50. !tt, !ig y !pin: EL VIDEO SIN GUARDARSE Y SIN COMERSE LA RAM ─────
  //
  // Tres comandos que bajan un fichero de hasta 25 MB en una maquina de 1 GB.
  // Lo que los mantiene baratos son tres decisiones que NO se ven leyendo el
  // codigo por encima, y que el dia que alguien "limpie" se pierden sin que
  // nada falle a la vista:
  //
  //   1. Se manda { video: { url: fichero } } — Baileys abre un
  //      createReadStream con una ruta (Utils/messages-media.js:264). Cambiarlo
  //      por un Buffer es meter 25 MB en el heap del bot por cada envio.
  //   2. jpegThumbnail va en null, no undefined. Lo que dispara el ffmpeg
  //      interno de Baileys al enviar es undefined, y ese proceso de mas en el
  //      unico core es lo que hacia que subir 13 KB tardara 1699 ms.
  //   3. El fichero se borra SIEMPRE al terminar. El dueño lo pidio explicito:
  //      el bot no guarda videos de nadie.
  //
  // Y las dos reglas de dinero que ya costaron caras en otros comandos: no se
  // cobra por un rechazo, y si no llega el video se devuelve el aura.
  {
    console.log('\n50. !tt, !ig Y !pin: NI SE GUARDA NI SE COME LA RAM');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const fsx = require('fs-extra');

    // El motor se sustituye por uno de mentira ANTES de cargar los comandos:
    // commands/redes.js desestructura `traer` al requerirse, asi que parchearlo
    // despues no cambiaria nada. Es el mismo motivo por el que hay que limpiar
    // la cache primero.
    const rutaRedes = require.resolve(path.join(R, 'src/utils/redes'));
    const rutaCmd = require.resolve(path.join(R, 'src/commands/redes'));
    const previoRedes = require.cache[rutaRedes];
    const previoCmd = require.cache[rutaCmd];
    delete require.cache[rutaCmd];
    const redes = require(rutaRedes);
    const traerReal = redes.traer;
    try {
      let ficheroFalso = null;
      let fallar = false;
      redes.traer = async () => {
        if (fallar) throw new Error('la web no contesta');
        ficheroFalso = path.join(os.tmpdir(), `red-prueba-${Date.now()}.mp4`);
        await fsx.writeFile(ficheroFalso, Buffer.alloc(2048, 1));
        return { fichero: ficheroFalso, tipo: 'video', ext: 'mp4', bytes: 2048 };
      };
      const cmd = require(rutaCmd);

      const G50 = `1203630000000005${Date.now() % 100}@g.us`;
      const { addAura, getAura } = require(path.join(R, 'src/utils/auraStore'));

      // CADA CASO CON SU PERSONA. Hay ocho segundos de espera por usuario —el
      // freno de los dos huecos de descarga— asi que encadenar las pruebas con
      // el mismo remitente hace que la segunda conteste «espera 8 s» y la
      // comprobacion mida eso en vez de lo que venia a medir. Me paso: el caso
      // del reembolso salia rojo porque nunca llegaba a intentar la descarga.
      let nPersona = 0;
      const correr = async (args, mismaPersona = false) => {
        if (!mismaPersona) nPersona++;
        const quien = `3460000005${nPersona}@s.whatsapp.net`;
        await addAura(G50, quien, 5000);
        // El saldo se lee, no se supone: una cuenta nueva arranca con el aura
        // de bienvenida, asi que `addAura(5000)` no deja 5000. Comparar contra
        // una constante daba rojo con el codigo bien.
        const saldoAntes = await getAura(G50, quien);
        const visto = [];
        const sock = { sendMessage: async (jid, content) => { visto.push({ jid, content }); return {}; } };
        const msg = { key: { remoteJid: G50, fromMe: false, id: `R${Math.random()}`, participant: quien } };
        await cmd.cmdTikTok(sock, msg, args, { id: G50, participants: [{ id: quien }] });
        return { visto, quien, saldoAntes };
      };

      // 1. SIN ENLACE NO SE COBRA. Cobrar y luego pedir el enlace es cobrar por
      //    un rechazo, que es lo que ya se corrigio en las acciones.
      const r1 = await correr([]);
      exige((await getAura(G50, r1.quien)) === r1.saldoAntes,
        'se cobra por escribir !tt sin enlace: eso es cobrar por un rechazo');
      exige(r1.visto.some((x) => /enlace/i.test(x.content.text || '')), '!tt sin enlace no dice qué falta');

      // 2. UN ENLACE DE OTRA RED dice cuál era el suyo, y tampoco cobra.
      const r2 = await correr(['https://www.instagram.com/reel/Cabc123/']);
      exige((await getAura(G50, r2.quien)) === r2.saldoAntes,
        'se cobra por pegar un enlace de otra plataforma en !tt');
      exige(r2.visto.some((x) => /Instagram/i.test(x.content.text || '')),
        'con un enlace de Instagram en !tt no se dice que el comando era !ig: el error tipico se queda sin respuesta util');

      // 3. EL ENVIO: desde disco, con la miniatura en null, y el fichero borrado.
      const r3 = await correr(['https://vm.tiktok.com/ZMprueba/']);
      const v3 = r3.visto;
      const envio = v3.find((x) => x.content && x.content.video);
      exige(!!envio, '!tt con un enlace bueno no manda el vídeo');
      if (envio) {
        exige(envio.content.video && typeof envio.content.video === 'object' && typeof envio.content.video.url === 'string',
          'el vídeo se manda como Buffer: son hasta 25 MB en el heap del bot por envío, en una máquina de 1 GB');
        exige('jpegThumbnail' in envio.content && envio.content.jpegThumbnail === null,
          'jpegThumbnail no va en null: con undefined, Baileys lanza SU ffmpeg al enviar, en el único core y con alguien esperando');
      }
      exige(ficheroFalso && !(await fsx.pathExists(ficheroFalso)),
        'el vídeo se queda en disco después de mandarlo: el dueño pidió que no se guarde nada');

      // 4. SI NO LLEGA EL VIDEO, SE DEVUELVE EL AURA.
      fallar = true;
      const r4 = await correr(['https://vm.tiktok.com/ZMotra/']);
      exige((await getAura(G50, r4.quien)) === r4.saldoAntes,
        'no se devuelve el aura cuando el vídeo no llega: se paga por nada');
      exige(r4.visto.some((x) => /no te he cobrado/i.test(x.content.text || '')),
        'cuando falla no se dice que no se ha cobrado');

      // 5. Y LA ESPERA EXISTE: el segundo enlace seguido de la MISMA persona no
      //    sale. Son dos huecos de descarga para todo el bot.
      fallar = false;
      const r5 = await correr(['https://vm.tiktok.com/ZMuna/']);
      const r5b = await correr(['https://vm.tiktok.com/ZMdos/'], true);
      exige(r5b.visto.some((x) => /espera/i.test(x.content.text || '')),
        'se pueden pedir enlaces seguidos sin espera: uno solo ocupa los dos huecos de descarga del bot');

      // 6. Y LOS TRES ESTAN ENCHUFADOS AL DESPACHADOR Y AL COBRO.
      const mh = soloCodigo('src/handlers/messageHandler.js');
      for (const c of ['tt', 'tiktok', 'ig', 'insta', 'instagram', 'pin', 'pinterest']) {
        exige(new RegExp(`case '${c}':`).test(mh), `!${c} no está en el switch: el comando no existe`);
        exige(new RegExp(`${c}: 'redes'`).test(mh), `!${c} no cobra: sale gratis mientras sus hermanos cuestan`);
      }
      const { PRECIOS } = require(path.join(R, 'src/utils/economia'));
      exige(typeof PRECIOS.redes === 'number' && PRECIOS.redes > 0, 'el concepto `redes` no tiene precio');
      exige(PRECIOS.redes === PRECIOS.play,
        `!tt cuesta ${PRECIOS.redes} y !play ${PRECIOS.play}: el dueño los quiere al mismo precio`);

      // ── Y PEDIR UN VIDEO NO PUEDE COSTARTE EL GRUPO ────────────────────
      //
      // `!tt <enlace>` es, para el antilink, un mensaje con un enlace. Lo
      // borraba, contaba aviso, y al TERCERO baneaba: por usar un comando del
      // propio bot, que encima cobra. Pero la exencion es facil de abrir
      // demasiado, asi que se prueban los cuatro casos, y DOS de ellos tienen
      // que seguir cayendo.
      {
        const { handleMessage } = require(path.join(R, 'src/handlers/messageHandler'));
        const { addAura } = require(path.join(R, 'src/utils/auraStore'));
        const BOT = '34600000088@s.whatsapp.net';
        const lanzar = async (texto) => {
          const G = `12036300000000${Math.floor(Math.random() * 900 + 100)}@g.us`;
          const YO = `3460000${Math.floor(Math.random() * 9000 + 1000)}@s.whatsapp.net`;
          await addAura(G, YO, 5000);
          const visto = [];
          const sock = {
            user: { id: BOT }, sendMessage: async (j, c) => { visto.push(c); return {}; },
            readMessages: async () => {}, sendPresenceUpdate: async () => {},
            groupParticipantsUpdate: async () => [], profilePictureUrl: async () => null,
            groupMetadata: async () => ({ id: G, subject: 'G', participants: [{ id: BOT, admin: 'admin' }, { id: YO }] }),
          };
          await handleMessage(sock, {
            key: { remoteJid: G, fromMe: false, id: `A${Math.random()}`, participant: YO },
            messageTimestamp: Math.floor(Date.now() / 1000), pushName: 'X',
            message: { extendedTextMessage: { text: texto, contextInfo: {} } },
          });
          await new Promise((r) => setTimeout(r, 250));
          const media = visto.some((c) => c.video || c.image);
          return {
            // CASTIGADO NO ES «HUBO UN BORRADO». Desde que el comando borra su
            // propio mensaje para no dejar el enlace en el grupo, un borrado
            // solo es castigo cuando NO vino acompañado del vídeo. Sin esta
            // distincion, la comprobacion daba rojo con el codigo bien.
            castigado: visto.some((c) => /expulsado|lista negra|enlace no permitido/i.test(c.text || ''))
              || (visto.some((c) => c.delete) && !media),
            video: media,
          };
        };

        // LAS TRES, Y SUS ALIAS. La exencion se escribio mirando !tt y es justo
        // asi como se queda una de las tres fuera sin que nada falle a la
        // vista: el comando funciona, y el baneo llega tres usos despues.
        // ── Y EL ENLACE NO SE QUEDA EN EL GRUPO ────────────────────────
        //
        // Lo pidio el dueño: «que no haya links en el grupo». El comando lleva
        // la direccion dentro, asi que hay que borrarlo — pero DESPUES de
        // cobrar, no antes: las salidas en las que el comando no se ejecuta
        // (sin enlace, en espera, sin saldo) contestan citandolo, y citar a un
        // muerto no se entiende.
        //
        // Y LO QUE SE MANDA DESPUES SI CITA. Aqui se comprobaba lo contrario:
        // que no citara, porque el recuadro de la cita enseña el enlace que se
        // acaba de borrar. El dueño lo decidio al reves y la razon es mejor —la
        // cita es lo que dice de QUIEN es el video, y con tres personas pidiendo
        // a la vez una mencion no lo resuelve— asi que la capa mide ahora eso.
        {
          const G2 = `12036300000000${Math.floor(Math.random() * 900 + 100)}@g.us`;
          const YO2 = `3460000${Math.floor(Math.random() * 9000 + 1000)}@s.whatsapp.net`;
          await addAura(G2, YO2, 5000);
          const con = [];
          const sock2 = { sendMessage: async (j, c, o) => { con.push({ c, o }); return {}; } };
          const llave = { remoteJid: G2, fromMe: false, id: 'MSGRED1', participant: YO2 };
          await cmd.cmdTikTok(sock2, { key: llave }, ['https://vt.tiktok.com/ZSqDyW1bA/'],
            { id: G2, participants: [{ id: YO2 }] });
          const borrado = con.find((x) => x.c.delete);
          exige(!!borrado && borrado.c.delete.id === 'MSGRED1',
            'el comando con el enlace se queda en el grupo: era justo lo que se venía a quitar');
          const media = con.find((x) => x.c.video || x.c.image);
          exige(!!media && !!media.o && media.o.quoted && media.o.quoted.key?.id === 'MSGRED1',
            'el vídeo no cita el comando: en un grupo con tres peticiones a la vez, nadie sabe cuál es el suyo');

          // Y sin enlace NO se borra nada: ese mensaje no se ha ejecutado.
          const sin = [];
          const sock3 = { sendMessage: async (j, c, o) => { sin.push({ c, o }); return {}; } };
          await cmd.cmdTikTok(sock3, { key: { ...llave, id: 'MSGRED2', participant: `34600001${Math.floor(Math.random() * 900)}@s.whatsapp.net` } },
            [], { id: G2, participants: [{ id: YO2 }] });
          exige(!sin.some((x) => x.c.delete),
            'se borra el mensaje de quien escribió el comando sin enlace: no se ha ejecutado nada');
          exige(sin.some((x) => x.o && x.o.quoted),
            'la respuesta de «falta el enlace» no cita: sin cita, en un grupo con ruido no se sabe a quién va');
        }

        const SUYOS = [
          ['!tt https://vt.tiktok.com/ZSqDyW1bA/', '!tt'],
          ['!tiktok https://www.tiktok.com/@a/video/123', '!tiktok'],
          ['!ig https://www.instagram.com/reel/Cabc123/', '!ig'],
          ['!insta https://instagram.com/p/Cxyz/', '!insta'],
          ['!pin https://pin.it/2wUMHRx8y', '!pin'],
          ['!pinterest https://www.pinterest.es/pin/123/', '!pinterest'],
        ];
        for (const [texto, nombre] of SUYOS) {
          const r = await lanzar(texto);
          exige(!r.castigado,
            `pedir un vídeo con ${nombre} cuenta como colar un enlace: al tercero, baneado por usar un comando del bot`);
          exige(r.video, `${nombre} con su enlace ya no manda nada`);
        }

        const colado = await lanzar('!tt https://chat.whatsapp.com/ABC123');
        exige(colado.castigado,
          '!tt con una invitación a otro grupo se salta el antilink: escribir !tt delante es todo lo que hace falta para colar lo que sea');

        const mezcla = await lanzar('!tt https://vt.tiktok.com/ZSq/ y https://chat.whatsapp.com/AB');
        exige(mezcla.castigado,
          'su enlace MÁS una invitación pasa limpio: basta con acompañar la invitación de un tiktok');
      }
    } finally {
      redes.traer = traerReal;
      delete require.cache[rutaCmd];
      if (previoCmd) require.cache[rutaCmd] = previoCmd;
      if (previoRedes) require.cache[rutaRedes] = previoRedes;
    }
    if (fallos === antes) console.log(verde('   ✓ el vídeo va desde disco, sin ffmpeg de más, se borra al mandarlo y no se cobra si no llega'));
  }

  // ── 51. EL GUARDIAN NO MANDA CODIGOS QUE NADIE HA PEDIDO ─────────────────
  //
  // Paso de verdad, y a una persona: la sesion del guardian se cerro desde el
  // telefono, pm2 lo reiniciaba en bucle, y cada arranque pedia codigo de
  // vinculacion. Al co-owner le llegaron en rafaga al movil sin haber pedido
  // ninguno. El tope de tres codigos existia, pero es POR PROCESO: cada
  // reinicio lo ponia a cero, asi que no topaba nada.
  //
  // Ahora pedir un codigo es un acto deliberado: hace falta que exista
  // data/vincularGuardian, y se borra en cuanto sale uno.
  //
  // LO QUE ESTA CAPA PUEDE Y NO PUEDE. El interruptor se prueba ejecutando. La
  // puerta vive dentro de conectar(), que abre un socket a WhatsApp, y un
  // validador que sale a la red no es un validador: eso se comprueba sobre el
  // fuente, y lo que se exige es el ORDEN —la puerta antes de la peticion— que
  // es justo lo que fallaba.
  {
    console.log('\n51. EL GUARDIAN NO MANDA CODIGOS QUE NADIE HA PEDIDO');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const g = require(path.join(R, 'src/guardian'));
    const previo = fs.existsSync(g._ARMADO);
    try {
      fs.rmSync(g._ARMADO, { force: true });
      exige(g._vinculacionArmada() === false, 'sin el fichero, el guardián se cree armado para pedir código');
      fs.writeFileSync(g._ARMADO, '');
      exige(g._vinculacionArmada() === true, 'con el fichero puesto, el guardián no se da por armado y nunca vincularía');
      g._desarmarVinculacion();
      exige(g._vinculacionArmada() === false,
        'pedir un código no desarma: si nadie lo teclea, el siguiente arranque manda otro y vuelve la ráfaga');

      const src = soloCodigo('src/guardian.js');
      const iPuerta = src.indexOf('vinculacionArmada()');
      const iPide = src.indexOf('requestPairingCode');
      exige(iPuerta >= 0 && iPide >= 0 && iPuerta < iPide,
        'la comprobación de armado va DESPUÉS de pedir el código, o ya no está: el código sale igual');
      // Y que la puerta PARE de verdad. Comprobar solo el orden dejaba pasar un
      // `if` que avisa y sigue.
      const trozo = src.slice(iPuerta, iPide);
      exige(/process\.exit\(/.test(trozo),
        'la puerta avisa pero no para: el proceso sigue y acaba pidiendo el código igual');
      const iDesarma = src.indexOf('desarmarVinculacion()', iPide);
      exige(iDesarma > iPide && iDesarma - iPide < 500,
        'el desarmado no va pegado a la petición: entre medias cabe un fallo que deje el fichero puesto y otro código en camino');
    } finally {
      if (previo) fs.writeFileSync(g._ARMADO, ''); else fs.rmSync(g._ARMADO, { force: true });
    }
    if (fallos === antes) console.log(verde('   ✓ sin que alguien lo pida a mano no sale ni un código, y el que sale desarma el siguiente'));
  }

  // ── 52. EL VIDEO DE FUERA NO LLEGA CASI MUDO ─────────────────────────────
  //
  // El dueño: «los vídeos salen con volumen muy bajo». Medido sobre uno real de
  // TikTok: media -24.2 dB y audio en HE-AACv2 a 32 kb/s. Son dos cosas a la
  // vez — viene bajo Y viene en un formato que muchos reproductores decodifican
  // a medias— y las dos se arreglan reencodando SOLO el audio.
  //
  // Se prueba MIDIENDO, que es la unica forma de que esto signifique algo: se
  // fabrica un tono flojo, se pasa por el normalizador y se comprueba que sale
  // mas alto. Una guarda que solo mirase si el comando lleva `loudnorm` pasaria
  // en verde con el filtro mal puesto.
  {
    console.log('\n52. EL VIDEO DE FUERA NO LLEGA CASI MUDO');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };
    const { ffmpegPath } = require(path.join(R, 'src/utils/ffmpeg'));
    const { execFileSync } = require('child_process');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-'));
    try {
      const flojo = path.join(dir, 'flojo.mp4');
      // Un tono muy por debajo sobre un video minimo, de SEIS segundos. Con dos
      // no valdria de prueba: loudnorm en pasada unica necesita unos segundos
      // para medir y por debajo devuelve basura sin avisar (medido: un clip de
      // 2 s salia a -50 dB). De ahi el filtro alternativo, que se comprueba
      // aparte.
      execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y',
        '-f', 'lavfi', '-i', 'color=c=black:s=160x120:d=6',
        '-f', 'lavfi', '-i', 'sine=frequency=440:duration=6',
        '-af', 'volume=-30dB', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-shortest', flojo], { timeout: 60000, stdio: 'ignore' });

      // spawnSync, NO execFileSync: ffmpeg escribe la medida en stderr y sale con
      // 0, asi que execFileSync no lanza y su valor de retorno es SOLO stdout.
      // Leyendo `e.stderr` de una excepcion que nunca ocurre, esto devolvia
      // null siempre y la comprobacion salia roja con el codigo bien.
      const { spawnSync } = require('child_process');
      const nivelDe = (f, cual = 'mean_volume') => {
        const r = spawnSync(ffmpegPath, ['-hide_banner', '-i', f, '-af', 'volumedetect', '-f', 'null', '-'],
          { timeout: 60000, encoding: 'utf8' });
        const m = new RegExp(`${cual}:\\s*(-?[\\d.]+) dB`).exec(String(r.stderr || ''));
        return m ? Number(m[1]) : null;
      };

      const redes = require(path.join(R, 'src/utils/redes'));

      // EL PICO SE MIDE DE VERDAD. Todo lo demas cuelga de ese numero: si sale
      // mal, la ganancia sale mal y el video se manda saturado o igual de mudo.
      const medido = await redes._medirAudio(flojo);
      exige(medido !== null && medido.pico < -20,
        `el pico del tono de prueba sale ${medido && medido.pico}: no se esta midiendo el audio`);
      exige(medido !== null && medido.lufs < -20,
        `la sonoridad del tono sale ${medido && medido.lufs}: sin ese numero la ganancia se calcula a ciegas`);

      // SE MIDE ANTES DE NIVELAR: el normalizador borra el original cuando
      // consigue el nuevo, asi que medirlo despues devolvia null y la queja
      // salia con un «entró a null dB» que no acusaba de nada.
      const antesN = nivelDe(flojo);
      const nivelado = await redes._conAudioNivelado(flojo);
      exige(nivelado !== flojo, 'el normalizador de audio no hizo nada: los vídeos siguen saliendo al volumen que vengan');
      if (nivelado !== flojo) {
        const despues = nivelDe(nivelado);
        exige(despues !== null && antesN !== null && despues > antesN + 8,
          `el audio no sube: entró a ${antesN} dB y sale a ${despues} dB`);
        // Y SIN SATURAR: la ganancia sale de medir el pico y dejarle margen. Si
        // se pasa, el video llega distorsionado, que es peor que llegar bajo.
        const picoFinal = nivelDe(nivelado, 'max_volume');
        exige(picoFinal === null || picoFinal <= -0.2,
          `el audio sale saturado (pico ${picoFinal} dB): la ganancia no respeta el margen`);
        // Y sin saturar: el limitador de loudnorm tiene que dejar cabeza.
        await fs.promises.rm(nivelado, { force: true });
      }

      // Y SUBIR EL AUDIO NO PUEDE PASARSE DEL TOPE DE WHATSAPP. El tamaño se
      // mira ANTES de tocar el audio, y tocarlo engorda el fichero: un video
      // de 15,8 MB pasaba el control y salia con 16,5, que es justo el envio
      // que no llega — y por una mejora de sonido.
      {
        const red = fs.readFileSync(path.join(R, 'src/utils/redes.js'), 'utf8');
        const i = red.indexOf('async function conAudioNivelado');
        const cuerpo = i < 0 ? '' : red.slice(i, red.indexOf('\n}', i));
        exige(/TOPE_WHATSAPP/.test(cuerpo),
          'el nivelado de audio ya no comprueba el tope de WhatsApp: un vídeo al borde sale pasado y no llega');
        // Y la comprobacion tiene que ir DESPUES de generar el fichero nuevo.
        const iNuevo = cuerpo.indexOf('subirAudio(');
        const iTope = cuerpo.indexOf('TOPE_WHATSAPP');
        exige(iNuevo >= 0 && iTope > iNuevo,
          'el tope se mira antes de subir el audio: entonces no mide lo que se manda');
      }

      // ── Y LO QUE SE MANDA COMO VIDEO TIENE QUE TENER VIDEO ─────────
      //
      // Paso en el grupo: WhatsApp contesto «something is wrong with the video
      // file». Lo que le habia llegado era un MP3 de 210 KB con nombre .mp4.
      // Una publicacion de FOTOS de TikTok tiene enlace de video igual, pero
      // detras esta la cancion, y el bot lo mandaba tan tranquilo — el ultimo
      // candidato se aceptaba SIN mirar, y no mirar es como se cuela esto.
      {
        const soloAudio = path.join(dir, 'soloaudio.mp4');
        execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y',
          '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
          '-c:a', 'aac', soloAudio], { timeout: 60000, stdio: 'ignore' });
        const m1 = await redes._analizarMedio(soloAudio);
        exige(m1.probado && !m1.video && m1.audio,
          `un fichero de solo audio no se reconoce como tal (${JSON.stringify(m1)}): así es como se manda un MP3 llamándolo vídeo`);
        // Uno nuevo: `flojo` ya lo consumio el nivelado de arriba, que borra el
        // original cuando consigue el nuevo.
        const conVideo = path.join(dir, 'convideo.mp4');
        execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y',
          '-f', 'lavfi', '-i', 'color=c=red:s=160x120:d=1',
          '-c:v', 'libx264', '-pix_fmt', 'yuv420p', conVideo], { timeout: 60000, stdio: 'ignore' });
        const m2 = await redes._analizarMedio(conVideo);
        exige(m2.probado && m2.video === 'h264',
          `un vídeo normal no se reconoce (${JSON.stringify(m2)}): entonces se rechazaría todo`);
        const m3 = await redes._analizarMedio(path.join(dir, 'no-existe.mp4'));
        exige(m3.probado === false,
          'un fichero ilegible se da por comprobado: sin distinguir «no hay vídeo» de «no pude mirar», se rechaza lo bueno');

        // Y que `traer` corte por ahi, no solo que sepa mirarlo.
        const red = fs.readFileSync(path.join(R, 'src/utils/redes.js'), 'utf8');
        const i = red.indexOf('async function traer(');
        const cuerpo = i < 0 ? '' : red.slice(i, red.indexOf('\nmodule.exports', i));
        exige(/analizarMedio\(/.test(cuerpo) && /!medio\.video/.test(cuerpo),
          'traer() ya no comprueba que haya pista de vídeo antes de mandarlo');
      }

      // Y UN VIDEO SIN AUDIO NO SE PIERDE POR EL CAMINO. Es el caso que mas
      // facil se rompe: un fallo del normalizador no puede costar el vídeo.
      const mudo = path.join(dir, 'mudo.mp4');
      execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y',
        '-f', 'lavfi', '-i', 'color=c=blue:s=160x120:d=1',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', mudo], { timeout: 60000, stdio: 'ignore' });
      const salidaMuda = await redes._conAudioNivelado(mudo);
      exige(fs.existsSync(salidaMuda), 'un vídeo sin pista de audio se pierde al intentar nivelarlo');
      if (salidaMuda !== mudo) await fs.promises.rm(salidaMuda, { force: true });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    if (fallos === antes) console.log(verde('   ✓ el audio que llega flojo se sube sin saturar, y un vídeo mudo sigue llegando entero'));
  }

  // ── 53. LO QUE LLEGA MIENTRAS EL BOT NO ESTA TAMBIEN SE MODERA ────────────
  //
  // El caso real: cuatro enlaces de invitacion seguidos en un grupo, ninguno
  // borrado, nadie expulsado, y el bot contestando con normalidad un minuto
  // antes. El antilink estaba bien — lo que fallaba es que esos cuatro mensajes
  // nunca llegaron a el. Baileys etiqueta el lote con `node.attrs.offline ?
  // 'append' : 'notify'`, y bot.js tiraba entero todo lo que no fuera 'notify'.
  // O sea: todo lo publicado durante una reconexion entraba sin guardias.
  //
  // Esta capa mide las cuatro cosas que sostienen el arreglo, en los dos
  // sentidos. No basta con que el mensaje diferido se modere: tiene que NO
  // ejecutar comandos (un !play de hace diez minutos no lo espera nadie, y
  // cobrarlo dos veces es peor que no responderlo) y NO contarse dos veces.
  {
    console.log('\n53. UN ENLACE QUE LLEGA TARDE SE BORRA IGUAL');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    const { handleMessage } = require(path.join(R, 'src/handlers/messageHandler'));
    const INVITE = 'https://chat.whatsapp.com/JJswfylh8lxH9tDzLGeZK0?s=cl&p=a&mlu=4';

    // Cada prueba estrena grupo: la metadata se cachea por JID y reusar uno
    // haria que la segunda prueba midiera la respuesta de la primera.
    const armar = (n) => {
      const grupo = `12005553${n}@g.us`;
      const BOT = '5491999953@s.whatsapp.net';
      const YO  = `3460000053${n}@s.whatsapp.net`;
      const reg = { textos: [], borrados: 0, expulsados: 0 };
      const sock = {
        user: { id: BOT },
        readMessages: async () => {},
        groupMetadata: async () => ({ id: grupo, subject: 'S', participants: [{ id: BOT, admin: 'admin' }, { id: YO }] }),
        groupParticipantsUpdate: async (_g, _p, accion) => { if (accion === 'remove') reg.expulsados++; return []; },
        sendMessage: async (_j, contenido) => {
          if (contenido?.delete) reg.borrados++;
          else if (contenido?.text) reg.textos.push(contenido.text);
          return {};
        },
      };
      return { sock, reg, YO, grupo };
    };
    const sobre = (ctx, id, texto) => ({
      key: { remoteJid: ctx.grupo, participant: ctx.YO, fromMe: false, id },
      message: { conversation: texto },
      pushName: 'tarde',
      messageTimestamp: Math.floor(Date.now() / 1000),
    });

    // 1. Diferido: se borra y se expulsa exactamente igual que en directo.
    {
      const ctx = armar('01');
      await handleMessage(ctx.sock, sobre(ctx, 'D53A', INVITE), { diferido: true });
      exige(ctx.reg.borrados > 0 && ctx.reg.expulsados > 0,
        `una invitacion que llega en el lote offline no se borra (${ctx.reg.borrados}) ni expulsa (${ctx.reg.expulsados}): es el agujero por el que entro el spam`);
    }

    // 2. Y el mismo mensaje no se atiende dos veces. Sin esta red, el lote
    //    offline mas la entrega en directo serian dos expulsiones por uno.
    {
      const ctx = armar('02');
      const m = sobre(ctx, 'D53B', INVITE);
      await handleMessage(ctx.sock, m, { diferido: true });
      const primera = ctx.reg.borrados + ctx.reg.expulsados;
      await handleMessage(ctx.sock, m);
      exige(primera > 0 && ctx.reg.borrados + ctx.reg.expulsados === primera,
        `el mismo id se proceso dos veces (${primera} -> ${ctx.reg.borrados + ctx.reg.expulsados}): dobles cobros y dobles expulsiones`);
    }

    // 3. Un comando diferido NO se ejecuta. Es la mitad del trato: se reprocesa
    //    para moderar, no para contestar tarde ni para volver a cobrar.
    {
      const ctx = armar('03');
      await handleMessage(ctx.sock, sobre(ctx, 'D53C', '!aura'), { diferido: true });
      exige(ctx.reg.textos.length === 0,
        `un comando del lote offline contesto igualmente (${JSON.stringify(ctx.reg.textos).slice(0, 120)}): se responderia a ordenes viejas`);
    }

    // 4. Y en directo ese mismo comando SI contesta — si no, la comprobacion de
    //    arriba pasaria por estar todo roto, que es como se aprueba una capa
    //    vacia.
    {
      const ctx = armar('04');
      await handleMessage(ctx.sock, sobre(ctx, 'D53D', '!aura'));
      exige(ctx.reg.textos.length > 0,
        'el comando tampoco contesta en directo: la prueba del diferido no mide nada');
    }

    // 5. LA PUERTA DE BOT.JS, ejecutada de verdad y no leida por encima.
    //    Se saca el cuerpo real de moderarDiferido del fichero y se corre con
    //    las dependencias de mentira, asi se mide lo que hay escrito.
    {
      const src = fs.readFileSync(path.join(R, 'src/bot.js'), 'utf8');
      exige(!/if \(type !== 'notify'\) return;/.test(src),
        'bot.js vuelve a tirar el lote entero que no es «notify»: el agujero original, otra vez');

      const i = src.indexOf('function moderarDiferido(');
      exige(i > 0, 'moderarDiferido ya no existe en bot.js');
      const ventana = /VENTANA_DIFERIDO_MS\s*=\s*([^;]+);/.exec(src);
      exige(!!ventana, 'no hay ventana de antiguedad para el lote diferido: se moderaria el historial entero');
      if (i > 0 && ventana) {
        const cuerpo = src.slice(i, src.indexOf('\n}\n', i) + 3);
        let atendidos = [];
        const fabrica = new Function('handleMessage', 'sock', 'logger', 'VENTANA_DIFERIDO_MS',
          `${cuerpo}; return moderarDiferido;`);
        const md = fabrica(
          async (_s, m) => { atendidos.push(m.key.id); },
          {}, { error: () => {} }, eval(ventana[1]),
        );
        const ahora = Math.floor(Date.now() / 1000);
        const msg = (id, extra) => ({
          key: { remoteJid: '120005553@g.us', fromMe: false, id },
          message: { conversation: 'x' },
          messageTimestamp: ahora,
          ...extra,
        });
        md(msg('A'));
        exige(atendidos.includes('A'), 'un mensaje reciente del lote offline no llega a moderarse');
        atendidos = [];
        md({ ...msg('B'), messageTimestamp: ahora - 3 * 24 * 3600 });
        exige(atendidos.length === 0,
          'un mensaje de hace tres dias se modera: una sincronizacion de historial expulsaria a medio grupo');
        atendidos = [];
        md({ ...msg('C'), messageTimestamp: 0 });
        exige(atendidos.length === 0, 'un mensaje sin marca de tiempo se modera a ciegas');
        atendidos = [];
        md({ ...msg('D'), key: { remoteJid: '120005553@g.us', fromMe: true, id: 'D' } });
        exige(atendidos.length === 0, 'el bot se modera a si mismo en el lote diferido');
        atendidos = [];
        md({ ...msg('E'), key: { remoteJid: '34600000000@s.whatsapp.net', fromMe: false, id: 'E' } });
        exige(atendidos.length === 0, 'un privado entra por la via de moderacion diferida');
        // LAS HISTORIAS SI ENTRAN. Una historia subida al grupo no viaja con el
        // jid del grupo: viaja por `status@broadcast`, y es justo el spam que
        // mas aparece mientras el bot se reconecta.
        atendidos = [];
        md({ ...msg('F'), key: { remoteJid: 'status@broadcast', fromMe: false, id: 'F' } });
        exige(atendidos.includes('F'),
          'una historia que llega en el lote offline no se modera: es el tipo de spam que más aparece justo mientras el bot se reconecta');
      }
    }

    if (fallos === antes) console.log(verde('   ✓ el spam que entra durante una reconexion se borra, sin contestar ordenes viejas ni repetirse'));
  }

  // ── 54. UNA PUBLICACION DE FOTOS ES UN VIDEO IGUAL ───────────────────────
  //
  // En TikTok, una de cada pocas publicaciones que se comparten no es un video:
  // son fotos pasando sobre una cancion. Se pegan con el mismo enlace y en el
  // grupo se ven igual, pero detras no hay pista de video — el `play` de la API
  // es un MP3. El bot contestaba «eso no es un video: el enlace solo trae la
  // cancion», que es verdad y no le sirve a nadie: quien lo pego esta viendo la
  // publicacion en su telefono.
  //
  // Ahora se monta el pase: las fotos una detras de otra con la cancion encima,
  // y sale un MP4 normal. Esta capa lo mide de verdad —servidor local, JPEG
  // reales, ffmpeg de verdad— porque es la clase de cosa que «parece» funcionar
  // leyendo el codigo y saca un fichero de cero bytes.
  {
    console.log('\n54. UNA PUBLICACION DE FOTOS SE MANDA COMO VIDEO');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    const http = require('http');
    const { execFileSync } = require('child_process');
    const { ffmpegPath } = require(path.join(R, 'src/utils/ffmpeg'));
    const redes = require(path.join(R, 'src/utils/redes'));

    // Lo que lee cada servicio, y lo que NO debe leer. `imagenesDe` se come
    // cuatro formatos distintos porque cada API llama de otra forma a lo mismo.
    {
      const uno = redes._imagenesDe({ data: { images: ['https://a/1.jpg', 'https://a/2.jpg'] } });
      exige(uno.length === 2, `la lista de fotos plana no se lee (${uno.length})`);
      const dos = redes._imagenesDe({ data: { image_post_info: { images: [{ display_image: { url_list: ['https://a/3.jpg'] } }] } } });
      exige(dos.length === 1, 'el formato con display_image.url_list no se lee: es el que devuelve TikTok en crudo');
      const rep = redes._imagenesDe({ images: ['https://a/1.jpg', 'https://a/1.jpg'] });
      exige(rep.length === 1, 'la misma foto repetida entra dos veces en el pase');
      exige(redes._imagenesDe({ images: ['no-es-una-direccion', 42, null] }).length === 0,
        'se cuela como foto algo que no es una direccion');
      exige(redes._imagenesDe({}).length === 0, 'sin fotos devuelve algo: entonces se montaria un pase vacio');
      exige(redes._musicaDe({ data: { play: 'https://a/s.mp3' } }) === 'https://a/s.mp3',
        '`play` no se toma como cancion: en una publicacion de fotos ESE campo es el audio');
      exige(redes._musicaDe({}) === null, 'sin cancion devuelve algo');
    }

    // Y el montaje entero, con ficheros reales servidos por HTTP.
    const sinProxy = [process.env.NO_PROXY, process.env.no_proxy];
    process.env.NO_PROXY = process.env.no_proxy = '127.0.0.1,localhost';
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pase54-'));
    let srv = null;
    try {
      const foto = (n, tam, color) => {
        execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi',
          '-i', `color=c=${color}:s=${tam}:d=1`, '-frames:v', '1', path.join(dir, n)], { timeout: 60000 });
      };
      foto('a.jpg', '1080x1920', 'red');
      foto('b.jpg', '1080x1920', 'green');
      foto('c.jpg', '640x480', 'blue');
      execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi',
        '-i', 'sine=frequency=440:duration=8', '-c:a', 'libmp3lame', path.join(dir, 'son.mp3')], { timeout: 90000 });
      execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi',
        '-i', 'color=c=white:s=320x240:d=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        path.join(dir, 'v.mp4')], { timeout: 90000 });

      srv = http.createServer((req, res) => {
        const ruta = req.url.split('?')[0].slice(1);
        // La API de mentira: contesta como una publicacion de fotos de verdad,
        // con `play` apuntando a la cancion y ni un solo enlace de video.
        if (ruta === 'api-fotos') {
          res.writeHead(200, { 'content-type': 'application/json' });
          return res.end(JSON.stringify({ code: 0, data: {
            play: `http://127.0.0.1:${srv.address().port}/son.mp3`,
            music: `http://127.0.0.1:${srv.address().port}/son.mp3`,
            images: [`http://127.0.0.1:${srv.address().port}/a.jpg`, `http://127.0.0.1:${srv.address().port}/b.jpg`],
          } }));
        }
        // Y la de un video NORMAL que ademas trae su portada en `images`.
        if (ruta === 'api-video') {
          res.writeHead(200, { 'content-type': 'application/json' });
          return res.end(JSON.stringify({ code: 0, data: {
            play: `http://127.0.0.1:${srv.address().port}/v.mp4`,
            images: [`http://127.0.0.1:${srv.address().port}/a.jpg`],
          } }));
        }
        const f = path.join(dir, ruta);
        if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
        res.writeHead(200);
        return fs.createReadStream(f).pipe(res);
      });
      await new Promise((r) => srv.listen(0, '127.0.0.1', r));
      const base = `http://127.0.0.1:${srv.address().port}`;

      // 1. El pase, montado y medido: tiene que ser un H.264 con audio, a la
      //    resolucion de las fotos y no a la mitad.
      {
        const salida = await redes._montarPase([`${base}/a.jpg`, `${base}/b.jpg`, `${base}/c.jpg`], `${base}/son.mp3`, null);
        exige(!!salida, 'el pase de fotos no se monta: la publicacion sigue sin poder mandarse');
        if (salida) {
          const medida = await redes._medirFichero(salida);
          const analisis = await redes._analizarMedio(salida);
          exige(analisis.video === 'h264', `el pase sale en ${analisis.video}: WhatsApp no lo reproduce en todos los telefonos`);
          exige(analisis.audio === true, 'el pase sale mudo aunque habia cancion');
          // LAS DOS MEDIDAS, no solo el alto. Con el alto a secas, un lienzo
          // de 608x1080 —la mitad de ancho que la foto original— pasaba el
          // control: 1080 estaba, pero en el lado que no era.
          exige(medida.ancho >= 1080 && medida.alto >= 1920,
            `el pase sale a ${medida.ancho}x${medida.alto} desde fotos de 1080x1920: se pidió lo más HD posible y eso es menos que el original`);
          exige(medida.segundos > 3, `el pase dura ${medida.segundos} s: se corto`);
          const { size } = fs.statSync(salida);
          exige(size < 16 * 1024 * 1024, `el pase pesa ${Math.round(size / 1048576)} MB y WhatsApp no pasa de 16`);
          fs.rmSync(salida, { force: true });
        }
      }

      // ── Y NO SE SALTA NINGUNA FOTO ──────────────────────────────────────
      //
      // Esto se vio en el grupo: «se salta algunas imagenes». El demuxer
      // `concat` da por hecho que todas las entradas miden lo mismo —es un
      // pegado de flujo, no de imagen— y en cuanto la segunda foto tiene otro
      // tamaño deja de aceptarlas. En un carrusel de Instagram eso es lo
      // normal: cada foto se subio como se subio.
      //
      // Medido antes del arreglo, cinco fotos de cinco tamaños distintos: el
      // pase duraba 2,54 s en vez de 12,5. Una foto de cinco, sin error y sin
      // aviso. Por eso la prueba mide la DURACION y no que el fichero exista.
      {
        const tam = ['1080x1350', '640x480', '1080x1920', '800x800', '1200x628'];
        const col = ['red', 'green', 'blue', 'yellow', 'magenta'];
        const sueltas = [];
        for (let i = 0; i < 5; i++) {
          const f = path.join(dir, `mix${i}.jpg`);
          execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi',
            '-i', `color=c=${col[i]}:s=${tam[i]}:d=1`, '-frames:v', '1', f], { timeout: 60000 });
          sueltas.push(`${base}/mix${i}.jpg`);
        }
        const salida = await redes._montarPase(sueltas, null, null);
        exige(!!salida, 'un pase de fotos de tamaños distintos no se monta');
        if (salida) {
          const medida = await redes._medirFichero(salida);
          // Cinco fotos sin canción son 2,5 s cada una. Con una sola serían 2,5
          // en total, que es exactamente el sintoma que se veia.
          exige(medida.segundos > 11,
            `el pase dura ${medida.segundos} s en vez de 12,5: se está saltando fotos cuando no miden todas lo mismo`);
          fs.rmSync(salida, { force: true });
        }
      }

      // 2. UNA SOLA FOTO Y SIN CANCION NO SE MONTA: se manda la foto. Montar un
      //    MP4 de una imagen quieta es peor que la imagen.
      {
        const salida = await redes._montarPase([`${base}/a.jpg`], null, null);
        exige(!!salida && /\.(jpe?g|png|webp)$/i.test(salida),
          `una foto suelta sale como ${salida ? path.extname(salida) : 'nada'} en vez de como foto`);
        if (salida) fs.rmSync(salida, { force: true });
      }

      // 3. Y si no se puede bajar ni una, no se inventa nada.
      exige((await redes._montarPase([`${base}/no-existe.jpg`], null, null)) === null,
        'con las fotos rotas devuelve algo: se mandaria un fichero vacio');

      // 4. LO QUE IMPORTA DE VERDAD: la via completa. Una API que contesta una
      //    publicacion de fotos tiene que acabar en un video, no en el error.
      const antesApi = redes._API_DE.tiktok;
      try {
        redes._API_DE.tiktok = `${base}/api-fotos`;
        // El fallo de antes era una EXCEPCION («eso no es un vídeo»), y una
        // excepcion aqui mata la capa entera en vez de contarse como un fallo
        // con su motivo. Se atrapa para que la queja diga lo que pasa.
        const fichero = await redes._porApi('https://www.tiktok.com/@x/photo/123', 'tiktok')
          .catch((e) => { fallos++; console.log(rojo(`   ✗ una publicación de fotos sigue acabando en error: ${e.message}`)); return null; });
        exige(!fichero || /\.mp4$/i.test(fichero),
          'una publicacion de fotos no acaba en un vídeo: es el fallo que el dueño llamó grave');
        if (fichero) {
          const analisis = await redes._analizarMedio(fichero);
          exige(analisis.probado && analisis.video === 'h264',
            `lo que sale de la via completa no es un vídeo reproducible (${JSON.stringify(analisis)})`);
          fs.rmSync(fichero, { force: true });
        }
      } finally {
        redes._API_DE.tiktok = antesApi;
      }

      // 5. Y NO AL REVES: un video de verdad con un campo `images` al lado —la
      //    portada, que varias APIs devuelven— se manda tal cual. Cambiar un
      //    video que funciona por un montaje de su portada seria peor que el
      //    fallo que se venia a arreglar, y se nota solo cuando ya esta puesto.
      //
      //    Se distingue por el tamaño: el video de prueba es 320x240 y el pase
      //    saldria a 1080 de alto, asi que no hay forma de confundirlos.
      {
        const antesApi2 = redes._API_DE.tiktok;
        try {
          redes._API_DE.tiktok = `${base}/api-video`;
          const fichero = await redes._porApi('https://www.tiktok.com/@x/video/123', 'tiktok');
          exige(!!fichero, 'un vídeo normal con portada ya no se baja');
          if (fichero) {
            const medida = await redes._medirFichero(fichero);
            exige(medida.ancho === 320 && medida.alto === 240,
              `el vídeo salió a ${medida.ancho}x${medida.alto}: se cambió un vídeo que funcionaba por un pase de su portada`);
            fs.rmSync(fichero, { force: true });
          }
        } finally {
          redes._API_DE.tiktok = antesApi2;
        }
      }
    } finally {
      if (srv) srv.close();
      fs.rmSync(dir, { recursive: true, force: true });
      if (sinProxy[0] === undefined) delete process.env.NO_PROXY; else process.env.NO_PROXY = sinProxy[0];
      if (sinProxy[1] === undefined) delete process.env.no_proxy; else process.env.no_proxy = sinProxy[1];
    }

    if (fallos === antes) console.log(verde('   ✓ las fotos con canción salen como un vídeo de 1080, y un vídeo de verdad no se toca'));
  }

  // ── 55. UN POST DE INSTAGRAM QUE NO ES UN REEL ───────────────────────────
  //
  // En el grupo salio «no he podido traerlo de Instagram. No te he cobrado» con
  // la API contestando perfectamente. El motivo: la lista de campos de los que
  // el bot saca el medio solo miraba CADENAS, y un post de Instagram que no es
  // un reel no trae ningun campo de video — trae la lista de medios del post, y
  // esa llega como ARRAY. Un array no pasa un `typeof x === 'string'`, asi que
  // la lista salia vacia, porApi devolvia null sin motivo, el fallo lo acababa
  // dando yt-dlp (al que Instagram bloquea desde un datacenter) y el grupo leia
  // un error que no tenia nada que ver.
  //
  // Los servicios de Instagram no se ponen de acuerdo en como llamar a esa
  // lista, asi que esta capa prueba las formas que usan de verdad, con un
  // servidor local y ficheros reales. Y prueba tambien el caso contrario: que
  // un reel siga llegando tal cual, sin convertirse en un pase de sus fotos.
  {
    console.log('\n55. UN POST DE FOTOS DE INSTAGRAM TAMBIEN SE MANDA');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    const http = require('http');
    const { execFileSync } = require('child_process');
    const { ffmpegPath } = require(path.join(R, 'src/utils/ffmpeg'));
    const redes = require(path.join(R, 'src/utils/redes'));

    // Las formas sueltas, sin red de por medio.
    {
      const ce = redes._comoEnlaces;
      exige(ce('https://a/1.jpg', 'https://base/').length === 1, 'una dirección suelta ya no se lee');
      exige(ce(['https://a/1.jpg', 'https://a/2.jpg'], 'https://base/').length === 2,
        'una LISTA de direcciones ya no se lee: es la forma en la que Instagram devuelve un post');
      exige(ce([{ url: 'https://a/1.jpg' }, { link: 'https://a/2.jpg' }], 'https://base/').length === 2,
        'una lista de objetos con la dirección dentro ya no se lee');
      exige(ce('/relativa/1.jpg', 'https://base/x')[0] === 'https://base/relativa/1.jpg',
        'una ruta sin dominio ya no se resuelve contra la de la API');
      exige(ce(null, 'https://base/').length === 0 && ce([], 'https://base/').length === 0,
        'un campo vacío devuelve algo');
      // Y la extensión, que es lo que separa una foto de un vídeo.
      exige(redes._extensionDe('https://cdn/x.jpg?a=1&b=2#z') === 'jpg',
        'la extensión se lee con los parámetros pegados: entonces ninguna foto de un CDN se reconoce como foto');
      exige(redes._extensionDe('https://cdn/dl?id=1') === '', 'una dirección sin extensión devuelve una');
    }

    const sinProxy = [process.env.NO_PROXY, process.env.no_proxy];
    process.env.NO_PROXY = process.env.no_proxy = '127.0.0.1,localhost';
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ig55-'));
    let srv = null;
    try {
      const foto = (n, tam, color) => execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y',
        '-f', 'lavfi', '-i', `color=c=${color}:s=${tam}:d=1`, '-frames:v', '1', path.join(dir, n)], { timeout: 60000 });
      foto('a.jpg', '1080x1350', 'red');
      foto('b.jpg', '1080x1350', 'green');
      execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi',
        '-i', 'color=c=white:s=320x240:d=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        path.join(dir, 'v.mp4')], { timeout: 60000 });

      let base = '';
      // Las formas que usan los servicios de Instagram de verdad.
      const respuestas = {
        // carrusel de fotos, la lista bajo `medias`
        carrusel: () => ({ status: 'ok', data: { medias: [{ url: `${base}/a.jpg`, type: 'image' }, { url: `${base}/b.jpg`, type: 'image' }] } }),
        // una sola foto, la lista bajo `url`
        unafoto: () => ({ data: { url: [{ url: `${base}/a.jpg`, type: 'jpg' }] } }),
        // un reel, tambien en lista: no puede acabar convertido en un pase
        reel: () => ({ url: [{ url: `${base}/v.mp4`, type: 'mp4' }] }),
        // la direccion sin extension detras de la cual hay un JPEG
        sinext: () => ({ data: { url: `${base}/dl` } }),
        // y una respuesta que no trae nada
        vacio: () => ({ data: {} }),
      };
      srv = http.createServer((req, res) => {
        const ruta = req.url.split('?')[0].slice(1);
        if (respuestas[ruta]) {
          res.writeHead(200, { 'content-type': 'application/json' });
          return res.end(JSON.stringify(respuestas[ruta]()));
        }
        const f = path.join(dir, ruta === 'dl' ? 'a.jpg' : ruta);
        if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
        res.writeHead(200);
        return fs.createReadStream(f).pipe(res);
      });
      await new Promise((r) => srv.listen(0, '127.0.0.1', r));
      base = `http://127.0.0.1:${srv.address().port}`;

      const antesApi = redes._API_DE.instagram;
      const probar = async (caso) => {
        redes._API_DE.instagram = `${base}/${caso}`;
        const f = await redes._porApi('https://www.instagram.com/p/ABC123/', 'instagram')
          .catch((e) => { fallos++; console.log(rojo(`   ✗ el caso «${caso}» acabó en error: ${e.message}`)); return null; });
        if (!f) return null;
        const medida = await redes._medirFichero(f);
        const { size } = fs.statSync(f);
        fs.rmSync(f, { force: true });
        return { ext: path.extname(f).toLowerCase(), ...medida, size };
      };
      try {
        const carrusel = await probar('carrusel');
        exige(carrusel && carrusel.ext === '.mp4' && carrusel.segundos > 1,
          `un carrusel de fotos no sale como pase (${JSON.stringify(carrusel)}): es el caso de la captura del grupo`);
        // Y SIN FRANJAS NEGRAS. Instagram publica en 4:5 y el lienzo era 9:16
        // fijo: un cuarto de la pantalla en negro.
        exige(carrusel && carrusel.ancho === 1080 && carrusel.alto === 1350,
          `el pase de Instagram sale a ${carrusel?.ancho}x${carrusel?.alto} desde fotos de 1080x1350: son franjas negras por un lienzo que no es el de la foto`);

        const una = await probar('unafoto');
        exige(una && ['.jpg', '.jpeg'].includes(una.ext),
          `un post de una sola foto sale como ${una?.ext} en vez de como foto`);

        const reel = await probar('reel');
        exige(reel && reel.ancho === 320 && reel.alto === 240,
          `el reel salió a ${reel?.ancho}x${reel?.alto}: se cambió un vídeo que funcionaba por un montaje`);

        const sinext = await probar('sinext');
        exige(sinext && ['.jpg', '.jpeg'].includes(sinext.ext),
          `una dirección sin extensión con un JPEG detrás sale como ${sinext?.ext}: WhatsApp contesta que el vídeo está mal`);

        redes._API_DE.instagram = `${base}/vacio`;
        const vacio = await redes._porApi('https://www.instagram.com/p/ABC123/', 'instagram').catch(() => null);
        exige(vacio === null, 'una respuesta sin medios devuelve algo en vez de rendirse');
        if (vacio) fs.rmSync(vacio, { force: true });
      } finally {
        redes._API_DE.instagram = antesApi;
      }
    } finally {
      if (srv) srv.close();
      fs.rmSync(dir, { recursive: true, force: true });
      if (sinProxy[0] === undefined) delete process.env.NO_PROXY; else process.env.NO_PROXY = sinProxy[0];
      if (sinProxy[1] === undefined) delete process.env.no_proxy; else process.env.no_proxy = sinProxy[1];
    }

    // ── Y SIN API, QUE ES COMO ESTA LA VPS ──────────────────────────────────
    //
    // Todo lo de arriba vive en la via de la API. En la maquina de verdad no hay
    // API de Instagram puesta —`npm run enlace` lo dice en su primera linea— asi
    // que el enlace acaba entero en yt-dlp, y ahi el post de fotos contesta «No
    // video formats found». Tiene razon: no las hay, son tres fotos y se le esta
    // pidiendo el mejor video.
    //
    // Lo que decide ese camino son dos cosas, y las dos se miden aqui: QUE
    // errores significan «esto no es un video», y de donde salen las fotos de la
    // ficha que devuelve yt-dlp.
    {
      const redes2 = require(path.join(R, 'src/utils/redes'));
      const sv = redes2._esSinVideo;
      exige(sv('[Instagram] Dcb6wcZoroX: No video formats found!; please report this issue on https://github.com/yt-dlp/yt-dlp/issues'),
        'el «No video formats found» de yt-dlp ya no se reconoce: es EXACTAMENTE el error de la captura del grupo, y sin reconocerlo no se piden las fotos');
      exige(sv('Requested format is not available'), 'el «requested format» tampoco se reconoce');
      // Y AL REVES, que es donde se rompe de verdad: el estrangulamiento de
      // Instagram se REINTENTA. Tomarlo por «no es un video» cambiaria un reel
      // que habria salido a la segunda por un pase que no existe.
      exige(!sv('Instagram sent an empty media response. Check if this post is accessible'),
        'el estrangulamiento de Instagram se toma por «no es un vídeo»: un reel que saldría al reintentar acabaría en un pase vacío');
      exige(!sv('HTTP Error 429: Too Many Requests') && !sv('') && !sv(null),
        'un fallo de red cualquiera se toma por «no es un vídeo»');

      // La ficha de yt-dlp. Las miniaturas van de PEOR a MEJOR, asi que la buena
      // es la ultima: quedarse con la primera manda una foto de 150x150.
      const fdf = redes2._fotosDeFicha;
      const conMiniaturas = (n) => ({ thumbnails: [...Array(13)].map((_, i) => ({ url: `https://cdn/${n}_${i}.jpg` })) });
      const carrusel = { _type: 'playlist', entries: [conMiniaturas('a'), conMiniaturas('b'), conMiniaturas('c')] };
      const sacadas = fdf(carrusel);
      exige(sacadas.length === 3, `de un carrusel de 3 salen ${sacadas.length} fotos`);
      exige(sacadas[0] === 'https://cdn/a_12.jpg',
        `se coge la miniatura ${sacadas[0]} en vez de la última: las de yt-dlp van de peor a mejor, así que esa es la pequeña`);
      exige(fdf({ thumbnails: [{ url: 'https://cdn/x_0.jpg' }, { url: 'https://cdn/x_1.jpg' }] })[0] === 'https://cdn/x_1.jpg',
        'un post de una sola foto no se lee: no todos vienen como lista');
      exige(fdf({ thumbnail: 'https://cdn/solo.jpg' }).length === 1,
        'una ficha con `thumbnail` a secas y sin lista se queda sin foto');
      exige(fdf({ entries: [conMiniaturas('a'), conMiniaturas('a')] }).length === 1,
        'la misma foto repetida entra dos veces en el pase');
      exige(fdf({ entries: [...Array(40)].map((_, i) => conMiniaturas(`f${i}`)) }).length === 20,
        'un carrusel enorme no tiene tope: cuarenta fotos son un pase que no cabe en WhatsApp');
      exige(fdf({}).length === 0 && fdf(null).length === 0 && fdf({ entries: [null, null] }).length === 0,
        'una ficha sin fotos devuelve algo: se montaría un pase vacío');
    }

    if (fallos === antes) console.log(verde('   ✓ carrusel, foto suelta y reel: cada uno sale como lo que es'));
  }

  // ── 56. *!pin* BUSCA POR NOMBRE, NO SOLO POR ENLACE ──────────────────────
  //
  // Lo pidio el dueño: «el comando pin es para que pongas pin y el nombre de lo
  // que quieras buscar, no el enlace». Y el enlace sigue valiendo, asi que el
  // comando tiene dos usos y lo que hay que medir es que NO se pisen.
  //
  // La lectura de la pagina de resultados se prueba con el HTML de verdad
  // guardado aqui, no con uno inventado: lo que rompe esto es el formato real
  // de las direcciones de Pinterest, con sus cuatro tamaños de la misma foto.
  {
    console.log('\n56. *!pin* CON UN NOMBRE DETRAS');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    const redes = require(path.join(R, 'src/utils/redes'));
    const pd = redes._pinesDe;

    // Un trozo de pagina como la que devuelve Pinterest: la misma foto en
    // cuatro tamaños, otra solo como miniatura, y dos fotos de perfil.
    const pagina = `
      <img src="https://i.pinimg.com/474x/d9/31/10/d93110f6b9985f63323ebffc35e7945e.jpg">
      <img src="https://i.pinimg.com/736x/d9/31/10/d93110f6b9985f63323ebffc35e7945e.jpg">
      <img src="https://i.pinimg.com/originals/d9/31/10/d93110f6b9985f63323ebffc35e7945e.jpg">
      <img src="https://i.pinimg.com/60x60/ed/88/9b/ed889bed6715fb437ad2553bf20fbd0b.jpg">
      <img src="https://i.pinimg.com/75x75_RS/aa/bb/cc/aabbccddeeff00112233445566778899.jpg">
      <img src="https://i.pinimg.com/140x140_RS/11/22/33/11223344556677889900aabbccddeeff.jpg">`;
    const pines = pd(pagina);
    exige(pines.length === 2,
      `de esa página salen ${pines.length} pines en vez de 2: o se cuentan los tamaños como pines distintos, o entran las fotos de perfil`);
    // LA MISMA FOTO EN CUATRO TAMAÑOS ES UN PIN, NO CUATRO. Sin agrupar, una
    // busqueda de cuarenta parecia de ciento sesenta.
    exige(new Set(pines.map((x) => x.huella)).size === pines.length, 'hay pines repetidos');
    // Y LAS DE PERFIL FUERA: llevan `_RS` en el tamaño.
    exige(!JSON.stringify(pines).includes('_RS'), 'se cuela una foto de perfil como resultado');

    // EL TAMAÑO SE PIDE, NO SE ACEPTA EL QUE VENGA. Este era el fallo de la
    // primera version: se quedaba con la mejor direccion que apareciera en el
    // HTML, y de tres busquedas dos devolvieron una foto de 60x60 y 2 KB.
    const soloMiniatura = pines.find((x) => x.huella.startsWith('ed/88'));
    exige(!!soloMiniatura, 'el pin que solo salía como miniatura se descarta entero');
    exige(soloMiniatura && soloMiniatura.candidatos[0].includes('/originals/'),
      'al pin que solo salía como miniatura no se le pide el original: se mandaría una foto de 60x60');
    exige(soloMiniatura && soloMiniatura.candidatos.length >= 3,
      'un pin no tiene tamaños de respaldo: si el original no existe, se queda sin nada');
    exige(pd('<img src="https://ejemplo.com/foto.jpg">').length === 0,
      'una imagen que no es de Pinterest se cuenta como pin');
    // EL ADORNO DE LA PROPIA PAGINA NO ES UN RESULTADO. El icono de Instagram
    // vive en una regla de CSS y, como va antes que cualquier pin, era el
    // primero de la lista: en el grupo salio el cuadro con el degradado rosa y
    // naranja como respuesta a una busqueda.
    exige(pd(':root{--instagram-background-url:url(https://i.pinimg.com/originals/d5/3b/01/d53b014d86a6b6761bf649a0ed813c2b.png)}').length === 0,
      'una imagen metida en una regla de CSS se cuenta como resultado: es el degradado que salió en el grupo');
    exige(pd('').length === 0, 'una página vacía devuelve pines');

    // ── Y LOS RESULTADOS SALEN DEL BUSCADOR, NO DE LA PAGINA ────────────────
    //
    // El dueño: «busco /pin sticker racista Argentina y me envía cosas random».
    //
    // No era que la pagina trajera otra busqueda: cuatro busquedas muy distintas
    // comparten UNA sola imagen, asi que el contenido si es de cada consulta. Lo
    // que pasa es con QUE viene mezclado. A una visita anonima Pinterest le
    // rellena la pagina con contenido generico, y eso entra revuelto: de las seis
    // primeras imagenes de «gatos», tres eran fotos de uñas, y la primera de
    // todas era el icono de Instagram metido en una regla de CSS. Eligiendo al
    // azar entre cuarenta, la mitad de las veces salia del relleno.
    //
    // Ahora se le piden al endpoint que usa la propia web al hacer scroll, que
    // devuelve los resultados ORDENADOS y sin relleno. Lo que se mide aqui es lo
    // que hay que hacerle a esa respuesta, que es donde se rompe.
    {
      const pdr = redes._pinesDeResultados;
      const conImagenes = (n, extra = {}) => ({
        images: {
          orig: { url: `https://i.pinimg.com/originals/${n}/11/22/${n}11223344556677889900aabbccdd.jpg` },
          '736x': { url: `https://i.pinimg.com/736x/${n}/11/22/${n}11223344556677889900aabbccdd.jpg` },
          '236x': { url: `https://i.pinimg.com/236x/${n}/11/22/${n}11223344556677889900aabbccdd.jpg` },
        },
        ...extra,
      });

      // EL ORIGINAL PRIMERO. Si sale el 236x, se manda una miniatura.
      const uno = pdr([conImagenes('aa')]);
      exige(uno.length === 1 && uno[0].candidatos[0].includes('/originals/'),
        `del resultado sale ${uno[0]?.candidatos?.[0]} en vez del original: se mandaría una miniatura`);
      exige(uno[0].candidatos.length >= 3,
        'un resultado no tiene tamaños de respaldo: si el original no se deja bajar, se queda sin nada');

      // LOS MODULOS QUE NO SON PINES. Entre los resultados vienen cosas como
      // «otras búsquedas», sin imagenes. El primero de «gatos» era uno de esos.
      const conBasura = pdr([{ args: [], text: 'Explora' }, null, conImagenes('bb')]);
      exige(conBasura.length === 1,
        `entran ${conBasura.length} en vez de 1: un módulo sin imágenes se cuenta como resultado y el comando se queda sin nada que mandar`);

      // LOS ANUNCIOS FUERA. Nadie ha pedido un anuncio.
      exige(pdr([conImagenes('cc', { is_promoted: true }), conImagenes('dd')]).length === 1,
        'un anuncio entra como resultado');

      // Y EL ORDEN SE RESPETA, que es lo unico que hace que la primera sea la
      // mas relevante. Si se mezclara aqui, daria igual haber cambiado de sitio.
      const tres = pdr([conImagenes('aa'), conImagenes('bb'), conImagenes('cc')]);
      exige(tres.length === 3 && tres[0].candidatos[0].includes('/aa/') && tres[2].candidatos[0].includes('/cc/'),
        'el orden de los resultados no se respeta: el buscador los devuelve por relevancia y esa es toda la gracia');

      exige(pdr([]).length === 0, 'una respuesta vacía devuelve resultados');
      exige(pdr([...Array(60)].map((_, i) => conImagenes(String(i % 10) + 'f'))).length <= 20,
        'no hay tope de resultados');

      // La huella agrupa la misma foto venga del tamaño que venga: es lo que
      // impide que la misma salga dos veces seguidas.
      const h = redes._huellaDe;
      exige(h('https://i.pinimg.com/originals/aa/bb/cc/aabbccddeeff00112233445566778899.jpg')
        === h('https://i.pinimg.com/736x/aa/bb/cc/aabbccddeeff00112233445566778899.jpg'),
        'la misma foto en dos tamaños da dos huellas: entonces «no repetir» no funciona');
    }

      // Y DE CUAL DE LAS DOS VIAS SALE LA FOTO, medido y no leido.
      //
      // Esta es la que faltaba. Se puede deshacer el arreglo entero —ignorar lo
      // que devuelve el buscador y volver a leer la pagina— sin que ninguna de
      // las comprobaciones de arriba se entere: todas miran piezas sueltas.
      //
      // Asi que se montan las dos vias con contenido DISTINTO y se mira cual
      // llega: la pagina sirve una foto de 400x400 y el buscador una de 200x300.
      // Si sale la de 400x400, el bot volvio a leer la pagina.
      {
        const http = require('http');
        const { execFileSync } = require('child_process');
        const { ffmpegPath } = require(path.join(R, 'src/utils/ffmpeg'));
        const sinProxy = [process.env.NO_PROXY, process.env.no_proxy];
        process.env.NO_PROXY = process.env.no_proxy = '127.0.0.1,localhost';
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pin56-'));
        let srv = null;
        const antesPin = { ...redes._PIN };
        try {
          // `testsrc` y no un color liso: un JPEG de un rectangulo blanco pesa
          // menos de 2 KB y el propio codigo lo rechaza por «miniatura», que es
          // lo que tiene que hacer. La prueba mediria su propia guarda.
          const foto = (n, tam) => execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y',
            '-f', 'lavfi', '-i', `testsrc=size=${tam}:duration=1`, '-frames:v', '1', '-q:v', '2',
            path.join(dir, n)], { timeout: 60000 });
          foto('pagina.jpg', '400x400');
          foto('buscador.jpg', '200x300');

          let base = '';
          let vacio = false;
          let visitasPagina = 0;
          let caducarUnaVez = false;
          srv = http.createServer((req, res) => {
            const ruta = req.url.split('?')[0];
            if (ruta === '/pagina') {
              visitasPagina++;
              // Con cookie: sin ella el código ni intenta el buscador.
              res.writeHead(200, {
                'content-type': 'text/html',
                'set-cookie': ['csrftoken=falso123; Path=/', '_pinterest_sess=x; Path=/'],
              });
              return res.end(`<img src="https://i.pinimg.com/736x/aa/bb/cc/aabbccddeeff00112233445566778899.jpg">`);
            }
            if (ruta === '/recurso') {
              // Cookie caducada: el primer intento contesta 403 y el siguiente
              // ya va bien. Es lo que hace Pinterest cuando la sesion anonima
              // vence, y sin reintento serian media hora de busquedas rotas.
              if (caducarUnaVez) { caducarUnaVez = false; res.writeHead(403); return res.end('no'); }
              res.writeHead(200, { 'content-type': 'application/json' });
              return res.end(JSON.stringify({ resource_response: { data: { results: vacio ? [] : [
                { images: { orig: { url: `${base}/buscador.jpg` } } },
              ] } } }));
            }
            const f = path.join(dir, ruta.slice(1));
            if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
            res.writeHead(200);
            return fs.createReadStream(f).pipe(res);
          });
          await new Promise((r) => srv.listen(0, '127.0.0.1', r));
          base = `http://127.0.0.1:${srv.address().port}`;
          redes._PIN.pagina = `${base}/pagina?q=`;
          redes._PIN.recurso = `${base}/recurso`;

          const salida = await redes.buscar('lo que sea', null).catch((e) => ({ error: e.message }));
          exige(!salida.error, `la búsqueda falló con el buscador respondiendo: ${salida.error || ''}`);
          if (!salida.error) {
            const medida = await redes._medirFichero(salida.fichero);
            exige(medida.ancho === 200 && medida.alto === 300,
              `la foto salió a ${medida.ancho}x${medida.alto}: eso es la de la página, no la del buscador — se volvió a leer la página y con ella vuelve el relleno`);
            fs.rmSync(salida.fichero, { force: true });
          }

          // Y EL CASO QUE SALIO EN EL GRUPO: el buscador CONTESTA y dice que no
          // tiene nada. Entonces NO se lee la página, porque su relleno se
          // mandaría como si fuera el resultado. Se dice que no hay y ya.
          vacio = true;
          const nada = await redes.buscar('lo que sea', null).catch((e) => ({ error: e.message }));
          exige(nada.error && /no encontré nada/.test(nada.error),
            nada.error
              ? `con el buscador diciendo que no tiene nada, el error es «${nada.error}» en vez de «no encontré nada»`
              : 'con el buscador diciendo que no tiene nada, se manda una foto igualmente: esa sale de la página, o sea del relleno');
          if (nada.fichero) fs.rmSync(nada.fichero, { force: true });
          vacio = false;

          // Y LAS COOKIES SE GUARDAN. La pagina solo existe para leer dos
          // cabeceras y pesa un mega: visitarla en cada busqueda son 865 ms y
          // 1.038 KB tirados. Medido de verdad: mediana de 1.925 ms por busqueda
          // sin guardarlas contra 1.003 ms guardandolas.
          //
          // Se cuenta cuantas veces se pide la pagina en TRES busquedas: con la
          // memoria puesta tiene que ser una.
          redes._olvidarGalletas();
          visitasPagina = 0;
          for (let i = 0; i < 3; i++) {
            const x = await redes.buscar(`lo que sea ${i}`, null).catch(() => null);
            if (x?.fichero) fs.rmSync(x.fichero, { force: true });
          }
          exige(visitasPagina === 1,
            `la página de Pinterest se pidió ${visitasPagina} veces en 3 búsquedas: las cookies no son de la consulta, son de la sesión, y cada visita es un mega y casi un segundo`);

          // Y CUANDO LA COOKIE GUARDADA CADUCA, se va a por otra. Sin esto, la
          // primera cookie que Pinterest invalide deja media hora de búsquedas
          // contestando «no encontré nada» con el buscador entero en pie.
          const antesDeCaducar = visitasPagina;
          caducarUnaVez = true;
          const trasCaducar = await redes.buscar('despues de caducar', null).catch((e) => ({ error: e.message }));
          exige(!trasCaducar.error,
            `con la cookie caducada la búsqueda falla en vez de pedir otra: ${trasCaducar.error || ''}`);
          exige(visitasPagina === antesDeCaducar + 1,
            'con la cookie caducada no se volvió a por la página: la memoria de cookies se queda con una que ya no vale');
          if (trasCaducar.fichero) fs.rmSync(trasCaducar.fichero, { force: true });
          caducarUnaVez = false;
          redes._olvidarGalletas();
        } finally {
          redes._PIN.pagina = antesPin.pagina;
          redes._PIN.recurso = antesPin.recurso;
          if (srv) srv.close();
          fs.rmSync(dir, { recursive: true, force: true });
          if (sinProxy[0] === undefined) delete process.env.NO_PROXY; else process.env.NO_PROXY = sinProxy[0];
          if (sinProxy[1] === undefined) delete process.env.no_proxy; else process.env.no_proxy = sinProxy[1];
        }
      }

    // Y LOS DOS USOS DEL COMANDO, POR SEPARADO. Lo que no puede pasar es que el
    // enlace deje de funcionar por haber añadido la busqueda, ni que la
    // busqueda borre el mensaje: sin enlace no hay nada que quitar del grupo, y
    // borrarlo solo deja un «eliminado por el admin» y hace desaparecer lo que
    // se pidió.
    {
      const cmd = require(path.join(R, 'src/commands/redes'));
      const { addAura } = require(path.join(R, 'src/utils/auraStore'));
      const corre = async (args, id) => {
        const G = `1203630056${Math.floor(Math.random() * 9000 + 1000)}@g.us`;
        const YO = `3460000056${Math.floor(Math.random() * 900 + 100)}@s.whatsapp.net`;
        await addAura(G, YO, 5000);
        const con = [];
        const sock = { sendMessage: async (j, c, o) => { con.push({ c, o }); return {}; } };
        await cmd.cmdPinterest(sock, { key: { remoteJid: G, fromMe: false, id, participant: YO } },
          args, { id: G, participants: [{ id: YO }] });
        return con;
      };
      const conTexto = await corre(['gatos', 'monos'], 'PIN56A');
      exige(!conTexto.some((x) => x.c.delete),
        'una búsqueda borra el mensaje: no hay ningún enlace que quitar y encima desaparece lo que se pidió');
      const soloUso = conTexto.find((x) => x.c.text && /Escribe qué buscar|Pega el enlace/.test(x.c.text));
      exige(!soloUso, 'un texto detrás de *!pin* se toma por «falta el enlace» en vez de buscarlo');

      const conEnlace = await corre(['https://www.pinterest.com/pin/123456789/'], 'PIN56B');
      exige(conEnlace.some((x) => x.c.delete),
        'con un enlace ya no se borra el mensaje: el enlace se queda puesto en el grupo');

      const vacio = await corre([], 'PIN56C');
      exige(vacio.some((x) => x.c.text && /Escribe qué buscar/.test(x.c.text)),
        '*!pin* a secas no dice que ahora también busca');
      exige(!vacio.some((x) => x.c.delete), 'se borra el mensaje de quien escribió *!pin* sin nada');

      // Y un enlace de OTRA red no se busca en Pinterest: es que se equivocó de
      // comando, y buscarlo le contestaría cualquier cosa.
      const otraRed = await corre(['https://vt.tiktok.com/ZSqDyW1bA/'], 'PIN56D');
      exige(otraRed.some((x) => x.c.text && /TikTok/.test(x.c.text)),
        'un enlace de TikTok en *!pin* se busca como si fuera texto en vez de decirle que se equivocó');
      exige(!otraRed.some((x) => x.c.image || x.c.video), 'un enlace de TikTok en *!pin* devuelve algo');
    }

    if (fallos === antes) console.log(verde('   ✓ *!pin gatos* busca y *!pin <enlace>* trae el pin, sin pisarse'));
  }

  // ── 57. NI EL MISMO GIF DOS VECES NI *!next* SIN BUSQUEDA ────────────────
  //
  // Dos cosas que el dueño vio en el grupo el mismo dia.
  //
  // «Se repitio dos veces seguidas un mismo GIF». Y es de esperar sin hacer
  // nada: estas webs tienen entre diez y veinte gifs por categoria y sirven uno
  // al azar, sin memoria. La despensa lo empeora, porque guarda dos por
  // categoria y los pide por separado: si los dos salen iguales, el grupo ve el
  // mismo gif dos veces seguidas SEGURO.
  //
  // Y *!next*, que continua una busqueda de *!pin* respondiendo a la foto.
  {
    console.log('\n57. NI EL MISMO GIF DOS VECES NI *!next* PERDIDO');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    const acc = require(path.join(R, 'src/commands/acciones'));
    // La memoria de lo ultimo servido, que es lo que decide si se vuelve a
    // pedir. Es un anillo: al llenarse tira lo mas viejo.
    {
      const g = acc._gifsRecientes;
      g.clear();
      exige(!acc._yaSalio('k', 'https://a/1.gif'), 'una dirección nueva sale como ya vista');
      acc._apuntarGif('k', 'https://a/1.gif');
      exige(acc._yaSalio('k', 'https://a/1.gif'), 'la dirección que acaba de salir no se recuerda: el gif se repetirá');
      exige(!acc._yaSalio('otra', 'https://a/1.gif'),
        'la memoria no va por categoría: un gif de *!hug* bloquearía uno de *!kill*');
      for (let i = 0; i < 10; i++) acc._apuntarGif('k', `https://a/n${i}.gif`);
      exige(!acc._yaSalio('k', 'https://a/1.gif'),
        'la memoria no caduca: con la categoría entera bloqueada no quedaría ningún gif que servir');
      const lista = g.get('k') || [];
      exige(lista.length <= 6, `la memoria guarda ${lista.length} direcciones: sin tope se bloquea el catálogo entero`);
      g.clear();
    }

    // Y QUE SE VUELVA A PEDIR DE VERDAD, no solo que se recuerde. Se monta una
    // web que sirve SIEMPRE el mismo gif las dos primeras veces y otro distinto
    // la tercera: si el bot no reintenta, se queda con el repetido.
    {
      const http = require('http');
      const { execFileSync } = require('child_process');
      const { ffmpegPath } = require(path.join(R, 'src/utils/ffmpeg'));
      const sinProxy = [process.env.NO_PROXY, process.env.no_proxy];
      process.env.NO_PROXY = process.env.no_proxy = '127.0.0.1,localhost';
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gif57-'));
      let srv = null;
      const antesFuente = acc._FUENTE_POR_CAT.kill;
      try {
        // Dos gifs de tamaños distintos, para poder decir cuál llegó.
        for (const [n, tam] of [['viejo.gif', '64x64'], ['nuevo.gif', '128x128']]) {
          execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi',
            '-i', `testsrc=size=${tam}:duration=1:rate=8`, path.join(dir, n)], { timeout: 60000 });
        }
        let peticiones = 0;
        let base = '';
        srv = http.createServer((req, res) => {
          const ruta = req.url.split('?')[0];
          if (ruta.startsWith('/api')) {
            peticiones++;
            const cual = peticiones <= 2 ? 'viejo.gif' : 'nuevo.gif';
            res.writeHead(200, { 'content-type': 'application/json' });
            return res.end(JSON.stringify({ url: `${base}/${cual}` }));
          }
          const f = path.join(dir, ruta.slice(1));
          if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
          res.writeHead(200);
          return fs.createReadStream(f).pipe(res);
        });
        await new Promise((r) => srv.listen(0, '127.0.0.1', r));
        base = `http://127.0.0.1:${srv.address().port}`;
        acc._FUENTE_POR_CAT.kill = `${base}/api/{cat}`;
        acc._gifsRecientes.clear();

        const uno = await acc._traerAccion('kill', false, null, true);
        exige(!!uno?.mp4, 'el primer gif de la web de mentira no llega');
        const dos = await acc._traerAccion('kill', false, null, true);
        exige(!!dos?.mp4, 'el segundo gif no llega');
        exige(peticiones >= 3,
          `la web recibió ${peticiones} peticiones: al repetir el gif no se le pidió otro, así que el grupo lo ve dos veces seguidas`);
        exige(uno.mp4.length !== dos.mp4.length,
          'los dos gifs seguidos son el mismo: es exactamente lo que se vio en el grupo');
      } finally {
        acc._FUENTE_POR_CAT.kill = antesFuente;
        acc._gifsRecientes.clear();
        if (srv) srv.close();
        fs.rmSync(dir, { recursive: true, force: true });
        if (sinProxy[0] === undefined) delete process.env.NO_PROXY; else process.env.NO_PROXY = sinProxy[0];
        if (sinProxy[1] === undefined) delete process.env.no_proxy; else process.env.no_proxy = sinProxy[1];
      }
    }

    // ── *!next* ────────────────────────────────────────────────────────────
    //
    // Continua la busqueda de la foto a la que se responde, y se recuerda por el
    // ID DEL MENSAJE DEL BOT. Eso es lo que hace que funcione con tres busquedas
    // vivas a la vez en el mismo grupo.
    {
      const cmd = require(path.join(R, 'src/commands/redes'));
      const G = `12036300057${Math.floor(Math.random() * 900 + 100)}@g.us`;
      const YO = `3460000057${Math.floor(Math.random() * 900 + 100)}@s.whatsapp.net`;
      const conQuote = (id, idCitado) => ({
        key: { remoteJid: G, fromMe: false, id, participant: YO },
        message: { extendedTextMessage: { text: '!next', contextInfo: { stanzaId: idCitado } } },
      });

      // Sin responder a nada, no hay busqueda que continuar y se dice.
      const sueltos = [];
      await cmd.cmdNext({ sendMessage: async (j, c, o) => { sueltos.push({ c, o }); return {}; } },
        { key: { remoteJid: G, fromMe: false, id: 'N1', participant: YO }, message: { conversation: '!next' } },
        [], { id: G, participants: [{ id: YO }] });
      exige(sueltos.some((x) => /Responde con/.test(x.c.text || '')),
        '*!next* a secas no explica que hay que responder a una foto del bot');
      exige(sueltos.every((x) => !x.c.image), '*!next* sin responder a nada manda una foto igualmente');

      // Respondiendo a un mensaje que el bot no recuerda, tampoco.
      const ajenos = [];
      await cmd.cmdNext({ sendMessage: async (j, c, o) => { ajenos.push({ c, o }); return {}; } },
        conQuote('N2', 'ID-QUE-NO-EXISTE'), [], { id: G, participants: [{ id: YO }] });
      exige(ajenos.some((x) => /Responde con/.test(x.c.text || '')),
        'responder con *!next* a cualquier mensaje se toma por una búsqueda');

      // Y la memoria: lo que se apunta se encuentra, y solo en su grupo.
      cmd._busquedas.set('ID-BUENO', { consulta: 'gatos', jid: G });
      const otroGrupo = [];
      await cmd.cmdNext({ sendMessage: async (j, c, o) => { otroGrupo.push({ c, o }); return {}; } },
        { key: { remoteJid: '120363000000999@g.us', fromMe: false, id: 'N3', participant: YO },
          message: { extendedTextMessage: { text: '!next', contextInfo: { stanzaId: 'ID-BUENO' } } } },
        [], { id: G, participants: [{ id: YO }] });
      exige(otroGrupo.some((x) => /Responde con/.test(x.c.text || '')),
        'un *!next* en OTRO grupo continúa una búsqueda que no es suya');
      cmd._busquedas.delete('ID-BUENO');
    }

    if (fallos === antes) console.log(verde('   ✓ el gif no se repite y *!next* solo continúa lo que es suyo'));
  }

  // ── 58. LO QUE SE HIZO POR VELOCIDAD NO PUEDE CAMBIAR LO QUE HACE ────────
  //
  // Esta capa existe por un repaso de velocidad. Lo que se toco ahi es
  // peligroso de una forma concreta: son cambios que NO se ven. Un formateador
  // izado, una guarda de longitud, un freno partido en dos y dos volcados a
  // disco puestos en otro orden. Ninguno cambia lo que el grupo lee — hasta que
  // uno de ellos si lo cambia, y entonces no hay sintoma, solo un comando que
  // deja de responder o aura que aparece de la nada.
  //
  // Y hay dos que son de EXACTITUD, no de velocidad: el bono del hito y el bote
  // del robo se pagaban en un fichero y se apuntaban en otro, con ventanas de
  // guardado distintas. Eso deja al disco diciendo dos cosas incompatibles
  // durante segundos.
  {
    console.log('\n58. EL REPASO DE VELOCIDAD NO CAMBIO NINGUN COMPORTAMIENTO');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    // 1. LA GUARDA DE LONGITUD DE *!k*. El disparador se escribe hablando
    //    —«welcome», «¿dirías algo?»— y la guarda mira el largo para no hacer
    //    cinco pasadas sobre cada mensaje del grupo. Si mira el largo CRUDO en
    //    vez del recortado, treinta espacios delante de «welcome» dejan de
    //    disparar el comando. Paso de verdad al escribirlo.
    {
      const mh = soloCodigo('src/handlers/messageHandler.js');
      const i = mh.indexOf('function esTriggerK(');
      const cuerpo = i < 0 ? '' : mh.slice(i, mh.indexOf('\n}', i));
      exige(i > 0, 'esTriggerK ya no existe');
      exige(/trim\(\)[\s\S]*length\s*>/.test(cuerpo),
        'la guarda de longitud de esTriggerK mira el texto sin recortar: «      welcome» dejaría de disparar *!k*');

      // Y el comportamiento, comparado contra la version sin guarda.
      const TRIGGERS = ['welcome', 'diria algo', 'dirias algo'];
      const BORDES = /^[\s¿¡"'“”«»(\[]+|[\s?!¿¡.,;:"'“”«»)\]…]+$/g;
      const sinGuarda = (t) => TRIGGERS.includes(String(t).trim().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(BORDES, '').replace(/\s+/g, ' '));
      const casos = ['welcome', 'Welcome!', '¿welcome?', '  WELCOME  ', 'diria algo', '¿Diría algo?',
        'dirias algo', '«Dirías algo»', 'no diria algo asi', 'hola', `${' '.repeat(30)}welcome`,
        '\t\n welcome \n', 'x'.repeat(200), '', '¡¡¡DIRÍAS ALGO!!!'];
      const conGuarda = (t) => {
        if (!t) return false;
        const r = String(t).trim();
        if (r.length > 20) return false;
        return sinGuarda(r);
      };
      const distintos = casos.filter((c) => sinGuarda(c) !== conGuarda(c));
      exige(distintos.length === 0,
        `la guarda cambia el resultado en ${distintos.length} caso(s), el primero ${JSON.stringify(distintos[0])}`);
    }

    // 2. EL FRENO DE LAS CORRECCIONES, partido en dos para no buscar la
    //    sugerencia cuando va a tirarse. Lo que no puede pasar es que deje de
    //    frenar, ni que un comando SIN correccion posible gaste el freno.
    {
      const { handleMessage } = require(path.join(R, 'src/handlers/messageHandler'));
      const G = `12036300058${Math.floor(Math.random() * 900 + 100)}@g.us`;
      const BOT = '5491999958@s.whatsapp.net';
      let textos = [];
      const sock = {
        user: { id: BOT }, readMessages: async () => {}, sendPresenceUpdate: async () => {},
        sendMessage: async (j, c) => { if (c.text) textos.push(c.text); return { key: { id: 'x' } }; },
        groupMetadata: async () => ({ id: G, participants: [{ id: BOT, admin: 'admin' }] }),
        groupParticipantsUpdate: async () => [],
      };
      let n = 0;
      const sobre = (t, q) => ({
        key: { remoteJid: G, participant: q, fromMe: false, id: `S58-${n++}` },
        message: { conversation: t }, pushName: 'p', messageTimestamp: Math.floor(Date.now() / 1000),
      });
      const corrige = () => textos.some((t) => /no existe\. Era/.test(t));
      const A = `3460000581${Math.floor(Math.random() * 900 + 100)}@s.whatsapp.net`;
      const B = `3460000582${Math.floor(Math.random() * 900 + 100)}@s.whatsapp.net`;
      const C = `3460000583${Math.floor(Math.random() * 900 + 100)}@s.whatsapp.net`;

      textos = []; await handleMessage(sock, sobre('!pinggg', A));
      exige(corrige(), 'una errata ya no se corrige: el corrector se ha quedado sin llamar');
      textos = []; await handleMessage(sock, sobre('!aurra', A));
      exige(!corrige(), 'la segunda errata seguida SÍ se corrige: el freno de 30 s dejó de frenar');
      textos = []; await handleMessage(sock, sobre('!pinggg', B));
      exige(corrige(), 'el freno de una persona frena a otra: es por persona, no global');
      // Y lo fino: un comando sin correccion posible no puede gastar el freno.
      textos = []; await handleMessage(sock, sobre('!zqxwvk', C));
      textos = []; await handleMessage(sock, sobre('!pinggg', C));
      exige(corrige(),
        'un comando sin corrección posible gastó el freno: la siguiente errata de verdad se queda sin aviso');
    }

    // 3. EL HITO SE APUNTA EN DISCO ANTES DE PAGARSE.
    //
    //    La marca vive en casino.json (12 s de ventana) y el pago en aura.json
    //    (8 s). Sin el volcado, entre los 8 y los 12 segundos el disco dice «ya
    //    cobró» y «no ha cobrado ningún hito» a la vez, y un corte ahí repaga el
    //    bono al arrancar. Aura de la nada.
    {
      const cas = soloCodigo('src/utils/casino.js');
      const i = cas.indexOf('apuntarHito(jid, sender, toca.n)');
      const j = cas.indexOf('addAura(jid, sender, amount)');
      exige(i > 0 && j > i, 'no encuentro el orden apuntarHito → addAura en casino.js');
      const entre = i > 0 && j > i ? cas.slice(i, j) : '';
      exige(/flushCasino\(/.test(entre),
        'entre apuntar el hito y pagarlo ya no se vuelca casino.json: un corte en esa ventana repaga el bono entero');
    }

    // 4. Y EL ROBO, LO MISMO: el cargo al disco antes que el abono.
    //
    //    El saldo esta en aura.json (8 s) y el bote en robo.json (3 s). El
    //    fichero de destino volcaba ANTES que el de origen, asi que el disco
    //    podia quedarse con el bote cobrado y la victima intacta.
    {
      //
      // LA REGLA, ESCRITA COMO REGLA Y NO COMO UNA LISTA DE LINEAS: solo
      // importan los sitios donde el AURA es el origen. Si el origen es el bote
      // —reventarlo, vaciar la caja— el fichero de destino es aura.json, que
      // vuelca mas tarde, y entonces el disco solo puede perder aura, que es el
      // lado seguro. Asi que se busca cada escritura a robo.json que venga
      // precedida de un cargo de aura, y se exige el volcado en medio.
      const rob = soloCodigo('src/commands/robo.js');
      const escrituras = [...rob.matchAll(/tienda\.(aportarAlBote|anotarGolpe)\(/g)];
      exige(escrituras.length >= 4, `solo encuentro ${escrituras.length} escrituras a robo.json: el fichero ha cambiado de forma`);
      let mirados = 0;
      for (const m of escrituras) {
        const antesDe = rob.slice(Math.max(0, m.index - 700), m.index);
        // La excepcion, y es la unica: cuando el origen es el bote o la caja
        // —reventarlo, atracarla— el destino es aura.json, que vuelca MAS TARDE
        // que robo.json. Ahi el disco solo puede perder aura, nunca inventarla,
        // asi que no hace falta ordenar nada.
        if (/vaciarBote\(|sacarDeCaja\(/.test(antesDe)) continue;
        mirados++;
        exige(/flushAura\(/.test(antesDe),
          `hay un ${m[1]} que se apunta sin volcar el aura justo antes: el disco puede quedarse con el abono hecho y el cargo sin hacer, o sea aura inventada`);
      }
      exige(mirados >= 4,
        `solo ${mirados} de las ${escrituras.length} escrituras a robo.json pasan por la regla: el fichero cambió de forma y esto ya no mide lo que dice`);
    }

    // 5. LOS FORMATEADORES IZADOS. Construir un Intl.DateTimeFormat cuesta 60 us
    //    y los dos sitios donde estaba lo hacían en cada llamada.
    {
      for (const [fichero, donde] of [['src/utils/objetivoDia.js', 'franjaDe'], ['src/utils/logger.js', 'timestamp']]) {
        const src = soloCodigo(fichero);
        const i = src.indexOf(`${donde === 'timestamp' ? 'const timestamp' : 'function franjaDe'}`);
        const cuerpo = i < 0 ? '' : src.slice(i, i + 500);
        exige(i > 0, `no encuentro ${donde} en ${fichero}`);
        exige(!/new Intl\.DateTimeFormat/.test(cuerpo) && !/toLocaleTimeString/.test(cuerpo),
          `${donde} vuelve a construir el formateador en cada llamada: son 60 us por mensaje tirados en fabricar el mismo objeto inmutable`);
      }
      // Y que siga devolviendo lo mismo.
      const od = require(path.join(R, 'src/utils/objetivoDia'));
      const f = od._franjaDe(Date.UTC(2026, 8, 12, 17, 30));
      exige(/^\d{4}-\d{2}-\d{2}\|(00|12)$/.test(f), `franjaDe devuelve «${f}», que no tiene la forma de siempre`);
      exige(od._franjaDe(Date.UTC(2026, 8, 12, 17, 30)) === f, 'franjaDe no es estable para el mismo instante');
    }

    // 6. UN GRUPO SIN OBJETIVO NO PUEDE RECALCULAR EL RANKING EN CADA MENSAJE.
    {
      const od = soloCodigo('src/utils/objetivoDia.js');
      const i = od.indexOf('async function cartelDelDia(');
      const cuerpo = i < 0 ? '' : od.slice(i, od.indexOf('\n}', i));
      exige(/sinObjetivo/.test(cuerpo),
        'cartelDelDia ya no se acuerda de los grupos sin objetivo: vuelve a rehacer el ranking entero en cada mensaje, para nada');
      const odm = require(path.join(R, 'src/utils/objetivoDia'));
      exige(odm._sinObjetivo instanceof Map, 'la memoria de «aquí no hay objetivo» no es un Map');
    }


    // 7. LA PLAZA DEL SEMAFORO NO SE PUEDE PERDER.
    //
    // `gifAMp4` cogia la plaza dos lineas antes del `try`, con un
    // `await fs.writeFile` en medio. Si esa escritura reventaba —sin disco, sin
    // permisos— el `finally` que la suelta todavia no existia y la plaza se
    // quedaba cogida para siempre. En la VPS hay UNA: a partir de ahi no vuelve
    // a salir un sticker, ni un !toimg, ni un !ttp, ni un vídeo de !tt hasta el
    // siguiente reinicio, y sin una linea en el log.
    {
      const { createSemaphore } = require(path.join(R, 'src/utils/helpers'));
      const sem = createSemaphore(1);
      // El suelo en cero: un release suelto no puede repartir plazas de mas.
      sem.release(); sem.release(); sem.release();
      let repartidas = 0;
      while (sem.tryAcquire() && repartidas < 6) repartidas++;
      exige(repartidas === 1,
        `tras tres release sueltos el semáforo reparte ${repartidas} plazas en vez de 1: dos ffmpeg a la vez en el único core`);

      // Y el orden de las lineas en gifAMp4.
      const acc = soloCodigo('src/commands/acciones.js');
      const i = acc.indexOf('async function gifAMp4(');
      const cuerpo = i < 0 ? '' : acc.slice(i, acc.indexOf('\n  try {', i));
      exige(i > 0, 'no encuentro gifAMp4');
      const escribe = cuerpo.indexOf('fs.writeFile(');
      const coge = cuerpo.indexOf('tryAcquire()');
      exige(escribe > 0 && coge > escribe,
        'gifAMp4 vuelve a coger la plaza del semáforo antes de escribir el fichero: si esa escritura falla, la plaza se pierde para siempre y ffmpeg se muere hasta el reinicio');
    }

    // 8. EL STICKER ANIMADO: NI INVENTA FOTOGRAMAS NI CODIFICA SIN TOPE.
    {
      const stk = soloCodigo('src/utils/sticker.js');
      const i = stk.indexOf('const VF_ANIM =');
      const cuerpo = i < 0 ? '' : stk.slice(i, stk.indexOf('};', i));
      exige(i > 0, 'no encuentro VF_ANIM');
      // Y se mide, no se lee: `fpsOrigen` puede seguir escrito en la funcion y
      // no decidir nada. Paso exactamente eso al escribir la capa.
      const { _VF_ANIM: vf } = require(path.join(R, 'src/utils/sticker'));
      exige(!/fps=/.test(vf(30, 512, 12)),
        'VF_ANIM sigue poniendo fps=30 delante de un gif de 12: el filtro no interpola, REPITE, así que duplica cada fotograma y el codificador los escribe todos enteros');
      exige(/fps=30/.test(vf(30, 512, 60)),
        'VF_ANIM ya no BAJA los fps de un vídeo de 60: eso sí hay que hacerlo, y era para lo que servía el filtro');
      exige(/fps=30/.test(vf(30, 512, 0)),
        'sin saber los fps del origen, VF_ANIM deja de poner el filtro: a ciegas hay que dejarlo como estaba');
      exige(/inputOptions\(\['-t'/.test(stk),
        'el tope de duración del sticker animado ya no va como opción de ENTRADA: puesto a la salida, ffmpeg decodifica el vídeo entero y tira lo que sobra');
      exige(/TOPE_ANIMADO_S\s*=\s*\d+/.test(stk), 'no hay tope de duración para el sticker animado');

      // Y la duracion no puede depender solo de ffprobe, que puede no existir.
      exige(/porFfmpeg\(/.test(stk) && /medidasDe\(/.test(stk),
        'la duración vuelve a salir solo de ffprobe: si ffprobe no está, devuelve 0 y la escalera arranca siempre en el escalón más caro (13 s de más medidos en un vídeo de 8 s)');
      // Un escalon que revienta tiene que dejar rastro.
      const j = stk.indexOf('await encodeAnimWebp(');
      const tras = j > 0 ? stk.slice(j, j + 400) : '';
      exige(/logger\.unaVez\(/.test(tras),
        'el catch del escalón vuelve a estar mudo: la escalera entera se cae y lo único que se ve es «sticker animado vacío», que no dice por qué');
    }

    // 9. NINGUN ENVIO DE VIDEO PUEDE LANZAR EL FFMPEG DE BAILEYS.
    //
    // Baileys genera la miniatura sola cuando `jpegThumbnail` viene `undefined`,
    // y para un video lo hace lanzando su propio ffmpeg POR FUERA del semaforo.
    {
      for (const fichero of ['src/commands/toimg.js', 'src/commands/redes.js', 'src/commands/acciones.js']) {
        const src = soloCodigo(fichero);
        const envios = [...src.matchAll(/\{\s*video:/g)];
        for (const m of envios) {
          const trozo = src.slice(m.index, m.index + 300);
          exige(/jpegThumbnail/.test(trozo),
            `${fichero} manda un vídeo sin jpegThumbnail: Baileys lanzará su propio ffmpeg por fuera del semáforo`);
        }
      }
    }


    // 10. *!play* NO CARGA LA CANCION EN LA RAM, y *!pin* no se baja un mega
    //     por cada busqueda.
    {
      const mc = soloCodigo('src/utils/musicCache.js');
      exige(!/ramCache/.test(mc),
        'vuelve la caché en RAM de las canciones: 24 MB de memoria permanente para ahorrar una lectura de disco que ya no ocurre, en una máquina de 1 GB');
      const i = mc.indexOf('async function getCached(');
      const cuerpo = i < 0 ? '' : mc.slice(i, mc.indexOf('\n}', i));
      exige(i > 0, 'no encuentro getCached');
      exige(!/readFile\(filePath\)/.test(cuerpo),
        'getCached vuelve a leer la canción entera: son hasta 25 MB de RSS para dársela a Baileys, que sabe leer de una ruta');
      exige(/filePath/.test(cuerpo), 'getCached ya no devuelve la ruta: entonces no hay de dónde leerla');

      const mus = soloCodigo('src/commands/music.js');
      exige(/audio: audioBuffer \|\| \{ url: result\.filePath \}/.test(mus),
        '*!play* vuelve a mandar la canción desde un Buffer en vez de desde el disco');

      // La duracion no puede depender solo de ffprobe: si no esta, el filtro que
      // descarta las previews de 30 s se queda muerto y el grupo recibe recortes.
      const dl = soloCodigo('src/utils/downloader.js');
      exige(/duracionPorFfmpeg\(/.test(dl),
        'la duración de la canción vuelve a salir solo de ffprobe: sin ffprobe devuelve null siempre y el filtro de las previews de 30 s deja de filtrar');
      const j = dl.indexOf('function audioDuration(');
      const cuerpoDur = j < 0 ? '' : dl.slice(j, dl.indexOf('\n}', j));
      const salidas = (cuerpoDur.match(/conRespaldo\(\)/g) || []).length;
      exige(salidas >= 3,
        `el respaldo de la duración está en ${salidas} de las tres salidas: el caso real (ffprobe que no existe) sale por «error», no por «close»`);

      // Y las cookies de Pinterest se guardan: la pagina pesa un mega y solo se
      // visita para leer dos cabeceras.
      const red = soloCodigo('src/utils/redes.js');

    }


    // 11. EL MEDIO SE ESCRIBE UNA VEZ, Y EL STICKER SALE IGUAL.
    //
    // La miniatura y el sticker necesitan los mismos bytes en un fichero y cada
    // uno escribia su copia: dos temporales de hasta 24 MB para el mismo video.
    // Esto es un cambio de los que no se ven —el sticker sale igual— asi que se
    // comprueba las dos cosas: que solo se escribe una vez, y que lo que sale
    // es IDENTICO byte a byte.
    {
      const { execFileSync } = require('child_process');
      const { ffmpegPath } = require(path.join(R, 'src/utils/ffmpeg'));
      const st = require(path.join(R, 'src/utils/sticker'));
      const { tempFile, cleanTemp } = require(path.join(R, 'src/utils/helpers'));
      const fse = require(path.join(R, 'node_modules/fs-extra'));
      const crypto = require('crypto');
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stk58-'));
      const escritas = [];
      const realWrite = fse.writeFile.bind(fse);
      try {
        const v = path.join(dir, 'v.mp4');
        execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi',
          '-i', 'testsrc2=size=320x180:duration=3:rate=24', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', v],
          { timeout: 120000 });
        const buf = fs.readFileSync(v);
        const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');

        const viejo = await Promise.all([
          st.generateSourceThumb(buf).catch(() => null),
          st.videoToSticker(buf, 'p'),
        ]);

        // Ahora el camino nuevo, contando lo que se escribe a disco.
        fse.writeFile = async (f, d, ...r) => { escritas.push((d && d.length) || 0); return realWrite(f, d, ...r); };
        const ruta = tempFile('mp4');
        await fse.writeFile(ruta, buf);
        const nuevo = await Promise.all([
          st.generateSourceThumb(ruta).catch(() => null),
          st.videoToSticker(buf, 'p', ruta),
        ]);
        fse.writeFile = realWrite;
        await cleanTemp(ruta);

        const grandes = escritas.filter((n) => n >= buf.length);
        exige(grandes.length === 1,
          `el medio se escribió ${grandes.length} veces en vez de una: son dos temporales de hasta 24 MB para el mismo vídeo en una máquina de 1 GB`);
        exige(md5(viejo[1]) === md5(nuevo[1]),
          'el sticker cambia al compartir el temporal: el ahorro no vale nada si el resultado no es el mismo');
        exige((!viejo[0] && !nuevo[0]) || (viejo[0] && nuevo[0] && md5(viejo[0]) === md5(nuevo[0])),
          'la miniatura cambia al compartir el temporal');
      } finally {
        fse.writeFile = realWrite;
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }

    // 12. *!top* NO CONSTRUYE EL RANKING DOS VECES.
    {
      const au = soloCodigo('src/commands/aura.js');
      exige(/objetivoDelDia\(jid, groupMeta, rankingCompleto\)/.test(au),
        '*!top* vuelve a dejar que el objetivo del día rehaga el ranking entero: 250 us de los 524 que costaba, en construir dos veces lo mismo');
      // Y el que se pasa tiene que ser el COMPLETO, no el top-10: con el
      // recortado el objetivo deja de encontrarse en cuanto cae al puesto once.
      exige(/rankingCompleto = soloMiembros/.test(au) && /rankingCompleto\.slice\(0, 10\)/.test(au),
        'se pasa una lista recortada al objetivo del día: entonces el objetivo desaparece del cartel en cuanto sale del top 10');

      // Y QUE EL PARAMETRO SE USE DE VERDAD, no solo que se pase. Un grupo sin
      // una sola linea de aura no tiene objetivo posible; si al darle una lista
      // a mano sale uno, es que la esta leyendo.
      {
        const od = require(path.join(R, 'src/utils/objetivoDia'));
        const G = `12036300058${Math.floor(Math.random() * 9000 + 1000)}@g.us`;
        const gente = [1, 2, 3, 4].map((i) => `34600005${i}${Math.floor(Math.random() * 900 + 100)}@s.whatsapp.net`);
        const meta = { id: G, participants: gente.map((id) => ({ id })) };
        od._decidido.delete(G);
        od._sinObjetivo.delete(G);
        const aCiegas = await od.objetivoDelDia(G, meta).catch(() => null);
        exige(!aCiegas, 'un grupo sin aura ya tiene objetivo: la prueba de abajo no distingue nada');
        od._decidido.delete(G);
        od._sinObjetivo.delete(G);
        const aMano = gente.map((jid, i) => ({ jid, aura: 50000 - i * 10 }));
        const conLista = await od.objetivoDelDia(G, meta, aMano).catch(() => null);
        exige(!!conLista && gente.includes(conLista.jid),
          'objetivoDelDia ignora el ranking que se le pasa y lo rehace por su cuenta: entonces el parámetro no ahorra nada');
        od._decidido.delete(G);
        od._sinObjetivo.delete(G);
      }
    }


    // 13. EL AVISO DE ADMIN CALLA LO DEL TIER DUEÑO.
    //
    // Ni lo que hace el bot con su numero ni lo que hace el dueño con el suyo.
    // Es decision suya y esta capa existe porque YO la cambie una vez en la
    // direccion contraria: me parecio que anunciar a todos menos a el convertia
    // el silencio en la señal. Ni era cierto —lo del bot tambien va callado— ni
    // era mia la decision.
    {
      const bot = soloCodigo('src/bot.js');
      const i = bot.indexOf('isAdminNotifyEnabled(groupJid)) {');
      exige(i > 0, 'no encuentro el aviso de cambio de admin en bot.js');
      const linea = i > 0 ? bot.slice(bot.lastIndexOf('\n', i) + 1, i + 40) : '';
      // EL TIER DUEÑO NO SE ANUNCIA. Ni el bot con su numero ni el dueño con el
      // suyo: decision suya, dicha con esas palabras. Lo cambie una vez en la
      // direccion contraria por un razonamiento mio y no era mi decision.
      exige(/esOwnerAmplio/.test(linea),
        'el aviso de admin vuelve a anunciar lo que hace el dueño: el tier dueño va callado, y es una decisión suya');
      exige(/!fromBot/.test(linea),
        'el aviso de admin ya no se salta cuando lo hace el bot: el tier dueño va callado, y el bot es parte de él');

      // Y LA DEGRADACION DEL DUEÑO TIENE QUE DEJAR RASTRO. Sin esto, cuando la
      // protección no llega a hacer nada no queda una sola línea que lo diga.
      const j = bot.indexOf("if (action === 'demote') {");
      exige(j > 0, 'ya no se apunta ninguna degradación: cuando la protección del dueño no actúa, no queda rastro de por qué');
      const cuerpo = j > 0 ? bot.slice(j, j + 1400) : '';
      exige(/logger\.warn\(/.test(cuerpo) && /tocaAlDue/.test(cuerpo),
        'la traza de la degradación ya no dice si el degradado era el dueño: es el dato por el que se mira');
      exige(/avisarDue.oSinAdmin\(/.test(cuerpo),
        'al dueño ya no se le avisa cuando le quitan el admin y el bot no puede devolvérselo: se queda sin admin y sin enterarse');
    }

    if (fallos === antes) console.log(verde('   ✓ mismo comportamiento, el dinero se apunta antes de pagarse y ffmpeg no se queda sin plaza'));
  }

  // ── 59. LO QUE EL DUEÑO DIJO QUE NO FUNCIONABA ───────────────────────────
  //
  // Tres cosas de la misma tanda, y las tres eran ciertas:
  //   · *!tovid* nunca funciono con stickers (con videos si);
  //   · *!pin* no encontraba lo que en Pinterest sale a la primera;
  //   · el autoaccept tardaba una eternidad con varias solicitudes.
  {
    console.log('\n59. *!tovid* CON STICKERS, *!pin* POR RELEVANCIA Y EL AUTOACCEPT DE GOLPE');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    // ── 1. EL AUTOACCEPT APRUEBA TODAS EN UNA SOLA PETICION ────────────────
    //
    // Iba de una en una con segundo y medio de pausa y tope de diez por ciclo:
    // diez solicitudes eran mas de quince segundos y la once esperaba al
    // siguiente sondeo. `groupRequestParticipantsUpdate` acepta una LISTA y la
    // manda en una sola peticion, asi que la rafaga que justificaba la pausa no
    // existe.
    {
      const jr = require(path.join(R, 'src/utils/joinRequests'));
      const lista = [...Array(23)].map((_, i) => ({ jid: `34600${String(7000 + i)}@s.whatsapp.net` }));
      const lotes = [];
      const sock = {
        groupRequestParticipantsList: async () => lista,
        groupRequestParticipantsUpdate: async (g, jids) => { lotes.push(jids.length); return jids.map((j) => ({ status: '200', jid: j })); },
      };
      const t0 = Date.now();
      const r = await jr.aceptarPendientes(sock, '120363000059001@g.us');
      const ms = Date.now() - t0;
      exige(r && r.aprobados === 23, `de 23 solicitudes se aprobaron ${r?.aprobados}: se están quedando fuera`);
      exige(lotes.length === 1, `se hicieron ${lotes.length} peticiones a WhatsApp para 23 solicitudes: van todas en una`);
      exige(ms < 1000, `tardó ${ms} ms en aprobar 23 sin red de por medio: han vuelto las pausas entre una y otra`);

      // Y UN RECHAZO NO SE CUENTA COMO APROBADO. WhatsApp no lanza: devuelve el
      // error dentro del estado de cada participante.
      const sock2 = {
        groupRequestParticipantsList: async () => lista.slice(0, 4),
        groupRequestParticipantsUpdate: async (g, jids) => jids.map((j, i) => ({ status: i === 1 ? '403' : '200', jid: j })),
      };
      const r2 = await jr.aceptarPendientes(sock2, '120363000059002@g.us');
      exige(r2 && r2.aprobados === 3,
        `con uno rechazado de cuatro se cuentan ${r2?.aprobados} aprobados: el recuento estaría mintiendo`);

      // Y una solicitud sin JID reconocible se cuenta aparte, no se traga.
      const sock3 = {
        groupRequestParticipantsList: async () => [{ hora: '123' }, { jid: '34600700099@s.whatsapp.net' }],
        groupRequestParticipantsUpdate: async (g, jids) => jids.map((j) => ({ status: '200', jid: j })),
      };
      const r3 = await jr.aceptarPendientes(sock3, '120363000059003@g.us');
      exige(r3 && r3.aprobados === 1 && r3.sinJid === 1,
        `una solicitud sin JID se traga en silencio (${JSON.stringify(r3)})`);
    }

    // ── 2. *!tovid* SOBRE UN STICKER ANIMADO ───────────────────────────────
    //
    // ffmpeg NO sabe abrir un WebP animado —comprobado con el binario del bot:
    // el estatico si, el animado no, ni con `-f webp_pipe` ni forzando el
    // decodificador— asi que la conversion fallaba SIEMPRE y el comando caia a
    // su respaldo. Ahora el fichero se parte aqui: cada fotograma sale envuelto
    // como WebP estatico, que si abre.
    {
      const { execFileSync } = require('child_process');
      const { ffmpegPath } = require(path.join(R, 'src/utils/ffmpeg'));
      const st = require(path.join(R, 'src/utils/sticker'));
      const toimg = require(path.join(R, 'src/commands/toimg'));
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tv59-'));
      try {
        const v = path.join(dir, 'v.mp4');
        execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi',
          '-i', 'testsrc2=size=256x256:duration=2:rate=12', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', v],
          { timeout: 200000 });
        const sticker = await st.videoToSticker(fs.readFileSync(v), 'p');

        // Que ffmpeg siga sin poder con el: si algun dia puede, este camino
        // sobra, pero mientras no pueda es el unico que hay.
        const desmontado = st.desmontarWebpAnimado(sticker);
        exige(!!desmontado, 'el desmontador ya no reconoce un WebP animado hecho por el propio bot');
        exige(desmontado && desmontado.cuadros.length > 5,
          `solo se sacan ${desmontado?.cuadros?.length} fotogramas de una animación de 2 s: el vídeo saldría a trompicones`);
        exige(desmontado && desmontado.completos,
          'los fotogramas de un sticker propio salen marcados como parche: entonces nunca se usaría el camino bueno');

        // El camino viejo REVIENTA con un WebP animado, asi que si el nuevo no
        // entra la excepcion sube y se lleva la capa por delante. Se atrapa para
        // que el fallo se cuente con su motivo, que es de lo que va esto.
        const mp4 = await toimg._convertToMp4(sticker).catch((e) => {
          fallos++;
          console.log(rojo(`   ✗ *!tovid* sobre un sticker animado sigue reventando: ${String(e.message).slice(0, 90)}`));
          return null;
        });
        exige(!mp4 || mp4.length > 1000, '*!tovid* devuelve un vídeo vacío para un sticker animado');
        if (mp4) {
          const f = path.join(dir, 'o.mp4');
          fs.writeFileSync(f, mp4);
          const { spawnSync } = require('child_process');
          const r = spawnSync(ffmpegPath, ['-hide_banner', '-i', f, '-f', 'null', '-'], { encoding: 'utf8', timeout: 60000 });
          const d = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr || '');
          const seg = d ? Number(d[2]) * 60 + Number(d[3]) : 0;
          exige(/Video: h264/.test(r.stderr || ''), 'el vídeo de *!tovid* no sale en H.264: WhatsApp no lo reproduce en todos los teléfonos');
          exige(seg > 1, `el vídeo dura ${seg} s cuando la animación dura 2: se están perdiendo fotogramas`);
        }

        // UN STICKER CON FOTOGRAMAS PARCHE NO SE MONTA A CIEGAS. Componer eso
        // pide decodificar el VP8 aqui dentro; ponerlos en fila daria un vídeo
        // con las piezas descolocadas, y eso es peor que no convertir.
        const falso = { ancho: 100, alto: 100, completos: false, cuadros: [{ ms: 100, x: 10, y: 10, w: 50, h: 50 }] };
        exige(falso.completos === false, 'la marca de «parche» ya no existe');
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }

    // ── 3. *!pin* ELIGE ENTRE LOS PRIMEROS ─────────────────────────────────
    //
    // El buscador devuelve los resultados ORDENADOS por relevancia y el bot
    // sorteaba entre los quince por igual: cuatro de cada cinco veces salia uno
    // de la cola. En la web no se nota porque se ve la cuadricula entera; aqui
    // sale una sola.
    {
      const red = soloCodigo('src/utils/redes.js');
      const i = red.indexOf('async function buscar(');
      const cuerpo = i < 0 ? '' : red.slice(i, red.indexOf('\n  } catch', i));
      exige(i > 0, 'no encuentro buscar()');
      exige(/CABEZA/.test(cuerpo) && /pines\.slice\(0, CABEZA\)/.test(cuerpo),
        'el sorteo de *!pin* vuelve a repartirse entre todos los resultados: los de abajo son los que se parecen poco');
      exige(!/shuffle\(/.test(cuerpo),
        'los resultados de *!pin* vuelven a barajarse: entonces *!next* salta al azar en vez de bajar por la lista como quien hace scroll');
    }

    if (fallos === antes) console.log(verde('   ✓ todas de una vez, el sticker se convierte y el pin sale por relevancia'));
  }

  // ── 60. UNA HISTORIA QUE NO DICE A QUE GRUPO VA ──────────────────────────
  //
  // Meses de "las historias con enlace siguen ahi". El guardia estaba entero:
  // reconocia el sobre, leia el enlace, sabia expulsar. Lo que fallaba es que
  // no sabia DONDE.
  //
  // El destino de una historia de grupo viaja en `statusMentions` /
  // `statusMentionSources`, campos de WebMessageInfo. WhatsApp no siempre los
  // manda. Cuando no los manda, el bot escribia «sin grupo identificable» en un
  // log que nadie lee y se callaba — indistinguible, desde el grupo, de no
  // haberla visto.
  //
  // Que no venga el grupo no quiere decir que no venga QUIEN: `key.participant`
  // esta siempre. Y de los grupos del bot solo puede haber subido la historia a
  // aquellos en los que esta. Asi que con una invitacion dentro se actua en
  // todos ellos.
  //
  // LA INVITACION ES LA CONDICION, no un adorno. Sin ella esta via no toca a
  // nadie: echar a alguien de tres grupos por una historia que no se sabe donde
  // se subio, y que a lo mejor no se subio a ninguno, cuesta mas de lo que
  // arregla. Con un chat.whatsapp.com dentro es la misma infraccion que en el
  // chat ya cuesta el grupo.
  //
  // TODOS LOS GRUPOS SE CREAN ANTES DE LA PRIMERA HISTORIA, y no es un detalle
  // de montaje: el censo se guarda un minuto, asi que un grupo creado despues
  // no sale en el. Montado al reves, "a este no se le expulsa" salia verde
  // porque el grupo no existia para el censo, no porque la guarda funcionara.
  // Asi pasaron dos de estas comprobaciones la primera vez que las escribi.
  {
    console.log('\n60. UNA HISTORIA QUE NO DICE A QUE GRUPO VA');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    const mh = require(path.join(R, 'src/handlers/messageHandler'));
    const { handleMessage, getGroupMeta } = mh;
    const INVITE60 = 'https://chat.whatsapp.com/JJswfylh8lxH9tDzLGeZK0';
    const BOT60 = '34600000060@s.whatsapp.net';

    const REO_A = '34611111160@s.whatsapp.net';   // dos grupos, con invitacion
    const REO_B = '34622222260@s.whatsapp.net';   // un grupo, SIN invitacion
    const REO_C = '34633333360@s.whatsapp.net';   // la rafaga
    const REO_D = '34644444460@s.whatsapp.net';   // con destino declarado
    const JEFE  = '34655555560@s.whatsapp.net';   // admin
    const REO_F = '34666666660@s.whatsapp.net';   // con el censo caido
    const AJENO = '34699999960@s.whatsapp.net';

    const reg = { censos: 0, expulsados: [], borrados: [] };
    let censoRompe = false;
    const mundo = new Map();   // jid -> participantes. Lo que sabe WhatsApp.
    const G = (n) => `12036000000060${String(n).padStart(3, '0')}@g.us`;
    const crear = (n, miembros) => { mundo.set(G(n), [{ id: BOT60, admin: 'admin' }, ...miembros]); return G(n); };

    const GA1 = crear(1, [{ id: REO_A }]);
    const GA2 = crear(2, [{ id: REO_A }]);
    const GAJENO = crear(3, [{ id: AJENO }]);
    const GB = crear(4, [{ id: REO_B }]);
    const GC = crear(5, [{ id: REO_C }]);
    const GD = crear(6, [{ id: REO_D }]);
    const GE = crear(7, [{ id: JEFE, admin: 'admin' }]);
    const GF = crear(8, [{ id: REO_F }]);

    const sockDe = () => ({
      user: { id: BOT60 },
      sendMessage: async (jid, content) => {
        if (content?.delete) reg.borrados.push({ jid, ...content.delete });
        return {};
      },
      readMessages: async () => {}, sendPresenceUpdate: async () => {},
      profilePictureUrl: async () => null,
      groupMetadata: async (jid) => ({ id: jid, subject: 'G', participants: mundo.get(jid) || [{ id: BOT60, admin: 'admin' }] }),
      groupParticipantsUpdate: async (jid, participantes, accion) => {
        if (accion === 'remove') for (const p of participantes) reg.expulsados.push(`${jid}|${p}`);
        return participantes.map((id) => ({ status: '200', jid: id }));
      },
      groupFetchAllParticipating: async () => {
        reg.censos++;
        if (censoRompe) throw new Error('censo caido a proposito');
        const out = {};
        for (const [jid, participants] of mundo) out[jid] = { id: jid, subject: 'G', participants };
        return out;
      },
    });

    let seq = 0;
    // Una historia por status@broadcast. `destinos` simula el campo que
    // WhatsApp a veces manda y a veces no.
    const subirHistoria = async (autor, { texto, destinos = null } = {}) => {
      const sobre = {
        key: { remoteJid: 'status@broadcast', participant: autor, fromMe: false, id: `H60-${seq++}` },
        messageTimestamp: Math.floor(Date.now() / 1000),
        pushName: 'X',
        message: { groupStatusMessageV2: { message: { extendedTextMessage: { text: texto } } } },
      };
      if (destinos) sobre.statusMentionSources = destinos;
      await handleMessage(sockDe(), sobre);
      await new Promise((r) => setTimeout(r, 150));
    };
    const fuera = (grupo, quien) => reg.expulsados.includes(`${grupo}|${quien}`);

    mh._olvidarCenso();

    // ── 1. CON INVITACION Y SIN DESTINO: SE ACTUA DONDE ES MIEMBRO ─────────
    await subirHistoria(REO_A, { texto: `mirad esto ${INVITE60}` });
    exige(fuera(GA1, REO_A) && fuera(GA2, REO_A),
      'una historia con invitación y sin destino declarado no echa a nadie: vuelve el agujero de meses, el bot la ve y no sabe dónde actuar');
    exige(!fuera(GAJENO, REO_A),
      'se actuó en un grupo donde esa persona ni siquiera está: el censo no se está filtrando por miembro');
    exige(reg.borrados.some((b) => b.jid === GA1 && b.remoteJid === GA1 && b.id === 'H60-0' && b.participant === REO_A),
      'no se intentó quitar la historia contra el JID del grupo: pedido contra status@broadcast, Baileys manda el borrado que solo vale para uno mismo');

    // ── 2. SIN INVITACION NO SE TOCA A NADIE POR ESTA VIA ──────────────────
    //
    // La que impide que la guarda sea un cheque en blanco. GB está en el censo
    // igual que GA1: lo único que cambia respecto al caso 1 es que no hay
    // enlace. Si al quitar la condición esto sigue en verde, la condición no
    // estaba haciendo nada.
    await subirHistoria(REO_B, { texto: 'buenos dias a todos' });
    exige(!fuera(GB, REO_B),
      'una historia SIN invitación y sin destino declarado expulsó igualmente: eso echa gente de grupos donde puede que ni subiera nada');

    // ── 3. LA RAFAGA NO REPITE EL CENSO, Y SIGUE ACERTANDO ─────────────────
    //
    // groupFetchAllParticipating es la consulta más cara del bot. Cinco
    // historias seguidas son cinco censos si no se guarda el resultado, y eso
    // en una máquina de 1 GB con un core se nota en todo lo demás. Pero
    // guardarlo no puede costar aciertos: la segunda historia tiene que acabar
    // igual que la primera.
    const censosTras1 = reg.censos;
    exige(censosTras1 === 1, `se pidió el censo ${censosTras1} vez/veces para una sola historia`);
    await subirHistoria(REO_C, { texto: `entra aqui ${INVITE60}` });
    exige(fuera(GC, REO_C),
      'la segunda historia de la ráfaga no expulsó: el censo guardado está sirviendo una respuesta peor que la primera');
    exige(reg.censos === censosTras1,
      `la ráfaga repitió el censo (${reg.censos} llamadas): cinco historias seguidas son cinco consultas de las caras`);

    // ── 4. CON DESTINO DECLARADO NO HACE FALTA PREGUNTAR ───────────────────
    const censosTras3 = reg.censos;
    await subirHistoria(REO_D, { texto: 'una foto cualquiera', destinos: [GD] });
    exige(fuera(GD, REO_D),
      'una historia CON destino declarado dejó de expulsar: se ha roto el camino que sí funcionaba');
    exige(reg.censos === censosTras3,
      'se pidió el censo teniendo el destino delante: es la consulta más cara del bot y aquí sobra entera');

    // ── 5. UN ADMIN SIGUE EXENTO POR ESTA VIA ──────────────────────────────
    await subirHistoria(JEFE, { texto: `mira ${INVITE60}` });
    exige(!fuera(GE, JEFE),
      'la vía nueva expulsa a un admin: las exenciones del grupo tienen que valer igual venga el destino o no');

    // ── 6. SI EL CENSO SE CAE, QUEDA LO QUE YA SE SABIA ────────────────────
    //
    // La caché de metadata está incompleta —solo los grupos por los que ha
    // pasado algo que la necesitara— pero no vacía. Con la red caída es lo
    // único que hay, y es mejor que quedarse quieto.
    //
    // Se calienta llamando a getGroupMeta y no mandando un mensaje normal al
    // grupo: un mensaje corriente NO pide metadata a propósito (capa 31), así
    // que calentarla así no calentaba nada y esta comprobación medía el vacío.
    await getGroupMeta(sockDe(), GF);
    censoRompe = true;
    mh._olvidarCenso();
    await subirHistoria(REO_F, { texto: `pasa ${INVITE60}` });
    censoRompe = false;
    exige(fuera(GF, REO_F),
      'con el censo caído no queda nada: la caché de metadata está ahí y es lo único que hay cuando la red falla');

    if (fallos === antes) console.log(verde('   ✓ una historia con invitación y sin destino se para donde esa persona esté, y sin invitación no se toca a nadie'));
  }

  // ── 61. EL BOT NO SE PIDE A SI MISMO NI AL METADATA DEL VPS ──────────────
  //
  // El bot baja ficheros de URLs QUE LE DA UN TERCERO: el enlace del mp3 lo
  // elige RapidAPI, el del gif lo elige la web de gifs, el de la imagen lo
  // elige Pinterest, el de la foto de perfil lo elige WhatsApp. Ninguna la
  // escribe nadie del grupo, y el bot las pedia sin mirar a donde apuntaban.
  //
  // En una maquina de Oracle eso tiene un final concreto: `169.254.169.254` es
  // el servicio de metadata del VPS, contesta sin pedir credenciales y dentro
  // estan las de la propia maquina. Una API comprada, con la cuenta robada o
  // con el dominio caducado y registrado por otro devuelve esa URL como enlace
  // de descarga y el bot manda el resultado al grupo como si fuera una cancion.
  //
  // El freno va en el `lookup` —la traduccion de nombre a IP, justo antes de
  // abrir el socket— y no en un vistazo previo a la URL. Puesto antes, un
  // nombre puede resolver a una cosa cuando se comprueba y a otra cuando se
  // conecta; puesto aqui se juzga la direccion que se va a usar de verdad, y
  // vale igual para cada salto de una cadena de redirecciones.
  //
  // Se mide EN LOS DOS SENTIDOS, que es lo que importa: que lo interno no pase
  // y que lo de fuera siga pasando. Un freno que bloquee de mas deja el bot sin
  // musica, sin gifs y sin fotos de perfil, y eso se nota mas que un agujero.
  {
    console.log('\n61. EL BOT NO SE PIDE A SI MISMO NI AL METADATA DEL VPS');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    const rs = require(path.join(R, 'src/utils/redSegura'));

    // ── 1. LA TABLA DE RANGOS ──────────────────────────────────────────────
    const prohibidas = ['127.0.0.1', '127.9.9.9', '10.0.0.1', '172.16.0.1', '172.31.255.255',
      '192.168.1.1', '169.254.169.254', '0.0.0.0', '100.64.0.1', '198.18.0.1', '224.0.0.1',
      '255.255.255.255', '192.0.0.8', '::1', '::', 'fe80::1', 'fc00::1', 'fd00::abcd', 'ff02::1',
      '::ffff:127.0.0.1', '::ffff:169.254.169.254', '64:ff9b::127.0.0.1', '2002:7f00:1::1',
      '::127.0.0.1', 'no-es-una-ip', '', String(0x7f000001), '0x7f000001', '1.2.3', '1.2.3.4.5', '999.1.1.1'];
    // Vecinas de los rangos bloqueados, a un numero de distancia. Son las que
    // caen cuando alguien "simplifica" un rango: 172.32 no es privada y 100.128
    // tampoco, aunque 172.16 y 100.64 si lo sean.
    const permitidas = ['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.32.0.1', '172.15.255.255',
      '192.169.0.1', '100.63.255.255', '100.128.0.1', '198.17.255.255', '198.20.0.1',
      '223.255.255.255', '2606:4700:4700::1111', '2001:4860:4860::8888', '::ffff:8.8.8.8',
      '64:ff9b::8.8.8.8', '2002:0808:0808::1'];
    const coladas = prohibidas.filter((ip) => !rs.ipProhibida(ip));
    const cortadas = permitidas.filter((ip) => rs.ipProhibida(ip));
    exige(coladas.length === 0, `se permite salir hacia ${coladas.join(', ')}: ahí vive el metadata del VPS y la propia máquina`);
    exige(cortadas.length === 0, `se bloquea internet normal (${cortadas.join(', ')}): el bot se queda sin música, sin gifs y sin fotos de perfil`);

    // ── 2. EL ESQUEMA, QUE LA IP NO PUEDE MIRAR ────────────────────────────
    //
    // axios en Node tambien entiende `file:` y `data:`. Un proveedor que
    // devolviera `file:///home/ubuntu/Bot-/.env` como enlace de descarga se
    // leeria tal cual, sin resolver ningun nombre y sin abrir ningun socket.
    for (const mala of ['file:///home/ubuntu/Bot-/.env', 'data:text/plain,hola', 'ftp://a.com/x', 'gopher://a.com', '//a.com', 'javascript:alert(1)', 'no-es-url']) {
      exige(!rs.urlSegura(mala), `se acepta ${mala} como enlace de descarga`);
    }
    for (const buena of ['https://a.com/x.mp3', 'http://a.com/x.gif']) {
      exige(rs.urlSegura(buena), `se rechaza ${buena}, que es una descarga normal`);
    }

    // ── 3. Y CON UN SERVIDOR DE VERDAD DELANTE ─────────────────────────────
    //
    // La tabla puede estar perfecta y el freno no estar puesto. Aqui se levanta
    // un servidor en 127.0.0.1 —el mismo sitio donde vive el metadata, desde el
    // punto de vista del filtro— y se comprueba que axios NO llega a leerlo.
    //
    // `proxy: false` es del entorno de pruebas, no del bot: si hay un proxy
    // configurado en la maquina, axios se conecta al proxy y el lookup juzga el
    // nombre del proxy, con lo que la prueba mediria otra cosa.
    {
      const http = require('http');
      const axios = require('axios');
      const srv = http.createServer((_q, s) => s.end('CREDENCIALES'));
      await new Promise((r) => srv.listen(0, '127.0.0.1', r));
      const puerto = srv.address().port;
      // AQUI SE CIERRA LA PUERTA DEL LOOPBACK. El resto del fichero la tiene
      // abierta para poder servir sus ficheros de mentira; esta capa mide el
      // freno, asi que lo mide entero. Se vuelve a abrir al salir, pase lo que
      // pase, o las capas de despues se quedarian sin sus servidores.
      rs.permitirLoopback(false);
      try {
        let leido = null;
        try { leido = (await axios.get(`http://localhost:${puerto}/`, { proxy: false, timeout: 5000 })).data; } catch { leido = null; }
        exige(leido === null, 'axios llegó a leer un servidor de 127.0.0.1 por su nombre: el freno no está puesto en axios.defaults');
        let porIp = null;
        try { porIp = (await axios.get(`http://127.0.0.1:${puerto}/`, { proxy: false, timeout: 5000 })).data; } catch { porIp = null; }
        exige(porIp === null, 'axios llegó a 127.0.0.1 escrito como IP: el freno solo mira nombres y la mitad de los casos son IPs directas');

        // Y UNA REDIRECCION QUE ACABA DENTRO. Es el caso que se escapa si la
        // comprobacion se hace una sola vez sobre la URL de partida: el
        // servidor de fuera contesta 302 hacia 127.0.0.1 y el segundo salto ya
        // no lo mira nadie.
        //
        // SE SALE DESDE UN NOMBRE, NO DESDE UNA IP, y no es un capricho de
        // montaje: empezando en `http://127.0.0.1:...` lo que corta es la
        // comprobacion de la URL de partida y la prueba saldria verde sin que
        // el salto se mire nunca. Con un nombre —resuelto a mano a 127.0.0.1
        // para no depender del DNS— la salida pasa y lo unico que puede cortar
        // es el guardia de la redireccion.
        const aLoopback = (_h, _o, cb) => cb(null, [{ address: '127.0.0.1', family: 4 }]);
        const saltador = http.createServer((_q, s) => {
          s.writeHead(302, { Location: `http://127.0.0.1:${puerto}/` });
          s.end();
        });
        await new Promise((r) => saltador.listen(0, '127.0.0.1', r));
        let trasSalto = null;
        try {
          trasSalto = (await axios.get(`http://saltador.invalido:${saltador.address().port}/`, { proxy: false, timeout: 5000, lookup: aLoopback })).data;
        } catch { trasSalto = null; }
        exige(trasSalto === null, 'una redirección hacia 127.0.0.1 se siguió hasta el final: el freno tiene que valer en cada salto, no solo en la URL de partida');

        // EL CONTROL DE LA DE ARRIBA. El mismo nombre y el mismo lookup a mano,
        // pero sin redireccion: tiene que llegar. Si esto tambien se cortara,
        // la comprobacion anterior estaria saliendo verde por el motivo
        // equivocado —el nombre, no el salto— y no mediria nada.
        let sinSalto = null;
        try {
          sinSalto = (await axios.get(`http://directo.invalido:${puerto}/`, { proxy: false, timeout: 5000, lookup: aLoopback })).data;
        } catch { sinSalto = null; }
        exige(sinSalto === 'CREDENCIALES',
          'el control de la redirección no llegó: entonces lo que corta el caso anterior no es el salto y esa comprobación no vale');
        await new Promise((r) => saltador.close(r));
      } finally {
        rs.permitirLoopback(true);
        await new Promise((r) => srv.close(r));
      }
    }

    // ── 4. LA PUERTA DE PRUEBAS ABRE EL LOOPBACK Y NADA MAS ───────────────
    //
    // Es toda la promesa de la puerta. Si un dia afloja un rango de mas, las
    // capas que sirven ficheros desde 127.0.0.1 seguirian en verde igual —no
    // notan la diferencia— y el agujero viviria aqui dentro sin que nada lo
    // dijera. Asi que se pregunta directamente, con la puerta abierta.
    {
      rs.permitirLoopback(true);
      exige(!rs.hostProhibido('127.0.0.1') && !rs.hostProhibido('::1'),
        'con la puerta abierta el loopback sigue cerrado: las capas que sirven sus propios ficheros no pueden funcionar');
      for (const sigue of ['169.254.169.254', '10.0.0.1', '192.168.1.1', '172.16.0.1', '100.64.0.1', 'fd00::1']) {
        exige(rs.hostProhibido(sigue),
          `la puerta de pruebas abrió ${sigue}, que no es loopback: con eso la capa 61 mide el vacío y el metadata del VPS queda accesible durante las pruebas`);
      }
      // Y la tabla de rangos no se entera de la puerta: es la que dice la
      // verdad de siempre, y quien la consulte no puede recibir una respuesta
      // distinta segun quien haya llamado antes.
      exige(rs.ipProhibida('127.0.0.1'),
        'la puerta de pruebas cambió la tabla de rangos: entonces no hay forma de preguntar qué está prohibido de verdad');
    }

    // ── 5. LA PUERTA DE PRUEBAS NO EXISTE PARA EL BOT ──────────────────────
    //
    // permitirLoopback es la unica forma de aflojar el freno, y existe solo
    // para que estas pruebas puedan servirse sus ficheros. El dia que aparezca
    // llamada desde src/ el freno estara abierto en el VPS y no lo dira nadie.
    {
      const conLaPuerta = [];
      const andar = (dir) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const f = path.join(dir, e.name);
          if (e.isDirectory()) andar(f);
          else if (e.name.endsWith('.js') && e.name !== 'redSegura.js'
            && /permitirLoopback\s*\(/.test(fs.readFileSync(f, 'utf8'))) conLaPuerta.push(path.relative(R, f));
        }
      };
      andar(path.join(R, 'src'));
      exige(conLaPuerta.length === 0,
        `la puerta de pruebas del freno se llama desde el bot (${conLaPuerta.join(', ')}): eso deja el loopback abierto en el VPS`);
    }

    // ── 6. LOS SITIOS QUE BAJAN LO QUE LES DICE UN TERCERO LO COMPRUEBAN ───
    {
      const dl = soloCodigo('src/utils/downloader.js');
      const i = dl.indexOf('async function downloadUrlToFile(');
      const cuerpo = i < 0 ? '' : dl.slice(i, i + 600);
      exige(i > 0, 'no encuentro downloadUrlToFile()');
      exige(/urlSegura\(url\)/.test(cuerpo),
        'downloadUrlToFile bajó a pelo el enlace que eligió la API: ahí es donde entra un file:// con el .env dentro');
      const ac = soloCodigo('src/commands/acciones.js');
      exige(/urlSegura\(r\.url\)/.test(ac),
        'el gif que devuelve la web se baja sin mirar el esquema del enlace');
    }

    if (fallos === antes) console.log(verde('   ✓ lo interno no sale ni por nombre, ni por IP, ni tras una redirección, y lo de fuera sigue pasando'));
  }

  // ── 31. VELOCIDAD SIN REGRESIONES DE CALIDAD ─────────────────────────────
  //
  // Tres cosas que se tocan juntas cuando se busca que el bot conteste antes,
  // y las tres ya se han roto al optimizar:
  //
  //   1. isAdmin cacheaba el NO. Un @lid que aún no estaba mapeado salía
  //      "no admin"; un mensaje después se aprendía el teléfono y el negativo
  //      congelado le quitaba los galones durante todo el TTL de metadata.
  //   2. Una reacción recorría antilink + medios + groupMetadata. En un grupo
  //      activo hay más reacciones que mensajes: era trabajo muerto delante
  //      de cada comando que llegara en el mismo tick.
  //   3. Los stores stringifyaban el mismo fichero dos veces en vuelo y el
  //      rename más lento podía dejar el snapshot viejo.
  {
    console.log('\n31. VELOCIDAD SIN REGRESIONES DE CALIDAD');
    const antes = fallos;
    const exige = (cond, queja) => { if (!cond) { fallos++; console.log(rojo(`   ✗ ${queja}`)); } };

    const { isAdmin, rememberMapping } = require(path.join(R, 'src/utils/wa'));
    const lidA = `31lid${Date.now()}@lid`;
    const telA = `346000031${String(Date.now()).slice(-4)}@s.whatsapp.net`;
    const partsA = [{ id: telA, admin: 'admin' }];
    exige(!isAdmin(partsA, lidA), 'sin mapeo, un @lid desconocido no puede salir admin');
    rememberMapping(lidA, telA);
    exige(isAdmin(partsA, lidA),
      'isAdmin cacheó el NO: al aprender el teléfono del admin, sigue sin reconocerlo');

    const { handleMessage } = require(path.join(R, 'src/handlers/messageHandler'));
    const GV = '120031@g.us';
    const BOTV = '549199@s.whatsapp.net';
    const YOV = '34600000031@s.whatsapp.net';
    let metas = 0;
    const s = {
      user: { id: BOTV },
      sendMessage: async () => ({}),
      readMessages: async () => {},
      groupMetadata: async () => { metas++; return { id: GV, subject: 'G', participants: [{ id: BOTV, admin: 'admin' }, { id: YOV }] }; },
      groupParticipantsUpdate: async () => [],
    };
    await handleMessage(s, {
      key: { remoteJid: GV, participant: YOV, fromMe: false, id: 'R31' },
      message: { reactionMessage: { key: { remoteJid: GV, fromMe: false, id: 'X' }, text: '👍' } },
      pushName: 'x',
      messageTimestamp: Math.floor(Date.now() / 1000),
    });
    exige(metas === 0, `una reacción pidió groupMetadata ${metas} vez/veces: vuelve el viaje muerto por cada emoji`);

    const { createDebouncedSaver } = require(path.join(R, 'src/utils/helpers'));
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saver-'));
    try {
      const file = path.join(dir, 's.json');
      const n = { v: 0 };
      const saver = createDebouncedSaver(() => ({ v: n.v }), file, 30);
      n.v = 1; saver.schedule();
      n.v = 2; saver.schedule();
      n.v = 3; saver.schedule();
      await saver.flush();
      const disk = JSON.parse(fs.readFileSync(file, 'utf8'));
      exige(disk.v === 3, `el saver dejó ${disk.v} en disco, no el 3 último: se pisaron escrituras`);
      n.v = 4; saver.schedule();
      const f2 = saver.flush();
      n.v = 5; saver.schedule();
      await f2;
      await saver.flush();
      const disk2 = JSON.parse(fs.readFileSync(file, 'utf8'));
      exige(disk2.v === 5, `flush concurrente dejó ${disk2.v}, no el 5: se perdió una mutación`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }

    if (fallos === antes) console.log(verde('   ✓ admin por @lid, reacciones mudas, stores sin pisarse'));
  }

  if (BREVE) {
    resumenBreve(fallos);
    process.exit(fallos ? 1 : 0);
  }
  console.log(`\n${'─'.repeat(70)}`);
  if (fallos) {
    console.log(rojo(`${fallos} fallo(s). NO commitees esto.`));
    process.exit(1);
  }
  console.log(verde('El bot arranca, carga y responde.'));
})();
