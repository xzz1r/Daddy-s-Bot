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
  '%N lleva *%D días* seguidos aquí. Ni una falta, ni un descanso, ni una puta vida fuera de esto.',
  '*%D días* clavados. %N no falla ni cuando debería, que es lo que da miedo del asunto.',
  'Joder con %N: *%D días* sin saltarse ninguno. Eso ya no es constancia, es dependencia con premio.',
  '%N: *%D días*. El resto del grupo desaparece semanas y este cabrón no se pierde ni un festivo.',
  '%N lleva *%D días seguidos* apareciendo. Constancia de reloj suizo y vida social de mueble.',
  '*%D días* sin faltar uno. %N no tiene racha, tiene una rutina y da un poco de miedo.',
  '%N encadena *%D días*. Ni el que ficha en la fábrica tiene esa puntualidad, joder.',
  '*%D días seguidos*. %N ha convertido este grupo en una obligación y encima cobra por ello.',
  '%N no ha fallado un solo día en *%D*. Eso ya no es aparecer, es vivir aquí.',
  '*%D días* de %N sin saltarse ninguno. El resto del grupo desaparece semanas enteras y este no se pierde ni el domingo.',
  '%N: *%D días* clavados. Cuando alguien pregunte quién sostiene esto, se enseña este número y punto.',
  '*%D días*. %N tiene más constancia con este grupo que la mayoría con su puta higiene.',
  '%N va por *%D días seguidos*. A los demás os cuesta contestar un mensaje del martes.',
  '*%D días* y subiendo. %N ha entendido que aquí no gana el gracioso, gana el que no falla.',
  '%N acumula *%D días*. Lo raro ya no es que aparezca: sería noticia que no lo hiciera.',
  '*%D días seguidos*, %N. Media docena de este grupo no junta eso ni sumando los años que lleva dentro.',
];

// ─── Volver después de romper una racha larga ────────────────────────────────
const ROTA = [
  'Se acabó, %N. *%P días* a la puta basura por no aparecer una tarde.',
  '%N vuelve con la cara de gilipollas del que ha tirado *%P días* por nada. Y es exactamente eso.',
  'Mira quién ha vuelto. Tarde: tus *%P días* ya se los comió el calendario, muerto de hambre.',
  'Bienvenido de vuelta, %N. Tu racha de *%P días* se quedó por el camino. Empiezas de cero como todo el mundo.',
  '%N reaparece y se encuentra el marcador a cero. *%P días* tirados por faltar uno. Así funciona esto.',
  '*%P días* de racha, %N. Tenías. Ahora tienes uno. Enhorabuena por el desperdicio.',
  '%N vuelve. La racha de *%P días* no. Se rompió sola mientras estabas a lo tuyo.',
  'Ahí está %N, con la cara de quien acaba de ver que sus *%P días* valen ahora exactamente nada.',
  '%N perdió *%P días seguidos* por un día de nada. Duele más que perder aura, y encima no se recupera.',
  'Se acabó, %N: *%P días* a la basura. Lo peor no es perderlos, es lo poco que costó.',
  '%N regresa con la racha reventada. *%P días* que ya solo existen en su cabeza. A empezar.',
  'La racha de %N ha muerto en el día *%P*. Un aplauso corto y a otra cosa.',
  '%N faltó y se llevó por delante *%P días* de trabajo. Toda esa constancia para nada, campeón.',
];

module.exports = { HITO, ROTA };
