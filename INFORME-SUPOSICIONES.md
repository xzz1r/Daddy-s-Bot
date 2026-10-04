# Frases que dan por hecho lo que el bot no sabe — 4 oct 2026

## Hecho — 4 oct 2026

Reescritas en su sitio todas las frases de abajo menos siete. Después, una pasada más a cero tolerancia sobre todo lo revisado, acciones incluidas: unas 110 frases más con «como siempre», historiales inventados, objetos o rasgos que la persona no tiene por qué tener (gafas, coche, oficina) y cosas que el bot decía haber hecho sin hacerlas («he revisado vuestro historial», «he preguntado al grupo»).

Sin tocar, a propósito:
- Los siete ejemplos del dueño marcados como intocables en `aura.js` (`blessed` 139, 140, 141; `loss` 250, 251, 254; `cursed` 318).
- Los pools sexuales, `!gay`, `!maricon`, `!femboy`, `PIROPOS` y `WINGMAN_ANECDOTAS`, que no se han revisado.

`npm run check` en verde y `npm run frases` baja de 1.212 a 1.157 frases con defecto.

La lista de abajo es la de antes de reescribir: las frases citadas ya no están en el bot.


Solo marcadas, sin tocar. Cada línea lleva el fichero, la línea del fichero, la frase y lo que da por hecho.

Dos pasadas. La primera marcó lo que falla siempre. La segunda (²) es más estricta: añade lo que falla a menudo, como «como siempre», la cara que pone, lo que piensa o la reacción del grupo, y en los porcentajes los hechos concretos que se pueden comprobar (la foto de perfil, «compartes piso», «el año pasado fuiste a un salón del manga»).

El criterio: la frase afirma algo de esta persona o de este momento que el bot no tiene, y que quien la lee puede ver que es falso. Es lo que deja a la gente con un «¿qué?».

Lo que más se repite:

1. **Inventa la reacción del grupo.** «El grupo siguió hablando de comida», «alguien ha escrito tu nombre y lo ha borrado». La tirada acaba de salir y nadie ha dicho nada. Casi todo está en `aura.js`.
2. **Da por hecho que es la segunda vez.** La espera del top es del grupo, pero la frase le dice «no hace falta mirarlo cada rato» a quien lo pide por primera vez.
3. **Da por hecho cómo le fue antes.** «Quieres recuperar lo perdido» a quien ganó, o «el cebo es tu pobreza» a quien es rico.
4. **Inventa números que sí existen.** En `!count`, «por los pelos» o «el cuarto ya está lejos» salen al azar, sin mirar la diferencia real.
5. **Inventa lo que hay en la foto o en el enlace:** «tu cara», «era publicidad».
6. **Da por hecho quién retó a quién** (`!duel`) **o que esos dos se gustan** (`!ship`).
7. **Tiempo inventado:** «meses» a quien entró ayer, «la tarde» a medianoche, «un domingo».
8. **Vida inventada:** pareja, ex, madre, prima, trabajo.

No entran:

- El veredicto de un %, un IQ o un rizz, que por diseño describe un hábito («guardas capturas de hace años»). Ahí solo se marca lo que inventa una persona o un hecho concreto.
- Las escenas de las acciones (unas 660), que son ficción: «%V suspira», «%V se pone de rodillas». Solo se marca cuando inventan un historial. Si las quieres dentro, casi todas narran lo que hace %V.
- Los pools sexuales, `!gay`, `!maricon`, `!femboy`, `PIROPOS` y `WINGMAN_ANECDOTAS`, que no se han revisado.

De estas frases, cinco son de las que escribí ayer (`VER_UNA_VEZ`).

## Cuentas

| Fichero | Frases |
|---|---|
| `src/commands/aura.js` | 52 |
| `src/data/percentLabels.js` | 50 |
| `src/data/roboExtraPhrases.js` | 42 |
| `src/data/cooldownPhrases.js` | 36 |
| `src/data/fidelityPhrases.js` | 28 |
| `src/commands/ship.js` | 20 |
| `src/data/avisos.js` | 19 |
| `src/data/apuestaPhrases.js` | 16 |
| `src/commands/count.js` | 16 |
| `src/commands/activity.js` | 15 |
| `src/data/roastPhrases.js` | 11 |
| `src/data/rencorPhrases.js` | 10 |
| `src/data/roboPhrases.js` | 7 |
| `src/commands/duel.js` | 7 |
| `src/utils/casino.js` | 7 |
| `src/data/rachaPhrases.js` | 6 |
| `src/utils/antilink.js` | 5 |
| `src/commands/relevance.js` | 4 |
| `src/data/accionPhrases.js` | 4 |
| `src/commands/mog.js` | 3 |
| `src/data/vaultPhrases.js` | 2 |
| `src/commands/group.js` | 2 |
| `src/commands/social.js` | 1 |
| `src/commands/iq.js` | 1 |
| `src/commands/roast.js` | 1 |
| `src/commands/reborn.js` | 1 |
| **Total** | **366** |


## `src/data/avisos.js` · SIN_PERMISO

- **77** · «Te dieron un dedo y ya vas a por el brazo. Qué poca vergüenza.» — Le cuenta que «le dieron un dedo»: nadie le ha dado nada.

## `src/data/avisos.js` · SIN_PERMISO_ADMIN

- **91** · «El cargo te quedó grande el primer día, incompetente de mierda.» — Cuenta su historia como admin (el primer día, lo primero que hizo). El bot no la sabe.
- **96** · «Despreciable. Te hacen admin y lo primero que haces es abusar.» — Cuenta su historia como admin (el primer día, lo primero que hizo). El bot no la sabe.

## `src/data/avisos.js` · SOLO_ADMINS

- **153** ² · «Los admins te han visto intentarlo. Ahora ya saben a quién no darle el rango.» — Da por hecho por qué lo hizo o cómo lo hizo.
- **157** · «Lo sabías y lo has probado igual, por si el bot se despistaba. No se despista.» — Da por hecho lo que sabía o hacía antes.
- **163** · «No te han votado y no te van a votar. Eso dice el botón que no te funciona.» — Da por hecho lo que sabía o hacía antes.
- **170** · «Sin corona, lameculos. Por mucho que pelotees a los admins, no te la dan.» — Da por hecho lo que sabía o hacía antes.

## `src/data/avisos.js` · CONTRA_UN_ADMIN

- **252** ² · «Los admins no se callan entre sí. Si os aguantáis poco, es problema vuestro.» — Da por hecho por qué lo hizo o cómo lo hizo.
- **258** · «Otro admin. El mute no pasa, y el cabreo te lo quedas tú.» — Da por hecho que está cabreado.

## `src/data/avisos.js` · VER_UNA_VEZ

- **529** · «Borrado. Tu foto no la quería guardar nadie, inútil.» — Da por hecho que en la foto sale su cara. Puede ser un meme, una captura o la foto de otro.
- **531** · «Borrado. Si ni tu madre guarda tus fotos, el grupo menos, imbécil.» — Da por hecho que en la foto sale su cara. Puede ser un meme, una captura o la foto de otro.
- **532** · «Borrado. Con verte una vez ya sobra, subnormal.» — Da por hecho que en la foto sale su cara. Puede ser un meme, una captura o la foto de otro.
- **535** · «Borrado. Nadie quiere tu careto ocupando memoria, anormal.» — Da por hecho que en la foto sale su cara. Puede ser un meme, una captura o la foto de otro.
- **536** · «Borrado. Ni regalada se queda tu cara en el móvil de nadie, imbécil.» — Da por hecho que en la foto sale su cara. Puede ser un meme, una captura o la foto de otro.

## `src/data/cooldownPhrases.js` · GENERICO

- **24** · «Impaciente. Es la palabra. Llevas siéndolo desde que entraste y hoy se te ve entera.» — «desde que entraste»: no sabe cómo era antes.
- **33** ² · «Otra vez tú. Siempre tú. El grupo entero ya tiene tu ansiedad fichada.» — «Siempre tú»: puede ser la primera vez que espera.
- **34** · «Vuelves antes de que se te pase, cretino. Y luego te ofendes cuando alguien te llama pesado.» — Inventa que se ofende cuando le llaman pesado.
- **51** · «El "escribiendo..." eras tú pidiendo lo mismo. Bórralo. Da vergüenza ajena.» — Inventa que el «escribiendo…» era suyo.

## `src/data/cooldownPhrases.js` · AURA_TIRADA

- **60** · «Ni aguantas el rato de la tirada. Y luego hablas de racha, cretino.» — Inventa que habla de racha.
- **76** · «Estás leyendo el puto número al revés por si suma más. No suma. Resta y te deja en evidencia.» — Inventa que está leyendo el número al revés.

## `src/data/cooldownPhrases.js` · AURA_APOSTAR

- **92** · «Ansioso hasta para perder. Ni eso sabes hacer con dignidad, cabrón.» — Da por hecho que perdió la última apuesta. Pudo ganarla.
- **108** ² · «La mesa todavía humea. Tus manos también. El temblor ya es el espectáculo, cabrón.» — Inventa su gesto o cómo escribe.
- **113** · «Quieres recuperar lo perdido. Así empieza todo el que acaba sin nada.» — Da por hecho que perdió la última apuesta. Pudo ganarla.
- **114** ² · «Otra apuesta ahora sería puro tilt, y se te nota en cómo escribes.» — Inventa su gesto o cómo escribe.
- **115** · «La casa ya ha cobrado. Vuelve cuando tengas algo más que ganas.» — Da por hecho que perdió la última apuesta. Pudo ganarla.
- **118** · «Apostar a esta velocidad es donar a plazos. Hoy ya has pagado el primero.» — Da por hecho que perdió la última apuesta. Pudo ganarla.

## `src/data/cooldownPhrases.js` · AURA_TOP_ANSIAS

- **131** · «El puto top no es un visto. No hay que entrar a ver si te lo pusieron. Te lo pusieron. Basta.» — Da por hecho que esta persona ya lo había pedido. La espera es del grupo: casi siempre lo pidió otro.
- **138** · «Ahí abajo lo tienes. Sigues arriba. No hace falta mirarlo cada rato, fantasma.» — Da por hecho que esta persona ya lo había pedido. La espera es del grupo: casi siempre lo pidió otro.
- **139** · «El top no cambia porque lo mires. Tú sí: cada vez se te nota más la necesidad.» — Da por hecho que esta persona ya lo había pedido. La espera es del grupo: casi siempre lo pidió otro.
- **140** · «Tu nombre sigue en el mismo sitio que hace un rato. Tu ego, un poco más arriba.» — Da por hecho que esta persona ya lo había pedido. La espera es del grupo: casi siempre lo pidió otro.
- **141** · «Quien está arriba de verdad no se asoma cada dos por tres a comprobarlo.» — Da por hecho que esta persona ya lo había pedido. La espera es del grupo: casi siempre lo pidió otro.
- **142** · «El ranking no te va a dar las gracias por mirarlo tanto.» — Da por hecho que esta persona ya lo había pedido. La espera es del grupo: casi siempre lo pidió otro.
- **145** · «Te miras en la lista más que en el espejo. Y en el espejo sales peor.» — Da por hecho que esta persona ya lo había pedido. La espera es del grupo: casi siempre lo pidió otro.
- **147** · «Cada vez que pides el top, alguien de abajo sonríe. Sabe que te pesa.» — Da por hecho que esta persona ya lo había pedido. La espera es del grupo: casi siempre lo pidió otro.
- **149** · «Mirar tu puesto a todas horas es la manera más rápida de que el grupo te vea como eres: inseguridad con saldo.» — Da por hecho que esta persona ya lo había pedido. La espera es del grupo: casi siempre lo pidió otro.
- **152** · «Estar arriba y no poder dejar de mirarlo es tener miedo a caerse. Y se te nota.» — Da por hecho que esta persona ya lo había pedido. La espera es del grupo: casi siempre lo pidió otro.
- **154** · «Pides el top como quien se mira en cada escaparate por la calle. Ya sabemos cómo sales.» — Da por hecho que esta persona ya lo había pedido. La espera es del grupo: casi siempre lo pidió otro.

## `src/data/cooldownPhrases.js` · AURA_TOP_POBRE

- **168** · «Tres horas. Podrías haber robado, escrito, tirado. Has elegido la puta ventana. El escaparate no suma.» — Da por hecho que lleva tres horas mirando la lista.
- **174** ² · «Tu nombre no está. Lo sabías antes de pedirlo, y lo has pedido igual.» — Da por hecho lo que sabía.
- **175** · «Los del top no saben que existes. Tú te sabes sus nombres de memoria.» — Da por hecho lo que hizo o se sabe. La espera es del grupo.
- **181** · «Te sabes el top mejor que quienes están en él. Lo que no sabes es cómo entrar.» — Da por hecho lo que hizo o se sabe. La espera es del grupo.

## `src/data/cooldownPhrases.js` · ROBO_ASALTO

- **240** · «El bote se llena con fracasos. Déjale tiempo para que falle alguien más, que no siempre vas a ser tú.» — Da por hecho cómo le fue el asalto anterior.
- **247** · «Vuelves al bote como vuelves a todo lo que te sale mal: sin aprender.» — Da por hecho cómo le fue el asalto anterior.
- **249** · «La hucha acaba de pasar por tus manos. Espera a que se le pase el susto.» — Da por hecho cómo le fue el asalto anterior.

## `src/data/cooldownPhrases.js` · PLAY

- **295** · «Impaciente. Ni tres minutos de atención tienes, y encima presumes de playlist.» — Inventa que presume de playlist.
- **307** ² · «Tu lista es un montón de cosas que nunca has oído enteras. Patético.» — Inventa una costumbre.

## `src/data/apuestaPhrases.js` · APUESTA_GANA

- **38** ² · «Gana, y desde aquí se le ve la sonrisa de imbécil. %S.» — Inventa su cara, lo que piensa o la reacción del grupo.
- **44** ² · «Ha cobrado. El grupo fingiendo que se alegra, panda de falsos de mierda.» — Inventa su cara, lo que piensa o la reacción del grupo.
- **52** · «Ha ganado sin saber ni lo que estaba apostando. Puta suerte.» — Inventa su pasado o la reacción del grupo.
- **53** · «Sale bien y de repente todos teníais fe en %A. Hipócritas de mierda.» — Inventa que el grupo «tenía fe».
- **56** ² · «Sale bien y ya está calculando cuánto puede perder mañana. Imbécil.» — Inventa su cara, lo que piensa o la reacción del grupo.
- **58** · «Ha salido. Y de golpe se le olvidan todas las hostias anteriores.» — Da por hecho que perdió las anteriores.
- **59** ² · «Ha acertado y el grupo disimulando la envidia. Se os ve, gilipoyas.» — Inventa su cara, lo que piensa o la reacción del grupo.
- **60** ² · «Sale. %S y una anécdota que va a repetir hasta el puto vómito.» — Inventa su cara, lo que piensa o la reacción del grupo.
- **64** ² · «Cobra. El saldo le queda en %S y ya está contando la siguiente.» — Inventa su cara, lo que piensa o la reacción del grupo.

## `src/data/apuestaPhrases.js` · APUESTA_PIERDE

- **77** ² · «La mesa no perdona a los que llegan sonriendo. %S, imbécil.» — Inventa su cara, lo que piensa o la reacción del grupo.
- **81** · «Se le veía venir en la puta forma de escribirlo.» — «en la forma de escribirlo»: escribió *!aura apostar*.
- **90** · «Pierde %A. Lo apuntamos con las otras hostias.» — Da por hecho que perdió otras.
- **92** ² · «Se esfuma todo. %S, y la cara de haber visto un fantasma.» — Inventa su cara, lo que piensa o la reacción del grupo.
- **96** · «Lo ha puesto todo con fe. La fe no cotiza. %S.» — «todo»: apuesta lo que elige, no todo.
- **97** ² · «Se queda en %S con cara de pedir la revancha. La revancha, en tres horas.» — Inventa su cara, lo que piensa o la reacción del grupo.
- **99** ² · «Mal. Muy mal. %S, y el grupo haciendo como que no ha visto nada.» — Inventa su cara, lo que piensa o la reacción del grupo.

## `src/data/rachaPhrases.js` · ROTA

- **51** ² · «Ahí está %N, con la cara de quien acaba de ver que sus *%P días* valen ahora exactamente nada.» — Inventa el día, su cara o lo que siente.
- **54** · «%N ha tirado *%P días* a la basura por un día de pereza. Menudo negocio.» — Inventa por qué o cuándo la rompió.
- **55** · «*%P días* de racha y %N la rompe sin despedirse. Como hace con todo.» — Inventa por qué o cuándo la rompió.
- **69** · «%N ha roto *%P días* de racha. Lo que cuesta un mes se pierde en un domingo.» — «en un domingo»: puede ser cualquier día.
- **77** ² · «Racha rota. %N llevaba *%P días* y ahora no tiene ganas ni de mirar el marcador.» — Inventa el día, su cara o lo que siente.

## `src/data/vaultPhrases.js` · GUARDADO

- **31** · «Cerrado. Ahora sí se puede dormir sin mirar el móvil cada diez minutos.» — Inventa una costumbre.

## `src/data/vaultPhrases.js` · SACADO

- **58** · «En la mano, y con prisa por gastarlo. Se te nota.» — Inventa que tiene prisa por gastarlo.

## `src/data/fidelityPhrases.js` · FIEL_HIGH

- **23** · «Le has sujetado el pelo a gente vomitando y no se lo has contado a nadie. Ni a quien vomitaba.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **25** · «Tu pareja deja el móvil encima de la mesa y tú ni lo miras. Tu pareja, en cambio, mira el tuyo cada noche.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.

## `src/data/fidelityPhrases.js` · FIEL_MID

- **42** · «Contestas al primer mensaje de tu ex «por educación». La educación, en ti, no tiene hora de cierre.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **43** · «No has hecho nada todavía, pero ya sabes qué hotel queda más cerca de tu trabajo.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.

## `src/data/fidelityPhrases.js` · FIEL_LOW

- **64** · «Le guardaste el secreto a tu mejor amigo hasta que su ex te invitó a una caña. Lo soltaste antes de que bajara la espuma.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **65** · «Te cuentan un secreto y al rato ya lo sabe tu grupo del gimnasio.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **66** · «[nombre] dijo que ayudaba con la mudanza y a esa hora subía historias desde una piscina.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **67** · «Te fuiste de la cena antes del postre y sin pagar tu parte, y luego preguntaste qué tal había ido.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **70** · «Celebraste tu cumpleaños con la gente que le cae mal a tus amigos, y tus amigos se enteraron por las historias.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **72** · «Te prestaron dinero y seguías sin blanca, según tú, brindando en una terraza.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.

## `src/data/fidelityPhrases.js` · INFIEL_HIGH

- **87** · «Tu pareja te espera en casa mientras tú haces horas extra de mierda. Y las horas extra no son en la oficina.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **89** · «Tu pareja necesita más una aseguradora que un anillo. Porque lo tuyo es un siniestro total.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **90** · «[nombre] le pone los cuernos a su pareja y luego le regala flores. Con la tarjeta de crédito de la víctima.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **95** · «[nombre] se ha follado a medio grupo de amigos, y la otra mitad está en lista de espera.» — «se ha follado a medio grupo»: dicho como hecho, con nombre, delante del grupo.
- **99** · «Engañas a tu pareja con la misma cara con la que le dices buenos días.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **100** · «Tu pareja debería cobrar un sueldo por aguantarte, con plus de peligrosidad y horas nocturnas.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **102** · «Tienes a tu pareja guardada en el móvil como «Casa», y a otra gente como «Trabajo».» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **106** · «[nombre] ha pedido perdón con el mismo ramo a parejas distintas. En la floristería ya le conocen.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **107** · «Tu pareja se ha enterado de la mitad. La otra mitad la sabe el grupo entero, y alguien ya tiene las capturas.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **108** · «Te liaste con alguien en la boda de tu propia prima mientras tu pareja bailaba con la abuela.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **109** · «Tienes Tinder con la foto de las vacaciones que te pagó tu pareja.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **110** · «Pones «en camino» en el chat de tu pareja desde la cama de otra persona.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.

## `src/data/fidelityPhrases.js` · INFIEL_MID

- **122** · «Eres quien dice que no pasa nada mientras su pareja encuentra un pelo que no es suyo. Siempre del gato. Claro, el gato.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **126** · «Tu pareja confía en ti, y tú tienes un contacto guardado como «Fontanero» al que escribes cuando el resto duerme.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **127** · «Juras que solo es amistad, y a esa amistad le mandas audios que a tu pareja no le mandas.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.

## `src/data/fidelityPhrases.js` · INFIEL_LOW

- **136** · «Eres tan fiel que tu pareja podría mandarte a una despedida de soltera en Benidorm y volverías sin nada más que quemaduras de sol.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **138** · «Te sientan al lado de alguien guapísimo en la barra y le hablas de tu pareja. A la que enseñas fotos, se cambia de taburete.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.
- **144** · «Tu pareja te revisa el móvil por costumbre y se aburre. Lo más turbio que tienes es el grupo de la familia.» — Le da pareja, ex, trabajo o un hecho concreto que no tiene por qué existir.

## `src/data/rencorPhrases.js` · MOG_REVANCHA

- **60** · «%D %V moggeó a %A y no ha parado de recordarlo. Ya puede ir parando.» — Inventa que no ha parado de recordarlo.
- **62** ² · «Hay victorias que se celebran demasiado. La de %V %D era una, y hoy %A se ha encargado de dejarlo claro.» — Inventa lo que sintió o hizo entre un cruce y el otro.

## `src/data/rencorPhrases.js` · DUELO_REPITE

- **92** · «%V tenía desde %D para aprender. Lo ha usado para ahorrar y volver a dárselo a %A.» — Inventa que ahorró para esto.

## `src/data/rencorPhrases.js` · DUELO_REVANCHA

- **110** ² · «%V venía muy arriba después de lo de %D. Hoy %A le ha bajado los humos y el saldo a la vez.» — Inventa lo que sintió o hizo entre un cruce y el otro.
- **115** · «%D presumía %V de haberle ganado a %A. Hoy le toca pagar y callarse.» — Inventa que presumía.

## `src/data/rencorPhrases.js` · DUELO_RACHA

- **125** · «Las últimas %N son de %A. %V pierde cada vez que se cruzan, y se cruzan porque %V quiere.» — «porque %V quiere»: quizá retó %A.

## `src/data/roastPhrases.js` · CLOSERS

- **47** · «_Esto no se arregla ni con dinero, y tú encima no tienes._» — Da por hecho que no tiene dinero.
- **50** · «_Captura hecha. Esto ya es tuyo para siempre._» — Inventa que alguien ha hecho captura.

## `src/data/roastPhrases.js` · NAME_ONLY

- **138** ² · «%N. Cuando sale tu nombre en el grupo, es porque alguien necesita a quién echarle la culpa.» — Da por hecho algo del nombre o de la bio que no sabe.
- **141** · «%N. Ese nombre lo lleva mucha gente. Tú eres la versión que salió regular.» — Trata %N como nombre de pila. Suele ser un apodo, un emoji o «Lucyyy».
- **152** ² · «%N. El nombre de alguien que se presenta dos veces porque la primera nadie se quedó.» — Da por hecho algo del nombre o de la bio que no sabe.
- **160** · «%N. Tus padres eligieron ese nombre con ilusión. Luego creciste y la ilusión se fue a tomar por culo.» — Trata %N como nombre de pila. Suele ser un apodo, un emoji o «Lucyyy».
- **161** · «%N. Nadie te ha puesto apodo. Para eso primero hay que caer en gracia.» — Trata %N como nombre de pila. Suele ser un apodo, un emoji o «Lucyyy».

## `src/data/roastPhrases.js` · BIO_FULL

- **202** · ««%B». Tu bio parece una petición de auxilio mal redactada, %N.» — Da por hecho de qué va la bio.
- **203** ² · «%N lleva «%B» en la bio. Hay gente que se tatúa errores y luego está quien los pone de presentación.» — Da por hecho algo del nombre o de la bio que no sabe.
- **209** · «La bio de %N: «%B». Alguien debería quitarle el móvil cuando se pone profundo.» — Da por hecho de qué va la bio.
- **221** ² · «%N, «%B» suena a algo que te dijo alguien una vez y te lo creíste.» — Da por hecho algo del nombre o de la bio que no sabe.

## `src/data/roboPhrases.js` · ROB_WIN

- **50** ² · «%V va a mirar su saldo dentro de un rato y se va a cagar en todo. Tarde, como siempre.» — Inventa una costumbre o la reacción del grupo.
- **58** · «%A ni lo celebra. Robarle a %V ya le parece rutina.» — «ya le parece rutina»: puede ser la primera vez.
- **62** ² · «%A ha elegido a %V entre todo el grupo. No por rico: por fácil.» — Inventa una costumbre o la reacción del grupo.
- **65** · «%V se va a pasar la tarde contando lo que tenía. %A se la va a pasar gastándolo.» — «la tarde»: a las once de la noche no cuadra.

## `src/data/roboPhrases.js` · ROB_PARCIAL

- **164** · «%A ha hecho media faena y ya es más de lo que %V ha hecho en todo el día.» — Da por hecho que %V no ha hecho nada hoy.

## `src/data/roboPhrases.js` · ROB_DESASTRE

- **199** · «%A tenía un saldo decente hace un mensaje. Ahora tiene un recuerdo y a %V dándole las gracias con la boca pequeña.» — Da por hecho que tenía un saldo decente.

## `src/data/roboExtraPhrases.js` · BOTE_REVIENTA

- **26** ² · «Bote reventado. %A se lleva %C y se lo va a gastar antes de que acabe el día.» — Inventa una costumbre, un pasado o la reacción del grupo.
- **29** · «%C para %A. El bote llevaba días sin dueño y ya tiene uno, con nombre y apellidos.» — Inventa cuánto llevaba el bote.
- **35** ² · «%A ha tenido la suerte que el resto lleva semanas pidiendo. %C, y ni una disculpa.» — Inventa una costumbre, un pasado o la reacción del grupo.

## `src/data/roboExtraPhrases.js` · BOTE_FALLA

- **49** · «%A ha donado otra entrada al bote. Filantropía involuntaria en estado puro.» — Da por hecho que ya había fallado antes.
- **50** · «El bote le ha cerrado la puerta en la cara a %A. Otra vez. Y va a seguir cerrándosela.» — Da por hecho que ya había fallado antes.
- **54** ² · «Nada. %A se queda sin bote y con el orgullo en el suelo, que ya es costumbre.» — Inventa una costumbre, un pasado o la reacción del grupo.
- **62** · «%A venía a reventar el bote y lo único que ha reventado es su racha.» — «su racha»: ¿qué racha? Suena a otra cosa.
- **65** · «Otra entrada de %A al bote. A este ritmo le van a poner su nombre.» — Da por hecho que ya había fallado antes.

## `src/data/roboExtraPhrases.js` · COMPRA_GANZUA

- **157** · «Ganzúa comprada con aura que %N no le ha robado a nadie. Primera vez que su dinero hace algo.» — Da por hecho que nunca ha robado.

## `src/data/roboExtraPhrases.js` · COMPRA_CEBO

- **174** · «%N se disfraza de saldo gordo. %H horas fingiendo lo que no tiene, como en la vida real pero con recibo.» — Da por hecho que quien compra el cebo es pobre. Lo compran también los ricos.
- **177** · «%N aparentando fortuna. Es lo más cerca que va a estar de tenerla.» — Da por hecho que quien compra el cebo es pobre. Lo compran también los ricos.
- **178** · «%C invertidos en fingir. %N lleva años practicando gratis.» — Da por hecho que quien compra el cebo es pobre. Lo compran también los ricos.
- **186** · «En %H horas se acaba el cebo y %N vuelve a su tamaño real: calderilla con nombre.» — Da por hecho que quien compra el cebo es pobre. Lo compran también los ricos.
- **187** · «%N ya es el saldo más tentador del grupo. Por fuera. Por dentro sigue oliendo a fondo de monedero.» — Da por hecho que quien compra el cebo es pobre. Lo compran también los ricos.
- **191** · «%N enseña billetes que no tiene y espera a que alguien se los crea. Lleva toda la vida haciendo eso en otros sitios.» — Da por hecho que quien compra el cebo es pobre. Lo compran también los ricos.
- **195** · «Cebo montado. %N acaba de convertir su pobreza en un arma. Es lo primero que le rinde en años.» — Da por hecho que quien compra el cebo es pobre. Lo compran también los ricos.
- **202** · «%N acaba de anunciar al grupo que tiene poco y quiere parecer que tiene mucho. Su biografía en un ticket.» — Da por hecho que quien compra el cebo es pobre. Lo compran también los ricos.

## `src/data/roboExtraPhrases.js` · INVENTARIO_VACIO

- **240** · «Tu inventario está tan vacío como tu historial de robos con éxito.» — Inventa su historial de robos o de compras.
- **244** ² · «Vacío. Ni siquiera has intentado prepararte, y luego te quejas del resultado.» — Inventa una costumbre, un pasado o la reacción del grupo.
- **252** ² · «No llevas nada encima. Tus bolsillos tienen más eco que tu último audio.» — Inventa una costumbre, un pasado o la reacción del grupo.
- **258** ² · «Vacío. La tienda lleva días viéndote pasar por la puerta sin entrar.» — Inventa una costumbre, un pasado o la reacción del grupo.
- **263** · «No tienes nada comprado, y se nota en cómo te va.» — Inventa su historial de robos o de compras.
- **266** · «No llevas nada. La última vez que compraste algo aquí, ni te acuerdas.» — Inventa su historial de robos o de compras.
- **268** ² · «Cero objetos. Luego te roban y preguntas por qué a ti.» — Inventa una costumbre, un pasado o la reacción del grupo.

## `src/data/roboExtraPhrases.js` · COMPRA_OK

- **289** · «%N se ha gastado %C en la tienda y ya está mirando el saldo con cara de arrepentimiento.» — Inventa su cara.

## `src/data/roboExtraPhrases.js` · CEBO_PICA

- **386** · «%V ha pagado el cebo y %A se lo ha amortizado en una tarde, con su codicia y a precio de saldo.» — Hora inventada («en una tarde»).
- **399** ² · «%A ha picado. Alguien en el grupo ya está haciendo la captura.» — Inventa una costumbre, un pasado o la reacción del grupo.

## `src/data/roboExtraPhrases.js` · CONTRA_GANA

- **420** ² · «%V ha tardado lo justo en cobrarse la venganza: %C, y %A todavía con la sonrisa puesta.» — Inventa una costumbre, un pasado o la reacción del grupo.
- **425** ² · «%A se estaba riendo del golpe cuando %V le ha cobrado %C. Se le ha cortado la risa a mitad.» — Inventa una costumbre, un pasado o la reacción del grupo.
- **426** · «%A ya puede ir borrando el mensaje en el que se reía. %V acaba de llevarse %C.» — Inventa un mensaje que no existe.

## `src/data/roboExtraPhrases.js` · CONTRA_RUINA

- **640** · «%A cobra %C sin mover un dedo, y %V se va a pasar la tarde mirando el saldo.» — Hora inventada («la tarde»).

## `src/data/roboExtraPhrases.js` · ATRACO_GANA

- **651** · «La tienda le vendía a %A a precio de oro. Hoy %A ha ajustado cuentas a hostias: %C.» — Da por hecho que compraba en la tienda.
- **655** ² · «Se lleva %C. La tienda lleva meses cobrando y hoy le ha tocado pagar, que jode.» — Inventa una costumbre, un pasado o la reacción del grupo.
- **670** · «%A ha atracado la tienda en la que compraba. %C, y ya no piensa volver a pagar.» — Da por hecho que compraba en la tienda.

## `src/data/percentLabels.js` · linda

- **93** · «Te piden fotos para la orla, para la boda de tu prima y para el cartel del bar. Tu cara trabaja más que tú.» — «la boda de tu prima».
- **107** ² · «Arreglada ganas mucho. En pijama, la gente que vive contigo ya ni hace comentarios.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **108** ² · «Te ponen un corazón en las fotos, nunca un comentario. El corazón es lo que se da por educación.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **113** ² · «Tu foto de perfil sigue siendo la misma, y todos sabemos por qué: es la única que no da tanto asco.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).

## `src/data/percentLabels.js` · friki

- **741** ² · «Llevas años con la misma foto de perfil de un personaje. Ni tu cara pones ya, y el personaje da menos vergüenza que tú.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **752** · «Tienes opiniones firmísimas sobre el final de una serie y ninguna sobre por qué a tu edad sigues en casa de tus padres.» — «sigues en casa de tus padres».
- **757** ² · «[nombre], el año pasado saliste de casa para ir a un salón del manga y volviste con tres bolsas y ningún teléfono.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **774** ² · «Tu foto de perfil es de persona normal. Tus historias son capturas de un juego de madrugada.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).

## `src/commands/aura.js` · blessed

- **139** · «Por una vez no fuiste el chiste del grupo.» — Inventa la reacción del grupo. Nadie ha reaccionado: la tirada acaba de salir.
- **140** ² · «Sacaste un número que obligó a esta gente a tragar saliva.» — Inventa la reacción del grupo o su cara.
- **141** · «El silencio después de tu tirada pesó más que cualquier comentario.» — Inventa la reacción del grupo. Nadie ha reaccionado: la tirada acaba de salir.
- **144** · «Te miraron distinto. Solo un segundo, pero ese segundo ya no te lo quitan, cabrón.» — Inventa la reacción del grupo. Nadie ha reaccionado: la tirada acaba de salir.
- **145** ² · «Joder, nadie te felicitó y eso es lo mejor que te ha pasado.» — Inventa la reacción del grupo o su cara.
- **146** · «Tu tirada ha dejado frases a medio escribir. El remate se les ha caído de las manos.» — Inventa la reacción del grupo. Nadie ha reaccionado: la tirada acaba de salir.
- **147** ² · «Dejaste al grupo con la cara de cuando les deben dinero.» — Inventa la reacción del grupo o su cara.
- **149** ² · «Coño, te debían una y te la has cobrado en público.» — Inventa la reacción del grupo o su cara.
- **150** · «Coño, te han mirado como se mira al que acierta la lotería: con rabia educada.» — Inventa la reacción del grupo. Nadie ha reaccionado: la tirada acaba de salir.
- **151** · «Había un puto hilo de burla a medio construir. Lo has tirado abajo con un ladrillo.» — Inventa la reacción del grupo. Nadie ha reaccionado: la tirada acaba de salir.
- **152** · «El que te subestimaba está recalculando.» — Inventa la reacción del grupo. Nadie ha reaccionado: la tirada acaba de salir.
- **153** · «Has dejado el "jajaja" a medias. Se ven los puntos suspensivos y ninguna risa.» — Inventa la reacción del grupo. Nadie ha reaccionado: la tirada acaba de salir.
- **155** · «Has dejado al que siempre te tira sin material.» — Inventa la reacción del grupo. Nadie ha reaccionado: la tirada acaba de salir.
- **157** ² · «Todo lo que tenían preparado para ti se les ha caducado.» — Inventa la reacción del grupo o su cara.
- **159** · «Alguien ha escrito tu puto nombre y lo ha borrado.» — Inventa la reacción del grupo. Nadie ha reaccionado: la tirada acaba de salir.
- **160** ² · «Has hecho que el "seguro que pierde" se atragante.» — Inventa la reacción del grupo o su cara.
- **162** ² · «Has obligado a que el "era de esperar" se use al revés.» — Inventa la reacción del grupo o su cara.
- **163** · «Te miran de reojo, que es el único respeto honesto que hay aquí.» — Inventa la reacción del grupo. Nadie ha reaccionado: la tirada acaba de salir.
- **165** · «Has dejado un "me cago en" a medias. La frase no tenía final que no te reconociera.» — Inventa la reacción del grupo. Nadie ha reaccionado: la tirada acaba de salir.
- **166** · «Alguien ha ido a ver tu historial por si esto venía de antes.» — Inventa la reacción del grupo. Nadie ha reaccionado: la tirada acaba de salir.
- **168** ² · «Te han dado el respeto de la rabia: no te quieren ahí, y ahí estás.» — Inventa la reacción del grupo o su cara.

## `src/commands/aura.js` · loss

- **250** ² · «Bajaste y nadie se inmutó. Ya es parte del puto paisaje verte perder aura.» — Inventa la reacción del grupo o su cara.
- **251** ² · «Se te escurrió un poco más de presencia. El grupo ni parpadeó, pringado.» — Inventa la reacción del grupo o su cara.
- **254** ² · «Hoy el puto grupo te bajó un escalón más y ni se molestó en reírse.» — Inventa la reacción del grupo o su cara.
- **256** ² · «Perdiste poco. Era de los golpes pequeños, y te ha dolido como si fuera la renta.» — Inventa la reacción del grupo o su cara.
- **257** · «Te quitaron aura y el puto grupo siguió hablando de comida.» — «siguió hablando de comida».
- **262** ² · «Te baja el aura y el teléfono de nadie ha vibrado por ti. Como siempre.» — Inventa la reacción del grupo o su cara.
- **266** · «Mirar así una pérdida pequeña es de gilipoyas: parece que te suben el alquiler.» — Inventa su cara al mirar.
- **269** · «Sales en rojo. El grupo ha seguido con la comida y ni ha levantado la vista.» — «ha seguido con la comida».
- **274** ² · «Pierdes tan poco que ni lo miras. Y aun así te duele, rata.» — Inventa la reacción del grupo o su cara.
- **277** ² · «Te toca perder justo cuando creías que ya te tocaba ganar.» — Inventa la reacción del grupo o su cara.
- **279** · «Has salido en rojo y han vuelto al programa.» — «han vuelto al programa»: ¿qué programa?
- **280** · «El grupo ya te tenía en cero. Hoy han confirmado el mute.» — «han confirmado el mute»: no hay ningún mute.

## `src/commands/aura.js` · spiral

- **285** ² · «El saldo ya estaba bajo cero y esta tirada lo ha empujado. Se te ha visto la cara.» — Inventa la reacción del grupo o su cara.
- **292** ² · «Joder, otra vez. El grupo ya no mira el número, mira cuánto tardas en volver a darle.» — Inventa la reacción del grupo o su cara.
- **303** · «Otra bajada firmada con el saldo ya en rojo. Has guardado el móvil boca abajo.» — «has guardado el móvil boca abajo».
- **304** · «Rojo, y encima te han cobrado otra. Te has quedado mirando el número.» — «te has quedado mirando el número».
- **306** · «El grupo ha pasado de reírse a preocuparse. Y de preocuparse, a pasar.» — Inventa lo que hace él o el grupo.
- **311** · «Bajabas de un saldo roto y has seguido. El grupo ya iba por otro tema.» — Inventa lo que hace él o el grupo.

## `src/commands/aura.js` · cursed

- **318** · «Bajaste tan fuerte que hasta tus habituales defensores se hicieron los locos, cabrón.» — Inventa la reacción del grupo.
- **328** · «Un "joder" que se ha muerto a mitad. No había segunda palabra que no te dejara peor.» — Inventa la reacción del grupo.
- **330** · «Has puesto cara de examen al puto grupo. Nadie copiaba. Nadie sabía a dónde mirar.» — Inventa la reacción del grupo.
- **331** · «Has hecho que cierren la app y abran otra cosa.» — Inventa la reacción del grupo.
- **332** · «Has dejado el puto chat con esa cara de cuando el camarero oye lo que no debía.» — Inventa la reacción del grupo.
- **335** ² · «Quien iba a vacilarte se ha quedado sin ganas. Ni odio te mereces hoy. Solo pena.» — Inventa la reacción del grupo o su cara.
- **337** · «Alguien ha ido a ver si podías borrar el mensaje. No se puede. Qué suerte la nuestra.» — Inventa la reacción del grupo.
- **340** · «Has hecho que el "menos mal que no soy yo" se diga en voz alta.» — Inventa la reacción del grupo.
- **342** ² · «Le has puesto cara de funeral al grupo. Nadie sabía si dar el pésame.» — Inventa la reacción del grupo o su cara.
- **344** · «Nadie quería retomar con tu puto número todavía en pantalla.» — Inventa la reacción del grupo.
- **345** · «El grupo se ha quedado callado mirando lo que acabas de perder.» — Inventa la reacción del grupo.
- **346** · «El puto chat ha respirado cuando ha salido otro mensaje que no eras tú.» — Inventa la reacción del grupo.

## `src/commands/duel.js` · DUEL_WIN

- **58** · «%W se lleva el aura de %L y %L se lleva la cara de haber aceptado. Nadie le obligó.» — Da por hecho quién retó a quién. %L puede ser quien retó o quien aceptó.
- **59** · «%L aceptó el duelo con toda la chulería y lo ha perdido con toda la vergüenza.» — Da por hecho quién retó a quién. %L puede ser quien retó o quien aceptó.
- **66** · «%L ha perdido un duelo que decidió jugar. Quien no sale al campo no lo pisan, y %L ha salido, imbécil.» — Da por hecho quién retó a quién. %L puede ser quien retó o quien aceptó.
- **68** · «%L quería demostrar algo y lo ha demostrado: que contra %W no tiene nada que hacer.» — Da por hecho quién retó a quién. %L puede ser quien retó o quien aceptó.
- **73** · «%L vino a por aura y se va sin la suya. Gran negocio, fenómeno.» — Da por hecho quién retó a quién. %L puede ser quien retó o quien aceptó.
- **77** · «%L ha aceptado el duelo como quien firma sin leer. %W sí leyó la letra pequeña: gana %W.» — Da por hecho quién retó a quién. %L puede ser quien retó o quien aceptó.
- **84** · «%W se va con el premio. %L, con el recuerdo de haber dicho «acepto».» — Da por hecho quién retó a quién. %L puede ser quien retó o quien aceptó.

## `src/commands/mog.js` · MOG_PHRASES

- **35** ² · «La proyección maxilar de %M liquida a %L sin mirar nada más. %L respira por la boca y se le nota en la estructura.» — Inventa sus hábitos.
- **42** ² · «Frame, altura, estructura: todo en %M. A %L le quedan los suplementos, el cope y la oración nocturna.» — Inventa sus hábitos.
- **50** · «%L va al gym, lee libros, trabaja la actitud. Sigue siendo %L. El óseo no se levanta a press.» — Inventa sus hábitos.

## `src/commands/social.js` · AURA_LINES

- **241** · «El aura se nota en el saldo y en la cara. La tuya lleva un rato diciendo que te falta.» — Da por hecho que le falta aura. Sale con cualquier saldo.

## `src/commands/count.js` · MEMBER_PHRASES

- **11** · «El trono es tuyo. Lo ocupas desde hace tanto que ya nadie recuerda si hubo alguien antes.» — «desde hace tanto»: puede llevar un día de número uno.
- **13** · «Primero y con margen. Los de abajo no te persiguen, te miran de lejos y aceptan que no llegan.» — Inventa la distancia con el de arriba o el de abajo. Sale al azar, se lleve uno o mil.
- **42** · «Segundo. Tan cerca del primero que duele, y aun así no lo has alcanzado. Otra vez será. O no.» — Inventa la distancia con el de arriba o el de abajo. Sale al azar, se lleve uno o mil.
- **47** · «Casi lo tocas. Casi. Y ese casi lleva persiguiéndote más tiempo del que reconoces en público.» — Inventa la distancia con el de arriba o el de abajo. Sale al azar, se lleve uno o mil.
- **52** ² · «Número dos. Aprietas, se te nota, y aun así el marcador no se mueve. Frustrante de ver desde fuera.» — Inventa su gesto.
- **53** · «Plata. Le vas pisando los talones a alguien que ni se ha girado a mirarte. Duro pero real.» — Inventa la distancia con el de arriba o el de abajo. Sale al azar, se lleve uno o mil.
- **55** · «Número dos. Te sobra presencia y te falta el último empujón. Lleva faltándote desde el principio.» — Inventa la distancia con el de arriba o el de abajo. Sale al azar, se lleve uno o mil.
- **59** · «Casi. El grupo entero ha visto lo cerca que estuviste y lo poco que sirvió al final.» — Inventa la distancia con el de arriba o el de abajo. Sale al azar, se lleve uno o mil.
- **60** · «Estás a nada de la cima y esa nada pesa más de lo que jamás vas a admitir en voz alta.» — Inventa la distancia con el de arriba o el de abajo. Sale al azar, se lleve uno o mil.
- **74** · «Tercero. En el podio de milagro y por los pelos. Un mal día y estás fuera de la foto.» — Inventa la distancia con el de arriba o el de abajo. Sale al azar, se lleve uno o mil.
- **76** · «Estás en el podio agarrado con las uñas. Suéltate un día y te caes sin que nadie lo note.» — Inventa la distancia con el de arriba o el de abajo. Sale al azar, se lleve uno o mil.
- **99** · «Podio. Tercera plaza, y el cuarto ya está lejos. Algo haces bien, aunque te joda que se diga.» — «el cuarto ya está lejos»: choca con «por los pelos» del mismo tramo.

## `src/commands/count.js` · ADMIN_PHRASES

- **143** · «Admin segundo. Estar cerca del primero llevando placa es casi peor que estar lejos. Casi.» — Inventa la distancia con el de arriba o el de abajo. Sale al azar, se lleve uno o mil.
- **170** · «Admin en plata. Le pisas los talones a quien va arriba, y todo el grupo lo ve.» — Inventa la distancia con el de arriba o el de abajo. Sale al azar, se lleve uno o mil.
- **173** · «Admin en el podio por los pelos. Con placa y todo, dos personas te han pasado por delante.» — Inventa la distancia con el de arriba o el de abajo. Sale al azar, se lleve uno o mil.
- **188** · «Tercer escalón con placa. El cuarto ya queda lejos.» — Inventa la distancia con el de arriba o el de abajo. Sale al azar, se lleve uno o mil.

## `src/commands/relevance.js` · RELEVANTE

- **109** ² · «Con %MSG mensajes, %N, cada vez que hay drama apareces con opinión y no paras. Imprescindible. El resto, a reaccionar.» — Inventa una costumbre.
- **115** · «Con %MSG mensajes, %N, cada vez que te callas unos días alguien pregunta si te ha pasado algo. Esa pregunta es la prueba.» — Inventa un hecho.
- **133** ² · «%N, %MSG mensajes. Cuando este grupo se calienta es porque tú metiste la mecha.» — Inventa una costumbre.

## `src/commands/activity.js` · GHOST_ROASTS

- **150** · «Lurker con doctorado. Lleva años mirando cómo otros hablan y tomando apuntes que jamás va a usar. Espectador profesional, perdedor.» — Inventa tiempo o hábitos.
- **155** · «Reacciona a los memes pero jamás hace uno. Consumidor crónico, productor cero. La balanza más desequilibrada del grupo entero.» — «Reacciona a los memes»: no lo sabe.
- **161** ² · «Nadie recuerda su último mensaje. Probablemente porque no lo ha escrito todavía.» — Inventa una hora, una costumbre o lo que hace con el móvil.

## `src/commands/activity.js` · AVISO_PURGA

- **249** · «He mirado si al menos reaccionabais a los mensajes de otros, por darle una oportunidad a la duda. Ni eso. También sois inútiles en silencio, que tiene mérito.» — «He mirado si reaccionabais»: el bot no mira reacciones.
- **258** ² · «Sois esa gente que abre el grupo, lee doscientos mensajes, se ríe por dentro y se va sin escribir. Por dentro no cuenta. Por dentro no lo ve nadie.» — Inventa una hora, una costumbre o lo que hace con el móvil.
- **262** · «Sois los únicos capaces de estar en un grupo de amigos durante meses y no tener un solo amigo dentro. Eso no se consigue por accidente: hay que esforzarse.» — Dice que el bot ha hecho algo que no hace, o da meses a quien quizá entró ayer.
- **266** · «Diez mensajes o menos y aun así abrís el grupo todos los días. Eso ya no es timidez. Eso es mirar por la ventana de una fiesta a la que os invitaron.» — «abrís el grupo todos los días»: no lo sabe.
- **267** · «He preguntado al grupo si alguien os echaría de menos. Nadie ha contestado. Curiosamente, con el mismo silencio que usáis vosotros. Debe ser contagioso.» — «He preguntado al grupo»: no ha preguntado nada.
- **276** · «El bot ha buscado en vuestro historial una sola frase digna de captura de pantalla. Ha encontrado tres mensajes, y dos son "jaja". El tercero es un sticker.» — Inventa el contenido exacto: «dos son jaja, el tercero un sticker».
- **280** · «El bot lleva meses esperando que digáis algo para poder meterse con vosotros. Se ha cansado de esperar y se va a meter igual, que para eso está esta lista.» — Dice que el bot ha hecho algo que no hace, o da meses a quien quizá entró ayer.
- **281** ² · «Diez mensajes o menos. Vuestro móvil recibe las notificaciones de este grupo, las silencia, y esa es toda la relación que tenéis con la gente de aquí.» — Inventa una hora, una costumbre o lo que hace con el móvil.

## `src/commands/activity.js` · AMENAZAS

- **317** · «Os quedan las horas que tarde el bot en aburrirse y expulsaros. Lleva meses aburrido, así que calculad.» — Da meses a quien quizá entró ayer.
- **322** · «Escribid algo o preparaos para la notificación de expulsión. Que va a ser lo primero que leáis aquí en semanas.» — Da meses a quien quizá entró ayer.
- **323** · «El bot limpia el grupo como se limpia un armario: lo que no se usa, se tira. Y vosotros lleváis meses sin uso.» — Da meses a quien quizá entró ayer.

## `src/commands/iq.js` · ALTO

- **158** · «Con %IQ podrías estar haciendo algo grande. Estás aquí, mirando tu IQ en un bot.» — Da por hecho que lo ha pedido él. Lo puede pedir otro con @.

## `src/commands/ship.js` · perfect

- **50** · «Match perfecto. Ahora ya no tenéis excusa para seguir disimulando.» — Da por hecho que esos dos hablan, se gustan o lo esconden. Suelen ser dos al azar.
- **53** · «Compatibilidad total. Lo único que os separa es la vergüenza, y la vergüenza se acaba de ir a la mierda.» — Da por hecho que esos dos hablan, se gustan o lo esconden. Suelen ser dos al azar.
- **54** · «Cien exacto. Ni el bot se lo cree, y el bot os ha visto hablar.» — Da por hecho que esos dos hablan, se gustan o lo esconden. Suelen ser dos al azar.
- **59** · «Cien. Con esto, si no pasa nada, el problema ya no es la compatibilidad: es la cobardía.» — Da por hecho que esos dos hablan, se gustan o lo esconden. Suelen ser dos al azar.

## `src/commands/ship.js` · high

- **63** · «Con este porcentaje el único milagro pendiente es que alguno mande el mensaje sin borrarlo quince putas veces antes.» — Da por hecho que esos dos hablan, se gustan o lo esconden. Suelen ser dos al azar.
- **64** · «Con esta sintonía deberíais mandaros audios de veinte minutos, no un "jaja bien y tú" cada dos putos días.» — Da por hecho que esos dos hablan, se gustan o lo esconden. Suelen ser dos al azar.
- **65** · «El destino os ha puesto en bandeja una conexión de escándalo, y la estáis usando para hablar de series que veis por separado.» — Da por hecho que esos dos hablan, se gustan o lo esconden. Suelen ser dos al azar.
- **66** · «Con este porcentaje deberíais estar celebrando, pero seguro que los dos estáis fingiendo que no habéis leído esto todavía.» — Da por hecho que esos dos hablan, se gustan o lo esconden. Suelen ser dos al azar.
- **70** · «Alto, alto. Ya podéis dejar de fingir que no os leéis los mensajes.» — Da por hecho que esos dos hablan, se gustan o lo esconden. Suelen ser dos al azar.
- **75** · «Buen ship. Ahora falta que alguno de los dos deje de mirar el móvil y mire a la otra persona.» — Da por hecho que esos dos hablan, se gustan o lo esconden. Suelen ser dos al azar.
- **77** · «Con esto, cualquiera se lanzaría. Vosotros vais a seguir mandándoos memes.» — Da por hecho que esos dos hablan, se gustan o lo esconden. Suelen ser dos al azar.
- **80** · «Buena pareja sobre el papel. En la práctica, dos personas que no se atreven a escribirse primero.» — Da por hecho que esos dos hablan, se gustan o lo esconden. Suelen ser dos al azar.
- **85** · «Alto. Lo raro no es la cifra: lo raro es que todavía no haya pasado nada.» — Da por hecho que esos dos hablan, se gustan o lo esconden. Suelen ser dos al azar.
- **87** · «Compatibilidad alta y valentía baja. La historia de siempre.» — Da por hecho que esos dos hablan, se gustan o lo esconden. Suelen ser dos al azar.
- **90** · «Número alto. Aquí hay algo, y lo sabe todo el grupo menos vosotros dos.» — Da por hecho que esos dos hablan, se gustan o lo esconden. Suelen ser dos al azar.
- **91** · «Alto. No se ve mucho esto, así que no lo desperdiciéis con otro «jaja».» — Da por hecho que esos dos hablan, se gustan o lo esconden. Suelen ser dos al azar.

## `src/commands/ship.js` · mid

- **99** · «Regular. Os aguantáis lo justo para no bloquearos.» — Da por hecho que esos dos hablan, se gustan o lo esconden. Suelen ser dos al azar.

## `src/commands/ship.js` · low

- **138** · «Número malo. Uno quiere salir, el otro quiere quedarse en casa, y los dos quieren estar con otra persona.» — Da por hecho que esos dos hablan, se gustan o lo esconden. Suelen ser dos al azar.
- **143** · «Poco. Si os escribís, es para pediros algo. Y ni eso.» — Da por hecho que esos dos hablan, se gustan o lo esconden. Suelen ser dos al azar.

## `src/commands/ship.js` · zero

- **180** · «Nada. Lo mejor que podéis hacer es seguir sin hablaros.» — Da por hecho que esos dos hablan, se gustan o lo esconden. Suelen ser dos al azar.

## `src/commands/group.js` · REMATES

- **1410** · «Mandas la foto y te «olvidas» de la edad. No cuela. Pon el número.» — Da por hecho que ya mandó la foto o que está buscando una.
- **1412** · «Llevas un rato buscando la buena. No la hay. Manda la última y ya.» — Da por hecho que ya mandó la foto o que está buscando una.

## `src/commands/roast.js` · ceros

- **41** · «Cero, %N. Te han añadido, has aceptado y no has dicho ni mu. Tres pasos y el último es el tuyo.» — Da por hecho que le añadieron. Pudo entrar por enlace.

## `src/commands/reborn.js` · ANUNCIOS

- **17** · «*RESUCITADO.*\n\nUnos días fuera y el grupo dando vueltas sin rumbo. Lo esperaba. Ya llegó quien pone el orden.» — Da por hecho que estuvo días fuera.

## `src/utils/casino.js` · bonos

- **54** · «Pleno con %M mensajes. El grupo lo ha visto y a más de uno le escuece.» — Inventa la reacción del grupo.
- **76** · «Bono gordo. %M mensajes y el grupo mirando el número con envidia.» — Inventa la reacción del grupo.
- **85** · «Pleno por %M mensajes. Hoy el grupo va a hablar de ti. Más todavía.» — Inventa la reacción del grupo.
- **96** ² · «%M mensajes. Mañana el contador vuelve a cero, pero lo de hoy lo ha visto todo el mundo.» — Inventa la reacción del grupo.
- **110** · «Pleno. %M mensajes y el aura a tus pies. El grupo lo va a comentar un buen rato.» — Inventa la reacción del grupo.
- **118** ² · «Aura en negativo y mensajes de verdad. El marcador cambia de cara y el grupo lo ha visto.» — Inventa la reacción del grupo.
- **119** · «El grupo daba tu aura por perdida. Tú has seguido escribiendo. Bono de redención.» — Inventa que el grupo «daba tu aura por perdida».

## `src/utils/antilink.js` · PERMISO_ENLACE

- **349** ² · «eliminado. Llegas a un sitio que no es tuyo y sueltas links como si mandaras. No mandas una mierda: pídele el *!allow* a un admin.» — Da por hecho que es nuevo o que nadie lo abrió.
- **362** ² · «borrado antes de que nadie lo abriera. Si quieres que se vea, el *!allow* lo da un admin, no tu dedo.» — Da por hecho que es nuevo o que nadie lo abrió.
- **367** · «borrado. Promocionarte en un grupo ajeno sin el *!allow* de un admin es la forma más rápida de que no te vea nadie.» — Da por hecho que es publicidad o que conocía la norma.
- **372** · «quitado. Aquí no se pega nada sin el *!allow*, y tú lo sabías. Ve a un admin a pedirlo.» — Da por hecho que es publicidad o que conocía la norma.
- **385** · «borrado. Ese enlace era publicidad, y aquí la publicidad pasa por un admin. Pide el *!allow*.» — Da por hecho que es publicidad o que conocía la norma.

## `src/data/accionPhrases.js` · ROAST_USUARIO

- **486** · «El gif lo ha hecho todo, %A. Tú solo has puesto el dinero, como siempre.» — Da por hecho que repite.
- **495** · «%A ha vuelto a pagar para tener algo que contar. El grupo ya ha pillado el truco.» — Da por hecho que repite.
- **496** · «%A, cada gif que mandas es una confesión. Hoy has confesado otra vez.» — Da por hecho que repite.

## `src/data/percentLabels.js` · incel

- **33** ² · «Has probado con alcohol, de noche y dando lástima, que son las tres vías por las que folla el resto de mediocres. Cero de tres.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **38** ² · «El último contacto físico que recuerdas fue el dentista, y encima le pagaste. Historial de pringado, con factura.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **50** ² · «[nombre], tu récord es haberte quedado dormido con el móvil en la mano esperando una respuesta.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **62** ² · «Tu último beso lo recuerdas con fecha, hora y canción. Hace tanto que la canción ya no suena en ningún sitio.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **65** ² · «Tienes Tinder abierto y el match de verdad no aparece. El que sale es publicidad.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **75** ² · «Ni rastro. Tu último ligue no te costó seis meses de estrategia. Te costó un «¿vamos a por otra?».» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **78** ² · «Cero. Tienes en el móvil números de gente con la que has quedado de verdad. Lo del resto del grupo es una lista de deseos.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).

## `src/data/percentLabels.js` · fea

- **151** ² · «Tu problema no se arregla adelgazando. Ya lo probaste y la estructura sigue igual. El hueso no negocia, y la cara sigue siendo basura.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **154** ² · «Ninguna versión tuya ha funcionado en foto, y ya has culpado a la cámara. La cámara está bien.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **156** ² · «Cremas, dietas, flequillo y filtro. Has tocado todo lo que se puede tocar y la cara sigue en el mismo sitio.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **175** ² · «Tu mejor foto es vieja y la sigues usando de perfil. Quien te conoce ahora sabe por qué.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **177** ² · «Con gafas de sol eres un seis. Sin ellas, el grupo entiende por qué no te las quitas nunca.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **186** ² · «Cero. Canthal tilt positivo, buen tercio medio y la mandíbula en su sitio. El resto del grupo ha dejado de subir selfies.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).

## `src/data/percentLabels.js` · sexy

- **202** ² · «Te escriben para pedirte apuntes que no necesitan. Todo el mundo lo sabe menos tú, o eso dices.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **203** ² · «Tus historias se vuelven a ver. Nadie te lo confiesa, pero el dedo vuelve, y el contador no miente.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **253** ² · «Tienes a más de uno del grupo con tu chat abierto y sin escribirte, por miedo a quedar mal.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **254** ² · «Eres el motivo de que alguien aquí haya borrado un mensaje antes de mandarlo.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).

## `src/data/percentLabels.js` · crack

- **277** ² · «Te piden ayuda con el Excel y lo arreglas en dos minutos mientras comes. Nadie te da las gracias porque les da vergüenza.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **279** ² · «Te llaman para montar muebles, para el ordenador y para la renta. Eres útil de cojones, y te lo cobran en favores.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **285** ² · «Hay gente en este grupo que repite tus ideas como si fueran suyas. Las repiten mal, pero se nota de quién son.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **297** ² · «Arreglas el ordenador de tu tía y no sabes arreglar el tuyo, que lleva el ventilador rugiendo.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **316** ² · «El grupo ya tiene un plan B: no contar contigo. Y el plan B funciona de maravilla.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **322** ² · «El grupo ya ni se enfada contigo: se organiza sin ti. Y eso escuece más.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).

## `src/data/percentLabels.js` · feminidad

- **417** ² · «Te has puesto un vestido una vez, en carnaval, y hasta el vestido pidió que te lo quitaras.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **420** ² · «Entraste en una tienda de maquillaje por error y saliste pidiéndole perdón a la dependienta.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).

## `src/data/percentLabels.js` · masculinidad

- **460** ² · «Tienes barba de leñador y lloras con los anuncios de perros, y luego juras en el grupo que era alergia.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **463** ² · «Pitas en la autopista con la ventanilla bajada y luego aparcas en batería con seis maniobras, mirando si alguien te graba.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **464** ² · «Dices que nada te afecta y se te nota el morro porque alguien no te felicitó el cumpleaños.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **488** ² · «Le has pedido a un bot que te mida la hombría. El bot te ha dejado corto, y lo ha visto el grupo.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **490** ² · «Nadie seguro de su hombría le pregunta a un bot. Tú has preguntado, y aquí tienes el número.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).

## `src/data/percentLabels.js` · simp

- **594** ² · «[nombre], dices que solo quieres que sea feliz. Te descartaron y estás haciendo el duelo en público.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **600** ² · «Tienes un chat fijado arriba del todo, y en ese chat el último mensaje siempre es tuyo.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **605** ² · «Has cambiado de planes porque alguien a quien le das igual dijo que a lo mejor se pasaba.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **619** ² · «Nadie ha conseguido tenerte pendiente del móvil. Eres tú quien tiene a gente pendiente, y alguien de este grupo lo sabe bien.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).

## `src/data/percentLabels.js` · rata

- **656** ² · «Hay gente en el grupo que ya te cuenta las cosas a medias. Contigo aprendieron a quitarle el nombre a todo.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **667** ² · «Te han contado secretos de medio grupo y no se te ha escapado ninguno. Eso asusta, porque nadie sabe qué más te callas.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).

## `src/data/percentLabels.js` · cerdo

- **837** ² · «Sin rastro. Compartes piso y nadie ha dejado notas en la nevera por tu culpa. Eso en este grupo es noticia.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).

## `src/data/percentLabels.js` · inutil

- **914** ² · «En los proyectos del grupo tu nombre sale en la portada y en ningún otro sitio. Crédito de adorno y trabajo de mierda.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).

## `src/data/percentLabels.js` · perdedor

- **1003** ² · «[nombre], en cada torneo del grupo acabas en tercer puesto de cinco, que es el puesto que nadie recuerda al día siguiente.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).

## `src/data/percentLabels.js` · ganador

- **1031** ² · «[nombre], tienes la nevera llena, las facturas pagadas y el móvil sin la pantalla rota. Eso aquí ya es de clase alta.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **1032** ² · «Te ponen una fecha límite y entregas antes, [nombre]. Hay gente en el grupo que todavía no ha entregado lo suyo.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).
- **1080** ² · «Ganas tanto que el grupo ya ni te felicita. Te felicita tu madre, y porque no está en el grupo.» — Afirma un hecho concreto que se puede comprobar o que no tiene por qué existir (una foto, un piso, un viaje, algo del grupo).

## `src/data/avisos.js` · A_TI_MISMO

- **201** ² · «Te lo quieres hacer a ti porque nadie más te lo acepta. Normal.» — Da por hecho por qué lo hizo o cómo lo hizo.

## `src/data/avisos.js` · AL_BOT

- **214** ² · «Esa mención no iba para mí, imbécil. Ni apuntar sabes y quieres jugar.» — Da por hecho por qué lo hizo o cómo lo hizo.
- **218** ² · «Ni el dedo te obedece, subnormal. Has mencionado al bot y encima esperas algo.» — Da por hecho por qué lo hizo o cómo lo hizo.

## `src/data/avisos.js` · MAL_ESCRITO

- **416** ² · «Lo has fallado sentado, con tiempo y sin presión. En condiciones ideales, ese es tu nivel.» — Da por hecho por qué lo hizo o cómo lo hizo.
- **428** ² · «Lo has escrito sin dudar ni un segundo. Esa confianza es lo que mejor mide tu cabeza.» — Da por hecho por qué lo hizo o cómo lo hizo.

## `src/data/cooldownPhrases.js` · ROBO_GUARDIA

- **272** ² · «Otro ya ha pasado por ahí antes que tú. Aquí no hay segundo turno inmediato.» — Da por hecho que robó otro. Pudo ser el mismo que lo intenta ahora.
- **284** ² · «Quieres el segundo plato de un robo que ni siquiera es tuyo. Hambre de gorrón.» — Da por hecho que robó otro. Pudo ser el mismo que lo intenta ahora.
- **285** ² · «Alguien se te ha adelantado. Asúmelo y busca otra víctima, que hay de sobra.» — Da por hecho que robó otro. Pudo ser el mismo que lo intenta ahora.
- **288** ² · «Te has quedado con las ganas. Otro ha llegado antes y con más cabeza.» — Da por hecho que robó otro. Pudo ser el mismo que lo intenta ahora.

## `src/data/rachaPhrases.js` · HITO

- **45** ² · «%N, *%D días*. Lo fácil era fallar un domingo. No lo has hecho.» — Inventa el día, su cara o lo que siente.

## `src/data/rencorPhrases.js` · MOG_REPITE

- **41** ² · «%A vuelve a pasar por encima de %V. Lo de %D no fue casualidad, y %V aún no había terminado de llorarlo.» — Inventa lo que sintió o hizo entre un cruce y el otro.

## `src/data/rencorPhrases.js` · ROBO_NI_VENGARSE

- **230** ² · «%A lleva desde %D rumiando la venganza contra %V, y cuando por fin lo intenta, la caga.» — Inventa lo que sintió o hizo entre un cruce y el otro.

## `src/data/rencorPhrases.js` · SHIP_SUBE

- **245** ² · «%A y %V venían de un %C %D. Hoy el número sube y a alguien se le va a escapar una sonrisa.» — Inventa lo que sintió o hizo entre un cruce y el otro.
- **250** ² · «%D fue un %C para %A y %V. Hoy el número se anima, aunque ninguno de los dos lo admita.» — Inventa lo que sintió o hizo entre un cruce y el otro.

## `src/data/roboPhrases.js` · ROB_FAIL

- **95** ² · «El grupo ya tiene la captura de %A pagando la multa. Esa sí que no se la roba nadie.» — Inventa una costumbre o la reacción del grupo.

## `src/data/roboExtraPhrases.js` · BOTE_VACIO

- **85** ² · «Todavía no. El bote necesita más perdedores pagando, y tú ya sabes lo que es eso.» — Inventa una costumbre, un pasado o la reacción del grupo.

## `src/data/roboExtraPhrases.js` · COMPRA_ESCUDO

- **128** ² · «%N se blinda %H horas. Ha tardado más en decidirlo que va a tardar el grupo en esperar a que caduque.» — Inventa una costumbre, un pasado o la reacción del grupo.

## `src/data/roboExtraPhrases.js` · COMPRA_POBRE

- **312** ² · «Mierda de cuenta. %N quiere gastar lo que no tiene, como siempre.» — Inventa una costumbre, un pasado o la reacción del grupo.
- **334** ² · «A %N no le llega ni para mirar. Y lleva un rato mirando.» — Inventa una costumbre, un pasado o la reacción del grupo.

## `src/data/roboExtraPhrases.js` · ESCUDO_SALVA

- **347** ² · «Nada que hacer. %V se cubrió antes y %A llegó tarde a todo, como de costumbre.» — Inventa una costumbre, un pasado o la reacción del grupo.
- **359** ² · «El escudo de %V ha hecho más en un segundo que %A en toda la semana.» — Inventa una costumbre, un pasado o la reacción del grupo.
- **361** ² · «Contra el escudo de %V, %A tiene lo de siempre: ganas y ningún resultado.» — Inventa una costumbre, un pasado o la reacción del grupo.

## `src/data/roboExtraPhrases.js` · ATRACO_FALLA

- **696** ² · «%A ha perdido %C y el derecho a comprar. Menuda tarde de mierda.» — Inventa una costumbre, un pasado o la reacción del grupo.

## `src/commands/activity.js` · VS_AJUSTADO

- **56** ² · «Cara a cara igualado. %W gana, y a %L le va a escocer toda la tarde.» — Inventa una hora, una costumbre o lo que hace con el móvil.

## `src/commands/aura.js` · gainPobre

- **212** ² · «Cobras y ya piensas en jugártelo. Sigues muerto de hambre.» — Inventa lo que piensa.

## `src/commands/relevance.js` · INTERMEDIO

- **83** ² · «%MSG mensajes, %N. Estás en el grupo con un pie dentro y el otro en un chat que te importa más.» — Inventa una costumbre.

## `src/data/accionPhrases.js` · BLEH

- **981** ² · «%A hace burla delante del grupo. El grupo se pone de parte de %A, como siempre.» — «Como siempre»: inventa un historial.
