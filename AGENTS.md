# Daddy's Bot — instrucciones para Grok (terminal)

Bot de WhatsApp. El contenido vive en `src/data/` (y los pools de `!aura`
en `src/commands/aura.js`). El motor en `src/commands/` y `src/utils/`.
Cómo se escribe una frase: `GUIA.md`. Cómo se valida: `npm run check`.

## La puerta también corre en GitHub

`.github/workflows/check.yml` corre `npm run check` en cada push a `main`, en
un clon limpio: sin `data/`, sin `.env`, sin la despensa. Si una capa solo pasa
con el estado de la VPS, ahí sale en rojo, y eso es un fallo de la capa.

**Antes de cada push: `npm run ci`.** Prueba lo commiteado en un clon limpio,
igual que GitHub. `npm run check` en tu copia no basta: tiene `data/` y
herramientas que GitHub no tiene. Cada run rojo es un correo al dueño; si
`npm run ci` no sale verde, no se empuja.

## Añadir un comando o un alias

Dos sitios, y la puerta exige los dos:

1. El `case` en el `switch` de `src/handlers/messageHandler.js` (el cuerpo).
2. Su fila en `src/handlers/comandos.js`: la familia con todos sus alias y sus
   propiedades (metadata, «escribiendo…», precio, cobra dentro, economía).

Un alias nuevo se añade a la fila de su comando y hereda todo. No hay listas
sueltas que tocar: salen del registro. La capa 4b falla si un alias está en un
sitio y no en el otro.

## Una persona, una historia

La misma persona llega unas veces con su @lid y otras con su teléfono, y el
bot aprende que son la misma cuando WhatsApp manda el par. Todo lo que se
guarde por persona se junta con `src/utils/persona.js`: `juntarPersona` para
los almacenes en disco, `juntarEnMapa` para los Map en memoria. Cada almacén
solo dice cómo se juntan SUS valores (el saldo resta el arranque, la caja
suma, una caducidad se queda con la más lejana). La capa 111 pasa cada almacén
por «apunta con el @lid, aprende el teléfono, lee» y falla si alguien se hace
su propia copia.

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
   silencio, con un veredicto que sale de esos datos. Los ships no salen:
   `!ship` no guarda nada y no se inventa. Del dueño, silencio (capa 103).
2. **Memoria de rencor — HECHO.** `!mog`, `!duel`, `!robo` y `!ship` se
   acuerdan del cruce anterior entre esas dos personas y lo citan una vez al
   día (utils/rencor.js). Solo texto, nada del tier dueño (capa 109).
3. **Testamento al echar.** El aviso de kick ahora es plantilla. Debería
   leer el expediente: mensajes, aura, a quién shippeaba.
4. **`!cartel @user`.** pfp + recompensa en aura + último delito. Ya hay
   indexer, phash y la estética Rockstar de la tienda.
5. **`!circulo`.** Grafo de quién responde a quién. «Le hablas a tres y
   los tres te dejan en visto» duele más que mil analogías.

No las implementes de rebote. Si el dueño elige otra, esa y bien.
