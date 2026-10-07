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
      '%M mensajes hoy y ya cobras. Aquí te pagan por lo que en casa te echan en cara.',
      'Cobrado por %M mensajes. Es lo más parecido a un sueldo que has visto este mes.',
      '%M mensajes. Los fantasmas del grupo ni saben que esto existe, y tú vives de ello.',
      'Bono por %M. Te pagan por no tener nada mejor que hacer, y te sale a cuenta.',
      '%M mensajes y el aura lo nota. Tu jefe también lo notaría, si te viera.',
      'Cobras por %M mensajes. Quien calla no cobra, y tú no sabes callarte.',
      '%M mensajes hoy. Hay quien no escribe eso en un mes porque tiene vida. Tú tienes bono.',
      '%M mensajes hoy, más de lo que escriben algunos en un año mientras se quejan del grupo.',
      'Aura por %M mensajes. Primer escalón del día, y ya se te ve el vicio.',
      '%M mensajes y el bono a tu nombre. Cobrar por cotillear, tu único talento rentable.',
    ],
    bigwin: [
      'Bono gordo por %M mensajes. La suerte también premia a quien no suelta el móvil, mi niña.',
      'Con %M mensajes, el bono se ha estirado. Tu batería no ha tenido tanta suerte.',
      'Pago por encima de lo normal. %M mensajes y una tirada a tu favor, para variar.',
      'El aura ha soltado más de la cuenta. Ni el bot entiende de dónde sacas tanto tiempo libre.',
      'Bono alto. %M mensajes y un golpe de suerte que, en tu caso, se parece mucho a la caridad.',
      '%M mensajes premiados de más. Ya hay quien te mira el saldo pensando en robártelo.',
      'Te ha salido por partida doble: has escrito de más y has cobrado de más, buena chica.',
      'Bono de los que se cuentan. %M mensajes bien pagados y ni uno que valiera la pena leer.',
    ],
    jackpot: [
      'Pleno con %M mensajes. Premio gordo, y ninguno de tus mensajes lo merecía.',
      'Premio máximo del tramo. Escribir %M mensajes tiene esto: a veces toca, aunque escribas mierda.',
      'Pleno con %M. Ya puedes presumir, que es lo que ibas a hacer igual.',
      'El pleno del tramo, para ti. %M mensajes y la suerte el mismo día. No te acostumbres, reina.',
      'Pleno. No se gana apareciendo una vez: se gana apareciendo %M, que es no tener nada que hacer.',
      'Premio gordo por %M mensajes. El aura te ha pagado más que cualquiera que te haya leído.',
    ],
  },
  tier2: {
    win: [
      '%M mensajes. Ya no estás en el grupo: vives en él, y pagas el alquiler en horas de sueño.',
      'Cobrado por %M. A este ritmo el grupo no se muere ni queriendo, y tú no sales de casa ni queriendo.',
      '%M mensajes hoy, más de lo que han escrito algunos en todo su tiempo aquí. Ellos tienen excusa: vida.',
      '%M mensajes. Tu pulgar pide la baja y el aura te paga igual.',
      'Bono por %M. Esto pasa cuando alguien no desaparece nunca, ni para comer.',
      '%M mensajes y el marcador te lo reconoce. Es lo único que te reconoce algo.',
      'Cobras por %M. Sostener una conversación cansa, y tú la sostienes porque no tienes otra.',
      '%M mensajes. Si los hubieras mandado a tu familia, ahora te hablarían.',
    ],
    bigwin: [
      'Bono alto por %M mensajes. Vicio y suerte, en ese orden.',
      'El aura ha pagado de más. Con %M mensajes, te lo has ganado a pulso, y a pulgar.',
      '%M mensajes y un pago que se nota. Lástima que fuera de aquí valga cero.',
      'Pago generoso por %M. Hay días en que el aura te devuelve lo que le quitas al sueño.',
      'Bono gordo. %M mensajes y una cifra que da envidia a gente con menos vicio que tú.',
      'Te ha salido redondo: %M mensajes y el pago por encima. Ahora suelta el móvil. No lo vas a soltar.',
    ],
    jackpot: [
      'Pleno en el segundo tramo: %M mensajes y premio gordo. Lo próximo es que el grupo te cobre alquiler.',
      'Premio máximo por %M mensajes. Pocos llegan aquí, y ninguno ha visto la calle esta semana.',
      'Pleno. Has escrito %M mensajes y el bot se ha vaciado los bolsillos por ti. Tu cartera de verdad sigue igual de vacía.',
      'Pleno con %M. Si alguien pregunta para qué sirve escribir tanto, que mire esto y luego tus ojeras.',
      'Premio gordo del tramo. %M mensajes que le han salido caros al aura y carísimos a tu vida social.',
      'Pleno por %M mensajes. Hoy el marcador habla de ti, que es más de lo que hace la gente.',
    ],
  },
  tier3: {
    win: [
      '%M mensajes en un día. Esto ya no es actividad, es un diagnóstico.',
      'Tramo alto. %M mensajes y el aura te paga lo que vale eso, que fuera de aquí es nada.',
      '%M mensajes. El grupo hoy ha tenido motor, y el motor tiene tendinitis, pequeña.',
      'Cobrado por %M, una cifra a la que otros no llegan en toda la semana porque trabajan.',
      '%M mensajes hoy. El marcador no tiene más tramos para ti, y el psiquiatra tiene hueco el jueves.',
      'Hito máximo: %M mensajes. Si te pagaran en euros podrías dejar de hacer esto, y no lo dejarías.',
      '%M mensajes. Mañana el contador vuelve a cero, y tú vuelves a empezar a las siete.',
      'Bono del tramo alto por %M. Quien diga que el grupo está muerto no sabe lo poco que vives tú.',
    ],
    bigwin: [
      'Bono gordo en el tramo alto: %M mensajes y encima suerte. Solo te falta salir de casa.',
      'Pago por encima con %M mensajes. Tu tiempo de pantalla ya le da miedo hasta al bot.',
      'Pago generoso por %M. Te lo has currado hasta el último mensaje, y el último fue a las cuatro de la mañana.',
      'El aura se ha pasado de generosa. Con %M mensajes, tampoco tanto: es casi un sueldo por horas.',
      'Bono alto. %M mensajes y el marcador rendido a tus pies, princesa. El resto del mundo, no.',
      '%M mensajes premiados como toca. Ahora ve a beber agua, que llevas desde ayer.',
    ],
    jackpot: [
      'Pleno en lo más alto: %M mensajes y el premio gordo. Lo máximo que da el bot, y lo máximo que vas a tener.',
      'Premio gordo por %M. Constancia y suerte el mismo día, y la constancia, en tu caso, se llama adicción.',
      'Pleno con %M mensajes. Aquí no hay quien te tosa, y fuera no hay quien te vea.',
      'Premio máximo del tramo alto. %M mensajes y ni uno que hiciera falta.',
      'Pleno con %M mensajes. Hoy mandas en el marcador; en tu casa sigue mandando el cargador.',
      'El pleno más alto, por %M mensajes. El bot te paga lo que nadie te pagaría por esto.',
    ],
  },
  redemption: [
    'Bono de redención. Estabas en el sótano y esto es un pellizco, no la salida.',
    'Aura en negativo y mensajes de verdad. Tu marcador empieza a cambiar de cara, princesa. Tu cara, no.',
    'Tu aura estaba en rojo y has seguido escribiendo. Bono de redención, que es caridad con otro nombre.',
    'Desde el fondo del pozo, un bono por mensajes. No es la puerta: es una cuerda, y la rompes en la próxima tirada.',
    'Redención. Te pagan por estar en rojo y no callarte. La primera vez que tu pesadez renta.',
    'Aura negativa y bono igual. Aquí cobras aunque estés en la ruina, con tal de que des la tabarra.',
    'Remontada a medias: te ha caído un bono, y el rojo sigue ahí, mirándote.',
    'El sótano tiene salida, y la has encontrado escribiendo, porque tirando dados no había manera.',
    'Bono de redención. Estabas en rojo y has vuelto hablando. Ahora no lo apuestes, que te conocemos.',
    'Remontada. El marcador te debía una y te la paga, aunque tú le debes cuarenta.',
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
