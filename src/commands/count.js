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
    'El primer puesto te ha costado la única persona que te aguantaba fuera de aquí.',
    'Has escrito más mensajes aquí que palabras le has dicho a tu familia este año.',
    'Lo sabe el grupo, lo sabe tu operador y lo sabe tu jefe, que te paga por esto sin saberlo.',
    'El grupo lo sostienes tú, y a ti no te sostiene nadie.',
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
    'El móvil se te calienta más que cualquier conversación que hayas tenido en persona.',
    'A las cuatro de la mañana aquí solo escribe una persona, y tiene tus ojeras.',
    'Si esto pagara en dinero, podrías dejar de trabajar. Tampoco es que lo hagas.',
    'Quien quiera salir contigo va a competir con este grupo, y va a perder.',
    'Primero del grupo. En tu lápida pondrá «escribiendo…».',
    'Has hecho del grupo tu casa, y se nota en cómo tienes la otra.',
    'Aquí no se sube con gracia, se sube no teniendo una puta mierda que hacer. Y tú no tienes ninguna.',
    'El bot te cuenta los mensajes, y tu madre, los días que no la llamas.',
  ],
  [
    'Segundo. Ni para no tener vida eres el mejor.',
    'Plata. Te han dado el segundo en lo único que haces, y perder hasta en esto tiene mérito.',
    'Te has dejado los ojos en la pantalla para acabar detrás. Vaya puta inversión.',
    'Plata, que es la forma educada de decir que has perdido contra uno.',
    'Segundo lugar. Al lado del trono y sin poder sentarte, como siempre en tu puta vida.',
    'Escribes a todas horas y hay alguien que te gana. Ni en la adicción destacas.',
    'Si el primero se fuera del grupo, el trono sería tuyo. Reza, que escribir no te ha funcionado.',
    'Segundo. Que en el mundo real, para ti, se traduce como: no.',
    'Le miras la nuca al primero todos los días. Es lo único que ves del trono.',
    'Alguien va por delante y no eres tú. Te pasa desde el colegio y aún te jode igual.',
    'Te pasas el día aquí metido y te gana alguien que, encima, trabaja.',
    'Número dos. Nadie se acuerda del segundo, y en la foto sales cortado.',
    'La plata no vale una mierda en ningún ranking, y la tuya encima te ha costado horas de vida.',
    'Si te pagaran por mensaje, cobrarías menos que el primero. Como en todos tus trabajos.',
    'Segundo lugar y sin excusas: has tenido el mismo tiempo que el primero y lo has usado peor.',
    'Has quemado una batería entera hoy para quedarte en plata.',
    'Llevas el móvil al baño y sales segundo. Hasta cagando te ganan.',
    'Segundo puesto: el que se queda con las ganas y con el cuello torcido de mirar arriba.',
    'Plata. Tienes los mensajes de un enfermo y la medalla de un aficionado.',
    'Número dos. Sostienes el grupo a medias, y la foto se la lleva el de arriba.',
    'Te falta un puesto, el único que cuenta. Los demás son para hacer bulto, como tú.',
    'Plata, y bien ganada. El oro lo tiene alguien que no duerme.',
    'En otro grupo igual ibas primero. Aquí llegas tarde a todo, hasta al primer puesto.',
    'Te jode no estar más arriba, y se nota en cómo escribes: con rabia y en segundo lugar.',
    'Quien va primero escribe porque le sale del coño. Tú escribes para alcanzarle y no llegas.',
    'Ni oro ni olvido. El puesto que más escuece, y te lo has currado a pulso.',
    'Entras al chat y quien va primero ya ha dicho todo lo que ibas a decir tú, y mejor.',
    'Plata. Pierdes contra alguien que tampoco tiene vida. Imagínate la tuya.',
    'Desde la plata se le ve el culo a quien va primero, y nada más.',
    'Todo el grupo sabe que estás ahí. Nadie se jugaría un puto euro a que subes.',
  ],
  [
    'Bronce. Suena a premio hasta que recuerdas que solo significa que dos te ganaron.',
    'Tercero. Demasiado visible para esconderte y muy poca cosa para mandar.',
    'Bronce. Lo justo para que se acuerden de tu nombre, y lo escriben mal.',
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
    'Tercero. Te vas a mear y al volver ya te ha pasado el pringado de abajo.',
    'Dices algo y el chat le contesta a quien va primero. Lo tuyo se queda en visto, como siempre.',
    'Escribes para que se te note, y se te nota lo justo para quedar tercero.',
    'Bronce, lo que te dan cuando no te llega para la plata. Te sienta de puta madre.',
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
    'Hay admins que solo miran. Tú escribes tanto que medio grupo te tiene silenciado y sigues sin enterarte.',
    'Admin número uno. Si el grupo tuviera escudo, llevaría tu cara y tus ojeras.',
    'Mandas y lideras el ranking. Si te quitan la placa, sigues aquí igual. Ese es tu problema.',
    'Cuando hablas, se te escucha por las dos cosas. Cuando te callas no lo sabemos, porque no pasa.',
    'Admin en la cima. Otros mandan a gritos; tú mandas a mensajes, que es peor.',
    'El resto de admins te mira y piensa: así no, por favor.',
    'Admin y quien más escribe. Das miedo, y no del bueno.',
    'Tu poder cabe en este grupo de mierda y lo ejerces a jornada completa.',
    'Quien diga que los admins no hacen nada, que mire esta línea. Luego que te mire las ojeras.',
    'Tu autoridad se mide en mensajes, y los tuyos ya no caben en la memoria del móvil.',
    'El grupo va a tu ritmo, y tu ritmo es el de alguien que no sale de casa.',
    'Primer puesto. Con cargo o sin él lo tendrías igual, que es lo que da rabia.',
    'Quien quiera tu sitio, que empiece a escribir hoy y que no pare hasta olvidarse de su familia. Como tú.',
    'Tienes poder sobre todo el grupo y ninguno sobre tu tiempo de pantalla.',
    'La placa te la quitan con un clic. El vicio no te lo quita ni un psiquiatra.',
    'Moderas desde el baño, desde la cama y desde la cola del súper. Admin de guardia sin sueldo.',
    'El grupo sabe a quién hacer caso, y tú no sabes ni salir a comprar el pan.',
    'Admin en lo alto. Tienes el grupo bajo control y la vida en modo avión.',
    'Lo que mandas aquí es lo único que mandas en tu vida.',
  ],
  [
    'Te gana alguien sin placa ni nada. Tanto cargo para que te pise un don nadie.',
    'Nadie te discute la autoridad. El marcador sí, y te deja en plata como a cualquier pringado.',
    'Borras el mensaje de cualquiera de un toque y el puto segundo puesto no hay quien te lo borre.',
    'El panel de admin te obedece y el ranking se caga en tu placa.',
    'Tienes el botón para echar al primero y no lo usas. Es lo más digno que has hecho aquí.',
    'Admin número dos. Mandas sobre el grupo y obedeces al marcador.',
    'Puedes callar a cualquiera y quien menos habla eres tú. Para eso no hacía falta placa.',
    'El cargo no te lo quita nadie. El puesto, cualquiera que te pille en un mal día.',
    'Das una orden y quien va primero dice lo contrario. Adivina a quién le hace caso el puto grupo.',
    'Mandas tú y escribe más otro. Un reparto raro que nadie se atreve a contarte.',
    'Te respetan por la placa y te leen por costumbre. Quítale las dos y no te contesta ni Dios.',
    'Plata y cargo. Mandas desde atrás, como los cobardes con galones.',
    'Mandas más que nadie y aun así hay alguien que escribe más que tú. Menudo poder de mierda.',
    'Escribes más que casi todos. Casi, que es la palabra de tu vida.',
    'La placa te la regalaron. El oro hay que ganárselo, y ahí ya no te da la puta vida.',
    'Abres la boca para poner orden y quien va primero ya ha cerrado el tema. Llegas tarde hasta mandando.',
    'Mandas a medias y escribes a medias. Hasta de admin te quedas en la puta mitad.',
    'Esperas a que quien va primero se canse para heredarle el oro. Buitre con placa.',
    'Moderas dando la cara y aun así hay alguien un renglón por encima, pasándose tu placa por el forro.',
    'Haces de canguro del grupo gratis y el oro se lo lleva quien no limpia ni su mierda.',
    'Mientras tú limpias el chat, quien va primero lo llena. Por eso te pasa por encima.',
    'Quien va arriba te gana en mensajes, y tú le ganas en botones. Triste empate.',
    'Llevas meses esperando que la placa escriba por ti, y la placa tiene la misma pereza que tú.',
    'Si el grupo se tambalea, eres una de las piernas que lo sujetan. La coja.',
    'Plata, con cargo y con más mensajes que la mayoría de los que se quejan de los admins.',
    'Pones una orden y te contestan con un «jaja». Ese es el respeto que da la plata.',
    'Cierras el ranking de mala hostia y vuelves a moderar, que es lo único donde nadie te gana.',
    'Te dan la razón como a los locos y luego te adelantan en el ranking.',
    'Te sabes cuántos mensajes te saca quien va primero. Y aun así no escribes ni uno más.',
    'Por encima de ti solo hay una persona, y el grupo lo ve cada vez que mandas algo.',
  ],
  [
    'Tienes la placa de admin y aun así dos pringados sin cargo te han pasado por delante.',
    'Tercer puesto siendo admin. Creías que la placa sumaba mensajes, pringado, y no suma una mierda.',
    'Repartes normas desde la tercera fila. Se oyen, pero poco.',
    'Bronce con placa. El grupo te suelta el emoji del pulgar y se vuelve al hilo de los de arriba.',
    'Tercer puesto con placa. Un mal mes y te caes del podio siendo admin, menudo titular.',
    'Un admin en el podio queda bien, aunque sea en el escalón barato. El barato es el tuyo.',
    'Podio y cargo, y los pierdes en cuanto pases una semana follando. O sea, nunca.',
    'Ni quien más manda ni quien más habla. Admin de relleno con medalla de relleno.',
    'Bronce y placa. Levantas la voz y alguien pide que hable uno de los dos de arriba.',
    'Mejor que la mayoría y peor que los dos de arriba. A medias, como tus polvos.',
    'Bronce con autoridad. Un escalón más y darías miedo. De momento das ternura.',
    'Admin y en el podio, que ya es más de lo que hace la mayoría de admins. Bajo, el listón.',
    'Moderas y además apareces. Lo segundo lo haces mejor que lo primero.',
    'Tienes la placa y el bronce, y cuando alguien pregunta quién es admin aquí, nadie dice tu nombre.',
    'El grupo sabe que estás. Saber que mandas, eso ya le cuesta más.',
    'Tercer escalón con placa. Los dos de arriba te ganan sin botón de expulsar.',
    'Tercero, escribiendo, y con la placa a mano por si alguien se te ríe.',
    'Si te expulsaras a ti, el grupo tardaría un día en darse cuenta.',
    'Nadie puede decir que te escondes detrás del cargo. Se te ve perfectamente: en tercer lugar.',
    'Admin en bronce, con dos por delante que no necesitan placa para ganarte.',
    'Podio con placa. Tercer puesto y el respeto justo para que no te contesten con un sticker.',
    'Autoridad y presencia tienes. Te falta que alguien lea tus avisos sin descojonarse.',
    'Ni el cargo te sube ni te baja: te sube lo que escribes, y escribes para un bronce.',
    'Hay admins que ni saben dónde está el ranking. Tú lo miras cada hora, y aun así en tercer lugar.',
    'Bronce con placa. Estás arriba por méritos, no por el botón. Por pocos méritos.',
    'Tercer puesto con placa. Te hacen caso cuando los dos de arriba no están, y se van en cuanto vuelven.',
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
    'Segundo, a %G del número uno. Huele el oro, que lo tienes ahí.',
    'Te quedan %G para pasar al primero. Una noche sin dormir y mañana mandas tú.',
    'Plata a %G del oro. Si no lo pasas es porque no te sale del coño.',
    'Estás a %G del primero, y el primero ya no duerme por tu culpa.',
    'Vas segundo por %G. Un día bueno y le quitas el puesto.',
    'Te separan %G del primero. Eso se escribe en una tarde de cotilleo.',
    'A %G del oro. Si te quedas en plata es por pereza, y esa te la conocemos.',
    'Vas segundo, pisándole los talones al primero: %G y nada más.',
    'Tienes la plata, a %G. Como el primero se vaya de vacaciones, el trono es tuyo.',
  ],
  segundoLejos: [
    'Te tiene a %G el primero. Eso no lo recortas ni a base de audios.',
    'Plata, a %G del oro. Lo ves de lejos, como quien mira un yate desde la playa.',
    'Segundo puesto, pero a %G del primero. Llegas tarde, como a todo.',
    'Te faltan %G para el primer puesto. Pide un café, que va para largo.',
    'Tienes la plata, a %G. Al primero ni le hace falta mirarte.',
    'Medalla de plata a %G del número uno. Pelea por el oro, ninguna, y tú lo sabes.',
    'A %G del primero. Para alcanzarle tendrías que escribir hasta en sueños.',
    'Te quedan %G por detrás del oro, y no lo ves ni con prismáticos, bobo.',
    'Estás a %G del primero, tirado en la plata, que es lo que te pega.',
    'Te sacan %G desde el primer puesto. Agárrate a la plata, que es lo que hay.',
  ],
  terceroCerca: [
    'Estás a %G del segundo. Un empujón y le quitas la plata.',
    'Tienes el bronce, a %G de la plata. Eso lo recuperas con un solo cotilleo.',
    'Te faltan %G para el segundo y te conformas con el bronce. Ambición de mierda.',
    'Tercero, a %G del de arriba. La plata la tienes a tiro de piedra.',
    'Te quedas a %G del segundo puesto. Si no lo pasas esta semana es por puta pereza.',
    'Bronce por los pelos: el de arriba te saca %G y nada más.',
    'Estás a %G de la plata y quien va delante ni sabe que existes.',
    'Vas tercero, pisándole los talones al segundo: %G de diferencia.',
    'Te separan %G del segundo, y ya le estás oliendo la nuca.',
    'Te quedan %G para la plata y ni así te mueves del puto bronce.',
  ],
  terceroLejos: [
    'Tercero, y a %G del segundo. Del podio tienes el escalón y poco más.',
    'Tienes el bronce a %G de la plata. El de arriba ni sabe que existes.',
    'Te faltan %G para el segundo. Hoy mismo, si te pones. No te vas a poner.',
    'A %G del segundo. Te pasas el día leyendo el grupo y escribiendo una mierda.',
    'Tercero con %G por detrás del segundo. Estás en el podio de milagro.',
    'Tienes el bronce, y la plata a %G. No la pillas ni corriendo.',
    'Estás a %G del segundo. Eso no lo arreglas con dos memes y un audio.',
    'Vas tercero, a %G de la plata, y antes te pilla el cuarto que tú al segundo.',
    'Te sacan %G desde el segundo. El bronce es tuyo y la plata no la hueles ni de coña.',
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
