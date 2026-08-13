const { shuffle, pickFresh } = require('../utils/helpers');
const { getSender, isMainOwner, isBotJid, bareJid, sameUser } = require('../utils/wa');

const VERDICTS = {
  perfect: [
    'Cien por cien. Estos dos se merecen mutuamente y eso es lo más bonito y lo más aterrador que se puede decir de alguien, patético.',

    'Match perfecto. Nadie más los aguantaría, así que menos mal que se tienen el uno al otro, los muy cabrones, miserable.',

    'Compatibilidad total. Dos putos desastres que encajan como una llave en una cerradura oxidada: chirría, pero abre, qué cringe.',

    'Hostia puta, cien. Estos dos van a hacerse muchísimo daño y les va a encantar cada minuto, y el ranking no discute, da asco.',

    'Pleno. Si no acaban juntos es porque el universo tiene sentido del humor y quiere verlos sufrir por separado, los gilipollas, qué vergüenza.',

    'Match absoluto. Se van a arruinar la vida el uno al otro y va a ser un espectáculo de cojones, y el ranking no discute, patético.',

    'Cien. Ninguno de los dos va a encontrar nada mejor, y en el fondo lo saben, los muy hijos de puta, y el ranking no discute, asco, fracasado.',

    'Compatibilidad perfecta. Dos taras que se cancelan entre sí. La ciencia no lo explica, la mierda esta sí, qué miseria.',

    'Joder, cien por cien. Esto no es química, esto es que nadie más quiere a ninguno de los dos y han acabado juntos por descarte, da grima.',

    'Match total. Se merecen tanto que casi parece una condena en vez de un premio. La cárcel con wifi más bonita del grupo, qué nivel de pena.',

    'Pleno absoluto. Que se junten ya de una puta vez y nos dejen en paz al resto, y el ranking no discute, basura.',

    'Cien. Dos personas hechas la una para la otra, principalmente porque el resto del grupo ya les dijo que no, qué cutre.',

    'Match perfecto. Van a discutir todos los días y ninguno se va a ir nunca. Amor del tipo tóxico que dura para siempre, da pena ajena.',

    'Hostia, cien por cien. El grupo entero lo veía venir menos ellos dos, que son gilipollas, y el ranking no discute, qué vacío.',

    'Cien. Si esto no acaba en boda acaba en orden de alejamiento, pero acaba en algo gordo, y el ranking no discute, indignante.',

    'Pleno de los gordos. Nadie ha dado nunca este número aquí. Tomad nota y haceos puto cargo, y el ranking no discute, patético.',

    'Match del cien, cabrón. Dos piezas rotas que encajan justo por donde están rotas. Poético y patético a partes iguales, da vergüenza.',

    'Compatibilidad total. Se van a querer mal, que es como se quiere de verdad en este grupo de mierda, y el ranking no discute, basura.',

    'Cien. El destino no ha tenido nada que ver: simplemente nadie más quiso a ninguno de los dos, menudo desastre.',

    'Match perfecto. Van a ser felices y va a ser insufrible de ver desde fuera, los muy cabrones, y el ranking no discute, fracasado.',

    'Pleno, hostia puta. Lo único que separa a estos dos es la vergüenza, y eso se pasa con dos copas y una mala decisión, patético.',

    'Cien por cien. Se lo merecen todo: lo bueno, lo malo y las broncas de madrugada a grito pelado, y el ranking no discute, miserable.',

    'Match total. Dos personas con el mismo nivel exacto de desastre. Eso es más raro que encontrar un billete en la mierda, qué cringe.',

    'Cien. Si un día lo dejan, el grupo va a tener que elegir bando y nadie tiene cojones para eso, da asco.',

    'Compatibilidad perfecta. Ninguno de los dos tiene nada mejor que hacer, y eso también es compatibilidad, qué vergüenza.',

    'Match del cien por cien. Que alguien les diga que se dejen de putas tonterías de una vez, y el ranking no discute, patético.',

    'Pleno. Están hechos el uno para el otro con la precisión de dos errores que se corrigen solos, los cabrones, fracasado.',

    'Cien. Este número no lo da el bot por casualidad, lo da porque no hay alternativa para ninguno de estos gilipollas, qué miseria.',

    'Match perfecto. Dos que se entienden sin hablar, principalmente porque ninguno escucha nunca, da grima.',

    'Compatibilidad absoluta, hostia. Se van a arruinar mutuamente y va a ser un espectáculo precioso de mierda, qué nivel de pena.',

    'Cien por cien. El grupo os hace de testigo, así que ya no hay marcha atrás posible, cabrones, y el ranking no discute, basura.',

    'Pleno. Juntos suman una persona funcional. Por separado no llegan ni a media, los muy putos inútiles, qué cutre.',

    'Match total. Nadie discute esto. Ni ellos, y eso que discuten absolutamente todo como los gilipollas que son, da pena ajena.',

    'Cien. Dos desgracias con patas que decidieron caminar en la misma dirección. Enhoramala, y el ranking no discute, qué vacío.',

    'Compatibilidad perfecta. Da igual lo que digan: el marcador ha hablado y el marcador no negocia, indignante.',

    'Match del cien. Los que se odian así de bien acaban siempre en la misma cama. Todos lo hemos visto, y el ranking no discute, patético.',

    'Pleno absoluto. Si esto sale mal, sale mal a lo grande. Y si sale bien, también. Esa es la puta gracia, da vergüenza.',

    'Cien por cien. Es su última oportunidad y es mutua. Aprovechadla o callaos para siempre, hijos de puta, qué flojo.',

    'Match perfecto, hostia. Que se besen ya y acabemos con esta mierda antes de que el grupo se muera de cringe, menudo desastre.',

    'Cien por cien. El bot ha hecho la cuenta tres veces por si se había equivocado y no: esto pasa una vez cada diez años, qué pena.',

    'Match total. Se han encontrado dos personas igual de insoportables y por eso mismo funciona: nadie más las habría aguantado, patético.',

    'Compatibilidad absoluta. Lo raro no es que encajen, lo raro es que hayan tardado tanto con el grupo entero mirando como gilipollas, miserable.',

    'Perfecto, hostia puta. Esto no es química, es destino con muy mal gusto y muchísima insistencia, y el ranking no discute, qué cringe.',

    'Redondo. El bot no reparte cien por cien todos los días, así que aprovechad antes de que uno de los dos la cague, da asco.',

    'Cien. Dos piezas rotas que resulta que estaban rotas por el mismo sitio. Encajan de milagro y encajan de puta madre, qué vergüenza.',

    'Match de los que se cuentan en las bodas entre vómitos. Lo mejor es que ninguno lo vio venir hasta este mensaje, los imbéciles, ridículo.',

    'Perfecto y ligeramente preocupante, coño. Cuando dos personas encajan tanto, el resto del grupo sobra un poco, fracasado.',

    'Cien por cien. El bot lleva meses viendo venir esta mierda y por fin tiene una excusa para decirlo en voz alta, qué miseria.',

    'Compatibilidad máxima. No hay nada que analizar: se ha juntado lo que tenía que juntarse y punto, da grima.',

    'Match perfecto. Uno pone el caos y el otro pone la paciencia, que es exactamente como funciona la mierda que dura, qué nivel de pena.',

    'Cien, hostia. Si esto no acaba en algo, el problema ya no son los números: sois vosotros dos y vuestra puta cobardía, basura.',

    'Total. El bot no encuentra ni un solo motivo para que esto falle, y mira que ha buscado con ganas, qué cutre.',

    'Perfecto. Dos personas que se entienden sin hablar, que en este grupo de mierda es prácticamente un superpoder, da pena ajena.',

    'Cien por cien y con el grupo de testigo. A partir de ahora ya no se puede fingir que no pasa nada, qué vacío.',

    'Match absoluto. Es de esas parejas que dan rabia porque funcionan sin esfuerzo mientras el resto lo intenta y se come la mierda, indignante.',

    'Redondo. El bot ha visto miles de combinaciones y esta es de las pocas que no le da vergüenza anunciar, qué vergüenza ajena.',

    'Cien. Lo tenían delante todo el puto tiempo y ha tenido que venir un bot a decírselo. Patético y precioso a partes iguales, da vergüenza.',

    'Perfecto. Si alguno lo estropea ahora, que sepa que el grupo entero tiene este mensaje guardado, qué flojo.',

    'Compatibilidad total. Dos desastres que juntos, por algún motivo que escapa a la ciencia y a la decencia, funcionan, menudo desastre.',

    'Cien por cien. Esto es lo más parecido a una boda que puede organizar un puto bot de WhatsApp. Que alguien traiga la tarta, qué pena.',

    'Cien de cien. Estos dos se merecen mutuamente y eso es lo más cruel que le puede pasar al resto, patético.',

    'Match perfecto: dos taras que se cancelan. La ciencia no lo explica, esta mierda sí, cabrón.',

    'Compatibilidad total. Van a discutir todos los días y ninguno se va, gilipollas.',

    'Ship redondo. El grupo va a sufrirlo en silencio durante años, mierda, y el ranking no discute, da asco.',

    'Perfectos el uno para el otro. Nadie más los aguantaría, coño, y el ranking no discute, gilipollas.',

    'Cien por cien. Química de la que se nota y da un poco de asco ajeno, asco.',

    'Match de manual. Menos mal que se tienen: el resto del mundo no aplica, patético.',

    'Compatibilidad perfecta. Dos que se entienden sin escuchar, basura, y el ranking no discute, basura.',

    'Ship cerrado. El marcador no negocia y el chat tampoco, ridículo, y el ranking no discute, ridículo.',

    'Cien. Que se besen ya y acabemos con el cringe colectivo, fracasado.nivel de pena.',

    'Perfectos. Uno pone el caos y el otro la paciencia tóxica y el ranking no discute.',

    'Match que duele de ver desde fuera. Funciona demasiado bien, cabrón, y el ranking no discute, qué cutre.',

    'Compatibilidad de la mala: la que dura, gilipollas, y el ranking no discute, coño.',

    'Ship al máximo. El grupo ya está preparando el popcorn amargo, mierda, y el ranking no discute, qué vacío.',

    'Cien de compatibilidad. Insufrible y real, coño, y el ranking no discute, gilipollas.',

    'Perfectos entre sí. Un desastre para el resto del hilo, asco, y el ranking no discute, patético.ajena.',

    'Match sin fisuras. Hasta el ranking aplaude a regañadientes, patético, y el ranking no discute, asco, da vergüenza.',

    'Compatibilidad total documentada. Caso cerrado, basura, y el ranking no discute, basura.',

    'Ship de los que se odian bien. Eso también es amor aquí, ridículo, y el ranking no discute, ridículo.',

    'Cien. No hay tercero que entre en esa órbita, fracasado, y el ranking no discute, fracasado.',

    'Perfectos. El chat lo sabía antes que ellos y el ranking no discute.',

    'Match químico sin anestesia. Duele mirarlo, cabrón, y el ranking no discute, mierda.',

    'Compatibilidad de laboratorio roto, gilipollas, y el ranking no discute, coño.',

    'Ship perfecto. El resto sobra, mierda, y el ranking no discute, cabrón asco, da asco.',

    'Cien por cien de drama sostenible, coño, y el ranking no discute, gilipollas.',

    'Perfectos el uno para el otro. Qué puta tragedia ajena, asco, y el ranking no discute, patético.',

    'Match cerrado con candado, patético, y el ranking no discute, asco, y el grupo ya lo olió, asco.',

    'Compatibilidad máxima. Sin derecho a réplica, basura, y el ranking no discute, basura.',

    'Ship de los que el grupo no discute, ridículo, y el ranking no discute, ridículo.',

    'Cien. Archivo y a sufrir, fracasado, y el ranking no discute, fracasado.nivel de pena.',

    'Perfectos. La física del fail compartido y el ranking no discute.',

    'Match que se siente en el hilo, cabrón, y el ranking no discute, mierda.cutre.',

    'Compatibilidad sin escape, gilipollas, y el ranking no discute, coño, y el grupo ya lo olió, coño.',

    'Ship total y el ranking no discute, cabrón, y el grupo ya lo olió, cabrón.',

    'Cien de cien y el chat lo traga, coño, y el ranking no discute, gilipollas.',

    'Perfectos. No hay plan B que merezca la pena, asco, y el ranking no discute, patético.ajena.',

    'Match de los que se eligen mal a propósito, patético, y el ranking no discute, asco.',

    'Compatibilidad perfecta de taras, basura, y el ranking no discute, basura.flojo.',

    'Ship al límite. El ranking firmó, ridículo, y el ranking no discute, ridículo.',

    'Cien. Fin del debate, fracasado, y el ranking no discute, fracasado.pena.',

],
  high: [
    'Alto. Hay drift, hay tensión, hay material de ship que el grupo ya olió. El ranking lo deja bastante claro.',

    'Compatibilidad alta. No es pleno, pero el arco se ve sin forzar. El ranking lo deja bastante claro.',

    'Alto de los que ilusionan con razón: la química está y se nota. El ranking lo deja bastante claro.',

    'Ship sólido. Falta un empujón para el pleno, sobra base. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Compatibilidad de las que el chat comenta en serio. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto. No es cuento: el cálculo respalda el runoreo del grupo. El ranking lo deja bastante claro.',

    'Ship con sustancia. La tensión no es invento del comando. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto de verdad. El pleno está cerca si el universo no es cabrón. El ranking lo deja bastante claro.',

    'Compatibilidad alta: piezas que encajan con roce interesante. El ranking lo deja bastante claro.',

    'Ship que se sostiene solo. El número solo confirma. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto. Hay arco, hay roce, hay motivo para mirar dos veces. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Compatibilidad de las que duelen si no se consuman. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto. El grupo lo veía: el bot pone el porcentaje. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Ship con base real. No es cope, es cálculo. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto de los limpios: química sin necesidad de guion forzado. El ranking lo deja bastante claro.',

    'Compatibilidad alta y legible en el día a día del chat. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto. El pleno es tentación, no fantasía. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Ship con tensión de la buena: la que no se apaga sola. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto. Material de pareja con número que no miente. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Compatibilidad de quienes ya se buscan en el hilo sin decirlo. El ranking lo deja bastante claro.',

    'Alto. Falta poco para el cien y el poco se siente. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Ship sólido documentado. El chat puede dejar de fingir sorpresa. El ranking lo deja bastante claro.',

    'Alto de verdad. La química tiene expediente. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Compatibilidad alta: el roce produce chispa, no solo roce. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto. El arco está escrito a medias y pide final. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Ship con sustancia suficiente para el rumor serio. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto. No es el pleno y aun así pesa. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Compatibilidad de las que el grupo banca en silencio. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto. El número respalda lo que ya se comentaba. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Ship con base: el resto es decisión de ellos, no del bot. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto de los claros. La tensión no es un malentendido. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Compatibilidad alta y de cope. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto. Hay match de verdad, no de relleno. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Ship que se sostiene en el cálculo y en el chat. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto. El pleno está a un mal día de distancia o a un buen sí. El ranking lo deja bastante claro.',

    'Compatibilidad de quienes ya ocupan espacio mental ajeno. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto. Material de pareja con porcentaje que no pide fe. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Ship sólido: el grupo puede dejar el cinismo un segundo. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto de verdad. La química no es un rumor vacío. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Compatibilidad alta legible sin forzar el relato. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto. Falta el cierre, sobra la base. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Ship con arco real. El número es el subtítulo. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto. El chat lo olió antes que el comando. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Compatibilidad de las que duelen por lo cerca que están del pleno. El ranking lo deja bastante claro.',

    'Alto. No es cuento chino: es porcentaje con sustancia. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Ship con tensión que no se apaga al cambiar de hilo. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto de los limpios: match sin necesidad de milagro. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Compatibilidad alta y el grupo lo sabe. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto. El bot confirma, no inventa. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Ship sólido documentado sin drama falso. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto. Hay drift de pareja, no solo de amistad de chat. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Compatibilidad de quienes ya se eligen en las bromas del grupo. El ranking lo deja bastante claro.',

    'Alto. El pleno es el siguiente tramo natural, no un salto imposible. El ranking lo deja bastante claro.',

    'Ship con base y con roce. El número pesa. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto de verdad. La química tiene testigos en el hilo. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Compatibilidad alta: piezas que encajan con historia. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto. Material suficiente para que el rumor sea legítimo. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Ship que se sostiene solo ante el cálculo. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Alto. El grupo puede dejar de hacerse el sorprendido. El ranking lo deja bastante claro y el grupo ya lo tiene claro.',

    'Compatibilidad de las que piden un sí o un no claro, no un mediocre. El ranking lo deja bastante claro.',

    'Fuerte. No es perfecto, pero el aire cambia cuando salen juntos, cabrón.',

    'Alto de verdad. El chat ya está shippeando sin pedir permiso, gilipollas.',

    'Buena química. El ranking lo marca y el resto inventa excusas, mierda, y el ranking no discute, coño.',

    'Ship alto. Hay historia aunque lo nieguen, coño, y el ranking no discute, cabrón.',

    'Tensión real. No es fanfic: el número habla, asco, y el ranking no discute, gilipollas.',

    'Alto. El grupo ve lo que ellos fingen no ver, patético, y el ranking no discute, patético.',

    'Fuerte compatibilidad. Casi molesta de lo obvio, basura, y el ranking no discute, asco.',

    'Ship de los que el hilo adelanta el final, ridículo, y el ranking no discute, basura.',

    'Alto. Material de drama sostenible, fracasado, y el ranking no discute, ridículo.',

    'Hay drift de puta madre. El marcador no miente y el ranking no discute, fracasado.',

    'Química alta. El chat ya tiene el ship name, cabrón, y el ranking no discute.',

    'Fuerte. Casi perfecto y por eso da más rabia, gilipollas, y el ranking no discute, mierda.',

    'Ship alto documentado. Sin anestesia, mierda, y el ranking no discute, coño.',

    'Tensión que se corta. El ranking aplaude, coño, y el ranking no discute, cabrón.',

    'Alto. Ellos en negación, el grupo en modo crónica, asco, y el ranking no discute, gilipollas.',

    'Buena pareja de fail compartido, patético, y el ranking no discute, patético.',

    'Ship que se siente en cada respuesta cruzada, basura, y el ranking no discute, asco.',

    'Fuerte. No necesita narrador, ridículo, y el ranking no discute, basura.',

    'Alto de los que el almost duele, fracasado, y el ranking no discute, ridículo.',

    'Hay material. Y de sobra y el ranking no discute, fracasado.',

    'Química de las que no se improvisan, cabrón, y el ranking no discute.',

    'Ship alto. El chat ya cobró entrada, gilipollas, y el ranking no discute, mierda.',

    'Fuerte compatibilidad con olor a drama, mierda, y el ranking no discute, coño.',

    'Alto. El número cierra el caso, coño, y el ranking no discute, cabrón, y el grupo ya lo olió, cabrón.',

    'Tensión real en un grupo de cínicos, asco, y el ranking no discute, gilipollas.',

    'Ship que el ranking no discute, patético, y el ranking no discute, patético.',

    'Buena química, peor para el resto del hilo, basura, y el ranking no discute, asco.',

    'Alto. Casi perfectos y se nota, ridículo, y el ranking no discute, basura.',

    'Fuerte. Sin derecho a fingir lo contrario, fracasado, y el ranking no discute, ridículo.',

    'Hay drift. El grupo ya eligió bando y el ranking no discute, fracasado.',

    'Ship alto con potencial de incendio, cabrón, y el ranking no discute.',

    'Química que molesta de lo clara, gilipollas, y el ranking no discute, mierda.',

    'Fuerte. El marcador no pide opiniones, mierda, y el ranking no discute, coño.',

    'Alto de verdad. Archivado, coño, y el ranking no discute, cabrón, y el grupo ya lo olió, cabrón.',

    'Tensión de la que se traduce en memes, asco, y el ranking no discute, gilipollas.',

    'Ship que se ve venir a la legua, patético, y el ranking no discute, patético.',

    'Buena pareja según el bot y según el chisme, basura, y el ranking no discute, asco.',

    'Alto. Casi el techo, ridículo, y el ranking no discute, basura, y el grupo ya lo olió, basura.',

    'Fuerte compatibilidad sin anestesia, fracasado, y el ranking no discute, ridículo.',

    'Alto de los que el almost duele, fracasado, y el ranking no discute, fracasado, y el grupo ya lo olió, fracasado.',

],
  mid: [
    'Joder, esto es como pedir una puta pizza y que te llegue sin queso. Funciona, pero para qué coño te molestas.',

    'Tienen la misma compatibilidad que un condón reutilizado: técnicamente posible, pero nadie con dos dedos de frente lo intentaría.',

    'Esto es lo que pasa cuando dos personas se atraen con la misma intensidad con la que uno se rasca los cojones un martes.',

    'Hostia, menudo bodrio de pareja. Serían de esos que follan con calcetines y luego se dan la espalda para ver el móvil.',

    'Compatibilidad de mierda tibia. Como cagar a medias: ni el alivio ni las ganas de seguir, y el ranking no discute, gilipollas.',

    'Si estos dos fueran una peli, serían una de esas que pones de fondo mientras limpias y ni te enteras de que ha acabado.',

    'El bot ha visto parejas malas, pero es que estos dos ni siquiera llegan a mala. Llegan a nada. A puta nada.',

    'Esto tiene la misma emoción que encontrar un billete de cinco euros en el bolsillo: bien, coño, pero tampoco te cambia la vida.',

    'Se aguantan como se aguanta a un compañero de piso que deja la puta tapa del váter levantada. Se puede vivir, pero jode.',

    'Mierda, el bot ha intentado encontrar algo interesante aquí y lo único que ha sacado es ganas de irse a dormir.',

    'Estos dos juntos son como un pedo silencioso en un ascensor: presente, incómodo, y al final todos fingen que no ha pasado nada.',

    'Compatibilidad más floja que la erección de un borracho a las cuatro de la mañana. Hay intención, pero el cuerpo no responde.',

    'Coño, esto es como comerse un yogur caducado de ayer: probablemente no te mate, pero tampoco vas presumiendo de ello.',

    'Regular tirando a hostia que me da igual. Si esto fuera sexo, sería un misionero con la luz apagada y sin hacer ruido.',

    'Juntos funcionarían como un puto mechero mojado. A veces da chispa, la mayoría de las veces te quemas el dedo para nada.',

    'Tienen menos química que un cabrón repitiendo primero de la ESO. Y mira que ese chaval lo intentaba.',

    'Esto es el equivalente sentimental a comer arroz blanco sin sal: te llena, pero a nadie le sale una puta sonrisa.',

    'Si la mediocridad tuviera un hijo no deseado, tendría exactamente este porcentaje de compatibilidad.',

    'Joder, se llevan bien de la misma forma que te llevas bien con el dentista: porque no queda otra y dura lo justo.',

    'Estos dos son como las instrucciones del IKEA: algo se puede montar, pero vas a sudar, maldecir, y el resultado va a cojear.',

    'Hostia puta, menudo churro. Esto es como ganar un concurso y que el premio sea un cupón de descuento en algo que no quieres.',

    'Match más soso que chuparle el culo a una piedra. Y la piedra al menos te da una anécdota, y el ranking no discute, mierda.',

    'Compatibilidad de microondas: calienta rápido, sabe a mierda, y al final siempre acabas queriendo algo mejor.',

    'Si estos dos se liaran, el grupo ni se enteraría. Y si se enterara, le importaría tres cojones. Y tendrían razón.',

    'Esto tiene el mismo potencial romántico que una colonoscopia. Se puede hacer, pero nadie lo pone en su lista de deseos.',

    'Mierda, he visto más tensión sexual entre dos abuelos peleándose por el último pan en el supermercado.',

    'Estos dos juntos durarían lo que dura un hielo en un coño en verano. Mucha gracia al principio, y luego solo hay charco.',

    'Compatibilidad del carajo. Funcionarían como pareja en un universo donde follar fuera opcional y la conversación no existiera.',

    'Si esto fuera una droga, sería una aspirina genérica: algo hace, pero no es por lo que llamas al camello a las tres de la mañana.',

    'Regular. Y no regular de interesante, regular de que el bot se ha quedado dormido calculando esto y le ha dado puta igual.',

    'Juntos generan la misma pasión que un cabrón leyendo los términos y condiciones. Técnicamente participas, pero el alma se ha ido.',

    'Hostia, compatibilidad de sala de espera. Estáis juntos porque no hay otra opción y cada uno mira su puto móvil.',

    'Esto es como mezclar agua con más agua: no explota, no huele, no sabe a nada. Enhorabuena, coño, habéis inventado la nada.',

    'Menos chispa que un puto funeral. Y en el funeral al menos alguien llora, aquí ni eso, y el ranking no discute, cabrón.',

    'Si estos dos fueran comida, serían una tostada sin mantequilla: cumple su función, pero te la comes con cara de que te han jodido la mañana.',

    'Coño, esto es como comprarse un coche de segunda mano que solo arranca en bajada. Amor cuesta abajo y a empujones.',

    'Compatibilidad de mierda templada. Ni lo bastante caliente para quemar ni lo bastante fría para que alguien se queje.',

    'Estos dos juntos son como ver un partido de fútbol que acaba 0-0: inviertes noventa minutos y te vas con las manos vacías y cabreado.',

    'Joder, si esto fuera un polvo sería de esos que acabas y piensas hostia, para esto me podría haber cascado una paja.',

    'Match con la misma energía que un lunes a las siete de la mañana. Se puede sobrevivir, pero nadie lo elige.',

    'Si la apatía se tirara pedos, sonaría exactamente como este porcentaje de compatibilidad, y el ranking no discute.',

    'Esto funciona como el culo de un político: algo sale, pero siempre es mierda y nunca lo que esperabas.',

    'Compatibilidad de kebab de madrugada. En el momento parece buena idea, a la mañana siguiente te arrepientes en el váter.',

    'Hostia, menudo mojón de match. Se toleran como se tolera una cucaracha que vive detrás del frigorífico: mientras no aparezca mucho, se puede.',

    'Tienen la misma conexión emocional que un cabrón con su declaración de la renta. Lo haces porque toca, no porque te apetezca.',

    'Si estos dos se casaran, los invitados irían solo por la comida gratis y se pirarían antes del vals.',

    'Compatibilidad de pene a media asta: algo hay, la intención se nota, pero no da para el espectáculo completo.',

    'Juntos generan menos calor que un puto iglú en invierno. Al menos el iglú sirve para algo, coño, y el ranking no discute, basura.',

    'Esto es el match sentimental de ir a comprar tabaco y volver con chicles. No es lo que querías, pero masticas algo.',

    'Mierda, estos dos son como dos calcetines de distinto par: los puedes poner juntos, pero cada vez que te miras el pie sabes que algo falla.',

    'Si la indiferencia pudiera reproducirse, estos dos serían sus putos padres fundadores, y el ranking no discute.',

    'Hostia, compatibilidad de semáforo en ámbar. No sabes si frenar o acelerar, y hagas lo que hagas va a salir regular.',

    'Esto es como hacerse una paja con la mano dormida: raro, confuso, y al final te preguntas por qué cojones has empezado.',

    'Match más flojo que un pedazo de mierda atado con un pelo. Existe la unión, pero nadie confía en ella.',

    'Coño, estos dos son como el WiFi de un hotel barato: se conectan a ratos, la señal es una basura, y al final acabas usando tus propios datos.',

    'Compatibilidad de cuarto de baño de gasolinera: funcional, pero no te quedas ni un segundo más de lo estrictamente necesario.',

    'Si estos dos fueran una canción, serían el hilo musical del ascensor. Suena algo, pero tu cerebro se niega a procesarlo.',

    'Joder, esto tiene toda la pinta de esas relaciones que duran lo que tarda uno de los dos en conocer a alguien menos aburrido.',

    'Hostia puta, menudo par de mediocres. Ni para follar bien ni para discutir con ganas. El peor de los dos mundos.',

    'Match con menos futuro que una mierda en una tormenta. Se sostiene un momento y luego la corriente se lo lleva todo al carajo.',

    'Mitad de camino. Ni spark de verdad ni rechazo limpio: zona tibia.',

    'Ship mediocre. Como pizza sin queso: llega, pero para qué, cabrón, y el ranking no discute, mierda.',

    'Medio. Hay algo, pero no suficiente para el hype del grupo, gilipollas, y el ranking no discute, coño.',

    'Compatibilidad tibia. El ranking bostezó, mierda, y el ranking no discute, cabrón.',

    'Ni fu ni fa. El ship más olvidable del catálogo, coño, y el ranking no discute, gilipollas.',

    'Medio puro. Ni drama ni magia, asco, y el ranking no discute, patético.',

    'Ship de los que el chat no recuerda mañana, patético, y el ranking no discute, asco.',

    'Mitad. Química de ascensor: existe y se acaba, basura, y el ranking no discute, basura.',

    'Mediocre. El número no miente y no emociona, ridículo, y el ranking no discute, ridículo.',

    'Zona gris. Ni ship ni enemigos, fracasado, y el ranking no discute, fracasado.',

    'Medio. Como serie cancelada en el capítulo tres y el ranking no discute.',

    'Compatibilidad de trámite. Siguiente, cabrón, y el ranking no discute, mierda.',

    'Ship tibio. El grupo ya cambió de tema, gilipollas, y el ranking no discute, coño.',

    'Mitad de tarta. Nadie pide segunda porción, mierda, y el ranking no discute, cabrón.',

    'Medio sin narrativa. Gracias por no inventarla, coño, y el ranking no discute, gilipollas.',

    'Ni spark ni tragedia. Solo mediocridad, asco, y el ranking no discute, patético.',

    'Ship administrativo. Firmado y olvidado, patético, y el ranking no discute, asco.',

    'Mediocre de manual, basura, y el ranking no discute, basura, y el grupo ya lo olió, basura.',

    'Zona media. El ranking no se emociona, ridículo, y el ranking no discute, ridículo.',

    'Mitad. Casi un no con maquillaje, fracasado, y el ranking no discute, fracasado.',

    'Medio. El hype se murió solo y el ranking no discute, y el grupo ya lo olió.',

    'Compatibilidad de sala de espera, cabrón, y el ranking no discute, mierda.',

    'Ship sin gancho. El chat bostezó, gilipollas, y el ranking no discute, coño.',

    'Tibio. Ni vale el thread, mierda, y el ranking no discute, cabrón, y el grupo ya lo olió, cabrón.',

    'Medio puro sin plot, coño, y el ranking no discute, gilipollas, y el grupo ya lo olió, gilipollas.',

    'Ni química ni guerra. Solo relleno, asco, y el ranking no discute, patético.',

    'Ship de los que no generan meme, patético, y el ranking no discute, asco.',

    'Mitad de camino al olvido, basura, y el ranking no discute, basura, y el grupo ya lo olió, basura.',

    'Mediocre. El número lo dice sin drama, ridículo, y el ranking no discute, ridículo.',

    'Zona gris documentada, fracasado, y el ranking no discute, fracasado.',

    'Medio. Como café descafeinado del ship y el ranking no discute.',

    'Compatibilidad sin especias, cabrón, y el ranking no discute, mierda, y el grupo ya lo olió, mierda.',

    'Ship tibio de los que sobran, gilipollas, y el ranking no discute, coño, y el grupo ya lo olió, coño.',

    'Mitad. El grupo no pide bis, mierda, y el ranking no discute, cabrón, y el grupo ya lo olió, qué vacío.',

    'Medio sin derecho a hype, coño, y el ranking no discute, gilipollas.',

    'Ni fu ni fa con sello oficial, asco, y el ranking no discute, patético.vergüenza ajena.',

    'Ship olvidable a propósito, patético, y el ranking no discute, asco, y el grupo ya lo olió, asco.',

    'Tibio. Archivado sin ceremonia, basura, y el ranking no discute, basura.flojo.',

    'Mediocre y previsible, ridículo, y el ranking no discute, ridículo, y el grupo ya lo olió, ridículo.',

    'Zona media: el casi que no importa, fracasado, y el ranking no discute, fracasado.',

],
  low: [
    'Bajo de verdad. Estos dos juntos son un fail anunciado y el número lo grita sin filtro delante del puto grupo.',

    'Ship bajo: la química es un agujero y no un puente. El bot no regala décimas delante del puto grupo, mierda.',

    'Compatibilidad de mierda. Mejor separados que ensuciando el ranking juntos delante del puto grupo, coño.',

    'Bajo. El ship no levanta ni con tutorial ni con rezo del puto grupo delante del puto grupo, cabrón.',

    'Estos dos suman menos que por separado. Matemáticas crueles del ranking delante del puto grupo, gilipollas.',

    'Ship en el sótano. El número no admite recurso ni segunda lectura útil delante del puto grupo, patético.',

    'Bajo de los que duelen. La compatibilidad se fue a la mierda y no vuelve delante del puto grupo, asco.',

    'El bot midió y el resultado es un no seco. Ship fallido en limpio delante del puto grupo, basura.',

    'Bajo. Mejor ni intentarlo: el ranking ya firmó el fail en público delante del puto grupo, ridículo.',

    'Compatibilidad justa para el trámite y nada más. El resto es ruido delante del puto grupo, fracasado.',

    'Ship bajo documentado. Autor el número, testigo el puto grupo entero delante del puto grupo.',

    'Estos dos juntos bajan el promedio del chat solo con el comando delante del puto grupo, mierda.',

    'Bajo. La química no existe y el bot no inventa lo que no hay delante del puto grupo, coño.',

    'Ship en números rojos. El ranking no ofrece consuelo ni anestesia delante del puto grupo, cabrón.',

    'Bajo de verdad: ni el almost salva a este par del sótano delante del puto grupo, gilipollas.',

    'La compatibilidad es un gag y el grupo no pide replay del fail delante del puto grupo, patético.',

    'Ship bajo. Separados estorban menos al promedio del ranking delante del puto grupo, asco.',

    'El número habla: bajo. Vosotros calláis porque no hay réplica delante del puto grupo, basura.',

    'Bajo. El ship es un experimento fallido del ranking del grupo delante del puto grupo, ridículo.',

    'Compatibilidad de sótano. El bot no suaviza el veredicto público delante del puto grupo, fracasado.',

    'Ship bajo hasta para el modo oscuro del comando de pareja delante del puto grupo.',

    'Estos dos no suman. Restan. El ranking lo firma sin debate delante del puto grupo, mierda.',

    'Bajo. Mejor archivo y olvido que insistir en este fail delante del puto grupo, coño.',

    'Ship fallido en limpio. Sin asterisco de caridad del bot delante del puto grupo, cabrón.',

    'Bajo de los que el chat archiva sin pedir amplificación delante del puto grupo, gilipollas.',

    'La química es cero con maquillaje de low. Se nota a la legua delante del puto grupo, patético.',

    'Ship en el tramo que nadie quiere. El número manda y punto delante del puto grupo, asco.',

    'Bajo. El bot midió dos veces y las dos dio fail de pareja delante del puto grupo, basura.',

    'Compatibilidad de puta pena. El ranking no miente nunca delante del puto grupo, ridículo.',

    'Ship bajo: el almost de pareja nunca llega a puerto delante del puto grupo, fracasado.',

    'Estos dos juntos son el gag del comando y del chat delante del puto grupo.',

    'Bajo. Separados al menos no ensucian el mismo frame delante del puto grupo, mierda.',

    'Ship en rojo. El veredicto es seco y público en el ranking delante del puto grupo, coño.',

    'Bajo de manual. El número no necesita narrador emocional delante del puto grupo, cabrón.',

    'La compatibilidad se cayó sola antes del primer mensaje delante del puto grupo, gilipollas.',

    'Ship bajo documentado delante de todo el puto grupo delante del puto grupo, patético.',

    'Bajo. Mejor no forzar lo que el ranking ya mató delante del puto grupo, asco.',

    'Compatibilidad de sótano sin ascensor ni luz de emergencia delante del puto grupo, basura.',

    'Ship fallido. El bot cierra el parte sin consuelo posible delante del puto grupo, ridículo.',

    'Bajo hasta el cartel de salida del comando de pareja delante del puto grupo, fracasado.',

    'Estos dos no levantan el ship ni con milagro del ranking delante del puto grupo.',

    'Bajo. El ranking firma y el chat archiva sin debate delante del puto grupo, mierda.',

    'Ship en el empty seat de la compatibilidad del grupo delante del puto grupo, coño.',

    'Bajo de verdad. Ni el low light favorece a este par delante del puto grupo, cabrón.',

    'La química es un rumor y el número lo desmiente en seco delante del puto grupo, gilipollas.',

    'Ship bajo. El almost de pareja es eterno y vacío delante del puto grupo, patético.',

    'Bajo. Separados es el único consejo útil del bot delante del puto grupo, asco.',

    'Compatibilidad de mierda documentada en el ranking delante del puto grupo, basura.',

    'Ship fallido sin derecho a bis ni a apelación posible delante del puto grupo, ridículo.',

    'Bajo. El bot no regala décimas de caridad a este par delante del puto grupo, fracasado.',

    'Estos dos suman un fail con nombre propio en el chat delante del puto grupo.',

    'Bajo de los que duelen en público delante del grupo delante del puto grupo, mierda.',

    'Ship en números que no se maquillan con filtros delante del puto grupo, coño.',

    'Bajo. La pareja es un experimento que el ranking abortó delante del puto grupo, cabrón.',

    'Compatibilidad de sótano. Sin filtro que salve el frame delante del puto grupo, gilipollas.',

    'Ship bajo hasta para el modo avión del deseo ajeno delante del puto grupo, patético.',

    'Bajo. El número habla y vosotros no tenéis réplica útil delante del puto grupo, asco.',

    'Ship fallido. Archivo cerrado sin segunda oportunidad delante del puto grupo, basura.',

    'Bajo de puta madre en el sentido del desastre de pareja delante del puto grupo, ridículo.',

    'Compatibilidad justa para el gag del comando y nada más delante del puto grupo, fracasado.',

    'Poca química. El ranking lo marca en rojo suave, cabrón, y el ranking no discute.',

    'Ship bajo. Mejor ni forzar el crossover, gilipollas, y el ranking no discute, mierda.',

    'Compatibilidad de las que duelen de lo flojas, mierda, y el ranking no discute, coño.',

    'Bajo. El grupo ya está en modo no, coño, y el ranking no discute, cabrón.',

    'Casi nada. Forzar esto es crueldad gratuita, asco, y el ranking no discute, gilipollas.',

    'Ship de los que el número pide clemencia, patético, y el ranking no discute, patético.',

    'Bajo perfil de desastre compartido, basura, y el ranking no discute, asco.',

    'Poca chispa. Mucho potencial de cringe, ridículo, y el ranking no discute, basura.',

    'Compatibilidad en el sótano, fracasado, y el ranking no discute, ridículo.',

    'Bajo. Mejor amigos de mentira que esto y el ranking no discute, fracasado.',

    'Ship flojo. El chat no compra la premisa, cabrón, y el ranking no discute.',

    'Poca química documentada, gilipollas, y el ranking no discute, mierda, y el grupo ya lo olió, mierda.',

    'Bajo de los que se ven venir, mierda, y el ranking no discute, coño, y el grupo ya lo olió, coño.',

    'Fail de pareja en versión preview, coño, y el ranking no discute, cabrón.',

    'Compatibilidad mínima. Casi un no, asco, y el ranking no discute, gilipollas.',

    'Ship bajo sin derecho a defensa, patético, y el ranking no discute, patético.',

    'Poco material. Mucho riesgo de ridículo, basura, y el ranking no discute, asco.',

    'Bajo. El ranking no discute, ridículo, y el ranking no discute, basura.',

    'Química en huelga, fracasado, y el ranking no discute, ridículo, y el grupo ya lo olió, ridículo.',

    'Ship de los que mejor ni empezar y el ranking no discute, fracasado.',

    'Bajo perfil tóxico sin beneficio, cabrón, y el ranking no discute.',

    'Poca compatibilidad real, gilipollas, y el ranking no discute, mierda, y el grupo ya lo olió, mierda.',

    'Fail anunciado con números, mierda, y el ranking no discute, coño, y el grupo ya lo olió, coño.',

    'Bajo. Archivado por piedad, coño, y el ranking no discute, cabrón, y el grupo ya lo olió, cabrón.',

    'Casi cero con maquillaje, asco, y el ranking no discute, gilipollas.',

    'Ship flojo de solemnidad, patético, y el ranking no discute, patético.',

    'Compatibilidad de trámite negativo, basura, y el ranking no discute, asco.',

    'Bajo. El grupo ya dijo que no, ridículo, y el ranking no discute, basura.',

    'Poca chispa, mucho papelón, fracasado, y el ranking no discute, ridículo.',

    'Ship en zona de peligro tibio y el ranking no discute, fracasado.',

    'Bajo de verdad. Sin anestesia, cabrón, y el ranking no discute, y el grupo ya lo olió.',

    'Química ausente con testigos, gilipollas, y el ranking no discute, mierda.',

    'Fail de pareja en diferido, mierda, y el ranking no discute, coño, y el grupo ya lo olió, coño.',

    'Bajo. No fuerces el crossover, coño, y el ranking no discute, cabrón, y el grupo ya lo olió, miserable.',

    'Poco ship, mucho cringe potencial, asco, y el ranking no discute, gilipollas.',

    'Compatibilidad de sótano documentada, patético, y el ranking no discute, patético.',

    'Ship bajo sin plot twist, basura, y el ranking no discute, asco, y el grupo ya lo olió, asco.',

    'Bajo. Caso casi cerrado, ridículo, y el ranking no discute, basura, y el grupo ya lo olió, basura.',

    'La química pidió la baja, fracasado, y el ranking no discute, ridículo.',

    'Química en huelga, fracasado, y el ranking no discute, fracasado, y el grupo ya lo olió, fracasado.',

],
  zero: [
    'Cero. La distancia química es un agujero, no un puente. El ranking lo grita delante del puto grupo.',

    'Ship cero. Ni el almost existe. El bot cierra sin anestesia ni consuelo delante del puto grupo, mierda.',

    'Cero de compatibilidad. Separados es poco: mejor ni en el mismo chat delante del puto grupo, coño.',

    'Ship en el abismo. El número es un no rotundo sin maquillaje delante del puto grupo, cabrón.',

    'Cero. Estos dos juntos son un error de casting del comando delante del puto grupo, gilipollas.',

    'Compatibilidad cero. El ranking no ofrece segunda oportunidad útil delante del puto grupo, patético.',

    'Ship cero documentado. Autor el número, testigo el grupo entero delante del puto grupo, asco.',

    'Cero. Mejor archivo permanente que insistir en este fail delante del puto grupo, basura.',

    'Ship en el empty total. Ni chispa ni almost de pareja delante del puto grupo, ridículo.',

    'Cero de verdad. El bot midió y el resultado es un agujero delante del puto grupo, fracasado.',

    'Estos dos no suman ni en broma. Restan en serio en el ranking delante del puto grupo.',

    'Ship cero. La química se fue y no dejó ni una puta nota delante del puto grupo, mierda.',

    'Cero. El ranking firma el no sin narrador emocional delante del puto grupo, coño.',

    'Compatibilidad de abismo. Sin puente posible en este comando delante del puto grupo, cabrón.',

    'Ship cero hasta para el modo oscuro del ranking del grupo delante del puto grupo, gilipollas.',

    'Cero. Separados estorban menos al promedio del chat delante del puto grupo, patético.',

    'Ship en el sótano sin escalera. El número manda y punto delante del puto grupo, asco.',

    'Cero documentado delante del puto grupo sin filtro delante del puto grupo, basura.',

    'Ship fallido en grado cero. Sin asterisco de caridad delante del puto grupo, ridículo.',

    'Cero. El bot no regala ni una décima de caridad visual delante del puto grupo, fracasado.',

    'Estos dos son el gag más corto del comando de pareja delante del puto grupo.',

    'Ship cero. El almost de pareja ni siquiera empezó delante del puto grupo, mierda.',

    'Cero. Mejor ni el trámite del comando en este caso delante del puto grupo, coño.',

    'Compatibilidad cero. El ranking cierra el parte en seco delante del puto grupo, cabrón.',

    'Ship en el empty seat eterno del deseo del ranking delante del puto grupo, gilipollas.',

    'Cero de los que duelen porque ni ilusión quedó en pie delante del puto grupo, patético.',

    'Ship cero. Archivo y olvido sin segunda lectura útil delante del puto grupo, asco.',

    'Cero. La distancia no se mide: se certifica en el bot delante del puto grupo, basura.',

    'Ship fallido total. Sin recurso ni bis posible aquí delante del puto grupo, ridículo.',

    'Cero. El número es un muro y vosotros el eco del fail delante del puto grupo, fracasado.',

    'Estos dos juntos bajan el promedio solo con el ship delante del puto grupo.',

    'Ship cero. Ni el low light favorece a este par de mierda delante del puto grupo, mierda.',

    'Cero de compatibilidad. El bot no inventa química ajena delante del puto grupo, coño.',

    'Ship en el abismo documentado sin consuelo del ranking delante del puto grupo, cabrón.',

    'Cero. Separados es el único veredicto útil del comando delante del puto grupo, gilipollas.',

    'Compatibilidad cero. Sin filtro que salve el frame junto delante del puto grupo, patético.',

    'Ship cero hasta el cartel de salida del puto ranking delante del puto grupo, asco.',

    'Cero delante del puto grupo, basura delante del puto grupo. El ranking lo deja claro. El ranking lo deja claro.',

    'Ship fallido en limpio. Cero es cero y punto final delante del puto grupo, ridículo.',

    'Cero de puta madre en el sentido del vacío de pareja delante del puto grupo, fracasado.',

    'Estos dos no levantan ni con milagro del ranking del grupo delante del puto grupo.',

    'Ship cero. El chat archiva sin debate ni amplificación delante del puto grupo, mierda.',

    'Cero. La química es un rumor desmentido por el número delante del puto grupo, coño.',

    'Compatibilidad de abismo sin puente ni cuerda de escape delante del puto grupo, cabrón.',

    'Ship cero. Mejor ni en la misma foto del puto grupo delante del puto grupo, gilipollas.',

    'Cero documentado. Autor el bot, testigo todos en el chat delante del puto grupo, patético.',

    'Ship en el empty total del deseo del ranking del grupo delante del puto grupo, asco.',

    'Cero. El almost ni se presentó al trámite del comando delante del puto grupo, basura.',

    'Ship fallido. Cero sin maquillaje ni narrador emocional delante del puto grupo, ridículo.',

    'Cero. El número habla y no hay réplica posible aquí delante del puto grupo, fracasado.',

    'Estos dos suman un agujero con nombre en el ranking delante del puto grupo.',

    'Ship cero. El ranking firma el no en público y listo delante del puto grupo, mierda.',

    'Cero de verdad. Ni el modo avión oculta este fail delante del puto grupo, coño.',

    'Compatibilidad cero. Archivo cerrado sin recurso útil delante del puto grupo, cabrón.',

    'Ship en el sótano sin luz ni escalera de emergencia delante del puto grupo, gilipollas.',

    'Cero. Separados es piedad, juntos es el gag del chat delante del puto grupo, patético.',

    'Ship cero hasta para el que no cree en el comando delante del puto grupo, asco.',

    'Cero. El bot midió dos veces y las dos dio vacío total delante del puto grupo, basura.',

    'Ship fallido total. Sin consuelo ni narrador que salve delante del puto grupo, ridículo.',

    'Cero de compatibilidad. El veredicto es un muro seco delante del puto grupo, fracasado.',

    'Nada. Cero spark, cero futuro, cero debate, cabrón, y el ranking no discute.',

    'Ship imposible. El ranking firmó el no, gilipollas, y el ranking no discute, mierda.',

    'Cero de cero. Ni en fanfic salva, mierda, y el ranking no discute, coño, y el grupo ya lo olió, coño.',

    'Nula compatibilidad. El chat ni lo intenta, coño, y el ranking no discute, cabrón.',

    'Cero. Mejor enemigos que esto, asco, y el ranking no discute, gilipollas.',

    'Ship cancelado antes de empezar, patético, y el ranking no discute, patético.',

    'Nada de nada. El número es un muro, basura, y el ranking no discute, asco.',

    'Cero químico. Archivado con asco, ridículo, y el ranking no discute, basura.',

    'Imposible. Fin del experimento, fracasado, y el ranking no discute, ridículo.',

    'Cero. Ni el RNG los junta con sentido y el ranking no discute, fracasado.',

    'Nula. El grupo respira aliviado, cabrón, y el ranking no discute.',

    'Ship cero. Sin derecho a almost, gilipollas, y el ranking no discute, mierda.',

    'Nada. Química en modo avión eterno, mierda, y el ranking no discute, coño.',

    'Cero total. Caso cerrado, coño, y el ranking no discute, cabrón, y el grupo ya lo olió, cabrón.',

    'Imposible de vender hasta de broma, asco, y el ranking no discute, gilipollas.',

    'Ship nulo. El ranking no negocia, patético, y el ranking no discute, patético.',

    'Cero. Mejor cada uno por su lado, basura, y el ranking no discute, asco, y el grupo ya lo olió, asco.',

    'Nula compatibilidad documentada, ridículo, y el ranking no discute, basura.',

    'Cero spark. Cero paciencia del chat, fracasado, y el ranking no discute, ridículo.',

    'Nada. El agujero donde debería haber química y el ranking no discute, fracasado.',

    'Ship imposible con sello oficial, cabrón, y el ranking no discute.',

    'Cero. Ni forzado funciona, gilipollas, y el ranking no discute, mierda.',

    'Nula. Fin, mierda, y el ranking no discute, coño, y el grupo ya lo olió, coño.',

    'Cero de compatibilidad. Sin anestesia, coño, y el ranking no discute, cabrón.',

    'Imposible. El chat ya pasó página, asco, y el ranking no discute, gilipollas.',

    'Ship cero sin narrador amigo, patético, y el ranking no discute, patético.',

    'Nada que salvar. Nada que inventar, basura, y el ranking no discute, asco.',

    'Cero. El no más limpio del catálogo, ridículo, y el ranking no discute, basura.',

    'Nula química. Archivado, fracasado, y el ranking no discute, ridículo.',

    'Cero total. Ni meme salva esto y el ranking no discute, fracasado.',

    'Ship cancelado por el universo, cabrón, y el ranking no discute, y el grupo ya lo olió.',

    'Nada. El ranking fue misericordioso al decir cero, gilipollas, y el ranking no discute, mierda.',

    'Cero. Punto final, mierda, y el ranking no discute, coño, y el grupo ya lo olió, coño.',

    'Imposible de shippear sin autoengaño, coño, y el ranking no discute, cabrón.',

    'Nula. El grupo lo sabía, asco, y el ranking no discute, gilipollas.',

    'Cero químico sin maquillaje, patético, y el ranking no discute, patético.',

    'Ship nulo. Sin bis, basura, y el ranking no discute, asco, y el grupo ya lo olió, asco.',

    'Nada de nada. Caso cerrado con llave, ridículo, y el ranking no discute, basura.',

    'Cero. Y menos mal, fracasado, y el ranking no discute, ridículo, y el grupo ya lo olió, ridículo.',

    'Cero spark. Cero paciencia del chat, fracasado, y el ranking no discute, fracasado, y el grupo ya lo olió, fracasado.',

],
};

// Etiqueta visible para un participante. Un JID @lid no resuelve a un numero
// real al mostrarse como @mencion — en ese caso preferimos el nombre conocido
// del participante (mismo fallback que ya usa !roast) en vez de exponer el
// numero interno del LID. Los JIDs de telefono siguen mostrandose como
// @numero, igual que antes, para que WhatsApp los resuelva como mencion.
function resolveLabel(jidVal, participants) {
  const bare = bareJid(jidVal);
  const num = bare.split('@')[0];
  if (!bare.endsWith('@lid')) return `@${num}`;
  const p = participants.find(x =>
    bareJid(x.id) === bare || bareJid(x.lid) === bare || bareJid(x.phoneNumber) === bare
  );
  return p?.name || p?.displayName || p?.verifiedName || p?.notify || `@${num}`;
}

async function cmdShip(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: 'Solo en grupos.' }, { quoted: msg });
  }

  const groupParticipants = groupMeta?.participants || [];
  // Del sorteo se caen el bot y el owner principal: el bot no se shipea con
  // nadie, y el owner es invisible en toda salida automatica (igual que en los
  // tops, en !count y en !vs). Si alguien lo menciona a proposito si entra, y
  // ahi ya manda el amanyo de abajo.
  const participantIds = groupParticipants
    .map(p => p.id)
    .filter(id => id && !isBotJid(sock, id) && !isMainOwner(id, false, groupMeta));
  if (participantIds.length < 2) {
    return sock.sendMessage(jid, { text: 'Necesito al menos 2 miembros en el grupo.' }, { quoted: msg });
  }

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const mentioned = ctx?.mentionedJid || [];
  // Una respuesta citada cuenta como segundo objetivo si no quedo ya cubierto
  // por una mencion explicita — asi !ship funciona respondiendo a un mensaje,
  // igual que !mute/!promote/!demote.
  const quotedParticipant = ctx?.participant;
  const targets = [...mentioned];
  if (quotedParticipant && !targets.some(t => bareJid(t) === bareJid(quotedParticipant))) {
    targets.push(quotedParticipant);
  }
  const sender = getSender(msg);

  let a, b;

  if (targets.length >= 2) {
    // !ship @a @b (o @a + responder a b) — shipea exactamente esos dos
    [a, b] = targets.slice(0, 2);
  } else if (targets.length === 1) {
    // !ship @a (o responder a alguien) — shipea al que manda con @a
    a = sender;
    b = targets[0];
  } else {
    // !ship a secas — a QUIEN LO ESCRIBE con alguien al azar.
    //
    // Antes sorteaba dos miembros cualesquiera y el que había escrito el comando
    // se quedaba mirando cómo emparejaban a otros dos. Escribir !ship es
    // apuntarse: lo mínimo es que te toque a ti.
    a = sender;
    const resto = participantIds.filter(id => !sameUser(id, sender));
    if (!resto.length) {
      return sock.sendMessage(jid, { text: 'No hay nadie más en el grupo con quien shipearte.' }, { quoted: msg });
    }
    b = shuffle(resto)[0];
  }

  // No shippear a alguien consigo mismo (igual que !mog y !vs).
  if (sameUser(a, b)) {
    return sock.sendMessage(jid, { text: 'No puedes shippear a alguien consigo mismo.' }, { quoted: msg });
  }

  // Rig a favor del owner principal: si participa, la compatibilidad es alta pero
  // VARIABLE (88-100), no siempre 100, para que no se note el amaño.
  // Al owner principal se le shipea SIEMPRE bajo, 0-12, por pedido expreso suyo:
  // no le gustan los ships en él y punto.
  //
  // Se probó a suavizarlo a 8-53 junto con el resto de amaños, para que no
  // cantara tanto. Lo revirtió: aquí prefiere que cante a que le emparejen. Es
  // su decisión y no se vuelve a tocar sin que la cambie él.
  const ownerInvolved = isMainOwner(a, false, groupMeta) || isMainOwner(b, false, groupMeta);
  const compat = ownerInvolved ? Math.floor(Math.random() * 13) : Math.floor(Math.random() * 101);
  const filled = Math.round(compat / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

  const verdict =
    compat === 100 ? pickFresh(VERDICTS.perfect, `${jid}|ship|perfect`) :
    compat >= 70   ? pickFresh(VERDICTS.high,    `${jid}|ship|high`) :
    compat >= 40   ? pickFresh(VERDICTS.mid,     `${jid}|ship|mid`) :
    compat >= 10   ? pickFresh(VERDICTS.low,     `${jid}|ship|low`) :
                     pickFresh(VERDICTS.zero,    `${jid}|ship|zero`);

  const labelA = resolveLabel(a, groupParticipants);
  const labelB = resolveLabel(b, groupParticipants);

  const text =
    `*Ship*\n\n` +
    `${labelA}  +  ${labelB}\n\n` +
    `${bar}  *${compat}%*\n\n` +
    `${verdict}`;

  await sock.sendMessage(jid, { text, mentions: [a, b] }, { quoted: msg });
}

module.exports = { cmdShip };
