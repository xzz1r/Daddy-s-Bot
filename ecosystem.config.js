// Configuración de pm2 para la VPS.
//
// La máquina es una Oracle del plan gratuito: poca RAM y, sobre todo, poco
// disco. Los dos ajustes de aquí atacan justo eso.
//
// USO:  pm2 start ecosystem.config.js   (en vez de `pm2 start index.js`)
//       pm2 save                        para que sobreviva a un reinicio
module.exports = {
  apps: [{
    name: 'bot',
    script: 'index.js',
    cwd: __dirname,

    // Una sola instancia. El bot mantiene UNA sesión de WhatsApp y estado en
    // memoria (colas de escritura de aura, cooldowns, cachés): dos procesos se
    // pisarían la sesión y se contradirían entre ellos.
    instances: 1,
    exec_mode: 'fork',

    // ─── RAM ─────────────────────────────────────────────────────────────────
    //
    // Si Node se pasa de aquí, pm2 lo reinicia limpio. Sin esto, en una máquina
    // de 1 GB el que decide es el OOM killer del kernel, que mata el proceso a
    // lo bruto y puede dejar a medias una escritura de las que NO son atómicas.
    // Reiniciar a los 450 MB deja margen de sobra: en marcha ronda los 150-250.
    max_memory_restart: '450M',

    // ─── DISCO ───────────────────────────────────────────────────────────────
    //
    // Esto es lo que llena un disco pequeño sin que nadie lo vea venir: el bot
    // escribe a stdout/stderr y pm2 lo guarda en ~/.pm2/logs/*.log SIN NINGÚN
    // límite por defecto. Un bot hablador 24/7 puede juntar cientos de megas en
    // unas semanas, y cuando el disco se llena no falla el log: falla TODO —
    // aura.json, banlist.json, la sesión de WhatsApp.
    //
    // Juntar los dos flujos en un fichero y ponerle fecha a cada línea hace que
    // el rotador tenga un solo sitio del que ocuparse.
    //
    // OJO: pm2 por sí solo NO rota nada. Hay que instalar el módulo UNA vez:
    //
    //   pm2 install pm2-logrotate
    //   pm2 set pm2-logrotate:max_size 10M
    //   pm2 set pm2-logrotate:retain 5
    //   pm2 set pm2-logrotate:compress true
    //
    // Con eso el log queda acotado en ~50 MB pase lo que pase.
    merge_logs: true,
    time: true,

    // ─── Reinicios ───────────────────────────────────────────────────────────
    //
    // Si el bot se cae en bucle (por ejemplo, sesión de WhatsApp inválida), no
    // tiene sentido reintentar cien veces por segundo: solo llena el log y
    // calienta la CPU. Espera 5s entre intentos y se rinde tras 10 seguidos.
    autorestart: true,
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '60s',

    // ─── CUANTO SE LE DEJA AL BOT PARA GUARDAR AL MORIR ─────────────────────
    //
    // ESTO FALTABA Y HACIA INUTIL EL APAGADO ORDENADO. Al recibir SIGINT el bot
    // vuelca todos los almacenes pendientes —conteos, aura, casino, racha,
    // nombres...— y se da tres segundos para hacerlo antes de salir.
    //
    // Pero pm2, si no se le dice otra cosa, manda SIGKILL a los 1600 ms. O sea
    // que el presupuesto de tres segundos era INALCANZABLE: en cada `pm2
    // restart` —y hay uno en cada despliegue— el proceso moria a mitad del
    // volcado y se perdia lo que no hubiera dado tiempo a escribir. En un bot
    // cuya regla es que en los conteos no puede haber errores, eso es
    // exactamente el error, repetido en cada actualizacion.
    //
    // Ocho segundos deja margen de sobra sobre los tres que se pide el bot, y
    // no retrasa nada: el proceso sale solo en cuanto termina de volcar, sin
    // esperar a agotar el plazo.
    kill_timeout: 8000,

    // No vigilar ficheros: `data/` cambia constantemente (aura, contadores,
    // cachés) y con watch activado el bot se reiniciaría solo cada pocos
    // segundos, perdiendo la sesión cada vez.
    watch: false,

    env: {
      NODE_ENV: 'production',
      // Node no sabe que la máquina va justa de RAM y reserva heap de más.
      // Con el techo puesto, el recolector de basura trabaja antes y se evita
      // llegar al max_memory_restart de arriba.
      NODE_OPTIONS: '--max-old-space-size=384',
    },
  }, {
    // ─── EL GUARDIÁN ─────────────────────────────────────────────────────────
    //
    // La segunda cuenta, la que le devuelve el admin al bot cuando alguien se lo
    // quita. Va aquí para que arranque y se reinicie con el resto, pero es un
    // proceso APARTE a propósito: su sesión de WhatsApp es otra, y si se cae no
    // se lleva el bot por delante.
    //
    // NO SE ARRANCA SOLO. `pm2 start ecosystem.config.js` levantaría los dos, y
    // el guardián sin vincular se queda pidiendo un QR que nadie va a escanear.
    // Se arranca a mano la primera vez, se escanea, y a partir de ahí ya vive
    // aquí:
    //
    //   pm2 start ecosystem.config.js --only guardian
    //   pm2 save
    //
    // RAM: pide menos que el bot. No guarda estado, no cachea nada, no procesa
    // mensajes — solo mantiene la sesión abierta y escucha un evento. Y descarta
    // antes de descifrar todo lo que no sea de un grupo, que es lo que le impide
    // crecer como el bot.
    //
    // EL TECHO ESTUVO EN 120M Y ERA UNA TRAMPA. La cifra salía de medir 22 MB
    // recién arrancado, pero esos 22 MB eran `heapUsed` y `max_memory_restart`
    // de pm2 se mide en RSS. Medido de verdad, con estas mismas NODE_OPTIONS:
    //
    //   guardián recién cargado:  RSS 111 MB   ·   heapUsed 27 MB
    //
    // O sea que arrancaba a 9 MB de su propio techo, sin haber hecho nada
    // todavía. En cuanto abre el socket y bufferea cualquier cosa lo cruza, pm2
    // lo mata y lo vuelve a levantar — y lo peor es que eso NO se lee como un
    // fallo en el log: se lee como un reinicio limpio.
    //
    // De esos 111 MB, 65 son Baileys (el protocolo de WhatsApp, 4 MB de
    // protobuf generado) y no se pueden quitar: el guardián necesita la misma
    // librería que el bot para mantener una sesión.
    //
    // Subirlo a 200M no gasta un byte más. La memoria ya está gastada; el techo
    // solo decide si pm2 lo mata o no. Y es exactamente lo que avisaba el
    // comentario que estaba aquí: un techo apretado no ahorra memoria, provoca
    // reinicios, y un guardián reiniciándose es un guardián ausente justo
    // cuando hace falta.
    name: 'guardian',
    script: 'src/guardian.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '200M',
    merge_logs: true,
    time: true,
    autorestart: true,
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '60s',
    // REINICIAR NO ARREGLA UNA SESION CERRADA, Y ESTO COSTO MIL DOSCIENTOS
    // REINICIOS EN SIETE HORAS.
    //
    // Cuando la sesion del guardian se cierra desde el telefono, WhatsApp
    // contesta 401 y el proceso no tiene nada que hacer: hace falta borrar
    // data/authGuardian y volver a vincular, a mano. Pero el proceso salia con
    // codigo 1, pm2 lo volvia a levantar, volvia a recibir el 401 y vuelta a
    // empezar — tres veces por minuto, indefinidamente, quemando CPU y log en
    // una maquina de un core.
    //
    // Con esto el guardian sale con 78 en ese caso concreto y pm2 lo deja
    // PARADO. Un guardian parado se ve en `pm2 ls` y `npm run estado` lo canta;
    // un guardian reiniciandose cada veinte segundos parece que funciona.
    //
    // El 78 es EX_CONFIG de sysexits: "la configuracion esta mal y no se
    // arregla sola". Cualquier otro fallo sigue saliendo con 1 y reiniciandose,
    // que para todo lo demas es lo correcto.
    stop_exit_codes: [78],
    watch: false,
    env: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=96',
    },
  }],
};
