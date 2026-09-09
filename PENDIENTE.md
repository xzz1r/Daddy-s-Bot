# PENDIENTE — analogías baratas (Grok terminal)

Encargo del dueño, 9 sep 2026. **No está hecho: hay que reescribir las frases
marcadas.** Este fichero es el brief. Las frases están marcadas en el código
con `// ANALOGÍA`.

## El encargo, en una línea

Fuera las analogías. Ataques directos, con coherencia.

Palabras del dueño: «todos los insultos del bot son analogías baratas, sin
coherencia, estúpidas y sin jugo real. Prefiero ataques directos y con
coherencia».

## Qué hacer

1. `grep -n "ANALOGÍA" src/data/fidelityPhrases.js src/data/percentLabels.js`
   — esas líneas, y solo esas.
2. Reescribe cada una **en el sitio**. Quita el `// ANALOGÍA` cuando la frase
   nueva ya no compare a la persona con un objeto.
3. **No reescribas el fichero entero.** En `fidelityPhrases.js` hay ~600
   frases y solo ~215 son el problema. Las demás ya hablan de la persona.
   Machacarlas es peor que dejarlas.
4. No toques el motor (`src/commands/`, `src/utils/`, `src/handlers/`).
5. Al terminar: `npm run check && npm run analogias && npm run progreso`.
   `npm run analogias` tiene que devolver **0 pendientes** (exit 0).

## Por qué no funcionan

El chiste es el OBJETO, no la persona:

- «Eres más fiel que un perro callejero al primer gilipollas que le da pan.»
- «Tu lealtad es como el wifi del vecino: siempre ahí y nadie la merece.»
- «Eres más firme que una estaca en el culo de un vampiro.»

Se le pueden mandar a cualquiera del grupo sin cambiar una letra. Un insulto
que vale para todos no va dirigido a nadie. Y la mitad gastan la segunda
oración justificando la comparación («con la diferencia de que…», «pero esta
mola») en vez de rematar.

## Qué se pide en su lugar

Habla de la PERSONA y de lo que hace. Nombra la conducta. Si le quitas la
comparación y no queda nada, la frase era basura.

```
ANTES  Eres más falso que un billete de tres euros pintado con rotulador.
ASÍ    Dices que sí a todo y no cumples ni una. Al final ya nadie te lo pide,
       que es peor que un no.

ANTES  Tu lealtad es como una cucaracha: sobrevive a todo.
ASÍ    Sigues ahí cuando ya no queda nada que ganar. Eso no se finge y por
       eso incomoda.

ANTES  Eres el puto Netflix de las relaciones: varios perfiles activos.
ASÍ    Tienes tres conversaciones abiertas y a las tres les dices lo mismo.
       Se te va a caer por el orden de los mensajes, no por la mentira.
```

Las de la derecha se pueden verificar: describen algo que alguien hace.

## Qué NO es analogía barata (no las toques)

- `como quien` + verbo: `%A besa a %V como quien firma algo`. Colorea una
  actitud. Es el registro bueno.
- Remate `más X que tú` donde el sujeto sigue siendo la persona:
  «El algoritmo tiene más dignidad que tú.»
- Dato concreto de la persona con un `más que` de escala:
  «Tu cama tiene más migas que una panadería.» (es SU cama)
- Modismo «más cojones que sentido común».

## Reglas del fichero que siguen en pie

Lee `GUIA.md` §5 bis antes de escribir. En `fidelityPhrases.js` además:

- FIEL alto y FIEL medio = HALAGO. FIEL bajo = paliza. En INFIEL al revés.
  Un halago que insulta rompe el comando.
- Nada de género: `[nombre]` le toca a cualquiera. Ni «él», ni adjetivos en
  -o predicados de la persona. `npm run check` lo pilla.
- Ni dos frases iguales con una palabra cambiada. La capa 17 las caza.
- 101 por pool. No las bajes. Sustituye, no borres.
- Polaridad, placeholders y arsenal: igual que el resto del corpus.

## Dónde está cada una

Total marcado: **221**. Casi todo en `fidelityPhrases.js` (el fichero de `!fiel` / `!infiel`). Seis en `percentLabels.js`.

| Pool | Cuántas |
|---|---|
| `src/data/fidelityPhrases.js · INFIEL_MID` | 48 |
| `src/data/fidelityPhrases.js · INFIEL_HIGH` | 39 |
| `src/data/fidelityPhrases.js · FIEL_MID` | 38 |
| `src/data/fidelityPhrases.js · FIEL_LOW` | 34 |
| `src/data/fidelityPhrases.js · FIEL_HIGH` | 30 |
| `src/data/fidelityPhrases.js · INFIEL_LOW` | 26 |
| `src/data/percentLabels.js · gay.mid` | 4 |
| `src/data/percentLabels.js · simp.high` | 1 |
| `src/data/percentLabels.js · inutil.high` | 1 |

## Inventario completo

Índice = número de línea en el fichero. Reescribe esa línea.

### src/data/fidelityPhrases.js · FIEL_HIGH  (30)

- `L90` Fiel como un puto labrador viejo: ni se va, ni ladra, ni deja de estar ahí. Incomodo de lo leal que es.
- `L94` Eres mas fiel que un perro callejero al primer gilipollas que le da un trozo de pan. Pero lo digo con carino.
- `L98` Tu lealtad es como una cucaracha nuclear: sobrevive a todo, no hay quien la mate y esta ahí cuando el mundo se acaba.
- `L102` Fiel como la gravedad: siempre ahí, sin que nadie te lo pida, jodiéndote las rodillas pero sujetando todo el tinglado.
- `L105` Coño, tienes mas lealtad que un guardaespaldas del narco. Con la diferencia de que a ti no te pagan, lo haces gratis, que es peor.
- `L106` La lealtad de [nombre] aguanta mas presión que los cimientos de una catedral. Y lleva mas años en pie que la mayoria.
- `L107` Eres fiel como un reloj de los viejos: no necesita pilas, no necesita wifi, simplemente funciona porque le sale de los cojones.
- `L114` Coño, eres mas fiable que la muerte. Que es lo único seguro en esta vida, y ahora resulta que tu también.
- `L116` Tu fidelidad es como el hormigon armado: fea de mirar, pero joder, aguanta lo que le eches sin partirse.
- `L119` Fiel como la mierda al zapato: no hay quien te separe de los tuyos, por mucho que el camino sea una pocilga.
- `L120` Hostia, este cabrón tiene mas principios que el puto codigo civil. Y los cumple mejor, además.
- `L122` Tu nivel de lealtad es como encontrar un billete de quinientos en la calle: nadie se lo cree hasta que lo tiene delante.
- `L126` Eres mas constante que un dolor de muelas. Con la diferencia de que a ti se te quiere tener cerca.
- `L128` Tu fidelidad da mas seguridad que un chaleco antibalas, un bunker y una cuenta en Suiza juntos. Y sale gratis, coño.
- `L129` Hostia puta, alguien tan fiel en esta epoca es como ver un unicornio cagando arcoiris. No debería existir pero ahí esta.
- `L132` Tienes mas fidelidad que un soldado japones de los que seguian en la selva treinta años después de la guerra. Sin coña.
- `L133` Coño, tu lealtad es como el wifi del vecino: siempre ahí, siempre fiable, y la mayoria no se merece tenerla gratis.
- `L139` Tu fidelidad me da miedo, cabrón. Es como esa calma antes del terremoto, pero el terremoto nunca llega porque tu no fallas.
- `L142` Eres mas firme que una estaca en el culo de un vampiro. Incapaz de moverte, incapaz de fallar, incapaz de soltar. Admirable.
- `L143` Coño, [nombre], tu lealtad sobrevive a las discusiones, a la distancia y al paso del tiempo. Es como una cucaracha pero en bonito.
- `L145` La fidelidad de este cabrón tiene mas capas que una puta cebolla. Y al pelarla no lloras, que es lo bueno.
- `L154` Tu fidelidad es como un tatuaje en la cara: no la puedes esconder, no la puedes quitar, y todo el mundo la ve. Respeto, joder.
- `L158` La lealtad de [nombre] es como una ETS incurable: una vez que la pillas, la tienes para siempre. Pero esta mola.
- `L164` Tu lealtad es como el olor a ajo: penetrante, imposible de ignorar y se queda con todo el que te conoce. Joder.
- `L172` Eres mas fiable que el amanecer, cabrón. Que puede llover, nevar o caer mierda del cielo, pero tu vas a estar ahí.
- `L173` Joder, tu lealtad es como un herpes: no se va nunca. Pero un herpes bueno, si eso existiese. Creo que acabo de inventarlo.
- `L178` Tu eres fiel como una hipoteca a cuarenta años: siempre presente, imposible de ignorar y al final todo el mundo te agradece.
- `L180` Hostia puta, la lealtad de [nombre] es como una bomba nuclear de confianza. No la sueltas a menudo, pero cuando esta ahí, se nota, coño.
- `L182` [nombre] tiene mas lealtad que neuronas tiene un terraplanista. Que no es difícil, pero viniendo de alguien real, impresiona.
- `L186` [nombre], tu lealtad es como una infeccion: se pega. La gente a tu alrededor empieza a ser mejor persona y ni sabe por que, el muy cabrón.

### src/data/fidelityPhrases.js · FIEL_LOW  (34)

- `L305` Joder, [nombre], eres tan fiel como un billete falso: pasas de mano en mano y todo el que te pilla se siente estafado.
- `L306` Tu lealtad es como la virginidad de un actor porno: se perdio hace tanto que ya nadie recuerda que existio.
- `L311` [nombre] cambia de lealtad mas rápido que un chaval de quince años cambia de paja. Cada día una nueva, sin compromiso ninguno.
- `L315` Coño, tienes mas caras que un dado de rol. Y en todas sale el mismo resultado: traidor hijo de la gran puta.
- `L318` Joder, tu lealtad es como el papel de vater de un bar: aspera, escasa y nadie en su sano juicio querría depender de ella.
- `L323` Tu concepto de fidelidad es como el WiFi gratis de un McDonalds: existe en teoria, pero en la practica es tan mierda que nadie lo usa.
- `L324` Lo de [nombre] es mas falso que un billete de tres euros pintado con rotulador. Y aun así hay gilipollas que se lo tragan.
- `L326` Tu historial de traiciones tiene mas capitulos que Cuentame. Y el argumento siempre es el mismo: tu jodiendo a alguien.
- `L333` Tu lealtad es como un culo después de Taco Bell: explosiva, impredecible y deja un desastre que nadie quiere limpiar.
- `L335` Coño, eres mas rastrero que una babosa en un sotano humedo. Dejas un rastro de mierda por donde pasas y nadie quiere tocarte.
- `L339` Tu compromiso se evapora mas rápido que el alcohol en una puta herida. Escuece un segundo y desaparece para siempre.
- `L342` Coño, tu lealtad es como una braga rota: no sujeta nada, no cubre nada y todo el mundo ve lo que no debería verse.
- `L344` [nombre] tiene la palabra mas vacia que el cerebro de un terraplanista. Y eso, joder, ya es alcanzar niveles astronomicos de vacio.
- `L352` Eres mas cinico que un dentista comiendo caramelos: sabes exactamente el daño que haces y te la suda, mierda humana.
- `L356` Tu lealtad es como el pelo de un calvo: todo el mundo sabe que no esta, pero tu sigues peinándote como si existiera.
- `L357` [nombre] tiene mas vidas que un gato, pero todas las usa para joder a alguien distinto. Nueve traiciones garantizadas.
- `L358` Joder, tu fidelidad es como la pasta de dientes de un avión: tamaño miniatura, dura un viaje y nadie la quiere de verdad.
- `L361` Hostia puta, tu compromiso es como una erección de las cuatro de la mañana: aparece sin motivo, dura poco y no le sirve a nadie.
- `L363` Tu palabra tiene menos valor que una moneda de chocolate: se derrite en cuanto la aprietas y no puedes comprar nada con ella.
- `L366` Tu fidelidad es como buscar señal en un bunker nuclear: puedes intentarlo, pero todo el mundo sabe que es imposible.
- `L369` Eres mas traicionero que un escalon mojado: no se ve venir, te partes la hostia y cuando te recuperas ya se ha secado la prueba.
- `L372` Tu historial de fidelidad es mas corto que la polla de un hamster. Y al menos el hamster la usa con honestidad.
- `L373` Hostia puta, [nombre] tiene menos principios que un McPollo tiene pollo. Y mira que el McPollo ya es cuestionable de cojones.
- `L378` Tu compromiso es como una tapa de cerveza: se abre con facilidad, se tira sin pensar y nadie la recoge del puto suelo.
- `L381` Coño, eres mas resbaladizo que una anguila con vaselina. Nadie puede agarrarte, nadie puede fiarse y nadie quiere tocarte.
- `L382` Tu lealtad es como una tienda de Todo a Cien: parece que hay mucho dentro pero todo es de mierda y se rompe al primer uso.
- `L387` Coño, tu palabra es como un pañuelo de papel: la usas una vez, la tiras y nadie en su puto juicio la recogeria del suelo.
- `L391` Tu lealtad es como un fantasma: todo el mundo habla de ella pero nadie la ha visto nunca. Y probablemente no existe.
- `L392` Hostia puta, [nombre] es mas traidor que un GPS que te lleva por peajes. Te jode el bolsillo y encima te dice que es el camino mas corto.
- `L393` Coño, tu compromiso es como una bolsa de basura: sirve para cargar mierda un rato y después se tira sin mirar dentro.
- `L396` Joder, tu fidelidad es como la conexion Bluetooth de un coche viejo: se intenta, no conecta y al final vas con el cable.
- `L399` Hostia, tu lealtad tiene menos capas que un chicle masticado: fino, pegajoso y asqueroso de mirar.
- `L400` Coño, tu palabra es mas falsa que las tetas de una presentadora de Telecinco. Y al menos las de ella tienen garantia.
- `L401` Tu fidelidad es como el wifi de un hospital: existe en teoria, nadie sabe la contraseña y cuando la tienes no funciona.

### src/data/fidelityPhrases.js · FIEL_MID  (38)

- `L197` Joder, [nombre], eres fiel como una bombilla que parpadea: a veces das luz, a veces dejas a oscuras, y nadie sabe cuando te vas a fundir del todo.
- `L198` Tu lealtad es como la cobertura en un pueblo de mierda: va y viene, y justo cuando mas la necesitas se corta.
- `L203` Tu compromiso es como un condon del chino: parece que aguanta, pero nadie con dos dedos de frente se fiaria de verdad.
- `L208` Hostia puta, tu fidelidad tiene mas altibajos que la bolsa en un lunes negro. Nadie sabe donde invertir contigo.
- `L209` Coño, eres como esos yogures que no sabes si estan caducados: no huelen mal del todo, pero nadie con sentido comun se los come.
- `L213` Tu compromiso es como una erección después de diez cervezas: la intención esta, pero el resultado es bastante discutible.
- `L214` Hostia, [nombre], eres mas impredecible que una cagada después de kebab. Nadie sabe si hoy toca fiel o toca que la cagues.
- `L218` Tu fidelidad es como el pene de un viejo: unas veces funciona y otras no, y nadie sabe cuando va a responder, joder.
- `L219` Joder, tu lealtad tiene mas grietas que un piso de Idealista por doscientos euros al mes. Se ve el desastre pero te lo venden bonito.
- `L222` Hostia, ni te vas ni te quedas del todo. Eres como una puta puerta batiente: estas dentro y fuera a la vez sin decidirte nunca.
- `L225` Eres el Thermomix de la fidelidad: haces de todo un poco pero nada bien. Ni leal ni traidor, simplemente mediocre.
- `L226` Joder, tu compromiso es como hacer dieta un lunes: dura hasta que ves una pizza, y la pizza siempre aparece.
- `L229` Tu fidelidad es como una polla dibujada en un pupitre: parece que esta ahí para siempre, pero con un poco de esfuerzo se borra.
- `L235` Eres fiel como un borracho es elocuente: a ratos parece que si, pero nadie con dos dedos de frente se lo creeria del todo.
- `L236` Hostia, tu compromiso es como una suscripción de gimnasio: pagas el primer mes motivado y el segundo ya ni apareces.
- `L238` Tu fidelidad es como el horoscopo: unas veces aciertas y otras no, y la gente que se lo cree acaba igual de jodida.
- `L239` Coño, eres tan fiable como un pedo silencioso: nadie sabe cuando va a llegar, pero cuando llega, la cosa apesta.
- `L245` [nombre] es como un semaforo en ambar permanente: nadie sabe si frenar o acelerar contigo, y siempre acaba en accidente.
- `L246` Coño, tu fidelidad es como un souffle: se infla cuando la cosa va bien y se hunde en cuanto abres la puerta del horno.
- `L248` Tu compromiso es como el autobus de un pueblo: a veces viene, a veces no, y cuando viene llega tarde y lleno de mierda.
- `L250` Hostia puta, eres fiel como un GPS sin datos: la dirección general la tienes, pero los detalles te los inventas sobre la marcha.
- `L252` Coño, [nombre], tu fidelidad es como una tirita en una herida de bala: el gesto esta, pero no cubre una puta mierda.
- `L254` Joder, tu moral tiene mas agujeros que un queso suizo. Parece solida de lejos, pero cuando te acercas se ve toda la mierda.
- `L256` Hostia, eres como una cita del dentista: todo el mundo sabe que deberias ir, pero nadie confia en que aparezcas.
- `L257` Tu fidelidad es como el agua de Valencia: parece suave pero te pega la hostia cuando menos te lo esperas.
- `L260` Coño, tu compromiso es como un castillo de arena: bonito de ver, imposible de mantener y la primera ola se lo lleva por delante.
- `L263` Tu lealtad es como una cerveza sin alcohol: tiene la forma, el color y hasta el nombre, pero le falta lo que importa, joder.
- `L265` Eres tan consistente como el tiempo en primavera: sol, lluvia, granizo y otra vez sol, todo en la misma puta mañana.
- `L268` Tu compromiso es como una promesa de Año Nuevo: emocionante el 1 de enero, olvidada el 15 y muerta para febrero. Clasico.
- `L274` Coño, eres mas volatil que la gasolina en verano. Un chispazo y tu fidelidad explota en mil pedazos de mierda.
- `L276` Tu lealtad es como un pedo en un jacuzzi: sube a la superficie tarde o temprano, y cuando sale, la cosa apesta y mucho.
- `L280` Coño, tu fidelidad es como un contrato de practicas: temporal, mal pagado y todo el mundo sabe que no va a durar.
- `L286` [nombre] es como un Kinder Sorpresa de la lealtad: nunca sabes que coño te va a tocar dentro, y la mayoria de veces es basura.
- `L288` Joder, eres fiel como un puto VHS: funcionas si alguien tiene paciencia contigo, pero ya nadie tiene paciencia para esa mierda.
- `L289` Tu palabra es como un chicle sin azucar: pierde el sabor a los cinco minutos y la gente la escupe sin pensárselo dos veces.
- `L291` Hostia puta, tu fidelidad es como los abdominales en enero: mucha motivación al principio, cero resultados y abandono total.
- `L294` Coño, tu compromiso es como una pegatina vieja: medio pegada, medio despegada, y con un aspecto lamentable.
- `L297` Hostia, ni traicionas ni proteges. Eres como un puto cono de trafico: estas ahí en medio, no haces nada y todo el mundo te esquiva.

### src/data/fidelityPhrases.js · INFIEL_HIGH  (39)

- `L413` Joder, [nombre], eres mas infiel que el puto diablo en una convencion de monjas. Has roto mas camas que promesas, y eso ya es decir.
- `L414` Tu polla tiene mas kilometros que un Seat Ibiza de repartidor. Y como ese Ibiza, ya no la quiere nadie.
- `L422` Tu fidelidad es como el bigote de un adolescente: se nota que intentas, pero nadie se lo toma en serio, gilipollas.
- `L428` Hostia puta, tu lealtad en pareja es como un unicornio: bonita idea, pero no existe y nadie la ha visto nunca, mierda.
- `L430` [nombre] tiene mas lios que un ovillo de lana en una casa con gatos. Enredado de cojones y sin posibilidad de arreglo.
- `L431` Coño, tu pene tiene mas aventuras que Indiana Jones. Y como Indiana, siempre acaba en sitios donde no debería estar.
- `L432` Tu historial sentimental parece un menu de All You Can Eat: comes de todo, no disfrutas nada y siempre te vas con dolor de barriga.
- `L434` Joder, eres mas infiel que un politico con sus promesas electorales. Y al menos el politico espera cuatro años para mentir otra vez.
- `L435` Hostia, si tu cama hablara, contaria mas historias que las Mil y Una Noches. Y todas acabarian con alguien llorando.
- `L436` Tu compromiso de pareja es como un menu del día: barato, rápido y lo cambias cada veinticuatro horas.
- `L437` [nombre] tiene una agenda de contactos que parece el censo electoral. Y ha votado en todas las circunscripciones, el muy guarro.
- `L445` Coño, tu relación es como una puerta giratoria: siempre hay alguien entrando mientras otro sale. Circulacion continua de mierda.
- `L447` [nombre] es mas resbaladizo que una pista de hielo con aceite. Nadie puede sujetarle porque siempre esta deslizándose hacia otra cama.
- `L450` Tu compromiso es como un castillo de naipes en un huracan: nunca tuvo posibilidad de sostenerse y todo el mundo lo sabia menos tu pareja.
- `L454` [nombre] tiene mas secretos que la CIA y menos escrupulos que la mafia. Combinación perfecta para ser el peor hijo de puta del grupo.
- `L456` Hostia puta, tu relación es como un queso gruyere: mas agujeros que sustancia y cada vez huele peor.
- `L459` Coño, tu bragueta tiene mas aperturas que la Bolsa de Nueva York. Y como en la Bolsa, siempre hay alguien que pierde.
- `L463` Hostia, eres como un taxi: te montas, pagas el viaje y al llegar te bajas sin mirar atras. Servicio publico del sexo.
- `L466` Coño, tu compromiso es como una canción del verano: suena tres meses, la odias y al año siguiente ni la recuerdas, basura.
- `L471` Tu relación es como una funda de móvil del bazar: la pones sabiendo que no va a durar y la cambias en cuanto se raya un poco.
- `L474` Tu lealtad de pareja es como un WiFi de bar: la contraseña la tiene todo el mundo y la conexion es una mierda.
- `L477` Hostia, tu bragueta se abre mas veces que el telediario. Y como el telediario, siempre da malas noticias a tu pareja.
- `L478` Eres mas promiscuo que una fuente publica: todo el mundo bebe de ti y nadie sabe lo que ha metido el anterior.
- `L480` Coño, tu historial es mas largo que la lista de la compra de una familia numerosa. Y todo es basura.
- `L481` Tu pareja es como un billete de metro: la usas para ir de un sitio a otro y la tiras cuando llegas a donde realmente querias ir.
- `L483` Joder, si tu polla tuviera memoria, escribiria unas memorias mas largas que las del puto Quijote. Y con mas aventuras.
- `L484` Hostia puta, eres como un centro comercial: muchas tiendas, muchos visitantes y nada que valga la pena comprar de verdad.
- `L486` [nombre] es mas infiel que las traducciones de Google. Distorsiona todo, pierde el sentido y siempre hay algo que no encaja.
- `L487` Coño, tu polla tiene mas historias que un bar de pueblo. Y todas acaban igual: con alguien borracho y arrepentido.
- `L490` Joder, tu lealtad de pareja tiene menos duracion que un orgasmo precoz. Y al menos el orgasmo da placer a alguien durante un segundo.
- `L491` Hostia, eres como una rotonda: todo el mundo pasa, nadie se queda y siempre hay alguien que se pierde y acaba donde no debia.
- `L494` Coño, tu fidelidad es como un avión de papel: vuela un segundo, se cae y nadie la recoge porque no vale nada.
- `L497` Joder, si tu cama fuera una pista de aterrizaje, tendría mas trafico que el aeropuerto de Barajas en Semana Santa.
- `L499` Tu relación de pareja es como una cinta de correr: mucho movimiento, ningun avance y al final acabas exactamente donde empezaste.
- `L502` Eres de esa basura que tiene mas cuentas de citas que cuentas bancarias. Y todas con mas actividad que las del banco.
- `L503` [nombre] ha puesto mas cuernos que un ganadero de toros bravos. Y al menos el ganadero cobra por ello.
- `L504` Joder, tu compromiso es como un condon pinchado: parece que cumple pero no protege de una puta mierda.
- `L506` Tu infidelidad tiene mas temporadas que Los Simpson. Y como Los Simpson, los últimos capitulos son basura pero no se acaba nunca.
- `L512` Hostia puta, si te pusieran un rastreador en la polla, el mapa tendría mas rutas que un GPS de repartidor de Amazon.

### src/data/fidelityPhrases.js · INFIEL_LOW  (26)

- `L633` Tu puntuación de infiel es mas baja que la autoestima de un calvo en una tienda de peines. Y lo digo como halago.
- `L635` [nombre] tiene el historial mas limpio que la conciencia de un recién nacido. Sin una puta mancha, sin un borron, sin nada.
- `L638` Tu lealtad es como un herpes genital del bueno: no se va nunca, siempre esta ahí y tu pareja se ha acostumbrado a vivir con ella.
- `L642` Hostia, [nombre] es mas fiable que la muerte. Que es la única certeza en esta vida, y ahora resulta que este cabrón también lo es.
- `L647` Tu fidelidad es como una cucaracha: sobrevive a todo, nadie puede con ella y estara ahí cuando todo lo demas se haya ido a la mierda.
- `L651` Coño, tu compromiso de pareja es mas solido que una mierda de tres días de estreñimiento. Inamovible y a prueba de todo.
- `L660` Hostia puta, tu infidelidad es como el monstruo del lago Ness: todo el mundo habla de ella pero nadie la ha visto nunca.
- `L663` Coño, eres mas fiel que un tatuaje en la cara: siempre ahí, imposible de esconder y todo el mundo lo ve.
- `L666` Tu fidelidad es como la mierda de un elefante: enorme, imposible de ignorar y todo el que la ve dice joder, eso si que es gordo.
- `L668` [nombre] es fiel como un puto Kalashnikov: funciona en el barro, en el frío, en el desierto y después de cuarenta años sin limpiarlo.
- `L670` Joder, tu lealtad tiene mas capas que una cebolla. Y al pelarla no lloras, te encuentras mas lealtad. Hasta el nucleo, hostia.
- `L674` Tu compromiso es como un puto diamante: duro, caro de encontrar y casi imposible de romper. Y brillante de cojones.
- `L677` Joder, eres como un vault del banco suizo de la lealtad: lo que entra no sale, nadie sabe que hay dentro y todo esta a salvo.
- `L681` [nombre] es mas leal que la puta gravedad. Siempre ahí, sin que nadie se lo pida, sujetando el tinglado sin cobrar horas extra.
- `L682` Coño, tu nivel de infidelidad es como buscar señal en un bunker: puedes intentarlo, pero no vas a encontrar una mierda.
- `L684` Tu lealtad es como la salsa del kebab: esta por todas partes, lo impregna todo y una vez que la pruebas ya no puedes vivir sin ella.
- `L685` Eres fiel como un reloj suizo: preciso, constante y tan caro de encontrar que la gente normal se conforma con un Casio.
- `L692` Hostia, [nombre] es tan fiel que si fuera un pais seria Suiza: neutral, fiable y con los cojones bien guardados en un bunker.
- `L698` Tu fidelidad es como la receta de la Coca-Cola: nadie sabe como cojones funciona pero el resultado es adictivo de la hostia.
- `L700` [nombre] es fiel como la hipoteca: siempre ahí, treinta años de compromiso y sin posibilidad de escape. Pero a diferencia de la hipoteca, este mola.
- `L703` Tu nivel de infidelidad es como un número imaginario: existe en teoria pero en la practica no tiene presencia en el mundo real.
- `L708` Coño, tu fidelidad es como encontrar aparcamiento en el centro un sábado: nadie se lo cree hasta que lo ve, y cuando lo ve se queda con la boca abierta.
- `L713` Eres como una puta roca en medio de una tormenta de mierda: no te mueves, no te quejas y cuando pasa la tormenta sigues ahí, cabrón.
- `L720` Eres mas fiel que el olor a fritanga en un piso pequeño: imposible de quitar, omnipresente y todo el mundo lo nota, cabrón.
- `L724` Tu fidelidad es como la cucaracha: sobrevive al apocalipsis nuclear y sigue ahí cuando ya no queda nada. Indestructible de los cojones.
- `L728` Tu nivel de infidelidad es como el segundo piso de un bungalow: no existe. Simplemente no esta.

### src/data/fidelityPhrases.js · INFIEL_MID  (48)

- `L522` Tu fidelidad es como un microondas: va a ratos, calienta lo justo y nunca sabes si lo que sale esta bien hecho o crudo por dentro.
- `L524` [nombre] tiene el WhatsApp mas comprometido que un traficante y menos pruebas que un asesino en serie inteligente. Sospechoso.
- `L526` Tu compromiso de pareja es como una dieta intermitente: unos días lo cumples y otros te pones hasta el culo de mierda.
- `L529` Hostia puta, tu lealtad de pareja es como el agua de la ducha en un hotel barato: nunca sabes si va a salir fría o caliente.
- `L530` Eres como un examen con las respuestas a lapiz: todo borrable, todo provisional y nada que inspire confianza.
- `L533` Tu compromiso es como una suscripción de prueba: gratuita, temporal y todo el mundo sabe que no la vas a renovar.
- `L534` [nombre] tiene la mirada mas desviada que un bizco en una montaña rusa. Mirando a todos lados menos donde debería.
- `L535` Joder, eres el Schrodinger de la infidelidad: hasta que tu pareja abra la caja, eres fiel e infiel al mismo tiempo.
- `L536` Hostia, tu zona gris es mas amplia que el culo de tu tía en Navidad. Y como ese culo, nadie quiere sentarse al lado.
- `L537` Tu fidelidad es como una conexion Bluetooth de los cojones: a veces se engancha, a veces no y siempre tarda mas de lo que debería.
- `L542` Joder, tu fidelidad es como un churro de feria: parece apetecible por fuera pero por dentro esta cruda y te sienta mal.
- `L544` Tu compromiso es como una hamaca: comodo cuando no pesa nada y se vuelca en cuanto alguien se mueve un poco, basura.
- `L550` Hostia, eres como un perro con dos platos: comes de uno pero siempre estas mirando al otro por si tiene algo mejor.
- `L551` Tu compromiso es como un elastico viejo de calzoncillo: se estira, se estira, y nadie sabe cuando va a dar de si.
- `L553` Coño, tu moral de pareja es como una balda de estanteria barata: aguanta los libros finos pero en cuanto pones el gordo se viene abajo.
- `L557` Hostia puta, tu lealtad de pareja es como el gazpacho: parece que esta frío y estable hasta que alguien lo agita, gilipollas.
- `L558` Tu compromiso sentimental tiene mas asteriscos que los terminos y condiciones de Apple. Todo parece bien hasta que lees la letra pequeña.
- `L560` Coño, eres como un mapa de carreteras sin actualizar: la dirección general la tienes, pero los detalles estan todos mal.
- `L561` Tu fidelidad es como un bronceado de spray: se ve bien de lejos pero de cerca se nota que es falsa y se va con la primera ducha.
- `L564` Hostia, tu compromiso de pareja es como un paraguas barato: lo abres con esperanza, se te da la vuelta con el primer viento y te mojas igual.
- `L567` Coño, tu fidelidad es como un semaforo en ambar permanente: nadie sabe si parar o acelerar y siempre se acaba en hostia.
- `L568` Tu lealtad de pareja es como el pan del Mercadona a las ocho de la tarde: blanda, sospechosa y nadie la elegiria si tuviera opciones.
- `L571` Hostia puta, tu compromiso es como una barbacoa en un piso: la intención esta, el resultado es humo, y los vecinos se quejan.
- `L575` Tu compromiso sentimental es como un chicle pegado en la suela: aguanta mientras camines en llano, en cuanto subes se queda atras.
- `L577` Joder, tu lealtad de pareja es como una cena de empresa: sonrisas falsas, conversación vacia y todo el mundo deseando irse a otra parte.
- `L579` Tu fidelidad es como un zumo de brick: parece natural por fuera pero por dentro tiene mas conservantes que fruta de verdad.
- `L581` Coño, ni engañas ni das seguridad. Eres como un extintor caducado: esta en la pared, tranquiliza de lejos, pero nadie se fia.
- `L583` [nombre] es como una máquina expendedora de la fidelidad: metes la moneda y nunca sabes si te va a dar lo que has pedido o una mierda.
- `L585` Hostia puta, tu relación es como un partido de tenis: vas y vienes, cambian los lados y nadie sabe quien lleva ventaja.
- `L586` Tu fidelidad es como un mueble de carton: se ve bonito en la foto pero en cuanto le pones peso real se desmorona todo.
- `L588` Coño, eres como una puerta sin cerrojo: no la has abierto, pero cualquiera podría entrar si empuja un poco. Invitación abierta.
- `L589` Tu compromiso es como la lluvia en agosto: cuando cae todos se sorprenden porque nadie se lo esperaba.
- `L591` Joder, ni eres el malo de la pelicula ni eres el bueno. Eres el puto extra que sale de fondo y nadie recuerda, gilipollas.
- `L592` Hostia, tu fidelidad es como un bollo de chocolate del chino: por fuera parece que hay chocolate pero por dentro solo hay aire.
- `L593` Tu relación tiene mas grietas que la fachada de un piso de los años sesenta. Y como esas fachadas, nadie quiere pagar el arreglo.
- `L595` Coño, tu compromiso es como un calcetin con agujero: tecnicamente puesto, pero falla justo donde mas se nota.
- `L599` Hostia puta, eres como un yogur en la fecha de caducidad: igual esta bien, igual esta mal, pero nadie con sentido comun se lo come.
- `L600` Tu fidelidad es como una serie de Netflix mediocre: la sigues por inercia, no por interes, y sabes que el final va a ser una mierda.
- `L601` [nombre] tiene el historial de busqueda mas sospechoso que un politico antes de elecciones. Todo limpio, demasiado limpio.
- `L602` Coño, tu compromiso de pareja es como un filtro de Instagram: cambia la realidad, esconde los defectos y al final todo es mentira.
- `L605` Joder, tu fidelidad es como un control de alcoholemia en Navidad: todo el mundo sabe que va a haber sorpresas desagradables.
- `L607` Tu relación es como una piscina municipal: mucha gente ha pasado por ahí, el mantenimiento es minimo y siempre hay tiritas flotando.
- `L609` Coño, tu lealtad sentimental es como una farola fundida: el poste esta, pero no ilumina una mierda.
- `L610` Eres como un buffet de hotel de dos estrellas: hay de todo pero nada merece la pena y siempre te vas con hambre y malestar.
- `L612` Joder, tu compromiso es como un platano de Canarias: amarillo por fuera, blando por dentro y con manchas que nadie quiere mirar.
- `L614` Tu fidelidad es como un ascensor de un edificio viejo: a veces sube, a veces baja, a veces se para y hay que llamar al tecnico.
- `L616` Coño, tu relación es como una mesa de tres patas: se sostiene si no la tocas, pero al minimo movimiento se cae todo al suelo.
- `L619` Joder, tu compromiso sentimental es como un coche con check engine encendido: funciona, pero todos saben que algo va mal.

### src/data/percentLabels.js · gay.mid  (4)

- `L1481` Tu heterosexualidad es como una conexión wifi inestable: funciona a ratos, se cae sin aviso y nadie sabe cuándo coño va a volver.
- `L1486` Puta madre, eres como un semáforo en ámbar permanente. Ni paras ni arrancas, y todos los que vienen detrás se desesperan.
- `L1494` Tu orientación sexual es como la economía española: nadie la entiende del todo, los datos se contradicen y siempre está a punto de cambiar.
- `L1496` Tu versión de hetero es como una camiseta de mercadillo: parece original de lejos pero de cerca se ven las costuras falsas por todos lados.

### src/data/percentLabels.js · inutil.high  (1)

- `L2448` Eres como un consolador sin pilas: tienes la forma de algo con función y ahí se acaba el parecido. Decorativo, inútil y ahí tirado en un cajón que nadie abre. Puro estorbo con apariencia de servir.

### src/data/percentLabels.js · simp.high  (1)

- `L1546` Tu manera de estar en su vida es como el fondo de pantalla: siempre ahí, nunca mirado.

## Ideas (no son este encargo)

El dueño pidió ideas molonas aparte. Están al final de `AGENTS.md`.
No las implementes mientras queden analogías pendientes.
