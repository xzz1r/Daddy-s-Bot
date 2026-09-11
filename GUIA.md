# Guía del bot para escribir contenido

Esto explica cómo funciona Daddy's Bot por dentro, con el detalle necesario para
escribir frases que encajen en el motor sin romperlo. No hace falta saber
programar: hace falta entender **dónde cae cada frase y por qué**.

El contenido (las frases) y el motor (lógica, economía, rendimiento,
guardarraíles) se mantienen aparte. El punto de contacto son los cuatro
validadores de la sección 10.

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

**Cuatro cosas del motor cambiaron y afectan a cómo escribes:**

| Qué | Antes | Ahora |
|---|---|---|
| Elección de frase | sesgada a la cabeza del pool (8:1) | **plana**: todas igual de probables |
| Orden por dureza | ordenaba al arrancar | **eliminado**, no existe |
| Tamaño de pool | por nombre de tramo | **por tráfico** (sección 9) |
| Reparto de los positivos | high 17 % · mid 31 % · low 52 % | **high 6 % · mid 18 % · low 76 %** |

La consecuencia práctica está en la sección 5.1 y es la más importante: **la peor
frase de un pool ahora sale tanto como la mejor.**

**Dónde están las frases de %:** en `src/data/percentLabels.js`, no en
`src/commands/percent.js`. Ese fichero es solo el motor (tirada, amaño,
polaridad). Si editas `percent.js` pensando que ahí van las frases, estás
tocando el motor.

**Lo que falta no se escribe aquí. Se pregunta:**

```
npm run progreso
```

Sale la lista ordenada por impacto real y con las cifras del día. Una lista a
mano en esta guía envejece en horas — la que había aquí llegó a mandar trabajo a
tramos que ya estaban hechos y a citar cuatro duplicados que ya no existían.

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
             ├─ src/data/*.js          POOLS DE FRASES
             └─ src/utils/*.js         motor compartido: helpers, stores, economía
```

Lo único que hace falta retener: **`src/commands/` es lógica, `src/data/` es
contenido.** Los % ya están partidos: motor en `percent.js` (230 líneas),
frases en `src/data/percentLabels.js`. `robo.js`, `wingman.js` y `roast.js`
tienen ya su fichero de frases al lado, pero todavía guardan pools dentro, y ahí
la regla de la sección 10 bis manda: **toca el pool, nunca el código que hay
entre pools.**

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
| **Positivo** → miembro | **6 %** | 18 % | **76 %** |
| **Positivo** → admin | 7 % | 19 % | 74 % |

Traducido: **al grupo le sale mal casi siempre.** Un miembro cualquiera recibe
el tramo brutal en ~87 % de las tiradas negativas y en ~76 % de las positivas.
Eso es intencionado y es el chiste central del bot.

**Las dos filas de positivos cambiaron** (eran 17/31/52). Los halagos perdonaban
mucho más que los insultos: uno de cada seis `!sexy` salía con un piropo de
verdad, y en el grupo eso se leyó como "a estos les sale bien todo". A nadie le
extraña que `!rata` insulte —se da por hecho—, pero un `!sexy` al 84 % sí se
comenta. Ahora las dos polaridades pegan parecido.

Esa tabla no está copiada aquí a mano: sale de `DISTRIBUCION`, en
`src/commands/percent.js`, que es la misma constante que usa el motor para tirar
y `npm run progreso` para repartir el trabajo. `npm run check` compara esta
sección con ella.

**Consecuencia directa para el contenido:** el tramo brutal es el que la gente
lee constantemente. Los tramos suaves casi no se ven. La calidad y la cantidad
deben ir donde está el tráfico (sección 6).

### 3.4 — El amaño del owner

Al owner principal se le fuerza el resultado a su favor: franja alta en lo
favorable, baja en lo peyorativo. Pero **no es un amaño limpio**, y el motivo
está comentado en el código: salir 97 o 3 siempre no parece suerte, parece
programado, y el grupo lo notó.

Por eso el owner tiene bandas deliberadamente sosas (45-75 en positivos, 25-55
en negativos). El reparto de hoy es **42 % banda sosa · 50 % la franja que le
favorece · 8 % un resultado malo de verdad, como a cualquiera**. No salir nunca
mal es, en sí mismo, el patrón que delata.

(Era 62/20/18 y lo bajó el dueño: perdía tres de cada diez y no era eso lo que
se pidió del amaño. Lo que no se tocó es la FORMA de los números — se sigue
tirando de bandas anchas, así que no vuelven los 97 y 99 repetidos que el grupo
cazó en su día.)

`!iq` está fuera del amaño a propósito: es aleatorio puro para todo el mundo.
`!fiel` e `!infiel` tiran uniforme, pero el amaño del dueño sí se les aplica
(sección 4). **`!linda` y `!fea` ya no están fuera** — pasaron a la curva como
el resto, porque repartían un piropo el 31 % de las veces y son de los más
usados: buena parte de aquel "a estos les sale bien todo" venía de esos dos.

Al escribir no hay que hacer nada especial con esto — solo saber que el owner
cae sobre todo en `mid`, así que **los pools `mid` no son relleno**: son lo que
el dueño del bot lee de sí mismo.

*(Ojo: esto es el amaño de los comandos de porcentaje. La economía de `!aura` es
otra cosa. No afecta a lo que escribes, pero si tocas frases de `aura` conviene
saber que se gana bastante más de lo que se pierde.)*

### 3.4 bis — `!feminidad` no usa la tabla: tiene **tirada propia**

Es la única excepción viva dentro de los 21. Su curva no sale de `DISTRIBUCION`
sino de una función escrita al lado de sus frases, en `percentLabels.js`, y esa
función pisa entera la del motor:

| `!feminidad` | high | mid | low | media |
|---|---|---|---|---|
| al dueño | 4 % | 11 % | **85 %** | 22 |
| a cualquier otro | 45 % | 45 % | 10 % | 62 |

Las dos mitades son deliberadas y hay que escribir para ellas:

- **Al dueño le sale baja el 85 % de las veces.** Es el chiste recurrente del
  alpha, y es lo único de este comando que no se toca.
- **Al resto le sale mid o high el 90 %.** Es decir: aquí `low` casi no se lee y
  `high` y `mid` se leen a partes iguales — justo al revés que en los demás
  positivos, donde el que manda es `low` con el 76 %.

Al escribir: los pools `high` y `mid` de este comando son los que se leen, y
necesitan tamaño de tramo principal los dos. `npm run progreso` ya lo mide
tirando la función de verdad, así que sale con sus porcentajes reales y no con
los de la tabla general.

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

Estos dos **son ya los únicos que no usan las distribuciones de arriba**. Tiran
uniforme 0-100: cada número tiene la misma probabilidad, así que sus tres tramos
salen casi igual (31 / 39 / 31 %). Solo se aplica el amaño del owner, y ahí un
85 % de las veces — el 15 % restante se queda la tirada uniforme, que es el
contrato de estos dos comandos.

Una medida de fidelidad amañada por rol no mide nada: por eso se quedan fuera de
la curva mientras `!linda` y `!fea` entraron.

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

## 5 bis. El humor del bot, al pie de la letra

Esta sección no es de estilo: es el criterio con el que se acepta o se tira una
frase. Todo lo que hay aquí está sacado del corpus que **ya funciona**, no de
una idea de cómo debería sonar.

### Las seis reglas

**1. La frase termina en una imagen concreta, no en un insulto.** El insulto es
el material; la imagen es el chiste. Si quitas los tacos y no queda nada, no hay
frase.

> «Tu cuarto tiene ecosistema propio: hay cosas viviendo en esos platos que la
> ciencia aún no clasificó. Eres patrimonio biológico de la mugre.»

Eso es `cerdo.high`. El insulto está, pero lo que se recuerda es el plato.

**2. El dato técnico, dicho en serio, es más cruel que el adjetivo.** El bot
mide. No dice «eres feo»: dice qué hueso.

> «Tienes el arco cigomático plano y el mentón retraído.»
> «Canthal tilt positivo y una armonía que la gente paga miles por fingir.»

**3. El bot narra un veredicto, no participa en la conversación.** Habla como
quien lee un parte, no como quien está picado.

> «Fealdad inexistente. El bot ha rebuscado en cada rasgo y ha vuelto con las
> manos vacías.»
> «El aura se ha equivocado y no piensa rectificar.»

**4. Frases cortas y planas, con el peso al final.** Sujeto, golpe, punto.

> «De ganador, el discurso. De resultado, una puta nada.»
> «Prometes mucho y sostienes una mierda. Lo que cuenta es lo que sostienes. Tú
> sueltas. Siempre.»

**5. El taco va dentro de la frase, nunca pegado detrás.** Pegar `, joder` al
final sube el arsenal que mide `npm run progreso` y deja el texto peor. Es
trampa y se nota.

> Bien: «Suerte de gilipollas y ni una gota de mérito.»
> Mal: «No has ganado nada. Y, cabrón, punto final del parte.»

**6. El halago también cobra.** Cuando toca cumplido, se dice de verdad y se
cobra al final. Un halago limpio es tan defecto como un insulto en el tramo del
halago.

> «Estructura buena, piel buena, proporciones buenas. Aburrido de leer y
> molesto de aceptar.»

**7. Nada de analogía barata.** Si el chiste es el objeto («Café de máquina:
dos sorbos y a cenicero», «Nokia que aún enciende», «Besas el cubilete
vacío»), la frase no va. Se le puede mandar a cualquiera del grupo sin
cambiar una letra, y por eso no duele. Habla de lo que esa persona *acaba
de hacer*. Hay 225 frases marcadas con `// ANALOGÍA` en `AURA.gain` /
`AURA.loss`, el cooldown de `!aura` y `MAL_ESCRITO`: `PENDIENTE.md`.
`como quien` + verbo sí vale: colorea una actitud, no sustituye al ataque.
`!fiel` / `!infiel` no entra en este encargo.

### El refuerzo: cómo escribe Rockstar

Sirve para lo que al bot le falta hoy, que es el registro de sus **instituciones**
—la tienda, el bote, la caja, el cartel de buscados, el asalto—. Cuatro cosas
que se copian y una que no.

**Se copia:**

- **El detalle mundano como remate.** No «te robaron»: te robaron y el ladrón
  se paró a contar el dinero delante de ti. Rockstar no describe el atraco,
  describe al tipo que se queja del tráfico mientras huye.
- **La voz burocrática aplicada a la violencia.** Comisiones, plazos, letra
  pequeña, condiciones. La caja cobra por abrirse y lo dice como un banco lo
  diría: *«Y la comisión pagada, que aquí nada es gratis.»* Ese es el tono
  exacto para `!tienda`, `!vault`, `!bote` y `!asalto`.
- **La parodia de producto.** Los objetos de la tienda son productos con
  promesas. Se venden como se vende una garantía extendida: prometiendo mucho y
  cubriendo poco.
- **La crueldad es siempre sobre la conducta y la fantasía propia**, nunca sobre
  lo que alguien es de nacimiento. Rockstar se ríe del que se cree alguien, no
  del que nació donde nació. El bot ya funciona así y no se mueve de ahí.

**No se copia:**

- **Nada americano.** Ni marcas, ni radio, ni acento. Aquí es un grupo de
  WhatsApp.
- **Guiñar al público.** Rockstar nunca dice «qué gracioso es esto», y el bot
  tampoco puede. Fuera las frases donde el bot habla de sí mismo como programa:
  *«el bot casi se apaga de aburrimiento procesándote»* rompe el personaje.
  El bot no se aburre: dicta.
- **El chiste largo.** Una frase, una línea. Lo que necesita párrafo se queda
  fuera.

### A quién pega el bot y a quién no

El bot no reparte crueldad a partes iguales. Tiene un criterio, y decide en qué
tramo va cada frase antes que ninguna otra cosa.

**La actividad se proclama.** Quien escribe sostiene el grupo. Cuando el bot lo
nombra lo dice como quien lee un parte de méritos: corto, seco, sin sarcasmo.
No es un aplauso —el bot no anima a nadie— es un reconocimiento de hechos.

> «Llevas el grupo a hombros como una puta mula de carga, y ni te quejas.»
> «Tu nombre sale en más conversaciones que el de cualquier otro. No por
> casualidad.»

Eso es proclamar: se reconoce lo que ha hecho y el taco va de refuerzo, no en
su contra.

Hay **dos formas de fallar aquí, y las dos están en el corpus**:

- **Consolar.** *«Se agradece el sacrificio»*, *«aquí se te valora»*. Es un
  diploma, y el bot no reparte diplomas.
- **Burlarse del que aporta.** *«Se puede vivir prácticamente dentro de un chat
  de WhatsApp»*, *«ni una puta vida fuera de esto»*, *«tiene un chat y una
  alarma»*. El bot está castigando exactamente la conducta que quiere. Al que
  sostiene el grupo no se le llama pringado por sostenerlo.

**La inactividad se ataca a muerte.** Es la única falta que el bot persigue de
verdad. El fantasma, el que lleva treinta días leyendo y cero escribiendo, el
que ocupa plaza: ahí va todo el arsenal y sin freno.

**Al que gana no se le quita la victoria.** Un aviso corto y se le deja en paz:
el dato, un remate de una línea y fuera. Ni celebración ni insulto.

La regla exacta: **el chiste puede ir sobre la mesa, sobre el grupo o sobre la
suerte, pero no sobre el que acaba de ganar.**

> Bien: «La mesa paga y se queda mirando al cabrón con odio.»
> Bien: «Nadie sabía cómo quitarte el respeto que acabas de ganar.»
> Mal: «Sumaste algo. No es para celebrar, pero al menos hoy no diste el
> papelón de siempre.»
> Mal: «Te dieron el pan de la cesta que nadie cogió. Gratis, duro, y tú
> haciendo fiesta.»

Los dos malos son de `gain`, el pool de la subida pequeña de aura, y ahí está
escrito así de arriba abajo: la ganancia se usa como palo para pegarle al que
gana. Las imágenes son buenas —café de máquina, miga de croissant, modo ahorro
de batería—; lo que sobra es el remate contra la persona.

**Al que pierde se le remata.** Aquí sí va el arsenal entero y la frase larga.

`npm run progreso` ya distingue los dos grupos: solo exige filo a los pools que
rematan. Un pool de victoria con el arsenal por las nubes es el bot insultando
al ganador, y eso es un defecto, no un pool sin trabajar.

### Que no parezca escrito por una máquina

Es la regla que está por encima de las otras seis, porque es la única cuyo
incumplimiento no se arregla reescribiendo una frase: se arregla tirando el
lote entero.

**El rastro no es lo que parece.** Busqué en las 10.000 frases los tics
clásicos: *"no solo… sino"* (1), conectores de redacción tipo *"dicho esto"* o
*"cabe destacar"* (0 reales), disculpas, matices, emoji de adorno (0). El corpus
está limpio de eso. Lo que sí hay es esto, por orden de gravedad:

**1. La variación de una sola tesis. Este es el rastro de verdad.** Un humano
que escribe cien insultos se cansa del ángulo y cambia de tema. Una máquina
produce cien versiones del mismo. `incel.high` lleva la misma idea —teoría sin
práctica— desde la frase 27 hasta el final, cambiando el decorado: enciclopedia,
guía turística, laboratorio, grada. Al escribir esto había **257 casi-clones dentro de un mismo
tramo**; hoy quedan **93**. Eso, y no un tic de vocabulario, es lo que hace que el grupo note que
detrás no hay nadie.

La prueba: si dos frases del mismo pool se pueden resumir con la misma línea,
sobra una. Escribe menos y escribe distinto.

**2. El paralelismo de plantilla.** Sesenta y cinco frases abren con *"Ni X ni
Y"*. Una construcción repetida a esa escala se lee como un molde relleno, aunque
cada relleno sea distinto. Vale como recurso; no vale como arranque por defecto.

**3. El bot hablando de sí mismo como programa.** El bot es una voz que dicta un
veredicto, no un software que se queja de su carga de trabajo. *"El bot casi se
apaga de aburrimiento procesándote"* rompe el personaje en una línea: admite que
hay un proceso, y donde hay un proceso no hay nadie mirándote.

Que el bot se nombre en tercera persona SÍ vale, y es parte de la voz: *"El bot
ha rebuscado en cada rasgo y ha vuelto con las manos vacías"*. La diferencia es
autoridad contra maquinaria.

(Hablar de *el algoritmo* como se habla de Instagram o TikTok no cuenta: eso es
jerga del grupo y está bien usado en las cincuenta frases que lo hacen.)

**4. Dos hábitos de escritura, no de habla.** La raya larga (—) dentro de una
frase y el punto y coma. Nadie escribe eso en un grupo de WhatsApp. Hay once y
cincuenta y ocho respectivamente. No es urgente, pero cada uno delata que el
texto se redactó, no se soltó.

**Lo que NO significa esta regla:** no significa escribir mal. El bot tiene las
tildes puestas y la sintaxis correcta a propósito — es un narrador, no un
miembro más del grupo tecleando con prisa. Un bot que escribe "q" y "xq" no
parece más humano: parece un bot imitando a un humano, que es peor.

### El error que más se repite

Un chiste bueno repetido ochenta veces con otras palabras. `incel.high` tiene la
misma tesis —teoría sin práctica— desde la frase 27 hasta el final. Eso no es un
pool de cien frases: son tres frases y noventa y siete ecos.

Con la elección plana (sección 5.1), **el eco sale tanto como el original**.
`npm run progreso` los cuenta y los enseña con ejemplos.

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

**La tabla que manda es `CONTRATO`, en `scripts/placeholders.js`.** Esta es su
copia legible; si las dos discrepan, la del código tiene razón.

| Dónde escribes | Placeholders permitidos |
|---|---|
| `percent.js`, `percentLabels.js`, `fidelityPhrases.js` | `[nombre]` |
| `roast.js`, `roastPhrases.js` | `%N` nombre, `%MSG` mensaje citado |
| `relevance.js` | `%N` nombre, `%MSG` mensaje citado |
| `wingman.js`, `wingmanPhrases.js` | `%N` nombre |
| `robo.js`, `roboPhrases.js`, `roboExtraPhrases.js` | `%A` autor, `%V` víctima, `%C` cantidad, `%N` nombre, `%H` hora |
| `apuestaPhrases.js` (aura) | `%A` apostador, `%C` cantidad, `%S` saldo final |
| `vaultPhrases.js` (la caja) | `%N` nombre, `%C` cantidad, `%Z` lo guardado, `%S` saldo a la vista |
| `rachaPhrases.js` | `%N` nombre, `%D` días de racha, `%P` días perdidos |
| `activity.js`, `duel.js` | `%W` ganador, `%L` perdedor |
| `accionPhrases.js` | `%A` quien la hace, `%V` quien la recibe |
| `avisos.js` | `%V` la persona del cartel del día. **Solo el pool `OBJETIVO_DIA_CARTEL` lo usa**; el resto de avisos van sin huecos, se mandan tal cual. Lo sustituye el manejador de mensajes, no un comando, porque ese cartel se cuelga solo con el primer mensaje del día y no lo pide nadie |
| `mog.js` | `%M` / `%L` |
| `iq.js` | `%IQ` |
| `topsRandom.js` | `{N}` |
| `ship.js`, `social.js`, `aura.js`, `cooldownPhrases.js`, `auraCobro.js` | **ninguno** |

`[nombre]` es **opcional** en `percentLabels.js`: si la frase no lo lleva, no pasa
nada. Mézclalo — que todas las frases empiecen con el nombre canta.

---

## 9. Cuántas frases escribir

**Por tráfico, no por nombre de tramo.** Es la corrección más importante de esta
guía y ya se aplicó a todo `percentLabels.js`.

En comandos **negativos** (`fea`, `guarra`, `cerdo`, `rata`…) el tramo que más
sale es `high`, con el 87 % de las tiradas. En los **positivos** (`linda`,
`ganador`, `sexy`, `crack`, `feminidad`, `masculinidad`) el que más sale es
**`low`**, con el 76 %, y `high` solo el 6 %.

La regla, aplicada al tráfico de cada pool:

```
  se lee ≥ 50 % de las veces   →  100 frases
  se lee ≥ 25 %                →   50
  el resto                     →   25
```

**El dueño bajó los topes a la mitad**: con la elección plana (sección 5.1) la
peor frase de un pool sale tanto como la mejor, así que el relleno no es neutro
—hace daño—. Mejor pool corto y filoso que inflado.

| | high | mid | low |
|---|---|---|---|
| **Negativos** | **100** (87 %) | 25 (9 %) | 25 (4 %) |
| **Positivos** | 25 (6 %) | 25 (18 %) | **100** (76 %) |
| **`fiel` / `infiel`** | 50 (31 %) | 50 (39 %) | 50 (31 %) |

**Aplicar la regla por el nombre del tramo en vez de por el tráfico es el error
que ya se cometió una vez**: dejó a `!linda`, `!sexy`, `!crack` y `!ganador` con
100 frases en el tramo que se ve el 6 % de las veces y 25 en el que se ve el
76 %.

Y se cometió una segunda vez, en el propio medidor: `npm run progreso` guardaba
su copia de la tabla de tráfico y se quedó en el reparto viejo de los positivos
(17/31/52) cuando el motor ya tiraba 6/18/76. Durante semanas pidió 50 frases
para un tramo que se lee el 18 % y daba por bueno el que se lee el 76 %. Hoy lee
la tabla del motor; no hay segunda copia.

Fuera de `percentLabels.js` la regla es la misma pero mirando el pool concreto:

| Cuándo sale ese pool | Frases |
|---|---|
| En cada uso de un comando frecuente (tramos de `iq`, verdicts de `ship`) | 100-200 |
| Desenlace común de un comando frecuente (`ROB_WIN`, `ROB_FAIL`) | ya están a 250-380, no tocar |
| Ruta rara (tienda de `robo`, escudo, contraataque) | ~100 por decisión del dueño |
| Apuesta de aura (cooldown 3 h) | ~60 |
| Hitos de racha | ~50 |

**`!fiel` e `!infiel` son la excepción**: tiran uniforme, así que sus tres
tramos salen casi igual (31/39/31 %) y les toca reparto equilibrado. Es la fila
de abajo de la tabla.

---

## 10. Antes de entregar

Estos comandos, y **ninguno sustituye a otro**:

```
npm install
npm run check          ← el que manda
npm run placeholders
npm run pools
npm run conteos
npm run progreso
npm run acciones       ← solo si tocas las acciones (sale a internet)
npm run analogias      ← cuenta las líneas marcadas `// ANALOGÍA` que faltan
npm run frases         ← mide siete defectos de escritura en las 8.449 frases
```

Los dos últimos miran las frases, y **no miran lo mismo**.

`npm run analogias` cuenta marcas. Son las 225 líneas con `// ANALOGÍA` que
quedan por reescribir en `AURA.gain`, `AURA.loss`, el cooldown de `!aura`,
`MAL_ESCRITO` y tres líneas del roast de acciones. El encargo entero está en
`PENDIENTE.md`. Devuelve 1 mientras quede alguna y 0 al cerrar, así que sirve de
puerta: mientras no dé cero, el trabajo no está hecho.

`npm run frases` no cuenta marcas: **mide el texto**, las 8.449 frases, sin que
nadie haya tenido que etiquetar nada. Busca siete defectos:

| familia | qué es | hoy |
|---|---|---|
| `nadie` | la frase no menciona a la persona: vale para cualquiera | 1099 |
| `analogia` | el chiste es el objeto («tu lealtad es como el wifi del vecino») | 230 |
| `coletilla` | frase neutra y el insulto pegado detrás con una coma | 595 |
| `eco` | abre repitiendo la etiqueta del comando («Rata que…» en `!rata`) | 426 |
| `molde` | cuatro o más del mismo pool empiezan igual | 1790 |
| `enlatado` | el mismo bloque de cinco palabras en cuatro frases o más | 410 |
| `roto` | daño mecánico de una edición masiva anterior | 0 |

Son 3.456 frases distintas con al menos un defecto: el **41 %** del bot.

`nadie` es la que más explica y la que ninguna expresión regular veía antes,
porque estas frases no comparan con «como» ni con «más que»: sueltan una imagen
y se van. «Café de máquina: dos sorbos y a cenicero.» No hay comparación que
cazar, y tampoco hay nadie dentro. En `AURA.gain`, 74 de 120 frases no mencionan
a quien acaba de ganar.

`npm run frases -- --techo` compara con la foto del día que se midió y falla si
alguna familia ha CRECIDO. Reescribir un pool tiene que bajar estos números;
cuando bajen, se bajan también en la cabecera de `scripts/frases.js` y el techo
se queda apretado.

`npm run acciones` es el único que **sale a internet**: le pregunta a la web de
gifs por cada categoría que tiene configurada el bot. Existe porque una
categoría mal escrita no se ve — el comando queda montado, sale en el menú,
alguien lo escribe, la web contesta 404, el bot devuelve el aura y dice que no
pudo traer nada. Desde fuera parece que la web va mal un día; en realidad ese
comando no ha funcionado nunca. Por eso no entra en `check`: un validador que
depende de que una web ajena esté en pie se pone rojo por motivos que no tienen
nada que ver con el código.

**`npm run check` es el que importa.** Empezó con cuatro capas y hoy son 58. Las
cuatro primeras siguen siendo las que pillan lo que rompe el bot al escribir
frases:

1. **Compila** — cada `.js` es JavaScript válido. Pilla comillas sin escapar y
   frases partidas en dos líneas, los dos fallos que ya tumbaron el bot.
2. **Carga** — cada módulo importa. Pilla requires rotos y funciones que ya no
   existen.
3. **Responde** — ejecuta los comandos muchas veces cada uno. Pilla excepciones y
   placeholders que llegan sin sustituir.
4. **Guardan** — comprueba que aura, casino, racha, contador y banlist se
   comportan. Se salta sola si el bot está corriendo, para no pisarle los datos.

Las otras cincuenta y cuatro son del motor —permisos, economía, red, despliegue— y
no hace falta entenderlas para escribir. Cuatro sí tocan al contenido y conviene
saberlas:

- **31b** revisa las tildes de las 10.000 frases.
- **33a** caza voseo, frases pegadas y basura tipo `undefined` dentro de un texto.
- **17** ya no busca solo frases repetidas exactas: también las que se
  diferencian en una palabra. «…para tapar un hueco que sigue igual de grande» y
  «…para tapar un vacío que sigue igual de grande» son la misma frase para quien
  la lee, y había 165 así. Cuentan doble en el tamaño del pool y encima engañan a
  la ventana anti-repetición, que se calcula sobre ese tamaño. Y no deja que la
  misma frase salga en dos resultados de `!robo`: si el texto de un robo normal
  es el de uno maestro, el resultado deja de decir nada. Había 26, y alguna
  mentía —en el pool de robo *parcial* había frases que decían «saqueo total».
- **Diez capas se reescribieron** porque comprobaban TEXTO y no comportamiento:
  buscaban una palabra en el código fuente, y bastaba con dejar la palabra donde
  estaba y romper lo de al lado para que pasaran en verde. Es la enfermedad
  crónica de este validador y ya había mordido tres veces. Ahora ejecutan: el
  amaño del dueño en `!robo` se calcula y se compara, un mute se pone y se lee
  desde un proceso nuevo, una cuenta business se procesa y se le pregunta a la
  lista negra, la tienda se intenta con la economía apagada. Cada una probada
  rompiendo el código a propósito y comprobando que se pone roja.
- **44** no deja pasar una frase que dé por hecho que quien la lee es un tío.
  «Eres el que reenvía capturas» le llega a una tía en masculino y con su nombre
  delante. La forma neutra es *eres quien*; para *eres el tío que*, *eres de esa
  gente que*. Un «cabrón» suelto al final no cuenta: eso es el registro del bot y
  se usa igual con cualquiera. Los comandos que van de género a propósito
  —`!masculinidad`, `!feminidad`, `!gay`, `!femboy`— quedan fuera de la regla.

Las capas 2 en adelante necesitan `npm install`. La 1 corre siempre y es la que
detecta el bot caído.

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
  que va a usar el bot de verdad; si no sirviera, el check sale rojo, el
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

`npm run estado` mira además dos cosas de espacio, y las mira **en la máquina**
porque dependen de lo que haya instalado: los objetos sueltos de git (un
`git gc` los empaqueta sin tocar la historia) y si el ffmpeg empaquetado —65 MB—
es una segunda copia. Ese paquete trae ffmpeg pero **no trae ffprobe**, y el bot
necesita ffprobe para la duración del audio y el sondeo de vídeo; si esas dos
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
así que pm2 lo deja **parado**. Un guardián parado se ve; uno reiniciándose cada
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

Los **estados subidos al grupo** dejan bitácora. El spam seguía saliendo a
diario y la sospecha era que el bot los borraba **solo para él**. En Baileys esa
diferencia es una condición sola: si la clave del borrado lleva el JID del grupo
y `fromMe: false`, sale como borrado de admin y lo quita para todos; si no, sale
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

**Aviso que ya costó caro:** `placeholders` y `pools` salieron EN VERDE con el
bot sin arrancar, porque comparan líneas con expresiones regulares y no compilan
nada. Por eso `check` es obligatorio.

Checklist:

- [ ] ¿La polaridad es la correcta? (`goodIsHigh` — sección 3.2)
- [ ] ¿El tramo coincide con el tono?
- [ ] ¿Los placeholders son los permitidos para ese fichero? (sección 8)
- [ ] ¿Una frase por línea, comillas simples, coma final?
- [ ] ¿Sin duplicados exactos dentro del mismo pool?
- [ ] ¿`progreso` no saca casi-clones ni **molde** de lo que acabas de escribir?
- [ ] Los cinco comandos en verde

**El molde** es la medida nueva de `npm run progreso`, y mide la regla 2 de la
sección 5 bis: la misma FORMA repetida aunque cada relleno sea distinto. Los
casi-clones comparan palabras, así que sesenta frases con el mismo esqueleto y
sesenta vocabularios pasan limpias — y el grupo oye el esqueleto igual. Se mira
cómo CIERRA cada frase. Un pool sano del bot anda entre el 3 % y el 19 %; por
encima del 30 % es un molde y hay que reescribir. Pasó con `ROAST_USUARIO`, que
cerraba la mitad de sus sesenta frases con la forma *"<insulto> de <cosa>"*.

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
misma frase con una coletilla pegada encima. Un pool inflado es peor que un pool
corto: el validador lo da por bueno y el grupo ve la misma frase con distinto
final. **El roast por país acabó quitándose entero** — no quedan frases ni
`%PAIS` en el contrato—, pero el incidente se queda escrito porque el método de
relleno es lo que hay que no repetir.

**6. Un script no junta líneas de código. Esto tumbó `!aura` en producción.**
Una pasada dejó 30 líneas de `aura.js` metidas en UNA sola de 2.198 caracteres,
con los comentarios `//` dentro. Todo lo que iba detrás del primer `//` pasó a
ser comentario: treinta líneas de código real desaparecidas, entre ellas
`const sign`. La línea siguiente lo usaba, así que **cada `!aura` moría con
"sign is not defined"** delante del grupo.

Lo que lo hace peligroso es que no se ve: el fichero compila, importa y pasa la
capa 1 y la 2 del `check`. Solo revienta al ejecutarlo.

Si vas a tocar un fichero, toca **las frases**, nunca el código que hay entre
ellas. Y si una pasada tuya puede juntar líneas, no la lances: en un `.js` un
salto de línea después de un `//` es lo único que separa un comentario del
programa.

La regla que sale de los seis: **edita el pool que estás trabajando y solo ese.**
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
- **Robo** (`!robo`): el pool más grande fuera de `percentLabels.js`.
- **La caja** (`!vault` · `!lock` · `!unlock`): se guarda aura donde no se puede
  robar, con un enfriamiento al meter y una comisión al sacar que va al bote.
  Sus frases están en `src/data/vaultPhrases.js` y su registro es propio: **no
  es un banco**. Aquí nadie "realiza una operación" — se echa el candado y se
  mira por encima del hombro. El bot no felicita al que guarda: le recuerda que
  esconder es de cobardes y que sacarlo va a costarle dinero.
- **Racha**: solo habla en hitos (7, 15, 30, 50, 100, 200, 365 días) y al romper
  una racha larga. El resto de días paga en silencio, a propósito.
- **Acciones** (veintiuna: `!hug` · `!cuddle` · `!punch` · `!stare` · `!fuck` y
  compañía): mandan un gif de anime dirigido a alguien y llevan una frase con
  las dos menciones. Cuestan 60; las tres explícitas —`!fuck`, `!anal`, `!cum`—
  120. Veintiún pools de treinta en `src/data/accionPhrases.js`, más
  `ROAST_USUARIO`.

  **Los cuatro registros**, que es lo que hay que tener en la cabeza antes de
  escribir una sola frase:

  | Registro | Cuáles | Dónde está el chiste |
  |---|---|---|
  | Sumisión | `!cuddle` `!pat` `!handhold` `!feed` `!nom` `!peck` `!tickle` | en que **quien recibe cede**: hace sitio sin que se lo pidan, agacha la cabeza, abre la boca. Su decisión, no el gesto |
  | Violencia | `!punch` `!slap` `!stomp` `!bonk` `!chomp` `!yeet` `!shoot` | física: dónde pega, qué se rompe, cómo suena. No se arregla con un taco al final |
  | Incomodidad | `!stare` `!laugh` | no se toca a nadie y marca igual. `!laugh` es el único donde el chiste no es quien lo recibe, sino que no lo era |
  | Explícito | `!fuck` `!anal` `!cum` | crudo de verdad, no insinuado. `!cum` cuenta el después: cómo queda quien lo recibe |

  Y tres reglas que valen para las veintiuna: **la frase no describe la acción,
  la comenta** (el gif ya se ve; contar otra vez lo que pasa es escribir el pie
  de una foto); **el chiste apunta a quien la recibe, nunca a quien la manda**;
  y **ni %A ni %V tienen género** — cualquiera del grupo cae en cualquiera de
  las dos menciones, así que una frase que dice «él» o cierra en -o falla el día
  que le toca a ellas, con su nombre delante.

  `ROAST_USUARIO` es la excepción a todo: va **en otro mensaje**, en cursiva, y
  se ríe de quien ha pagado aura por mandar un gesto animado a alguien que tiene
  a dos metros. **Sale una de cada cinco acciones del grupo**, no en todas — se
  usan en ráfaga y un segundo mensaje debajo de cada una deja de leerse a las
  tres veces. Que salga menos significa que cada una de esas frases se lee menos
  y tiene que aguantar sola: una de relleno ahí canta más que en cualquier otro
  pool. Al tier dueño no se le remata, y sus acciones tampoco gastan turno.

  **Sin frases no hay comando**: mientras un pool no exista, esa acción no sale
  en el menú, no la sugiere el corrector, no cobra y no contesta. Se enciende
  sola al exportar el pool, y `npm run check` revienta si el menú anuncia una
  apagada o se calla una encendida.

  Dos cosas del motor que conviene saber aunque no se toquen: el gif se prepara
  **antes** de que nadie lo pida (la despensa, en `commands/acciones.js`), y
  `!fuck`, `!anal` y `!cum` **no funcionan contra el dueño** — se niegan
  fingiendo que se cayó la web, porque un rechazo con nombre solo le pasa a una
  persona y a la segunda vez el grupo sabe quién manda en el bot.

  La despensa **sobrevive al reinicio**. Vivía solo en memoria, así que cada
  despliegue la vaciaba, y el calentado tarda unos once minutos a propósito: va
  de una en una con treinta segundos de pausa porque veintiuna peticiones
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

- **El cartel del día** (`avisos.js`, pool `OBJETIVO_DIA_CARTEL`): lo único que
  el bot dice sin que nadie le hable y que no es moderación. El objetivo del día
  llevaba tiempo calculándose en silencio —daba bonus de botín y de
  probabilidad— y no se enteraba nadie, ni el grupo ni el propio objetivo: solo
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

- **El remate del día** en los porcentajes (`utils/percentDia.js`): los
  veintiún comandos de `%` son el 87 % de lo que el grupo lee y son **una sola
  mecánica repetida veintiuna veces**. Lo que se gasta no son las frases, es la
  forma, que nunca cambia. Este remate la mueve sin escribir un pool nuevo: en
  vez de más frases, hechos que el bot ya tenía delante y no usaba — el más alto
  del día, el más bajo, un empate exacto con otra persona, o que ya lo habías
  preguntado. Sale **una de cada tres** y solo si hay algo que decir. Si saliera
  siempre dejaría de leerse y pasaría a ser parte del formato, que es justo lo
  que viene a romper.

- **El recargo de ráfaga** (`utils/auraCobro.js`): las tres primeras veces que
  usas un comando de pago valen su precio; de la cuarta en adelante, el doble.
  El motivo es de economía, no de CPU: medida la curva de ingresos, el que
  escribe mil mensajes al día cobra 366 y el normal 49, así que con precio fijo
  el freno apretaba a quien no molestaba. Se cuenta lo que se **usa**, no lo que
  se intenta, y un comando devuelto descuenta su uso. Y se dice en el menú y en
  el mensaje de «no te llega»: un precio que sube sin avisar se lee como un
  fallo del bot.

- **Redes** (`!tt`, `!ig`, `!pin`): el vídeo que alguien pega, sin marca de
  agua. Tres comandos y no uno, por decisión del dueño: son tres plataformas y
  se piden distinto. Lo que comparten —cobrar, bajar, mandar, borrar y devolver
  el aura si no llega nada— se escribe una vez en `commands/redes.js`; el motor
  está en `utils/redes.js`.

  Lo que los mantiene baratos son tres decisiones que no se ven leyendo por
  encima, y la capa 50 las prueba ejecutando:

  | decisión | por qué |
  |---|---|
  | se manda `{ video: { url: fichero } }` | Baileys abre ahí un `createReadStream`; con un Buffer serían 25 MB de heap por envío |
  | `jpegThumbnail` en `null`, no `undefined` | `undefined` es lo que dispara el ffmpeg interno de Baileys al enviar |
  | nunca pasa por ffmpeg | TikTok e Instagram ya entregan H.264; reencodar en un core es lo que lo haría caro |

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

  **Y si no hay por dónde** —ni API ni `yt-dlp`— el comando no cobra ni lo
  intenta: contesta que esa red no está disponible y ya. Cobrar, esperar veinte
  segundos y devolver el aura es gastarle el tiempo a alguien para acabar donde
  ya se sabía.

  **La marca de agua** en TikTok no es otro vídeo, es otro **formato** del mismo
  enlace: el marcado es `download_addr` y el limpio es `play_addr`. El selector
  descarta por nombre cualquier formato que hable de marca de agua, y solo cae al
  mejor a secas si no queda ninguno limpio.

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
  trae vídeo se dice en el grupo con esas palabras, que es el otro motivo —con el
  tamaño— que no se arregla reintentando.

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

- **Multimedia**: stickers, `!play`, `!toimg`. Sin frases; no es terreno de
  contenido. Una cosa del motor que conviene saber: todo lo que llama a ffmpeg
  pasa por un semáforo compartido, y sus plazas salen del número de cores de la
  máquina. En la VPS —un core— es UNA. Dos ffmpeg en un core no van en paralelo,
  se reparten el mismo core, así que con dos plazas el primero que pide un
  sticker esperaba más del doble (2253 ms frente a 1026 ms, medido con dos a la
  vez). Con cuatro cores la máquina sí puede con dos y las coge.
