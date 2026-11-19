'use strict';

// ─── EL NÚMERO DEL BOT Y DESDE CUÁNDO ESTÁ VINCULADO ────────────────────────
//
// bot.js lo apunta al conectar en data/numeroBot.json, con `desde`: cuándo se
// vinculó ESTE número. Se conserva mientras el número sea el mismo y vuelve a
// empezar con uno nuevo.
//
// Para qué: tres números del bot cayeron en revisión de WhatsApp entre el 25 y
// el 30 de octubre, el último en menos de dieciséis horas. Un número recién
// vinculado que se pone a hacer de todo a la vez es lo primero que mira
// WhatsApp, así que durante su RODAJE (los primeros DIAS_RODAJE días) lo que
// pregunta por otras cuentas o mueve gente tiene topes más bajos
// (utils/ritmo.js), y la precisión del anti-empresa no se mide.
//
// Sin fichero, o sin `desde`, se da por recién vinculado: es el lado seguro.

const fs = require('fs');
const path = require('path');

let FICHERO = path.join(__dirname, '../../data/numeroBot.json');
// LOS NÚMEROS CON LOS QUE SE HA VINCULADO EL BOT (19 nov). El dueño: «me toca
// los huevos pasarte los números manualmente para vincular nuevamente». Cada
// número con el que el bot conecta se apunta aquí (en data/, nunca en el
// repositorio), y `npm run vincular-bot` los usa sin que nadie los escriba.
let FICHERO_NUMEROS = path.join(__dirname, '../../data/numerosVinculacion.json');
function numerosGuardados() {
  try {
    const v = JSON.parse(fs.readFileSync(FICHERO_NUMEROS, 'utf8'));
    return Array.isArray(v) ? v.map((x) => String(x).replace(/\D/g, '')).filter((x) => x.length >= 8) : [];
  } catch { return []; }
}
function recordarNumero(numero) {
  const d = String(numero || '').replace(/\D/g, '');
  if (d.length < 8) return false;
  const v = numerosGuardados();
  if (v.includes(d)) return false;
  v.push(d);
  try {
    fs.mkdirSync(path.dirname(FICHERO_NUMEROS), { recursive: true });
    fs.writeFileSync(FICHERO_NUMEROS, JSON.stringify(v), { mode: 0o600 });
    return true;
  } catch { return false; }
}
const DIA = 24 * 60 * 60 * 1000;
const DIAS_RODAJE = 7;

// Se relee como mucho una vez por minuto: esto se pregunta en cada consulta
// con tope, y el fichero solo cambia al conectar.
let cache = { t: 0, dato: null };
function leer(ahora = Date.now()) {
  if (cache.t && ahora - cache.t < 60 * 1000) return cache.dato;
  let dato = null;
  try { dato = JSON.parse(fs.readFileSync(FICHERO, 'utf8')); } catch { dato = null; }
  cache = { t: ahora, dato };
  return dato;
}

// Días que lleva vinculado el número. null si no se sabe.
function diasVinculado(ahora = Date.now()) {
  const d = leer(ahora);
  return d?.desde ? (ahora - d.desde) / DIA : null;
}

function enRodaje(ahora = Date.now()) {
  const d = diasVinculado(ahora);
  return d === null || d < DIAS_RODAJE;
}

module.exports = {
  diasVinculado, enRodaje, DIAS_RODAJE, numerosGuardados, recordarNumero,
  _fichero: (f, numeros) => { FICHERO = f; if (numeros) FICHERO_NUMEROS = numeros; cache = { t: 0, dato: null }; },
};
