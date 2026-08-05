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
  }],
};
