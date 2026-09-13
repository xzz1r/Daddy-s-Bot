// ¿Responde la web a todas las categorías de acción que tiene configuradas el
// bot?
//
// EXISTE PORQUE UNA CATEGORÍA MAL ESCRITA NO SE VE. El comando queda montado,
// sale en el menú, alguien lo escribe, la web contesta 404 y el bot dice "no he
// podido traer el gif" y devuelve el aura. Desde fuera parece que la web va mal
// un día; en realidad ese comando no ha funcionado nunca y no va a funcionar.
//
// No entra en `npm run check` a propósito: sale a internet, y un validador que
// depende de que una web de fuera esté en pie es un validador que se pone rojo
// por motivos que no tienen nada que ver con el código.
//
//   npm run acciones
'use strict';
require('dotenv').config();
const axios = require('axios');
// LA FUENTE SE LE PREGUNTA AL BOT, no se vuelve a escribir aqui.
//
// Estaba copiada: `const API = 'https://nekos.best/api/v2/'`. El dia que una
// categoria dejo de venir de esa web —*!kill*, que viene de otra— este script
// habria seguido preguntandole a nekos.best por una categoria que no tiene, y
// habria dicho que el comando esta roto estando perfecto. Una comprobacion que
// mira un sitio distinto del que mira el bot no comprueba nada, que es
// exactamente lo que ya costo una tarde con yt-dlp.
const { ACCIONES, ACTIVAS, _fuenteDe: fuenteDe, _direccionDe: direccion } = require('../src/commands/acciones');

const API_NSFW = (process.env.ACCION_NSFW_API || '').trim();

// ─── MODO SONDEO: ¿COMO LLAMA ESTA WEB A ESO? ───────────────────────────────
//
//   npm run acciones -- --probar preg pregnant creampie
//   npm run acciones -- --probar            (prueba la lista de abajo)
//
// EXISTE POR UN CASO CONCRETO. Entraron seis acciones explicitas nuevas y cinco
// contestaron 403: `seduce`, `preg`, `undress`, `lickass` y `grope` no existen
// con ESE nombre en la fuente configurada. Lo que no se sabe es si el concepto
// no esta o si la web lo llama de otra manera, y eso no se puede adivinar desde
// fuera: la direccion vive en el .env del servidor.
//
// Adivinar nombres y dejarlos escritos es exactamente el fallo contra el que
// avisa este script. Asi que en vez de adivinar, se pregunta.
//
// Se va MAS DESPACIO que el repaso normal (un segundo entre intentos) a
// proposito: si un 403 fuera del limite de peticiones y no de la categoria, una
// rafaga lo haria pasar por «no existe» y se descartaria un nombre bueno.
const CANDIDATOS = {
  seduce:  ['seduce', 'seduction', 'seducing', 'tease', 'teasing', 'flirt', 'lewd', 'ero'],
  preg:    ['preg', 'pregnant', 'pregnancy', 'creampie', 'breed', 'breeding', 'nakadashi'],
  undress: ['undress', 'undressing', 'strip', 'stripping', 'striptease', 'nude', 'naked', 'changing'],
  lickass: ['lickass', 'rimming', 'rimjob', 'analingus', 'asslick', 'ass', 'kuni', 'pussylick', 'lick'],
  grope:   ['grope', 'groping', 'fondle', 'grab', 'molest', 'boobs', 'tits', 'oppai', 'boobjob'],
};

async function sondear(pedidos) {
  const verde = (t) => `\x1b[32m${t}\x1b[0m`;
  const rojo = (t) => `\x1b[31m${t}\x1b[0m`;
  const gris = (t) => `\x1b[90m${t}\x1b[0m`;
  if (!API_NSFW) {
    console.log(rojo('\n  Sin ACCION_NSFW_API puesta no hay nada que sondear.\n'));
    process.exit(1);
  }
  const grupos = pedidos.length
    ? { 'a mano': pedidos }
    : CANDIDATOS;

  console.log('\nSONDEO DE NOMBRES CONTRA LA FUENTE NSFW\n');
  const buenos = [];
  for (const [concepto, nombres] of Object.entries(grupos)) {
    console.log(gris(`  ── ${concepto} ──`));
    for (const cat of nombres) {
      const url = direccion(API_NSFW, cat);
      let estado;
      try {
        const { data } = await axios.get(url, { timeout: 12000 });
        const hay = data?.results?.[0]?.url || data?.url || data?.link || data?.response || data?.images?.[0]?.url;
        if (hay) { estado = verde('SIRVE'); buenos.push(`${concepto}: ${cat}`); }
        else estado = rojo('contesta sin gif');
      } catch (e) {
        estado = gris(`no (${e.response?.status || e.code || e.message})`);
      }
      console.log(`     ${String(cat).padEnd(14)} ${estado}`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  console.log('');
  if (buenos.length) {
    console.log(verde(`  Sirven ${buenos.length}:`));
    for (const b of buenos) console.log(`    · ${b}`);
    console.log(gris('\n  Pasa esta lista y se montan los comandos con esos nombres.\n'));
  } else {
    console.log(rojo('  Ninguno sirve: esa web no tiene esas categorias con ningun nombre de los probados.\n'));
  }
}

(async () => {
  const verde = (t) => `\x1b[32m${t}\x1b[0m`;
  const rojo = (t) => `\x1b[31m${t}\x1b[0m`;
  const gris = (t) => `\x1b[90m${t}\x1b[0m`;

  const iProbar = process.argv.indexOf('--probar');
  if (iProbar >= 0) return sondear(process.argv.slice(iProbar + 1).filter((x) => !x.startsWith('-')));

  let malas = 0;

  console.log('\nCATEGORÍAS DE LAS ACCIONES\n');
  if (!API_NSFW) console.log(gris('  (sin ACCION_NSFW_API puesta: las explícitas se prueban contra la web normal)\n'));

  for (const [nombre, a] of Object.entries(ACCIONES)) {
    const nsfw = a.nsfw && API_NSFW;
    const base = fuenteDe(a.cat, a.nsfw);
    const cat = nsfw ? (a.catNsfw || a.cat) : a.cat;
    const url = direccion(base, cat);
    let estado;
    try {
      const { data } = await axios.get(url, { timeout: 12000 });
      const hay = data?.results?.[0]?.url || data?.url || data?.link || data?.response || data?.images?.[0]?.url;
      estado = hay ? verde('trae gif') : rojo('contesta pero SIN gif');
      if (!hay) malas++;
    } catch (e) {
      estado = rojo(`FALLA (${e.response?.status || e.code || e.message})`);
      malas++;
    }
    const etiqueta = `!${a.cmds[0]}`.padEnd(12);
    const donde = nsfw ? 'nsfw' : '    ';
    const viva = ACTIVAS.includes(nombre) ? '' : gris('  (apagada: sin frases)');
    console.log(`  ${etiqueta} ${donde} ${String(cat).padEnd(12)} ${estado}${viva}`);
    await new Promise((r) => setTimeout(r, 250));   // sin ráfagas: la web tambien tiene limites
  }

  console.log('');
  if (malas) {
    console.log(rojo(`  ${malas} categoría(s) no traen nada. Ese comando cobra, falla y devuelve el aura CADA vez.`));
    process.exit(1);
  }
  console.log(verde('  Todas traen gif.\n'));
})();
