# Daddy's Bot — instrucciones para Grok (terminal)

Bot de WhatsApp. El contenido vive en `src/data/`, más los pools que aún
guardan dentro algunos comandos (la lista está en `GUIA.md`, sección 2). El
motor en `src/commands/` y `src/utils/`. Cómo se escribe una frase: `GUIA.md`.
Cómo se valida: `npm run check`. Lo del motor que no cambia cómo se escribe
(despliegue, guardián, redes): `MOTOR.md`.

## La puerta también corre en GitHub

`.github/workflows/check.yml` corre `npm run check` en cada push a `main`, en
un clon limpio: sin `data/`, sin `.env`, sin la despensa. Si una capa solo pasa
con el estado de la VPS, ahí sale en rojo, y eso es un fallo de la capa.

**Antes de cada push: `npm run ci`.** Prueba lo commiteado en un clon limpio,
igual que GitHub. `npm run check` en tu copia no basta: tiene `data/` y
herramientas que GitHub no tiene. Cada run rojo es un correo al dueño; si
`npm run ci` no sale verde, no se empuja.

## Añadir un comando o un alias

Un sitio: su fila en `src/handlers/comandos.js`. Lleva todos sus alias, sus
propiedades (metadata, «escribiendo…», precio, cobra dentro, economía) y
`hace`, lo que ejecuta: `(c) => c.de('modulo').cmdX(c.sock, c.msg, c.args, c.meta)`.
Ya no hay `switch`.

Un alias nuevo es un nombre más en la fila de su comando y hereda todo. Si una
fila no tiene `hace` o un nombre está en dos filas, el bot no arranca. La capa
4b ejecuta cada fila y falla si llega a una función que no existe o si no
devuelve lo que devuelve el comando (el reembolso depende de eso). Las acciones
no van aquí: se añaden en `src/commands/acciones.js` y entran solas.

## Una persona, una historia

La misma persona llega unas veces con su @lid y otras con su teléfono, y el
bot aprende que son la misma cuando WhatsApp manda el par. Todo lo que se
guarde por persona se junta con `src/utils/persona.js`: `juntarPersona` para
los almacenes en disco, `juntarEnMapa` para los Map en memoria. Cada almacén
solo dice cómo se juntan SUS valores (el saldo resta el arranque, la caja
suma, una caducidad se queda con la más lejana). La capa 111 pasa cada almacén
por «apunta con el @lid, aprende el teléfono, lee» y falla si alguien se hace
su propia copia.

## El aura es una sola, en todos los grupos

Lo pidió el dueño (11 oct). El saldo y la caja de cada persona son los mismos
en cualquier grupo: viven en la bolsa `__todos` de `src/utils/auraStore.js`, y
las funciones reciben el grupo pero no lo usan para elegir monedero. Las
esperas que frenan el monedero (tirada, apuesta, robo, escudo, butrón) van con
la llave `BOLSA`, no con la del grupo. El `!top` de un grupo es la bolsa
filtrada por sus miembros (`soloMiembros(…, true)`). La capa 12g lo vigila.

`!resetaura` es de todos los grupos y se lleva **toda la economía**, no solo
los saldos: banco, tienda (objetos, caja, vetos), bote, buscados y sus
recompensas, tiradas del día, diana, esperas y duelos pendientes. La lista
entera vive en `src/utils/reinicioEconomia.js`: un almacén o un reloj nuevo
del aura se apunta ahí, o el reset lo deja vivo. La capa 12i lo comprueba.

## El banco cobra al meter y al sacar

Lo pidió el dueño (21 oct): «la peña sigue abusando». Guardar cuesta un 10 %,
sacar un 30 % y pagar con lo guardado lo mismo que sacar, y todo va al bote.
Las cifras viven en `CAJA` (`src/utils/economia.js`); `impuestoPago` sale de
`comision` para que pagar desde el banco no sea la salida barata. `!saldo`,
`!aura @alguien` y `!caso` enseñan lo que hay en el banco, `!caso` en su línea
aunque esté a cero. La capa 134 no deja bajar las comisiones.

## Frases de porcentaje y de !rizz: 25 · 10 · 10

Lo fijó el dueño: 25 frases en el tramo de la paliza y 10 en cada uno de los
otros dos, quedándose con las mejores. Los tramos: low hasta 30, mid de 31 a
64 y high desde 65 (lo bajó de 70 el 18 oct); viven en `TRAMO_ALTO` y
`TRAMO_BAJO`, y `!rizz` usa los mismos (`tramoDe`). No se añaden frases: una nueva entra
sacando otra. La regla vive en `src/commands/percent.js` (`TAMANO_TRAMO`,
`tramoPrincipal`) y la capa 120 no deja pasar otro tamaño. Salen en baraja.

## Vídeos de redes: tal cual

Lo pidió el dueño (12 oct): lo menos comprimidos y lo menos pesados posible, y
que un `!tt` largo no tarde minutos. Lo que cabe en 16 MB va **sin
recodificar**, también el HEVC (solo se le cambia la caja a `hvc1`); con
`REDES_HEVC=0` se vuelve a convertir. Lo que no cabe se ajusta y nunca se
cambia por una copia peor (capa 84). Las herramientas lentas avisan con
`espera` en su fila (`utils/progreso.js`). Capas 96 y 124.

## Spam de texto: aviso 1 de 2 y ban

Lo pidió el dueño (17 oct): 5 mensajes iguales del mismo número en menos de 10
segundos cierran el grupo con un *Aviso 1 de 2*; a la segunda, ban. Eran más de
10 y no saltaba nunca (18 oct).
Los admins no se libran (18 oct): a la segunda se les quita el admin en vez del
ban. Solo se libra el tier dueño. El aviso caduca a las 12 horas y el grupo se
abre solo a los 20 segundos, si nadie lo ha abierto antes (18 oct).

«Iguales» son las mismas letras y números (18 oct): un emoji, un signo, una
tilde o un invisible ya no hacen distinto un copy. Los números sí cuentan, que
una mención es un número. Y es **individual** (dueño, 18 oct): varias personas
pegando el mismo copy una vez cada una no saltan. Hubo una regla de «cadena»
para eso y el dueño la quitó: no se vuelve a poner. Los números, el margen y
el orden (cerrar antes de avisar, echar antes de anunciar) viven en
`src/utils/spamTexto.js` y en `castigarSpamTexto`. Las frases están en
`src/data/spamPhrases.js`. La capa 125 lo vigila. Ver `MOTOR.md`.

## El anti-empresa echa empresas, no la app

Lo pidió el dueño (22 oct): «hay veces que también expulsa cuentas que no lo
son». Usar la app WhatsApp Business no es ser una empresa: mucha gente la usa
de WhatsApp normal con la categoría «No es una empresa». Decide el perfil
(`src/utils/businessCheck.js`): categoría de verdad, dirección, horario, y
correo o web si no ha dicho que no es una empresa. Ni el nombre verificado de
sus mensajes ni la descripción echan a nadie. Lo comprobado vale 30 días, y
un veto viejo del anti-empresa se revisa al volver a entrar. Cuánto acierta
lo mide el propio bot: `!antiempresa precision`. Capas 9 y 137. Ver `MOTOR.md`.

## La peña activa se halaga, sin veneno

Lo pidió el dueño (18 oct): a quien escribe, el bot lo halaga por su actividad,
con carisma y sin ser un lameculos, y sin tirarle mierda ni directa ni de
rebote. Rachas (HITO y ROTA), bonos por escribir (`utils/casino.js`), tramo
alto de `!relevancia`, duelos ajustados de `!vs`, pilar de `!caso` y podio de
`!count`. La inactividad se sigue atacando como siempre. Ver `GUIA.md` («A
quién pega el bot») y la capa 126.

## Dibujos en las acciones: lo que se pide, y nunca en las explícitas

Lo pidió el dueño (18 oct): «asegúrate de que sí sea lo que se pide, y si son
NSFW aún más». Con `KLIPY_API_KEY`, un tercio de los gifs de 14 acciones sale
de dibujos (KLIPY; Tenor cerró en junio de 2026). Solo vale un gif cuyo título o
etiquetas digan la acción y la serie; si no, anime. Las acciones que van de
piel (`!kiss`, `!lick`, `!cuddle`, `!bite`…) y las explícitas no llevan dibujos
nunca, ni por la despensa: son series infantiles. No se añade una acción a
`DIBUJOS` sin mirar sus frases. Ver `MOTOR.md` y la capa 128.

## La RAM: lo justo, sin tocar la calidad

Lo pidió el dueño (18 oct). La generación joven de V8, un solo hilo de fondo y
dos arenas de malloc van en `ecosystem.config.js`. El bot no baja de 16 MB de
generación joven: más bajo, el único core lo paga. Los gifs de la despensa de
acciones viven en disco, y en memoria solo queda su miniatura: no se vuelven a
cargar enteros en RAM. Capas 127 y 43. Ver `MOTOR.md`.

## Apelativos de dominancia: se quedan

«…, pequeña.», «…, mi niña.», «…, princesa.» y el resto al final de las
frases los quiere el dueño. Se borraron todos el 8 oct y pidió recuperarlos a
la mitad (10 oct). No se quitan ni se añaden más. Al tier dueño no le llegan:
`src/utils/vocativo.js` los quita por el camino. La capa 12d lo vigila.

## Analogías: CERRADO

El encargo de las analogías baratas está terminado: `npm run analogias` da
cero. No hay que reescribir nada de eso. Si aparece una frase nueva con un
objeto en vez de la persona, es una regresión, no trabajo pendiente.

Regla de `!aura` al ganar (la fijó el dueño, ver GUIA.md): ganar no necesita
chiste; si lo lleva, va sobre su economía — pobre (< 1.500) muerto de hambre,
rico (≥ 1.500) rico en un bot de WhatsApp. Pools `gainPobre` / `gainRico`.

## Ideas

El dueño pidió ideas molonas. Estas usan datos que el bot **ya tiene** y hoy
no junta.

1. **`!caso @user` — HECHO.** Mensajes, aura y caja, robos de la semana,
   precio en la cabeza, veto de la tienda, objetivo del día y días en
   silencio, con un veredicto que sale de esos datos. Los ships no salen en
   el expediente. Del dueño, silencio (capa 103).
2. **Memoria de rencor — HECHO.** `!mog`, `!duel`, `!robo` y `!ship` se
   acuerdan del cruce anterior entre esas dos personas y lo citan una vez al
   día (utils/rencor.js). Guarda 60 días, también los ships. Solo texto, nada
   del tier dueño (capa 109).
3. **Testamento al echar — ELEGIDA POR EL DUEÑO, PENDIENTE.** Lo que hay que
   hacer:
   - **Cuándo:** solo en un `!kick` a una persona. Si echan a varios, el
     aviso sigue como está.
   - **El mensaje:** la frase de kick tal cual, con su @. Debajo, una sola
     línea en cursiva, sin @ y con el nombre corto (`nombresCortos`). Nada
     más.
   - **Los datos**, leídos antes de echar, porque el aviso sale antes del
     kick: mensajes (`getUserCount`), aura y caja (`getAura`, `verCaja`) y a
     quién shippeaba (su último `!ship` en la memoria de rencor).
   - **Lo que falta:** `rencorStore` no sabe buscar los ships de una persona.
     Hace falta una función de lectura que los encuentre venga con su @lid o
     con su teléfono (`utils/persona.js`). Sin ship, no se menciona.
   - **El remate** sale de los datos (nunca escribió, rico o pobre con el
     corte de 1.500 de `!aura`, ladrón). Pool nuevo en `kickPhrases.js`,
     hablando a la persona, sin dar por hecho su género, de 90 caracteres
     como mucho y sin apelativos nuevos.
   - **No se cambia `avisoDeKick`:** las capas de kick lo llaman tal cual. El
     testamento va en una función aparte que `cmdKick` añade al mensaje. Si
     leer los datos falla o tarda, el aviso sale solo: el kick no espera.
   - **Una capa nueva**, en sandbox: con una persona sale la línea y con
     varias no, la frase llega intacta, la línea no lleva @, sin ship no sale
     ningún nombre, y en el clon limpio de GitHub, con todo a cero, la línea
     sigue teniendo sentido.
   - **Antes de empujar:** `npm run frases` no sube del techo, `npm run
     analogias` da 0 y `npm run ci` sale en verde.
4. **`!cartel @user` — DESCARTADA** por el dueño.
5. **`!circulo` — DESCARTADA** por el dueño.

No implementes nada de aquí que no esté elegido. Si el dueño elige otra, esa y
bien.
