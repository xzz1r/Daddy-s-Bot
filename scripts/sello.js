#!/usr/bin/env node
// La huella del codigo que la puerta ya aprobo.
//
// POR QUE EXISTE. `npm run update` en la VPS tardaba dos minutos largos, y el
// 98 % de eso era `npm run check`: 89 capas que arrancan 115 procesos node.
// Medido en un solo nucleo —que es lo que tiene la VPS— paralelizarlos da
// 0,96x (o sea, nada: el trabajo es CPU, no espera de disco) y la cache de
// compilacion de V8 tampoco ayuda, porque cada hijo se copia src/ a un temporal
// nuevo y la cache no acierta por ruta. Correr menos no era una opcion.
//
// Pero es que ESAS CAPAS COMPRUEBAN CODIGO, y el codigo que llega a la VPS es
// byte a byte el mismo que ya paso la puerta antes de empujarlo. Lo que solo se
// puede comprobar EN la VPS es otra cosa: que ahi compila, que ahi importan
// todos los modulos (un npm install a medias, un disco lleno) y que pm2 lo
// levanta. Eso es lo que corre `--rapido`.
//
// El sello es lo que une las dos mitades: la puerta completa, al pasar en
// verde, deja aqui la huella del arbol que acaba de aprobar. La VPS la recalcula
// sobre lo que se ha bajado y solo se fia si cuadra EXACTAMENTE.
//
// SI NO CUADRA, CORRE LA PUERTA ENTERA. No es un permiso, es un atajo con
// condicion: un fichero tocado a mano, una bajada a medias o un push sin pasar
// la puerta rompen la huella y devuelven el despliegue a las 89 capas. El caso
// inseguro se protege solo.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const R = path.resolve(__dirname, '..');
const SELLO = path.join(R, '.sello');

// Lo que entra en la huella: TODO el codigo que se despliega. src/ es el bot e
// index.js su arranque; scripts/ va dentro porque la propia puerta vive ahi —
// si alguien la afloja, la huella tiene que cambiar o el atajo se convertiria
// en la forma de saltarsela.
//
// .sello NO entra, por lo evidente: escribirlo cambiaria la huella que acaba
// de escribir.
const RAICES = ['src', 'scripts', 'index.js'];

function ficherosDe(rel, out = []) {
  const abs = path.join(R, rel);
  let st;
  try { st = fs.statSync(abs); } catch { return out; }
  if (st.isFile()) { out.push(rel); return out; }
  for (const e of fs.readdirSync(abs).sort()) {
    ficherosDe(path.join(rel, e), out);
  }
  return out;
}

// La huella lleva la RUTA ademas del contenido: sin eso, renombrar un fichero
// —o moverlo de src/utils a src/commands— daria la misma huella y el atajo
// aprobaria un arbol distinto del que se comprobo.
function huella() {
  const h = crypto.createHash('sha256');
  const lista = [];
  for (const r of RAICES) lista.push(...ficherosDe(r));
  lista.sort();
  for (const rel of lista) {
    h.update(rel);
    h.update('\0');
    h.update(fs.readFileSync(path.join(R, rel)));
    h.update('\0');
  }
  return `${lista.length}:${h.digest('hex')}`;
}

function leerSello() {
  try { return fs.readFileSync(SELLO, 'utf8').trim(); } catch { return null; }
}

// Se escribe solo si cambia: asi un `npm run check` en verde sobre codigo ya
// sellado no ensucia el arbol de git ni bloquea el siguiente despliegue.
function escribirSello() {
  const h = huella();
  if (leerSello() === h) return false;
  fs.writeFileSync(SELLO, `${h}\n`);
  return true;
}

function cuadra() {
  return leerSello() === huella();
}

if (require.main === module) {
  const arg = process.argv[2];
  if (arg === '--escribir') { escribirSello(); process.stdout.write(`${huella()}\n`); }
  else if (arg === '--cuadra') { process.exit(cuadra() ? 0 : 1); }
  else process.stdout.write(`${huella()}\n`);
}

module.exports = { huella, leerSello, escribirSello, cuadra, SELLO, RAICES };
