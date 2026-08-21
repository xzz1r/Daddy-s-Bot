// Racha caliente / tilt entre !aura y !robo.
//
// Vive en memoria y se pierde al reiniciar, y está bien así: la ventana es de
// diez minutos y lo que se corta es lo que el grupo está VIENDO ahora mismo.
'use strict';

const { MOMENTUM } = require('./economia');
const { canonicalJid } = require('./wa');

const estados = new Map(); // `${grupo}|${persona}` -> { tipo, para, hasta }

function clave(grupo, persona) {
  return `${grupo}|${canonicalJid(persona)}`;
}

// tipo: 'caliente' | 'tilt'
// para: 'aura' | 'robo'  — la OTRA puerta, la que lo va a gastar
function anotar(grupo, persona, tipo, para) {
  if (tipo !== 'caliente' && tipo !== 'tilt') return;
  if (para !== 'aura' && para !== 'robo') return;
  const k = clave(grupo, persona);
  if (estados.size >= 2000) estados.delete(estados.keys().next().value);
  estados.set(k, { tipo, para, hasta: Date.now() + MOMENTUM.ventanaMs });
}

// Se gasta al usarlo. Si llegó caducado o es para la otra puerta, no toca.
function consumir(grupo, persona, para) {
  const k = clave(grupo, persona);
  const e = estados.get(k);
  if (!e) return null;
  if (e.hasta <= Date.now()) { estados.delete(k); return null; }
  if (e.para !== para) return null;
  estados.delete(k);
  return e;
}

function _reset() { estados.clear(); }

module.exports = { anotar, consumir, _reset };
