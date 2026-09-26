# Guía del bot para escribir contenido

Esto explica cómo funciona Daddy's Bot por dentro con el detalle justo para
escribir frases que encajen en el motor sin romperlo. No hace falta saber
programar: hace falta entender **dónde cae cada frase y por qué**.

Aquí solo va lo que sirve para escribir. Lo del motor que no cambia cómo se
escribe (desplegar, el guardián, pm2, las redes, lo multimedia) está en
`MOTOR.md`. El contenido y el motor se mantienen aparte, y el punto de contacto
son los validadores de la sección 10.

---

## LEE ESTO PRIMERO

**Antes de escribir una sola frase, actualiza:**

```
git pull origin main
```

Si tu rama viene de una base anterior, al empujar devuelves código que ya se
quitó y **el bot deja de cargar**. Ya pasó: una llamada a `ordenarPorDureza`,
una función que ya no existía, volvió con un merge y tumbó `percent.js`,
`wingman.js` y `messageHandler.js` de golpe.

**Cinco cosas del motor cambiaron y afectan a cómo escribes:**

| Qué | Antes | Ahora |
|---|---|---|
| Elección de frase | sesgada a la cabeza del pool (8:1) | **plana**: todas igual de probables |
| Orden por dureza | ordenaba al arrancar | **eliminado**, no existe |
| Tamaño de pool | por nombre de tramo | **por tráfico**, y en los % y `!rizz`, **25 · 10 · 10** (sección 9) |
| Tramos de % y `!rizz` | ventana de 50 (`pickFresh`) | **baraja**: salen todas antes de repetir (sección 5.2) |
| Reparto de los positivos | high 17 % · mid 31 % · low 52 % | **high 6 % · mid 18 % · low 76 %** |

La consecuencia práctica está en la sección 5.1 y es la más importante: **la
peor frase de un pool sale tanto como la mejor.** De ahí sale el suelo de oro
de la sección 5 bis.

**Dónde están las frases de %:** en `src/data/percentLabels.js`, no en
`src/commands/percent.js`. Ese fichero es solo el motor (tirada, amaño,
polaridad). Si editas `percent.js` pensando que ahí van las frases, estás
tocando el motor.

**Lo que falta no se escribe aquí. Se pregunta:**

```
npm run progreso
```

Sale la lista ordenada por impacto real y con las cifras del día. Una lista a
mano en esta guía envejece en horas: la que había aquí llegó a mandar trabajo a
tramos que ya estaban hechos y a citar cuatro duplicados que ya no existían.

---

## 1. Qué es el bot

Bot de WhatsApp en Node.js (librería Baileys) que vive en un grupo privado. Se
invoca con el prefijo `!`: `!fea`, `!aura`, `!ship`. Responde citando el
mensaje y mencionando al objetivo.

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
                         recibe cada mensaje y lo reparte
             ├─ src/handlers/comandos.js   una fila por comando, con sus alias
             ├─ src/commands/*.js          lógica de cada comando
             ├─ src/data/*.js              POOLS DE FRASES
             └─ src/utils/*.js             motor compartido: helpers, stores, economía
```

Lo único que hace falta retener: **`src/commands/` es lógica, `src/data/` es
contenido.** Los % ya están partidos: el motor en `percent.js` y las frases en
`src/data/percentLabels.js`.

Hay comandos que todavía guardan sus pools dentro del propio fichero: `iq.js`,
`ship.js`, `count.js`, `relevance.js`, `activity.js`, `social.js`,
`topsRandom.js`, `mog.js`, `duel.js`, `caso.js`, `group.js`, `roast.js` y
`aura.js` en `src/commands/`, y `casino.js`, `auraCobro.js` y `antilink.js` en
`src/utils/`. Ahí manda la regla de la sección 10 bis: **toca el pool, nunca el
código que hay entre pools.**

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

### 3.1. Los tramos

```
  70 o más      →  high
  31 a 69       →  mid
  30 o menos    →  low
```

Fronteras cerradas: 70 es `high` y 30 es `low`. No hay huecos.

### 3.2. La polaridad: `goodIsHigh`, lo más importante

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

- `!fea` **high** (90 %) → destrucción total. `!fea` **low** (5 %) → cumplido real.
- `!linda` **high** (90 %) → cumplido real. `!linda` **low** (5 %) → destrucción.

Una frase brutal metida en el pool `low` de `!fea` sale como *"eres 5% fea:
[insulto]"*. Es incoherente y se nota al instante. **Antes de escribir un pool,
mira su polaridad.**

### 3.3. Las tiradas no son aleatorias: están sesgadas por rol

Aquí está el truco del bot. El porcentaje depende del **rol de quien recibe** el
comando, no de quien lo escribe. Probabilidad de caer en cada tramo:

|  | high (≥70) | mid (31-69) | low (≤30) |
|---|---|---|---|
| **Negativo** → miembro | **87 %** | 9 % | 4 % |
| **Negativo** → admin | 86 % | 9 % | 5 % |
| **Positivo** → miembro | **6 %** | 18 % | **76 %** |
| **Positivo** → admin | 7 % | 19 % | 74 % |

Traducido: **al grupo le sale mal casi siempre.** Un miembro cualquiera recibe
el tramo brutal en el 87 % de las tiradas negativas y en el 76 % de las
positivas. Eso es intencionado y es el chiste central del bot.

**Las dos filas de positivos cambiaron** (eran 17/31/52). Los halagos
perdonaban mucho más que los insultos: uno de cada seis `!sexy` salía con un
piropo de verdad, y en el grupo eso se leyó como "a estos les sale bien todo". A
nadie le extraña que `!rata` insulte, se da por hecho, pero un `!sexy` al 84 %
sí se comenta. Ahora las dos polaridades pegan parecido.

Esa tabla no está copiada aquí a mano: sale de `DISTRIBUCION`, en
`src/commands/percent.js`, que es la misma constante que usa el motor para tirar
y `npm run progreso` para repartir el trabajo. `npm run check` compara esta
sección con ella.

**Consecuencia directa para el contenido:** el tramo brutal es el que la gente
lee constantemente. Los tramos suaves casi no se ven. Por eso el tramo que se
lee lleva más frases (sección 9).

### 3.4. El amaño del owner

Al owner principal se le fuerza el resultado a su favor: franja alta en lo
favorable, baja en lo peyorativo. Pero **no es un amaño limpio**, y el motivo
está comentado en el código: salir 97 o 3 siempre no parece suerte, parece
programado, y el grupo lo notó.

Por eso el owner tiene bandas deliberadamente sosas (45-75 en positivos, 25-55
en negativos). El reparto de hoy es **42 % banda sosa · 50 % la franja que le
favorece · 8 % un resultado malo de verdad, como a cualquiera**. No salir nunca
mal es, en sí mismo, el patrón que delata.

Era 62/20/18 y lo bajó el dueño: perdía tres de cada diez y no era eso lo que se
pidió del amaño. Lo que no se tocó es la FORMA de los números: se sigue tirando
de bandas anchas, así que no vuelven los 97 y 99 repetidos que el grupo cazó en
su día.

`!iq` está fuera del amaño a propósito: es aleatorio puro para todo el mundo.
`!fiel` e `!infiel` tiran uniforme, pero el amaño del dueño sí se les aplica
(sección 4). **`!linda` y `!fea` ya no están fuera**: pasaron a la curva como el
resto, porque repartían un piropo el 31 % de las veces y son de los más usados,
y buena parte de aquel "a estos les sale bien todo" venía de esos dos.

Al escribir no hay que hacer nada especial con esto. Solo saber que al owner le
sale su tramo bueno el 58 % de las veces y `mid` el 34 %, así que **los pools
`mid` no son relleno**: son buena parte de lo que el dueño del bot lee de sí
mismo.

### 3.4 bis. `!feminidad` tiene **tirada propia**

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
- **Al resto le sale mid o high el 90 %.** Aquí `low` casi no se lee y `high` y
  `mid` se leen a partes iguales, justo al revés que en los demás positivos,
  donde el que manda es `low` con el 76 %.

Al escribir: las 25 frases de tramo principal van al `high` (lo declara
`tramoPrincipal: 'high'` junto a sus frases) y el `mid` se queda en 10, como el
resto de tramos secundarios (sección 9). `npm run progreso` mide su tráfico
tirando la función de verdad, así que sale con sus porcentajes reales y no con
los de la tabla general.

### 3.5. El pool `extreme`

Cinco comandos (`sexy`, `crack`, `feminidad`, `masculinidad`, `ganador`) tienen
un cuarto pool. Se añade como **segundo párrafo** cuando el resultado es un
halago alto (`goodIsHigh: true` y 70 o más). Es el remate, no un sustituto.

### 3.6. El mensaje final

```
*@usuario es 87% fea*

[frase del tramo]

[frase del pool extreme, solo si toca]

_[remate del día, solo a veces]_
```

La cabecera la genera el motor. **La frase no debe repetir el porcentaje ni el
nombre del rasgo**, porque ya están escritos justo encima.

El remate del día tampoco se escribe a mano: el motor dice en una línea algo que
ya ha pasado hoy en el chat (el más alto, el más bajo, un empate exacto, que ya
lo habías preguntado). Sale una de cada tres veces y solo si hay algo que decir.

---

## 4. `!fiel` e `!infiel`: la excepción

Estos dos tiran uniforme 0-100: cada número tiene la misma probabilidad, así que
sus tres tramos salen casi igual (31 / 39 / 31 %). Solo se aplica el amaño del
owner, y ahí un 85 % de las veces: el 15 % restante se queda la tirada uniforme,
que es el contrato de estos dos comandos.

Una medida de fidelidad amañada por rol no mide nada: por eso se quedan fuera de
la curva mientras `!linda` y `!fea` entraron.

Sus frases viven aparte, en `src/data/fidelityPhrases.js`.

---

## 5. Cómo se elige la frase dentro del pool

Dos mecanismos que conviene conocer porque **cambian lo que conviene escribir**.

### 5.1. La elección es plana. Ya no hay orden

**Esto cambió y es importante.** Antes los pools se ordenaban de más duro a más
suave al arrancar, y la cabeza salía 8 veces más que la cola. El dueño notó que
el bot "seguía un orden en vez de ser random" y tenía razón: medido sobre 3.000
tiradas en un pool de 200, la frase más usada salía 31 veces y la menos usada 2.

Ahora **todas las frases del tramo tienen la misma probabilidad**. Se quitó el
sesgo y también la función que ordenaba, porque ya no la consultaba nadie.

Qué implica para escribir, y es más exigente que antes:

- **La peor frase de un pool sale tanto como la mejor.** Antes una floja se
  hundía al fondo y casi no aparecía. Ahora tiene las mismas papeletas. Deja de
  importar el techo del pool y pasa a importar el **suelo**: no puede haber
  relleno.
- El vocabulario crudo **sigue siendo el registro del bot** y `npm run progreso`
  lo mide, pero ya no cambia el orden de salida. Úsalo porque es el tono, no por
  un efecto mecánico.

El arsenal que se mide sigue siendo este:

> puto/puta · mierda · joder · coño · polla · cabrón · gilipoyas · pringado ·
> fracasado · inútil · patético · basura · parásito · don nadie · muerto de
> hambre · cero a la izquierda · asco · vergüenza · ridículo · escoria · guarro ·
> cutre · miseria · desperdicio

**Y se puede engañar, así que no lo hagas.** Cuenta palabras, no comprueba que
el español aguante. Pegar `, joder` al final de una frase limpia sube el número
y deja el texto peor. Ya pasó dos veces: la palabrota va integrada en la frase,
nunca añadida detrás.

### 5.2. Ventana anti-repetición: **por qué el tamaño del pool importa tanto**

Una frase no se repite hasta que han salido **otras 50** del mismo pool, en el
mismo grupo y el mismo tramo. Suena bien, pero tiene un efecto brutal en pools
pequeños.

Se bloquea como mucho el **60 % del pool**, nunca "todo menos una":

```
pool de 300 frases  →  50 bloqueadas  →  250 disponibles   ✅
pool de 100 frases  →  50 bloqueadas  →   50 disponibles   ✅
pool de  50 frases  →  30 bloqueadas  →   20 disponibles   ✅
pool de  21 frases  →  12 bloqueadas  →    9 disponibles   ⚠️ pocas distintas
```

Lo que importa entonces no es la holgura, es **cuántas frases distintas ve el
grupo antes de que empiece a repetirse el ciclo**, que es simplemente el tamaño
del pool.

Y el historial **sobrevive a los reinicios**: se guarda en disco, así que un
reinicio de pm2 ya no borra la ventana.

**Los tramos de porcentaje y los de `!rizz` no usan esta ventana: van en
baraja** (`pickBaraja`). Desde que el dueño los dejó en 25 y 10 frases, la
ventana del 60 % se quedaba corta: en un tramo de diez, una frase podía volver
con solo seis de por medio. La baraja las saca todas en orden aleatorio antes de
repetir ninguna, y la última de una vuelta nunca abre la siguiente. El historial
es el mismo fichero, así que también sobrevive a los reinicios.

---

## 5 bis. El humor del bot: el suelo de oro

Esta sección no es de estilo: es el criterio con el que se acepta o se tira una
frase. Sale del corpus que ya funciona y de lo que el dueño ha pedido con sus
palabras.

### El suelo de oro

Con la elección plana (5.1), la peor frase de un pool sale tanto como la mejor.
Un pool vale lo que vale su peor frase, y por eso el bot tiene un **suelo de
oro**: una frase entra si está a la altura de las mejores que ya tiene. Si no
llega, no entra, aunque el pool se quede corto.

- **El tamaño es un tope, no una meta.** Los números de la sección 9 dicen hasta
  dónde tiene sentido llenar. Diez frases de oro valen más que cien con relleno,
  y el recorte de los % a 25 y 10 lo demostró.
- **En la duda, fuera.** El listón no es que la frase no tenga fallos: es que
  sea de las mejores del pool.
- **Una nueva entra sacando otra peor**, no sumándose al montón.

### El registro

El dueño lo dejó dicho: el estándar es ser **filoso, ofensivo, hiriente y
directo, con lenguaje vulgar**. Un insulto abstracto no hiere a nadie: la frase
tiene que decirle a esa persona algo concreto que le duela.

> Mal: «Tienes principios, pero flexibles. Y unos principios flexibles no son
> principios.»
> Bien: «Guardas capturas de conversaciones de hace años por si algún día
> sirven.»

La primera es una sentencia que vale para cualquiera. La segunda es algo que
alguien hace, y quien lo hace se reconoce.

### Lo que tiene que tener

**1. La frase termina en una imagen concreta, no en un insulto.** El insulto es
el material. La imagen es el chiste. Si quitas los tacos y no queda nada, no hay
frase.

> «Tu cuarto tiene ecosistema propio: hay cosas viviendo en esos platos que la
> ciencia aún no clasificó.»

Eso es `cerdo.high`. Lo que se recuerda es el plato.

**2. El dato técnico, dicho en serio, es más cruel que el adjetivo.** El bot
mide. No dice «eres feo»: dice qué hueso.

> «Tienes el arco cigomático plano y el mentón retraído.»
> «Canthal tilt positivo y una armonía que la gente paga miles por fingir.»

**3. El bot dicta un veredicto.** Habla como quien lee un parte, no como quien
está picado ni como quien da un consejo.

> «Fealdad inexistente. El bot ha rebuscado en cada rasgo y ha vuelto con las
> manos vacías.»
> «El aura se ha equivocado y no piensa rectificar.»

Por eso tampoco hay moraleja. «Ahí está la diferencia», «Algo es algo» o «En
esto la continuidad es todo» son frases de coach, y un veredicto no aconseja.

**4. Frases cortas y planas, con el peso al final.** Sujeto, golpe, punto. Una
frase, una línea: lo que necesita párrafo se queda fuera.

> «De ganador, el discurso. De resultado, una puta nada.»
> «Prometes mucho y sostienes una mierda. Lo que cuenta es lo que sostienes. Tú
> sueltas. Siempre.»

**5. El taco va dentro de la frase, nunca pegado detrás.** Pegar `, joder` o
`, cabrón` al final de una frase neutra es una coletilla: sube el arsenal que
mide `npm run progreso` y deja el texto peor. Es trampa y se nota.

> Bien: «Suerte de gilipoyas y ni una gota de mérito.»
> Mal: «No has ganado nada. Y, cabrón, punto final del parte.»

**6. El halago también cobra.** Cuando toca cumplido, se dice de verdad y se
cobra al final. Un halago limpio es tan defecto como un insulto en el tramo del
halago.

> «Estructura buena, piel buena, proporciones buenas. Aburrido de leer y
> molesto de aceptar.»

### Lo que la tira

**7. La analogía barata.** Si el chiste es el objeto («Café de máquina: dos
sorbos y a cenicero», «Nokia que aún enciende», «Besas el cubilete vacío»), la
frase no va. Se le puede mandar a cualquiera del grupo sin cambiar una letra, y
por eso no duele. Habla de lo que esa persona *acaba de hacer*. `como quien` más
un verbo sí vale: colorea una actitud, no sustituye al ataque.

**8. La frase que no habla de nadie.** Si no hay un tú, un nombre o algo que esa
persona haya hecho, vale para cualquiera, y lo que vale para cualquiera no le
duele a nadie. `npm run frases` la cuenta como `nadie`.

**9. El género dado por hecho.** En el grupo hay mujeres, y una frase escrita
para un tío les llega con su nombre delante. Falla de tres formas:

- **La concordancia.** «Eres el que reenvía capturas», «el típico que», «este
  cabrón» como sujeto, «eres tan traidor», «te quedas solo», «dominarlo
  dormido». La forma neutra es *eres quien*, y para *eres el tío que*, *eres de
  esa gente que*.
- **El cuerpo.** «Tu polla», «la erección»: da por hecho lo que tiene esa
  persona entre las piernas.
- **La pareja.** «La novia», «de ella», «tres grupos de amigas»: da por hecho a
  quién le gusta.

Un «cabrón» suelto al final no cuenta como género: es el registro del bot y se
usa igual con cualquiera. Quedan fuera de la regla los comandos que van de
género a propósito (`!masculinidad`, `!feminidad`, `!gay`, `!maricon`,
`!femboy`, `!puta`, `!guarra`, `!linda`) y el pool de `!fuck`, que el dueño
quiere así. La capa 44 del check se queda corta: en las acciones mira
«%V se queda quieto» y el «lo» que va por %V, pero no el «la», y en el resto
solo caza «eres el que» y «eres el tío que», y solo en `src/data/`. Lo demás lo
tiene que ver quien escribe.

**10. La amenaza de echar.** El bot no amenaza con echar a nadie. Echar es cosa
de `!kick` y de la purga, que es cuando pasa de verdad, y una amenaza que no se
cumple le quita peso a las que sí.

### Que no parezca escrito por una máquina

Es la regla que está por encima de las otras, porque es la única cuyo
incumplimiento no se arregla reescribiendo una frase: se arregla tirando el lote
entero.

El corpus está limpio de los tics clásicos: *"no solo… sino"*, *"cabe
destacar"*, disculpas, matices, emoji de adorno. Lo que delata a la máquina es
esto, por orden de gravedad:

**1. La variación de una sola tesis. Este es el rastro de verdad.** Un humano
que escribe cien insultos se cansa del ángulo y cambia de tema. Una máquina
produce cien versiones del mismo. Antes del recorte, `incel.high` repetía la
misma idea (teoría sin práctica) desde la frase 27 hasta el final, cambiando
solo el decorado: enciclopedia, guía turística, laboratorio, grada.

La prueba: si dos frases del mismo pool se pueden resumir con la misma línea,
sobra una. Escribe menos y escribe distinto. Con la elección plana, el eco sale
tanto como el original.

**2. La plantilla.** Una construcción repetida a escala se lee como un molde
relleno, aunque cada relleno sea distinto. Las tres que más se ven aquí son
*«Ni X ni Y»* para abrir (hoy la usan 41 frases), *«Eso no es X, es Y»* para
rematar y una etiqueta al final del tipo *«<insulto> de <cosa>»* o *«Puto X con
Y»*. Valen como recurso. No valen como arranque o cierre por defecto.

**3. El bot hablando de sí mismo como programa.** El bot es una voz que dicta un
veredicto, no un software que se queja de su carga de trabajo. *"El bot casi se
apaga de aburrimiento procesándote"* rompe el personaje en una línea: admite que
hay un proceso, y donde hay un proceso no hay nadie mirándote.

Que el bot se nombre en tercera persona SÍ vale, y es parte de la voz: *"El bot
ha rebuscado en cada rasgo y ha vuelto con las manos vacías"*. La diferencia es
autoridad contra maquinaria. Hablar de *el algoritmo* como se habla de Instagram
o TikTok tampoco cuenta: eso es jerga del grupo.

**4. La raya larga y el punto y coma.** Nadie escribe eso en un grupo de
WhatsApp. Hoy quedan 11 frases con raya y 37 con punto y coma, y cada una delata
que el texto se redactó, no se soltó.

**Lo que NO significa esta regla:** no significa escribir mal. El bot tiene las
tildes puestas y la sintaxis correcta a propósito: es un narrador, no un miembro
más del grupo tecleando con prisa. Un bot que escribe "q" y "xq" no parece más
humano: parece un bot imitando a un humano, que es peor.

Y dos palabras van como las quiere el dueño: la familia de «gilipoyas» se
escribe con y, y hay otra que mandó quitar de todo el bot. Las vigilan las capas
117 y 114 del check.

### A quién pega el bot y a quién no

El bot no reparte crueldad a partes iguales. Tiene un criterio, y decide en qué
tramo va cada frase antes que ninguna otra cosa.

**La actividad se proclama.** Quien escribe sostiene el grupo. Cuando el bot lo
nombra, lo dice como quien lee un parte de méritos: corto, seco, sin sarcasmo.
No es un aplauso, porque el bot no anima a nadie: es un reconocimiento de
hechos.

> «El resto desaparece el puente. Tú no. Por eso el grupo sigue abierto.»
> «Tu nombre sale en más conversaciones que el de cualquier otro. No por
> casualidad.»

Eso es proclamar: se reconoce lo que ha hecho, y si hay taco va de refuerzo, no
en su contra.

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

**Al que gana no se le quita la victoria.** Ganar aura no necesita chiste. Si lo
lleva, **va sobre su economía, no sobre el hecho de ganar** (lo fijó el dueño):

- **Pobre** (menos de 1.500 después de cobrar): se le recuerda que es un muerto
  de hambre. *«Hoy cenas, muerto de hambre.»*
- **Rico** (1.500 o más): se le recuerda que es rico dentro de un bot de
  WhatsApp, que es bastante miserable. *«Rico. En aura. En un bot. Piénsalo un
  segundo.»*

Por eso `gain` ya no existe: son `gainPobre` y `gainRico`, y el motor elige por
el saldo que sale en la primera línea del mensaje (`UMBRAL_RICO` en aura.js).

Lo que sigue prohibido es usar la victoria como palo:

> Bien: «La mesa paga y se te queda mirando con odio.»
> Bien: «Nadie sabía cómo quitarte el respeto que acabas de ganar.»
> Mal: «Sumaste algo. No es para celebrar, pero al menos hoy no diste el
> papelón de siempre.»
> Mal: «Te dieron el pan de la cesta que nadie cogió. Gratis, duro, y tú
> haciendo fiesta.»

Los dos malos eran del antiguo `gain`, que estaba escrito así de arriba abajo:
la ganancia como palo para pegarle al que gana, envuelta en analogías (café de
máquina, miga de croissant, modo ahorro). Se reescribió entero: ni analogía ni
palo por ganar, solo su economía.

**Al que pierde se le remata.** Aquí sí va el arsenal entero.

`npm run progreso` ya distingue los dos grupos: solo exige filo a los pools que
rematan. Un pool de victoria con el arsenal por las nubes es el bot insultando
al ganador, y eso es un defecto, no un pool sin trabajar.

### El refuerzo: cómo escribe Rockstar

Sirve para lo que al bot le falta hoy, que es el registro de sus
**instituciones**: la tienda, el bote, la caja, el cartel de buscados, el
asalto. Cuatro cosas que se copian y tres que no.

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
  tampoco puede.
- **El chiste largo.** Una frase, una línea.

---

## 6. Dónde falta contenido

**No lo mires aquí: pregúntaselo al repo.** Esta sección tenía una tabla escrita
a mano y envejeció en horas.

```
npm run progreso
```

Da el porcentaje del corpus a estándar, ponderado por cuánto se lee cada pool y
no por cuántos ficheros se han tocado, y la lista de lo que falta ordenada por
impacto real. Mide dos cosas objetivas: tamaño suficiente para el tráfico y filo
(arsenal por encima del 50 %), esto último solo en los pools cuyo trabajo es
hacer daño. En los de halago no se exige.

Lo que **no** mide es si la frase está bien escrita. Es un mínimo, no un
aprobado: un pool puede cumplir tamaño y filo y estar lejos del suelo de oro.

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
6. Mínimo 25 caracteres: por debajo, `pools` y `placeholders` no la reconocen
   como frase.

Un fichero de datos completo termina exportando sus pools:

```js
module.exports = { POOL_A, POOL_B };
```

---

## 8. Placeholders: el contrato

Un placeholder es un hueco que el motor rellena. **Cada fichero tiene permitido
un juego concreto y solo ese.** Usar otro no da error al arrancar: sale
literalmente escrito en el grupo.

Ya pasó: `!maricon` se escribió con `%N` mientras `percent.js` sustituye
`[nombre]`, y durante 292 frases el grupo leyó *"%N sale con un cero..."*. Por
eso existe el validador.

**La tabla que manda es `CONTRATO`, en `scripts/placeholders.js`.** Esta es su
copia legible. Si las dos discrepan, la del código tiene razón.

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
| `casino.js` (los bonos) | `%M` el hito que se acaba de cruzar (50, 100, 200, 500 o 1.000). **Nunca escribas el número a mano dentro de la frase**: Tier 1 tiene tres hitos y las frases se quedaron diciendo «200 mensajes» en los tres, así que la cabecera y el cuerpo del mismo mensaje se contradecían. Lo sustituye `casino.js` al elegir la frase |
| `activity.js`, `duel.js` | `%W` ganador, `%L` perdedor |
| `accionPhrases.js` | `%A` quien la hace, `%V` quien la recibe |
| `rencorPhrases.js` (la memoria de rencor) | `%A` quien gana hoy (en el robo, quien roba), `%V` quien pierde (a quien roban), `%D` cuándo fue la vez anterior («ayer», «el martes»), `%C` la cifra de entonces, `%N` cuántas seguidas (solo en las rachas). Toda frase nombra a **los dos** y dice **cuándo**: la capa 109 lo exige |
| `avisos.js` | `%V` la persona del cartel del día. **Solo el pool `OBJETIVO_DIA_CARTEL` lo usa**. El resto de avisos van sin huecos, se mandan tal cual. Lo sustituye el manejador de mensajes, no un comando, porque ese cartel se cuelga solo con el primer mensaje del día y no lo pide nadie |
| `mog.js` | `%M` / `%L` |
| `iq.js` | `%IQ` |
| `topsRandom.js` | `{N}` |
| `ship.js`, `social.js`, `aura.js`, `cooldownPhrases.js`, `auraCobro.js` | **ninguno** |

`[nombre]` es **opcional** en `percentLabels.js`: si la frase no lo lleva, no
pasa nada. Mézclalo, porque que todas las frases empiecen con el nombre canta.

---

## 9. Cuántas frases escribir

**En los comandos de porcentaje y en `!rizz`, lo fijó el dueño: 25 frases en el
tramo de la paliza y 10 en cada uno de los otros dos.** Y ninguna más: se
recortaron de cien, cincuenta y veinticinco quedándose con las mejores. Con la
elección plana (sección 5.1) la peor frase de un pool sale tanto como la mejor,
así que el relleno no es neutro: hace daño. Mejor tramo corto y filoso que
inflado.

**La paliza es el tramo que el grupo lee casi siempre**, y por eso el que lleva
las 25. En comandos **negativos** (`fea`, `guarra`, `cerdo`, `rata`…) es `high`,
con el 87 % de las tiradas. En los **positivos** (`linda`, `ganador`, `sexy`,
`crack`, `masculinidad`, y también `!rizz`) es **`low`**, con el 76 %, y `high`
solo sale el 6 %.

| | high | mid | low |
|---|---|---|---|
| **Negativos** | **25** (87 %) | 10 (9 %) | 10 (4 %) |
| **Positivos** y `!rizz` | 10 (6 %) | 10 (18 %) | **25** (76 %) |
| **`feminidad`** (tirada propia) | **25** (45 %) | 10 (45 %) | 10 (10 %) |
| **`infiel`** (uniforme) | **25** (31 %) | 10 (39 %) | 10 (31 %) |
| **`fiel`** (uniforme) | 10 (31 %) | 10 (39 %) | **25** (31 %) |

`!feminidad` es la excepción: al grupo le sale alta o media, así que sus 25 van
al `high` (sección 3.4 bis). `!fiel` e `!infiel` tiran uniforme y sus tramos
salen casi igual, así que las 25 van a su paliza: `low` en fiel, `high` en
infiel. Los `extreme` no entran en la cuenta.

La regla no está copiada en ningún sitio: vive en `percent.js` (`TAMANO_TRAMO` y
`tramoPrincipal`), la leen `npm run progreso` y `npm run pools`, y **la capa 120
de `npm run check` no deja pasar un tramo con otro tamaño**. Si hace falta una
frase nueva, entra sacando otra.

**Aplicar la regla por el nombre del tramo en vez de por el tráfico es el error
que ya se cometió una vez**: dejó a `!linda`, `!sexy`, `!crack` y `!ganador` con
100 frases en el tramo que se ve el 6 % de las veces y 25 en el que se ve el
76 %.

Y se cometió una segunda vez, en el propio medidor: `npm run progreso` guardaba
su copia de la tabla de tráfico y se quedó en el reparto viejo de los positivos
(17/31/52) cuando el motor ya tiraba 6/18/76. Durante semanas pidió 50 frases
para un tramo que se lee el 18 % y daba por bueno el que se lee el 76 %. Hoy lee
la tabla del motor, y no hay segunda copia.

Fuera de los tramos de porcentaje y de `!rizz` sigue la regla por tráfico, que
pide 100 frases al pool que se lee la mitad de las veces o más, 50 al que se lee
una de cada cuatro y 25 al resto, mirando el pool concreto:

| Cuándo sale ese pool | Tope | Hoy |
|---|---|---|
| En cada uso de un comando frecuente (tramos de `iq`, veredictos de `ship`) | 100-200 | `iq` entre 30 y 50 por tramo, `ship` 60 |
| Desenlace común de un comando frecuente (`ROB_WIN`, `ROB_FAIL`) | no hace falta más | 183 y 268 |
| Ruta rara (tienda de `robo`, escudo, contraataque) | ~100, por decisión del dueño | 30 por pool |
| Apuesta de aura (cooldown 3 h) | ~60 | 62 y 60 |
| Hitos de racha | ~50 | 50 |

Son topes, no metas (sección 5 bis). Un pool que no llega con frases de oro se
queda corto, y eso es mejor que llenarlo.

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
npm run frases         ← mide siete defectos de escritura en las 8.084 frases
```

Los dos últimos miran las frases, y **no miran lo mismo**.

`npm run analogias` cuenta marcas: las líneas con `// ANALOGÍA`. Eran 225, en
`AURA.gain`, `AURA.loss`, el cooldown de `!aura`, `MAL_ESCRITO` y tres líneas
del roast de acciones, y hoy da cero: el encargo está cerrado y `PENDIENTE.md`
queda de registro. Devuelve 1 si reaparece alguna y 0 si no, así que sigue
sirviendo de puerta.

`npm run frases` no cuenta marcas: **mide el texto**, las 8.084 frases de los 255
pools del bot, sin que nadie haya tenido que etiquetar nada. Busca siete
defectos:

| familia | qué es | hoy |
|---|---|---|
| `nadie` | la frase no menciona a la persona: vale para cualquiera | 1046 |
| `analogia` | el chiste es el objeto («tu lealtad es como el wifi del vecino») | 68 |
| `coletilla` | frase neutra y el insulto pegado detrás con una coma | 601 |
| `eco` | abre repitiendo la etiqueta del comando («Rata que…» en `!rata`) | 12 |
| `molde` | cuatro o más del mismo pool empiezan igual | 725 |
| `enlatado` | el mismo bloque de cinco palabras en cuatro frases o más | 415 |
| `roto` | daño mecánico de una edición masiva anterior | 2 |

Son 2.556 frases distintas con al menos un defecto: el **32 %** del bot. Esta
guía decía 22 %, pero se medía sobre 6.208 frases: el informe se dejaba fuera
los pools que viven en `src/commands/` y los avisos de `!kick`, y no veía las
coletillas con tilde («, cabrón.», «, inútil.»). No ha entrado ninguna frase
mala: estaban y no se veían.

`nadie` es la que más explica y la que ninguna expresión regular veía antes,
porque estas frases no comparan con «como» ni con «más que»: sueltan una imagen
y se van. «Café de máquina: dos sorbos y a cenicero.» No hay comparación que
cazar, y tampoco hay nadie dentro. En el antiguo `gain` de `!aura`, 74 de 120
frases no mencionaban a quien acababa de ganar.

`npm run frases -- --techo` compara con la foto del día que se midió y falla si
alguna familia ha CRECIDO. Reescribir un pool tiene que bajar estos números, y
cuando bajan se bajan también en la cabecera de `scripts/frases.js` para que el
techo se quede apretado. `npm run frases -- --pools` dice qué pools revisa.

`npm run acciones` es el único que **sale a internet**: le pregunta a la web de
gifs por cada categoría que tiene configurada el bot. Existe porque una
categoría mal escrita no se ve: el comando queda montado, sale en el menú,
alguien lo escribe, la web contesta 404, el bot devuelve el aura y dice que no
pudo traer nada. Desde fuera parece que la web va mal un día, y en realidad ese
comando no ha funcionado nunca. Por eso no entra en `check`: un validador que
depende de que una web ajena esté en pie se pone rojo por motivos que no tienen
nada que ver con el código.

**`npm run check` es el que importa.** Empezó con cuatro capas y hoy son 120.
Las cuatro primeras siguen siendo las que pillan lo que rompe el bot al escribir
frases:

1. **Compila.** Cada `.js` es JavaScript válido. Pilla comillas sin escapar y
   frases partidas en dos líneas, los dos fallos que ya tumbaron el bot.
2. **Carga.** Cada módulo importa. Pilla requires rotos y funciones que ya no
   existen.
3. **Responde.** Ejecuta los comandos muchas veces cada uno. Pilla excepciones y
   placeholders que llegan sin sustituir.
4. **Guardan.** Comprueba que aura, casino, racha, contador y banlist se
   comportan. Se salta sola si el bot está corriendo, para no pisarle los datos.

Las demás son del motor (permisos, economía, red, despliegue) y no hace falta
entenderlas para escribir. Estas sí tocan al contenido y conviene saberlas:

- **31b** revisa las tildes de las frases: las palabras cuya forma sin tilde no
  existe en castellano, y los gerundios e infinitivos con pronombre pegado.
- **33a** caza voseo, frases pegadas y basura tipo `undefined` dentro de un
  texto.
- **17** caza las frases repetidas y también las que se diferencian en una
  palabra. «…para tapar un hueco que sigue igual de grande» y «…para tapar un
  vacío que sigue igual de grande» son la misma frase para quien la lee. Y no
  deja que la misma frase salga en dos resultados de `!robo`: si el texto de un
  robo normal es el de uno maestro, el resultado deja de decir nada.
- **44** es la regla del género (sección 5 bis, punto 9).
- **114** y **117** son las dos palabras del dueño (sección 5 bis).
- **120** exige los tamaños de los tramos de % y de `!rizz` (sección 9).

Las capas 2 en adelante necesitan `npm install`. La 1 corre siempre y es la que
detecta el bot caído.

**Aviso que ya costó caro:** `placeholders` y `pools` salieron EN VERDE con el
bot sin arrancar, porque comparan líneas con expresiones regulares y no compilan
nada. Por eso `check` es obligatorio.

Checklist:

- [ ] ¿Está a la altura de las mejores del pool? Si dudas, no entra.
- [ ] ¿Dice algo concreto de esa persona, o vale para cualquiera?
- [ ] ¿Le llega igual a una tía que a un tío?
- [ ] ¿La polaridad es la correcta? (`goodIsHigh`, sección 3.2)
- [ ] ¿El tramo coincide con el tono?
- [ ] ¿Los placeholders son los permitidos para ese fichero? (sección 8)
- [ ] ¿Una frase por línea, comillas simples, coma final?
- [ ] ¿Sin duplicados exactos dentro del mismo pool?
- [ ] ¿`progreso` no saca casi-clones ni **molde** de lo que acabas de escribir?
- [ ] ¿`npm run frases -- --techo` sigue en verde?
- [ ] Los comandos de arriba, en verde

**El molde** es la medida de `npm run progreso` para la plantilla de la sección
5 bis: la misma FORMA repetida aunque cada relleno sea distinto. Los casi-clones
comparan palabras, así que sesenta frases con el mismo esqueleto y sesenta
vocabularios pasan limpias, y el grupo oye el esqueleto igual. Se mira cómo
CIERRA cada frase. Un pool sano del bot anda entre el 3 % y el 19 %, y por
encima del 30 % es un molde y hay que reescribir. Pasó con `ROAST_USUARIO`, que
cerraba la mitad de sus sesenta frases con la forma *"<insulto> de <cosa>"*.

---

## 10 bis. Lo que NO se hace, y por qué

Siete incidentes. Léelos antes de tocar nada.

**1. Nada de transformaciones globales sobre un fichero.** Un filtro de "mínimo
100 caracteres" aplicado a `percent.js` entero borró 3.872 líneas: 53 pools
perdieron frases y 14 quedaron vacíos. Con un pool vacío el comando no se
repite, **lanza una excepción**: `pickFresh` devolvía `undefined` y el
`.replace` de `runPercent` reventaba. Cinco comandos muertos.

**2. Un reemplazo masivo tocó ficheros que no eran suyos.** Metió un punto donde
no va (`'Mientras %W llenaba. el chat...'`) en 1.780 líneas de 52 ficheros,
1.638 de ellas frases que el grupo iba a leer. Y llegó a `helpers.js` y
`economia.js`, que son el motor.

**3. El arsenal se puede inflar y se notó.** Pegar `, joder` al final de frases
limpias subía el número y dejaba el texto roto: `'...se defendió como se
defiende de todo: mal. y, cabrón punto final del parte.'`

**4. Un script no se pasa dos veces sobre su propia salida.** De ahí salieron 37
frases con rachas de barras invertidas: el bot imprimía literalmente
`It\\\\\\\\'s over`. Cada pasada vuelve a escapar lo que ya estaba escapado, así
que el daño se multiplica y no da ningún error: compila perfecto y solo se ve en
el chat.

**5. No se rellena un pool clonando frases.** Los pools de país de `!roast`
figuraban con 50 y 20 frases, y de contenido real había 10 y 5. El resto eran la
misma frase con una coletilla pegada encima. Un pool inflado es peor que un pool
corto: el validador lo da por bueno y el grupo ve la misma frase con distinto
final. **El roast por país acabó quitándose entero** (no quedan frases ni
`%PAIS` en el contrato), pero el incidente se queda escrito porque el método de
relleno es lo que no hay que repetir.

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

**7. Nada de líneas de adorno.** Ni `╾━━━━━━╼` bajo los títulos ni `━━ *X* ━━`
alrededor de las cabeceras. El dueño: «son inmediatamente visibles como
producto de IA». Un título en negrita y una línea en blanco ya separan. La capa
106 del check no deja pasar ninguna.

La regla que sale de todos: **edita el pool que estás trabajando y solo ese.**
Un cambio que toca 62 pools para arreglar 6 va a romper algo siempre.

---

## 11. Otros sistemas, en breve

Solo lo que cambia cómo se escriben sus frases. Lo demás está en `MOTOR.md`.

- **Aura** (`!aura`): economía con saldo, apuestas (cooldown 3 h), robos y
  rachas diarias. Tono de las apuestas: crónica de sucesos, no roast. Ganar
  suena a hazaña y perder a velatorio con sorna. El bot no consuela.
- **Robo** (`!robo`): tiene los pools más grandes del bot (`ROB_FAIL`, 268
  frases).
- **La caja** (`!vault` · `!lock` · `!unlock`): se guarda aura donde no se puede
  robar, con un enfriamiento al meter y una comisión al sacar que va al bote.
  Sus frases están en `src/data/vaultPhrases.js` y su registro es propio: **no
  es un banco**. Aquí nadie "realiza una operación": se echa el candado y se
  mira por encima del hombro. El bot no felicita al que guarda: le recuerda que
  esconder es de cobardes y que sacarlo va a costarle dinero.
- **Expediente** (`!caso` · `!expediente`): no tira dados. Junta lo que el bot
  ya guarda de alguien (mensajes, aura y caja, robos de la semana, precio en la
  cabeza, veto de la tienda, objetivo del día, último día que escribió) y dicta
  UN veredicto por orden de gravedad: la inactividad primero, luego las deudas y
  los robos, y rico o pobre al final (rico es 1.500 o más contando la caja). Los
  veredictos están en `src/commands/caso.js` y siguen dos reglas: **sin género**
  (se dice lo que hace, no «callado» ni «buscado») y **al que sostiene el grupo
  no se le reprocha escribir**. Del dueño no hay expediente: silencio, y se
  devuelve lo cobrado.
- **Memoria de rencor** (`src/utils/rencor.js`): el bot se acuerda de lo que
  pasó entre dos personas en `!mog`, `!duel`, `!robo` y `!ship`, y lo saca la
  próxima vez que se cruzan: *«El martes @B ya perdió contra @A. Hoy lo ha
  vuelto a pedir y se lo ha vuelto a comer entero.»* Sale **una vez al día por
  pareja** (el primer cruce) y solo si la vez anterior fue otro día. Es **solo
  texto**: no toca aura, ni tiradas, ni echa a nadie. Y **nada del tier dueño**
  se apunta ni se cita, porque sus rachas delatarían el amaño. Situaciones:
  repite, revancha y racha (tres o más). En el robo, reincide, venganza, se le
  acaba y ni vengarse. En el ship, sube, baja o igual. Las frases, en
  `src/data/rencorPhrases.js`.
- **Racha**: solo habla en hitos (7, 15, 30, 50, 100, 200, 365 días) y al romper
  una racha larga. El resto de días paga en silencio, a propósito.
- **Acciones**: veinticinco, veintiuna normales y cuatro explícitas (`!fuck`,
  `!anal`, `!cum`, `!spank`). Mandan un gif de anime dirigido a alguien y llevan
  una frase con las dos menciones. Un pool de treinta por acción en
  `src/data/accionPhrases.js`, más `ROAST_USUARIO`. Hay otros cinco pools
  escritos y aparcados (`SEDUCE`, `PREG`, `UNDRESS`, `LICKASS`, `GROPE`): la
  fuente no tiene esas categorías, no tienen comando y no se leen.

  **Los cuatro registros**, que es lo que hay que tener en la cabeza antes de
  escribir una sola frase:

  | Registro | Cuáles | Dónde está el chiste |
  |---|---|---|
  | Sumisión | `!hug` `!kiss` `!cuddle` `!pat` `!handhold` `!feed` `!nom` `!peck` `!tickle` `!sleep` `!pout` | en que **quien recibe cede**: hace sitio sin que se lo pidan, agacha la cabeza, abre la boca, ve la trampa y pasa por ella igual. Su decisión, no el gesto |
  | Violencia | `!punch` `!slap` `!stomp` `!bonk` `!chomp` `!yeet` `!kill` | física: dónde pega, qué se rompe, cómo suena. No se arregla con un taco al final |
  | Incomodidad | `!stare` `!laugh` `!bleh` | no se toca a nadie y marca igual. `!laugh` es el único donde el chiste no es quien lo recibe, sino que no lo era. En `!bleh`, quien recibe se queda sin respuesta |
  | Explícito | `!fuck` `!anal` `!cum` `!spank` | crudo de verdad, no insinuado, y a tres tiempos: acto, reacción y el complemento que remata. `!cum` cuenta el después: cómo queda quien lo recibe |

  Y tres reglas que valen para todas: **la frase no describe la acción, la
  comenta** (el gif ya se ve, y contar otra vez lo que pasa es escribir el pie
  de una foto), **el chiste apunta a quien la recibe, nunca a quien la manda**, y
  **ni %A ni %V tienen género**: cualquiera del grupo cae en cualquiera de las
  dos menciones, así que una frase que dice «él» o cierra en -o falla el día que
  le toca a ellas, con su nombre delante. La excepción es `!fuck`, que el dueño
  quiere así.

  `ROAST_USUARIO` va **en otro mensaje**, en cursiva, y se ríe de quien ha pagado
  aura por mandar un gesto animado a alguien que tiene a dos metros. **Sale una
  de cada cinco acciones del grupo**, no en todas: se usan en ráfaga y un
  segundo mensaje debajo de cada una deja de leerse a las tres veces. Que salga
  menos significa que cada una de esas frases se lee menos y tiene que aguantar
  sola: una de relleno ahí canta más que en cualquier otro pool. Al tier dueño
  no se le remata, y sus acciones tampoco gastan turno.

  **Sin frases no hay comando**: mientras un pool no exista, esa acción no sale
  en el menú, no la sugiere el corrector, no cobra y no contesta. Se enciende
  sola al exportar el pool, y `npm run check` revienta si el menú anuncia una
  apagada o se calla una encendida.
- **El cartel del día** (`avisos.js`, pool `OBJETIVO_DIA_CARTEL`): lo único que
  el bot dice sin que nadie le hable y que no es moderación. Anuncia quién es el
  objetivo del día y se cuelga con el primer mensaje del día, dos veces como
  mucho. Si no hay objetivo posible, silencio: anunciar que hoy no hay cartel es
  ruido.
