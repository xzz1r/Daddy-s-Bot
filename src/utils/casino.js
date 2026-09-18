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

const PHRASES = {
  tier1: {
    win: [
      '%M mensajes y ya te crees participativo. Eso lo hace cualquiera con el móvil en la mano.',
      'Cobrado. Pero %M mensajes es lo que escribe quien pasa por aquí, no quien está.',
      '%M mensajes. El aura te paga la miseria que corresponde a la miseria que aportas.',
      'Aura entregada. Ahora escribe el doble, que a este ritmo no te nota nadie.',
      '%M mensajes y el bono más pequeño que existe. Saca tus conclusiones.',
      'Cobrado, pero no te emociones: con %M mensajes no se sube a ningún sitio.',
      '%M mensajes es el suelo, no el techo. Y ahí llevas todo el mes, en el suelo.',
      'Te llevas lo mínimo porque has hecho lo mínimo. Así de simple funciona esto.',
      '%M mensajes. Con eso ni molestas ni apareces. Escribe más o quédate de adorno.',
      'Aura por %M mensajes. Los que mandan aquí llevan ese número antes de comer.',
    ],
    bigwin: [
      'El aura ha pagado de más por %M mensajes. Aprovecha, porque tu ritmo no lo merece.',
      'Bono alto para lo poco que has escrito. No te acostumbres a tener suerte.',
      '%M mensajes mal pagados a tu favor. La próxima vez gánatelo.',
      'Te ha salido bien con %M mensajes. Con el doble no dependerías de la suerte.',
      'El aura se ha equivocado a tu favor. Pasa poco y tú lo necesitabas.',
      'Pago generoso por %M mensajes. Si escribieras de verdad, esto sería lo normal.',
      'Bono por encima de lo que aportas. Que no se te suba, que sigues abajo.',
      'Suerte, no mérito. Con %M mensajes no se merece nada: se recibe.',
    ],
    jackpot: [
      'Bote con %M mensajes. Ni te lo mereces ni va a repetirse. Escribe más.',
      'El aura ha soltado el bote a alguien que apenas aparece. Qué desperdicio.',
      'Premio gordo por %M mensajes. Estadística pura, mérito tuyo ninguno.',
      'Bote en el tramo más bajo. Lo has ganado sin hacer nada, como casi todo.',
      'Te ha tocado el bote escribiendo lo mínimo. El grupo lo va a recordar.',
      'Bote con %M mensajes. Ahora demuestra que no fue solo suerte.',
    ],
  },
  tier2: {
    win: [
      '%M mensajes. Ya no eres relleno, pero tampoco eres nadie todavía.',
      'Cobrado. %M está bien para conformarse, y tú te conformas mucho.',
      '%M mensajes y el aura paga en consecuencia. Falta el doble para que importe.',
      'Vas por %M. Los de arriba ya lo habían pasado cuando tú empezabas.',
      '%M mensajes: suficiente para salir en la lista, insuficiente para mandar en ella.',
      'Aura entregada. Sigues a media distancia de ser alguien aquí.',
      '%M mensajes. Buen número si el listón fuera bajo. No lo es.',
      'Cobrado. Ahora el siguiente tramo, que es donde se separa la gente.',
    ],
    bigwin: [
      'El aura ha pagado de más por %M mensajes. No lo confundas con reconocimiento.',
      'Bono alto en el segundo tramo. Con el ritmo de arriba lo tendrías cada día.',
      '%M mensajes bien pagados. Que la suerte no te quite las ganas de subir.',
      'Pago generoso. %M mensajes no dan para tanto, pero hoy sí.',
      'Te ha ido bien. Ahora sube el ritmo antes de que se te note el bajón.',
      'Bono por encima de lo normal con %M. Disfrútalo y sigue escribiendo.',
    ],
    jackpot: [
      'Bote en el segundo tramo con %M mensajes. Suerte, y de la buena.',
      'Premio gordo. Ahora falta que el número acompañe al premio.',
      'Bote con %M. Que no sea lo único que te recuerde el grupo.',
      'El aura ha soltado el bote a media escalera. El resto lo subes tú.',
      'Bote por %M mensajes. Pocos lo ven, y tú sin currártelo del todo.',
      'Premio máximo del tramo. Tu número sigue siendo del montón.',
    ],
  },
  tier3: {
    win: [
      '%M mensajes. Ahora sí, pero el que se para aquí desaparece en una semana.',
      'Cobrado. %M mensajes y el grupo empieza a contar contigo. Empieza.',
      '%M mensajes. Ya no hay excusa: a partir de aquí o mandas o estorbas.',
      'Aura del tramo alto. Y aun así hay quien te pasa sin despeinarse.',
      '%M mensajes. Bien. Mañana vuelves a cero y esto no significa nada.',
      'Cobrado en el tramo máximo. Lo difícil no es llegar, es no bajar.',
      '%M mensajes y el mejor bono. Disfruta el día: el número no se guarda.',
      'Tramo alto cubierto. Ahora mírate el resto del mes y llora un poco.',
    ],
    bigwin: [
      'El aura ha pagado de más en el tramo alto. %M mensajes y encima suerte.',
      'Bono grande sobre %M mensajes. Hoy te ha salido todo. Mañana ya veremos.',
      'Pago por encima de lo normal. Con %M mensajes ya casi lo esperabas.',
      '%M mensajes bien pagados. Que no se te olvide que esto se reinicia.',
      'Bono alto en el mejor tramo. Sigue así y serás insoportable, pero primero.',
      'El aura ha sido generosa contigo. Devuélveselo escribiendo mañana igual.',
    ],
    jackpot: [
      'Bote con %M mensajes. Es lo máximo que da este bot. Que se te note.',
      'Premio gordo en el tramo alto. Pocos lo ven y menos lo repiten.',
      'Bote por %M mensajes. Hoy has ganado. Mañana el contador no se acuerda.',
      'El aura ha soltado el bote arriba del todo. Aprovecha el rato de ser alguien.',
      'Bote con %M. Suerte y constancia el mismo día: no te va a volver a pasar.',
      'Premio máximo. El único reto que te queda es repetirlo.',
    ],
  },
  redemption: [
    'REMONTADA DE AURA — Estaba en el sótano y la actividad hizo lo que ninguna excusa consiguió. Bono de comeback. Esto no lo calcula nadie.',
    'COMEBACK EN DIRECTO — Aura negativa, mensajes positivos. Aquí se premia la constancia antes que el cope, y el marcador acaba de cambiar de cara.',
    'REDENCIÓN INESPERADA — El grupo daba ese aura por perdida. La actividad tiene su propia economía y acaba de hablar. Bote confirmado.',
    'EL MARCADOR REESCRITO — Aura negativa, actividad real. Aquí no se juzga el historial, se juzga quién aparece. Resultado: bono de redención.',
    'BONO DE REDENCIÓN — Lo que meses de excusas no arreglaron, la actividad lo resolvió sola. El aura cambia de signo y el grupo lo vio.',
    'COMEBACK CONFIRMADO — Aura en negativo y un bono que reescribe la historia. La actividad paga lo que la suerte no quiso.',
    'REMONTADA — Desde el fondo del pozo hasta aquí. La actividad hace lo que ninguna tirada consiguió: cambiar el marcador.',
    'REDENCIÓN — Aura negativa, presencia real. El sistema premia al que aparece y hoy ha aparecido quien más lo necesitaba.',
    'EL SÓTANO TIENE SALIDA — Aura negativa y un bono de redención que demuestra que escribir vale más que tirar.',
    'BONO DE COMEBACK — Cuando todo el mundo te daba por muerto, la actividad te sacó del hoyo. El marcador lo confirma.',
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
    : `*RACHA DE ${r.dias} DIAS*\n\n` +
      pickFresh(RACHA_HITO, `${jid}|racha|hito`)
        .replace(/%N/g, userTag).replace(/%D/g, fmt(r.dias)) +
      (premio ? `\n\n*+${fmt(premio)} de aura* por llegar a los ${r.dias} días.` : '') +
      `\n\n_+${fmt(r.pago)} de aura al dia mientras no falles. Tope en ${RACHA.tope} dias._`;

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
  // colapsar junta dos formas de la misma persona de golpe— pueden quedar dos
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
