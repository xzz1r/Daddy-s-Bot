'use strict';

// LA BITÁCORA DE LOS ESTADOS SUBIDOS AL GRUPO.
//
// POR QUÉ EXISTE. El dueño reporta que el spam de estados sigue saliendo a
// diario y sospecha que el bot los borra solo para sí mismo. Se probó el camino
// entero con los nueve sobres vigilados y el borrado se construye bien en los
// nueve: grupo + `fromMe: false` + `participant`, que es lo que Baileys manda
// como borrado de ADMIN (`edit='8'`, el mismo que usa la app cuando un admin
// quita el mensaje de otro). O sea que la teoría del "borrado solo para él" no
// se sostiene ahí.
//
// Pero quedaban cuatro salidas por las que un estado no llega a borrarse, y
// TRES de ellas no dejaban ni una línea:
//
//   1. quien lo sube es admin o del tier dueño   → se saltaba EN SILENCIO
//   2. el bot no es admin en ese momento         → un warn, y solo eso
//   3. el sobre no se reconoce                   → cae como mensaje normal
//   4. llega por status@broadcast                → no se puede borrar de ahí
//
// Con el log a secas no se distinguen, y menos un día después. Así que cada
// estado detectado deja aquí su resultado, y `npm run estado` lo resume. La
// pregunta «¿por qué sigue saliendo?» se contesta mirando, no adivinando.
//
// NO SE GUARDA CONTENIDO. Ni el texto, ni la imagen, ni el pie: el grupo, el
// número, el sobre y qué se hizo. Esto lo lee el dueño en su terminal y acaba en
// capturas.

const fs = require('fs');
const path = require('path');

const FICHERO = path.join(__dirname, '../../data/estadosVistos.json');
const CABEN = 40;

// Todos los finales posibles, escritos una vez. Un resultado suelto escrito a
// mano en cada sitio es como se acaba con dos nombres para lo mismo y un
// resumen que no cuadra.
const RESULTADOS = {
  BORRADO: 'borrado',
  NO_BORRADO: 'no-borrado',
  PROTEGIDO: 'protegido',
  SIN_ADMIN: 'sin-admin',
  BROADCAST: 'por-broadcast',
};

function leer() {
  try {
    const v = JSON.parse(fs.readFileSync(FICHERO, 'utf8'));
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

function apuntar({ grupo, quien, motivo, seguro, resultado }) {
  try {
    const v = leer();
    v.push({
      ts: Date.now(),
      grupo: String(grupo || '').split('@')[0],
      quien: String(quien || '').split('@')[0],
      motivo: motivo || '?',
      seguro: !!seguro,
      resultado,
    });
    fs.writeFileSync(FICHERO, JSON.stringify(v.slice(-CABEN)));
  } catch { /* la bitácora nunca puede tumbar una moderación */ }
}

// Cuántos y con qué final, en las últimas `horas`. Devuelve null si no hay nada
// que contar: así quien lo pinta no tiene que decidir si un cero se enseña.
function resumen(horas = 24) {
  const desde = Date.now() - horas * 3600000;
  const v = leer().filter((x) => x.ts >= desde);
  if (!v.length) return null;
  const cuenta = {};
  for (const x of v) cuenta[x.resultado] = (cuenta[x.resultado] || 0) + 1;
  return { total: v.length, cuenta, ultimo: v[v.length - 1] };
}

// LO QUE LLEGA Y NO SE PUEDE ABRIR (8 nov). El dueño: «el bot no detecta los
// números que hacen spam en los estados del grupo». Con la forma que manda
// WhatsApp (groupStatusMessageV2 al grupo) el bot la reconoce, la borra y echa
// al autor; probado. Si en el grupo no pasa nada, la historia se pierde antes,
// y había dos sitios donde se perdía sin dejar rastro: que no llegue nunca, o
// que llegue y Baileys no la pueda descifrar (entonces solo queda un aviso
// vacío y handleMessage no tiene nada que mirar). Lo segundo se apunta aquí,
// sin contenido —no lo hay—: grupo, número y cuándo. Lo primero se ve por
// descarte: una historia subida y ninguna línea ni aquí ni en el resumen.
//
// No todo lo que no se descifra es una historia: un mensaje normal también
// puede llegar así un momento y recuperarse. Por eso va aparte y no cuenta
// como estado.
const FICHERO_CIFRADOS = path.join(__dirname, '../../data/gruposSinDescifrar.json');
// 200 y no 40 (13 nov): con 40 el resumen decía «40 en 24 h», que era el tope
// de la bitácora y no lo que había llegado.
const CABEN_CIFRADOS = 200;
function leerCifrados() {
  try {
    const v = JSON.parse(fs.readFileSync(FICHERO_CIFRADOS, 'utf8'));
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}
function guardarCifrados(v) {
  while (v.length > CABEN_CIFRADOS) v.shift();
  fs.mkdirSync(path.dirname(FICHERO_CIFRADOS), { recursive: true });
  fs.writeFileSync(FICHERO_CIFRADOS, JSON.stringify(v));
}
// Con el PORQUÉ (13 nov): el error de Baileys (`motivo`, recortado) y lo que
// dice la cabecera —si WhatsApp avisó de que no se lo manda a este
// dispositivo (`noEnviado`) o si traía la marca de historia (`historia`)—.
// Nada de contenido: no lo hay.
function apuntarSinDescifrar({ grupo, quien, id = '', motivo = '', noEnviado = '', historia = '' }) {
  try {
    const v = leerCifrados();
    const x = { ts: Date.now(), grupo: String(grupo || '').split('@')[0], quien: String(quien || '').split('@')[0] };
    if (id) x.id = String(id).slice(0, 40);
    if (motivo) x.motivo = String(motivo).slice(0, 60);
    if (noEnviado) x.noEnviado = String(noEnviado).slice(0, 40);
    if (historia) x.historia = String(historia).slice(0, 60);
    v.push(x);
    guardarCifrados(v);
  } catch { /* la bitácora no puede tirar el bot */ }
}
function sinDescifrar(horas = 24) {
  const desde = Date.now() - horas * 3600000;
  return leerCifrados().filter((x) => x.ts >= desde);
}

// LAS CLAVES RESCATADAS (13 nov, utils/rescateClaves.js): mensajes que se
// abrieron probando la otra forma de la persona o el otro grupo. Solo cuántos
// y por qué vía, por hora.
const FICHERO_RESCATES = path.join(__dirname, '../../data/clavesRescatadas.json');
function apuntarRescate({ via = '?' } = {}) {
  try {
    let v = [];
    try { v = JSON.parse(fs.readFileSync(FICHERO_RESCATES, 'utf8')); } catch { v = []; }
    if (!Array.isArray(v)) v = [];
    const h = Math.floor(Date.now() / 3600000);
    let m = v[v.length - 1];
    if (!m || m.h !== h) { m = { h, vias: {} }; v.push(m); }
    m.vias[via] = (m.vias[via] || 0) + 1;
    while (v.length > 48) v.shift();
    fs.mkdirSync(path.dirname(FICHERO_RESCATES), { recursive: true });
    fs.writeFileSync(FICHERO_RESCATES, JSON.stringify(v));
  } catch { /* contar no tumba nada */ }
}
function rescates(horas = 24) {
  try {
    const v = JSON.parse(fs.readFileSync(FICHERO_RESCATES, 'utf8'));
    const desde = Math.floor(Date.now() / 3600000) - horas + 1;
    const r = {};
    for (const m of Array.isArray(v) ? v : []) {
      if (m.h < desde) continue;
      for (const [k, n] of Object.entries(m.vias || {})) r[k] = (r[k] || 0) + n;
    }
    return r;
  } catch { return {}; }
}

module.exports = {
  apuntar, resumen, RESULTADOS, apuntarSinDescifrar, sinDescifrar, apuntarRescate, rescates,
  _FICHERO: FICHERO, _FICHERO_CIFRADOS: FICHERO_CIFRADOS, _FICHERO_RESCATES: FICHERO_RESCATES,
};
