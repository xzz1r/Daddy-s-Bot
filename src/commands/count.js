const { getActiveUsers, resetCounts, resetAllCounts, getLastReset } = require('../utils/messageCounter');
const { isOwner, isMainOwner, isAdmin, isGroupAdmin, getSender, getTarget, sameUser, soloMiembros } = require('../utils/wa');
const { pickFresh } = require('../utils/helpers');
const { cobrar, textoSinSaldo } = require('../utils/auraCobro');
const { SOLO_ADMINS, SOLO_GRUPOS } = require('../data/avisos');
const { aviso, avisoPermiso } = require('../utils/helpers');

let MEMBER_PHRASES = [
  [
    'Escribes y el grupo se despierta. Eso no lo da el tiempo libre, lo da una puta gracia que no se aprende.',
    'Primero porque cuando hablas tú, contesta todo el mundo. Carisma a espuertas.',
    'Aquí se viene a leerte a ti. El resto pone los stickers.',
    'Si mañana te callas, esto es un puto cementerio con notificaciones. El grupo respira por ti.',
    'Eres el motivo por el que la gente abre el chat. Los demás son el motivo por el que lo cierra.',
    'Tienes el don de que hasta tus tonterías se lean enteras. Primero, y con todo el puto mérito.',
    'Llegas y la conversación sube de nivel. Las ojeras son el precio, y te quedan de puta madre.',
    'Cualquier tema que tocas se convierte en el tema. Eso no se gana escribiendo mucho, se gana siendo tú.',
    'El grupo lo sostienes tú, y con una gracia que ya quisieran los de abajo.',
    'Primero. Medio grupo te lee con las mismas ganas con las que se ve una serie.',
    'Hay quien escribe mucho y hay a quien se lee. Tú eres las dos cosas, y eso jode a todo el ranking.',
    'Tú pones el ritmo y el grupo lo sigue. Los demás llegan tarde a cada tema.',
    'Te mandan audios para que opines y te citan para darte la razón. El trono te lo dan ellos.',
    'Sin ti esto es un grupo de avisos. Contigo es el mejor puto sitio del móvil.',
    'Primero, y no por pesadez: la gente te busca. Eso no lo consigue cualquiera con un pulgar.',
    'Pones un «buenos días» y te contestan veinte. A otros no les contestan ni un audio de diez minutos.',
    'Escribes como quien tiene la sala en el bolsillo, y la tienes.',
    'El primer puesto se gana a base de horas. Tú lo has ganado a base de gracia, y las horas te han sobrado.',
    'Entras tú, sueltas dos tonterías y el chat se enciende. Eso es carisma de cojones.',
    'Lo que cuentas tú acaba repitiéndose en otros grupos. Eres la fuente, y lo sabe todo el mundo.',
    'Medio grupo escribe para ver si le contestas tú. Primero, y con séquito.',
    'Tienes ese puto imán: hablas y aparecen todos.',
    'Las mejores conversaciones de la semana las empezaste tú. Las malas también, pero esas las salvaste.',
    'Primero del grupo. Los demás ponen mensajes, tú pones el ambiente.',
    'Si este grupo tuviera cara, serías tú, ojeras incluidas.',
    'Nadie te gana a mensajes y nadie te gana a gracia. Lo segundo es lo que de verdad jode.',
    'Una tarde sin escribir y el grupo pregunta si te ha pasado algo. Eso es ser imprescindible.',
    'Tú conviertes un «jaja» en tres horas de conversación. Un puto don.',
    'Te leen hasta los que juran que no te leen. Ese primer puesto es carisma puro.',
    'Hablas y el resto se calla a escuchar. En un grupo de WhatsApp eso es un puto milagro.',
  ],
  [
    'Segundo, y la gracia del podio la pones tú. El marcador cuenta mensajes, no lo que se ríe la gente contigo.',
    'Plata. El primero escribe más, pero las risas del grupo llevan tu firma.',
    'Medio grupo te prefiere antes que al de arriba. Lo que pasa es que el de arriba no duerme.',
    'Segundo puesto, y la mitad de las mejores frases de la semana las has puesto tú.',
    'Cuando hablas, el chat se para a leerte. El segundo puesto se te queda corto de cojones.',
    'Tienes la plata y un carisma de oro. El ranking es un poco gilipoyas, no te lo tomes a mal.',
    'Segundo. Escribes menos que el primero y se te contesta igual, que es lo que de verdad cuenta.',
    'Plata con estilo: no te hace falta inundar el chat para que se note que estás.',
    'El primero llena el grupo. Tú lo haces gracioso. Elige cuál de las dos cosas vale más.',
    'Segundo lugar, y medio grupo te prefiere. Eso no sale en el marcador, pero sale en las respuestas.',
    'Tus mensajes se citan más que los del primero. Plata en el ranking, oro en las capturas.',
    'Cada mensaje que mandas tú vale por tres de los de abajo.',
    'Hay quien sube a base de pesadez. Tú has subido a base de que te quieran leer.',
    'Segundo del grupo, y cuando tardas en contestar, alguien pregunta por ti.',
    'Plata. Tienes la chispa que le falta a medio grupo y te sobra para repartir.',
    'El de arriba gana en cantidad. Tú, en que la gente se descojona contigo.',
    'Segundo puesto con fans. Hay gente que abre el chat solo para ver qué has dicho tú.',
    'Escribes algo menos que el primero y tú caes el doble de bien. Plata de puta madre.',
    'Tu plata brilla más que muchos oros de otros grupos.',
    'Segundo. Tienes la gracia de quien no necesita ganar para ser de quien más se habla.',
    'Cuando arrancas un tema, el primero se apunta. Quien manda en la conversación eres tú.',
    'Tienes un carisma que no cabe en la plata. El marcador no sabe medir eso.',
    'Segundo, y el grupo lo sabe: sin tus mensajes esto sería la mitad de divertido.',
    'No tienes el oro porque no te hace falta. Con la plata ya te tienen ganado.',
    'Segundo puesto y ni un mensaje de relleno: te leen todo lo que escribes.',
    'Plata, y la gente te contesta antes que al de arriba. Eso es lo que no sale en la tabla.',
    'Segundo lugar. Te faltan mensajes, y gracia te sobra a montones.',
    'El segundo puesto lo da escribir. El cariño del grupo lo da cómo escribes, y de eso vas sobrado.',
    'Cuando sueltas tú una de las tuyas, el chat se queda una hora comentándola.',
    'Plata, y bien puesta: te has hecho un hueco en este grupo a base de ser la hostia.',
  ],
  [
    'Tienes el bronce, y una gracia que no cabe en el tercer escalón.',
    'Tercero. No escribes más que nadie, pero cuando escribes se nota que has llegado.',
    'Podio. Cada mensaje que mandas tú pesa más que diez de los de abajo.',
    'Bronce con calidad: tú pones poco relleno y mucho que leer.',
    'Tercero del grupo, y medio chat se ríe contigo. Eso vale más que la medalla.',
    'Estás en el podio porque te leen, y no porque des el coñazo.',
    'Tercer puesto, y cada vez que apareces tú el grupo se anima. Carisma del bueno.',
    'Bronce. Cuando hablas, la gente para a leerte, y eso no lo consigue cualquiera.',
    'Tercero, y sin ti el podio sería un aburrimiento de cojones.',
    'Te has metido en el podio con gracia, que es la forma más difícil de subir.',
    'Bronce. Pocas frases tuyas se quedan sin respuesta.',
    'Tercero en mensajes y de los primeros en hacer reír. El marcador mide mal.',
    'Podio, y en tu escalón se lo pasa mejor la gente que en los dos de arriba.',
    'Tercer puesto. Tienes el don de entrar a una conversación muerta y resucitarla.',
    'Bronce bien ganado: cuando escribes, el chat sube un punto.',
    'Tercero, y la gente te cita, te contesta y te busca. Lo de arriba es cuestión de horas.',
    'Bronce. Tienes más tirón con veinte mensajes que otros con doscientos.',
    'Estás en el podio y se nota: sin ti, la mitad de los temas no arrancan.',
    'Tercero con estilo. Haces menos ruido que nadie y más gracia que casi todos.',
    'Bronce. Tus audios se escuchan enteros, y aquí eso es un puto honor.',
    'Tercer escalón, y medio grupo te prefiere a los de arriba. Las medallas no lo cuentan todo.',
    'Podio, y te lo has ganado siendo de lo más divertido que hay en este chat.',
    'Tercero. Los dos de arriba escriben más, y de lo tuyo se acuerda más gente.',
    'Bronce. Con el carisma que tienes, el podio se te queda pequeño.',
    'Tercero del grupo, y cada vez que entras alguien escribe «ya estabas tardando». Eso es querer.',
    'Bronce. Tienes la gracia de quien no necesita ganar para caer de puta madre.',
    'En el podio por méritos: aquí nadie se cansa de leerte.',
    'Tercer puesto, y con una chispa que ya quisieran los de arriba.',
    'Bronce. El grupo sería más soso sin ti, y lo sabe todo el mundo.',
    'Tercero, y ese bronce se ha escrito con risas, no con horas muertas.',
  ],
];

let ADMIN_PHRASES = [
  [
    'La placa y el trono. Mandas y encima eres quien más gracia tiene. Eso no es justo para el resto.',
    'Admin y primero. Te hacen caso por el cargo y te leen por el carisma, y lo segundo es lo que manda.',
    'Primer puesto con placa. El grupo gira a tu alrededor y no hace falta que pongas orden: te siguen.',
    'Si algún día te vas, este grupo se queda mudo y sin ley a la vez.',
    'La placa te la dieron. El primer puesto te lo ha dado el grupo, que no para de contestarte.',
    'Mandas tú y encima das ejemplo, que es lo que más jode a los de abajo.',
    'Admin número uno. Si el grupo tuviera escudo, llevaría tu cara.',
    'Cuando hablas, se te escucha por las dos cosas: por la placa y porque eres la hostia.',
    'Tienes el botón de expulsar y casi nunca te hace falta. Con tu gracia, la gente se porta sola.',
    'Tú mandas a base de carisma, que es como se manda de verdad.',
    'El grupo va a tu ritmo, y tu ritmo es de puta madre.',
    'Con cargo o sin él, ese primer puesto sería tuyo igual, y eso es lo que da rabia.',
    'Quien diga que los admins no hacen nada, que te mire a ti y se calle la puta boca.',
    'Tu autoridad se mide en mensajes, y en eso no te gana nadie.',
    'Admin y el alma del grupo. La placa es un detalle: te seguirían igual sin ella.',
    'Los demás admins te miran y toman apuntes.',
    'Mandas y encima te quieren. Aquí eso no lo ha conseguido nadie más.',
    'Pones orden con una frase y te ríes con la siguiente, y el chat te sigue en las dos.',
    'Tienes la placa y el carisma a la vez. El grupo ha tenido una puta suerte contigo.',
    'Admin de guardia y primero del ranking. Este grupo existe porque tú no lo sueltas.',
    'Te hacen caso a la primera, que con este grupo es una hazaña de cojones.',
    'Admin en la cima. Hablas y se acaba la discusión, porque tienes razón y además gracia.',
    'Nadie escribe más que tú y nadie modera mejor. Si quieres corona, pídela, que te la dan.',
    'Hasta los que expulsas te echan de menos. Primero con placa, y con motivo.',
    'Tienes poder sobre todo el chat, y el chat encantado. Eso no lo consigue ni un político.',
    'Moderas sin que se note y animas sin que te lo pidan. Admin de verdad, y primero.',
    'El grupo sabe a quién hacer caso, y te lo hace a ti sin rechistar.',
    'Admin en lo alto. Tienes el grupo bajo control y encima te lo pasas bien con él.',
    'Lo que tú mandas se cumple y lo que tú escribes se celebra. Primero, joder, y con razón.',
    'Tienes la placa y el micrófono, y el grupo entero encantado de escucharte.',
  ],
  [
    'Tú mandas con una gracia que el de arriba no tiene ni de coña.',
    'Segundo y admin. El primero escribe más, pero cuando hay que poner orden, el grupo te mira a ti.',
    'Tienes el cargo, el respeto y la plata. Para el oro solo te falta no dormir.',
    'Admin número dos. Te hacen caso a la primera, y eso vale más que cien mensajes.',
    'Moderas con estilo y escribes con gracia, y eso el ranking no te lo sabe contar.',
    'El primero lleva la conversación. Tú llevas el grupo entero, que pesa bastante más.',
    'Cuando hablas tú, se acaba el cachondeo y nadie se queja. Segundo con placa.',
    'Admin y segundo. Te respetan por la placa y te quieren por cómo eres, que es lo difícil.',
    'Mandas sin gritar y te hacen caso igual. Plata en mensajes, oro en autoridad.',
    'Tienes la plata, y el grupo funciona porque tú lo sujetas, aunque el marcador no lo diga.',
    'Segundo, y quien manda de verdad aquí eres tú. El primero solo escribe más.',
    'Pones tú orden y el chat se endereza en dos mensajes. Admin en plata.',
    'Moderas y animas a la vez. Pocos admins saben hacer las dos cosas, y tú las haces de puta madre.',
    'Plata y placa. Hay admins que solo borran mensajes. Tú das motivos para leerlos.',
    'Segundo del ranking, y en cada discusión todos te quieren de su lado.',
    'Admin con gracia, cosa rara en este grupo. Plata, y porque quieres.',
    'Tu placa no la discute nadie, y tu carisma tampoco. El oro llegará cuando te dé la gana.',
    'Escribes algo menos que el primero y mandas tú mucho más. Plata con cargo.',
    'El grupo te hace caso sin que saques la placa. Eso es autoridad de la buena.',
    'Segundo puesto y el admin al que acude la gente. El ranking se queda corto contigo.',
    'Plata. Moderas sin dar la brasa, y la gente te lo agradece leyéndote.',
    'Admin y segundo. Si el primero es la voz del grupo, tú eres la cabeza.',
    'Pones una norma y se cumple, sueltas un chiste y se ríen. Plata de lujo.',
    'Segundo con placa. Tienes ese carisma que hace que hasta los expulsados te den la razón.',
    'Plata, y el grupo duerme tranquilo sabiendo que estás tú de guardia.',
    'Admin número dos, y más de uno te prefiere al de arriba. El cargo te lo dieron, el cariño te lo has ganado.',
    'Mandas y encima caes bien. Casi nunca van juntas, y en ti sí.',
    'Plata con placa. Te sobra autoridad y te sobra gracia, solo te faltan horas.',
    'Cuando tú cierras un tema, se queda cerrado, y nadie se mosquea.',
    'Si el grupo votara, el oro te lo llevabas tú. Admin en plata.',
  ],
  [
    'Escribes lo justo, y cada mensaje que mandas tú pone el grupo en su sitio.',
    'Tercero y admin. No te hace falta inundar el chat: con aparecer, la gente se porta.',
    'Tú estás en el podio con placa, que ya es más de lo que hace la mayoría de admins.',
    'Bronce y cargo. Moderas con mano izquierda y encima te ríes con todos.',
    'Cuando hablas tú, el grupo sabe que va en serio. Tercero con placa.',
    'Admin y bronce. Te leen con respeto y te contestan con cariño. Combinación de puta madre.',
    'Podio y cargo. Se nota que mandas y se nota que te lo pasas bien. Eso es saber llevar un grupo.',
    'Bronce con placa. Los dos de arriba escriben más, pero a quien escucha el grupo es a ti.',
    'Tercero, y con una autoridad que no necesita mensajes para notarse.',
    'Tú eres admin, escribes de verdad y estás en el podio. Aquí eso no lo consigue casi nadie.',
    'Moderas sin ruido y apareces con gracia. Contigo el grupo está en buenas manos.',
    'Tercer escalón con placa. Te hacen caso a la primera, que es lo que importa.',
    'Podio con placa. Tu presencia se nota hasta cuando no escribes.',
    'Bronce y admin. Pones paz en las broncas y luego eres quien más se ríe. Así da gusto.',
    'Tercero con cargo. Si el grupo tuviera consejo, tu voto valdría por dos.',
    'Cuando entras tú, entras para algo, y se agradece de cojones.',
    'Podio y placa. El grupo te respeta sin que tengas que recordarle quién manda.',
    'Das tú una opinión y medio grupo cambia la suya. Bronce con autoridad.',
    'Eres admin, vas tercero y caes mejor que nadie. Eso no se ve todos los días.',
    'Mandas tú poco y bien, que es como mejor se manda.',
    'Bronce. Cuando el grupo se descontrola, todos esperan a que aparezcas tú.',
    'Tienes carisma para dar y regalar, y lo usas para que esto funcione. Admin en el podio.',
    'Tercero con placa. Hay admins a los que se teme. A ti se te quiere, que dura más.',
    'Tú escribes con cabeza y moderas con gracia. Pocos admins saben hacerlo.',
    'Podio con placa. Tus avisos se leen y se cumplen, que en este grupo tiene un mérito de cojones.',
    'Tercero. Tienes la placa, el podio y la simpatía del grupo. El oro es lo de menos.',
    'Admin en bronce. El grupo sabe que estás, y con eso basta para que vaya bien.',
    'Moderas tú desde el podio, que es desde donde se ve todo.',
    'Tercero y admin. No necesitas levantar la voz: te leen igual.',
    'El tercer puesto con cargo no te lo regala nadie, y te lo has ganado con estilo.',
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
    'Vas primero por %G. Te lo pelean porque todo el mundo quiere tu sitio, y no es para menos.',
    'Arriba del todo, por %G. Tienes al segundo pegado, pero la gracia sigue siendo tuya.',
    'Lideras por %G. Te echas una tarde de las tuyas y el margen se dispara.',
    'Primero con %G de ventaja. Ajustado, pero el trono te sienta de puta madre.',
    'Vas arriba por %G, y cada uno de esos mensajes se ha leído entero.',
    'Primero por %G. Cuando te pongas en serio, al segundo no le quedan ni las migas.',
    'Tienes %G de margen en lo alto. Poco, pero tú con poco haces mucho.',
    'Número uno por %G. El segundo aprieta porque te tiene de ejemplo.',
    'Te llevas el oro por %G. Justo, y con todo el estilo del mundo.',
    'Primero por %G. Te persiguen porque eres a quien hay que ganar.',
  ],
  primeroHolgado: [
    'Le sacas %G al segundo. Este grupo es tuyo, y lo sabes tú y lo sabe todo el mundo.',
    'Vas primero con %G de ventaja. El resto se pelea por la plata mientras tú llevas el grupo.',
    'Número uno por %G. A esa distancia, el grupo ya lleva tu nombre.',
    'Le has metido %G al de abajo. Eso no se remonta ni con insomnio.',
    'Tienes el trono con %G de foso alrededor. Nadie te lo va a tocar.',
    'Te podrías callar un mes y seguirías primero por %G. Y el grupo te echaría de menos el primer día.',
    'Vas %G por delante del segundo. Llevas el grupo a cuestas, y lo llevas de puta madre.',
    'Número uno a %G del siguiente. Tú pones la fiesta y los demás vienen a mirar.',
    'Llevas %G de ventaja, y una así solo la saca quien es la hostia. O sea, tú.',
    'Primero con %G de colchón. Aquí mandas tú y todo el mundo lo tiene asumido.',
  ],
  segundoCerca: [
    'Estás a %G del primero. Con la gracia que tienes, el trono es cuestión de una tarde.',
    'Segundo, a %G del número uno. Huele el oro, que lo tienes ahí y te lo mereces.',
    'Te quedan %G para pasar al primero. Una noche inspirada y mañana mandas tú.',
    'Plata a %G del oro. El grupo ya te ve arriba, solo falta que lo diga el marcador.',
    'Estás a %G del primero, y el primero ya no duerme por tu culpa. Eso es presión de la buena.',
    'Vas segundo por %G. Un par de mensajes de los tuyos y le quitas el puesto.',
    'Te separan %G del primero, y en gracia ya le has pasado hace tiempo.',
    'A %G del oro. Lo tienes al alcance y todo el grupo lo sabe.',
    'Vas segundo, pisándole los talones al primero: %G y nada más.',
    'Tienes la plata, a %G. Te falta un suspiro para un trono que ya es medio tuyo.',
  ],
  segundoLejos: [
    'El primero te saca %G en mensajes. En carisma no te saca ni uno.',
    'Te quedas a %G del oro, y es distancia de horas, no de gracia.',
    'Segundo puesto, a %G del primero. Ni falta que te hace: con lo que escribes ya te tienen ganado.',
    'Te faltan %G para el primer puesto. Al primero le sobran horas, a ti te sobra chispa, princesa.',
    'Tienes la plata, a %G. El grupo te lee igual que al primero, y te cita más.',
    'Medalla de plata a %G del número uno. Para ser de quien más se habla no te hace falta el oro.',
    'A %G del primero. Escribes menos y te recuerdan más, que es lo que importa.',
    'Te quedan %G hasta el oro, y la plata te luce de puta madre mientras tanto.',
    'Estás a %G del primero. Que escriba lo que quiera: las risas te las llevas tú.',
    'Te sacan %G desde el primer puesto. En calidad, el podio lo encabezas tú.',
  ],
  terceroCerca: [
    'Estás a %G del segundo. Un empujón y le quitas la plata.',
    'Tienes el bronce, a %G de la plata. Eso lo recuperas con una sola de las tuyas.',
    'Te faltan %G para el segundo. Con la gracia que tienes, la plata es cuestión de días.',
    'Tercero, a %G del de arriba. La plata la tienes a tiro de piedra.',
    'Te quedas a %G del segundo puesto. Una tarde inspirada y subes.',
    'Bronce por los pelos: el de arriba te saca %G y nada más.',
    'Estás a %G de la plata, y el de arriba ya te nota en la nuca.',
    'Vas tercero a %G del segundo, y subiendo, que se te nota con ganas.',
    'Te separan %G del segundo. Un par de temas de los tuyos y se acabó.',
    'Te quedan %G para la plata. A este ritmo, la semana que viene te la cuelgas, muñeca.',
  ],
  terceroLejos: [
    'Vas a %G del segundo, y estás en el podio con todo el mérito.',
    'Tienes el bronce, a %G de la plata. Poco volumen y mucha calidad, que es lo que cuenta.',
    'Te faltan %G para el segundo, y te da igual: el grupo te tiene en lo alto.',
    'Estás a %G del segundo. Escribes menos, y lo tuyo se nota el doble.',
    'Te quedas %G por detrás del segundo, y a nadie le molesta verte en el podio.',
    'Tienes el bronce, y la plata a %G. Tú a lo tuyo, que lo tuyo es caer de puta madre, reina.',
    'Estás a %G del segundo. Los de arriba hacen bulto, tú haces gracia.',
    'Vas tercero, a %G de la plata, y tienes tú el carisma de los dos de arriba juntos.',
    'Te sacan %G desde el segundo. Da igual: el podio se ve mejor contigo.',
    'Bronce a %G del de arriba, y tú le das a ese escalón más clase que nadie.',
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
