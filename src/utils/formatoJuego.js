// Cómo se escriben las dos cosas que el bot repite más veces al día: un
// cooldown y un movimiento de aura.
//
// ─── POR QUÉ EXISTE ESTE FICHERO ────────────────────────────────────────────
//
// Las dos frases estaban escritas a mano en cada comando, y a mano quiere decir
// distintas. Medido antes de esto:
//
//   · TRES funciones de tiempo restante, una por fichero, con tres salidas para
//     el mismo reloj:  robo -> "1h 30min"   ·   aura -> "5min 30s"
//                      vault -> "1 h 30 min"  (con espacios)
//   · CUATRO formas de decir que alguien ha ganado o perdido aura:
//       @X  +200 → *3.350*          (duelo, dar, robo)
//       +200 → *3.350* de aura      (apuesta: sin nombre)
//       @X *3.350* (+200)           (contrarrobo: el total delante)
//       *@X +200 de aura* … Aura total: *3.350*   (tirada: partida en dos)
//   · y CINCO cooldowns de once sin la cabecera que dice que lo son, así que el
//     mensaje empezaba con una pulla y desde fuera no se leía como una espera:
//     la gente volvía a escribir el comando.
//
// Ninguna de esas diferencias la decidió nadie: son once sitios que se
// escribieron en semanas distintas. El dueño lo dijo viendo el de *!robo
// asalto*: «me gusta bastante esa frase, ajústalas todas con este estándar,
// aunque con más coherencia».
//
// Asi que la forma vive AQUI, en un sitio, y los once comandos la piden. Lo que
// no se puede escribir a mano no se puede desviar.
'use strict';

const { fmt } = require('./helpers');

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

// SIEMPRE HACIA ARRIBA. Decirle a alguien que vuelva en cinco minutos cuando
// faltan cinco y medio es mandarlo a comerse el mismo mensaje otra vez, y eso
// se lee como que el bot no lleva bien la cuenta. Redondear hacia arriba como
// mucho le hace esperar un segundo de más.
// Y LA UNIDAD SE ELIGE DESPUES DE REDONDEAR, no antes. Escrito al reves
// —mirar el valor crudo y luego redondear dentro de esa unidad— 59,9 segundos
// salian como "60s" y 59 minutos y medio como "60min": el redondeo empuja el
// numero fuera de su propia unidad y queda una cifra que nadie escribe.
function tiempoRestante(ms) {
  const queda = Math.max(0, ms);
  const seg = Math.ceil(queda / 1000);
  if (seg < 60) return `${seg}s`;
  const min = Math.ceil(queda / MINUTO);
  if (min < 60) return `${min}min`;
  if (min < 24 * 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  }
  const horas = Math.ceil(queda / HORA);
  const d = Math.floor(horas / 24);
  const h = horas % 24;
  return h ? `${d}d ${h}h` : `${d}d`;
}

// ─── EL BLOQUE DE COOLDOWN ──────────────────────────────────────────────────
//
//   *ASALTO EN COOLDOWN*
//   La entrada al puto asalto no es un pase VIP. Es un ticket que se pica y se espera.
//   _Vuelve en *5min*._
//
// Tres tiempos y cada uno hace una cosa: QUÉ está esperando, la pulla, y CUÁNTO
// queda. La cabecera no es decoración — sin ella el mensaje abre con un insulto
// y sigue con un tiempo, y desde fuera eso no se lee como una espera sino como
// que el bot ha contestado cualquier otra cosa. Ya pasó con *!top*: la gente
// volvía a escribirlo.
//
// `titulo` es para la unica espera que no es un cooldown de quien escribe: la
// guardia de la victima de un robo. Ahi el reloj es de OTRA persona («@Fran EN
// GUARDIA»), asi que la cabecera la pone el que llama — pero los tres tiempos y
// el pie son los mismos, que es lo que hace que se lea como el resto.
function bloqueCooldown({ que, titulo, frase, queda, cola = '' }) {
  const cabecera = titulo || `${String(que).toUpperCase()} EN COOLDOWN`;
  return `*${cabecera}*\n${frase}\n_Vuelve en *${tiempoRestante(queda)}*._${cola}`;
}

// ─── UN MOVIMIENTO DE AURA ──────────────────────────────────────────────────
//
//   @Fulano  +200 → *3.350*
//   @Mengano  −200 → *1.120*
//   @Zutano  sin cambios → *1.120*
//
// Quién, cuánto se ha movido, y dónde se queda. En ese orden y siempre el
// mismo: el número que importa —con lo que te quedas— va en negrita y al
// final, que es donde el ojo lo va a buscar después de leerlo diez veces.
//
// El signo es el menos de verdad (−, U+2212) y no un guion: al lado de un +
// del mismo alto, un guion corto se lee como un separador.
function lineaAura(quien, delta, total, { negrita = false } = {}) {
  const n = Number(delta) || 0;
  const movimiento = n === 0
    ? 'sin cambios'
    : `${n > 0 ? '+' : '−'}${fmt(Math.abs(n))}`;
  const cuerpo = `${quien ? `${quien}  ` : ''}${movimiento} → ${negrita ? '' : '*'}${fmt(total)}${negrita ? '' : '*'}`;
  return negrita ? `*${cuerpo}*` : cuerpo;
}

module.exports = { tiempoRestante, bloqueCooldown, lineaAura, MINUTO, HORA, DIA };
