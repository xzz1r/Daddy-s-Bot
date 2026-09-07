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
const { ACCIONES, ACTIVAS } = require('../src/commands/acciones');

const API = 'https://nekos.best/api/v2/';
const API_NSFW = (process.env.ACCION_NSFW_API || '').trim();
const direccion = (base, cat) => (base.includes('{cat}') ? base.replace(/\{cat\}/g, cat) : `${base}${cat}`);

(async () => {
  const verde = (t) => `\x1b[32m${t}\x1b[0m`;
  const rojo = (t) => `\x1b[31m${t}\x1b[0m`;
  const gris = (t) => `\x1b[90m${t}\x1b[0m`;
  let malas = 0;

  console.log('\nCATEGORÍAS DE LAS ACCIONES\n');
  if (!API_NSFW) console.log(gris('  (sin ACCION_NSFW_API puesta: las explícitas se prueban contra la web normal)\n'));

  for (const [nombre, a] of Object.entries(ACCIONES)) {
    const nsfw = a.nsfw && API_NSFW;
    const base = nsfw ? API_NSFW : API;
    const cat = nsfw ? (a.catNsfw || a.cat) : a.cat;
    const url = direccion(base, cat);
    let estado;
    try {
      const { data } = await axios.get(url, { timeout: 12000 });
      const hay = data?.results?.[0]?.url || data?.url || data?.link || data?.images?.[0]?.url;
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
