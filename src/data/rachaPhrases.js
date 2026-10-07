// Frases de la racha de días seguidos.
//
// Solo se usan en dos momentos, y los dos son públicos: cuando alguien llega a
// un hito y cuando vuelve después de romper una racha larga. El resto de días
// la racha paga en silencio, porque un aviso diario por persona sería el mismo
// error que el sueldo.
//
// Marcadores: %N nombre · %D días de racha · %P días perdidos
//
// Los dos pools van en direcciones contrarias, como pide la guía: el HITO
// proclama al que no falla (la actividad se proclama, no se ridiculiza) y la
// racha ROTA remata al que desapareció un día, que es la única falta que el
// bot persigue de verdad.

// ─── Hitos: llegar a 7, 15, 30, 50, 100, 200 o 365 días ──────────────────────
const HITO = [
  '%N lleva *%D días* seguidos. Cuando alguien pregunte quién sostiene esto, se enseña este número, y luego tus ojeras.',
  '%N lleva *%D días* aquí sin hueco. El hueco lo ponen los demás, que tienen vida.',
  '%N encadena *%D días*. El día que falte, llamamos a emergencias, porque solo puede ser eso.',
  '%N lleva *%D días* seguidos, más de lo que aguanta mucha gente yendo al gimnasio. Se nota cuál de las dos cosas haces tú.',
  '*%D días* sin fallar, %N. El grupo sigue vivo en parte por tu culpa, y tú, en parte, gracias al grupo.',
  '%N, *%D días*. Mientras otros desaparecen el fin de semana, tú sigues aquí, porque tu fin de semana es esto, pequeña.',
  '*%D días* de racha para %N. Esto no se consigue con suerte, se consigue sin planes.',
  '%N suma *%D días*. El resto del grupo que tome nota, o mejor que no, que tiene cosas que hacer.',
  '*%D días* seguidos, %N. Eso aquí se llama constancia, y en cualquier otro sitio, enganche.',
  '%N lleva *%D días* sin faltar. Los fantasmas del grupo deberían mirarte y sentir vergüenza, y tú, un poco también.',
  '*%D días*, %N. Cada uno te lo has ganado escribiendo, y cada uno se lo has quitado a tu familia.',
  '%N, *%D días* de racha. Si mañana fallas, el grupo va a pensar que te ha pasado algo, mi niña.',
  '%N lleva *%D días* sin fallar. Con gente así el grupo no se muere, y la gente así no sale de casa.',
  '*%D días*, %N. Hay relaciones que duran menos que tu racha.',
  '%N, *%D días* seguidos. Llevas el grupo a cuestas y ya se te ha quedado la espalda torcida.',
  '*%D días* de %N. Más fiel al grupo que la mitad de la lista a su propia palabra.',
  '%N cumple *%D días*, y el marcador se lo paga como sabe: con aura, que no sirve para nada.',
  '%N llega a *%D días*, que no es poco en un grupo donde algunos no escriben ni el día de su cumpleaños.',
  '*%D días*, %N. Esta racha la ha visto todo el grupo, y más de uno se ha preguntado si trabajas.',
  '*%D días* de racha. %N no falla, y el grupo ya da por hecho que va a estar, como el sofá.',
  '%N lleva *%D días*. Constancia de la que no se vende en la tienda ni se pone en el currículum.',
  '*%D días* seguidos para %N. Quien se ríe de la racha no ha pasado de la primera semana.',
  '%N, *%D días*. Habrá quien lo llame sostener el grupo. Los demás lo llamamos vicio.',
  '*%D días* sin fallar, %N. La racha más jodida de romper es la tuya, así que ni se te ocurra.',
  '%N suma *%D días*. El grupo tiene sus pilares y tú eres de los que no se mueven nunca, como los pilares.',
  '*%D días* de racha, %N. Se dice pronto, y se hace sin vida social.',
  '%N llega a *%D días*. Quien quiera quitarle el sitio, que empiece mañana y que vaya despidiéndose de su gente.',
  '*%D días* seguidos, %N. Aquí algunos cambian de idea más veces de las que tú faltas.',
  '%N, *%D días*. Lo fácil era fallar uno y tener un día libre. No lo has tenido.',
  '*%D días* para %N. Mientras otros hablan de volver, %N no se ha ido. Ni de vacaciones.',
];

// ─── Volver después de romper una racha larga ────────────────────────────────
const ROTA = [
  'Ahí está %N, con *%P días* que ahora valen exactamente nada.',
  'La racha de %N era de *%P días* y ahora es de uno. Menuda puta gestión del patrimonio.',
  '*%P días* rotos, %N. Te ha costado menos romperlos que leer este mensaje. Puto récord de autodestrucción.',
  '%N ha tirado *%P días* a la basura por un solo día. Menudo negocio.',
  '*%P días* de racha y %N la rompe sin avisar. Nadie ha preguntado dónde estabas.',
  '%N, *%P días* rotos: un día sin escribir y a empezar de cero, que aquí no se perdona.',
  'La racha de %N ha muerto a los *%P días*. Causa de la muerte: desaparecer.',
  '*%P días* perdidos, %N. Lo que construiste escribiendo lo has tirado callándote.',
  '%N vuelve después de romper *%P días*. De vuelta a la casilla de salida.',
  'Adiós a los *%P días* de %N. El grupo ni lo notó hasta que el bot lo dijo.',
  '%N, se te ha ido una racha de *%P días* por no llegar a diez mensajes en un día. Diez, nada más.',
  '*%P días* a la mierda, %N. La constancia se te acabó justo cuando empezaba a valer algo.',
  '%N rompe la racha de *%P días*. Se pierde en un día y se tarda semanas en recuperar.',
  'La racha de %N se ha caído a los *%P días*. La próxima vez, pon una alarma.',
  '*%P días* y un día de ausencia. %N ha elegido el día equivocado para desaparecer. Todos lo son.',
  '%N, *%P días* rotos. Ahora tu racha es de uno, como la de cualquier fantasma que se asoma.',
  'Ha palmado la racha de %N: *%P días*. El grupo no ha mandado flores.',
  '*%P días*, %N, y los has perdido por la tontería de no aparecer.',
  '%N ha roto *%P días* de racha. Para un día que sale de casa, mira lo que pasa.',
  '*%P días* perdidos y %N vuelve como si nada, pero el marcador se acuerda.',
  '%N, esa racha de *%P días* ya es historia. Mala historia.',
  'La racha de %N se ha ido con *%P días* dentro. No aguantó ni uno más.',
  '*%P días* tirados, %N. Una racha así no se abandona, y tú la has abandonado.',
  '%N ha roto *%P días*. Desde abajo otra vez, que ese camino ya se lo conoce.',
  '*%P días* se han ido por el desagüe, %N. Y los has tirado tú, pequeña.',
  '%N, *%P días* de racha y un día sin aparecer. Se acabó, y nadie te ha echado de menos.',
  'Racha rota. %N llevaba *%P días*, y ahora el marcador empieza de cero.',
  '%N ha perdido *%P días* de golpe. Ni un robo le habría quitado la racha entera así.',
  '*%P días* rotos, %N. No vas a aguantar otros tantos, y lo sabes.',
  '%N, *%P días* a cero. La racha era lo único tuyo que crecía.',
];

module.exports = { HITO, ROTA };
