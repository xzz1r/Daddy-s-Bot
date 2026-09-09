# PENDIENTE — analogías baratas (Grok terminal)

Encargo del dueño, 9 sep 2026. **No está hecho.** 225 frases marcadas
con `// ANALOGÍA`. Este fichero es el brief.

## El encargo, en una línea

Fuera las analogías. Ataques directos, con coherencia.

Palabras del dueño: «todos los insultos del bot son analogías baratas, sin
coherencia, estúpidas y sin jugo real. Prefiero ataques directos y con
coherencia».

Y después aclaró **dónde**: no en `!fiel` / `!infiel`. En `!aura gana`,
`!aura pierde`, la respuesta cuando alguien escribe mal un comando, el
roast de quien usa acciones, y el mismo registro en el cooldown de `!aura`.

## Qué hacer

1. `grep -n "ANALOGÍA" src/commands/aura.js src/data/cooldownPhrases.js src/data/avisos.js src/data/accionPhrases.js`
   — esas líneas, y solo esas.
2. Reescribe cada una **en el sitio**. Quita el `// ANALOGÍA` cuando la frase
   nueva ya no compare a la persona con un objeto.
3. **No reescribas el pool entero** si hay líneas sin marca: esas ya hablan
   de la persona o son ejemplos del dueño (intocables, al inicio de
   `blessed` / `loss` / `cursed`).
4. `!fiel` / `!infiel` (`fidelityPhrases.js`) **no se toca**. Es dinámica.
5. No toques el motor. No toques importes, probabilidades ni cooldowns.
6. Al terminar: `npm run check && npm run analogias`. `npm run analogias`
   tiene que devolver **0 pendientes** (exit 0).

## Por qué no funcionan

El chiste es el OBJETO, no quien acaba de tirar:

- «Café de máquina: dos sorbos y a cenicero.»
- «Nokia que aún enciende. No sabe cómo apagarse. El saldo tampoco.»
- «Bajaste como baja un calcetín.»
- «Besas el cubilete vacío.»
- «La galleta de la suerte ya está abierta.»

Se le pueden mandar a cualquiera del grupo sin cambiar una letra. Un insulto
que vale para todos no va dirigido a nadie. Y la mitad gastan la segunda
oración justificando la comparación en vez de rematar.

## Qué se pide en su lugar

Habla de la PERSONA y de lo que acaba de pasar (ganó poco, perdió, spameó
`!aura`, escribió mal el comando, pagó un gif para fingir contacto).

```
ANTES  Nokia que aún enciende. No sabe cómo apagarse. El saldo tampoco.
ASÍ    Has ganado y el ranking ni se ha enterado. El número se mueve,
       tú no.

ANTES  Bajaste como baja un calcetín: solo, sin ceremonia.
ASÍ    Perdiste y el grupo siguió hablando. Ni un visto. Eso es lo que
       pesas aquí.

ANTES  Besas el cubilete vacío. El cuero no tiene más números.
ASÍ    Acabas de tirar. Pedir otra ahora es decirle al grupo que una
       no te llenó. Nada te llena.

ANTES  Analfabetismo con wifi.
ASÍ    Lo tenías copiado ahí arriba y lo has escrito mal igual.
       Ni copiando.
```

Las de la derecha se pueden verificar: describen lo que acaba de hacer.

El registro bueno ya está en `AURA.blessed` y en los cinco ejemplos
intocables de `loss` / `cursed`. Cópialo: el grupo reacciona a ESA
persona, no a un nokia.

## Qué NO es analogía barata (no las toques)

- `como quien` + verbo: «Perdiste aura como quien pierde un botón.»
- Los cinco ejemplos del dueño al inicio de `blessed`, `loss` y `cursed`
  (marcados `intocables`).
- `ROAST_USUARIO` en general: ese pool ya ataca la conducta (pagar un
  gif para fingir contacto). Solo hay tres líneas marcadas ahí.
- `fidelityPhrases.js`. Dinámica. Fuera de este encargo.

## Dónde está cada una

Total marcado: **225**.

| Pool | Cuántas |
|---|---|
| `src/commands/aura.js · AURA.gain` | 94 |
| `src/commands/aura.js · AURA.loss` | 58 |
| `src/data/cooldownPhrases.js · AURA_TIRADA` | 33 |
| `src/commands/aura.js · AURA.spiral` | 13 |
| `src/data/avisos.js · MAL_ESCRITO` | 5 |
| `src/commands/aura.js · AURA.blessed` | 4 |
| `src/commands/aura.js · AURA.cursed` | 4 |
| `src/data/cooldownPhrases.js · GENERICO` | 4 |
| `src/data/cooldownPhrases.js · AURA_APOSTAR` | 3 |
| `src/data/accionPhrases.js · ROAST_USUARIO` | 3 |
| `src/data/cooldownPhrases.js · AURA_TOP_ANSIAS` | 2 |
| `src/data/cooldownPhrases.js · AURA_TOP_POBRE` | 2 |

## Inventario completo

Índice = número de línea. Reescribe esa línea.

### src/commands/aura.js · AURA.blessed  (4)

- `L187` El puto grupo te ha mirado como se mira un radar en negativo: "este no era el blip".
- `L197` Has apagado el modo burla como se apaga una tele a las tres.
- `L212` Te han hecho sitio de mala gana, como en un ascensor lleno.
- `L224` Eres el radar que no debería pitar y está pitando.

### src/commands/aura.js · AURA.cursed  (4)

- `L586` Perdiste con la elegancia de un saco de mierda cayendo por las escaleras.
- `L602` Has dejado el ambiente de pedo en ascensor con diez pisos.
- `L638` Has hecho el equivalente a vomitar en la mesa y seguir comiendo.
- `L657` El ambiente se ha puesto de ascensor parado entre dos pisos.

### src/commands/aura.js · AURA.gain  (94)

- `L233` Café de máquina: dos sorbos y a cenicero. El ranking ni se ha enterado.
- `L234` Miga de croissant en la barba. El saldo se mueve. El grupo, no.
- `L235` Modo ahorro de batería: dura más. El chat sigue igual.
- `L236` El wifi del vecino llega flojo y se corta en cuanto te fías.
- `L237` El ticket del súper tiene más presencia que este resultado.
- `L238` Like de compromiso. Verde, sí. El grupo sigue a lo suyo.
- `L239` El kiosko te ha dado el cambio. Cuéntalo en voz alta y se acaba el turno.
- `L240` Hoy el aura te trató como a un cliente habitual: sin palos.
- `L241` El banco te mira igual de mal. Hoy no te cobra.
- `L242` Notificación de más uno. El teléfono ni vibra. El chat tampoco.
- `L243` Pizza fría a las cuatro. Nadie la reclamó. Ahora está en tu plato.
- `L245` Asiento del fondo del bus. Llegas. Nadie se ha girado.
- `L246` La cola avanzó un puesto. Sigues viendo la nuca del de delante.
- `L247` Cupón que caduca mañana. El azar se arrepiente rápido.
- `L249` Marca blanca del súper. Misma función, cara cutre, y el número en verde.
- `L251` Nokia que aún enciende. No sabe cómo apagarse. El saldo tampoco.
- `L252` Brick de leche a punto de caducar. Lo abres hoy o huele mañana.
- `L254` Ración de cortesía que no pediste. El camarero ya está en otra mesa.
- `L256` Te pagaron en puntos del súper. El sandwichera sale en 2041.
- `L257` Te han puesto en copia de un correo que no era para ti. Has aparecido. Punto.
- `L258` Un chupito de cortesía. Ni copa, ni hielo, ni segunda ronda.
- `L259` Te ha tocado el relleno del bocadillo: atún del barato.
- `L260` Te ha tocado el asiento del cine que nadie quería.
- `L261` Wifi de treinta minutos en el aeropuerto. Navega.
- `L262` Sello de pagado en una factura de tres euros. El cajero ni ha levantado la vista.
- `L263` La ola ha sido de un solo tipo. Una mano. Y se baja.
- `L264` Caramelo de menta del plato de la entrada. Gratis, duro y de nadie.
- `L265` Subiste como el agua del vaso: por capilaridad, sin que nadie lo pidiera.
- `L266` El número de espera ha bajado uno. Sigues en la sala.
- `L267` Envío estándar: llega tarde y sin aviso.
- `L269` Recorte del cupón: vale para la próxima, que igual no llega.
- `L270` Subida de termostato de un grado. Sigues en manga larga.
- `L271` Último palito de la bolsa. El paquete se acaba en el siguiente.
- `L272` Te pagaron el cubierto y el agua. El resto de la carta sigue siendo para otros.
- `L273` Cabezazo de cortesía. Contacto, sí. Gol, no.
- `L274` Subiste lo que sube un globo pinchado: un palmo, y se oye el aire.
- `L275` Hueles un segundo y el bote se queda en el escaparate.
- `L276` Verde de semáforo en ámbar. Pasa. Si te confías, el siguiente no espera.
- `L277` Hielo que sobró del cubo. Frío prestado. Mañana es un charco.
- `L278` Cabe en el vueltos de un café. Ni el camarero te ha deseado nada.
- `L279` Planta de plástico del súper: sigue viva porque nadie ha tenido tiempo de matarla.
- `L280` Tiempo añadido. Un minuto. El partido ya estaba decidido.
- `L281` Llaves del trastero. No del piso. Del trastero.
- `L282` Subiste como el pan de molde: una rebanada, y la bolsa sigue llena de aire.
- `L283` Un guiño. Un guiño, no un beso.
- `L284` Subida de andén: el tren no para, pero ya no estás en las vías.
- `L285` Pan de la cesta que nadie cogió. Gratis y duro.
- `L286` Post-it verde en la frente. El resto del expediente, igual.
- `L287` Modo invitado: entras, no guardas nada, y mañana ni se acuerda el chat.
- `L288` Sumas lo que suma un voto nulo: sale en el acta y no cambia nada.
- `L289` Asiento plegable del pasillo. Llegas sentado. El paisaje es el de siempre.
- `L290` Cama de hotel de tres estrellas: sosa y con el minibar cerrado.
- `L291` Un peldaño de parking: no ves la calle, pero ya no estás en el sótano.
- `L292` Chupito de hierbas que regalan a las once. Lo ponen y recogen el vaso.
- `L294` Bolsa de plástico de pago. La llevas. El ticket, dentro.
- `L295` Te dio para el café solo, no para el con leche. Pide eso y no mires la vitrina.
- `L296` De extra en la escena. Sale el nombre en los créditos del final, en gris.
- `L297` Trozo de chorizo que cae de la tapa. El plato era de otro. El trozo, tuyo.
- `L298` La mesa paga en céntimos y sigue a lo suyo.
- `L300` El aura te dio un hueso. El chat no ha levantado la cabeza.
- `L303` El segundo del bar. Ni menú, ni corona, ni foto. Lo que sobra.
- `L304` El like de tu tía en el estado. Cariño obligatorio, cero ganas.
- `L305` Has recogido del suelo lo que otro soltó. El suelo paga cuando le da la gana.
- `L307` Fila de espera que avanzó un puesto. El mostrador sigue lejos.
- `L308` Cómetelo antes de que se enfríe y nadie pregunte de quién era.
- `L311` Subiste como sube el IVA: poco, inevitable, y a nadie le hace ilusión.
- `L312` Lo justo para no salir en rojo en el puto ticket. El cajero ni te ha mirado.
- `L314` Transferencia corta. Acepta y no pongas concepto.
- `L315` Un número que no da ni para el gordo ni para el café.
- `L317` Funciona el mando y nadie te va a pedir el canal.
- `L318` Te ha salido el parche oficial. Sigue siendo el mismo juego, con un parche.
- `L319` Has ganado lo mismo que se pierde en un café. El saldo, un café más alto.
- `L320` Subiste lo que sube el sueldo en un restaurante: un insulto disfrazado de cifra.
- `L325` No tocas el volante, no eliges la radio, y aun así el coche ha avanzado un palmo.
- `L326` La mesa suelta migajas y se queda tan ancha. Hoy te ha tocado una.
- `L328` El saldo pica hacia arriba como pica un mosco: se nota y se olvida.
- `L329` El aura ha firmado con letra pequeña. La letra grande se la queda otro día.
- `L333` Sello en la tarjeta de fidelidad. El premio gordo sigue en el horizonte.
- `L334` El recambio de la cafetera: sale, quema el vaso, y ya.
- `L335` La mesa ha tenido que soltarlo. Poco. Lo ha soltado igual.
- `L336` El semáforo te ha dejado pasar en el último amarillo. El cruce, hecho.
- `L337` Un palmo de sombra. El toldo es de otro. El palmo, tuyo.
- `L338` El portero automático te ha abierto. Un segundo. Luego vuelve a cerrar.
- `L339` La máquina del metro te ha devuelto el céntimo de más. El tren no espera.
- `L340` La radio del taxi ha acertado una. El taxista ni se ha inmutado.
- `L341` El despertador ha sonado un minuto más tarde. El minuto, ganado.
- `L342` El ascensor ha parado en tu piso sin que nadie pulsara el de al lado.
- `L343` El mando ha encontrado la pila. El canal, el de siempre.
- `L344` La cola del pan ha avanzado dos. El de delante sigue pidiendo roscos.
- `L345` El parquímetro te ha regalado cinco minutos. El aviso naranja, después.
- `L346` La lavadora ha terminado en el primer ciclo. Nadie estaba esperando el pitido.
- `L347` El timbre ha sonado y era el del rellano de al lado. Hoy no tocaba palo.
- `L348` El cubata de cortesía del cierre. Lo ponen cuando ya no hay hielo.
- `L349` La mesa ha pagado con calderilla. La calderilla cuenta. El camarero, a otra.

### src/commands/aura.js · AURA.loss  (58)

- `L364` A estas alturas podría ser tu puto fondo de pantalla.
- `L370` Tu número duró menos que un fuera de juego. Ridículo.
- `L371` Tu puta pérdida tiene esa misma energía.
- `L372` Joder, un estado que caduca en 24 horas.
- `L373` Joder, la notificación silenciada. El teléfono ni se ha molestado en vibrar por ti.
- `L374` Joder, la silla de plástico que nadie retira después de la fiesta.
- `L376` Ni el filtro te tiene respeto. Te deja pasar. Qué asco de trato.
- `L377` El puto grupo le ha dado a skip. Tú eres el anuncio.
- `L378` Nota adhesiva que se cae de la nevera. El imán no te quería tanto, fracasado.
- `L380` Tu puta pérdida va al cajón de los cargadores huérfanos.
- `L382` Paraguas olvidado en el bar: lo miran un día y lo tiran. Cutre y puntual.
- `L385` Coño, el wifi que pica una vez y se cae.
- `L386` Alarma que snoozeas. El golpe es pequeño y ya lo tenías en el cuerpo, cabrón.
- `L393` Desaparece uno y el otro se queda viudo. Como tu saldo, miseria.
- `L394` El aura te cobró el cubierto. Ni plato. Ni segundo. Solo el cubierto, gilipollas.
- `L395` Bajaste como baja un calcetín: solo, sin ceremonia, y se te ve el tobillo.
- `L396` Te han pasado el trapo. Ni fregado. Trapo. Lo justo para que no se note el polvo.
- `L398` Te restaron lo que se lleva el IVA: lo sabías, lo odias, y pagas igual.
- `L400` Bajaste como el hielo del vaso: se nota al final, cuando ya está aguado.
- `L401` Te han dado el visto de compromiso. Obligatorio, frío, y a otra cosa.
- `L403` El aura te ha hecho una transferencia al revés.
- `L404` Te quitaron el asiento del pasillo. Sigues en el vagón. Viajas peor, que es lo tuyo.
- `L405` Bajas despacio y sin funeral, como una planta de IKEA.
- `L407` Pagas de más y nadie te espera en llegadas.
- `L409` El aura te ha puesto en cc de un recorte. Has salido. El puto hilo sigue sin ti.
- `L410` Bajaste como el pan de molde: una rebanada menos, y la bolsa parece igual de llena.
- `L411` Te restaron el cubito. El vaso sigue. La bebida sabe igual de regular.
- `L414` Te han pinchado la rueda y sigues. El coche baja un palmo. Nadie llama al grúa.
- `L416` El aura te ha dejado el último palito... y te lo ha quitado. Lo querías. Da más pena.
- `L417` Bajaste como el brillo de un chrome a las tres: se nota si miras, y nadie mira.
- `L418` Has salido de la tienda más pobre y con menos dignidad.
- `L419` El puto grupo te usó de ruido blanco. Bajaste el volumen un punto. El podcast seguía.
- `L420` Te restaron lo que se lleva el perro del parque: porque estaba ahí.
- `L423` Te quitaron el hielo y te dejaron el agua. Sigues bebiendo. El gin se lo quedó otro.
- `L426` Te han dado el recorte del cupón caducado. Lo tenías. Ya no vale. Típico.
- `L427` Un uno por ciento, y ni lo has sacado del bolsillo a mirar.
- `L428` El aura te cobró el peaje de tres euros. La autopista sigue. Tú sales más corto.
- `L429` Te restaron el pan de la cesta. El segundo plato no era para ti de todas formas.
- `L432` Bajaste como un calcetín en el tendedero: un palmo, y el viento ni te nombra.
- `L433` Te han pasado factura del café que no pediste. Lo pagas. No lo bebes. Callas.
- `L434` El aura te ha hecho un cabezazo suave. Contacto. Falta. Ni penalti. Ni VAR. Nada.
- `L435` La masa sigue. El queso era lo único que te gustaba.
- `L436` Bajada de esas que caben en el vueltos que no te dieron.
- `L438` Un agujero de polilla en algo que ya estaba viejo.
- `L439` Pérdida de silla reservada con un abrigo. El abrigo era de otro. Tú te quedas de pie.
- `L440` El aura te ha puesto el semáforo en ámbar y lo has cruzado mal.
- `L442` Te cobraron el recargo de madrugada. El taxi te deja igual de lejos, ahora más pobre.
- `L444` Te restaron el último chicle del paquete.
- `L445` Un grado menos y sigues pasando frío. El casero no viene.
- `L446` Cama de albergue: corta, dura y con el ronquido de al lado.
- `L448` Pérdida de esas que se miden en migas. El mantel se sacude y tú caes al suelo.
- `L450` Bajaste como el wifi del tren: se corta, vuelve, se corta, y el viaje no te espera.
- `L451` Come con las manos, que para lo que hay ya te vale.
- `L452` El aura te ha puesto de extra y te ha recortado el segundo.
- `L453` Te han dado el número 87 de la cola y ha salido el 86 dos veces.
- `L456` Te quitaron lo que se lleva el viento de una terraza: la servilleta, no el plato.
- `L458` El aura te cobró el café solo cuando pediste con leche.
- `L460` Te restaron el panecillo de cortesía. El restaurante sigue lleno. Tu mesa, no.

### src/commands/aura.js · AURA.spiral  (13)

- `L481` Hipoteca de aura negativa: pagas cada mes y el piso sigue siendo un puto agujero.
- `L482` Joder, la temporada siete de tu fracaso. Nadie pidió renovación. Netflix tampoco.
- `L483` El GPS solo sabe decir "sigue todo recto hacia abajo". Y le haces caso, cabrón.
- `L491` Joder, el ascensor que solo tiene botón menos uno.
- `L500` Carpeta de descensos con subcarpetas. Has tenido que hacer árbol de directorios.
- `L501` Línea de metro que solo para en sótanos. El mapa eres tú, y no hay transbordo.
- `L502` Grifo que gotea hacia abajo. Nadie llama al fontanero. El cubo eres tú y ya rebosó.
- `L509` Hoyos de golf: cada uno más hondo. Nadie te va a aplaudir el putt, inútil.
- `L513` Cama de clavos en el -2. Ya no pincha. Te has calloso el fracaso.
- `L514` Rampa de parking hacia el -4. Las luces parpadean. El coche eres tú.
- `L526` Escalera mecánica en bajada, rota, y tú andando igual.
- `L535` Rampa de skate hacia un bordillo. Te caes. Subes. Te caes. El vídeo ya no se graba.
- `L547` Usando la rampa al revés. El que la diseñó no pensó en ti.

### src/data/accionPhrases.js · ROAST_USUARIO  (3)

- `L490` La ronda de %A es una dieta de menciones. Cero calorías, y aun así repite plato tres veces al día.
- `L495` El único idioma que le funciona a %A es el comando. El de la boca se le oxidó. Se le oye el óxido cada vez que paga.
- `L512` %A, has pagado para no tener que oír tu propia voz pidiéndolo. La voz te delataría. El cargo te hace de madre y te deja en la cuna. El grupo hace de sala.

### src/data/avisos.js · MAL_ESCRITO  (5)

- `L265` Analfabetismo con wifi. Te lo escribo yo, que tú no llegas.
- `L269` Cinco letras te han ganado y encima ni te has enterado.
- `L278` Cinco letras. Cinco. Y han podido contigo.
- `L284` Eso no era un examen y lo has suspendido igual.
- `L285` Una palabra corta te ha ganado delante de todos.

### src/data/cooldownPhrases.js · AURA_APOSTAR  (3)

- `L260` La mesa no es un chicle. Una vez y a la puta calle un rato. El asiento no se reserva con ansias.
- `L286` Estás tratando la puta mesa como un cajero. No dispensa a demanda. Ni a ti.
- `L315` La caja de cartas se cerró. Meter los dedos entre el naipe es de gilipollas con anillo de jugador.

### src/data/cooldownPhrases.js · AURA_TIRADA  (33)

- `L144` Estás tratando el dado como una puta máquina de café. No lo es. Es un receso y tú un capricho.
- `L179` El comando no es un chicle. No se pide otro con el primero todavía en la boca. Traga.
- `L180` Estás tratando tu aura como una uña. Te la comes de nervios, don nadie.
- `L184` Pedir otra tirada ahora es el equivalente a preguntar "¿ya?" en un viaje de tres calles.
- `L187` Un resultado por visita. La tienda de al lado tampoco te deja llevarte dos.
- `L188` Estás enfriando el puto dado con la respiración. Suéltalo. No se cocina otro número a soplidos.
- `L194` Estás pidiendo bis de una puta canción de diez segundos. El DJ no te mira. Con razón.
- `L198` El marcador no es un espejo. Deja de ir cada rato a ver si te cambió la cara. No te cambió.
- `L210` Ya tuviste tu escena. El telón bajó. No hay segundo acto a demanda. Baja del escenario.
- `L213` El dado se siente observado. Déjalo en paz. A ti también te vendría bien.
- `L216` Soplas un puto dado que ya está muerto. El número no resucita. Tú sí te ves de velorio barato.
- `L217` La moneda ya cayó. Volverla a lanzar ahora es de tramposo con las manos temblando de puto vicio.
- `L218` Te pesas otra vez en la misma báscula. El puto número no adelgazó. Adelgazó tu disimulo.
- `L219` La galleta de la suerte ya está abierta. El papelito no se reescribe porque tú lo mires con asco.
- `L220` Sacudes la bola ocho después de que habló. La respuesta sigue siendo no. El ridículo, sí.
- `L221` El naipe ya está boca arriba. Taparlo con la palma no cambia el palo, gilipollas de mesa.
- `L222` Estás fotografiando el puto resultado para que salga otro. La cámara no edita azar. Te edita a ti.
- `L223` La bola ya cayó al tubo. Pedir recuento de una sola bola es de fracasado con megáfono.
- `L224` Le pides al asador que te haga otra vez el mismo filete. El filete está en el plato. Tú estás en el chiste.
- `L225` Besas el cubilete vacío. El cuero no tiene más números. Tiene tu saliva de ansioso, qué miseria.
- `L227` La vela del pastel ya está apagada y pides otro soplido. El deseo se gastó. Quedaste tú, don nadie.
- `L228` Refrescas el puto resultado de un partido que ya pitó final. El empate de carácter eres tú.
- `L229` Partiste el hueso de la suerte. Las dos mitades ya hablaron. Tirar de un palo muerto no te alarga el deseo.
- `L230` El termómetro ya marcó y lo sacudes para inventarte otra fiebre. El azar no finge esa basura.
- `L231` Estás soplando cartas como si el viento de tu boca valiera más que la que ya salió.
- `L232` La foto instantánea ya salió nítida. Agitarla ahora no cambia la cara. Cambia lo inútil de tus muñecas.
- `L233` Le hablas al cubilete como a un sordo. El sordo eres tú: el puto número te lo dijo en la cara y pediste subtítulos.
- `L235` Raspas la mesa con el canto de la mano pidiendo suerte extra. La madera no es un dado. Eres un pringado con barniz.
- `L236` La bola ya se sentó. Meter el dedo para acomodarla no mueve el número. Mueve lo cutre de tus uñas.
- `L239` Pides una segunda opinión a un cubo de plástico. El plástico ya votó. El jurado del grupo también.
- `L240` Estás lamiendo el número como si el sabor fuera a subir. El sabor es plástico. El hambre es tuya, mierda de rito.
- `L242` Estás tratando !aura como un chicle. El sabor se fue. Lo que queda es goma.
- `L245` Has hecho del dado una uña. Te la comes de nervios. El puto grupo ve las manos.

### src/data/cooldownPhrases.js · AURA_TOP_ANSIAS  (2)

- `L355` Pedir el puto top estando en él es como preguntar si sigues vivo. Sí. El certificado ya salió.
- `L396` Te pesas otra vez ahora que ganaste. El puto número de la báscula no te sube el puesto. Te baja el disimulo.

### src/data/cooldownPhrases.js · AURA_TOP_POBRE  (2)

- `L432` Consultar el puto top con tu saldo es como leer la carta sin cartera. El mesero ya bosteza.
- `L476` El podio no es un reclamo. Aunque tú lo trates como un escaparate de centro comercial.

### src/data/cooldownPhrases.js · GENERICO  (4)

- `L99` El semáforo está en rojo y pitas. El cruce no acelera. Tú sí te encoges.
- `L106` Machacas el piso en el ascensor. No viene más rápido. Viene tu miseria en un cubo de acero.
- `L113` Descolgaste un teléfono que acaba de colgar. El tono de ocupado te queda como un traje.
- `L116` El chicle ya no tiene gusto y lo masticas igual. Eso no es hambre. Es el hobby del que no tiene tema.

## Ideas (no son este encargo)

Están al final de `AGENTS.md`. No las implementes mientras queden analogías.
