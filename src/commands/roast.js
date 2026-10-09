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

// Los pools viven en src/data/roastPhrases.js. Aqui quedaban sus cabeceras
// —ocho lineas de separadores anunciando bloques de frases que ya no estan— de
// cuando el texto vivia en este fichero.

// %B: la bio de la víctima, citada. Una línea, sin espacios dobles y cortada
// en una palabra entera: una bio de tres párrafos rompe la frase, y la frase
// ya lleva las comillas («%B»). El golpe es sobre lo que esa persona escribió,
// no sobre una bio genérica que vale para cualquiera.
const TOPE_BIO = 60;
function citaBio(bio) {
  const t = String(bio || '').replace(/\s+/g, ' ').trim();
  if (t.length <= TOPE_BIO) return t;
  const corte = t.slice(0, TOPE_BIO);
  const espacio = corte.lastIndexOf(' ');
  return (espacio > 20 ? corte.slice(0, espacio) : corte).replace(/[\s.,;:!?¡¿-]+$/, '') + '…';
}

function getActivityPhrases(count) {
  const c = fmt(count);
  if (count === 0) {
    return [
      `Cero mensajes, %N. Ni un hola, ni un audio, ni una puta queja. El grupo no tiene ni una prueba de que respiras.`,
      `%N, cero mensajes. Todavía no has empezado y ya se te da mal.`,
      `Cero, %N. Lo normal es entrar y saludar, y tú entraste y te sentaste.`,
      `%N, contador a cero. Si te fueras ahora, se iría alguien de quien no queda ni una frase.`,
      `Cero mensajes, %N. Nadie en el grupo sabe cómo suenas.`,
      `%N, ni uno. El grupo lleva hablando todo este tiempo y tú mirando como quien mira el tráfico.`,
      `Cero, %N. Entrar te costó un toque, y escribir por lo visto cuesta más.`,
      `%N, cero mensajes. Parasitismo puro: todo lo que pasa aquí te lo llevas y no devuelves ni un emoji.`,
      `Cero, %N. Hasta quien se equivoca de grupo escribe «perdón», y tú ni eso.`,
      `%N, ni un mensaje. Tienes el grupo de adorno y el móvil de pisapapeles.`,
      `Cero mensajes, %N. Si hubiera un censo del grupo, te contarían por error.`,
      `%N, cero. Cualquiera que entre mañana ya habrá dicho más que tú en toda tu estancia.`,
      `%N, contador en cero. Llevan el hilo a audios de mierda y tu nombre no ha dejado ni una burbuja que pinchar.`,
      `Cero mensajes, %N. Estás aquí para ver y no para que te vean, y enhorabuena: no te ve nadie.`,
      `%N, el grupo escupe mierda en el chat y tú no has dejado ni una mancha en el hilo.`,
    ];
  }
  if (count < 20) {
    return [
      `${c} mensajes, %N. Todo lo que has dicho en este grupo cabe en el dorso de un ticket y sobra papel.`,
      `%N, ${c} mensajes. De vez en cuando asomas la cabeza, compruebas que el grupo sigue y te vuelves al agujero.`,
      `${c} mensajes, %N. Asomas, sueltas una frase corta y el puto chat te pasa por encima sin frenar.`,
      `%N, ${c} mensajes. Das señales de vida con la frecuencia justa para que nadie llame a la policía.`,
      `${c} mensajes, %N. Cada vez que escribes, el grupo tiene que mirar quién eres.`,
      `%N, ${c} mensajes. Que sabes escribir está demostrado; que tengas algo que decir, no.`,
      `${c} mensajes, %N. La cifra de quien entra al grupo como quien entra al baño: rápido, a lo suyo y sin hablar con nadie.`,
      `%N, ${c} mensajes. Ni fantasma del todo ni miembro del todo: visitante con carné.`,
      `${c} mensajes, %N. Si cada mensaje tuyo fuera un euro, no tendrías ni para el pan.`,
      `%N, ${c}. Los de arriba escriben eso antes del desayuno.`,
      `%N, ${c} mensajes. A este ritmo, para cuando digas algo interesante el grupo ya no existe.`,
      `${c} mensajes, %N. Abres la boca, nadie contesta y te vuelves al visto con la frase atascada en la garganta.`,
      `%N, ${c} mensajes. Presencia de figurante: sales en la escena y nadie recuerda tu cara.`,
      `%N, ${c} mensajes. Escribes como quien paga una multa: lo mínimo y de mala gana.`,
      `${c} mensajes, %N. Si te callas mañana, el grupo ni gira la puta cabeza.`,
    ];
  }
  if (count < 60) {
    return [
      `${c} mensajes, %N. Ya constas en la lista, y el grupo sigue la pelea sin abrir tu nombre ni una puta vez.`,
      `%N, ${c} mensajes. Apareces lo justo para que no te den de baja, y ni eso te sale del todo.`,
      `${c} mensajes, %N. Saben tu nombre. De tu voz, ni una muestra que alguien pueda imitar.`,
      `%N, ${c}. Hablas cuando se te pregunta y nadie te pregunta.`,
      `${c} mensajes, %N. Tu aportación al grupo es de las que se olvidan antes de terminar de leerlas.`,
      `%N, ${c} mensajes. Participas como quien firma el libro de visitas y se va.`,
      `${c} mensajes, %N. No te echan de menos. Te encuentran de vez en cuando, como quien encuentra una moneda en el sofá.`,
      `%N, ${c} mensajes. Das para una anécdota, y la anécdota es que casi nunca hablas.`,
      `${c} mensajes, %N. Si el grupo hiciera una lista de gente imprescindible, no estarías ni entre los suplentes.`,
      `%N, ${c} mensajes. Más que un fantasma y menos que un vecino: saludas en el ascensor y ya.`,
      `${c} mensajes, %N. El grupo no te odia, que eso requiere conocerte.`,
      `%N, ${c}. Cuando escribes, parece que pasabas por aquí de casualidad.`,
      `${c} mensajes, %N. Apareces, dices algo flojo y un audio de mierda te tapa la frase antes de que nadie la lea.`,
      `%N, ${c} mensajes. Todo lo tuyo cabe en el hueco de un audio, y ni así se para nadie a contestarte.`,
      `${c} mensajes, %N. Tu frase entra en la pelea y se queda flotando, sin un solo mensaje que la recoja.`,
    ];
  }
  // 150+ — quien escribe sostiene el grupo, y la guía dice que la actividad se
  // proclama (lo confirmó el dueño). Antes este tramo se reía de él «por hablar
  // mucho»: castigaba justo lo que el bot quiere. Ahora el golpe va con el ego
  // y con los demás, no con que escriba.
  if (count >= 150) {
    return [
      `${c} mensajes, %N. El chat te obedece y aún así miras alrededor, a ver si alguien se ha enterado de que mandas tú.`,
      `%N, ${c} mensajes. Tiras del chat y a los demás se les ve el esfuerzo: frase corta, y se les muere antes del punto.`,
      `${c} mensajes, %N. Si mañana no apareces, el chat se queda en coma. Eso da poder, y lo sabes, cabrón.`,
      `%N, ${c}. Tú escribes y los demás leen, así va la cadena alimenticia de este grupo.`,
      `${c} mensajes, %N. Para roastearte habría que buscar lo que no has dicho, y no queda mucho.`,
      `%N, ${c} mensajes. Metes la frase en la pelea y al resto se le queda la réplica en la garganta.`,
      `${c} mensajes, %N. Sale el número y a quien se ríe se le corta la risa al verlo.`,
      `%N, ${c} mensajes. Te has ganado el derecho a ser insoportable, y lo estás usando.`,
      `${c} mensajes, %N. El motor del grupo eres tú: mucho ruido, mucho gasto y ningún sitio al que ir.`,
      `%N, ${c}. Con ese número ya no se te roastea por callar: se te roastea por no saber callarte.`,
      `${c} mensajes, %N. Si hablaras menos, el grupo lo notaría; si hablaran menos los demás, no lo notaría nadie.`,
      `%N, ${c} mensajes. Eres una puta máquina de conversación, y como toda máquina, no tienes vida.`,
      `${c} mensajes, %N. Llevas tú el ritmo del grupo, y los demás, a aguantarlo.`,
      `%N, ${c} mensajes. Roastearte es fácil: con ese número, se ve desde aquí que no sales de casa.`,
      `${c} mensajes, %N. Ya puedes presumir, que te lo has ganado a pulso y a costa de dormir.`,
    ];
  }
  // 60-149
  return [
    `${c} mensajes, %N. Tu frase entra y la respuesta se la lleva la burbuja de debajo.`,
    `%N, ${c} mensajes. Te leen, asienten con la cabeza y siguen el hilo de siempre.`,
    `${c} mensajes, %N. Das conversación como quien da el cambio: lo justo y contado.`,
    `%N, ${c} mensajes. Das tu opinión, el grupo suelta un «ya» y sigue con el plan que ya tenía escrito.`,
    `${c} mensajes, %N. Hablas, y cuando alguien quiere repetir lo tuyo se le queda la boca a medias, sin el remate.`,
    `${c} mensajes, %N. Das la cara a ratos y el resto del tiempo te la guardas.`,
    `%N, ${c} mensajes. Cuando dicen quién mueve esto, señalan otra burbuja y la tuya sigue quieta.`,
    `${c} mensajes, %N. Lo tuyo son apariciones estelares, sin estrella.`,
    `%N, ${c} mensajes. Te ven escribir, esperan el golpe y sale una frase que no mueve la pelea ni un milímetro.`,
    `${c} mensajes, %N. Das para un «ah, sí, está», pero no para un «¿dónde está?».`,
    `%N, ${c}. Mandas el mensaje y te vas. La respuesta se queda fuera, sin nadie que la recoja.`,
    `${c} mensajes, %N. Tienen tu tono pillado y lo usan para adelantarte la frase, antes de que acabes de escribir.`,
    `%N, ${c} mensajes. Tu mensaje suena, el grupo lo oye y sigue a gritos en el audio de otra persona.`,
    `${c} mensajes, %N. Dejas la frase puesta y ya vas de salida, con el chat todavía abierto detrás.`,
    `%N, ${c} mensajes. Te has quedado a mitad de camino y te has sentado ahí.`,
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
// Nada se ordena por dureza desde hace tiempo (ver helpers.js), pero el criterio
// de ESCRITURA de este pool sigue valiendo: todas las frases dicen lo mismo con
// otras palabras (creído pero con razón), así que aquí medir por tacos solo
// premiaría a las que más suenan a insulto, que es el efecto contrario.
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
      `${pickFresh(HEADERS, `${jid}|roast|hdr`)}\n\n` +
      `${pickFresh(OWNER_ROAST, `${jid}|roast|owner`).replace(/%N/g, `@${num}`)}\n\n` +
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

  // Reparto sesgado hacia el contenido MÁS brutal e independiente de stats:
  // 65% combinada (los roasts más completos y salvajes) y, en el single, la
  // actividad manda sobre el nombre y la bio.
  //
  // Las combinadas describen la bio de la víctima («esa bio de perdedor»), así
  // que solo salen si hay una bio que leer. fetchAbout devuelve null cuando no
  // pudo mirarla (privacidad, tiempo, error): eso no es una bio vacía. Sin
  // bio leída, el roast va por el nombre o la actividad.
  let roastText, cat, tpl;
  let about;
  const leerBio = async () => {
    if (about === undefined) about = await fetchAbout(sock, target);
    return about;
  };
  let useCombined = Math.random() < 0.65;
  if (useCombined && !(await leerBio())?.status?.trim()) useCombined = false;

  if (useCombined) {
    cat = 'combined';
    const pool = isInactive ? COMBINED_INACTIVE : COMBINED_ACTIVE;
    tpl = freshPick(pool, usedTpls);
    roastText = tpl.replace(/%N/g, displayName).replace(/%B/g, citaBio(about.status));
  } else {
    // La repetición pondera el pick (pick es uniforme sobre el array). La
    // ACTIVIDAD manda: es lo que de verdad define a alguien en un grupo. La bio
    // queda como toque ocasional.
    const singleVars = [
      'activity', 'activity', 'activity', 'activity',
      'name', 'name', 'name',
      'bio',
    ];
    cat = freshCat(singleVars, cats);
    // BIO_EMPTY dice «lo dejaste en blanco»: solo vale con una bio leída que
    // venga vacía. Si no llegó texto, no se sabe si está oculta o vacía.
    if (cat === 'bio' && typeof (await leerBio())?.status !== 'string') {
      cat = freshCat(singleVars.filter((v) => v !== 'bio'), cats);
    }

    switch (cat) {
      case 'name':
        tpl = freshPick(NAME_ONLY, usedTpls);
        roastText = tpl.replace(/%N/g, displayName);
        break;
      case 'bio': {
        const bio = about?.status?.trim() || '';
        const pool = bio ? BIO_FULL : BIO_EMPTY;
        tpl = freshPick(pool, usedTpls);
        roastText = bio ? tpl.replace(/%N/g, displayName).replace(/%B/g, citaBio(bio)) : tpl;
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
    `\n` +
    `${pickFresh(CLOSERS, `${jid}|roast|end`)}`;

  await sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
}

module.exports = { cmdRoast, citaBio };
