const { getActiveUsers, resetCounts, resetAllCounts, getLastReset } = require('../utils/messageCounter');
const { isOwner, isMainOwner, isAdmin, isGroupAdmin, getSender, getTarget, sameUser, soloMiembros } = require('../utils/wa');
const { pickFresh } = require('../utils/helpers');
const { cobrar, textoSinSaldo } = require('../utils/auraCobro');
const { SOLO_ADMINS, SOLO_GRUPOS } = require('../data/avisos');
const { aviso, avisoPermiso } = require('../utils/helpers');

let MEMBER_PHRASES = [
  [
    'Tu pulgar tiene más horas de trabajo que tú en toda tu vida.',
    'Primero del grupo, y tu batería no llega a la hora de comer.',
    'Tu tiempo de pantalla de esta semana ya es una jornada completa, y sin cotizar.',
    'Escribes más que nadie aquí. Fuera de este grupo no te contesta ni tu madre.',
    'Los demás tienen vida y tú tienes el récord. Ya elegiste.',
    'Has escrito más mensajes aquí que palabras le has dicho a tu familia este año.',
    'Lo sabe el grupo, lo sabe tu operador y lo sabe tu jefe, que te paga por esto sin saberlo.',
    'El grupo lo sostienes tú, y a ti no te sostiene nadie.',
    'Primer puesto. Si mañana te callas, esto se convierte en un cementerio con notificaciones.',
    'Te duchas con el móvil en el lavabo por si te pierdes algo.',
    'Ganas el ranking. Lo que pierdes no sale aquí: el sol, el sueño y la vergüenza.',
    'Primero, con diferencia, y el cuello ya se te ha quedado con la forma del móvil.',
    'Se te ha olvidado hablar en persona, pero aquí no hay quien te calle.',
    'Tienes tendinitis en el pulgar y la llamas constancia.',
    'Mientras otros prometen volver, tú no te has ido. Ni a dormir.',
    'Te sabes la vida de todo el grupo y nadie sabe a qué te dedicas. Ahora sí: a esto.',
    'Los fantasmas deberían pagarte una cuota por mantenerles el grupo vivo.',
    'El trono es tuyo, y la silla también: no te levantas de ella desde marzo.',
    'Contestas aquí antes que en el trabajo, y en el trabajo ya se han dado cuenta.',
    'Tu récord de mensajes y tus días sin pisar la calle van a la par.',
    'Los demás tienen una vida que les roba tiempo. Tú lo arreglaste por las bravas: no la tienes.',
    'Quien te quiera quitar el puesto va a tener que dejar de ducharse, como tú.',
    'El móvil se te calienta más que cualquier conversación que hayas tenido en persona.',
    'A las cuatro de la mañana aquí solo escribe una persona, y tiene tus ojeras.',
    'Si esto pagara en dinero, podrías dejar de trabajar. Tampoco es que lo hagas.',
    'Quien quiera salir contigo va a competir con este grupo, y va a perder.',
    'Primero del grupo. En tu lápida pondrá «escribiendo…».',
    'Has hecho del grupo tu casa, y se nota en cómo tienes la otra.',
    'Aquí no se sube hablando bonito: se sube no teniendo nada mejor que hacer, y tú no tienes nada.',
    'El bot te cuenta los mensajes, y tu madre, los días que no la llamas.',
  ],
  [
    'Segundo. Ni para no tener vida eres el mejor.',
    'Plata en el concurso de quién vive más pegado al móvil. Perder hasta en esto tiene mérito.',
    'Te has dejado la vista en la pantalla para quedar segundo, que es quedar detrás.',
    'Plata, que es la forma educada de decir que has perdido contra uno.',
    'Segundo lugar. Al lado del trono y sin poder sentarte, como siempre en tu puta vida.',
    'Escribes a todas horas y hay alguien que te gana. Ni en la adicción destacas.',
    'Si el primero se fuera del grupo, el trono sería tuyo. Reza, que escribir no te ha funcionado.',
    'Segundo. Que en el mundo real, para ti, se traduce como: no.',
    'Le miras la nuca al primero todos los días. Es lo único que ves del trono.',
    'Alguien va por delante y no eres tú. Otra vez, como en el colegio, como en el trabajo, como en todo.',
    'Te pasas el día con el móvil y te gana alguien que, encima, trabaja.',
    'Número dos. Nadie se acuerda del segundo, y en la foto sales cortado.',
    'Segundo. Y segundo no te vale una mierda en ningún ranking del mundo, tampoco en este.',
    'Si te pagaran por mensaje, cobrarías menos que el primero. Como en todos tus trabajos.',
    'Segundo lugar y sin excusas: has tenido el mismo tiempo que el primero y lo has usado peor.',
    'Has quemado una batería entera hoy para quedarte en plata.',
    'Llevas el móvil al baño y sales segundo. Hasta cagando te ganan.',
    'Segundo puesto: el que se queda con las ganas y con el cuello torcido de mirar arriba.',
    'Plata. Tienes los mensajes de un enfermo y la medalla de un aficionado.',
    'Número dos. Sostienes el grupo a medias, y la foto se la lleva el de arriba.',
    'Segundo. Te queda un puesto, y es el único que importa.',
    'Plata, y bien ganada. El oro lo tiene alguien que no duerme.',
    'En otro grupo igual ibas primero. Aquí llegas tarde a todo, hasta al primer puesto.',
    'Te jode no estar más arriba, y se nota en cómo escribes: con rabia y en segundo lugar.',
    'Plata. El primero escribe porque le sale; tú, para alcanzarle, y no le alcanzas.',
    'Segundo del grupo. Ni el oro ni el olvido: el sitio donde más se sufre.',
    'Número dos. Ni primero ni tercero: el sitio incómodo, y hoy te toca a ti.',
    'Plata. Pierdes contra alguien que tampoco tiene vida. Imagínate la tuya.',
    'Estás arriba, pero no en lo alto. Y aquí esa diferencia es todo lo que importa.',
    'Segundo lugar. Nadie duda de que estás, pero todos dudan de que puedas subir más.',
  ],
  [
    'Bronce. Suena a premio hasta que recuerdas que solo significa que dos te ganaron.',
    'Tercero. Demasiado visible para esconderte y muy poca cosa para mandar.',
    'Bronce. Lo justo para que alguien se acuerde de ti, y por poco.',
    'Escribes como si te persiguieran y llegas en tercer lugar, que es como no llegar.',
    'Tercero. La gente te reconoce y nadie te teme: eres mobiliario con notificaciones.',
    'En un grupo de dos irías segundo. Aquí cierras la fiesta.',
    'Bronce. Estás aquí porque el cuarto es aún peor que tú, y eso no es mérito tuyo.',
    'Ni protagonista ni extra: secundario con frase, y la frase es mala.',
    'Bronce. Que estés aquí no es casualidad, pero que no subas tampoco.',
    'Tercer puesto. El podio te queda grande y el cuarto puesto pequeño: justo donde te toca.',
    'La medalla más barata del podio. Agárrala, que no vas a ver otra.',
    'Hay dos con menos vida que tú, y te ganan. Piensa en eso un rato.',
    'Tercer puesto del ranking. Los fantasmas te miran desde el sótano sin entender cómo se sube.',
    'En la foto del podio, la esquina cortada eres tú.',
    'Te pasas el día escribiendo y en casa creen que trabajas. Ni aquí te va bien.',
    'Bronce. Tienes las ojeras del primero y la medalla del tercero.',
    'Tercero. Tu pulgar no da para más y tu vida tampoco.',
    'Tercera plaza. Algo haces bien, y es lo único: mirar el móvil.',
    'Has escrito más que casi todos y lo único que tienes es esta línea.',
    'Si te callas una semana, nadie se da cuenta hasta que el bot te baja del podio.',
    'Abajo hay un grupo entero que no te llega, y arriba dos que no te ven.',
    'Tercer escalón: el que pisa todo el mundo para subir.',
    'Ni mandas ni sobras. Haces bulto, pero con medalla.',
    'Tercero. Estás arriba y en mitad de la nada a la vez, que tiene su mérito.',
    'Bronce. Con un escalón más ya hablaríamos de ti; con uno menos, ni te nombraríamos.',
    'Escribes para que se te note, y se te nota lo justo para quedar tercero.',
    'Bronce, el metal que sale cuando no te llega para la plata. Te pega.',
    'Te conectas antes que tu despertador y aun así te ganan dos.',
    'Tercero en el ranking de un chat. Ponlo en el currículum, a ver qué pasa.',
    'Estás en el podio, en el escalón donde se sube a hacer la foto y a nada más.',
  ],
];

let ADMIN_PHRASES = [
  [
    'La corona y la placa en la misma cabeza. Este grupo tiene dictador, y encima lo eligió el marcador.',
    'Repartes normas y cumples la única que nadie puso: no soltar el móvil.',
    'Número uno con cargo. El grupo te tiene miedo y te tiene leído, y eso no hay quien lo gane.',
    'Si algún día te vas, este grupo se queda mudo y sin ley a la vez.',
    'No hace falta que recuerdes que mandas: el contador lo grita por ti.',
    'La placa y el trono. Si esto fuera un país, el gobierno serías tú, tú y otra vez tú.',
    'Moderas el grupo como quien vigila su casa: desde dentro y sin salir nunca.',
    'Primer puesto con placa. Mandas y además das ejemplo, que es lo que más jode a los de abajo.',
    'La placa te la dieron. El primer puesto te lo has ganado tú, a costa de tus horas de sueño.',
    'Echas a la gente por inactiva y tú no te has desconectado desde que te dieron el cargo.',
    'Tienes el botón de expulsar y el récord de mensajes. Lo segundo da más miedo.',
    'Hay admins que solo miran. Tú no paras, y eso también es un problema.',
    'Admin número uno. Si el grupo tuviera escudo, llevaría tu cara y tus ojeras.',
    'Mandas y lideras el ranking. Si te quitan la placa, sigues aquí igual. Ese es tu problema.',
    'Cuando hablas, se te escucha por las dos cosas. Cuando te callas no lo sabemos, porque no pasa.',
    'Admin en la cima. Otros mandan a gritos; tú mandas a mensajes, que es peor.',
    'El resto de admins te mira y piensa: así no, por favor.',
    'Admin y quien más escribe. Das miedo, y no del bueno.',
    'Tu poder cabe en un chat de móvil y lo ejerces a jornada completa.',
    'Quien diga que los admins no hacen nada, que mire esta línea. Luego que te mire las ojeras.',
    'Tu autoridad se mide en mensajes, y los tuyos ya no caben en la memoria del móvil.',
    'El grupo va a tu ritmo, y tu ritmo es el de alguien que no sale de casa.',
    'Primer puesto. Con cargo o sin él lo tendrías igual, que es lo que da rabia.',
    'Quien quiera tu sitio, que empiece a escribir hoy y que no pare hasta olvidarse de su familia. Como tú.',
    'Tienes poder sobre todo el grupo y ninguno sobre tu tiempo de pantalla.',
    'La placa te la quitan con un clic. El vicio no te lo quita ni un psiquiatra.',
    'Moderas desde el baño, desde la cama y desde la cola del súper. Admin de guardia sin sueldo.',
    'El grupo sabe a quién hacer caso, y tú no sabes cuándo soltar el móvil.',
    'Admin en lo alto. Tienes el grupo bajo control y la vida en modo avión.',
    'Lo que mandas aquí es lo único que mandas en tu vida.',
  ],
  [
    'Plata y placa. Te sobra autoridad y te falta un puesto, y eso no se arregla mandando.',
    'Plata con cargo. Nadie te discute la autoridad, pero el marcador te discute todo lo demás.',
    'Llevas placa y aun así alguien te pisa en el marcador. Cómo escuece.',
    'Segundo puesto y admin. El cargo no puntúa aquí, y se nota justo en este renglón.',
    'Tienes el botón para echar al primero y no lo usas. Es lo más digno que has hecho aquí.',
    'Admin número dos. Mandas sobre el grupo y obedeces al marcador.',
    'Tienes el poder de callar a cualquiera y aun así hablas menos que el de arriba.',
    'El cargo no te lo quita nadie. El puesto, cualquiera que te pille en un mal día.',
    'Admin en segunda posición. Mandas en todo y ganas en la mitad, como siempre.',
    'Mandas tú y escribe más otro. Un reparto raro que nadie se atreve a contarte.',
    'El grupo te respeta por la placa y te lee por costumbre. Ninguna de las dos cosas es cariño.',
    'Plata y cargo. Mandas desde atrás, como los cobardes con galones.',
    'Segundo en mensajes y primero en poder. Un empate que solo tú puedes romper, y no lo rompes.',
    'Escribes más que casi todos. Casi, que es la palabra de tu vida.',
    'La placa te la dieron. El oro lo tienes que ganar, y no te da.',
    'Das la cara, pero hay alguien que la da más y encima sin placa.',
    'Número dos con autoridad. Mandas a medias y escribes a medias. Lo tuyo es la mitad.',
    'Plata y cargo. Si el primero afloja, el trono va a tener placa. Si no, vas a tener rabia.',
    'Moderas escribiendo y no escondiéndote, y aun así no te llega.',
    'Te sobra aguante y te falta algo que no se consigue con placa.',
    'Mandar y aparecer a la vez cansa, y se te nota en que no te da para el oro.',
    'Quien va arriba te gana en mensajes, y tú le ganas en botones. Triste empate.',
    'La placa no te regala nada aquí, y llevas meses esperando que te regale algo.',
    'Si el grupo se tambalea, eres una de las piernas que lo sujetan. La coja.',
    'Plata, con cargo y con más mensajes que la mayoría de los que se quejan de los admins.',
    'A un puesto de ser imposible de discutir, y discutido igual.',
    'Admin número dos. El oro es de otro; la autoridad sigue siendo tuya, que es lo que te queda.',
    'Te ganas el respeto escribiendo, y el respeto no sale en el ranking.',
    'Segundo puesto con autoridad: te falta un puesto y te sobran ganas de echar al primero.',
    'Por encima de ti solo hay una persona, y el grupo lo ve cada vez que mandas algo.',
  ],
  [
    'Admin en el podio. Con placa y todo, dos personas te han pasado por delante.',
    'Tercer puesto siendo admin. La autoridad no puntúa en el marcador, y este es el resultado.',
    'Repartes normas desde la tercera fila. Se oyen, pero poco.',
    'Bronce con autoridad. Nadie te discute, pero tampoco te sigue nadie.',
    'Tercer puesto con placa. Un mal mes y te caes del podio siendo admin, menudo titular.',
    'Un admin en el podio queda bien, aunque sea en el escalón barato. El barato es el tuyo.',
    'Estás arriba y con cargo, y las dos cosas se pueden perder en una semana floja.',
    'Ni quien más manda ni quien más habla. Admin de relleno con medalla de relleno.',
    'Bronce y cargo. Suficiente para el podio, insuficiente para que alguien te haga caso.',
    'Mejor que la mayoría y peor que los dos que importan. Lo tuyo es quedarte a medias.',
    'Bronce con autoridad. Un escalón más y darías miedo. De momento das ternura.',
    'Admin y en el podio, que ya es más de lo que hace la mayoría de admins. Bajo, el listón.',
    'Moderas y además apareces. Lo segundo lo haces mejor que lo primero.',
    'Tienes la placa y el bronce, y ninguna de las dos cosas se recuerda.',
    'El grupo sabe que estás. Saber que mandas, eso ya le cuesta más.',
    'Tercer escalón con placa. Los dos de arriba te ganan sin botón de expulsar.',
    'Tercero, escribiendo, y con la placa a mano por si alguien se te ríe.',
    'Si te expulsaras a ti, el grupo tardaría un día en darse cuenta.',
    'Nadie puede decir que te escondes detrás del cargo. Se te ve perfectamente: en tercer lugar.',
    'Admin en bronce, con dos por delante que no necesitan placa para ganarte.',
    'Podio con placa. Tercer puesto y el respeto justo para que no te contesten con un sticker.',
    'Autoridad y presencia tienes. Lo que te falta es que alguien te tome en serio.',
    'Ni el cargo te sube ni te baja: te sube lo que escribes, y escribes para un bronce.',
    'Hay admins que ni saben dónde está el ranking. Tú lo miras cada hora, y aun así en tercer lugar.',
    'Bronce con placa. Estás arriba por méritos, no por el botón. Por pocos méritos.',
    'Tercer puesto y admin. El grupo te hace caso a veces, cuando no hay nada mejor.',
    'Moderar desde el podio no es moderar desde la grada, salvo en el tercer escalón, que es la grada.',
    'Si el grupo tuviera un consejo, tendrías silla. La plegable.',
    'Admin con actividad, que en este grupo es especie rara. Rara y tercera.',
    'El tercer puesto con cargo no te lo regala nadie. Y nadie te lo celebra.',
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
    'Segundo, a %G del número uno. Huele el oro, muñeca, que lo tienes ahí.',
    'Te quedan %G para pasar al primero. Una noche sin dormir y mañana mandas tú.',
    'Plata a %G del oro. Si no lo pasas es porque no te da la gana.',
    'Estás a %G del primero, y el primero ya no duerme por tu culpa.',
    'Vas segundo por %G. Un día bueno y le quitas el puesto, pequeña.',
    'Te separan %G del primero. Eso se escribe en una tarde de cotilleo.',
    'Estás a %G del oro. Si te quedas en plata es por pereza, y esa te la conocemos.',
    'Vas segundo, pisándole los talones al primero: %G y nada más.',
    'Tienes la plata, a %G. Como el primero se vaya de vacaciones, el trono es tuyo.',
  ],
  segundoLejos: [
    'Te tiene a %G el primero. Eso no lo recortas ni a base de audios.',
    'Plata, a %G del oro. Lo ves de lejos, como quien mira un yate desde la playa.',
    'Vas segundo, pero a %G del primero. Llegas tarde, como a todo.',
    'Te faltan %G para el primer puesto. Pide un café, que va para largo, princesa.',
    'Tienes la plata, a %G. Al primero ni le hace falta mirarte.',
    'Medalla de plata a %G del número uno. Pelea por el oro, ninguna, y tú lo sabes.',
    'A %G del primero. Para alcanzarle tendrías que escribir hasta en sueños.',
    'Te quedan %G por detrás del oro, y no lo ves ni con prismáticos, bobo.',
    'Estás a %G del primero, tirado en la plata, que es lo que te pega.',
    'Te sacan %G desde el primer puesto. Agárrate a la plata, que es lo que hay.',
  ],
  terceroCerca: [
    'Estás a %G del segundo. Un empujón y le quitas la plata, chiquitina.',
    'Tienes el bronce, a %G de la plata. Eso lo recuperas con un solo cotilleo.',
    'Te faltan %G para subir al segundo. Hoy mismo, si te pones.',
    'Tercero, a %G del de arriba. La plata la tienes a tiro de piedra.',
    'Te quedas a %G del segundo puesto. Si no lo pasas esta semana es por pura pereza.',
    'Bronce por los pelos: el de arriba te saca %G y nada más.',
    'Estás a %G de la plata. Escribe un poco más y el podio se reordena.',
    'Vas tercero, pisándole los talones al segundo: %G de diferencia.',
    'Te separan %G del segundo, y ya le estás oliendo la nuca.',
    'Te quedan %G para subir un escalón. Ponte las pilas, muñeca.',
  ],
  terceroLejos: [
    'Tercero, y a %G del segundo. Del podio tienes el escalón y poco más.',
    'Tienes el bronce a %G de la plata. El de arriba ni sabe que existes.',
    'Te faltan %G para el segundo. Hoy mismo, si te pones. No te vas a poner.',
    'A %G del segundo puesto. Para eso hace falta escribir, no mirar.',
    'Tercero con %G por detrás del segundo. Estás en el podio de milagro.',
    'Tienes el bronce, y la plata a %G. No la pillas ni corriendo, reina.',
    'Estás a %G del segundo. Eso no lo arreglas con dos memes y un audio.',
    'Vas tercero, a %G de la plata, y no parece que vayas a acortar.',
    'Te sacan %G desde el segundo. El bronce es tuyo; lo demás, de momento, no.',
    'Bronce a %G del de arriba. Te ha tocado el escalón barato del podio.',
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
