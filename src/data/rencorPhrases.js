'use strict';

// LA MEMORIA DE RENCOR: la linea que el bot añade cuando dos personas que ya se
// cruzaron otro dia vuelven a cruzarse. La logica esta en src/utils/rencor.js.
//
// Sale UNA vez por pareja y por juego al dia (el primer cruce del dia), y solo
// si la vez anterior fue otro dia. Nunca con nadie del tier dueño: una racha
// suya, contada, delataria el amaño y quien es.
//
// LOS HUECOS (scripts/placeholders.js, CONTRATO):
//   %A  quien gana hoy. En el robo, quien roba (le salga o no).
//   %V  quien pierde hoy. En el robo, a quien intentan robar.
//   %D  cuando fue la vez anterior: «ayer», «el martes», «la semana pasada»,
//       «hace 12 días». Va en minuscula; si abre la frase, se pone la
//       mayuscula sola. «de %D» con «el martes» sale «del martes».
//   %C  la cifra de la vez anterior: el aura del duelo, lo que se robo, o el
//       % del ship (ya con el signo: «12 %»). En !mog no hay cifra.
//   %N  cuantas seguidas, en letra («tres»). Solo en las rachas.
//
// En el ship %A y %V son la pareja, sin ganador: no hay nada que ganar.
//
// EL DATO VA EN LA FRASE. Quien lo lee tiene que saber que paso, cuando y
// entre quienes sin mirar nada mas: «%V ya perdio contra %A %D», no «otra vez
// lo mismo». La capa 109 exige los huecos que dicen el dato.
//
// Las reglas del resto del bot valen aqui igual (GUIA.md, 5 bis): al que gana
// no se le quita la victoria, al que pierde se le remata, nada de analogias,
// y sin genero —«%V» le toca a cualquiera del grupo—.

// ─── !mog ────────────────────────────────────────────────────────────────────

// %A ya le gano a %V la vez anterior y hoy vuelve a ganarle.
const MOG_REPITE = [
  'Lo de %D no fue suerte. %A vuelve a moggear a %V, y esta vez con más testigos.',
  'A %V no le bastó con lo de %D. Necesitaba perder otra vez contra %A para creérselo.',
  '%V pierde otra vez contra %A. Ya pasó %D, y la genética de %V no ha mejorado una puta mierda desde entonces.',
  '%D %A se lo dejó claro a %V. Hoy se lo explica más despacio, a ver si esta vez le entra.',
  'Otra vez %A, otra vez %V debajo. Si lo de %D no dolió lo suficiente, esto ya debería.',
  'Ni el tiempo que ha pasado desde %D le ha servido a %V. Pierde contra %A igual que entonces, y con menos excusas.',
  '%V ya se comió el mog de %A %D, y hoy se lo ha vuelto a comer entero.',
  '%A vuelve a pasar por encima de %V. Lo de %D no fue casualidad, y hoy queda confirmado.',
  '%D ya quedó claro quién mandaba entre %A y %V. Hoy se ha repetido en voz alta.',
  'El mismo resultado que %D. A %V la cara no le ha cambiado, y a %A tampoco.',
  '%D %A arriba y %V abajo. Hoy, exactamente igual.',
  '%V perdió contra %A %D y hoy vuelve a perder. Hay derrotas que se aprenden a la primera, y %V no.',
  'Desde %D, %V no ha arreglado nada de lo que %A le ganó. Se nota en la foto.',
  '%A le vuelve a ganar a %V como %D. El espejo de %V ya ni se sorprende.',
  'Otra vez %V debajo de %A, igual que %D. A estas alturas es una costumbre, no un resultado.',
  'Lo de %D se repite. A %V le ha tocado ponerse otra vez al lado de %A, y otra vez sale perdiendo.',
];

// %V le gano a %A la vez anterior y hoy gana %A. Se le remata a %V, que se
// lo habia creido.
const MOG_REVANCHA = [
  '%D fue %V quien moggeó a %A. Hoy se le da la vuelta, y a %V la gloria le ha durado un suspiro.',
  'Lo de %D se ha terminado. %V se creyó por encima de %A y hoy baja del pedestal de culo.',
  'Revancha cobrada. %D ganó %V, hoy gana %A, y %V ya no tiene nada que enseñar.',
  '%A tenía pendiente lo de %D. Hoy lo salda y %V vuelve al sitio del que nunca debió subir.',
  'A %V lo de %D se le subió a la cabeza. Hoy %A se la baja de un golpe.',
  '%D %V moggeó a %A. Hoy se acaba, y %A sale arriba.',
  'Dura poco la gloria con esa cara. %V ganó %D y hoy %A le devuelve al suelo.',
  'Hay victorias que duran poco. La de %V %D era una, y hoy %A se ha encargado de dejarlo claro.',
  '%V pensó que lo de %D contra %A iba a ser lo normal. Lo normal es esto.',
  'Lo de %D fue un préstamo. %A lo ha recuperado hoy y %V se queda sin nada que contar.',
  '%V venía de moggear a %A %D. Tenía que haberse quedado con esa, porque hoy gana %A.',
  'Se acabó lo de %D. %V le ganó a %A, se lo creyó, y hoy lo paga delante de todos.',
  'Lo de %D queda como lo que fue entre %A y %V: un accidente. Hoy gana %A.',
  'La cuenta con %A ya no es la de %D. %V pierde hoy lo poco que ganó entonces.',
];

// %A lleva %N seguidas contra %V (tres o mas, contando la de hoy).
const MOG_RACHA = [
  '%N veces seguidas le ha tocado a %V mirar a %A desde abajo. La anterior fue %D, y sin cambio a la vista.',
  'Esto ya es costumbre. %N seguidas de %A sobre %V, y la de %D no fue la última.',
  'Con esta van %N. %V ha convertido perder contra %A en lo único constante de su vida.',
  'Las últimas %N son de %A. %V no ha rascado nada desde entonces.',
  'Otra más, y van %N. %V pierde contra %A con una regularidad que no tiene en nada más.',
  '%N seguidas de %A. Lo de %D ya no es noticia, lo raro sería que %V ganara una.',
  'Van %N seguidas de %A contra %V, y la última fue %D. El grupo ya ni pregunta quién gana.',
  '%N de %N para %A. %V ya no pierde contra %A: lo tiene por costumbre.',
  '%V lleva %N derrotas seguidas contra %A. A estas alturas el mog es un trámite.',
  'Ya son %N. Cada vez que alguien pone a %V al lado de %A, pasa lo mismo.',
  'Racha de %N para %A contra %V. Quien haga el siguiente mog ya sabe lo que va a salir.',
  '%A suma %N seguidas contra %V. Llegados aquí, poner a %V al lado de %A ya es crueldad.',
];

// ─── !duel ───────────────────────────────────────────────────────────────────

// %A ya le gano %C a %V la vez anterior y hoy vuelve a ganar.
const DUELO_REPITE = [
  '%A ya le quitó %C de aura a %V %D, y hoy repite. %V paga dos veces por la misma gilipoyez.',
  '%V tenía desde %D para aprender, y hoy le vuelve a regalar el aura a %A. Ni con la lección pagada se entera de una mierda.',
  'Lo de %D contra %A no fue mala suerte. %V lo confirma hoy pagando otra vez, que perder es lo único que se le da de puta madre.',
  'Otra vez se lleva %A el aura de %V. %D fueron %C, y %V ha vuelto a ponerla en la mesa por gusto. Hay que ser gilipoyas.',
  '%V no escarmienta ni pagando: ya perdió %C contra %A %D y hoy vuelve a pasar por caja.',
  'Mismo duelo y mismo ganador que %D. %A cobra otra vez, y lo único nuevo es la miseria que le queda a %V.',
  '%D %V aprendió que %A gana. Hoy se le ha olvidado y ha vuelto a pagar la clase, con memoria de pez.',
  '%V pierde otra vez contra %A. %D fueron %C, y la puta cabeza de %V sigue sin hacer la cuenta.',
  '%V perdió %C contra %A %D y hoy ha vuelto a pasar. Tira el aura a la basura por aburrimiento.',
  'Mismo final que %D, cuando fueron %C para %A. %V sigue sin entender contra quién juega, y paga cada vez por no tener ni puta idea.',
  '%V pierde contra %A como %D, cuando se dejó %C. Firmar recibos se le da de maravilla.',
  '%D se quedó %A los %C de %V, y hoy se queda también con los de hoy. %V es su cajero automático.',
  'Si perder %C contra %A %D no bastó, lo de hoy tampoco va a bastar. %V no aprende ni a hostias.',
];

// %V le gano %C a %A la vez anterior y hoy gana %A.
const DUELO_REVANCHA = [
  '%D %V le quitó %C a %A. Hoy %A se lo cobra con intereses y %V se queda mirando la cuenta.',
  'Revancha servida. %A perdió %C contra %V %D y hoy le ha devuelto el golpe delante de todos.',
  '%V ganó %D. Hoy %A le ha bajado los humos y el saldo a la vez.',
  '%V ganó %D y se lo creyó. Hoy %A le ha recordado que una vez es suerte y lo demás, el nivel de siempre.',
  'Cobrada la deuda de %D. %A recupera lo suyo y a %V solo le queda el recuerdo de cuando ganaba.',
  'Hay victorias que se pagan después. La de %V sobre %A %D le ha salido hoy bastante cara.',
  '%V pensó que lo de %D se iba a repetir. %A le ha quitado la idea, el aura y la tontería de una sola hostia.',
  '%D ganó %V contra %A. Hoy le toca pagar, callarse y meterse el orgullo por el culo.',
  'Lo de %D ya no cuenta. %A se cobra lo suyo y a %V le toca meterse sus putas fanfarronadas por donde le quepan.',
  'A %V le ha durado una mierda lo de %D. Hoy el duelo es de %A, y la cara de pasmo, de %V.',
  '%A tenía pendiente lo de %D. Hoy lo tacha, y %V paga la diferencia.',
  '%V se llevó %C %D, hoy se lo lleva %A, y a %V se le ha acabado lo de presumir.',
];

// %A lleva %N duelos seguidos ganados a %V (tres o mas, contando el de hoy).
const DUELO_RACHA = [
  '%N de %N. %V ya no se bate con %A: le paga una puta mensualidad.',
  'Las últimas %N son de %A. Cada vez que %V y %A se cruzan, %V acaba pagando y con la cara partida.',
  'Con esta son %N. Lo más constante que tiene %V en la vida es perder contra %A.',
  '%N seguidas contra la misma persona. %V no tiene mala suerte, tiene a %A delante.',
  'Van %N duelos seguidos de %A contra %V. Para %V, retar a %A ya es pagar el impuesto de ser gilipoyas.',
  '%V lleva %N derrotas seguidas contra %A. A cualquiera le daría vergüenza, a %V le da igual.',
  'Ya son %N. %A cobra de %V con regularidad de nómina, y %V paga puntual, sin rechistar y sin una puta queja.',
  'Racha de %N para %A. La anterior fue %D, y %V ha vuelto a caer como si nada.',
  'Otra, y van %N. %V se sienta delante de %A con la ilusión intacta y el saldo cada vez más flaco.',
  '%A suma %N seguidas contra %V. Lo sensato sería apartarse, pero eso requiere un cerebro que %V perdió en otro duelo.',
];

// Al LANZAR el duelo, si esos dos ya se batieron otro dia. Aqui %A es quien
// gano aquella vez y %V quien perdio, retando o retado.
//
// Quien perdio aquella vez es quien reta ahora.
const DUELO_PIDE = [
  '%V perdió %C contra %A %D y vuelve a retarle. Lo de aprender lo deja para otro día, y lo de tener vergüenza, para nunca.',
  '%D %A le quitó %C a %V. Ahora %V quiere la revancha, y %A decide si le apetece cobrar otra vez.',
  'Precedente: %D ganó %A y se llevó %C. %V viene a por lo suyo con muchas ganas y ni puta idea.',
  '%V todavía no ha digerido lo de %D. Reta a %A otra vez, a ver si esta vez escuece menos.',
  'Ojo al historial. %D %A le ganó %C a %V, y %V ha decidido que no fue suficiente.',
  '%V vuelve a por %A después de perder %C %D. Valor no le falta, lo que le falta es todo lo demás.',
  'Lo de %D sigue escociendo. %V reta a %A y el grupo ya sabe cómo acaba esto: con %V pagando y lloriqueando.',
  '%V busca la revancha de lo de %D, cuando %A le dejó %C más pobre. Se ve que la miseria le sabe a poco.',
  '%D se fueron %C de %V a %A. %V quiere recuperarlos, y lo más probable es que pague otra vez por gilipoyas.',
  'Revancha a la vista. %D se lo llevó %A, y %V apuesta a que la historia no se repite. La historia se va a descojonar.',
];

// Quien gano aquella vez es quien vuelve a retar.
const DUELO_VUELVE = [
  '%A ya le ganó %C a %V %D y vuelve a por más. Antes de aceptar, %V debería acordarse de cómo acabó.',
  'Precedente: %D %A se llevó %C de %V. %V puede aceptar, o puede ahorrarse la vergüenza.',
  '%A reta otra vez a %V. La última, %D, le salió a %V por %C, y todavía se nota.',
  'Historial entre estos dos: %D ganó %A. %V decide ahora si quiere repetir la lección.',
  '%A vuelve a por %V después de lo de %D. Rechazar sería lo más sensato que ha hecho %V en meses, y no lo va a hacer, porque es gilipoyas.',
  '%D %A le dejó a %V %C más pobre. Hoy le propone repetir, y %V tiene la mala costumbre de aceptar.',
  '%A no se ha cansado de ganarle a %V. Lo de %D fue solo el principio, y %V tiene pinta de cajero para rato.',
  '%V ya le pagó %C a %A %D. Ahora %A pregunta si quiere pagar otra vez, y %V es lo bastante gilipoyas para pensárselo.',
  '%A reta a %V con lo de %D a favor. A %V le toca decidir si le queda orgullo o solo ganas de que le vuelvan a dar por culo.',
  'Ojo, %V. %D saliste perdiendo contra %A, y viene a por más.',
];

// ─── !robo ───────────────────────────────────────────────────────────────────
//
// Solo cuenta un robo que SALIO, en cualquier direccion: es lo que deja
// rencor. %C es lo que se llevo aquella vez.

// %A ya le robo %C a %V y hoy le vuelve a robar.
const ROBO_REINCIDE = [
  '%A ya le robó %C a %V %D. Hoy vuelve a por más y %V sigue sin cerrar la puerta.',
  'Reincidente. %A le robó %C a %V %D y hoy ha vuelto como quien vuelve a su casa. %V ya es su despensa.',
  '%A ha vuelto a vaciarle los bolsillos a %V. %D ya se llevó %C, y %V los ha vuelto a llenar para que se los vacíen. Gilipoyez de manual.',
  '%D fueron %C. Hoy %A repite con %V, que se lo vuelve a poner a huevo. Víctima profesional.',
  'A %V le vuelve a robar %A. Lo de %D, %C, no le enseñó absolutamente nada.',
  '%A tiene a %V en la agenda desde %D. Hoy pasa a cobrar otra vez y %V sigue sin enterarse de una mierda.',
  'Otra visita de %A al aura de %V. La anterior, %D, fueron %C, y %V la sigue dejando a la vista, servida en bandeja y sin una alarma.',
  'Hay víctimas y hay clientes fijos. %V es cliente fijo de %A desde %D, y no se ha dado de baja ni a hostias.',
  '%V ya perdió %C con %A %D y no ha movido ni un dedo. Hoy vuelve a pagar por no levantar el culo de la silla.',
  'De %V a %A, otra vez. %D ya se fueron %C por el mismo camino, y %V sigue sin poner ni una piedra.',
  'Lo de %D no fue un despiste. %V se deja robar por %A cada vez que %A tiene hambre.',
  '%A vuelve a la víctima de %D. Si %V se deja, para qué buscar otra.',
  '%A ya le robó a %V %D y hoy ha vuelto a entrar sin llamar. %V tiene la puerta abierta y la cabeza de adorno.',
  'Otro golpe de %A a %V. El anterior, %D, fueron %C, y %V sigue igual de a mano, con el bolsillo abierto y cara de panoli.',
  '%A le vuelve a robar a %V. Si %V se hubiera espabilado después de lo de %D, esto no pasaba, pero no espabila ni con una patada en el culo.',
  'Después de lo de %D, %V sigue siendo el cajero de %A, y sin pedirle ni la tarjeta.',
];

// %V le robo %C a %A la otra vez y hoy %A se lo devuelve.
const ROBO_VENGANZA = [
  '%D %V le robó %C a %A. Hoy %A se lo cobra, y %V descubre que esto funciona en las dos direcciones.',
  'Venganza servida. %V le quitó %C a %A %D y hoy le toca pagar a %V, con intereses y con jeta de imbécil incluida.',
  '%V pensó que lo de %D le iba a salir gratis. %A acaba de pasarle la factura.',
  '%A no olvida. %D %V le quitó %C, y hoy %A ha ido directo a por quien se los llevó. %V ya puede ir llorando a su casa.',
  '%V se llevó %C de %A %D y se creyó a salvo. %A tiene buena memoria, y %V una cara de cemento armado que da asco.',
  'Devuelta la de %D. %V aprende hoy que robar a %A tenía letra pequeña, y que la letra pequeña te muerde el culo.',
  '%D robó %V, hoy roba %A. %V ya puede ir contando lo que le queda, que no es mucho.',
  '%A le saca a %V del bolsillo lo de %D, y le cobra hasta el susto.',
  '%V creía que lo de %D estaba olvidado. %A solo esperaba el momento, y hoy le ha pasado la cuenta a hostias.',
  '%A le ha devuelto a %V el robo de %D. Con la misma mano y el doble de mala hostia.',
  'A %V lo de %D le ha salido caro. %A no ha olvidado ni una cifra, y %V lo está pagando con el culo apretado.',
  '%A tenía pendiente lo de %D. Hoy %V lo paga con cara de gilipoyas.',
  'Lo de %D ya está devuelto: %V robó a %A y hoy %A le roba a %V. Cuentas en paz.',
  'Cuentas saldadas. %V le robó %C a %A %D y hoy %A se ha cobrado lo suyo.',
];

// %A ya le robo %C a %V otro dia y hoy le sale mal.
const ROBO_SE_ACABA = [
  'Lo de %D no se repite. %A volvió a por %V y esta vez se va sin un duro y con la cara roja.',
  'Se le acabó el chollo a %A. %D se llevó %C de %V, hoy se lleva el ridículo.',
  '%A creyó que %V seguía tan a mano como %D. Ha pinchado en hueso y encima le ha costado aura.',
  '%A volvió a por %V, la misma víctima de %D, y se ha comido la puerta cerrada con la cara. Codicia de rata.',
  'Hay golpes que salen una vez. El de %A a %V fue %D, y hoy toca pagar la osadía.',
  '%D %A le quitó %C a %V. Hoy intenta repetir y lo único que se lleva es la multa.',
  '%D le salió bien a %A. Hoy, contra %V, se ha dado de bruces.',
  'Lo de %D con %V se le subió a la cabeza a %A, y lo acaba de pagar.',
  '%A ha vuelto a por %V y esta vez se va con las manos vacías y el culo caliente. Lo de %D ya no se lo cree ni %A.',
  'A %A le supo a gloria lo de %D con %V y ha vuelto a por más. Hoy %V le cierra el grifo.',
];

// %V le robo %C a %A otro dia, y hoy %A intenta vengarse y le sale mal.
const ROBO_NI_VENGARSE = [
  '%D %V le robó %C a %A. Hoy %A intenta vengarse y ni eso le sale, que ya hace falta ser inútil.',
  'A %A le robó %V %D y hoy le vuelven a salir las cuentas en rojo. Ni para vengarse sirve.',
  '%A quería devolverle a %V lo de %D. Se ha quedado con las ganas, con menos aura y con el ridículo de propina.',
  'Venganza fallida. %V se llevó %C de %A %D, y hoy %A encima paga la multa. Le roban y encima paga, menudo puto genio.',
  'Lo de %D con %V seguía sin cobrarse. %A lo intenta por fin, y la caga.',
  '%V le robó a %A %D, y hoy %A encima hace el ridículo intentando devolvérselo.',
  '%A fue a por %V con la rabia de %D y se ha estrellado. La rabia no roba sola, y la cabeza de %A tampoco ayuda una mierda.',
  'Lo de %D sigue sin cobrarse. %A lo ha intentado hoy y %V ni se ha despeinado.',
  '%A perdió %C contra %V %D y hoy pierde también la venganza. No gana ni con motivos, ni con ganas, ni con la puta suerte de cara.',
  '%V robó a %A %D y sigue durmiendo a pierna suelta. Visto lo de hoy, con razón.',
];

// ─── !ship ───────────────────────────────────────────────────────────────────
//
// %A y %V son la pareja. %C es el % de la vez anterior, ya con el signo.

// Hoy sale bastante mas alto que la vez anterior.
const SHIP_SUBE = [
  '%D les salió %C a %A y %V. Hoy salen bastante mejor, y el grupo ya empieza a hacer preguntas.',
  '%A y %V venían de un %C %D. Hoy el número sube, y el grupo ya pregunta qué ha pasado entre medias.',
  'De %C %D a esto. Entre %A y %V algo se está moviendo, y no es el bot.',
  '%D, %C para %A y %V, y hoy bastante más. El bot solo apunta, el cotilleo ya es cosa del grupo.',
  '%A y %V suben desde el %C de %D. A este paso, la próxima vez hay que buscar padrinos.',
  'El ship de %A y %V se quedó %D en %C. Hoy mejora, que ya es más de lo que mejora casi nadie aquí.',
  '%D fue un %C para %A y %V. Hoy sube, y a %A y %V ya no les vale culpar al bot.',
  '%A y %V dejan atrás el %C de %D. Si esto sigue así, alguien va a tener que dar explicaciones.',
];

// Hoy sale bastante mas bajo.
const SHIP_BAJA = [
  '%D a %A y %V les salió %C. Hoy baja, y es lo más sincero que les ha dicho nadie.',
  'De %C %D a esto. %A y %V se están desenamorando sin haber empezado.',
  '%A y %V venían de un %C %D. Hoy bajan, y nadie en el grupo lo lamenta.',
  'Lo de %D pintaba mejor. %A y %V bajan desde un %C y ya no hay número que lo arregle.',
  'El %C de %D era lo mejor que iban a tener %A y %V. Ya ni eso.',
  '%D eran %C. Entre %A y %V la cosa ha ido a peor, y nadie se sorprende.',
  'Caída libre desde el %C de %D. A %A y %V el ship ya no les da ni para amistad.',
  'El ship de %A y %V baja. Lo de %D, aquel %C, fue un espejismo.',
];

// Hoy sale mas o menos lo mismo.
const SHIP_IGUAL = [
  'Parecido a lo de %D, que fue %C. %A y %V están atascados en la misma mediocridad.',
  '%D ya eran %C. %A y %V no suben ni bajan, se quedan donde nadie les mira.',
  'Casi el mismo resultado que %D. A %A y %V ni el ship les da una sorpresa.',
  'Otra vez en torno al %C de %D. Lo de %A y %V es estable, estable de no ir a ninguna parte.',
  '%D a %A y %V les salió %C, y hoy más o menos lo mismo. Esto no se mueve.',
  '%A y %V repiten número, casi calcado al de %D. Esto no va a ningún lado.',
  'Lo de %A y %V sigue donde estaba %D. La respuesta es la misma por mucho que se pregunte.',
  'Desde %D, %A y %V siguen igual. La química de siempre, que es poca.',
];

module.exports = {
  MOG_REPITE, MOG_REVANCHA, MOG_RACHA,
  DUELO_REPITE, DUELO_REVANCHA, DUELO_RACHA, DUELO_PIDE, DUELO_VUELVE,
  ROBO_REINCIDE, ROBO_VENGANZA, ROBO_SE_ACABA, ROBO_NI_VENGARSE,
  SHIP_SUBE, SHIP_BAJA, SHIP_IGUAL,
};
