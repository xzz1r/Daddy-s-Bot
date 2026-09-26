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

---

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

Pide **un** código y borra el fichero. Si nadie lo teclea, el siguiente arranque
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
cuatro finales y se distinguen entre sí:

| final | qué fue |
|---|---|
| `SIGTERM` con la RAM cerca del techo | lo mató pm2 por memoria |
| `SIGTERM` con la RAM baja | un despliegue o un `pm2 restart` |
| excepción sin capturar | un fallo de verdad, con su línea |
| sesión cerrada desde el teléfono | hay que volver a vincular |

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

Y cuando una acción tarda, el log ya dice **dónde**: `traer 15105 [web 400,
bajar 260, ffmpeg 14400]`. Los tres pasos son tres problemas distintos con
arreglos distintos, y un solo número no se puede arreglar.

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
El motivo es de economía, no de CPU: medida la curva de ingresos, el que
escribe mil mensajes al día cobra 366 y el normal 49, así que con precio fijo
el freno apretaba a quien no molestaba. Se cuenta lo que se **usa**, no lo que
se intenta, y un comando devuelto descuenta su uso. Y se dice en el menú y en
el mensaje de «no te llega»: un precio que sube sin avisar se lee como un
fallo del bot.

---

## Redes: `!tt`, `!ig`, `!pin`

El vídeo que alguien pega, sin marca de
agua. Tres comandos y no uno, por decisión del dueño: son tres plataformas y
se piden distinto. Lo que comparten (cobrar, bajar, mandar, borrar y devolver
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
tres), y si no, `yt-dlp`. Si la API falla se cae a `yt-dlp` sin ruido.

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

Se pide siempre el mejor, pero el HD viene en **HEVC**, y eso no es
intercambiable: WhatsApp reproduce H.264 en todas partes y el HEVC se le
atraganta según el teléfono. Un vídeo de 1080 que a media docena del grupo no
se les abre es peor que uno de 576 que ve todo el mundo. Así que se mira qué
llegó y, si es HEVC, se coge el siguiente. Recodificar no es opción: pasar
1080x1920 a H.264 en un core son decenas de segundos con alguien esperando.

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

Es decisión del dueño, no del código: con `REDES_HEVC=1` en el `.env` se manda
el mejor y punto. Y al proveedor de TikTok hay que **pedirle** el HD, con
`&hd=1` al final de `TIKTOK_API`.

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
