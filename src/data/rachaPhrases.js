// Frases de la racha de días seguidos.
//
// Solo se usan en dos momentos, y los dos son públicos: cuando alguien llega a
// un hito y cuando vuelve después de romper una racha larga. El resto de días
// la racha paga en silencio, porque un aviso diario por persona sería el mismo
// error que el sueldo.
//
// Marcadores: %N nombre · %D días de racha · %P días perdidos
//
// El registro es el de siempre: negro, sucio y sin consuelo. La racha se presta
// especialmente a la crueldad porque lo que se celebra es, mirado de frente,
// que alguien lleva un mes sin faltar un solo día a un grupo de WhatsApp.

// ─── Hitos: llegar a 7, 15, 30, 50, 100, 200 o 365 días ──────────────────────
const HITO = [
  '%N lleva *%D días* seguidos. Cuando alguien pregunte quién sostiene esto, se enseña este número y punto.',
  '%N lleva *%D días* aquí sin hueco. El hueco lo ponen los demás.',
  '%N encadena *%D días*. El día que falte, el grupo se va a enterar. El resto, no.',
  '%N lleva *%D días* seguidos. Hay gente que no aguanta ni una semana de gimnasio.',
  '*%D días* sin fallar, %N. El grupo sigue vivo en parte por culpa tuya.',
  '%N, *%D días*. Mientras otros desaparecen el fin de semana, tú sigues aquí dando la cara.',
  '*%D días* de racha para %N. Esto no se consigue con suerte, se consigue apareciendo.',
  '%N suma *%D días*. El resto del grupo que tome nota, que alguno no llega ni a tres.',
  '*%D días* seguidos, %N. Eso es constancia, y aquí la constancia se paga.',
  '%N lleva *%D días* sin faltar. Los fantasmas del grupo deberían mirarte y sentir vergüenza.',
  '*%D días*, %N. Cada uno te lo has ganado escribiendo, no pidiendo.',
  '%N, *%D días* de racha. Si mañana fallas, el grupo va a pensar que te ha pasado algo.',
  '%N lleva *%D días* sin fallar. Con gente así el grupo no necesita que nadie lo reanime.',
  '*%D días*, %N. Hay relaciones que duran menos que tu racha.',
  '%N, *%D días* seguidos. Llevas el grupo a cuestas y ni te quejas.',
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
  '*%D días* seguidos, %N. Aquí hay gente que cambia de idea más veces que tú faltas.',
  '%N, *%D días*. Lo fácil era fallar un domingo. No lo has hecho.',
  '*%D días* para %N. Mientras otros hablan de volver, tú no te has ido.',
];

// ─── Volver después de romper una racha larga ────────────────────────────────
const ROTA = [
  'Ahí está %N, con la cara de quien acaba de ver que sus *%P días* valen ahora exactamente nada.',
  'La racha de %N era de *%P días*. Ahora es de uno. Menuda puta gestión del patrimonio.',
  '*%P días* rotos, %N. Te ha costado menos romperlos que leer este mensaje. Puto récord de autodestrucción.',
  '%N ha tirado *%P días* a la basura por un día de pereza. Menudo negocio.',
  '*%P días* de racha y %N la rompe sin despedirse. Como hace con todo.',
  '%N, *%P días* rotos. Un día sin escribir y a empezar de cero. Aquí no se perdona.',
  'La racha de %N ha muerto a los *%P días*. Causa de la muerte: desaparecer.',
  '*%P días* perdidos, %N. Lo que construiste escribiendo lo has tirado callándote.',
  '%N vuelve después de romper *%P días*. De vuelta a la casilla de salida.',
  'Adiós a los *%P días* de %N. El grupo ni lo notó hasta que el bot lo dijo.',
  '%N, se te ha ido una racha de *%P días* por no llegar a diez mensajes en un día. Diez.',
  '*%P días* a la mierda, %N. La constancia se te acabó justo cuando empezaba a valer algo.',
  '%N rompe la racha de *%P días*. Se pierde en un día y se tarda semanas en recuperar.',
  'La racha de %N se ha caído a los *%P días*. La próxima vez, pon una alarma.',
  '*%P días* y un día de ausencia. %N ha elegido el día equivocado para desaparecer. Todos lo son.',
  '%N, *%P días* rotos. Ahora tu racha es de uno, como la de cualquier fantasma que se asoma.',
  'Ha palmado la racha de %N: *%P días*. El grupo no ha mandado flores.',
  '*%P días*, %N, y los has perdido por la tontería de no aparecer.',
  '%N ha roto *%P días* de racha. Lo que cuesta un mes se pierde en un domingo.',
  '*%P días* perdidos. %N vuelve como si nada. El marcador sí que se acuerda.',
  '%N, esa racha de *%P días* ya es historia. Mala historia.',
  'La racha de %N se ha ido con *%P días* dentro. No aguantó ni uno más.',
  '*%P días* tirados, %N. Una racha así no se abandona, y tú la has abandonado.',
  '%N ha roto *%P días*. Desde abajo otra vez, que ese camino ya te lo conoces.',
  '*%P días* se han ido por el desagüe, %N. Y los has tirado tú.',
  '%N, *%P días* de racha y un día de silencio. Ha ganado el silencio.',
  'Racha rota. %N llevaba *%P días* y ahora no tiene ganas ni de mirar el marcador.',
  '%N ha perdido *%P días* de golpe. Ni robándote te habrían quitado tanto.',
  '*%P días* rotos, %N. El grupo sabía que no ibas a aguantar. Lo que no sabía era cuándo.',
  '%N, *%P días* a cero. La racha era lo único tuyo que crecía.',
];

module.exports = { HITO, ROTA };
