const { getActiveUsers, resetCounts, resetAllCounts, getLastReset } = require('../utils/messageCounter');
const { isOwner, isMainOwner, isAdmin, isGroupAdmin, getSender, getTarget, sameUser, soloMiembros } = require('../utils/wa');
const { pickFresh } = require('../utils/helpers');
const { cobrar, textoSinSaldo } = require('../utils/auraCobro');
const { SOLO_ADMINS, SOLO_GRUPOS } = require('../data/avisos');
const { aviso, avisoPermiso } = require('../utils/helpers');

let MEMBER_PHRASES = [
  [
    'Primero. Te duele la muñeca de tanto escribir y sigues, como si el oro lo curara.',
    'Primero del grupo, y tu batería no llega a la hora de comer.',
    'Esta semana has escrito lo que otros curran en un turno, y sin cotizar.',
    'Escribes más que nadie aquí. Fuera de este grupo no te contesta ni tu madre.',
    'Primero del grupo. La cena está fría, el tenedor se ha quedado en el aire y el oro quema en la otra mano.',
    'Has escrito más mensajes aquí que palabras le has dicho a tu familia este año.',
    'Lo sabe el grupo, lo sabe tu operador y lo sabe tu jefe, que te paga por esto sin saberlo.',
    'Hablas tú y el chat se queda mudo. El oro es esa pausa, con los móviles ajenos parados en tu nombre.',
    'Primer puesto. Si mañana te callas, esto se convierte en un cementerio con notificaciones.',
    'Te duchas con el móvil en el lavabo por si te pierdes algo.',
    'Ganas el ranking. Lo que pierdes no sale aquí: el sol, el sueño y la vergüenza.',
    'Primero, con diferencia, y el cuello ya se te ha quedado con la forma del móvil.',
    'Se te ha olvidado hablar en persona, pero aquí no hay quien te calle.',
    'Llevas el culo cuadrado de la silla y lo llamas constancia.',
    'Mientras otros prometen volver, tú no te has ido. Ni a dormir.',
    'Te sabes la vida de todo el grupo y nadie sabe a qué te dedicas. Ahora sí: a esto.',
    'Los fantasmas deberían pagarte una cuota por mantenerles el grupo vivo.',
    'El trono es tuyo, y la silla también: no te levantas de ella desde marzo.',
    'Contestas aquí antes que en el trabajo, y en el trabajo ya se han dado cuenta.',
    'Tu récord de mensajes y tus días sin pisar la calle van a la par.',
    'Los demás tienen una vida que les roba tiempo. Tú lo arreglaste por las bravas: no la tienes.',
    'Quien te quiera quitar el puesto va a tener que dejar de ducharse, como tú.',
    'Se te calienta la sien de tanto escribir, y en persona ni te sube el pulso.',
    'A las cuatro de la mañana aquí solo escribe una persona, y tiene tus ojeras.',
    'Si esto pagara en dinero, podrías dejar de trabajar. Tampoco es que lo hagas.',
    'Quien quiera salir contigo va a competir con este grupo, y va a perder.',
    'Primero del grupo. En tu lápida pondrá «escribiendo…».',
    'Has hecho del grupo tu casa, y se nota en cómo tienes la otra.',
    'Tienes el oro, el cristal grasiento y la persiana bajada. Por la rendija entra el grupo, y nada más que esa puta luz.',
    'El bot te cuenta los mensajes, y tu madre, los días que no la llamas.',
  ],
  [
    'Segundo. Ni para no tener vida eres el mejor.',
    'Plata. Te han dado el segundo en lo único que haces, y perder hasta en esto tiene mérito.',
    'Te has dejado la vista en el segundo puesto, que es quedar detrás.',
    'Te cuelgan la plata del cuello y quien va primero sigue escribiendo, sin levantar el puto ojo.',
    'Segundo lugar. Al lado del trono y sin poder sentarte, como siempre en tu puta vida.',
    'Escribes a todas horas y hay alguien que te gana. Ni en la adicción destacas.',
    'Si el primero se fuera del grupo, el trono sería tuyo. Reza, que escribir no te ha funcionado.',
    'Segundo. Que en el mundo real, para ti, se traduce como: no.',
    'Le miras la nuca al primero todos los días. Es lo único que ves del trono.',
    'Relees lo que ibas a mandar y le quitas los dientes. El mensaje sale en segundo, desdentado.',
    'Te pasas el día aquí metido y te gana alguien que, encima, trabaja.',
    'Número dos. Nadie se acuerda del segundo, y en la foto sales cortado.',
    'Se te pone la cara ardiendo de tanto escribir. Quien va primero suelta otro mensaje y ni se le nota.',
    'Si te pagaran por mensaje, cobrarías menos que el primero. Como en todos tus trabajos.',
    'La frase se te muere en el borrador en cuanto aparece quien va primero.',
    'Has quemado una batería entera hoy para quedarte en plata.',
    'Llevas el móvil al baño y sales segundo. Hasta cagando te ganan.',
    'Segundo puesto: el que se queda con las ganas y con el cuello torcido de mirar arriba.',
    'Plata. Tienes los mensajes de un enfermo y la medalla de un aficionado.',
    'Número dos. Sostienes el grupo a medias, y la foto se la lleva el de arriba.',
    'Te tapas el oro con la palma y el nombre de arriba se lee igual. La plata sigue debajo.',
    'Plata, y bien ganada. El oro lo tiene alguien que no duerme.',
    'En otro grupo igual ibas primero. Aquí llegas tarde a todo, hasta al primer puesto.',
    'Se te marca la mandíbula y el mensaje sale mordido. El segundo puesto ni pestañea.',
    'Quien va primero cierra el chat y se olvida. Tú te quedas mirando el visto, en plata, con el tuyo todavía abierto.',
    'El grupo brinda por quien va primero y a ti te llega el vaso con la plata ya tibia.',
    'Número dos. Entras al chat y el tema ya se ha ido con quien va primero. Te queda el hueco, frío.',
    'Plata. Pierdes contra alguien que tampoco tiene vida. Imagínate la tuya.',
    'Desde la plata se le ve el culo a quien va primero, y nada más.',
    'Te aplauden el segundo puesto con la mano ya floja, y se vuelven al de arriba.',
  ],
  [
    'Te plantan el bronce en la palma y no pesa una hostia. Los dos de arriba ya van por otro tema.',
    'Tercero. Te usan de testigo, te sueltan el «gracias» y vuelven con los dos de arriba. El bronce se queda con el gracias.',
    'Bronce. Alguien dice tu nombre, duda y acaba contando el chiste de quien va primero.',
    'Escribes con la lengua fuera y el bronce te espera al final, frío y de sobra.',
    'Tercero. La gente te reconoce y nadie te teme: eres mobiliario con notificaciones.',
    'En un grupo de dos irías segundo. Aquí cierras la fiesta.',
    'Te encajan el bronce para cerrar el podio. Los dos de arriba siguen a lo suyo, de espaldas.',
    'Te toca hablar cuando los dos de arriba ya han cerrado el tema. Tu frase llega tarde y se cae, sin nadie debajo.',
    'Bronce. Te brilla un segundo y se apaga en cuanto entran los dos nombres de arriba.',
    'Tercer puesto. Apoyas el codo donde no hay sitio y el brazo se te queda colgando, fuera del podio.',
    'La medalla más barata del podio. Agárrala, que no vas a ver otra.',
    'Hay dos con menos vida que tú, y te ganan. Piensa en eso un rato.',
    'Tercer puesto del ranking. Los fantasmas te miran desde el sótano sin entender cómo se sube.',
    'En la foto del podio, la esquina cortada eres tú.',
    'Te pasas el día escribiendo y en casa creen que trabajas. Ni aquí te va bien.',
    'Bronce. Tienes las ojeras del primero y la medalla del tercero.',
    'Tercero. Se te ha dormido una pierna y el puesto sigue ahí abajo.',
    'Tercera plaza. Lo único que te sale es no irte del chat, y ni con eso subes.',
    'Has escrito más que casi todos y lo único que tienes es esta línea.',
    'Si te callas una semana, nadie se da cuenta hasta que el bot te baja del podio.',
    'Los de abajo te escriben en privado y los de arriba ni te reenvían. El bronce se queda en el bolsillo, mudo.',
    'Tercer escalón: el que pisa todo el mundo para subir.',
    'Ni mandas ni sobras. Haces bulto, pero con medalla.',
    'Tercero. El podio te aguanta el peso y no te guarda la silla cuando te levantas a mear.',
    'Dices algo y el chat le contesta a quien va arriba. Tu mensaje se queda ahí, en azul, sin respuesta.',
    'Lo pones en mayúsculas para que se te vea y el bronce lo deja en voz baja, al fondo.',
    'Te guardas el bronce en el bolsillo y ni suena. Los dos de arriba siguen el hilo sin mirarte.',
    'Te conectas antes que tu despertador y aun así te ganan dos.',
    'Tercero en el ranking de un chat. Ponlo en el currículum, a ver qué pasa.',
    'Estás en el podio, en el escalón donde se sube a hacer la foto y a nada más.',
  ],
];

let ADMIN_PHRASES = [
  [
    'La corona y la placa en la misma cabeza. Este grupo tiene dictador, y encima lo eligió el marcador.',
    'Repartes normas y cumples la única que nadie te puso: no salir de esta silla.',
    'Número uno con placa. El grupo te lee hasta el punto final y deja lo suyo a medio teclear.',
    'Si algún día te vas, este grupo se queda mudo y sin ley a la vez.',
    'No hace falta que recuerdes que mandas: el contador lo grita por ti.',
    'La placa y el trono. Si esto fuera un país, el gobierno serías tú, tú y otra vez tú.',
    'Moderas el grupo como quien vigila su casa: desde dentro y sin salir nunca.',
    'Primer puesto con placa. Cambias la descripción del grupo y nadie se atreve a tocar una letra.',
    'La placa te la dieron. El primer puesto te lo has ganado tú, a costa de tus horas de sueño.',
    'Echas a la gente por inactiva y tú no te has desconectado desde que te dieron el cargo.',
    'Tienes el botón de expulsar y el récord de mensajes. Lo segundo da más miedo.',
    'La placa va caliente de tanto usarla y el oro va en la misma mano. Se te ha quedado la marca de las dos en la palma.',
    'Admin número uno. Si el grupo tuviera escudo, llevaría tu cara y tus ojeras.',
    'Pones la placa a la vista y el oro debajo. El siguiente mensaje del grupo sale bajito, como quien habla en un velatorio.',
    'Cuando hablas, se te escucha por las dos cosas. Cuando te callas no lo sabemos, porque no pasa.',
    'Admin en la cima. Otros mandan a gritos; tú mandas a mensajes, que es peor.',
    'El resto de admins te mira y piensa: así no, por favor.',
    'Admin y quien más escribe. Se te abre el chat como quien aparta sillas, y nadie vuelve a ocupar el sitio.',
    'Tu poder cabe en este grupo de mierda y lo ejerces a jornada completa.',
    'Quien diga que los admins no hacen nada, que mire esta línea. Luego que te mire las ojeras.',
    'Tu autoridad se mide en mensajes, y los tuyos ya no caben en un día.',
    'El grupo va a tu ritmo, y tu ritmo es el de alguien que no sale de casa.',
    'Primer puesto con placa. Sueltas una orden corta y te la cumplen antes de terminar de leerla.',
    'Quien quiera tu sitio, que empiece a escribir hoy y que no pare hasta olvidarse de su familia. Como tú.',
    'Tienes poder sobre todo el grupo y ninguno sobre la hora a la que te vas a dormir.',
    'La placa te la quitan con un clic. El vicio no te lo quita ni un psiquiatra.',
    'Moderas desde el baño, desde la cama y desde la cola del súper. Admin de guardia sin sueldo.',
    'El grupo sabe a quién hacer caso, y tú no sabes ni salir a comprar el pan.',
    'Admin en lo alto. Tienes el grupo bajo control y la vida en modo avión.',
    'La placa y el primer puesto duermen enchufados en la mesilla. La luz del chat te queda pegada a la cara hasta en la almohada.',
  ],
  [
    'Tu placa queda debajo de un nombre sin cargo. Se paran en ese nombre y a ti te pasan de largo.',
    'La norma lleva tu placa y quien va primero la tapa con un audio. La plata se oye ahí, de fondo.',
    'Puedes borrar el mensaje de otro de un toque, y el segundo puesto no se borra. Se queda ahí, igual de puto.',
    'El panel de admin te obedece y el ranking te escupe. La plata sale al lado. La placa no mueve un puesto.',
    'Tienes el botón para echar al primero y no lo usas. Es lo más digno que has hecho aquí.',
    'Puedes silenciar a quien te da la gana, y quien va primero sigue hablando por encima. La plata no se calla con tu placa.',
    'La placa encendida y el segundo puesto debajo. El grupo contesta a quien va primero, y tu mensaje ni suena.',
    'En tu nombre se leen las dos cosas seguidas, la placa y la puta plata, quietas, sin pestañear.',
    'Das una orden. Quien va primero dice lo contrario desde el oro, y la tuya llega a la mitad del grupo y ahí se muere.',
    'Mandas tú y escribe más otro. Un reparto raro que nadie se atreve a contarte.',
    'Te saludan por la placa y te leen por costumbre. La reacción llega sin corazón, seca, en plata.',
    'Plata y cargo. Mandas desde atrás, como los cobardes con galones.',
    'El poder lo firmas tú con la placa. Los mensajes los firma quien va arriba. La puta plata se queda en el medio, en blanco.',
    'Se te enfría el café mirando el oro de quien va arriba. Das un trago y sigue sabiendo a plata.',
    'Te colgaron la placa en el nombre. El oro no, y se te queda la mano abierta, esperando una mierda que no cae.',
    'Abres la boca para poner orden y quien va primero ya ha cerrado el tema. La plata se queda en una mesa vacía, con la placa brillando.',
    'Te agachas a por el cargador y al subir quien va primero ya ha escrito. Sigues en plata, con el cable en la mano.',
    'La plata te tiene mirando el nombre de arriba como quien mira una puerta cerrada, con la rabia en el bolsillo.',
    'Moderas con la cara puesta, sin esconderte, y el oro te queda un renglón por encima, pasándoselo por el forro.',
    'Quien se lleva el oro ya se ha quitado los zapatos. Tú sigues con la placa puesta y los zapatos puestos, en plata.',
    'Te saltan a la vez el aviso de admin y el del chat. Atiendes los dos a saltos y el oro ni se inmuta.',
    'Tienes los botones de la placa en fila, relucientes. Quien va arriba tiene el chat. Tú tienes un manojo de botones y plata.',
    'Le pides a la placa que mueva el puesto. La placa no contesta. El silencio se te queda en la oreja, en plata.',
    'Si el grupo se tambalea, eres una de las piernas que lo sujetan. La coja.',
    'Plata, con cargo y con más mensajes que la mayoría de los que se quejan de los admins.',
    'Pones una orden y te vuelve un «jaja». La plata cabe en esa risa, con la placa puesta y todo.',
    'Cierras el ranking de un manotazo. La placa sigue brillando en el nombre, inútil, en plata.',
    'Te dicen que sí con educación, con esa sonrisa de chat, y el ranking te planta en plata sin levantar la vista.',
    'Se te va la vista al nombre de arriba y el mensaje que sale después sigue en plata.',
    'Por encima de ti solo hay una persona, y el grupo lo ve cada vez que mandas algo.',
  ],
  [
    'Llegas al podio con la placa puesta y dos ya tienen sitio. Tú te quedas de pie, con el bronce en la mano.',
    'Tercer puesto con placa. Das el parte y se oye el tecleo de los dos de arriba, que no han parado.',
    'Repartes normas desde la tercera fila. Se oyen, pero poco.',
    'Bronce con placa. El grupo te suelta el emoji del pulgar y se vuelve al hilo de los de arriba.',
    'Tercer puesto con placa. El bronce hace un ruido flojo al tocar la mesa y nadie pregunta qué ha sido.',
    'El hombro de los dos de arriba te tapa. De ti asoma la placa, ridícula, con el bronce colgando.',
    'Estás arriba y con placa. El bronce se te queda en la mesa y nadie alarga la mano.',
    'Sujetas la puerta del grupo, dejas pasar a dos y te quedas en el marco. La placa roza la madera y no entra.',
    'Bronce y placa. Levantas la voz y alguien pide que hable uno de los dos de arriba.',
    'Bronce con placa, al fondo de la bandeja, donde se enfría el plato que nadie pide.',
    'Bronce con placa. Pones cara de aviso y te llega un audio de risa. El bronce no da ni para que corten el audio.',
    'Te dan la enhorabuena por el bronce, con la placa puesta, y ya están en otra cosa antes de soltar el vaso.',
    'Cierras un aviso y abres el chat. En los dos sitios hay dos nombres por encima del tuyo, ocupando la luz.',
    'Tienes la placa en la lista de admins y el bronce en la otra. El grupo abre la del bronce y se ríe en tu cara.',
    'Escribes y se te ve. Abres tu nombre y la placa sale pegada a un bronce sin lustre, pequeño y sucio.',
    'Tercer escalón con placa. Los dos de arriba te ganan sin botón de expulsar.',
    'Tercero, escribiendo, y con la placa a mano por si alguien se te ríe.',
    'Si te expulsaras a ti, el grupo tardaría un día en darse cuenta.',
    'No te escondes detrás de la placa. El tercer puesto te deja a la luz, con el bronce de linterna y la cara sin sitio donde meterse.',
    'Admin en bronce. Los dos de arriba te ganan sin placa y la tuya no les tapa la boca.',
    'Podio con placa. Tercer puesto y el respeto justo para que no te contesten con un sticker.',
    'Alguien lee tu aviso, suelta el aire por la nariz y sigue el hilo de los dos de arriba.',
    'Escribes hasta que se te seca la boca. La placa sigue en su sitio y el bronce sigue tibio, en el tercero.',
    'Hay admins que ni saben dónde está el ranking. Tú lo miras cada hora, y aun así en tercer lugar.',
    'Bronce con placa. Has sudado el puesto sin tocar el botón, y el sudor se queda en un metal que no brilla.',
    'Tercer puesto con placa. Te hacen caso cuando los dos de arriba no están, y se van en cuanto vuelven.',
    'Moderas desde el bronce, con la placa en la grada. La norma sale y se queda flotando, sin que nadie la recoja.',
    'Si el grupo tuviera un consejo, tendrías silla. La plegable.',
    'Admin con el chat abierto. Te buscan, dan con el bronce y sueltan el hilo, sin ganas.',
    'El tercer puesto con placa te lo has ganado. Nadie levanta el vaso. El bronce brinda contra la mesa, a solas.',
  ],
];

// ─── LA DISTANCIA REAL CON EL DE ARRIBA ──────────────────────────────────────
//
// Lo pidio el dueño. Las frases del podio decian «por poco» o «te falta un
// empujon» sin mirar cuantos mensajes separaban a nadie: podias ir segundo a
// dos mil del primero y leer que estabas a un paso. Ahora se mide el hueco con
// el de arriba (o, para el primero, con el de abajo) y se elige frase de
// cerca o de lejos. %G es ese hueco, ya escrito («*340 mensajes*»).
const DISTANCIA = {
  primeroJusto: [
    'Vas primero, pero con el segundo pegado al culo: %G de ventaja y bajando.',
    'Vas arriba por %G. Como te despistes una tarde, te pasan por encima.',
    'Eres el número uno con %G de margen, que es lo que pierdes en una tarde sin cobertura.',
    'Te sientas en el trono con %G de ventaja. Esta noche no duermas, que te lo quitan.',
    'Arriba del todo, pero por %G. El segundo ya te está oliendo la nuca.',
    'Primero por los pelos: %G. Un audio largo del de abajo y se acabó tu reinado.',
    'Lideras por %G, lo que se suelta en una bronca de pareja. Como haya una esta noche, te jodes.',
    'Tienes %G de colchón en el primer puesto, y es de los que se hunden.',
    'Te llevas el oro por %G. Escribe esta noche o mañana lo tienes que devolver.',
    'Eres el número uno por %G, y el segundo ya escribe desde el baño para quitártelo.',
  ],
  primeroHolgado: [
    'Le sacas %G al segundo. Te aburres de ganar y aun así no te callas, yonqui.',
    'Vas primero con %G de ventaja. El resto se pelea por la plata porque tu oro ni lo huele.',
    'Número uno por %G. Para alcanzarte, el segundo tendría que dejar de dormir una semana.',
    'El segundo te ve a %G y ha decidido tener vida. Tú sigues aquí.',
    'Le has metido %G al de abajo. Eso no se remonta ni con insomnio.',
    'El trono es tuyo, con %G de foso alrededor. Nadie lo va a cruzar y tú no vas a salir.',
    'Te podrías callar un mes y seguirías primero por %G. No te vas a callar ni un día.',
    'Vas %G por delante del segundo. Llevas el grupo a cuestas y el marcador lo dice.',
    'Número uno a %G del siguiente. Los demás se reparten tus sobras.',
    'Le sacas %G al segundo, que ya ni mira hacia arriba, el pobre.',
  ],
  segundoCerca: [
    'Estás a %G del primero. Un par de broncas bien llevadas y te sientas en el trono.',
    'Segundo, a %G del número uno. Huele el oro, que lo tienes ahí.',
    'Te quedan %G para pasar al primero. Una noche sin dormir y mañana mandas tú.',
    'Plata a %G del oro. Lo tienes al alcance de la mano y la mano se te queda corta, temblando, hecha una mierda.',
    'Estás a %G del primero, y el primero ya no duerme por tu culpa.',
    'Vas segundo por %G. Un día bueno y le quitas el puesto.',
    'Te separan %G del primero. Eso se escribe en una tarde de cotilleo.',
    'Estás a %G del oro. Lees el nombre de arriba tan pegado que tragas saliva, y sigues en plata.',
    'Vas segundo, pisándole los talones al primero: %G y nada más.',
    'Tienes la plata, a %G. Como el primero se vaya de vacaciones, el trono es tuyo.',
  ],
  segundoLejos: [
    'Te tiene a %G el primero. Eso no lo recortas ni a base de audios.',
    'Plata, a %G del oro. Lo ves de lejos, como quien mira un yate desde la playa.',
    'Vas segundo, a %G del primero. Juntas plata y el oro te queda igual de lejos.',
    'Te faltan %G para el primer puesto. Pide un café, que va para largo.',
    'Tienes la plata, a %G. Al primero ni le hace falta mirarte.',
    'Medalla de plata a %G del número uno. Quien va primero ya se ha ido a dormir y a ti ni te llega el ruido.',
    'A %G del primero. Para alcanzarle tendrías que escribir hasta en sueños.',
    'Te quedan %G por detrás del oro, y no lo ves ni con prismáticos, bobo.',
    'Estás a %G del primero, tirado en la plata, que es lo que te pega.',
    'Te sacan %G desde el primer puesto. Agárrate a la plata, que es lo que hay.',
  ],
  terceroCerca: [
    'Estás a %G del segundo. Un empujón y le quitas la plata.',
    'Tienes el bronce, a %G de la plata. Eso lo recuperas con un solo cotilleo.',
    'Te faltan %G para la plata. La tienes delante y abrazas el bronce, que es lo único que te cabe en la mano.',
    'Tercero, a %G del de arriba. La plata la tienes a tiro de piedra.',
    'Te quedas a %G del segundo. Quien va delante ha dejado el mensaje a medias y aun así te saca esa miseria.',
    'Bronce por los pelos: el de arriba te saca %G y nada más.',
    'Estás a %G de la plata. Quien va delante ni se ha enterado de lo cerca que andas, y el bronce te delata.',
    'Vas tercero, pisándole los talones al segundo: %G de diferencia.',
    'Te separan %G del segundo, y ya le estás oliendo la nuca.',
    'Te quedan %G para la plata. El bronce y la plata casi se tocan, y el tuyo sale sin brillo.',
  ],
  terceroLejos: [
    'Tercero, y a %G del segundo. Miras hacia la plata y te sale borrosa. El bronce lo tienes nítido, en la mano, y es una mierda.',
    'Tienes el bronce a %G de la plata. El de arriba ni sabe que existes.',
    'Te faltan %G para el segundo. Hoy mismo, si te pones. No te vas a poner.',
    'A %G del segundo puesto. Gritas desde el bronce y arriba no se gira ni el nombre.',
    'Tercero con %G por detrás del segundo. Agarras el bronce y la plata no está ni en la habitación de al lado.',
    'Tienes el bronce, y la plata a %G. No la pillas ni corriendo.',
    'Estás a %G del segundo. Eso no lo arreglas con dos memes y un audio.',
    'Vas tercero, a %G de la plata. El hueco te queda ancho, y el bronce no lo cruza.',
    'Te sacan %G desde el segundo. El bronce te lo quedas tú, caliente de vergüenza, y la plata ni se entera.',
    'Bronce a %G de quien va delante. Te ha tocado el metal oscuro, el que no refleja ni su cara.',
  ],
};

// Frases viejas del podio que dan por hecho una distancia. Las de «cerca» solo
// salen si de verdad estas cerca; las de dominio del primero, solo si va
// sobrado. El resto vale para cualquier hueco.
const SUENA_CERCA = /por poco|empuj|un escal[oó]n|a un puesto|falta un puesto|tenerlo todo|vacaciones|si aflojas|si faltas/i;
const SUENA_SOBRADO = /indiscutible|sin discusi|nadie te lo va a quitar|el resto compite|que descansen/i;

// Cerca = a menos de 15 mensajes o del 10 % de lo que lleva el de arriba.
function estaCerca(gap, arriba) {
  return gap <= Math.max(15, Math.round(arriba * 0.10));
}

const msgsTxt = (n) => `*${n}* ${n === 1 ? 'mensaje' : 'mensajes'}`;

// La frase de un puesto del podio, mirando el hueco real.
function fraseDelPodio(jid, i, admin, gap, arriba) {
  const cerca = estaCerca(gap, arriba);
  const clave = i === 0 ? (cerca ? 'primeroJusto' : 'primeroHolgado')
    : i === 1 ? (cerca ? 'segundoCerca' : 'segundoLejos')
    : (cerca ? 'terceroCerca' : 'terceroLejos');
  const viejas = (admin ? ADMIN_PHRASES[i] : MEMBER_PHRASES[i]).filter((f) => {
    if (i === 0) return cerca ? !SUENA_SOBRADO.test(f) : true;
    return cerca ? true : !SUENA_CERCA.test(f);
  });
  // Mitad y mitad: la distancia se dice siempre en la linea de abajo, asi que
  // no hace falta que todas las frases la repitan.
  if (Math.random() < 0.5 || !viejas.length) {
    return pickFresh(DISTANCIA[clave], `${jid}|count|dist|${clave}`).replace(/%G/g, msgsTxt(gap));
  }
  return pickFresh(viejas, `${jid}|count|${i}|${admin ? 'a' : 'm'}|${cerca ? 'c' : 'l'}`);
}

// Fecha del ultimo reseteo, en formato corto. Se calcula a mano en vez de con
// toLocaleDateString porque el locale del servidor no es fiable y en la VPS
// salia en ingles.
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fechaCorta(ms) {
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${dd} ${MESES[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

// Pie del ranking con el origen de los datos: sin esto, un ranking recien
// reseteado parece que el grupo lleva dos dias muerto.
async function pieDeReset(jid) {
  const ts = await getLastReset(jid).catch(() => null);
  if (!ts) return '\n\n_Contando desde el primer mensaje registrado._';
  // Math.max(0, ...) por si el reloj del servidor se movio hacia atras: sin el,
  // una marca "del futuro" imprimia "hace -1 dias".
  const dias = Math.max(0, Math.floor((Date.now() - ts) / 86400000));
  const desde = dias === 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`;
  return `\n\n_Último reset: ${fechaCorta(ts)} (${desde})._`;
}

// Ranking canónico compartido por el board y por "!count @user": solo miembros
// actuales (cruzado con sameUser para puentear LID↔teléfono), sin el owner
// principal (invisible en toda salida), ordenado de más a menos mensajes. Si no
// hay metadata (fetch falló), no se filtra por miembros para no vaciar el top.
function rankedUsers(users, groupMeta) {
  let out = soloMiembros(users, groupMeta);
  out = out.filter(u => !isMainOwner(u.jid, false, groupMeta));
  return out.slice().sort((a, b) => b.count - a.count);
}

async function cmdCount(sock, msg, groupMeta, args) {
  const jid = msg.key.remoteJid;

  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: aviso(SOLO_GRUPOS, jid, 'grupos') }, { quoted: msg });
  }

  // Solo admins y owner tier. Se cerró por pedido expreso: el ranking de
  // actividad expone el conteo de todo el grupo y no tiene por qué poder
  // sacarlo cualquiera. Resetearlo sigue siendo solo del owner (destructivo).
  const quien = getSender(msg);
  if (!isGroupAdmin(quien, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: aviso(SOLO_ADMINS, jid, 'admins') }, { quoted: msg });
  }

  // EL COBRO VA AQUI, DESPUES DEL PERMISO, y no en la tabla central.
  //
  // Estaba en COBRO_CENTRAL, que corre ANTES del comando: a un miembro se le
  // cobraban 25 y justo despues le llegaba el "solo los admins". Pagaba por un
  // rechazo. Y el catch del handler solo devuelve el aura cuando salta una
  // excepcion — un `return` no lo es, asi que ese aura no volvia.
  //
  // El orden correcto es permiso -> cobro -> ejecucion, y el unico sitio donde
  // se puede hacer es dentro del comando, que es quien conoce su propio gate.
  const pago = await cobrar(jid, quien, 'count', { fromMe: msg.key.fromMe, groupMeta });
  if (!pago.ok) {
    return sock.sendMessage(jid, { text: textoSinSaldo('count', pago, jid) }, { quoted: msg });
  }

  // !count @mention — o RESPONDIENDO a un mensaje suyo, que es lo natural.
  //
  // Antes solo miraba `mentionedJid`, así que citar el mensaje de alguien y
  // escribir !count encima sacaba el ranking entero como si no hubieras
  // apuntado a nadie. Responder a un mensaje es la forma cómoda de señalar a
  // una persona en WhatsApp — no hay que buscarla en la lista de contactos — y
  // el resto del bot ya la acepta.
  //
  // `getTarget` resuelve las dos: la mención real (mentionedJid, la única
  // fiable, porque un "@numero" escrito a mano no cuadra con los LID de los
  // grupos modernos) y el autor del mensaje citado (contextInfo.participant).
  const mentioned = getTarget(msg);

  if (mentioned) {
    // Del owner principal no se contesta nada. Decir "no tiene mensajes
    // registrados" era señalarlo igual: es la única persona del grupo de la que
    // el bot da esa respuesta, así que preguntarlo dos veces bastaba para
    // deducirlo. El silencio no distingue al owner de un comando que no salió.
    if (isMainOwner(mentioned, false, groupMeta)) return;
    // Se calcula el puesto sobre EXACTAMENTE el mismo ranking que muestra el
    // board (!count): miembros actuales y sin el owner. Si no, el número de
    // puesto de "!count @user" no cuadraría con la tabla (contaría ex-miembros
    // y al owner en el orden).
    const sorted = rankedUsers(await getActiveUsers(jid, 1), groupMeta);
    // sameUser bridges LID↔phone: the mention may be a phone JID while the stored
    // key is the sender's @lid (or vice versa). A plain bareJid compare would miss
    // and wrongly report "0 mensajes" for an active member in a LID group.
    const rankIdx = sorted.findIndex(u => sameUser(u.jid, mentioned));
    const count = rankIdx >= 0 ? sorted[rankIdx].count : 0;
    const phone = mentioned.split('@')[0];
    const msgs = count === 1 ? '1 mensaje' : `${count} mensajes`;
    const rankStr = rankIdx >= 0 ? ` — puesto #${rankIdx + 1}` : '';
    // Y a cuanto esta del de arriba, que es lo que de verdad quiere saber
    // quien pregunta por alguien.
    const arriba = rankIdx > 0 ? sorted[rankIdx - 1] : null;
    const huecoStr = arriba ? `\n_A ${msgsTxt(arriba.count - count)} del puesto #${rankIdx}._` : '';
    return sock.sendMessage(jid, {
      text: `@${phone} tiene *${msgs}* en este grupo${rankStr}.` + huecoStr + await pieDeReset(jid),
      mentions: [mentioned],
    }, { quoted: msg });
  }

  // !count — top 10 ranking
  const users = rankedUsers(await getActiveUsers(jid, 1), groupMeta);
  if (!users.length) {
    return sock.sendMessage(jid, { text: 'Aun no hay mensajes contados en este grupo.' }, { quoted: msg });
  }

  const top = users.slice(0, 10);
  const mentions = top.map(u => u.jid);
  let text = `*RANKING DE ACTIVIDAD*\n\n`;

  top.forEach((u, i) => {
    const phone = u.jid.split('@')[0];
    const msgs = u.count === 1 ? '1 mensaje' : `${u.count} mensajes`;
    const pos = `*${i + 1}.*`; // numeración clara y consistente del 1 al 10

    if (i < 3) {
      const admin = isAdmin(groupMeta?.participants, u.jid);
      // El hueco: el primero contra el segundo; el resto, contra el de arriba.
      const ref = i === 0 ? top[1] : top[i - 1];
      const gap = ref ? Math.abs(ref.count - u.count) : 0;
      const phrase = ref
        ? fraseDelPodio(jid, i, admin, gap, i === 0 ? u.count : ref.count)
        : pickFresh(admin ? ADMIN_PHRASES[i] : MEMBER_PHRASES[i], `${jid}|count|${i}|${admin ? 'a' : 'm'}`);
      const linea = !ref ? ''
        : i === 0 ? `_Le saca ${msgsTxt(gap)} al segundo._\n`
        : `_A ${msgsTxt(gap)} del ${i === 1 ? 'primero' : 'segundo'}._\n`;
      text += `${pos} *@${phone}* — ${msgs}\n`;
      text += `${phrase}\n${linea}\n`;
    } else {
      text += `${pos} @${phone} — ${msgs}\n`;
    }
  });

  await sock.sendMessage(jid, { text: text.trimEnd() + await pieDeReset(jid), mentions }, { quoted: msg });
}

// !resetcount — owner only: clears message ranking for this group
async function cmdResetCount(sock, msg, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);

  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: avisoPermiso(jid, sender, groupMeta) }, { quoted: msg });
  }

  // En privado no hay grupo que resetear, así que se borra todo. Antes se
  // llamaba a resetCounts(null), que lanza a propósito para que un null
  // accidental no arrase con los datos: el owner recibía un error interno y el
  // mensaje de "reseteo global" era inalcanzable.
  const scope = jid.endsWith('@g.us') ? jid : null;
  if (scope) await resetCounts(scope);
  else await resetAllCounts();
  await sock.sendMessage(jid, {
    text: scope
      ? 'Contador de mensajes de este grupo reseteado.'
      : 'Contador de mensajes global reseteado (todos los grupos).',
  }, { quoted: msg });
}

module.exports = { cmdCount, cmdResetCount, MEMBER_PHRASES, ADMIN_PHRASES, DISTANCIA, estaCerca, fechaCorta, rankedUsers };
