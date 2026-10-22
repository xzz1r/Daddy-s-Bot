# El motor del bot

Notas del motor que no cambian cómo se escribe una frase: el despliegue, el
guardián, los contadores de pm2, las acciones por dentro, las redes y lo
multimedia. Estaban en `GUIA.md`, que desde ahora solo lleva lo que sirve para
escribir contenido. Aquí no se ha quitado nada: se ha movido.

---

## El check prueba comportamiento, no texto

**Diez capas se reescribieron** porque comprobaban TEXTO y no comportamiento:
buscaban una palabra en el código fuente, y bastaba con dejar la palabra donde
estaba y romper lo de al lado para que pasaran en verde. Es la enfermedad
crónica de este validador y ya había mordido tres veces. Ahora ejecutan: el
amaño del dueño en `!robo` se calcula y se compara, un mute se pone y se lee
desde un proceso nuevo, una cuenta business se procesa y se le pregunta a la
lista negra, la tienda se intenta con la economía apagada. Cada una probada
rompiendo el código a propósito y comprobando que se pone roja.

---

## Desplegar: `npm run update`

`npm run update` reinicia el bot **y el guardián**, en ese orden y pasándole
`ecosystem.config.js`. Lo de pasarle el fichero no es cosmético: `pm2 restart
bot` reinicia el proceso con la configuración que pm2 tiene guardada de cuando
se arrancó, no con la del fichero, y `--update-env` solo refresca las variables
de entorno. O sea que cambiar `max_memory_restart` o `NODE_OPTIONS` no se
aplicaba nunca: el fichero decía una cosa, el proceso corría con otra, y el
despliegue parecía perfecto. Ya pasó con el techo del guardián.

`npm run update` **también hace el mantenimiento**, al final y solo con el bot
ya verificado corriendo el commit nuevo. Antes esto eran tres avisos con su
comando para copiar a mano, y un aviso que sale igual en cada actualización deja
de leerse a la tercera. Si el arreglo es una orden fija y sin decisiones, lo hace
el despliegue:

- **`git gc`** cuando pasan de 800 los objetos sueltos. Llegaron a 4283 ocupando
  56 MB. No toca ni la historia ni el árbol de trabajo.
- **El ffmpeg empaquetado fuera**, cuando esta máquina tiene ffmpeg *y* ffprobe
  propios. Son 66 MB. Decide ffprobe: el paquete trae ffmpeg pero no ffprobe, y
  el bot necesita ffprobe, así que si ffprobe responde es que aquí ya hay un
  ffmpeg completo. **No se toca `package.json`**: se borra la carpeta, como con
  sharp, porque el fichero está en git y modificarlo bloquearía el siguiente
  despliegue, y porque en Termux ese paquete es el único ffmpeg que hay. Se
  borra **antes** del `check`, así que la comprobación se hace contra el ffmpeg
  que va a usar el bot de verdad. Si no sirviera, el check sale rojo, el
  despliegue se para sin tocar el proceso que corre y la siguiente pasada lo
  reinstala.
- **El cron de la copia diaria** a las 5:00, si no está puesto. El despliegue ya
  hace una copia, pero entre despliegue y despliegue pasan días. Se reconoce por
  un comentario al final de la línea, no por la ruta, así que mover el bot de
  carpeta no deja dos crones haciendo lo mismo. Y el crontab se lee entero antes
  de escribirlo: montado como `{ crontab -l; echo nueva; } | crontab -` los dos
  lados del pipe arrancan a la vez y el segundo puede truncar antes de que el
  primero termine de leer. En la prueba se llevó por delante un cron que no era
  del bot.

## Espacio y reinicios: `npm run estado`

`npm run estado` mira además dos cosas de espacio, y las mira **en la máquina**
porque dependen de lo que haya instalado: los objetos sueltos de git (un
`git gc` los empaqueta sin tocar la historia) y si el ffmpeg empaquetado, de 65 MB,
es una segunda copia. Ese paquete trae ffmpeg pero **no trae ffprobe**, y el bot
necesita ffprobe para la duración del audio y el sondeo de vídeo. Si esas dos
cosas funcionan es porque ya hay un ffmpeg del sistema, y ese trae los dos. El
diagnóstico lo dice y la decisión es del dueño: quitar la dependencia
equivocándose deja al bot sin stickers, sin `!play` y sin acciones a la vez.

El contador de reinicios de pm2 **no es una medida, es una cicatriz**.
`restart_time` es acumulado desde que se creó el proceso y no baja nunca: ni con
un despliegue, ni cuando se arregla lo que estaba tirando el proceso. Solo lo
pone a cero `pm2 reset <app>`. El guardián llegó a 2954 reinicios con el techo
de RAM 9 MB por debajo de su propio consumo, y cuando se subió el techo el aviso
habría seguido saliendo igual, porque 2954 es historia. Un aviso que no se apaga
al arreglar la causa se acaba ignorando justo el día que dice la verdad. Así que
`npm run estado` mira el **ritmo**: cuánto ha subido desde la última vez que se
miró, guardado en `data/estadoReinicios.json`. Callado si no sube.

## La RAM: lo que no hacía nada

Lo pidió el dueño (18 oct): menos RAM sin perder calidad. Nada de esto toca lo
que se manda: son los mismos vídeos, gifs y fotos, byte a byte.

- **La generación joven de V8**, en las `NODE_OPTIONS` del ecosystem. Node la
  deja crecer hasta 32 MB y no la devuelve. Va a 16 en el bot
  (`--max-semi-space-size=8`) y a 4 en el guardián (`=2`). El bot no baja de
  16: a 8, leer un JSON de 20.000 personas tardó un 45 % más.
- **Un hilo de fondo para V8** (`--v8-pool-size=1`) en vez de cuatro, que en un
  core no van en paralelo con nada.
- **`MALLOC_ARENA_MAX=2`**: malloc deja de quedarse memoria por cada hilo.
- **La despensa, en disco** (ver «Las acciones por dentro»): en memoria queda
  la miniatura y el gif se lee del disco al mandarlo.

Medido en un core, como la VPS, con 20.000 mensajes por el manejador: el bot
pasa de ~144 MB a ~129 sin perder velocidad, y el guardián arranca con 88 en
vez de 104. En marcha llegó a 138, y sin tope la generación joven crece ella
sola hasta 32 MB. La despensa son hasta 24 MB más. `npm run update` lo
aplica solo, porque reinicia pasando el ecosystem. La capa 127 arranca Node
con esas opciones y mide lo que hace, y la 43 vigila que la despensa no vuelva
a la RAM.

---

## El ritmo: nada sale en ráfaga

El número anterior se iba a revisión cada poco. Desde el cambio, cada socket
nuevo pasa por `ponerRitmo` (`src/utils/ritmo.js`): mensajes, borrados y
stickers (todo es `sendMessage`), expulsiones, solicitudes de entrada y
consultas de número salen con un hueco mínimo y algo de azar desde la anterior
del mismo tipo. Consultar si un número tiene WhatsApp lleva además un tope de
150 al día (lo usan la purga por número y `!pfp` con número; eran 60 y el dueño
lo subió el 18 oct). Si una purga llega al tope, lo dice en una sola línea con
cuántos números se han quedado sin comprobar. Mirar perfiles ajenos (foto, info, si es
empresa) y pedir la metadata de los grupos también va espaciado, y el escaneo
de cuentas de empresa va de una en una. Las solicitudes de entrada se
sondean cada seis minutos. Las reconexiones nunca bajan de cinco
segundos.

No cambia qué hace ningún comando, solo cuándo. Se espacian los arranques, no
se espera a que terminen: un envío colgado no deja mudo al bot. El visto y el
«en línea» quedan fuera a propósito: el dueño los quiere como estaban. La capa
123 lo vigila.

## La versión de WhatsApp Web

Al conectar, el bot (y el guardián) se presentan con una versión de WhatsApp
Web, y WhatsApp **cierra la conexión a las viejas** con un 405. Hasta el 19 oct
se presentaban con la que trae Baileys y publica en GitHub (2.3000.1043857760),
cuando WhatsApp Web iba ya por la 1050789799.

Ahora se le pregunta a WhatsApp Web (su `sw.js` lleva la revisión) y a GitHub
a la vez, y se usa la más nueva (`src/utils/versionWA.js`). Si WhatsApp cierra
con un 405 («cliente demasiado viejo»), el bot la vuelve a preguntar antes de
reconectar. Y el motivo de cada cierre sale en el log, una vez por motivo. La
capa 129 lo vigila.

## La batería de comandos (capa 131)

Revisión a fondo del 20 oct, que pidió el dueño. Cada comando del registro pasa
por el manejador de verdad con quince mensajes raros: sin nada detrás, con
texto, con números negativos o enormes, mencionando a otro, a sí mismo o al
bot, citando un mensaje o una foto, con letras de adorno y con un texto
larguísimo. Como miembro y como dueño, unos 9.000 mensajes en una copia
aparte y sin red, en unos 25 segundos. Sale en rojo si algo revienta, aunque
el reparto se lo trague y conteste «Eso ha petado»; si algo se cuelga; si una
respuesta lleva `undefined`, `NaN` o un `%A` sin sustituir; si un @número sale
sin su mención; o si un asterisco o un guion bajo se quedan sin pareja.

Y prueba lo que solo se ve con prisa, cuando llegan varios mensajes a la vez:

- **`!apostar` con otro comando de dinero.** Leía el saldo al empezar y lo
  movía al final, con esperas por medio. Con 650, `!dar 400` y `!apostar` a la
  vez dejaron −98, por debajo del suelo de 150. Ahora lo que se arriesga se
  cobra al sentarse, de golpe y antes del dado (`spendAura`). Si ya no llega,
  no se juega.
- **Cinco `!duel` a la vez** lanzaban cuatro duelos, y el último pisaba a los
  demás. Se vuelve a mirar si hay uno pendiente justo antes de apuntarlo.
- **Cinco `!tt` a la vez** hacían cuatro cobros y cuatro descargas. El turno de
  cada persona se coge antes de cobrar y se suelta si no llega a usarse.

Lo encontró una simulación de conversación con cuatro personas y miles de
comandos de dinero cruzados. Las mismas pruebas, con el código de antes, salen
en rojo.

Y en la segunda pasada, un hueco en el propio arreglo de `!apostar`: si algo
reventaba entre cobrar al sentarse y pagar, lo apostado no volvía (700 de
1.000). Ahora se devuelve, y la capa 131 lo prueba rompiendo el pago a
propósito.

## La velocidad que da la VPS: yt-dlp

Medido en un núcleo (20 oct). Lo que más pesa en `!tt`, `!ig`, `!x` y `!pin`
fuera de la red es yt-dlp, y hay dos cosas que dependen de nosotros:

- **Cuál se instala.** Solo arrancar (`--version`) cuesta 0,15 s el de pipx,
  0,55 s la zipapp y **1 s el binario autónomo** (`yt-dlp_linux`), que
  descomprime Python entero en cada llamada. Se paga en cada vídeo, y en la
  VPS varias veces más. El bot mira primero `~/.local/bin`, que es donde lo
  deja pipx; `setup.sh` ya instala con pipx (o la zipapp si no hay pipx), y
  `npm run estado` avisa si el que se usa es el autónomo.
- **Los trozos.** Lo que piden X y Pinterest suele ser HLS: decenas de trozos
  que se bajaban de uno en uno. Con `--concurrent-fragments 4`, un vídeo de 40
  trozos con 150 ms de latencia pasa de 7,97 s a 3,31 s, con el mismo fichero
  byte a byte. A un vídeo entero (TikTok) no le cambia nada.

Lo que NO se tocó, también medido: la caché de compilación de Node (el arranque
pasa de unos 600 ms a unos 595) y el formato de píxel del sticker animado
(`yuva420p` en vez de `rgba` gana un 7 % y pesa un 1 % más). La codificación
WebP es el 85 % del sticker animado y no baja sin bajar calidad. La capa 132
vigila lo de yt-dlp.

Y en la tercera pasada:

- **El sticker de una foto.** `compression_level` 4 en vez de 6. Es el
  esfuerzo del compresor, no la calidad, que la pone `-q:v`. En un núcleo pasa
  de 190-240 ms a 80-135 ms por foto, con el fichero un 2-3 % más grande. Si
  con el 4 no cabe en los 100 KB, se repite la misma calidad con el 6 antes de
  bajar un escalón: la calidad que sale es la de antes.
- **`npm run medir`.** Todo lo de arriba se midió en otra máquina, y los topes
  del bot (45 s por sticker animado, 10 s de vídeo como mucho) se pusieron con
  esos números. Esto mide en la VPS el núcleo, un sticker de una foto y uno
  animado (con el peor caso contra el tope), el arranque de yt-dlp y cuál es,
  lo que tarda en cargar el bot, el disco y el «steal», que es lo que se queda
  el hipervisor. Tarda un minuto, no toca `data/` y no sale a internet. Lo que
  diga en la VPS es lo que manda para ajustar esos topes. La capa 133 vigila
  las dos cosas.

### La VPS, medida en la VPS (21 oct)

Lo que dijo `npm run medir` en la máquina del bot, con el bot corriendo:

| | la VPS | la de referencia |
|---|---|---|
| núcleos que ve Node | 2 (AMD EPYC 7742) | — |
| bucle de prueba | 409 ms (×1,4) | 300 ms |
| sticker de una foto | 265 ms | 120 ms |
| sticker animado, por fotograma | 32,4 ms | 12,7 ms |
| vídeo de 10 s, una pasada | 7,8 s, contra el tope de 45 s | — |
| arrancar yt-dlp (pipx) | 495 ms | 150 ms |
| cargar el bot | 1,4 s | 0,55 s |
| disco | 53 MB/s, 32 GB libres | — |
| steal | **35 %** | 0 % |

Lo que se hizo con eso:

- **ffmpeg, una plaza y no dos.** Los dos núcleos son los dos hilos de un mismo
  núcleo, y encima frenado: es la instancia gratuita de AMD de Oracle, 1/8 de
  OCPU, y el hipervisor se queda el 35 % del tiempo en cuanto hay trabajo
  seguido. La cuenta de plazas daba 2 por ver dos núcleos, y dos ffmpeg
  repartiéndose el mismo núcleo solo hacen esperar al primero el doble. Ahora
  se cuentan núcleos de verdad: con uno o dos hilos, una plaza; con cuatro o
  más, dos. `npm run medir` lo prueba en la máquina («dos a la vez») y, si dice
  otra cosa, `FFMPEG_PLAZAS` en el `.env` manda. La capa 45 lo vigila.
- **Los topes se quedan.** El peor sticker animado (10 s) es 7,8 s por pasada,
  y el tope de 45 s es por pasada: casi seis veces de margen. El arranque de
  yt-dlp ya es el rápido (pipx) y se lanza una vez por vídeo: no hay llamadas
  que juntar.
- **Lo que no arregla el código es el steal.** Un tercio del tiempo de CPU se
  lo queda Oracle, y con trabajo seguido todo va más lento de lo que dice el
  núcleo. La salida de verdad es otra máquina: la Ampere A1 del mismo plan
  gratuito (ARM, hasta 4 OCPU y 24 GB) no tiene ese freno. Es una mudanza
  (`data/`, `.env`, la sesión) y la decide el dueño.

## Cuando WhatsApp no deja entrar: 402, 403, 406

El 19 oct el bot se quedó en bucle: abría la conexión cada doce segundos, sin
QR, sin código y sin un error. Se sospechó de la versión, pero con la versión
al día el log dijo el motivo de verdad: `403 Connection Failure`. WhatsApp ya
no aceptaba la sesión guardada en `data/auth`, y el bot reintentaba para
siempre, porque todo lo que no era un 401 se tomaba por un corte de red. Y con
`--codigo` no salía ningún código, porque con una sesión guardada no se pide.

Con estos tres códigos el bot se para, como con los 401 seguidos: deja
`data/parado.json`, que `npm run estado` canta en rojo, y dice qué ha pasado,
con las palabras de WhatsApp si las manda, y qué hacer
(`src/utils/rechazoWA.js`). El guardián sale con 78 y pm2 lo deja parado.

| código | qué es | qué hacer |
|---|---|---|
| 402 | bloqueo por un tiempo; dice por qué y cuánto queda | esperar y `pm2 restart bot`, sin volver a vincular |
| 403 | la sesión guardada ya no vale: el número se registró en otro teléfono, se reinstaló WhatsApp o bloquearon la cuenta | mirar el teléfono; si va normal, apartar `data/auth` y vincular otra vez |
| 406 | sesión cerrada sin motivo; WhatsApp Web lo llama cuenta bloqueada | lo mismo que con el 403 |

Qué es cada código sale de whatsmeow, que lo sacó de WhatsApp Web. La sesión
vieja se aparta con `mv`, no se borra. Y con `--codigo` y una sesión guardada,
el bot ahora avisa de que no pide código. La capa 130 lo vigila.

## El guardián

**Vincular el guardián se pide a mano, y esto le pasó a una persona.** Con la
sesión cerrada y pm2 reiniciándolo en bucle, cada arranque pedía código de
vinculación: al co-owner le llegaron en ráfaga al móvil sin haber pedido
ninguno. El tope de tres códigos existía, pero es **por proceso**, y cada
reinicio lo ponía a cero.

Ahora el guardián no pide nada si nadie lo ha pedido. Con el móvil ya abierto en
«Vincular con el número de teléfono»:

```
touch data/vincularGuardian
pm2 start ecosystem.config.js --only guardian
pm2 logs guardian
```

Pide **un** código y borra el fichero. Si nadie lo escribe, el siguiente arranque
no manda otro: hay que volver a pedirlo. Sin el fichero, dice qué falta y sale
con 78, o sea que pm2 lo deja parado. Un bucle ya no puede spamear a nadie,
porque un bucle no crea ficheros. La capa 51 lo comprueba.

Y reiniciar **no arregla una sesión cerrada**. Cuando la del guardián se cierra
desde el teléfono, WhatsApp contesta 401 y no hay nada que el proceso pueda
hacer: hay que borrar `data/authGuardian` y volver a vincular, a mano. Salía con
código 1, pm2 lo levantaba, volvía el 401, y vuelta: 1223 reinicios en siete
horas. Ahora sale con 78 y `ecosystem.config.js` lleva `stop_exit_codes: [78]`,
así que pm2 lo deja **parado**. Un guardián parado se ve, y uno reiniciándose cada
veinte segundos parece que funciona.

Y el contador sigue sin decir **por qué**. Peor: la comprobación que había para
avisar de un techo apretado **no saltó nunca**, porque pm2 devuelve
`max_memory_restart` en bytes y el código se quedaba con los dígitos tal cual, o
sea que comparaba 111 MB contra 209715200. Estuvo muda exactamente durante los
reinicios que existía para cazar.

Así que ahora el guardián deja escrito él mismo cuándo nace y cómo muere, en
`data/guardianVidas.json` (las últimas 20 vidas, con la RSS de cada final). Son
cinco finales y se distinguen entre sí:

| final | qué fue |
|---|---|
| `SIGTERM` con la RAM cerca del techo | lo mató pm2 por memoria |
| `SIGTERM` con la RAM baja | un despliegue o un `pm2 restart` |
| excepción sin capturar | un fallo de verdad, con su línea |
| sesión cerrada desde el teléfono | hay que volver a vincular |
| cuenta rechazada por WhatsApp (402, 403, 406) | mirar el teléfono del guardián |

Un proceso al que pm2 mata por memoria **no escribe ni un error**: se lee igual
que un reinicio limpio, y por eso hacía falta que lo apuntara el propio proceso.
`npm run estado` lo lee y lo dice. La capa 48 lo prueba ejecutando `estado` con
un pm2 de mentira, porque las dos guardas anteriores de esto fallaron callando.

## Los estados subidos al grupo

Los **estados subidos al grupo** dejan bitácora. El spam seguía saliendo a
diario y la sospecha era que el bot los borraba **solo para él**. En Baileys esa
diferencia es una condición sola: si la clave del borrado lleva el JID del grupo
y `fromMe: false`, sale como borrado de admin y lo quita para todos. Si no, sale
como borrado para uno mismo, sin error y con el mensaje intacto delante del
grupo. Probado con los nueve sobres vigilados, la clave se construye bien en los
nueve, y la capa 49 lo comprueba **ejecutando** el manejador y aplicando esa
misma condición a la clave que sale.

Lo que sí faltaba era saber por qué un estado no llega a borrarse. Hay cuatro
salidas y tres no dejaban rastro:

| salida | qué pasaba antes |
|---|---|
| quien lo sube es admin o tier dueño | se saltaba **en silencio** |
| el bot no es admin en ese momento | un warn y nada más |
| el sobre no se reconoce | cae como mensaje normal (`!diag` lo caza) |
| llega por `status@broadcast` | no se puede borrar desde ahí |

Ahora cada estado detectado apunta su final en `data/estadosVistos.json` y
`npm run estado` lo resume de las últimas 24 h. «Sigue saliendo» y «no se
detecta» se leían igual desde fuera y tienen arreglos opuestos.

## El spam de texto

Lo pidió el dueño (17 oct): 5 mensajes iguales del mismo número en menos de 10
segundos. Eran más de 10 y no saltaba nunca, porque nadie pega once veces lo
mismo en diez segundos: el dueño lo bajó a 5 el 18 oct. Cuando hay ráfaga y el
bot no puede actuar (sin admin, sin metadata del grupo), lo dice en el log.

- **La primera vez** el bot cierra el grupo (solo escriben los admins) y después
  avisa, con *Aviso 1 de 2* en negrita: el spam está prohibido, y una frase de
  `AVISO_SPAM` contra su sentido del humor. El grupo **se abre solo a los 20
  segundos** (dueño, 18 oct), salvo que alguien ya lo haya abierto. Si ya
  estaba cerrado antes del spam, lo cerró un admin y el bot no lo toca. La
  reapertura se apunta en disco y se retoma al reconectar.
- **La segunda**, ban: lista negra, que es global, y fuera del grupo. El aviso
  sale después de echarle y le usa de ejemplo con `BAN_SPAM`. Si no se le ha
  podido echar, solo dice lo de la lista negra.

- **Los admins no se libran** (18 oct), al revés que en el resto de la
  moderación automática: el mismo aviso, pero a la segunda **pierden el admin**
  en vez del ban, y se quedan en el grupo de ejemplo con `ADMIN_SPAM`. Al
  creador del grupo no se le puede quitar: si falla, no se anuncia nada.

- **Es individual** (dueño, 18 oct): solo cuenta lo que pega cada persona.
  Que varias peguen el mismo copy una vez cada una no salta. Se probó una
  regla de «cadena» para eso y el dueño la quitó.

«Iguales» son **las mismas letras y números** (18 oct): no cuentan las
mayúsculas, los espacios, las tildes, los emojis, los signos, el formato de
WhatsApp, los caracteres invisibles, las letras de adorno (𝓱𝓸𝓵𝓪) ni las
letras o sílabas repetidas («holaaaa», «jajajaja»). Antes bastaba con cambiar
un emoji para que cinco copias fueran cinco mensajes distintos. Los números sí
cuentan: una mención es un número, y sin ellos «!aura @uno» y «!aura @otro»
eran el mismo mensaje. Un mensaje solo de emojis se compara entero. Solo cuenta el texto: stickers,
fotos y vídeos tienen su regla, y un enlace repetido se lo queda el antilink. Solo se libra el tier dueño, y sin admin el bot no hace
nada. Que el bot le quite el admin a alguien no lo deshacen ni el anti-admin
ni el guardián: los dos se fían de lo que hace el bot.

La ráfaga se cuenta con la hora de cada mensaje, no con la de llegada: el lote
de una reconexión trae minutos de conversación en un segundo. Lo que ya iba de
camino cuando salió el aviso tampoco es la segunda: hay 15 s de margen. El aviso
se guarda en `data/spamTexto.json`, **caduca a las 12 horas** (dueño, 18 oct) y
se borra con el ban. Lo que ya no puede formar parte de ninguna ráfaga se borra
de la memoria con cada mensaje. El código está en `src/utils/spamTexto.js`; lo
prueban las capas 111 y 125.

---

## El anti-empresa: empresas, no la app

`!antiempresa` echa y veta a las cuentas de empresa. Hasta el 22 oct echaba
también a gente que no lo era (el dueño: «hay veces que también expulsa
cuentas que no lo son»), y era por dos cosas:

- **La categoría «No es una empresa».** Mucha gente usa la app WhatsApp
  Business como su WhatsApp de diario, sobre todo para llevar dos números en
  un móvil, y al configurarla marca esa categoría (`NOT_A_BIZ` en la API de
  Meta). El bot contaba cualquier categoría como prueba.
- **El nombre verificado del mensaje** (`msg.verifiedBizName`). Lo lleva toda
  cuenta de la app Business, sea una tienda o una persona, y se fichaba por
  él en cualquier grupo, con el modo encendido o no, para siempre.

Ahora decide el **perfil de empresa** (`src/utils/businessCheck.js`), y solo
cuenta lo que rellena un negocio:

| En el perfil | ¿Empresa? |
|---|---|
| una categoría de verdad («Tienda», «Ropa», «Otros negocios»…) | sí |
| dirección u horario | sí, diga la categoría lo que diga |
| correo o web | sí, salvo con «No es una empresa» |
| «No es una empresa», sin dirección ni horario | no |
| solo la descripción | no: en la app ocupa el sitio del «info» |

- El nombre verificado del mensaje solo dice que hay que mirar el perfil. Sin
  teléfono no hay consulta, y sin consulta no se echa a nadie: se busca el
  número en la sesión (`resolverLid`) y, si no está, se espera a otro mensaje.
- Lo comprobado se apunta como `empresa` (`nickStore.js`), con su fecha y los
  campos que lo delatan, y **vale 30 días**. Si una consulta posterior dice
  que no es una empresa, se borra. La ficha vieja `biz: true` sigue en
  `data/nicks.json` y ya no se lee.
- **El perfil de hoy manda sobre la ficha.** Al entrar, al escribir y en el
  scan, con teléfono se mira el perfil; la ficha solo decide cuando no se
  puede preguntar (sin número, o la consulta no contesta), y echar por ella
  no la renueva.
- **Los vetos viejos se revisan solos.** Un veto puesto por el anti-empresa
  (`by: 'auto'`, motivo «cuenta business…») no se cumple a ciegas: cuando esa
  persona vuelve a entrar o la meten, se le mira el perfil con la regla de
  ahora y, si no es empresa, se levanta y se queda. Si lo es o no se puede
  saber, sigue fuera. Los vetos puestos a mano no se tocan. `!fklist` los
  enseña y `!fkunban` los quita a mano.
- El aviso dice el porqué: «@x es una cuenta de empresa (categoría «Tienda»).
  Expulsada y vetada». La categoría la ve cualquiera en su perfil.

Lo que se pierde, a sabiendas: un suplantador que use la app Business y
marque «No es una empresa» ya no cae por esto. Para eso están `!antifake` y
`!fk`. Capas 9 (la regla, caso a caso) y 137 (el camino entero en una copia).

---

## Las acciones por dentro

Dos cosas del motor que conviene saber aunque no se toquen: el gif se prepara
**antes** de que nadie lo pida (la despensa, en `commands/acciones.js`), y
las explícitas (`!fuck`, `!anal`, `!cum` y `!spank`) **no funcionan contra el dueño**: se niegan
fingiendo que se cayó la web, porque un rechazo con nombre solo le pasa a una
persona y a la segunda vez el grupo sabe quién manda en el bot.

La despensa **sobrevive al reinicio**. Vivía solo en memoria, así que cada
despliegue la vaciaba, y el calentado tarda más de diez minutos a propósito:
va de una en una con treinta segundos de pausa porque una ráfaga de peticiones
seguidas a la misma web es como te cortan el acceso, y ya pasó. O sea que
después de cada actualización había una ventana larga en la que cada acción
volvía a pagar el viaje entero. Medido en la VPS el 9 de septiembre, justo
después de un `npm run update`:

```
accion fuck: 15105 ms (traer 15105, subir 0, 37 KB, despensa 0)
accion anal:  7606 ms (traer 7606,  subir 0, 55 KB, despensa 2)
```

La respuesta no es calentar más rápido, que es justo lo que la pausa larga
evita. Es no tener que calentar: lo preparado antes del reinicio son MP4 ya
convertidos y siguen valiendo. Se guardan en `data/despensa/` según se
preparan y se leen al arrancar, así que el comando de un minuto después de un
despliegue va como el de ayer y la web recibe **menos** peticiones. Caducan a
las 24 h para que el contenido siga rotando. El nombre del fichero lleva
dentro el hash de la categoría, así que el directorio **es** el índice: no hay
un `indice.json` que pueda desincronizarse, y lo que sobra se borra al leer.

Y desde el 18 oct **no está también en la RAM**. Antes los mismos bytes
estaban dos veces, en disco y en memoria, hasta 24 MB. Ahora, en cuanto el
fichero está escrito (con otro nombre y luego renombrado, para que uno a medias
no pase por bueno), la memoria se queda con la ruta, el peso y la miniatura. Al
mandar el gif se lee del disco: milisegundos, contra los segundos de la web.
Una unidad cuyo fichero ha desaparecido se salta y el comando va a la web, en
vez de mandar un vídeo vacío.

Y cuando una acción tarda, el log ya dice **dónde**: `traer 15105 [web 400,
bajar 260, ffmpeg 14400]`. Los tres pasos son tres problemas distintos con
arreglos distintos, y un solo número no se puede arreglar.

**De dónde salen los gifs.** Cada acción tiene varias webs de anime
(`FUENTES` y `CATALOGO` en `commands/acciones.js`): se prueba una al azar entre
las que tienen esa categoría y, si falla, la siguiente. Una web que contesta un
4xx se aparta 6 h y una que da un 5xx, 30 min, para no insistir contra lo que
está caído. Las explícitas salen de las webs que diga `ACCION_NSFW_API` en el
`.env`, que admite varias separadas por espacio o coma; `npm run acciones`
dice qué categorías tiene cada una.

**Y dibujos, no solo anime** (dueño, 18 oct). Con `KLIPY_API_KEY` en el `.env`,
una parte de los gifs (un tercio; `ACCION_DIBUJOS` lo cambia, de 0 a 1) sale
de KLIPY, un buscador de gifs: Bob Esponja, Gumball, Hora de Aventura, Un Show
Más, Tom y Jerry… Tenor era la opción natural y Google la cerró el 30 de junio
de 2026. Lo que se cuida, porque un buscador no tiene categorías:

- **Que sea lo que se pide.** Se busca «serie + acción» y solo vale un gif cuyo
  título o etiquetas digan la acción y la serie, palabra entera («pat» no casa
  dentro de «patrick»). Hasta tres series por gif; si ninguna trae uno así,
  sale de anime.
- **Solo en las acciones que no van de piel:** `!slap`, `!punch`, `!kick`,
  `!bonk`, `!hug`, `!pat`, `!stare`, `!laugh`, `!sleep`, `!pout`, `!facepalm`,
  `!bleh`, `!smug` y `!yeet`. Las series son infantiles, y las frases de
  `!kiss`, `!lick`, `!cuddle` o `!bite` van con doble sentido.
- **Nunca en las explícitas**, ni por la despensa: una explícita sin web propia
  tiene su cola aparte aunque tire de la misma categoría (`!spank` de `slap`).
- **Filtro de contenido de KLIPY al máximo** (`high`).
- Sale el mp4 tal cual, sin pasar por ffmpeg. La clave de pruebas da 100
  peticiones por hora; si se agota o falla, KLIPY se aparta un rato y todo
  sale de anime. La clave va dentro del enlace y no se escribe en el log.

`npm run acciones -- --dibujos` pide uno de cada acción por el mismo camino que
el bot y enseña el título del elegido. La capa 128 lo vigila.

---

## El cartel del día

El pool es `OBJETIVO_DIA_CARTEL`, en `avisos.js`. Es lo único que
el bot dice sin que nadie le hable y que no es moderación. El objetivo del día
llevaba tiempo calculándose en silencio (daba bonus de botín y de
probabilidad) y no se enteraba nadie, ni el grupo ni el propio objetivo: solo
salía después, en una línea al final de un robo que ya había salido bien.
Ahora se cuelga con el **primer mensaje del día** de cada grupo, no a la hora
del corte, porque un anuncio a las cinco de la mañana lo lee el scroll. Si no
hay objetivo posible, silencio: anunciar que hoy no hay cartel es ruido.

**Dos veces al día, y bien separadas.** Salía muchas más, y la causa no era el
contador sino dónde vivía: en un `Map` en memoria, así que cada reinicio lo
borraba y el cartel volvía a colgarse con el primer mensaje. Un día con ocho
despliegues son ocho carteles, y desde fuera eso es un bot pesado y nada más.
Ahora se guarda junto a la decisión del día, en el mismo fichero y con el mismo
saver, así que un reinicio ya no reabre la puerta. Y son dos con **cuatro horas
de hueco**: dos seguidas no son dos veces al día, son la misma cosa repetida.

## El remate del día

Vive en `utils/percentDia.js`. Los
veintiún comandos de `%` son el 87 % de lo que el grupo lee y son **una sola
mecánica repetida veintiuna veces**. Lo que se gasta no son las frases, es la
forma, que nunca cambia. Este remate la mueve sin escribir un pool nuevo: en
vez de más frases, hechos que el bot ya tenía delante y no usaba: el más alto
del día, el más bajo, un empate exacto con otra persona, o que ya lo habías
preguntado. Sale **una de cada tres** y solo si hay algo que decir. Si saliera
siempre dejaría de leerse y pasaría a ser parte del formato, que es justo lo
que viene a romper.

## El recargo de ráfaga

Vive en `utils/auraCobro.js`. Las tres primeras veces que
usas un comando de pago valen su precio, y de la cuarta en adelante, el doble.
Se cuenta por grupo. Los tops, el ship, los rankings y las herramientas
(`SIN_RAFAGA`) no suben nunca, por decisión del dueño.
El motivo es de economía, no de CPU: medida la curva de ingresos, el que
escribe mil mensajes al día cobra 366 y el normal 49, así que con precio fijo
el freno apretaba a quien no molestaba. Se cuenta lo que se **usa**, no lo que
se intenta, y un comando devuelto descuenta su uso. Y se dice en el menú y en
el mensaje de «no te llega»: un precio que sube sin avisar se lee como un
fallo del bot.

---

## Redes: `!tt`, `!ig`, `!pin`, `!x`

El vídeo que alguien pega, sin marca de
agua. Un comando por plataforma y no uno para todas, por decisión del dueño:
se piden distinto. Son cuatro: `!tt`, `!ig`, `!pin` y `!x`, que llegó después. Lo que comparten (cobrar, bajar, mandar, borrar y devolver
el aura si no llega nada) se escribe una vez en `commands/redes.js`, y el motor
está en `utils/redes.js`.

Lo que los mantiene baratos son tres decisiones que no se ven leyendo por
encima, y la capa 50 las prueba ejecutando:

| decisión | por qué |
|---|---|
| se manda `{ video: { url: fichero } }` | Baileys abre ahí un `createReadStream`. Con un Buffer serían 25 MB de heap por envío |
| `jpegThumbnail` en `null`, no `undefined` | `undefined` es lo que dispara el ffmpeg interno de Baileys al enviar |
| nunca pasa por ffmpeg | TikTok e Instagram ya entregan H.264, y reencodar en un core es lo que lo haría caro |

**No se guarda nada.** El fichero se borra en el `finally`, salga bien o mal, y
lo que quede atrás por un corte lo recoge el barrido horario de `temp`.

**De dónde salen.** Primero la API de esa plataforma si está puesta en el
`.env` (`TIKTOK_API`, `INSTAGRAM_API`, `PINTEREST_API`, o `REDES_API` para las
tres), y si no, `yt-dlp`. Si la API falla se cae a `yt-dlp` sin ruido. Entre
las dos, Instagram tiene sus espejos (abajo).

**Solo TikTok necesita un tercero.** Medido desde una VPS con `yt-dlp` al día,
y con enlaces **vivos**, que es donde me equivoqué dos veces:

| plataforma | qué contesta | qué es de verdad |
|---|---|---|
| TikTok | `Unexpected response from webpage request` | bloquea al servidor |
| Instagram | `empty media response` | **estrangula, no bloquea** |
| Pinterest | `No video formats found` | **es una foto** |

Solo la primera es un muro. Las otras dos las di por cerradas sin serlo:

**Pinterest** lo probé con un `pin.it` muerto y acabó en la portada. Uno vivo
redirige perfectamente. El error real era que el extractor de Pinterest de
yt-dlp solo entiende pines de **vídeo**, y la mayoría son fotos.

**Instagram** lo probé con un identificador inventado. Con reels reales sale,
pero hay límite por IP y por rato: tres seguidos y el segundo y el tercero
fallan con un mensaje que culpa a la falta de sesión y no es eso. Repetidos
unos segundos después salen a la primera. Eso explica lo que se veía desde
fuera, «hay vídeos de IG que no envía», unos sí y otros no sin patrón. Se
reintenta con espera creciente y los tres salen.

**Y eso ya no vale (21 oct).** El dueño: «el bot está teniendo problemas
pasando cualquier video de !ig». Desde una IP de servidor, Instagram le
contesta **429** a yt-dlp a la primera, y la página incrustada del reel sale
sin el vídeo dentro. Sin sesión ni API, no había nada.

Lo que sí funciona desde un datacenter son los **espejos** que usan Discord y
Telegram para previsualizar publicaciones: piden la publicación por su cuenta
y dan el fichero del CDN de Instagram, que a un servidor sí se lo entrega. Van
después de la API y antes de yt-dlp.

**Y no bastaba con dos (22 oct).** El dueño: «siguen habiendo demasiados
errores con Ig, tanto en videos normales como fotos». Medido con 119
publicaciones reales:

- **Las fotos no salían nunca**: solo se pedía el vídeo, y lo de una
  publicación de fotos se tiraba por «no era un vídeo».
- `kkinstagram` y `eeinstagram` son el mismo programa (InstaFix) y a muchos
  vídeos les dan **la portada**: 13 de 57 reels y casi todos los vídeos con
  enlace `/p/`.
- `kkinstagram`, sin la cabecera de un bot, salta a una página de anuncios.

Ahora van seis, en `ESPEJOS_IG` (`src/utils/redes.js`), y se piden como un bot
(`TelegramBot`):

| Espejo | Qué da |
|---|---|
| `ooinstagram.com` | la publicación entera, elemento a elemento (`/media/p/<código>/?index=0, 1…`), cada uno con su tipo; 400 pasado el último. Sacó bien todas las que seguían publicadas, carruseles mezclados incluidos. Va primero. |
| `hhinstagram.com`, `nninstagram.com` | solo el vídeo; a una publicación de fotos le dicen que no. |
| `eeinstagram.com`, `toinstagram.com` | InstaFix, elemento a elemento (`/images/<código>/<n>`). Respaldo de las fotos. |
| `kkinstagram.com` | InstaFix, el primer elemento. |

Cómo se decide:

- Un vídeo suelto sigue el camino de siempre (ajustar, nivelar). Las fotos y
  los carruseles vuelven en lista, como un tuit, y salen **en álbum**, hasta
  10 (`TOPE_CARRUSEL_IG`); los vídeos de un carrusel pasan por el mismo
  ajuste que un reel.
- **El tipo lo dice la respuesta, no la dirección**: el CDN sirve JPEG con
  `.heic` en el nombre, y un espejo caído contesta 200 con su página.
- **Un reel es un vídeo**: si de un `/reel/` solo sale una foto, es su
  portada y no se manda. Una foto de un InstaFix solo vale si nadie da un
  vídeo; uno que ya dio foto no se pregunta a otro InstaFix, que diría lo
  mismo.
- **El peso viene en la cabecera**: lo que pasa de 40 MB (había reels de 57
  y 115) se corta sin bajarlo, y en el grupo sale «ese vídeo pesa 57 MB y
  WhatsApp no pasa de 16 MB», no «no he podido traerlo». En un carrusel ese
  vídeo se salta y el resto sale. Una bajada que se queda quince segundos sin
  un byte se corta.
- **Un espejo que cae** (sin respuesta, 429, 5xx) pasa al final de la fila
  diez minutos. No se quita: si caen todos, se prueban igual.
- Los enlaces de compartir de la app (`/share/…`) no llevan el código: se
  pregunta a Instagram a dónde saltan.

Lo que contestó cada espejo queda en el motivo que enseña `npm run estado`.
Si un día caen, se cambian en `ESPEJOS_IG`. Una publicación de fotos con
música sale sin la canción: eso solo lo da una API (`INSTAGRAM_API`). Las
borradas, privadas o con restricción de edad no las da ninguno. La capa 135
lo vigila.

Para ver qué pasa con un enlace concreto, en la VPS:
`npm run enlace -- "<enlace>"`. Dice si la API está puesta, qué contesta por
dentro y en qué acaba el camino entero.

Así que Pinterest tiene vía propia y va antes que yt-dlp: se lee la página del
pin y se saca el medio de sus etiquetas `og:`, que es lo que usa cualquier chat
para pintar la previsualización. Sirve para foto y para vídeo, sin API y sin
login. Si la foto viene en la versión de 736 px, se prueba la original.

El último fallo de cada plataforma queda apuntado y `npm run estado` lo traduce
a qué poner en el `.env`, en vez de dejar un párrafo de yt-dlp en el log.

**Y si no hay por dónde**, ni API ni `yt-dlp`, el comando no cobra ni lo
intenta: contesta que esa red no está disponible y ya. Cobrar, esperar veinte
segundos y devolver el aura es gastarle el tiempo a alguien para acabar donde
ya se sabía.

**La marca de agua** en TikTok no es otro vídeo, es otro **formato** del mismo
enlace: el marcado es `download_addr` y el limpio es `play_addr`. El selector
descarta por nombre cualquier formato que hable de marca de agua, y solo cae al
mejor a secas si no queda ninguno limpio.

**El enlace no se queda en el grupo.** El comando lleva la dirección dentro,
así que el bot borra el mensaje en cuanto se pone a ello. Se borra **después de
cobrar**, no antes: las tres salidas en las que el comando no llega a
ejecutarse (sin enlace, en espera, sin saldo) contestan citándolo, y citar a un
muerto no se entiende. Y por eso lo que se manda después **no cita**: el
recuadro de la cita lleva dentro el texto del mensaje citado, o sea el enlace,
justo después de haberlo borrado. Se menciona a quien lo pidió, que es lo que
hacía falta de la cita.

**El freno no es el precio.** Son ocho segundos por persona, porque hay dos
huecos de descarga para todo el bot y los comparte con `!play`: sin eso, uno
pegando enlaces seguidos deja al grupo sin música y sin acciones.

**El audio se sube, y llegaba casi mudo.** Medido sobre un TikTok real: media
-24,2 dB y audio en HE-AACv2 a 32 kb/s. Dos cosas a la vez: viene bajo de
origen, y viene en un formato que muchos reproductores decodifican a medias y
suena aún más apagado.

La primera versión usaba `loudnorm` y `dynaudnorm`, y **sonaba peor que el
original**. Los dos son filtros **dinámicos**: no suben el volumen, comprimen
el rango, y sobre música eso se oye como bombeo. Aquí no hacía falta comprimir:
el audio viene bajo pero intacto, con el pico a -10,9 dB, o sea con once
decibelios de sitio libre hasta el techo. Se mide el pico, se sube justo hasta
dejar 1 dB de margen, y ya. Ganancia pura, sin tocar la dinámica.

| | antes | después |
|---|---|---|
| media | -24,2 dB | -14,3 dB |
| pico | -10,9 dB | -1,3 dB |
| audio | HE-AACv2 32 kb/s | AAC-LC 192 kb/s |
| coste | | 58 ms medir + 374 ms aplicar |

Cuatro veces más rápido que `loudnorm`, y funciona con **cualquier duración**,
así que desaparece el caso raro de los clips cortos (por debajo de cuatro
segundos `loudnorm` devolvía basura sin avisar: un clip de 2 s salía a -50 dB).
Si el pico ya está arriba no se toca nada, y si ffmpeg falla se manda el
original.

**Si aun así suena bajo**, no es el fichero. Medido en LUFS, que es la escala
del oído, y no en pico:

| | como viene | como se manda |
|---|---|---|
| TikTok | -23,4 LUFS | -13,7 LUFS |
| reel de Instagram | -14,5 LUFS | no se toca |

Los dos acaban donde emiten Spotify y YouTube. Lo que pasa es que la app de
TikTok **normaliza al reproducir** y WhatsApp no: el fichero es el mismo, quien
cambia es el reproductor. Y al lado de un audio de voz o de un vídeo grabado
con el móvil, que van muy por encima, un vídeo correcto suena bajo.

Para pasar de ahí hay que comprimir, no hay otra: con el pico ya arriba, lo
único que sube el volumen medio es recortar los picos. `REDES_AUDIO_EXTRA` dice
cuántos decibelios de eso se aceptan, y de serie son **cero**. Con 3, el TikTok
pasa de -13,7 a -11,3 LUFS y el rango baja de 3,8 a 3,5, que es casi nada.

Y para verlo con números en vez de a oído: `npm run audio <enlace>`. Baja el
vídeo por el mismo camino que el bot y dice qué le hace.

**El vídeo, lo más HD que WhatsApp sepa reproducir.** El mismo enlace de TikTok
tiene dos vídeos y no se parecen:

| | resolución | códec | tamaño |
|---|---|---|---|
| normal | 576x1024 | H.264 | 1,1 MB |
| HD | 1080x1920 | HEVC | 1,5 MB |

Se pide siempre el mejor y, si cabe, **va tal cual**: los mismos fotogramas
que sirve la red. Al HEVC solo se le cambia la caja (la etiqueta `hvc1`, sin
la que el iPhone no lo abre), que son 0,2 s. Es lo menos comprimido y lo menos
pesado que existe de ese vídeo: cualquier recodificado le quita calidad, y
pasar HEVC a H.264 además lo engorda.

Hasta el 12 oct el HEVC se convertía a H.264 por si algún móvil no lo abría, y
eso era lo que hacía eterno un `!tt` largo. Medido en un núcleo:

| vídeo | convertir | el fichero | parecido al original |
|---|---|---|---|
| 30 s | 37 s | 4,2 → 7,6 MB | SSIM 0,990 |
| 90 s | 91 s | 11,2 → 14,0 MB | SSIM 0,986 |
| 1:57 | 115 s | 14,8 → 14,7 MB | SSIM 0,976 |

Con `REDES_HEVC=0` en el `.env` se vuelve a convertir, para un grupo donde
alguien no pueda abrirlos (un móvil muy viejo, WhatsApp Web sin HEVC). AV1 y
VP9 se convierten siempre.

**Lo que no cabe se ajusta; no se cambia por una copia peor.** Si la mejor
copia pasa de 16 MB se baja igual (hasta 40) y se ajusta con techo de bitrate.
Mandar el `play` de 576 cuando el `hdplay` se pasa es lo que el dueño ya
rechazó cuando notó que los vídeos «habían bajado de calidad» (capa 84). Si
ese techo baja de 1.500 kb/s (más o menos a partir del minuto y cuarto), se
ajusta a 720: medido contra el original, a esos bits el 1080 no se ve mejor
(SSIM 0,976 contra 0,979 el de 1:57), pesa 2 MB más y tarda 40 s más. yt-dlp
igual: el mejor formato, hasta 40 MB, y se ajusta después.

**Y quien espera lo ve.** Los comandos de herramientas renuevan el
«escribiendo…» mientras trabajan y, si pasan de 6 s, ponen un aviso
«⏳ Bajando el vídeo de TikTok… Lleva 12 s» que se edita con la fase y se
borra al acabar (`utils/progreso.js`, el texto en la fila de `comandos.js`).

**Y lo que se manda como vídeo tiene que tener vídeo.** Pasó en el grupo:
WhatsApp contestó *«something is wrong with the video file»*. Lo que le había
llegado era un MP3 de 210 KB con nombre `.mp4`. Una publicación de **fotos** de
TikTok tiene enlace de vídeo igual, pero detrás está la canción.

Se coló por dos agujeros a la vez: el último candidato se aceptaba sin mirar, y
un sondeo que fallaba se daba por bueno. Ahora se comprueba **siempre**, se
distingue «no hay pista de vídeo» de «no pude mirar el fichero», y si ninguno
trae vídeo se dice en el grupo con esas palabras, que es el otro motivo, con el
tamaño, que no se arregla reintentando.

**Y el tope lo pone WhatsApp, no nosotros.** `MAX_BYTES` son 25 MB y viene de
`!play`, donde el límite es el ancho de banda. Aquí manda otra cosa: el cliente
de WhatsApp no acepta vídeo por encima de **16 MB**, así que mandar 20 no es
«un poco grande», es un envío que falla o que a la otra persona le llega roto.
Más allá de ese número no sirve de nada, así que se corta ahí y se dice en el
grupo: es el único motivo de fallo que no se arregla reintentando, y quien pegó
el enlace merece saberlo.

Y al proveedor de TikTok hay que **pedirle** el HD, con `&hd=1` al final de
`TIKTOK_API`.

**Y pedir un vídeo no puede costarte el grupo.** `!tt <enlace>` es, para el
antilink, un mensaje con un enlace: lo borraba, contaba aviso y al tercero
baneaba, por usar un comando del propio bot que encima cobra. Ahora está
exento, pero de forma **estrecha**: tiene que ser un comando de redes, el
enlace tiene que ser de su plataforma, y no puede venir ningún otro enlace
detrás. Así `!tt chat.whatsapp.com/…` sigue cayendo, que es exactamente el
atajo que alguien probaría. La capa 50 comprueba los cuatro casos, y dos de
ellos tienen que seguir cayendo.

---

## Multimedia

Stickers, `!play` y `!toimg`. Sin frases: no es terreno de contenido. Una cosa del motor que conviene saber: todo lo que llama a ffmpeg
pasa por un semáforo compartido, y sus plazas salen del número de cores de la
máquina. En la VPS, que tiene un core, es UNA. Dos ffmpeg en un core no van en paralelo,
se reparten el mismo core, así que con dos plazas el primero que pide un
sticker esperaba más del doble (2253 ms frente a 1026 ms, medido con dos a la
vez). Con cuatro cores la máquina sí puede con dos y las coge.
