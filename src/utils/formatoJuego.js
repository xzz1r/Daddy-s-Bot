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
// del mismo alto, un guion corto se lee como un separador. Y también en el
// saldo, que con !aura puede quedar en números rojos: salía «−34 → -34», con
// los dos menos distintos en la misma línea (20 oct).
function lineaAura(quien, delta, total, { negrita = false } = {}) {
  const n = Number(delta) || 0;
  const movimiento = n === 0
    ? 'sin cambios'
    : `${n > 0 ? '+' : '−'}${fmt(Math.abs(n))}`;
  const t = Number(total) || 0;
  const saldo = t < 0 ? `−${fmt(Math.abs(t))}` : fmt(total);
  const cuerpo = `${quien ? `${quien}  ` : ''}${movimiento} → ${negrita ? '' : '*'}${saldo}${negrita ? '' : '*'}`;
  return negrita ? `*${cuerpo}*` : cuerpo;
}

// ─── EL NOMBRE CORTO, PARA LAS LINEAS DE DATOS ───────────────────────────────
//
// El dueño (14 oct), con un robo que nombraba seis veces a la victima con su
// nombre entero —«◥꧁𝓢𝔀𝓮𝓮𝓽𝓰𝓲𝓻𝓵༄⁷⁸⁶ᵈ᭄»—: «esa contaminación visual es
// exagerada». Cada @ que WhatsApp pinta es el nombre completo, adornos
// incluidos.
//
// Las FRASES no se tocan: van intactas, con sus menciones, que es como las
// quiere el dueño («las frases deben quedar intactas, solo se debe eliminar la
// contaminación»). Lo que lleva el nombre corto son las lineas de DATOS —el
// saldo, el aviso del contrarrobo—, que repetian el nombre entero sin decir
// nada. El nombre corto es el pushName (lo que cada uno se pone a si mismo,
// ver nombreStore) sin adornos y en una palabra: «◥꧁𝓢𝔀𝓮𝓮𝓽𝓰𝓲𝓻𝓵༄⁷⁸⁶ᵈ᭄» es
// «Sweetgirl».
//
// La limpieza: fuera superindices y letras modificadoras (los ⁷⁸⁶ᵈ del
// adorno); las letras «de fantasia» (𝓢, 𝔀, Ⓜ…) se pasan a las normales con
// NFKC; fuera lo que no sea letra o cifra (emoji, simbolos, marcas); y se queda
// la primera palabra con tres letras o mas («xX_DarkLord_Xx» es «DarkLord»). Si no queda nada, o los dos se quedan con el mismo nombre, se
// vuelve a la mencion: mejor un @ de mas que no saber quien es quien.
const MAX_CORTO = 16;
function nombreLimpio(nombre) {
  if (!nombre) return '';
  const s = String(nombre).normalize('NFC')
    .replace(/[\p{Lm}\p{No}]/gu, ' ')
    .normalize('NFKC')
    // Los selectores de variante y los de anchura cero van pegados a la
    // letra («Ⓜ️»): se borran, no se cambian por un espacio, o parten la palabra.
    .replace(/[\uFE00-\uFE0F\u200B-\u200D\u2060\p{Me}]/gu, '')
    .replace(/[^\p{L}\p{N}\p{M} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const palabras = s.split(' ');
  const palabra = palabras.find((w) => (w.match(/\p{L}/gu) || []).length >= 3)
    || palabras.find((w) => (w.match(/\p{L}/gu) || []).length >= 2) || '';
  return palabra.length > MAX_CORTO ? palabra.slice(0, MAX_CORTO) : palabra;
}

// Los nombres cortos de varias personas, en el mismo orden. El de quien no
// tenga nombre limpio, o lo comparta con otro del mensaje, es su @.
async function nombresCortos(...jids) {
  const ns = require('./nombreStore');
  await ns.cargar().catch(() => {});
  const limpios = jids.map((j) => nombreLimpio(ns.getName(j)));
  return jids.map((j, i) => {
    const n = limpios[i];
    const repetido = n && limpios.some((m, k) => k !== i && m && m.toLowerCase() === n.toLowerCase());
    return n && !repetido ? n : `@${String(j).split('@')[0]}`;
  });
}

module.exports = { tiempoRestante, bloqueCooldown, lineaAura, nombreLimpio, nombresCortos, MINUTO, HORA, DIA };
