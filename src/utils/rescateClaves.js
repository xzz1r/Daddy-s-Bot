'use strict';

// ─── LA CLAVE DE GRUPO QUE EL BOT TIENE, PERO GUARDADA CON OTRO NOMBRE (13 nov) ─
//
// El dueño: «el bot no está baneando a la peña que sube estados al grupo ni
// borrando los estados». `npm run estado` lo explicaba a medias: cuarenta
// mensajes de grupo en un día que el bot no pudo abrir (el tope de la
// bitácora, o sea más), de unos pocos números, y ninguna historia vista. Lo
// que no se abre no se mira, y una historia que no se mira no se castiga.
//
// Cada persona cifra lo que manda a un grupo con SU clave de remitente, y se
// la reparte a cada dispositivo una vez. Baileys la guarda con un nombre hecho
// de tres cosas: el grupo, la persona y su dispositivo. Y la busca con esas
// mismas tres al descifrar. Si una cambia por el camino, la clave está en el
// disco y Baileys dice que no la tiene («No session found to decrypt
// message»). Pasa con la persona: WhatsApp manda a la misma gente unas veces
// con su @lid y otras con su teléfono (lo mismo que obligó a hacer
// utils/persona.js), y Baileys no traduce el nombre de las claves de grupo,
// solo el de las sesiones de uno a uno. Y puede pasar con el grupo: el reparto
// dice para qué grupo es la clave, y el bot no lo comprobaba.
//
// Aquí, cuando falla, se prueba con los otros nombres que puede tener esa
// misma clave: la otra forma de la persona (la que Baileys ya tiene apuntada
// en el disco, sin preguntar a WhatsApp) y los grupos para los que esa
// persona le repartió clave. Probar no cambia nada: una clave equivocada no
// pasa la firma y Baileys solo guarda tras abrir. Si ninguna abre, el error de
// siempre sigue su camino, y Baileys le pide el mensaje al teléfono del bot
// como hasta ahora.
//
// Lo que se rescata se cuenta (bitacoraEstados.apuntarRescate) para que `npm
// run estado` diga si esto está abriendo mensajes o si el fallo es otro.

const MARCA = Symbol.for('daddy.rescateClaves');
const CABEN_AUTORES = 3000;
const GRUPOS_POR_AUTOR = 6;
const CANDIDATOS = 8;

// usuario (sin dispositivo ni dominio) -> grupos para los que repartió clave
const gruposDeAutor = new Map();
const cuenta = { intentos: 0, rescatados: 0, porVia: {} };

const usuarioDe = (jid) => String(jid || '').split('@')[0].split(':')[0];
const dispositivoDe = (jid) => {
  const d = String(jid || '').split('@')[0].split(':')[1];
  return d ? Number(d) || 0 : 0;
};
const servidorDe = (jid) => String(jid || '').split('@')[1] || '';

function anotarReparto(autor, grupo) {
  const u = usuarioDe(autor);
  const g = String(grupo || '');
  if (!u || !g) return;
  const set = gruposDeAutor.get(u) || new Set();
  set.delete(g);
  set.add(g);
  while (set.size > GRUPOS_POR_AUTOR) set.delete(set.values().next().value);
  gruposDeAutor.delete(u);
  gruposDeAutor.set(u, set);
  while (gruposDeAutor.size > CABEN_AUTORES) gruposDeAutor.delete(gruposDeAutor.keys().next().value);
}

// La otra forma de la persona, con el mismo dispositivo. Solo lo que ya está
// en el disco: nada de esto pregunta a WhatsApp (ver utils/ritmo.js).
async function otraForma(repo, keys, autor) {
  const s = String(autor || '');
  const u = usuarioDe(s);
  const dev = dispositivoDe(s);
  const sufijo = dev ? `:${dev}` : '';
  try {
    if (servidorDe(s) === 'lid') {
      const got = keys && typeof keys.get === 'function' ? await keys.get('lid-mapping', [`${u}_reverse`]) : null;
      const pn = got && got[`${u}_reverse`];
      if (pn && typeof pn === 'string') return `${pn}${sufijo}@s.whatsapp.net`;
      const viaRepo = repo?.lidMapping?.getPNForLID ? await repo.lidMapping.getPNForLID(s) : null;
      return viaRepo || null;
    }
    if (servidorDe(s) === 's.whatsapp.net') {
      const got = keys && typeof keys.get === 'function' ? await keys.get('lid-mapping', [u]) : null;
      const lid = got && got[u];
      if (lid && typeof lid === 'string') return `${lid}${sufijo}@lid`;
    }
  } catch { /* sin mapa no hay otra forma */ }
  return null;
}

async function alternativas(repo, keys, { group, authorJid }) {
  const formas = [authorJid];
  const otra = await otraForma(repo, keys, authorJid);
  if (otra && usuarioDe(otra) !== usuarioDe(authorJid)) formas.push(otra);
  const grupos = [String(group || '')];
  for (const f of formas) {
    for (const g of gruposDeAutor.get(usuarioDe(f)) || []) if (!grupos.includes(g)) grupos.push(g);
  }
  const out = [];
  for (const g of grupos) {
    for (const [i, f] of formas.entries()) {
      if (g === group && f === authorJid) continue;
      const via = g === group ? 'otra forma' : (i === 0 ? 'otro grupo' : 'otro grupo y otra forma');
      out.push({ group: g, authorJid: f, via });
      if (out.length >= CANDIDATOS) return out;
    }
  }
  return out;
}

// Se engancha al repositorio de Signal del socket. Una vez por socket: Baileys
// llama a `repository.decryptGroupMessage` en cada mensaje cifrado de grupo,
// buscándolo en el objeto en ese momento, así que basta con cambiarlo ahí.
function instalar(sock, { logger = null, alRescatar = null } = {}) {
  const repo = sock && sock.signalRepository;
  if (!repo || typeof repo.decryptGroupMessage !== 'function') return false;
  if (repo[MARCA]) return true;
  const keys = sock.authState && sock.authState.keys;
  const descifrar = repo.decryptGroupMessage.bind(repo);
  if (typeof repo.processSenderKeyDistributionMessage === 'function') {
    const repartir = repo.processSenderKeyDistributionMessage.bind(repo);
    repo.processSenderKeyDistributionMessage = async (args) => {
      try { anotarReparto(args && args.authorJid, args && args.item && args.item.groupId); } catch { /* solo apunta */ }
      return repartir(args);
    };
  }
  repo.decryptGroupMessage = async (args) => {
    try {
      return await descifrar(args);
    } catch (err) {
      let otras = [];
      try { otras = await alternativas(repo, keys, args || {}); } catch { otras = []; }
      for (const alt of otras) {
        cuenta.intentos++;
        try {
          const claro = await descifrar({ ...args, group: alt.group, authorJid: alt.authorJid });
          cuenta.rescatados++;
          cuenta.porVia[alt.via] = (cuenta.porVia[alt.via] || 0) + 1;
          try {
            if (logger) logger.info(`clave de grupo rescatada (${alt.via}) en ${args.group} de ${usuarioDe(args.authorJid)}`);
            if (alRescatar) alRescatar({ grupo: args.group, quien: args.authorJid, via: alt.via });
          } catch { /* contar nunca tumba un descifrado */ }
          return claro;
        } catch { /* la siguiente */ }
      }
      throw err;
    }
  };
  repo[MARCA] = true;
  return true;
}

module.exports = {
  instalar,
  cuantos: () => ({ ...cuenta, porVia: { ...cuenta.porVia } }),
  _alternativas: alternativas,
  _anotarReparto: anotarReparto,
  _olvidar: () => { gruposDeAutor.clear(); cuenta.intentos = 0; cuenta.rescatados = 0; cuenta.porVia = {}; },
};
