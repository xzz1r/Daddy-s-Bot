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
  '%V ya se comió el mog de %A %D. Hoy lo ha vuelto a pedir y se lo ha vuelto a comer entero.',
  'Segunda vez que %A pasa por encima de %V. La primera fue %D, y %V todavía no había terminado de llorarla.',
  '%D ya quedó claro quién mandaba entre %A y %V. Hoy %V ha venido a que se lo repitan en voz alta.',
  'Lo de %D no fue suerte. %A vuelve a moggear a %V, y esta vez con más testigos.',
  'A %V no le bastó con lo de %D. Necesitaba perder otra vez contra %A para creérselo.',
  '%V pierde otra vez contra %A. Ya pasó %D, y la genética de %V no ha mejorado una puta mierda desde entonces.',
  'El mismo resultado que %D. %V sigue pidiendo el mog contra %A con la esperanza de que la cara le cambie por insistir.',
  'Repetición de %D: %A arriba, %V abajo. Lo único que ha cambiado es la cantidad de gente mirando.',
  'Hay quien aprende a la primera. %V perdió %D contra %A y ha vuelto a por la segunda, que ya es de ser gilipoyas.',
  '%D %A se lo dejó claro a %V. Hoy se lo explica más despacio, a ver si esta vez le entra.',
  'Otra vez %A, otra vez %V debajo. Si lo de %D no dolió lo suficiente, esto ya debería.',
  '%V ha vuelto a medirse con %A después de lo de %D. No es valentía, es no tener ni memoria ni espejo.',
  'Dos de dos para %A. %V lleva desde %D intentando que el resultado cambie, y lo único que cambia es el público.',
  '%V le pidió a %A la revancha de lo de %D. La ha tenido y la ha perdido igual de mal.',
  'Ni el tiempo que ha pasado desde %D le ha servido a %V. Pierde contra %A igual que entonces, y con menos excusas.',
  'Lo de %D se repite. %V se lo ha buscado sin ayuda, que nadie le pedía volver a ponerse al lado de %A.',
];

// %V le gano a %A la vez anterior y hoy gana %A. Se le remata a %V, que se
// lo habia creido.
const MOG_REVANCHA = [
  '%D fue %V quien moggeó a %A. Hoy se le da la vuelta, y a %V la gloria le ha durado un suspiro.',
  'Lo de %D se ha terminado. %V se creyó por encima de %A y hoy baja del pedestal de culo.',
  '%V venía de moggear a %A %D y ha vuelto a pedirlo. Tenía que haberse quedado con esa.',
  'Revancha cobrada. %D ganó %V, hoy gana %A, y %V ya no tiene nada que enseñar.',
  '%A tenía pendiente lo de %D. Hoy lo salda y %V vuelve al sitio del que nunca debió subir.',
  'A %V lo de %D se le subió a la cabeza. Hoy %A se la baja de un golpe.',
  'Se acabó lo de %D. %V le ganó una vez a %A, se lo creyó, y hoy lo paga delante de todos.',
  '%D %V moggeó a %A y no ha parado de recordarlo. Ya puede ir parando.',
  'Dura poco la gloria con esa cara. %V ganó %D y hoy %A le devuelve al suelo.',
  'Uno a uno entre %A y %V. Lo de %D queda como lo que fue, un accidente.',
  'Hay victorias que se celebran demasiado. La de %V %D era una, y hoy %A se ha encargado de dejarlo claro.',
  '%V pensó que lo de %D contra %A iba a ser lo normal. Lo normal es esto.',
  'La cuenta con %A ya no es la de %D. %V ha vuelto a pedirlo y ha perdido lo poco que ganó.',
  'Lo de %D fue un préstamo. %A lo ha recuperado hoy y %V se queda sin nada que contar.',
];

// %A lleva %N seguidas contra %V (tres o mas, contando la de hoy).
const MOG_RACHA = [
  'Van %N seguidas de %A contra %V. La última fue %D, y %V sigue pidiendo más.',
  '%N de %N para %A. %V ya no pierde contra %A, se presenta a perder.',
  '%V lleva %N derrotas seguidas contra %A. A estas alturas pedir el mog es una forma de pedir perdón.',
  'Ya son %N. %A moggea a %V cada vez que %V se acuerda de pedirlo, y %V se acuerda demasiado.',
  'Racha de %N para %A. %V podría dejarlo, pero entonces no tendría con qué hacer el ridículo.',
  '%N veces seguidas le ha tocado a %V mirar a %A desde abajo. La anterior fue %D, y sin cambio a la vista.',
  'Esto ya es costumbre. %N seguidas de %A sobre %V, y la de %D no fue la última.',
  'Con esta van %N. %V ha convertido perder contra %A en lo único constante de su vida.',
  'Las últimas %N son de %A. %V no ha rascado nada desde entonces.',
  '%A suma %N seguidas contra %V. Llegados aquí, que %V lo vuelva a pedir ya es vicio.',
  'Otra más, y van %N. %V pierde contra %A con una regularidad que no tiene en nada más.',
  '%N seguidas de %A. Lo de %D ya no es noticia, lo raro sería que %V ganara una.',
];

// ─── !duel ───────────────────────────────────────────────────────────────────

// %A ya le gano %C a %V la vez anterior y hoy vuelve a ganar.
const DUELO_REPITE = [
  '%A ya le quitó %C de aura a %V %D. Hoy repite, y %V paga otra vez por el mismo error.',
  '%V perdió %C contra %A %D y ha vuelto a aceptar. Hay gente que tira el aura por aburrimiento.',
  'Segundo duelo, mismo final. %D fueron %C para %A, y %V sigue sin entender contra quién juega.',
  '%V tenía desde %D para aprender. Lo ha usado para ahorrar y volver a dárselo a %A.',
  'Lo de %D contra %A no fue un mal día de %V. Es que %V es así.',
  'Otra vez se lleva %A el aura de %V. %D fueron %C, y %V lo ha vuelto a poner encima de la mesa por gusto.',
  'Hay quien no escarmienta ni pagando. %V ya perdió %C contra %A %D y hoy vuelve a pasar por caja.',
  '%V acepta los duelos de %A como quien firma un recibo. %D ya firmó uno de %C.',
  'Mismo duelo, mismo ganador que %D. %A cobra otra vez y lo único nuevo es lo poco que le queda a %V.',
  '%D %V aprendió que %A gana. Hoy lo ha olvidado y ha pagado la clase otra vez.',
  'Dos veces que %V pone aura contra %A y dos veces que se la queda %A. Lo de %D fueron %C.',
  'Si perder contra %A %D no bastó, esto tampoco va a bastar. %V ha nacido para aceptar duelos que pierde.',
  '%V pierde otra vez contra %A. %D fueron %C, y la puta cabeza de %V sigue sin hacer la cuenta.',
];

// %V le gano %C a %A la vez anterior y hoy gana %A.
const DUELO_REVANCHA = [
  '%D %V le quitó %C a %A. Hoy %A se lo cobra con intereses y %V se queda mirando la cuenta.',
  'Revancha servida. %A perdió %C contra %V %D y hoy le ha devuelto el golpe delante de todos.',
  '%V venía muy arriba después de lo de %D. Hoy %A le ha bajado los humos y el saldo a la vez.',
  'Lo de %D ya no cuenta. %A iguala con %V y %V se queda sin nada que presumir.',
  '%V ganó %D y se lo creyó. Hoy %A le ha recordado que una vez es suerte.',
  'Cobrada la deuda de %D. %A recupera lo suyo y a %V solo le queda el recuerdo de cuando ganaba.',
  'A %V le ha durado la racha un duelo. Lo de %D ya es historia y lo de hoy es de %A.',
  '%A tenía %D marcado en rojo. Hoy lo tacha y %V paga la diferencia.',
  'Hay victorias que se pagan después. La de %V sobre %A %D le ha salido hoy bastante cara.',
  '%V pensó que lo de %D se iba a repetir. %A le ha quitado la idea y el aura en el mismo duelo.',
  'Uno para cada uno. %V se llevó %C %D, hoy se lo lleva %A, y a %V se le ha acabado lo de presumir.',
  '%D presumía %V de haberle ganado a %A. Hoy le toca pagar y callarse.',
];

// %A lleva %N duelos seguidos ganados a %V (tres o mas, contando el de hoy).
const DUELO_RACHA = [
  'Van %N duelos seguidos de %A contra %V. %V sigue aceptando, que para eso no hace falta pensar.',
  '%N de %N. %V ya no se bate con %A, le va pasando el aura por turnos.',
  '%V lleva %N derrotas seguidas contra %A. A cualquiera le daría vergüenza, a %V le da por aceptar otra.',
  'Ya son %N. %A cobra de %V con una regularidad que %V no tiene ni para escribir en el grupo.',
  'Racha de %N para %A. La anterior fue %D, y %V ha vuelto a aceptar como si no hubiera pasado nada.',
  'Las últimas %N son de %A. %V pierde cada vez que se cruzan, y se cruzan porque %V quiere.',
  'Otra, y van %N. %V acepta los duelos de %A con la ilusión intacta y el saldo cada vez más flaco.',
  '%A suma %N seguidas. %V debería dejar de aceptar, pero eso sería aprender y %V no está para eso.',
  'Con esta son %N. Lo más constante que tiene %V en la vida es perder contra %A.',
  '%N seguidas contra la misma persona. %V no tiene mala suerte, tiene a %A delante.',
];

// Al LANZAR el duelo, si esos dos ya se batieron otro dia. Aqui %A es quien
// gano aquella vez y %V quien perdio, retando o retado.
//
// Quien perdio aquella vez es quien reta ahora.
const DUELO_PIDE = [
  '%V perdió %C contra %A %D y vuelve a retarle. Lo de aprender lo deja para otro día.',
  '%D %A le quitó %C a %V. Ahora %V quiere la revancha, y %A decide si le apetece cobrar otra vez.',
  'Precedente: %D ganó %A y se llevó %C. %V viene a por lo suyo con más ganas que motivos.',
  '%V todavía no ha digerido lo de %D. Reta a %A otra vez, a ver si esta vez escuece menos.',
  'Ojo al historial. %D %A le ganó %C a %V, y %V ha decidido que no fue suficiente.',
  '%V vuelve a por %A después de perder %C %D. Valor no le falta, lo que le falta es todo lo demás.',
  'Lo de %D sigue escociendo. %V reta a %A y el grupo ya sabe cómo acaba esto.',
  '%V busca la revancha de lo de %D, cuando %A le dejó %C más pobre.',
  '%D se fueron %C de %V a %A. %V quiere recuperarlos y ha elegido la forma más cara de intentarlo.',
  'Segundo asalto. El primero, %D, se lo llevó %A. %V apuesta a que la historia no se repite.',
];

// Quien gano aquella vez es quien vuelve a retar.
const DUELO_VUELVE = [
  '%A ya le ganó %C a %V %D y vuelve a por más. Antes de aceptar, %V debería acordarse de cómo acabó.',
  'Precedente: %D %A se llevó %C de %V. %V puede aceptar, o puede ahorrarse la vergüenza.',
  '%A reta otra vez a %V. La última, %D, le salió a %V por %C, y todavía se nota.',
  'Historial entre estos dos: %D ganó %A. %V decide ahora si quiere repetir la lección.',
  '%A vuelve a por %V después de lo de %D. Rechazar sería lo más sensato que ha hecho %V en semanas.',
  '%D %A le dejó a %V %C más pobre. Hoy le propone repetir, y %V tiene la mala costumbre de aceptar.',
  '%A no se ha cansado de ganarle a %V. Lo de %D fue solo el principio.',
  '%V ya le pagó %C a %A %D. Ahora %A pregunta si quiere pagar otra vez.',
  'Ojo, %V. %D saliste perdiendo contra %A, y viene a por la segunda.',
  '%A reta a %V con lo de %D a favor. A %V le toca decidir si le queda orgullo o solo aura.',
];

// ─── !robo ───────────────────────────────────────────────────────────────────
//
// Solo cuenta un robo que SALIO, en cualquier direccion: es lo que deja
// rencor. %C es lo que se llevo aquella vez.

// %A ya le robo %C a %V y hoy le vuelve a robar.
const ROBO_REINCIDE = [
  '%A ya le robó %C a %V %D. Hoy vuelve a por más y %V sigue sin cerrar la puerta.',
  'Reincidente. %A le robó %C a %V %D y hoy ha vuelto como quien vuelve a su casa.',
  '%V lleva desde %D sin aprender a esconder el aura. %A lo sabe y ha vuelto a pasar.',
  'Segundo golpe de %A a %V. El primero, %D, fueron %C, y %V ni siquiera ha usado la caja desde entonces.',
  '%A ha vuelto a vaciarle los bolsillos a %V. %D ya se llevó %C, y %V los ha vuelto a llenar para nada.',
  '%D fueron %C. Hoy %A repite con %V porque %V se lo pone igual de fácil.',
  'A %V le vuelve a robar %A. Lo de %D, %C, no le enseñó absolutamente nada.',
  '%A tiene a %V apuntado desde %D. Hoy pasa a cobrar otra vez y %V sigue sin enterarse.',
  'Otra visita de %A al aura de %V. La anterior, %D, fueron %C, y %V la sigue dejando a la vista.',
  'Hay víctimas y hay clientes fijos. Para %A, %V es de lo segundo desde %D.',
  '%V ya perdió %C con %A %D y no ha movido un dedo. Hoy vuelve a pagar el precio de no hacer nada.',
  '%A le roba a %V por segunda vez. Si %V se hubiera espabilado después de lo de %D, esto no pasaba.',
  'De %V a %A, otra vez. %D ya se fueron %C por el mismo camino.',
  'Lo de %D no fue un despiste. %V se deja robar por %A cada vez que %A tiene hambre.',
  '%A vuelve a la víctima de %D. Si %V se deja, para qué buscar otra.',
  '%V sigue sin esconder nada después de lo de %D. %A agradece la confianza.',
];

// %V le robo %C a %A la otra vez y hoy %A se lo devuelve.
const ROBO_VENGANZA = [
  '%D %V le robó %C a %A. Hoy %A se lo cobra, y %V descubre que esto funciona en las dos direcciones.',
  'Venganza servida. %V le quitó %C a %A %D y hoy le toca pagar a %V.',
  '%A tenía pendiente lo de %D. Ya no. %V se ha quedado sin lo que robó y sin algo más.',
  '%V pensó que lo de %D le iba a salir gratis. %A acaba de pasarle la factura.',
  'Lo de %D ya está devuelto. %V robó a %A y hoy %A le roba a %V, y aquí paz y después gloria.',
  '%A no olvida. %D %V le quitó %C, y hoy %A ha ido directo a por quien se los llevó.',
  '%V se llevó %C de %A %D y se creyó a salvo. Nadie está a salvo de alguien con memoria.',
  'Devuelta la de %D. %V aprende hoy que robar a %A tenía letra pequeña.',
  '%D robó %V, hoy roba %A. %V ya puede ir contando lo que le queda, que no es mucho.',
  'Hay deudas que se cobran solas. La de %V con %A venía de %D.',
  '%V creía que lo de %D estaba olvidado. %A estaba esperando el momento, y el momento es hoy.',
  'Cuentas saldadas. %V le robó %C a %A %D y hoy %A se ha cobrado lo suyo y los intereses.',
  '%A le ha devuelto a %V el robo de %D. Con la misma mano y con más ganas.',
  'A %V lo de %D le ha salido caro. %A no ha olvidado ni una cifra.',
];

// %A ya le robo %C a %V otro dia y hoy le sale mal.
const ROBO_SE_ACABA = [
  '%D le salió bien a %A. Hoy %V estaba esperando y %A se ha dado de bruces.',
  'Lo de %D no se repite. %A volvió a por %V y esta vez se va sin un duro y con la cara roja.',
  'Se le acabó el chollo a %A. %D se llevó %C de %V, hoy se lleva el ridículo.',
  '%A creyó que %V seguía tan a mano como %D. Ha pinchado en hueso y encima le ha costado aura.',
  '%V ha aprendido desde %D. %A no, y lo acaba de pagar.',
  'Segunda visita de %A a %V, y esta vez sin premio. Lo de %D ya no se lo cree ni %A.',
  '%A volvió a por %V, la misma víctima de %D, y se ha encontrado la puerta cerrada. Codicia de manual.',
  'Hay golpes que salen una vez. El de %A a %V fue %D, y hoy toca pagar la osadía.',
  '%D %A le quitó %C a %V. Hoy intenta repetir y lo único que se lleva es la multa.',
  'A %A le gustó lo de %D con %V y ha vuelto sin pensar. Robar dos veces a la misma persona es de principiante.',
];

// %V le robo %C a %A otro dia, y hoy %A intenta vengarse y le sale mal.
const ROBO_NI_VENGARSE = [
  '%D %V le robó %C a %A. Hoy %A intenta vengarse y ni eso le sale.',
  'A %A le robó %V %D y hoy le vuelven a salir las cuentas en rojo. Ni para vengarse sirve.',
  '%A quería devolverle a %V lo de %D. Se ha quedado con las ganas y con menos aura.',
  'Venganza fallida. %V se llevó %C de %A %D, y hoy %A encima paga la multa.',
  '%A lleva desde %D rumiando la venganza contra %V, y cuando por fin lo intenta, la caga.',
  '%V le robó a %A %D, y hoy %A encima hace el ridículo intentando devolvérselo.',
  '%A fue a por %V con la rabia de %D y se ha estrellado. La rabia no roba sola.',
  'Lo de %D sigue sin cobrarse. %A lo ha intentado hoy y %V ni se ha despeinado.',
  '%A perdió %C contra %V %D y hoy pierde también la venganza. No gana ni cuando tiene motivos.',
  '%V robó a %A %D y sigue durmiendo a pierna suelta. Visto lo de hoy, con razón.',
];

// ─── !ship ───────────────────────────────────────────────────────────────────
//
// %A y %V son la pareja. %C es el % de la vez anterior, ya con el signo.

// Hoy sale bastante mas alto que la vez anterior.
const SHIP_SUBE = [
  '%D a %A y %V les salió %C. Hoy sube, y eso solo pasa a base de pedirlo hasta que cuadre.',
  '%D eran %C. %A y %V han insistido hasta que el número les ha hecho caso.',
  'De %C %D a esto. %A y %V se están emparejando a fuerza de tirar.',
  '%A y %V venían de un %C %D. Hoy suben, y alguien de los dos está pidiendo el ship a escondidas.',
  '%D les salió %C a %A y %V. Hoy salen bastante mejor, y el grupo ya empieza a hacer preguntas.',
  '%A y %V mejoran desde %D. Nadie repite un ship tantas veces si no quiere que salga alto.',
  'Subida desde el %C de %D. A %A y %V el amor les entra por insistencia.',
  'A %A y %V no les valió el %C de %D. Han vuelto hasta sacar un número presentable.',
];

// Hoy sale bastante mas bajo.
const SHIP_BAJA = [
  '%D a %A y %V les salió %C. Hoy baja, y es lo más sincero que les ha dicho nadie.',
  '%D eran %C. %A y %V lo han vuelto a pedir y la cosa ha ido a peor, como todo lo que se fuerza.',
  'De %C %D a esto. %A y %V se están desenamorando sin haber empezado.',
  '%A y %V venían de un %C %D. Hoy bajan, y nadie en el grupo lo lamenta.',
  'Caída libre desde el %C de %D. %A y %V deberían dejar de preguntar.',
  'Lo de %D pintaba mejor. %A y %V bajan desde un %C y ya no hay número que lo arregle.',
  'El %C de %D era lo mejor que iban a tener %A y %V. Ya ni eso.',
  '%A y %V insisten y el ship les responde bajando. Lo de %D, aquel %C, fue un espejismo.',
];

// Hoy sale mas o menos lo mismo.
const SHIP_IGUAL = [
  '%D a %A y %V les salió %C. Hoy más o menos lo mismo, y ni así se cansan de preguntar.',
  'Parecido a lo de %D, que fue %C. %A y %V están atascados en la misma mediocridad.',
  '%A y %V repiten ship y repiten número, casi calcado a %D. Esto no va a ningún lado.',
  '%D ya eran %C. %A y %V no suben ni bajan, se quedan donde nadie les mira.',
  'Casi el mismo resultado que %D. A %A y %V ni el ship les da una sorpresa.',
  '%A y %V vuelven a preguntar lo que ya sabían desde %D. La respuesta sigue siendo la misma.',
  'Otra vez en torno al %C de %D. Lo de %A y %V es estable, estable de no ir a ninguna parte.',
  '%A y %V no avanzan ni retroceden desde %D. Tienen la química de siempre, que es poca.',
];

module.exports = {
  MOG_REPITE, MOG_REVANCHA, MOG_RACHA,
  DUELO_REPITE, DUELO_REVANCHA, DUELO_RACHA, DUELO_PIDE, DUELO_VUELVE,
  ROBO_REINCIDE, ROBO_VENGANZA, ROBO_SE_ACABA, ROBO_NI_VENGARSE,
  SHIP_SUBE, SHIP_BAJA, SHIP_IGUAL,
};
