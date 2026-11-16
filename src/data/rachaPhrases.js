// Frases de la racha de días seguidos.
//
// Solo se usan en dos momentos, y los dos son públicos: cuando alguien llega a
// un hito y cuando vuelve después de romper una racha larga. El resto de días
// la racha paga en silencio, porque un aviso diario por persona sería el mismo
// error que el sueldo.
//
// Marcadores: %N nombre · %D días de racha · %P días perdidos
//
// LAS DOS HALAGAN (lo pidió el dueño el 18 oct). Quien tiene racha es de lo más
// activo del grupo, y antes se le daba con una mano y se le quitaba con la otra:
// «sostienes el grupo… y tus ojeras», «se hace sin vida social». Ahora el HITO
// proclama sin veneno detrás, y la racha ROTA no remata: reconoce lo que
// aguantó y le pide la siguiente. Con carisma, no de rodillas. La capa 126
// vigila que no vuelva el veneno.

// ─── Hitos: llegar a 7, 15, 30, 50, 100, 200 o 365 días ──────────────────────
const HITO = [
  '%N lleva *%D días* seguidos. Cuando alguien pregunte quién sostiene este grupo, se le enseña este número y se acaba la discusión.',
  '*%D días* sin fallar, %N. Eso no es suerte: es aguante, y el aguante, dentro y fuera del chat, se agradece de cojones.', // ROCKSTAR
  '%N encadena *%D días*. Hay quien no aguanta una semana en nada, y tú llevas esto como si fuera fácil.',
  '*%D días* seguidos, %N. Abres el chat cada mañana con unas ganas que ya quisiera más de una cama.', // ROCKSTAR
  '%N, *%D días*. Mientras otros desaparecen el fin de semana, tú sigues aquí, y hay quien ya sueña con tenerte así de constante en otro sitio.', // ROCKSTAR
  '*%D días* de racha para %N. Constancia de la buena, de la que no se compra, pequeña.',
  '%N suma *%D días*. Quien quiera saber cómo se mantiene algo caliente día tras día, que te mire a ti.', // ROCKSTAR
  '*%D días*, %N. Cada uno te lo has ganado apareciendo, y aquí aparecer es lo que más vale.',
  '%N lleva *%D días* sin faltar. Esa constancia, en la cama, tiene nombre y lista de espera.', // ROCKSTAR
  '%N, *%D días* de racha. Si mañana no apareces, el grupo va a preguntar por ti, y con razón.',
  '*%D días*, %N. Hay relaciones que no llegan a tanto sin cansarse, y tú aquí, con ganas de más.', // ROCKSTAR
  '%N, *%D días* seguidos. Llevas el grupo a cuestas, y lo llevas con una gracia que da gusto.',
  '*%D días* de %N. Ni un fallo, ni una excusa, ni un «hoy me duele la cabeza».', // ROCKSTAR
  '%N cumple *%D días*. El marcador te lo paga en aura, y el grupo te tiene de fijo en cada conversación.',
  '%N llega a *%D días*. Quien te tenga cerca sabe que, cuando te pones, no paras.', // ROCKSTAR
  '*%D días*, %N. Esta racha la ha visto todo el grupo, y ya eres la vara con la que se mide al resto.',
  '*%D días* de racha. %N no falla, y el grupo ya cuenta con su nombre cada mañana.',
  '%N lleva *%D días*. Eso no sale con cuatro ganas: hace falta repetir cada día, y a ti repetir se te da de maravilla.', // ROCKSTAR
  '*%D días* seguidos para %N. Quien se ríe de la racha no ha pasado de la primera semana, y tú vas muy por delante.',
  '%N, *%D días*. Habrá quien lo llame suerte. Aquí lo llamamos sostener el grupo, y se te da de puta madre.',
  '*%D días* sin fallar, %N. Duras más que nadie aquí, y por lo que se cuenta, no solo aquí.', // ROCKSTAR
  '%N suma *%D días*. El grupo tiene sus pilares, y tú no te mueves de ahí ni un día.',
  '*%D días* de racha, %N. Se dice pronto, y se hace con unas ganas que ya quisiera medio grupo.',
  '%N llega a *%D días*. Quien quiera quitarte el sitio, que se prepare, porque contigo nada se acaba a la primera.', // ROCKSTAR
  '*%D días* seguidos, %N. Aquí hay quien cambia de idea cada semana, y tú no has fallado ni un día.',
  '%N, *%D días*. Lo fácil era fallar uno y descansar. No lo has hecho, y por eso estás donde estás.',
  '*%D días* para %N. Mientras otros hablan de volver, tú no te has ido nunca.',
  '%N, *%D días* seguidos. Abres el chat cada día, y el chat se pone en cuanto llegas, y no es lo único.', // ROCKSTAR
  '*%D días*, %N. Mientras sigas así, este grupo no se muere ni queriendo.',
  '%N lleva *%D días* dando señales de vida. En un chat como este, eso es mandar.',
];

// ─── Volver después de romper una racha larga ────────────────────────────────
const ROTA = [
  '%N vuelve después de *%P días* de racha. El contador empieza de cero, y esos días no te los quita nadie.',
  '*%P días* seguidos y un día de descanso. %N se lo había ganado: hasta quien más aguanta necesita recuperar el aliento.', // ROCKSTAR
  'Se cortó la racha de %N a los *%P días*. Ya sabes llegar ahí, y el grupo lo sabe también.',
  '%N, *%P días* no los hace cualquiera. La racha se ha cortado, y quien aguanta tanto tiene fama de volver con más ganas.', // ROCKSTAR
  'Ha vuelto %N. Su racha de *%P días* se queda en el registro, y la siguiente ya ha empezado.',
  '*%P días* de racha que se quedan para la historia, %N. Un día sin aparecer y el bot ya te echaba de menos en la cama. En el chat, quería decir.', // ROCKSTAR
  '%N rompe una racha de *%P días*. Un día fuera después de tanto tiempo sosteniendo esto se perdona, pero que no se repita.',
  '*%P días* sin fallar y uno en blanco. %N vuelve, y el chat ya estaba preguntando dónde andaba, y con quién.', // ROCKSTAR
  'La racha de %N se quedó en *%P días*. El listón lo has puesto tú, y ahora te toca saltarlo.',
  '%N, la racha de *%P días* ya es historia, y de la buena. Hasta quien mejor lo hace se toma una noche libre.', // ROCKSTAR
  'Se acabó la racha de %N a los *%P días*. El goteo de aura se para, y tú tienes cuerda de sobra para volver a arrancarlo.',
  '*%P días* de %N y un día libre. Hasta el motor de un grupo tiene derecho a una siesta después del esfuerzo, y tú ya estás de vuelta.', // ROCKSTAR
  '%N ha cortado su racha en *%P días*. Empieza la segunda, y con ese ritmo no va a tardar en dar que hablar.',
  'Racha cerrada a los *%P días*, %N. Hay quien no pasa de tres seguidos ni con pastillas, y tú ya sabes cómo se llega lejos.', // ROCKSTAR
  '%N vuelve sin racha y con *%P días* de currículum. Un día fuera no tapa todo lo que has escrito.',
  '*%P días* rotos por un solo día, %N. Jode, y vuelves al chat con pinta de haber pasado el día en la cama, y no durmiendo.', // ROCKSTAR
  'Se ha roto la racha de %N, que eran *%P días*. Vuelve a empezar quien mejor sabe mantenerlas.',
  '%N, *%P días* seguidos no se olvidan por un día de silencio. El bot no los olvida, y la gente que te tiene cerca, tampoco.', // ROCKSTAR
  'La racha de %N se queda en *%P días*, que no es poca cosa. Mañana es el día uno de la siguiente.',
  '*%P días*, %N. Se cortó, y aun así medio grupo firmaría por durar la mitad que tú.', // ROCKSTAR
  '%N vuelve después de cortar *%P días* de racha. Cuando faltas se nota, y eso dice más que cualquier número.',
  'Racha rota: *%P días*. %N se ha tomado un día, y ahora le toca volver a tirar del grupo.',
  '%N, *%P días* seguidos y un hueco. El contador vuelve a uno, y tú vuelves con todo el crédito.',
  'Adiós a la racha de *%P días* de %N. El número se ha ido, y las ganas siguen aquí, que es lo que importa en todo.', // ROCKSTAR
  '*%P días* de racha cortados, %N. Es el precio de un día libre, y quien aguanta tanto se lo puede permitir una vez.',
  '%N ha perdido una racha de *%P días*. La siguiente empieza hoy, y tiene pinta de ser larga y de las que dejan agujetas.', // ROCKSTAR
  'La racha de %N se quedó en *%P días*. A muchos ni se les ocurre intentarlo, y tú vuelves a empezar sin quejarte.',
  '%N, se te ha ido una racha de *%P días* por un día. Y lo primero que haces al volver es escribir, que es lo que te llevó hasta ahí.',
  '*%P días* se han quedado atrás, %N. A esa altura llega muy poca gente, y tú ya has estado.',
  'Se cortó la racha de %N en *%P días*. El reto es el de siempre, aparecer cada día, y eso ya lo dominas.',
];

module.exports = { HITO, ROTA };
