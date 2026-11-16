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

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
try { require('dotenv').config({ path: path.join(RAIZ, '.env'), quiet: true }); } catch { /* sin dotenv */ }

const DATA = path.join(RAIZ, 'data');
const ARMADO = path.join(DATA, 'vincularGuardian');
const CODIGO = path.join(DATA, 'guardianCodigo.json');
const DISPOSITIVO = path.join(DATA, 'authGuardian', 'dispositivo.json');

const sh = (c, ms = 30000) => execSync(c, { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: ms });
const leer = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const dormir = (ms) => new Promise((r) => { setTimeout(r, ms); });
const tapado = (d) => (d.length > 6 ? `+${d.slice(0, 2)}···${d.slice(-4)}` : `+${d}`);

async function main() {
  const numero = String(process.env.GUARDIAN || '').replace(/\D/g, '');
  if (!numero) {
    console.log('Falta GUARDIAN en el .env: el número del guardián, con prefijo de país.');
    process.exit(1);
  }
  const deseado = String(process.env.GUARDIAN_DISPOSITIVO || '').trim().toLowerCase() === 'navegador' ? 'navegador' : 'android';
  const como = deseado === 'android' ? 'Android' : 'navegador';

  const actual = leer(DISPOSITIVO);
  if (actual?.dispositivo === deseado && actual?.abierto) {
    console.log(`El guardián ya está vinculado como ${como}. No hay nada que hacer.`);
    return;
  }

  let lista;
  try { lista = JSON.parse(sh('pm2 jlist')); } catch {
    console.log('No encuentro pm2 en esta máquina.');
    process.exit(1);
  }

  fs.mkdirSync(DATA, { recursive: true });
  fs.rmSync(CODIGO, { force: true });
  fs.writeFileSync(ARMADO, '');
  const desde = Date.now();
  const hay = Array.isArray(lista) && lista.some((p) => p.name === 'guardian');
  sh(hay ? 'pm2 restart guardian --update-env' : 'pm2 start ecosystem.config.js --only guardian');
  console.log(`Pidiendo el código para vincular el guardián como ${como}…`);

  let codigo = null;
  for (let i = 0; i < 60 && !codigo; i++) {
    await dormir(1500);
    const c = leer(CODIGO);
    if (c?.codigo && c.ts >= desde) codigo = c.codigo;
  }
  if (!codigo) {
    console.log('El guardián no ha pedido el código. Lo último que dice:');
    try { console.log(sh('pm2 logs guardian --lines 15 --nostream 2>/dev/null')); } catch { /* sin log */ }
    process.exit(1);
  }

  console.log(`\n  CÓDIGO: ${codigo}\n`);
  console.log(`  En el móvil del guardián (${tapado(numero)}):`);
  console.log('  WhatsApp → Dispositivos vinculados → Vincular un dispositivo');
  console.log('  → «Vincular con el número de teléfono» → escribe el código.');
  console.log('  Caduca en un par de minutos.\n');

  for (let i = 0; i < 120; i++) {
    await dormir(1500);
    const d = leer(DISPOSITIVO);
    if (d?.dispositivo === deseado && d.abierto >= desde) {
      console.log(`Vinculado como ${como}.` + (deseado === 'android' ? ' Desde ya guarda las fotos de ver una vez para /toimg y /s.' : ''));
      console.log('En el móvil puedes quitar el dispositivo viejo del guardián («Chrome», Ubuntu): ya no se usa.');
      try { sh('pm2 save'); } catch { /* da igual */ }
      return;
    }
  }
  console.log('No se ha completado. Vuelve a lanzar npm run vincular-guardian con el móvil abierto en esa pantalla.');
  process.exit(1);
}

main().catch((e) => { console.log(`No pude vincular el guardián: ${e.message}`); process.exit(1); });
