// Bonos de aura por actividad: premian a los miembros activos cada 200/500/1000
// mensajes del día de calendario (el contador vive en casinoStore.js y es
// independiente del de !count; se reinicia al corte de DIA, así que los hitos
// son una carrera nueva cada día). Tiene estructura de tragaperras (tramos, botes,
// premio variable) pero lo que se reparte es AURA, no fichas de casino.
// Uses variable ratio reinforcement (the most addictive slot mechanic) — the amount
// varies unpredictably within each tier so players never know what they'll get.
// Members with negative aura have an escalating jackpot chance to incentivize
// continued engagement even in the worst slumps.

const { incrementCasinoCount } = require('./casinoStore');
const { anotarMensaje } = require('./rachaStore');
const { getAura, addAura } = require('./auraStore');
const { BONOS, REDENCION, PRIMERA_DEL_DIA, HITOS, RACHA, rango } = require('./economia');
const { hitosCobrados, apuntarHito, flushCasino } = require('./casinoStore');
const { HITO: RACHA_HITO, ROTA: RACHA_ROTA } = require('../data/rachaPhrases');
const { pickFresh, fmt } = require('./helpers');
const { isBotEnabled, isAuraEnabled } = require('./state');


// ─── Phrases ──────────────────────────────────────────────────────────────────

// Los bonos premian a quien escribe, y por eso PROCLAMAN (GUIA, «A quién pega
// el bot»; lo confirmó el dueño). Antes se reían del que cobraba —«la miseria
// que corresponde a la miseria que aportas»— justo por hacer lo que el bot
// quiere que se haga.
const PHRASES = {
  tier1: {
    win: [
      '%M mensajes hoy. El grupo se mueve porque alguien lo empuja, y hoy has empujado tú.',
      'Cobrado por %M mensajes. Aquí se paga por aparecer y has aparecido, mi niña.',
      '%M mensajes en el día. Más de lo que escriben algunos en un mes.',
      'Bono por %M. Los fantasmas del grupo ni saben que esto existe.',
      '%M mensajes y el aura lo nota. Así se suma, cabrón.',
      '%M mensajes. Alguien tenía que escribirlos, y has sido tú.',
      'Cobras por %M mensajes. Quien calla no cobra, y hoy tú no has callado.',
      '%M mensajes. El marcador no regala nada, y esto te lo has ganado.',
      '%M mensajes hoy. Hay quien no escribe eso en un año y aún se queja del grupo.',
      'Aura por %M mensajes. Un escalón del día, y ya lo estás cobrando.',
    ],
    bigwin: [
      'Bono gordo por %M mensajes. La suerte también sabe premiar a quien escribe.',
      '%M mensajes y el aura se ha estirado. Hoy te toca de las buenas, muñequita.',
      'Pago por encima de lo normal. %M mensajes y la tirada a tu favor.',
      'El aura ha soltado más de la cuenta. Con %M mensajes encima de la mesa, bien soltada.',
      'Bono alto. %M mensajes y un golpe de suerte, que no viene mal.',
      '%M mensajes premiados con generosidad. El grupo puede mirar y aprender.',
      'Te ha salido bien por partida doble: has escrito y has cobrado de más, buena chica.',
      'Bono de los que se cuentan. %M mensajes bien pagados.',
    ],
    jackpot: [
      'Pleno. %M mensajes y el premio gordo. Hoy el aura es tuya.',
      'Premio máximo del tramo. Escribir %M mensajes tiene esto: a veces toca.',
      'Pleno con %M mensajes. La cifra más alta del tramo, y es tuya.',
      'El pleno del tramo, para ti. %M mensajes y la suerte en el mismo día, reina.',
      'Pleno. No se gana apareciendo una vez: se gana apareciendo %M.',
      'Premio gordo por %M mensajes. A quien escribe, a veces, el aura le devuelve el favor.',
    ],
  },
  tier2: {
    win: [
      '%M mensajes. Ya no estás en el grupo: lo estás llevando.',
      'Cobrado por %M. A este ritmo el grupo no se muere ni queriendo.',
      '%M mensajes hoy. Hay gente que no llega a eso en todo su tiempo aquí.',
      '%M mensajes y el aura pagando como tiene que pagar.',
      '%M mensajes. El resto del grupo que tome nota de cómo se suma.',
      'Bono por %M. Esto es lo que pasa cuando alguien no desaparece.',
      '%M mensajes y el marcador te lo reconoce. El grupo, también, aunque no lo diga.',
      'Cobras por %M. Sostener una conversación cansa y tú la sostienes igual.',
    ],
    bigwin: [
      'Bono alto por %M mensajes. Trabajo y suerte, en ese orden.',
      'El aura ha pagado de más. Con %M mensajes, hoy te lo mereces entero.',
      '%M mensajes y un pago que se nota. Así da gusto aparecer.',
      'Pago generoso por %M. Hay días en que el aura te devuelve lo que pones.',
      'Bono gordo. %M mensajes y una cifra que da envidia.',
      'Te ha salido redondo: %M mensajes y el pago por encima.',
    ],
    jackpot: [
      'Pleno en el segundo tramo. %M mensajes y premio gordo. Día de los buenos.',
      'Premio máximo por %M mensajes. Pocos llegan aquí, y menos cobran esto.',
      'Pleno. Has escrito %M mensajes y el aura se ha vaciado los bolsillos por ti.',
      'Pleno con %M. Si alguien pregunta para qué sirve escribir, que mire esto.',
      'Premio gordo del tramo. %M mensajes que le han salido carísimos al aura.',
      'Pleno por %M mensajes. Hoy el marcador habla de ti.',
    ],
  },
  tier3: {
    win: [
      '%M mensajes en un día. Esto ya no es participar: es sostener el grupo entero.',
      'Tramo alto. %M mensajes y el aura te paga lo que vale eso, que es mucho.',
      '%M mensajes. El grupo hoy ha tenido motor, y el motor lleva tu nombre, pequeña.',
      'Cobrado por %M. Hay quien lo intenta toda la semana y no llega.',
      '%M mensajes hoy. El marcador no tiene más tramos para ti.',
      'Hito máximo. %M mensajes y ni una excusa. Así se hace.',
      '%M mensajes. Mañana el contador vuelve a cero, pero lo de hoy ya está cobrado.',
      'Bono del tramo alto por %M. Quien diga que el grupo está muerto, que te pregunte cómo se hace.',
    ],
    bigwin: [
      'Bono gordo en el tramo alto. %M mensajes y encima suerte. Hoy lo tienes todo.',
      '%M mensajes y el aura pagando por encima. Lo tuyo hoy no tiene techo.',
      'Pago generoso por %M. Te lo has currado hasta el último mensaje.',
      'El aura se ha pasado de generosa. Con %M mensajes, tampoco tanto.',
      'Bono alto. %M mensajes y el marcador rendido a tus pies, princesa.',
      '%M mensajes premiados como toca. El resto del grupo, a mirar.',
    ],
    jackpot: [
      'Pleno en lo más alto. %M mensajes y el premio gordo. Es lo máximo que da el bot.',
      'Premio gordo por %M. Constancia y suerte el mismo día. Pocos lo ven.',
      'Pleno. %M mensajes y el aura a tus pies. Hoy no hay quien te tosa en el marcador.',
      'Premio máximo del tramo alto. %M mensajes y ni uno de relleno.',
      'Pleno con %M mensajes. Hoy mandas en el marcador y en el chat.',
      'El pleno más alto, por %M mensajes de los buenos. Así funciona esto.',
    ],
  },
  redemption: [
    'Bono de redención. Estabas en el sótano y esto es un pellizco, no la salida.',
    'Aura en negativo y mensajes de verdad. Tu marcador empieza a cambiar de cara, niña.',
    'Tu aura estaba en rojo y has seguido escribiendo. Bono de redención.',
    'Desde el fondo del pozo, un bono por mensajes. No es la puerta: es un empujón, y lo has cobrado.',
    'Redención. Un pago por estar en rojo y haber escrito. Las tiradas de antes no pintan aquí.',
    'Aura negativa y bono igual. Aquí se paga por aparecer, aunque vengas de abajo.',
    'Comeback a medias. Mientras otros miran el saldo, a ti te ha caído un bono. El rojo, si sigue, sigue.',
    'El sótano tiene salida y la has encontrado tú. Escribiendo, no tirando dados.',
    'Bono de redención. Estabas en rojo y has vuelto hablando.',
    'Remontada confirmada. El marcador te debía una y hoy te la paga.',
  ],
};

// ─── Reward rolling (variable ratio — core casino mechanic) ───────────────────

// Los importes viven en utils/economia.js, que es donde esta fijada la escala
// entera. Antes estaban aqui a pelo (1.000 a 50.000 por tramo) mientras una
// tirada de !aura movia 50-500 y un robo 5-150: el bono diario por escribir
// eclipsaba por completo a las dinamicas, asi que robar o apostar no compensaba.
// Ahora un tier 3 excelente equivale a unas cinco tiradas buenas de !aura.
function rollReward(tier, currentAura) {
  // Redemption check first: negative-aura users get an escalating jackpot chance.
  if (currentAura < 0) {
    const redeemChance = tier === 3 ? 0.15 : tier === 2 ? 0.08 : 0.04;
    if (Math.random() < redeemChance) {
      return { amount: rango(REDENCION[tier]), label: 'redemption' };
    }
  }

  const t = BONOS[tier];
  const r = Math.random();

  // Reparto de etiquetas por tramo: cuanto mas alto el tramo, mas probable es
  // que ademas toque un pago por encima de lo normal.
  let corte;
  if      (tier === 1) corte = [0.60, 0.85, 0.95];
  else if (tier === 2) corte = [0.50, 0.80, 0.95];
  else                 corte = [0.40, 0.70, 0.90];

  if (r < corte[0]) return { amount: rango(t.win),     label: 'win' };
  if (r < corte[1]) return { amount: rango(t.bigwin),  label: 'bigwin' };
  if (r < corte[2]) return { amount: rango(t.jackpot), label: 'jackpot' };
  return { amount: rango(t.mega), label: 'jackpot' };
}

// ─── Next milestone display (near-miss — keeps players counting) ──────────────

// LOS HITOS SON TRES UMBRALES DEL DIA, no un resto.
//
// Estaban puestos con modulo —`count % 200 === 0`— y eso no es un hito diario,
// es un peaje cada 200 mensajes: a los 200, 400, 600, 800 y 1.200 saltaba el
// mismo aviso, siempre con la cabecera "200 MENSAJES" (que no miraba el
// contador, escribia el tamaño del tramo), y a partir del primero pagaban 8-14.
// Cinco avisos identicos al dia por calderilla: parecia un bucle porque en la
// practica lo era.
//
// El contador ya es de 24 h. Con umbrales, cada uno se cruza UNA vez por
// ventana y se acabo: 200, 500 y 1.000.
// El proximo umbral que le queda por cobrar hoy. `cobrados` es la lista que
// guarda casinoStore; sin ella se supone que no ha cobrado ninguno.
//
// Devuelve null cuando ya estan los tres: antes esto era imposible —siempre
// habia un "proximo" porque el modulo no se acaba nunca— y el mensaje prometia
// un bono mas que ya no existe.
function nextMilestone(count, cobrados = []) {
  const pend = HITOS.filter((h) => !cobrados.includes(h.n) && h.n > count);
  if (!pend.length) return null;
  const h = pend[0];
  return { tier: h.tier, hito: h.n, remaining: h.n - count };
}

// ─── La racha de dias seguidos ───────────────────────────────────────────────
//
// Paga siempre; habla casi nunca. El aviso sale como mucho una vez por hito
// (7, 15, 30, 50, 100, 200, 365 dias) y cuando alguien vuelve tras cargarse una
// racha de una semana o mas.
//
// Los gates son los mismos que los del bono: con el bot apagado o la dinamica
// de aura en pausa se sigue cobrando y no se dice nada.
async function avisarRacha(sock, jid, sender) {
  const r = await anotarMensaje(jid, sender);
  if (!r.evento) return;

  // El goteo diario, y ADEMAS el premio gordo si hoy toca hito. El premio es de
  // una sola vez: r.hito solo trae numero el dia exacto en que se alcanza.
  const premio = (r.hito && RACHA.premioHito[r.hito]) || 0;
  await addAura(jid, sender, r.pago + premio);
  if (!isBotEnabled(jid) || !isAuraEnabled(jid)) return;
  if (r.evento === 'sube' && !r.hito) return;

  const userTag = `@${sender.split('@')[0]}`;
  const texto = r.evento === 'rompe'
    ? pickFresh(RACHA_ROTA, `${jid}|racha|rota`)
        .replace(/%N/g, userTag).replace(/%P/g, fmt(r.perdidos))
    : `*RACHA DE ${r.dias} DÍAS*\n\n` +
      pickFresh(RACHA_HITO, `${jid}|racha|hito`)
        .replace(/%N/g, userTag).replace(/%D/g, fmt(r.dias)) +
      (premio ? `\n\n*+${fmt(premio)} de aura* por llegar a los ${r.dias} días.` : '') +
      `\n\n_+${fmt(r.pago)} de aura al día mientras no falles. Tope en ${RACHA.tope} días._`;

  await sock.sendMessage(jid, { text: texto, mentions: [sender] });
}

// ─── Main hook (called on every group message, non-blocking) ──────────────────

async function checkCasinoMilestone(sock, jid, sender) {
  const count = await incrementCasinoCount(jid, sender);

  // Aqui vivio un SUELDO que pagaba cada 10 mensajes en silencio. Se quito por
  // decision del owner: multiplicaba por cinco y medio el ingreso de un miembro
  // normal y volvia calderilla unos precios que se acababan de subir aposta.
  // Lo que premia escribir ahora es el bono de veterania de !aura, que sube la
  // suerte de tus tiradas con cada mil mensajes y no reparte nada de fondo.

  // La racha va aparte y no depende de los hitos: mide DIAS SEGUIDOS, no
  // volumen. Se cobra en silencio todos los dias y solo habla en dos momentos
  // (un hito redondo y volver despues de romper una racha larga), que es lo que
  // la distingue del sueldo — aquel pagaba callado y no daba nada que contar.
  await avisarRacha(sock, jid, sender).catch(() => {});

  // EL UMBRAL MAS BAJO QUE YA SE HA CRUZADO Y AUN NO SE HA COBRADO HOY.
  //
  // El mas bajo y no el mas alto a proposito: si el contador da un salto —
  // al juntar dos formas de la misma persona de golpe— pueden quedar dos
  // umbrales cruzados a la vez. Cobrando el mas bajo primero no se pierde
  // ninguno; el siguiente mensaje cobra el otro. Quedarse con el mas alto
  // regalaria el de abajo, y saltar los dos de una vez soltaria dos avisos
  // seguidos en el grupo.
  const cobrados = await hitosCobrados(jid, sender);
  const toca = HITOS.find((h) => count >= h.n && !cobrados.includes(h.n));
  if (!toca) return;

  // Y se apunta ANTES de pagar. apuntarHito devuelve false si otro mensaje se
  // adelanto: los mensajes se procesan en paralelo y dos que crucen el umbral a
  // la vez cobrarian los dos el bono. Esta es la unica linea que lo impide.
  if (!(await apuntarHito(jid, sender, toca.n))) return;

  // LA MARCA VA AL DISCO ANTES QUE EL DINERO, y esto no es un lujo.
  //
  // La marca vive en casino.json y el pago en aura.json, y cada fichero tiene su
  // propia ventana de guardado: 15 s el primero, 8 s el segundo. O sea que entre
  // los 8 y los 15 segundos el disco dice «ya cobro el bono» y a la vez «no ha
  // cobrado ningun hito». Reproducido leyendo los dos ficheros a los 4, 10 y 16
  // segundos de un hito: a los 10 el aura estaba puesta y la marca no.
  //
  // Un reinicio en esa ventana —y el guardian reinicia por tope de RAM, que es
  // justo un corte sin aviso— vuelve a pagar el hito entero al arrancar. Aura
  // creada de la nada y sin una linea en el log.
  //
  // Con el volcado aqui, el unico desenlace malo posible es el contrario: la
  // marca puesta y el pago perdido, o sea alguien que se queda SIN su bono. Eso
  // se ve y se puede arreglar; el dinero inventado no se ve.
  //
  // Cuesta una escritura de 0,44 ms y ocurre como mucho cinco veces al dia por
  // persona.
  await flushCasino().catch(() => {});

  const tier = toca.tier;
  const currentAura = await getAura(jid, sender);
  const { amount: base, label } = rollReward(tier, currentAura);

  // EL PRIMER HITO DEL DIA PAGA UN EXTRA PLANO, y solo el primero.
  //
  // Es el de 200, que ahora se cruza UNA vez al dia por persona: el que escribe
  // 200 lo cobra igual que el que escribe 1.200. Por eso no compounda con el
  // volumen, que es lo que hacia imposible subir el importe del tramo sin
  // inflar a los que mas escriben.
  const extraPrimera = toca.n === 200 ? PRIMERA_DEL_DIA : 0;
  const amount = base + extraPrimera;
  const { current } = await addAura(jid, sender, amount);

  const phrasePool = label === 'redemption'
    ? PHRASES.redemption
    : PHRASES[`tier${tier}`][label];
  // %M ES EL HITO QUE SE ACABA DE CRUZAR, y va aqui por lo mismo que la
  // cabecera: escrito a mano se separa del hito y miente.
  //
  // PASO DE VERDAD Y SALIO EN EL GRUPO. Tier 1 tiene TRES hitos —50, 100 y
  // 200— y diecisiete de sus veinticuatro frases llevaban "200 mensajes"
  // escrito dentro. Asi que al cruzar los 100 el mensaje decia a la vez
  // "TIER 1 · 100 MENSAJES" en la cabecera y "200 mensajes" en el cuerpo, y
  // debajo "faltan 100 para el siguiente". Tres cifras que no cuadraban entre
  // si en cinco lineas, y dos de cada tres bonos de tier 1 salian asi.
  //
  // La cabecera ya se habia arreglado antes por este mismo motivo. Las frases
  // se quedaron con el numero viejo dentro, que es justo el error que este
  // fichero ya habia cometido una vez.
  const phrase = pickFresh(phrasePool, `${jid}|casino|${label}|${tier}`)
    .replace(/%M/g, fmt(toca.n));

  // ─── ¿Se anuncia, o se cobra y punto? ──────────────────────────────────────
  //
  // El aura SE PAGA SIEMPRE. Lo que se puede callar es el aviso, y hay dos
  // motivos para callarlo. Los dos eran agujeros:
  //
  //  · CON EL BOT APAGADO (*!off*). Esta función se llama desde el pipeline de
  //    mensajes ANTES del gate de isBotEnabled, así que el grupo seguía
  //    recibiendo avisos de bono de un bot supuestamente apagado. Apagar el bot
  //    significa que no habla, sin excepciones.
  //  · CON LA DINÁMICA DE AURA APAGADA (*!aura off*). El interruptor se pidió
  //    porque el juego se hacía pesado, y estos avisos son de lo más ruidoso
  //    que tiene: uno por persona y por hito, en un grupo activo son decenas al
  //    día. Apagar la dinámica y seguir recibiéndolos deja el interruptor a
  //    medias, que es peor que no tenerlo.
  //
  // Cobrar sin avisar es exactamente el contrato que ya tiene el interruptor
  // ("apaga el juego, no la moneda") y el mismo que usa el sueldo, que nunca
  // dice nada. El saldo se mira en *!aura*.
  if (!isBotEnabled(jid) || !isAuraEnabled(jid)) return;

  const userTag   = `@${sender.split('@')[0]}`;
  // Cabecera de aura, no de casino: el sistema tiene estructura de tramos y
  // botes, pero lo que se reparte es aura y el título lo deja claro.
  //
  // Sin emojis, como el resto del bot. Este fichero era el ÚNICO de todo src/
  // que sacaba emojis por WhatsApp (doce líneas), y cantaba: el bot escribe en
  // texto pelado en los otros ciento y pico sitios.
  // La cabecera dice EL UMBRAL QUE SE ACABA DE CRUZAR. Estaba escrita a mano
  // por tramo, asi que a los 600 mensajes seguia diciendo "200 MENSAJES" — el
  // mismo cartel cinco veces al dia, que es lo que hacia parecer que el bono se
  // repetia. Ahora sale del hito, y no puede volver a separarse de el.
  const tierHdr   = `*BONO DE AURA · TIER ${tier} · ${fmt(toca.n)} MENSAJES*`;
  const next      = nextMilestone(count, await hitosCobrados(jid, sender));
  // La etiqueta decia el TAMAÑO del tramo, no donde esta el proximo bono. Justo
  // despues de cobrar el de 200 salia "Proximo bono: Tier 1 (200 msgs)", que se
  // lee como que el siguiente vuelve a ser a los 200 — el que se acaba de dar.
  // Ahora dice el numero al que hay que llegar.
  // Y cuando ya no queda ninguno, se dice eso y no un hito inventado.
  const lineaProx = next
    ? `_Próximo bono: Tier ${next.tier} a los ${fmt(next.hito)} — faltan ${fmt(next.remaining)} mensajes_`
    : '_Ya has cobrado los tres bonos de hoy. Vuelven al reiniciarse el contador._';

  // La cifra salia TRES veces en cinco lineas: en la cabecera, en el "lleva X
  // mensajes hoy" y otra vez dentro de la frase. Con la cabecera basta.
  const text =
    `${tierHdr}\n\n` +
    `${userTag}\n\n` +
    `${phrase}\n\n` +
    `${userTag}  +${fmt(amount)} de aura → *${fmt(current)}*\n\n` +
    lineaProx;

  // Solo se menciona a quien cobra el bono, y únicamente para que su nombre se
  // renderice en el mensaje. Antes esto hacía un tagall invisible que notificaba
  // al grupo entero en cada hito: en un grupo activo eso es un bombardeo
  // constante de notificaciones y resulta pesado. El resto no recibe nada.
  await sock.sendMessage(jid, { text, mentions: [sender] });
}

module.exports = { checkCasinoMilestone, nextMilestone, HITOS };
