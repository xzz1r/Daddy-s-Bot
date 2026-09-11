# Daddy's Bot — instrucciones para Grok (terminal)

Bot de WhatsApp. El contenido vive en `src/data/` (y los pools de `!aura`
en `src/commands/aura.js`). El motor en `src/commands/` y `src/utils/`.
Cómo se escribe una frase: `GUIA.md`. Cómo se valida: `npm run check`.

## Lo último que pidió el dueño (11 sep): proveedor para `!ig` y `!pin`

`!tt`, `!ig` y `!pin` bajan el vídeo que alguien pega, sin marca de agua.
TikTok ya funciona con un servicio de terceros verificado. Instagram y
Pinterest no: desde la VPS las dos bloquean a la IP del servidor, así que
también necesitan un tercero, y hay que encontrarlo y probarlo.

- Brief: [`PENDIENTE-REDES.md`](PENDIENTE-REDES.md)
- Motor: `src/utils/redes.js` · comandos: `src/commands/redes.js`
- Si el servicio encaja en el contrato que ya hay, no se toca código.
- **No despliegues.** El visto bueno lo da el dueño.

## Lo anterior, que sigue abierto

Hay **225 frases** marcadas con `// ANALOGÍA`. El dueño: analogías baratas
fuera, ataques directos y con coherencia.

**Dónde (lo dijo él, no se adivina):**

- `!aura gana` / `!aura pierde` — `AURA.gain` y `AURA.loss` en
  `src/commands/aura.js`. El chiste es un nokia, un brick de leche, un
  calcetín, una planta de IKEA. No la persona.
- Cooldown de `!aura` — `AURA_TIRADA` en `src/data/cooldownPhrases.js`.
  Cubilete, galleta de la suerte, filete, bola ocho.
- Comando mal escrito — `MAL_ESCRITO` en `src/data/avisos.js`.
- Roast de quien usa acciones — tres líneas en `ROAST_USUARIO`
  (`src/data/accionPhrases.js`). El resto de ese pool ya está bien.

**No está** en `!fiel` / `!infiel`. Eso es dinámica. No se toca.

- Brief: [`PENDIENTE.md`](PENDIENTE.md)
- `grep -n "ANALOGÍA" src/commands/aura.js src/data/cooldownPhrases.js src/data/avisos.js src/data/accionPhrases.js`
- Reescribe la línea, quita la marca. Los cinco ejemplos `intocables` del
  dueño al inicio de `blessed` / `loss` / `cursed` no se tocan.
- Acabado = `npm run analogias` exit 0 y `npm run check` verde.

Si el usuario pide otra cosa y todavía quedan marcas, avísale — salvo lo
de redes de arriba, que lo pidió él después y va por delante.

## Ideas (no implementar mientras queden analogías)

El dueño pidió ideas molonas. Estas usan datos que el bot **ya tiene** y hoy
no junta.

1. **`!caso @user` — el expediente.** Actividad, aura, robos, ships, días
   en silencio. Un parte de conducta, no otra tirada random.
2. **Memoria de rencor.** Si el martes te moggeó y hoy vuelves a pedirlo,
   el bot lo cita. El grupo genera mitología solo.
3. **Testamento al echar.** El aviso de kick ahora es plantilla. Debería
   leer el expediente: mensajes, aura, a quién shippeaba.
4. **`!cartel @user`.** pfp + recompensa en aura + último delito. Ya hay
   indexer, phash y la estética Rockstar de la tienda.
5. **`!circulo`.** Grafo de quién responde a quién. «Le hablas a tres y
   los tres te dejan en visto» duele más que mil analogías.

No las implementes de rebote. Si el dueño elige una, esa y bien.
