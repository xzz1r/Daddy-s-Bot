# PENDIENTE — proveedor de terceros para `!ig` y `!pin` (Grok terminal)

Encargo del dueño, 11 sep 2026. **No está hecho.** TikTok ya funciona;
faltan Instagram y Pinterest.

**No despliegues.** El visto bueno lo da el dueño: tú dejas el código y la
verificación hechos.

## El encargo, en una línea

Encontrar un servicio de terceros que saque el reel de Instagram y el pin de
Pinterest, verificarlo de verdad, y dejarlo documentado.

## Por qué hace falta un tercero, y no es opinión

Medido el 11 de septiembre desde la VPS, con `yt-dlp 2026.08.19`, o sea con
la herramienta al día y bien encontrada:

| plataforma | qué contesta |
|---|---|
| TikTok | `Unexpected response from webpage request` |
| Instagram | `Instagram sent an empty media response` — pide sesión iniciada |
| Pinterest | `pin.it` acaba en la portada → `Unsupported URL` |

Las tres bloquean a una IP de datacenter, que es lo que es la VPS. Pedírselo
directamente no es una vía peor: es una vía cerrada. El tercero sirve porque
la descarga la hace **su** máquina, no la nuestra.

Con Pinterest se probó además a seguir el redirección de `pin.it` con
User-Agent de navegador. Acaba igual, en la portada. No insistas por ahí.

## Lo que ya está hecho (no lo rehagas)

`TIKTOK_API=https://www.tikwm.com/api/?url={url}` — verificado bajando un
vídeo real a través del propio extractor del bot: 1149 KB en 4343 ms,
cabecera MP4 correcta. Devuelve el campo `data.play`, que es el **sin marca
de agua** (`data.wmplay` es el marcado; ese no).

Ese servicio es SOLO de TikTok: con un enlace de Instagram contesta
`Url parsing is failed`. No pierdas tiempo probándolo para lo demás.

Limita a **1 petición por segundo**. No es problema: el comando ya tiene
ocho segundos de espera por persona.

## El contrato que el bot ya espera

Está en `porApi()`, en `src/utils/redes.js`. Si el servicio que encuentres
encaja aquí, **no hay que tocar una línea de código**:

- Una petición **GET**.
- La URL del post va donde ponga `{url}`, ya codificada. Si no pones
  `{url}`, se añade sola como `?url=...`.
- Respuesta **JSON**, con el enlace directo en uno de estos campos:
  `url`, `link`, `video`, `download`, `data.play`, `data.url`, `result.url`.
- Instagram tiene que devolver el reel **sin logo superpuesto**; Pinterest,
  la foto o el vídeo del pin.

Si el servicio funciona por **POST**, amplía `porApi()` para admitirlo.
Mantén la forma actual: si la API falla, se apunta en el log y se cae a
yt-dlp sin ruido. Un servicio de terceros que se cae un martes no puede
dejar el comando muerto.

## Cómo se verifica. Los DOS pasos, y el segundo no es opcional

Que un `curl` conteste JSON no significa que el bot pueda usarlo: el campo
puede llamarse de otra forma, el enlace puede caducar en segundos o venir
con marca de agua. El segundo paso lo prueba de verdad, a través del mismo
código que corre en producción.

**1. ¿Contesta algo?**

```bash
curl -sS -m 25 "<endpoint con la url dentro>" | head -c 400
```

**2. ¿Lo puede usar el bot?**

```bash
cd ~/Bot- && cat > /tmp/v.js <<'EOF'
process.env.INSTAGRAM_API = '<tu endpoint con {url}>';
const fs = require('fs-extra');
(async () => {
  const r = await require('./src/utils/redes').traer('<enlace real de un reel>', 'instagram');
  console.log(r.tipo, Math.round(r.bytes / 1024), 'KB');
  console.log('mp4:', (await fs.readFile(r.fichero)).slice(4, 8).toString('latin1') === 'ftyp');
  await fs.remove(r.fichero);
})().catch((e) => console.log('FALLO:', e.message));
EOF
node /tmp/v.js
```

Lo mismo para Pinterest, con `PINTEREST_API` y `'pinterest'`. Ahí lo que
llega puede ser una imagen: entonces `r.tipo` sale `imagen` y la prueba de
la cabecera MP4 no aplica.

Y míralo con los ojos: **abre el fichero que baja**. Un reel con el logo de
la app encima cumple todas las comprobaciones automáticas y no vale.

## Lo que NO se toca

Tres decisiones del envío están medidas y la **capa 50** las vigila
ejecutando. Si las cambias, `npm run check` se pone rojo:

- El vídeo se manda como **ruta** (`{ video: { url: fichero } }`), no como
  Buffer. Baileys abre ahí un `createReadStream`; con un Buffer serían
  hasta 25 MB en el heap del bot por envío, en una máquina de 1 GB.
- `jpegThumbnail` va en **`null`**, no en `undefined`. `undefined` es lo que
  dispara el ffmpeg interno de Baileys al enviar, y ese proceso de más en el
  único core es lo que hacía que subir 13 KB tardara 1699 ms.
- **No pasa por ffmpeg.** TikTok e Instagram ya entregan H.264 en MP4, que
  es lo que WhatsApp reproduce. Reencodar sería lo único caro de esto.

Tampoco toques el cobro ni la devolución: si el vídeo no llega, el aura
vuelve. Ya hay comprobación de eso.

## Cuando termines

- Documenta los endpoints **verificados** en los comentarios de
  `.env.example` y en la sección de redes de `GUIA.md`.
- Deja las variables **vacías** en `.env.example`. Las direcciones reales
  las pone el dueño en su `.env`: el repositorio es público.
- `npm run check` verde.
- Y dile al dueño qué has verificado y con qué enlace, para que lo pueda
  repetir.
