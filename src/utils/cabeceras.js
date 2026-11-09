'use strict';

// ─── LA CABECERA DE CADA MENSAJE DE GRUPO, ANTES DE DESCIFRARLO (9 nov) ─────
//
// `npm run estado` en la VPS: «40 mensajes de grupo en 24 h que el bot no pudo
// descifrar», de cinco números, y «ninguna historia detectada». Las historias
// de grupo (Group Status) llegan al JID del grupo cifradas con la clave de su
// autor, y si el teléfono de ese autor no le ha dado su clave al bot, Baileys
// no las puede abrir: entrega un aviso vacío y el bot no tiene nada que mirar.
//
// Lo que sí se puede leer siempre es la CABECERA del mensaje: quién, en qué
// grupo, de qué tipo, y los nodos que la acompañan. Al enviar una historia de
// grupo, el cliente pone `<meta is_group_status="true" origin="group_status">`
// (formato comprobado contra WhatsApp Web en wamcp, PR 175). Si esa marca llega
// también al que recibe, una historia se reconoce sin abrirla.
//
// Aquí se apunta un resumen de las cabeceras recientes de los grupos —solo
// atributos y nombres de nodo, NUNCA contenido— para dos cosas:
//   · `esHistoria`: la marca explícita; bot.js la castiga como cualquier otra
//     historia (ver castigarHistoriaCruda en messageHandler).
//   · `texto`: lo que sale en el log junto a «sin descifrar», para saber con
//     datos qué son esos mensajes y no adivinarlo.

const CABEN = 400;
const resumenes = new Map();   // id del mensaje -> resumen

const corto = (v) => String(v).slice(0, 60);
function atributos(attrs, claves) {
  const out = {};
  for (const k of claves || Object.keys(attrs || {})) {
    if (attrs && attrs[k] !== undefined && attrs[k] !== null) out[k] = corto(attrs[k]);
  }
  return out;
}

function anotar(node) {
  if (!node || node.tag !== 'message' || !node.attrs) return null;
  const a = node.attrs;
  const grupo = String(a.from || '');
  if (!grupo.endsWith('@g.us') || !a.id) return null;
  const hijos = [];
  for (const h of Array.isArray(node.content) ? node.content : []) {
    if (!h || typeof h.tag !== 'string') continue;
    if (h.tag === 'enc') hijos.push({ tag: 'enc', attrs: atributos(h.attrs, ['type', 'v', 'mediatype']) });
    else if (h.tag === 'meta') hijos.push({ tag: 'meta', attrs: atributos(h.attrs) });
    else hijos.push({ tag: corto(h.tag), attrs: {} });
  }
  const r = {
    ts: Date.now(),
    id: String(a.id),
    grupo,
    autor: a.participant ? String(a.participant) : '',
    autorAlt: a.participant_pn || a.participant_lid ? String(a.participant_pn || a.participant_lid) : '',
    tipo: a.type ? corto(a.type) : '',
    hijos,
  };
  if (resumenes.has(r.id)) resumenes.delete(r.id);
  resumenes.set(r.id, r);
  while (resumenes.size > CABEN) resumenes.delete(resumenes.keys().next().value);
  return r;
}

// La marca explícita de historia de grupo. Solo esa: nada se deduce.
function esHistoria(r) {
  return Boolean(r && r.hijos.some((h) => h.tag === 'meta'
    && (h.attrs.is_group_status === 'true' || h.attrs.origin === 'group_status')));
}

function de(id) { return id ? resumenes.get(String(id)) || null : null; }

// «tipo=media · enc skmsg v2 image · meta{is_group_status=true}»
function texto(r) {
  if (!r) return 'sin cabecera apuntada';
  const partes = [`tipo=${r.tipo || '?'}`];
  for (const h of r.hijos) {
    const at = Object.entries(h.attrs).map(([k, v]) => `${k}=${v}`).join(',');
    partes.push(h.tag === 'enc' ? `enc ${Object.values(h.attrs).join(' ')}` : `${h.tag}${at ? `{${at}}` : ''}`);
  }
  return partes.join(' · ');
}

module.exports = { anotar, esHistoria, de, texto, _olvidar: () => resumenes.clear() };
