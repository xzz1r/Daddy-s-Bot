#!/usr/bin/env node
'use strict';

// npm run vincular-guardian (16 nov)
//
// Vuelve a vincular el guardián como Android, para que le lleguen las fotos de
// ver una vez y se las guarde al bot (src/guardian.js, «COMO QUÉ SE VINCULA»).
// Un solo comando, con el móvil del guardián delante:
//
//   1. arma la vinculación (data/vincularGuardian) y reinicia el guardián;
//   2. el guardián aparta la sesión de navegador (la mueve, no la borra) y
//      pide un código;
//   3. aquí sale el código, y se espera a que se complete.
//
// Si ya está vinculado como lo que toca, lo dice y no toca nada.
//
// EL GUARDIÁN NUNCA SE QUEDA SIN SESIÓN (16 nov). El primer intento en la VPS
// falló («No se pudo vincular el dispositivo») y la sesión de antes quedó
// apartada: el guardián no protegía a nadie. Ahora, si no se completa, se
// devuelve sola la sesión apartada y el guardián sigue como estaba. Y
// `npm run vincular-guardian -- --volver` la devuelve a mano.
//
// EL NÚMERO, BIEN PUESTO (16 nov). El móvil decía «comprueba que el número de
// teléfono es correcto». `npm run vincular-guardian -- +<número>` lo escribe
// en el .env en su propia línea (GUARDIAN=, solo dígitos, sin pegarse a la de
// antes) y el código se pide para ese número, que se enseña entero.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
try { require('dotenv').config({ path: path.join(RAIZ, '.env'), quiet: true }); } catch { /* sin dotenv */ }

let DATA = path.join(RAIZ, 'data');
let ENV = path.join(RAIZ, '.env');
const rutas = () => ({
  armado: path.join(DATA, 'vincularGuardian'),
  codigo: path.join(DATA, 'guardianCodigo.json'),
  auth: path.join(DATA, 'authGuardian'),
  dispositivo: path.join(DATA, 'authGuardian', 'dispositivo.json'),
});

let sh = (c, ms = 30000) => execSync(c, { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: ms });
const leer = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const dormir = (ms) => new Promise((r) => { setTimeout(r, ms); });
const marca = () => new Date().toISOString().replace(/\D/g, '').slice(0, 14);

// GUARDIAN=<número> en el .env: se cambia la línea que haya o se añade al
// final, con su salto de línea. Lo demás del fichero no se toca.
function ponerEnEnv(numero) {
  let t = '';
  try { t = fs.readFileSync(ENV, 'utf8'); } catch { t = ''; }
  const linea = `GUARDIAN=${numero}`;
  if (/^GUARDIAN=.*$/m.test(t)) t = t.replace(/^GUARDIAN=.*$/m, linea);
  else t = `${t && !t.endsWith('\n') ? `${t}\n` : t}${linea}\n`;
  fs.writeFileSync(`${ENV}.tmp`, t, { mode: 0o600 });
  fs.renameSync(`${ENV}.tmp`, ENV);
  process.env.GUARDIAN = numero;
}

// ¿Hay una sesión del guardián hecha (vinculación completa)?
function sesionHecha() {
  const c = leer(path.join(rutas().auth, 'creds.json'));
  return Boolean(c && c.registered && c.account);
}

// Las sesiones de navegador apartadas, de la más vieja a la más nueva.
function apartadas() {
  let n = [];
  try { n = fs.readdirSync(DATA); } catch { return []; }
  return n.filter((x) => /^authGuardian\.navegador-\d+/.test(x))
    .sort((a, b) => a.replace(/\D/g, '').padEnd(20, '0').localeCompare(b.replace(/\D/g, '').padEnd(20, '0')));
}

// Devuelve la sesión apartada más nueva a su sitio. Lo que haya ahora (una
// vinculación a medias) se aparta también, sin borrar nada.
function volverALaDeAntes() {
  const ult = apartadas().pop();
  if (!ult) return null;
  const { armado, auth } = rutas();
  try { sh('pm2 stop guardian'); } catch { /* ya parado */ }
  fs.rmSync(armado, { force: true });
  if (fs.existsSync(auth)) fs.renameSync(auth, path.join(DATA, `authGuardian.fallida-${marca()}`));
  fs.renameSync(path.join(DATA, ult), auth);
  try { sh('pm2 restart guardian --update-env'); } catch {
    try { sh('pm2 start ecosystem.config.js --only guardian'); } catch { /* lo dirá estado */ }
  }
  return ult;
}

async function main() {
  const { armado, codigo: FICHERO_CODIGO, dispositivo: DISPOSITIVO } = rutas();

  if (process.argv.includes('--volver')) {
    // Con una sesión buena no se toca nada: devolver una apartada más vieja
    // la estropearía.
    if (sesionHecha()) {
      console.log('El guardián ya tiene su sesión. No toco nada.');
      return;
    }
    const ult = volverALaDeAntes();
    console.log(ult ? 'Devuelta la sesión de antes: el guardián vuelve a proteger como siempre.'
      : 'No hay ninguna sesión apartada que devolver.');
    return;
  }

  // El número que venga detrás (con +, espacios o guiones, da igual).
  const dado = process.argv.slice(2).filter((a) => !a.startsWith('--')).join('').replace(/\D/g, '');
  if (dado.length >= 8) ponerEnEnv(dado);
  const numero = String(process.env.GUARDIAN || '').replace(/\D/g, '');
  if (!numero) {
    console.log('Falta el número del guardián: npm run vincular-guardian -- +<número con prefijo de país>');
    process.exit(1);
  }
  const deseado = String(process.env.GUARDIAN_DISPOSITIVO || '').trim().toLowerCase() === 'navegador' ? 'navegador' : 'android';
  const como = deseado === 'android' ? 'Android' : 'navegador';

  const actual = leer(DISPOSITIVO);
  if (actual?.dispositivo === deseado && actual?.abierto && sesionHecha()) {
    console.log(`El guardián ya está vinculado como ${como}. No hay nada que hacer.`);
    return;
  }

  let lista;
  try { lista = JSON.parse(sh('pm2 jlist')); } catch {
    console.log('No encuentro pm2 en esta máquina.');
    process.exit(1);
  }

  // Si no se completa, se vuelve a lo de antes.
  const fallar = (texto) => {
    console.log(texto);
    if (!sesionHecha()) {
      const ult = volverALaDeAntes();
      if (ult) console.log('He devuelto la sesión de antes: el guardián sigue protegiendo como siempre.');
    }
    process.exit(1);
  };

  fs.mkdirSync(DATA, { recursive: true });
  fs.rmSync(FICHERO_CODIGO, { force: true });
  fs.writeFileSync(armado, '');
  const desde = Date.now();
  const hay = Array.isArray(lista) && lista.some((p) => p.name === 'guardian');
  sh(hay ? 'pm2 restart guardian --update-env' : 'pm2 start ecosystem.config.js --only guardian');
  console.log(`Pidiendo el código para +${numero} (vincular el guardián como ${como}).`);
  console.log('Ese tiene que ser el número del móvil donde vas a escribir el código.');

  let codigo = null;
  for (let i = 0; i < 60 && !codigo; i++) {
    await dormir(1500);
    const c = leer(FICHERO_CODIGO);
    if (c?.ts >= desde && c.error) {
      // WhatsApp ha dicho que no al pedirlo: no hay código que escribir.
      fallar(`WhatsApp no acepta pedir el código: ${c.error}.\nSi es por haber pedido muchos seguidos, espera una hora antes de volver a probar.`);
    }
    if (c?.codigo && c.ts >= desde) codigo = c.codigo;
  }
  if (!codigo) {
    let log = '';
    try { log = sh('pm2 logs guardian --lines 15 --nostream 2>/dev/null'); } catch { /* sin log */ }
    fallar(`El guardián no ha pedido el código. Lo último que dice:\n${log}`);
  }

  console.log('WhatsApp ha aceptado el código: ahora sí existe.');
  console.log(`\n  CÓDIGO: ${codigo}\n`);
  console.log(`  En el móvil de +${numero}:`);
  console.log('  WhatsApp → Dispositivos vinculados → Vincular un dispositivo');
  console.log('  → «Vincular con el número de teléfono» → escribe el código.');
  console.log('  Caduca en un par de minutos.\n');

  for (let i = 0; i < 120; i++) {
    await dormir(1500);
    const d = leer(DISPOSITIVO);
    if (d?.dispositivo === deseado && d.abierto >= desde) {
      console.log(`Vinculado como ${como}.` + (deseado === 'android' ? ' Desde ya guarda las fotos de ver una vez para /toimg y /s.' : ''));
      console.log('En el móvil del guardián saldrán dos «Chrome (Ubuntu)»: el que no está activo ahora es el viejo y se puede quitar.');
      try { sh('pm2 save'); } catch { /* da igual */ }
      return;
    }
  }
  fallar('No se ha completado.');
}

if (require.main === module) {
  main().catch((e) => { console.log(`No pude vincular el guardián: ${e.message}`); process.exit(1); });
}

module.exports = {
  sesionHecha, apartadas, volverALaDeAntes, ponerEnEnv,
  _prueba: ({ data, shell, env } = {}) => { if (data) DATA = data; if (shell) sh = shell; if (env) ENV = env; },
};
