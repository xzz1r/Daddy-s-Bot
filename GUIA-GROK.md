# Guía del bot para escribir contenido

Esto explica cómo funciona Daddy's Bot por dentro, con el detalle necesario para
escribir frases que encajen en el motor sin romperlo. No hace falta saber
programar: hace falta entender **dónde cae cada frase y por qué**.

Reparto de trabajo: **Grok escribe el contenido** (las frases). **Claude mantiene
el motor** (lógica, economía, rendimiento, guardarraíles). El punto de contacto
son los cuatro validadores de la sección 10.

---

## LEE ESTO PRIMERO

**Antes de escribir una sola frase, actualiza:**

```
git pull origin main
```

Si tu rama viene de una base anterior, al empujar devuelves código que ya se
quitó y **el bot deja de cargar**. Ya pasó: una llamada a `ordenarPorDureza`
—función eliminada— volvió con un merge y tumbó `percent.js`, `wingman.js` y
`messageHandler.js` de golpe.

**Tres cosas del motor cambiaron y afectan a cómo escribes:**

| Qué | Antes | Ahora |
|---|---|---|
| Elección de frase | sesgada a la cabeza del pool (8:1) | **plana**: todas igual de probables |
| Orden por dureza | ordenaba al arrancar | **eliminado**, no existe |
| Tamaño de pool | por nombre de tramo | **por tráfico** (sección 9) |

La consecuencia práctica está en la sección 5.1 y es la más importante: **la peor
frase de un pool ahora sale tanto como la mejor.**

**Pendiente de contenido cuando vuelvas:**

- `rata`, `incel`, `simp`, `friki`, `perdedor`, `femboy` — tramo `high`
- **4 duplicados exactos que hay que quitar**: `percent.js` líneas 4050, 4051 y
  4052 repiten la 3853 en `friki.high`; la 6195 repite la 6075 en `guarra.high`

**Nadie ha tocado tus frases.** Los conflictos de la última integración se
resolvieron todos a tu favor.

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

*(Ojo: esto es el amaño de los comandos de porcentaje. La economía de `!aura` es
otra cosa y también cambió — miembro 75 %, admin 82 %, owner 88 %, con techos
propios que no se solapan. No afecta a lo que escribes, pero si tocas frases de
`aura` conviene saber que ahora se gana bastante más de lo que se pierde.)*

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

### 5.1 — La elección es plana. Ya no hay orden

**Esto cambió y es importante.** Antes los pools se ordenaban de más duro a más
suave al arrancar, y la cabeza salía 8 veces más que la cola. El dueño notó que
el bot "seguía un orden en vez de ser random" y tenía razón: medido sobre 3.000
tiradas en un pool de 200, la frase más usada salía 31 veces y la menos usada 2.

Ahora **todas las frases del tramo tienen la misma probabilidad**. Se quitó el
sesgo y también la función que ordenaba, porque ya no la consultaba nadie.

Qué implica para escribir, y es más exigente que antes:

- **La peor frase de un pool sale tanto como la mejor.** Antes una floja se
  hundía al fondo y casi no aparecía; ahora tiene las mismas papeletas. Deja de
  importar el techo del pool y pasa a importar el **suelo**: no puede haber
  relleno.
- El vocabulario crudo **sigue siendo el registro del bot** y `npm run progreso`
  lo mide, pero ya no cambia el orden de salida. Úsalo porque es el tono, no por
  un efecto mecánico.

El arsenal que se mide sigue siendo este:

> puto/puta · mierda · joder · coño · polla · cabrón · gilipollas · pringado ·
> fracasado · inútil · patético · basura · parásito · don nadie · muerto de
> hambre · cero a la izquierda · asco · vergüenza · ridículo · escoria · guarro ·
> cutre · miseria · desperdicio

**Y se puede engañar, así que no lo hagas.** Cuenta palabras, no comprueba que el
español aguante. Pegar `, joder` al final de una frase limpia sube el número y
deja el texto peor. Ya pasó dos veces: la palabrota va integrada en la frase,
nunca añadida detrás.

### 5.2 — Ventana anti-repetición: **por qué el tamaño del pool importa tanto**

Una frase no se repite hasta que han salido **otras 50** del mismo pool, en el
mismo grupo y el mismo tramo. Suena bien, pero tiene un efecto brutal en pools
pequeños:

Se bloquea como mucho el **60 % del pool**, nunca "todo menos una":

```
pool de 300 frases  →  50 bloqueadas  →  250 disponibles   ✅
pool de 100 frases  →  50 bloqueadas  →   50 disponibles   ✅
pool de  50 frases  →  30 bloqueadas  →   20 disponibles   ✅
pool de  21 frases  →  12 bloqueadas  →    9 disponibles   ⚠️ pocas distintas
```

Lo que importa entonces no es la holgura, es **cuántas frases distintas ve el
grupo antes de que empiece a repetirse el ciclo**, que es simplemente el tamaño
del pool. Por eso los topes de la sección 9.

Y el historial **sobrevive a los reinicios**: se guarda en disco, así que un
reinicio de pm2 ya no borra la ventana.

---

## 6. Dónde falta contenido

**No lo mires aquí: pregúntaselo al repo.** Esta sección tenía una tabla escrita
a mano y envejeció en horas.

```
npm run progreso
```

Da el porcentaje del corpus a estándar —ponderado por cuánto se lee cada pool, no
por cuántos ficheros se han tocado— y la lista de lo que falta ordenada por
impacto real. Mide dos cosas objetivas: tamaño suficiente para el tráfico y filo
(arsenal por encima del 50 %), esto último solo en los pools cuyo trabajo es
hacer daño; en los de halago no se exige.

Lo que **no** mide es si la frase está bien escrita. Es un suelo, no un aprobado.

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

**Por tráfico, no por nombre de tramo.** Es la corrección más importante de esta
guía y ya se aplicó a todo `percent.js`.

En comandos **negativos** (`fea`, `guarra`, `cerdo`, `rata`…) el tramo que más
sale es `high`, con el 87 % de las tiradas. En los **positivos** (`linda`,
`ganador`, `sexy`, `crack`, `feminidad`, `masculinidad`) el que más sale es
**`low`**, con el 52 %, y `high` solo el 17 %.

| | high | mid | low |
|---|---|---|---|
| **Negativos** | **200** | 50 | 50 |
| **Positivos** | 50 | 100 | **200** |

Unas 300 por comando. Aplicar la regla por el nombre del tramo en vez de por el
tráfico pone 200 frases donde casi nadie las lee y 50 donde caen todas.

Fuera de `percent.js` la regla es la misma pero mirando el pool concreto:

| Cuándo sale ese pool | Frases |
|---|---|
| En cada uso de un comando frecuente (tramos de `iq`, verdicts de `ship`) | 100-200 |
| Desenlace común de un comando frecuente (`ROB_WIN`, `ROB_FAIL`) | ya están a 250-380, no tocar |
| Ruta rara (tienda de `robo`, escudo, contraataque) | ~100 por decisión del dueño |
| Apuesta de aura (cooldown 3 h) | ~60 |
| Hitos de racha | ~50 |

**`!fiel` e `!infiel` son la excepción y no siguen esta tabla**: tiran uniforme,
así que sus tres tramos salen casi igual (31/39/31 %). Reparto equilibrado, unas
100 por tramo — que es lo que ya tienen. No les apliques el 200/50/50.

---

## 10. Antes de entregar

Cuatro comandos, y **ninguno sustituye a otro**:

```
npm install
npm run check
npm run placeholders
npm run pools
npm run progreso
```

**`npm run check` es el que importa y es nuevo.** Cuatro capas:

1. **Compila** — cada `.js` es JavaScript válido. Pilla comillas sin escapar y
   frases partidas en dos líneas, los dos fallos que ya tumbaron el bot.
2. **Carga** — cada módulo importa. Pilla requires rotos y funciones que ya no
   existen.
3. **Responde** — ejecuta 29 comandos 60 veces cada uno. Pilla excepciones y
   placeholders que llegan sin sustituir.
4. **Guardan** — comprueba que aura, casino, racha, contador y banlist se
   comportan. Se salta sola si el bot está corriendo, para no pisarle los datos.

Las capas 2 a 4 necesitan `npm install`. La 1 corre siempre y es la que detecta
el bot caído.

**Aviso que ya costó caro:** `placeholders` y `pools` salieron EN VERDE con el
bot sin arrancar, porque comparan líneas con expresiones regulares y no compilan
nada. Por eso `check` es obligatorio.

Checklist:

- [ ] ¿La polaridad es la correcta? (`goodIsHigh` — sección 3.2)
- [ ] ¿El tramo coincide con el tono?
- [ ] ¿Los placeholders son los permitidos para ese fichero? (sección 8)
- [ ] ¿Una frase por línea, comillas simples, coma final?
- [ ] ¿Sin duplicados exactos dentro del mismo pool?
- [ ] Los cuatro comandos en verde

---

## 10 bis. Lo que NO se hace, y por qué

Tres incidentes, los tres del mismo tipo. Léelo antes de tocar nada.

**1. Nada de transformaciones globales sobre un fichero.** Un filtro de "mínimo
100 caracteres" aplicado a `percent.js` entero borró 3.872 líneas: 53 pools
perdieron frases y 14 quedaron vacíos. Con un pool vacío el comando no se repite,
**lanza una excepción**: `pickFresh` devuelve `undefined` y el `.replace` de
`runPercent` revienta. Cinco comandos muertos.

**2. Un reemplazo masivo tocó ficheros que no eran suyos.** Metió un punto donde
no va —`'Mientras %W llenaba. el chat...'`— en 1.780 líneas de 52 ficheros, 1.638
de ellas frases que el grupo iba a leer. Y llegó a `helpers.js` y `economia.js`,
que son el motor.

**3. El arsenal se puede inflar y se notó.** Pegar `, joder` al final de frases
limpias subía el número y dejaba el texto roto: `'...se defendió como se defiende
de todo: mal. y, cabrón punto final del parte.'`

**4. Un script no se pasa dos veces sobre su propia salida.** De ahí salieron 37
frases con rachas de barras invertidas: el bot imprimía literalmente
`It\\\\\\\\'s over`. Cada pasada vuelve a escapar lo que ya estaba escapado, así
que el daño se multiplica y no da ningún error — compila perfecto y solo se ve
en el chat.

**5. No se rellena un pool clonando frases.** Los pools de país de `!roast`
figuraban con 50 y 20 frases; de contenido real había 10 y 5. El resto eran la
misma frase con una coletilla pegada encima (`…prepotencia El grupo ya hizo la
resta.`, sin punto). Un pool inflado es peor que un pool corto: el validador lo
da por bueno y el grupo ve la misma frase con distinto final. Doce países
—GT, CU, BO, DO, HN, PY, SV, NI, CR, PA, UY, PR— siguen sin una sola frase
propia: las 10 que tienen son genéricas con `%PAIS` sustituido.

La regla que sale de los cinco: **edita el pool que estás trabajando y solo ese.**
Un cambio que toca 62 pools para arreglar 6 va a romper algo siempre.

**Y actualiza antes de empezar.** Si tu rama viene de una base vieja, al empujar
devuelves código que ya se quitó y el bot deja de cargar. Ha pasado:

```
git pull origin main
```

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
