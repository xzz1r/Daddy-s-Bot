const { isOwner, isMainOwner, isAdmin, getTargetOrSelf } = require('../utils/wa');
const { pickFresh } = require('../utils/helpers');
// Rig del owner principal: cuando el TARGET es el owner, el % se fuerza al
// RANGO que le favorece y luego la lógica de frase corre sobre ese valor.
// Es un rango y no un número fijo a propósito: un 0% (o un 100%) clavado en
// cada tirada canta que hay amaño y delata al dueño. Variando dentro de la
// franja el resultado sigue siendo siempre favorable, pero parece azar.
// La polaridad se define por comando (no basta con goodIsHigh: la "feminidad"
// es positiva pero para el owner debe salir baja, como el chiste recurrente).
const OWNER_LOW  = [3, 30];   // peyorativos: siempre bajo, tope 30 (tier low ≤30), nunca 0 pelado
// Cada cuanto se le aplica el amaño al dueño en fiel/infiel. El resto de veces
// se queda la tirada uniforme, que es el contrato de esos dos comandos.
const OWNER_AMANYO = 0.85;
const OWNER_HIGH = [88, 100]; // favorables: siempre alto (tier high ≥70), no siempre 100

// SOLO los que tiran uniforme. El resto pasa por rollPercent, que YA tiene
// las bandas del owner (62 % sosa, 20 % buena, 18 % fallo real). Reaplicar
// este mapa encima las machacaba: el 85 % caía en 3-30 / 88-100, justo las
// cifras redondas que el grupo detectó y por las que se escribieron las bandas
// sosas.
//
// `linda`, `fea` e `iq` NO estan aqui a proposito: son aleatorios puros.
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
//  Positivo miembro │   17 %    │   31 %       │   52 %
//  Positivo admin   │   19 %    │   31 %       │   50 %
//
// El owner NO usa estas tres franjas: 62 % banda sosa (45-75 / 25-55),
// 20 % extremo que le favorece, 18 % fallo real como cualquiera.
function rollPercent(goodIsHigh, targetIsAdmin, targetIsOwner) {
  const rand = Math.random();
  const hi = () => 70 + Math.floor(Math.random() * 31);
  const mid = () => 31 + Math.floor(Math.random() * 39);
  const lo = () => Math.floor(Math.random() * 31);

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
  // Y el sesgo del OWNER se rebajó de 92/90 a 80, por petición suya: cantaba
  // demasiado. Con 92 le salía la franja buena en nueve de cada diez tiradas y
  // eso se nota a ojo en un grupo que usa estos comandos a diario; con 80 sigue
  // saliendo favorecido de calle pero de vez en cuando le toca un resultado
  // normal, que es lo que hace creíble al resto.
  //
  // Peyorativos, franja alta:  admin 78 -> 86, miembro 88 -> 87  (hueco 10 -> 1)
  // Positivos,   franja alta:  admin 28 -> 19, miembro 15 -> 17  (hueco 13 -> 2)
  if (!goodIsHigh) {
    // Peyorativos: aqui el grupo saca ALTO (70-100) y quedar bien es sacar bajo.
    // Al owner le sale la banda sosa la mayoria de las veces, muy bajo de vez en
    // cuando, y —esto es lo que lo hace creible— un 18 % de las veces le sale
    // ALTO de verdad, igual que a cualquiera. Sin esa parte, no salir nunca mal
    // es en si mismo el patron que canta.
    if (targetIsOwner) {
      if (rand < 0.62) return suaveMalo();
      if (rand < 0.82) return lo();
      return hi();
    }
    if (targetIsAdmin) {
      if (rand < 0.86) return hi();
      if (rand < 0.95) return mid();
      return lo();
    }
    if (rand < 0.87) return hi();
    if (rand < 0.96) return mid();
    return lo();
  } else {
    // Positivos: el grupo saca BAJO. Misma idea al reves.
    if (targetIsOwner) {
      if (rand < 0.62) return suave();
      if (rand < 0.82) return hi();
      return lo();
    }
    if (targetIsAdmin) {
      if (rand < 0.19) return hi();
      if (rand < 0.50) return mid();
      return lo();
    }
    if (rand < 0.17) return hi();
    if (rand < 0.48) return mid();
    return lo();
  }
}

const LABELS = require('../data/percentLabels');
for (const k of ['linda', 'fea', 'fiel', 'infiel']) {
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

  const tier = percent >= 70 ? 'high' : percent <= 30 ? 'low' : 'mid';
  const nm = `@${target.split('@')[0]}`;
  // Algunos rasgos (perdedor/ganador) traen [nombre] embebido en la frase; el
  // resto no lo usa, así que el replace es un no-op para ellos.
  const verdict = String(pickFresh(cfg[tier], `${jid}|${key}|${tier}`) || '').replace(/\[nombre\]/g, nm);
  if (!verdict) return;
  const showExtreme = cfg.goodIsHigh && percent >= 70 && cfg.extreme?.length;

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
