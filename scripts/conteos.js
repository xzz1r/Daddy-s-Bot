// ¿CUADRAN LOS CONTEOS? Se comprueban TODOS los comandos que dicen un número de
// mensajes, y por el camino real: se le dan mensajes de verdad a handleMessage y
// después se le pregunta al bot, en vez de mirar el almacén por dentro.
//
// EXISTE POR UN FALLO QUE EL GRUPO VIO. Alguien con 25 mensajes salió en
// *!inactivos* con 0. La causa no estaba en contar —eso iba bien— sino en
// CRUZAR: WhatsApp manda la lista de miembros de tres formas distintas y los
// mensajes llegan identificados con una cuarta. Si el cruce falla, la persona
// existe dos veces para el bot y ninguna de las dos tiene sus mensajes.
//
// Por eso cada comando se corre contra las tres formas de lista que manda
// WhatsApp:
//
//   1. por teléfono            → participants: [{ id: "34600...@s.whatsapp.net" }]
//   2. por @lid con teléfono   → participants: [{ id: "111...@lid", phoneNumber }]
//   3. por teléfono con @lid   → participants: [{ id: "34600...", lid: "111...@lid" }]
//
// Y además contra los montones heredados: mensajes guardados bajo un @lid crudo
// de antes de que se supiera de quién era. Esos tienen que juntarse solos, sin
// que nadie pierda un mensaje por el camino.
//
// TODO ESTO CORRE EN UNA COPIA DESECHABLE. El bot guarda los conteos en
// `data/`, así que ejecutar esto sobre el repo de verdad borraría los mensajes
// del grupo. Se copia `src` a un directorio temporal con su propio `data` vacío
// y se trabaja allí; al terminar se borra. Nada del repo real se toca.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO = path.join(__dirname, '..');
const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'ddb-conteos-'));
fs.cpSync(path.join(REPO, 'src'), path.join(ROOT, 'src'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'temp'), { recursive: true });
// node_modules se enlaza, no se copia: son cientos de megas y no se escribe en
// ellos. El enlace no afecta a `__dirname` de src, que es lo que decide dónde
// van los conteos, porque src sí está copiado de verdad.
try { fs.symlinkSync(path.join(REPO, 'node_modules'), path.join(ROOT, 'node_modules'), 'dir'); } catch {}
const limpiaSandbox = () => { try { fs.rmSync(ROOT, { recursive: true, force: true }); } catch {} };
process.chdir(ROOT);
process.env.OWNER_NUMBER = '999999999999';
const G = '120099@g.us', G2 = '120088@g.us', BOT = '549199@s.whatsapp.net';
// El monton heredado se siembra ANTES de cargar el bot: es lo que hay en el
// archivo de produccion de antes del arreglo — mensajes guardados bajo el @lid
// crudo, sin que nadie supiera de quien eran.
const VIEJO  = { tel:'5217777777777@s.whatsapp.net', lid:'777777777777@lid' };
// VIEJO2 es el mismo caso pero con la pareja YA sabida (la aprendio la lista de
// miembros, no un mensaje suyo): el monton sigue bajo el @lid crudo y lo que se
// mira es que los contadores lo junten al leer, sin esperar a que escriba.
const VIEJO2 = { tel:'5218888888888@s.whatsapp.net', lid:'888888888888@lid' };
// G3 es la tercera forma en que WhatsApp manda la lista: direccionado por
// telefono, con el @lid colgando de cada participante. Aqui la pareja NO se
// sabe de antes y lo unico que la cruza es ese campo `lid`.
const G3 = '120077@g.us';
const PN = { tel:'5219999999999@s.whatsapp.net', lid:'919191919191@lid' };
// Uno que YA NO ESTA. El contador guarda los mensajes de todo el que haya
// hablado alguna vez, asi que sin el filtro de miembros actuales los rankings
// seguian nombrando —y mencionando— a gente expulsada hace meses.
const EX = { tel:'5210000000000@s.whatsapp.net' };
fs.mkdirSync(`${ROOT}/data`, { recursive: true });
fs.writeFileSync(`${ROOT}/data/messageCounts.json`, JSON.stringify({
  [G2]: { [VIEJO.lid]: 30, [VIEJO2.lid]: 12 },
  [G3]: { [PN.lid]: 20 },
  [G]:  { [EX.tel]: 99 },
}));
fs.writeFileSync(`${ROOT}/data/lidMap.json`, JSON.stringify({ [VIEJO2.lid]: VIEJO2.tel }));
// Y lo mismo para el contador del dia, que es el que paga los bonos: si no
// junta las dos formas, la persona pierde los bonos que ya tenia ganados.
{
  const { claveDia } = require(`${ROOT}/src/utils/helpers`);
  const { DIA } = require(`${ROOT}/src/utils/economia`);
  const hoy = claveDia(Date.now(), DIA.zona, DIA.horaCorte);
  fs.writeFileSync(`${ROOT}/data/casino.json`, JSON.stringify({
    [G2]: { dia: hoy, counts: { [VIEJO.lid]: 30, [VIEJO2.lid]: 12 }, tiradas: {}, hitos: {} },
  }));
}
const ADMIN = '34600000001@s.whatsapp.net';
// Seis perfiles: hace falta un minimo de gente para que !top5 tenga de donde
// sortear, y tres cantidades distintas (mucho / poco / nada) para separar lo que
// mide cada comando.
const P = [
  { n:'HABLADOR', tel:'5211111111111@s.whatsapp.net', lid:'111111111111@lid', msgs:40 },
  { n:'MEDIO',    tel:'5214444444444@s.whatsapp.net', lid:'444444444444@lid', msgs:25 },
  { n:'NORMAL',   tel:'5215555555555@s.whatsapp.net', lid:'555555555555@lid', msgs:15 },
  { n:'JUSTO',    tel:'5216666666666@s.whatsapp.net', lid:'666666666666@lid', msgs:11 },
  { n:'FLOJO',    tel:'5212222222222@s.whatsapp.net', lid:'222222222222@lid', msgs:4  },
  { n:'MUDO',     tel:'5213333333333@s.whatsapp.net', lid:'333333333333@lid', msgs:0  },
];
const de = (n) => P.find(p => p.n === n);
const num = (p) => p.tel.split('@')[0];

let handleMessage; // se carga abajo, ya sembrado el archivo
const { addAura } = require(`${ROOT}/src/utils/auraStore`);
const { getUserCount } = require(`${ROOT}/src/utils/messageCounter`);
const { getCasinoCount } = require(`${ROOT}/src/utils/casinoStore`);

let fallos = 0;
const linea = (e, ok, x = '') => { if (!ok) fallos++; console.log(`  ${e.padEnd(58)} ${ok ? '✓' : '✗'} ${x}`); };

const partsTel = [{ id:BOT, admin:'admin' }, { id:ADMIN, admin:'admin' }, ...P.map(p => ({ id:p.tel }))];
const partsLid = [{ id:BOT, admin:'admin' }, { id:ADMIN, admin:'admin' }, ...P.map(p => ({ id:p.lid, phoneNumber:p.tel }))];

function sock(cap) {
  return { user:{ id:BOT }, sendPresenceUpdate:async()=>{}, readMessages:async()=>{},
    sendMessage: async (j, c) => { cap.push(c.text || ''); return {}; },
    groupMetadata: async (j) => ({ id:j, subject:'G', participants:cap.parts }),
    groupParticipantsUpdate: async () => [],
    groupFetchAllParticipating: async () => ({ [G]: { id:G, participants:cap.parts } , [G2]: { id:G2, participants:cap.parts } }),
    onWhatsApp: async (j) => [{ exists:true, jid:j }] };
}
async function manda(quien, alt, texto, parts, menciones = null, grupo = G) {
  const cap = []; cap.parts = parts;
  const message = menciones
    ? { extendedTextMessage: { text: texto, contextInfo: { mentionedJid: menciones } } }
    : { conversation: texto };
  await handleMessage(sock(cap), { key: { remoteJid:grupo, participant:quien, participantAlt:alt,
    addressingMode:'lid', fromMe:false, id:'M' + Math.random() },
    message, pushName:'x', messageTimestamp: Math.floor(Date.now() / 1000) });
  await new Promise(r => setTimeout(r, 45));
  return cap.join('\n');
}

(async () => {
  ({ handleMessage } = require(`${ROOT}/src/handlers/messageHandler`));
  // El borrado se apunta DESPUÉS de cargar el bot, y no antes, a propósito.
  // helpers.js registra su propio `process.once('exit')` para guardar el
  // historial de frases al salir, y los manejadores corren en orden de
  // registro: apuntando el borrado el primero, ese guardado se ejecutaba
  // después y volvía a crear el directorio recién borrado. Cada ejecución
  // dejaba un resto en /tmp.
  process.on('exit', limpiaSandbox);
  console.log('\n════ escriben llegando por @lid (grupo listado por telefono) ════\n');
  for (const p of P) for (let i = 0; i < p.msgs; i++) await manda(p.lid, p.tel, 'hola ' + i, partsTel);

  for (const p of P) {
    const t = await getUserCount(G, p.tel), l = await getUserCount(G, p.lid);
    linea(`${p.n}: el contador dice ${p.msgs} por telefono y por @lid`,
      t === p.msgs && l === p.msgs, `dice ${t} / ${l}`);
  }

  await addAura(G, ADMIN, 500000);
  const pr  = (t, m) => manda(ADMIN, ADMIN, t, partsTel, m);
  const pr2 = (t, m) => manda(ADMIN, ADMIN, t, partsLid, m);

  // Cada bloque se corre DOS VECES: con la lista de miembros por telefono y con
  // la lista por @lid. Son los dos formatos que manda WhatsApp y el cruce contra
  // los conteos tiene que dar lo mismo en los dos.
  for (const [etiqueta, envia, parts] of [['TELEFONO', pr, partsTel], ['@LID', pr2, partsLid]]) {
    console.log(`\n════ los comandos, con el grupo listado por ${etiqueta} ════\n`);

    const count = await envia('!count');
    for (const p of P.filter(p => p.msgs > 0)) {
      linea(`!count: ${p.n} sale con ${p.msgs}`,
        new RegExp(`@${num(p)}[^\\n]*\\b${p.msgs}\\b`).test(count) ||
        new RegExp(`\\b${p.msgs}\\b[^\\n]*@${num(p)}`).test(count));
    }
    linea('!count: el mudo NO sale', !count.includes(`@${num(de('MUDO'))}`));
    linea('!count: el que se fue NO sale, aunque tenga 99', !count.includes(EX.tel.split('@')[0]));

    // !count @alguien — cifra exacta y puesto en la tabla.
    const uno = await envia('!count @' + num(de('MEDIO')), [de('MEDIO').tel]);
    linea('!count @medio: dice 25 mensajes', /\*25 mensajes\*/.test(uno), uno.trim().split('\n')[0]);
    linea('!count @medio: y su puesto es el #2', /puesto #2/.test(uno));

    // MENCIONAR POR @lid TIENE QUE DAR LO MISMO. En un grupo LID la mencion
    // viaja con el @lid de la persona, no con su telefono, y el conteo esta
    // guardado bajo el telefono: si se comparan en crudo, sale 0.
    const porLid = await envia('!count @' + de('MEDIO').lid.split('@')[0], [de('MEDIO').lid]);
    linea('!count mencionando por @lid: sigue diciendo 25', /\*25 mensajes\*/.test(porLid),
      porLid.trim().split('\n')[0]);

    const rel = await envia('!relevancia @' + num(de('NORMAL')), [de('NORMAL').tel]);
    linea('!relevancia: dice 15 mensajes', /\*15 mensajes\*/.test(rel));

    const vs = await envia(`!vs @${num(de('HABLADOR'))} @${num(de('FLOJO'))}`,
      [de('HABLADOR').tel, de('FLOJO').tel]);
    linea('!vs: 40 msgs contra 4 msgs', /40 msgs/.test(vs) && /\b4 msgs/.test(vs), vs.match(/@\d+ — \d+ msgs/g)?.join(' | '));
    linea('!vs: gana el hablador por 36', new RegExp(`@${num(de('HABLADOR'))} domina por \\*36\\*`).test(vs));

    const fant = await envia('!fantasmas');
    const iF = fant.indexOf(num(de('FLOJO'))), iH = fant.indexOf(num(de('HABLADOR')));
    linea('!fantasmas: el flojo antes que el hablador', iF >= 0 && (iH < 0 || iF < iH));

    const inact = await envia('!inactivos');
    linea('!inactivos: saca al mudo', inact.includes(num(de('MUDO'))));
    linea('!inactivos: NO saca al hablador', !inact.includes(num(de('HABLADOR'))));
    linea('!inactivos: NO saca al justo (11 > 10)', !inact.includes(num(de('JUSTO'))));
    linea('!inactivos: saca al flojo (4 <= 10)', inact.includes(num(de('FLOJO'))));

    // !top5 cruza los conteos con la lista de miembros: si el cruce falla, el
    // sorteo se queda sin gente y contesta "no hay suficientes".
    const top = await envia('!top5 gilipollas');
    const plazas = (top.match(/^\s*\*\d+\.\*  @\d+$/gm) || []).length;
    const fuera = [num(de('MUDO')), EX.tel.split('@')[0]];
    const colados = (top.match(/@(\d+)/g) || []).some(m => fuera.includes(m.slice(1)));
    linea('!top5: 5 plazas, sin mudos ni gente que se fue', plazas === 5 && !colados,
      /No hay suficientes/.test(top) ? top.trim() : `${plazas} plazas`);
  }

  console.log('\n════ el contador diario (bonos, racha y !aura hoy) ════\n');
  for (const p of [de('HABLADOR'), de('FLOJO'), de('MUDO')]) {
    const t = await getCasinoCount(G, p.tel), l = await getCasinoCount(G, p.lid);
    linea(`${p.n}: el contador del dia dice ${p.msgs} por las dos formas`,
      t === p.msgs && l === p.msgs, `dice ${t} / ${l}`);
  }
  const hoy = await manda(de('FLOJO').lid, de('FLOJO').tel, '!aura hoy', partsTel);
  const mHoy = hoy.match(/Mensajes hoy: \*(\d+)\*/);
  const enTienda = await getCasinoCount(G, de('FLOJO').tel);
  linea('!aura hoy: enseña lo que dice el contador', !!mHoy && Number(mHoy[1]) === enTienda,
    mHoy ? `dice ${mHoy[1]}, guardado ${enTienda}` : 'no sale la linea');

  console.log('\n════ montones viejos guardados antes de conocer la pareja ════\n');
  // En cuanto esa persona escribe una vez, la pareja @lid↔telefono se aprende y
  // los dos montones tienen que juntarse solos. Si no, sale con menos mensajes
  // de los que tiene para siempre, y nadie se entera.
  const parts2 = [{ id:BOT, admin:'admin' }, { id:ADMIN, admin:'admin' }, { id:VIEJO.tel }];
  linea('antes de escribir: el monton viejo no se le cruza', await getUserCount(G2, VIEJO.tel) === 0);
  // Y MIENTRAS NO SE CRUCE, NADIE LO LLAMA INACTIVO. Es la red de seguridad:
  // el bot ve que le quedan @lid sin resolver y prefiere callarse un nombre
  // antes que acusar de mudo a quien lleva treinta mensajes.
  await addAura(G2, ADMIN, 500000);
  const inac2 = await manda(ADMIN, ADMIN, '!inactivos', parts2, null, G2);
  linea('y NADIE lo saca en !inactivos por 0 mensajes', !inac2.includes(VIEJO.tel.split('@')[0]),
    inac2.trim().split('\n').slice(-2)[0]);
  await manda(VIEJO.lid, VIEJO.tel, 'vuelvo', parts2, null, G2);
  const junto = await getUserCount(G2, VIEJO.tel);
  linea('escribe una vez y recupera los 30 + 1', junto === 31, `dice ${junto}`);
  // Pareja ya sabida, monton todavia bajo el @lid: se junta al leer, sin que la
  // persona tenga que escribir nada.
  const v2 = await getUserCount(G2, VIEJO2.tel), v2d = await getCasinoCount(G2, VIEJO2.tel);
  linea('pareja ya sabida: los dos contadores dicen 12 ya', v2 === 12 && v2d === 12, `dice ${v2} / ${v2d}`);

  const dia2 = await getCasinoCount(G2, VIEJO.tel);
  linea('el contador del dia tambien junta los 30 + 1', dia2 === 31, `dice ${dia2}`);
  const cuenta = await manda(ADMIN, ADMIN, '!count @' + VIEJO.tel.split('@')[0], parts2, [VIEJO.tel], G2);
  linea('y !count se lo enseña ya junto', /\*31 mensajes\*/.test(cuenta), cuenta.trim().split('\n')[0]);

  console.log('\n════ lista de miembros por telefono con el @lid colgando ════\n');
  const parts3 = [{ id:BOT, admin:'admin' }, { id:ADMIN, admin:'admin' }, { id:PN.tel, lid:PN.lid }];
  await addAura(G3, ADMIN, 500000);
  const c3 = await manda(ADMIN, ADMIN, '!count', parts3, null, G3);
  linea('!count cruza el monton por el campo lid del participante', /\b20\b/.test(c3), c3.trim().split('\n').slice(2, 3)[0]);
  // Y lo nombra por su TELEFONO. Con el @lid crudo delante, WhatsApp no sabe a
  // quien esta mencionando y en el grupo sale un numero que no es de nadie.
  linea('y lo nombra por su telefono, no por el @lid crudo',
    c3.includes('@' + PN.tel.split('@')[0]) && !c3.includes('@' + PN.lid.split('@')[0]));
  const i3 = await manda(ADMIN, ADMIN, '!inactivos', parts3, null, G3);
  linea('y !inactivos no lo llama mudo', !i3.includes(PN.tel.split('@')[0]));

  console.log(`\n  ${fallos === 0 ? '✓ todos los conteos cuadran' : '✗ ' + fallos + ' fallo(s)'}\n`);
  // Los almacenes guardan con retardo. Se les da un respiro antes de borrar la
  // copia: si no, un guardado en vuelo recrea el directorio justo después de
  // haberlo borrado y deja restos en /tmp cada vez que se corre esto.
  await new Promise((r) => setTimeout(r, 400));
  limpiaSandbox();
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
