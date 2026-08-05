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

  const sucio = sh(`git -C ${RAIZ} status --porcelain`);
  if (sucio) aviso('hay cambios locales sin guardar; el próximo pull puede dar conflicto');
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
