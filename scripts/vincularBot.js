#!/usr/bin/env node
'use strict';

// npm run vincular-bot (19 nov)
//
// El dueño: «me toca los huevos pasarte los números manualmente para vincular
// nuevamente; guarda los números de vinculación». El bot apunta cada número con
// el que conecta en data/numerosVinculacion.json (utils/numeroBot.js), en la
// VPS y nunca en el repositorio. Con eso:
//
//   npm run vincular-bot               cambia al OTRO número guardado
//   npm run vincular-bot -- 333        el guardado que lleve esos dígitos
//   npm run vincular-bot -- +57 3…     uno nuevo: se guarda y se vincula
//   npm run vincular-bot -- guardar +57 3…   solo lo guarda
//   npm run vincular-bot -- lista      enseña los guardados
//
// Hace lo de siempre, solo: para el bot, aparta la sesión (se mueve, no se
// borra), pide el código, espera a que se vincule y arranca el bot. Si no se
// completa (o Ctrl+C), devuelve la sesión de antes y arranca el bot con ella.

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const RAIZ = path.join(__dirname, '..');
let DATA = path.join(RAIZ, 'data');
let sh = (c, ms = 30000) => execSync(c, { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: ms });
const leer = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const dormir = (ms) => new Promise((r) => { setTimeout(r, ms); });
const marca = () => new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const bonito = (d) => `+${d}`;

// Un móvil colombiano sin prefijo (diez dígitos empezando por 3) lleva el 57,
// como en `node index.js --codigo` (numeroDeVinculacion en bot.js).
const normalizar = (d) => (/^3\d{9}$/.test(d) ? `57${d}` : d);

function guardados() {
  const v = leer(path.join(DATA, 'numerosVinculacion.json'));
  const lista = Array.isArray(v) ? v.map((x) => String(x).replace(/\D/g, '')).filter((x) => x.length >= 8) : [];
  const actual = actualNumero();
  if (actual && !lista.includes(actual)) lista.push(actual);
  return lista;
}
function guardar(d) {
  const v = guardados();
  if (!v.includes(d)) v.push(d);
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(path.join(DATA, 'numerosVinculacion.json'), JSON.stringify(v), { mode: 0o600 });
}
function actualNumero() {
  return String(leer(path.join(DATA, 'numeroBot.json'))?.numero || '').replace(/\D/g, '');
}

// Qué número toca. Devuelve { numero } o { error }.
function elegir(args) {
  const dado = args.filter((a) => !a.startsWith('--') && !/^(guardar|lista)$/i.test(a)).join('').replace(/\D/g, '');
  const lista = guardados();
  const actual = actualNumero();
  if (dado.length >= 10) return { numero: normalizar(dado), nuevo: !lista.includes(normalizar(dado)) };
  if (dado.length) {
    const casan = lista.filter((n) => n.includes(dado));
    if (casan.length === 1) return { numero: casan[0] };
    if (!casan.length) return { error: `No tengo guardado ningún número con ${dado}. Guardados: ${lista.map(bonito).join(', ') || 'ninguno'}.` };
    return { error: `Hay varios con ${dado}: ${casan.map(bonito).join(', ')}. Pon más dígitos.` };
  }
  const otros = lista.filter((n) => n !== actual);
  if (otros.length) return { numero: otros[0] };
  if (actual) return { numero: actual };
  return { error: 'No tengo ningún número guardado. La primera vez: npm run vincular-bot -- +<número con prefijo>' };
}

// Devuelve la sesión apartada a su sitio (la de a medias se aparta también).
function volver(apartada) {
  const auth = path.join(DATA, 'auth');
  if (!apartada || !fs.existsSync(apartada)) return false;
  if (fs.existsSync(auth)) fs.renameSync(auth, path.join(DATA, `auth.fallida-${marca()}`));
  fs.renameSync(apartada, auth);
  return true;
}

function arrancarBot() {
  try { sh('pm2 start bot'); } catch {
    try { sh('pm2 start ecosystem.config.js --only bot'); } catch { /* lo dirá estado */ }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((a) => /^lista$/i.test(a))) {
    const actual = actualNumero();
    const lista = guardados();
    console.log(lista.length ? lista.map((n) => `${bonito(n)}${n === actual ? '  ← el de ahora' : ''}`).join('\n') : 'No hay ningún número guardado.');
    return;
  }
  const r = elegir(args);
  if (r.error) { console.log(r.error); process.exit(1); }
  const numero = r.numero;
  guardar(numero);
  if (args.some((a) => /^guardar$/i.test(a))) { console.log(`Guardado ${bonito(numero)}.`); return; }

  const actual = actualNumero();
  console.log(`Vinculo el bot con ${bonito(numero)}${numero === actual ? ' (el mismo de ahora)' : ''}.`);
  console.log('Ten a mano el móvil de ese número.');

  try { sh('pm2 stop bot'); } catch { /* ya parado o sin pm2 */ }
  const auth = path.join(DATA, 'auth');
  const apartada = fs.existsSync(auth) ? path.join(DATA, `auth.antes-${marca()}`) : null;
  if (apartada) fs.renameSync(auth, apartada);

  const desde = Date.now();
  const hijo = spawn(process.execPath, ['index.js', '--codigo', numero], { cwd: RAIZ, stdio: 'inherit', env: process.env });
  let terminado = false;
  const fin = async (ok) => {
    if (terminado) return;
    terminado = true;
    if (ok) await dormir(5000);   // que termine de guardar la sesión
    try { hijo.kill('SIGINT'); } catch { /* ya salió */ }
    await new Promise((res) => { const t = setTimeout(res, 15000); hijo.once('exit', () => { clearTimeout(t); res(); }); });
    if (ok) {
      arrancarBot();
      try { sh('pm2 save'); } catch { /* da igual */ }
      console.log(`\nVinculado con ${bonito(numero)}. El bot está en marcha.`);
      if (apartada) console.log(`La sesión de antes queda en data/${path.basename(apartada)}.`);
      process.exit(0);
    }
    const vuelta = volver(apartada);
    arrancarBot();
    console.log(`\nNo se ha completado.${vuelta ? ' He devuelto la sesión de antes y el bot vuelve a estar en marcha con ella.' : ''}`);
    process.exit(1);
  };
  process.on('SIGINT', () => { fin(false); });
  hijo.on('exit', () => { if (!terminado) fin(false); });

  for (let i = 0; i < 200 && !terminado; i++) {   // 5 minutos
    await dormir(1500);
    const d = leer(path.join(DATA, 'numeroBot.json'));
    if (d && String(d.numero) === numero && Number(d.ts) >= desde) return fin(true);
  }
  if (!terminado) fin(false);
}

if (require.main === module) {
  main().catch((e) => { console.log(`No pude vincular el bot: ${e.message}`); process.exit(1); });
}

module.exports = {
  elegir, guardados, guardar, volver, normalizar,
  _prueba: ({ data, shell } = {}) => { if (data) DATA = data; if (shell) sh = shell; },
};
