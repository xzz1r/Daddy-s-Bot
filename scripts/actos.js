// ¿Cada frase de acción DICE lo que está pasando?
//
// EXISTE POR UNA QUEJA CONCRETA Y MEDIBLE. Esto salió en el grupo con *!spank*:
//
//   «%V se agarra a la sábana. %A le da tiempo a agarrarse bien.»
//   «%V baja el pecho sin que nadie se lo mande.»
//
// Son planos de REACCIÓN sin el ACTO. Leyendo eso nadie sabe que ha habido un
// azote: no hay contexto, no hay chiste y no hay una palabra explícita. Y el
// fallo no se ve escribiendo —cada frase por separado suena bien— porque el
// problema está en lo que FALTA, no en lo que hay.
//
// Medido la primera vez: 214 de 750 frases no nombraban su propio acto. El 29 %.
//
// Cada acción trae aquí las palabras que demuestran que la frase habla de ella.
// No es una lista de palabras bonitas: es la pregunta «si leo esta frase sin
// saber qué comando la sacó, ¿sé lo que ha pasado?».
//
//   npm run actos            solo el resumen
//   npm run actos -- --ver   y las frases mudas, para arreglarlas
'use strict';
require('dotenv').config();

const verde = (t) => `\x1b[32m${t}\x1b[0m`;
const rojo = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;

const RX = require('../src/data/accionPhrases');
const { ACCIONES } = require('../src/commands/acciones');

// Las marcas de cada acción. Deliberadamente AMPLIAS: lo que se busca es la
// frase que no habla de nada, no clavar el sinónimo exacto. Un falso negativo
// aquí es una frase mala que se cuela; un falso positivo es una tarde perdida
// reescribiendo algo que estaba bien, así que ante la duda se deja pasar.
const MARCAS = {
  hug:      /abraz|brazos|encima|apret|pecho|contra|lanza|pega|rodea|cuelga|costillas|peso|suelta/i,
  kiss:     /bes|boca|labio|piquito|lengua|lía|morre/i,
  cuddle:   /acurruc|arrima|encima|pegad|regazo|hueco|cuerpo|calor|abraz|manta|sofá|pecho|hombro|pierna|apoy|enred|suelta|mimo|cucharita|almohada|pega|tripa|cuello|brazo|sitio|despega|quiet|gira|ojos/i,
  pat:      /caric|cabeza|pelo|acarici|palmad|mano|palma|debajo|coronilla/i,
  punch:    /puñetazo|puño|golpe|mandíbula|estómago|guantazo|nariz|costillas|suelo|cruza la cara|parte|recto|gancho|crujido|sangr|diente|ceja|derriba|hostia|labio|boca|sien|piernas|mastic|pega/i,
  slap:     /cachet|bofet|guantazo|mano|cara|mejilla|sonó|marca|palma|revés|correctivo|látigo|escozor|cabeza|gira|ojos|golpe/i,
  bite:     /muerd|mordis|dientes|diente|colmillo|marca|hombro|cuello|oreja|brazo|clava|bocado|clavícula|muñeca|mandíbula|omóplato|piel|pulso|boca|sisea|suelta/i,
  kick:     /patad|pie|pata|bota|culo|suelo|patea|puntera|puntapié|tacón|empeine|riñón|cadera|bombo|encuadre|cae/i,
  bonk:     /bonk|martill|coscorr|cabeza|golpe|mazo|cráneo|sartén|chichón|casco|crujido|pum|porrazo|crac|correctivo|pega|castiga|coco|sien|coronilla|frente|empaste|oído|bulto|le da|da lo suyo|vista|fogonazo/i,
  tickle:   /cosquill|costad|riéndo|risa|dedos|retuerce|ríe|carcajad|aire|barriga|pies|escapa|rendi|para|costillas|brazo|punto|dobla|negoci|grita|suelo/i,
  nom:      /mordisqu|muerd|dientes|boca|oreja|cuello|prueba|hombro|labio|nuca|lengua|respira|ríe|se lo queda/i,
  peck:     /beso|piquito|labio|boca|mejilla|besa|nariz|frente|comisura|barbilla|roza|ojos|color|espera|valía|repite/i,
  handhold: /mano|dedos|entrelaz|palma|suelta|apretón|alrededor/i,
  stare:    /mira|vista|ojos|clav|fij|observa|estudia|explicar|dice ni una palabra/i,
  laugh:    /ríe|risa|carcajad|burla|reír|aire|chiste|reacción/i,
  yeet:     /lanz|tira|vuela|aire|suelo|manda|arroj|cae|metros|ventana|órbita|parábola|aterriz|empuj|levanta|peso|agarra|fuera|sale|impulso|arco|deshace|carga|suelta|bajar|de encima/i,
  kill:     /mata|acab|remata|liquida|carga|cae|muert|termina|por delante|turno|último|entierr|adiós|defend|dispar|tiro|cuchill|sangr|se lo lleva|fulmin|borra|en serio|hablarlo|dejó de hablar|pregunta|duró|quieto|cierra los ojos|de en medio|ganas|de pie/i,
  feed:     /come|boca|cuchar|bocado|da de comer|plato|dársela|trag|comida|aliment|mastic|comisura|relame|cuchara/i,
  sleep:    /duerm|dormi|frito|ronc|sueñ|almohad|babe|apoy|peso|hombro|cabeza|pierna|espalda|brazo|postura|codo|despertar|molestar/i,
  pout:     /morro|puchero|labio|carita|cara|cede|aguanta|mirar|discusión|jura|cayendo|no a cosas/i,
  bleh:     /lengua|burla|mueca|ríe|reírse|ignorar|chorrada|respuesta|visión/i,
  fuck:     /foll|polla|coño|culo|corre|dentro|chupa|lengua|dedos|moja|chorre|clítoris|tetas|monta|mete|entra|piernas|empapa|rodillas|encima/i,
  anal:     /culo|detrás|atrás|mete|entra|dentro|hondo/i,
  cum:      /corre|dentro|leche|acaba|vacía|traga|cara|tetas|encima|chorr/i,
  spank:    /azot|nalgad|cachet|culo|palmad|mano/i,
  seduce:   /oído|labio|muslo|boca|cuello|piernas|cintura|rodilla|provoc|guarrad|dedo|tirante|botón|mirad|acerc|pide|pega|caer/i,
  preg:     /dentro|corre|foll|polla|llene|saque|acab|preñ|semen/i,
  undress:  /ropa|camiset|pantal|sujetador|bragas|pelotas|cinturón|tela|prenda|calcetín|tirante|cremaller|botón|desnud|zapatos|falda|desabroch|quita/i,
  lickass:  /culo|lengua|lam|agujero|escupe|dedo|chup/i,
  grope:    /mano|toca|agarr|culo|muslo|tetas|cintura|pecho|sobar|meter/i,
};

const VER = process.argv.includes('--ver');

console.log('\n¿CADA FRASE DICE LO QUE PASA?\n');
let mudasTotal = 0;
let total = 0;
const sinMarca = [];
const filas = [];

for (const [nombre, a] of Object.entries(ACCIONES)) {
  const pool = a.pool || [];
  if (!pool.length) continue;
  const rx = MARCAS[nombre];
  if (!rx) { sinMarca.push(nombre); continue; }
  const mudas = pool.filter((f) => !rx.test(f));
  total += pool.length;
  mudasTotal += mudas.length;
  filas.push({ nombre, total: pool.length, mudas, pct: Math.round((mudas.length / pool.length) * 100) });
}

filas.sort((x, y) => y.pct - x.pct);
for (const f of filas) {
  const etq = `  !${f.nombre}`.padEnd(14);
  const cifra = `${f.mudas.length}/${f.total}`.padEnd(8);
  const color = f.pct === 0 ? verde : f.pct >= 25 ? rojo : gris;
  console.log(`${etq}${cifra}${color(`${f.pct}%`)}`);
  if (VER) for (const m of f.mudas) console.log(gris(`        · ${m}`));
}

if (sinMarca.length) {
  console.log(rojo(`\n  Sin marcas definidas: ${sinMarca.join(', ')}`));
  console.log(gris('  Una acción sin marcas no se comprueba: añádelas en MARCAS o no sirve de nada.'));
}

console.log('');
if (mudasTotal) {
  console.log(rojo(`  ${mudasTotal} de ${total} frases no nombran su acto (${Math.round((mudasTotal / total) * 100)} %).`));
  console.log(gris('  Con --ver salen una a una.'));
  process.exit(1);
}
console.log(verde(`  Las ${total} dicen lo que pasa.\n`));
