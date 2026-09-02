const { isOwner, isMainOwner, isAdmin, getTargetOrSelf } = require('../utils/wa');
const { pickFresh } = require('../utils/helpers');
const { SIN_SERVICIO } = require('../utils/auraCobro');
// Rig del owner principal: cuando el TARGET es el owner, el % se fuerza al
// RANGO que le favorece y luego la lógica de frase corre sobre ese valor.
// Es un rango y no un número fijo a propósito: un 0% (o un 100%) clavado en
// cada tirada canta que hay amaño y delata al dueño. Variando dentro de la
// franja el resultado sigue siendo siempre favorable, pero parece azar.
// Este mapa ya solo lo usan !fiel e !infiel (ver OWNER_FORCE, mas abajo). El
// resto pasa por la curva de rollPercent, que tiene sus propias bandas para el
// dueño: aqui decia que a la "feminidad" le salia baja a proposito y eso dejo de
// ser verdad el dia que se quito del mapa — hoy es un comando positivo y al
// dueño le sale ALTA, media 69 sobre 200.000 tiradas.
const OWNER_LOW  = [3, 30];   // peyorativos: siempre bajo, tope 30 (tier low ≤30), nunca 0 pelado
// Cada cuanto se le aplica el amaño al dueño en fiel/infiel. El resto de veces
// se queda la tirada uniforme, que es el contrato de esos dos comandos.
const OWNER_AMANYO = 0.85;

// ─── EL REPARTO DEL OWNER, EN UN SOLO SITIO ──────────────────────────────────
//
// Estaba escrito dos veces con numeros a pelo (0.62 / 0.82 en cada rama) y las
// dos ramas tienen que moverse JUNTAS: si una se toca y la otra no, al owner le
// sale bien en los positivos y regular en los peyorativos, o al reves. Aqui son
// una constante y la simetria deja de depender de que alguien se acuerde.
//
//   soso  → banda sosa (45-75 en positivos, 25-55 en peyorativos). Cifras que
//           podrian ser de cualquiera. Es lo que hace que el amaño no cante.
//   bueno → la franja que le favorece.
//   resto → un resultado malo DE VERDAD. Tiene que existir: no salir nunca mal
//           es, en si mismo, el patron que delata.
//
// De 62/20/18 a 42/50/8 por decision del dueño: con el reparto anterior perdia
// tres de cada diez y eso no era lo que se pidio del amaño. Medido sobre
// 300.000 tiradas: !sexy pasa de media 57 a 69, y de salir ≥70 tres veces de
// cada diez a seis. Un miembro raso saca 38.
//
// Lo que NO se toca es la forma de los numeros: se sigue tirando de las mismas
// bandas anchas, asi que no vuelven los 97 y 99 repetidos que el grupo cazo.
const OWNER_SOSO  = 0.42;
const OWNER_BUENO = 0.50;
const OWNER_HIGH = [88, 100]; // favorables: siempre alto (tier high ≥70), no siempre 100

// SOLO los que tiran uniforme. El resto pasa por rollPercent, que YA tiene sus
// propias bandas para el owner (ver OWNER_SOSO/OWNER_BUENO). Reaplicar este
// mapa encima las machacaba: el 85 % caía en 3-30 / 88-100, justo las cifras
// redondas que el grupo detectó y por las que se escribieron las bandas sosas.
//
// Aqui ya solo quedan !fiel e !infiel, que son los unicos que siguen tirando
// uniforme. !linda y !fea pasaron a la curva (ver la lista de rollUniform).
const OWNER_FORCE = {
  fiel: OWNER_HIGH, infiel: OWNER_LOW,
};

// Tirada uniforme 0-100. !fiel e !infiel son totalmente aleatorios: no siguen
// las distribuciones por rol del resto de juegos, solo el amaño del owner.
const rollUniform = () => Math.floor(Math.random() * 101);

// Valor al azar dentro del rango [min, max], ambos incluidos.
function rollRange([min, max]) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Distribuciones por tier — basadas en el ROL DEL TARGET, no del sender:
//
//                    │ alto ≥70% │ medio 31-69% │ bajo ≤30%
//  ─────────────────┼───────────┼──────────────┼──────────
//  Negativo miembro │   87 %    │    9 %       │    4 %
//  Negativo admin   │   86 %    │    9 %       │    5 %
//  Positivo miembro │    6 %    │   18 %       │   76 %
//  Positivo admin   │    7 %    │   19 %       │   74 %
//
// LOS POSITIVOS PERDONABAN Y LOS PEYORATIVOS NO. Un miembro se comia el zasca
// el 87 % de las veces en !puta y solo el 52 % en !sexy: uno de cada seis salia
// con un piropo. Eso es lo que se noto en el grupo como "les sale bien todo" —
// a nadie le extraña que !rata le insulte, se da por hecho, pero un !sexy 84 %
// si se comenta. Ahora las dos polaridades pegan parecido.
//
// El owner NO usa estas tres franjas: tiene las suyas, y salen de
// OWNER_SOSO/OWNER_BUENO para que no haya cifras sueltas aqui que se queden
// viejas al primer ajuste. Hoy: 42 % banda sosa, 50 % la franja que le
// favorece, 8 % fallo real como cualquiera.
// LA TABLA DE ARRIBA, PERO EJECUTABLE.
//
// Estaba escrita dos veces: el comentario con los porcentajes y, mas abajo,
// cuatro parejas de numeros sueltos (0.87/0.96, 0.86/0.95…) que eran los que
// mandaban de verdad. Cuando el reparto de los positivos cambio de 17/31/52 a
// 6/18/76 se movieron los numeros y no el comentario, y `npm run progreso` —que
// tenia una TERCERA copia— siguio repartiendo el trabajo de contenido segun la
// tabla vieja durante semanas: mandaba escribir para el tramo equivocado.
//
// Ahora hay una sola copia, se exporta, y la lee todo el que la necesite.
const DISTRIBUCION = {
  // peyorativos (goodIsHigh:false): al grupo le sale ALTO, que es la paliza
  negativo: { miembro: { high: 0.87, mid: 0.09, low: 0.04 },
    admin: { high: 0.86, mid: 0.09, low: 0.05 } },
  // favorables (goodIsHigh:true): al grupo le sale BAJO, que es la paliza
  positivo: { miembro: { high: 0.06, mid: 0.18, low: 0.76 },
    admin: { high: 0.07, mid: 0.19, low: 0.74 } },
};

// Las fronteras de los tramos. 70 es high y 30 es low: cerradas, sin huecos.
const TRAMO_ALTO = 70;
const TRAMO_BAJO = 30;
const tramoDe = (p) => (p >= TRAMO_ALTO ? 'high' : p <= TRAMO_BAJO ? 'low' : 'mid');

function rollPercent(goodIsHigh, targetIsAdmin, targetIsOwner) {
  const rand = Math.random();
  const hi = () => TRAMO_ALTO + Math.floor(Math.random() * (101 - TRAMO_ALTO));
  const mid = () => TRAMO_BAJO + 1 + Math.floor(Math.random() * (TRAMO_ALTO - TRAMO_BAJO - 1));
  const lo = () => Math.floor(Math.random() * (TRAMO_BAJO + 1));
  // Reparte segun la fila que toque: primero el tramo mas probable de esa fila,
  // luego el medio, y lo que queda es el tercero.
  const reparte = (d, primero, segundo, tercero) => (rand < d[primero] ? 1
    : rand < d[primero] + d[segundo] ? 2 : 3);

  // ─── La banda del owner ────────────────────────────────────────────────────
  //
  // No comparte las tres franjas de arriba. Lo que delataba el amaño no era la
  // ventaja: era la FORMA de los numeros. Salir 97, 99 o 3 una y otra vez no se
  // parece a tener suerte, se parece a estar programado, y el grupo lo noto.
  //
  // Estas dos bandas son deliberadamente sosas — nada de redondos, nada de
  // extremos — y se solapan con lo que saca cualquiera. Sigue saliendo mejor
  // parado que el resto, pero con cifras que podrian ser de cualquier otro.
  const suave     = () => 45 + Math.floor(Math.random() * 31);   // 45-75
  const suaveMalo = () => 25 + Math.floor(Math.random() * 31);   // 25-55

  // La distancia entre admin y miembro se ha estrechado a propósito: era tan
  // grande que en el grupo se notaba y acusaban al bot de tratar a los admins
  // como intocables. Entre admin y miembro la diferencia pasa a ser un matiz.
  //
  // El reparto del owner ya no vive aqui: son OWNER_SOSO y OWNER_BUENO, arriba,
  // con su historia al lado. Estas dos ramas son solo para el resto del grupo.
  //
  // Y las dos polaridades pegan ya parecido. Estaban descompensadas: los
  // peyorativos machacaban al 87 % y los positivos solo al 52 %, asi que uno de
  // cada seis !sexy salia con un piropo. Un !rata insultando no llama la
  // atencion de nadie; un !sexy 84 % si.
  if (!goodIsHigh) {
    // Peyorativos: aqui el grupo saca ALTO (70-100) y quedar bien es sacar bajo.
    // Al owner le sale la banda sosa la mayoria de las veces, muy bajo de vez en
    // cuando, y —esto es lo que lo hace creible— el resto (1 - OWNER_SOSO -
    // OWNER_BUENO) le sale ALTO de verdad, igual que a cualquiera. Sin esa
    // parte, no salir nunca mal es en si mismo el patron que canta.
    if (targetIsOwner) {
      if (rand < OWNER_SOSO) return suaveMalo();
      if (rand < OWNER_SOSO + OWNER_BUENO) return lo();
      return hi();
    }
    const d = DISTRIBUCION.negativo[targetIsAdmin ? 'admin' : 'miembro'];
    const cual = reparte(d, 'high', 'mid', 'low');
    return cual === 1 ? hi() : cual === 2 ? mid() : lo();
  } else {
    // Positivos: el grupo saca BAJO. Misma idea al reves.
    if (targetIsOwner) {
      if (rand < OWNER_SOSO) return suave();
      if (rand < OWNER_SOSO + OWNER_BUENO) return hi();
      return lo();
    }
    const d = DISTRIBUCION.positivo[targetIsAdmin ? 'admin' : 'miembro'];
    const cual = reparte(d, 'high', 'mid', 'low');
    return cual === 1 ? hi() : cual === 2 ? mid() : lo();
  }
}

const LABELS = require('../data/percentLabels');
// Los que tiran uniforme. Es una lista y no dos nombres sueltos porque la leen
// tambien `npm run check` y `npm run progreso`: si se queda escrita en tres
// sitios, el dia que cambie se queda vieja en dos.
const UNIFORMES = ['fiel', 'infiel'];
// LOS QUE TIRAN UNIFORME, Y NADA MAS.
//
// !linda y !fea salieron de aqui: repartian un piropo el 31 % de las veces
// —puro azar, sin curva— y eran de los mas usados, asi que buena parte del
// "a estos les sale bien todo" venia de estos dos. Ahora pasan por la curva
// como el resto.
//
// !fiel e !infiel se quedan: una medida de fidelidad amañada por rol no mide
// nada, y el amaño del dueño en esos dos vive aparte, en OWNER_FORCE.
//
// Esta lista es la que MANDA. El `uniforme: true` de percentLabels.js es la
// misma decision escrita al lado de las frases, y las dos tienen que decir lo
// mismo: quitar solo una deja el fichero de datos mintiendo sobre lo que hace
// el bot. Lo comprueba `npm run check`.
for (const k of UNIFORMES) {
  if (LABELS[k]) LABELS[k].roll = rollUniform;
}


async function runPercent(sock, msg, key, groupMeta) {
  const jid = msg.key.remoteJid;
  const cfg = LABELS[key];
  if (!cfg) return;

  const target = getTargetOrSelf(msg);
  // El % se basa en el ROL DEL TARGET, no del sender
  const targetIsOwner = isOwner(target, false, groupMeta);
  const targetIsAdmin = isAdmin(groupMeta?.participants, target);

  let percent = cfg.roll
    ? cfg.roll(targetIsOwner, targetIsAdmin)
    : rollPercent(cfg.goodIsHigh, targetIsAdmin, targetIsOwner);

  // Amaño SOLO de los que tiran uniforme (fiel/infiel). rollPercent ya aplica
  // las bandas del owner; re-tirar aqui con rollPercent(leFavoreceAlto) encima
  // las pisaba, y el 15 % de "fallo" no era uniforme: volvía a las bandas.
  if (isMainOwner(target, false, groupMeta) && key in OWNER_FORCE && cfg.roll) {
    if (Math.random() < OWNER_AMANYO) percent = rollRange(OWNER_FORCE[key]);
  }

  const tier = tramoDe(percent);
  const nm = `@${target.split('@')[0]}`;
  // Algunos rasgos (perdedor/ganador) traen [nombre] embebido en la frase; el
  // resto no lo usa, así que el replace es un no-op para ellos.
  const verdict = String(pickFresh(cfg[tier], `${jid}|${key}|${tier}`) || '').replace(/\[nombre\]/g, nm);
  if (!verdict) return SIN_SERVICIO;
  const showExtreme = cfg.goodIsHigh && percent >= TRAMO_ALTO && cfg.extreme?.length;

  const text =
    `*${nm} es ${percent}% ${cfg.name}*\n\n` +
    `${verdict}` +
    (showExtreme ? `\n\n${pickFresh(cfg.extreme, `${jid}|${key}|extreme`).replace(/\[nombre\]/g, nm)}` : '');

  await sock.sendMessage(jid, { text, mentions: [target] }, { quoted: msg });
}

const makeCmd = (key) => (sock, msg, groupMeta) => runPercent(sock, msg, key, groupMeta);

module.exports = {
  // Se exporta para que !rizz use EXACTAMENTE la misma distribucion que el resto
  // del bot. Tenia la suya propia, plana de 0 a 100, y por eso a los miembros les
  // salian porcentajes altisimos: en una uniforme, tres de cada diez tiradas
  // pasan de 70. El sesgo del bot no es un detalle estetico, es la regla.
  rollPercent,
  // La tabla y las fronteras se exportan para que nadie tenga una segunda copia:
  // las lee `npm run progreso` para repartir el trabajo de contenido y las lee
  // `npm run check` para comprobar que la guia no promete otra cosa.
  DISTRIBUCION, TRAMO_ALTO, TRAMO_BAJO, OWNER_SOSO, OWNER_BUENO, UNIFORMES,
  cmdIncel:         makeCmd('incel'),
  cmdLinda:         makeCmd('linda'),
  cmdFea:           makeCmd('fea'),
  cmdGay:           makeCmd('gay'),
  cmdSimp:          makeCmd('simp'),
  cmdHot:           makeCmd('sexy'),
  cmdRata:          makeCmd('rata'),
  cmdMaricon:       makeCmd('maricon'),
  cmdFriki:         makeCmd('friki'),
  cmdCrack:         makeCmd('crack'),
  cmdCerdo:         makeCmd('cerdo'),
  cmdFeminidad:     makeCmd('feminidad'),
  cmdMasculinidad:  makeCmd('masculinidad'),
  cmdInutil:        makeCmd('inutil'),
  cmdFemboy:        makeCmd('femboy'),
  cmdPerdedor:      makeCmd('perdedor'),
  cmdGanador:       makeCmd('ganador'),
  cmdPuta:          makeCmd('puta'),
  cmdGuarra:        makeCmd('guarra'),
  cmdFiel:          makeCmd('fiel'),
  cmdInfiel:        makeCmd('infiel'),
};
