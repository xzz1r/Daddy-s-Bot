# Daddy's Bot — instrucciones para Grok (terminal)

Bot de WhatsApp. El contenido vive en `src/data/`, el motor en `src/commands/`
y `src/utils/`. Cómo se escribe una frase: `GUIA.md`. Cómo se valida:
`npm run check`.

## Pendiente ahora mismo (haz esto primero)

Hay **221 frases** marcadas con `// ANALOGÍA` que hay que reescribir. El dueño
lo pidió así: analogías baratas fuera, ataques directos y con coherencia.

- Brief: [`PENDIENTE.md`](PENDIENTE.md)
- Casi todas en [`src/data/fidelityPhrases.js`](src/data/fidelityPhrases.js)
  (`!fiel` / `!infiel`). Seis en `src/data/percentLabels.js`.
- `grep -n "ANALOGÍA" src/data` las lista. Reescribe la línea, quita la marca.
- **No reescribas el fichero entero.** Solo las marcadas.
- No toques el motor.
- Acabado = `npm run analogias` devuelve 0 pendientes, y `npm run check` pasa.

Si el usuario te pide otra cosa y todavía quedan marcas, avísale y pregunta
si quiere que priorices las analogías.

## Ideas (no implementar mientras queden analogías)

El dueño pidió ideas molonas. Estas usan datos que el bot **ya tiene** y hoy
no junta. No son comandos genéricos.

1. **`!caso @user` — el expediente.** Un dossier con lo que el bot ya mide:
   actividad, aura, robos, ships, roasts recibidos, días en silencio. Un parte
   de conducta, no una tirada random. El grupo vería por primera vez el
   retrato con números, no el insulto suelto.
2. **Memoria de rencor.** Cuando A moggea a B, o el ship de A+C sale fatal, o
   B le roba el aura a A, se guarda. La próxima vez que se cruzan, el bot lo
   cita: «Otra vez. El martes te dejó en 12 y hoy vuelves a pedirlo.» El
   grupo genera mitología solo. Hoy cada comando es amnésico.
3. **Testamento al echar.** `kickPhrases.js` es genérico. El aviso de kick
   debería leer el expediente real: mensajes, aura, último robo, a quién
   shippeaba. Un funeral con datos, no una plantilla.
4. **Cartel de buscados.** Ya hay pfp indexer, phash, facecheck y la estética
   Rockstar de la tienda/bote/vault. Un `!cartel @user` con la foto, la
   recompensa en aura y el último delito. Institución, no comando.
5. **`!circulo`.** Grafo de quién responde a quién. El bot cuenta mensajes
   pero no a quién. El roast con dato («le hablas a tres y los tres te
   dejan en visto») duele más que mil analogías.

No las implementes de rebote. Si el dueño elige una, esa y bien.
