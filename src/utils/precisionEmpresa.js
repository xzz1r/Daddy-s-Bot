'use strict';

// ─── CUÁNTO ACIERTA EL ANTI-EMPRESA, MEDIDO POR EL PROPIO BOT ───────────────
//
// El dueño, 22 oct: «mide el % de precisión actual», y luego: «debe ser algo
// interno del bot, no algo que todo el mundo deba ver. En la VPS es superior,
// y que lo muestre tras cada npm run update».
//
// Medirlo exige preguntarle a WhatsApp por el perfil de cada cuenta vetada, y
// eso solo lo puede hacer el bot con su sesión. Así que lo hace él, solo, una
// vez al día, y lo guarda en data/precisionEmpresa.json. `npm run estado` (que
// `npm run update` corre al final) lo lee y lo enseña. En el grupo no sale
// nada.
//
// A cada cuenta que el anti-empresa ha vetado (by 'auto'; las vetadas a mano
// no cuentan) se le mira el perfil HOY:
//
//   business → sigue siendo cuenta de WhatsApp Business: acierto
//   normal   → es una cuenta de WhatsApp normal: fallo (dejó la app, o nunca
//              la tuvo). Su veto se levanta solo cuando vuelva a entrar.
//   sin comprobar → número oculto o el perfil no contesta: no cuenta.
//
// Precisión = business ÷ (business + normal).
//
// UNA A UNA y con el ritmo de getBusinessProfile (utils/ritmo.js), unos tres
// segundos por cuenta: preguntar por cincuenta perfiles seguidos es lo que
// hace un raspador.

const path = require('path');
const { atomicWriteJson, readJsonOrEnoent } = require('./helpers');
const { bareJid, resolverLid } = require('./wa');
const { businessEvidence } = require('./businessCheck');
const { listBanned } = require('./banlist');
const logger = require('./logger');

const FILE = path.join(__dirname, '../../data/precisionEmpresa.json');
const DIA = 24 * 60 * 60 * 1000;
// Diez minutos después de conectar, para no pisar el arranque.
const PRIMERA_MS = 10 * 60 * 1000;

// Un veto puesto por el anti-empresa: automático y con su motivo.
const esVetoDeEmpresa = (v) => v?.by === 'auto' && /^cuenta business/i.test(String(v.reason || ''));

const corta = (j) => {
  const id = String(j).split('@')[0];
  return (String(j).endsWith('@lid') ? '@' : '+') + id;
};

let midiendo = false;

async function medir(sock) {
  if (midiendo) return null;
  midiendo = true;
  try {
    // Una persona puede tener varias formas vetadas (teléfono y LID): se
    // agrupan por `aka`, como en *!fklist*.
    const vistos = new Set();
    const personas = [];
    for (const c of await listBanned()) {
      if (!esVetoDeEmpresa(c) || vistos.has(c.account)) continue;
      const formas = [...new Set((c.aka && c.aka.length ? c.aka : [c.account]).map(bareJid))];
      for (const f of formas) vistos.add(f);
      personas.push({ cuenta: c.account, formas });
    }

    let business = 0, sinComprobar = 0;
    const normales = [];
    for (const p of personas) {
      let tel = p.formas.find((f) => f.endsWith('@s.whatsapp.net')) || null;
      if (!tel) {
        for (const f of p.formas) { tel = await resolverLid(sock, f).catch(() => null); if (tel) break; }
      }
      const ev = tel
        ? await businessEvidence(sock, tel).catch(() => ({ estado: 'desconocido' }))
        : { estado: 'desconocido' };
      if (ev.estado === 'biz') business++;
      else if (ev.estado === 'personal') normales.push(corta(tel || p.cuenta));
      else sinComprobar++;
    }

    const mirados = business + normales.length;
    const dato = {
      ts: Date.now(),
      vetadas: personas.length,
      business,
      normales,
      sinComprobar,
      pct: mirados ? Math.round((business / mirados) * 100) : null,
    };
    await atomicWriteJson(FILE, dato);
    logger.info(`Anti-empresa: precisión ${dato.pct ?? '—'} % (${business} Business, ${normales.length} normales, ${sinComprobar} sin comprobar)`);
    return dato;
  } finally {
    midiendo = false;
  }
}

async function leer() {
  return readJsonOrEnoent(FILE, null).catch(() => null);
}

// Una vez al día, la primera a los diez minutos de conectar. Si la última
// medida es de hace menos de un día (un reinicio, un update), se espera a que
// toque: no se pregunta dos veces por lo mismo.
let reloj = null;
function programar(getSock) {
  if (reloj) return;
  const toca = async () => {
    const sock = getSock();
    if (!sock) return;
    const ultima = await leer();
    if (ultima?.ts && Date.now() - ultima.ts < DIA - 60 * 1000) return;
    await medir(sock).catch((e) => logger.warn(`Anti-empresa: no pude medir la precisión: ${e.message}`));
  };
  const primera = setTimeout(() => { toca(); }, PRIMERA_MS);
  primera.unref?.();
  reloj = setInterval(() => { toca(); }, 60 * 60 * 1000);
  reloj.unref?.();
}

// La línea de `npm run estado`. Va aquí y no allí para que la capa la pruebe.
function lineaEstado(dato, ahora = Date.now()) {
  if (!dato || !dato.ts) return { tipo: 'ok', texto: 'Anti-empresa: precisión sin medir todavía (el bot la mide una vez al día)' };
  const horas = Math.max(0, Math.round((ahora - dato.ts) / 3600000));
  const hace = horas < 1 ? 'hace menos de una hora' : horas < 48 ? `hace ${horas} h` : `hace ${Math.round(horas / 24)} días`;
  if (!dato.vetadas) return { tipo: 'ok', texto: `Anti-empresa: no ha vetado a nadie todavía (${hace})` };
  const base = dato.pct === null
    ? `Anti-empresa: ${dato.vetadas} vetadas, ninguna se ha podido mirar`
    : `Anti-empresa: ${dato.pct} % de precisión (${dato.business} de ${dato.business + dato.normales.length}`
      + `${dato.sinComprobar ? `; ${dato.sinComprobar} sin comprobar` : ''})`;
  if (!dato.normales.length) return { tipo: 'ok', texto: `${base} · ${hace}` };
  const lista = dato.normales.slice(0, 8).join(', ') + (dato.normales.length > 8 ? ` y ${dato.normales.length - 8} más` : '');
  return {
    tipo: 'aviso',
    texto: `${base} · ${hace}. Vetadas que hoy son WhatsApp normal: ${lista}`,
    arreglo: 'se les quita el veto solo cuando vuelvan a entrar; para ya: !fkunban <número> en el grupo',
  };
}

module.exports = { medir, leer, programar, lineaEstado, esVetoDeEmpresa };
