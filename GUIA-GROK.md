# Guía del bot para escribir contenido

Esto explica cómo funciona Daddy's Bot por dentro, con el detalle necesario para
escribir frases que encajen en el motor sin romperlo. No hace falta saber
programar: hace falta entender **dónde cae cada frase y por qué**.

Reparto de trabajo: **Grok escribe el contenido** (las frases). **Claude mantiene
el motor** (lógica, economía, rendimiento, guardarraíles). El punto de contacto
entre los dos es el formato de los pools y el validador `npm run placeholders`.

---

## 1. Qué es el bot

Bot de WhatsApp en Node.js (librería Baileys) que vive en un grupo privado. Se
invoca con el prefijo `!` — `!fea`, `!aura`, `!ship`. Responde citando el mensaje
y mencionando al objetivo.

El registro es **humor negro, crudo y sin consuelo**. No es un bot amable que
insulta de vez en cuando: el insulto es el producto. Eso importa técnicamente,
no solo estéticamente, y en la sección 5 se ve por qué.

Hay tres roles y el bot los trata distinto:

| Rol | Quién es |
|---|---|
| **owner principal** | El dueño (`OWNER_NUMBER`). Tiene amaño en su favor. |
| **co-owners / admins** | Privilegios, y un sesgo leve en las tiradas. |
| **miembro** | Todos los demás. El caso mayoritario. |

---

## 2. Arquitectura: el viaje de un mensaje

```
index.js                 arranca el proceso
   └─ src/bot.js         conexión con WhatsApp, reconexión, sesión
        └─ src/handlers/messageHandler.js
                         switch gigante: reparte cada !comando
             ├─ src/commands/*.js      lógica de cada comando
             ├─ src/data/*.js          POOLS DE FRASES (aquí escribe Grok)
             └─ src/utils/*.js         motor compartido: helpers, stores, economía
```

Lo único que hace falta retener: **`src/commands/` es lógica, `src/data/` es
contenido.** Hoy la separación está a medias — `percent.js` mezcla las dos cosas
en 6.000 líneas — y terminarla es tarea de Claude.

---

## 3. El sistema de % (lo esencial)

Veintiún comandos funcionan con el mismo motor: `!incel`, `!linda`, `!fea`,
`!sexy`, `!crack`, `!feminidad`, `!masculinidad`, `!gay`, `!simp`, `!rata`,
`!maricon`, `!friki`, `!cerdo`, `!femboy`, `!inutil`, `!perdedor`, `!ganador`,
`!puta`, `!guarra`, `!fiel`, `!infiel`.

Todos siguen exactamente tres pasos:

```
  1. TIRADA    →   sale un número 0-100
  2. TRAMO     →   el número decide qué pool se usa
  3. FRASE     →   se saca una frase de ese pool
```

### 3.1 — Los tramos

```
  ≥ 70          →  high
  31 – 69       →  mid
  ≤ 30          →  low
```

Fronteras cerradas: 70 es `high`, 30 es `low`. No hay huecos.

### 3.2 — La polaridad: `goodIsHigh` ← LO MÁS IMPORTANTE

Cada comando declara si sacar **alto** es bueno o malo. Esto decide si una frase
es un halago o una paliza, y **es el error número uno al escribir contenido**.

```js
goodIsHigh: false   // !fea, !incel, !rata, !inutil...
                    // ALTO = brutal   ·   BAJO = halago

goodIsHigh: true    // !linda, !crack, !sexy, !ganador...
                    // ALTO = halago   ·   BAJO = brutal
```

Leído del código, comando por comando:

| `goodIsHigh: false` (alto = paliza) | `goodIsHigh: true` (alto = halago) |
|---|---|
| incel, fea, gay, simp, rata, maricon, friki, cerdo, femboy, inutil, perdedor, puta, guarra, infiel | linda, sexy, crack, feminidad, masculinidad, ganador, fiel |

Cómo se traduce al escribir:

- `!fea` **high** (90%) → destrucción total. `!fea` **low** (5%) → cumplido real.
- `!linda` **high** (90%) → cumplido real. `!linda` **low** (5%) → destrucción.

Una frase brutal metida en el pool `low` de `!fea` sale como *"eres 5% fea:
[insulto]"*. Es incoherente y se nota al instante. **Antes de escribir un pool,
mira su polaridad.**

### 3.3 — Las tiradas no son aleatorias: están sesgadas por rol

Aquí está el truco del bot. El porcentaje depende del **rol de quien recibe** el
comando, no de quien lo escribe. Probabilidad de caer en cada tramo:

|  | high (≥70) | mid (31-69) | low (≤30) |
|---|---|---|---|
| **Negativo** → miembro | **87 %** | 9 % | 4 % |
| **Negativo** → admin | 86 % | 9 % | 5 % |
| **Positivo** → miembro | 17 % | 31 % | **52 %** |
| **Positivo** → admin | 19 % | 31 % | 50 % |

Traducido: **al grupo le sale mal casi siempre.** Un miembro cualquiera recibe
el tramo brutal en ~87 % de las tiradas negativas, y falla el halago en ~83 % de
las positivas. Eso es intencionado y es el chiste central del bot.

**Consecuencia directa para el contenido:** el tramo brutal es el que la gente
lee constantemente. Los tramos suaves casi no se ven. La calidad y la cantidad
deben ir donde está el tráfico (sección 6).

### 3.4 — El amaño del owner

Al owner principal se le fuerza el resultado a su favor: franja alta en lo
favorable, baja en lo peyorativo. Pero **no es un amaño limpio**, y el motivo
está comentado en el código: salir 97 o 3 siempre no parece suerte, parece
programado, y el grupo lo notó.

Por eso el owner tiene bandas deliberadamente sosas (45-75 en positivos, 25-55
en negativos) y **un 18 % de las veces le sale mal de verdad, como a cualquiera**.
No salir nunca mal es, en sí mismo, el patrón que delata.

`!linda`, `!fea` e `!iq` están fuera del amaño a propósito: son aleatorios puros
para todo el mundo.

Al escribir no hay que hacer nada especial con esto — solo saber que el owner
cae sobre todo en `mid`, así que **los pools `mid` no son relleno**: son lo que
el dueño del bot lee de sí mismo.

### 3.5 — El pool `extreme`

Cinco comandos (`sexy`, `crack`, `feminidad`, `masculinidad`, `ganador`) tienen
un cuarto pool. Se añade como **segundo párrafo** cuando el resultado es un
halago alto (`goodIsHigh: true` y ≥70). Es el remate, no un sustituto.

### 3.6 — El mensaje final

```
*@usuario es 87% fea*

[frase del pool high]

[frase del pool extreme — solo si aplica]
```

La cabecera la genera el motor. **La frase no debe repetir el porcentaje ni el
nombre del rasgo**, porque ya están escritos justo encima.

---

## 4. `!fiel` e `!infiel`: la excepción

Estos dos **no usan las distribuciones de arriba**. Tiran uniforme 0-100: cada
número tiene la misma probabilidad. Solo se aplica el amaño del owner.

Sus frases viven ya separadas, en `src/data/fidelityPhrases.js`, y son el modelo
a seguir para todo lo demás.

---

## 5. Cómo se elige la frase dentro del pool

Dos mecanismos que conviene conocer porque **cambian lo que conviene escribir**.

### 5.1 — Las frases se ordenan solas por dureza

Al arrancar el bot, cada pool se ordena de más duro a más suave. La dureza se
calcula automáticamente contando palabrotas del arsenal:

> puto/puta · mierda · joder · coño · polla · cabrón · gilipollas · pringado ·
> fracasado · inútil · patético · basura · parásito · don nadie · muerto de
> hambre · cero a la izquierda · asco · vergüenza · ridículo · escoria · guarro ·
> cutre · miseria · desperdicio

Fórmula: `nº de palabrotas × 10 + longitud/40 (máx 4)`.

Luego, al elegir, **la cabeza del pool tiene 8 veces más probabilidad que la
cola**. El bot abre siempre con lo más fuerte que tiene.

Qué implica para escribir:

- Una frase cruel pero **sin palabrotas del listado** puntúa bajo y **se hunde al
  final del pool**. Se escribirá y casi no saldrá. Si una frase debe pegar
  fuerte, tiene que llevar el vocabulario crudo.
- A igualdad de palabrotas, **la frase larga gana** (desarrolla el insulto entero).
- No hace falta meter palabrotas a martillazos en frases que funcionan por
  ingenio seco. Solo hay que saber que saldrán menos.

*(Nota técnica menor: el comentario del código dice que la cabeza tiene ~4x más
probabilidad; el cálculo real da 8:1. El comentario está desactualizado, el
código está bien.)*

### 5.2 — Ventana anti-repetición: **por qué el tamaño del pool importa tanto**

Una frase no se repite hasta que han salido **otras 50** del mismo pool, en el
mismo grupo y el mismo tramo. Suena bien, pero tiene un efecto brutal en pools
pequeños:

```
pool de 300 frases  →  50 bloqueadas  →  250 disponibles   ✅
pool de  57 frases  →  50 bloqueadas  →    7 disponibles   ⚠️
pool de  21 frases  →  20 bloqueadas  →    1 disponible    ❌ ← rotación fija
```

Con 21 frases el bot no elige: **recita en bucle**. Es indistinguible de estar
roto, y es exactamente lo que pasa hoy en dos comandos.

---

## 6. Dónde falta contenido — prioridad real

Cruzando *cuánta gente cae en cada tramo* (3.3) con *cuántas frases hay*, salen
los cuellos de botella. Ordenados por urgencia:

| Comando | Tramo | % de tiradas | Frases | Disponibles | Estado |
|---|---|---|---|---|---|
| `!gay` | high | **87 %** | 21 | **1** | 🔴 rotación fija |
| `!femboy` | high | **87 %** | 21 | **1** | 🔴 rotación fija |
| `!feminidad` | low | **52 %** | 50 | **1** | 🔴 rotación fija |
| `!ganador` | low | **52 %** | 50 | **1** | 🔴 rotación fija |
| `!masculinidad` | low | **52 %** | 52 | 2 | 🔴 casi fija |
| `!linda` | mid | 31 % | 51 | 1 | 🟠 |
| `!feminidad` | mid | 31 % | 45 | 1 | 🟠 |
| `!masculinidad` | mid | 31 % | 50 | 1 | 🟠 |
| `!ganador` | mid | 31 % | 50 | 1 | 🟠 |

**`!gay` y `!femboy` son la prioridad absoluta**: tienen 21 frases en el tramo
que sale el 87 % de las veces, mientras comandos hermanos como `!simp` o `!rata`
tienen 210 en esa misma posición. Son los dos comandos que hoy suenan a bot roto.

El patrón sano del repo es: **~200 frases en el tramo que más sale, ~50 en los
otros dos.** Ese es el objetivo a igualar.

Cuidado con la trampa de simetría: en los comandos **positivos** el tramo que más
sale es `low` (52 %), no `high`. Hoy están escritos al revés — `!ganador` tiene
200 frases en `high` (que sale el 17 % de las veces) y 50 en `low` (que sale el
52 %). Por eso aparecen tantos positivos en la tabla.

---

## 7. Formato exacto del código

Un pool es una lista de textos entre comillas simples, una por línea, cada una
terminada en coma:

```js
const NOMBRE_DEL_POOL = [
  'Primera frase entera en una sola línea, terminada en coma.',
  'Segunda frase. Mínimo 25 caracteres o el validador no la cuenta.',
];
```

Reglas de formato, todas obligatorias:

1. **Una frase = una línea.** Sin saltos de línea dentro de la frase.
2. **Comillas simples** `'...'`. Es el estilo de todo el repo.
3. **Coma al final de cada línea**, incluida la última.
4. Si la frase lleva un apóstrofo, se escapa: `'no vales una \'mierda\''`, o se
   usan comillas dobles para esa línea.
5. **Nunca acentos ni eñes rotos.** El fichero es UTF-8.
6. Mínimo ~25 caracteres: por debajo, el validador no la reconoce como frase.

Un fichero de datos completo termina exportando sus pools:

```js
module.exports = { POOL_A, POOL_B };
```

---

## 8. Placeholders: el contrato

Un placeholder es un hueco que el motor rellena. **Cada fichero tiene permitido
un juego concreto y solo ese.** Usar otro no da error al arrancar: sale
literalmente escrito en el grupo.

Ya pasó — `!maricon` se escribió con `%N` mientras `percent.js` sustituye
`[nombre]`, y durante 292 frases el grupo leyó *"%N sale con un cero..."*. Por
eso existe el validador.

| Dónde escribes | Placeholders permitidos |
|---|---|
| `percent.js`, `fidelityPhrases.js` | `[nombre]` |
| `roast.js`, `relevance.js`, `wingman.js` | `%N` nombre, `%C` contexto |
| `robo.js`, `roboExtraPhrases.js` | `%A` autor, `%V` víctima, `%C` cantidad, `%N` nombre |
| `apuestaPhrases.js` (aura) | `%A` apostador, `%C` cantidad, `%S` saldo final |
| `rachaPhrases.js` | `%N` nombre, `%D` días de racha, `%P` días perdidos |
| `activity.js`, `duel.js` | `%W` ganador, `%L` perdedor |
| `mog.js` | `%M` / `%L` |
| `topsRandom.js` | `{N}` |
| `ship.js`, `iq.js`, `social.js`, `aura.js` | **ninguno** |

`[nombre]` es **opcional** en `percent.js`: si la frase no lo lleva, no pasa
nada. Mézclalo — que todas las frases empiecen con el nombre canta.

---

## 9. Cuántas frases escribir

Depende de cuántas veces se dispara el comando, no de la importancia que parezca
tener:

| Tipo de comando | Frases por pool | Por qué |
|---|---|---|
| Porcentaje, tramo mayoritario | **~200** | Se dispara decenas de veces al día |
| Porcentaje, tramos minoritarios | **~50** | Se ven poco |
| Apuestas de aura (cooldown 3 h) | **~60** | Máximo 8 al día; con 60 nadie repite en semanas |
| Hitos de racha | **~50** | Solo salen al cruzar un hito |

Escribir 300 frases para un comando con cooldown de tres horas es trabajo tirado.
Escribir 21 para uno que sale el 87 % de las veces es un bot roto.

---

## 10. Antes de entregar

```bash
npm run placeholders
```

Recorre las 10.338 frases del repo y revienta si alguna usa un placeholder que
su consumidor no sustituye. **Tiene que salir verde**: termina diciendo *"Todos
los placeholders están enchufados a algo que los sustituye"*.

Checklist:

- [ ] ¿La polaridad es la correcta? (`goodIsHigh` — sección 3.2)
- [ ] ¿El tramo coincide con el tono? (high de un negativo = brutal)
- [ ] ¿Los placeholders son los permitidos para ese fichero? (sección 8)
- [ ] ¿Una frase por línea, comillas simples, coma final?
- [ ] ¿La frase evita repetir el % y el nombre del rasgo? (ya van en la cabecera)
- [ ] ¿Suficientes frases para el tráfico de ese tramo? (sección 9)
- [ ] `npm run placeholders` en verde

---

## 11. Otros sistemas, en breve

- **Aura** (`!aura`): economía con saldo, apuestas (cooldown 3 h), robos y
  rachas diarias. El estado se guarda en disco con escritura atómica. Tono de
  las apuestas: crónica de sucesos, no roast — ganar suena a hazaña, perder a
  velatorio con sorna. El bot no consuela.
- **Robo** (`!robo`): el pool más grande fuera de `percent.js` (1.148 frases).
- **Racha**: solo habla en hitos (7, 15, 30, 50, 100, 200, 365 días) y al romper
  una racha larga. El resto de días paga en silencio, a propósito.
- **Multimedia**: stickers, `!play`, `!toimg`. Sin frases; no es terreno de Grok.
