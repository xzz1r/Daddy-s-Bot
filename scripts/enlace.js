// ¿QUÉ LE CONTESTA LA API CUANDO UN ENLACE NO SALE?
//
//   npm run enlace -- https://www.instagram.com/p/XXXXXXXX/
//
// EXISTE PORQUE EL FALLO SE VE DESDE EL SITIO EQUIVOCADO. En el grupo sale «no
// he podido traerlo de Instagram» y eso es lo mismo para ocho causas distintas:
// la API no contesta, contesta y dice que no, contesta bien pero con los medios
// en un campo que el bot no mira, el CDN corta la descarga, lo que llega no es
// un vídeo, pesa de más… Cada una se arregla en un sitio y desde fuera no se
// distinguen.
//
// Esto enseña la RESPUESTA por dentro: qué campos trae, de qué tipo, cuántos
// elementos, y qué habría sacado el bot de ahí. Después ejecuta el camino
// completo y dice en qué acabó.
//
// NO IMPRIME NI LA DIRECCIÓN DE LA API NI LAS DE LOS MEDIOS. De la API solo
// dice si está puesta; de cada medio, el servidor y la extensión. Es lo que
// hace falta para arreglarlo y nada de lo que no se puede pegar en un chat.
'use strict';
require('dotenv').config();
const axios = require('axios');
const fs = require('fs-extra');
const redes = require('../src/utils/redes');

const verde = (t) => `\x1b[32m${t}\x1b[0m`;
const rojo = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;

// De una dirección solo sale el servidor y la extensión. Lo demás identifica el
// contenido y no hace falta para saber qué campo hay que mirar.
function corta(u) {
  try {
    const { host, pathname } = new URL(u);
    const punto = pathname.lastIndexOf('.');
    const ext = punto < 0 ? 'sin extensión' : pathname.slice(punto + 1).split('/')[0];
    return `${host} · ${ext}`;
  } catch { return 'no es una dirección'; }
}

const esEnlace = (v) => typeof v === 'string' && /^https?:\/\//i.test(v);

function describe(valor, sangria = '  ') {
  if (valor === null) return 'null';
  if (Array.isArray(valor)) {
    if (!valor.length) return 'lista vacía';
    const dentro = valor.slice(0, 3).map((v) => describe(v, sangria + '  '));
    return `lista de ${valor.length}\n${dentro.map((d) => `${sangria}  · ${d}`).join('\n')}`;
  }
  if (typeof valor === 'object') {
    const claves = Object.keys(valor);
    const conEnlace = claves.filter((k) => esEnlace(valor[k]));
    const resumen = `objeto {${claves.slice(0, 12).join(', ')}${claves.length > 12 ? ', …' : ''}}`;
    if (!conEnlace.length) return resumen;
    return `${resumen}\n${conEnlace.map((k) => `${sangria}    ${k} → ${corta(valor[k])}`).join('\n')}`;
  }
  if (esEnlace(valor)) return `enlace → ${corta(valor)}`;
  if (typeof valor === 'string') return valor.length > 60 ? `texto (${valor.length})` : `"${valor}"`;
  return String(valor);
}

(async () => {
  const url = process.argv.slice(2).find((a) => /^https?:\/\//i.test(a));
  if (!url) {
    console.log('\n  Uso: npm run enlace -- <la dirección del vídeo o del post>\n');
    process.exit(1);
  }
  const plataforma = redes.plataformaDe(url);
  if (!plataforma) {
    console.log(rojo('\n  Ese enlace no es de TikTok, Instagram ni Pinterest.\n'));
    process.exit(1);
  }
  const nombre = redes.PLATAFORMAS[plataforma].nombre;
  console.log(`\n${nombre.toUpperCase()}\n`);
  console.log(`  API puesta para ${nombre}: ${redes.hayApi(plataforma) ? verde('sí') : rojo('no')}`);

  // 1. LA RESPUESTA DE LA API, POR DENTRO.
  if (redes.hayApi(plataforma)) {
    const base = redes._API_DE[plataforma];
    const destino = base.includes('{url}')
      ? base.replace('{url}', encodeURIComponent(url))
      : `${base}${base.includes('?') ? '&' : '?'}url=${encodeURIComponent(url)}`;
    let data = null;
    const t0 = Date.now();
    try {
      ({ data } = await axios.get(destino, { timeout: 20000 }));
      console.log(`  Contesta en ${Date.now() - t0} ms\n`);
    } catch (e) {
      console.log(rojo(`  NO contesta: ${e.response?.status || e.code || e.message}\n`));
    }
    if (data && typeof data === 'object') {
      console.log('  LO QUE TRAE:\n');
      for (const [k, v] of Object.entries(data)) {
        console.log(`    ${k.padEnd(14)} ${describe(v)}`);
      }
      // Y lo mismo un nivel más abajo, que es donde casi todos meten el post.
      if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        console.log('\n  DENTRO DE `data`:\n');
        for (const [k, v] of Object.entries(data.data)) {
          console.log(`    ${k.padEnd(14)} ${describe(v)}`);
        }
      }
      // 2. Y QUÉ SACA EL BOT DE AHÍ. Es la pregunta de verdad: la API puede
      //    estar contestando perfectamente y el bot mirar donde no es.
      const fotos = redes._imagenesDe(data);
      const cancion = redes._musicaDe(data);
      console.log('\n  LO QUE EL BOT SACA DE ESO:\n');
      console.log(`    fotos           ${fotos.length ? verde(`${fotos.length}`) : gris('ninguna')}`);
      for (const f of fotos.slice(0, 5)) console.log(`                    ${corta(f)}`);
      console.log(`    canción         ${cancion ? verde(corta(cancion)) : gris('ninguna')}`);
    }
  }

  // 3. Y EL CAMINO COMPLETO, tal cual lo hace el comando.
  console.log('\n  EL COMANDO, DE VERDAD:\n');
  const t1 = Date.now();
  try {
    const traido = await redes.traer(url, plataforma);
    console.log(verde(`    ✓ ${traido.tipo} · ${traido.ext} · ${Math.round(traido.bytes / 1024)} KB · ${Date.now() - t1} ms`));
    await fs.remove(traido.fichero).catch(() => {});
  } catch (e) {
    console.log(rojo(`    ✗ ${e.message}`));
    console.log(gris(`      (${Date.now() - t1} ms)`));
  }
  console.log('');
})();
