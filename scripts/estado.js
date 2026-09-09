#!/usr/bin/env node
// Revisión de estado de la VPS. Un solo comando que contesta lo único que
// importa: ¿está todo bien puesto o falta algo?
//
//   npm run estado
//
// Existe porque verificar a mano — mirar el commit, contar las keys del .env,
// buscar si pm2-logrotate quedó instalado, comprobar el disco — son seis cosas
// distintas en seis sitios distintos, y cualquiera de ellas se olvida. Aquí
// salen todas juntas con un ✔ o una ✘ delante.
//
// NUNCA imprime una key ni ningún secreto: solo dice cuántas hay y si valen.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
// Todo lleva timeout: si la red va mal, `git fetch` puede quedarse colgado
// minutos y esta revisión tiene que terminar siempre, aunque sea con dudas.
const sh = (cmd, ms = 15000) => {
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: ms }).trim(); }
  catch { return ''; }
};

let problemas = 0, avisos = 0;

// DOS SALIDAS, UNA SOLA PASADA DE COMPROBACIONES.
//
// Esto imprimia cuarenta lineas para decir "va bien", y cuarenta lineas de "✔"
// se leen igual que ninguna: lo que importa —lo que hay que arreglar— quedaba
// enterrado entre lo que ya funciona. En el movil, que es donde se mira, ni se
// ve sin hacer scroll.
//
// Por defecto sale un resumen: las tres cosas que hay que saber y TODO lo que
// pide atencion, sin una sola linea de relleno. El detalle completo sigue
// entero detras de `-v`, que es cuando de verdad hace falta: cuando algo falla
// y hay que ver por donde.
//
// No hay dos juegos de comprobaciones: se hacen una vez y se guardan. Un
// resumen que se calculara aparte acabaria diciendo algo distinto del detalle,
// y entonces no se podria confiar en ninguno de los dos.
const DETALLE = process.argv.includes('-v') || process.argv.includes('--todo');
const items = [];          // { tipo, texto, arreglo, seccion, clave }
let seccion = '';

const C = { ok: '\x1b[32m✔\x1b[0m', mal: '\x1b[31m✘\x1b[0m', avi: '\x1b[33m!\x1b[0m' };
function anota(tipo, texto, arreglo, clave = false) {
  items.push({ tipo, texto, arreglo, seccion, clave });
  if (!DETALLE) return;
  const marca = tipo === 'ok' ? C.ok : tipo === 'mal' ? C.mal : C.avi;
  console.log(`  ${marca}  ${texto}`);
  if (arreglo) console.log(`      \x1b[36m→ ${arreglo}\x1b[0m`);
}
// `clave` marca las tres lineas que van en el resumen aunque esten bien. El
// resto de los ✔ solo se ven con -v.
const bien  = (t, clave = false) => anota('ok', t, null, clave);
const mal   = (t, arreglo) => { problemas++; anota('mal', t, arreglo); };
const aviso = (t, arreglo) => { avisos++; anota('aviso', t, arreglo); };
const titulo = (t) => { seccion = t; if (DETALLE) console.log(`\n\x1b[1m${t}\x1b[0m`); };

if (DETALLE) console.log('\n\x1b[1mESTADO DEL BOT\x1b[0m');

// ─── Código ──────────────────────────────────────────────────────────────────
titulo('Código');
const local = sh('git -C ' + RAIZ + ' rev-parse --short HEAD');
const rama = sh('git -C ' + RAIZ + ' rev-parse --abbrev-ref HEAD');
if (!local) {
  mal('esto no parece un repositorio git');
} else {
  sh(`git -C ${RAIZ} fetch origin ${rama} --quiet`, 20000);
  const remoto = sh(`git -C ${RAIZ} rev-parse --short origin/${rama}`);
  const detras = Number(sh(`git -C ${RAIZ} rev-list --count HEAD..origin/${rama}`) || 0);
  if (!remoto) aviso(`commit ${local} (no pude consultar el remoto: ¿sin internet?)`);
  else if (detras === 0) bien(`commit ${local} — al día`, true);
  else mal(`commit ${local}, faltan ${detras} ${detras === 1 ? 'actualización' : 'actualizaciones'} (la última es ${remoto})`,
    `git pull origin ${rama} && npm install --omit=dev && pm2 restart all --update-env`);

  // Decir "hay cambios locales" sin decir CUÁLES no sirve de nada: nadie sabe
  // qué mirar. Se listan. Y package-lock.json va aparte porque lo reescribe
  // `npm install` él solo: no es un cambio de nadie y avisar de eso es ruido.
  const sucio = sh(`git -C ${RAIZ} status --porcelain`).split('\n').filter(Boolean);
  const soloLock = sucio.length > 0 && sucio.every(l => /package-lock\.json$/.test(l));
  if (soloLock) {
    bien('sin cambios propios (npm reescribió package-lock.json, es normal)');
  } else if (sucio.length) {
    // Se trima CADA línea antes de quitarle el estado. `sh()` trima la salida
    // entera, así que la primera línea llega ya sin su espacio inicial y las
    // demás no: cortar por posición fija dejaba una "M" pegada al primer nombre.
    aviso(`hay cambios locales sin guardar: ${sucio.map(l => l.trim().replace(/^\S+\s+/, '')).join(', ')}`,
      'git checkout -- .   (los descarta y deja el pull limpio)');
  } else {
    bien('sin cambios locales');
  }
}

// ─── Configuración ───────────────────────────────────────────────────────────
titulo('Configuración (.env)');
const envPath = path.join(RAIZ, '.env');
if (!fs.existsSync(envPath)) {
  mal('no existe el fichero .env', 'cp .env.example .env  y rellénalo');
} else {
  const env = {};
  for (const linea of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }

  // Keys de RapidAPI: se cuentan, NO se enseñan.
  const keys = String(env.RAPIDAPI_KEY || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!keys.length) aviso('sin RAPIDAPI_KEY: !play tira solo de SoundCloud, que falla más', 'añade la key al .env');
  else if (keys.length === 1) aviso('solo 1 key de RapidAPI: cuando agote el cupo del mes, !play cae a SoundCloud',
    'pon una segunda separada por coma: RAPIDAPI_KEY=una,otra');
  else bien(`${keys.length} keys de RapidAPI — cuando una agota el cupo, salta a la siguiente`);
  const cortas = keys.filter(k => k.length < 30).length;
  if (cortas) mal(`${cortas} de las keys parece incompleta (menos de 30 caracteres)`, 'revisa que no falte ningún trozo al pegarla');

  if (!env.OWNER_NUMBER) mal('falta OWNER_NUMBER: el bot no sabe quién es el dueño', 'añádelo al .env');
  else bien('OWNER_NUMBER configurado');

  // SHIP_ALTO se comprueba aqui porque es la unica pieza de configuracion que no
  // se puede verificar de ninguna otra forma: si el bot no la ve, el !ship sale
  // bajo — que es EXACTAMENTE lo que sale cuando la config esta bien y el amaño
  // no aplica. Un fallo indistinguible del funcionamiento normal es un fallo que
  // no se descubre nunca, asi que se dice aqui.
  //
  // NO SE IMPRIME EL NUMERO. Es de un tercero y este comando se enseña en
  // capturas; con saber que esta y cuantos hay basta para comprobar la config.
  const shipAlto = (env.SHIP_ALTO || '').split(',').map(n => n.replace(/\D/g, '')).filter(Boolean);
  if (shipAlto.length) {
    const raros = shipAlto.filter(n => n.length < 8 || n.length > 15);
    if (raros.length) {
      mal(`SHIP_ALTO tiene ${raros.length} número(s) con una longitud imposible`,
        'repásalo: se esperan de 8 a 15 dígitos, con o sin el + y los espacios');
    } else {
      bien(`SHIP_ALTO: ${shipAlto.length} número(s) con ship amañado al alza`);
    }
  }
}

// ─── EL CONTADOR DE REINICIOS NO ES UNA MEDIDA, ES UNA CICATRIZ ──────────────
//
// `restart_time` de pm2 es ACUMULADO desde que se creó el proceso, y no baja
// nunca: ni con `pm2 restart`, ni con un despliegue, ni cuando se arregla lo
// que estaba tirando el proceso. Solo lo pone a cero `pm2 reset <app>`.
//
// Esto lo aprendimos caro. El guardián estuvo con el techo de RAM 9 MB por
// debajo de su propio consumo, pm2 lo mataba y lo levantaba en bucle, y el
// contador llegó a 2954. Se arregló el techo… y el aviso siguió saliendo igual,
// porque 2954 es historia, no presente. Un aviso que no se apaga al arreglar la
// causa no es un aviso: es ruido, y el ruido se acaba ignorando justo el día
// que dice la verdad.
//
// Así que lo que se mira es el RITMO: cuánto ha subido el contador desde la
// última vez que se miró. Eso sí distingue "esto está pasando ahora" de "esto
// pasó y ya está resuelto".
const MARCA = path.join(RAIZ, 'data/estadoReinicios.json');
function reinicios(quien, ahora, tope, arreglo) {
  let previo = {};
  try { previo = JSON.parse(fs.readFileSync(MARCA, 'utf8')); } catch {}
  const antes = previo[quien];
  const guardar = () => {
    previo[quien] = { n: ahora, ts: Date.now() };
    try { fs.writeFileSync(MARCA, JSON.stringify(previo, null, 2)); } catch {}
  };

  // Sin marca previa, o con el contador por debajo del que había (alguien hizo
  // `pm2 reset`, o pm2 recreó el proceso): no hay ritmo que medir todavía.
  if (!antes || ahora < antes.n) {
    guardar();
    if (ahora > 200) {
      aviso(`${quien}: ${ahora} reinicios acumulados, pero no sé de cuándo son`,
        `pm2 reset ${quien === 'guardián' ? 'guardian' : 'bot'}   ← pone el contador a cero y así el próximo aviso significa algo`);
    } else bien(`${quien}: ${ahora} reinicios acumulados (primera medida)`);
    return;
  }

  const subio = ahora - antes.n;
  const horas = Math.max(1, Math.round((Date.now() - antes.ts) / 3600000));
  guardar();
  if (subio > tope) {
    aviso(`${quien}: ${subio} reinicios en las últimas ${horas} h, y eso no son despliegues`, arreglo);
  } else if (subio > 0) {
    bien(`${quien}: ${subio} reinicio(s) en ${horas} h (los despliegues cuentan)`);
  } else {
    bien(`${quien}: sin reiniciarse desde hace ${horas} h`);
  }
}

// ─── Proceso ─────────────────────────────────────────────────────────────────
titulo('Proceso');
let lista = [];
try { lista = JSON.parse(sh('pm2 jlist') || '[]'); } catch {}
const bot = lista.find(p => p.name === 'bot') || lista[0];
if (!bot) {
  mal('pm2 no tiene ningún proceso levantado', 'pm2 start ecosystem.config.js && pm2 save');
} else {
  const env = bot.pm2_env || {};
  if (env.status === 'online') {
    const mins = Math.floor((Date.now() - (env.pm_uptime || Date.now())) / 60000);
    const tiempo = mins >= 1440 ? `${Math.floor(mins / 1440)}d` : mins >= 60 ? `${Math.floor(mins / 60)}h` : `${mins}min`;
    bien(`en marcha desde hace ${tiempo}`, true);
  } else {
    mal(`${bot.name} está en estado "${env.status}"`, 'pm2 logs --lines 50   para ver por qué');
  }

  const ram = Math.round((bot.monit?.memory || 0) / 1024 / 1024);
  if (ram > 400) aviso(`usando ${ram} MB de RAM, va justo`, 'pm2 restart all');
  else bien(`${ram} MB de RAM`);

  reinicios('bot', env.restart_time || 0, 3, 'pm2 logs bot --err --lines 50');

  if (!env.max_memory_restart) {
    aviso('arrancado sin ecosystem.config.js: no hay tope de RAM ni de logs',
      'pm2 delete all && pm2 start ecosystem.config.js && pm2 save');
  } else bien('arrancado con ecosystem.config.js (tope de RAM puesto)');
}

// ─── Espacio que se puede recuperar ──────────────────────────────────────────
//
// Dos cosas concretas, y las dos hay que mirarlas EN LA MAQUINA porque dependen
// de lo que haya instalado. Van aquí y no en un informe suelto porque un dato
// que solo existe en una conversación se pierde; en `npm run estado` lo vuelves
// a ver cada vez que miras cómo va el bot.
{
  // 1. Objetos sueltos de git. Un `git gc` los empaqueta y no toca ni la
  //    historia ni el árbol de trabajo.
  const cuenta = sh('git count-objects -v') || '';
  const sueltos = Number((cuenta.match(/^count:\s*(\d+)/m) || [])[1] || 0);
  const kb = Number((cuenta.match(/^size:\s*(\d+)/m) || [])[1] || 0);
  if (sueltos > 800) {
    aviso(`${sueltos} objetos sueltos de git ocupando ${Math.round(kb / 1024)} MB`, 'git gc');
  }

  // 2. El ffmpeg empaquetado ocupa 65 MB y SOLO trae ffmpeg, no ffprobe. El bot
  //    necesita ffprobe (la duración del audio y el sondeo de vídeo), así que si
  //    funcionan es porque ya hay un ffmpeg del sistema — y ese trae los dos.
  //    En ese caso los 65 MB son una segunda copia que no abre nadie.
  //
  //    No se decide aquí: se dice, y lo decide el dueño. Quitar la dependencia
  //    equivocándose deja al bot sin stickers, sin !play y sin acciones a la vez.
  const hayFfprobe = !!sh('command -v ffprobe 2>/dev/null');
  let pesaEmpaquetado = 0;
  try {
    const dir = path.join(RAIZ, 'node_modules/@ffmpeg-installer');
    if (fs.existsSync(dir)) {
      const du = sh(`du -sm ${JSON.stringify(dir)} 2>/dev/null`) || '';
      pesaEmpaquetado = Number((du.match(/^(\d+)/) || [])[1] || 0);
    }
  } catch { /* si no se puede medir, no se dice nada */ }
  if (pesaEmpaquetado > 20 && hayFfprobe) {
    aviso(`el ffmpeg empaquetado ocupa ${pesaEmpaquetado} MB y esta máquina ya tiene ffmpeg propio (ffprobe responde)`,
      'npm uninstall @ffmpeg-installer/ffmpeg && npm run check   → si el check sigue verde, te ahorras esos MB');
  } else if (pesaEmpaquetado > 20) {
    bien(`el ffmpeg empaquetado (${pesaEmpaquetado} MB) hace falta: aquí no hay ffprobe del sistema`);
  }
}

// ─── El guardián ─────────────────────────────────────────────────────────────
//
// AQUI NO SE MIRABA. Todo lo de arriba busca el proceso llamado `bot` y ya:
// `lista.find(p => p.name === 'bot')`. El guardián podía estar parado, o
// reiniciándose en bucle, y `npm run estado` decía que todo iba bien.
//
// Y es justo el proceso del que no te enteras por otra vía. El bot se nota
// cuando falla —deja de contestar—; el guardián no hace nada visible hasta el
// día que le quitan el admin al bot, y ese día es tarde para descubrir que
// llevaba semanas caído.
//
// Ya pasó una vez por aquí: su `max_memory_restart` estaba en 120M y arrancaba
// con 111 MB de RSS, así que pm2 lo mataba y lo levantaba una y otra vez. En el
// log eso no se lee como un fallo, se lee como un reinicio limpio.
{
  const g = lista.find((p) => p.name === 'guardian');
  if (!g) {
    // No es un fallo: el guardián es opcional y hay quien no lo tiene montado.
    aviso('el guardián no está levantado en pm2 (sin él, quitarle el admin al bot lo deja ciego)',
      'pm2 start ecosystem.config.js --only guardian && pm2 save');
  } else {
    const env = g.pm2_env || {};
    if (env.status === 'online') {
      const mins = Math.floor((Date.now() - (env.pm_uptime || Date.now())) / 60000);
      bien(`guardián en marcha desde hace ${mins >= 1440 ? Math.floor(mins / 1440) + 'd' : mins >= 60 ? Math.floor(mins / 60) + 'h' : mins + 'min'}`, true);
    } else {
      mal(`el guardián está en estado "${env.status}": si le quitan el admin al bot, no lo va a devolver nadie`,
        'pm2 logs guardian --lines 50');
    }

    // La RAM CONTRA SU PROPIO TECHO, no contra un número escrito a mano. El
    // techo del bot y el del guardián son distintos, y comparar los dos con la
    // misma cifra es como se pasa por alto justo el que va apretado.
    const mb = Math.round((g.monit?.memory || 0) / 1024 / 1024);
    // PM2 LO DEVUELVE EN BYTES, aunque en ecosystem.config.js ponga '200M'.
    // Esto estaba escrito al revés —se quedaba con los dígitos tal cual— así que
    // `techo` valía 209715200 y la comparación de abajo no saltó NUNCA. O sea
    // que la comprobación que existía justo para avisar de un techo apretado
    // estuvo muda todo el tiempo que el guardián se estuvo reiniciando por eso.
    // El corte en 4096 es porque nadie escribe un tope de 4 GB en una máquina
    // de 1 GB: por encima de eso, son bytes.
    const crudo = Number(String(env.max_memory_restart ?? '').replace(/\D/g, '')) || 0;
    const techo = crudo > 4096 ? Math.round(crudo / 1048576) : crudo;
    if (techo && mb > techo * 0.85) {
      mal(`el guardián usa ${mb} MB y su tope es ${techo} MB: pm2 lo va a matar y lo va a volver a levantar en bucle`,
        'sube max_memory_restart en ecosystem.config.js y pm2 reload ecosystem.config.js');
    } else if (techo) bien(`guardián en ${mb} MB de ${techo} MB`);

    // Para el guardián el listón es MUCHO más bajo que para el bot: el bot se
    // reinicia en cada despliegue, el guardián casi nunca.
    reinicios('guardián', env.restart_time || 0, 1, 'pm2 logs guardian --err --lines 50');

    // Y EL CUADERNO DEL GUARDIÁN: por qué se murió, no cuántas veces. Lo
    // escribe él mismo al arrancar y al morir (ver src/guardian.js), porque un
    // proceso al que pm2 mata por memoria no deja NADA en el log de errores y
    // se lee igual que un reinicio limpio.
    try {
      const vidas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/guardianVidas.json'), 'utf8'));
      const finales = vidas.filter((v) => v.que !== 'arranca');
      const ultimo = finales[finales.length - 1];
      if (ultimo) {
        const cerca = techo && ultimo.rss >= techo * 0.85;
        const cuando = new Date(ultimo.ts).toLocaleString('es-ES');
        if (/SIG/.test(ultimo.que) && cerca) {
          mal(`al guardián lo está matando pm2 por memoria: la última vez a ${ultimo.rss} MB con el tope en ${techo} MB (${cuando})`,
            'sube max_memory_restart en ecosystem.config.js y pm2 restart ecosystem.config.js --only guardian');
        } else if (!/SIG/.test(ultimo.que)) {
          mal(`el guardián se murió solo: ${ultimo.que}${ultimo.detalle ? ` — ${ultimo.detalle}` : ''} (${cuando}, ${ultimo.rss} MB)`,
            'pm2 logs guardian --err --lines 50');
        } else bien(`guardián: el último final fue un ${ultimo.que} normal a ${ultimo.rss} MB`);
        const solos = finales.filter((v) => !/SIG/.test(v.que)).length;
        if (solos > 1) aviso(`${solos} de los últimos ${finales.length} finales del guardián no fueron despliegues`, 'pm2 logs guardian --err --lines 50');
      }
    } catch { /* sin cuaderno todavía: lo escribe el guardián en su próximo arranque */ }
  }
}

// ¿El PROCESO corre el codigo del disco? Son dos cosas distintas y confundirlas
// es el fallo mas facil de cometer: `git pull` cambia el disco, pero hasta que
// pm2 no reinicia, el bot en memoria sigue con el codigo viejo, y desde fuera
// todo parece actualizado.
//
// El bot imprime su commit AL ARRANCAR (index.js), a los milisegundos de nacer
// el proceso, y el valor va congelado desde que se carga el modulo. Antes solo
// salia al conectar, y como conectar tarda —o no llega—, la ultima linea del log
// era todavia la del proceso anterior: comparar a ciegas acusaba de "se actualizo
// sin reiniciar" a un bot recien reiniciado que estaba perfectamente. Ahora la
// huella del log es la del proceso vivo, y la rama de "recien arrancado" solo
// cubre el hueco de los primeros segundos.
if (local && bot) {
  const arranque = bot.pm2_env?.pm_uptime || 0;
  const linea = sh(`pm2 logs bot --out --lines 400 --nostream 2>/dev/null | grep "commit cargado" | tail -1`, 20000);
  const enMemoria = (linea.match(/commit cargado\s*:\s*([0-9a-f]{7,})/) || [])[1];
  // CUANTO LLEVA EL PROCESO EN MARCHA, y no la fecha de la linea del log.
  //
  // Aqui se intentaba sacar una fecha ISO del propio log, y el log no la lleva:
  // el bot imprime esa linea con un console.log pelado. La expresion no casaba
  // nunca, el dato salia NaN y la rama que de verdad importa —"lleva horas
  // corriendo codigo viejo"— quedaba inalcanzable, tapada por un "espera un
  // momento" perpetuo.
  //
  // pm_uptime si es un dato real y lo da pm2 directamente. Si el proceso lleva
  // menos de un minuto, todavia puede estar conectando y la huella vieja del
  // log se explica sola. Pasado ese minuto, una huella que no cuadra ya no
  // tiene excusa.
  const recienArrancado = arranque > 0 && (Date.now() - arranque) < 60000;

  // EL ORDEN DE ESTAS RAMAS IMPORTA, y estaba al reves.
  //
  // La marca de tiempo se miraba ANTES que la huella, y ahi habia dos fallos
  // encadenados. Uno: la linea del log no lleva fecha —el bot la imprime con un
  // console.log pelado, sin el prefijo del logger—, asi que la expresion que
  // buscaba una fecha ISO no encontraba nada NUNCA. Y dos: al no encontrarla,
  // `esDeAhora` era siempre falso y este aviso se quedaba encendido para
  // siempre, sin forma de apagarlo ni esperando ni reiniciando.
  //
  // Un aviso que no se puede apagar es peor que no tenerlo: se lee dos veces,
  // se aprende a saltarselo, y de paso se aprende a saltarse los de al lado.
  //
  // La huella manda. Si el commit del log es el del disco, el bot corre lo que
  // toca y da igual cuando se escribiera esa linea: no hay otra forma de que
  // ese hash este ahi. La fecha solo sirve para el caso en que NO coinciden,
  // que es donde de verdad hace falta distinguir "recien reiniciado, aun
  // conectando" de "lleva horas corriendo codigo viejo".
  if (!enMemoria) {
    aviso('el bot aún no ha dicho qué commit carga (¿todavía conectando?)', 'espera unos segundos y repite: npm run estado');
  } else if (enMemoria.startsWith(local) || local.startsWith(enMemoria)) {
    bien(`el bot en marcha corre ${enMemoria}, que es el del disco`);
  } else if (recienArrancado) {
    aviso(`reiniciado hace nada: la última huella del log (${enMemoria}) es del arranque anterior`,
      'espera a que conecte y repite: npm run estado');
  } else {
    mal(`el bot corre ${enMemoria} pero en disco está ${local}: se actualizó sin reiniciar`,
      'pm2 restart bot --update-env');
  }
}

// ─── ¿Por qué no responde? ───────────────────────────────────────────────────
//
// Esta sección existe porque "el bot se apagó de la nada" tiene cinco causas
// distintas que se ven EXACTAMENTE igual desde el grupo, y cuatro de ellas
// dejan el proceso vivo y a pm2 diciendo "online". Sin esto hay que ir a mirar
// a mano el state.json, la carpeta de sesión y el log; con esto sale aquí.
titulo('¿Responde el bot?');

// 1. Se rindió solo tras perder la sesión (el caso más silencioso de todos).
const parado = path.join(RAIZ, 'data/parado.json');
if (fs.existsSync(parado)) {
  try {
    const p = JSON.parse(fs.readFileSync(parado, 'utf8'));
    const hace = Math.round((Date.now() - new Date(p.desde).getTime()) / 60000);
    const cuando = hace >= 1440 ? `hace ${Math.floor(hace / 1440)} días` : hace >= 60 ? `hace ${Math.floor(hace / 60)} h` : `hace ${hace} min`;
    mal(`EL BOT SE PARÓ SOLO ${cuando} (${p.motivo}) — el proceso sigue vivo pero no está conectado`, p.detalle);
  } catch {
    mal('el bot dejó una marca de parada pero no pude leerla', 'cat data/parado.json');
  }
} else {
  bien('no hay ninguna marca de parada');
}

// 2. Apagado a mano con !off. Persiste en disco: sobrevive a los reinicios, así
//    que reiniciar no lo arregla y desde fuera parece que el bot está roto.
const statePath = path.join(RAIZ, 'data/state.json');
if (fs.existsSync(statePath)) {
  try {
    const st = JSON.parse(fs.readFileSync(statePath, 'utf8') || '{}');
    if (st.botEnabled === false) {
      mal('el bot está APAGADO con !off (queda guardado, por eso reiniciar no lo arregla)', 'manda *!off* → perdón, *!on* desde WhatsApp');
    } else {
      bien('el bot está encendido (!on)');
    }
    const apagados = (st.disabledGroups || []).length;
    if (apagados) aviso(`${apagados} ${apagados === 1 ? 'grupo tiene' : 'grupos tienen'} el bot apagado con !off`, 'manda *!on* en ese grupo');

    const soloAdmins = (st.soloAdminsEnabled || []).length;
    if (soloAdmins) aviso(`${soloAdmins} ${soloAdmins === 1 ? 'grupo está' : 'grupos están'} en modo admin: el bot ignora a los miembros`, 'manda *!adminmode off* en ese grupo');

    const auraOff = (st.auraDisabled || []).length;
    if (auraOff) aviso(`${auraOff} ${auraOff === 1 ? 'grupo tiene' : 'grupos tienen'} la dinámica de aura en pausa`, 'manda *!aura on* en ese grupo');
  } catch {
    mal('data/state.json está corrupto: el bot arrancará con la configuración por defecto', 'revisa el fichero o bórralo para empezar limpio');
  }
} else {
  aviso('todavía no hay data/state.json (normal si nunca ha arrancado)');
}

// 3. Sesión de WhatsApp. Sin credenciales el bot pide QR y se queda esperando.
const authDir = path.join(RAIZ, 'data/auth');
if (!fs.existsSync(authDir) || !fs.existsSync(path.join(authDir, 'creds.json'))) {
  // NO se manda a `pm2 logs`. pm2 mete un prefijo (`0|bot  | `) delante de cada
  // linea, y eso desplaza las filas del QR: el dibujo se rompe y la camara no
  // lo lee. Hay que sacarlo en primer plano, sin pm2 por medio.
  mal('no hay sesión de WhatsApp: el bot está esperando a que alguien escanee el QR',
      'pm2 stop bot && node index.js   → escanea, y luego Ctrl+C y pm2 start ecosystem.config.js');
} else {
  const edad = Math.round((Date.now() - fs.statSync(path.join(authDir, 'creds.json')).mtimeMs) / 60000);
  if (edad > 60 * 24 * 7) aviso(`la sesión no se toca desde hace ${Math.floor(edad / 1440)} días: puede estar muerta`, 'pm2 logs bot --lines 30');
  else bien('sesión de WhatsApp presente', true);
}

// ¿Y ESTA CONECTADO DE VERDAD? "Sesión presente" solo dice que existe el fichero
// de credenciales, que es un dato del disco. Un proceso que arranco y nunca
// llego a abrir la sesion tiene esas credenciales igual de presentes y salia
// aqui en verde, con pm2 diciendo "online" y el bot mudo en el grupo.
//
// Paso: un despliegue reinicio el bot dos veces seguidas —la segunda por un
// falso aviso del guion— y el proceso se quedo una hora sin conectar. Todo
// verde: pm2 online, credenciales presentes, y nada en el grupo.
//
// Se mira por POSICION en el log, no por fechas, que esas lineas no las llevan.
// Cada arranque escribe UNA huella y, si conecta, un "conectado" DESPUES. Si la
// ultima huella no tiene ningun "conectado" por debajo, el proceso vivo no ha
// conectado. Los primeros dos minutos no cuentan: conectar tarda.
if (bot) {
  const arranque = bot.pm2_env?.pm_uptime || 0;
  const enMarcha = arranque > 0 ? Date.now() - arranque : 0;
  const log = sh(`pm2 logs bot --out --lines 400 --nostream 2>/dev/null`, 20000);
  if (log && enMarcha > 120000) {
    const lineas = log.split('\n');
    const iHuella = lineas.map((l) => /commit cargado/.test(l)).lastIndexOf(true);
    const iConectado = lineas.map((l) => /Daddy's Bot conectado/.test(l)).lastIndexOf(true);
    // Solo se opina si la huella del arranque vivo esta dentro de lo leido; si
    // no aparece, el log ya ha dado la vuelta y de ahi no se deduce nada.
    if (iHuella >= 0 && iConectado < iHuella) {
      const mins = Math.round(enMarcha / 60000);
      mal(`el proceso lleva ${mins > 90 ? `${Math.round(mins / 60)}h` : `${mins}min`} arrancado y no ha llegado a conectar con WhatsApp`,
        'pm2 logs bot --lines 40 --nostream   → mira por qué, y luego: pm2 restart bot --update-env');
    }
  }
}

// 4. Lo que diga el log. Se buscan las frases EXACTAS que imprime el bot al
//    rendirse, no palabras sueltas: "error" a secas sale por mil motivos
//    inofensivos y convertiría esto en una alarma que nadie se cree.
const errLog = sh(`pm2 logs bot --err --lines 200 --nostream 2>/dev/null`, 20000);
if (errLog) {
  const señales = [
    [/Sesión cerrada \d+ veces seguidas/, 'WhatsApp cerró la sesión varias veces: puede haber una restricción en la cuenta', 'revisa el teléfono → Dispositivos vinculados'],
    [/No se pudo reconectar/,             'se agotaron los intentos de reconexión', 'pm2 restart bot'],
    [/Sesión rechazada \(401\)/,          'WhatsApp rechazó la sesión (401) en algún momento', 'si se repite, revisa el teléfono'],
    [/JavaScript heap out of memory/,     'se quedó sin memoria', 'pm2 start ecosystem.config.js  (pone el tope de RAM)'],
    [/ENOSPC|no space left/i,             'DISCO LLENO: es lo que corrompe la sesión de WhatsApp', 'pm2 flush && rm -rf temp/*'],
  ];
  const vistas = señales.filter(([re]) => re.test(errLog));

  // El log guarda lo de HOY y lo de hace un mes en el mismo fichero, así que una
  // caída ya resuelta seguiría saliendo en rojo para siempre. Si el bot está
  // conectado ahora mismo y no hay marca de parada, lo del log ya pasó: se dice
  // como historial, no como problema. Sin esto el aviso se vuelve permanente,
  // la gente aprende a ignorarlo, y el día que sea de verdad tampoco lo mirará.
  const enMarcha = bot?.pm2_env?.status === 'online' && !fs.existsSync(parado);

  if (!vistas.length) {
    bien('el log de errores no tiene ninguna señal conocida de caída');
  } else if (enMarcha) {
    // LA PISTA VA POR anota(), NO POR console.log.
    //
    // Estaba suelta y por eso salia huerfana: en el modo resumen los demas
    // renglones se guardan y se pintan al final, y este se escapaba del
    // mecanismo y aparecia ARRIBA DEL TODO, antes de la cabecera y sin la linea
    // a la que pertenece. Una pista sin su aviso no se entiende y encima
    // ensucia justo la salida que se lee de un vistazo.
    vistas.forEach(([, que], i) => {
      anota('ok', `ya resuelto — en el log viejo: ${que}`,
        i === 0 ? 'pm2 flush   (limpia el historial para que no vuelva a salir)' : null);
    });
  } else {
    for (const [, que, arreglo] of vistas) aviso(`en el log: ${que}`, arreglo);
  }
} else {
  aviso('no pude leer el log de pm2 (¿el proceso se llama distinto?)', 'pm2 ls');
}

// ─── Logs ────────────────────────────────────────────────────────────────────
titulo('Logs');
const modulos = sh('pm2 jlist --raw') || '';
const tieneRotate = sh('pm2 ls').includes('logrotate') || modulos.includes('logrotate');
if (tieneRotate) {
  const conf = sh('pm2 conf pm2-logrotate') || '';
  const max = (conf.match(/max_size\s+(\S+)/) || [])[1];
  const retain = (conf.match(/retain\s+(\S+)/) || [])[1];
  bien(`pm2-logrotate instalado${max ? ` (corta a ${max}, guarda ${retain || '?'})` : ''}`);
} else {
  mal('pm2-logrotate NO está instalado: los logs crecen sin freno hasta llenar el disco',
    'pm2 install pm2-logrotate && pm2 set pm2-logrotate:max_size 10M && pm2 set pm2-logrotate:retain 5');
}

const logDir = path.join(process.env.HOME || '/root', '.pm2/logs');
if (fs.existsSync(logDir)) {
  let bytes = 0;
  for (const f of fs.readdirSync(logDir)) {
    try { bytes += fs.statSync(path.join(logDir, f)).size; } catch {}
  }
  const mb = Math.round(bytes / 1024 / 1024);
  if (mb > 200) aviso(`los logs ocupan ${mb} MB`, 'pm2 flush');
  else bien(`los logs ocupan ${mb} MB`);
}

// ─── Disco ───────────────────────────────────────────────────────────────────
titulo('Disco');
const df = sh(`df -h ${RAIZ} | tail -1`).split(/\s+/);
if (df.length >= 5) {
  const usado = parseInt(df[4], 10);
  const libre = df[3];
  if (usado >= 90) mal(`disco al ${usado}% (quedan ${libre}). Si se llena, el bot pierde la sesión de WhatsApp`, 'pm2 flush  y borra lo que no uses');
  else if (usado >= 75) aviso(`disco al ${usado}% (quedan ${libre})`);
  else bien(`disco al ${usado}%, quedan ${libre}`);
}

// Residuo conocido: los binarios de sharp. Nadie declara sharp como
// dependencia, asi que si reaparecen es que un npm install los ha vuelto a
// traer y son 27 MB que no usa nadie.
if (fs.existsSync(path.join(RAIZ, 'node_modules/@img'))) {
  aviso('los binarios de sharp han vuelto a instalarse (27 MB que no usa nadie)',
    'rm -rf node_modules/sharp node_modules/@img');
}

for (const [nombre, dir] of [['caché de música', 'data/music_cache'], ['caché de fotos', 'data/pfpcache'], ['temporales', 'temp']]) {
  const d = path.join(RAIZ, dir);
  if (!fs.existsSync(d)) continue;
  let bytes = 0;
  const andar = (p) => {
    for (const f of fs.readdirSync(p)) {
      const full = path.join(p, f);
      try { const st = fs.statSync(full); bytes += st.isDirectory() ? (andar(full), 0) : st.size; } catch {}
    }
  };
  try { andar(d); } catch {}
  const mb = Math.round(bytes / 1024 / 1024);
  const tope = dir.includes('music') ? 400 : dir.includes('pfp') ? 60 : 100;
  if (mb > tope) aviso(`${nombre}: ${mb} MB, por encima de su tope (${tope} MB)`);
  else bien(`${nombre}: ${mb} MB`);
}

// Temporales huerfanos: cada uno es un cierre brusco anterior. El bot los barre
// al arrancar, asi que si aparecen MUCHOS es que se esta muriendo a menudo.
const tmps = fs.existsSync(path.join(RAIZ, 'data'))
  ? fs.readdirSync(path.join(RAIZ, 'data')).filter(f => f.endsWith('.tmp')).length
  : 0;
if (tmps > 5) aviso(`${tmps} temporales a medio escribir en data/: el bot se esta cerrando de golpe a menudo`, 'pm2 logs bot --err --lines 50');
else if (tmps) bien(`${tmps} temporal suelto en data/ (el bot lo barre al arrancar)`);

// ─── Dependencias ────────────────────────────────────────────────────────────
titulo('Dependencias');
const auditJson = sh('npm audit --omit=dev --json 2>/dev/null', 60000);
if (auditJson) {
  try {
    const a = JSON.parse(auditJson);
    const v = a.metadata?.vulnerabilities || {};
    const graves = (v.high || 0) + (v.critical || 0);
    const total = Object.values(v).reduce((x, y) => x + y, 0);
    if (graves) mal(`${graves} vulnerabilidades graves`, 'npm audit fix');
    else if (total) aviso(`${total} vulnerabilidades leves`, 'npm audit fix');
    else bien('sin vulnerabilidades');
  } catch { aviso('no pude leer el informe de npm audit'); }
}
// EL FIN DE SOPORTE VA POR FECHA, NO POR NUMERO ESCRITO A MANO.
//
// Aqui solo se avisaba por debajo de Node 18, asi que a un Node 20 —que dejo de
// recibir parches de seguridad en abril de 2026— le ponia un ✔ y a correr. Un
// chequeo de salud que da por bueno algo caducado es peor que no tenerlo.
//
// Con las fechas puestas, esto envejece SOLO: el dia que Node 22 salga de
// soporte empieza a avisar sin que nadie toque el fichero. Es lo contrario de lo
// que hacen los comentarios con cifras dentro, que se quedan viejos y mienten.
const FIN_DE_SOPORTE = {   // final del mantenimiento de cada LTS
  18: Date.UTC(2025, 3, 30),
  20: Date.UTC(2026, 3, 30),
  22: Date.UTC(2027, 3, 30),
  24: Date.UTC(2028, 3, 30),
};
const nodeMayor = Number(process.versions.node.split('.')[0]);
const fin = FIN_DE_SOPORTE[nodeMayor];
const siguienteLTS = Object.keys(FIN_DE_SOPORTE)
  .map(Number).filter((v) => FIN_DE_SOPORTE[v] > Date.now()).sort((a, b) => a - b)[0];

if (nodeMayor < 18) {
  mal(`Node ${process.versions.node} es demasiado viejo para Baileys`, `actualiza a Node ${siguienteLTS || 22}`);
} else if (fin && fin < Date.now()) {
  const meses = Math.round((Date.now() - fin) / (30 * 86400000));
  aviso(`Node ${process.versions.node} lleva ${meses} mes(es) sin soporte: ya no recibe parches de seguridad`,
    `pasa a Node ${siguienteLTS || 22} (y de paso npm se actualiza solo, viene dentro)`);
} else if (!fin) {
  bien(`Node ${process.versions.node}`);   // version que no esta en la tabla: no se opina
} else {
  bien(`Node ${process.versions.node}`);
}

// ─── Veredicto ───────────────────────────────────────────────────────────────
const B = '\x1b[1m', F = '\x1b[0m', VERDE = '\x1b[32m', ROJO = '\x1b[31m', AMBAR = '\x1b[33m', AZUL = '\x1b[36m';

if (DETALLE) {
  console.log('\n' + '─'.repeat(52));
  if (!problemas && !avisos) console.log(`${VERDE}${B}  TODO EN ORDEN. No hay nada que hacer.${F}\n`);
  else if (!problemas) console.log(`${AMBAR}${B}  Funciona, pero hay ${avisos} ${avisos === 1 ? 'cosa mejorable' : 'cosas mejorables'} (las marcadas con !).${F}\n`);
  else console.log(`${ROJO}${B}  ${problemas} ${problemas === 1 ? 'cosa que arreglar' : 'cosas que arreglar'} (las marcadas con ✘). Copia el comando en azul de debajo de cada una.${F}\n`);
} else {
  // El resumen. Tres lineas de "esta vivo y corriendo lo que toca", y despues
  // TODO lo que pide atencion — nada se esconde por brevedad, que seria el
  // unico modo de que este modo fuera peor que el largo.
  const titular = problemas ? `${ROJO}${B}HAY ${problemas} ${problemas === 1 ? 'COSA' : 'COSAS'} QUE ARREGLAR${F}`
                : avisos    ? `${AMBAR}${B}FUNCIONA${F}`
                :             `${VERDE}${B}TODO EN ORDEN${F}`;
  console.log(`\n${B}DADDY'S BOT${F} · ${titular}\n`);

  for (const it of items.filter((x) => x.clave)) console.log(`  ${C.ok}  ${it.texto}`);

  const pendientes = items.filter((x) => x.tipo !== 'ok');
  if (pendientes.length) {
    console.log('');
    for (const it of pendientes) {
      console.log(`  ${it.tipo === 'mal' ? C.mal : C.avi}  ${it.texto}`);
      if (it.arreglo) console.log(`      ${AZUL}→ ${it.arreglo}${F}`);
    }
  }

  // Cuantas comprobaciones se han hecho y no se estan enseñando. Sin esto, el
  // resumen parece una revision de tres cosas en vez de la de siempre.
  const calladas = items.length - items.filter((x) => x.clave).length - pendientes.length;
  console.log(`\n  ${AZUL}npm run estado -v${F}  ${calladas} comprobaciones más, todas en verde\n`);
}

process.exit(problemas ? 1 : 0);
