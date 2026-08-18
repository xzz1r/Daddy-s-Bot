#!/usr/bin/env node
// Revisión de estado de la VPS. Un solo comando que contesta lo único que
// importa: ¿está todo bien puesto o falta algo?
//
//   npm run estado
//
// Existe porque verificar a mano — mirar el commit, contar las keys del .env,
// buscar si pm2-logrotate quedó instalado, comprobar el disco — son seis cosas
// distintas en seis sitios distintos, y cualquiera de ellas se olvida. Aquí
// salen todas juntas con un ✔ o una ✘ delante.
//
// NUNCA imprime una key ni ningún secreto: solo dice cuántas hay y si valen.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
// Todo lleva timeout: si la red va mal, `git fetch` puede quedarse colgado
// minutos y esta revisión tiene que terminar siempre, aunque sea con dudas.
const sh = (cmd, ms = 15000) => {
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: ms }).trim(); }
  catch { return ''; }
};

let problemas = 0, avisos = 0;
const bien  = (t) => console.log(`  \x1b[32m✔\x1b[0m  ${t}`);
const mal   = (t, arreglo) => { problemas++; console.log(`  \x1b[31m✘\x1b[0m  ${t}`); if (arreglo) console.log(`      \x1b[36m→ ${arreglo}\x1b[0m`); };
const aviso = (t, arreglo) => { avisos++; console.log(`  \x1b[33m!\x1b[0m  ${t}`); if (arreglo) console.log(`      \x1b[36m→ ${arreglo}\x1b[0m`); };
const titulo = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);

console.log('\n\x1b[1mESTADO DEL BOT\x1b[0m');

// ─── Código ──────────────────────────────────────────────────────────────────
titulo('Código');
const local = sh('git -C ' + RAIZ + ' rev-parse --short HEAD');
const rama = sh('git -C ' + RAIZ + ' rev-parse --abbrev-ref HEAD');
if (!local) {
  mal('esto no parece un repositorio git');
} else {
  sh(`git -C ${RAIZ} fetch origin ${rama} --quiet`, 20000);
  const remoto = sh(`git -C ${RAIZ} rev-parse --short origin/${rama}`);
  const detras = Number(sh(`git -C ${RAIZ} rev-list --count HEAD..origin/${rama}`) || 0);
  if (!remoto) aviso(`commit ${local} (no pude consultar el remoto: ¿sin internet?)`);
  else if (detras === 0) bien(`commit ${local} — al día`);
  else mal(`commit ${local}, faltan ${detras} ${detras === 1 ? 'actualización' : 'actualizaciones'} (la última es ${remoto})`,
    `git pull origin ${rama} && npm install --omit=dev && pm2 restart all --update-env`);

  // Decir "hay cambios locales" sin decir CUÁLES no sirve de nada: nadie sabe
  // qué mirar. Se listan. Y package-lock.json va aparte porque lo reescribe
  // `npm install` él solo: no es un cambio de nadie y avisar de eso es ruido.
  const sucio = sh(`git -C ${RAIZ} status --porcelain`).split('\n').filter(Boolean);
  const soloLock = sucio.length > 0 && sucio.every(l => /package-lock\.json$/.test(l));
  if (soloLock) {
    bien('sin cambios propios (npm reescribió package-lock.json, es normal)');
  } else if (sucio.length) {
    // Se trima CADA línea antes de quitarle el estado. `sh()` trima la salida
    // entera, así que la primera línea llega ya sin su espacio inicial y las
    // demás no: cortar por posición fija dejaba una "M" pegada al primer nombre.
    aviso(`hay cambios locales sin guardar: ${sucio.map(l => l.trim().replace(/^\S+\s+/, '')).join(', ')}`,
      'git checkout -- .   (los descarta y deja el pull limpio)');
  } else {
    bien('sin cambios locales');
  }
}

// ─── Configuración ───────────────────────────────────────────────────────────
titulo('Configuración (.env)');
const envPath = path.join(RAIZ, '.env');
if (!fs.existsSync(envPath)) {
  mal('no existe el fichero .env', 'cp .env.example .env  y rellénalo');
} else {
  const env = {};
  for (const linea of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }

  // Keys de RapidAPI: se cuentan, NO se enseñan.
  const keys = String(env.RAPIDAPI_KEY || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!keys.length) aviso('sin RAPIDAPI_KEY: !play tira solo de SoundCloud, que falla más', 'añade la key al .env');
  else if (keys.length === 1) aviso('solo 1 key de RapidAPI: cuando agote el cupo del mes, !play cae a SoundCloud',
    'pon una segunda separada por coma: RAPIDAPI_KEY=una,otra');
  else bien(`${keys.length} keys de RapidAPI — cuando una agota el cupo, salta a la siguiente`);
  const cortas = keys.filter(k => k.length < 30).length;
  if (cortas) mal(`${cortas} de las keys parece incompleta (menos de 30 caracteres)`, 'revisa que no falte ningún trozo al pegarla');

  if (!env.OWNER_NUMBER) mal('falta OWNER_NUMBER: el bot no sabe quién es el dueño', 'añádelo al .env');
  else bien('OWNER_NUMBER configurado');

  if (env.GROK_API_KEY || fs.existsSync(path.join(RAIZ, 'data/grok-key.txt'))) bien('key de Grok presente (!g funciona)');
  else aviso('sin key de Grok: !g no responderá', 'usa !setgrok <key> desde WhatsApp');

  // SHIP_ALTO se comprueba aqui porque es la unica pieza de configuracion que no
  // se puede verificar de ninguna otra forma: si el bot no la ve, el !ship sale
  // bajo — que es EXACTAMENTE lo que sale cuando la config esta bien y el amaño
  // no aplica. Un fallo indistinguible del funcionamiento normal es un fallo que
  // no se descubre nunca, asi que se dice aqui.
  //
  // NO SE IMPRIME EL NUMERO. Es de un tercero y este comando se enseña en
  // capturas; con saber que esta y cuantos hay basta para comprobar la config.
  const shipAlto = (env.SHIP_ALTO || '').split(',').map(n => n.replace(/\D/g, '')).filter(Boolean);
  if (shipAlto.length) {
    const raros = shipAlto.filter(n => n.length < 8 || n.length > 15);
    if (raros.length) {
      mal(`SHIP_ALTO tiene ${raros.length} número(s) con una longitud imposible`,
        'repásalo: se esperan de 8 a 15 dígitos, con o sin el + y los espacios');
    } else {
      bien(`SHIP_ALTO: ${shipAlto.length} número(s) con ship amañado al alza`);
    }
  }
}

// ─── Proceso ─────────────────────────────────────────────────────────────────
titulo('Proceso');
let lista = [];
try { lista = JSON.parse(sh('pm2 jlist') || '[]'); } catch {}
const bot = lista.find(p => p.name === 'bot') || lista[0];
if (!bot) {
  mal('pm2 no tiene ningún proceso levantado', 'pm2 start ecosystem.config.js && pm2 save');
} else {
  const env = bot.pm2_env || {};
  if (env.status === 'online') {
    const mins = Math.floor((Date.now() - (env.pm_uptime || Date.now())) / 60000);
    const tiempo = mins >= 1440 ? `${Math.floor(mins / 1440)}d` : mins >= 60 ? `${Math.floor(mins / 60)}h` : `${mins}min`;
    bien(`${bot.name} en marcha desde hace ${tiempo}`);
  } else {
    mal(`${bot.name} está en estado "${env.status}"`, 'pm2 logs --lines 50   para ver por qué');
  }

  const ram = Math.round((bot.monit?.memory || 0) / 1024 / 1024);
  if (ram > 400) aviso(`usando ${ram} MB de RAM, va justo`, 'pm2 restart all');
  else bien(`${ram} MB de RAM`);

  // Reinicios: unos pocos son normales (actualizaciones). Muchos, no.
  const r = env.restart_time || 0;
  if (r > 200) aviso(`${r} reinicios acumulados; si sube solo, algo lo está tirando`, 'pm2 logs --err --lines 50');

  if (!env.max_memory_restart) {
    aviso('arrancado sin ecosystem.config.js: no hay tope de RAM ni de logs',
      'pm2 delete all && pm2 start ecosystem.config.js && pm2 save');
  } else bien('arrancado con ecosystem.config.js (tope de RAM puesto)');
}

// ¿El PROCESO corre el codigo del disco? Son dos cosas distintas y confundirlas
// es el fallo mas facil de cometer: `git pull` cambia el disco, pero hasta que
// pm2 no reinicia, el bot en memoria sigue con el codigo viejo, y desde fuera
// todo parece actualizado.
//
// El bot imprime su commit AL CONECTAR, no al arrancar, y conectar tarda unos
// segundos. Por eso hay que mirar CUANDO se escribio esa linea: justo despues de
// un reinicio, la ultima del log es todavia la del proceso anterior, y comparar
// a ciegas acusaba de "se actualizo sin reiniciar" a un bot recien reiniciado
// que estaba perfectamente. Si la linea es mas vieja que el arranque actual, lo
// unico honesto es decir que aun no ha conectado.
if (local && bot) {
  const arranque = bot.pm2_env?.pm_uptime || 0;
  const linea = sh(`pm2 logs bot --out --lines 400 --nostream 2>/dev/null | grep "commit cargado" | tail -1`, 20000);
  const enMemoria = (linea.match(/commit cargado\s*:\s*([0-9a-f]{7,})/) || [])[1];
  const marca = (linea.match(/(\d{4}-\d{2}-\d{2}T[\d:.]+)/) || [])[1];
  const escritaEn = marca ? Date.parse(marca) : NaN;
  const esDeAhora = Number.isFinite(escritaEn) && escritaEn >= arranque;

  if (!enMemoria) {
    aviso('el bot aún no ha dicho qué commit carga (¿todavía conectando?)', 'espera unos segundos y repite: npm run estado');
  } else if (!esDeAhora) {
    aviso(`reiniciado hace nada: la última huella del log (${enMemoria}) es del arranque anterior`,
      'espera a que conecte y repite: npm run estado');
  } else if (enMemoria.startsWith(local) || local.startsWith(enMemoria)) {
    bien(`el bot en marcha corre ${enMemoria}, que es el del disco`);
  } else {
    mal(`el bot corre ${enMemoria} pero en disco está ${local}: se actualizó sin reiniciar`,
      'pm2 restart bot --update-env');
  }
}

// ─── ¿Por qué no responde? ───────────────────────────────────────────────────
//
// Esta sección existe porque "el bot se apagó de la nada" tiene cinco causas
// distintas que se ven EXACTAMENTE igual desde el grupo, y cuatro de ellas
// dejan el proceso vivo y a pm2 diciendo "online". Sin esto hay que ir a mirar
// a mano el state.json, la carpeta de sesión y el log; con esto sale aquí.
titulo('¿Responde el bot?');

// 1. Se rindió solo tras perder la sesión (el caso más silencioso de todos).
const parado = path.join(RAIZ, 'data/parado.json');
if (fs.existsSync(parado)) {
  try {
    const p = JSON.parse(fs.readFileSync(parado, 'utf8'));
    const hace = Math.round((Date.now() - new Date(p.desde).getTime()) / 60000);
    const cuando = hace >= 1440 ? `hace ${Math.floor(hace / 1440)} días` : hace >= 60 ? `hace ${Math.floor(hace / 60)} h` : `hace ${hace} min`;
    mal(`EL BOT SE PARÓ SOLO ${cuando} (${p.motivo}) — el proceso sigue vivo pero no está conectado`, p.detalle);
  } catch {
    mal('el bot dejó una marca de parada pero no pude leerla', 'cat data/parado.json');
  }
} else {
  bien('no hay ninguna marca de parada');
}

// 2. Apagado a mano con !off. Persiste en disco: sobrevive a los reinicios, así
//    que reiniciar no lo arregla y desde fuera parece que el bot está roto.
const statePath = path.join(RAIZ, 'data/state.json');
if (fs.existsSync(statePath)) {
  try {
    const st = JSON.parse(fs.readFileSync(statePath, 'utf8') || '{}');
    if (st.botEnabled === false) {
      mal('el bot está APAGADO con !off (queda guardado, por eso reiniciar no lo arregla)', 'manda *!off* → perdón, *!on* desde WhatsApp');
    } else {
      bien('el bot está encendido (!on)');
    }
    const apagados = (st.disabledGroups || []).length;
    if (apagados) aviso(`${apagados} ${apagados === 1 ? 'grupo tiene' : 'grupos tienen'} el bot apagado con !off`, 'manda *!on* en ese grupo');

    const soloAdmins = (st.soloAdminsEnabled || []).length;
    if (soloAdmins) aviso(`${soloAdmins} ${soloAdmins === 1 ? 'grupo está' : 'grupos están'} en modo admin: el bot ignora a los miembros`, 'manda *!adminmode off* en ese grupo');

    const auraOff = (st.auraDisabled || []).length;
    if (auraOff) aviso(`${auraOff} ${auraOff === 1 ? 'grupo tiene' : 'grupos tienen'} la dinámica de aura en pausa`, 'manda *!aura on* en ese grupo');
  } catch {
    mal('data/state.json está corrupto: el bot arrancará con la configuración por defecto', 'revisa el fichero o bórralo para empezar limpio');
  }
} else {
  aviso('todavía no hay data/state.json (normal si nunca ha arrancado)');
}

// 3. Sesión de WhatsApp. Sin credenciales el bot pide QR y se queda esperando.
const authDir = path.join(RAIZ, 'data/auth');
if (!fs.existsSync(authDir) || !fs.existsSync(path.join(authDir, 'creds.json'))) {
  mal('no hay sesión de WhatsApp: el bot está esperando a que alguien escanee el QR', 'pm2 logs bot   y escanea el código que sale');
} else {
  const edad = Math.round((Date.now() - fs.statSync(path.join(authDir, 'creds.json')).mtimeMs) / 60000);
  if (edad > 60 * 24 * 7) aviso(`la sesión no se toca desde hace ${Math.floor(edad / 1440)} días: puede estar muerta`, 'pm2 logs bot --lines 30');
  else bien('sesión de WhatsApp presente');
}

// 4. Lo que diga el log. Se buscan las frases EXACTAS que imprime el bot al
//    rendirse, no palabras sueltas: "error" a secas sale por mil motivos
//    inofensivos y convertiría esto en una alarma que nadie se cree.
const errLog = sh(`pm2 logs bot --err --lines 200 --nostream 2>/dev/null`, 20000);
if (errLog) {
  const señales = [
    [/Sesión cerrada \d+ veces seguidas/, 'WhatsApp cerró la sesión varias veces: puede haber una restricción en la cuenta', 'revisa el teléfono → Dispositivos vinculados'],
    [/No se pudo reconectar/,             'se agotaron los intentos de reconexión', 'pm2 restart bot'],
    [/Sesión rechazada \(401\)/,          'WhatsApp rechazó la sesión (401) en algún momento', 'si se repite, revisa el teléfono'],
    [/JavaScript heap out of memory/,     'se quedó sin memoria', 'pm2 start ecosystem.config.js  (pone el tope de RAM)'],
    [/ENOSPC|no space left/i,             'DISCO LLENO: es lo que corrompe la sesión de WhatsApp', 'pm2 flush && rm -rf temp/*'],
  ];
  const vistas = señales.filter(([re]) => re.test(errLog));

  // El log guarda lo de HOY y lo de hace un mes en el mismo fichero, así que una
  // caída ya resuelta seguiría saliendo en rojo para siempre. Si el bot está
  // conectado ahora mismo y no hay marca de parada, lo del log ya pasó: se dice
  // como historial, no como problema. Sin esto el aviso se vuelve permanente,
  // la gente aprende a ignorarlo, y el día que sea de verdad tampoco lo mirará.
  const enMarcha = bot?.pm2_env?.status === 'online' && !fs.existsSync(parado);

  if (!vistas.length) {
    bien('el log de errores no tiene ninguna señal conocida de caída');
  } else if (enMarcha) {
    for (const [, que] of vistas) bien(`ya resuelto — en el log viejo: ${que}`);
    console.log(`      \x1b[36m→ pm2 flush   (limpia el historial para que no vuelva a salir)\x1b[0m`);
  } else {
    for (const [, que, arreglo] of vistas) aviso(`en el log: ${que}`, arreglo);
  }
} else {
  aviso('no pude leer el log de pm2 (¿el proceso se llama distinto?)', 'pm2 ls');
}

// ─── Logs ────────────────────────────────────────────────────────────────────
titulo('Logs');
const modulos = sh('pm2 jlist --raw') || '';
const tieneRotate = sh('pm2 ls').includes('logrotate') || modulos.includes('logrotate');
if (tieneRotate) {
  const conf = sh('pm2 conf pm2-logrotate') || '';
  const max = (conf.match(/max_size\s+(\S+)/) || [])[1];
  const retain = (conf.match(/retain\s+(\S+)/) || [])[1];
  bien(`pm2-logrotate instalado${max ? ` (corta a ${max}, guarda ${retain || '?'})` : ''}`);
} else {
  mal('pm2-logrotate NO está instalado: los logs crecen sin freno hasta llenar el disco',
    'pm2 install pm2-logrotate && pm2 set pm2-logrotate:max_size 10M && pm2 set pm2-logrotate:retain 5');
}

const logDir = path.join(process.env.HOME || '/root', '.pm2/logs');
if (fs.existsSync(logDir)) {
  let bytes = 0;
  for (const f of fs.readdirSync(logDir)) {
    try { bytes += fs.statSync(path.join(logDir, f)).size; } catch {}
  }
  const mb = Math.round(bytes / 1024 / 1024);
  if (mb > 200) aviso(`los logs ocupan ${mb} MB`, 'pm2 flush');
  else bien(`los logs ocupan ${mb} MB`);
}

// ─── Disco ───────────────────────────────────────────────────────────────────
titulo('Disco');
const df = sh(`df -h ${RAIZ} | tail -1`).split(/\s+/);
if (df.length >= 5) {
  const usado = parseInt(df[4], 10);
  const libre = df[3];
  if (usado >= 90) mal(`disco al ${usado}% (quedan ${libre}). Si se llena, el bot pierde la sesión de WhatsApp`, 'pm2 flush  y borra lo que no uses');
  else if (usado >= 75) aviso(`disco al ${usado}% (quedan ${libre})`);
  else bien(`disco al ${usado}%, quedan ${libre}`);
}

// Residuo conocido: los binarios de sharp. Nadie declara sharp como
// dependencia, asi que si reaparecen es que un npm install los ha vuelto a
// traer y son 27 MB que no usa nadie.
if (fs.existsSync(path.join(RAIZ, 'node_modules/@img'))) {
  aviso('los binarios de sharp han vuelto a instalarse (27 MB que no usa nadie)',
    'rm -rf node_modules/sharp node_modules/@img');
}

for (const [nombre, dir] of [['caché de música', 'data/music_cache'], ['caché de fotos', 'data/pfpcache'], ['temporales', 'temp']]) {
  const d = path.join(RAIZ, dir);
  if (!fs.existsSync(d)) continue;
  let bytes = 0;
  const andar = (p) => {
    for (const f of fs.readdirSync(p)) {
      const full = path.join(p, f);
      try { const st = fs.statSync(full); bytes += st.isDirectory() ? (andar(full), 0) : st.size; } catch {}
    }
  };
  try { andar(d); } catch {}
  const mb = Math.round(bytes / 1024 / 1024);
  const tope = dir.includes('music') ? 400 : dir.includes('pfp') ? 60 : 100;
  if (mb > tope) aviso(`${nombre}: ${mb} MB, por encima de su tope (${tope} MB)`);
  else bien(`${nombre}: ${mb} MB`);
}

// Temporales huerfanos: cada uno es un cierre brusco anterior. El bot los barre
// al arrancar, asi que si aparecen MUCHOS es que se esta muriendo a menudo.
const tmps = fs.existsSync(path.join(RAIZ, 'data'))
  ? fs.readdirSync(path.join(RAIZ, 'data')).filter(f => f.endsWith('.tmp')).length
  : 0;
if (tmps > 5) aviso(`${tmps} temporales a medio escribir en data/: el bot se esta cerrando de golpe a menudo`, 'pm2 logs bot --err --lines 50');
else if (tmps) bien(`${tmps} temporal suelto en data/ (el bot lo barre al arrancar)`);

// ─── Dependencias ────────────────────────────────────────────────────────────
titulo('Dependencias');
const auditJson = sh('npm audit --omit=dev --json 2>/dev/null', 60000);
if (auditJson) {
  try {
    const a = JSON.parse(auditJson);
    const v = a.metadata?.vulnerabilities || {};
    const graves = (v.high || 0) + (v.critical || 0);
    const total = Object.values(v).reduce((x, y) => x + y, 0);
    if (graves) mal(`${graves} vulnerabilidades graves`, 'npm audit fix');
    else if (total) aviso(`${total} vulnerabilidades leves`, 'npm audit fix');
    else bien('sin vulnerabilidades');
  } catch { aviso('no pude leer el informe de npm audit'); }
}
const nodeMayor = Number(process.versions.node.split('.')[0]);
if (nodeMayor < 18) mal(`Node ${process.versions.node} es demasiado viejo para Baileys`, 'actualiza a Node 20 o superior');
else bien(`Node ${process.versions.node}`);

// ─── Veredicto ───────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(52));
if (!problemas && !avisos) console.log('\x1b[32m\x1b[1m  TODO EN ORDEN. No hay nada que hacer.\x1b[0m\n');
else if (!problemas) console.log(`\x1b[33m\x1b[1m  Funciona, pero hay ${avisos} ${avisos === 1 ? 'cosa mejorable' : 'cosas mejorables'} (las marcadas con !).\x1b[0m\n`);
else console.log(`\x1b[31m\x1b[1m  ${problemas} ${problemas === 1 ? 'cosa que arreglar' : 'cosas que arreglar'} (las marcadas con ✘). Copia el comando en azul de debajo de cada una.\x1b[0m\n`);

process.exit(problemas ? 1 : 0);
