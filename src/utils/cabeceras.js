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

// TODOS LOS NODOS CON SUS ATRIBUTOS (13 nov). Antes solo `enc` y `meta`
// llevaban los suyos, y el resto salía con el nombre a secas: un
// `<unavailable type="…">` —WhatsApp diciendo que a este dispositivo no le
// manda el mensaje, y por qué— se apuntaba como «unavailable» sin el porqué.
// Siguen siendo atributos: el contenido de un nodo no se mira nunca.
const MAX_HIJOS = 8;
const MAX_ATRIBUTOS = 8;

// Las historias de grupo también pueden viajar por el canal de los estados,
// `status@broadcast`, con el grupo nombrado en la cabecera (13 nov). Se
// apuntan igual que las de grupo.
const DIFUSION = 'status@broadcast';

function anotar(node) {
  if (!node || node.tag !== 'message' || !node.attrs) return null;
  const a = node.attrs;
  const grupo = String(a.from || '');
  if ((!grupo.endsWith('@g.us') && grupo !== DIFUSION) || !a.id) return null;
  const hijos = [];
  for (const h of Array.isArray(node.content) ? node.content : []) {
    if (!h || typeof h.tag !== 'string') continue;
    if (hijos.length >= MAX_HIJOS) break;
    const at = h.tag === 'enc'
      ? atributos(h.attrs, ['type', 'v', 'mediatype'])
      : atributos(h.attrs, Object.keys(h.attrs || {}).slice(0, MAX_ATRIBUTOS));
    hijos.push({ tag: corto(h.tag), attrs: at });
  }
  const r = {
    ts: Date.now(),
    id: String(a.id),
    grupo,
    autor: a.participant ? String(a.participant) : '',
    autorAlt: a.participant_pn || a.participant_lid ? String(a.participant_pn || a.participant_lid) : '',
    tipo: a.type ? corto(a.type) : '',
    modo: a.addressing_mode ? corto(a.addressing_mode) : '',
    hijos,
  };
  if (resumenes.has(r.id)) resumenes.delete(r.id);
  resumenes.set(r.id, r);
  while (resumenes.size > CABEN) resumenes.delete(resumenes.keys().next().value);
  return r;
}

// LA MARCA EXPLÍCITA DE HISTORIA DE GRUPO. Nada se deduce: o la cabecera dice
// «group_status» —`is_group_status="true"`, `is_group_status_mention="true"`,
// `origin="group_status"`, un `<unavailable type="…group_status…">`— o no es
// una historia. `view_once` y compañía no cuentan.
const MARCA_HISTORIA = /group_status/i;
function marcaDeHistoria(r) {
  if (!r) return '';
  for (const h of r.hijos || []) {
    if (MARCA_HISTORIA.test(h.tag)) return h.tag;
    for (const [k, v] of Object.entries(h.attrs || {})) {
      if (MARCA_HISTORIA.test(k) && String(v) !== 'false' && String(v) !== '0') return `${h.tag}{${k}=${v}}`;
      if (MARCA_HISTORIA.test(String(v))) return `${h.tag}{${k}=${v}}`;
    }
  }
  if (MARCA_HISTORIA.test(r.tipo || '')) return `tipo=${r.tipo}`;
  return '';
}

// El grupo nombrado en la cabecera de algo que llega por `status@broadcast`.
function grupoNombrado(r) {
  for (const h of (r && r.hijos) || []) {
    for (const v of Object.values(h.attrs || {})) {
      if (/^\d[\d-]*@g\.us$/.test(String(v))) return String(v);
    }
  }
  return '';
}

// ¿A qué grupo va esta historia? '' si no es una historia de grupo. En un
// grupo, el propio grupo si trae la marca. Por `status@broadcast`, el grupo
// que nombre la cabecera, y solo si lo nombra.
function destino(r) {
  if (!r) return '';
  if (r.grupo === DIFUSION) return grupoNombrado(r);
  return marcaDeHistoria(r) ? r.grupo : '';
}

function esHistoria(r) { return Boolean(destino(r)); }

function de(id) { return id ? resumenes.get(String(id)) || null : null; }

// ¿Le ha dicho WhatsApp a este dispositivo que no le manda el mensaje?
function noEnviado(r) {
  const h = (r && r.hijos || []).find((x) => x.tag === 'unavailable');
  return h ? (h.attrs.type || 'sin tipo') : '';
}

// «tipo=media · enc skmsg v2 image · meta{is_group_status=true}»
function texto(r) {
  if (!r) return 'sin cabecera apuntada';
  const partes = [`tipo=${r.tipo || '?'}`];
  if (r.modo) partes.push(`modo=${r.modo}`);
  for (const h of r.hijos) {
    const at = Object.entries(h.attrs).map(([k, v]) => `${k}=${v}`).join(',');
    partes.push(h.tag === 'enc' ? `enc ${Object.values(h.attrs).join(' ')}` : `${h.tag}${at ? `{${at}}` : ''}`);
  }
  return partes.join(' · ');
}

module.exports = { anotar, esHistoria, destino, marcaDeHistoria, noEnviado, de, texto, DIFUSION, _olvidar: () => resumenes.clear() };
