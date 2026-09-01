'use strict';

const { getSender, getTarget, isMainOwner, bareJid, sameUser, fetchAbout } = require('../utils/wa');
const { pick, pickFresh, fmt } = require('../utils/helpers');
const { getUserCount } = require('../utils/messageCounter');
const { SOLO_GRUPOS } = require('../data/avisos');
const { aviso } = require('../utils/helpers');
const { SIN_SERVICIO } = require('../utils/auraCobro');
const {
  HEADERS, CLOSERS, COMBINED_INACTIVE, COMBINED_ACTIVE,
  NAME_ONLY, BIO_EMPTY, BIO_FULL, OWNER_ROAST,
} = require('../data/roastPhrases');



// ─── Formato ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// FRASES COMBINADAS — atacan nombre + bio + actividad a la vez
// COMBINED_INACTIVE: para usuarios con < 150 mensajes (mencionan inactividad)
// COMBINED_ACTIVE: para usuarios con >= 150 mensajes (sin insultar la actividad)
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// FRASES DE VARIABLE ÚNICA — ~200 frases, ~50 por variable
// ═══════════════════════════════════════════════════════════════════════════════

// ─── SOLO NOMBRE (%N) — 50 frases ─────────────────────────────────────────────
// ─── SOLO BIO VACÍA — 25 frases ────────────────────────────────────────────────
// ─── SOLO BIO CON CONTENIDO (%N) — 25 frases ──────────────────────────────────
// ─── SOLO ACTIVIDAD (%N + %MSG) — tiered, solo para inactivos ───────────────────

function getActivityPhrases(count) {
  const c = fmt(count);

  if (count === 0) {
    return [
      'CERO mensajes. Ni uno. Entras, espías, te pirás y no dejas una sola prueba de vida útil. No es timidez, %N, es ser un parásito digital de manual que consume lo que otros producen y no da nada.',
      'El contador marca cero, %N. Ni una sílaba, ni un emoji de mierda, ni una reacción. Llevas aquí el tiempo suficiente para que eso ya no sea discreción. Es directamente no existir, fantasma inútil.',
      'Cero mensajes, %N. Entras, ojeas, te largas. El mirón del grupo, el fantasma que lo lee todo y no aporta una puta mierda. Nadie te echaría de menos porque nadie sabe que estás, perdedor.',
      'Ni un solo mensaje, %N. Cero. El grupo no tiene una sola prueba de que existes. Un nombre en la lista y un espacio ocupado por alguien que aporta lo mismo que una silla vacía, basura.',
      'Cero textos, %N. El máximo nivel del gorrón: consumir todo y no dar nada. El tipo de mierda humana que está en cuarenta grupos sin aportar nada en ninguno porque da pereza hasta teclear.',
      'Sin un solo mensaje y ahí sigues pegado, %N. Eso ya no es timidez, es no tener una puta cosa útil que decir y no tener los cojones ni la decencia de largarte cuando sobras en todos los sentidos. Un fantasma pegado como una lapa.',
      'Cero mensajes confirmados, %N. Llevas aquí suficiente tiempo para haber soltado algo en algún momento. No lo hiciste. Eso no es introversión, es ser un puto inútil sin nada que ofrecer.',
      'El historial dice cero y el historial no miente, %N. Eres el tipo de miembro que hace que los grupos parezcan llenos sin aportar nada. Bulto de lista. Decoración inútil de primera, mierda.',
      'Ni una respuesta, ni una pregunta, ni un signo de vida, %N. Cero. Eso es lo que eres aquí: un cero a la izquierda con número de teléfono. La definición textual del que sobra en todo.',
      'Cero mensajes, %N. Conseguiste estar en un grupo de conversación sin conversar nunca. Eso requiere un nivel de inutilidad que da casi envidia, si no diera tanto asco antes de admiración.',
      'Sin un mensaje, %N. Presente en la lista, ausente en todo lo demás. La forma más inútil de pertenecer a algo aplicada con la convicción del puto fantasma que nunca va a cambiar nada.',
      'No existe un solo mensaje tuyo registrado, %N. En un grupo de comunicación eso solo dice una cosa: no tienes nada que comunicar y ni la decencia de reconocerlo e irte, basura digital.',
      'Cero textos, %N. El nivel de aporte de una silla vacía pero con el añadido de que la silla no consume notificaciones ni ocupa espacio en la lista. Superas a la silla en inútil y en presencia inútil.',
      'Cero mensajes y sin vergüenza, %N. El fantasma perfecto: presencia nula, impacto nulo, aportación nula. El trifecta del que sobra en todos los frentes posibles y ni ganas tiene de cambiar.',
      'Sin un solo texto tuyo, %N. Llevas aquí como el polvo en el mueble: presente, acumulándote, y solo visible cuando alguien pasa el dedo para hacer el ridículo examen de lo que no limpiaste.',
    ];
  }

  if (count < 20) {
    return [
      `${c} mensajes en TOTAL, %N. Todo lo que has aportado en tu existencia aquí cabe en una pantalla. Decoración barata de fantasma de medio pelo que ni siquiera termina de serlo del todo.`,
      `${c} textos miserables, %N. Con ese puto ritmo el grupo necesita un recordatorio de que sigues vivo. Y no por cariño, sino para decidir si vale la pena aguantar a un fantasma de mierda como tú en la lista o borrarte de una puta vez.`,
      `Con ${c} mensajes ocupas una plaza que alguien con algo que decir aprovecharía, %N. Eres el asiento vacío que respira. El inútil de catálogo que sobra y encima no se entera de que sobra.`,
      `${c} mensajes, %N. Esa cifra es el grito del que no le importa nada lo que pasa aquí. Mensaje recibido, fantasma de mierda. El grupo tomó nota y la nota dice: prescindible con datos confirmados.`,
      `${c} textos en todo el historial, %N. Lo justo para confirmar que existes, insuficiente para que a un solo ser humano le importe si desapareces mañana sin decir nada, puto fantasma inútil.`,
      `${c} mensajes, %N. El tipo de cifra que le dice al grupo todo sobre cuánto te importa estar aquí: nada, cero, una mierda. Y eso se nota desde el primer registro hasta el último, basura.`,
      `Con ${c} mensajes tienes el historial de un pringado que entró por error, se quedó por inercia y nunca encontró un puto motivo para aportar una mierda, %N. Y el grupo tampoco encontró motivo para pedírtelo. Sobras y lo sabe todo el mundo.`,
      `${c} textos, %N. Lo que dejas tras de ti cuando te vas es exactamente lo mismo que dejas cuando estás: nada perceptible, nada que cambie nada. El fantasma más inútil del grupo documentado.`,
      `${c} mensajes, %N. El número del que no considera que este grupo merezca su tiempo pero tampoco tiene nada mejor que hacer. El don nadie sin opciones que ocupa espacio por puro descarte.`,
      `Con ${c} mensajes eres estadísticamente el miembro más inútil del grupo, %N. No el más silencioso, que eso tiene estética. El más inútil, que es la categoría de mierda sin ninguna estética.`,
    ];
  }

  if (count < 60) {
    return [
      `${c} mensajes, %N. El que lo lee TODO y no aporta NADA. El espectador mudo que consume el trabajo de los demás y se esconde cuando toca poner algo sobre la mesa. Parásito de manual, mierda.`,
      `Con ${c} mensajes estás en la puta zona muerta del que está pero no cuenta, %N. No llegas ni a fantasma, pero tampoco eres parte de ninguna conversación que alguien recuerde. El gris más inútil y prescindible que existe. Sobras a medias.`,
      `${c} putos textos, %N. Justo por debajo del umbral donde alguien empieza a importar una mierda. Sigues siendo un número en la lista, no una persona con peso. El don nadie de manual que no pasa de ahí ni pasará nunca.`,
      `${c} mensajes y el grupo sigue sin saber qué coño pintas aquí, %N. No has dado ni datos suficientes para que alguien se moleste en opinar de ti. Un misterio de mierda que a nadie le apetece resolver porque a nadie le importas lo más mínimo.`,
      `${c} textos, %N: la cantidad exacta para no ser expulsado por inactivo y para que a nadie le importe si te vas. El equilibrio del fantasma que ni de fantasma termina de serlo. Patético de libro.`,
      `${c} mensajes, %N. Has estado aquí tiempo de sobra para haber dicho algo que valiera. No pasó. El marcador lo confirma y el grupo lo sabe aunque no pierda el tiempo en decírtelo, perdedor.`,
      `Con ${c} textos llevas el historial de alguien que consume sin producir, que lee sin responder y que existe como el humo: presente un momento y sin dejar nada cuando se disipa, %N. Basura.`,
      `${c} mensajes, %N. La actividad del que nunca aparece cuando hay que opinar, nunca está cuando hay que aportar. Invisible por elección y por inutilidad. Doble mérito en la dirección equivocada.`,
      `Con ${c} textos no eres fantasma pero tampoco eres nada, %N. El gris del que existe sin que a nadie le cambie algo que exista o no. El don nadie confirmado por sus propios números, mierda.`,
      `${c} mensajes, %N. Lo justo para sobrevivir en la lista, insuficiente para contar para algo. La definición perfecta del inútil que ocupa espacio sin justificarlo nunca con nada concreto.`,
      `${c} putos textos y el grupo aún no sabe ni qué voz tienes, %N. Apareces cada muerte de obispo, sueltas una mierda y te vuelves a tu agujero. El topo del grupo: ciego, callado y bajo tierra.`,
      `${c} mensajes, %N. Consumes memes, chismes y curro ajeno y devuelves cero. El gorrón perfecto: se sirve del plato de todos y no pone ni el pan. Parásito con datos móviles, nada más.`,
      `${c} mensajes en todo este tiempo, %N. Tu huella en el grupo es la de un pedo en el viento: alguien lo notó un segundo, hizo mala cara y siguió con su vida sin volver a pensar en ti jamás.`,
      `${c} textos, %N, y ninguno mereció respuesta. Hablas y el grupo hace lo mismo que haría con un mendigo pesado: mirar a otro lado y esperar a que se calle solo. Invisible por inútil, no por tímido.`,
    ];
  }

  // 150+ — ya no es un fantasma: aquí se ataca por hablar mucho y no decir nada.
  // Sin este tramo, alguien con miles de mensajes caía en las frases escritas
  // para 60-99 ("lo justo para no ser fantasma") y no cuadraba con su cifra.
  if (count >= 150) {
    return [
      `${c} mensajes, %N, y el grupo no recuerda ni uno. Escupes texto como una impresora rota escupe folios en blanco: mucho ruido, mucho gasto y cero utilidad.`,
      `${c} mensajes y ninguno mereció respuesta, %N. Hablas y el grupo hace lo que se hace con un pesado: mirar a otro lado y esperar a que se canse solo.`,
      `%N lleva ${c} mensajes de verborrea pura. Hablar tanto para no decir una puta cosa que valga la pena es un mérito de mierda, pero ahí lo tienes.`,
      `Con ${c} mensajes saturas el chat sin aportar nada, %N. Eres el pesado del grupo con estadísticas propias. Cantidad industrial, calidad de vertedero.`,
      `${c} mensajes, %N. Nadie escribe tanto para decir tan poco. Cada uno es otra prueba de que el volumen no compensa la falta absoluta de contenido.`,
      `%N, ${c} mensajes. El grupo te lee por obligación, no por interés. Llenas la pantalla de mierda y la gente hace scroll para llegar a lo que importa.`,
      `Con ${c} mensajes eres ruido con notificaciones, %N. Si hablaras la mitad y pensaras el doble el grupo lo agradecería. Pero pensar nunca fue lo tuyo.`,
      `${c} mensajes, %N, y sigues siendo el mismo don nadie que el primer día. Has confundido estar presente con ser importante. No es lo mismo, gilipollas.`,
      `%N con ${c} mensajes. Necesitas atención con la desesperación de quien no la recibe en ningún otro sitio. Se te huele desde el otro lado de la pantalla.`,
      `${c} mensajes, %N. El grupo se movería igual si escribieras la cuarta parte. La diferencia sería que habría menos basura que saltarse. Puto spam con patas.`,
      `Con ${c} mensajes, %N, eres el que siempre tiene algo que decir y nunca nada que aportar. Esa distancia la llevas recorriendo tú solo desde el día uno.`,
      `%N, ${c} mensajes para acabar siendo tan irrelevante como el que no escribe ninguno. Tanto esfuerzo tirado a la basura. Casi da pena, pero da más asco.`,
      `${c} mensajes y ni uno tuyo ha hecho reír, pensar o cabrear a nadie, %N. Escribir tanto sin provocar nada es un talento de mierda que dominas tú solo.`,
      `Con ${c} mensajes llenas el grupo de basura, %N. Todo el mundo lo piensa y nadie te lo dice por pereza. Yo no tengo ese problema: cállate un poco, pesado.`,
      `%N lleva ${c} mensajes y sigue sin decir nada memorable. Eso no es implicación, es incontinencia. Y el grupo la sufre a diario sin que te moderes nunca.`,
    ];
  }

  // 60-149
  return [
    `${c} mensajes y el grupo sigue sin recordar uno solo que valiera la pena, %N. Cantidad de tibio, calidad de mierda. Ni aportas ni te callas del todo. El combo más inútil del grupo.`,
    `${c} putos mensajes para no decir nada, %N. Escupes texto como una impresora rota escupe hojas en blanco: hace ruido, gasta y no sirve para una mierda. El fantasma que encima da la lata.`,
    `${c} mensajes, %N, y cada uno más olvidable y prescindible que el anterior. Llevas aquí lo justo para que el grupo confirme que sin ti se estaría igual de puta madre o mejor. Un cero a la izquierda con más pasos, mierda pura.`,
    `${c} textos, %N. La actividad de alguien que participa por no quedarse fuera, no porque tenga algo que aportar. Se te huele la desesperación de figurar desde el otro lado de la pantalla, patético.`,
    `${c} mensajes y ni uno tuyo ha hecho reír, pensar ni cabrear a nadie, %N. Hablar tanto para no provocar absolutamente nada es un talento de mierda que solo tú dominas. El don nadie con verborrea.`,
    `${c} mensajes, %N. Ni fantasma del todo ni persona del todo: el limbo del que rellena la conversación como el relleno barato rellena un colchón malo. Nadie lo nota hasta que le molesta.`,
    `${c} textos enviados sin dejar una sola marca real, %N. Ruido de fondo con forma de persona, número de teléfono y un historial de no haber hecho nada que cambie nada aquí jamás.`,
    `Con ${c} mensajes lograste hablar sin que nadie te cite, opinar sin convencer a nadie y existir sin que importe, %N. Esfuerzo de puto inútil invertido en producir la nada más perfecta.`,
    `${c} mensajes, %N. Lo justo para no ser fantasma del todo, lo poco para que nadie pueda nombrar una sola cosa tuya que haya cambiado algo aquí. El fracasado invisible con estadísticas.`,
    `${c} putos textos y toda tu aportación al grupo se resume en que "estuviste", %N. El legado de mierda del que escribe mucho sin soltar nada que valga un segundo de atención ni un puto milisegundo de memoria. Verborrea vacía de un don nadie.`,
    `${c} mensajes en el historial y cero impacto acumulado, %N. Presencia sin peso. Actividad sin consecuencias. La participación del que da igual si existe o no, basura de nivel doctorado.`,
    `Con ${c} textos llevas suficiente tiempo para haber dicho algo que alguien recordara, %N. No pasó. La oportunidad fue y volvió y se fue de nuevo sin que la aprovechara el puto inútil que eres.`,
    `${c} mensajes, %N. Sin perfil, sin personalidad, sin nada que diferencie lo tuyo de lo de otro don nadie igual de irrelevante. El fantasma que ni siquiera es el único de su tipo en el grupo.`,
    `Con ${c} mensajes ya no eres invisible del todo pero tampoco visible, %N. El gris del que existe sin que cambie algo que exista o no. El don nadie confirmado por estadística, perdedor.`,
    `${c} mensajes, %N. Suficiente para estar, insuficiente para contar. La definición perfecta del inútil que ocupa espacio sin justificarlo con nada en ningún momento. Mierda de aportación total.`,
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANTI-REPETICIÓN
// Tracks last 10 templates and last 4 categories per group so the same phrase
// and the same attack angle never appear back-to-back within a session.
// ═══════════════════════════════════════════════════════════════════════════════

const roastHistory = new Map(); // jid → { tpls: string[], cats: string[] }

function getHist(jid) {
  if (!roastHistory.has(jid)) {
    if (roastHistory.size >= 2000) roastHistory.delete(roastHistory.keys().next().value);
    roastHistory.set(jid, { tpls: [], cats: [] });
  }
  return roastHistory.get(jid);
}

function pushHist(jid, cat, tpl) {
  const h = getHist(jid);
  h.tpls.push(tpl); if (h.tpls.length > 10) h.tpls.shift();
  h.cats.push(cat); if (h.cats.length > 4)  h.cats.shift();
}

// Pick from pool avoiding recently used templates. Falls back to full pool if
// all templates are exhausted (only possible in very small pools).
function freshPick(pool, usedSet) {
  const avail = pool.filter(p => !usedSet.has(p));
  return pick(avail.length ? avail : pool);
}

// Pick a category avoiding the last 3 used. Falls back to full list.
function freshCat(options, recentCats) {
  const recent = new Set(recentCats.slice(-3));
  const avail = options.filter(o => !recent.has(o));
  return pick(avail.length ? avail : options);
}

// Roast del owner principal: en realidad son elogios envueltos en formato de
// roast, con un insulto suelto al final para que pase por genuino. Objetivo: que
// nadie sospeche que es el dueño (por eso NO se rechaza el roast: se responde con
// el mismo formato que a cualquiera, solo que el contenido lo alaba).
//
// Este pool es la ÚNICA excepción al orden por dureza: todas las frases dicen lo
// mismo con otras palabras (creído pero con razón), así que no hay una "más
// fuerte" que sacar primero. Ordenarlo por tacos solo pondría delante las que
// más suenan a insulto, que es justo el efecto contrario al que busca.
// ═══════════════════════════════════════════════════════════════════════════════
// COMANDO
// ═══════════════════════════════════════════════════════════════════════════════

async function cmdRoast(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }

  const sender = getSender(msg);
  const target = getTarget(msg);
  if (!target) {
    // Sin objetivo no hay roast. SIN_SERVICIO para que el cobro central no
    // deje 35 de aura cobrados por un silencio.
    return SIN_SERVICIO;
  }

  if (sameUser(target, sender)) {
    await sock.sendMessage(jid, {
      text: 'Roastearte a ti mismo es un nivel de autodestrucción que ni el bot va a facilitar.',
    }, { quoted: msg });
    return SIN_SERVICIO;
  }

  // Al owner principal se le "roastea" con el MISMO formato que a cualquiera para
  // no delatar que es el dueño, pero el contenido lo alaba (halago disfrazado de
  // roast, con un insulto suelto al final para que pase por auténtico).
  if (isMainOwner(target, false, groupMeta)) {
    const num = target.split('@')[0].split(':')[0];
    const text =
      `${pickFresh(HEADERS, `${jid}|roast|hdr`)}\n` +
      `╾━━━━━━━━━━━━━━╼\n\n` +
      `Víctima: @${num}\n\n` +
      `${pickFresh(OWNER_ROAST, `${jid}|roast|owner`).replace(/%N/g, `@${num}`)}\n\n` +
      `╾━━━━━━━━━━━━━━╼\n` +
      `${pickFresh(CLOSERS, `${jid}|roast|end`)}`;
    return sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
  }

  const participants = groupMeta?.participants || [];
  const participant = participants.find(p =>
    bareJid(p.id) === bareJid(target) ||
    bareJid(p.lid) === bareJid(target) ||
    bareJid(p.phoneNumber) === bareJid(target)
  );
  const targetNum = target.split('@')[0].split(':')[0];
  // Prefer any name field Baileys may have populated. If none exist (common in
  // LID groups where push names aren't bundled with groupMetadata), use the
  // @phonenumber mention notation so WhatsApp renders the real display name.
  const displayName =
    participant?.name ||
    participant?.displayName ||
    participant?.verifiedName ||
    participant?.notify ||
    `@${targetNum}`;

  const msgCount = await getUserCount(jid, target);
  // Menos de 100 mensajes = inactivo: entra de lleno en los insultos por
  // inactividad (fantasma, parásito, cero aporte).
  const isInactive = msgCount < 100;

  const { tpls, cats } = getHist(jid);
  const usedTpls = new Set(tpls);

  // Reparto sesgado hacia el contenido MÁS brutal e independiente de stats.
  // El nombre y las combinadas pegan igual de fuerte sin depender de números,
  // así que son el grueso: 58% combinada (los roasts más completos y salvajes)
  // y, en el single, el nombre pesa ~3x sobre la bio. La actividad queda como
  // toque puntual solo para inactivos.
  let roastText, cat, tpl;
  const useCombined = Math.random() < 0.65;

  if (useCombined) {
    cat = 'combined';
    const pool = isInactive ? COMBINED_INACTIVE : COMBINED_ACTIVE;
    tpl = freshPick(pool, usedTpls);
    roastText = tpl.replace(/%N/g, displayName);
  } else {
    // La repetición pondera el pick (pick es uniforme sobre el array). La
    // ACTIVIDAD manda: es lo que de verdad define a alguien en un grupo, y
    // antes casi no salía (solo para inactivos y con poco peso), así que sus
    // frases quedaban muertas. La bio baja a toque ocasional.
    const singleVars = [
      'activity', 'activity', 'activity', 'activity',
      'name', 'name', 'name',
      'bio',
    ];
    cat = freshCat(singleVars, cats);

    switch (cat) {
      case 'name':
        tpl = freshPick(NAME_ONLY, usedTpls);
        roastText = tpl.replace(/%N/g, displayName);
        break;
      case 'bio': {
        // La bio se pide AQUÍ, no arriba. Solo hace falta en esta rama (una de
        // cada ocho veces que no sale combinada), así que consultarla siempre
        // era una petición de red a WhatsApp tirada en ~96% de los !roast.
        const about = await fetchAbout(sock, target);
        const bio = about?.status?.trim() || '';
        const pool = bio ? BIO_FULL : BIO_EMPTY;
        tpl = freshPick(pool, usedTpls);
        roastText = bio ? tpl.replace(/%N/g, displayName) : tpl;
        break;
      }
      case 'activity': {
        const pool = getActivityPhrases(msgCount);
        tpl = freshPick(pool, usedTpls);
        roastText = tpl.replace(/%N/g, displayName).replace(/%MSG/g, fmt(msgCount));
        break;
      }
    }
  }

  pushHist(jid, cat, tpl);

  // Tres de las nueve lineas eran decoracion: dos barras separadoras y un
  // "Victima: @X" que la propia frase ya dice —el roast empieza mencionandole—.
  // En un movil eso es un tercio del mensaje gastado en no decir nada.
  //
  // Se queda UNA barra, que es la que separa el golpe del remate y ahi si hace
  // trabajo: marca donde termina la paliza y empieza la firma.
  const text =
    `${pickFresh(HEADERS, `${jid}|roast|hdr`)}\n\n` +
    `${roastText}\n` +
    `╾━━━━━━━━━━━━━━╼\n` +
    `${pickFresh(CLOSERS, `${jid}|roast|end`)}`;

  await sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
}

module.exports = { cmdRoast };
