// ¿Por qué no sale este tuit?
//
// EXISTE PORQUE SE ME ACABARON LAS SUPOSICIONES. *!x* funciona en mi máquina y
// no en la del dueño, y desde fuera las dos cosas se ven igual: «no he podido
// traerlo». Entre que alguien pega un enlace y el vídeo sale hay seis puertas
// —la API del .env, la ficha pública de X, la elección de calidad, la descarga,
// el tope de WhatsApp y el envío— y el grupo solo ve la última.
//
// Esto las recorre todas e imprime qué pasa en cada una, en la máquina donde de
// verdad corre el bot. No manda nada a ningún grupo y borra lo que baja.
//
//   npm run x -- https://x.com/quien/status/123
'use strict';
require('dotenv').config({ quiet: true });

const path = require('path');
const fs = require('fs-extra');

const verde = (t) => `\x1b[32m${t}\x1b[0m`;
const rojo = (t) => `\x1b[31m${t}\x1b[0m`;
const ambar = (t) => `\x1b[33m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
const B = '\x1b[1m';
const F = '\x1b[0m';

const url = process.argv.slice(2).find((a) => /^https?:\/\//.test(a));
if (!url) {
  console.log(`\nUso:  ${B}npm run x -- <enlace del tuit>${F}\n`);
  process.exit(1);
}

const paso = (n, t) => console.log(`\n${B}${n}. ${t}${F}`);
const ok = (t) => console.log(`   ${verde('✔')}  ${t}`);
const mal = (t) => console.log(`   ${rojo('✘')}  ${t}`);
const avi = (t) => console.log(`   ${ambar('!')}  ${t}`);
const nota = (t) => console.log(`      ${gris(t)}`);

(async () => {
  const redes = require(path.join(__dirname, '../src/utils/redes'));
  const MB = (n) => `${(n / 1048576).toFixed(2)} MB`;

  console.log(`\n${B}POR QUÉ NO SALE ESTE TUIT${F}`);
  console.log(gris(`   ${url}`));

  // 1 ─ ¿lo reconoce como X?
  paso(1, '¿ES UN ENLACE DE X?');
  const plataforma = redes.plataformaDe(url);
  if (plataforma === 'x') ok('sí, y el comando que le toca es *!x*');
  else {
    mal(`lo reconoce como ${plataforma || 'ninguna red conocida'}`);
    nota('si es de X y sale esto, la expresión de PLATAFORMAS no cubre esa forma de enlace');
    process.exit(1);
  }

  // 2 ─ ¿hay una API puesta?
  paso(2, '¿HAY UNA API DE X EN EL .env?');
  const api = redes._API_DE.x;
  if (api) {
    avi(`sí: ${api.replace(/\/\/[^/]*/, '//…')}`);
    nota('va ANTES que la ficha pública. Si ese servicio no entiende un tuit, quítala y prueba otra vez');
  } else {
    ok('no, y no hace falta: se va directo a la ficha pública de X');
    nota('X_API solo hace falta si la ficha no llega desde esta máquina');
  }

  // 3 ─ ¿contesta la ficha pública?
  paso(3, '¿CONTESTA LA FICHA PÚBLICA DE X?');
  let ficha = null;
  try {
    ficha = await redes._porX(url);
  } catch (e) {
    mal(`la ficha falló: ${e.message}`);
    nota('si dice 403, 429 o un tiempo agotado, X está frenando a la IP de esta máquina');
    nota('eso NO se arregla en el código: se arregla poniendo X_API en el .env');
  }

  if (ficha) {
    ok('sí');
    console.log(`      texto: ${ficha.texto ? JSON.stringify(ficha.texto.slice(0, 90)) : gris('(el tuit no lleva texto)')}`);
    if (!ficha.medios.length) {
      avi('la ficha llegó pero el tuit no trae ni fotos ni vídeo');
      nota('si tú ves media en el tuit, puede ser de una cuenta protegida o de +18');
    } else {
      ok(`${ficha.medios.length} medio(s):`);
      for (const m of ficha.medios) {
        console.log(`      · ${m.tipo}${m.animado ? ' (gif)' : ''}  ${MB(m.bytes)}  .${m.ext}`);
      }
    }
  }

  // 4 ─ el camino entero, como lo recorre el comando
  paso(4, 'EL CAMINO ENTERO, COMO LO HACE EL COMANDO');
  let traido = null;
  const t0 = Date.now();
  try {
    traido = await redes.traer(url, 'x');
    const lote = Array.isArray(traido.medios) ? traido.medios : [traido];
    ok(`${lote.length} medio(s) en ${Math.round((Date.now() - t0) / 1000)} s`);
    let pesado = false;
    for (const m of lote) {
      const existe = m.fichero && await fs.pathExists(m.fichero);
      const pesa = existe ? (await fs.stat(m.fichero)).size : 0;
      if (pesa > 16 * 1048576) pesado = true;
      console.log(`      · ${m.tipo}${m.animado ? ' (gif, se manda en bucle)' : ''}  ${MB(pesa)}  ${existe ? verde('bajado') : rojo('NO está en disco')}`);
    }
    if (pesado) avi('algo pasa de 16 MB: WhatsApp no lo acepta y el envío falla');
    if (traido.texto) console.log(`      pie: ${JSON.stringify(traido.texto.slice(0, 90))}`);
  } catch (e) {
    mal(`no lo trajo: ${e.message}`);
    const f = redes.ultimosFallos().x;
    if (f) nota(`último fallo apuntado: ${f.motivo}`);
  } finally {
    for (const m of (traido && Array.isArray(traido.medios) ? traido.medios : [traido])) {
      if (m && m.fichero) await fs.remove(m.fichero).catch(() => {});
    }
  }

  console.log(`\n${gris('   Lo que se bajó ya está borrado. No se ha mandado nada a ningún grupo.')}\n`);
  process.exit(0);
})().catch((e) => {
  console.log(`\n${rojo(`   reventó: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n   ') : e}`)}\n`);
  process.exit(1);
});
