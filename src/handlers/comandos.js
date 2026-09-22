'use strict';

// EL REGISTRO DE COMANDOS. Un comando y sus alias, y lo que hace falta saber de
// ellos, en UNA fila.
//
// POR QUE EXISTE. Antes cada propiedad de un comando vivia en su propia lista a
// mano dentro de messageHandler.js —NEEDS_META, COBRO_CENTRAL, LENTOS,
// COBRAN_SOLOS, CMDS_AURA, SOLO_CONSULTA, MEDIA_CMDS— mas el `case` del
// switch. Añadir un alias era un ritual de ocho sitios, y se hacia mal: al
// pasar a esto aparecieron *!song*, *!stimg* y *!foto* sin el «escribiendo…»
// de su comando principal, y *!conteo* metido en una lista pero sin `case`, o
// sea que no funcionaba y nadie lo sabia.
//
// Ahora el alias se añade a su familia AQUI y hereda todo. El switch sigue
// teniendo el `case` —el cuerpo de cada comando vive ahi— y la puerta exige que
// las familias del switch y las de este fichero sean las mismas, asi que un
// alias que se añada en un sitio y no en el otro no pasa.
//
// Las propiedades:
//   meta        necesita la metadata del grupo (admins, participantes)
//   lento       tarda: se enseña «escribiendo…» mientras trabaja
//   cobro       concepto de PRECIOS que cuesta; un objeto si cambia por nombre
//   cobraDentro cobra el propio comando (sabe cuando no ha servido y devuelve);
//               el cobro central no le toca, pero la puerta del privado si
//   aura        mueve aura: se congela con la economia apagada
//   consulta    solo mira la economia, no la mueve: sigue con ella apagada
//   media       su texto acompaña a una foto/video; la moderacion no lo toma
//               por media suelta
//
// `grupo` es una familia que no se escribe aqui porque ya tiene su fuente:
// los alias de acciones (acciones.ALIAS_ACTIVOS) y los de porcentaje. Si mañana
// hay una accion nueva, entra sola.

const FAMILIAS = [
  { nombres: ['musica', 'cancion', 'song', 'playsong', 'playaudio', 'play'], meta: true, lento: true, cobraDentro: true, cobro: 'play' },
  { nombres: ['tt', 'tiktok'], lento: true, cobraDentro: true, cobro: 'redes' },
  { nombres: ['ig', 'insta', 'instagram'], lento: true, cobraDentro: true, cobro: 'redes' },
  { nombres: ['pin', 'pinterest'], lento: true, cobraDentro: true, cobro: 'redes' },
  { nombres: ['x', 'twitter', 'tuit', 'tweet'], lento: true, cobraDentro: true, cobro: 'redes' },
  { nombres: ['next', 'otra', 'siguiente'] },
  { nombres: ['cachelist', 'listacache', 'cache'], meta: true, cobro: 'cachelist' },
  { nombres: ['clearcache', 'borracache'], meta: true },
  { nombres: ['whoami'], meta: true },
  { nombres: ['s', 'sticker', 'stk'], meta: true, lento: true, cobraDentro: true, media: true, cobro: 'sticker' },
  { nombres: ['k'], meta: true },
  { nombres: ['diag'], meta: true },
  { nombres: ['top5'], meta: true, cobraDentro: true, cobro: 'top5' },
  { nombres: ['top10'], meta: true, cobraDentro: true, cobro: 'top10' },
  { nombres: ['count', 'conteo'], meta: true, lento: true },
  { nombres: ['caso', 'expediente'], meta: true, lento: true, cobro: 'caso' },
  { grupo: 'CMDS_PORCENTAJE', meta: true, cobro: 'percent' },
  { nombres: ['importancia', 'relevancia', 'relevance'], meta: true, lento: true, cobro: 'relevancia' },
  { nombres: ['resetcount', 'resetconteo'], meta: true },
  { nombres: ['r', 'presentarse', 'presentacion'], meta: true },
  { nombres: ['tagall', 'todos', 'all', 'everyone'], meta: true },
  { nombres: ['adm'], meta: true },
  { nombres: ['promote', 'ascender'], meta: true },
  { nombres: ['demote', 'degradar'], meta: true },
  { nombres: ['notifadmin'], meta: true },
  { nombres: ['antiadmin'], meta: true },
  { nombres: ['antifoto'], meta: true },
  { nombres: ['antiempresa', 'antibusiness'], meta: true },
  { nombres: ['allow', 'permitir'], meta: true },
  { nombres: ['adminmode', 'soloadmins', 'soloadmin'], meta: true },
  { nombres: ['autoaccept', 'autoapprove', 'autoaceptar', 'autoaprobar'], meta: true },
  { nombres: ['antilink'], meta: true },
  { nombres: ['scan', 'escanear'], meta: true, lento: true },
  { nombres: ['fk', 'verificar', 'verify', 'check'], meta: true, lento: true, cobraDentro: true, media: true, cobro: 'fk' },
  { nombres: ['marcarfake', 'fake'], meta: true },
  { nombres: ['banear', 'ban', 'fkban'], meta: true },
  { nombres: ['desbanear', 'unban', 'fkunban'], meta: true },
  { nombres: ['fklist'], meta: true },
  { nombres: ['listanegra'], meta: true },
  { nombres: ['p'], meta: true, lento: true },
  { nombres: ['purge'], meta: true, lento: true },
  { nombres: ['purgeall'], meta: true, lento: true },
  { nombres: ['antifake', 'antifk'], meta: true },
  { nombres: ['close', 'cerrar'], meta: true },
  { nombres: ['open', 'abrir'], meta: true },
  { nombres: ['sacar', 'echar', 'kick', 'expulsar'], meta: true },
  { nombres: ['del', 'borrar', 'delete'], meta: true },
  { nombres: ['limpiar', 'wipe'], meta: true, lento: true },
  { nombres: ['silenciar', 'callar', 'mute'], meta: true },
  { nombres: ['unmute', 'desmute'], meta: true },
  { nombres: ['ship'], meta: true, cobro: 'ship' },
  { nombres: ['texto', 'ttp'], meta: true, lento: true, cobro: 'ttp' },
  { nombres: ['toimg', 'stimg'], meta: true, lento: true, cobraDentro: true, media: true, cobro: 'toimg' },
  { nombres: ['tovid'], meta: true, lento: true, cobraDentro: true, media: true, cobro: 'tovid' },
  { nombres: ['pfp', 'foto'], meta: true, lento: true, cobraDentro: true, cobro: 'pfp' },
  { nombres: ['rizz'], meta: true, cobro: 'rizz' },
  { nombres: ['piropo', 'wingman'], meta: true, cobro: { piropo: 'piropo', wingman: 'wingman' } },
  { nombres: ['aura'], meta: true },
  { nombres: ['apostar', 'apuesta', 'apuestas'], meta: true },
  { nombres: ['ranking', 'top', 'auratop'], meta: true },
  { nombres: ['hoy'], meta: true },
  { nombres: ['saldo', 'miaura'], meta: true },
  { nombres: ['guia', 'aurahelp', 'guiaaura'], meta: true },
  { nombres: ['resetaura'], meta: true },
  { nombres: ['mog', 'moggear'], meta: true, cobro: 'mog' },
  { nombres: ['quemar', 'destruir', 'roast', 'flamear'], meta: true, lento: true, cobro: 'roast' },
  { nombres: ['regalar', 'transferir', 'pagar', 'dar', 'donar'], meta: true, aura: true },
  { nombres: ['robo', 'robar'], meta: true, aura: true },
  { nombres: ['tienda', 'shop'], meta: true, consulta: true },
  { nombres: ['comprar'], meta: true, consulta: true },
  { nombres: ['bote'], meta: true, consulta: true },
  { nombres: ['contrarobo', 'contraataque', 'contraatacar', 'vengarse'], meta: true, aura: true },
  { nombres: ['visto'], meta: true },
  { nombres: ['vault', 'safe'], meta: true, consulta: true },
  { nombres: ['lock', 'stash'], meta: true, aura: true },
  { nombres: ['unlock'], meta: true, aura: true },
  { grupo: 'ALIAS_ACCION', meta: true, lento: true, cobraDentro: true },
  { nombres: ['asalto', 'asaltar'], meta: true, aura: true },
  { nombres: ['atraco', 'atracar'], meta: true, aura: true },
  { nombres: ['caja', 'registradora'], meta: true, consulta: true },
  { nombres: ['buscados', 'wanted', 'mostwanted', 'recompensas', 'cartel'], meta: true, consulta: true },
  { nombres: ['duel', 'duelo', '1v1'], meta: true, aura: true },
  { nombres: ['vs', 'versus'], meta: true, lento: true, cobraDentro: true, cobro: 'vs' },
  { nombres: ['muertos', 'fantasma', 'fantasmas'], meta: true, lento: true, cobro: 'fantasmas' },
  { nombres: ['inactivos', 'inactivo'], meta: true, lento: true },
  { nombres: ['on'], meta: true },
  { nombres: ['off'], meta: true },
  { nombres: ['ping'] },
  { nombres: ['info', 'estado', 'status'] },
  { nombres: ['casino'], meta: true },
  { nombres: ['ayuda', 'help', 'menu', 'commands'], meta: true },
];

function construirListas({ ALIAS_ACCION, CMDS_PORCENTAJE }) {
  const grupos = { ALIAS_ACCION, CMDS_PORCENTAJE };
  const NEEDS_META = new Set();
  const LENTOS = new Set();
  const COBRAN_SOLOS = new Set();
  const CMDS_AURA = new Set();
  const SOLO_CONSULTA = new Set();
  const MEDIA_CMDS = new Set();
  const COBRO_CENTRAL = {};
  for (const f of FAMILIAS) {
    const nombres = f.grupo ? [...(grupos[f.grupo] || [])] : f.nombres;
    for (const n of nombres) {
      if (f.meta) NEEDS_META.add(n);
      if (f.lento) LENTOS.add(n);
      if (f.cobraDentro) COBRAN_SOLOS.add(n);
      if (f.aura) CMDS_AURA.add(n);
      if (f.consulta) SOLO_CONSULTA.add(n);
      if (f.media) MEDIA_CMDS.add(n);
      const c = f.cobro && (typeof f.cobro === 'string' ? f.cobro : f.cobro[n]);
      if (c) COBRO_CENTRAL[n] = c;
    }
  }
  return { NEEDS_META, LENTOS, COBRAN_SOLOS, CMDS_AURA, SOLO_CONSULTA, MEDIA_CMDS, COBRO_CENTRAL };
}

module.exports = { FAMILIAS, construirListas };
