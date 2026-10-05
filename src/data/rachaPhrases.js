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
  '%N lleva *%D días* seguidos. Cuando alguien pregunte quién sostiene esto, se enseña este número y punto.',
  '%N lleva *%D días* aquí sin hueco. El hueco lo ponen los demás.',
  '%N encadena *%D días*. El día que falte, el grupo se va a enterar. El resto, no.',
  '%N lleva *%D días* seguidos. Hay gente que no aguanta ni una semana de gimnasio.',
  '*%D días* sin fallar, %N. El grupo sigue vivo en parte por culpa tuya.',
  '%N, *%D días*. Mientras otros desaparecen el fin de semana, tú sigues aquí dando la cara, pequeña.',
  '*%D días* de racha para %N. Esto no se consigue con suerte, se consigue apareciendo.',
  '%N suma *%D días*. El resto del grupo que tome nota, que alguno no llega ni a tres.',
  '*%D días* seguidos, %N. Eso es constancia, y aquí la constancia se paga.',
  '%N lleva *%D días* sin faltar. Los fantasmas del grupo deberían mirarte y sentir vergüenza.',
  '*%D días*, %N. Cada uno te lo has ganado escribiendo, no pidiendo.',
  '%N, *%D días* de racha. Si mañana fallas, el grupo va a pensar que te ha pasado algo, pequeña.',
  '%N lleva *%D días* sin fallar. Con gente así el grupo no necesita que nadie lo reanime.',
  '*%D días*, %N. Hay relaciones que duran menos que tu racha.',
  '%N, *%D días* seguidos. Llevas el grupo a cuestas y ni te quejas, pequeña.',
  '*%D días* de %N. Más fiel al grupo que la mitad de la lista a su propia palabra.',
  '%N cumple *%D días*. El marcador lo aplaude a su manera: pagando.',
  '%N llega a *%D días*. No es poca cosa en un grupo donde hay gente que no escribe ni el día de su cumpleaños.',
  '*%D días*, %N. Esta racha la ha visto todo el grupo, y más de uno la envidia en silencio.',
  '*%D días* de racha. %N no falla, y el grupo ya da por hecho que va a estar. Eso vale oro.',
  '%N lleva *%D días*. Constancia de la que no se vende en la tienda.',
  '*%D días* seguidos para %N. Quien se ríe de la racha no ha pasado de la primera semana.',
  '%N, *%D días*. Hay quien lo llama vicio. Aquí se llama sostener el grupo.',
  '*%D días* sin fallar, %N. La racha más jodida de romper es la tuya, así que ni se te ocurra.',
  '%N suma *%D días*. El grupo tiene sus pilares y hoy uno ha puesto otro ladrillo.',
  '*%D días* de racha, %N. Se dice pronto. Se hace escribiendo cada puto día.',
  '%N llega a *%D días*. Quien quiera quitarle el sitio, que empiece mañana y aguante.',
  '*%D días* seguidos, %N. Aquí hay gente que cambia de idea más veces que tú faltas, pequeña.',
  '%N, *%D días*. Lo fácil era fallar uno. No lo has hecho.',
  '*%D días* para %N. Mientras otros hablan de volver, %N no se ha ido.',
];

// ─── Volver después de romper una racha larga ────────────────────────────────
const ROTA = [
  'Ahí está %N, con *%P días* que ahora valen exactamente nada.',
  'La racha de %N era de *%P días*. Ahora es de uno. Menuda puta gestión del patrimonio.',
  '*%P días* rotos, %N. Te ha costado menos romperlos que leer este mensaje. Puto récord de autodestrucción.',
  '%N ha tirado *%P días* a la basura por un solo día. Menudo negocio.',
  '*%P días* de racha y %N la rompe sin despedirse.',
  '%N, *%P días* rotos. Un día sin escribir y a empezar de cero. Aquí no se perdona.',
  'La racha de %N ha muerto a los *%P días*. Causa de la muerte: desaparecer.',
  '*%P días* perdidos, %N. Lo que construiste escribiendo lo has tirado callándote, pequeña.',
  '%N vuelve después de romper *%P días*. De vuelta a la casilla de salida.',
  'Adiós a los *%P días* de %N. El grupo ni lo notó hasta que el bot lo dijo.',
  '%N, se te ha ido una racha de *%P días* por no llegar a diez mensajes en un día. Diez.',
  '*%P días* a la mierda, %N. La constancia se te acabó justo cuando empezaba a valer algo.',
  '%N rompe la racha de *%P días*. Se pierde en un día y se tarda semanas en recuperar.',
  'La racha de %N se ha caído a los *%P días*. La próxima vez, pon una alarma.',
  '*%P días* y un día de ausencia. %N ha elegido el día equivocado para desaparecer. Todos lo son.',
  '%N, *%P días* rotos. Ahora tu racha es de uno, como la de cualquier fantasma que se asoma.',
  'Ha palmado la racha de %N: *%P días*. El grupo no ha mandado flores.',
  '*%P días*, %N, y los has perdido por la tontería de no aparecer, pequeña.',
  '%N ha roto *%P días* de racha. Lo que cuesta semanas se pierde en un día.',
  '*%P días* perdidos. %N vuelve como si nada. El marcador sí que se acuerda.',
  '%N, esa racha de *%P días* ya es historia. Mala historia.',
  'La racha de %N se ha ido con *%P días* dentro. No aguantó ni uno más.',
  '*%P días* tirados, %N. Una racha así no se abandona, y tú la has abandonado.',
  '%N ha roto *%P días*. Desde abajo otra vez, que ese camino ya se lo conoce.',
  '*%P días* se han ido por el desagüe, %N. Y los has tirado tú, pequeña.',
  '%N, *%P días* de racha y un día de silencio. Ha ganado el silencio.',
  'Racha rota. %N llevaba *%P días*, y ahora el marcador empieza de cero.',
  '%N ha perdido *%P días* de golpe. Ni un robo le habría quitado la racha entera así.',
  '*%P días* rotos, %N. Ahora a ver si aguantas otros tantos.',
  '%N, *%P días* a cero. La racha era lo único tuyo que crecía.',
];

module.exports = { HITO, ROTA };
